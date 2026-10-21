# E3 — the cypress's medium: the bands, the lights and the relief. Plan, 2026-10-22

Mark, 2026-10-21, after D1 was gated: "Do you think the cypress still have room to improve?" and, on the Lead's
read, "Go for your recommendations for the cypress." E1 (PR #15) moved the tree from a cut-out to a stroked body
with the silhouette and the regional colour means close to the painting (IoU 0.817, ΔE 1.0 / 1.2 / 3.0). This pass
is the medium: what the strokes carry, not where they go. The lobes, the row table, the tracer's field and the
ribbon lengths are untouched. Built on `feat/cypress-medium` from D1's head (`399a956`, so D1's bend rides along. the
bend weight is the vertex's own height and does not care how many ribbons there are), in a worktree served on
port 5181 so Mark's localhost on 5179 keeps D1 for his gate. Lead Claude (`w4:p1`), reviewer Codex (`w4:p4`).

## What the painting's cypress is, measured tonight (`scratch/cypress-e1-2026-10-21/painting-mid-1to1.png`, the 3840 scan)

- **Long bands, not short strokes.** The body is vertical bands 30–60 px wide at the scan that run 150 px to the
  whole crop (520 px) tall, bending with the flame. The Lead's first recommendation (shorter strokes) was wrong
  and is withdrawn: E1's ribbon lengths (0.07–0.30 of the crop height, 110–480 px) already match the body. The
  short curling strokes are at the tongues' tips only.
- **Light against dark, band by band.** Brown and ochre bands sit beside near-black greens with hard edges. The
  painting's tree at 1600 px, measured as the colour gate measures it (the treeish component in the row crop,
  54,261 pixels): L p10 7.0, p50 13.6, p90 25.4, a spread of 18.5. 10.6% are light (L > 25). A first measure over
  the whole crop rectangle with `TREE_TEXEL` read 28 and 18.7%: it had the bushes at the tree's foot in it, and is
  withdrawn.
- **Fine bristle lines inside each band**, and lit edges. By the July recipe (a 3 × 3 standard deviation of the
  grey image) the body measures 11.1 at the render's scale (0.371 of the scan) on a 100 × 120 window, 20.1 at the
  scan's.

## What ours is (`scratch/touch-land-2026-10-20/gate/none2/none-t5.3.png`, D1's head)

- The 450 front ribbons' colours: L p10 11.3, p50 15.0, p90 20.1, a spread of 9. 2.2% light. The rendered tree's
  pixels (the gate's component): spread 11.8 against the painting's 18.5, 7.1% light against 10.6% (the shader's
  rim and sheen add most of it). The regional means match the painting's (ΔE 0.8–3) while the extremes are
  gone: the flat gate (`reference/derived/cypress-flat-gate.png`) shows one dark olive beside the painting's
  brown-and-green.
- The local contrast 1.07 by the same recipe and window (the painting 11.1).
- **Why the means flatten.** `bandPigment` takes one colour per ribbon, the mean of the tree texels in a window at
  the middle sample. A median in the same window gives the same spread (8.4): the loss is not mean against median.
  Along each ribbon the texels under its samples spread 18 (p90 25, 10% light), and 328 of 450 ribbons cross
  bands along their length (their own p90 − p10 above 12): the traced path drifts across the bands as they bend,
  and one colour per ribbon averages a brown band with a green one.
- **The ribbons do sample the lights.** Under the ribbons' samples 10.0% of texels are light, the painting's
  tree's 10.6%. The lights are lost at the colouring, not at the tracing.

## Design

### E3.1 — colour along the stroke (`cypressStrokes.ts`, `BrushCypress.tsx`)

Each ribbon carries the painting's colour at each sample, smoothed along the ribbon over ±3 samples (9 px at the
scan, a third of a band's width), in place of one mean per ribbon: `traceCypressRibbons` adds `colours` per sample
(the accepted texel under the sample, a sample over sky taking the nearest accepted along the ribbon. the
tracer's `colour` stays for the land and the tests). `BrushCypress` passes the kept run's colours per step to
`pushDrapedRibbon` (which takes a colour per step today and receives one tint repeated), each × the ribbon's
relief. Simulated on the shipped ribbons: spread 15.2 (from 9), 7.6% light (from 2.2%). the regional means move
by under 1 L. A ribbon that crosses from a brown band into a green one shows it, as the painting's dragged strokes
do.

### E3.2 — the lights, a reserve (`cypressStrokes.ts`, `BrushCypress.tsx`)

Only if G4's light share stays under 9% after E3.1: a second trace of short ribbons seeded on light texels (120
front, seeds accepted where the painting's texel is light and inside the mask, lengths 0.05–0.12 of the crop
height, half-widths 0.02–0.04, lifted 0.002 above the body's ribbons, coloured as E3.1). The measurement says the
ribbons already cross the lights at the painting's rate, so this step is not planned. It is the retune's reserve.

### E3.3 — the relief (`cypressStrokeShader.ts`)

The bristle lane's contrast from mix(0.86, 1.08) toward mix(0.78, 1.14) and the rake from 0.35 toward 0.5, one
step at a time, with a second, coarser lane (2.2 cycles across) at a third of the first's amplitude so the lanes
read as the painting's bristle lines rather than a stipple. The contrast number is the dial: the bar 3–8 at the
render's scale and window (the painting 11.1). the eye at 1:1 decides fur against paint, as E1's retunes learnt.

### E3.4 — the gates (`scripts/check-cypress-colour.ts` extended)

The colour gate prints, beside the regional ΔE, the rendered tree's L percentiles and light share against the
painting's, and bounds them: spread (p90 − p10) ≥ 15 (the painting 18.5, E1 11.8) and light share ≥ 9% (the painting 10.6%,
E1 7.1%), ΔE ≤ 10 as before. Built first, red on E1's render (`d77ef42`). The silhouette gate
runs unchanged (the lights are inside the mask). The local-contrast recipe is scripted (`scripts/cypress-contrast.sh`,
the July window at the render's scale) with the bar 3–8.

## Gate

| # | check | pass when |
|---|---|---|
| G1 | red first | the tracer's `colours` test (per-sample, smoothed, sky samples filled) and the light-seed test (every seed light and inside) fail before the code |
| G2 | `test:sky`, `tsc -b`, build, eslint | green |
| G3 | the flat gate | the ribbons beside the painting read as brown-and-green bands, the lights where the painting has them |
| G4 | the colour gate | ΔE ≤ 10 per region. spread ≥ 15. light ≥ 9%. the two controls exit 1 |
| G5 | the silhouette gate | IoU within 0.01 of E1's 0.817 |
| G6 | the contrast recipe | 3–8 at the render's scale |
| G7 | 1:1 crops beside the painting at the render's scale (`mid-pair`), desktop, mobile, orbit | named. fur, stipple or a cut-out is a fail |
| G8 | D1 unchanged | an injected hold bends the tree (the diff inside the cypress's box). `?touch=0` against D1's build differs only inside the cypress's box |
| G9 | `check:reduced`, `check:viewport`, perf | PASS, PASS. p95 within 1 ms of D1's |
| G10 | Codex code review, then the record | no P0 or P1 open |

Retune cap: 4 passes across E3.1 and E3.3, E3.2 drawn from the reserve if needed. Mark's taste gate on the captures and on localhost (5181) after.

## Risks

- **A texture-mapped look.** Per-sample colour with no smoothing is the painting's pixels along a path, the cut-out
  E1 replaced. The smoothing over a third of a band and the ribbon's own relief, rim and lanes keep it a stroke.
  the eye at 1:1 (G7) decides the smoothing length.
- **Fur again.** More lane contrast on 10–20 px ribbons can stipple. one step at a time, the contrast number and
  the crop.
- **The lights as confetti.** Short light ribbons scattered where the painting has band edges. they follow the
  field and sit on the light texels, and G3's flat gate shows them before any 3D work.

## Review

(Codex's read of this plan, then the dispositions.)

Codex (`w4:p4`, read-only, 2026-10-22, `scratch/cypress-e3-2026-10-22/plan-read-report.md`, against `c13e631`. it
reran `measure-bands.ts`, probed the mask populations, the drape's resets at both seeds, an RGB smoothing, a
seed-only light-ribbon prototype, a neutral-grey gate control and paired contrast windows): **REVISE**, six P2s
and one P3. Each checked. each holds. The dispositions, folded into the build:

- F1 (P2) the 18.7% and the 10% measure different areas, so no seed deficit is shown → found and corrected on the
  branch before the read landed (`cc40e92`): the painting's tree measured on its own component (spread 18.5,
  10.6% light), the ribbons sample the lights at that rate, E3.2 a reserve, the target the existing mask. The
  lights outside the mask (half the crop's light texels, the flanks' rim strokes) are the silhouette's and out of
  this pass.
- F2 (P2) the drape returns no source index, and 36–39 of 450 ribbons lose a prefix, so indexing the colours by
  step shifts the pigment → `drapeRibbon` returns `firstSample` (the index of `kept[0]` in the samples). a pure
  `stepColours(ribbon, draped)` slices the per-sample colours for the kept run, used by the builder and the flat
  gate. the test drapes a ribbon with distinct colours per sample through a forced prefix reset and a suffix
  trim and asserts the emitted colours. The land's `colour` path stays.
- F3 (P2) the flat gate paints `ribbon.colour` only → it draws `stepColours` and, if the reserve is drawn, the light
  batch. `--flat` paints the legacy colour as the control and must visibly differ.
- F4 (P2) the luminance bounds pass a neutral-grey contrast-stretched tree → the gate adds the chromatic check:
  the warm share (Lab b > 8, the browns and ochres) and the green share (a < −4) of the rendered tree against the
  painting's, each within 6 points, with `--control=grey` (the tree's pixels neutral, its contrast stretched),
  which must exit 1. the bounds are measured on the painting's component before they are set.
- F5 (P2) the contrast recipe mixed windows and scales (11.1 on one window, 1.07 on another. the paired render
  window reads 2.5) → one paired recipe: the painting's mid crop at the render's scale (`painting-mid-render-scale.png`)
  and the render's crop at the same place and size, the same `100x120+40+35` window, the same grey 3 × 3 standard
  deviation. both baselines from that exact command in the record (the painting 11.1, E1 2.5). the bar 5–10 on
  that window, with the eye's veto on fur and stipple (E1 retunes 2–4).
- F6 (P2) G8 cannot see a light batch that does not bend → if the reserve is drawn, the lights join the body's
  geometry and material (one mesh, the same weight and uniforms), and G8 holds over a light ribbon's box.
- F7 (P3) the simulation's colour rule was unspecified → specified: the accepted texel's sRGB per sample. unaccepted
  samples filled from the nearest accepted along the ribbon before the smoothing. the smoothing a box of ±3
  samples (±9 scan px, an 18 px span, a third to a half of a band) in linear RGB, back to sRGB for the attribute;
  a ribbon with no accepted sample takes the legacy `colour`. Codex's RGB simulation of the same rule: spread
  16.2, 9.2% light before the shader.

The build goes on these dispositions. the code review (G10) checks them in code. No second plan read.
