# Painting-Owned Foreground Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the `?mode=diorama` front-arc route read as *the painting given depth* — one visual
system owned by the painting's pixels — replacing the current two-world split (source matte vs grey
prop diorama) that has failed every taste gate.

**Architecture:** Three slices. (1) Recover the sky's cobalt/gold values (tuning, no geometry).
(2) Replace the prop cypress with a world-space volume whose silhouette is *extracted from the
painting* and whose surface *samples the painting* via home-view projective texturing — exact
registration with the camera-locked source matte by construction. (3) Generalise the same mechanism
to the whole foreground: a source-textured relief terrain (village, hills, ground band + dark
under-root) replaces the floating island, prop village, grey hills, blades and stones.

**Tech Stack:** Existing only — Vite + React + TS + three.js + R3F + drei + @react-three/postprocessing.
No new dependencies.

## Global Constraints

- The locked bar (CLAUDE.md): motion/colour derived from the painting; never generic noise. The
  sky carrier stays `PaintingFlowSky3D` + `buildSourceStreamlineRibbons` (DIORAMA_RECOVERY_CONTRACT:
  `preserveSourceSpaceRibbons: true`, `rejectNativeDomeReplacement: true`).
- Front-arc only. Do not touch `DIORAMA_ORBIT` angles. No 360 work.
- Do not touch the 2D route (`LivingPainting`, `StreamlineSky`), `?mode=relief`, `?mode=canopy`.
- Retune cap: 4 passes per slice (CLAUDE.md Tunables). If a slice still fails visually, stop and
  write it up for Mark.
- Every slice ends with `npm run capture:diorama -- output/playwright/painting-owned-2026-07-08/<slice>`
  and **looking at the captures against `public/reference/painting.jpg`** before commit. Green
  checks are not the gate; the look is.
- Typecheck via `npm run build` (`tsc -b`); bare `tsc --noEmit` is a no-op in this repo.
- British English; conventional commits.

## Key geometry facts (derived from the code, verified 2026-07-08)

- The sky stack (`PaintingFlowSky3D`: gradient sphere, `SkyEdgeBackfill`, sky wash,
  `DioramaForegroundMatte`, ribbons, orbs) lives in a group whose quaternion is
  `camera.quaternion * initialCameraInverse` — **camera-rotation-locked**: it never moves relative
  to the viewport. The diorama forms are world-space. Anything meant to read as "one object with
  the painting" must therefore be *pixel-identical* with what sits behind it, so residual slide
  reads as impasto depth, not as two objects.
- Source shell: `uvToDioramaSkyPosition(u, v, out, r)` maps painting UV → sphere of radius `r`
  centred on the **origin** (basis FWD/RIGHT/TRUEUP from `skyMapping`, spans ×1.16/×1.06). The
  matte renders at `DOME_R - 0.18` = 5.82.
- Home eye: `DIORAMA_CAMERAS.design.position` = (0.62, 1.18, 5.18) — inside the shell
  (|eye| ≈ 5.35 < 5.82). A forward ray from the eye hits the shell ~11 world units out.
- Projective inverse: for world point P, the ray eye→P continued to the shell, then
  `h = atan2(hit·RIGHT, hit·FWD)`, `w = asin(hit·TRUEUP)`, `u = 0.5 + h/(SPAN_H·1.16)`,
  `v = 0.5 − w/(SPAN_V·1.06)`. Registration at the home view is exact by construction.
- Depth staging (distance from home eye): cypress ≈ 4.7 (in front of the orbit pivot at ≈ 5.2),
  near ground ≈ 6.1, hills/skyline ≈ 8.8, source shell ≈ 11. The relief spreads through the pivot,
  so orbit gives real parallax.

---

### Task 1: Sky colour/value recovery (slice 1)

The current sky reads milky-white against the painting's deep cobalt; stars are white points; the
moon is an orange sticker. All tuning-level edits in two files. Log the tunable changes in
`tasks/lessons.md` at commit time.

**Files:**
- Modify: `src/scene/DioramaExperience.tsx` (Bloom line)
- Modify: `src/scene/PaintingFlowSky3D.tsx` (gradient scalars, wash frag, ribbon frag, halo textures, sprite scales/opacities)

**Interfaces:** none change — visual constants only.

- [ ] **Step 1.1: Tighten bloom** (proven recipe from lessons: threshold ~0.6, tighter radius —
  only stars/moon/brightest strokes bloom, not the whole pale sky).

In `src/scene/DioramaExperience.tsx` replace:
```tsx
          <Bloom intensity={0.42} luminanceThreshold={0.38} mipmapBlur radius={0.42} />
```
with:
```tsx
          <Bloom intensity={0.5} luminanceThreshold={0.58} mipmapBlur radius={0.5} />
```

- [ ] **Step 1.2: Deepen the gradient toward cobalt night.** In `src/scene/PaintingFlowSky3D.tsx`:
```ts
          uTop: { value: new Color(PALETTE.skyZenith).multiplyScalar(0.72) },
          uBottom: { value: new Color(PALETTE.skyHorizon).multiplyScalar(0.86) },
```
→
```ts
          uTop: { value: new Color(PALETTE.skyZenith).multiplyScalar(0.58) },
          uBottom: { value: new Color(PALETTE.skyHorizon).multiplyScalar(0.68) },
```

- [ ] **Step 1.3: Let the wash carry the painting's own blues** (less cool-white lift, a bit more
  presence). In `washFrag`:
```glsl
    col *= vec3(0.68, 0.82, 1.04);
    gl_FragColor = vec4(col, a * 0.42);
```
→
```glsl
    col *= vec3(0.6, 0.72, 0.95);
    gl_FragColor = vec4(col, a * 0.5);
```

- [ ] **Step 1.4: Stop the ribbons whiting out** (weaker brightness pulse, more saturation, hard
  clamp at 1.05 so only genuinely bright paint blooms). In `ribbonFrag`:
```glsl
      col *= (0.58 + 0.46 * combinedFlow) * ridge * bristle;
      float lum = dot(col, vec3(0.299, 0.587, 0.114));
      col = clamp(mix(vec3(lum), col, 1.2), 0.0, 1.2);
```
→
```glsl
      col *= (0.52 + 0.42 * combinedFlow) * ridge * bristle;
      float lum = dot(col, vec3(0.299, 0.587, 0.114));
      col = clamp(mix(vec3(lum), col, 1.3), 0.0, 1.05);
```

- [ ] **Step 1.5: Gold stars, not white.** In `makeStarHaloTexture()` replace the stops:
```ts
  g.addColorStop(0, 'rgba(255,250,222,1)')
  g.addColorStop(0.16, 'rgba(249,234,160,0.72)')
  g.addColorStop(0.34, 'rgba(232,216,132,0.28)')
  g.addColorStop(0.62, 'rgba(216,202,130,0.05)')
  g.addColorStop(1, 'rgba(216,202,130,0)')
```
→
```ts
  g.addColorStop(0, 'rgba(252,240,170,1)')
  g.addColorStop(0.16, 'rgba(244,221,120,0.7)')
  g.addColorStop(0.34, 'rgba(226,200,110,0.26)')
  g.addColorStop(0.62, 'rgba(205,185,120,0.05)')
  g.addColorStop(1, 'rgba(205,185,120,0)')
```
In `SourceOrbs`, star halo `opacity={debug === 'flow' ? 0.72 : 0.48}` → `0.62` (final branch), and
the star core `<meshBasicMaterial color="#fff2c7" …>` → `color="#f3df7d"`.

- [ ] **Step 1.6: The moon as a radiant gold orb, not an orange sticker.** In
  `makeMoonCrescentTexture()` the radial stops:
```ts
  g.addColorStop(0, 'rgba(255,240,183,1)')
  g.addColorStop(0.62, 'rgba(237,190,82,1)')
  g.addColorStop(1, 'rgba(210,151,51,1)')
```
→
```ts
  g.addColorStop(0, 'rgba(253,243,189,1)')
  g.addColorStop(0.62, 'rgba(236,211,95,1)')
  g.addColorStop(1, 'rgba(202,164,62,1)')
```
Moon halo sprite scale `[3.35, 3.35, 1]` → `[3.85, 3.85, 1]`.

- [ ] **Step 1.7: Build + capture + LOOK.**
```bash
npm run build
npm run capture:diorama -- output/playwright/painting-owned-2026-07-08/s1-sky-colour
```
Read `desktop-centre.png`, `desktop-nopost.png`, `mobile-centre.png` beside
`public/reference/painting.jpg`. Judge: cobalt field (not milky), gold star orbs, radiant yellow
moon, whorl still legible. Retune (cap 4) on what looks wrong; the values above are starting
points, not gospel.

- [ ] **Step 1.8: Commit.**
```bash
git add src/scene/DioramaExperience.tsx src/scene/PaintingFlowSky3D.tsx tasks/lessons.md
git commit -m "fix(3d): recover cobalt sky and gold star/moon values"
```

---

### Task 2: Home-view projective helpers (`sourceProjection.ts`)

The shared registration maths for slices 2 and 3.

**Files:**
- Create: `src/scene/sourceProjection.ts`
- Test: `scripts/source-projection.test.ts`
- Modify: `package.json` (append test file to `test:sky`)

**Interfaces:**
- Produces: `HOME_EYE: Vector3`, `SOURCE_SHELL_R: number`,
  `worldToSourceUV(p: Vector3, radius?: number): { u: number; v: number }`,
  `sourceUVAtDistance(u: number, v: number, dist: number, out?: Vector3): Vector3`,
  `worldPerU(dist: number): number`, `worldPerV(dist: number): number`.

- [ ] **Step 2.1: Write the failing test** (`scripts/source-projection.test.ts`):
```ts
import assert from 'node:assert/strict'
import test from 'node:test'
import { Vector3 } from 'three'
import {
  HOME_EYE,
  SOURCE_SHELL_R,
  sourceUVAtDistance,
  worldPerU,
  worldToSourceUV,
} from '../src/scene/sourceProjection.ts'

test('worldToSourceUV inverts sourceUVAtDistance at any depth', () => {
  for (const dist of [3.2, 4.7, 6.1, 8.8]) {
    for (const [u, v] of [[0.1, 0.8], [0.5, 0.4], [0.85, 0.2], [0.06, 0.95]]) {
      const p = sourceUVAtDistance(u, v, dist, new Vector3())
      assert.equal(p.distanceTo(HOME_EYE) > dist - 1e-6, true)
      const q = worldToSourceUV(p)
      assert.ok(Math.abs(q.u - u) < 1e-5, `u ${q.u} vs ${u} at dist ${dist}`)
      assert.ok(Math.abs(q.v - v) < 1e-5, `v ${q.v} vs ${v} at dist ${dist}`)
    }
  }
})

test('shell points map to their own UV', () => {
  const p = sourceUVAtDistance(0.3, 0.6, 1, new Vector3())
  const onShell = p.sub(HOME_EYE).normalize()
  // the eye is inside the shell so every UV has a forward intersection
  assert.ok(SOURCE_SHELL_R > HOME_EYE.length())
  assert.ok(onShell.lengthSq() > 0)
})

test('worldPerU scales linearly with distance', () => {
  assert.ok(Math.abs(worldPerU(4) * 2 - worldPerU(8)) < 1e-9)
})
```

- [ ] **Step 2.2: Run to verify it fails.**
Run: `node --test scripts/source-projection.test.ts`
Expected: FAIL — cannot find module `sourceProjection.ts`.

- [ ] **Step 2.3: Implement** `src/scene/sourceProjection.ts`:
```ts
import { Vector3 } from 'three'
import { DOME_R, FWD, RIGHT, SPAN_H, SPAN_V, TRUEUP } from './skyMapping'
import { DIORAMA_CAMERAS } from './dioramaContract'
import { uvToDioramaSkyPosition } from './dioramaSkyProjection'

/**
 * Home-view projective texturing: world geometry samples the painting through the SAME projection
 * the camera-locked source sky/matte uses, registered to the design (home) camera. Head-on, a
 * projected surface is pixel-identical with the matte behind it by construction; orbiting reveals
 * only genuine depth, never a second copy of the image.
 */

/** The home (design) eye — all projective registration is exact from this viewpoint. */
export const HOME_EYE = new Vector3(...DIORAMA_CAMERAS.design.position)

/** Radius of the shell the source matte renders at (see DioramaForegroundMatte). */
export const SOURCE_SHELL_R = DOME_R - 0.18

const H_SCALE = SPAN_H * 1.16
const V_SCALE = SPAN_V * 1.06

/** Painting UV seen directly behind world point `p` from the home eye. */
export function worldToSourceUV(p: Vector3, radius = SOURCE_SHELL_R): { u: number; v: number } {
  const dir = new Vector3().subVectors(p, HOME_EYE).normalize()
  const b = HOME_EYE.dot(dir)
  const c = HOME_EYE.lengthSq() - radius * radius
  const t = -b + Math.sqrt(Math.max(0, b * b - c)) // eye is inside the shell → forward hit exists
  const hit = new Vector3().copy(HOME_EYE).addScaledVector(dir, t).normalize()
  const w = Math.asin(Math.min(1, Math.max(-1, hit.dot(TRUEUP))))
  const h = Math.atan2(hit.dot(RIGHT), hit.dot(FWD))
  return { u: 0.5 + h / H_SCALE, v: 0.5 - w / V_SCALE }
}

/** World point `dist` from the home eye along the sightline to painting UV (u, v). */
export function sourceUVAtDistance(u: number, v: number, dist: number, out = new Vector3()): Vector3 {
  uvToDioramaSkyPosition(u, v, out, SOURCE_SHELL_R)
  out.sub(HOME_EYE).normalize()
  return out.multiplyScalar(dist).add(HOME_EYE)
}

/** Approximate world metres per unit of painting-u at `dist` from the eye (small-angle arc). */
export function worldPerU(dist: number): number {
  return dist * H_SCALE
}

/** Approximate world metres per unit of painting-v at `dist` from the eye. */
export function worldPerV(dist: number): number {
  return dist * V_SCALE
}
```

- [ ] **Step 2.4: Run tests.**
Run: `node --test scripts/source-projection.test.ts`
Expected: PASS (3/3).

- [ ] **Step 2.5: Register the test + commit.** In `package.json`, append
  ` scripts/source-projection.test.ts` to the `test:sky` command string.
```bash
npm run test:sky
git add src/scene/sourceProjection.ts scripts/source-projection.test.ts package.json
git commit -m "feat(3d): home-view projective mapping between world space and painting UV"
```

---

### Task 3: Painting-region extraction (`paintingRegions.ts`)

CPU scans of the reference pixels: the cypress silhouette (slice 2) and the skyline (slice 3).
Pure functions over `ImageData2D` so they node-test with synthetic images.

**Files:**
- Create: `src/scene/paintingRegions.ts`
- Test: `scripts/painting-regions.test.ts`
- Modify: `package.json` (append test file)

**Interfaces:**
- Consumes: `ImageData2D` from `./useImageData`.
- Produces: `type CypressSlice = { v: number; uCentre: number; halfWidth: number }`,
  `extractCypressSlices(painting: ImageData2D, opts?): CypressSlice[]` (top → bottom),
  `extractSkylineV(mask: ImageData2D, cols?: number): number[]` (per-column skyline v, cypress
  intrusion clamped).

- [ ] **Step 3.1: Write the failing test** (`scripts/painting-regions.test.ts`):
```ts
import assert from 'node:assert/strict'
import test from 'node:test'
import { extractCypressSlices, extractSkylineV } from '../src/scene/paintingRegions.ts'

function image(width: number, height: number, fill: (x: number, y: number) => [number, number, number]) {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b] = fill(x, y)
      const i = (y * width + x) * 4
      data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255
    }
  }
  return { data, width, height }
}

test('extractCypressSlices finds a dark vertical bar in the left band', () => {
  // 200×200: dark bar centred at u=0.1, halfWidth 0.03, from v=0.1 down; bright elsewhere
  const img = image(200, 200, (x, y) => {
    const u = x / 200
    const v = y / 200
    const inBar = v > 0.1 && Math.abs(u - 0.1) < 0.03
    return inBar ? [20, 25, 20] : [140, 150, 180]
  })
  const slices = extractCypressSlices(img)
  assert.ok(slices.length > 20)
  for (const s of slices) {
    assert.ok(Math.abs(s.uCentre - 0.1) < 0.02, `centre ${s.uCentre}`)
    assert.ok(s.halfWidth > 0.015 && s.halfWidth < 0.05, `halfWidth ${s.halfWidth}`)
    assert.ok(s.v > 0.05)
  }
  // ordered top → bottom
  for (let i = 1; i < slices.length; i++) assert.ok(slices[i].v > slices[i - 1].v)
})

test('extractSkylineV reads the sky mask boundary and clamps the cypress column', () => {
  // sky (255) above a slanted ground line; a full-height dark column at u<0.15 (the cypress)
  const mask = image(200, 200, (x, y) => {
    const u = x / 200
    const v = y / 200
    if (u < 0.15) return [0, 0, 0] // cypress punches through the sky
    const ground = v > 0.6 + 0.1 * u
    return ground ? [0, 0, 0] : [255, 255, 255]
  })
  const skyline = extractSkylineV(mask, 40)
  assert.equal(skyline.length, 40)
  // right-side columns follow the slant
  const uAt = (i: number) => i / 39
  for (let i = 12; i < 40; i++) {
    assert.ok(Math.abs(skyline[i] - (0.6 + 0.1 * uAt(i))) < 0.04, `col ${i}: ${skyline[i]}`)
  }
  // cypress columns are clamped to the neighbouring hills line, not v≈0
  for (let i = 0; i < 6; i++) assert.ok(skyline[i] > 0.5, `cypress col ${i}: ${skyline[i]}`)
})
```

- [ ] **Step 3.2: Run to verify it fails.**
Run: `node --test scripts/painting-regions.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3.3: Implement** `src/scene/paintingRegions.ts`:
```ts
import type { ImageData2D } from './useImageData'

/** One horizontal slice of the cypress silhouette, in painting UV. */
export type CypressSlice = { v: number; uCentre: number; halfWidth: number }

function lumAt(img: ImageData2D, x: number, y: number): number {
  const i = (y * img.width + x) * 4
  return 0.299 * img.data[i] + 0.587 * img.data[i + 1] + 0.114 * img.data[i + 2]
}

/**
 * Scan the painting's left band for the cypress: per sampled row, the widest contiguous dark run.
 * Rows return top (tip) → bottom (base), smoothed so the extruded volume doesn't jitter. The
 * silhouette is deliberately approximate-generous — the source matte behind carries the true
 * pixel detail; this only shapes the volume that gives those pixels depth.
 */
export function extractCypressSlices(
  painting: ImageData2D,
  { uMax = 0.26, vMin = 0.01, vMax = 1, rows = 64, lumMax = 62 } = {},
): CypressSlice[] {
  const raw: CypressSlice[] = []
  const xMax = Math.min(painting.width - 1, Math.floor(uMax * painting.width))
  for (let r = 0; r < rows; r++) {
    const v = vMin + ((vMax - vMin) * r) / (rows - 1)
    const y = Math.min(painting.height - 1, Math.floor(v * painting.height))
    let bestStart = -1
    let bestLen = 0
    let start = -1
    for (let x = 0; x <= xMax + 1; x++) {
      const dark = x <= xMax && lumAt(painting, x, y) < lumMax
      if (dark && start < 0) start = x
      if (!dark && start >= 0) {
        const len = x - start
        if (len > bestLen) {
          bestLen = len
          bestStart = start
        }
        start = -1
      }
    }
    if (bestLen < painting.width * 0.006) continue // no cypress on this row
    raw.push({
      v,
      uCentre: (bestStart + bestLen / 2) / painting.width,
      halfWidth: bestLen / 2 / painting.width,
    })
  }
  // moving-average smooth, window 5
  return raw.map((s, i) => {
    let uc = 0
    let hw = 0
    let n = 0
    for (let k = -2; k <= 2; k++) {
      const q = raw[i + k]
      if (!q) continue
      uc += q.uCentre
      hw += q.halfWidth
      n++
    }
    return { v: s.v, uCentre: uc / n, halfWidth: hw / n }
  })
}

/**
 * Per-column skyline from the sky mask: scanning bottom→up, the first sky pixel marks where the
 * ground band ends. Columns the cypress punches through (their skyline would jump to the top of
 * the frame) are clamped to the median skyline of the columns just right of the cypress band,
 * because the terrain behind the cypress is the hills, not the tree.
 */
export function extractSkylineV(mask: ImageData2D, cols = 96): number[] {
  const rawline: number[] = []
  for (let c = 0; c < cols; c++) {
    const u = c / (cols - 1)
    const x = Math.min(mask.width - 1, Math.floor(u * mask.width))
    let skyline = 0.5
    for (let y = mask.height - 1; y >= 0; y--) {
      if (mask.data[(y * mask.width + x) * 4] > 128) {
        skyline = Math.min(1, (y + 1) / mask.height)
        break
      }
    }
    rawline.push(skyline)
  }
  // clamp cypress intrusion: reference = median of columns in u ∈ [0.3, 0.5]
  const refCols = rawline.filter((_, i) => i / (cols - 1) >= 0.3 && i / (cols - 1) <= 0.5)
  const sorted = [...refCols].sort((a, b) => a - b)
  const median = sorted[Math.floor(sorted.length / 2)] ?? 0.6
  return rawline.map((s, i) => {
    const u = i / (cols - 1)
    if (u < 0.3 && s < median - 0.1) return median
    return s
  })
}
```

- [ ] **Step 3.4: Run tests.**
Run: `node --test scripts/painting-regions.test.ts`
Expected: PASS (2/2). Tune thresholds in the TEST only if the synthetic fixtures were mis-built;
tune the implementation if the logic is wrong.

- [ ] **Step 3.5: Register + commit.** Append ` scripts/painting-regions.test.ts` to `test:sky`.
```bash
npm run test:sky
git add src/scene/paintingRegions.ts scripts/painting-regions.test.ts package.json
git commit -m "feat(3d): extract cypress silhouette and skyline from the reference pixels"
```

---

### Task 4: One cypress — the source-projected flame volume (slice 2, the architecture-proving slice)

Replace the smooth prop cone with `SourceCypress`: a world-space volume whose rings follow the
painting's extracted silhouette (over-covered ×1.3), displaced with licking-tongue noise, and
textured by sampling the painting through the home-view projection. The camera-locked matte keeps
the cypress band as the base layer behind it, so orbit reveals depth over identical pixels — never
a void, never a second tree.

**Files:**
- Create: `src/scene/SourceCypress.tsx`
- Modify: `src/scene/Diorama.tsx` (remove the prop `Cypress` from final mode; mount `SourceCypress`)
- Delete: `src/scene/CypressFlameVolume.tsx`, `src/scene/cypressFlameGeometry.ts`,
  `scripts/cypress-flame.test.ts` (dead code — nothing imports the component)
- Modify: `package.json` (drop cypress-flame test from `test:sky`)

**Interfaces:**
- Consumes: `worldToSourceUV`, `sourceUVAtDistance`, `worldPerU` (Task 2);
  `extractCypressSlices` (Task 3); `useImageData`, `useTexture('/reference/painting.jpg')`.
- Produces: `<SourceCypress />` — self-positioning (absolute world vertices), no props.

- [ ] **Step 4.1: Implement** `src/scene/SourceCypress.tsx`:
```tsx
import { useEffect, useMemo } from 'react'
import { useTexture } from '@react-three/drei'
import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  NoColorSpace,
  ShaderMaterial,
  Vector3,
} from 'three'
import { useImageData } from './useImageData'
import { extractCypressSlices } from './paintingRegions'
import { HOME_EYE, sourceUVAtDistance, worldPerU, worldToSourceUV } from './sourceProjection'

/**
 * The cypress as ONE Van Gogh flame: a world-space volume whose silhouette is extracted from the
 * painting's own dark left band and whose surface samples the painting through the home-view
 * projection. Head-on it is pixel-registered with the source matte behind it; orbiting shows a
 * genuinely three-dimensional flame whose slide over the matte reads as impasto depth, because
 * both carry the same pixels.
 */

const DIST_BASE = 4.72 // world distance (from the home eye) of the flame's base ring
const DIST_TIP = 4.92 // the tip leans slightly away toward the sky
const MARGIN = 1.3 // silhouette over-cover so the matte strip never peeks past the volume in-arc
const DEPTH_RATIO = 0.62 // flame thickness along the sightline, relative to its width
const UV_COMPRESS = 0.82 // sample UVs pulled toward the slice centre so edges stay on painted bark
const SEG = 22

function hash2(x: number, y: number) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return s - Math.floor(s)
}
function vnoise(x: number, y: number) {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const xf = x - xi
  const yf = y - yi
  const u = xf * xf * (3 - 2 * xf)
  const v = yf * yf * (3 - 2 * yf)
  const a = hash2(xi, yi)
  const b = hash2(xi + 1, yi)
  const c = hash2(xi, yi + 1)
  const d = hash2(xi + 1, yi + 1)
  return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v
}

const cypressVert = /* glsl */ `
  attribute float aShade;
  varying vec2 vUv;
  varying float vShade;
  void main() {
    vUv = uv;
    vShade = aShade;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const cypressFrag = /* glsl */ `
  precision highp float;
  uniform sampler2D uPainting;
  varying vec2 vUv;
  varying float vShade;
  void main() {
    vec3 col = texture2D(uPainting, vUv).rgb * vShade;
    gl_FragColor = vec4(col, 1.0);
  }
`

export function SourceCypress() {
  const paintingData = useImageData('/reference/painting.jpg')
  const painting = useTexture('/reference/painting.jpg')

  useEffect(() => {
    painting.colorSpace = NoColorSpace
    painting.flipY = false
    painting.needsUpdate = true
  }, [painting])

  const geometry = useMemo(() => {
    if (!paintingData) return null
    const slices = extractCypressSlices(paintingData)
    if (slices.length < 6) return null

    const rows = slices.length
    const vTip = slices[0].v
    const vBase = slices[rows - 1].v
    const positions: number[] = []
    const uvs: number[] = []
    const shade: number[] = []
    const indices: number[] = []
    const centre = new Vector3()
    const p = new Vector3()
    const viewDir = new Vector3()
    const right = new Vector3()
    const up = new Vector3(0, 1, 0)

    for (let i = 0; i < rows; i++) {
      const s = slices[i]
      const t = (s.v - vTip) / (vBase - vTip) // 0 tip → 1 base
      const dist = DIST_TIP + (DIST_BASE - DIST_TIP) * t
      sourceUVAtDistance(s.uCentre, s.v, dist, centre)
      viewDir.copy(centre).sub(HOME_EYE).normalize()
      right.crossVectors(viewDir, up).normalize().negate() // +u (painting right) in world
      // tip rings pinch toward a point
      const pinch = i === 0 ? 0.2 : 1
      const halfAcross = s.halfWidth * MARGIN * worldPerU(dist) * pinch
      const halfDepth = halfAcross * DEPTH_RATIO

      for (let j = 0; j <= SEG; j++) {
        const a = (j / SEG) * Math.PI * 2
        const nx = Math.cos(a)
        const nz = Math.sin(a)
        // licking tongues: coherent angular noise drifting upward, sharpened outward (the F4 recipe)
        const ridge = vnoise(nx * 2.4 + 10, nz * 2.4 + t * 6.5 + 4)
        const fine = vnoise(nx * 5 + 2, nz * 5 + t * 10 + 7)
        let bump = (ridge - 0.5) * 0.8 + (fine - 0.5) * 0.35
        bump = bump > 0 ? bump * 1.35 : bump * 0.55
        const swell = 1 + bump * 0.4 * (0.4 + 0.6 * (1 - t))
        p.copy(centre)
          .addScaledVector(right, nx * halfAcross * swell)
          .addScaledVector(viewDir, nz * halfDepth * swell)
        positions.push(p.x, p.y, p.z)
        const q = worldToSourceUV(p)
        uvs.push(
          s.uCentre + (q.u - s.uCentre) * UV_COMPRESS,
          Math.min(0.995, s.v + (q.v - s.v) * UV_COMPRESS),
        )
        // modelling: outward tongues catch light, the sightline flanks fall dark
        const exposure = Math.max(0, bump)
        shade.push(0.66 + 0.5 * exposure + 0.12 * Math.max(0, nx))
      }
    }

    for (let i = 0; i < rows - 1; i++) {
      for (let j = 0; j < SEG; j++) {
        const a = i * (SEG + 1) + j
        const b = a + 1
        const c = a + SEG + 1
        const d = c + 1
        indices.push(a, c, b, b, c, d)
      }
    }

    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
    g.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2))
    g.setAttribute('aShade', new BufferAttribute(new Float32Array(shade), 1))
    g.setIndex(indices)
    g.computeVertexNormals()
    g.computeBoundingSphere()
    return g
  }, [paintingData])

  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: { uPainting: { value: painting } },
        vertexShader: cypressVert,
        fragmentShader: cypressFrag,
        side: DoubleSide,
      }),
    [painting],
  )

  useEffect(() => {
    /* eslint-disable react-hooks/immutability -- intentional R3F uniform write */
    material.uniforms.uPainting.value = painting
    /* eslint-enable react-hooks/immutability */
  }, [material, painting])
  useEffect(() => () => geometry?.dispose(), [geometry])
  useEffect(() => () => material.dispose(), [material])

  if (!geometry) return null
  return <mesh geometry={geometry} material={material} renderOrder={3} />
}
```

- [ ] **Step 4.2: Swap it into the stage.** In `src/scene/Diorama.tsx`:
  - Add `import { SourceCypress } from './SourceCypress'`.
  - Replace the final-mode cypress block:
```tsx
      {debug === 'stage' ? (
        <>
          <Cypress position={[-1.3, 0, 0.8]} height={3.0} rot={0.4} girth={1.1} />
          <Cypress position={[-1.12, 0, 1.02]} height={2.2} rot={-0.5} scale={0.9} seed={13} girth={1.2} />
        </>
      ) : (
        <>
          <Cypress position={[-1.46, 0.02, 0.9]} height={2.34} rot={0.3} scale={0.92} girth={0.62} />
        </>
      )}
```
with:
```tsx
      <SourceCypress />
```
  (The prop `Cypress` component itself is deleted in Task 5 with the rest of the props; leave the
  function in place this task if removing it would break `stage` debug compilation — the mounted
  usage above is what matters.)

- [ ] **Step 4.3: Delete dead fin-volume code.**
```bash
git rm src/scene/CypressFlameVolume.tsx src/scene/cypressFlameGeometry.ts scripts/cypress-flame.test.ts
```
Remove ` scripts/cypress-flame.test.ts` from `test:sky` in `package.json`.

- [ ] **Step 4.4: Verify + capture + LOOK.**
```bash
npm run lint && npm run test:sky && npm run build
npm run capture:diorama -- output/playwright/painting-owned-2026-07-08/s2-cypress
```
Read `desktop-centre.png`, `desktop-drag-left-boundary.png`, `desktop-drag-right-boundary.png`,
`desktop-orbit-preset.png`, `mobile-centre.png` beside the painting. Judge: ONE cypress carrying
the painting's dark greens/browns; silhouette licks like the painting's flame; no void or second
tree at the drag boundaries; the flame reads as a solid form at the orbit preset. Retune cap 4 —
likely knobs: `DIST_BASE` (screen size vs matte), `MARGIN`, `UV_COMPRESS` (edge colour bleed),
noise amplitudes, `lumMax` in the extraction.

- [ ] **Step 4.5: Commit.**
```bash
git add -A
git commit -m "feat(3d): one source-projected cypress flame replaces the prop cone"
```

---

### Task 5: Source-relief foreground — the painting's ground given depth (slice 3)

Replace FloatingIsland + RollingHills + prop village/church/bushes/blades/stones with
`SourceReliefTerrain`: a relief grid over the painting's foreground band (skyline → below frame),
depth-staged from hills (far) to ground (near), plus a dark under-root so it still reads as a
floating object from orbit. The matte drops its lower band (the terrain owns those pixels now —
this kills the double village); the matte keeps only the cypress strip.

**Files:**
- Create: `src/scene/SourceReliefTerrain.tsx`
- Modify: `src/scene/Diorama.tsx` (final stage = `SourceReliefTerrain` + `SourceCypress` only; delete prop components)
- Modify: `src/scene/DioramaForegroundMatte.tsx` (cypress-only mask)
- Delete: `src/scene/dioramaLayout.ts`
- Modify: `scripts/diorama-layout.test.ts` (keep camera/orbit/contract tests; drop blade/stone tests)

**Interfaces:**
- Consumes: `sourceUVAtDistance`, `worldToSourceUV` (via grid construction), `extractSkylineV`
  (Task 3), `useImageData` for `/reference/painting.jpg` + `/reference/sky-mask.png`,
  `PALETTE.hills` for the root colours.
- Produces: `<SourceReliefTerrain />` — self-positioning, no props.

- [ ] **Step 5.1: Implement** `src/scene/SourceReliefTerrain.tsx`:
```tsx
import { useEffect, useMemo } from 'react'
import { useTexture } from '@react-three/drei'
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  NoColorSpace,
  ShaderMaterial,
  Vector3,
} from 'three'
import { useImageData } from './useImageData'
import { extractSkylineV } from './paintingRegions'
import { sourceUVAtDistance } from './sourceProjection'
import { PALETTE } from './palette'

/**
 * The painting's foreground given depth: a relief grid spanning the full painted ground band —
 * village, hills, trees — whose home-view pixels ARE the painting (projective registration), and
 * whose depth stages from the hills (far) through the village to the near ground, with rolling
 * swells and luminance micro-relief (moonlit crests raised like impasto). Below the painted band
 * a dark earthen root closes the volume so the diorama reads as a floating object, dissolving to
 * night like the painting's own darkness. Replaces the grey prop world entirely.
 */

const COLS = 140
const ROWS = 84
const ROOT_ROWS = 12
const U_MIN = -0.03 // overscan past the frame so the edges never expose a knife-cut
const U_MAX = 1.03
const V_BOTTOM = 1.06 // continue below the frame bottom
const SKY_SEAL = 0.02 // top edge overlaps this far above the skyline, fading out
const DIST_FAR = 8.8 // skyline / hills distance from the home eye
const DIST_NEAR = 6.1 // frame-bottom ground distance
const ROLL_AMP = 0.55 // rolling-hill depth swells
const IMPASTO_AMP = 0.5 // luminance relief: bright paint raised toward the eye
const EDGE_CURL = 2.6 // overscan columns curl away toward the shell
const ROOT_DEPTH = 1.9 // how far the under-root drops below the painted band

function hash2(x: number, y: number) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return s - Math.floor(s)
}
function vnoise(x: number, y: number) {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const xf = x - xi
  const yf = y - yi
  const u = xf * xf * (3 - 2 * xf)
  const v = yf * yf * (3 - 2 * yf)
  const a = hash2(xi, yi)
  const b = hash2(xi + 1, yi)
  const c = hash2(xi, yi + 1)
  const d = hash2(xi + 1, yi + 1)
  return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v
}
const smooth = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)))
  return t * t * (3 - 2 * t)
}

const terrainVert = /* glsl */ `
  attribute float aPaint;
  attribute float aShade;
  attribute vec3 aRootColor;
  varying vec2 vUv;
  varying float vPaint;
  varying float vShade;
  varying vec3 vRootColor;
  void main() {
    vUv = uv;
    vPaint = aPaint;
    vShade = aShade;
    vRootColor = aRootColor;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const terrainFrag = /* glsl */ `
  precision highp float;
  uniform sampler2D uPainting;
  varying vec2 vUv;
  varying float vPaint;
  varying float vShade;
  varying vec3 vRootColor;
  void main() {
    vec3 paint = texture2D(uPainting, vUv).rgb;
    // warm lit windows glow: yellow pixels pushed past 1.0 so bloom catches them as light
    float warm = smoothstep(0.16, 0.34, paint.r + paint.g - 2.2 * paint.b);
    vec3 lit = paint + paint * warm * 0.5;
    vec3 col = mix(vRootColor, lit * vShade, vPaint);
    gl_FragColor = vec4(col, 1.0);
  }
`

export function SourceReliefTerrain() {
  const paintingData = useImageData('/reference/painting.jpg')
  const maskData = useImageData('/reference/sky-mask.png')
  const painting = useTexture('/reference/painting.jpg')

  useEffect(() => {
    painting.colorSpace = NoColorSpace
    painting.flipY = false
    painting.needsUpdate = true
  }, [painting])

  const geometry = useMemo(() => {
    if (!paintingData || !maskData) return null
    const skyline = extractSkylineV(maskData, COLS + 1)
    const lumAt = (u: number, v: number) => {
      const x = Math.min(paintingData.width - 1, Math.max(0, Math.floor(u * paintingData.width)))
      const y = Math.min(paintingData.height - 1, Math.max(0, Math.floor(v * paintingData.height)))
      const i = (y * paintingData.width + x) * 4
      return (0.299 * paintingData.data[i] + 0.587 * paintingData.data[i + 1] + 0.114 * paintingData.data[i + 2]) / 255
    }

    const earth = new Color(PALETTE.hills)
    const abyss = earth.clone().multiplyScalar(0.075)
    const rootTop = earth.clone().multiplyScalar(0.6)

    const rows = ROWS + ROOT_ROWS + 1
    const cols = COLS + 1
    const positions = new Float32Array(rows * cols * 3)
    const uvs = new Float32Array(rows * cols * 2)
    const aPaint = new Float32Array(rows * cols)
    const aShade = new Float32Array(rows * cols)
    const aRoot = new Float32Array(rows * cols * 3)
    const p = new Vector3()
    const cc = new Color()

    let vi = 0
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const u = U_MIN + ((U_MAX - U_MIN) * c) / COLS
        const uc = Math.min(1, Math.max(0, u))
        const vTop = skyline[c] - SKY_SEAL
        const isRoot = r > ROWS
        const tv = Math.min(1, r / ROWS)
        const v = vTop + (V_BOTTOM - vTop) * tv
        const vc = Math.min(0.995, Math.max(0, v))

        // depth: hills far → ground near, rolling swells, luminance impasto
        const lum = lumAt(uc, vc)
        const roll = (vnoise(u * 6.5 + 2, v * 5 + 9) - 0.5) * ROLL_AMP * (1 - tv * 0.6)
        const impasto = (lum - 0.5) * IMPASTO_AMP
        let dist = DIST_FAR - (DIST_FAR - DIST_NEAR) * smooth(0, 1, tv) - roll - impasto
        // overscan columns curl away so the side view shows a curved edge, not paper
        const overL = smooth(0.02, -0.02, u)
        const overR = smooth(0.98, 1.02, u)
        dist += (overL + overR) * EDGE_CURL

        sourceUVAtDistance(uc, vc, dist, p)

        if (isRoot) {
          // the under-root: drop below the last painted row, pulling inward to a keel
          const k = (r - ROWS) / ROOT_ROWS
          const drop = ROOT_DEPTH * (k * k * 0.7 + k * 0.3)
          const rocky = (vnoise(u * 9 + 3, k * 4 + 6) - 0.5) * 0.3 * (1 - k)
          p.y -= drop + rocky
          p.x *= 1 - 0.5 * k
          p.z *= 1 - 0.5 * k
          cc.copy(rootTop).lerp(abyss, smooth(0.05, 0.85, k))
          aPaint[vi / 3] = 0
        } else {
          // top band: fade the sky-seal overlap in (aPaint doubles as alpha-ish shade ramp)
          aPaint[vi / 3] = 1
          const seal = smooth(0, 1, (v - (vTop - 0.0001)) / SKY_SEAL)
          aShade[vi / 3] = 0.92 + 0.08 * Math.min(1, seal)
          cc.set(0, 0, 0)
        }
        if (isRoot) aShade[vi / 3] = 1

        positions[vi] = p.x
        positions[vi + 1] = p.y
        positions[vi + 2] = p.z
        uvs[(vi / 3) * 2] = uc
        uvs[(vi / 3) * 2 + 1] = vc
        aRoot[vi] = cc.r
        aRoot[vi + 1] = cc.g
        aRoot[vi + 2] = cc.b
        vi += 3
      }
    }

    const indices: number[] = []
    for (let r = 0; r < rows - 1; r++) {
      for (let c = 0; c < COLS; c++) {
        const a = r * cols + c
        const b = a + 1
        const d = a + cols
        const e = d + 1
        indices.push(a, d, b, b, d, e)
      }
    }

    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(positions, 3))
    g.setAttribute('uv', new BufferAttribute(uvs, 2))
    g.setAttribute('aPaint', new BufferAttribute(aPaint, 1))
    g.setAttribute('aShade', new BufferAttribute(aShade, 1))
    g.setAttribute('aRootColor', new BufferAttribute(aRoot, 3))
    g.setIndex(indices)
    g.computeVertexNormals()
    g.computeBoundingSphere()
    return g
  }, [maskData, paintingData])

  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: { uPainting: { value: painting } },
        vertexShader: terrainVert,
        fragmentShader: terrainFrag,
        side: DoubleSide,
      }),
    [painting],
  )

  useEffect(() => {
    /* eslint-disable react-hooks/immutability -- intentional R3F uniform write */
    material.uniforms.uPainting.value = painting
    /* eslint-enable react-hooks/immutability */
  }, [material, painting])
  useEffect(() => () => geometry?.dispose(), [geometry])
  useEffect(() => () => material.dispose(), [material])

  if (!geometry) return null
  return <mesh geometry={geometry} material={material} renderOrder={0} />
}
```

- [ ] **Step 5.2: Strip the prop world.** Rewrite `src/scene/Diorama.tsx` to:
```tsx
import { SourceCypress } from './SourceCypress'
import { SourceReliefTerrain } from './SourceReliefTerrain'

/**
 * The Starry Night diorama, painting-owned: every visible surface samples the painting through the
 * home-view projection (SourceReliefTerrain, SourceCypress); the camera-locked source sky/matte
 * stack (PaintingFlowSky3D) carries the ribbons behind them. The earlier prop world (floating
 * island, box village, grey hills, blades, stones) is deleted — it competed with the painting and
 * failed every taste gate.
 */
export function Diorama({ debug = 'final' }: { debug?: 'final' | 'stage' }) {
  void debug // stage/final render the same forms; stage differs only by omitting the sky (DioramaExperience)
  return (
    <group>
      <SourceReliefTerrain />
      <SourceCypress />
    </group>
  )
}
```
Delete `dioramaLayout.ts` (`git rm src/scene/dioramaLayout.ts`) and in
`scripts/diorama-layout.test.ts` delete the `makeTerrainBlades`/`makeRidgeStones` import and their
tests, keeping the camera/orbit/contract assertions.

- [ ] **Step 5.3: Matte becomes cypress-only** (the terrain owns the lower band now). In
  `src/scene/DioramaForegroundMatte.tsx`, `sourceForegroundMask` — delete the `lowerBand` block and
  return only the cypress term:
```glsl
    float cypress = foreground * left * dark * vertical * bottomFade;
    return smoothstep(0.03, 0.22, cypress * 1.22);
```

- [ ] **Step 5.4: Verify + capture + LOOK.**
```bash
npm run lint && npm run test:sky && npm run build
npm run capture:diorama -- output/playwright/painting-owned-2026-07-08/s3-relief
```
Judge against the painting: head-on the lower third IS the painting's village/hills/ground; no
grey pedestal, no box houses, no spikes, ONE village; drag boundaries show parallax without a
skyline void; orbit preset shows a floating painted landmass with a dark root, not a wine glass;
the moon/stars/sky from slice 1 still hold. Retune cap 4 — likely knobs: `DIST_FAR/NEAR` spread,
`ROLL_AMP`, `IMPASTO_AMP`, `SKY_SEAL`, root shape, warm-window threshold.

- [ ] **Step 5.5: Commit.**
```bash
git add -A
git commit -m "feat(3d): painting-owned relief foreground replaces the prop diorama"
```

---

### Task 6: Full pass — verification, docs, gate hand-off

- [ ] **Step 6.1: Full checks.**
```bash
npm run lint && npm run test:sky && npm run build
npm run capture:diorama -- output/playwright/painting-owned-2026-07-08/final
```
Also drive reduced-motion once via the capture pages (the `paused` path freezes `uTime`; a code
read confirming `SourceCypress`/`SourceReliefTerrain` have no time-dependent motion suffices —
they are static geometry).

- [ ] **Step 6.2: Look at the final set as a whole** (all eight captures) beside
  `public/reference/painting.jpg`, and honestly name anything that still fails; do not call the
  gate passed — that is Mark's call.

- [ ] **Step 6.3: Update the project memory.** Append the session's lessons to
  `tasks/lessons.md` (what worked/failed per slice, tunable changes logged) and rewrite the
  "PICK UP HERE" block in `tasks/todo.md` to point at this plan, the capture evidence, and the
  open gate.

- [ ] **Step 6.4: Commit docs.**
```bash
git add tasks/ docs/
git commit -m "docs(tasks): record painting-owned foreground checkpoint for Mark's gate review"
```

## Self-Review (done at write time)

- **Spec coverage:** sky colour pass → Task 1; cypress-as-one-flame (architecture-proving) →
  Tasks 2–4; prop replacement + double-village kill → Task 5; 360 deferred → no task touches
  orbit; gate honesty → Task 6. Gap check: mobile framing is inherited (portrait camera
  unchanged) — reviewed in the capture steps, not rebuilt.
- **Placeholder scan:** all code blocks are complete; tunables are named with starting values and
  an explicit retune loop, which is this project's contract for visual work.
- **Type consistency:** `worldToSourceUV`/`sourceUVAtDistance`/`worldPerU` signatures match
  between Task 2 definition and Task 4/5 consumers; `CypressSlice`/`extractCypressSlices`/
  `extractSkylineV` match between Task 3 and Tasks 4/5; `ImageData2D` = `{ data, width, height }`.
