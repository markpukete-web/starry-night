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
  /** the automatic walk's direction: 1 up the lane, -1 down it (the walk's end, D1) */
  dir: 1 | -1
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

/** a walk that opens at its end is not running (D1) */
export function initialWalk(t: number, autoMode: boolean): WalkState {
  const clamped = Math.min(WALK_T.max, Math.max(WALK_T.min, t))
  return {
    t: clamped,
    target: clamped,
    auto: autoMode && clamped < WALK_T.max,
    dir: 1,
    distance: 0,
    speed: 0,
  }
}

/**
 * One frame of the walk. The automatic walk moves `t` in `dir` and turns off at the end it walks toward (D2). A key or
 * a wheel that moves him up the lane sets `dir` to 1, so he faces up it. One that moves him down leaves `dir` alone,
 * so with `dir` 1 he still slides back turned, as V1 passed.
 */
export function stepWalk(s: WalkState, i: WalkInput): WalkState {
  const L = STREET.pathLength
  const wheelT = (i.wheelPx * WALK.wheel) / L
  const dir = i.keys > 0 || wheelT > 0 ? 1 : s.dir
  const velWorld =
    i.keys * WALK.keys +
    (s.auto && i.autoMode && !i.paused && !i.still ? dir * WALK.auto : 0)
  const velT = (velWorld * i.dt) / L

  let nextT = s.t + velT
  let nextTarget = s.target + velT

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
  if (dir === 1 ? nextT >= WALK_T.max : nextT <= WALK_T.min) {
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
    dir,
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

function prevStop(t: number): number {
  for (let k = STATION_T.length - 1; k >= 0; k--) {
    if (STATION_T[k] < t - 1e-6) return STATION_T[k]
  }
  return WALK_T.min
}

/**
 * A tap on him (D3). With `autoMode`, outside the still state, at the end `dir` points to with the walk stopped, it
 * turns him: `dir` flips and the automatic walk starts back. Anywhere else, and always without `autoMode`, it toggles
 * the automatic walk and keeps `dir`. In the still state it goes to the next station in `dir`, flipping `dir` first at
 * its end. The pause's `last` is left alone: `stepPause`'s re-arm clears it (D4).
 */
export function toggleWalk(s: WalkState, still: boolean, autoMode: boolean): WalkState {
  const atEnd = s.dir === 1 ? s.t >= WALK_T.max : s.t <= WALK_T.min
  const flipped = s.dir === 1 ? -1 : 1
  if (still) {
    const dir = atEnd ? flipped : s.dir
    const nextT = dir === 1 ? nextStop(s.t) : prevStop(s.t)
    return {
      ...s,
      t: nextT,
      target: nextT,
      auto: false,
      dir,
    }
  }
  if (autoMode && atEnd && !s.auto) return { ...s, auto: true, dir: flipped }
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
 * station it crosses from below, apart from the last. On the walk back it dwells at each it crosses from above, apart
 * from stop 0 (D4). In every mode he turns once he has not walked the way he faces for `rest` seconds, eased in over
 * `turnIn` and out over `turnOut`, and out again `endTurn` before a dwell ends, so he faces the lane before the camera
 * moves. He strides only walking the way he faces and turned under `turnGate`. `about` is the half-turn's time (D5).
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
  about: 0.8,
} as const

/**
 * `last` is the station `t` of the last dwell, -1 at the start: crossing it starts no dwell (Decision (h)). `about` is
 * his facing, 0 up the lane and 1 down it (D5).
 */
export type Pause = { dwell: number; rest: number; turn: number; last: number; about: number }

export function initialPause(): Pause {
  return { dwell: 0, rest: 0, turn: 0, last: -1, about: 0 }
}

/** the automatic walk runs: switched on, in its mode, neither paused nor still (`stepPause`'s test, and the wander's walk home, (p)) */
export function autoOn(s: WalkState, i: WalkInput): boolean {
  return s.auto && i.autoMode && !i.paused && !i.still
}

/**
 * The dwell and the rest on top of `stepWalk`'s result: the automatic walk's own step undone while a dwell runs, its
 * crossing of a station clamped onto it. The camera still reads only `t`. On the lane only this function ends a dwell: input ends
 * it, and so does the automatic walk turning off. Off the lane, `StreetWalk`'s frame loop zeroes it. A blur keeps it, as it keeps the walk.
 * It also turns him to face `dir` (D5): `about` eases over `PAUSE.about`, and the automatic walk's own step waits for it.
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
  const dir = next.dir
  // the half-turn: every frame that starts with `about` short of its end for `dir`. Reduced motion and the still state
  // set it at once
  const end = dir === 1 ? 0 : 1
  const halfTurn = !immediate && p.about !== end
  const about = immediate ? end : Math.min(1, Math.max(0, p.about + (dir === 1 ? -i.dt : i.dt) / PAUSE.about))
  let { t, target } = next
  let dwell = p.dwell
  let last = p.last
  if (i.wheelPx !== 0 || i.keys !== 0) dwell = 0
  // a level test in the walk's direction: after a turn at either end it clears `last` on the first frame (D4)
  if (dir === 1 ? t < last - PAUSE.rearm : t > last + PAUSE.rearm) last = -1
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
    if (automatic && halfTurn) {
      // he turns before he walks: the automatic walk's own step undone, as a dwell undoes it (D5)
      t = prev.t
      target = prev.target
    } else {
      // the walk back dwells at each station it crosses from above, apart from stop 0, where it ends (D4)
      for (const st of STATION_T) {
        const crossed = dir === 1 ? st < WALK_T.max && prev.t < st && t >= st : st > WALK_T.min && prev.t > st && t <= st
        if (automatic && st !== last && crossed) {
          t = st
          target = st
          dwell = PAUSE.dwell
          last = st
          break
        }
      }
    }
  } else {
    dwell = 0
  }
  const deltaWorld = Math.abs(t - prev.t) * L
  const corrected = { ...next, t, target, distance: prev.distance + deltaWorld, speed: i.dt > 0 ? deltaWorld / i.dt : 0 }
  // the rest counts while he does not walk the way he faces, so a back key still slides him back turned (V1, D5)
  const rest = facesMotion(prev.t, t, about) || about !== p.about ? 0 : p.rest + i.dt
  const want = rest > PAUSE.rest && !(dwell > 0 && dwell < PAUSE.endTurn) ? 1 : 0
  const rate = want > p.turn ? i.dt / PAUSE.turnIn : want < p.turn ? -i.dt / PAUSE.turnOut : 0
  // in the half-turn the lantern waits for `about`'s midpoint, then lowers to 0 as `about` ends (D5, N3)
  const past = dir === 1 ? about < 0.5 : about > 0.5
  const halfTurnTurn = past ? Math.max(0, p.turn - i.dt / (PAUSE.about / 2)) : p.turn
  // reduced motion and the still state: a standing figure, turned at once
  const turn = immediate ? 1 : halfTurn ? halfTurnTurn : Math.min(1, Math.max(0, p.turn + rate))
  return { next: corrected, pause: { dwell, rest, turn, last, about } }
}

/** he moves the way he faces: up the lane facing up it, or down it facing down it (D7) */
export function facesMotion(prevT: number, t: number, about: number): boolean {
  return about < 0.5 ? t - prevT > 1e-7 : prevT - t > 1e-7
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

const ease = (x: number) => x * x * (3 - 2 * x)

/** his facing on the lane: his slot's yaw, turned by π as `about` goes from 0 to 1 (D6) */
export function laneFacing(slotYaw: number, about: number): number {
  return slotYaw + Math.PI * ease(about)
}

/**
 * The turn's ease: the body first, the head after it past a quarter of the turn, both smoothstepped. Facing down the
 * lane both are mirrored, continuously in `about`, so at a dwell he turns to the same side of the lane both ways (D6).
 */
export function turnPose(turn: number, about = 0): { body: number; head: number; raise: number } {
  const mirror = 1 - 2 * ease(about)
  return {
    body: PAUSE.body * ease(turn) * mirror,
    head: PAUSE.head * ease(Math.min(1, Math.max(0, (turn - 0.25) / 0.75))) * mirror,
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
 * lane, where the wander has him. Null with no walk running, and under `?vincent=0`. The grass bends under it (the wander, Task 2).
 */
export let vincentGround: [number, number] | null = null

export function setVincentGround(p: [number, number] | null): void {
  vincentGround = p
}

export type HeldKeys = { forward: boolean; back: boolean }

/**
 * The walk's held keys. macOS sends no keyup for a key released while Cmd is down (the audit's item 11c, from the
 * platform's known behaviour, not a run here), so a Cmd chord holds nothing, and Cmd's own release lets go of both.
 */
export function keyDown(held: HeldKeys, e: { code: string; metaKey: boolean }): HeldKeys {
  if (e.metaKey) return held
  if (e.code === 'ArrowUp' || e.code === 'KeyW') return { ...held, forward: true }
  if (e.code === 'ArrowDown' || e.code === 'KeyS') return { ...held, back: true }
  return held
}

export function keyUp(held: HeldKeys, e: { code: string; key: string }): HeldKeys {
  if (e.key === 'Meta') return { forward: false, back: false }
  if (e.code === 'ArrowUp' || e.code === 'KeyW') return { ...held, forward: false }
  if (e.code === 'ArrowDown' || e.code === 'KeyS') return { ...held, back: false }
  return held
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
