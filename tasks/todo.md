# The Starry Night — plan of record

The open work, with one pickup at the top. The history up to 2026-11-15 is in `tasks/archive/2026-11-15-todo.md`
(audit item 28, archived the way `lessons.md` was on 2026-10-30). A line cite of `tasks/todo.md` written before
2026-11-15 points into that archive, at the same line. Its unchecked boxes sit inside superseded pickups. This file
names only what is still open.

## Pickup — 2026-11-15 (13:45): the audit's remainder is merged. Only Mark's items are open

Mark, about 09:30, from his phone: "Take the lead and keep tackling the rest of the items without me. Work that needs
my eye: Can make your best judgement and I will go with your recommendations. When in doubt, discuss with our
Consultant Fable in next tab." Then: "Also item 29, delete any local leftovers that are no longer needed". At 09:54:
"Merge each slice to main once it passes your gate". The consultant is the Claude (Fable) pane `w4:p6`, in tab
`w4:t2`.

**Running:** nothing.

The machine queue: one browser run at a time. The Story_Bridge session (tab w5) runs Playwright checks on this machine
too (`tools/flash-check.mjs`). A wait sees them. Since #61 the checks' Chrome leak count does not: it counts only the
`starry-` profiles that `startChrome` makes. The
machine check since 10:50 (`tasks/lessons.md`): `pgrep -fl 'vite preview|starry-night[^ ]*/node_modules/.bin/vite|--headless|remote-debugging-port=[1-9]|bin/tsc|bin/eslint|node --test'`.

The 11 frames' reference since #58: `scratch/a11-gate/frames/r1.sha`. B8 changed the seven street frames at the
fireflies only. `h4-gate/r1.sha` stays the reference for a branch based before `699a674`.

**Done today:** item 29, item 28 (this file), and H6. H6 (C-08, B6 with C-09, B7, A6) merged as `db2b500` at 10:26,
PR #57. The Lead's gate is `scratch/h6-gate/gate.out`. Codex reviewed `b311911`, the head, with no findings, and CI
passed all four checks. A11, B8 and A19 merged as `699a674` at 10:57, PR #58. The Lead's gate is
`scratch/a11-gate/gate.out`: at a pixel ratio of 1.5 the frames equal the base's, at 1 only the fireflies change, and
each mutant fails on its own assert. Codex reviewed `210ad15`, the head, with no findings. H5 (the shared Chrome
module, D16) merged as `4239df6` at 12:00, PR #59. The Lead's gate is `scratch/h5-gate/gate.out`. Codex's one finding
(P2, a failed browser start left the script's own Vite server running) is fixed in `980a614`, proved red then green,
and answered in its thread. The worker's logs moved to `scratch/briefs-2026-11-15/h5b/logs/`. A10 (one rule for tap
or drag in the sky, the portal and the street) merged as `68a1c2b` at 13:35, PR #60. The record is
`tasks/2026-11-15-a10-tap-rule.md`, the Lead's gate `scratch/a10-gate/gate.out`. Codex reviewed `ae2c7be`, the head,
with no findings, and CI passed all four checks. The walk check passed all 22 cases in three runs. Each run's last line
failed on the leak count, and the third run listed the two it counted: the Story_Bridge session's Playwright Chrome.
The leak count's fix merged as `39bcae2` at 13:44, PR #61: `countHeadlessChromes` matches the `starry-` profile
folders only, and `startChrome` refuses another prefix. Its gate is `scratch/leak-gate/gate.out`: the walk check
exited 0 with the Playwright Chrome running during it. Codex reviewed `7a03564`, the head, with no findings.

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

**The rest of item 17, routed by the Lead (10:20):**

- A19, the portal layer's held frame: built on the A11 branch (`b9f86c0`). The fade sets the layer's width to 0 when it
  hides it. `check-portal.mjs`'s `enterAndSettle` asserts it on every entry.
- A7, the light material rebuilt on each pause: no change. Its `paused` is `reduced` (`DioramaExperience.tsx:628`), so
  it rebuilds only when the visitor changes the system's reduced-motion setting.
- A18, a still scene that redraws every frame: no change now. A frame loop on demand touches every animated path (the
  arrival, the flight, the alive clock). The gain is battery on the still state only.
- B14, C-11 and A20, the frame-loop allocations: no change. No profile shows a collection pause on the walk. They
  come back if a phone trace shows one.
- B5, the trail upload, and C-07, `inFootprint`'s 89 ms in the street's build: parked with item 30's finding 3. A
  desktop's frame time does not show a phone's upload cost, so each needs Mark's phone with `?perf=1` first.

**Item 29, the leftovers:** 10,898 old capture images (13.98 GB) moved from 52 folders in `scratch/` and from
`output/playwright` and `output/review-2026-07-22` to `~/.Trash/starry-night-leftovers-2026-11-15`. Every brief,
report, log and script stayed in place, so the records' text cites still resolve. Kept whole: the audit's folder
(its frame baselines), the two brief folders, `village-redesign-2026-10-23` (CLAUDE.md cites its `layout-v1.svg`),
the reference studies (`village-study`, `simon-lee-study`, `simon-village`, `village-context`, `village-foliage`,
`ref`), `output/walk-end` and the small loose files. `scratch/` went from 11 GB to 1.2 GB, `output/` from 3.2 GB to
9.8 MB. The stash and `t4/` were already gone. The two spike branches exist only on GitHub, so they stay.

**Next:** nothing that does not need Mark.

**For Mark when he is back:**

- The walk end's look, on #55's preview link (sent 08:50).
- Item 30's finding 3, on his phone, with a `?perf=1` trace on the walk for B5 and C-07.
- A10: ten taps on the sky on his phone, on PR #60's preview link, and whether each kicks. A finger that wobbles more than
  8 px and back was a tap and is now a drag.
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
