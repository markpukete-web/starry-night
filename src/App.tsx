import { Canvas } from '@react-three/fiber'
import { Stats } from '@react-three/drei'
import { Leva } from 'leva'
import { Suspense, useEffect, useState } from 'react'
import { LivingPainting } from './scene/LivingPainting'
import { StreamlineSky } from './scene/StreamlineSky'
import { CanopyExperience } from './scene/CanopyExperience'
import { DioramaExperience } from './scene/DioramaExperience'
import type { SkyStyle } from './scene/PaintingFlowSky3D'
import { ALIVE_DEFAULTS, ALIVE_KNOBS, clampAliveKnob, hasAliveKnobs, readAliveTuning, type AliveTuning } from './scene/skyAlive'
import { tuned } from './scene/tuning'
import { AliveTuner } from './AliveTuner'
import { ReliefExperience } from './scene/ReliefExperience'
import { VisitorChrome } from './VisitorChrome'

const TUNER_STORAGE_KEY = 'starry-night:alive-tuning'

/** The shipped defaults for A's knobs: sky-tuning.json's alive* keys (the tuner's "set as default" writes them). */
const SHIPPED_ALIVE: AliveTuning = {
  gust: clampAliveKnob('gust', tuned('aliveGust', ALIVE_DEFAULTS.gust), ALIVE_DEFAULTS.gust),
  lift: clampAliveKnob('lift', tuned('aliveLift', ALIVE_DEFAULTS.lift), ALIVE_DEFAULTS.lift),
  shimmer: clampAliveKnob('shimmer', tuned('aliveShimmer', ALIVE_DEFAULTS.shimmer), ALIVE_DEFAULTS.shimmer),
  breath: clampAliveKnob('breath', tuned('aliveBreath', ALIVE_DEFAULTS.breath), ALIVE_DEFAULTS.breath),
  flicker: clampAliveKnob('flicker', tuned('aliveFlicker', ALIVE_DEFAULTS.flicker), ALIVE_DEFAULTS.flicker),
  glimmer: clampAliveKnob('glimmer', tuned('aliveGlimmer', ALIVE_DEFAULTS.glimmer), ALIVE_DEFAULTS.glimmer),
  surge: clampAliveKnob('surge', tuned('touchSurge', ALIVE_DEFAULTS.surge), ALIVE_DEFAULTS.surge),
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

export default function App() {
  const reduced = usePrefersReducedMotion()
  const [visitorPaused, setVisitorPaused] = useState(false)
  const [showOriginal, setShowOriginal] = useState(false)
  // The visitor's sky. `?sky=moving` opens on moving strokes, so either sky can be linked. Reduced
  // motion hides the choice but keeps it, and it returns when the system setting is cleared.
  const [sky, setSky] = useState<SkyStyle>(() =>
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('sky') === 'moving' ? 'moving' : 'light',
  )
  const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
  const mode = params.get('mode') ?? 'diorama'
  const clean = params.get('clean') === '1'
  // make-it-alive A, behind a flag until Mark's gate (tasks/2026-10-13-alive-a-plan.md)
  // `?tune=1` opens Mark's tuner and implies the flag
  const tune = params.get('tune') === '1'
  // B, behind its own flag (tasks/2026-10-13-touch-b-plan.md); it rides A's variant, so it implies the flag
  const touch = params.get('touch') === '1'
  const alive = params.get('alive') === '1' || tune || touch
  // C, the arrival, behind its own flag (tasks/2026-10-20-arrival-c-plan.md); it implies nothing, so it opens into
  // whichever sky the other flags give
  const arrival = params.get('arrival') === '1'
  // The shipped defaults for A's knobs live in sky-tuning.json (the tuner's "set as default" writes them);
  // a URL knob overrides them, and with the tuner open the last slider positions are remembered per browser.
  const [aliveTuning, setAliveTuning] = useState<AliveTuning>(() => {
    if (hasAliveKnobs(params) || !tune) return readAliveTuning(params, SHIPPED_ALIVE)
    try {
      const stored = JSON.parse(window.localStorage.getItem(TUNER_STORAGE_KEY) ?? 'null') as Partial<AliveTuning> | null
      if (!stored) return SHIPPED_ALIVE
      const restored = { ...SHIPPED_ALIVE }
      for (const name of ALIVE_KNOBS) restored[name] = clampAliveKnob(name, Number(stored[name]), SHIPPED_ALIVE[name])
      return restored
    } catch {
      return SHIPPED_ALIVE
    }
  })
  const onTune = (next: AliveTuning) => {
    setAliveTuning(next)
    try {
      window.localStorage.setItem(TUNER_STORAGE_KEY, JSON.stringify(next))
    } catch {
      /* storage can be unavailable; the sliders still work for the page's life */
    }
  }
  const motionPaused = reduced || visitorPaused

  const chrome = (
    <>
      <VisitorChrome
        reduced={reduced}
        visitorPaused={visitorPaused}
        onTogglePause={() => setVisitorPaused((paused) => !paused)}
        showOriginal={showOriginal}
        onToggleOriginal={() => setShowOriginal((shown) => !shown)}
        sky={sky}
        // only the 3D diorama has the two skies; the flat 2D route never shows the choice
        onToggleSky={mode === 'diorama' ? () => setSky((current) => (current === 'moving' ? 'light' : 'moving')) : undefined}
      />
      {tune && mode === 'diorama' && <AliveTuner tuning={aliveTuning} defaults={SHIPPED_ALIVE} onChange={onTune} touch={touch} />}
    </>
  )

  if (mode === 'canopy') {
    return <CanopyExperience clean={clean} reduced={motionPaused} />
  }

  if (mode === 'relief') {
    return <ReliefExperience clean={clean} reduced={motionPaused} />
  }

  if (mode === 'diorama') {
    return (
      <DioramaExperience clean={clean} reduced={motionPaused} sky={sky} still={reduced} alive={alive} aliveTuning={aliveTuning} touch={touch} arrival={arrival}>
        {chrome}
      </DioramaExperience>
    )
  }

  return (
    <main className="visitor-shell">
      {/* dev-only tuning panel — hidden while comparing so it doesn't cover the painting */}
      <Leva hidden={!import.meta.env.DEV || showOriginal} theme={{ sizes: { rootWidth: '360px', controlWidth: '150px' } }} />
      <Canvas frameloop="always" dpr={[1, 1.5]} gl={{ preserveDrawingBuffer: true }}>
        <Suspense fallback={null}>
          <LivingPainting paused={motionPaused} />
          <StreamlineSky paused={motionPaused} />
        </Suspense>
        {import.meta.env.DEV && <Stats />}
      </Canvas>
      {chrome}
    </main>
  )
}
