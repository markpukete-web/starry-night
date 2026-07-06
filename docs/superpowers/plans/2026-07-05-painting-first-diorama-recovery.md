# Painting-First Diorama Recovery Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair `?mode=diorama` so the first read comes from Van Gogh's original painting and source-derived flow, with TechArtist retained only as the compact orbitable-world interaction model.

**Architecture:** Keep the default 2D route and rejected canopy proof isolated. Replace the diorama route's legacy `SkyDome` dependency with a new painting-derived 3D sky component that maps existing source-space streamline ribbons, moon, and stars into the 3D front volume. Keep the physical stage, but retune camera/lighting and add a flow debug route so the painting mechanism can be inspected before post-processing.

**Tech Stack:** Vite, React 19, TypeScript, three.js 0.184, React Three Fiber, drei `OrbitControls`, `@react-three/postprocessing` Bloom, existing reference assets only.

---

## Files

- Create: `src/scene/PaintingFlowSky3D.tsx` — source-space streamline ribbons, curved 3D placement, moon/star halos, flow diagnostic mode.
- Modify: `src/scene/dioramaContract.ts` — add painting-first camera and `debug=flow`.
- Modify: `src/scene/DioramaExperience.tsx` — replace legacy `SkyDome` with `PaintingFlowSky3D`; support flow-only capture.
- Modify: `src/scene/Diorama.tsx` — modestly reduce the failed prop-stage dominance and keep stage lighting readable.
- Modify: `scripts/diorama-layout.test.ts` — guard `debug=flow` and painting-first camera envelope.
- Modify: `tasks/todo.md`, `tasks/lessons.md`, and Obsidian status/timeline — record the failed pass and recovery verdict.

## Task 1: Lock The Failure And Contract

- [x] **Step 1: Update repo and Obsidian notes**

Record the prior `?mode=diorama` visual verdict as failed, not accepted. Required wording: physical depth alone did not pass because the star flow and visual soul did not match the original painting.

- [x] **Step 2: Add `debug=flow` to the diorama contract**

Extend `DioramaDebugMode`:

```ts
export type DioramaDebugMode = 'final' | 'nopost' | 'stage' | 'flow'
```

Acceptance: `debug=flow` renders the painting-derived sky mechanism without the stage or Bloom.

## Task 2: Build The Painting-Derived 3D Sky

- [x] **Step 1: Create `PaintingFlowSky3D.tsx`**

Use existing source-space assets:

```ts
buildSourceStreamlineRibbons({
  flowData: signedFlow,
  maskData: skyMask,
  paintingData,
  count: tuned('count', 2000),
  strokeWidth: tuned('strokeWidth', 0.0032) * 1.2,
  points: tuned('points', 16),
  stepSize: tuned('stepSize', 0.012),
  seed: DIORAMA_CAPTURE.seed,
})
```

Map each UV vertex with `uvToFrontDir(u, v).multiplyScalar(DOME_R)`. Keep colour sampled from the painting and animate only the shader phase.

- [x] **Step 2: Place moon and star halos from source UVs**

Use `MOON_UV`, `MOON_R`, and `SWIRLS` from `skySwirls.ts`, not hand-tuned positions. Moon gets dominant warm crescent/halo; stars get smaller warm halos embedded in the flow.

- [x] **Step 3: Add flow diagnostic mode**

`debug=flow` should show source ribbons and source-positioned orbs without the physical stage. A visible diagnostic can use edge/length colouring, but it must still prove that the ribbons trace the source sky mask.

## Task 3: Recompose The Diorama Route

- [x] **Step 1: Replace `SkyDome` in `DioramaExperience.tsx`**

Remove the legacy `SkyDome` route dependency for `?mode=diorama`. Render:

```tsx
{debug !== 'stage' && (
  <PaintingFlowSky3D paused={reduced} debug={debug === 'flow' ? 'flow' : 'final'} />
)}
{debug !== 'flow' && <Diorama debug={debug === 'stage' ? 'stage' : 'final'} />}
```

Acceptance: `debug=stage` shows stage only; `debug=flow` shows painting sky only; `debug=nopost` disables Bloom but keeps stage + painting sky.

- [x] **Step 2: Retune the design camera**

Camera must give the painting composition first: cypress left foreground, village/church low, central whorl high-middle, moon upper-right. Start near the proven front basis:

```ts
position: [0.62, 1.18, 5.18]
target: [0.08, 1.03, 0.02]
fov: 50
```

Final captured portrait camera keeps the moon in frame, though still cropped at the edge:

```ts
position: [0.92, 1.15, 7.85]
target: [0.78, 1.0, 0.02]
fov: 70
```

Keep orbit constrained and no pan.

- [x] **Step 3: Reduce failed stage dominance**

The stage should support the painting, not win over it. If needed, reduce terrain blade count in final mode, lift cypress colour modelling, and push the hill/village band lower in the frame through camera rather than adding more props.

## Task 4: Verification And Visual Gate

- [x] **Step 1: Run mechanical checks**

```bash
npm run test:sky
npm run lint
npm run build
```

- [x] **Step 2: Capture with Playwright**

Capture into `output/playwright/painting-first-diorama-2026-07-05/`:

```text
desktop-final.png      ?mode=diorama&clean=1
desktop-nopost.png     ?mode=diorama&debug=nopost&clean=1
desktop-stage.png      ?mode=diorama&debug=stage&clean=1
desktop-flow.png       ?mode=diorama&debug=flow&clean=1
desktop-orbit.png      ?mode=diorama&view=orbit&clean=1
mobile-final.png       390x844 ?mode=diorama&clean=1
```

- [x] **Step 3: Visual self-review**

Reject and retune if:

- final does not immediately read closer to the original painting than the failed route;
- flow capture does not show the horizontal S-flow, central whorl, moon, and embedded stars;
- no-post loses the moon/star/cypress/village read;
- stage-only is still the dominant product rather than the support layer;
- mobile loses both cypress and moon.

## Self-Review And Edits

- Removed any plan to make the stage more detailed as the main fix. Detail was not the failure; painting-source fidelity was.
- Replaced "make the sky prettier" with a concrete source-space implementation using the existing settled `StreamlineSky` builder.
- Added an explicit failure check that the final capture must be closer to the original painting than the rejected route, not just more polished.
