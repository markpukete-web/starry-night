# Sky choice — built, reviewed, gated and refined, 2026-10-11 (Mark reviewed; PR opened on his word)

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

## Refinement — Mark: "room to improve" (afternoon, 2026-10-11)

Evidence root: `scratch/sky-polish-2026-10-11/` (gitignored). Reviews: Codex `reviewer/review-v1.md` (shader FIX,
star-hole design REVISE, proposed design D) → `reviewer/review-v2.md` (FIX: N1 body sampling after a discard, N2 pop
detector blind to one-frame pops) → Fable as Consultant, Codex's 5-hour usage spent, `consultant/review-v3.md`
(GATE: N1 and N2 closed; N3, a stride blind spot in the scratch detector, fixed by adopting its stride-8 windows).

| Commit | What |
| --- | --- |
| `0918095` | Moving strokes painted: bristle lanes, dry-brush tails, per-stroke length, soft edges; lift 0.2 → 0.08 |
| `8fce8e9` | Lane hashes only inside the stroke outline; edge width before any discard (101 → 109 fps) |
| `bcc2c4d` | Codex R1 (derivative floor) and R2 (ascending `smoothstep` edges); pixel-identical |
| `a16c780` | Codex design D: the measured star and moon bodies kept as the scan's paint over the strokes |
| `e40975c` | Codex N1: the bodies sample the painting before the discard; pixel-identical, 110–111 fps |
| `f193fd9` | One raking light from the upper left for every stroke, lane ridges lit, a soft sheen (Simon study) |
| `c083397` | Coverage: `minPoints` 9 → 5, path fade 0.12 → 0.05, × 0.93 trim; background 4.8% → 2.3% |
| `c8deb18` | `smoothTrail`: 1-2-1 path smoothing, moving sky only, test T6; the upper-left zig-zags soften |
| `ff16fb9` | The short-dab trade recorded beside `minPoints` (Fable review-v4) |
| `d640d82` | T6 also checks the width runs across the smoothed path (Fable's m3 now red) |
| `8d1ed6c` | Mark: moon too bright. Body layer drops the wash's lift: moon L 91.9 → 85.0 (light sky 80.8) |
| `2ceea2d`, `4b971ad` | Mark: moon glow 0.68 → 0.5 → 0.58 in the moving sky only; moon L 82.5, sky dE76 5.25 |

What was wrong, measured: the strokes held half the painting's texture (mean neighbour |ΔL| 2.42 against 4.6;
chroma matched, 28.0 against 27.2). Seven star cores and the moon showed the navy background: found with a magenta
background (`holes/`). The cause at the photographed star: ribbons circle the core, and the turn cut and minimum
length drop the short ones there (Codex C1). Two ground-layer attempts (blurred painting, zero-count cells) were
worse and were reverted at the pass cap.

Gate on `a16c780` (worker `worker-gate2.md`, READY; Lead re-measured frame rate and first switch). `e40975c` then
changed no pixel at design, orbit or phone size (Lead) and matched byte for byte at design (Fable):

| Check | Result |
| --- | --- |
| lint (`src`, `scripts`), `test:sky`, build | 0 errors, 106/106, built |
| Default still vs `main`, 11 views | AE 0 in all 11 |
| Default motion vs `main`, 12 pairs incl. after visiting moving | AE 0 in all 12 |
| `check:reduced` default and moving; `check:viewport` | pass, pass, pass |
| Sky colour ΔE76 (limit 10) | moving 7.88 (was 6.67 this morning): the opaque moon is brighter |
| Frame rate, M5 Pro, production | moving 107.7 fps, p95 10.4 ms, 706,376 triangles (+28,080 body layer); light 120 fps |
| First switch, production | 183–210 ms in four runs (was 207.8) |
| Local pops, 60 fps over 1 s | none at this sensitivity (max 3.4 against a threshold of 4). `pop-check.ts` flags all 13 planted controls: one frame, two frames, persistent, tile-row and corner splits. Not a proof of no pops at lower contrast or other times |

One long frame of 35–40 ms in each steady perf window is the perf tool's own read: it moved from 14.04 s to
20.05 s when the read moved (`perf-gaps.mjs`, `perf-gaps20.mjs`).

Mark's direction after comparing with Simon Lee (2026-10-11): keep the scan-derived sky and borrow three craft
techniques, not the method: one raking light, denser coverage, cleaner paths. All three are in. Fable reviewed
`f193fd9` and `c083397` (`consultant/review-v4.md`, GATE) and found the path noise cause (a quarter the Euler
step, three quarters the flow field's texel noise). Coverage costs short oval dabs in the whorl eye: 12.6% of
paths are 5–8 points. Gate on `c083397` (`worker-gate3.md`, READY): default sky AE 0 in 11 stills and 12 motion
pairs, reduced motion and viewport pass, moving 100.6–101.7 fps, first switch 200–225 ms, no pops. Fable reviewed
`c8deb18` (`consultant/review-v5.md`, GATE): light sky byte-identical with the real assets, no trail split by the
strip seam or `trailMaxV`, folds over 20° 0.9% → 0.3%, upper-left corners over 15° 31% → 16%. T6 then gained a
check that the width runs across the smoothed path (Fable's m3 now turns it red). Gate on `ff16fb9`
(`worker-gate4.md`, READY): default sky AE 0 in 11 stills and 12 motion pairs, reduced motion and viewport pass,
107/107 tests, moving 102.6–103.4 fps, light 119.9, first switch 225–234 ms, no pops (max 3.1, planted control 7.4).

Still open in the moving sky: crescent gaps around the whorl eye and in the upper left read as dark paint between
strokes (left by choice: a static patch there read as pasted). The star bodies are static, as the warm bodies were
already; whether that reads as a sticker is Mark's taste call. The authored star spheres and halos still sit at
`SWIRLS` positions, off some painted stars, in both skies (pre-existing on `main`).

## Open for Mark (his calls)

1. **Taste.** Does the moving sky earn its place as an option? Refined this afternoon (section above). Residuals:
   static star bodies; dark crescents round the whorl eye; the void around the island (23, 35, 70) and the
   phone's band above the sky are lighter than in painted light (7, 14, 39); at orbit the side strip reads paler.
2. **First switch hitch.** One 0.2 s frame on an M5 Pro, the first time only. A phone will be longer.
   Option: build the moving strokes in idle time after load (costs work for visitors who never switch).
3. **Phone** (Fable F3, deferred): 25,600 requested ribbons on every device. Measure on a real phone on the
   Vercel preview. If it fails, fold a device class read once at build into the count (keeps resize free).
   The afternoon refinement raised the risk mostly in fill, not triangles: per-fragment work grew (lane noise,
   derivatives, sheen) and the star-body layer is a second sky-sized pass that samples the painting at every
   fragment. If a phone falls short, the cheap lever is that layer's geometry: eight small patches round the
   bodies instead of the full dome strip.
4. **Push** `feat/sky-choice` and open the PR (merge = deploy).
