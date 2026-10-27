# The village lived in, K3 (door paths, signs of life, the plaster's row): the record, 2026-10-28

The plan is `tasks/2026-10-27-village-lived-in-plan.md`, revision 2. Mark asked the Lead at 00:00 on 2026-10-28 to take
K3 to its gate overnight and push the branch for a Vercel preview, with no PR until he has looked. The evidence is in
`/Users/markma/Projects/starry-night/scratch/village-craft-2026-10-25/k3/` (`E3` below) and the tools in `../tools/`
(`T`).

## The plan's reviews

Revision 0 drew REVISE from both reads: Codex's correctness read (F1 to F12) and the worker's buildability read (W01 to
W11). Revision 1 folded both. Codex's confirmation read closed eleven and kept F6 at P2: a ray through a real leaf missed
the mid-height plane. Revision 2 made the plant's hit a vertical cylinder (LP4). Fable read the last two fixes in Codex's
place, because Codex was low on usage: BUILD. Fable is a Claude model, as the Lead is, so that read is not independent
of the Lead's provider.

## Tasks 1 to 4: the build (the worker, Gemini 3.8 Flash)

- `5f3753c`, Task 1: W2 ends at `t` 0.41, 14 segments. The Lead fixed K2's last stone in `layCourse` (LP3) in the same
  commit.
- `db7904a`, Task 2: a trodden path from every front door but L5 to the lane, nine paths, 14 legs.
- `4c8e907`, Task 3: a bench by L2, a pot plant by R4, a pail by L4. The plant is its own grass chunk, and `plantHit`
  casts the hand's ray against a cylinder of its blades' rest reach.
- `74df6cb`, Task 4: the four plaster houses take `plasterLength` 0.7, through `faceConfig` and `traceFace`.

The `lived: false` build hashes to B1 `5f3ea9c0e97f6e46` (576,157 triangles) and its grass to G1 `aa265c36150f8105`
(241 chunks, 17,099 blades) at every task: K2's street is unmoved with the lived-in parts off.

## The Lead's read of the build

The Lead read the whole source diff `5f3753c..74df6cb` against the plan. It matches Decisions (a), (c), (d), (f) and
(g). One change is not in the plan: the worker moved `check-street-grass.mjs` case 15's point from lateral 0.32 to 0.20.
The Lead's probe (`E3/probe/lead-k3-case15.mts`) shows 0.32 inside one path's clearing and 0.20 clear of every clearing,
so the move is justified. Codex's replay agrees. The case keeps its gate.

## The mutation proofs

The worker wrote the fifteen proofs (`E3/t4/mutation-1.md` to `-15.md`) and ran the Lead's validator itself. The Lead
re-ran `T/k3-mutations.sh` twice: on `74df6cb` (`E3/gate/mutations-lead-t4-74df6cb.log`) and on the fixed head
`1b7402e` (`E3/gate/mutations-lead-t4.log`). Every mutation is red on both, the plan's named test among the failures,
and the tree is clean after each. On `1b7402e` mutation 3's diff no longer applies, because its context holds the old
`STREET_OBJECTS` line. The Lead applied it by hand (`pathClearings` returns `[]`): the grass's two clearing tests fail.
Mutations 13 to 15 still fail their tests after Codex's F2 and F3 changed them.

## Task 5: the look passes

**Pass 1** (`E3/t5/look1/`): stops 0 to 4 on both viewports beside K2's pass 5, then the plan's crops at 1:1
(`look1/crops/`).

- The bench by L2 at walk `t` 0.2 stands behind the rail in the rail's wood, a plank on two blocks. The pot plant by
  R4 at 0.55 reads as a dark pot with its blades on the step. The pail by L4 at 0.69 reads as a tub with hoops and a
  handle. On the phone at 0.2 and 0.55 the bench and the pot are out of frame. No clutter, no toy town.
- R4's path joins the lane at stop 3. R1's path shows at stop 0, and the far read at stop 0 is K2's.
- W2's new end at `t` 0.3: the head stone stands across the cap, and a dark joint shows between it and the top row's
  next stone. Fable's P3 (the last two stones with no mortar) does not show at 1:1, so its conditional change is not
  made.
- The plaster at 1:1 beside the scan (`look2/plaster-pair.png`, R4's wall beside the scan's walls B and A): the strokes
  stack in two tiers, as the scan's do. The flat base between the strokes is K1's cover, not K3's change.
- **One defect.** R1's path at `t` 0.05 ended in its bare base: a pale slab with a hard edge, which read as paving
  (`look1/crops/r1end-zoom.png`, at 4× `r1end-4x.png`). The strokes stop short of the clip, and the base ran to it. No
  Task 5 knob moves it: `baseInset` insets the base across the width only.

**Pass 2** (`E3/t5/look2/`): the last leg's base ends `baseInset × width` short of its end line, as it is inset across
(`1b7402e`). The end now shows the strokes' tapered tips, not a slab (`look2/r1end-pair.png`, before above, after
below). A new test holds the gap at the last leg and zero at a bend's mitre. It fails without the change. No knob was
moved: the paths' cover 0.25, `baseInset` 0.3, `leg` 0.08, the objects' places, `PLANT.scale` 0.7 and `plasterLength`
0.7 are the plan's. Two passes of the four are used.

## Codex's branch review (`E3/review-branch-codex.md`, REVISE, read against the code by the Lead)

- **F1 (P1), the compiler and lint gates fail.** Confirmed: tsc reported the five errors, lint the six errors and one
  warning Codex names. `TOP`'s use moved into `chunkOf` as `GRASS.top` and the local stayed. Fixed in `e14ed17`: the
  objects' `side` is typed `-1 | 1` (the plan's mirroring branch stays), the unused imports and locals are gone, and the
  capture effect lists `plants` (memoised on the painting, so stable). tsc and lint are clean.
- **F2 (P2), the leaf test pins 816 rays.** Confirmed by reading: the count moves as leaf points cross the frame's
  edge, so a scale the plan allows fails it. Fixed in `e14ed17`: the test asserts that rays were cast and that Codex's
  stop 2, blade 3, row 0.75 counterexample is cast on both viewports. Codex's wider suggestion, a test at scales 0.6
  and 0.8, is declined: `PLANT.scale` is a constant, and the test would need a parameter the plan does not have.
  Codex's confirmation read ran the test on copies at 0.6, 0.7 and 0.8, and it passes at all three.
- **F3 (P3), the sphere test clamps the drop, not the height.** Confirmed against `grassShader.ts`. Fixed in
  `e14ed17`: the point's y is `max(0, v.y − 0.7 × disp × a)`. The fixed-sphere control still fails, as it must.
- The case 15 move: Codex's replay agrees with the Lead's probe.

Codex's confirmation read of `e14ed17` and `1b7402e` (`E3/review-k3-confirm-codex.md`): APPROVE. F1 to F3 are
closed: tsc 0 errors, lint 0 errors and 0 warnings. `1b7402e` moves only the nine free-end bases, each by exactly
`baseInset × width` along its leg. The clips, the face rectangles, the clearings and the five inner legs' mitres are
unchanged. Every base stays convex inside its clip, the least side along a leg 0.0338 (R5). Two controls on a copy turn
the new test red: the inset removed (L1 leg 0) and the inset on an inner leg (L2 leg 0).

## Task 6: the gate's runs (`T/k3-gate.sh`, `k3-colour.sh`, `k3-perf.sh`, the log `E3/t5/gate-chain.log`)

The servers were restarted for the gate, each with its own Vite cache directory, so neither re-optimises the other's
(the lesson of 2026-10-27): K3 at `1b7402e` on 5206, K2 at `1b5e62f` (main) on 5205. The spike's and the look's
servers were stopped.

- `git status --short` empty at `1b7402e`. tsc, lint, `test:sky` and the build exit 0.
- The browser checks on 5206: `check-street-grass.mjs` (every case, 19 among them), `check-street-walk.mjs`,
  `check-street-rotation.mjs`, `check-street-cypress-hang.mjs`, `check-portal.mjs` and `check-reduced-motion.mjs` all
  exit 0.
- The sweep (K2's points: 0.05 steps, 0.01 over 0.25 to 0.40, 0.295, both viewports): the worst point 1,429,031
  triangles (desktop, `t` 0.26), the phone's 1,424,921 (`t` 0.31), both under the ceiling 1,444,930.
- The frame time, five rounds at stops 0 and 3, dpr 1.5, K3 beside K2 in each round (`E3/t5/perf/summary.txt`): p50
  16.7 ms on every run of both, 60 fps. p95 17.8 to 18.5 ms on K3, 17.9 to 18.6 on K2. Stop 0 draws 1,426,143
  triangles in 308 calls (K2 1,407,039 in 309), stop 3 1,285,083 in 153 (K2 1,268,619 in 156). The phone viewport
  draws 1,420,307 at stop 0.
- The palette gate (`E3/t5/colour/compare.txt`, light off, stops 0 to 4, both viewports): K3 adds no failing region.
  Every region that fails on K3 fails on K2 at the same stop and viewport: the walls at stop 0 desktop and stop 4, the
  roofs at stop 1 and stop 4 phone, the fog's area at stop 2 phone. K3 moves the walls by at most ΔE 1.7 (stop 1 phone,
  4.00 to 5.70, passing), the path class by at most 0.74 (stop 2 desktop, 4.02 to 3.28: Fact 11's quarter cover moves
  it toward the base, and here toward the palette), the ground by 0.59, the grass by 0.13, the roofs not at all. One
  region gets worse where it already fails: the walls at stop 0 desktop, 11.43 to 11.62. One K2 failure now passes: the
  walls at stop 2 phone, 10.17 to 9.95.
- **The build's time is over the plan's bound.** The plan asks for K2's time within 10%. Three runs of five builds
  each (`E3/t5/build-time.log`): K2 589 ms, K3 653 ms, +10.9% (the paired runs +10.5% to +11.9%). The Lead's probe
  (`E3/probe/lead-k3-buildtime.log` and a timed copy) puts 62 ms of the 64 in `doorPaths`, 0.5 ms in the objects. Each
  of the 14 legs costs about 4.4 ms, fixed per face: `traceFace` resamples a 64-row flow crop over the leg, and a long
  narrow leg gives a wide crop. The build runs once, when the street loads. The frame time does not change. A cheaper
  crop for the paths would change how they read, so the Lead did not make it overnight. Mark's call: accept +64 ms, or
  a slice to cut the paths' crop.
- The gate's sheet: `E3/t5/k3-gate-sheet.png`. The three objects at 2× and 4×, R1's end before and after `1b7402e`,
  R4's path meeting the lane at stop 3, R4's plaster beside the scan's walls, stop 0 beside the painting's village.
- The stops beside K2 from the gate's server: `E3/t4/gate/s0` to `s4`, desktop and phone pairs (K2 left).

One look seen at 4× is K2's, not K3's: in a lamp's pool, short grass blades show only their tips, because the pool's
translucent disc at y 0.007 covers the rest (`E3/t5/gate-shots/stubs-pair.png`, K2 above, K3 below, `t` 0.55).

## The Lead's gate: K3 passes, with the build's time open

The Lead read the whole diff `1b5e62f..1b7402e` against the plan, ran the suite and the mutation proofs, opened every
capture above, and answered each of Codex's findings against the code. Every plan criterion holds but one: the build's
time is 10.9% over K2's, against a bound of 10%. The miss is named above with its cause, for Mark.

**Mark's calls at the preview:**

1. The three objects' scale: they are seen while walking, at 76, 32 and 22 px wide on a desktop (the plan's head).
2. The plan's four departures from the design's text: the plaster's one measured outcome (0.7 of the row), the objects
   clear the grass round them, the pot plant built outside `grassChunks`, K2's subset test amended.
3. The build's time, +64 ms (+10.9%).
4. The paths as trodden earth: R1's end now meets the lane with the strokes' tips (`1b7402e`).
