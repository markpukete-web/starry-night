# Make-it-alive A, second pass — plan, 2026-10-13

The two foreground items of slice A (`tasks/todo.md`, "Direction — make it alive"): a flame-like flicker in the
cypress and a glimmer in the village windows. Built in a cloud session on `claude/confident-bohr-1y7p2u` from
`main` at `246e817` (PR #8 merged, A's sky behind `?alive=1` with Mark's tuner and chosen defaults). Behind the same
flag, so the shipped default stays untouched until Mark's gate; two more sliders on the tuner so he dials these
the way he dialled the sky.

Impasto under raking light at orbit is NOT in this pass: the sky is rotation-locked to the camera, so orbit never
changes its view angle (the first plan's note stands; Mark's call whether a light that moves with the orbit angle
is wanted instead).

Reviewed by a fresh agent before the build (REVISE, F1–F19 below); the design here is the revised one.

## What is there today

- **Cypress** (`src/scene/BrushCypress.tsx`): one closed underpaint solid (painting.jpg mapped by `uv`, a colour
  lift) and one ribbon mesh of 48 structural strokes on the front and about 9 on the back over the lobes, each stroke
  a `pushBrushRibbon` with ONE source pigment (the centre texel) × `relief` × `SOURCE_STROKE_LIFT` × a moon-shade
  term per vertex, as vertex colours. Both are `MeshBasicMaterial` (`vertexColors`, `toneMapped: false`,
  `DoubleSide`). The stroke generator (`cypressLobeStrokes.ts`) knows each stroke's lobe, its height range
  (`heightFraction` 0 at the base, 1 at the tip, per sample) and its `lateral` −1..1 across the lobe.
- **Village windows** (`src/scene/villageGeometry.ts`): `opening(paint, face, …, lit)` draws the dark opening
  polygon, and when `lit` one `mark()` of `OCHRE × 1.25` (the palette's `windowOchre`, #656b27) into the `paint`
  mesh: 10 vertices, 8 triangles per lit window, and the triangles reference only their own 10 vertices. Six
  buildings carry windows (two openings each; the first always lit, the second only on the striped-roof house),
  so 7 lit marks, 70 vertices. `Village.tsx` draws `paint` AND `solid` with one shared vertex-colour
  `MeshBasicMaterial` (review F4). No mask, no texture: the lit marks are plain vertex-coloured triangles, so
  they can be told apart by vertex range at build time.
- **The clock** lives inside `PaintingFlowSky3D` (`clock` ref: pinned `window.__skyTime`, advanced by `dt`, or 0
  while paused) and is read by `SourceOrbs` for the halos. The diorama (`Diorama.tsx`: island, village, cypress) is
  a sibling of the sky under `Scene` in `DioramaExperience.tsx` and has no clock.

## Design

### A3 — one clock for the whole diorama

`Scene` owns `const skyClock = useRef(0)` and passes it to both: `PaintingFlowSky3D` takes an optional `clock`
prop (its frame loop writes it exactly as it writes its internal ref today, which stays as the fallback so the 2D
routes and tests are untouched), `Diorama` takes `clock`, `alive` and `tuning` and hands them to `BrushCypress` and
`Village`. The foreground writers read the ref in their own `useFrame` at default priority: they subscribe before
the sky (the diorama renders first) and so read the previous frame's clock, the same one-frame lag `SourceOrbs`
has, harmless live and invisible at a pinned time after the first frame (the capture script's three rAFs cover
it). `paused` writes 0 every frame, so the still is the t = 0 state. `?debug=stage` (no sky) leaves the clock at
0: the foreground stands still, which is what a stage view is for.

### A4 — the cypress flicker

A flame flickers at its tongues and tips, not in its trunk: brightness runs up the strokes, the outer licks and
the top carry it, the dark core barely moves. "Up" is a reading of a flame, as "left to right" was a reading of
the great wave (first pass, F13): a declared direction, tunable, not a derivation (review F19). On this cypress the
strokes ARE the flame (each follows a lobe's derived height axis), so the flicker is a brightness factor on the
stroke ribbons, evaluated PER FRAGMENT (review F1):

    L = 1 + flicker · depth · w · env(t) · Σᵢ Aᵢ · sin(ωᵢ t − kᵢ h)
    env(t) = t > 0 ? 1 − e^(−t/τ) : 0          (τ 1.5 s)

- `env` is a uniform branch, exactly 0 at t = 0 (the shape of the Codex P1 fix on the sky: no reliance on
  `sin(−x) = −sin x` or `exp(0) = 1`), so `L = 1 + x · 0 = 1` exactly at t = 0 at every fragment, whatever the
  interpolation of `w` and `h` (review F1, F3: a vertex-evaluated `L` through a plain varying would drift in the
  last bits at t = 0, the sky's grey-level lesson; `flat` would ladder along a stroke). After a few τ the pattern
  is the pure travelling wave with zero time-mean, so the tree's average brightness is today's (the sky's rule:
  warp the look's timing, never its mean). `|F| ≤ Σ Aᵢ = 1` always, so with `depth` 0.6 the factor at the knob's
  maximum and full weight stays inside [0.4, 1.6]: no stroke blacks out or doubles (F3, F14).
- `h` is the vertex's `heightFraction` (0 base, 1 tip, the tree's axis, shared by the fronds) and `w` the vertex's
  flicker weight; packed as one `vec2` attribute `aFlicker` = [w, h] per vertex, built beside the colours in
  `BrushCypress` from the strokes the generator already produces (no new derivation of the tree: the lobes, the
  heights and the lateral positions are the derived ones). Packed by `positions.length / 3` before and after each
  `pushBrushRibbon`, which can return without pushing (review F10), and only with the flag on (the PR #8 rule: off,
  the geometry is main's). Plain varyings: `w` and `h` vary smoothly along a stroke, and the lift is meant to.
- **The weight is derived from the painting's cypress, not hand-placed.** `w = floor + (1 − floor) · max(tip, lick)`
  per vertex on the CPU: `tip = smoothstep(0.55, 0.9, hLobe)` from the vertex's height within its OWN lobe's range
  (so a frond's tip lights like the main flame's; on absolute `h` no frond, ending at 0.54 or 0.35 of the tree,
  ever would, review F13), `lick = smoothstep(0.40, 0.75, |lateral|)` from the stroke's mean lateral position (the
  outer tongues), floor 0.12 so the core still breathes. Back strokes take half the lick weight (the far side; a
  flame's near tongues read first). Measured on the shipped row table (session probe, 2026-10-13): 48 front and
  9 back strokes on three lobes (main 0–1, fronds to 0.54 and 0.35), 4,902 stroke vertices; stroke `|lateral|`
  quantiles 25% 0.21 / 50% 0.43 / 75% 0.58 / 95% 0.83, so the lick term is 0.5 at the 75th percentile and 1 at the
  95th (at the first draft's 0.45–0.85 the 75th read 0.25, two or three strokes, F13). The weight map over the
  tree is looked at before the build is called done (the sky's lesson: "set thresholds from the real field's
  quantiles, and look at the map").
- **The spatial pattern travels up.** Two modes, periods 1.9 s and 3.1 s (a flame's lick is seconds, not the
  sky's tens of seconds; incommensurate so it never repeats), amplitudes 0.6 / 0.4, wave numbers `k` = 2π·1.3 and
  2π·0.8 cycles over the tree's height so a bright lick is a few tenths of the tree tall and climbs at
  ω/k = 0.40 tree heights per second for both modes (about 2.5 s per tree height). The constants live in ONE
  exported table (`CYPRESS_FLICKER` in `cypressFlicker.ts`) and reach the shader as uniforms, as the sky's
  `gustUniformValues` does, so the TS twin and the GLSL cannot drift (F17).
- **The underpaint solid takes the same factor at half strength**, keyed on its own height: `buildCypressLobeSolid`
  pushes `1 − heightFraction` as each vertex's source v, so `h = 1 − sourceUv.y` is the stroke axis exactly; the
  solid gets `aFlicker` = [w(tip only, on absolute h), h] with its own uniform at half the knob. Strokes blinking
  over a still body would read as a decal; the body following faintly keeps the flame one thing.
- **The materials stay `MeshBasicMaterial`.** With the flag on, `onBeforeCompile` adds the uniforms and the
  `aFlicker` attribute (vertex stage only; `<common>` exists in both stages, F9), passes `vFlicker` down, and
  multiplies `diffuseColor.rgb` by `L` right after three's `<color_fragment>` (the vertex-colour multiply, before
  `<opaque_fragment>` and `<colorspace_fragment>`, checked in r184's `meshbasic.glsl.js`). `customProgramCacheKey`
  returns a DISTINCT string per GLSL variant (`alive-flicker`, `alive-glow`): three's default key is
  `onBeforeCompile.toString()`, and two materials sharing a helper's source would share one program (F9). Flag
  off: the untouched material, three's own program, byte-for-byte today's path, the way the sky's `ALIVE` define
  leaves main's shaders alone; no `uAlive` uniform in an on-only variant (F15). The injection replaces exact chunk
  markers (`#include <common>` in the vertex stage, `#include <color_vertex>`, `#include <color_fragment>`) and
  asserts each was found (a throw in dev, a console warning and no injection in prod) so a three upgrade cannot
  silently drop the effect. Custom uniforms assigned in `onBeforeCompile` are per material
  (`materialProperties.uniforms`), so the shared `{ value }` objects a layout effect and `useFrame` write are the
  ones the program reads.
- **Colour.** `L` scales the stroke's pigment, hue unchanged; at the knob's maximum (1.0, weight 1, both modes
  peaking) a tongue reaches 1.6× for an instant and the linear mean stays 1 (the DISPLAYED mean dips a little at
  high knobs through the sRGB curve's concavity; a note for the record, not a gate, F18). The cypress colour gate
  (`scripts/check-cypress-colour.ts`, regional Lab ΔE76 against the source crop, limit 10) runs on a capture at
  the flicker's peak as well as at t = 0. Its `treeishColour` stencil rejects bright pixels, so a lit tongue can
  leave the family and be dropped from the mean (F12): the script gains a count of stencil pixels rejected, and the
  gate bounds the peak's rejected share against t = 0's (under 5 points).

### A5 — the window glimmer

A lamp behind a window glimmers: a small irregular rise and fall, each window its own, never in step. The marks
are already the warm paint the painting has (`windowOchre` × 1.25); the glimmer scales them, per fragment:

    L = 1 + glimmer · depth · weight · (a₁ sin(ω₁ t) + a₂ sin(ω₂ t)),   a 0.7 / 0.3, depth 0.6

- `aGlow` = [weight, ω₁, ω₂] per vertex on the village `paint` geometry: weight 1 on the 70 vertices of the seven
  lit marks, 0 everywhere else (edges, openings, door); the two angular frequencies computed on the CPU from the
  mark's index (`glowPeriods(n)`: 2.3–4.1 s and 0.9–1.6 s, hashed like `haloPeriod`) and packed, never hashed in
  GLSL, where a float32 `fract(sin · 43758)` is not the TS hash (F2). Declared `flat`: each mark's triangles
  reference only its own vertices, so nothing straddles, and a hashed value through a plain varying is the
  speckle lesson verbatim (F2). `sin` only, so 0 at t = 0 exactly and zero time-mean; at the knob's maximum a window
  swings ±60% of its paint for an instant, mean unchanged; at Mark's likely range (0.3–0.6) it is a lamp breathing.
- `villageGeometry.ts` records each lit mark's vertex range as `opening()` draws it, on an extended arrays type
  (`BrushArrays & { lit: { start: number; count: number }[] }`, no module-level accumulator, F11), and
  `buildVillage({ glow })` packs the attribute only with the flag on, through `villageGlow.ts` (`.ts` imports only,
  so node can test it: `MARK_STEPS`, `markVertexCount()`, `packGlow(vertexCount, ranges)`, `glowPeriods(n)`).
  `villageGeometry.ts` itself cannot load under node (bare `./brushForms` imports, F11), so the 7-marks / 70-vertices
  count is read in the browser through a dev seam (`window.__aliveFoliage`, written by `Village` and `BrushCypress`
  with the flag on: marks, glow vertices, flicker vertices) that the gate's capture step reads.
- With the flag on `village-paint` gets its OWN `MeshBasicMaterial` with the injection; `village-solid` keeps the
  stock one (today they share one object, F4). `skin` and `foliage` are untouched. The dark opening polygons have
  weight 0 and do not move.
- No light cast on the walls: the moon's point light stays steady, the village colour gate
  (`scripts/check-village-colour.ts`, houses-band Lab ΔE76, limit 10) runs at the glimmer's peak too.

### Knobs, tuner, defaults

- `AliveTuning` gains `flicker` (0–1) and `glimmer` (0–1); `ALIVE_KNOBS`, `ALIVE_KNOB_MAX`, `clampAliveKnob`,
  `readAliveTuning`, `hasAliveKnobs` extend without special cases. URL `?alive=1&flicker=&glimmer=`.
- The tuner (`src/AliveTuner.tsx`) gains the two sliders (step 0.05), labels "flicker (cypress flame)" and
  "glimmer (village windows)". "Set as default" writes `aliveFlicker`, `aliveGlimmer`; `vite.config.ts`'s
  allowlist and `sky-tuning.json` gain the keys; `App.tsx`'s `SHIPPED_ALIVE` reads them through `tuned()`.
- Shipped starting values: flicker 0.5, glimmer 0.5 (the middle of each range; Mark's sliders decide, as before).
  The code's `ALIVE_DEFAULTS` carry the same.
- The knobs flow as uniforms in a layout effect, so a slider never rebuilds a geometry.

## Commits

1. `feat(diorama): one sky clock for the sky and the foreground` — Scene-owned ref, the sky writes it, the
   diorama receives it; no visible change.
2. `feat(cypress): a flame-like flicker up the strokes behind ?alive=1` — `cypressFlicker.ts` (the table, weights,
   the TS twin of F, the GLSL, the injection helper shared with A5), `aFlicker` in `BrushCypress`, the knob.
3. `feat(village): the lit windows glimmer behind ?alive=1` — `villageGlow.ts` (the ranges, periods, GLSL),
   `aGlow` in `villageGeometry`, the paint material split, the knob.
4. `feat(tuner): flicker and glimmer sliders, shipped defaults` — tuner, JSON, allowlist, App.
5. `test(alive): the flicker and glimmer derivations, with mutation proofs` — T14–T18.
6. `docs(tasks): second-pass record, lessons, Tunables`.

## Tests (node, `test:sky`)

- **T14 flicker weight:** on the real row table's strokes (`cypressLobeStrokes.ts` loads under node): tip vertices
  and outer licks weigh more than core vertices; the floor holds; back strokes take half the lick; a frond's tip
  vertex reaches the tip weight (hLobe, not h); `aFlicker.count === position.count` after the pack. Fixture strokes
  straddle both thresholds (the T7 lesson). Mutation proof: dropping the `lick` term turns it red.
- **T15 flicker time function:** `F(h, 0) = 0` exactly for h in {0, 0.185, 0.37, 0.605, 1}; `|F| ≤ 1` on a dense
  grid of (h, t) including the transient; the time-mean of `L` over 60 s after 5τ is within the analytic bound
  `flickerMeanBound(60)` = Σ AᵢPᵢ / (π·60) = 0.0126 at every h (the first pass's F11, review F7); the climb is
  tested on ONE mode (the second amplitude 0): the argmax over h advances 0.40 tree heights per second within
  10% (two modes make the argmax jump, F8). Mutation proof: dropping `env` makes F(h, 0) ≠ 0.
- **T16 glow packing:** `packGlow(vertexCount, ranges)` sets weight 1 and the right ω pair on exactly the ranges'
  vertices and 0 elsewhere; `markVertexCount()` is `2 · (MARK_STEPS + 1)` = 10; an off-by-one range turns it red.
- **T17 glimmer periods:** every window's two periods inside their ranges, no two windows sharing a period, the
  factor 0 at t = 0 and its 60 s mean within `glowMeanBound(60)` = 0.0178.
- **T18 knobs:** the two new knobs default, clamp and read like the four (T12's `deepEqual` literals gain the two
  keys); `gustUniformValues` unchanged by them.
- **Injection guard:** a unit test feeds the injector a shader string missing a marker and asserts it throws.

## Gate (this session; Mark's taste gate follows)

Dev server 5179 on the branch, `CHROME_FLAGS=--no-sandbox`, `CAPTURE_SETTLE_MS` 12,000, 1600×900 unless said.
Baseline: today's `main` (`246e817`), captured before the build into the session scratch (`a2/frames-main`: light t
0 / 0.5 / 1 / 2.3 / 3.7 / 7.1 / 11.2, moving 0 / 3.7 / 11.2, phone light 0 / 2.3) and proven byte-identical to the
pre-merge `e80fdf7` frames at every shared time.

1. lint, `tsc -b`, `test:sky`, build: green.
2. **Default vs `main`** at every baseline time, light, moving and phone: byte-identical (the off path is three's
   own programs and today's geometry; the clock prop changes no bytes).
3. **`?alive=1` at t = 0 vs default:** byte-identical (every new term is 0 at t = 0; the sky's part already is).
4. **Isolation** (the sky knobs at 0 make the sky exactly the default; proven on the first pass). Footprints
   measured on a capture, not the colour gates' registration rects (F6): the cypress's lower-left lobe reaches
   x ≈ 380 and its tip y ≈ 95; the striped house's windows sit at y 680–685, the others between y 637 and 662.
   `?alive=1&gust=0&lift=0&shimmer=0&breath=0&flicker=1&glimmer=0` vs default at t 1.0 / 2.3 / 7.1: every differing
   pixel inside the cypress footprint x 360–570 × y 80–700, and the complement (the sky x 600–1600 × y 0–560, the
   window footprint x 570–1000 × y 620–700) byte-identical. Then `…&flicker=0&glimmer=1`: every differing pixel
   inside the window footprint and the cypress footprint byte-identical. Then both at 1 with the sky knobs at
   Mark's defaults: the tree and the windows move with the sky, nothing else.
5. **Colour.** `check-cypress-colour` on t = 0 and on the flicker's peak frame (the TS twin finds the t of max
   over h): base/middle/top ΔE76 under 10, and under the t = 0 values + 3, with the stencil's rejected share within
   5 points of t = 0's (F12). `check:village` on t = 0 and at the glimmer's peak: under 10.
6. **Motion by eye.** 4 s at 10 fps, cypress crop at 1:1 and the striped-roof house crop (x 800–900, y 650–700) at
   4×: the licks climb, no stroke edge crawls, no pop between consecutive frames; the windows breathe each at its
   own rate, the openings stand still. Named faults → retune (cap 4 passes).
7. `check:reduced` on `?alive=1` and `?alive=1&sky=moving` (the paused still is t = 0 and so today's);
   `check:viewport` PASS.
8. Frame rate: not judgeable headless; the injection adds two sines and one exp per fragment over about 6% of the
   frame (the cypress) and a few hundred pixels of windows, and three attribute reads per vertex on about 7,100
   cypress vertices (4,902 stroke, 2,210 solid). `?perf=1` with everything on stays owed at the Mac with the
   first pass's.
9. Phone (390×844) stills at t 0 and 2.3 with both knobs at 1: the tree and the windows read; the tuner's two
   extra sliders fit under the dock (the panel scrolls at ≤640 px).
10. The capture script's two-read self-check runs at the first t > 0 as well as at t = 0, where the foreground's
    one-frame lag could hide (F16).

## Risks

- **A flicker that reads as noise.** The bar forbids generic noise; the pattern here is a travelling wave on the
  derived strokes with derived weights, two modes, not hashed per-vertex jitter. If by eye it still reads as
  "twinkling", the retune lowers the fast mode first.
- **Boil on the tree.** Two sines over a smooth `h` cannot crawl within a stroke (`h` and `w` vary smoothly along
  it), but the solid under the strokes has its own `h` from `uv`; a mismatch between the two height scales would
  show as the body and the strokes breathing out of step. Both map `heightFraction` (checked in the geometry).
- **`onBeforeCompile` and three's chunk names.** r184 carries `color_fragment` and `color_vertex`; the markers are
  asserted, so a silent miss cannot ship.
- **The clock prop changes `PaintingFlowSky3D`'s surface.** The internal ref stays the fallback; gate 2 proves no
  byte moved.
- **The envelope.** `1 − e^(−t/τ)` is not periodic, so a frame at a pinned t is still deterministic (a pure
  function of t) and captures stay frame-exact; a pause and resume restarts the light material at 0, and the
  envelope replays with it, consistent with the sky.

## Review

Reviewed before the build by a fresh agent with the shaders, `BrushCypress.tsx`, `villageGeometry.ts`, the sky's
`skyAlive.ts` and three r184's `meshbasic.glsl.js` open. Verdict REVISE; applied above:

- F1 (blocker) a vertex-evaluated factor through a plain varying is not exactly 1 at t = 0 → per-fragment `L`.
- F2 (blocker) a GLSL hash is not the TS hash, and hashed values through plain varyings speckle → periods on the
  CPU, packed, `flat`.
- F3 (blocker) the draft's transient overshot (max F 1.42 at t 0.95, h 0.185; min −1.23) → the envelope form, |F| ≤ 1.
- F4 (blocker) the village paint and solid share one material → split with the flag on.
- F5 (blocker) 9 lit marks in the tests → 7, from a constant.
- F6 (blocker) the colour gates' rects are not footprints; the cypress reaches x 380 and the striped house's
  windows y 685 → measured footprints and complement checks.
- F7 mean within the analytic bound; F8 climb on one mode; F9 distinct cache keys, vertex-only attribute;
  F10 pack by positions count, flag on only; F11 `villageGlow.ts` and a browser seam; F12 the stencil's rejected
  share; F13 lick thresholds from the quantiles, tip on the lobe's own range; F14 a floor on the factor;
  F15 no `uAlive`; F16 the self-check at t > 0; F17 one constants table through uniforms; F18 the displayed mean;
  F19 "up" named as a reading.
- Checked sound by the reviewer: the r184 chunk markers and their order; per-material custom uniforms through
  `onBeforeCompile`; the clock prop and the paused and stage cases; the isolation premise; the phase velocity;
  the solid's `h`; the marks' own triangles; the real row table loads under node for T14.
