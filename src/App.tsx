import { Canvas, useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { Suspense, useEffect } from 'react'
import { SRGBColorSpace } from 'three'
import { useImageData } from './scene/useImageData'
import { BrushstrokeSky } from './scene/BrushstrokeSky'

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
  const cover = Math.max(viewport.width / aspect, viewport.height)

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
      <Suspense fallback={null}>
        <Scene />
      </Suspense>
    </Canvas>
  )
}
