# 0003 — Offline inpainting of the cypress cut-out (and the canvas extension)

Status: COMPLETE. Hole GATE PASSED (Mark, live, 2026-07-16) after S3 + the flow re-alignment;
S4 side extension GATE PASSED (Mark, live, 2026-07-17) — residuals 5–7 below accepted at the
gate. Plan: `docs/superpowers/plans/2026-07-14-offline-inpaint-extend-pipeline.md` (approved
2026-07-14).

## What and why

Six runtime rounds of heuristics (donor lookups, Jacobi fill grid, mirrored grain, bold
synthetic ribbons) narrowed the cypress cut-out ghost but never closed it — synthesised texture
is not Van Gogh's hand. This pipeline copies real, flow-aligned patches of the painting's own
sky into the problem region **offline** and bakes the result as derived assets, Phase-0 style.
The locked bar permits it: *"Motion and colour are derived from the painting itself"* — the
fill is literally the painting's own pixels.

## Method

`scripts/extend-reference.ts`, dependency-free (macOS `sips` for JPEG↔PNG, Node `zlib` PNG IO
in `scripts/lib/png.ts`). Deterministic: no RNG anywhere; reruns are byte-identical (verified).

### S1 — the fill region (`scripts/lib/fill-region.ts`)

`sky-mask.png` is a CHURN mask, not a segmentation — dark also covers star cores, the
deliberately-zeroed moon disc, navy stroke-gaps and the foreground, all real paint. So the
region is built from conjunctive tree evidence at painting resolution (1600×1267):

- hole candidates: raw mask ≤ 16, in the sky band (v < 0.62), dark paint (lum < 0.55 — bright
  pixels are real star/halo/cloud paint even inside the cut column);
- connected components qualify on treeish-chroma fraction (≥ 25%; the tree column is 92%,
  star cores are gold, navy gaps blue-dominant → dropped) and size (≥ 32 px);
- keep the primary (largest) + satellites within 56 px — the tree is one rooted object with
  close-by tufts; distant dark umber strokes are Van Gogh's own paint;
- the trunk continues below the band to v 0.66 by straight-down column growth (runtime ribbon
  trails dip under the band; sideways growth would merge into the foreground mass);
- plus the feathered mask edge near the kept region, chroma wisps within 48 px, and a 6 px
  dilation margin (never onto bright paint).

Guards: the moon at 1.6 × MOON_R (its zeroed mask disc AND its painted umber outline, which
passes the treeish chroma test), and five hand-measured star bodies (the `SWIRLS` table
anchors vortices and sits offset from the painted stars — proven by overlaying its rings).
Guards block the chroma/proximity passes but NOT the primary mask component: the mask column
is ground truth of what the 2D route cut, and it genuinely overlaps two star bodies whose cut
pixels were runtime-synthesised all along.

Result: 116,865 px (5.8% of the image), bbox x 121–543 — exactly the cypress.
Review: `reference/derived/fill-region-{overlay,crop}.png`.

### S2 — exemplar inpainting (`scripts/lib/inpaint.ts`)

Criminisi-style, kept simple:

- onion-peel the boundary by priority = patch confidence × a flow data term (|cos| between the
  into-hole normal and the local known flow — strokes running into the hole continue first);
- donor search per 15×15 target patch: coarse lattice (stride 6, radius 300 px) then stride-1
  refinement around the top 12, scored by SSD over known pixels + 2600 × (1 − |cos Δflow|)
  (orientation is undirected for texture);
- donors are ORIGINAL sky only (filled pixels never donate — no error propagation), pre-gated:
  in-band, off the fill region, ≥ 24 px off the canvas edges (the border strips donated canvas
  weave), outside 1.6 × every guard (halo fringes read as phantom fragments), zero bright-warm
  pixels (lum ≥ 0.62 AND blue non-dominant — star/moon light; plain luminance would starve the
  pale blue band), ≤ 15% treeish. Patch gates are O(1) via summed-area tables;
- copy into unknown pixels, feather (0.22, edge-faded) only over previously-FILLED pixels;
  pixels outside the fill region are never written (asserted at bake time);
- every filled pixel records its donor offset; `signed-flow-filled.png` copies flow from the
  same places, then low-passes the filled texels (σ=2) back to the field's native smoothness
  (the original is Gaussian tensor-integrated; raw donor patchwork is blocky and would wobble
  the ribbons).

Tuning trail (retune cap 4, honoured; p5–p6 re-opened by Mark's gate feedback): p1 defaults →
p2 fixed a donated halo smear, a vertical orientation break, over-soft feathering and wisps
surviving inside a star guard (bright gate 0.72→0.62, guard-scaled donor exclusion, flowWeight
1500→2600, patch 13→15, feather 0.45→0.22, two guard geometry tweaks) → p3 probe (search
380/topK 16) REGRESSED (creased the pale band), reverted → p4 added the canvas-edge donor
margin → **Mark's gate feedback circled the mid pale-band fill as mushy/choppy** → p5 probe
(patch 21×21) REGRESSED (whole strokes but block-tone rectangle tiling), reverted → p6 kept
15×15 and fixed the actual culprit with per-placement tone adaptation (`toneShiftMax` 14: the
donor shifts toward the target's known-pixel mean, clamped) — the rectangles dissolved and the
circled zone reads as sweeping strokes.

### S4 — side extension (2026-07-17)

The L/R flat-blue margins were the piece's biggest "painting on a card" tell. The same patch
machinery continues the painting past its edges, baked as separate strip assets so the canvas
mapping (and the gate-passed S2 assets) stays untouched.

- **Margin measured, not guessed** (`scratch/measure-exposure.ts`, ray-casting the real camera
  contract): every reachable drag/zoom pose exposes ≤ 0.14 of canvas width past an edge; the
  look-down horizon sweep reaches far wider but melts into the gradient. Chosen: **0.30 per
  side**, full paint through 0.15 (`SIDE_EXTEND_U` / `SIDE_FADE_START_U` in
  `dioramaSkyProjection.ts`), the runtime side fade owning the outward melt.
- **The strips own the scan's canvas-weave border** (~20 px per side, measured): the unpainted
  physical edge is not paint — mounted at full alpha it read as a pale tear, and as fill
  context it poisoned colour and flow. The S4 fill regrows those columns; the runtime renders
  strip texture over them (`SIDE_BORDER_U`), feathered at the hand-off (bilinear cannot blend
  across textures — a hard branch left a dashed hairline).
- **A guide field replaces context-mean flow for donor scoring** (`InpaintFlags.guideFlow`).
  Deep in the strip the fill's context is entirely previously-filled pixels; context-mean flow
  feeds back into patch-scale hatch chaos (p2). The guide is the canvas edge vectors relaxed
  across the strip (row-anchored Jacobi, σ=16 anchor smoothing) — the SAME field the ribbons
  ride, so strokes sweep the way they will be animated. A p4 probe blending the guide toward
  one global ambient direction REGRESSED into a monotone curtain (reverted): per-row anchor
  directions carry the stroke variety.
- **Flow strips are destination-sign-aligned** (the 07-16 rule): SWIRLS circulation where it
  still speaks (it is near-silent outside the canvas — no invented anchors), else the relaxed
  reference; then the σ=2 low-pass. A per-texel inward-neighbour chain was tried first and
  stalled trails into dashes wherever donor orientation ran near-perpendicular to it (p1).
- **Whole-sky donor domain** (searchRadius 2200 / stride 10), donors original-paint only with
  every S2 gate intact — no bright cores donate, so no phantom stars/moon in the extension.
- **Runtime mount**: the wash spans paintU ∈ [−0.3, 1.3] sampling strip textures beyond the
  border; ribbons integrate a CPU composite (`uPad` in `streamlineGeometry.ts`) and emit
  painting-space u; `SkyEdgeBackfill` (the whisper wash) is DELETED.
- **Three artefact classes fell out of deleting the old in-canvas side fade**, which had been
  silently doing three jobs: killing sub-horizon edge trails (fixed: `trailMaxV` cap + ribbon
  sub-band skirt), hiding the wash's below-band mask feather at the skyline's corner dips
  (fixed: mask term side-gated over pu 0–0.1), and generally masking everything at pu < 0.22.
  The last one was found by layer bisection + a flat-colour wash probe after five plausible
  theories each fixed something real but not the dotted arc.

## Outputs

| Asset | Size | Notes |
|---|---|---|
| `public/reference/painting-filled.webp` | 2.35 MB | Lossless throughout, so pixels outside the fill stay byte-identical to `painting.jpg`'s decode. **Ship format decided 2026-07-21** (Mark): lossless WebP, 40% under PNG, verified byte-identical in Chrome. Lossy was measured and rejected — see the item 5 evidence in `tasks/todo.md`. |
| `public/reference/signed-flow-filled.png` | 1.61 MB | Stays PNG: lossless WebP is BIGGER for flow data (2.10 MB). Signed vectors, so lossy is never an option here. |
| `public/reference/sky-extend-{left,right}.webp` | ~0.90 MB each | 500×1267 (extension + owned border), full paint strength — the runtime owns the melt. Lossless WebP, as above. |
| `public/reference/sky-extend-flow-{left,right}.png` | ~1 MB each | 400×1013 flow strips, destination-sign-aligned + low-passed |
| `reference/derived/inpaint-before-after.png`, `inpaint-filled-2x.png` | — | the flat-image gate crops (regenerable) |
| `reference/derived/side-extend-{left,right}-{1x,2x,flow}.png`, `side-extend-overview.png` | — | S4 seam/flow/panorama gate crops (regenerable) |

Asset weight (~15 MB of reference PNGs total) is a flagged pre-release ship-hygiene item.

## Honest residuals (named for the gate)

1. A faint canvas-weave stipple patch in the mid pale band — findable at 2×; the painting's own
   thin passages show the same weave nearby, so it is not alien texture, just concentrated.
2. The tip star (guarded) reads slightly softer on its left where the cut genuinely crossed it.
3. The below-band trail-safety strip fills dark with straight edges — never visible in-app (the
   3D world owns everything below the band); it exists so ribbon trails dipping under v 0.62
   sample sky, not tree.
4. Test coverage runs on synthetic images (determinism, no-bright-donation, stripe continuity,
   untouched-outside); the real-data invariants are asserted in the bake itself.

S4-specific (2026-07-17, for the drag-boundary gate):

5. The right strip's pale-band continuation shows brick-mosaic tone tiling at 2× offline (same
   class as Mark's circled S2 zone); at runtime the wash is dimmed/tinted and ribbons + bloom
   sit over it — not findable in the capture set to my eye, but Mark's live drive decides.
6. The moon corner at the drag-right boundary is busy: crescent sprite + the painting's own
   moon + the strip's warm halo-continuation curls. No second core or ring is invented (the
   bright gate held), but whether the warm continuation is welcome is a taste call.
7. Strip stroke energy is a touch softer than the canvas impasto beside it; the outward fade
   absorbs most of it. Judge in motion, not stills.
