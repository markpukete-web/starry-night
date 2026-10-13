# Make-it-alive A, second pass — plan, 2026-10-13

The two foreground items of slice A (`tasks/todo.md`, "Direction — make it alive"): a flame-like flicker in the
cypress and a glimmer in the village windows. Built in a cloud session on `claude/confident-bohr-1y7p2u` from
`main` at `246e817` (PR #8 merged, A's sky behind `?alive=1` with Mark's tuner and chosen defaults). Behind the same
flag, so the shipped default stays untouched until Mark's gate; two more sliders on the tuner so he dials these
the way he dialled the sky.

Impasto under raking light at orbit is NOT in this pass: the sky is rotation-locked to the camera, so orbit never
changes its view angle (the first plan's note stands; Mark's call whether a light that moves with the orbit angle
is wanted instead).

## What is there today

- **Cypress** (`src/scene/BrushCypress.tsx`): one closed underpaint solid (painting.jpg mapped by `uv`, a colour
  lift) and one ribbon mesh of 48 structural strokes on the front and about 9 on the back over the lobes, each stroke
  a `pushBrushRibbon` with ONE source pigment (the centre texel) × `relief` × `SOURCE_STROKE_LIFT` × a moon-shade
  term per vertex, as vertex colours. Both are `MeshBasicMaterial` (`vertexColors`, `toneMapped: false`,
  `DoubleSide`). The stroke generator (`cypressLobeStrokes.ts`) knows each stroke's lobe, its height range
  (`heightFraction` 0 at the base, 1 at the tip, per sample) and its `lateral` −1..1 across the lobe.
- **Village windows** (`src/scene/villageGeometry.ts`): `opening(paint, face, …, lit)` draws the dark opening
  polygon, and when `lit` one `mark()` of `OCHRE × 1.25` (the palette's `windowOchre`, #656b27) into the `paint`
  mesh: 10 vertices, 8 triangles per lit window. Six buildings carry windows (two openings each; the first always
  lit, the second only on the striped-roof house), so 7 lit marks, 70 vertices. `Village.tsx` draws `paint` with a vertex-colour
  `MeshBasicMaterial`. No mask, no texture: the lit marks are plain vertex-coloured triangles, so they can be told
  apart by vertex range at build time.
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
has, harmless live and invisible at a pinned time after the first frame. `?debug=stage` (no sky) leaves the clock
at 0: the foreground stands still, which is what a stage view is for.

### A4 — the cypress flicker

A flame flickers at its tongues and tips, not in its trunk: brightness runs up the strokes, the outer licks and
the top carry it, the dark core barely moves. On this cypress the strokes ARE the flame (each follows a lobe's
derived height axis), so the flicker is a per-stroke brightness factor on the stroke ribbons:

    L(t) = 1 + uAlive · flicker · depth · w · F(h, t)
    F(h, t) = Σᵢ Aᵢ · [ sin(ωᵢ t − kᵢ h) − sin(−kᵢ h) · e^(−t/τ) ]

  `depth` 0.6: at the knob's maximum a full-weight vertex swings ±60%, so no stroke blacks out or doubles. The
  second term is the first's t = 0 value, subtracted with a decay, written in the shader as the same `sin` of the
  same float so the difference is exactly 0 at t = 0 (the sky's `G(t − lag) − G(−lag)` trick), not a `sin(−x)` and
  `sin(x)` that an implementation may round apart.

- `h` is the vertex's `heightFraction` (0 base, 1 tip) and `lick` the stroke's tongue weight; both are packed as
  one `vec2` attribute `aFlicker` = [lick, h] per vertex, built beside the colours in `BrushCypress` from the
  strokes the generator already produces (no new derivation of the tree: the lobes, the heights and the lateral
  positions are the derived ones).
- **The weight is derived from the painting's cypress, not hand-placed.** `w = floor + (1 − floor) · max(tip, lick)`,
  combined per VERTEX in the shader: `tip = smoothstep(0.55, 0.9, h)` from the vertex's own height (the strokes are
  long, 0.42 of the tree, so a per-stroke height would light whole strokes; a flame brightens towards its tip
  along each lick), `lick = smoothstep(0.45, 0.85, |lateral|)` from the stroke's mean lateral position (the outer
  tongues), floor 0.12 so the core still breathes. Back strokes take half the lick weight (the far side; a
  flame's near tongues read first). Measured on the shipped row table (session probe, 2026-10-13): 48 front and
  9 back strokes on three lobes (main 0–1, fronds to 0.54 and 0.35), 4,902 stroke vertices; stroke `|lateral|`
  quantiles 25% 0.21 / 50% 0.43 / 75% 0.58 / 95% 0.83, so the lick term reaches about half the strokes and is
  strong on the outer quarter; per-vertex `h` spans 0–1 on the main lobe, so the tip term lights its upper third
  and never a frond. The weight map over the tree is looked at before the build (the sky's lesson: "set thresholds
  from the real field's quantiles, and look at the map").
- **The spatial pattern travels up.** Two modes, periods 1.9 s and 3.1 s (a flame's lick is seconds, not the sky's
  tens of seconds; incommensurate so it never repeats), amplitudes 0.6 / 0.4 of the knob, wave numbers `k` = 2π·1.3
  and 2π·0.8 cycles over the tree's height so a bright lick is a few tenths of the tree tall and climbs at
  k/ω = 0.40 tree heights per second for both modes (about 2.5 s per tree height). The decaying term (τ 1.5 s)
  makes `F(h, 0) = 0` for every vertex, so the t = 0 frame and the paused still are today's exactly, and after a
  few τ the pattern is the pure travelling wave with zero time-mean, so the tree's average brightness is today's
  (the sky's rule: warp the look's timing, never its mean). Checked numerically (session scratch
  `flicker-maths.mjs`): F(h, 0) = 0 at h 0 / 0.37 / 0.5 / 1; the mean over 60 s after 5τ is within 0.01 of 0 at
  every h; the range is ±1.00 after the transient and at most 1.16 during it, so the factor at the knob's maximum
  stays inside [0.30, 1.70]; the argmax over h climbs 0.04 per 0.1 s, as predicted.
- **The underpaint solid takes the same factor at half strength**, keyed on its own height: `buildCypressLobeSolid`
  returns a source uv per vertex (`sourceUvs`, 0–1 in the crop, y down), so `h = 1 − sourceUv.y` is known at
  build time and the solid gets `aFlicker` = [0.5 · lick(0) = 0, h]: the tip term alone, at half the knob
  through a per-material uniform. Strokes blinking over a still body would read as a decal; the body following faintly
  keeps the flame one thing.
- **The materials stay `MeshBasicMaterial`.** With the flag on, `onBeforeCompile` adds the uniforms (`uTime`,
  `uAlive`, `uFlicker`, the mode constants) and the `aFlicker` attribute and multiplies `diffuseColor.rgb` by
  `L` right after three's `<color_fragment>` (the vertex colour multiply), with `customProgramCacheKey` naming
  the variant. Flag off: the untouched material, three's own program, byte-for-byte today's path, the way the
  sky's `ALIVE` define leaves main's shaders alone. The lift is computed in the vertex shader and passed as a
  varying (two sines per vertex, no per-fragment transcendentals; the cypress covers about 6% of the design frame).
  Plain, not `flat`: `h` varies smoothly along a stroke and the lift is meant to interpolate along it. The injection replaces exact chunk markers (`#include <common>`, `#include <color_fragment>`,
  `#include <color_vertex>`) that three has carried for years; the build asserts each marker was found (a throw
  in dev, a console warning and no injection in prod) so a three upgrade cannot silently drop the effect.
- **Colour.** `L` scales the stroke's pigment, hue unchanged; at the knob's maximum (1.0, weight 1, both modes
  peaking) a tongue reaches 1.6× for an instant and the mean stays 1. The cypress colour gate
  (`scripts/check-cypress-colour.ts`, regional Lab ΔE76 against the source crop, limit 10) runs on a capture at
  the flicker's peak as well as at t = 0.

### A5 — the window glimmer

A lamp behind a window glimmers: a small irregular rise and fall, each window its own, never in step. The marks
are already the warm paint the painting has (`windowOchre` × 1.25); the glimmer scales them:

    L(t) = 1 + uAlive · glimmer · depth · Σᵢ aᵢ · sin(ωᵢ(n) t),   i = 1..2,  depth 0.6

- `aGlow` = [weight, n] per vertex on the village `paint` geometry: weight 1 on the 90 vertices of the nine lit
  marks, 0 everywhere else (edges, openings, door), `n` the lit mark's index. `villageGeometry.ts` records each
  lit mark's vertex range as `opening()` draws it (`paint.positions.length / 3` before and after the `mark`), and
  `geometry()` packs the attribute; `buildVillage` returns the count in `userData` so a test and the capture
  self-check can read it.
- Two modes per window with periods hashed from `n` (the halos' `haloPeriod` pattern): 2.3–4.1 s and 0.9–1.6 s,
  amplitudes 0.7 / 0.3 of the knob. `sin` only, so 0 at t = 0 and zero time-mean. At the knob's maximum (1.0) a
  window swings ±60% of its paint for an instant, mean unchanged; at Mark's likely range (0.3–0.6) it is a lamp
  breathing.
- Same `onBeforeCompile` injection on `Village.tsx`'s vertex-colour `paint` material, flag on only; the `skin`,
  `solid` and `foliage` materials are untouched. The dark opening polygons have weight 0 and do not move.
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
2. `feat(cypress): a flame-like flicker up the strokes behind ?alive=1` — `cypressFlicker.ts` (weights, the TS twin
   of F, the GLSL, the injection), `aFlicker` in `BrushCypress`, the knob.
3. `feat(village): the lit windows glimmer behind ?alive=1` — `villageGlow.ts` (the ranges, periods, GLSL),
   `aGlow` in `villageGeometry`, the knob.
4. `feat(tuner): flicker and glimmer sliders, shipped defaults` — tuner, JSON, allowlist, App.
5. `test(alive): the flicker and glimmer derivations, with mutation proofs` — T14–T18.
6. `docs(tasks): second-pass record, lessons, Tunables`.

## Tests (node, `test:sky`)

- **T14 flicker weight:** tip strokes and outer licks weigh more than core strokes; the floor holds; back strokes
  take half. Fixture strokes straddle both thresholds (the T7 lesson). Mutation proof: dropping the `lick` term
  turns it red.
- **T15 flicker time function:** `F(h, 0) = 0` exactly for h in {0, 0.37, 0.5, 1}; the time-mean of `L` over 60 s
  after 5τ is 1 within 0.01 at every h; at `flicker` 1 and weight 1 the factor stays in [0.3, 1.7]; the pattern
  climbs (the argmax over h advances 0.40 tree heights per second, within 10%). Mutation proof: dropping the
  decaying term makes F(h, 0) ≠ 0.
- **T16 glow attribute:** `buildVillage` packs `aGlow` with exactly 9 × 10 vertices of weight 1 whose colours are
  the ochre mark's and 0 elsewhere; indices n are 0..8 each on 10 vertices. (`villageGeometry` imports the atlas
  JSON; if node's type stripping refuses the bare JSON import the test moves to the browser self-check in the
  capture script and a pure `villageGlow` range test replaces it: the record says which.)
- **T17 glimmer periods:** every window's two periods inside their ranges, no two windows sharing a period, the
  factor 0 at t = 0 and mean 1 over 60 s within 0.01.
- **T18 knobs:** the two new knobs default, clamp and read like the four (extends T12); `gustUniformValues` unchanged
  by them.
- **Injection guard:** a unit test feeds the injector a shader string missing a marker and asserts it throws in dev.

## Gate (this session; Mark's taste gate follows)

Dev server 5179 on the branch, a `main` worktree at `246e817` on 5180, `CHROME_FLAGS=--no-sandbox`,
`CAPTURE_SETTLE_MS` 12,000–16,000, 1600×900 unless said.

1. lint, `tsc -b`, `test:sky`, build: green.
2. **Default vs `main`** at pinned t 0 / 0.5 / 3.7 / 11.2, light and moving: byte-identical (the off path is
   three's own programs and today's geometry; the clock prop changes no bytes).
3. **`?alive=1` at t = 0 vs default:** byte-identical (every new term is 0 at t = 0; the sky's part already is).
4. **Isolation.** `?alive=1&gust=0&lift=0&shimmer=0&breath=0&flicker=1&glimmer=0` vs default at t 1.0 / 2.3 / 7.1:
   every differing pixel inside the cypress bounds (x 400–548, y 96–670 of the design capture) plus a 6 px margin;
   the sky and village crops byte-identical. Then `…&flicker=0&glimmer=1`: every differing pixel inside the
   village band (x 580–1080, y 600–670) and none in the cypress. Then both at 1 with the sky knobs at Mark's
   defaults: the tree and the windows move with the sky, nothing else.
5. **Colour.** `check-cypress-colour` on t = 0 and on the flicker's peak frame (the TS twin finds t of max
   over h): base/middle/top ΔE76 under 10, and under the t = 0 values + 3. `check:village` on t = 0 and at the
   glimmer's peak: under 10.
6. **Motion by eye.** 4 s at 10 fps, cypress crop at 1:1 and the striped-roof house crop at 2×: the licks climb,
   no stroke edge crawls, no pop between consecutive frames; the windows breathe each at its own rate, the
   openings stand still. Named faults → retune (cap 4 passes).
7. `check:reduced` on `?alive=1` and `?alive=1&sky=moving` (the paused still is t = 0 and so today's);
   `check:viewport` PASS.
8. Frame rate: not judgeable headless; the injection adds two sines per vertex on about 7,100 cypress vertices
   (4,902 stroke, 2,210 solid) and a few hundred village paint vertices, and nothing per fragment. `?perf=1` with everything on stays owed at the Mac with the
   first pass's.
9. Phone (390×844) stills at t 0 and 2.3 with both knobs at 1: the tree and the windows read; the tuner's two
   extra sliders fit under the dock (the panel scrolls at ≤640 px).

## Risks

- **A flicker that reads as noise.** The bar forbids generic noise; the pattern here is a travelling wave on the
  derived strokes with derived weights, two modes, not hashed per-vertex jitter. If by eye it still reads as
  "twinkling", the retune lowers the fast mode first.
- **Boil on the tree.** Two sines per vertex with a smooth `h` cannot crawl within a stroke (every vertex of a
  stroke shares `w`; `h` varies smoothly along it), but the solid under the strokes has its own `h` from `uv`;
  a mismatch between the two height scales would show as the body and the strokes breathing out of step. The
  build checks both map the same `heightFraction`.
- **`onBeforeCompile` and three's chunk names.** r184 carries `color_fragment` and `color_vertex`; the markers are
  asserted, so a silent miss cannot ship.
- **The clock prop changes `PaintingFlowSky3D`'s surface.** The internal ref stays the fallback; gate 2 proves no
  byte moved.
- **Transient term.** `e^(−t/τ)` is not periodic, so a frame at a pinned t is still deterministic (it is a pure
  function of t) and captures stay frame-exact.

## Review

A fresh agent reviews this plan with the shaders, `BrushCypress.tsx`, `villageGeometry.ts` and the sky's
`skyAlive.ts` open, before the build, as the first pass did (six fixes came from that review). Findings are
applied here and in `tasks/2026-10-13-alive-a2.md` (the record).
