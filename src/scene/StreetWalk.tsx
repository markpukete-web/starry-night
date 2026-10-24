import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import {
  MeshBasicMaterial,
  PerspectiveCamera,
  Vector3,
  type Group,
} from 'three'
import { FOG, fogInjection } from './streetFog.ts'
import {
  STATION_T,
  WALK_T,
  vincentBoxCorners,
  vincentPlace,
  walkPose,
} from './streetLayout.ts'
import { walkOn, type StreetFlags } from './streetMode.ts'
import { strokeGeometry } from './strokeGeometry.ts'
import { classifyGesture, type PointerSample } from './touchSurge.ts'
import type { ImageData2D } from './useImageData.ts'
import {
  buildVincent,
  vincentMoon,
  vincentStrokeBody,
  type VincentBuild,
} from './vincent.ts'
import {
  admitGesture,
  gait,
  initialWalk,
  setStreetGesture,
  stepWalk,
  stopWalk,
  streetGesture,
  toggleWalk,
  wheelPixels,
  type WalkInput,
  type WalkState,
} from './streetWalk.ts'
import { material, plainGeometry } from './streetMaterial.ts'

export type StreetWalkProps = {
  painting: ImageData2D | null
  flags: StreetFlags
  offset: [number, number, number]
  reduced: boolean
  still: boolean
}

type StreetWalkWindow = Window & {
  __streetWalk?: {
    t: number
    target: number
    auto: boolean
    set(t: number): void
  }
  __vincentBox?: () => { x0: number; y0: number; x1: number; y1: number }
  /** the rendered figure's own transform, for the checks (Codex K3, K4): his world position, roll and arm swing */
  __vincentPose?: () => { world: [number, number, number]; roll: number; arm: number } | null
  __walkProject?: (t: number, point: [number, number, number]) => [number, number]
}

export default function StreetWalk({
  painting,
  flags,
  offset,
  reduced,
  still,
}: StreetWalkProps) {
  const { camera, size, gl } = useThree()
  const portrait = size.height > size.width
  const initialT = flags.walkT ?? STATION_T[flags.station]
  const walkOnActive = walkOn(flags)

  const isPhone = useMemo(() => {
    if (flags.walkMode) return flags.walkMode === 'auto'
    if (typeof window === 'undefined') return false
    return window.matchMedia('(hover: none) and (pointer: coarse)').matches
  }, [flags.walkMode])

  const walkStateRef = useRef<WalkState>(initialWalk(initialT, isPhone))
  const prevPortraitRef = useRef(portrait)
  const queuedWheelPxRef = useRef(0)
  const heldKeysRef = useRef({ forward: false, back: false })
  const activeGestureRef = useRef<{
    pointerId: number
    down: PointerSample
    vincent: boolean
  } | null>(null)

  const vincentGroupRef = useRef<Group>(null)
  const armGroupRef = useRef<Group>(null)

  // Vincent geometry and materials
  const build = useMemo<VincentBuild | null>(() => {
    if (!painting) return null
    return buildVincent(painting)
  }, [painting])

  const vincentMaterials = useMemo(() => {
    const fog = () => fogInjection(FOG.colour)
    const ids = flags.ids > 0
    const strokes = material(
      flags.light ? 'vincent-lit' : 'vincent',
      vincentStrokeBody(flags.light),
      fog(),
      true,
      ids,
    )
    const solid = material(
      flags.light ? 'vincent-solid-lit' : 'vincent-solid',
      vincentMoon(flags.light),
      fog(),
      false,
      ids,
    )
    const shadow = new MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
    })
    return { strokes, solid, shadow }
  }, [flags.light, flags.ids])

  useEffect(() => {
    return () => {
      vincentMaterials.strokes.dispose()
      vincentMaterials.solid.dispose()
      vincentMaterials.shadow.dispose()
    }
  }, [vincentMaterials])

  const vincentGeometries = useMemo(() => {
    if (!build) return null
    return {
      bodyUnder: plainGeometry(build.body.underpaint, build.body.underpaint.cls),
      bodyStrokes: strokeGeometry(
        build.body.strokes.arrays,
        build.body.strokes.stroke,
        build.body.strokes.seed,
        undefined,
        build.body.strokes.cls,
      ),
      armUnder: plainGeometry(build.armLeft.underpaint, build.armLeft.underpaint.cls),
      armStrokes: strokeGeometry(
        build.armLeft.strokes.arrays,
        build.armLeft.strokes.stroke,
        build.armLeft.strokes.seed,
        undefined,
        build.armLeft.strokes.cls,
      ),
      shadow: plainGeometry(build.shadow),
    }
  }, [build])

  useEffect(() => {
    return () => {
      if (vincentGeometries) {
        vincentGeometries.bodyUnder.dispose()
        vincentGeometries.bodyStrokes.dispose()
        vincentGeometries.armUnder.dispose()
        vincentGeometries.armStrokes.dispose()
        vincentGeometries.shadow.dispose()
      }
    }
  }, [vincentGeometries])

  // Stop walk when pause or reduced motion turns on
  const prevReducedRef = useRef(reduced)
  const prevStillRef = useRef(still)
  useEffect(() => {
    if ((!prevReducedRef.current && reduced) || (!prevStillRef.current && still)) {
      walkStateRef.current = stopWalk(walkStateRef.current)
      queuedWheelPxRef.current = 0
    }
    prevReducedRef.current = reduced
    prevStillRef.current = still
  }, [reduced, still])

  // __vincentBox projected into client pixels
  const getVincentBox = useCallback(() => {
    const corners = vincentBoxCorners(walkStateRef.current.t)
    const persp = camera as PerspectiveCamera
    const rect = gl.domElement.getBoundingClientRect()
    const pts = corners.map(([x, y, z]) => {
      const v = new Vector3(x + offset[0], y + offset[1], z + offset[2]).project(persp)
      return {
        x: rect.left + ((v.x + 1) / 2) * rect.width,
        y: rect.top + ((1 - v.y) / 2) * rect.height,
      }
    })
    return {
      x0: Math.min(...pts.map((p) => p.x)),
      x1: Math.max(...pts.map((p) => p.x)),
      y0: Math.min(...pts.map((p) => p.y)),
      y1: Math.max(...pts.map((p) => p.y)),
    }
  }, [camera, offset, gl.domElement])

  // Capture seams on window
  useEffect(() => {
    const w = window as StreetWalkWindow
    if (walkOnActive) {
      w.__streetWalk = {
        get t() {
          return walkStateRef.current.t
        },
        get target() {
          return walkStateRef.current.target
        },
        get auto() {
          return walkStateRef.current.auto
        },
        set(newT: number) {
          const clamped = Math.max(WALK_T.min, Math.min(WALK_T.max, newT))
          walkStateRef.current = {
            ...walkStateRef.current,
            t: clamped,
            target: clamped,
          }
        },
      }
      w.__walkProject = (t: number, point: [number, number, number]) => {
        const pose = walkPose(t, portrait)
        const aspect = size.width / size.height
        const persp = new PerspectiveCamera(pose.fov, aspect, pose.near, pose.far)
        persp.position.set(
          pose.position[0] + offset[0],
          pose.position[1] + offset[1],
          pose.position[2] + offset[2],
        )
        persp.lookAt(
          pose.target[0] + offset[0],
          pose.target[1] + offset[1],
          pose.target[2] + offset[2],
        )
        persp.updateMatrixWorld()
        const v = new Vector3(point[0], point[1], point[2]).project(persp)
        const rect = gl.domElement.getBoundingClientRect()
        return [
          rect.left + ((v.x + 1) / 2) * rect.width,
          rect.top + ((1 - v.y) / 2) * rect.height,
        ]
      }
    }
    if (!flags.flat && flags.vincent) {
      w.__vincentBox = getVincentBox
      w.__vincentPose = () => {
        const body = vincentGroupRef.current
        const arm = armGroupRef.current
        if (!body || !arm) return null
        body.updateWorldMatrix(true, false)
        const p = new Vector3().setFromMatrixPosition(body.matrixWorld)
        return { world: [p.x, p.y, p.z], roll: body.rotation.z, arm: arm.rotation.x }
      }
    }
    return () => {
      delete w.__streetWalk
      delete w.__walkProject
      delete w.__vincentBox
      delete w.__vincentPose
    }
  }, [walkOnActive, flags.flat, flags.vincent, getVincentBox, portrait, size, offset, gl.domElement])

  // Input listeners: only when walkOn is true
  /* eslint-disable react-hooks/immutability -- canvas touchAction must be none for pointer gestures */
  useEffect(() => {
    if (!walkOnActive) return

    const prevTouchAction = gl.domElement.style.touchAction
    gl.domElement.style.touchAction = 'none'

    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) {
        e.preventDefault()
      }
      const px = wheelPixels(e, window.innerHeight)
      queuedWheelPxRef.current += px
    }

    const isInteractive = (target: EventTarget | null): boolean => {
      if (!target || !(target instanceof HTMLElement)) return false
      const tag = target.tagName.toLowerCase()
      return tag === 'input' || tag === 'select' || tag === 'textarea' || target.isContentEditable
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (isInteractive(e.target)) return
      if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        heldKeysRef.current.forward = true
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        heldKeysRef.current.back = true
      }
    }

    // a release is never filtered: a key held over the scene and released over an input must still stop (Codex K2)
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        heldKeysRef.current.forward = false
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        heldKeysRef.current.back = false
      }
    }

    const onBlurOrHidden = () => {
      heldKeysRef.current.forward = false
      heldKeysRef.current.back = false
      activeGestureRef.current = null
      setStreetGesture(null)
      walkStateRef.current = stopWalk(walkStateRef.current)
      queuedWheelPxRef.current = 0
    }

    const onVisibilityChange = () => {
      if (document.hidden) onBlurOrHidden()
    }

    const onPointerDown = (e: PointerEvent) => {
      if (!e.isPrimary || (activeGestureRef.current && activeGestureRef.current.pointerId !== e.pointerId)) {
        activeGestureRef.current = null
        setStreetGesture(null)
        return
      }
      if (e.target !== gl.domElement) return
      const box = flags.vincent ? getVincentBox() : null
      const isVincent = admitGesture(box, e.clientX, e.clientY) === 'vincent'
      activeGestureRef.current = {
        pointerId: e.pointerId,
        down: { x: e.clientX, y: e.clientY, ms: performance.now() },
        vincent: isVincent,
      }
      setStreetGesture({ pointerId: e.pointerId, vincent: isVincent })
    }

    const onPointerCancel = (e: PointerEvent) => {
      if (activeGestureRef.current?.pointerId === e.pointerId) {
        activeGestureRef.current = null
      }
      if (streetGesture?.pointerId === e.pointerId) {
        setStreetGesture(null)
      }
    }

    const onPointerUp = (e: PointerEvent) => {
      const gesture = activeGestureRef.current
      if (streetGesture?.pointerId === e.pointerId) {
        setStreetGesture(null)
      }
      if (!gesture || gesture.pointerId !== e.pointerId) return
      activeGestureRef.current = null
      const up: PointerSample = { x: e.clientX, y: e.clientY, ms: performance.now() }
      const res = classifyGesture(gesture.down, up)
      if (res === 'tap' && gesture.vincent && flags.vincent) {
        walkStateRef.current = toggleWalk(walkStateRef.current, still)
        // a wheel turned before the tap must not move him after it (Codex K1)
        queuedWheelPxRef.current = 0
      }
    }

    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlurOrHidden)
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerCancel)

    return () => {
      setStreetGesture(null)
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlurOrHidden)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerCancel)
      gl.domElement.style.touchAction = prevTouchAction
    }
  }, [walkOnActive, flags.vincent, gl.domElement, getVincentBox, still])
  /* eslint-enable react-hooks/immutability */

  // Frame loop: priority -1 (before sky reads camera)
  /* eslint-disable react-hooks/immutability -- the R3F camera is placed imperatively, as the arrival places it */
  useFrame((_, delta) => {
    if (!walkOnActive) return

    const dt = Math.min(delta, 0.1)
    const keys: -1 | 0 | 1 =
      heldKeysRef.current.forward && !heldKeysRef.current.back
        ? 1
        : heldKeysRef.current.back && !heldKeysRef.current.forward
          ? -1
          : 0

    const wheelPx = queuedWheelPxRef.current
    queuedWheelPxRef.current = 0

    const input: WalkInput = {
      dt,
      wheelPx,
      keys,
      autoMode: isPhone,
      paused: reduced,
      still,
    }

    const nextState = stepWalk(walkStateRef.current, input)
    walkStateRef.current = nextState

    // Camera placement
    const persp = camera as PerspectiveCamera
    const pose = walkPose(nextState.t, portrait)
    if (portrait !== prevPortraitRef.current) {
      persp.fov = pose.fov
      persp.near = pose.near
      persp.far = pose.far
      persp.updateProjectionMatrix()
      prevPortraitRef.current = portrait
    }
    persp.position.set(
      pose.position[0] + offset[0],
      pose.position[1] + offset[1],
      pose.position[2] + offset[2],
    )
    persp.lookAt(
      pose.target[0] + offset[0],
      pose.target[1] + offset[1],
      pose.target[2] + offset[2],
    )
    persp.updateMatrixWorld()

    // Vincent sway & placement
    if (flags.vincent && vincentGroupRef.current && armGroupRef.current) {
      const { position: vPos, yaw } = vincentPlace(nextState.t)
      const g = gait(nextState.distance, nextState.speed, still)
      // his group sits inside the street's, which already carries the anchor's offset (Codex K3): local, not world
      vincentGroupRef.current.position.set(vPos[0], vPos[1] + g.lift, vPos[2])
      vincentGroupRef.current.rotation.set(0, yaw, g.roll)
      armGroupRef.current.rotation.set(g.arm, 0, 0)
    }
  }, -1)
  /* eslint-enable react-hooks/immutability */

  if (!flags.vincent || !build || !vincentGeometries) return null

  const initialPlace = vincentPlace(initialT)
  const pivot = build.armLeft.pivot

  return (
    <group
      ref={vincentGroupRef}
      position={initialPlace.position}
      rotation={[0, initialPlace.yaw, 0]}
    >
      <mesh
        geometry={vincentGeometries.bodyUnder}
        material={vincentMaterials.solid}
        renderOrder={4}
      />
      <mesh
        geometry={vincentGeometries.bodyStrokes}
        material={vincentMaterials.strokes}
        renderOrder={5}
      />
      <group ref={armGroupRef} position={pivot}>
        <mesh
          geometry={vincentGeometries.armUnder}
          material={vincentMaterials.solid}
          renderOrder={4}
        />
        <mesh
          geometry={vincentGeometries.armStrokes}
          material={vincentMaterials.strokes}
          renderOrder={5}
        />
      </group>
      {flags.light && flags.ids === 0 && (
        <mesh
          geometry={vincentGeometries.shadow}
          material={vincentMaterials.shadow}
          renderOrder={3}
        />
      )}
    </group>
  )
}
