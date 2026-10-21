/**
 * The painting's foliage masses, authored (E2, tasks/2026-10-21-land-e2-plan.md E2.1): a box in painting pixels
 * (1600 × 1267) the mass's paint and curls are read from, and a placement in world. The four rows keep the F2
 * placements (villageGeometry's `ROWS`: the base's centre `x0 + xw / 2`, its width `xw`, its `z0`); the rest were
 * traced by eye from the 1:1 crops of the 3840 scan and placed inside the coast (every base probed with a
 * positive margin at both ends, 2026-10-21). Discovery by colour alone merged the hills, fields, roofs and walls
 * into one mass and found no bushes (Codex, E2 plan review F1); the derive validates each box's class share.
 */
export type LandMass = {
  id: string
  /** the mass's dominant foliage hue, which the derive confirms: teal curls, or the bushes' olive */
  class: 'teal' | 'yellowGreen'
  /** painting pixels, 1600 × 1267: x0, y0, x1, y1 */
  box: readonly [number, number, number, number]
  /** world: the base line's centre x, its z, the base's width; the height comes from the box */
  x: number
  z: number
  width: number
}

export const LAND_MASSES: readonly LandMass[] = [
  { id: 'row-front', class: 'teal', box: [742, 1000, 829, 1140], x: -0.35, z: 0.94, width: 0.44 },
  { id: 'row-back', class: 'teal', box: [1004, 963, 1212, 1017], x: 0.42, z: 0.22, width: 1.2 },
  { id: 'row-right', class: 'teal', box: [1182, 1118, 1279, 1170], x: 1.49, z: 0.5, width: 0.35 },
  { id: 'row-left', class: 'teal', box: [685, 1088, 745, 1130], x: -1.22, z: 0.95, width: 0.27 },
  { id: 'olive-church', class: 'teal', box: [896, 1008, 936, 1103], x: 0.2, z: 0.15, width: 0.25 },
  { id: 'olive-right', class: 'teal', box: [1092, 970, 1170, 1016], x: 0.7, z: 0.05, width: 0.35 },
  { id: 'orchard-upper', class: 'teal', box: [1158, 892, 1596, 1044], x: 1.35, z: -0.3, width: 0.7 },
  { id: 'orchard-lower', class: 'teal', box: [1244, 1048, 1412, 1148], x: 1.35, z: 0.05, width: 0.6 },
  // the right orchard's curls are pale olive over blue: the derive measured olive dominant (2026-10-21)
  { id: 'orchard-right', class: 'yellowGreen', box: [1400, 940, 1596, 1030], x: 1.7, z: -0.1, width: 0.5 },
  { id: 'bushes', class: 'yellowGreen', box: [20, 1090, 330, 1250], x: -1.3, z: 0.95, width: 0.5 },
]
