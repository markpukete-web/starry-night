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
outline), and the panel in the recess's shadow (tint 0.3 × 0.6). `t3/door-b.png` is before and after. The walk's
worst point is 1,443,047 triangles, 1,883 under the ceiling (`t3/triangles.md`).

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