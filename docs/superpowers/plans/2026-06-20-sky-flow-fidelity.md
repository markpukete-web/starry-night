# Sky Flow Fidelity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the default/front sky flow read materially closer to Van Gogh's original painting before release work resumes.

**Architecture:** Split the sky renderer into testable pure math plus rendering assembly. The front-facing sky becomes an original-derived layer: streamlines seed in painting UV space, integrate through `flow-field.png`, sample colour from `painting.jpg`, then map onto the existing front dome arc. The existing native vortex field remains for back/side coverage, but it no longer dominates the front view.

**Tech Stack:** Vite, React, TypeScript, React Three Fiber, three.js, Node's built-in test runner for pure math checks, existing canvas-readback capture workflow for visual review.

**Runner constraint:** `scripts/` is not included in `tsconfig.app.json` or `tsconfig.node.json`, and raw Node ESM does not resolve extensionless TypeScript imports. Any new module that is imported by a Node test must use explicit `.ts` extensions in its own local imports. `npm run test:sky` is the validation for those tests; `npm run build` does not type-check `scripts/*.test.ts`.

---

## File Structure

- Modify: `src/scene/SkyDome.tsx`
  - Keep React component, materials, sprites, and final geometry assembly.
  - Remove front-flow math that becomes pure helper code.
- Create: `src/scene/skyMapping.ts`
  - Owns camera-facing dome basis, painting UV mapping, inverse front UV lookup, star/moon UV anchors, and vortex construction.
- Create: `src/scene/frontFlow.ts`
  - Owns front-layer stroke seeding and integration through the derived flow field.
  - Produces arrays of points with painting UVs and dome directions.
- Create: `src/scene/skyGeometry.ts`
  - Owns ribbon geometry construction from front-flow strokes plus secondary back/orbit strokes.
  - Keeps per-vertex colour sampling close to geometry generation.
- Create: `scripts/sky-mapping.test.ts`
  - Node test for `uvToFrontDir`/`frontUV` round trips and known anchors.
- Create: `scripts/front-flow.test.ts`
  - Node test for deterministic front stroke integration and bounds.
- Modify: `package.json`
  - Add `test:sky` script.
- Modify: `tasks/lessons.md`
  - Append capture review lessons after implementation and visual review.

This plan only implements sky-flow fidelity. Cypress and village refinement get a separate plan after Mark approves the updated sky captures.

---

### Task 1: Extract Sky Mapping And Add Pure Tests

**Files:**
- Create: `src/scene/skyMapping.ts`
- Create: `scripts/sky-mapping.test.ts`
- Modify: `src/scene/SkyDome.tsx`
- Modify: `package.json`

- [ ] **Step 1: Create the sky mapping module**

Create `src/scene/skyMapping.ts` with the mapping constants and helpers currently embedded in `SkyDome.tsx`.

```ts
import { Vector3 } from 'three'
import { mulberry32 } from './brush.ts'

export const DOME_R = 6
export const POINTS = 13
export const STEP = 0.05
export const HORIZON = -0.22

export type Vortex = {
  dir: Vector3
  strength: number
  sign: number
  radius: number
  star: boolean
  moon: boolean
  scale: number
  core: boolean
}

export const VENUS_UV: [number, number] = [0.27, 0.33]
export const MOON_UV: [number, number] = [0.8, 0.2]
export const STAR_UVS: [number, number][] = [
  [0.13, 0.13],
  [0.2, 0.065],
  [0.31, 0.13],
  [0.4, 0.1],
  [0.1, 0.42],
  [0.52, 0.2],
  [0.59, 0.095],
  [0.66, 0.27],
  [0.72, 0.175],
]

const CAM_POS = new Vector3(2.2, 1.5, 4.6)
const CAM_TARGET = new Vector3(0, 1.05, 0)
export const FRONT_AZ = Math.atan2(CAM_TARGET.x - CAM_POS.x, CAM_TARGET.z - CAM_POS.z)
const FRONT_EL = 0.2
export const SPAN_H = 2.15
export const SPAN_V = SPAN_H / 1.26

export function dirAzEl(az: number, el: number): Vector3 {
  const ce = Math.cos(el)
  return new Vector3(ce * Math.sin(az), Math.sin(el), ce * Math.cos(az))
}

export const FWD = dirAzEl(FRONT_AZ, FRONT_EL)
export const RIGHT = new Vector3().crossVectors(FWD, new Vector3(0, 1, 0)).normalize()
export const TRUEUP = new Vector3().crossVectors(RIGHT, FWD).normalize()
export const BACK_AZ = FRONT_AZ - Math.PI

export function uvToFrontDir(u: number, v: number): Vector3 {
  const h = (u - 0.5) * SPAN_H
  const w = (0.5 - v) * SPAN_V
  const cw = Math.cos(w)
  return new Vector3()
    .addScaledVector(FWD, cw * Math.cos(h))
    .addScaledVector(RIGHT, cw * Math.sin(h))
    .addScaledVector(TRUEUP, Math.sin(w))
    .normalize()
}

export function frontUV(p: Vector3): { u: number; v: number; h: number; w: number; onArc: boolean } {
  const w = Math.asin(Math.min(1, Math.max(-1, p.dot(TRUEUP))))
  const fwd = p.dot(FWD)
  const h = Math.atan2(p.dot(RIGHT), fwd)
  const u = 0.5 + h / SPAN_H
  const v = 0.5 - w / SPAN_V
  return { u, v, h, w, onArc: fwd > 0 && u >= 0 && u <= 1 && v >= 0 && v <= 1 }
}

export function smoothstep(e0: number, e1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)))
  return t * t * (3 - 2 * t)
}

export function buildVortices(): Vortex[] {
  const rng = mulberry32(0x5747a1)
  const V: Vortex[] = []
  const add = (dir: Vector3, strength: number, sign: number, radius: number, star = false, moon = false, scale = 0.15, core = false) =>
    V.push({ dir, strength, sign, radius, star, moon, scale, core })

  add(uvToFrontDir(0.43, 0.4), 2.05, 1, 0.54, false, false, 0.15, true)
  add(uvToFrontDir(0.58, 0.35), 1.4, -1, 0.4, false, false, 0.15, true)
  add(uvToFrontDir(VENUS_UV[0], VENUS_UV[1]), 1.0, -1, 0.32, true, false, 0.24)
  STAR_UVS.forEach((uv, i) =>
    add(uvToFrontDir(uv[0], uv[1]), 0.6 + 0.2 * rng(), i % 2 === 0 ? 1 : -1, 0.18 + 0.07 * rng(), true, false, 0.13 + 0.04 * rng()),
  )
  add(uvToFrontDir(MOON_UV[0], MOON_UV[1]), 1.1, 1, 0.4, false, true)

  add(dirAzEl(BACK_AZ + 0.5, 0.34), 2.0, -1, 0.55, false, false, 0.15, true)
  add(dirAzEl(BACK_AZ + 0.78, 0.3), 1.5, 1, 0.42)
  add(dirAzEl(BACK_AZ - 0.7, 0.22), 1.7, 1, 0.46, false, false, 0.15, true)
  add(dirAzEl(BACK_AZ - 0.98, 0.18), 1.3, -1, 0.4)
  for (let i = 0; i < 10; i++) {
    add(dirAzEl(BACK_AZ + (rng() - 0.5) * 3.6, -0.05 + rng() * 1.3), 0.6 + 0.3 * rng(), rng() < 0.5 ? -1 : 1, 0.18 + 0.08 * rng(), true, false, 0.12 + 0.04 * rng())
  }
  for (let i = 0; i < 16; i++) {
    add(dirAzEl(BACK_AZ + (rng() - 0.5) * 4.0, -0.1 + rng() * 1.5), 0.5 + 0.4 * rng(), rng() < 0.5 ? -1 : 1, 0.28 + 0.16 * rng())
  }
  return V
}
```

- [ ] **Step 2: Add mapping tests**

Create `scripts/sky-mapping.test.ts`.

```ts
import assert from 'node:assert/strict'
import test from 'node:test'
import { MOON_UV, STAR_UVS, VENUS_UV, frontUV, uvToFrontDir } from '../src/scene/skyMapping.ts'

const close = (a: number, b: number, eps = 0.002) => Math.abs(a - b) <= eps

test('front mapping round-trips important painting anchors', () => {
  const anchors = [VENUS_UV, MOON_UV, ...STAR_UVS]
  for (const [u, v] of anchors) {
    const recovered = frontUV(uvToFrontDir(u, v))
    assert.equal(recovered.onArc, true)
    assert.equal(close(recovered.u, u), true, `u ${recovered.u} ~= ${u}`)
    assert.equal(close(recovered.v, v), true, `v ${recovered.v} ~= ${v}`)
  }
})

test('front mapping rejects the back of the dome', () => {
  const front = uvToFrontDir(0.5, 0.5)
  const back = front.clone().multiplyScalar(-1)
  assert.equal(frontUV(back).onArc, false)
})
```

- [ ] **Step 3: Wire the test script**

Modify `package.json` scripts:

```json
"test:sky": "node --test scripts/sky-mapping.test.ts"
```

Run the mapping test:

```bash
npm run test:sky
```

Expected: PASS.

- [ ] **Step 4: Update `SkyDome.tsx` imports**

Remove duplicated constants/functions from `src/scene/SkyDome.tsx` and import them:

```ts
import {
  BACK_AZ,
  DOME_R,
  HORIZON,
  POINTS,
  STEP,
  type Vortex,
  buildVortices,
  dirAzEl,
  frontUV,
  smoothstep,
} from './skyMapping.ts'
```

- [ ] **Step 5: Verify behaviour is unchanged**

Run:

```bash
npm run lint
npm run build
```

Expected: both pass; Vite chunk-size warning may remain.

- [ ] **Step 6: Commit**

```bash
git add package.json src/scene/SkyDome.tsx src/scene/skyMapping.ts scripts/sky-mapping.test.ts
git commit -m "refactor(sky): extract front mapping math"
```

---

### Task 2: Build Original-Derived Front Flow Integration

**Files:**
- Create: `src/scene/frontFlow.ts`
- Create: `scripts/front-flow.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Add front-flow integration helper**

Create `src/scene/frontFlow.ts`.

```ts
import { Vector3 } from 'three'
import type { ImageData2D } from './useImageData.ts'
import { sampleColour, sampleFlow } from './brush.ts'
import { HORIZON, smoothstep, uvToFrontDir } from './skyMapping.ts'

export type FrontFlowPoint = {
  dir: Vector3
  u: number
  v: number
  len: number
  color: [number, number, number]
}

export type FrontFlowStroke = {
  points: FrontFlowPoint[]
  phase: number
  halfWidth: number
}

export function skyLuminance(color: [number, number, number]): number {
  return color[0] * 0.299 + color[1] * 0.587 + color[2] * 0.114
}

export function isUsableSkySeed(colourSrc: ImageData2D, flow: ImageData2D, u: number, v: number): boolean {
  if (v > 0.62) return false
  const color = sampleColour(colourSrc, u, v)
  const { coh } = sampleFlow(flow, u, v)
  return skyLuminance(color) > 0.16 && coh > 0.03
}

export function integrateFrontFlowStroke({
  flow,
  colourSrc,
  u0,
  v0,
  phase,
  halfWidth,
  pointCount,
  stepUv,
}: {
  flow: ImageData2D
  colourSrc: ImageData2D
  u0: number
  v0: number
  phase: number
  halfWidth: number
  pointCount: number
  stepUv: number
}): FrontFlowStroke | null {
  let u = u0
  let v = v0
  let prevTheta: number | null = null
  const raw: FrontFlowPoint[] = []

  for (let i = 0; i < pointCount; i++) {
    if (u < 0.02 || u > 0.98 || v < 0.02 || v > 0.66) break
    if (!isUsableSkySeed(colourSrc, flow, u, v)) break

    const { theta, coh } = sampleFlow(flow, u, v)
    let heading = theta
    if (prevTheta !== null) {
      const forward = Math.cos(heading - prevTheta)
      if (forward < 0) heading += Math.PI
    }
    prevTheta = heading

    const color = sampleColour(colourSrc, u, v)
    const dir = uvToFrontDir(u, v)
    if (dir.y < HORIZON) break
    raw.push({ dir, u, v, len: 0, color })

    const coherenceStep = stepUv * (0.55 + smoothstep(0.05, 0.6, coh) * 0.65)
    u += Math.cos(heading) * coherenceStep
    v += Math.sin(heading) * coherenceStep
  }

  if (raw.length < 3) return null
  const last = raw.length - 1
  const points = raw.map((point, index) => ({ ...point, len: index / last }))
  return { points, phase, halfWidth }
}
```

- [ ] **Step 2: Add deterministic front-flow tests**

Create `scripts/front-flow.test.ts`.

```ts
import assert from 'node:assert/strict'
import test from 'node:test'
import type { ImageData2D } from '../src/scene/useImageData.ts'
import { integrateFrontFlowStroke, isUsableSkySeed } from '../src/scene/frontFlow.ts'

function fakeFlow(width = 16, height = 16): ImageData2D {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 255
    data[i + 1] = 128
    data[i + 2] = 220
    data[i + 3] = 255
  }
  return { data, width, height }
}

function fakePainting(width = 16, height = 16): ImageData2D {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 70
    data[i + 1] = 100
    data[i + 2] = 170
    data[i + 3] = 255
  }
  return { data, width, height }
}

test('front flow accepts bright coherent sky seeds', () => {
  assert.equal(isUsableSkySeed(fakePainting(), fakeFlow(), 0.4, 0.3), true)
})

test('front flow rejects low foreground seeds', () => {
  assert.equal(isUsableSkySeed(fakePainting(), fakeFlow(), 0.4, 0.8), false)
})

test('front flow integration returns ordered points with normalised lengths', () => {
  const stroke = integrateFrontFlowStroke({
    flow: fakeFlow(),
    colourSrc: fakePainting(),
    u0: 0.25,
    v0: 0.25,
    phase: 0.5,
    halfWidth: 0.05,
    pointCount: 7,
    stepUv: 0.025,
  })

  assert.notEqual(stroke, null)
  assert.equal(stroke!.points.length >= 3, true)
  assert.equal(stroke!.points[0].len, 0)
  assert.equal(stroke!.points.at(-1)!.len, 1)
  for (const point of stroke!.points) {
    assert.equal(point.u >= 0 && point.u <= 1, true)
    assert.equal(point.v >= 0 && point.v <= 1, true)
  }
})
```

- [ ] **Step 3: Expand the sky test script**

Modify `package.json` scripts:

```json
"test:sky": "node --test scripts/sky-mapping.test.ts scripts/front-flow.test.ts"
```

- [ ] **Step 4: Run the sky tests**

```bash
npm run test:sky
```

Expected: PASS for both test files.

- [ ] **Step 5: Commit**

```bash
git add package.json src/scene/frontFlow.ts scripts/front-flow.test.ts
git commit -m "feat(sky): add original-derived front flow integration"
```

---

### Task 3: Replace Front-Dominant Vortex Ribbons With Original-Derived Front Layer

**Files:**
- Create: `src/scene/skyGeometry.ts`
- Modify: `src/scene/SkyDome.tsx`

- [ ] **Step 1: Create shared ribbon geometry builder**

Create `src/scene/skyGeometry.ts`. Move the repeated ribbon vertex/index logic out of `SkyDome.tsx` and make it accept front-flow strokes plus existing secondary strokes.

```ts
import { BufferAttribute, BufferGeometry, Vector3 } from 'three'
import type { FrontFlowStroke } from './frontFlow.ts'
import { DOME_R } from './skyMapping.ts'

export type RibbonStroke = {
  points: { dir: Vector3; len: number; color: [number, number, number] }[]
  halfWidth: number
  phase: number
}

export function strokeFromFrontFlow(stroke: FrontFlowStroke): RibbonStroke {
  return {
    halfWidth: stroke.halfWidth,
    phase: stroke.phase,
    points: stroke.points.map((point) => ({ dir: point.dir, len: point.len, color: point.color })),
  }
}

export function buildRibbonGeometry(strokes: RibbonStroke[]): BufferGeometry {
  const positions: number[] = []
  const colors: number[] = []
  const aLen: number[] = []
  const aAcross: number[] = []
  const aPhase: number[] = []
  const indices: number[] = []
  const t = new Vector3()
  const n = new Vector3()
  const perp = new Vector3()
  const eL = new Vector3()
  const eR = new Vector3()
  let vbase = 0

  for (const stroke of strokes) {
    const P = stroke.points
    if (P.length < 3) continue
    for (let k = 0; k < P.length; k++) {
      const width = stroke.halfWidth * (1 - 0.45 * P[k].len)
      t.subVectors(P[Math.min(P.length - 1, k + 1)].dir, P[Math.max(0, k - 1)].dir).normalize()
      n.copy(P[k].dir).multiplyScalar(-1).normalize()
      perp.crossVectors(t, n).normalize()
      eL.copy(P[k].dir).multiplyScalar(DOME_R).addScaledVector(perp, width)
      eR.copy(P[k].dir).multiplyScalar(DOME_R).addScaledVector(perp, -width)
      const [cr, cg, cb] = P[k].color
      positions.push(eL.x, eL.y, eL.z, eR.x, eR.y, eR.z)
      colors.push(cr, cg, cb, cr, cg, cb)
      aLen.push(P[k].len, P[k].len)
      aAcross.push(0, 1)
      aPhase.push(stroke.phase, stroke.phase)
      if (k < P.length - 1) {
        const v0 = vbase + k * 2
        indices.push(v0, v0 + 1, v0 + 2, v0 + 1, v0 + 3, v0 + 2)
      }
    }
    vbase += P.length * 2
  }

  const geo = new BufferGeometry()
  geo.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
  geo.setAttribute('aColor', new BufferAttribute(new Float32Array(colors), 3))
  geo.setAttribute('aLen', new BufferAttribute(new Float32Array(aLen), 1))
  geo.setAttribute('aAcross', new BufferAttribute(new Float32Array(aAcross), 1))
  geo.setAttribute('aPhase', new BufferAttribute(new Float32Array(aPhase), 1))
  geo.setIndex(indices)
  return geo
}
```

- [ ] **Step 2: Generate front strokes from painting UV space with top-up**

In `SkyDome.tsx`, add these imports before editing the `geometry = useMemo(...)` block:

```ts
import { integrateFrontFlowStroke } from './frontFlow.ts'
import { buildRibbonGeometry, strokeFromFrontFlow, type RibbonStroke } from './skyGeometry.ts'
```

Inside the `geometry = useMemo(...)` block, allocate most strokes to front-flow integration. Do not let rejected front seeds silently reduce the front layer. Keep trying until the front target is filled or an explicit attempt cap is reached.

```ts
const frontCount = Math.floor(count * 0.72)
const frontStrokes: RibbonStroke[] = []
let frontAttempts = 0

while (frontStrokes.length < frontCount && frontAttempts < frontCount * 10) {
  frontAttempts += 1
  const u = 0.04 + rng() * 0.92
  const v = 0.035 + rng() * 0.55
  const stroke = integrateFrontFlowStroke({
    flow,
    colourSrc,
    u0: u,
    v0: v,
    phase: rng() * Math.PI * 2,
    halfWidth: (0.028 + 0.04 * rng()) * strokeWidth,
    pointCount: 8,
    stepUv: 0.018 + rng() * 0.012,
  })
  if (stroke) frontStrokes.push(strokeFromFrontFlow(stroke))
}

if (frontStrokes.length < Math.floor(frontCount * 0.85)) {
  console.warn(`front sky flow under-filled: ${frontStrokes.length}/${frontCount}; retune seed filters before visual review`)
}
```

If this warning appears during local review, adjust `v` bounds or the `isUsableSkySeed` thresholds before taking captures. The plan's visual premise depends on the front layer actually being dominant.

- [ ] **Step 3: Extract explicit back/orbit vortex strokes**

Inside the same `geometry = useMemo(...)` block, extract the old vortex integration into a `makeBackVortexStroke` helper. This keeps orbit coverage, but it rejects front-arc seeds so the procedural vortex field cannot reclaim the default view.

```ts
const makeBackVortexStroke = (seed: Vector3): RibbonStroke | null => {
  const points: RibbonStroke['points'] = []
  const p = seed.clone()
  const dir = new Vector3()
  const work = new Vector3()
  let have = false
  const color = sampleColour(colourSrc, 0.05 + rng() * 0.9, rng() * 0.5)

  for (let k = 0; k < POINTS; k++) {
    points.push({ dir: p.clone(), len: 0, color })
    flowAt(p, work)
    if (work.lengthSq() < 1e-8) {
      if (!have) break
      work.copy(dir)
    } else {
      work.normalize()
      if (have && work.dot(dir) < 0) work.multiplyScalar(-1)
    }
    dir.copy(work)
    have = true
    p.addScaledVector(work, STEP).normalize()
    if (p.y < HORIZON) break
  }

  if (points.length < 3) return null
  const last = points.length - 1
  return {
    halfWidth: (0.04 + 0.045 * rng()) * strokeWidth,
    phase: rng() * Math.PI * 2,
    points: points.map((point, index) => ({ ...point, len: index / last })),
  }
}
```

- [ ] **Step 4: Fill the final geometry with front-first ordering**

Keep front strokes first, then top up with back/orbit strokes. If the back fill also under-fills, fail visually before committing rather than hiding the problem.

```ts
const strokes: RibbonStroke[] = [...frontStrokes]
let backAttempts = 0

while (strokes.length < count && backAttempts < count * 12) {
  backAttempts += 1
  const seed = dirAzEl(rng() * Math.PI * 2, HORIZON + 0.04 + rng() * 1.5)
  if (frontUV(seed).onArc) continue
  const stroke = makeBackVortexStroke(seed)
  if (stroke) strokes.push(stroke)
}

if (strokes.length < Math.floor(count * 0.9)) {
  console.warn(`sky geometry under-filled: ${strokes.length}/${count}; retune before visual review`)
}

return buildRibbonGeometry(strokes)
```

- [ ] **Step 5: Remove front flow-bias from the vortex path**

Once front strokes come directly from `flow-field.png`, remove the old `flowBiasAt` nudge from the vortex integration path. The `flowBias` prop can remain wired but should no longer be the front fidelity mechanism.

- [ ] **Step 6: Run non-visual checks**

```bash
npm run test:sky
npm run lint
npm run build
```

Expected: all pass; Vite chunk-size warning may remain.

- [ ] **Step 7: Capture visual checkpoints**

Start or reuse dev server:

```bash
npm run dev
```

Use the established canvas readback workflow from `tasks/lessons.md` to save:

```text
scratch/q1-sky-front.jpeg
scratch/q1-sky-orbit.jpeg
scratch/q1-sky-mobile.jpeg
scratch/q1-sky-reduced.jpeg
```

Expected visual direction:
- front sky has shorter, painting-derived strokes rather than long smooth tubes,
- original reference pane comparison shows the whorl and star halos closer to the painting,
- orbit view still has sky coverage.

- [ ] **Step 8: Check motion fidelity explicitly**

While the dev server is running, pause/unpause from the visitor control and watch the front sky for at least 10 seconds. The motion should travel along the newly derived front strokes. If it reads as a generic shimmer that ignores the original-like paths, retune the shader flow term before committing.

Capture a short before/after frame pair under the same camera position:

```text
scratch/q1-motion-a.jpeg
scratch/q1-motion-b.jpeg
```

Expected motion direction:
- brightness pulses move along the derived stroke paths,
- central whorl and star halos do not drift away from their still-frame structure,
- reduced-motion still freezes the churn.

- [ ] **Step 9: Commit only if visual direction and motion are closer**

```bash
git add src/scene/SkyDome.tsx src/scene/skyGeometry.ts
git commit -m "feat(sky): derive front flow from original painting"
```

Do not `git add scratch/*.jpeg`; `scratch/` is ignored and visual captures are review evidence, not committed artifacts. If the front capture or motion is not closer to the original, do not commit. Retune Task 3 before proceeding.

---

### Task 4: Add Broken Impasto Stroke Language

**Files:**
- Modify: `src/scene/SkyDome.tsx`
- Modify: `src/scene/skyGeometry.ts`

- [ ] **Step 1: Add per-stroke breakup attribute**

Extend `RibbonStroke` in `skyGeometry.ts`:

```ts
export type RibbonStroke = {
  points: { dir: Vector3; len: number; color: [number, number, number] }[]
  halfWidth: number
  phase: number
  breakup: number
}
```

Add `aBreakup` to `buildRibbonGeometry` and set the same value on both side vertices for each point:

```ts
const aBreakup: number[] = []
// inside the point loop:
aBreakup.push(stroke.breakup, stroke.breakup)
// after other attributes:
geo.setAttribute('aBreakup', new BufferAttribute(new Float32Array(aBreakup), 1))
```

- [ ] **Step 2: Wire breakup through front and back strokes**

In `strokeFromFrontFlow`, set:

```ts
breakup: 0.45,
```

For back/orbit vortex strokes, set:

```ts
breakup: 0.22,
```

This makes the front layer more broken and painterly while keeping the invented back calmer.

- [ ] **Step 3: Update shader to break smooth ribbons**

Modify `strokeVert` in `SkyDome.tsx`:

```glsl
attribute float aLen; attribute float aAcross; attribute float aPhase; attribute float aBreakup; attribute vec3 aColor;
varying float vLen; varying float vAcross; varying float vPhase; varying float vBreakup; varying vec3 vColor;
void main() {
  vLen = aLen; vAcross = aAcross; vPhase = aPhase; vBreakup = aBreakup; vColor = aColor;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
```

Modify `strokeFrag`:

```glsl
precision highp float;
uniform float uTime; uniform float uSpeed; uniform float uSat;
varying float vLen; varying float vAcross; varying float vPhase; varying float vBreakup; varying vec3 vColor;

float hash(float n) { return fract(sin(n) * 43758.5453123); }

void main() {
  float edge = sin(clamp(vAcross, 0.0, 1.0) * 3.14159);
  float taper = smoothstep(0.0, 0.14, vLen) * smoothstep(1.0, 0.82, vLen);
  float flow = 0.5 + 0.5 * sin(vLen * 6.0 - uTime * uSpeed + vPhase);
  float broken = smoothstep(vBreakup, 1.0, hash(floor(vLen * 18.0) + floor(vAcross * 5.0) * 17.0 + vPhase * 11.0));
  float ridge = 0.78 + 0.38 * edge;
  float baseLum = dot(vColor, vec3(0.299, 0.587, 0.114));
  float deepen = mix(0.76, 1.0, smoothstep(0.42, 0.82, baseLum));
  vec3 col = vColor * deepen * (0.56 + 0.28 * flow) * ridge;
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  col = clamp(mix(vec3(lum), col, uSat), 0.0, 2.0);
  float a = edge * taper * mix(0.45, 1.0, broken);
  if (a < 0.02) discard;
  gl_FragColor = vec4(col, a);
}
```

- [ ] **Step 4: Run checks**

```bash
npm run test:sky
npm run lint
npm run build
```

Expected: all pass.

- [ ] **Step 5: Capture visual checkpoints**

Save:

```text
scratch/q2-impasto-front.jpeg
scratch/q2-impasto-orbit.jpeg
scratch/q2-impasto-mobile.jpeg
scratch/q2-impasto-reduced.jpeg
```

Expected visual direction:
- front strokes look less like continuous digital pipes,
- central whorl retains structure,
- star halos still glow without becoming sticker-bright.

- [ ] **Step 6: Commit**

```bash
git add src/scene/SkyDome.tsx src/scene/skyGeometry.ts
git commit -m "feat(sky): break front strokes into painterly marks"
```

Do not `git add scratch/*.jpeg`; the capture files remain local review evidence under the ignored `scratch/` directory.

---

### Task 5: Mark Review Gate For Sky Flow

**Files:**
- Modify: `tasks/lessons.md`
- Optional modify after approval: `tasks/todo.md`

- [ ] **Step 1: Prepare a review set**

Create a comparison folder under ignored scratch:

```bash
mkdir -p scratch/sky-flow-review
cp reference/starry-night-source.jpg scratch/sky-flow-review/original.jpg
cp scratch/release-front.jpeg scratch/sky-flow-review/before-front.jpeg
cp scratch/q2-impasto-front.jpeg scratch/sky-flow-review/after-front.jpeg
cp scratch/q2-impasto-mobile.jpeg scratch/sky-flow-review/after-mobile.jpeg
```

- [ ] **Step 2: Write the review note**

Append to `tasks/lessons.md`:

```md
## Sky-flow fidelity gate (2026-06-20)

- Reopened because Mark felt the piece was not close enough to the original painting in 3D.
- Lead change: front sky now derives its stroke paths from `flow-field.png` in painting UV space before mapping to the dome.
- Review set: `scratch/sky-flow-review/original.jpg`, `before-front.jpeg`, `after-front.jpeg`, `after-mobile.jpeg`.
- Mark decision: awaiting capture review before cypress/village refinement begins.
```

- [ ] **Step 3: Ask Mark for visual decision**

Show the original/before/after captures and ask:

```text
Does the new sky flow feel closer to the original painting?

A. Yes, move to cypress/village refinement.
B. Closer, but retune sky one more pass.
C. Not closer; revert the sky approach.
```

- [ ] **Step 4: Commit the review note after Mark replies**

If Mark says A or B:

```bash
git add tasks/lessons.md
git commit -m "docs(sky): record sky-flow review gate"
```

If Mark says C, do not commit the review note; return to Task 3 and adjust the approach.

---

### Task 6: Defer Cypress And Village Into The Next Plan

**Files:**
- Modify: `tasks/todo.md`
- Create after sky approval: `docs/superpowers/specs/2026-06-20-foreground-fidelity-design.md`

- [ ] **Step 1: Update roadmap only after sky approval**

When Mark accepts the sky-flow pass, update `tasks/todo.md` pickup:

```md
### ▶ PICK UP HERE — foreground fidelity gate

Sky-flow fidelity is accepted. Next pass: cypress and village fidelity.

1. Refine cypress silhouette toward ragged Van Gogh brush-flame.
2. Add painterly colour breakup to the cypress surface.
3. Refine village rooflines and clustering so the forms feel embedded in the painting.
4. Capture front, mobile, and orbit views for Mark review.
```

- [ ] **Step 2: Create the foreground fidelity design spec**

Create `docs/superpowers/specs/2026-06-20-foreground-fidelity-design.md` with this header:

```md
# Foreground Fidelity Quality Gate

Date: 2026-06-20
Status: Starts only after sky-flow approval

Goal: Refine the cypress and village so the 3D forms feel closer to the original painting while preserving the approved diorama composition.
```

- [ ] **Step 3: Commit**

```bash
git add tasks/todo.md docs/superpowers/specs/2026-06-20-foreground-fidelity-design.md
git commit -m "docs(roadmap): queue foreground fidelity gate"
```

---

## Self-Review

Spec coverage:
- Sky-flow fidelity is covered by Tasks 2-4.
- Visual comparison workflow is covered by Tasks 3-5.
- Cypress and village are acknowledged but deliberately deferred by Task 6 until sky approval, matching the priority order.
- Release mechanics are excluded until the quality gate passes.

Unfinished-marker scan:
- No unfinished-marker strings or vague implementation steps remain.
- Every task lists concrete files, commands, expected results, and commit points.

Type consistency:
- `FrontFlowStroke`, `RibbonStroke`, `Vortex`, and mapping helper names are introduced before use.
- The plan keeps `ImageData2D`, `sampleFlow`, and `sampleColour` consistent with current project types.
