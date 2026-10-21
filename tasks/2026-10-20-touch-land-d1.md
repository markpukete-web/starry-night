# D1 — touch the land: the record and the gate, 2026-10-21 (in progress)

The plan: `tasks/2026-10-20-touch-land-d1-plan.md` (Codex's first read, fourteen findings folded; the rebase onto
E1 and E2 and Codex's read of it, R1–R4 folded). Built on `feat/touch-land-d1` from `main` (`7bd583e` plus the
docs). Lead Claude (`w4:p1`), reviewer Codex (`w4:p4`); no worker (the gate's captures are a handful of runs, as
for C). Evidence in `scratch/touch-land-2026-10-20/gate/` (gitignored: the pinned frames, the diffs, the crops, the
logs). Mark, 2026-10-21: "Go with your recommendations, build it once Codex reads clean." Both choices as
recommended: `landMasksSky` true, the ground still.

## What was built

1. `7515c37` the model (`landTouch.ts`): a touch's amplitude ramps from the value it had to its target over 0.12 s
   (F5), swings back as a damped cosine (τ 0.9 s, period 1.3 s) closed to exactly zero 5 s after the release,
   admission against the touches live at `now` (F10); the push is a smooth lateral field x(1 − x²)² normalised to
   peak at 1 at 0.447 of the radius and zero at the point (F1), with a quartic-hat dip of 0.35 of the push under
   the hand; the `bend` knob multiplies once, in the material (F7). The bend injection takes the weight as a GLSL
   expression and sizes its list from `maxTouches`. `buildLandTrees` emits each strip and dome vertex's weight
   (its height over the terrain under it over the mass's height); a dome's buried uphill vertices weigh 0. Six
   model tests red before the module; the weight test red before the emission.
2. `e845b81` the knob `bend` (`touchBend`, 0–1.5, shipped 1) through the tuning, the tuner's touch route, the
   shipped file and the writer's allowlist (F6), with the two tuning tests extended.
3. `cad4c4e` the cypress's two materials take the bend with the vertex's own local height as the weight (R1); the
   trees' strips and domes take it on their own materials with `aBend`, so the ground's program stays E2's. The
   hook casts the pointer at the land's opaque bodies with their occluders once per frame on its latest position
   (F8), begins a hold on the press (F2), releases on the up, a leave, a cancel or a hidden tab (F3), and over
   land masks the sky's hover and tap (at bend 0 nothing, B exactly, F9). The picking policy is pure and tested
   (`landPick`; the ground's ribbons are never an occluder, R2). Names `cypress`, `cypress-solid`,
   `cypress-strokes`, `island-solid`. The scene owns the land store; the hook prunes it at priority −1 and empties
   it while disabled. Seams `__landState`, `__landInject`, `__landBounds`.
4. `375d825` the land asked before the sky on each hover step (B's 60 ms gate), after the headed run showed the
   frame's test one step behind a move onto the tree.
5. `9136dc4` Codex's code review answered (the plan's Review section, "The code review (G9)"): the hold released
   on a rebind (F1), the pending move consumed on the up (F2), bend-to-zero clears the land (F3), a tap completes
   its ramp (F4), the suite in `test:sky` (F5), the mask decided on the current position (F6), no mesh cache (F7),
   the weight test checks the field (F8).

## Deviations from the plan, for the review

- R3's "throw in development on a missing mesh" is not built: the tree and the land mount after their loads, so a
  name is missing at enable time by design. The hook looks the meshes up when needed and caches them; the seam's
  `found` list says which are there, and G7 read all six.
- The hover's hit test runs twice per hover step at most: once in the move handler when B's hover gate passes (so
  the land is asked before the sky), once per frame on a dirty pointer. A raycast against two bodies and four
  occluders is well under a millisecond.
- A tap on land is the press's hold released on the up (F2 made every tap a hold first); `pushTap` serves the seam.
- The sky's clock pinned (`__skyTime`) freezes the land's ramps too, so G7's headed run reads the stores and the
  pinned-frame rows carry the pixels; the two together are the plan's G7.

## Gate (G1–G9 of the plan)

| # | check | state |
|---|---|---|
| G1 | red first | L1–L6 failed on the missing module, then passed; the weight test failed on the missing field, then passed; L7 (the knob) and L8 (the picking) with their code |
| G2 | `test:sky`, `tsc -b`, build, eslint | 178 pass (the land-touch suite joined the command at F5), clean, built, clean at `9136dc4` |
| G3 | `?touch=0` vs `main`'s build, pinned t 0 / 3.7 moving, 0 / 2.3 / 11.2 light | 0 differing pixels in every row (`capture-sky-frames.mjs` against a `main` worktree on port 5180); the moving t 3.7 row re-run at `9136dc4`: 0 |
| G4 | the default route, no input, vs `main` at the same times | 0 differing pixels in every row: the new programs draw today's frame exactly (better than B's row 7 residue); the moving t 3.7 row re-run at `9136dc4`: 0 |
| G5 | injected touches inside the land bounds | a hold at the cypress's mid-height (t0 5): 0 px at t0, then 49,683 / 55,171 / 55,188 px at +0.06 / +0.12 / +1, every one inside the cypress's bounds (box 170 × 580 at 375, 98 against the bounds 376–547 × 83–673, dilated 40). A tap: 0 at t0, 42,252 / 50,029 / 44,663 / 43,228 / 42,545 px at +0.02 / +0.3 / +0.6 / +1 / +2, 13,536 at +5 (the window closing), 0 at +5.5 (closed exactly, on a real frame). A hold on an orchard dome: 8,210 px at +1 inside the trees' bounds (box 176 × 147 at 957, 490). The painted-light sky, a hold on the cypress: 0 at t0, 55,188 at +1, the same box. The sky outside the boxes untouched |
| G6 | by eye, 1:1 | `cypress-none-vs-hold-t6.png`: the tree leans away from the point, the tip furthest, the base still, the ribbons on the body. `tap-swing-strip.png`: the lean at the ramp's peak, the overshoot the other way at +0.5 s, settled by +2 s: a spring, not jelly. `orchard-none-vs-hold-t6.png`: the held dome's curls shift, subtle at 0.035 (Mark's eye) |
| G7 | headed Playwright, the input path | a hover onto the tree begins a hold at 0.6 and no sky surge while sliding on the trunk; leaving releases it and the sky's hover resumes; the touch is pruned within the window; a press retargets 0.6 → 1 (F5) and the release swings it with the sky's surges and kicks unchanged (masked); a drag across the tree holds and follows; a tap on the sky still surges and kicks. After the review's fixes: a same-frame tap releases at t0 + 0.12 at amplitude 1; no hold is rebuilt after the up until a real move; one move off the tree then still releases the hold and surges the sky once. Frame time with a continuous hover sweeping the tree 10.63 ms mean (p95 11.7) against 10.55 idle (p95 11.6), Playwright's Chromium unlocked from vsync |
| G8 | `check:reduced`, `check:viewport` | PASS, PASS (`gate/check-reduced.log`, `check-viewport.log`) |
| G9 | Codex code review | REVISE on `375d825` (F1–F6 P2, F7–F8 P3; `code-review-report.md`); all eight fixed in `9136dc4` (the plan's Review section); the confirmation read bounded to the eight (`brief-confirmation.md`) |

## Open

- Mark's taste gate on localhost: the push (0.14 on the tree, 0.035 on the bushes), the dip, the swing; the `bend`
  knob in `?tune=1`.
- The phone: a raycast per hover step and a four-touch loop per vertex, his `?perf=1` reading.
- A hover across the cypress's silhouette edge toggles the hold on and off with the body's outline (the ribbons
  are not raycast): acceptable by design, noted.
