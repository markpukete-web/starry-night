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

- **P1, the painting at high priority: fixed, its effect not measured.** The re-timing at `dc509a4` matches the
  earlier run to within a few milliseconds: the painting still finishes at 20.7 s on slow 4G. The preview server is
  HTTP/1.1, and Chrome's network emulation divides the throughput evenly between open requests. So a priority cannot
  show an effect there once the scene's own downloads start at 6.3 s. Production serves HTTP/2, where the server can
  act on the priority. That is not measured.
- **P2, a failed page kept the curtain: fixed at the gate.** `d6d82ad` drops `#boot` after `readyTimeout + 5` s. The
  gate's browser check with WebGL turned off found the fix incomplete: R3F's context error leaves React's tree
  mounted, so React's copy of the layer read "Painting the night sky…" for ever. `01ff0a9` starts React's cue at
  opacity 0, and the driver writes 1 on each waiting frame. Checked in the browser: 1.00 while `#boot` stands, then
  0.80 to 0 over 0.5 s on a normal opening. With no WebGL, 0 at 22 s, the painting and the line left as on the base.

## The Lead's gate

At `01ff0a9`, against the dev server on port 5203:

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

CONSULTANT

## Mark's look

On his phone, the branch's dev server on port 5203, 2026-10-25 at 10:38 pm: "it works well in terms with landing".
Slow 4G is out of scope ("Treat slow 4G out of scope"), so `readyTimeout` stays 15 s. He also said "The island is not
well positioned for phone". That is the portrait home camera, candidate C, his pick of 2026-07-28 (`1f6b21e`). It was
measured from 360 × 800 to 430 × 932, and his Safari viewport is about 440 × 820. It goes to the todo as its own
slice, not this branch.
