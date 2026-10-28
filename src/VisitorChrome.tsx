import { useContext, useEffect, useState } from 'react'
import type { SkyStyle } from './scene/PaintingFlowSky3D'
import { PortalContext } from './scene/portalContext'

function VisitorButton({
  active,
  disabled,
  icon,
  label,
  text,
  onClick,
  onPrefetch,
  autoFocus,
}: {
  active?: boolean
  disabled?: boolean
  icon: string
  /** Full description for assistive tech. */
  label: string
  /** Visible pill text; defaults to `label`. Kept short so the dock stays bounded on a phone. */
  text?: string
  onClick: () => void
  /** A pointer over the control or focus on it: the portal loads the street's chunk before the click. */
  onPrefetch?: () => void
  /** The phone's card: its first answer takes focus when it shows. */
  autoFocus?: boolean
}) {
  return (
    <button
      type="button"
      className={`visitor-control${active ? ' is-active' : ''}`}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      onPointerEnter={onPrefetch}
      onFocus={onPrefetch}
      autoFocus={autoFocus}
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
  /** The visitor's sky choice. */
  sky?: SkyStyle
  /** Given only on the diorama route, which has the two skies. */
  onToggleSky?: () => void
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
  sky = 'light',
  onToggleSky,
}: Props) {
  const portal = useContext(PortalContext)
  const inStreet = portal?.place === 'street'
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
        <p>
          Vincent van Gogh, 1889 ·{' '}
          <a href="https://markma.dev" target="_blank" rel="noopener noreferrer">
            Mark Ma
          </a>
          {' · '}
          <a
            href="https://github.com/markpukete-web/starry-night"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </p>
      </header>
      {/* The placard and the dock in one stack at the bottom, so the placard clears the dock however many rows it wraps to */}
      <div className="visitor-bottom">
        {showOriginal && (
          <aside className="visitor-reference" aria-label="Original painting reference">
            <img src="/reference/painting.jpg" alt="The original Starry Night painting" draggable={false} />
          </aside>
        )}
        {/* a phone's first entry: a computer is recommended, and the visitor chooses (Mark, 2026-10-28) */}
        {portal?.asking && (
          <div className="visitor-ask" role="alertdialog" aria-labelledby="visitor-ask-text">
            <p id="visitor-ask-text">A computer is recommended for the village scene. On a phone it may load slowly or not open.</p>
            <div className="visitor-ask-actions">
              <VisitorButton icon="⌂" label="Enter anyway" onClick={portal.enterAnyway} autoFocus />
              <VisitorButton icon="✕" label="Stay with the painting" onClick={portal.stay} />
            </div>
          </div>
        )}
        <nav className="visitor-dock" aria-label="Artwork controls">
          {/* Disabled while the camera flies or the scenes swap: the control acts only in the diorama and the street */}
          {portal && (
            <VisitorButton
              disabled={portal.place !== 'diorama' && !inStreet}
              icon={inStreet ? '↩' : '⌂'}
              label={inStreet ? 'Back to the painting' : 'Enter the village'}
              onClick={inStreet ? portal.leave : portal.enter}
              onPrefetch={inStreet ? undefined : portal.prefetch}
            />
          )}
          {/* Under system reduced motion the sky is the painted still, so the choice is disabled, like the
              pause button: removing it dropped keyboard focus to the page (review F8). The choice is kept. */}
          {onToggleSky && (
            <VisitorButton
              active={!reduced && sky === 'moving'}
              disabled={reduced}
              icon="≋"
              label={reduced ? 'Sky choice paused by system setting' : sky === 'moving' ? 'Switch sky to painted light' : 'Switch sky to moving strokes'}
              text={reduced || sky === 'light' ? 'Sky: painted light' : 'Sky: moving strokes'}
              onClick={onToggleSky}
            />
          )}
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
      </div>
    </>
  )
}
