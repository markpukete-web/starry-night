# Sky choice — reviewed plan (copied from scratch, 2026-10-11)

The working copy is `scratch/sky-choice-2026-10-11/plan-v2.md` (gitignored). This tracked copy is the
plan of record. Review trail: Codex `reviewer-plan-v1.md` REVISE (F1–F10), `reviewer-plan-v2.md` REVISE
(R1–R3, gate evidence only), `reviewer-plan-v3.md` **BUILD**; Gemini `worker-plan-v1.md` BLOCKED,
`worker-plan-v2.md` **READY**. All in `scratch/sky-choice-2026-10-11/`.

---


v1 → v2: Codex `reviewer-plan-v1.md` (REVISE, F1–F10, all P2) and Gemini `worker-plan-v1.md`
(BLOCKED, five items, all also in Codex's list, plus two commit-3 notes, now in commit 3).
Each finding was checked against the code. Disposition table at the end. Everything in v1 not
changed below still holds (goal, constraints, branch, base `c20d8b1`, commit order).

New measured fact since v1: the spike's moving sky fails the locked palette tolerance. Sky-band mean
ΔE76 is 10.57 (L 56.7 vs the painting's 46.7). The live sky reads 3.46. Method:
`scratch/sky-choice-2026-10-11/sky-colour.ts` (rects in the file). Bringing it under 10 is a tuning target.

## Commit 1 — `feat(sky): stroke-builder options for the moving sky`

`src/scene/streamlineGeometry.ts`. Same three options as v1, with these exact semantics:

- `maxTurnCos`: after the existing flip correction, `if (maxTurnCos !== undefined && dot(c, h) / (|c|·|h|) < maxTurnCos) break`. Position as in spike `905223d:185`.
- `minPoints` (default 3): the existing guard becomes `if (trail.length < minPoints) return`. It tests the REALISED trail length, never `points`.
- `colourPerRibbon`: every vertex of the ribbon takes `sampleColour(paintingData, trail[mid][0], trail[mid][1])` with `mid = Math.floor((m - 1) / 2)`. `trail` is composite space, as the per-vertex sample is today.

Tests in `scripts/streamline-geometry.test.ts`. A ribbon starts at a vertex with `len === 0 && across === 0`.
A centreline point is the mean of its vertex pair.

- New fixture `rampScene()`: 48×48 canvas, `uPad` 0.25 (composite 72 wide), colour r = 255·x/W,
  g = 255·y/H, b = 60 in the canvas and b = 220 in both side strips; flow angle = 0.9·u rad
  (varied direction); mask all 255; `openSkyBandV` 0.62; `trailMaxV` 0.7; count 60; points 16;
  stepSize 0.02; seed 123.
- T1 unset = explicit defaults (`maxTurnCos: undefined, minPoints: 3, colourPerRibbon: false`), on
  `holeScene()` and on `rampScene()`.
- T2 golden: sha256 of `JSON.stringify(build(rampScene()))` with no new option set equals
  `0da6971aa6bc79df2478ea450251d0ecf504b4ef990dc317bfd885f61fa95095`, computed from a clean
  `git archive c20d8b1` export with `node_modules` linked (45 ribbons, 1,262 vertices, one ribbon in a
  side strip). Fixture source `golden/ramp-scene.mjs`, script `golden/golden.mjs`, raw output
  `golden/golden.raw.txt`. The test's `rampScene()` is a byte-for-byte copy of `ramp-scene.mjs`.
- T3 `maxTurnCos`, property oracle on recovered centrelines:
  (a) 90° field (+x for u < 0.5, +y for u ≥ 0.5), option 0.5: every pair of consecutive segments in
  every ribbon has cos ≥ 0.5 − 1e-9, and at least one ribbon of ≥ 3 points starts at u < 0.45.
  (b) Same field without the option: at least one ribbon has a consecutive-segment cos < 0.5.
  (c) 30° field (+x, then 30° below the x axis for u ≥ 0.5), option 0.5: at least one ribbon keeps a
  turn with 0.5 < cos < 0.99 (a below-threshold turn is not cut).
  (d) Reversal field (+x, then −x for u ≥ 0.5), option 0.5: at least one ribbon crosses u = 0.5 at a
  point outside every `SWIRLS` 1.5·r zone and keeps ≥ 2 points past it (the flip correction runs
  before the cutoff).
- T4 `minPoints`, exact oracle: on `rampScene()` with `trailMaxV` 0.5 (truncates paths),
  `build({ minPoints: 8 })` equals `build({})` with every ribbon of realised length < 8 removed and
  indices renumbered. This holds because `addRibbon` draws its three rng values before the guard.
  Assert the unfiltered build has ribbons of length 7 and of length 8 (both sides of the boundary).
  Base measurement: lengths {5:1, 6:1, 7:3, 8:1, 10:2, 11:2, 12:1, 14:1, 15:1, 16:19}
  (`golden/t4-hist.mjs`). The fixture value 8 is independent of the production value 9.
- T5 `colourPerRibbon`, oracle from the default build: on `rampScene()` (`uPad` 0.25), positions
  and indices equal the default build, and each ribbon's every colour equals the default build's
  colour at that ribbon's mid pair. Assert at least one ribbon lies in a side strip (u < 0 or u > 1).

Revert proofs at the gate, one per test, each reinstating a named wrong behaviour:
T3 cutoff before the flip correction, and cutoff removed. T4 `points < minPoints`. T5 sampling
`pTrail[mid]` (painting space) in the composite image. Artefact format per the agent-workflow skill.

## Commit 2 — `feat(sky): moving-stroke sky mode`

`src/scene/PaintingFlowSky3D.tsx`:

- Props `sky: 'light' | 'moving'` (default `'light'`) and `still: boolean`. `wanted = still ? 'light' : sky`.
- One-way latch, lint-clean, set during render:
  `const [movingEver, setMovingEver] = useState(false); if (wanted === 'moving' && !movingEver) setMovingEver(true)`.
- Moving geometry: a second `useMemo` with the light memo's image deps plus `isFlowDebug` and
  `movingEver`. Returns `null` until `movingEver`. ONE count for every orientation (v1's portrait
  count is dropped, so a resize never invalidates it). Options: count ×8, width ×1.8,
  `maxTurnCos` 0.5, `minPoints` 9, `colourPerRibbon` true. The projection/attribute code shared with
  the light memo moves into a local function `toGeometry(ribbons)`; the light memo calls it with
  unchanged arguments.
- `mode = wanted === 'moving' && movingGeometry ? 'moving' : 'light'`. This single value selects the
  ribbon mesh's geometry and material together, the wash uniform and render order, and the gradient.
- Materials: the light ribbon material is unchanged, including its `paused` dependency. The moving
  material is a separate `useMemo` without `paused` in its deps; `uFreeze` is set by effect.
- Clock: the light material's `uTime += dt` line is unchanged. The moving material's `uTime` also
  advances every unpaused frame, and resets to 0 when `paused` turns true (the same visible result as
  the light material, which is rebuilt at 0 on pause). Pin: `window.__skyTime`, when
  `Number.isFinite`, sets both materials' `uTime`. Removing the pin resumes from the last value.
- Wash: the existing material gets `uMovingSky` (0 in light mode, so the light branch runs the same
  arithmetic). `renderOrder` is −1 (light) or 2.5 (moving).
- Gradient: `uTop`/`uBottom` are set from `PALETTE` constants on each mode change: light
  ×0.58/×0.68 (today's values), moving ×1.0/×0.85 (tuned in commit 4). Never multiplied in place.
- Disposal: each geometry and each material has its own cleanup effect keyed on its own identity.
- Dev only: `console.info` of the whole moving memo time in ms (composite, build, attributes, bounds).

`src/scene/DioramaExperience.tsx`: `sky` and `still` pass through `Scene`.

Tracked tool fix in the same commit: `scripts/check-reduced-motion.mjs:208` builds the URL with
`new URL(appUrl)` and `searchParams.set('mode', 'diorama')` / `set('clean', '1')`, and logs the final
search string (F1).

## Commit 3 — `feat(chrome): sky choice in the visitor dock`

As v1. `VisitorButton` props: visible text → `text` ("Sky: painted light" / "Sky: moving strokes"),
description → `label` ("Switch sky to moving strokes" / "Switch sky to painted light"). `App.tsx`
passes `onToggleSky` only when `mode === 'diorama'`, so the flat 2D route never shows the button
(Gemini 2.2). `useThree` is not needed in `PaintingFlowSky3D`: v2 has one count. Added: the choice is kept in App state when reduced motion hides the button, and comes back
when the system setting is cleared. Visitor pause is independent of the choice.

## Commit 4 — `feat(sky): tune the moving sky to the painting`

As v1, retune cap 4, plus the measured target: sky-band ΔE76 < 10 against the painting with the
`sky-colour.ts` method, and as close to the live sky's 3.46 as the look allows.

## Commit 5 — docs

As v1. Tunables wording: "sky ribbon budget" — requested ribbons, retained ribbons, triangles — not
"instanced strokes".

## Gate checks (raw output to `scratch/sky-choice-2026-10-11/gate/`)

1. `npm run lint`, `npm run test:sky`, `npm run build`. Revert proofs for T3–T5 as listed.
2. Default still unchanged (F8): two servers on two ports, base = a `main` worktree at `8f6e5ec` on
   5181, candidate = this branch on 5179. `lsof -a -p <pid> -d cwd` records each server's root.
   `capture.mjs` with `CAPTURE_PORT` set per run. AE 0 in all 11 views, exit statuses kept.
3. Default motion unchanged (F10): a base+hook worktree = `main` plus only the `__skyTime` pin lines
   (patch kept in `gate/`), port 5182. Pinned frames at t = 0.5, 3.7, 11.2, design and orbit views,
   AE 0 against the candidate in light mode. Repeat on the candidate after visiting moving and back.
4. Reduced motion (F1, F9): fixed `check:reduced` passes for default and for `?sky=moving`. Its
   normal-motion control frame differs from a light frame at the same pinned t (moving was selected).
   Same-page probe `gate/media-probe.mjs`: choose moving → emulate `reduce` → button disabled (was "gone" until review F8), two frames
   equal, equal to a fresh reduced light still. Repeat with visitor pause on. Clear `reduce` → moving
   returns and visitor pause is as it was.
5. `check:viewport`. `capture:diorama` into a new folder, `check:village <that folder>`: ΔE 8.16 ± 0.05.
6. Toggle and layout: full-page screenshots (`Page.captureScreenshot`, so the dock shows) at
   1600×900, 390×844 and 844×390, both labels. Pinned t: light → moving changes the sky, → light is
   AE 0 against the first frame.
7. Sky colour: `sky-colour.ts` on both skies, ΔE76 < 10, with the measured crops kept.
8. Frame rate: `perf.mjs` extended to print the WebGL renderer string, the server revision, canvas
   pixels, selected sky, frame count and p95, and to fail under 60 fps or under 200 frames.
   Phone ≥ 30 fps: Mark on the Vercel preview.
9. First-use cost: the dev memo time, and the longest frame around the first toggle from `__perf.t`.
10. Lifecycle (F7): 10 toggles, then a landscape → portrait → landscape resize, then unmount via
    `?mode=flat` navigation. `renderer.info.memory.geometries` stays flat across toggles and resize.
11. Clock tool (F2): `frames.mjs` copied to `scratch/sky-choice-2026-10-11/` with a self-check: the same
    nonzero t twice, with wall time between, gives identical pixels; a different t differs.
12. Visual: full frame, orbit, portrait, crops beside the painting, and a 4 s pinned motion video,
    each opened by the Lead.

## Disposition of review findings

| Finding | Disposition |
| --- | --- |
| F1 reduced-motion URL | Fixed: tracked script uses `URL` + `searchParams` (commit 2), gate 4 proves moving was selected. |
| F2 clock name | Fixed: keep `__skyTime`, finite check, tool self-check (gate 11). |
| F3 T3 oracle | Fixed: property oracle on centrelines, cases a–d. |
| F4 T4 requested points | Fixed: realised-length guard, exact subset oracle with both boundary lengths. |
| F5 T5 composite space | Fixed: `uPad` 0.25 ramp, oracle from the default build's mid colour, strip ribbon required. |
| F6 lint latch | Fixed: render-phase one-way latch; `mode` needs geometry, so no half-activated state. |
| F7 cache/resize/disposal | Simpler fix than proposed: one count, so resize never invalidates. Per-identity disposal, gate 10. |
| F8 server provenance | Fixed: two ports, two roots, cwd recorded. |
| F9 live media change | Fixed: same-page probe, gate 4. |
| F10 light motion proof | Fixed: base+hook worktree, pinned nonzero t, before and after visiting moving. |

## v3 amendments — Codex `reviewer-plan-v2.md` (REVISE: R1, R2, R3, all gate-evidence, design accepted)

- **R3 fixed (done):** `sky-colour.ts` now requires a 1600×900 capture, checks both rects fit, and
  rejects any non-finite mean or ΔE before the threshold. Codex's `reviewer/v2-invalid-capture.png`
  now exits 1. The live-sky frame still reads ΔE 3.46, exit 0.
- **R1 → gate 10 replaced.** A gate-only harness patch, kept as `gate/harness.patch` and applied in a
  separate worktree of the candidate, never committed: (1) each owned resource (light and moving ribbon
  geometry, light and moving ribbon material, wash geometry and material, gradient material) adds a
  `dispose` listener that pushes its name to `window.__disposed`, and its creation pushes to
  `window.__created`. (2) `Scene` reads `window.__unmountSky()` through a state setter, so the sky
  unmounts inside the live React tree. Probe: warm both modes, then 10 toggles and a landscape →
  portrait → landscape resize must add nothing to either log. Then `__unmountSky()` must dispose every
  owned resource by name. Mutation: remove the moving-material cleanup → the probe fails.
- **R2 → gate 3b added.** The same harness records per frame `{ dt, lightT, movingT, paused }` from the
  real `useFrame`, with the pin absent. Sequence: 2 s light → toggle to moving → 2 s → toggle to light →
  2 s → visitor pause → 1 s → unpause → 1 s. Assert on every unpaused frame that `lightT` and
  `movingT` each grow by exactly `dt` (±1e-6), in both modes. On pause both read 0 and resume from 0.
  Mutations: `uTime += 2 * dt` on either material, and advancing only the visible material → fail.
  The light `useFrame` lines are also compared to `main` in the diff read.

---



## Appendix — plan v1 sections v2 refers to ("as v1")


### v1 · Goal

Visitors choose the sky style. "Painted light" is today's sky and stays the default. "Moving strokes"
is the spike's sky, tuned to the painting. The default route must stay pixel-identical to production.

### v1 · Fixed constraints (CLAUDE.md, locked)

- Motion comes from the derived flow field. Colour comes from the scan (`palette.json` tolerance ΔE < 10).
- `prefers-reduced-motion` gives the painting, well lit, no churn. Under reduced motion the moving
  option is not offered and the sky is the painted-light still.
- 60 fps desktop. Orbit limits unchanged. No new dependency.

### v1 · Branch and base

`feat/sky-choice`, created from `docs/village-live-record` at `c20d8b1` (it carries unpushed
docs-only commits that must ride up with this code). `main` = production = `8f6e5ec`.
The spike branch is NOT merged. Its code is reworked into the commits below.

### v1 · Commit 3 — `feat(chrome): sky choice in the visitor dock`

- `src/App.tsx`: state `sky`, initial value `'moving'` when `?sky=moving`, else `'light'`. Pass
  `sky` and `still={reduced}` to `DioramaExperience`. `reduced={motionPaused}` stays as it is.
- `src/VisitorChrome.tsx`: optional props `sky?: 'light' | 'moving'` and `onToggleSky?: () => void`.
  The button renders only when `onToggleSky` is given (diorama route) and `reduced` is false.
  Icon `≋`. `active = sky === 'moving'`. Label "Sky: painted light" / "Sky: moving strokes",
  aria-label "Switch sky to moving strokes" / "Switch sky to painted light". First in the dock.
- `src/index.css`: no change expected. Four pills wrap on a 390 px phone by the existing rule
  (index.css line ~223). Check by capture.

### v1 · Commit 4 — `feat(sky): tune the moving sky to the painting`

Lead's visual passes, retune cap 4. Each pass: capture with `frames.mjs` at pinned t, crops beside
`public/reference/painting.jpg` (whorl, moon, stars, swirl band, left sky by the cypress), name what is
wrong, change one thing. Targets from the spike: no pebbles, whorl-eye holes no larger than the
painting's dark lines, varied stroke length and width, no V-kinks.

### v1 · Commit 5 — docs

CLAUDE.md Tunables: raise the instanced stroke budget for the moving sky to the measured figure, and
log it in `tasks/lessons.md`. New record `tasks/2026-10-11-sky-choice.md` (what shipped, evidence
paths, gate record). Handoff and `tasks/todo.md` pickup updated.

