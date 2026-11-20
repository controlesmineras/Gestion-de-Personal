import assert from 'node:assert/strict';
import test from 'node:test';
import {syncPersonalReports} from '../lib/personal-report-sync.ts';

const meal=(id,date)=>({id,input:{action:'meals',date,breakfast:true,breakfastLocation:'Mina'}});
const date='2026-11-21';
function queue(entries,send){
  let rows=structuredClone(entries);
  const options={serverDate:date,read:()=>rows,write:value=>{rows=value;},active:()=>true,send};
  return {run:()=>syncPersonalReports(options),options};
}
test('existing closed orders remain available and subsequent valid orders upload once',async()=>{
  const old=meal('old','2026-11-20'),next=meal('current',date);
  const sent=[];
  const q=queue([old,next],async input=>sent.push(input));
  assert.deepEqual([...(await q.run()).confirmed],['current']);
  await q.run();
  assert.deepEqual(q.options.read(),[{...old,closedForDate:date}]);
  assert.deepEqual(sent,[next.input]);
});
test('rejecting one entry leaves it intact and does not starve unrelated entries',async()=>{
  const bad={id:'conflict',input:{action:'vacation'}};
  const q=queue([bad,meal('valid',date)],async input=>{
    if(input.action==='vacation')throw Object.assign(new Error('Cruce de fechas'),{status:409});
  });
  const result=await q.run();
  assert.deepEqual(q.options.read(),[bad]);
  assert.deepEqual([...result.confirmed],['valid']);assert.match(result.problems[0],/Cruce de fechas/);
});
test('network, expired session and service errors keep outstanding reports for retry',async()=>{
  for(const status of [undefined,401,403,429,503]){
    const rows=[meal('first',date),{id:'second',input:{action:'permission'}}];
    let attempts=0;
    const q=queue(rows,async()=>{attempts++;throw Object.assign(new Error('Reintentar'),{status});});
    await assert.rejects(q.run(),/Reintentar/);
    assert.equal(attempts,1);assert.deepEqual(q.options.read(),rows);
  }
});
test('a change during upload and another account are preserved',async()=>{
  const next=meal('new',date);
  const q=queue([meal('previous',date)],async()=>q.options.write([next]));
  await q.run();assert.deepEqual(q.options.read(),[next]);
  q.options.active=()=>false;
  assert.equal((await q.run()).confirmed.size,0);assert.deepEqual(q.options.read(),[next]);
});
