# The village's craft, K1 the houses: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Revision 0 (2026-10-25, near midnight).** Mark approved the craft design ("go with your recommendation, start the
plan"), so every Lead's call in it stands. This plan is K1, the houses. K2, the lane, gets its own plan after K1's gate,
because its budget is what K1 leaves.

**Goal:** Each house on the lane reads as a solid building painted in Vincent's strokes: walls of solid paint, a door
set into the wall with a frame and a step, shutters beside the front windows, and eaves with depth.

**Architecture:** The street's build (`src/scene/streetGeometry.ts`) gains four parts. The walls' paint becomes two
knobs on the build's context, as the walls' light is, so the church keeps today's paint. The church's recessed door is
given to every painting house, with the opening's ink and a flat frame band, and every door gets a step. Two flat leaves
stand beside each front window. A house's eaves overhang further, with an underside. The look passes then set the
paint's values at 1:1 against the scan, and the walls' strokes pay the triangles.

**Tech stack:** three.js, the street's builders (`clad`, `opening`, `recessedDoor`, `outlineFace`, `polygon`), R3F,
`node --test`, the check scripts. No new dependency.

**Spec:** `docs/superpowers/specs/2026-10-25-village-craft-design.md`, "Solid paint", "Doors", "Shutters" and "Eaves",
with its Constraints and Anti-goals.

## Session mapping

Lead: Claude, `w4:p1`. Worker: Gemini, `w4:p5`, for Tasks 1 to 3 (Mark, 2026-10-25: mechanical work to the worker).
Reviewer: Codex, `w4:p4`, or the Consultant (Fable, `w4:p6`) when Codex runs low. The Lead checks each address against
`herdr agent list` and each quota in Quota Finch's cache before a dispatch. The worktree is `scratchpad/craft-wt` on
`feat/village-craft`, stacked on `feat/phone-framing` (`56c3f9c`), served at `http://127.0.0.1:5205/`. The base is
`scratchpad/framing-wt` at `http://127.0.0.1:5204/`. The evidence goes in
`/Users/markma/Projects/starry-night/scratch/village-craft-2026-10-25/` (`E/` below), the tools in `E/tools/`. Nothing
is pushed before Mark sees it.

## The facts the plan rests on (read at `e949502`)

1. **The base's triangles.** With the real scan and the grass, the street's build is 603,641 triangles, its walls'
   strokes 183,404 (`E/base-split.log`, `E/tools/street-tri-split.ts`). Ribbons: the houses 2,062, the church 498, the
   belfry 150, the spire 224. The build takes 646 ms in node, the median of five. Its arrays hash to
   `71114298aa85575a` (`E/base-hash.log`, `E/tools/build-hash.ts`, the same on two runs).
2. **The browser's room.** At the frogs' head the walk's tightest point was the desktop at `t` 0.295: 1,444,499, which
   is 431 under the ceiling (`scratch/street-frogs-2026-10-25/t4/tri-sweep.log`). The three branches since then do not
   change the street's draw. Task 0 reads it again at the base.
3. **The houses.** Ten (`STREET_HOUSES`, `src/scene/streetLayout.ts:177-188`). Six painting houses: L1, L3, L4, R2,
   R3, R4. L4 has two storeys. Four cottages: L2, L5, R1, R5. The front windows: seven on the painting houses, four on
   the cottages, so 22 shutter leaves.
4. **The levels off a wall's face.** The strokes ride 0.002 to 0.00425 (`STROKE_LIFT` + 15 × `LIFT_STEP`,
   `streetStrokes.ts:82-89`). A window's or a door's pane sits at 0.0055 (`streetGeometry.ts:208`). `outlineFace` lifts
   its ink 0.005 (`OUTLINE_LIFT`) above the edge it is given. So a recessed door's ink, given edges on the wall, lies at
   0.005, and a window's frame, given the pane's edges, at 0.0105. The depth buffer resolves 0.15 mm out to about
   3 units (`streetStrokes.ts:84-87`).
5. **The lean.** `leaned()` shears the underpaint, the strokes, the outlines and the windows by `leanOf(index) × y`
   along the house's width (`streetGeometry.ts:265-277`). The report's corners are taken before the shear. The church's
   drawn checks pass only because `leanOf(100)` is 0.
6. **The church is a house.** `church()` builds its nave with `house(ctx, 'church', 100, …)`, so every change to
   `buildHouse` reaches it unless the church's shape or the context keeps it out. `church()` already sets
   `ctx.wallLight` to `CHURCH_LIGHT` and restores it after (`streetGeometry.ts:528`, `:575`).
7. **The church's door.** `cladRound` cuts the front wall into three faces round the hole. `recessedDoor` inks the
   hole's edges at the wall's height (`streetGeometry.ts:393`), wider than a house's door can carry. A window's frame
   inks at `FRAME` (0.35) × the wall's height.
8. **One overhang.** `houseRoofPlanes` uses `OVERHANG` (0.015) on both axes: past the side walls (the eaves) and past
   the gables (the rakes) (`streetGeometry.ts:423-432`).
9. **The grass.** A blade is cleared within `GRASS.house` (0.012) of a house's box (`streetGrass.ts:85-95`). A blade
   is about 0.035 tall. The church's step stands 0.03 out from its wall. A house's step there would hold blades.
10. **The windows' buffer.** `litWindows` reads the windows' buffer four vertices at a time, keyed on class 2
    (`streetLife.ts`). A polygon that is not a quad there breaks it.
11. **The ID classes.** `cls`: 0 walls, 1 roofs, 2 windows, 3 ground, 4 path, 255 none. `src`: a wall's or a roof's
    `SOURCE_CLASSES` entry, else 255 (`streetGeometry.ts:88-98`, `:176-177`).
12. **A wall's paint.** A stroke's colour is its texel × its relief (1 ± 0.035) × (1 + 0.25 × `moonShade(normal)`) ×
    the face's light (`streetStrokes.ts:356`, `:382`). The base under it is the source's mean × the light. Both take
    `wallShade`. `moonShade` is `max(0, n · moon)`.
13. **A cottage's door and window stand under the thatch.** On L2 the thatch's underside meets the front wall at about
    0.051, and the door's top is at 0.077 (S1b's C2, open since S1b). Whatever reaches the wall's top there is under
    the slab.
14. **Thin ink is dear.** `outlineFace` samples about half its width apart, at least five samples. A 0.036 edge inked
    0.0018 wide takes 45 samples, 176 triangles.

## Decisions

**(a) The paint knobs.** A `WallPaint` is `{ base: number; light: number; cover: number }`.

- `base` mixes the face's base from the source's mean (0, today) toward the strokes' lit light: the mean of the source's
  lightest `light` share × (1 + `STREET_MOON_LIFT` × `moonShade(normal)`). At 1 the base is that colour.
- `cover` multiplies the face's density, so the walls' cover is 3.5 × `cover`. At 1 it is today's.
- They reach every `kind: 'wall'` face that `clad` lays for a house or a cottage, the gables included. They do not reach
  the roofs. If a look pass finds the roofs reading as planks, that pass gives them the same knobs.
- `KEPT_PAINT` is `{ base: 0, light: 0.5, cover: 1 }`. `WALL_PAINT` starts equal to it, so Task 1 changes nothing on
  screen. The context carries `wallPaint`. `church()` sets it to `KEPT_PAINT` and restores it, as it does the light.
- `buildStreet` takes `paint?: WallPaint` (default `WALL_PAINT`), the tests' seam.

**(b) The later knobs, built only if a pass reaches them.** Knob 3, the dry brush and the gaps on walls only: the
houses' wall strokes move to their own bucket, `walls: Strokes`, drawn as `street-walls` with a `STREET_WALL_BODY`
(one draw call more). The church's walls, the roofs and the land's body (E4) stay in `street-strokes`. Knob 4, the
width: `traceFace` takes a `width?: [number, number]` that replaces the source's range. A test holds it inside the
measured range (`wallA` and `wallB` 0.12–0.2, `plaster` 0.1–0.15). Knob 5, the ambient light, is Mark's call.

**(c) The levels.** The frame band at 0.0046 off the face: 0.00035 over the strokes' top, 0.0004 under the door's ink.
A shutter leaf at 0.006: 0.0005 over the pane. The leaf's ink and its louvres through `outlineFace`, given the leaf's
edges, land at 0.011, over the window's frame at 0.0105. Every gap is at least two `LIFT_STEP`s.

**(d) The doors.** `StreetShape` gains `craft?: boolean`: the band, the opening's ink on a recessed door, the shutters
and the deeper eaves. `craftShape(h: StreetHouse): StreetShape` gives every house and cottage `craft: true`, and every
painting house `recess` 0.02 and `eaves` 0.03. `buildStreet` and the tests both take a house's shape from it. The
church's shape has none of the three, so it keeps today's door and roof. Every painting house's front door is the church's: `recess` 0.02, `cladRound` and `recessedDoor`.
`recessedDoor` takes the ink's `refHeight`: a house passes `FRAME` × its eave, and the church passes its wall's height
as today. The frame band is three flat quads, left of the hole, right of it and over it. Each runs from the hole's edge
out 0.3 × the door's width, and is cut at the wall's edges. Its colour: the `plaster` source's mean on a `wallA` or
`wallB` wall, and the `plaster` mean × 0.7 on a `plaster` wall. That is × the wall's light and its `wallShade`. It goes
in the underpaint at `cls` 0 (the walls' class, as the design says) and `src` 255, so it does not move a source's mean
in the `--sources` frame. The four cottages get the band and the step, and no recess. Their bands are cut at the
wall's top (Fact 13). The church gets no band.

**(e) One place for a door.** The door's span moves to `streetLayout.ts` as `doorOf(house, index)`, and `STEP` moves
with it. `STREET_HOUSES` gains `along` and `toPath`, computed as `buildStreet` computes them today (`:756-762`), and
`buildStreet` reads them. `doorStepFoot(house, index)` returns the step's four ground corners. The grass clears a blade
within `GRASS.house` of a step's foot. The church's step is unchanged and has no grass near it (the square).

**(f) The shutters.** Two open leaves beside each front window. A leaf is the window's height and half its width,
hinged at the window's side. It is the `village` region's `#36403f` (Lab 26.2, −4.3, −0.8, its one green-leaning
colour) × the wall's light and its `wallShade`. It goes in the underpaint at `cls` 0 and `src` 255, not in the windows'
buffer (Fact 10). Its ink is one outline round it and three louvres across it at 0.25, 0.5 and 0.75 of its height. The
ink's `refHeight` is the leaf's height × `FRAME`, so a leaf on L1 carries a line 0.0018 wide. `outlineFace` takes
`maxSamples` (5 for the leaves), so an edge costs 16 triangles (Fact 14), about 120 a leaf.

**(g) The eaves.** `StreetShape` gains `eaves?: number`. `houseRoofPlanes` takes it past the side walls, for the eave's
corners and its height, and keeps `OVERHANG` past the gables. `craftShape` gives painting houses 0.03. The church's
shape has none, so it keeps 0.015. `houseSoffits(shape, centre, along, toPath)` gives one quad under each eave. It runs from the side wall's
top (`y` = eave, over the rake's span along the depth) to the foot of that eave's edge band. It takes the band's colour
in the underpaint at `cls` 255. A cottage's thatch is unchanged.

**(h) The report.** Each face's line gains `base`, its underpaint colour before the light and the shade.
`report.craft` holds one line per house: `{ owner, door?, inkRef, band, bandColour, step, leaves, soffits }`, the
corners as drawn before the lean. `door` is `recessedDoor`'s report, on a painting house only.

**(i) The budget.** The hard limit is the browser: every point of Task 5's sweep under 1,444,930 on both viewports.
K1's target is to leave K2 its room: the street's build at 593,641 or fewer, 10,000 under the base. K2's estimate is
three to five stone walls clad in dabs, one rail and seven lamps. The payers, in order: the walls' `cover`, then the
far ground's density 0.5 → 0.25, then the trees' strokes. If the target is missed, the record says by how much, and
K2's plan finds the rest.

## Global constraints

- No new dependency.
- The bar: every new surface is painted from a `STREET_SOURCES` rectangle or takes a flat colour from `palette.json`
  under the street's ink. No new texture.
- A stroke's width and length stay inside their source's measured range. A value outside needs a new 1:1 measurement
  of the scan's village, in the record before the value is used.
- The church, the belfry and the spire keep their paint, their door's ink at the wall's height, and their eaves at
  0.015.
- The land's stroke body (E4) does not change. The diorama does not change: `streetGeometry.ts` is the street's only.
- The houses' places, the lane and the stops do not change. No new motion. No real-time light.
- The triangle ceiling is 1,444,930 at every browser point, both orientations. 60 fps on the desktop, 30 on a
  mid-tier phone, at the Tunables' dpr caps.
- The build's time stays within 10% of the base's 646 ms. Past that, the Lead watches the portal's last flight frame
  on the phone viewport for a visible stall.
- Retune cap: four look passes.

## Review focus

1. **Blades or a frog on a new step.** A blade 0.035 tall through a 0.012 step reads as a missing step. Test (Task 2):
   no blade's root and no frog's place within `GRASS.house` of any `doorStepFoot`.
2. **The church moving.** It passed in its own slice. Tests: its faces' ribbons, density and base under a changed
   paint (Task 1), its door's ink at the wall's height (Task 2), its eaves at 0.015 (Task 3).
3. **A part that does not lean with its house.** Every drawn check applies `along × leanOf(index) × y` to the report's
   corner before matching the buffer (Tasks 2 and 3).
4. **A band or a leaf off its wall, or over a window or another part.** Tests: each band and leaf inside its wall's
   face, and no two of the band, the leaves, the door and the windows overlapping on a front (Tasks 2 and 3).
5. **A new part fighting the strokes in depth.** Test: the levels' order and gaps (Task 3). Then the 1:1 crops at the
   nearest house of each stop (Task 4).

---

### Task 0: the base's reads (Lead)

- [ ] Serve the craft worktree: `npx vite --host --port 5205 --strictPort` in `scratchpad/craft-wt`, in the background.
- [ ] The browser's sweep at the base: `APP_URL=http://127.0.0.1:5204/ TS=<the points> node E/tools/tri-read.mjs`
  `> E/t0/base-tri-sweep.log`. The points: every 0.05 from 0 to 0.9, every 0.01 from 0.25 to 0.40, and 0.295.
- [ ] The base's captures at stops 0 to 4 on both viewports (`capture-diorama.mjs`,
  `DIORAMA_CAPTURE_EXTRA="&street=1&station=S&walkMode=input&arrival=0"`), into `E/t0/base/`. The scan's village at 1:1
  and Simon's frame (`scratch/simon-village-2026-10-23/v100.jpg`) cropped beside them.
- [ ] Write the brief for Tasks 1 to 3 (`E/brief-k1-build.md`), lint it, and dispatch it with a one-line pointer.

### Task 1: the paint knobs (worker)

**Files:**
- Change: `src/scene/streetStrokes.ts` (`rectUnderpaint`, `sourceUnderpaint`: a `lightest` flag)
- Change: `src/scene/streetGeometry.ts` (`WallPaint`, `KEPT_PAINT`, `WALL_PAINT`, `Context.wallPaint`, `clad`,
  `church`, `buildStreet`'s `paint`, the face report's `base`)
- Test: `scripts/street-craft.test.ts` (new)

**Interfaces:**
- Produces: `type WallPaint = { base: number; light: number; cover: number }`, `KEPT_PAINT`, `WALL_PAINT`,
  `buildStreet(painting, flow, masses, { lit?, grass?, paint? })`, `report.faces[i].base: [number, number, number]`
  (sRGB 0..1), `sourceUnderpaint(painting, source, share, lightest = false)`.

- [ ] **Step 1: Write the failing tests** in `street-craft.test.ts`, on `street-build.test.ts`'s painting and inputs:
  - `'the kept paint is today\'s'`: `KEPT_PAINT` deep-equals `{ base: 0, light: 0.5, cover: 1 }`. In a build with
    `paint: KEPT_PAINT`, every house wall's and roof's `base` equals `sourceUnderpaint(painting, source, 1)` to 1e-12.
  - `'the church keeps its paint under any wall paint'`: build A with `paint: KEPT_PAINT` and B with
    `paint: { base: 1, light: 0.5, cover: 0.5 }`. Every `church`, `belfry` and `spire` face has the same `ribbons`,
    `density` and `base` in both.
  - `'the wall paint reaches the houses\' walls and gables, not their roofs'`: in B, every house face whose name has no
    `roof` has `base` equal to the light colour of Decision (a), computed in the test from
    `sourceUnderpaint(painting, source, 0.5, true)` and `moonShade(normal)`, to 1e-9. Its `ribbons` are at most
    0.6 × A's + 2. Every roof face has A's `ribbons` and `base`.
- [ ] **Step 2: Run them**: `node --test scripts/street-craft.test.ts`. Expected: FAIL (no `KEPT_PAINT`).
- [ ] **Step 3: Build Decision (a).** `clad` mixes the base and scales the density for `kind: 'wall'` faces by
  `ctx.wallPaint`, after the church's thinning. `church()` sets `KEPT_PAINT` beside `CHURCH_LIGHT`.
- [ ] **Step 4: Run the suite**: `npm run -s test:sky`. Expected: all PASS.
- [ ] **Step 5: Nothing on screen moved**: `WT=$PWD node E/tools/build-hash.ts`. Expected: `build hash
  71114298aa85575a triangles 603641`.
- [ ] **Step 6: Commit**: `feat(street): the walls' paint as two knobs on the build, the church keeping today's (K1
  task 1)`.

### Task 2: the doors (worker)

**Files:**
- Change: `src/scene/streetLayout.ts` (`STREET_HOUSES`' `along` and `toPath`, `doorOf`, `STEP`, `doorStepFoot`)
- Change: `src/scene/streetGeometry.ts` (`CRAFT.door`, `recessedDoor`'s `inkRef`, the band, the step for cottages,
  `buildHouse`, `buildCottage`, `buildStreet`, `report.craft`)
- Change: `src/scene/streetGrass.ts` (`isExcluded`: the steps)
- Change: `scripts/street-build.test.ts` ('every face of a house is clad')
- Test: `scripts/street-craft.test.ts`

**Interfaces:**
- Consumes: Task 1's build and report.
- Produces: `FRAME` exported, `craftShape(h: StreetHouse): StreetShape`, `doorOf(h: StreetHouse, index: number): { cu: number; w: number; h: number }` (painting: `{ 0.5, 0.2,
  0.6 / storeys }`, cottage: `{ index % 2 ? 0.34 : 0.66, 0.16, 0.85 }`, today's values), `STEP` (unchanged values),
  `doorStepFoot(h: StreetHouse, index: number): [number, number][]` (x, z), `CRAFT.door = { recess: 0.02, band: 0.3,
  lift: 0.0046, paleDark: 0.7 }`, `report.craft: CraftReport[]` with `door`, `inkRef`, `band`, `bandColour`, `step`.

- [ ] **Step 1: Write the failing tests.** In `street-craft.test.ts` (a drawn check applies the lean: `p + along ×
  leanOf(index) × p.y`, then matches a buffer vertex to 1e-6):
  - `'every painting house\'s door is set into its wall'`: the panel 0.02 behind the front's plane, each reveal from
    the plane to the panel, the panel drawn in the windows' buffer.
  - `'its front keeps the hole'`: three faces named `front left`, `front right`, `front over`. None covers the
    door's centre. Their areas sum to the wall's less the hole, to 1e-9.
  - `'a house door\'s ink is the opening\'s, the church\'s the wall\'s'`: each painting house's `inkRef` is
    `FRAME × eave`. The church's is `STREET_CHURCH.nave.eave`.
  - `'a frame band round every door'`: three quads on every house. Each lies `CRAFT.door.lift` off the front, runs from
    the hole's edge out 0.3 × the door's width or to the wall's edge, and stays inside the front's face. `bandColour`
    is the `plaster` mean on `wallA` and `wallB` walls and × 0.7 on `plaster` walls, before the light. Each corner is
    drawn in the underpaint.
  - `'a step at every door\'s foot'`: on all ten houses, the top at most 0.015 up, the front 0.02 to 0.04 out, the
    door's width.
  - `'no blade and no frog on a step'`: every blade root of `grassChunks(painting)` and every `frogPlace(spec)` lies
    more than `GRASS.house` from each `doorStepFoot`.
  - In `street-build.test.ts`, 'every face of a house is clad' expects 10 faces on a painting house and 8 on a cottage.
    If `front over` (0.2 of the wall's width) falls under the test's floor of 12 ribbons, report its count. Do not
    change the floor.
- [ ] **Step 2: Run them**: `node --test scripts/street-craft.test.ts scripts/street-build.test.ts`. Expected: the
  new tests FAIL. The church's tests (`street-church.test.ts`) PASS.
- [ ] **Step 3: Build Decisions (d) and (e).**
- [ ] **Step 4: Run the suite**: `npm run -s test:sky`. Expected: all PASS, the church's and the grass's included.
- [ ] **Step 5: Commit**: `feat(street): every door framed and stepped, the painting houses' set into the wall (K1
  task 2)`.

### Task 3: the shutters and the eaves (worker)

**Files:**
- Change: `src/scene/streetStrokes.ts` (`outlineFace`'s `maxSamples`)
- Change: `src/scene/streetGeometry.ts` (`CRAFT.shutter`, `CRAFT.eaves`, the leaves, `houseRoofPlanes`,
  `houseSoffits`, `StreetShape.eaves`, `report.craft`'s `leaves` and `soffits`)
- Test: `scripts/street-craft.test.ts`

**Interfaces:**
- Consumes: Task 2's `report.craft` and `doorOf`.
- Produces: `CRAFT.shutter = { colour: '#36403f', lift: 0.006, louvres: [0.25, 0.5, 0.75], maxSamples: 5 }`,
  `CRAFT.eaves = 0.03`, `outlineFace(face, edges, ink, seed, maxSamples?)`, `houseSoffits(shape: StreetShape, centre:
  Vector3, along: Vector3, toPath: Vector3): HouseFace[]`.

- [ ] **Step 1: Write the failing tests** in `street-craft.test.ts`:
  - `'two open leaves beside every front window'`: 22 leaves. Each is its window's height and half its width. In the
    front's face coordinates one of its vertical edges lies on one of the window's. It lies `CRAFT.shutter.lift` off
    the front, stays inside the front's face, and is drawn in the underpaint after the lean.
  - `'the parts keep apart on every front'`: in the front's face coordinates, no two of the door, the band, the windows
    and the leaves overlap by more than 1e-9.
  - `'the levels keep their order'`: `STROKE_LIFT + 15 × LIFT_STEP < CRAFT.door.lift < OUTLINE_LIFT`,
    `0.0055 < CRAFT.shutter.lift`, and each of the three gaps is at least `2 × LIFT_STEP`.
  - `'a leaf\'s ink is cheap'`: `outlineFace` over a 0.036 edge with a 0.0018 width and `maxSamples` 5 gives 15
    vertices (five samples × three columns). Without it, more than 15.
  - `'a house\'s eaves overhang 0.03, its rakes 0.015, the church\'s both 0.015'`: from `houseRoofEdges`, each eave
    band's corners stand `w / 2 + 0.03` from the centre along the width on a painting house, and each rake's
    `d / 2 + 0.015` along the depth. On the church's shape, both 0.015.
  - `'a soffit under each eave'`: two per painting house. Its top edge is the side wall's top at `y` = eave. Its foot
    is its eave band's foot, to 1e-12.
- [ ] **Step 2: Run them**: `node --test scripts/street-craft.test.ts scripts/street-build.test.ts`. Expected: the
  new tests FAIL, 'every painting house\'s roof has an edge' PASS.
- [ ] **Step 3: Build Decisions (f) and (g).**
- [ ] **Step 4: Run the suite**: `npm run -s test:sky`, `npx tsc -b`, `npm run -s lint`. Expected: all PASS.
- [ ] **Step 5: The count**: `WT=$PWD node E/tools/street-tri-split.ts > E/t3/split.log`. Report the total and the
  time, for the Lead's budget.
- [ ] **Step 6: Commit**: `feat(street): shutters beside the front windows, deeper eaves with an underside (K1 task 3)`.

### Task 4: the look passes (Lead)

At true scale, stops 0 to 4 on both viewports, each beside the base's frame (Task 0): 1:1 crops of each stop's nearest
houses, and 4× nearest-neighbour crops of a door and a shutter. Beside them, the scan's village at 1:1 and Simon's
frame. The questions, in order:

1. Do the walls read as solid paint, not planks and not a dark wall with a few light streaks?
2. Does each door read as a door you could step up to?
3. Do the shutters read as shutters, without a toy town's colour or a comic's ink?
4. Do the eaves read as a roof with thickness?
5. From stop 0, does the village still read as the painting's?

Each pass changes the knobs in Decision (a)'s order (base, then cover), or a part's value inside its range. It then
runs `npm run -s test:sky` and `E/tools/street-tri-split.ts` (triangles and time). It captures again, looks, and
writes the pass into the record `tasks/2026-10-25-village-craft-k1.md` and `tasks/lessons.md`. The budget target in
Decision (i) is met by the end of the passes. Cap: four passes. If the walls still read as planks after the fourth,
stop and ask Mark.

### Task 5: the gate's runs (Lead)

- [ ] `git status --short` empty. `npx tsc -b`, `npm run -s lint`, `npm run -s test:sky`, `npm run -s build`.
- [ ] Against port 5205: `check-street-grass.mjs` (every case), `check-street-walk.mjs`, `check-street-rotation.mjs`,
  `check-street-cypress-hang.mjs`, `check-portal.mjs`, `check-reduced-motion.mjs`.
- [ ] The palette gate on the branch and the base: the `full` and `ids` pairs at `t` 5 with `light=0` (S1 Task 7's
  method) at stops 0 to 4 on both viewports, `check-street-colour.ts` on each, every class under ΔE 10. The record
  gives the walls' ΔE on both, so it shows how far the new parts move the walls' mean.
- [ ] The frame time at stops 0 and 3 on both viewports, five rounds, the branch and the base side by side. The runner
  is the frogs' (`scratchpad/frogs-t4-perf.sh`) with the craft's paths, the perf marker made first.
- [ ] The browser's sweep on the branch, Task 0's points: every point under 1,444,930.
- [ ] The build's time against the base's (`E/tools/street-tri-split.ts` on both worktrees).
- [ ] The gate's sheet for Mark: Task 4's crops at the last pass, the far read at stop 0 beside the painting's village.

### Task 6: review and the record (Lead)

- [ ] Codex's branch review (a brief file and a one-line pointer), each finding answered in the record.
- [ ] The record `tasks/2026-10-25-village-craft-k1.md`, the Tunables entry in `CLAUDE.md`, `tasks/lessons.md`, the
  pickup in `tasks/todo.md`.
- [ ] Present to Mark with the live URL (the LAN address of port 5205) and the sheet. His gate ends K1. Then K2's plan.
