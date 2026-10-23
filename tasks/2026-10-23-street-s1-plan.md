# Street S1 — the street's look — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One street of Van Gogh's village, built in code at walking distance, seen from five fixed points along its
path under the painting's moving sky, good enough for Mark to decide whether slices 2 to 4 are built.

**Architecture:** A new scene, `Street`, mounts inside the diorama's canvas behind `?street=1` (lazy-loaded) in place
of the island, the cypress and the village. The diorama's sky stays mounted. The houses and the church are volumes
with the knot's proportions (`villageGeometry.ts`). Every face is clad in ribbons traced in the land's flow field over a
painted patch of the scan, as the land's domes are (`landDomes.ts`), and laid flat on the face's plane, with ink
outlines along the edges. The trees are the land's stroked domes on the street's ground. A fog term in the street's
own materials closes the far end.

**Tech Stack:** Vite, React, TypeScript, three.js, React Three Fiber, drei. Tests run under `node --test` in
`npm run -s test:sky`. No new dependency.

**Spec:** `docs/superpowers/specs/2026-10-23-village-street-design.md` (approved by Mark, 2026-10-23). This plan is
its slice 1. Read both.

## Global Constraints

- The bar (`CLAUDE.md`, locked): motion and colour derived from the painting. The street is invented, so it
  "continue[s] that same derived style". Surfaces are painted in strokes, not in a generic texture.
- Everything in the street is built in code: the houses, the church, the trees. No Blender (Mark: "keep it in code").
  No new npm package.
- The reference order: the scan and `public/reference/palette.json` first. Simon Lee's village answers only what the
  scan cannot show at walking distance (volumes, outlines, fog). Nothing of his is copied.
- Stroke scale: a stroke's width and length on a wall, a roof and the ground are set as a fraction of the object,
  measured from the scan's village at 1:1, never in screen pixels.
- Palette tolerance: ΔE < 10 per surface class (Tunables).
- Performance (locked): 60 fps desktop, 30 fps mid-tier mobile, the devicePixelRatio caps in Tunables (2 desktop,
  1.5 mobile, the code's 1.5).
- Reduced motion (locked): the street's sky is the painted-light still. Two frames apart in time stay byte-identical.
- The diorama does not change: without `?street=1`, every capture is byte-identical to Task 0's baseline.
- The sky: a dome of radius 6 about the world origin (`skyMapping.ts:4`). The painted arc spans ±71° across and
  +52° up about the home's forward direction. The strokes fade out from v 0.76 (`dioramaSkyProjection.ts:28`).
  Below them the gradient sphere draws with no depth test. No gradient band, empty back or invented sky is ever on
  screen in the street.
- Retune cap: 4 passes for this slice.
- Git: branch `feat/street-s1`, local only until Mark has seen the captures. It does not reach `main` before Mark's
  edit of the camera criterion in `CLAUDE.md` (design C17).
- British English. Conventional commits. One commit per task at least.

## Review Focus

1. **A plain visit, no `?street`.** A visitor without the flag must get today's diorama, bit for bit, and the page's
   main bundle must not grow by the street's code. Pinned in Task 4 (the lazy import, the bundle-size line) and G3.
2. **A portrait phone.** At 390 × 844 the street's sky must show no gradient band at any station. Pinned in Task 8
   (portrait captures at all five stations, the band check).
3. **Reduced motion with `?street=1`.** The street must stand still: the painted-light sky, no fog drift, frames
   byte-identical. Pinned in Task 8 (`check:reduced` against the street URL).
4. **A failed or slow asset load.** If `painting.jpg`, `land-flow.png` or `land-masses.json` fails, the street must
   not show a half-built village. It shows nothing but the sky and reports ready, as the island does. Pinned in
   Task 4 (a test of the build's all-or-nothing gate).
5. **A resize or a rotation mid-visit.** Turning a phone must switch the field of view and the sky's `home` without
   rebuilding a single stroke (the land's rule: one count for every device). Pinned in Task 8 (a viewport switch
   capture with the build counter unchanged).

---

## Roles

Lead: Claude (`w4:p1`). Reviewer: Codex (`w4:p4`). Worker: Antigravity (`w4:p5`). Consultant: Fable (`w4:p6`), a
second read when Codex runs low. The Lead builds the visual tasks (1, 3, 5, 9) and gates every task. The worker builds
the mechanical tasks (0, 2, 4, 6's plumbing, 7, 8) from briefs, red test first, and reports evidence, not verdicts.
Evidence goes to `scratch/street-s1-<date>/` (gitignored), one folder per task.

## Files

- Create `src/scene/streetLayout.ts`: the street's frame, path, stations, houses, church, tree placements, ground
  extent and camera constants. Pure.
- Create `src/scene/streetStrokes.ts`: a face's crop, its ribbon config, the drape onto a face, the outlines. Pure.
- Create `src/scene/streetGeometry.ts`: the volumes, their faces, the openings, the underpaint, the ground and the
  path, assembled into `BrushArrays`. Pure.
- Create `src/scene/streetFog.ts`: the fog injection for the street's materials.
- Create `src/scene/Street.tsx`: loads the images, builds once, draws, reports ready.
- Create `scripts/flat-street-gate.ts`: the flat panel.
- Create `scripts/check-street-colour.ts`: the palette gate.
- Create tests `scripts/street-layout.test.ts`, `scripts/street-strokes.test.ts`, `scripts/street-sky.test.ts`, and add
  them to `test:sky` in `package.json`.
- Modify `src/scene/villageGeometry.ts`: export the knot's building parameters. The geometry stays byte-identical.
- Modify `src/scene/landDomes.ts`: a `groundAt` parameter, defaulting to `islandHeightAt`. The land stays
  byte-identical.
- Modify `src/scene/DioramaExperience.tsx`: the `?street=1` mount, the station camera.
- Modify `src/scene/PaintingFlowSky3D.tsx`: the optional `anchor` prop. Without it, today's code path.

---

### Task 0: Branch and baseline (worker)

**Files:** none in `src/`. Evidence in `scratch/street-s1-<date>/baseline/`.

- [ ] **Step 1:** `git switch -c feat/street-s1 main`.
- [ ] **Step 2:** Serve `main` on 5181. Capture the diorama: `node scripts/capture-sky-frames.mjs baseline/frames
  --url 'http://127.0.0.1:5181/?mode=diorama&clean=1&arrival=0' --times 5 --prefix base`, then
  `DIORAMA_CAPTURE_URL=http://127.0.0.1:5181/ DIORAMA_CAPTURE_EXTRA='arrival=0' node scripts/capture-diorama.mjs
  baseline/views` and the same with `--perf` into `baseline/perf`.
- [ ] **Step 3:** Record `npm run -s build`'s main chunk size from Vite's output in `baseline/bundle.txt`.
- [ ] **Step 4:** Report the desktop p50 and p95 frame times from `baseline/perf/perf-summary.json`.

Mark's phone reading on production (`starrynight.markma.dev/?perf=1`) is asked for by the Lead in parallel. It does
not block the build. The street's triangle budget is the headroom under 16.7 ms (desktop p95) and 33.3 ms (the phone).

### Task 1: The stroke scale, measured (Lead)

**Files:** the record `tasks/2026-10-2x-street-s1.md`, section "The stroke scale".

- [ ] **Step 1:** Crop the 3840 scan at 1:1 over these patches (`villagePatches.ts`, ×2.4): `blueWallA`, `blueWallB`,
  `churchPlaster`, `stripedRoof`, `blueRoof`, `siennaRoof`. Crop a field strip of the apron below the village
  (painting px x 640–1160, y 1180–1260) and the mass `olive-church` (`landMasses.ts`).
- [ ] **Step 2:** For each, measure five strokes by eye on the crop: width and length in pixels. Measure the dark
  outline along two house edges and one roof edge.
- [ ] **Step 3:** Write a table: each source, its box in pixels, the median stroke width and length as fractions of
  the box's height, and the outline width as a fraction of the wall's height. These fractions become Task 3's
  `faceConfig` values and `OUTLINE_FRACTION`. Commit the record.

### Task 2: The layout (worker)

**Files:**
- Modify: `src/scene/villageGeometry.ts` (export the knot)
- Create: `src/scene/streetLayout.ts`
- Test: `scripts/street-layout.test.ts`

**Interfaces:**
- Produces: `VILLAGE_KNOT: { church: Building; neighbours: readonly Building[]; context: readonly Building[] }` from
  `villageGeometry.ts`, with `Building` exported.
- Produces from `streetLayout.ts`:
  - `STREET` (const): `pathLength` 1.2, `eye` 0.09, `behind` 0.18, `lookAhead` 0.6, `lookHeight` 0.06, `near` 0.004,
    `far` 48, `fov: { landscape: 50, portrait: 75 }`, `originA: [0, 0, 5.0]` (method A's placement), `forward`
    the home camera's forward on the ground plane.
  - `type StreetHouse = Building & { side: -1 | 1; at: number }` (`at` along the path, 0..1).
  - `STREET_HOUSES: readonly StreetHouse[]`: eight to twelve houses on both sides, proportions from
    `VILLAGE_KNOT.neighbours` and `.context`, reused with yaw set square to the path.
  - `STREET_CHURCH: Building` at the path's end, `VILLAGE_KNOT.church` with its belfry and spire as authored.
  - `STREET_TREES: readonly LandMass[]`: two to four masses from `LAND_MASSES` (`olive-church`, `olive-right`,
    `orchard-lower`), placed between houses.
  - `pathPoint(t: number): [number, number, number]` and `stationPose(i: 0 | 1 | 2 | 3 | 4, portrait: boolean):
    { position: [number, number, number]; target: [number, number, number]; fov: number; near: number }`, stations
    at t = 0, 0.25, 0.5, 0.75, 1.
  - `streetGroundAt(x: number, z: number): number`: 0 everywhere in slice 1 (flat).

- [ ] **Step 1: Write the failing tests** in `scripts/street-layout.test.ts`:
  - `knot export is byte-identical`: SHA-256 of `buildVillage()`'s three geometries' arrays equals the value computed
    on `main` before the export (the worker records it in Step 0 of the brief and pastes it into the test).
  - `every object lies inside the dome under method A`: every house corner, the spire tip and every tree's top,
    offset by `STREET.originA`, has a distance from the origin ≤ 5.8.
  - `stations stay inside the painted arc`: for every station, the heading from the target to `STREET.forward` is
    within ±60° (a 11° margin on ±71°) and the pitch within −20° to +40° (a margin on +52°).
  - `the near plane clears the ground`: for every station, `near` ≤ `eye` / 10 and the camera's height above
    `streetGroundAt` ≥ 4 × `near`.
  - `houses never block the path`: no house footprint comes within 0.08 of the path's centreline.
- [ ] **Step 2:** `node --test scripts/street-layout.test.ts`. Expected: FAIL (module not found).
- [ ] **Step 3:** Export the knot from `villageGeometry.ts` without changing its geometry. Implement
  `streetLayout.ts`. The path runs straight along `STREET.forward` with a gentle bend (≤ 15°) at t 0.6.
- [ ] **Step 4:** Run the tests and `npm run -s test:sky`. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(street): the street's layout from the village knot (S1 task 2)`.

### Task 3: The face strokes and the flat panel (Lead)

**Files:**
- Create: `src/scene/streetStrokes.ts`
- Create: `scripts/flat-street-gate.ts`
- Test: `scripts/street-strokes.test.ts`

**Interfaces:**
- Consumes: `traceCypressRibbons`, `ribbonColumns`, `CYPRESS_RIBBON_CONFIG` (`cypressStrokes.ts`),
  `pushDrapedRibbon` (`brushForms.ts`), `VILLAGE_PATCHES` (`villagePatches.ts`), `flowToPainting`
  (`landMapping.ts`).
- Produces:
  - `type StreetFace = { origin: Vector3; u: Vector3; v: Vector3; normal: Vector3; kind: 'wall' | 'roof' | 'ground' |
    'path'; patch: VillagePatchName | 'field' | 'path'; seed: number; mirror: boolean }`. `u` and `v` span the face
    (their lengths are its width and height).
  - `faceCrop(flow: ImageData2D, box: [number, number, number, number], minRows = 64): { crop: ImageData2D; rows:
    RibbonRows }`: the land flow over the box (painting px), B 255 on every texel, bilinear-upsampled so the crop
    has at least `minRows` rows.
  - `faceConfig(kind: StreetFace['kind'], count: number): CypressRibbonConfig`: Task 1's fractions.
  - `OUTLINE_FRACTION: number` (Task 1).
  - `drapeOnFace(ribbon: CypressRibbon, face: StreetFace, lift: number, columns: number): Vector3[][]`: a ribbon
    sample at crop (px, py) lands at `origin + px·u + (1 − py)·v + lift·normal` (mirrored in px when `mirror`).
  - `traceFace(face: StreetFace, flow: ImageData2D, painting: ImageData2D): { arrays: BrushArrays; ribbons: number
    }`: the face's ribbons, draped, in their per-sample colours.
  - `outlineFace(face: StreetFace, edges: readonly [Vector3, Vector3][], ink: Color, seed: number): BrushArrays`:
    one tapered ribbon per edge, width `OUTLINE_FRACTION` × the face's height, wobbling by at most a quarter of its
    width.

- [ ] **Step 1: Write the failing tests** in `scripts/street-strokes.test.ts`:
  - `a face maps its crop's corners exactly`: px, py of (0, 0), (1, 0), (0, 1), (1, 1) land on the face's four
    corners within 1e-9, and `mirror` swaps left and right.
  - `stroke width scales with the face`: a ribbon of half-width h (crop widths) on a face of width W has a world
    half-width h × W within 1e-6, for W of 0.2 and 0.8.
  - `the outline scales with the face`: the outline's width is `OUTLINE_FRACTION` × the face's height for heights 0.1
    and 0.3.
  - `a face is covered`: rasterise a wall face's ribbons at 200 × 100 cells. At least 0.85 of the cells are covered.
  - `the crop is upsampled`: a box of 12 painting rows gives a crop of at least 64 rows, and its mean direction equals
    the source's within 2°.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement `streetStrokes.ts`. Colours come from `painting.jpg` through the tracer's per-sample
  colours, accepted on every texel of the patch (the patches are paint samples, `villagePatches.ts:1–3`).
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Write `scripts/flat-street-gate.ts [out.png]`: left, the painting's source crops at 1:1 of the 1600
  painting, scaled ×6. Right, at the same scale: one wall (`blueWallA`), one roof (`stripedRoof`), the ground strip
  (`field`) and one tree mass (`olive-church`, through `buildLandTrees`' tracer), drawn flat in their pigments over
  their underpaint, the outlines included.
- [ ] **Step 6: Gate G4, the flat panel.** The Lead opens it at 1:1 beside the scan's crops. Name what reads wrong
  (fur, stipple, smears, the stroke too thin or too fat, the outline too heavy). Retune `faceConfig` and draw again.
  Each redraw counts as a pass. Do not start Task 5 before the panel reads as the painting's own marks.
- [ ] **Step 7:** Commit: `feat(street): strokes on a face, the outlines and the flat panel (S1 task 3)`.

### Task 4: The street's mount (worker)

**Files:**
- Modify: `src/scene/DioramaExperience.tsx`, `src/scene/landDomes.ts`
- Create: `src/scene/Street.tsx`, `src/scene/streetFog.ts`, `src/scene/streetGeometry.ts` (the stub `buildStreet`,
  houses as plain underpaint boxes, which Task 5 replaces)

**Interfaces:**
- Consumes: Task 2's `stationPose`, `STREET`.
- Produces:
  - `Street({ ready, onBuilt }: { ready?: MutableRefObject<boolean>; onBuilt?: (counts: StreetCounts) => void })`,
    lazy-loaded with `React.lazy(() => import('./Street'))`.
  - `type StreetCounts = { ribbons: number; triangles: number; builds: number }`, exposed on
    `window.__streetCounts` for the gates.
  - `fogInjection(colour: Color, near: number, far: number): Omit<AliveInjection, 'key'>`: mixes the fragment toward
    `colour` by `smoothstep(near, far, viewDistance)`. The street's materials only. `scene.fog` is never set, since
    it would reach the sky's and the diorama's materials.
  - `landDomes.ts`: `domesOf(mass, groundAt = islandHeightAt)`, and the same default parameter threaded through
    `liftToDomes`, `settleOnTerrain` and `buildLandTrees`.
- URL: `?street=1` mounts `Street` in place of `Diorama`, removes `OrbitControls`, and sets the camera from
  `stationPose(Number(?station ?? 0), isPortrait)`. The sky stays mounted as it is, and its `home` stays the
  diorama's camera for the orientation (`DIORAMA_CAMERAS.design` in landscape, `.mobile` in portrait), so its
  composition is the one the diorama's gates passed.

- [ ] **Step 1: Write the failing tests**, in `scripts/street-layout.test.ts`:
  - `the land is unchanged by groundAt`: SHA-256 of `buildLandTrees(...)` arrays with the default equals the value
    recorded on `main`.
  - `the street builds all or nothing`: `buildStreet(null, flow, masses)` and the other two missing inputs each
    return `null`, never a partial geometry (the pure builder behind `Street.tsx`, in `streetGeometry.ts`, stubbed
    here with houses as plain boxes until Task 5).
  - `fog leaves the land's text alone`: the land's four shader hashes in `cypress-colours.test.ts` C4 still hold.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement. Houses are plain underpaint boxes for now. Task 5 clads them.
- [ ] **Step 4:** Run the tests and the suite. Capture `?street=1&station=0` once and open it.
- [ ] **Step 5: G3, the diorama unchanged.** Capture without `?street` at the pinned t = 5 and the nine views.
  `node scripts/compare-frames.mjs` against Task 0's baseline: identical, 0 pixels differ. `npm run -s build`: the
  main chunk within 1 kB of `baseline/bundle.txt`, the street in its own chunk.
- [ ] **Step 6:** Commit: `feat(street): the street's lazy mount behind ?street=1, the station camera, the fog (S1
  task 4)`.

### Task 5: The volumes and their paint (Lead)

**Files:**
- Modify: `src/scene/streetGeometry.ts` (the stub becomes the build), `src/scene/Street.tsx`

**Interfaces:**
- Consumes: Task 2's layout, Task 3's `traceFace`, `outlineFace`, Task 4's `fogInjection` and `groundAt`.
- Produces: `buildStreet(painting: ImageData2D | null, flow: ImageData2D | null, masses: BakedMass[] | null):
  StreetBuild | null`, with `type StreetBuild = { underpaint: BrushArrays; strokes: BrushArrays; outlines:
  BrushArrays; windows: BrushArrays; trees: LandTrees; counts: StreetCounts }`.

- [ ] **Step 1: Write the failing tests** in `scripts/street-strokes.test.ts`:
  - `every face of a house is clad`: for each house, each wall, gable and roof plane has at least 20 ribbons, and
    every edge has one outline ribbon.
  - `few warm windows`: across the street, at most one lit window per house and at least half the houses dark.
  - `the church is the knot's`: the belfry's width and the spire's height equal `VILLAGE_KNOT.church`'s within 1e-9.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement `buildStreet`. A house is a box and a pitched roof from its `Building` parameters, with a
  chimney on half of them, shutters and a door frame as thin boxes, openings as dark quads, and an underpaint solid
  per face in the darkest tenth of its patch (as `underpaintColour` does for the masses). Walls take the blue and pale
  wall patches, roofs the roof patches, each face its own seed and a random `mirror`. The ground either side of the
  path takes the `field` crop. The path takes the paler ground texels. Trees use `buildLandTrees` with
  `streetGroundAt`. Materials: E4's stroke body (`strokeGlslWith(CYPRESS_STROKE_BODY)`) for the strokes, the land's
  body for the ground, both with `fogInjection`.
- [ ] **Step 4:** Run. Expected: PASS. Capture stations 0 and 4 and open them.
- [ ] **Step 5:** Commit: `feat(street): the houses, the church, the ground and the trees in strokes (S1 task 5)`.

### Task 6: The sky's method (worker builds, Lead chooses)

**Files:**
- Modify: `src/scene/PaintingFlowSky3D.tsx`
- Test: `scripts/street-sky.test.ts`

**Interfaces:**
- Produces: `type SkyAnchor = { follow: boolean; worldFixed: boolean; scale: number }`, an optional `anchor` prop,
  and the pure `skyTransform(cameraQuaternion, cameraPosition, homeInverse, anchor?): { quaternion: Quaternion;
  position: Vector3; scale: number }`. Without an anchor it returns today's: `camera × homeInverse`, the origin, 1.
  `follow` sets the position to the camera's. `worldFixed` sets the quaternion to the identity. In street mode,
  `?skyAnchor=A|B` (A: no follow, the street at `STREET.originA`. B: follow) and `?skyTurn=lock|world` choose.

- [ ] **Step 1: Write the failing tests:** `no anchor is today's transform` (exact equality on five random camera
  poses), `follow tracks the camera`, `worldFixed ignores the camera's turn`.
- [ ] **Step 2:** Run. Expected: FAIL. **Step 3:** Implement. **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Capture the four combinations (A or B, lock or world) at stations 0 and 4, landscape and portrait:
  16 frames in `scratch/street-s1-<date>/sky/`.
- [ ] **Step 6: G5, the Lead's choice.** For each frame, check the band edge: no gradient visible below the painted
  strokes, and measure the sky's growth from station 0 to 4 (the whorl's diameter in pixels). Choose the method and
  write why in the record. The other three stay behind their dev params until the slice's gate, then go.
- [ ] **Step 7:** Commit: `feat(sky): an optional anchor for the street's sky, the method chosen (S1 task 6)`.

### Task 7: The palette gate (worker)

**Files:** Create `scripts/check-street-colour.ts`. Modify `src/scene/Street.tsx` (a dev-only `?streetOnly=<class>`).

- [ ] **Step 1:** `?streetOnly=walls|roofs|windows|ground|path|trees|fog` renders only that class, on black, for the
  masks. The fog class is the far end's fogged pixels at station 0 (the street's far 30% by depth).
- [ ] **Step 2:** `node scripts/check-street-colour.ts <capture-dir> [--control=cyan]`: for each class, the mean Lab of
  the full capture under the class's mask against the mean Lab of its source patches in `painting.jpg` and against its
  `palette.json` region (the design's list: walls and roofs `village`, windows and lamps `villageWarm`, trees
  `cypress`, the ground and the path `hills`, the fog `sky`). ΔE76 < 10 each. Exit 1 on any failure.
- [ ] **Step 3:** The controls: `--control=cyan` paints 40% of every mask cyan and must exit 1. A capture of the
  diorama (no street) must exit 1 on the masks' empty area.
- [ ] **Step 4:** Commit: `test(street): the street's palette gate and its controls (S1 task 7)`.

### Task 8: Performance, reduced motion, portrait (worker)

- [ ] **Step 1:** Perf: `capture-diorama.mjs --perf` with `DIORAMA_CAPTURE_EXTRA='arrival=0&street=1&station=2'` on
  desktop and the mobile viewport. Report p50 and p95 beside Task 0's.
- [ ] **Step 2:** Reduced motion: `npm run -s check:reduced` with the street URL. Expected: PASS (frames identical).
- [ ] **Step 3:** Portrait: stations 0–4 at 390 × 844. For each, the band check of Task 6.
- [ ] **Step 4:** Rotation: load landscape at station 2, resize to portrait, capture. `window.__streetCounts.builds`
  stays 1.
- [ ] **Step 5:** Commit the guard scripts' URL options, if Steps 1–4 needed new ones: `test(street): perf, reduced
  motion and portrait runs (S1 task 8)`.

### Task 9: The passes (Lead)

- [ ] **Step 1:** Each pass: capture the five stations (landscape) and stations 0, 2, 4 (portrait). Build a montage:
  the painting's village crop at matched scale, Simon's crops (`scratch/explore-2026-10-23/simon/`), the station.
- [ ] **Step 2:** Read at 1:1 against the painting first, Simon's where the painting is silent. Name each defect in the
  record before changing anything. Order: the stroke scale, the outlines, the colour, the fog, the composition.
- [ ] **Step 3:** Retune. Re-run Tasks 7 and 8's gates. At most four passes. Stop at the first pass with no defect
  left.

### Task 10: Review, gate and record (Lead, Codex)

- [ ] **Step 1:** The Lead's own suite run in a clean worktree: `test:sky`, `tsc -b`, `build`, `eslint`.
- [ ] **Step 2:** Codex's code review of the branch from a brief file. Fixes in one round. A confirmation read bounded
  to its findings.
- [ ] **Step 3:** The Lead's gate (G1–G11 below), the mutants run one at a time with the artefact (diff, red, restore,
  `git diff --exit-code`, green).
- [ ] **Step 4:** The record `tasks/2026-10-2x-street-s1.md`, the lessons, the Tunables entry, the pickup.
- [ ] **Step 5:** Mark's taste gate on the montages and a local server: the go or no-go for slices 2 to 4. No push
  before he has seen it.

## Gate

| # | check |
|---|---|
| G1 | red first: each task's tests fail before its code |
| G2 | `test:sky`, `tsc -b`, `build`, `eslint`, the Lead's own runs |
| G3 | the diorama unchanged: byte-identical captures without `?street`, the land and village hashes, the bundle |
| G4 | the flat panel reads as the painting's marks (Task 3) |
| G5 | the sky's method chosen from the 16 frames, no gradient band at any station (Task 6) |
| G6 | the palette gate: ΔE76 < 10 per class, the controls exit 1 (Task 7) |
| G7 | perf: desktop p95 ≤ 16.7 ms with the street, the mobile viewport ≤ 33.3 ms, then Mark's phone reading |
| G8 | reduced motion and rotation (Task 8) |
| G9 | the captures opened at 1:1, every defect named, the montages built (Task 9) |
| G10 | Codex's code review answered, its confirmation read |
| G11 | the five mutants below, each red in its named test and green after the restore |

The mutants (G11):

1. The stroke-scale mapping removed. Red: `stroke width scales with the face`.
2. The outline fraction doubled. Red: `the outline scales with the face`.
3. The anchor's default set to `follow`. Red: `no anchor is today's transform`.
4. `groundAt`'s default set to 0. Red: `the land is unchanged by groundAt`.
5. One house moved onto the path. Red: `houses never block the path`.

## Risks

- The land flow is coarse over a wall's patch (12–27 rows at 960). Task 3 upsamples the crop. If the flat panel shows
  stair-stepped or aimless strokes, the retune is a village field derived at the 3840 scan's resolution with the
  cypress's derive. That is a new asset and gets the full review.
- E4's stroke body was tuned for the cypress at the diorama's distance. On a wall at walking distance it may read as
  fur or as plastic. The flat panel shows it first.
- The sky grows under method A as the camera walks. The path is 1.2 long and the gate measures the growth.
- The church's spire is 1.1 tall at this scale. At eye height 0.09 it may leave the frame at the last station. The
  station's pitch is capped at +40°.
