# Plan: the audit's unscheduled items (17, 19, 25, 26, 30)

2026-11-14, 22:55, the Lead. Mark asked whether about half could go to Hydrogen ("I presume that half of those can be
action by Hydrogen?"), then: "Let's add it and well plan those for now". The items and their evidence are in
`tasks/2026-11-14-audit.md`, "For Mark, ranked". The finding IDs (B5, C-08 and so on) and their file and line notes
are in `scratch/audit-2026-11-14/lead-notes.md` (local, ignored). Line numbers below are from that audit (main at
`c81a3a8`). Each brief must find its names again with `git grep` on the base it builds from.

The order is fixed by the files the slices share:

1. The walk end (items 9 and 10), in its PR now.
2. H4 (items 19, 21, 22, 24 and 27). Item 19 was added at 22:55 (`scratch/briefs-2026-11-14-evening/h4-scope.md`).
3. H5, the browser checks (item 26). H4 edits `capture-diorama.mjs`, and H5 edits every check's launcher, so H5 starts
   after H4 merges.
4. H6, the street's small faults (items 17's C-08 and 25's B6, C-09 and B7), and A6. It can run beside H5, because the
   two share no file.
5. The Opus slices and Mark's calls, below.

## H5, Hydrogen: the browser checks (item 26)

Nothing a visitor sees changes. Proof: every check passes on the slice's head, and each check is seen red once.

- **D16, the launcher.** Eleven checks carry their own copy of the Chrome launcher, about 1,500 lines. Step 1 is a
  read-only survey: list the eleven copies and every difference between them (flags, viewport, GPU switches, the
  wait for the page, the close). Hydrogen stops and reports the survey. The Lead decides which differences are
  real. Step 2 moves the copies into one module, `scripts/lib/chrome.mjs`, with the real differences as options.
- **D5.** Each check closes its tabs and its socket when it ends (`ws.close`). `--perf` opens its second page only
  after the first is closed.
- **D6.** `capture-sky-frames.mjs`'s `send` rejects on a CDP error and on a timeout, as the other checks' `send` does.
- **D9.** One table of default ports, in the shared module. Keep each check's current port, so no run's command
  changes.
- **D10.** Where a check waits a fixed time for the sky, it polls `__skyReady` instead, with a cap and its own failure
  message.
- **The proof.** Each check runs green on the head. Then each runs once against a broken build and fails with its
  own message: name the break for each, such as a blocked painting for `check-failure-paths.mjs` or a wrong walk
  start for `check-street-walk.mjs`. The 11 frames are identical to `main`'s.

## H6, Hydrogen: the street's small faults (items 17, 25) and the clean capture

- **C-08 (item 17), the ground's unused vertices.** After the grass filter, 24,412 ground vertices (879 kB) are
  uploaded and no triangle reads them (`streetGeometry.ts:2186`). Compact the buffer after the filter. The compaction
  moves `report.lived`'s leg ranges, so update their readers. Proof: the 11 frames byte-identical, the street's
  triangle count unchanged, and its vertex count down by 24,412. If a test pins a hash of the ground's buffers,
  report its old and new values and stop. The Lead decides whether that pin may move.
- **B6 and C-09 (item 25), failures with no log.** Six street failures end in one state, and the asset failures log
  nothing (`Street.tsx:74,89-91`, `streetMode.ts:84`, `DioramaExperience.tsx:66`). `BrushIsland.tsx:51-60` keeps one
  failed flag for three loads and swallows the masses' error. Each failure logs one `console.error` line that names
  what failed, with the `[street]` or `[land]` prefix. The visitor's state does not change. Proof: a browser case
  per failure path reads its line in the console.
- **B7 (item 25), the ready flags.** `__streetReady` and `__streetCounts` are not reset on unmount (`Street.tsx:91-93`,
  the rule at `tasks/lessons.md:374`). Reset both in the unmount cleanup. Proof: `check-portal.mjs` gains an assert
  that both read as reset after the way back.
- **A6 (item 26), the clean capture.** `?clean=1` hides the title, the dock, the placard and the tuner
  (`index.css:43-47`, `:417-419`), but not the lighter view's card (`.visitor-ask`). Add it to the same rule. Proof:
  `?clean=1&slow=1` shows no card.

## The Opus slices (each plan read by the reviewer pane before the build)

- **B5 (item 17), the trail texture.** The grass trail's texture (364 × 517, 376 kB) is uploaded whole on 599 of 600
  walking frames (`StreetGrass.tsx:522-524`). Upload only the rows that changed (`addUpdateRange`). It has not been
  shown to cost a frame, so first measure the frame time on the walk, before and after. Proof: identical frames, and
  the upload size per frame.
- **A10 (item 25), tap or drag.** Three code paths decide "tap or drag" three ways. One rule replaces three, which
  changes what counts as a tap. The plan names the rule and every gesture it changes. Mark sees it on a preview.

## Mark's calls

- **A11 (item 25).** After a rotation in the street, the way back keeps the old pose. `check-portal.mjs` case 10 pins
  that behaviour today. Keep it, or return to the diorama's home view?
- **B8 (item 25).** The fireflies' size follows the pixel ratio, so they draw smaller on a phone than on a desktop.
  Keep it, or fix their size?
- **Item 30**, from `tasks/2026-10-30-perf-review.md`. Finding 3, the phone's start-up dip and first-try load
  failures, needs Mark's phone. Finding 4 is a pixel ratio of 2 for the street: sharper, at a frame cost. Finding 6
  is lossy paint: smaller downloads, a small loss of quality. Findings 4 and 6 are quality trades.

## Not routed yet

The rest of item 17: `inFootprint`'s 89 ms (C-07), the portal layer's canvas copy of up to 18.7 MB (A19), a paused
scene that redraws every frame (A18), the light material rebuilt on each pause (A7), and the frame-loop allocations
(B14, C-11, A20). The Lead routes them next session.
