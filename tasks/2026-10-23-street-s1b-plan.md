# Street S1b, the village lane: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild slice 1's street as an invented village lane at eye level: an S-curved lane to a church square, ten
mixed houses (the painting's and Dutch cottages) at their own angles, the painting's cypress at the start, and the
spike's light and life made real, so the street stops reading as "flat", "dull" and "cardboard".

**Architecture:** Slice 1's build stays (strokes traced on faces, outlines, the ID passes, the palette gate). The
layout moves from two rows on a bent path to a table of houses along an S-curve lane, still read through
`pathPoint`/`pathTangent`. A second house type, the cottage, joins `house`. The spike's moonlight, wall shade, lean,
window glow, fireflies, breeze, painted hills and ground shadows become named, tested code. Detail falls with distance
so the street stays within the diorama's triangle count.

**Tech stack:** Vite, React, TypeScript, three.js, React Three Fiber, drei. `node --test` with `--experimental-strip-types`.

**Spec:** `docs/superpowers/specs/2026-10-23-village-street-design.md`, section "The redesign after slice 1's gate"
(it overrides the earlier sections where they differ). The layout: `scratch/village-redesign-2026-10-23/layout-v1.png`.
The slice 1 plan and record: `tasks/2026-10-23-street-s1-plan.md`, `tasks/2026-10-23-street-s1.md`.

## Global constraints

- No new dependency. The worker never installs.
- Every colour comes from the painting or `public/reference/palette.json` (the bar, `CLAUDE.md`, locked). The palette
  gate per source: ΔE76 < 10.
- A plain visit (no `?street=1`) is unchanged: Task 0's pinned matrix byte-identical, the village hash
  `0975d344bc93b08fde008380d0dec336b46c4a6a614c8cba30eb292391ad8ecf`.
- Budget at DPR 1.5, like for like (S1's G7): `info.triangles` ≤ 1,444,930 at every station, desktop p95 ≤ 17.8 ms.
- The street's code stays in the lazy chunk. The main chunk grows by no more than `BrushCypress`'s three props.
- Branches stay local. No push. Commits end with the line `Claude-Session: https://claude.ai/code/session_019qpS5MwgNDUc33Ux7hvWr6`.
- `CLAUDE.md`'s locked sections are not edited. The camera criterion's wording waits for Mark before any merge to `main`.
- The look passes: at most four (`CLAUDE.md`, retune cap). Mark sees the street live at Task 8, before the passes.

## Review focus

1. **Portrait at the ends.** At stop 4 with the portrait field of view (75°) the church's gable and door are both in
   frame. At stop 0 the cypress does not fill the portrait frame. Task 1, test `stop 4 frames the gable and the door`.
   Task 9 reads stop 0 in portrait.
2. **A camera inside a house or a tree.** On the S-curve the camera stands `behind` the lane point, off the lane's
   centre. Every station's camera stays at least 0.1 from every house footprint, tree and the cypress. Task 1, test
   `no station camera stands inside anything`.
3. **The cypress fails to load.** The cypress has its own assets. The street still reports ready and draws without it.
   Task 5, test `the street is ready without the cypress`.
4. **The life rebuilt on a resize.** The fireflies, glows and hills build once. A rotation does not rebuild them. Task
   6, the rotation check reads `__streetLifeBuilds === 1`.
5. **Motion in a reduced-motion visit or a capture.** The sway and the fireflies read the sky's clock, pinned in a
   capture and still under reduced motion. Task 6, test `life time follows the pinned clock and stops when reduced`.

---

### Task 0: Branch, spike and baseline (worker)

**Files:** none changed. Evidence in `scratch/street-s1b-2026-10-23/t0/` (call the evidence root `$E`).

- [ ] **Step 1:** From `feat/street-s1-volumes` at `5fc2774`, create `feat/street-s1b` in a new worktree. Merge
  `spike/street-alive` (`2278cc5`). Run `npm run -s test:sky` and `npx tsc -b`. Expected: 216 pass, 0 errors.
- [ ] **Step 2:** Measure the cypress's triangles: in a scratch copy only (never committed), log
  `geometries.solid.index.count / 3 + geometries.strokes.index.count / 3` from `BrushCypress.tsx`'s `geometries` memo
  on the diorama. Write the number to `$E/numbers.md`. The street's own budget is 1,444,930 − 737,970 (the sky) − the
  cypress's count.
- [ ] **Step 3:** Commit the merge: `chore(street): S1b starts from S1 and the light spike`.

### Task 1: The lane, the houses' table and the stations (worker)

**Files:**
- Change: `src/scene/streetLayout.ts` (the lane, `STREET_HOUSES`, `STREET_TREES`, `STREET_CYPRESS`, `STREET_CHURCH`,
  `stationPose`), `src/scene/streetGeometry.ts` (`house` reads the table, the path's segments, the square),
  `src/scene/streetStrokes.ts` (a placeholder `thatch` source), `src/scene/Street.tsx` and
  `scripts/check-street-colour.ts` (source class 6's ID colour)
- Test: `scripts/street-layout.test.ts`, `scripts/street-build.test.ts`

**Interfaces:**
- Produces: `pathPoint(t)`, `pathTangent(t)` with unchanged signatures, `t` 0 at stop 0 and 1 at the square's edge, a
  straight extension outside [0, 1]. `STREET.pathLength` 1.4. `StreetHouse = { id: string; at: number; side: -1 | 1;
  setback: number; turn: number; type: 'painting' | 'cottage'; w: number; d: number; eave: number; pitch: number;
  wallSource: StreetSourceName; roofSource: StreetSourceName; lit: boolean; chimney: boolean; x: number; z: number;
  yaw: number }` (no knot fields). `house(ctx, owner, index, h: StreetHouse, centre, along, toPath)` reads
  `h.wallSource`, `h.roofSource`, `h.lit` and `h.chimney` (the church passes its own). `STREET_CYPRESS: { x: number; z:
  number; height: number }`. `laneDistance(x: number, z: number): number` (from a point to the lane's centreline).
  `STREET_SOURCES.thatch` (a placeholder, roofSienna's rectangle, Task 2 replaces it), `SOURCE_STROKES.thatch`
  (roofSienna's entry), `SOURCE_CLASSES.thatch` 6, ID colour (255, 128, 0) under `ids=2` and in `--sources`.

- [ ] **Step 1: Tests first.** Replace `houses never block the path` with `houses never block the lane`: every
  footprint corner of every house, signed toward its own side, stands at least 0.08 from the lane's centreline (use
  `laneDistance`). Add:
  - `houses and trees do not overlap`: footprints (houses' rectangles, trees' crown radius 0.17, the cypress's radius
    0.12) pairwise disjoint.
  - `no station camera stands inside anything`: every station's camera, landscape and portrait, at least 0.1 from every
    footprint.
  - `stop 4 frames the gable and the door`: at stop 4, for 50° and 75°, the church's gable peak (nave eave + pitch) and
    the door's foot (y 0 at the nave's front wall) both lie inside the vertical field of view.
  - `the lane is an S`: the lane's lateral offset changes sign twice between t 0 and 1, with |offset| ≥ 0.1 at both
    turns.
  Keep `stations stay inside the painted arc` and `every object lies inside the dome under method A` (add the cypress).
  Run: `node --experimental-strip-types --test scripts/street-layout.test.ts`. Expected: FAIL.
- [ ] **Step 2: The lane.** A Catmull-Rom curve through these (along, lateral) points in the frame of `STREET.forward`
  and its right-hand normal, arc-length parametrised so `t` is the fraction of 1.4: (−0.3, 0), (0, 0), (0.35, −0.12),
  (0.75, 0.12), (1.1, −0.06), (1.4, 0), (1.7, 0). The square: centre at along 1.55, radius 0.25, eight `path`
  triangles about its centre. The path: 24 segments from `t` −0.2 to 1.0, so it follows the S. The church: the nave's
  centre 0.4 beyond `pathPoint(1)` along `pathTangent(1)`, its door toward the lane.
- [ ] **Step 3: The houses.** `HOUSE_SPECS` replaced by this table (`at` as `t`, `setback` from the lane's centre to the
  front wall, `turn` in degrees added to the lane's heading, sizes in world units, `eave` already including storeys):

  | id | at | side | setback | turn | type | w | d | eave | pitch | wall | roof | lit | chimney |
  |---|---|---|---|---|---|---|---|---|---|---|---|---|---|
  | L1 | 0.18 | −1 | 0.22 | −14 | painting | 0.21 | 0.27 | 0.18 | 0.14 | plaster | roofBlue | yes | no |
  | L2 | 0.4 | −1 | 0.34 | 10 | cottage | 0.3 | 0.24 | 0.09 | 0.2 | wallB | thatch | no | yes |
  | L3 | 0.57 | −1 | 0.2 | −22 | painting | 0.22 | 0.29 | 0.22 | 0.14 | wallA | roofSienna | no | yes |
  | L4 | 0.75 | −1 | 0.28 | 6 | painting | 0.28 | 0.3 | 0.3 | 0.13 | plaster | roofStriped | yes | yes |
  | L5 | 0.96 | −1 | 0.3 | −8 | cottage | 0.26 | 0.22 | 0.09 | 0.18 | wallA | thatch | no | no |
  | R1 | 0.1 | 1 | 0.32 | 18 | cottage | 0.32 | 0.26 | 0.1 | 0.2 | wallB | thatch | no | yes |
  | R2 | 0.32 | 1 | 0.2 | −6 | painting | 0.22 | 0.27 | 0.2 | 0.14 | plaster | roofBlue | yes | no |
  | R3 | 0.5 | 1 | 0.4 | 24 | painting | 0.24 | 0.3 | 0.18 | 0.12 | wallB | roofBlue | no | yes |
  | R4 | 0.68 | 1 | 0.24 | −16 | painting | 0.28 | 0.34 | 0.2 | 0.15 | plaster | roofSienna | yes | no |
  | R5 | 0.93 | 1 | 0.3 | 12 | cottage | 0.28 | 0.22 | 0.09 | 0.19 | wallA | thatch | no | yes |

  Until Task 2, a cottage is built by `house` with the placeholder `thatch` source.
- [ ] **Step 4: The trees and the cypress.** `TREE_SPECS` (template, `at`, `side`, `dist` from the lane's centre):

  | template | at | side | dist |
  |---|---|---|---|
  | olive-church | 0.62 | 1 | 0.62 |
  | olive-right | 0.86 | −1 | 0.6 |
  | orchard-lower | 1.1 | −1 | 0.45 |
  | olive-church | 1.1 | 1 | 0.48 |
  | olive-right | 0.28 | −1 | 0.75 |

  `STREET_CYPRESS`: at 0.05, side −1, 0.24 from the lane's centre, height 0.9.
- [ ] **Step 5: The stations.** Stations at `t` 0, 0.25, 0.5, 0.75 look along the lane as today. Stop 4 stands at
  `t` 0.93, its camera `behind` (0.18) back along the lane, its target the nave's door at height 0.13. If the gable test
  fails, lower the target in steps of 0.01 to no lower than 0.1, then move stop 4 back in steps of 0.02.
- [ ] **Step 6:** Run the layout tests and `npm run -s test:sky`. Expected: PASS. Commit:
  `feat(street): the village lane, an S to the church square, ten houses at their own angles (S1b task 1)`.

### Task 2: The Dutch cottage and the thatch (Lead)

**Files:**
- Change: `src/scene/streetStrokes.ts` (`STREET_SOURCES.thatch`, `SOURCE_STROKES.thatch`), `src/scene/streetGeometry.ts`
  (`cottage`, `SOURCE_CLASSES.thatch` 6), `scripts/check-street-colour.ts` (class 6 under `ids=2`)
- Test: `scripts/street-build.test.ts`, `scripts/street-strokes.test.ts`

**Interfaces:**
- Consumes: `StreetHouse` (Task 1).
- Produces: `cottage(ctx: Context, owner: string, index: number, h: StreetHouse, centre: Vector3, along: Vector3,
  toPath: Vector3): void`. `COTTAGE = { thickness: 0.03, overhang: 0.05 }`. ID colour of source class 6: (255, 128, 0).

- [ ] **Step 1: The thatch source.** Pick, by colour and stroke from the scan, a rectangle of warm dark strokes running
  in one direction inside the village or the land (not the sky), at least 400 px. Write it and the reason in the
  record. Lay one thatch face flat beside the source crop at matched scale (as G4a) and read it before Step 2.
- [ ] **Step 2: Tests first.** `a cottage is a thick thatched roof on low walls`: for each cottage, two roof planes clad
  with `thatch`, each with an underside face parallel to it at `COTTAGE.thickness`, edge faces along the eaves and the
  rakes, the eave overhanging the walls by `COTTAGE.overhang`, four walls and two gables clad, every edge inked. Run:
  FAIL.
- [ ] **Step 3:** `cottage` builds the walls and gables as `house` does, then each roof plane as a slab: the top plane
  clad with `thatch`, the underside plane clad with `thatch` at `OPENING_DARK` tint, the edge bands as quads clad with
  the roof's own source. `buildStreet` calls `cottage` for `type: 'cottage'` and `house` otherwise. The lean (Task 4)
  wraps both.
- [ ] **Step 4:** Tests PASS, `test:sky` PASS. Capture stops 0–3. Read the cottages at 1:1 against the painting's
  village crop and Simon's crops. Commit: `feat(street): the Dutch cottage under a thick thatched roof (S1b task 2)`.

### Task 3: Roofs with an edge (Lead)

**Files:** Modify `src/scene/streetGeometry.ts` (`buildHouse`). Test: `scripts/street-build.test.ts`.

- [ ] **Step 1: Test first.** `every painting house's roof has an edge`: each roof plane has an edge band 0.012 deep
  along its eave and its two rakes, clad with the roof's source darkened by `OPENING_DARK`. FAIL.
- [ ] **Step 2:** Add the edge bands in `buildHouse`. PASS. Commit: `feat(street): the painting houses' roofs with an edge (S1b task 3)`.

### Task 4: The moonlight, the wall shade and the lean, from the spike (worker)

**Files:**
- Create: `src/scene/streetLight.ts` (moved from the spike's code in `streetGeometry.ts`)
- Change: `src/scene/streetGeometry.ts`
- Test: `scripts/street-light.test.ts` (register it in `test:sky`)

**Interfaces:**
- Produces: `STREET_LIGHT = { ambient: 0.4, key: 0.9 }`, `STREET_MOON: Vector3` (the sky's moon,
  `uvToFrontDir(MOON_UV)`), `lightOf(face: StreetFace): number`, `wallShade(face: StreetFace, x: number, y: number, z:
  number): number`, `HOUSE_LEAN = 0.09`, `leanOf(index: number): number`.

- [ ] **Step 1: Tests first.**
  - `a face turned to the moon is lit, a face turned away is not`: a wall with normal `STREET_MOON` gives
    `ambient + key`. Its opposite gives `ambient`. A ground face gives 1.
  - `walls darken toward the ground and the corners`: on a 1 × 1 wall standing on the ground, `wallShade` at (0.5, 0)
    is 0.5 × the value at (0.5, 0.6). At (0, 0.6) it is 0.78 × the value at (0.5, 0.6). A gable (`origin.y` > 0.01)
    gives 1.
  - `each house leans within 2.6°, the church not at all`: |`leanOf(i)`| ≤ `HOUSE_LEAN` / 2 for every house,
    `leanOf(100)` 0, and the lean moves no vertex at y 0.
  FAIL (the module does not exist).
- [ ] **Step 2:** Move the spike's `SPIKE_MOON`, `SPIKE_LIGHT`, `lightOf`, `wallShade`, `shadeNew` and the lean's
  formula into `streetLight.ts` under the names above, unchanged in value. PASS. Commit:
  `refactor(street): the moonlight, the wall shade and the lean, named and tested (S1b task 4)`.

### Task 5: The painting's cypress at stop 0 (worker)

**Files:**
- Change: `src/scene/BrushCypress.tsx` (three optional props), `src/scene/Street.tsx` (mount it)
- Test: `scripts/street-mode.test.ts`

**Interfaces:**
- Produces: `BrushCypress` props `at?: [number, number, number]` (default `BASE`), `scale?: number` (default 1),
  `viewFrom?: [number, number, number]` (default `DIORAMA_CAMERAS.design.position`). With no new prop the component is
  today's, bit for bit.

- [ ] **Step 1: Test first.** `the street is ready without the cypress`: `streetReadiness`'s input has no cypress
  status, and `Street.tsx` sets `__streetReady` before the cypress reports. The defaults are pinned by G3 (Step 3).
- [ ] **Step 2:** Add the props. The street mounts `<BrushCypress at={STREET_CYPRESS position} scale={0.9 / 2.7}
  viewFrom={stop 0's camera} />` inside its group, without `touch`, with `alive={false}`.
- [ ] **Step 3:** G3: rerun Task 0's matrix of S1 against its run 1. Expected: all 12 byte-identical. PASS. Commit:
  `feat(street): the painting's cypress towers at the lane's start (S1b task 5)`.

### Task 6: The life, from the spike (worker)

**Files:**
- Rename: `src/scene/streetAlive.tsx` → `src/scene/streetLife.tsx`
- Change: `src/scene/Street.tsx`, `scripts/check-street-rotation.mjs`
- Test: `scripts/street-life.test.ts` (register it in `test:sky`)

**Interfaces:**
- Produces: `StreetLife({ windows, painting, reduced }: { windows: BrushArraysWithCls; painting: ImageData2D;
  reduced: boolean })`, `litWindows(windows): { centre: Vector3; normal: Vector3; width: number }[]`,
  `hillsGeometry(): BufferGeometry`, `lifeTime(pinned: number | undefined, elapsed: number, reduced: boolean): number`,
  `LIFE = { sway: 0.06, fireflies: 160, glow: '#f2cf55', pool: [0.16, 0.5], halo: [0.09, 0.85] }`,
  `HILL_PAINT = [990, 858, 1290, 898]`. `window.__streetLifeBuilds` counts builds.

- [ ] **Step 1: Tests first.**
  - `lit windows are the class-2 quads, their normals out of the house`: on a synthetic windows array (one lit quad on
    a house's front wall, one dark), one window, its normal pointing away from the house's centre.
  - `life time follows the pinned clock and stops when reduced`: `lifeTime(5, 99, false)` is 5,
    `lifeTime(undefined, 99, false)` is 99 and `lifeTime(undefined, 99, true)` is 0.
  - `the hills stand on the ground behind the street`: every top vertex stands above its bottom vertex. Every vertex
    is at least 4 from the street's origin. The ranges span ±1.25 rad of `STREET.forward`.
  FAIL.
- [ ] **Step 2:** Rename and name the spike's parts as above. `lifeTime` replaces the frame loop's inline clock.
  Reduced motion: life time 0, so the fireflies hold their time-0 positions and the trees stand still. Count the builds in
  `__streetLifeBuilds`. PASS.
- [ ] **Step 3:** `check-street-rotation.mjs` also asserts `__streetLifeBuilds === 1`. Run it. PASS. Commit:
  `feat(street): the street's life, named and tested: glow, fireflies, breeze, hills, ground shadows (S1b task 6)`.

### Task 7: Detail with distance (worker)

**Files:**
- Change: `src/scene/streetStrokes.ts` (`traceFace` option `density`), `src/scene/streetLayout.ts` (`detailOf`),
  `src/scene/streetGeometry.ts` (houses and ground tiles)
- Test: `scripts/street-strokes.test.ts`, `scripts/street-build.test.ts`

**Interfaces:**
- Produces: `traceFace(face, flow, painting, { …, density?: number })`, the default count × `density` (default 1).
  `detailOf(x: number, z: number): 1 | 0.5`: 0.5 when the point is farther than 0.9 from every station's camera. The
  report's face lines carry `density`.

- [ ] **Step 1: Tests first.**
  - `density halves the ribbons`: a face at `density` 0.5 has between 0.4 and 0.6 of its ribbons at 1.
  - `far houses and far ground take half`: in `buildStreet`'s report, every face of a house with `detailOf(centre)`
    0.5 has `density` 0.5, every ground tile whose centre is farther than 0.6 from the lane (`laneDistance`) too, and
    every other face 1.
  - `the street fits its budget`: `buildStreet(...).counts.triangles` ≤ Task 0's street budget.
  FAIL.
- [ ] **Step 2:** Implement. PASS. Commit: `perf(street): detail falls with distance from the stations (S1b task 7)`.

### Task 8: Mark sees the street live (Lead)

- [ ] **Step 1:** Run the dev server from the branch. Capture stops 0–4 desktop and stops 0, 2 and 4 portrait into
  `$E/t8/`. Read them at 1:1. Name each defect in the record.
- [ ] **Step 2:** Build the gate sheet (`scratch/street-s1-2026-10-23/gate/build-sheet.sh`). Send Mark the live URL
  `http://127.0.0.1:<port>/?street=1&station=0` and the sheet. Ask one question: does it read as a village now?
- [ ] **Step 3:** Record his words. If he says it does not, stop the plan here and return to the design.

### Task 9: The look passes (Lead)

- [ ] **Step 1:** Capture stops 0–4 landscape and stops 0, 2 and 4 portrait.
- [ ] **Step 2:** Read them at 1:1 against the painting first, then Simon's village. Name every defect in the record
  before any change.
- [ ] **Step 3:** Retune, then rerun Tasks 7 and 10's gates. At most four passes. Stop at the first pass with no defect
  left.

### Task 10: The palette, perf, reduced motion, rotation and G3 (worker)

- [ ] **Step 1:** The palette gate per source (`--sources`, `ids=2`) and per class (`ids=1`) at stops 0–4, desktop and
  mobile. Each in-view source and class ΔE76 < 10. The cyan control exits 1.
- [ ] **Step 2:** Perf at stops 0, 2 and 4 (`capture-diorama.mjs --perf --dpr 1.5`): `info.triangles` ≤ 1,444,930 and
  desktop p95 ≤ 17.8 ms at each.
- [ ] **Step 3:** `check-reduced-motion.mjs` with `?street=1&station=2`, `check-street-rotation.mjs`, the G3 matrix and
  the village hash.
- [ ] **Step 4:** Green: `test:sky`, `tsc -b`, `build` (the main chunk's growth over S1's 1,374.80 kB), `eslint .`.
  Report every number from the logs.

### Task 11: Review, the Lead's gate and the record (Lead, Fable)

- [ ] **Step 1:** Fable's code review of `git diff 5fc2774..HEAD` from a brief file. Fixes in one round. A confirmation
  read bounded to its findings.
- [ ] **Step 2:** The Lead's gate in a clean worktree: S1's G1–G11 adapted (G4 and G5 carried, G11's mutants: the six of
  S1 plus `houses never block the lane` with a house centred on the lane, `the street fits its budget` with `density`
  ignored, and `lifeTime` ignoring `reduced`).
- [ ] **Step 3:** The record, the lessons, the Tunables entry, the todo pickup. Then Mark's gate on the live street.
