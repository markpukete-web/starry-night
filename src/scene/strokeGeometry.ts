import { BufferAttribute, BufferGeometry } from 'three'

/**
 * A brush-arrays build as a geometry with E1's stroke attributes, and D1's bend weight when given. Moved out of
 * `BrushIsland.tsx` for the street (S1 task 3), unchanged but for the length check: the stroke body reads `aStroke`
 * (along, across) and `aSeed` per vertex, and a build that lost them drew no ribbon (street plan review F1).
 */
export function strokeGeometry(arrays: { positions: number[]; colors: number[]; indices: number[] }, stroke: number[], seed: number[], bend?: number[], cls?: number[] | number): BufferGeometry {
  const vertices = arrays.positions.length / 3
  if (stroke.length !== vertices * 2) throw new Error(`strokeGeometry: aStroke has ${stroke.length} values for ${vertices} vertices`)
  if (seed.length !== vertices) throw new Error(`strokeGeometry: aSeed has ${seed.length} values for ${vertices} vertices`)
  if (Array.isArray(cls) && cls.length !== vertices) throw new Error(`strokeGeometry: aClass has ${cls.length} values for ${vertices} vertices`)
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(arrays.positions), 3))
  geometry.setAttribute('color', new BufferAttribute(new Float32Array(arrays.colors), 3))
  geometry.setAttribute('aStroke', new BufferAttribute(new Float32Array(stroke), 2))
  geometry.setAttribute('aSeed', new BufferAttribute(new Float32Array(seed), 1))
  if (bend) geometry.setAttribute('aBend', new BufferAttribute(new Float32Array(bend), 1))
  if (cls !== undefined) {
    const clsArr = typeof cls === 'number' ? new Float32Array(vertices).fill(cls) : new Float32Array(cls)
    geometry.setAttribute('aClass', new BufferAttribute(clsArr, 1))
  }
  geometry.setIndex(arrays.indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  return geometry
}
