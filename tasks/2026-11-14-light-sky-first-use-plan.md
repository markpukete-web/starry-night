# Plan: the light sky's geometry is built on first use (audit item 16)

2026-11-14, the Lead. Mark's word (16:24): "I will go with your recommendations", and again at 20:20: "go with your
recommendations". At 20:39: "When everything's gated and ready, push and merge". Builder: an Opus builder subagent.
Plan reader: Argon. Gate batch: Hydrogen. Gate: the Lead.

Argon read the first version (`scratch/briefs-2026-11-14-evening/a1/report.md`, 20:51) and found six faults. All
62 lines it quoted match the files. This version fixes all six: case 10 blocks the worker through the `Fetch`
domain (F1), the red run adds the seam first (F2), case 8 reads the button as it is built and every case runs
alone (F3), case 10's luminance threshold is gone (F4), the gap is read after two more frames and the seam is a
layout effect (F5), and the line numbers and the list of paths are right (F6).

## The defect

`src/scene/PaintingFlowSky3D.tsx:963-986` builds the light sky's ribbons in a `useMemo` as soon as the seven source
images decode. The default route opens on the moving sky (`src/App.tsx:60-61`). While the moving strokes are
awaited (`:1045`) and after they land (`:1041`), nothing draws the light geometry. The audit measured the build at
50 to 71 ms on the main thread during load, and 8.8 MB held.

The light geometry is drawn in four cases. Each must still work after the change:

1. The visitor switches to painted light (`onToggleSky`, `src/App.tsx:118`), or opens on `?sky=light`.
2. Reduced motion: `still` makes `wanted` light (`:876`).
3. The flow debug view, `?debug=flow`: `isFlowDebug` makes `wanted` light (`:874-876`).
4. The moving sky fails in its build or its worker, which sets `movingFailed` (`:997-1013`). `awaitingMoving`
   (`:1045`) then goes false and `mode` (`:1041`) is light.

A failed source image also sets `movingFailed` (`:856-867`), but `images` (`:955-960`) then stays `null`, so the
light geometry is not built on `main` either. That stays as it is.

## The change

Base: `origin/main` at `cd436ea` or later (PR #52 merged there, with its edits to `scripts/check-failure-paths.mjs`).
Branch `perf/light-sky-first-use`, in your own worktree.

1. In `PaintingFlowSky3D`, add a one-way latch `lightEver`, set during render in the same way as `movingEver`
   (`:879-880`). It turns true the first time `wanted === 'light' || movingFailed`. It never turns false.
2. The `geometry` memo (`:963`) returns `null` until `lightEver` is true. Add `lightEver` to its dependencies.
   Nothing else in the memo changes: the same count, width, seed and options.
3. A seam for the checks: `window.__skyLightBuilt`, a boolean, true when `geometry` is not null. Write it in a
   `useLayoutEffect` keyed on `geometry`, the same phase as `__skyReady` (`:1243-1248`). Reset it to `false` in the
   unmount effect beside the `__skyReady` reset (`:1249-1252`). Do not write to `window` inside the memo.
4. Write the trade in a comment at the latch, in plain words: the load no longer pays for the light sky, and the
   first switch to painted light builds it then. Give the measured cost of that first switch (step "Measure" below).

Do not touch the moving sky's worker, `awaitingMoving`, the ready seam's rule (`:1244`) or any shader. The street
also mounts this component (`src/scene/DioramaExperience.tsx:623`), and it stays mounted through the portal. The
same rule holds there.

## The tests

Add four cases to `scripts/check-failure-paths.mjs`, numbered 7 to 10, with its launcher and page helpers. Do not
copy the Chrome launcher into a new script: the audit's item 26 counts 11 copies already. Each case opens its own
tab and runs alone with `CASES=7` and so on. No case reads a value another case measured. Update the file's header
comment to list them.

`open()` (`:182-191` after #52) sets `prefers-reduced-motion` from `REDUCED` before it navigates. Give it an optional
fourth argument, `{ reduced }`, that overrides `REDUCED` for that visit. The existing callers do not change.

- **Case 7, the default route builds no light sky.** `?arrival=0`, 1600 × 900. Wait on `__skyReady` with a cap.
  Then read `__skyLightBuilt` at once and again 2 s later. Both must be exactly `false`.
- **Case 8, the switch builds it.** Its own tab: `?arrival=0`, 1600 × 900. Wait on `__skyReady`. Start a loop in the
  page that records the longest gap between `requestAnimationFrame` callbacks. Find the button whose aria-label is
  "Switch sky to painted light". Its drawn centre must fall inside it:
  `btn.contains(document.elementFromPoint(cx, cy))` (the label `<span>` is on top, as in
  `scripts/check-viewport-camera.mjs:248`). Click there with CDP mouse events. Within a capped poll,
  `__skyLightBuilt` must be `true`, the button's `.visitor-control-label` must read "Sky: painted light", and its
  aria-label must read "Switch sky to moving strokes". Then wait for two more `requestAnimationFrame` callbacks,
  read the longest gap, and print it. The build runs inside the click's task, so the gap closes only on the next
  frame. Then take one more reading in a fresh tab under `Emulation.setCPUThrottlingRate` at rate 4, and print it
  with no threshold: it stands for a slower phone.
- **Case 9, reduced motion builds it.** `open(page, '?arrival=0', DESKTOP, { reduced: true })`. Poll up to 30 s for
  `__skyReady && __skyLightBuilt`. At the deadline, fail with the case's own message, and print both values. Do not
  use `page.waitFor` here: its generic "timed out" message is the expected red of the mutants, and the rule in
  proof step 3 must be able to tell them apart.
- **Case 10, a failed worker builds it.** `Network.setBlockedURLs` does not stop a dedicated worker's script (Argon
  measured it: the worker still loads). So send `Fetch.enable` with the pattern `*movingSky.worker*`, and answer
  each `Fetch.requestPaused` with `Fetch.failRequest` (`errorReason: 'BlockedByClient'`). Then `?arrival=0`,
  1600 × 900. Poll up to 30 s for `__skyReady && __skyLightBuilt`, as in case 9: at the deadline, fail with the
  case's own message and print both values. The console
  must hold `[sky] moving-stroke worker failed`. `__skyReady` is the proof that the light ribbons draw: with the
  moving sky failed, `ribbons` is the light geometry (`:1239`), and the seam is true only when it exists (`:1244`).
  Save a screenshot for the Lead. Do not add a luminance threshold: the wash and the halos draw without the
  ribbons, and Argon measured them brighter than the ribbons' frame.

Run every new case against the production build (`npm run build`, `npx vite preview --host 127.0.0.1 --port
5193 --strictPort`), and once against the dev server.

## Proof the builder gives

1. **Red first.** Add the seam alone (step 3 of "The change", without the latch), build, and run cases 7 to 10.
   Case 7 must fail: the default route builds the light sky. Cases 8, 9 and 10 must pass: they hold the paths that
   must keep working. Then add the latch.
2. **The change, then green.** Cases 3 to 10 pass against the production build. Cases 1 and 2 also pass.
3. **Attack your own tests.** Put each fault below back, one at a time, rebuild, and run the case named. Each must
   go red. Record each mutation's diff and the red output. A red must come from the case's own assertion. A generic
   "timed out" on a step before the assertion (the page load, the canvas) is no result on a busy machine, so run
   that case again.
   - The latch ignores `movingFailed`: case 10.
   - The latch reads `sky` in place of `wanted`: case 9.
   - The latch starts `true`: case 7.
   - The memo ignores the latch: case 7.
4. **Measure.** The first switch's longest frame gap from case 8, on this Mac, with the production build, three
   runs, and the 4× throttled reading. If the median of the three is over 120 ms, stop and report. The Lead then decides between this plan and an idle-time
   build.
5. `npm run -s lint`, `npx tsc -b`, `npm run -s typecheck:scripts` and `npm run -s test:sky` (507 of 507, 0 skipped).

## Machine rules

One browser run at a time on this machine. Before each browser run, run `pgrep -fl 'vite preview|--headless|remote-debugging-port=[1-9]'`
(the Antigravity app keeps renderers with `--remote-debugging-port=0` open, and they are not a check run).
If it prints anything that is not yours, wait 60 s and look again, up to 10 times. Never run the unit suite beside
a browser run. Use port 5193 for your server (`check-street-walk.mjs` defaults to 5191), and stop it when the run
ends.

## The gate (not the builder's job)

Hydrogen runs the batch on the builder's head: the suite, the 11-frame capture set against
`scratch/audit-2026-11-14/slices/union-main/` (all 11 must be identical: the light frame opens on `?sky=light`,
which still builds at once), `npm run check:reduced`, `npm run check:viewport`, and `check-failure-paths.mjs` all
cases. The Lead reads the whole diff, runs the suite and two of the mutations itself, and looks at case 10's frame.
Then the Lead pushes, opens the PR, reads Codex's review, and merges (Mark, 20:39).
