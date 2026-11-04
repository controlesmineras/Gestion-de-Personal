export const MEAL_OPTIONS = [
  ['breakfast', 'Desayuno'],
  ['lunch', 'Almuerzo'],
  ['dinner', 'Comida'],
] as const;

export const MEAL_LOCATIONS = ['Casa', 'Mina'] as const;
export type MealKey = typeof MEAL_OPTIONS[number][0];
export type MealLocation = typeof MEAL_LOCATIONS[number];

export function isMealLocation(value: unknown): value is MealLocation {
  return value === 'Casa' || value === 'Mina';
}

export function mealLocationKey(key: MealKey) {
  return `${key}Location` as const;
}
