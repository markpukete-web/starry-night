# Autonomous 3D Front Canopy Spec

## Operating Rule

Codex owns the design loop for this slice. No approval gates are required before implementation. Mark only sees the result after Codex has drafted the spec, self-reviewed it, edited it, drafted/reviewed/edited the implementation plan, implemented, reviewed, captured with Playwright, and judged the visuals against the contract.

## Product Goal

Turn the settled 2D `StreamlineSky` motion into a first tasteful 3D front-canopy experience that feels closer to the `pvrellis` Starry Night reference: the whole sky behaves as one connected painted flow field, not as separate effects scattered over a scene.

## Design Calls

1. The first 3D proof uses an isolated review route, `?mode=canopy`, so the restored 2D baseline remains intact.
2. The first gate uses the painting's real foreground as a depth/occlusion matte, not the old faceted `Diorama`.
3. The sky streamlines are generated in painting UV space first, then projected to a curved front volume.
4. The front camera is authored and deterministic. Orbit is constrained and secondary.
5. Full 360 coverage is deferred until the head-on front composition passes.
6. Bloom and cinematic polish are forbidden to carry the scene. A no-post capture must still read.
7. Dev UI, title, dock, Stats, Leva, and control overlays are hidden in clean review captures.

## Visual Contract

The capture must read as a Van Gogh sky volume over the original composition.

Observable invariants:

- Central double whorl remains recognizable from the painting.
- Moon and star halo regions sit in painting-relative positions.
- Sky strokes curve through one source-space flow system.
- Canopy has no visible rectangular card boundary.
- Foreground anchors the composition without old low-poly forms dominating it.
- The head-on design camera feels like Starry Night first, 3D tech second.
- The no-post capture still has readable structure.
- Mobile portrait keeps the moon/sky identity visible.

Hard rejections:

- Visible flat card or rectangular canopy edge.
- Old faceted `Diorama` dominating the screenshot.
- Generic vortex dome that loses the source painting's front composition.
- Bloom-only readability.
- Dev UI or text collision in a review capture.
- Mechanical tests passing while the screenshot is obviously weak.

## Field Contract

Stable coordinate ownership:

```text
painting image UV
  -> signed flow + sky mask + star/moon halo masks
  -> source-space streamline ribbons
  -> curved front-canopy world positions
  -> color, alpha, pulse, edge fade, debug modes
```

The implementation must not create unrelated random channels for color, alpha, flow, or placement. They all derive from the same source UV and seed.

## Camera Contract

```ts
type CanopyCameraContract = {
  subject: 'front canopy plus foreground matte'
  subjectScale: 6
  projection: { fov: 42; near: 0.08; far: 40 }
  positionMode: 'authored'
  upMode: 'world'
  inputMode: 'orbit-offset'
  handoffOwner: 'CanopyExperience'
  spatialConstraints: ['no pan', 'small azimuth', 'small polar range']
}
```

The route owns camera projection. Camera constants live in code, not in ad-hoc tuning.

## Review Loop

1. Draft spec.
2. Self-review spec for vague language, missing hard rejects, and missing visual evidence.
3. Edit spec.
4. Draft implementation plan.
5. Self-review plan for missing files, missing tests, placeholders, and weak gates.
6. Edit plan.
7. Implement in small slices.
8. Run mechanical verification.
9. Capture with Playwright:
   - desktop clean final;
   - desktop no-post;
   - desktop sky-only;
   - desktop edge-debug;
   - mobile clean final;
   - mobile no-post.
10. Self-review the captures before presenting.
11. If the capture fails, iterate locally and record the visible failure honestly.

## Acceptance Evidence

Required before presenting to Mark:

- `npm run test:sky`
- `npm run lint`
- `npm run build`
- Playwright canvas capture artifacts under `output/playwright/front-canopy-mvp-2026-07-05/`
- A written self-review naming pass/fail against each hard rejection.

## Self-Review Findings Applied

- Replaced "make it beautiful" with observable invariants and hard rejections.
- Added no-post requirement so Bloom cannot disguise a weak scene.
- Added foreground-matte call to avoid repeating the old faceted-geometry failure.
- Added deterministic camera ownership and source-space field ownership.
- Added explicit Playwright artifact requirements before presentation.
