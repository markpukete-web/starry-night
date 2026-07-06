# TechArtist-Inspired Starry Night Diorama Spec

**Date:** 2026-07-05

## Intent

Build the next 3D route as a physical, orbitable Starry Night world. The reference is the TechArtist floating-island diorama mechanism: a compact stage object with dense small-scale detail, a few unmistakable hero forms, constrained orbit, and atmosphere that changes the way the object feels. The object must still read as *The Starry Night* head-on.

This supersedes the front-canopy route as the main 3D direction. The canopy may survive as a parked technical proof or future sky layer, but it is not the product.

## Visual Contract

```ts
type VisualContract = {
  subject: 'Starry Night as a physical floating diorama/world'
  identity: [
    'dark flame cypress front-left',
    'small village and pale church under rolling hills',
    'large moon and star field above',
    'floating landmass with inspectable underside',
    'painted sky motion surrounding a real stage'
  ]
  silhouette: [
    'cypress must dominate the left foreground from the design camera',
    'church spire must be readable against the hills',
    'island must read as an object with thickness from orbit',
    'sky layer must not read as the whole object'
  ]
  materialSeparation: [
    'terrain, cypress, hills, roofs, church, moon/stars use palette-provenanced colours',
    'small terrain details add scale without turning into generic grass-demo noise',
    'emissive lights are allowed only for moon, stars, and windows'
  ]
  motion: [
    'orbit controls prove the scene is physical',
    'sky motion can animate when present',
    'reduced motion yields a dignified still'
  ]
  cameraEnvelope: {
    near: 3
    design: 4.7
    far: 5.6
  }
  invariants: [
    'head-on design camera reads as Starry Night composition',
    'moderate orbit exposes depth without breaking the composition',
    'no-post baseline still reads as a diorama',
    'clean capture has no dev UI, title collision, or Stats overlay'
  ]
  frameBudgetMs: 16.7
}
```

## Scope For This Slice

1. Add a new `?mode=diorama` route. Default 2D and `?mode=canopy` remain isolated.
2. Reuse the parked `Diorama` and `SkyDome` only where they serve the physical-world target.
3. Upgrade the stage with TechArtist-style object detail: a defined floating stage silhouette, dense but bounded terrain strokes/blades, stronger small-object scale cues, and constrained orbit.
4. Add explicit debug/capture modes:
   - `?mode=diorama&clean=1`
   - `?mode=diorama&view=orbit&clean=1`
   - `?mode=diorama&debug=nopost&clean=1`
   - `?mode=diorama&debug=stage&clean=1`
5. Capture desktop design, orbit-side, mobile, no-post, and stage-only views before presenting.

## Out Of Scope

- Time-dial presets.
- Windmill/cabin copy from the reference.
- New dependencies.
- Free-fly camera or panning.
- Replacing the settled 2D baseline.

## Hard Rejects

- The first screenshot reads as a flat card, curved painting, or placeholder demo.
- The old diorama geometry dominates in a toy-like way with no detail scale.
- Bloom/post-processing supplies the only readable form.
- Dev UI, Leva, Stats, or title text appears in clean review captures.
- Camera orbit can pan or zoom far enough to lose the painting identity.

## Self-Review And Edits

- The first draft over-weighted the sky layer again. Edited the contract so physical stage silhouette, object thickness, and hero forms are the first acceptance criteria.
- The first draft included the TechArtist preset dial. Removed it from this slice because CLAUDE.md keeps preset dials out of scope before the core piece passes.
- The first draft said "dense grass"; edited to "terrain strokes/blades" so the detail reads as Van Gogh-world scale, not a nature-scene clone.
