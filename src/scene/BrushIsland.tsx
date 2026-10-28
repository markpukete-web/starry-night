import { useEffect, useLayoutEffect, useMemo, useState, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferAttribute, BufferGeometry, DoubleSide, MeshBasicMaterial } from 'three'
import { concatInjections, injectAlive } from './aliveMaterial'
import { bendInjection, LAND_TOUCH, landUniformValues, type LandStore } from './landTouch'
import { strokeGlsl } from './cypressStrokeShader'
import { buildIsland } from './islandGeometry'
import { buildLandTrees, type BakedMass } from './landDomes'
import { buildLandStrokes } from './landStrokes'
import { strokeGeometry } from './strokeGeometry'
import { useImageData } from './useImageData'

type LandWindow = Window & { __landBuildMs?: number }

function plainGeometry(arrays: { positions: number[]; colors: number[]; indices: number[] }, bend?: number[]): BufferGeometry {
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(arrays.positions), 3))
  geometry.setAttribute('color', new BufferAttribute(new Float32Array(arrays.colors), 3))
  if (bend) geometry.setAttribute('aBend', new BufferAttribute(new Float32Array(bend), 1))
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
export function BrushIsland({
  ready: readyRef,
  touch,
}: {
  /** C (arrival): true once the ground has its strokes, or a load failed. */
  ready?: RefObject<boolean>
  /** D1 (touch the land): the store the input hook writes, and the bend knob. Absent, the trees are E2's, bit for bit. */
  touch?: { store: RefObject<LandStore>; clock: RefObject<number>; bendGain: number }
} = {}) {
  const bend = touch !== undefined
  const geometries = useMemo(() => {
    const built = buildIsland()
    return { solid: plainGeometry(built.solid), strokes: plainGeometry(built.strokes) }
  }, [])

  const [failed, setFailed] = useState(false)
  const paintingData = useImageData('/reference/painting.jpg', () => setFailed(true))
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
    const treeStrokes = strokeGeometry(trees.strokes, trees.stroke, trees.seed, bend ? trees.bend : undefined)
    const treeSolid = plainGeometry(trees.solid, bend ? trees.solidBend : undefined)
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
  }, [paintingData, flowData, baked, bend])

  const solidMat = useMemo(() => new MeshBasicMaterial({ vertexColors: true, toneMapped: false }), [])
  const strokeMat = useMemo(() => new MeshBasicMaterial({ vertexColors: true, toneMapped: false, side: DoubleSide }), [])
  // the ground's and the trees' strokes: E1's stroke body, opaque with the shaped alpha as a hard test (order-independent)
  const landMat = useMemo(() => {
    const material = new MeshBasicMaterial({ vertexColors: true, toneMapped: false, side: DoubleSide, alphaTest: 0.5 })
    injectAlive(material, concatInjections('land-strokes', { uniforms: {}, ...strokeGlsl }))
    return material
  }, [])
  // D1: the trees' strips and the domes take the bend on their own materials, so the ground's program stays E2's
  const stripBend = useMemo(() => bendInjection({ weight: 'aBend', attribute: 'aBend' }), [])
  const domeBend = useMemo(() => bendInjection({ weight: 'aBend', attribute: 'aBend' }), [])
  const treeMat = useMemo(() => {
    if (!bend) return null
    const material = new MeshBasicMaterial({ vertexColors: true, toneMapped: false, side: DoubleSide, alphaTest: 0.5 })
    injectAlive(material, concatInjections('land-trees-bend', { uniforms: {}, ...strokeGlsl }, stripBend))
    return material
  }, [bend, stripBend])
  const treeSolidMat = useMemo(() => {
    if (!bend) return null
    const material = new MeshBasicMaterial({ vertexColors: true, toneMapped: false })
    injectAlive(material, concatInjections('land-trees-bend-solid', domeBend))
    return material
  }, [bend, domeBend])

  // the bend knob, through the uniforms: a slider never rebuilds the land
  useLayoutEffect(() => {
    if (!touch) return
    /* eslint-disable react-hooks/immutability -- intentional R3F uniform writes */
    ;(stripBend.uniforms.uLandParams.value as Float32Array)[1] = LAND_TOUCH.foliagePush * touch.bendGain
    ;(domeBend.uniforms.uLandParams.value as Float32Array)[1] = LAND_TOUCH.foliagePush * touch.bendGain
    /* eslint-enable react-hooks/immutability */
  }, [touch, stripBend, domeBend])

  // the live touches, in the island's frame (the group sits at the origin), at the sky clock the hook stamped them with
  useFrame(() => {
    if (!touch) return
    const { entries, count } = landUniformValues(touch.store.current, touch.clock.current)
    for (const injection of [stripBend, domeBend]) {
      const list = injection.uniforms.uLand.value as Float32Array
      list.fill(0)
      list.set(entries)
      injection.uniforms.uLandCount.value = count
    }
  })

  useEffect(() => {
    if (readyRef) readyRef.current = land !== null || failed
    // the portal's way back mounts the land again: an unmount clears the seam, so no frame reads the last mount's
    return () => {
      if (readyRef) readyRef.current = false
    }
  }, [readyRef, land, failed])

  useEffect(() => () => geometries.solid.dispose(), [geometries])
  useEffect(() => () => geometries.strokes.dispose(), [geometries])
  useEffect(() => () => { land?.ground.dispose(); land?.treeSolid.dispose(); land?.treeStrokes.dispose() }, [land])
  useEffect(() => () => solidMat.dispose(), [solidMat])
  useEffect(() => () => strokeMat.dispose(), [strokeMat])
  useEffect(() => () => landMat.dispose(), [landMat])
  useEffect(() => () => treeMat?.dispose(), [treeMat])
  useEffect(() => () => treeSolidMat?.dispose(), [treeSolidMat])

  return (
    <group name="island">
      <mesh name="island-solid" geometry={geometries.solid} material={solidMat} renderOrder={0} />
      <mesh geometry={geometries.strokes} material={strokeMat} renderOrder={1} />
      {land && <mesh name="land-ground" geometry={land.ground} material={landMat} renderOrder={1} />}
      {land && <mesh name="land-trees-solid" geometry={land.treeSolid} material={treeSolidMat ?? solidMat} renderOrder={2} />}
      {land && <mesh name="land-trees-strokes" geometry={land.treeStrokes} material={treeMat ?? landMat} renderOrder={3} />}
    </group>
  )
}
