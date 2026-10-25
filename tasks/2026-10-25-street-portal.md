# The portal, slice 4: the record, 2026-10-25

The plan is `tasks/2026-10-25-street-portal-plan.md`, revision 2, with three deviations found in the build (its head
note). Mark asked the Lead to carry on through the church and the portal while he is out, and to gate both on his
return. The evidence is in `/Users/markma/Projects/starry-night/scratch/street-portal-2026-10-25/`. The branch is
`feat/street-portal`, stacked on `feat/street-church`, local, no PR.

## The plan's review

The Consultant read revision 1 (`plan-review.md`): APPROVE with nine P2s, no P0 or P1. Revision 2 folds each one
where it lands (F1 to F9). It was not read again: the build's checks are what prove the folds.

## Task 0: the baselines (`t0/`)

At the church's head (`fef48a5`), served by the church's worktree: the diorama's home on both viewports at times 0 and
5 with the arrival off, and the street at stop 0 on both viewports. A second capture of the desktop home at time 0 is
byte-identical to the first, so a byte test on these frames means something. The build's chunks: the main 1,375,607
bytes, the street 97,003, the moving sky's worker 91,261 (`chunks.txt`).

## Task 1: the places and the flight (`473989f`)

`portal.ts` holds the five places, the reducer, the flight's pose and clock, and the constants. Seven tests, in
`test:sky`. The first run ran out of memory: the clearance test pushed the orbit's corners into the array it was
iterating over. It now iterates over the two homes.

## Task 2: the street's readiness, per mount (`8c15409`)

`Street` takes `onReady` and `hold`, the boundary `onFailed`, and the street has its own `Suspense`. The church's gate
frames at stops 0 and 4, lit and ID, on both viewports: 8 of 8 byte-identical (`t2/summary.txt`).

## Tasks 3 to 5: the driver, the pointer, the dock (`c6debdb`)

They share `DioramaExperience.tsx`, so they landed together. By hand on the dev server (`t3/hand/`): the hover shows
the hand and the hint (`hover.png`), the flight takes 2.48 s (`flight-1200.png`, `flight-2000.png`), the street builds
in 2.08 s under the layer, and the layer fades in 1.0 s (`street.png`). The return cross-fades the street into the
diorama at the visitor's own orbited pose (`leaving-mid.png`, `back.png`).

One defect found by hand and fixed before the commit. The first return did not fade: the layer read 0 five
milliseconds into `leaving`. The canvas is a second React root, so it commits a new place a frame or more after the
page does. In those frames the driver still ran the street's fade, long finished, and it hid the copy the leave had
just made. The street's fade now runs once and stops.

## Task 6: the checks (`scripts/check-portal.mjs`)

All eleven cases pass against the dev server (`t6/check.log`). Two notes on how they read:

- Case 5's injected chunk failure surfaces as a page error although the boundary catches it. R3F creates its root
  with `reportError` as `onCaughtError` (`@react-three/fiber/dist/events-*.js`, `createRoot`), which dispatches an
  error event as if uncaught. The check accepts exactly that error in that case and fails on any other.
- Case 7 keeps a reference to the touch store's getter before the tap. The tap that enters turns the touch hook off,
  and its cleanup deletes the seam.

The mutants (`t6/mutants.txt`, by `scratchpad/portal-mutants.py`): six, each removing one guarded behaviour, each turns
the check red at the case that guards it. No sky mask fails case 7 (the kicks 1 to 2). The street's fade running on
fails case 3. No hold fails the phone's case 2 (the walk at 0.0114 when the street shows). No reset fails case 3 (the
pose 1.93 off). A fading cut fails case 6 (60 part-faded frames). No hint fails case 1.

The rest of Task 6 (`t6/summary.txt`): the diorama's home with `?portal=1` and without it, both viewports, times 0
and 5, against Task 0's frames: 8 of 8 byte-identical. `check-reduced-motion.mjs` passes. The main chunk grew from
1,375,607 to 1,383,173 bytes (7,566, the portal's own code), the street's from 97,003 to 97,144 (`t6/chunks.txt`).
