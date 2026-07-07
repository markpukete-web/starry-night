import { useMemo } from 'react'
import { BufferAttribute, BufferGeometry, Color, DoubleSide, MeshBasicMaterial, Vector3 } from 'three'
import { PALETTE } from './palette'
import { CYPRESS_FLAME_FINS, makeCypressFinOutline } from './cypressFlameGeometry'

function buildFinGeometry(seed: number, width: number, height: number, z: number) {
  const outline = makeCypressFinOutline(seed)
  const root = new Vector3(0, 0, z)
  const positions: number[] = [root.x, root.y, root.z]
  const colours: number[] = []
  const indices: number[] = []
  const dark = new Color(PALETTE.cypress).multiplyScalar(0.54)
  const green = new Color(PALETTE.cypressGreen).multiplyScalar(0.62)
  const rim = new Color(PALETTE.villageCool).multiplyScalar(0.8)

  colours.push(dark.r, dark.g, dark.b)
  outline.forEach((point, index) => {
    const side = Math.abs(point.x)
    const lift = point.y
    const colour = dark
      .clone()
      .lerp(green, Math.min(1, 0.28 + lift * 0.48))
      .lerp(rim, Math.max(0, side - 0.2) * 0.55)
    positions.push(point.x * width, point.y * height, z)
    colours.push(colour.r, colour.g, colour.b)
    const next = index === outline.length - 1 ? 1 : index + 2
    indices.push(0, index + 1, next)
  })

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
  geometry.setAttribute('color', new BufferAttribute(new Float32Array(colours), 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  return geometry
}

export function CypressFlameVolume() {
  const fins = useMemo(
    () =>
      CYPRESS_FLAME_FINS.map((fin, index) => ({
        ...fin,
        geometry: buildFinGeometry(index, fin.width, fin.height, fin.z),
      })),
    [],
  )

  const material = useMemo(
    () => new MeshBasicMaterial({ vertexColors: true, side: DoubleSide, toneMapped: true }),
    [],
  )

  return (
    <group position={[-1.31, 0.01, 0.78]} rotation={[0, 0.04, 0]}>
      {fins.map((fin, index) => (
        <mesh
          key={index}
          geometry={fin.geometry}
          material={material}
          rotation={[0, fin.yaw, 0]}
          renderOrder={3}
        />
      ))}
    </group>
  )
}
