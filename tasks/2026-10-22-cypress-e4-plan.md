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

`StrokeBody` gains the treatment's fields, each with a default that reproduces E1's text exactly, so the land's
four fields keep their hashes (`cypress-colours.test.ts` C4). The cypress's `CYPRESS_STROKE_BODY` takes the spike's
treatment-3 values as pass 1. The fields, with the spike's values:

| field | E1 (the land, default) | the cypress, pass 1 | what it does |
|---|---|---|---|
| `tube` | the E1 term `(0.86 + 0.12 * (1.0 - y * y))` | flat `0.95` | the rounded shading across the stroke, off |
| `rim` | `mix(0.8, 1.0, 1.0 - smoothstep(0.6, 0.95, y))` | `1.0` | the darkened edge, off |
| `sheen` | 0.06 | 0 | the wet highlight, off |
| `laneCycles` | 4.5 | 5.0 | bristle lanes across the stroke |
| `loadDrift` | 0 | 0.15 | the two-tone threshold drifts with a slow noise along the stroke |
| `fray` | 0 | 0.16 | the flank radius × (1 − fray + fray × noise at 40 cycles along) |
| `gaps` | off | y > 0.7 and streak < 0.3 discarded | the outer bristles skip |
| `dryFrom` | 0.75 | 0.55 | where the paint starts to run out along the stroke |
| `ridgeSide`, `ridgeSlope` | 1.0, 0.12 | 0.15, 0.5 | the lit term's weights: across the stroke, and the lane's slope |
| `rake` | 0.35 | 0.8 | the raking light's strength |

The GLSL for each is in `spike.patch`. The builder may name the fields differently, but each must be one field,
documented, with the default reproducing E1's text byte for byte. The `?paint=` URL switch of the spike is not
built. The land's body (`strokeGlsl`) is `strokeGlslWith()` as today.

### E4.2 — the colour along the stroke, sharper (`cypressStrokes.ts`, `BrushCypress.tsx`)

The cypress's colour smoothing goes from ±3 samples to ±1. The land's tracers set `perSampleColours: false` and
never read the smoothing, so a change to `CYPRESS_RIBBON_CONFIG.colourSmoothing` cannot reach the land. The
spike mutated the shared object from a URL parameter. The slice sets the constant.

### E4.3 — the tests, red first (`scripts/cypress-colours.test.ts`)

- **C5** the factory's defaults still hash to E1's four fields (C4's pins), and the cypress's fragment body contains
  the fray, the gaps, the ridge weights and the drift, and does not contain the sheen line. Written before E4.1,
  red on the missing fields.
- **C4** is read and updated: its last assertion says the cypress's constants change only the lane, the rake and the
  coarse lane. That is no longer true. The assertion is replaced, not deleted.
- **C6** `CYPRESS_RIBBON_CONFIG.colourSmoothing` is 1, and the land's two configs (`landStrokes.ts`, `landDomes.ts`)
  keep `perSampleColours: false`. Red before E4.2.
- The test file is already in `test:sky`. Read the count after: 183 before this slice, plus the tests added.

### E4.4 — the visual loop (the worker, up to 4 passes)

Each pass: build, capture the home view at t = 5 against the worktree's own server, cut the same crops as the
spike, put them beside the painting and E3, look, write down what reads wrong against the painting in plain
words, change the constants, repeat. The crops, from a 1600 × 900 frame:

```
magick <frame> -crop 420x900+200+0 +repage <tree>.png
magick <tree>.png -crop 200x280+150+400 +repage -filter Point -resize 200% <body2x>.png
```

The painting's two panels are `scratch/cypress-paint-spike-2026-10-22/`'s method: the tree column is
`scratch/cypress-e3-2026-10-22/e3-compare.png` cropped `330x900+0+0`, the body `200x280+40+430` of that column at
2×. E3's panels are the same crops of `scratch/cypress-e3-2026-10-22/p5/p5-t5.png`. The composite joins the panels
with `+append`, labelled. What the worker is judging, in this order: jelly (smooth, glossy, rounded), fur (grey
noise at 1:1), stipple (a dithered edge), a cut-out (the painting's pixels on a shape), then the darkness against
E3 and the painting.

The pass table in the worker's report: the pass, the constants changed, the colour gate's numbers, the paired
contrast, the IoU, and the worker's read of the crops in one or two sentences. "I could not tell" is an acceptable
read.

### E4.5 — the gates (the worker runs them per pass and saves the raw output. The Lead re-runs them at the gate)

All against the worktree's server on port 5181, never 5179 (the Lead's checkout):

- `DIORAMA_CAPTURE_URL=http://127.0.0.1:5181/ DIORAMA_CAPTURE_EXTRA='arrival=0' node scripts/capture-diorama.mjs <outDir>`
  gives `desktop-centre.png` and `perf-summary.json`.
- `node scripts/check-cypress-colour.ts <desktop-centre.png>`: ΔE per third ≤ 10, spread ≥ 15, light ≥ 9%, warm and
  green within 6 points of the painting's, rejected ≤ 0.4. `--control=grey` must exit 1.
- `node scripts/cypress-silhouette.ts <desktop-centre.png> 330 80 220 578 <prefix>`: the IoU.
- `scripts/cypress-contrast.sh <desktop-centre.png>`: the paired contrast on the pinned window (E3 3.4, the
  painting 11.1, the bar 5–10).
- `npm run -s test:sky`, `npx tsc -b`, `npm run -s build`, `npx eslint .`.
- `npm run -s check:reduced` and `npm run -s check:viewport` (read each script's header for how it takes the port).
- D1 unchanged: E3's G8 method, `scratch/cypress-e3-2026-10-22/g8/` and the record's G8 row: an injected hold
  through `capture-sky-frames.mjs --eval`, the differing pixels inside the cypress's box at t0 and t0 + 1.

## Gate

| # | check | pass when |
|---|---|---|
| G1 | red first | C5 and C6 fail before E4.1 and E4.2 |
| G2 | `test:sky`, `tsc -b`, build, eslint | green. the count is 183 plus the added tests |
| G3 | the land unchanged | C4's four hashes hold. the land's configs untouched (`git diff main -- src/scene/landStrokes.ts src/scene/landDomes.ts` empty) |
| G4 | the colour gate | PASS, both controls exit 1 |
| G5 | the silhouette gate | IoU ≥ 0.82 (E3 0.840. the fray and the gaps shave the mask) |
| G6 | the paired contrast | reported. the bar 5–10 is a target, not a blocker (E3's lesson: the painting's 11.1 is its canvas) |
| G7 | the crops | the body at 2× and the tree at 1:1 beside the painting and E3, each pass: no jelly, no fur, no stipple, no cut-out. The worker's read and the Lead's |
| G8 | D1 unchanged | the injected hold bends the tree inside the cypress's box as E3's G8 (0 px at t0, about 55,000 at +1) |
| G9 | `check:reduced`, `check:viewport`, perf | PASS, PASS. desktop p95 within 1 ms of E3's 17.0 |
| G10 | Codex code review | no P0 or P1 open |
| G11 | the Lead's gate | the suite re-run by the Lead. every capture opened. the mutation of C5 (the sheen line restored) goes red. the record `tasks/2026-10-22-cypress-e4.md` |

Retune cap: 4 passes. The cap reached with G4, G5 or G7 failing: stop and report. Mark's taste gate on the captures
and on localhost (5181) after the Lead's gate.

## Risks

- **The darkness.** The ridge's shadow sides pull the body's mean down. G4's ΔE per third measures it. The retune
  is a lighter lit side (`rake`'s lit term clamped and lifted), not a weaker shadow.
- **A serrated edge.** The gaps are a hard `discard` on an opaque material. At 1:1 the frayed flank could read as a
  saw. The crop decides. The retune is the gap threshold (0.3 → 0.2) or the flank band (0.7 → 0.8).
- **The gate's component fragments.** The colour and silhouette gates take the treeish component. Gaps could split
  it. `rejected` and the IoU show it. The retune is the same as the serrated edge's.
- **Fur.** Any lane frequency above 5 cycles across, or a second fine octave, is E1's fur. Not a retune direction.
- **The worker's judgement is the experiment.** Its read of each pass is in its report. The Lead reads every crop
  at the gate and says in the record where the two reads differ.

## Roles, the worktree and the ports

- The worker builds on `feat/cypress-paint-e4` from `main`'s head (the commit that carries this plan), in its own worktree
  (`git worktree add <scratchpad>/e4-wt -b feat/cypress-paint-e4 main`, then `npm ci` there), served on port 5181
  with `npx vite --host 127.0.0.1 --port 5181 --strictPort`. It commits on that branch. It does not push.
- The Lead's checkout serves 5179. The Lead does not edit source during the build.
- The reviewer reads this plan (the correctness leg). The worker reads it for buildability (the second leg) before
  building. The Lead folds both into the dispositions below before the build starts.

## Review

(Codex's read of this plan, the worker's buildability read, then the dispositions.)
