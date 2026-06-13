import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stats } from '@react-three/drei'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import { Leva, useControls } from 'leva'
import { Suspense } from 'react'
import { useImageData } from './scene/useImageData'
import { SkyDome } from './scene/SkyDome'
import { Diorama } from './scene/Diorama'

const STROKE_COUNT = 12000

/** The 3D diorama beneath an enveloping dome of churning brushstroke sky. */
function World({ churnSpeed }: { churnSpeed: number }) {
  const flow = useImageData('/reference/flow-field.png')
  const colourSrc = useImageData('/reference/painting.jpg')
  return (
    <>
      <Diorama />
      {flow && colourSrc && <SkyDome flow={flow} colourSrc={colourSrc} count={STROKE_COUNT} speed={churnSpeed} />}
    </>
  )
}

export default function App() {
  const { churnSpeed } = useControls('sky', {
    churnSpeed: { value: 0.05, min: 0, max: 0.2, step: 0.005, label: 'churn speed' },
  })

  return (
    <>
      <Leva hidden={!import.meta.env.DEV} />
      <Canvas
        frameloop="always"
        camera={{ position: [2.4, 1.7, 4.4], fov: 42 }}
        dpr={[1, 1.5]}
        gl={{ preserveDrawingBuffer: true }}
      >
        <color attach="background" args={['#0b1736']} />
        <Suspense fallback={null}>
          <World churnSpeed={churnSpeed} />
        </Suspense>
        <OrbitControls
          makeDefault
          target={[0, 0.7, 0]}
          enablePan={false}
          enableDamping
          rotateSpeed={0.8}
          minDistance={3}
          maxDistance={6.5}
          minPolarAngle={0.2}
          maxPolarAngle={1.5}
        />
        <EffectComposer>
          <Bloom intensity={1.2} luminanceThreshold={0.35} luminanceSmoothing={0.9} radius={0.7} mipmapBlur />
        </EffectComposer>
        {import.meta.env.DEV && <Stats />}
      </Canvas>
    </>
  )
}
