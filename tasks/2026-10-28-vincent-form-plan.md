# Vincent's form, slice V1: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Revision 0 (2026-10-28, 12:10).** Written by the Lead from the spike and Mark's answers. It goes to two reads before
any build: Codex for correctness, the worker for buildability.

**Goal:** Vincent becomes the painter on the road to Tarascon for every visitor. He has legs that stride, a lantern in
his left hand, and a pause at each station where he turns side-on and holds the lantern out. The lantern lights the
ground and the grass round him.

**Architecture:** The spike `70acd5b` on `spike/vincent-form` is the reference build. This slice keeps its Tarascon form
only, drops the flag and the two other forms, removes the cane, and gives the right arm its own swing. The walk's
pause and turn become pure functions in `streetWalk.ts` with tests. The lantern's light on the ground and the grass is
one uniform read by three shaders.

**Tech Stack:** Vite 8, React Three Fiber, three.js, TypeScript. Tests run on `node --test` (`npm run test:sky`).

**Spec:** `tasks/2026-10-28-vincent-form-spike.md` (the spike's design draft and Mark's answers at its end). Copied onto
this branch from `spike/vincent-form` at `b66b911`.

## Mark's decisions (the authority for this plan)

- About 11:15 on 2026-10-28: "less creepy, I pick Tarascon but I think we still have room for refinement." Tarascon is
  the form for every visitor. Its forms come from Van Gogh's "Painter on the Road to Tarascon" (1888). Every colour
  comes from the Starry Night scan. Mark made this call knowing the locked "other paintings" line. This plan does not
  reopen it.
- 11:21: "Go with 90/45 and 4 s." The body turns 90°, the head a further 45°. The pause at a station lasts 4 s.
- 11:33, on the cane: "Remove it, go with your recommendation." No cane. The right arm swings in the stride.
- Mark named nothing else to refine. The look passes may find more. Anything that changes the form's design goes to
  Mark.

## Session mapping

```
Project:            starry-night
Herdr context:      w4:t1 (Consultant in w4:t2)
Lead:               w4:p1 (Claude)
Reviewer:           w4:p4 (Codex)
Worker:             w4:p5 (Gemini 3.8 Flash in Antigravity)
Consultant:         w4:p6 (Fable), when Codex runs low
Assigned worktrees: the worker builds in vform-wt, the Lead's dev servers run from vform-wt
```

- `WT` = `/private/tmp/claude-502/-Users-markma-Projects-starry-night/49dba370-4e2c-4c8c-a590-92ec4087e8fe/scratchpad/vform-wt`,
  branch `feat/vincent-form`, base `ed464c9` (K3's head, PR #32).
- `E` = `/Users/markma/Projects/starry-night/scratch/vincent-form-2026-10-28/slice` (the evidence, ignored by git).
- `T` = `/Users/markma/Projects/starry-night/scratch/village-craft-2026-10-25/tools` (the hash and gate tools).
- `S` = `/Users/markma/Projects/starry-night/scratch/vincent-form-2026-10-28/tools` (the spike's capture tools).

If PR #32 merges during the build, the Lead rebases `feat/vincent-form` onto `main` between tasks. The worker never
rebases.

## The facts the plan rests on (read at `ed464c9` and on the spike)

- The street's build hashes to `5492d517c80ba56e` (596,919 triangles, `T/build-hash.ts`). The grass hashes to
  `33504d291c27e9ac` (240 chunks, 14,986 blades, `T/grass-hash.ts`). Tasks 1 to 3 change neither.
- The spike's Tarascon build is 2,848 triangles, the cane's 8 among them (`E/probe/lead-tarascon-extents.log`).
- His top is the Tarascon crown at 0.0807. `VINCENT_RIG.height` is 0.085. `street-vincent.test.ts:39` asserts his top
  is within 0.002 of the rig's height, so it fails on the new form by design.
- With the lantern raised (0.75 rad) and the body turned 90°, his extent along the lane is −0.0227 to 0.0212
  (`E/probe/lead-tarascon-turned.log`). `VINCENT_RIG.halfDepth` is 0.02. Across the lane he spans −0.0189 to 0.0226,
  inside `halfWidth` 0.025.
- `VINCENT_RIG.halfDepth` and `height` are read only by `vincentBoxCorners` (`streetLayout.ts:853`, his tap box) and by
  `street-layout.test.ts:590` (the framing share, which reads `height`).
- The colour gate reads the hat (class 8) against `villageWarm`'s weighted mean (`check-street-colour.ts:261`). The
  Tarascon hat is the moon's yellow, from the moon's body `[1376, 216, 1408, 248]`.
- The frogs use the materials keyed `vincent-lit` and `vincent-solid-lit` (`StreetFrog.tsx:33-34`). A program key is
  shared across materials, so Vincent's lantern programs need their own keys.
- `check-street-walk.mjs:687-704` (Case 6, K4) asserts his arm is 0 once he stands. With the turn, his left arm stands
  raised at −0.75. The case changes by design.
- In the spike, a wheel turn or a key during a dwell does not end it (the spike's record, "What the spike does not
  do").
- In the spike, the pool's flicker runs under reduced motion too (`StreetWalk.tsx`, the pool's opacity, no reduced
  check).

## Decisions

**(a) One form, no flag.** `buildVincent(painting)` builds Tarascon only. `vform` leaves `streetMode.ts`. The probe
override `vturn` leaves `StreetWalk.tsx`. S2's figure and the lantern form are removed, not kept behind a flag. The
gate compares against K3's own server, as K3 compared against K2's. `?vincent=0` still builds no figure.

**(b) The parts.** `VincentBuild` holds `body`, `head`, `armLeft`, `armRight`, `legs`, `lantern`, `shadow` and
`triangles`. Every part is required, none optional. `head`, the arms and the legs are `Pivoted`, each about its joint:
the neck, a shoulder, a hip. The right arm mirrors the left in x, with the same radii. S2's z offset of 0.004 on the
right hand (it held the canvas) goes.

**(c) No cane.** Nothing in `body` reaches below the easel's foot at y 0.018. Only the boots touch the ground.

**(d) The rig.** `VINCENT_RIG.height` stays 0.085, because it frames him and sizes his tap box. The crown's top
becomes a constant of its own, `CROWN.y1 = 0.0805`. `VINCENT_RIG.halfDepth` goes from 0.02 to 0.024, so the turned
pose fits the tap box. The rig test checks the walking poses and the turned pose against the box.

**(e) The hat's colour gate.** The hat's reference becomes the moon's body swatch `#c0b451` (Lab 72.5, −8.3, 51) from
`palette.json`, found by its hex, as the smock's is. The region's weighted mean is not used: two of its five swatches
are the pale halo (b −4.8 and 23.6).

**(f) The walk's values.** The gait: bob 0.003, roll 0.015, arm 0.12, leg 0.35, pitch 0.06. The pause: dwell 4 s, rest
0.5 s, turn in 0.6 s, turn out 0.3 s, the stride gated off at turn 0.2, the turn out started 0.45 s before a dwell
ends, the body π/2, the head π/4, the raise 0.75, the lantern's lag τ 0.15 s. All from the spike, apart from the dwell
(Mark).

**(g) The limbs.** The left arm swings `+arm` and is raised `−raise` at rest. The right arm swings `−arm` and is never
raised. The left leg swings `−leg`, the right leg `+leg`. So each arm moves with the opposite leg.

**(h) Input ends a dwell.** A wheel turn, a key or a tap during a dwell ends it. The walk then moves at once.

**(i) Reduced motion.** He stands turned at once. The lantern hangs still. The pool does not flicker.

**(j) The lantern's light.** One uniform, `uLantern` (a `Vector4`: the glass's world position in xyz, the strength in
w), is read by Vincent's own shaders, the ground's strokes, the grass's base and the grass's blades. With `light=0`
none of the four injects it, so the ground's and the grass's programs stay as they are today. With `vincent=0`, w is
0. The look passes set the ground's and the grass's falloff and warmth. The pool sprite stays until a look pass shows
the shader's light makes it redundant.

**(k) The material keys.** Vincent's lit materials are keyed `vincent-lit-lantern` and `vincent-solid-lit-lantern`.
The frogs keep `vincent-lit` and `vincent-solid-lit`.

**(l) Commits.** Every commit message ends with `Claude-Session: https://claude.ai/code/session_016dU6FfJRVrssNDzbaYJzcc`.

## Global constraints

- No dependency beyond `package.json` at `ed464c9`.
- The worker never runs an install step (`npm install`, `npm ci`, `npx`) and never pushes.
- British English in comments and docs.
- The scene's triangle ceiling is 1,444,930 at every sampled point of the walk (`T/tri-read.mjs`, the sweep in
  `T/k3-gate.sh`).
- 60 fps at stops 0 and 3 at dpr 1.5 on the desktop (p50 16.7 ms).
- `?light=0` keeps the ground's and the grass's programs byte for byte.
- The street's build and grass hashes stay `5492d517c80ba56e` and `33504d291c27e9ac` through Tasks 1 to 3.
- Each task's green step runs `node_modules/.bin/tsc -b`, `npm run -s lint` and `npm run -s test:sky` from `WT`.
  Task 3 and later add the browser checks.
- The browser checks run with `node scripts/check-<name>.mjs` from `WT`, with
  `DIORAMA_CAPTURE_URL=http://127.0.0.1:5209/`. The Lead starts and stops that dev server. The worker never does.

## Review focus

Five failure modes no task's tests reach directly. Each line names the test that pins it.

1. A tap on him during a dwell. Expected: the walk stops, the dwell ends, and his next tap starts him walking. Pinned
   by the `stepPause` test "input ends a dwell" and Task 3's browser case.
2. The automatic walk reaching the last stop (`t` 0.9). Expected: no dwell, because the walk ends there. Pinned by the
   `stepPause` test "no dwell at the walk's end".
3. A backward scroll mid-stride. Expected: he stands, turned or not, and never strides backward (Fable's cause 2).
   Pinned by the `gait` test "no stride walking backward".
4. The frogs' material after Vincent's change. Expected: the frogs' program and look unchanged. Pinned by the Lead's
   stop 0 frog crop at the gate, and Decision (k).
5. Anchor A (`skyAnchor=A`) moving the street by 5. Expected: the lantern's light lands under the lantern, not 5 away.
   Pinned by Task 4's capture at stop 2 under `skyAnchor=A`.

---

### Task 1: the form's build (worker)

**Files:**
- Modify: `src/scene/vincent.ts`, `src/scene/streetLayout.ts` (`VINCENT_RIG.halfDepth`), `src/scene/streetLife.ts`,
  `src/scene/streetLife.tsx` (`radialTexture` moves), `scripts/check-street-colour.ts` (Decision (e))
- Test: `scripts/street-vincent.test.ts`

**Interfaces:**
- Produces: `buildVincent(painting: ImageData2D): VincentBuild`, where `VincentBuild = { body: VincentPart; head:
  Pivoted; armLeft: Pivoted; armRight: Pivoted; legs: [Pivoted, Pivoted]; lantern: { glass: BrushArraysWithCls; ink:
  BrushArraysWithCls; pivot: [number, number, number] }; shadow: BrushArrays; triangles: number }`.
- Produces: `FORM` (the spike's, without `brim` and `tarascon.cane`), `lanternUniform` (now `{ value: Vector4 }`),
  `LANTERN_LIFT`, `lanternExtra`, `vincentMoon(lit: boolean, lantern = false)`, `vincentStrokeBody(lit: boolean,
  lantern = false)`.
- Produces: `radialTexture(): CanvasTexture` exported from `streetLife.ts`.

- [ ] **Step 1: Write the failing tests** in `scripts/street-vincent.test.ts`. Replace the tests at `:39`, `:55`, `:61`
  and `:77` and add three:
  - "Vincent fits the rig": every part's points, placed by its pivot, inside `|x| ≤ halfWidth`, `|z| ≤ halfDepth`,
    `0 ≤ y ≤ height + 0.002`, in each of these poses: walking (arms ±0.12, legs ±0.35, no raise), and turned (left arm
    −0.75, lantern plumb, body yawed π/2 about y). His top lies in [0.080, 0.0825].
  - "Vincent is cheap": `build.triangles` equals the sum over body, head, both arms, both legs, the lantern's glass and
    ink, and the shadow. It is at most 4,000.
  - "the smock and the hat carry their classes": the body, both arms and the head pass the existing length and class
    checks. Both sleeves are all smock. The legs and the lantern carry only `none`.
  - "each part carries its class, where it sits on him": the hat groups read `build.head`'s strokes with its pivot
    added back. The smock groups add `z > −0.01`, so the canvas and the easel on his back fall outside them.
  - New "no cane: only the boots reach the ground": the lowest y in `body` is at least 0.018.
  - New "the right arm swings on its own": `armRight`'s pivot is `[−ARM.shoulder[0], ARM.shoulder[1], 0]`. Its points
    mirror `armLeft`'s in x, within 1e-9.
  - New "the hat is the moon's yellow": the hat's underpaint vertices (class 8 in `head.underpaint`) have the colour
    `underpaintColour(painting, FORM.tarascon.hat)`.
  - "the build is deterministic" stays.
- [ ] **Step 2: Run** `node --test scripts/street-vincent.test.ts`. Expected: the new and replaced tests fail.
- [ ] **Step 3: Port the build** from `git show 70acd5b:src/scene/vincent.ts`. Keep only the Tarascon paths: delete
  the `form` parameter, `spike`, `tarascon`, the `lantern`-form brim, and the cane (`70acd5b`'s lines 360 to 363). Move
  the right arm out of `body` into `armRight`, built as `armLeft` is and mirrored in x. Set `CROWN.y1` to 0.0805 and
  `VINCENT_RIG.halfDepth` to 0.024. Move `radialTexture` to `streetLife.ts` as the spike does. Make `lanternUniform` a
  `Vector4` and read `.xyz` in `lanternMoon`'s GLSL. Point the colour gate's `refHat` at the moon swatch `#c0b451`.
  Rewrite the top comment of `vincent.ts`: the form is Tarascon, Mark's call of 2026-10-28.
- [ ] **Step 4: Run** the green step (Global constraints) and `T/build-hash.ts` and `T/grass-hash.ts` with `WT` set.
  Expected: all pass, and both hashes unchanged.
- [ ] **Step 5: Mutation proofs**, one artefact each in `E/t1/mutation-<n>.md`, the format of
  `scratch/village-craft-2026-10-25/k3/t4/mutation-1.md`:
  1. The cane back (`70acd5b`'s line 363). Expected red: "no cane".
  2. `armRight` built into `body` again. Expected red: "the right arm swings on its own".
  3. The hat's source back to `VINCENT_SOURCES.hat`. Expected red: "the hat is the moon's yellow".
  4. `halfDepth` back to 0.02. Expected red: "Vincent fits the rig".
  5. `triangles` without the right arm. Expected red: "Vincent is cheap".
- [ ] **Step 6: Commit** `feat(street): Vincent as the painter on the road to Tarascon, with legs, a lantern and no
  cane (V1 task 1)`.

### Task 2: the pause, the turn and the stride (worker)

**Files:**
- Modify: `src/scene/streetWalk.ts`
- Test: `scripts/street-walk.test.ts`

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces, in `streetWalk.ts`:
  - `WALK` with `bob: 0.003`, `roll: 0.015`, `arm: 0.12`, and new `leg: 0.35`, `pitch: 0.06`.
  - `PAUSE = { dwell: 4, rest: 0.5, turnIn: 0.6, turnOut: 0.3, turnGate: 0.2, endTurn: 0.45, body: Math.PI / 2, head:
    Math.PI / 4, raise: 0.75, lag: 0.15 } as const`.
  - `type Pause = { dwell: number; rest: number; turn: number }` and `initialPause(): Pause`.
  - `stepPause(prev: WalkState, next: WalkState, p: Pause, i: WalkInput, immediate: boolean): { next: WalkState; pause:
    Pause }`: the spike's `stepForm`, plus Decision (h): when `i.wheelPx !== 0 || i.keys !== 0`, the dwell is 0 before
    anything else runs.
  - `gait(distance: number, speed: number, forward: boolean, turn: number): { lift: number; roll: number; arm: number;
    leg: number; pitch: number }`: the spike's `formGait`. It replaces S2's `gait(distance, speed, still)`.
  - `turnPose(turn: number): { body: number; head: number; raise: number }`: the spike's, without the override
    parameters.
  - `limbs(g: ReturnType<typeof gait>, pose: ReturnType<typeof turnPose>): { armLeft: number; armRight: number;
    legLeft: number; legRight: number; hang: number }`, Decision (g). `hang` is `−armLeft − g.pitch`.
  - `lag(swing: number, hang: number, dt: number): number`: `swing + (hang − swing) × (1 − exp(−dt / PAUSE.lag))`.
  - `flicker(time: number, reduced: boolean): number`: 1 under reduced motion, otherwise
    `0.96 + 0.04 × sin(7.3 time) × sin(11.1 time)`.

- [ ] **Step 1: Write the failing tests.** Delete "the gait settles" (`:187`), which tests S2's `gait`. Add, with a
  10 ms `dt` and the automatic walk on unless named:
  - "a dwell holds the walk 4 s at a station": cross `STATION_T[1]` from below. `t` is exactly 0.23 for 400 steps,
    within one step, then rises.
  - "no dwell starting on a station": start at `t` 0.23. `t` rises on the first step.
  - "no dwell at the walk's end": approach `WALK_T.max`. The dwell stays 0.
  - "the turn comes in after the rest and leaves before the dwell ends": counted from the step that reaches the
    station, `turn` is 0 until 0.5 s, 1 by 1.11 s, below 1 by 3.57 s and 0 by 3.87 s, each within one step.
  - "input ends a dwell": in a dwell with 2 s left, a step with `wheelPx` 100 gives dwell 0 and `t` above 0.23. The
    same with `keys` 1.
  - "the input walk turns at rest": `autoMode` false, no input. `turn` is 1 after 1.11 s.
  - "reduced motion stands turned": `immediate` true gives turn 1 on the first step.
  - "no stride walking backward, turned or still": `gait` is all zeros for `forward` false, for `turn` 0.2, and for
    speed 0.
  - "the head lags the body": `turnPose(0.25).head` is 0 while `.body` is above 0. `turnPose(1)` is π/2, π/4, 0.75.
  - "each arm moves with the opposite leg": walking, `armRight` is `−armLeft`, `legLeft` is `−legRight`, and
    `armLeft` has the sign of `legRight`. At rest and turned, `armLeft` is −0.75, `armRight` 0, both legs 0, `hang`
    0.75.
  - "the lantern lags the hand": `lag(0, 1, 0.15)` is `1 − e^−1` within 1e-9.
  - "the pool is still under reduced motion": `flicker(t, true)` is 1 at five times. `flicker` without reduced motion
    stays in [0.92, 1].
- [ ] **Step 2: Run** `node --test scripts/street-walk.test.ts`. Expected: the new tests fail.
- [ ] **Step 3: Implement** the interfaces above in `streetWalk.ts`, porting from `git show 70acd5b:src/scene/streetWalk.ts`.
- [ ] **Step 4: Run** `node --test scripts/street-walk.test.ts`. It does not compile `StreetWalk.tsx`, so tsc fails
  until Task 3. Expected: the walk's tests pass. Note the tsc errors in the report and leave them for Task 3.
- [ ] **Step 5: Mutation proofs** in `E/t2/mutation-<n>.md`:
  6. `PAUSE.dwell` 3. Expected red: "a dwell holds the walk 4 s at a station".
  7. Decision (h) removed. Expected red: "input ends a dwell".
  8. The `endTurn` term removed from `want`. Expected red: "the turn comes in after the rest and leaves before the
     dwell ends".
  9. `armRight` = `+g.arm`. Expected red: "each arm moves with the opposite leg".
  10. The head's lag removed from `turnPose`. Expected red: "the head lags the body".
  11. The `turn >= turnGate` gate removed from `gait`. Expected red: "no stride walking backward, turned or still".
  12. `flicker` ignores `reduced`. Expected red: "the pool is still under reduced motion".
- [ ] **Step 6: Commit** `feat(street): Vincent pauses 4 s at a station and turns side-on, each arm with the opposite
  leg (V1 task 2)`.

### Task 3: the figure on the street (worker)

**Files:**
- Modify: `src/scene/StreetWalk.tsx`, `src/scene/streetMode.ts` (no `vform`), `scripts/check-street-walk.mjs`
- Test: `scripts/check-street-walk.mjs` (browser), `scripts/street-mode.test.ts` if it reads `vform` (it does not at
  `ed464c9`)

**Interfaces:**
- Consumes: Task 1's `VincentBuild`, `lanternUniform`, `lanternExtra`, `FORM`, `radialTexture`. Task 2's `PAUSE`,
  `stepPause`, `gait`, `turnPose`, `limbs`, `lag`, `flicker`.
- Produces: `window.__vincentPose` returning `{ world, roll, arm, armRight }`, and `window.__vincentForm` returning `{
  t, auto, turn, dwell, rest, bodyYaw, headYaw }`, for every visitor.

- [ ] **Step 1: Change the browser check** `check-street-walk.mjs` Case 6, K4 (`:701-704`): standing, his roll is 0,
  `arm` is −0.75 and `armRight` is 0, each within 1e-6. Add Case 7, the dwell: open
  `?street=1&walkT=0.2&walkMode=auto&arrival=0` at 390 × 844. Sample `__vincentForm()` in the page every 100 ms for
  10 s. Expected: `t` holds at 0.23 for at least 3.5 s, `turn` reaches 1 during the hold, `turn` is 0 when `t` moves
  on, and `t` moves on within 6 s of reaching 0.23. Then reload the same URL. Once `dwell` is above 0, tap at
  `__vincentBox()`'s centre. Expected: `dwell` 0 and `auto` false. A second tap: `auto` true, and `t` rises within
  1 s.
- [ ] **Step 2: Run** `node scripts/check-street-walk.mjs` against the dev server (Global constraints). Expected: the
  changed and new cases fail on the Task 2 head.
- [ ] **Step 3: Port the frame loop** from `git show 70acd5b:src/scene/StreetWalk.tsx`. The form's branch becomes the
  only branch. S2's branch, `vturn`, `vform` and the `spike` constant go. Add the right arm's group and geometry beside
  the left. Drive the limbs through `limbs`, the lantern through `lag`, the pool's opacity through `flicker` with the
  reduced flag. Write `lanternUniform.value` as the glass's world position with w 1. Set w to 0 on unmount. Key the
  lit materials by Decision (k). Reset the dwell on a tap and on a stop, as the spike does.
- [ ] **Step 4: Run** the green step, then `check-street-walk.mjs`, `check-street-rotation.mjs`,
  `check-street-grass.mjs` and `check-reduced-motion.mjs` (the last with
  `DIORAMA_CAPTURE_URL='http://127.0.0.1:5209/?street=1&station=2'` and an output directory under `E/t3/`). Expected:
  all pass.
- [ ] **Step 5: Commit** `feat(street): the Tarascon figure walks the street, pauses and holds out his lantern (V1
  task 3)`.

### Task 4: the lantern lights the ground and the grass (Lead)

The Lead builds this task. Its values are set by eye, so it is visual work.

**Files:**
- Modify: `src/scene/vincent.ts` (the shared uniform's GLSL), `src/scene/Street.tsx` (the ground and the grass base's
  materials), `src/scene/grassShader.ts`, `src/scene/StreetGrass.tsx`
- Test: `scripts/street-vincent.test.ts`, `scripts/street-grass-shader.test.ts`

**Interfaces:**
- Consumes: Task 1's `lanternUniform` (`Vector4`). Task 3 writes it each frame.
- Produces: `lanternGround(lit: boolean): Omit<AliveInjection, 'key'> | null`, null when unlit. The ground's and the
  grass base's materials take it as their `extra`. The grass's injection takes the same term.

- [ ] **Step 1: Write the failing tests.** "the lantern is not in the unlit programs": with `light=0`,
  `lanternGround(false)` is null, and the grass's unlit injection is byte for byte the one at `ed464c9` (its hash
  pinned in the test). "no lantern without Vincent": the term's strength is the uniform's w, so a w of 0 adds nothing
  (asserted on the GLSL: the term is multiplied by `uLantern.w`).
- [ ] **Step 2: Run** them. Expected: red.
- [ ] **Step 3: Implement** the term: a warm lift from `LIFE.glow`, falling off with the distance from `uLantern.xyz`,
  added before the fog's mix. Start at the pool's reach (0.05 across) and set the falloff at the look passes.
- [ ] **Step 4: Run** the green step and the four browser checks. Capture stop 2 on both viewports, and stop 2 under
  `skyAnchor=A` (Review focus 5).
- [ ] **Step 5: Mutation proofs** in `E/t4/mutation-<n>.md`:
  13. The term injected under `light=0`. Expected red: "the lantern is not in the unlit programs".
  14. The `uLantern.w` factor removed. Expected red: "no lantern without Vincent".
- [ ] **Step 6: Commit** `feat(street): Vincent's lantern lights the ground and the grass round him (V1 task 4)`.

### Task 5: the look passes (Lead)

At most four passes (the cap per slice). The spike's six passes do not count.

- [ ] Capture stops 0 to 4 on both viewports, K3's server beside the branch's (`S/stations.sh` and `T/k3shot.mjs`).
- [ ] Capture the motion: the stride, a dwell at stop 1 with the turn in and out, a backward scroll, reduced motion on
  the phone (`S/burst.mjs`).
- [ ] Look at each at 1:1 and at 4×. Name each defect, fix it, and capture again. Record each pass in the record.
- [ ] Look at the frogs at stop 0 beside K3's (Review focus 4).

### Task 6: the gate's runs (Lead)

- [ ] The green step on the final head, by the Lead.
- [ ] The six browser checks: grass, walk, rotation, cypress hang, portal, reduced motion.
- [ ] The triangle sweep (`T/k3-gate.sh`'s sweep). Expected: under 1,444,930 at every sampled point.
- [ ] The colour gate on every stop and viewport, K3 against the branch (`T/k3-colour.sh`). Expected: no region newly
  failing. The smock and the hat within ΔE 10 of their swatches. If the hat fails, it is Mark's call at the preview.
- [ ] The perf runs at stops 0 and 3 (`T/k3-perf.sh`). Expected: p50 16.7 ms.
- [ ] The fourteen mutations, re-run by the Lead in a checkout the worker is not using.
- [ ] The street's build time against K3's 653 ms. Vincent is built apart from the street, so it should not move.

### Task 7: review and the record (Lead)

- [ ] Codex reviews the branch `ed464c9..HEAD`, told which commits are the Lead's (Task 4) to read hardest.
- [ ] The record `tasks/2026-10-28-vincent-form.md`: the build, the look passes, the gate, Codex's findings and their
  answers.
- [ ] The Tunables entry in `CLAUDE.md` replacing slice 2's figure numbers where they changed, and lessons in
  `tasks/lessons.md`.
- [ ] Push `feat/vincent-form` for a Vercel preview. No PR until Mark has looked.
