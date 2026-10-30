# A cat on the wall at stop 3

**Status:** revision 0, the Lead's draft for Mark, 2026-10-30. Nothing is built. Two reads come before Mark sees it: a
builder's read as a planner and Codex's read of the facts against the code. The probes behind every number are in
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
   y 0.057: `STREET_WALL.height` plus `STROKE_LIFT` 0.002 (`streetGeometry.ts:1543`). The middle of the top is at
   lateral −0.15.
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
   `vincent.ts` (`solid`, `clad`, `underpaintColour`), 544 triangles, two groups (the body and the turning head), five
   meshes. The head's turn is `owlLook` (within `reach` 0.6 and ±70° of the body's facing, aimed at `targetY` 0.07,
   Vincent's head) eased by `easeLook` (τ 0.6 s, snapped within 1e-4 rad since `47ae236`, with `__owl().settled`). The
   blink is `owlBlink`, the frogs' table with its own phase. It is drawn within a distance of the camera, and holds its
   pose under reduced motion. `vincent.ts` also has `tube` and `sphere`, for a tail and the ears.
8. **Scale.** Vincent is 0.085 for 1.7 m, so 0.05 world a metre. A sitting cat is about 25 to 30 cm to its ear tips (the
   Lead's estimate, not a measured source): 0.0125 to 0.015. The frog (0.0108, about 22 cm) and the owl (0.024 against a
   true 0.018) were both sized up so the phone finds them.
9. **The colours** (`C/probe-coat.log`, mean Lab in the scan): `roofSienna` [705, 1046, 726, 1066] L 24.7, a +9.5, b
   +4.4, a red-brown at hue 25°. `wallB`, the wall's stones, L 32.8, a −0.1, b −9.1, a blue-grey. `thatch`, the owl's
   back, L 27.4, an olive grey. `churchLit` L 49.0, a pale blue-white.

## Decisions

- (a) **The place.** On W3's top at `t` 0.81, lateral −0.15, the feet at y 0.057 plus a contact gap the builder sets
  (the frogs' and the owl's pattern). Its body faces the lane, toward where Vincent stops: from stop 3's camera it shows
  three-quarters to side-on, its face toward him. The plan's first task measures the spot in the real build and may move
  it within `t` 0.80 to 0.83.
- (b) **The form.** An upright sit: the haunches as one ellipsoid, the chest rising from them, a round head with two
  pointed ears, the tail as a tube curled round the front feet with its last third free. The front legs are one form
  under the chest. The outline must carry the ears and the tail. At most 1,500 triangles. The proportions are left to the
  builder and the look pass, within the size.
- (c) **The size.** `CAT.size` 0.015, about 30 cm, with the true scale 0.0125 noted beside it, as the owl's was: 35 px
  on the desktop and 20 on the phone at stop 3. It is a tunable, and Mark's call (Open 1).
- (d) **The paint.** The coat from `roofSienna`, the chest, the muzzle and the inside of the ears from `churchLit`, the
  eyes in the owl's ink, the underpaint from `roofSienna`'s darkest 40%. A red-brown cat stands apart from the blue-grey
  stones by its hue, and from the owl's olive back. Mark may prefer another source (Open 2).
- (e) **The head.** It turns toward Vincent by the owl's rule: within 0.6 of the neck and ±70° of the body's facing, aimed
  at his head (`targetY` 0.07), eased over τ 0.6 s and snapped within 1e-4 rad. At stop 3 he is 0.18 away and inside the
  cone. As he walks in from stop 2 he enters the reach at about 0.6, so the head follows him in. The code is the owl's,
  shared: the look and the easing take their constants as an argument, and the owl keeps its own unchanged, with its tests
  unchanged. The cat reports `__cat()` with `settled`, and the capture tool waits for it beside the owl's.
- (f) **The blink and the tail.** It blinks on the frogs' clock with its own phase, as the owl does. The tail's free
  third sways on the sky's clock, so a pinned capture holds it still: a slow sway of about ±0.35 rad over about 3 s to
  start, set by the look pass. No flick in revision 0. The tail is its own group, turned at its root.
- (g) **The still states.** Under reduced motion and Pause the head holds its pose, the eyes stay open and the tail stays
  still. With no Vincent (`vincent=0`, `walk=0`, the flat panel) the head looks straight ahead.
- (h) **Drawn** within 0.9 of the camera (fact 6): at stops 2 and 3, and nowhere before `t` 0.41. No URL flag. The draw
  calls it adds (the owl's five meshes and the tail's) are counted at stop 3, which draws 173 today.

## What the gate shows

- Stop 3 with Vincent arrived, turned and the lantern raised, on both viewports, with 1:1 crops of the cat beside the
  full frames.
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

## Open for Mark

1. **The size.** 0.015 (the Lead's call, 20 px on the phone at stop 3) or the true 0.0125 (17 px). It is a tunable
   either way.
2. **The coat.** `roofSienna`, a red-brown (the Lead's call), or another rectangle of the scan.
