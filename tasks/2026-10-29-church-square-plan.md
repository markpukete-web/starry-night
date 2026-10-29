# The church and its square, slice 1: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Revision 3 (2026-10-29, 18:45).** Codex's confirmation read of revision 2 (`review/codex-plan-r2.md`) closed five
of six and left F2 open: the church's `wallSource` was `churchLit`, so the retained face reached the door, the windows,
the reveals and the step as `churchLit`, and the `windows` guard did not see it (the dark openings' strokes are in
`strokes`). Now the church keeps `wallSource` `plaster`, the paint is a separate `paint` field, and the guard reads the
openings' own strokes. The class test skips the openings' vertices (`src` 255) in the nave's box.

**Revision 2 (2026-10-29, 18:15).** Codex's correctness read of revision 0 (`review/codex-plan-r0.md`, REVISE, F1 to
F10 and eight answers) is folded in "What revision 2 changed". Revision 1 had closed five of the ten (F1, F4, F6, F7,
F8). Five were open (F2, F3, F5, F9, F10), and two of the answers (6 and 7). Task 4 was building on Argon from revision
1 when this was written. F5 and answers 6 and 7 go to Argon as a fix round after its report. Task 1 builds from this
revision. Revision 1 is `c9b7f05` (the advisor's L1 to L8 and the Sonnet builder's A1 to A6, B1 to B9, C, D and E
folded, Task 0 done). Revision 0 is `78e8634`.

**Goal:** The church takes its paint from the painting's own church in two tones, the spire and the belfry take their
own, the two flanking trees stand close against the nave, and a ring of pale flowers stands in the square lamp's pool.

**Architecture:** Four new entries in `STREET_SOURCES`, each a rectangle of the scan, with their own stroke recipes
and ID classes. `buildHouse` paints a wall from the shape's shade source unless the shape names that wall as lit, so the
church's two tones are fixed by name. No light setting moves them and no other house changes. The belfry
and the spire name their sources where they are clad. The church's walls take their own class in the ID view, so the
gate reads them against the church's rectangles and the houses' walls stay the houses'. The trees move by two numbers
in `TREE_SPECS`, found by a search before the build. The flowers are built inside `buildStreet`, after the lamps, into
the street's `strokes` bucket: the grass's own blade function laid out by hand, and the heads as `stoneDab`s. No new
mesh, no new draw call, no change to the grass's chunks or the trail.

**Tech stack:** three.js, the street's builders (`clad`, `orientedFace`, `lightOf`, `stoneDab`, `pushDrapedRibbon`
from `brushForms.ts`, `append`), the grass's `clump`, `bladeVertex` and `bladeWidth`, `node --test`, the check
scripts, the craft tools in `scratch/village-craft-2026-10-25/tools/`. No new dependency.

**Spec:** `docs/superpowers/specs/2026-10-29-church-square-design.md`, Decisions (a) to (h) and "Mark's three
calls", with its Constraints and Anti-goals. Slice 2 (the owl and the moths) gets its own plan after this one ships.

## What revision 1 changed

| Finding | The answer | Where |
| --- | --- | --- |
| L1, A2: the canvas encodes the shader's 128/255 as 188. Revision 0's masks at 120 to 136 would match nothing, and the gate would pass on an empty mask | The ID colours are given as captured (188), matched at 180 to 196, in `knownSourcesIds` | Task 1 Interfaces, Step 5 |
| L2: `lightOf ≥ 0.9` holds only at ambient 0.8, and Task 5's lever at 0.7 would paint one tone while the test stayed green | The tone is the moon's own term: `churchTone` with the ambient zeroed, tested at 0.7 and 0.81 by name. Superseded by F9 in revision 2: by name | Task 1 Step 1, Step 4 |
| L3, B8: the default gate pools the church's class-0 pixels under the houses' walls reference; `churchLit` is 21.7 from it | The church's walls take `cls` 10 in the ID view, with their own reference | Task 1 Step 5 |
| L4, B3, E: no worktree has `reference/derived` or `node_modules`, so a builder's painting tests skip and read green | Two links in every worktree, named in the Session mapping, and a raw log that shows the tests ran | Session mapping |
| L5: the wander test's 12 points could fail on the disc's edge or the lane, not the ring | The test asserts each point is inside the disc and off the lane first. Superseded by answer 7 in revision 2: three of the 12 are outside the disc | Task 4 Step 1 |
| L6: "with `ids=2` and `light=0` dropped" read as both dropped | The `ids=2` pairs are captured lit, at stops 3 and 4 | Task 5 Step 1, Task 6 Step 3 |
| L7: the church's place on the painting was a guess | Task 0 Step 1 is done from `VILLAGE_PATCHES` | Task 0 |
| L8: two words for one action | One word, "check", at Task 6 Step 4 | Task 6 Step 4 |
| A1: the fractions are of `refHeight`. That is `CHURCH.stroke` 0.16 on every church face, not the wall's 0.24 | The recipe is written as fractions of 0.16 (`C/t0/recipe.md`) | Task 0 Step 4, Task 1 Interfaces |
| A3: "within 0.35 of the nave" and "of the belfry" overlap, and the gable's peak is above the belfry's top | The class test uses the oriented boxes: the nave's grown by 0.005 → 10 or 11, else the belfry's → 13 below its top and 12 above | Task 1 Step 1 |
| A4: revision 0's search order (nearest first) was not the design's (fewest pixels within 0.05) | The design's order is the pick. The other order is printed for the record | Task 0 Step 5 |
| A5: `DoubleSide`, the other two trees, the belfry's field names | Settled in the brief and the step | Task 0 Step 5 |
| A6: the blade's stroke coordinate, the roots' height, the heads' lift and order, `right`, the Lab helper | `0.5 + 0.5a`, roots at y 0.005, heads lifted 0.0004, centres from `a` 0.86 to the tip, `right = [−f.z, f.x]`, `srgbToLab` in `streetStrokes.ts` | Task 4 Step 3 |
| B1: `street-lived.test.ts` pins the build hash `5f3ea9c0e97f6e46` and the church's plaster ribbons 729; `street-lantern.test.ts` pins the ID program hashes | Each task re-pins what it changes and names the value in its commit. The Lead accepts at the gate. The plaster count becomes the church's own sources' bound | Global constraints, Tasks 1, 3, 4 |
| B2: rule 3 is 18 million triangle tests a candidate | Rules 1 and 2 first, then rule 3 lazily in the chosen order, stopping at the first pass | Task 0 Step 5 |
| B4: the rectangles' format | Done: `C/t0/sources.md` and the probe `C/tools/sources.mjs` take `name=x0,y0,x1,y1`, ends exclusive | Task 0 |
| B5: `painting` undefined in `street-build.test.ts`, `lab` takes 0 to 255, the options object, the triangle bound, the main report literal, `pushDrapedRibbon`'s module | The flowers' test lives in `street-lived.test.ts` (the real painting); the rest fixed | Task 4 Step 1, Step 3 |
| B6: `tree`, `reachOf`, `rectDistance` undefined; no skip needed | Defined in the step; `plainPainting()` | Task 3 Step 1 |
| B7: the gables are made inline; the door's jambs, lintel, step and panel read `front.source` | The gable face is pulled into a variable. The door's parts keep `plaster` (revision 2, F2) | Task 1 Step 4 |
| B9: 602,000 asserted on the synthetic build is loose | Asserted on the real painting's default build in `street-lived.test.ts` | Task 1 Step 1 |
| C: `WANDER.ring` as a literal; the 0.08 probe point | 0.06 literal; move the probe point, not the ring, if it fails | Task 4 |
| D: three of Task 1's five tests pass before the code; Task 3's cover test is a guard | Said at each step | Tasks 1, 3, 4 |

## What revision 2 changed

Codex's read is of revision 0. Its probes ran inline on the pinned sources, read-only.

| Finding | The answer | Where |
| --- | --- | --- |
| F1 (P2): the ID colours decode to 188, not 128, and the source mode's guard is `knownSourcesIds` | Closed by revision 1 (L1, A2). The decoder control Codex asks for is Task 6 Step 4's ID frames, which must show the four masks with area, and `church-l.mjs` matches 188 | — |
| F2 (P2): the swapped face reaches the door's panel, the side windows, the reveals, the step and the belfry's opening. The design's non-goal says they stay | The wall is clad from a copy of its face with the new source. `wallFaces` and the belfry's `opening` keep the plaster face. A guard pins the `windows` buffer's hash across Task 1 | Task 1 Step 1, Step 4 |
| F3 (P2): five rigid shifts are not a bound on a sway that moves each vertex by its own height and phase. Codex's triangle passes all five and hits at 2.26 s | Task 3's test keeps every line of sight farther from each crown triangle than its vertices can move. The measure is the segment-to-triangle distance, the bound 0.06 y² × 1.1662. Each rectangle is sampled 5 × 5 | Task 3 Step 1, P3 |
| F4 (P2): the copied `lab()` divides by 255, and `sourceUnderpaint` returns 0 to 1 | Closed by revision 1 (A6, B5): 0 to 255 in. Added: `srgbToLab` is checked against `palette.json`'s own Lab | Task 4 Step 1 |
| F5 (P2): the flowers' test passes with no geometry (Codex's report-only mutant) | The report's lengths, the triangle formula, the buffers' deltas and the appended vertices' heights are asserted | Task 4 Step 1 |
| F6 (P2): 602,000 asserted on the synthetic fixture, which is already 639,524 | Closed by revision 1 (B9): the real painting's default build | — |
| F7 (P2): `stroke.x = a` gives the blade a pointed root | Closed by revision 1 (A6): `0.5 + 0.5a` | — |
| F8 (P3): gap first, not fewest pixels, and the fallback | Closed by revision 1 (A4). The design's order picked (666, 181) and (308, 184), the two Codex's own search found. Both are within 0.05, so Task 3's bound stands as written | Task 0 Step 5 |
| F9 (P3): the back and the back gable read 1 at ambient 0.8. A light rule paints them lit, and the design lists them shade. Revision 1's moon-term rule did the same, and its test asserted the opposite | The tones are fixed by name: `litWalls: ['right']`, every other wall and gable from `shadeSource`. No light rule, so no lever moves them | Task 1 Interfaces, Step 1, Step 4, P5 |
| F10 (P3): no room for the flowers under 602,000 once Task 2 accepts 601,207 | Task 2 holds the church-only street at 600,900 | Task 2 |
| Answer 3: `DoubleSide` | Moot in a distance test: `intersectTriangle` with culling off | Task 3 Step 1 |
| Answer 6: `flowers: false` proves no byte identity | A guard pins the default build's hash with `flowers: false` to the base's, before and after | Task 4 Step 1, Step 5 |
| Answer 7: three of the 12 ring witnesses stand outside the square and were never standable | The witnesses are the points standable with the ring off (`WANDER.ring` set to `WANDER.post` in the test). At least 9 of 12 are, and none stands with it on | Task 4 Step 1 |
| Revision 3, Codex's confirmation read, point 1: F2 stayed open. `wallSource: 'churchLit'` built the retained face with `churchLit`, so the door's dark strokes changed colour while the `windows` hash held | `StreetShape.paint` carries the two tones and the lit walls. The church's `wallSource` stays `plaster`, so every retained consumer reads it. The guard is the openings' strokes (`cls` 255 in the nave's box) on the real painting, count and colour hash. The `windows` guard is dropped: it did not discriminate | Task 1 Interfaces, Step 1, Step 4 |
| Revision 3: the class test's box rule would fail on the openings', the reveals' and the step's vertices (`src` 255 inside the nave's box) | Inside the nave's box a vertex's `src` is 10, 11 or 255. Inside the belfry's, 13 or 255 below its top | Task 1 Step 1 |

## Where this plan departs from the design's text

Each is open to Mark at the gate.

| | The design says | The plan does | Why |
| --- | --- | --- | --- |
| P1 | (g) the flowers are "their own static mesh", and (n) slice 1 adds one draw call | The flowers go into the street's `strokes` bucket, built inside `buildStreet`. No new mesh, no new draw call | The design's reasons were the grass hash and the hand. The street's buckets take no trail and are not the grass's chunks, so both hold. One fewer mesh to plumb through `Street.tsx` |
| P2 | (g) about 350 triangles of blades | A blade is a ribbon of five rows and three columns, 16 triangles, as every street ribbon. The ring's bound is 1,100 triangles | The stroke body draws a three-column ribbon. Two columns would need a second geometry path |
| P3 | (f) "an ID-mask check in the plan" for the trees' cover | A distance test in `node --test` gates the move. Every line of sight to the door, the windows and the peak stays farther from each crown triangle than its vertices can sway. The ID frames at the gate check the rest once | A test runs on every build. A capture runs once. The sway (`LIFE.sway`, y² × 0.06 along x and 0.6 of that along z) deforms a crown, so a finite set of poses is not a bound (Codex F3) |
| P4 | (e) "the church record's measure takes the class as a parameter" and masks inside the church's box | The measure masks by the new classes alone, no box | No house uses the church's sources, so the mask is the church's |
| P5 | (b) the tones follow `lightOf` | The tones are fixed by name: the right wall `churchLit`, every other wall and gable `churchShade`, the list (b) gives | The tone is paint, not light. Under `CHURCH_LIGHT` the back faces read 1 (Codex F9). A light rule would paint them lit, against (b). They are hidden faces, clad at 0.25. The colour gate runs unlit |
| P6 | (a) each source "wider than the 10 × 21 px plaster patch" | `spire` is 10 × 130 and `belfry` 24 × 12: the shaft is 10 px wide and the band 12 px tall in the work painting | A wider rectangle leaves the painted church |

## Session mapping

Lead: Claude Fable `w4:p1`, in the worktree
`/private/tmp/claude-502/-Users-markma-Projects-starry-night/7b901d75-9d6a-49c2-8abd-525273745dfd/scratchpad/church-wt`
on `feat/church-square` (revision 1's head is named in each brief, off `555b6c0`, which is in `main`). Reviewer: Codex
`w4:p4`, Fable `w4:p6` when Codex is low. Builder: the `builder` subagent (Sonnet 5.5, effort high, its own worktree)
for Tasks 1, 3 and 4. Each builder brief names this plan, the task, the base commit and the branch, and the builder
switches to that branch first. The Lead does Task 0 (done but Step 6), Task 2, Task 5 and Task 6. Evidence goes to
`/Users/markma/Projects/starry-night/scratch/church-animals-2026-10-29/` (below, `C/`), one folder per task, read by
absolute path from any worktree. Builders never push, install or open a PR. One browser check runs at a time, and each
needs its vite server (`DIORAMA_CAPTURE_URL`).

**Every worktree needs two links before any test runs**, because `reference/derived/` is gitignored and a bare
worktree has no `node_modules`: `ln -s /Users/markma/Projects/starry-night/reference/derived <worktree>/reference/derived`
and `ln -s /Users/markma/Projects/starry-night/node_modules <worktree>/node_modules`. Both are ignored by git. A
builder's raw test log must show the painting tests ran, not skipped (`street-lived.test.ts`, `street-trees.test.ts`,
`street-grass.test.ts` say "needs reference/derived" when they skip).

## Global constraints

- Every colour comes from a rectangle of the scan: `STREET_SOURCES` in painting px (1600 × 1267), or `palette.json`.
- Each source's rendered mean is within ΔE76 10 of its own rectangle's mean (`check-street-colour.ts --sources`), and
  each class within 10 of its reference in the default run.
- The church at most 1,600 ribbons. The street at most 602,000 triangles. The walk's worst sampled point at most
  1,444,930 (today 1,429,793 at `t` 0.26). 60 fps at stops 0 and 3 at dpr 1.5, p95 at most 18.6 ms.
- `?light=0` builds the street unlit and both tones still show. `prefers-reduced-motion` is a still state: nothing in
  this slice moves.
- The grass's chunk hash `def5470cc15817ba` (`scripts/street-lane.test.ts`) does not change.
- The pins that do change, and who re-pins them: `scripts/street-lived.test.ts` pins the build hash `5f3ea9c0e97f6e46`
  for `{ grass: true, lived: false }` (lines 471 and 875) and the church's plaster ribbons 729 (line 865);
  `scripts/street-lantern.test.ts` pins the `ids` program hashes of the ground and grass-base materials
  (`94d1b777fcef5990`, `bf524cfd151ff427`, lines 10 and 11, compiled with `ids: true`, so `idInjection`'s text is in
  them). A task that changes one re-pins it from the failing run's output and names the old and new values in its
  commit message. The Lead reads the diff at the gate. Task 1 changes the build hash, the ribbons and the lantern's
  two hashes. Task 3 changes the build hash. Task 4 changes it again, and the Tunables' "`lived: false` builds K2's
  street byte for byte" now needs `flowers: false` too.
- The retune cap: four look passes. The Lead's levers are named in Task 5 and nothing else is lifted by hand.
- No new dependency. British English. Conventional commits, each ending with
  `Claude-Session: https://claude.ai/code/session_016dU6Fh8H7N6GoFycno2Cvd`.
- Claude does not edit The bar, Gates, Out of scope or the acceptance criteria.

## Review focus

Five inputs the design implies and no decision names. Each has its test in the task that owns the code.

1. `?light=0`: the church's two tones must still show, or the colour gate (which runs unlit) reads one tone and the
   lit build another. Task 1, "the tones do not depend on the light flag" (a guard: it passes before the code too).
2. The flat panel (`buildFlatPanel`, the diorama's village) has no lane and no lamps. The flowers must not build there,
   and `lamps[6]` must not be read when the lane is off. Task 4, the flowers' test.
3. The trees sway (`LIFE.sway`): a crown that clears a window at rest can cover its edge in the wind. Task 3's test
   keeps every line of sight farther from each crown triangle than its vertices can sway.
4. The wander: Vincent may not stand in the ring. `keptOff` keeps him `WANDER.post` (0.015) from every lamp's post,
   less than the ring's 0.03. Task 4 adds the ring to `keptOff`, for the square's lamp alone.
5. The ID views: a church stroke's `src` is 10 to 13 now and its `cls` 10. The gate's `plaster` mask must not count
   the church, the `walls` class must not either, and the build test's range check must accept the new numbers and
   refuse 14. Task 1's build test.

---

### Task 0: the facts (Steps 1 to 4 done by the Lead; Step 5 a builder's probe, running)

**Files:** `C/t0/sources.md`, `C/t0/sources.log`, `C/t0/sources.png` and the picks `pick-1..3.png`, `C/tools/sources.mjs`,
`C/t0/recipe.md` with the scan crops `scan-front.png`, `scan-side.png`, `scan-shaft.png`; `C/tools/tree-search.mjs`,
`C/t0/tree-search.log`, `C/t0/baseline.md`.

**Interfaces:**
- Produces: the four rectangles, the four recipes and the two tree positions, copied into Task 1 and Task 3.

- [x] **Step 1 (the Lead): the four rectangles.** Picked at 6× and 8× on `reference/derived/_work-painting.png`
  from `VILLAGE_PATCHES.churchPlaster` [884–896, 1082–1110] and `spire` [902–916, 819–995]: `churchLit`
  [886, 1050, 906, 1072] on the front gable's pale face, `churchShade` [936, 1056, 954, 1094] on the right wall's
  blue-and-white verticals, `spire` [904, 860, 914, 990] down the shaft, `belfry` [898, 1000, 922, 1012] on the dark
  band at the shaft's foot. The first `churchLit` candidate landed on the left gable's dark foot (L 24) and was
  rejected (`pick-1.png`).
- [x] **Step 2 (the Lead): `C/tools/sources.mjs`**, `--rect name=x0,y0,x1,y1`, ends exclusive, percentile
  `sorted[floor((n − 1) q)]`, mean Lab the mean of per-pixel Lab as the checker's `meanLab`. The table in
  `C/t0/sources.md`: `churchLit` L p10 / p50 / p90 42.9 / 49.7 / 56.1, mean Lab [49.0, −3.0, −11.2]; `churchShade`
  6.2 / 26.8 / 46.6, [26.9, 1.6, −12.3]; `spire` 28.3 / 48.9 / 57.1, [45.7, −0.5, −12.1]; `belfry` 6.2 / 14.4 / 42.2,
  [19.1, 2.4, −8.7]. ΔE: `churchLit` to `churchShade` 22.6, to `spire` 4.3, to `belfry` 30.5; `churchLit` to the
  pooled walls reference 21.7, `churchShade` 7.0.
- [x] **Step 3 (the Lead): the checks.** `churchLit`'s p50 is 22.9 above `churchShade`'s (the bar 8). `belfry`'s
  14.4 is under `churchShade`'s 26.8. The spire's mean is 4.3 from `churchLit`'s, under revision 0's 5: the two are the
  same blue-white paint, and the spire keeps its own source for its texture (L p10 28 to p90 57 along 130 px) and its
  recipe (strokes along the length), not for a different colour. The 5 is dropped.
- [x] **Step 4 (the Lead): the recipe at 1:1** (`C/t0/recipe.md`): the scan is 2.4 × the work painting (`sips -Z
  1600`, no crop), 1 scan px is 0.0015 world at the nave (the eave 0.24 over 160 px) and 0.0016 on the shaft. Ten
  strokes a face read by eye on 3× crops, as S1's task 1 did. The fractions are of the brush `CHURCH.stroke` 0.16,
  which is every church face's `refHeight` (A1), not of the wall:
  `churchLit` width [0.08, 0.13], length [0.33, 0.8], axis [0.15, 0.99] (a 9° lean), blend 0.75, cover 3.5;
  `churchShade` width [0.075, 0.11], length [0.42, 0.85], axis [0, 1], blend 0.75, cover 3.5;
  `spire` width [0.05, 0.09], length [0.7, 1.9], axis [0, 1], blend 0.9, cover 6;
  `belfry` width [0.08, 0.13], length [0.28, 0.47], axis [1, 0], blend 0.75, cover 3.5.
- [x] **Step 5 (builder, done, `C/t0/tree-search.log`): `C/tools/tree-search.mjs`** by the brief `C/briefs/builder-tree-search-r0.md`:
  the probe's loader with the worktree from `argv[2]` and the painting by absolute path; each tree's vertex offsets
  and flat reach from one build; every whole map pixel within 100 px (Chebyshev) of today's; rule 1 (0.025 clear of
  the nave's, the belfry's and every house's oriented box, `rectDistance − reach`), rule 2 (0.02 clear of the other
  crowns and the cypress, 0.1 clear of every station camera, the tree's side kept, inside the dome), rule 3 (the
  cover: rays from stops 3 and 4 on both viewports to the door panel's corners and centre, each window's corners and
  centre, and the gable's peak, against a `DoubleSide` mesh of the candidate's crown at rest and shifted by
  (±0.0125, 0, 0) and (0, 0, ±0.0075), the other two trees tested at their places). Rules 1 and 2 first, then rule 3
  lazily in the design's order: among survivors with a gap of at most 0.05, the fewest pixels moved, then the smallest
  gap; the first to pass rule 3 is the pick. The other order (the smallest gap first) is printed for the record. If no
  survivor is within 0.05, the log says so and gives the smallest gap reached.
  The result (0.8 s: rule 3 passed on the first candidate of each order): `orchard-lower` today map (721, 236), gap
  0.225, reach 0.240; the design's pick (666, 181), world (0.139, −2.498), gap 0.049, 55 px moved, R5 clear by 0.128;
  the other order's (666, 158) at gap 0.025. `olive-right` today (266, 226), gap 0.176, reach 0.236; the design's pick
  (308, 184), world (−0.715, −2.401), gap 0.048, 42 px moved, L5 clear by 0.111; the other order's (315, 168) at 0.025.
  No cover hits for any pick, nor from the other two trees. Rules 1 and 2 left 17,739 and 18,871 of 40,401 candidates
  (rule 2 removed none: the window is far from the cameras, the cypress and the dome's edge).
- [x] **Step 6 (the Lead): read the log.** The design's picks go into Task 3. `C/t0/baseline.md` holds the baseline
  too: the church's ribbons 872, the street's triangles 596,919, the build hash `5f3ea9c0e97f6e46`, the sweep's worst
  point 1,429,793 at `t` 0.26 (the wander's gate), stop 4's plaster L 31.6 / 43.7 / 57.8 (the church record), today's
  captures `C/look0/`. The ring's ground: none of 64 samples on the ring lies in the grass's footprint
  (`C/review/probe-design-r0.log`, `ringSamplesInGrass`), so the grass hash is safe. Codex's F3: rule 3's five poses
  are not a bound on the sway. Task 3's test is the bound. If a pick fails it, the search runs again with that test as
  rule 3.
- [ ] **Step 7: commit the plan** with the positions filled in:
  `git commit -m "docs(church): slice 1's facts, the sources picked and the trees' positions found"`.

### Task 1: the church's sources, classes and tones (builder)

**Files:**
- Modify: `src/scene/streetStrokes.ts` (`STREET_SOURCES`, `SOURCE_STROKES`), `src/scene/streetGeometry.ts`
  (`SOURCE_CLASSES`, `StreetShape`, `buildHouse`, `church`, `clad`'s `cls`), `src/scene/streetMaterial.ts`
  (`idInjection`), `scripts/check-street-colour.ts` (the `--sources` tables, the default `CLASSES`),
  `scripts/street-build.test.ts` (the class test), `scripts/street-lived.test.ts` (the pins, the bounds),
  `scripts/street-lantern.test.ts` (the pins, if they move).
- Test: `scripts/street-church.test.ts`.

**Interfaces:**
- Produces, in `STREET_SOURCES`: `churchLit: [886, 1050, 906, 1072]`, `churchShade: [936, 1056, 954, 1094]`,
  `spire: [904, 860, 914, 990]`, `belfry: [898, 1000, 922, 1012]`. In `SOURCE_STROKES`:
  `churchLit: { width: [0.08, 0.13], length: [0.33, 0.8], axis: [0.15, 0.99], blend: 0.75, cover: 3.5 }`,
  `churchShade: { width: [0.075, 0.11], length: [0.42, 0.85], axis: [0, 1], blend: 0.75, cover: 3.5 }`,
  `spire: { width: [0.05, 0.09], length: [0.7, 1.9], axis: [0, 1], blend: 0.9, cover: 6 }`,
  `belfry: { width: [0.08, 0.13], length: [0.28, 0.47], axis: [1, 0], blend: 0.75, cover: 3.5 }`.
  `SOURCE_CLASSES`: `churchLit: 10, churchShade: 11, spire: 12, belfry: 13`.
  `StreetShape.paint?: { lit: StreetSourceName; shade: StreetSourceName; litWalls: string[] }`: when set, a wall or
  gable named in `litWalls` is clad from `lit`, every other one from `shade`. `wallSource` stays what the retained
  face reads (the church: `plaster`, as today). No light rule: Codex's probe read the back and the back gable at 1
  under `CHURCH_LIGHT`, so any light rule paints them lit, and the design lists them shade.
  The `cls` of a face whose source is one of the four: 10. The ID colours in the shader, 10 → (1, 128/255, 128/255),
  11 → (128/255, 1, 1), 12 → (1, 128/255, 1), 13 → (128/255, 128/255, 1), which the canvas captures as (255, 188, 188),
  (188, 255, 255), (255, 188, 255), (188, 188, 255). The report's faces carry `source` already.

- [ ] **Step 1: the failing tests**, in `scripts/street-church.test.ts`. The first two fail before the code. The
  other three pass today and stand as guards.

```ts
test("the church's walls are painted by name: the right wall lit, the rest shade", () => {
  const nave = churchFaces.filter((f) => f.owner === 'church' && !f.name.endsWith('roof'))
  const byName = (n: string) => nave.find((f) => f.name === n)!
  assert.equal(byName('right').source, 'churchLit')
  for (const n of ['front gable', 'back', 'left', 'back gable']) assert.equal(byName(n).source, 'churchShade', n)
  for (const n of nave.filter((f) => f.name.startsWith('front ') && f.name !== 'front gable')) assert.equal(n.source, 'churchShade', n.name)
})
test('the belfry takes belfry and the spire takes spire', () => {
  for (const f of churchFaces.filter((f) => f.owner === 'belfry')) assert.equal(f.source, 'belfry')
  for (const f of churchFaces.filter((f) => f.owner === 'spire')) assert.equal(f.source, 'spire')
})
test('no house uses a church source', () => { /* guard */
  for (const f of build.report.faces.filter((f) => f.owner.startsWith('house-')))
    assert.ok(!['churchLit', 'churchShade', 'spire', 'belfry'].includes(f.source), `${f.owner} ${f.name}`)
})
test('the tones do not depend on the light flag', () => { /* guard */
  const unlit = buildStreet(plainPainting(), flow, masses, { lit: false })!
  const srcOf = (b: typeof unlit) => b.report.faces.filter((f) => ['church', 'belfry', 'spire'].includes(f.owner)).map((f) => f.source)
  assert.deepEqual(srcOf(unlit), srcOf(build))
})
```

  In `scripts/street-lived.test.ts`, a guard for the design's non-goal (F2), on the real painting's default build: the
  church's openings are the `strokes` vertices with `cls` 255 inside the nave's oriented box grown by 0.005 (the door's
  panel and the three side windows, traced from the retained face's `plaster`). Their count, and
  `createHash('sha256').update(JSON.stringify(<their colours, three floats each, in vertex order>)).digest('hex').slice(0, 16)`,
  equal the values computed at the base commit and named in the test. It passes before the code and after it. A
  vertex is inside the box when, with `dx = x − nave.x`, `dz = z − nave.z`, `u = dx cos(yaw) + dz sin(yaw)` and
  `v = −dx sin(yaw) + dz cos(yaw)`, `|u| ≤ w / 2 + 0.005` and `|v| ≤ d / 2 + 0.005` (`STREET_CHURCH.nave`).
  In `scripts/street-build.test.ts`, the test "every vertex of underpaint and strokes has a source class, and the
  church is plaster" becomes "…and the church is its own", and fails before the code on the church's `src`. The range
  check accepts `0..6`, `10..13` and `255`, and refuses 14. A stroke or underpaint vertex is the church's when it lies
  inside the nave's oriented box grown by 0.005 (then its `src` is 10 or 11 with `cls` 10, or 255: an opening, a
  reveal or the step) or inside the belfry's square grown by 0.005 (then `src` 13 with `cls` 10 or 255 below
  `belfry.topY − ground`, `src` 12 with `cls` 10 above). The
  plaster houses' strokes stay `src` 2, `cls` 0. The nave's box: `STREET_CHURCH.nave`'s `x, z, yaw, w, d`; the
  belfry's: `cx, cz, yaw, width`; the ground `islandHeightAt(VILLAGE_CHURCH.belfry.cx, VILLAGE_CHURCH.belfry.cz)`.
  In `scripts/street-lived.test.ts`, line 865's `churchPlasterRibbons` 729 becomes the church's own sources' ribbons,
  at most 1,600, and the default build's `counts.triangles` at most 602,000 (both on the real painting).

- [ ] **Step 2: run them.** `node --test scripts/street-church.test.ts scripts/street-build.test.ts
  scripts/street-lived.test.ts`. Expected: the tones test and the belfry test fail (`churchLit` is not a source), the
  class test fails on `src` 2, the ribbons test on 0. The openings' guard passes.

- [ ] **Step 3: the sources.** The four rectangles and recipes from the Interfaces, with a one-line comment each
  naming `C/t0/sources.md` and `recipe.md`. `SOURCE_CLASSES` gains the four numbers (TypeScript requires both).

- [ ] **Step 4: the tones.** `StreetShape` gains `paint?`. In `buildHouse`, each of the four wall faces and the two
  gable faces is made by `orientedFace` into a variable before it is clad (the gables are inline today, B7). Then
  `const painted = shape.paint ? { ...face, source: shape.paint.litWalls.includes(name) ? shape.paint.lit :
  shape.paint.shade } : face`, and `clad` or `cladRound` takes `painted`. `wallFaces` keeps `face`, whose source is
  `wallSource`, so `recessedDoor`, the front `opening`, the side windows and the step read `plaster` as today (F2, the
  design's non-goal). `church()` keeps `wallSource: wallSource(nave.wall, 100)` and adds `paint: { lit: 'churchLit',
  shade: 'churchShade', litWalls: ['right'] }`. The belfry: `clad` takes `{ ...face, source: 'belfry' }` and `opening`
  keeps `face`. The spire's faces take `source: 'spire'`. In `clad`, `cls` is 10 when the face's source is one of the
  four, else as today. The report's face is the one `clad` receives, so the tones test reads the painted source.

- [ ] **Step 5: the ID colours.** `idInjection` gains the four lines for 10 to 13 (the shader values above). In
  `check-street-colour.ts`: the `--sources` mode's `maskIndices` and `SOURCES` gain the four, each `ref` from
  `meanLab(rectLabs(workPainting, STREET_SOURCES.<name>))`, matched with the 255 channels exact and the 188 channels at
  180 to 196, as the thatch's; `knownSourcesIds` gains the four captured colours. The default mode's `CLASSES` gains
  `church: { idR: 255, idG: 188, idB: 188, minArea: 500, ref: refChurch, diag: null }` with `refChurch` the mean Lab of
  `churchLit`'s and `churchShade`'s texels pooled, matched at 180 to 196 on g and b; `knownClassesIds` gains
  `'255,188,188'`.

- [ ] **Step 6: run the suite.** `npm run -s test:sky`. Expected: every test passes but the pins in Global
  constraints: `street-lived.test.ts`'s build hash (two lines) and `street-lantern.test.ts`'s two `ids` program hashes.
  `npx tsc -b` clean.

- [ ] **Step 7: re-pin.** The new values from the failing output into those lines. Run `npm run -s test:sky` again.
  Expected: all pass. The raw log shows `street-lived` and `street-trees` ran.

- [ ] **Step 8: commit.** `git add` the files above and `git commit -m "feat(church): the church's paint from its own
  sources, two tones by name, the spire and belfry their own"` with the old and new pins in the body.

### Task 2: the ledger (the Lead)

**Files:** `C/t2/ledger.md`.

- [ ] **Step 1:** build on Task 1's commit: the church's ribbons by owner, the street's triangles, the build hash
  (`scratch/village-craft-2026-10-25/tools/build-hash.ts`). The bounds: 1,600 ribbons, and 600,900 triangles before
  the flowers (602,000 less Task 4's cap of 1,100, Codex F10).
- [ ] **Step 2:** if either is over, lower `cover` on `churchLit` and `churchShade` in `SOURCE_STROKES` (3.5 toward
  2.5) until both hold, and record each value tried. `KEPT_PAINT` is not touched: the flat panel shares it.
- [ ] **Step 3:** capture stops 3 and 4, both viewports (`C/look0/capture.mjs` with its output folder set to `C/t2/`).
  Read them 1:1 beside `scratch/street-church-2026-10-25/t0/painting-church-2x.png`. Write what looks wrong in
  `C/t2/ledger.md`, the door's parts in `churchShade` among the things to judge. This read is look pass 1 of four.
- [ ] **Step 4:** commit any `cover` change with its re-pinned hash:
  `git commit -m "feat(church): the church's cover held to the ledger's bound"`.

### Task 3: the trees close in (builder)

**Files:**
- Modify: `src/scene/streetLayout.ts` (`TREE_SPECS`, two entries), `scripts/street-layout.test.ts` (the overlap test's
  margin for the two trees against the nave), `scripts/street-lived.test.ts` (the build hash pin).
- Test: `scripts/street-church.test.ts`.

**Interfaces:**
- Consumes: the two positions from Task 0 Step 6: `orchard-lower` at map (666, 181), `olive-right` at (308, 184),
  their gaps to the nave 0.049 and 0.048 (`C/t0/tree-search.log`).

- [ ] **Step 1: the tests**, in `scripts/street-church.test.ts`, on the file's `build` (`plainPainting()`: the trees'
  positions and shapes do not depend on the painting, B6). Define in the test: `rectDistance(x, z, box)` copied from
  `C/review/probe-design-r0.mjs`; `reachOf(id)` as the largest flat distance of a vertex of `build.trees.solid` and
  `build.trees.strokes` from its nearest tree's foot, for that tree; `treeOf(id)` from `STREET_TREES`. The first test
  fails before the move (the gaps are 0.225 and 0.176). The second is a guard: it passes before the move and must still
  pass after it.

```ts
test('the two flanking trees stand close against the nave and clear of it', () => {
  for (const id of ['orchard-lower', 'olive-right']) {
    const tree = treeOf(id)
    const gap = rectDistance(tree.x, tree.z, nave) - reachOf(id)
    assert.ok(gap >= 0.025 && gap <= 0.05, `${id}'s crown is ${gap.toFixed(4)} from the nave`)
  }
})
test('no crown reaches a line of sight to the door, a window or the gable peak from stops 3 and 4, in the wind', () => {
  for (const eye of eyes) for (const p of targets) for (const T of triangles) {
    const dT = Math.max(sway(T.a), sway(T.b), sway(T.c))
    if (!overlaps(segmentBox(eye, p), grow(triangleBox(T), dT))) continue
    assert.ok(segmentTriangleDistance(eye, p, T) > dT, `a crown triangle within ${dT.toFixed(4)} of a line of sight`)
  }
})
```

  The second test's parts, defined in the test file: `eyes` are `stationPose(3, false).position` and
  `stationPose(4, false).position` (the portrait eyes coincide). `targets` are the door panel's quad, each window's quad
  and the gable's peak as `C/tools/tree-search.mjs` lines 49 to 52 build them, each quad sampled 5 × 5 (corners
  included), the peak one point. `triangles` are every indexed triangle of `build.trees.solid` and `build.trees.strokes`,
  all three trees. `sway(v)` is `0.06 × max(v.y, 0)² × 1.1662`: the shader moves a vertex by at most `0.06 y²` along x
  and 0.6 of that along z (`streetLife.ts`, `swayInjection`), and a point of the triangle moves by at most the largest
  of its vertices' bounds. `segmentTriangleDistance(e, p, T)` is 0 when `new Ray(e, dir).intersectTriangle(a, b, c,
  false, hit)` returns a point within `|p − e|` of `e`, else the least of the three segment-to-edge distances (the
  closest points of two segments, clamped to both, Ericson 5.1.9) and the two endpoints' distances to the triangle
  (`new Triangle(a, b, c).closestPointToPoint`). The boxes are axis-aligned and cut the work to the triangles near a
  line. This is Codex's F3: a finite set of poses is not a bound, a distance is.

  If the moved trees fail the second test, do not move them: run `C/tools/tree-search.mjs` again with its rule 3
  replaced by this distance rule, and report the picks to the Lead. If Task 0's log shows no survivor within 0.05, the
  first test's upper bound is the logged gap plus 0.005, said in the commit.

- [ ] **Step 2: run them.** Expected: the first fails on both gaps, the second passes.
- [ ] **Step 3: move the trees.** The two `TREE_SPECS` entries take Task 0's positions, with a comment naming
  `C/t0/tree-search.log`. In `street-layout.test.ts`'s "houses and trees do not overlap", the circle-to-nave margin for
  these two trees is 0.025 (the rest stay 0.02).
- [ ] **Step 4: run the suite.** `npm run -s test:sky`. Expected: all pass but the build hash pin in
  `street-lived.test.ts`. Re-pin it, run again, all pass.
- [ ] **Step 5: commit.** `git commit -m "feat(church): the two flanking trees stand against the nave, as the
  painting's do"`, the old and new hash in the body.

### Task 4: the ring of flowers (builder)

**Files:**
- Modify: `src/scene/streetGeometry.ts` (`buildStreet`'s options gain `flowers = true`, a `flowers(ctx)` function
  called after the lamps inside the `if (lane)` block, the report gains `lane.flowers`, and both report literals, the
  main one and `buildFlatPanel`'s, initialise it `null`), `src/scene/streetStrokes.ts` (`srgbToLab`),
  `src/scene/streetLayout.ts` (`FLOWERS` beside `STREET_LAMPS`), `src/scene/streetWander.ts` (`WANDER.ring`,
  `keptOff`), `scripts/street-lived.test.ts` (the build hash pin, K2's byte-for-byte fixtures pass `flowers: false`).
- Test: `scripts/street-lived.test.ts` (the real painting), `scripts/street-wander.test.ts`.

**Interfaces:**
- Consumes: `clump(rand, painting, x, z, height): BladeSpec[]`, `bladeVertex(spec, a, across, right, widen)`,
  `bladeWidth(a)` and `GRASS_BLADE` from `grassBlade.ts`. `stoneDab(into, centres, across, width, colour, seed)` and
  `FaceStrokes` from `streetStrokes.ts`. `pushDrapedRibbon` from `brushForms.ts` (add it to the existing import).
  `append(ctx.strokes, from, 255, 255)` and `ctx.report.lane.lamps[6].foot` in `streetGeometry.ts`. `mulberry32` from
  `brush.ts`. `palette.json` imported as `palette.ts` imports it (`with { type: 'json' }`), its
  `regions.stars.colours[].hex` and `.lab`. `sourceUnderpaint(painting, 'windowLit', 1)` (sRGB 0 to 1).
- Produces: `FLOWERS = { radius: 0.03, clumps: 6, scale: 0.5, heads: [2, 4], headWidth: 0.0035, headGap: 5, rootY: 0.005, headLift: 0.0004 }`
  in `streetLayout.ts`. `report.lane.flowers: { centre: [number, number]; blades: number; heads: number; triangles:
  number; roots: [number, number][]; headColours: [number, number, number][] } | null`, the colours sRGB 0 to 255.
  `srgbToLab(r: number, g: number, b: number): [number, number, number]` in `streetStrokes.ts`, sRGB 0 to 255 in, the
  checker's formula. `WANDER.ring: 0.06` (the literal: the ring's 0.03 plus a clump's spread 0.012 plus a blade's
  0.018).

- [ ] **Step 1: the failing tests.** In `scripts/street-lived.test.ts`, on its real-painting default build (`build`)
  and the same options object for the comparison build:

```ts
test('a ring of flowers stands in the square lamp\'s pool, pale heads at the tips, and none without the lane', () => {
  const f = build.report.lane.flowers!
  const [lx, lz] = [build.report.lane.lamps[6].foot.x, build.report.lane.lamps[6].foot.z]
  assert.deepEqual(f.centre, [lx, lz])
  for (const [x, z] of f.roots) {
    const r = Math.hypot(x - lx, z - lz)
    assert.ok(r >= FLOWERS.radius - GRASS_BLADE.spread && r <= FLOWERS.radius + GRASS_BLADE.spread, `a root at ${r}`)
  }
  assert.equal(f.roots.length, f.blades)
  assert.equal(f.headColours.length, f.heads)
  assert.ok(f.blades >= 30 && f.blades <= 54 && f.heads >= 12 && f.heads <= 24)
  assert.equal(f.triangles, 16 * f.blades + 8 * f.heads)
  assert.ok(f.triangles <= 1100)
  const window = srgbToLab(...(sourceUnderpaint(painting, 'windowLit', 1).map((c) => c * 255) as [number, number, number]))
  for (const c of f.headColours) assert.ok(deltaE(srgbToLab(...c), window) > FLOWERS.headGap)   // deltaE: hypot of the three differences
  for (const c of palette.regions.stars.colours.slice(0, 3)) {                                   // the helper's units, against the palette's own Lab (F4)
    const rgb = [1, 3, 5].map((i) => parseInt(c.hex.slice(i, i + 2), 16)) as [number, number, number]
    assert.ok(deltaE(srgbToLab(...rgb), c.lab) < 1, c.hex)
  }
  assert.equal(buildStreet(painting, flow, masses, { ...OPTIONS, lane: false })!.report.lane.flowers, null)
  assert.equal(buildFlatPanel(painting, flow, masses)!.report.lane.flowers, null)
  const without = buildStreet(painting, flow, masses, { ...OPTIONS, flowers: false })!
  assert.equal(without.counts.triangles, build.counts.triangles - f.triangles)
  const [sa, wa] = [build.strokes.arrays, without.strokes.arrays]                               // F5: the geometry is there
  assert.equal(sa.indices.length - wa.indices.length, 3 * f.triangles)
  assert.equal(sa.positions.length - wa.positions.length, 3 * (15 * f.blades + 9 * f.heads))
  assert.deepEqual(sa.positions.slice(0, wa.positions.length), wa.positions)                    // the flowers are the bucket's tail
  const ys = sa.positions.filter((_, i) => i >= wa.positions.length && i % 3 === 1)
  assert.ok(Math.min(...ys) >= FLOWERS.rootY - 1e-9 && Math.max(...ys) <= FLOWERS.rootY + 0.03)
  assert.equal(computeBuildHash(without), '<the base's default-build hash>')                     // answer 6: the flag off is the base, byte for byte
})
```

  The last line's value: `computeBuildHash(buildStreet(realPainting, flow, masses, { grass: true }))` at the base
  commit, computed before any change (the helper hashes the buffers, not the report). The test passes `flowers: false`
  to a build that does not know the option yet, so this line fails before the code on the option, not the hash.

  And in `scripts/street-wander.test.ts`, no build needed. `!standable(foot)` passes today (the post). `WANDER.ring`
  drives it. A witness is a point on the ring that he could stand on without the ring (answer 7: three of the 12 are
  off the square and were never standable), so the test turns the ring off to find them. `WANDER` is a plain object
  and `keptOff` reads it live:

```ts
test('Vincent cannot stand in the ring of flowers, and can stand past it', () => {
  const foot = laneAt(STREET_LAMPS[6].t, STREET_LAMPS[6].lateral)
  assert.ok(!standable(foot.x, foot.z))
  assert.equal(WANDER.ring, 0.06)
  const points = Array.from({ length: 12 }, (_, k) => {
    const a = (k / 12) * 2 * Math.PI
    return [foot.x + 0.05 * Math.cos(a), foot.z + 0.05 * Math.sin(a)] as const
  })
  WANDER.ring = WANDER.post                                   // the ring off
  const witnesses = points.filter(([x, z]) => standable(x, z))
  WANDER.ring = 0.06
  assert.ok(witnesses.length >= 9, `${witnesses.length} of 12 points stand without the ring (9 today, Codex's table)`)
  for (const [x, z] of witnesses) assert.ok(!standable(x, z), `standable at ${x}, ${z}`)
  // one point 0.08 from the foot toward the square's centre: on the disc and off everything kept off. If this fails,
  // move the probe point, not the ring
  const toCentre = Math.atan2(STREET_SQUARE.z - foot.z, STREET_SQUARE.x - foot.x)
  assert.ok(standable(foot.x + 0.08 * Math.cos(toCentre), foot.z + 0.08 * Math.sin(toCentre)))
})
```

- [ ] **Step 2: run them.** Expected: fail, `flowers` is not in the report. The wander test fails on `WANDER.ring`.
- [ ] **Step 3: build the ring.** `flowers(ctx)`: `rand = mulberry32(0x7f10)`; `right = [−f.z, f.x]` where `f` is
  the unit of `target − position` of `stationPose(4, false)` on the ground; the six clump centres at angles
  `k / 6 × 2π + 0.3` on the ring about the lamp's foot; each `clump(rand, ctx.painting, x, z, FLOWERS.scale ×
  GRASS_BLADE.height)` with `halfWidth × FLOWERS.scale` as `plantChunks` does. Each blade: five rows at `a = j / 4`,
  three columns at `across` −`bladeWidth(a)`, 0, +`bladeWidth(a)`, through `bladeVertex(spec, a, across, right)`, the
  roots at y `FLOWERS.rootY` (the lamp's foot is at y 0, under the square's strokes); the colour `spec.colour` scaled by
  `mix(GRASS_BLADE.shade[0], GRASS_BLADE.shade[1], a)`; into a local `FaceStrokes` by `pushDrapedRibbon`, with `stroke`
  `(0.5 + 0.5 a, column / 2)` (the grass template's run, so the stroke body shapes the tip only) and the blade's `seed`
  per vertex. Heads: on the first `2 + floor(rand() × 3)` blades of each clump, a `stoneDab` of width
  `FLOWERS.headWidth`, its three centres at `a` 0.86, 0.93 and 1 (the tip last) by `bladeVertex` at `across` 0, each
  lifted `FLOWERS.headLift` along the blade plane's normal (`[az, 0, −ax]` of the blade's across direction), `across` the
  blade's own across vector at the tip; the colour one of the `stars` region's colours whose `.lab` is more than
  `FLOWERS.headGap` from `srgbToLab` of the `windowLit` mean, chosen by `rand`. `append(ctx.strokes, local, 255, 255)`.
  Fill the report. Call it last in `buildStreet`: after every other appender to `ctx.strokes` and before the counts
  are taken, guarded by `lane && flowers`, so the flowers' vertices are the bucket's tail, where the test reads them.
- [ ] **Step 4: the wander.** `WANDER` gains `ring: 0.06`. In `keptOff`, after the lamps' loop: the square's lamp
  (`STREET_LAMPS[6]`, its foot by `laneAt`) keeps him off within `WANDER.ring`. The other six lamps keep `WANDER.post`.
- [ ] **Step 5: run the suite.** `npm run -s test:sky`. Expected: all pass but the build hash pin, and the K2
  byte-for-byte fixtures until they pass `flowers: false`. Re-pin, run again, all pass. The grass hash is unchanged, and the default build with `flowers: false` still hashes
  to the base's value (the guard).
- [ ] **Step 6: commit.** `git commit -m "feat(church): a ring of pale flowers in the square lamp's pool"`, the pins
  in the body.

### Task 5: the look passes (the Lead, at most four, pass 1 is Task 2's read)

**Files:** `C/t5/p<n>/` per pass, `C/tools/church-l.mjs`, `C/t5/looks.md`.

**Levers**, and nothing else: `CHURCH_LIGHT.ambient` within 0.7 to 0.81; the church exempt from `wallShade`'s corner
term (`streetLight.ts:32`, a `face.source` test); the four recipes' `width`, `length`, `axis` within the measured
ranges in `C/t0/recipe.md`; `cover` within Task 2's bound; `FLOWERS.scale`, `.clumps`, `.headWidth`; the two tree
positions by a re-run of the search with a different closeness bound.

- [ ] **Step 1: `C/tools/church-l.mjs`.** Takes a full capture and its `ids=2` pair, both lit, at stop 4, captured as
  `scratch/village-craft-2026-10-25/tools/k2-colour.sh` captures (`capture-sky-frames.mjs`, `--times 5`, `--wait-for
  window.__streetReady`) with `&ids=2` in place of `&ids=1` and no `light=0`. For each of the four captured ID colours,
  the L p10 / p50 / p90 of the full frame's pixels under that mask. No box.
- [ ] **Step 2, each pass:** capture stops 3 and 4 on both viewports, lit and `ids=2`. Run the measure at stop 4. The
  target: the moonlit wall's L p50 within 4 of `churchLit`'s own p50 49.7, the gable's within 4 of `churchShade`'s 26.8.
  Crop the church 1:1 beside the painting's. Name what looks wrong, move one lever, say which, capture again.
- [ ] **Step 3:** write `C/t5/looks.md`: a table of passes, the levers moved, the L figures, and the two walls' light
  (the step kept: gable 0.8, moonlit 0.986 at ambient 0.8). Commit each kept lever:
  `git commit -m "feat(church): look pass <n>, <the lever>"`.
- [ ] **Step 4:** if the target is not met after four passes, stop and give Mark the four captures and the figures.

### Task 6: the gate (the Lead)

**Files:** `C/t6/gate.sh` (from `scratch/village-craft-2026-10-25/tools/k2-gate.sh`, the worktree and port changed),
`C/t6/colour.sh` (from `k2-colour.sh`), `tasks/2026-10-29-church-square.md`, `CLAUDE.md` (Tunables), `tasks/todo.md`,
`tasks/lessons.md`.

- [ ] **Step 1:** `npx tsc -b`, `npm run -s lint`, `npm run -s test:sky`, `npm run -s build`. Expected: all clean.
- [ ] **Step 2:** the six browser checks, one at a time, with vite on a fresh port: grass, walk, rotation, cypress-hang,
  portal, reduced motion. Expected: every case PASS.
- [ ] **Step 3:** the colour gate at stops 0 to 4, both viewports, `light=0` (`ids=1`, the church class among the
  classes); and `--sources` on `ids=2` pairs at stops 3 and 4, lit, so the four new sources read against their own
  rectangles. Expected: PASS, every ΔE76 under 10.
- [ ] **Step 4:** the ID frames at stops 3 and 4 (`ids=1`), both viewports: the door, the three windows and the gable's
  peak show no tree class (magenta) over them. Checks Task 3's probe again.
- [ ] **Step 5:** the triangle sweep (`tri-read.mjs`, `TS` as K2's list plus 0.26 and 0.9). Expected: the worst point
  at most 1,444,930. Perf at stops 0 and 3 at dpr 1.5 (`perf-street-grass.mjs`): p95 at most 18.6 ms. Draw calls at
  stop 0: 321, unchanged.
- [ ] **Step 6:** the build hash, the church's ribbons, the street's triangles, into the record
  `tasks/2026-10-29-church-square.md` with the before-and-after crops, Task 5's table and the tree move. The Tunables
  entry in `CLAUDE.md`. `tasks/todo.md`'s pickup. `tasks/lessons.md`. Commit:
  `git commit -m "docs(church): slice 1's record, the gate's runs"`.
- [ ] **Step 7:** the branch review by Codex (`w4:p4`, a brief file), fixes in one batch, then push and the PR with the
  session link, for Mark's pass on the preview. Slice 2's plan starts after his word.
