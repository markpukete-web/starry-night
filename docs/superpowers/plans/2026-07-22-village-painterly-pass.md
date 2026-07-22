# Village painterly pass — checklist item 8 (plan, 2026-07-22)

Closes the three gaps named in `tasks/2026-07-22-village-look.md` (Mark confirmed the gap list
live, 2026-07-22). Written to survive cross-review; every design value below is measured from
the scan, with the rect recorded, not guessed.

## The brief — three gaps, from the look pass

1. **Reads as unlit game boxes, not painted houses** — flat single-tone walls/roofs, no strokes
   at 1:1, no contour outlines. Houses band 3×3 stddev: painting 11.32, live 1.95.
2. **The church glows; the painting's church is drawn** — live spire mean 202 vs painting 84.5;
   the painting's spire sits at its background's value (Δ −0.37) and separates by dark outlines;
   ours separates by brightness (Δ +28).
3. **The warm pigment is missing** — painting village band ~9.8% warm umber/ochre pixels + the
   red-brown roof landmark; live 1.8%, all of it the window rectangles.

**Standing compare:** `npm run compare:village -- <capture-dir>` regenerates
`village-original-vs-live.png` + the four trend indicators. The gate is looking at the image;
the indicators only say whether a pass moved toward or away from the painting.

## The design insight that shapes everything

**The painting's warmth and its pale church are HUE statements inside one narrow nocturne value
band, not brightness statements.** Measured (rects verified visually before measuring —
placement proofs in `output/playwright/village-look-2026-07-22/` and scratch checks):

| What | Rect (painting.jpg 1600×1267) | Mean | Note |
|---|---|---|---|
| Spire body | 20x80+896+950 | lum 84.5 | same value as adjacent sky (84.9) |
| Orange roof | 28x24+700+1042 | rgb(65,47,46) | DARK burnt sienna, not bright orange |
| Window blob | 8x10+774+1078 | rgb(127,124,35) | muted olive-gold, not #f6c651 |
| Umber family | warm-masked over 500x80+560+1005 | rgb(55,46,35) | 9.8% of band |
| Darkest cluster (outlines) | 8-colour census of band | #1C1F23 | the drawing ink |

Every fix below adds *hue and drawing*, never brightness. The one thing already too bright (the
church) comes down.

## Where the code stands (all in `src/scene/BrushVillage.tsx`, 302 lines)

- Houses/church: flat-shaded `pushQuad` solids + `cladQuad` sparse marks (`STROKES_PER_AREA
  230`, halfLen 0.042–0.074, margin 0.12, small value kicks). The sparseness IS gap 1.
- `SPIRE = PALETTE.steeple × 2.05 lerp(white, 0.30)`, `CHURCH = × 1.65 lerp(white, 0.18)` —
  gap 2 is these two lines. `PALETTE.steeple` #556c81 at ×1.0 ≈ lum 104: the fix is arithmetic.
- `WINDOW = #f6c651` crisp proud quads — gap 3's sticker read.
- palette.json's village region is 5 cool swatches (#151b24 #2a3f6f #556c81 #26282b #36403f) —
  the median cut dropped the low-weight warm family, so warm colours CANNOT come from
  palette.json. Provenance route: sample painting.jpg directly — the documented exception
  already used by the sky ribbons (palette.ts header) — as named `palette.ts` entries with the
  measured rect in the comment. No hand-picked colour anywhere.

## Slices (each: implement → capture → compare → LOOK → retune, cap 4)

### S1 — drawing pass: dark contour outlines (gap 2's mechanism, gap 1's biggest lever)

A `contourEdge(brush, a, b, …)` helper: 2–4 slightly-jittered dark brush ribbons along an edge
(segment splits + tiny perpendicular wobble so lines read drawn, not vector), offset proud along
the mean of the adjacent face normals. Colour: the measured drawing ink #1C1F23 family with
per-stroke value jitter (×0.85–1.15).

Apply to: eaves, gable rakes, roof ridges, wall corners (houses); tower corners, spire edges,
the dark belfry band under the spire, church eaves. The "spire stays unclad" rule becomes
"spire faces stay clean, spire EDGES get drawn" — that is exactly how the painting holds it.

Contract cautions (the cypress cross-review class of bug): edge ribbons must use the SAME
corner vectors the quads were built from (post-`rot`, post-`islandHeightAt`), never recompute;
ribbon offset must be small (~0.008–0.012) or grazing views float; check drag-boundary +
lookdown captures for z-fighting/floating before calling the slice done.

### S2 — church into the nocturne band (gap 2's arithmetic)

- `SPIRE`: ×2.05 + 0.30 white → ×~1.05, no white lerp (target measured spire mean ≈ 95–115).
- `CHURCH`: ×1.65 + 0.18 white → ×~1.15.
- Belfry band + S1 outlines carry the separation the brightness used to.
- Trend targets (not gates): spire-vs-sky delta within ±8 (painting −0.37); spire mean ≤ 120.

### S3 — paint pass: dense cladding + warm pigment (gaps 1 + 3)

- `STROKES_PER_AREA` 230 → ~700 first pass; margin 0.12 → 0.06; halfLen ×~1.4; wider value
  spread. Per-house base-colour jitter (small hue/value rng per house) so the seven houses stop
  being clones. Watch: marks must not dissolve the gable silhouette — if a roofline goes fuzzy,
  cap mark size before cutting density.
- Warm strokes woven into cladding: walls ~12% probability umber rgb(55,46,35)-family;
  roofs ~8% dark sienna. Distributed warmth is what the 9.8% figure actually is — not one
  orange object.
- ONE red-brown roof on the house left of the church (layout house `[-0.2, 0.72]`): base
  rgb(65,47,46), stroke kicks toward brighter sienna within the roof's own measured range.
  This is the painting's landmark, at the painting's value.
- New `palette.ts` entries with provenance comments: `villageUmber` rgb(55,46,35),
  `roofSienna` rgb(65,47,46), `windowOchre` rgb(127,124,35) — each citing its measured rect.

### S4 — windows as paint (gap 3's sticker fix)

Replace each crisp window quad with a cluster of 2–4 overlapping small brush marks around the
same anchor: colour pulled toward measured rgb(127,124,35), irregular sizes/offsets, one
slightly brighter core mark so it still reads lit. Bloom is gone from the diorama (checklist
item 1), so nothing depends on these being emissive-bright — they can sit at the painting's own
window value. Belfry window included.

## Out of scope (named so silence cannot grow it)

- No layout changes, no new houses, no village widening (standing composition choice).
- No roof-pitch/geometry reshaping — the "uniform gables" observation is parked pending the
  threshold-mask check (`tasks/2026-07-22-village-look.md`), per the shaded-render trap.
- No new dependencies, no bloom reintroduction, no lighting changes outside the village group.

## Perf note

Densified cladding ≈ 3–4k extra small quads (~16k verts) across the village group, static, in
the existing three draw calls. Well inside the stroke budget headroom; no runtime cost beyond
the one-time build.

## Verification (every slice, before "done")

1. `npm run capture:diorama -- output/playwright/village-pass-<date>-s<N>`
2. `npm run compare:village -- <that dir>` → LOOK at `village-original-vs-live.png` beside the
   painting; name what still disagrees in words before touching a dial.
3. Check `desktop-drag-left/right-boundary` + `desktop-lookdown` for contour-ribbon artefacts.
4. `npm run lint` + `npm run test:sky` + `npm run build` green; `npm run check:reduced` still
   byte-identical (nothing here animates, but the gate is cheap).
5. Trend table appended to the slice note; Mark gates on the final captures.
