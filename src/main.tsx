import { Component, StrictMode, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { failPage } from './bootCurtain'
import { FAILED_LINE, RETRY_LABEL, VINCENTS_CITE, VINCENTS_LINE } from './scene/arrival'

/**
 * The page's one error boundary (the audit's item 6). R3F's canvas throws a scene's error again in this tree, so a
 * failed texture in any mode unmounted the whole root and left a blank page. In its place: the painting, still, with
 * Vincent's line and its citation, and no cue. The scene's chrome goes with the scene, so no scene control is left
 * acting on nothing. The one control left is "Try again.", which reloads the page. A failed street chunk never
 * reaches here: `StreetBoundary` keeps the diorama and the sky.
 */
class PageBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: unknown) {
    failPage(error)
  }
  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="arrival page-failed">
        <figure className="arrival-painting">
          <img src="/reference/painting.jpg" alt="The Starry Night, Vincent van Gogh, 1889" draggable={false} />
          <figcaption>
            <p className="arrival-line">{VINCENTS_LINE}</p>
            <p className="arrival-cite">{VINCENTS_CITE}</p>
            <p className="arrival-retry">
              {FAILED_LINE}{' '}
              <button type="button" onClick={() => window.location.reload()}>
                {RETRY_LABEL}
              </button>
            </p>
          </figcaption>
        </figure>
      </div>
    )
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PageBoundary>
      <App />
    </PageBoundary>
  </StrictMode>,
)
