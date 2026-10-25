# A finger touches no land: the record, 2026-10-25

Mark's first real-device reading, iPhone 17 Pro Max, the painting page: 60 fps still, 18–50 fps under a moving finger.
The Mac did not reproduce it (4× CPU throttle, vsync off, 15 live surges: no measurable cost), so his phone was the
loop. His drags: `?perf=1&touch=0` near 60, `?perf=1&bend=0` (the sky's surges only) 60, `?perf=1&surge=0` (the land's
cast and bend, the surges at zero strength) 38–60. So the cost was the land's touch, not the sky's surge. He chose "No
land bend on a finger (Recommended)". The branch is `fix/finger-no-bend`, stacked on the frogs (`feat/street-frogs`).
The evidence is in `/Users/markma/Projects/starry-night/scratch/finger-no-bend-2026-10-25/`.

## The fix (`dccdd9a`)

`useTouchInput.ts` `landActive` is false for a finger (`!p.finger`). Every land path routes through it: the cast in
`landPoint`, the hold on a press, the hover in a move and the tap on a release. So on a touch screen a finger turns the
view and lights the sky, and a mouse or a pen still bends the land. `check-portal.mjs` case 12 drives the phone viewport
with touch emulation: a finger's drag over a tree must add sky surges and no land touch, and a mouse over a tree must
add one.

Mark on his phone, port 5202: "The frame rate stays near 60. All points you mentioned achieved".

The worker's first runs (`portal.log`, `test-sky.log`, `mutant.log`): every case passed, and case 12 failed with the
guard removed.

## The Consultant's review (`review-consultant.md`): MERGEABLE, two P2s

- **F1, P2: case 12 pinned the side effect, not the cost.** A change that still cast under a finger and threw the hit
  away passed. Fixed in `dde9a16`: `landPoint` counts its casts, `__landState().casts` exposes the count, and case 12
  asserts it unchanged across the finger's drag and tap and raised by the mouse.
- **F2, P2: case 12 never ran a finger's tap.** The check's drag reads as a drag. So the tap path never ran with a finger.
  Fixed in `dde9a16`: a finger's tap on a tree must add one kick and no land touch.
- The notes, also in `dde9a16`: `tree12b` has a null check, and the stale comments in `useTouchInput.ts` and
  `landTouch.ts` and the D1 entry in `CLAUDE.md`'s Tunables now say a finger touches no land.

## The worker's runs at `dde9a16` (`r2/`)

The brief: `brief-worker-runs-2.md`. The head was `dde9a16` and the tree was clean at the start and the end
(`start.txt`, `end.txt`).

- `check-portal.mjs`: ALL PASS (`portal.log`). Case 12: "on the phone a finger's drag over a tree added 6 sky surges
  and its tap a kick, with no land touch and no cast; a mouse over a tree cast 2 times and added 1 touch".
- `test:sky`: 359 of 359 (`test-sky.log`).
- M0, the guard removed: case 12 fails, "a finger on a tree took the land touches from 0 to 1 held and 1 after"
  (`m0.log`).
- M1, the guard removed and the hit thrown away after the cast (the Consultant's F1 regression): case 12 fails, "a
  finger cast the land's ray 11 times" (`m1.log`).
- M2, the guard removed and the drag guarded, the tap left open (the F2 regression): case 12 fails, "the control
  failed, a finger's tap took the kicks from 0 to 0" (`m2.log`). The tap went to the land, and `landMasksSky`
  swallowed the sky's kick, so the kick check fires before the land-touch check after it. Either check catches the
  regression.

## The Lead's gate

`npx tsc -b` and `npm run -s lint`: clean. `npm run -s test:sky`: 359 of 359. The diff from `dccdd9a~1` read whole:
the guard, the cast counter, the seam, case 12 and the comments, nothing else in `src/`. The worker's logs read raw,
not its report. Passed.
