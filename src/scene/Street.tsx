import { useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { useThree } from '@react-three/fiber'
import { BufferAttribute, BufferGeometry, DoubleSide, MeshBasicMaterial, type PerspectiveCamera } from 'three'
import { concatInjections, injectAlive, type AliveInjection } from './aliveMaterial.ts'
import type { BrushArrays } from './brushForms.ts'
import { CYPRESS_STROKE_BODY, strokeGlsl, strokeGlslWith } from './cypressStrokeShader.ts'
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

function plainGeometry(a: BrushArrays): BufferGeometry {
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(new Float32Array(a.positions), 3))
  g.setAttribute('color', new BufferAttribute(new Float32Array(a.colors), 3))
  g.setIndex(a.indices)
  g.computeVertexNormals()
  g.computeBoundingSphere()
  return g
}

const NO_INJECTION = { uniforms: {}, vertexHead: '', vertexBody: '', fragmentHead: '', fragmentBody: '' }

function material(key: string, body: Omit<AliveInjection, 'key' | 'uniforms'> | null, fog: Omit<AliveInjection, 'key'>, stroke: boolean): MeshBasicMaterial {
  const m = new MeshBasicMaterial(stroke ? { vertexColors: true, toneMapped: false, side: DoubleSide, alphaTest: 0.5 } : { vertexColors: true, toneMapped: false, side: DoubleSide })
  injectAlive(m, concatInjections(key, body ? { uniforms: {}, ...body } : NO_INJECTION, fog))
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
    const fog = () => (flags.flat ? fogInjection(FOG.colour, 100, 200) : fogInjection())
    return {
      solid: material('street-solid', null, fog(), false),
      strokes: material('street-strokes', strokeGlslWith(CYPRESS_STROKE_BODY), fog(), true),
      trees: material('street-trees', strokeGlsl, fog(), true),
    }
  }, [flags.flat])
  useEffect(() => () => { for (const m of Object.values(materials)) m.dispose() }, [materials])

  const meshes = useMemo(() => {
    if (!build) return null
    return {
      underpaint: plainGeometry(build.underpaint),
      strokes: strokeGeometry(build.strokes.arrays, build.strokes.stroke, build.strokes.seed),
      outlines: strokeGeometry(build.outlines.arrays, build.outlines.stroke, build.outlines.seed),
      windows: plainGeometry(build.windows),
      treeSolid: plainGeometry(build.trees.solid),
      treeStrokes: strokeGeometry(build.trees.strokes, build.trees.stroke, build.trees.seed),
    }
  }, [build])
  useEffect(() => () => { if (meshes) for (const g of Object.values(meshes)) g.dispose() }, [meshes])

  if (!meshes) return null
  return (
    <group name="street" position={offset}>
      <mesh name="street-underpaint" geometry={meshes.underpaint} material={materials.solid} renderOrder={0} />
      <mesh name="street-strokes" geometry={meshes.strokes} material={materials.strokes} renderOrder={1} />
      <mesh name="street-windows" geometry={meshes.windows} material={materials.solid} renderOrder={2} />
      <mesh name="street-outlines" geometry={meshes.outlines} material={materials.strokes} renderOrder={3} />
      <mesh name="street-trees-solid" geometry={meshes.treeSolid} material={materials.solid} renderOrder={2} />
      <mesh name="street-trees-strokes" geometry={meshes.treeStrokes} material={materials.trees} renderOrder={3} />
    </group>
  )
}
