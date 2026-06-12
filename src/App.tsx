import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'

// Placeholder smoke-test scene — proves the R3F stack renders and orbits.
// The real piece starts from the first design session, not from here.
export default function App() {
  return (
    <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
      <color attach="background" args={['#0b1a3a']} />
      <Stars radius={50} depth={30} count={2000} factor={4} fade speed={0.5} />
      <OrbitControls enablePan={false} />
    </Canvas>
  )
}
