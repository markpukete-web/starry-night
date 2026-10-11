# Sky choice — built, reviewed and gated, 2026-10-11 (Mark's taste review pending)

Visitors choose the sky with a "Sky: painted light / Sky: moving strokes" button that leads the dock on the
3D diorama. Painted light is today's sky and stays the default, pixel-identical to production. Moving strokes
is Simon Lee's model (short opaque single-colour strokes travelling along the painting's own flow paths, with
no painting copy under them), tuned to the painting. `?sky=moving` opens on it. Plan of record:
`tasks/2026-10-11-sky-choice-plan.md`. Branch `feat/sky-choice`, local only: Mark pushes after his review.

## Commits

| Commit | What |
| --- | --- |
| `315ab5a` | Stroke-builder options `maxTurnCos`, `minPoints`, `colourPerRibbon` and tests T1–T5 |
| `f993fa1` | Moving-stroke sky mode in `PaintingFlowSky3D`; reduced-motion check URL fix |
| `bf353c6` | The dock button |
| `29f869b` | Tuning, four measured passes (cap 4) |
| `3262865` | Answers to Fable's implementation review (F1, F2, F4, F5, F7, F8, F9) |
| `58a1560` | Placard height only where the dock wraps to three rows (check:viewport regression from F7) |

## Gate record (Lead, 2026-10-11, on `58a1560` unless stated)

Evidence root: `scratch/sky-choice-2026-10-11/` (gitignored, on this Mac).

| # | Check | Result | Evidence |
| --- | --- | --- | --- |
| 1 | lint, `test:sky`, build | 0 errors, 106/106, built | `gate/g1-suite.log` (re-run green after every fix) |
| 1 | Builder mutations m1–m4 | each red on its named test, green restored | `gate/mutations/m1–m4.log` |
| 2 | Default still vs `main` (11 views, two servers, cwd recorded) | AE 0 in all 11 at `3262865` | `gate/worker/rerun/step2-compare.txt`; Lead re-compared 3 views and opened `centre.png` |
| 3 | Default motion vs `main` + pin hook (design and orbit, t 0.5/3.7/11.2, with and without visiting moving) | 12/12 AE 0 at `3262865` | `gate/worker/rerun/step3-frames-comparisons.txt` |
| 3b, 10 | Clocks unpinned (R2) and resource lifecycle (R1), gate-only harness | 5/5 pass; mutations (cleanup removed, doubled clock, visible-only clock) each fail | `gate/harness-probe-3262865.json`, `gate/mutations/r1-*.log`, `r2-*.log`, `gate/harness.patch` |
| 4 | `check:reduced` default and `?sky=moving` (page query logged) | pass, pass | `gate/worker/rerun/step4-g4-*.log` |
| 4 | Same-page reduced motion while on moving strokes, playing and paused | 15/15 (still AE 0 vs a fresh reduced page; button disabled; choice and pause state return) | `gate/media-3262865/media-probe.json` |
| 5 | `check:viewport` | pass at all 10 sizes after `58a1560` (failed at 640×360 on `3262865`) | Lead run; `gate/worker/rerun/step6-viewport.log` has the failure |
| 5 | `check:village` | ΔE 8.16, unchanged | `gate/worker/rerun/step6-village.log` |
| 6 | Toggle and dock layout | button toggles `aria-pressed` and the sky; dock rows 3/2/1/1 at 320/390/844/1600, no overlap | `c3/page-*.png`; Fable's `reviewer/impl/dock-rects.mjs` re-run |
| 7 | Sky colour vs the painting (ΔE76 < 10) | moving 6.67, painted light 3.46 | `sky-colour.ts`; `fix1/moving/` |
| 8 | Frame rate, headed Chrome, Apple M5 Pro | painted light 120 fps, p95 10.1 ms, 194,850 triangles; moving 120 fps, p95 10.2 ms, 678,296 triangles | `gate/worker/rerun/step7-perf.log`, `gate/g9-production-first-toggle.log` |
| 9 | First switch to moving (production build) | one frame of 207.8 ms (dev 208.3 ms) | `gate/g9-gap-production.log` (injected rAF tracker) |
| 11 | Pinned-clock tool self-check | same t after 3 s AE 0; different t differs | `gate/frames-selfcheck/` |
| 12 | Visual: full frame, orbit, phone, crops beside the painting, 4 s motion | looked at by the Lead | `gate/visual/`, `tune/p1–p4-crops.png`, `fix1/` |

Reviews: Codex plan REVISE → REVISE → BUILD; Gemini plan BLOCKED → READY; Fable implementation FIX → GATE
(`reviewer-impl-v1.md`, `reviewer-impl-v2.md`).

## Open for Mark (his calls)

1. **Taste.** Does the moving sky earn its place as an option? Residuals: dark rings inside some star halos;
   strokes too even in size; the void around the island (23, 35, 70) and the phone's band above the sky are
   lighter than in painted light (7, 14, 39); at orbit the side strip reads paler.
2. **First switch hitch.** One 0.2 s frame on an M5 Pro, the first time only. A phone will be longer.
   Option: build the moving strokes in idle time after load (costs work for visitors who never switch).
3. **Phone** (Fable F3, deferred): 25,600 requested ribbons on every device. Measure on a real phone on the
   Vercel preview. If it fails, fold a device class read once at build into the count (keeps resize free).
4. **Push** `feat/sky-choice` and open the PR (merge = deploy).
