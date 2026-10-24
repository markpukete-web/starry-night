import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  MeshBasicMaterial,
  Vector3,
  type Group,
  type PerspectiveCamera,
} from 'three'
import { concatInjections, injectAlive, type AliveInjection } from './aliveMaterial.ts'
import type { BrushArrays } from './brushForms.ts'
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
  gait,
  hitBox,
  initialWalk,
  stepWalk,
  stopWalk,
  toggleWalk,
  wheelPixels,
  type WalkInput,
  type WalkState,
} from './streetWalk.ts'

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
}

function plainGeometry(a: BrushArrays, cls?: number[] | number): BufferGeometry {
  const g = new BufferGeometry()
  const vertices = a.positions.length / 3
  g.setAttribute('position', new BufferAttribute(new Float32Array(a.positions), 3))
  g.setAttribute('color', new BufferAttribute(new Float32Array(a.colors), 3))
  if (cls !== undefined) {
    const clsArr = typeof cls === 'number' ? new Float32Array(vertices).fill(cls) : new Float32Array(cls)
    g.setAttribute('aClass', new BufferAttribute(clsArr, 1))
  }
  g.setIndex(a.indices)
  g.computeVertexNormals()
  g.computeBoundingSphere()
  return g
}

const NO_INJECTION = { uniforms: {}, vertexHead: '', vertexBody: '', fragmentHead: '', fragmentBody: '' }

function idInjection(threshold = FOG.near + 0.6 * (FOG.far - FOG.near)): Omit<AliveInjection, 'key'> {
  return {
    uniforms: {
      uFogThreshold: { value: threshold },
    },
    vertexHead: 'attribute float aClass;\nvarying float vClass;',
    vertexBody: 'vClass = aClass;',
    fragmentHead: [
      'uniform float uFogThreshold;',
      'varying float vClass;',
    ].join('\n'),
    fragmentBody: [
      'if (diffuseColor.a < 0.5) discard;',
      'int c = int(vClass + 0.5);',
      'vec3 idCol = vec3(0.0);',
      'if (c == 0) idCol = vec3(1.0, 0.0, 0.0);',
      'else if (c == 1) idCol = vec3(0.0, 1.0, 0.0);',
      'else if (c == 2) idCol = vec3(0.0, 0.0, 1.0);',
      'else if (c == 3) idCol = vec3(1.0, 1.0, 0.0);',
      'else if (c == 4) idCol = vec3(0.0, 1.0, 1.0);',
      'else if (c == 5) idCol = vec3(1.0, 0.0, 1.0);',
      'else if (c == 6) idCol = vec3(1.0, 128.0 / 255.0, 0.0);',
      'else if (c == 7) idCol = vec3(128.0 / 255.0, 0.0, 1.0);',
      'else if (c == 8) idCol = vec3(128.0 / 255.0, 1.0, 0.0);',
      'else idCol = vec3(0.0, 0.0, 0.0);',
      'if (vFogDistance > uFogThreshold) {',
      '  idCol = vec3(1.0, 1.0, 1.0);',
      '}',
      'diffuseColor.rgb = idCol;',
      'diffuseColor.a = 1.0;',
    ].join('\n'),
  }
}

function material(
  key: string,
  body: Omit<AliveInjection, 'key' | 'uniforms'> | null,
  fog: Omit<AliveInjection, 'key'>,
  stroke: boolean,
  ids: boolean,
): MeshBasicMaterial {
  const m = new MeshBasicMaterial(
    stroke
      ? { vertexColors: true, toneMapped: false, side: DoubleSide, alphaTest: 0.5 }
      : { vertexColors: true, toneMapped: false, side: DoubleSide },
  )
  const parts: Omit<AliveInjection, 'key'>[] = [body ? { uniforms: {}, ...body } : NO_INJECTION, fog]
  if (ids) parts.push(idInjection())
  injectAlive(m, concatInjections(ids ? `${key}-ids` : key, ...parts))
  return m
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
  const activeGestureRef = useRef<{ pointerId: number; down: PointerSample } | null>(null)

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
    }
    prevReducedRef.current = reduced
    prevStillRef.current = still
  }, [reduced, still])

  // __vincentBox projected into client pixels
  const getVincentBox = useCallback(() => {
    const corners = vincentBoxCorners(walkStateRef.current.t)
    const persp = camera as PerspectiveCamera
    const pts = corners.map(([x, y, z]) => {
      const v = new Vector3(x + offset[0], y + offset[1], z + offset[2]).project(persp)
      return {
        x: ((v.x + 1) / 2) * window.innerWidth,
        y: ((1 - v.y) / 2) * window.innerHeight,
      }
    })
    return {
      x0: Math.min(...pts.map((p) => p.x)),
      x1: Math.max(...pts.map((p) => p.x)),
      y0: Math.min(...pts.map((p) => p.y)),
      y1: Math.max(...pts.map((p) => p.y)),
    }
  }, [camera, offset])

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
    }
    if (!flags.flat && flags.vincent) {
      w.__vincentBox = getVincentBox
    }
    return () => {
      delete w.__streetWalk
      delete w.__vincentBox
    }
  }, [walkOnActive, flags.flat, flags.vincent, getVincentBox])

  // Input listeners: only when walkOn is true
  useEffect(() => {
    if (!walkOnActive) return

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

    const onKeyUp = (e: KeyboardEvent) => {
      if (isInteractive(e.target)) return
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
      walkStateRef.current = stopWalk(walkStateRef.current)
    }

    const onVisibilityChange = () => {
      if (document.hidden) onBlurOrHidden()
    }

    const onPointerDown = (e: PointerEvent) => {
      if (!e.isPrimary) {
        activeGestureRef.current = null
        return
      }
      if (e.target !== gl.domElement) return
      activeGestureRef.current = {
        pointerId: e.pointerId,
        down: { x: e.clientX, y: e.clientY, ms: performance.now() },
      }
    }

    const onPointerCancel = (e: PointerEvent) => {
      if (activeGestureRef.current?.pointerId === e.pointerId) {
        activeGestureRef.current = null
      }
    }

    const onPointerUp = (e: PointerEvent) => {
      const gesture = activeGestureRef.current
      if (!gesture || gesture.pointerId !== e.pointerId) return
      activeGestureRef.current = null
      const up: PointerSample = { x: e.clientX, y: e.clientY, ms: performance.now() }
      const res = classifyGesture(gesture.down, up)
      if (res === 'tap' && flags.vincent) {
        const box = getVincentBox()
        if (hitBox(box, e.clientX, e.clientY)) {
          walkStateRef.current = toggleWalk(walkStateRef.current, still)
        }
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
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlurOrHidden)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerCancel)
    }
  }, [walkOnActive, flags.vincent, gl.domElement, getVincentBox, still])

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

    // Vincent sway & placement
    if (flags.vincent && vincentGroupRef.current && armGroupRef.current) {
      const { position: vPos, yaw } = vincentPlace(nextState.t)
      const g = gait(nextState.distance, nextState.speed, still)
      vincentGroupRef.current.position.set(
        vPos[0] + offset[0],
        vPos[1] + g.lift + offset[1],
        vPos[2] + offset[2],
      )
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
      position={[
        initialPlace.position[0] + offset[0],
        initialPlace.position[1] + offset[1],
        initialPlace.position[2] + offset[2],
      ]}
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
