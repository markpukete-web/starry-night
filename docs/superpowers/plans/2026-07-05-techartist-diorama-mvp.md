# TechArtist Diorama MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new `?mode=diorama` route that presents Starry Night as a physical, orbitable floating diorama/world instead of a curved painting surface.

**Architecture:** Keep the default 2D route and the parked canopy route isolated. Add a dedicated diorama experience component that composes the existing `Diorama` and `SkyDome` scaffolding with a new camera/debug contract, then upgrade the diorama stage with deterministic small-scale terrain details that make it read as an inspectable object. Use query params for clean/no-post/stage-only capture modes.

**Tech Stack:** Vite, React 19, TypeScript, three.js 0.184, React Three Fiber, drei `OrbitControls`, `@react-three/postprocessing` Bloom, existing palette/reference assets.

---

## Files

- Create: `src/scene/dioramaContract.ts` — camera, orbit, capture, and query/debug constants.
- Create: `src/scene/dioramaLayout.ts` — deterministic pure placement helpers for terrain strokes/blades and stage details.
- Create: `src/scene/DioramaExperience.tsx` — review route canvas, camera, controls, sky/stage composition, post toggle.
- Modify: `src/scene/Diorama.tsx` — add deterministic stage detail components and optional debug props.
- Modify: `src/App.tsx` — route `?mode=diorama` to the new experience.
- Modify: `src/index.css` — add diorama shell and clean-capture rules.
- Modify: `package.json` — include new diorama layout tests in `test:sky`.
- Create: `scripts/diorama-layout.test.ts` — deterministic layout/camera guard tests.
- Modify: `tasks/todo.md` and `tasks/lessons.md` — record the pivot and capture verdict after review.

## Task 1: Route Contract And Deterministic Layout

- [ ] **Step 1: Add `src/scene/dioramaContract.ts`**

```ts
export type DioramaDebugMode = 'final' | 'nopost' | 'stage'
export type DioramaViewMode = 'design' | 'orbit'

export const DIORAMA_CAMERAS = {
  design: {
    position: [0.82, 1.6, 5.42] as const,
    target: [-0.06, 0.78, 0.12] as const,
    fov: 48,
    near: 0.08,
    far: 48,
  },
  orbit: {
    position: [3.9, 1.9, 3.82] as const,
    target: [-0.08, 0.68, 0.12] as const,
    fov: 48,
    near: 0.08,
    far: 48,
  },
} as const

export const DIORAMA_ORBIT = {
  minDistance: 3.25,
  maxDistance: 5.6,
  minPolarAngle: 0.58,
  maxPolarAngle: 1.62,
  enablePan: false,
  enableDamping: true,
}

export const DIORAMA_CAPTURE = {
  designWidth: 1440,
  designHeight: 960,
  mobileWidth: 390,
  mobileHeight: 844,
  seed: 0x5a77e1,
}
```

- [ ] **Step 2: Add `src/scene/dioramaLayout.ts` with deterministic terrain placements**

Create exported helpers:

```ts
export type TerrainBlade = {
  position: [number, number, number]
  rotationY: number
  height: number
  width: number
  colourIndex: number
}

export function makeTerrainBlades(count = 320, seed = 0x5a77e1): TerrainBlade[]
```

Acceptance: helper never uses `Math.random`; positions stay inside the island footprint; generated array is stable for the same seed.

- [ ] **Step 3: Add `scripts/diorama-layout.test.ts`**

Tests:

```ts
import assert from 'node:assert/strict'
import test from 'node:test'
import { DIORAMA_ORBIT } from '../src/scene/dioramaContract.ts'
import { makeTerrainBlades } from '../src/scene/dioramaLayout.ts'

test('terrain detail layout is deterministic', () => {
  assert.deepEqual(makeTerrainBlades(24, 123), makeTerrainBlades(24, 123))
})

test('terrain detail stays inside the stage footprint', () => {
  for (const blade of makeTerrainBlades(120, 456)) {
    const [x, , z] = blade.position
    assert.ok(Math.abs(x) <= 1.9)
    assert.ok(Math.abs(z) <= 1.18)
  }
})

test('diorama orbit cannot pan or zoom out of the authored envelope', () => {
  assert.equal(DIORAMA_ORBIT.enablePan, false)
  assert.ok(DIORAMA_ORBIT.minDistance >= 3)
  assert.ok(DIORAMA_ORBIT.maxDistance <= 5.6)
  assert.ok(DIORAMA_ORBIT.maxPolarAngle <= 1.62)
})
```

## Task 2: Build The Diorama Review Experience

- [ ] **Step 1: Create `src/scene/DioramaExperience.tsx`**

Composition:

```tsx
<main className={`visitor-shell diorama-shell${clean ? ' is-clean-capture' : ''}`}>
  <Canvas frameloop="always" dpr={[1, 1.5]} gl={{ preserveDrawingBuffer: true }}>
    <PerspectiveCamera makeDefault {...camera} />
    <OrbitControls {...orbit} target={[...DIORAMA_CAMERA.target]} />
    <Suspense fallback={null}>
      <Diorama debug={debug === 'stage' ? 'stage' : 'final'} />
      {debug !== 'stage' && <SkyDome flow={flowData} colourSrc={paintingData} count={2600} paused={reduced} />}
    </Suspense>
    {debug !== 'nopost' && debug !== 'stage' && (
      <EffectComposer>
        <Bloom intensity={0.42} luminanceThreshold={0.38} mipmapBlur radius={0.42} />
      </EffectComposer>
    )}
  </Canvas>
</main>
```

Acceptance: `debug=stage` hides the sky and post so the physical object must stand alone; `debug=nopost` keeps sky but removes Bloom.

- [ ] **Step 2: Modify `src/App.tsx`**

Import `DioramaExperience` and branch before default:

```tsx
if (mode === 'diorama') {
  return <DioramaExperience clean={clean} reduced={motionPaused} />
}
```

## Task 3: Upgrade The Physical Stage

- [ ] **Step 1: Modify `src/scene/Diorama.tsx` props**

Add:

```ts
type DioramaDebug = 'final' | 'stage'
export function Diorama({ debug = 'final' }: { debug?: DioramaDebug }) { ... }
```

- [ ] **Step 2: Add deterministic terrain blades/strokes**

Use `makeTerrainBlades` to render bounded individual blade/stroke meshes on the landmass. Colours come from cypress/ground/hills palette swatches. Keep count bounded and geometry shared.

- [ ] **Step 3: Add stage-scale cues**

Add a few non-copying Starry Night-specific details: small warm windows, low ridge stones, extra dark shrubs, and three muted moonlit cloud puffs tucked behind the hill/village band. Do not copy TechArtist cabin/windmill.

- [ ] **Step 4: Preserve the painting composition**

From the design camera: cypress left foreground, village/church low-middle, hills behind, moon/stars high. If a detail competes with these, remove or shrink it.

## Task 4: Verification And Visual Gate

- [ ] **Step 1: Update `package.json`**

Add `scripts/diorama-layout.test.ts` to `test:sky`.

- [ ] **Step 2: Run mechanical checks**

Run:

```bash
npm run test:sky
npm run lint
npm run build
```

Expected: all exit 0.

- [ ] **Step 3: Capture with Playwright**

Use the existing canvas readback pattern into `output/playwright/techartist-diorama-2026-07-05/`:

```text
desktop-design.png    ?mode=diorama&clean=1
desktop-nopost.png    ?mode=diorama&debug=nopost&clean=1
desktop-stage.png     ?mode=diorama&debug=stage&clean=1
desktop-orbit.png     ?mode=diorama&view=orbit&clean=1
mobile-design.png     390x844 ?mode=diorama&clean=1
```

- [ ] **Step 4: Visual self-review**

Reject and retune before presentation if:

- the stage-only capture does not read as a physical object;
- the design capture reads as a curved/flat painting surface;
- UI/tooling appears in clean capture;
- the no-post capture loses the moon, church, cypress, or island silhouette;
- mobile framing loses both the moon and cypress.

## Self-Review And Edits

- Removed a copied river/cabin/windmill interpretation from the plan. The reference mechanism is a physical diorama, not its subject matter.
- Added `debug=stage` so the physical object is judged without sky or Bloom.
- Kept the new route isolated because the current default 2D foundation is still useful and the canopy work is a parked proof, not the product.
