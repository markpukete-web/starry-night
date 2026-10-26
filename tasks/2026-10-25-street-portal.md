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

## Task 7: the look passes (`t7/`)

Pass 0, the captures (`t7/p0/`). The flight pinned at 0, 0.25, 0.5, 0.75 and 1 by a new seam, `__portalFlight`, then
the held frame, the fade in, the street, the fade out and the return, on both viewports (`desktop-sheet.png`,
`phone-sheet.png`). One defect on both: the frame froze for about 2 s after the flight. The street's build is one long
task of about 1.5 s, and the layer showed a still copy through it.

Pass 1: the layer drifts. The flight's end copies the frame with the class `is-drifting`, a CSS scale animation. A
transform animation runs on the compositor, so it keeps moving while the main thread builds the street. A CDP
screencast proved it: 155 frames arrived inside the 1,552 ms long task, and all 155 differ (`t7/p1/screencast-sheet.png`).
Screenshots cannot show this, because they wait for the main thread. Pass 1's curve started at rest (6 s, ease-in-out,
scale 1.12), on the reasoning that the flight ends at rest.

Pass 2: that reasoning was wrong. The flight reaches zero speed only at its last instant. By its pose, its push-in is
10% a second at s 0.98 and 2.2% on its last frame at 60 fps. A motion profile across the hand-off
(`t7/p1/motion-profile.txt`) showed pass 1's stop: the change per 100 ms fell from 14 to 0.7, and it took 1.4 s to
reach 4 again. Pass 2 starts at the flight's last-frame rate and slows to rest: 4 s, `cubic-bezier(0.2, 0.4, 0.5, 1)`,
scale 1.045. Its profile reads 14, then 4.2, then 4.4 down to 2.9 through the build, with no stop. tsc, lint, 346 of
346 tests and check-portal pass on it (`t7/p2/summary.txt`). Two passes of the four used.

Open for Mark: the phone's held frame. The flight ends at v2 on both viewports. On the portrait lens the island's
underside fills the lower 40% of the held frame, and the fade dissolves it into the lane (`t7/p0/phone-sheet.png`,
frames 4 to 7). A phone end pose is a design change, not a retune, so it waits for his eye.

## Task 8: the gate (`t8/`)

At the head `4556d29`: tsc, lint and the suite pass, 346 of 346. check-portal passes all eleven cases (twelve lines,
case 2 also on the phone). The church's gate frames at stops 0 and 4, lit and ID, on both viewports: 8 of 8
byte-identical (`t8/church/summary.txt`). The diorama's home with `?portal=1` and without, both viewports, times 0 and
5, against Task 0's frames: 8 of 8 byte-identical. `check-reduced-motion.mjs` passes. The build passes. The main chunk
is 1,383,334 bytes, 161 more than Task 6 (the drift's class and the flight's seam), and the street's is unchanged at
97,144 (`t8/chunks.txt`).

The frame rate (`t8/perf/table.md`, five rounds, the four pages beside each other in each round): p50 16.7 ms on
every page and viewport, 60 fps. The p95 reads 17.5 to 18.2 ms. The street through the portal draws exactly the direct
street's triangles (1,436,467 desktop, 1,430,437 phone) at the same frame times. The home after a return draws the
plain home's on desktop (1,444,930). To measure the portal's street after its fade, `capture-diorama.mjs` gained one
hook, `DIORAMA_CAPTURE_EVAL`, an expression awaited before the wait (`4556d29`).

The phone's home after a return read 2 triangles fewer than the plain home, in all five rounds. That was checked
before the return was called clean. Through R3F's `_roots` store on the dev server, the camera before and after a
phone round trip is identical to the last digit, and the same 31 objects are visible with the same counts. Over 300
frames, the plain home before any trip reads both counts (26 calls in 112 frames, 27 in 188): one draw at the narrow
portrait frustum's edge comes and goes with time. The five rounds read it at different phases. The phone's GPU
geometries rise from 20 to 21 after a trip, and a plain orbit with no portal does the same: a diorama geometry
uploaded the first time it is in view.

## Codex's branch review (`branch-review-codex.md`)

At `4556d29`: FIX, five findings, no P0 or P1. All five hold. Each is fixed in the fix commit and pinned by a check
that turns red without its fix (`t9/mutants.txt`), except F5, which is checked by hand.

- **F1, P2: a leave at the end of the entry's fade can lose the return's fade.** It holds. Task 3's once-only guard
  covered a fade that had finished, not one still running. The canvas sees `leaving` a frame or more after the page,
  and its street frames in between ran the entry's fade on the leave's new copy. Fixed: `leave` ends the street's fade
  (`drive.sent`) before it copies. New case 3b leaves while the entry's layer is under 0.7: the return starts from
  full and only falls. Without the fix, case 3b fails with the layer at 0.60, then 1.00, then falling.
- **F2, P2: a drag out and back over a house enters.** It holds. The portal read only the press and the release.
  Fixed: the portal's own move listener marks a press as a drag once it moves past `TOUCH_SURGE.tapPx`, for touch too,
  before the touch return. The sky's surge keeps its own classifier, as Codex advised. Case 7 now drags 24 px out and
  back within 300 ms over a house, with no entry. Without the latch, case 7 fails on that drag.
- **F3, P2: system reduced motion turned on mid-flight leaves the flight and the drift running.** It holds. Fixed: the
  flying branch takes `still` as the flight's end. It copies the frame on screen with no drift and sends `flown`. A
  media rule pauses a held frame's drift where it is, so it does not jump back. `still` is the system preference only
  (`App.tsx:123`). The visitor's pause still lets a requested flight finish, as Codex noted. New case 6b: the flight
  ends 102 ms after the change, with no drift, and the rule reads `paused` under reduce and `running` without it.
  Without either fix, case 6b fails.
- **F4, P3: the return checks accept a wrong lens.** It holds. Fixed: `__portal()` reports `view`, the camera's
  rotation and lens, and the type's comment says `pose` is the orbit pose. `assertReturn` checks the rotation against
  the one before the entry and the lens against the aspect's default (`DIORAMA_CAMERAS`), at both samples. Case 10
  checks the portrait lens after the rotation. Without the leave's `writeLens`, case 3 fails on the street's near
  plane, 0.004.
- **F5, P3: a resize while the frame is held stretches it.** It holds. Fixed: `object-fit: cover` on the layer, so a
  resize crops the held frame from its centre. Checked by hand (`t9/f5-compare.png`): a 1,600 × 900 copy in a
  900 × 1,600 box keeps its moon round under `cover` and squeezes it under the old fill. No check pins it: it is one
  CSS declaration, and a check would need a resize inside the build's long task.
- **The `record` helper** stopped at its deadline without failing. It now throws when its wait never holds, so every
  caller's settled state is proven.

Two of Codex's notes are not code changes. The plan's Review Focus 4 says a flight hidden mid-way "ends in at most 25
frames after return". That number assumed every frame after the return hits the 0.1 s cap. Only the first one does.
The flight then resumes where it was and runs its remainder at normal speed, up to 2.4 s, which is the right
behaviour: the visitor sees the rest of the flight, not a jump. The plan's line is wrong, not the code. Case 11 counts
from the first return, so it cannot see a one-time leak. On desktop, the home reads 23 geometries before any trip and
after (`t8/perf/table.md`). On the phone, the rise from 20 to 21 also follows a plain orbit.

The gate again on the fixed tree (`t9/summary.txt`, `t9/church/summary.txt`): check-portal passes all cases, 3b and
6b among them (fourteen lines). The church's gate frames and the diorama's home frames are byte-identical, 8 of 8 each.
`check-reduced-motion.mjs`, the build, tsc, lint and the suite (346 of 346) pass. The main chunk is 1,383,589 bytes,
255 more than at `4556d29`. The summaries name `4556d29` because the gate ran on the working tree before the commit.
That tree's four code files are `b0a34d0`'s byte for byte: the diff saved before the mutants matches the tree after
them, and matches `4556d29..b0a34d0` file by file, so the gate covers `b0a34d0`.

Codex's confirmation read of `b0a34d0` (`branch-rereview-codex.md`): MERGEABLE. F1 to F5 are fixed, and the fix diff
adds no P0, P1 or P2 defect. Codex re-ran its own counterexamples against the fixed code: the late fade frame, the
mid-flight change and the lens all pass, and the out-and-back drag is refused for mouse and touch while a real tap
still enters. Both declined notes hold. On its two remarks: the plan's line now carries the correction, and the
desktop's 23 geometries before and after a trip are now in `t8/perf/table.md`.

## Open for Mark

Live at `http://192.168.0.148:5198/?portal=1` (or `localhost:5198/?portal=1`). Hover a house for the hand, tap it to
enter, press Escape or "Back to the painting" to return. The clips, real time from the compositor, so the drift shows
through the build: `t8/mark/portal-desktop.mp4` and `t8/mark/portal-phone.mp4`, with contact sheets beside them.

1. **The phone's held frame.** The flight ends at v2 on both viewports. On the portrait lens the island's underside
   fills the lower 40% of the held frame, and the fade dissolves it into the lane (`t7/p0/phone-sheet.png`, frames 4
   to 7). A phone end pose is a design change, so it waits for your eye.
2. **The flight and the drift.** 2.4 s to v2, then the held frame drifts in from the flight's last speed while the
   street builds, about 2 s on this Mac. Untuned by you.
3. **The flag.** The portal is behind `?portal=1`. Turning it on for every visitor is your release call.

## Mark's gate (2026-10-25)

Passed on the live portal: "It looks good, gate passed." His one doubt is in the street, not the portal: "the frog
doesn't seem like a frog and I think we should put multipule frogs in different location instead of just stop 0".
The frog is S3b's (`frog.ts`). The Lead's read at true scale (`street-s3b-2026-10-25/t6/frog-p4b/`): about 15 px on
desktop and 6 px on the phone, turned head-on to stop 0's camera, so the sitting outline and the folded back leg are
hidden and only the eyes read, dark on the dark grass base. Next: frogs as their own slice on the portal's head.
