import { useEffect, useMemo } from 'react'
import { useTexture } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { DoubleSide, MeshBasicMaterial, SRGBColorSpace } from 'three'
import { buildVillage } from './villageGeometry'

/** The village, church and foliage rows, painted with patches of the source painting (villageGeometry). */
export function Village() {
  const meshes = useMemo(() => buildVillage(), [])
  const source = useTexture('/reference/village-atlas.webp')
  const foliageSource = useTexture('/reference/painting.jpg')
  const gl = useThree(state => state.gl)
  const texture = useMemo(() => {
    const copy = source.clone()
    copy.colorSpace = SRGBColorSpace
    copy.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy())
    copy.needsUpdate = true
    return copy
  }, [source, gl])
  const foliageTexture = useMemo(() => {
    const copy = foliageSource.clone()
    copy.colorSpace = SRGBColorSpace
    copy.flipY = false
    copy.needsUpdate = true
    return copy
  }, [foliageSource])
  const material = useMemo(() => new MeshBasicMaterial({ vertexColors: true, toneMapped: false, side: DoubleSide }), [])
  const skinMaterial = useMemo(() => new MeshBasicMaterial({ map: texture, vertexColors: true, toneMapped: false, side: DoubleSide }), [texture])
  const foliageMaterial = useMemo(() => new MeshBasicMaterial({ map: foliageTexture, vertexColors: true, toneMapped: false, side: DoubleSide }), [foliageTexture])
  useEffect(() => () => {
    meshes.solid.dispose()
    meshes.paint.dispose()
    meshes.skin.dispose()
    meshes.foliage.dispose()
  }, [meshes])
  useEffect(() => () => material.dispose(), [material])
  useEffect(() => () => skinMaterial.dispose(), [skinMaterial])
  useEffect(() => () => texture.dispose(), [texture])
  useEffect(() => () => foliageMaterial.dispose(), [foliageMaterial])
  useEffect(() => () => foliageTexture.dispose(), [foliageTexture])
  return (
    <group name="village">
      <mesh name="village-solid" geometry={meshes.solid} material={material} renderOrder={2} />
      <mesh name="village-skin" geometry={meshes.skin} material={skinMaterial} renderOrder={3} />
      <mesh name="village-paint" geometry={meshes.paint} material={material} renderOrder={4} />
      <mesh name="village-foliage" geometry={meshes.foliage} material={foliageMaterial} renderOrder={3} />
    </group>
  )
}
