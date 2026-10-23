# Street S1b, the village lane: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Revision 3 (2026-10-23, night).** Fable's confirmation read of revision 2 (`plan-confirm-fable.md`) returned CONFIRM
with N1 and N2 at P2, and measured the street's triangles with the real tracer. Task 0 measured the non-street share.
Revision 3 answers N1, N2 and Fable's notes. The section "What revision 3 changed" lists each change.

**Revision 2 (2026-10-23, night).** Revision 1 (`a107891`) drew two reviews: the worker's (GAPS, 25 questions) and
Fable's (REVISE, F1 and F2 at P1, F3 to F9 at P2). Both reports are in `scratch/street-s1b-2026-10-23/`. This revision
answers every item. The section "What revision 2 changed" at the end maps each finding to its answer. The layout numbers
come from a probe in the Lead's scratchpad (`probe-layout.mjs`, `probe-fit.mjs`, `probe-final.mjs`, `probe-l1.mjs`),
which reads the map's lane, houses and trees at one scale and runs this plan's layout tests on them.

**Goal:** Rebuild slice 1's street as an invented village lane at eye level: an S-curved lane to a church square, ten
mixed houses (the painting's and Dutch cottages) at their own angles, the painting's cypress at the start, and the
spike's light and life made real, so the street stops reading as "flat", "dull" and "cardboard".

**Architecture:** Slice 1's build stays (strokes traced on faces, outlines, the ID passes, the palette gate). The
layout is read off the approved map, `scratch/village-redesign-2026-10-23/layout-v1.svg`, at one scale: the lane is
the map's own Bézier path, and every house, tree and the square sit at the map's centres and rotations. The table keeps
its sizes, so the map's scale is the one at which those sizes do not collide (0.0024 world units per map pixel, a lane
2.4 long). A second house type, the cottage, joins `house`. The spike's moonlight, wall shade, lean, window glow,
fireflies, breeze, painted hills and ground shadows become named, tested code. Detail falls with distance so the street
stays within the diorama's triangle count.

**Tech stack:** Vite, React, TypeScript, three.js, React Three Fiber, drei. `node --test` with `--experimental-strip-types`.

**Spec:** `docs/superpowers/specs/2026-10-23-village-street-design.md`, section "The redesign after slice 1's gate"
(it overrides the earlier sections where they differ). The map: `scratch/village-redesign-2026-10-23/layout-v1.svg`
(and its `.png`). The slice 1 plan and record: `tasks/2026-10-23-street-s1-plan.md`, `tasks/2026-10-23-street-s1.md`.

## Session mapping

Herdr workspace `w4`, tab `w4:t1`. Lead: Claude (Opus 5.5) at `w4:p1`. Reviewer: Fable 5.1 at `w4:p4`. Worker: Gemini
3.8 Flash (Antigravity) at `w4:p5`. All three checked live on 2026-10-23 with `herdr agent list`.

## Global constraints

- No new dependency. The worker never installs.
- Every colour comes from the painting or `public/reference/palette.json` (the bar, `CLAUDE.md`, locked). The palette
  gate per source: ΔE76 < 10.
- A plain visit (no `?street=1`) is unchanged: S1's pinned matrix (`scratch/street-s1-2026-10-23/baseline/run1/`, 12
  frames) byte-identical, the village hash `0975d344bc93b08fde008380d0dec336b46c4a6a614c8cba30eb292391ad8ecf`.
- Budget at DPR 1.5, like for like (S1's G7): `info.triangles` ≤ 1,444,930 at every station, desktop p95 ≤ 17.8 ms.
  The budget's method is in "The triangle budget" below.
- The street's code stays in the lazy chunk. The main chunk grows by no more than `BrushCypress`'s four new props and
  the `reduced` prop on `<Street />`.
- Branches stay local. No push. No attribution line on commits this session.
- `CLAUDE.md`'s locked sections are not edited. The camera criterion's wording waits for Mark before any merge to `main`.
- The look passes: at most four (`CLAUDE.md`, retune cap). Mark sees the street live at Task 8, before the passes.

## The map's frame (every layout number below uses it)

- A map point `(x, y)` in `layout-v1.svg`'s pixels has local coordinates `a = (1210 − y) × 0.0024` (along
  `STREET.forward`) and `l = (x − 500) × 0.0024` (along `right`, the walker's right).
- `right` is today's right-hand normal of `STREET.forward`: `(−forward.z, 0, forward.x)` normalised. A local point is
  the world point `a × forward + l × right` (y 0). `MAP = { origin: [500, 1210], scale: 0.0024 }` in `streetLayout.ts`.
- A map rotation `θ` (the SVG's `rotate(θ)`, degrees, positive turns toward `right`) gives a house's width axis
  `cos θ × forward + sin θ × right` and its `yaw = atan2(axis.z, axis.x)`. This is S1's convention: the width runs along
  the axis, the depth across it.
- A house's front faces the lane: `toPath = −side × (cos θ × right − sin θ × forward)`.

## The triangle budget

The cap is 1,444,930 drawn triangles at DPR 1.5 (S1's G7, the diorama's own count). The street mode spends it on three
things. Task 0 measures the first. Tasks 5 and 7 set the other two.

1. **The non-street share: 660,388, measured.** The sky and the spike's life (hills, fireflies, glows) drawn in street
   mode. Task 0 measured `info.triangles` less `__streetCounts.triangles` (663,780) at stations 0, 2 and 4 on `2278cc5`,
   desktop and mobile. The largest is station 4's mobile frame, 1,324,168 (`scratch/street-s1b-2026-10-23/t0/`).
2. **The street's cypress.** The diorama's tree is 537,816 triangles (solid 3,048, strokes 534,768), and `scale` does
   not change that. Task 5 adds a `stride` prop and the Lead picks the stride at stop 0 from 1:1 captures. Fable's probe
   with the seed kept (N1): strokes 271,188 at stride 2, 184,356 at 3, 140,184 at 4.
3. **The street.** `buildStreet(...).counts.triangles`. `STREET_TRIANGLE_BUDGET` in `streetLayout.ts` is 1,444,930 less
   the two numbers above, written in once both are measured.

At stride 4 the street keeps 1,444,930 − 660,388 − 143,232 = 641,310.

Fable measured the street with the real tracer (`plan-confirm-fable.md`, section 4). Its probe reproduces S1's street
to the triangle (663,780), then builds revision 2's faces: ground, path and square 309,394, ten houses 435,234, the
church 45,734, four trees 145,544, in all 935,906 before detail. A cottage costs 58,000 to 64,000 triangles against a
painting house's 26,000 to 36,000, because a wall's ribbon count scales with its width over its eave, and a cottage's
walls are 0.09 high. With `DETAIL.house` at 0.54, 0.5 and 0.46, the street measured 740,982, 724,618 and 710,910.

Revision 3 adds two levers, both measured or checked:

- **Cottage walls and gables take `STREET.wallRef` (0.2) as their stroke reference** (Task 2). The painting houses'
  eaves are 0.18 to 0.3, so one brush size then runs through the village, instead of finer strokes on the low walls.
  Fable measured it: 696,466 at 0.54 and 666,394 at 0.46.
- **The olive at map (860, 930) is not built.** A plan-view check of every station's frame, landscape and portrait
  (`probe-frame.mjs` in the Lead's scratchpad), finds it in no frame. It costs about 36,000 triangles for nothing.
  Every house is in at least one frame. L1 and R1 are in stop 0's landscape frame only, at its edge.

With both, the Lead's estimate is about 656,000 at 0.54, 641,000 at 0.5 and 626,000 at 0.46 against 641,310. Task 7
applies the ladder in a fixed order and stops for Mark if the last rung does not fit. Mark then decides whether to raise
the triangle cap, with his phone's frame rate as the check.

## Review focus

1. **Portrait at the ends.** At stop 4 with the portrait field of view (75°) the church's gable and door are both in
   frame. At stop 0 in portrait the cypress and the church are both in frame. Task 1, tests `stop 4 frames the gable
   and the door` and `stop 0 composes the painting`.
2. **A camera inside a house or a tree.** Every station's camera stays at least 0.1 from every house footprint, the
   nave, every tree's crown reach and the cypress. Task 1, test `no station camera stands inside anything`.
3. **The cypress never loads.** The street still reports ready and draws without it. Task 10, the browser check
   `check-street-cypress-hang.mjs`.
4. **The life rebuilt on a resize.** The fireflies, glows and hills build once. A rotation does not rebuild them. Task
   6, the rotation check reads `__streetLifeBuilds === 1`.
5. **Motion in a reduced-motion visit or a capture.** The sway and the fireflies read the sky's clock, pinned in a
   capture and still under reduced motion. Task 6, test `life time follows the pinned clock and stops when reduced`.
6. **The budget.** The street fits `STREET_TRIANGLE_BUDGET`, and `info.triangles` fits 1,444,930 at every station.
   Tasks 7 and 10.

---

### Task 0: Branch and baseline (worker)

**Files:** none changed. Evidence in `scratch/street-s1b-2026-10-23/t0/` (call the evidence root `$E`, the folder
`scratch/street-s1b-2026-10-23/` in the main checkout).

- [ ] **Step 1:** Create the worktree `$WT` at
  `/private/tmp/claude-502/-Users-markma-Projects-starry-night/d750fced-3005-494a-868b-62ea0c4f1b10/scratchpad/s1b-wt`
  on a new branch `feat/street-s1b` from `2278cc5` (`spike/street-alive`, which already contains `5fc2774`, so no
  merge). Symlink `reference/derived` from the main checkout into `$WT` (it is ignored). Run `npm run -s test:sky` and
  `npx tsc -b` in `$WT`. Expected: 216 pass, 0 errors. Write both outputs to `$E/t0/`.
- [ ] **Step 2:** Start Vite in `$WT` with `--host 127.0.0.1 --port 5183`. At stations 0, 2 and 4, run
  `DIORAMA_CAPTURE_URL=http://127.0.0.1:5183/ DIORAMA_CAPTURE_EXTRA='street=1&station=S' node scripts/capture-diorama.mjs $E/t0/perf-sS --perf --dpr 1.5`
  and read `window.__streetCounts.triangles` on the same page. Write to `$E/t0/numbers.md`, per station:
  `info.triangles`, `__streetCounts.triangles`, their difference, and the p95. The non-street share is the largest
  difference. Do not commit anything in this task.

### Task 1: The lane, the houses' table and the stations (worker)

**Files:**
- Change: `src/scene/streetLayout.ts` (`MAP`, the lane, `STREET_HOUSES`, `STREET_TREES`, `STREET_CYPRESS`,
  `STREET_CHURCH`, `STREET_SQUARE`, `laneOffset`, `laneDistance`, `stationPose`), `src/scene/streetGeometry.ts` (`house`
  reads the table, the path's segments, the square, the ground's extent), `src/scene/streetStrokes.ts` (a placeholder
  `thatch` source), `src/scene/Street.tsx` and `scripts/check-street-colour.ts` (source class 6's ID colour)
- Test: `scripts/street-layout.test.ts`, `scripts/street-build.test.ts`

**Interfaces:**
- Produces: `pathPoint(t)`, `pathTangent(t)` with unchanged signatures. `t` is arc length over the lane's measured
  length: 0 at the map's (500, 1210), 1 at the map's (500, 330). Outside [0, 1] the lane runs straight on along the
  end's tangent, `t` still arc over length. `STREET.pathLength` is the measured length (about 2.396).
- `StreetHouse = { id: string; side: -1 | 1; type: 'painting' | 'cottage'; w: number; d: number; eave: number; pitch:
  number; storeys: 1 | 2; wallSource: StreetSourceName; roofSource: StreetSourceName; lit: boolean; chimney: boolean;
  x: number; z: number; yaw: number }`. No `at`, no knot fields.
- `StreetShape = { w: number; d: number; eave: number; pitch: number; storeys: 1 | 2; wallSource: StreetSourceName;
  roofSource: StreetSourceName }`. `house(ctx, owner, index, shape: StreetShape, centre, along, toPath, lit: boolean,
  chimney: boolean)`. A `StreetHouse` passes itself and its `lit` and `chimney`. The church passes the nave's sizes,
  `storeys: 1`, `wallSource(nave.wall, 100)`, `roofSource(nave.roof, 100)`, and its own `lit` and `chimney` as today.
- `STREET_CYPRESS: { x: number; z: number; height: number }` and `STREET_CYPRESS_AT: readonly [number, number, number]`
  (`[x, 0, z]`, one module constant, so React never sees a new array).
- `STREET_SQUARE: { x: number; z: number; radius: number }`.
- `laneOffset(x: number, z: number): number` signed, positive on side +1 (the walker's right). `laneDistance(x, z)` is
  its absolute value.
- `STREET_SOURCES.thatch` (a placeholder, roofSienna's rectangle, Task 2 replaces it), `SOURCE_STROKES.thatch`
  (roofSienna's entry), `SOURCE_CLASSES.thatch` 6, ID colour (255, 128, 0) under `ids=2` and in `--sources`.

- [ ] **Step 1: Tests first.** In `scripts/street-layout.test.ts` replace `houses never block the path` with `houses
  never block the lane`: for every corner of every house, `house.side × laneOffset(corner)` ≥ 0.08. Add:
  - `the lane is the map's S`: `pathPoint(0)` at the origin, `pathPoint(1)` at local (2.112, 0) within 0.001,
    `STREET.pathLength` between 2.39 and 2.40, and the local lateral `l` of `pathPoint(t)` for `t` in [0, 1] has a
    minimum below −0.2 and a maximum above 0.2.
  - `houses and trees do not overlap`: the ten house rectangles and the nave's are pairwise at least 0.02 apart
    (separating-axis gap). Each tree's crown reach (1.19 × its crown radius, `clamp(width / 2, 0.12, 0.17)`, from
    `streetTrees.ts`) and the cypress (radius 0.12) stand at least 0.02 from every rectangle and from each other.
  - `no station camera stands inside anything`: every station's camera at least 0.1 from every rectangle, every tree's
    reach and the cypress.
  - `stop 4 frames the gable and the door`: at stop 4, for 50° and 75°, the elevation of the nave's gable peak (y =
    eave + pitch) and of the door's foot (y 0), both at the front wall's centre, lie inside the camera's pitch ± half
    the field of view.
  - `stop 0 composes the painting`: in landscape the cypress's centre lies 22° to 30° left of the camera's heading and
    the nave's centre 5° to 13° right of it. In portrait both lie within 19.5° of the heading.
  Keep `stations stay inside the painted arc` and `every object lies inside the dome under method A` (add the cypress
  at its height and each tree's reach). Run `node --experimental-strip-types --test scripts/street-layout.test.ts`.
  Expected: FAIL.
- [ ] **Step 2: The lane.** A three.js `CurvePath` of three `CubicBezierCurve3`, the map's path
  `M500 1210 C470 1100 380 1020 400 900 C420 790 590 740 600 620 C610 520 480 470 500 330`, each control point
  converted to local (a, 0, l), then to world. `pathPoint(t)` is `getPointAt(t)` and `pathTangent(t)` is
  `getTangentAt(t)` inside [0, 1]. Outside, the straight line along the end's tangent. `laneOffset` is the signed
  distance to the lane sampled at 400 points over `t` −0.2 to 1.0: the nearest segment's distance, its sign from the
  cross product with that segment's direction.
- [ ] **Step 3: The square, the church and the path.** `STREET_SQUARE`: the map's (500, 300), radius 0.25. The nave's
  centre is the square's centre plus `(0.25 + nave.d / 2) × forward`, its front wall (the door) facing back down the
  lane: `yaw = atan2(forward.x, −forward.z)`, the belfry placed from it as today. The path: 24 segments from `t` −0.2 to
  1.0. The square: eight `path` triangles about its centre. The ground's near band runs from −0.45 to the along of
  `pathPoint(1)` plus 0.75 (about 2.86), so it covers the church. The far band starts there.
- [ ] **Step 4: The houses.** `HOUSE_SPECS` replaced by this table. `x`, `y` and `θ` are the map's. Sizes are world
  units. `eave` already includes the storeys. L1 stands 90 px left of the map's place, because the cypress takes it
  (see Step 5).

  | id | map x | map y | θ | side | type | w | d | eave | pitch | storeys | wall | roof | lit | chimney |
  |---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
  | L1 | 160 | 1010 | −14 | −1 | painting | 0.21 | 0.27 | 0.18 | 0.14 | 1 | plaster | roofBlue | yes | no |
  | L2 | 225 | 830 | 10 | −1 | cottage | 0.3 | 0.24 | 0.09 | 0.2 | 1 | wallB | thatch | no | yes |
  | L3 | 330 | 690 | −22 | −1 | painting | 0.22 | 0.29 | 0.22 | 0.14 | 1 | wallA | roofSienna | no | yes |
  | L4 | 300 | 520 | 6 | −1 | painting | 0.28 | 0.3 | 0.3 | 0.13 | 2 | plaster | roofStriped | yes | yes |
  | L5 | 340 | 380 | −8 | −1 | cottage | 0.26 | 0.22 | 0.09 | 0.18 | 1 | wallA | thatch | no | no |
  | R1 | 700 | 1060 | 18 | 1 | cottage | 0.32 | 0.26 | 0.1 | 0.2 | 1 | wallB | thatch | no | yes |
  | R2 | 640 | 900 | −6 | 1 | painting | 0.22 | 0.27 | 0.2 | 0.14 | 1 | plaster | roofBlue | yes | no |
  | R3 | 790 | 760 | 24 | 1 | painting | 0.24 | 0.3 | 0.18 | 0.12 | 1 | wallB | roofBlue | no | yes |
  | R4 | 760 | 560 | −16 | 1 | painting | 0.28 | 0.34 | 0.2 | 0.15 | 1 | plaster | roofSienna | yes | no |
  | R5 | 680 | 400 | 12 | 1 | cottage | 0.28 | 0.22 | 0.09 | 0.19 | 1 | wallA | thatch | no | yes |

  Each house's centre, `yaw` and `toPath` follow "The map's frame". A storey's height is `eave / storeys`. The door
  and each window row sit on the ground storey as S1 places them on a one-storey wall, and a two-storey house repeats
  the window row on the upper storey. Until Task 2, a cottage is built by `house` with the placeholder `thatch` source.
- [ ] **Step 5: The trees and the cypress.** `TREE_SPECS` (template, map x, map y): `olive-church` (440, 610),
  `orchard-lower` (720, 240), `olive-right` (270, 240). (Revision 2's fourth, `olive-right` at (860, 930), is in no
  station's frame. See "The triangle budget".) Each tree's centre follows "The
  map's frame". The cypress follows stop 0's composition: from stop 0's camera, 0.9 along the direction 26° left of
  stop 0's landscape heading (Step 6). Height 0.9. The probe puts it at local (0.555, −0.481).
- [ ] **Step 6: The stations.** Stations stand at `t` 0, 0.23, 0.44, 0.66 and 0.9 (the map's five stops projected onto
  the lane). Each camera stands at `pathPoint(t) − pathTangent(t) × STREET.behind` at `STREET.eye`. The targets:
  - Stop 0, landscape: the direction from the camera to the nave's centre, turned 9° left (the painting's spire sits
    at x ≈ 0.6). Portrait: that direction turned 8° further left. Both at `STREET.lookHeight`, 0.6 from the camera.
  - Stops 1 to 3: `pathPoint(t + 0.6 / STREET.pathLength)` at `STREET.lookHeight`, so the eye follows the S. The probe's
    headings: 10.7°, 38.6° and −12.8° from `forward`.
  - Stop 4: the centre of the nave's front wall. Its height centres the door's foot and the gable's peak:
    `pitch = (atan((eave + pitch − eye) / D) − atan(eye / D)) / 2`, `D` the horizontal distance from the camera to that
    point, the target's height `eye + D × tan(pitch)`. The probe: `D` 0.724, pitch 8.9°, height 0.203. The frame's top
    is 33.9° at 50° and 46.4° at 75°, inside the painted arc's 50°.
- [ ] **Step 7:** Run the layout tests and `npm run -s test:sky`. Expected: PASS. Commit:
  `feat(street): the village lane read off the map, an S to the church square, ten houses at their own angles (S1b task 1)`.

### Task 2: The Dutch cottage and the thatch (Lead)

**Files:**
- Change: `src/scene/streetStrokes.ts` (`STREET_SOURCES.thatch`, `SOURCE_STROKES.thatch`), `src/scene/streetGeometry.ts`
  (`cottageFaces`, `cottage`)
- Test: `scripts/street-build.test.ts`, `scripts/street-strokes.test.ts`

**Interfaces:**
- Consumes: `StreetHouse`, `StreetShape` (Task 1).
- Produces: `cottageFaces(shape: StreetShape, centre: Vector3, along: Vector3, toPath: Vector3): { name: string; kind:
  'wall' | 'roof' | 'underside' | 'edge'; corners: Vector3[] }[]` (pure, the test's seam), `cottage(ctx, owner, index,
  h, centre, along, toPath): void`. `COTTAGE = { thickness: 0.03, overhang: 0.05 }`.

- [ ] **Step 1: The thatch source.** Pick, by colour and stroke from the scan, a rectangle of warm dark strokes running
  in one direction inside the village or the land (not the sky), at least 400 px. Write it and the reason in the
  record. Lay one thatch face flat beside the source crop at matched scale (as G4a) and read it before Step 2.
- [ ] **Step 2: Tests first.** `a cottage is a thick thatched roof on low walls`, on `cottageFaces` for each cottage:
  two roof planes, each with an underside parallel to it at `COTTAGE.thickness`, edge faces along the eaves and the
  rakes, the eave overhanging the walls by `COTTAGE.overhang`, four walls and two gables. FAIL.
- [ ] **Step 3:** `cottage` clads the walls, the gables and the two roof planes with strokes (the roof with `thatch`).
  The walls and the gables take `STREET.wallRef` as their stroke reference, not the eave.
  The undersides and the edges are solid underpaint polygons: the underside in `OPENING_DARK`, the edges in the thatch's
  mean colour darkened by `OPENING_DARK`. Every stroked face is inked. `buildStreet` calls `cottage` for `type:
  'cottage'` and `house` otherwise. The lean (Task 4) wraps both.
- [ ] **Step 4:** Tests PASS, `test:sky` PASS. Capture stops 0 to 3. Read the cottages at 1:1 against the painting's
  village crop and Simon's crops. Commit: `feat(street): the Dutch cottage under a thick thatched roof (S1b task 2)`.

### Task 3: Roofs with an edge (Lead)

**Files:** Change `src/scene/streetGeometry.ts` (`houseRoofEdges`, `house`). Test: `scripts/street-build.test.ts`.

- [ ] **Step 1: Test first.** `every painting house's roof has an edge`: `houseRoofEdges(shape, centre, along, toPath)`
  (pure) returns, for each roof plane, an edge band 0.012 deep along its eave and its two rakes. FAIL.
- [ ] **Step 2:** `house` adds the bands as solid underpaint polygons in the roof source's mean colour darkened by
  `OPENING_DARK`. PASS. Commit: `feat(street): the painting houses' roofs with an edge (S1b task 3)`.

### Task 4: The moonlight, the wall shade and the lean, from the spike (worker)

**Files:**
- Create: `src/scene/streetLight.ts` (moved from the spike's code in `streetGeometry.ts`)
- Change: `src/scene/streetGeometry.ts`, `src/scene/Street.tsx` (the `light=0` flag)
- Test: `scripts/street-light.test.ts` (add it to `test:sky` in the same commit)

**Interfaces:**
- Produces: `STREET_LIGHT = { ambient: 0.4, key: 0.9 }`, `STREET_MOON: Vector3` (`uvToFrontDir(MOON_UV[0],
  MOON_UV[1])`, the spike's expression), `lightOf(face: StreetFace): number`, `wallShade(face: StreetFace, x: number, y:
  number, z: number): number`, `shadeNew(arr: BrushArrays, from: number, face: StreetFace): void` (exported, `clad`
  calls it), `HOUSE_LEAN = 0.09`, `leanOf(index: number): number`. The lean is `x += along.x × leanOf(i) × y` and the
  same for `z`.
- The dev flag `light=0` (read with the street's other flags): `lightOf` returns 1, `wallShade` returns 1, and
  `StreetLife` is not mounted. The gate's colour captures use it on both frames (F5). The lit look is Mark's to judge.

- [ ] **Step 1: Tests first.**
  - `a face turned to the moon is lit, a face turned away is not`: a wall with normal `STREET_MOON` gives
    `ambient + key`. Its opposite gives `ambient`. A ground face gives 1.
  - `walls darken toward the ground and the corners`: on a 1 × 1 wall standing on the ground, `wallShade` at (0.5, 0)
    is 0.5 × the value at (0.5, 0.6). At (0, 0.6) it is 0.78 × the value at (0.5, 0.6). A gable (`origin.y` > 0.01)
    gives 1.
  - `each house leans within 2.6°, the church not at all`: |`leanOf(i)`| ≤ `HOUSE_LEAN` / 2 for every house index and
    `leanOf(100)` is 0. The lean adds `leanOf(i) × y`, so a vertex at y 0 never moves: the test checks `leanOf` only.
  - `light=0 makes the street unlit`: with the flag, `lightOf` and `wallShade` return 1 for the faces above.
  FAIL (the module does not exist).
- [ ] **Step 2:** Move the spike's `SPIKE_MOON`, `SPIKE_LIGHT`, `lightOf`, `wallShade`, `shadeNew` and the lean's
  formula into `streetLight.ts` under the names above, unchanged in value. Add the flag. PASS. Commit:
  `refactor(street): the moonlight, the wall shade and the lean, named and tested (S1b task 4)`.

### Task 5: The painting's cypress at stop 0 (worker builds, Lead reads)

**Files:**
- Change: `src/scene/BrushCypress.tsx` (four optional props), `src/scene/cypressStrokes.ts` (`strideSamples`),
  `src/scene/Street.tsx` (mount it)
- Test: `scripts/street-mode.test.ts` or the cypress's existing stroke test file (whichever holds `traceCypressRibbons`'
  tests)

**Interfaces:**
- Produces: `BrushCypress` props `at?: readonly [number, number, number]` (default `BASE`), `scale?: number` (default
  1), `viewFrom?: readonly [number, number, number]` (default `DIORAMA_CAMERAS.design.position`), `stride?: number`
  (default 1). `cypressViewBearing` takes `at`, not `BASE`. With no new prop the component is today's, bit for bit.
- `strideSamples(ribbon, k)`: keeps every `k`-th sample of a traced ribbon, its first and last always, and the sample
  that is `ribbon.seedSample` always (`drapeRibbon` anchors the kept run on it, Fable N1), before `ribbonColumns` and
  `drapeRibbon`. `k` 1 returns the ribbon unchanged.
- The dev seam `window.__cypressTriangles` (the solid's and the strokes' index counts over 3, set after the build).

- [ ] **Step 1: Test first.** `strideSamples keeps the ends, the seed and every k-th sample`: on a synthetic ribbon of
  11 samples with its seed at index 5, `k` 1 returns all 11, `k` 4 returns samples 0, 4, 5, 8 and 10, and every
  per-sample array keeps its length in step. For `k` 1 to 4 the result includes `seedSample`. FAIL.
- [ ] **Step 2:** Add the props and `strideSamples`. PASS. The street mounts
  `<BrushCypress at={STREET_CYPRESS_AT} scale={0.9 / 2.7} viewFrom={STOP0_CAMERA} stride={…} />` inside its group,
  without `touch`, with `alive={false}`. `STOP0_CAMERA` is one module constant in `streetLayout.ts`.
- [ ] **Step 3: The stride's evidence.** Capture stop 0 landscape (1440 × 900) and portrait (390 × 844) at strides 1,
  2, 3 and 4 into `$E/t5/`, with `light=0`. Record `__cypressTriangles` for each. Crop the cypress at 1:1 from each
  capture. Report the paths. Stop here: the Lead picks the stride.
- [ ] **Step 4 (Lead):** Read the crops at 1:1 against stride 1. Pick the largest stride that reads the same. If every
  stride that fits the budget facets, the fallbacks are three strip columns instead of five, then fewer ribbons, each
  read the same way. Write the stride and the triangles into the record and into `STREET_TRIANGLE_BUDGET`'s comment.
- [ ] **Step 5:** G3: rerun S1's pinned matrix against `scratch/street-s1-2026-10-23/baseline/run1/` with the commands
  in `scratch/street-s1-2026-10-23/rerun-report.md`, section 2. Expected: all 12 byte-identical. Commit:
  `feat(street): the painting's cypress towers at the lane's start (S1b task 5)`.

### Task 6: The life, from the spike (worker)

**Files:**
- Rename: `src/scene/streetAlive.tsx` → `src/scene/streetLife.tsx`
- Change: `src/scene/Street.tsx`, `src/DioramaExperience.tsx` (pass `reduced` to `<Street />`),
  `scripts/check-street-rotation.mjs`
- Test: `scripts/street-life.test.ts` (add it to `test:sky` in the same commit)

**Interfaces:**
- Produces: `StreetLife({ windows, painting, reduced }: { windows: BrushArraysWithCls; painting: ImageData2D;
  reduced: boolean })`, `litWindows(windows): { centre: Vector3; normal: Vector3; width: number }[]`,
  `hillsGeometry(): BufferGeometry`, `lifeTime(pinned: number | undefined, elapsed: number, reduced: boolean): number`,
  `swayInjection(): Omit<AliveInjection, 'key'>` and the life's time uniform (both exported, `Street.tsx` applies the
  sway to the trees' materials), `LIFE = { sway: 0.06, fireflies: 160, fireflyT: [0.05, 1.0], glow: '#f2cf55', pool:
  [0.16, 0.5], halo: [0.09, 0.85] }` (`fireflyT` is the range of `t` the fireflies stand over: the spike's 0.25 to 1.4
  was the old 1.2 lane, and on the new lane 1.4 is 0.96 past its end, through the church), `HILL_PAINT = [990, 858, 1290, 898]`. `window.__streetLifeBuilds` counts builds. `Street` takes
  `reduced: boolean` from `DioramaExperience.tsx`, which already holds it.

- [ ] **Step 1: Tests first.**
  - `lit windows are the class-2 quads, their normals out of the house`: a synthetic windows array with one lit quad on
    `STREET_HOUSES[0]`'s front wall and one dark quad gives one window, its normal pointing away from that house's
    centre.
  - `life time follows the pinned clock and stops when reduced`: `lifeTime(5, 99, false)` is 5,
    `lifeTime(undefined, 99, false)` is 99 and `lifeTime(undefined, 99, true)` is 0.
  - `the hills stand on the ground behind the street`: every top vertex stands above its bottom vertex. Every vertex
    is at least 4 from the street's origin. The ranges span ±1.25 rad of `STREET.forward`.
  FAIL.
- [ ] **Step 2:** Rename and name the spike's parts as above. `lifeTime` replaces the frame loop's inline clock.
  Reduced motion: life time 0, so the fireflies hold their time-0 positions and the trees stand still. Count the builds
  in `__streetLifeBuilds`. PASS.
- [ ] **Step 3:** `check-street-rotation.mjs` also asserts `__streetLifeBuilds === 1`. Run it. PASS. Commit:
  `feat(street): the street's life, named and tested: glow, fireflies, breeze, hills, ground shadows (S1b task 6)`.

### Task 7: Detail with distance (worker)

**Files:**
- Change: `src/scene/streetStrokes.ts` (`traceFace` option `density`), `src/scene/streetLayout.ts` (`detailOf`,
  `STREET_TRIANGLE_BUDGET`), `src/scene/streetGeometry.ts` (houses and ground tiles)
- Test: `scripts/street-strokes.test.ts`, `scripts/street-build.test.ts`

**Interfaces:**
- Produces: `traceFace(face, flow, painting, { …, density?: number })`: the face's ribbon count × `density` (default 1),
  the strokes' size unchanged. (The sources' cover is 3 to 6, so half the ribbons still cover a face.)
- `DETAIL = { lane: 0.6, house: 0.54 }`. `detailOf(x: number, z: number): 1 | 0.5` is 0.5 when the point is farther
  than `DETAIL.house` from every station's camera. A ground tile takes 0.5 when its centre's `laneDistance` exceeds
  `DETAIL.lane`. The far and side tiles take 0.5. The church, the path and the square always take 1.
- The report's face lines become `{ owner: string; name: string; ribbons: number; density: number }`.
- `STREET_TRIANGLE_BUDGET = 1,444,930 − the non-street share (Task 0) − the cypress's triangles at its stride (Task 5)`,
  with both numbers and their evidence paths in its comment.

- [ ] **Step 1: Tests first.**
  - `density halves the ribbons`: a face at `density` 0.5 has between 0.4 and 0.6 of its ribbons at 1.
  - `far houses and far ground take half`: in `buildStreet`'s report, every face of a house whose centre has
    `detailOf` 0.5 has `density` 0.5, every ground tile beyond `DETAIL.lane` too, and every other face 1. The test also
    asserts that at least one house and at least one near ground tile take 0.5, so it cannot pass on an empty set.
  - `the street fits its budget`: `buildStreet(...).counts.triangles` ≤ `STREET_TRIANGLE_BUDGET`.
  FAIL.
- [ ] **Step 2:** Implement. Run the tests.
- [ ] **Step 3: If the budget test fails,** set `DETAIL.house` to 0.5, then 0.46, and rerun after each. The probe's
  camera distances: L1 0.663, R1 0.650, L4 0.577, L5 0.555, R4 0.550, R3 0.525, R2 0.467, L3 0.448, L2 0.432, R5
  0.411. The nearest house to a step is R2, 0.007 from 0.46. If it still fails at 0.46, stop and report the street's triangles per mesh to the Lead. The Lead takes the
  choice to Mark. Do not lower anything else.
- [ ] **Step 4:** PASS. Commit: `perf(street): detail falls with distance from the stations (S1b task 7)`.

### Task 8: Mark sees the street live (Lead)

- [ ] **Step 1:** Run the dev server from the branch. Capture stops 0 to 4 desktop and stops 0, 2 and 4 portrait into
  `$E/t8/`. Read them at 1:1. Name each defect in the record.
- [ ] **Step 2:** Build the gate sheet (`scratch/street-s1-2026-10-23/gate/build-sheet.sh`). Send Mark the live URL
  `http://127.0.0.1:<port>/?street=1&station=0` and the sheet. Ask one question: does it read as a village now?
- [ ] **Step 3:** Record his words. If he says it does not, stop the plan here and return to the design.

### Task 9: The look passes (Lead)

- [ ] **Step 1:** Capture stops 0 to 4 landscape and stops 0, 2 and 4 portrait.
- [ ] **Step 2:** Read them at 1:1 against the painting first, then Simon's village. Name every defect in the record
  before any change.
- [ ] **Step 3:** Retune, then rerun Tasks 7 and 10's gates. At most four passes. Stop at the first pass with no defect
  left.

### Task 10: The palette, perf, reduced motion, rotation, the cypress hang and G3 (worker)

- [ ] **Step 1:** Capture the colour pairs (full and ID frames) at stops 0 to 4, desktop and mobile, with S1's commands
  (`scratch/street-s1-2026-10-23/rerun-report.md`, section 4) and `light=0` added to both frames of every pair. Run the
  palette gate per source (`--sources`, `ids=2`) and per class (`ids=1`). Each in-view source and class ΔE76 < 10. The
  cyan control exits 1.
- [ ] **Step 2:** Perf at stops 0, 2 and 4:
  `DIORAMA_CAPTURE_URL=http://127.0.0.1:<port>/ DIORAMA_CAPTURE_EXTRA='street=1&station=S' node scripts/capture-diorama.mjs $E/t10/perf-sS --perf --dpr 1.5`.
  `info.triangles` ≤ 1,444,930 and desktop p95 ≤ 17.8 ms at each.
- [ ] **Step 3:** Create `scripts/check-street-cypress-hang.mjs`: open `?street=1&station=0` with Playwright, hold the
  request for `/reference/cypress-flow.png` unanswered (`page.route` with a handler that never responds), and assert
  `__streetReady` within 25 s (the app has no street timeout, and `check-street-rotation.mjs` waits 25 s) and the
  street's meshes present (`__streetCounts.triangles` > 0). `page.goto` waits for `domcontentloaded`, because the held
  request keeps `load` from firing. Then
  break the guard on purpose (make `__streetReady` wait for the cypress), run the check again to see it fail, and revert. Write
  both runs to `$E/t10/`.
- [ ] **Step 4:** `check-reduced-motion.mjs` with `?street=1&station=2`, `check-street-rotation.mjs`, the G3 matrix and
  the village hash.
- [ ] **Step 5:** Green: `test:sky`, `tsc -b`, `build` (the main chunk's growth over S1's 1,374.80 kB), `eslint .` (in
  `$WT`). Report every number from the logs.

### Task 11: Review, the Lead's gate and the record (Lead, Fable)

- [ ] **Step 1:** Fable's code review of `git diff 2278cc5..HEAD` from a brief file. Fixes in one round. A confirmation
  read bounded to its findings.
- [ ] **Step 2:** The Lead's gate in a clean worktree: S1's G1 to G11 adapted (G4 and G5 carried, G11's mutants: the
  six of S1 plus `houses never block the lane` with a house centred on the lane, `the street fits its budget` with
  `density` ignored, and `lifeTime` ignoring `reduced`).
- [ ] **Step 3:** The record, the lessons, the Tunables entry, the todo pickup. Then Mark's gate on the live street.

---

## What revision 2 changed

Fable's findings (`plan-review-fable.md`):

- **F1 (P1), the budget.** Answered by "The triangle budget": the non-street share measured in Task 0, the cypress's
  `stride` (a fourth prop) picked by the Lead at 1:1 in Task 5, `STREET_TRIANGLE_BUDGET` in code, `DETAIL.house` set
  from the probe's camera distances (0.54 halves L1, R1, L4, L5 and R4, no house within 0.01 of the line), a test that cannot pass on an empty set, roof
  edges and cottage undersides as underpaint, and a stop for Mark if the last lever does not fit.
- **F2 (P1), the tables collide.** Every centre and rotation is now the map's, in the frame of `STREET.forward`, at
  one scale. The table's sizes win. At 0.0024 the probe finds no house pair closer than 0.04, every corner at least
  0.08 from the lane, and every camera at least 0.21 from anything. L1 moves 90 px left for the cypress (F6). The
  map's tree dots are drawn smaller than the trees' 0.15 to 0.20 reach, so four trees stand at places the probe found
  clear, two of them flanking the church.
- **F3 (P2), `t` 1.** `t` is arc over the measured length. `t` 1 is the map path's end. The church stands on
  `forward` from the square's centre, its front wall at the square's far edge, facing down the lane.
- **F4 (P2), stop 4.** The target's height is computed to centre the door's foot and the gable's peak (0.203 at the
  probe's `D` 0.724), so no fallback steps remain.
- **F5 (P2), the moonlight and the palette gate.** The dev flag `light=0` (Task 4), used on both frames of Task 10's
  colour captures.
- **F6 (P2), the cypress at stop 0.** Placed from stop 0's composition: 26° left of the landscape heading, 0.9 away,
  which puts its body at the painting's x 0.05 to 0.30. Portrait turns 8° further left, so the cypress (18° left) and
  the church (17° right) are both in frame. Test `stop 0 composes the painting`.
- **F7 (P2), the lane's side.** `laneOffset` signed, `laneDistance` its absolute value, the test uses
  `side × laneOffset`.
- **F8 (P2), the cypress's readiness.** Replaced by the browser check `check-street-cypress-hang.mjs` (Task 10), which
  holds the cypress's own asset unanswered and needs no new app flag.
- **F9 (P2), the two-storey house.** `storeys` on the table (L4 has 2) and a window row per storey.
- **Below P2.** `Street` takes `reduced` from `DioramaExperience.tsx` (Task 6). Tasks 2 and 3 test pure face builders
  (`cottageFaces`, `houseRoofEdges`). Task 5's matrix is S1's `baseline/run1`. Tree reach is 1.19 × the crown radius.
  `STREET_CYPRESS_AT` and `STOP0_CAMERA` are module constants. `uvToFrontDir` takes two numbers.

The worker's gaps (`plan-review-worker.md`):

- Task 0: branch from `2278cc5` directly (a merge would be a fast-forward), no commit. The non-street share is measured
  in the browser. The budget lives in code as `STREET_TRIANGLE_BUDGET`.
- Task 1: `t` and the extension are defined in Step 2. The placement formulas are in "The map's frame". `laneOffset` is
  signed. The church passes a `StreetShape`.
- Task 4: `uvToFrontDir(MOON_UV[0], MOON_UV[1])`, `shadeNew` exported, the lean tested through `leanOf` only.
- Task 5: the readiness test is the browser check in Task 10. `at` is `[x, 0, z]`. `cypressViewBearing` takes `at`.
- Task 6: `swayInjection` and the time uniform are exported. `DioramaExperience.tsx` passes `reduced`. The `litWindows`
  test uses `STREET_HOUSES[0]`'s front wall.
- Task 7: `STREET_TRIANGLE_BUDGET` in `streetLayout.ts`. The report's face lines gain `density`.
- Task 10: the perf and colour commands are written out.

## What revision 3 changed

Fable's confirmation read (`plan-confirm-fable.md`, CONFIRM) and Task 0's numbers:

- **N1 (P2), `strideSamples` dropped the drape's anchor.** Accepted. It keeps `ribbon.seedSample` too, and the test
  asserts it at every `k` (Task 5).
- **N2 (P2), the ladder missed at every rung.** Accepted. "The triangle budget" now carries the measured share, Fable's
  measured street, and two new levers: cottage walls and gables at `STREET.wallRef` (Task 2) and the unseen olive not
  built (Task 1). The stop for Mark stays. Fable proposed asking Mark about the cap at Task 8. The Lead keeps the cap
  and asks only if the ladder's last rung misses, because the levers are expected to close it.
- **Notes.** The fireflies' range is `LIFE.fireflyT`, 0.05 to 1.0 on the new lane (Task 6). The hang check waits 25 s
  and loads to `domcontentloaded` (Task 10). The sentence about `DETAIL`'s margins is corrected (R2 is 0.007 from 0.46).
  The two crowns 0.023 and 0.024 from a wall pass the test and are a look-pass matter.
- **Task 0.** The non-street share is 660,388 (station 4's mobile frame). The worker's summary took the desktop frames
  only (660,124).
