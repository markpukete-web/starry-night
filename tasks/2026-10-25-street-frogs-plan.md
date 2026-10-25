# Street frogs, five that read as frogs: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Revision 1 (2026-10-25, night).** Mark passed the portal's gate, with one doubt about the street: "the frog doesn't
seem like a frog and I think we should put multipule frogs in different location instead of just stop 0". He chose
"One near each stop": five frogs, one in a grass gap near each of the five stops, each turned so that stop's camera sees
it side-on, their poses varied a little. A spike on this branch rebuilt the frog's shape and measured spots in the
render (`scratch/street-frogs-2026-10-25/spike/`). Its numbers are the plan's starting values. The Lead builds every
task. Mark's gate is the end of the slice.

**Goal:** At each of the five stops a frog sits in a gap of the left verge's grass, side-on to that stop's camera. At
true scale on the desktop and the phone it reads as a frog: a sitting outline, a back leg folded with the knee forward,
eyes high on a flat head, a pale throat and lip. Each blinks on its own clock. The frogs show with the grass, as the
frog does today.

**Architecture:** One frog shape, built once from the painting and drawn five times. A table holds each frog's spot
(`t`, lateral), its stop, its turn from side-on, its size and crouch (its group's scale) and its blink phase. The
spots come from a search that measures in the render how much of a frog each stop's camera sees. A check case keeps
that measure at the gate.

**Tech stack:** three.js, Vincent's builders (`clad`, `solid`, `stroke`, `sphere`, `tube`), R3F, `node --test`, the
check scripts. No new dependency.

**Spec:** Mark's words and his choice above (the portal's record, "Mark's gate"), S3b's frog
(`tasks/2026-10-25-street-s3b-plan.md`, Task 6, and its record), and the facts below.

## Session mapping

Lead and builder: Claude, `w4:p1`. Reviewer: Codex, `w4:p4`, or the Consultant (Fable, `w4:p6`) when Codex runs low
(Mark, 2026-10-25). The Lead checks each address against `herdr agent list` before a dispatch. The worktree is
`scratchpad/frogs-wt` on `feat/street-frogs`, stacked on `feat/street-portal`, served at `http://127.0.0.1:5199/`.
Nothing is pushed before Mark has seen it.

## The facts the plan rests on (read at the portal's head, `cc56207`)

1. Today's frog (`src/scene/frog.ts`, `src/scene/StreetFrog.tsx`) is one ellipsoid body, two haunches, two straight
   arms, a throat and two eyes, 1,944 triangles. It sits at `t` 0.022, lateral −0.076, turned 0.2 rad from facing stop
   0's camera. At true scale it is about 15 px on the desktop and 6 px on the phone, head-on, so only the eyes read
   (`scratch/street-s3b-2026-10-25/t6/frog-p4b/`). Street mounts it only with the grass (`Street.tsx:212–213`).
2. Its seam `window.__frog()` returns `{ shut, sink, scale }` for the right eye. Case 17 of `check-street-grass.mjs`
   (`:1144–1189`) reads it. `street-frog.test.ts` pins the blink, the size, the place, the gap and stop 0's frame.
3. The stops are `STATION_T` = [0, 0.23, 0.44, 0.66, 0.9]. Each camera is `walkPose(t, portrait)`: eye height 0.09,
   0.18 behind the lane point, field 50° landscape and 75° portrait. The phone's horizontal half-field is about 19.5°,
   so the verge's inner edge (|lateral| 0.066) comes into the phone's frame only about 0.2 ahead of its camera.
4. The grass draws a share of each chunk's blades by its distance from the camera (`grassDrawCount`), so what hides a
   frog depends on the stop.
5. Vincent walks 0.4 ahead of the camera at lateral 0.03, moving to 0.07 between stops 3 and 4, half-width 0.025
   (`VINCENT_RIG`). The left verge (negative lateral) is never on his line. `vincentBoxCorners(t)` gives his box.
6. At stop 4 the camera pitches up 8.8° to the church, so the desktop's frame meets the ground only 0.31 ahead. The
   grass ends at `t` 0.97 and round the square (`GRASS.t`, `inFootprint`).
7. `stroke` lifts every stroke 0.0004 off its shape (`vincent.ts:56`). On a frog's leg of radius 0.0004 that doubles
   its width.
8. From the spike: the rebuilt shape reads as a frog at about 30 px on the desktop at stop 0
   (`spike/show-a/s0-desktop-crop-x.png`). On the phone it is about 18 px and reads only just. A geometric
   line-of-sight test against the blades said "all seen" where the render showed a blade across the frog, so the spots
   are measured in the render: the frame with the frog, the frame without it, and the frog drawn over everything.

## Decisions

- **(a) The shape**, in frog lengths (`FROG.size` 0.0086, snout to vent, about 17 cm beside Vincent's 0.085), built
  in the spike (`spike/a3/close-threeq.png`):
  - The torso is an ellipsoid at (0, 0.22, −0.1), radii (0.24, 0.17, 0.33), its nose raised 0.42 rad. The back slopes
    up from the rump on the ground.
  - The head is an ellipsoid at (0, 0.37, 0.28), radii (0.27, 0.14, 0.27), its nose down 0.2 rad. Its top is flat.
  - The throat is a pale ellipsoid under the head, at (0, 0.28, 0.29), radii (0.22, 0.08, 0.22).
  - The back leg folds: hip (0.15, 0.17, −0.3), knee (0.35, 0.2, 0.06), heel (0.3, 0.05, −0.36), toe (0.42, 0.02, 0.1).
    The thigh's radius runs 0.11 to 0.07, the shin's 0.065 to 0.04, the foot's 0.04 to 0.03. Three toes fan 0.5 rad,
    0.16 long.
  - The front leg: shoulder (0.16, 0.25, 0.18), elbow (0.25, 0.13, 0.12), hand (0.23, 0.015, 0.3). Its radii run 0.05
    to 0.04 and 0.04 to 0.03. Three fingers fan 0.9 rad, 0.08 long.
  - A sphere sits at the knee, the heel, the elbow and the hand, so no tube shows its cut end.
  - The eyes sit at (±0.14, 0.48, 0.3), radius 0.075, in sockets 0.035 lower.
  - The paint: the back from the bushes' greens, the lighter half (luma share 0.45 to 0.95). Seven dark spots, and dark
    bands across each thigh and shin (share 0.02 to 0.2). Two pale ridges along the back. The belly, the throat and a
    stripe above the lip in the street's plaster, warmed 0.35 toward the lightest green. A dark line along the jaw.
  - The strokes stand `FROG.lift` = 0.00012 off the shape. `stroke` and `clad` take an optional `lift` that defaults to
    today's 0.0004, so Vincent does not change.
- **(b) One build, five frogs.** Each frog is a group over the same geometries and materials. Its size and crouch are
  the group's scale: x and z by `scale`, y by `scale × crouch`. The poses vary by these two, by the turn and by which
  way it faces. The five share their strokes: at 15 to 40 px nobody can tell them apart by stroke. If Mark asks, a
  second build with its own seed is the fallback.
- **(c) The spots.** Each spot was chosen by the search (Task 2, step 1) from those that pass six tests: in a gap of
  the grass, off the path, clear of Vincent's walk, in frame on the desktop (16:9 and 16:10) and on the phone at its
  stop, and at least 0.85 of the frog seen on both. Of those, the one with the most pixels on the phone. Three
  departures, each forced by the frames:
  - Stop 1's frog sits on the right verge, Vincent's side. No left spot nearer than 0.78 is in the phone's frame there
    (the lane bends right). It stays at least 0.02 from his box's footprint at every walk `t`.
  - Stop 4's frog sits on the square's open ground, just past the grass's end. At stop 4 no grass is in both frames:
    the desktop sees grass only at `t` 0.96 to 0.97 far left, the phone only at `t` 0.90 to 0.92 on Vincent's line
    (`spike/s4-probe.mjs`). **For Mark:** this is the one frog not in the grass ("Why not under the grass", S3b).
  - Stop 4's frog stands on the ground's strokes, not the grass's base: the strokes rise to `STROKE_LIFT` +
    `LIFT_LEVELS` × `LIFT_STEP` = 0.00425, and at the base's 0.001 they hid 27% of it. So `FrogSpec` carries its `y`.
  The table is in Task 2.
- **(d) Side-on.** A frog's heading is its stop camera's bearing turned by `±(π/2 − face)`, `face` 0.25 to 0.5 rad, so
  it shows its side with a little of its face. `toward` picks the sign: `'lane'` turns its nose toward the lane's
  centre, `'away'` from it.
- **(e) The blink.** Each frog's clock is the sky's clock plus its `phase`. `frogBlink(t, phase)` returns 0 for any
  `t` that is not a positive number, before the phase is added, so reduced motion (clock 0) keeps every eye open.
- **(f) The seam.** `window.__frogs()` returns one `{ stop, shut, sink, scale }` per frog, in the table's order.
  `window.__frogsShow(mode)` sets `'normal'`, `'hidden'` (no frog drawn) or `'onTop'` (every frog drawn with no depth
  test, over everything). Both are set on mount and deleted on unmount, as `__frog` is today. `__frog` goes.
- **(g) The visibility gate.** Case 18 of `check-street-grass.mjs`, at each stop on both viewports: three frames
  clipped round that stop's frog, `normal`, `hidden` and `onTop`, the clock pinned at 0.5. Seen is the pixels that
  differ between `normal` and `hidden`, the whole is those that differ between `onTop` and `hidden`. Seen over whole
  is at least 0.85, and the whole is at least the floor in Task 2's table.
- **(h) Two levers for the phone.** At 15 to 20 px on the phone (`spike/show-b/phone-sheet.png`) the frogs are hard to
  find. Look pass 1 tries `FROG.size` up to 0.0108 (about 23 cm, a large frog beside Vincent) and a lighter back (the
  bushes' greens from luma share 0.6). Every spot is measured again after a size change.

## Global constraints

- No new dependency. Only the frog's code, its seam, its tests and case 17 change, with case 18 and `stroke`'s lift
  parameter added.
- Vincent's build is byte-identical: `stroke` and `clad` keep 0.0004 by default.
- The grass, the walk, Vincent, the cameras and the stops do not change.
- The triangle ceiling is 1,444,930 at every pose, both orientations. Five frogs add about 13,000.
- Retune cap: four look passes.

## Review focus

1. Reduced motion with a phase: a phase added before the "not positive" test would shut a frog's eyes under reduced
   motion. Test: under reduced motion, every frog's eyes are open at every pinned time.
2. A frog in the frame of a stop that is not its own, close to the camera: at stop 1 the frog of stop 0 may stand at
   the frame's edge. Test: every frog's distance from every station camera is at least 0.15, so none fills the frame.
3. Two frogs blinking together: equal phases read as one creature twice. Test: over the first 60 s no two frogs are
   shut at the same millisecond.
4. A resize between portrait and landscape at a stop: the spots were picked for both frames. Test: each frog is in
   frame on 16:9, 16:10 and the phone at its stop (the unit test), and case 18 runs both viewports.
5. The grass changing later: a denser grass fills a gap or covers a frog. Tests: the gap test per frog, and case 18.
6. Vincent walking past stop 1's frog on his side of the lane: 0.031 at the nearest. Test: the clearance test over his
   whole walk, from his box, not his centre line.

---

### Task 1: the shape

**Files:**
- Change: `src/scene/vincent.ts` (`stroke`, `clad`: an optional `lift`)
- Change: `src/scene/frog.ts` (`FROG`'s shape in frog lengths, `buildFrog`)
- Change: `src/scene/StreetFrog.tsx` (the eye's sink in world units)
- Test: `scripts/street-frog.test.ts`

**Interfaces:**
- Produces: `FROG.size`, `FROG.lift`, the shape's fields in Decision (a), `FROG_EYES` in world units, and
  `buildFrog(painting): FrogBuild` with today's `FrogBuild` type.

- [ ] **Step 1: Write the failing tests** in `street-frog.test.ts`, replacing "the frog is small":
  - `'the frog sits on the ground: its lowest point within 0.0002 of its feet'`: over every position of
    `body.underpaint` and `body.strokes.arrays`, the least `y` is in [−0.0001, 0.0002].
  - `'its back leg folds, the knee forward and out'`: `FROG.knee[2] > FROG.hip[2]`, `FROG.knee[2] > FROG.heel[2]`, and
    `FROG.knee[0] > FROG.torso.radii[0]`.
  - `'its eyes stand on its head'`: `FROG.eye.centre[1] − FROG.eye.r > FROG.head.centre[1]`, and the eye is in the
    head's front half: `FROG.eye.centre[2] >= FROG.head.centre[2]`.
  - `'the frog is small: 2,000 to 3,200 triangles'`.
  - `'Vincent keeps his strokes'`: `buildVincent`'s stroke positions hash to the value read at `cc56207` before the
    change (the step records it).
- [ ] **Step 2: Run them**: `node --test scripts/street-frog.test.ts`. Expected: the shape tests FAIL, Vincent's PASS.
- [ ] **Step 3: Build the shape** from Decision (a), as the spike's `frog.ts` has it.
- [ ] **Step 4: Run the tests**: `npm run -s test:sky`. Expected: all PASS.
- [ ] **Step 5: Look.** Close-ups from four sides and stop 0 at true scale, both viewports (the spike's
  `frog-studio.mjs`, which drives the camera through R3F's root with `walk=0`, so the app takes no studio code).
- [ ] **Step 6: Commit**: `feat(street): the frog rebuilt to read as a frog: a sitting outline, a folded back leg, a
  flat head`.

### Task 2: five frogs

**Files:**
- Change: `src/scene/frog.ts` (`FROGS`, `frogPlace(spec)`, `frogBlink(t, phase)`)
- Change: `src/scene/StreetFrog.tsx` (five groups, the seam)
- Test: `scripts/street-frog.test.ts`, `scripts/check-street-grass.mjs` (case 17, case 18)

**Interfaces:**
- Consumes: Task 1's `FROG`, `buildFrog`, `FROG_EYES`.
- Produces: `type FrogSpec = { stop: 0 | 1 | 2 | 3 | 4; t: number; lateral: number; y: number; toward: 'lane' |
  'away'; face: number; scale: number; crouch: number; phase: number }`, `FROGS: readonly FrogSpec[]` (one per stop,
  in stop order),
  `frogPlace(spec: FrogSpec): { position: [number, number, number]; yaw: number }`,
  `frogBlink(t: number, phase = 0): number`, and the seams of Decision (f).

- [ ] **Step 1: The search.** Run the spike's `frog-spots.mjs` (the static tests) and `frog-vis.mjs` (the render
  measure) on the Task 1 shape. Record each stop's best spot in the table below and its numbers in the record. The
  starting table, from the spike:

  | stop | t | lateral | y | toward | face | scale | crouch | seen | whole px (desktop, phone) | Vincent's gap |
  | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
  | 0 | 0.035 | −0.086 | 0.001 | lane | 0.35 | 1.0 | 1.0 | 0.98 | 562, 166 | 0.30 |
  | 1 | 0.283 | +0.086 | 0.001 | lane | 0.3 | 0.94 | 1.04 | 0.86 | 351, 124 | 0.031 |
  | 2 | 0.466 | −0.098 | 0.001 | lane | 0.4 | 1.06 | 0.92 | 0.96 | 491, 166 | 0.10 |
  | 3 | 0.677 | −0.098 | 0.001 | away | 0.3 | 0.97 | 1.0 | 0.95 | 593, 205 | 0.10 |
  | 4 | 0.975 | −0.08 | 0.0045 | lane | 0.35 | 1.02 | 0.96 | 0.93 | 262, 92 | 0.29 |

  Stop 4's frog sits at the desktop frame's lower edge (NDC y about −0.88) and about 18 px long, the smallest of the
  five (`spike/show-s4c/`). It is Mark's call whether stop 4 keeps it (Decision (c)). The phases start at 0, 1.3,
  0.4, 0.9 and 1.6 s. Step 4 moves them by hand until "no two frogs blink at once" passes, each in [0, 1.6] so its
  first blink comes after time 0. The case 18 floor for each stop is 0.8 of its whole px on each viewport.
- [ ] **Step 2: Write the failing tests** in `street-frog.test.ts`, replacing today's place, gap and frame tests with
  one loop over `FROGS`:
  - `'one frog per stop, in stop order'`: `FROGS.map((f) => f.stop)` is [0, 1, 2, 3, 4].
  - `'each frog keeps clear of Vincent's walk'`: every footprint point is at least 0.02 from his box's footprint
    (`vincentBoxCorners`) at every walk `t` from 0 to 0.9 by 0.001.
  - `'each frog in the grass sits in a gap, ringed by blades'`: for every frog with `y` = `GRASS.baseY`, no root within
    `FROG.clear` and at least 4 within twice it. Stop 4's frog is outside the grass (`inFootprint` false) at
    `y` = `STROKE_LIFT + LIFT_LEVELS × LIFT_STEP` + 0.00025.
  - `'each frog is off the path'`: every footprint point (the build's vertices with `y < 0.0006`, scaled and turned)
    has |lateral| > 0.06.
  - `'each frog is side-on to its stop'`: the angle between its heading and the bearing to its stop's camera is
    `π/2 − face` within 1e-9, `face` in [0.25, 0.5].
  - `'each frog is in frame at its stop'`: every vertex within |NDC| 0.9 on 1600 × 900, 1280 × 800 and 390 × 844,
    except stop 4's frog on the desktop, within 0.95 (its frame meets the ground at its lower edge).
  - `'no frog crowds a camera'`: every frog at least 0.15 from every station camera, both orientations.
  - `'the poses vary a little'`: `scale` in [0.9, 1.1], `crouch` in [0.9, 1.05], and no two frogs share both.
  - `'reduced motion keeps every eye open'`: `frogBlink(lifeTime(t, 99, true), f.phase)` is 0 for every frog at every
    `t` in 0 to 60 s by 0.05.
  - `'no two frogs blink at once'`: for every millisecond of the first 60 s, at most one frog's `frogBlink` is above 0.
- [ ] **Step 3: Run them**: `node --test scripts/street-frog.test.ts`. Expected: FAIL (no `FROGS`).
- [ ] **Step 4: Implement** `FrogSpec`, `FROGS`, `frogPlace(spec)` and `frogBlink(t, phase)` in `frog.ts`, and five
  groups in `StreetFrog.tsx`: each `<group position rotation scale={[s, s × crouch, s]}>` over the shared geometries,
  each frog's eyes on `frogBlink(lifeTime(...), phase)`. Add the seams of Decision (f). `'onTop'` sets `depthTest`
  false on the frog's materials and a `renderOrder` of 20 on its meshes. `'hidden'` sets the groups invisible.
- [ ] **Step 5: Run the tests**: `npm run -s test:sky`. Expected: all PASS.
- [ ] **Step 6: Case 17 for five.** It reads `__frogs()`. Pinned at each frog's first shut moment (`FROG.blink.first`
  + `down` + `hold`/2 − its phase, the phases chosen so that is positive), that frog is shut and the others are open.
  Pinned at 0 all are open. Under reduced motion all are open. With `grass=0`, `__frogs` is undefined.
- [ ] **Step 7: Case 18**, Decision (g), both viewports at each stop. Expected: PASS on the table's spots.
- [ ] **Step 8: Run** `node scripts/check-street-grass.mjs --cases 17,18` against the worktree's server. Expected: PASS.
- [ ] **Step 9: Commit**: `feat(street): five frogs, one by each stop, side-on to its camera, each on its own blink`.

### Task 3: the look passes

At true scale, each stop on both viewports (1:1 crops and 4× and 6× nearest-neighbour), plus the close-ups. The
questions, in order: does each read as a frog, is any one hidden or crowded by a blade, does the crouch read as a pose
or as a squash, and does a frog at another stop's frame edge distract. Each pass retunes the shape, the paint or a
spot, then re-runs the tests and case 18. Cap: four passes.

### Task 4: the gate's runs

- [ ] `npx tsc -b`, `npm run -s lint`, `npm run -s test:sky`, `npm run -s build`.
- [ ] `check-street-grass.mjs` (every case), `check-street-walk.mjs`.
- [ ] The frame time at stops 0 and 3 on both viewports (the perf marker made first).
- [ ] The triangles at the walk's worst point, both orientations, under 1,444,930.
- [ ] A clip of each stop's frog blinking for Mark.

### Task 5: review and the record

- [ ] Codex's branch review (brief file, one-line pointer), its findings answered in the record.
- [ ] The record `tasks/2026-10-25-street-frogs.md`, the Tunables entry, `tasks/lessons.md`, the pickup in
  `tasks/todo.md`.
- [ ] Present to Mark with the live URL and the crops.
