import { useFrame, useThree } from '@react-three/fiber'
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { Raycaster, Vector2, type Object3D } from 'three'
import { LAND_MESHES, landPick } from './landTouch'
import { classifyGesture, TOUCH_SURGE, type PointerSample } from './touchSurge'

/** The village's meshes (`Village.tsx`): what the portal enters by. */
export const VILLAGE_MESHES = ['village-solid', 'village-skin', 'village-paint'] as const

type PortalPointerWindow = Window & { __portalPick?: (clientX: number, clientY: number) => 'village' | 'land' | null }

/**
 * The portal's pointer (tasks/2026-10-25-street-portal-plan.md, decision (h)): its own listeners, as the design's C7
 * asks, so it runs whatever `touch`, `alive` and reduced motion are. A move marks the pointer, and the frame after a move
 * casts once against the village with the land's trees and the island in front of it (`landPick`): a still pointer
 * casts nothing (plan review F5). Over the village the cursor is the hand and the hint sits beside it. The first hover
 * calls `onFirstHover` (the street's chunk loads). A tap on the village calls `onEnter`; a drag never does, even one that
 * comes back to where it started: a move past the tap's distance makes the press a drag (Codex branch review F2).
 *
 * Returns the cast, for the touch hook's `skyMasked`: a tap that enters does not also surge the sky (decision (i)). The
 * cast lives as long as the scene, not as long as `enabled`: the tap that enters commits `flying` between the two
 * window listeners, and the touch hook's must still see the village under it.
 */
export function usePortalPointer({
  enabled,
  onEnter,
  onFirstHover,
  hintRef,
}: {
  enabled: boolean
  onEnter: () => void
  onFirstHover: () => void
  hintRef: RefObject<HTMLDivElement | null>
}): (clientX: number, clientY: number) => boolean {
  const { camera, gl, events, scene } = useThree()
  const [raycaster] = useState(() => new Raycaster())
  const pointer = useRef({ x: 0, y: 0, moved: false })
  const hovered = useRef(false)
  const enterRef = useRef(onEnter)
  const hoverRef = useRef(onFirstHover)
  useEffect(() => {
    enterRef.current = onEnter
    hoverRef.current = onFirstHover
  }, [onEnter, onFirstHover])

  const cast = useCallback(
    (clientX: number, clientY: number): 'village' | 'land' | null => {
      const rect = gl.domElement.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) return null
      const found = (names: readonly string[]) => names.map((name) => scene.getObjectByName(name)).filter((o): o is Object3D => o !== undefined)
      const village = found(VILLAGE_MESHES)
      if (!village.length) return null
      const land = found(LAND_MESHES)
      const ndc = new Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1)
      raycaster.setFromCamera(ndc, camera)
      const hits = raycaster.intersectObjects([...village, ...land, ...found(['island-solid'])], false)
      return landPick(hits, village) ? 'village' : landPick(hits, land) ? 'land' : null
    },
    [camera, gl, scene, raycaster],
  )

  /* eslint-disable react-hooks/immutability -- the canvas's cursor, written from the listeners and the frame loop */
  const show = useCallback(
    (over: boolean) => {
      gl.domElement.style.cursor = over ? 'pointer' : ''
      const hint = hintRef.current
      if (!hint) return
      hint.style.visibility = over ? 'visible' : 'hidden'
      if (over) hint.style.transform = `translate(${pointer.current.x + 16}px, ${pointer.current.y + 18}px)`
    },
    [gl, hintRef],
  )

  useEffect(() => {
    if (!enabled) return
    const element = (events.connected as HTMLElement | null | undefined) ?? gl.domElement
    const p = pointer.current
    let down: (PointerSample & { id: number; dragged: boolean }) | null = null
    const onMove = (event: PointerEvent) => {
      if (down && event.pointerId === down.id && Math.hypot(event.clientX - down.x, event.clientY - down.y) > TOUCH_SURGE.tapPx) down.dragged = true
      // a finger has no hover: only the tap enters on a touch screen
      if (event.pointerType === 'touch') return
      p.x = event.clientX
      p.y = event.clientY
      p.moved = true
    }
    const onDown = (event: PointerEvent) => {
      if (!event.isPrimary || down || (event.pointerType === 'mouse' && event.button !== 0)) return
      down = { x: event.clientX, y: event.clientY, ms: event.timeStamp, id: event.pointerId, dragged: false }
    }
    const onUp = (event: PointerEvent) => {
      if (!down || event.pointerId !== down.id) return
      const start = down
      down = null
      if (start.dragged || classifyGesture(start, { x: event.clientX, y: event.clientY, ms: event.timeStamp }) !== 'tap') return
      if (cast(event.clientX, event.clientY) === 'village') enterRef.current()
    }
    const onCancel = () => {
      down = null
    }
    const onLeave = () => show(false)
    element.addEventListener('pointermove', onMove, { passive: true })
    element.addEventListener('pointerdown', onDown, { passive: true })
    element.addEventListener('pointerleave', onLeave, { passive: true })
    window.addEventListener('pointerup', onUp, { passive: true })
    window.addEventListener('pointercancel', onCancel)
    const w = window as PortalPointerWindow
    w.__portalPick = cast
    return () => {
      element.removeEventListener('pointermove', onMove)
      element.removeEventListener('pointerdown', onDown)
      element.removeEventListener('pointerleave', onLeave)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onCancel)
      show(false)
      p.moved = false
      delete w.__portalPick
    }
  }, [enabled, events, gl, cast, show])

  useFrame(() => {
    const p = pointer.current
    if (!enabled || !p.moved) return
    p.moved = false
    const over = cast(p.x, p.y) === 'village'
    show(over)
    if (over && !hovered.current) {
      hovered.current = true
      hoverRef.current()
    }
  })

  /* eslint-enable react-hooks/immutability */

  return useCallback((clientX: number, clientY: number) => cast(clientX, clientY) === 'village', [cast])
}
