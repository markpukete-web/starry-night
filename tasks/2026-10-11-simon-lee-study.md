# Simon Lee's "Impressionism lab" — study, 2026-10-11

Mark found this on X and asked what we can learn from it. Study only: CLAUDE.md says study prior art,
never copy its implementation or assets.

## Sources

- 2026-09-26, 82 s: <https://x.com/simonxxoo/status/2103800335529554108>. Post: a stylised Van Gogh
  scene generator built with Codex over about a month, porting his Blender geometry nodes and oil-paint
  materials to the browser.
- 2026-10-07, 112 s: <https://x.com/simonxxoo/status/2107793610230075416>. Post: a fairly complete
  *Starry Night* village, a weather system, and "the star-sky flow field I'd long wanted: real-time
  brushstrokes, and the size and position of the stars affect the flow paths nearby".
- Mark's downloads: `~/Downloads/videos/Simon Lee Van Gor/`. Local evidence (gitignored):
  `scratch/simon-lee-study-2026-10-11/`.

## What it is

A scene generator, not a single painting. A gallery of about 11 Van Gogh paintings. Each scene is
built from parametric generators (tree, church, moon, sky flow field) with seeds, sliders and a
painter's-palette menu for placing objects. Free orbit and pan with Blender-style keys, a weather
panel (rain, fog, wind), and a walk mode with a character that collects five objects and a letter
from Vincent. Arrival: a loading ring of brush dabs, then "The Starry Night / Saint-Rémy-de-Provence
1889.06" painted over the scene and fading as the camera pulls back.

## Measured

- **The sky strokes move.** Camera still, 28.5–31.0 s, central whorl crop at 4K: about 0.75 grey
  levels of change per frame, steady. Larger single-frame changes at 28.63, 29.00, 29.37 and 30.00 s,
  cause not identified. Over 1.9 s the strokes slide along the swirl and the pattern keeps its shape
  (`w_pair.png`). Static loading screen reads 0.1–0.5 per half-second for comparison (`diff.txt`).
- **There is no painting under the strokes.** The strokes are opaque, thick, lit as raised paint (his
  "paint relief" slider reads 0.44) and cover the sky with dark blue between them.
- **Composition, head-on** (`compare-t005.jpg`, painting left): the moon, the two central whorls and
  the luminous band follow the painting closely. His panel says the sky follows the original's stroke
  direction inside the frame and is driven by a list of swirls outside it. The departures are the
  star positions, a single cone cypress instead of the flame, separate outlined peaks instead of the
  rolling range, and a darker, larger town with many bright windows. A second cypress appears on the
  right in other views.

## The lesson worth testing

In June, dabs drifting along the flow were rejected because they read as "a separate moving overlay"
(`tasks/codex-motion-note-2026-06-22.md`). Those dabs moved over a 1:1 base copy of the painting
(`tasks/lessons.md:1128`, `:1147`). Simon's moving strokes do not read as an overlay, and his sky has
no base layer. So the June failure may have come from the base layer under the dabs, not from moving
strokes as such. This is a hypothesis. It is untested at our fidelity bar. It is not a plan to reopen
dabs.

## Mapped to make-it-alive A–C

- C (arrival): the title painted over the scene and fading as the camera pulls back is direct prior
  art. His "generation process" replay (the sky painting itself) is a second candidate.
- A (windows): his windows are many and bright. Ours must stay under the palette gate (ΔE 8.16 of 10).
- A (impasto): his relief lighting shows what "catches raking light" can look like.
- B (touch): his flow responds to star size and position. A tapped star that flares could also stir
  its own ring of strokes.

## Open question for Mark

Mark said this is the 3D exploration he first had in mind. Free roam, weather dials, other paintings
and a gallery are in CLAUDE.md's locked Out-of-scope list, and the bar requires motion and colour
derived from the scan. Only Mark can change those sections. Asked 2026-10-11: borrow narrow lessons
under the current bar, or reopen the direction?

**Answered the same day.** His intent was always The Starry Night itself as a 3D world seen from
different angles, not a generator or gallery. Keep the current bar and start A. Weather dials and
exploration are ideas to learn from, not queued (`tasks/todo.md`, "Direction confirmed").

Noted ideas, not queued (scope rule): rain and fog, fireflies, walk mode and collectibles, the
painter's-palette placement menu.

## The village, studied for a walkable street (2026-10-23)

Mark, 2026-10-23: the next slice is a portal from the village into one street built for walking, where the visitor
walks a path and touches the grass with a hand cursor. He asked what Simon's village can teach us. Read from 4K crops
of the 112 s video at 35 s and 100 s (`scratch/explore-2026-10-23/simon/`, gitignored). Study only: no code or asset
of his is used.

- **He never walks this village.** Sampled every 2 s, the video shows it only from above. His walk mode is in the
  Wheat Field scene, in daylight (the 82 s video, 1:04–1:12).
- **Houses are simple volumes with modelled detail.** A box and a pitched roof, with chimneys, shutters, door frames
  and eaves as geometry. Walls are pale lavender or grey-blue, roofs dark blue or warm ochre. One painterly texture of
  large brush patches covers every surface. It is generic, not taken from the painting.
- **Dark ink outlines** run along every house edge and along the crest of every hill. This does the most to make his
  village read as painted. The painting outlines its hills, roofs and the cypress's bands the same way. E4's read noted
  that our render has no dark contour strokes.
- **Trees.** The olives are a twisted trunk carrying round clumps of leaf-shaped cards: pale lit edges, dark centres.
  The poplars and cypresses are tall dark cones.
- **The ground** is thousands of small flake-shaped dabs at random angles, dark blue with a few lit flecks. They are
  not grass blades. Paths are paler, smoother strips.
- **Depth.** Blue fog lightens the far houses and hills. Warm window rectangles are few per house. Small lights run
  along the paths. A dense cluster at varied heights and angles hides the ground between the houses.

What transfers to the street: houses as modelled volumes, outlines on edges and crests, leaf-clump trees, fog to
close the end of the street, and lights along the path to lead the walk. What does not: his generic surface texture
(our strokes come from the painting's flow and colour), his many bright windows (the palette gate), and his separate
outlined peaks (the painting's range rolls).

## The village's layout, studied after slice 1's gate (2026-10-23, evening)

Mark judged slice 1's street "flat and dull", then "the house feels like a cardboard", and asked to study the layout of
Simon's village for a better design. The only source is the 112 s video (both posts' links resolve to the videos, no
live site). Frames every 2 s and full-resolution crops at 38, 46, 92, 100, 104, 108 and 110 s:
`scratch/simon-village-2026-10-23/` (gitignored). Study only.

- **The camera is always above the village**, on a hillside by the cypress, looking down about 25–40°. Roofs are the
  most-seen surface and catch the moon; walls are dark.
- **Houses are scattered over rolling ground**, each at its own angle, in loose clusters round the church. Meadow of
  dark flake strokes between them, with olives, cypress and poplar cones, bushes.
- **Paths are pale strips that wind and branch**, following the ground; the church sits where they meet.
- **Houses vary**: cottage to two storeys, roofs with thickness and overhang, dark blue or ochre-brown roofs, one to
  three warm windows, some shutters and chimneys.
- **Three layers of depth**: foreground cypress, olive and meadow (fireflies in it), the village, outlined hills fading
  into fog.

Why slice 1's street failed: it built the one view Simon never shows, eye level in a corridor between two straight
rows of same-facing boxes on flat ground, a view of walls in steep perspective, where flat cladding reads as card.
