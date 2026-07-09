import { smooth, vnoise } from './brushForms'

/**
 * The floating island's plan-view shape and top-surface height. Shared by `BrushIsland` (which
 * builds the solid + cladding) and `BrushVillage` / `BrushCypress` (which seat forms on the top).
 * Kept in its own module so the component files export only components (fast-refresh rule).
 */

export const RX = 2.05 // footprint half-extent, x
export const RZ = 1.35 // footprint half-extent, z
export const RIDGE = 1.15 // max top height (back-right ridge)

export function coastR(ang: number): number {
  const c = Math.cos(ang)
  const s = Math.sin(ang)
  const ell = (RX * RZ) / Math.sqrt((RZ * c) ** 2 + (RX * s) ** 2)
  const wobble = 1 + 0.09 * Math.sin(3 * ang + 0.4) + 0.06 * Math.sin(6 * ang - 1.1) + 0.035 * Math.sin(11 * ang + 2)
  return ell * wobble
}

/**
 * Rolling top height: a low dark front apron (where the village sits) rising behind into steep
 * rounded hill humps — steep so their near faces present to the front camera and the cladding
 * reads (a gentle mound just foreshortens to smooth clay). Taller on the right, as in the painting.
 */
export function topY(x: number, z: number): number {
  const back = smooth(0.55, -1.2, z) // 0 at the front apron → 1 at the back ridge
  const rightBias = 0.5 + 0.5 * smooth(-1.7, 1.5, x)
  const humps =
    0.95 * Math.exp(-((x - 0.85) ** 2) / 0.42) + // right hump (tallest)
    0.7 * Math.exp(-((x + 0.7) ** 2) / 0.5) + // centre-left hump
    0.5 * Math.exp(-((x + 1.55) ** 2) / 0.4) // far-left hump
  const n = (vnoise(x * 1.8 + 5, z * 1.8 + 9) - 0.5) * 0.35
  return Math.max(0, RIDGE * back * rightBias * (0.3 + 0.85 * humps + n))
}

/** Top-surface height at a plan-view point (matches the solid mesh), for seating forms on the island. */
export function islandHeightAt(x: number, z: number): number {
  const ang = Math.atan2(z, x)
  const rad = Math.hypot(x, z)
  const edge = coastR(ang)
  if (rad > edge) return topY(x, z) * smooth(1, 0.55, 1)
  return topY(x, z) * smooth(1, 0.55, rad / edge)
}
