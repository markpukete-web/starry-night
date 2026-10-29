# The church and its square, slice 2, the owl and the moths: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Revision 2 (2026-10-29, 23:30).** Argon stopped Task 1 at Step 3 (`C/owl/t1/report.md`) and probed why against
the real tests. Two blockers in revision 1's values, both the Lead's: under `pitch` π/2, `ellipsoid` makes `radii[2]`
the vertical half-height and `radii[1]` the front-to-back depth, so revision 1's unswapped radii gave a body 0.19 tall
and 0.40 deep (Test 1 failed by 24×). And Test 2 could not pass: 4 chest strokes by 4 steps are 48 vertices against
the test's "more than 50", and the wing band [−0.12, 0.62] wrapped a third of its span onto the front. The values
now: the body's radii `[0.21, 0.19, 0.40]`, the head's `[0.21, 0.19, 0.18]`, the face's `[0.17, 0.06, 0.16]`, the
chest 6 strokes by 4 steps, the wing band `[0.05, 0.45]`, the face's strokes over its +z half. Argon's probe of that
set: Test 1 passes (the feet 0.00007 off, the crown 0.00012), Test 2 passes (70 front, 80 back, 0.83 and 0),
544 triangles. The tests stand as written. Task 2 (the moths) was built and merged meanwhile (`e1cf321`), so Task 1's
branch merges `feat/church-owl` first and the `Street.tsx` and `test:sky` conflicts go away.

**Revision 1 (2026-10-29, 23:10).** Codex's correctness read (`C/owl/review/codex-plan-r0.md`, REVISE, F1 to F10,
Q1 to Q3) and the builder's buildability read (`builder-plan-r0.md`, NOT BUILDABLE, A1 to A6, B1 to B5) folded,
the dispositions in `lead-plan-r0.md`. The two that mattered most: `ellipsoid`'s polar axis is z, so revision 0's
paint bands put the chest on the back (F2, A2), and the look compared the neck in world space with `vincentGround`
in the street's frame (F3, A4). Also: the face proud of the head (A3), the easing test against the delta clamp (F5),
the moths' rest point past the lantern's half-diagonal (F6), the loop's wobble zero at the rest point and the bound
`rest + radius + wobble` (F1, B1), the billboard's full width (F7), the fog on the moths (Q3), the sightline test's
file (F8, A1), the fixture without `paint` (F4, B2), the seams' fields (F9, B3), case 20's Pause page (F10). Mark's
call at 23:00: Argon builds Task 1 (the bigger task, on its own budget), the Sonnet builder Task 2.

**Revision 0 (2026-10-29, 22:50).** Written from the design's slice 2 section and a code sweep (`C/owl/t0/`), after
Mark passed slice 1 on the preview at 22:10. Codex's correctness read and a builder's buildability read come next.

**Goal:** A barn owl sits on the nave's ridge, blinks, and turns its head to Vincent when he is near, and a few pale
moths circle each lamp and each lit window near the camera, all inside the triangle ceiling and still under reduced
motion.

**Architecture:** The owl is built as the frog is (`frog.ts`): ellipsoids clad in the painting's strokes through
`vincent.ts`'s `clad`, `solid` and `stroke`, in two parts, the body and the head about its neck, so the head turns as a
rigid group. Its component (`StreetOwl.tsx`) is `StreetFrog.tsx`'s pattern: the same materials, the frogs' blink
with its own phase, the draw cull by distance, and a head loop that eases toward `vincentGround`. The moths are one
mesh: a quad template instanced 29 times, the loop computed on the CPU each frame into one attribute (29 points), the
billboard and the wing flap in the vertex shader, the colour the lantern's lit mean dimmed by distance from the
glass. Nothing in `buildStreet` changes, so the build hash and the grass hash hold.

**Tech stack:** three.js, R3F, `vincent.ts`'s surface helpers, `frog.ts`'s `ellipsoid` and `frogBlink`,
`InstancedBufferGeometry` as the grass uses it, `node --test`, `check-street-grass.mjs`'s browser cases. No new
dependency.

**Spec:** `docs/superpowers/specs/2026-10-29-church-square-design.md`, Decisions (i) to (n) and Mark's call 3 (the
owl at 0.024, its size a tunable), with its Constraints and Anti-goals. Slice 1 is built and passed (`tasks/2026-10-29-church-square.md`).

## Session mapping

Lead: Claude Fable `w4:p1`, in the worktree
`/private/tmp/claude-502/-Users-markma-Projects-starry-night/7b901d75-9d6a-49c2-8abd-525273745dfd/scratchpad/church-wt`
on `feat/church-owl`, off `32e692b` (the head of PR #38's branch `feat/church-square`, not yet in `main`. After Mark
merges #38, `git merge origin/main`). Reviewer: Codex `w4:p4`, Fable `w4:p6` when Codex is low. Builders: Gemini 4
Argon `w4:p5` for Task 1 (the owl), in its own worktree added from the main checkout, and the `builder` subagent
(Sonnet 5.5, effort high, its own worktree) for Task 2 (the moths), in parallel on `feat/church-owl-t1` and
`feat/church-owl-t2`, both off revision 1's commit. Each brief names this plan, the task, the base
commit and the branch. The Lead does Task 0 (done), Task 3 and Task 4, and merges the two branches (both add one
line to `Street.tsx` and one file to `package.json`'s `test:sky`). Evidence goes to
`/Users/markma/Projects/starry-night/scratch/church-animals-2026-10-29/owl/` (below, `C/owl/`), one folder per task.
Builders never push, install or open a PR. One browser check runs at a time, each with its own vite server.

**Every worktree needs two links before any test runs:** `ln -s /Users/markma/Projects/starry-night/reference/derived
<worktree>/reference/derived` and `ln -s /Users/markma/Projects/starry-night/node_modules <worktree>/node_modules`.
A builder's raw test log must show the painting tests ran, not skipped.

## Global constraints

- Every colour comes from a rectangle of the scan (`STREET_SOURCES`, `VINCENT_SOURCES`) or `palette.json`. The owl's
  face and front from `churchLit`, its back and wings from `thatch`, its eyes `PALETTE.ground` (the street's ink). The
  moths from `windowLit`, the lantern's own mean.
- The owl at most 1,500 triangles, the moths 58. The build's buckets unchanged: `computeBuildHash` pins in
  `scripts/street-lived.test.ts` (`918dd24d40740805`, `46f2bc6ba04296ab`) and the grass pins hold. The walk's worst
  sampled point at most 1,444,930 (today 1,433,053 at `t` 0.26). 60 fps at stops 0 and 3 at dpr 1.5, p95 at most
  18.6 ms.
- `prefers-reduced-motion` and Pause (`reduced`): the owl's eyes open, its head held, the moths at rest on the glass's
  frame, every frame byte-identical to the last.
- The camera is never the head's target. The target is `vincentGround` (`streetWalk.ts:321`), null without him.
- `hold` (the portal's entering frames) is not passed to the owl or the moths, as it is not to the frogs: they take
  `reduced` alone (Codex Q2).
- `?light=0` draws the owl unlit with the frog's unlit materials and no moths (they mount with `StreetLife`, which
  needs `light`). `ids` 1 or 2: the owl's strokes carry class 255 as the frog's do, the moths are absent.
- The retune cap: four look passes. The levers are named in Task 3 and nothing else is lifted by hand.
- No new dependency. British English. Conventional commits, each ending with
  `Claude-Session: https://claude.ai/code/session_016dU6Fh8H7N6GoFycno2Cvd`.
- Claude does not edit The bar, Gates, Out of scope or the acceptance criteria.

## Review focus

Five inputs the design implies and no decision names. Each has its test in the task that owns the code.

1. `vincent=0`, `walk=0`: `vincentGround` stays null, so the head must stay straight and never fall back to the lane
   slot. Task 1, `owlLook` with `null`, and case 20's `walk=0` page.
2. The camera as the target by mistake: at stop 4 Vincent is 0.31 from the perch and the camera 0.91, so a head
   that follows the camera reads straight there. Task 1, case 20 asserts the turn at stop 4 and none at stop 3.
3. The flat panel (`flat=1`): no owl and no moths, as there are no frogs. Task 1 and Task 2's mount conditions, case
   20's `flat=1` page (`window.__owl` undefined) and case 21's.
4. Pause mid-turn: `reduced` rises while the head is part way round. The head holds where it is (no snap, no
   drift), the moths go to their anchors as the frogs' eyes open. Task 1's loop skips the easing under `reduced`,
   and case 20's page (g) turns reduced motion on after the turn and reads the pose held. Task 2's
   `mothPositions(specs, 0)` returns the anchors.
6. The wander: off the lane, `vincentGround` follows him and `vincentPlace(t)` does not. The loop reads
   `vincentGround` and the seam `__owl().target` shows what it read. A browser page cannot send him wandering
   without a tap at a projected point, so the gate's diff read checks that one line (Codex F10's second half).
5. A lit window behind the camera, within 0.6: its two moths are drawn and the halo's plane is behind the camera,
   so they are faint, not dark. Task 2, `mothBright` depends on the glass's distance only, never on the camera.

## Where this plan departs from the design's text

- **The perch's height.** The ridge is at 0.425 (`eave` 0.24 + `pitch` 0.185), and its ink line rides `OUTLINE_LIFT`
  0.005 above it (`streetGeometry.ts:687`, `streetStrokes.ts:104`). The owl's feet stand at 0.430, on the ink, not in it.
- **Draw calls.** The design's (n) counted two or three. The frog's pattern splits a figure by material (underpaint,
  strokes, each eye), so the owl is six draw calls where it is drawn (stops 3 and 4) and none at stop 0. The moths are
  one draw call at every `t`. Stop 0 goes from 321 to 322.
- **The head's pitch.** The design names the yaw's cone only. At stop 4 Vincent's head is 0.36 below the owl's neck
  and 0.31 away (51° down). A head that turns in yaw alone looks over him. The head pitches toward the target as
  well, eased with the yaw, capped at `OWL.look.pitch` 0.7 rad. The Lead's call.
- **The moths' loop on the CPU.** 29 points a frame in `mothPositions`, written to one instanced attribute. The
  geometry is still built once. The loop is one function the test runs at any time, with no second copy in GLSL.
- **The moths' rest point.** The lantern's glass is its centre (`lamps[].lantern`), inside the 0.012 square box. A
  moth at rest sits 0.0105 out horizontally from that centre, past the box's half-diagonal (0.0085) by 0.002 at any
  yaw (Codex F6), and on a window 0.003 out along its normal from the quad, which is already 0.0055 off the wall.
- **The fog.** The moths take the street's linear fog in their own shader (`FOG`, near 0.8, far 3.5), so a far lamp's
  moths fade as its post does. The halos do not fog. Codex Q3, the Lead's call: an unfogged pale quad two units away
  is a spark.

---

### Task 0: the facts (the Lead, done, `C/owl/t0/probe.ts`, `probe.log`)

The nave: centre (−0.2716, −2.5949), `yaw` 0.3457, `w` 0.26, `d` 0.31, `eave` 0.24, `pitch` 0.185. `along` =
(cos yaw, 0, sin yaw), `toPath` = (−sin yaw, 0, cos yaw) = (−0.3389, 0, 0.9408), the front wall's outward normal,
toward the square. `churchFront()` = (−0.3241, 0, −2.4491). The perch, `churchFront()` moved 0.08 along −`toPath`
at y 0.430: (−0.2970, 0.4300, −2.5243). The body's yaw `atan2(toPath.x, toPath.z)` = −0.3457.

| Stop | camera to the perch | Vincent's slot to the perch (horizontal) | off the facing | pitch to his head (y 0.07) |
| --- | --- | --- | --- | --- |
| 0 | 2.738 | 2.168 | 23.0° | −9.9° |
| 1 | 2.241 | 1.678 | 21.7° | −12.7° |
| 2 | 1.752 | 1.334 | 35.8° | −15.8° |
| 3 | 1.415 | 0.818 | 37.8° | −24.7° |
| 4 | 0.907 | 0.307 | 49.7° | −50.8° |

So the owl is drawn at stops 3 and 4 (`draw` 1.5) and the head turns at stop 4 only. Both cameras are the same for
the phone. The lamps' glass centres sit at y 0.138. Stop 3's nearest lamp in frame is `t` 0.79 at 0.42, stop 4's is
`t` 1.0 at 0.39 (`t` 0.79 is 0.13 away, beside the camera). From stop 4 the line of sight to the owl crosses the
front wall's plane at y 0.39 to 0.41 and 0.055 right of the ridge, where the gable's edge is at 0.35: the owl shows
above the gable's right slope, against the sky. From stop 3 it crosses at 0.41 against an edge at 0.35.

### Task 1: the owl (builder A, `feat/church-owl-t1`)

**Files:**
- Create: `src/scene/owl.ts`, `src/scene/StreetOwl.tsx`, `scripts/street-owl.test.ts`
- Modify: `src/scene/frog.ts:84` (export `ellipsoid`), `src/scene/Street.tsx:194` (the mount, after `StreetFrog`),
  `package.json:22` (`scripts/street-owl.test.ts` appended to `test:sky`), `scripts/street-church.test.ts:374-393` (the
  sightline test slice 1's Task 3 added: the owl's head joins its targets), `scripts/check-street-grass.mjs` (case
  20, after case 19)

**Interfaces:**
- Consumes: `ellipsoid(centre, radii, pitch)` from `frog.ts`; `clad`, `solid`, `stroke`, `sphere`, `emptyPart`,
  `triangles`, `underpaintColour`, `VINCENT_CLASS`, `VincentPart`, `Surface` from `vincent.ts`; `STREET_SOURCES`,
  `OUTLINE_LIFT` from `streetStrokes.ts`; `STREET_CHURCH`, `churchFront`, `walkPose`, `STATION_T`, `vincentPlace`
  from `streetLayout.ts`; `frogBlink`, `FROG` from `frog.ts`; `lifeTime` from `streetLife.ts`; `vincentGround` from
  `streetWalk.ts`; `PALETTE` from `palette.ts`; `mulberry32` from `brush.ts`.
- Produces, in `owl.ts`:
  - `OWL` (below), `OWL_EYES: readonly [Vec3, Vec3]` (the eyes' centres about the neck, world units, right then left).
  - `buildOwl(painting: ImageData2D): OwlBuild` with
    `type OwlBuild = { body: VincentPart; head: VincentPart; eye: BrushArrays & { cls: number[]; src: number[] }; neck: [number, number, number]; triangles: number }`.
    The body's vertices are about the feet (y 0 at the ridge), the head's about the neck, so the head's group turns
    in place. One eye, about its own centre, drawn twice at `OWL_EYES` (the frog's way), and `triangles` counts it
    twice. `Vec3` and `m` (owl lengths to world units) are `owl.ts`'s own, as `frog.ts:78-81` has them.
  - `owlPerch(): { position: [number, number, number]; yaw: number }`: the perch and the body's yaw from Task 0's
    expressions, computed from `STREET_CHURCH.nave` and `churchFront()`, never typed in.
  - `owlLook(neck: [number, number, number], bodyYaw: number, target: [number, number] | null): { yaw: number; pitch: number }`:
    the head's local yaw and pitch toward the point `(target[0], OWL.look.targetY, target[1])`, `neck` and `target`
    both in the street's frame (`vincentGround`'s, Codex F3), the yaw the target's bearing less `bodyYaw` wrapped
    to (−π, π], both 0 when `target`
    is null, when the horizontal distance from the perch exceeds `OWL.look.reach`, or when the yaw's magnitude
    exceeds `OWL.look.yaw`. The pitch is `atan2(dy, horizontal)`, negative for a target below, clamped to
    ±`OWL.look.pitch`.
  - `easeLook(current: number, wanted: number, dt: number): number`: `current + (wanted − current) × (1 − exp(−dt / OWL.look.tau))`,
    `dt` clamped to [0, 0.1].
  - `owlBlink(t: number): number`: `t > 0 ? frogBlink(t + OWL.blink.phase) : 0`.
- `OWL`:
  ```ts
  export const OWL = {
    /** feet to crown, world units. Mark's call 3: 0.024 (a large bird, 48 cm beside Vincent's 0.085 for 1.7 m), so the
     * phone finds it; a barn owl's true scale is 0.018 (36 cm). A look pass may bring it back toward 0.018. */
    size: 0.024,
    trueSize: 0.018,
    /** drawn within this of the camera: stops 3 (1.415) and 4 (0.907), not stop 2 (1.752) */
    draw: 1.5,
    /** the perch: this far back from the front gable's peak along the ridge, standing on the ridge's ink */
    back: 0.08,
    lift: 0.0002,
    /** the rest in owl lengths (size 1 = feet to crown), +z the way the body faces: an upright barn owl. Every
     * ellipsoid takes `pitch` π/2, so `ellipsoid`'s polar axis (z, `frog.ts:84-96`) stands up: `s` runs feet to
     * crown and the strokes with it, and `a` 0.75 is the front (+z), 0.25 the back (Codex F2, the builder's A2).
     * Under that pitch `radii` is [across, front-to-back, feet-to-crown]: `radii[2]` is the vertical half-height and
     * `radii[1]` the depth (revision 2, Argon's blocker 1) */
    body: { centre: [0, 0.40, 0], radii: [0.21, 0.19, 0.40], pitch: Math.PI / 2 },
    neck: [0, 0.66, 0.02],
    head: { centre: [0, 0.16, 0.0], radii: [0.21, 0.19, 0.18], pitch: Math.PI / 2 },
    /** the heart face: a flattened cap proud of the head's front by 0.03 (its tip at z 0.22 against the head's
     * 0.19, the builder's A3), pale */
    face: { centre: [0, 0.14, 0.16], radii: [0.17, 0.06, 0.16], pitch: Math.PI / 2 },
    eye: { centre: [0.075, 0.17, 0.19], r: 0.045 },
    /** the paint's bands in `a` (round) and `s` (feet to crown): the chest pale, the back and wings the thatch's */
    chest: { around: [0.62, 0.88] as [number, number], along: [0.05, 0.95] as [number, number] },
    wing: { around: [0.05, 0.45] as [number, number], along: [0.05, 0.95] as [number, number] },
    /** the head toward Vincent: within `reach` of the perch and within `yaw` of the body's facing, eased over `tau` */
    look: { reach: 0.6, yaw: 1.2217, pitch: 0.7, tau: 0.6, targetY: 0.07 },
    /** the frogs' blink table, this many seconds ahead of them (`frogBlink(phase)` is 0: the eyes open at time 0) */
    blink: { phase: 1.3 },
  } as const
  ```
  `look.yaw` is 70° in radians. The head's centre, face and eye are about the neck.

- [ ] **Step 1: write the failing tests** in `scripts/street-owl.test.ts`, with the painting loaded as
  `scripts/street-frog.test.ts:21-22` does (`{ skip }` without it), its `camera` helper and `ASPECTS`
  (`street-frog.test.ts:135-146`) copied, and the file's own `distance(a, b)`, `lowestY(part)` and `highestY(part)`
  (over a part's underpaint and strokes positions), `linear(srgb)` (`new Color().setRGB(..., SRGBColorSpace)`) and
  `dist(c, d)` (in linear RGB).

```ts
test('the owl fits: at most 1,500 triangles, its feet on the perch, its crown at its size', { skip }, () => {
  const owl = buildOwl(painting)
  assert.ok(owl.triangles <= 1500, `${owl.triangles} triangles`)
  assert.ok(Math.abs(lowestY(owl.body)) <= 0.0002)                 // every vertex of body.underpaint and body.strokes
  assert.ok(Math.abs(owl.neck[1] + highestY(owl.head) - OWL.size) <= 0.0015)
})
test('the chest is pale and the back is the thatch: the strokes by their side', { skip }, () => {
  const owl = buildOwl(painting)
  const lit = linear(sourceUnderpaint(painting, 'churchLit', 1)), thatch = linear(sourceUnderpaint(painting, 'thatch', 1))
  const front: number[] = [], back: number[] = []
  const { positions, colors } = owl.body.strokes.arrays                 // the stroke vertices' colours are linear
  for (let i = 0; i < positions.length; i += 3) {
    const z = positions[i + 2], c = [colors[i], colors[i + 1], colors[i + 2]]
    const nearerLit = dist(c, lit) < dist(c, thatch) ? 1 : 0
    if (z > 0.03 * OWL.size) front.push(nearerLit)
    else if (z < -0.03 * OWL.size) back.push(nearerLit)
  }
  assert.ok(front.length > 50 && back.length > 50, `${front.length} front, ${back.length} back`)
  assert.ok(mean(front) >= 0.8, `front nearer churchLit: ${mean(front)}`)        // Codex F2: the sides, not a band
  assert.ok(mean(back) <= 0.2, `back nearer churchLit: ${mean(back)}`)
})
test('the perch is on the ridge, 0.08 behind the front peak, on the ridge ink', () => {
  const { position: [x, y, z], yaw } = owlPerch()
  const nave = STREET_CHURCH.nave
  const toPath = [-Math.sin(nave.yaw), Math.cos(nave.yaw)]
  const f = churchFront()
  assert.ok(Math.hypot(x - (f.x - toPath[0] * OWL.back), z - (f.z - toPath[1] * OWL.back)) < 1e-9)
  assert.ok(Math.abs(y - (nave.eave + nave.pitch + OUTLINE_LIFT)) < 1e-9)
  assert.ok(Math.abs(yaw - Math.atan2(toPath[0], toPath[1])) < 1e-9)
})
test('the owl is drawn at stops 3 and 4 and not before, and is in frame there on 16:9, 16:10 and the phone', () => {
  const p = owlPerch().position
  for (const [i, t] of STATION_T.entries()) {
    const d = distance(walkPose(t, false).position, p)
    assert.equal(d < OWL.draw, i >= 3, `stop ${i}: ${d}`)
  }
  // NDC of the head's centre within 0.95 at stops 3 and 4 for each aspect, as the frog test's in-frame check
})
test('the owl is seen from stops 3 and 4: the line to its head clears the nave', () => {
  // the church's faces from build.report.faces (owner 'church', as street-church.test.ts:30 reads them), each
  // quad two triangles, assert.ok(faces.length > 0). Ray.intersectTriangle from each stop's camera (desktop and
  // phone) to the head's centre, backface culling off. No hit nearer than the head's distance less 0.01.
})
test('the head turns toward a target within reach and inside the cone, never without one', () => {
  const { position: perch, yaw } = owlPerch()
  const neck: [number, number, number] = [perch[0], perch[1] + OWL.neck[1] * OWL.size, perch[2]]
  const at = (angle: number, dist: number): [number, number] => {
    const a = yaw + angle
    return [neck[0] + Math.sin(a) * dist, neck[2] + Math.cos(a) * dist]
  }
  assert.deepEqual(owlLook(neck, yaw, null), { yaw: 0, pitch: 0 })
  assert.deepEqual(owlLook(neck, yaw, at(0.5, 0.7)), { yaw: 0, pitch: 0 })          // out of reach
  assert.deepEqual(owlLook(neck, yaw, at(1.4, 0.3)), { yaw: 0, pitch: 0 })          // outside the 70° cone
  const look = owlLook(neck, yaw, at(0.5, 0.3))
  assert.ok(Math.abs(look.yaw - 0.5) < 1e-6)
  assert.ok(Math.abs(look.pitch - Math.max(-OWL.look.pitch, Math.atan2(OWL.look.targetY - neck[1], 0.3))) < 1e-6)
  const s4 = vincentPlace(STATION_T[4]).position
  const l4 = owlLook(neck, yaw, [s4[0], s4[2]])
  assert.ok(Math.abs(Math.abs(l4.yaw) - 0.867) < 0.05, `stop 4 yaw ${l4.yaw}`)       // Task 0: 49.7°
  assert.equal(l4.pitch, -OWL.look.pitch)                                            // 50.8° down, capped
  const s3 = vincentPlace(STATION_T[3]).position
  assert.deepEqual(owlLook(neck, yaw, [s3[0], s3[2]]), { yaw: 0, pitch: 0 })        // 0.818 away
})
test('the easing reaches 95% in three taus and holds at dt 0', () => {
  let a = 0
  for (let i = 0; i < 18; i++) a = easeLook(a, 1, 0.1)                 // 1.8 s of 0.1 s frames, three taus (Codex F5)
  assert.ok(a > 0.94 && a < 0.96, `${a}`)
  assert.equal(easeLook(0, 1, 0.6), easeLook(0, 1, 0.1), 'a frame over 0.1 s counts as 0.1')
  assert.equal(easeLook(0.3, 1, 0), 0.3)
})
test('the owl blinks on the frogs\' table with its own phase, open at 0 and under reduced motion', () => {
  assert.equal(owlBlink(0), 0)
  assert.equal(owlBlink(lifeTime(5, 99, true)), 0)
  assert.equal(frogBlink(OWL.blink.phase), 0)
  let apart = false
  for (let t = 0.01; t < 60 && !apart; t += 0.01) apart = owlBlink(t) === 1 && frogBlink(t) === 0
  assert.ok(apart, 'the owl is shut at some time the frogs are open')
})
```

- [ ] **Step 2: run them.** `node --test scripts/street-owl.test.ts`. Expected: FAIL, `owl.ts` not found.
- [ ] **Step 3: `src/scene/owl.ts`.** `OWL` as above. `buildOwl`: `mulberry32(0x0a1)`, class `VINCENT_CLASS.none`,
  `m()` scales owl lengths by `OWL.size` as `frog.ts:81` (its own copy, with `Vec3`). The body: `solid` underpaint
  (8 round, 5 along) in `underpaintColour(painting, STREET_SOURCES.thatch, 0.4)`, the chest clad from
  `STREET_SOURCES.churchLit` over `OWL.chest` (6 strokes by 4 steps: 72 vertices, Test 2 asks more than 50 on the
  front; revision 2) and the back and wings from
  `STREET_SOURCES.thatch` over `OWL.wing` (8 by 4), `OWL.lift`. The head about `OWL.neck`: `solid` (8, 5) in the
  same underpaint, clad `thatch` over `OWL.wing`'s band, the face `OWL.face` an ellipsoid `solid` (6, 3) in
  `underpaintColour(painting, STREET_SOURCES.churchLit, 1)` with 3 `churchLit` strokes by 3 steps over its +z half
  (`around` [0.5, 1.0], `along` [0.05, 0.95]; revision 2), the eye `sphere` (5, 3) at the origin in `new Color(PALETTE.ground)`, `OWL_EYES` = `m(eye.centre)` and its
  mirror. `triangles` counts the eye twice. No legs, no tail: at 25 px they are under a pixel. `owlPerch`, `owlLook`
  (the yaw wrapped to (−π, π]), `easeLook` (`dt` clamped to [0, 0.1]), `owlBlink` as the Interfaces say.
- [ ] **Step 4: `src/scene/StreetOwl.tsx`**, from `StreetFrog.tsx`: the same `material()` keys, geometries from
  `OwlBuild` (`bodyUnder`, `bodyStrokes`, `headUnder`, `headStrokes`, `eye`), the JSX
  `<group name="street-owl" position={perch} rotation={[0, yaw, 0]}>` with the body's two meshes and
  `<group ref={headRef} position={neck}>` holding the head's two meshes and the two eye groups. `useFrame((state, delta))`:
  `shut = owlBlink(lifeTime(w.__skyTime, state.clock.elapsedTime, reduced))` into the eyes as `StreetFrog.tsx:60-64`
  does with `FROG.blink` and `OWL.eye.r`; `visible = distance to state.camera.position < OWL.draw`; then, unless
  `reduced`, `wanted = owlLook(neckStreet, yaw, vincentGround)` (the neck in the street's frame: the perch plus the
  neck's offset turned by the yaw, once in `useMemo`, never `getWorldPosition`, which adds anchor A's offset, Codex
  F3), `lookRef.yaw = easeLook(lookRef.yaw, wanted.yaw, delta)`,
  the same for the pitch, `head.rotation.order = 'YXZ'`, `head.rotation.set(-lookRef.pitch, lookRef.yaw, 0)`. The seam
  `window.__owl = () => ({ visible, yaw: lookRef.yaw, pitch: lookRef.pitch, shut, target: vincentGround })`, removed on unmount. Props
  `{ painting: ImageData2D; flags: StreetFlags; reduced: boolean }`.
- [ ] **Step 5: the mount.** `Street.tsx:194`, after the frogs:
  `{!flags.flat && paintingData && <StreetOwl painting={paintingData} flags={flags} reduced={reduced} />}`.
  `frog.ts:84`: `export function ellipsoid`.
- [ ] **Step 6: run the tests.** `node --test scripts/street-owl.test.ts`, then `npm run -s test:sky` with the file
  appended to `package.json`'s list. Expected: PASS, and the build hash pins untouched.
- [ ] **Step 7: the trees' sightline.** In `scripts/street-church.test.ts:374`'s line-of-sight test (slice 1, Task 3,
  its targets at lines 385-391), add
  the owl's head centre (the perch plus `OWL.neck[1] * OWL.size` plus `OWL.head.centre[1] * OWL.size` in y) to the
  targets for stops 3 and 4. Expected: PASS, the test's margin (over all its targets) named in the commit message.
- [ ] **Step 8: case 20** in `scripts/check-street-grass.mjs`, after case 19, as cases 17 and 18 are written: seven
  pages, each with `walkMode=input&arrival=0`. (a) `street=1&station=4&walkT=0.9`: wait for `__streetReady` and
  2.5 s, `__owl()` visible, `|yaw|` at least 0.6. (b) `station=3`: visible, `|yaw|` under 0.05. (c) `station=0`: not
  visible. (d) `station=4` with `walk=0`: `|yaw|` under 0.05. (e) `station=4` under `prefers-reduced-motion: reduce`
  from the start (as case 17 emulates it): `yaw` 0 and `shut` 0 after 2.5 s. (f) `flat=1`: `window.__owl` undefined.
  (g) page (a) again, then reduced motion turned on once `|yaw|` is at least 0.6: a read 1 s later shows the same
  `yaw` within 1e-6 (Pause mid-turn holds the pose, Codex F10). Run:
  `DIORAMA_CAPTURE_URL=http://127.0.0.1:<port>/ node scripts/check-street-grass.mjs --case 20` (or the file's own case
  selector). Expected: PASS.
- [ ] **Step 9: commit**, one per green step: `feat(owl): the barn owl on the nave's ridge, built as the frog is`,
  `feat(owl): the head turns to Vincent within 0.6 and 70°, eased over 0.6 s`, `test(owl): case 20, the owl in the
  browser`. The report to `C/owl/t1/report.md`: the triangle count, the test log (raw), case 20's log, the sightline
  margin.

### Task 2: the moths (builder B, `feat/church-owl-t2`)

**Files:**
- Create: `src/scene/moths.ts`, `src/scene/StreetMoths.tsx`, `scripts/street-moths.test.ts`
- Modify: `src/scene/Street.tsx:183` (the mount, after `StreetLife`), `package.json:22`,
  `scripts/check-street-grass.mjs` (case 21)

**Interfaces:**
- Consumes: `litWindows` and `LAMP_LIGHT` from `streetLife.ts` (`litWindows(windows)` returns
  `{ centre: Vector3; normal: Vector3; width: number }[]`, the class 2 quads 0.0055 off the wall, the normal out of
  the house); the lamps `built.lamps: { foot: Vector3; lantern: Vector3 }[]` from `Street.tsx:83` (the glass centre at
  y 0.138); `sourceUnderpaint(painting, 'windowLit', 1)` from `streetStrokes.ts:339` (the lantern's colour,
  `streetGeometry.ts:1686`); `lifeTime` from `streetLife.ts`; `mulberry32`.
- Produces, in `moths.ts`:
  ```ts
  export const MOTHS = {
    /** a moth's quad, world units: a giant peacock moth's 12 cm, inside the species' 10 to 15 (fact 10) */
    size: [0.006, 0.0045] as [number, number],
    perLamp: 3,
    perWindow: 2,
    /** a window's moths are drawn while its glass is within this of the camera */
    windowReach: 0.6,
    /** the loop: a circle through the rest point, this far across at most, this long a lap, with a vertical wobble */
    radius: [0.02, 0.05] as [number, number],
    period: [1.2, 2.5] as [number, number],
    wobble: 0.006,
    /** the wings' beat, seconds a cycle (5 to 8 a second) */
    flap: [0.12, 0.2] as [number, number],
    /** the rest point: out from the lantern's centre past its 0.012 square's half-diagonal (0.0085) by 0.002 at
     * any yaw (Codex F6), or off the window's glass */
    rest: 0.0105,
    restWindow: 0.003,
    /** brightness 1 at the glass, falling to `dimFloor` at the halo's edge (`LAMP_LIGHT.halo` is the sprite's side) */
    dimRadius: LAMP_LIGHT.halo / 2,
    dimFloor: 0.15,
  } as const
  export type MothSpec = { glass: [number, number, number]; anchor: [number, number, number]; u: [number, number]; radius: number; period: number; phase: number; flap: number; flapPhase: number; window: boolean }
  export function mothSpecs(lamps: readonly { lantern: Vector3 }[], windows: readonly { centre: Vector3; normal: Vector3 }[]): MothSpec[]
  export function mothPositions(specs: readonly MothSpec[], time: number, out: Float32Array): void
  export function mothBright(distanceFromGlass: number): number
  ```
  `u` is the horizontal unit direction from the glass to the rest point: for a lamp a yaw from the seed (`mulberry32(0x3074)`),
  for a window its normal. `anchor` = `glass + u × rest` (or `restWindow`). The loop at `time > 0`, with
  `θ = 2π time / period + phase` (`phase` in [0, 2π)) and `v = up × u`:
  `p = anchor + u (r/2)(1 − cos θ) + v (r/2) sin θ + up × wobble × sin(2θ)`, so the moth is at its rest point at every
  `θ` of 2πk (the wobble is 0 there, Codex F1) and never leaves `rest + radius + wobble` of the glass (the loop's far
  side is `rest + radius` out, the builder's B1). At `time ≤ 0` every moth is at its anchor. `mothBright(d)` = `max(dimFloor, 1 − d / dimRadius)`.

- [ ] **Step 1: write the failing tests** in `scripts/street-moths.test.ts`, with synthetic lamps and windows (seven
  lanterns at y 0.138 along a line, four windows with unit normals) and one test on the real build (`buildStreet` as
  `street-lived.test.ts` calls it, `{ skip }` without the painting).

```ts
test('three moths a lamp and two a lit window: 29 for seven lamps and four windows', () => {
  const specs = mothSpecs(lamps, windows)
  assert.equal(specs.length, 29)
  assert.equal(specs.filter((s) => s.window).length, 8)
})
test('each moth rests on its glass\'s frame and loops within its radius', () => {
  for (const s of mothSpecs(lamps, windows)) {
    assert.ok(s.radius >= 0.02 && s.radius <= 0.05)
    assert.ok(s.period >= 1.2 && s.period <= 2.5)
    assert.ok(s.flap >= 0.12 && s.flap <= 0.2)
    const rest = distance(s.anchor, s.glass)
    assert.ok(Math.abs(rest - (s.window ? MOTHS.restWindow : MOTHS.rest)) < 1e-9)
    assert.ok(Math.abs(s.anchor[1] - s.glass[1]) < 1e-9, 'the rest point is level with the glass')
    assert.ok(s.phase >= 0 && s.phase < 2 * Math.PI)
    if (!s.window) assert.ok(Math.hypot(s.anchor[0] - s.glass[0], s.anchor[2] - s.glass[2]) > 0.006 * Math.SQRT2 + 0.0015, 'clear of the lantern box at any yaw')
  }
  const specs = mothSpecs(lamps, windows)
  const out = new Float32Array(specs.length * 3)
  mothPositions(specs, 0, out)
  specs.forEach((s, i) => assert.ok(distance([out[3 * i], out[3 * i + 1], out[3 * i + 2]], s.anchor) < 1e-6, 'at rest at time 0'))
  for (let t = 0.05; t <= 5; t += 0.05) {
    mothPositions(specs, t, out)
    specs.forEach((s, i) => assert.ok(distance([out[3 * i], out[3 * i + 1], out[3 * i + 2]], s.glass) <= s.radius + (s.window ? MOTHS.restWindow : MOTHS.rest) + MOTHS.wobble + 1e-6))
  }
  specs.forEach((s, i) => {
    const t0 = (1 - s.phase / (2 * Math.PI)) * s.period                 // θ = 2π: a lap's crossing of the rest point
    mothPositions(specs, t0, out)
    assert.ok(distance([out[3 * i], out[3 * i + 1], out[3 * i + 2]], s.anchor) < 1e-6, 'at its rest point once a lap (Codex F1)')
  })
})
test('a moth at the glass is bright and one at the halo\'s edge is faint', () => {
  assert.equal(mothBright(0), 1)
  assert.equal(mothBright(MOTHS.dimRadius), MOTHS.dimFloor)
  assert.ok(mothBright(0.02) > mothBright(0.05))
})
test('the built street has seven lamps and four lit windows, so 29 moths', { skip }, () => {
  // flow and masses loaded as street-lived.test.ts:48-56 does. No `paint`: it is a WallPaint, not a flag (Codex F4)
  const build = buildStreet(painting, flow, masses, { grass: true, lit: true, lane: true, lived: true, flowers: true })
  assert.equal(build.report.lane.lamps.length, 7)
  assert.equal(litWindows(build.windows).length, 4)
  assert.equal(mothSpecs(build.report.lane.lamps, litWindows(build.windows)).length, 29)
})
```

- [ ] **Step 2: run them.** `node --test scripts/street-moths.test.ts`. Expected: FAIL, `moths.ts` not found.
- [ ] **Step 3: `src/scene/moths.ts`** as the Interfaces say.
- [ ] **Step 4: `src/scene/StreetMoths.tsx`.** Props `{ painting: ImageData2D; lamps: readonly { lantern: Vector3 }[]; windows: BrushArraysWithCls; offset: [number, number, number]; reduced: boolean }`.
  `useMemo`: `specs = mothSpecs(lamps, litWindows(windows))`, an `InstancedBufferGeometry` from a 4-vertex quad
  (`position` the corners at ±0.5, `uv`, the index `[0, 1, 2, 0, 2, 3]`) with `instanceCount = specs.length` and
  `InstancedBufferAttribute`s `aAt` (3, written each frame), `aBright` (1, each frame), `aFlap` (1, the period),
  `aFlapPhase` (1). A `ShaderMaterial` after the fireflies' (`streetLife.tsx:72-95`), every colour sRGB and written
  raw (no colour-space include, as the project's own shaders): uniforms `uTime`, `uColour` (the `windowLit` triple
  from `sourceUnderpaint(painting, 'windowLit', 1)`, sRGB 0 to 1, unconverted), `uFog` (`FOG.colour`'s sRGB
  components, `new Color(FOG.colour).getRGB(new Color(), SRGBColorSpace)`), `uSize` (`MOTHS.size`). The vertex
  billboards the corner in view space: `mv = modelViewMatrix * vec4(aAt, 1)`, then `position.x * uSize.x * wing`
  right and `position.y * uSize.y` up, so the unflapped quad is the full 0.006 × 0.0045 (Codex F7), with
  `wing = 0.3 + 0.7 * abs(cos(6.2832 * uTime / aFlap + aFlapPhase))`, and `vDepth = -mv.z`. The fragment is a soft
  oval (`alpha = 1 - smoothstep(0.7, 1.0, length((vUv - 0.5) * 2.0))`), the colour
  `mix(uColour * vBright, uFog, smoothstep(FOG.near, FOG.far, vDepth))` (the street's linear fog, `streetFog.ts`,
  Codex Q3), `discard` when `vBright <= 0.0`. `transparent`, `depthWrite: false`, `depthTest: true`, normal
  blending (a moth is lit, it does not glow), `toneMapped: false`. The mesh `frustumCulled = false`, `renderOrder` 3
  (the window halos' planes are at 4, `streetLife.tsx:223`). `useFrame`: `time = lifeTime(w.__skyTime, elapsed,
  reduced)`, `mothPositions` into `aAt`, then for each moth `bright = mothBright(distance(at, glass))`, and 0 for a
  window moth whose glass is farther than `MOTHS.windowReach` from `state.camera.position` less `offset`. Both
  attributes `needsUpdate`, then `uTime.value = time`. The seam
  `window.__moths = () => ({ count, time, moths: [{ at, glass, anchor, radius, bright, window }] })`.
- [ ] **Step 5: the mount.** `Street.tsx:183`, after `StreetLife`, under its condition:
  `{!flags.flat && flags.ids === 0 && flags.light && built && paintingData && <StreetMoths painting={paintingData} lamps={built.lamps} windows={built.windows} offset={offset} reduced={reduced} />}`.
- [ ] **Step 6: run the tests.** `node --test scripts/street-moths.test.ts`, then `npm run -s test:sky` with the file
  appended. Expected: PASS.
- [ ] **Step 7: case 21** in `scripts/check-street-grass.mjs`: (a) `street=1&station=3&arrival=0&walkMode=input`:
  `__moths().count` 29 with 21 lamp moths and 8 window moths, every coordinate finite, every lamp moth within
  `radius + rest + wobble` of its glass (`rest` the seam's `anchor` to `glass` distance), and the window moths whose
  glass is farther than 0.6 from the camera (`window.__streetCamera().position`, the street's offset 0 by default)
  at `bright` 0, the others above 0. (b) The same page under reduced motion: every `at` equals its `anchor` within
  1e-6 and `time` 0. (c) `light=0`: `window.__moths` undefined. Expected: PASS.
- [ ] **Step 8: commit** per green step: `feat(moths): three moths a lamp and two a lit window, one instanced mesh`,
  `test(moths): case 21, the moths in the browser`. The report to `C/owl/t2/report.md` with the raw logs.

### Task 3: the look passes (the Lead, at most four)

**Files:** `C/owl/t3/looks.md`, `src/scene/owl.ts` (`OWL`), `src/scene/moths.ts` (`MOTHS`).

- [ ] **Step 1: merge** `feat/church-owl-t1` and `feat/church-owl-t2` into `feat/church-owl` after the Lead's gate on
  each (the diff read against this plan, the suite run, tsc and lint). Resolve `Street.tsx` and `package.json`.
- [ ] **Step 2: pass 1, the captures.** Vite on a fresh port. `capture-sky-frames.mjs --prefix` at stop 4 with
  `walkT=0.9` after 3 s (the head turned), both viewports, and at stop 3. Then 1:1 crops of the owl beside the design's
  words (a barn owl: pale heart face, dark eyes, olive-brown back). Stop 3's lamp `t` 0.79 with its moths, both
  viewports, three frames 0.3 s apart. Name what reads wrong.
- [ ] **Step 3: the levers**, and nothing else: `OWL.size` (0.024 toward 0.018 if it reads too big, Mark's call 3),
  the body's and head's radii, the face's radii and the share of `churchLit` on the chest, `OWL.eye.r`. Then
  `MOTHS.size`, `dimFloor`, `flap`, `radius`, the fragment's oval edge. Each pass re-captures and is written to
  `looks.md` with its crops. The anti-goals are the bar: not a Halloween owl, not a lump, not sparks, not fireflies.
- [ ] **Step 4: commit** each pass: `tune(owl): look pass N, <what moved>`.

### Task 4: the gate (the Lead)

**Files:** `C/owl/t4/gate.sh` (from `C/t6/gate.sh`, the branch and port changed), `tasks/2026-10-29-church-owl.md`
(the record), `CLAUDE.md` (Tunables), `tasks/todo.md`, `tasks/lessons.md`.

- [ ] **Step 1:** `npx tsc -b`, `npm run -s lint`, `npm run -s test:sky`, `npm run -s build`. Expected: all clean, the
  build hash pins untouched (the buckets did not change).
- [ ] **Step 2:** the six browser checks, one at a time (grass now 21 cases, walk, rotation, cypress hang, portal,
  reduced motion with `DIORAMA_CAPTURE_URL` at `station=4&walkT=0.9` so the owl and the moths are in the two frames).
  Expected: every case PASS.
- [ ] **Step 3:** the colour gate at stops 3 and 4, both viewports, `light=0` (`ids=1`): the church class within its
  bar as slice 1 left it (3.0 at stop 4). The owl's strokes are class 255 and sit outside the church's mask.
- [ ] **Step 4:** the triangle sweep (`tri-read.mjs`, slice 1's `TS` list). Expected: the worst point at most
  1,444,930, and stop 4's count up by the owl's and the moths' (at most 1,558). Perf at stops 0, 3 and 4 at dpr 1.5:
  p95 at most 18.6 ms. Draw calls at stop 0: 322 (the moths), at stop 4 the owl's six more.
- [ ] **Step 5:** the design's gate shows: stop 4 with Vincent arrived and the head turned, both viewports. A frame
  sequence of the turn (`capture-walk.mjs` from `walkT=0.85` to the dwell, 0.25 s apart) and a blink
  (`__skyTime` pinned at a shut time of `owlBlink`). Stop 3's lamp `t` 0.79 with its moths and the same under reduced
  motion. Into `C/owl/t4/` and the record.
- [ ] **Step 6:** the record `tasks/2026-10-29-church-owl.md`, the Tunables entry in `CLAUDE.md` (the owl, the moths,
  the counts, the draw calls, the look passes), `tasks/todo.md`'s pickup, `tasks/lessons.md`. Commit:
  `docs(owl): slice 2's record, the gate's runs`.
- [ ] **Step 7:** Codex's branch review (`w4:p4`, a brief file), fixes in one batch, the Lead's dispositions. Then,
  once #38 is in `main`, `git merge origin/main`, push, and the PR with the session link for Mark's pass on the
  preview. If #38 is still open, the push waits and the record says so.
