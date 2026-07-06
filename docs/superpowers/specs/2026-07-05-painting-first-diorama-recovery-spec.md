# Painting-First 3D Diorama Recovery Spec

**Date:** 2026-07-05

## Failure Being Corrected

The TechArtist-style `?mode=diorama` pass failed Mark's gate. It proved physical depth, but it did not prove *The Starry Night* in 3D. The source painting was not reviewed deeply enough before implementation, so the result drifted into a generic floating stage with a legacy streak sky.

The recovery starts from the original art, not from the TechArtist video. TechArtist supplies only the interaction pattern: compact physical world, constrained orbit, inspectable object. Van Gogh supplies the visual language.

## Source-Art Read

From `public/reference/painting.jpg`, `signed-flow.png`, `flow-field.png`, and `sky-mask.png`:

- The sky is not a starfield sprinkled over a backdrop. It is a continuous horizontal S-flow across the frame.
- The central double whorl sits above the village and drives the eye from left-middle to right-middle.
- Stars are embedded vortex nodes inside the flow, not isolated glowing balls.
- The moon is the dominant warm mass at upper-right, with a crescent and broad concentric glow.
- The cypress is the left foreground anchor: a dark, vertical flame that cuts into the sky and nearly reaches the top field.
- The village is low and small, with a pale church/steeple as the quiet focal point below the whorl.
- The hills form a rolling band that separates the sky from the village, not a toy mound behind it.
- The palette is deep cobalt/blue-green with warm cream/gold highlights; black silhouettes must still carry painted green/brown modelling.

## Visual Contract

```ts
type VisualContract = {
  subject: 'The Starry Night as a painting-faithful orbitable 3D diorama'
  identity: [
    'source-space StreamlineSky ribbons are the primary sky mechanism',
    'front camera preserves the original painting composition before orbit depth gets credit',
    'moon, stars, whorl, cypress, hills, and village occupy source-art-relative positions',
    'physical forms support the painting read instead of competing with it'
  ]
  silhouette: [
    'cypress anchors left foreground without becoming a dead black slab',
    'village/church sits low under the central whorl',
    'hill band runs laterally and keeps the sky/village separation',
    'orbit view proves depth while retaining the Starry Night identity'
  ]
  materialSeparation: [
    'sky ribbons sample original painting colour',
    'stars/moon use warm source-derived halos and remain readable without Bloom',
    'stage colours use palette.json, with documented lifts only',
    'terrain detail reads like brushstroke relief, not generic grass'
  ]
  motion: [
    'brightness phase travels along source-space streamlines',
    'reduced motion freezes to a dignified still',
    'orbit controls are constrained; no panning/free-fly'
  ]
  debugViews: [
    'final',
    'nopost',
    'stage',
    'flow'
  ]
  invariants: [
    'design capture reads as the original painting translated into depth',
    'flow debug shows source-space ribbons tracing the real sky mask',
    'no-post still preserves moon/star/cypress/village read',
    'clean capture has no dev UI, title, Leva, or Stats',
    'TechArtist mechanism never overrides Van Gogh composition'
  ]
}
```

## Scope For This Slice

1. Mark the previous TechArtist-style diorama pass as failed in repo and Obsidian notes.
2. Add a painting-derived 3D sky layer for `?mode=diorama`, using the existing `buildSourceStreamlineRibbons()` source-space ribbon generator.
3. Place moon and star halos from `skySwirls.ts` UV coordinates on the same 3D front mapping as the ribbons.
4. Retune the diorama camera toward the painting's front composition instead of the generic object view.
5. Add a `debug=flow` capture route that shows the source-space sky mechanism without the stage.
6. Capture final, no-post, stage-only, flow-only, orbit, and mobile before presentation.

## Out Of Scope

- Full 360 invented back.
- Time-dial presets.
- TechArtist subject-copying such as cabin/windmill/river.
- New dependencies.
- Reworking the default 2D foundation route.

## Hard Rejects

- A screenshot is praised because it is 3D even though it does not look like the painting.
- The sky is a generic streak/vortex field instead of source-space streamlines.
- The moon/star hierarchy is invented rather than source-positioned.
- The cypress reads as a black prop without painted flame modelling.
- The village/island detail pulls attention away from the painting's sky composition.
- Bloom is required for the scene to make visual sense.

## Self-Review And Edits

- First draft over-corrected toward a curved painting surface. Edited to require physical forms plus source-space sky, not a flat-card product.
- First draft still gave TechArtist too much authority. Edited so TechArtist only defines interaction shape; Van Gogh defines visuals.
- Added `debug=flow` because the last failure lacked a diagnostic proving the real painting flow was present.
