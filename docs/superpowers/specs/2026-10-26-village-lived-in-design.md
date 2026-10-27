# The village's craft, K3: the lived-in houses

**Status:** revision 1, 2026-10-26 (night), a draft for Mark's approval. Nothing is built. Codex read revision 0's facts
against the code (`scratch/village-craft-2026-10-25/k2/design-review-k3-codex.md`, REVISE, four P2 and two P3) and the
Consultant read it as a builder (`k2/builder-check-k3-consultant.md`, six questions). The Lead ran both reviewers'
probes again and they reproduce. This revision folds both reads. The plan follows Mark's approval.

## What revision 1 changed

| Finding | Where | What changed |
| --- | --- | --- |
| Codex F1 (P2): the two-leg route to `t` 0.50 crosses W2 (wall gap 0). | Fact 3, Decision (b) | The ends are checked over every leg's full width, not at the end alone. R2's options re-priced: W2 ending at 0.41 lets the path land at its nearest point, 0.344 long. The recommendation changes to that. |
| Codex F2 (P2): 92,000 triangles per unit of area is the lane's aggregate, not a narrow strip's cost. The ten paths at the lane's stroke size and full cover cost about 50,000, over K1's whole reserve. | Facts 5, 7, Decision (e) | Emitted counts from the real tracer replace the extrapolation. Cover 1 is out. |
| Codex F3 (P2): L2's strip, as wide as the gateposts' centres are apart, sits on a post. | Decision (a) | L2's path is the door's width wide, two legs, the first on the door's axis through the gate. 0.0075 clear of each post's edge. |
| Codex F4 (P2): the plant's dabs took flat palette colours, with no scan source. | Fact 9, Decision (c) | The plant is a clump of the grass's own blades, the bushes' measured stroke in the bushes' paint. |
| Codex F5 (P3): the plant's reference height 0.022 was the pot's width, not its height 0.02. | Decision (c) | The pot is 0.022 across and 0.022 high. The thatch row is no longer used. |
| Codex F6 (P3), Consultant Q6: the measurement crop (the palette's `village` rectangle) ends at y 2615, above seven of the nine `STREET_SOURCES`. | Fact 8, Decision (d) | The crop runs to the scan's bottom. The Lead names the wall that owns the `plaster` patch at 1:1 first. |
| Consultant Q1: L5's and R5's nearest lane points lie inside the square. The lane's path has ended there, and the square's face is coplanar. | Facts 1, 4, Decision (a) | A path ends at the lane's edge or the square's paving, whichever its line meets first. L5's step is 0.001 from the paving, so L5 has no path. R5's is 0.056 long. Frog 4 stands on the paving, 0.32 from R5's strip. |
| Consultant Q2: at the lane's reference height a 0.06-wide path carries one or two strokes. Each is longer than the path and clipped square at both ends: the anti-goal. | Fact 5, Decision (a), (e) | A door path's reference height scales with its width, as the far ground's does. Cover 0.25 to start: 28,700 triangles for the ten. |
| Consultant Q3: a shorter `plaster` length rebuilds the church too (`KEPT_PAINT` holds no length). More, shorter strokes at the same cover cost tens of thousands of triangles. | Decision (d), (e) | The shorter row reaches the four plaster houses only, through `WALL_PAINT`. The church keeps today's row. The ribbon count holds. |
| Consultant Q4: the rail as built rides the walls' class with `src` 255, so "class 255, as the rail" cannot both hold. | Constraints, Decision (c) | The objects' flat parts ride the walls' class with `src` 255, as the rail does. The plant's blades ride the grass's. |
| Consultant Q5: "`#556c81` darkened to the ground's share" names no operation, and × 0.4 lands within a few steps of the ink. | Decision (c) | The bucket is a wooden pail: the rail's wood, two ink hoops, an ink handle. |
| Consultant Q6: Fact 4 named lamp 1 by L1's path. Lamp 1 is on the right. | Fact 4 | Lamp 2 (`t` 0.24, left). The number stands. |
| Codex, Fact 2: the angles were read on a coarse grid. | Fact 2 | Angles to 0.1° from a 0.0001 grid. No door crosses the 30° line because of it. |
| The constraint's wording narrowed the craft design's rule to `STREET_SOURCES`. | Constraints | The craft design's words: a source rectangle of the scan. |

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

1. A path from every front door to the lane, painted as the lane is, the grass cleared along it. L5's door opens on
   the square's paving and needs none.
2. A sign of life at three doors, one kind each: a bench, a pot plant, a bucket.
3. The plaster houses' walls stop reading as planks at walking distance, if a 1:1 measurement of the scan's village
   supports a shorter stroke (K1's open item).

## Non-goals

- No change to the houses' places, the lane, the square, the stops, the frogs or K2's lamps and rail. K2's wall W2 may
  change in one way, for R2's path (Decision (b)), and only on Mark's word.
- No wreaths, signs, window boxes, washing lines, smoke or figures. No object at every door.
- No new motion. No new light. A sign of life is a still thing. The plant's leaves are the grass's blades, so they take
  the grass's wind and the hand's push, which already exist.
- No change to the church's paint.
- Vincent's form and the walk's controls are not this slice (noted in `tasks/todo.md`, 2026-10-26).

## Anti-goals (a failure even if every check passes)

- **A toy town.** Bright pots, white benches, a flowerpot at every door.
- **Clutter.** The door's area so busy that the house loses its simple volume.
- **Garden paths that read as paving.** The paths are trodden earth in the lane's paint, not stone slabs or a lighter
  ribbon with hard edges.
- **The far read broken.** From stop 0 the village must still read as the painting's.
- **A slower frame or a triangle over the ceiling.**

## Constraints (the craft design's, which still bind)

- **The bar** (`CLAUDE.md`, locked, in the craft design's words): every new surface is painted from a source rectangle
  of the scan, or takes a flat colour from `palette.json` under the street's ink. No new texture. The scan rectangles in
  use are `STREET_SOURCES` (`streetStrokes.ts`) and `GRASS_SOURCES` (`grassBlade.ts`).
- **Stroke scale:** a stroke's width and length stay inside its source's measured range, as fractions of the face's
  reference height. A value outside needs a new 1:1 measurement of the scan's village first, in the record before the
  value is used (Decision (d)).
- **The palette gate (the craft design's rule):** the paths ride the path's class (4, unmeasured). The objects' flat parts
  ride the walls' class (0) with `src` 255, as the rail and the posts do, and the gate reports how far they move the
  walls' mean. The plant's blades ride the grass's class.
- **The triangle ceiling** 1,444,930 at every browser point, both orientations. 60 fps desktop, 30 fps mid-tier phone.
- **Reduced motion:** nothing new moves, so nothing changes.
- **The build's time** stays within 10% of K2's.
- **Retune cap:** four look passes.

## The facts the design rests on

Read at `1f3fa26` on `feat/village-lane` (before K2's build) with the Lead's probes
`scratch/village-craft-2026-10-25/k2/probe/lead-k3-*.mjs`, then corrected against Codex's `codex-k3-route.mjs` and
`codex-k3-paint.mjs`, the Consultant's `consultant-k3-check.mjs`, and the Lead's `lead-k3-r2gap.mjs`,
`lead-k3-paint-ref.mjs` and `lead-k3-square.mjs`, all run by the Lead on 2026-10-26. The route probes check every leg of a path over its full
width against K2's wall footprints, the lamp posts and the frogs' rings. The paint probes run the real tracer on the real
painting and flow.

1. **The doors, the lane and the square.** Each door's step (`doorStepFrame`, `STEP` 0.012 × 0.03) and the shortest
   way from its front to the lane's edge (lateral 0.06). The distance is from the step to the lane, not a path's
   length:

   | House | Type | Door width | Step front to lane edge | Nearest stop | Lit |
   | --- | --- | --- | --- | --- | --- |
   | L1 | painting | 0.042 | 0.360 | 1 (0.52 away) | yes |
   | L2 | cottage | 0.048 | 0.235 | 2 (0.29) | no |
   | L3 | painting | 0.044 | 0.291 | 3 (0.45) | no |
   | L4 | painting | 0.056 | 0.340 | 4 (0.40) | yes |
   | L5 | cottage | 0.042 | 0.186, on the square | 4 (0.49) | no |
   | R1 | cottage | 0.051 | 0.436 | 1 (0.53) | no |
   | R2 | painting | 0.044 | 0.305 | 2 (0.42) | yes |
   | R3 | painting | 0.048 | 0.296 | 3 (0.35) | no |
   | R4 | painting | 0.056 | 0.135 | 4 (0.39) | yes |
   | R5 | cottage | 0.045 | 0.247, on the square | 4 (0.37) | no |

   The lane's path ends at `t` 0.9257 (its last segment overlapping to 0.9457, `streetGeometry.ts:977-982`), and the
   square's one face takes over: a 0.5 × 0.5 quad at y 0.002 in the street's frame, centred on `STREET_SQUARE`, its
   corners 0.354 from the centre (`streetGeometry.ts:990-992`). The grass stops at the circle of radius 0.25 about the
   same centre (`inFootprint`, `streetGrass.ts:58`). L5's nearest lane-edge point (`t` 0.974) and R5's (`t` 0.934) lie
   on that paving, so a path to them would be coplanar with it. L5's step stands 0.001 from the paving's edge. R5's
   line meets the paving 0.056 from its step (and the grass's circle at 0.156).
2. **Some doors face away from the lane.** The angle between a door's facing (`doorStepFrame`'s normal) and the line
   to the nearest lane-edge point, on a 0.0001 grid of `t`: L1 5.2°, L2 4.6°, L3 70.3°, L4 33.8°, L5 8.8°, R1 45.4°,
   R2 52.6°, R3 1.2°, R4 8.1°, R5 23.7°. A path straight out of L3's or R1's door runs 0.45 to 0.55 and crosses a K2
   wall. So a path may bend (Decision (a)).
3. **K2's walls lie between two doors and the lane.** W2 (right, `t` 0.14 to 0.47, 17 segments) ends inside R2's run:
   R2's nearest lane point is at `t` 0.457, and every straight path from R2's step to it crosses W2. A two-leg path to
   `t` 0.50, past W2's end, still crosses it (wall gap 0: the second leg cuts the wall's last segments). The nearest end
   whose legs clear W2 by 0.03 is `t` 0.564: 0.490 long, the village's longest. If W2 ends at `t` 0.41 (14 segments),
   R2's path lands at its nearest point, 0.344 long, 0.031 clear of the wall's end (Decision (b)). W3 (left, 0.54 to
   0.84) starts past L3's nearest point (`t` 0.494): L3's two-leg path clears it by 0.039 but comes within 0.020 of frog
   3's ring, so its end slides to `t` 0.499 (0.351 long, wall 0.033, ring 0.030). W3 ends before L4's nearest point
   (`t` 0.875), 0.045 clear.
4. **Lamps and frogs near the paths.** With the path the door's width + 0.02 wide: lamp 1 stands inside R1's two-leg
   path, which slides to `t` 0.062 (0.494 long, 0.030 from the post). Lamp 5 is 0.010 from R3's edge, which slides to
   `t` 0.627 (0.030). Lamp 2 is 0.040 from L1's path and lamp 7 0.055 from R5's: clear. Frog 4 (the square's, `t`
   0.975, lateral −0.08) stands on the paving 0.155 from the square's centre, so the grass-ring rule (frogs 0 to 3, in
   the grass) does not reach it: R5's strip to the paving's edge is 0.32 from its body (`FROG.clear`), and L5 has no
   strip. L2's nearest
   point (`t` 0.341) is 4.6° off its facing, but a strip at the door's width + 0.02 is exactly as wide as K2's gateposts
   are apart, so it sits on a post (Decision (a), L2).
5. **The lane's paint, and what it costs on a narrow path.** The lane's path is `clad(ctx, 'path', …)` in segments:
   source `field`, kind `path`, class 4, the base `GROUND_BASE_SHARE` 0.4 of the source lifted `PATH_LIFT` 0.5 toward
   `hillsCrest`, inset `PATH_BASE_INSET` 0.024 from the edges, the strokes at the reference height `STREET.wallRef` 0.2,
   density 1 (`streetGeometry.ts:975-992`). Its surface is at y 0.002, the strokes lifted above it. At that reference
   the field's strokes are 0.030 to 0.050 wide and 0.30 to 1.20 long in world units: two to four across the 0.12 lane.
   A door path is 0.062 to 0.076 wide and 0.08 to 0.49 long, so at the lane's reference it carries one or two strokes
   across, every one longer than the path and clipped square at both ends. The far ground already scales the reference
   for its distance (`STREET.wallRef × 2.5` and `× 2`, `streetGeometry.ts:962, 969`), so a reference scaled to the
   path's width keeps the fractions inside the measured row. The lane's path and the square cost 49,512 triangles over
   an area of about 0.54, but a narrow strip costs more per unit of area, and a ribbon costs about 250 triangles
   whatever its length (the tracer steps in fractions of the stroke), so the cost is the ribbon count. The ten paths on
   the real tracer, at the ends that clear every obstacle (area 0.215, before L5's path goes and R5's ends at the
   paving, which takes about 11% off):

   | Reference height | Cover | Triangles | Ribbons |
   | --- | --- | --- | --- |
   | the lane's, 0.2 | 1 | 54,536 | 215 |
   | the lane's, 0.2 | 0.5 | 26,604 | 108 |
   | scaled to the width (0.10 to 0.13) | 1 | 123,088 | 434 |
   | scaled | 0.5 | 58,372 | 220 |
   | scaled | 0.25 | 28,736 | 111 |

   These are candidate counts: the joins, seeds and final ends move them. `street-build.test.ts:239-242` requires
   density 1 for every face outside the houses, the ground tiles and the church's hidden list, so a door path at a
   lower cover is a seam the plan names.
6. **The grass's clearings.** K2 turns the grass's filter into a list of oriented rectangles, the steps and the walls
   (`stepClearings()`, `wallClearings()`, `streetClearings()` in `streetLayout.ts`, K2's plan Decision (e)). A path is
   one more rectangle per leg. The filter runs after the shuffle, so no retained blade moves or changes. The ten paths'
   rectangles remove 2,513 of 17,010 blades (14.8%). How many of those were drawn at any one camera is measured in the
   browser, not assumed: the chunks' draw counts and spheres change with the retained blades. There is no grass on the
   square (`inFootprint` excludes the circle, `streetGrass.ts:58`).
7. **The budget.** K1 left the walk's worst point 30,183 under the ceiling (`t` 0.295, desktop). K2's cost is measured
   at its gate (its plan's estimate: about 2,500). The paths at the scaled reference and cover 0.25 cost about 28,700
   before any grass saving (Fact 5). At the lane's reference and cover 1 they cost 50,000 to 55,000. Even if every
   cleared blade were drawn at the worst point (4 segments, 20,104 triangles at most), that net cost would be at least
   34,000, over K1's whole reserve.
8. **The scan.** `reference/starry-night-source.jpg` is 3840 × 3041. The palette's `village` rectangle is x 1075 to
   2995, y 2007 to 2615 of it, and seven of the nine `STREET_SOURCES` lie below it: `wallA` y 2830 to 2880, `wallB`
   2690 to 2753, `plaster` 2609 to 2659, `roofStriped` 2846 to 2928, `thatch` 2846 to 2942, `field` 2914 to 3029,
   `windowLit` 2606 to 2626. The crop for the measurement is x 1075 to 2995, y 2007 to 3041, so every source and the
   wall that owns each is inside. The `plaster` source is 24 × 50 px of it, [2124, 2609, 2148, 2659], which is
   [885, 1087, 895, 1108] in the 1600 px work image. `plaster`'s measured strokes (`SOURCE_STROKES`): width 0.10 to
   0.15 and length 0.5 to 1.0 of the reference height, vertical. `SOURCE_STROKES.plaster.length` is read for every
   face whose source is `plaster`: the four plaster houses, and the church's nave (`pale` maps to `plaster`,
   `streetGeometry.ts:165-167`), belfry and spire (`:911, 918`). `KEPT_PAINT` holds base, light and cover, no length.
   `faceConfig`'s ribbon count is the cover over the strokes' mean area, so it rises as the length falls: L4's front
   wall (0.28 × 0.3) takes 37 ribbons at the measured row, 74 at half the length, 123 at 0.15 to 0.3.
9. **The colours and strokes for the objects.** `palette.json`'s `village` region: `#151b24`, `#2a3f6f`, `#556c81`,
   `#26282b`, `#36403f`. The rail's wood is the `thatch` source's mean (K2). The ink is `INK`. The grass's blade
   (`GRASS_BLADE`, S3) is the painting's bush stroke, measured at 8×: 60 to 70 px long and 5 to 8 px wide at 1:1. That is
   8 to 11 times as long as wide, drawn 5 to 7.5. It is painted from the bushes' rectangle (`GRASS_SOURCES.bushes`,
   [1445, 1155, 1600, 1267]) with the moon on its arch.

## Decisions

**(a) The paths.** Every front door gets one. A path is one or two straight strips, the door's width + 0.02 wide, from
the step's front to the lane's edge (lateral 0.06), on the lane's surface (y 0.002), painted as the lane's path is
(Fact 5) with its own base and strokes, in the `path` owner. Where the step's line meets the square's paving before
the lane's edge (R5), the path ends at the paving's edge. L5's step is 0.001 from that edge, so L5 has no path: its
door opens on the square. The grass is cleared along it with the steps' margin (`GRASS.house`
0.012), one rectangle per strip (Fact 6).

The rule for its end: the lane-edge point nearest the step. Where the line from the step to that point is more than 30°
off the door's facing (L3, L4, R1, R2), the path has two legs: the first straight out of the door for 0.08, the second
from there to the end. Every leg, over its full width, stays 0.03 or more from every lamp post, wall footprint, frog
ring (frogs 0 to 3) and frog body (frog 4). Where the nearest end fails that, the end slides along the lane's edge, away
from the obstacle, to the nearest `t` that passes (L3, R1, R3, Fact 4). The plan starts from these ends and the tests
hold them: L1 0.265, L2 0.341, L3 0.499, L4 0.875, L5 none, R1 0.062, R2 by Decision (b), R3 0.627, R4 0.710, R5
the paving's edge (0.056 from its step).

**L2 (Lead, Codex F3):** its path passes K2's gate. Two legs: the first on the door's axis through the gate to 0.02 past
the posts, the second from there to the nearest point. The whole path is the door's width wide (0.048, no + 0.02): the
posts' clear aperture is 0.063, which leaves 0.0075 to each post's edge. 0.235 long.

**The strokes (Lead, Consultant Q2):** a door path's reference height is the lane's × its width / 0.12 (0.10 to 0.13),
so its strokes keep the lane's proportions, two to four across, and the fractions stay inside the field's measured row,
as the far ground's scaled reference does. At the lane's own reference a path carries one or two strokes clipped
square at both ends: a lighter ribbon with hard edges, the anti-goal. The cover is a knob, 0.15 to 0.35 of the lane's,
0.25 to start (Fact 5, 28,700 triangles for the ten): a path to one house is walked less than the lane, and the budget
says the same (Decision (e)). The base's inset 0.024 would leave a 0.06-wide path with a base 0.012 wide, so a path's
base inset is 0.3 of its width across (`[0, 0.3 × width]` with the face's u along the leg), a base 0.4 of the width.
A path is trodden earth, not paving: it takes the lane's paint and nothing of its own.

**(b) R2's path and W2.** Every straight path from R2's step to its nearest lane point crosses W2, and so does a two-leg
path to `t` 0.50 (Fact 3). Three ways, Mark's call, the Lead's recommendation first:

1. **W2 ends at `t` 0.41** (14 segments, was 17). R2's path lands at its nearest point (`t` 0.457), two legs, 0.344
   long, 0.031 clear of the wall's end. The wall ends where the path meets the lane, as a wall does at a gateway. One
   number in K2's `STREET_WALLS` and its test, after K2's gate, and three segments fewer.
2. **No change to K2.** R2's path lands at `t` 0.564, past W2's end, two legs, 0.490 long, 0.030 clear: the longest
   path in the village, a detour round the wall.
3. No path at R2 (its door keeps its step and the grass).

Revision 0 recommended a path to `t` 0.50 at 0.319 long. That route crosses the wall (Codex F1), so the recommendation
is now the wall's end, which gives the shorter path.

**(c) The signs of life.** Three, at the doors the stops see closest, one kind each:

- **L2, a bench** against the front wall beside the door, inside K2's rail garden, seen from stop 2 (0.29 away). A
  plank 0.10 long, 0.03 wide, 0.012 thick at 0.025 high, on two boxes 0.012 square. Wood as the rail's: the `thatch`
  source's mean, lit and shaded as a wall face, no ink (as the rail).
- **R4, a pot plant** beside the step, seen from stop 4 (0.39 away). R4 is lit, plaster, and the house nearest the lane
  (its path 0.135). The pot: an eight-sided tub 0.022 across and 0.022 high, in `village`'s `#36403f`, with the ink's
  rim. The plant: one clump of the grass's blades (5 to 9, `GRASS_BLADE`, Fact 9), rooted on the pot's top, scaled
  0.6 to 0.8, in the grass's paint with the moon on the arch, leaning to the clump's side as the grass does. **Lead
  (Codex F4, F5):** revision 0 made the plant of `stoneDab` ribbons in two `cypress` hexes with the thatch's measured
  row. A stroke needs a scan source, and the blade is one already: the bushes' stroke, measured, in the bushes' paint.
- **L4, a bucket** by the step's side, seen from stop 4 (0.40 away). L4 is lit, two storeys. A wooden pail: an
  eight-sided tub 0.016 across, 0.018 high, in the rail's wood (the `thatch` source's mean), two hoops and a handle as
  thin arcs of ink. **Lead (Consultant Q5):** revision 0 gave it `#556c81` "darkened to the ground's share", which
  names no operation. **Lead, open to Mark:** a bucket is the quietest of the three. A woodpile against the wall is the
  other candidate for a cottage with a chimney (R1, R5), and would carry the same wood.

Each is an identity object placed by hand in `streetLayout.ts` beside `STEP`, in the house's frame, outside the door's
swing and the path, 0.01 from the wall. The flat parts take flat colours under the ink (the craft design's rule for parts
the scan does not show) and ride the walls' class with `src` 255, as the rail does (Consultant Q4). The plant's blades
are the grass's, so they take no new stroke scale and ride the grass's class.

**(d) The plaster's strokes (K1's open item).** The Lead measures first, before any value changes: the scan's village
at 1:1 and 4× (`magick` crops of Fact 8's rectangle), the wall that owns the `plaster` source named first, then the pale
walls' strokes counted and measured in pixels against each wall's height, the result written into the record. Three
outcomes:

- The walls carry strokes 0.5 to 1.0 of their height, as `SOURCE_STROKES.plaster` says. Then the planks are a density
  question, and the knob is the plaster walls' cover (K1 set every wall's to 0.8), down to 0.5, in the look passes.
- The walls carry shorter strokes. Then the shorter row applies to the four plaster houses (L1, L4, R2, R4) through
  `WALL_PAINT`, a per-owner factor on the plaster row's length (the plan's seam), in the record first. The church keeps
  today's row, because `SOURCE_STROKES.plaster` reaches its nave, belfry and spire and `KEPT_PAINT` holds no length
  (Fact 8, Consultant Q3). The ribbon count holds: the plaster walls' cover falls with the length (37 ribbons on L4's
  front at the measured row, 74 at half the length at the same cover), so the change costs no triangles. More strokes
  than that is Mark's call, paid from the paths' cover.
- The walls are flat with a few marks. Then the plaster walls take a higher base share and a cover of 0.3 or less, and
  the few strokes stay the measured size.

Whatever the outcome, the change touches only faces whose source is `plaster` and whose owner is one of the four
houses. The church and the flat panel keep `KEPT_PAINT` and today's row.

**(e) The budget.** The paths at the scaled reference and cover 0.25 cost about 28,700 triangles, about 11% less once
L5's path goes and R5's ends at the paving, before the grass they clear gives anything back (Fact 5). The objects about 300 to 600
each, the plant's clump about 70. K1's 30,183 less K2's measured cost (about 2,500) leaves about 27,700, so cover 0.25
fits only with the grass saving, which the browser's sweep measures. The plaster's outcome 2 holds its count. If the
sweep fails, the levers in order: the paths' cover down to 0.15, then the far paths (L1 and R1, the two longest) fading
into the grass short of the lane. Cover 1 at the lane's reference (50,000 to 55,000) is out. The hard limit is the
browser's sweep: every point under 1,444,930 on both viewports.

**(f) The slice stacks on K2.** The paths need K2's `laneAt` and its clearings list, and the bench stands inside K2's
rail. The branch is `feat/village-lived-in` from `feat/village-lane`'s gated head. K3's build waits for K2's gate.

## What each gate shows

- 1:1 crops at stops 2 and 4 (the bench, the pot plant, the bucket) and at stops 1 and 3 (paths only), desktop and
  phone, beside K2's.
- R4's path at 1:1 beside the lane's path at stop 4: the strokes' scale and the trodden-earth read.
- The far read: stop 0 beside the painting's village crop.
- The plaster walls at 1:1 beside the scan's village at 1:1, with the measurement. The church byte for byte as K2's.
- The browser's triangle sweep, both viewports: every point under 1,444,930, and the grass's draw count at the worst
  point beside K2's.
- The frame time at stops 0 and 4, the branch beside K2.
- The palette gate: the walls' ΔE, how far the three objects move the walls' mean, and how far the plaster's change
  moves them.
- The build's time, before and after.

## Left to the builder

The paths' joins at a bend (no doubled paint where two legs overlap), the seeds, and the plant's clump as a grass chunk
of its own. The objects' exact places in their houses' frames. The shape of `WALL_PAINT`'s per-owner length factor. The
order of the knob trials inside a pass. The test seams, the build test's density rule among them (Fact 5).

## Open for Mark now

- R2's path against W2 (Decision (b)): the recommendation is 1, W2 ending at `t` 0.41.
- The bucket at L4, or a woodpile at a cottage.
- Whether the far houses (L1, R1) keep their paths at full length, or the paths fade into the grass short of the lane.
  Also the budget's second lever if cover 0.25 does not fit (Decision (e)).
