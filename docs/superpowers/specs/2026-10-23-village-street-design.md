# The village street: walk into the painting — design, 2026-10-23

Status: design, written by the Lead (Claude) from a conversation with Mark on 2026-10-23. Read by a fresh builder
(nine questions) and by the consultant (Fable, `scratch/explore-2026-10-23/consultant-design-report.md`: REVISE,
findings C1–C19, every one checked against the code and folded below). The consultant's confirmation read
(`consultant-confirm-report.md`) closed C2–C19 and left C1 open on one clause: the sky's growth along the walk. That
clause is added as the consultant proposed it and has not had a further read. Approved by Mark, 2026-10-23
("Approved, write the plan for slice 1"). Nothing is built.

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
   the village can be entered. On every device, a small control in the chrome also enters it.
2. A click flies the camera down toward the rooftops near the church. The dissolve starts no closer to the houses
   than the camera of capture `v2` (`scratch/explore-2026-10-23/village/`, at 0.9, 0.35, 1.5), the last distance
   at which today's walls still read as paint (C11). The dissolve's layer shows the flight's last frame and fades it
   over the street (C9).
3. Vincent stands on the path, small, seen from behind: straw hat, blue smock, a rolled canvas under his arm. The
   camera is behind him. The path leads up the street to the church, with the steeple ahead and the painting's sky
   above the roofs.
4. On a computer, the scroll wheel or the arrow keys walk Vincent forward or back along the path. The mouse is the
   hand. On a phone, Vincent walks the path by himself at a slow pace, a tap on him stops or starts him, and one
   finger is the hand.
5. Grass stands beside the path, painted in short Van Gogh strokes in the painting's night colours. The hand moves
   through it. The blades bend away from the hand and spring back.
6. The path ends at the church. A way back (a control on screen, and Escape) returns the visitor to the diorama
   through the same layer, at the orbit pose the visitor left from (C16).

Mark agreed to this whole sequence on 2026-10-23 ("That's exactly what I was imagine", "Vincent from behind sounds
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

The order when the two differ (C14): the scan and `palette.json` come first, because the bar is locked. Simon's
village answers only what the scan cannot show at walking distance: volumes, outlines, fog. Where the scan does show a
form, the scan's form wins. The painting's village trees are dark round masses and its fields are long strokes, so
the street's trees and ground start from those, not from his leaf cards and flake dabs.

What the study says to take: houses as modelled volumes (a box, a pitched roof, chimneys, shutters, door frames),
dark ink outlines along house edges and along crests, blue fog that lightens what is far away, and few warm windows.
What it says not to take: his one generic paint texture on every surface, his many bright windows, and his separate
outlined peaks.

## Constraints

- **The bar** (`CLAUDE.md`, locked). The painting shows the village only from far away, so the street is invented.
  The bar's rule for invented parts applies: they "continue that same derived style". Surfaces are painted in
  strokes, as the diorama's are, not in a generic texture.
- **Stroke scale and direction** (C3). A stroke's width and length on a wall, a roof and the ground are set as a
  fraction of the object, measured from the scan's village at 1:1, never in screen pixels. Their direction follows
  the object's edges and the derived flow field over the village's rectangle, as E2's ground follows the band's field.
  The record is clear on why: at 8–14 px lanes the cypress read as fur (`tasks/lessons.md`, E1), and stroke width in
  scan pixels is not stroke width on screen (E2).
- **The palette gate** (C5). Every surface is measured against a region of `public/reference/palette.json`, within
  the palette tolerance in Tunables: walls and roofs against `village`, windows and lamps against `villageWarm`,
  trees against `cypress`, the far slopes, the grass and the path against `hills`, the fog against the `sky`
  region's horizon colours, Vincent's smock against `village`'s blues and his hat against `villageWarm`. Slice 1's
  plan defines the masks.
- **The camera criterion** (`CLAUDE.md` acceptance criteria, locked). Mark, 2026-10-23, asked whether the camera may
  leave the orbit limits along an authored path: "Lift it for the path." The criterion's text is Mark's to edit. The
  Lead proposes the wording in `tasks/todo.md`. Mark's edit lands before `?street=1` reaches `main`. Until then the
  street lives on a branch (C17). Free-fly and panning stay out of scope.
- **Performance** (locked): 60 fps desktop, 30 fps mid-tier mobile, the devicePixelRatio caps in Tunables.
- **Reduced motion** (locked: "a dignified still state — the painting, well lit, no churn"). Under
  `prefers-reduced-motion` the portal cuts instead of flying. Vincent never walks by himself. On a computer the scroll
  wheel and the arrow keys still walk him. On a phone a tap on Vincent takes him to the next stop on the path (C6).
  The grass bends under the hand without the swing. The street's sky is the painted-light still, as the diorama's is
  (`src/scene/PaintingFlowSky3D.tsx:873`), and two frames apart in time stay byte-identical, as
  `scripts/check-reduced-motion.mjs` requires.
- **The home page does not grow.** The street's code and assets load on the first hover over the village or the
  first press of the control, not with the page. The dissolve's layer holds until the street reports ready, with a
  15 s timeout as the arrival's (`src/scene/arrival.ts:44`). On a timeout the layer lifts back onto the diorama, the
  hint stays, and nothing half-loaded shows (C10).
- **The diorama does not change.** Its gates stay passed. A capture with no pointer is byte-identical to a capture
  taken before the work (`scripts/compare-frames.mjs`). The hint is DOM and adds no mesh to the scene.

## The sky in the street

The constraint: the sky the visitor sees in the street is the painting's sky, with its strokes moving (still under
reduced motion), and no empty band, invented back or gradient is ever on screen. Two facts in the code bound how.

- **Its size and place** (C1). The sky is a dome of radius 6 (`src/scene/skyMapping.ts:4`), centred on the world
  origin (the sky group has no position, `PaintingFlowSky3D.tsx:1227`). Its ribbons test depth, so anything farther
  than 6 units from the origin is painted over. The street is therefore built either at the diorama's scale inside the
  dome, every object within 6 units of the origin and the camera about as far from the centre as the home camera, or
  with the sky group moved with the street's camera and scaled so the whole street, the far church included, lies
  inside it. Either way the camera's near plane (0.08 today, `src/scene/dioramaContract.ts:45`) is set from the
  street's scale, so the ground near Vincent never clips. In the first way, the walk toward the church also moves the
  camera toward the painted arc, so the sky grows on screen as Vincent walks
  (`scratch/explore-2026-10-23/dive-sheet.png` shows the growth). The sky's allowed growth then bounds the path's
  length, judged from a capture at the path's start beside one at its end. In the second way the sky does not grow
  (consultant's confirmation read, C1).
- **Its turn** (C2). Under today's lock the sky turns with the camera (`PaintingFlowSky3D.tsx:1145`), so it is fixed
  on screen. Tilting the camera up at the steeple moves the roofs down and leaves the painted band where it was. The
  strokes fade out from v 0.76 of the painting (`src/scene/dioramaSkyProjection.ts:28`), and below them is the
  gradient sphere, drawn with no depth test (`PaintingFlowSky3D.tsx:895–899`). So under the lock the camera never
  tilts, and the roofline, the fog or the ground covers the screen below the painted band at every point of the path.
  With the painting's front arc fixed in the world instead, the path's heading stays within the arc's ±71° across and
  its tilt within +52°. The touch hook's sky mapping (`src/scene/useTouchInput.ts:95–106`) then needs re-keying,
  because it assumes the lock. Slice 1 chooses between the two with captures of each at the path's start and end.
- **Portrait** (C15). In portrait the diorama keys the sky to its portrait home, with a field of view of 88 and an
  unpainted band at the top (`dioramaContract.ts:48–65`). The street's plan names its camera's field of view in
  landscape and in portrait, and which `home` the sky takes in each.
- **Touch and pause** (C19). B's surges stay on for the sky above the roofs, so the sky behaves as it does on the
  diorama. The pause control stops the sky, Vincent's automatic walk and the grass's swing together.

## The Lead's calls, for Mark to read

These are the Lead's, not Mark's words:

- The flight down toward the church, the steeple as the end of the path, and fog closing the far end. Mark heard
  these as guesses and agreed to the sequence.
- The hand cursor is a hand icon, not a pointer.
- The grass also parts around Vincent's feet as he walks, as Simon's wheat does around his figure.
- Small warm lights along the path, as in Simon's village, if they pass the palette gate. Otherwise none.
- **One canvas.** The street is a second scene inside the diorama's `Canvas` (`src/scene/DioramaExperience.tsx:364`),
  mounted in `Scene` beside the sky, never a second canvas, so a phone never holds two WebGL contexts (C4). The
  canvas keeps its drawing buffer, so the layer can take the flight's last frame.
- **The sky.** The street reuses the diorama's sky instance, kept mounted, never a second build. The diorama's island,
  cypress and village stop rendering while the street shows.
- **The layout.** The street follows the painting's layout: the church ahead, the hills behind. The church's and the
  houses' proportions come from the diorama's authored knot (`src/scene/villageGeometry.ts:8–11`, the church at
  `:237`), scaled. The stroke cladding is new (C18).
- **The budget** (C12). Slice 1 starts by measuring today's diorama: its frame time on desktop and on Mark's phone
  (`?perf=1`). The only phone reading on record predates E1 to E4 (`tasks/todo.md:470`). The street's triangle
  budget is the headroom under 60 fps and 30 fps from that measurement.
- **Strokes.** A new stroke generator for the houses is allowed: it is new code, not a dependency. It reuses the
  existing tracer and ribbon code where they fit. Everything in the street is built in code: the houses, the church,
  the trees and Vincent. No Blender (Mark, 2026-10-23: "keep it in code"). Any new npm package is a dependency
  question for Mark.
- **The hand** (C8). The hand acts on the grass under the pointer. Unlike D1, the hand's world point is re-cast every
  frame the camera moves, not only when the pointer moves, so it stays under a still mouse or a resting finger while
  Vincent walks. On a phone, a tap inside Vincent's silhouette stops or starts him, and a touch anywhere else is the
  hand.
- **The portal's pointer** (C7). The portal has its own pointer listener, on once the arrival ends, whatever `touch`,
  `alive` and reduced motion are. The touch hook is off in some of those states (`DioramaExperience.tsx:246`). A
  hover over the village surges the sky as it does today. A tap on the village's houses enters and no longer surges
  the sky behind them (today it does, `useTouchInput.ts:219–222`). A tap on the trees and bushes stays D1's bend. A
  seam test pins both.
- **Behind a flag first.** The street ships behind `?street=1` until Mark's gate, then becomes the default with
  `?street=0` to turn it off, as A, B and C did.
- **Vincent** is an invented part and follows the bar's rule for invented parts. His colours are gated as above.
- **The way back** saves the orbit pose at the click and restores it, through the same layer (C16). drei's controls
  do not update while they are off, so nothing else would restore it.

## Slices and gates

Each slice runs the project's loop: plan file, review, build, captures, the Lead's gate, then Mark's taste gate on
captures. The Lead's estimate is 8 to 10 sessions in total (C13). E1 alone, one object with a measured plan, took a
full day with four retunes and a review, and slice 1 holds five new mechanisms.

1. **The street's look** (4 to 5 sessions, the hardest). First the baseline reading (the budget, above). Then a flat
   panel: one wall, one roof, one tree and the ground drawn flat beside the painting's village crop at matched
   scale, before any house stands in 3D (C3, as E2's flat gates did). Then the street as its own scene behind a
   development URL: the houses, the church and steeple, the trees, the ground, the path, the fog and the sky above
   the roofs, seen from fixed points along the path, with the sky's method chosen (above). Mark's gate compares
   captures against the painting first, and Simon's village crops where the painting is silent. **This gate is
   where Mark decides whether slices 2 to 4 are built.**
2. **Vincent and the walk** (1 to 2 sessions). The figure, the path, the scroll and arrow keys, the phone's automatic
   walk and its tap, the reduced-motion steps, the camera behind him.
3. **The grass and the hand** (1 to 2 sessions). The blades beside the path, the hand cursor, the bend and the
   spring-back (D1's model in `src/scene/landTouch.ts`: a push that rises, then a damped swing back to zero), the
   hand re-cast as the camera moves, the finger on a phone.
4. **The portal** (1 to 2 sessions). The control and the hover hint, the portal's own pointer listener, the flight
   down bounded by `v2`, the layer with the flight's last frame, the lazy load and its timeout, the way back to the
   saved pose, reduced motion. The diorama's frames compared against the capture from before the work.

The first slice comes first because the look decides whether the rest is worth building. If the street does not read
as Van Gogh's village at walking distance, the walk and the grass cannot rescue it.

## Left to the builder

- How many houses, their layout and the street's exact shape, within "one street to the church".
- How surfaces are clad in strokes and how the outlines are drawn, within the stroke-scale rule.
- Vincent's construction and his walking movement, within "a few simple shapes, seen small and from behind".
- The grass blades' count, shape and distribution, within the budget.
- The camera's distance and height behind Vincent, the walk's speed, the phone's pace and the reduced-motion stops.
- The fog's colour and distance, within the palette gate.
- The look of the portal control, the hint and the way-back control, within the diorama's existing chrome.
- The sky's method and the street's scale, within the constraints above.
