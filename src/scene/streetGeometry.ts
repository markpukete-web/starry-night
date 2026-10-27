import { Color, SRGBColorSpace, Vector3 } from 'three'
import { mulberry32, sampleColour } from './brush.ts'
import { makeBrushArrays, moonShade, type BrushArrays } from './brushForms.ts'
import { bladeTemplate, bladeVertex, clump, GRASS_BLADE } from './grassBlade.ts'
import { GRASS, inFootprint } from './streetGrass.ts'
import { islandHeightAt } from './islandShape.ts'
import { buildLandTrees, type BakedMass, type LandTrees } from './landDomes.ts'
import { buildStreetTrees } from './streetTrees.ts'
import { PALETTE } from './palette.ts'
import { CHURCH_LIGHT, leanOf, lightOf, shadeNew, STREET_LIGHT, type StreetLight } from './streetLight.ts'
import { CHURCH, DETAIL, doorOf, doorStepFrame, houseFrame, STEP, STREET, STREET_CHURCH, STREET_HOUSES, STREET_LAMPS, STREET_RAIL, STREET_SQUARE, STREET_TREES, detailOf, laneDistance, pathPoint, pathTangent, streetGroundAt, type StreetHouse, laneAt, STREET_WALLS, STREET_WALL } from './streetLayout.ts'
import { outlineFace, PATH_LIFT, sourceUnderpaint, streetMassConfig, STREET_MOON_LIFT, traceFace, type FaceStrokes, type StreetFace, type StreetSourceName, stoneDab, STREET_SOURCES, STROKE_LIFT } from './streetStrokes.ts'
import type { ImageData2D } from './useImageData.ts'
import { VILLAGE_CHURCH, type Pigment } from './villageKnot.ts'

/**
 * The street's build (S1 task 5, tasks/2026-10-23-street-s1-plan.md): the houses and the church as volumes with the
 * village knot's proportions, every wall, gable and roof plane clad by `traceFace` and inked along its edges by
 * `outlineFace`, the ground and the path in the field's strokes, the trees the land's stroked domes. Pure: the
 * component draws it.
 */

export type StreetCounts = { ribbons: number; triangles: number; builds: number }

export type BrushArraysWithCls = BrushArrays & { cls: number[]; src: number[] }
export type Strokes = { arrays: BrushArrays; stroke: number[]; seed: number[]; cls: number[]; src: number[] }

export type WallPaint = { base: number; light: number; cover: number }
export const KEPT_PAINT: WallPaint = { base: 0, light: 0.5, cover: 1 }
/** look pass 3: a fifth fewer strokes; the base stays the mean (toward the lightest half it lifted the dark houses, wallB by L 16, and the walls' ΔE by 3 to 6) */
export const WALL_PAINT: WallPaint = { base: 0, light: 0.5, cover: 0.8 }

export type CraftPart = { name: string; buffer: 'underpaint' | 'outlines' | 'windows'; from: number; to: number }
export type CraftReport = {
  owner: string
  index: number
  /** the front wall as drawn, before the lean */
  front: StreetFace
  /** the refHeight its door's ink was drawn with: FRAME × eave on every house */
  inkRef: number
  /** linear RGB, before the light and the shade */
  bandColour: [number, number, number]
  /** recessedDoor's report, a painting house only */
  door?: NonNullable<HouseReport['door']>
  parts: CraftPart[]
}

export type StreetBuild = {
  underpaint: BrushArraysWithCls
  strokes: Strokes
  /** the ground's and the path's strokes, drawn in their own calmer body (pass 4) */
  ground: Strokes
  outlines: Strokes
  windows: BrushArraysWithCls
  /** the dark base under the grass, its own mesh so its dabs (`grassBase.ts`) touch no other program; empty without grass */
  grassBase: BrushArraysWithCls
  trees: LandTrees
  counts: StreetCounts
  /** the gates' read of the build: ribbons per face, inked edges per volume, the windows, the church's measures */
  report: {
    /** each face's polygon and outward normal, for the church's face probe (`scripts/street-church.test.ts`) */
    faces: {
      owner: string
      name: string
      ribbons: number
      density: number
      cover: number
      source: StreetSourceName
      base: [number, number, number]
      corners: Vector3[]
      normal: Vector3
      light: number
      refHeight: number
    }[]
    outlines: { owner: string; edges: number }[]
    windows: { owner: string; lit: boolean }[]
    church: { belfryWidth: number; belfryHeight: number; spireHeight: number } & HouseReport
    craft: CraftReport[]
    lane: {
      walls: {
        side: -1 | 1
        t0: number
        t1: number
        segments: { t0: number; t1: number; corners: Vector3[] }[]
        underpaint: [number, number]
        strokes: [number, number]
        dabs: { face: 'lane' | 'top' | 'cap'; t: number; lateral: number; y: number; length: number; width: number }[]
      }[]
      rail: { house: string; posts: Vector3[]; opening: [Vector3, Vector3]; underpaint: [number, number] } | null
      lamps: { foot: Vector3; lantern: Vector3; underpaint: [number, number] }[]
    }
  }
}

export const LANE_CRAFT = {
  wall: {
    courses: 4,
    rows: 2,
    /** the painting's measured range for this wall (SOURCE_STROKES.wallB), the bound the dab test checks */
    length: [0.6, 2.0] as [number, number],
    /** a course draws its stones from here, uniform, then scales them to fill its run (pass 5) */
    draw: [0.6, 1.0] as [number, number],
    joint: 0.92,
    width: 0.2,
    base: 0.4,
    pale: 0.55,
    /** look pass 2: wallA's darkest 40% is L 4.7 and 57% of its texels are under L 20, so the wall read black with pale flecks; wallB's base is L 13 and its median texel L 30 */
    source: 'wallB' as StreetSourceName,
  },
  rail: {
    post: 0.005,
    height: 0.05,
    rails: [0.02, 0.042] as [number, number],
    bar: 0.004,
    spacing: 0.12,
  },
  lamp: {
    post: 0.004,
    height: 0.13,
    lantern: [0.012, 0.016] as [number, number],
    cap: [0.016, 0.008] as [number, number],
  },
} as const

export const CRAFT = {
  door: { recess: 0.02, band: 0.3, lift: 0.001, paleDark: 0.7 },
  shutter: { lift: 0.006, louvres: [0.25, 0.5, 0.75], maxSamples: 5 },
  eaves: 0.03,
} as const

const INK = new Color(PALETTE.ground)
/** pass 5: a door's and a dark window's strokes are their wall's, at this share of its value */
const OPENING_DARK = 0.3
/** A recessed door's jambs and lintel, in the recess's own shadow (the church plan (e)) */
const REVEAL_SHADE = 0.6
/** A side window's centre height, width and height, as fractions of its wall */
const SIDE_WINDOW = { cv: 0.55, w: 0.08, h: 0.3 }

export type HouseReport = {
  door?: {
    plane: { origin: Vector3; normal: Vector3 }
    panel: Vector3[]
    jambs: Vector3[][]
    lintel: Vector3[]
    step: Vector3[][]
    ink: [number, number]
    stepRange: [number, number]
  }
  /** the side windows' quads, as `opening` drew them */
  windows?: Vector3[][]
}
// pass 1: 0.35 of the house blue read as flat blue doors
const WINDOW_DARK = new Color(PALETTE.ground).lerp(new Color(PALETTE.house), 0.12)
/** the ground's, the path's and the grass's base: the mean of the field source's darkest share (look pass 1; S3 look
 * pass 1 moved the grass's from 0.2, which left the verge's gaps at L 12 against the field's 22 and the ground's ΔE76 at
 * 11.2, so its edge blend into the ground had nothing left to blend, Codex F06) */
const GROUND_BASE_SHARE = 0.4
/** Look pass 3: the path's pale base stops this far short of its edges (0.2 of its width), so strokes draw the edge */
const PATH_BASE_INSET = 0.024
/** the roofs overhang the walls by this much along both axes */
export const OVERHANG = 0.015
/** the door's and the windows' frames: a thin ink, a fraction of the wall's height */
export const FRAME = 0.35
const UP = new Vector3(0, 1, 0)

const WALL_SOURCES: StreetSourceName[] = ['wallA', 'wallB']
function wallSource(pigment: Pigment, index: number): StreetSourceName {
  return pigment === 'pale' ? 'plaster' : WALL_SOURCES[index % WALL_SOURCES.length]
}
function roofSource(pigment: Pigment, index: number): StreetSourceName {
  if (pigment === 'sienna') return 'roofSienna'
  if (pigment === 'striped') return 'roofStriped'
  return index % 3 === 2 ? 'roofStriped' : 'roofBlue'
}

export const SOURCE_CLASSES: Record<StreetSourceName, number> = {
  wallA: 0,
  wallB: 1,
  plaster: 2,
  roofStriped: 3,
  roofBlue: 4,
  roofSienna: 5,
  thatch: 6,
  field: 255,
  windowLit: 255,
}

function append(into: Strokes, from: FaceStrokes, cls: number, src = 255): void {
  const base = into.arrays.positions.length / 3
  into.arrays.positions.push(...from.arrays.positions)
  into.arrays.colors.push(...from.arrays.colors)
  for (const i of from.arrays.indices) into.arrays.indices.push(i + base)
  into.stroke.push(...from.stroke)
  into.seed.push(...from.seed)
  const count = from.arrays.positions.length / 3
  for (let i = 0; i < count; i++) {
    into.cls.push(cls)
    into.src.push(src)
  }
}

function polygon(arr: BrushArraysWithCls, vertices: Vector3[], colour: Color, cls: number, src = 255): void {
  const start = arr.positions.length / 3
  for (const p of vertices) {
    arr.positions.push(p.x, p.y, p.z)
    arr.colors.push(colour.r, colour.g, colour.b)
    arr.cls.push(cls)
    arr.src.push(src)
  }
  for (let i = 1; i < vertices.length - 1; i++) arr.indices.push(start, start + i, start + i + 1)
}

/** A face with `v` up its height and its normal turned outward from `inside` (`u` reversed when it pointed in). */
function orientedFace(origin: Vector3, u: Vector3, v: Vector3, inside: Vector3, fields: Omit<StreetFace, 'origin' | 'u' | 'v' | 'normal'>): StreetFace {
  let o = origin.clone()
  let uu = u.clone()
  const normal = new Vector3().crossVectors(uu, v).normalize()
  const centre = o.clone().addScaledVector(uu, 0.5).addScaledVector(v, 0.5)
  if (normal.dot(centre.clone().sub(inside)) < 0) {
    o = o.add(uu)
    uu = uu.negate()
    normal.negate()
  }
  return { origin: o, u: uu, v: v.clone(), normal, ...fields }
}

function facePolygon(face: StreetFace): Vector3[] {
  const a = face.origin
  const b = face.origin.clone().add(face.u)
  if (face.shape === 'triangle') return [a, b, face.origin.clone().addScaledVector(face.u, 0.5).add(face.v)]
  return [a, b, b.clone().add(face.v), face.origin.clone().add(face.v)]
}

type Context = {
  flow: ImageData2D
  painting: ImageData2D
  underpaint: BrushArraysWithCls
  strokes: Strokes
  ground: Strokes
  outlines: Strokes
  windows: BrushArraysWithCls
  grassBase: BrushArraysWithCls
  report: StreetBuild['report']
  ribbons: number
  /** false under the dev flag `light=0` */
  lit: boolean
  /** the walls' light: the street's, the church's while `church()` clads its own */
  wallLight: StreetLight
  wallPaint: WallPaint
}

/** Clad one face: its underpaint, its strokes, its report line. */
function clad(ctx: Context, owner: string, name: string, face: StreetFace, faceDensity = 1, [insetU, insetV] = [0, 0], shadeAs = face): void {
  // the church's faces no sampled pose of the walk sees are thin, not removed (the church plan (f))
  const density = (CHURCH.hidden as readonly string[]).includes(`${owner}/${name}`) ? CHURCH.thin : faceDensity
  // a roof's base is its source's mean, not its darkest tenth: the street's eye meets the roofs at a grazing angle,
  // where the strokes thin out, and 46–99% of a roof's pixels showed the dark base (the per-source gate, `t12/`)
  // S1b look passes 1 and 2: a face's base is its source's mean. On the darkest tenth the gaps between strokes read as
  // black: near-black filled the lower 40% of every frame (`t8/cap/`), and a wall at half density read as dark planks
  // (`t9/wall-bases.png`). The ground and the path keep a darker share, because on the whole mean they read as a flat
  // grey plane (`t9/ground-bases.png`). Look pass 3: the path's base takes its strokes' lift, or pale strokes sit on a
  // dark base, and stops short of the path's edges, where the clipped strokes left it as a ruled grey band
  const cls = face.kind === 'wall' ? 0 : face.kind === 'roof' ? 1 : face.kind === 'ground' ? 3 : 4
  const src = face.kind === 'wall' || face.kind === 'roof' ? (SOURCE_CLASSES[face.source] ?? 255) : 255
  const light = lightOf(face, ctx.lit, face.kind === 'wall' ? ctx.wallLight : STREET_LIGHT)
  const underFrom = ctx.underpaint.positions.length
  let base: Color
  if (face.kind === 'wall') {
    const paint = ctx.wallPaint
    base = new Color().setRGB(...sourceUnderpaint(ctx.painting, face.source, 1), SRGBColorSpace)
    if (paint.base !== 0) {
      const litCol = new Color().setRGB(...sourceUnderpaint(ctx.painting, face.source, paint.light, true), SRGBColorSpace)
        .multiplyScalar(1 + STREET_MOON_LIFT * moonShade(face.normal))
      base.lerp(litCol, paint.base)
    }
  } else {
    const share = face.kind === 'ground' || face.kind === 'path' ? GROUND_BASE_SHARE : 1
    const [r, g, b] = sourceUnderpaint(ctx.painting, face.source, share)
    base = new Color().setRGB(r, g, b, SRGBColorSpace)
    if (face.kind === 'path') base.lerp(new Color(PATH_LIFT.toward), PATH_LIFT.share)
  }
  const baseRGB: [number, number, number] = [base.r, base.g, base.b]
  const [fu, fv] = [insetU / face.u.length(), insetV / face.v.length()]
  const baseFace = { ...face, origin: face.origin.clone().addScaledVector(face.u, fu).addScaledVector(face.v, fv), u: face.u.clone().multiplyScalar(1 - 2 * fu), v: face.v.clone().multiplyScalar(1 - 2 * fv) }
  polygon(ctx.underpaint, facePolygon(baseFace), base.multiplyScalar(light), cls, src)
  const cover = face.kind === 'wall' ? ctx.wallPaint.cover : 1
  const traced = traceFace(face, ctx.flow, ctx.painting, { density: density * cover })
  for (let k = 0; k < traced.arrays.colors.length; k++) traced.arrays.colors[k] *= light
  shadeNew(ctx.underpaint, underFrom, shadeAs, ctx.lit)
  shadeNew(traced.arrays, 0, shadeAs, ctx.lit)
  append(face.kind === 'ground' || face.kind === 'path' ? ctx.ground : ctx.strokes, traced, cls, src)
  ctx.ribbons += traced.ribbons
  ctx.report.faces.push({ owner, name, ribbons: traced.ribbons, density, cover, source: face.source, base: baseRGB, corners: facePolygon(face), normal: face.normal.clone(), light, refHeight: face.refHeight })
}

/** Ink a volume's edges, each with the normal of the face it belongs to. */
function ink(ctx: Context, owner: string, refHeight: number, edges: [Vector3, Vector3, Vector3][], seed: number): void {
  edges.forEach(([a, b, normal], i) => {
    const face: StreetFace = { origin: a, u: b.clone().sub(a), v: UP.clone(), normal, shape: 'quad', kind: 'wall', source: 'wallA', refHeight, seed, mirror: false }
    append(ctx.outlines, outlineFace(face, [[a, b]], INK, seed * 17 + i), 255)
  })
  ctx.report.outlines.push({ owner, edges: edges.length })
}

/** An opening on a wall face: a dark (or lit) quad over the strokes, framed in a thin ink. Returns the quad it drew, so a
 * report reads the drawn opening, not a second account of it (code review C1). */
function opening(ctx: Context, face: StreetFace, cu: number, cv: number, w: number, h: number, lit: boolean, seed: number, recess = 0): Vector3[] {
  // a recessed door (the church plan (e)) sits behind the wall in the recess's shadow, and its frame is the hole's
  // edge, inked at the wall's plane by `recessedDoor`: a second frame at the panel read as a double outline
  const at = (s: number, t: number) => face.origin.clone().addScaledVector(face.u, s).addScaledVector(face.v, t).addScaledVector(face.normal, recess > 0 ? -recess : 0.0055)
  const quad = [at(cu - w / 2, cv - h / 2), at(cu + w / 2, cv - h / 2), at(cu + w / 2, cv + h / 2), at(cu - w / 2, cv + h / 2)]
  // pass 5: painted, not a flat card: a lit window in the painting's own window dabs, a door or a dark window in its
  // wall's strokes darkened, each over a dark base and strokes sized to the opening
  // the ID pass's classes (task 7): a lit window's base and strokes are the windows (2), a door or a dark window none (255)
  // a lit window's base is its dabs' own mean, not a dark one: the dark base showed between the dabs and dulled the
  // window to L 41 against the dabs' 55 (the palette gate on the merged head)
  const base = lit ? new Color().setRGB(...sourceUnderpaint(ctx.painting, 'windowLit', 1), SRGBColorSpace) : WINDOW_DARK
  polygon(ctx.windows, quad, base, lit ? 2 : 255)
  const opening: StreetFace = {
    ...face,
    origin: quad[0],
    u: face.u.clone().multiplyScalar(w),
    v: face.v.clone().multiplyScalar(h),
    shape: 'quad',
    source: lit ? 'windowLit' : face.source,
    refHeight: face.v.length() * h,
    seed,
    mirror: false,
  }
  append(ctx.strokes, traceFace(opening, ctx.flow, ctx.painting, { tint: lit ? 1 : recess > 0 ? OPENING_DARK * REVEAL_SHADE : OPENING_DARK }), lit ? 2 : 255)
  if (recess > 0) return quad
  const frame: StreetFace = { ...face, refHeight: face.v.length() * FRAME }
  append(ctx.outlines, outlineFace(frame, quad.map((p, i) => [p, quad[(i + 1) % 4]] as const), INK, seed), 255)
  return quad
}

export type StreetShape = {
  w: number
  d: number
  eave: number
  pitch: number
  storeys: 1 | 2
  wallSource: StreetSourceName
  roofSource: StreetSourceName
  /** the brush's `refHeight` for every face, in place of the eave and the slope (the church) */
  brush?: number
  /** the door set this deep into the front wall, over a step (the church) */
  recess?: number
  /** dark windows down the +along side, their centres across it (the church) */
  sideWindows?: readonly number[]
  craft?: boolean
  eaveOverhang?: number
}

export function craftShape(h: StreetHouse): StreetShape {
  if (h.type === 'cottage') {
    return { ...h, craft: true }
  }
  return { ...h, craft: true, recess: CRAFT.door.recess, eaveOverhang: CRAFT.eaves }
}

/**
 * A house: a box to the eave and a pitched roof whose ridge runs along its depth, so its front gable and door face
 * the path; `along` is its width's direction, `toPath` its depth's, toward the street.
 */
export function house(ctx: Context, owner: string, index: number, shape: StreetShape, centre: Vector3, along: Vector3, toPath: Vector3, lit: boolean, chimney: boolean, density = 1): HouseReport {
  return leaned(ctx, index, along, () => buildHouse(ctx, owner, index, shape, centre, along, toPath, lit, chimney, density))
}

/** A Dutch cottage (S1b task 2): low walls under a thick thatched roof whose ridge runs along the front. */
export function cottage(ctx: Context, owner: string, index: number, shape: StreetShape, centre: Vector3, along: Vector3, toPath: Vector3, lit: boolean, chimney: boolean, density = 1): void {
  leaned(ctx, index, along, () => buildCottage(ctx, owner, index, shape, centre, along, toPath, lit, chimney, density))
}

/** Each house leans its own way (`streetLight.ts`): a shear by height keeps every face flat. */
function leaned<T>(ctx: Context, index: number, along: Vector3, build: () => T): T {
  const lean = leanOf(index)
  const marks = [ctx.underpaint, ctx.strokes.arrays, ctx.outlines.arrays, ctx.windows].map((arr) => [arr, arr.positions.length] as const)
  const built = build()
  for (const [arr, from] of marks) {
    for (let i = from; i < arr.positions.length; i += 3) {
      const y = arr.positions[i + 1]
      arr.positions[i] += along.x * lean * y
      arr.positions[i + 2] += along.z * lean * y
    }
  }
  return built
}

function doorStep(ctx: Context, face: StreetFace, s0: number, s1: number, colour: Color): { step: Vector3[][]; range: [number, number] } {
  const at = (s: number, t: number, n = 0) => face.origin.clone().addScaledVector(face.u, s).addScaledVector(face.v, t).addScaledVector(face.normal, n)
  const lit = (corners: Vector3[], normal: Vector3, shade: number) => {
    polygon(ctx.underpaint, corners, colour.clone().multiplyScalar(lightOf({ ...face, normal }, ctx.lit, ctx.wallLight) * shade), 255)
    return corners
  }
  const across = face.u.clone().normalize()
  const foot = (s: number, n: number, y: number) => at(s, 0, n).setY(y)
  const [h, d] = [STEP.height, STEP.depth]
  const stepFrom = ctx.underpaint.positions.length / 3
  const step = [
    lit([foot(s0, 0, h), foot(s1, 0, h), foot(s1, d, h), foot(s0, d, h)], UP.clone(), 1),
    lit([foot(s0, d, 0), foot(s1, d, 0), foot(s1, d, h), foot(s0, d, h)], face.normal, 1),
    lit([foot(s0, 0, 0), foot(s0, d, 0), foot(s0, d, h), foot(s0, 0, h)], across.clone().negate(), 1),
    lit([foot(s1, 0, 0), foot(s1, 0, h), foot(s1, d, h), foot(s1, d, 0)], across, 1),
  ]
  const stepTo = ctx.underpaint.positions.length / 3
  return { step, range: [stepFrom, stepTo] }
}

function drawFrameBand(
  ctx: Context,
  front: StreetFace,
  door: { cu: number; w: number; h: number },
  craftParts: CraftPart[],
  over: boolean,
): [number, number, number] {
  const [s0, s1] = [door.cu - door.w / 2, door.cu + door.w / 2]
  const b = CRAFT.door.band * door.w
  const bt = (b * front.u.length()) / front.v.length()
  // a cottage's band stops at its door's top: above it, the thatch's slab hides the wall, and a band there pierces it
  const t1 = over ? Math.min(1, door.h + bt) : door.h

  const atLift = (s: number, t: number) =>
    front.origin.clone().addScaledVector(front.u, s).addScaledVector(front.v, t).addScaledVector(front.normal, CRAFT.door.lift)

  const plasterMean = new Color().setRGB(...sourceUnderpaint(ctx.painting, 'plaster', 1), SRGBColorSpace)
  if (front.source === 'plaster') {
    plasterMean.multiplyScalar(CRAFT.door.paleDark)
  }
  const bandColour: [number, number, number] = [plasterMean.r, plasterMean.g, plasterMean.b]
  const litColour = plasterMean.clone().multiplyScalar(lightOf(front, ctx.lit, ctx.wallLight))

  const bandFrom = ctx.underpaint.positions.length

  const leftS0 = Math.max(0, s0 - b)
  const leftS1 = s0
  const rightS0 = s1
  const rightS1 = Math.min(1, s1 + b)

  const leftQuad = [atLift(leftS0, 0), atLift(leftS1, 0), atLift(leftS1, t1), atLift(leftS0, t1)]
  const qLeftFrom = ctx.underpaint.positions.length / 3
  polygon(ctx.underpaint, leftQuad, litColour, 0, 255)
  const qLeftTo = ctx.underpaint.positions.length / 3
  craftParts.push({ name: 'band left', buffer: 'underpaint', from: qLeftFrom, to: qLeftTo })

  const rightQuad = [atLift(rightS0, 0), atLift(rightS1, 0), atLift(rightS1, t1), atLift(rightS0, t1)]
  const qRightFrom = ctx.underpaint.positions.length / 3
  polygon(ctx.underpaint, rightQuad, litColour, 0, 255)
  const qRightTo = ctx.underpaint.positions.length / 3
  craftParts.push({ name: 'band right', buffer: 'underpaint', from: qRightFrom, to: qRightTo })

  if (over) {
    const overQuad = [atLift(s0, door.h), atLift(s1, door.h), atLift(s1, t1), atLift(s0, t1)]
    const qOverFrom = ctx.underpaint.positions.length / 3
    polygon(ctx.underpaint, overQuad, litColour, 0, 255)
    const qOverTo = ctx.underpaint.positions.length / 3
    craftParts.push({ name: 'band over', buffer: 'underpaint', from: qOverFrom, to: qOverTo })
  }

  shadeNew(ctx.underpaint, bandFrom, front, ctx.lit)

  return bandColour
}

function drawWindowShutters(
  ctx: Context,
  front: StreetFace,
  k: number,
  window: { cu: number; cv: number; w: number; h: number },
  seed: number,
  craftParts: CraftPart[],
): void {
  const atLift = (s: number, t: number) =>
    front.origin.clone().addScaledVector(front.u, s).addScaledVector(front.v, t).addScaledVector(front.normal, CRAFT.shutter.lift)

  const leafHeight = window.h * front.v.length()
  const leafFace: StreetFace = {
    ...front,
    refHeight: leafHeight * FRAME,
  }

  const shutterColour = new Color(PALETTE.villageCool).multiplyScalar(lightOf(front, ctx.lit, ctx.wallLight))
  const [t0, t1] = [window.cv - window.h / 2, window.cv + window.h / 2]

  for (const side of ['left', 'right'] as const) {
    const [s0, s1] = side === 'left' ? [window.cu - window.w, window.cu - window.w / 2] : [window.cu + window.w / 2, window.cu + window.w]
    const p00 = atLift(s0, t0)
    const p10 = atLift(s1, t0)
    const p11 = atLift(s1, t1)
    const p01 = atLift(s0, t1)
    const quad = [p00, p10, p11, p01]

    const underFrom = ctx.underpaint.positions.length
    const leafFrom = ctx.underpaint.positions.length / 3
    polygon(ctx.underpaint, quad, shutterColour, 0, 255)
    shadeNew(ctx.underpaint, underFrom, front, ctx.lit)
    const leafTo = ctx.underpaint.positions.length / 3
    craftParts.push({ name: `leaf ${k} ${side}`, buffer: 'underpaint', from: leafFrom, to: leafTo })

    const edges: [Vector3, Vector3][] = [
      [p00, p10],
      [p10, p11],
      [p11, p01],
      [p01, p00],
    ]
    for (const frac of CRAFT.shutter.louvres) {
      const t = t0 + frac * (t1 - t0)
      edges.push([atLift(s0, t), atLift(s1, t)])
    }

    const leafSeed = seed + 31 + (side === 'left' ? 0 : 7)
    const inkFrom = ctx.outlines.arrays.positions.length / 3
    const stroked = outlineFace(leafFace, edges, INK, leafSeed, CRAFT.shutter.maxSamples)
    append(ctx.outlines, stroked, 255)
    const inkTo = ctx.outlines.arrays.positions.length / 3
    craftParts.push({ name: `leaf ${k} ${side} ink`, buffer: 'outlines', from: inkFrom, to: inkTo })
  }
}

function buildHouse(ctx: Context, owner: string, index: number, shape: StreetShape, centre: Vector3, along: Vector3, toPath: Vector3, lit: boolean, chimney: boolean, density = 1): HouseReport {
  const c = (x: number, z: number, y: number) => centre.clone().addScaledVector(along, x).addScaledVector(toPath, z).setY(y)
  const { w, d, eave, pitch, storeys, wallSource: wall, roofSource: roof } = shape
  const inside = centre.clone().setY(eave / 2)
  const seed = 0x5700 + index * 97
  // the walls: front (toward the path), right, back, left
  const fl = c(-w / 2, d / 2, 0), fr = c(w / 2, d / 2, 0), br = c(w / 2, -d / 2, 0), bl = c(-w / 2, -d / 2, 0)
  const upE = UP.clone().multiplyScalar(eave)
  const walls: [string, Vector3, Vector3][] = [['front', fl, fr], ['right', fr, br], ['back', br, bl], ['left', bl, fl]]
  const door = doorOf(shape, index)
  const wallFaces = walls.map(([name, a, z], i) => {
    const face = orientedFace(a, z.clone().sub(a), upE, inside, { shape: 'quad', kind: 'wall', source: wall, refHeight: shape.brush ?? eave, seed: seed + i, mirror: i % 2 === 1 })
    if (i === 0 && shape.recess) cladRound(ctx, owner, face, door, density)
    else clad(ctx, owner, name, face, density)
    return face
  })
  // the gables over the front and the back
  const upP = UP.clone().multiplyScalar(pitch)
  for (const [name, a, z, i] of [['front gable', fl, fr, 4], ['back gable', br, bl, 5]] as const) {
    clad(ctx, owner, name, orientedFace(a.clone().setY(eave), z.clone().sub(a), upP, inside, { shape: 'triangle', kind: 'wall', source: wall, refHeight: shape.brush ?? eave, seed: seed + i, mirror: i === 5 }), density)
  }
  // the roof planes, from the eave (overhung) to the ridge; the ridge runs along the depth at the width's middle
  const planes = houseRoofPlanes(shape, centre, along, toPath)
  planes.forEach(([side, [eaveF, eaveB, , ridgeF]], k) => {
    const slope = ridgeF.clone().sub(eaveF)
    clad(ctx, owner, `${side} roof`, orientedFace(eaveF, eaveB.clone().sub(eaveF), slope, inside, { shape: 'quad', kind: 'roof', source: roof, refHeight: shape.brush ?? slope.length(), seed: seed + 6 + k, mirror: side === 'right' }), density)
  })
  const [ridgeB, ridgeF] = [planes[0][1][2], planes[0][1][3]]
  // S1b task 3: the roof's thickness shown at its eave and rakes, a dark band under each edge
  const edgeColour = sourceColour(ctx, roof).multiplyScalar(OPENING_DARK)
  for (const band of houseRoofEdges(shape, centre, along, toPath)) polygon(ctx.underpaint, band.corners, edgeColour, 255)
  // the ink: four eaves, four corners, four rakes, the ridge, four along the ground
  const top = [fl, fr, br, bl].map((p) => p.clone().setY(eave))
  const base = [fl, fr, br, bl]
  const edges: [Vector3, Vector3, Vector3][] = []
  for (let k = 0; k < 4; k++) {
    const n = wallFaces[k].normal
    edges.push([top[k], top[(k + 1) % 4], n], [base[k], top[k], n], [base[k], base[(k + 1) % 4], n])
  }
  const peakF = c(0, d / 2, eave + pitch)
  const peakB = c(0, -d / 2, eave + pitch)
  edges.push([top[0], peakF, wallFaces[0].normal], [top[1], peakF, wallFaces[0].normal], [top[2], peakB, wallFaces[2].normal], [top[3], peakB, wallFaces[2].normal])
  edges.push([ridgeF, ridgeB, UP.clone()])
  ink(ctx, owner, eave, edges, seed)
  // the door and a window on the front; only `lit` houses show a warm one
  const front = wallFaces[0]
  const report: HouseReport = {}
  const craftParts: CraftPart[] = []
  if (shape.recess) {
    const doorFrom = ctx.windows.positions.length / 3
    const inkRef = shape.craft ? FRAME * eave : front.v.length()
    report.door = recessedDoor(ctx, owner, front, door, shape.recess, seed + 11, inkRef)
    const doorTo = ctx.windows.positions.length / 3
    if (shape.craft) {
      craftParts.push({ name: 'door', buffer: 'windows', from: doorFrom, to: doorTo })
      craftParts.push({ name: 'door ink', buffer: 'outlines', from: report.door.ink[0], to: report.door.ink[1] })
    }
  } else {
    opening(ctx, front, door.cu, door.h / 2, door.w, door.h, false, seed + 11)
  }
  ctx.report.windows.push({ owner, lit: false })

  const w0From = ctx.windows.positions.length / 3
  const win0 = { cu: index % 2 ? 0.2 : 0.8, cv: 0.62 / storeys, w: 0.12, h: 0.2 / storeys }
  opening(ctx, front, win0.cu, win0.cv, win0.w, win0.h, lit, seed + 13)
  const w0To = ctx.windows.positions.length / 3
  ctx.report.windows.push({ owner, lit })
  if (shape.craft) {
    craftParts.push({ name: 'window 0', buffer: 'windows', from: w0From, to: w0To })
  }

  let win1: { cu: number; cv: number; w: number; h: number } | undefined
  if (storeys === 2) {
    const w1From = ctx.windows.positions.length / 3
    win1 = { cu: index % 2 ? 0.2 : 0.8, cv: (1 + 0.62) / storeys, w: 0.12, h: 0.2 / storeys }
    opening(ctx, front, win1.cu, win1.cv, win1.w, win1.h, false, seed + 17)
    const w1To = ctx.windows.positions.length / 3
    ctx.report.windows.push({ owner, lit: false })
    if (shape.craft) {
      craftParts.push({ name: 'window 1', buffer: 'windows', from: w1From, to: w1To })
    }
  }

  if (shape.craft) {
    const bandColour = drawFrameBand(ctx, front, door, craftParts, true)
    craftParts.push({ name: 'step', buffer: 'underpaint', from: report.door!.stepRange[0], to: report.door!.stepRange[1] })

    drawWindowShutters(ctx, front, 0, win0, seed + 13, craftParts)

    if (win1) {
      drawWindowShutters(ctx, front, 1, win1, seed + 17, craftParts)
    }

    for (const soffit of houseSoffits(shape, centre, along, toPath)) {
      const from = ctx.underpaint.positions.length / 3
      polygon(ctx.underpaint, soffit.corners, edgeColour, 255)
      const to = ctx.underpaint.positions.length / 3
      craftParts.push({ name: soffit.name.startsWith('left') ? 'soffit left' : 'soffit right', buffer: 'underpaint', from, to })
    }

    ctx.report.craft.push({
      owner,
      index,
      front,
      inkRef: FRAME * eave,
      bandColour,
      door: report.door,
      parts: craftParts,
    })
  }

  // a chimney, a small dark box through the roof
  if (chimney) {
    const foot = c(w * 0.18, -d * 0.22, eave + pitch * 0.4)
    const size = 0.035
    const box = [[0, 0], [1, 0], [1, 1], [0, 1]].map(([x, z]) => foot.clone().addScaledVector(along, x * size).addScaledVector(toPath, z * size))
    const tops = box.map((p) => p.clone().setY(eave + pitch * 0.68 + 0.1))
    for (let k = 0; k < 4; k++) polygon(ctx.underpaint, [box[k], box[(k + 1) % 4], tops[(k + 1) % 4], tops[k]], INK, 255)
    polygon(ctx.underpaint, tops, INK, 255)
  }
  if (shape.sideWindows) {
    report.windows = shape.sideWindows.map((cu, k) => {
      ctx.report.windows.push({ owner, lit: false })
      return opening(ctx, wallFaces[1], cu, SIDE_WINDOW.cv, SIDE_WINDOW.w, SIDE_WINDOW.h, false, seed + 19 + k)
    })
  }
  return report
}

/** A wall clad round its door's hole: left of it, right of it and over it, shaded as the one wall they make. */
function cladRound(ctx: Context, owner: string, face: StreetFace, door: { cu: number; w: number; h: number }, density: number): void {
  const [s0, s1] = [door.cu - door.w / 2, door.cu + door.w / 2]
  const part = (name: string, a0: number, a1: number, b0: number, b1: number, k: number) => {
    const origin = face.origin.clone().addScaledVector(face.u, a0).addScaledVector(face.v, b0)
    clad(ctx, owner, name, { ...face, origin, u: face.u.clone().multiplyScalar(a1 - a0), v: face.v.clone().multiplyScalar(b1 - b0), seed: face.seed + 0x40 * k }, density, [0, 0], face)
  }
  part('front left', 0, s0, 0, 1, 1)
  part('front right', s1, 1, 0, 1, 2)
  part('front over', s0, s1, door.h, 1, 3)
}

/**
 * A door set into its wall (the church plan (e)): the door painted as any door, `depth` behind the wall's plane, the
 * jambs and the lintel joining the hole's edges to it in the recess's shadow, and a step at its foot. `cladRound`
 * leaves the hole.
 */
function recessedDoor(ctx: Context, owner: string, face: StreetFace, door: { cu: number; w: number; h: number }, depth: number, seed: number, inkRef = face.v.length()): NonNullable<HouseReport['door']> {
  const [s0, s1] = [door.cu - door.w / 2, door.cu + door.w / 2]
  const at = (s: number, t: number, n = 0) => face.origin.clone().addScaledVector(face.u, s).addScaledVector(face.v, t).addScaledVector(face.normal, n)
  const panel = opening(ctx, face, door.cu, door.h / 2, door.w, door.h, false, seed, depth)
  const plaster = sourceColour(ctx, face.source)
  const lit = (corners: Vector3[], normal: Vector3, shade: number) => {
    polygon(ctx.underpaint, corners, plaster.clone().multiplyScalar(lightOf({ ...face, normal }, ctx.lit, ctx.wallLight) * shade), 255)
    return corners
  }
  const across = face.u.clone().normalize()
  const jambs = [
    lit([at(s0, 0), at(s0, door.h), at(s0, door.h, -depth), at(s0, 0, -depth)], across, REVEAL_SHADE),
    lit([at(s1, 0), at(s1, 0, -depth), at(s1, door.h, -depth), at(s1, door.h)], across.clone().negate(), REVEAL_SHADE),
  ]
  const lintel = lit([at(s0, door.h), at(s1, door.h), at(s1, door.h, -depth), at(s0, door.h, -depth)], UP.clone().negate(), REVEAL_SHADE)
  const { step, range: stepRange } = doorStep(ctx, face, s0, s1, plaster)
  const inkFrom = ctx.outlines.arrays.positions.length / 3
  ink(ctx, owner, inkRef, [[at(s0, 0), at(s0, door.h), face.normal], [at(s0, door.h), at(s1, door.h), face.normal], [at(s1, door.h), at(s1, 0), face.normal]], seed + 1)
  const inkTo = ctx.outlines.arrays.positions.length / 3
  return { plane: { origin: face.origin.clone(), normal: face.normal.clone() }, panel, jambs, lintel, step, ink: [inkFrom, inkTo], stepRange }
}

/** A roof's edge band (S1b task 3): this deep, square to the roof plane, under its eave and its rakes. */
export const ROOF_EDGE = 0.012

/** The thatch as a slab (S1b task 2). The overhang is horizontal, beyond the front and back walls: on a pitch of about
 * 59° the plan's 0.05 dropped the thatch's edge to 0.007 above the ground on a 0.09 wall, and 0.02 keeps it near 0.057.
 * The eave's band drops `thickness` along the roof's normal, `thickness × sin(slope)` inward, so it must stay under the
 * overhang: at 0.03 it reached 0.026 and cut through the wall and the door (Fable C2). 0.02 ends 0.003 outside. `rake`
 * carries the roof past each gable. */
export const COTTAGE = { thickness: 0.02, overhang: 0.02, rake: 0.03 }

export type HouseFace = { name: string; kind: 'wall' | 'roof' | 'underside' | 'edge'; corners: Vector3[] }

/** A quad's outward normal: the side its corners' winding faces, turned up for a roof. */
function upwardNormal(corners: Vector3[]): Vector3 {
  const n = new Vector3().crossVectors(corners[1].clone().sub(corners[0]), corners[corners.length - 1].clone().sub(corners[0])).normalize()
  return n.y < 0 ? n.negate() : n
}

/** The bands under one roof plane's three free edges: [eave, rake, rake], each from its top edge down the inward normal. */
function edgeBands(top: Vector3[], depth: number, names: [string, string, string]): HouseFace[] {
  const down = upwardNormal(top).multiplyScalar(-depth)
  const band = (a: Vector3, b: Vector3, name: string): HouseFace => ({ name, kind: 'edge', corners: [a, b, b.clone().add(down), a.clone().add(down)] })
  return [band(top[0], top[1], names[0]), band(top[1], top[2], names[1]), band(top[3], top[0], names[2])]
}

/** A painting house's roof planes as `buildHouse` lays them: [eave front, eave back, ridge back, ridge front] per side. */
function houseRoofPlanes(shape: StreetShape, centre: Vector3, along: Vector3, toPath: Vector3): [string, Vector3[]][] {
  const c = (x: number, z: number, y: number) => centre.clone().addScaledVector(along, x).addScaledVector(toPath, z).setY(y)
  const { w, d, eave, pitch } = shape
  const eaveOverhang = shape.eaveOverhang ?? OVERHANG
  const ridgeF = c(0, d / 2 + OVERHANG, eave + pitch)
  const ridgeB = c(0, -d / 2 - OVERHANG, eave + pitch)
  return ([['left', -1], ['right', 1]] as const).map(([name, sideX]) => {
    const eaveY = eave - eaveOverhang * (pitch / (w / 2))
    return [name, [c(sideX * (w / 2 + eaveOverhang), d / 2 + OVERHANG, eaveY), c(sideX * (w / 2 + eaveOverhang), -d / 2 - OVERHANG, eaveY), ridgeB, ridgeF]]
  })
}

/** S1b task 3: the edge bands of a painting house's two roof planes (pure, the test's seam). */
export function houseRoofEdges(shape: StreetShape, centre: Vector3, along: Vector3, toPath: Vector3): HouseFace[] {
  return houseRoofPlanes(shape, centre, along, toPath).flatMap(([name, top]) => edgeBands(top, ROOF_EDGE, [`${name} eave`, `${name} back rake`, `${name} front rake`]))
}

export function houseSoffits(shape: StreetShape, centre: Vector3, along: Vector3, toPath: Vector3): HouseFace[] {
  if (!shape.eaveOverhang) return []
  const c = (x: number, z: number, y: number) => centre.clone().addScaledVector(along, x).addScaledVector(toPath, z).setY(y)
  const { w, d, eave } = shape
  const planes = houseRoofPlanes(shape, centre, along, toPath)
  return ([['left', -1], ['right', 1]] as const).map(([name, sideX], k) => {
    const top = planes[k][1]
    const down = upwardNormal(top).multiplyScalar(-ROOF_EDGE)
    const bandCorner2 = top[1].clone().add(down)
    const bandCorner3 = top[0].clone().add(down)
    const c0 = c(sideX * (w / 2), d / 2 + OVERHANG, eave)
    const c1 = c(sideX * (w / 2), -d / 2 - OVERHANG, eave)
    return {
      name: `${name} soffit`,
      kind: 'underside',
      corners: [c0, c1, bandCorner2, bandCorner3],
    }
  })
}

/** S1b task 2: a cottage's faces (pure, the test's seam). Its width runs along `along`, its front faces `toPath`, the
 * ridge runs along the width at the depth's middle, so the thatch slopes down toward the lane and away from it. */
export function cottageFaces(shape: StreetShape, centre: Vector3, along: Vector3, toPath: Vector3): HouseFace[] {
  const c = (x: number, z: number, y: number) => centre.clone().addScaledVector(along, x).addScaledVector(toPath, z).setY(y)
  const { w, d, eave, pitch } = shape
  const { thickness, overhang, rake } = COTTAGE
  const [hw, hd] = [w / 2, d / 2]
  const fl = c(-hw, hd, 0), fr = c(hw, hd, 0), br = c(hw, -hd, 0), bl = c(-hw, -hd, 0)
  const faces: HouseFace[] = []
  for (const [name, a, b] of [['front', fl, fr], ['right', fr, br], ['back', br, bl], ['left', bl, fl]] as const) {
    faces.push({ name, kind: 'wall', corners: [a, b, b.clone().setY(eave), a.clone().setY(eave)] })
  }
  faces.push({ name: 'right gable', kind: 'wall', corners: [fr.clone().setY(eave), br.clone().setY(eave), c(hw, 0, eave + pitch)] })
  faces.push({ name: 'left gable', kind: 'wall', corners: [bl.clone().setY(eave), fl.clone().setY(eave), c(-hw, 0, eave + pitch)] })
  // the planes continue the gables' slope past the walls, so no gap opens between a gable and the thatch
  const eaveY = eave - overhang * (pitch / hd)
  for (const [side, sz] of [['front', 1], ['back', -1]] as const) {
    const top = [c(-sz * (hw + rake), sz * (hd + overhang), eaveY), c(sz * (hw + rake), sz * (hd + overhang), eaveY), c(sz * (hw + rake), 0, eave + pitch), c(-sz * (hw + rake), 0, eave + pitch)]
    const down = upwardNormal(top).multiplyScalar(-thickness)
    faces.push({ name: `${side} roof`, kind: 'roof', corners: top })
    faces.push({ name: `${side} underside`, kind: 'underside', corners: top.map((p) => p.clone().add(down)) })
    // the back plane's corners run the other way, so its first rake is the −x one
    const [first, last] = sz > 0 ? ['right', 'left'] : ['left', 'right']
    faces.push(...edgeBands(top, thickness, [`${side} eave edge`, `${side} ${first} rake edge`, `${side} ${last} rake edge`]))
  }
  return faces
}

/** A source's mean colour, the base a face of it sits on. */
function sourceColour(ctx: Context, source: StreetSourceName): Color {
  return new Color().setRGB(...sourceUnderpaint(ctx.painting, source, 1), SRGBColorSpace)
}

function buildCottage(ctx: Context, owner: string, index: number, shape: StreetShape, centre: Vector3, along: Vector3, toPath: Vector3, lit: boolean, chimney: boolean, density = 1): void {
  const c = (x: number, z: number, y: number) => centre.clone().addScaledVector(along, x).addScaledVector(toPath, z).setY(y)
  const { w, d, eave, pitch, wallSource: wall, roofSource: roof } = shape
  const inside = centre.clone().setY(eave / 2)
  const seed = 0x5900 + index * 97
  const faces = cottageFaces(shape, centre, along, toPath)
  // one brush through the village: the walls' strokes take the street's wall reference, not the 0.09 eave, which made
  // them a third the size of a painting house's and three times as many (Fable N2, the measured street)
  const wallFaces: StreetFace[] = []
  const dark = sourceColour(ctx, roof).multiplyScalar(OPENING_DARK)
  faces.forEach((f, i) => {
    const [a, b] = f.corners
    if (f.kind === 'wall') {
      const u = b.clone().sub(a)
      const v = f.corners.length === 3 ? f.corners[2].clone().sub(a.clone().addScaledVector(u, 0.5)) : f.corners[3].clone().sub(a)
      const face = orientedFace(a, u, v, inside, { shape: f.corners.length === 3 ? 'triangle' : 'quad', kind: 'wall', source: wall, refHeight: STREET.wallRef, seed: seed + i, mirror: i % 2 === 1 })
      clad(ctx, owner, f.name, face, density)
      if (f.corners.length === 4) wallFaces.push(face)
    } else if (f.kind === 'roof') {
      const slope = f.corners[3].clone().sub(a)
      clad(ctx, owner, f.name, orientedFace(a, b.clone().sub(a), slope, inside, { shape: 'quad', kind: 'roof', source: roof, refHeight: slope.length(), seed: seed + i, mirror: f.name.startsWith('back') }), density)
    } else {
      polygon(ctx.underpaint, f.corners, dark, 255)
    }
  })
  // the ink: four corners and four along the ground, the two eaves, the four rakes and the ridge
  const edges: [Vector3, Vector3, Vector3][] = []
  wallFaces.forEach((face) => {
    const [a, b] = facePolygon(face)
    edges.push([a, a.clone().setY(eave), face.normal], [a, b, face.normal])
  })
  for (const side of ['front', 'back']) {
    const top = faces.find((f) => f.name === `${side} roof`)!.corners
    const n = upwardNormal(top)
    edges.push([top[0], top[1], n], [top[1], top[2], n], [top[3], top[0], n])
    if (side === 'front') edges.push([top[2], top[3], UP.clone()])
  }
  ink(ctx, owner, STREET.wallRef, edges, seed)
  // the door reaches most of the low wall (at 0.6 of a 0.09 eave it stood below the camera's eye), a small window beside it
  const front = wallFaces[0]
  const door = doorOf(shape, index)
  const craftParts: CraftPart[] = []
  const doorFrom = ctx.windows.positions.length / 3
  const inkFrom = ctx.outlines.arrays.positions.length / 3
  opening(ctx, front, door.cu, door.h / 2, door.w, door.h, false, seed + 11)
  const doorTo = ctx.windows.positions.length / 3
  const inkTo = ctx.outlines.arrays.positions.length / 3
  ctx.report.windows.push({ owner, lit: false })
  if (shape.craft) {
    craftParts.push({ name: 'door', buffer: 'windows', from: doorFrom, to: doorTo })
    craftParts.push({ name: 'door ink', buffer: 'outlines', from: inkFrom, to: inkTo })
  }

  const w0From = ctx.windows.positions.length / 3
  const win0 = { cu: index % 2 ? 0.74 : 0.26, cv: 0.55, w: 0.12, h: 0.3 }
  opening(ctx, front, win0.cu, win0.cv, win0.w, win0.h, lit, seed + 13)
  const w0To = ctx.windows.positions.length / 3
  ctx.report.windows.push({ owner, lit })
  if (shape.craft) {
    craftParts.push({ name: 'window 0', buffer: 'windows', from: w0From, to: w0To })
  }

  if (shape.craft) {
    const bandColour = drawFrameBand(ctx, front, door, craftParts, false)
    const [s0, s1] = [door.cu - door.w / 2, door.cu + door.w / 2]
    const { range: stepRange } = doorStep(ctx, front, s0, s1, sourceColour(ctx, front.source))
    craftParts.push({ name: 'step', buffer: 'underpaint', from: stepRange[0], to: stepRange[1] })

    drawWindowShutters(ctx, front, 0, win0, seed + 13, craftParts)

    ctx.report.craft.push({
      owner,
      index,
      front,
      inkRef: FRAME * eave,
      bandColour,
      parts: craftParts,
    })
  }
  if (chimney) {
    const foot = c(w * 0.25, -d * 0.12, eave + pitch * 0.6)
    const size = 0.035
    const box = [[0, 0], [1, 0], [1, 1], [0, 1]].map(([x, z]) => foot.clone().addScaledVector(along, x * size).addScaledVector(toPath, z * size))
    const tops = box.map((p) => p.clone().setY(eave + pitch + 0.06))
    for (let k = 0; k < 4; k++) polygon(ctx.underpaint, [box[k], box[(k + 1) % 4], tops[(k + 1) % 4], tops[k]], INK, 255)
    polygon(ctx.underpaint, tops, INK, 255)
  }
}

/** The church: the nave as a house (its door end toward the path), the belfry behind it, the spire on the belfry. */
function church(ctx: Context): StreetBuild['report']['church'] {
  const savedPaint = ctx.wallPaint
  ctx.wallLight = CHURCH_LIGHT
  ctx.wallPaint = KEPT_PAINT
  const { nave, belfry, spireTip } = STREET_CHURCH
  const along = new Vector3(Math.cos(nave.yaw), 0, Math.sin(nave.yaw))
  const toPath = new Vector3(-Math.sin(nave.yaw), 0, Math.cos(nave.yaw))
  const churchShape: StreetShape = {
    w: nave.w,
    d: nave.d,
    eave: nave.eave,
    pitch: nave.pitch,
    storeys: 1,
    wallSource: wallSource(nave.wall, 100),
    roofSource: roofSource(nave.roof, 100),
    brush: CHURCH.stroke,
    recess: CHURCH.recess,
    sideWindows: CHURCH.windows,
  }
  // the painting's church has no chimney (Fable R9)
  const built = house(ctx, 'church', 100, churchShape, new Vector3(nave.x, 0, nave.z), along, toPath, false, false)
  // heights above the street's ground, as the knot's stand above the island under the belfry
  const ground = islandHeightAt(VILLAGE_CHURCH.belfry.cx, VILLAGE_CHURCH.belfry.cz)
  const floor = -belfry.floorDrop
  const top = belfry.topY - ground
  const tipY = spireTip.y - ground
  const half = belfry.width / 2
  const bAlong = new Vector3(Math.cos(belfry.yaw), 0, Math.sin(belfry.yaw))
  const bToPath = new Vector3(-Math.sin(belfry.yaw), 0, Math.cos(belfry.yaw))
  const centre = new Vector3(belfry.cx, 0, belfry.cz)
  const corner = (x: number, z: number, y: number) => centre.clone().addScaledVector(bAlong, x).addScaledVector(bToPath, z).setY(y)
  const foot = [corner(-half, half, floor), corner(half, half, floor), corner(half, -half, floor), corner(-half, -half, floor)]
  const inside = centre.clone().setY((floor + top) / 2)
  const height = UP.clone().multiplyScalar(top - floor)
  const edges: [Vector3, Vector3, Vector3][] = []
  const tip = centre.clone().addScaledVector(bAlong, spireTip.dx).addScaledVector(bToPath, spireTip.dz).setY(tipY)
  for (let k = 0; k < 4; k++) {
    const a = foot[k]
    const b = foot[(k + 1) % 4]
    const face = orientedFace(a, b.clone().sub(a), height, inside, { shape: 'quad', kind: 'wall', source: 'plaster', refHeight: CHURCH.stroke, seed: 0x6100 + k, mirror: k % 2 === 1 })
    clad(ctx, 'belfry', `wall ${k}`, face)
    opening(ctx, face, 0.5, 0.82, 0.32, 0.2, false, 0x6110 + k)
    const at = a.clone().setY(top)
    const bt = b.clone().setY(top)
    const mid = at.clone().lerp(bt, 0.5)
    const spireInside = centre.clone().setY(top + (tipY - top) * 0.3)
    clad(ctx, 'spire', `side ${k}`, orientedFace(at, bt.clone().sub(at), tip.clone().sub(mid), spireInside, { shape: 'triangle', kind: 'wall', source: 'plaster', refHeight: CHURCH.stroke, seed: 0x6200 + k, mirror: k % 2 === 1 }))
    edges.push([at, bt, face.normal], [a, at, face.normal], [at, tip, face.normal])
  }
  ink(ctx, 'belfry', VILLAGE_CHURCH.nave.eave, edges, 0x6300)
  ctx.wallLight = STREET_LIGHT
  ctx.wallPaint = savedPaint
  return { belfryWidth: belfry.width, belfryHeight: top - floor, spireHeight: tipY - floor, ...built }
}

/** The ground in tiles about 0.6 square either side of the path, strokes across it; the path its paler strip along. */
function ground(ctx: Context): void {
  const [fx, , fz] = STREET.forward
  const forward = new Vector3(fx, 0, fz)
  const across = new Vector3(-fz, 0, fx)
  const p1 = pathPoint(1)
  const p1Along = p1[0] * fx + p1[2] * fz
  const [from, to, side] = [-0.45, p1Along + 0.75, 1.25]
  const alongTiles = Math.round((to - from) / 0.6)
  const acrossTiles = Math.round((2 * side) / 0.6)
  const tileAlong = (to - from) / alongTiles
  const tileAcross = (2 * side) / acrossTiles
  const below = new Vector3(0, -1, 0)
  let k = 0
  for (let i = 0; i < alongTiles; i++) {
    for (let j = 0; j < acrossTiles; j++) {
      const origin = forward.clone().multiplyScalar(from + i * tileAlong).addScaledVector(across, -side + j * tileAcross)
      const tileCentre = origin.clone().addScaledVector(across, tileAcross / 2).addScaledVector(forward, tileAlong / 2)
      const density = laneDistance(tileCentre.x, tileCentre.z) > DETAIL.lane ? 0.5 : 1
      clad(ctx, 'ground', `tile ${i},${j}`, orientedFace(origin, across.clone().multiplyScalar(tileAcross), forward.clone().multiplyScalar(tileAlong), below, { shape: 'quad', kind: 'ground', source: 'field', refHeight: STREET.wallRef, seed: 0x6400 + k, mirror: k % 2 === 1 }), density)
      k++
    }
  }
  // pass 3: the far ground to the horizon, in larger tiles with larger strokes (perspective shrinks them), so no unpainted
  // band shows between the ground's edge and the painted sky (stations 2 and 3 showed one at 1.95)
  const farFrom = to
  const farTo = 6
  const farSide = 2.5
  const farAlong = Math.round(farTo - farFrom)
  const farAcross = 5
  for (let i = 0; i < farAlong; i++) {
    for (let j = 0; j < farAcross; j++) {
      const a = farFrom + (i * (farTo - farFrom)) / farAlong
      const b = (2 * farSide) / farAcross
      const origin = forward.clone().multiplyScalar(a).addScaledVector(across, -farSide + j * b)
      clad(ctx, 'ground', `far ${i},${j}`, orientedFace(origin, across.clone().multiplyScalar(b), forward.clone().multiplyScalar((farTo - farFrom) / farAlong), below, { shape: 'quad', kind: 'ground', source: 'field', refHeight: STREET.wallRef * 2.5, seed: 0x6600 + i * 7 + j, mirror: (i + j) % 2 === 1 }), 0.5)
    }
  }
  // the near ground's sides beyond the houses, out to the far tiles' width
  for (const sign of [-1, 1]) {
    for (let i = 0; i < alongTiles; i++) {
      const origin = forward.clone().multiplyScalar(from + i * tileAlong).addScaledVector(across, sign > 0 ? side : -farSide)
      clad(ctx, 'ground', `side ${sign},${i}`, orientedFace(origin, across.clone().multiplyScalar(farSide - side), forward.clone().multiplyScalar(tileAlong), below, { shape: 'quad', kind: 'ground', source: 'field', refHeight: STREET.wallRef * 2, seed: 0x6700 + i * 3 + (sign > 0 ? 1 : 0), mirror: i % 2 === 0 }), 0.5)
    }
  }
  // the path, raised a hair over the ground's strokes, in segments along its bend
  // it ends at the square's near edge: the lane's end lies inside the square, and segments running on into it laid two
  // faces' strokes on one plane (Fable's note on D3)
  const width = 0.12
  const segments = 12
  const [ex, , ez] = pathPoint(1)
  const tEnd = 1 - (STREET_SQUARE.radius - Math.hypot(ex - STREET_SQUARE.x, ez - STREET_SQUARE.z)) / STREET.pathLength
  for (let s = 0; s < segments; s++) {
    const t0 = -0.2 + (s / segments) * (tEnd + 0.2)
    // the overlap 0.02 closes the joints' outer corners at 0.12 wide and runs the last base past the square's (Fable C8)
    const t1 = -0.2 + ((s + 1) / segments) * (tEnd + 0.2) + 0.02
    const p0 = new Vector3(...pathPoint(t0))
    const p1 = new Vector3(...pathPoint(t1))
    const normal = new Vector3(...pathTangent((t0 + t1) / 2)).cross(UP).normalize()
    const origin = p0.clone().addScaledVector(normal, -width / 2).setY(0.002)
    clad(ctx, 'path', `segment ${s}`, orientedFace(origin, p1.clone().sub(p0), normal.clone().multiplyScalar(width), below, { shape: 'quad', kind: 'path', source: 'field', refHeight: STREET.wallRef, seed: 0x6500 + s, mirror: s % 2 === 1 }), 1, [0, PATH_BASE_INSET])
  }
  // the square, one face: as eight triangles about its centre its strokes ran to the middle and scattered (look pass 1)
  const sqRadius = STREET_SQUARE.radius
  const sqOrigin = new Vector3(STREET_SQUARE.x, 0.002, STREET_SQUARE.z).addScaledVector(across, -sqRadius).addScaledVector(forward, -sqRadius)
  clad(ctx, 'path', 'square', orientedFace(sqOrigin, across.clone().multiplyScalar(2 * sqRadius), forward.clone().multiplyScalar(2 * sqRadius), below, { shape: 'quad', kind: 'path', source: 'field', refHeight: STREET.wallRef, seed: 0x6530, mirror: false }), 1, [PATH_BASE_INSET, PATH_BASE_INSET])
}

/**
 * The dark grass base strip along both sides of the lane (S3 task 2, S2/C3):
 * at y = 0.001, above ground underpaint (0) and below strokes (0.002). Its own arrays since S3b pass 5, for its dabs.
 */
function grassBaseStrip(ctx: Context): void {
  const tSteps = 80
  const latSteps = 4
  const BANDS = [0.052, 0.775]
  const tRange = [-0.075, 0.985]
  const dt = (tRange[1] - tRange[0]) / tSteps
  const dlat = (BANDS[1] - BANDS[0]) / latSteps

  const dark = new Color().setRGB(...sourceUnderpaint(ctx.painting, 'field', GROUND_BASE_SHARE), SRGBColorSpace)

  const pt = (t: number, lat: number, side: number): [number, number, number] => {
    const [px, , pz] = pathPoint(t)
    const [tx, , tz] = pathTangent(t)
    const n = Math.hypot(tx, tz)
    return [px + side * lat * (-tz / n), GRASS.baseY, pz + side * lat * (tx / n)]
  }

  const inSq = (p: [number, number, number]) =>
    Math.hypot(p[0] - STREET_SQUARE.x, p[2] - STREET_SQUARE.z) <= STREET_SQUARE.radius

  for (const side of [-1, 1]) {
    for (let i = 0; i < tSteps; i++) {
      const t0 = tRange[0] + i * dt
      const t1 = tRange[0] + (i + 1) * dt
      for (let j = 0; j < latSteps; j++) {
        const l0 = BANDS[0] + j * dlat
        const l1 = BANDS[0] + (j + 1) * dlat

        const p0 = pt(t0, l0, side)
        const p1 = pt(t1, l0, side)
        const p2 = pt(t1, l1, side)
        const p3 = pt(t0, l1, side)

        if (inSq(p0) && inSq(p1) && inSq(p2) && inSq(p3)) continue

        const start = ctx.grassBase.positions.length / 3
        const verts = [p0, p1, p2, p3]
        for (let v = 0; v < 4; v++) {
          ctx.grassBase.positions.push(...verts[v])
          ctx.grassBase.colors.push(dark.r, dark.g, dark.b)
          ctx.grassBase.cls.push(3)
          ctx.grassBase.src.push(255)
        }
        const ccw1 = (p1[0] - p0[0]) * (p2[2] - p0[2]) - (p1[2] - p0[2]) * (p2[0] - p0[0])
        const ccw2 = (p2[0] - p0[0]) * (p3[2] - p0[2]) - (p2[2] - p0[2]) * (p3[0] - p0[0])
        if (ccw1 * ccw2 > 0) {
          ctx.grassBase.indices.push(start, start + 1, start + 2, start, start + 2, start + 3)
        } else {
          ctx.grassBase.indices.push(start, start + 1, start + 3, start + 1, start + 2, start + 3)
        }
      }
    }
  }
}

function laneWalls(ctx: Context): void {
  const H = STREET_WALL.height
  const { courses, rows, length, draw, joint, width, base, pale, source } = LANE_CRAFT.wall
  const src = SOURCE_CLASSES[source]
  const baseColorRGB = sourceUnderpaint(ctx.painting, source, base)
  const baseColor = new Color().setRGB(...baseColorRGB, SRGBColorSpace)

  const speed = (t: number, lat: number) => {
    const p1 = laneAt(t + 1e-4, lat)
    const p0 = laneAt(t - 1e-4, lat)
    return Math.hypot(p1.x - p0.x, p1.z - p0.z) / 2e-4
  }

  for (const run of STREET_WALLS) {
    const side = run.side
    const t0 = run.t0
    const t1 = run.t1
    const n = Math.ceil((t1 - t0) / STREET_WALL.segment)
    const dt = (t1 - t0) / n

    const underpaintStart = ctx.underpaint.positions.length / 3
    const strokesStart = ctx.strokes.arrays.positions.length / 3

    const segments: { t0: number; t1: number; corners: Vector3[] }[] = []

    for (let i = 0; i < n; i++) {
      const ta = t0 + i * dt
      const tb = t0 + (i + 1) * dt
      const q0 = laneAt(ta, side * STREET_WALL.inner)
      const q1 = laneAt(tb, side * STREET_WALL.inner)
      const q2 = laneAt(tb, side * (STREET_WALL.inner + STREET_WALL.thickness))
      const q3 = laneAt(ta, side * (STREET_WALL.inner + STREET_WALL.thickness))

      const corners = [
        new Vector3(q0.x, 0, q0.z),
        new Vector3(q1.x, 0, q1.z),
        new Vector3(q2.x, 0, q2.z),
        new Vector3(q3.x, 0, q3.z),
      ]
      segments.push({ t0: ta, t1: tb, corners })

      // Lane face
      const p0 = new Vector3(q0.x, 0, q0.z)
      const p1 = new Vector3(q1.x, 0, q1.z)
      const p2 = new Vector3(q1.x, H, q1.z)
      const p3 = new Vector3(q0.x, H, q0.z)
      const midT = (ta + tb) / 2
      const midPt = laneAt(midT, side * STREET_WALL.inner)
      const nLane = new Vector3(-side * midPt.nx, 0, -side * midPt.nz)

      const faceLane: StreetFace = {
        origin: p0,
        u: p1.clone().sub(p0),
        v: new Vector3(0, H, 0),
        normal: nLane,
        shape: 'quad',
        kind: 'wall',
        source,
        refHeight: H,
        seed: 0x4100 + i * 17,
        mirror: false,
      }
      const lightLane = lightOf(faceLane, ctx.lit, ctx.wallLight)
      const litColourLane = baseColor.clone().multiplyScalar(lightLane)
      const fromLane = ctx.underpaint.positions.length
      polygon(ctx.underpaint, [p0, p1, p2, p3], litColourLane, 0, src)
      shadeNew(ctx.underpaint, fromLane, faceLane, ctx.lit)

      // Top face
      const pTop0 = new Vector3(q0.x, H, q0.z)
      const pTop1 = new Vector3(q1.x, H, q1.z)
      const pTop2 = new Vector3(q2.x, H, q2.z)
      const pTop3 = new Vector3(q3.x, H, q3.z)
      const nTop = new Vector3(0, 1, 0)

      const faceTop: StreetFace = {
        origin: pTop0,
        u: pTop1.clone().sub(pTop0),
        v: pTop3.clone().sub(pTop0),
        normal: nTop,
        shape: 'quad',
        kind: 'wall',
        source,
        refHeight: H,
        seed: 0x4200 + i * 17,
        mirror: false,
      }
      const lightTop = lightOf(faceTop, ctx.lit, ctx.wallLight)
      const litColourTop = baseColor.clone().multiplyScalar(lightTop)
      const fromTop = ctx.underpaint.positions.length
      polygon(ctx.underpaint, [pTop0, pTop1, pTop2, pTop3], litColourTop, 0, src)
      shadeNew(ctx.underpaint, fromTop, faceTop, ctx.lit)

      // Back face
      const pBack0 = new Vector3(q3.x, 0, q3.z)
      const pBack1 = new Vector3(q2.x, 0, q2.z)
      const pBack2 = new Vector3(q2.x, H, q2.z)
      const pBack3 = new Vector3(q3.x, H, q3.z)
      const nBack = new Vector3(side * midPt.nx, 0, side * midPt.nz)

      const faceBack: StreetFace = {
        origin: pBack0,
        u: pBack1.clone().sub(pBack0),
        v: new Vector3(0, H, 0),
        normal: nBack,
        shape: 'quad',
        kind: 'wall',
        source,
        refHeight: H,
        seed: 0x4300 + i * 17,
        mirror: false,
      }
      const lightBack = lightOf(faceBack, ctx.lit, ctx.wallLight)
      const litColourBack = baseColor.clone().multiplyScalar(lightBack)
      const fromBack = ctx.underpaint.positions.length
      polygon(ctx.underpaint, [pBack0, pBack1, pBack2, pBack3], litColourBack, 0, src)
      shadeNew(ctx.underpaint, fromBack, faceBack, ctx.lit)

      // Start cap at t0
      if (i === 0) {
        const cStart0 = new Vector3(q0.x, 0, q0.z)
        const cStart1 = new Vector3(q3.x, 0, q3.z)
        const cStart2 = new Vector3(q3.x, H, q3.z)
        const cStart3 = new Vector3(q0.x, H, q0.z)
        const tan0 = pathTangent(t0)
        const nCap0 = new Vector3(-tan0[0], 0, -tan0[2]).normalize()
        const faceCap0: StreetFace = {
          origin: cStart0,
          u: cStart1.clone().sub(cStart0),
          v: new Vector3(0, H, 0),
          normal: nCap0,
          shape: 'quad',
          kind: 'wall',
          source,
          refHeight: H,
          seed: 0x4400,
          mirror: false,
        }
        const lightCap0 = lightOf(faceCap0, ctx.lit, ctx.wallLight)
        const fromCap0 = ctx.underpaint.positions.length
        polygon(ctx.underpaint, [cStart0, cStart1, cStart2, cStart3], baseColor.clone().multiplyScalar(lightCap0), 0, src)
        shadeNew(ctx.underpaint, fromCap0, faceCap0, ctx.lit)
      }

      // End cap at t1
      if (i === n - 1) {
        const cEnd0 = new Vector3(q1.x, 0, q1.z)
        const cEnd1 = new Vector3(q2.x, 0, q2.z)
        const cEnd2 = new Vector3(q2.x, H, q2.z)
        const cEnd3 = new Vector3(q1.x, H, q1.z)
        const tan1 = pathTangent(t1)
        const nCap1 = new Vector3(tan1[0], 0, tan1[2]).normalize()
        const faceCap1: StreetFace = {
          origin: cEnd0,
          u: cEnd1.clone().sub(cEnd0),
          v: new Vector3(0, H, 0),
          normal: nCap1,
          shape: 'quad',
          kind: 'wall',
          source,
          refHeight: H,
          seed: 0x4500,
          mirror: false,
        }
        const lightCap1 = lightOf(faceCap1, ctx.lit, ctx.wallLight)
        const fromCap1 = ctx.underpaint.positions.length
        polygon(ctx.underpaint, [cEnd0, cEnd1, cEnd2, cEnd3], baseColor.clone().multiplyScalar(lightCap1), 0, src)
        shadeNew(ctx.underpaint, fromCap1, faceCap1, ctx.lit)
      }
    }

    // Now dabs
    const dabs: { face: 'lane' | 'top' | 'cap'; t: number; lateral: number; y: number; length: number; width: number }[] = []
    const wallStrokes: FaceStrokes = {
      arrays: makeBrushArrays(),
      stroke: [],
      seed: [],
      ribbons: 0,
    }
    const [x0, y0, x1, y1] = STREET_SOURCES[source]
    const sx = ctx.painting.width / 1600
    const sy = ctx.painting.height / 1267
    const luminances: number[] = []
    const startX = Math.floor(x0 * sx)
    const endX = Math.ceil(x1 * sx)
    const startY = Math.floor(y0 * sy)
    const endY = Math.ceil(y1 * sy)
    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const i = (y * ctx.painting.width + x) * 4
        const r = ctx.painting.data[i] / 255
        const g = ctx.painting.data[i + 1] / 255
        const b = ctx.painting.data[i + 2] / 255
        luminances.push(0.2126 * r + 0.7152 * g + 0.0722 * b)
      }
    }
    luminances.sort((a, b) => a - b)
    const floor = luminances[Math.floor(luminances.length * (1 - pale))]

    // D3.1. runOf(lat) is the run's world length: 64 midpoint samples of speed(t, lat) over [t0, t1], summed with their dt
    const runOf = (lat: number) => {
      let w = 0
      const N = 64
      for (let k = 0; k < N; k++) w += speed(t0 + ((k + 0.5) * (t1 - t0)) / N, lat) * ((t1 - t0) / N)
      return w
    }

    // D3.2. planCourse(rng, W) draws stone lengths H * (draw[0] + (draw[1] - draw[0]) * rng()) until their sum reaches W * joint.
    // If dropping the last one lands nearer W * joint than keeping it, drop it (never below one stone).
    // Scale every length by W * joint / sum, then clamp each to [length[0] * H, length[1] * H].
    const planCourse = (rng: () => number, W: number) => {
      const lens: number[] = []
      let sum = 0
      while (sum < W * joint) {
        const L = H * (draw[0] + (draw[1] - draw[0]) * rng())
        lens.push(L)
        sum += L
      }
      if (lens.length > 1 && sum - W * joint > W * joint - (sum - lens[lens.length - 1])) sum -= lens.pop()!
      const k = (W * joint) / sum
      return lens.map((L) => Math.min(Math.max(L * k, length[0] * H), length[1] * H))
    }

    // D3.4. The colour pick (the texel from the source box, eight retries under floor) moves into one pickStone(rng) closure
    const pickStone = (rng: () => number) => {
      let uTex = (x0 + rng() * (x1 - x0)) / ctx.painting.width
      let vTex = (y0 + rng() * (y1 - y0)) / ctx.painting.height
      let rgb = sampleColour(ctx.painting, uTex, vTex)
      let lum = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]
      for (let retry = 0; retry < 8 && lum < floor; retry++) {
        uTex = (x0 + rng() * (x1 - x0)) / ctx.painting.width
        vTex = (y0 + rng() * (y1 - y0)) / ctx.painting.height
        rgb = sampleColour(ctx.painting, uTex, vTex)
        lum = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]
      }
      return new Color().setRGB(rgb[0], rgb[1], rgb[2], SRGBColorSpace)
    }

    // D3. One routine lays a course. The four lane courses and the two top rows call it.
    // Arguments: the lateral, the height y, the across vector, the normal, the seed base, the face name ('lane' | 'top')
    const layCourse = (
      lat: number,
      y: number,
      across: Vector3 | ((ptMid: { nx: number; nz: number }) => Vector3),
      normal: Vector3 | ((ptMid: { nx: number; nz: number }) => Vector3),
      seedBase: number,
      faceName: 'lane' | 'top',
    ) => {
      const dabWidth = width * H
      const rng = mulberry32(seedBase)
      const lens = planCourse(rng, runOf(lat))
      let tCurr = t0

      for (let si = 0; si < lens.length; si++) {
        const sp = speed(tCurr, lat)
        // D3.3. The last stone's length is (t1 - tCurr) * speed(tCurr, lat) * joint clamped to [length[0] * H, length[1] * H],
        // so the course ends at the wall head whatever the walk's curvature error.
        const L = si === lens.length - 1 ? Math.min(Math.max((t1 - tCurr) * sp * joint, length[0] * H), length[1] * H) : lens[si]
        const cell = L / joint
        const dtCell = cell / sp

        const tMid = tCurr + dtCell / 2
        let dt0 = L / 2 / speed(tMid, lat)
        let dt2 = L / 2 / speed(tMid, lat)
        const ptMid = laneAt(tMid, lat)
        const tangent = new Vector3(ptMid.nz, 0, -ptMid.nx)

        for (let iter = 0; iter < 4; iter++) {
          const c0 = laneAt(tMid - dt0, lat)
          const c2 = laneAt(tMid + dt2, lat)
          const dot0 = (ptMid.x - c0.x) * tangent.x + (ptMid.z - c0.z) * tangent.z
          const dot2 = (c2.x - ptMid.x) * tangent.x + (c2.z - ptMid.z) * tangent.z
          dt0 += (L / 2 - dot0) / speed(tMid - dt0, lat)
          dt2 += (L / 2 - dot2) / speed(tMid + dt2, lat)
        }

        const pt0 = laneAt(tMid - dt0, lat)
        const pt2 = laneAt(tMid + dt2, lat)
        const p0 = new Vector3(pt0.x, y, pt0.z)
        const p1 = new Vector3(ptMid.x, y, ptMid.z)
        const p2 = new Vector3(pt2.x, y, pt2.z)

        const acr = typeof across === 'function' ? across(ptMid) : across
        const norm = typeof normal === 'function' ? normal(ptMid) : normal

        const col = pickStone(rng)
        const dabFace: StreetFace = {
          origin: p1,
          u: acr,
          v: norm,
          normal: norm,
          shape: 'quad',
          kind: 'wall',
          source,
          refHeight: H,
          seed: 0,
          mirror: false,
        }
        col.multiplyScalar(lightOf(dabFace, ctx.lit, ctx.wallLight))

        stoneDab(wallStrokes, [p0, p1, p2], acr, dabWidth, col, Math.round(rng() * 10000))
        // the report carries the emitted length, the endpoints' projection on the tangent: one dab of 224 straddles a lane
        // kink, where the offset curve jumps, and is drawn 0.0022 longer than L (the Lead's gate on the fix round)
        dabs.push({ face: faceName, t: tMid, lateral: lat, y, length: Math.abs((pt2.x - pt0.x) * tangent.x + (pt2.z - pt0.z) * tangent.z), width: dabWidth })

        tCurr += dtCell
      }
    }

    // courses on lane face: each course is planned as stones that fill its run flush to both wall heads (pass 5)
    for (let c = 0; c < courses; c++) {
      const courseY = (c + 0.5) * (H / courses)
      const lat = side * (STREET_WALL.inner - STROKE_LIFT)
      const seedBase = 0x5100 + (side === -1 ? 0 : 50) + c * 31 + Math.round(t0 * 100)
      layCourse(
        lat,
        courseY,
        new Vector3(0, 1, 0),
        (ptMid) => new Vector3(-side * ptMid.nx, 0, -side * ptMid.nz),
        seedBase,
        'lane',
      )
    }

    // the wall heads: a stone per course on each cap face, the shortest measured length across the thickness (pass 5 D4)
    for (const [tCap, sign, seedBase] of [[t0, -1, 0x7100], [t1, 1, 0x7200]] as const) {
      const tan = pathTangent(tCap)
      const nCap = new Vector3(sign * tan[0], 0, sign * tan[2]).normalize()
      const qa = laneAt(tCap, side * STREET_WALL.inner)
      const qb = laneAt(tCap, side * (STREET_WALL.inner + STREET_WALL.thickness))
      const along = new Vector3(qb.x - qa.x, 0, qb.z - qa.z).normalize()
      const rng = mulberry32(seedBase + (side === -1 ? 0 : 50) + Math.round(t0 * 100))
      const L = length[0] * H
      for (let c = 0; c < courses; c++) {
        const courseY = (c + 0.5) * (H / courses)
        const centre = new Vector3((qa.x + qb.x) / 2, courseY, (qa.z + qb.z) / 2).addScaledVector(nCap, STROKE_LIFT)
        const p0 = centre.clone().addScaledVector(along, -L / 2)
        const p2 = centre.clone().addScaledVector(along, L / 2)
        const col = pickStone(rng)
        const capFace: StreetFace = { origin: centre, u: new Vector3(0, 1, 0), v: nCap, normal: nCap, shape: 'quad', kind: 'wall', source, refHeight: H, seed: 0, mirror: false }
        col.multiplyScalar(lightOf(capFace, ctx.lit, ctx.wallLight))
        stoneDab(wallStrokes, [p0, centre, p2], new Vector3(0, 1, 0), width * H, col, Math.round(rng() * 10000))
        dabs.push({ face: 'cap', t: tCap, lateral: side * (STREET_WALL.inner + STREET_WALL.thickness / 2), y: courseY, length: L, width: width * H })
      }
    }

    // rows on top
    for (let r = 0; r < rows; r++) {
      const lat = side * (STREET_WALL.inner + ((r + 0.5) / rows) * STREET_WALL.thickness)
      const rowY = H + STROKE_LIFT
      const seedBase = 0x6100 + (side === -1 ? 0 : 50) + r * 31 + Math.round(t0 * 100)
      layCourse(
        lat,
        rowY,
        (ptMid) => new Vector3(side * ptMid.nx, 0, side * ptMid.nz),
        new Vector3(0, 1, 0),
        seedBase,
        'top',
      )
    }

    append(ctx.strokes, wallStrokes, 0, src)
    ctx.ribbons += wallStrokes.ribbons

    const underpaintEnd = ctx.underpaint.positions.length / 3
    const strokesEnd = ctx.strokes.arrays.positions.length / 3

    ctx.report.lane.walls.push({
      side,
      t0,
      t1,
      segments,
      underpaint: [underpaintStart, underpaintEnd],
      strokes: [strokesStart, strokesEnd],
      dabs,
    })
  }
}

function gardenRail(ctx: Context): void {
  const l2Index = STREET_HOUSES.findIndex((h) => h.id === STREET_RAIL.house)
  const h = STREET_HOUSES[l2Index]
  const f = doorStepFrame(h, l2Index)
  const door = doorOf(h, l2Index)
  const W = h.w
  const g = door.w * W + STREET_RAIL.gap
  const a0 = door.cu * W - g / 2
  const a1 = door.cu * W + g / 2

  const point = (a: number, k: number): Vector3 =>
    new Vector3(f.ox + a * f.ux + k * f.nx, 0, f.oz + a * f.uz + k * f.nz)

  const chains: [number, number][][] = [
    [[-STREET_RAIL.margin, STREET_RAIL.back], [-STREET_RAIL.margin, STREET_RAIL.depth]],
    [[-STREET_RAIL.margin, STREET_RAIL.depth], [a0, STREET_RAIL.depth]],
    [[a1, STREET_RAIL.depth], [W + STREET_RAIL.margin, STREET_RAIL.depth]],
    [[W + STREET_RAIL.margin, STREET_RAIL.depth], [W + STREET_RAIL.margin, STREET_RAIL.back]],
  ]

  const posts: Vector3[] = []
  const spans: [Vector3, Vector3][] = []

  for (const [start, end] of chains) {
    const len = Math.hypot(end[0] - start[0], end[1] - start[1])
    const num = Math.ceil(len / LANE_CRAFT.rail.spacing)
    for (let i = 0; i <= num; i++) {
      const a = start[0] + ((end[0] - start[0]) * i) / num
      const k = start[1] + ((end[1] - start[1]) * i) / num
      const p = point(a, k)
      if (!posts.some((q) => q.distanceTo(p) < 1e-9)) {
        posts.push(p)
      }
    }
    for (let i = 0; i < num; i++) {
      const pA = point(start[0] + ((end[0] - start[0]) * i) / num, start[1] + ((end[1] - start[1]) * i) / num)
      const pB = point(start[0] + ((end[0] - start[0]) * (i + 1)) / num, start[1] + ((end[1] - start[1]) * (i + 1)) / num)
      spans.push([pA, pB])
    }
  }

  const gp0 = point(a0, STREET_RAIL.depth)
  const gp1 = point(a1, STREET_RAIL.depth)

  const underpaintStart = ctx.underpaint.positions.length / 3
  const baseColorRGB = sourceUnderpaint(ctx.painting, 'thatch', 1)
  const baseColor = new Color().setRGB(...baseColorRGB, SRGBColorSpace)

  const addQuad = (corners: [Vector3, Vector3, Vector3, Vector3], normal: Vector3, refHeight: number, seed: number) => {
    const face: StreetFace = {
      origin: corners[0],
      u: corners[1].clone().sub(corners[0]),
      v: corners[3].clone().sub(corners[0]),
      normal,
      shape: 'quad',
      kind: 'wall',
      source: 'thatch',
      refHeight,
      seed,
      mirror: false,
    }
    const light = lightOf(face, ctx.lit, ctx.wallLight)
    const litColour = baseColor.clone().multiplyScalar(light)
    const from = ctx.underpaint.positions.length
    polygon(ctx.underpaint, corners, litColour, 0, 255)
    shadeNew(ctx.underpaint, from, face, ctx.lit)
  }

  // Posts: 0.005 square, 0.05 high, with top
  const postSize = LANE_CRAFT.rail.post
  const postH = LANE_CRAFT.rail.height
  const hp = postSize / 2
  const uVec = new Vector3(f.ux, 0, f.uz)
  const nVec = new Vector3(f.nx, 0, f.nz)

  posts.forEach((foot, pi) => {
    const c0 = foot.clone().addScaledVector(uVec, -hp).addScaledVector(nVec, -hp)
    const c1 = foot.clone().addScaledVector(uVec, hp).addScaledVector(nVec, -hp)
    const c2 = foot.clone().addScaledVector(uVec, hp).addScaledVector(nVec, hp)
    const c3 = foot.clone().addScaledVector(uVec, -hp).addScaledVector(nVec, hp)

    const c0T = c0.clone().setY(postH)
    const c1T = c1.clone().setY(postH)
    const c2T = c2.clone().setY(postH)
    const c3T = c3.clone().setY(postH)

    const seed = 0x6100 + pi * 13
    addQuad([c0, c1, c1T, c0T], nVec.clone().negate(), postH, seed)
    addQuad([c1, c2, c2T, c1T], uVec.clone(), postH, seed + 1)
    addQuad([c2, c3, c3T, c2T], nVec.clone(), postH, seed + 2)
    addQuad([c3, c0, c0T, c3T], uVec.clone().negate(), postH, seed + 3)
    addQuad([c0T, c1T, c2T, c3T], UP, postSize, seed + 4)
  })

  // Rails: 2 rails per span, centres at y 0.02 and 0.042, box 0.004 square
  const barSize = LANE_CRAFT.rail.bar
  const hb = barSize / 2
  const railYs = LANE_CRAFT.rail.rails

  spans.forEach(([pA, pB], si) => {
    const dir = pB.clone().sub(pA).normalize()
    const across = new Vector3(-dir.z, 0, dir.x)

    railYs.forEach((cy, ri) => {
      const y0 = cy - hb
      const y1 = cy + hb
      const a0 = pA.clone().addScaledVector(across, -hb).setY(y0)
      const a1 = pA.clone().addScaledVector(across, hb).setY(y0)
      const b0 = pB.clone().addScaledVector(across, -hb).setY(y0)
      const b1 = pB.clone().addScaledVector(across, hb).setY(y0)

      const a0T = a0.clone().setY(y1)
      const a1T = a1.clone().setY(y1)
      const b0T = b0.clone().setY(y1)
      const b1T = b1.clone().setY(y1)

      const seed = 0x6200 + si * 23 + ri * 7
      addQuad([a0, b0, b0T, a0T], across.clone().negate(), barSize, seed)
      addQuad([b1, a1, a1T, b1T], across.clone(), barSize, seed + 1)
      addQuad([a0T, b0T, b1T, a1T], UP, barSize, seed + 2)
      addQuad([b0, a0, a1, b1], UP.clone().negate(), barSize, seed + 3)
    })
  })

  ctx.report.lane.rail = {
    house: 'L2',
    posts,
    opening: [gp0, gp1],
    underpaint: [underpaintStart, ctx.underpaint.positions.length / 3],
  }
}

function laneLamps(ctx: Context): void {
  const windowLitRGB = sourceUnderpaint(ctx.painting, 'windowLit', 1)
  const windowLitColor = new Color().setRGB(...windowLitRGB, SRGBColorSpace)

  const postH = LANE_CRAFT.lamp.height
  const postSize = LANE_CRAFT.lamp.post
  const hp = postSize / 2

  const [lanternW, lanternH] = LANE_CRAFT.lamp.lantern
  const hl = lanternW / 2

  const [capW, capH] = LANE_CRAFT.lamp.cap
  const hc = capW / 2

  for (let i = 0; i < STREET_LAMPS.length; i++) {
    const lamp = STREET_LAMPS[i]
    const foot = laneAt(lamp.t, lamp.lateral)
    const pFoot = new Vector3(foot.x, 0, foot.z)
    const nVec = new Vector3(foot.nx, 0, foot.nz)
    const tVec = new Vector3(foot.nz, 0, -foot.nx)

    const underpaintStart = ctx.underpaint.positions.length / 3

    // Post: box 0.004 square, 0.13 high, in INK, class 0, src 255
    const c0 = pFoot.clone().addScaledVector(tVec, -hp).addScaledVector(nVec, -hp)
    const c1 = pFoot.clone().addScaledVector(tVec, hp).addScaledVector(nVec, -hp)
    const c2 = pFoot.clone().addScaledVector(tVec, hp).addScaledVector(nVec, hp)
    const c3 = pFoot.clone().addScaledVector(tVec, -hp).addScaledVector(nVec, hp)

    const c0T = c0.clone().setY(postH)
    const c1T = c1.clone().setY(postH)
    const c2T = c2.clone().setY(postH)
    const c3T = c3.clone().setY(postH)

    const postQuads: [Vector3[], Vector3][] = [
      [[c0, c1, c1T, c0T], nVec.clone().negate()],
      [[c1, c2, c2T, c1T], tVec.clone()],
      [[c2, c3, c3T, c2T], nVec.clone()],
      [[c3, c0, c0T, c3T], tVec.clone().negate()],
    ]

    for (let q = 0; q < 4; q++) {
      const [corners, normal] = postQuads[q]
      const face: StreetFace = {
        origin: corners[0],
        u: corners[1].clone().sub(corners[0]),
        v: corners[3].clone().sub(corners[0]),
        normal,
        shape: 'quad',
        kind: 'wall',
        source: 'wallA',
        refHeight: postH,
        seed: 0x7100 + i * 23 + q * 7,
        mirror: false,
      }
      const light = lightOf(face, ctx.lit, ctx.wallLight)
      const litColour = INK.clone().multiplyScalar(light)
      const from = ctx.underpaint.positions.length
      polygon(ctx.underpaint, corners, litColour, 0, 255)
      shadeNew(ctx.underpaint, from, face, ctx.lit)
    }

    // Lantern: box 0.012 square, 0.016 high on post's top, centre at y postH + lanternH / 2 (0.138 at defaults)
    // Four sides in windowLit mean, unlit, class 2, src 255
    const l0 = pFoot.clone().addScaledVector(tVec, -hl).addScaledVector(nVec, -hl).setY(postH)
    const l1 = pFoot.clone().addScaledVector(tVec, hl).addScaledVector(nVec, -hl).setY(postH)
    const l2 = pFoot.clone().addScaledVector(tVec, hl).addScaledVector(nVec, hl).setY(postH)
    const l3 = pFoot.clone().addScaledVector(tVec, -hl).addScaledVector(nVec, hl).setY(postH)

    const l0T = l0.clone().setY(postH + lanternH)
    const l1T = l1.clone().setY(postH + lanternH)
    const l2T = l2.clone().setY(postH + lanternH)
    const l3T = l3.clone().setY(postH + lanternH)

    const lanternSides = [
      [l0, l1, l1T, l0T],
      [l1, l2, l2T, l1T],
      [l2, l3, l3T, l2T],
      [l3, l0, l0T, l3T],
    ]

    for (const quad of lanternSides) {
      polygon(ctx.underpaint, quad, windowLitColor, 2, 255)
    }

    // Cap: pyramid 0.016 square and 0.008 high in INK, class 0, src 255
    const capBaseY = postH + lanternH
    const b0 = pFoot.clone().addScaledVector(tVec, -hc).addScaledVector(nVec, -hc).setY(capBaseY)
    const b1 = pFoot.clone().addScaledVector(tVec, hc).addScaledVector(nVec, -hc).setY(capBaseY)
    const b2 = pFoot.clone().addScaledVector(tVec, hc).addScaledVector(nVec, hc).setY(capBaseY)
    const b3 = pFoot.clone().addScaledVector(tVec, -hc).addScaledVector(nVec, hc).setY(capBaseY)
    const apex = pFoot.clone().setY(capBaseY + capH)

    const capTris = [
      [b1, b0, apex],
      [b2, b1, apex],
      [b3, b2, apex],
      [b0, b3, apex],
    ]

    for (let ct = 0; ct < 4; ct++) {
      const tri = capTris[ct]
      const uEdge = tri[1].clone().sub(tri[0])
      const vEdge = tri[2].clone().sub(tri[0])
      const normal = uEdge.clone().cross(vEdge).normalize()
      const face: StreetFace = {
        origin: tri[0],
        u: uEdge,
        v: vEdge,
        normal,
        shape: 'triangle',
        kind: 'wall',
        source: 'wallA',
        refHeight: capH,
        seed: 0x7300 + i * 23 + ct * 7,
        mirror: false,
      }
      const light = lightOf(face, ctx.lit, ctx.wallLight)
      const litColour = INK.clone().multiplyScalar(light)
      const from = ctx.underpaint.positions.length
      polygon(ctx.underpaint, tri, litColour, 0, 255)
      shadeNew(ctx.underpaint, from, face, ctx.lit)
    }

    const underpaintEnd = ctx.underpaint.positions.length / 3
    const lanternCenter = pFoot.clone().setY(LANE_CRAFT.lamp.height + LANE_CRAFT.lamp.lantern[1] / 2)

    ctx.report.lane.lamps.push({
      foot: pFoot,
      lantern: lanternCenter,
      underpaint: [underpaintStart, underpaintEnd],
    })
  }
}

export function buildStreet(painting: ImageData2D | null, flow: ImageData2D | null, masses: BakedMass[] | null, { lit = true, grass = false, paint = WALL_PAINT, lane = true }: { lit?: boolean; grass?: boolean; paint?: WallPaint; lane?: boolean } = {}): StreetBuild | null {
  if (!painting || !flow || !masses) return null
  const ctx: Context = {
    flow,
    painting,
    underpaint: Object.assign(makeBrushArrays(), { cls: [], src: [] }),
    strokes: { arrays: makeBrushArrays(), stroke: [], seed: [], cls: [], src: [] },
    ground: { arrays: makeBrushArrays(), stroke: [], seed: [], cls: [], src: [] },
    outlines: { arrays: makeBrushArrays(), stroke: [], seed: [], cls: [], src: [] },
    windows: Object.assign(makeBrushArrays(), { cls: [], src: [] }),
    grassBase: Object.assign(makeBrushArrays(), { cls: [], src: [] }),
    report: { faces: [], outlines: [], windows: [], church: { belfryWidth: 0, belfryHeight: 0, spireHeight: 0 }, craft: [], lane: { walls: [], rail: null, lamps: [] } },
    ribbons: 0,
    lit,
    wallLight: STREET_LIGHT,
    wallPaint: paint,
  }
  ground(ctx)
  if (grass) {
    const pos = ctx.ground.arrays.positions
    const oldIdx = ctx.ground.arrays.indices
    const cls = ctx.ground.cls
    const newIdx: number[] = []
    const footprintCache = new Uint8Array(pos.length / 3)
    const checkFootprint = (v: number): boolean => {
      let state = footprintCache[v]
      if (state === 0) {
        state = inFootprint(pos[v * 3], pos[v * 3 + 2]) ? 2 : 1
        footprintCache[v] = state
      }
      return state === 2
    }
    for (let i = 0; i < oldIdx.length; i += 3) {
      const i0 = oldIdx[i], i1 = oldIdx[i + 1], i2 = oldIdx[i + 2]
      if (
        cls[i0] === 3 &&
        checkFootprint(i0) &&
        checkFootprint(i1) &&
        checkFootprint(i2)
      ) {
        // dropped
      } else {
        newIdx.push(i0, i1, i2)
      }
    }
    ctx.ground.arrays.indices = newIdx
    grassBaseStrip(ctx)
  }
  STREET_HOUSES.forEach((h, index) => {
    const { along, toPath } = houseFrame(h)
    const density = detailOf(h.x, h.z)
    const shape = craftShape(h)
    ;(h.type === 'cottage' ? cottage : house)(ctx, `house-${index}`, index, shape, new Vector3(h.x, 0, h.z), along, toPath, h.lit, h.chimney, density)
  })
  ctx.report.church = church(ctx)
  if (lane) {
    laneWalls(ctx)
    gardenRail(ctx)
    laneLamps(ctx)
  }
  const trees = buildStreetTrees(painting, STREET_TREES)
  const triangles = (ctx.underpaint.indices.length + ctx.grassBase.indices.length + ctx.strokes.arrays.indices.length + ctx.ground.arrays.indices.length + ctx.outlines.arrays.indices.length + ctx.windows.indices.length + trees.solid.indices.length + trees.strokes.indices.length) / 3
  return {
    underpaint: ctx.underpaint,
    strokes: ctx.strokes,
    ground: ctx.ground,
    outlines: ctx.outlines,
    windows: ctx.windows,
    grassBase: ctx.grassBase,
    trees,
    counts: { ribbons: ctx.ribbons, triangles, builds: 0 },
    report: ctx.report,
  }
}

/** G4b's view of the flat panel: the camera square on the board, the five pieces in two rows. */
export const FLAT_VIEW = { position: [0.8, 0.285, 1.9] as [number, number, number], target: [0.8, 0.285, 0] as [number, number, number], fov: 30 }

/**
 * S3 task 1: a row of grass clumps standing in front of the board, 0.45 from `FLAT_VIEW`'s camera, so a blade is about
 * 90 px tall in a desktop capture (the painting's bush strokes are 60–70 px long at 1:1), on a card in the field's
 * darkest fifth (the dark base the street lays under the grass). Each blade is drawn as the shader will draw it at
 * that distance, widened by `max(1, d / widenFrom)`. The clumps' heights span the tuft rule's range, short to tall.
 */
function flatGrassStrip(ctx: Context): void {
  const [cx, , cz] = FLAT_VIEW.position
  const y = 0.2
  const z = 1.45
  const dark = new Color().setRGB(...sourceUnderpaint(ctx.painting, 'field', GROUND_BASE_SHARE), SRGBColorSpace)
  polygon(ctx.underpaint, [new Vector3(0.56, 0.17, z - 0.05), new Vector3(1.04, 0.17, z - 0.05), new Vector3(1.04, 0.33, z - 0.05), new Vector3(0.56, 0.33, z - 0.05)], dark, 255)
  const rand = mulberry32(1)
  const template = bladeTemplate()
  const g = ctx.ground
  for (let k = 0; k < 7; k++) {
    for (const b of clump(rand, ctx.painting, 0.62 + 0.06 * k, z, GRASS_BLADE.height * (0.5 + (1.05 * k) / 6))) {
      const d = Math.hypot(cx - b.x, cz - b.z)
      const right: [number, number] = [(cz - b.z) / d, -(cx - b.x) / d]
      const widen = Math.max(1, d / GRASS_BLADE.widenFrom)
      const base = g.arrays.positions.length / 3
      for (let v = 0; v < template.positions.length / 3; v++) {
        const a = template.positions[v * 3 + 1]
        const [px, py, pz] = bladeVertex(b, a, template.positions[v * 3], right, widen)
        const shade = GRASS_BLADE.shade[0] + (GRASS_BLADE.shade[1] - GRASS_BLADE.shade[0]) * a
        g.arrays.positions.push(px, y + py, pz)
        g.arrays.colors.push(b.colour[0] * shade, b.colour[1] * shade, b.colour[2] * shade)
        g.stroke.push(template.stroke[v * 2], template.stroke[v * 2 + 1])
        g.seed.push(b.seed)
        g.cls.push(255)
        g.src.push(255)
      }
      for (const i of template.indices) g.arrays.indices.push(base + i)
    }
  }
}

/**
 * G4b, the flat panel in the production materials (S1 task 5 step 1): a wall (`wallA`), a gable (`wallB`), a roof
 * (`roofStriped`), the field and a tree mass laid flat facing +z, on a dark board that hides the sky, so the stroke
 * body's lanes, rake, fray and dry tails can be read on a wall before the volumes stand. With `grass`, S3's blade strip.
 */
export function buildFlatPanel(painting: ImageData2D | null, flow: ImageData2D | null, masses: BakedMass[] | null, grass = false): StreetBuild | null {
  if (!painting || !flow || !masses) return null
  const ctx: Context = {
    flow,
    painting,
    underpaint: Object.assign(makeBrushArrays(), { cls: [], src: [] }),
    strokes: { arrays: makeBrushArrays(), stroke: [], seed: [], cls: [], src: [] },
    ground: { arrays: makeBrushArrays(), stroke: [], seed: [], cls: [], src: [] },
    outlines: { arrays: makeBrushArrays(), stroke: [], seed: [], cls: [], src: [] },
    windows: Object.assign(makeBrushArrays(), { cls: [], src: [] }),
    grassBase: Object.assign(makeBrushArrays(), { cls: [], src: [] }),
    report: { faces: [], outlines: [], windows: [], church: { belfryWidth: 0, belfryHeight: 0, spireHeight: 0 }, craft: [], lane: { walls: [], rail: null, lamps: [] } },
    ribbons: 0,
    lit: true,
    wallLight: STREET_LIGHT,
    wallPaint: KEPT_PAINT,
  }
  polygon(ctx.underpaint, [new Vector3(-0.3, -0.3, -0.05), new Vector3(1.9, -0.3, -0.05), new Vector3(1.9, 0.9, -0.05), new Vector3(-0.3, 0.9, -0.05)], new Color(0x111111), 255)
  const toward = new Vector3(0, 0, 1)
  const behind = new Vector3(0.8, 0.3, -1)
  const pieces: [string, Vector3, number, number, StreetFace['shape'], StreetFace['kind'], StreetSourceName, number][] = [
    ['wall', new Vector3(0, 0.32, 0), 0.6, 0.2, 'quad', 'wall', 'wallA', 0.2],
    ['gable', new Vector3(0.7, 0.32, 0), 0.4, 0.14, 'triangle', 'wall', 'wallB', 0.2],
    ['roof', new Vector3(1.2, 0.32, 0), 0.4, 0.25, 'quad', 'roof', 'roofStriped', 0.25],
    ['field', new Vector3(0, 0, 0), 0.8, 0.25, 'quad', 'ground', 'field', 0.2],
  ]
  pieces.forEach(([name, origin, w, h, shape, kind, source, ref], i) => {
    const face = orientedFace(origin, new Vector3(w, 0, 0), new Vector3(0, h, 0), behind, { shape, kind, source, refHeight: ref, seed: 0x7100 + i, mirror: false })
    clad(ctx, 'flat', name, face)
    const corners = facePolygon(face)
    ink(ctx, 'flat', ref, corners.map((p, k) => [p, corners[(k + 1) % corners.length], toward] as [Vector3, Vector3, Vector3]), 0x7200 + i)
  })
  if (grass) flatGrassStrip(ctx)
  const tree = STREET_TREES.find((t) => t.id === 'orchard-lower') ?? STREET_TREES[0]
  const trees = buildLandTrees(flow, painting, masses, 0x7ee5, [{ ...tree, x: 1.35, z: 0 }], streetGroundAt, streetMassConfig)
  const triangles = (ctx.underpaint.indices.length + ctx.strokes.arrays.indices.length + ctx.ground.arrays.indices.length + ctx.outlines.arrays.indices.length + trees.solid.indices.length + trees.strokes.indices.length) / 3
  return { underpaint: ctx.underpaint, strokes: ctx.strokes, ground: ctx.ground, outlines: ctx.outlines, windows: ctx.windows, grassBase: ctx.grassBase, trees, counts: { ribbons: ctx.ribbons, triangles, builds: 0 }, report: ctx.report }
}
