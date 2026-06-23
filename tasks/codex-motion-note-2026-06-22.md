# Codex motion note — failed models and the near-miss direction

Date: 2026-06-22

Purpose: isolate the current motion diagnosis without rewriting older project notes. Read this before changing
sky motion again.

## Hard negatives — do not retry as-is

These were tried and rejected by Mark in live review:

- **Base flow-map advection / dual-phase cross-fade**: moves the painting, but reads as smooth water and blurs the
  source art.
- **Pure tangential/orbit-forced halo flow**: makes rings move, but replaces broken brushwork with laminar circular
  motion.
- **Patch/cut-out brush dabs drifting along flow**: keeps more source detail than flat-colour dabs, but still reads
  as a separate moving overlay rather than the painting's own motion.
- **Annular halo spin emphasis**: solves "is something moving?" but creates a mechanical fan read in the centre.
- **Two-frame parsed-video A/B blend**: using `mA`/`mB` or similar stills as a ping-pong gives back-and-forth churn,
  not forward painted flow.
- **Parsed-motion-map micro-stroke activation**: seeding many tiny marks from the parsed motion map reads as hundreds
  of worms crawling.

## What the parsed video appears to be doing

The parsed video does not read like stable particles crawling over the artwork. It reads like a **full-frame
painted-state animation**: successive painted stroke states replace one another along the swirl paths. The motion is
perceived from the whole painted field changing, not from individual objects travelling independently.

If we literally copy it, we need the actual parsed video or a dense forward frame sequence. Sparse stills can only
make choppy copy-mode or A/B churn.

## The closest successful direction

Claude Code had a much closer feel before the later 360/dab pivots:

- `0ddc78d feat(3d): true Van Gogh swirls via streamline-ribbon sky`
- `7ad1523 feat(3d): real Van Gogh swirls via a curved canopy sky`

Why it was close:

- It used **streamline ribbons**, not independent particles.
- It integrated strokes through the painting-derived flow field, with heading continuity so the undirected flow did
  not flip/zigzag.
- The curved-canopy version integrated in the painting's own UV space first, then mapped the result onto the canopy,
  preserving the real central whorl and star-halo composition.
- Motion was a shader phase travelling through each ribbon, so it behaved like painted stroke energy moving through
  a continuous mark rather than separate dabs crawling around.
- Project memory records Mark's reactions at that point as "I can see the soul of the painting" and "Now THAT'S the
  feeling."

## What likely went wrong after that

The work chased 360-degree coverage, seams, symmetry, halo spin, and later flat living-painting fidelity. Those were
real problems, but the implementation moved away from the near-miss medium:

- mirror tiling and native vortex fields changed the composition language;
- brush-dabs broke continuous swirls into object motion;
- halo-specific fixes over-focused on local spin;
- parsed-motion-map strokes repeated the object-motion mistake at smaller scale.

The missed direction is probably **not** "more dabs" or "more spin". It is to return to the streamline-ribbon /
curved-canopy model and fix direction/sign/phase/framing against the parsed video.

## Next sane move

Revive the `7ad1523` curved-canopy idea in a controlled branch or side-by-side prototype:

1. Use the original painting and parsed video frames as Playwright visual references.
2. Restore continuous streamline ribbons as the motion carrier.
3. Tune signed direction, phase travel, and ribbon brightness movement against the parsed video.
4. Keep 360/back coverage secondary until the front motion feels right again.
5. Do not reintroduce worms, fan halos, A/B frame ping-pong, or water-like base advection.
