import type { SkyAnchor } from './skyAnchor.ts'

/**
 * The street's two checks the main bundle needs (S1): whether the visit is in street mode, and whether the touch hook
 * runs. Everything else about the street is read in its lazy chunk (`streetMode.ts`, `Street.tsx`).
 */
export function isStreetMode(search: string): boolean {
  return new URLSearchParams(search).get('street') === '1'
}

/**
 * The street's sky anchor (S1 task 6), undefined outside street mode so the diorama's sky is today's. `skyAnchor`: A
 * keeps the dome at the origin (the street placed inside it), B follows the camera. `skyTurn`: lock turns the sky with
 * the camera, world fixes the painting's arc in the world.
 */
export function streetSkyAnchor(search: string): SkyAnchor | undefined {
  if (!isStreetMode(search)) return undefined
  const params = new URLSearchParams(search)
  return { follow: params.get('skyAnchor') === 'B', worldFixed: params.get('skyTurn') === 'world' }
}

export function touchEnabled({ touch, reduced, arriving, street }: { touch: boolean; reduced: boolean; arriving: boolean; street: boolean }): boolean {
  if (street) return false
  return touch && !reduced && !arriving
}
