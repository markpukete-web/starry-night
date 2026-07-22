# Cypress second pass — review findings (2026-07-22)

Reviewed at `40c0a70` on `sky-brushdab`. Reviewer: Claude. Gate authority: Mark.

Captures taken fresh at this commit, not inherited from the implementation session:
`output/playwright/claude-review-2026-07-22/`. Comparison crops: `output/review-2026-07-22/`.

---

## Mechanical state — all green, re-run independently

| Check | Result |
|---|---|
| `npm run test:sky` | 96 pass, 0 fail |
| `npm run lint` | clean |
| `npm run build` | green |
| `npm run check:reduced` | PASS — reduced still, control churns |

No action needed. Recorded so nobody re-runs it.

---

## Confirmed good — do not change these

1. **Colour is solved.** The near-black is gone; the render carries the painting's own
   green/umber/sienna. Method (project the painting rather than synthesise its statistics) is right.
2. **Stroke length is solved.** The fur read is gone; marks run the length of the form.
3. **Silhouette topology is close to the painting.** Main flame, left secondary at the right height,
   right tongues, base widening. Verified on bare thresholded masks, not on the shaded render —
   `output/review-2026-07-22/sil-compare.png`.
4. **Removing full-frame Bloom from the diorama was correct.** The sky's cobalt returned and the
   frame gained the painting's contrast.

---

## Finding 1 — cypress skin has ~⅓ the painting's local contrast (open, measured)

**Severity:** the one substantive defect remaining. Not a blocker on its own; Mark's gate decides.

**Claim.** The marks are in the right places with the right colours, but the crisp dark separations
*between* adjacent brush marks have filled in. The surface reads softer than the painting. The
correct name is **softening**, not stretching or smearing.

**Measurement.** 3×3 local standard deviation (grey levels) over the trunk, both images cropped to
the same tree region and scaled to the same height:

| Image | Local contrast |
|---|---|
| Painting source crop | **6.45** |
| Live render | **2.01** |

Reproduce exactly:

```sh
magick public/reference/painting.jpg -crop 176x662+230+92 +repage -resize x800 /tmp/tex-src.png
magick output/playwright/claude-review-2026-07-22/desktop-centre.png \
  -crop 175x575+370+115 +repage -resize x800 /tmp/tex-live.png
for f in /tmp/tex-src.png /tmp/tex-live.png; do
  magick "$f" -crop 100x280+65+450 +repage -colorspace Gray \
    -statistic StandardDeviation 3x3 -format "%[fx:mean*255]\n" info:
done
```

**Hypothesis already eliminated — do not repeat it.** Texture mip filtering. `LivingPainting.tsx`
disables mipmaps on this same painting texture, and `BrushCypress` does not, so it inherits drei's
default `LinearMipmapLinearFilter` at anisotropy 1 on a surface that wraps away from the eye. Setting
`minFilter`/`magFilter` to `LinearFilter` with `generateMipmaps = false` and re-capturing moved the
number **2.01 → 2.20** — about 6% of a 3.2× gap. Not the cause. Change was reverted; tree is clean.

**Leading candidate, visible in the code rather than inferred.** `src/scene/BrushCypress.tsx:176` —
each relief ribbon takes **one flat colour for its whole length**:

```ts
const pigment = texels[Math.floor(texels.length / 2)]
```

Every vertex on that ribbon then gets the same pigment. The 48 front ribbons sit proud of the
textured skin (`+0.003`–`0.004` along the normal), so wherever a ribbon lands it replaces textured
pixels with flat colour, which lowers local contrast by construction.

This is a deliberate decision with a written rationale — averaging the path collapsed the pigment
families, and per-vertex sampling tiled into bark. So it is a **trade-off to revisit, not a bug to
fix blindly.** A third option exists that neither previous attempt tried: keep one pigment per
ribbon for hue coherence but modulate its *value* along the ribbon from the source, which restores
separation without reintroducing the tiling.

**Ask.** Diagnose before changing. Establish what fraction of the contrast gap the ribbons account
for — e.g. measure the same statistic with the ribbon mesh not rendered — before touching the
pigment rule. If the ribbons are not the cause, the number will barely move, exactly as the mipmap
test did.

---

## Finding 2 — silhouette edges run straighter than the painting's (open, minor)

The outline is built from longer straight segments where the painting's tongues curve continuously;
the left secondary lobe reads as a triangular wedge rather than a curved flame. Visible in
`output/review-2026-07-22/sil-compare.png`.

Low priority and taste-gated. Do not tune it speculatively — if it is worth doing, the lever is
likely section count / interpolation along the lobe rather than the source data.

---

## Finding 3 — Bloom's removal is scoped to one route (decision needed, not a defect)

`EffectComposer`/`Bloom` was removed from `DioramaExperience` (default `?mode=diorama`, the shipping
view). It remains in `CanopyExperience` (`?mode=canopy`), and `SkyDome.tsx` is still authored around
it in both code comments and halo tuning ("Bloom then blossoms it into the dominant moon").

Not a bug — the legacy routes are untouched by design. But it needs an owner's answer: **are the
`canopy` / `relief` / flat routes reachable at release?** If yes, the piece ships two different
lighting philosophies behind URL params. This is checklist item 1 territory and Mark's call.

---

## Withdrawn claims — do not chase these

Listed because I made them in review and they are wrong. Chasing them would waste a pass.

1. **"Flat sawn-off tops on the side lobes."** False. The geometry tapers to a point; what looked
   truncated was shading on the near face. Settled on thresholded masks.
2. **"Texture reads as smeared driftwood."** Overstated. Diagnosed from a 3× blow-up of a 200 px
   crop; at true scale the mark families match the source well. The real residue is Finding 1,
   which is a contrast number, not a smear.
3. **"The base is wrong because it terminates on the island."** Not a defect. The painting runs off
   the bottom of its frame; the diorama is a 3D object on an island. That is the contract working.

---

## Out of scope for this pass

- Village and island geometry read as flat-shaded low-poly next to the painted sky. That is
  **checklist item 8**, not yet designed. Its first step is a look, not code — name the gaps against
  the painting first.
- 26 commits are local-only on `sky-brushdab`. Pushing is Mark's call.
