import { Color, SRGBColorSpace, Vector3 } from 'three'
import { makeBrushArrays, type BrushArrays } from './brushForms.ts'
import { islandHeightAt } from './islandShape.ts'
import { buildLandTrees, type BakedMass, type LandTrees } from './landDomes.ts'
import { PALETTE } from './palette.ts'
import { STREET, STREET_CHURCH, STREET_HOUSES, STREET_TREES, pathPoint, pathTangent } from './streetLayout.ts'
import { outlineFace, sourceUnderpaint, traceFace, type FaceStrokes, type StreetFace, type StreetSourceName } from './streetStrokes.ts'
import type { ImageData2D } from './useImageData.ts'
import { VILLAGE_CHURCH, type Building, type Pigment } from './villageKnot.ts'

/**
 * The street's build (S1 task 5, tasks/2026-10-23-street-s1-plan.md): the houses and the church as volumes with the
 * village knot's proportions, every wall, gable and roof plane clad by `traceFace` and inked along its edges by
 * `outlineFace`, the ground and the path in the field's strokes, the trees the land's stroked domes. Pure: the
 * component draws it.
 */

export type StreetCounts = { ribbons: number; triangles: number; builds: number }

type Strokes = { arrays: BrushArrays; stroke: number[]; seed: number[] }

export type StreetBuild = {
  underpaint: BrushArrays
  strokes: Strokes
  outlines: Strokes
  windows: BrushArrays
  trees: LandTrees
  counts: StreetCounts
  /** the gates' read of the build: ribbons per face, inked edges per volume, the windows, the church's measures */
  report: {
    faces: { owner: string; name: string; ribbons: number }[]
    outlines: { owner: string; edges: number }[]
    windows: { owner: string; lit: boolean }[]
    church: { belfryWidth: number; spireHeight: number }
  }
}

const INK = new Color(PALETTE.ground)
const WINDOW_LIT = new Color(PALETTE.windowOchre).multiplyScalar(1.6)
const WINDOW_DARK = new Color(PALETTE.ground).lerp(new Color(PALETTE.house), 0.35)
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

function append(into: Strokes, from: FaceStrokes): void {
  const base = into.arrays.positions.length / 3
  into.arrays.positions.push(...from.arrays.positions)
  into.arrays.colors.push(...from.arrays.colors)
  for (const i of from.arrays.indices) into.arrays.indices.push(i + base)
  into.stroke.push(...from.stroke)
  into.seed.push(...from.seed)
}

function polygon(arr: BrushArrays, vertices: Vector3[], colour: Color): void {
  const start = arr.positions.length / 3
  for (const p of vertices) {
    arr.positions.push(p.x, p.y, p.z)
    arr.colors.push(colour.r, colour.g, colour.b)
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
  underpaint: BrushArrays
  strokes: Strokes
  outlines: Strokes
  windows: BrushArrays
  report: StreetBuild['report']
  ribbons: number
}

/** Clad one face: its underpaint, its strokes, its report line. */
function clad(ctx: Context, owner: string, name: string, face: StreetFace): void {
  const [r, g, b] = sourceUnderpaint(ctx.painting, face.source)
  polygon(ctx.underpaint, facePolygon(face), new Color().setRGB(r, g, b, SRGBColorSpace))
  const traced = traceFace(face, ctx.flow, ctx.painting)
  append(ctx.strokes, traced)
  ctx.ribbons += traced.ribbons
  ctx.report.faces.push({ owner, name, ribbons: traced.ribbons })
}

/** Ink a volume's edges, each with the normal of the face it belongs to. */
function ink(ctx: Context, owner: string, refHeight: number, edges: [Vector3, Vector3, Vector3][], seed: number): void {
  edges.forEach(([a, b, normal], i) => {
    const face: StreetFace = { origin: a, u: b.clone().sub(a), v: UP.clone(), normal, shape: 'quad', kind: 'wall', source: 'wallA', refHeight, seed, mirror: false }
    append(ctx.outlines, outlineFace(face, [[a, b]], INK, seed * 17 + i))
  })
  ctx.report.outlines.push({ owner, edges: edges.length })
}

/** An opening on a wall face: a dark (or lit) quad over the strokes, framed in a thin ink. */
function opening(ctx: Context, face: StreetFace, cu: number, cv: number, w: number, h: number, lit: boolean, seed: number): void {
  const at = (s: number, t: number) => face.origin.clone().addScaledVector(face.u, s).addScaledVector(face.v, t).addScaledVector(face.normal, 0.0035)
  const quad = [at(cu - w / 2, cv - h / 2), at(cu + w / 2, cv - h / 2), at(cu + w / 2, cv + h / 2), at(cu - w / 2, cv + h / 2)]
  polygon(ctx.windows, quad, lit ? WINDOW_LIT : WINDOW_DARK)
  const frame: StreetFace = { ...face, refHeight: face.v.length() * FRAME }
  append(ctx.outlines, outlineFace(frame, quad.map((p, i) => [p, quad[(i + 1) % 4]] as const), INK, seed))
}

/**
 * A house: a box to the eave and a pitched roof whose ridge runs along its depth, so its front gable and door face
 * the path; `along` is its width's direction, `toPath` its depth's, toward the street.
 */
function house(ctx: Context, owner: string, index: number, b: Building, centre: Vector3, along: Vector3, toPath: Vector3, lit: boolean): void {
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
  opening(ctx, front, index % 2 ? 0.2 : 0.8, 0.62, 0.16, 0.26, lit, seed + 13)
  ctx.report.windows.push({ owner, lit })
  // a chimney on every other house, a small dark box through the roof
  if (index % 2 === 0) {
    const foot = c(w * 0.18, -d * 0.22, eave + pitch * 0.4)
    const size = 0.035
    const box = [[0, 0], [1, 0], [1, 1], [0, 1]].map(([x, z]) => foot.clone().addScaledVector(along, x * size).addScaledVector(toPath, z * size))
    const tops = box.map((p) => p.clone().setY(eave + pitch * 0.68 + 0.1))
    for (let k = 0; k < 4; k++) polygon(ctx.underpaint, [box[k], box[(k + 1) % 4], tops[(k + 1) % 4], tops[k]], INK)
    polygon(ctx.underpaint, tops, INK)
  }
}

/** The church: the nave as a house (its door end toward the path), the belfry behind it, the spire on the belfry. */
function church(ctx: Context): StreetBuild['report']['church'] {
  const { nave, belfry, spireTip } = STREET_CHURCH
  const along = new Vector3(Math.cos(nave.yaw), 0, Math.sin(nave.yaw))
  const toPath = new Vector3(-Math.sin(nave.yaw), 0, Math.cos(nave.yaw))
  house(ctx, 'church', 100, nave, new Vector3(nave.x, 0, nave.z), along, toPath, false)
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
  return { belfryWidth: belfry.width, spireHeight: tipY - floor }
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
  // the path, raised a hair over the ground's strokes, in segments along its bend
  const width = 0.12
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
    underpaint: makeBrushArrays(),
    strokes: { arrays: makeBrushArrays(), stroke: [], seed: [] },
    outlines: { arrays: makeBrushArrays(), stroke: [], seed: [] },
    windows: makeBrushArrays(),
    report: { faces: [], outlines: [], windows: [], church: { belfryWidth: 0, spireHeight: 0 } },
    ribbons: 0,
  }
  ground(ctx)
  STREET_HOUSES.forEach((h, index) => {
    const [tx, , tz] = pathTangent(h.at)
    const along = new Vector3(tx, 0, tz)
    const normal = new Vector3(-tz, 0, tx)
    const toPath = normal.multiplyScalar(-h.side)
    // at most one warm window a house, on a third of them
    house(ctx, `house-${index}`, index, h, new Vector3(h.x, 0, h.z), along, toPath, index % 3 === 0)
  })
  ctx.report.church = church(ctx)
  const trees = buildLandTrees(flow, painting, masses, 0x7ee5, STREET_TREES)
  const triangles = (ctx.underpaint.indices.length + ctx.strokes.arrays.indices.length + ctx.outlines.arrays.indices.length + ctx.windows.indices.length + trees.solid.indices.length + trees.strokes.indices.length) / 3
  return {
    underpaint: ctx.underpaint,
    strokes: ctx.strokes,
    outlines: ctx.outlines,
    windows: ctx.windows,
    trees,
    counts: { ribbons: ctx.ribbons, triangles, builds: 0 },
    report: ctx.report,
  }
}
