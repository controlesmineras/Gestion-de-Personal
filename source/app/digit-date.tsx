'use client';
import {useEffect,useRef,useState} from 'react';
import {validDate} from '@/lib/personnel';

function displayDate(value:string){
 return value?value.slice(8,10)+'/'+value.slice(5,7)+'/'+value.slice(0,4):'';
}

export default function DigitDate({value,onChange,min}:{value:string;onChange:(value:string)=>void;min?:string}){
 const [text,setText]=useState(()=>displayDate(value));
 const input=useRef<HTMLInputElement>(null);
 const emitted=useRef(value);
 useEffect(()=>{
  if(value!==emitted.current){setText(displayDate(value));emitted.current=value;}
 },[value]);
 function edit(raw:string){
  const digits=raw.replace(/\D/g,'').slice(0,8);
  const formatted=[digits.slice(0,2),digits.slice(2,4),digits.slice(4,8)].filter(Boolean).join('/');
  const iso=digits.length===8?digits.slice(4)+'-'+digits.slice(2,4)+'-'+digits.slice(0,2):'';
  const valid=!!iso&&validDate(iso)&&displayDate(iso)===formatted;
  const next=valid?iso:'';
  input.current?.setCustomValidity(raw&&!valid?'Escribe una fecha válida en formato dd/mm/aaaa.':min&&next<min?'La fecha final debe ser igual o posterior a la inicial.':'');
  setText(formatted);emitted.current=next;onChange(next);
 }
 useEffect(()=>{
  input.current?.setCustomValidity(text&&!value?'Escribe una fecha válida en formato dd/mm/aaaa.':min&&value&&value<min?'La fecha final debe ser igual o posterior a la inicial.':'');
 },[min,value,text]);
 return <input ref={input} type="text" inputMode="numeric" autoComplete="off" placeholder="dd/mm/aaaa" required maxLength={10} value={text} onChange={event=>edit(event.target.value)}/>;
}
