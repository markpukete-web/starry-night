# The cypress, second pass — source-locked cladding

Status: DESIGN APPROVED (Mark, 2026-07-21, live). Written after Mark read the piece and said the
cypress had room for improvement. This is the "second painterly refinement pass" the old README
promised and never scheduled.

## The thesis

The cypress is an identity object — after the sky it is what says *Starry Night* — and it is
currently the piece's weakest authored form. It is built from palette constants and short
procedural marks. Apply the lesson the sky already paid six rounds to learn: **stop synthesising
Van Gogh, use the painting's own pixels.**

Same mechanism as the offline inpaint pipeline (`docs/decisions/0003-inpaint-extend.md`), scaled
down to one object: derive from the scan offline, let the runtime render what was derived.

## What is wrong today — three gaps, named against the painting

Judged by cropping the cypress from `output/playwright/webp-2026-07-21/desktop-centre.png` and
from `public/reference/painting.jpg` and holding them side by side.

1. **It reads near-black.** The painting's cypress is deep green shot through with warm umber and
   sienna, with real hue variation. Ours is effectively a silhouette. Suspected cause is stacked
   attenuation: `CORE = PALETTE.cypress × 0.68`, `GREEN = PALETTE.cypressGreen × 0.95`, then
   `moonShade` multiplies again on top.
2. **It reads as fur, not flame.** `STROKES = 3600` short outward marks give a pelt texture. The
   painting's strokes are long and sinuous, running the height of the form — that is what makes it
   lick upward. `tasks/lessons.md` already names this "the cypress fur trap" and records it
   recurring on a new form.
3. **The silhouette is bulbous.** It swells at mid-height and pinches to a neck before the tip,
   reading a little like a plume. The painting tapers more continuously and splits into fronds,
   with wispy tendrils breaking the edge into the sky.

## The measurement that shaped the design

Structure-tensor statistics from `flow-field.png`, cypress pixels only (sky-mask excluded):

| region | mean coherence | orientation |
|---|---|---|
| cypress (own pixels) | **0.134** | **47% of texels within 75–105°** — strongly vertical |
| sky (control) | 0.327 | near-uniform across all 15° bins |

Two consequences, and both are load-bearing:

- **Direction is not the bug.** The cypress has a strong global vertical character and the current
  marks already point roughly that way. The defect is stroke **length**, which is what separates
  fur from flame. This narrows the fix.
- **Raw per-pixel flow cannot be integrated.** At 0.134 coherence, long streamlines through the
  unsmoothed field would wander into spaghetti. The field must be low-passed, and low-confidence
  areas must fall back to something principled rather than to noise.

## Design

### Offline — two derived assets

A **new script, `scripts/derive-cypress.ts`** (`npm run derive-cypress`), not a new slice of
`extend-reference.ts` — that file is already ~37 KB and about the sky; a separate concern gets a
separate file. Dependency-free in the established style (Node `zlib` PNG IO via
`scripts/lib/png.ts`, macOS `sips` for JPEG decode, plain arithmetic), deterministic, committed
outputs, unit-tested like `inpaint.ts`.

**`public/reference/cypress-flow.png`** — structure-tensor orientation over the cypress region only, low-passed at
σ≈3. Where coherence is weak the field blends toward the measured global vertical, weighted by
`1 − coherence`, so low-confidence texels fall back to the tree's dominant character. Stored
signed, destination-sign-aligned — the 2026-07-16 rule, since sign-flipped neighbours are what
made donated sky flow fight its own circulation.

**`public/reference/cypress-skin.webp`** — the painting's actual cypress pixels, isolated with the
existing `treeishColour` gate from `scripts/lib/fill-region.ts`. Reused deliberately: it is
already proven on this exact material, and inventing a second colour heuristic for the same
object would be a new way to be wrong.

Formats follow the rule established 2026-07-21 and are not a free choice: **flow stays PNG**
(signed vector data, and lossless WebP is bigger for flow), **skin ships lossless WebP** (colour
data, ~40% under PNG). `cypress-skin` must therefore be added to `WEBP_ASSETS` in
`scripts/slim-reference.ts`; the bake writes PNG and `npm run slim-reference` prepares the shipped
set, as with every other reference asset.

### Runtime — four changes to `BrushCypress.tsx`

The form stays a real closed 3D solid. That is locked by the diorama contract, and it is what
makes gaps between strokes read as deep shadow rather than sky-void.

1. **Long strokes replace short marks.** ~2,000–2,500 strokes, each seeded on the surface and
   integrated along `cypress-flow` for roughly 8–15% of tree height, replacing 3,600 stubs. Reuses
   the integrate-along-flow approach the sky ribbons already use (`streamlineGeometry.ts`).
2. **Colour sampled from `cypress-skin` along each stroke's length**, so hue varies down the
   stroke as it does in the paint. This is where the umber and green return.
3. **Drop the darkening.** The `× 0.68` / `× 0.95` multipliers go; `moonShade` becomes a light
   touch rather than the main value term. The painting's own value structure is already correct
   and does not want re-shading on top.
4. **Strokes make the silhouette, not the mesh.** Reduce `tongue()` displacement amplitude and let
   rim-crossing strokes break the outline into tendrils — the 2026-07-14 lesson ("a spiky
   silhouette is usually the MESH, not the strokes") applied in reverse.

### Mapping front to back

Painting-space `u` wraps across the front 180° of the form, so the painting's cypress edges land
exactly on the form's silhouette edges. The invented back 180° continues by mirrored offset — the
same style-continuation principle as the S4 side strips.

This follows Mark's acceptance call (2026-07-21): **head-on is judged against the painting; the
back only has to not break it.** The back sits behind the form at every allowed orbit angle.

## Verification

1. **Flat review first, before anything enters 3D.** Render the derived field and a flat stroke
   layout and hold them against the painting crop. The cypress ghost cost six rounds partly
   because everything was judged in 3D, where the loop is slow and comparison is hard. If the
   strokes do not read as flame flat, they will not in 3D.
2. **Then 3D captures** — head-on plus both orbit boundaries, cropped and zoomed on the cypress,
   against the `webp-2026-07-21` baseline crop.
3. **Then Mark's gate.** Claude flags what still looks wrong; the call is Mark's.

Standing instrument rules from `tasks/lessons.md` apply: a capture diff means nothing without a
same-assets control run, and capture RMSE cannot measure anything that alters load timing.

## Risks, and what happens when they fire

- **Strokes may still wander** despite low-passing, given 0.134 coherence. Mitigation is the
  confidence-weighted blend toward global vertical. If they still wander, the fallback is to
  author the direction field parametrically as a flame flow and use the painting for colour only —
  **that is a change of approach, so it comes back to Mark rather than being switched quietly.**
- **The profile may be wrong at source.** The bulbous swell might be `extractCypressSlices`'
  `lumMax: 90` picking up shadow as trunk, not `tongue()` noise at all. Determine which before
  touching either — do not tune both and claim the credit.
- **Retune cap is 4 passes** (Tunables). If the flat review still fails after four, stop and bring
  it to Mark rather than grinding.

## Scope boundaries

Untouched: village, hills, island, sky assets, camera contract. Ideas these raise go to
`tasks/todo.md` as notes, not into this pass.

**Not promised: that this lands in one pass.** The sky needed a full offline pipeline and several
gates. This is the same class of problem on a smaller object.

## Acceptance

The locked criteria that bear on this work:

- Colours sampled from the painting, no drift beyond ΔE < 10 per region.
- Head-on, the diorama reads as *Starry Night*'s composition.
- 60 fps desktop / 30 fps mid-tier mobile — stroke count must not regress this. 2,000–2,500 long
  strokes against 3,600 short ones is a reduction in count but an increase in vertices per stroke;
  budget must be measured, not assumed.
- `prefers-reduced-motion` still state unaffected (the cypress does not animate).
