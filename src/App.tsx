import { Canvas } from '@react-three/fiber'
import { Stats } from '@react-three/drei'
import { Leva } from 'leva'
import { Suspense, useEffect, useState } from 'react'
import { LivingPainting } from './scene/LivingPainting'
import { StreamlineSky } from './scene/StreamlineSky'
import { CanopyExperience } from './scene/CanopyExperience'
import { DioramaExperience } from './scene/DioramaExperience'
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
  const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
  const mode = params.get('mode') ?? 'diorama'
  const clean = params.get('clean') === '1'
  const motionPaused = reduced || visitorPaused

  const chrome = (
    <VisitorChrome
      reduced={reduced}
      visitorPaused={visitorPaused}
      onTogglePause={() => setVisitorPaused((paused) => !paused)}
      showOriginal={showOriginal}
      onToggleOriginal={() => setShowOriginal((shown) => !shown)}
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
      <DioramaExperience clean={clean} reduced={motionPaused}>
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
