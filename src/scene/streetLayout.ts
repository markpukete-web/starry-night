import { CubicBezierCurve3, CurvePath, Vector3 } from 'three'
import { LAND_MASSES, type LandMass } from './landMasses.ts'
import type { StreetSourceName } from './streetStrokes.ts'
import {
  VILLAGE_CHURCH,
} from './villageKnot.ts'

export const MAP = {
  origin: [500, 1210] as const,
  scale: 0.0024,
  laneHalfWidth: 0.12,
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

// laneOffset sampled at 400 segments over t -0.2 to 1.0
const N_LANE_SAMPLES = 400
const laneSamples: [number, number, number][] = []
for (let i = 0; i <= N_LANE_SAMPLES; i++) {
  const t = -0.2 + (1.2 * i) / N_LANE_SAMPLES
  laneSamples.push(pathPoint(t))
}

export function laneOffset(x: number, z: number): number {
  let minDistance = Infinity
  let signedOffset = 0

  for (let i = 0; i < N_LANE_SAMPLES; i++) {
    const pA = laneSamples[i]
    const pB = laneSamples[i + 1]
    const dx = pB[0] - pA[0]
    const dz = pB[2] - pA[2]
    const lenSq = dx * dx + dz * dz

    const u = Math.max(0, Math.min(1, ((x - pA[0]) * dx + (z - pA[2]) * dz) / lenSq))
    const closestX = pA[0] + u * dx
    const closestZ = pA[2] + u * dz

    const dist = Math.hypot(x - closestX, z - closestZ)
    if (dist < minDistance) {
      minDistance = dist
      const vx = x - closestX
      const vz = z - closestZ
      const crossY = dx * vz - dz * vx
      const sign = crossY >= 0 ? 1 : -1
      signedOffset = sign * dist
    }
  }
  return signedOffset
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

// The square: map (500, 300), radius 0.25
const squareWorld = mapToWorld(500, 300)
export const STREET_SQUARE = {
  x: squareWorld.x,
  z: squareWorld.z,
  radius: 0.25,
} as const

// The church: nave centre = square centre + (0.25 + nave.d / 2) * forward
// facing back down the lane: yaw = atan2(forward.x, -forward.z)
const naveD = VILLAGE_CHURCH.nave.d
const churchX = squareWorld.x + (0.25 + naveD / 2) * fx
const churchZ = squareWorld.z + (0.25 + naveD / 2) * fz
const churchYaw = Math.atan2(forward.x, -forward.z)

const dx0 = VILLAGE_CHURCH.belfry.cx - VILLAGE_CHURCH.nave.x
const dz0 = VILLAGE_CHURCH.belfry.cz - VILLAGE_CHURCH.nave.z
const yaw0 = VILLAGE_CHURCH.nave.yaw
const belfryLocalX = dx0 * Math.cos(yaw0) + dz0 * Math.sin(yaw0)
const belfryLocalZ = -dx0 * Math.sin(yaw0) + dz0 * Math.cos(yaw0)

const belfryCx = churchX + belfryLocalX * Math.cos(churchYaw) - belfryLocalZ * Math.sin(churchYaw)
const belfryCz = churchZ + belfryLocalX * Math.sin(churchYaw) + belfryLocalZ * Math.cos(churchYaw)

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

// Three trees (Step 5): olive-church (440, 610), orchard-lower (720, 240), olive-right (270, 240)
const TREE_SPECS = [
  { id: 'olive-church', mapX: 440, mapY: 610 },
  { id: 'orchard-lower', mapX: 720, mapY: 240 },
  { id: 'olive-right', mapX: 270, mapY: 240 },
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
const toNave0 = new Vector3(churchX - cam0Pos.x, 0, churchZ - cam0Pos.z).normalize()

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

const [p0x, , p0z] = pathPoint(0)
const [t0x, , t0z] = pathTangent(0)
export const STOP0_CAMERA: readonly [number, number, number] = [
  p0x - t0x * STREET.behind,
  STREET.eye,
  p0z - t0z * STREET.behind,
] as const

const STATION_T = [0, 0.23, 0.44, 0.66, 0.9] as const

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
    // Stop 4: front wall centre of nave
    const frontWallX = churchX - fx * (naveD / 2)
    const frontWallZ = churchZ - fz * (naveD / 2)
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

