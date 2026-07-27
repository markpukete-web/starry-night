import { useEffect, useState } from 'react'

function VisitorButton({
  active,
  disabled,
  icon,
  label,
  text,
  onClick,
}: {
  active?: boolean
  disabled?: boolean
  icon: string
  /** Full description for assistive tech. */
  label: string
  /** Visible pill text; defaults to `label`. Kept short so the dock stays bounded on a phone. */
  text?: string
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
      <span className="visitor-control-label">{text ?? label}</span>
    </button>
  )
}

type Props = {
  /** System `prefers-reduced-motion` — pins the pause control on and disables it. */
  reduced: boolean
  visitorPaused: boolean
  onTogglePause: () => void
  showOriginal: boolean
  onToggleOriginal: () => void
}

/**
 * The visitor-facing chrome: attribution card, the original-painting placard, and the control dock.
 * Shared by the 2D route and the shipping diorama so neither can drift or lose the credit line.
 * Hidden wholesale by `.visitor-shell.is-clean-capture` (`?clean=1`) so captures stay comparable.
 */
export function VisitorChrome({
  reduced,
  visitorPaused,
  onTogglePause,
  showOriginal,
  onToggleOriginal,
}: Props) {
  const [fullscreen, setFullscreen] = useState(false)
  const fullscreenSupported = typeof document !== 'undefined' && Boolean(document.fullscreenEnabled)
  const motionPaused = reduced || visitorPaused

  useEffect(() => {
    const onFullscreenChange = () => setFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  // Failures used to be swallowed by `.catch(() => undefined)`, which made "the browser refused"
  // indistinguishable from "the button is broken" — no console entry, no state change, nothing.
  // Surface them instead; a fullscreen request can legitimately be rejected (iframe policy, no user
  // gesture), and when it is we want to be able to see why.
  const toggleFullscreen = () => {
    const warn = (what: string) => (error: unknown) =>
      console.warn(`[starry-night] ${what} was rejected by the browser:`, error)

    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(warn('exitFullscreen'))
      return
    }
    const root = document.documentElement
    if (!root.requestFullscreen) {
      console.warn('[starry-night] this browser exposes no requestFullscreen on documentElement')
      return
    }
    void root.requestFullscreen().catch(warn('requestFullscreen'))
  }

  return (
    <>
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
          text={reduced ? 'Motion paused' : visitorPaused ? 'Play motion' : 'Pause motion'}
          onClick={onTogglePause}
        />
        <VisitorButton
          active={showOriginal}
          icon="◨"
          label={showOriginal ? 'Hide original' : 'Show original'}
          onClick={onToggleOriginal}
        />
        <VisitorButton
          active={fullscreen}
          disabled={!fullscreenSupported}
          icon="⛶"
          label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          onClick={toggleFullscreen}
        />
      </nav>
    </>
  )
}
