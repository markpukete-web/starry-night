import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useThree } from '@react-three/fiber'
import type { PerspectiveCamera } from 'three'
import { CYPRESS_STROKE_BODY, strokeGlslWith } from './cypressStrokeShader.ts'
import type { BakedMass } from './landDomes.ts'
import { buildFlatPanel, buildStreet, FLAT_VIEW, type StreetBuild, type StreetCounts } from './streetGeometry.ts'
import { FOG, fogInjection } from './streetFog.ts'
import { grassBaseBody, grassBasePalette } from './grassBase.ts'
import { BrushCypress } from './BrushCypress.tsx'
import {
  STATION_T,
  STOP0_CAMERA,
  STREET,
  STREET_CYPRESS_AT,
  STREET_CYPRESS_STRIDE,
  walkPose,
} from './streetLayout.ts'
import { readStreetFlags, streetReadiness, type AssetStatus } from './streetMode.ts'
import { strokeGeometry } from './strokeGeometry.ts'
import StreetLife from './streetLife.tsx'
import { swayInjection } from './streetLife.ts'
import StreetWalk from './StreetWalk.tsx'
import StreetGrass from './StreetGrass.tsx'
import StreetFrog from './StreetFrog.tsx'
import StreetMoths from './StreetMoths.tsx'
import StreetOwl from './StreetOwl.tsx'
import { useImageData } from './useImageData.ts'
import { grassBaseMaterial, groundMaterial } from './streetLantern.ts'
import { material, plainGeometry } from './streetMaterial.ts'

type StreetWindow = Window & {
  __streetReady?: boolean
  __streetCounts?: StreetCounts
  __streetCamera?: () => { position: number[]; quaternion: number[]; fov: number; near: number; far: number }
}

/**
 * The street (S1, tasks/2026-10-23-street-s1-plan.md): built once from the painting, the land flow and the baked
 * masses, all or nothing (`streetReadiness`), drawn in place of the diorama's foreground under the same sky. It places
 * the camera at its station itself, so the layout stays in this lazy chunk. `?flat=1` draws the flat panel instead
 * (G4b: four faces laid flat in the production materials, no fog), facing the camera.
 *
 * Through the portal (tasks/2026-10-25-street-portal-plan.md): `onReady` reports once per mount, `ok` false when an asset
 * failed, since `__streetReady` stays set after an unmount; `hold` keeps Vincent at his station while the layer covers
 * the street (plan review F4).
 */
export default function Street({
  reduced = false,
  still = false,
  hold = false,
  onReady,
}: { reduced?: boolean; still?: boolean; hold?: boolean; onReady?: (ok: boolean) => void } = {}) {
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

  // the build and its meshes in one memo, which keeps only what the street reads after it: the build's plain arrays
  // go out of scope when it returns (the phone's memory, 2026-10-28: they held 54 MB for the street's life)
  const built = useMemo(() => {
    if (!readiness.render) return null
    const build = flags.flat ? buildFlatPanel(paintingData, flowData, massesState.data, flags.grass) : buildStreet(paintingData, flowData, massesState.data, { lit: flags.light, grass: flags.grass })
    if (!build) return null
    return { meshes: streetMeshes(build, flags.ids), windows: build.windows, lamps: build.report.lane.lamps, counts: build.counts }
  }, [readiness.render, flags.flat, flags.light, flags.grass, flags.ids, paintingData, flowData, massesState.data])

  useEffect(() => {
    const w = window as StreetWindow
    w.__streetReady = readiness.ready
    if (built) w.__streetCounts = { ...built.counts, builds: (w.__streetCounts?.builds ?? 0) + 1 }
    else delete w.__streetCounts
  }, [readiness.ready, built])
  const reportedRef = useRef(false)
  useEffect(() => {
    if (!readiness.ready || reportedRef.current) return
    reportedRef.current = true
    onReady?.(readiness.render)
  }, [readiness.ready, readiness.render, onReady])

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
      const initialT = flags.walkT ?? STATION_T[flags.station]
      const pose = walkPose(initialT, portrait)
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
  }, [camera, flags.flat, flags.station, flags.walkT, portrait, offset])
  /* eslint-enable react-hooks/immutability */

  const fog = useMemo(() => {
    const devFogColour = import.meta.env.DEV && typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('fogColour') : null
    const fogColour = devFogColour ? (devFogColour.startsWith('#') ? devFogColour : `#${devFogColour}`) : FOG.colour
    return () => (flags.flat ? fogInjection(fogColour, 100, 200) : fogInjection(fogColour))
  }, [flags.flat])
  const materials = useMemo(() => {
    const ids = flags.ids > 0
    return {
      solid: material('street-solid', null, fog(), false, ids),
      strokes: material('street-strokes', strokeGlslWith(CYPRESS_STROKE_BODY), fog(), true, ids),
      // Vincent's lantern lights the ground (V1 task 4), lit only: `?light=0` keeps the base's program
      ground: groundMaterial(fog(), ids, flags.light),
      // pass 1: the land's body broke the curls into combs at walking distance; the cypress's (E4) holds them
      // the trees sway in a breeze (streetLife.tsx)
      trees: material('street-trees-sway', strokeGlslWith(CYPRESS_STROKE_BODY), fog(), true, ids, swayInjection()),
      treeSolid: material('street-trees-solid-sway', null, fog(), false, ids, swayInjection()),
    }
  }, [fog, flags.ids, flags.light])
  useEffect(() => () => { for (const m of Object.values(materials)) m.dispose() }, [materials])
  // the base under the grass, painted with the bushes' dark dabs (S3b pass 5): its paint is the painting's, so it waits for it
  const baseMaterial = useMemo(
    () => (flags.grass && paintingData ? grassBaseMaterial(grassBaseBody(grassBasePalette(paintingData)), fog(), flags.ids > 0, flags.light) : null),
    [flags.grass, flags.ids, flags.light, paintingData, fog],
  )
  useEffect(() => () => baseMaterial?.dispose(), [baseMaterial])

  const meshes = built?.meshes ?? null
  useEffect(() => () => { if (meshes) for (const g of Object.values(meshes)) g?.dispose() }, [meshes])

  if (!meshes) return null
  const devStrideStr = import.meta.env.DEV && typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('cypressStride') : null
  const devStride = devStrideStr ? parseInt(devStrideStr, 10) : null
  const cypressStride = devStride && !Number.isNaN(devStride) ? devStride : STREET_CYPRESS_STRIDE

  return (
    <group name="street" position={offset}>
      <mesh name="street-underpaint" geometry={meshes.underpaint} material={materials.solid} renderOrder={0} />
      {/* after the underpaint, as it drew inside that mesh until pass 5, and before `street-ground` (order 1), so a tie in depth with the ground mesh still goes to the ground */}
      {meshes.grassBase && baseMaterial && <mesh name="street-grass-base" geometry={meshes.grassBase} material={baseMaterial} renderOrder={0.5} />}
      <mesh name="street-ground" geometry={meshes.ground} material={materials.ground} renderOrder={1} />
      <mesh name="street-strokes" geometry={meshes.strokes} material={materials.strokes} renderOrder={1} />
      <mesh name="street-windows" geometry={meshes.windows} material={materials.solid} renderOrder={2} />
      <mesh name="street-outlines" geometry={meshes.outlines} material={materials.strokes} renderOrder={3} />
      <mesh name="street-trees-solid" geometry={meshes.treeSolid} material={materials.treeSolid} renderOrder={2} />
      <mesh name="street-trees-strokes" geometry={meshes.treeStrokes} material={materials.trees} renderOrder={3} />
      {/* the cypress draws in its own colours in the ID frames too: the gate masks by exact ID colour, which its channels
       never reach, and the full frame shows the same pixels as tree, so the two frames agree (Fable C3) */}
      {!flags.flat && (
        <BrushCypress
          at={STREET_CYPRESS_AT}
          scale={0.9 / 2.7}
          viewFrom={STOP0_CAMERA}
          stride={cypressStride}
          alive={false}
          painting={paintingData ?? undefined}
        />
      )}
      {!flags.flat && flags.ids === 0 && flags.light && built && paintingData && <StreetLife windows={built.windows} painting={paintingData} reduced={reduced} lamps={built.lamps} />}
      {!flags.flat && flags.ids === 0 && flags.light && built && paintingData && <StreetMoths painting={paintingData} lamps={built.lamps} windows={built.windows} offset={offset} reduced={reduced} />}
      {!flags.flat && paintingData && <StreetOwl painting={paintingData} flags={flags} reduced={reduced} />}
      {!flags.flat && flags.grass && paintingData && (
        <StreetGrass
          painting={paintingData}
          flags={flags}
          offset={offset}
          reduced={reduced}
          still={still}
        />
      )}
      {/* the frogs live in the grass's gaps and on the square at its end, so only with the grass (S3b pass 5) */}
      {!flags.flat && flags.grass && paintingData && <StreetFrog painting={paintingData} flags={flags} reduced={reduced} />}
      {!flags.flat && (
        <StreetWalk
          painting={paintingData}
          flags={flags}
          offset={offset}
          reduced={reduced || hold}
          still={still}
        />
      )}
    </group>
  )
}

/**
 * The street's geometry from its build: typed copies of the build's arrays, which the caller then lets go. The class
 * attribute only for the ID views, which alone read it, and no vertex normals (Codex P3, the phone's memory: 8 MB).
 */
function streetMeshes(build: StreetBuild, ids: number) {
  const isSrc = ids === 2
  const cls = (a: { cls: number[]; src: number[] }) => (ids === 0 ? undefined : isSrc ? a.src : a.cls)
  const treeCls = ids === 0 ? undefined : isSrc ? 255 : 5
  return {
    underpaint: plainGeometry(build.underpaint, cls(build.underpaint), false),
    grassBase: build.grassBase.indices.length > 0 ? plainGeometry(build.grassBase, cls(build.grassBase), false) : null,
    strokes: strokeGeometry(build.strokes.arrays, build.strokes.stroke, build.strokes.seed, undefined, cls(build.strokes), false),
    ground: strokeGeometry(build.ground.arrays, build.ground.stroke, build.ground.seed, undefined, cls(build.ground), false),
    outlines: strokeGeometry(build.outlines.arrays, build.outlines.stroke, build.outlines.seed, undefined, cls(build.outlines), false),
    windows: plainGeometry(build.windows, cls(build.windows), false),
    treeSolid: plainGeometry(build.trees.solid, treeCls, false),
    treeStrokes: strokeGeometry(build.trees.strokes, build.trees.stroke, build.trees.seed, undefined, treeCls, false),
  }
}
