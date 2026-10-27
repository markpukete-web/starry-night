# The village lived in, K3: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Revision 1, part 1 (2026-10-27, 22:05).** The worker's buildability read (W01 to W11, `E3/plan-build-worker.md`) is
folded in. The table below says where each finding is answered. Codex's correctness read is pending and folds into
part 2. Revision 0 is `f04c0e8`, written from the approved design and Mark's three calls of 21:11: W2 ends at `t`
0.41, a wooden pail by L4's door, the far houses' paths at full length.

Four of this plan's decisions depart from the design's text, each for a fact the design did not have. The plaster
measurement is done and gives one outcome, not three (Decision (d)). The three objects clear the grass round them, as
the steps do, or the grass buries them (Decision (c)). The pot plant's clump is built outside `grassChunks`, so K2's
grass tests keep their hash (Decision (g)). K2's subset test is amended, because a path's clearing can empty a whole
chunk (Decision (g)). All four are open to Mark at the gate.

**Goal:** Every front door gets a trodden path to the lane, three doors get a sign of life (a bench, a pot plant, a
pail), and the four plaster houses take the stroke length the scan shows.

**Architecture:** No new mesh in `Street.tsx`'s build. The paths are `clad` faces of the lane's own kind, in the
`ground` bucket, at a quarter of the lane's cover. The objects are flat quads in `underpaint` and ink in `outlines`,
built as the rail is. The grass's clearings list grows by one rectangle per path leg and one per object. The plant is
one more grass chunk, built by its own function and drawn by `StreetGrass.tsx` lifted to the pot's top. The plaster
row's factor rides `WallPaint`. A `lived` build option turns all of it off, so Task 1's hashes prove K2's street
unmoved at every later task.

**Tech stack:** three.js, the street's builders (`clad`, `polygon`, `ink`, `lightOf`, `shadeNew`, `laneAt`,
`doorStepFrame`), the grass's `clump`, `node --test`, the check scripts. No new dependency.

**Spec:** `docs/superpowers/specs/2026-10-26-village-lived-in-design.md`, Decisions (a) to (f) and "Mark's three
calls", with its Constraints and Anti-goals.

## What revision 1 changed

| Finding | The answer | Where |
| --- | --- | --- |
| W01 | The distance between two convex polygons is written out | Task 2, the clearance test |
| W02 | `index` is the house's index in `STREET_HOUSES`, for the frame, the door, the seed and the mirror | Decision (a) |
| W03 | The candidate path in the slid-end test keeps its first leg. The grid's bounds are written out | Task 2 |
| W04 | `flatPolygon` takes any convex polygon. A tub's top is one call with eight corners | Decision (c) |
| W05 | The plant's sphere is centred at `(x, 0.02, z)` in the chunk's own frame. The mesh's `position-y` lifts it | Decision (g), Task 3 |
| W06 | An object's `box.height` is its full height: the pail's 0.026 with its handle | Task 3 Interfaces |
| W07 | The bench's blocks are centred across the plank's depth | Decision (c) |
| W08 | `clad` derives `lengthScale` itself and forwards it to `traceFace`. Its `paint` option does not change | Task 4 Interfaces |
| W09 | `StreetBuild['report']['lived']` is typed, and `buildFlatPanel` initialises it empty | Task 2 Interfaces |
| W10 | `T/` is the tools folder written out. The worktree holds no `T` | Session mapping, Task 1 |
| W11 | `objectClearings(): OrientedBox[]` is a function returning `[]` until Task 3 | Task 2 Files |

## Session mapping

Checked against `herdr agent list` on 2026-10-27 at 21:25: Lead Claude `w4:p1`. Worker Gemini 3.8 (`agy`) `w4:p5`,
for Tasks 1 to 4. Reviewer Codex `w4:p4`. The Consultant's pane is not open tonight. The Lead reads each quota in
Quota Finch's cache before a dispatch.

K3's code goes on `feat/village-lived-in`, branched from main at `08c0254` (K2 merged in #31, then the design's
record). The worktree is `lived-wt` in session `49dba370`'s scratchpad, `node_modules` and `reference/derived` linked
to the main checkout's, served on port 5206. The base for the colour and frame-time gates is the main checkout at
`1b5e62f` (K2's head) on port 5205. One dev server runs at a time during the mutation proofs (K2's lesson: two servers
re-optimise each other's dependency cache). The evidence goes in
`/Users/markma/Projects/starry-night/scratch/village-craft-2026-10-25/k3/` (`E3/` below), the tools in
`/Users/markma/Projects/starry-night/scratch/village-craft-2026-10-25/tools/` (`T/`). The worktree holds no `T`: a
step that says `T/build-hash.ts` means that folder's file, written out (W10). Nothing is pushed before the Lead's gate.

## The facts the plan rests on (read at `08c0254`)

1. **The plaster walls carry strokes 0.35 to 0.75 of their height, median 0.47, stacked in two or three tiers.** The
   Lead's measurement on the scan is `E3/t0/plaster/measurement.md`, with the crops at 1:1, 3× and 6× beside it. The
   source's own wall (wall B, x 2124 to 2148, y 2609 to 2659 of the 3840 scan) reads 0.37 to 0.60. The row in
   `SOURCE_STROKES.plaster` is 0.5 to 1.0 of the reference height: one or two tiers. The widths read 0.10 to 0.15, as
   the row has them.
2. **The plaster houses' wall ribbons at K2's head** (`T/k3-plaster-count.mts`): L1 113, L4 85, R2 104, R4 134, 436 in
   all over 32 faces. The church's nave 355, belfry 150, spire 224. `faceConfig` sets the count as `cover / area`,
   `area` from the row's mean width and the geometric mean of its lengths (`streetStrokes.ts:263-268`), so a shorter
   row raises the count unless the cover falls with it.
3. **The lane's path** (`streetGeometry.ts:972-992`): 13 `clad` faces of owner `path` (12 segments and the square),
   kind `path`, source `field`, `refHeight` 0.2, 289 ribbons, the base `GROUND_BASE_SHARE` 0.4 of the field lifted
   `PATH_LIFT.share` 0.5 toward `hillsCrest`: (0.0589, 0.0768, 0.0922) in linear RGB after a light of 1. The strokes
   take the same lift per sample (`streetStrokes.ts:382`). A face's `cover` is 1 for every kind but `wall`
   (`streetGeometry.ts:286`), and the report records `density` and `cover` on each face.
4. **The build test's density rule** (`street-build.test.ts:239-242`): every face outside the houses, the ground tiles
   and the church's hidden list has `density` 1. A door path at `density` 0.25 fails it. So the quarter cover goes
   through a `cover` argument, not the density.
5. **A path's clearing can empty a chunk.** A band-0 chunk spans 0.025 in `t` (0.06 along the lane) by lateral 0.052
   to 0.2. A path's clearing is its width plus 0.024 (0.072 to 0.100) and crosses the band. `grassChunks` drops a chunk
   with no blade left (`streetGrass.ts:159`). K2's test `the grass away from the walls is K1's`
   (`street-lane.test.ts:481-501`) asserts equal chunk counts and matches chunks by index, so it fails once a chunk
   goes. The steps-only hash `def5470cc15817ba` it also asserts does not move.
6. **The grass by the houses stands 0.016 to 0.07 high.** Beyond lateral 0.152 the verge factor is 1
   (`streetGrass.ts:117-118`), a clump 0.016 to 0.056, a blade 0.75 to 1.25 of it. R4's step is 0.135 from the lane's
   edge, L4's 0.340. A pot 0.022 high or a pail 0.018 high stands in grass to its rim. The frogs sit in gaps the
   clearings leave, ringed by blades.
7. **The lane's walls in the tests.** `the walls stand on the verges the plan names` (`street-lane.test.ts:72`) expects
   8, 17 and 15 segments. `the grass clears the walls` (`:437`) writes W2 as the literal `[1, 0.14, 0.47]`. At `t1` 0.41
   W2 has 14 segments. `wallClearings()` reads `STREET_WALLS`, so the grass follows the constant.
8. **The budget.** K2's gate: the walk's worst sampled point 1,412,657 (desktop, `t` 0.40) under the ceiling 1,444,930,
   32,273 to spare. The design's Fact 5: the ten paths at the scaled reference and cover 0.25 cost 28,736 triangles,
   about 11% less once L5's path goes and R5's ends at the paving: about 25,600. The objects about 400 in all, the
   plant 5 to 9 blades at 8 triangles. The grass the paths clear gives some back at the worst point, measured in the
   browser. Mark's "full length" call takes the far-path fade out of the levers. The lever left is the paths' cover down
   to 0.15. Then stop and ask Mark.
9. **The rail's builder** (`streetGeometry.ts:1435-1532`) draws every face through a local `addQuad(corners, normal,
   refHeight, seed)`: a flat quad in `underpaint`, class 0, `src` 255, lit by `lightOf` and shaded by `shadeNew`, in the
   `thatch` source's mean. `ink(ctx, owner, refHeight, edges, seed)` (`:297`) draws a ribbon per edge `[a, b, normal]`
   in `outlines`, `OUTLINE_FRACTION` 0.14 × `refHeight` wide. `PALETTE.villageCool` is `#36403f`.
10. **The grass's base dabs lie at `GRASS.baseY` 0.001** (`grassBaseStrip`, `streetGeometry.ts:1001-1020`), under a
    path's face at 0.002. Nothing pokes through a door path.
11. **The palette gate's `path` class is one id colour** (`check-street-colour.ts:294`): the lane's path and the door
    paths together. At a quarter of the cover more base shows per unit of area, so the class's mean moves toward the
    base. The gate reports it beside K2's. The door paths are read at 1:1 beside the lane's (the design's gate list).
12. **`StreetGrass.tsx` builds one instanced geometry per chunk** (`:92-150`), its sphere from `chunk.sphere`, its draw
    count each frame from `grassDrawCount` (`streetGrass.ts:212-218`: the share `min(1, (max(r0, latIn) / max(r0,
    d))²)`). `__grassCount` is the sum of the chunks' blades. `check-street-grass.mjs` reads it as a precondition (cases
    1 and 11) and asserts it undefined with `?grass=0` (case 10). No test asserts its value.
13. **The hash tools.** `T/build-hash.ts` and `T/grass-hash.ts` read `LANE=0`. Task 0 adds `LIVED=0`: the build with
    `{ lived: false }`, the grass with `[...stepClearings(), ...wallClearings()]`.
14. **The design's ends and legs** (its Facts 2 to 4 and Decision (a), the probes `k2/probe/codex-k3-route.mjs` and
    `lead-k3-r2gap.mjs`): the table in Decision (a). A door more than 30° off the line to its end gets two legs.

## Decisions

**(a) The paths.** Layout data in `streetLayout.ts`, beside `STEP`:

```ts
export const LIVED_PATH = { margin: 0.02, lateral: 0.06, leg: 0.08, clear: 0.03, cover: 0.25, baseInset: 0.3 } as const
export const STREET_PATHS = [
  { house: 'L1', end: 0.265, legs: 1 },
  { house: 'L2', end: 0.341, legs: 2, first: 0.11, margin: 0 },
  { house: 'L3', end: 0.499, legs: 2 },
  { house: 'L4', end: 0.875, legs: 2 },
  { house: 'R1', end: 0.062, legs: 2 },
  { house: 'R2', end: 0.457, legs: 2 },
  { house: 'R3', end: 0.627, legs: 1 },
  { house: 'R4', end: 0.71, legs: 1 },
  { house: 'R5', end: null, legs: 1, first: 0.056 },
] as const
```

L5 has none: its door opens on the square. `end` is the lane `t` of the path's last point, on the lane's edge at
lateral `side × 0.06`. R5's `end` is null: its one leg runs `first` 0.056 along its door's normal to the paving's edge.
A path's width is `doorOf(h, i).w × h.w + margin`, `margin` 0.02 unless the entry sets it (L2: the door's width, 0.048,
through K2's gateposts). A path's points: `S` the step's front centre, `(ox, oz) + door.cu × W × u + STEP.depth × n` in
`doorStepFrame`'s terms. One leg: `S` to `E = laneAt(end, side × 0.06)`. Two legs: `S` to `B = S + first × n`
(`first` is `LIVED_PATH.leg` 0.08 unless the entry sets it. L2's 0.11 is `STREET_RAIL.depth + 0.02 − STEP.depth`, 0.02
past the posts), then `B` to `E`.

`doorPathLegs(): { house: string; index: number; width: number; end: number | null; points: [number, number][] }[]`
returns the nine paths in `STREET_PATHS`'s order, `points` the two or three points above as `[x, z]`. `index` is the
house's index in `STREET_HOUSES` (L1 0, L2 1, L3 2, L4 3, R1 5, R2 6, R3 7, R4 8, R5 9), found by `findIndex` on `id`.
`doorStepFrame(h, index)` and `doorOf(h, index)` take it, as the steps do (`doorOf` reads its parity for a cottage's
door). The seed and the mirror below take the same index (W02).
`pathClearings(): OrientedBox[]` returns one rectangle per leg: origin the leg's start, `u` the unit vector to its end,
`n` the perpendicular `(−uz, ux)`, `u0` 0, `u1` the leg's length, `k0` `−width / 2`, `k1` `width / 2`. The filter adds
`GRASS.house` 0.012 as it does for the steps and the walls.

**The paint.** `doorPaths(ctx)` in `streetGeometry.ts` clads each leg: `orientedFace(origin, u, v, below, …)` with
`origin = from − (width / 2) × across` at y 0.002, `u = to − from`, `v = width × across`, `across = (−uz, 0, ux)`
normalised, `below` (0, −1, 0), kind `path`, source `field`, `refHeight = STREET.wallRef × width / 0.12`, seed
`0x7900 + index × 4 + leg`, `mirror` `index % 2 === 1`, owner `path`, name `door L1 leg 0`. The inset is
`[0, LIVED_PATH.baseInset × width]`: the base runs the leg's full length and 0.4 of its width across. The cover is
`LIVED_PATH.cover` 0.25 through `clad`'s new option (Decision (f)), the density 1. Two legs overlap in a wedge at the
bend. The lane's own segments overlap by 0.02 in `t` at the same y with the same base colour, and Mark passed them, so
the wedge takes no mitre: `facePolygon` draws parallelograms only. At cover 0.25 the doubled strokes there are 0.5.

A leg meets the lane's edge square to its own direction, not to the lane's. Where the leg is not perpendicular to the
lane, one end corner lies on the lane and the other short of the edge by `(width / 2) × tan φ`. The test holds both
corners within 0.015 of lateral 0.06. No overlap onto the lane: a door path's strokes at the lane's lift levels over the
lane's would z-fight.

**(b) W2 ends at `t` 0.41** (Mark, 2026-10-27): `STREET_WALLS[1].t1` 0.47 → 0.41, 14 segments. R2's path lands at its
nearest point, `t` 0.457, two legs, 0.344 long, 0.031 clear of the wall's end (`lead-k3-r2gap.mjs`). Task 1 does this
alone and records K3's base hashes: `B1` the build, `G1` the grass. K2's `496b3f70b495aac0` and `70767bb72eaed35b` do
not survive the change (the wall's dabs and its clearings move), so the proof of K2 unmoved at Tasks 2 to 4 is
against `B1` and `G1`, with `lived: false`.

**(c) The signs of life.** Layout in `streetLayout.ts`:

```ts
export const STREET_OBJECTS = [
  { kind: 'bench', house: 'L2', a: 0.19, k: 0.025, side: 1 },
  { kind: 'pot', house: 'R4', a: 0.2, k: 0.021, side: 1 },
  { kind: 'pail', house: 'L4', a: 0.196, k: 0.018, side: 1 },
] as const
```

`(a, k)` is the object's footprint centre in the house's `doorStepFrame` (`a` along `u`, `k` out along `n`). `side` is
the side of the door along `u` the object stands on. The look pass may set it to −1, which mirrors `a` about the door's
centre: `a' = 2 × door.cu × W − a`. The numbers: each object's near edge stands 0.01 from the wall (`k − depth / 2 =
0.01`) and 0.01 past its house's path strip. L2's door is centred at `a` 0.102 and its path 0.048 wide (`a` 0.078 to
0.126), so the bench's plank, 0.10 long, runs `a` 0.14 to 0.24: 0.014 past the path, 0.08 short of the rail's side at
`a` 0.32, and `k` 0.01 to 0.04 under the rail's line at 0.12. R4's and L4's doors are centred at 0.14, their paths
0.076 wide (`a` 0.102 to 0.178). The pot, 0.022 across, stands at `a` 0.2 (0.189 to 0.211), the pail, 0.016 across, at
0.196 (0.188 to 0.204).

The sizes, in `LIVED_CRAFT` in `streetGeometry.ts`:

- **The bench:** a plank 0.10 long (along `u`), 0.03 deep, 0.012 thick, its top at y 0.037, on two blocks 0.012 square
  and 0.025 high, each 0.01 in from the plank's end and centred across its depth (0.009 from each long edge, W07). Wood as the rail's: `sourceUnderpaint(painting, 'thatch', 1)`. No
  ink (the rail's reason: at the plank's 0.012 the ink would be 0.0017, at the blocks' 0.025 0.0035, a third of a
  block). Every face a flat quad, lit and shaded as a wall face.
- **The pot:** an eight-sided tub 0.022 across (flat to flat) and 0.022 high, its eight sides and its top in
  `PALETTE.villageCool` (`#36403f`), each side one `flatPolygon` call with four corners, the top one call with eight
  (W04). The rim: `ink` round the top's eight edges at `refHeight` 0.022, so the
  ink is 0.0031 wide, 0.14 of the pot as a door's frame is of a wall. The plant stands on the top (Decision (g)).
- **The pail:** an eight-sided tub 0.016 across and 0.018 high in the rail's wood, each side one `flatPolygon` call, its
  top one call with eight corners in the wood at 0.5 (the inside in shadow), under the rim's ink. Two hoops: `ink` round the eight edges at
  y 0.005 and y 0.014, `refHeight` 0.018, the ink 0.0025 wide. A handle: a half-circle of radius 0.008 over the top
  in the plane across `u`, six straight edges from rim to rim, `refHeight` 0.018, in `ink`. Each edge's normal is the
  side's for a hoop and `u` for the handle.

All of it goes into `underpaint` (class 0, `src` 255) and `outlines`, through one module helper lifted from the rail:
`flatPolygon(ctx, corners: Vector3[], normal: Vector3, colour: Color, refHeight: number, seed: number): void`, the
rail's `addQuad` with the colour as an argument and any convex polygon as its corners, fanned from the first corner as
`polygon` does (W04). The face it builds for `lightOf` and `shadeNew` has `u` from the first corner to the second and
`v` from the first to the last: `lightOf` reads the normal only, and `wallShade` returns 1 for a face whose origin
stands above y 0.01, so the octagon tops take no shade. The rail calls it with its four corners and its wood, byte for
byte as today. The rail's vertices do not move (Task 3's test). Seeds `0x7a00 + i × 32` for object `i`.

**Lead, against the design's "the grass is cleared along the path":** the grass is also cleared round each object,
one rectangle per object in `objectClearings()`: the footprint (the bench's plank, a tub's square) in the house's frame,
`u0, u1` and `k0, k1` its extents, the filter's margin 0.012. Fact 6: without it a tub stands in grass to its rim. The
object then stands in a gap ringed by blades, as a frog does. Open to Mark at the gate.

**(d) The plaster's strokes.** The measurement is done (Fact 1): the walls carry shorter strokes than the row, in two
or three tiers. The design's outcome 2 applies. `WallPaint` gains `plasterLength?: number`. `WALL_PAINT.plasterLength`
is 0.65. `KEPT_PAINT` has none. In `clad`, for a face of kind `wall` and source `plaster` when `ctx.lived` is true,
`lengthScale = ctx.wallPaint.plasterLength ?? 1`, else 1. The row becomes 0.325 to 0.65 of the reference height, inside
what the scan shows (0.35 to 0.75). The cover for such a face is `ctx.wallPaint.cover × lengthScale`, so the ribbon
count holds (Fact 2: the count rises as 1 / 0.65 with the shorter row and falls as 0.65 with the cover). The church
clads under `KEPT_PAINT` (`streetGeometry.ts:875-925`), so its nave, belfry and spire keep today's row, as does the flat
panel. The seam: `traceFace`'s options gain `lengthScale?: number`, passed to `faceConfig(face, count, rows,
lengthScale = 1)`, which multiplies `minLength` and `maxLength` by it before the area. The report's faces gain
`lengthScale: number`. The look pass's knob is 0.5 to 0.8.

**(e) The budget.** The reserve is 32,273 at K2's worst point (Fact 8). The paths about 25,600 at cover 0.25, the
objects about 400, the plant under 100, the plaster 0 by Decision (d). The grass the clearings take out gives some
back. The hard limit is the browser's sweep: every point under 1,444,930 on both viewports. If the sweep fails, the
paths' cover goes down to 0.15 (about 15,400). If that fails, stop and ask Mark.

**(f) The switch, and `clad`'s option.** `buildStreet`'s options gain `lived?: boolean`, default true, and `Context`
gains `lived`. With `lived: false` it builds no path and no object, and the plaster row is unscaled, so the build is
Task 1's `B1`. `report.lived` is then `{ paths: [], objects: [] }`. `grassChunks`'s default clearings are
`streetClearings()`, which becomes `[...stepClearings(), ...wallClearings(), ...pathClearings(), ...objectClearings()]`.
A test or a tool passes the first two for K2's grass. `clad` gains a trailing option: `clad(ctx, owner, name, face,
faceDensity = 1, [insetU, insetV] = [0, 0], shadeAs = face, paint: { cover?: number } = {})`. The cover is
`paint.cover ?? (face.kind === 'wall' ? ctx.wallPaint.cover × lengthScale : 1)`, reported in the face's `cover` as
today. `T/build-hash.ts` and `T/grass-hash.ts` read `LIVED=0` (Task 0).

**(g) The plant, and the grass's tests.** `streetGrass.ts` exports `PLANT = { scale: 0.7, y: 0.022, latIn: 10, sphere: [0.02,
0.06] }` and `plantChunks(painting: ImageData2D): GrassChunk[]`: one chunk for the pot. Its blades are
`clump(mulberry32(0x7a40), painting, x, z, PLANT.scale × GRASS_BLADE.height)` at the pot's top centre `(x, z)`, each
blade's `halfWidth` then multiplied by `PLANT.scale` so the blade keeps the grass's proportion (the design names the
height only. A blade 0.02 long at the grass's half-width is 3 to 6 times as long as wide, fatter than the grass's 5 to
7.5). `GrassChunk` gains `y?: number`, the plant's `PLANT.y` 0.022, the pot's height (the test holds it equal to
`LIVED_CRAFT.pot.height`: `streetGeometry.ts` imports `streetGrass.ts`, so the grass does not import the craft back). `latIn` is `PLANT.latIn` 10, so
`grassDrawCount` draws every blade at any distance (the share is `min(1, (10 / d)²)`). `box` is the roots' bounds,
`reach` the blades' largest `bladeReach` at 0.5, `sphere` centred at `(x, PLANT.sphere[0], z)` with radius
`PLANT.sphere[1]`, in the chunk's own frame: `StreetGrass.tsx` sets it as the geometry's bounding sphere, and three
applies the mesh's `position-y` to it at culling time, so the centre is not lifted twice (W05). The pot's `(x, z)` comes from `STREET_OBJECTS` through `objectPlaces()` in `streetLayout.ts`:
`{ kind; house; index; centre: [number, number]; frame: ReturnType<typeof doorStepFrame> }[]`.

`StreetGrass.tsx` builds `plants = useMemo(() => plantChunks(painting))`, concatenates them after `chunks` for the
geometries, the draw counts, `__grassCount` and the disposal, and renders each plant's mesh with `position-y` its `y`.
The sphere is in the chunk's own frame, so the mesh's translation lifts it with the blades. With `?grass=0` nothing
mounts, so case 10 holds. The trail texture covers the pot (its root is inside the grass's footprint), so the hand pushes
the plant as it does the verge.

The grass's tests: K2's `the grass away from the walls is K1's` keeps its steps-only hash and drops its equal-count
assertion. Its subset check matches each default chunk to the steps-only chunk that holds the default's first blade
(`x`, `z`, `seed` equal), then walks it in order as today. K3's `the grass away from the paths is K2's` does the same
with `[...stepClearings(), ...wallClearings()]` against `G1`.

## Global constraints

- No new dependency. No new mesh in the build. The plant's mesh is `StreetGrass`'s, as the chunks' are.
- The bar: every new surface is painted from a `STREET_SOURCES` rectangle or takes a flat colour from `palette.json`
  under the street's ink. A path takes the lane's paint and nothing of its own. No new texture.
- A stroke's width and length stay inside their source's measured range, or inside the Lead's new 1:1 measurement in
  the record (Fact 1 for the plaster). A door path's reference height is the lane's scaled by its width, so the field's
  fractions stay inside the measured row.
- K2's walls, rail and lamps do not move but for W2's end (Task 1). The houses' places, the lane, the stops, the frogs
  and the church do not change. The grass changes only inside the new clearings.
- No new motion in time. The plant moves as the grass does, under the wind and the hand, nothing more.
- The triangle ceiling is 1,444,930 at every browser point, both orientations. 60 fps on the desktop, 30 on a mid-tier
  phone, at the Tunables' dpr caps.
- The build's time within 10% of K2's.
- Retune cap: four look passes.

## Review focus

1. **A strip's end on a curve leaving a wedge of verge at the lane's edge.** Test (Task 2): both end corners within
   0.015 of lateral 0.06.
2. **A path's clearing emptying a chunk, and K2's grass tests failing on the count.** Test (Task 2): the subset tests
   match by the first blade, and the steps-only hash and `G1` still hold.
3. **The plant drawn at y 0, or culled because its sphere was not lifted.** Test (Task 3): the chunk's `y` is the
   pot's height, its sphere centred above it, and `StreetGrass.tsx` lifts the mesh by `y` (the Lead's capture at stop 4
   shows the plant on the pot).
4. **The plaster factor reaching the church through `pale`.** Test (Task 4): the church's, belfry's and spire's faces
   report `lengthScale` 1.
5. **An object buried in the grass.** Test (Task 3): no blade root within 0.012 of an object's footprint.
6. **The path class's ΔE at the colour gate.** No test: the gate reports it beside K2's, and the door paths are read at
   1:1 beside the lane's (Task 6).
7. **A literal 0.47 left in a test or a probe.** Task 1 makes both lane tests read `STREET_WALLS`. The design's probes
   in `k2/probe/` are frozen records of the design round and are not re-run.

---

### Task 0: the base's reads (Lead) — mostly done

- [x] Branch and worktree: `feat/village-lived-in` at `08c0254`, the worktree `lived-wt`, `node_modules` and
  `reference/derived` linked. The dev server on 5206 is not started yet.
- [x] The plaster measurement: `E3/t0/plaster/measurement.md` and its crops (Fact 1).
- [x] The plaster houses' ribbon counts at K2's head: `T/k3-plaster-count.mts` (Fact 2).
- [x] `T/build-hash.ts` reads `LIVED=0` and passes `{ lived: false }`. `T/grass-hash.ts` reads `LIVED=0` and passes
  `[...stepClearings(), ...wallClearings()]`. An older tree ignores both: on `08c0254` they give K2's hashes. `T/k3-gate.sh`,
  `k3-colour.sh`, `k3-perf.sh`, `k3-look.sh`, `k3-walk.sh` and `k3-mutations.sh` from K2's, for `lived-wt` on 5206, the
  base (the main checkout at `1b5e62f`) on 5205 and `E3/`. The look pairs are against K2's pass 5 (`E/k2/t4/p5`).
- [ ] Write the brief for Tasks 1 to 4 (`E3/brief-k3-build.md`), lint it, and dispatch it with a one-line pointer.

### Task 1: W2 ends at the gateway (worker)

**Files:**
- Change: `src/scene/streetLayout.ts` (`STREET_WALLS[1].t1` 0.41)
- Change: `scripts/street-lane.test.ts` (`the walls stand on the verges the plan names`, `the grass clears the walls`)

**Interfaces:**
- Produces: `STREET_WALLS` `[{ side: -1, t0: 0.06, t1: 0.22 }, { side: 1, t0: 0.14, t1: 0.41 }, { side: -1, t0: 0.54,
  t1: 0.84 }]`. Nothing else changes.

- [ ] **Step 1: Make the tests pin the new wall.** `the walls stand on the verges the plan names` asserts the three
  runs' sides, `t0` and `t1` equal the list above to 1e-9 and their segment counts are 8, 14 and 15. `the grass clears
  the walls` builds its footprints from `STREET_WALLS` instead of its literal list.
- [ ] **Step 2: Run them**: `node --test scripts/street-lane.test.ts`. Expected: `the walls stand on the verges` FAILS
  (17 segments against 14). The grass test passes (it follows the constant).
- [ ] **Step 3: Set `t1` to 0.41.**
- [ ] **Step 4: Run the suite**: `npm run -s test:sky 2>&1 | tee E3/t1/test-sky.log`. Expected: all PASS, the frog tests
  among them (W2's last three segments stood behind no frog).
- [ ] **Step 5: K3's base hashes**: `WT=$PWD npx tsx T/build-hash.ts` and `WT=$PWD npx tsx T/grass-hash.ts` (`T` is
  `/Users/markma/Projects/starry-night/scratch/village-craft-2026-10-25/tools`, W10), into
  `E3/t1/hash.txt` as `B1` and `G1`, with the triangle count. Expected: the build under 576,295 (three segments of
  stones fewer) and the grass with more blades than K2's 17,010.
- [ ] **Step 6: Commit** by pathspec: `feat(street): W2 ends at t 0.41, where R2's path meets the lane (K3 task 1)`.

### Task 2: the paths and the grass's clearings (worker)

**Files:**
- Change: `src/scene/streetLayout.ts` (`LIVED_PATH`, `STREET_PATHS`, `doorPathLegs`, `pathClearings`, `objectClearings(): OrientedBox[]`
  returning `[]` until Task 3 (W11), `streetClearings`)
- Change: `src/scene/streetGeometry.ts` (`clad`'s `paint` option, `Context.lived`, `doorPaths(ctx)` called after
  `laneLamps`, the `lived` option, `report.lived`)
- Change: `scripts/street-lane.test.ts` (the subset test, Decision (g))
- Change: `package.json` (`test:sky`: add `scripts/street-lived.test.ts`)
- Test: `scripts/street-lived.test.ts` (new, the header as `street-lane.test.ts`'s: the real painting where it exists,
  else skip)

**Interfaces:**
- Produces: `LIVED_PATH`, `STREET_PATHS`, `doorPathLegs()`, `pathClearings()`, `objectClearings()`, `streetClearings()`
  as Decision (a) and (f). `buildStreet(…, { lived })`. `clad`'s `paint` option.
- `StreetBuild['report']` gains `lived: { paths: LivedPath[]; objects: LivedObject[] }` (W09). `buildFlatPanel`
  initialises it to `{ paths: [], objects: [] }` beside `lane` (`streetGeometry.ts:1833`), as `buildStreet` does when
  `lived` is false. `LivedPath = { house: string; width: number; end: number | null; points: Vector3[]; faces: string[];
  ground: [number, number] }`, `points` at y 0.002, `faces` the names clad (`door L1 leg 0`, …), `ground` the path's
  vertex range `[start, end)` in `build.ground.arrays`. `LivedObject` is Task 3's. `objects` is `[]` until Task 3.

- [ ] **Step 1: Write the failing tests** in `street-lived.test.ts`:
  - `'every front door but L5 has a path, at the ends the plan names'`: `report.lived.paths` has 9 entries in
    `STREET_PATHS`'s order, each `end` equal to the table to 1e-9, `points.length` 2 or 3 as `legs`.
  - `'a path starts at its step's front and ends at the lane's edge'`: for each path, `points[0]` equals the midpoint of
    `doorStepFoot(h, i)`'s corners 2 and 3 to 1e-9 at y 0.002. The last point's `laneParam` gives `t` = `end` to 1e-6
    and lateral `side × 0.06` to 1e-6 (R5: the last point is 0.056 from the first along the frame's `n` to 1e-9). A
    two-leg path's middle point is the first plus `first × n`, `first` 0.08 or the entry's.
  - `'a path's width is its door's and the margin'`: `width` = `doorOf(h, i).w × h.w + 0.02` to 1e-9, L2's without the
    0.02.
  - `'every leg clears the lamps, the walls and the frogs'`: each leg's full-width rectangle is 0.03 or more from every
    lamp post's foot (`report.lane.lamps[].foot`), from every wall segment's footprint polygon
    (`report.lane.walls[].segments[].corners`) and from every frog's ring (frogs 0 to 3: the body's centre from
    `frogPlace`, radius `3 × FROG.clear × scale`) and body (frog 4: its centre, radius `FROG.size × scale`). The
    distance between two convex polygons (W01): 0 when either holds a vertex of the other (`inside`,
    `street-lane.test.ts:463-466`) or two of their edges cross, else the least distance from a vertex of either to an
    edge of the other (`segDist`, `:456-461`). For two convex polygons the closest pair lies at a vertex and an edge, so
    that is the whole distance. A ring or a body is a point and a radius: the polygon's distance to the point, less the
    radius.
  - `'a slid end is the nearest that clears'`: for each path with an `end`, `tNear` is the `t` on a 0.0001 grid where
    `laneAt(t, side × 0.06)` is nearest `points[0]`, printed per house. For L3, R1 and R3, every `t` on a 0.001 grid over
    `[min(tNear, end) + 0.001, max(tNear, end) − 0.001]` fails the clearance rule above for the candidate path to that
    `t` (W03): the path's first leg kept as it is, its second from the bend to `laneAt(t, side × 0.06)`, or its one leg
    from `S` when it has one. R1's end lies below its `tNear`, L3's and R3's above. For the rest, `|end − tNear|` is
    0.003 or less.
  - `'a path's strip ends on the lane's edge, both corners'`: the last leg's two end corners (`E ± (width / 2) ×
    across`) have `|laneParam lateral|` within 0.015 of 0.06. R5 is skipped (it ends on the paving).
  - `'the grass clears the paths'`: in `grassChunks(painting)`, no blade root within 0.012 of any leg's rectangle (the
    rectangle's distance as the filter computes it). `pathClearings().length` is 14.
  - `'the grass away from the paths is K2's'`: `grassChunks(painting, undefined, [...stepClearings(),
    ...wallClearings()])` hashes to `G1` (sha256 of `JSON.stringify(chunks)`, first 16 hex). With the default
    clearings, each chunk's kept blades are a subset, in order, of the chunk in that list that holds its first blade
    (`x`, `z`, `seed` equal). No default chunk is unmatched.
  - `'a door path takes the lane's paint at a quarter of its cover'`: the faces with owner `path` and a name starting
    `door ` number 14. Each has kind `path`, source `field`, `density` 1, `cover` 0.25, `refHeight` `0.2 × width / 0.12`
    to 1e-9, `light` 1, `base` equal to the face `path/segment 0`'s to 1e-9, `ribbons` 1 or more. Each path's `ground`
    range is non-empty and ends within `build.ground.arrays`.
  - `'the paths cost what the plan says'`: the build's triangles less the `lived: false` build's is 12,000 to 30,000.
  - `'K2's street without the lived-in parts'`: the `lived: false` build hashes to `B1` (the tool's hash, computed in
    the test as `T/build-hash.ts` computes it), and `report.lived` is `{ paths: [], objects: [] }`.
- [ ] **Step 2: Run them**: `node --test scripts/street-lived.test.ts`. Expected: FAIL (no `STREET_PATHS`).
- [ ] **Step 3: Build Decisions (a), (f) and (g)'s test amendment**, and add the file to `test:sky`.
- [ ] **Step 4: Run the suite** into `E3/t2/test-sky.log`. Expected: all PASS, the frog tests and the build test's
  density rule among them.
- [ ] **Step 5: K2 unmoved**: `LIVED=0 WT=$PWD npx tsx T/build-hash.ts` gives `B1`, `LIVED=0 WT=$PWD npx tsx
  T/grass-hash.ts` gives `G1`. Both, and the two hashes without `LIVED=0`, into `E3/t2/hash.txt`.
- [ ] **Step 6: Commit** by pathspec: `feat(street): a trodden path from every front door to the lane (K3 task 2)`.

### Task 3: the signs of life and the pot plant (worker)

**Files:**
- Change: `src/scene/streetLayout.ts` (`STREET_OBJECTS`, `objectPlaces`, `objectClearings`)
- Change: `src/scene/streetGeometry.ts` (`LIVED_CRAFT`, `flatPolygon` lifted from the rail, `signsOfLife(ctx)` called
  after `doorPaths`, `report.lived.objects`)
- Change: `src/scene/streetGrass.ts` (`PLANT`, `GrassChunk.y`, `plantChunks`)
- Change: `src/scene/StreetGrass.tsx` (the plants after the chunks, the mesh lifted by `y`)
- Test: `scripts/street-lived.test.ts`

**Interfaces:**
- Produces: `STREET_OBJECTS`, `objectPlaces()`, `objectClearings()` as Decision (c). `LivedObject = { kind: 'bench' |
  'pot' | 'pail'; house: string; centre: Vector3; box: { u: number; n: number; height: number }; underpaint: [number,
  number]; outlines: [number, number] }`. `LIVED_CRAFT = { bench: { plank:
  [0.1, 0.03, 0.012], seat: 0.037, block: 0.012, blockHeight: 0.025, blockInset: 0.01 }, pot: { across: 0.022, height:
  0.022, sides: 8 }, pail: { across: 0.016, height: 0.018, sides: 8, hoops: [0.005, 0.014], handle: 0.008,
  handleEdges: 6 } }`. `flatPolygon`. `PLANT`, `plantChunks(painting)`.
- `report.lived.objects: LivedObject[]`. `centre` is the footprint's centre
  at y 0. `box` is the footprint's extent along `u` and `n` and the object's full height: the bench's 0.037, the pot's
  0.022, the pail's 0.026 with its handle (`LIVED_CRAFT.pail.height` 0.018 is the tub's, W06). The ranges are `[start, end)`
  vertex indices in `build.underpaint` and `build.outlines.arrays`.

- [ ] **Step 1: Write the failing tests:**
  - `'the three objects stand by their doors'`: `report.lived.objects` is a bench at L2, a pot at R4, a pail at L4.
    Each centre equals its `(a, k)` in its house's frame to 1e-9. Each footprint's near edge (`k − n / 2`) is 0.01 from
    the wall to 1e-9 and its whole footprint 0.01 or more from the house's path strip, outside the step's rectangle, and
    0.03 or more from every other house's footprint. The bench's footprint lies 0.02 or more inside the rail's three
    lines (`a` from 0 to `W`, `k` under 0.10) and 0.01 or more from every rail post's foot (`report.lane.rail.posts`).
  - `'every object is drawn'`: each `underpaint` range is non-empty. Every vertex in it lies within the object's box
    (its footprint, y 0 to its height) to 1e-6. The pot's and the pail's `outlines` ranges are non-empty, every vertex in
    them within 0.004 of the object's box. The bench's `outlines` range is empty.
  - `'the rail did not move'`: the rail's `underpaint` range's positions and colours equal the `lived: false` build's,
    element for element.
  - `'the pot plant is a clump of the grass's blades on the pot's top'`: `plantChunks(painting)` has one chunk. Its `y`
    is `PLANT.y`, equal to `LIVED_CRAFT.pot.height`. It has 5 to 9 blades, every root within 0.011 of the pot's centre, each `height` in `[0.75, 1.25] × 0.7 ×
    0.036`, each `halfWidth` in `0.7 × [0.0024, 0.0034]`, each `|curl|` 0.5 or more (the grass's rule). Its `latIn` is 10
    and `grassDrawCount(chunk, cam)` is its blade count at a camera 2 away. Its sphere's centre is `(x, 0.02, z)` (the
    chunk's own frame, W05) and its radius 0.06.
  - `'the grass clears the objects'`: no blade root within 0.012 of any object's footprint. `streetClearings().length`
    is 10 + 37 + 14 + 3.
  - `'the paths and the objects cost what the plan says'`: the delta of Task 2's cost test, now 12,000 to 32,000.
- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Build Decisions (c) and (g).**
- [ ] **Step 4: Run the suite** into `E3/t3/test-sky.log`. Expected: all PASS.
- [ ] **Step 5: K2 unmoved**, again: `LIVED=0` gives `B1` and `G1`, into `E3/t3/hash.txt`.
- [ ] **Step 5b: The browser's checks**, against port 5206: `check-street-grass.mjs` (every case, case 10 among them)
  and `check-portal.mjs` (case 11's counts equal over three trips, with the plant's mesh), their output in `E3/t3/`.
- [ ] **Step 6: Commit** by pathspec: `feat(street): a bench, a pot plant and a pail by three doors (K3 task 3)`.

### Task 4: the plaster's strokes (worker)

**Files:**
- Change: `src/scene/streetStrokes.ts` (`faceConfig`'s `lengthScale`, `traceFace`'s option)
- Change: `src/scene/streetGeometry.ts` (`WallPaint.plasterLength`, `WALL_PAINT.plasterLength` 0.65, `clad`'s scale
  and cover, the report's `lengthScale`)
- Test: `scripts/street-lived.test.ts`

**Interfaces:**
- Produces: `faceConfig(face, count?, rows = 64, lengthScale = 1)`. `traceFace(…, { lengthScale })`.
  `report.faces[].lengthScale`. `clad` derives `lengthScale` itself (Decision (d)) and calls `traceFace(face, ctx.flow,
  ctx.painting, { density: density × cover, lengthScale })`. Its `paint` option does not change (W08).

- [ ] **Step 1: Write the failing tests:**
  - `'the plaster houses take the measured shorter row, the church keeps its own'`: every face of source `plaster` and
    owner `house-0`, `house-3`, `house-6` or `house-8` reports `lengthScale` 0.65 and `cover` `0.8 × 0.65` to 1e-9. Every
    face of owner `church`, `belfry` or `spire` reports `lengthScale` 1. `faceConfig(face, undefined, 64, 0.65)` on a
    made plaster face 0.28 wide and 0.3 high gives `minLength` and `maxLength` 0.65 × the call without the scale, to
    1e-12.
  - `'the plaster houses' ribbon count holds'`: the four houses' plaster faces' `ribbons` sum to 392 to 480 (0.9 to 1.1
    of K2's 436). The church's, belfry's and spire's plaster faces sum to 729 exactly.
  - `'K2's walls without the lived-in parts'`: the `lived: false` build reports `lengthScale` 1 on every face and hashes
    to `B1`.
- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Build Decision (d).**
- [ ] **Step 4: Run the suite** into `E3/t4/test-sky.log`. Expected: all PASS. `street-build.test.ts` builds with
  `KEPT_PAINT`, so its counts do not move.
- [ ] **Step 5: K2 unmoved**: `LIVED=0` gives `B1`, into `E3/t4/hash.txt`. The flat panel's hash does not change.
- [ ] **Step 6: Commit** by pathspec: `feat(street): the plaster houses' strokes take the scan's shorter row (K3 task
  4)`. The mutation proofs start from this commit.
- [ ] **Step 7: The mutation proofs**, one at a time, each in `E3/t4/mutation-<n>.md`, written by `T/k3-mutations.sh`
  as K2's were: `git status --short` (empty) and `HEAD`, the exact `git diff`, the named test's raw output and exit
  status (red), `git checkout -- <file>` and its status, `git diff --exit-code -- <file>` (0), the suite's raw output and
  status (green). Nothing echoed to the terminal counts. The mutations:
  1. `STREET_WALLS[1].t1` back to 0.47: `the walls stand on the verges the plan names` fails.
  2. R3's `end` at its nearest point's `t` (`a slid end is the nearest that clears` prints each `tNear`): `every leg clears the lamps …` fails on
     lamp 5.
  3. `pathClearings()` returns `[]`: `the grass clears the paths` fails.
  4. `doorPaths` skips its `clad` calls, the report kept: `a door path takes the lane's paint …` fails on `ribbons`.
  5. `LIVED_PATH.cover` at 1: `a door path takes the lane's paint …` fails on `cover`.
  6. The pot's `flatPolygon` calls skipped: `every object is drawn` fails.
  7. The pail's `ink` calls skipped: `every object is drawn` fails on the `outlines` range.
  8. `plantChunks` returns its chunk with `y` 0: `the pot plant is a clump …` fails.
  9. `clad` reads `WALL_PAINT.plasterLength` whatever `ctx.wallPaint` is: `… the church keeps its own` fails.
  10. `clad` leaves the cover unscaled: `the plaster houses' ribbon count holds` fails.
  11. `flatPolygon` lifts its first corner by 0.001: `the rail did not move` fails.

  A mutation whose test stays green is a finding: report it, do not weaken the mutation.

### Task 5: the look passes (Lead)

Each pass captures stops 0 to 4 on both viewports beside K2's (`T/k3-look.sh`) and reads them at 1:1. The pass goes
into the record `tasks/2026-10-27-village-lived-in.md` and `tasks/lessons.md`. The gate's crops: stops 2 and 4 for the bench,
the pot plant and the pail, stops 1 and 3 for the paths, R4's path at 1:1 beside the lane's at stop 4, the plaster walls
at 1:1 beside the scan's (`E3/t0/plaster/`), stop 0 beside the painting's village. The knobs, inside their ranges:

- The paths: `LIVED_PATH.cover` 0.15 to 0.35, `baseInset` 0.25 to 0.4 (the base 0.2 to 0.5 of the width), `leg` 0.06 to
  0.10. An end may move along the lane's edge by up to 0.01 in `t` where the clearance test still passes.
- The objects: each `side` −1 or 1, `a` and `k` within ±0.01 where the tests still pass. The plant's `PLANT.scale`
  0.6 to 0.8.
- The plaster: `WALL_PAINT.plasterLength` 0.5 to 0.8. The cover follows it.

The anti-goals are the test: a path is trodden earth, not paving. No clutter. No toy town. The far read at stop 0 still
the painting's. Cap: four passes. Then stop and ask Mark.

### Task 6: the gate's runs (Lead)

- [ ] `git status --short` empty. `npx tsc -b`, `npm run -s lint`, `npm run -s test:sky`, `npm run -s build`.
- [ ] Against port 5206 alone, on a fresh server: `check-street-grass.mjs` (every case), `check-street-walk.mjs`,
  `check-street-rotation.mjs`, `check-street-cypress-hang.mjs`, `check-portal.mjs`, `check-reduced-motion.mjs`
  (`T/k3-gate.sh`).
- [ ] The palette gate against K2's (`T/k3-colour.sh`, the base at `1b5e62f` on 5205): the walls', the path's and the
  grass's ΔE, how far the plaster's change moves the walls, how far the door paths move the path class (Fact 11).
- [ ] The frame time at stops 0, 3 and 4, five rounds, K3 on 5206 beside K2 on 5205 (`T/k3-perf.sh`).
- [ ] The browser's sweep, K2's points (`0.05` steps, `0.01` over 0.25 to 0.40, 0.295): every point under 1,444,930 on
  both viewports, and the grass's draw count at the worst point beside K2's.
- [ ] The build's time against K2's (`T/street-tri-split.ts` on both).
- [ ] The gate's sheet: the three objects at 1:1, R4's path beside the lane's, a plaster wall beside the scan's, and stop
  0's far read beside the painting's village.

### Task 7: review and the record (Lead)

- [ ] Codex's branch review (a brief file and a one-line pointer), each finding answered in the record.
- [ ] The record `tasks/2026-10-27-village-lived-in.md`, the K3 Tunables entry in `CLAUDE.md`, the K2 entry's W2 line
  (`t` 0.14 to 0.41, 14 segments), `tasks/lessons.md`, the pickup in `tasks/todo.md`.
- [ ] Push `feat/village-lived-in` for a Vercel preview, and send Mark the link and the sheet. The PR after his pass:
  draft, then ready, so Codex's review fires by itself.
