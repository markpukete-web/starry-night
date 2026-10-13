import { useThree } from '@react-three/fiber'
import { useEffect, useRef, type RefObject } from 'react'
import { Quaternion, Vector3 } from 'three'
import { homeInverseQuaternion, skyPointFromRay, uvFromSkyDirection } from './dioramaSkyProjection'
import { touchTargets } from './skyTargets'
import {
  classifyGesture,
  hoverDue,
  nearestStar,
  pushFlare,
  pushKick,
  pushSurge,
  TOUCH_SURGE,
  type HoverMark,
  type PointerSample,
  type TouchStore,
} from './touchSurge'

/**
 * B — touch (tasks/2026-10-13-touch-b-plan.md, B1–B2): the pointer or a finger over the sky writes surges into the
 * store the sky reads. Manual listeners, not R3F's object events: the mapping is exact and cheap without
 * raycasting any mesh. `pointerdown` and `pointermove` on the element R3F connects events to (drei's OrbitControls
 * binds there too and never captures the pointer or prevents default, so one finger both orbits and trails);
 * `pointerup` and `pointercancel` on `window`, since a release off the canvas must still close a gesture
 * (review F5). A tap (down to up within 300 ms and 8 px) sends a strong surge with a tempo kick, and flares a
 * star it lands on; a hover or a drag trails gentle lift-only surges. Paused, the hook is off and the sky clears
 * the store.
 */
type TouchWindow = Window & {
  __touchState?: () => unknown
  __touchInject?: (u: number, v: number, amp: number, t0?: number, kick?: boolean) => void
  __camera?: () => { position: number[]; quaternion: number[] }
}

export function useTouchInput({
  enabled,
  store,
  clock,
  home,
  knob,
}: {
  enabled: boolean
  store: RefObject<TouchStore>
  /** The one sky clock (A3): a surge's t0 is its value at the event. */
  clock: RefObject<number>
  /** The home camera spec the sky is keyed to (the same object the sky takes). */
  home: { position: readonly [number, number, number]; target: readonly [number, number, number] }
  /** The `surge` knob: a multiplier on every amplitude. Read through a ref, so a slider never rebinds. */
  knob: number
}) {
  const { camera, gl, events } = useThree()
  const knobRef = useRef(knob)
  useEffect(() => {
    knobRef.current = knob
  }, [knob])

  useEffect(() => {
    if (!enabled) return
    const element = (events.connected as HTMLElement | null | undefined) ?? gl.domElement
    const canvas = gl.domElement
    const homeInverse = homeInverseQuaternion(home)
    const targets = touchTargets()
    const ndc = new Vector3()
    const direction = new Vector3()
    const hit = new Vector3()
    const toSky = new Quaternion()

    /** The painting point under a client position, or null off the sky. */
    const skyPoint = (clientX: number, clientY: number): [number, number] | null => {
      const rect = canvas.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) return null
      ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1, 0.5).unproject(camera)
      direction.copy(ndc).sub(camera.position).normalize()
      if (!skyPointFromRay(camera.position, direction, hit)) return null
      // the sky group's quaternion is camera × homeInverse (PaintingFlowSky3D); its inverse takes the hit into the sky's frame
      toSky.copy(camera.quaternion).multiply(homeInverse).invert()
      const [u, v] = uvFromSkyDirection(hit.applyQuaternion(toSky))
      if (v < -0.1 || v > 0.75 || u < -0.3 || u > 1.3) return null
      return [u, v]
    }

    const push = (u: number, v: number, amp: number, t0: number, kick: boolean) => {
      const s = store.current
      s.surges = pushSurge(s.surges, { u, v, t0, amp }, t0)
      if (kick) {
        s.kicks = pushKick(s.kicks, { u, v, t0, amp }, t0).kicks
        const star = nearestStar(u, v, targets)
        if (star >= 0) s.flares = pushFlare(s.flares, { index: star, t0 }, t0)
      }
      s.last = { u, v }
    }

    let down: PointerSample | null = null
    let lastHover: HoverMark | null = null
    const onMove = (event: PointerEvent) => {
      // a finger trails only while it is down; the mouse trails as it hovers and as it drags
      if (event.pointerType === 'touch' && !down) return
      const point = skyPoint(event.clientX, event.clientY)
      if (!point) return
      const now: HoverMark = { ms: event.timeStamp, u: point[0], v: point[1] }
      if (!hoverDue(lastHover, now)) return
      lastHover = now
      push(point[0], point[1], TOUCH_SURGE.hoverAmp * knobRef.current, clock.current, false)
    }
    const onDown = (event: PointerEvent) => {
      if (!event.isPrimary) return
      down = { x: event.clientX, y: event.clientY, ms: event.timeStamp }
    }
    const onUp = (event: PointerEvent) => {
      if (!down) return
      const start = down
      down = null
      if (classifyGesture(start, { x: event.clientX, y: event.clientY, ms: event.timeStamp }) !== 'tap') return
      const point = skyPoint(event.clientX, event.clientY)
      if (point) push(point[0], point[1], knobRef.current, clock.current, true)
    }
    const onCancel = () => {
      down = null
    }
    element.addEventListener('pointermove', onMove, { passive: true })
    element.addEventListener('pointerdown', onDown, { passive: true })
    window.addEventListener('pointerup', onUp, { passive: true })
    window.addEventListener('pointercancel', onCancel)
    document.addEventListener('visibilitychange', onCancel)

    // the gate's seams: the store as data, a surge at a known painting point with an explicit t0 (never the clock
    // ref's one-frame lag, review F10), and the camera, so a synthetic drag can be seen to orbit
    const w = window as TouchWindow
    w.__touchState = () => ({ ...store.current, knob: knobRef.current })
    w.__touchInject = (u, v, amp, t0 = clock.current, kick = false) => push(u, v, amp * knobRef.current, t0, kick)
    w.__camera = () => ({ position: camera.position.toArray(), quaternion: camera.quaternion.toArray() })

    return () => {
      element.removeEventListener('pointermove', onMove)
      element.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onCancel)
      document.removeEventListener('visibilitychange', onCancel)
      delete w.__touchState
      delete w.__touchInject
      delete w.__camera
    }
  }, [camera, clock, enabled, events, gl, home, store])
}
