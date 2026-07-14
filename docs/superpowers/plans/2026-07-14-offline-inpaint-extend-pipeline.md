# Offline inpaint + extend pipeline — filling the cypress hole and the side voids at asset-bake time

Status: PROPOSED (Mark reviewing). Written 2026-07-14 after six runtime rounds on the cut-out
ghost (value → chroma gates → grain → density → bold → containment) each improved but none
passed Mark's eye.

## The thesis

Stop synthesising Van Gogh at runtime. The painting itself contains every stroke the
reconstruction needs — so copy real, flow-aligned patches of the painting's own sky into the
problem regions **offline**, bake the result as derived assets (Phase-0 style), and let the
runtime simply render them. The bar explicitly permits this: *"Motion and colour are derived
from the painting itself"* — a patch-based fill is literally the painting's own pixels.

Two problems, one mechanism:

1. **The cypress cut-out hole** (and its mask-missed wisp fringes) — currently reconstructed by
   runtime heuristics (donor colour lookups, Jacobi-relaxed fill grid, mirrored grain, bold
   synthetic ribbons). Each heuristic narrowed the gap; the residual "statistical seam" remains
   findable because generated texture is not Van Gogh's hand.
2. **The left/right side voids** — flat night gradient beside the canvas, the piece's biggest
   "painting on a card" tell. The locked bar sanctions continuing the derived style beyond the
   canvas edge.

## Why offline wins

- **The review loop collapses.** We judge flat image crops directly against the painting and
  iterate until the fill is indistinguishable — before anything enters the 3D scene. Today every
  iteration costs a capture drive and still under-samples the angles Mark actually looks from.
- **Higher quality ceiling.** Real patches carry true stroke statistics (width, curvature,
  colour variety, impasto ridges) that no synthesiser matched in six rounds.
- **The runtime gets simpler, not more baroque.** skyDonorUV, treeishColour gates, the fill
  grid + DataTexture + alpha override, the bold-ribbon path, and the hole flow grid all get
  DELETED. The wash samples one texture; the ribbons sample the same one.
- **Deterministic, committed, testable** — same virtues as `derive-reference.ts`.

## Deliverables

New script `scripts/extend-reference.ts` — dependency-free (macOS `sips` for JPEG↔PNG, Node
`zlib` for PNG IO, plain TS; same constraints as `derive-reference.ts`). Outputs, committed
under `public/reference/`:

| Asset | What |
|---|---|
| `painting-filled.png` | The painting with the cypress hole + chroma-detected wisps inpainted with real sky patches. Same dimensions as `painting.jpg` — a drop-in for wash + ribbons. |
| `signed-flow-filled.png` | The signed flow with the same regions filled by copying flow from wherever each colour patch came from — coherent by construction (no Jacobi smoothing). |
| `sky-extend-left.png` / `sky-extend-right.png` (+ flow strips) | Style-continued extensions past the canvas edges, energy fading outward. Separate strips so the original canvas mapping — and therefore the faithful front — stays pixel-identical. |
| `docs/decisions/000N-inpaint-extend.md` | Method, parameters, provenance — Phase-0 discipline. |

## The fill region (S1)

Union of: raw sky-mask holes within the sky band; chroma-detected tree wisps (the measured
warm-olive + near-neutral dark grey-green families, already proven in `treeishColour`); a small
dilation margin so the feathered edge goes too. Deliverable: an overlay visualisation crop —
reviewed by eye before any filling.

## The inpainting algorithm (S2 — the heart)

Criminisi-style exemplar inpainting, kept simple and deterministic:

- Work at the painting's full committed resolution.
- Onion-peel the fill region boundary in priority order (structure-first: boundary pixels whose
  surrounding flow runs INTO the hole fill first, so stroke streams continue before texture
  fills the calm areas).
- For each target patch (~13×13, tune 9–21): search solid-sky source patches within a generous
  radius, **biased along the local flow orientation** (rotate/select candidates whose flow
  matches), score by SSD on RGB + a flow-orientation agreement term, copy the best with a
  feathered blend. Record the source offset per patch.
- Fill the flow field using the recorded offsets — the flow comes from the same place the paint
  came from.
- Determinism: exhaustive scored search over a fixed candidate lattice (no RNG), so reruns are
  byte-identical.
- Star/moon protection: source patches containing bright cores/halos are excluded from donation
  (luminance gate) so no phantom stars appear in the fill.

**Honest fallback if Criminisi-lite seams visibly:** manually-assisted donation — hand-picked
donor rectangles per hole zone (still the painting's own pixels, still offline-reviewable).
Less elegant, equally faithful; the offline loop makes it viable.

## Side extension (S4, after S2 proves the machinery)

- Measure first: from the drag-boundary projection, how many degrees of extra canvas the orbit
  actually exposes → choose margin (~25–35% per side, evidence-based).
- Same patch machinery, seeded from the edge columns, search domain = the whole sky, plus an
  outward energy/brightness falloff into the night gradient.
- **Hard negative carried over:** no invented anchors — no stars, no moon, no hero swirls in the
  extension. Texture and flow only.
- Runtime mounting: widen the source rect in `dioramaSkyProjection` to cover the strips; move
  `dioramaSourceEdgeFade` outward; ribbons integrate across the extended flow; delete
  `SkyEdgeBackfill`. The original canvas region renders pixel-identical.

## Runtime swap (S3)

- Wash: sample `painting-filled` — washFrag returns to a plain sample + skyBand discard. Delete
  uFill, the fill grid, the alpha override.
- Ribbons: sample `painting-filled`; delete skyDonorUV / treeishColour gates / bold path / hole
  flow grid (`signed-flow-filled` replaces it). Keep hole seeding (the holes are now real sky).
- Tests migrate: donor/fill unit tests are replaced by script-level tests on synthetic images
  (fill region detection; determinism; "no bright-core donation"); runtime keeps the
  determinism + bounds tests.

## Verification

- **Offline gate (the big one):** flat crops of the filled region beside untouched painting sky
  at 1× and 2× — iterate until indistinguishable to my eye, then Mark reviews the IMAGE, not the
  app. Cheap loop, honest judge.
- Runtime: full capture set (home / both drag boundaries / look-down / mobile / nopost) — the
  head-on front must be pixel-identical outside the fill region (assert with an image diff).
- `npm run check:reduced` unchanged-green; fps sanity on Mark's machine after (S4 adds ribbon
  count for the extension — budget within Tunables).

## Slices & rough effort

1. **S1** — script skeleton, PNG/JPEG IO reuse, fill-region mask + overlay visual. (small)
2. **S2** — inpainting core, offline iteration to a passing crop; bake filled assets. (the big
   one; one solid session)
3. **S3** — runtime swap + heuristic deletion; capture-verified. (half session)
4. **S4** — side extension bake + mounting; drag-boundary gate. (one session)

Gate points for Mark: end of S2 (the flat-image verdict — nothing 3D changes until this
passes) and end of S4 (drag-boundary look).

## Risks

- Patch inpainting on bold impasto can seam → flow-aligned search + feathered blends; fallback
  above.
- Asset weight: `painting-filled.png` ≈ existing painting (~1 MB) + strips (~0.5–1 MB) — ship
  hygiene reviewed later, as with `flow-field.png` slimming.
- Scope discipline: S4 does NOT touch the below-island void (the underside owns that read) and
  invents no interaction changes. Presets/time-of-day stay out of scope.

## What does not change

The painting's front composition, the camera contract, the ribbon motion model, every authored
3D form, reduced-motion behaviour, the palette contract.
