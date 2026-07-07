export type FlamePoint = { x: number; y: number }

export const CYPRESS_FLAME_FINS = [
  { yaw: -0.38, height: 2.58, width: 0.44, z: -0.08 },
  { yaw: -0.2, height: 2.88, width: 0.52, z: -0.1 },
  { yaw: 0, height: 3.08, width: 0.55, z: -0.12 },
  { yaw: 0.18, height: 2.76, width: 0.48, z: -0.09 },
  { yaw: 0.36, height: 2.28, width: 0.4, z: -0.06 },
] as const

export function makeCypressFinOutline(seed: number): FlamePoint[] {
  const wobble = (i: number) => Math.sin(seed * 11.7 + i * 2.31) * 0.035
  return [
    { x: -0.34, y: 0 },
    { x: -0.46 + wobble(1), y: 0.12 },
    { x: -0.43 + wobble(2), y: 0.28 },
    { x: -0.31 + wobble(3), y: 0.44 },
    { x: -0.25 + wobble(4), y: 0.62 },
    { x: -0.14 + wobble(5), y: 0.78 },
    { x: -0.04 + wobble(6), y: 0.94 },
    { x: 0, y: 1 },
    { x: 0.08 + wobble(7), y: 0.9 },
    { x: 0.2 + wobble(8), y: 0.72 },
    { x: 0.28 + wobble(9), y: 0.54 },
    { x: 0.39 + wobble(10), y: 0.34 },
    { x: 0.42 + wobble(11), y: 0.16 },
    { x: 0.31, y: 0 },
  ]
}
