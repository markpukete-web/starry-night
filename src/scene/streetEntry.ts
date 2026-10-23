/**
 * The street's two checks the main bundle needs (S1): whether the visit is in street mode, and whether the touch hook
 * runs. Everything else about the street is read in its lazy chunk (`streetMode.ts`, `Street.tsx`).
 */
export function isStreetMode(search: string): boolean {
  return new URLSearchParams(search).get('street') === '1'
}

export function touchEnabled({ touch, reduced, arriving, street }: { touch: boolean; reduced: boolean; arriving: boolean; street: boolean }): boolean {
  if (street) return false
  return touch && !reduced && !arriving
}
