# Painting-First Diorama Recovery Reset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recover the `?mode=diorama` route without losing the painting's soul: preserve the source-space streamline-ribbon sky, keep the 3D/front-arc diorama endgame, and fix the cypress/source-edge/card-boundary failure as an isolated problem.

**Architecture:** Start by discarding the failed uncommitted native-dome Codex patch and restoring the committed painting-first/front-arc line (`145dc5d` -> `6924228` -> `396a51d`). The sky carrier remains `PaintingFlowSky3D` built from `buildSourceStreamlineRibbons()`. New work is limited to front-arc edge coverage and cypress/source registration, using authored painterly 3D/matte forms that hide the source void without replacing the source-ribbon sky.

**Tech Stack:** Vite, React 19, TypeScript, three.js 0.184, React Three Fiber, drei `OrbitControls`, `@react-three/postprocessing` Bloom, existing reference assets only.

---

## Non-Negotiables

- Do not continue the uncommitted native full-dome brush-dab patch.
- Do not move the product target to 2D. The flat `StreamlineSky` is the motion foundation, not the ship target.
- Do not chase 360 degrees in this slice. The live contract is front-arc orbitable.
- Do not replace source-space ribbons with generic native procedural sky.
- Do not report a slice as done without opening and judging the captures.

## Files

- Preserve/restore:
  - `src/scene/PaintingFlowSky3D.tsx` — must return to source-space streamline ribbons, source-positioned moon/stars, and `debug=flow`.
  - `src/scene/Diorama.tsx` — must return to committed painting-first/front-arc stage before adding cypress fixes.
  - `src/scene/dioramaContract.ts` — must preserve the front-arc camera/orbit contract.
  - `scripts/diorama-layout.test.ts` — must protect the corrected contract.
- Create:
  - `src/scene/cypressFlameGeometry.ts` — testable deterministic flame outline/fin geometry data.
  - `src/scene/CypressFlameVolume.tsx` — authored multi-fin painterly cypress volume that hides the source-cypress void without sampling sky pixels.
  - `src/scene/SkyEdgeBackfill.tsx` — subtle source-derived edge fill behind the ribbon sky, not the primary sky.
  - `scripts/cypress-flame.test.ts` — deterministic/bounds tests for the cypress volume.
  - `scripts/capture-diorama.mjs` — reusable canvas readback capture script for center, flow, stage, orbit, left/right drag, and mobile.
- Modify:
  - `src/scene/DioramaExperience.tsx` — wire optional edge/cypress layers only after baseline is restored.
  - `src/scene/dioramaContract.ts` — add explicit recovery contract flags.
  - `scripts/diorama-layout.test.ts` — verify the recovery contract says source ribbons are primary and native-dome replacement is rejected.
  - `tasks/todo.md`, `tasks/lessons.md`, Obsidian `Status.md`, `Timeline.md` — update only after visual review.

---

### Task 1: Stabilize The Working Tree And Restore The Correct Baseline

**Files:**
- Modify: `src/scene/PaintingFlowSky3D.tsx`
- Modify: `src/scene/Diorama.tsx`
- Modify: `src/scene/dioramaContract.ts`
- Modify: `scripts/diorama-layout.test.ts`
- Keep: `tasks/todo.md`, `tasks/lessons.md`, `~/File Vault/The starry-night/Status.md`, `~/File Vault/The starry-night/Timeline.md`

- [ ] **Step 1: Save the failed native-dome diff as evidence**

Run:

```bash
mkdir -p output/failed-patches
git diff -- src/scene/PaintingFlowSky3D.tsx src/scene/Diorama.tsx src/scene/dioramaContract.ts scripts/diorama-layout.test.ts > output/failed-patches/2026-07-07-native-dome-codex-failure.patch
```

Expected: patch file exists and contains the failed native-dome/cypress changes.

- [ ] **Step 2: Restore only the failed code files to the front-arc checkpoint**

Run:

```bash
git restore --source=396a51d -- \
  src/scene/PaintingFlowSky3D.tsx \
  src/scene/Diorama.tsx \
  src/scene/dioramaContract.ts \
  scripts/diorama-layout.test.ts
```

Expected: repo notes remain modified, but the code files return to the committed painting-first/front-arc route.

- [ ] **Step 3: Confirm status distinguishes notes from restored code**

Run:

```bash
git status --short
```

Expected: `tasks/todo.md`, `tasks/lessons.md`, and Obsidian files may be modified; failed code files should no longer show unless another user change exists.

- [ ] **Step 4: Run mechanical checks on the restored baseline**

Run:

```bash
npm run test:sky
npm run lint
npm run build
```

Expected: all pass; Vite may keep the existing large-chunk warning.

- [ ] **Step 5: Capture baseline before adding new fixes**

Run:

```bash
npm run dev -- --host 127.0.0.1
```

In a second shell or capture script, capture:

```text
?mode=diorama&clean=1
?mode=diorama&debug=flow&clean=1
?mode=diorama&debug=stage&clean=1
?mode=diorama&view=orbit&clean=1
```

Expected: captures reproduce the known front-arc/cypress-edge problem, but preserve the source-ribbon sky.

---

### Task 2: Lock The Recovery Contract In Tests

**Files:**
- Modify: `src/scene/dioramaContract.ts`
- Modify: `scripts/diorama-layout.test.ts`

- [ ] **Step 1: Add explicit contract flags**

Add to `src/scene/dioramaContract.ts`:

```ts
export const DIORAMA_RECOVERY_CONTRACT = {
  preserveSourceSpaceRibbons: true,
  rejectNativeDomeReplacement: true,
  frontArcOnlyForThisSlice: true,
  isolateCypressAndEdgeFixes: true,
} as const
```

- [ ] **Step 2: Add a failing test for the recovery contract**

Add to `scripts/diorama-layout.test.ts`:

```ts
import { DIORAMA_RECOVERY_CONTRACT } from '../src/scene/dioramaContract.ts'

test('diorama recovery preserves source ribbons and rejects native dome replacement', () => {
  assert.equal(DIORAMA_RECOVERY_CONTRACT.preserveSourceSpaceRibbons, true)
  assert.equal(DIORAMA_RECOVERY_CONTRACT.rejectNativeDomeReplacement, true)
  assert.equal(DIORAMA_RECOVERY_CONTRACT.frontArcOnlyForThisSlice, true)
  assert.equal(DIORAMA_RECOVERY_CONTRACT.isolateCypressAndEdgeFixes, true)
})
```

- [ ] **Step 3: Run the contract test**

Run:

```bash
npm run test:sky
```

Expected: pass after the export/import is wired.

- [ ] **Step 4: Commit the restored contract baseline**

Run:

```bash
git add src/scene/dioramaContract.ts scripts/diorama-layout.test.ts tasks/todo.md tasks/lessons.md
git commit -m "docs(3d): record native-dome failure and lock recovery contract"
```

Expected: one small commit that preserves the failure record and the recovery guardrail.

---

### Task 3: Build A Cypress Flame Volume That Covers The Void Without Source-Sky Leakage

**Files:**
- Create: `src/scene/cypressFlameGeometry.ts`
- Create: `src/scene/CypressFlameVolume.tsx`
- Create: `scripts/cypress-flame.test.ts`
- Modify: `src/scene/Diorama.tsx`
- Modify: `package.json` test script if needed to include `scripts/cypress-flame.test.ts`

- [ ] **Step 1: Write deterministic geometry tests**

Create `scripts/cypress-flame.test.ts`:

```ts
import assert from 'node:assert/strict'
import test from 'node:test'
import { CYPRESS_FLAME_FINS, makeCypressFinOutline } from '../src/scene/cypressFlameGeometry.ts'

test('cypress flame fins are deterministic and front-arc bounded', () => {
  assert.equal(CYPRESS_FLAME_FINS.length, 5)
  for (const fin of CYPRESS_FLAME_FINS) {
    assert.ok(fin.yaw >= -0.42)
    assert.ok(fin.yaw <= 0.42)
    assert.ok(fin.height >= 2.2)
    assert.ok(fin.height <= 3.25)
  }
  assert.deepEqual(makeCypressFinOutline(0), makeCypressFinOutline(0))
})

test('cypress flame outline stays flame-shaped', () => {
  const outline = makeCypressFinOutline(0)
  const bottom = outline.filter((p) => p.y < 0.2)
  const top = outline.filter((p) => p.y > 0.82)
  const bottomWidth = Math.max(...bottom.map((p) => p.x)) - Math.min(...bottom.map((p) => p.x))
  const topWidth = Math.max(...top.map((p) => p.x)) - Math.min(...top.map((p) => p.x))
  assert.ok(bottomWidth > 0.42)
  assert.ok(topWidth < 0.18)
})
```

- [ ] **Step 2: Implement testable cypress geometry helpers**

Create `src/scene/cypressFlameGeometry.ts`:

```ts
export type FlamePoint = { x: number; y: number }

export const CYPRESS_FLAME_FINS = [
  { yaw: -0.34, height: 2.85, width: 0.58, z: 0.04 },
  { yaw: -0.16, height: 3.08, width: 0.64, z: 0.0 },
  { yaw: 0, height: 3.18, width: 0.68, z: -0.02 },
  { yaw: 0.16, height: 2.95, width: 0.6, z: 0.02 },
  { yaw: 0.34, height: 2.48, width: 0.46, z: 0.05 },
] as const

export function makeCypressFinOutline(seed: number): FlamePoint[] {
  const wobble = (i: number) => Math.sin(seed * 11.7 + i * 2.31) * 0.035
  return [
    { x: -0.34, y: 0.0 },
    { x: -0.46 + wobble(1), y: 0.12 },
    { x: -0.43 + wobble(2), y: 0.28 },
    { x: -0.31 + wobble(3), y: 0.44 },
    { x: -0.25 + wobble(4), y: 0.62 },
    { x: -0.14 + wobble(5), y: 0.78 },
    { x: -0.04 + wobble(6), y: 0.94 },
    { x: 0.0, y: 1.0 },
    { x: 0.08 + wobble(7), y: 0.9 },
    { x: 0.2 + wobble(8), y: 0.72 },
    { x: 0.28 + wobble(9), y: 0.54 },
    { x: 0.39 + wobble(10), y: 0.34 },
    { x: 0.42 + wobble(11), y: 0.16 },
    { x: 0.31, y: 0.0 },
  ]
}
```

- [ ] **Step 3: Implement `CypressFlameVolume.tsx`**

Create `src/scene/CypressFlameVolume.tsx` with an authored multi-fin volume:

```tsx
import { useMemo } from 'react'
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  MeshBasicMaterial,
  Vector3,
} from 'three'
import { PALETTE } from './palette'
import { CYPRESS_FLAME_FINS, makeCypressFinOutline } from './cypressFlameGeometry'

function buildFinGeometry(seed: number, width: number, height: number, z: number) {
  const outline = makeCypressFinOutline(seed)
  const root = new Vector3(0, 0, z)
  const positions: number[] = [root.x, root.y, root.z]
  const colours: number[] = []
  const indices: number[] = []
  const dark = new Color(PALETTE.cypress).multiplyScalar(0.92)
  const green = new Color(PALETTE.cypressGreen).multiplyScalar(1.16)
  const rim = new Color(PALETTE.villageCool).multiplyScalar(1.34)

  colours.push(dark.r, dark.g, dark.b)
  outline.forEach((point, index) => {
    const side = Math.abs(point.x)
    const lift = point.y
    const colour = dark.clone().lerp(green, Math.min(1, 0.28 + lift * 0.48)).lerp(rim, Math.max(0, side - 0.2) * 0.55)
    positions.push(point.x * width, point.y * height, z)
    colours.push(colour.r, colour.g, colour.b)
    const next = index === outline.length - 1 ? 1 : index + 2
    indices.push(0, index + 1, next)
  })

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
  geometry.setAttribute('color', new BufferAttribute(new Float32Array(colours), 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  return geometry
}

export function CypressFlameVolume() {
  const fins = useMemo(
    () =>
      CYPRESS_FLAME_FINS.map((fin, index) => ({
        ...fin,
        geometry: buildFinGeometry(index, fin.width, fin.height, fin.z),
      })),
    [],
  )

  const material = useMemo(
    () => new MeshBasicMaterial({ vertexColors: true, side: DoubleSide, toneMapped: true }),
    [],
  )

  return (
    <group position={[-1.24, 0.0, 0.86]} rotation={[0, 0.08, 0]}>
      {fins.map((fin, index) => (
        <mesh
          key={index}
          geometry={fin.geometry}
          material={material}
          rotation={[0, fin.yaw, 0]}
          renderOrder={3}
        />
      ))}
    </group>
  )
}
```

- [ ] **Step 4: Use the cypress volume in `Diorama.tsx`**

Replace the dominant old cypress pair in `src/scene/Diorama.tsx` final mode with:

```tsx
import { CypressFlameVolume } from './CypressFlameVolume'
```

and:

```tsx
{debug === 'stage' ? (
  <>
    <Cypress position={[-1.3, 0, 0.8]} height={3.0} rot={0.4} girth={1.1} />
    <Cypress position={[-1.12, 0, 1.02]} height={2.2} rot={-0.5} scale={0.9} seed={13} girth={1.2} />
  </>
) : (
  <CypressFlameVolume />
)}
```

- [ ] **Step 5: Run tests**

Run:

```bash
npm run test:sky
npm run lint
npm run build
```

Expected: all pass.

- [ ] **Step 6: Capture cypress gate**

Capture:

```text
?mode=diorama&clean=1
?mode=diorama&debug=stage&clean=1
drag left boundary
drag right boundary
```

Expected: cypress reads as a flame-like left anchor, not a black prop, source-image billboard, or smooth green cone. It must hide the source-cypress void in the allowed front arc.

- [ ] **Step 7: Commit if visual gate passes**

Run:

```bash
git add src/scene/cypressFlameGeometry.ts src/scene/CypressFlameVolume.tsx src/scene/Diorama.tsx scripts/cypress-flame.test.ts package.json
git commit -m "feat(3d): add painterly cypress flame volume"
```

---

### Task 4: Add Source-Ribbon Edge Backfill Without Replacing The Sky

**Files:**
- Create: `src/scene/SkyEdgeBackfill.tsx`
- Modify: `src/scene/PaintingFlowSky3D.tsx`

- [ ] **Step 1: Implement edge-only backfill component**

Create `src/scene/SkyEdgeBackfill.tsx`:

```tsx
import { useMemo } from 'react'
import {
  BackSide,
  Color,
  ShaderMaterial,
} from 'three'
import { DOME_R, FWD, RIGHT, TRUEUP } from './skyMapping'
import { PALETTE } from './palette'

const edgeVert = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const edgeFrag = /* glsl */ `
  precision highp float;
  uniform vec3 uTop;
  uniform vec3 uBottom;
  uniform vec3 uFwd;
  uniform vec3 uRight;
  uniform vec3 uUp;
  varying vec3 vDir;

  void main() {
    vec3 dir = normalize(vDir);
    float fwdDot = dot(dir, normalize(uFwd));
    float h = atan(dot(dir, normalize(uRight)), fwdDot);
    float w = asin(clamp(dot(dir, normalize(uUp)), -1.0, 1.0));
    float t = clamp(dir.y * 0.5 + 0.5, 0.0, 1.0);
    vec3 base = mix(uBottom, uTop, pow(t, 0.9));

    float outsideFront = smoothstep(0.92, 1.28, abs(h));
    float lowerLift = smoothstep(-0.8, -0.25, w);
    float current = 0.5 + 0.5 * sin(h * 3.1 + w * 5.4);
    vec3 strokeTint = vec3(0.035, 0.055, 0.09) * current * outsideFront;
    vec3 col = base + strokeTint;

    float alpha = 0.56 * outsideFront * lowerLift;
    gl_FragColor = vec4(col, alpha);
  }
`

export function SkyEdgeBackfill() {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          uTop: { value: new Color(PALETTE.skyZenith).multiplyScalar(0.72) },
          uBottom: { value: new Color(PALETTE.skyHorizon).multiplyScalar(0.82) },
          uFwd: { value: FWD },
          uRight: { value: RIGHT },
          uUp: { value: TRUEUP },
        },
        vertexShader: edgeVert,
        fragmentShader: edgeFrag,
        side: BackSide,
        transparent: true,
        depthWrite: false,
        depthTest: false,
      }),
    [],
  )

  return (
    <mesh renderOrder={-5}>
      <sphereGeometry args={[DOME_R + 4.5, 32, 24]} />
      <primitive object={material} attach="material" />
    </mesh>
  )
}
```

- [ ] **Step 2: Wire it behind source ribbons**

In `src/scene/PaintingFlowSky3D.tsx`:

```tsx
import { SkyEdgeBackfill } from './SkyEdgeBackfill'
```

Render `SkyEdgeBackfill` before the source ribbons:

```tsx
return (
  <group>
    <SkyEdgeBackfill />
    {/* existing source-space wash/ribbons/orbs stay primary */}
  </group>
)
```

- [ ] **Step 3: Capture edge views**

Capture:

```text
?mode=diorama&clean=1
drag left boundary
drag right boundary
?mode=diorama&debug=flow&clean=1
```

Expected: front source composition remains recognisable; the backfill only softens side/card edges. If the sky starts reading like generic procedural dashes, reject this task and revert.

- [ ] **Step 4: Commit if visual gate passes**

Run:

```bash
git add src/scene/SkyEdgeBackfill.tsx src/scene/PaintingFlowSky3D.tsx
git commit -m "fix(3d): soften source sky edges without replacing ribbons"
```

---

### Task 5: Create A Reusable Diorama Capture Script

**Files:**
- Create: `scripts/capture-diorama.mjs`
- Modify: `package.json`

- [ ] **Step 1: Create capture script**

Create `scripts/capture-diorama.mjs` based on the proven canvas `toDataURL` readback. It must capture:

```text
desktop-centre.png
desktop-flow.png
desktop-stage.png
desktop-nopost.png
desktop-drag-left-boundary.png
desktop-drag-right-boundary.png
desktop-orbit-preset.png
mobile-centre.png
capture-summary.json
```

It must use real pointer drags on the canvas for the boundary captures.

- [ ] **Step 2: Add npm script**

In `package.json`:

```json
"capture:diorama": "node scripts/capture-diorama.mjs"
```

- [ ] **Step 3: Run capture script**

Run:

```bash
npm run capture:diorama -- output/playwright/diorama-recovery-2026-07-07
```

Expected: all files are generated in the output folder.

- [ ] **Step 4: Commit script**

Run:

```bash
git add scripts/capture-diorama.mjs package.json
git commit -m "chore(3d): add reusable diorama capture script"
```

---

### Task 6: Final Visual Review And Notes

**Files:**
- Modify: `tasks/todo.md`
- Modify: `tasks/lessons.md`
- Modify: `~/File Vault/The starry-night/Status.md`
- Modify: `~/File Vault/The starry-night/Timeline.md`

- [ ] **Step 1: Review captures in this order**

Open and judge:

```text
output/playwright/diorama-recovery-2026-07-07/desktop-centre.png
output/playwright/diorama-recovery-2026-07-07/desktop-drag-left-boundary.png
output/playwright/diorama-recovery-2026-07-07/desktop-drag-right-boundary.png
output/playwright/diorama-recovery-2026-07-07/desktop-flow.png
output/playwright/diorama-recovery-2026-07-07/mobile-centre.png
```

Pass only if:

- source-space ribbons still read as the primary sky medium;
- cypress hides the source-edge void without becoming a prop/blob/billboard;
- no finite card edge dominates the allowed orbit views;
- the front camera still reads as Starry Night before it reads as a generic miniature;
- mobile keeps cypress, village, whorl, and moon hierarchy legible enough.

- [ ] **Step 2: If the visual gate fails, record that and stop**

Add to `tasks/lessons.md`:

```md
- 2026-07-07 — Diorama recovery attempt failed visual review. [Name exact failing capture(s)]. Do not continue tuning blindly; return to the source-ribbon/cypress-edge diagnosis.
```

- [ ] **Step 3: If the visual gate passes, record the checkpoint**

Add to `tasks/todo.md` and Obsidian `Status.md`:

```md
### 2026-07-07 painting-first front-arc recovery checkpoint

- Source-space streamline ribbons remain the primary sky medium.
- Cypress/source-edge coverage is now handled by an authored painterly cypress volume, not a source-image billboard or native-dome replacement.
- The route remains front-arc orbitable, not 360.
- Captures: `output/playwright/diorama-recovery-2026-07-07/`.
- Verification: `npm run test:sky`, `npm run lint`, `npm run build`, `npm run capture:diorama`.
```

- [ ] **Step 4: Commit notes**

Run:

```bash
git add tasks/todo.md tasks/lessons.md
git commit -m "docs(3d): record painting-first diorama recovery checkpoint"
```

Obsidian vault files live outside the repo; do not include them in the repo commit unless the vault itself is a git repo.

---

## Self-Review

- Spec coverage: the plan preserves the 3D diorama endgame, preserves source-space ribbons, keeps front-arc-only scope, isolates cypress/edge work, and requires visual capture review.
- Placeholder scan: no step says "TBD" or "handle later"; each task has concrete files, commands, and pass/fail gates.
- Type consistency: contract names use `DIORAMA_RECOVERY_CONTRACT`; cypress component names use `CypressFlameVolume`; capture output folder uses `diorama-recovery-2026-07-07`.
