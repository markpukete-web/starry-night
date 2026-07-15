# 0003 — Offline inpainting of the cypress cut-out (and later, the canvas extension)

Status: S1+S2 baked, 2026-07-16. Awaiting Mark's flat-image gate before the runtime swap (S3).
Plan: `docs/superpowers/plans/2026-07-14-offline-inpaint-extend-pipeline.md` (approved 2026-07-14).

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

## Outputs

| Asset | Size | Notes |
|---|---|---|
| `public/reference/painting-filled.png` | ~6 MB | PNG so pixels outside the fill are byte-identical to `painting.jpg`'s decode. Ship format (PNG vs re-encoded JPEG) is an S3/pre-release hygiene call — flagged, not decided. |
| `public/reference/signed-flow-filled.png` | ~3 MB | same story |
| `reference/derived/inpaint-before-after.png`, `inpaint-filled-2x.png` | — | the flat-image gate crops (regenerable) |

## Honest residuals (named for the gate)

1. A faint canvas-weave stipple patch in the mid pale band — findable at 2×; the painting's own
   thin passages show the same weave nearby, so it is not alien texture, just concentrated.
2. The tip star (guarded) reads slightly softer on its left where the cut genuinely crossed it.
3. The below-band trail-safety strip fills dark with straight edges — never visible in-app (the
   3D world owns everything below the band); it exists so ribbon trails dipping under v 0.62
   sample sky, not tree.
4. Test coverage runs on synthetic images (determinism, no-bright-donation, stripe continuity,
   untouched-outside); the real-data invariants are asserted in the bake itself.
