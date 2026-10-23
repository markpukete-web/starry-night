import { useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { useThree } from '@react-three/fiber'
import { BufferAttribute, BufferGeometry, DoubleSide, MeshBasicMaterial, type PerspectiveCamera } from 'three'
import { concatInjections, injectAlive, type AliveInjection } from './aliveMaterial.ts'
import type { BrushArrays } from './brushForms.ts'
import { CYPRESS_STROKE_BODY, strokeGlslWith, type StrokeBody } from './cypressStrokeShader.ts'
import type { BakedMass } from './landDomes.ts'
import { buildFlatPanel, buildStreet, FLAT_VIEW, type StreetBuild, type StreetCounts } from './streetGeometry.ts'
import { FOG, fogInjection } from './streetFog.ts'
import { STREET, stationPose } from './streetLayout.ts'
import { readStreetFlags, streetReadiness, type AssetStatus } from './streetMode.ts'
import { strokeGeometry } from './strokeGeometry.ts'
import { useImageData } from './useImageData.ts'

type StreetWindow = Window & {
  __streetReady?: boolean
  __streetCounts?: StreetCounts
  __streetCamera?: () => { position: number[]; quaternion: number[]; fov: number; near: number; far: number }
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

/**
 * The ground's and the path's body (pass 4): the cypress's (E4) without its gap discards, with soft lanes, the dry brush
 * only in the last 15% and half the fray. It was aimed at the path's rectangles close to the camera, which turned out
 * to be z-fighting, fixed by the lift levels (`734903f`); whether the ground returns to E4's body is Mark's call.
 */
const STREET_GROUND_BODY: StrokeBody = { ...CYPRESS_STROKE_BODY, gaps: null, laneEdge: null, dryFrom: 0.85, fray: 0.08 }

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
      'else idCol = vec3(0.0, 0.0, 0.0);',
      'if (vFogDistance > uFogThreshold) {',
      '  idCol = vec3(1.0, 1.0, 1.0);',
      '}',
      'diffuseColor.rgb = idCol;',
      'diffuseColor.a = 1.0;',
    ].join('\n'),
  }
}

function material(key: string, body: Omit<AliveInjection, 'key' | 'uniforms'> | null, fog: Omit<AliveInjection, 'key'>, stroke: boolean, ids: boolean): MeshBasicMaterial {
  const m = new MeshBasicMaterial(stroke ? { vertexColors: true, toneMapped: false, side: DoubleSide, alphaTest: 0.5 } : { vertexColors: true, toneMapped: false, side: DoubleSide })
  const parts: Omit<AliveInjection, 'key'>[] = [body ? { uniforms: {}, ...body } : NO_INJECTION, fog]
  if (ids) parts.push(idInjection())
  injectAlive(m, concatInjections(ids ? `${key}-ids` : key, ...parts))
  return m
}

/**
 * The street (S1, tasks/2026-10-23-street-s1-plan.md): built once from the painting, the land flow and the baked
 * masses, all or nothing (`streetReadiness`), drawn in place of the diorama's foreground under the same sky. It places
 * the camera at its station itself, so the layout stays in this lazy chunk. `?flat=1` draws the flat panel instead
 * (G4b: four faces laid flat in the production materials, no fog), facing the camera.
 */
export default function Street() {
  const flags = useMemo(() => readStreetFlags(typeof window !== 'undefined' ? window.location.search : ''), [])
  const { camera, size } = useThree()
  const portrait = size.height > size.width

  const [paintingFailed, setPaintingFailed] = useState(false)
  const [flowFailed, setFlowFailed] = useState(false)
  const [massesState, setMassesState] = useState<{ status: AssetStatus; data: BakedMass[] | null }>({ status: 'pending', data: null })
  const paintingUrl = flags.fail === 'painting' ? '/reference/missing.png' : '/reference/painting.jpg'
  const flowUrl = flags.fail === 'flow' ? '/reference/missing.png' : '/reference/land-flow.png'
  const massesUrl = flags.fail === 'masses' ? '/reference/missing.png' : '/reference/land-masses.json'
  const paintingData = useImageData(paintingUrl, () => setPaintingFailed(true))
  const flowData = useImageData(flowUrl, () => setFlowFailed(true))
  const paintingStatus: AssetStatus = paintingFailed ? 'failed' : paintingData ? 'ok' : 'pending'
  const flowStatus: AssetStatus = flowFailed ? 'failed' : flowData ? 'ok' : 'pending'

  useEffect(() => {
    let alive = true
    fetch(massesUrl)
      .then((res) => (res.ok ? (res.json() as Promise<BakedMass[]>) : Promise.reject(new Error(String(res.status)))))
      .then((json) => { if (alive) setMassesState({ status: 'ok', data: json }) })
      .catch(() => { if (alive) setMassesState({ status: 'failed', data: null }) })
    return () => { alive = false }
  }, [massesUrl])

  const readiness = useMemo(() => streetReadiness({ painting: paintingStatus, flow: flowStatus, masses: massesState.status }), [paintingStatus, flowStatus, massesState.status])

  const build = useMemo<StreetBuild | null>(() => {
    if (!readiness.render) return null
    return flags.flat ? buildFlatPanel(paintingData, flowData, massesState.data) : buildStreet(paintingData, flowData, massesState.data)
  }, [readiness.render, flags.flat, paintingData, flowData, massesState.data])

  useEffect(() => {
    const w = window as StreetWindow
    w.__streetReady = readiness.ready
    if (build) w.__streetCounts = { ...build.counts, builds: (w.__streetCounts?.builds ?? 0) + 1 }
    else delete w.__streetCounts
  }, [readiness.ready, build])

  // the station: the street group sits at `STREET.originA` under anchor A, the camera with it
  const offset = useMemo<[number, number, number]>(() => (!flags.flat && flags.anchor === 'A' ? [...STREET.originA] : [0, 0, 0]), [flags.flat, flags.anchor])
  /* eslint-disable react-hooks/immutability -- the R3F camera is placed imperatively, as the arrival places it */
  useLayoutEffect(() => {
    const persp = camera as PerspectiveCamera
    if (flags.flat) {
      persp.position.set(...FLAT_VIEW.position)
      persp.lookAt(...FLAT_VIEW.target)
      persp.fov = FLAT_VIEW.fov
      persp.near = 0.01
      persp.far = 48
    } else {
      const pose = stationPose(flags.station, portrait)
      persp.position.set(pose.position[0] + offset[0], pose.position[1] + offset[1], pose.position[2] + offset[2])
      persp.lookAt(pose.target[0] + offset[0], pose.target[1] + offset[1], pose.target[2] + offset[2])
      persp.fov = pose.fov
      persp.near = pose.near
      persp.far = pose.far
    }
    persp.updateProjectionMatrix()
    const w = window as StreetWindow
    w.__streetCamera = () => ({ position: persp.position.toArray(), quaternion: persp.quaternion.toArray(), fov: persp.fov, near: persp.near, far: persp.far })
    return () => { delete w.__streetCamera }
  }, [camera, flags.flat, flags.station, portrait, offset])
  /* eslint-enable react-hooks/immutability */

  const materials = useMemo(() => {
    const devFogColour = import.meta.env.DEV && typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('fogColour') : null
    const fogColour = devFogColour ? (devFogColour.startsWith('#') ? devFogColour : `#${devFogColour}`) : FOG.colour
    const fog = () => (flags.flat ? fogInjection(fogColour, 100, 200) : fogInjection(fogColour))
    const ids = flags.ids > 0
    return {
      solid: material('street-solid', null, fog(), false, ids),
      strokes: material('street-strokes', strokeGlslWith(CYPRESS_STROKE_BODY), fog(), true, ids),
      ground: material('street-ground', strokeGlslWith(STREET_GROUND_BODY), fog(), true, ids),
      // pass 1: the land's body broke the curls into combs at walking distance; the cypress's (E4) holds them
      trees: material('street-trees', strokeGlslWith(CYPRESS_STROKE_BODY), fog(), true, ids),
    }
  }, [flags.flat, flags.ids])
  useEffect(() => () => { for (const m of Object.values(materials)) m.dispose() }, [materials])

  const meshes = useMemo(() => {
    if (!build) return null
    const isSrc = flags.ids === 2
    const upCls = isSrc ? build.underpaint.src : build.underpaint.cls
    const strokesCls = isSrc ? build.strokes.src : build.strokes.cls
    const groundCls = isSrc ? build.ground.src : build.ground.cls
    const outlinesCls = isSrc ? build.outlines.src : build.outlines.cls
    const windowsCls = isSrc ? build.windows.src : build.windows.cls
    const treeCls = isSrc ? 255 : 5
    return {
      underpaint: plainGeometry(build.underpaint, upCls),
      strokes: strokeGeometry(build.strokes.arrays, build.strokes.stroke, build.strokes.seed, undefined, strokesCls),
      ground: strokeGeometry(build.ground.arrays, build.ground.stroke, build.ground.seed, undefined, groundCls),
      outlines: strokeGeometry(build.outlines.arrays, build.outlines.stroke, build.outlines.seed, undefined, outlinesCls),
      windows: plainGeometry(build.windows, windowsCls),
      treeSolid: plainGeometry(build.trees.solid, treeCls),
      treeStrokes: strokeGeometry(build.trees.strokes, build.trees.stroke, build.trees.seed, undefined, treeCls),
    }
  }, [build, flags.ids])
  useEffect(() => () => { if (meshes) for (const g of Object.values(meshes)) g.dispose() }, [meshes])

  if (!meshes) return null
  return (
    <group name="street" position={offset}>
      <mesh name="street-underpaint" geometry={meshes.underpaint} material={materials.solid} renderOrder={0} />
      <mesh name="street-ground" geometry={meshes.ground} material={materials.ground} renderOrder={1} />
      <mesh name="street-strokes" geometry={meshes.strokes} material={materials.strokes} renderOrder={1} />
      <mesh name="street-windows" geometry={meshes.windows} material={materials.solid} renderOrder={2} />
      <mesh name="street-outlines" geometry={meshes.outlines} material={materials.strokes} renderOrder={3} />
      <mesh name="street-trees-solid" geometry={meshes.treeSolid} material={materials.solid} renderOrder={2} />
      <mesh name="street-trees-strokes" geometry={meshes.treeStrokes} material={materials.trees} renderOrder={3} />
    </group>
  )
}
