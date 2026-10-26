# The village's craft, K1 (the houses): the record, 2026-10-26

The plan is `tasks/2026-10-25-village-craft-k1-plan.md`, revision 1, with two amendments from the look passes (A1, A2
below). Mark was out for most of the build and asked the Lead to take it end to end, then push the branch for a live
preview when the slice passes the Lead's gate: "I prefer live links, so when first slice done, push then I will review.
You and the team keep building." The evidence is in
`/Users/markma/Projects/starry-night/scratch/village-craft-2026-10-25/` (`E` below).

## The plan's reviews

Codex's correctness read and the worker's buildability read of revision 0 both said REVISE (`E/plan-review-codex.md`,
`E/plan-build-worker.md`). Revision 1 folds them in one round, with two defects the Lead's probe found: the five
right-hand fronts are drawn flipped (`orientedFace`), so a step placed from the house's `along` lands on the wrong side
of the door, and two church tests read `house-0`'s front. Codex's bounded re-read: APPROVE (`E/plan-reread-codex.md`).

## Task 0: the base reads

The base is `56c3f9c` in a second worktree on port 5204. Its build hashes to `71114298aa85575a`, 603,641 triangles with
the grass. The browser's sweep peaks at 1,444,499 on the desktop at walk `t` 0.295, 431 under the ceiling
(`E/t0/base-tri-sweep.log`). The base's captures at stops 0 to 4 (`E/t0/base/`) were taken before the sky and the
cypress had loaded. The look passes compare against a second set taken with a 4 s settle (`E/t0/base-settled/`).

## Tasks 1 to 3: the build (the worker, Gemini)

- `da01ecf`, Task 1, the paint knobs. At `KEPT_PAINT` the build hashes to the base's `71114298aa85575a` (the Lead
  checked it on a clean checkout of `da01ecf`).
- `dd38714`, Task 2. The six painting houses' doors set 0.02 into the wall, every door framed by a band and stepped,
  the grass cleared off the steps after the chunk's shuffle.
- `02ce494`, Task 3. 22 shutter leaves beside the front windows, the painting houses' eaves out to 0.03 with an
  underside. 606,345 triangles.
- The mutation proofs (`E/t3/mutation-M1.md` to `M5.md`): the church without `KEPT_PAINT`, the step's foot without
  the flip, the step test inside the generation, the leaves' ink unlifted, the door's ink at the wall's height. Each
  turned its named test red, the restore was clean, the suite went green.
- `d396926`, the Lead's gate fixes G1 to G5, built by the worker: one function for a step's frame
  (`doorStepFrame`), no dead bounds in `grassChunks`, `doorOf` typed to what it reads, `sourceUnderpaint`'s docstring,
  each front window written once. The build hash and the grass hash are unchanged (`E/gate/fix-*.txt`).

## Task 4: the look passes

Pass 0 is Task 3's state. Each pass is beside the settled base at 1:1 (`E/t4/pN/`).

- **Pass 0.** The door's band reads as a flat grey plate pasted over the brushwork: at 0.0046 it lies over the
  strokes' top, the one surface on the front no stroke touches. On the dark house at stop 2 it still makes the door read
  as a door. The shutters show on a pale wall and nearly vanish on a dark one. At stop 4 a pale bar lies on L5's thatch:
  a probe projecting every part into the frame names `house-4`'s band (`scratchpad/probe/which-part.ts`).
- **A1** (Codex: GO, `E/amend-a1-codex.md`). A cottage's band stopped at 0.99 of the wall and pierced the thatch's
  slab by about 6.5 mm. It now stops at the door's top and draws no band over the door, which the slab hides from the
  lane in any case. The least clearance after A1 is R5's, 5.6 mm.
- **Pass 1**: `base` 0.5, `cover` 0.9. 590,029 triangles. Little change at 1:1.
- **A2** (Codex: GO, `E/amend-a2-codex.md`). The band lies at 0.001, under the strokes, which cross and break its
  edges. It reads as part of the wall's paint. No other front-parallel surface lies between the wall and its strokes.
  The 1 mm gap is about 7.5 depth steps at 3 units.
- **Pass 2**: `base` 1, `cover` 0.8. 574,041 triangles. Fewer streaks at full frame, but the palette gate moved the
  walls' ΔE up 3 to 6 where houses fill the frame (stop 0 desktop 17.7 to 21.2, stop 2 desktop 10.1 to 15.9, stop 1
  phone 9.6 to 12.7). The cause, in Lab: the lightest half lifts wallA from L 18.0 to 28.7, wallB from 33.7 to 50.1 and
  plaster from 50.3 to 55.3 (`scratchpad/probe/wall-bases.ts`). The knob lightens the dark houses and barely moves the
  plaster houses, where the planks are.
- **Pass 3**: `base` 0, `cover` 0.8. The walls' ΔE is the base's within 0.8 at every stop and viewport. The dark houses
  keep their dark. 574,041 triangles, 29,600 under the base and 19,600 under the plan's soft target.

**What K1 does not fix.** Up close, the plaster houses still show long vertical strokes that read as planks. Their
strokes run vertical at 0.5 to 1.0 of the wall's height (`SOURCE_STROKES.plaster`), the painting's ratio at the
painting's scale. Neither paint knob reaches that. A shorter stroke needs a new 1:1 measurement of the scan's village
first (the plan's global constraint), so it is Mark's call, not a fifth pass.

## Task 5: the gate's runs

At `cf26434` (`E/tools/k1-gate.sh`, logs in `E/t5/`): the tree clean, tsc and lint clean, 378 of 378 tests, the build
done. Against port 5205 every case passed: the grass (18 cases), the walk, the rotation, the cypress held unanswered
(the street ready in 2,955 ms with 574,041 triangles), the portal (its stop 0 byte-identical to `?street=1`) and
reduced motion. No headless Chrome was left. The review's fixes (`02d5fba`) leave the build's hash unchanged, so these
runs hold for the branch's head.

**The browser's sweep**, Task 0's 32 points on both viewports: no point over 1,444,930. The worst is 1,414,747
(desktop, `t` 0.295), 30,183 under the ceiling. The base's worst was 1,444,499 at the same point, 431 under
(`E/t5/tri-sweep.log`).

**The palette gate** at pass 3, `full` and `ids` at `t` 5 with `light=0` (`E/t5/colour/`). The walls' ΔE, the base
against the branch:

| Stop | Desktop | Phone |
| --- | --- | --- |
| 0 | 17.68 → 17.53 | 6.22 → 5.70 |
| 1 | 11.78 → 12.36 | 9.55 → 10.10 |
| 2 | 10.12 → 10.91 | 15.70 → 15.47 |
| 3 | 7.89 → 7.89 | 21.49 → 21.48 |
| 4 | 21.41 → 21.17 | 23.44 → 23.44 |

The walls failed ΔE 10 on the base at seven of ten frames (known since S3b), and K1 moves them by 0.8 at most. One
frame crosses the line: stop 1 on the phone, 9.55 to 10.10. The roofs and the trees move by 0.55 at most, the windows by
0.22, the fog by 0.02. The "FAIL 0", "FAIL 24" and "FAIL 570" entries are frames with too few of that class's
pixels to measure, the same on both.

**The frame time** at stops 0 and 3, five rounds, the base and the branch side by side in each round, dpr 1.5, on the
M5 Pro (`E/tools/k1-perf.sh`, `E/t5/perf/summary.txt`). All 20 runs finished. Every mode on both sides holds 60 fps:
the median frame 16.7 ms, the median p95 17.0 to 17.5 ms, the worst p95 17.6 ms on both sides. The branch draws about
29,700 fewer triangles than the base at each pose (stop 0 desktop 1,406,031 against 1,435,735) and the same draw calls,
less one at stop 3. A phone is unmeasured: the phone mode is the phone's viewport on this machine's GPU.

**The build's time** (`E/tools/street-tri-split.ts`, three rounds of five builds each, alternating,
`E/t5/build-time.log`): the base's medians 651, 637 and 646 ms, the branch's 630, 633 and 645 ms. No slower than the
base, inside the plan's 10% limit.

## Task 6: the branch review

Codex read `56c3f9c..cf26434` adversarially, the Lead's two commits hardest (`E/branch-review-codex.md`). Two
findings, both fixed in `02d5fba` by the Lead:

- **F1, P2.** The levels test checked a leaf's ink only where the builder reported a non-empty range. With the ink's
  `append` removed, all 15 craft tests still passed. The test now requires each leaf's ink part with 105 vertices
  (seven edges, five samples, three columns). The same mutation now fails at `house-0 leaf 0 left`
  (`E/gate/f1-mutation.log`).
- **F2, P3.** A wall at `base` 0 still read and sorted its source's lightest texels, 88 reads of about 12 ms in all.
  It now takes the mean and skips that read. The build hash is unchanged, `35ce7aeb5bd88590`, 574,041 triangles
  (`E/gate/f2-hash-before.txt`, `f2-hash-after.txt`).

Codex found the church, the flat panel, the grass's kept blades, the steps, the soffits, A1 and A2 sound. Its
differential probe against the base matched the church's and the flat panel's buffers exactly and every kept blade.
After the fixes: tsc and lint clean, 378 of 378 tests (`E/gate/f12-*.log`). Both fixes are P2 or P3 and verified by the
Lead, so no re-read was requested.

## The Lead's gate

K1 passes the Lead's gate at `02d5fba`. The plan's Tasks 1 to 6 are done, both amendments carry Codex's GO, and both
review findings are fixed and verified. The walls' colour holds within 0.8 of the base. The walk keeps 30,183
triangles under the ceiling, and the frame time and the build's time hold the base's.

Open for Mark: the plaster houses' long vertical strokes (above, "What K1 does not fix"), and stop 1's phone frame,
whose walls' ΔE goes from 9.55 to 10.10. The review sheet is `E/gate/k1-gate-sheet.png`: the painting's village beside
stop 0, and stops 1 and 2 at 1:1 (the base, pass 2, pass 3).

## Pickup

Mark asked for a live link when the first slice passed the Lead's gate. The branch is pushed for a Vercel preview, and
no PR is open until he has looked. His pass ends K1 and starts K2's build. K2's plan (dry-stone walls, one rail, about
seven lamps) is drafted meanwhile from `E/k2/design-notes.md`.
