# C — arrival: plan, 2026-10-20

Slice C of "Direction — make it alive" (`tasks/todo.md`): "open on the flat painting, one line from Vincent's letter,
the sky starts to breathe, the camera pushes through the frame into the diorama." Built on the Mac on a branch from
`docs/after-pr-11` (= `main` `5bbe243` plus the record), behind its own flag `?arrival=1`. The flag implies nothing:
`?arrival=1` opens into today's sky, `?arrival=1&alive=1&touch=1` into everything, so C does not wait on the flag
decision. With the flag off, every route is byte-identical to `main`. Mark judges the feel on a preview; this
session gates the mechanics with pinned clocks, as A and B were gated.

Mapping for this session (`herdr agent list`, 2026-10-20): Lead `w4:p1` (Claude), Reviewer `w4:p4` (Codex), Worker
`w4:p5` (Antigravity). Nothing is built before the reviewer's verdict on this plan lands.

## What is there today

- **Routes and flags** (`src/App.tsx:52–60`): `mode` defaults to `diorama`; `clean`, `tune`, `touch`, `alive` are
  read from the URL; `alive = alive || tune || touch`. The diorama route renders `<DioramaExperience>` with the
  chrome (`VisitorChrome`: the title placard, the original placard, the dock) as children (`:109–114`). The 2D
  route (`?mode=2d` or anything else) is a different React tree, so an arrival that crossed from it into the
  diorama would remount the Canvas. C runs on the diorama route only.
- **The camera** (`src/scene/DioramaExperience.tsx:99–138`): drei's `PerspectiveCamera` (makeDefault) at the home
  pose, `DIORAMA_CAMERAS.design` on landscape or `.mobile` on portrait (`isPortrait` from R3F's `size`), and
  `OrbitControls` with `DIORAMA_ORBIT` (distance 3.25–5.6, azimuth −π/12..π/4, polar 0.58–1.62, no pan, damping).
  drei's controls call `update()` in their own `useFrame` at priority −1 only while `enabled`; the first `update()`
  is what points the camera at the target (`OrbitControls.update` ends with `object.lookAt(target)`).
- **The sky is camera-locked** (`PaintingFlowSky3D.tsx:1126–1129`): `skyRoot.quaternion = camera.quaternion ×
  homeInverse`, identity at the home pose. `homeInverse` is `Matrix4.lookAt(eye, target, +Y)` for the home
  (`:833–838`). A camera on the home's own axis, farther out, has the same quaternion, so the sky does not move
  during a dolly along that axis.
- **The sky clock** (`:1130–1151`): paused → `clock.current = 0`, the store cleared, no uniform write (the light
  material is rebuilt at t = 0 on a pause change, `:1095–1097`, so a pause is not a way to hold the sky without a
  shader compile on release). Pinned (`window.__skyTime` finite) → both `uTime`s and the clock take the pin.
  Else `uTime += dt` on both materials. Every alive term is 0 at t = 0 (the gust lift has no lag, the halos' breath
  is `sin(ωt)`, the flicker and the glimmer read the same clock), so a clock held at 0 is today's still.
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
  2.5 s settle, `check:viewport` a fresh load against a rotated one under reduced motion. A DOM layer never
  reaches them. `capture-sky-frames.mjs` pins `__skyTime` per frame, reads the canvas, and `--eval` runs page
  code in the same evaluation as the first pin (two CDP calls race the frame loop, PR #11 P2).
- **The scan** `/public/reference/painting.jpg` (1600 × 1267, 1.0 MB) is already served: the original placard and
  the Open Graph image use it.
- **The line.** Vincent to Theo, Saint-Rémy-de-Provence, letter 777 (vangoghletters.org), between about 31 May and
  6 June 1889, the letter in which he describes the view that became the painting. The original French is public
  domain (the site's transcription, its spellings kept): "Ce matin j’ai vu la campagne de ma fenêtre longtemps
  avant le lever du soleil avec rien que l’etoile du matin laquelle paraissait tres grande." The site's English is
  © 2009 Van Gogh Museum / Huygens ING, all rights reserved, so the English on screen is this project's own
  rendering of that sentence, not the site's.

## Design

### C1 — the sequence, on one arrival clock

`a` is seconds since the arrival started: the scan has loaded and the sky has drawn its first frame with its
ribbons. Until both, `a` stays 0 and the opaque layer hides the canvas (today the sky appears as its textures
load; the layer covers that). Stages, all constants in `ARRIVAL` (Tunables):

| from | to | what |
|---|---|---|
| 0 | 4.0 (`hold`) | the painting on a dark ground, the line beneath it. Sky clock held at 0 (rate 0). Camera at the start pose: the home's axis, distance 5.55. Controls off, dock and title hidden |
| 3.0 | 4.0 | the line fades (`lineFade` 1) |
| 4.0 | 5.5 | the dissolve (`dissolve` 1.5): the layer's opacity 1 → 0 while the scan grows 1 → 1.12 (`grow`). The live sky it reveals is still the painting: identical in the centre, the land opening into the island |
| 4.75 | 7.75 | the sky starts to breathe (`breathe` 3, from `hold + lead`, `lead` 0.75): the clock's rate eases 0 → 1 |
| 4.75 | 8.75 | the push (`push` 4): distance 5.55 → home, smoothstep; the last frame sets the home tuple exactly |
| 8.75 | | done: controls on, B's touch on if flagged, dock and title fade in (CSS, 600 ms) |

A tap, click, Enter, Space or Escape at any point runs the clock at `skipSpeed` 4 from that moment: every stage
ends within about 1.2 s and nothing jumps. The rate, the opacity and the distance are monotone in `a` whatever the
speed, so the skip cannot run a stroke backwards or pop a frame.

Reduced motion (system): `arrivalFrame(a, true)` is the end state at a = 0: no layer, no push, rate 1, camera at
home from the first frame. The line is a static caption over the still, removed on the first pointer or key, with
no transition. `check:reduced` sees a still canvas; `check:viewport` sees the same framing fresh or rotated.

### C2 — `src/scene/arrival.ts` (new, pure, `.ts` imports only)

```ts
import { DIORAMA_ORBIT } from './dioramaContract.ts'

/** C (arrival): the timeline's constants, in seconds unless said. Logged in CLAUDE.md's Tunables. */
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
  /** the clock's speed after a tap, click or key */
  skipSpeed: 4,
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
  const distance = ARRIVAL.startDistance + (homeDistance - ARRIVAL.startDistance) * progress
  const k = distance / homeDistance
  return [tx + dx * k, ty + dy * k, tz + dz * k]
}

/** The start distance must sit inside the orbit's envelope, or the first frame would be a clamped camera. */
export const ARRIVAL_START_INSIDE_ORBIT =
  ARRIVAL.startDistance > DIORAMA_ORBIT.minDistance && ARRIVAL.startDistance < DIORAMA_ORBIT.maxDistance
```

### C3 — the sky: a rate and a ready seam (`PaintingFlowSky3D.tsx`)

Two optional props after `touchStore` in `Props` (`:175–178`):

```ts
  /** C (`?arrival=1`): the clock's rate this frame, 0 held .. 1 live; absent, the clock runs as today. */
  arrivalRate?: RefObject<number>
  /** C: written true once the ribbons have a geometry to draw, so the arrival does not reveal an empty sky. */
  ready?: RefObject<boolean>
```

The frame loop (`:1146–1151`), the advance branch only:

```ts
    } else {
      // C: the arrival holds the clock at 0 and eases it to live; with no arrival the rate is 1 and `dt * 1` is `dt`
      const step = dt * (arrivalRate?.current ?? 1)
      ribbonMaterial.uniforms.uTime.value += step
      // both clocks run whichever sky is shown, so switching never jumps either one
      movingMaterial.uniforms.uTime.value += step
      clock.current = ribbonMaterial.uniforms.uTime.value
    }
```

And at the top of the frame loop, before the paused branch: `if (ready) ready.current = Boolean(ribbons.geometry) && !awaitingMoving`. (`ribbons` is computed at `:1200`, below the loop; move that line above the `useFrame`, it has no dependency on the loop.) The paused branch is untouched: a pause during the arrival cannot happen (the dock is hidden) and reduced motion ends the arrival at a = 0.

### C4 — the scene: the driver, the controls, the touch (`DioramaExperience.tsx`)

`Scene` takes `arrival: boolean`, `arriving: boolean`, `onArrived: () => void`, `dom: ArrivalDom` (the refs below). Changes:

```tsx
      <OrbitControls
        ref={controls}
        enabled={!arriving}
        …as today…
      />
      {arrival && <ArrivalDriver home={camera} reduced={still} ready={skyReady} rate={arrivalRate} dom={dom} onDone={onArrived} />}
```

`useTouchInput({ enabled: touch && !reduced && !arriving, … })`. The sky gets `arrivalRate={arrival ? arrivalRate : undefined}` and `ready={arrival ? skyReady : undefined}`, so with the flag off both are absent.

```tsx
type ArrivalWindow = Window & { __arrivalTime?: number }

export type ArrivalDom = {
  layer: RefObject<HTMLDivElement | null>
  scan: RefObject<HTMLImageElement | null>
  line: RefObject<HTMLElement | null>
  /** the scan has loaded */
  loaded: RefObject<boolean>
  /** a tap, click or key has asked to skip */
  skipped: RefObject<boolean>
}

/**
 * C: runs the arrival clock and writes every frame's values: the camera along the home's axis, the sky's rate,
 * the layer's styles. Priority −2: before drei's controls (−1, off during the arrival) and the sky (0), which
 * reads the camera's quaternion after this. `window.__arrivalTime` pins the clock for captures; pins go up only.
 */
function ArrivalDriver({ home, reduced, ready, rate, dom, onDone }: {
  home: (typeof DIORAMA_CAMERAS)[keyof typeof DIORAMA_CAMERAS]
  reduced: boolean
  ready: RefObject<boolean>
  rate: RefObject<number>
  dom: ArrivalDom
  onDone: () => void
}) {
  const { camera } = useThree()
  const a = useRef(0)
  const done = useRef(false)
  useFrame((_, dt) => {
    if (done.current) return
    const pinned = (window as ArrivalWindow).__arrivalTime
    if (typeof pinned === 'number' && Number.isFinite(pinned)) a.current = pinned
    else if (ready.current && dom.loaded.current) a.current += dt * (dom.skipped.current ? ARRIVAL.skipSpeed : 1)
    const f = arrivalFrame(a.current, reduced)
    rate.current = f.rate
    // the controls are off, so nothing else points the camera: look at the target as OrbitControls.update would
    camera.position.set(...arrivalCamera(home, f.push))
    camera.lookAt(home.target[0], home.target[1], home.target[2])
    const layer = dom.layer.current
    if (layer) {
      layer.style.opacity = String(f.overlay)
      layer.style.visibility = f.overlay > 0 ? 'visible' : 'hidden'
    }
    if (dom.scan.current) dom.scan.current.style.transform = `scale(${f.scale})`
    if (dom.line.current) dom.line.current.style.opacity = String(reduced ? (dom.skipped.current ? 0 : 1) : f.line)
    if (f.done) {
      done.current = true
      onDone()
    }
  }, -2)
  return null
}
```

`DioramaExperience` owns the state and the layer:

```tsx
export function DioramaExperience({ …, arrival = false, children }: Props) {
  const [arrived, setArrived] = useState(false)
  const arriving = arrival && !arrived
  const dom = useArrivalDom()   // the five refs above, created once
  const skip = () => { dom.skipped.current = true }
  useEffect(() => {
    if (!arriving) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') skip() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [arriving])
  return (
    <main className={`visitor-shell diorama-shell${clean ? ' is-clean-capture' : ''}${arriving ? ' is-arriving' : ''}`} onPointerDown={arriving ? skip : undefined}>
      <Canvas …>
        <Scene … arrival={arrival} arriving={arriving} onArrived={() => setArrived(true)} dom={dom} />
      </Canvas>
      {arrival && !still && (
        <div className="arrival" ref={dom.layer} aria-hidden={arrived}>
          <figure className="arrival-painting">
            <img ref={dom.scan} src="/reference/painting.jpg" alt="The Starry Night, Vincent van Gogh, 1889" draggable={false} onLoad={() => { dom.loaded.current = true }} />
            <figcaption ref={dom.line}>
              <p className="arrival-line">“This morning, long before sunrise, I looked out at the countryside from my window, with nothing but the morning star, which seemed very large.”</p>
              <p className="arrival-cite">Vincent to Theo, Saint-Rémy, June 1889</p>
            </figcaption>
          </figure>
        </div>
      )}
      {arrival && still && (
        <p className="arrival-caption" ref={dom.line}>…the same two lines…</p>
      )}
      {children}
    </main>
  )
}
```

Under reduced motion the driver still mounts (it writes the caption's opacity from `skipped`), `arrivalFrame(_, true)`
puts the camera at home on the first frame, and `onDone` fires at once, so the controls are on from the first frame
the visitor can act on. A cached scan fires `onLoad` normally (React attaches the handler before `src` is set on a
fresh element).

### C5 — the app and the chrome (`App.tsx`, `index.css`)

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

/* the title and the dock arrive with the controls */
.diorama-shell .visitor-title,
.diorama-shell .visitor-dock {
  transition: opacity 600ms ease;
}

.diorama-shell.is-arriving .visitor-title,
.diorama-shell.is-arriving .visitor-dock {
  opacity: 0;
  pointer-events: none;
}

@media (max-width: 640px) {
  .arrival figcaption,
  .arrival-caption {
    font-size: 15px;
  }
}
```

The reduced-motion block already in the file gains `.visitor-title, .visitor-dock { transition: none; }`. The layer's
ground is the shell's `#06112a`, the canvas's clear colour, so the dissolve reveals the dome, not a seam.

### C6 — the capture tool (`scripts/capture-sky-frames.mjs`)

Two tracked options. `--arrival-times a,b,c`, one per `--times` entry, pinned in the SAME expression as `__skyTime`
(the eval pin and the per-frame pin alike): `window.__skyTime = ${t}; window.__arrivalTime = ${at};`. Pins within
a page go up only: the driver's `done` latches, as it does live. `--screenshot` reads the frame with
`Page.captureScreenshot` (`{ format: 'png' }`) instead of `canvas.toDataURL`, because the layer is DOM; the
three-frame wait and the two-read self-check stay as they are. The usage comment gains both.

### C7 — tests (`scripts/arrival.test.ts`, added to `test:sky` in `package.json`)

The spherical helper is the one in `diorama-layout.test.ts:30–55`. Every test runs for both `DIORAMA_CAMERAS.design`
and `.mobile`.

- A1 at a = 0: overlay 1, line 1, rate 0, push 0, not done; `arrivalCamera(home, 0)` at distance `startDistance`
  (± 1e-9) along the home's axis (the cross product with the home offset is 0 ± 1e-9).
- A2 at a = `ARRIVAL_END` and beyond: overlay 0, rate 1, push 1, done; `arrivalCamera(home, 1) === home.position`
  (the same object).
- A3 monotone on a 0.01 s grid over 0..12 s: overlay and line non-increasing; rate, push and scale non-decreasing;
  the distance non-increasing.
- A4 envelope: every sample's camera inside `DIORAMA_ORBIT` (distance, azimuth, polar) for both homes, and
  `ARRIVAL_START_INSIDE_ORBIT` true.
- A5 order: the line is 0 at `hold` while the overlay is still 1 there; the rate and the push are still 0 at
  `hold + lead`.
- A6 reduced: `arrivalFrame(0, true)` is the end state (done, rate 1, push 1, overlay 0).
- A7 the hold: rate is exactly 0 for every sample in 0..`hold + lead`, so the sky's `uTime` stays at 0 and the
  first revealed frame is the painted still.

Red first: the test file lands before `arrival.ts` and fails on the import; then the module makes it green.

### C8 — flag-off identity, by construction

`App.tsx`: one new boolean, one prop. `DioramaExperience`: `enabled={!arriving}` is `enabled={true}` with the flag
off, drei's default; the driver, the layer and the caption are not mounted; `arrivalRate` and `ready` are not
passed. The sky: `dt * (undefined ?? 1)` is `dt`, bit for bit. The gate proves it on the Mac GPU anyway (G3).

## Commits

1. `test(arrival): the timeline's tests, red` then `feat(arrival): the timeline and the camera path` (C2, C7).
2. `feat(arrival): the opening behind ?arrival=1` (C3, C4, C5).
3. `chore(capture): --arrival-times and --screenshot, for the arrival's frames` (C6).
4. `docs(tasks): C's record and gate`, with the Tunables entry.

## Gate (this session; Mark's taste gate follows on the preview)

| # | Check | Pass when |
|---|---|---|
| G1 | Red first | A1–A7 fail before C2 lands; pass after |
| G2 | `test:sky`, `tsc -b`, build, eslint on `src` and `scripts` | 138 tests green, build green, lint clean |
| G3 | Default route vs `main` (`5bbe243`), pinned t 0 / 2.3 / 3.7 / 11.2 light, 0 / 3.7 moving; `?alive=1` and `?touch=1` the same | byte-identical on the Mac GPU (headless Chrome renders on Metal here) |
| G4 | End state: `?arrival=1&clean=1` with `--arrival-times 20` and `--times 0,2.3,11.2` vs `?clean=1` at the same times, both skies, both viewports | byte-identical: the camera landed on the home tuple and the controls own it again |
| G5 | Arrival frames: `--screenshot --times 0,0,0,0,0,0.3,2,4 --arrival-times 0,2,3.5,4.4,5,5.5,7,9`, both skies, both viewports, viewed at 1:1 | the painting on its ground, the line legible, the line gone before the dissolve, the dissolve reading as the painting opening (not a jump), the push visible, the end frame the home. Name what looks wrong |
| G6 | `check:reduced` and `check:viewport` on `?arrival=1` (base `?arrival=1&_=` for viewport) | PASS, PASS |
| G7 | Headed: a click at a ≈ 2 skips (every stage ends within 1.2 s, no pop); Enter skips; a drag during the arrival does not orbit; after done, orbit and (with `touch=1`) B's surge work; `?perf=1&arrival=1` | as stated; frame rate within 3 fps of `main`'s on the same run |
| G8 | Reviewer (Codex, `w4:p4`) on the diff, after the build | no P0 or P1 open |

Mechanical captures (G3, G4, G5's capture step) go to the worker with a brief file; the Lead looks at every frame.

## Risks

- **The dissolve reads as a crossfade, not as the painting opening.** Mark's taste gate decides. The fallback is to
  open on the head-on still with the line as a caption: delete the layer and the scan, keep C1's clock, the hold
  and the push. The same tests hold with `overlay` unused.
- **The push is small** (0.36 units on desktop, 0.2 on a phone) because the orbit limits are locked. If Mark wants
  more, the proposal is a `Proposed to Mark` line: an arrival-only start outside `maxDistance`, which would also
  need the sky's cap painted.
- **The first paint waits for the scan** (1.0 MB; cached after the first visit, and the Open Graph crawlers already
  fetch it). The hold starts only when it has loaded, so a slow network shows the dark ground longer, never a
  half-loaded image.
- **The controls are off at mount**, so nothing points the camera until the driver's first frame; the driver calls
  `lookAt` every frame, the same call `OrbitControls.update` ends with, so the sky's home quaternion holds.
- **An ulp.** OrbitControls' `update()` rewrites `position = target + (position − target)`; the flag-off route runs
  that from its first frame, the arrival route from `done`. Both start from the same home tuple, so G4 captures a
  few frames after `done` (the pin 20 s is well past it). If G4 differs by one grey level at a few pixels, compare
  against `main`'s own touch-vs-alive residue (B's gate, row 7) before calling it a defect.
- **Not built, noted for Mark:** a "tap to continue" hint; once per session (`sessionStorage`) so a returning
  visitor is not held 4 s; French under the English; the title visible during the opening.

## Review

Pending: Reviewer (Codex, `w4:p4`), brief at `scratch/arrival-c-2026-10-20/review-brief.md`. Findings and their
dispositions are recorded here when the verdict lands.
