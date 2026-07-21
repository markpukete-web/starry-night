# Cypress Second Pass — Source-Locked Cladding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the cypress's surface so it reads as Van Gogh's flame — long strokes following the painting's own orientation field, coloured from the painting's own pixels — instead of near-black procedural fur.

**Architecture:** A new offline bake (`scripts/derive-cypress.ts`) derives two committed assets from the scan: a low-passed orientation field and a colour skin of the cypress's real pixels. A new pure mapping module (`src/scene/cypressMapping.ts`) maps the 3D form's surface to painting space. `BrushCypress.tsx` then clads the existing solid with long strokes integrated along the field and coloured from the skin. The form itself stays a closed 3D solid — that is locked by the diorama contract.

**Tech Stack:** TypeScript, three.js, React Three Fiber. Offline scripts are dependency-free: Node `zlib` PNG IO via `scripts/lib/png.ts`, macOS `sips` for JPEG decode, plain arithmetic. Tests are `node --test`.

**Spec:** `docs/superpowers/specs/2026-07-21-cypress-second-pass-design.md`

## Global Constraints

- **British English** throughout, in code comments, docs and commit messages.
- **Conventional commits.** The log reads as a build-in-public timeline.
- **No new dependencies.** Offline scripts stay dependency-free; `cwebp`/`dwebp` are already approved as bake-only tools. Anything else: stop and ask Mark.
- **Asset formats are not a free choice** (rule set 2026-07-21): signed/flow data ships **PNG**; colour data ships **lossless WebP** via `WEBP_ASSETS` in `scripts/slim-reference.ts`. The bake writes PNG; `npm run slim-reference` prepares the shipped set.
- **Locked acceptance criteria:** colours derived from the painting (ΔE < 10 per region); head-on the diorama reads as *Starry Night*; 60 fps desktop / 30 fps mid-tier mobile; `prefers-reduced-motion` still state unaffected.
- **Retune cap: 4 passes per slice.** If the flat review still fails after four, stop and bring it to Mark.
- **Do not touch:** village, hills, island, sky assets, camera contract.
- **Instrument rules** (`tasks/lessons.md`): a capture diff means nothing without a same-assets control run; capture RMSE cannot measure anything that alters load timing — compare decoded pixels instead.

## File Structure

| File | Responsibility | Status |
|---|---|---|
| `src/scene/brushForms.ts` | Brush primitives. Gains `pushBrushRibbon` for multi-segment curved strokes. | Modify |
| `scripts/brush-forms.test.ts` | Tests for the above. | Modify |
| `scripts/lib/cypress-field.ts` | Pure functions: cypress mask, structure tensor, low-pass, confidence blend, sign alignment. No IO. | Create |
| `scripts/cypress-field.test.ts` | Unit tests for the above on synthetic images. | Create |
| `scripts/derive-cypress.ts` | The bake: reads the scan, writes `cypress-flow.png` + `cypress-skin.png` + flat review crops. | Create |
| `scripts/slim-reference.ts` | Add `cypress-skin` to `WEBP_ASSETS`. | Modify |
| `package.json` | Add `derive-cypress` script; add new tests to `test:sky`. | Modify |
| `src/scene/cypressMapping.ts` | Pure mapping: form surface (angle, height) ↔ painting UV, and back again. | Create |
| `scripts/cypress-mapping.test.ts` | Unit tests for the mapping. | Create |
| `src/scene/BrushCypress.tsx` | Uses the new assets and mapping to clad the solid with long strokes. | Modify |
| `tasks/lessons.md`, `tasks/todo.md` | Record. | Modify |

**Note on an existing pattern:** `skyMapping.ts`, `frontCanopyMapping.ts` and `dioramaSkyProjection.ts` are all pure mapping modules with their own tests. `cypressMapping.ts` follows that established shape deliberately.

---

### Task 1: `pushBrushRibbon` — a curved multi-segment stroke primitive

`pushBrush` emits one straight 6-vertex mark. A stroke that follows a flow field must bend, so it needs a ribbon built from a polyline. This is the fur→flame primitive; nothing else in the plan works without it.

**Files:**
- Modify: `src/scene/brushForms.ts` (append after `pushBrush`, which ends at line 94)
- Test: `scripts/brush-forms.test.ts`

**Interfaces:**
- Consumes: `BrushArrays`, `makeBrushArrays` (existing, unchanged)
- Produces: `pushBrushRibbon(arr: BrushArrays, points: Vector3[], normals: Vector3[], colors: Color[], halfWid: number, taper?: number): void` — used by Task 6.

- [ ] **Step 1: Write the failing test**

Append to `scripts/brush-forms.test.ts`:

```ts
test('pushBrushRibbon builds a quad strip along the polyline', () => {
  const arr = makeBrushArrays()
  const points = [new Vector3(0, 0, 0), new Vector3(0, 1, 0), new Vector3(0, 2, 0)]
  const normals = [new Vector3(0, 0, 1), new Vector3(0, 0, 1), new Vector3(0, 0, 1)]
  const colors = [new Color(1, 0, 0), new Color(0, 1, 0), new Color(0, 0, 1)]
  pushBrushRibbon(arr, points, normals, colors, 0.1)
  // one pair of vertices per point; two triangles per segment
  assert.equal(arr.positions.length / 3, points.length * 2)
  assert.equal(arr.indices.length, (points.length - 1) * 6)
  // the ribbon spreads across the bitangent (normal x tangent = +x here), not along the normal
  const xs = []
  for (let i = 0; i < arr.positions.length; i += 3) xs.push(arr.positions[i])
  assert.ok(Math.max(...xs) > 0.05, 'ribbon must have width in x')
  assert.ok(Math.min(...xs) < -0.05, 'ribbon must straddle the centre line')
})

test('pushBrushRibbon ignores degenerate input', () => {
  const arr = makeBrushArrays()
  pushBrushRibbon(arr, [new Vector3(0, 0, 0)], [new Vector3(0, 0, 1)], [new Color(1, 1, 1)], 0.1)
  assert.equal(arr.positions.length, 0, 'a single point is not a ribbon')
  const dup = [new Vector3(1, 1, 1), new Vector3(1, 1, 1)]
  pushBrushRibbon(arr, dup, [new Vector3(0, 0, 1), new Vector3(0, 0, 1)], [new Color(1, 1, 1), new Color(1, 1, 1)], 0.1)
  assert.equal(arr.positions.length, 0, 'zero-length segments produce no geometry')
})

test('pushBrushRibbon tapers width toward the far end', () => {
  const arr = makeBrushArrays()
  const points = [new Vector3(0, 0, 0), new Vector3(0, 1, 0), new Vector3(0, 2, 0)]
  const normals = [new Vector3(0, 0, 1), new Vector3(0, 0, 1), new Vector3(0, 0, 1)]
  const colors = [new Color(1, 1, 1), new Color(1, 1, 1), new Color(1, 1, 1)]
  pushBrushRibbon(arr, points, normals, colors, 0.1, 0.3)
  const first = Math.abs(arr.positions[0])
  const last = Math.abs(arr.positions[arr.positions.length - 3])
  assert.ok(last < first * 0.5, `far end must be narrower: ${last} vs ${first}`)
})
```

Add `pushBrushRibbon` to the import at the top of the file, and `Color`/`Vector3` from `three` if not already imported.

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test scripts/brush-forms.test.ts`
Expected: FAIL — `pushBrushRibbon is not a function` (or an import error).

- [ ] **Step 3: Implement `pushBrushRibbon`**

Append to `src/scene/brushForms.ts`:

```ts
const _rTan = new Vector3()
const _rNrm = new Vector3()
const _rBit = new Vector3()
const _rA = new Vector3()
const _rB = new Vector3()

/**
 * A curved brushstroke: a quad strip swept along `points`, one vertex pair per point, spread
 * across the surface bitangent so the ribbon lies ON the form rather than cutting into it.
 *
 * `pushBrush` (a single straight mark) cannot follow a flow field — a long stroke has to bend, and
 * a bent stroke is what separates Van Gogh's licking flame from fur. `taper` is the width
 * multiplier at the far end (1 = parallel sides).
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

  // Reject the whole ribbon if it has no length: a zero-length polyline has no tangent to sweep.
  let span = 0
  for (let i = 1; i < points.length; i++) span += points[i].distanceTo(points[i - 1])
  if (span < 1e-5) return

  const base = arr.positions.length / 3
  const tip = new Color()
  for (let i = 0; i < points.length; i++) {
    // tangent from the neighbouring points (central difference in the interior)
    const prev = points[Math.max(0, i - 1)]
    const next = points[Math.min(points.length - 1, i + 1)]
    _rTan.subVectors(next, prev)
    if (_rTan.lengthSq() < 1e-10) _rTan.set(0, 1, 0)
    _rTan.normalize()

    _rNrm.copy(normals[Math.min(i, normals.length - 1)]).normalize()
    _rBit.crossVectors(_rNrm, _rTan)
    if (_rBit.lengthSq() < 1e-10) _rBit.set(1, 0, 0)
    _rBit.normalize()

    const t = i / (points.length - 1)
    const w = halfWid * (1 + (taper - 1) * t)
    _rA.copy(points[i]).addScaledVector(_rBit, w)
    _rB.copy(points[i]).addScaledVector(_rBit, -w)
    arr.positions.push(_rA.x, _rA.y, _rA.z, _rB.x, _rB.y, _rB.z)

    // Darken along the stroke, as pushBrush does across it: neighbouring strokes then read as
    // separate ridges of paint rather than one flat sheet.
    tip.copy(colors[Math.min(i, colors.length - 1)]).multiplyScalar(1 - 0.26 * t)
    arr.colors.push(tip.r, tip.g, tip.b, tip.r, tip.g, tip.b)
  }

  for (let i = 0; i < points.length - 1; i++) {
    const a = base + i * 2
    arr.indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test scripts/brush-forms.test.ts`
Expected: PASS, all tests.

- [ ] **Step 5: Commit**

```bash
git add src/scene/brushForms.ts scripts/brush-forms.test.ts
git commit -m "feat(brush): pushBrushRibbon — a stroke that can bend

pushBrush emits one straight mark, which cannot follow a flow field. A long
stroke has to bend, and a bent stroke is what separates Van Gogh's licking
flame from fur. Quad strip swept along a polyline, spread across the surface
bitangent so it lies on the form."
```

---

### Task 2: `cypress-field.ts` — the derivation maths, as pure functions

All the risky maths, isolated from IO so it can be tested on synthetic images where the right answer is known. The spec's measurement (coherence 0.134, 47% of texels within 75–105°) is why the low-pass and the confidence blend exist — without them, integrated strokes wander.

**Files:**
- Create: `scripts/lib/cypress-field.ts`
- Test: `scripts/cypress-field.test.ts`

**Interfaces:**
- Consumes: `DecodedPNG` from `scripts/lib/png.ts`; `treeishColour` from `scripts/lib/fill-region.ts`
- Produces, all used by Task 3:
  - `type Grid = { width: number; height: number; data: Float64Array }`
  - `cypressMask(painting: DecodedPNG, box: Box): Uint8Array` — 1 = cypress, 0 = not, painting-resolution, largest connected component only
  - `type Box = { x0: number; y0: number; x1: number; y1: number }`
  - `orientationField(lum: Grid, sigma: number): { cos2: Float64Array; sin2: Float64Array; coherence: Float64Array }`
  - `lowPassOrientation(cos2: Float64Array, sin2: Float64Array, w: number, h: number, sigma: number): { cos2: Float64Array; sin2: Float64Array }`
  - `blendToVertical(cos2: Float64Array, sin2: Float64Array, coherence: Float64Array): { cos2: Float64Array; sin2: Float64Array }`
  - `signedUpDirection(cos2: number, sin2: number): { dx: number; dy: number }`

- [ ] **Step 1: Write the failing tests**

Create `scripts/cypress-field.test.ts`:

```ts
/**
 * Tests for the cypress derivation maths. Synthetic images with a known answer — the same
 * discipline as inpaint.test.ts. The invariants that matter: vertical paint yields a vertical
 * field, low-confidence areas fall back to vertical rather than to noise, the low-pass averages
 * ORIENTATIONS (not angles, which wrap), and stroke direction always points up the form.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  blendToVertical,
  cypressMask,
  lowPassOrientation,
  orientationField,
  signedUpDirection,
  type Grid,
} from './lib/cypress-field.ts';
import type { DecodedPNG } from './lib/png.ts';

const W = 64;
const H = 64;

function grid(fn: (x: number, y: number) => number): Grid {
  const data = new Float64Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) data[y * W + x] = fn(x, y);
  return { width: W, height: H, data };
}

function png(fn: (x: number, y: number) => [number, number, number]): DecodedPNG {
  const rgba = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const [r, g, b] = fn(x, y);
      const i = (y * W + x) * 4;
      rgba[i] = r; rgba[i + 1] = g; rgba[i + 2] = b; rgba[i + 3] = 255;
    }
  }
  return { width: W, height: H, rgba };
}

/** Angle in degrees of a double-angle pair, folded to [0,180). */
function angleOf(cos2: number, sin2: number): number {
  let a = (0.5 * Math.atan2(sin2, cos2) * 180) / Math.PI;
  while (a < 0) a += 180;
  return a % 180;
}

test('orientationField reads vertical stripes as a vertical orientation', () => {
  // vertical stripes: intensity varies along x, so the gradient is horizontal and the
  // STRUCTURE (the stripe direction) is vertical — 90 degrees
  const lum = grid((x) => (x % 8 < 4 ? 20 : 200));
  const { cos2, sin2, coherence } = orientationField(lum, 3);
  const i = 32 * W + 32;
  assert.ok(Math.abs(angleOf(cos2[i], sin2[i]) - 90) < 8, `expected ~90°, got ${angleOf(cos2[i], sin2[i])}`);
  assert.ok(coherence[i] > 0.5, `strong stripes must be coherent, got ${coherence[i]}`);
});

test('orientationField reports low coherence on flat paint', () => {
  const lum = grid(() => 100);
  const { coherence } = orientationField(lum, 3);
  assert.ok(coherence[32 * W + 32] < 0.1, 'a flat patch has no orientation');
});

test('lowPassOrientation averages orientations across the wrap point', () => {
  // 179° and 1° are 2° apart as ORIENTATIONS. Averaging the angles gives 90° (wrong);
  // averaging the double-angle encoding gives ~0°/180° (right). This is the whole reason
  // the field is stored double-angle.
  const cos2 = new Float64Array(W * H);
  const sin2 = new Float64Array(W * H);
  for (let i = 0; i < W * H; i++) {
    const deg = i % 2 === 0 ? 179 : 1;
    const t = (2 * deg * Math.PI) / 180;
    cos2[i] = Math.cos(t);
    sin2[i] = Math.sin(t);
  }
  const out = lowPassOrientation(cos2, sin2, W, H, 2);
  const a = angleOf(out.cos2[32 * W + 32], out.sin2[32 * W + 32]);
  const distanceTo0 = Math.min(a, 180 - a);
  assert.ok(distanceTo0 < 10, `expected ~0/180, got ${a}`);
});

test('blendToVertical leaves confident texels alone and rescues weak ones', () => {
  const cos2 = new Float64Array(2);
  const sin2 = new Float64Array(2);
  const coh = new Float64Array(2);
  // texel 0: confident horizontal (0°) → double angle (1, 0)
  cos2[0] = 1; sin2[0] = 0; coh[0] = 1;
  // texel 1: the same horizontal reading, but no confidence at all
  cos2[1] = 1; sin2[1] = 0; coh[1] = 0;
  const out = blendToVertical(cos2, sin2, coh);
  assert.ok(Math.abs(angleOf(out.cos2[0], out.sin2[0])) < 5, 'confident texel keeps its orientation');
  assert.ok(Math.abs(angleOf(out.cos2[1], out.sin2[1]) - 90) < 5, 'unconfident texel falls back to vertical');
});

test('signedUpDirection always points up the form', () => {
  // image space: +y is DOWN, so "up the tree" is dy < 0. Orientation is undirected, so the
  // sign has to be chosen — the 2026-07-16 destination-sign-alignment rule.
  for (const deg of [90, 80, 100, 45, 135]) {
    const t = (2 * deg * Math.PI) / 180;
    const { dx, dy } = signedUpDirection(Math.cos(t), Math.sin(t));
    assert.ok(dy <= 0, `orientation ${deg}° must resolve upward, got dy=${dy}`);
    assert.ok(Math.abs(Math.hypot(dx, dy) - 1) < 1e-9, 'direction must be unit length');
  }
});

test('cypressMask keeps the connected trunk and drops detached dark blobs', () => {
  // a dark green column down the middle, plus a detached dark blob in the corner
  const painting = png((x, y) => {
    const inTrunk = x > 24 && x < 40;
    const inBlob = x < 8 && y < 8;
    if (inTrunk || inBlob) return [40, 46, 30]; // warm dark olive → treeish
    return [70, 90, 180]; // sky blue
  });
  const mask = cypressMask(painting, { x0: 0, y0: 0, x1: W, y1: H });
  assert.equal(mask[32 * W + 32], 1, 'trunk is cypress');
  assert.equal(mask[2 * W + 2], 0, 'detached blob is not part of the cypress');
  assert.equal(mask[32 * W + 5], 0, 'sky is not cypress');
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test scripts/cypress-field.test.ts`
Expected: FAIL — cannot find module `./lib/cypress-field.ts`.

- [ ] **Step 3: Implement `scripts/lib/cypress-field.ts`**

```ts
/**
 * The cypress derivation maths, isolated from IO so it can be tested against synthetic images
 * with a known answer (scripts/cypress-field.test.ts).
 *
 * Shaped by a measurement, not a hunch. Structure-tensor statistics over the cypress's own pixels
 * give mean coherence 0.134 against the sky's 0.327, but 47% of texels fall within 75–105°. So:
 * the tree has a strong VERTICAL character but weak per-pixel confidence. Long strokes integrated
 * through the raw field would wander into spaghetti, hence lowPassOrientation; and where
 * confidence is lowest the field must fall back to something principled, hence blendToVertical.
 */

import { treeishColour } from './fill-region.ts';
import type { DecodedPNG } from './png.ts';

export type Grid = { width: number; height: number; data: Float64Array };
export type Box = { x0: number; y0: number; x1: number; y1: number };

/** Double-angle encoding of vertical (90°): cos(180°) = -1, sin(180°) = 0. */
const VERTICAL_COS2 = -1;
const VERTICAL_SIN2 = 0;

export function gaussianBlur(src: Float64Array, w: number, h: number, sigma: number): Float64Array {
  const r = Math.max(1, Math.ceil(sigma * 3));
  const k = new Float64Array(2 * r + 1);
  let sum = 0;
  for (let i = -r; i <= r; i++) {
    const v = Math.exp(-(i * i) / (2 * sigma * sigma));
    k[i + r] = v;
    sum += v;
  }
  for (let i = 0; i < k.length; i++) k[i] /= sum;

  const tmp = new Float64Array(w * h);
  const out = new Float64Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let i = -r; i <= r; i++) {
        const sx = Math.min(w - 1, Math.max(0, x + i));
        acc += src[y * w + sx] * k[i + r];
      }
      tmp[y * w + x] = acc;
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let i = -r; i <= r; i++) {
        const sy = Math.min(h - 1, Math.max(0, y + i));
        acc += tmp[sy * w + x] * k[i + r];
      }
      out[y * w + x] = acc;
    }
  }
  return out;
}

/**
 * Structure-tensor orientation. Returns the double-angle encoding (cos2θ, sin2θ) of the direction
 * paint RUNS IN (perpendicular to the gradient), plus a coherence in [0,1] gated by gradient
 * energy — a strong orientation ratio in a near-flat patch is noise, not structure.
 */
export function orientationField(
  lum: Grid,
  sigma: number,
): { cos2: Float64Array; sin2: Float64Array; coherence: Float64Array } {
  const { width: w, height: h, data } = lum;
  const gx = new Float64Array(w * h);
  const gy = new Float64Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const xm = Math.max(0, x - 1);
      const xp = Math.min(w - 1, x + 1);
      const ym = Math.max(0, y - 1);
      const yp = Math.min(h - 1, y + 1);
      gx[y * w + x] = (data[y * w + xp] - data[y * w + xm]) * 0.5;
      gy[y * w + x] = (data[yp * w + x] - data[ym * w + x]) * 0.5;
    }
  }

  const Jxx = new Float64Array(w * h);
  const Jxy = new Float64Array(w * h);
  const Jyy = new Float64Array(w * h);
  for (let i = 0; i < w * h; i++) {
    Jxx[i] = gx[i] * gx[i];
    Jxy[i] = gx[i] * gy[i];
    Jyy[i] = gy[i] * gy[i];
  }
  const Sxx = gaussianBlur(Jxx, w, h, sigma);
  const Sxy = gaussianBlur(Jxy, w, h, sigma);
  const Syy = gaussianBlur(Jyy, w, h, sigma);

  const cos2 = new Float64Array(w * h);
  const sin2 = new Float64Array(w * h);
  const coherence = new Float64Array(w * h);
  let maxEnergy = 1e-12;
  for (let i = 0; i < w * h; i++) maxEnergy = Math.max(maxEnergy, Sxx[i] + Syy[i]);

  for (let i = 0; i < w * h; i++) {
    const diff = Sxx[i] - Syy[i];
    const off = 2 * Sxy[i];
    // The GRADIENT's dominant double-angle is (diff, off); paint runs perpendicular to it, and
    // rotating by 90° negates the double-angle encoding.
    const mag = Math.hypot(diff, off);
    cos2[i] = mag > 1e-12 ? -diff / mag : VERTICAL_COS2;
    sin2[i] = mag > 1e-12 ? -off / mag : VERTICAL_SIN2;

    const trace = Sxx[i] + Syy[i];
    const ratio = trace > 1e-12 ? mag / trace : 0;
    const energy = Math.min(1, trace / (0.15 * maxEnergy));
    coherence[i] = ratio * energy;
  }
  return { cos2, sin2, coherence };
}

/**
 * Low-pass the field in DOUBLE-ANGLE space. Averaging angles is wrong — 179° and 1° average to
 * 90°, the perpendicular of the truth — while averaging (cos2θ, sin2θ) is the correct way to
 * average orientations. This is the whole reason the encoding exists.
 */
export function lowPassOrientation(
  cos2: Float64Array,
  sin2: Float64Array,
  w: number,
  h: number,
  sigma: number,
): { cos2: Float64Array; sin2: Float64Array } {
  const c = gaussianBlur(cos2, w, h, sigma);
  const s = gaussianBlur(sin2, w, h, sigma);
  for (let i = 0; i < c.length; i++) {
    const m = Math.hypot(c[i], s[i]);
    if (m > 1e-12) {
      c[i] /= m;
      s[i] /= m;
    } else {
      c[i] = VERTICAL_COS2;
      s[i] = VERTICAL_SIN2;
    }
  }
  return { cos2: c, sin2: s };
}

/**
 * Where the painting is not confident about orientation, fall back to the tree's measured global
 * character (vertical) rather than to whatever noise the tensor produced. Weight is 1 - coherence,
 * so confident paint is left exactly as it is.
 */
export function blendToVertical(
  cos2: Float64Array,
  sin2: Float64Array,
  coherence: Float64Array,
): { cos2: Float64Array; sin2: Float64Array } {
  const c = new Float64Array(cos2.length);
  const s = new Float64Array(sin2.length);
  for (let i = 0; i < cos2.length; i++) {
    const k = Math.min(1, Math.max(0, coherence[i]));
    let cc = cos2[i] * k + VERTICAL_COS2 * (1 - k);
    let ss = sin2[i] * k + VERTICAL_SIN2 * (1 - k);
    const m = Math.hypot(cc, ss);
    if (m > 1e-12) {
      cc /= m;
      ss /= m;
    } else {
      cc = VERTICAL_COS2;
      ss = VERTICAL_SIN2;
    }
    c[i] = cc;
    s[i] = ss;
  }
  return { cos2: c, sin2: s };
}

/**
 * Resolve an undirected orientation into a direction that points UP the form. Image space has +y
 * pointing down, so "up" is dy <= 0. Without this the integrator would walk half its strokes
 * downward — the same class of bug as the 2026-07-16 sign-flipped donated sky flow.
 */
export function signedUpDirection(cos2: number, sin2: number): { dx: number; dy: number } {
  const theta = 0.5 * Math.atan2(sin2, cos2);
  let dx = Math.cos(theta);
  let dy = Math.sin(theta);
  if (dy > 0) {
    dx = -dx;
    dy = -dy;
  }
  return { dx, dy };
}

/**
 * Which painting texels are the cypress. Uses the treeishColour gate already proven on this exact
 * material by the inpaint work — inventing a second colour heuristic for the same object would
 * only be a new way to be wrong. Keeps the largest connected component, so shadowed hills and
 * bushes never join the silhouette (the same connectivity discipline as extractCypressSlices).
 */
export function cypressMask(painting: DecodedPNG, box: Box): Uint8Array {
  const { width: w, height: h, rgba } = painting;
  const raw = new Uint8Array(w * h);
  for (let y = box.y0; y < box.y1; y++) {
    for (let x = box.x0; x < box.x1; x++) {
      const i = (y * w + x) * 4;
      if (treeishColour(rgba[i] / 255, rgba[i + 1] / 255, rgba[i + 2] / 255)) raw[y * w + x] = 1;
    }
  }

  // largest 4-connected component, iterative flood fill (the tree is one column)
  const seen = new Uint8Array(w * h);
  const out = new Uint8Array(w * h);
  let best: number[] = [];
  const stack: number[] = [];
  for (let start = 0; start < w * h; start++) {
    if (!raw[start] || seen[start]) continue;
    const component: number[] = [];
    stack.length = 0;
    stack.push(start);
    seen[start] = 1;
    while (stack.length) {
      const p = stack.pop() as number;
      component.push(p);
      const x = p % w;
      const y = (p - x) / w;
      if (x > 0 && raw[p - 1] && !seen[p - 1]) { seen[p - 1] = 1; stack.push(p - 1); }
      if (x < w - 1 && raw[p + 1] && !seen[p + 1]) { seen[p + 1] = 1; stack.push(p + 1); }
      if (y > 0 && raw[p - w] && !seen[p - w]) { seen[p - w] = 1; stack.push(p - w); }
      if (y < h - 1 && raw[p + w] && !seen[p + w]) { seen[p + w] = 1; stack.push(p + w); }
    }
    if (component.length > best.length) best = component;
  }
  for (const p of best) out[p] = 1;
  return out;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test scripts/cypress-field.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/cypress-field.ts scripts/cypress-field.test.ts
git commit -m "feat(pipeline): cypress derivation maths, isolated and tested

Structure tensor, orientation low-pass, confidence blend and sign alignment as
pure functions over synthetic images. Shaped by measurement: the cypress's own
pixels give coherence 0.134 against the sky's 0.327 but 47% of texels within
75-105 degrees, so the field is low-passed before anything integrates along it
and falls back to the measured global vertical where confidence is weakest."
```

---

### Task 3: `derive-cypress.ts` — the bake

Turns the maths into two committed assets plus flat review crops. **The flat crops are the point:** the spec requires the strokes to be judged flat, against the painting, before anything enters 3D.

**Files:**
- Create: `scripts/derive-cypress.ts`
- Modify: `package.json` (add `derive-cypress`; extend `test:sky`)
- Modify: `scripts/slim-reference.ts` (add `cypress-skin` to `WEBP_ASSETS`)

**Interfaces:**
- Consumes: everything exported by `scripts/lib/cypress-field.ts`; `decodePNG`/`encodePNG` from `scripts/lib/png.ts`
- Produces (used by Task 6):
  - `public/reference/cypress-flow.png` — R = dx mapped `[-1,1]→[0,255]`, G = dy mapped the same, B = coherence `[0,1]→[0,255]`. Cropped to the cypress bounding box.
  - `public/reference/cypress-skin.png` → shipped as `.webp`. RGB = painting colour; non-cypress texels filled with the nearest cypress colour on the same row so sampling never returns sky.
  - `reference/derived/cypress-field-overlay.png`, `reference/derived/cypress-skin-crop.png` — gitignored flat review crops.

- [ ] **Step 1: Write the script**

Create `scripts/derive-cypress.ts`:

```ts
/*
 * Derive the cypress's own orientation field and colour skin from the scan (2026-07-21).
 *
 * The second-pass thesis: the cypress reads as near-black fur because it is built from palette
 * constants and short procedural marks. The painting contains every stroke it needs — so derive
 * the tree's real direction field and real pixels offline, and let the runtime render those.
 * Same lesson the sky paid six rounds to learn (docs/decisions/0003-inpaint-extend.md).
 *
 * Dependency-free: macOS `sips` for JPEG decode, Node `zlib` PNG IO, plain arithmetic.
 *
 * Outputs (committed): public/reference/cypress-flow.png, cypress-skin.png
 * Outputs (gitignored review crops): reference/derived/cypress-*.png
 *
 * Run: npm run derive-cypress   THEN npm run slim-reference (skin ships as lossless WebP).
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  blendToVertical,
  cypressMask,
  lowPassOrientation,
  orientationField,
  signedUpDirection,
  type Box,
} from './lib/cypress-field.ts';
import { decodePNG, encodePNG } from './lib/png.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PAINTING = resolve(ROOT, 'public/reference/painting.jpg');
const WORK = resolve(ROOT, 'reference/derived/cypress-work.png');
const OUT_FLOW = resolve(ROOT, 'public/reference/cypress-flow.png');
const OUT_SKIN = resolve(ROOT, 'public/reference/cypress-skin.png');
const OUT_OVERLAY = resolve(ROOT, 'reference/derived/cypress-field-overlay.png');
const OUT_SKIN_CROP = resolve(ROOT, 'reference/derived/cypress-skin-crop.png');

/** The cypress column, in painting UV. Generous: the mask's connectivity does the real work. */
const REGION = { u0: 0.02, u1: 0.32, v0: 0.04, v1: 1.0 };
const TENSOR_SIGMA = 4.0; // matches derive-reference.ts — the scale Van Gogh's strokes live at
const LOWPASS_SIGMA = 3.0; // coherence is 0.134 here; without this, integrated strokes wander

mkdirSync(dirname(WORK), { recursive: true });
execFileSync('sips', ['-s', 'format', 'png', PAINTING, '--out', WORK], { stdio: 'ignore' });
const painting = decodePNG(readFileSync(WORK));
const { width: W, height: H } = painting;

const box: Box = {
  x0: Math.floor(REGION.u0 * W),
  y0: Math.floor(REGION.v0 * H),
  x1: Math.ceil(REGION.u1 * W),
  y1: Math.ceil(REGION.v1 * H),
};

const mask = cypressMask(painting, box);
let count = 0;
for (let i = 0; i < mask.length; i++) count += mask[i];
if (count < 1000) throw new Error(`cypress mask found only ${count} px — the region or gate is wrong`);

// Tighten the box to what the mask actually claimed, so the assets carry the tree and little else.
let bx0 = W, by0 = H, bx1 = 0, by1 = 0;
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    if (!mask[y * W + x]) continue;
    if (x < bx0) bx0 = x;
    if (x > bx1) bx1 = x;
    if (y < by0) by0 = y;
    if (y > by1) by1 = y;
  }
}
const cw = bx1 - bx0 + 1;
const ch = by1 - by0 + 1;

// --- luminance over the crop, for the tensor ---
const lum = { width: cw, height: ch, data: new Float64Array(cw * ch) };
for (let y = 0; y < ch; y++) {
  for (let x = 0; x < cw; x++) {
    const i = ((y + by0) * W + (x + bx0)) * 4;
    lum.data[y * cw + x] = 0.299 * painting.rgba[i] + 0.587 * painting.rgba[i + 1] + 0.114 * painting.rgba[i + 2];
  }
}

const raw = orientationField(lum, TENSOR_SIGMA);
const smoothed = lowPassOrientation(raw.cos2, raw.sin2, cw, ch, LOWPASS_SIGMA);
const field = blendToVertical(smoothed.cos2, smoothed.sin2, raw.coherence);

// --- flow asset: signed up-direction + coherence ---
const flowRgba = new Uint8Array(cw * ch * 4);
for (let i = 0; i < cw * ch; i++) {
  const { dx, dy } = signedUpDirection(field.cos2[i], field.sin2[i]);
  flowRgba[i * 4] = Math.round(((dx + 1) / 2) * 255);
  flowRgba[i * 4 + 1] = Math.round(((dy + 1) / 2) * 255);
  flowRgba[i * 4 + 2] = Math.round(Math.min(1, Math.max(0, raw.coherence[i])) * 255);
  flowRgba[i * 4 + 3] = 255;
}
writeFileSync(OUT_FLOW, encodePNG(cw, ch, flowRgba));

// --- skin asset: real cypress colour, holes filled from the nearest cypress texel on the row ---
const skinRgba = new Uint8Array(cw * ch * 4);
for (let y = 0; y < ch; y++) {
  let lastR = 0, lastG = 0, lastB = 0, have = false;
  // forward pass carries colour rightward; the backward pass below fills the left margin
  for (let x = 0; x < cw; x++) {
    const src = ((y + by0) * W + (x + bx0)) * 4;
    const dst = (y * cw + x) * 4;
    if (mask[(y + by0) * W + (x + bx0)]) {
      lastR = painting.rgba[src];
      lastG = painting.rgba[src + 1];
      lastB = painting.rgba[src + 2];
      have = true;
    }
    skinRgba[dst] = lastR;
    skinRgba[dst + 1] = lastG;
    skinRgba[dst + 2] = lastB;
    skinRgba[dst + 3] = have ? 255 : 0;
  }
  for (let x = cw - 1; x >= 0; x--) {
    const dst = (y * cw + x) * 4;
    if (skinRgba[dst + 3] === 255) {
      lastR = skinRgba[dst]; lastG = skinRgba[dst + 1]; lastB = skinRgba[dst + 2];
    } else {
      skinRgba[dst] = lastR; skinRgba[dst + 1] = lastG; skinRgba[dst + 2] = lastB;
      skinRgba[dst + 3] = 255;
    }
  }
}
writeFileSync(OUT_SKIN, encodePNG(cw, ch, skinRgba));

// --- flat review crops: judged against the painting BEFORE anything enters 3D ---
const overlay = new Uint8Array(cw * ch * 4);
for (let i = 0; i < cw * ch; i++) {
  const src = ((Math.floor(i / cw) + by0) * W + ((i % cw) + bx0)) * 4;
  overlay[i * 4] = painting.rgba[src];
  overlay[i * 4 + 1] = painting.rgba[src + 1];
  overlay[i * 4 + 2] = painting.rgba[src + 2];
  overlay[i * 4 + 3] = 255;
}
// draw short direction ticks every 12 px so the field can be eyeballed against the brushwork
for (let y = 6; y < ch; y += 12) {
  for (let x = 6; x < cw; x += 12) {
    if (!mask[(y + by0) * W + (x + bx0)]) continue;
    const { dx, dy } = signedUpDirection(field.cos2[y * cw + x], field.sin2[y * cw + x]);
    for (let t = -5; t <= 5; t++) {
      const px = Math.round(x + dx * t);
      const py = Math.round(y + dy * t);
      if (px < 0 || py < 0 || px >= cw || py >= ch) continue;
      const o = (py * cw + px) * 4;
      overlay[o] = 255; overlay[o + 1] = 90; overlay[o + 2] = 40;
    }
  }
}
writeFileSync(OUT_OVERLAY, encodePNG(cw, ch, overlay));
writeFileSync(OUT_SKIN_CROP, encodePNG(cw, ch, skinRgba));

let cohSum = 0;
for (let i = 0; i < cw * ch; i++) cohSum += raw.coherence[i];
console.log(
  `cypress: mask ${count} px, crop ${cw}x${ch} at (${bx0},${by0}), mean coherence ${(cohSum / (cw * ch)).toFixed(3)}\n` +
    `wrote cypress-flow.png + cypress-skin.png; review crops in reference/derived/\n` +
    `NEXT: npm run slim-reference (skin ships as lossless WebP)`,
);
```

- [ ] **Step 2: Register the script and the WebP rule**

In `package.json`, add to `scripts` after `extend-reference`:

```json
    "derive-cypress": "node scripts/derive-cypress.ts",
```

and extend `test:sky` by appending ` scripts/cypress-field.test.ts scripts/cypress-mapping.test.ts` to its file list.

In `scripts/slim-reference.ts`, change the `WEBP_ASSETS` constant to:

```ts
const WEBP_ASSETS = ['painting-filled', 'sky-extend-left', 'sky-extend-right', 'cypress-skin'];
```

- [ ] **Step 3: Run the bake**

Run: `npm run derive-cypress && npm run slim-reference`
Expected: a mask count in the tens of thousands of px, a crop roughly 350–450 wide by 1000–1200 tall, mean coherence near 0.13, and `cypress-skin.webp` present in `public/reference/` with no `cypress-skin.png` left behind.

- [ ] **Step 4: Flat review — the gate that matters**

Open `reference/derived/cypress-field-overlay.png` and compare against the painting crop. **Look at it; do not just confirm the file exists.**

Expected: ticks run broadly up the trunk, following the visible brushwork, curving with the flame rather than pointing in scattered directions. If more than a small minority of ticks look random, the low-pass sigma is too low — raise `LOWPASS_SIGMA` and re-run. This is retune pass 1 of 4.

Also open `reference/derived/cypress-skin-crop.png`: it must be the tree's real green-and-umber paint with no sky blue anywhere.

- [ ] **Step 5: Commit**

```bash
git add scripts/derive-cypress.ts scripts/slim-reference.ts package.json public/reference/cypress-flow.png public/reference/cypress-skin.webp
git commit -m "feat(pipeline): derive the cypress's own flow field and colour skin

The painting contains every stroke the cypress needs. Structure tensor over the
tree's own pixels, low-passed at sigma 3 because coherence there is 0.134, with
a confidence-weighted fallback to the measured global vertical. Skin carries the
real green-and-umber paint with holes filled from the nearest cypress texel, so
sampling can never return sky.

Flat review crops land in reference/derived/ — the strokes get judged against the
painting before anything enters 3D, which is the lesson S2 taught."
```

---

### Task 4: `cypressMapping.ts` — form surface ↔ painting space

Pure, testable, and the piece most likely to be silently wrong. Follows the established shape of `skyMapping.ts` / `frontCanopyMapping.ts`.

**Design note (refines the spec):** the spec proposed a "mirrored offset" for the invented back. Implementation shows `u = (1 − cos a)/2` mirrors the back **automatically and continuously** — front and back meet at exactly the same `u` at the silhouette (`a = 0` and `a = π`). An offset would introduce a visible seam precisely at the most visible edge. Exact mirror is therefore the right call, and the spec is the thing that needs updating.

**Files:**
- Create: `src/scene/cypressMapping.ts`
- Test: `scripts/cypress-mapping.test.ts`

**Interfaces:**
- Produces (used by Task 6):
  - `surfaceToPaintingUV(angle: number, heightFraction: number): { u: number; v: number }`
  - `paintingUToAngle(u: number, frontFacing: boolean): number`
  - `isFrontFacing(angle: number): boolean`

- [ ] **Step 1: Write the failing tests**

Create `scripts/cypress-mapping.test.ts`:

```ts
/**
 * The cypress's surface-to-painting map. The contract: head-on, the painting's cypress edges land
 * exactly on the form's silhouette edges, so the front reads as the painting. The invented back
 * mirrors the front, which is continuous at the silhouette — an offset would put a seam on the
 * most visible edge.
 */

import assert from 'node:assert/strict'
import test from 'node:test'
import { isFrontFacing, paintingUToAngle, surfaceToPaintingUV } from '../src/scene/cypressMapping.ts'

test('the painting spans the front half, edges landing on the silhouette', () => {
  // a = 0 and a = PI are the silhouette edges as seen head-on (+Z faces the camera)
  assert.ok(Math.abs(surfaceToPaintingUV(0, 0.5).u - 0) < 1e-9, 'a=0 is the painting left edge')
  assert.ok(Math.abs(surfaceToPaintingUV(Math.PI, 0.5).u - 1) < 1e-9, 'a=PI is the painting right edge')
  assert.ok(Math.abs(surfaceToPaintingUV(Math.PI / 2, 0.5).u - 0.5) < 1e-9, 'facing the camera is the middle')
})

test('the back mirrors the front and is continuous at the silhouette', () => {
  const justFront = surfaceToPaintingUV(0.001, 0.5).u
  const justBack = surfaceToPaintingUV(-0.001, 0.5).u
  assert.ok(Math.abs(justFront - justBack) < 1e-4, 'no jump across the silhouette edge')
  assert.ok(Math.abs(surfaceToPaintingUV(Math.PI * 1.5, 0.5).u - surfaceToPaintingUV(Math.PI * 0.5, 0.5).u) < 1e-9)
})

test('height maps to painting v, base at the bottom', () => {
  // the form's heightFraction is 0 at the base; painting v is 0 at the TOP
  assert.ok(Math.abs(surfaceToPaintingUV(Math.PI / 2, 0).v - 1) < 1e-9, 'base of tree = bottom of painting crop')
  assert.ok(Math.abs(surfaceToPaintingUV(Math.PI / 2, 1).v - 0) < 1e-9, 'tip of tree = top of painting crop')
})

test('u round-trips back to an angle on the requested side', () => {
  for (const a of [0.2, 1.0, 2.0, 3.0]) {
    const { u } = surfaceToPaintingUV(a, 0.5)
    assert.ok(Math.abs(paintingUToAngle(u, true) - a) < 1e-6, `front round-trip failed for ${a}`)
    const back = paintingUToAngle(u, false)
    assert.ok(Math.sin(back) <= 1e-9, 'back angles must be on the far side')
    assert.ok(Math.abs(surfaceToPaintingUV(back, 0.5).u - u) < 1e-6, 'back angle maps to the same u')
  }
})

test('isFrontFacing splits on the camera-facing hemisphere', () => {
  assert.equal(isFrontFacing(Math.PI / 2), true)
  assert.equal(isFrontFacing(-Math.PI / 2), false)
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test scripts/cypress-mapping.test.ts`
Expected: FAIL — cannot find module `../src/scene/cypressMapping.ts`.

- [ ] **Step 3: Implement `src/scene/cypressMapping.ts`**

```ts
/**
 * Maps the cypress's 3D surface to the painting's cypress crop, and back.
 *
 * The form is built in XZ as (cos a, sin a), so +Z — the camera side head-on — is a = PI/2. The
 * painting's cypress column spans the FRONT half of the form: u = (1 - cos a)/2 puts the crop's
 * left edge at a = 0 and its right edge at a = PI, which are exactly the silhouette edges as seen
 * head-on. That is the contract — head-on, the form shows the painting's own cypress.
 *
 * The invented back half mirrors the front, which falls out of the same formula because cos is
 * even. That is deliberate: mirroring is CONTINUOUS at the silhouette, where front and back meet
 * at the same u, whereas any offset would put a seam on the most visible edge of the form. Mark's
 * acceptance call (2026-07-21) is head-on first, back must not break it — a mirrored continuation
 * of the tree's own paint cannot.
 */

/** Painting-space UV within the cypress crop for a point on the form's surface. */
export function surfaceToPaintingUV(angle: number, heightFraction: number): { u: number; v: number } {
  const u = (1 - Math.cos(angle)) / 2
  const v = 1 - Math.min(1, Math.max(0, heightFraction))
  return { u: Math.min(1, Math.max(0, u)), v }
}

/** True on the camera-facing half of the form (head-on), where the painting maps directly. */
export function isFrontFacing(angle: number): boolean {
  return Math.sin(angle) > 0
}

/**
 * Inverse of the u map. Orientation is ambiguous by design (front and back share a u), so the
 * caller states which side it wants — a stroke must stay on the hemisphere it was seeded on.
 */
export function paintingUToAngle(u: number, frontFacing: boolean): number {
  const clamped = Math.min(1, Math.max(0, u))
  const a = Math.acos(1 - 2 * clamped) // [0, PI]
  return frontFacing ? a : -a
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test scripts/cypress-mapping.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Update the spec to match**

In `docs/superpowers/specs/2026-07-21-cypress-second-pass-design.md`, replace the "Mapping front to back" paragraph's "mirrored offset" wording with exact mirroring, and state why: mirroring is continuous at the silhouette, an offset would seam there.

- [ ] **Step 6: Commit**

```bash
git add src/scene/cypressMapping.ts scripts/cypress-mapping.test.ts docs/superpowers/specs/2026-07-21-cypress-second-pass-design.md
git commit -m "feat(3d): map the cypress surface to the painting's own crop

u = (1 - cos a)/2 puts the painting's cypress edges exactly on the form's
silhouette edges, so head-on the form shows the painting's own tree. The back
mirrors the front, which falls out of the same formula — and mirroring is
CONTINUOUS at the silhouette, where an offset (as the spec first proposed) would
put a seam on the most visible edge. Spec corrected to match."
```

---

### Task 5: Diagnose the bulbous profile before changing it

The spec names two candidate causes and forbids tuning both. Diagnosis is its own task because the answer decides what Task 6 does.

**Files:**
- Create (temporary, deleted in Step 4): `scripts/diagnose-cypress-profile.ts`

- [ ] **Step 1: Write the diagnostic**

```ts
/*
 * TEMPORARY diagnostic (2026-07-21): is the cypress's bulbous mid-height swell coming from
 * extractCypressSlices' lumMax threshold picking up shadow as trunk, or from tongue() noise
 * displacement? The spec forbids tuning both and claiming the credit, so measure first.
 *
 * Run: node scripts/diagnose-cypress-profile.ts   (delete after reading)
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { extractCypressSlices } from '../src/scene/paintingRegions.ts';
import { decodePNG } from './lib/png.ts';

const ROOT = resolve(import.meta.dirname, '..');
const WORK = resolve(ROOT, 'reference/derived/cypress-work.png');
execFileSync('sips', ['-s', 'format', 'png', resolve(ROOT, 'public/reference/painting.jpg'), '--out', WORK], {
  stdio: 'ignore',
});
const png = decodePNG(readFileSync(WORK));
const painting = { data: new Uint8ClampedArray(png.rgba), width: png.width, height: png.height };

for (const lumMax of [62, 75, 90, 105]) {
  const slices = extractCypressSlices(painting, { lumMax });
  const prof = [...slices].reverse();
  const widths = prof.map((s) => s.halfWidth);
  const peak = widths.indexOf(Math.max(...widths));
  console.log(
    `lumMax=${String(lumMax).padStart(3)}  slices=${widths.length}  ` +
      `widest at height ${(peak / (widths.length - 1)).toFixed(2)}  ` +
      `profile: ${widths.filter((_, i) => i % 6 === 0).map((w) => w.toFixed(3)).join(' ')}`,
  );
}
```

- [ ] **Step 2: Run it and read the answer**

Run: `node scripts/diagnose-cypress-profile.ts`

Interpretation, and be honest about which it is:
- If the **widest slice sits well above the base** (say above height 0.3) at the current `lumMax: 90`, and moves down toward the base at lower `lumMax`, then the extraction is claiming shadow as trunk — **fix the threshold** in Task 6 and leave `tongue()` alone.
- If the profile is **monotonically widest at the base** at every threshold, the source silhouette is fine and the swell is `tongue()` displacement — **reduce the noise amplitude** in Task 6 and leave `lumMax` alone.

Record the finding in the Task 6 commit message.

- [ ] **Step 3: Delete the diagnostic**

```bash
rm scripts/diagnose-cypress-profile.ts
```

- [ ] **Step 4: No commit for this task** — it produces knowledge, not artefacts. The finding lands in Task 6's commit message and in `tasks/lessons.md` at Task 7.

---

### Task 6: Clad the cypress with long, source-coloured strokes

The visual payload. Everything before this exists to make this task small and reviewable.

**Files:**
- Modify: `src/scene/BrushCypress.tsx` (constants at lines 26–34; the cladding loop at lines 122–170)

**Interfaces:**
- Consumes: `pushBrushRibbon` (Task 1), `cypress-flow.png` + `cypress-skin.webp` (Task 3), `surfaceToPaintingUV`/`paintingUToAngle`/`isFrontFacing` (Task 4), the Task 5 finding
- Produces: no exports; this is the render change

- [ ] **Step 1: Load the new assets and replace the palette constants**

At the top of `src/scene/BrushCypress.tsx`, replace the `CORE`/`GREEN`/`OLIVE`/`LIT` block with:

```ts
// Colour now comes from the painting's own cypress pixels (cypress-skin), not palette constants.
// The old constants multiplied PALETTE.cypress by 0.68 and PALETTE.cypressGreen by 0.95 and then
// moonShade multiplied again — stacked attenuation is why the tree read as a black silhouette.
// The painting's value structure is already correct, so nothing is darkened on top of it.
const STROKES = 2200 // long ribbons now, not 3600 stubs — count down, vertices per stroke up
const STROKE_STEPS = 9 // polyline points per stroke
const STROKE_LEN = 0.11 // fraction of HEIGHT covered by a full stroke
const MOON_LIFT = 0.14 // a light touch on the lit side, not the main value term
```

and change the imports to add:

```ts
import { pushBrushRibbon } from './brushForms'
import { isFrontFacing, paintingUToAngle, surfaceToPaintingUV } from './cypressMapping'
```

Then load the assets alongside the existing painting data:

```ts
  const paintingData = useImageData('/reference/painting.jpg')
  const skinData = useImageData('/reference/cypress-skin.webp')
  const flowData = useImageData('/reference/cypress-flow.png')
```

and change the memo's guard and dependency list:

```ts
    if (!paintingData || !skinData || !flowData) return null
```
```ts
  }, [paintingData, skinData, flowData])
```

- [ ] **Step 2: Replace the cladding loop**

Replace lines 122–170 (from the `// --- brushstroke cladding` comment through the closing brace of the `for (let s = 0; ...)` loop) with:

```ts
    // --- brushstroke cladding: long strokes following the painting's own cypress flow ---
    // Van Gogh's cypress is made of long sinuous strokes running the height of the form. Short
    // marks — whatever their direction — read as fur; lessons.md calls this "the cypress fur
    // trap" and records it recurring. Length is the fix, and the direction comes from the tree's
    // own derived field rather than from noise.
    const rng = mulberry32(0x0cabba9e)
    const arr = makeBrushArrays()
    const nrm = new Vector3()

    const sampleSkin = (u: number, v: number, out: Color) => {
      const sx = Math.min(skinData.width - 1, Math.max(0, Math.round(u * (skinData.width - 1))))
      const sy = Math.min(skinData.height - 1, Math.max(0, Math.round(v * (skinData.height - 1))))
      const i = (sy * skinData.width + sx) * 4
      out.setRGB(skinData.data[i] / 255, skinData.data[i + 1] / 255, skinData.data[i + 2] / 255)
    }
    const sampleFlow = (u: number, v: number) => {
      const sx = Math.min(flowData.width - 1, Math.max(0, Math.round(u * (flowData.width - 1))))
      const sy = Math.min(flowData.height - 1, Math.max(0, Math.round(v * (flowData.height - 1))))
      const i = (sy * flowData.width + sx) * 4
      return { dx: (flowData.data[i] / 255) * 2 - 1, dy: (flowData.data[i + 1] / 255) * 2 - 1 }
    }

    for (let s = 0; s < STROKES; s++) {
      const hf0 = Math.pow(rng(), 0.78) // slight bias toward the fuller base
      const a0 = rng() * Math.PI * 2
      const front = isFrontFacing(a0)

      const points: Vector3[] = []
      const normals: Vector3[] = []
      const colors: Color[] = []
      let u = surfaceToPaintingUV(a0, hf0).u
      let v = surfaceToPaintingUV(a0, hf0).v
      const stepV = STROKE_LEN / (STROKE_STEPS - 1)

      for (let k = 0; k < STROKE_STEPS; k++) {
        // Contain the stroke: walking past the crop is walking off the tree. Stopping is the
        // 2026-07-14 containment lesson — a stroke population that exists to texture a region
        // must be clipped to that region.
        if (u <= 0 || u >= 1 || v <= 0 || v >= 1) break

        const hf = 1 - v
        const a = paintingUToAngle(u, front)
        const bump = tongue(a, hf)
        const tipTaper = 0.35 + 0.65 * (1 - smooth(0.6, 1, hf))
        const r = Math.max(0.015, sampleR(hf) * (1 + bump * 0.5 * tipTaper))
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

        const c = new Color()
        sampleSkin(u, v, c)
        // moonlight is a lift on the lit side, never the thing that sets the value
        c.multiplyScalar(1 + MOON_LIFT * moonShade(nrm))
        colors.push(c)

        const flow = sampleFlow(u, v)
        // dy is negative (up the form); step by a fixed arc length so strokes are even
        const m = Math.hypot(flow.dx, flow.dy) || 1
        u += (flow.dx / m) * stepV * (flowData.height / flowData.width)
        v += (flow.dy / m) * stepV
      }

      if (points.length < 3) continue
      const halfWid = 0.012 + 0.008 * rng()
      pushBrushRibbon(arr, points, normals, colors, halfWid, 0.45)
    }
```

- [ ] **Step 3: Apply the Task 5 profile finding**

Exactly one of these, according to what Task 5 measured. Do not do both.

If the diagnosis was **threshold**: change line 58's `lumMax: 90` to the value at which the profile is widest at the base.

If the diagnosis was **noise**: in `tongue()`, change `bump = bump > 0 ? bump * 1.35 : bump * 0.45` to `bump = bump > 0 ? bump * 0.9 : bump * 0.35`, so the silhouette is made by rim-crossing strokes rather than by mesh displacement.

- [ ] **Step 4: Verify it builds and renders**

Run: `npm run build`
Expected: no TypeScript errors.

Run: `npm run dev`, open `http://localhost:5173/?mode=diorama&clean=1`
Expected: the cypress renders. It must NOT be a black silhouette, and strokes must run up the form.

- [ ] **Step 5: Capture and look**

```bash
npm run capture:diorama -- output/playwright/cypress-pass2-2026-07-21
```

Then crop and zoom the cypress from `desktop-centre.png` and put it beside the baseline crop from `output/playwright/webp-2026-07-21/desktop-centre.png` and the painting crop from `public/reference/painting.jpg`.

**Look at the images.** Do not report this task done on the basis that the capture ran. The three gaps to judge, from the spec: is it still near-black; does it read as fur or flame; is the silhouette still bulbous.

- [ ] **Step 6: Commit**

```bash
git add src/scene/BrushCypress.tsx
git commit -m "feat(3d): the cypress wears the painting's own paint

Long ribbons following the tree's derived flow field, coloured from cypress-skin
along their length, replacing 3600 short palette-coloured marks. The x0.68/x0.95
darkening is gone and moonShade is a lift rather than the main value term —
stacked attenuation is why the tree read as a black silhouette.

Profile: <state the Task 5 finding and which single fix was applied>."
```

---

### Task 7: Verify, record, and hand to Mark

**Files:**
- Modify: `tasks/lessons.md`, `tasks/todo.md`

- [ ] **Step 1: Run the full check**

```bash
npm run test:sky && npm run lint && npm run build && npm run check:reduced
```
Expected: all pass. Test count should now be 53 + 3 (ribbon) + 6 (field) + 5 (mapping) = 67.

- [ ] **Step 2: Confirm the performance criterion**

The locked criterion is 60 fps desktop / 30 fps mid-tier mobile, and stroke vertex count went up per stroke while count went down. Compare geometry size before and after by logging `strokes.getAttribute('position').count` in both states, and state the numbers rather than asserting it is fine. If vertices rose more than ~50%, reduce `STROKES` and re-capture.

- [ ] **Step 3: Append to `tasks/lessons.md`**

Cover: whether the fur→flame fix actually worked and what it took; the Task 5 profile finding (threshold vs noise) and how measuring first avoided tuning both; how many retune passes the flat review needed; and anything about the low-pass sigma that a future pass should know.

- [ ] **Step 4: Update `tasks/todo.md`**

Move the cypress work into the record with its evidence paths, and add a checklist row for Mark's gate on it. Note explicitly whether this pass is finished or wants another — the spec does not promise one pass.

- [ ] **Step 5: Commit and push**

```bash
git add tasks/lessons.md tasks/todo.md
git commit -m "docs(tasks): record the cypress second pass"
git push origin sky-brushdab
```

- [ ] **Step 6: Hand to Mark**

Present the three crops — painting, before, after — and name what still looks wrong. The gate is his.

---

## Self-Review

**Spec coverage:**

| Spec requirement | Task |
|---|---|
| `cypress-flow.png`, low-passed, confidence blend to vertical | 2, 3 |
| `cypress-skin.webp` via `treeishColour`, added to `WEBP_ASSETS` | 2, 3 |
| New `scripts/derive-cypress.ts`, dependency-free, deterministic, tested | 2, 3 |
| Long strokes replacing short marks | 1, 6 |
| Colour sampled along stroke length | 6 |
| Drop the `× 0.68` / `× 0.95` darkening; moonShade becomes a light touch | 6 |
| Silhouette by strokes, not mesh noise | 5, 6 |
| Front 180° maps the painting; back continues | 4 |
| Flat review before 3D | 3 (Step 4) |
| 3D captures against the `webp-2026-07-21` baseline | 6 (Step 5) |
| Sign alignment (2026-07-16 rule) | 2 |
| Containment (2026-07-14 rule) | 6 (Step 2) |
| Performance criterion measured, not assumed | 7 (Step 2) |
| Retune cap of 4 | 3 (Step 4) |

**Type consistency:** `pushBrushRibbon` is defined in Task 1 and consumed in Task 6 with matching arity. `surfaceToPaintingUV` / `paintingUToAngle` / `isFrontFacing` are defined in Task 4 and consumed in Task 6 with matching signatures. `cypressMask` / `orientationField` / `lowPassOrientation` / `blendToVertical` / `signedUpDirection` are defined in Task 2 and consumed in Task 3 with matching signatures. `Box` and `Grid` are exported from Task 2 and used in Task 3.

**Placeholder scan:** one intentional fill-in-the-blank remains — the Task 6 commit message asks for the Task 5 finding to be stated, which cannot be known before the diagnostic runs. Task 5's Step 2 defines exactly how to read it, so this is a measured value, not a vague instruction.

**Known deviation from the spec:** Task 4 replaces the spec's "mirrored offset" with exact mirroring, because mirroring is continuous at the silhouette and an offset would seam there. Task 4 Step 5 updates the spec to match rather than leaving the two documents disagreeing.
