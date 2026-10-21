import { BACK_ROW, FRONT_ROW, LEFT_ROW, RIGHT_ROW, stationBox } from './villageStations.ts'

/**
 * The painting's foliage masses, authored (E2, tasks/2026-10-21-land-e2-plan.md E2.1): a box in painting pixels
 * (1600 × 1267) the mass's paint and curls are read from, and a placement in world. The four rows keep the F2
 * placements (villageGeometry's `ROWS`: the base's centre `x0 + xw / 2`, its width `xw`, its `z0`) and take their
 * boxes from their stations (confirmation read F15); the rest were
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
  // the rows' boxes are their stations' (villageStations.ts): the x range, the highest crest to the lowest base
  { id: 'row-front', class: 'teal', box: stationBox(FRONT_ROW), x: -0.35, z: 0.94, width: 0.44 },
  { id: 'row-back', class: 'teal', box: stationBox(BACK_ROW), x: 0.42, z: 0.22, width: 1.2 },
  { id: 'row-right', class: 'teal', box: stationBox(RIGHT_ROW), x: 1.49, z: 0.5, width: 0.35 },
  { id: 'row-left', class: 'teal', box: stationBox(LEFT_ROW), x: -1.22, z: 0.95, width: 0.27 },
  { id: 'olive-church', class: 'teal', box: [896, 1008, 936, 1103], x: 0.2, z: 0.15, width: 0.25 },
  { id: 'olive-right', class: 'teal', box: [1092, 970, 1170, 1016], x: 0.7, z: 0.05, width: 0.35 },
  { id: 'orchard-upper', class: 'teal', box: [1158, 892, 1596, 1044], x: 1.35, z: -0.3, width: 0.7 },
  { id: 'orchard-lower', class: 'teal', box: [1244, 1048, 1412, 1148], x: 1.35, z: 0.05, width: 0.6 },
  // the right orchard's curls are pale olive over blue: the derive measured olive dominant (2026-10-21)
  { id: 'orchard-right', class: 'yellowGreen', box: [1400, 940, 1596, 1030], x: 1.7, z: -0.1, width: 0.5 },
  { id: 'bushes', class: 'yellowGreen', box: [20, 1090, 330, 1250], x: -1.3, z: 0.95, width: 0.5 },
]

/**
 * The painting's village, as boxes in painting pixels (1600 × 1267) traced by eye 2026-10-21: the left houses,
 * the church with its spire, the houses right of it, the big front house, the right village, the front-left
 * wall. The ground's support excludes them, so no wall, roof or window seeds a ground stroke (the striped roof's
 * sienna and the lit windows' yellow walked onto the apron in flat gates 2 and 3; a colour rule could not tell
 * a pale wall from a lit hill slope). In world the holes fall where the village stands; the dark top shows there.
 */
export const VILLAGE_FOOTPRINT: readonly (readonly [number, number, number, number])[] = [
  [640, 1000, 760, 1100],
  [796, 980, 922, 1112],
  [896, 815, 922, 1000],
  [936, 1040, 1165, 1112],
  [940, 1165, 1125, 1240],
  [1160, 1058, 1368, 1152],
  [748, 1168, 848, 1212],
]
