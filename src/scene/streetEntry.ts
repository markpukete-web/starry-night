import type { SkyAnchor } from './skyAnchor.ts'

/**
 * The street's two checks the main bundle needs (S1): whether the visit is in street mode, and whether the touch hook
 * runs. Everything else about the street is read in its lazy chunk (`streetMode.ts`, `Street.tsx`).
 */
export function isStreetMode(search: string): boolean {
  return new URLSearchParams(search).get('street') === '1'
}

/**
 * The street's ID pass (S1 task 7): the sky hidden, the background black, every street fragment drawn in its ID colour.
 */
export function streetIdsPass(search: string): boolean {
  if (!isStreetMode(search)) return false
  const ids = new URLSearchParams(search).get('ids')
  return ids === '1' || ids === '2'
}

/**
 * The street's sky anchor (S1 task 6), undefined outside street mode so the diorama's sky is today's, unless the street
 * is entered through the portal (`portal`, slice 4), which takes the same anchor `?street=1` would. `skyAnchor`: A
 * keeps the dome at the origin (the street placed inside it), B follows the camera. `skyTurn`: lock turns the sky with
 * the camera, world fixes the painting's arc in the world. G5 chose B and world from the 16 frames: the only pair that
 * neither grows as the camera walks nor shows an unpainted band once the stations' tilt is capped.
 */
export function streetSkyAnchor(search: string, portal = false): SkyAnchor | undefined {
  if (!portal && !isStreetMode(search)) return undefined
  const params = new URLSearchParams(search)
  // G5: B (follow) and world by default, as `readStreetFlags` reads them
  return { follow: params.get('skyAnchor') !== 'A', worldFixed: params.get('skyTurn') !== 'lock' }
}

/**
 * Whether the portal opens the village street on this device. A phone or a tablet (`phone`: no hover and a coarse
 * pointer, the walk's own test) gets a note instead: the street alone ended the page on Mark's iPhone (2026-10-28).
 * `?phoneVillage=1` opens it there, for tests on the phone.
 */
export function villageOnDevice(search: string, phone: boolean): boolean {
  return !phone || new URLSearchParams(search).get('phoneVillage') === '1'
}

export function touchEnabled({ touch, reduced, arriving, street }: { touch: boolean; reduced: boolean; arriving: boolean; street: boolean }): boolean {
  if (street) return false
  return touch && !reduced && !arriving
}
