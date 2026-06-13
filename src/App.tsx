import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Leva, useControls } from 'leva'
import { Suspense } from 'react'
import { useImageData } from './scene/useImageData'
import { BrushstrokeSky } from './scene/BrushstrokeSky'
import { Diorama } from './scene/Diorama'

const STROKE_COUNT = 7000
const SKY_ASPECT = 1.263

/** The 3D diorama plus the churning brushstroke sky as a backdrop behind it. */
function World({ churnSpeed }: { churnSpeed: number }) {
  const flow = useImageData('/reference/flow-field.png')
  const colourSrc = useImageData('/reference/painting.jpg')
  return (
    <>
      <Diorama />
      {flow && colourSrc && (
        <group position={[0, 2.2, -3.3]} scale={[8.5, 8.5, 1]}>
          <mesh>
            <planeGeometry args={[SKY_ASPECT, 1]} />
            <meshBasicMaterial color="#16264a" toneMapped={false} />
          </mesh>
          <BrushstrokeSky flow={flow} colourSrc={colourSrc} aspect={SKY_ASPECT} count={STROKE_COUNT} speed={churnSpeed} />
        </group>
      )}
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
        camera={{ position: [3.0, 2.1, 5.2], fov: 42 }}
        dpr={[1, 2]}
        gl={{ preserveDrawingBuffer: true }}
      >
        <color attach="background" args={['#0a0f1f']} />
        <Suspense fallback={null}>
          <World churnSpeed={churnSpeed} />
        </Suspense>
        <OrbitControls
          target={[0, 0.7, 0]}
          enablePan={false}
          enableDamping
          minDistance={3}
          maxDistance={9}
          minPolarAngle={0.35}
          maxPolarAngle={1.45}
          minAzimuthAngle={-Math.PI / 2.4}
          maxAzimuthAngle={Math.PI / 2.4}
        />
      </Canvas>
    </>
  )
}
