# Make-it-alive A — plan, 2026-10-13

Slice A of "Direction — make it alive" (`tasks/todo.md`): breath and drama in the existing medium. Built in a
cloud session on `claude/confident-bohr-1y7p2u`, behind `?alive=1`, so the shipped default is untouched until
Mark's gate. Mark judges tempo and feel at his Mac from the Vercel preview; this session gates the mechanics.

## What A is, and what this pass builds

The spec names six things: tempo that varies over time (gusts through the luminous band, the great whorl surging
and easing, star halos breathing at different rates, the moon's glow pulsing); contrast (energy in the band, the
deep blue calmer); impasto under raking light at orbit; a flame-like flicker in the cypress; a glimmer in the
village windows. This pass builds the first two in both skies (A1) and the halos and moon (A2). It does not
build the cypress flicker or the window glimmer: both touch authored foreground materials (`MeshBasicMaterial`
with vertex colours; windows painted into the village atlas with no mask) and need their own derivation. They
go to a follow-up pass after Mark has seen A1+A2, recorded in `tasks/todo.md`. Impasto under orbit cannot be done
as specified: the sky is rotation-locked to the camera, so orbit never changes its view angle; noted for Mark.

## Design

### A1 — the tempo, in both ribbon shaders

Today both skies run on one clock, `uTime += dt`, at one speed. Nothing in the paths changes: the flow field,
the ribbons, the colours stay derived exactly as they are. A warps the clock each stroke reads:

    T(t) = t + uAlive · w · (G(t − lag) − G(−lag))
    G(s) = Σᵢ (Aᵢ / ωᵢ) · (1 − cos(ωᵢ s)),  ωᵢ = 2π / Pᵢ

- `G` is the integral of a zero-mean sum of three sines with incommensurate periods, so the tempo
  `dT/dt = 1 + w·Σ Aᵢ sin(ωᵢ(t − lag))` surges and eases without repeating, and the mean tempo over time is
  today's. Σ Aᵢ < 1 keeps `T` monotone, so the moving strokes never run backwards and no stroke slot pops.
- `w` is the ribbon's **gust weight**, derived from the painting, one constant per ribbon (a new attribute
  `aGust`, built in `ribbonsToArrays` from the ribbon's own vertices): `w = 0.15 + 0.85 · max(band, whorl)`.
  `band` = smoothstep over the luminance of the ribbon's mean colour (the pale luminous strokes carry the energy;
  the cobalt floor stays calm at 0.15). `whorl` = proximity of the ribbon's midpoint to the two great swirls
  (`SWIRLS[0]`, r 0.2, and `SWIRLS[1]`, r 0.12), so the whorl surges and eases as a body. Thresholds are set
  from a histogram on the real assets, not guessed; the weight map is rendered and looked at beside the painting.
- `lag` = the ribbon's midpoint `u` × `uGustTravel` seconds: a gust sweeps the canvas left to right, the way the
  great wave runs toward the whorl. `G(−lag)` is subtracted so `T(0) = 0` for every ribbon.
- `uAlive = 0` gives `T = t + 0`, bit-exact today's clock: the default route stays AE 0 by construction, and the
  gate still measures it.
- Contrast: a stroke's colour gains `1 + uAlive · uGustLift · w · tempoʹ`, where `tempoʹ` is the zero-mean sine sum
  normalised to ±1. Surges brighten the band a few percent, the floor barely. Measured against the palette gate.
- Constants live in `src/scene/skyAlive.ts` (periods, amplitudes, travel, lift), read by both materials' uniforms
  and by a node test, and logged in CLAUDE.md Tunables.

### A2 — halos and moon on the same clock

`SourceOrbs` reads the sky clock (a ref the parent's `useFrame` advances; pinned and paused alike). Each star
halo breathes: opacity `0.9·(1 + 0.14·sin(ωᵢ t + φᵢ))` and scale `(1 + 0.05·sin)`, with its own period between
4.5 and 9 s from a hash of its index, so no two breathe together. The moon halo pulses slower and lower:
`moonGlow·(1 + 0.08·sin(2π t / 13))`. The point light stays steady, so the village colour never moves. With the
flag off nothing is written.

### Plumbing

`?alive=1` → `App` → `DioramaExperience alive` → `PaintingFlowSky3D alive` → `uAlive` and the halo breath. No
dock button in this pass: Mark gates first.

## Commits

1. `feat(sky): gust weight per ribbon` — `ribbonsToArrays` groups vertices by ribbon (runs of equal `phase`,
   which is one random draw per ribbon) and packs `aGust`; `skyAlive.ts` holds the derivation and constants;
   `arraysToGeometry`/`ribbonBuffers` carry it. Tests T7–T9 (below). The default render is unchanged (the
   attribute is unread until commit 2 and gated by `uAlive` after).
2. `feat(sky): the gust clock in both skies behind ?alive=1` — shader chunk, uniforms, flag plumbing.
3. `feat(sky): halos breathe and the moon pulses` — A2.
4. `test(scripts): frame-sequence capture and frame compare` — `scripts/capture-sky-frames.mjs` (pins
   `window.__skyTime`, captures listed times at a viewport, any URL) and `scripts/compare-frames.mjs`
   (identical / mean abs diff / per-pixel diff image, via `scripts/lib/png.ts`). Tracked, so the gate is
   reproducible from any checkout.
5. `docs(tasks)` — record, lessons, Tunables.

## Tests (node, `test:sky`)

- T7 `aGust` is one value per ribbon: every vertex of a ribbon carries the same weight, and two ribbons with
  different mean luminance get different weights. Mutation: compute the weight per vertex → fails.
- T8 the weight derivation: a dark ribbon reads 0.15, a pale one 1.0, a dark ribbon through `SWIRLS[0]` reads
  1.0, and lag equals the midpoint `u` × travel. Mutation: drop the whorl term → fails.
- T9 the gust clock (TS twin of the GLSL): `G(0) = 0`; `T` monotone over 120 s at 240 Hz for `w = 1`; mean tempo
  over 120 s within 2% of 1; `Σ Aᵢ < 1`. Mutation: amplitudes summing to 1.2 → the monotone check fails.
- Existing 107 tests stay green, T2's golden hash untouched (the builder is not changed).

## Gate (this session; Mark's taste gate follows)

1. lint, `tsc -b`, `test:sky` green.
2. **Default route AE 0 vs `main`**: `capture:diorama` on `main` (worktree at `e80fdf7`, port 5180) and on the
   branch (5179), all 9 views byte-identical; pinned frames at t 0.5, 3.7, 11.2 on the default route and on
   `?sky=moving`, identical to `main`'s. `CAPTURE_SETTLE_MS=10000`, `CHROME_FLAGS=--no-sandbox`.
3. **The flag does something**: `?alive=1` frames identical to the default at t = 0 and different at every
   t > 0, both skies (positive control for 2).
4. `check:reduced` on `?alive=1` and `?alive=1&sky=moving`: PASS. `check:viewport`: PASS.
5. **Palette**: mean ΔE76 of the sky band, alive vs default at the same pinned t, over t = 0.5…12 s, both skies.
   Target: under 2 at every t (the lift is a few percent), and the default's own band ΔE against the painting
   (3.46 light, 6.96 moving, measured 2026-10-11 at Mark's Mac) is not re-derived here. If ImageMagick is absent,
   the painting-absolute check waits for the Mac.
6. **Motion review by eye**: 4 s at 15 fps of the whorl crop and of the luminous band, alive beside default, as
   strips; the question is whether the surge reads as the painting's own energy or as boil. The motion-map mean
   is reported but is not the gate (lessons, 2026-06-22).
7. Retune cap 4 on amplitudes, periods, travel and lift. Perf: unmeasurable here; the change is a few uniforms and
   about a dozen flops per fragment. Mark's Mac reads `?perf=1`.

## Risks

- A slow tempo (0.3×) in the band might read as a stall rather than easing. Sum of amplitudes is a tunable.
- A lag that varies with `u` makes neighbouring ribbons surge at slightly different moments: wanted (a gust
  travels), but at a sharp weight boundary it could read as a seam. The weight map review looks for that.
- The halo breath is CPU-side state; a StrictMode double mount must not double the writes (one ref, idempotent).
