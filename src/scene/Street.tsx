import { useEffect, useMemo, useState } from 'react'
import { BufferAttribute, BufferGeometry, DoubleSide, MeshBasicMaterial } from 'three'
import { concatInjections, injectAlive } from './aliveMaterial.ts'
import type { BrushArrays } from './brushForms.ts'
import { strokeGlsl } from './cypressStrokeShader.ts'
import type { BakedMass } from './landDomes.ts'
import { buildStreet, type StreetBuild, type StreetCounts } from './streetGeometry.ts'
import { fogInjection } from './streetFog.ts'
import { STREET } from './streetLayout.ts'
import { readStreetFlags, streetReadiness, type AssetStatus } from './streetMode.ts'
import { strokeGeometry } from './strokeGeometry.ts'
import { useImageData } from './useImageData.ts'

type StreetWindow = Window & {
  __streetReady?: boolean
  __streetCounts?: StreetCounts
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

export default function Street() {
  const flags = useMemo(
    () => readStreetFlags(typeof window !== 'undefined' ? window.location.search : ''),
    [],
  )

  const [paintingFailed, setPaintingFailed] = useState(false)
  const [flowFailed, setFlowFailed] = useState(false)
  const [massesState, setMassesState] = useState<{ status: AssetStatus; data: BakedMass[] | null }>({
    status: 'pending',
    data: null,
  })

  const paintingUrl =
    flags.fail === 'painting' ? '/reference/missing.png' : '/reference/painting.jpg'
  const flowUrl =
    flags.fail === 'flow' ? '/reference/missing.png' : '/reference/land-flow.png'
  const massesUrl =
    flags.fail === 'masses' ? '/reference/missing.png' : '/reference/land-masses.json'

  const paintingData = useImageData(paintingUrl, () => setPaintingFailed(true))
  const flowData = useImageData(flowUrl, () => setFlowFailed(true))

  const paintingStatus: AssetStatus = paintingFailed ? 'failed' : paintingData ? 'ok' : 'pending'
  const flowStatus: AssetStatus = flowFailed ? 'failed' : flowData ? 'ok' : 'pending'
  const massesStatus: AssetStatus = massesState.status
  const bakedMasses = massesState.data

  useEffect(() => {
    let alive = true
    fetch(massesUrl)
      .then((res) => (res.ok ? (res.json() as Promise<BakedMass[]>) : Promise.reject(new Error(String(res.status)))))
      .then((json) => {
        if (!alive) return
        setMassesState({ status: 'ok', data: json })
      })
      .catch(() => {
        if (!alive) return
        setMassesState({ status: 'failed', data: null })
      })
    return () => {
      alive = false
    }
  }, [massesUrl])

  const readiness = useMemo(
    () =>
      streetReadiness({
        painting: paintingStatus,
        flow: flowStatus,
        masses: massesStatus,
      }),
    [paintingStatus, flowStatus, massesStatus],
  )

  const build = useMemo<StreetBuild | null>(() => {
    if (!readiness.render) return null
    return buildStreet(paintingData, flowData, bakedMasses)
  }, [readiness.render, paintingData, flowData, bakedMasses])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const w = window as StreetWindow
    w.__streetReady = readiness.ready
    if (build) {
      w.__streetCounts = build.counts
    } else {
      delete w.__streetCounts
    }
  }, [readiness.ready, build])

  const solidMat = useMemo(() => {
    const mat = new MeshBasicMaterial({ vertexColors: true, toneMapped: false })
    injectAlive(
      mat,
      concatInjections(
        'street-solid',
        { uniforms: {}, vertexHead: '', vertexBody: '', fragmentHead: '', fragmentBody: '' },
        fogInjection(),
      ),
    )
    return mat
  }, [])

  const treeStrokeMat = useMemo(() => {
    const mat = new MeshBasicMaterial({
      vertexColors: true,
      toneMapped: false,
      side: DoubleSide,
      alphaTest: 0.5,
    })
    injectAlive(mat, concatInjections('street-trees', { uniforms: {}, ...strokeGlsl }, fogInjection()))
    return mat
  }, [])

  const meshes = useMemo(() => {
    if (!build) return null
    const underpaintGeo = plainGeometry(build.underpaint)
    const treeSolidGeo = plainGeometry(build.trees.solid)
    const treeStrokesGeo = strokeGeometry(
      build.trees.strokes,
      build.trees.stroke,
      build.trees.seed,
    )
    return { underpaintGeo, treeSolidGeo, treeStrokesGeo }
  }, [build])

  if (!meshes) return null

  const groupPosition: [number, number, number] =
    flags.anchor === 'A' ? [STREET.originA[0], STREET.originA[1], STREET.originA[2]] : [0, 0, 0]

  return (
    <group position={groupPosition}>
      <mesh geometry={meshes.underpaintGeo} material={solidMat} />
      <mesh geometry={meshes.treeSolidGeo} material={solidMat} />
      <mesh geometry={meshes.treeStrokesGeo} material={treeStrokeMat} />
    </group>
  )
}
