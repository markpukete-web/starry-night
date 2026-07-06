import { mulberry32 } from './brush.ts'

export type TerrainBlade = {
  position: [number, number, number]
  rotationY: number
  lean: number
  height: number
  width: number
  colourIndex: number
}

export type RidgeStone = {
  position: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
  colourIndex: number
}

export type CloudPuff = {
  position: [number, number, number]
  scale: [number, number, number]
  colourIndex: number
}

function hash2(x: number, y: number) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return s - Math.floor(s)
}

function vnoise(x: number, y: number) {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const xf = x - xi
  const yf = y - yi
  const u = xf * xf * (3 - 2 * xf)
  const v = yf * yf * (3 - 2 * yf)
  const a = hash2(xi, yi)
  const b = hash2(xi + 1, yi)
  const c = hash2(xi, yi + 1)
  const d = hash2(xi + 1, yi + 1)
  return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v
}

function smooth(e0: number, e1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)))
  return t * t * (3 - 2 * t)
}

export function dioramaTerrainHeight(x: number, z: number): number {
  const back = smooth(0.1, 1.3, -z)
  const bumps =
    (vnoise(x * 0.8 + 3, z * 0.8 + 7) - 0.5) * 0.2 +
    (vnoise(x * 1.7 + 9, z * 1.7 + 2) - 0.5) * 0.1
  return 0.26 * back + bumps
}

function inIslandFootprint(x: number, z: number) {
  const nx = x / 1.82
  const nz = z / 1.13
  return nx * nx + nz * nz <= 1
}

function villageClearance(x: number, z: number) {
  const village = Math.hypot((x - 0.08) / 1.15, (z - 0.58) / 0.42)
  const cypress = Math.hypot((x + 1.22) / 0.35, (z - 0.88) / 0.38)
  return village > 1 && cypress > 1
}

export function makeTerrainBlades(count = 420, seed = 0x5a77e1): TerrainBlade[] {
  const rng = mulberry32(seed)
  const blades: TerrainBlade[] = []
  let attempts = 0

  while (blades.length < count && attempts < count * 50) {
    attempts += 1
    const x = -1.78 + rng() * 3.56
    const z = -1.08 + rng() * 2.18
    if (!inIslandFootprint(x, z) || !villageClearance(x, z)) continue

    const backLift = smooth(-0.95, 0.95, -z)
    const height = 0.12 + rng() * 0.2 + backLift * 0.05
    const width = 0.024 + rng() * 0.026
    blades.push({
      position: [x, dioramaTerrainHeight(x, z) + 0.012, z],
      rotationY: rng() * Math.PI * 2,
      lean: -0.06 + rng() * 0.18,
      height,
      width,
      colourIndex: Math.floor(rng() * 4),
    })
  }

  return blades
}

export function makeRidgeStones(seed = 0x41a17): RidgeStone[] {
  const rng = mulberry32(seed)
  const path: [number, number][] = [
    [-0.95, 0.38], [-0.72, 0.18], [-0.45, 0.04], [-0.18, -0.03], [0.08, 0.02],
    [0.34, 0.16], [0.58, 0.34], [0.8, 0.52], [1.04, 0.38], [1.24, 0.18],
    [-0.38, 0.78], [0.05, 0.86], [0.42, 0.82], [0.9, 0.76],
  ]

  return path.map(([x, z], index) => ({
    position: [x, dioramaTerrainHeight(x, z) + 0.045, z] as [number, number, number],
    rotation: [rng() * 0.4, rng() * Math.PI, rng() * 0.3] as [number, number, number],
    scale: [
      0.045 + rng() * 0.05,
      0.018 + rng() * 0.026,
      0.035 + rng() * 0.058,
    ] as [number, number, number],
    colourIndex: index % 3,
  }))
}

export function makeCloudPuffs(): CloudPuff[] {
  return [
    { position: [-0.66, 1.45, -0.72], scale: [0.32, 0.13, 0.14], colourIndex: 0 },
    { position: [-0.38, 1.53, -0.78], scale: [0.42, 0.16, 0.18], colourIndex: 1 },
    { position: [-0.04, 1.48, -0.72], scale: [0.28, 0.12, 0.14], colourIndex: 0 },
    { position: [0.54, 1.26, -0.82], scale: [0.34, 0.13, 0.15], colourIndex: 2 },
    { position: [0.84, 1.32, -0.84], scale: [0.28, 0.11, 0.13], colourIndex: 1 },
  ]
}
