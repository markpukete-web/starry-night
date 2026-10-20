# C — arrival: plan, 2026-10-20

Slice C of "Direction — make it alive" (`tasks/todo.md`): "open on the flat painting, one line from Vincent's letter,
the sky starts to breathe, the camera pushes through the frame into the diorama." Built on the Mac on
`feat/arrival-c` from `docs/after-pr-11` (= `main` `5bbe243` plus the record), behind its own flag `?arrival=1`. The
flag implies nothing: `?arrival=1` opens into today's sky, `?arrival=1&alive=1&touch=1` into everything, so C does
not wait on the flag decision. With the flag off, every route is byte-identical to `main`. Mark judges the feel on a
preview; this session gates the mechanics with pinned clocks, as A and B were gated.

Mapping for this session (`herdr agent list`, 2026-10-20): Lead `w4:p1` (Claude), Reviewer `w4:p4` (Codex). No
worker (Mark, 2026-10-20: "no worker then"): the gate's captures are six script runs, the Lead runs and reads them.

Reviewed before the build by Codex (REVISE, F1–F10 below); the design here is the revised one. Mark: "build it once
Codex is done."

## What is there today

- **Routes and flags** (`src/App.tsx:52–60`): `mode` defaults to `diorama`; `clean`, `tune`, `touch`, `alive` are
  read from the URL; `alive = alive || tune || touch`. The diorama route renders `<DioramaExperience>` with the
  chrome (`VisitorChrome`: the title placard, the original placard, the dock) as children (`:109–114`). The 2D
  route is a different React tree, so an arrival that crossed from it into the diorama would remount the Canvas.
  C runs on the diorama route only.
- **The camera** (`src/scene/DioramaExperience.tsx:99–138`): drei's `PerspectiveCamera` (makeDefault) at the home
  pose, `DIORAMA_CAMERAS.design` on landscape or `.mobile` on portrait (`isPortrait` from R3F's `size`), and
  `OrbitControls` with `DIORAMA_ORBIT` (distance 3.25–5.6, azimuth −π/12..π/4, polar 0.58–1.62, no pan, damping).
  three-stdlib's constructor calls `update()` once (so the camera is pointed at the target from construction),
  and drei's own `useFrame` at priority −1 calls `update()` only while `enabled`. `update()` ends with
  `object.lookAt(target)`.
- **The sky is camera-locked** (`PaintingFlowSky3D.tsx:1126–1129`): `skyRoot.quaternion = camera.quaternion ×
  homeInverse`, identity at the home pose. `homeInverse` is `Matrix4.lookAt(eye, target, +Y)` for the home
  (`:833–838`); `homeInverseQuaternion` in `dioramaSkyProjection.ts:78` is the same formula. A camera on the home's
  own axis, farther out, has the same quaternion, so the sky does not move during a dolly along that axis.
- **The sky clock** (`:1130–1151`): paused → `clock.current = 0`, the store cleared, no uniform write (the light
  material is rebuilt at t = 0 on a pause change, `:1095–1097`, so a pause is not a way to hold the sky without a
  shader compile on release). Pinned (`window.__skyTime` finite) → both `uTime`s and the clock take the pin. Else
  `uTime += dt` on both materials. R3F hands every subscriber the raw `clock.getDelta()`: after a hidden tab that
  is the whole gap (30 s and more), and today's sky jumps by it. Every alive term is 0 at t = 0, so a clock held at
  0 is today's still.
- **Loading.** The sky's four textures and the village's suspend (`useTexture`) on the one `Suspense` in `Scene`.
  The sky's seven CPU images (`useImageData`, state, no suspend) gate its geometry. The cypress's own CPU image
  (`BrushCypress.tsx:114`, `painting.jpg`) gates its geometry the same way, and it returns null until then
  (`:341`): the cypress can draw later than the sky (`check-viewport-camera.mjs:184–186` records that under
  software rendering). The moving sky's worker can fail and leave `movingGeometry` null for good (`:981–994`).
- **The painting's place on screen at the home pose** (spike, `scratch/arrival-c-2026-10-20/`): the dome's
  painting spans x 5–1550 and y −96–915 of a 1600 × 900 frame, aspect 1.53 against the scan's 1.26, corners 150 px
  off a rectangle (the dome's curvature). Over the head-on t = 0 frame at that rect, the scan's whorls and moon
  sit within 2–3% of the width, but the land does not: the scan's village lies where the render has the island's
  underside, and the cypress silhouettes differ. On the phone (fov 88) nothing lines up: the dome's painting is
  762 px wide in a 390 px frame. So a matched cut from the scan into the render is not available. The opening is a
  dissolve.
- **Why the camera cannot do the frame alone.** The orbit limits are a locked criterion. The design home sits at
  distance 5.19 (max 5.6), the portrait home at 5.4: 0.4 and 0.2 units of dolly room. Outside the dome the
  camera looks in through the unpainted cap (B's plan, F4). A contra-zoom inside the limits gives 46.6° → 50°,
  nothing. The sense of passing through a frame comes from a screen-space layer (the scan) growing and fading,
  with the camera's modest push behind it.
- **The guards** capture the canvas only (`canvas.toDataURL`): `check:reduced` two frames 1.5 s apart after a
  `2500 + CAPTURE_SETTLE_MS` settle, and its control page without reduced motion must differ; `check:viewport` a
  fresh load against a rotated one under reduced motion. A DOM layer never reaches them. `capture-sky-frames.mjs`
  navigates, waits for the canvas, sleeps `2500 + CAPTURE_SETTLE_MS`, then pins `__skyTime` per frame and reads
  the canvas; `--eval` runs page code in the same evaluation as the first pin (two CDP calls race the frame loop,
  PR #11 P2). Files are `${prefix}-t${t}.png`.
- **The scan** `/public/reference/painting.jpg` (1600 × 1267, 1.0 MB) is already served: the original placard and
  the Open Graph image use it. `.visitor-title a { pointer-events: auto }` (`index.css:77`) restores hit-testing
  on the credit links under a parent that has `pointer-events: none`.
- **The line.** Vincent to Theo, Saint-Rémy-de-Provence, letter 777 (<https://vangoghletters.org/vg/letters/let777/letter.html>),
  between about 31 May and 6 June 1889, the letter in which he describes the view that became the painting. The
  original French is public domain (the site's transcription, its spellings kept): "Ce matin j’ai vu la campagne
  de ma fenêtre longtemps avant le lever du soleil avec rien que l’etoile du matin laquelle paraissait tres
  grande." The site's English is © 2009 Van Gogh Museum / Huygens ING, all rights reserved, so the English on
  screen is this project's own rendering of that sentence, not the site's (Codex compared the two: different
  phrasing throughout). The code comment at the line and this record carry the link and the credit.

## Design

### C1 — the sequence, on one arrival clock

`a` is seconds since the arrival started: the scan has loaded (or failed), the sky has a geometry to draw, and the
cypress has its geometry. Until then `a` stays 0 and the opaque layer hides the canvas. If the scene is not ready
after `readyTimeout` 15 s, or the visitor skips while waiting, the arrival opens anyway: a failed asset leaves
the same scene today's route would show, and the curtain must never hide it for good (F5). Stages, all constants
in `ARRIVAL` (Tunables):

| from | to | what |
|---|---|---|
| 0 | 4.0 (`hold`) | the painting on a dark ground, the line beneath it. Sky clock held at 0 (step 0). Camera at the start pose: the home's axis, distance 5.55. Controls off, dock and title hidden (`visibility: hidden`, so nothing in them can be focused or clicked, F2) |
| 3.0 | 4.0 | the line fades (`lineFade` 1) |
| 4.0 | 5.5 | the dissolve (`dissolve` 1.5): the layer's opacity 1 → 0 while the scan grows 1 → 1.12 (`grow`). The live sky it reveals is still the painting: identical in the centre, the land opening into the island |
| 4.75 | 7.75 | the sky starts to breathe (`breathe` 3, from `hold + lead`, `lead` 0.75): the clock's rate eases 0 → 1 |
| 4.75 | 8.75 | the push (`push` 4): distance 5.55 → home, smoothstep; the last frame sets the home tuple exactly |
| 8.75 | | done: controls on, B's touch on if flagged, the sky's clock handed back to `dt`, dock and title fade in (`reveal` 600 ms) |

A tap, click, Enter, Space or Escape at any point runs the clock at `skipSpeed` 8 from that moment: the 8.75 s
arrival ends within 1.1 s from any moment (F6), and nothing jumps: the rate, the opacity and the distance are
monotone in `a` whatever the speed. The clock accepts at most `maxDt` 0.1 s per frame: a hidden tab hands R3F a
30 s delta, which would otherwise collapse the opening into one frame and advance the sky by the whole gap (F3).
While the arrival runs, the sky advances by the same bounded step times the rate; once done, the sky takes `dt`
again, as on `main`.

Reduced motion (system): `arrivalFrame(a, true)` is the end state at a = 0: no layer, no push, rate 1, camera at
home from the first frame, controls on from the first frame. The line is a static caption over the still, its own
React state, removed on the first pointer or key (any key but Tab) with no transition, by listeners that live as
long as the caption does (F1). `check:reduced` sees a still canvas; `check:viewport` sees the same framing fresh or
rotated.

### C2 — `src/scene/arrival.ts` (new, pure, `.ts` imports only)

```ts
import { DIORAMA_ORBIT } from './dioramaContract.ts'

/** C (arrival, `?arrival=1`): the timeline's constants, in seconds unless said. Logged in CLAUDE.md's Tunables. */
export const ARRIVAL = {
  /** the painting and the line, still */
  hold: 4,
  /** the line fades out, ending at `hold` */
  lineFade: 1,
  /** the layer fades and the scan grows, from `hold` */
  dissolve: 1.5,
  /** the scan's scale at the end of the dissolve */
  grow: 1.12,
  /** the sky's rate and the push start this long after `hold`, when the live sky is half revealed */
  lead: 0.75,
  /** the sky clock's rate eases 0 → 1 */
  breathe: 3,
  /** the camera's distance eases from `startDistance` to the home's */
  push: 4,
  /** inside DIORAMA_ORBIT.maxDistance (5.6) with a margin: the start pose is an authored camera, never clamped */
  startDistance: 5.55,
  /** the clock's speed after a tap, click or key: the whole arrival (8.75 s) ends within 1.1 s from any moment */
  skipSpeed: 8,
  /**
   * the longest frame the clock accepts. R3F hands over the raw delta, 30 s and more after a hidden tab, which
   * would collapse the opening into one frame and advance the sky by the whole gap (review F3)
   */
  maxDt: 0.1,
  /** how long the opening waits for the scene before it opens anyway: a failed asset cannot hold the curtain (review F5) */
  readyTimeout: 15,
  /** milliseconds: the title and the dock fade in once the arrival is done (CSS reads it as `--arrival-reveal`) */
  reveal: 600,
}

export type ArrivalFrame = {
  /** the layer's opacity (the ground and the scan together) */
  overlay: number
  /** the scan's scale */
  scale: number
  /** the line's opacity */
  line: number
  /** the sky clock's rate, 0 held .. 1 live */
  rate: number
  /** the push's progress, 0 at the start pose .. 1 at home */
  push: number
  done: boolean
}

function smoothstep(x: number): number {
  const t = Math.min(1, Math.max(0, x))
  return t * t * (3 - 2 * t)
}

/** The arrival's end time: the push is the last stage. */
export const ARRIVAL_END = ARRIVAL.hold + ARRIVAL.lead + ARRIVAL.push

/** Every value of the arrival at time `a`; under reduced motion, the end state at any `a`. */
export function arrivalFrame(a: number, reduced = false): ArrivalFrame {
  if (reduced) return { overlay: 0, scale: 1, line: 1, rate: 1, push: 1, done: true }
  const { hold, lineFade, dissolve, grow, lead, breathe, push } = ARRIVAL
  const fade = smoothstep((a - hold) / dissolve)
  return {
    overlay: 1 - fade,
    scale: 1 + (grow - 1) * fade,
    line: 1 - smoothstep((a - (hold - lineFade)) / lineFade),
    rate: smoothstep((a - hold - lead) / breathe),
    push: smoothstep((a - hold - lead) / push),
    done: a >= ARRIVAL_END,
  }
}

type Home = { position: readonly [number, number, number]; target: readonly [number, number, number] }

/**
 * The camera on the home's own axis at the push's progress: the start pose at 0, the home tuple itself at 1 (the
 * same object, so the end is exact, not a lerp's last step). Along the axis the look direction is the home's, so
 * the camera-locked sky does not move during the push.
 */
export function arrivalCamera(home: Home, progress: number): readonly [number, number, number] {
  if (progress >= 1) return home.position
  const [tx, ty, tz] = home.target
  const dx = home.position[0] - tx
  const dy = home.position[1] - ty
  const dz = home.position[2] - tz
  const homeDistance = Math.hypot(dx, dy, dz)
  const distance = ARRIVAL.startDistance + (homeDistance - ARRIVAL.startDistance) * Math.max(0, progress)
  const k = distance / homeDistance
  return [tx + dx * k, ty + dy * k, tz + dz * k]
}

/** The start distance must sit inside the orbit's envelope, or the first frame would be a clamped camera. */
export const ARRIVAL_START_INSIDE_ORBIT =
  ARRIVAL.startDistance > DIORAMA_ORBIT.minDistance && ARRIVAL.startDistance < DIORAMA_ORBIT.maxDistance

export type ArrivalInputs = {
  /** the frame's delta, seconds */
  dt: number
  /** the scene can be revealed: the sky's ribbons, the cypress and the scan are all there */
  ready: boolean
  /** a tap, click or key has asked to move on */
  skipRequested: boolean
  /** a capture's pin: an absolute time, taken as is */
  pinned?: number
}

/**
 * The arrival clock. It waits for the scene with `a` at 0 (the layer opaque), opens anyway after `readyTimeout`
 * or on a skip, accepts at most `maxDt` per frame, runs `skipSpeed` times faster after a skip, and latches at the
 * end. A pin is absolute: a capture's pins go up only, and a lower pin reads as the caller's error.
 */
export class ArrivalClock {
  a = 0
  waited = 0
  done = false
  tick({ dt, ready, skipRequested, pinned }: ArrivalInputs): number {
    if (this.done) return this.a
    if (typeof pinned === 'number' && Number.isFinite(pinned)) {
      this.a = pinned
    } else {
      const step = Number.isFinite(dt) ? Math.min(Math.max(0, dt), ARRIVAL.maxDt) : 0
      if (!ready && !skipRequested && this.waited < ARRIVAL.readyTimeout) {
        this.waited += step
        return this.a
      }
      this.a += step * (skipRequested ? ARRIVAL.skipSpeed : 1)
    }
    this.done = this.a >= ARRIVAL_END
    return this.a
  }
}
```

### C3 — the sky: a step and a ready seam (`PaintingFlowSky3D.tsx`)

Two optional props after `touchStore` in `Props`:

```ts
  /**
   * C (`?arrival=1`): the seconds to advance the clock this frame while the arrival runs (its rate times a bounded
   * delta); null once the arrival is done, absent with the flag off: either way the clock takes the frame's `dt`.
   */
  arrivalStep?: RefObject<number | null>
  /** C: true once the ribbons have a geometry to draw; the arrival waits for it (with the cypress and the scan). */
  ready?: RefObject<boolean>
```

The frame loop's advance branch (`:1146–1151`):

```ts
    } else {
      // C: during the arrival the step is the rate times a bounded delta; otherwise the frame's own
      const step = arrivalStep?.current ?? dt
      ribbonMaterial.uniforms.uTime.value += step
      // both clocks run whichever sky is shown, so switching never jumps either one
      movingMaterial.uniforms.uTime.value += step
      clock.current = ribbonMaterial.uniforms.uTime.value
    }
```

After `const ribbons = …` (`:1200`):

```ts
  // C: the ready seam, written after commit so the mesh below draws on the frame the arrival first reads it
  useLayoutEffect(() => {
    if (ready) ready.current = Boolean(ribbons.geometry) && !awaitingMoving
  }, [ready, ribbons.geometry, awaitingMoving])
```

### C4 — the cypress's ready seam (`BrushCypress.tsx`, `Diorama.tsx`)

`BrushCypress` takes `ready?: RefObject<boolean>` and, next to its disposal effects:

```ts
  // C: the arrival waits for the tree; its CPU image does not suspend, so the sky's own seam cannot cover it
  useLayoutEffect(() => {
    if (ready) ready.current = geometries !== null
  }, [ready, geometries])
```

`Diorama` takes `ready?: RefObject<boolean>` and passes it to `BrushCypress`. The village suspends on its
textures with the sky's, under the one boundary, and its meshes are synchronous, so it needs no seam.

### C5 — the scene: the driver, the controls, the touch, the layer (`DioramaExperience.tsx`)

`Scene` takes `arrival: boolean`, `arriving: boolean`, `onArrived: () => void`, `dom: ArrivalDom`. Changes:

```tsx
      <OrbitControls
        enabled={!arriving}
        …as today…
      />
      {arrival && <ArrivalDriver home={camera} reduced={still} ready={dom} step={arrivalStep} dom={dom} onDone={onArrived} />}
```

`useTouchInput({ enabled: touch && !reduced && !arriving, … })`. The Diorama gets `ready={arrival ? dom.cypressReady : undefined}`,
the sky `arrivalStep={arrival ? arrivalStep : undefined}` and `ready={arrival ? dom.skyReady : undefined}`, so with
the flag off nothing new is passed.

```tsx
type ArrivalWindow = Window & { __arrivalTime?: number }

/** C: the refs the scene and the layer share; all plain refs, so no render runs per frame. */
export type ArrivalDom = {
  layer: RefObject<HTMLDivElement | null>
  scan: RefObject<HTMLImageElement | null>
  line: RefObject<HTMLElement | null>
  skyReady: RefObject<boolean>
  cypressReady: RefObject<boolean>
  /** the scan has loaded, or failed: either way the opening goes on */
  scanReady: RefObject<boolean>
  /** a tap, click or key has asked to move on */
  skipRequested: RefObject<boolean>
}

/**
 * C: runs the arrival clock and writes every frame's values: the camera along the home's axis, the sky's step,
 * the layer's styles. Priority −2: before drei's controls (−1, off during the arrival, so their update does not run)
 * and before the sky (0), which reads the camera's quaternion after this. `window.__arrivalTime` pins the clock for
 * captures. The camera is pointed with the same `lookAt` the controls' own update ends with.
 */
function ArrivalDriver({ home, reduced, step, dom, onDone }: {
  home: (typeof DIORAMA_CAMERAS)[keyof typeof DIORAMA_CAMERAS]
  reduced: boolean
  step: RefObject<number | null>
  dom: ArrivalDom
  onDone: () => void
}) {
  const { camera } = useThree()
  const [clock] = useState(() => new ArrivalClock())
  const finished = useRef(false)
  useFrame((_, dt) => {
    if (finished.current) return
    const a = clock.tick({
      dt,
      ready: dom.skyReady.current && dom.cypressReady.current && dom.scanReady.current,
      skipRequested: dom.skipRequested.current,
      pinned: (window as ArrivalWindow).__arrivalTime,
    })
    const f = arrivalFrame(a, reduced)
    step.current = f.rate * Math.min(Math.max(0, dt), ARRIVAL.maxDt)
    camera.position.set(...arrivalCamera(home, f.push))
    camera.lookAt(home.target[0], home.target[1], home.target[2])
    const layer = dom.layer.current
    if (layer) {
      layer.style.opacity = String(f.overlay)
      layer.style.visibility = f.overlay > 0 ? 'visible' : 'hidden'
    }
    if (dom.scan.current) dom.scan.current.style.transform = `scale(${f.scale})`
    if (dom.line.current) dom.line.current.style.opacity = String(f.line)
    if (f.done) {
      finished.current = true
      step.current = null
      onDone()
    }
  }, -2)
  return null
}
```

`DioramaExperience` owns the state, the refs and the layer:

```tsx
export function DioramaExperience({ …, arrival = false, children }: Props) {
  const [arrived, setArrived] = useState(false)
  const arriving = arrival && !arrived
  // reduced motion: the line is a static caption with its own life, gone on the first pointer or key (review F1)
  const [captionShown, setCaptionShown] = useState(arrival && still)
  const arrivalStep = useRef<number | null>(null)
  const dom: ArrivalDom = {
    layer: useRef(null), scan: useRef(null), line: useRef(null),
    skyReady: useRef(false), cypressReady: useRef(false), scanReady: useRef(false), skipRequested: useRef(false),
  }
  const skip = () => { dom.skipRequested.current = true }
  useEffect(() => {
    if (!arriving || still) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') { e.preventDefault(); skip() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [arriving, still])
  useEffect(() => {
    if (!captionShown) return
    const dismiss = () => setCaptionShown(false)
    const onKey = (e: KeyboardEvent) => { if (e.key !== 'Tab') dismiss() }
    window.addEventListener('pointerdown', dismiss)
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('pointerdown', dismiss); window.removeEventListener('keydown', onKey) }
  }, [captionShown])
  const shellClass = `visitor-shell diorama-shell${clean ? ' is-clean-capture' : ''}${arrival ? ' has-arrival' : ''}${arriving ? ' is-arriving' : ''}`
  return (
    <main className={shellClass} style={arrival ? ({ '--arrival-reveal': `${ARRIVAL.reveal}ms` } as CSSProperties) : undefined} onPointerDown={arriving && !still ? skip : undefined}>
      <Canvas …>
        <Scene … arrival={arrival} arriving={arriving} onArrived={() => setArrived(true)} dom={dom} arrivalStep={arrivalStep} />
      </Canvas>
      {arrival && !still && (
        <div className="arrival" ref={dom.layer} aria-hidden={arrived}>
          <figure className="arrival-painting">
            <img ref={dom.scan} src="/reference/painting.jpg" alt="The Starry Night, Vincent van Gogh, 1889" draggable={false}
              onLoad={() => { dom.scanReady.current = true }} onError={() => { dom.scanReady.current = true }} />
            <figcaption ref={dom.line}>
              {/* Vincent to Theo, Saint-Rémy, letter 777 (vangoghletters.org/vg/letters/let777/letter.html), c. 1 June 1889.
                  The French is public domain; this English is the project's own rendering, not the edition's. */}
              <p className="arrival-line">“This morning, long before sunrise, I looked out at the countryside from my window, with nothing but the morning star, which seemed very large.”</p>
              <p className="arrival-cite">Vincent to Theo, Saint-Rémy, June 1889 · letter 777</p>
            </figcaption>
          </figure>
        </div>
      )}
      {captionShown && (
        <div className="arrival-caption">…the same two paragraphs…</div>
      )}
      {children}
    </main>
  )
}
```

The `dom` refs are created with `useRef` on every render (stable), in one object literal, no wrapper hook. Under
reduced motion the driver mounts, `arrivalFrame(_, true)` puts the camera at home on its first frame and `onDone`
fires at once, so the controls are on from the first frame the visitor can act on; the caption is React state and
the driver never touches it. A cached scan fires `onLoad` normally (React attaches the handler before `src` on a
fresh element).

### C6 — the app and the chrome (`App.tsx`, `index.css`)

`App.tsx`: `const arrival = params.get('arrival') === '1'` beside the other flags (a comment naming this plan), and
`arrival={arrival}` on `<DioramaExperience>`. Nothing else: the 2D route ignores it.

`index.css`, after the dock rules:

```css
/* C (arrival, `?arrival=1`, tasks/2026-10-20-arrival-c-plan.md): the painting on a dark ground with Vincent's line,
   then it dissolves into the diorama. The driver writes opacity, visibility and the scan's scale per frame; no CSS
   transition here, so a pinned capture is exact. */
.arrival {
  position: absolute;
  inset: 0;
  z-index: 9;
  display: grid;
  place-items: center;
  background: #06112a;
  pointer-events: none;
}

.arrival-painting {
  margin: 0;
  width: min(86vw, 78vh * 1.263);
}

.arrival-painting img {
  display: block;
  width: 100%;
  aspect-ratio: 1600 / 1267;
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.6);
  transform-origin: center;
  will-change: transform;
  user-select: none;
}

.arrival figcaption,
.arrival-caption {
  margin: 22px auto 0;
  max-width: 56ch;
  color: rgba(244, 234, 211, 0.92);
  font-family: Georgia, 'Iowan Old Style', 'Times New Roman', serif;
  font-size: 17px;
  font-style: italic;
  line-height: 1.45;
  text-align: center;
}

.arrival-line {
  margin: 0;
}

.arrival-cite {
  margin: 8px 0 0;
  font-size: 12px;
  font-style: normal;
  letter-spacing: 0.02em;
  opacity: 0.7;
}

/* reduced motion: the line as a static caption over the still */
.arrival-caption {
  position: absolute;
  right: 16px;
  bottom: 84px;
  left: 16px;
  z-index: 9;
  pointer-events: none;
  text-shadow: 0 2px 16px rgba(4, 8, 20, 0.78);
}

/* the title and the dock arrive with the controls. Hidden by visibility, not opacity alone: an invisible link or
   button would still take focus and clicks (`.visitor-title a` restores pointer events on itself; review F2). The
   transition is scoped to a shell with the arrival, so the flag-off route's computed style is unchanged. */
.diorama-shell.has-arrival .visitor-title,
.diorama-shell.has-arrival .visitor-dock {
  transition: opacity var(--arrival-reveal, 600ms) ease;
}

.diorama-shell.is-arriving .visitor-title,
.diorama-shell.is-arriving .visitor-dock {
  opacity: 0;
  visibility: hidden;
}

@media (max-width: 640px) {
  .arrival figcaption,
  .arrival-caption {
    font-size: 15px;
  }
}
```

The existing reduced-motion block gains `.diorama-shell.has-arrival .visitor-title, .diorama-shell.has-arrival
.visitor-dock { transition: none; }`. The layer's ground is the shell's `#06112a`, the canvas's clear colour, so
the dissolve reveals the dome, not a seam.

### C7 — the capture tool (`scripts/capture-sky-frames.mjs`)

Two tracked options; with neither given, the script runs exactly as today, file names included.

- `--arrival-times a,b,c`: one per `--times` entry, finite, non-decreasing, or the script exits 1 before Chrome
  starts. Both pins go in ONE expression everywhere: the per-frame pin `window.__skyTime = ${t};
  window.__arrivalTime = ${at};`, the `--eval` prelude likewise. Before `Page.navigate`, `Page.enable` and
  `Page.addScriptToEvaluateOnNewDocument` install the first pair, so the arrival is held from the page's first
  frame and cannot finish during the settle (F7). Files are `${prefix}-t${t}-a${at}.png`, so eight samples at sky
  time 0 are eight files (F8); the JSON records `t` and `a` per frame; the readback checks both globals.
- `--screenshot`: `Page.captureScreenshot({ format: 'png' })` after the same three-frame wait, instead of
  `toDataURL`, because the layer is DOM. The two-read self-check applies to it too.

### C8 — tests (`scripts/arrival.test.ts`, added to `test:sky` in `package.json`)

The spherical helper is the one in `diorama-layout.test.ts:30–55`; derived angles compare with a tolerance of
1e-12 (the mobile home sits exactly on the azimuth limit, and the path's reconstruction rounds by 6e-17, F10);
distances compare strictly. Every camera test runs for `DIORAMA_CAMERAS.design` and `.mobile`.

- A1 at a = 0: overlay 1, line 1, rate 0, push 0, not done; `arrivalCamera(home, 0)` at distance `startDistance`
  (± 1e-9) along the home's axis (the cross product with the home offset is 0 ± 1e-9).
- A2 at a = `ARRIVAL_END` and beyond: overlay 0, rate 1, push 1, done; `arrivalCamera(home, 1) === home.position`
  (the same object).
- A3 monotone on a 0.01 s grid over 0..12 s: overlay and line non-increasing; rate, push and scale non-decreasing;
  the distance non-increasing.
- A4 envelope: every sample's camera inside `DIORAMA_ORBIT` for both homes, and `ARRIVAL_START_INSIDE_ORBIT`.
- A5 order: the line is 0 at `hold` while the overlay is still 1 there; the rate and the push are still 0 at
  `hold + lead`.
- A6 reduced: `arrivalFrame(0, true)` is the end state (done, rate 1, push 1, overlay 0).
- A7 the hold: rate is exactly 0 for every sample in 0..`hold + lead`.
- A8 the clock: not ready → `a` stays 0 over 200 ticks; ready → advances by `dt`; a 30 s tick advances 0.1
  (`maxDt`); skip at 0 and at 2 → done within 1.1 s of ticked time, `a` non-decreasing throughout; not ready plus
  skip → advances; not ready for `readyTimeout` → advances; a pin sets `a` and latches `done` past the end; after
  done every tick returns the same `a`; a NaN `dt` advances 0.
- A9 orientation, with three's `PerspectiveCamera` (node runs three): for both homes and push 0, 0.5, 1, the camera
  at `arrivalCamera(home, push)` after `lookAt(target)` has `quaternion × homeInverseQuaternion(home)` within
  1e-12 of identity, so the camera-locked sky stays put along the whole path.

Red first: the test file lands before `arrival.ts` and fails on the import; then the module makes it green. What
the pure suite cannot see (Codex, question 9): a driver that forgets `lookAt`, `onDone`, the line write or the sky
wiring. Those are G4, G5 and G7's job, by capture and by hand.

### C9 — flag-off identity, by construction

`App.tsx`: one new boolean, one prop. `DioramaExperience`: `enabled={!arriving}` is `enabled={true}` with the flag
off, drei's default; the driver, the layer and the caption are not mounted; the `has-arrival` class and the style
variable are absent, so the chrome's computed style is unchanged; `arrivalStep`, `ready` are not passed. The sky:
`undefined ?? dt` is `dt`, bit for bit. The cypress: an effect that writes nothing. The gate proves it on the Mac
GPU anyway (G3).

## Commits

1. `test(arrival): the timeline's tests, red` then `feat(arrival): the timeline, the clock and the camera path` (C2, C8).
2. `feat(arrival): the opening behind ?arrival=1` (C3–C6).
3. `chore(capture): --arrival-times and --screenshot, for the arrival's frames` (C7).
4. `docs(tasks): C's record and gate`, with the Tunables entry.

## Gate (this session; Mark's taste gate follows on the preview)

| # | Check | Pass when |
|---|---|---|
| G1 | Red first | A1–A9 fail before C2 lands; pass after |
| G2 | `test:sky`, `tsc -b`, build, eslint on `src` and `scripts` | 140 tests green, build green, lint clean |
| G3 | Default route vs `main` (`5bbe243`), pinned t 0 / 2.3 / 3.7 / 11.2 light, 0 / 3.7 moving; `?alive=1` and `?touch=1` the same | byte-identical on the Mac GPU (headless Chrome renders on Metal here) |
| G4 | End state: `?arrival=1&clean=1` with `--arrival-times 20,20,20` and `--times 0,2.3,11.2` vs `?clean=1` at the same times, both skies, both viewports | byte-identical: the camera landed on the home tuple and the controls own it again. A one-grey-level residue at a few pixels is compared with `main`'s own touch-vs-alive residue (B's gate, row 7) before it is called a defect |
| G5 | Arrival frames: `--screenshot --times 0,0,0,0,0,0.3,2,4 --arrival-times 0,2,3.5,4.4,5,5.5,7,9`, both skies, both viewports; eight distinct files per run, viewed at 1:1 | the painting on its ground, the line legible, the line gone before the dissolve, the dissolve reading as the painting opening (not a jump), the push visible, the end frame the home. Name what looks wrong |
| G6 | `CAPTURE_SETTLE_MS=9000 DIORAMA_CAPTURE_URL='http://127.0.0.1:5179/?arrival=1' npm run check:reduced` (the control page must sample after the arrival's 8.75 s, F9); `DIORAMA_CAPTURE_URL='http://127.0.0.1:5179/?arrival=1&_=' npm run check:viewport` | PASS, PASS, the invocations recorded |
| G7 | Headed: a click at a ≈ 2 skips (done within 1.1 s, no pop); Enter skips; Tab during the arrival reaches no chrome; a drag during the arrival does not orbit; after done, orbit and (with `touch=1`) B's surge work; hide the tab at a ≈ 2 for 20 s and return: the opening continues where it was; `?perf=1&arrival=1` | as stated; frame rate within 3 fps of `main`'s on the same run |
| G8 | Reviewer (Codex, `w4:p4`) on the diff, after the build, with F1–F10 to confirm closed | no P0 or P1 open |

## Risks

- **The dissolve reads as a crossfade, not as the painting opening.** Mark's taste gate decides. The fallback is to
  open on the head-on still with the line as a caption: delete the layer and the scan, keep C1's clock, the hold
  and the push. The same tests hold with `overlay` unused.
- **The push is small** (0.36 units on desktop, 0.15 on a phone) because the orbit limits are locked. If Mark wants
  more, the proposal is a `Proposed to Mark` line: an arrival-only start outside `maxDistance`, which would also
  need the sky's cap painted.
- **The first paint waits for the scan** (1.0 MB; cached after the first visit, and the Open Graph crawlers already
  fetch it). The hold starts only when it has loaded or failed, so a slow network shows the dark ground longer,
  never a half-loaded image.
- **An ulp.** OrbitControls' `update()` rewrites `position = target + (position − target)`; the flag-off route runs
  that from its first frame, the arrival route from `done`. Both start from the same home tuple, so G4 captures
  well past `done`.
- **Not built, noted for Mark:** a "tap to continue" hint; once per session (`sessionStorage`) so a returning
  visitor is not held 4 s; French under the English; the title visible during the opening.

## Review

Reviewed before the build by Codex (`w4:p4`, read-only, `scratch/arrival-c-2026-10-20/review-report.md`; it ran the
proposed timeline and driver in memory against three's real camera). Verdict REVISE; every finding checked against
the code and applied above:

- F1 (P1) the reduced-motion caption could never be dismissed: the driver latched `done` and its listeners went with
  `arriving` → the caption is its own React state with its own listeners, live as long as it shows (C1, C5).
- F2 (P1) the hidden chrome stayed focusable, and the credit links clickable through `pointer-events: auto` →
  `visibility: hidden` while arriving (C6).
- F3 (P1) a hidden tab's 30 s delta collapsed the opening and advanced the sky by the gap → `maxDt` 0.1 on the
  arrival clock, and the sky takes the same bounded step during the arrival (`arrivalStep`), `dt` after (C2, C3).
- F4 (P1) the sky's seam did not cover the cypress, whose CPU image does not suspend → a second seam in
  `BrushCypress`; the arrival waits for sky, cypress and scan (C4, C5).
- F5 (P1) a failed asset left the curtain up for ever, and skip could not escape → `readyTimeout` 15 s, a skip
  while waiting opens, the scan's `onError` counts as ready (C2, C5).
- F6 (P1) skip at speed 4 took 2.2 s from the start, not the promised 1.2 → speed 8, bound 1.1 s, stated (C1, C2).
- F7 (P2) the arrival could finish during the capture's settle before the first pin → the first pair of pins is
  installed before navigation; pins validated non-decreasing; G4 uses `20,20,20` (C7).
- F8 (P2) G5's eight frames collapsed to four files → `-a${at}` in the name when arrival times are given (C7).
- F9 (P2) `check:reduced`'s control page sampled inside the hold and would read as still → `CAPTURE_SETTLE_MS=9000`
  for that run, recorded (G6).
- F10 (P2) A4's strict comparison fails on the mobile home's azimuth by 6e-17 → tolerance 1e-12 on derived angles,
  the terminal tuple still exact (C8).
- Quality: `skipRequested` for the flag; the driver's comment corrected (the controls' constructor does point the
  camera once; the driver's `lookAt` is the same call); `reveal` in `ARRIVAL` and read by CSS as a custom property;
  the `has-arrival` scope so the flag-off computed CSS is unchanged; no `useArrivalDom` wrapper; the local
  smoothstep kept (`skyMapping.ts`'s pulls in three and the brush code); `homeInverseQuaternion` reused in A9; the
  line's provenance in the code comment and the on-screen citation names the letter.
- Checked sound by the reviewer: the dolly's geometry and envelope (0 violations on design and orbit, the mobile
  rounding above), the exact home tuple, the orientation along the path (identity to 3e-16), the flag-off trace of
  every change, the French against the edition and the English against its translation.
