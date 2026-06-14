import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, Stats } from '@react-three/drei'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import { Leva, useControls } from 'leva'
import { Suspense, useEffect, useState } from 'react'
import type { PerspectiveCamera } from 'three'
import { useImageData } from './scene/useImageData'
import { SkyDome } from './scene/SkyDome'
import { Diorama } from './scene/Diorama'
import { PALETTE } from './scene/palette'

/** prefers-reduced-motion: a dignified still painting, no churn (locked acceptance criterion). */
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}

// Keep the painting's identity anchors (cypress left, steeple centre, moon top-right) in frame across
// aspect ratios by widening the field of view on narrow/portrait viewports. Only the fov changes —
// position and target stay fixed, so SkyDome's camera-anchored swirls stay centred (its basis is
// derived from the camera bearing, not the fov).
function ResponsiveFraming() {
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  const size = useThree((s) => s.size)
  useEffect(() => {
    const aspect = size.width / size.height
    // eslint-disable-next-line react-hooks/immutability -- the R3F-managed camera is mutated by design
    camera.fov = aspect < 1 ? 70 : aspect < 1.4 ? 52 : 48
    camera.updateProjectionMatrix()
  }, [camera, size])
  return null
}

export type SkyControls = {
  churnSpeed: number
  strokes: number
  strokeWidth: number
  swirlTightness: number
  flowBias: number
  saturation: number
  skyTop: string
  skyBottom: string
  glow: number
  moon: number
  stars: number
}

/** The 3D diorama beneath an enveloping dome of churning brushstroke sky. */
function World({ c, reduced }: { c: SkyControls; reduced: boolean }) {
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
          flowBias={c.flowBias}
          saturation={c.saturation}
          skyTop={c.skyTop}
          skyBottom={c.skyBottom}
          glowIntensity={c.glow}
          moonBright={c.moon}
          starBright={c.stars}
          paused={reduced}
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
    flowBias: { value: 0.6, min: 0, max: 1, step: 0.05, label: 'flow bias (front)' },
    saturation: { value: 1.3, min: 0.5, max: 2.2, step: 0.05, label: 'colour pop' },
  })
  const colours = useControls('sky colours', {
    skyTop: { value: PALETTE.skyZenith, label: 'sky · top' },
    skyBottom: { value: PALETTE.skyHorizon, label: 'sky · horizon' },
  })
  const light = useControls('light & bloom', {
    bloom: { value: 1.1, min: 0, max: 3, step: 0.05, label: 'bloom' },
    bloomThreshold: { value: 0.6, min: 0, max: 1, step: 0.01, label: 'bloom threshold' },
    bloomRadius: { value: 0.55, min: 0, max: 1, step: 0.05, label: 'bloom spread' },
    glow: { value: 1, min: 0, max: 1, step: 0.02, label: 'eye glow' },
    moon: { value: 1.7, min: 0, max: 4, step: 0.1, label: 'moon' },
    stars: { value: 2.5, min: 0, max: 5, step: 0.1, label: 'stars' },
  })

  const c: SkyControls = {
    churnSpeed: sky.churnSpeed,
    strokes: sky.strokes,
    strokeWidth: sky.strokeWidth,
    swirlTightness: sky.swirlTightness,
    flowBias: sky.flowBias,
    saturation: sky.saturation,
    skyTop: colours.skyTop,
    skyBottom: colours.skyBottom,
    glow: light.glow,
    moon: light.moon,
    stars: light.stars,
  }

  const reduced = usePrefersReducedMotion()

  return (
    <>
      <Leva hidden={!import.meta.env.DEV} />
      <Canvas
        frameloop="always"
        camera={{ position: [2.2, 1.5, 4.6], fov: 48 }}
        dpr={[1, 1.5]}
        gl={{ preserveDrawingBuffer: true }}
      >
        <color attach="background" args={['#0b1736']} />
        <ResponsiveFraming />
        <Suspense fallback={null}>
          <World c={c} reduced={reduced} />
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
