# The opening as the loading screen: plan, 2026-10-25

Mark: "go with your recommendation on the loading screen". The recommendation (the todo's pickup, 2026-10-25): no
separate card. The opening's painting and Vincent's line become the loading screen. Three changes, and one more that
is the Lead's call (marked).

**Why.** A first visit fetches about 9.6 MB, then builds the sky's 25,600 strokes. Today a visitor sees a blank
dark-blue page until the code runs. Then the opening shows the painting and the line with no sign of loading, for the
load plus the 4 s hold.

Branch `feat/loading-curtain`, stacked on `fix/finger-no-bend`. The Lead builds it.

## Decisions

(a) **The curtain is in the page's HTML.** `index.html` holds a copy of the opening's layer, `#boot`: the dark ground,
the painting (`/reference/painting.jpg`, `fetchpriority="low"`, as its preload), Vincent's line, its citation and the
cue. It shows at the first paint, before the code arrives. Its styles move from `src/index.css` into an inline
`<style>` in `index.html`, so the dev server and the production build both style it at the first paint. One copy of
the rules, used by both layers.

(b) **The hand-over.** React's layer renders underneath. `#boot` is `position: fixed` at `z-index` 10, and React's
layer stays at 9. Both look the same. `#boot` goes when the opening stops waiting, so React's layer, with its own scan
loaded, is the one that holds and dissolves. Every page that does not play the opening (`?arrival=0`, a repeat visit
in the session, `?street=1`, reduced motion, the other modes) drops `#boot` on its first commit. One small module
owns it: `src/bootCurtain.ts`, `keepBootCurtain()` and `dropBootCurtain()`. The diorama keeps it in a layout effect
when it plays the opening. `App` drops it in an effect unless it was kept: a parent's passive effect runs after its
children's layout effects. Neither one removes it in an effect's cleanup, so StrictMode's double run cannot drop it
early. The driver drops it on the first frame that is not waiting. The class is `arrival-boot`, not `arrival`, so the
checks that read `.arrival` see React's layer only.

(c) **The cue.** Under the citation: "Painting the night sky…", in the citation's type, at 0.6 of the line's opacity.
It shows while the opening waits and fades out over 0.5 s of the clock once it stops waiting. The driver writes its
opacity per frame, as it writes the line's. A pinned capture hides it at once, so a capture stays exact. No motion of
its own: the painting arriving is the motion. Reduced motion never shows React's layer, as today.

(d) **The hold counts from the painting.** The clock adds up the time the scan has been shown while it waits. When it
stops waiting, `a` starts at that time, capped at `hold − afterReady`. `afterReady` is 1.5 s: at least 1.5 s of the
hold remains after the scene is ready, and that holds the line's whole 1 s fade. The jump is not visible, because
nothing in the frame changes before `hold − lineFade` (3 s).

(e) **Lead's call: a tap no longer ends the wait.** Today a tap, click or key during the wait opens a scene that has
not finished building (`arrival.ts:178`). With a cue on screen, that defeats the cue. The skip is kept, and the clock
runs at `skipSpeed` from the moment the scene is ready. The 15 s `readyTimeout` is unchanged.

The line's text lives in one place: `arrival.ts` exports `VINCENTS_LINE` and `VINCENTS_CITE`. `VincentsLine` renders
them, and a test reads `index.html` and finds both strings in `#boot`.

## Tasks

1. **The clock (d, e), red first.** `scripts/arrival.test.ts`:
   - `the hold counts from the painting`: 6 s waiting with `shown` true, then ready. The first ready tick gives `a` =
     2.5 + dt. Then `line` is still 1 at that `a`, and the dissolve starts 1.5 s later.
   - `a short wait keeps the whole hold`: 0.4 s shown, then ready. `a` starts at 0.4.
   - `the scan unseen gives no credit`: 6 s waiting with `shown` false, then ready. `a` starts at 0.
   - `a skip waits for the scene`: `skipRequested` true and `ready` false for 5 s: `a` stays 0. Then ready: `a` runs
     at `skipSpeed`.
   - The existing test at line 152 ("a skip opens the wait") is rewritten to the new rule. The timeout test stays.
   - `waiting` is exposed on the clock, true while it waits.
   Then `ArrivalInputs.shown?: boolean`, `ArrivalClock.seen`, `ArrivalClock.waiting`, `ARRIVAL.afterReady = 1.5`.
2. **The curtain (a, b, c).** `index.html`, `src/index.css`, `src/bootCurtain.ts`, `src/App.tsx`,
   `src/scene/DioramaExperience.tsx` (the cue's element and ref, the driver's `shown`, the cue's opacity, the drop).
   The test: `VINCENTS_LINE` and `VINCENTS_CITE` found in `index.html`'s `#boot`.
3. **The gate.** tsc, lint, build, `test:sky`, `check-reduced-motion.mjs`, `check-portal.mjs`. The worker times a
   production build of the base and the branch with
   `scratch/loading-2026-10-25/load-timing.mjs` (no throttle, a fast and a slow 4G profile, phone and desktop). The
   Lead captures the first paint, the hand-over and the dissolve on desktop and phone under the slow profile, and
   looks at them. Then Mark's look on his phone.

## Out of scope

A progress bar or a percentage. The 15 s timeout on a slow connection (a first visit at 1.6 Mbps needs about 48 s for
9.6 MB): noted for Mark with the timings. Making the downloads smaller.

## Revision 1: the Consultant's correctness read (`scratch/loading-2026-10-25/plan-review-consultant.md`, REVISE)

The read covered the plan and the code at `71b8c20`. Six findings, five fixed in one commit, one declined.

- **P1, fixed.** The painting was fetched at low priority. The slow-4G frames at `28269b9` confirm it: the painting
  finished at 20.8 s, the bundle at 6.3 s, so the curtain stood without its painting for 20 s. `#boot`'s image is now
  `fetchpriority="high"`, and the painting's preload is gone, since the image in the HTML fetches it on every visit.
  The ready time should not move: the opening waits for the painting anyway, so the bytes before it are the same.
  The worker's re-timing checks that.
- **P2, fixed.** A page that will not play the opening showed the curtain until the bundle ran. A classic script
  after `#boot` removes it at parse time on `?street=1`, a mode other than the diorama, `?arrival=0`, a repeat visit
  in the session (not with `?arrival=1`) and reduced motion. Lead's call: reduced motion hides it, as (b) says.
  A13 runs the script against eleven cases. `ARRIVED_KEY` is exported, so the test holds the key equal.
- **P2, fixed in part.** A page that fails after the keep (no WebGL, a throw in the first render) kept the curtain for
  ever. `keepBootCurtain` now drops it after `readyTimeout + 5` s of real time. React's layer looks the same, so on a
  page that still runs the drop is not seen. **Declined:** an inline timer for a bundle that never runs. It would cut
  the curtain on a link that is only slow, and a broken deploy is broken either way.
- **P3, fixed.** The painting's credit counted at most `maxDt` per frame, a fifth of the real time at 2 to 5 fps.
  `seen` now counts up to `seenDt` (1 s) per frame. **Lead's call:** the timeout keeps `maxDt`, so its real length on
  a slow device is unchanged. Whether to lengthen it is Mark's question with the timings.
- **P3, fixed.** A painting that failed to load gave credit. `shown` is now the React image loaded and not failed
  (`complete` and `naturalWidth > 0`).
- **P3, declined.** The time before the driver's first frame is not credited. On a slow link the wait itself fills
  the 2.5 s cap. With no throttle the gap from the curtain's first paint to React's first commit is under a second.
