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
- `w` is the ribbon's **gust weight**, derived from the painting, one constant per ribbon (a new `vec2` attribute
  `aGust` = [w, lag], built in `ribbonsToArrays` from the ribbon's own vertices, grouped by the (phase, rate) pair the
  builder draws once per ribbon): `w = 0.15 + 0.85 · max(band, whorl)`.
  `band` = smoothstep over the luminance of the ribbon's mean colour (the pale luminous strokes carry the energy;
  the cobalt floor stays calm at 0.15). `whorl` = proximity of the ribbon's midpoint to the two great swirls
  (`SWIRLS[0]`, r 0.2, and `SWIRLS[1]`, r 0.12), so the whorl surges and eases as a body. Thresholds were set
  from the real assets (the light sky's 3,145 ribbons: lum 5% 0.257 / 50% 0.416 / 95% 0.551; band 0.38–0.52 is
  about the 35th and 90th percentiles) and the weight map was looked at beside the painting: the whorls and the
  band right of the whorl carry the energy, the floor and the side strips stay calm.
- `lag` = the ribbon's midpoint `u` × `GUST.travel` seconds: a gust sweeps the canvas left to right, the way the
  great wave runs toward the whorl. That direction is a reading of the painting, not a derivation (review F13), and
  is a tunable. `G(−lag)` is subtracted so `T(0) = 0` for every ribbon.
- The warp is computed once per vertex (`vGustTime`, `flat` in the moving sky whose stroke slot floors it) and passed
  down, not per fragment: nine transcendentals per fragment of a full-viewport mesh would cost on a phone (F3).
- `uAlive` is 0 or 1, never a strength. At 0 `T = t + 0·x`, expected exact at the IEEE level; the gate's AE 0
  captures are the proof, on SwiftShader here and on Mark's Mac before his gate (F5).
- The light sky's shimmer term runs at 3× the flow's rate and is the knob that tips into boil (lessons 2026-06-22);
  a full surge would run it at 5.1×. The flow term takes the whole warp, the shimmer `GUST.shimmerShare` (0.5) of
  it, decided at the first capture (F6).
- Contrast: a stroke's colour gains `1 + uAlive · lift · w · pulse(t)`, where `pulse` is the zero-mean sine sum
  normalised to ±1 with no lag, so it is 0 at t = 0 for every ribbon (F1). In `ribbonFrag` it multiplies after the
  clamp and the source-lum lift; in `movingFrag` after the final 0.93 line (F14). Measured against the palette gate.
- Constants live in `src/scene/skyAlive.ts` (periods, amplitudes, travel, lift, shimmer share, floor, band
  thresholds, halo periods), read by both materials' uniforms and by the node tests, and logged in CLAUDE.md
  Tunables.

### A2 — halos and moon on the same clock

`SourceOrbs` reads the sky clock through a ref the parent's `useFrame` writes: the pinned or advanced time, and 0
while `paused` (the parent returns before the pin while paused, and resets the light material to t = 0 on a pause,
so the halos' still must be the t = 0 state too, F2). Each star halo breathes: opacity `base·(1 + 0.14·sin(ωᵢ t))`
and scale `(1 + 0.05·sin(ωᵢ t))`, with its own period between 4.5 and 9 s from a hash of its index, no phase
offset (0 at t = 0, F1), so the stars desynchronise within seconds. The moon halo pulses slower and lower:
`moonGlow·(1 + 0.08·sin(2π t / 13))`. The point light stays steady, so the village colour never moves. The writer
multiplies the base the JSX sets (0.9, or 0.72 in the flow debug view; `moonGlow` is a prop) by `1 + amp·sin`, with
amp 0 when the flag is off or the sky is paused, so the write is idempotent and the still equals today's. The
child's `useFrame` subscribes before the parent's and reads the previous frame's clock; harmless, and a positive
priority would switch R3F to manual rendering, so it stays (F9).

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
   `window.__skyTime`, captures listed times at a viewport, takes the full URL so no query is appended to one
   that already has a query, self-checks that two reads at one pinned time are identical) and
   `scripts/compare-frames.mjs` (identical / mean abs diff / per-pixel diff image, via `scripts/lib/png.ts`;
   rejects size mismatches and non-finite values). Tracked, so the gate is reproducible from any checkout.
5. `docs(tasks)` — record, lessons, Tunables.

## Tests (node, `test:sky`)

- T7 `aGust` is one value per ribbon: every vertex of a ribbon carries the same weight, and two ribbons with
  different mean luminance get different weights. Mutation: compute the weight per vertex → fails.
- T8 the weight derivation: a dark ribbon reads 0.15, a pale one 1.0, a dark ribbon through `SWIRLS[0]` reads
  1.0, and lag equals the midpoint `u` × travel. Mutation: drop the whorl term → fails.
- T9 the gust clock (TS twin of the GLSL): `G(0) = 0`; `T` monotone over 120 s at 240 Hz for `w = 1`; mean tempo
  over 120 s within 2% of 1; `Σ Aᵢ < 1`. Mutation: amplitudes summing to 1.2 → the monotone check fails.
- T10 the packer: `aGust` is a vec2 attribute of one pair per vertex equal to `ribbonGusts`, and `ribbonBuffers`
  lists every typed array (a buffer left out is copied silently, never an error, F8).
- T9 asserts the mean tempo against the analytic finite-window bound `w·Σ(AᵢPᵢ)/(πT)`, not a round 2% (F11).
- Existing 107 tests stay green, T2's golden hash untouched (the builder is not changed).

## Gate (this session; Mark's taste gate follows)

1. lint, `tsc -b`, `test:sky` green.
2. **Default route AE 0 vs `main`**: `capture:diorama` on `main` (worktree at `e80fdf7`, port 5180) and on the
   branch (5179), all 9 views byte-identical; pinned frames at t 0.5, 3.7, 11.2 on the default route and on
   `?sky=moving`, identical to `main`'s. `CAPTURE_SETTLE_MS=10000`, `CHROME_FLAGS=--no-sandbox`.
3. **The flag does something**: `?alive=1` frames byte-identical to the default at t = 0 (every A term is 0
   there by design: `T(0) = 0`, `pulse(0) = 0`, `sin 0`) and different at every t > 0, both skies (positive
   control for 2).
4. `check:reduced` on `?alive=1` and `?alive=1&sky=moving`: PASS. `check:viewport`: PASS.
5. **Palette**: ΔE76 between the sky band's MEAN Lab (not per pixel: on the moving sky a stroke displaced by the
   warp over a navy gap reads ΔE 20 with no colour change, F4) for alive vs default at the same pinned t, at
   t = 0.5, 3.7, 11.2 and at the pulse's peak, both skies, under 1.5. And the painting-absolute band ΔE76 (the
   capture's band mean Lab against the painting's sky region mean Lab, rect named in the record) at the worst
   case t for both skies, under the locked 10; the moving sky already sits at 6.96 by the 2026-10-11 method, so
   this is the number to watch. PIL and numpy are in the container; the crop rects are recorded so the Mac can
   repeat them.
6. **Motion review by eye**: 4 s at 15 fps of the whorl crop and of the luminous band, alive beside default, as
   strips; the question is whether the surge reads as the painting's own energy or as boil. The motion-map mean
   is reported but is not the gate (lessons, 2026-06-22).
7. Retune cap 4 on amplitudes, periods, travel, lift and shimmer share. Perf: unmeasurable here; the warp is nine
   transcendentals per VERTEX and two multiplies per fragment. Before Mark's taste gate, at his Mac: the default
   route and `?sky=moving` AE 0 against `main` at pinned t (the cloud proves it on SwiftShader only, F5), and
   `?perf=1` on both skies with the flag on.

## Risks

- A slow tempo (0.3×) in the band might read as a stall rather than easing. Sum of amplitudes is a tunable.
- A lag that varies with `u` makes neighbouring ribbons surge at slightly different moments: wanted (a gust
  travels), but at a sharp weight boundary it could read as a seam. The weight map review looks for that.
- The halo breath is CPU-side state; a StrictMode double mount must not double the writes (one ref, idempotent).
- Gate 2's nine-view byte identity rides on a free-running clock (`capture:diorama` does not pin). The pinned
  frames are the real default-preservation proof; a nine-view mismatch with recurring byte sizes is two states,
  not noise (lessons 2026-10-13), and is read as such before it is called a regression (F12).

## Review

Plan v1 reviewed by a fresh agent (general-purpose, 2026-10-13): REVISE on F1–F6, nine notes. All applied above;
the substance of each is in the lines marked (F*).
