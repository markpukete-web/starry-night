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

The source is `reference/starry-night-source.jpg` (3840 × 3041), decoded through `sips` into
`reference/derived/cypress-work.png` as today (the 1600 px path is dropped). The region is today's
(`u 0.02–0.32, v 0.04–1`). `cypressMask` stays as the seed: the main column's chain, `MIN_RUN_FRACTION` 0.004 of
the width (15 px at 3840, the same paint as 6 px at 1600).

The whole-tree mask, new in `cypress-field.ts`:

```ts
/** The treeish pixels of the box, closed by `close` px, then the 4-connected component holding the main column. */
export function treeComponent(painting: DecodedPNG, box: Box, spans: RowSpan[], close = 1): { mask: Uint8Array; runs: Run[] } {
  const { width, height } = painting
  const x0 = Math.max(0, Math.floor(box.x0)), x1 = Math.min(width, Math.ceil(box.x1))
  const y0 = Math.max(0, Math.floor(box.y0)), y1 = Math.min(height, Math.ceil(box.y1))
  const treeish = new Uint8Array(width * height)
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const i = (y * width + x) * 4
    treeish[y * width + x] = treeishColour(painting.rgba[i] / 255, painting.rgba[i + 1] / 255, painting.rgba[i + 2] / 255) ? 1 : 0
  }
  const closed = close > 0 ? erode(dilate(treeish, width, height, close), width, height, close) : treeish
  const mask = new Uint8Array(width * height)
  const stack: number[] = []
  for (const span of spans) {
    const x = Math.round((span.x0 + span.x1) / 2)
    if (closed[span.y * width + x]) stack.push(span.y * width + x)
  }
  while (stack.length) {
    const i = stack.pop()!
    if (mask[i] || !closed[i]) continue
    mask[i] = 1
    const x = i % width, y = (i - x) / width
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
  return { mask, runs }
}
```

`dilate` and `erode` are square-window passes over a `Uint8Array` (the scratch `field-variants.ts` has them,
`morph`). `satelliteRuns(runs, spans)` becomes pure: the component's runs on a span's row that do not overlap
that span (the signature loses `painting` and `box`; the one caller is the derive script). The crop is the
component's bounding box with a 16 px margin left and right, none above or below; `cropMask` is the component
inside it.

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
  drops `'cypress-skin'` from `WEBP_ASSETS`.

`cypress-field.test.ts`: `treeComponent` closes a 1 px gap in a stripe and leaves a detached blob out; the new
`satelliteRuns`; `orientationField`'s anisotropy is 1 on clean stripes and 0 on a flat field; `blendToVertical`
keeps a 30° stripe field at 30° (anisotropy 1) and pulls an anisotropy-0 texel to vertical.

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
- `cypress-lobes.test.ts`: the fixture test asserts the frond's widest half-width ≤ the runs' half-width + 0.0035
  (no envelope); the real-table test asserts fronds ≥ 2, a frond spanning 0.33–0.53 (the left flame), and, at 41
  heights, the plan's union extent within 0.02 crop widths of the union of `spans` and `satellites` on that row
  (the painting's own extent): the envelope's wedge cannot return. The "needs a flame envelope ≥ 0.1" assertion is
  replaced by that one.

### E1.3 — the tracer (`cypressStrokes.ts`: `traceCypressRibbons`; the dead code goes)

`generateCypressStrokes`, `CYPRESS_STROKE_CONFIG`, `buildTendrilTracks` and their tests are deleted;
`sampleCypressImage` stays. New:

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
    const samples = [...down, { px: sx, py: sy, inside: true }, ...up]
    if (samples.length < 4) continue
    const middle = samples[Math.floor(samples.length / 2)]
    const at = middle.inside ? middle : samples[down.length]
    const colour = sampleColour(painting, ...paintingUV(rows, at.px, at.py))
    output.push({ samples, colour, halfWidth, relief, seed: ribbonSeed })
  }
  return output
}
```

The field is signed up (`signedUpDirection`), so `sign` 1 climbs and −1 descends; a ribbon is its seed with up to
`half` steps each way, so no ribbon is clipped to a stub by the mask's top. The colour is one per ribbon, the
July review's "one pigment per ribbon" kept, at the middle sample, or at the seed when the middle has overshot
into sky. The old rule's "value modulated along the ribbon" is not added: the sky's shader supplies the lanes
and the relief within a stroke.

`cypress-strokes.test.ts`, rewritten: deterministic; every sample inside the mask except at most
`overshootSteps` at either end; the seed has samples on both sides when the fixture mask allows; lengths in
samples within the band's step count ± 2 (a fixture field that is uniformly vertical in a tall mask); a 30°
field bends the ribbon by 30°; the colour on a fixture painting is the texel at the middle; on the real
`cypress-flow.png` (decoded in node), with the real table, the fronds' rows (satellite rows) receive at least 4%
of the ribbons' samples (the flames are clad, not only the main).

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

`cypress-lobes.test.ts` gains: inside the main, the lift is on its ellipse (front depth > 0); at a point under two
lobes, the frontmost; beyond every rim within 0.6, depth 0 and the normal is the view direction; beyond 0.6, null;
the back mirrors the front's depth sign.

### E1.5 — the ribbons on the tree (`BrushCypress.tsx`)

`BrushCypress` loads the flow (`useImageData('/reference/cypress-flow.png')`) beside the painting; the geometry
memo waits for both, and the arrival's `readyRef` stays after the memo as today. In the memo:

```ts
    const plan = buildCypressLobePlan(rowTable)
    const front = traceCypressRibbons(flowData, paintingData, rowTable, CYPRESS_RIBBON_CONFIG.frontCount, 0xc1f3a11)
    const back = traceCypressRibbons(flowData, paintingData, rowTable, Math.round(CYPRESS_RIBBON_CONFIG.frontCount * CYPRESS_RIBBON_CONFIG.backShare), 0xbacc51de)
    const halfWidthWorld = (crop: number) => crop * geometryOptions.sourceToWorld
    for (const [frontFacing, ribbons] of [[true, front], [false, back]] as const) {
      for (const ribbon of ribbons) {
        const points: Vector3[] = [], normals: Vector3[] = [], laterals: number[] = []
        let lobeId = ''
        for (const sample of ribbon.samples) {
          const lift = liftToLobes(plan, sample.px, 1 - sample.py, geometryOptions, frontFacing)
          if (!lift) continue
          normal.set(...lift.normal)
          points.push(point.set(...lift.position).addScaledVector(normal, 0.004).clone())
          normals.push(normal.clone())
          laterals.push(Math.abs(lift.lateral))
          if (points.length === Math.floor(ribbon.samples.length / 2)) lobeId = lift.lobeId
        }
        if (points.length < 3) continue
        const lobe = lobeById.get(lobeId) ?? main
        const colours = normals.map((n) => strokeColour.setRGB(...ribbon.colour, SRGBColorSpace).multiplyScalar(ribbon.relief * SOURCE_STROKE_LIFT * (1 + MOON_LIFT * moonShade(n))).clone())
        const before = arrays.positions.length / 3
        pushBrushRibbon(arrays, points, normals, colours, halfWidthWorld(ribbon.halfWidth), CYPRESS_RIBBON_CONFIG.taper)
        const pushed = arrays.positions.length / 3 - before
        if (pushed !== 0 && pushed !== points.length * 2) throw new Error('cypress ribbon pushed an unexpected vertex count')
        if (pushed === 0) continue
        const lateral = laterals.reduce((s, v) => s + v, 0) / laterals.length
        const [lobeStart, lobeEnd] = [lobe.sections[0].heightFraction, lobe.sections[lobe.sections.length - 1].heightFraction]
        for (let k = 0; k < points.length; k++) {
          const len = k / (points.length - 1)
          const h = 1 - ribbon.samples[k].py   // the k-th kept sample's height; the memo keeps the kept samples' py in step with `points`
          const w = flickerWeight(lobeHeight(h, lobeStart, lobeEnd), lateral, !frontFacing)
          for (const across of [0, 1]) {
            strokeAttr.push(len, across)
            seedAttr.push(ribbon.seed)
            if (alive) pushFlicker(strokeFlicker, w, h)
          }
        }
      }
    }
```

(The build keeps the kept samples' `py` in a parallel array so `h` is the kept sample's, not the raw index's.)
The geometry carries `position`, `color`, `aStroke` (vec2: length 0 base → 1 tip, across 0 left → 1 right), `aSeed`
(one value per ribbon), and with `alive` `aFlicker` as today. `pushBrushRibbon` pushes left then right per point,
so `across` follows that order.

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

`aliveMaterial.ts` gains:

```ts
/** One injection from several: heads and bodies joined in order, uniforms merged; `key` names the program. */
export function concatInjections(key: string, ...parts: Omit<AliveInjection, 'key'>[]): AliveInjection {
  return {
    key,
    uniforms: Object.assign({}, ...parts.map((p) => p.uniforms)),
    vertexHead: parts.map((p) => p.vertexHead).join('\n'),
    vertexBody: parts.map((p) => p.vertexBody).join('\n'),
    fragmentHead: parts.map((p) => p.fragmentHead).join('\n'),
    fragmentBody: parts.map((p) => p.fragmentBody).join('\n'),
  }
}
```

The strokes' injection: `concatInjections('cypress-strokes', { uniforms: {}, ...strokeGlsl })` without `alive`,
`concatInjections('cypress-strokes-flicker', { uniforms: {}, ...strokeGlsl }, { uniforms: strokeUniforms,
...flickerGlsl })` with it, so the flicker multiplies the lit colour. The flicker's `lick` band (0.4–0.75) was
set from the old strokes' lateral quantiles; a node script prints the new ribbons' 75th and 95th percentiles of
mean |lateral| and `CYPRESS_FLICKER.lick` takes them (logged in Tunables).

`sky-alive.test.ts` T19 gains: `concatInjections` joins in order and merges uniforms; `injectAliveSource` with the
concatenated stroke + flicker injection replaces each marker once and the result contains `aStroke`, `aSeed`,
`aFlicker` and `dFdx` before the first `discard`.

**D1, for its revision:** the strokes' and the solid's materials stay `MeshBasicMaterial`, so D1's
`vertexTransform` after `<begin_vertex>` and its `aBend` attribute apply unchanged; `aBend` per stroke vertex is
the kept sample's `h` as `aFlicker.y` is, packed in the same loop; D1's injection joins the concatenation as a
third part.

### E1.7 — the flat gates (`scripts/flat-cypress-gate.ts`, `flat-cypress-lobes.ts`)

`flat-cypress-gate.ts` renders the new ribbons in 2D over the underpaint at the crop's resolution: each ribbon a
polyline of its samples, the tapered width, its one colour × relief, the painting's crop on the left. It is the
first look at the field, the widths, the count and the lengths, before three.js. `flat-cypress-lobes.ts` reads
`uv`. Both read `reference/derived/cypress-work.png` (now 3840).

### E1.8 — the tracing cost and the phone

520 + 130 ribbons × about 50 samples × 2 vertices ≈ 65 k vertices, 63 k triangles, plus the solid's 12 k. The
tracing is about 35 k field reads: a few milliseconds on the main thread in the memo, no worker. The flow PNG
decodes through `useImageData` as the sky's does. `?perf=1` on Mark's iPhone measures it (G9).

## Commits (on `feat/cypress-e1`)

1. `feat(cypress): derive from the 3840 scan, the whole-tree mask, a field that keeps the painting's lean` (E1.1,
   the two flat gates' table reads, the assets, the tests).
2. `feat(cypress): lobes without the invented envelope and tip taper` (E1.2).
3. `feat(cypress): streamline ribbons on the lobes with the sky's stroke body over a dark underpaint` (E1.3–E1.6,
   the dead code's deletion, the flat gate's new renderer).
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
| G7 | `check-cypress-colour.ts` on the capture | ΔE76 per region ≤ 10 (Tunables) |
| G8 | 1:1 crops at the design camera (desktop), the mobile home, and a 60° orbit, beside the painting's | by eye: strokes not a cut-out, the tongues break the outline, the tongues' flaps from the side acceptable or named; anything wrong fixed within the retune cap |
| G9 | `capture:diorama --perf` on the Mac, `?perf=1` on Mark's iPhone | within 3 fps of `main` on the Mac; the phone's number recorded |
| G10 | `check:reduced`, `check:viewport` | PASS, PASS |
| G11 | `?alive=0` and the default, pinned at t 0 and 3.7 | both draw the new tree; the flicker's mean brightness unchanged at t 0 |
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

(Codex, `w4:p4`, after the plan is written: the report's path and each finding's disposition are recorded here.)
