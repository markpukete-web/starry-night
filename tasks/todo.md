# The Starry Night — plan of record

The open work, with one pickup at the top. The history up to 2026-11-15 is in `tasks/archive/2026-11-15-todo.md`
(audit item 28, archived the way `lessons.md` was on 2026-10-30). A line cite of `tasks/todo.md` written before
2026-11-15 points into that archive, at the same line. Its unchecked boxes sit inside superseded pickups. This file
names only what is still open.

## Pickup — 2026-11-15 (10:00): Mark hands over the audit's remainder, and H6, H5 step 2 and A11 with B8 run

Mark, about 09:30, from his phone: "Take the lead and keep tackling the rest of the items without me. Work that needs
my eye: Can make your best judgement and I will go with your recommendations. When in doubt, discuss with our
Consultant Fable in next tab." Then: "Also item 29, delete any local leftovers that are no longer needed". The
consultant is the Claude (Fable) pane `w4:p6`, in tab `w4:t2`.

**Running:**

- H6 (C-08, B6 with C-09, B7, A6): the Opus `builder` subagent, branch `fix/h6-street-faults` from `3aeec19`, brief
  `scratch/briefs-2026-11-15/h6-street-faults.md`. It has two commits (`6eb9f9d` C-08, `00f8da8` B7).
- H5 step 2, Phase A: Hydrogen (`w4:p5`), worktree `/Users/markma/Projects/starry-night-h5`, branch
  `refactor/h5-chrome-module` from `3aeec19`. Brief `scratch/briefs-2026-11-15/h5-step2-chrome-module.md`. Phase B
  (`check-failure-paths.mjs` and `check-portal.mjs`) starts on the Lead's word, after H6 merges.
- A11 and B8: the Lead, worktree `/Users/markma/Projects/starry-night-a11`, branch `fix/a11-b8-way-back-fireflies`
  from `3aeec19`, commits `7344605` and `15fcd1e`. The proof waits for a free machine.

**Done today:** item 29 and item 28 (this file).

**Mark's calls, decided on his word by the Lead's recommendation (09:30):**

- A11: a rotation in the street sends the way back to the new aspect's home. A rotation in the diorama already does
  this, and `check-viewport-camera.mjs` holds it there. The old way back kept the old orientation's pose under the new
  lens.
- B8: the fireflies keep the size they have at the cap's ratio, 1.5, at any pixel ratio. At 1.5 the pixels do not
  change.
- Item 20: no change. No visitor loads `flow-field.png`, `signed-flow.png` or the retired modes (they load only on
  their own `?mode=` link), and Phase 0 names `flow-field.png` as its output.
- Item 30, finding 6 (lossy paint): declined. Mark took lossless and rejected lossy on 2026-07-21, and on 2026-10-30 he
  said "I don't want to lower our quality".
- Item 30, finding 4 (ratio 2 in the street): not now. The phone's start-up dip (finding 3) is still open, and a ratio
  of 2 draws 78% more pixels on that phone. It comes back after finding 3.
- Item 30, finding 3: open. It needs Mark's phone.
- H5's D10 is dropped. No fixed wait in the twelve checks waits for the sky alone: the settles wait for the cypress,
  the 500 ms after a navigation guard against the old page's seams, and the 1,000 ms waits come before negative
  asserts. D6 keeps the reject and drops the timeout. No check times out `send` today, and a cap would cut the long
  awaited evaluations.

**Item 29, the leftovers:** 10,898 old capture images (13.98 GB) moved from 52 folders in `scratch/` and from
`output/playwright` and `output/review-2026-07-22` to `~/.Trash/starry-night-leftovers-2026-11-15`. Every brief,
report, log and script stayed in place, so the records' text cites still resolve. Kept whole: the audit's folder
(its frame baselines), the two brief folders, `village-redesign-2026-10-23` (CLAUDE.md cites its `layout-v1.svg`),
the reference studies (`village-study`, `simon-lee-study`, `simon-village`, `village-context`, `village-foliage`,
`ref`), `output/walk-end` and the small loose files. `scratch/` went from 11 GB to 1.2 GB, `output/` from 3.2 GB to
9.8 MB. The stash and `t4/` were already gone. The two spike branches exist only on GitHub, so they stay.

**Next, in order:**

1. Gate H6, push it with this record, open its PR, read Codex's review, merge.
2. H5 Phase B on the new `main`. Gate H5, PR, Codex, merge.
3. A11 and B8: the proof, PR, Codex, merge.
4. B5, the trail texture: measure the upload's cost on the walk first. A10, one tap-or-drag rule: a plan, read by
   the Fable pane, built by an Opus builder.
5. The perf items not routed yet: C-07 (`inFootprint`, 89 ms), A19 (the portal layer's canvas copy, up to 18.7 MB),
   A18 (a paused scene redraws each frame), A7 (the light material rebuilt on each pause), and B14, C-11 and A20 (the
   frame loop's allocations).

**For Mark when he is back:**

- The walk end's look, on #55's preview link (sent 08:50).
- Item 30's finding 3, on his phone.
- The two proposals for his sections of `CLAUDE.md`, below.
- The Trash folder above holds 14 GB. Empty it when you are content that nothing in it is needed.

## Proposed edits to CLAUDE.md (audit item 23, Mark applies them)

Two of item 23's four claims hold on 2026-11-15. The other two are already fixed: the Stack section no longer calls
`App.tsx` a scaffold, and the Tunables cut of 2026-10-30 removed "Instanced stroke budget 8,000 / 3,000".

1. **The bar's prior-art path.** It names `docs/superpowers/references/2026-06-12-techartist-time-dial-diorama.md` in
   the markma.dev repo, and no markma.dev checkout exists under `~/Projects` on this Mac. Proposed: add the repo's
   GitHub URL to the path, so the note can be found from any machine.
2. **"its own skills in `.claude/skills/`"** (Self-improvement rules). `.gitignore:27` ignores `.claude/`, and no
   `.claude/skills/` exists, so a skill there would never be tracked. Proposed: either drop the clause, or add
   `!.claude/skills/` to `.gitignore` so that skills there are tracked.

## Parked ideas (scope growth: do not build without Mark)

- A second portal, a meadow or another place to try new things, when Mark has time (archive, 2026-10-25).
- Flowers beside the path, after Vincent's own Saint-Rémy flowers, in The Starry Night's palette (Mark, 2026-10-23).
- Time-of-day presets. The pre-release gate passed in July, so they are now in scope as a later slice.
- From S3b (2026-10-25, `tasks/2026-10-25-street-s3b.md`): a per-frame cap on the grass's triangles, a smaller
  `tipMax`, and the grass's stripes. Each waits for Mark's read.
