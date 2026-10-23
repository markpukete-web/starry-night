# The village street: walk into the painting — design, 2026-10-23

Status: design, written by the Lead (Claude) from a conversation with Mark on 2026-10-23. Not approved yet. Nothing
is built.

## Intent

Mark, 2026-10-20: "when I look into the painting I also imagine what it would look like inside the paints." On
2026-10-23 he described the shape: a path with the camera behind a figure, and a hand in the grass like Jeroen van
Welsenes' "touch grass" clip (`~/Downloads/videos/grass/`). The visitor leaves the painting through the village,
walks one street of it behind Vincent, and touches the grass by the path with a gentle hand.

The diorama stays exactly as it is. The street is a separate place reached through a portal. Mark chose this on
2026-10-23 after the Lead showed that rebuilding the village in place would change the home view he has already
passed. Close-up captures showed that today's village cannot carry a walk: its walls are the painting's pixels
stretched over boxes (`scratch/explore-2026-10-23/simon-vs-ours.png`).

## What the visitor does

1. On the diorama, after the arrival, the visitor hovers over the village. The cursor becomes a hand and shows that
   the village can be entered.
2. A click flies the camera down toward the rooftops near the church. Near the bottom, a dissolve takes the visitor
   into the street.
3. Vincent stands on the path, small, seen from behind: straw hat, blue smock, a rolled canvas under his arm. The
   camera is behind him. The path leads up the street to the church, with the steeple ahead and the painting's sky
   above the roofs.
4. On a computer, the scroll wheel or the arrow keys walk Vincent forward or back along the path. The mouse is the
   hand. On a phone, Vincent walks the path by himself at a slow pace, a tap on him stops or starts him, and one
   finger is the hand.
5. Grass stands beside the path, painted in short Van Gogh strokes in the painting's night colours. The hand moves
   through it. The blades bend away from the hand and spring back.
6. The path ends at the church. A way back (a control on screen, and Escape) returns the visitor to the diorama as
   it was.

Mark confirmed this whole sequence on 2026-10-23 ("That's exactly what I was imagine", "Vincent from behind sounds
right", "that's how I picture it").

## Goals

- The street reads as Van Gogh's village at night, at walking distance.
- The walk is calm and easy: one direction to move in, nothing to learn.
- The grass answers the hand: it bends away under the hand and springs back after it.
- The diorama's home view, its gates and its performance do not change.

## Non-goals (first version)

- No free roaming. Vincent stays on one path. The camera follows him and never flies freely.
- No other streets, no interiors, no second portal.
- No collectibles, weather, fireflies or day-night presets.
- No sound.

## The reference for the look

Mark, 2026-10-23: "if in doubt, just review Simon's village." Simon Lee's Starry Night village is the reference for
the look whenever a choice is in doubt. It is studied, never copied: no code, model, texture or other asset of his is
used (`CLAUDE.md`, "study, never copy implementation or assets"). The study is
`tasks/2026-10-11-simon-lee-study.md`, section "The village, studied for a walkable street". Its 4K crops are in
`scratch/explore-2026-10-23/simon/`.

What the study says to take: houses as modelled volumes (a box, a pitched roof, chimneys, shutters, door frames),
dark ink outlines along house edges and along crests, olive trees as a twisted trunk carrying round leaf clumps, tall
dark cypresses and poplars, blue fog that lightens what is far away, and few warm windows. What it says not to take:
his one generic paint texture on every surface, his many bright windows, and his separate outlined peaks.

## Constraints

- **The bar** (`CLAUDE.md`, locked). The painting shows the village only from far away, so the street is invented.
  The bar's rule for invented parts applies: they "continue that same derived style". Colours come from
  `public/reference/palette.json` (the `village`, `villageWarm`, `hills` and `cypress` regions) and the scan, within
  the palette tolerance in Tunables. Surfaces are painted in strokes, as the diorama's are, not in a generic texture.
- **The orbit limits** (`CLAUDE.md` acceptance criteria, locked). Mark, 2026-10-23, asked whether the camera may
  leave the orbit limits along an authored path: "Lift it for the path." The criterion's text is Mark's to edit.
  The Lead proposes the wording in `tasks/todo.md`. Free-fly and panning stay out of scope.
- **Performance** (locked): 60 fps desktop, 30 fps mid-tier mobile, the devicePixelRatio caps in Tunables. Only one
  of the two scenes renders at a time.
- **Reduced motion** (locked: "a dignified still state"). The Lead's call: under `prefers-reduced-motion` the portal
  cuts instead of flying, Vincent does not walk by himself, the walk moves only on the visitor's input, and the grass
  bends under the hand without the swing.
- **The home page does not grow.** The Lead's call: the street's code and assets load on the first hover or click
  over the village, not with the page.
- **The diorama does not change.** Its gates stay passed. The capture and guard scripts keep producing the same
  frames (`scripts/compare-frames.mjs` against a capture taken before the work: identical outside the portal hint).

## The sky in the street

The diorama's sky turns with the camera (`src/scene/PaintingFlowSky3D.tsx:1145`). Its back is empty, because the
painting cannot supply it. In the street, the path faces into the painting, so the visitor looks toward the part of
the sky the painting shows. The constraint: the sky the visitor sees in the street is the painting's sky, with the
strokes still moving, and no empty or invented back is ever on screen. How the street's sky meets that (the same
camera-locked sky, or the front arc fixed in the world with the camera's turn held inside it) is left to the plan,
with a capture of each.

## The Lead's calls, for Mark to read

These are the Lead's, not Mark's words:

- The flight down toward the church, the steeple as the end of the path, and fog closing the far end. Mark heard
  these as guesses and confirmed the sequence.
- The hand cursor is a hand icon, not a pointer.
- The grass also parts around Vincent's feet as he walks, as Simon's wheat does around his figure.
- Small warm lights along the path, as in Simon's village, if they pass the palette gate. Otherwise none.
- Reduced motion and loading, as written under Constraints.

Settled after the builder read (a fresh reader's nine questions, 2026-10-23), also the Lead's calls:

- **One canvas.** The street is a second scene inside the existing R3F `Canvas` (`src/App.tsx:129`), never a second
  canvas, so a phone never holds two WebGL contexts. The dissolve is a DOM layer over the canvas, as the arrival's is
  (`src/scene/DioramaExperience.tsx:392`): it covers the canvas, the scenes swap under it, and it uncovers the street.
- **The sky.** The street reuses the diorama's sky instance, kept mounted, never a second build. The diorama's island,
  cypress and village stop rendering while the street shows.
- **Its own space.** The street sits in its own coordinates at walking scale, not inside the diorama's world. The
  dissolve hides the change of scale. Its layout follows the painting's (the church ahead, the hills behind), not
  `villageStations.ts`.
- **The budget.** Slice 1 measures the frame time with the sky and the street together, on desktop and in the
  phone's emulated viewport, and sets the street's triangle budget from that measurement. The locked frame rates are
  the gate. Mark's phone reading (`?perf=1`) decides.
- **The palette gate.** The street's captures are measured against `palette.json`'s regions (walls and roofs
  against `village`, windows against `villageWarm`, trees against `cypress`, the far slopes against `hills`), with
  the same ΔE tolerance. Slice 1's plan defines the masks.
- **Strokes.** A new stroke generator for the houses is allowed: it is new code, not a dependency. It reuses the
  existing tracer and ribbon code where they fit. The houses and the church are built in code. A modelling tool or
  any new npm package is a dependency question for Mark.
- **The hand and the walk.** The hand acts on the grass under the pointer. On a phone, a tap inside Vincent's
  silhouette stops or starts him, and a touch anywhere else is the hand.
- **The portal on every device, behind a flag first.** A small control in the existing chrome enters the village on
  every device, because a phone has no hover. On a computer, hovering over the village also shows the hand and a soft
  hint. The street ships behind `?street=1` until Mark's gate, then becomes the default with `?street=0` to turn it
  off, as A, B and C did. A tap on the village's houses enters. A tap on the trees and bushes stays D1's bend.
- **Vincent's colours** come from the palette's existing regions (the smock from the blues, the hat from
  `villageWarm`). He is an invented part and follows the bar's rule for invented parts.
- **The diorama's frames.** The hover test runs on pointer moves only, as a ray test against the village's bounds,
  and adds no mesh to the scene. The hint is DOM. A capture with no pointer is byte-identical to the capture from
  before the work.

## Slices and gates

Each slice runs the project's loop: plan file, review, build, captures, the Lead's gate, then Mark's taste gate on
captures. The Lead's estimate is 5 to 6 sessions in total.

1. **The street's look** (2 to 3 sessions, the hardest). The street as its own scene behind a development URL: the
   houses, the church and steeple, the trees, the ground, the path, the fog and the sky above the roofs, seen from
   fixed points along the path. Mark's gate compares captures against Simon's village crops and the painting.
2. **Vincent and the walk** (1 session). The figure, the path, the scroll and arrow keys, the phone's automatic walk
   and its tap, the camera behind him.
3. **The grass and the hand** (1 session). The blades beside the path, the hand cursor, the bend and the spring-back
   (D1's model in `src/scene/landTouch.ts`: a push that rises, then a damped swing back to zero), the finger on a
   phone.
4. **The portal** (1 session). The hover hint over the village, the flight down, the dissolve (the arrival's, in
   `src/scene/arrival.ts`), the way back, reduced motion, the lazy load. The diorama's frames compared against the
   capture from before the work.

The first slice comes first because the look decides whether the rest is worth building. If the street does not read
as Van Gogh's village at walking distance, the walk and the grass cannot rescue it.

## Left to the builder

- How many houses, their layout and the street's exact shape, within "one street to the church".
- How surfaces are clad in strokes, and how the outlines are drawn.
- Vincent's construction and his walking movement, within "a few simple shapes, seen small and from behind".
- The grass blades' count, shape and distribution, within the frame-rate limits.
- The camera's distance and height behind Vincent, the walk's speed and the phone's pace.
- The fog's colour and distance, from the palette.
- The look of the portal hint and the way-back control, within the diorama's existing chrome.
- The sky's method in the street, within the constraint above.
