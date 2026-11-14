# Plan: the walk's end, and the wheel off the lane (audit items 9 and 10)

2026-11-14, the Lead. Mark's word (16:24): "I will go with your recommendations", and again at 20:20: "go with your
recommendations". The recommendation he took: "A tap on Vincent at stop 4 turns him, and the automatic walk returns
to stop 0 with its dwells." This changes a walk Mark passed at a gate (2026-10-24 and V1, 2026-10-28). Mark, 20:41:
"Merge the walk-end slice too once it's gated". So it merges after the Lead's gate, and its Vercel preview link goes
to Mark in the PR. Builder: an Opus builder subagent. Plan reader: Argon. Gate batch: Hydrogen.

Argon read the first version (`scratch/briefs-2026-11-14-evening/a2/report.md`, 21:16) and found three P1s, four
P2s and a P3, each with a node command. All hold. This version fixes them: the rest and the stride follow his facing
(F1), the hold is directional and holds only the automatic step (F2), the wander takes the unturned facing and adds
the mirrored turn once (F3), test 5 replaces an old assert (F4), the tap box is left alone (F5), the mirror is
continuous and `settled` reads `about` (F6), the stride has a test and `initialWalk` cannot start running at the end
(F7), and the lines and case numbers are right (F8). The Lead found one more: a turn at stop 4 kept `last` at 0.66,
so the walk back would skip the dwell at 0.66 (D4's re-arm now clears it).

Third version (21:35). The builder stopped before any code: test 7's bar of 0.1 rad a frame fails the forward walk
Mark passed, whose dwell turn-out peaks at 0.1304 rad a frame at `dt` 1/60 (`scratch/briefs-2026-11-14-evening/b9/yaw-bound.log`,
re-run by the Lead). It also predicted four proofs that could not go red. This version fixes all five: test 7's
bar is the passed walk's own steepest step, the reset of `last` is D4's re-arm alone, case 9 checks the stride, the
check gains a `CASES` filter, and the tests' `Pause` literals gain `about`.

Fourth version (21:58, with A4's two fixes at 22:28). Argon read the second version (`scratch/briefs-2026-11-14-evening/a3/report.md`, 21:46): F1
to F8 fixed, and three new findings, each with a node command. All hold. N1 (P1): the rest rule of the second version
turned him off a backward slide, a forward key after the walk back left him facing down the lane, and a desktop tap at
stop 4 turned him round with no walk to follow. N2 (P2): test 7 could pass on the base. N3 (P2): the turn at stop 4
swung 46.7° the wrong way first, and a trip from a dwell facing down the lane snapped his head by 90°. The fixes: the
rest follows his facing (D5), a forward key or wheel sets `dir` to 1 (D2), the flip needs the automatic walk (D3),
`turn` waits for `about`'s midpoint (D5), and `offLanePose` reads `about` (D6). The advisor added the state table,
the property test (test 10) and `turn` in test 1's hash. The builder starts only after Argon's GO on this version.

Read first: `src/scene/streetWalk.ts`, `src/scene/streetWander.ts`, `src/scene/StreetWalk.tsx`,
`scripts/street-walk.test.ts`, `scripts/street-wander.test.ts`, `scripts/check-street-walk.mjs`, and the records
`tasks/2026-10-28-vincent-form.md` and `tasks/2026-10-29-vincent-wander.md` for the lettered decisions the code cites.

## The defects

- **Item 9.** `stepWalk` turns `auto` off whenever `t` reaches `WALK_T.max` (`streetWalk.ts:84-86`). So at stop 4 a
  tap on him (`toggleWalk`, `:118-134`, called at `StreetWalk.tsx:610`) turns `auto` on, and the next step turns it
  off. On a phone the automatic walk is the only way to move, so a phone visitor cannot go back along the lane.
- **Item 10.** Under reduced motion or the still state, off the lane, a wheel turn sets the wander's mode to
  `returning` (`StreetWalk.tsx:681`), but `stepWander` returns a frozen state unchanged (`streetWander.ts:382`). The
  queued wheel was already zeroed (`StreetWalk.tsx:660`), so the turn is lost and he never comes home. On the lane the
  same wheel still walks (run B3, `scratch/audit-2026-11-14/lead-notes.md:53`).

## The behaviour wanted

D1 to D4 are Mark's recommendation, made exact. D5 to D8 are the Lead's calls, and Mark sees them on the preview.

- **D1, a direction.** `WalkState` gains `dir: 1 | -1`, the automatic walk's direction. `initialWalk` gives `1`, and
  sets `auto` to `autoMode && clamped < WALK_T.max`: a walk that opens at its end is not running (F7).
- **D2, where the automatic walk ends.** The automatic walk moves `t` by `dir * WALK.auto` (world units a second, as
  today). It turns `auto` off at the end it walks toward: `WALK_T.max` when `dir` is 1, `WALK_T.min` when `dir` is -1.
  Reaching the other end does not turn it off. Keys and the wheel move `t` as today, in either direction.
  A frame whose keys or wheel move him up the lane (`i.keys > 0` or `wheelT > 0` in `stepWalk`) sets `dir` to 1. A
  frame that moves him down the lane leaves `dir` alone, so with `dir` 1 a backward key still slides him back turned,
  as V1 passed (`tasks/2026-10-28-vincent-form.md:67-68`). So a forward key always turns him to face up the lane (N1).
- **D3, a tap on him.** `toggleWalk` gains a third parameter, `autoMode`. The call at `StreetWalk.tsx:610` passes
  `isPhone`, the value the frame loop gives `WalkInput.autoMode` (`:666`). Outside the still state, with `autoMode`:
  at the end `dir` points to, with `auto` off, a tap flips `dir` and turns `auto` on. Anywhere else, and always
  without `autoMode`, a tap toggles `auto` as today and keeps `dir`. So a desktop in input mode never flips (N1).
  In the still state: a tap goes to the next station in `dir`. At the end `dir` points to, it flips `dir` first, then
  goes to the next station the other way. So a reduced-motion visitor on a phone can also walk back. The flip
  leaves the pause's `last` alone: D4's re-arm clears it, and no handler touches it (Decision (h),
  `StreetWalk.tsx:187-188`).
- **D4, the dwells on the way back.** With `dir` -1 the automatic walk dwells at each station it crosses from above
  (`prev.t > st && t <= st`), for `PAUSE.dwell`, apart from `WALK_T.min`, where the walk ends. That mirrors today's
  rule (`stepPause`, `:209-217`). The `last` re-arm (`:196`) becomes a level test in the walk's direction:
  `if (dir === 1 ? t < last - PAUSE.rearm : t > last + PAUSE.rearm) last = -1`. After a flip at stop 4, `t` 0.9 is
  above every station that dwells plus 0.01, so the first frame clears `last`. After a flip at 0 the same holds the
  other way.
- **D5, he turns before he walks back.** `Pause` gains `about`, from 0 (facing up the lane, as today) to 1 (facing
  down it). `stepPause` eases it toward 1 when `dir` is -1 and toward 0 when `dir` is 1, at `i.dt / PAUSE.about`, a
  new constant of 0.8 s for the half-turn. `immediate` (reduced motion, the still state) sets it at once. It changes
  only in `stepPause`, so it stands still while he is off the lane.
  `about` is clamped to 0 and 1, so it reaches its end exactly. "The half-turn" below means the frames on which
  `about` is not yet at its end for `dir` (1 when `dir` is -1, 0 when `dir` is 1).
  - **The turn during the half-turn (N3).** D6's drawn yaw is a blend from his facing toward the cottage side by
    `ease(turn)`. A fall in `turn` moves him the wrong way while `about` is short of 0.5, and the right way after it.
    So during the half-turn `turn` does not change until `about` has passed 0.5 toward its end. Then it eases out at
    `i.dt / (PAUSE.about / 2)`, so a full turn reaches 0 as `about` reaches its end. `immediate` keeps its rule
    (`turn` 1 at once). The Lead's sweep (21:56, `turn` from 0, 0.25, 0.5, 0.75 and 1, both ways): the body's yaw is
    monotone, its largest step is 0.1156 rad a frame against test 7's 0.1309, and he walks on frame 48 with `turn` 0.
  - **Accepted: the head.** From a full dwell turn, his head turns back toward the lane by up to 55° in the first
    0.4 s, before his body turns. No frame moves it more than 0.05 rad. Mark sees it on the preview.
  - **The hold (F2).** While the automatic walk runs and the step was its own (the same test as the station clamp:
    `i.wheelPx === 0 && i.keys === 0 && prev.target === prev.t`), `stepPause` undoes the step during the half-turn,
    as a dwell undoes it (`:200-204`). The hold needs no test of `turn`: the fall above ends at 0 as `about` ends, for
    any value of the constants. A wheel or a key during the half-turn moves him as today.
  - **The rest (F1, N1).** `rest` resets to 0 when `facesMotion(prev.t, t, about)` is true (D7, this frame's `about`)
    and on every frame that `about` changes. Moving against his facing keeps counting, as V1 passed: a backward key
    from a dwell turn slides him back turned (`streetWalk.ts:223`, `tasks/2026-10-28-vincent-form.md:67-68`).
  - **Accepted: a forward key after the walk back.** He moves up the lane while he turns to face it, for up to
    `PAUSE.about` (0.8 s) plus one frame, with no stride until `facesMotion` is true and `turn` is under the gate.
- **D6, his drawn yaw.** His facing on the lane is `slot.yaw + π · ease(about)`, with `ease` the smoothstep that
  `turnPose` uses. `turnPose` gains a second parameter, `turnPose(turn, about = 0)`: its `body` and `head` are
  multiplied by `1 - 2 · ease(about)`, so the mirror is continuous (F6) and `raise` is unchanged. At a dwell he turns
  toward the same side of the lane both ways. The readers:
  - The body (`StreetWalk.tsx:749-763`): on the lane, its yaw is the facing above, plus `turnPose(turn, about).body`.
    The lantern's pool (`:781`) reads the same two values, so it follows.
  - The wander (F3). `here` on the lane (`StreetWalk.tsx:403`) takes the unturned facing as `yaw`, and `Here`
    gains an optional `about` (default 0, so the tests' literals still compile). `wanderTo` (`streetWander.ts:348`)
    adds `turnPose(s.turn, here.about ?? 0).body`, once. `tripFrom` then stores the unturned facing in `syaw`.
  - The way home (`StreetWalk.tsx:689`): the new pause spreads the old one,
    `{ ...pauseRef.current, dwell: 0, rest: 0, turn: 0 }`, so `about` and `last` are kept.
  - `__vincentForm().settled` (`StreetWalk.tsx:501-504`) also requires `about` to be 0 or 1.
  - Off the lane (N3). `offLanePose(turn, about = 0)` (`streetWander.ts:370-371`) passes `about` to `turnPose`. The
    call at `StreetWalk.tsx:756` passes the pause's `about` to both functions. The pause keeps `about` while he is off
    the lane, so his head does not snap when he leaves a dwell facing down the lane.
  - Every other reader keeps `about` 0 by the default: `limbs` (`streetWalk.ts:264`, a type only), and the tests at
    `scripts/street-vincent.test.ts:318`, `scripts/street-walk.test.ts:356-373` and
    `scripts/street-wander.test.ts:528-573`. This list is from `grep -rn 'turnPose\|offLanePose' src scripts` (21:57).
  - Not his tap box: on the lane it reads `vincentBoxCorners(t)`, which a half-turn leaves the same (F5).
- **D7, the stride.** A new export, `facesMotion(prevT, t, about)`: true when he moves the way he faces (`t` rises
  with `about < 0.5`, or falls with `about >= 0.5`, by more than 1e-7). The lane's `gait` call (`StreetWalk.tsx:755`)
  passes it as `forward`. Moving against his facing (an arrow key back) glides as today. D5's rest reads it too.
- **The camera does not change.** It reads only `t`, through `walkPose(t)`. On the way back it backs down the lane, so
  he walks toward it, facing it. No new camera pose.
- **D8, item 10.** A frozen step whose mode is `returning` puts him home at once: on `route[0]`, mode `lane`, yaw
  `syaw`, `turn` 0, `arrived` 0. The frame loop's branch (`StreetWalk.tsx:686-689`) then hands him to the lane at
  `t0`. A frozen step in any other mode still returns the state unchanged. Accepted side effect (Argon's note): "Pause
  motion" pressed while he walks home also puts him home at once, where a trip out stands still.

## The state table

Each cell is V1's passed behaviour or a D-rule. "Forward" is a key or wheel that moves him up the lane, "back" one that
moves him down it. "Phone" is `autoMode` (`isPhone`). "Still" is reduced motion or the still state. "Pause motion"
makes `stepPause` immediate (`StreetWalk.tsx:696`), so its poses are set at once, as under reduced motion.

| Where he is | A tap | Forward | Back | The automatic step |
| --- | --- | --- | --- | --- |
| Phone, `dir` 1, below 0.9 | toggles `auto` (today) | `dir` stays 1 | V1's slide, turned | walks up, dwells from below |
| Phone, `dir` 1, at 0.9, `auto` off | flips to `dir` -1, `auto` on: the half-turn, then the walk back (D3, D5) | none (clamped) | V1's slide, turned | none |
| Phone, `dir` -1, above 0 | toggles `auto`, keeps `dir` | `dir` 1: the half-turn while he moves (D2, accepted) | faces his motion, strides | walks down, dwells from above (D4) |
| Phone, `dir` -1, at 0, `auto` off | flips to `dir` 1, `auto` on: the half-turn, then the walk up | `dir` 1: the half-turn | none (clamped) | none |
| Desktop (input mode), not still | toggles `auto`, which never runs. `dir` stays 1 (D3) | walks up, strides | V1's slide, turned | none |
| Still, either mode | the next station in `dir`. At `dir`'s end, flips first (D3). `about` at once | `dir` 1, `about` 0 at once | slides, turned | none |
| Pause motion, phone | as the phone rows, but the walk waits until play. `about` at once | `dir` 1, `about` 0 at once, slides turned | slides, turned | none |

## The tests

Unit tests in `scripts/street-walk.test.ts` and `scripts/street-wander.test.ts`. Step whole walks at `dt` 1/60 through
`stepWalk` then `stepPause`, the order the frame loop uses. Read any name the base commit lacks (`facesMotion`, `dir`)
through a namespace import (`import * as walk from`), so each file still loads on the base commit (F6). Add
`about: 0` to the four `Pause` literals in `scripts/street-walk.test.ts` (`:278`, `:307`, `:317`, `:325`), so
`typecheck:scripts` passes with `about` required.

"His turn" in tests 2, 7 and 10 is the figure's yaw relative to the lane: `Math.PI * ease(about) +
turnPose(turn, about).body`, with no `slot.yaw` in it. `vincentPlace(t).yaw` wraps across ±π at `t` ≈ 0.1513, and the
lane's curve adds its own change while he walks (Argon's A4, V4-1). Where a test compares world yaws (tests 6 and 7's
part 2), it wraps the difference to ±π first.

1. **The forward walk is unchanged.** From `initialWalk(0, true)` and `initialPause()`, step until `auto` turns off.
   Pin the hash of the per-frame `[t, turn]` pairs through `roundedJson` (`scripts/lib/rounded-json.ts`). A hash of
   `t` alone cannot see a change to the rest or the turn, and this version changes both rules. Argon read the `t`
   hash on `1dc440d`: 2,337 frames, `a7dd47de8e3b1696`. Read the pairs' hash yourself on your base, write it in the
   test's comment with that commit, and require it after the change.
2. **The walk back.** From the end of test 1 with the pause's `turn` at 1, a tap gives `dir` -1 and `auto` on. Step
   until `auto` turns off. Require all of these:
   - No change in `t` until `about` is 1 and `turn` is under `PAUSE.turnGate`.
   - From the tap until `t` first changes, his turn never decreases (N3).
   - Dwells at 0.66, 0.44 and 0.23, in that order, each `PAUSE.dwell` long within one frame, and none at 0.9 or 0.
   - On every frame that `t` falls outside a dwell, `turn` is under `PAUSE.turnGate` and `facesMotion` is true, and
     `gait(...).leg` is not 0 on most of them (F1, F7).
   - The walk ends at `t` 0 with `auto` off.
3. **Round trip.** A tap at `t` 0 with `dir` -1 gives `dir` 1, and the walk forward again repeats test 1's dwells.
4. **A tap mid-lane** toggles `auto` and keeps `dir`, in both directions.
5. **The still state.** Taps from `t` 0.9 visit 0.66, 0.44, 0.23 and 0, then flip and go forward again. It replaces
   the assert at `scripts/street-walk.test.ts:190-192` ("from 0.9 stays 0.9"), which D3 changes on purpose (F4).
6. **The drawn yaw at a dwell** is the same world facing both ways, within 1e-9.
7. **No snap.** The bar is `PAUSE.body * 1.5 * dt / PAUSE.turnOut + 1e-9` a frame: 0.1309 rad at `dt` 1/60, the
   steepest step of the dwell's turn-out in the forward walk Mark passed (the builder measured 0.1304 on the base). A
   90° snap is twelve times that. Compute the bar from the constants, so a retune of `turnOut` moves it.
   - Part 1. Over every frame of tests 2 and 3, his turn changes by at most the bar. Then the sweep: a half-turn from `turn` 0, 0.25, 0.5, 0.75 and 1, at each end, through
     `stepPause` with the automatic walk on. On every frame his turn is monotone toward the new facing and
     steps by at most the bar, the head's (`turnPose(turn, about).head`) steps by at most the bar, and `turn` is under
     `PAUSE.turnGate` on the first frame `t` changes. Part 1 passes on the base, where no half-turn exists. Two
     mutants prove it instead: the mirror as a step (`1 - 2 * (about >= 0.5 ? 1 : 0)`), and `turn` falling before the
     midpoint.
   - Part 2 (F3, N2, N3). A trip off the lane from a dwell facing down it (`turn` 1, `about` 1), then home. Compare
     with absolute values, not with the code's own functions: the trip's first yaw is `slot.yaw + PAUSE.body`, the
     cottage side, and `offLanePose(1, 1).head` is `-PAUSE.head`, each within 1e-9. The yaw on the frame he is home
     is `slot.yaw + Math.PI`. On the base the first yaw is `slot.yaw + 3π/2` and the head `+PAUSE.head`, so part 2
     fails there from its own asserts.
8. **Item 10.** A frozen `returning` step lands him on the lane per D8. A frozen `going` step returns the state
   unchanged.
9. **The rows of the table that N1 found.** Each through `stepWalk` then `stepPause`:
   - (a) Turned at a stand (`turn` 1, `about` 0, `dir` 1), 30 frames of a back key: `turn` is still 1 (V1's slide).
     It passes on the base and after.
   - (b) At the end of test 2 (`dir` -1, `about` 1), one second of a forward key: `dir` is 1 from the first frame,
     `about` reaches 0 within `PAUSE.about` plus one frame, `t` rises, and `facesMotion` is true on every frame after
     that.
   - (c) `autoMode` false, outside the still state, `t` 0.9: a tap keeps `dir` 1, and 60 frames of `stepPause` keep
     `about` 0.
10. **The property test.** A seeded run (`mulberry32`, if the test files have one, else a 10-line one in the test) of
    500 sequences of 600 frames each, for `autoMode` true and false. Each sequence starts at a station drawn from
    `STATION_T` (0 and 0.9 included), with `about` at its `dir`'s end. With `autoMode` true, `dir` is drawn from 1
    and -1. With `autoMode` false, it is 1. Each frame draws one of: nothing, a tap, a forward key, a back key, a wheel
    of ±120 px, or a run of idle frames. Still stays off. Require on every frame:
    - With `autoMode` false, `dir` is 1.
    - After a frame with a forward key, `dir` is 1.
    - When `Math.abs(t - prev.t) > 1e-7` (`facesMotion`'s own threshold) and `facesMotion` is false, either `dir` is
      1 and `t` fell (V1's slide), or `about` is not at its end (the half-turn).
    - His turn steps by at most test 7's bar.
    On a failure, print the seed and the frame.

Browser cases, added to `scripts/check-street-walk.mjs` as cases 9 and 10 (cases 0 to 8 exist), with its launcher.
Update its header list. Add a `CASES` filter, as `scripts/check-failure-paths.mjs` has (`wanted(n)`), so `CASES=10`
runs case 10 alone. With no `CASES`, every case runs, as today.

9. **The phone's walk back.** 390 × 844, a coarse pointer, `?street=1&arrival=0&walkMode=auto&walkT=0.9`. Tap his box
   centre (check it with `elementFromPoint`). Within a capped poll, `t` falls below 0.85, and his body's world yaw is
   within 0.2 rad of the slot's yaw plus π. Read it through `__vincentPose` (`StreetWalk.tsx:482`): add `yaw` to it.
   Then, while `t` falls from 0.85 to 0.7, read `__vincentPose().roll` every 100 ms: it is not 0 on most reads and
   takes both signs. He strides. A glide reads 0 (`gait`, `streetWalk.ts:237`).
10. **The wheel under reduced motion, off the lane.** Send him off the lane with a tap on open ground, then turn on
    reduced motion through CDP. A wheel turn puts him on the lane within two frames.

## Proof the builder gives

1. Red first: tests 2, 3, 5, 6, 7's part 2, 8, 9 (b) and 9 (c), and cases 9 and 10 fail on the base commit. Run
   each case alone with `CASES`. Test 1, test 4's forward half, 7's part 1 and 9 (a) pass on both. Test 10 is proved
   by the mutants below.
2. All of `scripts/street-walk.test.ts`, `scripts/street-wander.test.ts` and `scripts/check-street-walk.mjs` pass,
   and the full suite: `npm run -s test:sky` (507 plus the new cases, 0 skipped). Lint, `npx tsc -b` and
   `npm run -s typecheck:scripts` pass.
3. Attack your own tests. Put each fault back alone and name the test that goes red:
   - The end rule kept at `WALK_T.max` only.
   - The dwell rule kept for the forward walk only.
   - The re-arm kept for the forward walk only (test 2: no dwell at 0.66).
   - The hold kept as `0 < about < 1`, so the first frame after a tap still steps (test 2).
   - `rest` resets only on forward motion (the old `t - prev.t > 1e-7`).
   - `rest` resets on any motion, `Math.abs(t - prev.t) > 1e-7` (test 9 (a)).
   - `turn` eases out from the first frame of the half-turn (test 2's monotone yaw, and test 7's sweep).
   - The mirror as a step, `1 - 2 * (about >= 0.5 ? 1 : 0)` (test 7's part 1).
   - A forward key that leaves `dir` alone (test 9 (b), and test 10).
   - The flip without the `autoMode` test (test 9 (c), and test 10).
   - `offLanePose` that ignores `about` (test 7's part 2).
   - `gait` given the old forward test (case 9's stride).
   - `wanderTo` adds the unmirrored turn.
   - A frozen step that ignores `returning`.
   A red must come from the test's own assertion.
4. A strip of frames of the walk back, for the Lead: the phone viewport, every 0.5 s from the tap until the first
   dwell starts, unpinned clock. Save them to `output/walk-end/`.

## Machine rules

One browser run at a time on this machine. Before each browser run, run `pgrep -fl 'vite preview|--headless|remote-debugging-port=[1-9]'`
(the Antigravity app keeps renderers with `--remote-debugging-port=0` open, and they are not a check run).
If it prints anything that is not yours, wait 60 s and look again, up to 10 times. Never run the unit suite beside
a browser run. Use port 5191 for your server (the check's default), and stop it when the run ends.

## The gate (not the builder's job)

Hydrogen runs the batch: the suite, the 11-frame capture set (all 11 identical to
`scratch/audit-2026-11-14/slices/union-main/`: they use `walkMode=input` at each station, facing up the lane),
`check-street-walk.mjs`, `check-portal.mjs` and `check:reduced`. The Lead reads the whole diff, runs the suite and two
mutations itself, and looks at the strip. Then the Lead merges (Mark, 20:41), and the PR's Vercel preview link goes to
Mark.
