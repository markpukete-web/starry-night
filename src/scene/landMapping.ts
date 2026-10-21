import { RZ } from './islandShape.ts'

/**
 * The painting's land band on the island's top (E2, tasks/2026-10-21-land-e2-plan.md E2.2): the apron in front of
 * the village's back row carries the fields, the humps behind carry the hills, x across the island is u centred
 * on the church's nave (world x −0.036 under the painting's u 0.56, villageGeometry.ts) at 4.75 world units per
 * unit of u, which puts the painting's right edge on the right coast (x 2.05 ↔ u 0.999; at 4.1, the island's
 * span over the painting's width, the rim beyond x 1.77 had no texel under it) and the left coast at u 0.136,
 * inside the cypress column, whose texels take the ground's fill (landStrokes.ts). The ground is fill, so this map is its own: the rows
 * and the masses keep their authored placements (landMasses.ts), whose own scales differ (Codex, E2 plan review
 * F2). The home camera's rays cannot give this map: through the dome the island's top lands on the hills only.
 */
/**
 * The hills' crest in the painting per u, traced 2026-10-21 (the first row under the sky whose 9-wide median
 * luminance stays under 95 for 12 rows, read every 0.05 u, smoothed by eye): the island's back rim maps to the
 * crest, so the sky above it never lands on the humps (a flat 0.60 put the sky's pale swirls on the island's
 * back for u < 0.85, flat gate 1). Behind the cypress (u < 0.35) the far hills' level continues.
 */
export const HILL_CREST: readonly [number, number][] = [
  [0, 0.68], [0.35, 0.69], [0.45, 0.69], [0.5, 0.7], [0.55, 0.64], [0.6, 0.61], [0.7, 0.625], [0.8, 0.607],
  [0.85, 0.592], [0.9, 0.58], [1, 0.58],
]

/** The crest's v at a painting u, piecewise linear. */
export function crestAt(u: number): number {
  if (u <= HILL_CREST[0][0]) return HILL_CREST[0][1]
  for (let k = 1; k < HILL_CREST.length; k++) {
    const [u0, v0] = HILL_CREST[k - 1]
    const [u1, v1] = HILL_CREST[k]
    if (u <= u1) return v0 + ((v1 - v0) * (u - u0)) / (u1 - u0)
  }
  return HILL_CREST[HILL_CREST.length - 1][1]
}

export const LAND_MAP = {
  u0: 0.56,
  x0: -0.036,
  worldPerU: 4.75,
  /** z from the front rim to the village's back row ↔ v from the painting's bottom to the fields' top */
  apron: { zFront: RZ, zBack: 0.25, vFront: 1.0, vBack: 0.78 },
  /** the humps ↔ the hills, from the fields' top to the crest at that u (`crestAt`): 8–18 world units per v
   * against the apron's 5.0, the slope's stretch; the far hills behind the village are the thinnest band */
  hills: { zBack: -RZ },
  /** the band the flow asset covers */
  bandV0: 0.58,
} as const

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/** Painting uv under an island-top point. */
export function paintingUvAt(x: number, z: number): [number, number] {
  const { u0, x0, worldPerU, apron, hills } = LAND_MAP
  const u = u0 + (x - x0) / worldPerU
  const v =
    z >= apron.zBack
      ? lerp(apron.vBack, apron.vFront, (z - apron.zBack) / (apron.zFront - apron.zBack))
      : lerp(crestAt(u), apron.vBack, (z - hills.zBack) / (apron.zBack - hills.zBack))
  return [u, v]
}

/** The island-top point under a painting uv (the inverse). */
export function worldAt(u: number, v: number): [number, number] {
  const { u0, x0, worldPerU, apron, hills } = LAND_MAP
  const x = x0 + (u - u0) * worldPerU
  const crest = crestAt(u)
  const z =
    v >= apron.vBack
      ? lerp(apron.zBack, apron.zFront, (v - apron.vBack) / (apron.vFront - apron.vBack))
      : lerp(hills.zBack, apron.zBack, (v - crest) / (apron.vBack - crest))
  return [x, z]
}

/** A land-flow sample (crop-normalised px, py) as painting uv. */
export function flowToPainting(px: number, py: number): [number, number] {
  return [px, LAND_MAP.bandV0 + py * (1 - LAND_MAP.bandV0)]
}
