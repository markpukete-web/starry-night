import { useEffect, useMemo } from 'react'
import { useTexture } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { DoubleSide, MeshBasicMaterial, SRGBColorSpace } from 'three'
import { buildVillageStudy } from './villageStudyGeometry'

/** The bounded church-and-neighbours study, reachable only through the DEV comparison seam. */
export function VillageStudy() {
  const meshes = useMemo(() => buildVillageStudy(), [])
  const source = useTexture('/reference/village-study-atlas.webp')
  const gl = useThree(state => state.gl)
  const texture = useMemo(() => {
    const copy = source.clone()
    copy.colorSpace = SRGBColorSpace
    copy.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy())
    copy.needsUpdate = true
    return copy
  }, [source, gl])
  const material = useMemo(() => new MeshBasicMaterial({ vertexColors: true, toneMapped: false, side: DoubleSide }), [])
  const skinMaterial = useMemo(() => new MeshBasicMaterial({ map: texture, vertexColors: true, toneMapped: false, side: DoubleSide }), [texture])
  useEffect(() => () => {
    meshes.solid.dispose()
    meshes.paint.dispose()
    meshes.skin.dispose()
  }, [meshes])
  useEffect(() => () => material.dispose(), [material])
  useEffect(() => () => skinMaterial.dispose(), [skinMaterial])
  useEffect(() => () => texture.dispose(), [texture])
  return (
    <group name="village-study">
      <mesh name="village-study-solid" geometry={meshes.solid} material={material} renderOrder={2} />
      <mesh name="village-study-skin" geometry={meshes.skin} material={skinMaterial} renderOrder={3} />
      <mesh name="village-study-paint" geometry={meshes.paint} material={material} renderOrder={4} />
    </group>
  )
}
