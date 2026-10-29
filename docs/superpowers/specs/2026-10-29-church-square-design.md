# The church and its square: the church's paint, the trees, the flowers, then the owl and the moths

**Status:** revision 0, 2026-10-29 (afternoon), a draft for Mark's approval. Nothing is built. A builder read and a
Codex read of the facts follow before Mark sees it. Two slices come out of it, each with its own plan.

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
shade, a striped needle of a spire, dark trees close against it. By its door a few pale flowers catch the lamp and
Vincent's lantern. On its ridge a small owl sits, and turns its head to watch him pass. At the lamps a few moths
circle in the light. Nothing moves fast, nothing glows on its own, and nothing is spooky.

## Goals

- The church's walls, belfry and spire take their paint from the painting's own church, in its two tones: white where
  the moon lights, blue-shaded elsewhere. The plaster's lightness at stop 4 closes most of the gap to the painting's.
- The two trees that flank the square stand close against the church, as the painting's do.
- A bed of pale flowers along the church's front wall and a ring round the square's lamp.
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
  footprint (Task 0 confirms).
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
   (ambient 0.8, key 0.9, capped at 1). The church is 875 ribbons.
2. **Its lightness.** The plaster patch reads L p10 / p50 / p90 of 39.8 / 52.2 / 57.0 in the scan. The rendered plaster
   at stop 4 reads 31.6 / 43.7 / 57.8 on the desktop (the church record, look pass 1). The record's open item 3 names the
   levers left: a wider source in the scan, or the church exempt from `wallShade` (`streetLight.ts:32`, the ground,
   eaves and corner darkening). The ambient's useful range ended at 0.8: above about 0.81 the moonlit side reaches the
   cap and the two walls' step goes.
3. **The light's sides.** `STREET_MOON` lights the +along side, so at stop 4 the church's right wall (the three
   windows) is the moonlit one at 0.986 and the front gable with the door is at 0.8. The painting's church has it the
   other way: the front white, the side in ultramarine shade.
4. **The spire and the belfry.** The belfry is a 0.09 square tower beside the nave, from 0.035 below the ground to
   0.445 less the island's height, each wall clad in plaster with one louvred opening at 0.82 of its height. The spire's
   four triangles run from the belfry's top to the tip at 1.125 less the island's height, clad in plaster. From stop 4
   only the spire shows above the nave's roof: the belfry's walls and their openings are behind the nave (the capture
   `look0/desktop-s4.png`). The hidden faces (`CHURCH.hidden`) are clad at 0.25.
5. **The trees.** Three, each a land mass's crown on a trunk (`streetTrees.ts`): `orchard-lower` at map (721, 236),
   `olive-right` at (266, 226) and `olive-church` at (451, 607). The map is 0.0024 world per pixel and the square's
   centre is map (500, 300), so the two flanking trees stand 0.53 right and 0.56 left of the square's centre, 0.15 to
   0.18 forward of it. The church's nave centre is 0.425 forward of the square's centre (0.25 + 0.155 + 0.02). So the
   trees are about 0.25 short of the church's centre line and 0.4 to 0.45 out from its walls: at stop 4 they sit at the
   frame's edges. Crown radii are clamped to 0.12 to 0.17.
6. **Triangles.** At stop 4 the walk draws 1,274,039 triangles (desktop; the wander's gate sweep), 170,000 under the
   ceiling. The walk's worst point is 1,429,793 at `t` 0.26, where none of the church, the square's lamp or the flowers
   is near. The trees have no distance rule: all three are drawn at every `t` (the Lead's read of `streetTrees.ts`;
   Task 0 confirms by the sweep).
7. **The square's light.** The seventh lamp stands at `t` 1.0, lateral 0.2 (`STREET_LAMPS`), its halo 0.134 world at
   most, scaled by depth, its pool on the square. The church's windows are unlit. Vincent's lantern lifts the ground
   within 0.08 at 1.5 × the lamps' glow, so when he reaches stop 4 the door's foot is lit by him.
8. **The frog as the precedent.** The square's frog is 1,212 triangles, `FROG.size` 0.0108 (about 22 cm beside Vincent's
   0.085 for 1.7 m), built as Vincent is: ellipsoids and tubes clad in the painting's strokes, blinking on one shared
   clock, drawn within 1.1 of the camera on the square.
9. **The painting's church** (the Lead's read of `t0/painting-church-2x.png`, the scan at 2×): white walls worked in
   short leaning dabs, ultramarine on the shaded side and in the eaves' shadow, dark blue outlines, one lit lemon window
   at the left, a spire of blue-grey and white strokes along its length with a dark band at its foot, and dark rounded
   blue-green trees pressing against both sides, their tops above the eaves.
10. **The moths' scale.** A giant peacock moth, the one Van Gogh drew at Saint-Rémy in May 1889, spans about 15 cm:
    0.0075 world. Common moths span 3 to 5 cm: 0.0015 to 0.0025. A lamp's lantern is 0.012 × 0.016. At stop 3 the
    nearest lamp (`t` 0.65) is about 0.3 from the camera, where 0.004 is about 13 px on the desktop.

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
  size). Cover stays 1 (`KEPT_PAINT`) and the brush 0.16, so the ribbon count stays near 875. The outlines stay.
- (d) **The spire's strokes** run along its length, long (of the order of the thatch recipe's 0.8 to 1.6), in `spire`.
  The belfry's four walls take `belfry`, their openings kept. From stop 4 the belfry is behind the nave, so this shows
  only as the dark band the painting has where the spire meets the roof.
- (e) **The lightness target.** On plaster-class pixels inside the church's box at stop 4 (the church record's measure,
  `scratch/church-l.ts`), L p50 within 4 of the painting's 52.2, on both viewports, with the two walls' step kept. The
  Lead's look passes may move `CHURCH_LIGHT.ambient` within 0.7 to 0.81 and may exempt the church from `wallShade`'s
  corner term (fact 2's levers). Nothing else is lifted by hand.
- (f) **The trees close in.** `orchard-lower` and `olive-right` move the fewest whole map pixels that put each crown's
  edge within 0.05 of the nave's wall, one each side, their tops above the eaves (fact 9). Each crown stays 0.025 clear
  of the church's walls and of every house. From stops 3 and 4 on both viewports, no crown covers the door, any of the
  three windows or the gable's peak (an ID-mask check in the plan, as the church's face probe). `olive-church` stays.
  No tree is added (non-goals).
- (g) **The flowers** (Mark's suggestion, read from "owl flowers" as the owl and flowers). A bed along the church's
  front wall's foot, either side of the door's band and step, the wall's length less 0.02 at each end, 0.03 deep. A
  ring round the square's lamp post, radius 0.03. Each is a clump of the grass's own blades at scale 0.5 (K3's plant)
  with heads: comma dabs (the grass base's dab, 8 triangles) no more than 0.004 across, in the painting's pale yellows
  from the `stars` region's palette, gated against the `windowLit` mean (ΔE over 5) so no head is a window's colour.
  About 40 heads at the wall and 16 at the lamp: under 1,500 triangles. The flowers take the lamp's and the lantern's
  light as the grass does, and the hand does not bend them. The Lead's call on size and count, open to Mark whether
  to keep them at all.
- (h) **The colour gate** reads each new source's class against its own rectangle's palette (ΔE at most 10), as E1 did,
  not against the pooled village reference (the church record's open item 4).

### Slice 2: the owl and the moths

- (i) **The owl.** A barn owl: the Dutch name is "kerkuil", the church owl, because it nests in church towers, and Van
  Gogh was Dutch. 0.018 tall (36 cm beside Vincent's 1.7 m), about 29 px on the desktop at stop 4. The Lead's
  recommendation, open to Mark against the little owl (22 cm, dark, `0.011`).
- (j) **Its perch** is the nave's ridge, 0.08 back from the front gable's peak, facing the square. The belfry's openings
  are behind the nave from stop 4 (fact 4), so a bird there would not be seen. On the ridge it is a small shape against
  the sky from stops 3 and 4, and a speck from stop 0.
- (k) **Its build.** As the frog's: a body ellipsoid, a round head with a flat heart face, two ink eyes, clad in the
  painting's strokes. The face and front from `churchLit`, the back and wings from `thatch` (the olive, brown and grey
  of a barn owl's back). At most 1,500 triangles, one draw call, drawn within 1.1 of the camera as the square's frog
  is.
- (l) **Its behaviour.** It blinks on the frogs' shared clock with its own phase. Its head turns toward Vincent when he
  is within 0.6 and within 70° of the body's facing, eased over τ 0.6 s, at most 70° either way, and turns back when he
  is not. No flight, no hoot. Under reduced motion and Pause it holds still, as the frogs do.
- (m) **The moths.** Three at every lamp and two at each lit window within 0.6 of the camera. Each is one camera-facing
  quad 0.004 × 0.003 (an 8 cm moth), all in one instanced mesh, painted in the lantern's lit mean (`windowLit`) and
  dimmed by the halo's falloff from the glass, so a moth at the glass is bright and one at the halo's edge is faint.
  Each flies its own loop about the lantern, radius 0.02 to 0.05, period 1.2 to 2.5 s, with a small vertical wobble, its
  phase and radius from its seed. 7 lamps × 3 + near windows: under 50 quads. Under reduced motion and Pause they rest
  on the lantern's frame, still.
- (n) **Draw calls.** Slice 1 adds one (the flowers, or none if they join the grass base's mesh). Slice 2 adds two
  (the owl, the moths). Stop 0 is at 321 today.

## What each gate shows

- Slice 1: 1:1 crops of the church at stops 3 and 4 on both viewports, before and after, beside the painting's church,
  with the L measure. The two full frames at stop 4. The tree move as a plan drawing and the ID-mask check. The colour
  gate per class. The triangle sweep's worst point and stop 4. Perf at stops 0 and 3. The build hash named.
- Slice 2: stop 4 with Vincent arrived and the owl's head turned to him, both viewports. A short frame sequence of the
  turn and a blink. Stop 3's nearest lamp with its moths, and the same under reduced motion. The triangle sweep. Perf.
  The draw calls at stop 0.
- Both: the six browser checks, the unit tests, the hashes, and Mark's pass on the preview.

## Left to the builder

- The exact widths, lengths and leans of the church's strokes, from the Task 0 measurement.
- The moths' loop (any smooth closed curve that stays within its radius), the owl's shape within its size, the flower
  heads' spacing within the bed, and the instancing.
- Which lit windows count as near, within the 0.6 rule.

## Open for Mark

1. The two tones mirrored (decision (b)): white on the moonlit side, blue-shade on the front. Or the painting's way,
   white on the front, which would need the church's light turned against the street's moon.
2. The flowers: keep, or drop. And if kept, the wall bed, the lamp ring, or both.
3. The owl: barn owl (pale face, the church link) or little owl (small and dark).
4. The perch: the ridge near the gable, or the spire's foot (the belfry's top edge, higher and nearer the centre of
   stop 4's frame).
