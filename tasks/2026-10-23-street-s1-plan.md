# Street S1 — the street's look — Implementation Plan (v2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One street of Van Gogh's village, built in code at walking distance, seen from five fixed points along its
path under the painting's moving sky, good enough for Mark to decide whether slices 2 to 4 are built.

**Architecture:** A new scene, `Street`, mounts inside the diorama's canvas behind `?street=1` (lazy-loaded) in place
of the island, the cypress and the village. The diorama's sky stays mounted. The houses and the church are volumes
with the village knot's proportions. Every face is clad in ribbons traced in the land's flow field over a painted
source rectangle of the scan, resampled to the face's aspect, clipped to the face's outline and laid on its plane,
with thick ink outlines along the edges. The trees are the land's stroked domes on the street's flat ground. A fog
term in the street's own materials closes the far end.

**Tech Stack:** Vite, React, TypeScript, three.js, React Three Fiber, drei. Tests run under `node --test` in
`npm run -s test:sky`. No new dependency.

**Spec:** `docs/superpowers/specs/2026-10-23-village-street-design.md` (approved by Mark, 2026-10-23). This plan is
its slice 1. Read both.

**v3 (2026-10-23):** v2 folded Codex's plan review (`scratch/street-s1-2026-10-23/plan-review-codex.md`, F1–F18, REVISE)
and the worker's buildability read (`plan-review-worker.md`, B1–B14, BLOCKED). v3 folds their confirmation reads
(`plan-confirm-codex.md`: F10, F12, F13 open, F19 new. `plan-confirm-worker.md`: B15 new). The dispositions are at
the end.

## Global Constraints

- The bar (`CLAUDE.md`, locked): motion and colour derived from the painting. The street is invented, so it
  "continue[s] that same derived style". Surfaces are painted in strokes, not in a generic texture.
- Everything in the street is built in code. No Blender (Mark: "keep it in code"). No new npm package.
- The reference order: the scan and `public/reference/palette.json` first. Simon Lee's village answers only what the
  scan cannot show at walking distance (volumes, outlines, fog). Nothing of his is copied.
- Stroke scale: a stroke's width and length are set as a fraction of a reference height measured on the scan at 1:1
  (Task 1), never in screen pixels.
- Palette tolerance: ΔE76 < 10 per surface class (Tunables).
- Performance (locked): 60 fps desktop, 30 fps mid-tier mobile. The canvas renders at DPR up to 1.5
  (`DioramaExperience.tsx:364`). Performance runs use DPR 1.5.
- Reduced motion (locked): the street's sky is the painted-light still. Two frames apart in time stay byte-identical.
- The diorama does not change: without `?street=1`, every pinned capture in Task 0's matrix is byte-identical.
- The sky: a dome of radius 6 about the world origin (`skyMapping.ts:4`). The painted arc spans ±71° across and +52°
  up about the home's forward direction. The strokes fade out from v 0.76 (`dioramaSkyProjection.ts:28`). Below them
  the gradient sphere draws with no depth test. No gradient band, empty back or invented sky is on screen in the
  street.
- Retune cap: 4 passes for this slice.
- Git: branch `feat/street-s1`, local only until Mark has seen the captures. It does not reach `main` before Mark's
  edit of the camera criterion in `CLAUDE.md` (design C17).
- Evidence: `scratch/street-s1-2026-10-23/` (gitignored), one folder per task. Never a path at the repository root.
- British English. Conventional commits, `git commit -- <paths>`. One commit per task at least.

## Review Focus

1. **A plain visit, no `?street`.** Today's diorama, bit for bit, and the main bundle no larger. Pinned in Task 0's
   matrix, Task 4's G3 and the bundle check.
2. **A portrait phone.** At 390 × 844 no gradient band at any station. Pinned in Task 8 Step 3.
3. **Reduced motion with `?street=1`.** The painted-light sky, frames byte-identical. Pinned in Task 8 Step 2.
4. **A failed or slow asset.** No half-built street. The street reports ready and shows the sky only. Pinned in
   Task 4 (the readiness reducer and the `?streetFail=` captures).
5. **A rotation mid-visit.** The field of view switches and no stroke is rebuilt. Pinned in Task 8 Step 4.

---

## Roles

Lead: Claude (`w4:p1`). Reviewer: Fable (`w4:p6`, the Consultant tab), from 2026-10-23 when Codex's usage ran low
(Mark: "please put your review to Fable instead"). Codex (`w4:p4`) read the plan and is held back. Worker:
Antigravity (`w4:p5`). The Lead builds Tasks 1, 3, 5 and 9 and gates every task. The worker builds Tasks 0,
2, 4, 6's plumbing, 7 and 8 from briefs, red test first, and reports evidence, not verdicts. The worker serves its
worktree on 5181 (`npx vite --port 5181 --strictPort --host 127.0.0.1`). The Lead serves on 5182.

## Files

- Create `src/scene/villageKnot.ts`: the village knot's data (`Building`, `Pigment`, the neighbours, the context
  houses, the church descriptor). Node-importable: `.ts` imports, type-only imports, no JSON.
- Create `src/scene/strokeGeometry.ts`: `strokeGeometry` moved out of `BrushIsland.tsx`, unchanged, exported.
- Create `src/scene/streetLayout.ts`, `src/scene/streetStrokes.ts`, `src/scene/streetGeometry.ts`,
  `src/scene/streetFog.ts`, `src/scene/streetMode.ts` (the flags and the readiness reducer), `src/scene/Street.tsx`.
- Create `scripts/flat-street-gate.ts`, `scripts/check-street-colour.ts`, `scripts/check-street-rotation.mjs`.
- Create tests `scripts/street-layout.test.ts`, `scripts/street-strokes.test.ts`, `scripts/street-sky.test.ts`,
  `scripts/street-mode.test.ts`, and add them to `test:sky` in `package.json`.
- Modify `src/scene/villageGeometry.ts` (its knot constants come from `villageKnot.ts`), `src/scene/BrushIsland.tsx`
  (imports `strokeGeometry`), `src/scene/landDomes.ts` (`groundAt`), `src/App.tsx` and
  `src/scene/DioramaExperience.tsx` (street mode), `src/scene/PaintingFlowSky3D.tsx` (the optional `anchor`).
- Modify `scripts/capture-diorama.mjs` (`--dpr`, `p50Ms`, the drawing buffer), `scripts/capture-sky-frames.mjs`
  (`--wait-for`), `scripts/export-village.mjs` (prints a SHA-256 of the three geometries).

---

### Task 0: Tools and baseline (worker)

**Files:** `scripts/capture-diorama.mjs`, `scripts/capture-sky-frames.mjs`, `scripts/export-village.mjs`. Evidence in
`scratch/street-s1-2026-10-23/baseline/`.

- [ ] **Step 1:** `git switch -c feat/street-s1 main`. Create a worktree for it and serve it on 5181.
- [ ] **Step 2: The tools.** `capture-diorama.mjs`: a `--dpr <n>` option (default 1, today's behaviour), `p50Ms`
  (`intervals[Math.floor(intervals.length / 2)]`) in `readPerf`, and the drawing buffer's width and height in the
  summary. `capture-sky-frames.mjs`: a `--wait-for '<js>'` option that polls the expression every 200 ms until it is
  truthy, at most 30 s, before pinning the clock. Absent, today's behaviour. `export-village.mjs`: print
  `sha256 <hex>` over the solid's, the skin's and the paint's arrays in that order.
- [ ] **Step 3: The pinned matrix,** each run twice into `baseline/run1/` and `baseline/run2/`. Every PNG of run 1
  must be identical to its twin in run 2 (`compare-frames.mjs` per file, `identical: true`) before it is a fixture.
  - `base`: `?mode=diorama&clean=1&arrival=0`, `--times 5,11.2`, desktop.
  - `mobile`: the same URL, `--times 5 --viewport mobile`.
  - `light`: `&sky=light`, `--times 5`.
  - `orbit`: `&view=orbit`, `--times 5` (a camera that is not the home's).
  - `arrival`: `?mode=diorama&clean=1&arrival=1`, `--times 0,0,0 --arrival-times 1,4.5,7`.
  - `reduced`: `DIORAMA_CAPTURE_URL='http://127.0.0.1:5181/' node scripts/check-reduced-motion.mjs
    baseline/runN/reduced`. Only its reduced-motion still frames enter the cross-run comparison. Its control frames
    move by design (`check-reduced-motion.mjs:231–238`). The script's own exit status covers them within a run.
- [ ] **Step 4: The rest.** `node scripts/export-village.mjs scratch/street-s1-2026-10-23/baseline/village` (record
  the hash). `npm run -s build` (record the main chunk's size in `baseline/bundle.txt`). Perf:
  `DIORAMA_CAPTURE_URL=http://127.0.0.1:5181/ DIORAMA_CAPTURE_EXTRA='arrival=0' node scripts/capture-diorama.mjs
  baseline/perf --perf --dpr 1.5` (record p50, p95, the drawing buffer and `info.triangles`).
- [ ] **Step 5:** Commit the tools: `chore(capture): --dpr, p50, --wait-for and the village hash (S1 task 0)`.

The street's budget: its scene's `info.triangles` at most the diorama's from Step 4 (the same sky, the foreground
swapped like for like), desktop p95 at most 0.5 ms above the diorama's at DPR 1.5 (Task 0 measured 17.3 ms: the
headless browser is locked to 60 Hz, so 16.7 ms is the floor, not a bar). Mark's phone reading on production
(`starrynight.markma.dev/?perf=1`) is asked for by the Lead. It does not block the build.

### Task 1: The stroke scale, measured (Lead) — done 2026-10-23

Crops of the 3840 scan at 1:1 (`scratch/street-s1-2026-10-23/t1/`). Widths are full stroke widths. Lanes are the
spacing of the luminance minima across the strokes (a profile measure, the bristle scale inside a stroke). The
reference height is the source's own height for walls and roofs (its eave height or its slope length), and a wall's
height (60 px at 3840) for the ground.

| source | rectangle (1600 px) | stroke width / ref | length / ref | direction | lanes |
|---|---|---|---|---|---|
| walls (`blueWallA`, `blueWallB`) | inscribed in the patch | 0.12–0.20 | 0.6–2.0 | horizontal | 6–8 px |
| pale walls (`churchPlaster`) | inscribed | 0.10–0.15 | 0.5–1.0 | vertical | 4–5 px |
| roofs (`stripedRoof`, `blueRoof`) | inscribed | 0.15–0.30 | 0.6–1.0 | down the slope | 5 px |
| ground (the field) | 760, 1214 – 935, 1262 | 0.15–0.25 of a wall | 1.5–6 walls | horizontal | 8 px (q3 14) |
| outlines | along house and roof edges | 0.12–0.18 of the wall | the edge | along the edge | — |

`OUTLINE_FRACTION` = 0.14 of the wall's height. The painting's outlines are thick: the diorama's `edge()` widths
(0.004–0.008 on a 0.2 eave) are a fifth of them. The field rectangle overlaps no `VILLAGE_FOOTPRINT` box, no mass
and no house: the painting's houses extend past the footprint list, so a footprint test alone is not enough.

### Task 2: The knot and the layout (worker)

**Files:** Create `src/scene/villageKnot.ts`, `src/scene/streetLayout.ts`, `scripts/street-layout.test.ts`.
Modify `src/scene/villageGeometry.ts`.

**Interfaces:**
- Produces from `villageKnot.ts`: `type Pigment`, `type Building` (moved unchanged from `villageGeometry.ts:18–22`),
  `VILLAGE_NEIGHBOURS`, `VILLAGE_CONTEXT` (the arrays moved unchanged), and
  `VILLAGE_CHURCH: { nave: Building; belfry: { cx: 0.066; cz: 0.235; width: 0.09; yaw: 0.65; floorDrop: 0.035; topY:
  0.445 }; spireTip: { dx: -0.012; y: 1.125; dz: -0.008 } }` (the literals of `villageGeometry.ts:237–262`).
  `villageGeometry.ts` imports these and keeps everything else. The spire's height is `spireTip.y` minus the belfry's
  floor (`islandHeightAt(cx, cz) − floorDrop` on the island, 0 − `floorDrop` in the street).
- Produces from `streetLayout.ts`:
  - `STREET = { pathLength: 1.2, eye: 0.09, behind: 0.18, lookAhead: 0.6, lookHeight: 0.06, near: 0.004, far: 48,
    fov: { landscape: 50, portrait: 75 }, originA: [0, 0, 5.0], wallRef: 0.2, forward: [-0.1041, 0, -0.9946] }`.
    `forward` is the normalised ground projection of `DIORAMA_CAMERAS.design`'s target minus its position, typed
    `readonly [number, number, number]`, and a test checks it against that computation.
  - `pathPoint(t: number): [number, number, number]` and `pathTangent(t)`: the path starts at the street's origin,
    runs along `forward` for `t` ≤ 0.6, then bends 12° to the right over t 0.6–0.7 and runs straight to t = 1.
  - `type StreetHouse = Building & { side: -1 | 1; at: number }`. `STREET_HOUSES`: eight houses. Left (side −1) at
    t 0.05, 0.25, 0.45, 0.65. Right (side +1) at t 0.12, 0.33, 0.53, 0.72. Proportions cycle through
    `VILLAGE_NEIGHBOURS` then `VILLAGE_CONTEXT`. Each house's `w` runs along the path and its `d` across it. Its
    front face stands 0.1 from the path's centreline. Its yaw squares it to the path's tangent at `at`.
  - `STREET_CHURCH`: `VILLAGE_CHURCH` with the nave's door end facing down the path, its centre 0.2 beyond
    `pathPoint(1)` along the tangent.
  - `STREET_TREES: readonly LandMass[]`: `olive-church` at t 0.35, side −1, 0.55 from the centreline. `olive-right` at
    t 0.6, side +1, 0.55. `orchard-lower` at t 1.0, side +1, 0.45. Each keeps its `box`, `class` and `width`.
  - `streetGroundAt(x: number, z: number): number`: 0 everywhere in slice 1.
  - `stationPose(i: 0 | 1 | 2 | 3 | 4, portrait: boolean): { position; target; fov; near; far }`, stations at
    t = 0, 0.25, 0.5, 0.75, 1. Position: `pathPoint(t) − pathTangent(t) × behind + [0, eye, 0]`. Target, stations
    0–3: `pathPoint(t) + pathTangent(t) × lookAhead + [0, lookHeight, 0]`. Station 4: the church's door gable at
    height 0.25. `fov` from `STREET.fov` by orientation.

- [ ] **Step 1: Write the failing tests** in `scripts/street-layout.test.ts`:
  - `the knot moved unchanged`: `VILLAGE_CHURCH`'s belfry and spire values equal the literals above, and
    `VILLAGE_NEIGHBOURS.length` and `VILLAGE_CONTEXT.length` equal today's counts.
  - `forward is the home camera's`: within 1e-4 of the computed direction.
  - `every object lies inside the dome under method A`: every house corner, the spire tip and every tree's top,
    offset by `STREET.originA`, lies at most 5.8 from the origin.
  - `stations stay inside the painted arc`: heading within ±60° of `forward`, pitch within −20° to +40°.
  - `the near plane clears the ground`: `near` ≤ `eye` / 10, and every station's camera height ≥ 4 × `near`.
  - `houses never block the path`: no footprint within 0.08 of the centreline.
- [ ] **Step 2:** `node --test scripts/street-layout.test.ts`. Expected: FAIL (module not found).
- [ ] **Step 3:** Implement `villageKnot.ts` and `streetLayout.ts`. Point `villageGeometry.ts` at the knot.
- [ ] **Step 4:** Run the tests and `npm run -s test:sky`. Expected: PASS. Run `export-village.mjs`: the hash equals
  Task 0's.
- [ ] **Step 5:** Commit: `feat(street): the village knot as data, the street's layout (S1 task 2)`.

### Task 3: The face strokes and the flat panel (Lead)

**Files:** Create `src/scene/strokeGeometry.ts`, `src/scene/streetStrokes.ts`, `scripts/flat-street-gate.ts`,
`scripts/street-strokes.test.ts`. Modify `src/scene/BrushIsland.tsx` (the import only).

**Interfaces:**
- Consumes: `traceCypressRibbons`, `ribbonColumns`, `CYPRESS_RIBBON_CONFIG`, `TexelAccept` (`cypressStrokes.ts`),
  `pushDrapedRibbon` (`brushForms.ts`), `VILLAGE_PATCHES`, `GROUND_TEXEL` (`landStrokes.ts`).
- Produces:
  - `strokeGeometry(arrays, stroke, seed, bend?)` in `strokeGeometry.ts`, as today, plus a length check: it throws
    when `stroke.length ≠ 2 × vertices` or `seed.length ≠ vertices`.
  - `STREET_SOURCES: Record<'wallA' | 'wallB' | 'plaster' | 'roofStriped' | 'roofBlue' | 'roofSienna' | 'field',
    [number, number, number, number]>`: axis-aligned rectangles in painting px (1600 × 1267), each inscribed in its
    `VILLAGE_PATCHES` quad, and `field` = `[760, 1214, 935, 1262]`.
  - `type StreetFace = { origin: Vector3; u: Vector3; v: Vector3; normal: Vector3; shape: 'quad' | 'triangle';
    kind: 'wall' | 'roof' | 'ground' | 'path'; source: keyof typeof STREET_SOURCES; refHeight: number; seed: number;
    mirror: boolean }`. A triangle's apex is at (0.5, 1) of the face. `u` and `v` span the face.
  - `faceCrop(flow, source, faceWidth, faceHeight, mirror, minRows = 64): { crop: ImageData2D; rows: RibbonRows }`:
    the land flow bilinear-sampled over the source rectangle into a crop whose pixels are square on the face
    (`rows` = max(`minRows`, the source's flow rows × 2), `cols` = round(`rows` × `faceWidth` / `faceHeight`)). A
    source direction (dx, dy) in flow pixels becomes (dx × cols / srcCols, dy × rows / srcRows), normalised. B is 255
    on every texel for walls and roofs, and the flow's own support for the ground and the path. `mirror` flips the
    columns, negates dx, and swaps `rows.uv`'s u0 and u1 so the pigment follows.
  - `faceConfig(face: StreetFace, faceWidth: number, faceHeight: number, count: number): CypressRibbonConfig`: Task
    1's fractions converted. Half-width in crop widths = 0.5 × f × `refHeight` / `faceWidth`. Lengths in crop heights
    = L × `refHeight` / `faceHeight`. `step` = 2 / (rows − 1). `heading: 'continuous'`, `perSampleColours: true`.
  - `OUTLINE_FRACTION = 0.14`.
  - `traceFace(face, faceWidth, faceHeight, flow, painting): { arrays: BrushArrays; stroke: number[]; seed: number[];
    ribbons: number }`. Each ribbon's columns are laid at `origin + px·u + (1 − py)·v + lift·normal`. Samples
    outside the face's shape, grown by half an outline width, are cut and the ribbon split into runs. Runs under three samples
    go. `stroke` and `seed` per vertex as `buildLandStrokes` fills them (`landStrokes.ts:229–233`). Accepted pigments:
    every texel for walls and roofs, `GROUND_TEXEL` for the ground, and the ground texels at or above the field's
    70th luminance percentile for the path.
  - `outlineFace(face, edges, ink, seed): { arrays; stroke; seed }`: one tapered ribbon per edge, full width
    `OUTLINE_FRACTION` × `refHeight`, wobbling by at most a quarter of its width.

- [ ] **Step 1: Write the failing tests** in `scripts/street-strokes.test.ts`:
  - `a face maps its crop's corners exactly`, `mirror` swapping left and right in both position and pigment.
  - `stroke width is the measured fraction at any heading`: horizontal, vertical and 45° ribbons on faces of aspect 4
    and 0.5 have a world half-width at their first sample of 0.5 × f × `refHeight`, within 2%.
  - `the outline width is 0.14 of the wall`: the literal 0.14, for `refHeight` 0.1 and 0.3.
  - `a gable keeps its strokes inside`: every emitted vertex of a triangle face lies inside the triangle grown by half
    an outline width. The same for a spire face.
  - `a face is covered`: a wall's ribbons rasterised at 200 × 100 cells cover at least 0.85 of them.
  - `every source is inscribed and the field is clear`: each source's four corners lie inside its patch quad. The
    field overlaps no `VILLAGE_FOOTPRINT` box and no `LAND_MASSES` box.
  - `the stroke attributes are whole`: `strokeGeometry` on a traced face gives `aStroke` 2 × and `aSeed` 1 × the
    vertex count, `along` from 0 to 1 along each ribbon, `across` in {0, 0.5, 1}. A face built without `stroke`
    throws.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement. Move `strokeGeometry` and point `BrushIsland.tsx` at it.
- [ ] **Step 4:** Run. Expected: PASS. `npm run -s test:sky`: green.
- [ ] **Step 5: The CPU flat panel.** `node scripts/flat-street-gate.ts scratch/street-s1-2026-10-23/t3/panel.png`:
  left, the scan's source rectangles at 1:1 of the 3840 scan. Right, at the same scale, a wall (`wallA`, 3:1), a
  roof (`roofStriped`, 2:1), the ground (`field`, 4:1) and a tree mass (`olive-church` through `buildLandTrees`'
  tracer), their ribbons and outlines drawn flat in their per-sample pigments over their underpaint.
- [ ] **Step 6: G4a.** The Lead opens the panel beside the crops at 1:1. Name what reads wrong: fur, stipple, smears,
  strokes too thin or too fat, outlines too heavy or too light. Retune `faceConfig` and redraw. Each redraw is a
  pass. Task 5 waits until the panel reads as the painting's marks.
- [ ] **Step 7:** Commit: `feat(street): strokes on a face, the outlines and the flat panel (S1 task 3)`.

### Task 4: Street mode and the mount (worker)

**Files:** Create `src/scene/streetMode.ts`, `src/scene/Street.tsx`, `src/scene/streetFog.ts`,
`src/scene/streetGeometry.ts` (a stub), `scripts/street-mode.test.ts`. Modify `src/App.tsx`,
`src/scene/DioramaExperience.tsx`, `src/scene/landDomes.ts`.

**Interfaces:**
- `streetMode.ts`:
  - `readStreetFlags(search: string): { street: boolean; station: 0 | 1 | 2 | 3 | 4; flat: boolean; ids: boolean;
    fail: 'painting' | 'flow' | 'masses' | null; anchor: 'A' | 'B'; turn: 'lock' | 'world' }`. `street` only for
    `street=1`. `station` clamps to 0–4, default 0. Defaults `anchor: 'A'`, `turn: 'lock'`.
  - `streetReadiness(s: { painting: 'pending' | 'ok' | 'failed'; flow: …; masses: … }): { ready: boolean; render:
    boolean }`. Any failure: ready, no render. Any pending and no failure: not ready, no render. All ok: ready,
    render.
  - `touchEnabled({ touch, reduced, arriving, street }): boolean`: today's `touch && !reduced && !arriving`, and false
    in street mode.
- `App.tsx`: `arrival` is false in street mode, whatever the session or `?arrival=1` say.
- `DioramaExperience.tsx`: in street mode, `Street` (lazy, `React.lazy(() => import('./Street'))`, inside the
  existing `Suspense`) replaces `Diorama`, `OrbitControls` and `ArrivalDriver` are not mounted, no arrival layer, no
  `arrivalStep` to the sky, `useTouchInput` gets `touchEnabled(...)`. The camera takes `stationPose(station,
  isPortrait)` on mount and on every orientation change, its `near` and `far` set and the projection updated. The sky
  keeps its `home` (`DIORAMA_CAMERAS.design` in landscape, `.mobile` in portrait). In street mode only, `Scene`
  installs `window.__streetCamera = () => ({ position, quaternion, fov, near, far })`, independent of the touch hook
  (which is off in street mode and installs `__camera` only when on, `useTouchInput.ts:224`, `:245`).
- `Street.tsx`: loads `/reference/painting.jpg` and `/reference/land-flow.png` through `useImageData` with `onError`,
  and `/reference/land-masses.json` by `fetch` as `BrushIsland.tsx:64–76` does, each tracked as pending, ok or
  failed. `?streetFail=` substitutes `/reference/missing.png` for that one input. It builds once with
  `buildStreet` when `streetReadiness(...).render`, sets `window.__streetReady` from `.ready` and
  `window.__streetCounts = { ribbons, triangles, builds }`, where `builds` counts calls to `buildStreet`.
- `streetFog.ts`: `FOG = { colour: PALETTE.skyHorizon, near: 0.6, far: 1.6 }` and `fogInjection(colour, near, far):
  Omit<AliveInjection, 'key'>`: a varying set in the vertex body from the attribute,
  `vFogDistance = -(modelViewMatrix * vec4(position, 1.0)).z`, because the injection's vertex body runs before
  three's `project_vertex` declares `mvPosition` (`aliveMaterial.ts:43–46`). The fragment body:
  `diffuseColor.rgb = mix(diffuseColor.rgb, uFogColour, smoothstep(uFogNear, uFogFar, vFogDistance))`. The street's
  materials only. `scene.fog` is never set.
- `landDomes.ts`: a `groundAt = islandHeightAt` parameter on `domesOf`, `liftToDomes`, `settleOnTerrain`,
  `drapeOnDomes` (its contact test at `:140`) and `buildLandTrees` (its `weigh` at `:298–303`).
- `streetGeometry.ts` (stub): `buildStreet(painting, flow, masses): StreetBuild | null`, null when any input is
  null, houses as plain underpaint boxes. Task 5 replaces the body.

- [ ] **Step 1: Write the failing tests** in `scripts/street-mode.test.ts` and `scripts/street-layout.test.ts`:
  - `flags`: absent and `street=0` give `street: false`. `street=1&station=9` gives station 4. The defaults hold.
  - `readiness`: the seven cases (all pending, one pending, each one failed, all ok) give the states above.
  - `touch is off in the street`: `touchEnabled` with `street: true` is false for every combination.
  - `the land is unchanged by groundAt`: a SHA-256 of `buildLandTrees`' strokes, solid and bend arrays with the
    default equals the value the worker records on `main` before the change.
  - `groundAt reaches every terrain read`: with `groundAt = () => 0`, a mass placed where `islandHeightAt` is above
    0.1 emits solids, strips and bend weights measured from y = 0.
  - `the street builds all or nothing`: `buildStreet` with any null input returns null.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run the tests and the suite. Capture `?street=1&station=0` with `--wait-for 'window.__streetReady'`
  and open it.
- [ ] **Step 5: G3, the diorama unchanged.** Re-run Task 0's pinned matrix on the branch into `t4/matrix/`. Every PNG
  identical to Task 0's run 1. Add `street=0` to the `base` URL once: identical to `base`. `npm run -s build`: the
  main chunk within 1 kB of `baseline/bundle.txt`, `Street` in its own chunk. `export-village.mjs`: the same hash.
- [ ] **Step 6: The fresh-session street.** A capture of `?mode=diorama&clean=1&street=1` with no `arrival`
  parameter in a new profile: `--wait-for 'window.__streetReady'`, then `--eval 'window.__streetCamera()'`. The
  position equals `stationPose(0, false).position` plus the street group's offset (`STREET.originA` under anchor A)
  within 1e-6. No arrival layer in the DOM. The capture's page errors are empty (the street's materials compile).
- [ ] **Step 7: The failed loads.** `?street=1&streetFail=painting`, `=flow`, `=masses`: each capture shows the sky
  only, `window.__streetReady` true, `window.__streetCounts` undefined.
- [ ] **Step 8:** Commit: `feat(street): street mode, the lazy mount, the station camera, the fog (S1 task 4)`.

### Task 5: The volumes and their paint (Lead)

**Files:** Modify `src/scene/streetGeometry.ts` (the stub becomes the build), `src/scene/Street.tsx`.

**Interfaces:**
- Consumes: Task 2's layout, Task 3's `traceFace` and `outlineFace`, Task 4's `fogInjection`, `groundAt`, the
  readiness and the counters.
- Produces: `buildStreet(painting, flow, masses): StreetBuild | null`, `type StreetBuild = { underpaint: BrushArrays;
  strokes: { arrays: BrushArrays; stroke: number[]; seed: number[] }; outlines: { arrays: BrushArrays; stroke:
  number[]; seed: number[] }; windows: BrushArrays; trees: LandTrees; counts: StreetCounts }`.
- Materials: strokes and outlines through `strokeGeometry` and `new MeshBasicMaterial({ vertexColors: true,
  toneMapped: false, side: DoubleSide, alphaTest: 0.5 })` with `concatInjections('street-strokes', { uniforms: {},
  ...strokeGlslWith(CYPRESS_STROKE_BODY) }, fogInjection(...))`. The ground with the land's body (`strokeGlsl`) and
  the fog. The underpaint and the windows plain, with the fog.

- [ ] **Step 1: G4b, the GPU flat panel.** `?street=1&flat=1`: an orthographic camera facing a board with Task 3's
  four panel faces laid flat in a row, built by `traceFace` and drawn with the production materials and attributes.
  Capture it pinned at t = 5 into `t5/flat-gpu.png`. Its page errors must be empty: a shader that does not compile
  fails here, before any judgement. Open it beside the CPU panel at 1:1. The body's lanes, rake,
  fray and dry tails must read as paint on a wall, not as fur or plastic. Retune `CYPRESS_STROKE_BODY`'s use here
  (a street body, if needed) before the volumes.
- [ ] **Step 2: Write the failing tests** in `scripts/street-strokes.test.ts`:
  - `every face of a house is clad`: each wall, gable and roof plane of every house has at least 12 ribbons, and every
    edge an outline ribbon.
  - `few warm windows`: at most one lit window per house, at least half the houses dark.
  - `the church is the knot's`: the street church's belfry width and spire height (tip minus belfry floor) equal
    `VILLAGE_CHURCH`'s within 1e-9.
- [ ] **Step 3:** Run. Expected: FAIL.
- [ ] **Step 4:** Implement `buildStreet`. A house: a box and a pitched roof from its `Building`, a chimney on half of
  them, shutters and a door frame as thin boxes, openings as dark quads, an underpaint solid per face in the darkest
  tenth of its source (as `underpaintColour` does). Walls take `wallA`, `wallB` and `plaster`. Roofs take
  `roofStriped`, `roofBlue` and `roofSienna`. Each face has its own seed and a seeded `mirror`. The belfry and the
  spire take `plaster` (the spire faces are triangles). The ground either side of the path takes `field`, the path
  its pale texels. Trees: `buildLandTrees` over `STREET_TREES` with `groundAt = streetGroundAt`.
- [ ] **Step 5:** Run. Expected: PASS. Capture stations 0 and 4 and open them.
- [ ] **Step 6:** Commit: `feat(street): the houses, the church, the ground and the trees in strokes (S1 task 5)`.

### Task 6: The sky's method (worker builds, Lead chooses)

**Files:** Modify `src/scene/PaintingFlowSky3D.tsx`, `src/scene/DioramaExperience.tsx`. Test
`scripts/street-sky.test.ts`.

**Interfaces:**
- `type SkyAnchor = { follow: boolean; worldFixed: boolean }`, an optional `anchor` prop, and the pure
  `skyTransform(cameraQuaternion, cameraPosition, homeInverse, anchor?): { quaternion: Quaternion; position: Vector3 }`.
  Without an anchor: `camera × homeInverse` and the origin, exactly today's. `follow`: the position is the camera's.
  `worldFixed`: the quaternion is the identity. The component calls it in its frame loop in place of line 1145, before
  the paused early return, and writes both fields. In street mode `anchor` comes from the flags: A = no follow (the
  street group placed at `STREET.originA`), B = follow (the street at the origin). `turn` sets `worldFixed`. The
  station's camera pose is offset by the street group's position, so the camera stands in the same place in the
  street under both.
- Out of scope here: the pointer's sky picking under an anchor (`useTouchInput.ts:95–106`). Touch is off in street
  mode (Task 4). Slice 3 re-keys the picker when the hand arrives.

- [ ] **Step 1: Write the failing tests:** `no anchor is today's transform` (exact equality on five seeded camera
  poses, position at the origin), `follow tracks the camera`, `worldFixed ignores the camera's turn`.
- [ ] **Step 2:** Run. Expected: FAIL. **Step 3:** Implement, with a seam `window.__skyTransform = () => ({
  quaternion, position, camera })` set in the sky's own frame loop: the sky group's quaternion and position and the
  R3F camera's quaternion, so it needs no touch hook (which is off under reduced motion, `DioramaExperience.tsx:246`). **Step 4:** Run. Expected: PASS. Re-run Task 0's `orbit`, `light`
  and `reduced` captures: identical to the baseline.
- [ ] **Step 4b: The component applies the transform.** `scripts/check-sky-transform.mjs`, on `capture-diorama.mjs`'s
  CDP setup and its drag: load `?mode=diorama&clean=1&arrival=0`, drag the canvas 240 px right, wait 1.5 s, read
  `__skyTransform()`. In node, compute the home quaternion from `DIORAMA_CAMERAS.design` (a
  `lookAt` from its position to its target) and the expected `camera × home⁻¹`. Assert the sky's quaternion within
  1e-6 of it and its position at the origin, and assert the camera moved off its home by at least 5°. Run it also
  with `&sky=light` and under reduced-motion emulation. Exit 1 otherwise. (The `orbit` view is its own home, so a
  pinned capture there cannot see a component that stops applying the transform.)
- [ ] **Step 5:** The 16 frames: for anchor A and B, turn lock and world, stations 0 and 4, desktop and mobile,
  `capture-sky-frames.mjs scratch/street-s1-2026-10-23/t6 --url '…?mode=diorama&clean=1&street=1&station=S&skyAnchor=
  X&skyTurn=Y' --times 5 --wait-for 'window.__streetReady' --prefix sky-X-Y-sS` (add `--viewport mobile` and a `-m`
  suffix for mobile).
- [ ] **Step 6: G5, the Lead's choice.** For each frame: no gradient visible below the painted strokes, and the sky's
  growth from station 0 to 4 (the great whorl's diameter in pixels). Choose, write why in the record, set the default
  in `readStreetFlags`.
- [ ] **Step 7:** Commit: `feat(sky): an optional anchor for the street's sky, the method chosen (S1 task 6)`.

### Task 7: The palette gate (worker)

**Files:** Create `scripts/check-street-colour.ts`. Modify `src/scene/Street.tsx` (the `ids` pass).

- [ ] **Step 1: The ID pass.** `?street=1&ids=1`: every street mesh draws with its class's exact ID colour through the
  same geometry, depth test and alpha test (an injection that sets the final colour after the stroke body's discard),
  the sky hidden, the background black. IDs: walls (255, 0, 0), roofs (0, 255, 0), windows (0, 0, 255), ground (255,
  255, 0), path (0, 255, 255), trees (255, 0, 255), fog (255, 255, 255). A surface farther than `FOG.near` + 0.6 ×
  (`FOG.far` − `FOG.near`) from the camera writes the fog ID.
- [ ] **Step 2: The captures.** For a station S and a viewport V, `full-sS-V.png` and `ids-sS-V.png` with their frames
  JSON, both pinned at t = 5 with `--wait-for`.
- [ ] **Step 3: The script.** `node scripts/check-street-colour.ts <dir> --station S --viewport V [--control=cyan]`:
  reads both PNGs and both JSONs, exits 1 when their URL (less `ids`), viewport or time differ. A class's mask is its
  exact ID colour. Each class needs a minimum area (walls, roofs, ground 2,000 px, path and trees 1,000, fog 1,000,
  windows 100) or the script exits 1. For each class the full capture's mean Lab under the mask is compared by ΔE76:
  walls and roofs against their sources' mean in `painting.jpg` and the `village` region, the ground and the path
  against `field` and the `hills` region, trees against the `cypress` region, windows against `villageWarm`, the fog
  against `PALETTE.skyHorizon`. Each < 10, or exit 1.
- [ ] **Step 4: The controls.** `--control=cyan` paints 40% of every mask's pixels cyan in the full image: exit 1. An
  `ids` capture of a no-street URL (the ID pass does not exist there): exit 1 on the areas. A capture with the fog
  colour forced to cyan (`?fogColour=00ffff`, dev only): exit 1 on the fog.
- [ ] **Step 5:** Commit: `test(street): the street's palette gate, the ID pass and its controls (S1 task 7)`.

### Task 8: Performance, reduced motion, portrait, rotation (worker)

- [ ] **Step 1: Perf.** `DIORAMA_CAPTURE_URL=http://127.0.0.1:5181/ DIORAMA_CAPTURE_EXTRA='street=1&station=2'
  node scripts/capture-diorama.mjs t8/perf --perf --dpr 1.5`, and the same with `--viewport mobile` if the script
  supports it, else the mobile capture through the emulation it uses. Report p50, p95, the drawing buffer and
  `info.triangles` beside Task 0's.
- [ ] **Step 2: Reduced motion.** `DIORAMA_CAPTURE_URL='http://127.0.0.1:5181/?street=1&station=2' node
  scripts/check-reduced-motion.mjs scratch/street-s1-2026-10-23/t8/reduced`. Expected: PASS.
- [ ] **Step 3: Portrait.** Stations 0–4 with `--viewport mobile`. For each, the band check of Task 6.
- [ ] **Step 4: Rotation.** `scripts/check-street-rotation.mjs`, on `check-viewport-camera.mjs`'s CDP setup: load
  `?street=1&station=2` at 1440 × 900, wait for `__streetReady`, set the metrics to 390 × 844, wait 1 s. Assert
  `window.__streetCounts.builds === 1` and `window.__streetCamera().fov === 75`. Exit 1 otherwise.
- [ ] **Step 5:** Commit: `test(street): perf, reduced motion, portrait and rotation runs (S1 task 8)`.

### Task 9: The passes (Lead)

- [ ] **Step 1:** Each pass: capture the five stations (landscape) and stations 0, 2, 4 (portrait). Build a montage:
  the painting's village crop at matched scale, Simon's crops (`scratch/explore-2026-10-23/simon/`), the station.
- [ ] **Step 2:** Read at 1:1 against the painting first, Simon's where the painting is silent. Name each defect in the
  record before changing anything. Order: the stroke scale, the outlines, the colour, the fog, the composition.
- [ ] **Step 3:** Retune. Re-run Tasks 7 and 8's gates. At most four passes. Stop at the first pass with no defect
  left.

### Task 10: Review, gate and record (Lead, Fable)

- [ ] **Step 1:** The Lead's own suite run in a clean worktree: `test:sky`, `tsc -b`, `build`, `eslint`.
- [ ] **Step 2:** Fable's code review of the branch from a brief file. Fixes in one round. A confirmation read bounded
  to its findings.
- [ ] **Step 3:** The Lead's gate (G1–G11), the mutants run one at a time with the artefact (diff, red, restore,
  `git diff --exit-code`, green).
- [ ] **Step 4:** The record `tasks/2026-10-2x-street-s1.md`, the lessons, the Tunables entry, the pickup.
- [ ] **Step 5:** Mark's taste gate on the montages and a local server: the go or no-go for slices 2 to 4. No push
  before he has seen it.

## Gate

| # | check |
|---|---|
| G1 | red first: each task's tests fail before its code |
| G2 | `test:sky`, `tsc -b`, `build`, `eslint`, the Lead's own runs |
| G3 | the diorama unchanged: Task 0's pinned matrix identical, `street=0`, the village hash, the bundle |
| G4 | the flat panels: G4a (CPU, the marks) and G4b (GPU, the material) |
| G5 | the sky's method chosen from the 16 frames, no gradient band at any station |
| G6 | the palette gate: ΔE76 < 10 per class, the three controls exit 1 |
| G7 | perf at DPR 1.5, like for like: desktop p95 at most 0.5 ms above Task 0's 17.3 ms, triangles ≤ 1,444,930, then Mark's phone reading |
| G8 | reduced motion, the fresh-session street, the failed loads, rotation |
| G9 | the captures opened at 1:1, every defect named, the montages built |
| G10 | Fable's code review answered, its confirmation read |
| G11 | the six mutants below, each red in its named test and green after the restore |

The mutants (G11):

1. In `traceFace`, the half-width's `refHeight / faceWidth` factor removed. Red: `stroke width is the measured
   fraction at any heading`.
2. In `outlineFace`, the emitted width doubled (the constant untouched). Red: `the outline width is 0.14 of the wall`.
3. In `skyTransform`, the no-anchor branch returning the camera's position. Red: `no anchor is today's transform`.
4. In `drapeOnDomes`, `islandHeightAt` called directly again. Red: `groundAt reaches every terrain read`.
5. In `readStreetFlags`, `street=0` read as true. Red: `flags`.
6. One house moved onto the path. Red: `houses never block the path`.

## Risks

- The land flow is coarse over a wall's source (12–30 rows at 960). `faceCrop` upsamples. If the panels show
  stair-stepped or aimless strokes, the retune is a village field derived at the 3840 scan's resolution with the
  cypress's derive: a new asset, with the full review.
- E4's stroke body was tuned for the cypress at the diorama's distance. G4b shows it on a wall first.
- The sky grows under method A as the camera walks. G5 measures it.
- The spire leaves the frame at station 4. Station 4 looks at the church's door gable, and mid-path stations hold
  the steeple.

## v2 dispositions

Codex (F1–F18):

- F1 (P1) accepted: `traceFace` and `StreetBuild` carry `stroke` and `seed`. `strokeGeometry` is shared and checks the
  lengths. The material is named. Test `the stroke attributes are whole`.
- F2 accepted: faces have a `shape`. Ribbons are clipped to it. Test `a gable keeps its strokes inside`.
- F3 accepted: `VILLAGE_CHURCH` carries the nave, the belfry and the spire tip. Spire height is defined.
- F4 accepted another way: the knot moves to the Node-importable `villageKnot.ts`, so `villageGeometry.ts`'s imports
  stay. Its byte identity is the `export-village.mjs` hash, before and after.
- F5 accepted: the ground's source is the field rectangle `[760, 1214, 935, 1262]`, checked against the footprints and
  the masses, and by eye (the painting's houses extend past the footprint list). Pigments through `GROUND_TEXEL`.
- F6 accepted: the crop is resampled to the face's aspect, so a crop pixel is square on the face. Widths are fractions
  of `refHeight`, converted in `faceConfig`. The test covers three headings on two aspects.
- F7 accepted: authored rectangles inscribed in the patches. Mirroring flips the data, negates dx and swaps the uv.
- F8 accepted: `groundAt` reaches `drapeOnDomes` and `weigh`. A non-default test.
- F9 deferred with reason: slice 1 captures with no pointer, so touch is off in street mode (Task 4,
  `touch is off in the street`). The picker is re-keyed in slice 3, when the hand arrives. The no-street pointer path
  is untouched by this slice.
- F10 accepted: street mode forces the arrival off. The fresh-session capture (Task 4 Step 6).
- F11 accepted: the readiness reducer, the three loaders' failure states, `?streetFail=` captures.
- F12 accepted: the matrix is pinned (`capture-sky-frames.mjs`) and captured twice. The orbit drag views leave G3.
- F13 accepted: the matrix includes painted light, reduced motion, pinned arrival frames, a non-home view and
  `street=0`.
- F14 accepted: the test pins the literal 0.14, and the mutant doubles the emitted width.
- F15 accepted: G4b, a GPU flat panel with the production material.
- F16 accepted: the ID pass with occluders and alpha test kept, exact IDs, paired files and JSON checks, minimum areas,
  a no-street control.
- F17 accepted: the fog against `PALETTE.skyHorizon`, the fog class by distance, a cyan-fog control.
- F18 accepted: `--dpr 1.5`, `p50Ms`, the drawing buffer recorded, the budget in triangles against the diorama's.

The worker (B1–B14): B1 paths under `scratch/street-s1-2026-10-23/`. B2 `p50Ms` added. B3 as F4. B4 as F3. B5 the
placements are explicit. B6 `forward` is a typed constant, tested. B7 `stationPose`'s formulas, station 4 at the
church. B8 as F8. B9 as F10. B10 as F12. B11 `compare-frames.mjs` per file. B12 the anchor has no scale (B follows
the camera, the dome's radius holds), defaults A and lock. B13 the files are named, windows and fog against their
regions. B14 `check-reduced-motion.mjs` through `DIORAMA_CAPTURE_URL`.

v3, from the confirmation reads:

- F10 and B15 accepted: `window.__streetCamera()` in street mode, independent of the touch hook, with the fov. Task 4
  Step 6 compares against the station plus the anchor's offset. Task 8 Step 4 reads the fov from it.
- F12 accepted: the reduced-motion control frames leave the cross-run comparison. The script's exit status covers them.
- F13 accepted: `scripts/check-sky-transform.mjs` (Task 6 Step 4b) asserts the sky group's transform after a real
  drag, against a home quaternion computed independently in node, on the moving sky, painted light and reduced motion.
- F13, last confirmation (`plan-confirm2-codex.md`): `__skyTransform()` carries the camera's quaternion, read in the
  sky's frame loop, so Step 4b needs no touch seam under reduced motion. Applied as Codex stated it. Not re-read.
- F19 (P1) accepted: the fog's distance comes from `position` and `modelViewMatrix` in the vertex body. G4b and Task 4
  Step 6 require empty page errors, so a shader that does not compile fails before any judgement.
