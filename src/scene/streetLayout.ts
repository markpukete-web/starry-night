import { LAND_MASSES, type LandMass } from './landMasses.ts'
import {
  VILLAGE_CHURCH,
  VILLAGE_CONTEXT,
  VILLAGE_NEIGHBOURS,
  type Building,
} from './villageKnot.ts'

export const STREET = {
  pathLength: 1.2,
  eye: 0.09,
  behind: 0.18,
  lookAhead: 0.6,
  lookHeight: 0.06,
  near: 0.004,
  far: 48,
  fov: { landscape: 50, portrait: 75 },
  originA: [0, 0, 5.0] as const,
  wallRef: 0.2,
  forward: [-0.1041, 0, -0.9946] as const,
} as const

const BEND_ANGLE = (12 * Math.PI) / 180

export function pathTangent(t: number): [number, number, number] {
  const [fx, , fz] = STREET.forward
  const len = Math.hypot(fx, fz)
  const t0x = fx / len
  const t0z = fz / len
  const n0x = -t0z
  const n0z = t0x

  if (t <= 0.6) {
    return [t0x, 0, t0z]
  }
  const beta = t >= 0.7 ? BEND_ANGLE : BEND_ANGLE * ((t - 0.6) / 0.1)
  const cosB = Math.cos(beta)
  const sinB = Math.sin(beta)
  return [cosB * t0x + sinB * n0x, 0, cosB * t0z + sinB * n0z]
}

export function pathPoint(t: number): [number, number, number] {
  const L = STREET.pathLength
  const [fx, , fz] = STREET.forward
  const len = Math.hypot(fx, fz)
  const t0x = fx / len
  const t0z = fz / len
  const n0x = -t0z
  const n0z = t0x

  if (t <= 0.6) {
    return [t * L * t0x, 0, t * L * t0z]
  }

  const p06x = 0.6 * L * t0x
  const p06z = 0.6 * L * t0z

  if (t < 0.7) {
    const u = (t - 0.6) / 0.1
    const bu = BEND_ANGLE * u
    const intCos = Math.sin(bu) / BEND_ANGLE
    const intSin = (1 - Math.cos(bu)) / BEND_ANGLE
    const arcL = 0.1 * L
    return [
      p06x + arcL * (intCos * t0x + intSin * n0x),
      0,
      p06z + arcL * (intCos * t0z + intSin * n0z),
    ]
  }

  const intCosFull = Math.sin(BEND_ANGLE) / BEND_ANGLE
  const intSinFull = (1 - Math.cos(BEND_ANGLE)) / BEND_ANGLE
  const arcL = 0.1 * L
  const p07x = p06x + arcL * (intCosFull * t0x + intSinFull * n0x)
  const p07z = p06z + arcL * (intCosFull * t0z + intSinFull * n0z)

  const [t1x, , t1z] = pathTangent(0.7)
  const straightL = (t - 0.7) * L
  return [p07x + straightL * t1x, 0, p07z + straightL * t1z]
}

export type StreetHouse = Building & { side: -1 | 1; at: number }

const PROTOTYPES: readonly Building[] = [...VILLAGE_NEIGHBOURS, ...VILLAGE_CONTEXT]

const HOUSE_SPECS: readonly { side: -1 | 1; at: number }[] = [
  { side: -1, at: 0.05 },
  { side: 1, at: 0.12 },
  { side: -1, at: 0.25 },
  { side: 1, at: 0.33 },
  { side: -1, at: 0.45 },
  { side: 1, at: 0.53 },
  { side: -1, at: 0.65 },
  { side: 1, at: 0.72 },
] as const

export const STREET_HOUSES: readonly StreetHouse[] = HOUSE_SPECS.map((spec, i) => {
  const proto = PROTOTYPES[i % PROTOTYPES.length]
  const [px, , pz] = pathPoint(spec.at)
  const [tx, , tz] = pathTangent(spec.at)
  const [nx, , nz] = [-tz, 0, tx]
  const cx = px + nx * (spec.side * (0.1 + proto.d / 2))
  const cz = pz + nz * (spec.side * (0.1 + proto.d / 2))
  const yaw = Math.atan2(tz, tx)
  return {
    ...proto,
    x: cx,
    z: cz,
    yaw,
    side: spec.side,
    at: spec.at,
  }
})

const [endX, , endZ] = pathPoint(1)
const [endTx, , endTz] = pathTangent(1)
const churchX = endX + endTx * 0.2
const churchZ = endZ + endTz * 0.2
const churchYaw = Math.atan2(endTx, -endTz)

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

const TREE_SPECS = [
  { id: 'olive-church', t: 0.35, side: -1 as const, dist: 0.55 },
  { id: 'olive-right', t: 0.6, side: 1 as const, dist: 0.55 },
  { id: 'orchard-lower', t: 1.0, side: 1 as const, dist: 0.45 },
] as const

export const STREET_TREES: readonly LandMass[] = TREE_SPECS.map(spec => {
  const base = LAND_MASSES.find(m => m.id === spec.id)
  if (!base) throw new Error(`Missing tree template ${spec.id}`)
  const [px, , pz] = pathPoint(spec.t)
  const [tx, , tz] = pathTangent(spec.t)
  const [nx, , nz] = [-tz, 0, tx]
  return {
    ...base,
    x: px + nx * (spec.side * spec.dist),
    z: pz + nz * (spec.side * spec.dist),
  }
})

export function streetGroundAt(x: number, z: number): number {
  void x
  void z
  return 0
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
  const t = i * 0.25
  const [px, , pz] = pathPoint(t)
  const [tx, , tz] = pathTangent(t)
  const position: [number, number, number] = [
    px - tx * STREET.behind,
    STREET.eye,
    pz - tz * STREET.behind,
  ]

  let target: [number, number, number]
  if (i < 4) {
    target = [
      px + tx * STREET.lookAhead,
      STREET.lookHeight,
      pz + tz * STREET.lookAhead,
    ]
  } else {
    const doorX = churchX - endTx * (VILLAGE_CHURCH.nave.d / 2)
    const doorZ = churchZ - endTz * (VILLAGE_CHURCH.nave.d / 2)
    target = [doorX, 0.25, doorZ]
  }

  return {
    position,
    target,
    fov: portrait ? STREET.fov.portrait : STREET.fov.landscape,
    near: STREET.near,
    far: STREET.far,
  }
}
