# 0002 — What "movable" means (Phase 1)

**Status:** revised — the flat hybrid below was superseded by a full 3D diorama (Mark's redirect,
2026-06-13). · **Date:** 2026-06-13

## Update (2026-06-13) — movable = a 3D diorama

Building the flat hybrid, Mark judged it "not 3D enough" (reference: the techartist orbitable
diorama) and redirected. **Movable = a genuine, orbitable 3D diorama of Starry Night** — the
cypress, village + steeple and hills as real forms on a floating slab, the moon and stars as 3D
bodies, and the sky as an enveloping DOME of churning brushstrokes you stand beneath. Free orbit is
now in scope (relaxes the locked item — flagged to Mark in `tasks/todo.md`). The painterly bar, the
flow-derived churn and the palette all carry over. Perf note: the dome's overdraw must be watched —
single-sided strokes; ~120 fps confirmed on Mark's machine at 6k strokes.

The original flat-hybrid analysis below is kept as the route that led here.

## Decision (original — flat hybrid, superseded)

**Movable = hybrid:** an animated **brushstroke sky** over a **2.5D parallax foreground**, viewed
through a **constrained pan/tilt camera**. This was CLAUDE.md's default-to-beat; building the
spikes confirmed it.

## Settled by building (not discussing)

Three readings were built and judged against the painting and the acceptance criteria:

| Reading | Built | Verdict |
| --- | --- | --- |
| **Churn-only** — sky moves, camera fixed | Slice 3 | The soul. 8k instanced dabs oriented by the derived flow, coloured from the painting, advecting along the swirls. Reads unmistakably as Van Gogh's sky in motion. |
| **Camera-only on a flat plane** | Slice 4a | Weak. A constrained pan/tilt over a flat painting is barely perceptible — a moving viewpoint needs depth to earn its place. |
| **Hybrid** — churn + parallax + camera | Slice 4b | Best. The cypress cut to a nearer plane parallaxes against the churning sky under the camera: depth *and* life, and the composition still always reads as the painting. |

The churn is non-negotiable (it is the whole point); the parallax + constrained camera add depth
and a sense of presence without breaking the composition. Free orbit was rejected by design — it
breaks the framing — so the camera is limited to ±15° yaw / ±10° pitch with a slow idle drift plus
pointer response.

## Parameters reached in the spike (starting points, not final)

- Sky: 8,000 strokes (desktop), advection 0.05 UV/s, stroke lives 3–8 s, sky-only placement
  (luminance gate), relief-shaded dab at true colour.
- Camera: ±15° yaw, ±10° pitch; idle Lissajous drift + pointer; distance 2, fov 45; cover ×1.15
  margin so tilting never reveals the plane edge.
- Depth: cypress cut from the painting (luminance mask) onto a plane at z ≈ 0.3.

## Known limitations / next-phase work

- **Depth is cypress-only** (a spike). The real foreground needs cleaner separated layers for
  cypress, village + steeple, and hills — that is the "foreground complete" gate.
- The masked-cutout depth has minor edge softness and can ghost at larger angles; authored layers
  or a depth-map displacement will clean it.
- **`prefers-reduced-motion`** dignified still state — locked acceptance criterion, not yet built.
- **Mobile portrait framing** — cover-crop currently loses the moon and most of the cypress;
  needs a portrait strategy (contain / guided pan / portrait crop).
- `flow-field.png` is ~3.2 MB — optimise (downscale / smooth low-coherence areas) for the real
  animated-sky build.

## Next

The remaining gates follow: **first full animated sky** (the real, optimised sky build) →
**foreground complete** (authored parallax layers) → mobile + reduced-motion + perf → pre-release.
