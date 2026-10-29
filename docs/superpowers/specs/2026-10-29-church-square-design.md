# The church and its square: the church's paint, the trees, the flowers, then the owl and the moths

**Status:** revision 1, 2026-10-29 (evening), a draft for Mark's approval. Nothing is built. A builder (Sonnet) read
revision 0 as a planner (`scratch/church-animals-2026-10-29/review/builder-check-r0.md`, seven questions) and Codex
read its facts against the code (`review/codex-design-r0.md`, REVISE, three P2 and two P3, with the probe
`probe-design-r0.mjs`). This revision folds both. Two slices come out of it, each with its own plan.

## What revision 1 changed

| Finding | Where | What changed |
| --- | --- | --- |
| Codex F1 (P2): the frog's draw distance 1.1 culls the owl at stop 3 (1.41 away) and stop 0 (2.74). It is 19 px tall at stop 4 on the desktop, not 29. | Facts 4, 10, Decisions (i), (j), (k) | The owl draws within 1.5. Stop 0 is dropped. The sizes are the projection's, and a sized-up owl is Mark's call. |
| Codex F2 (P2): at stop 3 the lamps at `t` 0.55 and 0.65 are beside the camera, out of frame. The nearest in frame is `t` 0.79 at 0.42, where an 8 cm moth is 9 px. | Fact 10, Decision (m), the gate | The moth is 12 cm, and the gate's witness is that lamp. |
| Codex F3 (P2): Vincent's lantern at stop 4 is 0.265 from the door, its reach 0.08. The square lamp's pool (0.16) is 0.36 from the wall bed. Neither lights the bed. | Fact 7, Decision (g), the feel, Open 2 | The ring in the lamp's pool is the recommendation. The wall bed is moonlit, Mark's call. |
| Codex F4 (P3): the two walls' step does not go at ambient 0.81. It shrinks from 0.814 to nothing at 1. | Fact 2 | Said so. The 0.81 ceiling is kept as a choice. |
| Codex F5 (P3): cover 1 and the brush 0.16 do not hold the count. A row half as long gives 1,547 ribbons and 4,288 more triangles. | Fact 1, Decision (c) | The count is provisional with a bound. 872 ribbons today, not 875. |
| Codex's audit: the crowns are 0.18 to 0.23 from the nave's wall, not 0.4. The belfry is 23 of 722 samples unblocked from stop 4, and its top is under the ridge. The trees' meshes are frustum-culled as wholes. The ridge runs along the depth, not `along`. The grass base's comma is a shader. Four lit windows. ΔE is strict. | Facts 4, 5, 6, Decisions (e), (g), (h), (j), (m) | Each corrected. |
| The builder's seven questions (the target's mask, the trees' fallback, the flowers' count, the moths' windows, the perch's numbers, the owl's target, the plan's defaults) | (e), (f), (g), (j), (l), (m), How it is built | Folded in revision 0's last commit. |

## Why

Mark, 2026-10-29, after the wander (PR #37): "Animals besides the frogs" from the noted ideas, then "I am thinking
that we might put the owl around the church, in my opinion the church is a bit dull at the moment. We can set
something up around the church too like owl flowers or move the trees around the church ect", and "I also think that
we can just build it if it's well planned". Asked whether the church's look should change too, the Lead said yes.

The Lead's read of stop 4 beside the painting's church (`scratch/church-animals-2026-10-29/look0/desktop-s4.png`
and `scratch/street-church-2026-10-25/t0/painting-church-2x.png`), the biggest first:

1. The church is flat grey. Both walls are nearly one pale grey in thin vertical streaks, and read as chalk or
   weathered boards. The painting's church is white, with ultramarine in its shadows and dark blue outlines, and its
   shaded side is plainly darker than its front.
2. It stands alone. At stop 4 one lamp is beside it. In the painting, houses and dark rounded trees press against it.
3. The spire is plain grey in the same streaks. The painting's spire is a slender needle of blue and white strokes
   along its length, with a dark band at its foot.

## What the visitor should feel

At the lane's end, the church is the village's pale centre, as it is in the painting: white walls with blue in the
shade, a striped needle of a spire, dark trees close against it. By the square's lamp a few pale flowers catch its
light. On its ridge a small owl sits, and turns its head to watch him pass. At the lamps a few moths
circle in the light. Nothing moves fast, nothing glows on its own, and nothing is spooky.

## Goals

- The church's walls, belfry and spire take their paint from the painting's own church, in its two tones: white where
  the moon lights, blue-shaded elsewhere. The plaster's lightness at stop 4 closes most of the gap to the painting's.
- The two trees that flank the square stand close against the church, as the painting's do.
- A ring of pale flowers round the square's lamp, and a bed along the church's front wall if Mark wants a moonlit one.
- One owl on the church's ridge: still, blinking, its head following Vincent when he is near.
- Moths at the lamps and at the lit windows near the camera.
- All of it inside today's triangle ceiling, frame rate and gates, and still under reduced motion.

## Non-goals

- The spire's top at stop 4 (about 9° cropped on the desktop, the church record's open item 1). Both levers change
  the walk's camera. Not this design.
- A fourth tree. A tree costs about 36,000 triangles (108,096 for three), and the walk's worst point has about 15,000
  spare. Only the two trees move.
- The church's roof, door, windows, step and outlines. They stay as slice 3c built them.
- Other animals, sound, a second portal, flowers by the houses.
- Any change to the camera, the walk, the wander or the stations.

## Anti-goals (a failure even if every check passes)

- The church reads as a ghost or as a cartoon. Its two walls lose their step (the gable 0.8, the moonlit side 0.986).
- The owl reads as a Halloween owl, or as a lump no one can name.
- The moths read as sparks, fireflies or noise, or draw the eye off the church.
- A tree hides the door, a window or the gable's peak from stop 3 or 4, on either viewport.
- The flowers read as lit windows on the ground.
- Colours invented by hand. Every colour comes from a rectangle of the scan, as the craft design rules.

## Constraints (the project's, which still bind)

- The acceptance criteria and the Tunables' limits: colours from the scan within ΔE 10 of their own source, 60 fps at
  stops 0 and 3 at dpr 1.5 (p95 at most 18.6 ms, the wander's), the triangle ceiling 1,444,930 at every sampled point of
  the walk, `prefers-reduced-motion` a still state, the camera on its rail.
- No new dependency. `?street=1` builds it for every visitor once it ships. `?light=0` still builds the street unlit.
- The street's build hash changes (the church's strokes change) and the plan names the new one. The grass hash stays,
  because nothing here clears grass: the church's foot and the square's lamp stand on the ground tiles, past the grass's
  footprint (Task 0 checks it).
- The layout test's clearances: a tree's built crown 0.025 clear of every house (Codex T2), and here of the church's
  walls too.
- The retune cap: four look passes a slice. Visual work and the look passes are the Lead's. Mechanical build goes to a
  Sonnet builder.
- Claude does not edit The bar, Gates, Out of scope or the acceptance criteria.

## The facts the design rests on

1. **The church's paint today.** Its walls, belfry and spire are clad from `STREET_SOURCES.plaster`, a 10 × 21 px patch
   of the scan at painting px `[885, 1087, 895, 1108]` (`src/scene/streetStrokes.ts:23`), the same patch the four plaster
   houses use. The recipe is vertical strokes (`axis [0, 1]`), 0.1 to 0.15 wide and 0.5 to 1.0 long of the church's brush
   0.16 (`CHURCH.stroke`), cover 3.5. The paint is `KEPT_PAINT` (base 0, light 0.5, cover 1), the light `CHURCH_LIGHT`
   (ambient 0.8, key 0.9, capped at 1). The church is 872 ribbons by the build's face reports (the church record
   said 875).
2. **Its lightness.** The plaster patch reads L p10 / p50 / p90 of 39.8 / 52.2 / 57.0 in the scan. The rendered plaster
   at stop 4 reads 31.6 / 43.7 / 57.8 on the desktop (the church record, look pass 1). The record's open item 3 names the
   levers left: a wider source in the scan, or the church exempt from `wallShade` (`streetLight.ts:32`, the ground,
   eaves and corner darkening). At ambient 0.814 the moonlit side reaches the cap, and from there the two walls' step
   shrinks as the ambient rises: 0.186 at 0.81, 0.15 at 0.85, nothing at 1 (Codex F4's table). It does not go at once,
   as the church record and `streetLight.ts:21-22` say. The 0.81 ceiling below is a choice, not that point.
3. **The light's sides.** `STREET_MOON` lights the +along side, so at stop 4 the church's right wall (the three
   windows) is the moonlit one at 0.986 and the front gable with the door is at 0.8. The painting's church has it the
   other way: the front white, the side in ultramarine shade.
4. **The spire and the belfry.** The belfry is a 0.09 square tower beside the nave, from 0.035 below the ground to
   0.445 less the island's height, each wall clad in plaster with one louvred opening at 0.82 of its height. The spire's
   four triangles run from the belfry's top to the tip at 1.125 less the island's height, clad in plaster. In the
   street's frame the belfry's top is 0.394 above the ground and the tip 1.074, under and over the nave's ridge at
   0.425. From stop 4 the belfry is almost all behind the nave: a ray probe from stop 4's eye found 23 of 722 belfry
   samples unblocked by the nave's faces on each viewport (Codex's probe), and the capture `look0/desktop-s4.png`
   shows only the spire above the roof. The plan's ID check settles what shows. The hidden faces (`CHURCH.hidden`)
   are clad at 0.25.
5. **The trees.** Three, each a land mass's crown on a trunk (`streetTrees.ts`): `orchard-lower` at map (721, 236),
   `olive-right` at (266, 226) and `olive-church` at (451, 607). The map is 0.0024 world per pixel and the square's
   centre is map (500, 300), so the two flanking trees stand 0.53 right and 0.56 left of the square's centre, 0.15 to
   0.18 forward of it. The church's nave centre is 0.425 forward of the square's centre (0.25 + 0.155 + 0.02). Their
   centres are 0.47 and 0.41 from the nave's nearest wall, and their built crowns (reach 0.240 and 0.236, past the
   nominal R of 0.17) stop 0.225 and 0.176 short of it (Codex's probe). Their tops, 0.456 and 0.453, are already above
   the eave at 0.24. At stop 4 they sit at the frame's edges. Crown radii are clamped to 0.12 to 0.17, and the search
   in (f) uses the built reach, not R.
6. **Triangles.** At stop 4 the walk draws 1,274,039 triangles (desktop, the wander's gate sweep), 170,000 under the
   ceiling. The walk's worst point is 1,429,793 at `t` 0.26, where none of the church, the square's lamp or the flowers
   is near. The trees have no distance rule: their two shared meshes are frustum-culled as wholes, so all three are
   drawn wherever a mesh is in frame (Codex). The church's strokes are in the street's shared meshes the same way, so
   a change to the church's count is paid at the worst point too: 15,137 is the room there.
7. **The square's light.** The seventh lamp stands at `t` 1.0, lateral 0.2 (`STREET_LAMPS`), its halo 0.134 world at
   most, scaled by depth, its pool on the square (radius 0.16, painted on the ground: the lamp is no point light). The
   church's windows are unlit. Vincent's lantern lifts the ground within a reach of 0.08 at 1.5 × the lamps' glow. At
   stop 4 his lantern's glass is 0.265 from the door's foot, so it does not light the door: the lift there is 0.00002
   of its value at the glass (Codex F3). The lamp's pool is 0.36 from the nearest point of a bed along the church's
   front wall. So that wall's foot is lit by the moon and the church's own light only, unless he wanders to the door.
   The grass's shader knows the moon and his lantern, not the lamps.
8. **The frog as the precedent.** The square's frog is 1,212 triangles, `FROG.size` 0.0108 (about 22 cm beside Vincent's
   0.085 for 1.7 m), built as Vincent is: ellipsoids and tubes clad in the painting's strokes, blinking on one shared
   clock, drawn within 1.1 of the camera on the square.
9. **The painting's church** (the Lead's read of `t0/painting-church-2x.png`, the scan at 2×): white walls worked in
   short leaning dabs, ultramarine on the shaded side and in the eaves' shadow, dark blue outlines, one lit lemon window
   at the left, a spire of blue-grey and white strokes along its length with a dark band at its foot, and dark rounded
   blue-green trees pressing against both sides, their tops above the eaves.
10. **The moths' scale.** A giant peacock moth, the one Van Gogh drew at Saint-Rémy in May 1889, spans about 15 cm:
    0.0075 world (the species accounts give 10 to 15 cm). Common moths span 3 to 5 cm: 0.0015 to 0.0025. A lamp's
    lantern is 0.012 × 0.016. At stop 3 the two nearest lamps (`t` 0.55 and 0.65, 0.18 and 0.19 away) are beside the
    camera, out of both frames. The nearest lamp in frame is `t` 0.79, 0.42 away, where a 0.004 quad is 9.2 px wide
    on the desktop and 5.3 on the phone, and a 0.0075 one 17 and 10 (Codex F2's projection).

## Decisions

### Slice 1: the church's paint and its square

- (a) **The church's own sources.** Task 0 of the plan measures four rectangles of the scan at 1:1, each inscribed in
  the painting's church: `churchLit` (the white front), `churchShade` (the ultramarine side), `spire` (the striped
  shaft) and `belfry` (the dark band at the spire's foot). No hand-picked colour. Each is wider than the 10 × 21 px
  plaster patch, so the strokes vary as the painting's do. The four plaster houses keep `plaster`.
- (b) **The two tones follow the light, not the painting's side.** The moonlit faces (`lightOf` 0.9 or more: the right
  wall at stop 4) take `churchLit`. The rest (the gable at 0.8, the back, the left) take `churchShade`. The painting
  has the white on the front and the blue on the side, but the street's moon is where it is, and swapping would fight
  `CHURCH_LIGHT`'s step. The result is the painting's two tones, mirrored. The Lead's call, open to Mark (below).
- (c) **The walls' strokes.** Short leaning dabs, their width, length and lean measured at 1:1 on the church's own
  walls in the scan (the craft design's rule: fractions of a reference height measured on the scan, never a screen
  size). Cover stays 1 (`KEPT_PAINT`) and the brush 0.16. They do not hold the count: `faceConfig` counts from the
  width and the length, and a row half as long doubles the church to about 1,550 ribbons and adds 4,288 triangles to
  the street (Codex F5's probe). So the count is provisional until Task 0's measurement, and the plan writes the
  ledger then. The bound: the church at most 1,600 ribbons and the street at most 602,000 triangles, which keeps the
  walk's worst point under 1,435,000. The outlines stay.
- (d) **The spire's strokes** run along its length, long (of the order of the thatch recipe's 0.8 to 1.6), in `spire`.
  The belfry's four walls take `belfry`, their openings kept. From stop 4 the belfry is behind the nave, so this shows
  only as the dark band the painting has where the spire meets the roof.
- (e) **The lightness target**, per wall against its own source, by the ID mask's class for that source (each new
  source gets its own class, as `plaster` is class 2). At stop 4 on both viewports: the moonlit wall's pixels read L p50
  within 4 of `churchLit`'s own L p50 in the scan, and the gable's within 4 of `churchShade`'s. Not a pooled figure,
  which could pass with one wall wrong. The church record's measure (`scratch/church-l.ts`) takes the class as a
  parameter. Each new source needs its own class in `SOURCE_CLASSES`, the ID encoding and the colour checker. The two
  walls' step is kept. The Lead's look passes may move `CHURCH_LIGHT.ambient` within 0.7 to 0.81 and may exempt the
  church from `wallShade`'s corner term (fact 2's levers). Nothing else is lifted by hand.
- (f) **The trees close in.** `orchard-lower` and `olive-right` move the fewest whole map pixels that put each crown's
  edge within 0.05 of the nave's wall, one each side, their tops above the eaves (fact 9). Each crown stays 0.025 clear
  of the church's walls and of every house. From stops 3 and 4 on both viewports, no crown covers the door, any of the
  three windows or the gable's peak (an ID-mask check in the plan, as the church's face probe). `olive-church` stays.
  No tree is added (non-goals). Where the three rules cannot all be met, they give way in this order: closeness first
  (the crown stops at the nearest whole pixel that keeps the other two), the clear gap never, the cover never. Each
  tree keeps its side and its template. The plan's Task 0 finds the two positions by a search over whole map pixels
  and prints them, so the move is a number before it is a build.
- (g) **The flowers** (Mark's suggestion, read from "owl flowers" as the owl and flowers). A bed along the church's
  front wall's foot, either side of the door's band and step, the wall's length less 0.02 at each end, 0.03 deep. A
  ring round the square's lamp post, radius 0.03. The bed is about 12 clumps and the ring 6, each a clump of the
  grass's own blades at scale 0.5 (K3's plant's build, 5 to 9 blades of four segments), and 2 to 4 of each clump's
  blades carry a head at the tip: a comma dab of 8 triangles in the shape of K2's `stoneDab` (the grass base's comma
  is a fragment shader, not a mesh, so the head is new geometry), no more than 0.004 across, in the painting's pale
  yellows from the `stars` region's palette, gated against the `windowLit` mean (ΔE over 5) so no head is a window's
  colour. About 18 clumps, 56 heads: about 1,000 triangles of blades and 450 of heads. The flowers are their own
  static mesh, built with the grass's blade function but outside the grass's chunks and the trail, so the grass hash
  does not change and the hand does not bend them. The ring sits in the lamp's painted pool and reads by it. The wall
  bed has no light but the moon's and the church's own (fact 7): pale heads by a pale wall, a moonlit bed, and
  Vincent's lantern reaches it only when he wanders to the door. So the Lead's recommendation is the ring alone, and
  the wall bed is Mark's call. The size and the count are the Lead's call.
- (h) **The colour gate** reads each new source's class against its own rectangle's palette (ΔE under 10, the
  project's strict bar), as E1 did, not against the pooled village reference (the church record's open item 4).

### Slice 2: the owl and the moths

- (i) **The owl.** A barn owl: the Dutch name is "kerkuil", the church owl, because it nests in church towers, and Van
  Gogh was Dutch. 0.018 tall (36 cm beside Vincent's 1.7 m). From stop 4 the perch is 0.91 from the camera, so it is
  19 px tall on the desktop and 11 on the phone, and 13 and 7 from stop 3 (Codex F1's projection). The frog was sized
  up from 15 px to 22 so the phone finds it. The same choice is open here: at 0.024 (a large bird, 48 cm) it is 25
  and 14 px at stop 4. The Lead's recommendation is the barn owl at 0.018, open to Mark against the little owl (22 cm,
  dark, 0.011) and against the larger size.
- (j) **Its perch** is the nave's ridge, 0.08 back from the front gable's peak, facing the square. In numbers: the
  ridge is at the eave plus the pitch, 0.24 + 0.185 = 0.425 above the ground, and runs along the nave's depth
  (`toPath`: `along` is the width, `streetGeometry.ts:459`). The perch is `churchFront()` moved 0.08 toward the
  nave's centre, at y 0.425: (−0.297, 0.425, −2.524) in the street's frame. The body faces the front wall's outward
  normal, the direction from the nave's centre to `churchFront()`: toward the square and the lane's end. Stop 4's
  camera is 37.8° off that normal (the church record), inside the head's reach below. The spire's foot is no perch:
  the belfry's top is 0.394, under the ridge, and almost all behind the nave from stop 4 (fact 4). On the ridge it is
  a small shape against the sky from stops 3 and 4. From stop 0 it is 2.74 away and 7 px, and not drawn.
- (k) **Its build.** As the frog's: a body ellipsoid, a round head with a flat heart face, two ink eyes, clad in the
  painting's strokes. The face and front from `churchLit`, the back and wings from `thatch` (the olive, brown and grey
  of a barn owl's back). At most 1,500 triangles. Two meshes, the body and the head, so the head turns as a rigid
  part: two draw calls, or one with the turn in the shader, the builder's choice. Drawn within 1.5 of the camera, so
  it is there at stops 3 (1.41 away) and 4 (0.91) and not at stop 0 (2.74). The frog's 1.1 would cull it at stop 3
  (Codex F1).
- (l) **Its behaviour.** It blinks on the frogs' shared clock with its own phase. Its head turns toward Vincent's drawn
  position (the walk's slot, or the wander's) when he is within 0.6 of the perch and within 70° of the body's facing,
  eased over τ 0.6 s, at most 70° either way, and turns back when he is not. With no Vincent (`vincent=0`, `walk=0`,
  the flat panel) the head stays straight. The camera is never the target. No flight, no hoot. Under reduced motion
  and Pause it holds still, as the frogs do.
- (m) **The moths.** Three at every lamp, at every `t`, and two at each lit window, shown while the window is within
  0.6 of the camera. The lit windows are the build's class 2 quads with their outward normals (`streetLife.ts`
  `litWindows`), and a window's glass is its quad's centre 0.005 out along that normal. A lamp's glass is its
  lantern's centre. Each moth is one camera-facing quad 0.006 × 0.0045 (a 12 cm moth, inside the peacock moth's 10
  to 15 cm), all in one instanced mesh
  built once, painted in the lantern's lit mean (`windowLit`) and dimmed by the halo's falloff from the glass, so a
  moth at the glass is bright and one at the halo's edge is faint. Each flies its own loop about its glass, radius 0.02
  to 0.05, period 1.2 to 2.5 s, with a small vertical wobble, its phase and radius from its seed. 7 lamps × 3 + 2 at
  each of the build's 4 lit windows: 29 quads, 58 triangles. The gate's witness is stop 3's lamp at `t` 0.79, 0.42
  away, where a 0.006 quad is 14 px wide on the desktop and 8 on the phone (fact 10). Under reduced motion and Pause
  they rest on the glass's frame, still.
- (n) **Draw calls.** Slice 1 adds one (the flowers). Slice 2 adds two or three (the owl's body and head, the moths).
  Stop 0 is at 321 today.

## What each gate shows

- Slice 1: 1:1 crops of the church at stops 3 and 4 on both viewports, before and after, beside the painting's church,
  with the L measure. The two full frames at stop 4. The tree move as a plan drawing and the ID-mask check. The colour
  gate per class. The triangle sweep's worst point and stop 4. Perf at stops 0 and 3. The build hash named.
- Slice 2: stop 4 with Vincent arrived and the owl's head turned to him, both viewports. A short frame sequence of the
  turn and a blink. Stop 3's lamp at `t` 0.79 with its moths, and the same under reduced motion. The triangle sweep. Perf.
  The draw calls at stop 0.
- Both: the six browser checks, the unit tests, the hashes, and Mark's pass on the preview.

## How it is built

The plan builds the decisions as written. Mark's answers under "Open for Mark" replace the Lead's calls before the
plan is written, so the plan carries no switches for them. Slice 1 first, then slice 2 on its branch, because the owl
sits on the church and the moths' light is the square's. Each slice gets a plan with the two reads, Sonnet builders
for the mechanical tasks, the Lead for the paint and the look passes, a branch review, the Lead's gate and Mark's
pass on the preview.

## Left to the builder

- The exact widths, lengths and leans of the church's strokes, from the Task 0 measurement.
- The moths' loop (any smooth closed curve that stays within its radius), the owl's shape within its size, the flower
  heads' spacing within the bed, and the instancing.
- Which lit windows count as near, within the 0.6 rule.

## Open for Mark

1. The two tones mirrored (decision (b)): white on the moonlit side, blue-shade on the front. Or the painting's way,
   white on the front, which would need the church's light turned against the street's moon.
2. The flowers: the ring in the lamp's pool (the Lead's recommendation), the wall bed as well (moonlit, lit by
   Vincent only when he wanders to the door), or none.
3. The owl: barn owl (pale face, the church link) or little owl (small and dark). And its size: true to life (0.018,
   19 px on the desktop and 11 on the phone at stop 4) or sized up as the frog was (0.024, 25 and 14 px).
