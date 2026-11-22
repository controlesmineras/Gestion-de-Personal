import {MEAL_OPTIONS, mealLocationKey} from './meals';
import {mealBlocked, type Data} from './personnel';

export function mealReportSummary(data: Data, date: string) {
 const people = new Map(data.people.map(person => [person.id, person]));
 const reporters = new Set<string>();
 const eligible = (data.meals ?? []).flatMap(meal => {
  if (meal.date !== date) return [];
  const person = people.get(meal.personId);
  if (!person) return [];
  reporters.add(person.id);
  return mealBlocked(person, data.events, date) ? [] : [{meal, person}];
 });

 const meals = MEAL_OPTIONS.map(([key, label]) => {
  const locationKey = mealLocationKey(key);
  const diners = eligible
   .filter(({meal, person}) => meal[key] && (key === 'breakfast' || !mealBlocked(person, data.events, date, key)))
   .sort((a, b) => a.person.name.localeCompare(b.person.name, 'es'));
  const house = diners.filter(({meal}) => meal[locationKey] === 'Casa').length;
  const mine = diners.filter(({meal}) => meal[locationKey] === 'Mina').length;
  return {key, label, locationKey, diners, house, mine, unknown: diners.length - house - mine};
 });
 return {
  reports: reporters.size,
  house: meals.reduce((sum, meal) => sum + meal.house, 0),
  mine: meals.reduce((sum, meal) => sum + meal.mine, 0),
  meals,
 };
}
