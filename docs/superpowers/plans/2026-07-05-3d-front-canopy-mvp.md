# 3D Front Canopy MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an isolated, capture-gated 3D front-canopy MVP that carries the settled `StreamlineSky` motion into a tasteful authored 3D front view without replacing the default localhost presentation until the screenshot passes.

**Architecture:** Keep the current 2D `LivingPainting` + `StreamlineSky` route as the default. Add an explicit review route (`?mode=canopy`) with its own camera contract, foreground matte, curved sky canopy, debug modes, and clean-capture controls. Extract the source-space streamline builder so both the 2D overlay and the 3D canopy share the same flow, mask, halo, colour, seed, and tuning logic.

**Tech Stack:** React 19, TypeScript, Vite, Three.js 0.184, React Three Fiber 9, drei camera/orbit helpers, Leva dev controls, Node `node:test`, existing Codex Playwright canvas-readback workflow.

---

## Autonomous Loop

Spec: `docs/superpowers/specs/2026-07-05-autonomous-3d-front-canopy-spec.md`.

Codex owns design calls for this slice. Execute spec → self-review → edit → plan → self-review → edit → implement → review → Playwright capture → visual self-review. Do not ask Mark for approval midstream. Mark only sees a result after the screenshot has passed Codex's internal visual contract, or an honest failure report if it cannot be made presentable locally.

## Visual Contract

The MVP passes only if the head-on screenshot reads as a Van Gogh sky volume, not a rectangular card or a generic particle dome.

- **Subject:** The Starry Night sky becoming a curved, orbitable front canopy over the painting composition.
- **Identity:** central double whorl, moon, Venus, star halo regions, cobalt sky, foreground silhouette.
- **Silhouette:** foreground must not be the old faceted placeholder island in the gate capture.
- **Motion:** brightness travels along source-space streamlines; no worm strokes, dab confetti, water blur, fan spin, or parsed-frame ping-pong.
- **Camera:** authored head-on design camera first; constrained orbit only after front composition passes.
- **No-post baseline:** the canopy must read without Bloom before any cinematic polish is enabled.
- **Hard reject:** visible canopy rectangle, visible dev UI in review capture, title/FPS collision, old `Diorama` faceting dominating the frame, or a screenshot that needs explanation.

## File Structure

- Create `src/scene/canopyContract.ts` — camera, orbit, clean-capture, and visual contract constants.
- Create `src/scene/streamlineGeometry.ts` — reusable source-space streamline ribbon builder extracted from `StreamlineSky`.
- Create `src/scene/frontCanopyMapping.ts` — painting UV to curved canopy world-space mapping, edge fades, and debug helpers.
- Create `src/scene/FrontCanopySky.tsx` — R3F world-space ribbon renderer using the shared streamline builder.
- Create `src/scene/CanopyForegroundMatte.tsx` — pixel-faithful painting foreground occluder using `painting.jpg` and inverse `sky-mask.png`.
- Create `src/scene/CanopyExperience.tsx` — isolated review scene, authored camera, constrained orbit, debug/no-post modes.
- Modify `src/scene/StreamlineSky.tsx` — consume `streamlineGeometry.ts` while keeping current 2D output visually unchanged.
- Modify `src/App.tsx` — route `?mode=canopy` to `CanopyExperience`; default remains restored 2D.
- Modify `src/index.css` — clean capture mode hides title, dock, Leva, and Stats for the review URL only.
- Create `scripts/streamline-geometry.test.ts` — deterministic builder tests.
- Create `scripts/front-canopy-mapping.test.ts` — mapping, anchor, edge-fade, and frame tests.
- Modify `package.json` — include the new tests in `npm run test:sky`.
- Update `tasks/todo.md` and `tasks/lessons.md` only after the visual result is accepted or explicitly rejected.

---

### Task 1: Add The Canopy Review Contract

**Files:**
- Create: `src/scene/canopyContract.ts`
- Modify: `src/App.tsx`
- Modify: `src/index.css`

- [ ] **Step 1: Create contract constants**

Add `src/scene/canopyContract.ts` with:

```ts
export const CANOPY_CAMERA = {
  position: [0.0, 1.12, 5.15] as const,
  target: [0.0, 1.04, 0.0] as const,
  fov: 42,
  near: 0.08,
  far: 40,
}

export const CANOPY_ORBIT = {
  minAzimuthAngle: -0.34,
  maxAzimuthAngle: 0.34,
  minPolarAngle: 1.28,
  maxPolarAngle: 1.72,
  enablePan: false,
  enableDamping: true,
}

export const CANOPY_CAPTURE = {
  designWidth: 1440,
  designHeight: 960,
  mobileWidth: 390,
  mobileHeight: 844,
  seed: 0x5712a3,
}

export const CANOPY_VISUAL_CONTRACT = {
  subject: 'source-space Van Gogh streamlines projected onto a curved front canopy',
  rejects: [
    'visible rectangular sky card',
    'old faceted diorama dominates the frame',
    'dev UI visible in review capture',
    'title or FPS overlaps the canvas',
    'canopy only works because Bloom hides the structure',
  ],
} as const
```

- [ ] **Step 2: Add explicit route selection**

In `src/App.tsx`, read `window.location.search` once inside `App()`:

```ts
const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
const mode = params.get('mode')
const clean = params.get('clean') === '1'
```

Then branch before the current 2D return:

```tsx
if (mode === 'canopy') {
  return <CanopyExperience clean={clean} reduced={reduced} />
}
```

Import `CanopyExperience` from `./scene/CanopyExperience`.

- [ ] **Step 3: Add clean capture CSS**

In `src/index.css`, add a class or data attribute used only by `CanopyExperience`:

```css
.visitor-shell.is-clean-capture .visitor-title,
.visitor-shell.is-clean-capture .visitor-dock,
.visitor-shell.is-clean-capture .leva-c-kWgxhW,
.visitor-shell.is-clean-capture .stats {
  display: none !important;
}
```

If the actual Stats/Leva DOM class differs, capture the DOM once and update the selector before trusting the clean mode.

- [ ] **Step 4: Verify the default route is untouched**

Run:

```bash
npm run lint
npm run test:sky
npm run build
```

Expected: all pass, and `http://127.0.0.1:5174/` still shows the restored 2D baseline.

---

### Task 2: Extract The Shared Source-Space Streamline Builder

**Files:**
- Create: `src/scene/streamlineGeometry.ts`
- Modify: `src/scene/StreamlineSky.tsx`
- Create: `scripts/streamline-geometry.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Move source-space logic out of `StreamlineSky`**

Create `buildSourceStreamlineRibbons()` in `src/scene/streamlineGeometry.ts`. It must return source UV vertices, colour, length, across, phase, rate, and indices without knowing whether the output is 2D clip-space or 3D world-space.

Required public shape:

```ts
import type { ImageData2D } from './useImageData'

export type SourceRibbonVertex = {
  u: number
  v: number
  len: number
  across: number
  phase: number
  rate: number
  color: [number, number, number]
}

export type SourceRibbonBuildOptions = {
  flowData: ImageData2D
  maskData: ImageData2D
  paintingData: ImageData2D
  count: number
  strokeWidth: number
  points: number
  stepSize: number
  seed: number
}

export type SourceRibbonGeometry = {
  vertices: SourceRibbonVertex[]
  indices: number[]
}

export function buildSourceStreamlineRibbons(options: SourceRibbonBuildOptions): SourceRibbonGeometry
```

The implementation must preserve the current `StreamlineSky` rules: signed-flow sampling, halo/mask overrides, moon exclusion, deterministic `mulberry32`, heading continuity, `sampleColour`, per-ribbon phase/rate, and current width behavior.

- [ ] **Step 2: Keep `StreamlineSky` visually equivalent**

Replace the in-component geometry loop with:

```ts
const ribbons = buildSourceStreamlineRibbons({
  flowData,
  maskData,
  paintingData,
  count,
  strokeWidth,
  points,
  stepSize,
  seed: 0x5712a3,
})
```

Then map each source vertex to the existing 2D `BufferGeometry` position:

```ts
positions.push(vertex.u, vertex.v, 0)
colors.push(...vertex.color)
aLen.push(vertex.len)
aAcross.push(vertex.across)
aPhase.push(vertex.phase)
aRate.push(vertex.rate)
```

- [ ] **Step 3: Add deterministic builder tests**

Create `scripts/streamline-geometry.test.ts` with tests that use tiny synthetic `ImageData2D` objects:

```ts
import assert from 'node:assert/strict'
import test from 'node:test'
import { buildSourceStreamlineRibbons } from '../src/scene/streamlineGeometry.ts'
import type { ImageData2D } from '../src/scene/useImageData.ts'

function image(width: number, height: number, rgba: [number, number, number, number]): ImageData2D {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < data.length; i += 4) data.set(rgba, i)
  return { width, height, data }
}

test('source streamline builder is deterministic', () => {
  const flow = image(16, 16, [255, 128, 255, 255])
  const mask = image(16, 16, [255, 255, 255, 255])
  const painting = image(16, 16, [20, 80, 160, 255])
  const a = buildSourceStreamlineRibbons({ flowData: flow, maskData: mask, paintingData: painting, count: 12, strokeWidth: 0.004, points: 6, stepSize: 0.01, seed: 123 })
  const b = buildSourceStreamlineRibbons({ flowData: flow, maskData: mask, paintingData: painting, count: 12, strokeWidth: 0.004, points: 6, stepSize: 0.01, seed: 123 })
  assert.deepEqual(a, b)
  assert.ok(a.vertices.length > 0)
  assert.ok(a.indices.length > 0)
})

test('source streamline vertices stay in image UV bounds', () => {
  const flow = image(16, 16, [255, 128, 255, 255])
  const mask = image(16, 16, [255, 255, 255, 255])
  const painting = image(16, 16, [20, 80, 160, 255])
  const built = buildSourceStreamlineRibbons({ flowData: flow, maskData: mask, paintingData: painting, count: 16, strokeWidth: 0.004, points: 8, stepSize: 0.01, seed: 456 })
  for (const vertex of built.vertices) {
    assert.ok(vertex.u >= 0 && vertex.u <= 1)
    assert.ok(vertex.v >= 0 && vertex.v <= 1)
  }
})
```

- [ ] **Step 4: Add the test to `package.json`**

Append `scripts/streamline-geometry.test.ts` to `test:sky`.

- [ ] **Step 5: Verify no 2D regression**

Run:

```bash
npm run test:sky
npm run lint
npm run build
```

Expected: all pass. Then capture the default 2D route and compare it visually to the restored baseline before continuing.

---

### Task 3: Build The Curved Front-Canopy Mapping

**Files:**
- Create: `src/scene/frontCanopyMapping.ts`
- Create: `scripts/front-canopy-mapping.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Implement UV to world-space mapping**

Create `src/scene/frontCanopyMapping.ts`:

```ts
import { Vector3 } from 'three'
import { DOME_R, uvToFrontDir, frontUV, smoothstep } from './skyMapping'

export const CANOPY_RADIUS = DOME_R
export const CANOPY_HORIZON_V = 0.62

export function uvToCanopyPosition(u: number, v: number, out = new Vector3()): Vector3 {
  return out.copy(uvToFrontDir(u, v)).multiplyScalar(CANOPY_RADIUS)
}

export function canopyEdgeFade(u: number, v: number): number {
  const x = smoothstep(0.0, 0.06, u) * smoothstep(1.0, 0.94, u)
  const y = smoothstep(0.0, 0.04, v) * smoothstep(1.0, 0.9, v)
  return x * y
}

export function canopyRoundTrip(u: number, v: number) {
  const dir = uvToCanopyPosition(u, v).normalize()
  return frontUV(dir)
}
```

This deliberately reuses the proven `uvToFrontDir` convention instead of introducing a new card-like surface.

- [ ] **Step 2: Test anchor positions and edge fade**

Create `scripts/front-canopy-mapping.test.ts`:

```ts
import assert from 'node:assert/strict'
import test from 'node:test'
import { MOON_UV, STAR_UVS, VENUS_UV } from '../src/scene/skyMapping.ts'
import { canopyEdgeFade, canopyRoundTrip, uvToCanopyPosition } from '../src/scene/frontCanopyMapping.ts'

const close = (a: number, b: number, eps = 0.002) => Math.abs(a - b) <= eps

test('canopy mapping preserves painting anchors', () => {
  for (const [u, v] of [VENUS_UV, MOON_UV, ...STAR_UVS]) {
    const rt = canopyRoundTrip(u, v)
    assert.equal(rt.onArc, true)
    assert.equal(close(rt.u, u), true, `u ${rt.u} ~= ${u}`)
    assert.equal(close(rt.v, v), true, `v ${rt.v} ~= ${v}`)
  }
})

test('canopy positions sit on a spherical front volume', () => {
  const p = uvToCanopyPosition(0.5, 0.35)
  assert.ok(Math.abs(p.length() - 6) < 1e-6)
})

test('canopy edge fade hides rectangular boundaries', () => {
  assert.equal(canopyEdgeFade(0.5, 0.4) > 0.95, true)
  assert.equal(canopyEdgeFade(0.001, 0.4) < 0.05, true)
  assert.equal(canopyEdgeFade(0.5, 0.99) < 0.25, true)
})
```

- [ ] **Step 3: Add the test to `package.json`**

Append `scripts/front-canopy-mapping.test.ts` to `test:sky`.

- [ ] **Step 4: Verify**

Run:

```bash
npm run test:sky
npm run lint
```

Expected: mapping tests pass, and no TypeScript lint errors.

---

### Task 4: Render The 3D Canopy Without Post-Processing

**Files:**
- Create: `src/scene/FrontCanopySky.tsx`
- Modify: `src/scene/frontCanopyMapping.ts`

- [ ] **Step 1: Create `FrontCanopySky`**

`FrontCanopySky` loads the same `/reference/signed-flow.png`, `/reference/sky-mask.png`, and `/reference/painting.jpg` inputs as `StreamlineSky`, calls `buildSourceStreamlineRibbons()`, and maps every source vertex with `uvToCanopyPosition()`.

Material requirements:

- same `aLen`, `aAcross`, `aPhase`, `aRate`, `aColor` semantics as `StreamlineSky`;
- world-space `position`;
- transparent `ShaderMaterial`;
- `depthWrite: false`;
- `side: DoubleSide`;
- uniform `uNoPostDebug` or prop-controlled material variant for no-post captures;
- `uFreeze` obeys pause/reduced motion.

- [ ] **Step 2: Use edge fade in alpha**

Add an `aEdgeFade` attribute from `canopyEdgeFade(u, v)` and multiply it into fragment alpha:

```glsl
float a = edge * taper * uOpacity * maskVal * vEdgeFade;
```

If the edge of the canopy is visible in the first capture, stop and fix mapping/fade before adding foreground or Bloom.

- [ ] **Step 3: Verify mechanically**

Run:

```bash
npm run test:sky
npm run lint
npm run build
```

Expected: all pass.

---

### Task 5: Add A Foreground Matte Instead Of The Old Faceted Diorama

**Files:**
- Create: `src/scene/CanopyForegroundMatte.tsx`

- [ ] **Step 1: Render a pixel-faithful foreground occluder**

Create a plane in the authored camera frame that samples `painting.jpg` and `sky-mask.png`. The shader discards sky pixels and keeps foreground pixels:

```glsl
float sky = texture2D(uMask, imgUv).r;
if (sky > 0.35) discard;
gl_FragColor = vec4(texture2D(uPainting, imgUv).rgb, 1.0);
```

This is not the final 3D foreground. It is a gate-safe composition scaffold so the sky volume can be judged without the parked `Diorama` faceting dominating the frame.

- [ ] **Step 2: Place it as an occluder**

Use a world-space plane aligned to the design camera so the full painting foreground registers in the head-on view. It should sit in front of the canopy and write depth normally.

- [ ] **Step 3: Add a debug toggle**

Expose `foreground=matte|none|legacy` from query params. The default for the gate capture is `matte`. `legacy` may render the parked `Diorama` only for internal comparison; do not use `legacy` for Mark's gate capture until it no longer dominates the frame.

---

### Task 6: Compose The Isolated Canopy Experience

**Files:**
- Create: `src/scene/CanopyExperience.tsx`
- Modify: `src/App.tsx`
- Modify: `src/index.css`

- [ ] **Step 1: Create the review scene**

`CanopyExperience` owns a full-screen `Canvas`, a `PerspectiveCamera`, constrained `OrbitControls`, `FrontCanopySky`, `CanopyForegroundMatte`, a simple gradient/backdrop only if needed, and optional debug labels hidden in clean mode.

Camera requirements:

- derive camera from `CANOPY_CAMERA`;
- set FOV/near/far explicitly and update projection;
- reset target from `CANOPY_CAMERA.target`;
- constrained orbit only;
- no pan;
- clean mode hides all UI and metrics.

- [ ] **Step 2: Add debug modes through query params**

Support:

```text
?mode=canopy&clean=1          final clean capture
?mode=canopy&debug=nopost     no-post baseline
?mode=canopy&debug=edges      canopy edge fade review
?mode=canopy&foreground=none  sky-only composition review
?mode=canopy&foreground=legacy internal old-Diorama comparison only
```

- [ ] **Step 3: First visual stop**

Before adding Bloom or any extra polish, capture:

```text
desktop final/no-post at 1440x960
mobile final/no-post at 390x844
sky-only desktop at 1440x960
edge-debug desktop at 1440x960
```

Reject immediately if the screenshot still reads as a card, if the canopy boundary is visible, if foreground registration is off, or if the clean capture contains dev UI.

---

### Task 7: Add Polish Only After The No-Post Scene Reads

**Files:**
- Modify: `src/scene/CanopyExperience.tsx`
- Optional modify: `src/scene/FrontCanopySky.tsx`

- [ ] **Step 1: Add Bloom only after the no-post baseline passes**

Use the existing `@react-three/postprocessing` stack only when `debug !== 'nopost'`. Keep intensity restrained at first:

```tsx
<EffectComposer>
  <Bloom intensity={0.55} luminanceThreshold={0.32} mipmapBlur radius={0.45} />
</EffectComposer>
```

- [ ] **Step 2: Verify Bloom is not carrying the scene**

Capture `debug=nopost` and final with the same camera/time. The no-post image must still show coherent Van Gogh flow; Bloom may add glow but may not hide weak structure.

---

### Task 8: Visual Gate And Notes

**Files:**
- Modify after result only: `tasks/todo.md`
- Modify after result only: `tasks/lessons.md`

- [ ] **Step 1: Run mechanical gates**

```bash
npm run test:sky
npm run lint
npm run build
```

Expected: all pass.

- [ ] **Step 2: Run capture gate**

Use the established Playwright canvas-readback workflow. Save captures under:

```text
output/playwright/front-canopy-mvp-2026-07-05/
```

Required captures:

```text
desktop-clean-final.jpg
desktop-clean-nopost.jpg
desktop-edge-debug.jpg
desktop-sky-only.jpg
mobile-clean-final.jpg
mobile-clean-nopost.jpg
```

- [ ] **Step 3: Self-review before presenting**

Compare the captures against:

- `reference/painting.jpg`;
- the `pvrellis` reference direction: connected sky flow, not independent effects;
- the hard rejects in `CANOPY_VISUAL_CONTRACT.rejects`.

Do not present if any hard reject is visible.

- [ ] **Step 4: Update notes honestly**

If it passes internal visual review, update `tasks/todo.md` and `tasks/lessons.md` as "front-canopy MVP ready for Mark review." If it fails, update them as a failed local attempt and name the visible failure. Do not call mechanical test success progress by itself.

---

## Plan Self-Review Findings Applied

- Removed human execution choice because Mark explicitly requested no approval gates.
- Linked the autonomous spec so implementation has one source of design truth.
- Kept the default 2D route protected while isolating the 3D attempt behind `?mode=canopy`.
- Added hard rejection checks around visible card edges, old faceted foreground, and dev UI in captures.
- Preserved mechanical tests while making Playwright visual captures the real presentation gate.

## Execution Rule

Execute inline task-by-task. The first real gate is not code completion; it is the no-post desktop capture. If that capture fails the visual contract, iterate locally before presenting.
