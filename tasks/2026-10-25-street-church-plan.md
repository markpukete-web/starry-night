# Street church, the church at stop 4 in the round: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Revision 1 (2026-10-25, afternoon).** Mark, on the live street at stop 4: "I think we need to improve the church, at
the end of the stop it looks pretty flat", with the painting's church and two reworks by other artists (ideas only, not
copied). On the order: "agree, church first then portal". He is out, and asked the Lead to carry on through this slice
and the portal and to gate both when he is home. So the Lead builds every task, and Mark's gate is the end of the slice.

**Goal:** At stop 4 the church reads as a solid building in the painting's paint: two walls and a roof slope in view,
each its own value, the door and windows with depth, and the painting's spire in the frame.

**Architecture:** The church keeps the knot's proportions and its three parts (the nave as a house, the belfry, the
spire). It turns on the square so stop 4 sees its gable and its long side. Stop 4's camera frames the spire. A
church-only light lifts its plaster toward the painting's pale church. The door gets a reveal and a step, the long side
three tall windows, the strokes a shorter brush. The faces no camera sees are thinned to pay for it.

**Tech stack:** three.js, the street's builders (`house`, `orientedFace`, `clad`, `ink`, `opening`, `polygon`),
`node --test`, the capture scripts. No new dependency. No new stroke generator.

**Spec:** the street design (`docs/superpowers/specs/2026-10-23-village-street-design.md`, "The layout", "Stop 4"),
`tasks/todo.md` (pickup of 2026-10-25, afternoon: the church), and the facts below.

## Session mapping

Lead and builder: Claude, `w4:p1`. Reviewer: Codex, `w4:p4`, or the Consultant (Fable, `w4:p6`) when Codex runs low
(Mark, 2026-10-25). The Lead checks each address against `herdr agent list` before a dispatch. The worktree is
`scratchpad/church-wt` on `feat/street-church`, stacked on `feat/street-s3b` (`b06253f`), served at
`http://127.0.0.1:5197/`. If S3b's review brings fixes, `feat/street-church` rebases onto them before any church commit
depends on the old head.

## The facts the plan rests on (measured at `b06253f`)

- The church today is 621 ribbons: the nave 346, the belfry 108, the spire 167. The street's strokes average 68.1
  triangles a ribbon, so the church's strokes are about 42,000 triangles.
- The walk's worst point is 1,438,243 triangles (`walkT` 0.30, desktop), 6,687 under the ceiling of 1,444,930
  (`scratch/street-s3b-2026-10-25/t6/gate/triangles.md`). The street's strokes are one mesh, in view at every pose, so
  the church's triangles count at every pose.
- `churchYaw` (`src/scene/streetLayout.ts:218`) sets the nave square to the lane. Its front normal is (0.104, 0, 0.995).
  Stop 4's camera is at (−0.084, 0.090, −1.710), the nave's centre at (−0.270, −2.575): the camera sees the gable
  head-on, 6° off its normal.
- The street's moon is `STREET_MOON` = (0.451, 0.618, −0.643): up, to the right, and ahead of the walker, so behind the
  church from stop 4. The front's n·moon is −0.593, so it stands at the ambient 0.4. The right side's is +0.516, but it
  is edge-on to stop 4. No turn of the church puts a well-lit face toward stop 4: a face stop 4 sees is backlit.
- The spire's tip is about 1.0 above the street at the nave's back. Stop 4 looks 0.73 to the target at height 0.203
  with a vertical field of 50°. The frame's top is about 34° above the eye and the tip about 50°, so stop 4 cuts the
  spire off. The painting's church is its spire.
- The street's camera has no look-around. Every view is `walkPose(t)` for `t` in [0, 0.9] or a `stationPose`. The
  portal (slice 4) adds a flight in "toward the rooftops near the church", which may see roofs and backs.

## Decisions

- **(a) The turn.** `churchYaw` turns by `CHURCH.turn` = −0.45 rad (about 26°), so stop 4 sees the gable about 32° off
  its normal and the right side about 58° off its own. A larger turn shows more of the side but turns it from the moon:
  at −0.6 the side is only 0.09 lighter than the gable, at −0.45 it is 0.18 lighter. The belfry follows through the knot's local offset, as now.
  `toNave0` and stop 0's heading use the nave's position only, so they do not move.
- **(b) Stop 4 frames the spire.** Stop 4 keeps its place on the lane and raises its target until the spire's tip and
  the door's foot are both inside the frame on 1600 × 900 and 390 × 844. If the target alone cannot do it, stop 4 moves
  back along the lane (smaller `t` for its pose only, not `STATION_T`). **A deviation from the design for Mark:** the
  design asks only for the gable and the door (Fable R1).
- **(c) The church's light.** The church's walls and roof take `CHURCH_LIGHT.ambient`, 0.7 to start, instead of the
  street's 0.4. The key stays 0.9 along `STREET_MOON`, so the faces keep their order. At the turn the gable reads 0.7 and
  the right side about 0.88. **A deviation for Mark:** the painting's church is its palest building, and the moon alone
  leaves it at 40% from the one stop built to look at it. The houses do not change.
- **(d) A shorter brush.** The church's faces take `refHeight` `CHURCH.stroke` = 0.16 instead of the nave's eave 0.24.
  Ribbons grow about as the square of the ratio, so the visible faces take about 2.25 times as many.
- **(e) Depth from what exists.** The door gets a reveal: two jambs and a lintel 0.02 deep, as `polygon` quads in the
  wall's darkened source, and a step, a box 0.012 high and 0.03 deep at its foot (the chimney's method). The long side
  gets three tall dark windows (`opening`, 0.08 × 0.3 of the wall). The roof keeps the houses' edge bands. No new
  volume unless the ledger allows it: a small porch over the door is Task 3, and the first thing cut.
- **(f) The ledger.** The faces no pose sees are clad at density 0.25, not dropped, because the portal's flight may see
  them. Before Task 0's probe, the estimate: hidden after the turn are the nave's back wall, back gable, left wall and
  left roof plane, and the far two sides of the belfry and the spire, about 315 ribbons. At 0.25 they give back about
  16,000 triangles. With the 6,687 of headroom that is about 22,000 for the shorter brush on the visible faces (about
  15,000), the openings and the reveal (about 3,000), and the porch (about 5,000). The walk's worst point must stay
  under the ceiling. The porch goes first if it does not.
- **(g) The gate's identity.** `grass=0` is no longer byte-identical to Task 0: the spire is in view from stop 0. The
  gate becomes a box test: every changed pixel lies in the church's region of the ID view (its walls and roofs, class 0
  and 1 under the changed pixels), and every other class's colour verdict is unchanged. The look set adds stops 3 and 4.

## Global constraints

- No new dependency. Only the church's code, stop 4's pose, the church's light and their tests change.
- The knot's numbers stay pinned: the belfry's width and the spire's height above its floor
  (`scripts/street-build.test.ts:71`), and the church as plaster (`:81`).
- The triangle ceiling is 1,444,930 at every pose, both orientations.
- The houses, the grass, Vincent and the walk do not change. A capture with the church out of view is byte-identical to
  `b06253f`'s.
- Retune cap: four look passes.

## Review focus

1. The turned church's footprint: its corners against the square's circle, the lane, Vincent's place at stop 4 and the
   grass. A corner in the grass grows blades through a wall.
2. Stop 4 on the phone: the portrait frame is narrow, so a turned church may spill out of its sides.
3. The belfry and the spire after the turn: they follow through the knot's local offset, and a sign error puts them in
   front of the gable.
4. The walk's worst point after the shorter brush, and every station, both orientations.
5. The light at stop 4 against the painting's crop, 1:1: the plaster neither grey nor blown out.

---

### Task 0: baselines and the face probe

**Files:** `scratch/church-facts.ts` (scratch, not committed), evidence in
`/Users/markma/Projects/starry-night/scratch/street-church-2026-10-25/t0/`.

- [ ] Capture stops 0, 2, 3 and 4 on both viewports at `b06253f`, lit and ID (`ids=1`), `--times 0`, the grass on.
- [ ] Record the church's ribbons per face (`report.faces`, owners `church`, `belfry`, `spire`).
- [ ] The face probe: for each church face, whether any pose sees it (its normal toward the camera and a corner inside
  the frustum), over `walkPose(t)` for `t` 0 to 0.9 in steps of 0.01 and the five stations, both aspects. The faces no
  pose sees are the ledger's thinned set.
- [ ] The painting's church at 2× (`t0/painting-church-2x.png`, done) beside today's stop 4.

### Task 1: the turn, stop 4's frame and the church's light

**Files:** `src/scene/streetLayout.ts` (`CHURCH`, `churchYaw`, stop 4's pose), `src/scene/streetLight.ts`
(`CHURCH_LIGHT`), `src/scene/streetGeometry.ts` (`church` passes its light), `scripts/street-church.test.ts` (new),
`package.json` (`test:sky`).

**Interfaces:** `CHURCH = { turn, stroke }` exported from `streetLayout.ts`. `lightOf(face, lit, light = STREET_LIGHT)`
keeps its signature for every other caller.

- [ ] Tests first, in `scripts/street-church.test.ts`:
  - "stop 4 sees the gable and the right side": both normals face stop 4's camera, the gable 20° to 50° off it and the
    right side 45° to 70°, on both aspects.
  - "the right side is lit above the gable": `lightOf` with `CHURCH_LIGHT` gives the right side at least 0.12 more.
  - "stop 4 frames the spire and the door": the spire's tip, the door's foot and the nave's two near corners project
    inside ±0.92 of the frame on 1600 × 900 and 390 × 844.
  - "the turned church stands clear": the nave's and the belfry's corners lie outside the square's circle less 0.02,
    more than 0.1 from the lane's centreline, and more than 0.1 from Vincent's place at stop 4. No grass blade root lies
    inside their footprints plus 0.01 (skipped without the painting).
  - "the belfry follows the nave": its centre's offset in the nave's frame equals the knot's.
- [ ] Run them: they fail on the square church.
- [ ] Build (a), (b), (c). Run the tests and `street-build.test.ts`.
- [ ] Capture stops 3 and 4, both viewports. Read them 1:1 beside the painting's church.
- [ ] Commit: `feat(street): the church turns on the square, stop 4 frames its spire, its plaster lifted`.

### Task 2: the brush and the depth

**Files:** `src/scene/streetGeometry.ts` (`church`, a `churchDoor` helper), `scripts/street-church.test.ts`.

- [ ] Tests first:
  - "the church's faces take the shorter brush": every church face's `refHeight` is `CHURCH.stroke`.
  - "the door has a reveal and a step": the report's `church.door` lists two jambs, a lintel and a step. The step's
    top is at most 0.015 above the ground, its front 0.02 to 0.04 beyond the wall. The jambs lie inside the door's
    edges and 0.015 to 0.025 deep.
  - "the long side has three windows": three openings on the right wall, none overlapping, all above 0.25 and below
    0.85 of the eave.
- [ ] Build (d) and (e). Run the tests.
- [ ] Capture stops 3 and 4. Read them 1:1.
- [ ] Commit: `feat(street): the church in a shorter brush, its door set back over a step, three windows on its side`.

### Task 3: the ledger, and the porch if it fits

**Files:** `src/scene/streetGeometry.ts` (`church` thins the probe's faces), `scripts/street-church.test.ts`,
`scratch/street-church-2026-10-25/t3/triangles.md` (`walk-triangles.mjs`).

- [ ] Test first: "the faces no pose sees are thinned": each face in Task 0's set is clad at 0.25, and none of them is
  seen from any pose of the probe (the probe re-run on the turned church).
- [ ] Thin them. Run the walk's triangle sweep. Record the worst point and its headroom.
- [ ] If the headroom is at least 6,000, build the porch: a small gabled roof on two posts over the door, its ridge
  square to the gable, built with `orientedFace`, `clad` and `ink`. Its test: clear of the door's swing (outside the
  reveal), its ridge under the gable's eave, its footprint inside the "stands clear" test's limits. Otherwise record
  the porch as cut, with the number.
- [ ] Commit.

### Task 4: the look passes

At most four. Each pass: capture stops 3 and 4 on both viewports, crop the church 1:1 beside the painting's, name
what is wrong, change one group of Tunables (`CHURCH.turn`, `CHURCH.stroke`, `CHURCH_LIGHT.ambient`, the openings'
sizes), and record the pass in the record file with its captures.

### Task 5: the gate's runs

- [ ] `test:sky`, `tsc -b`, `lint`, `build`.
- [ ] (g): stops 0 to 4 and `walkT` 0.33 and 0.55, both viewports, `grass=0` and the grass on, against `b06253f`'s
  captures. Every changed pixel's box and its ID classes (`diffbox.ts`). A pose with the church out of view is
  byte-identical.
- [ ] The palette at stops 0, 2, 3 and 4 (`check-street-colour.ts --time 0`). Every class keeps its verdict at
  `b06253f`, the walls' three failures included, or the change is named.
- [ ] The walk's triangles under the ceiling. Perf at the seven poses (`s3b-t6-perf.sh`'s method, alone).
- [ ] `check-street-grass.mjs` (all cases) and `check-street-walk.mjs`.
- [ ] Captures for Mark: stops 3 and 4 on both viewports, 1:1 crops beside the painting's church, and before and after
  against today's stop 4.

### Task 6: review and the record

- [ ] The branch review (Codex, or the Consultant). Every finding answered in the record.
- [ ] The record `tasks/2026-10-25-street-church.md`, the Tunables entry, the lessons, the todo's pickup.
- [ ] Mark's gate. No push and no PR before it.
