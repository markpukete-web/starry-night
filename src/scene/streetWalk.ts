import { STATION_T, STREET, WALK_T } from './streetLayout.ts'

export const WALK = {
  keys: 0.15,
  auto: 0.08,
  cap: 0.5,
  wheel: 0.001,
  ease: 0.25,
  snap: 1e-4,
  stride: 0.04,
  bob: 0.0015,
  roll: 0.03,
  arm: 0.25,
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

export function gait(
  distance: number,
  speed: number,
  still: boolean,
): { lift: number; roll: number; arm: number } {
  if (still || speed === 0) {
    return { lift: 0, roll: 0, arm: 0 }
  }
  const k = Math.min(1, Math.max(0, speed / WALK.settle))
  const phi = (Math.PI * distance) / WALK.stride
  const lift = WALK.bob * Math.abs(Math.sin(phi)) * k
  const roll = WALK.roll * Math.sin(phi) * k
  const arm = WALK.arm * Math.cos(phi) * k
  return { lift, roll, arm }
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

/**
 * The form spike's walk (2026-10-28, `?vform=`, throwaway): Fable's consult, questions 3 and 5. The automatic walk
 * dwells 3 s at each station it reaches from below. In every mode he turns once he has not walked forward for 0.5 s,
 * eased in over 0.6 s and out over 0.3 s, and out again 0.45 s before a dwell ends, so he faces the lane before the
 * camera moves. He strides only walking forward and turned under 0.2: backward he stands, carried with the camera.
 */
export const FORM_WALK = {
  dwell: 3,
  rest: 0.5,
  turnIn: 0.6,
  turnOut: 0.3,
  turnGate: 0.2,
  endTurn: 0.45,
  body: Math.PI / 2,
  head: Math.PI / 4,
  bob: 0.003,
  roll: 0.015,
  arm: 0.12,
  leg: 0.35,
  pitch: 0.06,
  lag: 0.15,
  /** look pass 3: at rest he holds the lantern out in front, the arm raised this far, so its light reaches his face.
   * Look pass 6: 0.75, as 1.2 held the arm out level, a reach rather than a carry */
  raise: 0.75,
} as const

export type FormWalk = { dwell: number; rest: number; turn: number }

export function initialForm(): FormWalk {
  return { dwell: 0, rest: 0, turn: 0 }
}

/** The dwell and the rest on top of `stepWalk`'s result: the automatic walk's own step undone while a dwell runs, its
 * crossing of a station clamped onto it. The camera still reads only `t`. */
export function stepForm(prev: WalkState, next: WalkState, f: FormWalk, i: WalkInput, immediate: boolean): { next: WalkState; form: FormWalk } {
  const L = STREET.pathLength
  const autoOn = prev.auto && i.autoMode && !i.paused && !i.still
  let { t, target } = next
  let dwell = f.dwell
  if (autoOn && dwell > 0) {
    const autoT = (WALK.auto * i.dt) / L
    t = Math.max(WALK_T.min, t - autoT)
    target = Math.max(WALK_T.min, target - autoT)
    dwell = Math.max(0, dwell - i.dt)
  } else if (autoOn) {
    for (const st of STATION_T) {
      if (st < WALK_T.max && prev.t < st - 1e-6 && t >= st) {
        t = st
        target = st
        dwell = FORM_WALK.dwell
        break
      }
    }
  } else {
    dwell = 0
  }
  const deltaWorld = Math.abs(t - prev.t) * L
  const corrected = { ...next, t, target, distance: prev.distance + deltaWorld, speed: i.dt > 0 ? deltaWorld / i.dt : 0 }
  const rest = t - prev.t > 1e-7 ? 0 : f.rest + i.dt
  const want = rest > FORM_WALK.rest && !(dwell > 0 && dwell < FORM_WALK.endTurn) ? 1 : 0
  const rate = want > f.turn ? i.dt / FORM_WALK.turnIn : want < f.turn ? -i.dt / FORM_WALK.turnOut : 0
  // reduced motion and the still state: a standing figure, turned at once (Fable Q7)
  const turn = immediate ? 1 : Math.min(1, Math.max(0, f.turn + rate))
  return { next: corrected, form: { dwell, rest, turn } }
}

export function formGait(distance: number, speed: number, forward: boolean, turn: number): { lift: number; roll: number; arm: number; leg: number; pitch: number } {
  if (!forward || speed === 0 || turn >= FORM_WALK.turnGate) return { lift: 0, roll: 0, arm: 0, leg: 0, pitch: 0 }
  const k = Math.min(1, Math.max(0, speed / WALK.settle))
  const phi = (Math.PI * distance) / WALK.stride
  return {
    lift: FORM_WALK.bob * Math.abs(Math.sin(phi)) * k,
    roll: FORM_WALK.roll * Math.sin(phi) * k,
    arm: FORM_WALK.arm * Math.cos(phi) * k,
    leg: FORM_WALK.leg * Math.cos(phi) * k,
    pitch: FORM_WALK.pitch * k,
  }
}

/** The turn's ease: the body first, the head after it past a quarter of the turn, both smoothstepped. */
export function turnPose(turn: number, body: number = FORM_WALK.body, head: number = FORM_WALK.head): { body: number; head: number; raise: number } {
  const ease = (x: number) => x * x * (3 - 2 * x)
  return { body: body * ease(turn), head: head * ease(Math.min(1, Math.max(0, (turn - 0.25) / 0.75))), raise: FORM_WALK.raise * ease(turn) }
}
