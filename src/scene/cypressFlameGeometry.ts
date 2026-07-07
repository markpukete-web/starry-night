export type FlamePoint = { x: number; y: number }

export const CYPRESS_FLAME_FINS = [
  { yaw: -0.42, height: 2.82, width: 0.58, z: -0.14 },
  { yaw: -0.22, height: 3.06, width: 0.66, z: -0.16 },
  { yaw: 0, height: 3.18, width: 0.72, z: -0.18 },
  { yaw: 0.2, height: 2.94, width: 0.62, z: -0.15 },
  { yaw: 0.4, height: 2.46, width: 0.5, z: -0.1 },
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
