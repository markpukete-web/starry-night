# E4 — the cypress's paint: dry, broken, ridged. Plan, 2026-10-22

Mark, 2026-10-22, on the before-and-now comparison of the tree (`scratch/cypress-e3-2026-10-22/tree-before-after-body-2x.png`):
"Can you refine our tree?", and on what reads wrong at 2×: "It feel like a jelly." Confirmed as the still look (the
surface smooth and glossy, like something set in a mould), not the flicker or the bend. A throwaway spike put three
treatments beside E3 and the painting (`scratch/cypress-paint-spike-2026-10-22/`, the patch `spike.patch`). Mark
picked treatment 3: "3". Then: "I want to test if Gemini 4 Argon is capable of doing visual work. Can you task it
and gated yourself?"

So the roles for this slice are an experiment. The worker (Antigravity, Gemini 4 Argon, pane `w4:p5`) builds the
slice and runs the visual loop: capture, look, name what is wrong against the painting, retune, re-capture. The
Lead (Claude, `w4:p1`) writes this plan and the briefs, and gates on the primary evidence: the suite re-run, every
capture opened and read against the painting, the record. The reviewer (Codex, `w4:p4`) reads this plan and
reviews the code. Mark's rule that visual work goes to Opus or Fable only (agent-workflow, 2026-10-08) is set
aside for this slice on his word, to measure the worker.

## What the spike showed (2026-10-22, the home view at 1600 × 900, t = 5, `?paint=0|1|2|3`)

The body at 2× (`paint-spike-body-2x.png`) and the whole tree at 1:1 (`paint-spike.png`), beside the painting:

- **The gloss alone is not the jelly.** Treatment 1 removed the wet sheen, the rounded tube shading and the darkened
  rim. The body was flatter and still smooth. The jelly is mostly the clean edges and the soft gradients.
- **Dry edges removed most of it.** Treatment 2 kept 1, frayed every flank at the pixel scale (a 40-cycle wobble
  along the stroke at ±8% of the half-width), let the outer bristles skip (the outer 30% of each flank discarded
  where the lane noise is under 0.3), hardened the lanes to two tones with a slow drift of the threshold along
  the stroke (the brush loading and unloading), and ran the paint out over the last 45% of each stroke instead of
  the last quarter.
- **Ridges brought it closest.** Treatment 3 kept 2 and lit each bristle lane from the sky's upper-left light with
  a lit side and a shadow side (the lane slope's weight 0.5 against E3's 0.12, the across-stroke term 0.15 against
  1.0, the rake 0.8 against 0.5), and halved the colour smoothing along the stroke (±1 sample against ±3). At 2× it
  is the nearest to the painting's streaked body. At 1:1 it reads a shade darker than E3, from the shadow sides.
- **None of the three turned to fur at 1:1.** The lane frequency stayed at 5 cycles across (E1's fur came from an
  11-cycle octave on 4–20 px ribbons).
- The control path was unchanged: `test:sky` 183 pass with the spike applied (the land's hash-pinned text held).

The expected first retune: the darkness. The colour gate's ΔE per third says how much. The fix is a lighter lit
side, not a weaker shadow.

## Design

### E4.1 — the paint through the factory (`cypressStrokeShader.ts`)

`StrokeBody` gains the treatment's fields. Each default reproduces E1's text byte for byte, so the land's four fields
keep C4's hashes (the fragment body `48240ba5268eba4d` among them. The hashes are not repinned). Where E1's text is
an expression, the field selects the expression, and a number replaces it (Codex F1). Where a field is off, its
text is omitted entirely, not emitted as a neutral term. The fields, their defaults and the cypress's pass-1 values:

| field | default (the land, E1's text) | the cypress, pass 1 | what it does |
|---|---|---|---|
| `tube: 'rounded' \| number` | `'rounded'`: `(0.86 + 0.12 * (1.0 - y * y))` verbatim | `0.95` | the rounded shading across the stroke, off |
| `rim: 'shaded' \| number` | `'shaded'`: `mix(0.8, 1.0, 1.0 - smoothstep(0.6, 0.95, y))` verbatim | `1.0` | the darkened edge, off |
| `sheen: number` | `0.06`, the line verbatim with its whitespace | `0`: the line omitted | the wet highlight |
| `laneCycles: number` | `4.5` | `5.0` | bristle lanes across the stroke |
| `laneEdge` (exists) | `null` | `[0.42, 0.58]` (E3 `[0.3, 0.7]`. the spike's interval, Codex F2) | the two-tone threshold |
| `loadDrift: number` | `0`: no `load` declaration | `0.15` | the threshold's endpoints shift by `loadDrift * load`, `load` a slow noise along the stroke − 0.5 |
| `fray: number` | `0`: no factor | `0.16` | the flank radius × `(1 − fray + fray × noise at 40 cycles along)` |
| `gaps: { band, below } \| null` | `null`: no discard | `{ band: 0.7, below: 0.3 }` | discard where `y > band * r` (the shaped radius, Codex F4) and `streak < below` |
| `dryFrom: number` | `0.75` | `0.55` | where the paint starts to run out along the stroke |
| `ridgeSide: number` | `1`: emits `side` verbatim | `0.15` | the lit term's across-stroke weight |
| `ridgeSlope: number` | `0.12` | `0.5` | the lit term's lane-slope weight |
| `rake` (exists) | `0.35` | `0.8` | the raking light's strength |
| `rakeClamp: [lo, hi] \| null` | `null`: no clamp | `[0.4, 1.6]` | the rake factor clamped, so a shadow side never goes black (Codex F6) |

The spike's GLSL is in `spike.patch`, with two corrections: the gap band is measured on the shaped radius `r` (the
spike measured it on the strip's half-width, where the alpha test had already rejected most of the band), and the
rake factor is clamped. The builder may name the fields differently, but each is one field, documented, and each
mutation in C5 (below) isolates it. The `?paint=` URL switch of the spike is not built. The land's body
(`strokeGlsl`) is `strokeGlslWith()` as today.

What a gap shows (Codex F3): the ribbon mesh is opaque and writes depth over the closed solid underpaint
(`#151c1b`). A discarded fragment shows the nearer surviving ribbon behind it, or the solid. Sky shows only at the
outline, where no ribbon or solid covers the ray. A hole on a back face cannot punch through a front face. The
expected read of the body crop is dark seams and overlapping paint, not a perforated tree.

### E4.2 — the colour along the stroke, sharper (`cypressStrokes.ts`), in its own pass

The cypress's colour smoothing goes from ±3 samples to ±1 (`CYPRESS_RIBBON_CONFIG.colourSmoothing`). The land's
tracers set `perSampleColours: false` and never read the smoothing. Codex's re-run of the production sampler (F5):
at seed `0xc1f3a11`, ±1 gives spread 17.6 and light 10.3% against ±3's 16.3 and 9.3%, before draping and shading.
It cannot say whether the cut-out returns at 1:1, so the change is isolated: pass 1 is E4.1 alone at ±3, pass 2
adds ±1 with the same treatment and time, and the cut-out read of the pair decides. ±1 stays only if the read
supports it.

### E4.3 — the tests, red first (`scripts/cypress-colours.test.ts`)

- **C4** keeps its four E1 hashes unchanged. Its last assertion (the cypress's constants change only the lane, the
  rake and the coarse lane) is replaced by C5's per-field checks.
- **C5** the factory, per field: for each new field, `strokeGlslWith({ ...STROKE_BODY_DEFAULTS, <field>: <on> })`
  differs from the defaults' text, and turning that one field back to its default restores the hash. The cypress's
  body (`strokeGlslWith(CYPRESS_STROKE_BODY)`) contains the fray factor, the gap discard, the ridge weights, the
  drift and the clamp, and does not contain the sheen line. The composed shader (three's basic shader with the
  injection applied, as `sky-alive.test.ts` does under node) contains the same. A source read of `BrushCypress.tsx`
  finds `strokeGlslWith(CYPRESS_STROKE_BODY)` installed on the stroke material (Codex F9). Red before E4.1.
- **C6** through `traceCypressRibbons` on a fixture whose ±1 and ±3 outputs differ (a two-band image under a
  straight field), using the config's `colourSmoothing`, so a tracer that hardcodes 3 fails. The land's two configs
  (`landStrokes.ts`, `landDomes.ts`) keep `perSampleColours: false`, and a land trace returns no per-sample colours.
  Red before E4.2.
- The mutants the Lead runs at the gate (G11), one at a time, each restored before the next: the sheen line
  restored in the cypress's body. each of fray, gaps, drift, ridges and the clamp disabled alone. the lane interval
  reverted to `[0.3, 0.7]`. the installed injection switched to the defaults. the config's smoothing restored to 3.
  the tracer forced to 3 despite the config. the land's per-sample path enabled. Each must turn its check red.

### E4.4 — the visual loop (the worker, 4 passes in all)

Pass 1 is E4.1 at ±3. Pass 2 is E4.2 (±1) on pass 1's constants. Passes 3 and 4 are the retunes. Each pass:
build, capture, cut the crops, put them beside the painting and E3, look, write the read, run the gates.

**The frames.** Two captures per pass against the worktree's server:

```
node scripts/capture-sky-frames.mjs <pass>/frames --url 'http://127.0.0.1:5181/?mode=diorama&clean=1&arrival=0' --times 5 --prefix pass
DIORAMA_CAPTURE_URL=http://127.0.0.1:5181/ DIORAMA_CAPTURE_EXTRA='arrival=0' node scripts/capture-diorama.mjs <pass>/views
```

The first gives `pass-t5.png` (1600 × 900, the clock pinned at 5). The second gives `desktop-centre.png` (1600 × 900,
the design camera, the clock free) and the other views. The colour, silhouette and contrast gates and the
registered pair run on `desktop-centre.png`, as E3's did (Codex F12, F13).

**The context montage** (the spike's method, for the eye, not for statistics): from `pass-t5.png`, the tree column
`420x900+200+0` and the body `200x280+150+400` at 2×, beside the same crops of E3's `p5/p5-t5.png` and the
painting's panels from `paint-spike-body-2x.png`. The painting's panel there is at about 1.6× the render's scale
(Codex F10). It stays as context only.

**The registered pair** (Codex F10): a small gate tool, `scripts/cypress-registered-pair.ts <desktop-centre.png>
<outPrefix>`, built in step 1 with the tests. It reuses `scripts/lib/silhouette.ts` exactly as `cypress-silhouette.ts`
does (the painting's mask from the row table's crop of `reference/derived/cypress-work-1600.png`, the render's mask
from the gate's box `330 80 220 578`, `alignRender` for the scale and the shift). It cuts one body window from each
image in that image's own pixels: the rows from 34% to 60% of the tree's extent from its top, the columns the central
80% of the trunk run (`trunkRun`) at the band's middle row. It writes `<outPrefix>-painting.png`,
`<outPrefix>-render.png` (the render's window resized to the painting window's height, nearest neighbour) and
`<outPrefix>-pair-3x.png` (both at 3×, side by side), and prints the two windows' frame coordinates. The Lead
validated the band by hand on E3's view tonight (`scratch/cypress-e4-2026-10-22/reg-pair-e3-3x.png`): a fixed
rectangle put the render's window half on sky, so the columns must come from the trunk run, not from the box.
E3's pair comes from the same tool on `scratch/cypress-e3-2026-10-22/views/desktop-centre.png`, once, in pass 1.

**The diagnostics on the registered windows** (Codex F6, F11. numbers to report, no threshold): the 3 × 3 standard
deviation of grey (the contrast script's recipe on the window), the residual after a σ = 2 blur, and the black share:

```
magick <win>.png -colorspace Gray -statistic StandardDeviation 3x3 -format "%[fx:mean*255]\n" info:
magick <win>.png -colorspace LAB -channel R -separate +channel \( +clone -blur 0x2 \) -compose difference -composite -format "%[fx:standard_deviation*100]\n" info:
magick <win>.png -colorspace LAB -channel R -separate +channel -threshold 3% -format "%[fx:1-mean]\n" info:
```

On `<outPrefix>-painting.png` and `<outPrefix>-render.png`: the painting's, E3's and each pass's, in the pass table.

**The on/off pairs** (Codex F7, pass 1 only): for each of fray, gaps, ridges (both weights and the clamp) and drift,
one capture of `pass-t5.png` with that field alone at its default, and `node scripts/compare-frames.mjs
<on> <off> <diff.png> --crop 200,0,420,900` for the count and the difference image. A mechanism whose pair
differs on under 1% of the column's pixels is reported as doing nothing visible. The read says what each one
changes, in a sentence.

**The read**, per pass, in `read.md`: what reads wrong against the painting, in plain words, in this order: jelly
(smooth, glossy, rounded), fur (grey noise at 1:1), stipple (a dithered edge), a cut-out (the painting's pixels on a
shape), the darkness against E3. For pass 2, the cut-out read of the ±1/±3 pair on its own line. "I could not tell"
is an acceptable read.

### E4.5 — the gates (the worker runs them per pass and saves the raw output. The Lead re-runs them at the gate)

All on the worktree's server on port 5181, never 5179 (the Lead's checkout):

- `node scripts/check-cypress-colour.ts <pass>/views/desktop-centre.png`: ΔE per third ≤ 10, spread ≥ 15, light
  ≥ 9%, warm and green within 6 points of the painting's, rejected ≤ 0.4. Two controls must exit 1: `--control=grey`, and an off-tree box (`... 100 100 200 200`), which
  fails on the minimum pixel count (the worker's read, B7). Its L
  percentiles are reported per pass against E3's (the same tool on E3's `views/desktop-centre.png`, in pass 1): the
  p50 within 1.5 L of E3's (Codex F6. ΔE per third did not see the spike's darkening. its p50 fell about 0.9).
- `node scripts/cypress-silhouette.ts <pass>/views/desktop-centre.png 330 80 220 578 <pass>/sil`: the IoU, and
  the masks image opened for detached fragments (Codex F7).
- `sh scripts/cypress-contrast.sh <pass>/views/desktop-centre.png > <pass>/contrast.log 2>&1 || true`: the number
  is reported. its 3–8 verdict is not a gate for E4 (Codex F13: its exit is non-blocking here. E3's 3.4 was on
  `views/desktop-centre.png`. re-run there in pass 1 for the like-for-like baseline).
- `npm run -s test:sky`, `npx tsc -b`, `npm run -s build`, `npx eslint .`.
- `DIORAMA_CAPTURE_URL=http://127.0.0.1:5181/ npm run -s check:reduced` and the same for `check:viewport`: both
  scripts read that variable and default to 5179 (the worker's read, B4).
- Perf: `DIORAMA_CAPTURE_URL=http://127.0.0.1:5181/ DIORAMA_CAPTURE_EXTRA='arrival=0' node scripts/capture-diorama.mjs <pass>/perf --perf`
  gives `perf-summary.json`. the clock unpinned (Codex F12).
- D1 unchanged (Codex F8): held and unheld frames at the same times, E3's G8 method:
  `--times 5,6 --eval 'window.__landInject(-1.5, 1.4, 0.72, 1, 5, true); "ok"'` for the held pair and the same
  times without `--eval` for the unheld pair, then `compare-frames.mjs` held against unheld at t = 5 (expected about
  0 px) and at t = 6 (expected about 55,000 px, inside the cypress's box `170x580+375+98`). The Lead's gate adds the
  mutation: the stroke material's `strokeBend` removed (the solid's kept) must drop the t = 6 difference on the
  ribbons' crop.

## Gate

| # | check | pass when |
|---|---|---|
| G1 | red first | C5 and C6 fail before E4.1 and E4.2 |
| G2 | `test:sky`, `tsc -b`, build, eslint | green. the count is 183 plus the added tests, read from the log |
| G3 | the land unchanged | C4's four hashes hold unchanged. `git diff main -- src/scene/landStrokes.ts src/scene/landDomes.ts` empty |
| G4 | the colour gate | PASS, both controls exit 1. the p50 L within 1.5 of E3's by the same tool |
| G5 | the silhouette gate | IoU ≥ 0.82 (E3 0.840 by the gate. Codex's read-only run of the spike's treatment 3 gave 0.837). no detached fragment in the masks image |
| G6 | the paired contrast and the diagnostics | reported per pass, E3's and the painting's beside. no threshold |
| G7 | the crops | the context montage and the registered pair, each pass: no jelly, no fur, no stipple, no cut-out. The worker's read and the Lead's. The on/off pairs name what each mechanism changes |
| G8 | D1 unchanged | held against unheld: about 0 px at t = 5, about 55,000 inside the cypress's box at t = 6 |
| G9 | `check:reduced`, `check:viewport`, perf | PASS, PASS. desktop p95 within 1 ms of E3's 17.0 |
| G10 | Codex code review | no P0 or P1 open |
| G11 | the Lead's gate | the suite re-run by the Lead. every capture opened. the mutants of E4.3 run one at a time, each red. the stroke-bend mutation of E4.5. the record `tasks/2026-10-22-cypress-e4.md` |

Retune cap: 4 passes in all (pass 1 the relief at ±3, pass 2 the smoothing at ±1, passes 3 and 4 the retunes). The
cap reached with G4, G5 or G7 failing: stop and report. Mark's taste gate on the captures and on localhost (5181)
after the Lead's gate.

## Risks

- **The darkness.** The ridge's shadow sides pull the body's L down (the spike's treatment 3: about −0.9 on the
  fixed E3 mask, Codex F6). The clamp `[0.4, 1.6]` stops black. G4's p50 bound measures the rest. The retune is the
  clamp's ceiling and the lit weights, not a weaker shadow.
- **A serrated edge.** The gaps are a hard `discard` on an opaque material. At 1:1 the frayed flank could read as a
  saw. The crop decides. The retune is `below` (0.3 → 0.2) or `band` (0.7 → 0.8 of the shaped radius).
- **The gate's component fragments.** The colour and silhouette gates open the mask by 1 px and keep one component
  (`scripts/lib/silhouette.ts`). Gaps could split it or drop thin paint. `rejected`, the IoU and the masks image
  show it. The retune is the same as the serrated edge's. The thresholds are not lowered to rescue a result.
- **Fur.** Any lane frequency above 5 cycles across, or a second fine octave, is E1's fur. Not a retune direction.
- **The worker's judgement is the experiment.** Its read of each pass is in its report. The Lead reads every crop
  at the gate and says in the record where the two reads differ.
- **What E4 does not do** (Codex F14): the painting's body has pale ochre and green tracks beside dark ones within
  one stroke's width, interrupted deposits, and the canvas's grain. A ribbon carries one colour across its width per
  step, and the lanes only modulate it. E4 defers adjacent pigment tracks and canvas grain. G7 tests the chosen
  treatment's surface within that limit. A later slice may colour the strip's five columns separately.

## Roles, the worktree and the ports

- The worker builds on `feat/cypress-paint-e4` from `main`'s head (the commit that carries this plan), in its own
  worktree (`git worktree add <scratchpad>/e4-wt -b feat/cypress-paint-e4 main`, then `npm ci` there), served on
  port 5181 with `npx vite --host 127.0.0.1 --port 5181 --strictPort`. It commits on that branch. It does not push.
- The Lead's checkout serves 5179. The Lead does not edit source during the build.
- The reviewer read this plan (the correctness leg). The worker read it for buildability (the second leg). The
  dispositions below are part of the plan.
- The worker's model: Mark ran the buildability read on Gemini 3.8 ("not a real build") and switches the pane to
  Gemini 4 Argon for the build, which is the experiment.

## Review

### Codex's plan read (`w4:p4`, read-only, 2026-10-22, `scratch/cypress-e4-2026-10-22/plan-read-report.md`, against `d72fffa`)

Codex ran the sampler at both seeds, the colour gate and the silhouette alignment on the spike's four frames, a UV
coverage model of the gap band, a dimming control, and the contrast pipeline: **REVISE**, eleven P2s and three P3s.
Each checked against the code. Each holds, with one correction to F13. The dispositions, folded into the design
above:

- F1 (P2) numeric fields cannot reproduce E1's expressions, and neutral terms change the pinned text → expression
  selection (`tube: 'rounded' | number`, `rim: 'shaded' | number`), `side` emitted verbatim at `ridgeSide: 1`, the
  sheen line verbatim at 0.06 and omitted at 0, fray, drift and gaps omitted when off. The four hashes stay.
- F2 (P2) treatment 3 also changed the lane interval to `[0.42, 0.58]` → `laneEdge: [0.42, 0.58]` for pass 1, the
  drift shifting those endpoints. Both are C5 mutants.
- F3 (P2) what a gap exposes → stated in E4.1. The on/off pair for gaps is read at an overlapping body stroke and
  at an outline stroke.
- F4 (P2) the gap band on the strip's half-width barely reaches surviving pixels (0–0.15% of coverage in Codex's UV
  model) → the band on the shaped radius `r`. The on/off pair measures its contribution on screen.
- F5 (P2) ±1 unisolated from the relief → pass 1 at ±3, pass 2 at ±1, the cut-out read of the pair decides.
- F6 (P2) ΔE does not see the darkening. the rake unbounded can go black → `rakeClamp` `[0.4, 1.6]`. the p50 L
  bound against E3 by the same tool. the black share on the registered window reported.
- F7 (P2) the component gates cannot see broken paint → the masks image read for fragments. the on/off pairs per
  mechanism with `compare-frames.mjs`. the thresholds not lowered.
- F8 (P2) a 55,000 px box difference cannot say the new paint bends → held against unheld at the same times, and
  the stroke-bend mutation at the Lead's gate.
- F9 (P2) C5 and C6 would certify declarations → per-field isolation, the composed shader, the installed injection
  read from the source, C6 through the tracer on a fixture, the mutant list in E4.3.
- F10 (P2) the spike's painting panel is at 1.6× the render's scale → the registered pair on the gate's box and the
  row table's crop at the same height. the montage stays as context.
- F11 (P3) no scalar for jelly → the blur residual and the black share as diagnostics, no threshold. The profile
  measure across ribbons is not built (P3. the crop read covers roundedness).
- F12 (P2) the capture command never wrote `perf-summary.json` and never pinned the clock → three commands: the
  pinned frame, the views, the perf run.
- F13 (P3) the contrast script exits 1 outside 3–8, and its pipeline gave 1.74 on E3 → non-blocking in the loop.
  The 1.74 was measured on the 1600 × 900 pinned sky frame, and E3's 3.4 on `views/desktop-centre.png` (the design
  camera, the same size, a different composition). Not comparable. The baseline is re-run on E3's view in pass 1.
- F14 (P3) the painting's adjacent pigment tracks and canvas grain are beyond the lanes → deferred, stated in Risks.

### The worker's buildability read (`w4:p5`, Gemini 3.8 Flash, 2026-10-22, `scratch/cypress-e4-2026-10-22/buildability-report.md`)

**CAN BUILD**, seven items, read against the plan while the Lead was folding Codex's findings into it. Each checked:

- B1 the registered-pair tool's pipeline restated from the lib's functions (`treeComponent`, `extent`, `trunkRun`,
  the middle row at 47%) → as the plan says. Built in step 1.
- B2 C6 written in step 1 would keep pass 1 red → the build brief phases it: C5 red before E4.1, C6 red before E4.2.
- B3 one capture command cannot give the views and the perf file → already split (Codex F12). The worker read the
  plan between the two versions.
- B4 `check:reduced`, `check:viewport` and `capture-sky-frames.mjs` default to 5179 → `DIORAMA_CAPTURE_URL` on the
  two checks, `--url` on the frames. Folded into E4.5.
- B5 the contrast script's exit → `|| true`, as E4.5 says.
- B6 the gap discard goes after `if (a < 0.02) discard;`, where `r` and `streak` both exist → yes. The derivatives
  stay before every discard.
- B7 the gate names two controls and the script has one flag → the off-tree box as the second. Folded into E4.5.

Its read of the spike's images (asked for as the first sample of the experiment): "treatment 3 reads noticeably
darker, muddier, and broken with fine dark speckled noise along ribbon flanks, lacking the crisp relief and
luminous warm flame bands of the original." The darkness agrees with Codex's measure (F6). The speckle along the
flanks is the gaps and the fray seen at 2× nearest-neighbour, which the on/off pairs will separate. The warm bands
are F14's deferred pigment tracks.

The build goes on these dispositions. The code review (G10) checks them in code. No second plan read.

### The code review (G10)

Codex (`w4:p4`, read-only, 2026-10-22, `scratch/cypress-e4-2026-10-22/code-review-report.md`, against `7a33e5b`. it
ran the suite, fourteen configuration mutants with restoration, five emission mutants, the factory's fields against
E1's hashes, the colour gate read-only on the three views, the registered pairs and the black share, the on/off
counts and the held-minus-unheld counts): **REVISE**, three P2s and one P3. Each checked. Each holds. The
dispositions:

- F1 (P2) C5's substring checks pass with the gap discard or the fray factor commented out. the clamp bounds and
  the gap band are not asserted. per-field isolation only checks "text differs" → C5 on comment-stripped text, the
  exact executable statements asserted, the changed lines counted per field, the five emission mutants run red
  (the worker, `brief-fix.md`, Fix 1). The Lead's eleven configuration mutants (`lead-mutants.md`) had all gone
  red: they removed fields through the constants, which C5 did see. The emission mutants are the gap it did not.
- F2 (P2) the registered pair's rectangle takes the trunk run at the band's middle row, and the trunk narrows above
  it: 12.6% of the E4 rectangle is off the component, so the registered diagnostics mix sky. The Lead had seen the
  corner and called it acceptable by eye → the columns from the intersection of the trunk runs over the band's
  rows, the coverage printed and bounded at 0.95, a self-check on a narrowing mask (C7), the diagnostics re-run on
  all four windows, the reads revisited (Fix 2).
- F3 (P2) the worker's build report misstates the constants, the tool's method, the baseline's body, several
  numbers and paths → answered by the record, which reads the code and the logs. Two numbers the record had copied
  from the report (the off-tree control's pixel count, the t = 6 count) are corrected there. The report stays as
  the experiment's artefact with its errors named. Not rewritten.
- F4 (P3) `loadDrift` alone emits an unused `float load` when `laneEdge` is null → the declaration only with a
  lane edge. C5's drift case on a fixture with a lane edge (Fix 3).

The confirmation read: `brief-confirmation.md`, bounded to the four.
