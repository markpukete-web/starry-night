# Vincent's form, slice V1: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Revision 1 (2026-10-28, 12:25).** Revision 0 (12:10) had two reads. Codex returned REVISE with eight P2 findings and
one P3 (`$E/plan-review-codex.md`). The worker's buildability read is `$E/plan-build-worker.md`. The table below says
where each finding went. Mark moved the builds from the Gemini pane to Sonnet builder subagents at 12:10 ("Make the
switch"). Codex gives revision 1 a bounded confirmation read before any build.

**Revision 2 (2026-10-28, 12:55).** Codex's confirmation read of revision 1 (`$E/plan-confirm-codex.md`) closed F2 to
F9. It kept F1 open and found N1 and N2. The last three rows of the table below say where they went. Codex reads
revision 2's three changes while Tasks 1 and 2 are built. Its verdict comes before Task 3 starts.

**Revision 3 (2026-10-28, 13:15).** Codex's second confirmation (`$E/plan-confirm2-codex.md`) closed N1 and N2. It
kept F1 open on the lantern's halo: a sprite, drawn facing the camera, so its group's box does not bound it. The halo
is the lantern's light, not his figure, so the figure's bounds now take his meshes only. Revision 3 also fixes
Decision (j): in the spike, Vincent's lantern term is already in his body, before the fog. Tasks 1 and 2 were built
from revision 2 and merged at `8389bb5` (a frog test re-pinned by the Lead, Task 1's commit message). F1 has had two
reads that found a further gap. Revision 3's fix gets no third plan read: the Lead gates it, and Codex's branch review
(Task 7) reads it.

**Goal:** Vincent becomes the painter on the road to Tarascon for every visitor. He has legs that stride, a lantern in
his left hand, and a pause at each station where he turns side-on and holds the lantern out. The lantern lights the
ground and the grass round him.

**Architecture:** The spike `70acd5b` on `spike/vincent-form` is the reference build. This slice keeps its Tarascon form
only, drops the flag and the two other forms, removes the cane, and gives the right arm its own swing. The walk's
pause and turn become pure functions in `streetWalk.ts` with tests. The lantern's light on the ground and the grass is
one uniform read by four shaders.

**Tech Stack:** Vite 8, React Three Fiber, three.js, TypeScript. Tests run on `node --test` (`npm run -s test:sky`).

**Spec:** `tasks/2026-10-28-vincent-form-spike.md` (the spike's design draft and Mark's answers at its end). Copied onto
this branch from `spike/vincent-form` at `b66b911`.

## What revision 1 changed

| Finding | Where it went |
| --- | --- |
| Codex F1: `halfDepth` 0.024 fails the phone framing test | Decision (d): `halfDepth` stays 0.02. The turned pose gets 0.003 more along the lane in the rig test. Mutation 4 changed. |
| Codex confirm, F1 kept open: mid-turn, the lagging lantern is 5.38 px outside the tap rect | Decision (d) rewritten: the tap rect takes in the rendered figure's bounds. Task 3's `vincentTapCorners`, its test and mutation 19. |
| Codex confirm, N1: `stopWalk` keeps `auto`, so a blur does not end a dwell | Decision (h): a blur leaves the dwell running, as it leaves the walk. Task 2's test "a stop on blur keeps the dwell". |
| Codex confirm, N2: linked `node_modules` share tsc's build-info files | Session mapping: each builder links every entry of `node_modules` but `.tmp`, so its `.tmp` is its own. |
| Codex confirm 2, F1 kept open: the halo sprite is drawn outside its group's box | Decision (d): the figure's bounds are his meshes', by `vincentFigureBounds`. Task 3's Step 0 builds the real three tree, and mutation 20. |
| Lead, from Task 1's gate: Decision (j) put Vincent's term after the fog | Decision (j) fixed: the spike's term is in his moon body, before the fog. `lanternExtra` only registers the uniform. |
| Codex F2, worker W02: the easel's tube dips to y 0.0179 | Decision (c): the no-cane floor is 0.017. |
| Codex F3, worker W01: the paint test reads the hat from `body` | Decision (e) and Task 1 Step 1: the hat is read from `head`, against its source patch. |
| Codex F4: a cancelled dwell starts again one frame later | Decision (h): `Pause.last` and its re-arm rule. A new test and mutation 14. |
| Codex F5: the lantern term lands after the fog | Decision (j) and Task 4: the term rides the body, before the fog. |
| Codex F6, worker W12: Case 7 counts wall seconds | Task 3: `__vincentForm().clock`, the controller's own clock. K4 waits on the turn. |
| Codex F7: `new Vector4()` starts at w 1 | Decision (j): `new Vector4(0, 0, 0, 0)`, the write rule, a test and mutation 6. |
| Codex F8: the unlit test misses the ground's and the base's call sites | Task 4: both materials move into a tested function. Their programs at `ed464c9` are pinned. |
| Codex F9, worker W06: the dwell's expiry holds two frames | Decision (h): the dwell snaps to 0 under 1e-9, and the expiring frame moves. The test pins frame 400. |
| Codex Q10: (h) says a tap "moves at once" | Decision (h) rewritten: a tap stops the walk, as it does today. |
| Worker W03: the right arm's test | Task 1 Step 1: its pivot and its underpaint's bounds mirror the left's. |
| Worker W04: the rig poses | Task 1 Step 1: the poses follow `$E/probe/lead-tarascon-turned.mts`. |
| Worker W05: `gait`'s new signature breaks `StreetWalk.tsx` | Task 2 modifies the one call, so tsc stays green. |
| Worker W07: the right arm's names | Task 3 names them. |
| Worker W10: the flicker's test times | Task 2 names them. |
| Worker W11: `FORM.tarascon`'s fields | Task 1: `FORM.tarascon = { hat, back }`. |
| Worker W09: `T/` and `E/` read as folders | Every task starts with the `export` block in "Session mapping". |

The worker's report quotes four plan lines that the plan does not hold (W05, W08, W09, W11). W05 and W11 stand on the
code and are taken. W08's two readings of the tap's reset are settled by (h). W09's point is taken.

## Mark's decisions (the authority for this plan)

- About 11:15 on 2026-10-28: "less creepy, I pick Tarascon but I think we still have room for refinement." Tarascon is
  the form for every visitor. Its forms come from Van Gogh's "Painter on the Road to Tarascon" (1888). Every colour
  comes from the Starry Night scan. Mark made this call knowing the locked "other paintings" line. This plan does not
  reopen it.
- 11:21: "Go with 90/45 and 4 s." The body turns 90°, the head a further 45°. The pause at a station lasts 4 s.
- 11:33, on the cane: "Remove it, go with your recommendation." No cane. The right arm swings in the stride.
- 12:10, on the builds: "Make the switch." Sonnet builder subagents build Tasks 1 to 3, not the Gemini pane.
- Mark named nothing else to refine. The look passes may find more. Anything that changes the form's design goes to
  Mark.

## Session mapping

```
Project:            starry-night
Herdr context:      w4:t1 (Consultant in w4:t2)
Lead:               w4:p1 (Claude)
Reviewer:           w4:p4 (Codex)
Builders:           Sonnet 5.5 `builder` subagents of the Lead, one a task, each in its own worktree
Consultant:         w4:p6 (Fable), when Codex runs low
Assigned worktrees: the Lead's is vform-wt; each builder's is the one the harness makes for it
```

Every task starts with this block, run in its own shell:

```
export WT=<the worktree the task runs in>
export E=/Users/markma/Projects/starry-night/scratch/vincent-form-2026-10-28/slice
export T=/Users/markma/Projects/starry-night/scratch/village-craft-2026-10-25/tools
export S=/Users/markma/Projects/starry-night/scratch/vincent-form-2026-10-28/tools
```

- The Lead's worktree is `/private/tmp/claude-502/-Users-markma-Projects-starry-night/49dba370-4e2c-4c8c-a590-92ec4087e8fe/scratchpad/vform-wt`,
  branch `feat/vincent-form`, base `ed464c9` (K3's head, PR #32).
- `$E` holds the evidence (ignored by git). `$T` holds the hash and gate tools. `$S` holds the spike's capture tools.
- A builder's worktree starts from `main`. Its brief names its branch and its base commit on `feat/vincent-form`. The
  builder runs `git switch -c <branch> <base>` first. It then links the dependencies from
  `/Users/markma/Projects/starry-night`, one link an entry, so that tsc's build-info (`node_modules/.tmp`) is its own
  (Codex N2). Tried at 12:53 in a throwaway worktree: tsc, lint and a test file pass, and `.tmp` is written locally.

  ```
  M=/Users/markma/Projects/starry-night
  mkdir node_modules
  for e in $M/node_modules/* $M/node_modules/.[!.]*; do [ "$(basename "$e")" = .tmp ] || ln -s "$e" node_modules/; done
  ln -s $M/reference/derived reference/derived
  ```

  It never installs. It commits on its own branch. The Lead gates that branch and merges it into `feat/vincent-form`.
- Tasks 1 and 2 touch no file in common, so their builders run at once. Task 3's builder starts from the merged head.
- A builder's worktree has no dev server. The Lead runs Task 3's browser checks from vform-wt.

If PR #32 merges during the build, the Lead rebases `feat/vincent-form` onto `main` between tasks. A builder never
rebases.

## The facts the plan rests on (read at `ed464c9` and on the spike)

- The street's build hashes to `5492d517c80ba56e` (596,919 triangles, `$T/build-hash.ts`). The grass hashes to
  `33504d291c27e9ac` (240 chunks, 14,986 blades, `$T/grass-hash.ts`). Both re-read at 12:20 on vform-wt. Tasks 1 to 3
  change neither.
- The spike's Tarascon build is 2,848 triangles, the cane's 8 among them (`$E/probe/lead-tarascon-extents.log`).
- His top is the Tarascon crown at 0.0807. `VINCENT_RIG.height` is 0.085. `street-vincent.test.ts:39` asserts his top
  is within 0.002 of the rig's height, so it fails on the new form by design.
- Walking (arms ±0.12, legs ±0.35, no raise), the spike's figure spans x −0.0212 to 0.0227 and z −0.0189 to 0.0170
  (`$E/probe/lead-tarascon-walking.log`). The swings are applied: at 1.5 rad, z reaches ±0.032. The K3 box
  (`halfWidth` 0.025, `halfDepth` 0.02) holds the walking figure.
- Turned (the left arm raised 0.75, the lantern plumb, the body 90°, the head 45°), he spans x −0.0189 to 0.0226 and z
  −0.0227 to 0.0212 (`$E/probe/lead-tarascon-turned.log`). Along the lane he passes the box by 0.0027.
- That static reach moves his tap rect by at most 2.84 px on a 1280 × 800 desktop and 1.82 px on a 390 × 844 phone,
  over `t` 0 to 0.9 (`$E/probe/lead-v1-tapbox.log`). It does not bound a pose mid-turn. At turn 0.7, with the lantern
  lagging its raised hand, a point inside the lantern's ink lies 5.38 px outside the K3 tap rect on the desktop, and
  `admitGesture` gives `hand` (Codex confirm F1, `$E/probe/codex-v1-confirm/visible-click-probe.json`). The pose: `t`
  0.7251969475, the body 1.2315043202 rad past the lane, the left arm −0.588, the lantern's swing 0.3616545427.
- `stopWalk` (`streetWalk.ts:99-104`) sets `target` to `t` and keeps `auto`. The blur and hidden handler calls it
  (`StreetWalk.tsx:305-313`). So a blur does not stop the automatic walk (Codex confirm N1).
- `vincentBoxCorners` (`streetLayout.ts:853`) reads `halfWidth`, `halfDepth` and `height`. It sizes his tap box and is
  read by "Vincent stays in frame" (`street-layout.test.ts:578-605`), which asserts every corner inside the viewport.
  With `halfDepth` 0.024 that test fails at `t` 0.540 on the phone (Codex F1, `$E/probe/codex-v1-review/box-test-red.log`).
- Without the cane, the body's lowest point is the easel's tube at y 0.0179 (Codex F2). The easel's centreline foot is
  at 0.018. The cane reached y −0.0004.
- The colour gate reads the hat (class 8) against `villageWarm`'s weighted mean (`check-street-colour.ts:261`). The
  test "his paint is the painting's" (`street-vincent.test.ts:134`) reads the hat from `real.body` against the same
  mean. The Tarascon hat is the moon's yellow, from the moon's body `[1376, 216, 1408, 248]`, and lives in `head`.
- The hat's raw strokes average Lab (69.3, −4.3, 63.6), ΔE 13.6 from the moon's body swatch `#c0b451` (72.5, −8.3, 51)
  (Codex, `$E/probe/codex-v1-review/form-probe.json`). The source patch is more yellow than every moon swatch.
  `#c0b451` is the nearest.
- `material()` composes `[body, fog, extra, ids]` (`streetMaterial.ts:71-74`). Its `body` type has no `uniforms`, but
  the code spreads `body` over `{ uniforms: {} }`, so a body's uniforms would survive.
- The ground's and the grass base's materials are built inside `Street.tsx`'s `useMemo` (`:138`, `:147`). At
  `ed464c9` their programs hash to `8c785ab6d6495140` (ground) and `d1fe6b0ed3fc628c` (grass base, with a fixed
  three-paint palette), IDs off (`$E/probe/lead-v1-unlit-programs.mts` and its log, the hash of
  `street-grass-shader.test.ts:57`). The unlit grass program is pinned at `4b0b48f47e712dbb`
  (`street-grass-shader.test.ts:60`).
- `new Vector4()` is (0, 0, 0, 1) (Codex F7).
- The frogs use the materials keyed `vincent-lit` and `vincent-solid-lit` (`StreetFrog.tsx:33-34`). A program key is
  shared across materials, so Vincent's lantern programs need their own keys.
- `check-street-walk.mjs:683-704` (Case 6, K4) asserts his arm is 0 after a fixed 1.5 s of standing. With the turn,
  his left arm stands raised at −0.75. The case changes by design.
- The component feeds the wheel and the keys into `WalkInput` in the automatic mode too (Codex Q4).
- In the spike, a wheel turn or a key during a dwell does not end it. The pool's flicker runs under reduced motion.
- At `ed464c9`, `streetMode.ts` has no `vform`. The spike added it. Nothing in this slice removes it.

## Decisions

**(a) One form, no flag.** `buildVincent(painting)` builds Tarascon only. S2's figure and the lantern form are not
ported. The probe override `vturn` and the `spike` constant are not ported. The gate compares against K3's own server,
as K3 compared against K2's. `?vincent=0` still builds no figure.

**(b) The parts.** `VincentBuild` holds `body`, `head`, `armLeft`, `armRight`, `legs`, `lantern`, `shadow` and
`triangles`. Every part is required, none optional. `head`, the arms and the legs are `Pivoted`, each about its joint:
the neck, a shoulder, a hip. The right arm is built by the same calls as the left, with x negated. S2's z offset of
0.004 on the right hand (it held the canvas) goes.

**(c) No cane.** Nothing in `body` reaches below y 0.017: the easel's centreline foot (0.018) less its tube's radius.
Only the boots reach the ground.

**(d) The rig and the tap rect.** `VINCENT_RIG` does not change: `height` 0.085, `halfWidth` 0.025, `halfDepth` 0.02.
It frames him, and a larger box would break the phone framing test. The crown's top becomes a constant of its own,
`CROWN.y1 = 0.0805`. The tap rect is the projection of the rig box's corners and of his figure's world bounds
together, so a tap on any part of him in any pose lands on him (Codex confirm F1). His figure is his meshes: the body,
the head, the arms, the legs, the lantern's glass and ink, and the shadow. The halo and the pool are the lantern's
light, drawn over the street, so a tap on them is a tap on the street (Codex confirm 2). The pool is outside his
group. The halo is a sprite inside it, so the bounds skip sprites. The rig box stays the rect's floor, so no tap that
hit him at K3 misses him now.

**(e) The hat's colour.** The colour gate's hat reference becomes the moon's body swatch `#c0b451` from `palette.json`,
found by its hex, as the smock's is. The region's weighted mean is not used: two of its five swatches are the pale halo
(b −4.8 and 23.6). The unit test checks the hat's raw paint against its source patch (ΔE < 3), as it checks the smock's.
It prints the hat's distance to `#c0b451` and does not assert it: the raw patch is 13.6 away (Facts). The render gate
(Task 6) measures the hat against `#c0b451`. If it fails there, it is Mark's call at the preview.

**(f) The walk's values.** The gait: bob 0.003, roll 0.015, arm 0.12, leg 0.35, pitch 0.06. The pause: dwell 4 s, rest
0.5 s, turn in 0.6 s, turn out 0.3 s, the stride gated off at turn 0.2, the turn out started 0.45 s before a dwell
ends, the body π/2, the head π/4, the raise 0.75, the lantern's lag τ 0.15 s. All from the spike, apart from the dwell
(Mark).

**(g) The limbs.** The left arm swings `+arm` and is raised `−raise` at rest. The right arm swings `−arm` and is never
raised. The left leg swings `−leg`, the right leg `+leg`. So each arm moves with the opposite leg.

**(h) The dwell.** The automatic walk dwells 4 s at a station it crosses from below, apart from the last station.

- A wheel turn or a key during a dwell ends it, and that frame's walk step stands. A tap on him stops the automatic
  walk, as a tap does today. That ends the dwell too. His next tap starts the walk again.
- `stepPause` alone ends a dwell. The component never resets it. A tap or the pause control turns the automatic walk
  off, and `stepPause` then clears the dwell on its next frame. A blur or a hidden page calls `stopWalk`, which keeps
  the automatic walk on (Facts). So the dwell keeps running through a blur, as the walk does. While the page is hidden
  no frame runs, so the dwell waits with the walk.
- `Pause.last` is the station `t` of the last dwell, −1 at the start. A crossing of `last` starts no dwell. `last`
  returns to −1 when `t` falls below `last − 0.01`, or when another station's dwell starts. So a dwell ended by a
  step back does not start again a frame later. A walk back past the station and forward again gets a fresh dwell.
- Each frame of a dwell takes `dt` off it. A remainder under 1e-9 is 0. The frame on which the dwell reaches 0 moves:
  the walk step is held only while the dwell stays above 0. With 10 ms frames and frame 0 the arrival, `t` is the
  station's on frames 0 to 399 and moves on frame 400.
- `last` has no effect on the rest turn. In the input mode he turns at rest anywhere, as in the spike.

**(i) Reduced motion.** He stands turned at once. The lantern hangs still. The pool does not flicker.

**(j) The lantern's light.** One uniform, `lanternUniform = { value: new Vector4(0, 0, 0, 0) }`: the glass's world
position in xyz, the strength in w.

- It is read by Vincent's own shaders, the ground's strokes, the grass's base and the grass's blades. With `light=0`
  none of the four reads it, so their programs stay as they are today.
- The frame loop writes it only on a frame that has the figure, with w 1. On unmount it sets w to 0. With `vincent=0`
  nothing writes it, so w stays 0.
- On the ground and the grass, the term is added after the body's colour and before the fog's mix. Vincent's own term
  is already there in the spike: `lanternMoon` writes it in his body, and `lanternExtra` only registers `uLantern`.
  Task 4 composes the ground's and the grass's term the same way.
- The look passes set the ground's and the grass's falloff and warmth. The pool sprite stays until a look pass shows
  the shader's light makes it redundant.

**(k) The material keys.** Vincent's lit materials are keyed `vincent-lit-lantern` and `vincent-solid-lit-lantern`.
The frogs keep `vincent-lit` and `vincent-solid-lit`. The lit ground and grass base with the lantern are keyed
`street-ground-lantern` and `street-grass-base-lantern`. Unlit, they keep `street-ground` and `street-grass-base`.

**(l) Commits.** Every commit message ends with `Claude-Session: https://claude.ai/code/session_016dU6FfJRVrssNDzbaYJzcc`.

## Global constraints

- No dependency beyond `package.json` at `ed464c9`.
- A builder never runs an install step (`npm install`, `npm ci`, `npx`), never pushes and never starts a server.
- British English in comments and docs.
- The scene's triangle ceiling is 1,444,930 at every sampled point of the walk (`$T/tri-read.mjs`, the sweep in
  `$T/k3-gate.sh`).
- 60 fps at stops 0 and 3 at dpr 1.5 on the desktop (p50 16.7 ms).
- `?light=0` keeps the ground's and the grass's programs byte for byte.
- The street's build and grass hashes stay `5492d517c80ba56e` and `33504d291c27e9ac` through Tasks 1 to 3:
  `WT=$WT node $T/build-hash.ts` and `WT=$WT node $T/grass-hash.ts`, run with `node`, never `npx tsx`.
- Each task's green step runs `node_modules/.bin/tsc -b`, `npm run -s lint` and `npm run -s test:sky` from `$WT`. All
  three pass at every commit.
- The browser checks run with `node scripts/check-<name>.mjs` from vform-wt, with
  `DIORAMA_CAPTURE_URL=http://127.0.0.1:5209/`. The Lead starts and stops that dev server.

## Review focus

Five failure modes no task's unit tests reach. Each line names the check that pins it.

1. A tap on him during a dwell. Expected: the walk stops, the dwell ends, and his next tap starts him walking. Pinned
   by Task 3's Case 7, its tap leg.
2. The automatic walk reaching the last stop (`t` 0.9). Expected: no dwell, because the walk ends there. Pinned by the
   `stepPause` test "no dwell at the walk's end".
3. A backward scroll mid-stride. Expected: he stands, turned or not, and never strides backward (Fable's cause 2).
   Pinned by the `gait` test "no stride walking backward".
4. The frogs' material after Vincent's change. Expected: the frogs' program and look unchanged. Pinned by the Lead's
   stop 0 frog crop at the gate, and Decision (k).
5. Anchor A (`skyAnchor=A`) moving the street by 5. Expected: the lantern's light lands under the lantern, not 5 away.
   Pinned by Task 4's capture at stop 2 under `skyAnchor=A`.

---

### Task 1: the form's build (builder)

**Files:**
- Modify: `src/scene/vincent.ts`, `src/scene/streetLife.ts`, `src/scene/streetLife.tsx` (`radialTexture` moves),
  `scripts/check-street-colour.ts` (Decision (e))
- Test: `scripts/street-vincent.test.ts`

**Interfaces:**
- Produces: `buildVincent(painting: ImageData2D): VincentBuild`, where `VincentBuild = { body: VincentPart; head:
  Pivoted; armLeft: Pivoted; armRight: Pivoted; legs: [Pivoted, Pivoted]; lantern: { glass: BrushArraysWithCls; ink:
  BrushArraysWithCls; pivot: [number, number, number] }; shadow: BrushArrays; triangles: number }`.
- Produces: `FORM`, the spike's, less `brim` (the lantern form's brim), `tarascon.crownTop` and `tarascon.cane`. So
  `FORM.tarascon = { hat, back }`, and the crown's top is `CROWN.y1`. `FORM.lantern` (the lantern's own sizes) stays.
- Produces: `lanternUniform: { value: Vector4 }`, `LANTERN_LIFT`, `lanternExtra`, `vincentMoon(lit: boolean, lantern =
  false)`, `vincentStrokeBody(lit: boolean, lantern = false)`. `lanternMoon`'s GLSL reads `uLantern.xyz` and scales its
  term by `uLantern.w`.
- Produces: `radialTexture(): CanvasTexture` exported from `streetLife.ts`.

- [ ] **Step 1: Write the failing tests** in `scripts/street-vincent.test.ts`. Replace the tests at `:39`, `:55`, `:61`
  and `:77`. Migrate "his paint is the painting's" (`:134`). Add four. A pose places each part's points as
  `$E/probe/lead-tarascon-turned.mts` does: the head about its pivot, each arm about its shoulder, each leg about its
  hip, the lantern counter-rotated under the left hand, then the whole yawed about y. The poses leave out the gait's
  pitch.
  - "Vincent fits the rig": every part's points inside `|x| ≤ halfWidth` and `0 ≤ y ≤ height + 0.002`. Walking (arms
    ±0.12, legs ±0.35, no raise, no yaw, all four sign pairs): `|z| ≤ halfDepth`. Turned (the left arm −0.75, the
    lantern plumb, the head π/4, the body yawed π/2): `|z| ≤ halfDepth + 0.003`, a bound on the measured 0.0027
    (`$E/probe/lead-tarascon-turned.log`). His top lies in [0.080, 0.0825].
  - "Vincent is cheap": `build.triangles` equals the sum over body, head, both arms, both legs, the lantern's glass and
    ink, and the shadow. It is at most 4,000.
  - "the smock and the hat carry their classes": the body, both arms and the head pass the existing length and class
    checks. Both sleeves are all smock. The legs and the lantern carry only `none`.
  - "each part carries its class, where it sits on him": the hat groups read `build.head`'s strokes with its pivot
    added back. The smock groups add `z > −0.01`, so the canvas and the easel on his back fall outside them. Every
    group the test expects is non-empty.
  - "his paint is the painting's", migrated: the hat's samples come from `real.head.strokes` (class 8), at least one.
    The smock's two checks stay as they are. The hat: ΔE76 < 3 from the mean of its source patch
    `FORM.tarascon.hat`, read from the scan as the smock's patch is read. The `[margin]` line prints the hat's ΔE76 to
    `#c0b451` as well, found by its hex in `palette.regions.moon`. The `villageWarm` target goes.
  - New "no cane: only the boots reach the ground": the lowest y in `body`'s strokes and underpaint is at least 0.017.
  - New "the right arm swings on its own": `armRight.pivot` is `armLeft.pivot` with x negated. `armRight.underpaint`
    has as many vertices as `armLeft.underpaint`, and its bounding box is `armLeft.underpaint`'s with x negated,
    within 1e-9. `armRight.strokes` is non-empty and all smock.
  - New "the hat is the moon's yellow": the hat's underpaint vertices (class 8 in `head.underpaint`) have the colour
    `underpaintColour(painting, FORM.tarascon.hat)`.
  - New "the lantern starts dark": `lanternUniform.value.toArray()` is `[0, 0, 0, 0]` at import.
  - "the build is deterministic" stays.
- [ ] **Step 2: Run** `node --test scripts/street-vincent.test.ts > $E/t1/red.log 2>&1`. Expected: the new, replaced
  and migrated tests fail.
- [ ] **Step 3: Port the build** from `git show 70acd5b:src/scene/vincent.ts`. Keep only the Tarascon paths: remove the
  `form` parameter, `VincentForm`, `spike`, `tarascon`, the `lantern` form's brim and the cane (`70acd5b`'s lines 360
  to 363). Build `armRight` as `armLeft` is, with the hand's x negated and no z offset. Its pivot is
  `[−ARM.shoulder[0], ARM.shoulder[1], 0]`. Set `CROWN.y1` to 0.0805. Move `radialTexture` to `streetLife.ts` as the
  spike does. Declare `lanternUniform` as `{ value: new Vector4(0, 0, 0, 0) }`. Point the colour gate's `refHat` at
  the moon swatch `#c0b451`. Rewrite the top comment of `vincent.ts`: the form is Tarascon, Mark's call of
  2026-10-28. `StreetWalk.tsx` is not changed in this task: it still renders `body` and `armLeft` until Task 3.
- [ ] **Step 4: Run** the green step (Global constraints) and both hash tools, saving each output to
  `$E/t1/green-<name>.log`. Expected: all pass, and both hashes unchanged.
- [ ] **Step 5: Mutation proofs**, one artefact each in `$E/t1/mutation-<n>.md`, in the format of
  `/Users/markma/Projects/starry-night/scratch/village-craft-2026-10-25/k3/t4/mutation-1.md`:
  1. The cane back (`70acd5b`'s line 363). Expected red: "no cane".
  2. `armRight` built into `body` again. Expected red: "the right arm swings on its own".
  3. The hat's source back to `VINCENT_SOURCES.hat`. Expected red: "the hat is the moon's yellow" and "his paint is
     the painting's".
  4. `VINCENT_RIG.halfWidth` 0.022. Expected red: "Vincent fits the rig".
  5. `triangles` without the right arm. Expected red: "Vincent is cheap".
  6. `lanternUniform` built with `new Vector4()`. Expected red: "the lantern starts dark".
- [ ] **Step 6: Commit** `feat(street): Vincent as the painter on the road to Tarascon, with legs, a lantern and no
  cane (V1 task 1)`.

### Task 2: the pause, the turn and the stride (builder)

**Files:**
- Modify: `src/scene/streetWalk.ts`, `src/scene/StreetWalk.tsx` (the one `gait` call, `:438`)
- Test: `scripts/street-walk.test.ts`

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces, in `streetWalk.ts`:
  - `WALK` with `bob: 0.003`, `roll: 0.015`, `arm: 0.12`, and new `leg: 0.35`, `pitch: 0.06`.
  - `PAUSE = { dwell: 4, rest: 0.5, turnIn: 0.6, turnOut: 0.3, turnGate: 0.2, endTurn: 0.45, body: Math.PI / 2, head:
    Math.PI / 4, raise: 0.75, lag: 0.15, rearm: 0.01 } as const`.
  - `type Pause = { dwell: number; rest: number; turn: number; last: number }` and `initialPause(): Pause`, which
    returns `{ dwell: 0, rest: 0, turn: 0, last: -1 }`.
  - `stepPause(prev: WalkState, next: WalkState, p: Pause, i: WalkInput, immediate: boolean): { next: WalkState; pause:
    Pause }`: the spike's `stepForm` with Decision (h). First, when `i.wheelPx !== 0 || i.keys !== 0`, the dwell is
    0. Then `last` returns to −1 when `t < last − PAUSE.rearm`. In a dwell, the dwell takes `i.dt`, snaps to 0 under
    1e-9, and the walk step is undone only while it stays above 0. A crossing of a station equal to `last` starts no
    dwell. A dwell that starts sets `last` to its station.
  - `gait(distance: number, speed: number, forward: boolean, turn: number): { lift: number; roll: number; arm: number;
    leg: number; pitch: number }`: the spike's `formGait`. It replaces S2's `gait(distance, speed, still)`.
  - `turnPose(turn: number): { body: number; head: number; raise: number }`: the spike's, without the override
    parameters.
  - `limbs(g: ReturnType<typeof gait>, pose: ReturnType<typeof turnPose>): { armLeft: number; armRight: number;
    legLeft: number; legRight: number; hang: number }`, Decision (g). `hang` is `−armLeft − g.pitch`.
  - `lag(swing: number, hang: number, dt: number): number`: `swing + (hang − swing) × (1 − exp(−dt / PAUSE.lag))`.
  - `flicker(time: number, reduced: boolean): number`: 1 under reduced motion, otherwise
    `0.96 + 0.04 × sin(7.3 time) × sin(11.1 time)`.

- [ ] **Step 1: Write the failing tests.** Remove "the gait settles" (`:187`), which tests S2's `gait`. Add these, with
  a 10 ms `dt` and the automatic walk on unless named. "Frame 0" is the first step whose `t` is the station's.
  - "a dwell holds the walk 4 s at a station": start at `t` 0.229 and cross `STATION_T[1]`. `t` equals 0.23 on frames
    0 to 399 and is above it on frame 400.
  - "no dwell starting on a station": start at `t` 0.23. `t` rises on the first step.
  - "no dwell at the walk's end": approach `WALK_T.max` from 0.89 until `t` reaches it. The dwell stays 0.
  - "the turn comes in after the rest and leaves before the dwell ends": from the same start, `turn` is 0 on frame 49,
    above 0 on frame 51, 1 on frame 111, below 1 on frame 357, and 0 on every frame from 387 to 410.
  - "input ends a dwell": in a dwell at 0.23 with 2 s left (`last` 0.23), a step with `wheelPx` 100 gives dwell 0 and `t` above
    0.23. The same with `keys` 1.
  - "a dwell ended by a step back does not start again": in a dwell at 0.23 with 2 s left (`last` 0.23), one step with `keys` −1,
    then 20 steps with no input. The dwell is 0 on all 21, and `t` is above 0.23 on the last.
  - "a walk back past the station re-arms it": with `last` 0.23, start at `t` 0.215 and walk on. The crossing of 0.23
    starts a 4 s dwell.
  - "a stop on blur keeps the dwell": in a dwell at 0.23 with 2 s left (`last` 0.23), apply `stopWalk` to the state,
    then one step with no input. `auto` is true, `t` is 0.23 and the dwell is 1.99.
  - "the input walk turns at rest": `autoMode` false, no input. `turn` is 1 after 1.11 s.
  - "reduced motion stands turned": `immediate` true gives turn 1 on the first step.
  - "no stride walking backward, turned or still": `gait` is all zeros for `forward` false, for `turn` 0.2, and for
    speed 0. The control `gait(0.02, 0.15, true, 0)` has a nonzero `arm` and `leg`.
  - "the head lags the body": `turnPose(0.25).head` is 0 while `.body` is above 0. `turnPose(1)` is π/2, π/4, 0.75.
  - "each arm moves with the opposite leg": walking (`gait(0.02, 0.15, true, 0)`, `turnPose(0)`), `armRight` is
    `−armLeft`, `legLeft` is `−legRight`, and `armLeft` has the sign of `legRight`. At rest and turned (a zero gait,
    `turnPose(1)`), `armLeft` is −0.75, `armRight` 0, both legs 0, `hang` 0.75.
  - "the lantern lags the hand": `lag(0, 1, 0.15)` is `1 − e^−1` within 1e-9.
  - "the pool is still under reduced motion": `flicker(t, true)` is 1 at `t` 0, 0.37, 1.2, 2.5 and 7.9.
    `flicker(t, false)` at the same times stays in [0.92, 1], and at `t` 0 it is 0.96.
- [ ] **Step 2: Run** `node --test scripts/street-walk.test.ts > $E/t2/red.log 2>&1`. Expected: the new tests fail.
- [ ] **Step 3: Implement** the interfaces above in `streetWalk.ts`, porting from
  `git show 70acd5b:src/scene/streetWalk.ts`. Modify the one call in `StreetWalk.tsx:438` to
  `gait(nextState.distance, nextState.speed, !still, 0)`, so S2's figure still strides until Task 3.
- [ ] **Step 4: Run** the green step and both hash tools, saving each output to `$E/t2/green-<name>.log`. Expected:
  all pass, and both hashes unchanged.
- [ ] **Step 5: Mutation proofs** in `$E/t2/mutation-<n>.md`:
  7. `PAUSE.dwell` 3. Expected red: "a dwell holds the walk 4 s at a station".
  8. The input clause of Decision (h) removed. Expected red: "input ends a dwell".
  9. The `endTurn` term removed from `want`. Expected red: "the turn comes in after the rest and leaves before the
     dwell ends".
  10. `armRight` = `+g.arm`. Expected red: "each arm moves with the opposite leg".
  11. The head's lag removed from `turnPose`. Expected red: "the head lags the body".
  12. The `turn >= turnGate` gate removed from `gait`. Expected red: "no stride walking backward, turned or still".
  13. `flicker` ignores `reduced`. Expected red: "the pool is still under reduced motion".
  14. The `last` check removed from the crossing. Expected red: "a dwell ended by a step back does not start again".
  15. The 1e-9 snap removed. Expected red: "a dwell holds the walk 4 s at a station".
- [ ] **Step 6: Commit** `feat(street): Vincent pauses 4 s at a station and turns side-on, each arm with the opposite
  leg (V1 task 2)`.

### Task 3: the figure on the street (builder, then the Lead's browser runs)

**Files:**
- Modify: `src/scene/StreetWalk.tsx`, `src/scene/streetLayout.ts` (`vincentTapCorners`), `scripts/check-street-walk.mjs`
- Test: `scripts/street-vincent.test.ts`, `scripts/check-street-walk.mjs` (browser, run by the Lead)

**Interfaces:**
- Consumes: Task 1's `VincentBuild`, `lanternUniform`, `lanternExtra`, `FORM`, `radialTexture`. Task 2's `PAUSE`,
  `initialPause`, `stepPause`, `gait`, `turnPose`, `limbs`, `lag`, `flicker`.
- Produces: `window.__vincentPose: () => { world: [number, number, number]; roll: number; arm: number; armRight:
  number } | null`, and `window.__vincentForm: () => { t: number; auto: boolean; turn: number; dwell: number; rest:
  number; bodyYaw: number; headYaw: number; clock: number; lantern: number }`, for every visitor. `clock` is the sum of
  the frame loop's clamped `dt` since mount. `lantern` is `lanternUniform.value.w`.
- Produces, in `streetLayout.ts`: `vincentTapCorners(t: number, figure: { min: [number, number, number]; max: [number,
  number, number] } | null): [number, number, number][]`: `vincentBoxCorners(t)`, and with `figure` its 8 corners
  too. `figure` is in the street's frame, without the anchor's offset, as `vincentBoxCorners` is.
- Produces, in `streetWalk.ts`: `vincentFigureBounds(root: Object3D): { min: [number, number, number]; max: [number,
  number, number] } | null`: the union of `Box3.expandByObject` over each `Mesh` under `root`, in world coordinates.
  It skips sprites and every object that is not a mesh. Null when `root` holds no mesh.

- [ ] **Step 0: Write the failing tests** in `scripts/street-vincent.test.ts`. Build the figure as a three tree, the
  way the component's JSX nests it (`70acd5b:src/scene/StreetWalk.tsx:571-627`): a root group, a `Mesh` for each part
  from its positions, the arm, head and leg groups at their pivots, the lantern's group inside the left arm's at the
  lantern's pivot, and a `Sprite` in the lantern's group at the glass, scaled 0.05. Pose it at Codex's pose (Facts):
  `t` 0.7251969475, the root at `vincentPlace(t)` with rotation order `YXZ` and yaw `vincentPlace(t).yaw` +
  1.2315043202, the head at `turnPose(0.7).head`, the left arm −0.588, the lantern's group 0.3616545427, the right
  arm, the legs, the pitch and the roll 0 (the spike's signs, `70acd5b:src/scene/StreetWalk.tsx:514-530`). Call
  `updateMatrixWorld(true)` on the root.
  - "a tap on him lands in his tap rect, mid-turn": project with `walkPose(t, portrait)` as "Vincent stays in frame"
    does, on 1280 × 800 and 390 × 844. Every vertex of every mesh, in world coordinates, lies inside `hitBox` of the
    client rect of `vincentTapCorners(t, vincentFigureBounds(root))`. The control: with `figure` null, at least one
    vertex lies outside. If the control finds none, stop and report.
  - "the lantern's light is not his figure": `vincentFigureBounds(root)` equals the bounds of the same tree with the
    sprite removed, within 1e-12. A tree holding only the sprite gives null.
  Run `node --test scripts/street-vincent.test.ts > $E/t3/red-unit.log 2>&1`. Expected: red, as neither function
  exists.

- [ ] **Step 1: Modify the browser check** `check-street-walk.mjs`.
  - Case 6, K4 (`:701-704`): replace the fixed `sleep(1500)` with a poll of `__vincentForm().turn` every 100 ms until
    it is 1, at most 15 s. Then his roll is 0, `arm` is −0.75 and `armRight` is 0, each within 1e-6.
  - Add Case 7, the dwell. Open `?street=1&walkT=0.2&walkMode=auto&arrival=0` at 390 × 844. In the page, record
    `__vincentForm()` on every animation frame until `t` has passed 0.23, at most 40 s of wall time. Expected, on the
    `clock`: the first frame at `t` 0.23 is the arrival. The first later frame above 0.23 is the departure. The
    departure's `clock` less the arrival's is in [3.9, 4.2]. `turn` reaches 1 between them, and is 0 at the departure.
    `lantern` is 1 on every frame.
  - Case 7's tap leg. Reload the same URL. Poll until `dwell` is above 0, at most 40 s. Tap at `__vincentBox()`'s
    centre as Case 3 taps. Expected within 2 s: `dwell` 0 and `auto` false. A second tap: `auto` true within 2 s, and
    `t` above 0.23 within 5 s.
- [ ] **Step 2 (Lead): Run** the changed check against the merged Tasks 1 and 2 head, served from vform-wt. Save it
  to `$E/t3/red.log`. Expected: K4 and Case 7 fail.
- [ ] **Step 3: Port the frame loop** from `git show 70acd5b:src/scene/StreetWalk.tsx`. The form's branch becomes the
  only branch. S2's branch, `vturn` and the `spike` constant go.
  - Add the right arm beside the left: `armRightGroupRef`, `vincentGeometries.armRightUnder` and
    `vincentGeometries.armRightStrokes`, disposed with the others.
  - Drive the limbs through `limbs`, the lantern through `lag` (bypassed under reduced motion: the lantern hangs at
    `hang`), and the pool's opacity as `flicker(time, reduced)`.
  - Write `lanternUniform.value` only inside the branch that has the figure: the glass's world position, w 1. Set w to
    0 in the effect's cleanup.
  - Key the lit materials by Decision (k).
  - `getVincentBox` projects `vincentTapCorners(t, figure)`, each corner plus `offset` as today. `figure` is
    `vincentFigureBounds(vincentGroupRef.current)` less `offset`, or null when there is no figure.
  - The component does not reset the dwell (Decision (h)). Remove the spike's resets on a tap and on a stop.
  - Keep `clock` in a ref, adding the clamped `dt` each frame.
- [ ] **Step 4: Run** the green step and both hash tools, saving each output to `$E/t3/green-<name>.log`. Expected: all
  pass, and both hashes unchanged.
- [ ] **Step 4b: Mutation proofs** in `$E/t3/mutation-<n>.md`:
  19. `vincentTapCorners` ignores `figure`. Expected red: "a tap on him lands in his tap rect, mid-turn".
  20. `vincentFigureBounds` returns `new Box3().setFromObject(root)`'s bounds, sprites included. Expected red: "the
      lantern's light is not his figure".
- [ ] **Step 5: Commit** `feat(street): the Tarascon figure walks the street, pauses and holds out his lantern (V1
  task 3)`.
- [ ] **Step 6 (Lead): Run** `check-street-walk.mjs`, `check-street-rotation.mjs`, `check-street-grass.mjs` and
  `check-reduced-motion.mjs` (the last with `DIORAMA_CAPTURE_URL='http://127.0.0.1:5209/?street=1&station=2'` and an
  output directory under `$E/t3/`). Save each to `$E/t3/<name>.log` with its exit status. Expected: all pass.

### Task 4: the lantern lights the ground and the grass (Lead)

The Lead builds this task. Its values are set by eye, so it is visual work.

**Files:**
- Create: `src/scene/streetLantern.ts`
- Modify: `src/scene/streetMaterial.ts` (the `body` type), `src/scene/Street.tsx`, `src/scene/grassShader.ts`,
  `src/scene/StreetGrass.tsx`, `package.json` (`test:sky` runs `scripts/street-lantern.test.ts`)
- Test: `scripts/street-lantern.test.ts`, `scripts/street-grass-shader.test.ts`

**Interfaces:**
- Consumes: Task 1's `lanternUniform`. Task 3 writes it each frame.
- Produces, in `streetLantern.ts`: `withLantern(body)`, the body with the term's head and body appended and `uLantern`
  in its uniforms. `groundMaterial(fog, ids: boolean, lit: boolean): MeshBasicMaterial` and `grassBaseMaterial(body,
  fog, ids: boolean, lit: boolean): MeshBasicMaterial`, which `Street.tsx` calls with `flags.light`. `STREET_GROUND_BODY`
  moves here from `Street.tsx:39`.
- `material()`'s `body` parameter accepts optional `uniforms`. The code does not change: it already spreads `body` over
  `{ uniforms: {} }`.

- [ ] **Step 1: Write the failing tests** in `scripts/street-lantern.test.ts`, compiling each material through
  `onBeforeCompile` on three's basic shader and hashing it as `street-grass-shader.test.ts:57` does.
  - "the lantern is not in the unlit programs": `groundMaterial(fogInjection(FOG.colour), false, false)` hashes to
    `8c785ab6d6495140`, key `street-ground`. `grassBaseMaterial` with the probe's three paints, unlit, hashes to
    `d1fe6b0ed3fc628c`, key `street-grass-base`. Neither program contains `uLantern`. The unlit grass stays
    `4b0b48f47e712dbb` (its existing test).
  - "the lantern lights before the fog": lit, in each of the ground's, the grass base's and the grass's fragment
    programs, the lantern term's line comes after the body's colour and before the fog's `mix`.
  - "no lantern without Vincent": in each lit program the term is multiplied by `uLantern.w`.
- [ ] **Step 2: Run** them. Expected: red.
- [ ] **Step 3: Implement** the term: a warm lift from `LIFE.glow`, falling off with the distance from `uLantern.xyz`.
  Start at the pool's reach (0.05 across) and set the falloff at the look passes.
- [ ] **Step 4: Run** the green step and the four browser checks. Capture stop 2 on both viewports, stop 2 under
  `skyAnchor=A` (Review focus 5), and stop 2 with `vincent=0` (no warm light).
- [ ] **Step 5: Mutation proofs** in `$E/t4/mutation-<n>.md`:
  16. In `groundMaterial`, the term applied whatever `lit` is. Expected red: "the lantern is not in the unlit
      programs".
  17. In `grassBaseMaterial`, the same. Expected red: the same test.
  18. The `uLantern.w` factor removed. Expected red: "no lantern without Vincent".
- [ ] **Step 6: Commit** `feat(street): Vincent's lantern lights the ground and the grass round him (V1 task 4)`.

### Task 5: the look passes (Lead)

At most four passes (the cap per slice). The spike's six passes do not count.

- [ ] Capture stops 0 to 4 on both viewports, K3's server beside the branch's (`$S/stations.sh` and `$T/k3shot.mjs`).
- [ ] Capture the motion: the stride, a dwell at stop 1 with the turn in and out, a backward scroll, reduced motion on
  the phone (`$S/burst.mjs`).
- [ ] Look at each at 1:1 and at 4×. Name each defect, fix it, and capture again. Record each pass in the record.
- [ ] Look at the frogs at stop 0 beside K3's (Review focus 4).

### Task 6: the gate's runs (Lead)

- [ ] The green step on the final head, by the Lead.
- [ ] The six browser checks: grass, walk, rotation, cypress hang, portal, reduced motion.
- [ ] The triangle sweep (`$T/k3-gate.sh`'s sweep). Expected: under 1,444,930 at every sampled point.
- [ ] The colour gate on every stop and viewport, K3 against the branch (`$T/k3-colour.sh`). Expected: no region newly
  failing. The smock and the hat within ΔE 10 of their swatches. If the hat fails, it is Mark's call at the preview.
- [ ] The perf runs at stops 0 and 3 (`$T/k3-perf.sh`). Expected: p50 16.7 ms.
- [ ] The twenty mutations, run again by the Lead in a checkout no builder is using.
- [ ] The street's build time against K3's 653 ms. Vincent is built apart from the street, so it should not move.

### Task 7: review and the record (Lead)

- [ ] Codex reviews the branch `ed464c9..HEAD`, told which commits are the Lead's (Task 4) to read hardest.
- [ ] The record `tasks/2026-10-28-vincent-form.md`: the build, the look passes, the gate, Codex's findings and their
  answers.
- [ ] The Tunables entry in `CLAUDE.md` replacing slice 2's figure numbers where they changed, and lessons in
  `tasks/lessons.md`.
- [ ] Push `feat/vincent-form` for a Vercel preview. No PR until Mark has looked.
