# Street church, the church at stop 4 in the round: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Revision 2.1 (2026-10-25, evening).** The Consultant's confirmation read (`plan-rereview.md`): F1 to F10 closed, one
new P1. (g)'s byte test could not pass: stop 4's frame turns 4.6° by design, and the church's ground shadow
(`streetLife.tsx`) reaches past a box of the church's corners. Folded in (a), (g), Task 3 and Task 5, with F6's note
(the sweep runs again after Task 3).

**Revision 2 (2026-10-25, late afternoon).** Revision 1 drew REVISE from the Consultant
(`scratch/street-church-2026-10-25/plan-review.md`: three P1s, seven P2s). Each is folded in and named where it lands.
The Lead recomputed F1, F2 and F3 before folding them (`scratch/church-turn.ts`, `scratch/church-frame.ts` in the
worktree): all three hold.

**Revision 1 (2026-10-25, afternoon).** Mark, on the live street at stop 4: "I think we need to improve the church, at
the end of the stop it looks pretty flat", with the painting's church and two reworks by other artists (ideas only, not
copied). On the order: "agree, church first then portal". He is out, and asked the Lead to carry on through this slice
and the portal and to gate both when he is home. So the Lead builds every task, and Mark's gate is the end of the slice.

**Goal:** At stop 4 the church reads as a solid building in the painting's paint: two walls and a roof slope in view,
each its own value, a door set into the wall over a step, and windows down its lit side. The phone frames the whole
spire. The desktop frames it up to its needle, as today.

**Architecture:** The church keeps the knot's proportions and its three parts (the nave as a house, the belfry, the
spire). It stands 0.02 further back and turns on the square, so stop 4 sees its gable and its moonlit side. Stop 4 aims
at the turned gable. A church-only light lifts its plaster walls toward the painting's pale church, and its roofs keep
the street's light. The door is recessed in a front wall built round it, the long side gets three windows, and the
strokes take a shorter brush. The faces no pose sees are thinned to pay for it.

**Tech stack:** three.js, the street's builders (`buildHouse`, `orientedFace`, `clad`, `ink`, `opening`, `polygon`),
`node --test`, the capture scripts. No new dependency. No new stroke generator.

**Spec:** the street design (`docs/superpowers/specs/2026-10-23-village-street-design.md`, "The layout", "Stop 4"),
`tasks/todo.md` (pickup of 2026-10-25, afternoon: the church), and the facts below.

## Session mapping

Lead and builder: Claude, `w4:p1`. Reviewer: Codex, `w4:p4`, or the Consultant (Fable, `w4:p6`) when Codex runs low
(Mark, 2026-10-25). The Lead checks each address against `herdr agent list` before a dispatch. The worktree is
`scratchpad/church-wt` on `feat/street-church`, stacked on `feat/street-s3b`, served at `http://127.0.0.1:5197/`.
S3b's review fixes (`22b00fc`, `be2c298`) change no pixel (`t6/review-fix/`), so the baselines below stand after the
rebase onto them.

## The facts the plan rests on (measured at `b06253f`)

- The church today is 621 ribbons: the nave 346, the belfry 108, the spire 167. The street's strokes average 68.1
  triangles a ribbon, so the church's strokes are about 42,000 triangles.
- The walk's worst point is 1,438,243 triangles (`walkT` 0.30, desktop), 6,687 under the ceiling of 1,444,930
  (`scratch/street-s3b-2026-10-25/t6/gate/triangles.md`). The street's strokes are one mesh, in view at every pose, so
  the church's triangles count at every pose.
- The code's yaw: `along` = (cos yaw, 0, sin yaw), the front normal `toPath` = (−sin yaw, 0, cos yaw). Today the
  church's `along` is (0.995, 0, −0.104), the walker's right at stop 4. Stop 4's camera is at (−0.084, 0.090, −1.710),
  the nave's centre at (−0.270, −2.575): the camera sees the gable 7° off its normal.
- The street's moon is `STREET_MOON` = (0.451, 0.618, −0.643): up, to the right, and ahead of the walker. The front's
  n·moon is −0.593, so it stands at the ambient 0.4. The +along side's is +0.516, but it is edge-on to stop 4 (92°).
- The spire's tip is 1.074 above the street. From stop 4 it is 43° up. Stop 4 looks 0.73 to the target at height
  0.203, pitch 8.8°, field 50°, so the desktop's frame top is 34° up and cuts the spire by about 9°. The phone holds the
  tip at NDC +0.89.
- The face probe (`t0/face-probe.txt`, `scratch/church-probe.ts`): on today's church, four faces face away from every
  pose (walk `t` 0 to 0.9 by 0.01, the five stations, both aspects, no occlusion): the nave's back wall and back gable,
  the belfry's wall 2 and the spire's side 2. They hold 145 of the 621 ribbons. The left wall and the left roof are seen
  from the walk at `t` 0.21 and 0.29.
- The baselines (`t0/base/`): every gate pose, lit and its ID mask, at time 0, and the colour gate's pairs at stops 0,
  2, 3 and 4. Stops 0 and 2 are byte-identical to S3b's gate. The colour gate's walls fail at s0 desktop, s2 both,
  s3 phone and s4 both, as before. At s4 the roofs fail too (desktop ΔE 10.60, phone 348 px under the 2,000 floor).
- The street's camera has no look-around. Every view is `walkPose(t)` for `t` in [0, 0.9] or a `stationPose`.
  `walkPose` takes its position from the lane and blends its target toward `stationPose(4)`'s over `t` 0.66 to 0.9. The
  portal (slice 4) adds a flight in "toward the rooftops near the church", which may see roofs and backs.

## Decisions

- **(a) The turn and the setback.** `CHURCH.turn` = **+0.45** rad (about 26°), added to `churchYaw`. Yaw increasing turns
  `along` from +x toward +z: the gable's normal swings to the walker's left, and the +along side, which stands to the
  right of the axis where stop 4's camera is, opens toward it. Stop 4 then sees the gable 38° off its normal and the
  +along side 66° off its own (F1). The nave stands `CHURCH.setback` = 0.02 further from the square, because at the turn
  its front corner swings to 0.215 from the square's centre, inside the 0.25 circle. Set back, the nearest corner is
  0.234 (F2). The belfry follows through the knot's local offset, as now. Stop 0's heading keeps aiming at the nave's
  place before the setback, so stop 0 moves by no pixel outside the church's box, which holds its ground shadow.
- **(b) Stop 4 aims at the turned gable.** Its target is the front wall's centre from `nave.yaw` (`nave + toPath·d/2`,
  the door's foot), at today's height rule: halfway by angle between the door's foot and the gable's peak (F5). On the
  phone the tip stays inside at NDC (0.46, 0.91). On the desktop it is at y 1.49: the needle and about 9° of spire stay
  cropped, as today. No pitch holds both the tip and Vincent's feet in 50° of field (F3: the span is 53°). **For Mark,
  not built:** a wider desktop field at stop 4 (58°, blended by the walk as the target is), or `STATION_T[4]` and the
  walk's end moved back together. Both change the walk, which this slice does not.
- **(c) The church's light.** The church's walls, gables, belfry and spire take `CHURCH_LIGHT` = { ambient 0.7, key 0.9,
  max 1 }. Its roofs keep `STREET_LIGHT`. At the turn the gable reads 0.70, the +along side 0.89, and the roof slope
  stop 4 sees 0.87, three values in order (F4). `max` 1 keeps a moonlit face at its paint and no brighter: the back wall
  would read 1.38. **A deviation for Mark:** the painting's church is its palest building, and the moon alone leaves its
  gable at 0.4 from the one stop built to look at it. The houses do not change. `clad` reads the wall light from a
  `wallLight` field on the build's context, which `church()` sets round its own faces. `lightOf` takes the light as a
  third parameter with `STREET_LIGHT` as the default. Its other readers, `vincent.ts` and `grassShader.ts`, read
  `STREET_LIGHT` directly, so nothing else moves (F9).
- **(d) A shorter brush.** The church's faces take `refHeight` `CHURCH.stroke` = 0.16 instead of the nave's eave 0.24,
  through an optional `brush` on `StreetShape` for the nave and the same constant for the belfry and the spire. The
  fallback, if the ledger does not close, is 0.18.
- **(e) Depth.** The front wall is built as three faces round the door's hole (left, right, above), each by
  `orientedFace` and `clad`. The door is a dark quad `CHURCH.recess` = 0.02 behind the wall's plane. Two jambs and a
  lintel bridge the hole's edges to it in the wall's source darkened by `OPENING_DARK`. A step, a box 0.012 high and
  0.03 deep, stands at its foot. The door's frame ink covers the seams (F7). The +along side gets three tall windows,
  flat as every window in the street (`opening`, 0.08 × 0.3 of the wall). **The porch is cut:** the painting's church
  has none, and the ledger does not hold it (F6).
- **(f) The ledger.** The faces no pose sees on the turned church are clad at density 0.25 (`CHURCH.hidden`), not
  dropped, because the portal's flight may see them. The ledger is measured, not estimated (F6): Task 2 builds the
  brush and the thinning, runs the walk's triangle sweep, and keeps 0.16 only if the worst point stays under the
  ceiling. Otherwise 0.18.
- **(g) The gate's identity.** For each gate pose, a box: the church's projected corners, gable peaks, belfry corners
  and spire tip, and the four corners of its ground shadow's plane (`streetLife.tsx`: the nave's `w` and `d` over
  `FOOT_FILL`, turned by its yaw), at today's place and the new one, in that pose's camera, padded by 16 px and clipped
  to the frame. Inside it any change is allowed. Outside it the colour and ID frames are byte-identical to the
  baselines (F8). A pose whose box is empty must be byte-identical whole. **Stop 4 is not in the byte test**: its target
  moves by design, and every pixel of its frame with it. The walk's last stretch, `t` 0.66 to 0.9, blends toward that
  target and is not a gate pose either. Stop 4 is gated by the palette and the 1:1 crops. The look set adds stops 3
  and 4.

## Global constraints

- No new dependency. Only the church's code, its place on the square, stop 4's target, the church's light and their
  tests change.
- The knot's numbers stay pinned: the belfry's width and the spire's height above its floor
  (`scripts/street-build.test.ts:71`), and the church as plaster (`:81`).
- The triangle ceiling is 1,444,930 at every pose, both orientations.
- The houses, the grass, Vincent, the walk's positions and its field do not change. Stop 0's heading does not change.
- Retune cap: four look passes.

## Review focus

1. The turned church's footprint: its corners against the square's circle, the lane, the houses and Vincent's place
   at stop 4.
2. Stop 4 on the phone: the tip at 0.91 and the +along side's far corner at x 0.90 are near the frame's edge. A look
   pass that widens the turn pushes the corner out.
3. The belfry and the spire after the turn: they follow through the knot's local offset, and a sign error puts them in
   front of the gable.
4. The walk's worst point after the shorter brush, and every station, both orientations.
5. The light at stop 4 against the painting's crop, 1:1: the plaster neither grey nor blown out.

---

### Task 0: baselines and the face probe (done)

Evidence in `/Users/markma/Projects/starry-night/scratch/street-church-2026-10-25/t0/`.

- [x] Every gate pose (stops 0 to 4, `walkT` 0.33 and 0.55), both viewports, lit and ID (`ids=1`), `--times 0`, the
  grass on (`t0/base/`). `grass=0` reuses S3b's gate captures (`street-s3b-2026-10-25/t6/gate/grass0/`).
- [x] The colour gate at stops 0, 2, 3 and 4 (`t0/base/summary.txt`).
- [x] The face probe on today's church (`t0/face-probe.txt`). `report.faces` now carries each face's `corners` and
  `normal`, the probe's input (uncommitted, lands in Task 1).
- [x] The painting's church at 2× (`t0/painting-church-2x.png`) beside today's stop 4 (`t0/s4-desktop-half.png`,
  `t0/s4-mobile-small.png`).

### Task 1: the turn, the setback, stop 4's target and the church's light

**Files:** `src/scene/streetLayout.ts` (`CHURCH`, the church's place, stop 0's aim, stop 4's target),
`src/scene/streetLight.ts` (`CHURCH_LIGHT`, `lightOf`'s third parameter), `src/scene/streetGeometry.ts` (`wallLight` on
the context, `report.faces` gains `light`), `scripts/street-layout.test.ts` (the two door tests, F5),
`scripts/street-church.test.ts` (new), `package.json` (`test:sky`).

**Interfaces:** `CHURCH = { turn, setback, stroke, recess, hidden }` exported from `streetLayout.ts`.
`lightOf(face, lit = true, light = STREET_LIGHT)`. `CHURCH_LIGHT = { ambient, key, max }`. `report.faces[i]` is
`{ owner, name, ribbons, density, corners, normal, light, refHeight }`. `churchFront(): Vector3`, the door's foot, from
`streetLayout.ts`, used by `stationPose(4)` and both door tests.

- [ ] Tests first, in `scripts/street-church.test.ts`:
  - "stop 4 sees the gable and the moonlit side": both normals face stop 4's camera, the gable 30° to 45° off it and
    the +along side 55° to 75°, on both aspects.
  - "the church's walls take the church's light": the report's church front reads 0.70, its +along side 0.85 to 0.92,
    its right roof 0.80 to 0.95 (the street's light), and no church face above 1. A house's front (L1) does not read
    0.70.
  - "stop 4 frames the church": on 1600 × 900, the door's foot, the gable's peak and the nave's three visible corners
    lie inside ±0.92 of the frame. On 390 × 844 the spire's tip does too.
  - "the turned church stands clear": the nave's and the belfry's corners lie at least 0.23 from the square's centre,
    more than 0.1 from the lane's centreline, more than 0.1 from Vincent's place at stop 4, and more than 0.1 from
    every house's footprint.
  - "stop 0 is aimed as before": `stationPose(0)`'s target equals its value at `b06253f`, written into the test.
  - "the belfry follows the nave", a regression guard: its centre's offset in the nave's frame equals the knot's. It
    passes today, and fails if the turn is applied to the nave alone.
  - In `street-layout.test.ts`, "stop 4 frames the gable and the door" and "Vincent clears the church door at stop 4"
    take the door's foot from `churchFront()`.
- [ ] Run them: the view, light, frame and clearance tests fail on the square church.
- [ ] Build (a), (b), (c). Run the tests, `street-build.test.ts` and `street-layout.test.ts`.
- [ ] Capture stops 3 and 4, both viewports. Read them 1:1 beside the painting's church.
- [ ] Commit: `feat(street): the church turns on the square to show its moonlit side, stop 4 aims at its gable, its
  plaster lifted`.

### Task 2: the brush and the ledger

**Files:** `src/scene/streetGeometry.ts` (`StreetShape.brush`, `clad` thins `CHURCH.hidden`), `src/scene/streetLayout.ts`
(`CHURCH.hidden`, `CHURCH.stroke`), `scripts/street-church.test.ts`,
`scratch/street-church-2026-10-25/t2/triangles.md` (`walk-triangles.mjs`).

- [ ] Re-run the face probe on the turned church. Its hidden faces become `CHURCH.hidden`, as `owner/name` keys.
- [ ] Tests first:
  - "the church's faces take the shorter brush": every church face's `refHeight` is `CHURCH.stroke`, and every
    house face keeps its own.
  - "the faces no pose sees are thinned, and only they": the probe, as a function in the test over the same poses, finds
    every `CHURCH.hidden` face unseen and clad at 0.25, and every other church face seen and clad at 1. Skipped without
    the painting.
- [ ] Build (d) and the thinning. Run the tests.
- [ ] Run the walk's triangle sweep. The worst point must stay under 1,444,930 on both orientations. If it does not, set
  `CHURCH.stroke` 0.18 and run it again. Record both in `t2/triangles.md`.
- [ ] Capture stops 3 and 4. Read them 1:1.
- [ ] Commit: `feat(street): the church in a shorter brush, its unseen faces thinned to pay for it`.

### Task 3: the door and the windows

**Files:** `src/scene/streetGeometry.ts` (`buildHouse` takes `shape.recess`, a `recessedDoor` helper),
`scripts/street-church.test.ts`.

**Interfaces:** `report.church` gains `door: { jambs: Vector3[][], lintel: Vector3[], step: Vector3[][], panel:
Vector3[] }` and `windows: { cu: number; cv: number; w: number; h: number }[]` for the +along side.

- [ ] Tests first:
  - "the door is set into the wall": the panel lies 0.02 behind the front wall's plane. The jambs and the lintel span
    from the plane to the panel. The front wall's three faces leave the door's rectangle open: no front-wall ribbon's
    corners fall inside it.
  - "the step stands at the door's foot": its top is at most 0.015 above the ground, its front 0.02 to 0.04 beyond the
    wall, its width the door's.
  - "the long side has three windows": three openings on the +along side, none overlapping, all between 0.25 and 0.85
    of the eave.
- [ ] Build (e). Run the tests.
- [ ] Run the walk's triangle sweep again (F6's note). The worst point must stay under the ceiling. If it does not,
  `CHURCH.stroke` 0.18.
- [ ] Capture stops 3 and 4. Read them 1:1.
- [ ] Commit: `feat(street): the church's door set into its wall over a step, three windows down its side`.

### Task 4: the look passes

At most four. Each pass: capture stops 3 and 4 on both viewports, crop the church 1:1 beside the painting's, name what
is wrong, change one group of Tunables (`CHURCH.turn`, `CHURCH.stroke`, `CHURCH_LIGHT.ambient`, the openings' sizes),
and record the pass in the record with its captures.

### Task 5: the gate's runs

- [ ] `test:sky`, `tsc -b`, `lint`, `build`.
- [ ] (g): stops 0 to 3 and `walkT` 0.33 and 0.55, both viewports, the grass on, lit and ID, against `t0/base/`. A box
  per pose from the church's projected points and its ground shadow's corners, old and new; outside it byte-identical.
  Stop 4 by the palette and the crops.
- [ ] `grass=0` at the same poses against S3b's gate captures, by the same box.
- [ ] The palette at stops 0, 2, 3 and 4 (`check-street-colour.ts --time 0`). Every class keeps its verdict at
  `t0/base/`, the walls' failures included, or the change is named.
- [ ] The walk's triangles under the ceiling. Perf at the seven poses (`s3b-t6-perf.sh`'s method, alone).
- [ ] `check-street-grass.mjs` (all cases) and `check-street-walk.mjs`.
- [ ] Captures for Mark: stops 3 and 4 on both viewports, 1:1 crops beside the painting's church, and before and after
  against today's stop 4.

### Task 6: review and the record

- [ ] The branch review (Codex, or the Consultant). Every finding answered in the record.
- [ ] The record `tasks/2026-10-25-street-church.md`, the Tunables entry, the lessons, the todo's pickup.
- [ ] Mark's gate. No push and no PR before it.
