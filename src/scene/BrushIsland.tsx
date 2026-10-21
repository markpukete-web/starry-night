import { useEffect, useMemo, useState, type RefObject } from 'react'
import { BufferAttribute, BufferGeometry, DoubleSide, MeshBasicMaterial } from 'three'
import { concatInjections, injectAlive } from './aliveMaterial'
import { strokeGlsl } from './cypressStrokeShader'
import { buildIsland } from './islandGeometry'
import { buildLandTrees, type BakedMass } from './landDomes'
import { buildLandStrokes } from './landStrokes'
import { useImageData } from './useImageData'

type LandWindow = Window & { __landBuildMs?: number }

/** A brush-arrays build as a geometry with E1's stroke attributes. */
function strokeGeometry(arrays: { positions: number[]; colors: number[]; indices: number[] }, stroke: number[], seed: number[]): BufferGeometry {
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(arrays.positions), 3))
  geometry.setAttribute('color', new BufferAttribute(new Float32Array(arrays.colors), 3))
  geometry.setAttribute('aStroke', new BufferAttribute(new Float32Array(stroke), 2))
  geometry.setAttribute('aSeed', new BufferAttribute(new Float32Array(seed), 1))
  geometry.setIndex(arrays.indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  return geometry
}

function plainGeometry(arrays: { positions: number[]; colors: number[]; indices: number[] }): BufferGeometry {
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(arrays.positions), 3))
  geometry.setAttribute('color', new BufferAttribute(new Float32Array(arrays.colors), 3))
  geometry.setIndex(arrays.indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  return geometry
}

/**
 * The floating landmass the village and cypress stand on — a real closed, rooted solid (so it is
 * NEVER a hole from any orbit angle, unlike the projected relief's funnel). Its top is clad in the painting's own
 * ground strokes (E2, landStrokes.ts: streamlines in the land band's orientation field, draped on the terrain,
 * E1's stroke body) over a dark solid whose gaps read as shadowed ground, with the painting's trees and bushes
 * standing on it as stroked domes (landDomes.ts); the root keeps its dabs, dissolving to dark earth. The geometry
 * is `islandGeometry.ts` (pure); the ground and the trees wait on the painting, the land's flow and the baked
 * masses, so they are their own meshes, built once those have loaded.
 */
export function BrushIsland({ ready: readyRef }: { /** C (arrival): true once the ground has its strokes, or a load failed. */ ready?: RefObject<boolean> } = {}) {
  const geometries = useMemo(() => {
    const built = buildIsland()
    return { solid: plainGeometry(built.solid), strokes: plainGeometry(built.strokes) }
  }, [])

  const paintingData = useImageData('/reference/painting.jpg')
  const [failed, setFailed] = useState(false)
  const flowData = useImageData('/reference/land-flow.png', () => setFailed(true))
  const [baked, setBaked] = useState<BakedMass[] | null>(null)
  useEffect(() => {
    let alive = true
    fetch('/reference/land-masses.json')
      .then((response) => (response.ok ? (response.json() as Promise<BakedMass[]>) : Promise.reject(new Error(String(response.status)))))
      .then((json) => { if (alive) setBaked(json) })
      .catch(() => { if (alive) setFailed(true) })
    return () => { alive = false }
  }, [])
  const land = useMemo(() => {
    if (!paintingData || !flowData || !baked) return null
    // the build's duration is a gate seam; the memo is deterministic in its inputs, the clock read is the one impurity
    // eslint-disable-next-line react-hooks/purity -- a timing seam for the gate
    const started = performance.now()
    const ground = buildLandStrokes(flowData, paintingData)
    const trees = buildLandTrees(flowData, paintingData, baked)
    const groundGeometry = strokeGeometry(ground.arrays, ground.stroke, ground.seed)
    const treeStrokes = strokeGeometry(trees.strokes, trees.stroke, trees.seed)
    const treeSolid = plainGeometry(trees.solid)
    groundGeometry.userData = { ribbons: ground.ribbons, triangles: ground.arrays.indices.length / 3 }
    treeStrokes.userData = { counts: trees.counts, triangles: trees.strokes.indices.length / 3 }
    /* eslint-disable react-hooks/purity, react-hooks/immutability -- the timing seam, written once per build */
    const buildMs = performance.now() - started
    ;(window as LandWindow).__landBuildMs = buildMs
    /* eslint-enable react-hooks/purity, react-hooks/immutability */
    if (import.meta.env.DEV) {
      const strips = Object.values(trees.counts).reduce((sum, c) => sum + c.front + c.back, 0)
      console.info(`[land] built in ${buildMs.toFixed(0)} ms: ${ground.ribbons} ground ribbons (${ground.arrays.indices.length / 3} triangles), ${strips} tree strips (${trees.strokes.indices.length / 3} triangles)`)
    }
    return { ground: groundGeometry, treeSolid, treeStrokes }
  }, [paintingData, flowData, baked])

  const solidMat = useMemo(() => new MeshBasicMaterial({ vertexColors: true, toneMapped: false }), [])
  const strokeMat = useMemo(() => new MeshBasicMaterial({ vertexColors: true, toneMapped: false, side: DoubleSide }), [])
  // the ground's and the trees' strokes: E1's stroke body, opaque with the shaped alpha as a hard test (order-independent)
  const landMat = useMemo(() => {
    const material = new MeshBasicMaterial({ vertexColors: true, toneMapped: false, side: DoubleSide, alphaTest: 0.5 })
    injectAlive(material, concatInjections('land-strokes', { uniforms: {}, ...strokeGlsl }))
    return material
  }, [])

  useEffect(() => {
    if (readyRef) readyRef.current = land !== null || failed
  }, [readyRef, land, failed])

  useEffect(() => () => geometries.solid.dispose(), [geometries])
  useEffect(() => () => geometries.strokes.dispose(), [geometries])
  useEffect(() => () => { land?.ground.dispose(); land?.treeSolid.dispose(); land?.treeStrokes.dispose() }, [land])
  useEffect(() => () => solidMat.dispose(), [solidMat])
  useEffect(() => () => strokeMat.dispose(), [strokeMat])
  useEffect(() => () => landMat.dispose(), [landMat])

  return (
    <group name="island">
      <mesh geometry={geometries.solid} material={solidMat} renderOrder={0} />
      <mesh geometry={geometries.strokes} material={strokeMat} renderOrder={1} />
      {land && <mesh name="land-ground" geometry={land.ground} material={landMat} renderOrder={1} />}
      {land && <mesh name="land-trees-solid" geometry={land.treeSolid} material={solidMat} renderOrder={2} />}
      {land && <mesh name="land-trees-strokes" geometry={land.treeStrokes} material={landMat} renderOrder={3} />}
    </group>
  )
}
