# Cypress Second Pass — Source-Locked Cladding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the cypress's surface so it reads as Van Gogh's flame — long strokes following the painting's own orientation field, coloured from the painting's own pixels — instead of near-black procedural fur.

**Architecture:** An offline bake derives the tree's real orientation field and colour skin from the scan, **plus a per-row domain table** so that painting space maps onto the form correctly at every height. A pure integrator generates stroke polylines in painting space; a flat harness and the 3D runtime both consume it, so the flat gate exercises the same code that renders. The form stays a closed 3D solid — locked by the diorama contract — with sparse source-anchored tendrils added at the top only after its profile is corrected.

**Tech Stack:** TypeScript, three.js, React Three Fiber. Offline scripts are dependency-free: Node `zlib` PNG IO via `scripts/lib/png.ts`, macOS `sips` for JPEG decode, plain arithmetic. Tests are `node --test`.

**Spec:** `docs/superpowers/specs/2026-07-21-cypress-second-pass-design.md`

**Revision history:** v4 (2026-07-22), executable-contract repair before implementation. v3 was committed as `0ce57e1`; v4 closes the remaining mask-chain, seed-distribution, Node-import, shared-profile, tendril-coordinate and shipping-pipeline measurement gaps. See "What the review changed" at the foot of this document.

### v4 execution contract

The task snippets below are illustrative; these contracts are normative where an older snippet differs:

- Row-run connectivity rejects **either** an abrupt widening or narrowing by comparing the symmetric local width ratio. Every candidate seed is evaluated; a run reached by a losing chain is not globally marked as tried. This is what prevents a wide terrain seed walking upward into a narrow trunk and winning on row count.
- Stroke seeds use `Math.pow(rng(), 1.4)`: height fraction is zero at the base, so this distribution favours the lower half. `1 - Math.pow(...)` favours the tip and fails the stated test.
- Source modules exercised directly by `node --test` use explicit `.ts` relative imports. `cypressStrokes.ts` imports `normalisedFromCrop`, and tendril imports are added only when the tendril implementation exists.
- `CYPRESS_PROFILE_CONFIG`, `CYPRESS_LUM_MAX` and the profile constructor live in `cypressProfile.ts`. Runtime, tests and diagnostic all consume that same configuration. Task 8 changes this shared configuration, never a private copy in `BrushCypress.tsx`.
- Baked satellite runs are crop-local before being written to `cypress-rows.json`. Tendril tests include a non-zero painting crop, and runtime samples colour through the exported skin sampler.
- Stroke settings are one exported `CYPRESS_STROKE_CONFIG`, shared by the flat gate and runtime. With 2,200 front strokes, 45% back density and nine samples, the nominal budget is **57,420 vertices / 51,040 triangles**, before clipping and tendrils.
- `?perf=1` enables the timing probe independently of `debug`; shipping-pipeline performance is measured with `debug=final`. A no-post run is recorded only as an isolation comparison and cannot stand in for the release figure.
- The profile test is registered in `test:sky`. Expected test totals are derived from the actual runner after implementation rather than hand-maintained arithmetic in this document.

## Global Constraints

- **British English** throughout, in code comments, docs and commit messages.
- **Conventional commits.** The log reads as a build-in-public timeline.
- **No new dependencies.** Offline scripts stay dependency-free; `cwebp`/`dwebp` are already approved as bake-only tools. Anything else: stop and ask Mark.
- **Asset formats are not a free choice** (rule set 2026-07-21): signed/flow data ships **PNG**; colour data ships **lossless WebP** via `WEBP_ASSETS` in `scripts/slim-reference.ts`. The bake writes PNG; `npm run slim-reference` prepares the shipped set.
- **Colour management is not optional.** `ImageData` bytes are **sRGB**. `THREE.Color.setRGB` defaults to the **linear** working space (`node_modules/three/src/math/Color.js`), so passing bytes/255 without `SRGBColorSpace` treats sRGB values as linear and makes midtones display **brighter** after output encoding. The near-black defect came from global palette attenuation. Always pass `SRGBColorSpace`.
- **Locked acceptance criteria:** colours derived from the painting (ΔE < 10 per region, measured on **displayed** colour, not on asset bytes); head-on the diorama reads as *Starry Night*; 60 fps desktop / 30 fps mid-tier mobile; `prefers-reduced-motion` still state unaffected.
- **Retune cap: 4 passes per slice.** If a gate still fails after four, stop and bring it to Mark.
- **Do not touch:** village, hills, island, sky assets, camera contract.
- **Do not push.** Implementation stops at local commits and Mark's visual gate. Pushing requires Mark's explicit say-so.
- **Instrument rules** (`tasks/lessons.md`): a capture diff means nothing without a same-assets control run; capture RMSE cannot measure anything that alters load timing — compare decoded pixels instead.

## Measurements this plan is built on

Re-measured on the current repo, not assumed. Any change to these invalidates the tasks that depend on them.

| Measurement | Value | Consequence |
|---|---|---|
| Cypress-pixel orientation coherence | **0.134** (sky control: 0.327) | Field must be low-passed before integration, with a confidence fallback |
| Cypress orientation histogram | **47% within 75–105°** | Direction is not the defect; stroke **length** is |
| `treeishColour` + largest component | **227,047 px, 480×1191 crop, 39.7% occupancy** | A rectangular u-span is wrong; the domain must be row-normalised |
| Mask row occupancy, top→bottom | **0% · 5% · 28% · 45% · 72% · 47%** | Near the tip a rectangular `u` would span almost pure sky |
| Component touches both search limits | **true** | The mask bleeds into foreground terrain; connectivity needs a width guard |
| Design camera vs cypress base | camera x=0.62, cypress x=−1.5 | Head-on bearing is **≈64.6°**, not 90° |
| Rendered radius by height | 0.1:**0.21** · 0.3:**0.13** · 0.5:**0.19** | Two lobes with a waist — present *before* `tongue()`; the bulge is in the extracted profile |
| Stroke geometry, current vs proposed two-pass ribbons | 21,600 v / 14,400 t → 57,420 v / 51,040 t, before clipping/tendrils | **+166% v, +254% t** nominal — the budget must be measured in the shipping pipeline, not guessed |

## Architectural decisions

**Integrate in painting space, not in warped space.** Strokes are integrated over the painting's own pixel grid, and only converted to normalised form coordinates when placed on the surface. Warping the assets into a row-normalised rectangle first would require transforming the flow vectors through the warp's per-row Jacobian — an easy place to be subtly wrong, and impossible to eyeball. Integrating in painting space also makes "never integrate through off-mask sky" a trivial mask test.

**One integrator, two consumers.** `cypressStrokes.ts` produces stroke polylines in painting space and is pure and deterministic. The flat gate (Task 5) and the 3D runtime (Task 9) both call it. This is what makes the flat gate meaningful: it exercises the real integrator, density, taper, clipping and colour path, not a decorative approximation.

**Profile before tendrils.** Mark's constraint, and it is right: tendrils hung on a bulbous mesh are decoration around a defect.

## File Structure

| File | Responsibility | Status |
|---|---|---|
| `src/scene/brushForms.ts` | Brush primitives. Gains `pushBrushRibbon`. | Modify |
| `scripts/brush-forms.test.ts` | Tests, including a curved-tube case. | Modify |
| `scripts/lib/cypress-field.ts` | Pure derivation maths: mask with width-guarded connectivity, row domain, tensor, low-pass, confidence blend, sign alignment. No IO. | Create |
| `scripts/cypress-field.test.ts` | Unit tests on synthetic images. | Create |
| `scripts/derive-cypress.ts` | The bake: skin, flow, row-domain table, review crops. | Create |
| `src/scene/cypressStrokes.ts` | The integrator: painting-space stroke polylines. Pure, deterministic, shared by the flat gate and the runtime. | Create |
| `scripts/cypress-strokes.test.ts` | Integrator tests. | Create |
| `scripts/flat-cypress-gate.ts` | Renders the integrator's output flat, beside the painting. **The gate.** | Create |
| `src/scene/cypressMapping.ts` | Surface ↔ painting space, parameterised by the design-view bearing; row-span lookup and its inverse. | Create |
| `src/scene/cypressProfile.ts` | The form's radius law, with each factor switchable. Shared by `BrushCypress` and the diagnostic so they cannot drift. | Create |
| `scripts/cypress-mapping.test.ts` | Mapping tests across design, mobile and both orbit bearings. | Create |
| `scripts/diagnose-cypress-profile.ts` | Silhouette ablation study. Kept (not deleted) — it is the evidence for the profile fix. | Create |
| `src/scene/BrushCypress.tsx` | Consumes the above. | Modify |
| `scripts/slim-reference.ts`, `package.json` | Asset rule + script registration. | Modify |
| `tasks/lessons.md`, `tasks/todo.md` | Record. | Modify |

---

### Task 1: `pushBrushRibbon` — a curved multi-segment stroke primitive

`pushBrush` emits one straight 6-vertex mark and physically cannot follow a flow field.

**Relief shading note (review response):** an earlier draft faded each ribbon to 74% along its length. On a stroke 0.11×HEIGHT long that reads as a vignette, not impasto, and it biases stroke ends dark — working against the very defect this pass fixes. Relief between neighbouring strokes is instead applied by the **caller**, as a per-stroke constant. `pushBrushRibbon` does not darken.

**Files:**
- Modify: `src/scene/brushForms.ts` (append after `pushBrush`)
- Test: `scripts/brush-forms.test.ts`

**Interfaces:**
- Produces: `pushBrushRibbon(arr: BrushArrays, points: Vector3[], normals: Vector3[], colors: Color[], halfWid: number, taper?: number): void`

- [ ] **Step 1: Write the failing tests**

Append to `scripts/brush-forms.test.ts` (add `pushBrushRibbon` to the existing import):

```ts
test('pushBrushRibbon builds a quad strip along the polyline', () => {
  const arr = makeBrushArrays()
  const points = [new Vector3(0, 0, 0), new Vector3(0, 1, 0), new Vector3(0, 2, 0)]
  const normals = [new Vector3(0, 0, 1), new Vector3(0, 0, 1), new Vector3(0, 0, 1)]
  const colors = [new Color(1, 0, 0), new Color(0, 1, 0), new Color(0, 0, 1)]
  pushBrushRibbon(arr, points, normals, colors, 0.1)
  assert.equal(arr.positions.length / 3, points.length * 2)
  assert.equal(arr.indices.length, (points.length - 1) * 6)
  const xs = []
  for (let i = 0; i < arr.positions.length; i += 3) xs.push(arr.positions[i])
  assert.ok(Math.max(...xs) > 0.05 && Math.min(...xs) < -0.05, 'ribbon straddles the centre line')
})

test('pushBrushRibbon does not darken along its length', () => {
  // Relief between neighbouring strokes is the CALLER's job (a per-stroke constant). A fade along
  // a long stroke reads as a vignette and biases stroke ends dark — the defect this pass fixes.
  const arr = makeBrushArrays()
  const points = [new Vector3(0, 0, 0), new Vector3(0, 1, 0), new Vector3(0, 2, 0)]
  const normals = points.map(() => new Vector3(0, 0, 1))
  const colors = points.map(() => new Color(0.5, 0.5, 0.5))
  pushBrushRibbon(arr, points, normals, colors, 0.1)
  for (const c of arr.colors) assert.ok(Math.abs(c - 0.5) < 1e-6, `expected flat 0.5, got ${c}`)
})

test('pushBrushRibbon keeps its winding consistent around a curved tube', () => {
  // A straight-line test cannot catch bitangent flips or crossed quads. Sweep a stroke around a
  // displaced cylinder — the real case — and require every quad to keep the same facing.
  const arr = makeBrushArrays()
  const points: Vector3[] = []
  const normals: Vector3[] = []
  const colors: Color[] = []
  for (let i = 0; i < 12; i++) {
    const t = i / 11
    const a = t * Math.PI * 1.5 // wraps past the +/-x and +/-z axes, where naive frames flip
    const r = 0.5 + 0.2 * Math.sin(t * 6)
    points.push(new Vector3(Math.cos(a) * r, t * 2, Math.sin(a) * r))
    normals.push(new Vector3(Math.cos(a), 0.12, Math.sin(a)).normalize())
    colors.push(new Color(1, 1, 1))
  }
  pushBrushRibbon(arr, points, normals, colors, 0.05)

  const p = arr.positions
  const v = (i: number) => new Vector3(p[i * 3], p[i * 3 + 1], p[i * 3 + 2])
  let flips = 0
  let prev: Vector3 | null = null
  for (let i = 0; i < points.length; i++) {
    const edge = v(i * 2).sub(v(i * 2 + 1)) // across the ribbon
    if (prev && edge.dot(prev) < 0) flips++
    prev = edge.clone()
  }
  assert.equal(flips, 0, `ribbon width flipped direction ${flips} times — quads are crossed`)
})

test('pushBrushRibbon ignores degenerate input', () => {
  const arr = makeBrushArrays()
  pushBrushRibbon(arr, [new Vector3(0, 0, 0)], [new Vector3(0, 0, 1)], [new Color(1, 1, 1)], 0.1)
  assert.equal(arr.positions.length, 0)
  const dup = [new Vector3(1, 1, 1), new Vector3(1, 1, 1)]
  pushBrushRibbon(arr, dup, [new Vector3(0, 0, 1), new Vector3(0, 0, 1)], [new Color(1, 1, 1), new Color(1, 1, 1)], 0.1)
  assert.equal(arr.positions.length, 0)
})

test('pushBrushRibbon tapers width toward the far end', () => {
  const arr = makeBrushArrays()
  const points = [new Vector3(0, 0, 0), new Vector3(0, 1, 0), new Vector3(0, 2, 0)]
  const normals = points.map(() => new Vector3(0, 0, 1))
  const colors = points.map(() => new Color(1, 1, 1))
  pushBrushRibbon(arr, points, normals, colors, 0.1, 0.3)
  const first = Math.abs(arr.positions[0])
  const last = Math.abs(arr.positions[arr.positions.length - 3])
  assert.ok(last < first * 0.5, `far end must be narrower: ${last} vs ${first}`)
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test scripts/brush-forms.test.ts`
Expected: FAIL — `pushBrushRibbon is not a function`.

- [ ] **Step 3: Implement**

Append to `src/scene/brushForms.ts`:

```ts
const _rTan = new Vector3()
const _rNrm = new Vector3()
const _rBit = new Vector3()
const _rPrevBit = new Vector3()
const _rA = new Vector3()
const _rB = new Vector3()

/**
 * A curved brushstroke: a quad strip swept along `points`, one vertex pair per point, spread
 * across the surface bitangent so the ribbon lies ON the form rather than cutting into it.
 *
 * `pushBrush` (a single straight mark) cannot follow a flow field, and a bent stroke is what
 * separates Van Gogh's licking flame from fur. `taper` is the width multiplier at the far end.
 *
 * The bitangent is carried forward from the previous point and flipped if it reverses: sweeping
 * around a displaced tube crosses axes where a freshly-computed frame flips sign, which crosses
 * the quads into a bowtie. Colour is emitted exactly as given — relief between neighbouring
 * strokes belongs to the caller, as a per-stroke constant, not as a fade along the stroke.
 */
export function pushBrushRibbon(
  arr: BrushArrays,
  points: Vector3[],
  normals: Vector3[],
  colors: Color[],
  halfWid: number,
  taper = 1,
): void {
  if (points.length < 2) return
  let span = 0
  for (let i = 1; i < points.length; i++) span += points[i].distanceTo(points[i - 1])
  if (span < 1e-5) return

  const base = arr.positions.length / 3
  let havePrev = false
  for (let i = 0; i < points.length; i++) {
    const prev = points[Math.max(0, i - 1)]
    const next = points[Math.min(points.length - 1, i + 1)]
    _rTan.subVectors(next, prev)
    if (_rTan.lengthSq() < 1e-10) _rTan.set(0, 1, 0)
    _rTan.normalize()

    _rNrm.copy(normals[Math.min(i, normals.length - 1)]).normalize()
    _rBit.crossVectors(_rNrm, _rTan)
    if (_rBit.lengthSq() < 1e-10) _rBit.set(1, 0, 0)
    _rBit.normalize()
    if (havePrev && _rBit.dot(_rPrevBit) < 0) _rBit.negate()
    _rPrevBit.copy(_rBit)
    havePrev = true

    const t = i / (points.length - 1)
    const w = halfWid * (1 + (taper - 1) * t)
    _rA.copy(points[i]).addScaledVector(_rBit, w)
    _rB.copy(points[i]).addScaledVector(_rBit, -w)
    arr.positions.push(_rA.x, _rA.y, _rA.z, _rB.x, _rB.y, _rB.z)

    const c = colors[Math.min(i, colors.length - 1)]
    arr.colors.push(c.r, c.g, c.b, c.r, c.g, c.b)
  }

  for (let i = 0; i < points.length - 1; i++) {
    const a = base + i * 2
    arr.indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test scripts/brush-forms.test.ts` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/scene/brushForms.ts scripts/brush-forms.test.ts
git commit -m "feat(brush): pushBrushRibbon — a stroke that can bend

pushBrush emits one straight mark and cannot follow a flow field. Quad strip
swept along a polyline, spread across the surface bitangent, with the frame
carried forward and flipped on reversal so sweeping around a displaced tube
cannot cross the quads into a bowtie.

Emits colour exactly as given: relief between neighbouring strokes is the
caller's job as a per-stroke constant. A fade along a long stroke reads as a
vignette and biases stroke ends dark, which is the defect this pass exists to
fix."
```

---

### Task 2: `cypress-field.ts` — mask, row domain, and the derivation maths

**Files:** Create `scripts/lib/cypress-field.ts`, `scripts/cypress-field.test.ts`

**Interfaces produced** (all consumed by Task 3):
- `type Box = { x0: number; y0: number; x1: number; y1: number }`
- `type Grid = { width: number; height: number; data: Float64Array }`
- `type RowSpan = { y: number; x0: number; x1: number }` — the primary cypress interval on one painting row
- `cypressMask(painting: DecodedPNG, box: Box): { mask: Uint8Array; spans: RowSpan[] }`
- `satelliteRuns(painting: DecodedPNG, box: Box, spans: RowSpan[]): { y: number; x0: number; x1: number }[]` — detached treeish runs beside the primary column, for Task 10's tendrils
- `orientationField(lum: Grid, mask: Uint8Array, sigma: number): { cos2: Float64Array; sin2: Float64Array; coherence: Float64Array }`
- `maskedBlur(src: Float64Array, mask: Uint8Array, w: number, h: number, sigma: number): Float64Array`
- `lowPassOrientation(cos2, sin2, mask, w, h, sigma): { cos2: Float64Array; sin2: Float64Array }`
- `blendToVertical(cos2, sin2, coherence): { cos2: Float64Array; sin2: Float64Array }`
- `signedUpDirection(cos2: number, sin2: number): { dx: number; dy: number }`

**Key corrections from review.** A raw flood fill measured 227,047 px reaching both search limits, because the tree is connected to the dark foreground terrain and leaks into it. But the obvious repair — seed the widest run, guard against its width — is also wrong, and worse, because the widest run in the painting *is* the terrain: measured 80 px terrain against a 27 px trunk in the test fixture, and the same relationship in the scan. Seeding from it makes terrain the reference width, so no guard can ever reject terrain.

So `cypressMask` evaluates seeds by **vertical coherence** — the run that chains through the most rows — and guards on the symmetric **row-to-row width ratio** (`MAX_ROW_RATIO`). The symmetry is essential because the search walks in both directions: terrain is a sudden widening from the trunk and the trunk is a sudden narrowing from terrain.

- [ ] **Step 1: Write the failing tests**

Create `scripts/cypress-field.test.ts`:

```ts
/**
 * Tests for the cypress derivation maths. Synthetic images with a known answer — the discipline
 * from inpaint.test.ts. The invariants that matter: the mask is the TREE and not the terrain it
 * touches, the row domain tracks the real silhouette at every height, the low-pass averages
 * ORIENTATIONS (not angles, which wrap), weak texels fall back to vertical, and stroke direction
 * always resolves upward.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  blendToVertical,
  cypressMask,
  lowPassOrientation,
  orientationField,
  satelliteRuns,
  signedUpDirection,
  type Grid,
} from './lib/cypress-field.ts';
import type { DecodedPNG } from './lib/png.ts';

const W = 80;
const H = 120;
const TREE: [number, number, number] = [40, 46, 30]; // warm dark olive → treeish
const SKY: [number, number, number] = [70, 90, 180];

function png(fn: (x: number, y: number) => [number, number, number]): DecodedPNG {
  const rgba = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const [r, g, b] = fn(x, y);
      const i = (y * W + x) * 4;
      rgba[i] = r; rgba[i + 1] = g; rgba[i + 2] = b; rgba[i + 3] = 255;
    }
  return { width: W, height: H, rgba };
}

function grid(fn: (x: number, y: number) => number): Grid {
  const data = new Float64Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) data[y * W + x] = fn(x, y);
  return { width: W, height: H, data };
}

function angleOf(cos2: number, sin2: number): number {
  let a = (0.5 * Math.atan2(sin2, cos2) * 180) / Math.PI;
  while (a < 0) a += 180;
  return a % 180;
}

/** A tapered trunk that meets a full-width dark terrain band at the bottom — the real situation. */
function treeOnTerrain(): DecodedPNG {
  return png((x, y) => {
    const halfWidth = 2 + (y / H) * 12;
    const inTrunk = Math.abs(x - W / 2) < halfWidth;
    const inTerrain = y > H - 8;
    return inTrunk || inTerrain ? TREE : SKY;
  });
}

test('cypressMask keeps the trunk and refuses to leak into the terrain it touches', () => {
  const { mask, spans } = cypressMask(treeOnTerrain(), { x0: 0, y0: 0, x1: W, y1: H });
  assert.equal(mask[Math.floor(H / 2) * W + W / 2], 1, 'trunk is cypress');
  assert.equal(mask[(H - 2) * W + 3], 0, 'far terrain must NOT be claimed');
  const widest = Math.max(...spans.map((s) => s.x1 - s.x0));
  assert.ok(widest < W * 0.6, `mask leaked into the terrain band: widest span ${widest}px of ${W}`);
});

test('cypressMask returns a row span that tracks the real silhouette', () => {
  const { spans } = cypressMask(treeOnTerrain(), { x0: 0, y0: 0, x1: W, y1: H });
  const top = spans.find((s) => s.y === Math.floor(H * 0.15));
  const low = spans.find((s) => s.y === Math.floor(H * 0.75));
  assert.ok(top && low, 'spans must cover the tree');
  assert.ok(low!.x1 - low!.x0 > (top!.x1 - top!.x0) * 1.8, 'the trunk widens downward');
  assert.ok(Math.abs((top!.x0 + top!.x1) / 2 - W / 2) < 2, 'span is centred on the trunk');
});

test('satelliteRuns finds detached treeish runs beside the trunk, not the trunk itself', () => {
  const withFrond = png((x, y) => {
    const inTrunk = Math.abs(x - W / 2) < 2 + (y / H) * 12;
    const inFrond = y > 12 && y < 30 && x > W / 2 + 10 && x < W / 2 + 14;
    return inTrunk || inFrond ? TREE : SKY;
  });
  const { spans } = cypressMask(withFrond, { x0: 0, y0: 0, x1: W, y1: H });
  const sats = satelliteRuns(withFrond, { x0: 0, y0: 0, x1: W, y1: H }, spans);
  assert.ok(sats.length > 5, `expected the frond to be found, got ${sats.length} runs`);
  for (const s of sats) {
    assert.ok(s.y >= 12 && s.y <= 30, `satellite at y=${s.y} is outside the frond`);
    assert.ok(s.x0 > W / 2 + 5, 'satellites must be beside the trunk, not inside it');
  }
});

test('orientationField reads vertical stripes as vertical, and ignores off-mask texels', () => {
  const lum = grid((x) => (x % 8 < 4 ? 20 : 200));
  const mask = new Uint8Array(W * H).fill(1);
  const { cos2, sin2, coherence } = orientationField(lum, mask, 3);
  const i = 60 * W + 40;
  assert.ok(Math.abs(angleOf(cos2[i], sin2[i]) - 90) < 8, `expected ~90°, got ${angleOf(cos2[i], sin2[i])}`);
  assert.ok(coherence[i] > 0.5);

  // With the same image but the left half masked OFF, the masked-out region must report no
  // confidence — the sky beside the tree must never contribute orientation.
  const half = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = W / 2; x < W; x++) half[y * W + x] = 1;
  const gated = orientationField(lum, half, 3);
  assert.equal(gated.coherence[60 * W + 10], 0, 'off-mask texels must have zero coherence');
});

test('lowPassOrientation averages orientations across the wrap point', () => {
  const cos2 = new Float64Array(W * H);
  const sin2 = new Float64Array(W * H);
  const mask = new Uint8Array(W * H).fill(1);
  for (let i = 0; i < W * H; i++) {
    const t = (2 * (i % 2 === 0 ? 179 : 1) * Math.PI) / 180;
    cos2[i] = Math.cos(t); sin2[i] = Math.sin(t);
  }
  const out = lowPassOrientation(cos2, sin2, mask, W, H, 2);
  const a = angleOf(out.cos2[60 * W + 40], out.sin2[60 * W + 40]);
  assert.ok(Math.min(a, 180 - a) < 10, `expected ~0/180, got ${a}`);
});

test('the field is mask-aware at the boundary — sky never leaks in', () => {
  // Left half is tree with a strongly HORIZONTAL texture; right half is sky with a strongly
  // VERTICAL one. A boundary texel on the tree side must keep the tree's orientation.
  const lum = grid((x, y) => (x < W / 2 ? (y % 8 < 4 ? 20 : 200) : x % 8 < 4 ? 20 : 200));
  const mask = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W / 2; x++) mask[y * W + x] = 1;

  const raw = orientationField(lum, mask, 3);
  const out = lowPassOrientation(raw.cos2, raw.sin2, mask, W, H, 3);
  const boundary = 60 * W + (W / 2 - 1); // the very last tree texel
  const a = angleOf(out.cos2[boundary], out.sin2[boundary]);
  assert.ok(Math.min(Math.abs(a - 0), Math.abs(a - 180)) < 20, `boundary texel drifted to ${a}° — sky leaked in`);
});

test('blendToVertical leaves confident texels alone and rescues weak ones', () => {
  const cos2 = new Float64Array([1, 1]);
  const sin2 = new Float64Array([0, 0]);
  const coh = new Float64Array([1, 0]);
  const out = blendToVertical(cos2, sin2, coh);
  assert.ok(Math.abs(angleOf(out.cos2[0], out.sin2[0])) < 5, 'confident texel keeps its orientation');
  assert.ok(Math.abs(angleOf(out.cos2[1], out.sin2[1]) - 90) < 5, 'unconfident texel falls back to vertical');
});

test('signedUpDirection always points up the form', () => {
  for (const deg of [90, 80, 100, 45, 135]) {
    const t = (2 * deg * Math.PI) / 180;
    const { dx, dy } = signedUpDirection(Math.cos(t), Math.sin(t));
    assert.ok(dy <= 0, `orientation ${deg}° must resolve upward, got dy=${dy}`);
    assert.ok(Math.abs(Math.hypot(dx, dy) - 1) < 1e-9);
  }
});
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test scripts/cypress-field.test.ts` — Expected: FAIL, module not found.

- [ ] **Step 3: Implement `scripts/lib/cypress-field.ts`**

```ts
/**
 * The cypress derivation maths, isolated from IO so it can be tested against synthetic images
 * with a known answer (scripts/cypress-field.test.ts).
 *
 * Shaped by measurement, not hunch. The tree's own pixels give coherence 0.134 against the sky's
 * 0.327, but 47% of texels fall within 75–105°: strong VERTICAL character, weak per-pixel
 * confidence. Hence lowPassOrientation before anything integrates, and blendToVertical where
 * confidence runs out.
 *
 * The mask is row-run connectivity with a width guard, NOT a flood fill. A flood fill over the
 * real painting claimed 227,047 px reaching both search limits, because the tree touches the dark
 * foreground terrain and leaks straight into it.
 */

import { treeishColour } from './fill-region.ts';
import type { DecodedPNG } from './png.ts';

export type Box = { x0: number; y0: number; x1: number; y1: number };
export type Grid = { width: number; height: number; data: Float64Array };
export type RowSpan = { y: number; x0: number; x1: number };
export type Run = { y: number; x0: number; x1: number };

const VERTICAL_COS2 = -1; // double-angle encoding of 90°
const VERTICAL_SIN2 = 0;
const MIN_RUN_FRACTION = 0.004; // of painting width — ignore speckle
const MAX_ROW_RATIO = 1.8; // abrupt widening OR narrowing means two forms, not one column

function rowRuns(painting: DecodedPNG, y: number, box: Box, minRun: number): Run[] {
  const runs: Run[] = [];
  let start = -1;
  for (let x = box.x0; x <= box.x1; x++) {
    const i = (y * painting.width + x) * 4;
    const treeish =
      x < box.x1 && treeishColour(painting.rgba[i] / 255, painting.rgba[i + 1] / 255, painting.rgba[i + 2] / 255);
    if (treeish && start < 0) start = x;
    if (!treeish && start >= 0) {
      if (x - start >= minRun) runs.push({ y, x0: start, x1: x - 1 });
      start = -1;
    }
  }
  return runs;
}

/**
 * The cypress column: evaluate every run as a seed, then walk up and down keeping only overlapping
 * runs whose local widths remain mutually plausible. The symmetric ratio guard matters: a narrow
 * trunk must not widen into terrain, and a wide terrain seed must not narrow into the trunk.
 */
export function cypressMask(painting: DecodedPNG, box: Box): { mask: Uint8Array; spans: RowSpan[] } {
  const { width: w, height: h } = painting;
  const minRun = Math.max(2, Math.floor(w * MIN_RUN_FRACTION));
  const runsByRow: Run[][] = [];
  for (let y = 0; y < h; y++) runsByRow.push(y >= box.y0 && y < box.y1 ? rowRuns(painting, y, box, minRun) : []);

  // Seed by VERTICAL COHERENCE, never by width. The widest run in the painting is the full-width
  // foreground terrain, so a widest-run seed makes terrain the seed and no width guard can then
  // reject it — measured: 80 px terrain against a 27 px trunk in the test fixture, and the same
  // relationship in the scan. The cypress is the run that chains through the MOST ROWS.
  const chainFrom = (start: Run): Run[] => {
    const chain = [start];
    for (const dir of [-1, 1]) {
      let prev = start;
      for (let y = start.y + dir; y >= box.y0 && y < box.y1; y += dir) {
        let best: Run | null = null;
        let bestOverlap = 0;
        for (const r of runsByRow[y]) {
          const overlap = Math.min(r.x1, prev.x1) - Math.max(r.x0, prev.x0);
          if (overlap > bestOverlap) { bestOverlap = overlap; best = r; }
        }
        if (!best || bestOverlap <= 0) break;
        const bestWidth = best.x1 - best.x0 + 1;
        const prevWidth = prev.x1 - prev.x0 + 1;
        if (Math.max(bestWidth / prevWidth, prevWidth / bestWidth) > MAX_ROW_RATIO) break;
        if (dir < 0) chain.unshift(best); else chain.push(best);
        prev = best;
      }
    }
    return chain;
  };

  let bestChain: Run[] = [];
  for (const runs of runsByRow) {
    for (const r of runs) {
      const chain = chainFrom(r);
      if (chain.length > bestChain.length) bestChain = chain;
    }
  }
  if (!bestChain.length) return { mask: new Uint8Array(w * h), spans: [] };
  const kept = new Map<number, Run>(bestChain.map((r) => [r.y, r]));

  const mask = new Uint8Array(w * h);
  const spans: RowSpan[] = [];
  for (const [y, run] of [...kept.entries()].sort((a, b) => a[0] - b[0])) {
    for (let x = run.x0; x <= run.x1; x++) mask[y * w + x] = 1;
    spans.push({ y, x0: run.x0, x1: run.x1 });
  }
  return { mask, spans };
}

/**
 * Treeish runs that are NOT part of the primary column — the painting's detached fronds. Task 10
 * connects these into a few coherent vertical tracks; they are deliberately a separate extractor
 * so the primary profile contract is untouched (Mark's constraint, 2026-07-21).
 */
export function satelliteRuns(painting: DecodedPNG, box: Box, spans: RowSpan[]): Run[] {
  const minRun = Math.max(2, Math.floor(painting.width * MIN_RUN_FRACTION));
  const byRow = new Map(spans.map((s) => [s.y, s]));
  const out: Run[] = [];
  for (const span of spans) {
    for (const r of rowRuns(painting, span.y, box, minRun)) {
      const primary = byRow.get(span.y)!;
      const overlaps = Math.min(r.x1, primary.x1) >= Math.max(r.x0, primary.x0);
      if (!overlaps) out.push(r);
    }
  }
  return out;
}

export function gaussianBlur(src: Float64Array, w: number, h: number, sigma: number): Float64Array {
  const r = Math.max(1, Math.ceil(sigma * 3));
  const k = new Float64Array(2 * r + 1);
  let sum = 0;
  for (let i = -r; i <= r; i++) { const v = Math.exp(-(i * i) / (2 * sigma * sigma)); k[i + r] = v; sum += v; }
  for (let i = 0; i < k.length; i++) k[i] /= sum;
  const tmp = new Float64Array(w * h);
  const out = new Float64Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let i = -r; i <= r; i++) acc += src[y * w + Math.min(w - 1, Math.max(0, x + i))] * k[i + r];
      tmp[y * w + x] = acc;
    }
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let i = -r; i <= r; i++) acc += tmp[Math.min(h - 1, Math.max(0, y + i)) * w + x] * k[i + r];
      out[y * w + x] = acc;
    }
  return out;
}

/**
 * Blur `src` using only masked samples — normalised convolution. Blurring the masked signal and
 * the mask itself, then dividing, is what stops sky bleeding into the tree's field: an ordinary
 * blur averages off-mask zeros back in and drags boundary texels toward nothing.
 */
export function maskedBlur(src: Float64Array, mask: Uint8Array, w: number, h: number, sigma: number): Float64Array {
  const weighted = new Float64Array(w * h);
  const weights = new Float64Array(w * h);
  for (let i = 0; i < w * h; i++) {
    weighted[i] = mask[i] ? src[i] : 0;
    weights[i] = mask[i] ? 1 : 0;
  }
  const num = gaussianBlur(weighted, w, h, sigma);
  const den = gaussianBlur(weights, w, h, sigma);
  const out = new Float64Array(w * h);
  for (let i = 0; i < w * h; i++) out[i] = den[i] > 1e-6 ? num[i] / den[i] : 0;
  return out;
}

/**
 * Structure-tensor orientation of the direction paint RUNS IN, with coherence gated by gradient
 * energy.
 *
 * Mask-aware throughout, which takes more than skipping off-mask centres. Gradients use MASK-SAFE
 * neighbours (a neighbour outside the tree is replaced by the centre, so the tree's edge does not
 * register a huge false gradient against the sky), and every blur is a normalised convolution over
 * masked samples only. Without both, the sky beside the trunk writes its orientation into the
 * trunk's boundary — precisely the texels that define the silhouette.
 */
export function orientationField(
  lum: Grid,
  mask: Uint8Array,
  sigma: number,
): { cos2: Float64Array; sin2: Float64Array; coherence: Float64Array } {
  const { width: w, height: h, data } = lum;
  const gx = new Float64Array(w * h);
  const gy = new Float64Array(w * h);
  const at = (x: number, y: number, cx: number, cy: number) => {
    const xi = Math.min(w - 1, Math.max(0, x));
    const yi = Math.min(h - 1, Math.max(0, y));
    return mask[yi * w + xi] ? data[yi * w + xi] : data[cy * w + cx]; // mask-safe: fall back to centre
  };
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!mask[i]) continue;
      gx[i] = (at(x + 1, y, x, y) - at(x - 1, y, x, y)) * 0.5;
      gy[i] = (at(x, y + 1, x, y) - at(x, y - 1, x, y)) * 0.5;
    }

  const Jxx = new Float64Array(w * h);
  const Jxy = new Float64Array(w * h);
  const Jyy = new Float64Array(w * h);
  for (let i = 0; i < w * h; i++) { Jxx[i] = gx[i] * gx[i]; Jxy[i] = gx[i] * gy[i]; Jyy[i] = gy[i] * gy[i]; }
  const Sxx = maskedBlur(Jxx, mask, w, h, sigma);
  const Sxy = maskedBlur(Jxy, mask, w, h, sigma);
  const Syy = maskedBlur(Jyy, mask, w, h, sigma);

  const cos2 = new Float64Array(w * h);
  const sin2 = new Float64Array(w * h);
  const coherence = new Float64Array(w * h);
  let maxEnergy = 1e-12;
  for (let i = 0; i < w * h; i++) if (mask[i]) maxEnergy = Math.max(maxEnergy, Sxx[i] + Syy[i]);

  for (let i = 0; i < w * h; i++) {
    const diff = Sxx[i] - Syy[i];
    const off = 2 * Sxy[i];
    const mag = Math.hypot(diff, off);
    // paint runs perpendicular to the gradient; rotating 90° negates the double-angle encoding
    cos2[i] = mag > 1e-12 ? -diff / mag : VERTICAL_COS2;
    sin2[i] = mag > 1e-12 ? -off / mag : VERTICAL_SIN2;
    if (!mask[i]) { coherence[i] = 0; continue; }
    const trace = Sxx[i] + Syy[i];
    coherence[i] = (trace > 1e-12 ? mag / trace : 0) * Math.min(1, trace / (0.15 * maxEnergy));
  }
  return { cos2, sin2, coherence };
}

/**
 * Low-pass in DOUBLE-ANGLE space. Averaging angles is wrong — 179° and 1° average to 90°, the
 * perpendicular of the truth — while averaging (cos2θ, sin2θ) is the correct way to average
 * orientations. That is the whole reason for the encoding.
 */
export function lowPassOrientation(
  cos2: Float64Array, sin2: Float64Array, mask: Uint8Array, w: number, h: number, sigma: number,
): { cos2: Float64Array; sin2: Float64Array } {
  // Masked, for the same reason the tensor is: an ordinary blur here would average the sky's
  // orientation back into the tree's boundary after the tensor took care to exclude it.
  const c = maskedBlur(cos2, mask, w, h, sigma);
  const s = maskedBlur(sin2, mask, w, h, sigma);
  for (let i = 0; i < c.length; i++) {
    const m = Math.hypot(c[i], s[i]);
    if (m > 1e-12) { c[i] /= m; s[i] /= m; } else { c[i] = VERTICAL_COS2; s[i] = VERTICAL_SIN2; }
  }
  return { cos2: c, sin2: s };
}

/** Where the painting is not confident, fall back to the tree's measured global vertical. */
export function blendToVertical(
  cos2: Float64Array, sin2: Float64Array, coherence: Float64Array,
): { cos2: Float64Array; sin2: Float64Array } {
  const c = new Float64Array(cos2.length);
  const s = new Float64Array(sin2.length);
  for (let i = 0; i < cos2.length; i++) {
    const k = Math.min(1, Math.max(0, coherence[i]));
    let cc = cos2[i] * k + VERTICAL_COS2 * (1 - k);
    let ss = sin2[i] * k + VERTICAL_SIN2 * (1 - k);
    const m = Math.hypot(cc, ss);
    if (m > 1e-12) { cc /= m; ss /= m; } else { cc = VERTICAL_COS2; ss = VERTICAL_SIN2; }
    c[i] = cc; s[i] = ss;
  }
  return { cos2: c, sin2: s };
}

/**
 * Resolve an undirected orientation into a direction pointing UP the form. Image space has +y
 * down, so "up" is dy <= 0. Without this the integrator walks half its strokes downward — the
 * same class of bug as the 2026-07-16 sign-flipped donated sky flow.
 */
export function signedUpDirection(cos2: number, sin2: number): { dx: number; dy: number } {
  const theta = 0.5 * Math.atan2(sin2, cos2);
  let dx = Math.cos(theta);
  let dy = Math.sin(theta);
  if (dy > 0) { dx = -dx; dy = -dy; }
  return { dx, dy };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test scripts/cypress-field.test.ts` — Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/cypress-field.ts scripts/cypress-field.test.ts
git commit -m "feat(pipeline): cypress derivation maths with a width-guarded mask

Structure tensor, orientation low-pass, confidence blend and sign alignment as
pure functions over synthetic images.

The mask is row-run connectivity with a width guard, not a flood fill: measured
against the real painting, a flood fill claims 227,047 px and reaches both search
limits, because the tree touches the dark foreground terrain and leaks into it.
Off-mask texels are forced to zero coherence so the sky beside the tree can never
contribute orientation. Satellite runs get their own extractor, leaving the
primary profile contract untouched."
```

---

### Task 3: `derive-cypress.ts` — the bake, with a row-domain table

**Files:** Create `scripts/derive-cypress.ts`; modify `package.json`, `scripts/slim-reference.ts`

**Outputs (committed):**
- `public/reference/cypress-skin.png` → shipped `.webp`. Painting-space crop; **alpha = validity** (255 on cypress, 0 off it).
- `public/reference/cypress-flow.png`. Painting-space crop; R,G = signed up-direction, B = coherence.
- `public/reference/cypress-rows.json` — `{ x0: number, y0: number, width: number, height: number, spans: [vNorm, uLeft, uRight][], satellites: Run[] }`, the per-row cypress interval plus **crop-local** detached runs. **This is what makes `u` mean "across the tree at this height" instead of "across a rectangle".**

**Outputs (gitignored review crops):** `reference/derived/cypress-field-overlay.png`, `cypress-mask-overlay.png`.

- [ ] **Step 1: Write the script**

```ts
/*
 * Derive the cypress's own orientation field, colour skin and row domain from the scan (2026-07-21).
 *
 * The tree reads as near-black fur because it is built from palette constants and short procedural
 * marks. The painting contains every stroke it needs — derive them offline and let the runtime
 * render them. Same lesson the sky paid six rounds to learn (docs/decisions/0003-inpaint-extend.md).
 *
 * The ROW DOMAIN is the part worth understanding. The tree occupies 0% of its bounding rectangle at
 * the top and 72% near the base, so a rectangular u-span would mean "across sky" near the tip. The
 * spans table records the real cypress interval per row; u = 0..1 is normalised within it.
 *
 * Dependency-free: macOS `sips` for JPEG decode, Node `zlib` PNG IO, plain arithmetic.
 * Run: npm run derive-cypress   THEN npm run slim-reference (skin ships as lossless WebP).
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  blendToVertical, cypressMask, lowPassOrientation, orientationField, satelliteRuns, signedUpDirection, type Box,
} from './lib/cypress-field.ts';
import { decodePNG, encodePNG } from './lib/png.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const WORK = resolve(ROOT, 'reference/derived/cypress-work.png');
const OUT_SKIN = resolve(ROOT, 'public/reference/cypress-skin.png');
const OUT_FLOW = resolve(ROOT, 'public/reference/cypress-flow.png');
const OUT_ROWS = resolve(ROOT, 'public/reference/cypress-rows.json');
const OUT_FIELD_OVERLAY = resolve(ROOT, 'reference/derived/cypress-field-overlay.png');
const OUT_MASK_OVERLAY = resolve(ROOT, 'reference/derived/cypress-mask-overlay.png');

const REGION = { u0: 0.02, u1: 0.32, v0: 0.04, v1: 1.0 };
const TENSOR_SIGMA = 4.0;
const LOWPASS_SIGMA = 3.0; // coherence here is 0.134; without this, integrated strokes wander

mkdirSync(dirname(WORK), { recursive: true });
execFileSync('sips', ['-s', 'format', 'png', resolve(ROOT, 'public/reference/painting.jpg'), '--out', WORK], { stdio: 'ignore' });
const painting = decodePNG(readFileSync(WORK));
const { width: W, height: H } = painting;

const box: Box = {
  x0: Math.floor(REGION.u0 * W), y0: Math.floor(REGION.v0 * H),
  x1: Math.ceil(REGION.u1 * W), y1: Math.ceil(REGION.v1 * H),
};
const { mask, spans } = cypressMask(painting, box);
if (spans.length < 100) throw new Error(`cypress mask found only ${spans.length} rows — the region or gate is wrong`);

let bx0 = W, by0 = H, bx1 = 0, by1 = 0;
for (const s of spans) {
  bx0 = Math.min(bx0, s.x0); bx1 = Math.max(bx1, s.x1);
  by0 = Math.min(by0, s.y); by1 = Math.max(by1, s.y);
}
const cw = bx1 - bx0 + 1;
const ch = by1 - by0 + 1;
let maskPx = 0;
for (let i = 0; i < mask.length; i++) maskPx += mask[i];

// --- luminance + mask over the crop ---
const lum = { width: cw, height: ch, data: new Float64Array(cw * ch) };
const cropMask = new Uint8Array(cw * ch);
for (let y = 0; y < ch; y++)
  for (let x = 0; x < cw; x++) {
    const src = ((y + by0) * W + (x + bx0)) * 4;
    lum.data[y * cw + x] = 0.299 * painting.rgba[src] + 0.587 * painting.rgba[src + 1] + 0.114 * painting.rgba[src + 2];
    cropMask[y * cw + x] = mask[(y + by0) * W + (x + bx0)];
  }

const raw = orientationField(lum, cropMask, TENSOR_SIGMA);
const smoothed = lowPassOrientation(raw.cos2, raw.sin2, cropMask, cw, ch, LOWPASS_SIGMA);
const field = blendToVertical(smoothed.cos2, smoothed.sin2, raw.coherence);

// --- flow asset ---
const flowRgba = new Uint8Array(cw * ch * 4);
for (let i = 0; i < cw * ch; i++) {
  const { dx, dy } = signedUpDirection(field.cos2[i], field.sin2[i]);
  flowRgba[i * 4] = Math.round(((dx + 1) / 2) * 255);
  flowRgba[i * 4 + 1] = Math.round(((dy + 1) / 2) * 255);
  flowRgba[i * 4 + 2] = Math.round(Math.min(1, Math.max(0, raw.coherence[i])) * 255);
  flowRgba[i * 4 + 3] = 255;
}
writeFileSync(OUT_FLOW, encodePNG(cw, ch, flowRgba));

// --- skin asset: real paint, alpha carries validity ---
const skinRgba = new Uint8Array(cw * ch * 4);
for (let y = 0; y < ch; y++)
  for (let x = 0; x < cw; x++) {
    const src = ((y + by0) * W + (x + bx0)) * 4;
    const dst = (y * cw + x) * 4;
    const valid = cropMask[y * cw + x] === 1;
    skinRgba[dst] = painting.rgba[src];
    skinRgba[dst + 1] = painting.rgba[src + 1];
    skinRgba[dst + 2] = painting.rgba[src + 2];
    skinRgba[dst + 3] = valid ? 255 : 0;
  }
// Clamp-fill the invalid margin from the nearest VALID texel on the same row, in both directions,
// so a sample that lands a pixel outside the mask returns cypress paint rather than sky. This is a
// genuine nearest-on-row fill: the earlier one-directional carry left interior gaps inheriting
// whatever lay to their left.
for (let y = 0; y < ch; y++) {
  const rowValid: number[] = [];
  for (let x = 0; x < cw; x++) if (skinRgba[(y * cw + x) * 4 + 3] === 255) rowValid.push(x);
  if (!rowValid.length) continue;
  for (let x = 0; x < cw; x++) {
    const dst = (y * cw + x) * 4;
    if (skinRgba[dst + 3] === 255) continue;
    let nearest = rowValid[0];
    for (const vx of rowValid) if (Math.abs(vx - x) < Math.abs(nearest - x)) nearest = vx;
    const src = (y * cw + nearest) * 4;
    skinRgba[dst] = skinRgba[src]; skinRgba[dst + 1] = skinRgba[src + 1]; skinRgba[dst + 2] = skinRgba[src + 2];
    // alpha stays 0: the runtime must still know this texel is outside the tree
  }
}
writeFileSync(OUT_SKIN, encodePNG(cw, ch, skinRgba));

// --- row domain table ---
const table = {
  x0: bx0, y0: by0, width: cw, height: ch,
  spans: spans.map((s) => [
    Number(((s.y - by0) / (ch - 1)).toFixed(5)),
    Number(((s.x0 - bx0) / (cw - 1)).toFixed(5)),
    Number(((s.x1 - bx0) / (cw - 1)).toFixed(5)),
  ]),
};
writeFileSync(OUT_ROWS, JSON.stringify(table));

// --- review crops ---
const fieldOverlay = new Uint8Array(cw * ch * 4);
const maskOverlay = new Uint8Array(cw * ch * 4);
for (let i = 0; i < cw * ch; i++) {
  const src = ((Math.floor(i / cw) + by0) * W + ((i % cw) + bx0)) * 4;
  for (const buf of [fieldOverlay, maskOverlay]) {
    buf[i * 4] = painting.rgba[src]; buf[i * 4 + 1] = painting.rgba[src + 1];
    buf[i * 4 + 2] = painting.rgba[src + 2]; buf[i * 4 + 3] = 255;
  }
  if (cropMask[i]) { maskOverlay[i * 4] = Math.min(255, maskOverlay[i * 4] + 90); }
}
for (let y = 6; y < ch; y += 12)
  for (let x = 6; x < cw; x += 12) {
    if (!cropMask[y * cw + x]) continue;
    const { dx, dy } = signedUpDirection(field.cos2[y * cw + x], field.sin2[y * cw + x]);
    for (let t = -5; t <= 5; t++) {
      const px = Math.round(x + dx * t);
      const py = Math.round(y + dy * t);
      if (px < 0 || py < 0 || px >= cw || py >= ch) continue;
      const o = (py * cw + px) * 4;
      fieldOverlay[o] = 255; fieldOverlay[o + 1] = 90; fieldOverlay[o + 2] = 40;
    }
  }
writeFileSync(OUT_FIELD_OVERLAY, encodePNG(cw, ch, fieldOverlay));
writeFileSync(OUT_MASK_OVERLAY, encodePNG(cw, ch, maskOverlay));

let cohSum = 0, cohN = 0;
for (let i = 0; i < cw * ch; i++) if (cropMask[i]) { cohSum += raw.coherence[i]; cohN++; }
console.log(
  `cypress: ${maskPx} px over ${spans.length} rows, crop ${cw}x${ch} at (${bx0},${by0})\n` +
    `mask occupancy ${((100 * maskPx) / (cw * ch)).toFixed(1)}%, mean coherence ${(cohSum / cohN).toFixed(3)}\n` +
    `NEXT: npm run slim-reference, then npm run flat-cypress-gate`,
);
```

- [ ] **Step 2: Register**

`package.json` → `scripts`, after `extend-reference`:
```json
    "derive-cypress": "node scripts/derive-cypress.ts",
    "flat-cypress-gate": "node scripts/flat-cypress-gate.ts",
```
Append to `test:sky`'s file list: ` scripts/cypress-field.test.ts scripts/cypress-mapping.test.ts scripts/cypress-strokes.test.ts scripts/cypress-profile.test.ts`

`scripts/slim-reference.ts`:
```ts
const WEBP_ASSETS = ['painting-filled', 'sky-extend-left', 'sky-extend-right', 'cypress-skin'];
```

- [ ] **Step 3: Run and check the numbers**

Run: `npm run derive-cypress && npm run slim-reference`

**Expected, and these are pass/fail gates, not decoration:**
- Mask occupancy in the crop is **≥ 55%** (the flood-fill version scored 39.7%). Lower means the mask is still claiming rectangle rather than tree.
- The crop's width is **well under 480 px** — the flood-fill version spanned the whole search box.
- Mean coherence lands near **0.13–0.20**.

If occupancy is below 55%, tune `MAX_ROW_RATIO` in `cypress-field.ts` and re-run. This is retune pass 1 of 4.

- [ ] **Step 4: Look at the mask overlay**

Open `reference/derived/cypress-mask-overlay.png`. The red tint must cover the tree and **stop at the ground** — no terrain band, no hills. If it bleeds, lower `MAX_ROW_RATIO`.

- [ ] **Step 5: Commit**

```bash
git add scripts/derive-cypress.ts scripts/slim-reference.ts package.json public/reference/cypress-flow.png public/reference/cypress-skin.webp public/reference/cypress-rows.json
git commit -m "feat(pipeline): bake the cypress skin, flow and row domain

The row domain is the load-bearing part. The tree fills 0% of its bounding
rectangle at the top and 72% near the base, so a rectangular u-span would mean
'across sky' near the tip and the painting's edges would not land on the
silhouette at any height but the widest. cypress-rows.json records the real
cypress interval per row; u is normalised within it.

Skin carries validity in alpha and clamp-fills the margin from the nearest valid
texel on the row in BOTH directions, so a sample landing just outside the mask
returns cypress paint rather than sky or whatever lay to its left."
```

---

### Task 4: `cypressMapping.ts` — surface ↔ painting, aligned to the real design camera

**Correction from review:** the earlier draft assumed the camera looks down +Z, mapping the crop centre to `a = π/2`. The design camera sits at **x = 0.62, z = 5.18** (`dioramaContract.ts`) while the cypress stands at **x = −1.5, z = 0.72** — so the camera-facing bearing at the tree is **≈64.6°**, not 90°. Mapping must be parameterised by that bearing or the painting's silhouette lands in the wrong place at exactly the view Mark judges.

**Files:** Create `src/scene/cypressMapping.ts`, `scripts/cypress-mapping.test.ts`

**Interfaces produced:**
- `cypressViewBearing(cameraPos: readonly [number, number, number], base: readonly [number, number, number]): number`
- `surfaceToPaintingU(angle: number, bearing: number): number`
- `paintingUToAngle(u: number, bearing: number, frontFacing: boolean): number`
- `isFrontFacing(angle: number, bearing: number): boolean`
- `paintingUV(u: number, heightFraction: number, rows: RowTable): { px: number; py: number }` — normalised `u` within the row's span → crop-normalised painting coordinates
- `normalisedFromCrop(px: number, py: number, rows: RowTable): { u: number; heightFraction: number }` — the inverse, used per integration step
- `rowSpanAt(py: number, rows: RowTable): { left: number; right: number }`
- `type RowTable = { width: number; height: number; spans: [number, number, number][] }`

- [ ] **Step 1: Write the failing tests**

```ts
/**
 * The cypress's surface-to-painting map. Two contracts:
 *  1. Head-on FROM THE DESIGN CAMERA, the painting's cypress edges land on the form's silhouette.
 *     The camera is not on the +Z axis relative to the tree, so the bearing is a parameter.
 *  2. u is normalised WITHIN the row's cypress span, so u=0/1 mean the tree's real edges at that
 *     height — not the edges of a bounding rectangle that is mostly sky near the tip.
 */

import assert from 'node:assert/strict'
import test from 'node:test'
import { DIORAMA_CAMERAS } from '../src/scene/dioramaContract.ts'
import {
  cypressViewBearing, isFrontFacing, paintingUToAngle, paintingUV, surfaceToPaintingU,
} from '../src/scene/cypressMapping.ts'

const BASE = [-1.5, 0.02, 0.72] as const

test('the view bearing follows the design camera, not the +Z axis', () => {
  const b = cypressViewBearing(DIORAMA_CAMERAS.design.position, BASE)
  const deg = (b * 180) / Math.PI
  assert.ok(Math.abs(deg - 64.6) < 2, `design bearing should be ~64.6°, got ${deg.toFixed(1)}°`)
  assert.ok(Math.abs(deg - 90) > 10, 'must NOT assume the camera looks down +Z')
})

test('the painting spans the visible half, edges on the silhouette, centre facing the camera', () => {
  const b = cypressViewBearing(DIORAMA_CAMERAS.design.position, BASE)
  assert.ok(Math.abs(surfaceToPaintingU(b, b) - 0.5) < 1e-9, 'facing the camera is the painting centre')
  // Orientation anchor, verified by eye at the flat gate and the first capture — NOT guessed.
  // The formula is screen-correct as written: bearing-PI/2 is the u=1 rim.
  assert.ok(Math.abs(surfaceToPaintingU(b - Math.PI / 2, b) - 1) < 1e-9, 'bearing-PI/2 is the u=1 rim')
  assert.ok(Math.abs(surfaceToPaintingU(b + Math.PI / 2, b) - 0) < 1e-9, 'bearing+PI/2 is the u=0 rim')
})

test('the back mirrors the front and is continuous at the silhouette', () => {
  const b = 1.1
  const edge = b + Math.PI / 2
  assert.ok(Math.abs(surfaceToPaintingU(edge - 0.001, b) - surfaceToPaintingU(edge + 0.001, b)) < 1e-4)
})

test('u round-trips to an angle on the requested side, for every judged view', () => {
  for (const cam of [DIORAMA_CAMERAS.design, DIORAMA_CAMERAS.mobile, DIORAMA_CAMERAS.orbit]) {
    const b = cypressViewBearing(cam.position, BASE)
    for (const a of [b - 1.2, b - 0.3, b + 0.4, b + 1.3]) {
      const u = surfaceToPaintingU(a, b)
      const back = paintingUToAngle(u, b, false)
      assert.ok(Math.abs(paintingUToAngle(u, b, true) - a) < 1e-6 || Math.abs(surfaceToPaintingU(back, b) - u) < 1e-6)
      assert.ok(Math.abs(surfaceToPaintingU(paintingUToAngle(u, b, true), b) - u) < 1e-6, 'front round-trip')
      assert.ok(Math.abs(surfaceToPaintingU(back, b) - u) < 1e-6, 'back maps to the same u')
    }
  }
})

test('paintingUV normalises u inside the row span, not across the rectangle', () => {
  // near the tip the tree occupies a narrow sliver; near the base, most of the crop
  const rows = { width: 100, height: 100, spans: [[0, 0.45, 0.55] as [number, number, number], [1, 0.05, 0.95] as [number, number, number]] }
  const tip = paintingUV(0.5, 1, rows) // heightFraction 1 = tip = v 0 = first span
  assert.ok(Math.abs(tip.px - 0.5) < 1e-6, 'u=0.5 is the middle of the tree at that height')
  const tipEdge = paintingUV(1, 1, rows)
  assert.ok(Math.abs(tipEdge.px - 0.55) < 1e-6, 'u=1 is the tree edge, not the crop edge')
  const baseEdge = paintingUV(1, 0, rows)
  assert.ok(Math.abs(baseEdge.px - 0.95) < 1e-6, 'the same u means a different pixel at a different height')
})

test('isFrontFacing splits on the camera-facing hemisphere', () => {
  const b = 1.1
  assert.equal(isFrontFacing(b, b), true)
  assert.equal(isFrontFacing(b + Math.PI, b), false)
})
```

- [ ] **Step 2: Run to verify failure.** Run: `node --test scripts/cypress-mapping.test.ts` — Expected: FAIL, module not found.

- [ ] **Step 3: Implement `src/scene/cypressMapping.ts`**

```ts
/**
 * Maps the cypress's 3D surface to the painting's cypress crop, and back.
 *
 * TWO corrections over the naive version, both from Mark's 2026-07-21 cross-review:
 *
 * 1. The camera is NOT on the +Z axis relative to the tree. The design camera sits at x=0.62,
 *    z=5.18 (dioramaContract.ts) while the cypress stands at x=-1.5, z=0.72 — a bearing of about
 *    64.6°. Assuming 90° would put the painting's silhouette edges in the wrong place at exactly
 *    the view Mark judges, so the bearing is a parameter, derived from the camera contract.
 *
 * 2. u is normalised WITHIN each row's cypress span, not across the bounding rectangle. The tree
 *    fills 0% of its rectangle at the top and 72% near the base; a rectangular u would mean
 *    "across sky" near the tip.
 *
 * The invented back half mirrors the front, which falls out of the cosine and is CONTINUOUS at the
 * silhouette where the two meet. An offset would put a seam on the most visible edge of the form.
 */

export type RowTable = { width: number; height: number; spans: [number, number, number][] }

/** Bearing (in the form's XZ angle convention) of the camera as seen from the cypress. */
export function cypressViewBearing(
  cameraPos: readonly [number, number, number],
  base: readonly [number, number, number],
): number {
  return Math.atan2(cameraPos[2] - base[2], cameraPos[0] - base[0])
}

/** Painting-space u for a surface angle: 0 and 1 are the silhouette edges as the camera sees them. */
export function surfaceToPaintingU(angle: number, bearing: number): number {
  const rel = angle - bearing
  return Math.min(1, Math.max(0, (1 - Math.cos(rel - Math.PI / 2)) / 2))
}

/** True on the camera-facing half of the form. */
export function isFrontFacing(angle: number, bearing: number): boolean {
  return Math.cos(angle - bearing) > 0
}

/** Inverse of the u map; the caller states which hemisphere, since front and back share a u. */
export function paintingUToAngle(u: number, bearing: number, frontFacing: boolean): number {
  const clamped = Math.min(1, Math.max(0, u))
  const rel = Math.acos(1 - 2 * clamped) // [0, PI]
  return bearing + Math.PI / 2 + (frontFacing ? -rel : rel)
}

/** The cypress's left/right edge at a given crop-normalised height, from the baked row spans. */
export function rowSpanAt(py: number, rows: RowTable): { left: number; right: number } {
  const spans = rows.spans
  if (!spans.length) return { left: 0, right: 1 }
  let lo = 0
  let hi = spans.length - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (spans[mid][0] <= py) lo = mid
    else hi = mid
  }
  const a = spans[lo]
  const b = spans[hi]
  const t = b[0] === a[0] ? 0 : (py - a[0]) / (b[0] - a[0])
  return { left: a[1] + (b[1] - a[1]) * t, right: a[2] + (b[2] - a[2]) * t }
}

/**
 * Crop-normalised painting coordinates for a normalised position on the tree. `u` runs 0..1 across
 * the tree AT THIS HEIGHT, interpolated from the baked row spans.
 */
export function paintingUV(u: number, heightFraction: number, rows: RowTable): { px: number; py: number } {
  const py = 1 - Math.min(1, Math.max(0, heightFraction))
  const { left, right } = rowSpanAt(py, rows)
  return { px: left + (right - left) * Math.min(1, Math.max(0, u)), py }
}

/**
 * Inverse of `paintingUV`: crop-normalised pixel position → normalised position on the tree.
 *
 * The integrator advances in crop pixels and derives u/heightFraction per sample through this, so
 * the changing row width is applied exactly once, where it belongs. Integrating normalised u with
 * a pixel-space flow vector would mix units and smear the warp through every step.
 */
export function normalisedFromCrop(px: number, py: number, rows: RowTable): { u: number; heightFraction: number } {
  const { left, right } = rowSpanAt(py, rows)
  const width = right - left
  return {
    u: width > 1e-6 ? (px - left) / width : 0.5,
    heightFraction: 1 - py,
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass.** Run: `node --test scripts/cypress-mapping.test.ts` — Expected: PASS, 6 tests.

- [ ] **Step 5: Update the spec.** In the design doc, replace the "Mapping front to back" paragraph: state that `u` is normalised within the row span, that the bearing comes from the design camera (~64.6°, not 90°), and that the back mirrors exactly because mirroring is continuous at the silhouette.

- [ ] **Step 6: Commit**

```bash
git add src/scene/cypressMapping.ts scripts/cypress-mapping.test.ts docs/superpowers/specs/2026-07-21-cypress-second-pass-design.md
git commit -m "feat(3d): map the cypress surface to the painting, from the real camera

Two corrections from Mark's cross-review. The design camera is not on +Z
relative to the tree — it sits at x=0.62 against the cypress at x=-1.5, a
bearing of ~64.6 degrees — so assuming 90 would misplace the painting's
silhouette edges at exactly the view being judged; the bearing is now derived
from dioramaContract. And u is normalised within each row's cypress span rather
than across the bounding rectangle, which is mostly sky near the tip.

Tested across design, mobile and orbit bearings."
```

---

### Task 5: `cypressStrokes.ts` — the integrator, shared by the flat gate and the runtime

This is what makes the flat gate honest: one integrator, two consumers.

**Files:** Create `src/scene/cypressStrokes.ts`, `scripts/cypress-strokes.test.ts`

**Interfaces produced:**
- `type StrokeSample = { u: number; heightFraction: number; r: number; g: number; b: number }` — `r,g,b` are **sRGB 0–1**, converted by the consumer
- `type CypressStroke = { samples: StrokeSample[]; relief: number }` — `relief` is the per-stroke constant brightness multiplier
- `generateCypressStrokes(opts: CypressStrokeOptions): CypressStroke[]`
- `type CypressStrokeOptions = { skin: ImageData2D; flow: ImageData2D; rows: RowTable; count: number; steps: number; lengthFraction: number; seed: number }`

Rules the tests pin:
- **Deterministic** — same seed, identical output.
- **Never integrates through off-mask sky** — a step whose skin alpha is 0 ends the stroke.
- **Contained** — stepping outside the crop ends the stroke (the 2026-07-14 containment lesson).
- **Strokes are long** — median length ≥ 60% of the requested length, or the fur defect returns.

- [ ] **Step 1: Write the failing tests**

```ts
/**
 * The cypress stroke integrator. The flat gate and the 3D runtime both call this, so these tests
 * cover the thing that actually decides fur-vs-flame: that strokes are LONG, follow the field,
 * stop at the tree's edge, and are reproducible.
 */

import assert from 'node:assert/strict'
import test from 'node:test'
import { generateCypressStrokes, type CypressStrokeOptions } from '../src/scene/cypressStrokes.ts'

const CW = 60
const CH = 200

/** A skin whose whole width is valid, and a flow pointing straight up. */
function fixtures(flowDx = 0) {
  const skin = { data: new Uint8ClampedArray(CW * CH * 4), width: CW, height: CH }
  const flow = { data: new Uint8ClampedArray(CW * CH * 4), width: CW, height: CH }
  for (let i = 0; i < CW * CH; i++) {
    skin.data[i * 4] = 40; skin.data[i * 4 + 1] = 60; skin.data[i * 4 + 2] = 30; skin.data[i * 4 + 3] = 255
    flow.data[i * 4] = Math.round(((flowDx + 1) / 2) * 255) // dx
    flow.data[i * 4 + 1] = Math.round(((-1 + 1) / 2) * 255) // dy = -1, up
    flow.data[i * 4 + 2] = 200
    flow.data[i * 4 + 3] = 255
  }
  const rows: CypressStrokeOptions['rows'] = { width: CW, height: CH, spans: [[0, 0, 1], [1, 0, 1]] }
  return { skin, flow, rows }
}

const OPTS = (over: Partial<CypressStrokeOptions> = {}): CypressStrokeOptions => ({
  ...fixtures(), count: 200, steps: 9, lengthFraction: 0.11, seed: 12345, ...over,
})

test('generateCypressStrokes is deterministic', () => {
  assert.deepEqual(generateCypressStrokes(OPTS()), generateCypressStrokes(OPTS()))
})

test('strokes are LONG — the fur defect is short marks', () => {
  const strokes = generateCypressStrokes(OPTS())
  const lengths = strokes
    .map((s) => Math.abs(s.samples[s.samples.length - 1].heightFraction - s.samples[0].heightFraction))
    .sort((a, b) => a - b)
  const median = lengths[Math.floor(lengths.length / 2)]
  assert.ok(median > 0.11 * 0.6, `median stroke spans ${median.toFixed(3)} of height — too short, this is fur`)
})

test('strokes travel upward', () => {
  for (const s of generateCypressStrokes(OPTS())) {
    assert.ok(
      s.samples[s.samples.length - 1].heightFraction >= s.samples[0].heightFraction,
      'a stroke must not run down the tree',
    )
  }
})

test('strokes stop at the tree edge and never sample sky', () => {
  // right half invalid: alpha 0
  const { skin, flow, rows } = fixtures()
  for (let y = 0; y < CH; y++) for (let x = CW / 2; x < CW; x++) skin.data[(y * CW + x) * 4 + 3] = 0
  for (const s of generateCypressStrokes(OPTS({ skin, flow, rows }))) {
    for (const sample of s.samples) {
      const px = Math.round(sample.u * (CW - 1))
      assert.ok(px < CW / 2, `stroke sampled an invalid texel at u=${sample.u}`)
    }
  }
})

test('relief varies per stroke but starts conservative', () => {
  // The source pixels already carry real value variation, so relief only has to separate
  // neighbours. Starting at 0.78-1.20 put ~38% of strokes below 0.94 and would re-introduce the
  // darkening this pass removes. Default is 0.94-1.06; the displayed-colour gate has to justify
  // any widening, not the other way round.
  const strokes = generateCypressStrokes(OPTS())
  const reliefs = new Set(strokes.map((s) => s.relief.toFixed(4)))
  assert.ok(reliefs.size > strokes.length * 0.5, 'relief must vary per stroke, else the cladding is a flat sheet')
  for (const s of strokes) assert.ok(s.relief >= 0.94 && s.relief <= 1.06, `relief ${s.relief} is out of range`)
})

test('relief can be ablated to exactly 1', () => {
  // The ablation Mark asked for: prove the strokes read without relief at all, so any relief that
  // ships is a judged choice rather than an unexamined default.
  for (const s of generateCypressStrokes(OPTS({ reliefSpread: 0 }))) assert.equal(s.relief, 1)
})

test('seeds favour the fuller base, not the tip', () => {
  const strokes = generateCypressStrokes(OPTS())
  const below = strokes.filter((s) => s.samples[0].heightFraction < 0.5).length
  assert.ok(below / strokes.length > 0.55, `only ${((100 * below) / strokes.length).toFixed(0)}% seeded low — biased to the tip`)
})

test('a tapering row span does not distort stroke geometry', () => {
  // Integration happens in crop pixels; u is derived per sample. If the two were mixed, a
  // narrowing row would bend a straight stroke sideways in u.
  const { skin, flow } = fixtures()
  const rows = { width: CW, height: CH, spans: [[0, 0.4, 0.6] as [number, number, number], [1, 0.1, 0.9] as [number, number, number]] }
  for (const s of generateCypressStrokes(OPTS({ skin, flow, rows }))) {
    for (const sample of s.samples) {
      assert.ok(sample.u >= -0.01 && sample.u <= 1.01, `u=${sample.u} escaped the row span`)
    }
  }
})

test('a non-square crop keeps steps isotropic', () => {
  // stepPx is in pixels, so a tall thin crop must not make horizontal travel faster than vertical
  const wide = { data: new Uint8ClampedArray(200 * 50 * 4), width: 200, height: 50 }
  for (let i = 0; i < 200 * 50; i++) {
    wide.data[i * 4] = 40; wide.data[i * 4 + 1] = 60; wide.data[i * 4 + 2] = 30; wide.data[i * 4 + 3] = 255
  }
  const flowWide = { data: new Uint8ClampedArray(200 * 50 * 4), width: 200, height: 50 }
  for (let i = 0; i < 200 * 50; i++) {
    flowWide.data[i * 4] = Math.round(((0.7071 + 1) / 2) * 255) // 45 degrees
    flowWide.data[i * 4 + 1] = Math.round(((-0.7071 + 1) / 2) * 255)
    flowWide.data[i * 4 + 2] = 200; flowWide.data[i * 4 + 3] = 255
  }
  const rows = { width: 200, height: 50, spans: [[0, 0, 1] as [number, number, number], [1, 0, 1] as [number, number, number]] }
  const strokes = generateCypressStrokes(OPTS({ skin: wide, flow: flowWide, rows, count: 50 }))
  assert.ok(strokes.length > 0, 'strokes must survive a wide crop')
})

test('a sideways field bends the strokes', () => {
  const straight = generateCypressStrokes(OPTS())
  const bent = generateCypressStrokes(OPTS({ ...fixtures(0.6) }))
  const drift = (list: ReturnType<typeof generateCypressStrokes>) =>
    list.reduce((acc, s) => acc + Math.abs(s.samples[s.samples.length - 1].u - s.samples[0].u), 0) / list.length
  assert.ok(drift(bent) > drift(straight) * 3, 'strokes must follow the field sideways, not just go up')
})
```

- [ ] **Step 2: Run to verify failure.** Expected: FAIL, module not found.

- [ ] **Step 3: Implement `src/scene/cypressStrokes.ts`**

```ts
import { mulberry32 } from './brush.ts'
import { normalisedFromCrop, paintingUV, type RowTable } from './cypressMapping.ts'
import type { ImageData2D } from './useImageData.ts'

/**
 * Generates the cypress's brushstrokes as polylines in the painting's own crop space.
 *
 * Shared deliberately between the flat gate (scripts/flat-cypress-gate.ts) and the 3D runtime
 * (BrushCypress.tsx). The spec requires the strokes to be judged FLAT, against the painting,
 * before anything enters 3D — a gate that renders something other than the real integrator would
 * prove nothing about density, length, taper, clipping or colour.
 *
 * Integration happens in painting space, never in a warped rectangle: warping would require
 * transforming the flow vectors through the row warp's Jacobian, an easy thing to get subtly wrong
 * and impossible to eyeball. Here "do not integrate through sky" is just a validity test.
 */

export type StrokeSample = {
  /** 0..1 across the tree AT THIS HEIGHT (normalised within the row's span) */
  u: number
  heightFraction: number
  /** sRGB, 0..1 — the consumer converts to its own working space */
  r: number
  g: number
  b: number
}

export type CypressStroke = {
  samples: StrokeSample[]
  /** Per-stroke brightness constant. Relief BETWEEN neighbouring strokes; never a fade along one. */
  relief: number
}

export type CypressStrokeOptions = {
  skin: ImageData2D
  flow: ImageData2D
  rows: RowTable
  count: number
  steps: number
  /** stroke length as a fraction of tree height */
  lengthFraction: number
  seed: number
  /** half-width of the per-stroke relief range around 1.0. Default 0.06 → 0.94–1.06. */
  reliefSpread?: number
}

function sampleAt(img: ImageData2D, px: number, py: number) {
  const x = Math.min(img.width - 1, Math.max(0, Math.round(px * (img.width - 1))))
  const y = Math.min(img.height - 1, Math.max(0, Math.round(py * (img.height - 1))))
  const i = (y * img.width + x) * 4
  return { r: img.data[i], g: img.data[i + 1], b: img.data[i + 2], a: img.data[i + 3] }
}

export function generateCypressStrokes(opts: CypressStrokeOptions): CypressStroke[] {
  const { skin, flow, rows, count, steps, lengthFraction, seed, reliefSpread = 0.06 } = opts
  const rng = mulberry32(seed)
  const out: CypressStroke[] = []
  // Integration state is CROP PIXELS. An earlier draft advanced normalised u and heightFraction
  // using a pixel-space flow vector, which mixes units and silently reintroduces the changing-
  // row-width warp this design exists to avoid. Normalised u/hf are DERIVED per emitted sample
  // from the local row span; they are never integrated.
  const stepPx = (lengthFraction * skin.height) / (steps - 1)

  for (let s = 0; s < count; s++) {
    // heightFraction is zero at the base. Exponent > 1 therefore favours the BASE; subtracting
    // from one would invert the distribution and favour the tip.
    const seedHf = Math.pow(rng(), 1.4)
    const seedU = rng()
    const relief = 1 - reliefSpread + 2 * reliefSpread * rng()
    const samples: StrokeSample[] = []

    const start = paintingUV(seedU, seedHf, rows)
    let px = start.px * (skin.width - 1)
    let py = start.py * (skin.height - 1)

    for (let k = 0; k < steps; k++) {
      const pxN = px / (skin.width - 1)
      const pyN = py / (skin.height - 1)
      if (pxN < 0 || pxN > 1 || pyN < 0 || pyN > 1) break
      const skinTexel = sampleAt(skin, pxN, pyN)
      if (skinTexel.a === 0) break // off the tree: containment, and never sample sky

      const { u, heightFraction } = normalisedFromCrop(pxN, pyN, rows)
      samples.push({ u, heightFraction, r: skinTexel.r / 255, g: skinTexel.g / 255, b: skinTexel.b / 255 })

      const f = sampleAt(flow, pxN, pyN)
      const dx = (f.r / 255) * 2 - 1
      const dy = (f.g / 255) * 2 - 1
      const m = Math.hypot(dx, dy) || 1
      px += (dx / m) * stepPx
      py += (dy / m) * stepPx // painting +y is DOWN; the field is sign-aligned upward, so dy < 0
    }

    if (samples.length >= 3) out.push({ samples, relief })
  }
  return out
}
```

- [ ] **Step 4: Run the tests to verify they pass.** Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/scene/cypressStrokes.ts scripts/cypress-strokes.test.ts
git commit -m "feat(3d): the cypress stroke integrator, shared by the flat gate and runtime

One integrator, two consumers — that is what makes the flat gate honest. It
exercises the real density, length, taper, clipping and colour path rather than
a decorative approximation.

Integration runs in painting space, never in a warped rectangle: warping would
mean pushing flow vectors through the row warp's Jacobian, easy to get subtly
wrong and impossible to eyeball. Here 'never integrate through sky' is a validity
test. Colour is emitted as sRGB for the consumer to convert."
```

---

### Task 6: The flat gate — render the real strokes, flat, beside the painting

**This is the gate the spec promised.** Not ticks: the actual integrator output.

**Files:** Create `scripts/flat-cypress-gate.ts`

- [ ] **Step 1: Write the harness**

```ts
/*
 * THE FLAT GATE (spec: "flat review first, before anything enters 3D").
 *
 * Rasterises the real integrator's strokes — same code, same seeds, same parameters as the 3D
 * runtime — into a flat image beside the painting crop. The cypress ghost cost six rounds partly
 * because everything was judged in 3D, where the loop is slow and comparison is hard. If the
 * strokes do not read as flame here, they never will in 3D.
 *
 * WHAT THIS GATE COVERS: stroke path, length, density, containment, taper, and the display-colour
 * path (setRGB through SRGBColorSpace, then output encoding).
 * WHAT IT DOES NOT: moon lift, which needs a 3D surface normal; projected ribbon width under
 * perspective; occlusion by the solid; and anything about the silhouette. Those are the 3D
 * capture's job (Task 9 Step 6) — do not let a pass here be quoted as covering them.
 *
 * Run: npm run flat-cypress-gate
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { Color, SRGBColorSpace } from 'three';

import { generateCypressStrokes, type StrokeSample } from '../src/scene/cypressStrokes.ts';
import { paintingUV } from '../src/scene/cypressMapping.ts';
import { decodePNG, encodePNG } from './lib/png.ts';

const ROOT = resolve(import.meta.dirname, '..');
const OUT = resolve(ROOT, 'reference/derived/cypress-flat-gate.png');

// Must match BrushCypress.tsx exactly, or the gate is testing something else.
const COUNT = 2200;
const STEPS = 9;
const LENGTH_FRACTION = 0.11;
const SEED = 0x0cabba9e;
const HALF_WID_PX = 2.2;
const TAPER = 0.45; // must match the taper passed to pushBrushRibbon in BrushCypress.tsx

const skinPng = decodePNG(readFileSync(resolve(ROOT, 'reference/derived/cypress-skin-source.png')));
const flowPng = decodePNG(readFileSync(resolve(ROOT, 'public/reference/cypress-flow.png')));
const rows = JSON.parse(readFileSync(resolve(ROOT, 'public/reference/cypress-rows.json'), 'utf8'));

const asImageData = (p: { width: number; height: number; rgba: Uint8Array }) => ({
  data: new Uint8ClampedArray(p.rgba), width: p.width, height: p.height,
});

const strokes = generateCypressStrokes({
  skin: asImageData(skinPng), flow: asImageData(flowPng), rows,
  count: COUNT, steps: STEPS, lengthFraction: LENGTH_FRACTION, seed: SEED,
});

const W = skinPng.width;
const H = skinPng.height;
const canvas = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) { canvas[i * 4] = 12; canvas[i * 4 + 1] = 14; canvas[i * 4 + 2] = 22; canvas[i * 4 + 3] = 255; }

/**
 * Rasterise one tapered ribbon segment as a quad, through the SAME display-colour path the runtime
 * uses: Color.setRGB(..., SRGBColorSpace) converts to linear, and convertLinearToSRGB puts it back
 * for display, exactly as the renderer's output encoding does. A square dot of raw bytes would
 * exercise neither the taper nor the conversion, so the gate could not claim either.
 */
const col = new Color();
function quad(ax: number, ay: number, bx: number, by: number, wa: number, wb: number, s: StrokeSample, relief: number) {
  col.setRGB(s.r, s.g, s.b, SRGBColorSpace).multiplyScalar(relief).convertLinearToSRGB();
  const r = Math.round(Math.min(1, col.r) * 255);
  const g = Math.round(Math.min(1, col.g) * 255);
  const b = Math.round(Math.min(1, col.b) * 255);
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const steps = Math.max(2, Math.ceil(len));
  for (let t = 0; t <= steps; t++) {
    const f = t / steps;
    const cx = ax + dx * f;
    const cy = ay + dy * f;
    const halfW = wa + (wb - wa) * f;
    for (let o = -halfW; o <= halfW; o += 0.5) {
      const x = Math.round(cx + nx * o);
      const y = Math.round(cy + ny * o);
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const i = (y * W + x) * 4;
      canvas[i] = r; canvas[i + 1] = g; canvas[i + 2] = b;
    }
  }
}

let totalSamples = 0;
for (const stroke of strokes) {
  totalSamples += stroke.samples.length;
  const n = stroke.samples.length;
  for (let k = 0; k < n - 1; k++) {
    const a = stroke.samples[k];
    const b = stroke.samples[k + 1];
    const pa = paintingUV(a.u, a.heightFraction, rows);
    const pb = paintingUV(b.u, b.heightFraction, rows);
    // same taper law as the 3D ribbon (Task 9 passes taper 0.45)
    const wa = HALF_WID_PX * (1 + (TAPER - 1) * (k / (n - 1)));
    const wb = HALF_WID_PX * (1 + (TAPER - 1) * ((k + 1) / (n - 1)));
    quad(pa.px * (W - 1), pa.py * (H - 1), pb.px * (W - 1), pb.py * (H - 1), wa, wb, a, stroke.relief);
  }
}

// painting | strokes, side by side with a divider
const out = new Uint8Array(W * 2 * H * 4);
for (let y = 0; y < H; y++)
  for (let x = 0; x < W * 2; x++) {
    const dst = (y * W * 2 + x) * 4;
    const src = x < W ? (y * W + x) * 4 : (y * W + (x - W)) * 4;
    const from = x < W ? skinPng.rgba : canvas;
    out[dst] = from[src]; out[dst + 1] = from[src + 1]; out[dst + 2] = from[src + 2]; out[dst + 3] = 255;
  }
writeFileSync(OUT, encodePNG(W * 2, H, out));
console.log(
  `flat gate: ${strokes.length}/${COUNT} strokes survived, ${(totalSamples / strokes.length).toFixed(1)} samples each\n` +
    `wrote ${OUT} — painting LEFT, strokes RIGHT. LOOK AT IT.`,
);
```

- [ ] **Step 2: Keep an unfilled skin for the gate**

The shipped skin clamp-fills its margin, which would let the gate draw paint outside the tree. In `derive-cypress.ts`, before the clamp-fill loop, add:

```ts
writeFileSync(resolve(ROOT, 'reference/derived/cypress-skin-source.png'), encodePNG(cw, ch, skinRgba.slice()));
```

- [ ] **Step 3: Run the gate and LOOK**

Run: `npm run derive-cypress && npm run flat-cypress-gate`
Open `reference/derived/cypress-flat-gate.png`.

**Pass conditions — judge honestly against the left half:**
1. Strokes are **long and sinuous**, running up the form. Not stubs (fur) and not wandering into knots (spaghetti).
2. **Colour is the painting's** — green and umber visible, not a black mass.
3. Coverage reads as **brushwork**, not a solid fill or a sparse scatter.
4. **≥ 85% of strokes survive.** A low survival rate means the integrator is walking off the tree.

If it fails, tune in this order and re-run — this is the retune budget, 4 passes: `LOWPASS_SIGMA` (wandering), `LENGTH_FRACTION` (too short/long), `COUNT` (coverage). **Report which pass number you are on.** If four passes do not pass it, stop and bring the image to Mark.

- [ ] **Step 4: Commit**

```bash
git add scripts/flat-cypress-gate.ts scripts/derive-cypress.ts package.json
git commit -m "feat(pipeline): the flat cypress gate renders the real strokes

The spec requires strokes judged flat, against the painting, before anything
enters 3D. Direction ticks would not have exercised the integrator, density,
taper, clipping, colour path or ribbon geometry — the things that decide whether
it reads as fur, spaghetti or flame. This rasterises the actual integrator with
the runtime's own seeds and parameters."
```

---

### Task 7: Diagnose the silhouette properly — a real ablation

**Correction from review:** the earlier binary ("widest above 0.3" vs "monotonically widest at base") is **unreachable**. Measured widest-point heights are 0.137 / 0.137 / 0.153 / 0.169 for `lumMax` 62/75/90/105 — neither branch. Worse, the rendered radius is 0.21 at height 0.1, **0.13 at 0.3**, 0.19 at 0.5: two lobes with a waist, present in the extracted profile *before* `tongue()`. The diagnosis must therefore ablate four factors separately and compare each against the painting's own row-wise silhouette.

**Second correction (review round 2):** the first ablation compared *cumulative recipes* (A, then A+B, then A+B+C), which cannot attribute blame; averaged `tongue()` around the whole circumference rather than measuring the **visible rim**, which is what a viewer sees; and duplicated the profile formulas instead of importing the ones the runtime uses, so it could not verify Task 8's fix at all.

Corrected design: **extract one pure profile function** used by *both* `BrushCypress` and the diagnostic, then compare a single **composed baseline** against **leave-one-factor-out** variants, scoring the **design-camera projected outline** against the painting's row-wise silhouette.

**Files:** Create `src/scene/cypressProfile.ts` (the shared profile), `scripts/diagnose-cypress-profile.ts` (kept — it is the evidence), `scripts/cypress-profile.test.ts`

- [ ] **Step 0: Extract the shared profile function**

Create `src/scene/cypressProfile.ts`, and have `BrushCypress.tsx` import `composedRadius` in place of its inline `radiusAt`. Export `CYPRESS_LUM_MAX`, `CYPRESS_PROFILE_CONFIG` and `makeCypressProfile(slices)` here; both runtime and diagnostic construct their baseline through it. Both consumers must call the same code **and use the same configuration**, or the diagnostic still measures a copy that can drift.

```ts
import { smooth, vnoise } from './brushForms'

export type ProfileFactors = {
  /** the extracted painting silhouette half-width per slice */
  slices: number[]
  /** disable individually for leave-one-out ablation */
  useUpperTaper: boolean
  useTongue: boolean
  smoothingWindow: number // 0 = none
}

export const CYPRESS_LUM_MAX = 90
export const CYPRESS_PROFILE_CONFIG = {
  useUpperTaper: true,
  useTongue: true,
  smoothingWindow: 0,
} as const

export function makeCypressProfile(slices: number[]): ProfileFactors {
  return { slices, ...CYPRESS_PROFILE_CONFIG }
}

export function tongue(a: number, hf: number, sharpen = 1.35): number {
  const ridge = vnoise(Math.cos(a) * 1.7 + 10, Math.sin(a) * 1.7 + hf * 3.4 + 4)
  const fine = vnoise(Math.cos(a) * 4 + 2, Math.sin(a) * 4 + hf * 6 + 7)
  const bump = (ridge - 0.5) * 1.0 + (fine - 0.5) * 0.1
  return bump > 0 ? bump * sharpen : bump * 0.45
}

/** The form's radius at a height and angle, with each factor switchable for ablation. */
export function composedRadius(hf: number, angle: number, f: ProfileFactors, widthScale = 4.6): number {
  const n = f.slices.length
  const idx = Math.min(n - 1, Math.max(0, Math.round(hf * (n - 1))))
  let half = f.slices[idx]
  if (f.smoothingWindow > 0) {
    let acc = 0
    let c = 0
    for (let k = -f.smoothingWindow; k <= f.smoothingWindow; k++) {
      const j = idx + k
      if (j >= 0 && j < n) { acc += f.slices[j]; c++ }
    }
    half = acc / c
  }
  let r = half * widthScale
  if (f.useUpperTaper) r *= 1 - smooth(0.84, 1, hf) * 0.82
  if (f.useTongue) {
    const tipTaper = 0.35 + 0.65 * (1 - smooth(0.6, 1, hf))
    r *= 1 + tongue(angle, hf) * 0.5 * tipTaper
  }
  return Math.max(0.015, r)
}

/**
 * The half-width a viewer actually sees: the maximum extent perpendicular to the view bearing,
 * which is what forms the silhouette. Averaging around the circumference measures something no
 * one looks at.
 */
export function projectedHalfWidth(hf: number, bearing: number, f: ProfileFactors, samples = 64): number {
  let maxPerp = 0
  for (let i = 0; i < samples; i++) {
    const a = (i / samples) * Math.PI * 2
    const r = composedRadius(hf, a, f)
    maxPerp = Math.max(maxPerp, Math.abs(r * Math.sin(a - bearing)))
  }
  return maxPerp
}
```

- [ ] **Step 1: Write the ablation**

```ts
/*
 * Why is the rendered cypress bulbous? Four candidate contributors, ablated separately and each
 * compared against the painting's own row-wise silhouette (the ground truth, from the same row
 * spans the bake produces).
 *
 * Measured before writing this: widest point sits at height 0.137-0.169 for every lumMax, and the
 * rendered radius runs 0.21 at h=0.1, 0.13 at h=0.3, 0.19 at h=0.5 — two lobes with a waist,
 * already present in the extracted halfWidth. So neither "threshold" nor "tongue noise" alone is
 * the answer, and a binary diagnosis would have forced a guess.
 *
 * Run: node scripts/diagnose-cypress-profile.ts
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { cypressViewBearing } from '../src/scene/cypressMapping.ts';
import {
  CYPRESS_LUM_MAX,
  makeCypressProfile,
  projectedHalfWidth,
  type ProfileFactors,
} from '../src/scene/cypressProfile.ts';
import { DIORAMA_CAMERAS } from '../src/scene/dioramaContract.ts';
import { extractCypressSlices } from '../src/scene/paintingRegions.ts';
import { cypressMask, type Box } from './lib/cypress-field.ts';
import { decodePNG } from './lib/png.ts';

const ROOT = resolve(import.meta.dirname, '..');
const WORK = resolve(ROOT, 'reference/derived/cypress-work.png');
execFileSync('sips', ['-s', 'format', 'png', resolve(ROOT, 'public/reference/painting.jpg'), '--out', WORK], { stdio: 'ignore' });
const png = decodePNG(readFileSync(WORK));
const painting = { data: new Uint8ClampedArray(png.rgba), width: png.width, height: png.height };

const smooth = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

/** GROUND TRUTH: the painting's own half-width per height, from the bake's row spans. */
const box: Box = {
  x0: Math.floor(0.02 * png.width), y0: Math.floor(0.04 * png.height),
  x1: Math.ceil(0.32 * png.width), y1: png.height,
};
const { spans } = cypressMask(png, box);
const y0 = Math.min(...spans.map((s) => s.y));
const y1 = Math.max(...spans.map((s) => s.y));
const truth = (hf: number) => {
  const y = Math.round(y1 - hf * (y1 - y0));
  const s = spans.reduce((best, cur) => (Math.abs(cur.y - y) < Math.abs(best.y - y) ? cur : best), spans[0]);
  return (s.x1 - s.x0 + 1) / 2 / png.width;
};

const bearing = cypressViewBearing(DIORAMA_CAMERAS.design.position, [-1.5, 0.02, 0.72]);
const hs = [...Array(21).keys()].map((k) => k / 20);
const truthNorm = (() => {
  const vals = hs.map(truth);
  const max = Math.max(...vals);
  return vals.map((v) => v / max);
})();

/** Score a factor set by the PROJECTED outline the design camera sees, against the painting. */
function score(label: string, f: ProfileFactors) {
  const vals = hs.map((hf) => projectedHalfWidth(hf, bearing, f));
  const max = Math.max(...vals);
  const norm = vals.map((v) => v / max);
  const err = norm.reduce((a, v, i) => a + Math.abs(v - truthNorm[i]), 0) / norm.length;
  console.log(`${label.padEnd(40)} peak@${hs[norm.indexOf(1)].toFixed(2)}  meanAbsErr=${err.toFixed(4)}`);
  return err;
}

const slicesFor = (lumMax: number) =>
  [...extractCypressSlices(painting, { lumMax })].reverse().map((s) => s.halfWidth);

// ONE composed baseline — constructed by the same public contract as the runtime.
const BASE = makeCypressProfile(slicesFor(CYPRESS_LUM_MAX));
console.log('--- composed baseline (what ships today) ---');
const baseErr = score('BASELINE', BASE);

// LEAVE-ONE-FACTOR-OUT: the drop in error attributes blame to that factor and nothing else.
console.log('\n--- leave one factor out (bigger improvement = more blame) ---');
const variants: [string, ProfileFactors][] = [
  ['without upper taper', { ...BASE, useUpperTaper: false }],
  ['without tongue()', { ...BASE, useTongue: false }],
  ['with smoothing win=3', { ...BASE, smoothingWindow: 3 }],
  ['with smoothing win=7', { ...BASE, smoothingWindow: 7 }],
  ['extraction lumMax=62', { ...BASE, slices: slicesFor(62) }],
  ['extraction lumMax=75', { ...BASE, slices: slicesFor(75) }],
  ['extraction lumMax=105', { ...BASE, slices: slicesFor(105) }],
];
const ranked = variants
  .map(([label, f]) => ({ label, improvement: baseErr - score(label, f) }))
  .sort((a, b) => b.improvement - a.improvement);

console.log('\n--- ranking ---');
for (const r of ranked) console.log(`${r.label.padEnd(40)} improvement=${r.improvement.toFixed(4)}`);
console.log(`\nFIX THE TOP-RANKED FACTOR ONLY, then re-run. Baseline error to beat: ${baseErr.toFixed(4)}`);
```

- [ ] **Step 2: Run it and read the ranking**

Run: `node scripts/diagnose-cypress-profile.ts`

The output ranks each factor by `meanAbsErrVsPainting`. **The fix is whichever factor's removal most reduces that error** — a measured ranking, not a binary. Record the table in the Task 8 commit message.

- [ ] **Step 3: Commit the diagnostic**

```bash
git add src/scene/cypressProfile.ts scripts/cypress-profile.test.ts scripts/diagnose-cypress-profile.ts src/scene/BrushCypress.tsx package.json
git commit -m "test(3d): ablate the cypress silhouette against the painting

The previous binary diagnosis was unreachable: widest point sits at 0.137-0.169
for every lumMax, and the rendered radius runs 0.21 / 0.13 / 0.19 at heights
0.1 / 0.3 / 0.5 — two lobes with a waist, already in the extracted halfWidth. So
neither threshold nor tongue noise alone explains it.

Ablates extraction threshold, profile smoothing, the explicit upper taper and
tongue() separately, each scored against the painting's own row-wise silhouette."
```

---

### Task 8: Correct the solid's profile

Driven by Task 7's ranking. **Must land before tendrils** — Mark's constraint: tendrils on a bulbous mesh are decoration around a defect.

**Files:** Modify the shared constants in `src/scene/cypressProfile.ts`; `BrushCypress.tsx` consumes them without a private override.

- [ ] **Step 1: Apply the highest-ranked fix only**

Change whichever single factor Task 7 ranked worst in `CYPRESS_PROFILE_CONFIG` (or `CYPRESS_LUM_MAX`). Do not change two at once — that is how credit gets misattributed.

- [ ] **Step 2: Re-run the ablation to confirm the improvement**

Run: `node scripts/diagnose-cypress-profile.ts`
Expected: `meanAbsErrVsPainting` for the final composed profile is measurably lower than before. **State the before and after numbers.**

- [ ] **Step 3: If one fix is not enough, apply the next-ranked and re-measure.** Retune cap: 4. Report the pass number.

- [ ] **Step 4: Commit**

```bash
git add src/scene/BrushCypress.tsx
git commit -m "fix(3d): correct the cypress profile against the painting's silhouette

<paste the ablation table; name the factor changed and the before/after
meanAbsErrVsPainting>"
```

---

### Task 9: Clad the cypress — the 3D payload

**P0 corrections from review.** The earlier draft would not have compiled:
- It introduced a second `const STROKES` while line 27's declaration remained.
- It deleted `CORE` and `GREEN`, which the **solid** still uses at lines 96 and 111.
- It left `PALETTE` and `pushBrush` unused under `noUnusedLocals`.

So: **change** the existing stroke constant, **keep** separately-named dark underpaint colours for the solid, and **replace** the `brushForms` import rather than adding a second one.

**Files:** Modify `src/scene/BrushCypress.tsx`

- [ ] **Step 1: Constants — edit in place, do not duplicate**

Change line 27 `const STROKES = 3600` to:

```ts
const STROKES = 2200 // FRONT pass; long ribbons now, not stubs — Task 11 sets the measured budget
const BACK_DENSITY = 0.45 // the invented back is sparser: it is never the view being judged
const STROKE_STEPS = 9
const STROKE_LEN = 0.11 // fraction of HEIGHT per stroke
const MOON_LIFT = 0.14 // a lift on the lit side, never the main value term
```

Replace the `CORE`/`GREEN`/`OLIVE`/`LIT` block with underpaint-only colours. The **solid** still needs these (lines 96, 111); only the *cladding* moves to source colour:

```ts
// The SOLID is underpaint only: it exists so gaps between strokes read as deep cypress shadow
// rather than sky-void. The cladding no longer uses these — its colour comes from the painting.
const UNDER_CORE = new Color(PALETTE.cypress).multiplyScalar(0.68)
const UNDER_GREEN = new Color(PALETTE.cypressGreen).multiplyScalar(0.95)
```

Then update the two solid references: line 96 `cc.copy(CORE).lerp(GREEN, ...)` → `cc.copy(UNDER_CORE).lerp(UNDER_GREEN, ...)`, and line 111 `cc.copy(CORE).multiplyScalar(0.7)` → `cc.copy(UNDER_CORE).multiplyScalar(0.7)`.

- [ ] **Step 2: Imports — replace, don't duplicate**

Change the `brushForms` import line to:

```ts
import { makeBrushArrays, moonShade, pushBrushRibbon } from './brushForms'
```

(`pushBrush` goes — the cladding no longer uses it. `PALETTE` stays, used by the underpaint colours.) Add:

```ts
import { SRGBColorSpace } from 'three'
import { generateCypressStrokes } from './cypressStrokes'
import { cypressViewBearing, paintingUToAngle, paintingUV, type RowTable } from './cypressMapping'
import { composedRadius, makeCypressProfile, tongue } from './cypressProfile'
import { DIORAMA_CAMERAS } from './dioramaContract'
import rowTableJson from '../../public/reference/cypress-rows.json'

// TypeScript infers a JSON import's spans as number[][], not the tuple the RowTable contract needs,
// so the shape is asserted once here rather than being spread through every call site.
const rowTable = rowTableJson as unknown as RowTable & {
  satellites: { y: number; x0: number; x1: number }[]
}
```

- [ ] **Step 3: Load the assets**

```ts
  const paintingData = useImageData('/reference/painting.jpg')
  const skinData = useImageData('/reference/cypress-skin.webp')
  const flowData = useImageData('/reference/cypress-flow.png')
```
Guard: `if (!paintingData || !skinData || !flowData) return null`
Deps: `}, [paintingData, skinData, flowData])`

- [ ] **Step 4: Replace the cladding loop**

Replace lines 122–170 with:

```ts
    // --- brushstroke cladding: the painting's own strokes, on the form ---
    // Van Gogh's cypress is long sinuous strokes running the height of the form. Short marks read
    // as fur whatever their direction — lessons.md calls this "the cypress fur trap". Length is
    // the fix; direction and colour come from the tree's own derived assets.
    const arr = makeBrushArrays()
    const nrm = new Vector3()
    const strokeCol = new Color()
    const bearing = cypressViewBearing(DIORAMA_CAMERAS.design.position, [BASE.x, BASE.y, BASE.z])

    // TWO EXPLICIT PASSES, both in the geometry budget. An earlier draft picked a hemisphere per
    // stroke from an arbitrary u/relief heuristic, which left the judged FRONT holding only part
    // of the source stroke set — the one view that must match the painting. The front pass is
    // complete; the back is a mirrored, sparser continuation, since it is invented and never the
    // thing being judged.
    const frontStrokes = generateCypressStrokes({
      skin: skinData, flow: flowData, rows: rowTable,
      count: STROKES, steps: STROKE_STEPS, lengthFraction: STROKE_LEN, seed: 0x0cabba9e,
    })
    const backStrokes = generateCypressStrokes({
      skin: skinData, flow: flowData, rows: rowTable,
      count: Math.round(STROKES * BACK_DENSITY), steps: STROKE_STEPS, lengthFraction: STROKE_LEN,
      seed: 0x5eed1e55,
    })

    for (const [pass, strokes] of [[true, frontStrokes], [false, backStrokes]] as const) {
      for (const stroke of strokes) {
      const front = pass
      const points: Vector3[] = []
      const normals: Vector3[] = []
      const colors: Color[] = []

      for (const sample of stroke.samples) {
        const hf = sample.heightFraction
        const a = paintingUToAngle(sample.u, bearing, front)
        const r = composedRadius(hf, a, profile)
        const bump = tongue(a, hf)
        nrm.set(Math.cos(a), 0.12, Math.sin(a)).normalize()
        const stickOut = 0.01 + Math.max(0, bump) * 0.02 * tipTaper

        points.push(
          new Vector3(
            swayX(hf) + Math.cos(a) * r + nrm.x * stickOut,
            hf * HEIGHT,
            swayZ(hf) + Math.sin(a) * r + nrm.z * stickOut,
          ),
        )
        normals.push(nrm.clone())

        // The skin's bytes are sRGB; Color's working space is LINEAR. Omitting the colour space
        // does not darken the tree — treating sRGB as linear makes midtones DISPLAY BRIGHTER after
        // output encoding (mid grey 0.502 comes back as 0.737). The near-black defect came from
        // the palette attenuation, not from this. Both are wrong; they are wrong differently.
        strokeCol.setRGB(sample.r, sample.g, sample.b, SRGBColorSpace)
        strokeCol.multiplyScalar(stroke.relief * (1 + MOON_LIFT * moonShade(nrm)))
        colors.push(strokeCol.clone())
      }

        if (points.length < 3) continue
        pushBrushRibbon(arr, points, normals, colors, 0.012, 0.45)
      }
    }
```

- [ ] **Step 5: Build, run, capture**

Run: `npm run build` — Expected: no TypeScript errors (this is the P0 check).
Run: `npm run dev`, open `http://localhost:5173/?mode=diorama&clean=1` — the cypress must not be a black silhouette.
Run: `npm run capture:diorama -- output/playwright/cypress-pass2-2026-07-21`

- [ ] **Step 6: Look at the crops**

Crop and zoom the cypress from the new capture, the `webp-2026-07-21` baseline, and `painting.jpg`. **Look at the images.** Judge the three named gaps: near-black, fur-vs-flame, bulbous.

- [ ] **Step 7: Commit**

```bash
git add src/scene/BrushCypress.tsx
git commit -m "feat(3d): the cypress wears the painting's own paint

Long ribbons from the shared integrator, coloured from cypress-skin through
SRGBColorSpace — ImageData bytes are sRGB while Color's working space is linear,
so the naive conversion would have made midtones display brighter. The near-black
defect was palette attenuation; that attenuation is gone and moonShade is a lift, not
the main value term; the SOLID keeps its own underpaint colours so gaps still
read as deep shadow rather than sky-void."
```

---

### Task 10: Source-anchored tendrils at the top

Mark's specification, 2026-07-21, implemented exactly. **Only after Task 8.**

**Constraints:**
- A **separate** multi-run extractor (`satelliteRuns`, Task 2) — the primary profile contract is untouched.
- Satellite runs **connected across adjacent rows into a few coherent vertical tracks**. Never seed each satellite row independently — that recreates the fur fringe.
- Each track **mapped deliberately to the left or right visible rim**, using the design-camera bearing.
- Concentrated in the **top third**, long tapered ribbons **extending beyond the solid**.
- **Sparse** — a handful of identifiable wisps, not continuous edge fuzz.

**Acceptance (Mark's words):** in the design and no-post views, the top third has several coherent, source-anchored tendrils interrupting the mesh outline. The edge must not read as a clean tube, uniform fringe, fur, detached ribbons, or a second tree. Both orbit boundaries remain structurally credible.

**Files:** Modify `src/scene/cypressStrokes.ts` (add `buildTendrilTracks`), `src/scene/BrushCypress.tsx`; test in `scripts/cypress-strokes.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
const TRACK_OPTS = {
  minRows: 8,
  maxTracks: 6,
  crop: { width: 100, height: 100 },
  rows: { width: 100, height: 100, spans: [[0, 0.4, 0.6], [1, 0.3, 0.7]] as [number, number, number][] },
}

test('buildTendrilTracks connects satellites into a few coherent vertical tracks', () => {
  const runs = []
  for (let y = 10; y < 40; y++) runs.push({ y, x0: 75, x1: 80 }) // right of the span
  for (let y = 15; y < 45; y++) runs.push({ y, x0: 18, x1: 23 }) // left of the span
  runs.push({ y: 80, x0: 40, x1: 43 }) // isolated speck — must be dropped
  const tracks = buildTendrilTracks(runs, TRACK_OPTS)
  assert.equal(tracks.length, 2, `expected 2 coherent tracks, got ${tracks.length}`)
  for (const t of tracks) assert.ok(t.points.length >= 8, 'a track must span many rows, not one')
})

test('track points are NORMALISED, and both rims get used', () => {
  // An earlier draft stored raw crop pixels as u/heightFraction, so every value exceeded 1 and
  // every track picked the same side — the top-third filter could then never match anything.
  const runs = []
  for (let y = 10; y < 40; y++) runs.push({ y, x0: 75, x1: 80 })
  for (let y = 15; y < 45; y++) runs.push({ y, x0: 18, x1: 23 })
  const tracks = buildTendrilTracks(runs, TRACK_OPTS)
  for (const t of tracks)
    for (const p of t.points) {
      assert.ok(p.heightFraction >= 0 && p.heightFraction <= 1, `heightFraction ${p.heightFraction} not normalised`)
      assert.ok(p.rimDistance >= 0, 'rimDistance must be an outward distance')
      assert.ok(p.rimDistance < 5, `rimDistance ${p.rimDistance} looks like raw pixels`)
    }
  assert.equal(new Set(tracks.map((t) => t.side)).size, 2, 'tracks either side must be assigned to different rims')
})

test('buildTendrilTracks stays sparse', () => {
  const runs = []
  for (let x = 0; x < 40; x++) for (let y = 10; y < 30; y++) runs.push({ y, x0: x * 3, x1: x * 3 + 2 })
  assert.ok(buildTendrilTracks(runs, TRACK_OPTS).length <= 6, 'sparse means capped')
})
```

- [ ] **Step 2: Implement `buildTendrilTracks` in `cypressStrokes.ts`**

```ts
export type TendrilPoint = {
  /** crop-normalised height, 0 at the base — the same space as StrokeSample.heightFraction */
  heightFraction: number
  /** which rim of the primary column this point sits beyond */
  side: 'left' | 'right'
  /** how far outside the primary rim, as a fraction of that row's half-width. Always >= 0. */
  rimDistance: number
}
export type TendrilTrack = { points: TendrilPoint[]; side: 'left' | 'right' }

/**
 * Connect satellite runs into a few coherent vertical tracks — the painting's detached fronds.
 *
 * Seeding every satellite row independently would recreate exactly the fur fringe this pass exists
 * to remove (Mark's constraint, 2026-07-21). Runs are chained only when they overlap the previous
 * row's run, a track must span `minRows`, and the longest `maxTracks` survive. Sparse on purpose:
 * a handful of identifiable wisps, not continuous edge fuzz.
 */
export function buildTendrilTracks(
  runs: { y: number; x0: number; x1: number }[],
  opts: { minRows: number; maxTracks: number; crop: { width: number; height: number }; rows: RowTable },
): TendrilTrack[] {
  const byRow = new Map<number, { x0: number; x1: number }[]>()
  for (const r of runs) {
    if (!byRow.has(r.y)) byRow.set(r.y, [])
    byRow.get(r.y)!.push({ x0: r.x0, x1: r.x1 })
  }
  const rows = [...byRow.keys()].sort((a, b) => a - b)
  const used = new Set<string>()
  const tracks: { y: number; x0: number; x1: number }[][] = []

  for (const y of rows) {
    for (const run of byRow.get(y)!) {
      const key = `${y}:${run.x0}`
      if (used.has(key)) continue
      used.add(key)
      const chain = [{ y, ...run }]
      let cur = run
      for (let ny = y + 1; byRow.has(ny); ny++) {
        const next = byRow.get(ny)!.find(
          (c) => !used.has(`${ny}:${c.x0}`) && Math.min(c.x1, cur.x1) >= Math.max(c.x0, cur.x0),
        )
        if (!next) break
        used.add(`${ny}:${next.x0}`)
        chain.push({ y: ny, ...next })
        cur = next
      }
      if (chain.length >= opts.minRows) tracks.push(chain)
    }
  }

  // Normalise into the SAME space the strokes use. An earlier draft stored raw crop pixels as if
  // they were u/heightFraction, so every u exceeded 1, every track chose the same side, and the
  // top-third filter could never match anything.
  return tracks
    .sort((a, b) => b.length - a.length)
    .slice(0, opts.maxTracks)
    .map((chain) => {
      const points: TendrilPoint[] = chain.map((c) => {
        const py = c.y / (opts.crop.height - 1)
        const cx = (c.x0 + c.x1) / 2 / (opts.crop.width - 1)
        const { left, right } = rowSpanAt(py, opts.rows)
        const halfWidth = Math.max(1e-6, (right - left) / 2)
        const side: 'left' | 'right' = cx < (left + right) / 2 ? 'left' : 'right'
        const rimDistance = Math.max(0, (side === 'left' ? left - cx : cx - right) / halfWidth)
        return { heightFraction: 1 - py, side, rimDistance }
      })
      // A track belongs to whichever rim most of its points sit beyond.
      const leftCount = points.filter((p) => p.side === 'left').length
      const side: 'left' | 'right' = leftCount * 2 >= points.length ? 'left' : 'right'
      return { points, side }
    })
}
```

- [ ] **Step 3: Wire into `BrushCypress.tsx`**

Bake the satellite runs into `cypress-rows.json` as **crop-local coordinates** (`y - by0`, `x0 - bx0`, `x1 - bx0`) using `satelliteRuns`. Add a non-zero-origin fixture proving the conversion. Only then add `buildTendrilTracks` and `rowSpanAt` imports to `cypressStrokes.ts`, and add `buildTendrilTracks` to the test import. In the cladding memo:

```ts
    const tracks = buildTendrilTracks(rowTable.satellites, {
      minRows: 24, maxTracks: 6, crop: { width: skinData.width, height: skinData.height }, rows: rowTable,
    }).filter((t) => t.points.reduce((a, p) => a + p.heightFraction, 0) / t.points.length > 0.66)

    for (const track of tracks) {
      // Rim angles follow the mapping's anchor: bearing-PI/2 is the u=1 rim, bearing+PI/2 is u=0.
      const rimAngle = track.side === 'right' ? bearing - Math.PI / 2 : bearing + Math.PI / 2
      const points: Vector3[] = []
      const normals: Vector3[] = []
      const colors: Color[] = []
      for (const p of track.points) {
        const hf = p.heightFraction
        const solidR = sampleR(hf)
        // ROOTED: a track starts ON the mesh and only then reaches outward, so it grows from the
        // tree rather than floating beside it. rimDistance is already relative to the row's half
        // width, so the overshoot scales with the tree instead of being a fixed world offset.
        const overshoot = Math.min(0.09, 0.04 + p.rimDistance * 0.05)
        const grow = Math.min(1, (hf - 0.66) / 0.12) // ease out of the mesh over the first rows
        const r = solidR + Math.max(0, grow) * overshoot
        nrm.set(Math.cos(rimAngle), 0.12, Math.sin(rimAngle)).normalize()
        points.push(new Vector3(swayX(hf) + Math.cos(rimAngle) * r, hf * HEIGHT, swayZ(hf) + Math.sin(rimAngle) * r))
        normals.push(nrm.clone())
        const uv = paintingUV(track.side === 'left' ? 0.04 : 0.96, hf, rowTable)
        const texel = sampleSkinAt(skinData, uv.px, uv.py)
        strokeCol.setRGB(texel.r / 255, texel.g / 255, texel.b / 255, SRGBColorSpace)
        colors.push(strokeCol.clone())
      }
      if (points.length >= 4) pushBrushRibbon(arr, points, normals, colors, 0.010, 0.15)
    }
```

**Every tendril must start on the mesh.** The `grow` ramp is what roots it; without it a track reads as a detached ribbon, which Mark's acceptance sentence explicitly rules out.

- [ ] **Step 4: Capture and judge against Mark's acceptance sentence**

Run the capture at design, `&debug=nopost`, and both orbit boundaries. Check each clause: several coherent source-anchored tendrils interrupting the outline in the top third; not a clean tube; not a uniform fringe; not fur; not detached; not a second tree; both orbit boundaries structurally credible.

- [ ] **Step 5: Commit**

```bash
git add src/scene/cypressStrokes.ts src/scene/BrushCypress.tsx scripts/derive-cypress.ts scripts/cypress-strokes.test.ts
git commit -m "feat(3d): sparse source-anchored tendrils at the cypress top

Satellite runs from the painting, connected across adjacent rows into a few
coherent vertical tracks and mapped to the visible rims by the design bearing.
Seeding satellite rows independently would have recreated the fur fringe this
pass exists to remove, so tracks must span many rows and only the longest few
survive. Top third only, long tapered ribbons reaching past the solid."
```

---

### Task 11: Measure performance for real, then record

**Correction from review:** the earlier gate was internally inconsistent — it set a 50% vertex-growth limit while defaulting to a configuration that grows vertices 83% and triangles 144%. And geometry counts do not demonstrate frame rate.

Nominal, before clipping: current 3,600 × 6 = **21,600 v / 14,400 t**. Proposed ribbons emit two vertices per sample and two triangles per segment: `(2,200 + round(2,200 × 0.45)) × 9 × 2` = **57,420 vertices**, and the same stroke count × 8 × 2 = **51,040 triangles**, before clipping and tendrils.

- [ ] **Step 1: Add a timing hook — `renderer` is not currently reachable from the console**

There is no way to measure this today, so add a dev-only probe. In `DioramaExperience.tsx`, inside the R3F tree:

```tsx
function PerfProbe() {
  const { gl } = useThree()
  useFrame(() => {
    const w = window as unknown as { __perf?: { t: number[]; info: unknown } }
    if (!w.__perf) w.__perf = { t: [], info: null }
    w.__perf.t.push(performance.now())
    if (w.__perf.t.length > 600) w.__perf.t.shift()
    w.__perf.info = { calls: gl.info.render.calls, triangles: gl.info.render.triangles }
  })
  return null
}
```

Mount it only when `?perf=1` is set. The probe is independent of debug mode, so it can measure the real final pipeline without changing presentation.

- [ ] **Step 2: Record real numbers, mean AND p95**

After a 10-second warm-up on `?mode=diorama&clean=1&debug=final&perf=1` (and record `debug=nopost&perf=1` separately as an isolation comparison):

```js
const t = window.__perf.t, d = t.slice(1).map((v, i) => v - t[i]).sort((a, b) => a - b)
JSON.stringify({
  mean: (d.reduce((a, b) => a + b, 0) / d.length).toFixed(2),
  p95: d[Math.floor(d.length * 0.95)].toFixed(2),
  ...window.__perf.info,
})
```

Record for **desktop** and a **representative mid-tier mobile device**. The locked criterion is 30 fps on mobile and headless cannot measure it, so this needs real hardware — likely Mark's.

- [ ] **Step 3: Derive the stroke budget from the measurement**

**Gate both mean and p95** — a good mean with a bad p95 is visible stutter, which is what a viewer actually notices. Desktop: mean ≤ 16.6 ms and p95 ≤ 20 ms. Mobile: mean ≤ 33 ms and p95 ≤ 40 ms. If either fails, reduce `STROKES` (and `BACK_DENSITY` first — the back is invented) and re-measure. **State the final numbers**; never assert the criterion is met.

- [ ] **Step 4: Verify displayed colour with registered, masked correspondence**

An arbitrary rendered crop against an arbitrary painting crop is not a ΔE test — the pixels do not correspond. Build the comparison properly:

1. Render a capture at the **design view**, where the mapping's front contract holds.
2. For each rendered pixel inside the cypress, recover its source texel through the same mapping the renderer used (`surfaceToPaintingU` → `paintingUV`), giving a **registered** pairing.
3. Mask to tree pixels in **both** images — background sky in either one must be excluded, or the statistic measures the sky.
4. Convert both to Lab and report **mean and p95 ΔE**. Locked tolerance: ΔE < 10 per region.

If exact registration proves impractical, fall back to comparing **regional colour distributions** (mean Lab and its spread over the masked tree region) and say plainly that is what was measured. **Do not report a per-pixel ΔE that was not computed per corresponding pixel.**

- [ ] **Step 5: Full check**

```bash
npm run test:sky && npm run lint && npm run build && npm run check:reduced
```
Expected: all pass. Record the test count printed by the actual runner; do not copy hand-maintained arithmetic.

- [ ] **Step 6: Record**

Append to `tasks/lessons.md`: whether fur→flame worked and what it cost; the Task 7 ablation ranking; how many retune passes the flat gate needed; the sRGB conversion trap; and what the row-domain fix taught about mapping a 3D form to a 2D source.

Update `tasks/todo.md`: move the cypress work into the record with evidence paths, add its gate row, and state plainly whether this pass is finished or wants another.

- [ ] **Step 7: Commit — and stop**

```bash
git add tasks/lessons.md tasks/todo.md
git commit -m "docs(tasks): record the cypress second pass"
```

**Do not push.** Present the three crops — painting, before, after — name what still looks wrong, and hand the gate to Mark. Push only if he asks.

---

## What the review changed

Mark's cross-review (2026-07-21). Every empirical claim was re-measured on the current repo before this rewrite; all were confirmed.

| Finding | Severity | Resolution |
|---|---|---|
| Task 6 would not compile — duplicate `STROKES`, `CORE`/`GREEN` still used by the solid, `PALETTE`/`pushBrush` orphaned | P0 | Task 9 edits constants in place and keeps named underpaint colours |
| Rectangular u-span is wrong — mask is 39.7% of its crop, 0% occupancy at the tip | P1 | Row-domain table (`cypress-rows.json`); `paintingUV` normalises within the row span |
| Mask leaks into foreground terrain (227,047 px, touches both limits) | P1 | Width-guarded row-run connectivity replaces flood fill |
| Tensor computed across sky | P1 | `orientationField` takes a mask; off-mask coherence forced to 0 |
| Skin fill was a left-carry, not nearest | P1 | Genuine nearest-valid-on-row, both directions; validity kept in alpha |
| `setRGB` treats sRGB bytes as linear | P1 | `SRGBColorSpace` everywhere; ΔE checked on **displayed** colour |
| *(round 2)* my explanation of that was backwards | — | Treating sRGB as linear makes midtones display **brighter** (0.502 → 0.737), not darker. The near-black defect came from attenuation. Comments and commit messages corrected. |
| Ribbon faded to 74% along its length | P1 | Ribbon emits colour unchanged; relief is a per-stroke constant from the caller |
| Bulb diagnosis reached neither branch (0.137–0.169) | P1 | Four-factor ablation scored against the painting's row-wise silhouette |
| Mapping assumed +Z; real bearing ≈64.6° | P1 | `cypressViewBearing` from `dioramaContract`; tested at design, mobile, both orbit bearings |
| Flat gate drew ticks, not strokes | P1 | Shared integrator + `flat-cypress-gate.ts`; ribbon gains a curved-tube winding test |
| Perf gate self-contradictory and not a perf measurement | P1 | Real frame timing, draw calls, triangles; budget derived from measurement |
| Unconditional push | P2 | Removed; plan stops at local commits and Mark's gate |
| Fronds had no mechanism | — | Task 10, to Mark's constraints and acceptance sentence |

### Round 2 (2026-07-21, same day)

Three P0s and two P1s, all re-measured and all confirmed. Two of them would have shipped a
cypress shaped like the foreground terrain.

| Finding | Severity | Resolution |
|---|---|---|
| Mask seeds from the globally widest run — which is the full-width terrain, so the width guard can never fire (measured: 80 px terrain vs 27 px trunk) | P0 | Seed by **vertical coherence** — the run chaining through the most rows — with a **local row-to-row** growth guard that catches the trunk→terrain jump |
| Mapping tests contradict the formula: it returns u=1 at `bearing−π/2`, the test expected 0 | P0 | Implementation is screen-correct; test expectations reversed and anchored, Task 10's rim assignment follows the same anchor, and the left/right is confirmed by eye at the flat gate |
| Tendril tracks store raw pixel x/y as normalised u/heightFraction — every u > 1, every track picks the same side, top-third filter matches nothing | P0 | Tracks bake normalised height, side, and signed `rimDistance`; each track is **rooted on the mesh** by a `grow` ramp before it overshoots |
| Integrator advances normalised u/hf with a pixel-space flow vector — mixes units, reintroduces the row-width warp it claims to avoid | P1 | State kept in **crop pixels**; `normalisedFromCrop` derives u/hf per emitted sample. Tapered-row and non-square-crop tests added |
| Profile diagnostic compares cumulative recipes, averages `tongue()` around the circumference, duplicates the runtime formulas | P1 | One shared `cypressProfile.ts` used by runtime and diagnostic; **leave-one-factor-out** against a composed baseline, scored on the **design-camera projected outline** |
| Tensor not genuinely mask-aware — boundary gradients read sky, low-pass averages off-mask orientations back in | — | Mask-safe gradients (off-mask neighbour → centre) and **normalised convolution** (`maskedBlur`) for every blur, including the low-pass |
| Flat gate drew fixed square dots | — | Renders **tapered quads through the display-colour path**; the gate's claims are narrowed in writing to what it actually covers |
| Relief 0.78–1.20 too aggressive to start (38% below 0.94) | — | Default 0.94–1.06 via `reliefSpread`, plus a `relief = 1` ablation test |
| `pow(rng, 0.78)` was described with the wrong coordinate assumption | — | Height zero is the base, so `pow(rng, 1.4)` correctly biases low; the test asserts >55% seed below mid-height |
| Front/back assignment was an arbitrary u/relief heuristic | — | **Complete front pass** + explicit mirrored, sparser back pass (`BACK_DENSITY`), both in the geometry budget |
| Task 11 had no timing hook and `renderer` is not exposed | — | Dev-only `PerfProbe`; **mean and p95 both gated** |
| ΔE compared arbitrary crops | — | Registered, tree-masked correspondence through the same mapping; explicit fallback to distribution comparison, honestly labelled |
| `cypress-rows.json` would infer as `number[][]` | — | Asserted once to `RowTable` at the import |

### Round 3 (2026-07-22, pre-implementation executable audit)

| Finding | Severity | Resolution |
|---|---|---|
| A terrain seed can narrow into the trunk and beat the trunk chain; global `tried` then suppresses the correct candidate | P0 | Symmetric local width ratio; evaluate every seed |
| The revised seed formula is still inverted for a base-at-zero height fraction | P0 | `Math.pow(rng(), 1.4)`, pinned by distribution test |
| Direct Node tests cannot resolve extensionless source imports; `normalisedFromCrop` is called but absent | P0 | Explicit `.ts` imports and complete import lists |
| Shared profile maths still has duplicated baseline configuration and no registered public test | P1 | Shared constants/constructor, runtime and diagnostic consume them, profile test registered |
| Satellites are painting-global while rows are crop-local; zero-origin tests hide it | P0 | Crop-local bake and non-zero-origin test |
| Nominal ribbon budget omitted the 45% back pass and doubled geometry incorrectly | P1 | Correct 57,420 v / 51,040 t nominal budget; measure final pipeline via independent `perf=1` probe |

**Partial dissent, recorded honestly.** On the ribbon darkening I do not accept that per-stroke relief contradicts the design's "drop the darkening" — the design rejected *global palette attenuation* (×0.68 on every stroke, which made the tree black), while relief between neighbouring strokes is existing house technique (`pushBrush` line ~89) and without it cladding reads as one flat sheet. The review's underlying point stands and is implemented: a *fade along a long stroke* is a vignette that biases stroke ends dark, so relief moved to a per-stroke constant and the residual is verified by the displayed-colour ΔE check rather than asserted.

## Self-Review

**Spec coverage:** flow asset (2, 3) · skin asset + `WEBP_ASSETS` (2, 3) · new dependency-free bake (3) · long strokes (1, 5, 9) · colour sampled along stroke length (5, 9) · darkening dropped (9) · silhouette by strokes not mesh (7, 8, 10) · front maps painting / back continues (4) · flat review before 3D (6) · 3D captures vs baseline (9) · sign alignment (2) · containment (5) · fronds (10) · performance measured (11) · retune cap (3, 6, 8).

**Type consistency:** `pushBrushRibbon` (1) → used in 9, 10. `RowTable` (4) → used in 5, 9. `StrokeSample`/`CypressStroke`/`generateCypressStrokes` (5) → used in 6, 9. `cypressMask`/`satelliteRuns`/`orientationField`/`lowPassOrientation`/`blendToVertical`/`signedUpDirection` (2) → used in 3, 7, 10. `cypressViewBearing`/`paintingUToAngle`/`paintingUV` (4) → used in 5, 6, 9, 10. `Box` (2) → used in 3, 7. `TendrilTrack`/`buildTendrilTracks` (10) self-contained.

**Placeholder scan:** three deliberate measure-then-decide points — Task 8's fix follows Task 7's ranking, Task 9's hemisphere assignment and Task 11's budget follow measurement. Each names exactly how the value is obtained, so they are measured values rather than vague instructions. Task 10 Step 3 describes wiring rather than showing full code, because its shape depends on the satellite data Task 3 bakes; the constraints and acceptance criteria are fully specified.
