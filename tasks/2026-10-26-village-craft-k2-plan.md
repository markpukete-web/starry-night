# The village's craft, K2 the lane: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Revision 0 (2026-10-26), for the two plan reviews.** Mark approved the craft design ("go with your recommendation,
start the plan"), so its Lead's calls stand unless a fact below contradicts one. Three of this plan's decisions depart
from the design's text, each for a fact the design did not have: the walls' lateral (Decision (a)), no ink on the rail
(Decision (c)), and the lamps' count and places (Decision (d)). K2's build waits for Mark's pass of K1, which he reads on
the preview of `feat/village-craft`.

**Goal:** The lane gets its furniture. Low dry-stone walls run along the verges where no house fronts the lane, one
wooden rail closes a cottage's front garden, and seven lamps lead the walk to the square.

**Architecture:** No new mesh. The walls, the rail and the lamps' posts and lanterns go into the build's existing
buckets (`underpaint`, `strokes`), so `Street.tsx`'s mesh list and the portal's disposal do not change. The walls' places,
the rail's cottage and the lamps' places are layout data in `streetLayout.ts`, beside `STEP`. A wall is a swept box
along the lane, its lane face and top clad in stone dabs: short draped ribbons of 8 triangles each, the stroke shader's
body, not `traceFace`'s ribbons. The grass's steps filter becomes a filter by a list of oriented rectangles, the steps
and the walls. The lamps' halos and pools join the lit windows' in `StreetLife`.

**Tech stack:** three.js, the street's builders (`polygon`, `append`, `pushDrapedRibbon`, `lightOf`, `shadeNew`), R3F
(`<sprite>`), `node --test`, the check scripts. No new dependency.

**Spec:** `docs/superpowers/specs/2026-10-25-village-craft-design.md`, "Low dry-stone walls", "The wooden rail" and
"Lamps", with its Constraints and Anti-goals.

## Session mapping

Checked against `herdr agent list` on 2026-10-26: Lead Claude `w4:p1`. Worker Gemini 3.8 (`agy`) `w4:p5`, for Tasks 1
to 3. Reviewer Codex `w4:p4`. When Codex's usage runs out, review goes to the Consultant, Fable, `w4:p6` in tab `w4:t2`.
The Lead reads each quota in Quota Finch's cache before a dispatch.

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
2. **A wall stroke costs about 90 triangles** (`E2/facts-worker.md` §7: 186,492 class-0 stroke triangles over 2,059 wall
   ribbons at `ca102c7`). At `traceFace`'s cover a stone wall 0.84 long would cost about 20,000 triangles a face. The
   walk has 30,183 to spare (K1's record, `E/t5/tri-sweep.log`). So the stones are not `traceFace` ribbons.
3. **`outlineFace` already draws a short draped ribbon** with taper, wobble, stroke coordinates and a seed per ribbon
   (`streetStrokes.ts:405-452`). With 3 samples and 3 columns a ribbon is 8 triangles (`pushDrapedRibbon`,
   `brushForms.ts:170`). A stone dab is that ribbon, with the source's pigment instead of the ink.
4. **The lane's coordinates.** `pathPoint(t)` and `pathTangent(t)` (`streetLayout.ts:52`, `:69`). The +lateral unit
   normal is `(−tz, tx) / |(tx, tz)|`. Negative lateral is the left (L1 to L5). Three inline copies of this map exist
   (`frog.ts:277-281`, `streetGeometry.ts:968-973`, `streetLayout.ts:541-544`). `pathTangent` keeps the lane's two
   0.85° kinks at `LANE_JOINS` 0.3317 and 0.6844 (`streetLayout.ts:397-400`). At a wall 0.03 thick a 0.85° turn
   moves its outer edge by 0.0004: not visible.
5. **The open verges** (the worker's corrections to the Lead's `gaps.log`, `E2/facts-worker.md` end). Left before L1:
   `t` 0 to 0.240. Right from R1 to R2: `t` 0.126 to 0.499 (R2's corner at 0.213 was `laneParam`'s global search
   jumping across the S-bend). Left from L3 to L4: `t` 0.498 to 0.850. The short gaps between neighbours stay open.
6. **The frogs** (`frog.ts:267-273`): stop 0 `t` 0.035 lat −0.086, stop 1 0.283 +0.086, stop 2 0.466 −0.098, stop 3
   0.677 −0.098, stop 4 0.975 −0.080 on the square. `FROG.clear` 0.008 × scale. The ring test
   (`street-frog.test.ts:179-196`) wants no blade root inside `clear` and at least 4 within `3 × clear`, so frog 3's
   ring reaches lateral 0.098 + 0.0233 = 0.1213.
7. **Vincent** (`streetLayout.ts:523-547`): lateral 0.03 up to stop 3, 0.07 from stop 4, `halfWidth` 0.025, height
   0.085, placed 0.4 ahead of the camera.
8. **The lit windows' light** (`streetLife.ts:18-22`, `streetLife.tsx:27-42`, `:194-207`): `LIFE.halo` [0.09, 0.85],
   `LIFE.pool` [0.16, 0.5], one `radialTexture`, `MeshBasicMaterial` with `AdditiveBlending`, `depthWrite: false`,
   `toneMapped: false`, render order 4. A window's pool lies at y 0.003. `litWindows` (`streetLife.ts:62-75`) finds a
   lit window as **any class-2 quad in the windows bucket**. No billboard mesh exists in `src/`. three's `Sprite`
   faces the camera by itself.
9. **The path and the square's surfaces.** Both lie at y 0.002 (`streetGeometry.ts:945`, `:950`) with strokes above.
   The square's strokes' top is `SQUARE_TOP = 0.002 + STROKE_LIFT + (LIFT_LEVELS − 1) × LIFT_STEP` = 0.00625
   (`frog.ts:255`). A pool at the windows' 0.003 would lie under the lane's and the square's strokes.
10. **The buckets.** `underpaint` and `windows` share `materials.solid` (`Street.tsx:182`, `:186`). `strokes` takes
    `append(into, from, cls, src)` with per-vertex `stroke` and `seed` (`streetGeometry.ts:145-157`). A new bucket
    would touch nine places (`E2/facts-worker.md` §6). `leaned()` acts only inside a house's build, so parts built
    after the houses do not lean.
11. **The palette gate's classes** (`check-street-colour.ts:290-301`): walls are class 0 against `wallA`, `wallB` and
    `plaster`, windows class 2 against `windowLit`. Class 255 is not measured. At K1's pass 3 the walls fail ΔE 10 at
    seven of ten frames (`E/t5/colour/branch-p3-summary.txt`), as on K1's base. The worker's claim that `KEPT_PAINT`
    brought the walls under 10 is wrong: that file shows it.
12. **The cottages' front gardens** (`E2/facts-worker.md` §12): the front to the lane's edge is R1 0.31, L2 0.27, L5
    0.21, R5 0.15. R1's and R5's fronts stand at an angle to the lane. No garden or fence geometry exists.
13. **The portal's case 11** (`check-portal.mjs:507-510`) asserts the geometry and texture counts are equal after each
    of three round trips, not an absolute number. New meshes do not break it if they are disposed.
14. **The budgets in the tests:** `STREET_TRIANGLE_BUDGET` 641,310 (`streetLayout.ts:571`, `street-build.test.ts:253`),
    the grass's worst draw 0.98 × 38,515 (`street-grass.test.ts:271`). The build is 574,041 at K1's head.

## Decisions

**(a) The walls.** Three runs, placed by hand as identity objects (`STREET_WALLS` in `streetLayout.ts`):

| Run | Side | `t` | Seen from |
| --- | --- | --- | --- |
| W1 | left | 0.06 to 0.22 | stops 0 and 1 |
| W2 | right | 0.14 to 0.47 | stops 1 and 2 |
| W3 | left | 0.54 to 0.84 | stops 2, 3 and 4 |

Each is 0.055 high (the design's 0.05 to 0.06, 0.65 of Vincent's height) and 0.03 thick. **Lead, against the design's
0.09:** the lane face stands at lateral 0.135. Two facts set it. Frog 3's ring reaches 0.1213 (Fact 6), and a wall
clears the grass 0.012 round its footprint, so a lane face at 0.135 clears from 0.123: no frog's ring loses a blade. At
the design's 0.09 the walls would stand on frogs 1 and 3 and inside every frog's ring. The cost is the grass in front
(Fact 1): blades up to about 0.05 between the lane's edge and the wall, so the wall shows its top courses. Task 4 has
two knobs for that, below. W1 ends 0.11 along the lane before the cypress. W3 starts 0.18 past frog 2's place and runs
behind frog 3, which then sits in the grass in front of the wall. W2 runs behind frog 1 the same way.

A run is swept along the lane at fixed lateral: points every 0.02 of `t` at the lane face (`side × 0.135`) and the back
(`side × 0.165`), at y 0 and the wall's height, each computed once and shared by the quads either side, so no seam
opens on a curve. The lane face, the top, the back and the two ends are underpaint quads (`ctx.underpaint`, class 0,
`src` the source's `SOURCE_CLASSES` value) in the source's darkest 0.4 (`sourceUnderpaint(painting, source, 0.4)`, the
ground's share), so the joints between stones read dark. Each segment's quads are lit as a wall is
(`lightOf(face, ctx.lit, ctx.wallLight)`, `shadeNew`), its face the segment's own.

**(b) The stones.** On the lane face, five courses. A course is 0.011 high: 0.2 of the wall's height, the top of `wallA`
and `wallB`'s measured width (0.12 to 0.2 of the reference height, `streetStrokes.ts:65-77`). A stone's length is 0.6 to
0.9 of the wall's height, hashed per stone: the bottom of the measured length (0.6 to 2.0). So no new 1:1 measurement is
needed. A dab covers 0.85 of its course's height and 0.88 of its length, so the dark base shows as joints. Each course
starts at a hashed offset, so the joints do not line up. The top carries two rows of dabs along its length, each row
0.011 wide. The back and the ends get no dabs (no stop sees them square on).

A dab is `stoneDab` in `streetStrokes.ts`, modelled on `outlineFace`'s inner loop: 3 samples along, 3 columns across,
the taper `1 − 0.4 × |2t − 1|²`, a wobble of 0.25 of the dab's height, lifted `STROKE_LIFT` off its face, the stroke
coordinates `(k / 2, j / 2)` and one seed per dab. Its samples follow the curved face: each sample's centre comes from
the lane's map at its own `t`, not from a chord. Its colour is one texel of the source's rectangle in the painting,
picked by the dab's hash, then lit as its segment is. The dabs go into `ctx.strokes` with class 0 and the source's `src`.
The first source is `plaster`. Task 4 renders `wallA`, `wallB` and `plaster` and picks one.

Signature: `stoneDab(into: FaceStrokes, centres: readonly [Vector3, Vector3, Vector3], up: Vector3, height: number,
colour: Color, seed: number): void`. It appends to `into.arrays` through `pushDrapedRibbon`, pushes 9 `stroke` pairs and
9 `seed` values, and adds 1 to `into.ribbons`.

Cost: the runs are 0.79 of `t`, 1.89 long. About 46 stones a course, 230 on the lane faces and 92 on the tops, 322 dabs
at 8 triangles: about 2,600 triangles, and about 300 for the underpaint.

**(c) The rail.** One, round the front garden of **L2** first (Fact 12: 0.27 from its front to the lane's edge, its
front near parallel to the lane, seen ahead at stop 1 and beside at stop 2). Task 4 may move it to R1, L5 or R5, by
the rule below. The garden lies in L2's own frame (`houseFrame`, the front's corners as `doorStepFrame` reads them):
from its front out toward the lane by 0.12, across the front's width plus 0.02 each side. Three sides: two from the
front's ends outward, and the outer line along the front with an opening the door's width plus 0.02, centred on the
door. Posts at the corners and the opening's sides, and evenly between them at 0.12 or less. A post is a box 0.005
square, 0.05 high, with a top. Two rails between posts, at 0.02 and 0.042, each a box 0.004 square. Each face is a flat
underpaint quad in the `thatch` source's mean (`sourceUnderpaint(painting, 'thatch', 1)`), lit and shaded as a wall
face, class 0, `src` 255.

**Lead, against the design's "under the ink":** no ink on the rail. The ink's measured width is `OUTLINE_FRACTION` 0.14
of its reference height. At the rail's 0.05 that is 0.007, wider than the 0.005 post. The ink would swamp the rail.
Open to Mark at the gate.

The rule for the rail's cottage: every post's foot inside the grass's footprint (`inFootprint`), outside every house,
step, wall and lamp by 0.03, and 0.03 or more from the lane's edge (lateral 0.06).

**(c2) A switch for the proofs.** `buildStreet`'s options gain `lane?: boolean`, default true. With `lane: false` it
builds no wall, rail or lamp, and `report.lane` holds empty lists. `grassChunks` gains a third parameter,
`clearings = streetClearings()`, so a test can pass the steps alone. Both exist only so the tests and the hash tools
can prove K1 unmoved.

**(d) The lamps.** **Lead, against the design's "about seven":** seven, alternating sides, at these places
(`STREET_LAMPS` in `streetLayout.ts`), checked by the Lead's probe (`scratchpad/probe/k2-lamps.mts`):

| Lamp | `t` | lateral |
| --- | --- | --- |
| 1 | 0.10 | +0.11 |
| 2 | 0.24 | −0.11 |
| 3 | 0.38 | +0.11 |
| 4 | 0.52 | −0.11 |
| 5 | 0.65 | +0.11 |
| 6 | 0.79 | −0.11 |
| 7 | 1.00 | +0.20 |

Lamp 7 stands on the square's edge beside the church, past Vincent's line at stop 4 (lateral 0.07). The probe gives:
no lantern inside any station's frame (16:9, 16:10, the phone) closer than 0.35, which keeps a halo from filling a
frame's edge (the probe's first list put lamp 4 at 0.50 and lamp 7 at `t` 0.93: 0.350 from stop 2 and 0.284 from stop
4). No post comes nearer than 0.054 to Vincent's box. The nearest frog to a lamp is 0.131 (lamp 4 to frog 2).
Lamps 3 and 6 stand in front of W2 and W3, 0.023 from the lane face.

A post is a box 0.004 square, 0.13 high (1.2 of a door's 0.11), in `INK`, class 255. The lantern is a box 0.012 square
and 0.016 high on the post's top, its four sides in the `windowLit` source's mean
(`sourceUnderpaint(painting, 'windowLit', 1)`, a lit window's base), unlit as a lit window is, class 2. Its cap is a
pyramid 0.016 square and 0.008 high in `INK`, class 255. **All of it goes into `ctx.underpaint`, not `ctx.windows`**:
`litWindows` reads every class-2 quad of the windows bucket as a lit window (Fact 8), so a lantern there would grow four
window halos. About 20 triangles a lamp.

The report's `lane` gains `lamps: { foot: Vector3; lantern: Vector3 }[]`. `Street.tsx` passes
`build.report.lane.lamps` to `StreetLife` beside `windows`. For each lamp `StreetLife` draws:

- a halo: a `<sprite>` at the lantern's centre, scale `2 × LIFE.halo[0] + 0.012`, a `SpriteMaterial` with the windows'
  texture, `color` `LIFE.glow × LIFE.halo[1]`, additive, `depthWrite: false`, `toneMapped: false`, render order 4.
  `depthTest` stays on: the lantern's near faces clip the sprite's centre, which the painted core carries, and with it
  off a lamp behind a house would glow through the wall.
- a pool: the windows' pool plane, radius `LIFE.pool[0]`, strength `LIFE.pool[1]`, centred on the post's foot, at y
  0.007 (Fact 9: over the square's strokes' top 0.00625 and the lane's), render order 4.

The halos and pools are steady, as the windows' are. Reduced motion changes nothing. Their materials and geometries are
disposed with `StreetLife`'s, as the windows' are.

**(e) The grass.** `streetClearings()` in `streetLayout.ts` returns a list of oriented rectangles
`{ ox, oz, ux, uz, nx, nz, u0, u1, k0, k1 }`. A step is today's frame with `u0, u1` = `ws0, ws1` and `k0, k1` = 0,
`STEP.depth`. A wall is one rectangle per 0.02 segment, from its lane face to its back, overlapping its neighbours by
0.002 along. The rail and the lamps clear no grass: a post stands in the grass. `grassChunks`'s filter
(`streetGrass.ts:141-153`) runs over that list in place of the steps, with the same margin `GRASS.house` 0.012, after
the shuffle, and the chunks' bounds come from the kept blades as today.

**(f) One map from the lane.** `laneAt(t, lat): { x: number; z: number; nx: number; nz: number }` in `streetLayout.ts`,
`(nx, nz)` the +lateral unit normal (Fact 4). The walls, the clearings, the rail's checks and the lamps use it. The three
inline copies stay as they are: changing them is not this slice's work.

**(g) The budget.** The estimate is about 3,500 triangles: the walls 2,900, the rail 300, the lamps 140, the halos and
pools 28. The hard limit is the browser: every point of Task 5's sweep under 1,444,930 on both viewports. K1 left the
walk's worst point 30,183 under it.

## Global constraints

- No new dependency. No new mesh in `Street.tsx`: the furniture goes into the existing buckets.
- The bar: every new surface is painted from a `STREET_SOURCES` rectangle, or takes a flat colour from one under the
  street's ink. No new texture.
- A stroke's width and length stay inside their source's measured range (Decision (b)). A value outside needs a new
  1:1 measurement of the scan's village, in the record before the value is used.
- K1's houses, the church, the land and the diorama do not change. The houses' places, the lane, the stops and the
  frogs do not change. The grass changes only inside the walls' clearings.
- No new motion. No real-time light: a lamp is painted light.
- The triangle ceiling is 1,444,930 at every browser point, both orientations. 60 fps on the desktop, 30 on a
  mid-tier phone, at the Tunables' dpr caps.
- The build's time stays within 10% of K1's (630 to 645 ms, `E/t5/build-time.log`).
- Retune cap: four look passes.

## Review focus

1. **A wall on a frog, or a frog's ring losing blades.** Tests (Task 1): the frog tests unchanged and green, and every
   wall clearing at least 0.0015 outside every frog's `3 × clear` ring.
2. **The grass moving away from the walls.** Test (Task 1): with the walls left out of `streetClearings()`, the grass
   hashes to K1's (`T/grass-hash.ts`). With them in, the kept blades are a subset in the same order.
3. **A lantern read as a lit window.** Test (Task 3): `litWindows(build.windows)` returns K1's count, and every lamp's
   class-2 vertices are in `underpaint`.
4. **A stone outside its measured size, or a dab off its face.** Tests (Task 1): each dab's height and length inside
   Decision (b)'s fractions, and each dab's centre sample within 1e-6 of the face plus `STROKE_LIFT`.
5. **A lamp's pool under the lane or the square.** Test (Task 3): the pool's y is above `SQUARE_TOP`.
6. **K1's build moving.** Tasks 1 and 3: with `lane: false` the build hashes to K1's head (`T/build-hash.ts`). The
   flat panel's hash does not change.
7. **The three calls against the design** (the walls' lateral, no ink on the rail, the lamps' count and places). Read
   the facts they rest on.

---

### Task 0: the base's reads (Lead)

- [ ] Branch and worktree: `git worktree add -b feat/village-lane scratchpad/lane-wt feat/village-craft`, link
  `node_modules`, serve it on port 5206 in the background.
- [ ] K1's head hashes: `WT=<craft-wt> npx tsx T/build-hash.ts` and `T/grass-hash.ts` into `E2/t0/`. K1's sweep and
  captures are the base: `E/t5/tri-sweep.log`, `E/t4/p3/`.
- [ ] Give `T/build-hash.ts` a `LANE` switch: `LANE=0` passes `{ lane: false }`, and an older build ignores the option.
- [ ] Write the brief for Tasks 1 to 3 (`E2/brief-k2-build.md`), lint it, and dispatch it with a one-line pointer.

### Task 1: the walls and the grass (worker)

**Files:**
- Change: `src/scene/streetLayout.ts` (`laneAt`, `STREET_WALLS`, `streetClearings`)
- Change: `src/scene/streetStrokes.ts` (`stoneDab`)
- Change: `src/scene/streetGeometry.ts` (`LANE_CRAFT`, `laneWalls(ctx)` called after the church, `report.lane`, the
  `lane` option)
- Change: `src/scene/streetGrass.ts` (the filter reads its `clearings` parameter)
- Change: `package.json` (`test:sky`: add `scripts/street-lane.test.ts`)
- Test: `scripts/street-lane.test.ts` (new)

**Interfaces:**
- Produces: `laneAt`, `STREET_WALLS: readonly { side: -1 | 1; t0: number; t1: number }[]`, `LANE_CRAFT.wall = { inner:
  0.135, thickness: 0.03, height: 0.055, segment: 0.02, courses: 5, length: [0.6, 0.9], joint: 0.88, cover: 0.85,
  source: 'plaster' }`, `stoneDab`, `streetClearings()`, `report.lane.walls: { side; t0; t1; corners: Vector3[] }[]`
  (each segment's lane-face corners).

- [ ] **Step 1: Write the failing tests** in `street-lane.test.ts`, on the real painting where the frog tests use it:
  - `'laneAt is the map the frogs use'`: for 20 `t` and 3 laterals, `laneAt` equals `frogPlace`'s inline formula to
    1e-12.
  - `'the walls stand on the verges the plan names'`: each reported corner lies at `side × 0.135` or `side × 0.165`
    from the lane (`laneAt` at its `t`) to 1e-9, at y 0 or 0.055.
  - `'no wall touches a house, a step, the lane, Vincent, the cypress or a frog's ring'`: every wall footprint 0.03 or
    more from each house's footprint and step, its lane face past lateral 0.06 + 0.03, 0.03 or more from Vincent's box
    over all 901 walk samples (`vincentBoxCorners`, as `street-frog.test.ts:153` samples it), 0.07 or more from the
    cypress, and its clearing (footprint + 0.012) 0.0015 or more outside every grass frog's `3 × clear × scale` ring.
  - `'a stone is a dab of the measured size'`: every dab has 9 vertices. Its height across is 0.85 × 0.011 to 1e-9
    before the taper. Its length along is 0.88 × [0.6, 0.9] × 0.055. Its middle sample's centre is `STROKE_LIFT` off its
    face to 1e-6.
  - `'the grass clears the walls'`: no blade root within 0.012 of a wall's footprint.
  - `'the grass away from the walls is K1's'`: `grassChunks(painting, undefined, steps)`, with `steps` the steps'
    rectangles alone, gives K1's blades: the grass hash equals `E2/t0/`'s. With the walls, each chunk's kept blades are
    a subset of the steps-only chunk's, in its order.
  - `'the walls cost what the plan says'`: the build's triangles minus the build with `lane: false` is 4,000 or fewer.
- [ ] **Step 2: Run them**: `node --test scripts/street-lane.test.ts`. Expected: FAIL (no `laneAt`).
- [ ] **Step 3: Build Decisions (a), (b), (e) and (f)**, and add the test file to `test:sky`.
- [ ] **Step 4: Run the suite**: `npm run -s test:sky 2>&1 | tee E2/t1/test-sky.log`. Expected: all PASS, the frog
  tests among them, and `grep -c "a stone is a dab" E2/t1/test-sky.log` is at least 1.
- [ ] **Step 5: K1 unmoved without the furniture**: `LANE=0 WT=$PWD npx tsx T/build-hash.ts` gives K1's hash
  (`E2/t0/`). Record it and the hash with the walls in `E2/t1/hash.txt`.
- [ ] **Step 6: Commit** by pathspec: `feat(street): dry-stone walls on the three open verges, their stones as dabs (K2
  task 1)`.

### Task 2: the rail (worker)

**Files:**
- Change: `src/scene/streetLayout.ts` (`STREET_RAIL = { house: <L2's index>, depth: 0.12, margin: 0.02, gap: 0.02 }`)
- Change: `src/scene/streetGeometry.ts` (`LANE_CRAFT.rail = { post: 0.005, height: 0.05, rails: [0.02, 0.042], bar:
  0.004, spacing: 0.12 }`, `gardenRail(ctx)`, `report.lane.rail: { posts: Vector3[]; opening: [Vector3, Vector3] }`)
- Test: `scripts/street-lane.test.ts`

- [ ] **Step 1: Write the failing tests:**
  - `'the rail closes the front garden, open at the door'`: posts at the garden's corners and the opening's sides,
    neighbours 0.12 or less apart, the opening's width the door's plus 0.02 and centred on the door to 1e-9.
  - `'the rail stands in the grass, clear of everything'`: Decision (c)'s rule for every post foot.
  - `'the rail has no ink'`: no vertex of the rail's range in `outlines`.
- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Build Decision (c).**
- [ ] **Step 4: Run the suite** into `E2/t2/test-sky.log`. Expected: all PASS.
- [ ] **Step 5: Commit**: `feat(street): a wooden rail round L2's front garden (K2 task 2)`.

### Task 3: the lamps (worker)

**Files:**
- Change: `src/scene/streetLayout.ts` (`STREET_LAMPS`)
- Change: `src/scene/streetGeometry.ts` (`LANE_CRAFT.lamp = { post: 0.004, height: 0.13, lantern: [0.012, 0.016], cap:
  [0.016, 0.008] }`, `laneLamps(ctx)`, `report.lamps`)
- Change: `src/scene/streetLife.tsx` (the `lamps` prop, a halo sprite and a pool per lamp, their disposal)
- Change: `src/scene/Street.tsx` (passes `build.report.lamps`)
- Test: `scripts/street-lane.test.ts`

- [ ] **Step 1: Write the failing tests:**
  - `'seven lamps alternate sides'`: `STREET_LAMPS` is Decision (d)'s table, the signs alternate.
  - `'no lantern fills a stop's frame'`: for each lamp, station and aspect (16:9, 16:10, 390 × 844 portrait), a lantern
    inside the frame is 0.35 or more from the camera (`stationPose`, as `scratchpad/probe/k2-lamps.mts` reads it).
  - `'no lamp touches Vincent, a frog, a house, a wall or the rail'`: each post 0.03 or more from Vincent's box over
    the 901 samples, 0.06 or more from each frog, 0.02 or more from every wall, and outside every house, step and the
    rail by 0.03.
  - `'a lantern is not a lit window'`: `litWindows(build.windows).length` equals the count in the build with
    `lane: false`. Each lamp's class-2 vertices are in `underpaint`.
  - `'a lamp's pool lies over the lane's strokes'`: the pool's y exceeds `SQUARE_TOP`.
- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Build Decision (d).**
- [ ] **Step 4: Run the suite** into `E2/t3/test-sky.log`. Expected: all PASS.
- [ ] **Step 5: K1 unmoved without the furniture**, again: `LANE=0` gives K1's hash, into `E2/t3/hash.txt`.
- [ ] **Step 5b: The browser's checks**, against port 5206: `check-portal.mjs` (case 11's counts equal over three trips)
  and `check-reduced-motion.mjs`, their output in `E2/t3/`.
- [ ] **Step 6: The mutation proofs**, each restored by `git checkout -- <file>` and the suite green after: the walls'
  lane face at 0.09 (the frog-ring test fails), the lanterns into `ctx.windows` (the lit-window test fails), the pool at
  y 0.003 (the pool test fails), the filter given the walls as one unsegmented rectangle from `t0` to `t1` (the
  clear-the-walls test fails on a curved run). Each in `E2/t3/mutation-*.md` with the failing test's output.
- [ ] **Step 7: Commit**: `feat(street): seven lamps along the lane, their halos and pools the windows' (K2 task 3)`.

### Task 4: the look passes (Lead)

Each pass captures stops 0 to 4 on both viewports beside K1's (`T/k1-look.sh`, rewritten for port 5206 and `E2/t4/`),
looks at 1:1, and writes the pass into the record `tasks/2026-10-26-village-craft-k2.md` and `tasks/lessons.md`. The
knobs, inside their ranges:

- The walls: height 0.05 to 0.06, lane face 0.135 to 0.15, the stones' source `wallA`, `wallB` or `plaster`.
- The grass in front of a wall: its clearing margin on the lane side 0.012 to 0.03, kept 0.0015 outside every frog's
  ring. This shows more of a wall that the grass buries.
- The rail: its cottage, R1, L2, L5 or R5, by Decision (c)'s rule. A clearing along each rail span, margin 0.012 to
  0.03, if the grass buries it.
- The lamps: each place within ±0.03 of `t`, then the tests re-run. The halo's scale 0.6 to 1 of the windows'.

The anti-goals are the test: no runway of lamps, no toy town, no clutter, the far read at stop 0 still the painting's.
Cap: four passes. Then stop and ask Mark.

### Task 5: the gate's runs (Lead)

- [ ] `git status --short` empty. `npx tsc -b`, `npm run -s lint`, `npm run -s test:sky`, `npm run -s build`.
- [ ] Against port 5206: `check-street-grass.mjs` (every case), `check-street-walk.mjs`, `check-street-rotation.mjs`,
  `check-street-cypress-hang.mjs`, `check-portal.mjs`, `check-reduced-motion.mjs` (`T/k1-gate.sh` for the new port).
- [ ] The palette gate at the last pass against K1's (`T/k1-colour.sh`): the walls' and the windows' ΔE, and how far
  the walls, the stones and the lanterns move them.
- [ ] The frame time at stops 0 and 3, five rounds, K2 on 5206 beside K1 on 5205 (`T/k1-perf.sh` for the ports), the
  perf marker made first.
- [ ] The browser's sweep, K1's points: every point under 1,444,930.
- [ ] The build's time against K1's (`T/street-tri-split.ts` on both worktrees).
- [ ] The gate's sheet: the walls, the rail and two lamps at 1:1, and stop 0's far read beside the painting's village.

### Task 6: review and the record (Lead)

- [ ] Codex's branch review (a brief file and a one-line pointer), each finding answered in the record. The
  Consultant if Codex's usage has run out.
- [ ] The record, the Tunables entry in `CLAUDE.md`, `tasks/lessons.md`, the pickup in `tasks/todo.md`.
- [ ] Push `feat/village-lane` for a Vercel preview when Mark has passed K1, and send him the link and the sheet.
