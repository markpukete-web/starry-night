# The village lived in, K3: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Revision 1 (2026-10-27, 22:40).** Both plan reads are folded in: the worker's buildability read (W01 to W11,
`E3/plan-build-worker.md`) and Codex's correctness read (F1 to F12, `E3/plan-review-codex.md`, REVISE), with the Lead's
probes (LP1, LP2). The table below says where each finding is answered. Revision 0 is `f04c0e8`, written from the
approved design and Mark's three calls of 21:11: W2 ends at `t` 0.41, a wooden pail by L4's door, the far houses'
paths at full length.

Four of this plan's decisions depart from the design's text, each for a fact the design did not have. The plaster
measurement is done and gives one outcome, not three (Decision (d)). The three objects clear the grass round them, as
the steps do, or the grass buries them (Decision (c)). The pot plant's clump is built outside `grassChunks`, so K2's
grass tests keep their hash (Decision (g)). K2's subset test is amended, because a path's clearing can empty a whole
chunk (Decision (g)). All four are open to Mark at the gate.

**Goal:** Every front door gets a trodden path to the lane, three doors get a sign of life (a bench, a pot plant, a
pail), and the four plaster houses take the stroke length the scan shows.

**Architecture:** No new mesh in `Street.tsx`'s build. The paths are `clad` faces of the lane's own kind, in the
`ground` bucket, at a quarter of the lane's cover, each leg clipped to the lines it meets: the step's front, a mitre at
the bend, the lane's edge. The objects are flat polygons in `underpaint` and ink in `outlines`, built as the rail is. The grass's clearings list grows by one rectangle per path leg and one per object. The plant is
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
| W05, F5 | The plant's bounds come from the verge's own code (`chunkOf`), in the chunk's frame, the roots at y 0. The mesh's `position-y` lifts them once. A test checks the sphere holds every blade under the shader's widening, push and wind | Decision (g), Task 3 |
| W06, F4 | An object's `box.height` is its full height: the pail's 0.026 with its handle. The objects' ink is lifted 0.0005, not `OUTLINE_LIFT` 0.005, and the test's allowance is that lift plus 1.5 ink widths | Decision (c), Task 3 |
| W07 | The bench's blocks are centred across the plank's depth | Decision (c) |
| W08 | `clad` derives `lengthScale` itself and forwards it to `traceFace`. Its `paint` option does not change | Task 4 Interfaces |
| W09 | `StreetBuild['report']['lived']` is typed, and `buildFlatPanel` initialises it empty | Task 2 Interfaces |
| W10 | `T/` is the tools folder written out. The worktree holds no `T` | Session mapping, Task 1 |
| W11 | `objectClearings(): OrientedBox[]` is a function returning `[]` until Task 3 | Task 2 Files |
| LP1 (the Lead's probe) | An unclipped leg's end corners straddle the lane's edge, 0.016 either way at R1. Superseded by F3's clip. The objects clear their paths by 0.011 to 0.014 and the rail by 0.08 | Decision (a), (c) |
| F1 | `street-build.test.ts`'s fixture builds with `{ paint: KEPT_PAINT, lived: false }`. A new test holds the default build under `STREET_TRIANGLE_BUDGET` | Task 2 |
| F2 | The last point is checked against `laneAt(end, side × 0.06)` to 1e-12, not through `laneParam`, which is approximate | Task 2 |
| F3, F12 | Each leg is clipped to the lines it meets: the step's front, the mitre at a bend, the lane's edge (R5: the paving's edge). No paint runs onto the lane and none is doubled at a bend. `clad` and `traceFace` take a clip polygon | Decision (a), (f), Task 2 |
| F6 | `plantHit` casts the hand's ray against the plant before the ground plane. A unit test and a browser case press on the plant | Decision (g), Task 3 |
| F7 | Mutation 11's red is the `B1` hash test | Task 4 |
| F8 | The tests read the tunables and hold each inside its authorised range. The cost tests scale with the cover | Tasks 2 to 4 |
| F9 | `if (lived) { doorPaths(ctx); signsOfLife(ctx) }` stands after the `if (lane)` block | Decision (f) |
| F10 | The slid-end test finds the nearest valid end on both sides on a 0.0001 grid. The table's end is within 0.0006 of it | Task 2 |
| F11 | `plasterLength` 0.7: the row 0.35 to 0.70, inside the measured 0.35 to 0.75. The knob 0.7 to 0.75 | Decision (d) |
| LP2 (the Lead's probe) | With the legs clipped, every path clears 0.03 (the least L3's 0.030017) and each mitre is shared exactly (`E3/probe/lead-k3-clip.mjs`, `.log`). Each table end is within 0.0005 of the nearest valid end. The end corners lie within 0.003 of lateral 0.06. The pail's handle stands in the plane facing the lane (normal `n`): across `u` it was edge-on to the camera | Decision (a), (c) |

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
   `area` from the row's mean width and `min(1, sqrt(minLength × maxLength))` (`streetStrokes.ts:263-268`), rounded and
   clamped to 16 to 800, so a shorter row raises the count unless the cover falls with it. Codex's probe at a factor of
   0.65 with the cover scaled: 421 (L1 111, L4 77, R2 101, R4 132), the church still 729.
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
   32,273 to spare. Codex's probe (`E3/plan-review-probes/path-count-probe.json`): the nine paths, unclipped, at cover
   0.25 cost 26,672 triangles, at 0.15 15,488, about 106,700 × the cover. The objects about 990 (Codex's
   `object-ink.json`: the ink 912 of them), the plant 5 to 9 blades at 8 triangles. The plaster's shorter row saves about 9,500
   (Codex's `plaster-probe.json`). The grass the paths clear gives some back at the worst point, measured in the
   browser. Mark's "full length" call takes the far-path fade out of the levers. The lever left is the paths' cover down
   to 0.15. Then stop and ask Mark.
9. **The rail's builder** (`streetGeometry.ts:1435-1532`) draws every face through a local `addQuad(corners, normal,
   refHeight, seed)`: a flat quad in `underpaint`, class 0, `src` 255, lit by `lightOf` and shaded by `shadeNew`, in the
   `thatch` source's mean. `ink(ctx, owner, refHeight, edges, seed)` (`:297`) draws a ribbon per edge `[a, b, normal]`
   in `outlines` through `outlineFace` (`streetStrokes.ts:405-452`): `OUTLINE_FRACTION` 0.14 × `refHeight` wide, run
   past each end by half its width, wobbling across by up to a quarter of it, lifted `OUTLINE_LIFT` 0.005 along the
   face's normal (above a house's strokes). `PALETTE.villageCool` is `#36403f`.
10. **The grass's base dabs lie at `GRASS.baseY` 0.001** (`grassBaseStrip`, `streetGeometry.ts:1001-1020`), under a
    path's face at 0.002. Nothing pokes through a door path.
11. **The palette gate's `path` class is one id colour** (`check-street-colour.ts:294`): the lane's path and the door
    paths together. At a quarter of the cover more base shows per unit of area, so the class's mean moves toward the
    base. The gate reports it beside K2's. The door paths are read at 1:1 beside the lane's (the design's gate list).
12. **`StreetGrass.tsx` builds one instanced geometry per chunk** (`:92-150`), its sphere from `chunk.sphere`, its draw
    count each frame from `grassDrawCount` (`streetGrass.ts:212-218`: the share `min(1, (max(r0, latIn) / max(r0,
    d))²)`). `__grassCount` is the sum of the chunks' blades. `check-street-grass.mjs` reads it as a precondition (cases
    1 and 11) and asserts it undefined with `?grass=0` (case 10). No test asserts its value. The shader places a root
    through `modelMatrix` and writes `transformed` in the mesh's own frame (`grassShader.ts:88-115`), so a mesh's
    `position-y` lifts its blades, and it widens a blade by the world distance from the camera to the root. The hand's
    ray meets one plane at `offset.y + 0.5 × GRASS_BLADE.height` (`StreetGrass.tsx:394-399`): a ray aimed at a leaf on
    the pot lands on the ground 0.25 away (Codex F6).
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

`doorPathLegs(): DoorPath[]`, `DoorPath = { house: string; index: number; width: number; end: number | null; points:
[number, number][] }`, returns the nine paths in `STREET_PATHS`'s order, `points` the two or three points above as `[x, z]`. `index` is the
house's index in `STREET_HOUSES` (L1 0, L2 1, L3 2, L4 3, R1 5, R2 6, R3 7, R4 8, R5 9), found by `findIndex` on `id`.
`doorStepFrame(h, index)` and `doorOf(h, index)` take it, as the steps do (`doorOf` reads its parity for a cottage's
door). The seed and the mirror below take the same index (W02).

**The clip (Codex F3, F12).** Each leg is clipped to the lines it meets, so no paint runs onto the lane and none is
doubled at a bend. For leg `k` from `P_k` to `P_k+1`: `d` the unit direction, `a = (−d.z, d.x)` across, `w` the width.
Its start line runs through `P_k`: along the frame's `u` for leg 0 (the step's front), along the mitre
`normalise(a_k−1 + a_k)` for leg 1. Its end line runs through `P_k+1`: along the mitre `normalise(a_k + a_k+1)` for leg
0 of two, along the lane's tangent at `end` (the `x` and `z` of `pathTangent(end)`, normalised) for the last leg, and along
`STREET.forward` for R5 (its end lies on the square face's edge parallel to `forward`, 0.2496 across from the centre).
The clip polygon is the four points where the two side lines `P_k ± (w / 2) a`, running along `d`, meet the start line
and the end line, in the order `[−start, −end, +end, +start]`, at y 0.002. The base polygon is the same four meets for
the band lines `P_k ± (0.5 − baseInset) w a`. The leg's face is the clip polygon's bounding rectangle in the leg's
frame: `s0` and `s1` the least and greatest of the corners' `(c − P_k) · d`, origin `P_k + s0 d − (w / 2) a`, `u = (s1 −
s0) d`, `v = w a`. A helper `pathLegShapes(path: DoorPath): { clip: [number, number][]; base: [number, number][]; rect:
OrientedBox }[]` in `streetLayout.ts` returns them per leg in `[x, z]`, so the build and the clearings read one construction. The Lead's
probe `E3/probe/lead-k3-clip.mjs` is this construction (LP2).

`pathClearings(): OrientedBox[]` returns each leg's `rect`: origin the face's origin, `u` along `d`, `n` along `a`, `u0`
0, `u1 = s1 − s0`, `k0` 0, `k1 = w`. The filter adds `GRASS.house` 0.012 as it does for the steps and the walls.

**The paint.** `doorPaths(ctx)` in `streetGeometry.ts` clads each leg: `orientedFace(origin, u, v, below, …)` with the
face rectangle above at y 0.002, `below` (0, −1, 0), kind `path`, source `field`, `refHeight = STREET.wallRef × width /
0.12`, seed `0x7900 + index × 4 + leg`, `mirror` `index % 2 === 1`, owner `path`, name `door L1 leg 0`. It passes
`clad` the leg's clip and base polygons (Decision (f)): the strokes are clipped to the clip polygon, the base is the
base polygon, 0.4 of the width across. The cover is `LIVED_PATH.cover` through `clad`'s option, the density 1. The
clip's end corners lie on the lane's tangent line, within 0.003 of lateral 0.06 where the lane curves (LP2).

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
- **The pot:** an eight-sided tub 0.022 across flat to flat and 0.022 high. Four of its flats lie on the sides of its
  0.022 square box. Its eight sides and its top are in `PALETTE.villageCool` (`#36403f`), each side one `flatPolygon` call with four corners, the
  top one call with eight (W04). The rim: `ink` round the top's eight edges at `refHeight` 0.022, so the ink is 0.0031
  wide, 0.14 of the pot as a door's frame is of a wall. The plant stands on the top (Decision (g)).
- **The pail:** an eight-sided tub 0.016 across and 0.018 high in the rail's wood, each side one `flatPolygon` call,
  its top one call with eight corners in the wood at 0.5 (the inside in shadow). Two hoops: `ink` round the eight
  edges at y 0.005 and y 0.014, `refHeight` 0.018, the ink 0.0025 wide. No rim ink. A handle: a half-circle of radius
  0.008 over the top in the plane of `u` and up (its normal `n`, so it faces the lane: across `u` it would be edge-on to
  the camera, LP2), its vertices at `centre ± 0.008 cos θ u` and y `0.018 + 0.008 sin θ` for `θ = jπ / 6`, `j` 0 to 6:
  six straight edges, `refHeight` 0.018, in `ink`. Each edge's normal is its side's for a hoop and `n` for the handle.
- **The objects' ink** is lifted `LIVED_CRAFT.ink.lift` 0.0005 off its face, not `OUTLINE_LIFT` 0.005 (Codex F4). The
  faces carry no strokes for the ink to clear, and 0.005 is a third of the pail's width: a hoop would stand off the
  tub. `ink` gains a trailing `lift = OUTLINE_LIFT`, passed to `outlineFace(face, edges, ink, seed, maxSamples?, lift =
  OUTLINE_LIFT)` as its sixth argument. Every existing call passes nothing, so `B1` holds.

All of it goes into `underpaint` (class 0, `src` 255) and `outlines`, through one module helper lifted from the rail:
`flatPolygon(ctx, corners: Vector3[], normal: Vector3, colour: Color, refHeight: number, seed: number): void`, the
rail's `addQuad` with the colour as an argument and any convex polygon as its corners, fanned from the first corner as
`polygon` does (W04). The face it builds for `lightOf` and `shadeNew` has `u` from the first corner to the second and
`v` from the first to the last: `lightOf` reads the normal only, and `wallShade` returns 1 for a face whose origin
stands above y 0.01, so the octagon tops take no shade. The rail calls it with its four corners and its wood, byte for
byte as today. The rail's vertices do not move (Task 3's test). Seeds `0x7a00 + i × 32` for object `i`. Each box
(the plank, a block) draws its four sides and its top. The objects cost about 990 triangles: the solids about 80, the
pot's rim 256, the pail's hoops 512 and handle 144 (Fact 8). `outlineFace` takes 4 triangles per sample gap, 9 samples
on a rim edge.

**How large they read** (`E3/probe/lead-k3-objects-view.log`): each object is widest in frame at one walk point. The
bench 76 px at `t` 0.2, the pot 32 px at 0.55, the pail 22 px at 0.69 on a 1600 × 900 desktop. On a 390 × 844 phone
35, 14 and 6 px. At the five stops they are smaller or out of frame. This is the design's scale: the pail is 0.016
across beside Vincent's 0.085.

**Lead, against the design's "the grass is cleared along the path":** the grass is also cleared round each object,
one rectangle per object in `objectClearings()`: the footprint (the bench's plank, a tub's square) in the house's frame,
`u0, u1` and `k0, k1` its extents, the filter's margin 0.012. Fact 6: without it a tub stands in grass to its rim. The
object then stands in a gap ringed by blades, as a frog does. Open to Mark at the gate.

**(d) The plaster's strokes.** The measurement is done (Fact 1): the walls carry shorter strokes than the row, in two
or three tiers. The design's outcome 2 applies. `WallPaint` gains `plasterLength?: number`. `WALL_PAINT.plasterLength`
is 0.7. `KEPT_PAINT` has none. In `clad`, for a face of kind `wall` and source `plaster` when `ctx.lived` is true,
`lengthScale = ctx.wallPaint.plasterLength ?? 1`, else 1. The row becomes 0.35 to 0.70 of the reference height, inside
what the scan shows (0.35 to 0.75), its geometric centre 0.49 beside the measured median 0.47 (Codex F11). The cover
for such a face is `ctx.wallPaint.cover × lengthScale`, so the ribbon count about holds (Fact 2: the count rises about
as 1 / 0.7 with the shorter row and falls as 0.7 with the cover, and the rounding moves it a few per cent). The church
clads under `KEPT_PAINT` (`streetGeometry.ts:875-925`), so its nave, belfry and spire keep today's row, as does the flat
panel. The seam: `traceFace`'s options gain `lengthScale?: number`, passed to `faceConfig(face, count, rows,
lengthScale = 1)`, which multiplies `minLength` and `maxLength` by it before the area. The report's faces gain
`lengthScale: number`. The look pass's knob is 0.7 to 0.75: a factor outside it puts an end of the row outside the
measurement, and needs a new one first.

**(e) The budget.** The reserve is 32,273 at K2's worst point (Fact 8). The paths about 26,700 at cover 0.25 (less
where the clip trims a corner), the objects about 990, the plant under 100, the plaster about −9,500, W2's three
segments a little less. The grass the clearings take out gives some back (2,054 blades, Codex's probe). The hard limit
is the browser's sweep: every point under 1,444,930 on both viewports. If the sweep fails, the paths' cover goes down
to 0.15 (about 15,500). If that fails, stop and ask Mark.

**(f) The switch, and `clad`'s option.** `buildStreet`'s options gain `lived?: boolean`, default true, and `Context`
gains `lived`. After the `if (lane) { … }` block, not inside it, `if (lived) { doorPaths(ctx); signsOfLife(ctx) }`
(Codex F9: inside it, `lane: false` would drop the paths and K2's wall-cost test would count them). With `lived: false`
it builds no path and no object, and the plaster row is unscaled, so the build is Task 1's `B1`. `report.lived` is then `{ paths: [], objects: [] }`. `grassChunks`'s default clearings are
`streetClearings()`, which becomes `[...stepClearings(), ...wallClearings(), ...pathClearings(), ...objectClearings()]`.
A test or a tool passes the first two for K2's grass. `clad` gains a trailing option: `clad(ctx, owner, name, face,
faceDensity = 1, [insetU, insetV] = [0, 0], shadeAs = face, paint: { cover?: number; clip?: Vector3[]; base?: Vector3[]
} = {})`. The cover is `paint.cover ?? (face.kind === 'wall' ? ctx.wallPaint.cover × lengthScale : 1)`, reported in the
face's `cover` as today. With `paint.base`, the underpaint polygon is `paint.base` instead of the inset face. With
`paint.clip`, `clad` converts each point to the face's own metric frame, `x = (p − origin) · u / |u|` and `y = (p −
origin) · v / |v|`, and passes the list to `traceFace` as `options.clip`, which replaces `facePolygon(face, width,
height)` in the step test (`streetStrokes.ts:353`). The report's `corners` are then the clip. Without either, every
call builds byte for byte as today. `T/build-hash.ts` and `T/grass-hash.ts` read `LIVED=0` (Task 0).

**(g) The plant, and the grass's tests.** `streetGrass.ts` exports `PLANT = { scale: 0.7, y: 0.022, latIn: 10, hitY:
0.0126, hit: 0.03 }` and `plantChunks(painting: ImageData2D): GrassChunk[]`: one chunk for the pot. Its blades are
`clump(mulberry32(0x7a40), painting, x, z, PLANT.scale × GRASS_BLADE.height)` at the pot's top centre `(x, z)`, each
blade's `halfWidth` then multiplied by `PLANT.scale` so the blade keeps the grass's proportion (the design names the
height only. A blade 0.02 long at the grass's half-width is 3 to 6 times as long as wide, fatter than the grass's 5 to
7.5). `GrassChunk` gains `y?: number`, the plant's `PLANT.y` 0.022, the pot's height (the test holds it equal to
`LIVED_CRAFT.pot.height`: `streetGeometry.ts` imports `streetGrass.ts`, so the grass does not import the craft back). `latIn` is `PLANT.latIn` 10, so
`grassDrawCount` draws every blade at any distance (the share is `min(1, (10 / d)²)`). Its `box`, `reach` and `sphere`
come from the verge's own code (Codex F5): `grassChunks`'s bounds block (`streetGrass.ts:161-205`, from `minX` to the
`chunks.push`) moves into `chunkOf(blades: BladeSpec[], latIn: number, walkCameras: [number, number, number][]):
GrassChunk`, and the walk's cameras into `grassWalkCameras(): [number, number, number][]`. `grassChunks` calls both,
and its output does not change (`G1` holds). `plantChunks` calls them with the roots at y 0 in the chunk's own frame:
`StreetGrass.tsx` sets the sphere as the geometry's bounding sphere, and three applies the mesh's `position-y` at
culling time, so the sphere is lifted once (W05). The reach is taken at the farthest walk camera, as the verge's is. The pot's `(x, z)` comes from `STREET_OBJECTS` through `objectPlaces()` in `streetLayout.ts`:
`{ kind; house; index; centre: [number, number]; frame: ReturnType<typeof doorStepFrame> }[]`.

`StreetGrass.tsx` builds `plants = useMemo(() => plantChunks(painting))`, concatenates them after `chunks` for the
geometries, the draw counts, `__grassCount` and the disposal, and renders each plant's mesh with `position-y` its `y`.
The sphere is in the chunk's own frame, so the mesh's translation lifts it with the blades. With `?grass=0` nothing
mounts, so case 10 holds. The trail's rectangle stays `grassRect(chunks)`, the verge's, and the pot's root lies inside
it.

**The hand on the plant (Codex F6).** `plantHit(origin: Vector3, direction: Vector3, plants: GrassChunk[]): [number,
number] | null` in `streetGrass.ts`, in the street's frame: for each plant, the ray's meet with the plane y = `chunk.y +
PLANT.hitY` (the plant's mid-height, 0.5 × 0.7 × 0.036). When the meet lies within `PLANT.hit` 0.03 of the plant's root
centre (its box's centre) horizontally, it returns the meet's `[x, z]`, the nearest plant's when several meet. Else
null. `StreetGrass.tsx` calls it with the ray's origin less `offset` before the ground plane, and on a hit takes it as
the hand's hit. The trail's radius 0.045 then covers every root, which lie within 0.011 of the centre. The capture seam
gains `window.__grassPlants`: each plant's mid-height centre `[x, y, z]` in the street's frame, as `__walkProject`
takes a point.

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

1. **A leg's paint running onto the lane, past the step or doubled at a bend.** Tests (Task 2): every stroke vertex of
   a leg inside its clip polygon, the mitres shared, the end corners on the lane's tangent line.
2. **A path's clearing emptying a chunk, and K2's grass tests failing on the count.** Test (Task 2): the subset tests
   match by the first blade, and the steps-only hash and `G1` still hold.
3. **The plant drawn at y 0, culled near the edge of the frame, or deaf to the hand.** Tests (Task 3): the chunk's `y`
   is the pot's height, its sphere holds every blade under the shader's widening, push and wind, and a ray on the plant
   pushes it. The browser case presses on it at stop 2. The Lead's capture at walk `t` 0.55 shows the plant on the
   pot.
4. **The plaster factor reaching the church through `pale`.** Test (Task 4): the church's, belfry's and spire's faces
   report `lengthScale` 1.
5. **An object buried in the grass.** Test (Task 3): no blade root within 0.012 of an object's footprint.
6. **The path class's ΔE at the colour gate.** No test: the gate reports it beside K2's, and the door paths are read at
   1:1 beside the lane's (Task 6).
7. **A literal 0.47 left in a test or a probe.** Task 1 makes both lane tests read `STREET_WALLS`. The design's probes
   in `k2/probe/` are frozen records of the design round and are not re-run.
8. **A tuned knob turning the suite red.** Tests (Tasks 2 to 4) read `LIVED_PATH.cover`, `PLANT.scale` and
   `WALL_PAINT.plasterLength`, and hold each inside its authorised range (Codex F8).

---

### Task 0: the base's reads (Lead) — mostly done

- [x] Branch and worktree: `feat/village-lived-in` at `08c0254`, the worktree `lived-wt`, `node_modules` and
  `reference/derived` linked. The dev server on 5206 runs (the Lead's, started 22:01).
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
- Change: `src/scene/streetLayout.ts` (`LIVED_PATH`, `STREET_PATHS`, `doorPathLegs`, `pathLegShapes`, `pathClearings`,
  `objectClearings(): OrientedBox[]` returning `[]` until Task 3 (W11), `streetClearings`)
- Change: `src/scene/streetStrokes.ts` (`traceFace`'s `clip` option)
- Change: `src/scene/streetGeometry.ts` (`clad`'s `paint` option, `Context.lived`, `doorPaths(ctx)` in the `if (lived)`
  block after the `if (lane)` block, the `lived` option, `report.lived`)
- Change: `scripts/street-lane.test.ts` (the subset test, Decision (g))
- Change: `scripts/street-build.test.ts:35` (the fixture builds with `{ paint: KEPT_PAINT, lived: false }`, Codex F1.
  Its budget does not change)
- Change: `package.json` (`test:sky`: add `scripts/street-lived.test.ts`)
- Test: `scripts/street-lived.test.ts` (new, the header as `street-lane.test.ts`'s: the real painting where it exists,
  else skip)

**Interfaces:**
- Produces: `LIVED_PATH`, `STREET_PATHS`, `DoorPath`, `doorPathLegs()`, `pathLegShapes()`, `pathClearings()`,
  `objectClearings()`, `streetClearings()` as Decision (a) and (f). `buildStreet(…, { lived })`. `clad`'s `paint` option.
- `StreetBuild['report']` gains `lived: { paths: LivedPath[]; objects: LivedObject[] }` (W09). `buildFlatPanel`
  initialises it to `{ paths: [], objects: [] }` beside `lane` (`streetGeometry.ts:1833`), as `buildStreet` does when
  `lived` is false. `LivedPath = { house: string; index: number; width: number; end: number | null; points: Vector3[];
  legs: { name: string; clip: Vector3[]; base: Vector3[]; ground: [number, number] }[] }`, `points` at y 0.002, a
  leg's `name` the face it clad (`door L1 leg 0`, …), `clip` and `base` its polygons at y 0.002, `ground` its vertex
  range `[start, end)` in `build.ground.arrays`. `LivedObject` is Task 3's. `objects` is `[]` until Task 3.
- `traceFace(face, flow, painting, { …, clip?: [number, number][] })`: the clip in the face's metric frame.

- [ ] **Step 1: Write the failing tests** in `street-lived.test.ts`:
  - `'every front door but L5 has a path, at the ends the plan names'`: `report.lived.paths` has 9 entries in
    `STREET_PATHS`'s order, each `end` equal to the table to 1e-9, `points.length` 2 or 3 as `legs`.
  - `'a path starts at its step's front and ends at the lane's edge'`: for each path, `points[0]` equals the midpoint of
    `doorStepFoot(h, i)`'s corners 2 and 3 to 1e-9 at y 0.002. The last point's `(x, z)` equals `laneAt(end, side ×
    0.06)`'s to 1e-12 (Codex F2: `laneParam` is approximate, so it is not the check). R5: the last point is 0.056 from
    the first along the frame's `n` to 1e-9. A two-leg path's middle point is the first plus `first × n`, `first` 0.08
    or the entry's.
  - `'a path's width is its door's and the margin'`: `width` = `doorOf(h, i).w × h.w + 0.02` to 1e-9, L2's without the
    0.02.
  - `'every leg clears the lamps, the walls and the frogs'`: each leg's clip polygon is 0.03 or more from every
    lamp post's foot (`report.lane.lamps[].foot`), from every wall segment's footprint polygon
    (`report.lane.walls[].segments[].corners`) and from every frog's ring (frogs 0 to 3: the body's centre from
    `frogPlace`, radius `3 × FROG.clear × scale`) and body (frog 4: its centre, radius `FROG.size × scale`). The
    distance between two convex polygons (W01): 0 when either holds a vertex of the other (`inside`,
    `street-lane.test.ts:463-466`) or two of their edges cross, else the least distance from a vertex of either to an
    edge of the other (`segDist`, `:456-461`). For two convex polygons the closest pair lies at a vertex and an edge, so
    that is the whole distance. A ring or a body is a point and a radius: the polygon's distance to the point, less the
    radius.
  - `'an end is the nearest that clears'` (Codex F10): for each path with an `end`, `tNear` is the `t` on a 0.0001 grid
    over [0, 1] where `laneAt(t, side × 0.06)` is nearest `points[0]`, printed per house. The candidate path to a `t`
    keeps the path's first leg as it is and runs its last leg to `laneAt(t, side × 0.06)`, clipped as Decision (a)
    clips it (W03). Scan outward from `tNear` in steps of 0.0001, both sides at each step, to the first candidate that
    passes the clearance rule above. `|end − t|` is 0.0006 or less for that `t` (the table's ends are rounded to three
    places), or for the other side's when both pass at the same step.
  - `'a path ends on the lane's edge'` (Codex F3): the last leg's clip corners 1 and 2 lie on the line through the last
    point along `pathTangent(end)` to 1e-9, and `laneAt`'s lateral for each, read through `laneParam`, is within 0.003
    of 0.06 (the lane curves off its tangent over half a width, and `laneParam` is approximate). R5's lie on the line
    through its last point along `STREET.forward` to 1e-9.
  - `'no paint runs past a leg's clip, and a bend paints once'` (Codex F12): every vertex in a leg's `ground` range lies
    inside its clip polygon, horizontally, to 1e-6. For a two-leg path, leg 0's clip corners 1 and 2 equal leg 1's
    corners 0 and 3 to 1e-9 (the shared mitre), and no vertex of either clip lies strictly inside the other.
  - `'the grass clears the paths'`: in `grassChunks(painting)`, no blade root within 0.012 of any leg's clip polygon.
    `pathClearings().length` is 14, each the leg's face rectangle.
  - `'the grass away from the paths is K2's'`: `grassChunks(painting, undefined, [...stepClearings(),
    ...wallClearings()])` hashes to `G1` (sha256 of `JSON.stringify(chunks)`, first 16 hex). With the default
    clearings, each chunk's kept blades are a subset, in order, of the chunk in that list that holds its first blade
    (`x`, `z`, `seed` equal). No default chunk is unmatched.
  - `'a door path takes the lane's paint at its own cover'`: `LIVED_PATH.cover` is 0.15 to 0.3 (the authorised range,
    Codex F8). The faces with owner `path` and a name starting `door ` number 14. Each has kind `path`, source `field`,
    `density` 1, `cover` `LIVED_PATH.cover`, `refHeight` `0.2 × width / 0.12` to 1e-9, `light` 1, `base` equal to the
    face `path/segment 0`'s to 1e-9, `corners` its leg's clip, `ribbons` 1 or more. Each leg's `ground` range is
    non-empty and ends within `build.ground.arrays`.
  - `'the paths cost what the plan says'`: the triangles whose three vertices lie in the legs' `ground` ranges number
    0.6 to 1.3 × 106,700 × `LIVED_PATH.cover`.
  - `'the default street fits its budget'` (Codex F1): `buildStreet(painting, flow, masses, { grass: true })` has
    `STREET_TRIANGLE_BUDGET` triangles or fewer.
  - `'K2's street without the lived-in parts'`: the `lived: false` build hashes to `B1` (the tool's hash, computed in
    the test as `T/build-hash.ts` computes it), and `report.lived` is `{ paths: [], objects: [] }`.
- [ ] **Step 2: Run them**: `node --test scripts/street-lived.test.ts`. Expected: FAIL (no `STREET_PATHS`).
- [ ] **Step 3: Build Decisions (a), (f) and (g)'s test amendment**, and add the file to `test:sky`.
- [ ] **Step 4: Run the suite** into `E3/t2/test-sky.log`. Expected: all PASS, the frog tests and the whole of
  `street-build.test.ts` among them.
- [ ] **Step 5: K2 unmoved**: `LIVED=0 WT=$PWD npx tsx T/build-hash.ts` gives `B1`, `LIVED=0 WT=$PWD npx tsx
  T/grass-hash.ts` gives `G1`. Both, and the two hashes without `LIVED=0`, into `E3/t2/hash.txt`.
- [ ] **Step 6: Commit** by pathspec: `feat(street): a trodden path from every front door to the lane (K3 task 2)`.

### Task 3: the signs of life and the pot plant (worker)

**Files:**
- Change: `src/scene/streetLayout.ts` (`STREET_OBJECTS`, `objectPlaces`, `objectClearings`)
- Change: `src/scene/streetStrokes.ts` (`outlineFace`'s `lift`)
- Change: `src/scene/streetGeometry.ts` (`LIVED_CRAFT`, `flatPolygon` lifted from the rail, `ink`'s option,
  `signsOfLife(ctx)` after `doorPaths`, `report.lived.objects`)
- Change: `src/scene/streetGrass.ts` (`PLANT`, `GrassChunk.y`, `chunkOf`, `grassWalkCameras`, `plantChunks`,
  `plantHit`)
- Change: `src/scene/StreetGrass.tsx` (the plants after the chunks, the mesh lifted by `y`, `plantHit` before the ground
  plane, `__grassPlants`)
- Change: `scripts/check-street-grass.mjs` (case 19, the hand on the pot plant)
- Test: `scripts/street-lived.test.ts`

**Interfaces:**
- Produces: `STREET_OBJECTS`, `objectPlaces()`, `objectClearings()` as Decision (c). `LivedObject = { kind: 'bench' |
  'pot' | 'pail'; house: string; centre: Vector3; box: { u: number; n: number; height: number }; underpaint: [number,
  number]; outlines: [number, number] }`. `LIVED_CRAFT = { bench: { plank:
  [0.1, 0.03, 0.012], seat: 0.037, block: 0.012, blockHeight: 0.025, blockInset: 0.01 }, pot: { across: 0.022, height:
  0.022, sides: 8 }, pail: { across: 0.016, height: 0.018, sides: 8, hoops: [0.005, 0.014], handle: 0.008,
  handleEdges: 6 }, ink: { lift: 0.0005 } }`. `flatPolygon`. `ink(ctx, owner, refHeight, edges, seed, lift =
  OUTLINE_LIFT)`.
  `outlineFace(face, edges, ink, seed, maxSamples?, lift = OUTLINE_LIFT)`. `PLANT`, `chunkOf`, `grassWalkCameras`,
  `plantChunks(painting)`, `plantHit`.
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
    them within `LIVED_CRAFT.ink.lift + 1.5 × OUTLINE_FRACTION × refHeight` of the object's box (half the ink's width,
    a quarter for the wobble and a half for the run past each end, Codex F4): 0.0051 for the pot, 0.0043 for the pail,
    whose box reaches its handle's 0.026. The bench's `outlines` range is empty.
  - `'the rail did not move'`: the rail's `underpaint` range's positions and colours equal the `lived: false` build's,
    element for element.
  - `'the pot plant is a clump of the grass's blades on the pot's top'`: `PLANT.scale` is 0.6 to 0.8 (Codex F8).
    `plantChunks(painting)` has one chunk. Its `y` is `PLANT.y`, equal to `LIVED_CRAFT.pot.height`. It has 5 to 9
    blades, every root within 0.011 of the pot's centre, each `height` in `[0.75, 1.25] × PLANT.scale × 0.036`, each
    `halfWidth` in `PLANT.scale × [0.0024, 0.0034]`, each `|curl|` 0.5 or more (the grass's rule). Its `latIn` is 10 and
    `grassDrawCount(chunk, cam)` is its blade count at a camera 2 away. The pot's centre lies inside
    `grassRect(grassChunks(painting))`.
  - `'the plant's sphere holds every blade'` (Codex F5): for each walk pose `walkPose(k / 100, portrait)`, `k` 0 to 90,
    both orientations, and each blade: the camera's world position less the street's offset is `c`, the root's world
    point `(x, PLANT.y, z)`, `widen = max(1, |c − root| / GRASS_BLADE.widenFrom)`, `right = (dz, −dx)` for `(dx, dz)` the
    unit vector from the root to `c` on the ground, as the shader has them. For `a` in 0, 0.25, 0.5, 0.75, 1 and both
    edges `± bladeWidth(a)`, the point `bladeVertex(blade, a, across, right, widen)`, displaced by `(GRASS_BLADE.push +
    GRASS_BLADE.wind) × a²` in each of eight directions and lowered by `0.7 ×` that displacement `× a` (clamped at 0),
    lies inside the chunk's sphere in the chunk's own frame (`x`, `z` as built, `y` above the pot's top). Checked also
    with the sphere replaced by Codex's fixed one (radius 0.06 about `(x, 0.02, z)`): that one fails, so the test is not
    vacuous.
  - `'a pointer on the pot plant pushes it'` (Codex F6): from stop 2's camera (`walkPose(STATION_T[2], false)`, where
    the plant is in frame on both viewports, `E3/probe/lead-k3-plant-view.log`), a ray through the plant's mid-height
    centre gives `plantHit` a point within `PLANT.hit` of it. A ray through a point 0.1 to the side at the same height
    gives null. The ground plane's meet for the first ray is 0.045 or more from the plant (0.277 in the probe, so the
    old path missed it).
  - `'the grass clears the objects'`: no blade root within 0.012 of any object's footprint. `streetClearings().length`
    is 10 + 37 + 14 + 3.
  - `'the objects cost what the plan says'`: the triangles in the three objects' `underpaint` and `outlines` ranges
    number 700 to 1,300.
- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Build Decisions (c) and (g).**
- [ ] **Step 4: Run the suite** into `E3/t3/test-sky.log`. Expected: all PASS.
- [ ] **Step 5: K2 unmoved**, again: `LIVED=0` gives `B1` and `G1`, into `E3/t3/hash.txt`.
- [ ] **Step 5b: The browser's checks**, against port 5206: `check-street-grass.mjs` (every case, case 10 among them,
  and the new case 19: on the desktop at stop 2 (`walkT=0.44&walkMode=input`), `__grassHand` presses at
  `__walkProject(t, __grassPlants[0])`, and two frames later `__grassPushNear(x, z, 0.03)` at the plant's `(x, z)` is
  above 0) and `check-portal.mjs` (case 11's counts equal over three trips, with the plant's mesh), their output in
  `E3/t3/`.
- [ ] **Step 6: Commit** by pathspec: `feat(street): a bench, a pot plant and a pail by three doors (K3 task 3)`.

### Task 4: the plaster's strokes (worker)

**Files:**
- Change: `src/scene/streetStrokes.ts` (`faceConfig`'s `lengthScale`, `traceFace`'s option)
- Change: `src/scene/streetGeometry.ts` (`WallPaint.plasterLength`, `WALL_PAINT.plasterLength` 0.7, `clad`'s scale
  and cover, the report's `lengthScale`)
- Test: `scripts/street-lived.test.ts`

**Interfaces:**
- Produces: `faceConfig(face, count?, rows = 64, lengthScale = 1)`. `traceFace(…, { lengthScale })`.
  `report.faces[].lengthScale`. `clad` derives `lengthScale` itself (Decision (d)) and calls `traceFace(face, ctx.flow,
  ctx.painting, { density: density × cover, lengthScale })`. Its `paint` option does not change (W08).

- [ ] **Step 1: Write the failing tests:**
  - `'the plaster houses take the measured shorter row, the church keeps its own'`: `WALL_PAINT.plasterLength` is 0.7 to
    0.75 (Codex F8, F11). Every face of source `plaster` and owner `house-0`, `house-3`, `house-6` or `house-8` reports
    `lengthScale` `WALL_PAINT.plasterLength` and `cover` `WALL_PAINT.cover × WALL_PAINT.plasterLength` to 1e-9. Every
    face of owner `church`, `belfry` or `spire` reports `lengthScale` 1. `faceConfig(face, undefined, 64, 0.7)` on a made
    plaster face 0.28 wide and 0.3 high gives `minLength` and `maxLength` 0.7 × the call without the scale, to 1e-12.
  - `'the plaster houses' ribbon count holds'`: the four houses' plaster faces' `ribbons` sum to 392 to 480 (0.9 to 1.1
    of K2's 436). The church's, belfry's and spire's plaster faces sum to 729 exactly.
  - `'K2's walls without the lived-in parts'`: the `lived: false` build reports `lengthScale` 1 on every face and hashes
    to `B1`.
- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Build Decision (d).**
- [ ] **Step 4: Run the suite** into `E3/t4/test-sky.log`. Expected: all PASS. `street-build.test.ts` builds with
  `{ paint: KEPT_PAINT, lived: false }` since Task 2, so its counts do not move. A retune inside an authorised range
  re-runs the suite, and a count band that fails there is a finding for the Lead before the pass ends (Codex F8).
- [ ] **Step 5: K2 unmoved**: `LIVED=0` gives `B1`, into `E3/t4/hash.txt`. The flat panel's hash does not change.
- [ ] **Step 6: Commit** by pathspec: `feat(street): the plaster houses' strokes take the scan's shorter row (K3 task
  4)`. The mutation proofs start from this commit.
- [ ] **Step 7: The mutation proofs**, one at a time, each in `E3/t4/mutation-<n>.md`, written by `T/k3-mutations.sh`
  as K2's were: `git status --short` (empty) and `HEAD`, the exact `git diff`, the named test's raw output and exit
  status (red), `git checkout -- <file>` and its status, `git diff --exit-code -- <file>` (0), the suite's raw output and
  status (green). Nothing echoed to the terminal counts. The mutations:
  1. `STREET_WALLS[1].t1` back to 0.47: `the walls stand on the verges the plan names` fails.
  2. R3's `end` at its `tNear`, 0.636 (`an end is the nearest that clears` prints each): `every leg clears the lamps …`
     fails on lamp 5.
  3. `pathClearings()` returns `[]`: `the grass clears the paths` fails.
  4. `doorPaths` skips its `clad` calls, the report kept: `a door path takes the lane's paint …` fails on the faces.
  5. `LIVED_PATH.cover` at 1: `a door path takes the lane's paint …` fails on the range.
  6. The pot's `flatPolygon` calls skipped: `every object is drawn` fails.
  7. The pail's `ink` calls skipped: `every object is drawn` fails on the `outlines` range.
  8. `plantChunks` returns its chunk with `y` 0: `the pot plant is a clump …` fails.
  9. `clad` reads `WALL_PAINT.plasterLength` whatever `ctx.wallPaint` is: `… the church keeps its own` fails.
  10. `clad` leaves the cover unscaled: `the plaster houses' ribbon count holds` fails.
  11. `flatPolygon` lifts its first corner by 0.001: `K2's street without the lived-in parts` fails on `B1` (Codex F7:
      the rail comparison runs the same helper on both sides, so it cannot fail).
  12. `clad` does not pass the clip to `traceFace`: `no paint runs past a leg's clip …` fails.
  13. `plantHit` returns null: `a pointer on the pot plant pushes it` fails.
  14. `plantChunks` sets a fixed sphere of radius 0.06 about `(x, 0.02, z)`: `the plant's sphere holds every blade`
      fails.

  A mutation whose test stays green is a finding: report it, do not weaken the mutation.

### Task 5: the look passes (Lead)

Each pass captures stops 0 to 4 on both viewports beside K2's (`T/k3-look.sh`) and reads them at 1:1. The pass goes
into the record `tasks/2026-10-27-village-lived-in.md` and `tasks/lessons.md`. The gate's crops: each object on the
desktop where it is widest in frame (Decision (c)): the bench at walk `t` 0.2, the pot plant at 0.55, the pail at 0.69,
and stops 1 and 3 for the paths. Then R1's path end at 1:1 at `t` 0.05 (the most oblique leg, LP1), the plaster walls
at 1:1 beside the scan's (`E3/t0/plaster/`), and stop 0 beside the painting's village. The knobs, inside their ranges:

- The paths: `LIVED_PATH.cover` 0.15 to 0.3 (0.35 would cost about 37,000, over the reserve), `baseInset` 0.25 to 0.4
  (the base 0.2 to 0.5 of the width), `leg` 0.06 to 0.10. An end stays the nearest that clears: moving one is a new
  probe and a new table, not a knob.
- The objects: each `side` −1 or 1, `a` and `k` within ±0.01 where the tests still pass. The plant's `PLANT.scale`
  0.6 to 0.8.
- The plaster: `WALL_PAINT.plasterLength` 0.7 to 0.75. The cover follows it.

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
