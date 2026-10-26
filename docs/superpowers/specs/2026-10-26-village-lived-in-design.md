# The village's craft, K3: the lived-in houses

**Status:** draft for Mark's approval, 2026-10-26 (night). Nothing is built. Codex reads its facts against the code
and the Consultant reads it as a builder before Mark reads it. The plan follows his approval.

## Why

Mark, on K1's preview (2026-10-26): "I don't feel much differences. But I would think the house front door maybe
shouldn't be that much grass. We might need to refine the house later on to make it more real and show that house
actually live in people. Perhaps some decorations, front door path, small plant etc."

K1 reworked the houses' paint and parts, and at walking distance the change read as small. What is still missing is
the evidence of people: the way from each door to the lane, worn through the grass, and a thing or two someone left by
the door. The painting cannot show this (its village is a few centimetres of canvas), so these are invented parts that
continue the derived style, as the design's rule has it.

## What the visitor should feel

Walking the lane, each house has a way in. The grass gives way to a trodden path from the door to the lane, so the door
is a door and not a hole in a wall above a lawn. At two or three doors something small says a person was here a minute
ago: a bench against the wall, a pot with a plant by the step, a bucket. Nothing bright, nothing cute, nothing that
asks to be looked at. From stop 0 the village still reads as the painting's.

## Goals

1. A path from every front door to the lane, painted as the lane is, the grass cleared along it.
2. A sign of life at three doors, one kind each: a bench, a pot plant, a bucket.
3. The plaster houses' walls stop reading as planks at walking distance, if a 1:1 measurement of the scan's village
   supports a shorter stroke (K1's open item).

## Non-goals

- No change to the houses' places, the lane, the stops, the frogs or K2's lamps and rail. K2's wall W2 may change in
  one way, for R2's path (Decision (b)), and only on Mark's word.
- No wreaths, signs, window boxes, washing lines, smoke or figures. No object at every door.
- No new motion. No new light. A sign of life is a still thing.
- Vincent's form and the walk's controls are not this slice (noted in `tasks/todo.md`, 2026-10-26).

## Anti-goals (a failure even if every check passes)

- **A toy town.** Bright pots, white benches, a flowerpot at every door.
- **Clutter.** The door's area so busy that the house loses its simple volume.
- **Garden paths that read as paving.** The paths are trodden earth in the lane's paint, not stone slabs or a lighter
  ribbon with hard edges.
- **The far read broken.** From stop 0 the village must still read as the painting's.
- **A slower frame or a triangle over the ceiling.**

## Constraints (the craft design's, which still bind)

- **The bar** (`CLAUDE.md`, locked): every new surface is painted from a `STREET_SOURCES` rectangle of the scan, or
  takes a flat colour from `palette.json` under the street's ink. No new texture.
- **Stroke scale:** a stroke's width and length stay inside its source's measured range. A value outside needs a new 1:1
  measurement of the scan's village first, in the record before the value is used (Decision (d)).
- **The palette gate:** the paths ride the path's class (4, unmeasured), the objects' flat parts class 255, any dabs the
  class of their source.
- **The triangle ceiling** 1,444,930 at every browser point, both orientations. 60 fps desktop, 30 fps mid-tier phone.
- **Reduced motion:** nothing here moves, so nothing changes.
- **The build's time** stays within 10% of K2's.
- **Retune cap:** four look passes.

## The facts the design rests on (read at `1f3fa26` on `feat/village-lane`, before K2's build, with the probes in
`scratch/village-craft-2026-10-25/k2/probe/lead-k3-*.mjs`)

1. **The doors and the lane.** Each door's step (`doorStepFrame`, `STEP` 0.012 × 0.03) and the shortest way from its
   front to the lane's edge (lateral 0.06):

   | House | Type | Door width | Step front to lane edge | Nearest stop | Lit |
   | --- | --- | --- | --- | --- | --- |
   | L1 | painting | 0.042 | 0.360 | 1 (0.52 away) | yes |
   | L2 | cottage | 0.048 | 0.235 | 2 (0.29) | no |
   | L3 | painting | 0.044 | 0.291 | 3 (0.45) | no |
   | L4 | painting | 0.056 | 0.340 | 4 (0.40) | yes |
   | L5 | cottage | 0.042 | 0.186 | 4 (0.49) | no |
   | R1 | cottage | 0.051 | 0.436 | 1 (0.53) | no |
   | R2 | painting | 0.044 | 0.305 | 2 (0.42) | yes |
   | R3 | painting | 0.048 | 0.296 | 3 (0.35) | no |
   | R4 | painting | 0.056 | 0.135 | 4 (0.39) | yes |
   | R5 | cottage | 0.045 | 0.247 | 4 (0.37) | no |

2. **Some doors face away from the lane.** The angle between a door's facing (`doorStepFrame`'s normal) and the line
   to the nearest lane-edge point: L1 5°, L2 4°, L3 71°, L4 34°, L5 9°, R1 45°, R2 53°, R3 1°, R4 8°, R5 24°. A path
   straight out of L3's or R1's door runs 0.45 to 0.55 and crosses a K2 wall. So a path may bend (Decision (a)).
3. **K2's walls lie between two doors and the lane.** W2 (right, `t` 0.14 to 0.47) ends inside R2's run: R2's nearest
   lane point is at `t` 0.457, so every straight path from R2 crosses W2. A path landing at `t` 0.50, past W2's end,
   is 0.319 long and 71° off R2's facing (Decision (b)). W3 (left, 0.54 to 0.84) starts past L3's nearest point
   (`t` 0.494), 0.03 or more clear, and ends before L4's (`t` 0.875), 0.059 clear.
4. **Lamps and frogs near the paths' ends.** With the path the door's width + 0.02 wide: lamp 1 is 0.026 inside R1's
   path at the nearest-point rule, lamp 5 is 0.010 from R3's edge, lamp 1 is 0.040 from L1's. Frog 4 (the square's)
   sits 0.052 inside L5's path's frog ring (`3 × FROG.clear × scale`).
5. **The lane's paint.** The path is `clad(ctx, 'path', …)` in segments: source `field`, kind `path`, class 4, the base
   `GROUND_BASE_SHARE` 0.4 of the source lifted `PATH_LIFT` 0.5 toward `hillsCrest`, inset `PATH_BASE_INSET` 0.024 from
   the edges, the strokes at `STREET.wallRef`, density 1 (`streetGeometry.ts:975-992`). The lane's path and the square
   cost 49,512 triangles over an area of about 0.54: about 92,000 triangles per unit of area.
6. **The grass's clearings.** K2 turns the grass's filter into a list of oriented rectangles, the steps and the walls
   (`stepClearings()`, `wallClearings()`, `streetClearings()` in `streetLayout.ts`, K2's plan Decision (e)). A path is
   one more rectangle per leg. The filter runs after the shuffle, so no blade elsewhere moves. The grass starts at
   lateral 0.052 and reaches the houses' fronts.
7. **The budget.** K1 left the walk's worst point 30,183 under the ceiling (`t` 0.295, desktop). K2's estimate is about
   2,500. The paths' area is 0.191 (the probe): about 17,600 triangles at the lane's density, less the grass they
   clear (about 5% of the blades, about 1,900 at the worst point).
8. **The scan.** `reference/starry-night-source.jpg` is 3840 × 3041. The village rectangle is x 1075 to 2995, y 2007 to
   2615 of it. The `plaster` source is 24 × 50 px of it ([2124, 2609, 2148, 2659]). `plaster`'s measured strokes
   (`SOURCE_STROKES`): width 0.10 to 0.15 and length 0.5 to 1.0 of the reference height, vertical.
9. **The colours for the objects.** `palette.json`'s `village` region: `#151b24`, `#2a3f6f`, `#556c81`, `#26282b`,
   `#36403f`. Its `cypress` region: `#151c1b`, `#2e3743`, `#232622`, `#333426`. The rail's wood is the `thatch` source's
   mean (K2). The ink is `INK`.

## Decisions

**(a) The paths.** Every front door gets one. A path is one or two straight strips, the door's width + 0.02 wide, from
the step's front to the lane's edge (lateral 0.06), at the ground's height, painted exactly as the lane's path is
(Fact 5), with its own base and strokes, in the `path` owner. The grass is cleared along it with the steps' margin
(`GRASS.house` 0.012), one rectangle per strip (Fact 6).

The rule for its end: the lane-edge point nearest the step. Where the line from the step to that point is more than 30°
off the door's facing (L3, L4, R1, R2), the path has two legs: the first straight out of the door for 0.08, the second
from there to the end. Where a strip comes within 0.03 of a lamp post, a wall's footprint or a frog's ring (R1, R3, L5,
Fact 4), its end slides along the lane's edge, away from the obstacle, until it clears. The plan fixes each end's `t`
from these rules, and the tests hold them.

**Lead:** a path is trodden earth, not paving. It takes the lane's paint and nothing of its own. Its cover (the
strokes' density) is a knob, 0.5 to 1 of the lane's: a path to one house is walked less than the lane. The base's inset
0.024 would leave a 0.06-wide path with a base 0.012 wide, so a path's base inset is 0.3 of its width.

**(b) R2's path and W2.** Every path from R2 to its nearest lane point crosses W2 (Fact 3). Three ways, Mark's call,
the Lead's recommendation first:

1. **R2's path lands past W2's end** at `t` 0.50, two legs, 0.319 long. The wall ends where the path reaches the lane,
   as a wall does at a gateway. No change to K2.
2. A gap in W2 at R2's path (W2 shortened to end at `t` 0.43, or split). A change to K2's `STREET_WALLS` after its gate.
3. No path at R2 (its door keeps its step and the grass).

**(c) The signs of life.** Three, at the doors the stops see closest, one kind each:

- **L2, a bench** against the front wall beside the door, inside K2's rail garden, seen from stop 2 (0.29 away). A
  plank 0.10 long, 0.03 wide, 0.012 thick at 0.025 high, on two boxes 0.012 square. Wood as the rail's: the `thatch`
  source's mean, lit and shaded as a wall face, class 255, no ink (as the rail).
- **R4, a pot plant** beside the step, seen from stop 4 (0.39 away). R4 is lit, plaster, and the house nearest the lane
  (its path 0.135). The pot: an eight-sided tub 0.022 across, 0.02 high, in `village`'s `#36403f`, with the ink's rim.
  The plant: eight to twelve short draped dabs (K2's `stoneDab`) fanning up and out from the pot's rim, 0.02 to 0.035
  long, in `cypress`'s `#333426` and `#232622`, with their lit side toward the moon.
- **L4, a bucket** by the step's side, seen from stop 4 (0.40 away). L4 is lit, two storeys. An eight-sided tub 0.016
  across, 0.018 high, in `village`'s `#556c81` darkened to the ground's share, the ink's rim, a handle as one thin arc
  of ink. **Lead, open to Mark:** a bucket is the quietest of the three. A woodpile against the wall is the other
  candidate for a cottage with a chimney (R1, R5), and would carry the thatch's wood colour.

Each is an identity object placed by hand in `streetLayout.ts` beside `STEP`, in the house's frame, outside the door's
swing and the path, 0.01 from the wall. The flat parts take flat colours under the ink (the craft design's rule for parts
the scan does not show). The plant's dabs are strokes, so they take a measured row: `thatch`'s (0.08 to 0.16 wide, 0.8
to 1.6 long of the reference height 0.022, the pot's height), which gives dabs 0.018 to 0.035 long.

**(d) The plaster's strokes (K1's open item).** The Lead measures first, before any value changes: the scan's village
at 1:1 and 4× (`magick` crops of Fact 8's rectangle), the pale walls' strokes counted and measured in pixels against each
wall's height, the result written into the record. Three outcomes:

- The walls carry strokes 0.5 to 1.0 of their height, as `SOURCE_STROKES.plaster` says. Then the planks are a density
  question, and the knob is the plaster walls' cover (K1 set every wall's to 0.8), down to 0.5, in the look passes.
- The walls carry shorter strokes. Then `plaster`'s length range changes to the measured one, in the record first,
  and the walls rebuild from it.
- The walls are flat with a few marks. Then the plaster walls take a higher base share and a cover of 0.3 or less, and
  the few strokes stay the measured size.

Whatever the outcome, the change touches only faces whose source is `plaster` (L1, L4, R2, R4), through a per-source
cover in `WALL_PAINT`. The church and the flat panel keep `KEPT_PAINT`.

**(e) The budget.** About 17,600 triangles for the paths at cover 1 (Fact 7), about 9,000 at cover 0.5. The objects
about 300 to 600 each. The grass cleared along the paths gives back about 1,900 at the worst point. K1's 30,183 less
K2's 2,500 leaves about 27,700. The hard limit is the browser's sweep: every point under 1,444,930 on both viewports.

**(f) The slice stacks on K2.** The paths need K2's `laneAt` and its clearings list, and the bench stands inside K2's
rail. The branch is `feat/village-lived-in` from `feat/village-lane`'s gated head. K3's build waits for K2's gate.

## What each gate shows

- 1:1 crops at stops 2 and 4 (the bench, the pot plant, the bucket) and at stops 1 and 3 (paths only), desktop and
  phone, beside K2's.
- The far read: stop 0 beside the painting's village crop.
- The plaster walls at 1:1 beside the scan's village at 1:1, with the measurement.
- The browser's triangle sweep, both viewports: every point under 1,444,930.
- The frame time at stops 0 and 4, the branch beside K2.
- The palette gate: the walls' ΔE, and how far the plaster's change moves them.
- The build's time, before and after.

## Left to the builder

The paths' exact ends and legs from Decision (a)'s rules. The objects' exact places in their houses' frames. The order
of the knob trials inside a pass. The test seams.

## Open for Mark at the gates, not now

- R2's path against W2 (Decision (b)): the recommendation is 1.
- The bucket at L4, or a woodpile at a cottage.
- Whether the far houses (L1, R1) keep their paths at full length, or the paths fade into the grass short of the lane.
