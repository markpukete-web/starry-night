import { Canvas } from '@react-three/fiber'
import { Stats } from '@react-three/drei'
import { Leva } from 'leva'
import { Suspense, useEffect, useState } from 'react'
import { LivingPainting } from './scene/LivingPainting'
import { BrushDabs } from './scene/BrushDabs'

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
      disabled={disabled}
      onClick={onClick}
    >
      <span aria-hidden="true">{icon}</span>
      <span className="visitor-control-label">{label}</span>
    </button>
  )
}

export default function App() {
  const reduced = usePrefersReducedMotion()
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
      {/* dev-only tuning panel — hidden while comparing so it doesn't cover the painting */}
      <Leva hidden={!import.meta.env.DEV || showOriginal} theme={{ sizes: { rootWidth: '360px', controlWidth: '150px' } }} />
      <Canvas frameloop="always" dpr={[1, 1.5]} gl={{ preserveDrawingBuffer: true }}>
        <Suspense fallback={null}>
          <LivingPainting paused={motionPaused} />
          <BrushDabs paused={motionPaused} />
        </Suspense>
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
