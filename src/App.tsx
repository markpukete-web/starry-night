import { Canvas, useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { Suspense, useEffect, useMemo } from 'react'
import { SRGBColorSpace } from 'three'
import { useImageData } from './scene/useImageData'
import { BrushstrokeSky } from './scene/BrushstrokeSky'
import { CameraRig } from './scene/CameraRig'
import { makeMaskedTexture } from './scene/layers'

const STROKE_COUNT = 8000

/**
 * The painting on a cover-framed plane, with the brushstroke sky composited over it.
 * Painting plane and strokes share one cover-scaled group so they stay aligned.
 */
function Scene() {
  const tex = useTexture('/reference/painting.jpg')
  tex.colorSpace = SRGBColorSpace
  const flow = useImageData('/reference/flow-field.png')
  const colourSrc = useImageData('/reference/painting.jpg')

  const viewport = useThree((s) => s.viewport)
  const invalidate = useThree((s) => s.invalidate)
  const img = tex.image as { width: number; height: number } | undefined
  const aspect = img ? img.width / img.height : 1.263
  // margin so the pan/tilt camera never reveals the plane edge
  const cover = Math.max(viewport.width / aspect, viewport.height) * 1.15

  // cypress cut out of the painting onto a nearer plane → parallax under the pan/tilt camera
  const cypressTex = useMemo(
    () => (colourSrc ? makeMaskedTexture(colourSrc, { rect: [0, 0.08, 0.22, 1], maxLum: 0.34 }) : null),
    [colourSrc],
  )

  useEffect(() => invalidate(), [tex, flow, colourSrc, cover, invalidate])

  return (
    <group scale={[cover, cover, 1]}>
      <mesh>
        <planeGeometry args={[aspect, 1]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      {flow && colourSrc && (
        <BrushstrokeSky flow={flow} colourSrc={colourSrc} aspect={aspect} count={STROKE_COUNT} />
      )}
      {cypressTex && (
        <mesh position={[0, 0, 0.3]} renderOrder={10}>
          <planeGeometry args={[aspect, 1]} />
          <meshBasicMaterial map={cypressTex} transparent depthTest={false} depthWrite={false} toneMapped={false} />
        </mesh>
      )}
    </group>
  )
}

export default function App() {
  return (
    <Canvas
      frameloop="always"
      camera={{ position: [0, 0, 2], fov: 45 }}
      dpr={[1, 2]}
      gl={{ preserveDrawingBuffer: true }}
    >
      <color attach="background" args={['#0a0f1f']} />
      <CameraRig />
      <Suspense fallback={null}>
        <Scene />
      </Suspense>
    </Canvas>
  )
}
