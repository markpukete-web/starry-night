# Vincent's form, V1 (the painter on the road to Tarascon, the pause, the lantern): the record, 2026-10-28

The plan is `tasks/2026-10-28-vincent-form-plan.md`, revision 3. The spike that chose the form is
`tasks/2026-10-28-vincent-form-spike.md`. Mark's calls, all on 2026-10-28: the Tarascon form (about 11:15), the turn
90° for the body and 45° for the head with a 4 s dwell (11:21), no cane and the right arm swinging (11:33), and the
builds on Sonnet 5.5 `builder` subagents in place of the Gemini pane (12:10, "Make the switch"). Mark handed the Lead
the wheel at about 12:00 ("take the lead"). The evidence is in
`/Users/markma/Projects/starry-night/scratch/vincent-form-2026-10-28/slice/` (`E` below).

## The plan's reviews

Revision 0 drew REVISE from Codex (`E/plan-review-codex.md`, F1 to F9). Revision 1 folded all nine. Codex's
confirmation read (`E/plan-confirm-codex.md`) closed F2 to F9. It kept F1 open: the Lead's claim that the turned reach
moves the tap rect by under 3 px was wrong, and a click on the lagged lantern landed 5.38 px outside. It also found N1
(a stop on blur does not turn the automatic walk off, so the plan's rule left a dwell running) and N2 (a `node_modules`
folder link let two builders share tsc's `.tmp`). Revision 2 made the tap rect the rig's box and the figure's bounds
together, kept the dwell running through a blur, and linked `node_modules` one entry at a time. Codex's second
confirmation (`E/plan-confirm2-codex.md`) closed N1 and N2 and kept F1 at P2: `Box3.setFromObject` does not bound the
halo, which the sprite shader draws facing the camera. Revision 3 is the Lead's answer, read by no reviewer: the bounds
take his meshes only, and the halo and the pool are the lantern's light on the street, not his figure. A tap on the halo
outside his body does not land on him. Codex's branch review reads this decision.

## Tasks 1 to 4: the build

- `8389bb5`, Task 1 (a builder, from `24d7f0f` on `build/v1-t1`): the Tarascon form alone, with legs, the lantern and
  no cane, 2,840 triangles. The lantern's uniform starts at w 0. The Lead re-pinned `street-frog.test.ts`'s scene hash to
  `3ac8284c958086e0`, because the form changes `body` and `armLeft` by design.
- `3a6ab46`, Task 2 (a builder): the pause and the gait in `streetWalk.ts`. A 4 s dwell at each station on the
  automatic walk, the turn in after a 0.5 s rest and out 0.45 s before the dwell ends, each arm with the opposite leg.
  The builder added full-swing assertions at distance 0, because the plan's control at distance 0.02 sits at cos ≈ 6e-17.
- `cd52233`, Task 4 (the Lead): the lantern's warm lift on the ground's strokes, the grass's base and the grass, before
  the fog, in `streetLantern.ts`. Unlit and in the ID view the programs are the base's byte for byte (pinned hashes).
- `d8d3514`, Task 3 (a builder, from `a0ac94a` on `build/v1-t3`): the figure on the street. The frame loop drives the
  pause, the turn, both arms, the legs, the head and the lantern's lag. The tap rect is `vincentTapCorners(t,
  vincentFigureBounds(group))`. `__vincentForm` reports the pause's state and the form's own clock.
- `b1d8496` (the Lead): the walk check's K3 leg read his box 500 ms after load, which is when the turn starts. Two loads
  caught the turn at different points, and the box moved 3.39 px with the anchor's offset right
  (`E/t3/check-street-walk.run1-k3-midturn.log`). Read once the turn is 1 and the lantern has settled, it moves 0.00 px.

The street's build still hashes to `5492d517c80ba56e` (596,919 triangles) and its grass to `33504d291c27e9ac` (240
chunks, 14,986 blades), K3's, after every task.

## The Lead's read of the build

The Lead read each builder's whole diff against the plan and ran tsc, lint, `test:sky` and both hashes in each builder's
worktree, then again on the merged head: 449 tests, 449 pass (`E/t3/merged/`). Task 3's control finds 22 of 2,347 of his
vertices outside K3's tap rect mid-turn, the worst by 5.56 px on 1280 × 800 and 3.57 px on 390 × 844. With the figure's
bounds, none are outside.

Task 3's browser red (`E/t3/red.log`, the head before Task 3): K4 fails, his turn 0 after 15 s. Case 7 did not run,
because K4 stops the script first. Before Task 3, `__vincentForm` does not exist, so Case 7 could fail only its
precondition. The green on the merged head (`E/t3/*.log`): the walk check passes all seven cases, the dwell 4.016 s on
the form's clock and the lantern lit on all 275 recorded frames. The rotation, grass and reduced-motion checks pass.

## The mutation proofs

Mutations 1 to 15 and 19 to 20 were run by the builders, 16 to 18 by the Lead (`E/t1`, `E/t2`, `E/t3`, `E/t4`). Every one
went red on its named test and green again after the restore. The Lead runs all twenty again at the gate.

## Task 5: the look passes (`scratch/vincent-form-2026-10-28/look/`, two of the cap's four)

Pass 1 (`look/p1`, 13:32): stops 0 to 4 on both viewports, K3 (`ed464c9`, served from `lived-wt` on 5208) beside the
branch (5209). At every stop he stands turned side-on with the left arm raised and the lantern lit (`turn` 1, `lantern`
1 in each frame's `__vincentForm`). Against K3, the branch changes only his figure and the light round him: 15,483 of
1,440,000 pixels at stop 0 on desktop, with the frog at stop 0 untouched (Review focus 4). The bright spark in the grass
at stop 1 is in K3 too. The motion (`p1/motion`): the stride swings each arm 0.12 with the opposite leg. At stop 1 he
arrives, stands 0.5 s, turns in over 0.6 s, holds, turns out in the dwell's last 0.45 s and walks on. A backward scroll
slides him back turned and with no stride, as Review focus 3 expects. Reduced motion holds him still and turned. Task 4's
captures (`p1/t4`): with `vincent=0` the warm light goes. Under `skyAnchor=A` his box is the same to the pixel, and his
figure and light change the same 10,752 pixels in the same box as under the default anchor, with no pixel in one map
and not the other (Review focus 5).

The probes (`p1/probe`, each edit restored and the tree checked clean): the pool sprite makes the visible warm patch the
lantern throws ahead, and without it the patch goes, so it stays. The ground lift alone at reach 0.05 showed only on
the pale path by his feet, because it multiplies the paint, and the grass round him stayed dark. At 0.08 it lights
15,222 px of stop 2's desktop frame (4,937 at 0.05), with no pixel more than 21 of 255 brighter than at 0.05. `0073f6e`
sets 0.08. Pass 2 (`look/p2`, 13:46) shows it at every stop.

Seen and left for Mark, because he chose them with the form: the straw hat is the brightest thing on him (1.9 ΔE from its
source patch), the trousers are pale (`vincent.ts:360`, "so the step reads where a leg is one pixel wide"), and the
rolled canvas on his back reads as a pale slab.

## Codex's branch review (`E/review-branch-codex.md`, REVISE, read against the code by the Lead)

Codex read `ed464c9..0073f6e` and closed F1 under revision 3's definition: 23,667,148 vertex projections in 10,084
sampled views put no vertex of his figure outside the tap rect, and removing the halo sprite leaves the bounds the same.
It found the three lit programs' term before the fog, no cache key naming two programs, and the frog's re-pin still
rejecting the regression it guards. It raised two P2 findings, both confirmed by the Lead in the code:

- **B1, P2.** With `walk=0` or `flat=1` the frame loop returns at once, yet the lantern, its halo and its pool rendered:
  the halo at scale 1, about 41 times its size, the pool upright at the origin, and `w` 0, so no light on the ground.
  Two guards decided one thing. `b6c6404` adds `lanternShown(flags)` beside `walkOn`, which takes the
  walk in, so in the static modes he stands as S2 drew him, without the lantern. The test "the lantern shows only where
  the walk places it" covers the default and each of `walk=0`, `flat=1`, `vincent=0`, `light=0` and `ids=1`.
- **B2, P2.** On the automatic walk, a wheel that crossed a station made a fresh 4 s dwell and threw the scroll's target
  away. Only the automatic walk's own step makes a stop now: a frame with wheel or key input, or with a scroll still
  easing in (`target` ahead of `t`), carries him past. The test "a scroll across a station makes no stop" covers
  Codex's repro (the wheel's own frame from 0.229) and a crossing while the scroll eases in, on frames with no input
  (from 0.225). Input alone would have missed the second.

Mutations 21 to 23 (`E/fix-b/`): `lanternShown` without the walk, `automatic` without the input condition, and
`automatic` without the easing condition. Each goes red on its named test, the last two at different assertions ("no
dwell on the wheel frame", "frame 1: no dwell while the scroll eases in"). Both fixes are P2 and touch no risky logic, so
the Lead verified them and did not ask Codex to review them again.

## Task 6: the gate's runs (`tools/v1-gate.sh`, `v1-colour.sh`, `v1-perf.sh`, the logs in `E/gate/`)

- tsc, lint, `test:sky` (449, then 451 with B1 and B2), the build: all pass.
- The browser checks, first run (`E/gate/*.run1-under-load.log`): the grass check's case 17 and the portal's case 4
  failed while the mutation runner, Codex and the build loaded the machine (load average 12.7). Run alone, the grass
  check passed. The portal check then failed case 9 on every run: its pinned capture caught Vincent mid-turn, because his
  turn and his lantern's swing run on the walk's real time, as the walk always has, not on the pinned clock. With
  `vincent=0` the same capture passed. `95025d1` adds `settled` to `__vincentForm` and makes `capture-sky-frames.mjs`
  wait for it, after any eval, before the pin's reads. Plain captures then passed 3 of 3, byte-identical, and the portal
  check passed all its cases.
- The triangle sweep: the worst point 1,429,793 at `walkT` 0.26 on desktop (K3 1,429,031, +762 for the form and the
  lantern), under the 1,444,930 ceiling.
- The colour gate, K3 against V1 at every stop and both viewports: only the hat newly fails, at ΔE 16.2 to 17.2 from
  the moon swatch `#c0b451` (K3's hat 5.5 to 6.3). The hat is the Tarascon straw from its source patch (1.9 ΔE from it in
  the unit test), and the plan leaves that to Mark at the preview. The smock moves from about 6.4 to 2.8 to 3.8. No other
  region moves by 0.5 or more.
- The twenty mutations, run again by the Lead in a detached checkout (`E/gate/mutations-lead.log`): all twenty red on
  their named tests, the tree clean after each. Mutation 13's diff no longer applied, because Task 3 added a function
  after `flicker`, so the Lead applied it by hand at the same line.
- The final head `b6c6404`, run again by the Lead at 14:40 (`E/gate/final/`): tsc, lint and the build pass, and
  `test:sky` runs 451 tests, 451 pass. The street's build hashes to `5492d517c80ba56e` (596,919 triangles) and its grass
  to `33504d291c27e9ac`, K3's. The six browser checks pass on it, the machine quiet: walk, rotation, grass, the
  cypress hang, reduced motion and the portal.
- The frame time (`E/gate/perf/summary.txt`, five rounds of K3 and V1 alternated, dpr 1.5, stops 0 and 3, desktop and
  the phone's viewport): p50 16.7 ms on every run of both sides. The p95's medians are 18.3 to 18.4 ms on both sides,
  the worst single run 18.5. V1 adds 762 triangles and 13 draw calls: 1,426,905 and 321 at stop 0 on desktop (K3
  1,426,143 and 308), 1,285,845 and 166 at stop 3 (K3 1,285,083 and 153).
- The build's time (`E/gate/build-time.log`, three rounds alternated, each the median of five): the street 657, 664
  and 666 ms on V1 against 658, 661 and 666 on K3, unchanged, as its identical hash says. `buildVincent` takes 1.1 ms
  against K3's 0.8.

## The Lead's gate (14:40)

The Lead read the whole diff `ed464c9..b6c6404` against revision 3, ran every check above on the final head, ran the
twenty mutations and the three fix mutations, opened the look passes' captures, and answered Codex's two findings in
the code. Every acceptance check the plan names passes, except the hat's colour, which the plan leaves to Mark. V1
passes the Lead's gate. The branch is pushed for a Vercel preview (behind Vercel's login, `0e7205f`):
`https://starry-night-aqkftn0ko-markpukete-webs-projects.vercel.app/?street=1`. No PR until Mark has looked.

## Mark's calls at the preview

1. **The hat.** It is the Tarascon straw from its source patch, and it fails the colour gate against the moon swatch at
   ΔE 16.2 to 17.2 (K3's hat 5.5 to 6.3). Keep it, or move it toward `villageWarm` as K3's hat was?
2. **The form's refinements**, seen and left for him: the hat is the brightest thing on him, the trousers are pale
   (`vincent.ts:360`), and the rolled canvas on his back reads as a pale slab.
3. **The motion**: the 4 s dwell, the 90° and 45° turn, and the lantern's light on the grass round him (reach 0.08).

## The hat after Van Gogh's own (18:14, `scratch/vincent-hat-2026-10-28/`)

Mark, at the preview: "Where did we get this hat from actually? it looks like a fishing man. But if that's something
that Vincent Van Gogh drew then let's use his painting." The hat came from the spike's reading of a description of the
Tarascon painting, not from the painting: a dome crown over a brim that drooped all round, which reads as a conical hat.
The references are now in `scratch/vincent-hat-2026-10-28/ref/`: "The Painter on the Road to Tarascon" (1888, the
Wikipedia scan of the 1930s colour photograph, the painting burnt in 1945) and the Met's "Self-Portrait with a Straw
Hat" (1887, 67.187.70a, Open Access). Both show a rounded crown about half as tall as it is wide and a broad brim, flat
off the crown, curling up toward its edge. In Tarascon one side is turned up.

`vincent.ts`: the crown 0.0075 tall (top 0.082, under the rig test's 0.0825) with rounded shoulders, the brim flat off
the crown with `curl` 0.0012 all round and `lift` 0.0026 toward his right at the edge, its normal by differences. Look
pass 1 (`look/p1`) lifted one side by 0.0016 and it did not show. Pass 2 (`look/p2`, `lift` 0.0026) shows it at stops 1
and 3. The colour is unchanged: the moon's yellow (Mark's open call 1 above). Tarascon's hat is a darker ochre.
451 tests pass, tsc and lint clean.

## The hat's colour (18:48, `5b000f9`, `scratch/vincent-hat-2026-10-28/look/p3`, `gate/`)

Mark: "Go for your recommendations for the hat's colour." The hat now paints from the crescent's lower-right edge,
`[1490, 280, 1514, 304]`: the painting's darkest and warmest gold, with brown stroke lines through it. Its mean is L 63.1
at hue 90. The moon's body, the hat's old patch, is L 68.9 at hue 94. The Tarascon hat measures L 65.9 at hue 84 and
chroma 45. A search of the whole painting found no gold patch under chroma 50, so Tarascon's chroma is not a target.
Its reference is a 1930s colour photograph of a canvas burnt in 1945. Only the direction counts: darker and warmer.

The colour gate's `refHat` is now that patch's mean. The rectangle is written in the gate and not read from `FORM`, so
the target stays put if the hat's patch moves (Codex T1). `palette.json` has no ochre swatch. Its nearest gold, the
moon's `#c0b451`, is 14.1 from the patch. The unit test still prints the hat against `#c0b451` (11.45) and asserts the
hat within 3 of its source patch (2.86). The margin is small because the solid under the strokes is the patch's darkest
40% (L 56.5).

- The colour gate, every stop and both viewports (`gate/colour-p3/branch`): the hat passes at ΔE 5.4 to 6.5 (it failed
  at 16.2 to 17.2), rendered L 59 to 61 (was 65 to 66). Every other line is the same as V1's run at 14:40.
- The lit look frames (`look/p3`, rough bands in Vincent's box): the hat's median L falls 3 to 5 at each stop
  (stop 1 55.3 to 50.3, stop 3 47.0 to 44.2, stop 0 52.6 to 48.1, stop 2's phone 52.9 to 48.6). It is now below the
  trousers' median at stops 0, 2 and 3, and above it at stop 1. It still reads as gold, a deeper ochre than before.
- 451 tests, tsc and lint pass. One look pass.

## Mark's gate (20:38)

Mark, on the combined preview `preview/all-2026-10-28` (`253d8f7`, V1 merged with `feat/portal-on`,
`https://starry-night-9yhn2axt0-markpukete-webs-projects.vercel.app`) on his iPhone: "Love it! Gate passed!" V1
passes as built: the Tarascon form, the hat's shape and its ochre, the lantern and the motion. Next: the PR, stacked
on K3's branch until #32 merges.
