# Sky Brush-Dab Fidelity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the sky from extruded ribbons into a field of instanced brush-dabs that drift along the derived flow, so the front view reads as Van Gogh's impasto brushwork rather than liquid chrome.

**Architecture:** Split the sky into pure, node-testable maths (`skyMapping` → `flowField` → `dabField`) and GPU assembly (`dabGeometry` + a slimmed `SkyDome`). The macro composition Mark already tuned (vortices placing the central whorl, Venus, stars, moon, swirl-eye glows — *including the swirl-eye protection that keeps the derived field off the hero swirl centres*) is **kept**; only what the sky is *made of* changes — discrete textured dabs placed along streamlines and advected in the vertex shader. See `docs/superpowers/specs/2026-06-20-sky-brushdab-design.md`.

**Tech Stack:** Vite + React + TypeScript + three.js + React Three Fiber; `InstancedBufferGeometry` + a raw `ShaderMaterial`; the existing `makeBrushTexture()` dab; Node's built-in test runner for the pure maths; the project's canvas-readback capture workflow for visual review.

> **Verification note (2026-06-20):** this plan was hardened against a 6-lens adversarial review. The shader great-circle basis, the instanced-mesh approach (`<mesh geometry={InstancedBufferGeometry}>` renders instanced — no `InstancedMesh` needed), and the `node --test` harness (9/9 green, three resolves in-repo) were all confirmed correct. The review's build-breaking findings (unused imports under `noUnusedLocals`, the reduced-motion coverage gap, the dropped swirl-eye protection) are fixed below.

## Global Constraints

Every task implicitly includes these (from the spec, CLAUDE.md, and empirically verified facts):

- **Branch first.** Work on a branch `sky-brushdab`; keep `main` clean. Do not push (Mark gates release).
- **British English; Conventional Commits.** The log reads as a build-in-public timeline.
- **`noUnusedLocals` / `noUnusedParameters` are ON.** Both tsconfigs set them; `@typescript-eslint/no-unused-vars` is an error. **Every import and every destructured prop must be used in the file as it stands at the end of each task** — when a task deletes code, prune the imports/params that code used in the *same* step. A dead `import type` is flagged too (`verbatimModuleSyntax`).
- **Node tests use explicit `.ts` import extensions.** Proven on Node 25: `node --test` does NOT resolve extensionless relative imports (`ERR_MODULE_NOT_FOUND`); `from './brush.ts'` resolves. `tsc` accepts it (`allowImportingTsExtensions: true`). Type-only imports (`import type {…} from './useImageData'`) are erased and may stay extensionless. **Every new module in the test graph (`skyMapping`, `flowField`, `dabField`) uses `.ts` on its runtime relative imports.** `SkyDome.tsx`/`dabGeometry.ts` are bundle-only and keep house-style extensionless imports.
- **Captures live in gitignored `scratch/` and are NEVER committed.** `git add scratch/*` fails (ignored) and breaks convention. Commit code only.
- **Budgets / Tunables:** dab count 8,000 desktop / 3,000 mobile (the `strokes` control); dpr cap `[1, 1.5]` (current Canvas); palette ΔE < 10; orbit limits polar 0.2–1.5, distance 3–5.5, azimuth free, no pan; retune cap 4 passes per slice.
- **Colours derived, never from memory:** front dabs sample `/reference/painting.jpg` at their painting UV; back dabs sample random sky pixels of the same painting (palette-consistent). `PALETTE` for the dome gradient.
- **No new dependencies.** Instancing is core three; the dab texture already exists. Any new dep → stop and ask Mark.
- **Do not edit** CLAUDE.md's locked sections (The bar, Gates, Out of scope, acceptance criteria).
- **Stop at the Mark gate (Task 7).** Reduced-motion must stay a dignified, *fully-covered* still; camera stays within orbit limits; head-on reads as the painting.

---

## File Structure

- **Create `src/scene/skyMapping.ts`** — dome constants, camera-facing basis, painting-UV mapping (`uvToFrontDir`/`frontUV`), anchors, `dirAzEl`, `smoothstep`, `buildVortices`. Pure. *(Extracted verbatim from `SkyDome.tsx`.)*
- **Create `src/scene/flowField.ts`** — `makeFlowField()` → one `flowTangentAt(p,out)` blending vortex circulation (front + back) with the derived painting orientation on the front arc, *with the original swirl-eye protection preserved*. Pure.
- **Create `src/scene/dabField.ts`** — `buildDabField()` integrates streamlines through `flowTangentAt` and drops oriented `Dab` instances; front-biased seeding so the hero arc reads densest. Pure.
- **Create `src/scene/dabGeometry.ts`** — `buildDabGeometry(dabs)` (`InstancedBufferGeometry`) + `makeDabMaterial(brush)` (the dab `ShaderMaterial`, vert + frag).
- **Modify `src/scene/SkyDome.tsx`** — import the extracted maths; replace the ribbon `geometry`/`material` with the dab field; keep the gradient dome, moon, stars, swirl-eye glow sprites; drive the uniforms.
- **Modify `src/App.tsx`** — repurpose the dev-only `swirl tightness` Leva control to the dab **drift arc** (per the spec's tunable table).
- **Create `scripts/sky-mapping.test.ts`, `scripts/flow-field.test.ts`, `scripts/dab-field.test.ts`** — node pure-maths tests.
- **Modify `package.json`** — add `test:sky`.
- **Modify `tasks/lessons.md`** — append the tunable-repurpose decision and review lessons.

This plan implements the **sky only**. Cypress/village/glb is a separate plan after Mark approves these captures.

---

### Task 0: Branch and carry the planning docs (pre-flight)

`main` currently has the spec and this plan as **untracked** files (deliberately — Mark gated the plan before any commit). Before executing, move onto the branch and commit them, so the work starts from a clean, tracked baseline rather than a dirty `main`.

- [ ] **Step 1: Create the branch and commit the planning docs**

```bash
git checkout -b sky-brushdab
git add docs/superpowers/specs/2026-06-20-sky-brushdab-design.md docs/superpowers/plans/2026-06-20-sky-brushdab.md
git commit -m "docs(sky): brush-dab fidelity spec and implementation plan"
git status --short   # expect: clean (no stray src/scene/skyMapping.ts or other untracked code)
```

Confirm `git status` is clean and no partial implementation (e.g. a stray `src/scene/skyMapping.ts`) exists before Task 1. If one does, inspect and remove/stash it — Task 1 creates that file fresh.

---

### Task 1: Extract the sky mapping maths (behaviour-preserving)

A pure extraction: the ribbon path stays fully present in `SkyDome.tsx` at the end of this task, so the rendered scene is unchanged. The test guards the extraction.

**Files:**
- Create: `src/scene/skyMapping.ts`, `scripts/sky-mapping.test.ts`
- Modify: `src/scene/SkyDome.tsx` (delete the extracted block; import it back), `package.json`

**Interfaces:**
- Consumes: `mulberry32` (`./brush.ts`); `Vector3` (three).
- Produces: `DOME_R, POINTS, STEP, HORIZON: number`; `type Vortex`; `dirAzEl(az,el): Vector3`; `VENUS_UV, MOON_UV: [number,number]`; `STAR_UVS, ANCHOR_UVS: [number,number][]`; `FRONT_AZ, BACK_AZ, SPAN_H, SPAN_V: number`; `FWD, RIGHT, TRUEUP: Vector3`; `uvToFrontDir(u,v): Vector3`; `frontUV(p): {u,v,h,w,onArc}`; `smoothstep(e0,e1,x): number`; `buildVortices(): Vortex[]`.

- [ ] **Step 1: Write the failing test**

Create `scripts/sky-mapping.test.ts` (imports use `.ts`). It will fail until Step 3 creates the module — a genuine red phase.

```ts
import assert from 'node:assert/strict'
import test from 'node:test'
import { MOON_UV, STAR_UVS, VENUS_UV, buildVortices, frontUV, uvToFrontDir } from '../src/scene/skyMapping.ts'

const close = (a: number, b: number, eps = 0.002) => Math.abs(a - b) <= eps

test('front mapping round-trips the painting anchors', () => {
  for (const [u, v] of [VENUS_UV, MOON_UV, ...STAR_UVS]) {
    const r = frontUV(uvToFrontDir(u, v))
    assert.equal(r.onArc, true)
    assert.equal(close(r.u, u), true, `u ${r.u} ~= ${u}`)
    assert.equal(close(r.v, v), true, `v ${r.v} ~= ${v}`)
  }
})

test('front mapping rejects the back of the dome', () => {
  const front = uvToFrontDir(0.5, 0.5)
  assert.equal(frontUV(front.clone().multiplyScalar(-1)).onArc, false)
})

test('buildVortices is deterministic and exposes cores, stars and a moon', () => {
  const a = buildVortices()
  const b = buildVortices()
  assert.equal(a.length, b.length)
  assert.equal(a[0].dir.equals(b[0].dir), true)
  assert.equal(a.some((v) => v.core), true)
  assert.equal(a.some((v) => v.star), true)
  assert.equal(a.filter((v) => v.moon).length, 1)
})
```

- [ ] **Step 2: Wire the test script and run it (red)**

Add to `package.json` `scripts` (after `"derive-reference"`):

```json
    "test:sky": "node --test scripts/sky-mapping.test.ts"
```

Run: `npm run test:sky`
Expected: FAIL — `Cannot find module '.../src/scene/skyMapping.ts'`.

- [ ] **Step 3: Create `src/scene/skyMapping.ts`**

Move the constants/functions out of `SkyDome.tsx` verbatim. Note the `.ts` on the `brush` import.

```ts
import { Vector3 } from 'three'
import { mulberry32 } from './brush.ts'

export const DOME_R = 6
export const POINTS = 13
export const STEP = 0.05 // radians per integration step on the sphere
export const HORIZON = -0.22 // strokes live above roughly the horizon

export type Vortex = { dir: Vector3; strength: number; sign: number; radius: number; star: boolean; moon: boolean; scale: number; core: boolean }

export function dirAzEl(az: number, el: number): Vector3 {
  const ce = Math.cos(el)
  return new Vector3(ce * Math.sin(az), Math.sin(el), ce * Math.cos(az))
}

export const VENUS_UV: [number, number] = [0.27, 0.33]
export const MOON_UV: [number, number] = [0.8, 0.2]
export const STAR_UVS: [number, number][] = [
  [0.13, 0.13], [0.2, 0.065], [0.31, 0.13], [0.4, 0.1], [0.1, 0.42],
  [0.52, 0.2], [0.59, 0.095], [0.66, 0.27], [0.72, 0.175],
]

// The painting's high-density points — the swirl eyes, Venus, and the star halos — where Van Gogh's
// impasto piles thickest. Front dabs densify around these so brush-mark density matches the painting
// (flow bias steers a dab's direction; this steers where dabs LAND).
export const ANCHOR_UVS: [number, number][] = [[0.43, 0.4], [0.58, 0.35], VENUS_UV, ...STAR_UVS]

const CAM_POS = new Vector3(2.2, 1.5, 4.6)
const CAM_TARGET = new Vector3(0, 1.05, 0)
export const FRONT_AZ = Math.atan2(CAM_TARGET.x - CAM_POS.x, CAM_TARGET.z - CAM_POS.z)
const FRONT_EL = 0.2
export const FWD = dirAzEl(FRONT_AZ, FRONT_EL)
export const RIGHT = new Vector3().crossVectors(FWD, new Vector3(0, 1, 0)).normalize()
export const TRUEUP = new Vector3().crossVectors(RIGHT, FWD).normalize()
export const BACK_AZ = FRONT_AZ - Math.PI
export const SPAN_H = 2.15
export const SPAN_V = SPAN_H / 1.26

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

- [ ] **Step 4: Run the test (green)**

Run: `npm run test:sky`
Expected: PASS (3 tests).

- [ ] **Step 5: Point `SkyDome.tsx` at the module and delete the extracted block**

In `src/scene/SkyDome.tsx`: delete the now-extracted definitions (`DOME_R, POINTS, STEP, HORIZON`, `type Vortex`, `dirAzEl`, `VENUS_UV/MOON_UV/STAR_UVS`, the `CAM_POS…SPAN_V` block, `uvToFrontDir`, `frontUV`, `smoothstep`, `buildVortices`). Then set the imports. **Import exactly the symbols the surviving ribbon body still uses — no more (`noUnusedLocals`):**

```ts
import type { ImageData2D } from './useImageData'
import { mulberry32, sampleColour, sampleFlow } from './brush'
import { PALETTE } from './palette'
import {
  DOME_R, FWD, HORIZON, POINTS, RIGHT, STEP, TRUEUP,
  buildVortices, dirAzEl, frontUV, smoothstep,
} from './skyMapping'
```

`BACK_AZ, MOON_UV, STAR_UVS, VENUS_UV, uvToFrontDir` and `type Vortex` are **not** imported — after extraction they are used only inside `buildVortices` (now in `skyMapping`). `const vortices = useMemo(() => buildVortices(), [])` is type-inferred, so `Vortex` is not needed here. The rest of `SkyDome.tsx` (ribbon shaders, the `geometry` useMemo with `flowAt`/`flowBiasAt`, JSX) is untouched this task.

- [ ] **Step 6: Verify the build and lint pass**

Run: `npm run lint && npm run build`
Expected: PASS (Vite chunk-size warning may remain). Scene byte-for-byte unchanged.

- [ ] **Step 7: Commit**

```bash
git add package.json src/scene/skyMapping.ts scripts/sky-mapping.test.ts src/scene/SkyDome.tsx
git commit -m "refactor(sky): extract mapping maths into skyMapping module"
```

---

### Task 2: Unified flow-tangent sampler (with swirl-eye protection)

**Files:**
- Create: `src/scene/flowField.ts`, `scripts/flow-field.test.ts`
- Modify: `package.json` (extend `test:sky`)

**Interfaces:**
- Consumes: `Vector3` (three); `ImageData2D` (type, `./useImageData.ts`); `sampleFlow` (`./brush.ts`); `FWD, RIGHT, TRUEUP, frontUV, smoothstep, type Vortex` (`./skyMapping.ts`).
- Produces:
  - `type FlowField = (p: Vector3, out: Vector3) => Vector3` (writes the unit flow tangent into `out`, returns it).
  - `makeFlowField(opts: { flow: ImageData2D; vortices: Vortex[]; swirlTightness: number; flowBias: number }): FlowField`.
  - `vortexTangent(vortices: Vortex[], swirlTightness: number, p: Vector3, out: Vector3): Vector3` (raw, not normalised).
  - `paintingTangent(flow: ImageData2D, p: Vector3, out: Vector3): number` (writes unit painting tangent into `out`; returns coherence×edge-fade in [0,1]; 0 if off-arc/incoherent).

- [ ] **Step 1: Write the failing test**

Create `scripts/flow-field.test.ts`.

```ts
import assert from 'node:assert/strict'
import test from 'node:test'
import { Vector3 } from 'three'
import type { ImageData2D } from '../src/scene/useImageData.ts'
import { buildVortices } from '../src/scene/skyMapping.ts'
import { makeFlowField, vortexTangent } from '../src/scene/flowField.ts'

function flatFlow(width = 8, height = 8): ImageData2D {
  const data = new Uint8ClampedArray(width * height * 4) // cos2θ=1, sin2θ=0 → θ=0; coherence high
  for (let i = 0; i < data.length; i += 4) { data[i] = 255; data[i + 1] = 128; data[i + 2] = 220; data[i + 3] = 255 }
  return { data, width, height }
}
const perp = (p: Vector3, t: Vector3) => Math.abs(p.dot(t))

test('vortex tangent is perpendicular to the sample direction', () => {
  const V = buildVortices()
  const out = new Vector3()
  for (const p of [new Vector3(0, 1, 0.2).normalize(), new Vector3(0.5, 0.6, -0.6).normalize()]) {
    vortexTangent(V, 0.45, p, out)
    assert.equal(perp(p, out) < 1e-6, true, `p·t = ${p.dot(out)}`)
  }
})

test('vortex circulation flips sign when every vortex sign flips', () => {
  const V = buildVortices()
  const Vneg = V.map((v) => ({ ...v, sign: -v.sign }))
  const a = vortexTangent(V, 0, new Vector3(0.3, 0.8, 0.5).normalize(), new Vector3())
  const b = vortexTangent(Vneg, 0, new Vector3(0.3, 0.8, 0.5).normalize(), new Vector3())
  assert.equal(a.clone().add(b).length() < 1e-6, true) // a ≈ -b with swirlTightness 0
})

test('makeFlowField returns a unit tangent perpendicular to p everywhere', () => {
  const field = makeFlowField({ flow: flatFlow(), vortices: buildVortices(), swirlTightness: 0.45, flowBias: 0.6 })
  const out = new Vector3()
  for (const p of [new Vector3(0, 1, 0).normalize(), new Vector3(-0.4, 0.5, 0.7).normalize(), new Vector3(0.2, 0.3, -0.9).normalize()]) {
    field(p, out)
    assert.equal(Math.abs(out.length() - 1) < 1e-5, true, `|t| = ${out.length()}`)
    assert.equal(perp(p, out) < 1e-5, true, `p·t = ${p.dot(out)}`)
  }
})
```

- [ ] **Step 2: Extend the test script and run it (red)**

```json
    "test:sky": "node --test scripts/sky-mapping.test.ts scripts/flow-field.test.ts"
```

Run: `npm run test:sky`
Expected: FAIL — `Cannot find module '.../flowField.ts'`.

- [ ] **Step 3: Write `src/scene/flowField.ts`**

The vortex circulation and painting-orientation maths are lifted from the working `flowAt`/`flowBiasAt` in `SkyDome.tsx`. **`flowBiasAt`'s swirl-eye protection is preserved**: the painting bias is faded to zero near the big `core` vortices (so the hero swirl centres keep the tuned vortex orientation — the locked-bar reconciliation), capped at 0.85 exactly as the original.

```ts
import { Vector3 } from 'three'
import type { ImageData2D } from './useImageData.ts'
import { sampleFlow } from './brush.ts'
import { FWD, RIGHT, TRUEUP, frontUV, smoothstep, type Vortex } from './skyMapping.ts'

export type FlowField = (p: Vector3, out: Vector3) => Vector3

const _cross = new Vector3()
const _tin = new Vector3()
const _eU = new Vector3()
const _eV = new Vector3()

/** Native vortex circulation + spiral inflow at p (macro composition + back coverage). Raw, tangent-projected. */
export function vortexTangent(vortices: Vortex[], swirlTightness: number, p: Vector3, out: Vector3): Vector3 {
  out.set(0, 0, 0)
  for (let i = 0; i < vortices.length; i++) {
    const v = vortices[i]
    const cosA = Math.min(1, Math.max(-1, p.dot(v.dir)))
    const ang = Math.acos(cosA)
    const w = v.strength * Math.exp(-(ang * ang) / (v.radius * v.radius))
    if (w < 0.001) continue
    _cross.crossVectors(p, v.dir).multiplyScalar(v.sign * w)
    out.add(_cross)
    _tin.copy(v.dir).addScaledVector(p, -p.dot(v.dir))
    out.addScaledVector(_tin, swirlTightness * w)
  }
  out.addScaledVector(p, -out.dot(p))
  return out
}

/** Derived painting orientation as a sphere tangent at p (front arc only). Returns coherence×edge-fade (0 = unusable). */
export function paintingTangent(flow: ImageData2D, p: Vector3, out: Vector3): number {
  const { u, v, h, w, onArc } = frontUV(p)
  if (!onArc) return 0
  const fade = smoothstep(0, 0.12, u) * smoothstep(1, 0.88, u) * smoothstep(0, 0.14, v) * smoothstep(1, 0.85, v)
  if (fade < 0.01) return 0
  const { theta, coh } = sampleFlow(flow, u, v)
  if (coh < 0.02) return 0
  const sh = Math.sin(h)
  const ch = Math.cos(h)
  _eU.copy(RIGHT).multiplyScalar(ch).addScaledVector(FWD, -sh)
  _eV.copy(FWD).multiplyScalar(ch).addScaledVector(RIGHT, sh).multiplyScalar(Math.sin(w)).addScaledVector(TRUEUP, -Math.cos(w))
  out.copy(_eU).multiplyScalar(Math.cos(theta)).addScaledVector(_eV, Math.sin(theta))
  out.addScaledVector(p, -out.dot(p))
  if (out.lengthSq() < 1e-8) return 0
  out.normalize()
  return coh * fade
}

/** One sampler: vortex field everywhere, blended with the painting orientation on the front arc,
 *  faded to zero at the big swirl eyes (cores) so the tuned hero swirls stand — as the original did. */
export function makeFlowField({
  flow,
  vortices,
  swirlTightness,
  flowBias,
}: {
  flow: ImageData2D
  vortices: Vortex[]
  swirlTightness: number
  flowBias: number
}): FlowField {
  const cores = vortices.filter((v) => v.core)
  const paint = new Vector3()
  const upFallback = new Vector3()

  const nearEye = (p: Vector3): number => {
    let m = 0
    for (let i = 0; i < cores.length; i++) {
      const cv = cores[i]
      const ang = Math.acos(Math.min(1, Math.max(-1, p.dot(cv.dir))))
      const e = Math.exp(-(ang * ang) / (cv.radius * cv.radius))
      if (e > m) m = e
    }
    return m
  }

  return (p: Vector3, out: Vector3): Vector3 => {
    vortexTangent(vortices, swirlTightness, p, out)
    if (out.lengthSq() < 1e-8) {
      // degenerate (no vortex influence): pick any stable tangent at p
      out.copy(p.x === 0 && p.z === 0 ? RIGHT : upFallback.set(0, 1, 0).addScaledVector(p, -p.y)).normalize()
    } else {
      out.normalize()
    }
    if (flowBias > 0) {
      const wgt = paintingTangent(flow, p, paint)
      if (wgt > 0) {
        const b = Math.min(0.85, flowBias * wgt * (1 - nearEye(p)))
        if (b > 0) {
          if (paint.dot(out) < 0) paint.multiplyScalar(-1) // undirected → align to the vortex heading
          out.multiplyScalar(1 - b).addScaledVector(paint, b)
          out.addScaledVector(p, -out.dot(p))
          if (out.lengthSq() > 1e-8) out.normalize()
        }
      }
    }
    return out
  }
}
```

- [ ] **Step 4: Run the tests (green)**

Run: `npm run test:sky`
Expected: PASS (all files). `ERR_MODULE_NOT_FOUND` ⇒ a missing `.ts` extension.

- [ ] **Step 5: Commit**

```bash
git add package.json src/scene/flowField.ts scripts/flow-field.test.ts
git commit -m "feat(sky): unified flow-tangent sampler with swirl-eye protection"
```

---

### Task 3: Streamline → brush-dab generator (front-biased)

**Files:**
- Create: `src/scene/dabField.ts`, `scripts/dab-field.test.ts`
- Modify: `package.json` (extend `test:sky`)

**Interfaces:**
- Consumes: `Vector3` (three); `ImageData2D` (type); `FlowField` (`./flowField.ts`); `sampleColour, mulberry32` (`./brush.ts`); `HORIZON, POINTS, STEP, dirAzEl, frontUV, uvToFrontDir` (`./skyMapping.ts`).
- Produces:
  - `type Dab = { dir: Vector3; tangent: Vector3; color: [number, number, number]; scale: number; phase: number; drift: number }` — `scale` is a per-dab base size (×`uWidth` live); `drift` is a per-dab **relative** arc factor (×`uDrift` live).
  - `buildDabField(opts: { field: FlowField; colourSrc: ImageData2D; count: number; seed?: number; frontFraction?: number; anchorFraction?: number }): Dab[]`.

- [ ] **Step 1: Write the failing test**

Create `scripts/dab-field.test.ts`.

```ts
import assert from 'node:assert/strict'
import test from 'node:test'
import type { ImageData2D } from '../src/scene/useImageData.ts'
import { ANCHOR_UVS, HORIZON, buildVortices, frontUV } from '../src/scene/skyMapping.ts'
import { makeFlowField } from '../src/scene/flowField.ts'
import { buildDabField } from '../src/scene/dabField.ts'

function img(r: number, g: number, b: number, width = 8, height = 8): ImageData2D {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < data.length; i += 4) { data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255 }
  return { data, width, height }
}
const field = () => makeFlowField({ flow: img(255, 128, 220), vortices: buildVortices(), swirlTightness: 0.45, flowBias: 0.6 })
const onArcCount = (dabs: { dir: import('three').Vector3 }[]) => dabs.filter((d) => frontUV(d.dir).onArc).length

test('buildDabField returns exactly the requested count', () => {
  assert.equal(buildDabField({ field: field(), colourSrc: img(70, 100, 170), count: 500 }).length, 500)
})

test('every dab sits on the dome above the horizon with an orthonormal (dir, tangent) frame', () => {
  for (const d of buildDabField({ field: field(), colourSrc: img(70, 100, 170), count: 500 })) {
    assert.equal(Math.abs(d.dir.length() - 1) < 1e-5, true)
    assert.equal(d.dir.y >= HORIZON - 1e-6, true)
    assert.equal(Math.abs(d.tangent.length() - 1) < 1e-5, true)
    assert.equal(Math.abs(d.dir.dot(d.tangent)) < 1e-5, true)
    assert.equal(d.phase >= 0 && d.phase < 1, true)
    assert.equal(d.scale > 0 && d.drift > 0, true)
  }
})

test('front-biased seeding puts more dabs on the front arc than uniform seeding', () => {
  const lots = buildDabField({ field: field(), colourSrc: img(70, 100, 170), count: 800, seed: 7, frontFraction: 1 })
  const none = buildDabField({ field: field(), colourSrc: img(70, 100, 170), count: 800, seed: 7, frontFraction: 0 })
  assert.equal(onArcCount(lots) > onArcCount(none), true)
})

test('anchor densification clusters more dabs near the painting anchors', () => {
  const nearAnchors = (dabs: { dir: import('three').Vector3 }[]) =>
    dabs.filter((d) => {
      const { u, v, onArc } = frontUV(d.dir)
      return onArc && ANCHOR_UVS.some((a) => Math.hypot(u - a[0], v - a[1]) < 0.1)
    }).length
  const dense = buildDabField({ field: field(), colourSrc: img(70, 100, 170), count: 800, seed: 5, frontFraction: 1, anchorFraction: 1 })
  const flat = buildDabField({ field: field(), colourSrc: img(70, 100, 170), count: 800, seed: 5, frontFraction: 1, anchorFraction: 0 })
  assert.equal(nearAnchors(dense) > nearAnchors(flat), true)
})

test('buildDabField is deterministic for a fixed seed', () => {
  const a = buildDabField({ field: field(), colourSrc: img(70, 100, 170), count: 64, seed: 99 })
  const b = buildDabField({ field: field(), colourSrc: img(70, 100, 170), count: 64, seed: 99 })
  assert.equal(a[0].dir.equals(b[0].dir), true)
  assert.equal(a[63].phase, b[63].phase)
})
```

- [ ] **Step 2: Extend the test script and run it (red)**

```json
    "test:sky": "node --test scripts/sky-mapping.test.ts scripts/flow-field.test.ts scripts/dab-field.test.ts"
```

Run: `npm run test:sky`
Expected: FAIL — `Cannot find module '.../dabField.ts'`.

- [ ] **Step 3: Write `src/scene/dabField.ts`**

Mirrors the working ribbon integration loop, but records an oriented dab at each step instead of extruding a quad. A fraction of streamlines (`frontFraction`) are seeded on the front arc via `uvToFrontDir` so the hero composition reads densest; the rest seed uniformly for 360° coverage. Size is left width-agnostic (the live `uWidth` uniform scales it) and `drift` is a relative factor (the live `uDrift` uniform sets the absolute arc).

```ts
import { Vector3 } from 'three'
import type { ImageData2D } from './useImageData.ts'
import type { FlowField } from './flowField.ts'
import { mulberry32, sampleColour } from './brush.ts'
import { ANCHOR_UVS, HORIZON, POINTS, STEP, dirAzEl, frontUV, uvToFrontDir } from './skyMapping.ts'

export type Dab = {
  dir: Vector3
  tangent: Vector3
  color: [number, number, number]
  scale: number
  phase: number
  drift: number
}

export function buildDabField({
  field,
  colourSrc,
  count,
  seed = 0x13ade7,
  frontFraction = 0.6,
  anchorFraction = 0.5,
}: {
  field: FlowField
  colourSrc: ImageData2D
  count: number
  seed?: number
  frontFraction?: number
  anchorFraction?: number
}): Dab[] {
  const rng = mulberry32(seed)
  const dabs: Dab[] = []
  const p = new Vector3()
  const f = new Vector3()
  const dir = new Vector3()
  let guard = 0

  while (dabs.length < count && guard < count * 20) {
    guard++
    // seed: front-biased onto the painting arc — densified around the anchors (swirl eyes, Venus,
    // stars) where impasto piles thickest — else spread across the front, else uniform over the dome.
    if (rng() < frontFraction) {
      if (rng() < anchorFraction) {
        const a = ANCHOR_UVS[Math.floor(rng() * ANCHOR_UVS.length)]
        p.copy(uvToFrontDir(a[0] + (rng() - 0.5) * 0.12, a[1] + (rng() - 0.5) * 0.12))
      } else {
        p.copy(uvToFrontDir(0.04 + rng() * 0.92, 0.03 + rng() * 0.6))
      }
    } else {
      p.copy(dirAzEl(rng() * Math.PI * 2, HORIZON + 0.04 + rng() * 1.5))
    }

    let have = false
    for (let k = 0; k < POINTS && dabs.length < count; k++) {
      field(p, f)
      if (f.lengthSq() < 1e-8) {
        if (!have) break
        f.copy(dir)
        f.addScaledVector(p, -f.dot(p)) // keep the reused heading ⊥ the current p
        if (f.lengthSq() < 1e-8) break
        f.normalize()
      } else {
        f.normalize()
        if (have && f.dot(dir) < 0) f.multiplyScalar(-1)
      }
      dir.copy(f)
      have = true

      // colour: painting-accurate on the front arc, palette-consistent (random sky pixel) on the back
      const fuv = frontUV(p)
      const cu = fuv.onArc ? fuv.u : 0.05 + rng() * 0.9
      const cv = fuv.onArc ? fuv.v : rng() * 0.5

      dabs.push({
        dir: p.clone(),
        tangent: dir.clone(),
        color: sampleColour(colourSrc, cu, cv),
        scale: 0.045 + 0.05 * rng(),
        phase: rng(),
        drift: 0.6 + 0.8 * rng(),
      })

      p.addScaledVector(dir, STEP).normalize()
      if (p.y < HORIZON) break
    }
  }
  return dabs
}
```

- [ ] **Step 4: Run the tests (green)**

Run: `npm run test:sky`
Expected: PASS (all three files).

- [ ] **Step 5: Commit**

```bash
git add package.json src/scene/dabField.ts scripts/dab-field.test.ts
git commit -m "feat(sky): front-biased streamline-to-dab generator"
```

---

### Task 4: Instanced dab geometry + shader; switch the sky over (static, fully-covered)

**Files:**
- Create: `src/scene/dabGeometry.ts`
- Modify: `src/scene/SkyDome.tsx` (replace ribbon `geometry`/`material`; remove ribbon shaders + `flowAt`/`flowBiasAt`; prune dead imports)

**Interfaces:**
- Consumes: `Dab` (`./dabField`); `makeBrushTexture` (`./brush`); `DOME_R` (`./skyMapping`); three (`InstancedBufferGeometry, InstancedBufferAttribute, BufferAttribute, ShaderMaterial, DoubleSide, NormalBlending, type Texture`).
- Produces:
  - `buildDabGeometry(dabs: Dab[]): InstancedBufferGeometry`.
  - `makeDabMaterial(brush: Texture): ShaderMaterial` with uniforms `{ uTime, uDriftSpeed, uDrift, uWidth, uSat, uDomeR, uBrush, uFreeze }`.

- [ ] **Step 1: Write `src/scene/dabGeometry.ts`**

A unit quad (long axis ±x, half-width ±0.5y) instanced once per dab. The vertex shader advects each dab a short arc along its great circle and orients the quad in the dome's tangent frame; the fragment shader samples the impasto brush and applies a birth→death fade. **`uFreeze` (default 1) floors the fade to full coverage when motion is paused** — so a frozen still shows every dab, no holes. `uDriftSpeed` (default 0) and `uDrift` (default 0.06) keep the sky **static and fully covered** until Task 5 animates it.

```ts
import {
  BufferAttribute,
  DoubleSide,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  NormalBlending,
  ShaderMaterial,
  type Texture,
} from 'three'
import type { Dab } from './dabField'
import { DOME_R } from './skyMapping'

export function buildDabGeometry(dabs: Dab[]): InstancedBufferGeometry {
  const g = new InstancedBufferGeometry()
  g.setAttribute('position', new BufferAttribute(new Float32Array([-1, -0.5, 0, 1, -0.5, 0, 1, 0.5, 0, -1, 0.5, 0]), 3))
  g.setAttribute('uv', new BufferAttribute(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), 2))
  g.setIndex([0, 1, 2, 0, 2, 3])

  const n = dabs.length
  const iDir = new Float32Array(n * 3)
  const iTangent = new Float32Array(n * 3)
  const iColor = new Float32Array(n * 3)
  const iScale = new Float32Array(n)
  const iPhase = new Float32Array(n)
  const iDrift = new Float32Array(n)
  for (let k = 0; k < n; k++) {
    const d = dabs[k]
    iDir[k * 3] = d.dir.x; iDir[k * 3 + 1] = d.dir.y; iDir[k * 3 + 2] = d.dir.z
    iTangent[k * 3] = d.tangent.x; iTangent[k * 3 + 1] = d.tangent.y; iTangent[k * 3 + 2] = d.tangent.z
    iColor[k * 3] = d.color[0]; iColor[k * 3 + 1] = d.color[1]; iColor[k * 3 + 2] = d.color[2]
    iScale[k] = d.scale; iPhase[k] = d.phase; iDrift[k] = d.drift
  }
  g.setAttribute('iDir', new InstancedBufferAttribute(iDir, 3))
  g.setAttribute('iTangent', new InstancedBufferAttribute(iTangent, 3))
  g.setAttribute('iColor', new InstancedBufferAttribute(iColor, 3))
  g.setAttribute('iScale', new InstancedBufferAttribute(iScale, 1))
  g.setAttribute('iPhase', new InstancedBufferAttribute(iPhase, 1))
  g.setAttribute('iDrift', new InstancedBufferAttribute(iDrift, 1))
  g.instanceCount = n
  return g
}

const dabVert = /* glsl */ `
  attribute vec3 iDir;
  attribute vec3 iTangent;
  attribute vec3 iColor;
  attribute float iScale;
  attribute float iPhase;
  attribute float iDrift;
  uniform float uTime;
  uniform float uDriftSpeed;
  uniform float uDrift;
  uniform float uWidth;
  uniform float uDomeR;
  uniform float uFreeze;
  varying vec2 vUv;
  varying vec3 vColor;
  varying float vFade;
  void main() {
    float t = fract(iPhase + uTime * uDriftSpeed);
    float a = t * iDrift * uDrift;                         // arc travelled along the great circle
    vec3 dir = normalize(iDir * cos(a) + iTangent * sin(a));
    vec3 along = normalize(iTangent * cos(a) - iDir * sin(a)); // unit tangent at the advected point
    vec3 across = normalize(cross(dir, along));
    float halfLen = iScale * uWidth;
    float halfWid = iScale * uWidth * 0.5;
    vec3 world = dir * uDomeR + along * (position.x * halfLen) + across * (position.y * halfWid * 2.0);
    vUv = uv;
    vColor = iColor;
    // born→peak→die, but floored to full when frozen so a paused still has no coverage gaps
    vFade = max(sin(3.14159265 * t), uFreeze);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(world, 1.0);
  }
`

const dabFrag = /* glsl */ `
  precision highp float;
  uniform sampler2D uBrush;
  uniform float uSat;
  varying vec2 vUv;
  varying vec3 vColor;
  varying float vFade;
  void main() {
    vec4 b = texture2D(uBrush, vUv);
    float alpha = b.a * clamp(vFade, 0.0, 1.0);
    if (alpha < 0.01) discard;
    float relief = 0.7 + 0.6 * b.r;                        // brush.r encodes raised-paint relief
    vec3 col = vColor * relief;
    float lum = dot(col, vec3(0.299, 0.587, 0.114));
    col = clamp(mix(vec3(lum), col, uSat), 0.0, 2.0);
    gl_FragColor = vec4(col, alpha);
  }
`

export function makeDabMaterial(brush: Texture): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uDriftSpeed: { value: 0 }, // still until Task 5
      uDrift: { value: 0.06 },   // absolute drift arc (live via the repurposed control in Task 5)
      uWidth: { value: 1 },
      uSat: { value: 1.3 },
      uDomeR: { value: DOME_R },
      uBrush: { value: brush },
      uFreeze: { value: 1 },     // 1 = full-coverage still (Task 5 drops it to 0 while playing)
    },
    vertexShader: dabVert,
    fragmentShader: dabFrag,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: DoubleSide,
    blending: NormalBlending,
  })
}
```

- [ ] **Step 2: Replace the ribbon geometry/material in `SkyDome.tsx` and prune dead imports**

In `src/scene/SkyDome.tsx`:

1. **Delete** `strokeVert`, `strokeFrag`, the ribbon `material = useMemo(...)`, and the entire ribbon `geometry = useMemo(() => { … flowAt … flowBiasAt … }, [...])`.
2. **Set the imports to exactly what survives.** After the deletions the only sky-maths symbols still used are `DOME_R` (JSX) and `buildVortices` (the `vortices` memo); the only brush symbol is `makeBrushTexture`. Prune the rest (`noUnusedLocals`):

```ts
import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending, BackSide, CanvasTexture, Color, NoColorSpace, ShaderMaterial, Vector3,
} from 'three'
import type { ImageData2D } from './useImageData'
import { makeBrushTexture } from './brush'
import { PALETTE } from './palette'
import { DOME_R, buildVortices } from './skyMapping'
import { makeFlowField } from './flowField'
import { buildDabField } from './dabField'
import { buildDabGeometry, makeDabMaterial } from './dabGeometry'
```

(`BufferAttribute`, `BufferGeometry`, `DoubleSide`, `NormalBlending` were ribbon-only — dropped. `mulberry32`, `sampleColour`, `sampleFlow` were ribbon-only — dropped. `NoColorSpace` is added.)

3. **Do not destructure `speed` or `swirlTightness` in this task** — Task 4 does not use them (drift is off), and `noUnusedParameters` would fail. Keep them in the `Props` type (`speed?: number; swirlTightness?: number`) so `App.tsx` still compiles; Task 5 adds them to the destructuring. The destructuring keeps `flow, colourSrc, count, strokeWidth, saturation, skyTop, skyBottom, glowIntensity, moonBright, starBright, paused, flowBias` (and the `flowBias` default).
4. **Create the brush texture and material:**

```ts
  const brushTex = useMemo(() => {
    const t = makeBrushTexture()
    t.colorSpace = NoColorSpace // relief/alpha map, not colour — no sRGB decode on b.r/b.a
    return t
  }, [])
  const material = useMemo(() => makeDabMaterial(brushTex), [brushTex])
```

5. **Build the dab geometry** (the `vortices` memo stays as-is above this). `swirlTightness` is fixed at the tuned 0.45 inside the flow field (its old Leva slider becomes the drift control in Task 5):

```ts
  const geometry = useMemo(() => {
    const field = makeFlowField({ flow, vortices, swirlTightness: 0.45, flowBias })
    const dabs = buildDabField({ field, colourSrc, count })
    return buildDabGeometry(dabs)
  }, [flow, colourSrc, count, vortices, flowBias])
```

6. **Drive the live uniforms** (no `speed`/drift this task — the material defaults keep it static and fully covered):

```ts
  useFrame((_, dt) => {
    if (paused) return
    /* eslint-disable react-hooks/immutability -- R3F render-loop uniform writes are intentional mutations */
    material.uniforms.uTime.value += dt
    material.uniforms.uWidth.value = strokeWidth
    material.uniforms.uSat.value = saturation
    /* eslint-enable react-hooks/immutability */
  })
```

7. **Dispose correctly.** Leave the geometry-cleanup effect doing only `geometry.dispose()` (it fires on every rebuild). Dispose `brushTex` in the **unmount-only** material effect, beside `material.dispose()`, and add `brushTex` to that effect's deps. **Do not** put `brushTex.dispose()` in the per-rebuild geometry effect — that would free the live texture on every retune.
8. The gradient dome mesh, the `<mesh geometry={geometry} material={material} frustumCulled={false} />`, and the moon/star/core JSX are unchanged (`frustumCulled={false}` matters: the instanced geometry's bounding sphere is the unit base quad, not the radius-6 dome).

- [ ] **Step 3: Verify build, lint and tests**

Run: `npm run test:sky && npm run lint && npm run build`
Expected: PASS. (If `tsc` reports `TS6133 … is declared but its value is never read`, an import or the `speed`/`swirlTightness` param was not pruned per items 2–3.)

- [ ] **Step 4: Capture the static dab sky and review against the original**

```bash
npm run dev
```

Save to gitignored `scratch/` (NOT committed): `scratch/bd1-front.jpeg`, `scratch/bd1-orbit.jpeg`, `scratch/bd1-mobile.jpeg`.

Open `bd1-front.jpeg` beside `reference/starry-night-source.jpg`. Expected: discrete impasto marks (not chrome ribbons), deep blue between dabs, the whorl/Venus/moon anchors still where the vortices place them, full coverage (no holes — `uFreeze` defaults to 1). Retune `count`, dab `scale` (via the `stroke width` control), and the Bloom luminance threshold (in `App.tsx` Leva — dabs should sit *below* it) until it reads as paint. Retune cap: 4 passes.

- [ ] **Step 5: Commit (code only — never the captures)**

```bash
git add src/scene/dabGeometry.ts src/scene/SkyDome.tsx
git commit -m "feat(sky): render the dome as instanced brush-dabs"
```

---

### Task 5: Drift the dabs along the flow (Vrellis-style) + reduced-motion still

**Files:**
- Modify: `src/scene/SkyDome.tsx` (re-add `speed`/`swirlTightness`; drive drift; freeze on pause)
- Modify: `src/App.tsx` (repurpose the `swirl tightness` control to drift arc)

**Interfaces:** consumes the Task-4 uniforms (`uTime, uDriftSpeed, uDrift, uFreeze`). No new exports.

- [ ] **Step 1: Repurpose the `swirl tightness` Leva control to drift arc**

In `src/App.tsx`, change the `swirlTightness` control (keep the key so the `SkyControls`/`World`/`Props` plumbing is unchanged) to drift-arc units, and relabel:

```ts
    swirlTightness: { value: 0.06, min: 0, max: 0.2, step: 0.005, label: 'drift (arc)' },
```

(`flowBias` stays as the front painting-flow bias — a deliberate deviation from the spec's draft table, logged in Task 6. `churnSpeed` becomes drift speed below.)

- [ ] **Step 2: Drive drift and the freeze in `SkyDome.tsx`**

Add `speed` and `swirlTightness` back to the props destructuring (keep their defaults: `speed = 0.05`, `swirlTightness = 0.06`). Update `useFrame`, and add a `paused`-driven freeze effect:

```ts
  useFrame((_, dt) => {
    if (paused) return
    /* eslint-disable react-hooks/immutability -- R3F render-loop uniform writes are intentional mutations */
    material.uniforms.uTime.value += dt
    material.uniforms.uDriftSpeed.value = speed * 4 // churn 0.05 → ~0.2 cycles/s; tunable
    material.uniforms.uDrift.value = swirlTightness  // the repurposed 'drift (arc)' control
    material.uniforms.uWidth.value = strokeWidth
    material.uniforms.uSat.value = saturation
    /* eslint-enable react-hooks/immutability */
  })

  // Freeze to a fully-covered still when paused (prefers-reduced-motion OR the visitor pause button):
  // uTime stops advancing AND uFreeze floors every dab's fade to full, so no birth/death holes appear.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability -- intentional R3F uniform write
    material.uniforms.uFreeze.value = paused ? 1 : 0
  }, [material, paused])
```

`swirlTightness` no longer feeds the flow field (Task 4 fixed it at 0.45 there), so it is not a geometry dep — drift arc tunes live without a rebuild.

- [ ] **Step 3: Verify build, lint and tests**

Run: `npm run test:sky && npm run lint && npm run build`
Expected: PASS (pure-maths tests unaffected).

- [ ] **Step 4: Capture motion + the paused still and review**

```bash
npm run dev
```

Save (gitignored): `scratch/bd2-front.jpeg`, `scratch/bd2-orbit.jpeg`, `scratch/bd2-mobile.jpeg`, `scratch/bd2-reduced.jpeg`. For `bd2-reduced`, capture with motion paused (pause button or emulate `prefers-reduced-motion`).

Expected: the sky churns along the swirls without "scrolling soup" (short-lived dabs born→peak→die); the paused frame is a clean, **fully-covered** still (verify no holes — that is exactly what `uFreeze` guards). If it reads as soup, lower the `drift (arc)` control or the `speed * 4` factor; if static-feeling, raise them. Retune cap: 4 passes.

- [ ] **Step 5: Commit (code only)**

```bash
git add src/scene/SkyDome.tsx src/App.tsx
git commit -m "feat(sky): drift dabs along the flow; full-coverage paused still"
```

---

### Task 6: Tune coverage, value and mobile performance

**Files:**
- Modify: `src/scene/SkyDome.tsx`, `src/scene/dabField.ts`, `src/App.tsx` (tuning only — no new interfaces)
- Modify: `tasks/lessons.md` (log the tunable decisions)

- [ ] **Step 1: Desktop value/coverage pass**

With the dev server running, tune via Leva: `stroke count` (toward 8,000), `stroke width`, `drift (arc)` + `churn speed`, `colour pop` (saturation), and the **bloom threshold/intensity** so only stars/moon/eye-glows bloom and the sky stays matte impasto. Confirm deep-blue negative space reads between dabs. If dab colour needs to bypass tone mapping to match the moon/star sprites (which set `toneMapped={false}`), evaluate adding the same to the dab material — but only if the capture shows a mismatch. Capture: `scratch/bd3-front.jpeg`, `scratch/bd3-orbit.jpeg`. Fold settled values into the `useControls` defaults in `App.tsx` where they differ.

- [ ] **Step 2: Mobile performance pass**

Drive a mobile viewport (e.g. 390×844, dpr 1.5). Verify ≥ 30 fps at the mobile dab budget (3,000) — the overdraw risk lives here; reduce `count`/dab `scale` before changing the look. Capture: `scratch/bd3-mobile.jpeg`, `scratch/bd3-reduced.jpeg`. The mobile frame must still hold moon, cypress edge, steeple, and central sky movement; the reduced-motion still must be dignified and fully covered.

- [ ] **Step 3: Log the tunable decisions**

Append to `tasks/lessons.md`:

```md
## Sky brush-dab tunables (2026-06-20)

- Dev Leva control `swirl tightness` repurposed → dab `drift (arc)` (uDrift), per the design's tunable table.
  The vortex spiral-inflow tightness is now fixed at the tuned 0.45 inside makeFlowField.
- `flow bias` kept as the front painting-flow bias (NOT repurposed to jitter as the spec draft suggested):
  it is the knob that pulls front dabs toward the painting's orientation, which is the whole point.
- `churn speed` → dab drift SPEED (uDriftSpeed = speed*4). Dab size is the live `stroke width` (uWidth);
  per-dab size/drift variation is baked, the absolute scale/arc are live uniforms (no rebuild on tweak).
- Settled desktop/mobile counts, widths, drift, saturation and bloom threshold: <record final values>.
```

- [ ] **Step 4: Verify the full gate locally**

Run: `npm run test:sky && npm run lint && npm run build`
Expected: PASS.

- [ ] **Step 5: Commit (code only)**

```bash
git add src/scene/SkyDome.tsx src/scene/dabField.ts src/App.tsx tasks/lessons.md
git commit -m "feat(sky): tune dab coverage, value and mobile budget"
```

---

### Task 7: Mark review gate

**Files:** Modify `tasks/lessons.md`; (after approval only) `tasks/todo.md`.

- [ ] **Step 1: Assemble the review set (gitignored)**

```bash
mkdir -p scratch/sky-brushdab-review
cp reference/starry-night-source.jpg scratch/sky-brushdab-review/original.jpg
cp scratch/release-front.jpeg scratch/sky-brushdab-review/before-front.jpeg
cp scratch/bd3-front.jpeg scratch/sky-brushdab-review/after-front.jpeg
cp scratch/bd3-orbit.jpeg scratch/sky-brushdab-review/after-orbit.jpeg
cp scratch/bd3-mobile.jpeg scratch/sky-brushdab-review/after-mobile.jpeg
cp scratch/bd3-reduced.jpeg scratch/sky-brushdab-review/after-reduced.jpeg
```

- [ ] **Step 2: Append the gate note to `tasks/lessons.md`**

```md
## Sky brush-dab gate (2026-06-20)

- Re-opened pre-release because the sky read as liquid chrome, not Van Gogh's brushwork (Mark: substance + flow).
- Lead change: the dome is now a field of instanced brush-dabs placed along the derived flow and drifting
  Vrellis-style; the tuned vortex composition (whorl, Venus, stars, moon, eye-glows AND swirl-eye protection) was kept.
- Review set: scratch/sky-brushdab-review/{original,before-front,after-front,after-orbit,after-mobile,after-reduced}.
- Mark decision: awaiting capture review before cypress/village fidelity begins.
```

- [ ] **Step 3: Present captures and ask Mark**

Show original / before-front / after-front / after-orbit / after-mobile / after-reduced and ask:

```text
Does the brush-dab sky read closer to the original — substance and flow?
A. Yes — move on to cypress/village fidelity.
B. Closer, but retune the sky one more pass.
C. Not closer — reconsider the dab approach.
```

- [ ] **Step 4: Record the decision**

If A or B: `git add tasks/lessons.md && git commit -m "docs(sky): record brush-dab review gate"`.
If C: do not commit the note; return to Task 5/6 or escalate per CLAUDE.md's "Stop and ask Mark when acceptance criteria still fail after the retune cap".

- [ ] **Step 5 (after approval only): Queue the next plan**

Update `tasks/todo.md` PICK-UP to the foreground-fidelity gate (cypress flame, village forms, glb-vs-dab-cloud) and stop — a separate brainstorming/spec/plan cycle.

---

## Self-Review

**Spec coverage:** whole-dome dabs → Tasks 3–4; Vrellis drift + reduced-motion-safe (now with the `uFreeze` full-coverage floor) → Tasks 4–5; kept vortex composition *and swirl-eye protection* → Tasks 1–2 (`buildVortices` + `makeFlowField`'s `nearEye`); front painting-derived orientation, front-biased density → Tasks 2–3; bloom-below-threshold (chrome→paint) → Tasks 4, 6; reuse of the `skyMapping` extraction + streamline integration → Tasks 1, 3; `node --test` `.ts`-extension constraint → Global Constraints + every test task; captures never committed → Global Constraints + Tasks 4–7; mobile budget / perf / reduced-motion still → Task 6; Mark gate → Task 7; cypress/village/glb deferred → Task 7 Step 5.

**Tunable reconciliation:** the spec draft's table is refined and the deviations logged (Task 6 Step 3): `swirl tightness` → dab `drift (arc)` (matches the spec); `flow bias` retained as the front-flow bias rather than repurposed to jitter (justified — it is the painting-fidelity knob); drift is a live uniform, not a hardcoded constant.

**Placeholder scan:** no TBD/TODO; every code step carries complete code; tuning steps name exact controls and capture filenames; `<record final values>` in the lessons template is a fill-in during execution, not a code placeholder.

**Type consistency:** `Dab` fields (`dir, tangent, color, scale, phase, drift`) flow unchanged from Task 3 into Task 4's `buildDabGeometry`. `FlowField = (p, out) => Vector3` (Task 2) is consumed by Task 3's `buildDabField({ field })`. `makeFlowField` options (`flow, vortices, swirlTightness, flowBias`) match Tasks 2 and 4. Material uniforms (`uTime, uDriftSpeed, uDrift, uWidth, uSat, uDomeR, uBrush, uFreeze`) are defined in Task 4 and written in Tasks 4–5. `color: [number,number,number]` matches `sampleColour`. Imports are pruned to exactly the used set at the end of Tasks 1 and 4 (`noUnusedLocals`); `speed`/`swirlTightness` are destructured only from Task 5, where they are used.

**Review-hardening applied** (6-lens internal review + Codex pass): unused-import blockers fixed (Tasks 1, 4); `speed`/`swirlTightness` add/remove churn made explicit (Tasks 4–5); reduced-motion coverage-gap fixed (`uFreeze`, Tasks 4–5 — also flagged by Codex P1b); swirl-eye protection restored (`nearEye`, Task 2); `strokeWidth` double-apply removed (size is `uWidth` only); `brushTex` dispose pinned to the unmount effect; degenerate-branch tangent re-projected (Task 3); Task 1 given a genuine red→green order (Codex P3); **front fidelity strengthened — front-UV seeding plus anchor densification around the swirl eyes / Venus / stars (`ANCHOR_UVS`), with front-bias and anchor-density tests (Codex P1)**; branch pre-flight added so execution starts from a clean tracked baseline (Codex P2).
