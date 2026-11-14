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
so the walk back would skip the dwell at 0.66 (D3 now resets it).

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
- **D3, a tap on him.** Outside the still state: at the end `dir` points to, with `auto` off, a tap flips `dir`,
  turns `auto` on, and resets the pause's `last` to -1. Anywhere else a tap toggles `auto` as today and keeps `dir`.
  In the still state: a tap goes to the next station in `dir`. At the end `dir` points to, it flips `dir` first, then
  goes to the next station the other way. So a reduced-motion visitor on a phone can also walk back. `last` lives in
  `Pause`, so the flip's reset happens where the frame loop handles the tap (`StreetWalk.tsx:610`), or `toggleWalk`
  returns a flag that the loop reads. The builder picks one and says which.
- **D4, the dwells on the way back.** With `dir` -1 the automatic walk dwells at each station it crosses from above
  (`prev.t > st && t <= st`), for `PAUSE.dwell`, apart from `WALK_T.min`, where the walk ends. That mirrors today's
  rule (`stepPause`, `:209-217`). The `last` re-arm (`:196`) mirrors too: with `dir` -1, `last` resets once `t` rises
  past `last + PAUSE.rearm`.
- **D5, he turns before he walks back.** `Pause` gains `about`, from 0 (facing up the lane, as today) to 1 (facing
  down it). `stepPause` eases it toward 1 when `dir` is -1 and toward 0 when `dir` is 1, at `i.dt / PAUSE.about`, a
  new constant of 0.8 s for the half-turn. `immediate` (reduced motion, the still state) sets it at once. It changes
  only in `stepPause`, so it stands still while he is off the lane.
  - **The hold (F2).** While the automatic walk runs and the step was its own (the same test as the station clamp:
    `i.wheelPx === 0 && i.keys === 0 && prev.target === prev.t`), `stepPause` undoes the step while
    `(dir === -1 && about < 0.95) || (dir === 1 && about > 0.05)`, as a dwell undoes it (`:200-204`). A wheel or a
    key during the turn moves him as today.
  - **The rest (F1).** `rest` resets to 0 when he moves either way (`Math.abs(t - prev.t) > 1e-7`) and on every frame
    that `about` changes. So the lantern lowers while he turns, and he walks back with the lantern down.
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
  - Not his tap box: on the lane it reads `vincentBoxCorners(t)`, which a half-turn leaves the same (F5).
- **D7, the stride.** A new export, `facesMotion(prevT, t, about)`: true when he moves the way he faces (`t` rises
  with `about < 0.5`, or falls with `about >= 0.5`, by more than 1e-7). The lane's `gait` call (`StreetWalk.tsx:755`)
  passes it as `forward`. Moving against his facing (an arrow key back) glides as today.
- **The camera does not change.** It reads only `t`, through `walkPose(t)`. On the way back it backs down the lane, so
  he walks toward it, facing it. No new camera pose.
- **D8, item 10.** A frozen step whose mode is `returning` puts him home at once: on `route[0]`, mode `lane`, yaw
  `syaw`, `turn` 0, `arrived` 0. The frame loop's branch (`StreetWalk.tsx:686-689`) then hands him to the lane at
  `t0`. A frozen step in any other mode still returns the state unchanged. Accepted side effect (Argon's note): "Pause
  motion" pressed while he walks home also puts him home at once, where a trip out stands still.

## The tests

Unit tests in `scripts/street-walk.test.ts` and `scripts/street-wander.test.ts`. Step whole walks at `dt` 1/60 through
`stepWalk` then `stepPause`, the order the frame loop uses. Read any name the base commit lacks (`facesMotion`, `dir`)
through a namespace import (`import * as walk from`), so each file still loads on the base commit (F6).

1. **The forward walk is unchanged.** From `initialWalk(0, true)` and `initialPause()`, step until `auto` turns off.
   Pin the hash of the per-frame `t` sequence through `roundedJson` (`scripts/lib/rounded-json.ts`). Argon read it on
   `1dc440d`: 2,337 frames, `sha256(roundedJson(ts)).slice(0, 16)` is `a7dd47de8e3b1696`. Read it again yourself on
   your base, write it in the test's comment with that commit, and require it after the change.
2. **The walk back.** From the end of test 1 with the pause's `turn` at 1, a tap gives `dir` -1 and `auto` on. Step
   until `auto` turns off. Require all of these:
   - No change in `t` until `about` reaches 0.95.
   - Dwells at 0.66, 0.44 and 0.23, in that order, each `PAUSE.dwell` long within one frame, and none at 0.9 or 0.
   - On every frame that `t` falls outside a dwell, `turn` is under `PAUSE.turnGate` and `facesMotion` is true, and
     `gait(...).leg` is not 0 on most of them (F1, F7).
   - The walk ends at `t` 0 with `auto` off.
3. **Round trip.** A tap at `t` 0 with `dir` -1 gives `dir` 1, and the walk forward again repeats test 1's dwells.
4. **A tap mid-lane** toggles `auto` and keeps `dir`, in both directions.
5. **The still state.** Taps from `t` 0.9 visit 0.66, 0.44, 0.23 and 0, then flip and go forward again. It replaces
   the assert at `scripts/street-walk.test.ts:190-192` ("from 0.9 stays 0.9"), which D3 changes on purpose (F4).
6. **The drawn yaw at a dwell** is the same world facing both ways, within 1e-9.
7. **No snap.** Over every frame of tests 2 and 3, the drawn yaw (facing plus `turnPose(turn, about).body`) changes by
   under 0.1 rad a frame. And a trip off the lane from a dwell facing down it, then home: the trip's first yaw equals
   the drawn yaw on the lane, and the yaw on the frame he is home equals the drawn yaw with `turn` 0 (F3).
8. **Item 10.** A frozen `returning` step lands him on the lane per D8. A frozen `going` step returns the state
   unchanged.

Browser cases, added to `scripts/check-street-walk.mjs` as cases 9 and 10 (cases 0 to 8 exist), with its launcher.
Update its header list.

9. **The phone's walk back.** 390 × 844, a coarse pointer, `?street=1&arrival=0&walkMode=auto&walkT=0.9`. Tap his box
   centre (check it with `elementFromPoint`). Within a capped poll, `t` falls below 0.85, and his body's world yaw is
   within 0.2 rad of the slot's yaw plus π. Read it through `__vincentPose` (`StreetWalk.tsx:482`): add `yaw` to it.
10. **The wheel under reduced motion, off the lane.** Send him off the lane with a tap on open ground, then turn on
    reduced motion through CDP. A wheel turn puts him on the lane within two frames.

## Proof the builder gives

1. Red first: tests 2, 3, 5, 6, 7, 8 and cases 9 and 10 fail on the base commit. Test 1 and test 4's forward half
   pass on both.
2. All of `scripts/street-walk.test.ts`, `scripts/street-wander.test.ts` and `scripts/check-street-walk.mjs` pass,
   and the full suite: `npm run -s test:sky` (507 plus the new cases, 0 skipped). Lint, `npx tsc -b` and
   `npm run -s typecheck:scripts` pass.
3. Attack your own tests. Put each fault back alone and name the test that goes red:
   - The end rule kept at `WALK_T.max` only.
   - The dwell rule kept for the forward walk only.
   - The flip keeps `last`.
   - The hold kept as `0.05 < about < 0.95`.
   - `rest` resets only on forward motion (the old `t - prev.t > 1e-7`).
   - `gait` given the old forward test.
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
