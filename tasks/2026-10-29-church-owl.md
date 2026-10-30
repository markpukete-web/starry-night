# The church and its square, slice 2 (the barn owl on the ridge, the moths at the lights): the record, 2026-10-29 to 30

The design is the slice 2 section of `docs/superpowers/specs/2026-10-29-church-square-design.md`, decisions (i) to
(n), with Mark's call 3 (the owl at 0.024, its size a tunable). The plan is `tasks/2026-10-29-church-owl-plan.md`,
revision 2. Mark passed slice 1 on the preview at 22:10 on 2026-10-29. The evidence is in
`/Users/markma/Projects/starry-night/scratch/church-animals-2026-10-29/owl/` (`C/owl` below). Every time here is
Brisbane.

## The plan's reviews

Revision 0 (22:50, `b0bf5e1`) drew REVISE from Codex (`C/owl/review/codex-plan-r0.md`, F1 to F10, Q1 to Q3) and NOT
BUILDABLE from a Sonnet builder's buildability read (`builder-plan-r0.md`, A1 to A6, B1 to B5). The two that mattered
most: `ellipsoid`'s polar axis is z, so revision 0's paint bands put the chest on the back (F2, A2), and the look
compared the neck in world space with Vincent's position in the street's frame (F3, A4). Revision 1 (23:10,
`0f91f4d`) folded both, the dispositions in `lead-plan-r0.md`. Argon stopped Task 1 at Step 3 on two blockers in
revision 1's values, both the Lead's (`C/owl/t1/report-stop.md`): under `pitch` π/2 the radii are [across, depth,
height], and Test 2's counts could not pass. Revision 2 (23:30, `373c214`) took Argon's probed values. Codex's bounded
read of revision 2: BUILD (`codex-plan-r2.md`).

## Tasks 1 and 2: the builds

- Task 2, the moths: a Sonnet `builder` subagent on `feat/church-owl-t2` (`62934dc`, `8bbab18`), 29 moths (7 lamps ×
  3, 4 lit windows × 2), 58 triangles, one instanced mesh. The Lead's gate (`C/owl/t2/lead-gate.log`): tsc and lint
  clean, the suite 486 of 486, two mutants caught (the wobble with the phase, Codex F1; the rest point 0.008, Codex
  F6). Merged `e1cf321` (23:15).
- Task 1, the owl: Gemini 4 Argon (`w4:p5`) on `feat/church-owl-t1` (`a3c57c6`, `e2d7d6a`, `5d1e42c`), 544
  triangles. The Lead's gate (`C/owl/t1/lead-gate.md`): tsc and lint clean, the suite 494 of 494, two mutants caught
  (the chest band on the back, the reach test inverted). Test 2's `mean(front)` 0.8286 against the bar 0.8, measured
  by Argon and by Codex independently. Merged `91da265` (23:50).

## Task 3: the look passes (the slice's cap of four, and a fifth on Mark's word)

The plan's cap is four look passes for the slice (`tasks/2026-10-29-church-owl-plan.md:83`). The notes are
`C/owl/t3/notes.md`.

1. The moths (`p1/`, `p1b/`, on `e1cf321`): in the lantern's own amber they read as sparks off the glass, the design's
   anti-goal. The lever: `MOTHS.pale` 0.6, the paint mixed toward white (`49e6d0a`).
2. The moths (`p2/`): pale flecks fluttering, a moth at 8 m. They draw no eye off the church. They stand.
3. The owl (`owl1/`, on `91da265`), a first read: at stop 4 only a 10 px head showed over the ridge on the desktop, a
   4 px nub on the phone. At stop 3 the whole bird showed side-on, 8 px.
4. The owl (`owl4/`, `a3634c4`): pass 3 named the gable's rake as what hid the body. That was wrong. A ray probe
   (`C/owl/t3/occlusion.ts`, `occlusion.log`) found the ridge's own ink: one flat ribbon 0.034 wide at y 0.430
   (`OUTLINE_FRACTION` 0.14 × the eave 0.24, normal `UP`, `streetGeometry.ts:687`), which the owl stands on. From stop
   4's camera at y 0.09 it hides the owl's lower half wherever the perch is. Of a 9 × 21 grid over the owl's outline,
   51% is in view at 0.08, 61% at 0.04, 62% at 0.035, 35% to 46% at 0.01 to 0.02 (the rakes' ink meets at the peak).
   The lever: `OWL.back` 0.08 → 0.04. Now the head and the pale chest show over the ridge at stop 4 on the desktop,
   about 6 × 10 px, 25 px right of the cross. On the phone it is about 3 × 6 px, a nub with a lighter top beside the
   cross. At stop 3 the whole bird shows as before. The stop 4 head-turn pin in `street-owl.test.ts` follows the perch:
   55.9° (was 49.7°), inside the 70° cone.
5. The moths, past the cap on Mark's word (`p5/`, `5668c5c`). Mark on the preview, 2026-10-30: "I can see the
   motion, but it looks the same as the fireflies", then "go ahead". Both were soft, round, self-lit blobs, and the
   smooth loops read as the fireflies' drift. Now a moth is hard-edged: forewings and hindwings either side of a dark
   body (`PALETTE.ground`). The wings' half toward the glass is lit in pass 1's pale cream, the far half in the
   thatch's darkest 40%, so with the lamp behind it a moth is a silhouette. The loop's angle lurches
   (`MOTHS.lurch` 0.5 × sin 3θ: −0.5 to 2.5 of the mean speed, three turn-backs a lap) and a jitter shakes it
   (`MOTHS.jitter` 0.0045 at 5.3 Hz, half that at 8.7 Hz), both zero at the rest point. The jitter stays under the
   least radius, so a moth never comes nearer its glass than the rest point. In the captures they read as small
   brown-gold winged shapes with a dark side, 8 to 10 px at 1:1 on the desktop. Over 1/30 s frames they jump 10 to
   20 px, stall, double back and beat. A new test holds the rest point as the nearest and counts 21 to 36 turn-backs
   in 5 s against none for a smooth loop.

## Departures from the design and the plan

- The moths' shape, light and motion (look pass 5, Mark's word): the design's (m) has a camera-facing quad in the
  lantern's lit mean on a loop with a small vertical wobble. The quad stays, drawn as a moth. The two-tone wings and the
  lurch and jitter are new.
- `MOTHS.pale` 0.6: the design's (m) paints the moths in the lantern's lit mean. Look pass 1.
- `OWL.back` 0.04: the design's (j) puts the perch 0.08 back from the peak, and `OWL.back` is not in Task 3's list of
  levers. Look pass 4.
- The ridge's ink stays as slice 1 left it. Its width is slice 1's passed paint.

## Task 4: the gate

Run by the Lead on `a3634c4`, 2026-10-30, 12:16 to 12:48 (`C/owl/t4/`).

- Step 1 (`gate.sh`, `summary.txt`): tsc and lint clean, `test:sky` 494 of 494, `vite build` clean. The build hash
  `69db1abe1f64b82b` (600,179 triangles) is PR #38's head's, computed on `32e692b` in a throwaway worktree. Slice 1's
  gate read `def9abf04acfe8dd` before its post-gate fix `e29bc36`. The grass hash `33504d291c27e9ac` holds.
- Step 2: the six browser checks, one at a time. Grass 21 PASS, with case 20 (the owl: yaw 0.968 at stop 4, straight
  at stop 3 and with `walk=0`, culled at stop 0, held under reduced motion) and case 21 (29 moths). Walk 13, portal 20,
  rotation, cypress hang (the street ready in 2,692 ms), reduced motion at stop 4 with `walkT=0.9`: all PASS.
- Step 3 (`colour.log`, `colour-s4*.log`): stops 3 and 4, both viewports, `light=0`. The church class ΔE 3.04 on the
  desktop and 3.03 on the phone at stop 4, slice 1's numbers. The failures are slice 1's to the decimal: the smock's
  area 789 px against 800 at stop 3 on the phone, the walls' ΔE 10.79 at stop 4 on the desktop, the walls, the roofs
  and the windows at stop 4 on the phone. Stop 4 first failed the capture tool's pinned-clock check: the owl's head
  eases on real time and, being exponential, never stops exactly. The capture waits until two reads of
  `__owl().yaw` are equal (about 20 s; within 2e-5 rad of the target still failed on the desktop). A follow-up is in
  `tasks/todo.md`: a snap within 1e-4 rad, as the walk has, and the capture tool waiting for it.
- Step 4: the sweep's worst point 1,433,111 (desktop, `t` 0.26; slice 1 1,433,053, the moths' 58 more; the ceiling
  1,444,930). Perf (`perf/summary.txt`), five rounds at stops 0, 3 and 4 at dpr 1.5, desktop final, desktop no-post
  and the phone's viewport: p50 16.7 ms everywhere, p95 at most 18.5 (the bar 18.6). Draw calls 322 at stop 0 (slice
  1 321, the moths' one), 173 at stop 3, 89 at stop 4 on the desktop.
- Step 5 (`shows/`, `shows.log`): the turn, Vincent on the automatic walk from `t` 0.67: the head's yaw 0.29, 0.54,
  0.63, 0.68, 0.75, 0.83, 0.93, 0.96, 0.977 rad at 0.5 s steps as he walks into reach and stops at stop 4, the pitch
  capped at −0.7. The blink at stop 4: open at 1.0 s (two dark eyes in the pale face), shut at 0.48 s (the face plain).
  The capture helper pins the sky's clock at 0.5 s, inside the owl's first blink (0.46 to 0.52), so its turn frames show
  the eyes shut. Captures only.

Look pass 5's gate, run by the Lead on `5668c5c`, 13:08 to 13:15 (`C/owl/t5/`, `gate5.sh`): two mutants one at a time,
each its own artefact with the checkout and the green run. Smooth loops (`lurch` 0, `jitter` 0): red, "moth 0: 0 turns
back in 5 s". A jitter of 0.03: red, "never nearer the glass than the rest point". Both green after the checkout. tsc and
lint clean, `test:sky` 495 of 495, the grass check 21 PASS (case 21: 29 moths, at their anchors under reduced motion),
reduced motion at stop 4 PASS. Perf, three rounds at stops 3 and 4 at dpr 1.5: p50 16.7 ms, p95 at most 18.5; the
triangles and the draw calls as before (173 at stop 3, 89 at stop 4 on the desktop). The pass changes no geometry, so
the build, the sweep and the colour gate (no moths under `light=0`) stand from the first gate.

The Consultant's bounded read of `5668c5c` (`C/owl/review/consultant-pass5-r1.md`, 13:28): BUILD. The bound holds: a
proof on the component along `u`, and a sweep of 256 adversarial specs at 1/6000 s found nothing nearer than the
rest point. No shader finding at P2 or above. One P2, F1: the new test's lower bound allowed 1e-9, under Float32's
rounding at a rest crossing (up to 8e-8 on other grids or fixtures), so an unrelated change could turn it red. Fixed
by the Lead: the tolerance 1e-6, as the upper bound uses. The wide mutant (`jitter` 0.03) is still red. The comment's
argument in `moths.ts` now names the projection on `u` (1.5√2 × 0.0045 = 0.0095), not 1.5√3. No re-read: the fix is
P2.

## Codex on PR #39

Codex reviewed `b2e7eeb` at 13:40: one P2 (thread 4420226672), the owl's head easing on real time never settles, so a
pinned capture at stop 4 fails the self-check without a custom wait. It was this record's proposed follow-up. Fixed by
the Lead in `47ae236`: `OWL.look.snap` 1e-4 rad in `easeLook`, `__owl().settled`, and the capture helper's rest wait
reads it beside Vincent's. The proof (`C/owl/t6/`): a new test that the head lands on its target exactly (5.5 s at 60
fps), red with the snap removed (`mutant-snap.log`). `test:sky` 496 of 496. Stop 4's colour capture with the plain
wait `window.__streetReady`, desktop and mobile: both pass the pinned-clock check, and every class's numbers equal Task
4's to the decimal (`capture-s4.log`, `colour/`). No re-request: the fix is P2.

## The branch review

Fable, the Consultant (`w4:p6`), read `32e692b..a3634c4` (`C/owl/review/consultant-branch-r0.md`): BUILD, no P0 or
P1, fourteen P3s. The dispositions are `C/owl/review/lead-branch-r0.md`. Fixed in `5c9685e`: the stale numbers after the
perch moved (Q1), the perch's comment (Q2), the moths' shader header (Q3), case 20(g)'s settle 200 → 300 ms (T5).
Checked by the Lead on `5c9685e`: tsc and lint clean, the owl's and the moths' tests 12 of 12, the grass check 21 PASS
(case 20(g) held 0.6382 → 0.6382). No second review round: every fix is P3. Declined with reasons: the moths' jump
when the clock leaves zero (the project's `lifeTime` pattern), the per-frame allocations (the frogs' and the fireflies'
pattern; perf above), the test's neck without its z offset, a test of the ink's occlusion (T2: the probe is in
scratch and the gap is named here), a pin on the moths' paint, the eye's sink axis, the moths' fog in sRGB. For Mark's
eye: a window's moths dim on the lamp halo's radius (Q5).

The numbers that moved with the perch: the camera to the perch 0.877 at stop 4, 1.383 at stop 3, 1.715 at stop 2. The
perch (−0.311, 0.430, −2.487). Vincent at stop 3 0.786 from the neck, outside the 0.6 reach.

## For Mark at the preview

The phone's read of the owl at stop 4: about 3 × 6 px beside the cross. The look cap is spent. The levers left are
Mark's: `OWL.size` past his call 3 (0.024), or the ridge's ink thinner where the owl stands (slice 1's paint).
