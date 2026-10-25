# The opening as the loading screen: the record, 2026-10-25

Mark asked whether the site counts as a heavy WebGL site, and whether a loading card, or the opening's painting and
letter, should say that the site is loading. Mark then said: "go with your recommendation on the loading screen". The
recommendation was no separate card. The opening's painting and Vincent's line become the loading screen. The plan is
`tasks/2026-10-25-loading-curtain-plan.md`. The branch is `feat/loading-curtain`, stacked on `fix/finger-no-bend`. The
evidence is in `/Users/markma/Projects/starry-night/scratch/loading-2026-10-25/`.

## What a first visit fetches

About 9.6 MB, then the sky's 25,600 strokes are built. The largest files are `painting-filled.webp` (2.5 MB),
`signed-flow-filled.png` (1.7 MB), the bundle (1.4 MB, 384 kB compressed) and `painting.jpg` (1.1 MB).

## What changed

- `#boot` in `index.html` is a copy of the opening's first frame: the dark ground, the painting, Vincent's line, its
  citation and the cue "Painting the night sky…". The browser paints it before the code arrives.
- React's layer renders underneath. The driver drops `#boot` on the first frame that is not waiting.
- The hold counts from the painting, capped so 1.5 s of it is left after the scene is ready.
- A tap no longer ends the wait. It speeds up the opening once the scene is ready.
- The curtain's painting fades in whole (`28269b9`). On slow 4G it drew in strips from the top before.

## Before and after (production build, the Mac, headless Chrome, medians of three runs, seconds)

| Network, viewport | First paint | Opening done |
| --- | --- | --- |
| None, desktop | 0.12 → 0.04 | 6.91 → 5.71 |
| None, phone | 0.12 → 0.04 | 6.91 → 5.71 |
| Fast 4G (9 Mbps), phone | 1.26 → 0.17 | 15.17 → 12.62 |
| Slow 4G (1.6 Mbps), phone | 6.31 → 0.41 | 26.91 → 26.26 |

Before, the first paint was a blank dark-blue page. After, it is Vincent's line and the cue. On fast 4G the painting
fades in at 3.3 s and the scene is ready at about 9.6 s. On slow 4G the painting arrives at 20.7 s and the opening
times out at 15 s after React's first commit (21.5 s). It then opens onto an empty dark scene, as the base did. That
is open for Mark: `readyTimeout` (15 s) and whether slow 4G is a target.

## The Consultant's correctness read: REVISE, six findings

The dispositions are in the plan's "Revision 1" (`d6d82ad`). Five fixed, one declined, one declined in part.

- **P1, the painting at high priority: not closed, and undone.** The re-timing matched the earlier run to within a
  few milliseconds. The rig is HTTP/1.1 under a shared throttle, so a priority cannot show there. Its effect in
  production is unmeasured either way, so the base's low preload is back.
- **P2, a failed page kept the curtain: closed by a failure signal, not a clock.** With no WebGL, React's tree stays
  mounted, and a throw in the first render never commits, so a timer armed by the keep could not cover either. The
  curtain's script marks the page `arrival-failed` on an uncaught error, a failed load or an unhandled rejection, and
  a style rule hides both copies of the cue. React's copy also starts hidden until the driver's first frame
  (`01ff0a9`). Checked in the browser: no WebGL, marked by 3 s. The bundle a 404, marked. Normal openings on desktop
  and phone, never marked.

The Consultant's closing read (`fix-read-consultant.md`) said REVISE on P1. The plan's "Revision 2" records it.

## The Lead's gate

At `01ff0a9` and the closing read's commit, against the dev server on port 5203:

- `npm run test:sky`: 362 of 362 at `dc509a4`. `scripts/arrival.test.ts`: 13 of 13 at `01ff0a9`.
- `tsc -b` and `eslint .`: exit 0.
- `check-reduced-motion.mjs`: PASS. `check-portal.mjs`: ALL PASS, cases 1 to 12. Both ran at `dc509a4`. `01ff0a9`
  changes one style rule under `.arrival`, and both checks open with `arrival=0`, which never renders that layer.
- Mutations: the credit counted with `maxDt` fails A11, and the curtain's script without its reduced-motion test
  fails A13.
- The curtain's script in a real browser, the bundle blocked: kept on a first plain visit and on `?arrival=1` after
  a visit, removed on `?street=1`, `?arrival=0`, a repeat visit, reduced motion and `?mode=relief`.
- The frames (`sheet-r2-fast4g.png`, `sheet-r2-slow4g.png`, `sheet-fade-slow4g.png`): looked at. Fast 4G reads as
  intended. Slow 4G shows the words alone for 20 s, then the painting, then the dissolve onto an empty scene.

## Mark's look

On his phone, the branch's dev server on port 5203, 2026-10-25 at 10:38 pm: "it works well in terms with landing".
Slow 4G is out of scope ("Treat slow 4G out of scope"), so `readyTimeout` stays 15 s. He also said "The island is not
well positioned for phone". That is the portrait home camera, candidate C, his pick of 2026-07-28 (`1f6b21e`). It was
measured from 360 × 800 to 430 × 932, and his Safari viewport is about 440 × 820. It goes to the todo as its own
slice, not this branch.
