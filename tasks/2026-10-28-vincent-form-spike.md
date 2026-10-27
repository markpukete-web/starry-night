# Vincent's form: the spike (2026-10-28, a throwaway, never merged)

## What this is

A test build of Vincent's form, for Mark's eye. It lives on its own branch, `spike/vincent-form`, off K3 at `db7904a`.
It is behind a flag, so the street without the flag is K3's own. It has no plan review, no code review, no unit
tests and no colour gate. If Mark likes it, a real slice follows with the full loop. Mark asked for it on 2026-10-28:
"build Vincent's form", after he called the figure "too 'Creepy'" on 2026-10-26.

Open the preview with one of these:

- `?street=1&vform=lantern`: the new form.
- `?street=1&vform=tarascon`: the new form in the shape of Van Gogh's "Painter on the Road to Tarascon" (1888).
- `?street=1`: today's figure, for comparison.
- Add `&walkMode=auto` on a desktop to see the automatic walk and its stops (the phone's default).
- Add `&vturn=120,30` to see the other turn angle (body, head, in degrees).

## The answer

Three changes do most of the work: legs that stride, a lantern he carries, and a stop where he turns side-on with
the lantern held out. The turned face is the weakest part. At the camera's distance it is a warm patch under the brim
and a beard, not a face with features. Every attempt at a plain face toward the camera read as a mask.

## Why he read as creepy

The Lead's read on 2026-10-26: a small dark figure held ahead of the camera, his back always turned, never pausing,
lit by nothing of his own. Fable's consult (`scratch/vincent-form-2026-10-28/consult-fable.md`) agreed with it and found
three more causes in the code:

1. He has no legs. The smock reaches the ground (`vincent.ts`, `SMOCK`'s first row at y 0.001). A figure that moves
   without stepping reads as a ghost. Fable named this the single biggest cause.
2. A scroll backward slid him backward while his walk played forward. `stepWalk` adds |Δt| to the distance, and the
   gait reads only the speed.
3. Only one arm moved. The other was pinned to the rolled canvas.

## What the spike changes

All of it is behind `vform`. Without it, `buildVincent` and the frame loop take S2's path unchanged.

| Part | What it does | Where |
| --- | --- | --- |
| Hem and legs | The smock ends at the calf (y 0.028). Two legs in pale trousers (the plaster's paint) and ink boots, each turning about its hip, ±0.35 rad against the arm. | `vincent.ts` `FORM`, `buildVincent` |
| Stride | Bob 0.003 (was 0.0015), roll 0.015 (was 0.03), a forward lean of 0.06 rad, the arm's swing 0.12 (was 0.25). No stride when walking backward or turned. | `streetWalk.ts` `FORM_WALK`, `formGait` |
| Lantern | Hangs from the left hand on a handle, plumb under the hand, lagging it by τ 0.15 s. The glass in the lamps' glow colour. | `vincent.ts`, `StreetWalk.tsx` |
| Lantern light | Painted, as the lamps are. A small halo. A pool on the ground ahead of him that flickers a little. A warm term in his own shader from the lantern's world position. Nothing else in the street reads it. | `vincent.ts` `lanternMoon`, `StreetWalk.tsx` |
| Stops | The automatic walk dwells 3 s at each station it reaches from below. A tap still stops and starts him. | `streetWalk.ts` `stepForm` |
| Turn | After 0.5 s without walking forward, in every mode, he turns: the body 90°, the head a further 45°, eased in over 0.6 s. He turns back before a dwell ends, so he faces the lane before the camera moves. At rest he raises the lantern arm 0.75 rad, so he holds it out ahead. | `streetWalk.ts` `stepForm`, `turnPose` |
| Head | Its own part about the neck, with a face, a nose and a beard that stands off the jaw. | `vincent.ts` |
| Reduced motion | He stands turned at once, with the lantern lit and no flicker. | `streetWalk.ts` `stepForm` |

The camera still reads only `t`, the walk's position on the path. A dwell holds `t`. Nothing moves the camera off
`walkPose(t)`.

## Tarascon

Van Gogh described the 1888 painting to Theo as "a quick sketch I made of myself laden with boxes, sticks, a canvas,
on the sunny Tarascon road". The painting burnt in 1945. Descriptions of the surviving photograph give a broad yellow
straw hat, a camp stool and easel strapped to his back, a rolled canvas, and a cane. The spike takes the forms only,
and every colour from our painting:

- the hat: the moon's body `[1376, 216, 1408, 248]`, the painting's own yellow, with S2's broad brim
- the easel: three ink sticks on his back
- the box: the village's warm dark `[920, 1160, 944, 1184]`
- the canvas: rolled, upright on his back
- the cane: in the right hand, because the lantern takes the left (the painting has it in the left)

It sits near the locked "other paintings" line in `CLAUDE.md`. Mark said yes to building it as a flag for comparison
on 2026-10-28. It is never the default.

## What the look passes found

Six passes on the turned pose at stop 2, each a 4× crop beside the last (`scratch/vincent-form-2026-10-28/p1/`):

1. Fable's face (the big swirl's pale ring, L 72) turned toward the camera read as a blank pale oval: a mask. Creepier
   than his back.
2. The beard ran to s 0.45 and left the face a 3 px band. The beard now stops at the mouth.
3. In profile the wide brim (0.017, 0.4 of his height) hid the face from the camera's height. The lantern form's brim
   is now 0.0125. Tarascon keeps the broad one.
4. The thatch, tried as an ochre face, is a dark mossy green and read as hair. The face is now the moon's yellow mixed
   0.35 toward the roofs' sienna.
5. The halo at Fable's 0.4 of a lamp's covered his whole torso once the lantern was raised, and washed the blue smock
   grey. It is now 0.18.
6. Raised 1.2 rad, the arm stood out level, a reach rather than a carry. It is now 0.75. Tarascon's rolled canvas,
   laid across his back, stuck out sideways like a pole once he turned. It now stands upright.

## The numbers

At stop 0 the lantern form adds 726 triangles and 11 draw calls (Tarascon 770 and 11): 1,434,035 on the desktop against
the 1,444,930 ceiling. The other stops were not counted. Fable's 0.5 s rest, 3 s dwell and 0.15 s lag are untuned.

## What the spike does not do

- The ground and the grass do not take the lantern's light. Only the pool sprite does. Fable's fix for a slice: one
  `uLantern` uniform in two shaders, the ground strokes and the grass.
- The turned face has no features. At 15 to 25 px a feature is one or two pixels.
- No unit tests, no colour gate, no perf sweep, no walk check. The tap was not checked by hand.
- The keys and the wheel cannot move him while a dwell runs under a forced `walkMode=auto` on a desktop.

## Mark's calls

1. Is he less creepy? Which form: lantern or Tarascon?
2. The turn: body 90° and head 45° (the default), or 120° and 30° (`&vturn=120,30`), which faces the camera more?
3. The stop: 3 s at each station under the automatic walk. Longer, shorter, or none?
4. Go on to a slice? It would need the full loop, the lantern on the ground and the grass, and tests.

## Evidence

All in `scratch/vincent-form-2026-10-28/` (ignored by git):

- `consult-fable.md`: the Consultant's read
- `p1/`: the six look passes
- `p8/`: every station, both viewports, classic, lantern and Tarascon side by side (`s<N>-<vp>-row.png`)
- `motion/`: the stride (`gait-strip.png`, classic above, lantern below), the dwell at stop 1 (`dwell-strip.png`),
  a scroll backward (`back-strip.png`), and reduced motion on the phone (`reduced-phone-sheet.png`)
