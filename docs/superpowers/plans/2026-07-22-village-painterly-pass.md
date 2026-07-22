# Village painterly pass — checklist item 8 (plan v2, 2026-07-22)

> ## ✅ EXECUTED AND GATE-PASSED (Mark, live, 2026-07-22) — this plan is history, not a to-do
>
> All six slices landed as written (`deddf0a` S0 → `11b75e0` S5), plus a night-lift and moon fix
> Mark asked for after the gate. Outcome and evidence: `tasks/todo.md` ▶ WHERE WE ARE. Lessons:
> `tasks/lessons.md` (2026-07-22 entries). Kept for the method — the look → measure → design →
> cross-review → slice order is what made the pass tractable, and it is the same order the
> cypress needed.

v2 after Codex cross-review round 1. What changed: warm colours now enter through the
derivation pipeline (palette.json), not palette.ts constants; S3 split into two slices per the
one-change-per-capture lesson; per-house colour variation constrained to palette families (no
free hue); done-loop now names mobile review, lessons.md appends, the ΔE census, the perf
measurement, and the stop-at-cap rule. Review round 1 findings and dispositions are recorded at
the bottom.

Closes the three gaps named in `tasks/2026-07-22-village-look.md` (Mark confirmed the gap list
live, 2026-07-22).

## The brief — three gaps, from the look pass

1. **Reads as unlit game boxes, not painted houses** — flat single-tone walls/roofs, no strokes
   at 1:1, no contour outlines. Houses band 3×3 stddev: painting 11.32, live 1.95.
2. **The church glows; the painting's church is drawn** — live spire mean 202 vs painting 84.5;
   the painting's spire sits at its background's value (Δ −0.37) and separates by dark outlines;
   ours separates by brightness (Δ +28).
3. **The warm pigment is missing** — painting village band ~9.8% warm umber/ochre pixels + the
   red-brown roof landmark; live 1.8%, all of it the window rectangles.

**Standing compare:** `npm run compare:village -- <capture-dir>` regenerates
`village-original-vs-live.png` + four trend indicators. The gate is looking at the image.

## The design insight that shapes everything

**The painting's warmth and its pale church are HUE statements inside one narrow nocturne value
band, not brightness statements.** Measured (rect placement verified visually before measuring —
proofs in `output/playwright/village-look-2026-07-22/`):

| What | Rect (painting.jpg 1600×1267) | Mean | Note |
|---|---|---|---|
| Spire body | 20x80+896+950 | lum 84.5 | same value as adjacent sky (84.9) |
| Orange roof | 28x24+700+1042 | rgb(65,47,46) | DARK burnt sienna, not bright orange |
| Window blob | 8x10+774+1078 | rgb(127,124,35) | muted olive-gold, not #f6c651 |
| Umber family | warm-masked over 500x80+560+1005 | rgb(55,46,35) | 9.8% of band |
| Darkest cluster (outlines) | 8-colour census of band | #1C1F23 | the drawing ink |

Every fix adds *hue and drawing*, never brightness. The one thing already too bright (the
church) comes down.

## Colour provenance (the locked criterion, honoured literally)

CLAUDE.md L92: colours sampled from palette.json. The village region's 5-swatch median cut is
all cool — the warm family's weight is too low to surface. Decision 0001 (L103) already names
the compliant route: *"Village warm lights are too small a fraction to surface as a palette
entry; special-case them like `stars`."*

**S0 (new slice, first):** extend `scripts/derive-reference.ts` with a `villageWarm` special
region, exactly as `regions['stars']` is built (derive-reference.ts:554): a targeted collector
over the village rect gathering warm-masked pixels (`r > b×1.15 && r > 30`, the mask used for
the look-pass measurements), median-cut to 3–4 swatches (expected: umber ~rgb(55,46,35), sienna
~rgb(65,47,46), ochre ~rgb(127,124,35), ink ~#1C1F23 if it clusters warm-dark; take what the
cut actually yields). Re-run the derivation; commit palette.json.

**Guard:** `git diff public/reference/palette.json` after the re-run must show ONLY the added
region. If any existing swatch moves, STOP — those colours have passed gates.

`palette.ts` then exposes the new swatches by name (`villageUmber`, `roofSienna`,
`windowOchre`), each a plain `hex('villageWarm', i)` read — no constants, no rect comments
needed in code.

## Colour discipline for every slice (closing the generic-RNG loophole)

- Every base colour is a palette.json swatch (village, villageWarm, hills families already in
  use here).
- Per-stroke variation is VALUE-ONLY jitter on a measured base (the established brushForms
  idiom that passed the island/hills/cypress gates) with stated bounds per use.
- Per-house variation is INTERPOLATION between palette.json village swatches only — no free hue
  rotation anywhere in the pass.
- Backstop: the ΔE census (verification list below) bounded by the locked tolerance (<10).

## Where the code stands (all in `src/scene/BrushVillage.tsx`, 302 lines)

- Houses/church: flat-shaded `pushQuad` solids + `cladQuad` sparse marks (`STROKES_PER_AREA
  230`, halfLen 0.042–0.074, margin 0.12). The sparseness IS gap 1.
- `SPIRE = PALETTE.steeple × 2.05 lerp(white, 0.30)`, `CHURCH = × 1.65 lerp(white, 0.18)` —
  gap 2 is these two lines. `PALETTE.steeple` #556c81 at ×1.0 ≈ lum 104.
- `WINDOW = #f6c651` crisp proud quads — gap 3's sticker read.

## Slices (each: ONE mechanism changed → capture → compare → LOOK → retune, cap 4)

### S0 — villageWarm palette derivation (above). No scene change; flat assets only.

### S1 — drawing pass: dark contour outlines (gap 2's mechanism, gap 1's biggest lever)

`contourEdge(brush, a, b, nLeft, nRight, rng)`: 2–4 jittered dark ribbons along edge a→b.
Contract, explicit:

- `a`/`b` are the SAME corner `Vector3`s the adjacent quads were built from (post-`rot`,
  post-`islandHeightAt`) — passed by the caller, never recomputed.
- `nLeft`/`nRight` are the adjacent faces' unit normals, computed by the caller from those same
  corners (the `pushQuad` cross-product); offset direction = `(nLeft+nRight).normalize()`,
  magnitude 0.008–0.012.
- Each edge is emitted by exactly ONE call site: `pushHouse`/`pushChurch` own their edge lists
  explicitly (eaves, gable rakes, ridge, wall corners; tower corners, spire edges, belfry band,
  church eaves). No edge de-duplication pass — ownership by construction.
- Colour: the drawing ink #1C1F23 family (or its villageWarm/ink swatch if S0 yields one),
  value-only jitter ×0.85–1.15.
- Jitter: 2–4 segments per edge, endpoint inset 0–6% of edge length, perpendicular wobble
  ≤ 0.006 — reads drawn, not vector.

The "spire stays unclad" rule becomes "spire faces stay clean, spire EDGES get drawn".

### S2 — church into the nocturne band (gap 2's arithmetic)

- `SPIRE`: ×2.05 + 0.30 white → ×~1.05, no white lerp (target measured spire mean ≈ 95–115).
- `CHURCH`: ×1.65 + 0.18 white → ×~1.15.
- Trend targets (not gates): spire-vs-sky delta within ±8 (painting −0.37); spire mean ≤ 120.

### S3 — paint density + house differentiation (gap 1) — NO warm pigment in this slice

- `STROKES_PER_AREA` 230 → ~700 first pass; margin 0.12 → 0.06; halfLen ×~1.4; value-kick
  span widened (bounds stated in code).
- Per-house base variation: lerp between village swatches #2a3f6f ↔ #36403f (walls) and
  #26282b ↔ #151b24 (roofs), per-house rng t ∈ [0,1] — the seven houses stop being clones
  without leaving the derived families.
- Watch: marks must not dissolve the gable silhouette — if a roofline goes fuzzy, cap mark
  size before cutting density.

### S4 — warm pigment (gap 3's distributed half) — separated from S3 per one-change-per-capture

- Warm strokes woven into cladding from the S0 swatches: walls/roofs probabilities are FREE
  DIALS (starting guesses 12%/8%), tuned until the compare script's warm fraction approaches
  the painting's 9.78% AND the crop reads right. The dials are not measurements; the outcome is.
- ONE sienna roof on the house left of the church (layout `[-0.2, 0.72]`): base = the S0
  sienna swatch; stroke kicks bounded by the roof rect's measured p90 per channel (measure at
  implementation, record in the slice note).

### S5 — windows as paint (gap 3's sticker fix)

Each crisp window quad → cluster of 2–4 overlapping marks around the same anchor: the S0 ochre
swatch, value-only jitter, irregular sizes/offsets, one core mark at the swatch's upper value
bound so it reads lit. Bloom is gone from the diorama (checklist item 1) — nothing needs
emissive-bright. Belfry window included.

## Out of scope (named so silence cannot grow it)

- No layout changes, no new houses, no village widening (standing composition choice).
- No roof-pitch/geometry reshaping — the "uniform gables" observation stays parked pending the
  threshold-mask check, per the shaded-render trap.
- No new dependencies, no bloom reintroduction, no lighting changes outside the village group.

## Perf (claim softened; measured, not asserted)

Densified cladding ≈ 3–4k extra static quads in the existing three draw calls. They cost
nothing per-frame on the CPU but they ARE rendered every frame. After S3 and again at the end:
`npm run capture:diorama -- --perf` and compare frame-interval stats against the cypress-pass
baseline (todo.md: authored final mean 8.33 ms / p95 9.1 ms at 1600×900). DPR caps untouched
(verify by reading the config, not assuming). Headless/viewport-emulated numbers do NOT close
the locked real-device gate — that remains checklist item 3.

## Verification (every slice, before "done")

1. `npm run capture:diorama -- output/playwright/village-pass-<date>-s<N>`
2. `npm run compare:village -- <that dir>` → LOOK at `village-original-vs-live.png` beside the
   painting; name what still disagrees in words before touching a dial.
3. LOOK at `mobile-centre.png` (CLAUDE.md build loop: desktop + mobile every loop) and at
   `desktop-drag-left/right-boundary` + `desktop-lookdown` for contour-ribbon artefacts
   (z-fighting, floating marks at grazing angles).
4. ΔE census: village-region Lab distribution of the live crop vs the painting's village
   region, `check-cypress-colour.ts` style (honestly regional, not per-pixel), bound <10
   (Tunables). Add `scripts/check-village-colour.ts` in S0 alongside the palette work.
5. `npm run lint` + `npm run test:sky` + `npm run build` green; `npm run check:reduced` still
   byte-identical.
6. Append what was learnt to `tasks/lessons.md` after every slice (CLAUDE.md build loop), not
   only the trend table in the slice note.
7. **If a slice still fails its named gap after 4 retune passes: STOP and ask Mark**
   (CLAUDE.md L73). No quiet fifth pass.

Mark gates on the final captures.

## Cross-review round 1 (Codex, 2026-07-22) — findings and dispositions

- Palette provenance conflict with locked CLAUDE.md L92 → ACCEPTED; resolved via the 0001-L103
  `stars`-style special region (S0), which is stronger than the palette.ts-constants route the
  v1 plan proposed. v1's "cannot come from palette.json" was wrong — the 5-swatch cut can't
  supply warm, but the pipeline is extensible.
- S3 too compound vs the one-change-per-capture lesson (lessons.md:1007) → ACCEPTED; split
  into S3 (density/differentiation) + S4 (warm pigment).
- Done loop missing mobile review + lessons.md appends → ACCEPTED (verification items 3, 6).
- No ΔE validation / no perf measurement / zero-cost claim too strong → ACCEPTED
  (verification item 4; perf section; `--perf` flag confirmed to exist in capture-diorama.mjs).
- Stop-at-cap consequence unstated → ACCEPTED (verification item 7).
- Contour helper contract ambiguous → ACCEPTED; contract made explicit in S1.
- "Colour ranges could drift into generic RNG" → PARTIAL. Value-only jitter on measured bases
  is the established gate-passed brushForms idiom and stays. The real loophole was per-house
  HUE rng — closed: interpolation between palette swatches only, ΔE census as backstop.
- "12%/8% not demonstrated as measured" → REFRAMED, not defended: they are free dials; the
  measured target is the band-level warm fraction (painting 9.78%) plus the look. The plan now
  says so, and the roof stroke range gets measured (p90) rather than cited as "measured range".
