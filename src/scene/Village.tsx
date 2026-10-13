import { useEffect, useLayoutEffect, useMemo, type RefObject } from 'react'
import { useTexture } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { DoubleSide, MeshBasicMaterial, SRGBColorSpace } from 'three'
import { injectAlive } from './aliveMaterial'
import { ALIVE_DEFAULTS, type AliveTuning } from './skyAlive'
import { buildVillage } from './villageGeometry'
import { glowGlsl, glowUniformValues } from './villageGlow'

/** Dev seam for the gate: the foreground's alive attribute counts, read by the capture step (second pass, F11). */
type AliveFoliageWindow = Window & { __aliveFoliage?: { flickerVertices?: number; glowMarks?: number; glowVertices?: number } }

/** The village, church and foliage rows, painted with patches of the source painting (villageGeometry). */
export function Village({
  clock,
  alive = false,
  tuning = ALIVE_DEFAULTS,
}: {
  /** The one sky clock (make-it-alive A, second pass, A3): pinned, advanced, or 0 while paused. */
  clock?: RefObject<number>
  /** Make-it-alive A: the lit windows glimmer (villageGlow.ts). Off = today's village, bit for bit. */
  alive?: boolean
  tuning?: AliveTuning
} = {}) {
  const meshes = useMemo(() => buildVillage({ glow: alive }), [alive])
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
  // With the flag on the paint mesh gets its OWN material carrying the glimmer (today it shares `material` with the
  // solid, review F4); off, the two keep sharing the stock one, today's bytes.
  const glowUniforms = useMemo(() => {
    const v = glowUniformValues(ALIVE_DEFAULTS)
    return { uTime: { value: 0 }, uGlimmer: { value: v.strength }, uGlowAmp: { value: v.amplitudes } }
  }, [])
  const paintMaterial = useMemo(() => {
    if (!alive) return null
    const paint = new MeshBasicMaterial({ vertexColors: true, toneMapped: false, side: DoubleSide })
    injectAlive(paint, { key: 'alive-glow', uniforms: glowUniforms, ...glowGlsl })
    return paint
  }, [alive, glowUniforms])
  const skinMaterial = useMemo(() => new MeshBasicMaterial({ map: texture, vertexColors: true, toneMapped: false, side: DoubleSide }), [texture])
  const foliageMaterial = useMemo(() => new MeshBasicMaterial({ map: foliageTexture, vertexColors: true, toneMapped: false, side: DoubleSide }), [foliageTexture])
  useEffect(() => () => {
    meshes.solid.dispose()
    meshes.paint.dispose()
    meshes.skin.dispose()
    meshes.foliage.dispose()
  }, [meshes])
  useEffect(() => () => material.dispose(), [material])
  useEffect(() => () => paintMaterial?.dispose(), [paintMaterial])
  useEffect(() => () => skinMaterial.dispose(), [skinMaterial])
  useEffect(() => () => texture.dispose(), [texture])
  useEffect(() => () => foliageMaterial.dispose(), [foliageMaterial])

  // the knob, through the uniform: a slider never rebuilds the village
  useLayoutEffect(() => {
    if (!alive) return
    /* eslint-disable react-hooks/immutability -- intentional R3F uniform writes */
    glowUniforms.uGlimmer.value = glowUniformValues(tuning).strength
    /* eslint-enable react-hooks/immutability */
  }, [alive, glowUniforms, tuning])

  // the sky clock as the sky's frame loop last wrote it (one frame behind, like the halos); 0 off or paused
  /* eslint-disable react-hooks/immutability -- R3F render-loop writes: the time uniform */
  useFrame(() => {
    if (!alive) return
    glowUniforms.uTime.value = clock?.current ?? 0
  })
  /* eslint-enable react-hooks/immutability */

  // the gate's dev seam: how many marks and vertices carry the attribute
  useEffect(() => {
    if (!alive) return
    const seam = (window as AliveFoliageWindow).__aliveFoliage ?? {}
    seam.glowMarks = meshes.litMarks
    const glow = meshes.paint.getAttribute('aGlow').array
    let lit = 0
    for (let i = 0; i < glow.length; i += 3) if (glow[i] > 0) lit++
    seam.glowVertices = lit
    ;(window as AliveFoliageWindow).__aliveFoliage = seam
  }, [alive, meshes])

  return (
    <group name="village">
      <mesh name="village-solid" geometry={meshes.solid} material={material} renderOrder={2} />
      <mesh name="village-skin" geometry={meshes.skin} material={skinMaterial} renderOrder={3} />
      <mesh name="village-paint" geometry={meshes.paint} material={paintMaterial ?? material} renderOrder={4} />
      <mesh name="village-foliage" geometry={meshes.foliage} material={foliageMaterial} renderOrder={3} />
    </group>
  )
}
