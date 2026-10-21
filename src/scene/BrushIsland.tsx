import { useEffect, useMemo } from 'react'
import { BufferAttribute, BufferGeometry, DoubleSide, MeshBasicMaterial } from 'three'
import { buildIsland } from './islandGeometry'

/**
 * The floating landmass the village and cypress stand on — a real closed, rooted solid (so it is
 * NEVER a hole from any orbit angle, unlike the projected relief's funnel) whose rolling top is
 * clad in horizontal contour brushstrokes: the painting's blue-grey hills rising to a moonlit ridge
 * at the back-right, dissolving to dark earth down the root. The dark solid underneath means gaps
 * between strokes read as shadowed ground. The geometry is `islandGeometry.ts` (pure).
 */
export function BrushIsland() {
  const geometries = useMemo(() => {
    const built = buildIsland()
    const solid = new BufferGeometry()
    solid.setAttribute('position', new BufferAttribute(new Float32Array(built.solid.positions), 3))
    solid.setAttribute('color', new BufferAttribute(new Float32Array(built.solid.colors), 3))
    solid.setIndex(built.solid.indices)
    solid.computeVertexNormals()
    solid.computeBoundingSphere()
    const strokes = new BufferGeometry()
    strokes.setAttribute('position', new BufferAttribute(new Float32Array(built.strokes.positions), 3))
    strokes.setAttribute('color', new BufferAttribute(new Float32Array(built.strokes.colors), 3))
    strokes.setIndex(built.strokes.indices)
    strokes.computeVertexNormals()
    strokes.computeBoundingSphere()
    return { solid, strokes }
  }, [])

  const solidMat = useMemo(() => new MeshBasicMaterial({ vertexColors: true, toneMapped: false }), [])
  const strokeMat = useMemo(
    () => new MeshBasicMaterial({ vertexColors: true, toneMapped: false, side: DoubleSide }),
    [],
  )

  useEffect(() => () => geometries.solid.dispose(), [geometries])
  useEffect(() => () => geometries.strokes.dispose(), [geometries])
  useEffect(() => () => solidMat.dispose(), [solidMat])
  useEffect(() => () => strokeMat.dispose(), [strokeMat])

  return (
    <group>
      <mesh geometry={geometries.solid} material={solidMat} renderOrder={0} />
      <mesh geometry={geometries.strokes} material={strokeMat} renderOrder={1} />
    </group>
  )
}
