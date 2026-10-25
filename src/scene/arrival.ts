import { DIORAMA_ORBIT } from './dioramaContract.ts'

/**
 * C, the arrival (`?arrival=1`, tasks/2026-10-20-arrival-c-plan.md): the painting on a dark ground with one line
 * from Vincent's letter, then it dissolves into the diorama, the sky starts to breathe and the camera pushes in to
 * the home pose. This module is the timeline, its clock and the camera's path; it is pure, so `scripts/arrival.test.ts`
 * runs it under node. The scene's driver (DioramaExperience.tsx) applies a frame's values.
 *
 * Plain `.ts` imports only.
 */

/** The timeline's constants, in seconds unless said. Logged in CLAUDE.md's Tunables. */
export const ARRIVAL = {
  /** the painting and the line, still */
  hold: 4,
  /** the line fades out, ending at `hold` */
  lineFade: 1,
  /** the layer fades and the scan grows, from `hold` */
  dissolve: 1.5,
  /** the scan's scale at the end of the dissolve */
  grow: 1.12,
  /**
   * the share of the dissolve over which the dark ground goes, before the scan does: the sky appears around the
   * painting first, then the painting melts into it. At equal speeds the scan's edge read as a hard frame over
   * the diorama half-way through (gate G5, 2026-10-20)
   */
  groundShare: 0.5,
  /** the sky's rate and the push start this long after `hold`, when the live sky is half revealed */
  lead: 0.75,
  /** the sky clock's rate eases 0 → 1 */
  breathe: 3,
  /** the camera's distance eases from `startDistance` to the home's */
  push: 4,
  /** inside DIORAMA_ORBIT.maxDistance (5.6) with a margin: the start pose is an authored camera, never clamped */
  startDistance: 5.55,
  /** the clock's speed after a tap, click or key: the whole arrival (8.75 s) ends within 1.1 s from any moment */
  skipSpeed: 8,
  /**
   * the longest frame the clock accepts. R3F hands over the raw delta, 30 s and more after a hidden tab, which
   * would collapse the opening into one frame and advance the sky by the whole gap (review F3)
   */
  maxDt: 0.1,
  /** how long the opening waits for the scene before it opens anyway: a failed asset cannot hold the curtain (review F5) */
  readyTimeout: 15,
  /** milliseconds: the title and the dock fade in once the arrival is done (CSS reads it as `--arrival-reveal`) */
  reveal: 600,
}

export type ArrivalFrame = {
  /** the scan's opacity */
  overlay: number
  /** the dark ground's opacity; gone before the scan is */
  ground: number
  /** the scan's scale */
  scale: number
  /** the line's opacity */
  line: number
  /** the sky clock's rate, 0 held .. 1 live */
  rate: number
  /** the push's progress, 0 at the start pose .. 1 at home */
  push: number
  done: boolean
}

export function smoothstep(x: number): number {
  const t = Math.min(1, Math.max(0, x))
  return t * t * (3 - 2 * t)
}

/** The arrival's end time: the push is the last stage. */
export const ARRIVAL_END = ARRIVAL.hold + ARRIVAL.lead + ARRIVAL.push

/** Every value of the arrival at time `a`; under reduced motion, the end state at any `a`. */
export function arrivalFrame(a: number, reduced = false): ArrivalFrame {
  if (reduced) return { overlay: 0, ground: 0, scale: 1, line: 1, rate: 1, push: 1, done: true }
  const { hold, lineFade, dissolve, grow, groundShare, lead, breathe, push } = ARRIVAL
  const fade = smoothstep((a - hold) / dissolve)
  return {
    overlay: 1 - fade,
    ground: 1 - smoothstep((a - hold) / (dissolve * groundShare)),
    scale: 1 + (grow - 1) * fade,
    line: 1 - smoothstep((a - (hold - lineFade)) / lineFade),
    rate: smoothstep((a - hold - lead) / breathe),
    push: smoothstep((a - hold - lead) / push),
    done: a >= ARRIVAL_END,
  }
}

type Home = { position: readonly [number, number, number]; target: readonly [number, number, number] }

/**
 * The camera on the home's own axis at the push's progress: the start pose at 0, the home tuple itself at 1 (the
 * same object, so the end is exact, not a lerp's last step). Along the axis the look direction is the home's, so
 * the camera-locked sky does not move during the push.
 */
export function arrivalCamera(home: Home, progress: number): readonly [number, number, number] {
  if (progress >= 1) return home.position
  const [tx, ty, tz] = home.target
  const dx = home.position[0] - tx
  const dy = home.position[1] - ty
  const dz = home.position[2] - tz
  const homeDistance = Math.hypot(dx, dy, dz)
  const distance = ARRIVAL.startDistance + (homeDistance - ARRIVAL.startDistance) * Math.max(0, progress)
  const k = distance / homeDistance
  return [tx + dx * k, ty + dy * k, tz + dz * k]
}

/** The start distance must sit inside the orbit's envelope, or the first frame would be a clamped camera. */
export const ARRIVAL_START_INSIDE_ORBIT =
  ARRIVAL.startDistance > DIORAMA_ORBIT.minDistance && ARRIVAL.startDistance < DIORAMA_ORBIT.maxDistance

const ARRIVED_KEY = 'starry-night:arrived'

/**
 * Once per session: a plain visit plays the opening the first time only, so a reload or a return within the tab's
 * life is not held 4 s again (Mark, 2026-10-20). Session storage can be unavailable (a private window, a blocked
 * store); then every visit plays it, which is the safe side.
 */
export function arrivedThisSession(): boolean {
  try {
    return typeof window !== 'undefined' && window.sessionStorage.getItem(ARRIVED_KEY) === '1'
  } catch {
    return false
  }
}

export function rememberArrived(): void {
  try {
    window.sessionStorage.setItem(ARRIVED_KEY, '1')
  } catch {
    /* no store: the next visit plays the opening again */
  }
}

/** The frame delta the arrival accepts: a hidden tab's 30 s becomes `maxDt`, a NaN becomes 0. */
export function boundedDt(dt: number): number {
  return Number.isFinite(dt) ? Math.min(Math.max(0, dt), ARRIVAL.maxDt) : 0
}

export type ArrivalInputs = {
  /** the frame's delta, seconds */
  dt: number
  /** the scene can be revealed: the sky's ribbons, the cypress and the scan are all there */
  ready: boolean
  /** a tap, click or key has asked to move on */
  skipRequested: boolean
  /** a capture's pin: an absolute time, taken as is */
  pinned?: number
  /** system reduced motion: the end state at once, no wait */
  reduced?: boolean
}

/**
 * The arrival clock. It waits for the scene with `a` at 0 (the layer opaque), opens anyway after `readyTimeout`
 * or on a skip, accepts at most `maxDt` per frame, runs `skipSpeed` times faster after a skip, and latches at the
 * end. A pin is absolute: a capture's pins go up only, and a lower pin reads as the caller's error.
 */
export class ArrivalClock {
  a = 0
  waited = 0
  done = false
  /**
   * The sky's advance this frame: the rate times the bounded delta while the arrival runs, including the frame that
   * reaches the end; null from the frame after, when the sky takes its own `dt` again. Released a frame late on
   * purpose: the sky reads it after the driver in the same frame, and a long frame at the very end would otherwise
   * jump the sky by the whole gap (Codex, code review F12).
   */
  step: number | null = 0
  tick({ dt, ready, skipRequested, pinned, reduced = false }: ArrivalInputs): number {
    if (this.done) {
      this.step = null
      return this.a
    }
    const bounded = boundedDt(dt)
    if (typeof pinned === 'number' && Number.isFinite(pinned)) {
      this.a = pinned
    } else {
      if (!reduced && !ready && !skipRequested && this.waited < ARRIVAL.readyTimeout) {
        this.waited += bounded
        this.step = 0
        return this.a
      }
      this.a += bounded * (skipRequested ? ARRIVAL.skipSpeed : 1)
    }
    const frame = arrivalFrame(this.a, reduced)
    this.done = frame.done
    this.step = frame.rate * bounded
    return this.a
  }
}
