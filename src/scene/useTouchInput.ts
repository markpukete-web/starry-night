import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef, type RefObject } from 'react'
import { Box3, Quaternion, Raycaster, Vector2, Vector3, type Object3D } from 'three'
import { homeInverseQuaternion, skyPointFromRay, uvFromSkyDirection } from './dioramaSkyProjection'
import { beginHeld, emptyLandStore, followHeld, LAND_MESHES, LAND_OCCLUDERS, LAND_TOUCH, landPick, pruneLand, pushTap, releaseHeld, type LandStore } from './landTouch'
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
 *
 * D1 — touch the land (tasks/2026-10-20-touch-land-d1-plan.md, D1.4): with `land`, the pointer is also cast at the
 * land's opaque bodies with their occluders (landTouch.ts, `landPick`), once per frame on its latest position
 * (Codex F8), and a press at once (F2). Over land the held touch follows the hand; off it, the held touch is
 * released and swings. With `landMasksSky`, a hand on the tree moves the tree and does not surge the sky behind
 * it (F9: at bend 0 there is no land touch and no masking, so B is exactly today's). A leave, a cancel or a hidden
 * tab releases the held touch (F3). The land meshes are looked up by name when needed, since the tree and the
 * land mount after their loads; `__landState().found` says which are there.
 */
type TouchWindow = Window & {
  __touchState?: () => unknown
  __touchInject?: (u: number, v: number, amp: number, t0?: number, kick?: boolean) => void
  __camera?: () => { position: number[]; quaternion: number[] }
  __landState?: () => unknown
  __landInject?: (x: number, y: number, z: number, amp: number, t0?: number, hold?: boolean) => void
  __landBounds?: () => { name: string; x: number; y: number; w: number; h: number }[]
}

type Pointer = { x: number; y: number; down: boolean; finger: boolean; dirty: boolean; overLand: boolean }

export function useTouchInput({
  enabled,
  store,
  clock,
  home,
  knob,
  land,
}: {
  enabled: boolean
  store: RefObject<TouchStore>
  /** The one sky clock (A3): a surge's t0 is its value at the event. */
  clock: RefObject<number>
  /** The home camera spec the sky is keyed to (the same object the sky takes). */
  home: { position: readonly [number, number, number]; target: readonly [number, number, number] }
  /** The `surge` knob: a multiplier on every amplitude. Read through a ref, so a slider never rebinds. */
  knob: number
  /** D1: the land-touch store and the `bend` knob; absent, the hook is B's. */
  land?: { store: RefObject<LandStore>; bendGain: number }
}) {
  const { camera, gl, events, scene } = useThree()
  const knobRef = useRef(knob)
  useEffect(() => {
    knobRef.current = knob
  }, [knob])
  const bendRef = useRef(land?.bendGain ?? 0)
  useEffect(() => {
    bendRef.current = land?.bendGain ?? 0
  }, [land?.bendGain])
  const landStore = land?.store
  const pointer = useRef<Pointer>({ x: 0, y: 0, down: false, finger: false, dirty: false, overLand: false })
  /** the effect's land hit test, for the frame loop */
  const landPointRef = useRef<((clientX: number, clientY: number) => [number, number, number] | null) | null>(null)

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
    const p = pointer.current

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

    // D1: the land's bodies and their occluders, by name, looked up when needed (they mount after their loads)
    const raycaster = new Raycaster()
    const ndc2 = new Vector2()
    const found = new Map<string, Object3D>()
    const byName = (name: string): Object3D | undefined => {
      const cached = found.get(name)
      if (cached) return cached
      const object = scene.getObjectByName(name)
      if (object) found.set(name, object)
      return object
    }
    const landActive = () => landStore !== undefined && bendRef.current > 0
    /** The world point under a client position when the nearest opaque body there is land, else null. */
    const landPoint = (clientX: number, clientY: number): [number, number, number] | null => {
      if (!landActive()) return null
      const rect = canvas.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) return null
      const landMeshes = LAND_MESHES.map(byName).filter((o): o is Object3D => o !== undefined)
      if (!landMeshes.length) return null
      const occluders = LAND_OCCLUDERS.map(byName).filter((o): o is Object3D => o !== undefined)
      ndc2.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1)
      raycaster.setFromCamera(ndc2, camera)
      return landPick(raycaster.intersectObjects([...landMeshes, ...occluders], false), landMeshes)
    }
    landPointRef.current = landPoint
    const releaseLand = () => {
      if (landStore && landStore.current.heldIndex >= 0) landStore.current = releaseHeld(landStore.current, clock.current)
      p.overLand = false
      p.dirty = false
    }

    let down: PointerSample | null = null
    let lastHover: HoverMark | null = null
    const onMove = (event: PointerEvent) => {
      // a finger trails only while it is down; the mouse trails as it hovers and as it drags
      if (event.pointerType === 'touch' && !down) return
      p.x = event.clientX
      p.y = event.clientY
      p.finger = event.pointerType === 'touch'
      p.dirty = true
      // D1: over land as of the last frame's test, the move is the land's (landMasksSky), not the sky's
      if (p.overLand && LAND_TOUCH.landMasksSky && landActive()) return
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
      p.x = event.clientX
      p.y = event.clientY
      p.down = true
      p.finger = event.pointerType === 'touch'
      // D1 (F2): a press begins its hold at once, so a still finger bends what it rests on
      const point = landPoint(event.clientX, event.clientY)
      p.overLand = point !== null
      if (point && landStore) landStore.current = followHeld(landStore.current, point, 1, clock.current)
    }
    const onUp = (event: PointerEvent) => {
      p.down = false
      if (!down) return
      const start = down
      down = null
      const gesture = classifyGesture(start, { x: event.clientX, y: event.clientY, ms: event.timeStamp })
      // D1: any up releases a held land touch (its swing); a tap on land is that release, and masks the sky's tap
      if (landActive() && landStore) {
        const point = gesture === 'tap' ? landPoint(event.clientX, event.clientY) : null
        if (landStore.current.heldIndex >= 0) landStore.current = releaseHeld(landStore.current, clock.current)
        else if (point) landStore.current = pushTap(landStore.current, point, 1, clock.current)
        p.overLand = false
        if (point && LAND_TOUCH.landMasksSky) return
      }
      if (gesture !== 'tap') return
      const point = skyPoint(event.clientX, event.clientY)
      if (point) push(point[0], point[1], knobRef.current, clock.current, true)
    }
    const onCancel = () => {
      down = null
      p.down = false
      releaseLand()
    }
    // D1 (F3): a hover that leaves the canvas lets go
    const onLeave = () => releaseLand()
    element.addEventListener('pointermove', onMove, { passive: true })
    element.addEventListener('pointerdown', onDown, { passive: true })
    element.addEventListener('pointerleave', onLeave, { passive: true })
    window.addEventListener('pointerup', onUp, { passive: true })
    window.addEventListener('pointercancel', onCancel)
    document.addEventListener('visibilitychange', onCancel)

    // the gate's seams: the store as data, a surge at a known painting point with an explicit t0 (never the clock
    // ref's one-frame lag, review F10), and the camera, so a synthetic drag can be seen to orbit
    const w = window as TouchWindow
    w.__touchState = () => ({ ...store.current, knob: knobRef.current })
    w.__touchInject = (u, v, amp, t0 = clock.current, kick = false) => push(u, v, amp * knobRef.current, t0, kick)
    w.__camera = () => ({ position: camera.position.toArray(), quaternion: camera.quaternion.toArray() })
    // D1's: the land store as data with the meshes found, a touch at a world point with an explicit t0 (held or a
    // tap), and the land meshes' screen rects at the current camera (the gate's mask)
    w.__landState = () => ({ ...(landStore?.current ?? emptyLandStore()), bendGain: bendRef.current, found: [...LAND_MESHES, ...LAND_OCCLUDERS].filter((name) => byName(name) !== undefined) })
    w.__landInject = (x, y, z, amp, t0 = clock.current, hold = false) => {
      if (!landStore) return
      landStore.current = hold ? beginHeld(landStore.current, [x, y, z], amp, t0) : pushTap(landStore.current, [x, y, z], amp, t0)
    }
    w.__landBounds = () => {
      const rect = canvas.getBoundingClientRect()
      const box = new Box3()
      const corner = new Vector3()
      return LAND_MESHES.map(byName)
        .filter((o): o is Object3D => o !== undefined)
        .map((mesh) => {
          box.setFromObject(mesh)
          let minX = Infinity
          let minY = Infinity
          let maxX = -Infinity
          let maxY = -Infinity
          for (let i = 0; i < 8; i++) {
            corner.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).project(camera)
            const sx = ((corner.x + 1) / 2) * rect.width
            const sy = ((1 - corner.y) / 2) * rect.height
            minX = Math.min(minX, sx)
            minY = Math.min(minY, sy)
            maxX = Math.max(maxX, sx)
            maxY = Math.max(maxY, sy)
          }
          return { name: mesh.name, x: minX, y: minY, w: maxX - minX, h: maxY - minY }
        })
    }

    return () => {
      element.removeEventListener('pointermove', onMove)
      element.removeEventListener('pointerdown', onDown)
      element.removeEventListener('pointerleave', onLeave)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onCancel)
      document.removeEventListener('visibilitychange', onCancel)
      landPointRef.current = null
      delete w.__touchState
      delete w.__touchInject
      delete w.__camera
      delete w.__landState
      delete w.__landInject
      delete w.__landBounds
    }
  }, [camera, clock, enabled, events, gl, home, store, scene, landStore])

  // D1: the land store's one owner, at a fixed priority before the sky's loop: the prune, then the hit test on the
  // pointer's latest position (F8). Off, the store empties, so the trees and the tree stand still.
  /* eslint-disable react-hooks/immutability -- R3F render-loop writes: the land store */
  useFrame(() => {
    if (!landStore) return
    if (!enabled) {
      if (landStore.current.touches.length) landStore.current = emptyLandStore()
      return
    }
    const now = clock.current
    landStore.current = pruneLand(landStore.current, now)
    if (bendRef.current <= 0) return
    const p = pointer.current
    if (!p.dirty) return
    p.dirty = false
    if (p.finger && !p.down) return
    const point = landPointRef.current?.(p.x, p.y) ?? null
    p.overLand = point !== null
    if (point) landStore.current = followHeld(landStore.current, point, p.down ? 1 : LAND_TOUCH.hoverAmp, now)
    else if (landStore.current.heldIndex >= 0) landStore.current = releaseHeld(landStore.current, now)
  }, -1)
  /* eslint-enable react-hooks/immutability */
}
