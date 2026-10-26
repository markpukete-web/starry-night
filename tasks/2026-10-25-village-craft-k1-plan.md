# The village's craft, K1 the houses: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Revision 1 (2026-10-26).** It folds both plan reviews of revision 0 (`23ed2be`) in one round: Codex's correctness read
(`E/plan-review-codex.md`, REVISE, F1 to F8) and the worker's buildability read (`E/plan-build-worker.md`, W01 to W31).
The fold table below gives each finding its answer and where it lives. Mark approved the craft design ("go with your
recommendation, start the plan"), so every Lead's call in it stands. This plan is K1, the houses. K2, the lane, gets
its own plan after K1's gate, because its budget is what K1 leaves.

**Goal:** Each house on the lane reads as a solid building painted in Vincent's strokes: walls of solid paint, a door
set into the wall with a frame and a step, shutters beside the front windows, and eaves with depth.

**Architecture:** The street's build (`src/scene/streetGeometry.ts`) gains four parts. The walls' paint becomes two
knobs on the build's context, as the walls' light is, so the church keeps today's paint. The church's recessed door is
given to every painting house, with the opening's ink, and every house gets a flat frame band and a step. Two flat
leaves stand beside each front window. A painting house's eaves overhang further, with an underside. The door's span
and the step move to `streetLayout.ts`, so the grass can clear the steps without importing the build. The look passes
then set the paint's values at 1:1 against the scan, and the walls' strokes pay the triangles.

**Tech stack:** three.js, the street's builders (`clad`, `cladRound`, `opening`, `recessedDoor`, `outlineFace`,
`polygon`), R3F, `node --test`, the check scripts. No new dependency.

**Spec:** `docs/superpowers/specs/2026-10-25-village-craft-design.md`, "Solid paint", "Doors", "Shutters" and "Eaves",
with its Constraints and Anti-goals.

## Session mapping

Checked against `herdr agent list` on 2026-10-26: Lead Claude `w4:p1`. Worker Gemini 3.8 (`agy`) `w4:p5`, for Tasks 1
to 3. Reviewer Codex `w4:p4`. When Codex's usage runs out, review goes to the Consultant, Fable, `w4:p6` in tab `w4:t2`
(Mark, 2026-10-26). The Lead reads each quota in Quota Finch's cache before a dispatch.

The worktree `W` is `/private/tmp/claude-502/-Users-markma-Projects-starry-night/fc6c46e1-2735-4317-b947-76ebade201cd/scratchpad/craft-wt`
on `feat/village-craft`. A scratchpad is removed with its session, so a later session adds its own worktree with
`git worktree add` and links `node_modules` to the main checkout's (the lock file is the same). The branch is
`feat/phone-framing` (`56c3f9c`) plus docs, so the base's code is `56c3f9c`. Task 0 adds the base's worktree
`scratchpad/framing-wt` and serves it on port 5204. `W` is served on port 5205. The evidence goes in
`/Users/markma/Projects/starry-night/scratch/village-craft-2026-10-25/` (`E/` below), the tools in `E/tools/`. Nothing
is pushed before Mark sees it.

## The fold

| Finding | Answer | Where |
| --- | --- | --- |
| Codex F1 (P2), W16: a step exclusion inside `grassChunks` shifts the seeded stream | The filter runs after each chunk's shuffle, then the chunk's bounds come from the kept blades | Decision (e), Task 2 |
| Codex F2 (P2), W19: `front over` gets 8 ribbons, under the floor of 12 | Whole faces keep the floor of 12. A split front's three fragments hold their sum to 12, each above 0 | Task 2 |
| Codex F3 (P2), W04: `test:sky` lists its files | Task 1 adds `street-craft.test.ts` to `package.json:22` and checks the log names its tests | Task 1 |
| Codex F4 (P2), W07, W08: the cover changes the reported density | `density` keeps its meaning. A new `cover` field carries the paint's multiplier. The S1 fixture builds with `KEPT_PAINT` | Decision (a), Task 1 |
| Codex F5 (P2), W05, W09: the base's colour space | Decode both ends, light the lit end, mix in linear RGB. The report's `base` is the linear colour the polygon gets | Decision (a) |
| Codex F6 (P2): knob 3's bucket misses consumers | Knobs 3 and 4 leave Tasks 1 to 3. A pass that needs one writes a plan amendment with F6's list of consumers | Decision (b) |
| Codex F7 (P3): "none of the three" | The church keeps `recess: CHURCH.recess` and gets neither `craft` nor `eaveOverhang` | Decision (d) |
| Codex F8 (P3): two rules for the soft target | The target may carry to K2, with the exact residual in the record | Decision (i), Task 4 |
| Codex's note: the levels test reads constants only | The levels test reads the emitted vertices of the band, the door's ink and the leaves' ink | Task 3 |
| Lead, the probe: `orientedFace` flips the five right-hand fronts | `doorStepFoot` takes the flip. A test matches the drawn step's ground corners to it | Fact 15, Decision (e), Task 2 |
| Lead: two church tests read `house-0`'s `front` | They read `front left` | Task 2 |
| W01: the face line has no `source` | The face line gains `source` | Decision (h) |
| W02: `moonShade` is not exported | Not a defect: `brushForms.ts:38` exports it. The test imports it from there | Task 1 |
| W03: `rectUnderpaint`'s signature | Given: `(painting, rect, share = 0.1, lightest = false)` | Decision (a) |
| W06: how `church()` restores the paint | It saves the caller's value and restores it | Decision (a) |
| W10: `craftShape` has no home | `streetGeometry.ts`, beside `StreetShape` | Decision (d) |
| W11, W12: `FRAME` and `STEP` are not exported | `FRAME` is exported. `STEP` moves to `streetLayout.ts`, exported | Decisions (d), (e) |
| W13: `StreetHouse` has no `along` or `toPath` | `houseFrame(h)` in `streetLayout.ts`, not new fields | Decision (e) |
| W14, W17: `recessedDoor` has no `inkRef` | A seventh parameter, default the wall's height. `buildHouse` passes `FRAME × eave` when `shape.craft` | Decision (d) |
| W15: `CraftReport` has no type | Typed | Decision (h) |
| W18: the band's three quads | The sides run the band's full height, the top spans the door's width | Decision (d) |
| W20: the reveals cannot be found | The test reads `report.craft[i].door`, as `street-church.test.ts` reads `report.church.door` | Task 2 |
| W21, W22: the step's foot and its distance | The formula and an oriented-rectangle distance are given | Decision (e) |
| W23: the cottage band's top | Cut at the wall's top: `min(1, door.h + bt)` | Decision (d) |
| W24, W27: `maxSamples` | A cap on the sample count | Decision (f) |
| W25: `eaves` beside `eave` | Renamed `eaveOverhang` | Decision (g) |
| W26, W28: the soffit's kind and span | `kind: 'underside'`, over the full overhung depth | Decision (g) |
| W29: overlap on shared edges | Area of overlap in the front's coordinates. Touching gives zero | Task 3 |
| W30: the soffit's winding | Not a defect: both street materials are `DoubleSide` (`streetMaterial.ts:68-69`). The corner order is the report's convention | Decision (g) |
| W31: what a cottage reports | No `door`, `inkRef` `FRAME × eave`, no soffit parts | Decision (h) |
| Worker, Task 3 part 4: the shutter's colour conversion | `new Color(PALETTE.villageCool)`, as `INK` is made | Decision (f) |

## The facts the plan rests on (read at `56c3f9c`, the branch's code)

1. **The base's triangles.** With the real scan and the grass, the street's build is 603,641 triangles, its walls'
   strokes 183,404 (`E/base-split.log`, `E/tools/street-tri-split.ts`). Ribbons: the houses 2,062, the church 498, the
   belfry 150, the spire 224. The build takes 646 ms in node, the median of five. Its arrays hash to
   `71114298aa85575a` (`E/base-hash.log`, `E/tools/build-hash.ts`, the same on two runs). The hash covers every
   bucket's positions, colours, indices, classes, sources, strokes and seeds. It does not cover the report.
2. **The browser's room.** At the frogs' head the walk's tightest point was the desktop at `t` 0.295: 1,444,499, which
   is 431 under the ceiling (`scratch/street-frogs-2026-10-25/t4/tri-sweep.log`). The three branches since then do not
   change the street's draw. Task 0 reads it again at the base.
3. **The houses.** Ten (`STREET_HOUSES`, `src/scene/streetLayout.ts:177-188`). Six painting houses: L1, L3, L4, R2,
   R3, R4. L4 has two storeys. Four cottages: L2, L5, R1, R5. The front windows: seven on the painting houses, four on
   the cottages, so 22 shutter leaves.
4. **The levels off a wall's face.** The strokes ride 0.002 to 0.00425 (`STROKE_LIFT` + 15 × `LIFT_STEP`,
   `streetStrokes.ts:82-89`). A window's or a door's pane sits at 0.0055 (`streetGeometry.ts:208`). `outlineFace` lifts
   its ink 0.005 (`OUTLINE_LIFT`) above the edges it is given, along the face's normal. Its wobble is in the face's
   plane. So a recessed door's ink, given edges on the wall, lies at 0.005, and a window's frame, given the pane's edges,
   at 0.0105. The depth buffer resolves 0.15 mm out to about 3 units (`streetStrokes.ts:84-87`).
5. **The lean.** `leaned()` shears the underpaint, the strokes, the outlines and the windows by `leanOf(index) × y`
   along the house's width (`streetGeometry.ts:265-277`), in place, after the house is built. A vertex keeps its index
   in its buffer. The church's drawn checks pass only because `leanOf(100)` is 0.
6. **The church is a house.** `church()` builds its nave with `house(ctx, 'church', 100, …)`, so every change to
   `buildHouse` reaches it unless the church's shape or the context keeps it out. `church()` sets `ctx.wallLight` to
   `CHURCH_LIGHT` and restores it after the spire (`streetGeometry.ts:528`, `:575`).
7. **The church's door.** `cladRound` cuts the front wall into three faces round the hole: `front left`, `front right`,
   `front over`. `recessedDoor` inks the hole's edges at the wall's height (`streetGeometry.ts:393`), wider than a
   house's door can carry. A window's frame inks at `FRAME` (0.35) × the wall's height.
8. **One overhang.** `houseRoofPlanes` uses `OVERHANG` (0.015) on both axes: past the side walls (the eaves) and past
   the gables (the rakes) (`streetGeometry.ts:423-432`).
9. **The grass.** A blade is cleared within `GRASS.house` (0.012) of a house's box (`streetGrass.ts:85-95`). A blade
   is about 0.035 tall. A step stands 0.03 out from its wall. `grassChunks` draws every blade from one `mulberry32(1)`
   stream, and its shuffle draws once per blade of the chunk. The probe (`E/tools/step-probe.ts`, its output `E/r1-step-probe.log`, 2026-10-26):
   117 of 18,500 blades lie within 0.012 of a step's foot. The nearest frog is 0.165 from a step (stop 4, L5).
10. **The windows' buffer.** `litWindows` reads the windows' buffer four vertices at a time, keyed on class 2
    (`streetLife.ts`). A recessed door's panel there is a quad at class 255, as the church's is.
11. **The ID classes.** `cls`: 0 walls, 1 roofs, 2 windows, 3 ground, 4 path, 255 none. `src`: a wall's or a roof's
    `SOURCE_CLASSES` entry, else 255 (`streetGeometry.ts:88-98`, `:176-177`).
12. **A wall's paint.** The base is the source's mean, decoded to linear (`setRGB(…, SRGBColorSpace)`), × the face's
    light, then `shadeNew`. A stroke's colour is its texel decoded × its relief (1 ± 0.035) × (1 + 0.25 ×
    `moonShade(normal)`) × the face's light, then `shadeNew` (`streetGeometry.ts:180-188`, `streetStrokes.ts:356`,
    `:379-382`). So the base carries no moon term today. `moonShade` is `max(0, n · moon)`.
13. **A cottage's door and window stand under the thatch.** On L2 the thatch's underside meets the front wall at about
    0.051, and the door's top is at 0.077 (S1b's C2, open since S1b). Whatever reaches the wall's top there is under
    the slab.
14. **Thin ink is dear.** `outlineFace` samples about half its width apart, at least five samples. A 0.036 edge inked
    0.0018 wide takes 43 samples, 168 triangles. Five samples take 16.
15. **A front wall can be flipped.** `orientedFace` reverses a face's `u` when `u × v` points inward
    (`streetGeometry.ts:126-137`). On the five right-hand houses, R1 to R5, the front's origin is its `+along` corner and
    `u` runs `−along`. The probe's formula, flipped when `−along.z × toPath.x + along.x × toPath.z < 0`, matched the
    drawn front on all ten. A door's `cu` is measured along the drawn `u`. The painting houses' 0.5 is symmetric. The
    cottages' 0.34 and 0.66 are not.
16. **`toPath` is not a unit vector.** Its length is 1.000033, from `STREET.forward`. `c()` in `buildHouse` scales the
    depth by it. The front's normal is the unit vector along `toPath`, and `recessedDoor`'s step runs out along the
    normal.
17. **Two contexts.** `buildFlatPanel` builds its own `Context` (`streetGeometry.ts:829-842`). A new `Context` field
    goes in both constructors.
18. **The church's class test.** `street-build.test.ts:81-125` holds every class-0 vertex within 0.35 of the church's
    nave or belfry to `src` 2. The nearest house, L5, has no corner within 0.557 of the nave's centre. A step
    adds 0.03, so the new parts at class 0 and `src` 255 stay outside the radius.
19. **Tests that name a house's front.** `street-church.test.ts:79` and `:140` look up `house-0`'s `front`. House 0
    is L1, a painting house, so Task 2 splits that face.

## Decisions

**(a) The paint knobs.** A `WallPaint` is `{ base: number; light: number; cover: number }`.

- **The base.** In `clad`, for a `kind: 'wall'` face, in linear RGB (three's `Color` holds linear values):
  `mean = new Color().setRGB(...sourceUnderpaint(painting, source, 1), SRGBColorSpace)`, today's base.
  `lit = new Color().setRGB(...sourceUnderpaint(painting, source, paint.light, true), SRGBColorSpace)`
  `.multiplyScalar(1 + STREET_MOON_LIFT * moonShade(face.normal))`, the moon term `traceFace` gives its strokes.
  The base is `mean.lerp(lit, paint.base)`, then × the face's light, then `shadeNew`, as today. At `base` 0 the lerp
  returns `mean` unchanged, so Task 1's hash holds.
- **The lightest share.** `rectUnderpaint(painting, rect, share = 0.1, lightest = false)` and
  `sourceUnderpaint(painting, source, share = 0.1, lightest = false)`. With `lightest`, after the ascending sort by luma,
  the mean is over `texels.slice(texels.length - count)`, where `count = Math.max(1, Math.round(texels.length * share))`.
- **The cover.** For a `kind: 'wall'` face, `traceFace` gets `density * paint.cover`. The face line's `density` keeps
  its meaning, the detail level. Its new `cover` field is `paint.cover` on a wall face and 1 on every other face.
- **The reach.** Every `kind: 'wall'` face that `clad` lays for a house or a cottage, the gables and a split front's
  fragments included. Not the roofs. If a look pass finds the roofs reading as planks, that pass gives them the same
  knobs. Not the church: `church()` saves `ctx.wallPaint`, sets `KEPT_PAINT`, and restores the saved value where it
  restores the light. Not the flat panel: `buildFlatPanel`'s context carries `KEPT_PAINT`, so its reads stay S1's.
- `KEPT_PAINT` is `{ base: 0, light: 0.5, cover: 1 }`. `WALL_PAINT` starts equal to it, so Task 1 changes nothing on
  screen. `buildStreet` takes `paint?: WallPaint` (default `WALL_PAINT`) in its options, the tests' seam.
- The lightest mean sorts a source's texels once more per wall face. If the build's time passes 10% over the base once
  `base` is above 0, memoise `sourceUnderpaint` per build on `(source, share, lightest)`. Not before.

**(b) The later knobs are not in Tasks 1 to 3.** Knob 3, the dry brush and the gaps on walls only, and knob 4, the
stroke width inside each source's measured range, are built only if a look pass reaches them. The Lead then writes the
knob as a plan amendment, sends it through the correctness leg, and builds it after the verdict. Knob 3's amendment
names every consumer of a stroke bucket: `leaned()`'s list, `Context` and both constructors, `StreetBuild` and
`buildStreet`'s return, the triangle sum (`streetGeometry.ts:768`), and `Street.tsx`'s geometry, material, disposal and
ID passes. It carries a drawn wall-stroke check on a leaning house and a triangle check that includes the new bucket.
The church's walls, the roofs and the land's body (E4) stay in `street-strokes`. Knob 4's amendment holds the width
inside the measured range by a test (`wallA` and `wallB` 0.12–0.2, `plaster` 0.1–0.15). Knob 5, the ambient light, is
Mark's call.

**(c) The levels.** The frame band at 0.0046 off the face: 0.00035 over the strokes' top, 0.0004 under the door's ink.
A shutter leaf at 0.006: 0.0005 over the pane. The leaf's ink and its louvres, given the leaf's lifted edges, land at
0.011, over the window's frame at 0.0105. Every gap is at least two `LIFT_STEP`s (Codex's table agrees with the
arithmetic).

**(d) The doors.** `StreetShape` gains `craft?: boolean` (the band, the step on a cottage, the shutters, the door's ink
at `FRAME`) and `eaveOverhang?: number` (Decision (g)). `craftShape(h: StreetHouse): StreetShape` lives in
`streetGeometry.ts` beside `StreetShape`. A `StreetHouse` already carries every field a shape needs, and `buildStreet`
passes `h` today. `craftShape` returns `{ ...h, craft: true }` on a cottage and `{ ...h, craft: true, recess:
CRAFT.door.recess, eaveOverhang: CRAFT.eaves }` on a painting house. `buildStreet` passes `craftShape(h)`. The church
keeps its shape: its `recess: CHURCH.recess` stays, and it gets neither `craft` nor `eaveOverhang`. So its door, its
roof and its paint are today's.

- `CRAFT = { door: { recess: 0.02, band: 0.3, lift: 0.0046, paleDark: 0.7 }, shutter: { lift: 0.006, louvres: [0.25,
  0.5, 0.75], maxSamples: 5 }, eaves: 0.03 }`, exported. `FRAME` is exported.
- **A painting house's door** is the church's: `cladRound` and `recessedDoor`, recess 0.02. `recessedDoor` gains a
  seventh parameter, `inkRef = face.v.length()`. `buildHouse` passes `FRAME * eave` when `shape.craft`, and nothing
  otherwise, so the church's ink is today's.
- **The step.** `recessedDoor`'s four step quads move into `doorStep(ctx, face, s0, s1, colour)`, with the same values
  and draw order. `recessedDoor` calls it where it draws the step today, so the church's output is unchanged. A cottage
  calls it after its door, with its wall source's mean as the colour, as `recessedDoor` uses.
- **The frame band,** on every house with `shape.craft`. In the front's coordinates, `s` runs across along the drawn `u`
  and `t` runs up, each 0 to 1. `b = CRAFT.door.band * door.w` (a fraction of the width), `bt = b * |u| / |v|` (the same
  world length up the face), and `t1 = Math.min(1, door.h + bt)`. Three quads: left `[s0 − b, s0] × [0, t1]`, right
  `[s1, s1 + b] × [0, t1]`, over `[s0, s1] × [door.h, t1]`, each `s` clamped to `[0, 1]`. Each lies `CRAFT.door.lift`
  off the front along its normal. Its colour, linear and before the light: the `plaster` source's decoded mean on a
  `wallA` or `wallB` wall, and that × `CRAFT.door.paleDark` on a `plaster` wall. Then × `lightOf(front, ctx.lit,
  ctx.wallLight)`, then `shadeNew` over its vertices with the front as the face. It goes in the underpaint at `cls` 0
  (the walls' class, as the design says) and `src` 255, so it does not move a source's mean in the `--sources` frame.
  On a cottage the band reaches the wall's top under the thatch (Fact 13: L2's door top 0.0765, the band cut at
  0.09). That is accepted, as the door's place is.
- **The cottages** get the band and the step, and no recess. Their door stays an `opening`.

**(e) One place for a door.** In `streetLayout.ts`:

- `STEP = { height: 0.012, depth: 0.03 }` moves here, exported, with today's values. `streetGeometry.ts` imports it.
- `houseFrame(h: StreetHouse): { along: Vector3; toPath: Vector3 }` is `buildStreet`'s formula
  (`streetGeometry.ts:756-762`) moved, `toPath` unnormalised as today. `buildStreet` calls it.
- `doorOf(h: StreetHouse, index: number): { cu: number; w: number; h: number }`: a painting house `{ cu: 0.5, w: 0.2,
  h: 0.6 / storeys }`, a cottage `{ cu: index % 2 ? 0.34 : 0.66, w: 0.16, h: 0.85 }`, today's values. `cu` is along the
  drawn front's `u` (Fact 15). `buildHouse` and `buildCottage` read it.
- `doorStepFoot(h: StreetHouse, index: number): [number, number][]`, the step's four ground corners `(x, z)` in
  `doorStep`'s order: `s0` at the wall, `s1` at the wall, `s1` out, `s0` out. With `{ along, toPath } = houseFrame(h)`:
  `flip = −along.z × toPath.x + along.x × toPath.z < 0`, `u = flip ? −along : along`, `n = toPath / |toPath|`,
  `origin = (h.x, h.z) + toPath × d/2 − u × w/2` (unnormalised `toPath`, as `c()` scales it), and
  `corner(s, k) = origin + u × (w × s) + n × k`. The corners are `corner(s0, 0)`, `corner(s1, 0)`,
  `corner(s1, STEP.depth)`, `corner(s0, STEP.depth)`, with `s0, s1 = cu ∓ door.w / 2`.
- **The grass (F1).** `grassChunks` keeps its generation and its shuffle as they are. After each chunk's shuffle it
  drops every blade within `GRASS.house` of a step's foot. It then takes the chunk's box, reach and sphere from the kept
  blades, and drops a chunk the filter empties. The shuffle draws once per blade of the unfiltered chunk, so every later
  chunk sees today's random stream. The kept blades keep the shuffled order, so `grassDrawCount`'s prefix stays an even
  sample. A blade's distance to a step, in that step's frame: `a = (p − origin) · u`, `k = (p − origin) · n`, distance
  `= hypot(max(w·s0 − a, 0, a − w·s1), max(−k, 0, k − STEP.depth))`. The ten feet are computed once per call.
- The church's step is unchanged and has no grass near it (the square).

**(f) The shutters.** Two open leaves beside each front window of every house with `shape.craft`, 22 in all. With the
window's `(cu, cv, w, h)` as `opening` gets it, in the front's coordinates: left `[cu − w, cu − w/2] × [cv − h/2, cv +
h/2]`, right `[cu + w/2, cu + w] × [cv − h/2, cv + h/2]`. Each lies `CRAFT.shutter.lift` off the front. Its colour is
`new Color(PALETTE.villageCool)` (`#36403f`, decoded to linear as `INK` is), × the front's light, then `shadeNew` with
the front as the face. It goes in the underpaint at `cls` 0 and `src` 255, not in the windows' buffer (Fact 10). Its
ink: `outlineFace({ ...front, refHeight: leafHeight × FRAME }, edges, INK, seed, CRAFT.shutter.maxSamples)`, where
`leafHeight` is the leaf's world height and `edges` are the leaf's four edges and three louvres across it at 0.25, 0.5
and 0.75 of its height, all on the leaf's lifted plane. So the ink lies at 0.011. It is appended to the outlines at
`cls` 255, as an opening's frame is, with no `report.outlines` line. `outlineFace` gains a fifth parameter,
`maxSamples?: number`, a cap: `n = Math.min(maxSamples ?? Infinity, Math.max(5, 2 * Math.ceil(total / width) + 1))`.
An edge then costs 16 triangles, a leaf about 114, the 22 leaves about 2,508.

**(g) The eaves.** `houseRoofPlanes` takes `shape.eaveOverhang ?? OVERHANG` past the side walls, for the eave's
corners and its drop (`eaveY`). It keeps `OVERHANG` past the gables and at the ridge. `craftShape` gives a painting
house 0.03. The church's shape has none, so it keeps 0.015. The roof planes grow with the overhang, so their strokes
change. Task 3's count reports it.
`houseSoffits(shape: StreetShape, centre: Vector3, along: Vector3, toPath: Vector3): HouseFace[]` returns `[]` without
`eaveOverhang`, else one quad per side, `kind: 'underside'`, named `left soffit` and `right soffit`. Its corners:
`c(sideX × w/2, d/2 + OVERHANG, eave)`, `c(sideX × w/2, −d/2 − OVERHANG, eave)`, then that side's eave band's
corners 2 and 3 (the band's foot, `edgeBands`' `down`). Its top edge is where the roof plane meets the side wall's top
line, carried over the rakes' span. It is drawn in the underpaint in the edge bands' colour (`edgeColour`), at `cls`
255, unlit, as the bands are. A cottage's thatch is unchanged.

**(h) The report.** Each face line gains `source: StreetSourceName`, `base: [number, number, number]` (the linear
colour its polygon gets, before × light and `shadeNew`) and `cover: number`. `HouseReport['door']` gains `ink: [number,
number]`, the outlines' vertex range of its ink. `report.craft` holds one line per house, not the church:

```ts
export type CraftPart = { name: string; buffer: 'underpaint' | 'outlines' | 'windows'; from: number; to: number }
export type CraftReport = {
  owner: string
  index: number
  /** the front wall as drawn, before the lean */
  front: StreetFace
  /** the refHeight its door's ink was drawn with: FRAME × eave on every house */
  inkRef: number
  /** linear RGB, before the light and the shade */
  bandColour: [number, number, number]
  /** recessedDoor's report, a painting house only */
  door?: NonNullable<HouseReport['door']>
  parts: CraftPart[]
}
```

The parts: `door` (windows: the panel or the pane), `door ink` (outlines), `window k` (windows, `k` from 0 in draw
order), `band left`, `band right`, `band over`, `step` (underpaint, its four quads), `leaf k left`, `leaf k right`
(underpaint), `leaf k left ink`, `leaf k right ink` (outlines), and on a painting house `soffit left`, `soffit right`
(underpaint). `from` and `to` are vertex indices (`positions.length / 3`) taken before and after the part's draw calls.
The lean shears in place (Fact 5), so a range stays valid. To **remove the lean** from a buffer vertex of house `index`:
`x −= along.x × leanOf(index) × y` and `z −= along.z × leanOf(index) × y`, with `along` from `houseFrame`. A cottage's
line has no `door` and no soffit parts. `StreetBuild['report']` gains `craft: CraftReport[]`, empty in both contexts at
the start.

**(i) The budget.** The hard limit is the browser: every point of Task 5's sweep under 1,444,930 on both viewports.
K1's soft target is to leave K2 its room: the street's build at 593,641 or fewer, 10,000 under the base. K2's estimate
is three to five stone walls clad in dabs, one rail and seven lamps. The payers, in order: the walls' `cover`, then the
far ground's density 0.5 → 0.25, then the trees' strokes. If the far ground pays, the literal 0.5 at
`streetGeometry.ts:614` and `:621` becomes one named constant, and `street-build.test.ts`'s `far` and `side` assertion
reads it, in the same commit. If K1 ends above the target, the record gives the exact residual as K2's debt, and K2's
plan finds it. Codex's estimate (in memory, house walls only): a cover of 0.9 saves 15,796 triangles, 0.8 saves 31,344.

## Global constraints

- No new dependency.
- The bar: every new surface is painted from a `STREET_SOURCES` rectangle or takes a flat colour from `palette.json`
  under the street's ink. No new texture.
- A stroke's width and length stay inside their source's measured range. A value outside needs a new 1:1 measurement
  of the scan's village, in the record before the value is used.
- The church, the belfry and the spire keep their paint, their door's ink at the wall's height, and their eaves at
  0.015.
- The land's stroke body (E4) does not change. The diorama does not change: `streetGeometry.ts` is the street's only.
- The houses' places, the lane, the stops, the frogs and the grass away from the steps do not change. No new motion. No
  real-time light.
- The triangle ceiling is 1,444,930 at every browser point, both orientations. 60 fps on the desktop, 30 on a
  mid-tier phone, at the Tunables' dpr caps.
- The build's time stays within 10% of the base's 646 ms. Past that, the memo in Decision (a) first. Then the Lead
  watches the portal's last flight frame on the phone viewport for a visible stall.
- Retune cap: four look passes.

## Review focus

1. **A step on the wrong side of its door** (Fact 15). Test (Task 2): the drawn step's ground corners equal
   `doorStepFoot` to 1e-9 on all ten houses.
2. **Blades or a frog on a step, or the grass moving elsewhere** (F1). Tests (Task 2): no blade's root and no frog
   within `GRASS.house` of any step's foot. The frog and grass tests that exist stay green unchanged.
3. **The church moving.** It passed in its own slice. Tests: its faces' ribbons, density, cover and base under a
   changed paint (Task 1), its door's drawn ink at the wall's height (Task 2), its eaves at 0.015 (Task 3).
4. **A part that does not lean with its house.** Every drawn check reads the part's range and removes the lean before
   it measures (Tasks 2 and 3).
5. **A part off its wall, or over another part.** Tests: each band and leaf inside its front's face, and no two parts
   of a front overlapping (Tasks 2 and 3).
6. **A new part fighting the strokes in depth.** Test: the levels' order on the emitted vertices (Task 3). Then the
   1:1 crops at the nearest house of each stop (Task 4).

---

### Task 0: the base's reads (Lead)

- [ ] Serve `W`: `npx vite --host --port 5205 --strictPort`, in the background.
- [ ] Add the base: `git worktree add scratchpad/framing-wt feat/phone-framing`, link its `node_modules`, serve it on
  port 5204 the same way.
- [ ] The browser's sweep at the base: `APP_URL=http://127.0.0.1:5204/ TS=<the points> node E/tools/tri-read.mjs`
  `> E/t0/base-tri-sweep.log`. The points: every 0.05 from 0 to 0.9, every 0.01 from 0.25 to 0.40, and 0.295.
- [ ] The base's captures at stops 0 to 4 on both viewports (`capture-diorama.mjs`,
  `DIORAMA_CAPTURE_EXTRA="&street=1&station=S&walkMode=input&arrival=0"`), into `E/t0/base/`. The scan's village at 1:1
  and Simon's frame (`scratch/simon-village-2026-10-23/v100.jpg`) cropped beside them.
- [ ] Write the brief for Tasks 1 to 3 (`E/brief-k1-build.md`), lint it, and dispatch it with a one-line pointer.

### Task 1: the paint knobs (worker)

**Files:**
- Change: `src/scene/streetStrokes.ts` (`rectUnderpaint`, `sourceUnderpaint`: the `lightest` flag)
- Change: `src/scene/streetGeometry.ts` (`WallPaint`, `KEPT_PAINT`, `WALL_PAINT`, `Context.wallPaint` in both
  constructors, `clad`, `church`, `buildStreet`'s `paint`, the face line's `source`, `base` and `cover`)
- Change: `package.json` (`test:sky`: add `scripts/street-craft.test.ts`)
- Change: `scripts/street-build.test.ts` (its fixture builds with `paint: KEPT_PAINT`)
- Test: `scripts/street-craft.test.ts` (new)

**Interfaces:**
- Produces: `type WallPaint = { base: number; light: number; cover: number }`, `KEPT_PAINT`, `WALL_PAINT`,
  `buildStreet(painting, flow, masses, { lit?, grass?, paint? })`, the face line's `source`, `base` (linear) and
  `cover`, `rectUnderpaint(painting, rect, share = 0.1, lightest = false)`, `sourceUnderpaint(painting, source, share =
  0.1, lightest = false)`.

- [ ] **Step 1: Write the failing tests** in `street-craft.test.ts`, on `street-build.test.ts`'s synthetic painting and
  inputs. `moonShade` comes from `src/scene/brushForms.ts`, `STREET_MOON_LIFT` from `src/scene/streetStrokes.ts`.
  - `'the lightest share is the top of the sort'`: on a painting whose rectangle holds texels of known luma,
    `rectUnderpaint(painting, rect, share, true)` is the mean of the brightest `count` texels, and the call without the
    flag is today's darkest mean.
  - `'the kept paint is today\'s'`: `KEPT_PAINT` deep-equals `{ base: 0, light: 0.5, cover: 1 }`. In a build with
    `paint: KEPT_PAINT`, every house wall's and roof's `base` equals
    `new Color().setRGB(...sourceUnderpaint(painting, f.source, 1), SRGBColorSpace)`'s components to 1e-12, and its
    `cover` is 1. `buildFlatPanel`'s faces have `cover` 1.
  - `'the church keeps its paint under any wall paint'`: build A with `paint: KEPT_PAINT` and B with
    `paint: { base: 1, light: 0.5, cover: 0.5 }`. Every `church`, `belfry` and `spire` face has the same `ribbons`,
    `density`, `cover` and `base` in both.
  - `'the wall paint reaches the houses\' walls and gables, not their roofs'`: in B, every house face of `kind` wall
    (its name has no `roof`) has `cover` 0.5 and A's `density`, and `base` equal to Decision (a)'s lit colour, computed
    in the test by the same decode, moon term and lerp at 1, to 1e-9. The house walls' summed `ribbons` in B is below
    A's. Every house roof face has A's `ribbons`, `base` and `cover` 1.
  - In `street-build.test.ts`, the fixture becomes `buildStreet(villagePainting(), flow, masses, { paint: KEPT_PAINT
    })`, with one line saying why: it pins S1's cladding, and `street-craft.test.ts` pins the paint.
- [ ] **Step 2: Run them**: `node --test scripts/street-craft.test.ts`. Expected: FAIL (no `KEPT_PAINT`).
- [ ] **Step 3: Build Decision (a)**, and add `scripts/street-craft.test.ts` to `test:sky` in `package.json`.
- [ ] **Step 4: Run the suite**: `npm run -s test:sky 2>&1 | tee E/t1/test-sky.log`. Expected: all PASS, and
  `grep -c "the kept paint is today" E/t1/test-sky.log` is at least 1.
- [ ] **Step 5: Nothing on screen moved**: `WT=$PWD node E/tools/build-hash.ts`. Expected: `build hash
  71114298aa85575a triangles 603641`.
- [ ] **Step 6: Commit** by pathspec: `feat(street): the walls' paint as two knobs on the build, the church keeping
  today's (K1 task 1)`.

### Task 2: the doors (worker)

**Files:**
- Change: `src/scene/streetLayout.ts` (`STEP`, `houseFrame`, `doorOf`, `doorStepFoot`)
- Change: `src/scene/streetGeometry.ts` (`CRAFT`, `FRAME` exported, `craftShape`, `StreetShape.craft`,
  `recessedDoor`'s `inkRef` and its report's `ink`, `doorStep`, the band, the cottage's step, `buildHouse`,
  `buildCottage`, `buildStreet`, `CraftPart`, `CraftReport`, `report.craft` in both constructors)
- Change: `src/scene/streetGrass.ts` (`grassChunks`: the steps' filter after the shuffle)
- Change: `scripts/street-build.test.ts` ('every face of a house is clad')
- Change: `scripts/street-church.test.ts` (`:79` and `:140` read `house-0`'s `front left`)
- Test: `scripts/street-craft.test.ts`

**Interfaces:**
- Consumes: Task 1's build and face line.
- Produces: `STEP`, `houseFrame(h)`, `doorOf(h, index)`, `doorStepFoot(h, index): [number, number][]` from
  `streetLayout.ts`. `CRAFT`, `FRAME`, `craftShape(h): StreetShape`, `CraftPart`, `CraftReport`, `report.craft` with
  `door`, `door ink`, `window k`, `band …` and `step` parts from `streetGeometry.ts`.

- [ ] **Step 1: Write the failing tests** in `street-craft.test.ts`. A drawn check reads a part's range and removes
  the lean (Decision (h)) before it measures.
  - `'every painting house\'s door is set into its wall'`: on the six painting houses, as `street-church.test.ts`'s
    'the door is set into the wall' reads `report.church.door`, on `report.craft[i].door` with `CRAFT.door.recess`: the
    panel 0.02 behind the plane, each reveal from the plane to the panel, the panel's corners equal to the `door`
    part's vertices with the lean removed, to 1e-9. The three `front …` faces leave the hole, and their areas sum to the
    wall's less the hole, to 1e-9.
  - `'a door\'s ink is the opening\'s, the church\'s the wall\'s'`: on all ten houses, `inkRef` is `FRAME × eave`, and
    the widest sample of the `door ink` part measures `OUTLINE_FRACTION × FRAME × eave` across, to 1e-9. A sample is
    three consecutive vertices (`pushDrapedRibbon`'s layout, `brushForms.ts:170-190`), and its width is the distance
    from its first vertex to its third. The church's `door.ink` range measures `OUTLINE_FRACTION ×
    STREET_CHURCH.nave.eave` the same way.
  - `'a frame band round every door'`: on all ten houses, each `band …` part's vertices lie `CRAFT.door.lift` off the
    front's plane, to 1e-9. Their `(s, t)` in the front's coordinates span Decision (d)'s rectangle, to 1e-9, inside
    `[0, 1]²`. `bandColour` is the `plaster` source's decoded mean on a `wallA` or `wallB` wall and that × 0.7 on a
    `plaster` wall. The band's first vertex's colour is `bandColour × lightOf(front) × wallShade(front, x, y, z)`, at
    its position with the lean removed, to 1e-9.
  - `'a step at every door\'s foot, on the door\'s side'`: on all ten houses, the `step` part's top is at most 0.015
    up, its front 0.02 to 0.04 out, its width the door's. Its vertices at `y` 0, as distinct `(x, z)` points, are
    `doorStepFoot(h, index)`'s four corners, to 1e-9.
  - `'no blade and no frog on a step'`: with the real painting, skipped without it as `street-grass.test.ts` skips.
    Every blade root of `grassChunks(painting)` and every `frogPlace(spec)` position lies at least `GRASS.house` from
    each step's foot. The test measures it its own way: 0 inside the quad, else the least distance to its four edges.
    Every chunk's box holds its blades.
  - In `street-build.test.ts`, 'every face of a house is clad' expects 10 faces on a painting house and 8 on a cottage.
    Whole faces keep `ribbons >= 12`. On a painting house, `front left`, `front right` and `front over` each have more
    than 0 ribbons, and their sum is at least 12.
  - In `street-church.test.ts`, `:79` and `:140` read `house-0`'s `front left`. It carries the front's light and
    `refHeight`.
- [ ] **Step 2: Run them**: `node --test scripts/street-craft.test.ts scripts/street-build.test.ts`. Expected: the new
  tests FAIL. `scripts/street-church.test.ts` PASSES before and after its two edits.
- [ ] **Step 3: Build Decisions (d), (e) and (h)** for the door, the band and the step.
- [ ] **Step 4: Run the suite**: `npm run -s test:sky 2>&1 | tee E/t2/test-sky.log`. Expected: all PASS, the
  church's, the grass's and the frogs' included.
- [ ] **Step 5: Commit** by pathspec: `feat(street): every door framed and stepped, the painting houses' set into the
  wall (K1 task 2)`.

### Task 3: the shutters and the eaves (worker)

**Files:**
- Change: `src/scene/streetStrokes.ts` (`outlineFace`'s `maxSamples`)
- Change: `src/scene/streetGeometry.ts` (the leaves, `houseRoofPlanes`, `houseSoffits`, `StreetShape.eaveOverhang`,
  the `leaf …` and `soffit …` parts)
- Test: `scripts/street-craft.test.ts`

**Interfaces:**
- Consumes: Task 2's `report.craft` and `doorOf`.
- Produces: `outlineFace(face, edges, ink, seed, maxSamples?)`, `houseSoffits(shape, centre, along, toPath):
  HouseFace[]`, the `leaf k left`, `leaf k right`, their `ink` parts and the `soffit` parts.

- [ ] **Step 1: Write the failing tests** in `street-craft.test.ts`:
  - `'two open leaves beside every front window'`: 22 `leaf … left` and `leaf … right` parts, two per `window k`. Each
    leaf's vertices lie `CRAFT.shutter.lift` off the front. Their `(s, t)` span Decision (f)'s rectangle for its
    window, to 1e-9, inside `[0, 1]²`.
  - `'the parts keep apart on every front'`: on each house, the rectangles of the `door`, the `band …`, the `window k`
    and the `leaf …` parts, each from its vertices' `(s, t)` with the lean removed. For every pair, the overlap area in
    world units, `max(0, Δs) × |u| × max(0, Δt) × |v|`, is at most 1e-9. A shared edge gives zero.
  - `'the levels keep their order'`: `STROKE_LIFT + 15 × LIFT_STEP < CRAFT.door.lift < OUTLINE_LIFT`, `0.0055 <
    CRAFT.shutter.lift`, and each of the three gaps is at least `2 × LIFT_STEP`. On the drawn buffers: every vertex of
    a `leaf … ink` part lies `CRAFT.shutter.lift + OUTLINE_LIFT` off the front, every vertex of a painting house's
    `door ink` part `OUTLINE_LIFT`, to 1e-9.
  - `'a leaf\'s ink is cheap'`: `outlineFace` over a 0.036 edge with `refHeight` `0.0018 / OUTLINE_FRACTION` and
    `maxSamples` 5 gives 15 vertices (five samples × three columns). Without it, more than 15.
  - `'a painting house\'s eaves overhang 0.03, its rakes 0.015, the church\'s both 0.015'`: on the test's frame
    (`street-build.test.ts:128`, centred at the origin, width along `x`, front toward `+z`),
    `houseRoofEdges(craftShape(h), …)`'s eave bands stand at `|x| = w/2 + 0.03` and its rakes at `|z| = d/2 + 0.015`
    on each painting house. On `{ ...h }` without `eaveOverhang`, both 0.015. On the build: every painting house's
    `left roof` and `right roof` corners 0 and 1 stand `w/2 + 0.03` from its centre along `along`, and the church's
    `STREET_CHURCH.nave.w / 2 + 0.015` along its own.
  - `'a soffit under each eave'`: on the test's frame, `houseSoffits(craftShape(h), …)` gives two `underside` faces on
    each painting house: corners 0 and 1 at `y = eave`, `|x| = w/2`, `|z| = d/2 + OVERHANG`, corners 2 and 3 equal to
    that side's eave band's corners 2 and 3, to 1e-12. A cottage's `craftShape` gives none. On the build, each
    `soffit …` part's four vertices, with the lean removed, equal `houseSoffits(craftShape(h), centre, along,
    toPath)`'s corners, to 1e-9.
- [ ] **Step 2: Run them**: `node --test scripts/street-craft.test.ts scripts/street-build.test.ts`. Expected: the
  new tests FAIL, and 'every painting house\'s roof has an edge' PASSES.
- [ ] **Step 3: Build Decisions (f) and (g).**
- [ ] **Step 4: Run the suite**: `npm run -s test:sky 2>&1 | tee E/t3/test-sky.log`, `npx tsc -b`, `npm run -s lint`.
  Expected: all PASS.
- [ ] **Step 5: The count**: `WT=$PWD node E/tools/street-tri-split.ts > E/t3/split.log`. Report the total and the
  time, for the Lead's budget.
- [ ] **Step 6: Commit** by pathspec: `feat(street): shutters beside the front windows, deeper eaves with an underside
  (K1 task 3)`.

### Task 4: the look passes (Lead)

At true scale, stops 0 to 4 on both viewports, each beside the base's frame (Task 0): 1:1 crops of each stop's nearest
houses, and 4× nearest-neighbour crops of a door and a shutter. Beside them, the scan's village at 1:1 and Simon's
frame. The questions, in order:

1. Do the walls read as solid paint, not planks and not a dark wall with a few light streaks?
2. Does each door read as a door you could step up to?
3. Do the shutters read as shutters, without a toy town's colour or a comic's ink?
4. Do the eaves read as a roof with thickness?
5. From stop 0, does the village still read as the painting's?

Each pass changes the knobs in Decision (a)'s order (base, then cover), or a part's value inside its range. It then
runs `npm run -s test:sky` and `E/tools/street-tri-split.ts` (triangles and time). It captures again, looks, and
writes the pass into the record `tasks/2026-10-25-village-craft-k1.md` and `tasks/lessons.md`. A pass that needs knob 3
or 4 stops for Decision (b)'s amendment and its review. The soft target follows Decision (i): a miss carries to K2
with its exact residual. Cap: four passes. If the walls still read as planks after the fourth, stop and ask Mark.

### Task 5: the gate's runs (Lead)

- [ ] `git status --short` empty. `npx tsc -b`, `npm run -s lint`, `npm run -s test:sky`, `npm run -s build`.
- [ ] Against port 5205: `check-street-grass.mjs` (every case), `check-street-walk.mjs`, `check-street-rotation.mjs`,
  `check-street-cypress-hang.mjs`, `check-portal.mjs`, `check-reduced-motion.mjs`.
- [ ] The palette gate on the branch and the base: the `full` and `ids` pairs at `t` 5 with `light=0` (S1 Task 7's
  method) at stops 0 to 4 on both viewports, `check-street-colour.ts` on each, every class under ΔE 10. The record
  gives the walls' ΔE on both, so it shows how far the new parts move the walls' mean.
- [ ] The frame time at stops 0 and 3 on both viewports, five rounds, the branch on 5205 and the base on 5204 side by
  side. The runner is the frogs' (`scratchpad/frogs-t4-perf.sh` from the frogs' session, rewritten for this session's
  paths if it is gone), the perf marker made first.
- [ ] The browser's sweep on the branch, Task 0's points: every point under 1,444,930.
- [ ] The build's time against the base's (`E/tools/street-tri-split.ts` on both worktrees).
- [ ] The gate's sheet for Mark: Task 4's crops at the last pass, the far read at stop 0 beside the painting's village.

### Task 6: review and the record (Lead)

- [ ] Codex's branch review (a brief file and a one-line pointer), each finding answered in the record. The
  Consultant if Codex's usage has run out.
- [ ] The record `tasks/2026-10-25-village-craft-k1.md`, the Tunables entry in `CLAUDE.md`, `tasks/lessons.md`, the
  pickup in `tasks/todo.md`.
- [ ] Present to Mark with the live URL (the LAN address of port 5205) and the sheet. His gate ends K1. Then K2's plan.
