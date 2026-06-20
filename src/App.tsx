import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, Stats } from '@react-three/drei'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import { Leva, button, useControls } from 'leva'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import type { PerspectiveCamera } from 'three'
import { Color } from 'three'
import { useImageData } from './scene/useImageData'
import { SkyDome } from './scene/SkyDome'
import { Diorama } from './scene/Diorama'
import { PALETTE } from './scene/palette'
import TUNING from './scene/sky-tuning.json'

// The default "home" composition the reset returns to — also the Canvas camera position + orbit target.
const HOME_POSITION: [number, number, number] = [2.2, 1.5, 4.6]
const HOME_TARGET: [number, number, number] = [0, 1.05, 0]
// Portrait can't fit the moon by fov alone (it sits ~37° off the composition centre), so portrait bears
// the camera toward the moon's corner by this azimuth (radians, rotated about the orbit target). Negative
// pans the view right so the moon (top-right of the composition) comes into the narrow frame.
const PORTRAIT_AZ = -0.42

// The camera "home" position for an aspect — portrait rotates it toward the moon's corner about the
// orbit target (Y axis). Shared by the responsive framing and the reset, so reset returns to the
// aspect-appropriate home (the moon stays in frame after a reset on portrait, not just on load).
function homePositionFor(aspect: number): [number, number, number] {
  const a = aspect < 1 ? PORTRAIT_AZ : 0
  const ox = HOME_POSITION[0] - HOME_TARGET[0]
  const oz = HOME_POSITION[2] - HOME_TARGET[2]
  const cos = Math.cos(a)
  const sin = Math.sin(a)
  return [HOME_TARGET[0] + ox * cos + oz * sin, HOME_POSITION[1], HOME_TARGET[2] - ox * sin + oz * cos]
}

// Deepen a derived sky swatch by a documented linear factor — provenance kept (swatch × factor), the
// dome gradient sits below the strokes so deepening it darkens the blue field without dimming the swirls.
const deepenHex = (hex: string, f: number) => '#' + new Color(hex).multiplyScalar(f).getHexString()

/** Dev-only: POST the current panel values to the Vite middleware, which rewrites
 *  src/scene/sky-tuning.json (the source of the baked defaults). Never runs in production. */
async function saveTuning(values: Record<string, number | string>): Promise<void> {
  try {
    const res = await fetch('/__set-tuning', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(values),
    })
    console.log(res.ok ? '✓ saved sky-tuning.json — these are the new defaults' : `✗ save failed (${res.status})`)
  } catch (err) {
    console.error('✗ save failed', err)
  }
}

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

/** Compact (mobile) viewport: drop the instanced dab budget toward the Tunables mobile figure
 *  (~3,000) so phones stay near 30 fps, while desktop keeps the denser count. */
function useIsCompact() {
  const [compact, setCompact] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const onChange = () => setCompact(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return compact
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
    const portrait = aspect < 1
    // eslint-disable-next-line react-hooks/immutability -- the R3F-managed camera is mutated by design
    camera.fov = portrait ? 70 : aspect < 1.4 ? 52 : 48
    // Portrait bears the camera toward the moon's corner; landscape stays at HOME (see homePositionFor).
    // set() is a method call, so no immutability disable is needed.
    const [hx, hy, hz] = homePositionFor(aspect)
    camera.position.set(hx, hy, hz)
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
  const size = useThree((s) => s.size)
  useEffect(() => {
    if (tick > 0 && controls) {
      const [x, y, z] = homePositionFor(size.width / size.height)
      controls.object.position.set(x, y, z)
      controls.target.set(...HOME_TARGET)
      controls.update?.()
    }
  }, [tick, controls, size])
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
function World({ c, paused }: { c: SkyControls; paused: boolean }) {
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
          paused={paused}
        />
      )}
    </>
  )
}

function VisitorButton({
  active,
  disabled,
  icon,
  label,
  onClick,
}: {
  active?: boolean
  disabled?: boolean
  icon: string
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={`visitor-control${active ? ' is-active' : ''}`}
      aria-label={label}
      aria-pressed={active}
      data-tooltip={label}
      disabled={disabled}
      onClick={onClick}
    >
      <span aria-hidden="true">{icon}</span>
    </button>
  )
}

export default function App() {
  // Dev-only playground (the leva panel). Defaults reproduce the tuned look exactly.
  // Control defaults are sourced from sky-tuning.json so the "set as default" button can persist them.
  const sky = useControls('sky', {
    churnSpeed: { value: TUNING.churnSpeed, min: 0, max: 0.2, step: 0.005, label: 'churn speed' },
    strokes: { value: TUNING.strokes, min: 1500, max: 14000, step: 500, label: 'stroke count' },
    strokeWidth: { value: TUNING.strokeWidth, min: 0.4, max: 2.2, step: 0.05, label: 'stroke width' },
    swirlTightness: { value: TUNING.swirlTightness, min: 0, max: 0.2, step: 0.005, label: 'drift (arc)' },
    flowBias: { value: TUNING.flowBias, min: 0, max: 1, step: 0.05, label: 'flow bias (front)' },
    saturation: { value: TUNING.saturation, min: 0.5, max: 2.2, step: 0.05, label: 'colour pop' },
  })
  const colours = useControls('sky colours', {
    skyTop: { value: TUNING.skyTop ?? deepenHex(PALETTE.skyZenith, 0.85), label: 'sky · top' },
    skyBottom: { value: TUNING.skyBottom ?? deepenHex(PALETTE.skyHorizon, 0.85), label: 'sky · horizon' },
  })
  const light = useControls('light & bloom', {
    bloom: { value: TUNING.bloom, min: 0, max: 3, step: 0.05, label: 'bloom' },
    bloomThreshold: { value: TUNING.bloomThreshold, min: 0, max: 1, step: 0.01, label: 'bloom threshold' },
    bloomRadius: { value: TUNING.bloomRadius, min: 0, max: 1, step: 0.05, label: 'bloom spread' },
    glow: { value: TUNING.glow, min: 0, max: 1, step: 0.02, label: 'eye glow' },
    moon: { value: TUNING.moon, min: 0, max: 4, step: 0.1, label: 'moon' },
    stars: { value: TUNING.stars, min: 0, max: 5, step: 0.1, label: 'stars' },
  })

  // Dev-only: snapshot the live panel values; the "set as default" button persists them (writes
  // sky-tuning.json). Ref so the button reads the latest values without re-registering each change.
  const tuningRef = useRef<Record<string, number | string>>({})
  useEffect(() => {
    tuningRef.current = {
      churnSpeed: sky.churnSpeed,
      strokes: sky.strokes,
      strokeWidth: sky.strokeWidth,
      swirlTightness: sky.swirlTightness,
      flowBias: sky.flowBias,
      saturation: sky.saturation,
      skyTop: colours.skyTop,
      skyBottom: colours.skyBottom,
      bloom: light.bloom,
      bloomThreshold: light.bloomThreshold,
      bloomRadius: light.bloomRadius,
      glow: light.glow,
      moon: light.moon,
      stars: light.stars,
    }
  })
  // Stable schema created ONCE — otherwise a new button object every render makes Leva re-register the
  // whole panel on each change, which breaks a slider you're actively dragging (stroke count/width).
  const saveButton = useMemo(
    // eslint-disable-next-line react-hooks/refs -- read inside the button onClick (an event handler), not during render
    () => ({ '★ set as default': button(() => void saveTuning(tuningRef.current)) }),
    [],
  )
  useControls(saveButton)

  const compact = useIsCompact()
  const c: SkyControls = {
    churnSpeed: sky.churnSpeed,
    strokes: compact ? Math.round(sky.strokes * 0.28) : sky.strokes,
    strokeWidth: compact ? sky.strokeWidth * 1.3 : sky.strokeWidth,
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
  const [visitorPaused, setVisitorPaused] = useState(false)
  const [showOriginal, setShowOriginal] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const motionPaused = reduced || visitorPaused
  const fullscreenSupported = typeof document !== 'undefined' && Boolean(document.fullscreenEnabled)

  useEffect(() => {
    const onFullscreenChange = () => setFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined)
    } else if (document.documentElement.requestFullscreen) {
      void document.documentElement.requestFullscreen().catch(() => undefined)
    }
  }

  return (
    <main className="visitor-shell">
      {/* dev-only tuning panel — widened so the control names aren't truncated ("bloom threshold" etc.) */}
      <Leva hidden={!import.meta.env.DEV} theme={{ sizes: { rootWidth: '400px', controlWidth: '150px' } }} />
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
          <World c={c} paused={motionPaused} />
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
      <header className="visitor-title" aria-label="Artwork">
        <h1>The Starry Night</h1>
        <p>Vincent van Gogh, 1889 · Mark Ma</p>
      </header>
      {showOriginal && (
        <aside className="visitor-reference" aria-label="Original painting reference">
          <img src="/reference/painting.jpg" alt="The original Starry Night painting" draggable={false} />
        </aside>
      )}
      <nav className="visitor-dock" aria-label="Artwork controls">
        <VisitorButton icon="↺" label="Reset view" onClick={() => setResetTick((t) => t + 1)} />
        <VisitorButton
          active={motionPaused}
          disabled={reduced}
          icon={motionPaused ? '▶' : 'Ⅱ'}
          label={reduced ? 'Motion paused by system setting' : visitorPaused ? 'Play motion' : 'Pause motion'}
          onClick={() => setVisitorPaused((p) => !p)}
        />
        <VisitorButton
          active={showOriginal}
          icon="◨"
          label={showOriginal ? 'Hide original' : 'Show original'}
          onClick={() => setShowOriginal((shown) => !shown)}
        />
        <VisitorButton
          active={fullscreen}
          disabled={!fullscreenSupported}
          icon="⛶"
          label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          onClick={toggleFullscreen}
        />
      </nav>
    </main>
  )
}
