# The village's craft, K2 (the lane's walls, rail and lamps): the record, 2026-10-26

The plan is `tasks/2026-10-26-village-craft-k2-plan.md`, revision 1, with one amendment from the build (A1 below). Mark
passed K1 on its preview ("K1 passed, start K2's build") and asked the Lead to take K2 end to end and ping him with the
preview link. The evidence is in `/Users/markma/Projects/starry-night/scratch/village-craft-2026-10-25/k2/` (`E2`
below) and the tools in `../tools/`.

## The plan's reviews

Codex's correctness read and the worker's buildability read of revision 0 both said REVISE (`E2/plan-review-codex.md`,
`E2/plan-build-worker.md`). Revision 1 folded both in one round (the table "What revision 1 changed" in the plan, W01 to
W11 and F1 to F9), the halo's depth-based cap among them. Codex's read of revision 1: APPROVE
(`E2/plan-review-codex-r1.md`, the halo bound verified exact). The worker's: BUILDABLE (`E2/plan-build-worker-r1.md`).

## Task 0: the base's reads

The base is K1's head `ca102c7` (`96f246e` with the docs), served from `craft-wt` on port 5205. Its build hashes to
`35ce7aeb5bd88590`, 574,041 triangles, its grass to `def5470cc15817ba`, 241 chunks and 18,383 blades. K1's look pass 3
captures (`E/t4/p3/`) are the look passes' left-hand side.

## Tasks 1 to 3: the build (the worker, Gemini)

- `a19c983`, Task 1: three dry-stone walls on the open verges (W1 left `t` 0.06 to 0.22, W2 right 0.14 to 0.47, W3 left
  0.54 to 0.84), each run in equal segments of at most 0.02 in `t`, the lane face at lateral 0.135, the back at 0.165,
  0.055 high, their stones as draped dabs (`stoneDab`, 3 samples by 3 columns, 8 triangles), five courses on the lane
  face and two rows on the top. The grass's filter became a list of oriented rectangles (`stepClearings()`,
  `wallClearings()`, `streetClearings()`), run after the shuffle. 1,964 triangles. 1,373 blades fewer (18,383 to 17,010).
- **The stop in Task 1, and A1.** `street-grass.test.ts:99`, the density falloff by band, failed at 17.9% against its
  10% bar: its expected count is a grid that knows the houses, the cypress and the square, and the walls took 1,373
  blades out of band 0. Neither plan review caught it. The amendment (the plan's table row A1 and Task 1's Step 3a): that
  one test builds its own chunks with `stepClearings()`, K1's grass, so it measures the generator's falloff without
  K2's deliberate removals. Nothing else in the file changes. Codex's bounded read: GO (`E2/review-a1-codex.md`): the
  test still catches a wrong falloff law, the suite's other consumers of the shared chunks passed in the same run, and
  teaching the test's grid every new clearing would couple the expected count to the filter it should check separately.
  `30564f5`.
- `9f1d52d`, Task 2: the wooden rail round L2's front garden, 7 posts 0.005 square and 0.05 high, two rails at 0.02 and
  0.042, the opening at the door, in the thatch source's mean, the walls' class with `src` 255, no ink. 150 triangles.
- `38e221a`, Task 3: seven lamps (`STREET_LAMPS`, alternate sides, lamp 7 on the square), a post 0.004 square and
  0.13 high in ink, a lantern 0.012 by 0.016 in the lit window's mean (class 2, in `underpaint`), an ink cap, a halo
  sprite scaled every frame by `lampHaloScale(depth, fov, aspect)` and a pool on the ground at y 0.007 over the
  square's stroke top. 140 triangles. The worker's point of choice: the rail test's tolerance 0.00355, a post's
  half-diagonal.
- The worker's nine mutation proofs (`E2/t3/mutation-1.md` to `-9.md`): each red on its named test, the restore clean,
  the suite green. Its report: `E2/t3/report-worker.md`.

K2 adds 2,254 triangles (the plan's estimate about 2,500, its bar 1,000 to 4,000). With the lane off (`LANE=0`) the
build and the grass hash to K1's exactly.

## The Lead's checks before the look passes

- The suite run by the Lead: 396 of 396 (`E2/gate/test-sky-lead.log`).
- The hashes run by the Lead (`E2/gate/hash-lead.txt`): `LANE=0` build `35ce7aeb5bd88590` and grass `def5470cc15817ba`
  (K1's), the lane build `ab28cee40043a144` at 576,295 triangles and grass `70767bb72eaed35b` at 17,010 blades, the
  worker's four exactly.
- The diff `c9fd0cd..38e221a` read against the plan, the tests included: the geometry, the classes, the report's ranges,
  the clearings and the halo's per-frame scale are the plan's. Two notes, neither a defect: `LANE_CRAFT.wall.cover` is
  set and never read, and the lantern's reported centre is the literal 0.138 rather than `height + lantern[1] / 2`.
- The nine mutation proofs re-run by the Lead: see below.

## Task 4: the look passes

Each pass captures stops 0 to 4 on both viewports (`E2/t4/pN/`) beside K1's pass 3, and is read at 1:1.

- **Pass 1** (the build as committed, `E2/t4/p1/`, the crops `p1-crops.png`). The lamps and the rail land: the lamps
  read as lamps at every stop, the rail as a garden fence at stop 1. The walls do not. Their body is near black and the
  stones are a few pale flecks on it, so a wall reads as a black kerb with leaves on it, not dry stone. The cause is in
  the plan's own numbers, measured (`E2/probe/lead-k2-wall-sources.mjs`): wallA's underpaint at the plan's share 0.4 is
  L 4.7, and 57% of wallA's texels are under L 20, so most dabs are the base's colour. wallB's underpaint at the same
  share is L 13.0 and its texels' median L 30.4 (p75 53.1): dark joints, mid-grey stones. The plan's knob for this is
  the stones' source. Also at stop 0 the far lamps' halos (0.192 world units wide, the plan's size) merge into one
  yellow haze between the houses. The lantern itself is a flat yellow box with a pyramid cap: it reads as a lamp, and a
  little as a toy at 1:1. Noted for Mark, no knob in the plan.
- **Pass 2** (`5806c1c`: the stones' source wallB, the halo at 0.7 of the plan's size; `E2/t4/p2/`, the crops
  `p2-wall-s3.png`, `p2-wall-s0.png`, `p2-rail-s1.png`, `p2-lamps-s0.png`). The lamps pass: at stop 0 the far halos
  separate into lamps instead of one haze, and the near lamp reads as a lantern on a post with its pool under it. The rail
  passes: at stop 1 it is a fence in silhouette against the lit verge. The walls still fail, on two counts read at 1:1.
  The body is near black: the base is wallB's darkest 40% (L 13 before the light) and the lane face takes the ambient
  0.4, so the joints are about L 5. Each stone is a pointed lens 4:1 to 6:1 (length 0.61 to 0.89 of the height on a
  course 0.2 of it), so it reads as a leaf or a fish on a black wall, not as a stone. The advisor's check of the pass 3
  knobs the Lead first proposed (the base at the source's mean, L 33.7): the median texel is L 30.4, so half the stones
  would be darker than the joints, which inverts dry stone. The base at share 0.4 is already under the texels' 25th
  percentile (L 15.5), so the base stays. The levers are the dabs: 35% of wallB's texels are under L 20 and vanish
  against the base, and a lens with pointed ends covers about half of its cell (the joint 0.88 by the width 0.85 of the
  course by the lens's area). Pass 3 is the dabs' texel floor, shape and length, probed in place before the worker's
  round (below).

## Codex's branch review (`E2/review-branch-codex.md`, REVISE, read against the code by the Lead)

The range `c9fd0cd..38e221a`; the Lead's pass 2 commit `5806c1c` is outside it. Each finding was checked against the
code, and the five with a probe were reproduced by the Lead's own run of Codex's probe
(`E2/probe/codex-k2-branch-probe.mjs`, the log `E2/gate/codex-probe-lead-rerun.log`).

- F1, P2, confirmed: `streetLife.tsx:143` applies the camera's world inverse to the lantern's street-local position.
  `Street.tsx:181` offsets the street group by `STREET.originA` under `?skyAnchor=A`, so there the halo's depth is 5.07
  instead of 0.114 and the sprite fills 1.80 of the short side against the 0.5 cap. Anchor B, the default, is right.
- F2, P2, confirmed by running them: `npx tsc -b` fails on two unused imports in `streetGrass.ts` (`doorStepFrame`,
  `STEP`) and `npm run lint` on four (those two and `STREET_WALLS`, `wallClearings` in the lane test). `k2-gate.sh`
  would have failed at its first step. The suite's 396 pass under Node's type stripping, which checks neither.
- F3, P2, confirmed: the drawing test checks non-empty in-bounds ranges, so a build with no lane faces (104/212/188
  underpaint vertices down to 72/144/128) still passes it. Mutation 3's red came from its extra edit of every run's
  range end to `start + 100`, not from the omission.
- F4, P2, confirmed: the ring test measures the wall's footprint, not the clearing rectangle the grass filter expands.
  The rectangle's gap to frog 3's ring is 0.00165 at the default and 0.00141 at an end overlap of 0.004, under the
  0.0015 bar, and the test cannot see it.
- F5, P2, confirmed: all 28 lantern-cap triangles wind inward (normal y −0.707), and `lightOf` takes that normal, so
  the cap's four faces are lit as if they faced down. `DoubleSide` keeps them visible and hides the winding.
- F6, P3, confirmed: of `LANE_CRAFT.wall`, only `height` and `source` are read; `inner`, `thickness`, `segment`,
  `courses`, `rows`, `length`, `joint` and `cover` are literals in `laneWalls` and in `wallClearings`. Setting `inner`
  to 0.15 changes nothing.
- F7, P3, accepted as an evidence note: the worker's mutation artefacts record the restore's exit code and not its
  command. The Lead's own re-run (`E/tools/k2-mutations.sh`, `E2/gate/mutations-lead.log`) applies each recorded diff,
  runs the lane and grass tests, restores with `git checkout -- src scripts` and checks the tree, and is the gate's
  record of the nine proofs.
- **Pass 3** (the in-place probe, 22:00: `E/tools/k2-wall-probe.sh` patches `laneWalls`' literals with
  `k2-wall-variant.py`, captures stop 3 on 5206, crops the wall at 1:1 and restores the tree; `E2/t4/p3/A-wall.png`,
  `B-wall.png`, `C-wall.png`). Three recipes, each with the dab's width 0.19 of the height (0.17) and a texel floor
  on the dabs (`pale`, the share of the source box's lightest texels a dab may take). A, the dark joint: the base at
  share 0.4, `pale` 0.65, the length 0.4 to 0.6, the joint 0.96. B, the painted wall: the base at the source's mean,
  `pale` 0.5, the length 0.4 to 0.6, the joint 0.92. C, A with the build's length 0.61 to 0.89. The reading: A and C
  keep the black body, and the stones, long or short, read as leaves on it. B's body is a mid grey-blue under the
  moon, its top lighter, and every stone a paler lens on it: it reads as a grey stone wall painted the way the houses
  are (their base is the source's mean, K1), not as dry stone with dark mortar, which is the right convention for this
  piece. B is pass 3's recipe, set by the worker in the fix round below (`LANE_CRAFT.wall` base 1, pale 0.5, length
  [0.4, 0.6], joint 0.92, width 0.19). The full capture after the round is pass 4, the cap.

## The fix round (Codex's F1 to F7 and pass 3): the brief `E2/brief-k2-fix1.md`

The round in one worker brief: F2 (the imports), F6 (the wall's geometry moves to `STREET_WALL` in the layout, read by
the walls and the clearings alike, the paint in `LANE_CRAFT.wall` with the new `pale`, the lantern's centre from the
lamp's numbers), F5 (the cap's winding, a test), F3 and F4 (the two guards), F1 (`haloScaleOf` from the sprite's world
position, a test with a translated parent), pass 3's values, five mutation proofs with their commands on the page
(F7), the type check, the lint, the suite and the hashes. Codex reads the brief first as the plan leg
(`E2/brief-codex-k2-fix1-plan.md`, five bounded questions, `VERDICT: GO` or `STOP`); the worker starts on GO.

Codex's plan leg stopped the brief twice, each time on a contract break the Lead had missed (`E2/review-fix1-plan-codex.md`,
`-r2.md`). Revision 1: the cap fix must move the build hash and the hash rule did not allow it; the lint gate came
before the retained import's use; the tests read the wall's height from the object the brief removed; the halo helper
had to live in `streetLife.ts` for Node's test runner (`.tsx` fails to load); the inner-lateral mutation had no valid
red once the tests follow the control. Revision 2 carried all five, and Codex found one more: the measured-dab test
pins the stone's length and width to the plan's literals, and wallB's measured stroke range (`SOURCE_STROKES`, 0.6 to
2.0 of the reference height) starts above pass 3's 0.4. Revision 3: the test takes its targets from the controls and
checks the painting's measured range on its own, and pass 3's length stays inside that range (recipe D, probed at
stop 3 like the others: B's body and texel floor with the build's length).
Recipe D (`E2/t4/p3/D-wall.png`, 22:20): B's body and texel floor with the build's length 0.61 to 0.89. It reads as a
grey painted wall with long pale strokes along its courses, the top lit by the moon. B's shorter stones read more as
stones, but they sit under the painting's measured stroke length for this source, and the bar is the painting's
hand, so D is pass 3's recipe: `LANE_CRAFT.wall` base 1, pale 0.5, joint 0.92, width 0.19, length unchanged. Whether
the strokes should read stonier is Mark's call at the gate.
Codex's third read: GO (`E2/review-fix1-plan-codex-r3.md`): the dab test's targets follow the controls, the
independent measured-range check stands apart from them, and D's numbers sit inside wallB's measured ranges (length
0.0336 to 0.0490 of 0.033 to 0.11, width 0.01045 of 0.0066 to 0.011). The worker was dispatched at 22:24.

## The fix round, built (the worker, 22:24 to 23:00) and the Lead's gate on it

The worker's seven commits (`127a14a` F2, `c02bed7` F6, `0e1a9fa` F5, `75e4b67` F3 and F4, `d2a7548` F1, `5bb707b`
pass 3, `7934c07` a test change the brief did not ask for), its report `E2/fix1/report-worker.md`, its six proofs
`E2/fix1/mutation-1.md` to `-6.md`, each red on the named test with the restore command on the page (proof 2 also
fails the drawing test, named as collateral). The hashes: the base `35d9126b7a105cda`, after the cap `86e36e47c66e1a99`
(the count unchanged), final `fbecadea394f92af` at 576,375 triangles (2,334 over K1, the bar 578,041), the grass and
both `LANE=0` hashes unmoved.

The Lead's checks on the head (`E2/gate/round1-lead-checks.log`): `npx tsc -b` 0, `npm run lint` 0, the suite 398 of
398, the four hashes the worker's. The diff read against the brief: each step is the brief's. The texel floor scales
the source box by the painting's size over 1600 × 1267 as `sourceUnderpaint` does (the work painting is 1600 × 1267,
so the scale is 1).

The unrequested commit `7934c07` dropped the dab test's equality between the recorded and the emitted length. The
Lead's probe (`E2/probe/lead-k2-dab-length.mjs`): one dab of 224 (W3, index 49, `t` 0.6709) is emitted 0.0022 longer
than its drawn length, and 16 iterations of the endpoint step leave the same 0.0022, so it is not convergence: the dab
straddles a lane kink, where the offset curve `laneAt` jumps with the normal. The emitted length 0.0396 sits inside
both the controls' range and the painting's measured one, so the stone is right and the report was wrong. The Lead's
fix, `3662089`: the report carries the emitted length (the endpoints' projection on the tangent) in both loops, the
equality is back at 1e-4, the geometry and the hash are unchanged. The probe then finds no deviation, the lane file
passes 20 of 20.
The six proofs re-run by the Lead at `3662089` (`E/tools/k2-mutations.sh fix1 6`, `E2/gate/mutations-lead-fix1.log`,
the lane and grass files together): 3, 4, 5 and 6 red on their named test alone; 1 (the positive case, `inner` 0.15)
keeps every lane test green and fails only the grass test `a chunk's prefix is an even sample`, which must move when
the clearings move; 2 red on the footprint test, with the drawing test and that grass test as collateral. The tree
clean after each. Codex's bounded confirmation (`E2/brief-codex-k2-fix1-review.md`) and the pass 4 capture were
started together at 23:15.
- **Pass 4** (the cap; the head `3662089`, `E2/t4/p4/`, the crops `p4-wall-s3.png`, `p4-wall-s0.png`, `p4-lamps-s0.png`,
  `p4-rail-s1.png`, `p4-wall-s3-mobile.png`, `p4-lamps-s0-mobile.png`), read at 1:1 on both viewports. The walls pass:
  a grey-blue body under the moon, its top lighter, long pale strokes along the courses, so each reads as a grey stone
  wall painted the way the houses are. At stop 0 the near wall's end cap is a flat grey slab (the plan's caps carry
  the base only). The lamps and the rail hold from pass 2: the far halos at stop 0 separate into lamps, the near lamp
  reads as a lantern on a post with its pool, the rail as a fence at stop 1. The retune cap is reached: whether the
  stones should read stonier than strokes, or the caps carry stones, is Mark's call at the gate.

Codex's confirmation (`E2/review-fix1-codex.md`, 23:33): APPROVE. F1 to F7 closed by the named steps; its five
counterexamples no longer reproduce at the head (its probe `E2/probe/codex-k2-fix1-confirm.mjs`); the Lead's
emitted-length report is "the right bounded closure", the one dab's excess 0.00217 confirmed as the kink at `t`
0.6844, every dab inside both ranges (0.6105 to 0.8870 of H long, 0.19 wide); the hash `fbecadea394f92af` unchanged
by the Lead's commit; the budget 1,666 under the bar. It does not authorise relaxing the grass prefix guard for a
later retune of `inner`.

## Task 5: the gate's runs (`E/tools/k2-gate.sh`, `k2-colour.sh`, `k2-perf.sh`, `k2-walk.sh`, the log `E2/gate/task5-chain.log`)

`k2-gate.sh` at `fe4498e` (the code at `3662089`): tsc 0, lint 0, test:sky 0, build 0, walk 0, rotation 0, cypress-hang
0, portal 0, reduced 0, and **grass 1**: `check-street-grass.mjs` case 15 ("the hand against lit tops", S3b) reads
668 pixels brightened on the lit page against 906 unlit, 0.74 under its 0.85 bar (K1's gate: 925 against 865, 1.07).
The unlit count is K1's; the lit count fell. The case's verge point is `pathPoint(0.12)` offset 0.15, and K2's lamp 1
stands at `t` 0.10, lateral 0.11: the hand's 80 px disc lies in the lamp's pool, which lights the verge before the hand
arrives, and a brighter base shows the same push as a smaller L* step. The case's premise was the moon alone on the
tips.

The diagnosis by geometry (`laneAt`): the case's point `laneAt(0.12, +0.15)` is 0.063 from lamp 1's foot at `laneAt(0.10,
+0.11)`, inside its pool (radius 0.16, a glow plane at y 0.007 under the blades), and 0.033 from W2's clearing edge (W2
starts at `t` 0.14 on the same side; its lane face at 0.135, 0.03 thick, cleared 0.012), inside the hand's 0.045 push
radius. Under the pool the ground between the blades is pale, so a blade that bends away or over it darkens the pixel
rather than brightening it, and the case counts brightening alone. The other nine cases at that point (1, 2, 4, 6, 8, 9,
11, 12, 16) pass (case 16 at the re-run below: the chain's run stopped at case 15): they read the hit, the peak and the
push, not the sign of the light. The probe: `GRASS_VERGE_T` and
`GRASS_VERGE_LAT` override the point (defaults S3's 0.12, 0.15); case 15 alone on the lane at the default, at
(0.12, −0.23) (past W1's outer face −0.165 and its clearing −0.177 by more than the hand's 0.045; 0.31 from lamp 2) and at
(0.12, +0.32) (0.21 from lamp 1's foot, the disc's edge 0.17; 0.16 from W2's near corner), and K1 at the same points.

`k2-colour.sh` (S1 task 7's method, `light=0`, `t` 5, stops 0 to 4, both viewports, K1 on 5205 against the lane on 5206,
logs `E2/t5/colour/{base,branch}/check-s<n>-<v>.log`): no region is worse and failing on the lane. The failing regions are
K1's, the fog on (Mark, 2026-10-24): walls at every stop but s0 mobile and s3 desktop, roofs at s1 and s4 mobile, byte for
byte K1's numbers where the lane adds nothing (s4 mobile walls 23.44, roofs 12.91; s1 roofs 11.02). Where the lane adds
pixels the mean moves toward the palette: the dry-stone walls carry the walls' class (s0 desktop 17.53 to 14.04, the area
129,349 to 194,814 px; s3 mobile 21.48 to 14.86), the lanterns the lit window's (s0 desktop windows 3.99 to 0.76). One
region rose: s3 desktop walls 7.89 to 9.14 (W3 beside stop 3), under 10.

`k2-perf.sh` (the frogs' method: `capture-diorama.mjs --perf` at dpr 1.5, stops 0 and 3, five rounds, K1 and the lane
side by side in each round, 10 s a run, `E2/t5/perf/<side>-s<n>-r<k>/perf-summary.json`): p50 16.7 ms in all 60 runs
(60 fps at the display's vsync). p95 on the lane 16.9 to 17.6 ms on 29 runs and 18.1 on one (stop 3, round 1, no
post-processing); K1 16.9 to 17.7. Draw calls at stop 0: 309 against K1's 288 (desktop), 240 against 222 (the phone
viewport); at stop 3, 156 against 146 and 123 against 113. Scene triangles at stop 0 1,407,119 against 1,406,031
(desktop), 1,401,123 against 1,400,041 (phone); at stop 3 1,268,699 against 1,269,569 (the clearings take more grass
than the wall adds). The sweep (`E2/t5/tri-sweep.log`, 0.05 steps in `t`, both viewports): the worst sampled point
1,412,737 (desktop, `t` 0.40), under the ceiling 1,444,930 by 32,193; K1's refined worst 1,414,747 (`t` 0.295).
`k2-walk.sh p4` (`check-street-walk.mjs`) exit 0: every walk case passes on the lane. The chain ended at 23:53.

The probe's runs (`E/tools/k2-grass15.sh`, logs `E2/gate/grass15-*.log`, 23:55 to 00:05): the lane at the default 668
against 908 (0.74, the chain's failure reproduced); at A (0.12, −0.23) 1,676 against 1,623 (1.03), K1 there 2,133 against
2,035 (1.05): the counts differ because the 80 px disc on the screen is wider than the hand's 0.045 push and takes in W1's
clearing; at B (0.12, +0.32) 1,039 against 935 (1.11), K1 1,039 against 941 (1.10), the lane changing nothing there. A
first control patched the wrong term: `GRASS_LIGHT.top` to 0 (the moon's lift) read 0.98 at B, 1.00 at A and 0.99 at C
(0.35, −0.15, from stop 1, the camera's geometry to the point as S3's), against K1's 1.19 and the lane's 1.17 at C. S3b's
control is the hand's lift, `uLift` 0.8 off in the lit program alone (0.65 at the default point), and the moon's term
alone moves the count little anywhere. The control re-run with `uLift` is below.

The control re-run with `uLift` 0 in the lit program (00:05, `E2/gate/grass15-branch-*ctrl2.log`): at the default point
521 against 908 (0.57: the lift still shows there, the pool compresses it below the bar); at B 524 against 941 (0.56); at
A 967 against 1,623 (0.60); at C 566 against 590 (0.96, no discrimination: the point is 0.29 further from stop 1's camera
than it looks, the blades small on the screen). The fix: case 15 alone moves to B, `VERGE_15 = { t: 0.12, lat: 0.32 }` in
`check-street-grass.mjs`, the comment carrying the geometry and the five numbers; the other nine cases keep S3's point,
which they passed with the lamp there. The env knobs were the Lead's working copy only and are not committed;
`k2-grass15.sh` is the probe's record. The bar (0.85) and the metric are unchanged; the control at B (0.56) reads as
S3b's did at the default (0.65).

The grass check re-run whole on the lane with the new point (`E2/t5/grass-rerun.log`, 00:08): 18 of 18 pass, case 15
1,034 against 941 (1.10), case 16 (the press) passing for the first time in this gate: the chain's run had stopped at case
15, so case 16 had not run before. `npm run lint` on the edited check exit 0 (`E2/gate/lint-grass15.log`).

## The Lead's gate: K2 passes

- Codex: the branch review's seven findings closed, the confirmation read APPROVE (bounded to the code at `3662089`, before
  the check's change, which the PR review covers).
- The Lead's checks at the head: tsc 0, lint 0 (twice, the second after the check's edit), test:sky 398 pass, build 0, the
  hashes `fbecadea394f92af` 576,375 (lane) and `35ce7aeb5bd88590` 574,041 (`LANE=0`, K1 byte for byte), the lane grass
  `70767bb72eaed35b`.
- The browser gates: walk, rotation, cypress-hang, portal, reduced motion, grass (18 of 18 at the re-run), colour (no
  region worse and failing; the fails K1's, the fog on), the frame rate 60 fps at stops 0 and 3 (p95 at most 18.1 ms),
  the sweep's worst point 1,412,737 under 1,444,930.
- The look: four passes, the cap; pass 4's 1:1 crops pass the walls, the lamps and the rail on both viewports.

Open for Mark's eye, none a blocker: the lantern reads as a flat yellow box at 1:1 (a lit window's mean, no glass); the
walls' end caps carry the base colour only, no stones; stonier stones (a darker joint, a wider stone) are his call after
the cap; lamp 1's pool reaches the verge grass by design (0.063 from S3's hand point), the reason case 15's point moved;
the K1 fog fails stand. A `?lane=0` toggle (the build hash's `LANE=0` as a URL flag) would let him compare K1 and K2 on
one preview: noted in `tasks/todo.md`, not built.

Pushed at 00:10 (`883c311` the check, `946ef0b` the docs) to `feat/village-lane`. The Vercel preview
`https://starry-night-gepd7ldoi-markpukete-webs-projects.vercel.app/?street=1&station=0` (Vercel sign-in); Mark pinged at
00:13. No PR until he has looked. K1's preview stays at its own deployment URL for a side-by-side.

Mark's first live read, 2026-10-27 00:20 to 00:29: "the lighting feel right." The wall at stop 0 reads to him as a concrete
fence; he asked whether wood would be better. The Lead's recommendation: keep stone and make it read as stone (joints
about 0.8 with a darker body, two stone sizes, a cope of upright stones, stoned end caps), probed in place at stop 0 before
a worker round; a pass past the cap, so his call. He wrapped up without deciding. K2 is on preview, not passed.

## Pass 5, the stone wall: past the cap on Mark's word (2026-10-27, evening)

Mark, 19:05: "Probe stone", over wood and over passing K2 as it stands. The probe ran in place at stop 0 on 5206
(`scratch/village-craft-2026-10-25/k2/t6/tools/stone-probe.py` patches the literals and the course loop,
`run-probe.sh` captures, crops the left wall at 1:1, `500x300+90+430` of the desktop frame, and restores the tree;
the patches `S1.patch` to `S4.patch`, the crops `S1-wall.png` to `S4-wall.png` beside `p4-wall.png`).

**The two causes.** The street's stroke body (`CYPRESS_STROKE_BODY`) draws every stroke as a flame: the head pointed
(`r = pow(1 - x^2.5, 0.4)`), the tail 0.72 of the width, the dry brush from 0.55 along. `stoneDab` gave each stone the
whole stroke, an end taper of 0.6 and a wobble of half a width, so each stone drew as a leaf with gaps a third of its
length, whatever the joint literal said. Pass 3's crops prove the body share was not the lever: recipe A (the dark
body) and D (the mean) carry the same leaves. The second cause: the body at the mean gave the joints the stones' tone.

**The recipes.** All four: the stone takes the stroke's full-bodied middle (along 0.3 to 0.7, flipped on odd seeds),
the geometry's ends 0.92 of the middle, the wobble 0.12 widths, each course planned as stones that fill its run and
end flush at both heads, a stone per course on each head, width 0.2 H, the stones from wallB's lightest 55%.
S1: five courses, stones drawn 0.6 to 1.4 H skewed short, joint 0.96, the body at the darkest 40%: coursed flat
stone, the stones long and the perpends faint, a plank read at the near end. S2: S1 with the body at the mean: the
joints grey, the stones blend into a slatted block. S3: five courses, 0.6 to 1.1 H, joint 0.92, the dark body: more
stones per run, the perpends visible. S4: four courses, 0.6 to 1.0 H uniform, joint 0.92, the dark body: blocks with
clear bed joints, the near head four stones. The comparison for Mark: `k2/t6/k2-pass5-wall-probe.png` (built, S3, S4).

**Mark's pick, 19:20: S4.** The build goes to the worker (`k2/t6/brief-k2-pass5.md`: D1 the dab's shape, D2 the
paint, D3 the planned course shared by the lane courses and the top rows, D4 the head stones, three new tests, the
dab test's cap branch, five mutation proofs, the look captures as pass 5). Codex reads the brief in parallel with a
STOP verdict (`k2/t6/brief-codex-k2-pass5-plan.md`): the recipe is probed and chosen, so the read's risk is in the
tests, and a STOP within the hour costs one worker round at most. The Lead's gate follows: the worker's report and
diff read, the mutations re-run, the look at pass 5's frames on both viewports, `k2-gate.sh`, `k2-colour.sh`,
`k2-perf.sh`, `k2-walk.sh`, then the push for Mark's preview. Open from pass 4 and still open: the lantern's flat
box, the fog fails, the `?lane=0` idea.
