# Sky Flow Fidelity Quality Gate

Date: 2026-06-20
Status: Draft approved for review; implementation not started

## Decision

Pre-release sign-off is withdrawn. The project moves back into a quality-refinement gate because Mark does
not yet feel the 3D piece is visually close enough to the original painting. The lead issue is the sky flow:
the current sky has a strong 3D diorama identity, but its visible stroke paths do not feel close enough to
the original art.

The next phase is therefore not a publish task. It is an original-art fidelity pass, led by the front-view
sky. Cypress and village fidelity remain in scope, but they follow the sky-flow pass so the main visual
language is fixed first.

## Goal

Make the default/front view feel materially closer to Van Gogh's original painting while preserving the
approved premise: an orbitable 3D diorama, a constrained camera, derived colours, reduced-motion support, and
visitor controls.

The guiding rule is visual, not verbal: the current capture should be judged beside the original painting.
If Mark cannot describe the mismatch in words, the workflow must still progress through visual comparison,
capture review, and retune.

## Priority Order

1. **Sky flow fidelity.** Rework the front-facing sky so the visible stroke paths, star halos, central whorl,
   and moon-area flow read closer to the original art in still captures.
2. **Sky motion fidelity.** Once the still frame is closer, make motion travel along those same original-like
   paths rather than advertising a separate procedural flow.
3. **Cypress fidelity.** Refine the tree from a clean sculptural mass toward a ragged, licking brush-flame
   silhouette with painterly surface breakup.
4. **Village fidelity.** Refine the church/houses from clean miniatures toward uneven nested roofs, softer
   edges, and better integration into the landmass.

## Sky Design Direction

The current sky can keep its 360-degree dome and orbit support, but the front-facing view must become the
authoritative layer. The original painting should drive:

- star and halo placement,
- central whorl shape and weight,
- the direction changes between star halos,
- the moon corner flow,
- the broken/impasto stroke language,
- colour sampling from the painting, not invented colour moods.

The implementation should favour a hybrid if needed: original-derived flow and stroke placement on the front
arc, with the invented back remaining secondary and less visually dominant. The front should stop feeling like
a generic vortex-field interpretation and start feeling like the painting's own movement made spatial.

## Workflow

Each pass must produce comparison captures, not just code changes:

1. Capture the current front view next to the original painting.
2. Implement one sky-flow change.
3. Capture front, orbit, mobile, and reduced-motion.
4. Compare against the original and name what moved closer or farther away.
5. Retune or revert before moving to the next lane.

The pass is not complete until Mark sees the updated captures and agrees that the sky flow is closer. Only
then should cypress/village refinement begin.

## Acceptance Checks

- Front capture feels closer to the original painting's sky flow than `scratch/release-front.jpeg`.
- Central whorl, star halos, and moon-area strokes line up visually with the original's movement.
- Motion follows the refined flow paths and does not reintroduce a separate generic swirl feeling.
- Mobile composition still includes moon, cypress edge, steeple, and central sky movement.
- Reduced motion remains a dignified still state.
- Visitor controls and dev-only Leva separation remain intact.
- `npm run lint` and `npm run build` pass.

## Non-Goals

- Production deployment, Cloudflare DNS, and portfolio link-out.
- New public controls or comparison UI.
- A new painting, gallery mode, audio, VR/AR, or free-fly camera.
- Reopening the standalone project decision.

## Open Review Question

The only question for Mark before implementation is visual review of the spec direction: does this correctly
capture the quality gate as "closer to the original art in 3D, with sky flow first"?
