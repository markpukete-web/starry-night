import { useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { useControls } from 'leva'
import { NoColorSpace } from 'three'
import { useImageData } from './useImageData'
import { brushDabGeometry, buildDabField2D, makeBrushDabMaterial } from './dabEngine'

// The brush-dab churn layer over the living painting: strokes coloured from the painting flowing along
// the swirls. CPU-seeds from the signed flow + sky mask, renders one instanced, vertex-animated draw.
export function BrushDabs({ paused = false, count = 12000 }: { paused?: boolean; count?: number }) {
  const size = useThree((s) => s.size)
  const flow = useImageData('/reference/signed-flow.png')
  const maskData = useImageData('/reference/sky-mask.png')
  const [painting, maskTex] = useTexture(['/reference/painting.jpg', '/reference/sky-mask.png'])

  useEffect(() => {
    /* eslint-disable react-hooks/immutability -- one-time texture config, matches the base 1:1 */
    painting.colorSpace = NoColorSpace
    painting.flipY = false
    painting.needsUpdate = true
    maskTex.colorSpace = NoColorSpace
    maskTex.flipY = false
    maskTex.needsUpdate = true
    /* eslint-enable react-hooks/immutability */
  }, [painting, maskTex])

  const { dabSize, drift, churnSpeed, haloSpin, strokeOpacity, patchStrokes } = useControls('brush dabs', {
    dabSize: { value: 0.5, min: 0.3, max: 2.5, step: 0.05, label: 'dab size' },
    drift: { value: 0.9, min: 0, max: 2.5, step: 0.05, label: 'drift' },
    churnSpeed: { value: 0.13, min: 0, max: 0.6, step: 0.01, label: 'churn speed' },
    haloSpin: { value: 0.5, min: 0, max: 2.5, step: 0.05, label: 'halo spin' }, // orbit sweep of the star/moon rings
    strokeOpacity: { value: 0.5, min: 0, max: 1, step: 0.05, label: 'stroke opacity' },
    patchStrokes: { value: true, label: 'patch strokes' },
  })

  const geometry = useMemo(
    () => (flow && maskData ? brushDabGeometry(buildDabField2D({ flow, mask: maskData, count })) : null),
    [flow, maskData, count],
  )
  const material = useMemo(() => makeBrushDabMaterial(painting, maskTex), [painting, maskTex])

  useEffect(() => {
    /* eslint-disable react-hooks/immutability -- intentional R3F uniform writes */
    material.uniforms.uSize.value = dabSize
    material.uniforms.uDrift.value = drift
    material.uniforms.uSpeed.value = churnSpeed
    material.uniforms.uOmega.value = haloSpin
    material.uniforms.uOpacity.value = strokeOpacity
    material.uniforms.uPatchStrokes.value = patchStrokes ? 1 : 0
    /* eslint-enable react-hooks/immutability */
  }, [material, dabSize, drift, churnSpeed, haloSpin, strokeOpacity, patchStrokes])
  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability -- intentional R3F uniform write
    material.uniforms.uViewA.value = size.width / size.height
  }, [material, size])
  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability -- intentional R3F uniform write
    material.uniforms.uFreeze.value = paused ? 1 : 0
  }, [material, paused])
  useEffect(() => () => material.dispose(), [material])
  useEffect(() => () => geometry?.dispose(), [geometry])

  useFrame((_, dt) => {
    if (paused) return
    // eslint-disable-next-line react-hooks/immutability -- render-loop uniform write
    material.uniforms.uTime.value += dt
  })

  if (!geometry) return null
  return <mesh geometry={geometry} material={material} frustumCulled={false} renderOrder={1} />
}
