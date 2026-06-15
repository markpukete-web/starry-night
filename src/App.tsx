import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, Stats } from '@react-three/drei'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import { Leva, useControls } from 'leva'
import { Suspense, useEffect, useState } from 'react'
import type { PerspectiveCamera } from 'three'
import { Color } from 'three'
import { useImageData } from './scene/useImageData'
import { SkyDome } from './scene/SkyDome'
import { Diorama } from './scene/Diorama'
import { PALETTE } from './scene/palette'

// The default "home" composition the reset returns to — also the Canvas camera position + orbit target.
const HOME_POSITION: [number, number, number] = [2.2, 1.5, 4.6]
const HOME_TARGET: [number, number, number] = [0, 1.05, 0]

// Deepen a derived sky swatch by a documented linear factor — provenance kept (swatch × factor), the
// dome gradient sits below the strokes so deepening it darkens the blue field without dimming the swirls.
const deepenHex = (hex: string, f: number) => '#' + new Color(hex).multiplyScalar(f).getHexString()

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

type Vec3Set = { set: (x: number, y: number, z: number) => void }
type ControlsLike = { object: { position: Vec3Set }; target: Vec3Set; update?: () => void }

/** Reset the camera to the default composition when the reset button bumps `tick`. Lives inside the
 *  Canvas so it reaches the makeDefault OrbitControls via the R3F store. Sets position + target
 *  directly rather than calling controls.reset(): drei saves a stale target0 of [0,0,0] before the
 *  `target` prop applies, so reset() alone looks at the origin instead of the composition centre.
 *  set()/update() are method calls (not hook-value assignments), so no immutability disable is needed. */
function ResetView({ tick }: { tick: number }) {
  const controls = useThree((s) => s.controls) as ControlsLike | null
  useEffect(() => {
    if (tick > 0 && controls) {
      controls.object.position.set(...HOME_POSITION)
      controls.target.set(...HOME_TARGET)
      controls.update?.()
    }
  }, [tick, controls])
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
    skyTop: { value: deepenHex(PALETTE.skyZenith, 0.85), label: 'sky · top' },
    skyBottom: { value: deepenHex(PALETTE.skyHorizon, 0.85), label: 'sky · horizon' },
  })
  const light = useControls('light & bloom', {
    bloom: { value: 1.0, min: 0, max: 3, step: 0.05, label: 'bloom' },
    bloomThreshold: { value: 0.63, min: 0, max: 1, step: 0.01, label: 'bloom threshold' },
    bloomRadius: { value: 0.55, min: 0, max: 1, step: 0.05, label: 'bloom spread' },
    glow: { value: 1, min: 0, max: 1, step: 0.02, label: 'eye glow' },
    moon: { value: 1.45, min: 0, max: 4, step: 0.1, label: 'moon' },
    stars: { value: 2.0, min: 0, max: 5, step: 0.1, label: 'stars' },
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
  const [resetTick, setResetTick] = useState(0)

  return (
    <>
      <Leva hidden={!import.meta.env.DEV} />
      <Canvas
        frameloop="always"
        camera={{ position: HOME_POSITION, fov: 48 }}
        dpr={[1, 1.5]}
        gl={{ preserveDrawingBuffer: true }}
      >
        <color attach="background" args={['#0b1736']} />
        <ResponsiveFraming />
        <ResetView tick={resetTick} />
        <Suspense fallback={null}>
          <World c={c} reduced={reduced} />
        </Suspense>
        <OrbitControls
          makeDefault
          target={HOME_TARGET}
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
      {/* Reset the camera to the painting's default composition after orbiting. */}
      <button
        type="button"
        onClick={() => setResetTick((t) => t + 1)}
        onMouseOver={(e) => (e.currentTarget.style.opacity = '1')}
        onMouseOut={(e) => (e.currentTarget.style.opacity = '0.68')}
        aria-label="Reset the view to the painting's composition"
        style={{
          position: 'fixed',
          right: 16,
          bottom: 16,
          zIndex: 10,
          opacity: 0.68,
          padding: '8px 15px',
          borderRadius: 999,
          background: 'rgba(13,23,54,0.55)',
          color: '#e7ecf7',
          border: '1px solid rgba(231,236,247,0.28)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          font: '500 13px/1 ui-sans-serif, system-ui, sans-serif',
          letterSpacing: '0.03em',
          cursor: 'pointer',
          transition: 'opacity .2s ease',
        }}
      >
        ↺ Reset view
      </button>
    </>
  )
}
