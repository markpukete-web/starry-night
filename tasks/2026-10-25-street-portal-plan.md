# The portal, slice 4: from the diorama into the street and back: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Revision 1 (2026-10-25, evening).** Mark, on the order: "agree, church first then portal". He is out, and asked the
Lead to carry on through the church and the portal and to gate both when he is home. The Lead builds every task.
Mark's gate is the end of the slice.

**Goal:** A visitor on the diorama can enter the village street and come back. A hover over the village shows a hand
and a hint, a click or a tap on it (or a control in the dock) flies the camera down toward the rooftops, and the street
takes over through a layer that holds the flight's last frame. A control and Escape return to the diorama at the pose
the visitor left from. Behind `?portal=1` until Mark's gate.

**Architecture:** The street becomes a place the page can change to at run time, not only a URL read once. A pure
module (`portal.ts`) holds the places, the moves between them, the flight's path and its constants, and is tested under
node as `arrival.ts` is. A driver in the scene flies the camera, copies the canvas into a 2D layer, swaps the scene
under it, and fades the layer when the street reports ready. The diorama stays mounted, hidden, while the street shows.
`?street=1` still opens straight into the street with no diorama, byte for byte as today.

**Tech stack:** React, three.js, R3F, drei's `OrbitControls` (three-stdlib's `saveState` and `reset`), a 2D canvas
for the layer, `node --test`, the capture scripts. No new dependency.

**Spec:** the street design (`docs/superpowers/specs/2026-10-23-village-street-design.md`): "What the visitor does"
steps 1, 2 and 6, "Constraints" (reduced motion, the home page does not grow, the diorama does not change), "The Lead's
calls" (one canvas, the sky, the portal's pointer C7, behind a flag, the way back C16), and slice 4 in "Slices and
gates". The consultant's C9, C10, C11 and C16 (`scratch/explore-2026-10-23/consultant-design-report.md`).

## Session mapping

Lead and builder: Claude, `w4:p1`. Reviewer: Codex, `w4:p4`, or the Consultant (Fable, `w4:p6`) when Codex is busy or
low (Mark, 2026-10-25). The Lead checks each address against `herdr agent list` before a dispatch. The branch is
`feat/street-portal`, stacked on `feat/street-church` (which stacks on `feat/street-s3b`), in its own worktree.
Nothing is pushed before Mark has seen it.

## The facts the plan rests on (read at the church's head, `11d136a`)

1. The street's mode is read once from the URL: `isStreetMode` in a `useMemo` with no dependencies in `Scene` and in
   `DioramaExperience` (`src/scene/DioramaExperience.tsx:246`, `:370`), and in `App` (`src/App.tsx:68`, which also
   keeps the arrival off in the street).
2. In street mode, `Scene` mounts no `OrbitControls`, no `ArrivalDriver` and no `Diorama`. It mounts `Street` in the
   same `Suspense` as the sky (`:309–313`), and gives the sky `home = skyHome` and `anchor = streetSkyAnchor(...)`,
   which is `{ follow: true, worldFixed: true }` by default (`streetEntry.ts:26–30`). Outside street mode the anchor is
   undefined and the sky turns with the camera (`skyAnchor.ts`).
3. `Street` places the camera itself in a layout effect on mount (`Street.tsx:89–110`): position, `lookAt`, fov, near,
   far, from `walkPose(STATION_T[station])`. It writes `window.__streetReady` from `streetReadiness` (`:79–84`). The
   error boundary sets the same flag to true on a failed chunk (`DioramaExperience.tsx:32`). After an unmount the flag
   stays as it was.
4. The canvas keeps its drawing buffer (`preserveDrawingBuffer: true`, `DioramaExperience.tsx:419`), so a 2D canvas
   can copy the last frame with `drawImage` at any time, synchronously.
5. drei's `OrbitControls` calls `update()` only while `enabled` (`node_modules/@react-three/drei/core/OrbitControls.js:29–31`).
   three-stdlib's `reset()` restores `target`, `position` and `zoom` from `saveState()` and calls `update()`
   (`node_modules/three-stdlib/controls/OrbitControls.js:159–172`). It does not clear the damping's residual
   `sphericalDelta`, which `update()` applies first (`:228–238`).
6. The village's meshes are `village-solid`, `village-skin` and `village-paint` (`Village.tsx:89–91`). The land touch
   already casts against them as occluders, with the cypress and the trees as targets (`landTouch.ts:258–259`,
   `landPick` at `:251`).
7. A tap is a press and release within 300 ms and 8 px (`classifyGesture`, `touchSurge.ts:262`). The touch hook sends a
   sky surge on every tap that does not land on the land (`useTouchInput.ts:219–222`), so today a tap on a house surges
   the sky behind it.
8. The flight's bound is the capture `v2` (`scratch/explore-2026-10-23/village/v2-frames.json`): camera
   (0.9, 0.35, 1.5), target (0.4, 0.1, 0.2), fov 50, the last distance at which the village's walls still read as
   paint (C11). The island there is at height 0 (`islandHeightAt(0.9, 1.5)`). The cypress stands at (−1.5, 0.02, 0.72),
   2.7 high (`BrushCypress.tsx:27–28`).
9. The capture scripts read the WebGL canvas (`toDataURL`), not the page, so the dock and any DOM hint never reach a
   frame (`scripts/capture-sky-frames.mjs:174`).

## Decisions

(a) **The places.** `PortalPlace = 'diorama' | 'flying' | 'entering' | 'street' | 'leaving'`. The moves, as a pure
reducer `portalStep(place, event, { still })`:

| From | Event | To |
| --- | --- | --- |
| diorama | `enter` | flying (`entering` under system reduced motion) |
| flying | `flown` | entering |
| entering | `ready` | street |
| entering | `failed` or `timeout` | leaving |
| street | `leave` | leaving |
| leaving | `left` | diorama |

Every other pair returns the same place. The street is mounted in `entering` and `street`. The diorama is visible in
`diorama`, `flying` and `leaving`, and hidden (a group with `visible={false}`) in the other two. The controls are
enabled only in `diorama`. The touch hook runs only in `diorama`, as today's rules allow. The portal's pointer runs only
in `diorama`, once the arrival is done.

(b) **Where the place lives.** `App` holds it with `useReducer(portalStep)` beside the flag, because the dock (in
`VisitorChrome`) and the scene both need it. `DioramaExperience` takes `place` and `dispatch` as props. `?street=1`
starts and stays at `street` with no portal: no back control, no diorama mounted, no controls. That keeps every
street gate's frames as they are.

(c) **The flight.** The driver saves the pose at the first `flying` frame (`controls.saveState()` plus the camera's fov,
near and far), then moves the camera from that pose to `PORTAL.flightEnd` (v2's camera and target) over
`PORTAL.flight` 2.4 s, position and target eased by one smoothstep, fov held. The sky stays camera-locked, as on the
diorama. At the flight's end the driver copies the canvas into the layer and sends `flown`. The end pose is v2 itself,
the closest the design allows. Look pass 1 may move it back along the path, never closer.

(d) **The layer.** A 2D `<canvas>` over the WebGL canvas, the size of its drawing buffer, filled with `drawImage` from
the WebGL canvas. A `drawImage` is synchronous, so the copy shows on the frame it is made. An `<img>` from `toDataURL`
decodes later and would let one frame of the swap show. The layer is shown at the copy and hidden when its opacity
reaches 0. The leave copies in the event handler, before the place changes.

(e) **The swap and the timeout.** `Street` gains `onReady?: (ok: boolean) => void`, called once per mount when
`streetReadiness` is ready, with `ok` its `render`. The boundary calls it with `false` on a failed chunk. `Street` gets
its own `Suspense`, so a chunk still loading never hides the sky or the diorama. In `entering`, once `ok` and
`PORTAL.settleFrames` 2 frames drawn, the driver sends `ready` and fades the layer over `PORTAL.fadeIn` 1.0 s. On
`false`, or after `ARRIVAL.readyTimeout` 15 s, it sends `failed` or `timeout`. In `leaving`, the driver restores the
diorama under the layer, then fades it over `PORTAL.fadeOut` 0.8 s and sends `left`. The hint is still there after a
failed entry, because the pointer runs again in `diorama`. The frame step is capped at `ARRIVAL.maxDt` 0.1 s.

(f) **The way back, exact.** On the first `leaving` frame, before the render: with the controls' damping off, one
`update()` applies and clears the residual delta, then `reset()` puts back the saved target and position, the camera's
fov, near and far are put back and the projection updated, and damping is turned on again. The controls are enabled
again on `left`. The test reads the pose the frame after `left` and 0.5 s later: both equal the saved pose within 1e-6.

(g) **The sky.** While the street is mounted, the sky takes `home = skyHome` and the street's anchor, the same values as
`?street=1`. In every other place it takes today's diorama values. The swap happens under the layer.

(h) **The pointer.** A hook `usePortalPointer` with its own listeners on the element R3F connects events to. A move
marks the pointer, and one cast per frame tests it against the village's three meshes with the land's targets and
occluders (`landPick` with the village meshes as the targets). Over the village the canvas's cursor is `pointer` (the
hand) and a DOM hint, "Enter the village", sits beside the pointer. The first hover over the village starts
`import('./Street')`, so the chunk loads before the click. A tap (`classifyGesture`) whose cast lands on the village
sends `enter`. A drag never enters. A touch has no hover: the tap alone enters.

(i) **The seam with touch.** `useTouchInput` gains `skyMasked?: (clientX: number, clientY: number) => boolean`. On a tap
it returns before the sky's surge when `skyMasked` says so. The portal passes its own cast: true over the village while
the portal is on. A hover over the village still surges the sky, as the design says. A tap on a tree in front of a house
lands on the tree first, so it stays D1's bend and does not enter.

(j) **The dock and the keys.** `VisitorChrome` gains `portal?: { place, onEnter, onLeave, onPrefetch }`. On the
diorama the dock shows "Enter the village" (icon `⌂`). In the street it shows "Back to the painting" (icon `↩`). It is
disabled in `flying`, `entering` and `leaving`. Its pointer-enter and focus prefetch the chunk. Escape in `street` leaves.

(k) **Reduced motion.** Under the system setting (`still`) there is no flight and no fade. `enter` goes straight to
`entering`. The layer takes the current frame, the street mounts under it, and the layer is hidden at `ready`. The
return is the same cut. Under the visitor's pause alone, the flight flies: the visitor asked for it.

(l) **The flag.** `?portal=1` turns the portal on: the pointer, the hint and the dock's control. Without it nothing in
the diorama changes. After Mark's gate the default flips, with `?portal=0` to turn it off, as A, B and C did.

## Global constraints

- The locked bar, gates, acceptance criteria and out-of-scope sections of `CLAUDE.md` do not change.
- The camera criterion as Mark applied it on 2026-10-25: inside a portal scene an authored path may leave the orbit
  limits. The flight is that path. The visitor never moves the camera off it.
- No new dependency. British English. Conventional commits ending with the session line.
- The diorama does not change: with no pointer, its frames at home are byte-identical to the church head's.
- `?street=1` does not change: the church's gate frames at stops 0 to 4 stay byte-identical.
- The home page does not grow beyond the portal's own code: the street stays in its lazy chunk.
- Nothing is pushed. Mark's gate is on captures and the live LAN URL.

## Review focus

1. A click on the village while the visitor is also dragging (a press that becomes an orbit): it must not enter.
2. Escape or the back control pressed during the flight or the entering fade: nothing happens, and the dock's control is
   disabled.
3. A resize or a rotation in the street or during the flight: the saved pose is the diorama's, so the return restores
   the pose for the aspect the visitor left from, and the controls' home for the new aspect is today's rule.
4. A hidden tab during the flight: the step cap holds, the flight ends in at most 25 frames after return.
5. A street that fails (`?streetFail=painting`): the visitor is back on the diorama at the saved pose, not left on the
   flight's last frame.

## Tasks

### Task 0: the baselines

- [ ] Captures at the church's head, before any portal code: the diorama's home on both viewports at times 0 and 5
  (`?arrival=0`), and the street at stop 0 on both viewports at time 0 (`?street=1&station=0`). The build's main chunk
  size from `npm run build`. Evidence: `scratch/street-portal-2026-10-25/t0/`.

### Task 1: the places and the flight (`portal.ts`)

**Files:** create `src/scene/portal.ts` and `scripts/portal.test.ts`. Add the test to `test:sky`.

**Interfaces:** `PORTAL = { flight: 2.4, fadeIn: 1.0, fadeOut: 0.8, settleFrames: 2, flightEnd: { position: [0.9, 0.35,
1.5], target: [0.4, 0.1, 0.2] } }`. `type PortalPlace`, `type PortalEvent = 'enter' | 'flown' | 'ready' | 'failed' |
'timeout' | 'leave' | 'left'`, `portalStep(place, event, { still }): PortalPlace`, `flightPose(from: Pose, to: Pose, s:
number): Pose` with `Pose = { position: [x, y, z], target: [x, y, z] }`, `streetMounted(place)`,
`dioramaVisible(place)`, `controlsEnabled(place)`.

- [ ] Tests first: every row of decision (a)'s table, every other pair unchanged, `enter` under `still` to `entering`.
  `flightPose` at `s` 0 and 1 equals the two poses exactly, and its path is monotone in distance to the end.
  Clearance: from each corner of the orbit's limits (azimuth −15° and 45°, polar 0.58 and 1.62, distance 3.25 and 5.6,
  about each home's target) and from both homes, every sample of the path stays at least 0.15 above
  `islandHeightAt` and at least 0.5 from the cypress's axis. `flightEnd` equals v2's pose.
- [ ] The module, then the tests green. Commit.

### Task 2: the street's readiness, per mount

**Files:** `src/scene/Street.tsx` (`onReady`), `src/scene/DioramaExperience.tsx` (`StreetBoundary` takes `onFailed`, the
street's own `Suspense`).

- [ ] `onReady` fires once per mount. `__streetReady` is written as today. With `?street=1` no caller passes `onReady`.
- [ ] Check: the church's gate frames at stops 0 and 4 on both viewports are byte-identical to `t5/gate/frames/`.
  Commit.

### Task 3: the place in the scene, the driver and the layer

**Files:** `src/App.tsx` (the flag, the reducer), `src/scene/DioramaExperience.tsx` (`place` and `dispatch` props, the
diorama in a group, the controls by place, the sky's home and anchor by place, the touch hook by place, a
`PortalDriver` at priority −2, the layer canvas), `src/index.css` (the layer).

- [ ] The driver as decisions (c) to (g) and (k) say. Seams: `window.__portal()` returns `{ place, layer: opacity,
  saved }`, and `window.__portalEnter()` and `window.__portalLeave()` act as the dock does.
- [ ] Check by hand on the dev server: enter, the flight, the street, Escape, back at the pose. Commit.

### Task 4: the pointer, the hint and the seam

**Files:** create `src/scene/usePortalPointer.ts`, change `src/scene/useTouchInput.ts` (`skyMasked`),
`src/scene/DioramaExperience.tsx` (the hint), `src/index.css` (the hint).

- [ ] As decisions (h) and (i) say. A seam `window.__portalPick(x, y)` returns `'village' | 'land' | null` for a client
  point, so the check can find a house and a tree on screen. Commit.

### Task 5: the dock and the keys

**Files:** `src/VisitorChrome.tsx`, `src/App.tsx`.

- [ ] As decision (j) says. Commit.

### Task 6: the checks

**Files:** create `scripts/check-portal.mjs`.

- [ ] The cases:
  1. A hover over a house gives the `pointer` cursor and the hint. A hover over the sky gives neither.
  2. A tap on a house goes `flying`, `entering`, `street` within 15 s. The camera is at stop 0's pose, and the sky's
     anchor is the street's.
  3. Escape goes back to `diorama`. The pose equals the saved one within 1e-6 the frame after and 0.5 s later.
  4. The dock's control does the same both ways.
  5. `?streetFail=painting`: the visitor ends on `diorama` at the saved pose.
  6. Reduced motion: no frame between the two poses. The layer is hidden at `ready` with no fade.
  7. With touch on, a tap on a house enters and adds no sky surge. A tap on a tree adds a land touch and does not
     enter. A drag over a house does not enter.
  8. Escape and the dock during `flying` change nothing.
  9. The street through the portal at stop 0 against `?street=1` at stop 0, clocks pinned. The check reports the
     differing pixels, and the record names the cause of any above 0.
- [ ] The diorama with `?portal=1` and no pointer against Task 0's home captures: byte-identical.
  `check-reduced-motion.mjs` passes. The main chunk's size against Task 0's.
- [ ] Commit.

### Task 7: the look passes

- [ ] Captures of the flight at `s` 0, 0.25, 0.5, 0.75 and 1 on both viewports, the layer half faded, the street after
  the fade, and the return half faded. The Lead reads them for a jump, a frame of the wrong scene, a seam at the layer's
  edge and a flight that reads as a cut or as too slow. The knobs are `PORTAL.flight`, the ease, `flightEnd` (never
  closer than v2) and the two fades. At most four passes. Each pass goes in the record with its captures.

### Task 8: the gate, the review and the record

- [ ] The suite, `tsc -b`, lint, the build. Task 6's checks. The church's gate frames unchanged. Perf: the street at
  stop 0 through the portal and through `?street=1`, five rounds each, alone, beside each other. The diorama's home
  through the portal's return against Task 0's.
- [ ] The branch review (Codex, or the Consultant when Codex is low), every finding answered in the record. The record
  `tasks/2026-10-25-street-portal.md`, the Tunables entry, lessons, the todo pickup. The live LAN URL and the captures
  for Mark.
