# The church and its square, slice 1 (the church's own paint, the two trees, the ring of flowers): the record, 2026-10-29

The design is `docs/superpowers/specs/2026-10-29-church-square-design.md`, approved with Mark's three calls at 17:16:
the church's tones mirrored (the front dark, the moonlit side pale), the ring of flowers in the square lamp's pool
only, the barn owl tunable in slice 2. The plan is `tasks/2026-10-29-church-square-plan.md`, revision 4. Mark handed
the Lead the wheel before 18:30 ("Take the lead I am having dinner"). The evidence is in
`/Users/markma/Projects/starry-night/scratch/church-animals-2026-10-29/` (`C` below). Every time here is Brisbane,
read from the git log or the file's clock.

## The plan's reviews

Revision 0 (17:30) drew REVISE from Codex (`C/review/codex-plan-r0.md`, F1 to F10, landed 17:58). Revision 1 (17:56,
`c9b7f05`) folded the advisor's and the builder's reads and closed F1, F4, F6, F7 and F8. Revision 2 (18:12, `4ec0008`)
closed the rest: the openings keep the plaster face (F2), a distance test against the sway's bound (F3), the flowers'
test asserts the geometry (F5), the tones by name and never by the moon term (F9), 1,100 triangles reserved for the
flowers (F10), and Codex's answers 6 and 7 (the flag off is the base byte for byte, the wander's witnesses found with
the ring at the post's radius). Codex's confirmation read (`C/review/codex-plan-r2.md`, 18:18) closed five of six and
kept F2 open: `wallSource: 'churchLit'` reached the door's strokes. Revision 3 (18:20, `086b6d9`) keeps `wallSource`
plaster, puts the tones in their own field and guards the openings' strokes (`cls` 255 in the nave's box, 2,287
vertices, hash `51a2c84e0b745f72`). Revision 4 (18:40, `de5d5f0`) adds departure P7 after look pass 4.

## Task 0: the four sources (the Lead, `C/t0/sources.md`, 17:41)

Picked at 6× and 8× on the 1600 × 1267 work scan. The painting's church sits at work px x 820 to 960, y 820 to 1110.

| Source | Rectangle (work px) | L p10 / p50 / p90 | ΔE to plaster |
| --- | --- | --- | --- |
| churchLit | [886, 1050, 906, 1072] | 42.9 / 49.7 / 56.1 | 2.4 |
| churchShade | [936, 1056, 954, 1094] | 6.2 / 26.8 / 46.6 | 23.9 |
| spire | [904, 860, 914, 990] | 28.3 / 48.9 / 57.1 | 5.8 |
| belfry | [898, 1000, 922, 1012] | 6.2 / 14.4 / 42.2 | 31.5 |

churchLit's p50 is 22.9 above churchShade's (the bar 8). The spire's mean is 4.3 from churchLit's: the same blue-white
paint, its own source kept for its texture and its recipe (strokes along the shaft), not for a different colour.

## Tasks 1 to 4: the build

- `8934878` (18:26), Task 1, a Sonnet `builder` subagent on `feat/church-square-t1`, after one fix round
  (`C/briefs/builder-t1-r1.md`), merged `60de3ab` (18:27). The church's walls and gables paint from `churchLit` and
  `churchShade` by wall name (`litWalls: ['right']`, the design's mirrored tones), `wallSource` stays plaster for the
  openings and the step, the belfry and the spire from their own sources. The four sources take ID classes 10 to 13
  (`streetMaterial.ts`), one church class in `clad` (`cls` 10), and the colour checker's masks (255 exact, 188 at 180
  to 196). Three of the builder's choices accepted from its report (`C/t2/ledger.md`): the tones in three fields
  where the plan said one object, the class test's box margin 0.01, a third `ids` program pin
  (`street-grass-shader.test.ts`, `8c42ee526742c477`).
- Task 2, the ledger (`C/t2/ledger.md`, 18:24): the recipes at full cover put the street at 631,507 triangles (the
  church 1,393 ribbons, about 50 triangles each). The four covers halved (1.75 / 1.75 / 3 / 1.75): street 600,275,
  church 781 ribbons. The synthetic fixture's bound in `street-build.test.ts` became 644,605 (its base 639,524 plus
  the design's church allowance 5,081), said in the test's comment and the ledger. The look passes then moved cover
  between the four within Codex F10's bound of 600,900 (below).
- `d730252` (18:30), Task 3, a Sonnet `builder` on `feat/church-square-t3`, merged `89e6908` (18:34). The two
  flanking trees stand against the nave: `orchard-lower` at map (666, 181), `olive-right` at (308, 184), from the
  search in `C/t0/tree-search.log`. The gaps from the nave's rectangle to each crown's reach: 0.049 (was 0.225) and
  0.048 (was 0.176). The layout test's floor 0.025 for these two. The distance test (`street-church.test.ts`): 2 eyes
  (stops 3 and 4), 101 targets (the door, 3 × 25 window samples, the peak), 108,096 tree triangles, 39,984 boxed
  pairs, the sway's bound `0.06 · y² · √1.36`, segment-to-triangle distance with a zero-area guard (three's
  `Triangle.closestPointToPoint` returns NaN there). The least margin 0.122, on a pair that is the same before and
  after the move. 0.3 s in the suite.
- `1056cd9` (18:38), Task 4, Gemini 4 Argon in `w4:p5` on `feat/church-square-t4` from revision 1 with a
  continuation brief for revision 2 (`C/briefs/builder-t4-r1.md`), merged `1e3da3d` (18:46). Six clumps of the
  grass's blades at half scale on a ring of radius 0.03 round the square lamp's foot, 2 to 4 heads a clump
  (`stoneDab`, 0.0035 wide) in the stars' palette colours more than 5 Lab from the lit window's underpaint: 45
  blades, 19 heads, 872 triangles (the reservation 1,100), appended last to the street's strokes with class and
  source 255. `WANDER.ring` 0.06 keeps the wanderers off it, the witness test's 12 ring points found standable with
  the ring at the post's radius (9 of 12, 0 with the ring). The mutant (the `append` commented out) fails the test on
  the triangles' count (`C/t4/mutant.log`). `flowers: false` is the base byte for byte: the K2 fixtures' pin
  `918dd24d40740805` holds with the flag off, and the full build's flag-off pin moved from `5492d517c80ba56e` (Task
  4's base) to `46f2bc6ba04296ab` (the branch with Tasks 1 and 3). The Lead's gate of the branch: the diff read, the
  suite run (482 pass), tsc and lint clean (`C/t4/lead-*.log`).

The look at the ring (`C/t5/p5/desktop-t0.84.png`, its crops `ring-t084-1x.png` and `ring-t084-3x.png`): a tuft of
small blades round the lamp's foot in its pool, pale heads at the tips, quiet. At stop 4 the foot is under the frame's
bottom and the dock. One read, no retune. On the fix `e29bc36` (below) the heads sit in front of their blades
(`C/t6/fix/ring-fix-3x.png`, the phone `ring-phone-4x.png`): small pale marks at the tips, clearer than before.

## Task 5: the look passes (the Lead, `C/t5/looks.md`)

The measure: `C/tools/church-l.mjs`, the L p10 / p50 / p90 of the lit frame's pixels under each source's ID mask
(`ids=2`), against the source's own p50 in the scan. The design's bar: the moonlit wall and the gable within 4.

| Pass | What moved | churchLit p50 (target 49.7) | churchShade p50 (target 26.8) |
| --- | --- | ---: | ---: |
| 1 | the build as merged, cover 0.5 | 37.1 | 20.1 |
| 2 | the corner term exempt for the two tones, `CHURCH_LIGHT.ambient` 0.81 | 41.5 | 20.7 |
| 3 | churchLit width [0.11, 0.13] cover 2.5, churchShade width [0.095, 0.11] cover 2.2, spire 2.5, belfry 1.25 | 42.3 | 21.8 |
| 4 | the ground term exempt for the two tones (P7) | 48.1 | 24.2 |

Stop 4 desktop. The phone within 0.4 of each. The spire 48.6 (target 48.9), the belfry 14.7 (14.4) from pass 1 on.

Where the darkness came from (`C/church-vertex-l.mjs`, the baked vertex colours): `wallShade`'s ground term is 0.5 at
a wall's foot and 1 at half height. The strokes' vertices are spread over the wall (mean shade about 0.83), but the
underpaint is one quad whose foot vertices take 0.5, so it is darker than the strokes everywhere, and the stroke
body's rim, rake and dry brush open the strokes over it. Every house has the same foot shadow. The painting's church
has none. The design's levers (the ambient, the corner term, the recipes, the cover) reached 42.3 by pass 3, and a
fourth pass on them would have moved under 1 L.

Two probes at stop 4 for Mark's decision, captured and reverted:

- **B, the painting's own sides** (`C/t5/probe-B/church-s4.png`): `litWalls: ['front', 'front gable']`. The front
  39.2 (−10.5): at light 0.81 the front cannot reach its source. The composition is the painting's (the white front,
  the blue side). The design's call 1 (mirrored) stands unless Mark prefers this crop.
- **C, no foot shadow on the church** (`C/t5/probe-C/church-s4.png`): the ground term exempt for the two tones, by
  source, one line in `streetLight.ts`. 48.1 and 24.2: inside the bar. The houses keep their shadow.

Pass 4 keeps probe C as departure P7 (plan revision 4). The crops side by side for Mark: `C/t5/p1/church-s4-before.png`
(the plaster church), `C/t5/p3/church-s4.png` (the design's levers, without), `C/t5/probe-C/church-s4.png` (with), the
painting's `scratch/street-church-2026-10-25/t0/painting-church-2x.png`. Four passes of four used.

## Task 6: the gate (the Lead, `C/t6/`)

On `1e3da3d` (`C/t6/gate.sh`, 18:50 to 19:06, `summary.txt`): `tsc`, lint, 482 of 482 tests, the build hash
`def9abf04acfe8dd` at 600,179 triangles, the grass hash `33504d291c27e9ac` unchanged from the wander's gate (240
chunks, 14,986 blades: the trees' move touched no grass), the six browser checks one at a time on port 5213 (the walk
13 cases, the portal 20, the grass 19, the rotation, the cypress hang, reduced motion), the sweep's worst point
1,433,053 at `t` 0.26 on the desktop (the ceiling 1,444,930, the wander's 1,429,793 plus the street's 3,260), the
production build.

The colour gate (`C/t6/colour.sh`, 19:06 to 19:09, `t6/colour/`): stops 0 to 4, both viewports, `light=0`, the
classes with the church's own class. Then stops 3 and 4 lit, the four sources against their own rectangles. The
church class passes where the church is near: stop 3 (5.95) and stop 4 (3.04) on the desktop. The failures are the
baseline's. The walls read 11.6 at stop 0 and the roofs 11.0 and 11.35 at stop 1. The fog's and the smock's areas
fall short on the phone. The walls read 10.79 at stop 4 on the desktop, where K3 and V1 read 19.5 before the church
left the walls class. The church class fails only where it is a sliver or far. Its areas are 110, 80 and 7 px at
stops 0 and 2. At stop 1 it reads 15.1, where the fog's blue takes it, as it takes the roofs. The four sources at stop 4: churchLit 0.91, churchShade 1.27, spire
3.37 (the belfry 588 px, under the area floor), the phone the same verdicts. At stop 3 churchShade fails at 21.9
(L 44.8 against 26.8) on both viewports, and `wallB` at 15.0. Not the paint and not the fog (`C/t6/halo-probe.mjs`,
`halo-probe.log`): the front's columns by screen x read L 54, 55, 41, 26 from left to right. The lamp at `t` 0.65
stands between stop 3's camera and the church's front, and its halo sprite lifts the front's left half by about 30 L.
The column outside the halo reads 26, against the source's 26.8 and stop 4's 24.

The ID frames at stops 3 and 4, both viewports (`t6/colour/ids-s{3,4}-*-t5.png`): no tree class over the door, the
three windows or the gable's peak (Step 4, Task 3's probe held).

Perf (`C/t6/perf.sh`, 19:09 to 19:15, `t6/perf/summary.txt`, Codex's probe finished before it started): five rounds at
stops 0 and 3, dpr 1.5, `capture-diorama.mjs --perf` (desktop final, desktop nopost, the phone viewport). p50 16.6 to
16.7 ms in every run. p95 at most 18.6 (stop 0 round 3 on the phone viewport, the desktop at most 18.4). Draw calls
321 at stop 0 and 166 at stop 3, unchanged. Triangles at stop 0 1,430,165 on the desktop, 1,424,331 on the phone.

On the fix `e29bc36` (`C/t6/fix/`, 19:15 to 19:16): the mutant (the old sign) fails the new assertion and nothing else
(1 of 26), `tsc`, lint, 482 pass, the build hash `69db1abe1f64b82b` at 600,179, the build, the ring's captures at
`t` 0.84 on both viewports. The fix moves 19 head centres by 0.0008 and changes no count, class or source, so the
browser checks, the sweep, the colour gate and the perf run stand on `1e3da3d`.

## Codex's branch review

Round 0 (`C/briefs/codex-branch-r0.md`, sent 18:52, the report `C/review/codex-branch-r0.md` at 19:09, REVISE): one P2. F1: the
heads' lift normal `(az, 0, −ax)` is the camera's forward, so every head sat 0.0004 behind its blade at stop 4 (its
probe: 19 of 19 biased away, the blade met first on every centre ray). The plan's Task 4 text carried the sign and
Argon built it as written. The heads showed only where they reach past the blades' cut edges, which is what the look
at `t` 0.84 saw. Fixed in `e29bc36`: the opposite normal, the report's `headCentres` and `headTips`, the test's depth
assertion (each head nearer stop 4's eye than its blade point by more than half the lift, which the old sign fails),
the plan at revision 5. Codex's other notes: the empty pool cannot happen at `headGap` 5 (two star colours 10.76
apart), left as is. `srgbToLab`'s copy in the checker, left as is. Two comments narrowed (the openings guard's, which
reads the strokes in the nave's box only, and `CHURCH_LIGHT`'s). The dispositions: `C/review/lead-branch-r0.md`.

Round 1, the bounded confirmation read (`C/briefs/codex-branch-r1.md`, sent 19:19, the report
`C/review/codex-branch-r1.md` at 19:27, REVISE): F1 closed (19 of 19 normals toward the eye, no centre ray blocked, a margin of 0.24 over the whole
authored yaw range), the comments closed, and one new P2: the depth guard read `centres[1]`, the point passed to
`stoneDab`, not the vertex it emitted, so a geometry-only control (the dab's centres shifted by minus twice the lift,
the report untouched) drew the heads behind the blades and passed. Fixed in the next commit: `headCentres` reads the
emitted middle-row centre vertex after the call. Two mutants alone with the test, the old sign and Codex's control,
each fail the assertion (`C/t6/fix2/mutant-sign.log`, `mutant-geometry.log`). The emitted geometry is unchanged, the
build hash `69db1abe1f64b82b` holds. The dispositions: `C/review/lead-branch-r1.md`.

Round 2, one question (`C/briefs/codex-branch-r2.md`, sent 19:31, the report `C/review/codex-branch-r2.md` at 19:37,
BUILD):
CLOSED. The reported centres equal the emitted vertex-4 positions in every variant, the current code passes all 19,
the old sign and the geometry-only control fail all 19 (head 0 at −0.00035, the same figure as the mutant logs), the
build hash `69db1abe1f64b82b` unchanged. The fix is `f1a3cf8`. Three rounds in all, the review's limit stated in its
own words: a closure for the planar emitter and the named controls, not for rendered visibility, which the captures on
the fix are for.

## For Mark at the gate

1. **P7, the church without a foot shadow.** The painting's church has none, and the bar could not be met with it.
   Reversible by one line (`streetLight.ts`, the `church` test in `wallShade`). The crops above.
2. **Probe B, the painting's own sides.** Call 1 (mirrored) is built. If the white front reads better to him, the
   change is `litWalls` in `church()`, and the front then reads 39 against 50 at this light.

**Mark's pass (22:10):** "Gate passed." on the preview, the shipped state. P7 stands: the church has no foot shadow.
Call 1's mirrored tones stand. The ring stays (his call 2 held it loosely, to go if it read as decoration). Probe B's
white front was not asked for. It stays open to his word, `litWalls` in `church()`. Mark merges #38. Slice 2 (the owl
and the moths) starts on this pass, as the design sequences it.
