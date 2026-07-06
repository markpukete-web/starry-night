# Living Relief Painting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an isolated `?mode=relief` route that restores the soul of the original painting by keeping the Starry Night composition source-locked and adding only shallow, foreground-owned depth.

**Architecture:** Do not tune the rejected `?mode=diorama` route for this slice. Reuse `LivingPainting` and `StreamlineSky` as the primary visual mechanism, then add a small relief layer that samples the real painting and the real sky mask for cypress/lower-foreground parallax. The sky never translates with pointer input; only masked foreground layers move by a bounded amount.

**Tech Stack:** Vite, React 19, TypeScript, three.js 0.184, React Three Fiber, existing reference textures, existing source-space streamline generator, no new dependencies.

---

## Files

- Create: `src/scene/reliefContract.ts` — debug modes, pointer bounds, layer depth constants, visual contract.
- Create: `src/scene/ReliefExperience.tsx` — source-locked living painting route with masked foreground-only parallax.
- Create: `scripts/relief-contract.test.ts` — node tests for route contract values and pointer envelope.
- Modify: `src/App.tsx` — add `?mode=relief`.
- Modify: `src/index.css` — route shell background and clean-capture behaviour.
- Modify: `package.json` — include the relief contract test in `npm run test:sky`.
- Modify: `tasks/todo.md` and `tasks/lessons.md` — record that the front-arc diorama patch is visually rejected and Option 1 is the current slice.

## Task 1: Relief Contract

- [ ] **Step 1: Create `src/scene/reliefContract.ts`**

Use these exported constants and types:

```ts
export type ReliefDebugMode = 'final' | 'sky' | 'layers'

export const RELIEF_POINTER = {
  maxX: 0.012,
  maxY: 0.008,
  response: 7.5,
} as const

export const RELIEF_CAPTURE = {
  designWidth: 1440,
  designHeight: 960,
  mobileWidth: 390,
  mobileHeight: 844,
  seed: 0x5712a3,
} as const

export const RELIEF_LAYERS = {
  cypress: { depth: 1.0, shadowDepth: 0.52, opacity: 0.58, shadowOpacity: 0.38 },
  foreground: { depth: 0.42, shadowDepth: 0.24, opacity: 0.36, shadowOpacity: 0.2 },
} as const

export const RELIEF_VISUAL_CONTRACT = {
  subject: 'The Starry Night as a living relief painting',
  rejects: [
    'the sky or base painting slides under pointer input',
    'the cypress becomes a black cone, blade, or faceted prop',
    'a finite sky card edge or rear void is visible',
    'the village or island reads as a toy stage before the painting reads',
    'the route depends on Bloom or post-processing to make the composition readable',
  ],
  invariants: [
    'front composition remains the original painting at rest',
    'source-space StreamlineSky remains the only sky-motion mechanism',
    'pointer input moves only masked foreground layers',
    'reduced motion freezes the sky while keeping a dignified still painting',
  ],
} as const
```

- [ ] **Step 2: Add `scripts/relief-contract.test.ts`**

Test the contract directly:

```ts
import test from 'node:test'
import assert from 'node:assert/strict'
import { RELIEF_CAPTURE, RELIEF_LAYERS, RELIEF_POINTER, RELIEF_VISUAL_CONTRACT } from '../src/scene/reliefContract.ts'

test('relief pointer movement is deliberately tiny and bounded', () => {
  assert.equal(RELIEF_POINTER.maxX, 0.012)
  assert.equal(RELIEF_POINTER.maxY, 0.008)
  assert.ok(RELIEF_POINTER.response >= 6)
  assert.ok(RELIEF_POINTER.response <= 10)
})

test('foreground layers are ordered in shallow relief depth', () => {
  assert.ok(RELIEF_LAYERS.cypress.depth > RELIEF_LAYERS.foreground.depth)
  assert.ok(RELIEF_LAYERS.cypress.shadowDepth < RELIEF_LAYERS.cypress.depth)
  assert.ok(RELIEF_LAYERS.foreground.shadowDepth < RELIEF_LAYERS.foreground.depth)
  assert.ok(RELIEF_LAYERS.cypress.opacity <= 0.65)
  assert.ok(RELIEF_LAYERS.foreground.opacity <= 0.45)
})

test('relief capture contract keeps deterministic review dimensions', () => {
  assert.equal(RELIEF_CAPTURE.designWidth, 1440)
  assert.equal(RELIEF_CAPTURE.designHeight, 960)
  assert.equal(RELIEF_CAPTURE.mobileWidth, 390)
  assert.equal(RELIEF_CAPTURE.mobileHeight, 844)
  assert.equal(RELIEF_CAPTURE.seed, 0x5712a3)
})

test('relief visual contract rejects the failed diorama behaviours', () => {
  assert.ok(RELIEF_VISUAL_CONTRACT.rejects.some((item) => item.includes('sky card edge')))
  assert.ok(RELIEF_VISUAL_CONTRACT.rejects.some((item) => item.includes('black cone')))
  assert.ok(RELIEF_VISUAL_CONTRACT.invariants.some((item) => item.includes('pointer input moves only masked foreground')))
})
```

- [ ] **Step 3: Update `package.json`**

Append `scripts/relief-contract.test.ts` to `test:sky` so the route contract runs with the existing suite.

## Task 2: Source-Locked Relief Route

- [ ] **Step 1: Create `src/scene/ReliefExperience.tsx`**

Implementation shape:

```tsx
<Canvas frameloop="always" dpr={[1, 1.5]} gl={{ preserveDrawingBuffer: true, antialias: true }}>
  <Suspense fallback={null}>
    {debug !== 'layers' && <LivingPainting paused={reduced} />}
    {debug !== 'layers' && <StreamlineSky paused={reduced} />}
    {debug !== 'sky' && <ReliefForeground paused={reduced} debug={debug} />}
  </Suspense>
</Canvas>
```

The route must parse `debug=sky|layers`, with all other values becoming `final`.

- [ ] **Step 2: Add bounded pointer state inside `ReliefForeground`**

Use `window.pointermove` and `window.blur`; smooth with a frame-rate-independent response:

```ts
const k = 1 - Math.exp(-RELIEF_POINTER.response * dt)
current.current.x += (target.current.x - current.current.x) * k
current.current.y += (target.current.y - current.current.y) * k
```

When `paused` is true, target and current offsets must settle to zero so reduced-motion does not keep drifting.

- [ ] **Step 3: Render masked foreground layers**

Load `/reference/painting.jpg` and `/reference/sky-mask.png`, set both `NoColorSpace` and `flipY=false`, then draw image-space quads through `IMG_TO_CLIP_GLSL`. The fragment shader samples the painting and mask:

```glsl
float foreground = 1.0 - texture2D(uMask, vImgUv).r;
float lum = dot(col, vec3(0.299, 0.587, 0.114));
float cypressGate = (1.0 - smoothstep(0.24, 0.39, vImgUv.x)) * (1.0 - smoothstep(0.22, 0.36, lum));
float lowerGate = smoothstep(0.55, 0.68, vImgUv.y) * smoothstep(0.05, 0.22, vImgUv.x);
```

Draw cypress and lower foreground as separate layers. Draw their shadow passes first with fixed tiny offsets so depth is visible even at rest, then draw the source-colour passes with pointer offset. The shader must discard low alpha pixels so no rectangular card appears.

## Task 3: Route Wiring And Notes

- [ ] **Step 1: Modify `src/App.tsx`**

Import `ReliefExperience` and add before the diorama branch:

```tsx
if (mode === 'relief') {
  return <ReliefExperience clean={clean} reduced={motionPaused} />
}
```

- [ ] **Step 2: Modify `src/index.css`**

Add:

```css
.relief-shell {
  background: #07132e;
}
```

- [ ] **Step 3: Update repo notes**

Append a dated lesson stating that Mark rejected the front-arc diorama screenshot because the sky still read as a projected card and the cypress/void problem survived. Update `tasks/todo.md` so the active pickup is Option 1: `?mode=relief`.

## Task 4: Verification And Capture

- [ ] **Step 1: Run mechanical checks**

```bash
npm run test:sky
npm run lint
npm run build
```

- [ ] **Step 2: Capture evidence**

Capture to `output/playwright/living-relief-2026-07-06/`:

```text
desktop-final.png       ?mode=relief&clean=1
desktop-sky.png         ?mode=relief&debug=sky&clean=1
desktop-layers.png      ?mode=relief&debug=layers&clean=1
desktop-pointer-left.png
desktop-pointer-right.png
desktop-reduced.png     with prefers-reduced-motion emulated
mobile-final.png        390x844 ?mode=relief&clean=1
```

- [ ] **Step 3: Visual self-review**

Reject the slice if the capture still reads as a floating toy island, a finite sky card, a black geometric cypress, or if pointer captures show the sky/base painting sliding. Accept only if the first read is the original painting alive, with depth as a restrained secondary effect.
