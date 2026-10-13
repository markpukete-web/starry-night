import { Canvas } from '@react-three/fiber'
import { Stats } from '@react-three/drei'
import { Leva } from 'leva'
import { Suspense, useEffect, useState } from 'react'
import { LivingPainting } from './scene/LivingPainting'
import { StreamlineSky } from './scene/StreamlineSky'
import { CanopyExperience } from './scene/CanopyExperience'
import { DioramaExperience } from './scene/DioramaExperience'
import type { SkyStyle } from './scene/PaintingFlowSky3D'
import { ReliefExperience } from './scene/ReliefExperience'
import { VisitorChrome } from './VisitorChrome'

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
  const alive = params.get('alive') === '1'
  const motionPaused = reduced || visitorPaused

  const chrome = (
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
  )

  if (mode === 'canopy') {
    return <CanopyExperience clean={clean} reduced={motionPaused} />
  }

  if (mode === 'relief') {
    return <ReliefExperience clean={clean} reduced={motionPaused} />
  }

  if (mode === 'diorama') {
    return (
      <DioramaExperience clean={clean} reduced={motionPaused} sky={sky} still={reduced} alive={alive}>
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
