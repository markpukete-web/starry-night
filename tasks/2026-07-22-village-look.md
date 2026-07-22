# Village look — checklist item 8, step 1 (2026-07-22)

The look pass per the plan of record: fresh captures at HEAD, matched crops, gaps named against
the painting, then the measurements the gaps implied. No design or code yet.

**Evidence:** `output/playwright/village-look-2026-07-22/` — `vil-compare-1x.png` (1:1 matched
crops, painting above / live below), `vil-compare.png` (~2.3× both, for reading comfort),
`steeple-check2.png` (measurement rect placement proof).

**Standing compare (agreed with Mark, same day):** `npm run compare:village -- <capture-dir>`
(`scripts/compare-village.mjs`) regenerates `village-original-vs-live.png` in any capture
directory and prints the three gap indicators (houses stddev, spire luminance + spire-vs-sky
delta, warm-pigment fraction) as TREND numbers between passes. The gate stays visual — look at
the emitted image; the numbers only say whether a retune moved toward or away from the painting.
Baseline at HEAD (2026-07-22): stddev 11.32/1.95 · spire 84.50/202.34 · delta −0.37/+28.02 ·
warm 9.78%/1.82% (painting/live).

**Crop provenance:** painting `800x254+448+836` (village region rect from palette.json);
live `560x260+560+440` on `desktop-centre.png` (1600×900). Live crop scaled to source height
for the 1:1 read.

## Named gaps (in the cypress style — concrete, aimable)

1. **Reads as unlit game boxes, not painted houses.** Flat single-tone navy walls, flat charcoal
   roofs, no visible strokes at 1:1, no dark contour outlines. The painting draws every house:
   dark cloisonnist outline, per-face stroke work, each roof and wall its own mix.
   - Measured: 3×3 local stddev over the houses band — painting **11.3**, live **1.9**.
     (Cypress calibration: painting 6.45 / render 2.01 was judged minor — but the village band
     carries nearly double the cypress region's paint energy, so the relative gap is ~2× worse
     than the one Mark already accepted. The number supports the read; the read is the claim.)

2. **The church glows; the painting's church is drawn.** Live spire mean luminance **202** vs the
   painting's **84.5** — and in the painting the spire sits at the SAME value as its sky background
   (84.5 vs 84.9), separated by dark outlines and the dark belfry band, not by brightness. Ours is
   the brightest mass in the composition and separates by being white. First read ("the steeple
   value is inverted — painting's is dark") was WRONG — the zoom check + measurement corrected it
   before it became a design input. The painting's church is *pale but held inside the nocturne
   band and outlined*; ours escapes the band entirely.

3. **The warm pigment is missing.** The painting's village band carries a substantial warm
   umber/ochre family (~8.6% of the crop, #4A3E2F class — plus the orange-red roof landmark left
   of the church). The live crop's only warm pixels are the window rectangles (~1.2%, #C1AB6E) —
   and those read as hard-edged UI stickers, not the painting's irregular ochre glow blobs
   bleeding into the wall strokes.

## Observation held back from the gap list (needs the mask check first)

The render's rooflines look like uniform same-pitch pyramid gables — repeated copies — where the
painting's are varied and irregular. This is a SHAPE claim from a shaded render, which the cypress
trap list forbids acting on without thresholding both images to bare masks first. Verify before it
becomes a design input, if it matters after the three named gaps are addressed.

## Not raised as a defect (scope)

The painting's village spreads much wider, with more houses receding right; the diorama's compact
huddle is a standing composition choice, not a painterly gap. Widening the village would be scope
growth — noted here per CLAUDE.md rather than built.

## What the measurements imply for the design (not yet a design)

- The fix is a *painting* problem, not a lighting problem: outlines, per-face stroke variance, and
  warm pigment mass. The cypress source-projection technique may be overkill — the village is
  small, distant and geometric; authored per-face brush cladding (the technique already on the
  hills/island) with drawn dark contours and a warm accent family may be the right weight.
- The church needs to come DOWN in value (~200 → ~120s at most) and gain its dark drawn edges;
  the windows need to become irregular warm blobs, not rectangles.
