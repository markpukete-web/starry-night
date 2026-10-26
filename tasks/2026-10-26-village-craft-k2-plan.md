# The village's craft, K2 the lane: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Revision 1 (2026-10-26, evening).** Both plan reviews are folded in: the worker's buildability read (W01 to W11,
`E2/plan-build-worker.md`) and Codex's correctness read (F1 to F9, `E2/plan-review-codex.md`). The table below says where
each finding is answered. Revision 0 is `b7a5a4f`.

Mark approved the craft design ("go with your recommendation, start the plan"), so its Lead's calls stand unless a fact
below contradicts one. Four of this plan's decisions depart from the design's text, each for a fact the design did not
have: the walls' lateral (Decision (a)), no ink on the rail (Decision (c)), the lamps' count and places (Decision (d)),
and a halo held to a share of the screen near the camera (Decision (d2)). All four are open to Mark at the gate. K2's
build waits for Mark's pass of K1, which he reads on the preview of `feat/village-craft`.

**Goal:** The lane gets its furniture. Low dry-stone walls run along the verges where no house fronts the lane, one
wooden rail closes a cottage's front garden, and seven lamps lead the walk to the square.

**Architecture:** No new mesh in `Street.tsx`'s build. The walls, the rail and the lamps' posts and lanterns go into the
build's existing buckets (`underpaint`, `strokes`), so `Street.tsx`'s mesh list and the portal's disposal do not change.
The walls' places, the rail's cottage and the lamps' places are layout data in `streetLayout.ts`, beside `STEP`. A wall is
a swept box along the lane, its lane face and top clad in stone dabs: short draped ribbons of 8 triangles each, the stroke
shader's body, not `traceFace`'s ribbons. The grass's steps filter becomes a filter by a list of oriented rectangles, the
steps and the walls. The lamps' halos and pools join the lit windows' in `StreetLife`.

**Tech stack:** three.js, the street's builders (`polygon`, `append`, `pushDrapedRibbon`, `lightOf`, `shadeNew`), R3F
(`<sprite>`), `node --test`, the check scripts. No new dependency.

**Spec:** `docs/superpowers/specs/2026-10-25-village-craft-design.md`, "Low dry-stone walls", "The wooden rail" and
"Lamps", with its Constraints and Anti-goals.

## What revision 1 changed

| Finding | The answer | Where |
| --- | --- | --- |
| W01, F8 | `report.lane.lamps` everywhere | Decision (d), Task 3 |
| W02 | `LAMP_LIGHT.poolY` exported from `streetLife.ts`, read by `StreetLife` and the test. `SQUARE_TOP` exported from `frog.ts` | Decision (d), Task 3 |
| W03 | The station frame test's formula is written out | Decision (d), Task 3 |
| W04 | `stepClearings()` and `wallClearings()`, `streetClearings()` their concatenation | Decision (e) |
| W05 | A wall rectangle's origin, axes and bounds, as Codex's grass probe built them | Decision (e) |
| W06 | A run splits into `ceil(Δt / 0.02)` equal segments, for the geometry and the clearings | Decision (a) |
| W07 | The rail's lamp check moves to Task 3 | Tasks 2 and 3 |
| W08 | Each run reports its dabs and their vertex range in `strokes`, 9 vertices a dab | Decision (b), Task 1 |
| W09 | Each segment reports its 4 footprint corners at y 0. The run reports its underpaint range | Task 1 |
| W10 | The rail's posts are feet at y 0. `opening` is the two gateposts' feet | Decision (c), Task 2 |
| W11 | The caller passes the dab's centres already lifted. `stoneDab` takes the `across` vector | Decision (b) |
| F1 | The stones' source is `wallA` or `wallB`. The painted length is hashed in 0.61 to 0.89 of the wall's height, and the cell is the painted length / 0.88. The tests read the emitted sizes | Decision (b), Task 1 |
| F2 | L2's side rails start 0.03 out from the front. L2 is the only cottage: R1 comes within 0.021 of R2, and L5's and R5's posts leave the grass's footprint | Decision (c) |
| F3 | Lamp 4 moves to `t` 0.55. A test casts each frog's own stop's camera rays to its body and finds none crossing a pool | Decision (d), Task 3 |
| F4 | Decision (d2): a halo's world size is held so that it never spans more than `haloView` 0.5 of the viewport's shorter side. A whole-walk test projects it at all 901 samples | Decision (d2), Task 3 |
| F5 | Task 3 commits before its mutation proofs. Each proof restores from the commit and checks the file is clean | Task 3 |
| F6 | Each run, the rail and each lamp report their emitted vertex ranges. The tests require them non-empty and on the part. Mutations that drop each append must turn a test red | Tasks 1 to 3 |
| F7 | The lamp posts and caps are class 0 in `INK`, the walls' class as the design says | Decision (d) |
| F9 | Facts 2, 7, 8 and 11 corrected | The facts |

## Session mapping

Checked against `herdr agent list` on 2026-10-26 (evening): Lead Claude `w4:p1`. Worker Gemini 3.8 (`agy`) `w4:p5`, for
Tasks 1 to 3. Reviewer Codex `w4:p4`. When Codex's usage runs out, review goes to the Consultant, Fable, `w4:p6` in tab
`w4:t2`. The Lead reads each quota in Quota Finch's cache before a dispatch.

K2's code goes on `feat/village-lane`, branched from `feat/village-craft` at K1's last commit, so Mark's K1 preview does
not move while he reads it. The worktree `L` is `scratchpad/lane-wt` beside K1's `craft-wt`, with `node_modules` linked
to the main checkout's, served on port 5206. The base is K1's head, served from `craft-wt` on port 5205. The evidence
goes in `/Users/markma/Projects/starry-night/scratch/village-craft-2026-10-25/k2/` (`E2/` below), the tools in
`scratch/village-craft-2026-10-25/tools/` (`T/`). Nothing is pushed before Mark sees it.

## The facts the plan rests on (read at `ca102c7`, K1's head)

The worker's read is `E2/facts-worker.md`, each answer with its lines. The Lead checked the ones the decisions rest on.

1. **The grass beside the lane is not short where the design put the walls.** A clump's height is
   `GRASS_BLADE.height × (0.45 + 1.1 × noise) × verge`, `verge = 0.35 + 0.65 × clamp((lat − 0.052) / 0.1)`
   (`streetGrass.ts:117-118`, `GRASS_BLADE.height` 0.036). A blade is 0.75 to 1.25 of its clump. At lateral 0.09 the
   verge is 0.60, at 0.13 it is 0.86, from 0.152 it is 1. So at the design's wall line blades reach about 0.05, not
   0.035. A wall 0.055 high shows its upper part over the grass in front of it, not its whole face.
2. **A wall stroke costs about 86 triangles.** The default build at `ca102c7` has 154,196 class-0 stroke triangles over
   1,784 wall ribbons, 86.4 a ribbon (Codex F9). The worker's 186,492 over 2,059 was built with `KEPT_PAINT`. At
   `traceFace`'s cover a stone wall 0.84 long would cost about 20,000 triangles a face. The walk has 30,183 to spare
   (K1's record, `E/t5/tri-sweep.log`). So the stones are not `traceFace` ribbons.
3. **`outlineFace` already draws a short draped ribbon** with taper, wobble, stroke coordinates and a seed per ribbon
   (`streetStrokes.ts:405-452`). With 3 samples and 3 columns a ribbon is 8 triangles (`pushDrapedRibbon`,
   `brushForms.ts:170`). Its vertices go step by step, 3 columns a step, so vertex `3k + j` is sample `k`, column `j`, and
   vertex 4 is the middle sample's centre. A stone dab is that ribbon, with the source's pigment instead of the ink.
4. **The lane's coordinates.** `pathPoint(t)` and `pathTangent(t)` (`streetLayout.ts:52`, `:69`). The +lateral unit
   normal is `(−tz, tx) / |(tx, tz)|`, and the unit tangent is `(tx, tz) / |(tx, tz)|`. Negative lateral is the left
   (L1 to L5). Three inline copies of this map exist (`frog.ts:277-281`, `streetGeometry.ts:968-973`,
   `streetLayout.ts:541-544`). `pathTangent` keeps the lane's two 0.85° kinks at `LANE_JOINS` 0.3317 and 0.6844
   (`streetLayout.ts:397-400`). At a wall 0.03 thick a 0.85° turn moves its outer edge by 0.0004: not visible.
5. **The open verges** (the worker's corrections to the Lead's `gaps.log`, `E2/facts-worker.md` end). Left before L1:
   `t` 0 to 0.240. Right from R1 to R2: `t` 0.126 to 0.499 (R2's corner at 0.213 was `laneParam`'s global search
   jumping across the S-bend). Left from L3 to L4: `t` 0.498 to 0.850. The short gaps between neighbours stay open.
6. **The frogs** (`frog.ts:267-273`): stop 0 `t` 0.035 lat −0.086, stop 1 0.283 +0.086, stop 2 0.466 −0.098, stop 3
   0.677 −0.098, stop 4 0.975 −0.080 on the square. `FROG.clear` 0.008 × scale. The ring test
   (`street-frog.test.ts:179-196`) wants no blade root inside `clear` and at least 4 within `3 × clear`, so frog 3's
   ring reaches lateral 0.098 + 0.0233 = 0.1213.
7. **Vincent** (`streetLayout.ts:523-547`): lateral 0.03 up to stop 3, 0.07 from stop 4, `halfWidth` 0.025, height
   0.085, placed 0.4 ahead of the path sample. The camera is 0.18 behind that sample (`streetLayout.ts:443-447`), so on
   a straight run Vincent is about 0.58 ahead of the camera (Codex F9). Clearances use `vincentBoxCorners`.
8. **The lit windows' light** (`streetLife.ts:18-22`, `streetLife.tsx:27-42`, `:194-207`): `LIFE.halo` [0.09, 0.85],
   `LIFE.pool` [0.16, 0.5], one `radialTexture`, `MeshBasicMaterial` with `AdditiveBlending`, `depthWrite: false`,
   `toneMapped: false`, render order 4. A window's halo is a plane on the wall, not a sprite. A window's pool lies at y
   0.003. `litWindows` (`streetLife.ts:62-75`) finds a lit window as **any class-2 quad in the windows bucket**.
   `StreetLife` has no sprite. The sky has them (`SkyDome.tsx:236-255`, `FrontCanopySky.tsx:306-307`,
   `PaintingFlowSky3D.tsx:788-810`), and three's `Sprite` faces the camera by itself (Codex F9).
9. **The path and the square's surfaces.** Both lie at y 0.002 (`streetGeometry.ts:945`, `:950`) with strokes above.
   The square's strokes' top is `SQUARE_TOP = 0.002 + STROKE_LIFT + (LIFT_LEVELS − 1) × LIFT_STEP` = 0.00625
   (`frog.ts:255`, not exported). A pool at the windows' 0.003 would lie under the lane's and the square's strokes.
10. **The buckets.** `underpaint` and `windows` share `materials.solid` (`Street.tsx:182`, `:186`). `strokes` takes
    `append(into, from, cls, src)` with per-vertex `stroke` and `seed` (`streetGeometry.ts:145-157`). A new bucket
    would touch nine places (`E2/facts-worker.md` §6). `leaned()` acts only inside a house's build, so parts built
    after the houses do not lean.
11. **The palette gate's classes** (`check-street-colour.ts:290-301`): walls are class 0 against `wallA`, `wallB` and
    `plaster`, windows class 2 against `windowLit`. Class 255 is not measured. At K1's pass 3 the walls fail ΔE 10 at
    eight of ten frames (`E/t5/colour/branch-p3-summary.txt`, where only stop 0 phone and stop 3 desktop pass), as on K1's
    base. The worker's claim that `KEPT_PAINT` brought the walls under 10 is wrong: that file shows it.
12. **The cottages' front gardens** (`E2/facts-worker.md` §12): the front to the lane's edge is R1 0.31, L2 0.27, L5
    0.21, R5 0.15. R1's and R5's fronts stand at an angle to the lane. No garden or fence geometry exists.
13. **The portal's case 11** (`check-portal.mjs:507-510`) asserts the geometry and texture counts are equal after each
    of three round trips, not an absolute number. New meshes do not break it if they are disposed.
14. **The budgets in the tests:** `STREET_TRIANGLE_BUDGET` 641,310 (`streetLayout.ts:571`, `street-build.test.ts:253`),
    the grass's worst draw 0.98 × 38,515 (`street-grass.test.ts:271`). The build is 574,041 at K1's head.
15. **The grass is built outside `buildStreet`.** `StreetGrass.tsx:50` calls `grassChunks(painting)`. So the walls'
    clearings reach the browser through `grassChunks`'s default, and `buildStreet`'s `lane` option does not reach the
    grass. The tests call `grassChunks` directly (`street-grass.test.ts`, `street-frog.test.ts:180`,
    `street-craft.test.ts:427`).
16. **Codex's probes** (`E2/probe/codex-*.mjs`, rerun by the Lead on 2026-10-26 with lamp 4 at 0.55) are the numbers
    Decisions (a), (c), (d) and (e) carry: the walls' clearings against the frogs' rings, the rail's clearances, the lamps'
    clearances and the halo's projected size on the walk.

## Decisions

**(a) The walls.** Three runs, placed by hand as identity objects (`STREET_WALLS` in `streetLayout.ts`):

| Run | Side | `t` | Segments | Seen from |
| --- | --- | --- | --- | --- |
| W1 | left (−1) | 0.06 to 0.22 | 8 | stops 0 and 1 |
| W2 | right (+1) | 0.14 to 0.47 | 17 | stops 1 and 2 |
| W3 | left (−1) | 0.54 to 0.84 | 15 | stops 2, 3 and 4 |

Each is 0.055 high (the design's 0.05 to 0.06, 0.65 of Vincent's height) and 0.03 thick. **Lead, against the design's
0.09:** the lane face stands at lateral 0.135. Two facts set it. Frog 3's ring reaches 0.1213 (Fact 6), and a wall
clears the grass 0.012 round its footprint, so a lane face at 0.135 clears from 0.123: no frog's ring loses a blade. At
the design's 0.09 the walls would stand on frogs 1 and 3 and inside every frog's ring. The cost is the grass in front
(Fact 1): blades up to about 0.05 between the lane's edge and the wall, so the wall shows its top courses. Task 4 has
two knobs for that, below. W1 ends 0.11 along the lane before the cypress. W3 starts 0.18 past frog 2's place and runs
behind frog 3, which then sits in the grass in front of the wall. W2 runs behind frog 1 the same way.

A run of `t0` to `t1` splits into `n = ceil((t1 − t0) / 0.02)` equal segments, segment `i` from `t0 + i × Δ` to
`t0 + (i + 1) × Δ`, `Δ = (t1 − t0) / n`. The geometry and the clearings use the same segments. At each segment boundary
two points are computed once and shared by the quads either side, so no seam opens on a curve: the lane face's
`laneAt(t, side × 0.135)` and the back's `laneAt(t, side × 0.165)`, each at y 0 and at the wall's height. Each segment
gets three underpaint quads: the lane face, the top and the back. Each run gets two more, its two ends. They go into
`ctx.underpaint`, class 0, `src` the source's `SOURCE_CLASSES` value, in the source's darkest 0.4
(`sourceUnderpaint(painting, source, 0.4)`, the ground's share), so the joints between stones read dark. Each quad is lit
as a wall is (`lightOf(face, ctx.lit, ctx.wallLight)`, `shadeNew`), its face the segment's own.

**(b) The stones.** The source is `wallA` (Task 4 may pick `wallB`). Both measure a full width of 0.12 to 0.20 and a
length of 0.6 to 2.0 of the reference height (`streetStrokes.ts:65-66`). The reference height is the wall's height `H`
(the design's Constraints). `plaster` is out: its 0.10 to 0.15 width cannot carry the dab below (Codex F1).

- **On the lane face, five courses**, each `H / 5` high, the dab centred in its course at `y = (c + 0.5) × H / 5` for
  course `c` 0 to 4. The dab's painted width is 0.85 of the course, `0.17 × H`, inside 0.12 to 0.20.
- **On the top, two rows** along the wall at laterals `side × (0.135 + 0.25 × 0.03)` and `side × (0.135 + 0.75 × 0.03)`,
  at `y = H + STROKE_LIFT`, the same painted width `0.17 × H`.
- **Along a course or a row**, cells are laid end to end from the run's start. The dab's painted length `L` is
  `H × (0.61 + 0.28 × hash)`, inside 0.6 to 0.9 with 0.01 to spare for the curve. The cell is `L / 0.88`, so 0.12 of
  each cell shows as a joint. The first cell starts at a hashed offset of 0 to 0.5 of a cell, so the joints do not line
  up. The cells advance in `t` by `cell / speed(t)`, where `speed(t) = |laneAt(t + 1e-4, lat) − laneAt(t − 1e-4, lat)|
  / 2e-4` at the course's lateral. A cell whose end passes the run's `t1` is dropped.
- **A dab's three centres** lie on the curved face, not on the segment's chord: the middle at the cell's centre `t`,
  the ends at `t ∓ (L / 2) / speed(t)`. On the lane face each is `laneAt(t', side × (0.135 − STROKE_LIFT))` at the
  course's `y`, so the caller lifts it toward the lane. On the top each is `laneAt(t', row lateral)` at
  `H + STROKE_LIFT`.
- **The back and the ends get no dabs** (no stop sees them square on).

`stoneDab` in `streetStrokes.ts` is modelled on `outlineFace`'s inner loop. Signature: `stoneDab(into: FaceStrokes,
centres: readonly [Vector3, Vector3, Vector3], across: Vector3, width: number, colour: Color, seed: number): void`.
`centres` are already lifted. `across` is the unit vector in the face's plane across the stone: `(0, 1, 0)` on the lane
face, `side × (nx, 0, nz)` on the top. For sample `k` of 3, `s = k / 2`, the half-width is
`width × (1 − 0.4 × |2s − 1|²) / 2` and the wobble is `(vnoise(seed + s × 3.1, 0.7) − 0.5) × 0.5 × width` along
`across`, as `outlineFace` has them. It appends to `into.arrays` through `pushDrapedRibbon`, pushes 9 `stroke` pairs
`(s, j / 2)` and 9 `seed` values, and adds 1 to `into.ribbons`.

A dab's colour is one texel of the source's rectangle in the painting, picked by the dab's hash, then lit as its face is
(the segment's lane face, or the top with normal `UP`). The dabs go into `ctx.strokes` with class 0 and the source's
`src`.

Cost: the lane faces' arc length is about 1.54 (Codex's probe). At a mean cell of `0.75 × H / 0.88` that is about 165
dabs on the lane faces and 66 on the tops: about 230 dabs at 8 triangles, about 1,850 triangles, and about 250 for the
underpaint.

**(c) The rail.** One, round **L2's** front garden (Fact 12: 0.27 from its front to the lane's edge, its front near
parallel to the lane, seen ahead at stop 1 and beside at stop 2). L2 is the only cottage that meets the rule below
(Codex's probe, rerun on 2026-10-26): R1's posts come within 0.021 of R2, and L5's and R5's posts leave the grass's
footprint.

The garden lies in L2's `doorStepFrame` (origin `(ox, oz)` at the drawn front's `s = 0` corner, `u` along the front,
`n` out to the lane, `W` the house's `w`). A point `(a, k)` is `(ox, oz) + a × u + k × n`. With `door = doorOf(L2, its
index)`, the opening's width is `g = door.w × W + 0.02`, from `a0 = door.cu × W − g / 2` to `a1 = door.cu × W + g / 2`.
Four chains:

1. `(−0.02, 0.03)` to `(−0.02, 0.12)`, the left side.
2. `(−0.02, 0.12)` to `(a0, 0.12)`, the outer line's left part.
3. `(a1, 0.12)` to `(W + 0.02, 0.12)`, its right part.
4. `(W + 0.02, 0.12)` to `(W + 0.02, 0.03)`, the right side.

The sides start 0.03 out from the front, not at it, so the posts nearest the house clear it by 0.036 (Codex F2). Each
chain splits into `ceil(length / 0.12)` equal spans, with a post at each end and each division. A post shared by two
chains is one post (Codex's probe: 7 posts). A post is a box 0.005 square, 0.05 high, with a top. Two rails run along
each span, their centres at y 0.02 and 0.042, each a box 0.004 square. Each face is a flat underpaint quad in the
`thatch` source's mean (`sourceUnderpaint(painting, 'thatch', 1)`), lit and shaded as a wall face, class 0, `src` 255.

**Lead, against the design's "under the ink":** no ink on the rail. The ink's measured width is `OUTLINE_FRACTION` 0.14
of its reference height. At the rail's 0.05 that is 0.007, wider than the 0.005 post. The ink would swamp the rail.
Codex checked the arithmetic. Open to Mark at the gate.

The rule for the rail (Task 2 tests it): every post's foot inside the grass's footprint (`inFootprint`), its centre 0.03
or more outside every house and step, 0.03 or more outside every wall segment's footprint, and 0.03 or more past the
lane's edge (`laneDistance − 0.06 ≥ 0.03`). Task 3 adds the lamps to it.

**(c2) A switch for the proofs.** `buildStreet`'s options gain `lane?: boolean`, default true. With `lane: false` it
builds no wall, rail or lamp, and `report.lane` is `{ walls: [], rail: null, lamps: [] }`. `grassChunks` gains a third
parameter, `clearings = streetClearings()`, so a test or a tool can pass `stepClearings()` alone. Both exist only so the
tests and the hash tools can prove K1 unmoved. `T/build-hash.ts` and `T/grass-hash.ts` read `LANE=0` (done, Task 0).

**(d) The lamps.** **Lead, against the design's "about seven":** seven, alternating sides, at these places
(`STREET_LAMPS` in `streetLayout.ts`):

| Lamp | `t` | lateral |
| --- | --- | --- |
| 1 | 0.10 | +0.11 |
| 2 | 0.24 | −0.11 |
| 3 | 0.38 | +0.11 |
| 4 | 0.55 | −0.11 |
| 5 | 0.65 | +0.11 |
| 6 | 0.79 | −0.11 |
| 7 | 1.00 | +0.20 |

Lamp 4 was at 0.52 in revision 0. There its pool lay in front of frog 2 from stop 2 (Codex F3). At 0.55 no ray from
a frog's own stop to its body crosses a pool (`E2/probe/lead-pool-frogs.mjs`: the nearest crossing is 0.171, lamp 3's
pool from frog 1 at stop 1, against the pool's 0.16). At 0.52 and at 0.58 the same test fails, so lamp 4 cannot move in
Task 4. Every other clearance holds at 0.55 (the Lead's rerun of Codex's probe): no lantern inside a station's frame
closer than 0.39, no post nearer than 0.054 to Vincent's box, the nearest frog to a post 0.171 (lamp 3 to frog 1).
From a farther stop, a ray to a distant frog can cross a pool: stop 0's rays to frog 3, about 1.5 away and a few pixels
high, cross lamp 4's. That reads as the frog in the lamp's light, and the test does not count it. Open to Mark at the
gate. Lamp 7 stands on the
square's edge beside the church, past Vincent's line at stop 4 (lateral 0.07). Lamps 3, 4 and 6 stand in front of W2
and W3, their post's edge 0.023 from the wall's footprint.

A post is a box 0.004 square, 0.13 high (1.2 of a door's 0.11), in `INK`, **class 0** (the design's Constraints put the
posts in the walls' class, Codex F7), `src` 255. The lantern is a box 0.012 square and 0.016 high on the post's top, its
centre at y 0.138. Its four sides are in the `windowLit` source's mean (`sourceUnderpaint(painting, 'windowLit', 1)`, a
lit window's base), unlit as a lit window is, class 2. Its cap is a pyramid 0.016 square and 0.008 high in `INK`, class
0, `src` 255. **All of it goes into `ctx.underpaint`, not `ctx.windows`**: `litWindows` reads every class-2 quad of the
windows bucket as a lit window (Fact 8), so a lantern there would grow four window halos. About 20 triangles a lamp.

The report's `lane.lamps` is `{ foot: Vector3; lantern: Vector3; underpaint: [number, number] }[]`: the post's foot at
y 0, the lantern's centre, and the lamp's vertex range in `build.underpaint`. `Street.tsx` passes
`build.report.lane.lamps` to `StreetLife` as `lamps`, beside `windows`.

`streetLife.ts` exports `LAMP_LIGHT = { halo: 2 × LIFE.halo[0] + 0.012, haloView: 0.5, poolY: 0.007 }`. For each lamp
`StreetLife` draws:

- **a halo:** a `<sprite>` at the lantern's centre with one shared `SpriteMaterial`: the windows' texture, `color`
  `LIFE.glow × LIFE.halo[1]`, `AdditiveBlending`, `transparent`, `depthWrite: false`, `toneMapped: false`, render order
  4. `depthTest` stays on: the lantern's near faces clip the sprite's centre, which the painted core carries, and with
  it off a lamp behind a house would glow through the wall. Its scale is set each frame by Decision (d2).
- **a pool:** the windows' pool plane and material, radius `LIFE.pool[0]`, centred on the post's foot, at y
  `LAMP_LIGHT.poolY` 0.007 (Fact 9: over the square's strokes' top 0.00625 and the lane's), render order 4.

The halos and pools do not change in time, as the windows' do not. Reduced motion changes nothing. The sprite material
is disposed with `StreetLife`'s other materials.

The station frame test (Task 3), written out (it was `scratchpad/probe/k2-lamps.mts`, now `E2/probe/k2-lamps.mts`): for
each lamp, each stop 0 to 4 and each aspect (16:9 and 16:10 landscape, 390 / 844 portrait), take `pose = stationPose(stop,
portrait)`, a `PerspectiveCamera(pose.fov, aspect, pose.near, pose.far)` at `pose.position` looking at `pose.target`, its
world matrix and projection updated. Project the lantern's centre: `q = lantern.clone().project(camera)`. When
`−1 ≤ q.z < 1`, `|q.x| ≤ 1` and `|q.y| ≤ 1`, the lantern is in the frame, and its distance to `camera.position` must be
0.35 or more. This keeps a post and its lantern from filling a stop's frame.

**(d2) The halo near the camera.** **Lead, against the design's "lamps hold steady, as the lit windows do":** a halo's
world size shrinks when the camera comes close. Without it, the walk between the stops passes four lanterns at 0.14 to
0.25, and the 0.192 sprite spans 1.07 to 1.80 viewport heights (Codex F4, the Lead's rerun: lamp 1 at walk `t` 0.138,
lamp 3 at 0.406, lamp 4 at 0.613, lamp 6 at 0.770). A smaller halo does not solve it: at 0.6 of the size lamp 4 still
spans 1.08. Moving the lamps out puts them in the walls. The halo does not change in time and holds at every pose, so
reduced motion changes nothing.

`streetLife.ts` exports `lampHaloScale(depth: number, fovDeg: number, aspect: number): number`. `depth` is the
lantern's view-space depth (`−z` in the camera's frame, not the distance). It returns 0 when `depth ≤ 0`, else
`min(LAMP_LIGHT.halo, LAMP_LIGHT.haloView × 2 × depth × tan(fovDeg / 2 in radians) × min(1, aspect))`. So a halo never
projects larger than `haloView` of the viewport's shorter side. On the phone the shorter side is the width, which is why
`min(1, aspect)` is there. `StreetLife`'s `useFrame` calls `camera.updateMatrixWorld()`, then for each halo sprite
reads the lantern's depth through `camera.matrixWorldInverse` and sets `sprite.scale` to `lampHaloScale(depth,
camera.fov, camera.aspect)` on all three axes. Seven sprites a frame: no measurable cost.

The whole-walk test (Task 3): for each lamp, each aspect above and each pose (the 5 stations and `walkPose(k / 1000,
portrait)` for `k` 0 to 900), build the camera as the station test does. Put the lantern in view space:
`c = lantern.clone().applyMatrix4(camera.matrixWorldInverse)`. Skip the pose when `−c.z ≤ pose.near`. Otherwise take
`s = lampHaloScale(−c.z, pose.fov, aspect)` and project the sprite's corners `c ± (s / 2, s / 2, 0)` with
`camera.projectionMatrix`. The height fraction is the NDC `y` span over 2, the width fraction the NDC `x` span over 2.
The larger must be `LAMP_LIGHT.haloView + 1e-9` or less. The test also asserts that the same projection with `s` at
`LAMP_LIGHT.halo` exceeds 1 at some pose, so it is not vacuous.

**(e) The grass.** `streetLayout.ts` exports three functions, each returning oriented rectangles
`{ ox, oz, ux, uz, nx, nz, u0, u1, k0, k1 }`:

- `stepClearings()`: a step is today's frame from `doorStepFrame`, with `u0, u1` = `ws0, ws1` and `k0, k1` = 0,
  `STEP.depth`.
- `wallClearings()`: one rectangle per wall segment (Decision (a)), as Codex's grass probe built them
  (`E2/probe/codex-grass-probe.mjs:26-32`), so its measured margins carry over. Take the segment's footprint corners
  `q0 = laneAt(ta, side × 0.135)`, `q1 = laneAt(tb, side × 0.135)`, `q2 = laneAt(tb, side × 0.165)`,
  `q3 = laneAt(ta, side × 0.165)`. The origin is `q0`. `u` is the unit vector from `q0` to `q1`. `n` is `(−uz, ux)`,
  negated when it points away from `q3`, so it points from the lane face to the back. Each corner's `(u, k)` is its
  offset from `q0` dotted with `u` and with `n`. Then `u0` is the corners' least `u` less 0.002, `u1` their greatest `u`
  plus 0.002, `k0` their least `k`, `k1` their greatest `k`.
- `streetClearings()`: `[...stepClearings(), ...wallClearings()]`.

The rail and the lamps clear no grass: a post stands in the grass. `grassChunks`'s filter (`streetGrass.ts:141-153`)
runs over its `clearings` in place of the steps, `da = max(u0 − a, 0, a − u1)` and `dk = max(k0 − k, 0, k − k1)`,
with the same margin `GRASS.house` 0.012, after the shuffle. The chunks' bounds come from the kept blades as today.
Codex's probe of this filter: with the steps alone, every chunk equals K1's (hash `def5470cc15817ba`). With the 40 wall
rectangles, 17,012 of 18,383 blades are kept in their order, and the frogs' ring counts stay `[10, 20, 6, 27]`. Its W2
had 16 segments of 0.02 and one of 0.01, not 17 equal ones, so the kept count may differ a little. Its W1 and W3 are
the segments above. The tightest margin is W3 against frog 3's ring: 0.00165, against the test's 0.0015.

**(f) One map from the lane.** `laneAt(t, lat): { x: number; z: number; nx: number; nz: number }` in `streetLayout.ts`,
`(nx, nz)` the +lateral unit normal (Fact 4). The walls, the clearings, the rail's checks and the lamps use it. The three
inline copies stay as they are: changing them is not this slice's work.

**(g) The budget.** The estimate is about 2,500 triangles: the walls 2,100, the rail 300, the lamps 140. The halos and
pools are separate meshes outside the build, 4 triangles a lamp. The hard limit is the browser: every point of Task 5's
sweep under 1,444,930 on both viewports. K1 left the walk's worst point 30,183 under it.

## Global constraints

- No new dependency. No new mesh in the build: the furniture goes into the existing buckets. The halos and pools are
  `StreetLife`'s, as the windows' are.
- The bar: every new surface is painted from a `STREET_SOURCES` rectangle, or takes a flat colour from one under the
  street's ink. No new texture.
- A stroke's width and length stay inside their source's measured range (Decision (b)). A value outside needs a new
  1:1 measurement of the scan's village, in the record before the value is used.
- K1's houses, the church, the land and the diorama do not change. The houses' places, the lane, the stops and the
  frogs do not change. The grass changes only inside the walls' clearings.
- No new motion in time. No real-time light: a lamp is painted light. The halo's size follows the camera's depth
  (Decision (d2)), never the clock.
- The triangle ceiling is 1,444,930 at every browser point, both orientations. 60 fps on the desktop, 30 on a
  mid-tier phone, at the Tunables' dpr caps.
- The build's time stays within 10% of K1's (630 to 645 ms, `E/t5/build-time.log`).
- Retune cap: four look passes.

## Review focus

1. **A wall on a frog, or a frog's ring losing blades.** Tests (Task 1): the frog tests unchanged and green, and every
   wall clearing at least 0.0015 outside every frog's `3 × clear` ring.
2. **The grass moving away from the walls.** Test (Task 1): with `stepClearings()` alone the grass hashes to K1's. With
   the walls, the kept blades are a subset in the same order.
3. **A wall reported but not drawn.** Tests (Tasks 1 to 3): every run, the rail and every lamp report a non-empty vertex
   range, and the vertices in it lie on the part. A mutation that drops each append turns a test red.
4. **A stone outside its measured size, or a dab off its face.** Test (Task 1): each emitted dab's width and length
   inside Decision (b)'s fractions, and its middle centre on the lifted face.
5. **A lantern read as a lit window.** Test (Task 3): `litWindows(build.windows)` returns K1's count, and every lamp's
   class-2 vertices are in `underpaint`.
6. **A halo filling the screen on the walk, or a pool over a frog.** Tests (Task 3): the whole-walk halo test and the
   pool-against-frog test.
7. **K1's build moving.** Tasks 1 and 3: with `lane: false` the build hashes to K1's head (`T/build-hash.ts`). The
   flat panel's hash does not change.
8. **The four calls against the design** (the walls' lateral, no ink on the rail, the lamps' count and places, the halo
   near the camera). Read the facts they rest on.

---

### Task 0: the base's reads (Lead) — done

- [x] Branch and worktree: `feat/village-lane` from `b7a5a4f`, the worktree `scratchpad/lane-wt`, `node_modules` linked.
  The dev server on port 5206 is not started yet.
- [x] K1's head hashes into `E2/t0/`: build `35ce7aeb5bd88590` (574,041 triangles), grass `def5470cc15817ba` (241
  chunks, 18,383 blades). K1's sweep and captures are the base: `E/t5/tri-sweep.log`, `E/t4/p3/`.
- [x] `T/build-hash.ts` reads `LANE=0` and passes `{ lane: false }`. `T/grass-hash.ts` reads `LANE=0` and passes
  `stepClearings()` as the third argument. An older tree ignores both.
- [ ] Write the brief for Tasks 1 to 3 (`E2/brief-k2-build.md`), lint it, and dispatch it with a one-line pointer.

### Task 1: the walls and the grass (worker)

**Files:**
- Change: `src/scene/streetLayout.ts` (`laneAt`, `STREET_WALLS`, `stepClearings`, `wallClearings`, `streetClearings`)
- Change: `src/scene/streetStrokes.ts` (`stoneDab`)
- Change: `src/scene/streetGeometry.ts` (`LANE_CRAFT`, `laneWalls(ctx)` called after the church, `report.lane`, the
  `lane` option)
- Change: `src/scene/streetGrass.ts` (the `clearings` parameter and the filter over it)
- Change: `package.json` (`test:sky`: add `scripts/street-lane.test.ts`)
- Test: `scripts/street-lane.test.ts` (new)

**Interfaces:**
- Produces: `laneAt`. `STREET_WALLS: readonly { side: -1 | 1; t0: number; t1: number }[]`. `LANE_CRAFT.wall = { inner:
  0.135, thickness: 0.03, height: 0.055, segment: 0.02, courses: 5, rows: 2, length: [0.61, 0.89], joint: 0.88, cover:
  0.85, source: 'wallA' }`. `stoneDab`. `stepClearings()`, `wallClearings()`, `streetClearings()`.
- `report.lane.walls: { side; t0; t1; segments: { t0; t1; corners: Vector3[] }[]; underpaint: [number, number]; strokes:
  [number, number]; dabs: { face: 'lane' | 'top'; t: number; lateral: number; y: number; length: number; width: number
  }[] }[]`. A segment's `corners` are its 4 footprint corners at y 0, in the order `q0, q1, q2, q3` of Decision (e). The
  ranges are `[start, end)` vertex indices in the returned `build.underpaint` and `build.strokes.arrays`. Dab `i` of a run
  is vertices `strokes[0] + 9i` to `strokes[0] + 9i + 8`. A dab's `lateral` is its centres' lateral, already lifted on
  the lane face.

- [ ] **Step 1: Write the failing tests** in `street-lane.test.ts`, on the real painting where the frog tests use it:
  - `'laneAt is the map the frogs use'`: for 20 `t` and 3 laterals, `laneAt` equals `frogPlace`'s inline formula to
    1e-12.
  - `'the walls stand on the verges the plan names'`: `report.lane.walls` has 3 runs with `STREET_WALLS`'s sides and
    `t`, and 8, 17 and 15 segments of equal `Δt`. Each segment's corners are 2 at `side × 0.135` and 2 at `side × 0.165`
    (`laneAt` at the segment's `t0` and `t1`) to 1e-9, all at y 0.
  - `'every wall is drawn'`: each run's `underpaint` and `strokes` ranges are non-empty and end within their bucket. Every
    underpaint vertex in a run's range lies, in some segment's rectangle frame (Decision (e) without the 0.002), within
    `u0 − 1e-6` to `u1 + 1e-6` and `k0 − 1e-6` to `k1 + 1e-6`, at y 0 to `H` within 1e-9. The `strokes` range's length is
    9 × the run's dab count.
  - `'no wall touches a house, a step, the lane, Vincent, the cypress or a frog's ring'`: every segment's footprint 0.03
    or more from each house's footprint and step, its lane face past lateral 0.06 + 0.03, 0.03 or more from Vincent's box
    over all 901 walk samples (`vincentBoxCorners(k / 1000)`, as `street-frog.test.ts:153` samples it), 0.07 or more
    from the cypress, and each wall rectangle (Decision (e)) less the margin 0.012 is 0.0015 or more outside the ring of
    radius `3 × FROG.clear × scale` round each frog at stops 0 to 3.
  - `'a stone is a dab of the measured size'`: every recorded dab has `length` in `[0.61, 0.89] × H` and `width`
    `0.17 × H` to 1e-9. On its 9 emitted vertices: `|v5 − v3|` (the middle sample's width) is `width` to 1e-9. The
    length `|(v7 − v1) · (nz, 0, −nx)|`, with `(nx, nz)` from `laneAt(t, lateral)`, is in `[0.6, 0.9] × H` and within
    1e-4 of `length`. A lane-face dab's `v4` has `(x, z)` = `laneAt(t, lateral)` to 1e-9 and its `y` within `width / 4`
    of the course's. A top dab's `v4` has `y` = `H + STROKE_LIFT` to 1e-9 and its `(x, z)` within `width / 4` of
    `laneAt(t, lateral)`.
  - `'the grass clears the walls'`: in `grassChunks(painting)`, no blade root within 0.012 of a wall segment's footprint.
  - `'the grass away from the walls is K1's'`: `grassChunks(painting, undefined, stepClearings())` hashes to
    `def5470cc15817ba` (sha256 of `JSON.stringify(chunks)`, first 16 hex, as `T/grass-hash.ts` computes it). With the
    default clearings, each chunk's kept blades are a subset of the steps-only chunk's, in its order.
  - `'the walls cost what the plan says'`: the build's triangles less the build with `lane: false` is 1,000 to 4,000.
- [ ] **Step 2: Run them**: `node --test scripts/street-lane.test.ts`. Expected: FAIL (no `laneAt`).
- [ ] **Step 3: Build Decisions (a), (b), (e) and (f)**, and add the test file to `test:sky`.
- [ ] **Step 4: Run the suite**: `npm run -s test:sky 2>&1 | tee E2/t1/test-sky.log`. Expected: all PASS, the frog
  tests among them, and `grep -c "a stone is a dab" E2/t1/test-sky.log` is at least 1.
- [ ] **Step 5: K1 unmoved without the furniture**: `LANE=0 WT=$PWD npx tsx T/build-hash.ts` gives `35ce7aeb5bd88590`,
  and `LANE=0 WT=$PWD npx tsx T/grass-hash.ts` gives `def5470cc15817ba`. Record both, and the two hashes without
  `LANE=0`, in `E2/t1/hash.txt`.
- [ ] **Step 6: Commit** by pathspec: `feat(street): dry-stone walls on the three open verges, their stones as dabs (K2
  task 1)`.

### Task 2: the rail (worker)

**Files:**
- Change: `src/scene/streetLayout.ts` (`STREET_RAIL = { house: 'L2', back: 0.03, depth: 0.12, margin: 0.02, gap: 0.02 }`)
- Change: `src/scene/streetGeometry.ts` (`LANE_CRAFT.rail = { post: 0.005, height: 0.05, rails: [0.02, 0.042], bar:
  0.004, spacing: 0.12 }`, `gardenRail(ctx)`, `report.lane.rail`)
- Test: `scripts/street-lane.test.ts`

**Interfaces:**
- `report.lane.rail: { house: string; posts: Vector3[]; opening: [Vector3, Vector3]; underpaint: [number, number] } |
  null`. `posts` are the posts' feet at y 0, de-duplicated. `opening` is the two gateposts' feet, at `(a0, 0.12)` and
  `(a1, 0.12)` of Decision (c). `underpaint` is the rail's vertex range in `build.underpaint`.

- [ ] **Step 1: Write the failing tests:**
  - `'the rail closes the front garden, open at the door'`: `rail.house` is `'L2'`. `posts` are the 7 that Decision
    (c)'s chains give, to 1e-9. Neighbours along each chain are 0.12 or less apart. The gateposts are `g` apart to 1e-9
    and their midpoint is at `a = door.cu × W`, `k = 0.12` to 1e-9.
  - `'the rail stands in the grass, clear of everything'`: Decision (c)'s rule for every post foot: `inFootprint`, its
    centre 0.03 or more outside every house (L2 included) and step and every wall segment's footprint, and
    `laneDistance − 0.06` 0.03 or more.
  - `'the rail is drawn and has no ink'`: the `underpaint` range is non-empty. Every vertex in it lies within 0.0035
    horizontally of a post's foot or of a span's line, at y 0 to 0.05 within 1e-9. The build's `outlines` vertex count
    equals the `lane: false` build's.
- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Build Decision (c).**
- [ ] **Step 4: Run the suite** into `E2/t2/test-sky.log`. Expected: all PASS.
- [ ] **Step 5: Commit**: `feat(street): a wooden rail round L2's front garden (K2 task 2)`.

### Task 3: the lamps (worker)

**Files:**
- Change: `src/scene/streetLayout.ts` (`STREET_LAMPS`)
- Change: `src/scene/streetGeometry.ts` (`LANE_CRAFT.lamp = { post: 0.004, height: 0.13, lantern: [0.012, 0.016], cap:
  [0.016, 0.008] }`, `laneLamps(ctx)`, `report.lane.lamps`)
- Change: `src/scene/streetLife.ts` (`LAMP_LIGHT`, `lampHaloScale`)
- Change: `src/scene/streetLife.tsx` (the `lamps` prop, a halo sprite and a pool per lamp, the halo's scale in
  `useFrame`, the sprite material's disposal)
- Change: `src/scene/Street.tsx` (passes `build.report.lane.lamps` as `lamps`)
- Change: `src/scene/frog.ts` (export `SQUARE_TOP`)
- Test: `scripts/street-lane.test.ts`

- [ ] **Step 1: Write the failing tests:**
  - `'seven lamps alternate sides'`: `STREET_LAMPS` is Decision (d)'s table, and the signs alternate.
  - `'no lantern fills a stop's frame'`: Decision (d)'s station frame test.
  - `'no halo fills the screen on the walk'`: Decision (d2)'s whole-walk test, with its non-vacuous assertion.
  - `'no pool lies over a frog'`: for each frog at stops 0 to 4, its own stop's camera (`stationPose(frog.stop,
    portrait)`, built as the station frame test does, with each of its three aspects), and each lamp. Take the frog's
    built body (`buildFrog(painting).body`, its `underpaint` and `strokes.arrays` positions, scaled by the frog's `scale`,
    turned by `frogPlace`'s yaw and moved to its position, as `E2/probe/codex-light-probe.mjs:13-19` does). Keep each
    vertex below `LAMP_LIGHT.poolY` that projects inside the frame (`−1 ≤ q.z < 1`, `|q.x| ≤ 1`, `|q.y| ≤ 1`). The ray
    from the camera to it crosses y `LAMP_LIGHT.poolY` at `f = (poolY − cam.y) / (v.y − cam.y)`. When `0 < f < 1`, the
    crossing must be `LIFE.pool[0]` or more from the lamp's foot. `E2/probe/lead-pool-frogs.mjs` is this test as a
    probe: 0 crossings at lamp 4's 0.55, 2,844 at 0.52.
  - `'no lamp touches Vincent, a frog, a house, a wall or the rail'`: each post's centre 0.03 or more from Vincent's box
    over the 901 samples, 0.06 or more from each frog, 0.03 or more outside every house, step, the church's nave and
    belfry, and the rail's posts and span lines. Its edge (the centre's distance less 0.002) 0.02 or more from every wall
    segment's footprint.
  - `'a lantern is not a lit window'`: `litWindows(build.windows).length` equals the `lane: false` build's. Each lamp's
    `underpaint` range is non-empty. In it, the lantern's four side quads are class 2, and every other vertex is class 0.
  - `'a lamp's pool lies over the lane's strokes'`: `LAMP_LIGHT.poolY` exceeds `SQUARE_TOP`.
- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Build Decisions (d) and (d2).**
- [ ] **Step 4: Run the suite** into `E2/t3/test-sky.log`. Expected: all PASS.
- [ ] **Step 5: K1 unmoved without the furniture**, again: `LANE=0` gives K1's build hash, into `E2/t3/hash.txt`.
- [ ] **Step 5b: The browser's checks**, against port 5206: `check-portal.mjs` (case 11's counts equal over three trips)
  and `check-reduced-motion.mjs`, their output in `E2/t3/`.
- [ ] **Step 6: Commit** by pathspec: `feat(street): seven lamps along the lane, their halos and pools the windows' (K2
  task 3)`. The mutation proofs start from this commit.
- [ ] **Step 7: The mutation proofs**, one at a time, each in `E2/t3/mutation-<n>.md`. Each file holds, in order:
  `git status --short` (empty) and `HEAD`; the mutation's exact `git diff`; the named test's raw output and its exit
  status (red); `git checkout -- <file>` and its exit status; `git diff --exit-code -- <file>` and its exit status (0);
  the suite's raw output and its exit status (green). A script writes the whole file. Nothing echoed to the terminal
  counts. The mutations:
  1. The walls' lane face at 0.09: `'no wall touches … a frog's ring'` fails.
  2. One rectangle per run from `t0` to `t1` in `wallClearings()`: `'the grass clears the walls'` fails on a curved run.
  3. The walls' underpaint append skipped, the report's range kept: `'every wall is drawn'` fails.
  4. The stones' append skipped: `'every wall is drawn'` or `'a stone is a dab'` fails.
  5. The rail's append skipped: `'the rail is drawn and has no ink'` fails.
  6. The lanterns into `ctx.windows`: `'a lantern is not a lit window'` fails.
  7. `LAMP_LIGHT.poolY` at 0.003: `'a lamp's pool lies over the lane's strokes'` fails.
  8. `lampHaloScale` returns `LAMP_LIGHT.halo` for any depth: `'no halo fills the screen on the walk'` fails.
  9. Lamp 4 at `t` 0.52: `'no pool lies over a frog'` fails.

  A mutation whose test stays green is a finding: report it, do not weaken the mutation.

### Task 4: the look passes (Lead)

Each pass captures stops 0 to 4 on both viewports beside K1's (`T/k1-look.sh`, rewritten for port 5206 and `E2/t4/`),
looks at 1:1, and writes the pass into the record `tasks/2026-10-26-village-craft-k2.md` and `tasks/lessons.md`. The
knobs, inside their ranges:

- The walls: height 0.05 to 0.06, lane face 0.135 to 0.15, the stones' source `wallA` or `wallB`.
- The grass in front of a wall: its clearing margin on the lane side 0.012 to 0.03 on W1 and W2. W3 stays at 0.012: it
  has 0.00015 to spare at frog 3's ring. The frog-ring test decides every value.
- The rail: L2 only. A clearing along each rail span, margin 0.012 to 0.03, if the grass buries it.
- The lamps: each place within ±0.03 of `t`, then the tests re-run. Lamp 4 stays at 0.55: the pool test fails at 0.52
  and at 0.58. The halo's size 0.6 to 1 of `LAMP_LIGHT.halo`.
  `haloView` 0.3 to 0.6.

The anti-goals are the test: no runway of lamps, no toy town, no clutter, the far read at stop 0 still the painting's.
Cap: four passes. Then stop and ask Mark.

### Task 5: the gate's runs (Lead)

- [ ] `git status --short` empty. `npx tsc -b`, `npm run -s lint`, `npm run -s test:sky`, `npm run -s build`.
- [ ] Against port 5206: `check-street-grass.mjs` (every case), `check-street-walk.mjs`, `check-street-rotation.mjs`,
  `check-street-cypress-hang.mjs`, `check-portal.mjs`, `check-reduced-motion.mjs` (`T/k1-gate.sh` for the new port).
- [ ] The palette gate at the last pass against K1's (`T/k1-colour.sh`): the walls' and the windows' ΔE, and how far
  the walls, the stones, the posts and the lanterns move them.
- [ ] The frame time at stops 0 and 3, five rounds, K2 on 5206 beside K1 on 5205 (`T/k1-perf.sh` for the ports), the
  perf marker made first.
- [ ] The browser's sweep, K1's points: every point under 1,444,930.
- [ ] The build's time against K1's (`T/street-tri-split.ts` on both worktrees).
- [ ] The walk's close passes, captured on desktop and the phone at walk `t` 0.138, 0.406, 0.613 and 0.770, through
  the seam `check-street-walk.mjs` drives: each halo held, no flare across the frame.
- [ ] The gate's sheet: the walls, the rail and two lamps at 1:1, a close pass, and stop 0's far read beside the
  painting's village.

### Task 6: review and the record (Lead)

- [ ] Codex's branch review (a brief file and a one-line pointer), each finding answered in the record. The
  Consultant if Codex's usage has run out.
- [ ] The record, the Tunables entry in `CLAUDE.md`, `tasks/lessons.md`, the pickup in `tasks/todo.md`.
- [ ] Push `feat/village-lane` for a Vercel preview when Mark has passed K1, and send him the link and the sheet.
