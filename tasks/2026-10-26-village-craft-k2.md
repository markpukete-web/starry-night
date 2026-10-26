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
Recipe D (`E2/t4/p3/D-wall.png`, 22:35): B's body and texel floor with the build's length 0.61 to 0.89. It reads as a
grey painted wall with long pale strokes along its courses, the top lit by the moon. B's shorter stones read more as
stones, but they sit under the painting's measured stroke length for this source, and the bar is the painting's
hand, so D is pass 3's recipe: `LANE_CRAFT.wall` base 1, pale 0.5, joint 0.92, width 0.19, length unchanged. Whether
the strokes should read stonier is Mark's call at the gate.
