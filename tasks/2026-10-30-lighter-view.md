# The lighter view, 2026-10-30

Mark asked: "for weak GPU is there a way that we warn the user, if there is a way for us to provide fallbacks if users
GPU is weak then reduce quality?". The Lead proposed a shape, and Mark answered "Yes go with your recommendations", then
"Take the lead once done push and merge to main then tidy our branch". The performance review's finding 1
(`tasks/2026-10-30-perf-review.md`) is the reason: nothing lowered the pixel ratio for a GPU that cannot hold the bar.

## What it does

Once the diorama has settled, a frame rate that stays under the bar offers a lighter view in a card above the dock.
The visitor chooses. Nothing changes unasked.

- **Settled** means 8 seconds after the cypress and the land report ready, and after the opening (`LIGHTER.settleMs`
  in `src/scene/lighterView.ts`). A scene's start-up dip ran past 10 seconds on Mark's iPhone the same evening. Read
  early, it would have flagged every phone.
- **Under the bar** means 8 of 10 quarter-second windows under 50 fps on a computer, or under 30 on a phone (the
  locked bar is 60 and 30). drei's `PerformanceMonitor` counts the windows (drei is an approved dependency).
  `SlowWatch` in `DioramaExperience.tsx` mounts it only once the diorama has settled, and only in the diorama.
- **The lighter view** is a pixel-ratio cap of 1 in place of 1.5. It draws 44% of the pixels. In the review's probe the
  diorama took 7.6 ms at 1 against 12.4 ms at 1.5 on this Mac. The painted-light sky would be about 4 times cheaper,
  but it changes the moving strokes, so it was not used.
- **The card:** "The painting is running slowly on this device. The lighter view moves more smoothly and looks a
  little softer." The two answers are "Use the lighter view" and "Keep full detail". It takes no focus, since the
  visitor did not ask. Its status role reads it out. The answer holds for the page's life, and a reload starts again.
- `?slow=1` shows the card at once, so it can be seen and captured.

## The checks

The production build, headless Chrome, scripts in `scratch/lighter-view/` (git-ignored).

| Case | Result |
|---|---|
| This Mac's GPU, 30 s, no switch | 60 fps, no card |
| Software rendering (SwiftShader), 2 to 9 fps | ready at 5 s, card at 28 s, never before the settle |
| `?slow=1`, desktop 1600 × 900 at 2 | card at once. "Use the lighter view" took the buffer from 2400 × 1350 to 1600 × 900 and closed the card |
| `?slow=1`, phone 390 × 844 at 3 | the same, 585 × 1266 to 390 × 844 |
| The switch against a fresh load at 1, sky clock pinned | byte-identical frames |

No shader reads the screen's pixel ratio, so a switch while the scene runs draws what a fresh load draws. Looked at:
the card on desktop and on the phone viewport (`card-desktop.png`, `card-phone.png`), and a 1:1 crop of the village
at 1.5 and at 1 (`crop-full.png`, `crop-lighter-up.png`). The lighter crop is a little softer at the spire's edges and
in the hill's strokes, as the card says.

## Not done

The street is not watched (Mark, 2026-10-30: "Leave the phone street for now"). A lighter view chosen in the diorama
holds in the street too, since the cap is the canvas's.
