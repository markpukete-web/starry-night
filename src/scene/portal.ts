import { boundedDt, smoothstep } from './arrival.ts'

/**
 * The portal, slice 4 (tasks/2026-10-25-street-portal-plan.md): the places the page can be in, the moves between them,
 * and the flight from the diorama down toward the village. Pure, so `scripts/portal.test.ts` runs it under node; the
 * driver in DioramaExperience.tsx applies it. Logged in CLAUDE.md's Tunables.
 *
 * Plain `.ts` imports only.
 */
export const PORTAL = {
  /** seconds: the camera from the visitor's orbit pose to `flightEnd` */
  flight: 2.4,
  /** seconds: the layer fades off the street once it is ready */
  fadeIn: 1.0,
  /** seconds: the layer fades off the diorama on the way back */
  fadeOut: 0.8,
  /** frames the street draws under the layer before the fade starts */
  settleFrames: 2,
  /** capture `v2`'s camera (scratch/explore-2026-10-23/village/): the closest the village still reads as paint (C11) */
  flightEnd: { position: [0.9, 0.35, 1.5], target: [0.4, 0.1, 0.2] } as Pose,
}

export type PortalPlace = 'diorama' | 'flying' | 'entering' | 'street' | 'leaving'
export type PortalEvent = 'enter' | 'flown' | 'ready' | 'failed' | 'timeout' | 'leave' | 'left'
export type Pose = { position: readonly [number, number, number]; target: readonly [number, number, number] }

/**
 * The moves (the plan's decision (a)). Under system reduced motion an entry cuts, with no flight. While the arrival
 * runs an entry is refused: its driver and the flight's would both write the camera (plan review F2).
 */
export function portalStep(place: PortalPlace, event: PortalEvent, { still = false, arriving = false } = {}): PortalPlace {
  switch (place) {
    case 'diorama':
      return event === 'enter' && !arriving ? (still ? 'entering' : 'flying') : place
    case 'flying':
      return event === 'flown' ? 'entering' : place
    case 'entering':
      return event === 'ready' ? 'street' : event === 'failed' || event === 'timeout' ? 'leaving' : place
    case 'street':
      return event === 'leave' ? 'leaving' : place
    case 'leaving':
      return event === 'left' ? 'diorama' : place
  }
}

export const streetMounted = (place: PortalPlace) => place === 'entering' || place === 'street'
export const dioramaVisible = (place: PortalPlace) => !streetMounted(place)
export const controlsEnabled = (place: PortalPlace) => place === 'diorama'

/** The flight's progress after a frame: a bounded step, so a hidden tab's 30 s frame moves it 0.1 s. */
export function flightStep(s: number, dt: number): number {
  return Math.min(1, s + boundedDt(dt) / PORTAL.flight)
}

/** The camera's pose at progress `s`: position and target eased by one smoothstep, the end poses exact. */
export function flightPose(from: Pose, to: Pose, s: number): Pose {
  if (s <= 0) return { position: from.position, target: from.target }
  if (s >= 1) return to
  const k = smoothstep(s)
  const lerp = (a: readonly number[], b: readonly number[]) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k] as const
  return { position: lerp(from.position, to.position), target: lerp(from.target, to.target) }
}
