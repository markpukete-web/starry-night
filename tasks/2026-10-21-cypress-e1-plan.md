# E1 — the cypress: plan, 2026-10-21

Slice E1 of the land roadmap (`tasks/todo.md`, "Direction — the land", Mark, 2026-10-21: "we need to redo the
cypress ... silhouette can be improved too"). The tree is rebuilt as Van Gogh's strokes: thick, tapered, curling
ribbons traced as streamlines in the cypress's own flow field, lifted onto the lobe volumes, lit with the moving
sky's stroke body, over a dark underpaint. The lobe volume and the row table stay; the lobes lose two invented
shapes. Built on the Mac on `feat/cypress-e1` from `feat/touch-land` (= `main` `e6567e3` plus the land records).

Mapping (`herdr agent list`, 2026-10-21): Lead `w4:p1` (Claude), Reviewer `w4:p4` (Codex), Worker `w4:p5`
(Gemini). Mark: "Take the lead and ping me if you need me ... any mechanical work put through to worker, while
Codex as peer reviewer ... gated with computer use or playwright before present to me."

Evidence folder: `scratch/cypress-e1-2026-10-21/` (gitignored). The 1:1 crops of the painting's cypress from the
3840 px scan: `painting-full-1to1.png` (the whole tree), `painting-mid-1to1.png` (the body, where the left flame
joins), `painting-top-1to1.png` (the spire's bend). The current render at the design camera:
`output/playwright/e1-measure-2026-10-21/desktop-centre.png`.

## What the painting's cypress is (the 1:1 crops)

- A dark flame 1,588 px tall and 400 px wide at the base in the 3840 px scan (176 × 662 in the 1600 px
  `painting.jpg`). The spire is thin only over the top quarter; from 0.75 of the height down it widens steadily
  (22, 27, 41, 54, 120 px wide at 0.70, 0.65, 0.60, 0.55, 0.50 in 1600 px units). Its tip is a hooked club 36 px
  wide at 0.95, not a needle. The spire leans left between 0.6 and 0.75 and back right near the top.
- A left flame rising to 0.53 of the height, a left-of-centre spike to 0.54, two right tongues at 0.28–0.35.
- The medium: long strokes 8–14 px wide (2–3.5% of the base's width), 100–450 px long in the body (0.06–0.28 of
  the height), 500–700 px in the spire. Dark green for the body, umber and brown for the ridges, a few olive and
  pale green highlights at the edges; dark blue-black between the strokes, the canvas's underpaint showing. The
  strokes lean and curl: the left flame's lean left, the right tongues' curl right, the spire's bend. The outer
  strokes overshoot the mass as tongues; the outline is strokes, not a line.

## What is there today (`src/scene/`)

- `scripts/derive-cypress.ts` derives from the 1600 px `painting.jpg`: `cypressMask` (the longest row-run chain
  with a 1.8 width ratio between rows) gives the main column's spans; `satelliteRuns` the other treeish runs on
  those rows; the structure tensor (σ 4) low-passed (σ 3) and **blended to vertical by an energy-weighted
  coherence**. Outputs `cypress-rows.json` (`x0, y0, width, height` in painting pixels, `spans`, `satellites`),
  `cypress-flow.png` (176 × 662), `cypress-skin.webp`. Nothing at runtime reads the flow or the skin; only
  `sampleCypressImage` is imported from `cypressStrokes.ts`.
- `cypressLobes.ts` builds the plan: the main lobe from the spans (smoothing radius 6, a taper to a point above
  0.9), fronds from satellite chains with an invented **flame envelope** (`peakWidth` ≥ 0.1 crop widths, 35 px
  of 176) and a root bridge to height 0.
- `cypressLobeGeometry.ts` compiles closed elliptical solids (12 × 96 for the main, depth ratio 0.42) and maps a
  (height, lateral) sample to the surface with the lateral clamped to ±0.999.
- `cypressLobeStrokes.ts`: 48 structural ribbons, sinuous, half-width 0.0035, along the lobes; not flow-traced.
- `BrushCypress.tsx`: the solid with the painting's pixels as its texture, lifted ×1.14; the ribbons in one flat
  colour each; both `MeshBasicMaterial`, the flicker through `injectAlive`.
- `cypressStrokes.ts`: `generateCypressStrokes` (the old flow tracer, 9 steps, read by `flat-cypress-gate.ts`
  only) and `buildTendrilTracks` (read by its tests only). Both dead at runtime.

## Measured, 2026-10-21 (before any design)

**The 2D silhouette, the lobe plan against the painting** (the scratch script `silhouette-table.ts`, the
painting's treeish component at 1600 px, 2 px closing, against `lobeIntervalsAt` at 21 heights, in crop pixels):

| height | painting width | plan width | note |
|---|---|---|---|
| 0.05–0.25 | 141–166 | 155–164 | within 13 px |
| 0.30 | 120 (244–363) | 161 (226–386) | frond-1's envelope adds a 226–293 wedge the painting lacks |
| 0.40 | 122 (238–263, 276–359) | 132 (225–276, 278–355) | frond-1 13 px too far left, twice the flame's width |
| 0.50–0.70 | 22–120 | 23–126 | within 6 px |
| 0.90 | 38 | 36 | |
| 0.95 | **36** | **22** | the taper above 0.9 makes a needle of the painting's club |
| frond-1's tip | 0.53 | 0.541 | right |

So of last night's three silhouette claims, one survives measurement (the spire's tip is wrong: a needle for a
club) and two do not: the plan is not thin through the middle, and the left tongue rises where the painting's
does. The frond's invented envelope is the measured defect in the body: a wedge 13–18 px too far left from 0.30
to 0.45. The render reads thinner than the plan because its medium dissolves at the rims (the render-space table
below).

**The render against the painting** (`render-silhouette.ts`, the design camera, `alive=0`, the treeish component
of the capture, 576 px tall, scaled ×1.149 to the painting's crop; `render-sil2-table.txt`, `-masks.png`):

| height | painting width | render width (scaled) |
|---|---|---|
| 0.05–0.10 | 158–165 | 164–170 |
| 0.15–0.35 | 118–150 | **159–179** |
| 0.40 | 121 | **187** (the frond's wedge, plus a 10 px sky-stroke bridge) |
| 0.45–0.50 | 119–122 | 132–162 (a 30 px bridge to dark sky strokes at 0.50) |
| 0.55–0.80 | 22–106 (0.75–0.80 are sky strokes in the painting's component) | 20–46, within 8 px of the spire's 22–54 |
| 0.90–0.95 | 36–38 | 28–48 (the tip's run is 24–28 px; the rest a bridge) |

The render is as wide as the painting or wider at every height but the tip. The elliptical lobes (depth ratio
0.42) seen from the design camera's bearing add width to the plan's, and the frond's wedge adds more. "Too thin
through the middle" is not in the render. The thinness is an impression: the solid's lit blue-grey texture at
the rims dissolves into the sky, and the spire reads as a flat strip. The medium is the defect, as the roadmap
says; the silhouette work is the tip's club and the frond's wedge, both small. The treeish rule bridges the
render's tree to dark sky strokes touching it (the 0.40, 0.50 and 0.95 rows); G5's script opens the mask by 1 px
before the flood to cut hairlines, and compares the trunk's run only.

**The flow field** (`field-histogram.ts`, `field-variants.ts`; coherence-weighted share of the mask's texels by
angle from vertical):

| field | beyond 15° | beyond 25° |
|---|---|---|
| shipped 1600 px, σ 4/3, blended | **1.2%** | 0.0% |
| 3840 px, σ 6/5, blended as today | 6.1% | 0.5% |
| 3840 px, σ 6/5, unblended (low-passed only) | 50.0% | 27.7% |
| 3840 px, σ 6/5, blend gated on anisotropy 0.1–0.35 | 28.2% | 13.6% |

The shipped field is vertical: 94% of its weight within 10° of vertical. Streamlines traced in it are straight
vertical ribbons, the cut-out again. The lean is in the painting: the overlays `field-3840-s6-unblended-mid.png`
and `-spire.png` show the unblended ticks leaning with the left flame, curling with the right tongues and bending
with the spire. The cause is `blendToVertical`'s weight: the energy-normalised coherence averages 0.25–0.4 on a
dark tree, so the blend pulls two thirds of the way to vertical everywhere. The structure tensor's anisotropy
(magnitude over trace, no energy term) averages 0.32 and is below 0.2 on only 23% of the mask: it says where the
orientation is real.

**The mask at 3840** (`mask-3840-close1.png`): the treeish pixels closed by 1 px, the 4-connected component holding
the main column, 352,568 px: the main flame, the whole left flame to its tip, the left-of-centre spike, the right
tongues, and no sky. The 1600 px mask holds the main column only (49,941 px); the left flame was never in it,
which is why the old field is vertical there too (no mask, no tensor, the vertical fallback).

## Design

### E1.1 — the derivation at 3840 (`scripts/derive-cypress.ts`, `scripts/lib/cypress-field.ts`)

Two resolutions. **The seed stays at 1600:** `cypressMask(painting1600, box)` on `painting.jpg` as today (its
chain is validated: 662 rows, the whole main column). On the 3840 scan the same extractor returns a 69-row
fragment (Codex F1, run on a fresh `sips` decode: the scan's canvas weave and pale speckles split the rows' runs
and the chain's width-ratio test breaks), so the scan is never seeded from itself. The seed's spans are scaled by
`scan.width / painting.width` (2.4) into the scan. **Everything else is at 3840:** `reference/starry-night-source.jpg`
decoded through `sips` into `reference/derived/cypress-work.png`; `painting.jpg` into `cypress-work-1600.png`.

**The domain** is the scaled seed's bounding box, 16 px wider on each side, nothing above or below. The flood
cannot leave it, so the terrain the tree stands on, treeish and joined to the base, stays out (Codex F2: the
first draft's flood through the whole region reached 1,377,073 px over the landscape, y 144–3039). The whole-tree
mask, new in `cypress-field.ts`:

```ts
/** A pixel box, x1 and y1 exclusive. */
export type Domain = { x0: number; y0: number; x1: number; y1: number }

/**
 * The treeish pixels inside `domain`, closed by `close` px, then the 4-connected component holding the seed spans'
 * centres. Nothing outside the domain is read or marked: the domain is the validated main column's box, so the
 * terrain joined to the base cannot be flooded into (Codex F2).
 */
export function treeComponent(scan: DecodedPNG, domain: Domain, seeds: RowSpan[], close = 1): { mask: Uint8Array; runs: Run[]; bounds: Domain; pixels: number } {
  const { width, height } = scan
  const x0 = Math.max(0, domain.x0), x1 = Math.min(width, domain.x1)
  const y0 = Math.max(0, domain.y0), y1 = Math.min(height, domain.y1)
  const treeish = new Uint8Array(width * height)
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const i = (y * width + x) * 4
    treeish[y * width + x] = treeishColour(scan.rgba[i] / 255, scan.rgba[i + 1] / 255, scan.rgba[i + 2] / 255) ? 1 : 0
  }
  const closed = close > 0 ? erode(dilate(treeish, width, height, close, { x0, y0, x1, y1 }), width, height, close, { x0, y0, x1, y1 }) : treeish
  const mask = new Uint8Array(width * height)
  const stack: number[] = []
  for (const span of seeds) {
    const x = Math.round((span.x0 + span.x1) / 2)
    if (span.y >= y0 && span.y < y1 && x >= x0 && x < x1 && closed[span.y * width + x]) stack.push(span.y * width + x)
  }
  let pixels = 0
  const bounds = { x0: x1, y0: y1, x1: x0, y1: y0 }
  while (stack.length) {
    const i = stack.pop()!
    if (mask[i] || !closed[i]) continue
    mask[i] = 1
    pixels++
    const x = i % width, y = (i - x) / width
    bounds.x0 = Math.min(bounds.x0, x); bounds.x1 = Math.max(bounds.x1, x + 1)
    bounds.y0 = Math.min(bounds.y0, y); bounds.y1 = Math.max(bounds.y1, y + 1)
    if (x > x0) stack.push(i - 1)
    if (x < x1 - 1) stack.push(i + 1)
    if (y > y0) stack.push(i - width)
    if (y < y1 - 1) stack.push(i + width)
  }
  const runs: Run[] = []
  for (let y = y0; y < y1; y++) {
    let start = -1
    for (let x = x0; x <= x1; x++) {
      const on = x < x1 && mask[y * width + x] === 1
      if (on && start < 0) start = x
      if (!on && start >= 0) { runs.push({ y, x0: start, x1: x - 1 }); start = -1 }
    }
  }
  return { mask, runs, bounds, pixels }
}
```

`dilate` and `erode` are square-window passes over a `Uint8Array` confined to the domain (the scratch
`field-variants.ts` has the unconfined form, `morph`). `satelliteRuns(runs, spans)` becomes pure: the component's
runs on a span's row that do not overlap that span (the signature loses `painting` and `box`; the one caller is
the derive script, the spans in scan pixels). The crop is the domain; `cropMask` is the component inside it.

**The derive script guards before it writes anything:** the component's height ≥ 0.95 × the domain's, its width
≤ the domain's, 250,000 ≤ `pixels` ≤ 450,000 (the scratch run: 352,568 px over 1589 rows), the seed's chain ≥ 600
rows at 1600; otherwise it throws with the numbers. The rows JSON records `component: { bounds, pixels, rows }`
so the tests assert the shipped table's facts without decoding the scan.

The field: `orientationField(luminance, cropMask, 6)` gains a fourth output, `anisotropy = magnitude / trace`
(0 when the trace is 0), and keeps `coherence` for the overlay. `lowPassOrientation(..., 5)`. The blend:

```ts
/** Fall back to vertical only where the tensor has no orientation: confidence = smoothstep(0.05, 0.15, anisotropy). */
export function blendToVertical(cos2, sin2, anisotropy): { cos2; sin2 }   // the body unchanged, `confidence` from the smoothstep
```

The flow PNG: R and G the signed-up direction as today; **B = 0 outside the mask, inside `max(1, round(anisotropy
× 255))`**; alpha 255 everywhere. The mask rides in B rather than alpha because `useImageData` reads through a
2D canvas, which premultiplies: a texel with alpha 0 comes back with R = G = 0, and the tongues' overshoot steps
read the field just outside the mask. The runtime's tracer reads "inside" as B > 0.

Outputs:

- `public/reference/cypress-flow.png`, the crop at the scan's resolution (about 454 × 1589; measured size in the
  gate, halved by a box filter in double-angle space if it exceeds 400 KB).
- `public/reference/cypress-rows.json`: `{ uv: [u0, v0, u1, v1], width, height, spans, satellites }`. `uv` is the
  crop's box in painting-normalised coordinates (the scan and `painting.jpg` share them); `width`, `height` the
  crop's pixels; `spans` crop-normalised as today; `satellites` crop pixels as today. `x0`, `y0` go. The readers:
  `BrushCypress.tsx` (`sourceTexel`, the solid's UVs: painting u = `uv[0] + px · (uv[2] − uv[0])`, v likewise),
  `flat-cypress-lobes.ts`, `flat-cypress-gate.ts` (`x0 = uv[0] · work.width`), the lobe tests' real-table test.
- `reference/derived/cypress-skin-source.png` (the crop, alpha = the mask) for the flat gates and
  `check-cypress-colour.ts`; `cypress-mask-overlay.png`, `cypress-field-overlay.png` as today, the field overlay
  with the tick's green set by anisotropy.
- `public/reference/cypress-skin.webp` is deleted: no runtime reader (`grep`, 2026-10-21), and `slim-reference.ts`
  drops `'cypress-skin'` from `WEBP_ASSETS`. The derive script no longer writes a public skin PNG or its
  nearest-colour fill; the skin exists only as `reference/derived/cypress-skin-source.png`.

`cypress-field.test.ts`: `treeComponent` on a fixture trunk joined to a wide treeish terrain band below the
domain's last row marks the trunk to that row and no terrain pixel (the F2 control); a detached blob stays out; a
1 px gap closes; the new `satelliteRuns`; `orientationField`'s anisotropy is 1 on clean stripes and 0 on a flat
field; `blendToVertical` keeps a 30° stripe field at 30° (anisotropy 1) and pulls an anisotropy-0 texel to
vertical; the shipped `cypress-rows.json`'s `component` is within the guard's ranges and its `rows` ≥ 1,500.

### E1.2 — the lobes without the invented shapes (`cypressLobes.ts`)

- `mainLobe`: `smoothSourceSections(raw, 3)`; the block that multiplies `sourceHalfWidth` above 0.9 is deleted.
  The tip's club is the spans'.
- `frondLobe`: `peakWidth` and `flameEnvelope` are deleted. The sections are the chain's runs, smoothed by 3,
  `sourceHalfWidth ≥ 0.0035`. The root sits `0.05` tree heights below the chain's base (clamped to 0), centred
  on the main's centre at that height, with the chain's base half-width; the bridge is four linear steps as today.
  The tip is the chain's top run with half the run's half-width (a natural point), no extension.
- `buildCypressLobePlan`'s defaults scale with the table: `minTrackRows = round(0.042 · rows.height)` (28 at 662,
  67 at 1589), `horizontalTolerancePx = round(0.006 · rows.height)` (4, 10), `maxRowGap` 2, `maxFronds` 5,
  `maxRimDistance` 3. Explicit options still win (the fixtures pass them).
- `cypress-lobes.test.ts`, every assertion the new shapes contradict named (Codex F7: two retained ones fail on
  the new shapes, 0.4966 against a `< 0.35` tip bound, equal widths against a `>` envelope bound):
  - "persistent detached paint becomes a connected frond": the frond's widest half-width ≤ the runs' half-width +
    0.0035 (no envelope) replaces nothing; the containment assertions stay.
  - "the real plan retains the strongest mid-height frond": fronds ≥ 2; a frond spanning 0.33–0.53 (the left
    flame); at 41 heights the plan's union extent within 0.02 crop widths of the union of `spans` and
    `satellites` on that row (the painting's own extent, so the envelope's wedge cannot return); the tip's width
    at 1.0 ≥ 0.8 × the width at 0.95 (a club; the old `< 0.35` asserted the needle). The "needs a flame envelope
    ≥ 0.1" assertion goes.
  - "frond geometry can broaden without sampling the surrounding blue sky": deleted; its replacement asserts
    `paintHalfWidth === sourceHalfWidth` and `paintCenter === sourceCenter` on every frond section above the
    bridge (the paint domain is the source domain now).
  - "multi-scale source strokes stay inside their owning lobe" goes with `cypressLobeStrokes.ts` (E1.3).
  - "closed lobe rings project to their source intervals" and "front and back lobe surfaces preserve source x"
    stay as they are; the normal blend (E1.4) is checked by the new lift tests.

### E1.3 — the tracer (`cypressStrokes.ts`: `traceCypressRibbons`; the dead code goes)

`generateCypressStrokes`, `CYPRESS_STROKE_CONFIG`, `buildTendrilTracks` and their tests are deleted;
`sampleCypressImage` stays. `cypressLobeStrokes.ts` (the 48 sinuous ribbons) and `CYPRESS_LOBE_STROKE_CONFIG`
are deleted too: the tracer replaces them. `sky-alive.test.ts` T14 built its fixture on
`generateCypressLobeStrokes`; it moves onto the new path (E1.5's `ribbonFlicker`), so the flicker's packing is
tested where the runtime packs it (Codex F7). New:

```ts
export const CYPRESS_RIBBON_CONFIG = {
  /** front ribbons; the back takes `backShare` of the count */
  frontCount: 520,
  backShare: 0.25,
  /** a ribbon's length as a fraction of the crop's height, log-uniform between these; the spire's are longer */
  minLength: 0.07,
  maxLength: 0.3,
  spireHeight: 0.6,
  spireLengthScale: 1.5,
  /** the integration step, a fraction of the crop's height: 3 px at 1589 rows */
  step: 0.0019,
  /** half-widths in crop widths: the painting's lanes are 8–14 px of 454 */
  minHalfWidth: 0.009,
  maxHalfWidth: 0.016,
  /** steps a ribbon may run past the mask at either end: the tongues breaking the outline */
  overshootSteps: 4,
  /** the tip's width as a share of the base's: the stroke draws out upward */
  taper: 0.45,
  reliefSpread: 0.035,
} as const

export type CypressRibbonSample = { px: number; py: number; inside: boolean }
export type CypressRibbon = {
  samples: CypressRibbonSample[]
  /** the seed's sample object (an element of `samples`): the kept run's anchor in the lift */
  seedSample: CypressRibbonSample
  /** source sRGB 0..1 at the middle sample, or the seed's when the middle is a tongue over sky */
  colour: [number, number, number]
  /** crop widths */
  halfWidth: number
  relief: number
  seed: number
}

const paintingUV = (rows: { uv: [number, number, number, number] }, px: number, py: number): [number, number] => [
  rows.uv[0] + px * (rows.uv[2] - rows.uv[0]),
  rows.uv[1] + py * (rows.uv[3] - rows.uv[1]),
]

/** Streamlines in the cypress's own field, grown both ways from a seed inside the mask. Deterministic in `seed`. */
export function traceCypressRibbons(
  flow: ImageData2D,
  painting: ImageData2D,
  rows: { uv: [number, number, number, number] },
  count: number,
  seed: number,
  config = CYPRESS_RIBBON_CONFIG,
): CypressRibbon[] {
  const random = mulberry32(seed)
  const inside = (px: number, py: number) => sampleCypressImage(flow, px, py).b > 0
  const direction = (px: number, py: number): [number, number] => {
    const t = sampleCypressImage(flow, px, py)
    const dx = (t.r / 255) * 2 - 1
    const dy = (t.g / 255) * 2 - 1
    const m = Math.hypot(dx, dy) || 1
    return [dx / m, dy / m]
  }
  const stepPx = config.step * (flow.height - 1)
  const walk = (px: number, py: number, sign: 1 | -1, steps: number): CypressRibbonSample[] => {
    const out: CypressRibbonSample[] = []
    let x = px * (flow.width - 1), y = py * (flow.height - 1), outside = 0
    for (let k = 0; k < steps; k++) {
      const [dx, dy] = direction(x / (flow.width - 1), y / (flow.height - 1))
      x += sign * dx * stepPx
      y += sign * dy * stepPx
      if (x < 0 || y < 0 || x > flow.width - 1 || y > flow.height - 1) break
      const sample = { px: x / (flow.width - 1), py: y / (flow.height - 1), inside: inside(x / (flow.width - 1), y / (flow.height - 1)) }
      if (!sample.inside && ++outside > config.overshootSteps) break
      out.push(sample)
    }
    return out
  }
  const output: CypressRibbon[] = []
  for (let index = 0; index < count; index++) {
    let sx = 0, sy = 0, seeded = false
    for (let attempt = 0; attempt < 200 && !seeded; attempt++) {
      sx = random()
      sy = random()
      seeded = inside(sx, sy)
    }
    if (!seeded) continue
    const spire = 1 - sy > config.spireHeight ? config.spireLengthScale : 1
    const length = Math.exp(Math.log(config.minLength) + random() * (Math.log(config.maxLength) - Math.log(config.minLength))) * spire
    const half = Math.max(2, Math.round(length / config.step / 2))
    const halfWidth = config.minHalfWidth + random() * (config.maxHalfWidth - config.minHalfWidth)
    const relief = 1 - config.reliefSpread + random() * config.reliefSpread * 2
    const ribbonSeed = random() * 1000
    const up = walk(sx, sy, 1, half)
    const down = walk(sx, sy, -1, half).reverse()
    const seedSample: CypressRibbonSample = { px: sx, py: sy, inside: true }
    const samples = [...down, seedSample, ...up]
    if (samples.length < 4) continue
    const middle = samples[Math.floor(samples.length / 2)]
    const at = middle.inside ? middle : seedSample
    const colour = sampleColour(painting, ...paintingUV(rows, at.px, at.py))
    output.push({ samples, seedSample, colour, halfWidth, relief, seed: ribbonSeed })
  }
  return output
}
```

The field is signed up (`signedUpDirection`), so `sign` 1 climbs and −1 descends; a ribbon is its seed with up to
`half` steps each way, so no ribbon is clipped to a stub by the mask's top. The colour is one per ribbon, the
July review's "one pigment per ribbon" kept, at the middle sample, or at the seed when the middle has overshot
into sky. The old rule's "value modulated along the ribbon" is not added: the sky's shader supplies the lanes
and the relief within a stroke.

`cypress-strokes.test.ts`, rewritten: at least 400 ribbons come back on the real asset (no vacuous pass on an
empty result); deterministic; every sample inside the mask except at most `overshootSteps` at either end; the
seed has samples on both sides when the fixture mask allows; lengths in samples within the band's step count ± 2
(a fixture field that is uniformly vertical in a tall mask); a 30° field bends the ribbon by 30°; the colour on a
fixture painting is the texel at the middle. **Frond coverage** (Codex F3: a row count is not coverage, and the
draft's "4% of samples on satellite rows" passed on the main-only mask with 59% of samples on those rows and
none inside a satellite run): on the real `cypress-flow.png` with the real table, the inside-mask samples that
lie within a satellite run's x-span on its row are at least 3% of all inside samples, and every frond lobe of
`buildCypressLobePlan(rows)` holds at least 40 such samples within its own intervals. The negative control: the
same tracer on a copy of the flow whose B channel is zeroed outside the main spans gives 0 for both.

### E1.4 — the lift onto the lobes' union (`cypressLobeGeometry.ts`)

`mapCypressLobeSurface` changes in two lines: the lateral clamp is ±1.6 (not ±0.999), and the normal blends to
the design camera's direction at the rim and beyond it, so a rim stroke faces the camera instead of turning edge
on, and a tongue beyond the rim is a flat flap in the rim's plane:

```ts
  const lateral = Math.min(1.6, Math.max(-1.6, sample.lateral))
  const depthUnit = Math.sqrt(Math.max(0, 1 - lateral * lateral))   // 0 beyond the rim
  ...
  const k = smoothstep(0.7, 1, Math.abs(lateral))
  const blended = [
    (screenX[0] * normalAcross + viewDirection[0] * normalDepth) / normalLength * (1 - k) + viewDirection[0] * facing * k,
    0,
    (screenX[2] * normalAcross + viewDirection[2] * normalDepth) / normalLength * (1 - k) + viewDirection[2] * facing * k,
  ]
  const normal = normalised(blended)
```

A 2D path can cross from a frond into the main; mapped per lobe it would jump in depth at the boundary. The
lift takes the union's front surface:

```ts
export type CypressLift = CypressLobeSurfacePoint & { lobeId: string; lateral: number }

/** The frontmost lobe surface under a crop point, or the nearest rim's plane within `maxOvershoot` laterals beyond every lobe. */
export function liftToLobes(plan: CypressLobePlan, px: number, heightFraction: number, options: CypressLobeSolidOptions, frontFacing: boolean, maxOvershoot = 0.6): CypressLift | null {
  const viewDirection = [Math.cos(options.bearing), 0, Math.sin(options.bearing)] as const
  const facing = frontFacing ? 1 : -1
  let best: CypressLift | null = null
  let bestDepth = -Infinity
  let nearest: { lobe: CypressLobe; lateral: number } | null = null
  let nearestOver = Infinity
  for (const interval of lobeIntervalsAt(plan, heightFraction)) {
    const lobe = plan.lobes.find((l) => l.id === interval.lobeId)!
    const centre = (interval.left + interval.right) / 2
    const half = Math.max(1e-6, (interval.right - interval.left) / 2)
    const lateral = (px - centre) / half
    if (Math.abs(lateral) <= 1) {
      const point = mapCypressLobeSurface(lobe, { heightFraction, lateral, sourceX: px }, options, frontFacing)
      const depth = facing * (point.position[0] * viewDirection[0] + point.position[2] * viewDirection[2])
      if (depth > bestDepth) { bestDepth = depth; best = { ...point, lobeId: lobe.id, lateral } }
    } else if (Math.abs(lateral) - 1 < nearestOver) {
      nearestOver = Math.abs(lateral) - 1
      nearest = { lobe, lateral }
    }
  }
  if (best) return best
  if (!nearest || nearestOver > maxOvershoot) return null
  const point = mapCypressLobeSurface(nearest.lobe, { heightFraction, lateral: nearest.lateral, sourceX: px }, options, frontFacing)
  return { ...point, lobeId: nearest.lobe.id, lateral: nearest.lateral }
}
```

The normal is for the moon's shade only (a 4% term): the strip's frame and its offset do not come from it (E1.5),
so a lobe switch's normal jump (37.8° at h 0.35 on the real plan, Codex F5) cannot move a vertex.

`cypress-lobes.test.ts` gains: inside the main, the lift is on its ellipse (front depth > 0); at a point under two
lobes, the frontmost; beyond every rim within 0.6, depth 0 and the normal is the view direction; beyond 0.6, null;
the back mirrors the front's depth sign; **continuity**: sweeping px across the real plan's frond-to-main
intersection at h 0.35 and 0.38 in steps of 1e-4, the lifted position moves by less than 0.0005 per step
(the depth is the union's maximum, which is continuous; the draft's offset along the normal jumped 0.0026).

### E1.5 — the ribbons on the tree (`BrushCypress.tsx`)

`BrushCypress` loads the flow beside the painting, with the hook's error path (Codex F11: a failed flow request
left no tree): `const flowData = useImageData('/reference/cypress-flow.png', onFlowError)` where `onFlowError`
sets `flowFailed` and logs `console.error('[cypress] the flow field failed to load; the tree draws its underpaint
only')`. The geometry memo's dependency list is `[alive, paintingData, flowData, flowFailed]` (Codex F10: the
draft kept `[alive, paintingData]`, so a flow resolving after the painting would never rebuild). It returns null
until `paintingData` and either `flowData` or `flowFailed`; with `flowFailed` it builds the solid alone and an
empty stroke geometry. The arrival's `readyRef` follows the memo as today, so the tree is ready on the solid in
that case.

**The strip is draped, not built from a normal** (Codex F4: a width built in 3D from the centreline's normal lies
in a plane that cuts into the solid at the rim; the raycast put the strip's interior 0.0029 world units inside
the solid at lateral 1). The ribbon's two edges are computed in crop space and lifted on their own, so both sit
on the union surface; the offset toward the camera is along the view direction, which is continuous where the
lift switches lobes (F5). In `cypressStrokes.ts`:

```ts
export type RibbonEdges = { left: [number, number]; right: [number, number] }[]

/** The strip's edges in crop-normalised units: the 2D normal of the path (isotropic in pixels), ± the tapered half-width. */
export function ribbonEdges(ribbon: CypressRibbon, width: number, height: number, taper: number): RibbonEdges {
  const n = ribbon.samples.length
  const sx = (p: CypressRibbonSample) => p.px * (width - 1)
  const sy = (p: CypressRibbonSample) => p.py * (height - 1)
  const halfPx = ribbon.halfWidth * (width - 1)
  return ribbon.samples.map((p, k) => {
    const a = ribbon.samples[Math.max(0, k - 1)], b = ribbon.samples[Math.min(n - 1, k + 1)]
    const tx = sx(b) - sx(a), ty = sy(b) - sy(a)
    const m = Math.hypot(tx, ty) || 1
    const nx = -ty / m, ny = tx / m
    const w = halfPx * (1 + (taper - 1) * (k / (n - 1)))
    return {
      left: [(sx(p) + nx * w) / (width - 1), (sy(p) + ny * w) / (height - 1)],
      right: [(sx(p) - nx * w) / (width - 1), (sy(p) - ny * w) / (height - 1)],
    }
  })
}
```

In `brushForms.ts`, beside `pushBrushRibbon` (which stays for its other users):

```ts
/** Append a strip from two edge polylines already on the surface: left[i], right[i] per step, two triangles per step. */
export function pushDrapedRibbon(arr: BrushArrays, left: Vector3[], right: Vector3[], colors: Color[]): void {
  if (left.length < 2 || right.length !== left.length || colors.length !== left.length) return
  const base = arr.positions.length / 3
  for (let i = 0; i < left.length; i++) {
    arr.positions.push(left[i].x, left[i].y, left[i].z, right[i].x, right[i].y, right[i].z)
    const c = colors[i]
    arr.colors.push(c.r, c.g, c.b, c.r, c.g, c.b)
  }
  for (let i = 0; i < left.length - 1; i++) {
    const a = base + i * 2
    arr.indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
  }
}
```

In the memo:

```ts
    const plan = buildCypressLobePlan(rowTable)
    const view = new Vector3(Math.cos(geometryOptions.bearing), 0, Math.sin(geometryOptions.bearing))
    const front = traceCypressRibbons(flowData, paintingData, rowTable, CYPRESS_RIBBON_CONFIG.frontCount, 0xc1f3a11)
    const back = traceCypressRibbons(flowData, paintingData, rowTable, Math.round(CYPRESS_RIBBON_CONFIG.frontCount * CYPRESS_RIBBON_CONFIG.backShare), 0xbacc51de)
    for (const [frontFacing, ribbons] of [[true, front], [false, back]] as const) {
      const facing = frontFacing ? 1 : -1
      for (const ribbon of ribbons) {
        const edges = ribbonEdges(ribbon, flowData.width, flowData.height, CYPRESS_RIBBON_CONFIG.taper)
        // the seed is the kept run's anchor: a null below it restarts the run, a null above it ends it (a split
        // strip is never joined across a gap)
        const seedIndex = ribbon.samples.indexOf(ribbon.seedSample)
        const left: Vector3[] = [], right: Vector3[] = [], kept: { h: number; lateral: number; lobeId: string }[] = []
        for (let k = 0; k < ribbon.samples.length; k++) {
          const h = 1 - ribbon.samples[k].py
          const l = liftToLobes(plan, edges[k].left[0], 1 - edges[k].left[1], geometryOptions, frontFacing)
          const r = liftToLobes(plan, edges[k].right[0], 1 - edges[k].right[1], geometryOptions, frontFacing)
          const c = liftToLobes(plan, ribbon.samples[k].px, h, geometryOptions, frontFacing)
          if (!l || !r || !c) {
            if (k < seedIndex) { left.length = 0; right.length = 0; kept.length = 0; continue }
            break
          }
          left.push(new Vector3(...l.position).addScaledVector(view, facing * 0.004))
          right.push(new Vector3(...r.position).addScaledVector(view, facing * 0.004))
          kept.push({ h, lateral: Math.abs(c.lateral), lobeId: c.lobeId })
        }
        if (kept.length < 3) continue
        const lobe = lobeById.get(kept[Math.floor(kept.length / 2)].lobeId) ?? main
        const shade = 1 + MOON_LIFT * moonShade(normal.set(...liftToLobes(plan, ribbon.seedSample.px, 1 - ribbon.seedSample.py, geometryOptions, frontFacing)!.normal))
        const colour = strokeColour.setRGB(...ribbon.colour, SRGBColorSpace).multiplyScalar(ribbon.relief * SOURCE_STROKE_LIFT * shade).clone()
        pushDrapedRibbon(arrays, left, right, kept.map(() => colour))
        const flicker = ribbonFlicker(kept, lobe, !frontFacing)   // [w, h] per kept sample
        for (let k = 0; k < kept.length; k++) {
          for (const across of [0, 1]) {
            strokeAttr.push(k / (kept.length - 1), across)
            seedAttr.push(ribbon.seed)
            if (alive) pushFlicker(strokeFlicker, flicker[k][0], flicker[k][1])
          }
        }
      }
    }
```

`CypressRibbon` gains `seedSample` (the seed's sample object, so the memo finds its index without a search by
value). `ribbonFlicker(kept, lobe, back)` lives in `cypressFlicker.ts`: the ribbon's mean |lateral| over its kept
samples and, per sample, `flickerWeight(lobeHeight(h, lobe.start, lobe.end), lateral, back)` with `h`; T14 tests
it on a fixture (a tip run, a tongue run, a back run). The geometry carries `position`, `color`, `aStroke` (vec2:
length 0 base → 1 tip, across 0 left → 1 right), `aSeed` (one value per ribbon), and with `alive` `aFlicker`.
`pushDrapedRibbon` pushes left then right per step, so `across` follows that order. One colour per ribbon, the
moon's shade from the seed's normal: a lobe switch cannot change a ribbon's colour along its length.

**Clearance test** (`cypress-lobes.test.ts`, with three's `Raycaster` under node): for 40 ribbons on the real plan
and the real flow, every strip vertex, cast along the view direction from the camera's side, meets the compiled
solid at or behind the vertex (the draft's centreline-only check could not see the strip's interior inside the
solid).

The solid loses its map and its `uv` attribute: `MeshBasicMaterial({ color: CYPRESS_UNDERPAINT, toneMapped:
false, side: DoubleSide })`, `CYPRESS_UNDERPAINT = new Color('#151c1b')`, the palette's darkest cypress entry
(`palette.json`, L 9.6). The strokes are L 15–30, so the gaps read as the painting's dark separations. The
flicker on the solid is unchanged (`solidShare` 0.5 through the same injection; `h` from the compiled source v).

The strokes' material: `MeshBasicMaterial({ vertexColors: true, toneMapped: false, side: DoubleSide,
alphaToCoverage: true })` with the stroke injection (E1.6), and with `alive` the flicker's concatenated after it.
`alphaToCoverage` dithers the stroke's shaped edge across the canvas's MSAA samples, so the rounded head and the
flanks are antialiased without sorting; three leaves `OPAQUE` undefined when it is set, so `diffuseColor.a`
reaches the framebuffer. The ribbons draw at `renderOrder` 3 over the solid at 2 as today.

### E1.6 — the stroke body (`src/scene/cypressStrokeShader.ts`, new; `aliveMaterial.ts`)

The sky's stroke body (`PaintingFlowSky3D.tsx`, `movingFrag`, 2026-10-11: the rounded head, the bristle lanes,
the rake relief, the rim, the dry tail) copied as an injection for `MeshBasicMaterial`, static: no sliding
period, no life fade, no night lift, no `0.93` line. The sky's GLSL is not touched (it has byte-identity gates);
the duplication is a named follow-up.

```ts
export const strokeGlsl: Omit<AliveInjection, 'key' | 'uniforms'> = {
  vertexHead: /* glsl */ `
  attribute vec2 aStroke;
  attribute float aSeed;
  varying vec2 vStroke;
  flat varying float vSeed;`,
  vertexBody: /* glsl */ `
  vStroke = aStroke;
  vSeed = aSeed;`,
  fragmentHead: /* glsl */ `
  varying vec2 vStroke;
  flat varying float vSeed;
  float cyHash1(float n) { return fract(sin(n) * 43758.5453); }
  float cyNoise1(float x) { float i = floor(x); float f = fract(x); return mix(cyHash1(i), cyHash1(i + 1.0), f * f * (3.0 - 2.0 * f)); }
  vec2 cyNoise1d(float x) { float i = floor(x); float f = fract(x); float h0 = cyHash1(i); float h1 = cyHash1(i + 1.0); return vec2(mix(h0, h1, f * f * (3.0 - 2.0 * f)), (h1 - h0) * 6.0 * f * (1.0 - f)); }`,
  fragmentBody: /* glsl */ `
  {
    // the sky's stroke body (PaintingFlowSky3D.tsx movingFrag), static. Derivatives first, before any discard.
    vec2 g = vec2(dFdx(vStroke.y), dFdy(vStroke.y));
    float aa = max((abs(g.x) + abs(g.y)) * 1.5, 1e-4);
    float w = vStroke.x;
    float x = abs(w - 0.5) * 2.0;
    float y = abs(vStroke.y - 0.5) * 2.0;
    float side = vStroke.y * 2.0 - 1.0;
    float seed = cyHash1(vSeed + 3.1) * 40.0;
    // a full base and a drawn-out tip: the painting's cypress strokes are flames
    float r = pow(max(1.0 - pow(x, 2.5), 0.0), 0.4) * mix(1.0, 0.72, w) * (0.9 + 0.1 * cyNoise1(w * 9.0 + seed));
    float a = 1.0 - smoothstep(r - aa, r, y);
    vec2 lane1 = cyNoise1d(side * 4.5 + seed + w * 0.8);
    vec2 lane2 = cyNoise1d(side * 11.0 + seed * 1.7 - w * 1.5);
    float streak = 0.62 * lane1.x + 0.38 * lane2.x;
    float streakSlope = 0.62 * 4.5 * lane1.y;
    // dry brush toward the tip: the thin lanes break first
    if (streak < smoothstep(0.7, 1.0, w) * 0.7) discard;
    if (a < 0.02) discard;
    float facing = dot(g / max(length(g), 1e-6), vec2(-0.6, 0.8));
    float lit = (side - 0.12 * streakSlope) * facing;
    float rake = 1.0 + 0.5 * lit;
    float relief = (0.86 + 0.12 * (1.0 - y * y)) * rake;
    float bristle = mix(0.8, 1.1, streak);
    float rim = mix(0.72, 1.0, 1.0 - smoothstep(0.6, 0.95, y));
    vec3 col = diffuseColor.rgb * relief * bristle * rim;
    // the sheen at half the sky's: a dark tree takes a grey cast from 0.18
    col += pow(max(lit, 0.0), 3.0) * 0.09;
    col = mix(col, col * 1.15 + 0.03, smoothstep(0.75, 0.95, streak) * 0.4);
    float lum = dot(col, vec3(0.299, 0.587, 0.114));
    diffuseColor.rgb = clamp(mix(vec3(lum), col, 1.3), 0.0, 1.05);
    diffuseColor.a *= a;
  }`,
}
```

The derivatives are taken before the first `discard`, as the sky does. `flat varying` compiles under three's
GLSL ES 3.0 prefix as `flat out` / `flat in`, as the sky's `movingVert` already does. The functions are prefixed
`cy` so a future shared chunk cannot collide.

`aliveMaterial.ts` gains the optional vertex transform D1 needs (D1.2 pulled forward, so the concatenation
carries it from the start; Codex F6: the draft's concatenator copied four fields and would have dropped D1's
transform silently) and the concatenator:

```ts
export type AliveInjection = {
  ...
  /** Vertex main, after `<begin_vertex>`: a displacement of `transformed` (D1's bend). Optional. */
  vertexTransform?: string
}

// in injectAliveSource, after the <color_vertex> replacement:
  if (injection.vertexTransform) vertex = replaceOnce(vertex, '#include <begin_vertex>', `#include <begin_vertex>\n${injection.vertexTransform}`)

/** One injection from several: heads, bodies and transforms joined in order, uniforms merged; `key` names the program. */
export function concatInjections(key: string, ...parts: Omit<AliveInjection, 'key'>[]): AliveInjection {
  const transforms = parts.map((p) => p.vertexTransform).filter((t): t is string => Boolean(t))
  return {
    key,
    uniforms: Object.assign({}, ...parts.map((p) => p.uniforms)),
    vertexHead: parts.map((p) => p.vertexHead).join('\n'),
    vertexBody: parts.map((p) => p.vertexBody).join('\n'),
    fragmentHead: parts.map((p) => p.fragmentHead).join('\n'),
    fragmentBody: parts.map((p) => p.fragmentBody).join('\n'),
    ...(transforms.length ? { vertexTransform: transforms.join('\n') } : {}),
  }
}
```

The strokes' injection: `concatInjections('cypress-strokes', { uniforms: {}, ...strokeGlsl })` without `alive`,
`concatInjections('cypress-strokes-flicker', { uniforms: {}, ...strokeGlsl }, { uniforms: strokeUniforms,
...flickerGlsl })` with it, so the flicker multiplies the lit colour. The flicker's `lick` band (0.4–0.75) was
set from the old strokes' lateral quantiles; a node script prints the new ribbons' 75th and 95th percentiles of
mean |lateral| and `CYPRESS_FLICKER.lick` takes them (logged in Tunables).

`sky-alive.test.ts` T19 gains: `concatInjections` joins in order, merges uniforms and carries a part's
`vertexTransform`; `injectAliveSource` with the concatenated stroke + flicker + a bend part (an `aBend` head and
a nonzero transform) applied to three's real `MeshBasicMaterial` vertex and fragment text replaces each marker
once, places exactly one nonzero transform after `<begin_vertex>`, and the result contains `aStroke`, `aSeed`,
`aFlicker`, `aBend` and `dFdx` before the first `discard`; a part without a transform leaves `<begin_vertex>`
untouched; distinct keys for the bend variants.

**D1, for its revision:** the strokes' and the solid's materials stay `MeshBasicMaterial`, and E1 ships the
optional `vertexTransform` with its application after `<begin_vertex>`, so D1's bend joins the concatenation as a
third part with its own key; `aBend` per stroke vertex is the kept sample's `h` as `aFlicker.y` is, packed in the
same loop. D1's plan must name the keys it uses (`cypress-strokes-bend`, `cypress-strokes-flicker-bend`) and the
draped packing as the vertex order it reads.

### E1.7 — the flat gates (`scripts/flat-cypress-gate.ts`, `flat-cypress-lobes.ts`)

`flat-cypress-gate.ts` renders the new ribbons in 2D over the underpaint at the crop's resolution: each ribbon a
polyline of its samples, the tapered width, its one colour × relief, the painting's crop on the left. It is the
first look at the field, the widths, the count and the lengths, before three.js. `flat-cypress-lobes.ts` reads
`uv`. Both read `reference/derived/cypress-work.png` (now 3840).

### E1.8 — the colour gate re-registered (`scripts/check-cypress-colour.ts`, `scripts/lib/silhouette.ts`)

The gate maps the whole source crop onto a fixed rectangle of the capture (`400–548 × 96–670`), which is the
old main column's box; with the crop widened to the flames that stencil misregisters and the left flame falls
outside the means (Codex F9). And it passes on a capture with no tree at all: every stencil pixel rejected, the
means NaN, `NaN >= 10` false, exit 0 (Codex F8). Both go:

- `scripts/lib/silhouette.ts` takes `treeComponent`, `extent`, `runsOf` and `trunkRun` out of
  `cypress-silhouette.ts`, which imports them; `check-cypress-colour.ts` imports them too.
- Each side is masked by one rule, its own treeish component (the painting's at 1600 around the table's crop, the
  render's in the design-camera crop), and its regions are thirds of its own tree's height. No projection, no
  stencil.
- A region with fewer than 1,000 pixels on either side, or a non-finite mean, fails the gate with the counts
  printed; the rejected share is printed and bounded at 0.5.
- The negative control is part of G7: the script run on a sky-only crop of the same capture must exit 1.

### E1.9 — the tracing cost and the phone

Codex's probe of the draft on the shipped field (F12): 520 + 130 ribbons averaged 75 samples (the length band's
log-uniform mean is 0.15 of the height, 79 steps), 97,338 stroke vertices and 96,038 triangles after the lift and
the strip, plus the solid's 2,210 vertices and 3,936 triangles; the trace, lift and strip took about 144 ms in
node on the Mac. On the 3840 field the step is the same fraction of the height, so the counts hold within the
seeds' variation. The build runs once in the memo on the main thread during the arrival's hold; the memo logs
its duration in development (`performance.now()` around the build) and `?perf=1` shows it. G9 carries the bars.
If the phone's build exceeds 1.5 s the tracing moves to a worker, a named follow-up, not E1.

## Commits (on `feat/cypress-e1`)

1. `feat(cypress): derive from the 3840 scan, the whole-tree mask, a field that keeps the painting's lean` (E1.1,
   the two flat gates' table reads, the assets, the tests).
2. `feat(cypress): lobes without the invented envelope and tip taper` (E1.2).
3. `feat(cypress): streamline ribbons on the lobes with the sky's stroke body over a dark underpaint` (E1.3–E1.6,
   the dead code's deletion, the flat gate's new renderer, the colour gate on the shared silhouette helpers,
   E1.8).
4. `docs(tasks): E1's record and gate`, with the Tunables entry.

## Tests (node, `test:sky`)

- CF the field: E1.1's list.
- CL the lobes and the lift: E1.2's and E1.4's lists.
- CS the tracer: E1.3's list.
- SA the injections: E1.6's T19 extension.
- Every existing test that the deleted code owned goes with it; every other test stays green.

## Gate (this session; Mark's taste gate follows, on captures)

| # | Check | Pass when |
|---|---|---|
| G1 | Red first | CF, CL, CS, SA fail before their code lands; pass after |
| G2 | `test:sky`, `tsc -b`, build, eslint on `src` and `scripts` | all green |
| G3 | The derive overlays at 1:1 (`cypress-field-overlay.png`, the mid and spire crops) | the ticks follow the strokes' lean on the left flame, the right tongues and the spire; the mask covers the flames and no sky |
| G4 | The flat gate (`cypress-flat-gate.png`) beside the painting's crop, looked at | the ribbons read as the painting's strokes in count, width, length and lean; named differences, retuned within the cap |
| G5 | The silhouette in render space: `scripts/cypress-silhouette.ts` (a 1 px opening before the flood, the trunk run per height, the masks scaled to the painting's crop and aligned on the trunk's base centre, the IoU) on the design-camera capture (`alive=0`), the crop cut at the tree's base. Today's baseline (`sil-baseline-table.txt`): IoU 0.654, the tip at 0.95 is 0.18 of the painting's width, the trunk 17–58 px wider from 0.15 to 0.35 | IoU ≥ 0.75; the tip's width at 0.95 ≥ 0.8 × the painting's; the width table looked at and its worst rows named |
| G6 | Local contrast, the July recipe (3 × 3 standard deviation over the trunk, painting 6.45; today's render 2.01, re-measured 2026-10-21 on `e1-measure-2026-10-21/desktop-centre.png`, `local-contrast.log`) | ≥ 4.0 and ≤ 7.5 |
| G7 | `check-cypress-colour.ts` (E1.8) on the capture, and on a sky-only crop of it | ΔE76 per region ≤ 10 (Tunables), every region ≥ 1,000 pixels on both sides, the rejected share ≤ 0.5; the sky-only run exits 1 |
| G8 | 1:1 crops at the design camera (desktop), the mobile home, and a 60° orbit, beside the painting's | by eye: strokes not a cut-out, the tongues break the outline, the tongues' flaps from the side acceptable or named; anything wrong fixed within the retune cap |
| G9 | `capture:diorama --perf` on the Mac; the memo's build time in the dev log; Mark's `?perf=1` on his iPhone at the taste gate | the Mac within 3 fps of `main`; the build under 1 s on the Mac; the phone ≥ 50 fps (the locked bar is 30, today's reading 60) and its build time recorded; a phone build over 1.5 s is a named follow-up (a worker), not a pass |
| G10 | `check:reduced`, `check:viewport` | PASS, PASS |
| G11 | `?alive=0` and the default, pinned at t 0 and 3.7 | both draw the new tree; the flicker's mean brightness unchanged at t 0 |
| G11b | The flow's failure and the load orders, headed (Playwright): the flow URL aborted; the painting delayed past the flow; the flow delayed past the painting | aborted: the underpaint solid draws, the arrival proceeds, the console carries the one error; both orders: the full tree draws |
| G12 | Codex code review, then `tasks/2026-10-21-cypress-e1.md` | no P0 or P1 open |

Retune cap: 4 passes per slice (Tunables). Mark sees the G8 crops and a Playwright capture set, never the code.

## Risks

- **The field's lean is noise where the strokes are dense.** G3 looks at the ticks at 1:1 before anything is
  built; the fallback is σ 9/6 (the lean survives it: 48.5% beyond 15°) or a stronger gate.
- **The tongues are fins from the side.** A flap in the rim's plane is edge-on at 90° of orbit. The orbit's
  polar limits keep the view within ±15° of azimuth for the home, and the 60° capture in G8 judges the rest.
- **The underpaint reads black.** `#151c1b` is the painting's darkest cypress colour; G6 bounds the contrast
  from both sides and Mark's eye decides between `#151c1b` and `#2e3743`.
- **One colour per ribbon flattens the brown-green alternation.** The seed lands on a brown or a green stroke of
  the painting at 1600 px (2.4 scan px per texel, inside one 8–14 px lane), so the alternation comes from the
  seeds. G4 shows it in 2D.
- **The back reads bare at 25%.** The orbit capture decides; the knob is `backShare`.

## Follow-ups (not E1)

- The stroke body as one GLSL chunk shared by the sky and the cypress (the sky's byte-identity gates make that a
  slice of its own).
- E2 reuses `treeComponent` and the field pipeline for the olive trees and the ground strokes.

## Review

Codex (`w4:p4`, read-only, 2026-10-21, `scratch/cypress-e1-2026-10-21/review-report.md`, against `9cb1c96`; it
ran a fresh `sips` decode of the scan with the draft's mask and flood, the draft's tracer and lift in memory on
the shipped assets, raycasts against the real compiled solid, the injections against three r184's real basic
shader, and the colour gate's negative control): **REVISE**, two P1s, ten P2s. Each finding was checked against
the code and the scratch runs; each holds. The dispositions, all folded into the design above:

- F1 (P1) `cypressMask` on the 3840 scan returns 69 rows, not the tree → the seed stays at 1600 (validated) and
  is scaled into the scan; the derive guards the chain length and the component's bounds (E1.1).
- F2 (P1) the flood ran through the whole region into the terrain, 1.38 M px → the flood is confined to the
  seed's box (16 px of side margin, none below); the terrain-joined fixture test; the shipped table's
  `component` facts asserted (E1.1).
- F3 (P2) "satellite rows" counted rows, not coverage, and passed on the main-only mask → inside-mask samples
  within satellite runs, per frond, with a main-only negative control (E1.3).
- F4 (P2) a strip built from the centreline's normal cuts into the solid at the rim (0.0029 inside) → both edges
  computed in crop space and lifted on their own (`ribbonEdges`, `pushDrapedRibbon`); the raycast clearance
  test (E1.5).
- F5 (P2) the offset along a switching normal jumped 0.0026 at a frond-to-main boundary → the offset along the
  view direction, which the union's continuous depth keeps continuous; the continuity sweep test; the normal
  shades only, from the seed (E1.4, E1.5). The suggested continuous frame is not needed once nothing is built
  from the normal.
- F6 (P2) the concatenator dropped D1's `vertexTransform` → the optional field and its application after
  `<begin_vertex>` ship in E1, carried by the concatenator; T19 tests the three-part injection on the real
  shader text; the D1 paragraph corrected (E1.6).
- F7 (P2) two retained lobe assertions contradict the new shapes, T14 tests the old generator → every affected
  assertion enumerated and rewritten (E1.2); `cypressLobeStrokes.ts` deleted; T14 moved onto `ribbonFlicker`
  (E1.3, E1.5).
- F8 (P2) the colour gate passes with no tree (NaN) → region minimums, finite means, the rejected share bounded,
  a sky-only negative control in G7 (E1.8).
- F9 (P2) the colour gate's stencil is the old main-column rectangle → each side masked by its own treeish
  component with one shared rule, regions by its own thirds, no projection (E1.8). Codex suggested the
  silhouette gate's alignment; the render's own mask needs no alignment and the shared helpers make both gates
  one rule.
- F10 (P2) the memo's dependency list omitted the flow → `[alive, paintingData, flowData, flowFailed]` (E1.5).
- F11 (P2) a failed flow request left no tree → the hook's error callback, the solid alone, the one console
  error, G11b headed (E1.5).
- F12 (P2) the vertex estimate was 65 k against 97 k measured, and the phone had no bar → the measured counts,
  the build time logged, the phone's bar 50 fps and 1.5 s (E1.9, G9).
- Also from the report, taken: the derive writes no public skin PNG (E1.1); a strip is split at a null, never
  joined across one (E1.5).

Checked sound by the reviewer and kept as designed: the frontmost selection and the depth mirror (13,959 grid
points, error below 7e-17); the normal's blend values at the rim; the overshoot's null beyond 1.6; the injection
on three r184's basic shader (one `<common>` and one `<color_fragment>`, `flat varying` under the ES 3.0 prefix,
the derivatives before the discards, `OPAQUE` undefined under alpha-to-coverage so the shaped alpha reaches
`gl_FragColor`); the B-channel mask against the canvas's premultiplication and `sampleCypressImage`; the `uv`
readers; the deletions' readers.

The revision goes back for a bounded confirmation read (the twelve dispositions, BUILD or the ones still open),
in parallel with the first commit's build, which stops on an open P1.
