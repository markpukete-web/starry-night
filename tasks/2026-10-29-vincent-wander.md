# Vincent's wander (a tap on open ground sends him there): the record, 2026-10-29

The plan is `tasks/2026-10-29-vincent-wander-plan.md`, revision 3 with decision (p) and Task 2b. The spike it builds on
is `spike/vincent-wander` (`74d8856`, behind `?wander=1`). Mark's calls, all on 2026-10-29: the wander as a slice
(09:58, "Wander as a slice"), Task 1 started while Codex read revision 3 ("Start Task 1 now"), and his walk home
(11:45, "Yes, walk him back after the dwell"). The evidence is in
`/Users/markma/Projects/starry-night/scratch/vincent-wander-2026-10-29/` (`E` below).

## The locked criterion, as this slice reads it

The camera's position stays on the walk's rail, `walkPose(t).position`, on every frame. Off the lane, `t` follows his
lane coordinate (`followT`). Only the camera's aim turns toward him, by at most 20°. This reads the criterion. It does
not edit it. Codex on revision 0: "The plan's positional reading holds."

## The plan's reviews

Three rounds with Codex. Revision 0 drew eight P2s and the builder's buildability read (`E/review/codex-plan-r0.md`,
`builder-plan-r0.md`). Revision 1 drew two new P2s in the return, N1 (a return straight home could cut a lamp post) and
N2 (a 90° snap at the slot). Revision 2 drew one: the phone's sight-guard fixture projected off the 390 px canvas.
Revision 3 got BUILD (`codex-plan-r3.md`). The route stack is the key design: every return leg is a reversed leg
already checked, which closed F3 and N1. Decision (p) got its own bounded read, BUILD (`codex-plan-p.md`).

The worker's baseline on `main` (`E/base/`) found `npm run -s lint` failing in the main checkout with 1,848 parsing
errors: `eslint .` walked into the repo copies under `scratch/`. Worktrees have no `scratch/`, so CI was clean. Task 0
(`46d0d0b`) ignores `scratch` and `.claude`.

## The build

- `5b4c878`, Task 1 (a builder, from `d55c7c6`): the pure module `streetWander.ts`. Where he may stand, which legs he may
  walk, which he can be seen walking, the route stack and the stepper. 14 tests. The Lead's `dd29996` tightened the
  return's last frame to one frame's turn and put back the spike's two refusals (a house, the lane).
- `bf02f43`, Task 2 (a builder, from `dd29996`): the scene. The ground cast, the tap, the off-lane frame, the aim, the
  mark, the tap box, the feet's ground position, and browser case 8 (`check-street-walk.mjs`) and case 14
  (`check-portal.mjs`). Twelve departures, each accepted at the gate (`E/t2/report.md`, `E/t2/lead/gate.md`).
- `298ffa5`, Task 2b (the Lead): decision (p). On the automatic walk he sets off home 3.55 s after he arrives
  (`PAUSE.dwell - PAUSE.endTurn`), so the lantern is down when a station's dwell would end. `autoOn` is `stepPause`'s
  own test, now shared. Case 8d covers the walk stopped and the walk on.
- `192fe30`, look pass 2 (the Lead): the mark.

## The spike's four faults

1. The lantern hidden in the grass. Raised, the glass's centre stands 0.0232 over the ground. The tallest blades round
   the accepted points stand 0.024 to 0.036 at the median and up to 0.050 at the worst point of a stop. The numbers said
   hidden. The captures said visible at stops 0, 1, 3 and 4 on both viewports: the camera looks down past the blades.
   At stop 2 a lamp's glow outshines the lantern, not the grass. Nothing past decision (g) was built.
2. The sparse verge. 609 to 927 accepted points in frame on the desktop and 332 to 615 on the phone at stops 0 to 3, on
   a 0.02 grid, in two large regions each. The spike had one spot at stop 0 and two at stop 2.
3. The square. 322 points on the desktop and 213 on the phone at stop 4. His feet stand on the square's strokes.
4. The spot behind a gable at stop 3. The sight test refuses a leg hidden by a house grown by its eave. At stop 3 he
   stands clear of the gable on both viewports.

## The look passes (two of four)

Pass 1 measured fault 1 and captured every stop: lane, walking, arrived, desktop and phone (`E/t3/pass1/`). It found
the mark, a disc 0.002 over the ground, under the blades on the verge and an edge-on smear on the square. Pass 2 made the
mark his lantern's halo at the raised glass's height, `WANDER.markY` 0.023: a warm glow on the square, a glint between
the blades on the verge (`E/t3/pass2/`). 2 triangles, was 24. The record of both is `E/t3/passes.md`.

## The gate

Task 4's runs, by the worker on `192fe30` (`E/t4/gate/summary.txt`, `E/tools/wander-t4.sh`), 12:29 to 13:09:

- The green step: `tsc`, lint, 471 of 471 tests. The build hash `5492d517c80ba56e` (596,919 triangles) and the grass
  hash `33504d291c27e9ac` (240 chunks, 14,986 blades), both unchanged from `main`.
- The six browser checks pass: walk (12 cases), portal (20), grass (19), rotation, the cypress hang, reduced motion.
  `npm run build` passes.
- The walk's worst point is 1,429,793 triangles (desktop, `t` 0.26), V1's, under the 1,444,930 ceiling.
- Performance, five rounds each of `main` and the branch at stops 0 and 3, dpr 1.5: p50 16.7 ms on both in every
  round, p95 at most 18.6 ms on the branch and 18.7 on `main`. Triangles and draw calls are equal (321 at stop 0 on the
  desktop): he stands on the lane at a stop, and the mark draws only while he walks to it.
- The browser mutations: b01 (the tap box left on the lane), b02 (the feet at the slot), b04 (the last sight sample),
  b05 (the frozen step), b06 (the walk home) are RED, each at its own case. b04 fails where 8b qualifies Codex's pinned
  point: with the last sample gone, `wanderTo` accepts it, so the case fails before the tap. b03 (the aim dropped from
  `settled`) survived: no case asked for `settled` while the aim eased. `68e847d` adds that case, and the mutation runs again in round
  1 (below).
- The control b00 passed its 12 cases and then failed the leak check: the Lead's own walk check ran beside it and
  left a Chrome in the count. The control was run again alone in round 1 (below).

The logic's mutations, by the worker on `8c67341` (`E/t4/mut-module/summary.txt`): 13 of 13 RED, each by the test
written for it (the rail, the eave, the middle and the last sight samples, `inFrame`, the retrace, the hops cap, the
lane's precedence, the frog, the frozen step, the walk home off and late, `autoOn`).

The Lead's gate on `a21767e`, the merged head, alone (`E/gate-final/summary.txt`, `E/tools/gate-final.sh`), 13:42 to
13:58: `tsc`, lint, 472 of 472 tests, the build and grass hashes unchanged, the six browser checks green (walk 12
cases, portal 20, grass 19, rotation, the cypress hang, reduced motion), the walk's worst point 1,429,793 triangles,
`npm run build` green. Performance is Task 4's: the fixes after `192fe30` change only the tap's admission and the
checks.

## Codex's branch review

Round 0 on `192fe30`, REVISE (`E/review/codex-branch-r0.md`), three P2s in the code, one in a check and one P3. The
Lead's dispositions are `E/review/lead-branch-r1.md`.

- F1, a tap through a house wall sent him behind it. `groundHit` refuses ground that `hidden()` finds hidden from the
  live camera's eye. The rule refuses 231 of desktop stop 1's 927 accepted points, the ground behind R2 that stop 1
  cannot see, and 0 to 5 at every other stop (`E/r1/spots.log`).
- F2, a drag out and back to the press counted as a tap. The gesture latches `dragged` past 8 px.
- F3, the frozen gait cuts to standing: declined. The lane on `main` does the same, and V1's (i) asks for a standing
  figure. The plan's (l) now says so. Codex closed it on the clarified contract.
- F4, the wall fixture chose only walls the page already refused. It now finds its wall by the bare footprints.
- F5, the speed comment.

Round 1 on `5a54543`, REVISE (`E/review/codex-branch-r1.md`): F1, F3, F4 and F5 closed. Two P2s stayed open. A browser
may fold a drag's samples into one move, and the latch read only the move's own point. The phone's sight fixture,
searched with a mutated module, could choose a point behind the camera and pass. `f61cddf` reads every coalesced sample
(`strayed`), and the sight fixture must be in front of the camera, cast back to its pixel, and be refused by its last
sample alone (`seenButLast`, the check's own loop). `68e847d` adds the settle at home for Task 4's b03.

Round 2 on `f61cddf`, BUILD (`E/review/codex-branch-r2.md`): the folded drag, the phone's sight fixture and the
settle at home all CLOSED, each by a probe of the extracted handlers, helpers and frame callback. Round 2's own browser
runs found the check's stale pixel in 8c (`8a8bf70`, test only, `E/review/lead-branch-r1.md`).

The round's browser runs, on `8a8bf70` (`E/r1/summary.txt`, `E/tools/r1-redgreen.sh`), one at a time. Each mutant
is RED at its own case: `m-f1` (no live-eye test) at the wall tap, `m-f2` (no `dragged` refusal) at the 60 px
out-and-back, `m-f2-folded` (the move's own point only) at the folded move, `m-b03` (no aim in `busyRef`) at the
settle at home, `m-b04` (no last sample, page and check) at 8b's qualification, `m-b04-phone` (no last sample in
portrait, the page alone) at 8e's tap after 11 cases. The walk check is green (12 cases), the portal check green, and
Task 4's control b00, run again alone, green (12 cases). `m-f2-touch` (the refusal kept for a mouse only) failed
twice in case 6, before its finger case: a flake older than this slice. After the first wheel he still walks at the
0.5 cap, and a frame between the check's read and its wheel and blur moved him 0.0035 in `t`, over the 0.002 / L bar
(K2's record had 0.0033). `a21767e` reads `t` in the same task as the pair. On `a21767e`, alone, `m-f2-touch` is RED
at 8d's finger out-and-back after 10 cases (`E/r1/m-f2-touch-alone.log`).

## For Mark

Passed by Mark on the preview (`4f05302`), 14:44 ("Passed, open the PR and get Fable to review"). Codex's plan is
drained, so Fable reviews the PR.


- His walk home is built: on the automatic walk he goes home after the dwell. With the walk stopped by a tap on him, he
  stays until a tap on the lane, a wheel turn or an arrow key.
- At stop 4, a spot by a house's corner turns the aim 20° toward him, and the near wall fills the right quarter of the
  frame (`E/t3/pass1/desktop-s4-2-arrived.png`). The 20° is the plan's. The composition is your call.
- At stop 2, a spot under a lamp's glow outshines his lantern (`E/t3/pass1/desktop-s2-2-arrived.png`).
- The mark is new: a small warm glow where he is going, gone when he arrives (`E/t3/pass2/`).
