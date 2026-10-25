# Street frogs, five that read as frogs: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Revision 1 (2026-10-25, night).** Mark passed the portal's gate, with one doubt about the street: "the frog doesn't
seem like a frog and I think we should put multipule frogs in different location instead of just stop 0". He chose
"One near each stop": five frogs, one in a grass gap near each of the five stops, each turned so that stop's camera sees
it side-on, their poses varied a little. A spike on this branch rebuilt the frog's shape and measured spots in the
render (`scratch/street-frogs-2026-10-25/spike/`). Its numbers are the plan's starting values. The Lead builds every
task. Mark's gate is the end of the slice.

**Revision 2 (2026-10-25, night).** Folds in Codex's plan review (`scratch/street-frogs-2026-10-25/plan-review-codex.md`,
F1 to F6 and its shape note, all P2) and two facts found since. Mark chose the square's edge for stop 4. The walk has
no room for five frogs of 2,000 triangles: at `t` 0.33 on the desktop it is 463 under the ceiling. So the frog is cut to
1,212 triangles and drawn only within 0.5 of the camera, and at most one frog is ever drawn (F2). With one frog drawn,
the frogs share one blink and the phases go (F1). The crouch goes, because a non-uniform scale bends the lit
material's normals (F4). Stop 4's frog rises to the square's strokes (F3). Case 18 goes: the spots' visibility is a
measurement in the record, with its definition stated (F5). The spike's studio stays out of the app, staged and removed
by named steps (F6).

**Goal:** At each of the five stops a frog sits side-on to that stop's camera: in a gap of the grass at stops 0 to 3,
on the square's edge at stop 4. At true scale on the desktop it reads as a frog: a sitting outline, a back leg folded
with the knee forward, eyes high on a flat head, a pale throat and lip. It blinks as today's frog does. The frogs show
with the grass, as the frog does today.

**Architecture:** One frog shape, built once from the painting and drawn five times. A table holds each frog's spot
(`t`, lateral, `y`), its stop, its turn from side-on and its size (its group's uniform scale). A frog is drawn only
within its own draw distance of the camera, so the walk never draws two near ones at once and never draws one where
the triangle budget has no room. The spots come from a search that measures in the render how much of a frog each stop's camera sees.

**Tech stack:** three.js, Vincent's builders (`clad`, `solid`, `stroke`, `sphere`, `tube`), R3F, `node --test`, the
check scripts. No new dependency.

**Spec:** Mark's words and his choices above (the portal's record, "Mark's gate"), S3b's frog
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
   so the verge's inner edge (|lateral| 0.066) comes into the phone's frame only about 0.2 ahead of its camera. The
   camera always looks along the lane: the walk's gestures move `t` and nothing turns the view (`StreetWalk.tsx`).
4. The grass draws a share of each chunk's blades by its distance from the camera (`grassDrawCount`), so what hides a
   frog depends on the stop.
5. Vincent walks 0.4 ahead of the camera at lateral 0.03, moving to 0.07 between stops 3 and 4, half-width 0.025
   (`VINCENT_RIG`). The left verge (negative lateral) is never on his line. `vincentBoxCorners(t)` gives his box.
6. At stop 4 the camera pitches up 8.8° to the church, so the desktop's frame meets the ground only 0.31 ahead. The
   grass ends at `t` 0.97 and round the square (`GRASS.t`, `inFootprint`).
7. `stroke` lifts every stroke 0.0004 off its shape (`vincent.ts:56`). On a frog's leg of radius 0.0004 that doubles
   its width.
8. From the spike: the rebuilt shape reads as a frog at about 30 px on the desktop at stop 0
   (`spike/show-a/s0-desktop-crop-x.png`). On the phone it is about 15 to 18 px and reads only just. A geometric
   line-of-sight test against the blades said "all seen" where the render showed a blade across the frog, so the spots
   are measured in the render (Decision (g)).
9. **The triangle room.** The walk's count is the street, the diorama and Vincent, which do not change along
   `t` < 0.43, plus the grass, which does. A model of the grass's count at every 0.001 of `t` (the grass test's own
   count, `scratch/.../frog-room.mts`) plus a constant read from the church's sweep matches the browser to 12
   triangles at `t` 0.33. The browser on this branch reads 1,444,455 at `t` 0.33 on the desktop, 475 under the ceiling,
   and 1,443,287 at `t` 0.295, 1,643 under it. With all five frogs drawn when in the frustum, four are drawn at `t`
   0.295 (Codex F2). With a frog drawn only within 0.5 of the camera, one is drawn there (stop 1's, 0.2 away) and none
   at 0.33 (stop 2's is 0.54 away). A draw distance of 0.55 or more puts stop 2's frog into `t` 0.33.
10. **The square's height.** The square's face is at `y` 0.002 (`streetGeometry.ts:643–644`). Its strokes ride
   `STROKE_LIFT` + (`index` % `LIFT_LEVELS`) × `LIFT_STEP` over it (`streetStrokes.ts:366`), at most 0.002 + 15 ×
   0.00015 = 0.00425. So the square's strokes reach 0.00625 (Codex F3 sampled 0.00595 under stop 4's spot).

## Decisions

- **(a) The shape**, in frog lengths (`FROG.size` 0.0086, snout to vent, about 17 cm beside Vincent's 0.085), as the
  spike's `frog.ts` builds it at 1,212 triangles (`spike/slim-a/cmp-desktop.png`: at 4× on the desktop it reads as the
  3,824-triangle draft did):
  - The torso is an ellipsoid at (0, 0.22, −0.1), radii (0.24, 0.17, 0.33), its nose raised 0.42 rad. The back slopes
    up from the rump on the ground. Its grid is 8 round by 5 along.
  - The head is an ellipsoid at (0, 0.37, 0.28), radii (0.27, 0.14, 0.27), its nose down 0.2 rad, its top flat. Grid
    8 by 5.
  - The throat is a pale ellipsoid under the head, at (0, 0.28, 0.29), radii (0.22, 0.08, 0.22). Grid 6 by 3.
  - The back leg folds: hip (0.15, 0.17, −0.3), knee (0.35, 0.2, 0.06), heel (0.3, 0.05, −0.36), toe (0.42, 0.035,
    0.1). The thigh's radius runs 0.11 to 0.07, the shin's 0.065 to 0.04, the foot's 0.04 to 0.03. Grids 6 × 3, 5 × 3
    and 4 × 2. Three toes fan 0.5 rad, 0.16 long, each a 3 × 1 tube.
  - The front leg: shoulder (0.16, 0.25, 0.18), elbow (0.25, 0.13, 0.12), hand (0.23, 0.035, 0.3). Its radii run 0.05
    to 0.04 and 0.04 to 0.03, grids 4 × 2. No fingers: at 0.08 frog lengths they are under 3 px at the nearest stop.
  - A sphere caps the knee and the heel (5 × 3), so neither tube shows its cut end. The arm's ends are under a pixel at
    true scale and get no cap.
  - The eyes sit at (±0.14, 0.48, 0.3), radius 0.075 (8 × 4), in sockets 0.035 lower (5 × 3). A glint of radius 0.025
    (4 × 2) on each.
  - The paint: the back from the bushes' greens, the lighter half (luma share 0.45 to 0.95), six strokes of 4 steps.
    Five dark spots, and one dark band across each thigh and shin (share 0.02 to 0.2). Two pale ridges along the back.
    The belly (three strokes), the throat and a stripe above the lip in the street's plaster, warmed 0.35 toward the
    lightest green. A dark line along the jaw. Each limb part one or two strokes.
  - The strokes stand `FROG.lift` = 0.00012 off the shape. `stroke` and `clad` take an optional `lift` that defaults to
    today's 0.0004, so Vincent does not change.
  - The shadow is 12 segments.
- **(b) One build, five frogs.** Each frog is a group over the same geometries and materials, named
  `street-frog-<stop>`. Its size is the group's uniform scale. The poses vary by the size, by the turn and by which way
  it faces. No crouch: a non-uniform scale bends the lit material's normals (`vincentMoon` uses `mat3(modelMatrix)`,
  4.3° off at a crouch of 0.92, Codex F4), and Vincent's shader does not change. The five share their strokes: at 15 to
  40 px nobody can tell them apart by stroke.
- **(c) The spots.** Each spot was chosen by the search (Task 2, step 2) from those that pass six tests: in a gap of
  the grass, off the path, clear of Vincent's walk, in frame on the desktop (16:9 and 16:10) and on the phone at its
  stop, and at least 0.85 of the frog seen on both. Of those, the one with the most pixels on the phone. Two
  departures, each forced by the frames:
  - Stop 1's frog sits on the right verge, Vincent's side. No left spot nearer than 0.78 is in the phone's frame there
    (the lane bends right). It stays at least 0.02 from his box's footprint at every walk `t`.
  - Stop 4's frog sits on the square's edge, just past the grass's end. At stop 4 no grass is in both frames: the
    desktop sees grass only at `t` 0.96 to 0.97 far left, the phone only at `t` 0.90 to 0.92 on Vincent's line
    (`spike/s4-probe.mjs`). Mark chose this spot on 2026-10-25 ("Square's edge"). It is the one frog not in the grass.
    It stands on the square's strokes: `y` = 0.00625 (Fact 10) + 0.00025 = 0.0065. So `FrogSpec` carries its `y`.
  The table is in Task 2.
- **(d) Side-on.** A frog's heading is its stop camera's bearing turned by `±(π/2 − face)`, `face` 0.25 to 0.5 rad, so
  it shows its side with a little of its face. `toward` picks the sign: `'lane'` turns its nose toward the lane's
  centre, `'away'` from it.
- **(e) The blink.** One clock for all five: `frogBlink(t)` as today, on the sky's clock. At most one frog is drawn
  before `t` 0.45, and a second drawn later is at least 0.8 away, where its eyes are a pixel or two (Decision (i)), so
  nobody sees two blink together. Reduced motion keeps every eye open, as today (`frogBlink`
  returns 0 for any `t` that is not a positive number). Codex F1 showed five phases cannot keep the blinks apart within
  [0, 1.6] s, and with one frog drawn they need not.
- **(f) The seam.** `window.__frog()` stays as it is: the shared blink's `{ shut, sink, scale }`. The branch review
  added `window.__frogsDrawn()` (Codex F1): each group's `visible` as the frame's cull left it, its world place and the
  camera's, for case 18.
- **(g) Visibility is measured, not gated.** The spike's `frog-vis.mjs` measures each spot at its stop on both
  viewports, and its numbers go in the record. Its definition: three frames with the camera, the clock (0.5) and every
  other object fixed. In `all` the scene is as shipped. In `hideFrog` the target frog is hidden. In `onlyFrog` every
  object but the target frog is hidden, the frog keeps its own depth test, and its shadow is hidden in all three. A
  pixel counts when the sum of its absolute RGB differences is above 6. Seen is the pixels that differ between `all`
  and `hideFrog`. The whole is the pixels of `onlyFrog` that differ from its corner pixel (the empty scene's
  background). The crop is 100 px square about the frog's projected centre, cut by the frame. A measure fails when a
  pixel of the whole lies on the crop's edge, because then the crop has cut the frog.
  No check case keeps it (Codex F5 named five things such a case needs). For an 18 px frog that Mark judges by eye,
  the gap test and Mark's look guard the spots, and the record holds the measure.
- **(h) Two levers for the phone.** At 15 to 18 px on the phone (`spike/slim-a/phone-sheet.png`) the frogs are hard to
  find. Look pass 1 tries `FROG.size` up to 0.0108 (about 23 cm, a large frog beside Vincent) and a lighter back (the
  bushes' greens from luma share 0.6). Every spot is measured again after a size change. Size does not change the
  triangle count.
- **(i) The draw distance.** A frog is drawn only when its group is within its spec's `draw` of the camera. In the
  grass 0.5: the blades hide each frog where it first draws (`t3/pop/`). On the open square 0.5 showed stop 4's frog
  appearing from nothing at about 20 px, so its `draw` is 1.1 (look pass 3): it first draws at `t` 0.51 behind a near
  blade, past the walk's tight stretch (`t3/pop2/`). Every stop's own frog is within its `draw` (0.25 to 0.40).

## Global constraints

- No new dependency. Only the frog's code, its tests, case 17's sink and `stroke`'s lift parameter change.
- Vincent's build is byte-identical: `stroke` and `clad` keep 0.0004 by default, and his shader does not change.
- The grass, the walk, Vincent, the cameras and the stops do not change.
- The triangle ceiling is 1,444,930 at every pose, both orientations. A frog is at most 1,250 triangles. At most one is
  drawn before `t` 0.45, and when two are drawn the farther is at least 0.8 away. The model in Fact 9 is the estimate. The browser sweep in Task 4 is the gate.
- `FrogStudio.tsx` and its mount in `Street.tsx` are spike tools. They are never committed (Task 2, step 1).
- Retune cap: four look passes.

## Review focus

1. Reduced motion: the blink must stay open under reduced motion at every pinned time. Test: `frogBlink(lifeTime(t,
   99, true))` is 0 at every `t` in 0 to 60 s by 0.05.
2. A frog in the frame of a stop that is not its own, close to the camera. Test: every frog at least 0.15 from every
   station camera, both orientations.
3. Two frogs drawn at once: the shared blink would show, and the triangle room is for one. Tests, at every walk `t` by
   0.001 on 16:9, 16:10 and the phone, a frog counting when it is in the frustum and within its `draw`: before `t` 0.45
   at most one is drawn, and when two are drawn the farther is at least 0.8 away (its eyes a pixel or two).
4. A resize between portrait and landscape at a stop: the spots were picked for both frames. Test: each frog is in
   frame on 16:9, 16:10 and the phone at its stop.
5. The grass changing later: a denser grass fills a gap. Test: the gap test per frog. A blade arching over a frog from
   outside its gap is caught only by the measure in the record and by Mark's eye.
6. Vincent walking past stop 1's frog on his side of the lane: 0.026 at the nearest. Test: the clearance test over his
   whole walk, from his box, not his centre line.
7. The pop at the draw distance. Task 3 looks at the frames either side of each frog's first draw.

---

### Task 1: the shape

**Files:**
- Change: `src/scene/vincent.ts` (`stroke`, `clad`: an optional `lift`)
- Change: `src/scene/frog.ts` (`FROG`'s shape in frog lengths, `buildFrog`)
- Change: `src/scene/StreetFrog.tsx` (the eye's sink in world units)
- Change: `scripts/check-street-grass.mjs` (case 17: the sink in world units)
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
  - `'the frog fits the walk: at most 1,250 triangles'`, its comment naming Fact 9 and the draw distance.
  - `'Vincent keeps his strokes'`: `buildVincent`'s stroke and underpaint positions hash to `79338a361cd6b11c` (the
    first 16 hex of their SHA-256, read at `cc56207` before the change).
- [ ] **Step 2: Run them**: `node --test scripts/street-frog.test.ts`. Expected: the shape tests FAIL, Vincent's PASS.
- [ ] **Step 3: Build the shape** from Decision (a), as the spike's `frog.ts` has it.
- [ ] **Step 4: Run the tests**: `npm run -s test:sky`. Expected: all PASS.
- [ ] **Step 5: Look.** With the spike's single-frog studio staged as the spike left it (`FrogStudio.tsx` finding the
  group `street-frog`, mounted last in `Street.tsx`): close-ups from four sides (`frog-studio.mjs`) and stop 0 at true
  scale on both viewports (`frog-show.mjs`). Record `frog.ts`'s SHA-256 beside the close-ups. The studio is never
  committed (Task 2, step 5).
- [ ] **Step 6: Commit** only the files above: `feat(street): the frog rebuilt to read as a frog: a sitting outline,
  a folded back leg, a flat head`.

### Task 2: five frogs

**Files:**
- Change: `src/scene/frog.ts` (`FrogSpec` with its `draw`, `FROGS`, `frogPlace(spec)`)
- Change: `src/scene/StreetFrog.tsx` (five groups, the draw distance)
- Test: `scripts/street-frog.test.ts`
- Spike tools, not committed: `src/scene/FrogStudio.tsx`, its mount in `Street.tsx`, and `frog-studio.mjs`,
  `frog-show.mjs`, `frog-vis.mjs`, `frog-spots.mjs`, `s4-pick.mjs` in the session's scratchpad.

**Interfaces:**
- Consumes: Task 1's `FROG`, `buildFrog`, `FROG_EYES`.
- Produces: `type FrogSpec = { stop: 0 | 1 | 2 | 3 | 4; t: number; lateral: number; y: number;
  toward: 'lane' | 'away'; face: number; scale: number; draw: number }`, `FROGS: readonly FrogSpec[]` (one per stop, in stop order),
  `frogPlace(spec: FrogSpec): { position: [number, number, number]; yaw: number }`. `frogBlink(t)` and `__frog`
  unchanged.

- [ ] **Step 1: Write the failing tests** in `street-frog.test.ts`, replacing today's place, gap and frame tests with
  one loop over `FROGS`. `FROGS` is the table in step 6, as it stands:
  - `'one frog per stop, in stop order'`: `FROGS.map((f) => f.stop)` is [0, 1, 2, 3, 4].
  - `'each frog keeps clear of Vincent's walk'`: every footprint point is at least 0.02 from his box's footprint
    (`vincentBoxCorners`) at every walk `t` from 0 to 0.9 by 0.001.
  - `'each frog in the grass sits in a gap, ringed by blades'`: for every frog with `y` = `GRASS.baseY`, no root within
    `FROG.clear` × its scale and at least 4 within three times it (the spike's search kept no ring: stop 0's spot has 1
    blade within twice the clearance and 10 within three times it). Stop 4's frog is outside the grass (`inFootprint` false) at
    `y` = 0.002 + `STROKE_LIFT` + (`LIFT_LEVELS` − 1) × `LIFT_STEP` + 0.00025.
  - `'each frog is off the path'`: every footprint point (the build's vertices with `y < 0.0006`, scaled and turned)
    has |lateral| > 0.06.
  - `'each frog is side-on to its stop'`: the angle between its heading and the bearing to its stop's camera is
    `π/2 − face` within 1e-9, `face` in [0.25, 0.5].
  - `'each frog is in frame at its stop'`: every vertex within |NDC| 0.9 on 1600 × 900, 1280 × 800 and 390 × 844,
    except stop 4's frog on the desktop, within 0.95 (its frame meets the ground at its lower edge).
  - `'no frog crowds a camera'`: every frog at least 0.15 from every station camera, both orientations.
  - `'the sizes vary a little'`: `scale` in [0.9, 1.1], no two equal.
  - `'each stop draws its own frog'`: at each station, both orientations, its frog is within its `draw` of the camera.
  - `'at most one frog is drawn on the walk before t 0.45'` and `'when two frogs are drawn, the farther is at least 0.8
    away'`: Review focus 3. A frog counts when its centre (`y` + 0.002) with a sphere of radius 0.008 meets the frustum
    and lies within its `draw` of the camera.
  - `'reduced motion keeps the eyes open'`: Review focus 1.
- [ ] **Step 2: Run them**: `node --test scripts/street-frog.test.ts`. Expected: FAIL (no `FROGS`).
- [ ] **Step 3: Implement** `FrogSpec`, `FROGS` and `frogPlace(spec)` in `frog.ts` from the table in
  step 6, and five groups in `StreetFrog.tsx`: each
  `<group name={`street-frog-${stop}`} position rotation scale={scale}>` over the shared geometries. Each frame, a group is visible when its distance to the camera is below its spec's `draw`. The eyes and
  `__frog` stay as they are.
- [ ] **Step 4: Run the tests**: `npm run -s test:sky`. Expected: all PASS.
- [ ] **Step 5: Stage the studio for five frogs.** Now that the groups exist, port `FrogStudio.tsx`: it reads
  `window.__frogCam` (a camera) and `window.__frogVis` (`{ mode, stop }`: `mode` is `all`, `hideFrog` or
  `onlyFrog`, `stop` picks the group `street-frog-<stop>`). It is mounted last in `Street.tsx`'s group, so its frame runs after `StreetFrog`'s. Port the five scripts to `FROGS`,
  `frogPlace(spec)` and `__frog`. Before every commit, `git status --short` shows ` M src/scene/Street.tsx` and
  `?? src/scene/FrogStudio.tsx` unstaged, and `git diff --cached` holds neither.
- [ ] **Step 6: The search.** Run `frog-spots.mjs` (the static tests) and `frog-vis.mjs` (Decision (g)) on the five
  frogs. If a spot moves, change `FROGS` and the table below. Write each spot's numbers in the record. The table as
  measured on the built frogs (`scratch/street-frogs-2026-10-25/t2/vis-frogs.json`, Decision (g)):

  | stop | t | lateral | y | toward | face | scale | seen (desktop, phone) | whole px (desktop, phone) | Vincent's gap |
  | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
  | 0 | 0.035 | −0.086 | 0.001 | lane | 0.35 | 1.0 | 0.98, 0.96 | 519, 156 | 0.298 |
  | 1 | 0.283 | +0.086 | 0.001 | away | 0.3 | 0.94 | 0.89, 0.89 | 294, 103 | 0.027 |
  | 2 | 0.466 | −0.098 | 0.001 | lane | 0.4 | 1.06 | 0.97, 0.96 | 517, 179 | 0.100 |
  | 3 | 0.677 | −0.098 | 0.001 | away | 0.3 | 0.97 | 0.96, 0.93 | 517, 180 | 0.099 |
  | 4 | 0.975 | −0.08 | 0.0065 | lane | 0.35 | 1.02 | 0.99, 0.99 | 256, 92 | 0.106 |

  Stop 1 turned from `'lane'` to `'away'`: with its nose to the lane a blade crossed it, 0.82 and 0.80 seen
  (`t2/vis-s1-facings.json`). Vincent's gap is the least distance from the frog's footprint to his box over the walk.
  Stop 4's frog sits at the desktop frame's lower edge (NDC y about −0.88), about 18 px long, the smallest of the five.
- [ ] **Step 7: Run the tests again**: `npm run -s test:sky`. Expected: all PASS on the measured table.
- [ ] **Step 8: Case 17** runs unchanged against five frogs: `node scripts/check-street-grass.mjs --cases 17` against
  the worktree's server. Expected: PASS.
- [ ] **Step 9: Commit** only the files above: `feat(street): five frogs, one by each stop, side-on to its camera`.

### Task 3: the look passes

At true scale, each stop on both viewports (1:1 crops and 4× and 6× nearest-neighbour), plus the close-ups. The
questions, in order: does each read as a frog, is any one hidden or crowded by a blade, does the phone find it
(Decision (h)), and does the pop at the draw distance show (the two frames either side of each frog's first draw on
the walk). Each pass retunes the shape, the paint or a spot, then re-runs the tests and `frog-vis.mjs`. Cap: four
passes.

**Done, three passes** (`scratch/street-frogs-2026-10-25/t3/`). Pass 1: `FROG.size` 0.0108 and the back from luma
share 0.6. The size helped both viewports. The lighter back turned the frogs blue-grey among the blades, because the
bushes' lightest greens are pale blue-greens, and lost the yellow-green stripes that found them. Pass 2: the size kept,
the back as before (`p3/cmp-*.png`). Pass 3: stop 4's `draw` 1.1 (Decision (i)). Seen and whole at size 0.0108
(`t3/p3-vis.json`): stop 0 0.99 / 0.98 and 803 / 234 px, stop 1 0.88 / 0.89 and 449 / 158, stop 2 0.96 / 0.95 and 794
/ 270, stop 3 0.95 / 0.94 and 799 / 278, stop 4 0.99 / 0.99 and 398 / 137 (desktop / phone). No crop cut a frog.

### Task 4: the gate's runs

- [ ] Unstage the studio: `git stash push --include-untracked -- src/scene/Street.tsx src/scene/FrogStudio.tsx`,
  then `git status --short` is empty.
- [ ] `npx tsc -b`, `npm run -s lint`, `npm run -s test:sky`, `npm run -s build`.
- [ ] `check-street-grass.mjs` (every case), `check-street-walk.mjs`.
- [ ] The frame time at stops 0 and 3 on both viewports (the perf marker made first).
- [ ] The triangles in the browser, both viewports: every 0.01 of `t` from 0.25 to 0.40, every 0.05 elsewhere, and
  0.295. Each under 1,444,930.
- [ ] A clip of each stop's frog blinking for Mark.
- [ ] `git stash pop` to stage the studio again, if Task 5 needs captures.

### Task 5: review and the record

- [ ] Codex's branch review (brief file, one-line pointer), its findings answered in the record.
- [ ] The record `tasks/2026-10-25-street-frogs.md` (with Decision (g)'s numbers), the Tunables entry,
  `tasks/lessons.md`, the pickup in `tasks/todo.md`.
- [ ] Present to Mark with the live URL and the crops.
