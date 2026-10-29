# Vincent's wander, the slice: the plan, revision 3 (2026-10-29)

> **For agentic workers:** a Sonnet `builder` builds Tasks 1 and 2, the Lead the rest. Steps use checkboxes.

**Goal:** a tap on open ground in the street sends Vincent there and back, with the spike's four faults fixed, on for
every visitor.

**Architecture:** the spike's pure module `streetWander.ts` grows into the slice's. It decides where he may stand,
which trips he may make, and where the camera sees him, and it steps him and his pose. `StreetWalk.tsx` calls it each
frame and turns the camera's aim. His ground position is module state, so the grass bends under him wherever he is.

**Tech stack:** three.js, React Three Fiber, `node --test` for the pure parts, raw CDP for the browser checks.

**Spec:** the spike's design draft and its look pass (`tasks/2026-10-28-vincent-wander-spike.md` on
`spike/vincent-wander`, `74d8856`). Mark's read of its preview, 2026-10-28 18:00: "The wondering links feels okay!"
Mark's call, 2026-10-29 09:58: make it a slice.

**Revision 1** answered Codex's F1 to F8 (`scratch/vincent-wander-2026-10-29/review/codex-plan-r0.md`) and the
builder's A1 to F (`review/builder-plan-r0.md`). Revision 0 is `review/plan-r0.md`. **Revision 2** answers Codex's
confirmation read (`review/codex-plan-r1.md`): N1, an interrupted return that took an unchecked shortcut, N2, the yaw
at the return's end, and F8's two browser controls. The main change: he keeps the points each leg began at, and he goes
home back through them, so every leg home is a leg already checked, walked backwards. **Revision 3** answers the one
item Codex's closing read left open (`review/codex-plan-r2.md`): the sight guard's browser tap was off the canvas on
the phone, so the phone's run picks its own point.

## The locked criterion, and how this slice reads it

CLAUDE.md's acceptance criteria: inside a portal scene "an authored camera path may leave [the orbit limits]: the
portal's flight, and the walk along the scene's path. The visitor moves the camera only along that path, never off it."

This slice reads it as the spike did. **The camera's position stays on the walk's rail** (`walkPose(t).position`) on
every frame. Only its **aim** turns toward Vincent, by at most 20°. This is a reading of the criterion, not an edit to
it. Codex's review of revision 0: "The plan's positional reading holds." The gate record repeats it for Mark.

## Mark's call

- **He walks back on his own** (Mark, 2026-10-29: "Yes, walk him back after the dwell"). On the automatic walk he
  goes home after V1's dwell. Decision (p), built in Task 2b.

## Decisions

- (a) **On for every visitor.** `?wander=0` turns it off. Once he is on the lane and the aim has eased to 0 (decision
  (k)), the camera, the walk and the figure are as on `main`.
- (b) **Follow, 20°, as constants.** `WANDER.aimMax` 20 (degrees). The spike's URL knobs `wanderCam` and `wanderAim`
  go. While he is off the lane, the camera's `t` is `followT`: the walk's `t` at the tap plus the change in his lane
  coordinate since then, inside `WALK_T`. The spike set it to his lane coordinate less the rig's 0.4. `laneParam`
  stops at `t` 1.0 (`streetLayout.ts:91`), so from camera `t` 0.833 that pulled the camera back in one frame (the
  builder's A1: at stop 4, about 0.16 world units). A change is 0 at the tap, so the first frame cannot move it.
- (c) **The trip** (Codex F3 and N1). `route` holds the points home: `route[0]` is his lane slot when he left, with
  the walk's `t` then (`t0`), and the last entry is where the leg he is on began.
  - A tap he may take, from where he stands (Q), pushes Q onto `route` and sends him from Q to the point. From the lane,
    Q is his lane slot and `route` is `[Q]`. Q lies on a leg already checked, so Q to `route`'s last entry is checked.
  - Going home (a wheel turn, an arrow key, a tap on the lane), he walks to `route`'s last entry, pops it, and goes on
    to the next. Every leg home is part of a leg he walked out, walked backwards. Nothing is pushed.
  - A tap is accepted only if its one new leg, Q to the point, passes (d) and (f). The legs home need no new test.
    The ground test and the sight test read only the points on a leg (`followT` reads only the point), so a leg walked
    backwards passes as it passed walked out, at the samples' spacing.
  - `route` holds at most `WANDER.hops` entries. A tap that would push one more does nothing.
  - When he reaches `route[0]`, the follow camera is back at `t0`, and the return ends (h).
- (d) **Where he may stand, and which legs he may walk** (fault 2, the sparse verge, and fault 3, the square).
  - Three grounds: the spike's verge (the grass's footprint off every clearing), K3's door paths (`pathClearings()`),
    and the square's disc (`STREET_SQUARE`).
  - On none of them: the lane's strip (`onLane`: `|laneOffset| ≤ WANDER.laneHalf`), a house grown by `GRASS.house`
    (`insideHouse`, hoisted from `grassChunks`, not `isExcluded`, which also excludes the square), a door step
    (`stepClearings()`), a wall (`wallClearings()`), an object (`objectClearings()`), the cypress (`GRASS.cypress`),
    the church's nave and its belfry (a square of the belfry's `width`) grown by `WANDER.margin`, a lamp post within
    `WANDER.post`, a frog within `WANDER.frog`, a street tree's trunk within `WANDER.trunk`.
  - A leg passes if every `WANDER.step` sample, the end included, is standable or on the lane, and the leg crosses
    none of the garden rail's four chains. The chains move from `gardenRail` (`streetGeometry.ts:1542`) to
    `railChains()` in `streetLayout.ts`: the same local `(a, k)` pairs and the same door frame, with `gardenRail`
    reading them and its own `point()` unchanged. The street's build hash does not change. Codex probed the world
    end points too and found them equal, but the local pairs keep the build's arithmetic as it is.
- (e) **A tap on the lane comes first** (Codex F2). The square's disc covers the lane at stop 4, so the order matters.
  A tap within the lane's strip sends him back if he is off the lane, and does nothing if he is on it. Only a tap off
  the strip can send him out. `standable` excludes the strip, so the two never overlap. From `t` 0.825 his slot itself
  is off the strip, so off the lane a tap within `laneHalf` of `route[0]` also sends him back there (Fable F1, PR #37).
- (f) **Where the camera sees him** (fault 4, the gable, and Codex F6). Every leg is sampled every `WANDER.sightStep`,
  the end included. At each sample the eye is `walkPose(followT(sample), portrait).position`. Two tests at each
  sample:
  - `hidden`: three ground lines go from the eye to the sample and to the sample ± `VINCENT_RIG.halfWidth` across the
    line of sight. A line that meets a house footprint grown by `WANDER.eave`, or the church's grown by
    `WANDER.margin`, hides him. The test is the exact segment against the oriented box, not samples. The eye (0.09) is
    at or below every eave (0.09 to 0.3), so a crossing is an occlusion.
  - `inFrame`: from the same pose, its aim turned toward him by up to `WANDER.aimMax`, his bearing is within the
    horizontal half-field less `WANDER.frameMargin`. The half-field comes from the live camera's `fov` and `aspect`.
- (g) **The lantern in the grass** (fault 1). Two existing parts, measured before either is tuned:
  - His feet bend the grass where he stands, not at his lane slot. `StreetGrass.tsx:511` reads `vincentPlace(walkT)`
    today, so off the lane the trail is stamped on the lane.
  - Once he has arrived and rested `PAUSE.rest`, he raises the lantern as at a station: `turn` eases toward 1 at
    `PAUSE.turnIn`, and his pose is `turnPose(turn)` with `body` 0. There is no house front to turn to.
- (h) **No snaps** (the builder's B1 to B3).
  - A tap during a station's dwell: his drawn yaw (the slot's yaw plus `turnPose(turn).body`) becomes the trip's
    starting yaw, and `turn` eases toward 0 at `PAUSE.turnOut`. Off the lane `body` is 0, so the figure does not jump.
  - He does not move while `turn` is at or over `PAUSE.turnGate`, his position as well as his limbs.
  - His yaw turns toward his heading at `WANDER.turn`.
  - `syaw` is his lane slot's own yaw at `t0` (`vincentPlace(t0).yaw`), unturned, not the drawn yaw he set out with
    (Codex N2). At `route[0]` he lowers the lantern first: `turn` eases to 0, as it does before every leg. Then he
    turns in place to `syaw`. The return ends once his yaw is within `WANDER.yawSnap` of `syaw` and `turn` is 0. The
    lane then takes him with `pause = { dwell: 0, rest: 0, turn: 0, last }` (`last` kept), so its first frame draws
    `turnPose(0)` at the slot's yaw: the pose of his last frame off the lane. If he then stands still, the lane's own
    rule turns him again after `PAUSE.rest`, as on `main`.
- (i) **His height.** His figure stands at 0 off the lane, as on the lane. On `main` he already stands at 0 inside the
  square from camera `t` 0.75, 0.0064 under the strokes' top (`review/lead-probe-square.log`), and V1 passed so. The
  mark on the ground stands at `SQUARE_TOP + 0.001` on the square and at 0.002 elsewhere (Codex F5). Stop 4's look pass
  checks his feet and the mark.
- (j) **The tap box follows him** (Codex F4, the builder's A2). Off the lane, his tap box is built from his wander
  position and yaw, not his lane slot. `vincentBoxCorners(t)` becomes a call to `vincentBoxCornersAt(position,
  forward)` with `vincentPlace(t).position` and `walkTangent(tv)`'s `(tx, tz)` as today, so the lane's box is the same
  to the bit. Off the lane, `forward` is `(sin yaw, cos yaw)`.
- (k) **The aim** (Codex F7). It eases toward its target with τ `WANDER.aimEase` and snaps to it within
  `WANDER.aimSnap` rad. On the lane its target is 0. Under reduced motion or the still state it is set to its target
  at once.
- (l) **Reduced motion and the still state.** A tap does nothing. If he is off the lane, he stands where he is, his turn
  held. His limbs stand at rest and the lantern hangs still, as V1's (i) draws him on the lane. When either ends, he goes
  on. (Wording clarified in the branch review's round 1: "his pose" meant his place and his turn, not a stride held
  mid-step. Codex F3.)
- (m) **Input.** A wheel turn or an arrow key while he is off the lane sends him back, and the queued wheel is dropped,
  as in the spike. Escape and "Back to the painting" unmount the street, and a second entry starts him on the lane.
- (n) **The capture seams.** `__vincentForm().settled` is false while he is off the lane and moving, while `turn` is
  between 0 and 1, while his yaw turns, and while the aim is not at its target. `__wanderTo(x, z)` runs `wanderTo`
  with no sight tests, for captures. `__wander()` reports `{ mode, x, z, tx, tz, route, arrived, turn, aimDeg, view }`, `view` being the `View` a tap
  would use now.
- (o) **The lint fix**, done in Task 0 (`46d0d0b`): `globalIgnores(['dist', 'scratch', '.claude'])`. `eslint .`
  walked into repo copies under `scratch/` and builder worktrees under `.claude/worktrees/`. Each carries its own
  `eslint.config.js`, and typescript-eslint then failed every file with a parsing error.

- (p) **The automatic walk takes him home after the dwell** (Mark, 2026-10-29).
  - `stepWander(s, dt, frozen, autoOn)`. `autoOn` is true while the automatic walk runs, by `stepPause`'s own test.
    That test moves into `streetWalk.ts` as `autoOn(prev: WalkState, i: WalkInput): boolean`, and `stepPause` calls
    it.
  - Going, at his tap, with `autoOn`: once `arrived` reaches `PAUSE.dwell - PAUSE.endTurn` (3.55 s), the mode becomes
    `returning` with `arrived` 0, as a lane tap makes it. The lantern lowers at `PAUSE.turnOut`, and he walks the route
    home as in (c) and (h). The lane then takes him at `t0`, and the automatic walk goes on from there. At a station,
    `last` is kept, so that station does not dwell again.
  - At a station he faces the lane again `PAUSE.endTurn` before the dwell ends. Here the lantern lowers from 3.55 s,
    and he moves once `turn` is under `PAUSE.turnGate`, about 0.24 s later.
  - A new tap starts the count again, because `wanderTo` sets `arrived` to 0.
  - Without `autoOn` (the input mode, or the walk stopped by a tap on him), he stays until a lane tap, a wheel turn or
    an arrow key, as before. If the walk starts again with `arrived` past 3.55 s, he goes home at once.
  - Frozen, `arrived` does not grow, so reduced motion and the still state are as in (l).

## Values

```
WANDER = {
  speed: WALK.auto * STREET.pathLength,  // the spike's, about 0.19 world units a second
  arrive: 0.004, step: 0.01, aimEase: 0.4, laneHalf: 0.06, turn: 9,  // the spike's
  aimMax: 20,          // degrees (b)
  aimSnap: 1e-4,       // rad (k)
  sightStep: 0.02,     // world units between the sight samples (f)
  margin: 0.02,        // the church's footprint grown by (d)
  post: 0.015,         // a lamp post's keep-off radius (d)
  frog: 0.02,          // a frog's keep-off radius, about twice its size 0.0108 (d)
  trunk: 0.03,         // a street tree's keep-off radius round its centre (d)
  eave: 0.03,          // the footprint growth for the sight test, the painting houses' eave (f)
  frameMargin: 4,      // degrees inside the horizontal half-field (f)
  yawSnap: 1e-3,       // rad, his yaw within this of `syaw` ends the return (h)
  hops: 8,             // the most entries `route` holds (c)
}
```

Every new value is a first guess. The look passes may move them, and each move goes into the record.

## Global constraints

- Branch `feat/vincent-wander`, its Task 0 commit `46d0d0b` off `8c3f9a5`. The Lead's worktree is
  `/private/tmp/claude-502/-Users-markma-Projects-starry-night/7b901d75-9d6a-49c2-8abd-525273745dfd/scratchpad/wander-wt`.
- `$E` = `/Users/markma/Projects/starry-night/scratch/vincent-wander-2026-10-29` (ignored by git). `$T` =
  `/Users/markma/Projects/starry-night/scratch/village-craft-2026-10-25/tools` (the hash and gate tools).
- The green step, in every task: `npx tsc -b`, `npm run -s lint`, `npm run -s test:sky`, then both hashes:
  `WT=$PWD node $T/build-hash.ts` and `WT=$PWD node $T/grass-hash.ts`, run with `node`, never `npx tsx`. Each output
  to `$E/t<n>/green-<name>.log`. Expected: all pass, the build hash `5492d517c80ba56e` (596,919 triangles), the grass
  hash `33504d291c27e9ac` (240 chunks, 14,986 blades). Both read on `main`'s code on 2026-10-29 (`$E/base/`).
- No new dependency. No change to the grass's layout, the street's build or the lane walk.
- A builder's worktree starts from `main`. It runs `git switch -c <branch> <base>` first, with the base its brief
  names. It links the dependencies one entry at a time:

  ```
  M=/Users/markma/Projects/starry-night
  mkdir node_modules
  for e in $M/node_modules/* $M/node_modules/.[!.]*; do [ "$(basename "$e")" = .tmp ] || ln -s "$e" node_modules/; done
  ln -s $M/reference/derived reference/derived
  ```

  It never installs, never pushes, and commits on its own branch only. It writes its evidence under `$E`, an absolute
  path outside its worktree. The Lead gates the branch and merges it.
- A builder's worktree has no dev server. The Lead runs every browser check.
- The spike's code is read by path (`git show spike/vincent-wander:<path>`), never cherry-picked: its commits carry
  `tasks/` files from an older base. Its `StreetWalk.tsx` predates `63631c5` and the hat's two commits, so it is ported
  by hand onto `main`'s file.

## Review focus

1. **A tap on Vincent, or a press and a drag in the grass, never sends him.** Only a tap (300 ms and 8 px) that misses
   his box sends him. Task 2's browser case taps him off the lane, and taps his old lane slot.
2. **A tap during a trip.** While he is going or returning, a standable tap sends him on, and a lane tap turns him back.
   Task 1 pins both.
3. **The portal's way back while he is off the lane.** A second entry starts him on the lane. Task 2's portal case.
4. **The phone.** A finger tap sends him, and the automatic walk stands still while he is off the lane. Task 2's case
   runs on the phone viewport with touch.
5. **The frogs.** He never stands on one, and a leg through one is refused. Task 1 tests each frog.

---

### Task 0 (Lead, done): the branch and the lint fix

`46d0d0b`. The red and green logs are `$E/t0/lint-proof.log` and `$E/t0/lint-claude-proof.log`.

### Task 1 (builder): the pure module

**Files:**
- Create: `src/scene/streetWander.ts` (the spike's, extended), `scripts/street-wander.test.ts` (the spike's, extended)
- Modify: `src/scene/streetGrass.ts` (hoist `insideHouse` out of `grassChunks` and export it),
  `src/scene/streetLayout.ts` (`railChains`, `vincentBoxCornersAt`), `src/scene/streetGeometry.ts` (`gardenRail`
  reads `railChains`), `src/scene/streetMode.ts` (the flag), `scripts/street-mode.test.ts`, `package.json` (`test:sky`
  lists the new file)

**Interfaces:**
- Produces, in `streetWander.ts`:
  - `WANDER`, the values above.
  - `onLane(x, z): boolean` and `standable(x, z): boolean`, decisions (d) and (e).
  - `clearLeg(ax, az, bx, bz): boolean`, decision (d)'s leg test.
  - `followT(s: WanderState, x: number, z: number): number`, decision (b): `s.t0 + laneParam(x, z)[0] − s.lane0`,
    clamped to `WALK_T`.
  - `hidden(eyeX: number, eyeZ: number, x: number, z: number): boolean` and `inFrame(pose: StationPose, x: number,
    z: number, halfFovDeg: number): boolean`, decision (f).
  - `legSeen(s: WanderState, ax, az, bx, bz, view: View): boolean`, decision (f) over one leg's samples.
  - `type View = { portrait: boolean; halfFovDeg: number }`.
  - `wanderTo(s: WanderState, here: Here, x: number, z: number, view: View | null): WanderState | null`. `here` is his
    current place: his lane slot and the walk's `t` and yaw when on the lane, else his wander position. `view` null
    skips the sight tests (the capture seam). It returns `null` when the tap does nothing. From the lane it sets the
    trip's `route`, `t0`, `lane0` and `syaw` from `here` with `tripFrom` before it tests the leg.
  - `tripFrom(here: Here): WanderState`, the trip a tap from the lane starts: `route` `[here]`, `t0` `here.t`,
    `syaw` `here.yaw`.
  - `type Here = { x: number; z: number; yaw: number; t: number }`.
  - `type WanderState = { mode: 'lane' | 'going' | 'returning'; x; z; yaw; tx; tz; route: [number, number][];
    syaw; t0; lane0; walked; arrived; turn }`. `lane0` is `laneParam(...route[0])[0]`. `arrived` is 0 while he
    walks and on the frame he arrives, then grows by `dt`. `wanderTo` resets it to 0.
  - `stepWander(s: WanderState, dt: number, frozen: boolean): WanderState`, decisions (c), (g), (h) and (l). A frozen
    step returns `s` unchanged.
  - `offLanePose(turn: number)`: `turnPose(turn)` with `body` 0.
  - `aimAngle` and `turnTarget` as the spike's. The spike's `aimToward` goes, and its test uses the two.
- Produces, in `streetLayout.ts`: `railChains(): { frame: ReturnType<typeof doorStepFrame>; chains: [number,
  number][][] }`, the four chains in the door frame's `(a, k)`. `vincentBoxCornersAt(position: [number, number,
  number], forward: [number, number]): [number, number, number][]`.
- Produces, in `streetMode.ts`: `StreetFlags.wander: boolean`, true unless `wander=0`.

- [ ] **Step 1: Write the failing tests** in `scripts/street-wander.test.ts`. Keep the spike's five, renamed. Add these.
  Each assertion that a leg fails first asserts that both its ends are standable or on the lane.
  - `standable: the door paths, but not where a hard exclusion is`: on every leg in `pathClearings()`, a sample point
    clear of every exclusion in (d) is standable. L1's path midpoint, 0.0073 from the cypress (Codex F1), is not.
  - `standable: the square, the church and the lane's strip`: the square's centre is standable. For each corner of the
    turned nave inside the disc, the point 0.01 outside the corner, along the nave's diagonal, is not, and the point
    0.03 outside it is. The belfry's centre is not. `pathPoint(0.98)` is on the lane and not standable (Codex F2).
  - `standable: lamp posts, frogs and trunks`: each lamp's `laneAt(t, lateral)` is not standable, nor a point 0.01 from
    it. Each frog's `frogPlace` position is not, nor a point 0.015 from it. Each tree's centre is not.
  - `clearLeg: the rail and the frogs`: a leg from a standable verge point outside L2's rail to a standable point in its
    garden, across a chain, fails. A leg from the lane through the gap's middle to the same point passes. For each frog
    whose two neighbours 0.04 either side along the lane are standable, the leg between them fails.
  - `hidden: half behind a gable`: a sample whose centre line misses a house's grown footprint and whose `+halfWidth`
    line meets the grown footprint but misses the bare one is hidden. With `WANDER.eave` taken as 0, it is not.
  - `inFrame: the turned aim's field`: from `walkPose(0.23, false)` with a half-field of 40°: on the aim's line, true. At
    55° from the aim, true. At 60°, false. At 180°, false.
  - `wanderTo: the new leg is checked` (Codex F3, F6, F8, N1). Codex's fixtures, with a view
    `{ portrait: false, halfFovDeg }` from a 1440 × 900 camera at the walk's `fov`:
    - from `t` 0 (stop 0), A = `(-0.46913668405284825, -0.428633501576554)`: accepted, `route` is `[slot]`.
    - from `t` 0.06, `(-0.3595866636762092, -1.417455216001235)`: refused, a middle sample hidden by L3.
    - from `t` 0.23, `(-0.2923531248524448, -1.1919155133212136)`: refused at the leg's last sample.
    - from `t` 0.44, `(0.5412437098392479, -1.4405122792319607)`: refused at the leg's last sample.
    - Codex's N1: from `t` 0 to A, then at A a tap at B = `(-0.39455759959990633, -0.4873421896262576)`, accepted,
      `route` `[slot, A]`. Step 60% of the way to B, then send him home (`mode` `returning`). Step to `lane`. On every
      frame his position is standable or on the lane, and more than `WANDER.post` from the lamp at `t` 0.24. One
      frame is within `WANDER.arrive` of A.
    - After `WANDER.hops` accepted taps, one more standable tap gives `null`.
    If the builder's run shows a fixture accepted or refused for another reason than its line names, it reports the
    reason and does not change the assertion.
  - `wanderTo: the lane first, and taps during a trip`: at stop 4 from `lane`, a tap at `pathPoint(0.98)` gives `null`.
    From `going`, the same tap gives `returning`. From `returning` at (x, z), a standable tap gives `going` from (x, z),
    with (x, z) pushed onto `route` and `route[0]` unchanged.
  - `followT: no jump at the tap, none at stop 4`: `followT` at `route[0]` returns `t0` within 1e-9, for `t0` 0.23 and
    0.9.
  - `stepWander: arrival, rest, raise and return`: `arrived` is 0 on the arrival frame. `turn` stays 0 until `arrived`
    passes `PAUSE.rest`, then reaches 1 within `PAUSE.turnIn` + 2 frames. From `turn` 1, he does not move until `turn`
    falls under `PAUSE.turnGate`. A frozen step returns its input.
  - `stepWander: from a full dwell and back` (Codex N2): at stop 1 (`t` 0.23) with the lane's `turn` 1, a tap gives
    `yaw` = `vincentPlace(0.23).yaw + turnPose(1).body` and `turn` 1, so the first frame off the lane draws the lane's
    last pose. Send him out and home. The trip ends `lane` at `route[0]` with `yaw` within `WANDER.yawSnap` of
    `vincentPlace(0.23).yaw` and `turn` 0. The frame before it draws the same yaw, head and raise as `turnPose(0)`
    at the slot's yaw, the lane's first frame.
  - In `street-mode.test.ts`: `wander` is true for `?street=1`, false for `?street=1&wander=0`.
- [ ] **Step 2: Run** `node --test scripts/street-wander.test.ts scripts/street-mode.test.ts`. Expected: FAIL, the new
  names undefined.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the green step and both hashes, to `$E/t1/`. Expected: all pass, both hashes unchanged.
- [ ] **Step 5: Commit** on the builder's branch: `feat(street): where Vincent may stand, walk and be seen (the wander, Task 1)`

### Task 2 (builder): the wander in the scene

**Files:**
- Modify: `src/scene/StreetWalk.tsx`, `src/scene/StreetGrass.tsx`, `src/scene/streetWalk.ts` (the shared ground
  position), `scripts/check-street-walk.mjs` and `scripts/check-portal.mjs` (new cases, run by the Lead)

**Interfaces:**
- Consumes: Task 1's module and flag.
- Produces, in `streetWalk.ts`: `export let vincentGround: [number, number] | null` and `setVincentGround(p)`, as
  `streetGesture` is. `StreetWalk`'s frame loop writes it every frame, his lane slot or his wander position, and sets
  it null on unmount. `StreetGrass` reads it for his feet and falls back to `vincentPlace(walkT)` when it is null. It
  breaks the trail's segment when he moves more than 0.12 between frames (the old jump of 0.05 in `t`).

- [ ] **Step 1: Port the spike's wiring** onto `main`'s `StreetWalk.tsx`, with the names of Task 1: the ground cast,
  the tap branch with `wanderTo` and a `View` from the live camera, the frame loop's off-lane branch with `stepWander`,
  `followT` and `offLanePose`, the aim, the mark, the tap box from `vincentBoxCornersAt` off the lane.
- [ ] **Step 2: Wire** decisions (k) to (n), and `vincentGround`.
- [ ] **Step 3: Write the browser cases** (CDP `Input.dispatchMouseEvent` on desktop, `Input.dispatchTouchEvent` on
  the phone viewport). The check imports `standable`, `wanderTo` and the layout from `../src/scene/` (node strips the
  types) to choose its points, and projects them with `__walkProject`. In `check-street-walk.mjs`, case `wander`:
  - at stop 1, a tap on a standable point that `wanderTo` accepts sends him (`mode` `going`), and he arrives within
    trip length / speed + 1 s.
  - a tap on a house's wall at stop 1 leaves `mode` `lane`.
  - with him off the lane, a tap on his figure toggles the walk and leaves him there. A tap at his old lane slot, off
    his figure, does not toggle the walk (`__streetWalk().auto` unchanged) and sends him back.
  - the sight guard, on each viewport (Codex F8). A point qualifies if it projects inside the canvas by at least
    24 px, lies outside `__vincentBox()`, is refused by `wanderTo` with `__wander().view`, and passes `legSeen` with
    the leg's last sample left out (the leg ending one `WANDER.sightStep` short). On desktop at stop 2 the point is
    Codex's `(0.5412437098392479, -1.4405122792319607)`, and the check asserts it qualifies. On the phone it is off the
    canvas (Codex r2: x NDC 1.078 at 390 × 844), so the check searches the verge at stop 2 on a 0.01 grid, then stops 1
    and 3, takes the first point that qualifies, and prints it. No point at any of the three stops fails the case.
    Tapped for real, `mode` stays `lane` and `__streetWalk().auto` is unchanged. The mutation that drops the last
    sample turns both viewports red.
  - the trail at his feet (Codex F8): send him to a verge point at least 0.1 from his lane slot. Once he has arrived,
    `__grassPushNear` at his position is over 0. At 6 s or more after he left the slot (the trail closes 4 to 5 s
    after a release, D1), it is 0 at the slot and still over 0 at his position. The hand stays off the canvas.
  - a wheel turn returns him: `mode` `lane` at `route[0]`, and the walk then moves `t`.
  - with him walking off the lane, the Pause control (`still`) on: his position and the camera's matrix hold over 1 s.
    Off: he goes on and arrives. Then the same with reduced motion turned on by `Emulation.setEmulatedMedia`.
  - every read of `settled` waits for it, never a fixed sleep, and once it is true the camera's matrix holds over the
    next 10 frames.
  - In `check-portal.mjs`, case `wander-remount`: enter the street, send him off the lane, Escape, enter again:
    `__wander().mode` is `lane` at the second entry.
- [ ] **Step 4: Run** the green step and both hashes, to `$E/t2/`. Expected: all pass, both hashes unchanged.
- [ ] **Step 5: Commit**: `feat(street): Vincent's wander, a tap on open ground sends him there (Task 2)`
- [ ] **Step 6 (Lead): Run** `check-street-walk.mjs`, `check-street-grass.mjs`, `check-portal.mjs` and
  `check-reduced-motion.mjs` from wander-wt on its own port. Expected: all pass, the new cases included.

### Task 2b (Lead): home after the dwell, decision (p)

**Files:** Modify `src/scene/streetWalk.ts` (`autoOn`), `src/scene/streetWander.ts` (`stepWander`),
`src/scene/StreetWalk.tsx` (the call). Tests: `scripts/street-wander.test.ts`, `scripts/street-walk.test.ts`,
`scripts/check-street-walk.mjs`.

- [ ] **Step 1: Write the failing tests.**
  - `stepWander: the automatic walk takes him home after the dwell`: at stop 1 (`t` 0.23), a tap on a standable point,
    stepped at 1/60 s with `autoOn` true. The mode stays `going` while `arrived` is under
    `PAUSE.dwell - PAUSE.endTurn`. On the first frame that would carry it there, the mode is `returning` with `arrived`
    0. The trip ends `lane` at `route[0]`, with the N2 test's yaw and `turn`.
  - The same with `autoOn` false: after 10 s at the spot, the mode is `going` and `turn` 1.
  - Frozen with `autoOn` true, past 3.55 s: the step returns its input.
  - `autoOn` in `street-walk.test.ts`: true only with `auto` and `autoMode` true and `paused` and `still` false.
  - In `check-street-walk.mjs`, case `wander`, the phone: after a real tap, `__wander().mode` is `lane` within
    `PAUSE.dwell` plus the trip both ways at `WANDER.speed` plus 3 s, and `__streetWalk().t` then grows over 1 s. The
    desktop (input mode): the same wait plus 2 s, and the mode is still `going`. The phone's other wander cases stop
    the walk first or open with `walkMode=input`, so the return does not move him during a case.
- [ ] **Step 2: Run** `node --test scripts/street-wander.test.ts scripts/street-walk.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the green step and both hashes, to `$E/t2b/`. Expected: all pass, both hashes unchanged.
- [ ] **Step 5: Commit**: `feat(street): on the automatic walk, Vincent goes home after the dwell (decision (p))`
- [ ] **Step 6: Run** the browser checks with Task 2's Step 6.

### Task 3 (Lead): the look passes, at most four

- [ ] Measure fault 1 first: the glass's world height (`StreetWalk.tsx:585`) against the bent blade tips round a
  standable point at stops 0 to 3, with the trail at his feet and with the raise. Choose the fix from the numbers.
- [ ] Capture each stop on desktop and the phone: before the tap, him walking, him arrived, the mark. Stop 4: his feet
  and the mark on the square. Look at each at 1:1 and at 4×. Name each defect, fix it, capture again. Record each pass.
- [ ] Count the accepted spots in frame at each stop against the spike's (stop 0 one, stop 2 two).

### Task 4 (Lead): the gate's runs

- [ ] The green step on the final head.
- [ ] The six browser checks: grass, walk, rotation, cypress hang, portal, reduced motion, with wander on.
- [ ] The triangle sweep (`$T/tri-read.mjs`, the baseline's points). Expected: under 1,444,930 at every point. The
  mark adds 24 triangles to the baseline's 1,429,793.
- [ ] The perf runs at stops 0 and 3, `main` and the branch side by side (`$T/k3-perf.sh`'s method). Expected: p50
  16.7 ms.
- [ ] `npm run -s build`.
- [ ] The mutations, one at a time, in a checkout no builder uses, each against the case that names it: the rail test,
  `hidden`'s grown footprint, the middle samples of a leg, the leg's last sample, `inFrame`, the route's retrace (a
  return straight to `route[0]`), the `hops` cap, the lane's
  precedence, the frog radius, the tap box off the lane, the feet's ground position, the frozen step, the aim in
  `settled`.

### Task 5 (Lead): review, record and preview

- [ ] Codex reviews the branch, told which commits are the Lead's to read hardest.
- [ ] The record `tasks/2026-10-29-vincent-wander.md`: the build, the look passes, the gate, the reading of the
  criterion, Mark's call on the return.
- [ ] Push for Mark's preview. The PR waits for his pass.
