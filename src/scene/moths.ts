import type { Vector3 } from 'three'
import { mulberry32 } from './brush.ts'
import { LAMP_LIGHT } from './streetLife.ts'

/**
 * The moths round the lamps and the lit windows (church-owl plan, Task 2; the design's decision (m) and fact 10): a few
 * pale moths, each looping through a rest point on its glass's frame. The loop runs on the CPU, one function the test
 * runs at any time, and the billboard and the wing's beat are in the shader (`StreetMoths.tsx`).
 */
export const MOTHS = {
  /** a moth's quad, world units: a giant peacock moth's 12 cm, inside the species' 10 to 15 (fact 10) */
  size: [0.006, 0.0045] as [number, number],
  /** the paint: the lantern's lit mean mixed this far toward white (look pass 1: in the lantern's own amber the moths
   * read as sparks off the glass; a moth's wings in lamplight are a pale cream) */
  pale: 0.6,
  perLamp: 3,
  perWindow: 2,
  /** a window's moths are drawn while its glass is within this of the camera */
  windowReach: 0.6,
  /** the loop: a circle through the rest point, this far across at most, this long a lap, with a vertical wobble */
  radius: [0.02, 0.05] as [number, number],
  period: [1.2, 2.5] as [number, number],
  wobble: 0.006,
  /** look pass 5 (Mark: the moths' smooth loops read as the fireflies' drift): the loop's angle lurches by this ×
   * sin(3θ), so a moth runs at −0.5 to 2.5 of its mean speed, stalls, darts and doubles back three times a lap */
  lurch: 0.5,
  /** and shakes: two sines a world axis, `jitter` at `jitterHz[0]` and half that at `jitterHz[1]`, scaled by sin²(θ/2)
   * so they are zero at the rest point. Never more than 1.5√3 × 0.0045 = 0.0117 off the loop, under the least radius
   * 0.02, so the moth never comes nearer the glass than its rest point */
  jitter: 0.0045,
  jitterHz: [5.3, 8.7] as [number, number],
  /** the wings' beat, seconds a cycle (5 to 8 a second) */
  flap: [0.12, 0.2] as [number, number],
  /** the rest point: out from the lantern's centre past its 0.012 square's half-diagonal (0.0085) by 0.002 at any
   * yaw (Codex F6), or off the window's glass */
  rest: 0.0105,
  restWindow: 0.003,
  /** brightness 1 at the glass, falling to `dimFloor` at the halo's edge (`LAMP_LIGHT.halo` is the sprite's side) */
  dimRadius: LAMP_LIGHT.halo / 2,
  dimFloor: 0.15,
} as const

type V3 = [number, number, number]

export type MothSpec = {
  glass: V3
  anchor: V3
  /** the horizontal unit direction from the glass to the rest point */
  u: [number, number]
  radius: number
  period: number
  phase: number
  flap: number
  flapPhase: number
  window: boolean
}

/** Three moths a lamp, then two a lit window, from one seed: lamps first in the given order, then windows. */
export function mothSpecs(
  lamps: readonly { lantern: Vector3 }[],
  windows: readonly { centre: Vector3; normal: Vector3 }[],
): MothSpec[] {
  const rand = mulberry32(0x3074)
  const between = ([a, b]: readonly [number, number]) => a + rand() * (b - a)
  const specs: MothSpec[] = []
  const add = (glass: Vector3, u: [number, number], window: boolean) => {
    const rest = window ? MOTHS.restWindow : MOTHS.rest
    specs.push({
      glass: [glass.x, glass.y, glass.z],
      anchor: [glass.x + u[0] * rest, glass.y, glass.z + u[1] * rest],
      u,
      radius: between(MOTHS.radius),
      period: between(MOTHS.period),
      phase: rand() * 2 * Math.PI,
      flap: between(MOTHS.flap),
      flapPhase: rand() * 2 * Math.PI,
      window,
    })
  }
  for (const lamp of lamps) {
    for (let k = 0; k < MOTHS.perLamp; k++) {
      const yaw = rand() * 2 * Math.PI
      add(lamp.lantern, [Math.sin(yaw), Math.cos(yaw)], false)
    }
  }
  for (const w of windows) {
    for (let k = 0; k < MOTHS.perWindow; k++) add(w.centre, [w.normal.x, w.normal.z], true)
  }
  return specs
}

/**
 * Every moth's place at `time`, three floats each into `out`. A circle through the rest point (`v` the horizontal
 * across `u`), run at a lurching speed, with a vertical wobble and a jitter that are zero at the rest point, so it is
 * there once a lap, never nearer the glass than it, and never farther than `rest + radius + wobble + 1.5√3 jitter`.
 * At `time <= 0` every moth is at its anchor.
 */
export function mothPositions(specs: readonly MothSpec[], time: number, out: Float32Array): void {
  const [f1, f2] = MOTHS.jitterHz
  specs.forEach((s, i) => {
    if (time <= 0) {
      out.set(s.anchor, i * 3)
      return
    }
    const even = (2 * Math.PI * time) / s.period + s.phase
    const theta = even + MOTHS.lurch * Math.sin(3 * even)
    const outward = (s.radius / 2) * (1 - Math.cos(theta))
    const side = (s.radius / 2) * Math.sin(theta)
    const shake = MOTHS.jitter * Math.sin(theta / 2) ** 2
    // each axis its own phases from the moth's two seeds
    const j = (k: number) => shake * (Math.sin(2 * Math.PI * f1 * time + s.phase * (k + 2)) + 0.5 * Math.sin(2 * Math.PI * f2 * time + s.flapPhase * (k + 3)))
    // v = up × u = (u.z, 0, -u.x)
    out[i * 3] = s.anchor[0] + s.u[0] * outward + s.u[1] * side + j(0)
    out[i * 3 + 1] = s.anchor[1] + MOTHS.wobble * Math.sin(2 * theta) + j(1)
    out[i * 3 + 2] = s.anchor[2] + s.u[1] * outward - s.u[0] * side + j(2)
  })
}

/** 1 at the glass, falling to `dimFloor` at the halo's edge. It depends on the glass's distance alone, never on the camera. */
export function mothBright(distanceFromGlass: number): number {
  return Math.max(MOTHS.dimFloor, 1 - distanceFromGlass / MOTHS.dimRadius)
}
