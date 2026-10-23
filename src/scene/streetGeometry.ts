import { Color, SRGBColorSpace, Vector3 } from 'three'
import { makeBrushArrays, type BrushArrays } from './brushForms.ts'
import { islandHeightAt } from './islandShape.ts'
import { buildLandTrees, type BakedMass, type LandTrees } from './landDomes.ts'
import { buildStreetTrees } from './streetTrees.ts'
import { PALETTE } from './palette.ts'
import { STREET, STREET_CHURCH, STREET_HOUSES, STREET_TREES, pathPoint, pathTangent, streetGroundAt } from './streetLayout.ts'
import { outlineFace, sourceUnderpaint, streetMassConfig, traceFace, type FaceStrokes, type StreetFace, type StreetSourceName } from './streetStrokes.ts'
import type { ImageData2D } from './useImageData.ts'
import { VILLAGE_CHURCH, type Building, type Pigment } from './villageKnot.ts'

/**
 * The street's build (S1 task 5, tasks/2026-10-23-street-s1-plan.md): the houses and the church as volumes with the
 * village knot's proportions, every wall, gable and roof plane clad by `traceFace` and inked along its edges by
 * `outlineFace`, the ground and the path in the field's strokes, the trees the land's stroked domes. Pure: the
 * component draws it.
 */

export type StreetCounts = { ribbons: number; triangles: number; builds: number }

export type BrushArraysWithCls = BrushArrays & { cls: number[] }
export type Strokes = { arrays: BrushArrays; stroke: number[]; seed: number[]; cls: number[] }

export type StreetBuild = {
  underpaint: BrushArraysWithCls
  strokes: Strokes
  /** the ground's and the path's strokes, drawn in their own calmer body (pass 4) */
  ground: Strokes
  outlines: Strokes
  windows: BrushArraysWithCls
  trees: LandTrees
  counts: StreetCounts
  /** the gates' read of the build: ribbons per face, inked edges per volume, the windows, the church's measures */
  report: {
    faces: { owner: string; name: string; ribbons: number }[]
    outlines: { owner: string; edges: number }[]
    windows: { owner: string; lit: boolean }[]
    church: { belfryWidth: number; belfryHeight: number; spireHeight: number }
  }
}

const INK = new Color(PALETTE.ground)
/** pass 5: a door's and a dark window's strokes are their wall's, at this share of its value */
const OPENING_DARK = 0.3
// pass 1: 0.35 of the house blue read as flat blue doors
const WINDOW_DARK = new Color(PALETTE.ground).lerp(new Color(PALETTE.house), 0.12)
/** the roofs overhang the walls by this much along both axes */
const OVERHANG = 0.015
/** the door's and the windows' frames: a thin ink, a fraction of the wall's height */
const FRAME = 0.35
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

function append(into: Strokes, from: FaceStrokes, cls: number): void {
  const base = into.arrays.positions.length / 3
  into.arrays.positions.push(...from.arrays.positions)
  into.arrays.colors.push(...from.arrays.colors)
  for (const i of from.arrays.indices) into.arrays.indices.push(i + base)
  into.stroke.push(...from.stroke)
  into.seed.push(...from.seed)
  const count = from.arrays.positions.length / 3
  for (let i = 0; i < count; i++) into.cls.push(cls)
}

function polygon(arr: BrushArraysWithCls, vertices: Vector3[], colour: Color, cls: number): void {
  const start = arr.positions.length / 3
  for (const p of vertices) {
    arr.positions.push(p.x, p.y, p.z)
    arr.colors.push(colour.r, colour.g, colour.b)
    arr.cls.push(cls)
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
  report: StreetBuild['report']
  ribbons: number
}

/** Clad one face: its underpaint, its strokes, its report line. */
function clad(ctx: Context, owner: string, name: string, face: StreetFace): void {
  const [r, g, b] = sourceUnderpaint(ctx.painting, face.source)
  const cls = face.kind === 'wall' ? 0 : face.kind === 'roof' ? 1 : face.kind === 'ground' ? 3 : 4
  polygon(ctx.underpaint, facePolygon(face), new Color().setRGB(r, g, b, SRGBColorSpace), cls)
  const traced = traceFace(face, ctx.flow, ctx.painting)
  append(face.kind === 'ground' || face.kind === 'path' ? ctx.ground : ctx.strokes, traced, cls)
  ctx.ribbons += traced.ribbons
  ctx.report.faces.push({ owner, name, ribbons: traced.ribbons })
}

/** Ink a volume's edges, each with the normal of the face it belongs to. */
function ink(ctx: Context, owner: string, refHeight: number, edges: [Vector3, Vector3, Vector3][], seed: number): void {
  edges.forEach(([a, b, normal], i) => {
    const face: StreetFace = { origin: a, u: b.clone().sub(a), v: UP.clone(), normal, shape: 'quad', kind: 'wall', source: 'wallA', refHeight, seed, mirror: false }
    append(ctx.outlines, outlineFace(face, [[a, b]], INK, seed * 17 + i), 255)
  })
  ctx.report.outlines.push({ owner, edges: edges.length })
}

/** An opening on a wall face: a dark (or lit) quad over the strokes, framed in a thin ink. */
function opening(ctx: Context, face: StreetFace, cu: number, cv: number, w: number, h: number, lit: boolean, seed: number): void {
  const at = (s: number, t: number) => face.origin.clone().addScaledVector(face.u, s).addScaledVector(face.v, t).addScaledVector(face.normal, 0.0055)
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
  append(ctx.strokes, traceFace(opening, ctx.flow, ctx.painting, { tint: lit ? 1 : OPENING_DARK }), lit ? 2 : 255)
  const frame: StreetFace = { ...face, refHeight: face.v.length() * FRAME }
  append(ctx.outlines, outlineFace(frame, quad.map((p, i) => [p, quad[(i + 1) % 4]] as const), INK, seed), 255)
}

/**
 * A house: a box to the eave and a pitched roof whose ridge runs along its depth, so its front gable and door face
 * the path; `along` is its width's direction, `toPath` its depth's, toward the street.
 */
function house(ctx: Context, owner: string, index: number, b: Building, centre: Vector3, along: Vector3, toPath: Vector3, lit: boolean, chimney: boolean): void {
  const c = (x: number, z: number, y: number) => centre.clone().addScaledVector(along, x).addScaledVector(toPath, z).setY(y)
  const { w, d, eave, pitch } = b
  const wall = wallSource(b.wall, index)
  const roof = roofSource(b.roof, index)
  const inside = centre.clone().setY(eave / 2)
  const seed = 0x5700 + index * 97
  // the walls: front (toward the path), right, back, left
  const fl = c(-w / 2, d / 2, 0), fr = c(w / 2, d / 2, 0), br = c(w / 2, -d / 2, 0), bl = c(-w / 2, -d / 2, 0)
  const upE = UP.clone().multiplyScalar(eave)
  const walls: [string, Vector3, Vector3][] = [['front', fl, fr], ['right', fr, br], ['back', br, bl], ['left', bl, fl]]
  const wallFaces = walls.map(([name, a, z], i) => {
    const face = orientedFace(a, z.clone().sub(a), upE, inside, { shape: 'quad', kind: 'wall', source: wall, refHeight: eave, seed: seed + i, mirror: i % 2 === 1 })
    clad(ctx, owner, name, face)
    return face
  })
  // the gables over the front and the back
  const upP = UP.clone().multiplyScalar(pitch)
  for (const [name, a, z, i] of [['front gable', fl, fr, 4], ['back gable', br, bl, 5]] as const) {
    clad(ctx, owner, name, orientedFace(a.clone().setY(eave), z.clone().sub(a), upP, inside, { shape: 'triangle', kind: 'wall', source: wall, refHeight: eave, seed: seed + i, mirror: i === 5 }))
  }
  // the roof planes, from the eave (overhung) to the ridge; the ridge runs along the depth at the width's middle
  const ridgeF = c(0, d / 2 + OVERHANG, eave + pitch)
  const ridgeB = c(0, -d / 2 - OVERHANG, eave + pitch)
  for (const [name, sideX, i] of [['left roof', -1, 6], ['right roof', 1, 7]] as const) {
    const eaveF = c(sideX * (w / 2 + OVERHANG), d / 2 + OVERHANG, eave - OVERHANG * (pitch / (w / 2)))
    const eaveB = c(sideX * (w / 2 + OVERHANG), -d / 2 - OVERHANG, eave - OVERHANG * (pitch / (w / 2)))
    const slope = ridgeF.clone().sub(eaveF)
    clad(ctx, owner, name, orientedFace(eaveF, eaveB.clone().sub(eaveF), slope, inside, { shape: 'quad', kind: 'roof', source: roof, refHeight: slope.length(), seed: seed + i, mirror: sideX > 0 }))
  }
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
  opening(ctx, front, 0.5, 0.3, 0.2, 0.6, false, seed + 11)
  ctx.report.windows.push({ owner, lit: false })
  opening(ctx, front, index % 2 ? 0.2 : 0.8, 0.62, 0.12, 0.2, lit, seed + 13)
  ctx.report.windows.push({ owner, lit })
  // a chimney, a small dark box through the roof
  if (chimney) {
    const foot = c(w * 0.18, -d * 0.22, eave + pitch * 0.4)
    const size = 0.035
    const box = [[0, 0], [1, 0], [1, 1], [0, 1]].map(([x, z]) => foot.clone().addScaledVector(along, x * size).addScaledVector(toPath, z * size))
    const tops = box.map((p) => p.clone().setY(eave + pitch * 0.68 + 0.1))
    for (let k = 0; k < 4; k++) polygon(ctx.underpaint, [box[k], box[(k + 1) % 4], tops[(k + 1) % 4], tops[k]], INK, 255)
    polygon(ctx.underpaint, tops, INK, 255)
  }
}

/** The church: the nave as a house (its door end toward the path), the belfry behind it, the spire on the belfry. */
function church(ctx: Context): StreetBuild['report']['church'] {
  const { nave, belfry, spireTip } = STREET_CHURCH
  const along = new Vector3(Math.cos(nave.yaw), 0, Math.sin(nave.yaw))
  const toPath = new Vector3(-Math.sin(nave.yaw), 0, Math.cos(nave.yaw))
  // the painting's church has no chimney (Fable R9)
  house(ctx, 'church', 100, nave, new Vector3(nave.x, 0, nave.z), along, toPath, false, false)
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
    const face = orientedFace(a, b.clone().sub(a), height, inside, { shape: 'quad', kind: 'wall', source: 'plaster', refHeight: VILLAGE_CHURCH.nave.eave, seed: 0x6100 + k, mirror: k % 2 === 1 })
    clad(ctx, 'belfry', `wall ${k}`, face)
    opening(ctx, face, 0.5, 0.82, 0.32, 0.2, false, 0x6110 + k)
    const at = a.clone().setY(top)
    const bt = b.clone().setY(top)
    const mid = at.clone().lerp(bt, 0.5)
    const spireInside = centre.clone().setY(top + (tipY - top) * 0.3)
    clad(ctx, 'spire', `side ${k}`, orientedFace(at, bt.clone().sub(at), tip.clone().sub(mid), spireInside, { shape: 'triangle', kind: 'wall', source: 'plaster', refHeight: VILLAGE_CHURCH.nave.eave, seed: 0x6200 + k, mirror: k % 2 === 1 }))
    edges.push([at, bt, face.normal], [a, at, face.normal], [at, tip, face.normal])
  }
  ink(ctx, 'belfry', VILLAGE_CHURCH.nave.eave, edges, 0x6300)
  return { belfryWidth: belfry.width, belfryHeight: top - floor, spireHeight: tipY - floor }
}

/** The ground in tiles about 0.6 square either side of the path, strokes across it; the path its paler strip along. */
function ground(ctx: Context): void {
  const forward = new Vector3(...STREET.forward).normalize()
  const across = new Vector3().crossVectors(forward, UP).normalize()
  const [from, to, side] = [-0.45, STREET.pathLength + 0.75, 1.25]
  const alongTiles = Math.round((to - from) / 0.6)
  const acrossTiles = Math.round((2 * side) / 0.6)
  const tileAlong = (to - from) / alongTiles
  const tileAcross = (2 * side) / acrossTiles
  const below = new Vector3(0, -1, 0)
  let k = 0
  for (let i = 0; i < alongTiles; i++) {
    for (let j = 0; j < acrossTiles; j++) {
      const origin = forward.clone().multiplyScalar(from + i * tileAlong).addScaledVector(across, -side + j * tileAcross)
      clad(ctx, 'ground', `tile ${i},${j}`, orientedFace(origin, across.clone().multiplyScalar(tileAcross), forward.clone().multiplyScalar(tileAlong), below, { shape: 'quad', kind: 'ground', source: 'field', refHeight: STREET.wallRef, seed: 0x6400 + k, mirror: k % 2 === 1 }))
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
      clad(ctx, 'ground', `far ${i},${j}`, orientedFace(origin, across.clone().multiplyScalar(b), forward.clone().multiplyScalar((farTo - farFrom) / farAlong), below, { shape: 'quad', kind: 'ground', source: 'field', refHeight: STREET.wallRef * 2.5, seed: 0x6600 + i * 7 + j, mirror: (i + j) % 2 === 1 }))
    }
  }
  // the near ground's sides beyond the houses, out to the far tiles' width
  for (const sign of [-1, 1]) {
    for (let i = 0; i < alongTiles; i++) {
      const origin = forward.clone().multiplyScalar(from + i * tileAlong).addScaledVector(across, sign > 0 ? side : -farSide)
      clad(ctx, 'ground', `side ${sign},${i}`, orientedFace(origin, across.clone().multiplyScalar(farSide - side), forward.clone().multiplyScalar(tileAlong), below, { shape: 'quad', kind: 'ground', source: 'field', refHeight: STREET.wallRef * 2, seed: 0x6700 + i * 3 + (sign > 0 ? 1 : 0), mirror: i % 2 === 0 }))
    }
  }
  // the path, raised a hair over the ground's strokes, in segments along its bend
  // pass 5: 0.12 read as a pale river across the near frame
  const width = 0.08
  const segments = 8
  for (let s = 0; s < segments; s++) {
    const t0 = -0.25 + (s / segments) * 1.4
    const t1 = -0.25 + ((s + 1) / segments) * 1.4 + 0.02
    const p0 = new Vector3(...pathPoint(t0))
    const p1 = new Vector3(...pathPoint(t1))
    const normal = new Vector3(...pathTangent((t0 + t1) / 2)).cross(UP).normalize()
    const origin = p0.clone().addScaledVector(normal, -width / 2).setY(0.002)
    clad(ctx, 'path', `segment ${s}`, orientedFace(origin, p1.clone().sub(p0), normal.clone().multiplyScalar(width), below, { shape: 'quad', kind: 'path', source: 'field', refHeight: STREET.wallRef, seed: 0x6500 + s, mirror: s % 2 === 1 }))
  }
}

export function buildStreet(painting: ImageData2D | null, flow: ImageData2D | null, masses: BakedMass[] | null): StreetBuild | null {
  if (!painting || !flow || !masses) return null
  const ctx: Context = {
    flow,
    painting,
    underpaint: Object.assign(makeBrushArrays(), { cls: [] }),
    strokes: { arrays: makeBrushArrays(), stroke: [], seed: [], cls: [] },
    ground: { arrays: makeBrushArrays(), stroke: [], seed: [], cls: [] },
    outlines: { arrays: makeBrushArrays(), stroke: [], seed: [], cls: [] },
    windows: Object.assign(makeBrushArrays(), { cls: [] }),
    report: { faces: [], outlines: [], windows: [], church: { belfryWidth: 0, belfryHeight: 0, spireHeight: 0 } },
    ribbons: 0,
  }
  ground(ctx)
  STREET_HOUSES.forEach((h, index) => {
    const [tx, , tz] = pathTangent(h.at)
    const along = new Vector3(tx, 0, tz)
    const normal = new Vector3(-tz, 0, tx)
    const toPath = normal.multiplyScalar(-h.side)
    // at most one warm window a house, on a third of them
    // a chimney on every other house
    house(ctx, `house-${index}`, index, h, new Vector3(h.x, 0, h.z), along, toPath, index % 3 === 0, index % 2 === 0)
  })
  ctx.report.church = church(ctx)
  const trees = buildStreetTrees(painting, STREET_TREES)
  const triangles = (ctx.underpaint.indices.length + ctx.strokes.arrays.indices.length + ctx.ground.arrays.indices.length + ctx.outlines.arrays.indices.length + ctx.windows.indices.length + trees.solid.indices.length + trees.strokes.indices.length) / 3
  return {
    underpaint: ctx.underpaint,
    strokes: ctx.strokes,
    ground: ctx.ground,
    outlines: ctx.outlines,
    windows: ctx.windows,
    trees,
    counts: { ribbons: ctx.ribbons, triangles, builds: 0 },
    report: ctx.report,
  }
}

/** G4b's view of the flat panel: the camera square on the board, the five pieces in two rows. */
export const FLAT_VIEW = { position: [0.8, 0.285, 1.9] as [number, number, number], target: [0.8, 0.285, 0] as [number, number, number], fov: 30 }

/**
 * G4b, the flat panel in the production materials (S1 task 5 step 1): a wall (`wallA`), a gable (`wallB`), a roof
 * (`roofStriped`), the field and a tree mass laid flat facing +z, on a dark board that hides the sky, so the stroke
 * body's lanes, rake, fray and dry tails can be read on a wall before the volumes stand.
 */
export function buildFlatPanel(painting: ImageData2D | null, flow: ImageData2D | null, masses: BakedMass[] | null): StreetBuild | null {
  if (!painting || !flow || !masses) return null
  const ctx: Context = {
    flow,
    painting,
    underpaint: Object.assign(makeBrushArrays(), { cls: [] }),
    strokes: { arrays: makeBrushArrays(), stroke: [], seed: [], cls: [] },
    ground: { arrays: makeBrushArrays(), stroke: [], seed: [], cls: [] },
    outlines: { arrays: makeBrushArrays(), stroke: [], seed: [], cls: [] },
    windows: Object.assign(makeBrushArrays(), { cls: [] }),
    report: { faces: [], outlines: [], windows: [], church: { belfryWidth: 0, belfryHeight: 0, spireHeight: 0 } },
    ribbons: 0,
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
  const tree = STREET_TREES.find((t) => t.id === 'orchard-lower') ?? STREET_TREES[0]
  const trees = buildLandTrees(flow, painting, masses, 0x7ee5, [{ ...tree, x: 1.35, z: 0 }], streetGroundAt, streetMassConfig)
  const triangles = (ctx.underpaint.indices.length + ctx.strokes.arrays.indices.length + ctx.ground.arrays.indices.length + ctx.outlines.arrays.indices.length + trees.solid.indices.length + trees.strokes.indices.length) / 3
  return { underpaint: ctx.underpaint, strokes: ctx.strokes, ground: ctx.ground, outlines: ctx.outlines, windows: ctx.windows, trees, counts: { ribbons: ctx.ribbons, triangles, builds: 0 }, report: ctx.report }
}
