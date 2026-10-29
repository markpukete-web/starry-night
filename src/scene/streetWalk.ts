import { Box3, type Mesh, type Object3D } from 'three'
import { STATION_T, STREET, WALK_T } from './streetLayout.ts'

export const WALK = {
  keys: 0.15,
  auto: 0.08,
  cap: 0.5,
  wheel: 0.001,
  ease: 0.25,
  snap: 1e-4,
  stride: 0.04,
  bob: 0.003,
  roll: 0.015,
  arm: 0.12,
  leg: 0.35,
  pitch: 0.06,
  settle: 0.05,
  hitMin: 48,
} as const

export type WalkState = {
  t: number
  target: number
  auto: boolean
  distance: number
  speed: number
}

export type WalkInput = {
  dt: number
  wheelPx: number
  keys: -1 | 0 | 1
  autoMode: boolean
  paused: boolean
  still: boolean
}

export function initialWalk(t: number, autoMode: boolean): WalkState {
  const clamped = Math.min(WALK_T.max, Math.max(WALK_T.min, t))
  return {
    t: clamped,
    target: clamped,
    auto: autoMode,
    distance: 0,
    speed: 0,
  }
}

export function stepWalk(s: WalkState, i: WalkInput): WalkState {
  const L = STREET.pathLength
  const velWorld =
    i.keys * WALK.keys +
    (s.auto && i.autoMode && !i.paused && !i.still ? WALK.auto : 0)
  const velT = (velWorld * i.dt) / L

  let nextT = s.t + velT
  let nextTarget = s.target + velT

  const wheelT = (i.wheelPx * WALK.wheel) / L
  nextTarget += wheelT

  nextTarget = Math.min(WALK_T.max, Math.max(WALK_T.min, nextTarget))
  nextT = Math.min(WALK_T.max, Math.max(WALK_T.min, nextT))

  const capT = (WALK.cap * i.dt) / L
  const rest = Math.max(0, capT - Math.abs(velT))

  if (i.still) {
    nextT = nextTarget
  } else if (Math.abs(nextTarget - nextT) * L < WALK.snap) {
    nextT = nextTarget
  } else {
    const easeStep = (nextTarget - nextT) * (1 - Math.exp(-i.dt / WALK.ease))
    const clampedStep = Math.min(rest, Math.max(-rest, easeStep))
    nextT += clampedStep
    if (Math.abs(nextTarget - nextT) * L < WALK.snap) {
      nextT = nextTarget
    }
  }

  nextT = Math.min(WALK_T.max, Math.max(WALK_T.min, nextT))

  let nextAuto = s.auto
  if (nextT >= WALK_T.max) {
    nextAuto = false
  }

  const deltaT = nextT - s.t
  const deltaWorld = Math.abs(deltaT) * L
  const nextDistance = s.distance + deltaWorld
  const nextSpeed = i.dt > 0 ? deltaWorld / i.dt : 0

  return {
    t: nextT,
    target: nextTarget,
    auto: nextAuto,
    distance: nextDistance,
    speed: nextSpeed,
  }
}

export function stopWalk(s: WalkState): WalkState {
  return {
    ...s,
    target: s.t,
  }
}

export function nextStop(t: number): number {
  for (const st of STATION_T) {
    if (st > t + 1e-6) {
      return st
    }
  }
  return WALK_T.max
}

export function toggleWalk(s: WalkState, still: boolean): WalkState {
  if (still) {
    const nextT = nextStop(s.t)
    return {
      ...s,
      t: nextT,
      target: nextT,
      auto: false,
    }
  }
  const nextAuto = !s.auto
  return {
    ...s,
    auto: nextAuto,
    target: !nextAuto ? s.t : s.target,
  }
}

export function wheelPixels(
  e: { deltaY: number; deltaMode: number; ctrlKey: boolean },
  viewportHeight: number,
): number {
  if (e.ctrlKey) return 0
  if (e.deltaMode === 1) return e.deltaY * 16
  if (e.deltaMode === 2) return e.deltaY * viewportHeight
  return e.deltaY
}

/**
 * The painter's pause (V1, Mark 2026-10-28: "go with 90/45 and 4 s"). The automatic walk dwells `dwell` seconds at each
 * station it crosses from below, apart from the last. In every mode he turns once he has not walked forward for `rest`
 * seconds, eased in over `turnIn` and out over `turnOut`, and out again `endTurn` before a dwell ends, so he faces the
 * lane before the camera moves. He strides only walking forward and turned under `turnGate`.
 */
export const PAUSE = {
  dwell: 4,
  rest: 0.5,
  turnIn: 0.6,
  turnOut: 0.3,
  turnGate: 0.2,
  endTurn: 0.45,
  body: Math.PI / 2,
  head: Math.PI / 4,
  raise: 0.75,
  lag: 0.15,
  rearm: 0.01,
} as const

/** `last` is the station `t` of the last dwell, -1 at the start: crossing it starts no dwell (Decision (h)). */
export type Pause = { dwell: number; rest: number; turn: number; last: number }

export function initialPause(): Pause {
  return { dwell: 0, rest: 0, turn: 0, last: -1 }
}

/** the automatic walk runs: switched on, in its mode, neither paused nor still (`stepPause`'s test, and the wander's walk home, (p)) */
export function autoOn(s: WalkState, i: WalkInput): boolean {
  return s.auto && i.autoMode && !i.paused && !i.still
}

/**
 * The dwell and the rest on top of `stepWalk`'s result: the automatic walk's own step undone while a dwell runs, its
 * crossing of a station clamped onto it. The camera still reads only `t`. Only this function ends a dwell: input ends
 * it, and so does the automatic walk turning off. A blur keeps it, as it keeps the walk.
 */
export function stepPause(
  prev: WalkState,
  next: WalkState,
  p: Pause,
  i: WalkInput,
  immediate: boolean,
): { next: WalkState; pause: Pause } {
  const L = STREET.pathLength
  const running = autoOn(prev, i)
  let { t, target } = next
  let dwell = p.dwell
  let last = p.last
  if (i.wheelPx !== 0 || i.keys !== 0) dwell = 0
  if (t < last - PAUSE.rearm) last = -1
  if (running && dwell > 0) {
    dwell -= i.dt
    if (dwell < 1e-9) dwell = 0
    if (dwell > 0) {
      // no input in a dwell, so the step was the automatic walk's alone: put the state back as it was
      t = prev.t
      target = prev.target
    }
  } else if (running) {
    // only the automatic walk's own step makes a stop: a frame with input, or a scroll still easing in, carries him
    // past (Codex B2). On the automatic walk `target` equals `t` until a wheel moves it
    const automatic = i.wheelPx === 0 && i.keys === 0 && prev.target === prev.t
    for (const st of STATION_T) {
      if (automatic && st < WALK_T.max && st !== last && prev.t < st && t >= st) {
        t = st
        target = st
        dwell = PAUSE.dwell
        last = st
        break
      }
    }
  } else {
    dwell = 0
  }
  const deltaWorld = Math.abs(t - prev.t) * L
  const corrected = { ...next, t, target, distance: prev.distance + deltaWorld, speed: i.dt > 0 ? deltaWorld / i.dt : 0 }
  const rest = t - prev.t > 1e-7 ? 0 : p.rest + i.dt
  const want = rest > PAUSE.rest && !(dwell > 0 && dwell < PAUSE.endTurn) ? 1 : 0
  const rate = want > p.turn ? i.dt / PAUSE.turnIn : want < p.turn ? -i.dt / PAUSE.turnOut : 0
  // reduced motion and the still state: a standing figure, turned at once
  const turn = immediate ? 1 : Math.min(1, Math.max(0, p.turn + rate))
  return { next: corrected, pause: { dwell, rest, turn, last } }
}

export function gait(
  distance: number,
  speed: number,
  forward: boolean,
  turn: number,
): { lift: number; roll: number; arm: number; leg: number; pitch: number } {
  if (!forward || speed === 0 || turn >= PAUSE.turnGate) {
    return { lift: 0, roll: 0, arm: 0, leg: 0, pitch: 0 }
  }
  const k = Math.min(1, Math.max(0, speed / WALK.settle))
  const phi = (Math.PI * distance) / WALK.stride
  return {
    lift: WALK.bob * Math.abs(Math.sin(phi)) * k,
    roll: WALK.roll * Math.sin(phi) * k,
    arm: WALK.arm * Math.cos(phi) * k,
    leg: WALK.leg * Math.cos(phi) * k,
    pitch: WALK.pitch * k,
  }
}

/** The turn's ease: the body first, the head after it past a quarter of the turn, both smoothstepped. */
export function turnPose(turn: number): { body: number; head: number; raise: number } {
  const ease = (x: number) => x * x * (3 - 2 * x)
  return {
    body: PAUSE.body * ease(turn),
    head: PAUSE.head * ease(Math.min(1, Math.max(0, (turn - 0.25) / 0.75))),
    raise: PAUSE.raise * ease(turn),
  }
}

/** Each arm moves with the opposite leg (Decision (g)): the left arm raised at rest, the right never. */
export function limbs(
  g: ReturnType<typeof gait>,
  pose: ReturnType<typeof turnPose>,
): { armLeft: number; armRight: number; legLeft: number; legRight: number; hang: number } {
  const armLeft = g.arm - pose.raise
  return { armLeft, armRight: -g.arm, legLeft: -g.leg, legRight: g.leg, hang: -armLeft - g.pitch }
}

/** The lantern, hung plumb under the swinging hand, lags it as a pendulum. */
export function lag(swing: number, hang: number, dt: number): number {
  return swing + (hang - swing) * (1 - Math.exp(-dt / PAUSE.lag))
}

/** The pool's opacity: still under reduced motion. */
export function flicker(time: number, reduced: boolean): number {
  return reduced ? 1 : 0.96 + 0.04 * Math.sin(7.3 * time) * Math.sin(11.1 * time)
}

/**
 * His figure's world bounds, from his meshes only (Decision (d), Codex confirm 2): the union of `Box3.expandByObject` over
 * each mesh. A sprite is the lantern's halo, drawn facing the camera, so no box bounds it, and the halo is light on the
 * street, not his figure. Null when `root` holds no mesh.
 */
export function vincentFigureBounds(root: Object3D): { min: [number, number, number]; max: [number, number, number] } | null {
  const box = new Box3()
  root.traverse((o) => {
    if ((o as Mesh).isMesh) box.expandByObject(o)
  })
  return box.isEmpty() ? null : { min: box.min.toArray(), max: box.max.toArray() }
}

export function hitBox(
  box: { x0: number; y0: number; x1: number; y1: number },
  x: number,
  y: number,
): boolean {
  const minX = Math.min(box.x0, box.x1)
  const maxX = Math.max(box.x0, box.x1)
  const minY = Math.min(box.y0, box.y1)
  const maxY = Math.max(box.y0, box.y1)
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  const halfW = Math.max((maxX - minX) / 2, WALK.hitMin / 2)
  const halfH = Math.max((maxY - minY) / 2, WALK.hitMin / 2)
  return x >= cx - halfW && x <= cx + halfW && y >= cy - halfH && y <= cy + halfH
}

export type StreetGesture = { pointerId: number; vincent: boolean }

export let streetGesture: StreetGesture | null = null

export function setStreetGesture(g: StreetGesture | null): void {
  streetGesture = g
}

/**
 * His ground position (x, z) in the street's frame, written by the walk's frame loop every frame: his lane slot or, off the
 * lane, where the wander has him. Null with no walk running. The grass bends under it (the wander, Task 2).
 */
export let vincentGround: [number, number] | null = null

export function setVincentGround(p: [number, number] | null): void {
  vincentGround = p
}

export function admitGesture(
  box: { x0: number; y0: number; x1: number; y1: number } | null,
  x: number,
  y: number,
): 'vincent' | 'hand' {
  if (box && hitBox(box, x, y)) {
    return 'vincent'
  }
  return 'hand'
}
