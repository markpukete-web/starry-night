import type { VillagePatchName } from './villagePatches.ts'

export type Pigment = 'wall' | 'pale' | 'roof' | 'sienna' | 'striped'

export type Building = {
  x: number
  z: number
  w: number
  d: number
  eave: number
  pitch: number
  yaw: number
  wall: Pigment
  roof: Pigment
  window?: 'front' | 'side'
  door?: boolean
  chimney?: boolean
  wallPatch: VillagePatchName
  roofPatch: VillagePatchName
}

export const VILLAGE_NEIGHBOURS: readonly Building[] = [
  {
    x: -0.34,
    z: 0.42,
    w: 0.21,
    d: 0.27,
    eave: 0.18,
    pitch: 0.14,
    yaw: 0.58,
    wall: 'pale',
    roof: 'roof',
    wallPatch: 'paleLeft',
    roofPatch: 'quietRoof',
    door: true,
  },
  {
    x: -0.66,
    z: 0.65,
    w: 0.28,
    d: 0.34,
    eave: 0.14,
    pitch: 0.115,
    yaw: 1.28,
    wall: 'wall',
    roof: 'sienna',
    wallPatch: 'blueWallA',
    roofPatch: 'siennaRoof',
    window: 'side',
  },
  {
    x: 0.39,
    z: 0.9,
    w: 0.31,
    d: 0.46,
    eave: 0.15,
    pitch: 0.155,
    yaw: 1.44,
    wall: 'wall',
    roof: 'striped',
    wallPatch: 'blueWallB',
    roofPatch: 'stripedRoof',
    window: 'side',
  },
  {
    x: 0.38,
    z: 0.43,
    w: 0.22,
    d: 0.29,
    eave: 0.22,
    pitch: 0.14,
    yaw: -0.26,
    wall: 'wall',
    roof: 'roof',
    wallPatch: 'blueWallC',
    roofPatch: 'blueRoof',
    chimney: true,
    window: 'front',
  },
] as const

export const VILLAGE_CONTEXT: readonly Building[] = [
  {
    x: 0.77,
    z: 0.585,
    w: 0.28,
    d: 0.26,
    eave: 0.2,
    pitch: 0.14,
    yaw: -0.3,
    wall: 'wall',
    roof: 'roof',
    wallPatch: 'blueWallD',
    roofPatch: 'navyRoofRight',
    window: 'front',
  },
  {
    x: 1.1,
    z: 0.415,
    w: 0.3,
    d: 0.26,
    eave: 0.22,
    pitch: 0.14,
    yaw: 0.32,
    wall: 'pale',
    roof: 'roof',
    wallPatch: 'paleLeft',
    roofPatch: 'brownRoof',
    window: 'front',
  },
  {
    x: -0.86,
    z: 0.35,
    w: 0.3,
    d: 0.26,
    eave: 0.2,
    pitch: 0.14,
    yaw: 0.1,
    wall: 'wall',
    roof: 'roof',
    wallPatch: 'blueWallLeft',
    roofPatch: 'blueRoofLeft',
    window: 'front',
  },
] as const

export const VILLAGE_CHURCH = {
  nave: {
    x: -0.036,
    z: 0.37,
    w: 0.26,
    d: 0.31,
    eave: 0.24,
    pitch: 0.185,
    yaw: 0.65,
    wall: 'pale' as Pigment,
    roof: 'roof' as Pigment,
    wallPatch: 'churchPlaster' as VillagePatchName,
    roofPatch: 'churchRoof' as VillagePatchName,
    door: true,
  },
  belfry: {
    cx: 0.066,
    cz: 0.235,
    width: 0.09,
    yaw: 0.65,
    floorDrop: 0.035,
    topY: 0.445,
  },
  spireTip: {
    dx: -0.012,
    y: 1.125,
    dz: -0.008,
  },
} as const
