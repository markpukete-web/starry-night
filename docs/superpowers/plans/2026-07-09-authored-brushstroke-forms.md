# Authored Brushstroke Forms — the 3D diorama pivot

> Direction chosen by Mark (2026-07-08 review): **authored 3D forms**, not projected painting. The
> projected-relief approach (matte, source-textured relief) is a dead end for an orbitable diorama —
> a flat painting holds one viewpoint, so its sides/underside void, curl, or funnel the moment the
> camera leaves head-on (evidence: the torn-paper + black-funnel look-down capture, 2026-07-08).

## Thesis (the thing the last forms attempt got wrong)

**The whole diorama is built from Van Gogh brushstrokes — sky and land alike.** The 2026-07-05
TechArtist-style forms failed not because "forms" is wrong but because they were *smooth grey props*:
a low-poly cone cypress, box houses, balloon hills. Smooth mesh = toy. Van Gogh's forms are made of
**visible, coherent, directional impasto strokes**. So every authored form here is a real closed 3D
volume **clad in oriented brushstroke quads**, coloured from the derived palette, with the stroke
direction taken from the painting's own flow (the LIC shows it plainly: cypress = vertical upward
licks; hills = horizontal contour strokes; roofs = their own short strokes).

This also honours the locked bar: motion/colour/orientation derived from the painting, forms read as
Van Gogh's brushstrokes not generic noise.

## What stays

- **The sky** (`PaintingFlowSky3D`): camera-locked source-space streamline ribbons + gradient +
  moon/stars. It works, Mark approved its soul, it survives orbit because it's locked to the camera.
  Keep as-is (slice-1 colour recovery already landed: cobalt, gold stars, radiant moon).
- **Derived assets**: `palette.json`, `flow-field.png` / LIC (stroke directions),
  `paintingRegions.extractCypressSlices` (the cypress silhouette).

## What goes

- `SourceReliefTerrain`, `DioramaForegroundMatte`'s underpaint band, `SourceCypress`,
  `sourceProjection` reliance — the projected-relief foreground, all of it. (Delete once forms land.)

## The cladding technique (shared `brushForms.ts`)

Given a form's parametric surface, scatter N brushstrokes over it:
- surface point `p`, surface normal `n`
- stroke long-axis = the form's flow direction projected onto the tangent plane at `p`
- a thin elongated quad at `p + n·offset` (impasto proud of the surface), long axis = flow,
  width axis = `n × flow`
- colour = palette base for the region + deterministic noise variation + a moon-facing lift
  (`n · moonDir`) so forms MODEL in the moonlight instead of reading flat
- rendered over a **dark solid base volume** so gaps between strokes read as shadow, never void
- `meshBasicMaterial` vertexColors, baked lighting (deterministic, consistent with the raw sky),
  depth-tested so forms occlude correctly and orbit as solids

Survives orbit by construction: real closed volumes, no projection, no invented back — you can look
down on them and see solid painted rock/leaf, not a hole.

## Slices (capture-verified, orbit-tested EVERY slice — including the look-down angle that failed)

1. **Cladding module + cypress hero + solid island base** (this pass). The cypress is the hardest
   form (organic flame) and the hero, so it's the proof; the island must become a closed rooted
   solid to kill the funnel and give a coherent frame. Show Mark.
2. **Rolling hills** as real contour-clad volumes rising back-right (currently folded into the
   island top; split out if it needs its own massing).
3. **Village + church** as massed forms with painterly walls/roofs and warm emissive windows
   (bloom-caught); the pale slender church spire is the focal vertical echoing the cypress.
4. **Foreground dressing + polish**: bushes, ground strokes, lighting/bloom balance, reduced-motion
   still-state check, mobile framing, perf on real hardware.

## Orbit contract (unchanged envelope, now actually honoured)

Front-arc, `DIORAMA_ORBIT` as-is. The forms must read from every allowed angle — the point of the
pivot. Add a look-DOWN stress capture to the loop so the failed angle is checked each slice.

## Risk & kill-criterion

The whole bet is "brushstroke cladding reads as Van Gogh, not fur/grass/noise." Coherent stroke
DIRECTION is what makes it brushwork rather than fur — enforce it. If the cypress proof doesn't read
as a Van Gogh flame after the retune cap, stop and show Mark before building the rest.
