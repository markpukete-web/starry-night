# The phone framing: the record, 2026-10-25

Mark on his phone, after the loading curtain passed: "The island is not well positioned for phone". He chose "Phone
framing first, then the village craft", then "take the lead, get it fix". The branch is `feat/phone-framing`, stacked
on `feat/loading-curtain`. The evidence is in `/Users/markma/Projects/starry-night/scratch/phone-framing-2026-10-25/`.

## The cause

The portrait home is candidate C, Mark's pick of 2026-07-28 (`1f6b21e`): the whole composition, letterboxed, at a
vertical fov of 88. It was measured from 360 × 800 to 430 × 932, aspects 0.45 to 0.46. Mark's screenshot is an in-app
browser with a bar at the top and a toolbar at the bottom, so his page is about 440 × 735, aspect 0.60. A fixed
vertical fov shows the same height of world at any width, so at 0.60 the composition is drawn at about three quarters
of the width it was chosen at. The island sits small in the middle, with spare sides and a dark lower third. The live
site at 440 × 735 matches his screenshot (`prod-440x735.png`), so the branch did not cause it.

July's lessons ruled out the other levers. Raising the target lifts the camera with it and turns the village into a
plan view, and `maxPolarAngle` allows only 2.8° of tilt. Fov and distance are the real levers.

## The fix

`portraitFov(aspect)` in `src/scene/dioramaContract.ts` holds the horizontal field of 360 × 800 from aspect 0.45 up to
0.65 (`PORTRAIT_FIT`), and the vertical fov narrows to keep it. Narrower than 0.45, 88 as before. Wider than 0.65 (a
tablet), the lens at 0.65, so the island's keel stays in frame. At 440 × 735 the lens is 72.0°. At 390 × 844, 86.5°.

The lens is set by a layout effect on the diorama only. The camera element keeps 88, as before. The street's walk
writes its own lens only when the orientation flips (`StreetWalk.tsx:416`), so a lens driven by the camera element's
prop would have reached the street's camera on a resize that keeps the orientation, such as Safari's bars going away.

## What it looks like

`sheet-phones.png` (the live site, then the branch, at 440 × 735, 440 × 800 and 360 × 800) and `sheet-tablets.png`
(768 × 1024 and 820 × 1180). At Mark's size the composition fills the width as it does at 360 × 800. The unpainted
band under the title is gone. The cone's tip sits behind the dock. At 360 × 800 nothing changes. The cypress's left
edge and the moon's right halo sit where they do at 360 × 800 (`sheet-edges.png`), as the held horizontal field
makes them by construction. On the tablets the composition fills the width with the keel above the dock.

## The gate

On the framing branch, against its dev server on port 5204:

- `npm run test:sky`: 363 of 363, none skipped (the derived reference files copied into the worktree first: without
  `reference/derived/_work-painting.png` 16 skip).
- `tsc -b` and `eslint .`: exit 0.
- `check-viewport-camera.mjs`: PASS, with a new case, `bars-collapse` (440 × 735 → 440 × 956), which must reach a fresh
  load's framing at the taller size.
- `check-portal.mjs`: ALL PASS. Case 10 (a rotation in the street to 900 × 1600) now expects that aspect's fitted lens,
  `portraitFov(0.5625)` = 75.4°, not 88: it failed on the old expectation with the app returning 75.4°, which is the
  rule's value.
- `check-reduced-motion.mjs`: PASS.
- Mutations: the tablet cap removed fails the lens test, and `aspect < referenceAspect` in place of the NaN-safe guard
  fails it.

Then Mark's look on his phone.
