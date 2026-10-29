import { CubicBezierCurve3, CurvePath, Vector3 } from 'three'
import { LAND_MASSES, type LandMass } from './landMasses.ts'
import type { StreetSourceName } from './streetStrokes.ts'
import {
  VILLAGE_CHURCH,
} from './villageKnot.ts'

export const MAP = {
  origin: [500, 1210] as const,
  scale: 0.0024,
} as const

const STREET_FORWARD = [-0.1041, 0, -0.9946] as const
const [fx, , fz] = STREET_FORWARD
const rx = -fz
const rz = fx
const forward = new Vector3(fx, 0, fz)

export function mapToWorld(mx: number, my: number): Vector3 {
  const a = (MAP.origin[1] - my) * MAP.scale
  const l = (mx - MAP.origin[0]) * MAP.scale
  return new Vector3(a * fx + l * rx, 0, a * fz + l * rz)
}

// Map path: M500 1210 C470 1100 380 1020 400 900 C420 790 590 740 600 620 C610 520 480 470 500 330
const c1 = new CubicBezierCurve3(mapToWorld(500, 1210), mapToWorld(470, 1100), mapToWorld(380, 1020), mapToWorld(400, 900))
const c2 = new CubicBezierCurve3(mapToWorld(400, 900), mapToWorld(420, 790), mapToWorld(590, 740), mapToWorld(600, 620))
const c3 = new CubicBezierCurve3(mapToWorld(600, 620), mapToWorld(610, 520), mapToWorld(480, 470), mapToWorld(500, 330))

const lanePath = new CurvePath<Vector3>()
lanePath.add(c1)
lanePath.add(c2)
lanePath.add(c3)

const measuredLength = lanePath.getLength()

export const STREET = {
  pathLength: measuredLength,
  eye: 0.09,
  behind: 0.18,
  lookAhead: 0.6,
  lookHeight: 0.06,
  near: 0.004,
  far: 48,
  fov: { landscape: 50, portrait: 75 },
  originA: [0, 0, 5.0] as const,
  wallRef: 0.2,
  frontSetback: 0.2,
  forward: STREET_FORWARD,
} as const

export function pathPoint(t: number): [number, number, number] {
  if (t >= 0 && t <= 1) {
    const p = lanePath.getPointAt(t)
    return [p.x, p.y, p.z]
  }
  if (t < 0) {
    const p0 = lanePath.getPointAt(0)
    const tan0 = lanePath.getTangentAt(0)
    const p = p0.clone().addScaledVector(tan0, t * measuredLength)
    return [p.x, p.y, p.z]
  }
  const p1 = lanePath.getPointAt(1)
  const tan1 = lanePath.getTangentAt(1)
  const p = p1.clone().addScaledVector(tan1, (t - 1) * measuredLength)
  return [p.x, p.y, p.z]
}

export function pathTangent(t: number): [number, number, number] {
  if (t >= 0 && t <= 1) {
    const tan = lanePath.getTangentAt(t)
    return [tan.x, tan.y, tan.z]
  }
  if (t < 0) {
    const tan = lanePath.getTangentAt(0)
    return [tan.x, tan.y, tan.z]
  }
  const tan = lanePath.getTangentAt(1)
  return [tan.x, tan.y, tan.z]
}

/** One map from the lane: position and outward normal in the street frame (Fact 4, Decision (f)). */
export function laneAt(t: number, lat: number): { x: number; z: number; nx: number; nz: number } {
  const [px, , pz] = pathPoint(t)
  const [tx, , tz] = pathTangent(t)
  const n = Math.hypot(tx, tz)
  const [nx, nz] = [-tz / n, tx / n]
  return { x: px + lat * nx, z: pz + lat * nz, nx, nz }
}

// laneOffset sampled at 400 segments over t -0.2 to 1.0
const N_LANE_SAMPLES = 400
const laneSamples: [number, number, number][] = []
for (let i = 0; i <= N_LANE_SAMPLES; i++) {
  const t = -0.2 + (1.2 * i) / N_LANE_SAMPLES
  laneSamples.push(pathPoint(t))
}

export function laneParam(x: number, z: number): [number, number] {
  let minDistanceSq = Infinity
  let bestI = 0
  let bestU = 0
  let bestClosestX = 0
  let bestClosestZ = 0
  let bestDx = 0
  let bestDz = 0

  for (let i = 0; i < N_LANE_SAMPLES; i++) {
    const pA = laneSamples[i]
    const pB = laneSamples[i + 1]
    const dx = pB[0] - pA[0]
    const dz = pB[2] - pA[2]
    const lenSq = dx * dx + dz * dz

    const u = Math.max(0, Math.min(1, ((x - pA[0]) * dx + (z - pA[2]) * dz) / lenSq))
    const closestX = pA[0] + u * dx
    const closestZ = pA[2] + u * dz

    const vx = x - closestX
    const vz = z - closestZ
    const distSq = vx * vx + vz * vz
    if (distSq < minDistanceSq) {
      minDistanceSq = distSq
      bestI = i
      bestU = u
      bestClosestX = closestX
      bestClosestZ = closestZ
      bestDx = dx
      bestDz = dz
    }
  }

  const tA = -0.2 + (1.2 * bestI) / N_LANE_SAMPLES
  const bestT = tA + (1.2 / N_LANE_SAMPLES) * bestU
  const dist = Math.hypot(x - bestClosestX, z - bestClosestZ)
  const vx = x - bestClosestX
  const vz = z - bestClosestZ
  const crossY = bestDx * vz - bestDz * vx
  const sign = crossY >= 0 ? 1 : -1
  const signedOffset = sign * dist
  return [bestT, signedOffset]
}

export function laneOffset(x: number, z: number): number {
  return laneParam(x, z)[1]
}

export function laneDistance(x: number, z: number): number {
  return Math.abs(laneOffset(x, z))
}

export type StreetHouse = {
  id: string
  side: -1 | 1
  type: 'painting' | 'cottage'
  w: number
  d: number
  eave: number
  pitch: number
  storeys: 1 | 2
  wallSource: StreetSourceName
  roofSource: StreetSourceName
  lit: boolean
  chimney: boolean
  x: number
  z: number
  yaw: number
  theta: number
}

const HOUSE_DATA: readonly {
  id: string
  mapX: number
  mapY: number
  theta: number
  side: -1 | 1
  type: 'painting' | 'cottage'
  w: number
  d: number
  eave: number
  pitch: number
  storeys: 1 | 2
  wallSource: StreetSourceName
  roofSource: StreetSourceName
  lit: boolean
  chimney: boolean
}[] = [
  { id: 'L1', mapX: 160, mapY: 1010, theta: -14, side: -1, type: 'painting', w: 0.21, d: 0.27, eave: 0.18, pitch: 0.14, storeys: 1, wallSource: 'plaster', roofSource: 'roofBlue', lit: true, chimney: false },
  { id: 'L2', mapX: 225, mapY: 830, theta: 10, side: -1, type: 'cottage', w: 0.3, d: 0.24, eave: 0.09, pitch: 0.2, storeys: 1, wallSource: 'wallB', roofSource: 'thatch', lit: false, chimney: true },
  { id: 'L3', mapX: 330, mapY: 690, theta: -22, side: -1, type: 'painting', w: 0.22, d: 0.29, eave: 0.22, pitch: 0.14, storeys: 1, wallSource: 'wallA', roofSource: 'roofSienna', lit: false, chimney: true },
  { id: 'L4', mapX: 300, mapY: 520, theta: 6, side: -1, type: 'painting', w: 0.28, d: 0.3, eave: 0.3, pitch: 0.13, storeys: 2, wallSource: 'plaster', roofSource: 'roofStriped', lit: true, chimney: true },
  { id: 'L5', mapX: 340, mapY: 380, theta: -8, side: -1, type: 'cottage', w: 0.26, d: 0.22, eave: 0.09, pitch: 0.18, storeys: 1, wallSource: 'wallA', roofSource: 'thatch', lit: false, chimney: false },
  { id: 'R1', mapX: 700, mapY: 1060, theta: 18, side: 1, type: 'cottage', w: 0.32, d: 0.26, eave: 0.1, pitch: 0.2, storeys: 1, wallSource: 'wallB', roofSource: 'thatch', lit: false, chimney: true },
  { id: 'R2', mapX: 640, mapY: 900, theta: -6, side: 1, type: 'painting', w: 0.22, d: 0.27, eave: 0.2, pitch: 0.14, storeys: 1, wallSource: 'plaster', roofSource: 'roofBlue', lit: true, chimney: false },
  { id: 'R3', mapX: 790, mapY: 760, theta: 24, side: 1, type: 'painting', w: 0.24, d: 0.3, eave: 0.18, pitch: 0.12, storeys: 1, wallSource: 'wallB', roofSource: 'roofBlue', lit: false, chimney: true },
  { id: 'R4', mapX: 760, mapY: 560, theta: -16, side: 1, type: 'painting', w: 0.28, d: 0.34, eave: 0.2, pitch: 0.15, storeys: 1, wallSource: 'plaster', roofSource: 'roofSienna', lit: true, chimney: false },
  { id: 'R5', mapX: 680, mapY: 400, theta: 12, side: 1, type: 'cottage', w: 0.28, d: 0.22, eave: 0.09, pitch: 0.19, storeys: 1, wallSource: 'wallA', roofSource: 'thatch', lit: false, chimney: true },
] as const

export const STREET_HOUSES: readonly StreetHouse[] = HOUSE_DATA.map((h) => {
  const worldPos = mapToWorld(h.mapX, h.mapY)
  const thetaRad = (h.theta * Math.PI) / 180
  const axisX = Math.cos(thetaRad) * fx + Math.sin(thetaRad) * rx
  const axisZ = Math.cos(thetaRad) * fz + Math.sin(thetaRad) * rz
  const yaw = Math.atan2(axisZ, axisX)
  return {
    ...h,
    x: worldPos.x,
    z: worldPos.z,
    yaw,
  }
})

/** A recessed door's step: a box this high and this deep, the door's width */
export const STEP = { height: 0.012, depth: 0.03 } as const

export const LIVED_PATH = { margin: 0.02, lateral: 0.06, leg: 0.08, clear: 0.03, cover: 0.25, baseInset: 0.3 } as const
export const STREET_PATHS = [
  { house: 'L1', end: 0.265, legs: 1 },
  { house: 'L2', end: 0.341, legs: 2, first: 0.11, margin: 0 },
  { house: 'L3', end: 0.499, legs: 2 },
  { house: 'L4', end: 0.875, legs: 2 },
  { house: 'R1', end: 0.062, legs: 2 },
  { house: 'R2', end: 0.457, legs: 2 },
  { house: 'R3', end: 0.627, legs: 1 },
  { house: 'R4', end: 0.71, legs: 1 },
  { house: 'R5', end: null, legs: 1, first: 0.056 },
] as const

export type DoorPath = {
  house: string
  index: number
  width: number
  end: number | null
  points: [number, number][]
}

export function doorPathLegs(): DoorPath[] {
  return STREET_PATHS.map((p) => {
    const index = STREET_HOUSES.findIndex((h) => h.id === p.house)
    const h = STREET_HOUSES[index]
    const f = doorStepFrame(h, index)
    const door = doorOf(h, index)
    const u: [number, number] = [f.ux, f.uz]
    const n: [number, number] = [f.nx, f.nz]
    const width = door.w * h.w + ('margin' in p && p.margin !== undefined ? p.margin : LIVED_PATH.margin)
    const S: [number, number] = [
      f.ox + u[0] * door.cu * h.w + n[0] * STEP.depth,
      f.oz + u[1] * door.cu * h.w + n[1] * STEP.depth,
    ]
    const first = ('first' in p && p.first !== undefined ? p.first : LIVED_PATH.leg)
    let E: [number, number]
    if (p.end === null) {
      E = [S[0] + n[0] * first, S[1] + n[1] * first]
    } else {
      const e = laneAt(p.end, h.side * LIVED_PATH.lateral)
      E = [e.x, e.z]
    }
    const points: [number, number][] = p.legs === 2 ? [S, [S[0] + n[0] * first, S[1] + n[1] * first], E] : [S, E]
    return { house: p.house, index, width, end: p.end, points }
  })
}

const sub2 = (a: [number, number], b: [number, number]): [number, number] => [a[0] - b[0], a[1] - b[1]]
const add2 = (a: [number, number], b: [number, number]): [number, number] => [a[0] + b[0], a[1] + b[1]]
const mul2 = (a: [number, number], s: number): [number, number] => [a[0] * s, a[1] * s]
const dot2 = (a: [number, number], b: [number, number]): number => a[0] * b[0] + a[1] * b[1]
const norm2 = (a: [number, number]): [number, number] => {
  const l = Math.hypot(a[0], a[1])
  return [a[0] / l, a[1] / l]
}
const meet2 = (p: [number, number], d: [number, number], q: [number, number], e: [number, number]): [number, number] => {
  const den = d[0] * e[1] - d[1] * e[0]
  const s = ((q[0] - p[0]) * e[1] - (q[1] - p[1]) * e[0]) / den
  return add2(p, mul2(d, s))
}

export function pathLegShapes(path: DoorPath): { clip: [number, number][]; base: [number, number][]; rect: OrientedBox }[] {
  const h = STREET_HOUSES[path.index]
  const f = doorStepFrame(h, path.index)
  const u: [number, number] = [f.ux, f.uz]
  const width = path.width
  const pts = path.points

  let endDir: [number, number]
  if (path.end === null) {
    const [fx, , fz] = STREET.forward
    endDir = norm2([fx, fz])
  } else {
    const [tx, , tz] = pathTangent(path.end)
    endDir = norm2([tx, tz])
  }

  const legs: { clip: [number, number][]; base: [number, number][]; rect: OrientedBox }[] = []
  for (let k = 0; k < pts.length - 1; k++) {
    const d = norm2(sub2(pts[k + 1], pts[k]))
    const a: [number, number] = [-d[1], d[0]]
    const startLine: [number, number] =
      k === 0
        ? u
        : (() => {
            const dp = norm2(sub2(pts[k], pts[k - 1]))
            return norm2(add2([-dp[1], dp[0]], a))
          })()
    const endLine: [number, number] =
      k === pts.length - 2
        ? endDir
        : (() => {
            const dn = norm2(sub2(pts[k + 2], pts[k + 1]))
            return norm2(add2(a, [-dn[1], dn[0]]))
          })()

    const side = (s: number) => add2(pts[k], mul2(a, (s * width) / 2))
    const clip: [number, number][] = [
      meet2(side(-1), d, pts[k], startLine),
      meet2(side(-1), d, pts[k + 1], endLine),
      meet2(side(1), d, pts[k + 1], endLine),
      meet2(side(1), d, pts[k], startLine),
    ]

    const band = (s: number) => add2(pts[k], mul2(a, s * (0.5 - LIVED_PATH.baseInset) * width))
    // The free end's base stops short of the clip by the same inset, so the strokes, not the flat base, meet the lane
    const baseEnd = k === pts.length - 2 ? sub2(pts[k + 1], mul2(d, LIVED_PATH.baseInset * width)) : pts[k + 1]
    const base: [number, number][] = [
      meet2(band(-1), d, pts[k], startLine),
      meet2(band(-1), d, baseEnd, endLine),
      meet2(band(1), d, baseEnd, endLine),
      meet2(band(1), d, pts[k], startLine),
    ]

    const sValues = clip.map((c) => dot2(sub2(c, pts[k]), d))
    const s0 = Math.min(...sValues)
    const s1 = Math.max(...sValues)
    const origin = add2(add2(pts[k], mul2(d, s0)), mul2(a, -width / 2))
    const rect: OrientedBox = {
      ox: origin[0],
      oz: origin[1],
      ux: d[0],
      uz: d[1],
      nx: a[0],
      nz: a[1],
      u0: 0,
      u1: s1 - s0,
      k0: 0,
      k1: width,
    }

    legs.push({ clip, base, rect })
  }
  return legs
}

export function pathClearings(): OrientedBox[] {
  return doorPathLegs().flatMap((p) => pathLegShapes(p).map((s) => s.rect))
}

export const STREET_OBJECTS: readonly { kind: 'bench' | 'pot' | 'pail'; house: string; a: number; k: number; side: -1 | 1 }[] = [
  { kind: 'bench', house: 'L2', a: 0.19, k: 0.025, side: 1 },
  { kind: 'pot', house: 'R4', a: 0.2, k: 0.021, side: 1 },
  { kind: 'pail', house: 'L4', a: 0.196, k: 0.018, side: 1 },
]

export function objectPlaces(): {
  kind: 'bench' | 'pot' | 'pail'
  house: string
  index: number
  centre: [number, number]
  frame: ReturnType<typeof doorStepFrame>
}[] {
  return STREET_OBJECTS.map((obj) => {
    const index = STREET_HOUSES.findIndex((h) => h.id === obj.house)
    const h = STREET_HOUSES[index]
    const frame = doorStepFrame(h, index)
    const door = doorOf(h, index)
    const a = obj.side === -1 ? 2 * door.cu * h.w - obj.a : obj.a
    const centre: [number, number] = [
      frame.ox + a * frame.ux + obj.k * frame.nx,
      frame.oz + a * frame.uz + obj.k * frame.nz,
    ]
    return { kind: obj.kind, house: obj.house, index, centre, frame }
  })
}

export function objectClearings(): OrientedBox[] {
  return objectPlaces().map((p) => {
    const spec = STREET_OBJECTS.find((o) => o.kind === p.kind)!
    const h = STREET_HOUSES[p.index]
    const door = doorOf(h, p.index)
    const a = spec.side === -1 ? 2 * door.cu * h.w - spec.a : spec.a
    const box = p.kind === 'bench' ? [0.1, 0.03] : p.kind === 'pot' ? [0.022, 0.022] : [0.016, 0.016]
    return {
      ox: p.frame.ox,
      oz: p.frame.oz,
      ux: p.frame.ux,
      uz: p.frame.uz,
      nx: p.frame.nx,
      nz: p.frame.nz,
      u0: a - box[0] / 2,
      u1: a + box[0] / 2,
      k0: spec.k - box[1] / 2,
      k1: spec.k + box[1] / 2,
    }
  })
}

export function houseFrame(h: StreetHouse): { along: Vector3; toPath: Vector3 } {
  const thetaRad = (h.theta * Math.PI) / 180
  const along = new Vector3(Math.cos(h.yaw), 0, Math.sin(h.yaw))
  const [fx, , fz] = STREET.forward
  const [rx, rz] = [-fz, fx]
  const toPath = new Vector3(
    -h.side * (Math.cos(thetaRad) * rx - Math.sin(thetaRad) * fx),
    0,
    -h.side * (Math.cos(thetaRad) * rz - Math.sin(thetaRad) * fz),
  )
  return { along, toPath }
}

export function doorOf(h: { type?: StreetHouse['type']; storeys: number }, index: number): { cu: number; w: number; h: number } {
  if (h.type === 'cottage') {
    return { cu: index % 2 ? 0.34 : 0.66, w: 0.16, h: 0.85 }
  }
  return { cu: 0.5, w: 0.2, h: 0.6 / h.storeys }
}

/** A door's step on the ground: the drawn front's s = 0 corner (ox, oz), its unit u along the drawn front (ux, uz), its
 * unit normal out to the lane (nx, nz), and the door's span along u in world units (ws0, ws1) */
export function doorStepFrame(h: StreetHouse, index: number): { ox: number; oz: number; ux: number; uz: number; nx: number; nz: number; ws0: number; ws1: number } {
  const { along, toPath } = houseFrame(h)
  const flip = -along.z * toPath.x + along.x * toPath.z < 0
  const u = flip ? -1 : 1
  const ux = u * along.x
  const uz = u * along.z
  const toPathLen = Math.hypot(toPath.x, toPath.z)
  const nx = toPath.x / toPathLen
  const nz = toPath.z / toPathLen
  const ox = h.x + toPath.x * (h.d / 2) - ux * (h.w / 2)
  const oz = h.z + toPath.z * (h.d / 2) - uz * (h.w / 2)
  const door = doorOf(h, index)
  const s0 = door.cu - door.w / 2
  const s1 = door.cu + door.w / 2
  const ws0 = h.w * s0
  const ws1 = h.w * s1
  return { ox, oz, ux, uz, nx, nz, ws0, ws1 }
}

export function doorStepFoot(h: StreetHouse, index: number): [number, number][] {
  const { ox, oz, ux, uz, nx, nz, ws0, ws1 } = doorStepFrame(h, index)
  const corner = (ws: number, k: number): [number, number] => [
    ox + ux * ws + nx * k,
    oz + uz * ws + nz * k,
  ]
  return [corner(ws0, 0), corner(ws1, 0), corner(ws1, STEP.depth), corner(ws0, STEP.depth)]
}

export const STREET_WALLS = [
  { side: -1 as const, t0: 0.06, t1: 0.22 },
  { side: 1 as const, t0: 0.14, t1: 0.41 },
  { side: -1 as const, t0: 0.54, t1: 0.84 },
] as const

/**
 * Dry-stone wall dimensions and clearing parameters (K2, Codex F6):
 * - inner: lateral of the lane face
 * - thickness: wall depth perpendicular to lane
 * - height: wall height in y
 * - segment: longest segment in t for subdivision
 * - clearingOverlap: clearing rectangle's end overlap in u
 */
export const STREET_WALL = {
  inner: 0.135,
  thickness: 0.03,
  height: 0.055,
  segment: 0.02,
  clearingOverlap: 0.002,
} as const

export const STREET_RAIL = {
  house: 'L2',
  back: 0.03,
  depth: 0.12,
  margin: 0.02,
  gap: 0.02,
} as const

/**
 * The garden rail round L2's front, as its four chains in the door frame's `(a, k)` pairs (a along the front, k out
 * toward the lane): `gardenRail` builds its posts and rails on them, and Vincent's legs may not cross them. The front
 * chain is open at the door, a gap wide.
 */
export function railChains(): { frame: ReturnType<typeof doorStepFrame>; chains: [number, number][][] } {
  const l2Index = STREET_HOUSES.findIndex((h) => h.id === STREET_RAIL.house)
  const h = STREET_HOUSES[l2Index]
  const frame = doorStepFrame(h, l2Index)
  const door = doorOf(h, l2Index)
  const W = h.w
  const g = door.w * W + STREET_RAIL.gap
  const a0 = door.cu * W - g / 2
  const a1 = door.cu * W + g / 2
  const chains: [number, number][][] = [
    [[-STREET_RAIL.margin, STREET_RAIL.back], [-STREET_RAIL.margin, STREET_RAIL.depth]],
    [[-STREET_RAIL.margin, STREET_RAIL.depth], [a0, STREET_RAIL.depth]],
    [[a1, STREET_RAIL.depth], [W + STREET_RAIL.margin, STREET_RAIL.depth]],
    [[W + STREET_RAIL.margin, STREET_RAIL.depth], [W + STREET_RAIL.margin, STREET_RAIL.back]],
  ]
  return { frame, chains }
}

export const STREET_LAMPS = [
  { t: 0.1, lateral: 0.11 },
  { t: 0.24, lateral: -0.11 },
  { t: 0.38, lateral: 0.11 },
  { t: 0.55, lateral: -0.11 },
  { t: 0.65, lateral: 0.11 },
  { t: 0.79, lateral: -0.11 },
  { t: 1.0, lateral: 0.2 },
] as const

export type OrientedBox = {
  ox: number
  oz: number
  ux: number
  uz: number
  nx: number
  nz: number
  u0: number
  u1: number
  k0: number
  k1: number
}

export function stepClearings(): OrientedBox[] {
  return STREET_HOUSES.map((h, i) => {
    const { ox, oz, ux, uz, nx, nz, ws0, ws1 } = doorStepFrame(h, i)
    return { ox, oz, ux, uz, nx, nz, u0: ws0, u1: ws1, k0: 0, k1: STEP.depth }
  })
}

export function wallClearings(): OrientedBox[] {
  const rectangles: OrientedBox[] = []
  for (const { side, t0, t1 } of STREET_WALLS) {
    const n = Math.ceil((t1 - t0) / STREET_WALL.segment)
    const dt = (t1 - t0) / n
    for (let i = 0; i < n; i++) {
      const ta = t0 + i * dt
      const tb = t0 + (i + 1) * dt
      const q0 = laneAt(ta, side * STREET_WALL.inner)
      const q1 = laneAt(tb, side * STREET_WALL.inner)
      const q2 = laneAt(tb, side * (STREET_WALL.inner + STREET_WALL.thickness))
      const q3 = laneAt(ta, side * (STREET_WALL.inner + STREET_WALL.thickness))
      const o = [q0.x, q0.z]
      const d = [q1.x - o[0], q1.z - o[1]]
      const len = Math.hypot(d[0], d[1])
      const u = [d[0] / len, d[1] / len]
      let nVec = [-u[1], u[0]]
      if (nVec[0] * (q3.x - o[0]) + nVec[1] * (q3.z - o[1]) < 0) {
        nVec = [-nVec[0], -nVec[1]]
      }
      const corners = [q0, q1, q2, q3]
      const uv = corners.map((p) => {
        const x = p.x - o[0]
        const z = p.z - o[1]
        return [x * u[0] + z * u[1], x * nVec[0] + z * nVec[1]]
      })
      rectangles.push({
        ox: o[0],
        oz: o[1],
        ux: u[0],
        uz: u[1],
        nx: nVec[0],
        nz: nVec[1],
        u0: Math.min(...uv.map((p) => p[0])) - STREET_WALL.clearingOverlap,
        u1: Math.max(...uv.map((p) => p[0])) + STREET_WALL.clearingOverlap,
        k0: Math.min(...uv.map((p) => p[1])),
        k1: Math.max(...uv.map((p) => p[1])),
      })
    }
  }
  return rectangles
}

export function streetClearings(): OrientedBox[] {
  return [...stepClearings(), ...wallClearings(), ...pathClearings(), ...objectClearings()]
}

// The square: map (500, 300), radius 0.25
const squareWorld = mapToWorld(500, 300)
export const STREET_SQUARE = {
  x: squareWorld.x,
  z: squareWorld.z,
  radius: 0.25,
} as const

/**
 * The church in the round (`tasks/2026-10-25-street-church-plan.md`, Mark: "at the end of the stop it looks pretty
 * flat"). `turn` is added to the yaw that faces it back down the lane. Yaw increasing turns `along` from +x toward +z,
 * so the gable's normal swings to the walker's left and the +along side, moonlit, opens toward stop 4's camera, which
 * stands right of the axis. `setback` keeps the turned front corners outside the square's circle (0.234 from its
 * centre, against 0.215 without it). `stroke` is the church's brush, `recess` the door's depth, and `hidden` the faces
 * no sampled pose of the walk sees, clad thin.
 */
export const CHURCH = {
  turn: 0.45,
  setback: 0.02,
  /** the church's brush: every face's `refHeight`, against the nave's eave 0.24 */
  stroke: 0.16,
  /** the door's depth into the front wall (the church plan (e)) */
  recess: 0.02,
  /** the +along side's windows, their centres across the wall */
  windows: [0.25, 0.5, 0.75],
  /** the density of the faces no sampled pose of the walk sees (the face probe, `scripts/street-church.test.ts`) */
  thin: 0.25,
  hidden: [
    'church/back',
    'church/left',
    'church/back gable',
    'church/left roof',
    'belfry/wall 2',
    'belfry/wall 3',
    'spire/side 2',
    'spire/side 3',
  ],
} as const

// The church: nave centre = square centre + (0.25 + nave.d / 2 + setback) * forward
// facing back down the lane, turned: yaw = atan2(forward.x, -forward.z) + turn
const naveD = VILLAGE_CHURCH.nave.d
const churchX = squareWorld.x + (0.25 + naveD / 2 + CHURCH.setback) * fx
const churchZ = squareWorld.z + (0.25 + naveD / 2 + CHURCH.setback) * fz
const churchYaw = Math.atan2(forward.x, -forward.z) + CHURCH.turn

const dx0 = VILLAGE_CHURCH.belfry.cx - VILLAGE_CHURCH.nave.x
const dz0 = VILLAGE_CHURCH.belfry.cz - VILLAGE_CHURCH.nave.z
const yaw0 = VILLAGE_CHURCH.nave.yaw
const belfryLocalX = dx0 * Math.cos(yaw0) + dz0 * Math.sin(yaw0)
const belfryLocalZ = -dx0 * Math.sin(yaw0) + dz0 * Math.cos(yaw0)

const belfryCx = churchX + belfryLocalX * Math.cos(churchYaw) - belfryLocalZ * Math.sin(churchYaw)
const belfryCz = churchZ + belfryLocalX * Math.sin(churchYaw) + belfryLocalZ * Math.cos(churchYaw)

/** The front wall's centre at the ground, the door's foot: the nave's centre half its depth along the gable's normal. */
export function churchFront(): Vector3 {
  return new Vector3(churchX - Math.sin(churchYaw) * (naveD / 2), 0, churchZ + Math.cos(churchYaw) * (naveD / 2))
}

export const STREET_CHURCH = {
  nave: {
    ...VILLAGE_CHURCH.nave,
    x: churchX,
    z: churchZ,
    yaw: churchYaw,
  },
  belfry: {
    ...VILLAGE_CHURCH.belfry,
    cx: belfryCx,
    cz: belfryCz,
    yaw: churchYaw,
  },
  spireTip: {
    ...VILLAGE_CHURCH.spireTip,
  },
} as const

// Three trees (Step 5): olive-church (440, 610), orchard-lower (720, 240), olive-right (270, 240), each moved the fewest
// whole map pixels that keep its built crown 0.025 clear of every house, over the layout test's floor of 0.02 (Codex
// T2: pass 7's crowns reach 1.39–1.41 R, and olive-right's reached into L5). Church slice 1, Task 3: the two flanking
// trees stand close against the nave, as the painting's do, at (666, 181) and (308, 184): the fewest pixels moved that
// leave a crown 0.049 and 0.048 from the nave and no crown triangle, swaying, within reach of a line of sight to the
// door, the windows or the peak (`scratch/church-animals-2026-10-29/t0/tree-search.log`, `scripts/street-church.test.ts`)
const TREE_SPECS = [
  { id: 'olive-church', mapX: 451, mapY: 607 },
  { id: 'orchard-lower', mapX: 666, mapY: 181 },
  { id: 'olive-right', mapX: 308, mapY: 184 },
] as const

export const STREET_TREES: readonly LandMass[] = TREE_SPECS.map((spec) => {
  const base = LAND_MASSES.find((m) => m.id === spec.id)
  if (!base) throw new Error(`Missing tree template ${spec.id}`)
  const pos = mapToWorld(spec.mapX, spec.mapY)
  return {
    ...base,
    x: pos.x,
    z: pos.z,
  }
})

// Stop 0 composition for the cypress
// Cam 0 stands at pathPoint(0) - pathTangent(0) * STREET.behind at STREET.eye
const p0 = pathPoint(0)
const t0 = pathTangent(0)
const cam0Pos = new Vector3(p0[0] - t0[0] * STREET.behind, STREET.eye, p0[2] - t0[2] * STREET.behind)
// the nave's place before the church slice's setback, so stop 0 stays as Mark passed it
const toNave0 = new Vector3(churchX - CHURCH.setback * fx - cam0Pos.x, 0, churchZ - CHURCH.setback * fz - cam0Pos.z).normalize()

function rotateY(v: Vector3, deg: number): Vector3 {
  const rad = (deg * Math.PI) / 180
  const c = Math.cos(rad)
  const s = Math.sin(rad)
  return new Vector3(v.x * c + v.z * s, v.y, -v.x * s + v.z * c)
}

const landscapeHeading0 = rotateY(toNave0, 9)
const cypressDir = rotateY(landscapeHeading0, 26)
const cypressWorld = cam0Pos.clone().addScaledVector(cypressDir, 0.9)

export const STREET_CYPRESS = {
  x: cypressWorld.x,
  z: cypressWorld.z,
  height: 0.9,
} as const

export const STREET_CYPRESS_AT = [STREET_CYPRESS.x, 0, STREET_CYPRESS.z] as const

export function streetGroundAt(x: number, z: number): number {
  void x
  void z
  return 0
}

export const STOP0_CAMERA: readonly [number, number, number] = [cam0Pos.x, cam0Pos.y, cam0Pos.z] as const

/** The street's cypress keeps every fourth sample of each ribbon: the Lead read strides 1 to 4 at stop 0 at 1:1 and the
 * tree read the same (`scratch/street-s1b-2026-10-23/t5/stride-sheet-desktop.png`), 143,232 triangles against 537,816. */
export const STREET_CYPRESS_STRIDE = 4

export const STATION_T = [0, 0.23, 0.44, 0.66, 0.9] as const
export const WALK_T = { min: 0, max: 0.9 } as const
export const LANE_JOINS: readonly number[] = lanePath
  .getCurveLengths()
  .slice(0, -1)
  .map((len) => len / measuredLength)
export const WALK_ROUND = 0.02

function smoothstep(edge0: number, edge1: number, x: number): number {
  const k = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)))
  return k * k * (3 - 2 * k)
}

export function walkTangent(t: number): [number, number, number] {
  for (const j of LANE_JOINS) {
    const d = Math.abs(t - j)
    if (d < WALK_ROUND) {
      const p = pathPoint(t + WALK_ROUND)
      const q = pathPoint(t - WALK_ROUND)
      const sx = p[0] - q[0]
      const sz = p[2] - q[2]
      const sn = Math.hypot(sx, sz)
      const secX = sx / sn
      const secZ = sz / sn
      const weight = 1 - smoothstep(0, WALK_ROUND, d)
      const [tx, , tz] = pathTangent(t)
      const vx = tx + (secX - tx) * weight
      const vz = tz + (secZ - tz) * weight
      const vn = Math.hypot(vx, vz)
      return [vx / vn, 0, vz / vn]
    }
  }
  return pathTangent(t)
}

export function stationPose(
  i: 0 | 1 | 2 | 3 | 4,
  portrait: boolean,
): {
  position: [number, number, number]
  target: [number, number, number]
  fov: number
  near: number
  far: number
} {
  const t = STATION_T[i]
  const [px, , pz] = pathPoint(t)
  const [tx, , tz] = pathTangent(t)
  const position: [number, number, number] = [
    px - tx * STREET.behind,
    STREET.eye,
    pz - tz * STREET.behind,
  ]

  let target: [number, number, number]
  if (i === 0) {
    const heading = portrait ? rotateY(toNave0, 17) : landscapeHeading0
    target = [
      position[0] + heading.x * 0.6,
      STREET.lookHeight,
      position[2] + heading.z * 0.6,
    ]
  } else if (i < 4) {
    const targetT = t + 0.6 / measuredLength
    const [tgtX, , tgtZ] = pathPoint(targetT)
    target = [tgtX, STREET.lookHeight, tgtZ]
  } else {
    // Stop 4: the front wall's centre, the door's foot
    const { x: frontWallX, z: frontWallZ } = churchFront()
    const D = Math.hypot(frontWallX - position[0], frontWallZ - position[2])
    const eave = VILLAGE_CHURCH.nave.eave
    const pitch = VILLAGE_CHURCH.nave.pitch
    const camPitch = (Math.atan((eave + pitch - STREET.eye) / D) - Math.atan(STREET.eye / D)) / 2
    const targetHeight = STREET.eye + D * Math.tan(camPitch)
    target = [frontWallX, targetHeight, frontWallZ]
  }

  return {
    position,
    target,
    fov: portrait ? STREET.fov.portrait : STREET.fov.landscape,
    near: STREET.near,
    far: STREET.far,
  }
}

export type StationPose = ReturnType<typeof stationPose>

export function walkPose(t: number, portrait: boolean): StationPose {
  const [px, , pz] = pathPoint(t)
  const [tx, , tz] = walkTangent(t)
  const position: [number, number, number] = [
    px - tx * STREET.behind,
    STREET.eye,
    pz - tz * STREET.behind,
  ]
  const [ax, , az] = pathPoint(t + 0.6 / measuredLength)
  let target: [number, number, number] = [ax, STREET.lookHeight, az]
  const s0 = stationPose(0, portrait)
  const s4 = stationPose(4, portrait)
  const rel = (s: StationPose): [number, number, number] => [
    s.target[0] - s.position[0] + position[0],
    s.target[1],
    s.target[2] - s.position[2] + position[2],
  ]
  const rel0 = rel(s0)
  const rel4 = rel(s4)
  const w0 = 1 - smoothstep(STATION_T[0], STATION_T[1], t)
  target = [
    target[0] + (rel0[0] - target[0]) * w0,
    target[1] + (rel0[1] - target[1]) * w0,
    target[2] + (rel0[2] - target[2]) * w0,
  ]
  const w4 = smoothstep(STATION_T[3], STATION_T[4], t)
  target = [
    target[0] + (rel4[0] - target[0]) * w4,
    target[1] + (rel4[1] - target[1]) * w4,
    target[2] + (rel4[2] - target[2]) * w4,
  ]
  return {
    position,
    target,
    fov: portrait ? STREET.fov.portrait : STREET.fov.landscape,
    near: STREET.near,
    far: STREET.far,
  }
}

export const VINCENT_RIG = {
  ahead: 0.4,
  lateral: 0.03,
  lateralEnd: 0.07,
  height: 0.085,
  halfWidth: 0.025,
  halfDepth: 0.02,
} as const

export function vincentPlace(t: number): {
  position: [number, number, number]
  yaw: number
} {
  const tv = t + VINCENT_RIG.ahead / measuredLength
  const lat =
    VINCENT_RIG.lateral +
    (VINCENT_RIG.lateralEnd - VINCENT_RIG.lateral) *
      smoothstep(STATION_T[3], STATION_T[4], t)
  const [vx, , vz] = pathPoint(tv)
  const [tx, , tz] = walkTangent(tv)
  return {
    position: [vx - tz * lat, 0, vz + tx * lat],
    yaw: Math.atan2(tx, tz),
  }
}

export function vincentBoxCorners(t: number): [number, number, number][] {
  const { position } = vincentPlace(t)
  const tv = t + VINCENT_RIG.ahead / measuredLength
  const [tx, , tz] = walkTangent(tv)
  return vincentBoxCornersAt(position, [tx, tz])
}

/** The rig box's corners where he stands, facing `forward` (a unit vector on the ground): the lane's slot, or off the lane */
export function vincentBoxCornersAt(position: [number, number, number], forward: [number, number]): [number, number, number][] {
  const [tx, tz] = forward
  const rx = -tz
  const rz = tx
  const corners: [number, number, number][] = []
  for (const s of [-1, 1]) {
    for (const f of [-1, 1]) {
      for (const y of [0, VINCENT_RIG.height]) {
        corners.push([
          position[0] + rx * (s * VINCENT_RIG.halfWidth) + tx * (f * VINCENT_RIG.halfDepth),
          y,
          position[2] + rz * (s * VINCENT_RIG.halfWidth) + tz * (f * VINCENT_RIG.halfDepth),
        ])
      }
    }
  }
  return corners
}

/**
 * The corners of his tap rect: the rig box's, and with `figure` the corners of his rendered figure's bounds too, so a tap
 * on any part of him in any pose lands on him (V1 Decision (d)). `figure` is in the street's frame, as the box is.
 */
export function vincentTapCorners(
  t: number,
  figure: { min: [number, number, number]; max: [number, number, number] } | null,
  rig: [number, number, number][] = vincentBoxCorners(t),
): [number, number, number][] {
  const corners = [...rig]
  if (!figure) return corners
  for (const x of [figure.min[0], figure.max[0]]) {
    for (const y of [figure.min[1], figure.max[1]]) {
      for (const z of [figure.min[2], figure.max[2]]) corners.push([x, y, z])
    }
  }
  return corners
}

/**
 * The street's triangle budget: 1,444,930 ceiling − 660,388 non-street share (Task 0, station 4 mobile, scratch/street-s1b-2026-10-23/t0/numbers.md)
 * − 143,232 street cypress at stride 4 (Task 5 report, scratch/street-s1b-2026-10-23/t5/cap/4-desktop-frames.json) = 641,310.
 */
export const STREET_TRIANGLE_BUDGET = 641310

export const DETAIL = { lane: 0.6, house: 0.46 }

const stationCameras = ([0, 1, 2, 3, 4] as const).map((i) => stationPose(i, false).position)

export function detailOf(x: number, z: number, threshold = DETAIL.house): 1 | 0.5 {
  for (const cam of stationCameras) {
    if (Math.hypot(x - cam[0], z - cam[2]) <= threshold) return 1
  }
  return 0.5
}

