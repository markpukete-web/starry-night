# The church at stop 4 in the round: the record, 2026-10-25

The plan is `tasks/2026-10-25-street-church-plan.md`, revision 2.1. Mark, on the live street at stop 4: "I think we
need to improve the church, at the end of the stop it looks pretty flat". He is out, and asked the Lead to carry on
through this slice and the portal and to gate both when he is home. The evidence is in
`/Users/markma/Projects/starry-night/scratch/street-church-2026-10-25/`.

## The plan's reviews

The Consultant reviewed revision 1 (`plan-review.md`): REVISE, three P1s and seven P2s. The turn's sign was reversed
against the code's convention (F1). At the turn, a front corner stood inside the square's circle (F2). Stop 4 could not
frame the spire's tip and Vincent's feet on the desktop (F3). The Lead recomputed all three before folding them
(`scratch/church-turn.ts`, `scratch/church-frame.ts` in the worktree, run before Task 1. Run now, they apply the turn
twice). Revision 2 drew a confirmation read (`plan-rereview.md`): F1 to F10 closed, one new P1. (g)'s byte test could
not pass, because stop 4's frame turns 4.6° by design and the church's ground shadow reaches past a box of its
corners. Revision 2.1 folds that in. It was not read again: Task 5's box test is what proves (g).

## Task 0: the baselines and the face probe

`t0/base/`: every gate pose on both viewports, lit and ID, at time 0, and the colour gate's pairs at stops 0, 2, 3 and
4. Stops 0 and 2 are byte-identical to S3b's gate. The face probe on the square church (`t0/face-probe.txt`): four
faces face away from every pose, 145 of its 621 ribbons.

## Task 1: the turn, the setback, stop 4's target and the light (`621f179`)

The church turns +0.45 rad and stands 0.02 further back. Stop 4 sees the gable 37.8° off its normal and the moonlit
side 65.7° off. The nearest corner is 0.234 from the square's centre. Stop 4 aims at the turned front's centre
(`churchFront()`). Stop 0 keeps its aim, so its target is unchanged to 1e-12. The church's walls take `CHURCH_LIGHT`
(ambient 0.7, key 0.9, capped at 1), and its roofs keep the street's light: the gable 0.70, the side 0.886, the roof
stop 4 sees about 0.87. On the phone the spire's tip is inside the frame at (0.46, 0.91). On the desktop it is at y
1.49, about 9° of spire cropped, as before the slice. `scripts/street-church.test.ts`: three mutants (no turn, no
setback, no church light) each turn a test red. Captures: `t1/`.

## Task 2: the brush and the ledger (`addcb71`)

The face probe on the turned church (`t2/face-probe-turned.txt`) finds eight faces no pose sees: the nave's back,
left and back gable, its left roof, and the far two sides of the belfry and the spire, 310 of 621 ribbons. They are
clad at 0.25. Every church face takes the brush 0.16. The church goes to 875 ribbons, 173 of them thin. The walk's
worst point goes from 1,438,243 triangles to 1,438,511 (`t2/triangles.md`). The Consultant's F6 was right that a face's
triangles grow about 1.5× on the shorter brush, not 2.25×. The finer strokes are visible 1:1 (`t2/s4-compare.png`).

## Task 3: the door and the windows (`1dd3ef6`)

The front wall is three faces round the door's hole, shaded as one wall. The door is painted 0.02 behind it, and two
jambs and a lintel join the hole to it. A step stands at its foot, and three dark windows go down the moonlit side.
The first capture read as an empty frame (`t3/door-triptych.png`). A probe with black jambs (`t3/door-jamb-probe.png`)
showed the grey inside was the door panel itself, a plaster door at tint 0.3, and the far jamb only a narrow strip.
Two changes made the depth read: one frame, inked at the wall's plane (a second frame at the panel read as a double
outline), and the panel in the recess's shadow (tint 0.3 × 0.6). `t3/door-b.png` is before and after. The sweep in
`t3/triangles.md` (1,443,047 at its worst) ran at 15:11, before the second frame was removed, so it read a build that
was never committed. Task 5's sweep reads the committed door: every pose 320 triangles fewer.

## Task 4: the look passes

The measure (`scratch/church-l.ts` in the worktree, `church-look.sh` in the scratchpad): the lightness of the pixels
whose source class is plaster (`ids=2`), inside the church's box at stop 4. Four houses also use plaster, so the box
matters. The painting's plaster source (`STREET_SOURCES.plaster`, a patch of 10 × 21 px) reads L p10 39.8, p50 52.2,
p90 57.0.

| Pass | Change | Desktop L p10 / p50 / p90 | Phone L p10 / p50 / p90 |
| --- | --- | --- | --- |
| 0 (`t4/p0/`) | Tasks 1–3 | 29.6 / 41.3 / 55.0 | 29.6 / 41.1 / 54.7 |
| 1 (`t4/p1/`) | `CHURCH_LIGHT.ambient` 0.7 → 0.8 | 31.6 / 43.7 / 57.8 | 31.7 / 43.5 / 57.5 |

Before the slice the church's walls read L p50 32.2 at stop 4 (`t0/base/`), but by a class 0 mask of every wall in
the box, so that figure is not comparable.

Pass 1 is kept. The plaster reads paler, and the two walls stop 4 sees keep their step: the gable 0.8, the moonlit side
0.986. The ambient's useful range ends there: above about 0.81 the moonlit side reaches `max` 1 and the step goes.
`t4/p1/p0-p1-painting.png` is pass 0, pass 1 and the painting. One pass of four is used. The rest of the gap to the
painting's L 52 is not in this slice's knobs (below, "Open for Mark").
## Task 5: the gate (`t5/gate/`, at `11d136a`)

The suite (339 tests), `tsc -b`, lint and the build are clean (`summary.txt`).

Decision (g), the box test (`scratch/church-box.ts`, `box.txt`). Stops 0 to 3 and `walkT` 0.33 and 0.55, on both
viewports, lit and ID against `t0/base/`, and with the grass off against S3b's gate (`t6/gate/grass0/`, time 5). All
36 frames are byte-identical outside the church's box, the box holding the church before and after the slice and its
ground shadow. Stop 4's six frames differ everywhere, as the plan says: its frame turns 4.6° to the turned front.
Stop 4 is gated by the palette and the crops below.

The colour gate at stops 0, 2, 3 and 4 (`colour.txt`, `colour-verdicts.diff`). Two verdicts changed, both at stop 4:

- Desktop roofs: FAIL (ΔE 10.60) to PASS (ΔE 5.85). The church's roof slope is now in the frame.
- Phone roofs: FAIL on area (348 px) to FAIL on colour (ΔE 12.91 over 6,224 px, mean Lab [21.9, −0.2, −15.7]). The
  roof stop 4 sees on the phone reads darker and bluer than the palette's roofs. The roofs keep the street's light, so
  this is the slope's own shade, not the church's light. The split (`roof-split-s4-mobile.txt`, by
  `scratch/roof-split.ts`): the gate's roofs reference pools three sources, Lab [25.9, 0.2, −3.4]. The church's roof is
  painted from one of them, `roofBlue`, Lab [19.4, 0.0, −13.6]. The phone sees almost only that roof, and it reads
  ΔE 3.3 from `roofBlue`. The fail is the pooled reference meeting one roof alone, not a drift from the paint.

The walls fail at stop 4 before and after (ΔE 22.75 to 21.41 on the desktop, 24.23 to 23.44 on the phone), as they
fail at stop 0 on the desktop in the baseline. Every other verdict is unchanged.

The walk's triangles (`triangles.md`): the worst point is `walkT` 0.30 on the desktop, 1,442,727, 2,203 under the
ceiling of 1,444,930. Every pose reads 320 fewer than Task 3's sweep (two read 318 and 322), which ran before the
door's second frame was removed (Task 3, above).

`check-street-grass.mjs` passes its 17 cases. `check-street-walk.mjs` passes. No headless Chrome is left open.

The frame rate (`t5/perf/table.md`, at `d59a259`, five runs per pose with the marker made): p50 16.7 ms at every pose
on both viewports, 60 fps. The p95 reads 18.1 to 18.4 ms, against S3b's gate 17.3 to 18.3 ms
(`street-s3b-2026-10-25/t6/perf/table.md`). Stops 0 and 1 rose about 1 ms at p95 (desktop stop 0 17.3 to 18.3). The
other poses moved by 0.3 ms or less. Stop 0's phone mean reads 19.5 ms because three of its five runs hold one frame
of about 1.52 s. That frame is the harness's, not the church's: S3b's gate shows it in 8 runs and this one in 10, at
every pose and both viewports, always 1.51 to 1.55 s. Two earlier runs are set aside: the first because the marker was
never made (Task 6, below), the second because a source comment was edited while it measured, and Vite reloaded the
page. Neither is read.

## Task 6: the branch review

Codex reviewed `be2c298..11d136a` (`branch-review-codex.md`): FIX, two P2s and one P3, all three about the tests, none
about the scene. Its probes found no defect in the scene. No reachable pose of the walk sees a thinned face, sampled at
`t` by 0.001 on five more screen shapes (21:9, 4:3, 3:4, square, 32:9). Every face takes the right light. The door has
no crack and no coplanar step. The walk's end has no jump.

- **C1, P2, fixed in `755f572`.** The door and window tests read a report built apart from the drawn geometry, so
  Codex's two mutants (the panel's recess set to 0, no side window drawn) each passed all 11 tests. `opening()` now
  returns the quad it drew. The door's panel and the side windows in the report are those quads, and both tests check
  every corner against the drawn windows' buffer. Both mutants now turn a test red. The step's quads were already the
  values `lit` draws and returns. Stop 4's four frames are byte-identical after the change (`t5/c1-check/`).
- **C2, P2, fixed.** `scratch/church-box.ts` printed FAIL and exited 0. It now exits 1 on a FAIL. The controls
  (`t5/gate/box-controls/controls.txt`): the same frame passes with exit 0, and one pixel changed outside the box fails
  with exit 1. The gate script read the PASS and FAIL lines, so its 36 verdicts stand.
- **C3, P3, fixed.** The box let a change to Vincent pass when it fell inside the church's box. With the two ID frames,
  the script now also requires Vincent's pixels inside the box to match where both ID frames show him (the smock and
  the hat). The control: one pixel of Vincent changed at stop 3 (940, 480) fails with exit 1. Run again over the 36
  frames (`t5/gate/box-r2.txt`): all pass, Vincent's 2,000 to 6,600 pixels per frame unchanged in each.
- **The quality note, fixed in `d59a259`.** The probe's comments said "no pose" and "every pose". They now name the
  poses the probe samples and say it errs toward seen.

The record's own slip: the first perf run's shared marker (`t4/PERF-RUNNING` at the repo's root) was never made,
because its folder did not exist, and Codex ran its unit tests while that run measured. That run is set aside
(`t5/perf-void/`, not read). The perf script now makes the folder or stops.

## Open for Mark

The gate's captures: `t5/mark/`. Each `*-compare.png` is 1:1, before | after | the painting's church at 2×, at stops 3
and 4 on both viewports. The live street: `http://192.168.0.148:5197/?street=1&station=4`.

1. **Stop 4's desktop crops the spire's top**, about 9°, as before the slice. No pitch holds both the tip and
   Vincent's feet in 50° of field. Two levers, both outside this slice because they change the walk: a desktop field of
   58° at stop 4, blended by the walk as the target is, or `STATION_T[4]` and the walk's end moved back together.
2. **The church's own light, a deviation from the design.** The walls take `CHURCH_LIGHT` (ambient 0.8, key 0.9, max
   1) and the houses keep the street's. Without it the moon leaves the gable at 0.4 from the stop built to look at it,
   and the painting's church is its palest building.
3. **The plaster reads L p50 about 44, the painting's 52.** Pass 1 took the ambient to the end of its useful range.
   The levers left are outside this slice: a wider plaster source in the scan, or the church exempt from `wallShade`.
4. **The phone's roofs fail the colour gate at stop 4** (ΔE 12.91). The roof is ΔE 3.3 from its own source, so the
   fail is the pooled reference (Task 5). Your call whether the gate should read the church's roof against `roofBlue`.

Not pushed. No PR. The branch is `feat/street-church` at `d59a259` plus this record's commit.
