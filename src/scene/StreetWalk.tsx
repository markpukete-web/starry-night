import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import {
  AdditiveBlending,
  Color,
  DoubleSide,
  MeshBasicMaterial,
  PerspectiveCamera,
  SpriteMaterial,
  Vector3,
  type Group,
  type Mesh,
  type Sprite,
} from 'three'
import { LAMP_LIGHT, LIFE, haloScaleOf, lifeTimeUniform, radialTexture } from './streetLife.ts'
import { FOG, fogInjection } from './streetFog.ts'
import {
  STATION_T,
  WALK_T,
  vincentPlace,
  vincentTapCorners,
  walkPose,
} from './streetLayout.ts'
import { walkOn, type StreetFlags } from './streetMode.ts'
import { strokeGeometry } from './strokeGeometry.ts'
import { classifyGesture, type PointerSample } from './touchSurge.ts'
import type { ImageData2D } from './useImageData.ts'
import {
  buildVincent,
  FORM,
  lanternExtra,
  lanternUniform,
  vincentMoon,
  vincentStrokeBody,
  type VincentBuild,
} from './vincent.ts'
import {
  admitGesture,
  flicker,
  gait,
  initialPause,
  initialWalk,
  lag,
  limbs,
  setStreetGesture,
  stepPause,
  stepWalk,
  stopWalk,
  streetGesture,
  toggleWalk,
  turnPose,
  vincentFigureBounds,
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
  /** the rendered figure's own transform, for the checks (Codex K3, K4): his world position, roll and both arms' swing */
  __vincentPose?: () => { world: [number, number, number]; roll: number; arm: number; armRight: number } | null
  __walkProject?: (t: number, point: [number, number, number]) => [number, number]
  /** the pause's state for the checks (V1): `clock` is the frame loop's own clamped time, `lantern` the light's strength */
  __vincentForm?: () => {
    t: number
    auto: boolean
    turn: number
    dwell: number
    rest: number
    bodyYaw: number
    headYaw: number
    clock: number
    lantern: number
  }
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
  const armRightGroupRef = useRef<Group>(null)
  const headGroupRef = useRef<Group>(null)
  const legLeftRef = useRef<Group>(null)
  const legRightRef = useRef<Group>(null)
  const lanternGroupRef = useRef<Group>(null)
  const haloRef = useRef<Sprite>(null)
  const poolRef = useRef<Mesh>(null)
  // the pause (V1): only `stepPause` ends a dwell, so no handler below touches this (Decision (h))
  const pauseRef = useRef(initialPause())
  const swingRef = useRef(0)
  const clockRef = useRef(0)
  // the lantern, its halo and its pool show on the lit street without the id pass
  const lanternOn = flags.vincent && flags.light && flags.ids === 0

  // Vincent geometry and materials
  const build = useMemo<VincentBuild | null>(() => {
    if (!painting) return null
    return buildVincent(painting)
  }, [painting])

  const vincentMaterials = useMemo(() => {
    const fog = () => fogInjection(FOG.colour)
    const ids = flags.ids > 0
    // the lantern's light is in Vincent's own lit programs, keyed apart from the frogs' (Decision (k))
    const lantern = flags.light
    const strokes = material(
      lantern ? 'vincent-lit-lantern' : 'vincent',
      vincentStrokeBody(flags.light, lantern),
      fog(),
      true,
      ids,
      lantern ? lanternExtra : undefined,
    )
    const solid = material(
      lantern ? 'vincent-solid-lit-lantern' : 'vincent-solid',
      vincentMoon(flags.light, lantern),
      fog(),
      false,
      ids,
      lantern ? lanternExtra : undefined,
    )
    const shadow = new MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
    })
    // the lantern's glass in the lamps' own light, its halo and its pool the lamps' materials at his scale
    const glowTexture = radialTexture()
    const glass = new MeshBasicMaterial({ vertexColors: true, toneMapped: false, side: DoubleSide })
    const halo = new SpriteMaterial({ map: glowTexture, color: new Color(LIFE.glow).multiplyScalar(LIFE.halo[1]), transparent: true, depthWrite: false, depthTest: true, blending: AdditiveBlending, toneMapped: false })
    const pool = new MeshBasicMaterial({ map: glowTexture, color: new Color(LIFE.glow).multiplyScalar(LIFE.pool[1]), transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide, toneMapped: false })
    return { strokes, solid, shadow, glowTexture, glass, halo, pool }
  }, [flags.light, flags.ids])

  useEffect(() => {
    return () => {
      vincentMaterials.strokes.dispose()
      vincentMaterials.solid.dispose()
      vincentMaterials.shadow.dispose()
      vincentMaterials.glowTexture.dispose()
      vincentMaterials.glass.dispose()
      vincentMaterials.halo.dispose()
      vincentMaterials.pool.dispose()
    }
  }, [vincentMaterials])

  // no figure, no light: w is 0 again once the lantern is gone (Decision (j))
  useEffect(() => {
    if (!lanternOn) return
    return () => {
      lanternUniform.value.w = 0
    }
  }, [lanternOn])

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
      armRightUnder: plainGeometry(build.armRight.underpaint, build.armRight.underpaint.cls),
      armRightStrokes: strokeGeometry(
        build.armRight.strokes.arrays,
        build.armRight.strokes.stroke,
        build.armRight.strokes.seed,
        undefined,
        build.armRight.strokes.cls,
      ),
      shadow: plainGeometry(build.shadow),
      head: {
        under: plainGeometry(build.head.underpaint, build.head.underpaint.cls),
        strokes: strokeGeometry(build.head.strokes.arrays, build.head.strokes.stroke, build.head.strokes.seed, undefined, build.head.strokes.cls),
      },
      legs: build.legs.map((leg) => ({
        under: plainGeometry(leg.underpaint, leg.underpaint.cls),
        strokes: strokeGeometry(leg.strokes.arrays, leg.strokes.stroke, leg.strokes.seed, undefined, leg.strokes.cls),
      })),
      lantern: { glass: plainGeometry(build.lantern.glass), ink: plainGeometry(build.lantern.ink, build.lantern.ink.cls) },
    }
  }, [build])

  useEffect(() => {
    return () => {
      if (vincentGeometries) {
        vincentGeometries.bodyUnder.dispose()
        vincentGeometries.bodyStrokes.dispose()
        vincentGeometries.armUnder.dispose()
        vincentGeometries.armStrokes.dispose()
        vincentGeometries.armRightUnder.dispose()
        vincentGeometries.armRightStrokes.dispose()
        vincentGeometries.shadow.dispose()
        vincentGeometries.head.under.dispose()
        vincentGeometries.head.strokes.dispose()
        vincentGeometries.legs.forEach((leg) => {
          leg.under.dispose()
          leg.strokes.dispose()
        })
        vincentGeometries.lantern.glass.dispose()
        vincentGeometries.lantern.ink.dispose()
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
    // the rig box and his rendered figure's bounds together (Decision (d)), the figure less the anchor's offset
    const group = vincentGroupRef.current
    let figure: ReturnType<typeof vincentFigureBounds> = null
    if (group) {
      group.updateWorldMatrix(true, true)
      const bounds = vincentFigureBounds(group)
      if (bounds) {
        figure = {
          min: [bounds.min[0] - offset[0], bounds.min[1] - offset[1], bounds.min[2] - offset[2]],
          max: [bounds.max[0] - offset[0], bounds.max[1] - offset[1], bounds.max[2] - offset[2]],
        }
      }
    }
    const corners = vincentTapCorners(walkStateRef.current.t, figure)
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
        const armRight = armRightGroupRef.current
        if (!body || !arm || !armRight) return null
        body.updateWorldMatrix(true, false)
        const p = new Vector3().setFromMatrixPosition(body.matrixWorld)
        return { world: [p.x, p.y, p.z], roll: body.rotation.z, arm: arm.rotation.x, armRight: armRight.rotation.x }
      }
      w.__vincentForm = () => ({
        t: walkStateRef.current.t,
        auto: walkStateRef.current.auto,
        turn: pauseRef.current.turn,
        dwell: pauseRef.current.dwell,
        rest: pauseRef.current.rest,
        bodyYaw: vincentGroupRef.current?.rotation.y ?? NaN,
        headYaw: headGroupRef.current?.rotation.y ?? NaN,
        clock: clockRef.current,
        lantern: lanternUniform.value.w,
      })
    }
    return () => {
      delete w.__streetWalk
      delete w.__walkProject
      delete w.__vincentBox
      delete w.__vincentPose
      delete w.__vincentForm
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

    clockRef.current += dt
    const prevState = walkStateRef.current
    const stepped = stepPause(prevState, stepWalk(prevState, input), pauseRef.current, input, reduced || still)
    const nextState = stepped.next
    pauseRef.current = stepped.pause
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
      const { turn } = pauseRef.current
      const g = gait(nextState.distance, nextState.speed, nextState.t - prevState.t > 1e-7, turn)
      const turned = turnPose(turn)
      const l = limbs(g, turned)
      const body = vincentGroupRef.current
      // his group sits inside the street's, which already carries the anchor's offset (Codex K3): local, not world
      body.rotation.order = 'YXZ'
      body.position.set(vPos[0], vPos[1] + g.lift, vPos[2])
      body.rotation.set(g.pitch, yaw + turned.body, g.roll)
      armGroupRef.current.rotation.set(l.armLeft, 0, 0)
      armRightGroupRef.current?.rotation.set(l.armRight, 0, 0)
      headGroupRef.current?.rotation.set(0, turned.head, 0)
      legLeftRef.current?.rotation.set(l.legLeft, 0, 0)
      legRightRef.current?.rotation.set(l.legRight, 0, 0)
      // the lantern hangs plumb under the swinging hand, a pendulum lagging it (Fable Q5); still under reduced motion
      swingRef.current = reduced || still ? l.hang : lag(swingRef.current, l.hang, dt)
      lanternGroupRef.current?.rotation.set(swingRef.current, 0, 0)
      body.updateMatrixWorld(true)
      if (lanternGroupRef.current) {
        const glass = lanternGroupRef.current.localToWorld(new Vector3(0, -FORM.lantern.handle - FORM.lantern.cap - FORM.lantern.h / 2, 0))
        lanternUniform.value.set(glass.x, glass.y, glass.z, 1)
        // look pass 4 of the spike: 0.18 of a lamp's halo (Fable's 0.4 washed his smock grey with the lantern raised)
        if (haloRef.current) haloRef.current.scale.setScalar(0.18 * haloScaleOf(haloRef.current, persp))
        if (poolRef.current && body.parent) {
          // the pool lies on the ground ahead of the lantern, the way he faces, flickering a little
          const local = body.parent.worldToLocal(glass.clone())
          const facing = yaw + turned.body
          poolRef.current.position.set(local.x + Math.sin(facing) * 0.046, LAMP_LIGHT.poolY, local.z + Math.cos(facing) * 0.046)
          poolRef.current.rotation.set(-Math.PI / 2, facing, 0, 'YXZ')
          vincentMaterials.pool.opacity = flicker(lifeTimeUniform.value, reduced)
        }
      }
    }
  }, -1)
  /* eslint-enable react-hooks/immutability */

  if (!flags.vincent || !build || !vincentGeometries) return null

  const initialPlace = vincentPlace(initialT)
  const pivot = build.armLeft.pivot
  const glassY = -FORM.lantern.handle - FORM.lantern.cap - FORM.lantern.h / 2

  return (
    <>
      {lanternOn && (
        <mesh ref={poolRef} material={vincentMaterials.pool} renderOrder={4}>
          <planeGeometry args={[0.1, 0.16]} />
        </mesh>
      )}
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
          {lanternOn && (
            <group ref={lanternGroupRef} position={build.lantern.pivot}>
              <mesh geometry={vincentGeometries.lantern.ink} material={vincentMaterials.solid} renderOrder={4} />
              <mesh geometry={vincentGeometries.lantern.glass} material={vincentMaterials.glass} renderOrder={4} />
              <sprite ref={haloRef} material={vincentMaterials.halo} position={[0, glassY, 0]} renderOrder={6} />
            </group>
          )}
        </group>
        <group ref={armRightGroupRef} position={build.armRight.pivot}>
          <mesh geometry={vincentGeometries.armRightUnder} material={vincentMaterials.solid} renderOrder={4} />
          <mesh geometry={vincentGeometries.armRightStrokes} material={vincentMaterials.strokes} renderOrder={5} />
        </group>
        <group ref={headGroupRef} position={build.head.pivot}>
          <mesh geometry={vincentGeometries.head.under} material={vincentMaterials.solid} renderOrder={4} />
          <mesh geometry={vincentGeometries.head.strokes} material={vincentMaterials.strokes} renderOrder={5} />
        </group>
        {build.legs.map((leg, k) => (
          <group key={k} ref={k === 0 ? legLeftRef : legRightRef} position={leg.pivot}>
            <mesh geometry={vincentGeometries.legs[k].under} material={vincentMaterials.solid} renderOrder={4} />
            <mesh geometry={vincentGeometries.legs[k].strokes} material={vincentMaterials.strokes} renderOrder={5} />
          </group>
        ))}
        {flags.light && flags.ids === 0 && (
          <mesh
            geometry={vincentGeometries.shadow}
            material={vincentMaterials.shadow}
            renderOrder={3}
          />
        )}
      </group>
    </>
  )
}
