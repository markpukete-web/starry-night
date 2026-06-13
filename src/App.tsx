import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stats } from '@react-three/drei'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import { Leva, useControls } from 'leva'
import { Suspense } from 'react'
import { useImageData } from './scene/useImageData'
import { SkyDome } from './scene/SkyDome'
import { Diorama } from './scene/Diorama'

export type SkyControls = {
  churnSpeed: number
  strokes: number
  strokeWidth: number
  swirlTightness: number
  saturation: number
  skyTop: string
  skyBottom: string
  glow: number
  moon: number
  stars: number
}

/** The 3D diorama beneath an enveloping dome of churning brushstroke sky. */
function World({ c }: { c: SkyControls }) {
  const flow = useImageData('/reference/flow-field.png')
  const colourSrc = useImageData('/reference/painting.jpg')
  return (
    <>
      <Diorama />
      {flow && colourSrc && (
        <SkyDome
          flow={flow}
          colourSrc={colourSrc}
          count={c.strokes}
          speed={c.churnSpeed}
          strokeWidth={c.strokeWidth}
          swirlTightness={c.swirlTightness}
          saturation={c.saturation}
          skyTop={c.skyTop}
          skyBottom={c.skyBottom}
          glowIntensity={c.glow}
          moonBright={c.moon}
          starBright={c.stars}
        />
      )}
    </>
  )
}

export default function App() {
  // Dev-only playground (the leva panel). Defaults reproduce the tuned look exactly.
  const sky = useControls('sky', {
    churnSpeed: { value: 0.05, min: 0, max: 0.2, step: 0.005, label: 'churn speed' },
    strokes: { value: 8000, min: 1500, max: 14000, step: 500, label: 'stroke count' },
    strokeWidth: { value: 1, min: 0.4, max: 2.2, step: 0.05, label: 'stroke width' },
    swirlTightness: { value: 0.45, min: 0, max: 1, step: 0.05, label: 'swirl tightness' },
    saturation: { value: 1.3, min: 0.5, max: 2.2, step: 0.05, label: 'colour pop' },
  })
  const colours = useControls('sky colours', {
    skyTop: { value: '#16294f', label: 'sky · top' },
    skyBottom: { value: '#2c4d88', label: 'sky · horizon' },
  })
  const light = useControls('light & bloom', {
    bloom: { value: 1.1, min: 0, max: 3, step: 0.05, label: 'bloom' },
    bloomThreshold: { value: 0.55, min: 0, max: 1, step: 0.01, label: 'bloom threshold' },
    bloomRadius: { value: 0.7, min: 0, max: 1, step: 0.05, label: 'bloom spread' },
    glow: { value: 1, min: 0, max: 1, step: 0.02, label: 'eye glow' },
    moon: { value: 1.7, min: 0, max: 4, step: 0.1, label: 'moon' },
    stars: { value: 2.5, min: 0, max: 5, step: 0.1, label: 'stars' },
  })

  const c: SkyControls = {
    churnSpeed: sky.churnSpeed,
    strokes: sky.strokes,
    strokeWidth: sky.strokeWidth,
    swirlTightness: sky.swirlTightness,
    saturation: sky.saturation,
    skyTop: colours.skyTop,
    skyBottom: colours.skyBottom,
    glow: light.glow,
    moon: light.moon,
    stars: light.stars,
  }

  return (
    <>
      <Leva hidden={!import.meta.env.DEV} />
      <Canvas
        frameloop="always"
        camera={{ position: [2.2, 1.5, 4.6], fov: 46 }}
        dpr={[1, 1.5]}
        gl={{ preserveDrawingBuffer: true }}
      >
        <color attach="background" args={['#0b1736']} />
        <Suspense fallback={null}>
          <World c={c} />
        </Suspense>
        <OrbitControls
          makeDefault
          target={[0, 1.05, 0]}
          enablePan={false}
          enableDamping
          rotateSpeed={0.8}
          minDistance={3}
          maxDistance={5.5}
          minPolarAngle={0.2}
          maxPolarAngle={1.5}
        />
        <EffectComposer>
          <Bloom
            intensity={light.bloom}
            luminanceThreshold={light.bloomThreshold}
            luminanceSmoothing={0.9}
            radius={light.bloomRadius}
            mipmapBlur
          />
        </EffectComposer>
        {import.meta.env.DEV && <Stats />}
      </Canvas>
    </>
  )
}
