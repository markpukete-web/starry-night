# A cat on the wall at stop 3

**Status:** revision 1, 2026-10-30. Nothing is built. Revision 0 had a builder's read as a planner
(`C/review/builder-check-r0.md`) and Codex's read of its facts against the code (`C/review/codex-design-r0.md`). The
dispositions are `C/review/lead-design-r0.md`. Mark handed the open calls to the Lead ("Make calls for me if needed"). The probes behind every number are in
`/Users/markma/Projects/starry-night/scratch/street-cat-2026-10-30/` (`C/` below).

## Why

The cat comes from the noted ideas in `tasks/todo.md` (2026-10-26, the animals note): "Then a cat on a wall or an owl on
a ridge. One or two, quiet." The owl is built (slice 2, PR #39). On 2026-10-30 the Lead recommended the cat next and
then the performance review, and Mark answered "Go with your recommendations". That approves the order. This design is
new, and Mark has not seen it.

## What the visitor should feel

At the third stop Vincent turns to the left verge and holds up his lantern. On the low stone wall in front of him, just
past the lamp with its moths, a red-brown cat sits upright with its tail round its feet. It has watched him come up the
lane, its head turning as he walks, and now it looks at him. The tip of its tail sways. When he walks on, its head
follows him. Nothing is spooky and nothing glows.

## Goals

- One cat, sitting upright on wall W3, at the spot Vincent faces when he stops at stop 3.
- Its head turns toward Vincent when he is near, as the owl's does.
- It blinks, and the tip of its tail sways slowly.
- It reads as a cat at stop 3 on both viewports: the ears and the tail make the outline.
- It is still under reduced motion and Pause.
- All of it inside today's triangle ceiling, frame rate and gates.

## Non-goals

- A cat that walks, jumps or leaves the wall.
- The hand touching the cat, a sound, a purr, a reaction to the cursor.
- Any change to the walls, the lamps, the camera, the walk, the wander or the stations.
- A second cat, or a cat at another stop.

## Anti-goals (a failure even if every check passes)

- A black cat, an arched back, glowing eyes: a Halloween cat.
- A cartoon cat: a big head, big eyes, a smile.
- A lump no one can name. If the ears and the tail do not read, it fails.
- The cat hides Vincent, the lamp's lantern or the moths at stop 3, or Vincent hides it.
- Colours invented by hand. Every colour comes from a rectangle of the scan.

## Constraints (the project's, which still bind)

- The acceptance criteria and the Tunables' limits: colours from the scan within ΔE 10 of their own source, 60 fps at
  stops 0 and 3 at dpr 1.5 (p95 at most 18.6 ms), the triangle ceiling 1,444,930 at every sampled point of the walk,
  `prefers-reduced-motion` a still state, the camera on its rail.
- No new dependency. `?street=1` builds it for every visitor once it ships. `?light=0` still builds the street unlit.
- The cat is its own component, as the owl is (`StreetOwl.tsx`), so the street's build hash and the grass hash do not
  change.
- At most 1,500 triangles.
- The retune cap: four look passes. Visual work and the look passes are the Lead's. The build goes to a Sonnet builder.
- Claude does not edit The bar, Gates, Out of scope or the acceptance criteria.

## The facts the design rests on

1. **The wall.** W3 is the left wall (`STREET_WALLS[2]`, side −1), `t` 0.54 to 0.84. Its lane face is at lateral 0.135,
   it is 0.03 thick and its box is 0.055 high (`STREET_WALL`, `streetLayout.ts:470`). The stones of its top rows lie at
   y 0.057: `STREET_WALL.height` plus `STROKE_LIFT` 0.002 (`streetGeometry.ts:1543`), with no relief. They lie in two
   rows, centred at lateral −0.1425 and −0.1575, each dab about 0.011 wide. Between them, at the middle (−0.15), a ray
   meets only the top's underpaint at 0.055 (Codex's probe).
2. **Vincent at a stop.** He stands 0.4 ahead of the walk's point on the lane (`VINCENT_RIG.ahead`), and the camera
   stands 0.18 behind it (`STREET.behind`), so he is 0.58 ahead of the camera. On the automatic walk he dwells 4 s at each
   station, turns his body π/2 (`PAUSE.body`) and raises the lantern in his left hand. The turn faces him to the lane's
   −lateral side, the left verge, at stops 1, 2 and 3 (`C/probe-vincent.log`: `vincentPlace`'s yaw plus π/2, through
   three's rotation). At stop 3 (`t` 0.66) he stands at about `t` 0.827, at (−0.044, −1.746) in the street's frame.
3. **The spot.** W3's top at `t` 0.81 is 0.18 from him, across the verge, in the direction he faces. From stop 3's
   camera, a cat 0.015 tall there is 35 px tall on the desktop (1600 × 900), at x 641 to 652. On the phone (390 × 844)
   it is 20 px, at x 104 to 111 (`C/probe-occluders.log`). At 0.0125 it is 29 and 17 px (`C/probe-vincent.log`).
   Vincent's screen box (his rig's half-width 0.025, the lantern's reach 0.04 on his facing side, the ground to 0.095)
   is at x 828 to 996 on the desktop and 211 to 307 on the phone. The cat clears it by 177 px and about 95 px.
   `vincentPlace` puts him at lateral +0.03 (`VINCENT_RIG.lateral`, on W2's side), so the cat at −0.15 is 0.18 across.
   On a desktop with a mouse the walk is in the wheel mode: no dwell, no turn, and the camera may stop anywhere. For
   every walk `t` from 0.40 to 0.86 where the cat is drawn and in frame, its screen box and his walking box are at
   least 234 px apart on the desktop and 133 px on the phone (`C/probe-walking.log`).
4. **What stands between.** The lamp at `t` 0.79, lateral −0.11 (`STREET_LAMPS`) is between the camera and the wall:
   a post 0.004 square and 0.13 high, a lantern 0.012 × 0.016 on top (`LANE_CRAFT.lamp`). At `t` 0.81 the cat clears the
   post by 101 px on the desktop and 58 on the phone, and the lantern by 129 and 73. The lamp's halo sprite (0.134 world
   at stop 3, `lampHaloScale`) covers about 18% of the cat's box. It is a glow over the cat, not something that hides it.
   The lamp's three moths circle the lantern at about 0.13, above the cat's head (about 0.072). The probes model these
   parts as boxes. The look pass checks the real frames.
5. **The other stops.** From stop 2 the spot is 0.82 away: 19 px tall at x 420 to 445 on the desktop, outside the
   phone's frame. From stops 0, 1 and 4 it is out of frame or over 1.2 away (`C/probe-place.log`).
6. **Triangles.** The slice 2 sweep (`scratch/church-animals-2026-10-29/owl/t4/tri-sweep.log`): 1,432,113 at `t` 0.40 on
   the desktop, 12,817 under the ceiling, and from `t` 0.45 on about 1.29 million. The walk's worst point is 1,433,111
   at `t` 0.26. A cat drawn within 0.9 of the camera is drawn from about `t` 0.41 on, and never at `t` 0.26.
7. **The owl as the precedent.** `owl.ts` and `StreetOwl.tsx`: ellipsoids clad in the painting's strokes through
   `vincent.ts` (`solid`, `clad`, `underpaintColour`), 544 triangles, two groups (the body and the turning head), six
   meshes on five geometries (each eye its own mesh, Codex). The head's turn is `owlLook` (within `reach` 0.6 and ±70° of the body's facing, aimed at `targetY` 0.07,
   Vincent's head) eased by `easeLook` (τ 0.6 s, snapped within 1e-4 rad since `47ae236`, with `__owl().settled`). The
   blink is `owlBlink`, the frogs' table with its own phase. It is drawn within a distance of the camera, and holds its
   pose under reduced motion. `vincent.ts` also has `tube` and `sphere`, for a tail and the ears.
8. **Scale.** Vincent is 0.085 for 1.7 m, so 0.05 world a metre. A sitting cat is about 25 to 30 cm to its ear tips (the
   Lead's estimate, not a measured source): 0.0125 to 0.015. The frog (0.0108, about 22 cm) and the owl (0.024 against a
   true 0.018) were both sized up so the phone finds them.
9. **Vincent's bearing from the cat** (`C/probe-walking.log`, from the cat's facing toward the lane): −109° at walk `t`
   0.40 (0.47 away), −70° at 0.52 (0.32), −2° at 0.64 (0.18, passing in front), then +36° to +50° from 0.70 on as the lane
   curves away. He leaves the 0.6 reach at about walk `t` 0.87.
10. **The colours** (`C/probe-coat.log`, mean Lab in the scan): `roofSienna` [705, 1046, 726, 1066] L 24.7, a +9.5, b
   +4.4, a red-brown at hue 25°. `wallB`, the wall's stones, L 32.8, a −0.1, b −9.1, a blue-grey. `thatch`, the owl's
   back, L 27.4, an olive grey. `churchLit` L 49.0, a pale blue-white. `roofSienna` is also Vincent's hair
   (`vincent.ts:30`).
11. **The light on a figure.** `StreetOwl.tsx` draws with Vincent's materials (`vincentStrokeBody`, `vincentMoon`, the
    street's fog): the figures' moon, not `STREET_LIGHT` or `CHURCH_LIGHT`. The lamps are no point light. The lantern's
    lift on a figure reaches 0.03 (`LANTERN_LIFT.r`). The colour gate does not class the figures
    (`VINCENT_CLASS.none`), so the owl's paint is held by a unit test.

## Decisions

- (a) **The place.** On W3's top at `t` 0.81, lateral −0.15, the feet at y 0.057 plus a contact gap the builder sets
  (the frogs' and the owl's pattern). The haunches span both top rows of stones, so it sits on stone, and the plan's
  first task checks the stones under its footprint in the real build. Its body faces the lane, toward where Vincent stops: from stop 3's camera it shows
  three-quarters to side-on, its face toward him. The plan's first task measures the spot in the real build and may move
  it within `t` 0.80 to 0.83.
- (b) **The form.** An upright sit: the haunches as one ellipsoid, the chest rising from them, a round head with two
  pointed ears, the tail as a tube curled round the front feet with its last third free. The front legs are one form
  under the chest. The outline must carry the ears and the tail. At most 1,500 triangles. The proportions are left to the
  builder and the look pass, within the size.
- (c) **The size.** `CAT.size` 0.015, about 30 cm, with the true scale 0.0125 noted beside it, as the owl's was: 35 px
  on the desktop and 20 on the phone at stop 3. It is a tunable. A look pass may take it up to 0.018 (1.44 × true, the
  owl went 1.33 ×). Past that is Mark's call.
- (d) **The paint and the light.** The coat from `roofSienna`, the chest, the muzzle and the inside of the ears from
  `churchLit`, the eyes in the owl's ink, the underpaint from `roofSienna`'s darkest 40%. A red-brown cat stands apart
  from the blue-grey stones by its hue, and from the owl's olive back. It shares Vincent's hair colour, which ties the
  two together. It draws with the owl's materials (fact 11): no lamp or lantern lift, the halo's glow over it. A unit test
  holds the paint: the chest's strokes nearer `churchLit`, the coat's nearer `roofSienna`.
- (e) **The head.** It turns toward Vincent by the owl's rule with a wider cone: within 0.6 of the neck and ±100°
  (1.75 rad) of the body's facing, aimed at his head (`targetY` 0.07), eased over τ 0.6 s and snapped within 1e-4 rad.
  The owl's ±70° would pick him up only 0.32 away on his approach (fact 9). At ±100° the head finds him at about walk
  `t` 0.43, 0.44 away, so from stop 2 the cat is seen watching him. It follows him past and out to the 0.6 reach. A look
  pass judges whether 100° reads natural. The code is the owl's,
  shared: the look and the easing take their constants as an argument, and the owl keeps its own unchanged, with its tests
  unchanged. The cat reports `__cat()` with `settled`, and the capture tool waits for it beside the owl's.
- (f) **The blink and the tail.** It blinks on the frogs' clock with its own phase, as the owl does. The tail's free
  third sways on the sky's clock, so a pinned capture holds it still: a slow sway of about ±0.35 rad over about 3 s to
  start, set by the look pass. No flick in revision 0. The tail is its own group, turned at its root.
- (g) **The still states.** Under reduced motion and Pause the head holds its pose, the eyes stay open and the tail stays
  still. With no Vincent (`vincent=0`, `walk=0`, the flat panel) the head looks straight ahead.
- (h) **Drawn** within 0.9 of the camera (fact 6): at stops 2 and 3, and nowhere before `t` 0.41. No URL flag. The draw
  calls it adds are counted from its component at stop 3, which draws 173 today, the owl's six meshes included.

## What the gate shows

- Stop 3 with Vincent arrived, turned and the lantern raised, on both viewports, with 1:1 crops of the cat beside the
  full frames. Stop 3 again in the wheel mode, Vincent facing along the lane.
- The approach: frames from stop 2 to stop 3 on the automatic walk, the head following him.
- A short frame sequence of the tail's sway and a blink.
- Stop 3 under reduced motion.
- The triangle sweep's worst point and its points from `t` 0.4. Perf at stops 0 and 3 at dpr 1.5. The draw calls at
  stop 3.
- The unit tests, the browser checks with a new case for the cat (turned at stop 3, straight with `walk=0`, not drawn at
  stop 0, held under reduced motion), the street's build hash and the grass hash unchanged, and Mark's pass on the
  preview.

## How it is built

One slice, one plan. The plan gets Codex's read for correctness and a builder's read for buildability. A Sonnet builder
builds the shared look, the cat's form and its component. The Lead runs the look passes (cap four) and the gate. Then a
branch review, Codex on the PR, and Mark's pass on the preview.

The branch is `feat/street-cat`, from `bffae2f` on `feat/church-owl`, because it reuses the owl's look, its snap and
its settled flag. Its PR is the third in the stack, after #38 (slice 1) and #39 (slice 2). Its base moves to `main` as
those two merge.

## Left to the builder

- The cat's proportions, its stroke counts and its underpaint, within the size and 1,500 triangles.
- The contact gap on the stones, and whether the tail sways in its own group or in the shader.
- The exact `t` within 0.80 to 0.83, from the plan's first task.

## Mark's word and the Lead's calls

Mark, 2026-10-30, while the reads ran: "Make calls for me if needed". So the two calls left open in revision 0 are the
Lead's, and he sees them at the preview:

1. **The size:** 0.015 (20 px on the phone at stop 3), the true 0.0125 noted, a tunable up to 0.018 in a look pass.
2. **The coat:** `roofSienna`, the red-brown.

## The build (a light slice, 2026-10-30)

Mark: "Go with your recommendations". The cat is a light slice: its own component, nothing else changed, the build hash
unchanged. So this section is its plan, with no code in it. The Lead builds every task, each test written and seen to
fail before its code. Gemini runs the batches (the capture sets, the sweep, the perf rounds). Codex reviews the PR.

1. **The shared look.** `owlLook` and `easeLook` take the look's constants as a last argument, defaulting to
   `OWL.look`. Tests: the owl's nine pass unchanged. A target 98° off the facing and 0.44 away turns a head with the
   cat's cone (1.75 rad) and leaves the owl's (1.2217) straight.
2. **The cat's form** (`src/scene/cat.ts`, `CAT`, `catPlace`, `buildCat`). Tests: feet to ear tips is `CAT.size` within
   2%. At most 1,500 triangles. The chest's strokes are nearer `churchLit`'s mean than `roofSienna`'s, the coat's the
   other way. The place is on W3's top at `t` 0.81, lateral −0.15, the feet at 0.057 plus the contact gap, the body
   facing the lane. The haunches reach past both top rows' near edges (lateral −0.148 and −0.152), so the cat sits on
   stone.
3. **The component** (`src/scene/StreetCat.tsx`, in `Street.tsx` beside the owl). The head by task 1, the blink on the
   frogs' clock with its own phase, the tail's free third swaying on the sky's clock, drawn within 0.9, held under
   reduced motion and Pause. `__cat()` reports `visible`, `yaw`, `pitch`, `shut`, `tail` and `settled`.
   `capture-sky-frames.mjs`'s rest wait reads `__cat().settled` beside the owl's.
4. **The browser check**, a new case in `check-street-grass.mjs`: at stop 3 on the automatic walk the cat is drawn and
   its head turned toward Vincent, with `walk=0` it looks straight, at stop 0 it is not drawn, and under reduced motion
   its head and tail hold.
5. **The look passes** (the Lead, at most four) against the gate's list above.
6. **The gate** (the Lead): tsc, lint, `test:sky`, the street and grass hashes unchanged, the six browser checks and the
   new case. Gemini runs the sweep and the perf rounds, and the Lead reads their logs.

## The record (2026-10-30)

The evidence is in `scratch/street-cat-2026-10-30/` (`C` below).

**The build.** `3b0afd1`: the shared look, the cat, its component and its capture wait. `6afb21b`: the tail moved and
case 22. `2d04623`: #39's case 21 fix merged in.

**Look pass 1** (`C/look/p1`). The cat reads as a small sitting cat with its ears up, on both viewports and from stop 2.
Its tail did not show: from stops 2 and 3 the camera is behind the cat's left, and the tail lay on its right
(`C/probe-tail-side.ts`). The captures also froze the tail and the blink, because the capture helper pins the sky's
clock at 0.5 s.

**Look pass 2** (`C/look/p2`, `C/look/p2m`). The tail on the cat's left, a unit test holding its bend nearer the camera
than the body at both stops. The tail's tip flicks out past the front paws as it sways. With the clock unpinned the tail
swung from −0.74 to 0.16 rad and the eyes shut in 5 of 80 samples. The head follows Vincent from stop 2 (−1.29 rad at
walk `t` 0.53) to stop 3's dwell (0.222 rad, settled) and on (0.877 rad at walk `t` 0.83), and goes straight as he
leaves its reach. The anti-goals hold: a ginger cat, a small head, the ears and the tail read, it hides nothing at stop
3 (it is at x 641 to 652 on the desktop, Vincent at x 935). The Lead's flag for Mark: on the phone the cat is about
20 px tall, and its tall ears and red coat may read as a fox. Under reduced motion (`C/t6/reduced-s3`) it sits still
with its head straight. Two passes of four.

**The gate** (the Lead, the runs by Gemini, `C/t6/`), on `6afb21b`: tsc, lint, `test:sky` 504 of 504, the build hash
`69db1abe1f64b82b` and the grass hash `33504d291c27e9ac` as the owl's head left them, the walk, portal, rotation,
cypress and reduced-motion checks green. The triangle sweep's worst point 1,433,111 at walk `t` 0.26, unchanged; where
the cat is drawn the sweep rises by exactly its 952. Perf, five rounds at dpr 1.5: p50 16.7 ms and p95 at most 17.6 ms
at stops 0, 2 and 3 on both viewports; draw calls 322 at stop 0 (unchanged), 211 at stop 2, 181 at stop 3 (the owl's
173 plus the cat's 8 meshes). Four mutants, each failing case 22 as it must (`C/t6/mutants/summary.txt`): reduced
motion ignored, the cat drawn at any distance, the owl's cone, the tail held.

**A defect in slice 2, found here.** The gate's grass check failed at case 21, the moths: a lamp moth 0.0397 from its
glass against the check's 0.0389. Look pass 5 (`5668c5c`) added a jitter to the moths' flight and widened the unit
test's bound for it, but not case 21's. The moth was inside its true reach, 0.0506. Fixed on #39 in `e823396`, merged
here in `2d04623`; the full grass check then passed 22 of 22 (`C/t6/grass-rerun.log`).

