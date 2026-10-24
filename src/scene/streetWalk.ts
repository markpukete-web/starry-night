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
