# The Starry Night — plan of record

## Pickup — 2026-10-29 (19:40): slice 1 gated and reviewed, PR #38 open for Mark's preview pass

**Done by 19:40:** the gate on `1e3da3d` (the green step, the six browser checks, the sweep 1,433,053 against
1,444,930, the colour gate, the ID frames, perf p95 at most 18.6 ms, 321 draw calls; `C/t6/`). Codex's branch review,
three rounds: r0 REVISE (the heads lifted behind their blades, fixed `e29bc36`), r1 REVISE (the depth guard read the
dab's argument, fixed `f1a3cf8`), r2 BUILD. The record `tasks/2026-10-29-church-square.md`, the Tunables entry, seven
lessons (`489b9dd`). Pushed; **PR #38** open (`https://github.com/markpukete-web/starry-night/pull/38`), the Codex
bot's review requested at 19:38. The Vercel preview is ready:
`https://starry-night-git-feat-church-square-markpukete-webs-projects.vercel.app`. Mark sent the crops and a push
notification. The look server on 5199 stopped.

**For Mark at the preview:** P7 (the church without a foot shadow; one line in `streetLight.ts`, reversible) and
probe B (the painting's own sides, `litWalls` in `church()`). The crops: `C/for-mark/`.

**Then:** read the Codex bot's review on #38 (the timeline API first), answer every thread, fix in one batch (at
most two re-requests). Mark's pass, his merge. Slice 2 (the barn owl on the ridge, the moths at the lit windows)
after his word: the design's slice 2 section, a plan to Codex's read first.

## Pickup — 2026-10-29 (18:55): Tasks 1, 3 and 4 merged and gated, the look passes done, Task 6's gate and Codex's branch review running

**Done by 18:55:** Task 4 (Argon, `1056cd9`) merged `1e3da3d` (18:46) after the Lead's gate (the diff read, the suite
run, 482 pass, tsc and lint clean; the flag-off pin re-pinned to `46f2bc6ba04296ab`). Look passes 1 to 4
(`C/t5/looks.md`, `b322690`): the design's levers reached 42.3 of 49.7, and pass 4 exempts the church's two tones from
`wallShade`'s ground term (departure P7, revision 4 `de5d5f0`), reading 48.1 / 24.2 against 49.7 / 26.8. Probes B (the
painting's own sides) and C (P7) captured for Mark. The ring of flowers read at `t` 0.84 (`C/t5/p5`): a quiet tuft with
pale heads in the lamp's pool, no retune. The record drafted (`tasks/2026-10-29-church-square.md`, the gate and the
review to fill). Five lessons appended.

**Running at 18:55:** the gate `C/t6/gate.sh 1e3da3d` (tsc, lint, the suite, the hashes, the six browser checks on
port 5213, the sweep with 0.26 and 0.9, the build; `C/t6/summary.txt`), then `C/t6/colour.sh` (5214) and
`C/t6/perf.sh` (5215), chained one after another. Codex `w4:p4` on the branch review (`C/briefs/codex-branch-r0.md`,
report `C/review/codex-branch-r0.md`), sent 18:52.

**Then:** the ID-frame look at stops 3 and 4 (Step 4), the gate's numbers into the record and the Tunables entry,
Codex's findings fixed in one batch, push `feat/church-square`, the PR with P7 and probe B at the top for Mark's
decision, a push notification to Mark. Slice 2 (the owl, the moths) after his word.

## Pickup — 2026-10-29 (18:35): revision 3, Tasks 1 and 3 merged, Argon on Task 4, Mark at dinner ("Take the lead")

**Revision 3 (`086b6d9`)** folds Codex's confirmation read of revision 2 (`review/codex-plan-r2.md`: five of six
closed, F2 open because `wallSource: 'churchLit'` reached the door's strokes). The church keeps `wallSource` plaster,
the tones in a separate field, the guard on the openings' strokes (`cls` 255 in the nave's box: 2,287 vertices, hash
`51a2c84e0b745f72` at the base).

**Task 2's ledger is written** (`t2/ledger.md`): the recipes at full cover put the street at 631,507 triangles (the
church 1,393 ribbons, about 50 triangles each). The Lead's decision: the four covers halved (1.75 / 1.75 / 3 / 1.75),
street 600,275, church 781 ribbons. The synthetic fixture's bound in `street-build.test.ts` becomes 644,605 (its base
639,524 plus the design's allowance 5,081), said in the test and the ledger. Look pass 1 judges the thinner paint.

**Done by 18:35:** Task 1 (`8934878`, merged `60de3ab`) and Task 3 (`d730252`, merged `89e6908`), both gated by the
Lead (the diffs read, the suite run again, 480 pass). Look pass 1 measured (`t5/looks.md`: the moonlit wall L 37.1
against 49.7; the underpaint's shade is the cause, outside the design's levers). **Running:** the Task 1 Sonnet builder's fix round was (`briefs/builder-t1-r1.md`: the cover, the fixture,
the guard, the squash into the Step 8 commit; its WIP `61b5b43` on `feat/church-square-t1`). Argon (`w4:p5`) on Task 4
from revision 2 (`briefs/builder-t4-r1.md`, report `t4/report-2.md`). A Sonnet builder on Task 3 from revision 3
(`briefs/builder-t3-r0.md`, branch `feat/church-square-t3`, report `t3/report.md`). Codex is idle; its next job is
the branch review (Task 6 Step 7). Mark, before 18:30: "Take the lead I am having dinner". (The pickup first said 19:05: the clock was not read.)

**Then:** gate each branch (the diff, the raw logs, the suite run by the Lead), merge Task 1, Task 4, Task 3 into
`feat/church-square`, re-pin once, look pass 1 (capture stops 3 and 4, both viewports, `C/look0/capture.mjs`), the
look passes, Task 6's gate, Codex's branch review, push and the PR for Mark's preview pass.

## Pickup — 2026-10-29 (18:15): slice 1's plan at revision 2, Task 0 done, Argon on Task 4, Task 1 to a Sonnet builder

The times in the two pickups below this one were written wrong (the Lead carried them forward instead of reading the
clock): the git log holds the truth. The design's calls were committed 17:16, revision 0 at 17:30, revision 1 at 17:56.

**Revision 2** folds Codex's correctness read of revision 0 (`review/codex-plan-r0.md`, REVISE, ten findings, landed
17:58). Revision 1 (`c9b7f05`) had closed five (F1, F4, F6, F7, F8). Revision 2 closes F2 (the openings keep the plaster
face), F3 (a distance test against the sway's bound), F5 (the flowers' test asserts the geometry), F9 (the tones by
name, no light rule), F10 (1,100 triangles reserved for the flowers) and Codex's answers 6 and 7. Task 0 is done
(`scratch/church-animals-2026-10-29/t0/`).

**Running at 18:15:** Argon (`w4:p5`, Gemini 4 Argon, Mark's switch before 17:50) builds Task 4 on
`feat/church-square-t4` from revision 1 (brief `briefs/builder-t4-r0.md`, report `t4/report.md`, a Monitor armed).
Its fix round (`briefs/builder-t4-r1.md`: F5, answers 6 and 7, the palette check) goes out when its report lands.
Task 1 goes to a Sonnet `builder` subagent from revision 2 (brief `briefs/builder-t1-r0.md`). Codex gets a bounded
confirmation read of revision 2 (`briefs/codex-plan-r2.md`). Mark's call of about 17:50: "Start Task 4 on Argon now".
Then: Task 2's ledger, Task 3, the look passes, the gate.

## Pickup — 2026-10-29 (17:32, written as 18:35): the design approved, the slice 1 plan written, its two reads running

**Mark approved the design at 17:20** ("Go ahead with your recommendations and I like the tunable owl idea"): the two
tones mirrored, the ring of flowers in the lamp's pool only, the barn owl at 0.024 with `OWL.size` tunable. The calls
are recorded in the design (`967af52`).

**The slice 1 plan, revision 0:** `tasks/2026-10-29-church-square-plan.md` (`78e8634`, this branch, local). Seven
tasks: 0 the facts (the Lead picks the four source rectangles and measures the strokes at 1:1, a builder writes the
sources probe and the tree search), 1 the sources, classes and tones (builder), 2 the ledger (Lead), 3 the trees
(builder), 4 the flowers (builder, into the street's strokes bucket, no new mesh), 5 the look passes (Lead, four at
most), 6 the gate. Five departures from the design's text are in its table P1 to P5, open to the reads and to Mark.

**Running at 18:35:** Codex's correctness read of the plan on `w4:p4` (brief
`scratch/church-animals-2026-10-29/briefs/codex-plan-r0.md`, report `review/codex-plan-r0.md`, a Monitor armed) and a
Sonnet buildability read (report `review/builder-plan-r0.md`). Next: fold both into revision 1, then Task 0.

## Pickup — 2026-10-29 (17:05): #37 merged; the church and its square designed (revision 1), Mark's approval next

**On `main` (`e96c7c0`):** Vincent's wander, PR #37, merged on Mark's word ("Merge #37"), production deploys from
it. The Codex bot passed `487e053` with no findings. Fable's round 0 (REVISE: F1 P2, a tap where he stood at stop 4
did not bring him home, and two P3s) was fixed in `f864770` and answered in the thread. The record is
`tasks/2026-10-29-vincent-wander.md`.

**Cleaned on Mark's word:** thirteen worktrees and fourteen merged local branches removed, and the merged branches
deleted on GitHub. GitHub holds `main`, `spike/vincent-form` and `spike/vincent-wander` (the Tunables cite the wander
spike's `74d8856`). Local: `main`, `feat/church-square`, `docs/pickup-2026-10-28-night` and the two spikes. The two
worktrees' uncommitted leftovers are in `scratch/worktree-leftovers-2026-10-29/`.

**Next (Mark: "Animals besides the frogs", then "the church is a bit dull", "we can just build it if it's well
planned"):** the design `docs/superpowers/specs/2026-10-29-church-square-design.md`, revision 1, on this branch
(`feat/church-square` off `555b6c0`, local, not pushed). The builder check (`scratch/church-animals-2026-10-29/review/
builder-check-r0.md`, seven questions) and Codex's read (`codex-design-r0.md`, REVISE: three P2, two P3, all facts
audited) are folded. Three calls are Mark's, under "Open for Mark": the church's two tones, the flowers (the ring in
the lamp's pool is the recommendation), and the owl's species and size. Then: Mark approves the design, the slice 1
plan (the church's paint, the spire, the trees, the flowers) with its two reads, the build, then slice 2 (the owl and
the moths). Stop 4's captures as it stands are in `scratch/church-animals-2026-10-29/look0/`.

**Panes at 16:54:** Codex `w4:p4` idle, 70% of its 5-hour window left. Fable `w4:p6` done. Gemini `w4:p5` idle, its
week 70% used. Nothing is running. No PR is open.

## Pickup — 2026-10-29 (14:45): Vincent's wander, passed by Mark; the PR is open, Fable reviews (superseded by the pickup above)

Branch `feat/vincent-wander`, PR #37 (https://github.com/markpukete-web/starry-night/pull/37). The record is `tasks/2026-10-29-vincent-wander.md`. The slice fixes the spike's four faults and adds the walk
home after the dwell (Mark, 11:45). Task 4's runs (Gemini) and the Lead's gate on `a21767e` are green. Codex's branch
review took three rounds: r0 REVISE (F1 to F5), r1 REVISE (the folded drag, the phone's sight fixture), r2 BUILD. F3
was declined with evidence and decision (l) reworded. Codex's plan is drained (Mark, after round 2): Fable, in pane `w4:p6`,
reviews from here, the PR's review included.

**Passed by Mark on the preview, 14:44.** The PR is open, and Fable reviews it (Mark: "Passed, open the PR and get
Fable to review"). Fable's round 0 on `487e053`: REVISE, one P2 (F1, the tap where he stood at stop 4) and two P3s,
all fixed in one push and answered in the thread (the record's "Fable's PR review"). Next: Mark merges.

**Next after #37 (Mark, 2026-10-29: "Animals besides the frogs"):** a little owl on a roof ridge that turns its head to
follow Vincent, and moths at some of the lamps and lit windows. A throwaway spike behind a flag first, for Mark's eye.
The description is in the chat, waiting for his corrections.

**Left in place, ask Mark before removing:** the worktrees `scratchpad/wander-wt`, `wander-2b`, `wander-r1`,
`wander-r1-mut`, the builders' `.claude/worktrees/agent-a7f026db3af066847` and `agent-a7062abd1b12521f5`, and the
branches `wander-t1`, `wander-t2`,
`wander-t2b`, `wander-r1`.

## Pickup — 2026-10-29 (11:10): Vincent's wander, the plan passed review, Task 1 building (superseded by the pickup above)

Mark, 09:58: "Wander as a slice". The plan is `tasks/2026-10-29-vincent-wander-plan.md` on `feat/vincent-wander`
(off `8c3f9a5`). It fixes the spike's four faults: the lantern hidden in the grass, the sparse verge, the square, and
the spot half behind a gable. Revision 3 (`d55c7c6`) passed Codex's review (BUILD) after three rounds: r0 eight P2s
and the builder's read, r1 two new P2s in the return (N1, N2), r2 one phone test fixture. The reviews are in
`scratch/vincent-wander-2026-10-29/review/`. A Sonnet builder builds Task 1 from `d55c7c6` (Mark: "Start Task 1
now"). The worker (Gemini) ran the gate's runs on `main` as the baseline (`scratch/vincent-wander-2026-10-29/base/`):
all pass but lint, and the hashes and the triangle sweep match V1's.

**Found by the baseline:** `npm run -s lint` fails in the main checkout with 1,848 parsing errors. `eslint .` walks
into `scratch/`, whose repo copies carry their own `eslint.config.js`. Worktrees have no `scratch/`, so CI and past gates were
clean. The fix ignores `scratch` in `eslint.config.js` (Task 0).

**Mark's call, made (11:45):** "Yes, walk him back after the dwell". On the automatic walk, Vincent goes home after
V1's 4 s dwell. It is the plan's decision (p), built by the Lead in Task 2b after Task 2.

## Pickup — 2026-10-28 (23:45): end of the night; nothing open

Mark called it for the night. On `main` (`1c77ab6`): K3, the portal on for every visitor, V1 (#34), the phone's memory
(#35) and the case 2 (phone) check fix (#36). Codex passed #36 on `df72a18` with no findings, CI green, merged on
Mark's word. `fix/portal-case2-race` is deleted on GitHub and locally. No PR is open. Nothing is running.

This note is committed on the local branch `docs/pickup-2026-10-28-night`, not pushed (docs only). Branch the next
slice from it, so the note goes up with the next code push.

**Next, each Mark's call:** Vincent's wander (`spike/vincent-wander`, `74d8856`), whether it becomes a slice. Then
Mark's noted ideas. Then a performance review across the piece, with `scratch/phone-memory-2026-10-28/tools/` as its
first tools. Seven older worktrees remain under `/private/tmp/claude-502/`. Ask Mark before removing them.

## Pickup — 2026-10-28 (23:15): the case 2 (phone) race fixed in the check (done: #36 merged)

Mark: "fix the case 2 race first". The defect was in `check-portal.mjs`, not the walk. The walk is held in `entering`
only (`tasks/2026-10-25-street-portal-plan.md:133`), and it steps on the first frame the canvas sees `street`. R3F
requests its next frame first, so the check's recorder always runs after R3F's loop. When the canvas commits `street`
in the same gap as the page (inferred, not observed), the recorder's first `street` frame reads one step: `t` 0.00012
to 0.00054 is 0.08 × dt / 2.396. The layer still covers that step: the hold is `entering`'s by design, and the walk
starts under the layer's 1.0 s fade. Case 2 (phone) now requires every `entering` frame that reads the walk to read 0, and at least one
such frame. Evidence in `scratch/case2-race/` (git-ignored): 4 of 4 full runs pass on `vite build`, each reading the
walk in 3 `entering` frames (`main` failed 4 of 4). With the hold removed (`Street.tsx` `reduced={reduced}`), case 2
(phone) fails: "the walk moved under the layer while entering (t 0.0049)". Restored, the tree holds only the check's
change. Next: the PR, draft then ready for Codex. Mark merges.

## Pickup — 2026-10-28 (late): Mark's iPhone holds the village; the PR opens (done: #35 merged)

Mark, on the preview of `cd3f85e`: "it holds". The PR goes against `main` as a draft, then ready so Codex reviews it.
Read Codex's review through the timeline API and answer every thread. Codex's 5-hour window was at 39% tonight, so a
second review goes to Fable (`w4:p6`) unless a P0 or P1 needs Codex.

## Pickup — 2026-10-28 (22:35): the street on phones, stages 1 and 2 built, gating for Mark's iPhone (superseded by the pickup above)

V1 (#34) merged at about 21:55 (`c1c6fbc`), after Codex's P2 fix `63631c5`. Mark: "go with the phone memory slice".
The plan and the production numbers are `tasks/2026-10-28-phone-memory-plan.md`, on `feat/phone-memory`. Stage 1
(`ef2e5ec`, `989840c`) releases R3F's initial `internal`, which kept the unmounted diorama alive in the street
(56 MB). Stage 2 (`57e3503`) keeps only what the street reads after its build, one painting decode, and no unused
attributes (about 70 MB). Next: the gate, the preview for Mark's iPhone, then the PR. Stage 3 only if the phone
still fails.

**Found while gating, not this slice's: `check-portal.mjs` case 2 (phone) fails on `main`** (4 of 4 runs at
`c1c6fbc`, 2 of 4 on this branch). Vincent's walk reads `t` 0.00012 to 0.00054 on the first frame the check records
as the street, where it requires 0. `Street.tsx` passes `reduced={reduced || hold}` to the walk, so once `place` flips
to `street` the walk's `useFrame` can step in the same browser frame, before the check's own `requestAnimationFrame`
records it. Under a millimetre of travel, not visible. It appeared with V1's walk on top of the portal, each
branch's checks having run without the other. A small fix: the check reads the walk one frame after the flip, or the
walk holds for the first street frame. Its own commit, after this slice.

**Roadmap after this slice** (Mark, 2026-10-28 evening: "I think we will need to do a performace review at some point when all of
my ideas implemented"): Vincent's wander (the spike `spike/vincent-wander` `74d8856`, Mark's call whether it becomes a
slice), then Mark's noted ideas, then a performance review across the piece. This slice's probe and snapshot readers
(`scratch/phone-memory-2026-10-28/tools/`) are that review's first tools.

## Pickup — 2026-10-28 (21:05): K3 (#32) and the portal (#33) are on `main`; V1's PR #34 waits for Codex

Mark had the Lead merge #32 at 20:57 (`8800b56`) and #33 at 21:04 (`3d34f3b`). #34 now targets `main`, and this
branch has `main` merged in, with only `tasks/lessons.md` and `tasks/todo.md` in conflict, both sides kept. **Next:**
read Codex's review of #34 through the timeline API and answer every thread, then Mark merges. After that, delete
`preview/all-2026-10-28`. Proposed, not started: the street on phones (the portal's pickup below).

## Pickup — 2026-10-28 (20:40): Mark passed V1; its PR opens stacked on K3's

Mark passed V1 on the combined preview (`253d8f7`): "Love it! Gate passed!" The PR opens as a draft with the base
`feat/village-lived-in`, so its diff is V1's alone, then ready so Codex fires. When #32 merges, retarget the PR to
`main`. Read Codex's review through the timeline API and answer every thread.

## Pickup — 2026-10-28 (18:48): the hat's colour is done and pushed for Mark's preview

`5b000f9` paints the hat from the crescent's lower-right edge `[1490, 280, 1514, 304]`, the painting's darkest and
warmest gold. The colour gate passes it at every stop (ΔE 5.4 to 6.5 from that patch). In the lit frames its median L
falls 3 to 5. The record is the last section of `tasks/2026-10-28-vincent-form.md`, the look pass
`scratch/vincent-hat-2026-10-28/look/p3`. The preview (behind Vercel's login, `da4a86c`):
`https://starry-night-bucvl0enl-markpukete-webs-projects.vercel.app/?street=1`

**Next:** Mark looks at the preview. If he passes V1, open its PR as a draft, then mark it ready so Codex fires, and
answer every thread. K3's PR #32 merges first; V1 rebases on `main` after it. The portal's iPhone crash waits on Mark's
choice of fix (the 18:28 pickup on `feat/portal-on`).

## Pickup — 2026-10-28 (18:28): the hat after Van Gogh's own, pushed; its colour is next (superseded by the 18:48 pickup above)

Mark at 18:00: "Where did we get this hat from actually? it looks like a fishing man. But if that's something that
Vincent Van Gogh drew then let's use his painting." `7850cc7` reshapes it from "The Painter on the Road to Tarascon"
(1888) and the Met's "Self-Portrait with a Straw Hat" (1887): a rounded crown, a flat brim turned up on one side. The
record is the last section of `tasks/2026-10-28-vincent-form.md`, the references and look passes
`scratch/vincent-hat-2026-10-28/` (`ref/`, `look/p1`, `look/p2`). Pushed for a preview:
`https://starry-night-4ei6xjp4p-markpukete-webs-projects.vercel.app/?street=1`. Mark, on his phone: "Saw it on my phone,
and it's auto moved, love it."

**Next: the hat's colour.** Mark: "Go for your recommendations for the hat's colour." The recommendation was a darker
golden straw from The Starry Night, like Tarascon's ochre, so the hat is no longer the brightest thing on him. The hat
paints from `FORM.tarascon.hat` (`vincent.ts`, the moon's body `[1376, 216, 1408, 248]`). K3's hat painted from
`STREET_SOURCES.thatch` and was gated against `villageWarm`. Compare both against the Tarascon hat's mean
(`scratch/vincent-hat-2026-10-28/ref/tarascon.jpg`, the hat about x 1150–1650, y 820–1200) before choosing. Then move the
colour gate's `refHat` (`scripts/check-street-colour.ts:255`, V1 Decision (e)) to the new source, run tsc, lint and
`test:sky`, take a look pass with `scratch/vincent-hat-2026-10-28/tools/look.sh` (it compares port 5214 with 5209:
restart both servers first), and push for Mark's preview. Then V1's PR path in the 14:40 pickup below.

## Pickup — 2026-10-28 (14:40): V1 passes the Lead's gate and is pushed for Mark's preview

**V1, Vincent's form** (`feat/vincent-form` at `b6c6404` plus the docs, off K3's `ed464c9`, pushed for a Vercel
preview, no PR): the record is `tasks/2026-10-28-vincent-form.md`. Builders on Sonnet 5.5 built Tasks 1 to 3, the Lead
Task 4. Codex's branch review found B1 and B2 (both P2), and the Lead fixed both (`b6c6404`). Every gate
run passes on the final head. Mark's three calls are at the end of the record: the hat fails the colour gate against
the moon swatch (ΔE 16.2 to 17.2), the form's refinements, and the motion.

**The preview** (behind Vercel's login, `0e7205f`): `https://starry-night-aqkftn0ko-markpukete-webs-projects.vercel.app/?street=1`

**Next:** Mark looks at the preview. If he passes it, the Lead opens the PR as a draft, then marks it ready, so Codex's
review fires. K3's PR #32 merges first, and V1 rebases on it if main moves. Then the roadmap in the 12:07 pickup below.

## Pickup — 2026-10-28 (12:07): Vincent's form V1 planned and under review; the roadmap after it (superseded by the 14:40 pickup above)

**V1, Vincent's form** (`feat/vincent-form` off K3's `ed464c9`): Mark's calls are made. Tarascon is the form, the turn
90/45, a 4 s dwell, no cane, and the right arm swings. The plan is `tasks/2026-10-28-vincent-form-plan.md`, revision 0
(`3595bb1`). Codex (correctness) and the worker (buildability) read it from 11:44. Next: revision 1, then the build.

**The roadmap after V1** (Mark, 12:07: "I think we can promote the portal to main then the Vincent wander"):
1. **The portal on for every visitor.** Today it opens only with `?portal=1`. It becomes the default, with `?portal=0`
   to turn it off, as the flags A, B and C did on 2026-10-20. Its own small slice after V1.
2. **Vincent's wander, the camera kept on the path.** Mark is not sure it reads better, or how the control works
   once Vincent can leave the path. The Lead's proposal: a throwaway spike behind a flag before any slice, as for his
   form. Tap or click a spot on the verge, and he walks there. The camera stays on the path and turns to keep him in
   frame. Mark decides from the spike whether it becomes a slice.

## Pickup — 2026-10-28 (20:40): Mark passed the portal on for every visitor; its PR opens

Mark passed it on the combined preview (`253d8f7`): "Love it! Gate passed!" The PR opens against `main` as a draft,
then ready so Codex fires. Read Codex's review through the timeline API and answer every thread. K3 (#32) and V1 also
touch this file and `CLAUDE.md`'s Tunables: whichever merges later resolves those two.

## Pickup — 2026-10-28 (20:02): phones enter the village, told first that a computer is recommended

Mark wants phones to enter, told first. `1169994` shows a card before a phone's first entry, "A computer is recommended
for the village scene. On a phone it may load slowly or not open.", with "Enter anyway" and "Stay with the painting". It
replaces `8531440`'s note, which kept phones out. The record is the last section of `tasks/2026-10-28-portal-iphone.md`.

The preview (behind Vercel's login, `5689ef0`): `https://starry-night-6y334p0c0-markpukete-webs-projects.vercel.app`

**Next:** Mark looks at the card on his phone and at the portal on a computer, on the preview. Then the portal-on
slice's PR path after K3 (#32) merges.

**Proposed slice, not started: the street on phones.** Mark asked for phones to read the village. Measure the street's
memory, then cut it, starting with the painting decoded about eight times at 1600 × 1267 (8 MB each). Mark tests each
cut on his iPhone through "Enter anyway".

## Pickup — 2026-10-28 (19:40): the village on computers, phones keep the painting (superseded by the pickup above)

The street alone ended the page on Mark's iPhone with every other tab closed, so the portal fix cannot make the phone
hold it. Mark chose "Village on computers": `8531440` keeps phones and tablets on the painting with a note, and
`?phoneVillage=1` opens the village there. The record is the last two sections of `tasks/2026-10-28-portal-iphone.md`.

The preview (behind Vercel's login, `7d744d3`): `https://starry-night-jc3dbyb0h-markpukete-webs-projects.vercel.app`

**Next:** Mark looks at the note on his phone and at the portal on a computer, on the preview. Then the portal-on
slice's PR path after K3 (#32) merges.

**Proposed slice, not started: the street on phones.** Mark asked for phones to read the village too. Measure the
street's memory on the phone build, then cut it, starting with the painting decoded about eight times at 1600 × 1267
(8 MB each, the probe's 2D canvases). Mark tests each cut with `?phoneVillage=1` on his iPhone. The note comes off
phones once it holds.

## Pickup — 2026-10-28 (19:10): the iPhone fix is built and pushed for Mark's phone (superseded by the 19:40 pickup above)

The diorama now unmounts while the street is mounted (`35bf02e`, the record `tasks/2026-10-28-portal-iphone.md`). In
headless Chrome as the phone it frees 35 MB of WebGL buffers and 125 MB of live heap after the entry. The way back
holds the layer until the diorama has rebuilt. Every portal check passes, and three mutations go red.
The preview (behind Vercel's login, `f68ff3f`): `https://starry-night-7z89d2kjh-markpukete-webs-projects.vercel.app`

**Next:** Mark enters the street through the portal on his iPhone, on the preview. If it holds, the portal-on slice
goes to its PR path after K3 (#32) merges. If it still crashes, build option (b): enter by a page load to `?street=1`.

## Pickup — 2026-10-28 (18:28): the portal crashes Mark's iPhone; do not ship it until that is fixed (superseded by the 19:10 pickup above)

Mark, 16:47, on the preview `starry-night-ewdxv13gq`: "I couldn't get into the street", then a screenshot from his
iPhone's in-app browser: "A problem repeatedly occurred on https://starry-night-ewdxv13gq-…". iOS killed the page's
process, almost always for memory, and it crashed again on the reload. At 18:2x the street alone (`?street=1` on V1's
preview) loaded on the same phone. So the painting and the street held together are too much for the iPhone. Through
the portal the diorama stays mounted while the street shows (`src/scene/DioramaExperience.tsx`, the comment above
`<Diorama`).

The deployed files match the local build of `cb4fed1` (`index-9aIiyKsT.js`, `Street-BouKM_C9.js`). Headless Chrome as a
touch phone enters the street by the pill and by a house tap, with no errors. The measurements are in
`scratch/vincent-wander-2026-10-28/repro/`, by `tools/phone-enter.mjs`. Chrome's renderer process peaks at 858 MB loading
the painting, 708 MB entering through the portal and 951 MB opening the street directly. GPU memory goes from 306 to
357 MB, the JS heap peaks at 133 MB and 2D canvases total 71 MB (48 MB direct). Chrome does not model the iPhone's
limit. Only Mark's phone can confirm a fix.

Also seen: when the street fails once, `portalFailed` turns the portal off for the visit and the pill disappears with
no message.

**Next: choose the fix with Mark, then build it.** (a) Unmount the diorama while in the street and rebuild it on the
way back, the layer held until it is ready. R3F does not dispose a geometry passed as a prop, so check that each
diorama part frees its geometries and textures on unmount. (b) Enter by a page load to `?street=1`, which is proven on
his phone, at the cost of the seamless flight into the street. The Lead had not recommended one yet. Mark's earlier
call stands: five pills cover the village at 667 × 375.

## Pickup — 2026-10-28 (15:35): the portal on for every visitor, built on `feat/portal-on` off `main`

**The slice** (the plan and its revision 1 `tasks/2026-10-28-portal-on-plan.md`, the evidence
`scratch/portal-on-2026-10-28/`): `?portal=0` turns the portal off. The placard and the dock share one bottom stack,
so the fifth pill no longer breaks the phone's chrome. Codex read the plan (three P2 findings, answered in revision 1).
K3 (PR #32) and V1 (`feat/vincent-form`) are ahead of `main` and touch other files, apart from this file and the
Tunables in `CLAUDE.md`. Rebase after they merge.

**The preview** (behind Vercel's login, `565d6c0`): `https://starry-night-ewdxv13gq-markpukete-webs-projects.vercel.app`. The Lead's gate passed at 15:35.

**Mark's calls, and two notes kept out of the slice:**
- At 667 × 375 (an iPhone SE in landscape) five pills wrap to two rows across the village. Options: leave it, stack
  the dock down the right edge on short landscapes, or show icons only there.
- The tuner (`?tune=1`, Mark's dev tool) keeps its fixed `bottom: 132px` on a phone, and the dock's third row can now
  reach it.

## Pickup — 2026-10-28 (11:10): Mark passed K3, and its PR is open for Codex's review (superseded by the 12:07 pickup above)

**Mark passed K3 on the preview** at 11:07 ("Morning Claude, gate passed"), as built, the build's +64 ms with it (the
record `tasks/2026-10-27-village-lived-in.md`, its last section). The Lead opens the PR as a draft, then marks it ready, so
Codex's review fires. **Next:** read Codex's review through the timeline API, answer every thread, then Mark merges.

**Vincent's form spike** (`spike/vincent-form`, its preview in the 02:30 pickup below): Mark's four calls are still
open (`tasks/2026-10-28-vincent-form-spike.md` on that branch).

## Pickup — 2026-10-28 (02:30): K3 gated and pushed for Mark's preview; Vincent's form spike pushed beside it (superseded by the 11:10 pickup above)

**K3 passes the Lead's gate with one criterion open** (the record `tasks/2026-10-27-village-lived-in.md`, branch
`feat/village-lived-in` at the head after `1b7402e`, pushed for a Vercel preview, no PR). The worker built Tasks 2 to
4. Codex's branch review found F1 (P1, tsc and lint failed), F2 (P2) and F3 (P3). The Lead fixed all three (`e14ed17`),
and the look pass's one defect, R1's path ending in a bare slab (`1b7402e`). Codex's confirmation read: APPROVE. Every
gate run passes, and the fifteen mutations are red on the final head. The build's time is +10.9% against the plan's
10% bound, 62 ms of it in the paths' 14 faces: Mark's call. His four calls are at the end of the record.

**Vincent's form, a throwaway spike** (`spike/vincent-form`, rebased on K3, pushed for its own preview, never merged):
`?street=1&vform=lantern` or `&vform=tarascon`. The design draft and Mark's four calls are in
`tasks/2026-10-28-vincent-form-spike.md` on that branch.

**The previews (behind Vercel's login):** K3 `https://starry-night-96swuihn2-markpukete-webs-projects.vercel.app/?street=1`
(`61b7c2e`), the spike `https://starry-night-e1rdn3w9w-markpukete-webs-projects.vercel.app/?street=1&vform=lantern`
(`5eb98c2`, rebased on `1b7402e`; tsc, lint, the build and 426 tests pass on it).

**Next, after Mark's look:** K3's PR as a draft, then ready, so Codex's review fires; Vincent's form as a slice if he
wants it, planned from the spike's answers.

## Pickup — 2026-10-27 (23:40): K3's plan at revision 2, Task 1 built, Tasks 2 to 4 with the worker (superseded by the 02:30 pickup above)

**K3's plan is at revision 2** (`tasks/2026-10-27-village-lived-in-plan.md` on `feat/village-lived-in`, the worktree
`lived-wt` in session `49dba370`'s scratchpad, its dev server on 5206). Codex's confirmation read closed eleven of its
twelve findings and kept F6, the hand on the pot plant (`k3/plan-confirm-codex.md`). Revision 2 makes the plant's hit a
vertical cylinder of its blades' rest reach (`k3/probe/lead-k3-plant-cylinder.mjs`: 816 leaf rays hit, 1,632 side
points miss). Codex's usage ran low, so Mark routed the rest to Fable in the Consultant tab (`w4:p6`): BUILD, no
finding at P2 or higher (`k3/plan-confirm-fable.md`). Fable is a Claude model, so that read is not independent of the
Lead's provider.

**Task 1 is built** (`5f3753c`): W2 ends at `t` 0.41. K2's flush test then failed, because the last stone of a course
was sized from the lane's speed at its start (the Lead's K2 pass 5 formula). The Lead's fix sizes it from the rest of
the run, measured. `test:sky` 401 of 401, `B1` `5f3ea9c0e97f6e46`, `G1` `aa265c36150f8105`.

**Running at 23:40:** the worker builds Tasks 2 to 4 and the fifteen mutation proofs (`k3/brief-k3-build.md` →
`k3/t4/report-worker.md`), its waiter armed. **Next:** the Lead's look passes (Task 5, Fable's P3 on W2's outer top row
among the crops) and gate (Task 6), the push for Mark's preview, the PR as a draft then ready (Codex reviews it).

## Pickup — 2026-10-27 (22:45): K3's plan at revision 1, Task 1 building, Codex confirming the fixes (superseded by the 23:40 pickup above)

**K3's plan is at revision 1** (`tasks/2026-10-27-village-lived-in-plan.md`, `855ede5` on `feat/village-lived-in`, the
worktree `lived-wt` in session `49dba370`'s scratchpad, its dev server on 5206). Both reads of revision 0 are folded in:
the worker's W01 to W11 and Codex's F1 to F12 (REVISE). The largest change answers F3 and F12: each door path's legs
are clipped to the step's front, a mitre at the bend and the lane's edge, so no paint runs onto the lane and none is
doubled (the Lead's probe `k3/probe/lead-k3-clip.mjs`, all pass). The plaster row is 0.7, the objects' ink is lifted
0.0005, the plant's bounds come from the verge's code and the hand casts against it.

**One fact for Mark's gate:** none of the three objects is in frame at the stop the design names. Each is seen while
walking, widest at 76 px (the bench), 32 px (the pot) and 22 px (the pail) on a 1600 × 900 desktop, and 35, 14 and 6 px
on a phone (`k3/probe/lead-k3-objects-view.log`). The plan keeps the design's doors and scale.

**Running at 22:42:** the worker builds Task 1 alone (W2 to `t` 0.41, `k3/brief-k3-task1.md` → `k3/t1/report-worker.md`).
Codex reads revision 1's fixes, bounded to four questions (`k3/brief-plan-confirm-codex.md` → `k3/plan-confirm-codex.md`,
BUILD or REVISE). Both waiters are armed. **Next:** on BUILD, the Lead checks Task 1 and sends Tasks 2 to 4 with the
fourteen mutation proofs (`k3/brief-k3-build.md`, to be rewritten from revision 1). Then the Lead's look passes and gate,
the push for Mark's preview, the PR as a draft then ready.

**Quotas at 22:36 (Quota Finch):** Claude 2% of the session and 9% of the week, Codex 72% of the session (resets 00:24)
and 23% of the week, the worker 18% of the session and 58% of the week.

## Pickup — 2026-10-27 (21:45): K3's plan written and out for both reads; the build follows on this branch (superseded by the 22:45 pickup above)

**K2 is merged** (#31, main `1b5e62f`, Codex's review clean). Its worktrees and server are gone.

**K3, the lived-in houses: the plan is at revision 0**, `tasks/2026-10-27-village-lived-in-plan.md` (`f04c0e8` on
`feat/village-lived-in`, the worktree `lived-wt` in session `49dba370`'s scratchpad). The plaster measurement is done
first, as the design asked (`scratch/village-craft-2026-10-25/k3/t0/plaster/measurement.md`): the walls carry strokes
0.35 to 0.75 of their height in two or three tiers, so the plan takes 0.65 of the row on the four plaster houses with
the cover scaled to hold the count. Four calls against the design's text are open to Mark at the gate (the plan's
head). Both plan reads were sent at 21:45: Codex's correctness read (`k3/brief-plan-review-codex.md` →
`k3/plan-review-codex.md`) and the worker's buildability read (`k3/brief-plan-build-worker.md` →
`k3/plan-build-worker.md`), waiters armed. **Next:** fold both reads into revision 1, dispatch Tasks 1 to 4 to the
worker (`k3/brief-k3-build.md`), the Lead's look passes and gate, the push for Mark's preview, the PR as a draft then
ready. Then Vincent's form (a throwaway lantern spike for Mark's eye), then his wander with the camera kept.

**Quotas at 21:35 (Quota Finch):** Claude 47% of the session and 7% of the week, Codex 25% / 15%, the worker 14% of
the session and 57% of the week.

## Pickup — 2026-10-27 (21:15) (superseded by the 21:45 pickup above): K2 passed by Mark and reviewed clean on PR #31; K3's three calls made, the plan next

**K2 is done bar the merge.** Mark passed pass 5 on the preview at 21:06. PR #31 (`feat/village-lane` on main, head
`27e2001`) is open and ready; Codex's review completed at 21:09 with no findings. The merge is Mark's click, or the
Lead's on his word. After the merge: delete the branch, prune the worktrees `craft-wt` and `lane-wt` (session
`fc6c46e1`'s scratchpad), stop the dev server on 5206 (this session's background job).

**K3, the lived-in houses: the design is approved.** Mark's three calls at 21:11, all the recommendations: W2 ends at
`t` 0.41, a wooden pail by L4's door, the far paths at full length (recorded in the design,
`docs/superpowers/specs/2026-10-26-village-lived-in-design.md`, "Mark's three calls"). This branch,
`feat/village-lived-in`, is stacked on `feat/village-lane` at `27e2001`; its worktree `lived-wt` is in session
`49dba370`'s scratchpad (`node_modules` and `reference/derived` linked to the main checkout's). **Next:** the K3 plan
(`superpowers:writing-plans`, from the design's Decisions table), Codex's correctness read and the worker's buildability
read, then the build here after #31 merges (rebase onto main first). Then Vincent's form (a throwaway lantern spike for
Mark's eye), then his wander with the camera kept (the 2026-10-26 21:00 pickup).

**Quotas at 21:10:** Claude about 5% of the week, Codex about 13%, the worker about 57%.

## Pickup — 2026-10-27 (21:00): K2 pass 5, the stone wall, passed the Lead's gate, pushed for Mark's preview (superseded by the 21:15 pickup above)

**K2 pass 5 (S4, the stone wall) passed the Lead's gate at 20:57** (the record `tasks/2026-10-26-village-craft-k2.md`,
its last section; the evidence `scratch/village-craft-2026-10-25/k2/t6/`, the gate's runs `k2/t5/` and `k2/gate/`).
The code head is `973c07d` on `feat/village-lane`. Pushed for the Vercel preview at 20:58:
`https://starry-night-kdvm5pcw6-markpukete-webs-projects.vercel.app/?street=1&station=0` (Vercel sign-in), Mark pinged at 21:01. **Passed by Mark at 21:06 ("Passed, what's next"); the PR is open, Codex's review pending.** The three agents are idle. The dev server on 5206 is this
session's background job (restarted fresh at 20:56, alone).

**What Mark reads:** the wall at stop 0 and stop 3 at 1:1 against the probe he chose (S4), the top rows (the shared
planner lays shorter stones than the probe did), the heads. Open and not blockers: the lantern's flat box, the K1 fog
fails, `?lane=0`.

**Next after his pass:** the PR stacked on main (Codex's review read through the timeline API, every thread answered,
at most two re-requests), then K3 on his three calls (the 21:30 pickup of 2026-10-26: R2 or W2 at `t` 0.41, bucket or
woodpile, far paths full or fading). Quotas at 19:00: Claude 2% of the week, Codex 11%, the worker 53% (now about 56%).

## Pickup — 2026-10-27 (19:25): K2 pass 5, the stone wall, the worker building S4, Codex reading the brief (superseded by the 21:00 pickup above)

**Mark's calls tonight:** "Probe stone" (19:05) over wood, then S4 (19:20) over S3 and over passing K2 as built. Pass 5
is past K2's cap of four on his word. The record's last section (`tasks/2026-10-26-village-craft-k2.md`, "Pass 5")
has the probe: the cause was the dab's shape under the stroke body's flame, not the body share. The evidence is
`scratch/village-craft-2026-10-25/k2/t6/` (the probe tools, the four patches and crops, the comparison image).

**Running:** the worker (`w4:p5`) builds `k2/t6/brief-k2-pass5.md` on `feat/village-lane` in `lane-wt` (two commits,
three new tests, five mutation proofs, the look captures into `k2/t4/p5/`), its report at `k2/t6/report-worker.md`.
Codex (`w4:p4`) reads the brief as a plan, `k2/t6/review-plan-codex.md`, GO or STOP first line. A STOP stops the
worker before its Step 3 commit.

**Next:** the Lead's gate on the worker's branch (the diff against the brief, the mutations re-run with
`k2-mutations.sh t6 5`, pass 5's frames read at 1:1 on both viewports, `k2-gate.sh`, `k2-colour.sh`, `k2-perf.sh`,
`k2-walk.sh`), the Tunables entry, then the push for Mark's preview and his live read. The PR after his pass. K3
waits on his three calls (the 21:30 pickup of 2026-10-26). The dev server on 5206 is this session's background job.

## Pickup — 2026-10-27 (00:29): K2 on preview, Mark's first read in, the stone wall reads as concrete, his call on a probe pending

**Mark's live read tonight (00:20 to 00:29):** "the lighting feel right." The wall at stop 0 reads to him as a concrete
fence, and he asked whether a wooden fence would be better. The Lead's answer: keep stone (Saint-Rémy's lanes and the
asylum's enclosure wall Van Gogh painted in 1889 are dry stone; wood reads as a paddock and would repeat L2's rail; wallB is
a measured source) and make it read as stone: joints opened from 0.92 to about 0.8 with the body a clear step darker than
the stones, two stone sizes, a cope of upright stones along the top, stones on the end caps. That is a pass past K2's cap of
four, so it needs his word. The cheap path first: the in-place probe (`E/tools/k2-wall-probe.sh`'s pattern) of the stonier
recipe at stop 0, 1:1 crops for him, before any worker round. He wrapped up without deciding: **next session opens by
asking him "probe it?" or wood**, then runs the probe if yes. Wood, if he wants it anywhere, belongs to a gate or a short
garden fence by a house in K3, not the verges. K2 is not passed by him yet.

## Pickup — 2026-10-27 (00:10): K2 passed the Lead's gate, pushed for Mark's preview, no PR until he has looked (superseded by the 00:29 pickup above)

**K2, the lane's walls, rail and lamps: on preview, Mark's live read pending.** The record is
`tasks/2026-10-26-village-craft-k2.md`, its gate section at the end; the evidence `scratch/village-craft-2026-10-25/k2/`
(`t5/` the gate's runs, `gate/` the Lead's checks and the case 15 probes). The code head is `883c311` (the grass check's
case 15 moved to lateral 0.32, past lamp 1's pool); the scene's code is `3662089`. Pushed to `feat/village-lane` at `946ef0b`.
The preview is `https://starry-night-gepd7ldoi-markpukete-webs-projects.vercel.app/?street=1&station=0` (Vercel sign-in),
Mark pinged at 00:13. No PR until he has looked. The Tunables entry is in
CLAUDE.md. Codex's confirmation read was APPROVE on the code at `3662089`; the check's change is for the PR review.

**Open for his eye, none a blocker:** the lantern reads as a flat yellow box at 1:1; the walls' end caps carry the base
colour only; stonier stones (a darker joint, a wider stone) after the cap; lamp 1's pool reaches the verge grass by
design; the K1 fog fails stand.

**Idea, not built:** `?lane=0`, the build hash's `LANE=0` as a URL flag, so he can compare K1 and K2 on one preview.
Scope grows, so it is his call.

**Next after his pass:** the PR stacked on main (Codex's review read through the timeline API, every thread answered, at
most two re-requests). K3 waits on his three calls (the 21:30 pickup): R2 or W2 at `t` 0.41, bucket or woodpile, far
paths full or fading. His answer on the three-agent question is pending. Quotas were last read at 21:47 (the 22:20
pickup), not at this close.


## Pickup — 2026-10-26 (night, 22:20): K2 in its Lead gate, Codex's seven findings confirmed, the fix round's brief at revision 3 with Codex, the worker next (superseded by the 00:10 pickup above)

**K2's gate so far** (the record `tasks/2026-10-26-village-craft-k2.md`, the evidence `scratch/village-craft-2026-10-25/k2/`).
The suite, the hashes, the diff read and the nine mutation proofs re-run by the Lead all pass. Look pass 1: the lamps
and the rail land, the walls read black (wallA's darkest 40% is L 4.7). Pass 2 (`5806c1c`, wallB and the halo at 0.7):
the lamps and the rail pass, the walls still fail at 1:1 (a near-black body, stones as leaves). Pass 3, probed in
place at stop 3 (`k2/t4/p3/A..D-wall.png`): recipe D, the body at the source's mean with the stones from the lighter
half of wallB's texels, the width 0.19, the joint 0.92, the length kept at the painting's measured range. Pass 4, the
cap, is the full capture after the fix round.

**Codex's branch review** (`k2/review-branch-codex.md`): REVISE, seven findings, every one confirmed against the code
and by the Lead's run of Codex's probe. F2 is the one that bites the gate: `npx tsc -b` and `npm run lint` fail on
unused imports, so the build would fail. F1 the halo's depth in the wrong frame under `?skyAnchor=A`, F5 the cap's
inward winding, F3 and F4 weak guards, F6 dead controls, F7 the proofs' missing commands.

**The fix round** (`k2/brief-k2-fix1.md`, revision 3): one worker brief for F1 to F7 with tests and six proofs, plus
pass 3's values. Codex's plan leg stopped revisions 1 and 2 on contract breaks (the hash rule, the lint's place, the
tests' height reads, the helper's module, the F6 proof, then the measured-dab test and the measured length range),
all folded. Revision 3 is with Codex (`k2/brief-codex-k2-fix1-plan-r3.md`). On GO the worker runs it; the Lead then
sends Codex the bounded confirmation (`k2/brief-codex-k2-fix1-review.md`), captures pass 4 (`k2-look.sh p4`), runs
`k2-gate.sh`, `k2-colour.sh`, `k2-perf.sh` and `k2-walk.sh`, finishes the record, the Tunables entry and the lessons,
pushes `feat/village-lane` for the Vercel preview and pings Mark with the link. The PR follows, stacked on main.

**Quotas at 21:47:** the worker 21% session, 50% week; Codex 11% and 8%; the Claude pool 49% session (resets 22:29)
and 80% week (resets 06:59).

**K3** waits on Mark's three calls (below, the 21:30 pickup). Mark's answer on the three-agent question is pending.


## Pickup — 2026-10-26 (night, 21:30): K2's Tasks 1 to 3 built, K3's design at revision 1 with both reads folded, three calls for Mark (superseded by the 22:20 pickup above)

**K2's build.** Tasks 1 to 3 are committed: `a19c983` the walls, `30564f5` amendment A1, `9f1d52d` the rail, `38e221a`
the lamps. Codex's bounded read of A1 is GO (`k2/review-a1-codex.md`): the density test still catches a wrong falloff,
and no other test in the suite leans on the shared chunks in a way the clearings break. The worker is on the nine
mutation proofs and its report (`k2/t3/report-worker.md`). The Lead's gate follows.

**K3's design, revision 1** (`docs/superpowers/specs/2026-10-26-village-lived-in-design.md`). Codex: REVISE, four P2 and
two P3 (`k2/design-review-k3-codex.md`). The Consultant's builder check: six questions
(`k2/builder-check-k3-consultant.md`). The Lead ran both reviewers' probes again (they reproduce) and two of its own
(`k2/probe/lead-k3-r2gap.mjs`, `lead-k3-paint-ref.mjs`). What changed: the paths' ends are checked over every leg's
full width. R2's recommendation moves to W2 ending at `t` 0.41 (the path 0.344 long), because the route to 0.50 crossed
the wall. The budget was wrong by three: the ten paths at the lane's stroke size and full cover cost about 50,000
triangles on the real tracer, so a path takes a reference height scaled to its width and a cover of 0.25 (28,700).
L5's and R5's paths end at the square's rim. L2's path is the door's width wide, through the gate. The plant is a clump
of the grass's blades. The objects ride the walls' class as the rail does. The bucket is a wooden pail. A shorter
plaster row would reach the church, so it reaches the four houses only, through `WALL_PAINT`, the ribbon count held.
The measurement crop runs to the scan's bottom. The table at the design's top lists every row.

**Mark's three calls (the design's last section):** R2 against W2 (the recommendation: W2 ends at `t` 0.41), the bucket
or a woodpile, the far paths at full length or fading short of the lane.

**Mark asked (21:05) why the Consultant, Codex and the worker ran at once.** The Lead's answer: the worker was building,
not reviewing. Codex's two reads were both due. The Consultant was the builder's leg, which the design process asks for
before Mark reads a design. Two gaps owned: no Quota Finch check before three dispatches, and the Consultant was set as
Codex's fallback, not a parallel reader. The recommendation: both legs for plans, Codex alone for designs. Mark's answer
is pending.

**Next:** Mark reads revision 1 and makes the three calls. Then the K3 plan (`superpowers:writing-plans`), both plan
reviews (Codex's correctness read, the worker's buildability read), and the build on `feat/village-lived-in` after K2's
gate. In parallel: the worker's K2 report, the Lead's gate on K2, Codex's branch review, the push and Mark's preview
link.


## Pickup — 2026-10-26 (night, 21:00): K2's Task 1 built, amendment A1 for a test the plan missed; K3's design drafted; Mark's two questions (superseded by the 21:30 pickup above)

**K2's build.** Task 1 is committed at `a19c983` (the walls, 1,964 triangles, both `LANE=0` hashes K1's). The worker
stopped there, rightly: `street-grass.test.ts:99` (the density falloff by band) fails at 17.9% because its expected
count never knew the clearings and the walls take 1,373 blades out of band 0. Neither plan review caught it.
**Amendment A1** (the plan's table and Task 1 Step 3a): that one test reads K1's grass (`stepClearings()`), nothing
else changes. The worker continues with A1, Tasks 2 and 3 and the mutation proofs (`k2/brief-k2-build-2.md`). Codex
reads A1 bounded (GO or NO-GO) in parallel (`k2/brief-codex-a1-and-k3.md`, Part A).

**K3, the lived-in houses: the design is drafted** at `2e4f995`,
`docs/superpowers/specs/2026-10-26-village-lived-in-design.md`, for Mark's approval. Mark asked for the plan too
("plan and draft k3, then let codex review"), and the Lead holds the plan until he approves the design: he is
rethinking Vincent and the walk (below), and a plan on an unapproved design is the waste. Codex reads the design's
facts (Part B of the same brief), the Consultant reads it as a builder (`k2/brief-builder-check-k3-consultant.md`).
Its one cross-slice call for Mark: R2's door path crosses K2's wall W2 whichever way it runs, so it lands past W2's end
(the recommendation), or W2 gets a gap, or R2 gets no path.

**Noted, not queued (scope rule), Mark's two questions, 2026-10-26 (night):**

- **Vincent's form.** "After couple of slices, I feel like our little Vincent is too 'Creepy', I think Simon's approach
  is better, he makes a robot walking around, perhaps we can use a Wall-E style robot? ... perhaps we should make our
  site more futuristic but not so creepy, or would you have any better idea?" The Lead's read: the robot copies Simon
  (the bar: study, never copy) and "futuristic" fights the locked faithfulness bar. The creepiness is in Vincent's
  behaviour and light, not his species: a small dark figure held 0.58 ahead of the camera, back always turned, never
  pausing, lit by nothing of his own, under moonlight. The fix proposed: a lantern in his hand (warm light on him and
  the path ahead), a walking rhythm, a stop and a turn of the head at each station, a three-quarter view at the stops,
  and a silhouette from Van Gogh's own "Painter on the Road to Tarascon" (1888: hat, canvas on the back, stick), which
  is near the "other paintings" line and so Mark's call. A throwaway spike of the figure for his eye, since movable is
  settled by building. Its own slice.
- **Free exploration.** "Do you think we can still make the village exploreable? Like you can control Vincent or robot
  to freely explore through the grass or on the path etc?" The Lead's read: possible and big (two slices or more). It
  breaks the street design's non-goal ("No free roaming") and the locked camera criterion (Mark's edit, not the
  Lead's), the church's faces thinned where no walk pose sees them (`CHURCH.hidden`), `detailOf`'s far-house halving,
  the frogs drawn only near the walk's camera, and a triangle ceiling checked only at the walk's points. The middle
  way: steer Vincent off the path onto the verge within the grass's footprint, the camera following, bounded by the
  houses, walls, rail and lamps. After K3 and after the village opens to visitors.

**Mark's decision (2026-10-26, 21:00): "I will go with your recommendations."** No robot. The roadmap after K2:
K3 (the lived-in houses, the design as drafted, R2's path past W2's end), then Vincent's form (a throwaway spike with
the lantern for his eye, then its slice), then **Vincent's wander with the camera kept**. Mark's version of exploration:
"the free exploration would be under Vincent walk through the grass etc but keep the camera." The Lead's read: it works
and is one slice, two with the phone's steering. The camera stays on the path (so the hidden faces, `detailOf`, the
frogs' draw distance and the ceiling checks hold) and yaws to keep him in frame (on the phone he leaves the frame at
about 0.2 off the path otherwise, and the grass budget is re-measured across the yaw). Vincent gets a lateral control,
bounded by the grass's footprint and the parts' footprints, and the grass parts under his feet off the path as it does
on it. It changes the street design's non-goal ("Vincent stays on one path"), not the locked camera rule: the visitor
still moves the camera only along the path. His form comes first: once he is steered, he is looked at.

**Next:** the worker's K2 report, then the Lead's gate on K2 (Task 4's look passes, Task 5's runs), Codex's branch
review, the push and Mark's preview link. Mark reads K3's design with both reads folded in.


**K1, the houses: passed by Mark on the preview** ("K1 passed, start K2's build. In fact I don't feel much
differences."). The change read as small to him.

**The stack #23 to #30 merged to `main`** on Mark's word, 2026-10-26 ("merge the stack #23 to #30"), merge commits,
`main` at `3fd5b2e`, production built (Vercel success). K1 is PR #30, Codex's review there: no findings (+1 at
`ca102c7`). #23's Codex review never left "running". Mark had declined a re-request on 2026-10-25, and #23's thread
says so.

**The branches, tidied** (Mark: "can you also tidy up our branches?"). Every branch contained in `main` is deleted,
local and remote, with `feat/village-craft` (contained in `feat/village-lane`) and, on Mark's word, `spike/grass-hand`
(`1bfb8c2`, the throwaway grass test). Left: `main` (the main checkout is on it now) and `feat/village-lane` (K2), and
on the remote only `main`. The worktree `framing-wt` is removed. `craft-wt` is detached at `96f246e` and serves K1 on
port 5205 for K2's gate.

**K2's build: Tasks 1 to 3 with the worker** (`w4:p5`), from `c9fd0cd` on `feat/village-lane`, brief
`scratch/village-craft-2026-10-25/k2/brief-k2-build.md`, the report due at `k2/t3/report-worker.md`. The dev server for
`lane-wt` runs on port 5206. Then the Lead's look passes (Task 4) and gate (Task 5).

**Noted, not queued (scope rule), Mark's idea, 2026-10-26:** "the house front door maybe shouldn't be that much grass.
We might need to refine the house later on to make it more real and show that house actually live in people. Perhaps
some decorations, front door path, small plant ect". A later slice, after K2: a path from each door to the lane (the
grass cleared along it, as the steps clear it now), and a few signs of life at the doors (a pot plant, a bench, a
bucket), each an identity object from the scan's colours. Its design comes before any code.

## Pickup — 2026-10-26 (night): K2's plan, revision 1, approved by both legs; Mark's read and his K1 pass next (superseded by the 20:15 pickup above)

**K2's plan, revision 1 at `2d81767`** on `feat/village-lane` (`tasks/2026-10-26-village-craft-k2-plan.md`), local.
Both review rounds are folded in, each finding answered in its table "What revision 1 changed". The bounded re-reads:
Codex APPROVE (`k2/plan-review-codex-r1.md`, F1 to F9 closed, no new P2), the worker BUILDABLE
(`k2/plan-build-worker-r1.md`, W01 to W11 closed, no new gap). Evidence in `scratch/village-craft-2026-10-25/k2/`.

The Lead's calls in revision 1, each open to Mark at the gate:

- **F4, the halos on the walk:** Decision (d2). A halo's world size is held so it never spans more than 0.5 of the
  viewport's shorter side (`lampHaloScale` in `streetLife.ts`, set per frame from the lantern's view depth). Without
  it, four lamps pass the walk at 0.14 to 0.25 and their halos span 1.07 to 1.80 screen heights. Codex's probe: 12,378
  cases, the largest 0.5000000000000071. A fourth departure from the design, beside the walls' lateral, no ink on the
  rail and the lamps' count and places.
- **F3, lamp 4's pool:** lamp 4 at `t` 0.55. The pool test casts each frog's own stop's rays to its body
  (`k2/probe/lead-pool-frogs.mjs`): 0 crossings at 0.55, 2,844 at 0.52, 273 at 0.58, so lamp 4 cannot move in Task 4.
  From stops 0 and 1, rays to frog 3 (1.1 to 1.6 away, under a pixel of it affected) cross lamp 4's pool: the frog in
  the lamp's light, not counted.
- The stones from `wallA` (`plaster` is too narrow for the dab). The rail at L2 only (R1 too near R2, L5 and R5
  outside the grass).

`T/grass-hash.ts` now reads `LANE=0` (passes `stepClearings()`), and gives K1's `def5470cc15817ba` on the lane
worktree.

**Next:** Mark reads the plan. K2's build (Tasks 1 to 3 to the worker, the brief `k2/brief-k2-build.md`) waits for his
K1 pass on the preview. The PR stack #23 to #29 merges on his word (no new Codex activity since 2026-10-25), then K1's
PR.

## Pickup — 2026-10-26 (evening): K1 on preview for Mark, K2's plan reviewed (both legs REVISE), revision 1 next (superseded by the night pickup above)

Mark wrapped up here ("When Codex's done, record where we at. I need to wrap up and will revisit next session").

**K1, the houses: on preview, Mark's live read pending.** Passed the Lead's gate, record
`tasks/2026-10-25-village-craft-k1.md`. Pushed at `3b2de77`. The preview is
`https://starry-night-n9lqu8ccy-markpukete-webs-projects.vercel.app/?street=1&station=0` (Vercel sign-in). No PR until
he has looked. Open for him: the plaster houses' long vertical strokes (a shorter stroke needs a new 1:1 measurement),
and stop 1's phone frame, walls' ΔE 9.55 to 10.10. Two local docs commits since the push ride up on the next code push:
`ca102c7` (the record's sweep note) and `b7a5a4f` (K2's plan).

**K2, the lane: plan revision 0 at `b7a5a4f`** (`tasks/2026-10-26-village-craft-k2-plan.md`): three stone walls on the
open verges, a rail round L2's front garden, seven lamps. Both legs read it. Evidence in
`scratch/village-craft-2026-10-25/k2/`.

- The worker's buildability read (`k2/plan-build-worker.md`): NOT BUILDABLE AS WRITTEN, W01 to W11. The Lead's answers,
  not yet written into the plan: `report.lane.lamps` everywhere (W01). Export `LAMP_POOL_Y` from `streetLife.ts` (W02).
  State the frame test's formula in the plan, the probe now at `k2/probe/k2-lamps.mts` (W03). `stepClearings()` and
  `wallClearings()`, with `streetClearings()` their sum (W04). A wall rectangle: origin at the segment's lane-face start,
  `u` the chord, `n` = side × (−uz, ux), `u0, u1` = −0.001 and chord + 0.001, `k0, k1` = 0 and 0.03 (W05). A run splits
  into `ceil(Δt / 0.02)` equal segments (W06). The rail's lamp check moves to Task 3 (W07). The report gives the dabs'
  vertex range in `strokes`, 9 vertices a dab (W08). Each segment reports its 4 footprint corners and the run its
  underpaint range (W09). Rail posts are feet at y 0, the opening the two gateposts' feet (W10). The caller passes the
  dab's centres already lifted (W11).
- Codex's correctness read (`k2/plan-review-codex.md`): REVISE, F1 to F7 P2, F8 and F9 P3. Its probes are in
  `k2/probe/codex-*.mjs`.
  - F1: a dab 0.17 of the wall's height is outside `plaster`'s measured width (0.10 to 0.15), and the 0.88 joint makes
    the painted length 0.53 to 0.79, under the 0.6 minimum. Answer: the stones' source is `wallA` or `wallB`, and the
    cell length is 0.68 to 1.02 so the painted length is 0.6 to 0.9. The tests read the emitted sizes.
  - F2: every rail's back posts are 0.02 from their own house, against the plan's 0.03 rule. Answer: L2's side rails
    start 0.03 out from the front. R1 is not a fallback (0.021 from R2).
  - F3: lamp 4's pool at y 0.007 lies in front of frog 2 from stop 2. Answer: lamp 4 to `t` 0.55 (Codex's probe: no
    frog ray crosses the pool, every other clearance kept), and a pool-against-frog test.
  - F4: **the open design question for revision 1.** On the walk between the stops, a lamp's halo sprite can project
    larger than the screen (lamps 1, 3, 4 and 6, up to 1.8 screen heights at 0.14 from the camera). The station-only
    check misses it. The options: fade a halo as the camera comes within about 0.3 (a change with distance, not with
    time), a smaller halo, or lamps further from the walk line. The Lead's call, written into revision 1 with a
    whole-walk test, open to Mark at the gate.
  - F5: the mutation proofs' `git checkout -- <file>` would undo uncommitted Task 3 work. Answer: commit first, then
    restore each mutation from a saved copy and check the hash.
  - F6: the wall tests can pass with no wall drawn. Answer: each run reports its emitted ranges, all non-empty, and a
    mutation that drops the append must turn a test red. The rail the same.
  - F7: the design puts posts in the walls' class. Answer: the lamp posts in class 0, in `INK`.
  - F8: as W01. F9: four facts to correct: the 90-triangle count was built with `KEPT_PAINT` (the default gives 86.4).
    Vincent is 0.4 ahead of the path sample, not the camera. Sprites already exist in the sky (`SkyDome.tsx:236-255`).
    The walls fail at eight of ten frames, not seven.

**Task 0 is done.** Branch `feat/village-lane` from `b7a5a4f`, local. K1's hashes in `k2/t0/`: build
`35ce7aeb5bd88590` (574,041), grass `def5470cc15817ba`. `tools/build-hash.ts` has a `LANE=0` switch. The dev server for
K2 (port 5206) is not started.

**The worktrees** `craft-wt`, `framing-wt` and `lane-wt` were in this session's scratchpad, which is removed with the
session. The branches stay in the repo. A new session adds its own: `git worktree add <scratchpad>/lane-wt
feat/village-lane`, then links `node_modules` and `reference/derived` to the main checkout's.

**Next:** the Lead folds both reports into revision 1 in one round, F4 decided. Codex's bounded re-read (these findings
only, APPROVE or REVISE, nothing below P2). Mark reads the plan. K2's build waits for his K1 pass. The PR stack #23 to
#29 merges on Mark's word, then K1's PR.

## Pickup — 2026-10-26 (afternoon): K1 (the houses) passed the Lead's gate; Mark's live read next (superseded by the evening pickup above)

**The village's craft, K1.** Built, gated and reviewed on `feat/village-craft`, head `02d5fba` and the record's
commit. The record is `tasks/2026-10-25-village-craft-k1.md`. The branch is pushed for a Vercel preview, and no PR is
open until Mark has looked ("I prefer live links, so when first slice done, push then I will review"). His pass ends K1.

Open for Mark: the plaster houses' long vertical strokes (a stroke length needs a new 1:1 measurement of the scan's
village), and stop 1's phone frame, walls' ΔE 9.55 to 10.10.

**Next:** K2's plan (walls, rail, lamps) from `scratch/village-craft-2026-10-25/k2/design-notes.md`, reviewed while
Mark reads K1. K2's build waits for his K1 pass. The PR stack #23 to #29 merges on Mark's word, then K1's PR.

## Pickup — 2026-10-26 (00:20): K1's plan reviewed, both legs REVISE; revision 1 next

**The village's craft, K1 the houses.** Mark approved the design ("go with your recommendation, start the plan"). The
plan is `tasks/2026-10-25-village-craft-k1-plan.md`, revision 0 at `23ed2be` on `feat/village-craft` (rebased onto
`feat/phone-framing`), local. Mark stopped the session here ("we need to take a break and pick it up next session").
Nothing is built.

**Codex's correctness read** (`scratch/village-craft-2026-10-25/plan-review-codex.md`): REVISE, six P2 and two P3.

- F1, P2: a step exclusion inside `grassChunks` shifts its one seeded stream, so the grass moves everywhere and refills
  the frog gaps at stops 1 and 3 (a blade root 0.0050 from stop 1's frog, the clearance 0.0075). Filter the blades
  after the generation and the shuffle, then update the chunks' bounds.
- F2, P2: `front over` gets 8 ribbons on five painting houses, under `street-build.test.ts`'s floor of 12. Give the
  split fragments their own floor or a minimum count, with its triangles.
- F3, P2: `test:sky` lists its files (`package.json:22`), so `street-craft.test.ts` must be added there in Task 1.
- F4, P2: 'far houses and far ground take half' asserts each house face's density equals `detailOf`. The cover knob
  changes it. Hold that test at `KEPT_PAINT` or assert the factored density. The far ground at 0.25 needs the same.
- F5, P2: Decision (a)'s formula must name its colour space: decode to linear, apply the moon lift, mix in linear,
  encode only for the report (`house-7/back`: 0.478 against 0.444 on red).
- F6, P2: knob 3's `walls` bucket must reach `leaned()`, the triangle count, the returned buffers and `Street.tsx`.
- F7, P3: say that the church keeps `CHURCH.recess` and gets neither `craft` nor `eaves`.
- F8, P3: the K2-room target has two rules (Decision (i) lets a miss carry, Task 4 says it is met). Pick one.
- Its notes: the levels hold. The levels test should check the drawn ink's vertices, not only the constants. The
  shutter colour is `PALETTE.villageCool`. The walls' cover at 0.9 saves 15,796 triangles, at 0.8 31,344.

**The worker's buildability read** (`scratch/village-craft-2026-10-25/plan-build-worker.md`, 288 lines): cannot be
built as written. It agrees on F1 to F3. It adds: `report.faces` has no `source`, `craftShape` and `CraftReport` have
no home or type, and the plan gives no formula for `doorStepFoot`, the cottage's band, or the soffits' corners.

**Next:** the Lead reads both reports in full and folds them into revision 1 in one round. Then Codex's bounded re-read
(these findings only, APPROVE or REVISE, nothing below P2). Then Mark reads the plan. Then Tasks 1 to 3 go to the
worker. The base: 603,641 triangles, build 646 ms, hash `71114298aa85575a`. The tools are in
`scratch/village-craft-2026-10-25/tools/` (`WT=<worktree>` picks the checkout). No dev server runs for the craft
worktree yet: Task 0 serves it on port 5205.

**PR #29 (the phone framing):** Codex's P2 fixed in `32c71f0` and answered on the thread. No re-review requested.
Merges in stack order #23 to #29, on Mark's word.

## Pickup — 2026-10-25 (near midnight): the loading curtain passed on Mark's phone; the phone framing reopened

**The loading curtain** is done on `feat/loading-curtain` (stacked on `fix/finger-no-bend`), local, no PR. The opening's
first frame is in the page, so a first visit shows Vincent's line and "Painting the night sky…" at once, and the
painting fades in as it arrives. The Consultant's correctness read: REVISE, six findings, five fixed, one declined.
The gate found one more (no WebGL left React's cue up for ever), fixed in `98ad144`. The record:
`tasks/2026-10-25-loading-curtain.md`. **Mark on his phone: "it works well in terms with landing". Slow 4G is out of
scope.** The PR next, on the finger fix's.

**PR #26 (the frogs) and PR #27 (the finger fix):** Codex completed with no findings and a +1 on each, at `8699a4b`
and `04294e6`. No threads to answer.

**The phone framing: fixed on `feat/phone-framing` (stacked on the loading curtain), passed by Mark on his phone ("It
reads right on the phone, push it"). The record: `tasks/2026-10-25-phone-framing.md`. What was found:** The portrait home
is candidate C, Mark's pick of 2026-07-28 (`1f6b21e`): the whole composition, letterboxed, about 19% unpainted sky at
the top. It was measured from 360 × 800 to 430 × 932. Mark's iPhone 17 Pro Max in Safari is about 440 × 820 with its
bars, a wider aspect than any measured. Next: capture production at his viewport, name what is wrong, then two or three
candidates for his pick. Its own small slice.

**The village's craft:** the design is `docs/superpowers/specs/2026-10-25-village-craft-design.md` on
`feat/village-craft`, waiting for Mark's approval. No plan or code before it.

## Pickup — 2026-10-25 (late night): the frogs built, gated and reviewed; the phone's touch cost open

**The frogs** are done on `feat/street-frogs` (stacked on the portal), local, no PR. Five, one by each stop, side-on
to its camera. Gate runs all pass (60 fps, every browser triangle read under the ceiling, 18 grass cases). Codex's
branch review: FIX twice, both on case 18's reach, then MERGEABLE. The record: `tasks/2026-10-25-street-frogs.md`.
**Mark's gate: "frog passed."** The PR next, stacked on the portal's.

**The phone's touch cost (open, found 2026-10-25).** Mark's first real-device reading, iPhone 17 Pro Max, the
painting page: 60 fps still, 18–50 under a moving finger, near 60 with `touch=0`. The Mac does not reproduce it (4×
CPU throttle, vsync off: no touch cost measurable), so the phone is the loop. His drags: `?perf=1&bend=0` (the sky's
surges only) held 60, `?perf=1&surge=0` (the land's ray cast and bend, the surges at zero strength) read 38–60. So the
land's bend is the cost, not the sky's surge. Mark first suggested removing the surge on phones, then chose "No land
bend on a finger". **Fixed** on `fix/finger-no-bend` (`dccdd9a`, stacked on the frogs): `landActive` is false for a
finger, so a finger turns the view and lights the sky, and a mouse or a pen still bends the land. `check-portal.mjs`
case 12 pins both, and fails with the fix reverted (the worker's runs, `scratch/finger-no-bend-2026-10-25/`). Mark on
his phone, 5202: "The frame rate stays near 60. All points you mentioned achieved". The Consultant's review next, then
its PR on the frogs'. Suspects: the
land's per-frame ray cast against six meshes (`useTouchInput.ts` `landPoint`), and the sky's 16-slot surge loop per
vertex (`touchSurge.ts` `touchLift`). The bar is 30 fps on a mid-tier phone. A mid-tier phone is still unmeasured.

**Next on the roadmap (Mark, 2026-10-25: "go with your recommendation"):** the real-phone check (started above), then
the village's craft slice (door frames, shutters, steps, eaves, fences, lamps, and surfaces that read as solid paint).
The PRs #23 → #24 → #25, then the frogs', on Mark's word. #23's Codex review sat at "running" from 08:37 UTC; Mark:
"No need" to re-request.

**Routing (Mark, 2026-10-25):** all mechanical work to the Gemini 3.8 worker (`w4:p5`); visual and reasoning work
stays with the Lead. New review work to the Consultant (`w4:p6`) while Codex is low; a short read of a fix stays with
the reviewer that found it.

## Pickup — 2026-10-25 (night): the portal (slice 4) built, gated and reviewed; Mark out (superseded by the late-night pickup above)

The portal is done on `feat/street-portal` (stacked on the church), local, no PR. Behind `?portal=1`, a hover over a
house shows the hand and "Enter the village". A tap flies the camera down to the village in 2.4 s. The street builds
under the flight's last frame, which keeps drifting in, then fades in. Escape or the dock's "Back to the painting"
fades back to the visitor's own pose. 60 fps on every page. Codex's branch review: FIX, five findings, all fixed and
pinned, then MERGEABLE on the confirmation read. The record: `tasks/2026-10-25-street-portal.md`.

**For Mark's gate.** Live at `http://192.168.0.148:5198/?portal=1`. The clips:
`scratch/street-portal-2026-10-25/t8/mark/portal-desktop.mp4` and `portal-phone.mp4`. Three calls, in the record's
"Open for Mark": the phone's held frame shows the island's underside, the flight and the drift are untuned, and the
flag stays off until he says. The gates still waiting, in stack order: S3b, the church, the portal. The PRs go in that
order, on his word.

## Pickup — 2026-10-25 (evening): the church (slice 3c) built, gated and reviewed; the portal in build, Mark out (superseded by the night pickup above)

The church is done on `feat/street-church` (stacked on S3b), local, no PR. It turns on the square to show its moonlit
side, takes a shorter brush and its own light, and has a recessed door over a step and three side windows. Codex's
branch review: FIX, two P2s and one P3, all about the tests, all fixed and answered in the record. The record:
`tasks/2026-10-25-street-church.md`. Its last section, "Open for Mark", holds four calls: the desktop's cropped spire
at stop 4, the church-only light, the plaster at L 44 against the painting's 52, and the phone roofs' colour fail.

**For Mark's gate.** Live at `http://192.168.0.148:5197/?street=1&station=4`. The 1:1 compares:
`scratch/street-church-2026-10-25/t5/mark/*-compare.png`. S3b's gate (the pickup below) is still his first. The PRs
go in stack order, S3b then the church, on his word.

**The portal (slice 4) is next, in build.** The plan is `tasks/2026-10-25-street-portal-plan.md` on
`feat/street-portal` (stacked on the church), revision 2, the Consultant's nine P2s folded. The Lead builds it.

## Pickup — 2026-10-25 (late afternoon): S3b pass 5 built, gated and reviewed; the church next, Mark out (superseded by the evening pickup above)

S3b pass 5 is done on `feat/street-s3b` (head `22b00fc`), local, no PR. Mark is out and gates on his return. What it
holds, against his words: the base between the clumps painted in the bushes' dark paint, the hand closing on a press,
and a frog with blinking eyes, in a gap of the left verge's grass ("Why not under the grass"). The record:
`tasks/2026-10-25-street-s3b.md`, Task 6. The Consultant's branch review: MERGEABLE, ten P3s, each answered there, six
fixed in `22b00fc`.

**For Mark's gate.** Live at `http://192.168.0.148:5196/?street=1` (or `localhost:5196`). The frog is at stop 0, low
left. The clips: `scratch/street-s3b-2026-10-25/t6/clips/blink/` and `t6/clips/press/`. His calls: the frog's place,
size and blink speed, the base's darker verge, and whether the press reads. Perf holds 60 fps at every pose. The p95
rose about 1 ms (the record says where). Then the PR, on his word.

**The church (slice 3c) is next, then the portal.** Mark: "agree, church first then portal". The plan is
`tasks/2026-10-25-street-church-plan.md` on `feat/street-church` (stacked on S3b), in review. Two deviations from the
design need Mark's word at the gate: stop 4 frames the spire, and a church-only light lifts its plaster.

## Pickup — 2026-10-25 (afternoon): Mark read S3b live; his answers and three ideas (superseded by the pickup above)

S3b is gated by the Lead and committed on `feat/street-s3b` (`cb34463`), local, no PR. Mark on the live street: the far
arch tops at stop 0 are fine, the stripes are fine, the grass's direction is right. The bare base between the clumps
"bother me a bit". Proposed to Mark, waiting for his word (it passes the four-pass cap): one more S3b pass that paints the
base in the bushes' darkest colours, broken up, and gives the hand a press (the closed-hand cursor while the button is
down, a hover at 0.6 and a press at 1, as `landTouch.ts` does). Then the PR.

**Noted, not queued (scope rule), Mark's ideas, 2026-10-25:**
- The hand with a touching motion on a click. The small version is in the proposed pass above. A drawn hand that pats
  the grass is the larger version, for later if the small one reads as plain.
- Fences "so that it feels more real". They go in the village's craft slice (below, 2026-10-24). The Lead's read: low
  dry-stone walls along the lane and a wooden rail round a cottage garden, not white pickets.
- The church at stop 4 "looks pretty flat" (his capture beside the painting's church and two reworks by other artists,
  ideas only). The cause: `streetLayout.ts:218` turns the diorama's church square to the lane, so stop 4 sees one wall.
  The Lead's proposal, most effect first: turn it to show two walls and the roof's slope (stop 4's framing changes), build
  it from the nave, a porch gable and a tower with a belfry, give the eaves, the door and a step depth, light the moonlit
  side near white, shorter strokes per wall. Its own slice, next after S3b. The walk has about 6,700 triangles spare at
  its worst point, so the church and the walls need a budget from elsewhere.
- Frogs or other animals in the village. The Lead's read: frogs fit poorly (no water, too small and dark to read).
  Mark asked for a frog anyway, in pass 5, and it is built (the pickup above). The rest of this note stands.
  Moths at the lit windows fit best: Vincent painted a giant peacock moth at Saint-Rémy in May 1889. Then a cat on a wall
  or an owl on a ridge. One or two, quiet. Borrowing a motif from his other work is near the "other paintings" line, so
  it is Mark's call. Not a fix for the bare base.

## Pickup — 2026-10-24 (afternoon, later): Mark read the grass test live; slice 2's plan next

Mark, on the live test: "It actually feels good, but there's room for improvement for sure. This is a throwaway test
but I think grass in the street would work. but I am still keen to make another portal and try some new things when I
have time". So the grass stays in the street, as the design has it (slice 3). The branch `spike/grass-hand` stays
local as slice 3's reference, never merged. Slice 3 rebuilds the grass under its own plan.

**Next: slice 2, Vincent and the walk**: the plan, Codex's review (Fable when Codex runs low), then the build.

For slice 3, from Mark's crop of the left verge at station 0 (near the camera): the near grass is thin, and the street
ground's long strokes read through it as grey and green planks. Under the grass the ground wants a dark base, so a gap
reads as shadow, as in Jeroen's clip, and the near blades want more density. With the look pass already noted below
(curved strokes in fanned clumps).

**Noted, not queued (scope rule): a second portal**, a meadow or another place to try new things, when Mark has time.
The design's first version rules out a second portal (non-goals). This is his idea for after it.

## Pickup — 2026-10-24 (afternoon): the grass test built; Mark's read next (superseded by the later pickup above)

Mark asked to think the grass and the hand through before slice 2 ("We need to thought it through before we
implement"). He also floated a meadow by the hills, reached by its own portal, in place of grass along the street. The
Lead's read: a meadow gives the clip's low, still camera, but the hard question is the same in both places (does grass
in the painting's strokes feel good under a hand), so test that first. Mark: "Sounds good, let's do it". Vincent is
settled as code, no Blender (the design, line 171): a straw hat and a long smock that hides the legs, as Simon's
figure rides on wheels. Swinging legs in code only if the glide reads as sliding.

**The test** is on the local branch `spike/grass-hand` (one commit over `main`), not pushed. It is a throwaway: no plan, no review,
no tests, and nothing from it is kept without Mark's word. `src/scene/grassSpike.tsx` and four lines in `Street.tsx`.
Live on the Mac's dev server while it runs: `http://192.168.0.148:5190/?street=1&station=0&grass=1`, and
`&grassView=low` for the camera in the grass. Captures, the 1:1 trail crop and a 16 s clip:
`scratch/grass-spike-2026-10-24/` (gitignored).

What it showed, from the captures at station 0 and the low view, desktop and phone:
- The trail is what makes the hand read. The hand paints a 256 × 256 map that fades with τ 2.5 s, and each blade bends
  away by what it reads. The trail showed only once bent blades turned paler, toward the moonlit crest.
- The clip's feeling needs the low camera. At station 0 the grass is a band beside the lane and the trail is small. On
  the phone in portrait it is a thin strip. From the low view (0.042 high, 6° down) the grass fills the lower two
  thirds, as in Jeroen's clip, and the trail crosses the screen.
- At 0.014 high the near grass left gaps, and the ground's long strokes read through as planks. At 0.024 (about thigh
  high on a person) it covers them. The verge is shorter, so the lane's edge is soft.
- 30,000 blades, 120 fps on the M5 Pro at both views. The phone is unmeasured. `&grassN=10000` lightens it.
- Not yet Van Gogh (`vs-painting.png` in the same folder, at 4×): the painting's bushes are fat curved comma strokes
  that fan out from a clump, dark at the centre with pale yellow-green edges. Ours are thin straight spikes in an even
  grey green. A look pass would start there: wider curved strokes in fanned clumps, the street trees' dark-centre,
  lit-edge treatment.
- Not shown by the captures: the hand cursor (screenshots leave out the system cursor), and the phone. The touch path
  (finger down is the hand) is untested and the phone's frame rate unmeasured. The orbit controls are not mounted in
  street mode (`src/scene/DioramaExperience.tsx:292`), so a drag does not turn the camera.

To restart the live test: `git checkout spike/grass-hand && npm run dev -- --host --port 5190`. The Mac's LAN address
may change between sessions: read it from Vite's "Network" line.

**Open for Mark:** his read of the test live, then where the grass lives (beside the street, a meadow portal, or
both). Slice 2's plan (Vincent and the walk) follows his answer. Agents this session: Codex reviews, Fable (the
Consultant tab) when Codex runs low, the worker idle.

## Pickup — 2026-10-24 (end of session): S1b merged and live; slice 2 next (superseded by the afternoon pickup above)

Mark passed S1b's gate ("It does read like a village") and it is merged: PR #20, `b649060`. Codex found nothing at the
head, CI passed, and production is deployed. The street is live behind
`https://starrynight.markma.dev/?street=1&station=0` (stations 0 to 4). A plain visit is unchanged. The record:
`tasks/2026-10-23-street-s1b.md`, Pickup.

**Next: slice 2, Vincent and the walk** (the design `docs/superpowers/specs/2026-10-23-village-street-design.md`,
"Slices", 1 to 2 sessions): the figure on the path, the camera behind him, the scroll wheel and arrow keys, the phone's
automatic walk and its tap, the reduced-motion steps. The lane, its stations and the pale path are S1b's. Start with
the plan, then the two plan reviews (Fable, and the Gemini worker for buildability), then the build.

Carried open from S1b's gate (the record's Pickup has the evidence): the phone reading on a real device (open since S1),
the near-black walls turned from the moon (ambient 0.4), the cottage door behind its thatch (C2), the sparse ground and
the path's near slabs (the ground is slice 3's grass), and the village's craft (below, for after slice 3).

## Pickup — 2026-10-24 (late morning): Mark at S1b's gate, superseded

Mark on the live street: "It does read like a village", "keep the fog for now". On the path, after the Lead's sheet
of Simon's: "Go with your recommendations". Look pass 3 (`1ca5fe3`): a pale lane, 0.12 wide, lift 0.5. Mark: "It has
improvments. Simon's parth and village comes with a cartoon feel and a bit more realistic than us, but maybe when the
whole plan finished our villiage would have the same feelings." Open: his verdict on S1b's gate (merge, slices 2 to 4),
and whether Fable reads pass 3 first. The record: `tasks/2026-10-23-street-s1b.md`, Pickup.

**Noted, not queued (scope rule): the village's craft.** Slices 2 to 4 add Vincent, the walk, the grass and the portal.
None of them changes how a house is made, so they will not by themselves give Simon's solid, slightly realistic
village. What gives his that (`tasks/2026-10-11-simon-lee-study.md`, the village study): modelled detail (door frames,
shutters, steps, eaves, fences and small lamps along the paths), surfaces that read as solid paint rather than long
strokes with gaps, and the grass's dabs breaking the path's edge. Slice 3's grass covers the last one. The first two
would be a slice of their own, in the painting's strokes, not his generic texture (the bar). Mark decides after slice 3.

## Pickup — 2026-10-24 (morning): the street S1b built, gated and reviewed overnight; superseded

Mark, leaving for the night: "finish all the slices and completed all the visual gates and code gates before present to
me". S1b (the village lane) is complete through Task 11 on `feat/street-s1b-lead` at `305aefe`, local, not merged, not
pushed. The Lead's gate G1 to G11 and Fable's two reviews are done (review 1 FIX, fixed; the confirmation read FIX on
C7, fixed). Start with `tasks/2026-10-23-street-s1b.md`, its Pickup section: the live URL, the sheets, and six
decisions parked for Mark (does it read as a village, the moonlight's ambient, the gate's fog, stop 4's p95, the
cottage door, the ground and path within the budget). Slices 2 to 4 wait for his verdict.

## Pickup — 2026-10-23 (evening, superseded): the street S1b plan, both reviews in, the revision next

Slice 1's street failed Mark's gate ("flat and dull", then "cardboard"). The redesign is an invented village lane at
eye level (the design's last section, Mark approved the map). The plan is `tasks/2026-10-23-street-s1b-plan.md`. Mark
approved its direction: "It does and the plan sounds all right." The worker (GAPS) and Fable (REVISE, two P1s) have
reviewed it. Neither review is folded in yet. Start with `tasks/2026-10-23-street-s1b.md`: where we are, both
reports in short, the answers already reached, and the three decisions open for the revision (the cypress's 537,816
triangles against the budget first). Then revise the plan once, commit it locally, and the worker starts Task 0.

## Pickup — 2026-10-23 (afternoon): E4 closed on Mark's word; the village street designed, Mark's approval pending

Mark, 2026-10-23: "It passed. Let's close this slice and move on to the next one." E4 is closed. Before his review the
Lead captured production at the pinned t = 5: the tree's crop is byte-identical to pass 2's frame, so the live site
serves the gated build. The record (`tasks/2026-10-22-cypress-e4.md`, Open) and the Tunables entry carry the pass.
The land roadmap (E1, E2, D1, then E3 and E4 on the cypress) is done.

1. **The next slice is the village street** (decided 2026-10-23, replacing the three spikes below). Mark, on the
   spike question: a path with the camera behind a figure, and a hand in the grass like Jeroen's clip. The Lead's
   throwaway captures (`scratch/explore-2026-10-23/`: the dive at five distances, our village up close beside Simon's)
   showed the village cannot carry a walk and that rebuilding it in place would change the passed home view. Mark
   chose a portal into one street built for walking, Vincent from behind, scroll or arrow keys on a computer, an
   automatic walk with a tap on a phone, and Simon's village as the reference for the look when in doubt. The design:
   `docs/superpowers/specs/2026-10-23-village-street-design.md`. The builder read is done and its nine questions are
   settled as the Lead's calls. The consultant (Fable, the Consultant tab) read it: REVISE, C1–C19, all folded, its
   confirmation read closed C2–C19, and C1's last clause is added as it proposed. The estimate is now 8 to 10
   sessions, and slice 1's gate is where Mark decides whether slices 2 to 4 are built. Next: Mark's approval, then
   the plan for slice 1, the street's look. Slice 1 starts with a fresh phone reading (`?perf=1` on the live site).
   - **Proposed to Mark, the locked acceptance criterion on the camera** (Mark, 2026-10-23: "Lift it for the path").
     Today: "Camera stays within the orbit limits in Tunables (polar + distance; no free-fly or panning); the diorama
     always reads as Starry Night — head-on it is the painting's composition." Proposed (revised 2026-10-24, to cover
     any portal scene and not only the street): "Camera stays within the orbit limits in Tunables (polar + distance;
     no free-fly or panning) while the visitor orbits the diorama. Inside a portal scene (the village street,
     2026-10-23), an authored camera path may leave them: the portal's flight, and the walk along the scene's path.
     The visitor moves the camera only along that path, never off it. The diorama always reads as Starry Night —
     head-on it is the painting's composition." Mark applies it in `CLAUDE.md`.
     Status, 2026-10-24: the street reached `main` behind `?street=1` (PR #20) before this edit, although the S1b plan
     (`tasks/2026-10-23-street-s1b-plan.md:51`) said the edit comes first. Slice 2's walk needs it before it merges.
     Applied, 2026-10-25: Mark said "Apply the camera edit", and the Lead committed the text above as his edit.
   - **Idea for slice 3, not built** (Mark, 2026-10-23: "some flowers that Vincent drew of other drawings perhaps"):
     flowers beside the path with the grass, for the hand to touch. Their shape and brushwork may follow Vincent's own
     Saint-Rémy flowers. Their colours come from The Starry Night's palette, because the bar locks colour to the
     painting. Mark decides at slice 1's gate whether slice 3 is built.
2. **The experiment's verdict** (Gemini 4 Argon for visual work under the Lead's gating) is not given.
3. **Open from E4, not blocking:** the gaps field does nothing visible (keep or remove). The render's marks are thin
   scratches where the painting's bands are 30–60 px, with no dark contour strokes and no yellow-green highlights.
   The painting's pigment tracks and canvas grain stay deferred.
4. **Housekeeping unchanged:** the remote branch `feat/cypress-paint-e4` is Mark's to delete. The `painting.jpg`
   decodes, the flat land gate's masses panel and `test:sky`'s file list are as before.

### The spikes, costed from the code (the Lead, 2026-10-22, moved here 2026-10-23)

The sky is a front arc on a dome of radius 6, about 123° wide, rotated with the camera every frame
(`src/scene/PaintingFlowSky3D.tsx:1145`). Its back is empty. The orbit is held to azimuth −15° to +45°, polar 33° to
93°, distance 3.25 to 5.6, no pan (`src/scene/dioramaContract.ts:77`).

1. **The dive between the ribbons of the great whorl.** The camera travels from the home pose about ten units toward
   the whorl and passes between the strokes. The lock is on rotation only, so position moves freely today. No new
   world. The unknown: whether the ribbons hold up at close range, as they are flat strips on the sphere with a
   painted lane. One afternoon: an authored dolly behind `?dive=1`, five captures at five distances.
2. **The rail into the village street.** An authored camera path from the home pose down to eye height in the
   street, then looking up. A house is 0.3 units tall, so the eye sits near 0.05. The sky stays camera-locked, which
   works for a rail that turns less than the arc's 123°. The unknown: whether E2's ground ribbons and domes read at
   walking scale. One afternoon: a spline, a scrub knob, five captures.
3. **Simon's walk.** A figure on the path, the camera behind, turning freely. It needs a world-space sky (the
   invented back of the dome that the front-arc decision gave up), ground and village at walking scale, and
   collision. Weeks, not an afternoon. The honest spike is a half-afternoon costing: lift the lock, turn 180°,
   capture the void.

Spikes 1 and 2 leave the orbit limits during the path. The limits are a locked acceptance criterion and free-fly is
out of scope. An authored path is not free-fly, but the lock is Mark's to lift. The Lead's recommendation: spike 1
first, then 2. Spike 3 only as the costing capture.

## Pickup — 2026-10-23 (small hours): E4 (the cypress's paint) merged and live (PR #19, `949e4b9`); Mark's live review next (superseded by the pickup above)

Mark closed the session on 2026-10-22: "Take the lead, once Gemini's done, you gated. Then push and merged. I will
review live tomorrow." Done. `main` is at `949e4b9`, deployed. The record is `tasks/2026-10-22-cypress-e4.md` (the
passes, the gate G1–G11, the experiment's findings, the PR). The plan with every disposition is
`tasks/2026-10-22-cypress-e4-plan.md`. Read `tasks/lessons.md` from "E4 (the cypress's paint)".

1. **Mark's taste gate on production**, the tree's still look: the body at 2× in
   `scratch/cypress-e4-2026-10-22/p2/montage-body-2x.png` (the painting, E3, pass 1, pass 2) and the 1:1 tree in
   `p2/montage-tree.png`, then the live site. The question he asked: does it still feel like a jelly? His phone's
   `?perf=1` reading stays open.
2. **Codex's PR review of #19 completed with no findings** (the thumbs-up on `8d006ad`). Nothing to answer. PR #18's
   review (E3) never completed and stays closed on Mark's word; if it ever posts, answer it then.
3. **The experiment's verdict is Mark's.** The record's "The experiment" section: Gemini 4 Argon's code matched the
   plan in every field, its visual reads matched the Lead's on every crop, its tests were not vacuous under eleven
   configuration mutants, and Codex's review found a test gap (emission mutants) and a crop defect it then fixed in
   three commits. Its build report invented constants and numbers. 47 minutes for the build and two passes.
4. **Open from E4:** the gaps field does nothing visible (0.25% of the column): keep as a dial or remove. The
   registered pair after F2 is a strip too narrow for the eye (a per-row mask would widen it). The painting's
   adjacent pigment tracks within a stroke and its canvas grain are deferred.
5. **The explorable question** stays open: Mark has not picked a spike (the dive, the rail, Simon's walk). The
   Lead's costing is in the 2026-10-22 chat only; the readings are under "Proposed to Mark — inside the painting".
6. **Housekeeping:** the worker's worktree and the Lead's gate worktree removed, the servers on 5179, 5181 and 5182
   stopped, the local branch deleted (the remote `feat/cypress-paint-e4` is Mark's to delete). The earlier items
   (the `painting.jpg` decodes, the flat land gate's masses panel, `test:sky`'s file list) are unchanged.

## Pickup — 2026-10-22 (evening): E4 (the cypress's paint) in build on the worker as an experiment; the Lead gates (superseded by the pickup above)

Mark, 2026-10-22 evening: "Can you refine our tree?", the tree "feel like a jelly" (the still look), the spike's
treatment 3 picked, then "I want to test if Gemini 4 Argon is capable of doing visual work. Can you task it and gated
yourself?" and "Take the lead, let me know when's ready." The plan `tasks/2026-10-22-cypress-e4-plan.md` (on `main`,
`6bb58e5`) carries Codex's read (F1–F14) and the worker's buildability read (B1–B7), both folded. The worker
(Antigravity, Gemini 4 Argon, `w4:p5`) builds `feat/cypress-paint-e4` in a worktree in the session's scratchpad,
served on 5181, from `scratch/cypress-e4-2026-10-22/brief-build.md`. The Lead's checkout serves `main` on 5179.

1. The worker's report: `scratch/cypress-e4-2026-10-22/build-report.md`, the evidence under `p1/`–`p4/`.
2. Codex's code review from `brief-code-review.md` (drafted), the worker's fixes, the confirmation read.
3. The Lead's gate (the plan's G11: the suite re-run, every capture opened, the mutants, the record
   `tasks/2026-10-22-cypress-e4.md`), then Mark's taste gate on the captures and on 5181. Push and PR on his word.
4. The spikes question (the dive, the rail, Simon's walk) stays open: Mark has not picked. The costing is in the
   session's chat only; the three readings are under "Proposed to Mark — inside the painting".
5. Housekeeping unchanged from the close pickup below: the `painting.jpg` decodes, the flat land gate's masses
   panel, `test:sky`'s file list.

## Pickup — 2026-10-22 (close of the session): D1 and E3 are on `main` and live; superseded by the evening pickup above

`main` is at `441860b` (PR #18, E3) on top of `8a87ae5` (PR #17, D1), both merged 2026-10-22 and deployed to
starrynight.markma.dev. Mark closed the session: "merge it once the review reads clean. Then well record where we
are so that we can pickup easily next session, I am wrapping up"; he merged #18 himself while Codex's PR review was
still running. Read `tasks/lessons.md` from "D1 (touch the land)" and "E3 (the cypress's medium)" first.

1. **Done 2026-10-22 (evening): Codex's review of PR #18 closed unreviewed.** The review Mark merged over never
   completed (30 hours at "running"). A `@codex review` on the merged PR restarted it on `441860b` (re-request 1 of 2)
   and it was still running with no finding 18 minutes later. Closed on Mark's word ("if it doesn't, let's move on").
   E3 on `main` carries the G10 code review and no PR review. If Codex posts later, answer each thread then: a P0–P2
   gets a follow-up PR from `main`, a P3 an answer in the thread. The record: `tasks/2026-10-22-cypress-e3.md`, Open.
2. **Mark's taste on production**, both slices: the touch (hover, tap and drag on the cypress; hover the bushes;
   `?tune=1` shows the `bend` slider) and the cypress's medium (`scratch/cypress-e3-2026-10-22/e3-compare.png` is the
   painting, E3 and E1 at the render's scale, if the scratch survives; otherwise the record's numbers). His phone's
   `?perf=1` reading stays open for both.
3. **Then the explorable question**: three spikes on captures (a rail into the village street, a dive between the
   ribbons of the great whorl, Simon's walk with a world sky), one afternoon each, Mark picks; see "Direction — the land"
   and "Proposed to Mark — inside the painting" below. Time-of-day presets after that.
4. **Open taste items, not blockers:** E3's relief constants (`CYPRESS_STROKE_BODY`: the paired contrast 3.4 against the
   painting's 11.1, the cap reached); E2's `row-left`/`bushes` overlap, the sparse front-left dome, `orchard-right`
   against the void, the root's rim dabs; D1's hold toggling along the cypress's silhouette edge (by design).
5. **Tooling to keep:** a branch under review is served from its own worktree on its own port (E3 on 5181 while D1 held
   5179 for Mark), Vite started with `--host 127.0.0.1` so the capture tools can dial it; `capture-sky-frames.mjs`
   with `--eval` and pins for injected touches; `check-cypress-colour.ts` with its luminance and chromatic bounds and
   `--control=grey`; `cypress-contrast.sh`. Both dev servers were stopped and both worktrees removed at the close.
6. **Housekeeping:** three decodes of `painting.jpg` (a shared loader); the flat land gate's masses panel (Codex E2 F4)
   before the next land retune; `test:sky` enumerates files, so a new suite must be added to it in the same commit
   (missed twice).

## Pickup — 2026-10-22 (morning): D1 merged (PR #17); E3 rebased onto main and in its PR (superseded by the close pickup above)

Mark, 2026-10-22: "Push and merge D1, then rebase E3 and do the same." D1 is on `main` at `8a87ae5` (PR #17, one
Codex P2 on multi-touch fixed in `8f95fd6`). E3 (`feat/cypress-medium`, the record `tasks/2026-10-22-cypress-e3.md`)
is rebased onto that main, verified at the rebased head, and in its PR. The main checkout serves `main` on 5179; the
E3 worktree in the session's scratchpad serves the branch on 5181 (`git worktree list`; after the session,
`git worktree prune`).

1. E3's PR: read Codex's review, answer every thread, merge on green. Then production carries D1 and E3.
2. Mark's taste gate on production or localhost: the touch (hover, tap, drag on the cypress; the bushes; the `bend`
   slider on `?tune=1`) and the cypress's medium (`scratch/cypress-e3-2026-10-22/e3-compare.png`: the painting, E3
   and E1 at the render's scale). His phone's `?perf=1` reading.
3. E3's open numbers: the paired contrast 3.4 against the painting's 11.1, reported as not met (the painting's
   bristle marks and canvas weave at a scale the ribbons do not carry); the relief constants are a dial
   (`CYPRESS_STROKE_BODY`). Perf re-run quiet: 60 fps at the rig's vsync (p95 17.0), D1's numbers exactly.
4. Then the explorable question's three spikes (the walk; see the direction below), time-of-day presets after.
5. Two dev servers may be running: 5179 (main) and 5181 (E3's worktree). The `main` worktree on 5180 was removed.

## Pickup — 2026-10-22 (small hours): D1 built and gated on `feat/touch-land-d1`, Codex's code review closed MERGE; Mark's taste gate next (superseded by the pickup above)

D1 (touch the land) is built and gated on `feat/touch-land-d1`, local only, nothing pushed. Read
`tasks/2026-10-20-touch-land-d1.md` (the record: what was built, the deviations, the gate G1–G8) and the plan's
rebase and read sections. Read `tasks/lessons.md` from "D1 (touch the land)".

1. Codex's code review (G9) answered: REVISE on `375d825` (F1–F6 P2, F7–F8 P3), all eight fixed in `9136dc4` with
   headed regressions, 178 tests; the dispositions in the plan's Review section and the record's G9 row; the
   confirmation read closed F1–F8 and found F9 (the masked step's fall-through), fixed in `6fb8d8d`; the second,
   last confirmation read: MERGE. G9 closed. The head is `6fb8d8d` plus docs.
2. Mark's taste gate on localhost (the dev server on 5179 serves the branch; `?tune=1` shows the `bend` slider on the
   touch route): a hover and a tap on the cypress, a drag across it, a hover on the bushes; the push, the dip, the
   swing. His phone `?perf=1` reading.
3. Push and PR on his word, the Codex PR review, merge. Then the explorable question's three spikes (see the
   direction below), time-of-day presets after.
4. Two dev servers were left running: the branch on 5179 and a `main` worktree on 5180 (the session scratchpad's
   `main-wt`, for G3/G4's byte-identity rows). `git worktree prune` after removing it.

## Pickup — 2026-10-21 (late night): PR #16 merged, E2 live on `main`; D1 (touch the land) is next (superseded by the pickup above)

E2 (the land) is on `main` at `7bd583e` and live at starrynight.markma.dev. The record is `tasks/2026-10-21-land-e2.md`
(the gate table, Codex's two reviews and the PR review, what is open). Read `tasks/lessons.md` from "E2 (the land),
the domes' second pass". Mark's word on the taste gate, 2026-10-21: "This looks total upgrade!"

1. **D1, touch the land** (`tasks/2026-10-20-touch-land-d1-plan.md`, reviewed by Codex 2026-10-21, banked). First the
   rebase: the plan targets the village's four foliage rows (`village-foliage`), which E2 retired for the stroked
   domes (`land-trees-strokes`, `land-trees-solid`) and the ground (`land-ground`), and the cypress it targets is
   E1's (`cypressStrokes.ts`, per-ribbon attributes). Its model, store, hook and knob are independent of the
   cladding, so the rebase retargets the bend's attribute and the meshes, then a fresh Codex read of the delta
   before the build. One session. Mark's one choice in it: `landMasksSky` (a hand on the tree moves the tree and no
   longer surges the sky behind it; the Lead recommends true).
2. Before the next land retune, not before D1: the flat gate's masses panel (Codex E2 F4, deferred with evidence).
3. Open taste items from E2, Mark's calls when he next looks: `row-left` and `bushes` overlap in x at the same z;
   `row-front`'s leftmost dome is sparse (143 foliage px); `orchard-right` stands against the void at the island's
   right edge; the root's rim dabs at the home view; his phone's `?perf=1` reading.
4. Then the explorable question (a rail into the street, a dive into the sky's brushwork, Simon's walk with a world
   sky), three spikes on captures, see "Proposed to Mark — inside the painting". Mark, 2026-10-21, asked whether the
   walk is still coming ("a 3D landing site like how Simon Lee does", "I meant the walk, explorable question"): it
   is the next question after D1, not ruled out; the two locks (free-fly, the orbit limits) are his to lift for an
   authored rail, and the camera-locked sky is the technical gap the spikes must cost. Time-of-day presets after that.
5. Housekeeping: three decodes of `painting.jpg` (a shared loader); `--perf` as a bare argument once created a
   `--perf/` folder (deleted 2026-10-21), the capture script could reject it.
6. The worker (Gemini, `w4:p5`) was at 99% of its 5-hour window at 20:20 Brisbane on 2026-10-21; Codex (`w4:p4`)
   had 91% left. The dev server was left running on 5179 for Mark's review.

## Pickup — 2026-10-21 (night): E2 gated on `feat/land-e2`, Codex's code review closed MERGE; Mark's taste gate next (superseded by the late-night pickup above)

E2 (the land) is built and gated on `feat/land-e2`, local only, nothing pushed. Read `tasks/2026-10-21-land-e2.md`
(the record: the retune table, the measured tables, the gate G1–G11, the deviations, what is open). Read
`tasks/lessons.md` from "E2 (the land), the domes' second pass".

1. Done tonight: capture 4's one defect (a dome's bare top against the sky) traced to two frames for one surface
   (the domes on the terrain under their own centres, the strips from the mass centre's base) and fixed in one line,
   `dd260b0`, red test first. Capture 5 looked at and measured: the disc gone, the colour gate PASS, 60 fps at the
   rig's vsync, `check:reduced` and `check:viewport` PASS, G9 measured at 0 differing pixels on a land-only crop.
   Record `98cd73e`. The domes' retune cap is reached (the height cap, the frame): any further dome change is
   Mark's call.
2. Codex's code review (G11) closed: REVISE on `dd260b0` (F1–F4 P2, F5–F6 P3), the fixes in `b3b2bc6` (the domes
   wound outward: the far shell had rendered since capture 3; the clamped strip points settled on the dome–terrain
   contact; the painting's load failure releases the land latch; the heading test's tautology; the unreachable cycle
   guard removed), F4 (the flat gate without the masses' strips) deferred with evidence, the confirmation read
   MERGE (`scratch/land-e2-2026-10-21/confirmation-report.md`), its F6 note taken in the next commit. Capture 6
   after the fixes reads as capture 5 and passes the colour gate. The dispositions: the plan's Review section,
   "The code review (G11)"; the record's G11 row.
3. Mark's taste gate on captures, in this order: `scratch/land-e2-2026-10-21/c6-land.png` (the island at the home
   view), `c4-vs-c5-dome-2x.png` (the dome fix), `c5-vs-c6-dome-2x.png` (the review's winding fix), `c6-orchard-1to1.png`,
   `c6-bushes-1to1.png`, `c6-front-row-1to1.png`, `c6-lookdown-50.png`, `c6-orbit-50.png`, `c6-mobile-70.png`. His
   phone `?perf=1` reading stays open.
4. Push and PR on his word (`push-only-after-mark-reviews`), then the Codex PR review, then D1 (touch the land,
   `tasks/2026-10-20-touch-land-d1-plan.md`).
5. Open, from the record: `row-left` and `bushes` overlap in x at the same z; `row-front`'s leftmost dome is sparse
   (143 foliage px); the root's rim dabs at the home view (pre-existing); three decodes of `painting.jpg`.
6. The worker (Gemini, `w4:p5`) was at 99.3% of its 5-hour window at 20:20 Brisbane; it resets about 01:15. Route
   mechanical work elsewhere until then (`scout` or `builder`, see `agent-workflow`).

## Pickup — 2026-10-21 evening (superseded by the night pickup above)

E2 (the land) is built on `feat/land-e2`, local only, nothing pushed. Read `tasks/2026-10-21-land-e2.md` (the record,
with the gate table and what is open) and the plan's Review section. The worker was running `brief-capture-4.md`
(the capture, `alive=0`, perf, `check:reduced`, `check:viewport`) when the day session closed; its report is
`scratch/land-e2-2026-10-21/capture-4-report.md` if it landed.

1. Capture 4 is looked at and measured (the record's tables): the colour gate passes, 60 fps at vsync, both checks
   pass. One defect open: a dome's dark underpaint shows against the sky where its top and back carry no strips
   (`scratch/land-e2-2026-10-21/c4-orchard-1to1.png`). The domes' second pass: the underpaint as the mass's median
   foliage colour and more strips on the back and top (or a flatter `rz`), a capture through the worker
   (`brief-capture-4.md` as the model), the colour gate again. Then the `alive=0` diff on a land-only crop.
2. `npm run build`, `npm run lint` (the whole tree, as CI), `npm run test:sky`.
3. Commit any fix, then write Codex's code-review brief (model: `scratch/cypress-e1-2026-10-21/brief-code-review.md`),
   dispatch to `w4:p4`, answer the findings, record them in the plan's Review section and the record.
4. Mark's taste gate on captures (the home, the look-down, the orbit, the mobile), then push and PR on his word.
5. Retune cap: the ground used three passes (1: the map and the fill, 2: the low-pass, 3: count and width); the
   domes one (the height cap). One pass each remains before stopping to ask.


Durable cross-session plan. `tasks/lessons.md` holds the memory; this holds the intent.
Locked sections in CLAUDE.md are Mark's. Proposed changes to them go under "Proposed to Mark"
below — never edited in place.

> **The record lives in the repo** (Mark, 2026-10-16: "put the doc in the repo is better than write in our file
> vault"). Write status, records and lessons here, not in the Obsidian vault at `~/File Vault/The Starry-night`.
> Its `Status` note was last brought up to date on 2026-10-16 and is no longer maintained. At session start,
> read `tasks/lessons.md`.

## Pickup — 2026-10-21 (night): PR #15 merged, E1 live on `main`; E2 (the land) is next

**Current agent entry point:** this section, then "Direction — the land" below (the roadmap: E2 then D1), then
`tasks/2026-10-21-cypress-e1.md` (E1's record, for the gates and tools E2 reuses). Read `tasks/lessons.md` from
"E1 (the cypress), the plan" down.

**Where things are.**
- `main` at `b54fd68` (PR #15, merged 2026-10-21 03:27 UTC on Mark's word, "Can you merge for me"), Vercel
  deploying production from it. Codex's PR review passed on `dc3ef9f` with no findings; the later commits were
  the record and a test-file lint fix CI caught (`eslint .`, which the local `eslint src scripts` had not covered:
  run `npm run lint` before pushing). The remote branch `feat/cypress-e1` waits for Mark to delete, with
  `feat/arrival-c`, `fix/moving-first-paint`, `feat/flags-on`.
- E1 shipped: the cypress as streamline ribbons at the painting's stroke width on the lobe volumes, the whole-tree
  mask and field from the 3840 scan, the sky's stroke body opaque with an alpha test, the gates in `scripts/`
  (`cypress-silhouette.ts`, `check-cypress-colour.ts`, `flat-cypress-gate.ts`, `lib/silhouette.ts`). The numbers:
  silhouette IoU 0.817 (was 0.787), ΔE 1.05 / 1.22 / 3.05, the build 95 ms, the Mac at the cap.
- This record sits on the local `docs/after-pr-15`; it rides the next code PR. Nothing running: the dev server
  stopped; Herdr `w4:p4` (Codex) and `w4:p5` (Gemini) idle.
- Open, Mark's: the bristle texture (local contrast 0.93 against the painting's 6.45; a dial after the retune
  cap), his iPhone's `?perf=1` on production (the frame rate and the tree's build time), B's surges reading as
  fog at a close orbit (the `surge` knob), the DPR cap (Tunables 2, code 1.5), C's taste calls.

- [ ] **E2, the land**: the plan file first (`tasks/<date>-land-e2-plan.md`), the painting's crops beside ours
  (the island's top, the olive trees, the bushes; `tasks/2026-10-05-village-foliage.md` is the study), the
  derivation reusing `treeComponent` and the field pipeline, a fresh Codex review, the build, the gate at 1:1.
- [ ] **D1, touch**, after E2: revise the plan per its review (the vertex transform, the concatenation and the
  draped vertex order are in place), rebase on the new tree, build.

## Pickup — 2026-10-21 (evening): E1 built and gated on `feat/cypress-e1`; Mark's taste gate next (superseded by the night pickup above)

**Current agent entry point:** this section, then `tasks/2026-10-21-cypress-e1.md` (the record and the gate), then
the plan `tasks/2026-10-21-cypress-e1-plan.md` (Codex's reads and every disposition). Read `tasks/lessons.md` from
"E1 (the cypress), the plan" down.

**Where things are.**
- `feat/cypress-e1` (pushed, PR #15) from `feat/touch-land`: the derivation at 3840 (`2b4c966`), the lobes
  (`465b68c`), the ribbons and gates (`ebee43f`), the flicker band (`0adcf25`), four retunes (`066c88d`,
  `0c341a8`, `3ae5005`), the docs. 142 tests, type-check and lint clean. The retune cap is reached.
- The gate: every locked criterion passes; the silhouette IoU 0.822 against `main`'s 0.787; the colour ΔE 0.9 /
  1.4 / 3.2; the build 34 ms; both guards PASS. One of the plan's own bars is under: the fine texture (local
  contrast 1.06 against the painting's 6.45) after the stipple's removal. Mark's eye decides between retune 4
  (broad, gentle strokes) and more bristle contrast.
- Captures for Mark: `scratch/cypress-e1-2026-10-21/e1-compare.jpg` (the painting | E1 | before),
  `r4-tree.png`, `r4-body-1to1.png`, `r4-orbit-tree.png`, `output/playwright/e1-r4-2026-10-21/`.
- Codex's code review (G12): REVISE with ten findings, then eight closed and one opened, then MERGE on the
  full batches; every disposition in the record. The strokes are seven columns across at a 0.010 lift, opaque
  with an alpha test; the gates measure against an expected area the render cannot move. The flow-failure
  capture (G11b) passes.
- Nothing running once the panes report. Herdr `w4:p4` (Codex) and `w4:p5` (Gemini) idle. The dev server
  Mark was given (`http://10.100.125.107:5179/`) serves the working tree while it runs.

- [ ] **Mark's taste gate** on the captures and on `?perf=1` on his iPhone (the frame rate and the build time).
  Mark, 2026-10-21 evening, on the first comparison: "Looks closer".
- [ ] **B's surges at a close orbit** (Mark, 2026-10-21 evening, a screenshot of the right-hand sky): the hover
  lifts read as pale fog patches along the strokes at that angle and zoom; confirmed as B by their fade. Mark's
  call on the `surge` knob (shipped 1) or on the lift's look; not E1's.
- [x] Pushed and PR #15 opened on Mark's word (2026-10-21 evening, "push it and open the PR"); `@codex review`
  requested once; the review completed on `dc3ef9f` with no findings (the summary's state `has_any_findings:
  false`, one bot entry in the timeline). The later commits on the PR are docs only.
- [ ] **Merge** is Mark's call (it deploys to production).
- [ ] **E2, the land**, after E1 merges.
- [ ] **D1, touch**, after E2: revise the plan per its review (the vertex transform and the draped vertex order
  are in place), rebase on the new tree, build.

## Pickup — 2026-10-21 (morning): the land roadmap decided (E1 the cypress first); D1's plan reviewed and banked (superseded by the evening pickup above)

**Current agent entry point:** this section, then "Direction — the land" below (the roadmap, Mark's words, the
order), then `tasks/2026-10-20-touch-land-d1-plan.md` (D1's plan and Codex's review, banked for later). Read
`tasks/lessons.md` from "C (arrival)" down. The next task is **E1's plan file**: the cypress.

**Where things are.**
- `main` at `e6567e3`, production deployed 2026-10-20 13:45 UTC: moving strokes the default sky, A, B and C on for
  every visitor (`?alive=0`, `?touch=0`, `?arrival=0` opt out), the opening once per session, `?perf=1` on screen.
  Mark's iPhone: 60 fps with everything on. Three merged remote branches wait for Mark to delete: `feat/arrival-c`,
  `fix/moving-first-paint`, `feat/flags-on`.
- **The roadmap** (Mark, 2026-10-21, after the three-way comparison in `scratch/cypress-compare-2026-10-20/triptych.jpg`,
  ours | the painting | Simon Lee's): E1 the cypress (lobes re-derived for the silhouette, the cladding rebuilt as
  thick curling ribbons from its own flow field, tongues breaking the outline), E2 the land (the island's top in the
  painting's ground strokes, stroked olive trees and bushes from the painting's masses), then D1 touch on the new
  land. Each: plan file, the painting's crops beside ours, a fresh review, the build, captures at 1:1, Mark's eye.
- **D1's plan** is written and reviewed (Codex, REVISE: seven P1s, three P2s, every finding recorded with its
  disposition in the plan's Review section). Nothing of D1 is built. When D1 starts, the revision is its first task,
  on E1's tree.
- This record, the roadmap and D1's plan sit on the local branch `feat/touch-land` (docs only, not pushed; the name
  is from before the roadmap). Start E1 from it (`git switch -c feat/cypress-e1 feat/touch-land`), so the docs ride
  up with E1's PR. Nothing running: no servers, no worktrees, Herdr panes `w4:p4` (Codex) and `w4:p5` idle.
- Open, none urgent: the DPR cap (Tunables 2, code 1.5: the Lead recommends 1.5 and a Tunables correction); C's
  taste calls (the durations, French under the English, the title during the opening, a hint).

- [ ] **E1, the cypress**: the plan file first (`tasks/<date>-cypress-e1-plan.md`), with 1:1 crops of the painting's
  cypress beside ours (the triptych is the start), the lobe re-derivation and the streamline cladding; a fresh
  review; then the build and the gate. Before writing it, read `tasks/2026-07-22-cypress-review-findings.md` (the
  July gate and its traps), `src/scene/cypressLobes.ts`, `cypressLobeGeometry.ts`, `cypressLobeStrokes.ts`,
  `BrushCypress.tsx`, `scripts/derive-cypress.ts` (the flow asset's derivation) and the sky's tracer
  (`streamlineGeometry.ts`, `flowField.ts`).
- [ ] **E2, the land**, after E1.
- [ ] **D1, touch**, after E2: revise the plan per the review, rebase on the new tree, build.

## Pickup — 2026-10-20 (late night): everything on for every visitor; D (touch the land) proposed (superseded by the 2026-10-21 pickup above)

**Current agent entry point:** this section, then "Proposed to Mark" below (D, from Mark's grass-video idea, and the
inside-the-painting readings), `tasks/2026-10-20-arrival-c.md` for C. Read `tasks/lessons.md` from "C (arrival)" down.

**Where things are.**
- `main` at `e6567e3`, production deployed 2026-10-20 13:45 UTC. Three PRs merged tonight on Mark's word: #12 (C
  behind its flag, moving strokes the default), #13 (the moving default's first paint: the wash and the halos wait
  with the strokes; a failed source image releases the wait), #14 (A, B and C on for every visitor, `?alive=0`,
  `?touch=0`, `?arrival=0` to opt out; the opening once per session, `?arrival=1` always; `?perf=1` on screen; the
  guard and capture scripts build their URLs with `URL` and opt out of the opening). Every Codex thread answered:
  one P2 on #12, one on #13, three on #14 (all scripts), each fixed and verified.
- **The phone, measured:** Mark's iPhone on #14's preview with everything on, 60 fps at 440 × 755 CSS, DPR 3 (the
  1.5 cap applies). The locked bar is 30. The flag decision is closed.
- Remote branches merged and waiting for Mark to delete: `feat/arrival-c`, `fix/moving-first-paint`, `feat/flags-on`.
  This record sits on the local `docs/after-pr-14`; it rides the next code PR. Nothing running.
- Mark's next direction (2026-10-20, with Jeroen van Welsenes' "touch grass" clip in `~/Downloads/videos/grass/`):
  make the painting explorable like Simon Lee's, learn from his village, add grass or trees in the village that can
  be touched through the screen. The Lead's reading and the proposed slice D are under "Proposed to Mark" below.

- [ ] **D, touch the land** (proposed, below): Mark's word, then the plan file, a fresh review, the build.
- [ ] **The DPR cap** (Tunables 2, code 1.5): Mark's call; the Lead's recommendation is 1.5 and a Tunables correction.
- [ ] **C's taste calls**, if any: the durations, French under the English, the title during the opening, a hint.

### Direction — the land (Mark, 2026-10-21): E1 the cypress, E2 the ground and the trees, then D1 touch

Mark, 2026-10-21, on the three-way comparison (`scratch/cypress-compare-2026-10-20/triptych.jpg`: ours, the
painting, Simon Lee's): "we need to redo the cypress ... silhouette can be improved too"; on the village: Simon
"not only made extra trees but also some grass as well, which makes the village more live and real than us. Ours
just some blocks to be honest." The Lead's reading, agreed: the cypress's silhouette is right in kind (the row
table) and wrong in degree (too thin through the middle, the left tongue too low, one straight spire for a tip),
and its medium is wrong (the painting's pixels stretched over a volume with 48 thin ribbons on top: a cut-out, not
strokes). The village is eight painted boxes and four hedge rows on bare grey rock; the painting's sits in rolling
blue-green ground strokes between dark olive trees. Simon's tree is a good 3D conifer and not Van Gogh's flame; his
lesson is volume from many small strokes and ground cover, not his tree.

The order, decided:

1. **E1, the cypress.** Keep the lobe volume and the row table; re-derive the lobes with less simplification so
   the main flame carries its width and the left tongue rises where the painting's does; rebuild the cladding from
   streamlines traced in the cypress's own flow field (`public/reference/cypress-flow.png`, the sky's tracer and
   ribbon packer) as thick, tapered, curling ribbons coloured from the painting with real relief; let the outer
   ribbons overshoot the outline so the tongues break it; darken the solid to a shadow between strokes; keep back
   strokes for the orbit. The flicker and D1's bend carry over as per-ribbon attributes. About two sessions.
   Plan file first, the painting's crops beside ours, a fresh review, then the build; the gate compares crops at
   1:1 and Mark's eye decides.
2. **E2, the land.** The island's top painted in the painting's ground strokes instead of grey rock; stroked olive
   trees and bushes grown from the painting's own masses (`tasks/2026-10-05-village-foliage.md` is the study),
   placed where the painting puts them and filling behind in the same manner; the hills as the backdrop they are.
   Two to three sessions. Same loop.
3. **D1, touch the land**, on the new tree and the new ground: the strokes bend from the pointer and spring back.
   Its plan (`tasks/2026-10-20-touch-land-d1-plan.md`, reviewed by Codex 2026-10-21) is banked and gets rebased
   onto E1's tree; its model, store, hook and knob are independent of the cladding. One session.

Then the explorable question (a rail into the street, a dive into the sky's brushwork, Simon's walk with a world
sky), on captures, with real ground and trees to walk among. Time-of-day presets are now a legitimate later slice
(the pre-release gate has passed). Not before E1–D1.

## Pickup — 2026-10-20 (night): PR #12 merged, C live behind its flag, moving strokes the default sky (superseded by the late-night pickup above)

**Current agent entry point:** this section, then `tasks/2026-10-20-arrival-c.md` (C's record, gate and reviews) and
the "Proposed to Mark" section below (the inside-the-painting idea, next). Read `tasks/lessons.md` from "C (arrival)"
down.

**Where things are.**
- `main` at `18fafe7`: PR #12 merged 2026-10-20 13:00 UTC on Mark's word ("merge it"). Mark saw C on the local
  preview first ("Looks good!"). It carries C behind `?arrival=1`, moving strokes as the default sky (`?sky=light`
  for painted light; Mark's call after C's gate), the painted-light fallback when the moving-sky worker fails
  (Codex's one P2 on the PR, fixed in `cb6d23c`, answered), the capture tool's `--arrival-times` and `--screenshot`,
  B's closure, the branch tidy-up and all of C's records. Codex re-reviewed the head `0cfa1e6` by itself and found
  nothing. Every thread answered.
- Codex reviewed C three times in the pane before the PR (plan REVISE F1–F10, code FIX F11–F15, re-review MERGE)
  and once on GitHub. All dispositions are in the plan file and the record.
- This record sits on the local branch `docs/after-pr-12` (not pushed; it rides the next code PR). Local
  `docs/after-pr-11` and `feat/arrival-c` are merged; remote `feat/arrival-c` waits for Mark to delete.
- Nothing running: the dev server and both previews stopped, the `main` worktree removed. The ignored
  `scratch/arrival-c-2026-10-20/` holds the spike, the gate's frames and the three Codex reports.

- [x] **PR #12 merged** (`18fafe7`).
- [ ] **The first paint on the moving default** (Mark, live, 2026-10-20: "it reads painted light for a sec then move
  to moving strokes"): opened on the moving sky, the wash (the painting's own sky) and the halos drew before the
  strokes landed. Fixed on `fix/moving-first-paint`: both wait with the strokes, so the sky is the gradient alone
  and then arrives whole. Proven with the worker delayed 3 s (the pending frame shows no painting) and aborted (the
  painted-light fallback holds); after landing byte-identical to the merged build; `?sky=light` to `main`. PR #13.
  Codex's one P2 on it: a failed source image (the loader had no error path) would have left a bare gradient for
  ever; fixed, the loader reports into the same latch, proven with the image aborted (the old fallback shows).
- [ ] **The flag decision**: `alive`, `touch` and now `arrival` on for every visitor, or a choice. The phone's frame
  rate on the moving sky (now the default) is unmeasured; the locked bar is 30 fps on a mid-tier phone.
- [ ] **The DPR cap** (Tunables 2, code 1.5): Mark's call.
- [ ] **Inside the painting** (Mark's idea from Simon Lee's walk mode): the study and the three spikes, "Proposed to
  Mark" below. Plan file first, fresh review, then the spikes.
- [ ] **C's taste calls**, if Mark wants any: the durations, French under the English, the title during the
  opening, a "tap to continue" hint, once per session.

## Pickup — 2026-10-20 (late): C built and gated on `feat/arrival-c`; Mark's feel, Codex's code review, then the push (superseded by the night pickup above)

**Current agent entry point:** this section, then `tasks/2026-10-20-arrival-c.md` (C's record and gate) and
`tasks/2026-10-20-arrival-c-plan.md` (the reviewed plan). Read `tasks/lessons.md` from "C (arrival)" down.

**Where things are.**
- Branch `feat/arrival-c` (local, from `docs/after-pr-11`): the plan, its revision on Codex's review, and three code
  commits (`3e87d9a`, `55cd955`, `26cfe3d`), plus the record. Not pushed (Mark reviews first).
- The gate is green through G8 (`tasks/2026-10-20-arrival-c.md`): 141 tests, the diorama route's flag-off variants
  byte-identical to `main` on 18 frames, the end state byte-identical on 12 (re-run after the fixes), the guards
  PASS, the skips, the long frame, the preference cycles and the frame rate checked by hand. Codex's code review
  found three P1s and two P2s (F11–F15), fixed in `a44df55` and confirmed closed by a bounded re-review: MERGE.
- Servers left running for Mark's look: the production build of the branch on `http://127.0.0.1:5180/` (the
  preview URL is `?arrival=1`), `main`'s build on 5181 (worktree `scratch/arrival-c-2026-10-20/wt-main`), the dev
  server on 5179. Pid files in `scratch/arrival-c-2026-10-20/`.
- Mark's inside-the-painting idea is queued after C (the "Proposed to Mark" section below).

- [ ] **Mark's feel on C** on the local preview, both skies, with and without `alive=1&touch=1`. The taste calls are
  listed under "Open for Mark" in the record.
- [x] **Codex's code review (G8)**: FIX, then MERGE on the re-review; the dispositions are in the record.
- [x] **The default sky is moving strokes** (Mark, 2026-10-20, after "Looks good!" on C): `src/App.tsx`, `?sky=light`
  for painted light. Proven: the new default byte-identical to `main`'s `?sky=moving` (2 frames), `?sky=light`
  byte-identical to `main`'s default (4 frames), `check:reduced` PASS (`scratch/arrival-c-2026-10-20/sky-default/`).
  Rides C's PR, outside C's flag. The phone's frame rate on the moving sky is still unmeasured.
- [ ] **Pushed and PR opened** on Mark's "Looks good!"; the docs branch `docs/after-pr-11` is its base, so it rides up.
  Read Codex's review from the timeline before the merge; the merge is Mark's word.
- [x] **The flag decision** (Mark, 2026-10-20: "go for your recommendation"): `alive`, `touch` and `arrival` on for
  every visitor, PR #14 (`feat/flags-on`), the opening once per session, `?perf=1` on screen. **The phone, measured
  at last** on PR #14's preview, everything on: Mark's iPhone, 60 fps at 440 × 755 CSS, DPR 3 (the 1.5 cap applies),
  twice the locked 30. Codex's one P2 on the PR (the viewport guard's URL built by appending `?`, losing a base's
  own query) fixed and answered.
- [ ] **The DPR cap** (Tunables 2, code 1.5): Mark's call; the Lead's recommendation is to keep 1.5 and correct
  Tunables.

## Pickup — 2026-10-20: B closed on Mark's word; C (arrival) is next (superseded by the late pickup above)

**Current agent entry point:** this section, then the 2026-10-16 pickup below, then the late-night pickup below
that (C's brief). Read `tasks/lessons.md` from "B (touch)" down.

**B is closed.** Mark, 2026-10-20: "skip the iphone test, I want to close current slice and move on to the next".
B stands as merged in PR #11 (`5bbe243`): the kick follows the wind, painted light's tap light at × 1.8, the
`surge` knob at 1. Retune passes used: 1 of 4. Nothing changed in the code.
- The phone's frame rate is waived for closing B, not measured. The locked 30 fps on a mid-tier phone is still
  unmeasured for `alive` and `touch` with both skies. It matters only when a flag goes on for visitors, so it
  belongs to the flag decision. Mark's call there.
- B's open choices stand as built: on touch a drag both orbits and trails, and a tap over the cypress or the
  village surges the sky behind it. Each is one constant or one mask away if Mark wants it changed later.
- Still open, unchanged: the flag decision, the DPR cap (Tunables 2 on desktop, code 1.5 at
  `DioramaExperience.tsx:166`), the impasto light from A.
- Branches tidied (Mark, 2026-10-20): `fix/touch-codex-findings` and `claude/confident-bohr-1y7p2u` deleted, local
  and remote, both fully in `main`. Left: `main`, `record/2d-streamline-flow` (the 2D-era bookmark, kept on
  purpose) and the local `docs/after-pr-11`.

- [x] **B closed** (Mark, 2026-10-20). Phone frame rate waived.
- [ ] **C, arrival:** behind its own flag, so it does not wait on the flag decision. Plan file first, fresh
  review, then the build (the late-night pickup below).
- [ ] **The flag decision**, the DPR cap: Mark's, when he wants them.

### Proposed to Mark — inside the painting, after C (Mark, 2026-10-20)

Mark, on Simon Lee's teaser (`~/Downloads/videos/Simon Lee Van Gor/`, the 82 s video, 1:04–1:12: a walk mode in
Wheat Field with Cypresses, a small figure on the path, the camera behind it, the wheat swaying): "when I look into
the painting I also imagine what it would look like inside the paints. I want to explore how the best we can do this
in starry night painting." Queued after C. Not built. What it runs into, so the study starts honest:

- **The sky is camera-locked** (`skyRoot.quaternion = camera.quaternion × homeInverse`). From inside the village,
  turning the view would turn the sky with it. A walk needs a world-space sky, which the 2026-07 front-arc decision
  gave up because the painting cannot supply the back of the dome (`dioramaContract.ts`, `frontArcOnlyForThisSlice`).
- **Free-fly is locked out** and the orbit limits are a locked criterion. A walk or a dive is a camera outside
  them. Mark can lift the lock for an authored path (a rail, no free-fly), which keeps the composition promise.
- **Three readings to spike,** one afternoon each, captures to Mark: (1) a rail down into the village street,
  looking up at the sky, the dome unlocked only while inside; (2) a dive into the sky's brushwork, the camera
  passing between the ribbons of the great whorl (the strokes are 3D meshes on the dome, so this needs no new
  world); (3) Simon's shape, a figure on the ground and the camera behind, which needs a world sky, ground and a
  village at walking scale, the largest build by far. The study names what each costs against the painting.

## Pickup — 2026-10-16 (Mac session, late): PR #11 merged; the flag decision, then C (superseded by the 2026-10-20 pickup above)

**Then the agent entry point:** this section, then the Mac and painted-light sections at the end of
`tasks/2026-10-13-touch-b.md`, then the late-night pickup below (C's brief). Read `tasks/lessons.md` from
"The Mac session, 2026-10-16" down.

**Where things are.**
- `main` at `5bbe243`: PR #11 merged 2026-10-16 14:27 UTC on Mark's word ("Yes, merge it"). Both flags stay off
  by default, so visitors see no change. It carries both fixes for Codex's late P2s on PR #10 (`bec5480`), painted
  light's tap light × 1.8 (`0fa7105`, Mark's first feel note), `capture-sky-frames.mjs --eval` (`1ae95ee`), and
  Codex's one P2 on PR #11, fixed in `9b7115b` (the clock is pinned in the same evaluation as `--eval`).
- Every Codex thread is answered: PR #10's two, PR #11's one. Codex re-reviewed the merged head `5e8367a` on its
  own (trigger: new commits) and found nothing.
- This record sits on the local branch `docs/after-pr-11` (not pushed). It goes up with the next code PR: start
  the next code branch from it, or merge it in.
- Session ended 2026-10-17 early (Brisbane) on Mark's "record where we at, I am wrapping it". Nothing running:
  no dev or preview servers, no extra worktrees, Herdr panes `w4:p4` (Fable, reviewer) and `w4:p5` (Antigravity,
  worker) idle. The ignored `scratch/mac-session-2026-10-16/` (335 MB) holds the night's frames, crops, briefs,
  the worker's and reviewer's reports, and the measuring tools `lead/lift-measure.ts` and `lead/diffpix.ts`.
  Clear the frames when space matters. Keep the reports until C starts.
- Remote branches left for Mark to delete: `fix/touch-codex-findings` (merged) and `claude/confident-bohr-1y7p2u`
  (its last commit `d0852d3` reached `main` through #11).

- [x] **Pushed and merged** (PR #11, `5bbe243`).
- [ ] **Mark's feel notes on B** on the live site (`?touch=1`, both skies): the kick follows the wind, strong in a
  gust and faint in a lull; painted light's tap light at × 1.8. Retune passes used: 1 of 4.
- [ ] **The phone's frame rate** on a real phone (`?perf=1&touch=1`, both skies).
- [ ] **The flag decision** after those: `alive` and `touch` on for every visitor, or a choice.
- [ ] **The DPR cap:** Tunables says 2 on desktop, the code caps 1.5 (`DioramaExperience.tsx:166`). Mark's call.
- [ ] **C, arrival:** unchanged, see the late-night pickup below. Plan file first, fresh review, then the build.
  Recommended order (Lead, 2026-10-16): the flag decision first, because C opens into whichever sky visitors see.

## Pickup — 2026-10-13 (late night): A and B are both on `main` behind their flags; C (arrival) is first (superseded by the Mac session above)

**Then the agent entry point, cloud or Mac:** this section, then the night pickup below (B's detail and the tooling),
`tasks/2026-10-13-touch-b.md` (B's record and gate), `tasks/2026-10-13-touch-b-plan.md` (the shape a plan takes),
`tasks/2026-10-13-alive-a2.md` and `tasks/2026-10-13-alive-a.md` (A's records). Read `tasks/lessons.md` from
"B (touch)" down.

**Where things are.**
- `main` is at `3f1f87c`: PR #10 merged 2026-10-13 12:53 UTC on Mark's word ("Merge it"); Vercel production
  `dpl_1Xi4QeubausAyUZFbKp6WaZpHunv` READY at it. All of A behind `?alive=1` and B behind `?touch=1` (implies
  `alive`), Mark's knob picks shipped (`surge` 1, untuned). Both flags OFF by default: visitors see today's piece,
  byte-identical to before A. Codex's one finding on PR #10 (P2: the tuner's "set as default" sent the hidden
  `surge` knob on an A-only route, so a value restored from local storage could overwrite the shipped one) was
  fixed in `9dd2f2d` (`aliveSavePayload`, T26, 129 tests) before the merge; Codex's re-review of that commit was
  still running when the merge landed.
- **Branch `claude/confident-bohr-1y7p2u`** restarted from `3f1f87c`; this record is its first commit. It stays
  the working branch (the cloud session's git access cannot delete branches, HTTP 403). PR #10's preview alias
  (`https://starry-night-git-claude-confide-0e1ba3-markpukete-webs-projects.vercel.app/`) follows the branch, and
  production now serves the same code: `?alive=1`, `?touch=1`, `?touch=1&tune=1` (the `surge` slider beside A's six).
- **Still owed at the Mac** (a real GPU; the cloud cannot): AE 0 of the default route against the pre-A build at
  pinned t; `?perf=1` with everything on (`?touch=1`, shipped knobs), desktop and a phone, against the locked
  60 / 30 fps; and Mark's feel notes on B (the merge was not the feel gate): the kick's settle (settling or
  stall), a drag on touch trailing as well as orbiting, a tap over the cypress or village surging the sky behind.
  Any retune rides a later PR; the knobs are live on `?tune=1`.
- **Tooling** as in the night pickup below (capture env for the cloud, the dev server on 5179, B's gate tools).

**First thing next session: C, arrival.** Write `tasks/<date>-arrival-c-plan.md` first, nothing built before a
fresh agent's review lands (as A and B). The brief, from the roadmap: open on the flat painting, one line from
Vincent's letter, the sky starts to breathe, the camera pushes through the frame into the diorama; behind its own
flag with the default byte-identical to `main` (the pattern of `?alive=1` and `?touch=1`); then build, gate (the
identity baselines, motion by eye, reduced motion a dignified still, viewport), record, preview to Mark. Before
writing the plan: `tasks/lessons.md` from "B (touch)" down, `tasks/2026-10-13-touch-b-plan.md` for the plan's
shape and the review's blockers, `src/scene/DioramaExperience.tsx` and `src/App.tsx` for the camera's home, the
routes and the flags, `tasks/2026-10-11-handoff.md` for the painting-first reading C opens on. Questions the plan
must settle: which route C opens on (the flat painting is the 2D sky route or a still of the diorama head-on),
where the letter line comes from (a public-domain letter, cited), how reduced motion arrives (no push, the still),
and what the first frame is at t = 0 (byte-identical to the flag-off route or an authored still).

- [x] **PR #10 merged** (`3f1f87c`, 2026-10-13; Mark: "Merge it"). Codex P2 fixed first (`9dd2f2d`).
- [ ] **Mark's feel notes on B** at the Mac and a phone (production, `?touch=1`): see "Still owed" above.
- [ ] **The flag decision** after the Mac checks: `alive` (and `touch`) on for every visitor, or a choice.
- [ ] **C, arrival:** the plan file, then the review, then the build (above).

## Pickup — 2026-10-13 (night): B (touch) built and gated on the branch (superseded by the late-night pickup above)

**Current agent entry point, cloud or Mac:** this section, then `tasks/2026-10-13-touch-b.md` (B's record and gate),
`tasks/2026-10-13-touch-b-plan.md` (its reviewed plan), `tasks/2026-10-13-alive-a2.md` and `tasks/2026-10-13-alive-a.md`
(A's records), `tasks/2026-10-11-handoff.md` (history). Read `tasks/lessons.md` from "B (touch)" down.

**Where things are.**
- `main` is at `ad15650`: all of A (the sky's gust and halos, the cypress flicker, the window glimmer) behind
  `?alive=1`, Mark's knob picks shipped; the flag is OFF by default, visitors see today's piece. Vercel production
  READY at it. PR #8 (`246e817`) and PR #9 (`ad15650`) merged 2026-10-13; their branches deleted by Mark.
- **Branch `claude/confident-bohr-1y7p2u`** (from `ad15650`) carries B: the touch surge behind `?touch=1` (implies
  `alive`), gated in the cloud session (`tasks/2026-10-13-touch-b.md`, every row green). PR #10 opened 2026-10-13 on
  Mark's word ("create PR"), unmerged: merging deploys, both flags stay off. Its Vercel preview:
  `https://starry-night-git-claude-confide-0e1ba3-markpukete-webs-projects.vercel.app/` — `?touch=1` to feel it
  (hover, drag, tap, tap a star), `?touch=1&tune=1` for the `surge` slider beside A's six.
- **Still owed at the Mac** (a real GPU; the cloud cannot): AE 0 of the default route against `main` at pinned t,
  and `?perf=1` with everything on (`?touch=1`, shipped knobs), desktop and a phone. The locked bar is 60 / 30 fps.
  B adds up to 16 lift and 4 kick evaluations per vertex on the moving sky's 647k vertices, under count guards.
- **The capture tooling runs in either place.** Mac: `npm run capture:diorama` etc. as before. Cloud:
  `CHROME_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome CHROME_FLAGS=--no-sandbox CAPTURE_SETTLE_MS=12000`
  before the scripts; the dev server on 5179; one Chrome at a time; no source edits while a chain runs. The
  pinned-frame and compare scripts are tracked (`scripts/capture-sky-frames.mjs`, `compare-frames.mjs`); B's gate
  tools and the twin's mask live in the repo's ignored `scratch/touch-b-2026-10-13/` (the mask tool, the screen
  predictor) and the session scratchpad (the injector and gesture driver; rebuild from the record if lost).

- [x] **B built and gated** (2026-10-13 night, cloud session; Mark: "keep going, build B once the review lands").
  Plan reviewed (REVISE, F1–F13 applied: a kick that settles to exactly zero before pruning, one kick per ribbon
  on the flat clock, A's lift ceiling, the far sphere root, the listeners' element, the pair-mean packing, the
  store cleared on pause, the flare on colour, guarded statements, a runnable mask, finite support). Gate:
  default and alive byte-identical to their baselines; the touch route with no input identical to alive; every
  differing pixel of an injected surge inside the twin's mask on both skies; no pop across the kick's end; real
  clicks, drags and phone taps through DevTools behave; the colour gate closer to the painting; reduced motion
  and viewport PASS; 128 tests.
- [x] **PR #10 merged** on Mark's word (`3f1f87c`, 2026-10-13 12:53 UTC); the feel notes (the `surge` knob, a drag
  on touch trailing as well as orbiting, the kick's settle) stay open at the Mac, see the late-night pickup above.
- [ ] **The flag decision** after the Mac checks: `alive` (and `touch`) on for every visitor, or a choice.
- [ ] **C, arrival:** open on the flat painting, one line from Vincent's letter, the sky starts to breathe, the camera
  pushes through the frame into the diorama. Plan file first, fresh review, flag, gate, as A and B.
- Open from A: impasto under raking light at orbit cannot be built as specified (the sky is camera-locked); a light
  that moves with the orbit angle is the nearest reading, Mark's call. B: a tap over the cypress or the village
  surges the sky behind it (acceptable for a first pass, or masked later).
- Ideas noted, not queued (each Mark's call): full-length strokes for the short dabs, the star-body layer as patches
  if a phone struggles, visitor brush controls, Vincent's window / a fuller village; later only if wanted: sound
  (the out-of-scope lock would lift), a short shareable reel (a new dependency, stop-and-ask).

## Pickup — 2026-10-13 (late): all of A is on `main` behind the flag; B (touch) is next (superseded by the night pickup above)

**Then:** `main` at `ad15650` (PR #9 merged 2026-10-13 10:31 UTC on Mark's word; Vercel production
`dpl_BnJ1FVbHc1kacQaUYHGANGHR2WGY` READY at it). PR #8 (`246e817`) merged the sky's A earlier the same evening.
`docs/sky-choice-live-record` and `feat/sky-choice` deleted by Mark after the merges (the cloud session's git access
refuses ref deletion, HTTP 403); `record/2d-streamline-flow` kept on purpose.

- [x] **PR #9 merged** (`ad15650`): the cypress flicker and the window glimmer at Mark's pick, both at full. CI green,
  Codex no findings.
- [x] **B, touch** — built and gated (see the night pickup above).

- [x] **PR #8 merged to `main`** (`246e817`). The flag stays off by default: visitors see today's sky.
- [x] **A, second pass, built behind `?alive=1`** (2026-10-13 night, cloud session, Mark: "Merge it then start the
  second pass"). Plan `tasks/2026-10-13-alive-a2-plan.md` (fresh review REVISE, F1–F19 applied before the build):
  one sky clock for the whole diorama; a flame-like flicker climbing the cypress strokes (weights from the strokes'
  own heights and tongues, a two-mode travelling wave, per fragment through `onBeforeCompile` on three's stock
  material); the seven lit windows glimmering each at its own hashed rates; knobs `flicker` and `glimmer` on the
  tuner, shipped at 0.5. Tests T14–T19 with mutation proofs (120 green). Gate in `tasks/2026-10-13-alive-a2.md`.
- [x] **Mark's gate on the second pass** (2026-10-13 night, preview): offered flicker 1 / glimmer 0.6 against both at
  1; "I like the Both at full one" → shipped as the defaults (`sky-tuning.json` aliveFlicker 1, aliveGlimmer 1).
- [x] **Next:** a PR of `claude/confident-bohr-1y7p2u` to `main` when Mark asks: done as PR #9, merged `ad15650`
  (the flag stays off). Then decide the flag: on for every visitor, or a choice. Still owed at the Mac
  before the flip: AE 0 against `main` at pinned t on a real GPU, and `?perf=1` with everything on at the shipped
  values (the second pass adds two sines and an exp per fragment over the cypress, about 6% of the frame).
- [ ] Then B (touch), then C (arrival). Impasto under raking light at orbit stays impossible as specified (the sky
  is camera-locked); a light that moves with the orbit angle is the nearest reading, Mark's call.

## Pickup — 2026-10-13 (afternoon): make-it-alive A is built and gated; its retune is next (superseded by the night pickup above)

**Current agent entry point (then):** this section, then `tasks/2026-10-13-alive-a.md` (A's record and gate) and
`tasks/2026-10-11-handoff.md` (history). `main` is at `e80fdf7`. Branches: `docs/sky-choice-live-record` (the
record branch, now carrying A: Mark, "merge to sky-choice-live-record first") and `claude/confident-bohr-1y7p2u`
(A's build branch, merged into it on 2026-10-13).

- [x] PR #7 `feat(sky): let visitors choose a moving-stroke sky` merged as `e80fdf7` on 2026-10-11 and deployed
  (Vercel production `dpl_3qJcJeYvEAQifGT4vv9GVc8jFhvU` READY at `e80fdf7`). Codex on the last commit `69c1364`
  (the Web Worker build, answering its P2 first-switch hitch): "Didn't find any major issues".
- [x] Mark: phone check of `?sky=moving` on the live site: "looks okay" (2026-10-11 night).
- [x] `spike/moving-sky` deleted on Mark's word (`905223d`). 60-frame test sequences cleared from scratch (2.9 GB → 737 MB).
- [x] 2026-10-13, cloud session: the three Chrome scripts gained `CHROME_FLAGS` and `CAPTURE_SETTLE_MS`, so
  `capture:diorama`, `check:reduced` and `check:viewport` run in a cloud session after all (lessons, 2026-10-13).
  All three pass at `e80fdf7` + that tooling. Frame rate is still never judgeable headless.
- [x] **Make-it-alive A, built and gated (2026-10-13, cloud session, Mark: "Tackle A").** Behind `?alive=1` on
  `claude/confident-bohr-1y7p2u`: the gust clock in both skies (the band and the whorls surge and ease, the floor
  stays calm, a gust travels left to right), star halos breathing, the moon pulsing. Plan reviewed (REVISE → applied),
  gate in `tasks/2026-10-13-alive-a.md`: default byte-identical to `main` at pinned t on both skies, flag identical
  at t = 0, band ΔE within limits, reduced-motion and viewport guards pass, 112 tests. Retune passes used: 0 of 4.
- [x] **Mark's first look at A** (2026-10-13, Vercel preview, flag on): "I can see it. I can't see the main
  difference. let's just create PR." Verdict: too subtle. The PR goes up with A behind the flag (merging changes
  nothing visitors see); a retune pass follows. Proposed pass 1: amplitudes sum 0.7 → 0.9, shimmer share 0.5 → 1.0,
  lift 6% → 15%, halo breath ±14/5% → ±30/12%, moon ±8% → ±18%, plus URL knobs (`gust`, `lift`, `breath`) so Mark
  dials the strength live and the chosen values become the defaults. Boil is the risk; captures decide.
- [x] **Retune pass 1 of 4 on A** (2026-10-13, cloud session, Mark: "keep on working A, retune pass 1 on cloud
  session"; done on `docs/sky-choice-live-record` before the merge to `main`, PR #8). Defaults raised (amplitude sum
  0.9, lift 0.15, shimmer share 1, halo ±30/12%, moon ±18%) and live knobs `?alive=1&gust=&lift=&shimmer=&breath=`
  so Mark dials the strength on the preview. Gate in `tasks/2026-10-13-alive-a.md`, "Retune pass 1": both skies
  reviewed at the tempo peak and the light sky at the trough (no boil, no freeze), three Codex findings fixed (the
  flag-off path is now main's shaders and geometry). Peak animations in `output/alive-a-pass1-2026-10-13/` (local).
- [x] **Mark's gate on pass 1** (2026-10-13 evening): the strong preset "seems okay" → shipped as the defaults
  (`sky-tuning.json` aliveGust 0.95, aliveLift 0.3, aliveShimmer 1, aliveBreath 2). URL knobs rejected as the way to
  tune ("build the tool so that I can tune myself like in previous we've done") → `src/AliveTuner.tsx`, `?tune=1`:
  sliders live on the sky, "set as default" on the dev server writes the JSON, copy on the preview.
- [x] **Merge PR #8 to `main`** — done 2026-10-13 night, `246e817` (see the night pickup above).
- [x] **A, second pass** — built 2026-10-13 night (see the night pickup above).
- [ ] Then B (touch), then C (arrival).
- Ideas noted, not queued (each Mark's call): full-length strokes for the short dabs, star-body layer as patches
  (if a phone struggles), visitor brush controls, Vincent's window / fuller village.

## Pickup — 2026-10-11 (evening): the sky choice is LIVE (PR #7, `e80fdf7`) — superseded by the 2026-10-13 pickup above

**Current agent entry point:** `tasks/2026-10-11-handoff.md`, top section. Record: `tasks/2026-10-11-sky-choice.md`. `main` is at
`e80fdf7`. This docs branch, `docs/sky-choice-live-record`, is local: base the next feature branch on it so these
notes ride up with the next PR.

- [x] Mark: phone check of `?sky=moving` on the live site: "looks okay" (2026-10-11 night).
- [x] `spike/moving-sky` deleted on Mark's word (`905223d`). 60-frame test sequences cleared from scratch (2.9 GB → 737 MB).
- [x] Next: make-it-alive A (breath and drama; its tempo drives both skies) — built 2026-10-13, see above.
- Ideas noted, not queued (each Mark's call): full-length strokes for the short dabs, star-body layer as patches
  (if a phone struggles), visitor brush controls, Vincent's window / fuller village.

## Pickup — 2026-10-11 (afternoon): sky choice built, gated and refined (superseded by the evening pickup above)

**Current agent entry point:** `tasks/2026-10-11-handoff.md`. Record and gate: `tasks/2026-10-11-sky-choice.md`.
Branch `feat/sky-choice` (local; Mark pushes after his review). Default sky pixel-identical to `main`.

- [x] Sky-choice design approved by Mark; plan reviewed (Codex BUILD, Gemini READY).
- [x] Commits 1–4: builder options, moving-sky mode, dock button, tuning (`315ab5a`..`29f869b`).
- [x] Fable implementation review FIX → fixes `3262865`, `58a1560` → GATE.
- [x] Lead gate: all checks pass (`tasks/2026-10-11-sky-choice.md`, gate record).
- [x] Mark: "room to improve" → moving sky refined, Codex-reviewed, gated (`0918095`..`a16c780`, record section "Refinement").
- [x] Mark: taste review at his Mac (moon dimmed, then glow tuned); "push it and open the PR" (2026-10-11 evening).
- [ ] Mark: phone check of the moving sky (moved to the evening pickup).
- [x] On Mark's word: pushed, PR #7, Codex review answered (P2 fixed, re-review 👍), merged `e80fdf7` (= deployed).
- [ ] Then make-it-alive A (its tempo drives both skies), B, C.

### Proposed to Mark — visitor brush controls (Mark, 2026-10-11)

Mark: in Simon Lee's project "he has set up some brush bars so that users can move and make the paint
the way they want, I remember we use to have it too". We did: the dev-only `leva` panel (stroke count,
width, speed, shimmer…; "set as default" writes `src/scene/sky-tuning.json`). It was never shipped to
visitors (production aliases `leva` to `src/dev/leva-stub.ts`) and today it exists only on the flat 2D
route (`LivingPainting`, `StreamlineSky`); the 3D sky reads the saved values but has no panel. A
visitor-facing version would be a small, designed set of paint controls, not the dev panel. It is close
to the locked "preset dials" item, so it is Mark's call. Noted, not queued. Natural fit: after the sky
choice, alongside make-it-alive B (touch).

## Direction confirmed — 2026-10-11

Mark, after the Simon Lee study (`tasks/2026-10-11-simon-lee-study.md`): "my original thought was to
turn the original painting into a 3D world", alive, moving and viewable from different angles. It is
The Starry Night only — no generator, no other paintings, no gallery framing. **Decision: keep the
current bar and start make-it-alive A.** Weather dials and exploring further into the scene are ideas
to learn from, not queued. Both touch locked Out-of-scope items, so any change to them is Mark's call.

### After the moving-sky spike — Mark, 2026-10-11

- **Sky as a visitor choice (requested).** "I think user should choose for the sky and let them
  gauge." His read: the live sky "feels better at a whole"; the moving-stroke sky "surely is closer to
  the original paint (might need to fine tune)". So: live stays the default, moving strokes become
  an option once tuned. Design pending Mark's approval; it would come before A, so A's tempo can
  drive both skies.
- **Proposed to Mark — the view from Vincent's window.** Mark: "think of myself as Van Gogh sitting in
  that position at night and watching the sky and outside of the window ... I always wanted to know
  what he might be seeing and what the village might have look like." Simon's fully built village is
  what he admired most. The village was not visible from the asylum window and is largely invented,
  so a fuller village is an invented extension in the derived style. It touches scope: noted, not
  queued. It also fits C (the arrival), which already plans a line from Vincent's letter.

## Pickup — 2026-10-06: the painted village is live (superseded by the 2026-10-11 pickup above)

**Current agent entry point:** read `tasks/2026-10-06-handoff.md`. The source-painted village went live
through PR #6 (`8f6e5ec`). **Next: make-it-alive A, then B, then C, one at a time** (Mark, 2026-10-06); start with A. The
checked-out branch `docs/village-live-record` carries unpushed docs commits — base the next feature
branch on it. `main` is PR-only again (ruleset completed 2026-10-06): branch → PR → green checks → merge.

## Village study — R5, F2, C1 approved; promoted and live 2026-10-06 (history below)

The section below is the record of the village work from 2026-10-05 to its release; its last items
link the C1 slice and the promotion. The former entry point (`tasks/2026-10-05-village-foliage.md`,
Fresh-agent start) is superseded.

Mark reopened the village's visual character and authorised a bounded local study while retaining
his final taste gate. Lead owns the visual work; Worker handles mechanical captures/checks;
Reviewer is peer review. Branch `codex/village-authored-study`; Mark authorised commit/push of the
approved study. No merge or production/default-route promotion is authorised.

- [x] Read CLAUDE.md, lessons (medium/boil and September 24), and this plan; review painting and live scene.
- [x] Archive paused baseline and same-environment desktop timing; approve bounded plan through peer and feasibility reviews.
- [x] Value-only hill probe and first church/four-neighbour/two-tree study, retained as round 1 evidence.
- [x] Reject the repeated strips/ribbed tree lobes; test source-derived architectural paint and curved tree envelopes.
- [x] Finish four authored passes and peer review; Lead verified build/lint/98 sky tests, default/candidate reduced-motion and viewport guards, AE0 default preservation and all final views.
- [x] Prepare original/baseline/candidate and the local comparison page for Mark's visual gate; architecture promising, trees and mirrored paint unresolved.
- [x] Mark rejected the foreground tree clump: it reads as a hill in front of the church. He authorised Lead to continue this correction with Reviewer while he walks.
- [x] Review and execute one focused removal pass (R5); Lead opened all 11 authored views, three bright views and Blender diagnostic. Church is clear; exposed ground and remaining back foliage are named reservations. Matching R4/R5 comparison and review page are ready; all Lead checks and default AE0 passed.
- [x] Mark: “Okay, it looks better. let's commit and work on next”. R5 is approved as the local checkpoint; continue with the proposed foliage pass. This does not authorise release or default-route promotion.
- [x] Commit the approved R5 checkpoint as `92a8f56` (`feat(village): add source-painted village study`).
- [x] Author two source-painted foliage rows in two reviewed passes: low dark front band, lighter traced back crown row replacing the synthetic dome. Architecture and sky unchanged. Reviewer SHOW; Lead opened every F2 view and reran lint/build/98 tests, geometry, reduced-motion and viewport guards; default AE0.
- [x] Mark visual gate on F2: “Looks better. Commit and push. Well record where we at”. Foliage is approved. Known residuals are a narrow hedge at high angle, softer foliage paint at near, and old context houses beside the authored cluster; R5's mirrored architecture paint remains recorded.
- [x] Commit/push the approved branch: R5 `92a8f56`, F2 `2c6809b`. Origin was independently checked at the exact F2 SHA; the documentation follow-up records delivery and pickup in `tasks/2026-10-05-village-foliage.md`.
- [x] 2026-10-06: Mark chose the next slice — "finish the village": repaint the last three procedural houses and four bushes in the same source-painted medium, DEV flag only.
- [x] C1 built and gated (Lead Claude, Reviewer Fable, Worker Gemini): plan REVISE ×2 → revision 1 BUILD/READY → applied, frozen, all checks green, default AE0. Record: `tasks/2026-10-06-village-context.md`.
- [x] **Mark's taste gate on C1**: "commit and push the branch then tackle the next". Committed and pushed on `codex/village-authored-study`.
- [x] Promotion built on the branch (plan `scratch/village-promotion-2026-10-06/P1-plan.md`, Fable REVISE → BUILD, Gemini READY): `refactor(village): drop the study naming` + `feat(village): make the painted village the default`. Default route, dev and production build, is AE0 against the approved C1 views in all eleven.
- [x] **Mark: "commit, push and deploy merge".** PR #6 merged as `8f6e5ec` on 2026-10-06 and deployed to production. Live check: the page loads the locally proven bundle `index-BXmzVxdZ.js`, `/reference/village-atlas.webp` serves (old study name 404s), the live village band is AE 0 against the approved C1 view, and `check:village` on the live site reads ΔE 8.16.
- [x] `main`'s ruleset now requires a PR and the `lint · test · build` + `secret scan` checks (set 2026-10-06 on Mark's word; see the ruleset item below).
- [x] **Next slice agreed (Mark, 2026-10-06):** "Next session we will tackle A-C one by one" — the 24 September make-it-alive lane below, A first, each slice to Mark's gate before the next. The village detour came first "mainly because the original village really bother[ed]" him; it is done. Village residuals (bare ground, striped roof, mirrored church roof) stay recorded, not queued.

Durable gate records: `tasks/2026-10-05-village-study.md` and `tasks/2026-10-05-village-foliage.md`. F2 comparison: `output/playwright/village-foliage-2026-10-05/index.html`. Evidence and working plan: `scratch/village-study-2026-10-05/plan.md` and
`output/playwright/village-study-2026-10-05/`. The `villageStudy` DEV flags were removed at promotion:
the painted village is the default route; the old procedural village and shrubs are deleted.

## Production constraints and earlier backlog — September 24 context

The current pickup is the village handoff above. Release constraints in this section still apply;
the older sky prototype checklist is background context, not an instruction to resume that work.

**The piece is RELEASED and live, and `main` deploys to production on every change that lands on
it.** Since 2026-09-24 the only way onto `main` is a merged pull request — see the ⚠️ note below.

**Live:** <https://starrynight.markma.dev> (Vercel fallback: <https://starry-night-blue.vercel.app>) · production = `main` · deploys on every merge.

**Session start ritual:** read `tasks/lessons.md` (it is the memory and the 07-28
entries are dense), then this file. Re-read CLAUDE.md before any direction call — the bar is
central to the make-it-alive work below.

**Repo state at the release hand-off:** on `main`, clean tree, everything pushed. **`sky-brushdab` was merged
and DELETED on 2026-07-28** (Mark's call) after it was confirmed identical to `main`, so no commits
were lost. Two branches remain: `main` and the frozen `record/2d-streamline-flow`.

**Local checkout, 2026-09-24:** Mark's local `main` showed uncommitted changes (probably the
note-only edits from the 08-13 reconciliation). Reconcile them against this file before trusting either.

⚠️ **`main` is PR-only (GitHub ruleset "protect main", set up by Mark 2026-09-24).** Direct pushes,
force-pushes and deletion are blocked; a PR merges only once `lint · test · build` and `secret scan`
pass. The bypass list is deliberately EMPTY — agent sessions push with Mark's credentials, so an
admin bypass would let them straight through. Emergency route: Mark sets the ruleset to Disabled,
fixes, re-enables. Workflow for every change, typos included: branch → verify (`lint`, `test:sky`,
`build`; plus `check:reduced` and `check:viewport` on Mac — they cannot run as root in a cloud
session) → PR → merge, which deploys. Never test the ruleset by pushing to `main`.

### Direction — make it alive (Mark, 2026-09-24)

Mark: the released piece feels flat — it does not yet carry the painting's soul. Diagnosis (a cloud
session, from the code and notes — not yet confirmed against captures): the 2026-07-05 plan (below,
"route check") had two halves. The Petros Vrellis flow half was built and shipped. The Temponaut
half — "cinematic glow, pacing, and musical drama, only after the flow spine works" — was never
started. Today the sky's only motion is one steady-tempo brightness phase along fixed ribbons
(`src/scene/PaintingFlowSky3D.tsx`, `ribbonFrag`); the foreground is static; nothing responds to the
visitor; there is no arrival.

**Decisions:** keep the bar exactly as locked · no sound (still out of scope) · build in a LOCAL Mac
session, where captures work.

- [ ] **Prototype A, then B** (Mark 2026-10-06: one at a time, A first, his gate between), on a branch, behind a query flag so the shipped default is untouched:
  - **A — breath and drama in the EXISTING medium** (light travelling through fixed strokes; do not
    reintroduce strokes moving over the painting — see "Medium beats magnitude" in lessons): tempo
    that varies over time (gusts through the luminous swirl band, the great whorl surging and easing,
    star halos breathing at different rates, the moon's glow pulsing), contrast (energy in the swirl
    band, the deep blue calmer), impasto that catches raking light under orbit, a flame-like flicker
    in the cypress, a glimmer in the village windows. Watch for boil (lessons, ~line 1269).
  - **B — touch:** the pointer or finger sends a local surge of light along nearby ribbons that
    swirls, then decays back to the derived flow; tapping a star flares it. Resolve the drag
    conflict with orbit on touch devices.
  - Hold reduced-motion, 60 fps desktop and the orbit limits. Stop at Mark's review with captures and
    the Vercel preview link.
- [ ] **Then C — arrival story:** open on the flat painting, one line from Vincent's letter, the sky
  starts to breathe, the camera pushes through the frame into the diorama.
- Later, only if Mark wants: sound (would need the out-of-scope lock lifted) and a short
  Remotion reel for sharing.

### Release follow-up state — nothing blocking

- **Custom domain `starrynight.markma.dev`** — live and returning HTTP 200. It is currently
  Cloudflare-proxied; the earlier DNS-only (grey-cloud) plan is a configuration note, not a release
  blocker.
- **Portfolio link-out** — verified live on markma.dev, pointing to the custom domain. This work lives in
  the separate portfolio repo.
- **30 fps mid-tier-mobile** — accepted **UNVERIFIED**, waived by Mark 2026-07-28. Do not reopen unless
  a real phone reports a problem; the available levers are the stroke budget and DPR caps.

### Discoverability follow-up — Search Console and Starry Night crawl surface (2026-08-13)

- **Main portfolio indexing request** — Mark manually configured Google Search Console and requested
  indexing for `https://markma.dev/`, `/standard`, `/standard/projects/first-furlong`, and `/nz`.
  No agent authenticated to Google or operated the Search Console session. Status is **REQUESTED;
  WAITING ON GOOGLE** — this does not yet mean indexed or appearing in search.
- **Starry Night property setup** — Mark reports that Search Console setup is complete. Retain the
  current property and do not create another one silently. The exact Domain-versus-URL-prefix type
  is not duplicated here; if it matters later, verify coverage before any new submission.
- **Starry Night Search Console submission** — Mark reports that Search Console setup and the
  indexing submission for Starry Night were completed manually this morning. Status is **REQUESTED;
  WAITING ON GOOGLE** — no claim of current indexing or search appearance has been made.
- **Starry Night crawl surface — mostly LANDED 2026-08-13** (`52d05a7`, `40aee77`). `index.html`
  now carries the title, description, a self-referencing `https://starrynight.markma.dev/` canonical,
  Open Graph/Twitter metadata and a `<noscript>` body; `public/sitemap.xml` lists the one URL and
  `robots.txt` declares it. Verified in production 2026-09-24 (fallback host, same deployment):
  page, `/sitemap.xml` and `/robots.txt` all HTTP 200 with that content.
- [ ] **Still missing from that lane:** the build-time contract that fails the build on an empty
  production root — no script or test checks it today. Keep query-mode and capture URLs out of the
  sitemap.
- **Search Console follow-up** — after the remaining build-time contract is added and the public
  responses are verified, rerun the live test and inspect the indexed result. The existing indexing
  request is not proof of current indexing.
- **Authentication boundary** — Google sign-in, 2FA, CAPTCHA, property verification, DNS, and
  authenticated Search Console actions remain Mark-only. Do not grant broad macOS Accessibility
  permissions or attempt Playwright/Puppeteer/Selenium sign-in as part of this lane.

### Security audit — public-repo pass (2026-09-24)

No secrets in any of the 171 commits, no exploitable code path, and no vulnerable package reaches
visitors. Hardening merged to `main` via PR #3 (`b4b8e20`): actions pinned to commit SHAs,
`.github/dependabot.yml` (actions only, monthly, grouped), `npm audit fix` (lockfile only, 11
transitive bumps, production bundle byte-identical). Dependabot's first PR (#4, `gitleaks-action`
2.3.9 → 3.0.0, the Node 20 → 24 runtime move) was checked against the upstream tag and merged
(`b5f8334`). Settings, all **Mark-only**:

- [x] **Ruleset on `main`** — intended 2026-09-24 (PR required, 0 approvals; `lint · test · build` +
  `secret scan` required; force-push and deletion blocked; empty bypass list), but only `deletion` and
  `non_fast_forward` were ever saved. **Completed 2026-10-06** by Lead on Mark's instruction ("if not
  can you set it up for me"): `PUT rulesets/23934783` adding `pull_request` (0 approvals) and
  `required_status_checks` (both contexts pinned to GitHub Actions, integration 15368, not strict).
  Verified on `rules/branches/main`: all four rules, bypass empty. GitHub defaulted
  `require_extra_approval_for_unattributed_changes: true` (not set by us); if a merge ever asks for an
  approval Mark cannot give, that is the setting to review. Before/after JSON:
  `scratch/village-promotion-2026-10-06/ruleset-*.json`.
  Verified: the branches API flipped `main` from `protected: false` to `true`. See the ⚠️ note above.
- [ ] **Settings → Code security** — confirm Dependabot alerts, Dependabot security updates, secret
  scanning and push protection are on. npm security fixes depend on the security-updates switch,
  because `dependabot.yml` deliberately has no npm entry (see the comment in that file).
- [ ] **Vercel → Settings → Git** — confirm Git Fork Protection is on. The API could not prove it (the
  project listed under both filter values).
- [ ] **Optional:** noreply commit email for future commits; add a `LICENSE` if "open source" is meant
  literally (without one the code is all-rights-reserved); security headers via `vercel.json`
  (CSP needs a browser test against the WebGL scene first — low impact, static page, no auth).

The older release-day sections below preserve their historical state; this hand-off block is the current
status.

### Known and accepted, so nobody reopens them by surprise

- **The 30 fps mid-tier-mobile criterion is accepted UNVERIFIED**, waived by Mark 2026-07-28
  ("cell phone hardware is minor"). It was never measured on a real device — headless reads 0 fps.
  If a phone ever reads badly the levers are the stroke budget and the DPR caps in Tunables.
- **Portrait carries a ~19% band of unpainted sky at the top.** That is candidate C's accepted
  cost, chosen by Mark over two alternatives that filled the frame by dropping an anchor. Not a bug.
- **The fixed vertical fov** is still fixed. An aspect-responsive one would shrink that band *and*
  fix fullscreen-reads-as-zoom. Composition change, so Mark's call — offered twice, not built.
- **Deployment Protection stays ON for previews** and does not affect production. Preview URLs 302
  to `vercel.com/sso-api`; you must be logged in to open one. Production is public.
- **The favicon is 438 KB and that was accepted, not missed.** `favicon-starry-night-v2.png` is a
  512×512 painted icon (Codex, 2026-07-28), verified legible at 32px and still readable at 16px.
  Lossless recompression only reaches ~392 KB — the weight is real image data. The proper fix is a
  small 32×32 alongside it with `sizes` attributes, so a tab fetches ~2 KB instead. **Offered to
  Mark and not taken**; do not "fix" it silently. The orphaned `public/favicon.svg` was deleted.

### If picking up genuinely new work

**Visual work IS queued (2026-09-24): "Direction — make it alive" at the top of this file**
(prototype A+B, then C) is the current lane. The discoverability follow-up keeps one small open
item, the build-time empty-root contract. CLAUDE.md's Out of scope still binds (audio, VR/AR, other paintings, gallery
framing — never; preset dials / time-of-day — Phase 2 at the earliest, and only now that
pre-release has passed). Scope ideas go in this file, not into the code.

---

## ▶ RELEASED (2026-07-28) — the piece is LIVE in production

**`git push origin main` ran at Mark's explicit go. The diorama is live.**

- Production deployment `dpl_GD55SVdzGX5Abq57ZMpsDx7oavSK` — **target production, state READY**,
  commit `91b5085` on `main`. Confirmed from the Vercel API, not inferred from a 200.
- **`https://starry-night-blue.vercel.app`** — public, HTTP 200, no SSO gate.
- The promotion was the clean 181-commit fast-forward `247e816..91b5085`. The June vortex dome is
  now ancestry; nothing was forced and the build-in-public history is intact.
- **Verified by looking at the LIVE site**, not just the build: nine capture views against the
  production URL. Desktop composition correct; portrait renders candidate C with moon, full
  cypress, whorl and steeple. `output/playwright/production-live-2026-07-28/`.
- Pre-flight before the push: the production bundle was built, served locally and put through
  `check:viewport` (all ten cases) plus a nine-view capture — the artefact, not the dev server.
- **Rollback is available**: the previous production deployment remains a rollback candidate.

### Release checklist status

| # | Item | State |
|---|------|-------|
| 4 | Deploy mechanics | ✅ **DONE 2026-07-31** — production deploy and custom domain verified live; previews remain protected |
| 6 | Portfolio link-out | ✅ **DONE 2026-07-31** — markma.dev links to `https://starrynight.markma.dev` |

### Branch model — settled 2026-07-28, second call: sky-brushdab retired

Mark first kept all three branches, then an hour later retired the working branch: *"I don't think I
need the sky-brushdab branch now, let's merge to main."* Merged (fast-forward, it was already
identical to `main`) and deleted local + `origin`. **No commits were lost — every one is in `main`.**

| Branch | Tip | What it is |
|---|---|---|
| `main` | `95f46a5`+ | **Production and the working branch.** Deploys on push. GitHub default |
| `record/2d-streamline-flow` | `8ccf903` (06-24) | The 2D era, a frozen bookmark |

To recreate a working branch at any time: `git switch -c <name> main`.

**Correction worth carrying:** `record/2d-streamline-flow` is **no longer a divergent line**. Since
the 181-commit fast-forward it is 125 behind / **0 ahead** of `main` — `git merge-base --is-ancestor`
confirms it is fully contained in `main`'s history. It is now a *bookmark* on the June 24 tip of the
2D era, not a branch protecting unique commits; deleting it would lose the label and nothing else.
Mark kept it knowing that.

**The working model now:** `main` is both the working branch and the deploy trigger, so the safety
that `sky-brushdab` used to provide has to come from discipline instead. Branch for any real change,
verify on the branch, fast-forward `main` to publish. A branch push only ever makes a preview.
*(Superseded 2026-09-24: `main` is now PR-only under a ruleset, so publishing means merging a PR,
not fast-forwarding — see the ⚠️ note at the top.)*

---

## ▶ Superseded by the release — the pre-cutover record

## ▶ WHERE WE ARE (2026-07-28) — item 2 ✅ DECIDED AND APPLIED. Three of Mark's four remain.

**Mark's call: candidate C — the whole composition, letterboxed.** Everything held at once — moon,
full-height cypress, central whorl, steeple — at every phone aspect from 360×800 to 430×932, at
the cost of a ~19% band of unpainted sky at the top and paint that reads ~30% smaller than the
alternatives. Applied to `DIORAMA_CAMERAS.mobile`; the two rejected candidates and the `?portrait=`
review affordance are deleted rather than left as dead scaffolding.

The three Mark chose between (captures kept at
`output/playwright/portrait-candidates-2026-07-28-final/portrait-candidates-sheet.png`,
shipped · A · B · C left to right):

| | Kept | Cost | Outcome |
|---|---|---|---|
| A | full cypress, whorl, village, steeple; **sky fills the frame, no band at all**; biggest paint | **no moon**; home off head-on at az +27.5° | not taken |
| B | **moon**, whorl, whole village, steeple; paint larger than C | **no cypress**; ~13% top band | not taken |
| **C** | **everything** — moon, full cypress, whorl, steeple | ~19% top band; smallest paint | ✅ **shipped** |

**Verified after applying:** 98/98 tests (two new), lint, build, `check:reduced` all pass; portrait
renders C (`output/playwright/portrait-applied-2026-07-28/mobile-centre.png`) and **desktop is
untouched** — only `mobile` changed, and the non-portrait branch still reads `DIORAMA_CAMERAS[view]`.

### Then: device rotation did not switch cameras at all (Codex review, same day) — FIXED

Codex caught that all of the above only applied on a **fresh load**. Rotating an open page kept the
previous orientation's framing until reload. Reproduced, and it turned out to be **two** faults, the
second hiding behind the first:

1. **Stale camera** — `isPortrait` read `window.inner*` during render without subscribing to canvas
   size, so `Scene` never re-rendered on resize. Landscape→portrait kept the desktop close-up: no
   moon, no cypress. Fixed with R3F's reactive `useThree().size`.
2. **Stale sky** — `PaintingFlowSky3D` latched `initialCameraInverse` from the *first rendered
   frame*. Once the camera followed the resize the sky was still keyed to the old orientation, so
   the composition sat ~21° off and **the moon was clipped at the right edge** — the exact thing
   candidate C was chosen for. Fixed by deriving the home quaternion from the active camera spec
   (`Matrix4.lookAt`, camera convention) instead of latching a frame.

The two are one invariant: the spec-derived home equals the live camera only while the pose is
never clamped, which the envelope test added earlier the same day guarantees.

**Evidence** (`output/playwright/resize-verify-*`, all under `prefers-reduced-motion` so frames are
deterministic — rotated vs fresh, in bytes): `740432 vs 416304` before → `422942 vs 416304` after
fix 1 → **`416304 vs 416304`** after fix 2. **No regression:** a fresh load is **byte-identical**
before and after the sky change, in both orientations.

**New browser-level guard: `npm run check:viewport`** (`scripts/check-viewport-camera.mjs`). The
unit test could never catch this — it pins constants, and the constants were right the whole time.
Confirmed the new check FAILS on the broken code before trusting it.

### What the measurement changed about item 2

The checklist described item 2 as "the MOON can't fit a portrait frame". That is **not** the
binding constraint, and two inherited facts were wrong:

1. **The shipped portrait camera never rendered as authored.** `DIORAMA_CAMERAS.mobile` asks for
   distance 9.18; `DIORAMA_ORBIT.maxDistance` is 5.6, so OrbitControls clamps it on the first
   update. The framing is a third tighter than intended — which is why today it loses the cypress
   **and** clips the moon on every modern phone aspect (360×800 / 390×844 / 412×915 / 430×932).
   It only holds on the old 375×667 aspect.
2. **The moon is the cheap anchor; the cypress is the expensive one.** Across a ~30k-pose search,
   zero poses hold the moon without a flat band at the top of the frame — it sits high enough that
   reaching it overruns the painting's top edge. A full-height cypress with the sky filling the
   frame edge-to-edge does exist (candidate A). The real trade is **which anchor you keep**: they
   are at opposite ends of a landscape painting and a phone frame reaches one or the other.

Also settled while looking: the dark area **below** the island is not a defect — it is the
gate-passed floating-island look (`moon-fix-2026-07-22-p2/desktop-centre.png`). Only the flat band
**above** the sky is unpainted background.

### What changed in the code

- `orbitPose()` in `dioramaContract.ts` — cameras stated as azimuth/polar/distance instead of a raw
  position, so a pose cannot sit outside `DIORAMA_ORBIT` unnoticed. `DIORAMA_CAMERAS.mobile` is now
  built from it (target [0.4, 0.8, 0.02], az −15°, polar 88.9°, distance 5.4, fov 88).
- **Two new tests** in `scripts/diorama-layout.test.ts`: every authored camera must lie inside the
  orbit envelope (this one fails on the old spec — distance 9.184 vs the 5.6 cap, so it is not
  vacuous), and the portrait home holds Mark's chosen pose against a silent revert.
- The candidate scaffolding and `?portrait=` reader are removed now the decision is made.

**Still open and unaffected:** the fixed vertical fov flagged under item 9. An aspect-responsive fov
would shrink C's top band *and* fix the fullscreen-reads-as-zoom behaviour, but it is a composition
change and therefore Mark's — noted, not built.

---

## ▶ Superseded 2026-07-28 — the 07-27 end-of-session record

## ▶ WHERE WE ARE (2026-07-27, end of session) — item 9 CLOSED. Only Mark's four remain.

**The piece and the product around it are both done.** Item 9 closed by Mark after testing the
controls in his own browser. The pre-release checklist stands at **5 of 9**, and every remaining
item (2 mobile framing, 3 real-hardware perf, 4 deploy, 6 portfolio link-out) is Mark's call.

**Repo state at session end:** branch `sky-brushdab`, working tree clean, tip `3ed269f`.
**Four commits ahead of `origin/sky-brushdab` — NOT pushed** (pushing now spawns a Vercel preview
build, since the project is git-connected). **172 commits ahead of `main`**, and `main` is a direct
ancestor, so the promotion is still a clean fast-forward.

| Commit | What |
|---|---|
| `953424f` | feat — the shipping route gets its controls and its credit |
| `1a70e68` | docs — item 9 recorded; Vercel wiring verified |
| `baec2ad` | fix — stop swallowing fullscreen failures |
| `3ed269f` | docs — the agent-browser lesson |

**The one decision left before release:** `git switch main && git merge --ff-only sky-brushdab &&
git push origin main` **is the production deploy**. Before running it, settle Deployment Protection
(June returned 401 — if still on, "live" is not public) and `starrynight.markma.dev` DNS. Both
stop-and-ask.

---

## ▶ Superseded — earlier on 2026-07-27

## ▶ WHERE WE ARE (2026-07-27) — deploy wiring SETTLED; one build item reopened

Two facts established this session, both verified rather than inferred.

### 1. Moving `main` IS the deploy — confirmed, Mark was right

The open question from `0f41f67` ("check the wiring first") is closed. The Vercel project **is
connected to GitHub**, queried from the API (`/v9/projects/prj_1bvAN2…`):

```
link: { type: "github", repo: "starry-night", org: "markpukete-web",
        productionBranch: "main", repoId: 1267354367 }
autoAssignCustomDomains: true
```

So `git push origin main` after the fast-forward **triggers the production build and deploy by
itself**. There is no "promote first, deploy later" gap — the two are one action.

**Why the earlier inference was wrong:** the note reasoned that a CLI-shaped `.vercel/project.json`
plus a CLI-run June deploy suggested a CLI-only project. Both things are true *and* the GitHub link
exists — a project can be git-connected and still accept `vercel --yes` from a laptop. The
`starry-night-git-main-…vercel.app` alias was the visible tell. `vercel project inspect` prints no
git section on CLI v54, which is what made this look settled when it was not.
**Rule: for the fact that decides whether an action publishes, query the API, don't read the tea
leaves.** Same family as the 07-22 branch-topology error.

### 2. The visitor controls do not exist on the shipping route — new checklist item 9

Mark: *"we have show original van Gogh's painting as an option, I would like to add this in too."*
Verified — it exists, but **not where the visitor lands**.

`App.tsx:59` defaults `mode` to `diorama`; `App.tsx:87` returns `<DioramaExperience>` **early**, and
that component (`DioramaExperience.tsx:123–130`) renders only a `<Canvas>`. The dock — pause,
**Show original**, fullscreen — and the `<h1>The Starry Night · Vincent van Gogh, 1889 · Mark Ma`
card live in the fallback branch below that return, reachable only via a non-diorama `?mode=`.

Proof by accessibility snapshot, dev server at `:5173`:

| Route | Snapshot |
|---|---|
| `/` (what ships) | `- main [ref=e3]` — one bare element, **zero interactive controls, no attribution** |
| `/?mode=painting` (2D) | heading + `Vincent van Gogh, 1889 · Mark Ma` + 3 buttons: Pause · **Show original** · Fullscreen |

**Not affected:** the locked `prefers-reduced-motion` criterion still holds — `reduced` is passed
into `DioramaExperience` and freezes the churn. It is the *manual* affordances and the attribution
that are missing, not the accessibility contract.

**Consequence: deploying today publishes an uncontrollable, unattributed canvas.** Recorded as
item 9. The design question for Mark is what "show original" *means* in 3D — head-on the diorama
is the painting's composition (locked criterion), but once orbited a comparison would mislead.

**Mark's call, same session:** port the dock **as-is** (the placard treatment carries over
unchanged; no 3D-specific compare design for now), and **build item 9 before promoting `main`**, so
nothing ever publishes uncredited. Built and verified — see "Item 9 evidence" in the checklist.

### Next move — the promotion, and it is Mark's

With item 9 built, the remaining path is entirely Mark's:

```sh
git switch main && git merge --ff-only sky-brushdab && git push origin main
```

**That push deploys to production** (verified above). Before running it, decide:
Deployment Protection (the June preview returned 401 — if it is still on, "live" is not public),
and `starrynight.markma.dev` DNS. Both stop-and-ask. Items 2 (mobile portrait framing) and 3
(real-hardware fps) remain open and are unaffected by item 9.

---

## ▶ Superseded 2026-07-27 — the 07-22 evening record

## ▶ WHERE WE ARE (2026-07-22, evening) — village ✅ GATE PASSED. **ALL BUILD WORK IS DONE.**

**Gate call (Mark, live): "great job. I like it. gate passed."** Checklist **item 8 PASSES**, and
with it the last piece of build work on the pre-release checklist. Everything still open —
mobile portrait framing, real-device perf, deploy, portfolio link-out — is **Mark's**, not
Claude's. See NEXT SESSION below before starting anything.

Three sessions closed the last three build items in one day: cypress (item 7) and lighting
(item 1) this morning, village (item 8) tonight, plus two post-gate tuning passes Mark asked
for — the night lift and the moon.

### What landed tonight

The three gaps named in `tasks/2026-07-22-village-look.md` (Mark confirmed the list live) were
closed in six slices after a two-round plan cross-review with Codex
(`docs/superpowers/plans/2026-07-22-village-painterly-pass.md`, all round-1 findings
dispositioned in the plan):

- **S0** `deddf0a` — `villageWarm` palette region derived (0001's stars-style special case;
  sienna stratified because median cut folds a low-population red family into umber at any
  count). `--palette-only` flag guards the gate-passed image assets. `check:village` ΔE census.
- **S1** — cloisonnist ink contours on every house/church edge (belfry band, spire edges);
  p2 scaled segments by edge length (short edges dot-chained) and thinned the lines.
- **S2** `1070259` — church held inside the nocturne band (spire ×2.05+white → ×1.05; delta
  vs background now −4.3 against the painting's −0.37; the contours carry the separation).
- **S3** — cladding 230→700/area IN QUANTISED COURSES (p1's uniform scatter dissolved the
  silhouette into cypress-class fur); per-house palette-family interpolation incl. a
  pale-walled minority (p3), echoing the painting's church-flanking white houses.
- **S4** `4165417` — umber weave (12%/8% dials → band warm fraction 10.9% vs painting 9.78%)
  + the sienna roof landmark left of the church, kicks bounded by the roof rect's p90.
- **S5** — windows as ochre daub clusters with a p90-bounded core; p2 found them ABSENT not
  dim (pushBrush winds CW; windows material was FrontSide → fully culled; now DoubleSide).

**Verification at HEAD:** 96/96 tests, lint, build, `check:reduced` PASS. ΔE census 6.39 →
**2.20** (band Lab L matches the painting exactly). Perf `--perf`: mean 8.33 ms / p95 9.0–9.2 —
identical to the cypress-pass baseline; DPR caps untouched; real-device fps remains item 3.
Indicators (painting/live): stddev 11.32/2.30 · spire delta −0.37/−4.28 · warm 9.78/10.89.

### Then two post-gate passes Mark asked for — the night, and the moon

**The night lift** (`e075bd4` → `3b94eca`). Mark showed a pre-bloom-removal screenshot and asked
for an honest before/after. Measured on matched central sky crops (mean · luminous >150 · deep
night <60) — **painting 101.7 · 11.6% · 17.1%**; bloom state 130.2 · 15.1% · **2.7%**; the
post-removal tune 73.1 · 4.6% · 36.0%. Read: bloom was right to go (it had destroyed the cobalt
floor) but the tune then undershot the painting's *luminosity* by as much as bloom overshot it.
Mark: "lift the stars and swirl band like you said," then "I will let you drive."
- Source-keyed highlight gain in BOTH sky shaders — pale source strokes brighten, cobalt floor
  untouched — plus broader/brighter star halos and painted ochre glow-bleed around the village
  windows (the bleed bloom used to fake).
- p2 was the diagnostic: a 37% gain notch moved the sky **+1.6**, because the wash's night grade
  `×(0.67,0.79,1.0)` sank the band before the lift keyed on it. Softening to `(0.74,0.84,1.0)`
  and keying on true source paleness moved it +8.2. **Landed: 94.8 · 11.4% · 24.2%** — luminous
  mass within 0.2 pts of the painting, deep night kept. Item 1's no-bloom decision stands
  untouched; this tunes within it. Evidence: `night-lift-2026-07-22-p{1,2,3}/`.

**The moon** (`908b8ce`), after Mark flagged it "mismatched". The authored crescent sprite sat at
`skySwirls`' `MOON_UV` — the moon's **vortex** anchor, 78 px from the painted body (the exact
star-guard trap from lessons 07-16) — so it read as a second moon beside the painting's own.
Sprite **deleted**: the source's crescent-in-disc is the moon now, with halo and moonlight
re-centred on the measured painted centroid uv(0.8987,0.1697) and the halo core softened so the
crescent's gold stays readable inside the glow. This also closes the 0003 "busy moon corner"
residual. Evidence: `moon-fix-2026-07-22-p2/`.

### Evidence for the record (all in `output/playwright/`)

1. `moon-fix-2026-07-22-p2/desktop-centre.png` — **the piece as it stands** (final state)
2. `village-pass-2026-07-22-s5p3/village-original-vs-live.png` — village vs painting, matched
3. `village-look-2026-07-22/village-original-vs-live.png` — the morning baseline, for the delta
4. `night-lift-2026-07-22-p3/` · `moon-fix-2026-07-22-p{1,2}/` — the two tuning passes

---

## ▶ NEXT SESSION — READ THIS FIRST: there is no build work queued

**Do not open the code looking for the next slice.** The pre-release checklist is down to four
items and **every one of them is Mark's call** (composition, his hardware, deploy, portfolio):

| # | What | Why it is not Claude's to start |
|---|------|--------------------------------|
| 2 | Mobile portrait framing | Composition call. The moon sits ≈42° off-centre on the arc; fov alone cannot bring it into portrait, so it needs a portrait-specific camera *bearing* — which changes the composition. Mark decides. |
| 3 | Perf on real hardware | Needs Mark's machine + a mid-tier phone. Headless is software-rendered and reads 0 fps; the `--perf` numbers are desktop-only (mean 8.33 ms / p95 ~9.1). |
| 4 | Deploy mechanics | CLAUDE.md: anything touching deploy, DNS or analytics is stop-and-ask. |
| 6 | Portfolio link-out | Post-deploy, Mark's site. |

**What Claude MAY usefully do, if Mark wants it** (offer, do not assume):
- **Prepare item 2 rather than decide it** — produce 2–3 portrait framing *candidates* as
  captures (different camera bearings, each holding cypress + whorl + steeple, trading how much
  moon they include) so Mark picks a composition from pictures instead of describing one. This
  is the same "give Mark something to look at" move that unblocked the cypress and village.
- Nothing else. **Scope growth goes in this file, not into the code** (CLAUDE.md). Preset dials,
  time-of-day, audio, other paintings: out of scope, permanently or until post-release.

**Push state:** everything above is **committed and pushed** to `origin/sky-brushdab`
(`2b208d8..c37430a`, 2026-07-22 evening, Mark asked). Push is backup, not release; the
pre-release gate is still open.

**Branch reality, verified 2026-07-22 (an inherited note had this wrong — Mark caught it):**

| Branch | Tip | What is actually on it |
|---|---|---|
| `sky-brushdab` | `18fe449` (tonight) | **The piece.** The orbitable diorama, 167 commits ahead of `main`. |
| `record/2d-streamline-flow` | `8ccf903` (06-24) | **The 2D era** — `LivingPainting` + `StreamlineSky`, Mark's live-tuned v4 baked in. |
| `main` | `247e816` (06-20) | **The JUNE VORTEX-DOME era** — `SkyDome` (procedural vortex field) + the blocky/lathe `Diorama`. *Not* 2D: it predates `LivingPainting`/`StreamlineSky` entirely. |

`main` is an ancestor of both other branches; nothing has been merged back into it since June.
Repeated claims that "`main` carries only the 2D era" were wrong twice over — main is not 2D, and
the 2D is not on main.

**This matters for checklist item 4 (deploy).** `main` also carries the June commit
`d3501c0 docs(tasks): vercel preview deployed`, so any Vercel deployment still wired to `main`
would publish the **vortex dome**, not the piece that just passed its gates. `main` is also the
GitHub default (`origin/HEAD → origin/main`).

### ▣ MARK'S DECISION (2026-07-22) — branch endgame

**Mark: the current `main` is a failure. `sky-brushdab` becomes `main` — but only when the quality
is reached and the piece is ready. The 2D branch is kept.**

Recorded here as intent, **not executed**. It is release mechanics: it happens at checklist item 4,
in the same conversation as deploy, and it is stop-and-ask like everything else there.

- **`main` ← `sky-brushdab` is a FAST-FORWARD.** Verified: `main` is a direct ancestor of
  `sky-brushdab` (`git merge-base --is-ancestor main sky-brushdab` → true). So promotion is
  `git switch main && git merge --ff-only sky-brushdab && git push origin main` — **no merge
  commit, no conflicts, no history rewrite, nothing to force.** The vortex-dome era simply becomes
  ancestry; `main`'s *content* becomes the piece. Do not reach for a force-push or a fresh
  orphan branch — neither is needed, and both would throw away the honest build-in-public trail
  the Timeline narrates.
- **`record/2d-streamline-flow` is already safe and stays.** Local and `origin` both at `8ccf903`,
  fully backed up. It is a permanent record of the 2D era, never to be deleted or merged.
- **Sequencing at release — check the Vercel wiring BEFORE moving `main`.** The rule that holds
  either way: *never deploy from `main` until `main` holds the piece.* But whether moving `main`
  is itself a publishing act depends on how the project is connected, and that has NOT been
  verified:
  - **If Vercel is CLI-driven** (the June deploy was `vercel --yes` from the local directory, and
    `.vercel/project.json` is a CLI link — suggestive, not proof), then moving `main` publishes
    nothing; deploying stays a separate deliberate command.
  - **If the Vercel project is connected to the GitHub repo**, pushing the moved `main` **is** the
    production deploy — there is no "promote first, deploy later" gap to stand in.
  So step one at release is to look at the project's Git settings, not to move the branch. Both
  the move and the deploy are stop-and-ask regardless.
- **Until then `sky-brushdab` stays the working branch**, and pushing it is backup only.

**Session start ritual, unchanged:** read `tasks/lessons.md` (it is the project's memory, and the
2026-07-22 entries are dense), then this file, then CLAUDE.md if the bar is in question.

---

## Superseded same day — the morning record (cypress gate)

## ▶ WHERE WE ARE (2026-07-22) — cypress ✅ GATE PASSED; next session = the village

**Gate call, 2026-07-22 (Mark, live):** checklist **item 7 PASSES**. Reviewed against the painting
with fresh captures at `40c0a70`; Mark's verdict on the three review findings was **"those findings
are minor"**. Item 1 (bloom/night balance) is settled in the same call — the diorama ships without
full-frame Bloom. Everything on `sky-brushdab` is **pushed** as of this session.

**What passing means here:** colour solved, stroke length solved, silhouette topology matching the
painting. The open findings are recorded in `tasks/2026-07-22-cypress-review-findings.md` and were
judged not worth another pass — they are **not** a to-do list. Do not reopen them without Mark
asking; specifically, do not re-run the eliminated mip-filtering hypothesis.

**Calibration worth carrying:** my review rated the local-contrast gap as "the one substantive
defect"; Mark rated the whole set minor and shipped. The reviewer's bar was set higher than the
owner's ship bar. Flag what is seen, rate it honestly, and let the gate decide — but do not present
a refinement as though it blocked release.

---

## ▶ NEXT SESSION — checklist item 8, the village painterly pass (agreed with Mark 2026-07-22)

**Start here. Do not start by writing code, a design, or a plan.** The cypress pass only became
tractable once three concrete defects were named against the painting and one measurement shaped the
design. The village gets the same order.

### Step 1 — the look (this is the whole first move)

1. `npm run capture:diorama -- output/playwright/village-look-<date>` — fresh frames at HEAD.
2. Crop the village from the live capture and from the painting, scale both to the same height, and
   put them side by side. Recipe that worked for the cypress, reusable as-is:

   ```sh
   # source: village region rect from palette.json is normalised [0.28, 0.66, 0.78, 0.86]
   # on the 1600x1267 painting that is x 448..1248, y 836..1090
   magick public/reference/painting.jpg -crop 800x254+448+836 +repage -resize x600 /tmp/vil-src.png
   magick output/playwright/village-look-<date>/desktop-centre.png \
     -crop <w>x<h>+<x>+<y> +repage -resize x600 /tmp/vil-live.png
   magick /tmp/vil-src.png /tmp/vil-live.png -append /tmp/vil-compare.png
   ```

3. **Look at it, at true scale, and name the gaps in concrete terms** — the way the cypress got
   "reads near-black", "reads as fur not flame", "silhouette is bulbous". Three or so, specific
   enough that a fix can be aimed at them.
4. Only then: measure whatever the named gaps imply, and let the measurement shape the design.

### Traps paid for on the cypress — do not re-learn these

- **Never judge shape from a shaded render.** Threshold both images to bare masks first. I called
  flat sawn-off tops that did not exist in the geometry; it was shading on the near face.
- **Never judge texture from a blow-up.** Compare at 1:1. A 3× magnification of a 200 px crop made
  correct paint look like smeared driftwood.
- **Say which frame a verdict is in** — against the painting, or against the previous state. Both
  are valid; giving only the absolute one makes a real advance sound like a failure.
- **A useful sharpness metric**, if softness comes up again — 3×3 local standard deviation over a
  matched crop, source versus live:
  `magick X.png -crop WxH+X+Y +repage -colorspace Gray -statistic StandardDeviation 3x3 -format "%[fx:mean*255]\n" info:`
  (Cypress reference numbers: painting 6.45, render 2.01. Mark judged that gap minor — calibrate
  expectations accordingly, and do not treat a number as a defect on its own.)

### Where the village lives

| File | Lines | What it is |
|---|---|---|
| `src/scene/Village.tsx` | — | village meshes, atlas and painting textures |
| `src/scene/villageGeometry.ts` | — | church, houses and traced foliage rows (source-painted, 2026-10) |
| `src/scene/villagePatches.ts` · `village-atlas.json` | — | source pixel quads and their atlas UVs (`scripts/build-village-atlas.mjs`) |
| `src/scene/BrushIsland.tsx` | — | the island mass the village sits on |
| `src/scene/islandShape.ts` | — | island silhouette source |
| `src/scene/Diorama.tsx` | — | assembles island, village and cypress |

The old procedural `BrushVillage.tsx` / `BrushShrubs.tsx` (this section's 2026-07 subject) were deleted
when the painted village was promoted. The make-it-alive "glimmer in the village windows" will need its
own layer: the painted windows are `opening()` marks inside the village `paint` mesh.

The cypress technique that earned the gate pass, available to reuse: **project the painting's own
pixels onto source-derived geometry** rather than synthesising Van Gogh procedurally
(`BrushCypress.tsx` + `cypressLobes.ts` + `cypressLobeGeometry.ts` are the worked example).
Whether the village wants the same treatment is a design question for after the look — the village
is small, distant and geometric in the painting, where the cypress was large and organic, so the
answer may legitimately differ.

### Working agreement for this pass

- Mark gates on captures, not code. Nothing is "done" until the captures have been looked at
  beside the reference.
- Implementation may go to Codex again; cross-review the plan before greenlighting, as with the
  cypress (two rounds caught 4 P0s, all coordinate-contract errors rather than architectural ones).
- Stop and ask Mark at the gate, on scope growth, or on any new dependency.

---

### Superseded by the gate pass above — the pre-gate record (2026-07-22)

**Where we stopped (2026-07-22):** Mark rejected the first implemented second pass after an
original/live comparison exposed the same black-fur read. That implementation has now been
structurally replaced locally on `sky-brushdab`: the painting's persistent row runs form one main
closed lobe plus two connected side lobes, and the painting itself is source-projected onto those
volumes. Mark then approved implementing the darker, higher-contrast mood in his 2026-07-22
screenshot. Isolation proved that screenshot already matched the authored no-post render; the
full-frame composer was lifting the pale sky strokes. Bloom has therefore been removed from the
diorama rather than countered with a heavy grade. **Checklist items 1 and 7 remain at Mark's visual
gate. Nothing from either repair was pushed.**

**Review in this order:**

1. `output/playwright/cypress-compound-final-2026-07-22/original-vs-live.png` — painting left,
   deterministic live design crop right
2. `output/playwright/cypress-compound-final-2026-07-22/desktop-centre.png` — full composition
3. `output/playwright/cypress-compound-final-2026-07-22/runtime-contact-sheet.png` — final,
   no-post, orbit preset and both drag boundaries
4. `output/playwright/cypress-compound-final-2026-07-22/mobile-drag-left.png` — portrait viewport
   after orbiting the otherwise off-screen far-left tree into view
5. `reference/derived/cypress-lobe-gate.png` — source paint beside the retained lobe identities
6. `output/playwright/night-balance-authored-2026-07-22/desktop-centre.png` — the approved darker
   direction implemented without a full-frame post pass

**What changed after the rejection:**

- The old continuous profile and its self-reproducing ablation were retired. Row-run tracks now
  preserve the source's compound topology and reject distant dark sky paint before 3D compilation.
- Three lobes compile into one batched, closed shallow solid: **2,210 vertices / 3,936 triangles**.
  Their front projection preserves the baked crop's real 176:662 pixel aspect; the rejected pass
  squeezed the tree about 30% horizontally and made every frond look like a spire.
- UVs remain on detected cypress pigment even where a lobe envelope broadens, so side flames do
  not sample blue sky. The source painting supplies the visible long, irregular stroke field.
- The procedural overlay fell from 2,200 ribbons to **48 front + 9 mirrored back** sparse relief
  accents (**4,902 vertices / 4,788 triangles**). This removed both the short-mark fur and the
  evenly spaced bark waves seen in intermediate captures.
- Full-frame Bloom was removed. Authored additive moon/star halos still supply the glow, while the
  cobalt sky and foreground retain the local contrast visible in Mark's reference screenshot.
  `debug=final` and `debug=nopost` intentionally converge; the latter remains a regression control.

**Current evidence:**

- Original/live matched crop: `output/playwright/cypress-compound-final-2026-07-22/original-vs-live.png`
- Displayed regional Lab distribution (honestly not registered per-pixel): mean ΔE76 base
  **0.85**, middle **0.70**, top **3.62**, all below the locked tolerance of 10 after the
  source-alpha stencil excludes surrounding cobalt from the regional sample
- Nine deterministic runtime views, including final/no-post/orbit boundaries: **0 errors**
- Local 1600×900 authored final pipeline, 599 intervals: mean **8.33 ms**, p95 **9.1 ms**, max
  **9.7 ms**; no-post p95 **8.9 ms**. Portrait viewport p95 **9.3 ms** on desktop hardware only; the locked
  real mid-tier mobile gate remains checklist item 3
- **96 tests pass**, lint clean, production build green; reduced-motion frames byte-identical
  while the control churns

**NEXT:** Mark reviews the live localhost tree and authored night balance. If accepted, mark
checklist items 1 and 7 done; if not, record the precise remaining source/live or tonal gap before
another change. Item 8 (village) follows only after the cypress gate. **Do not push unless Mark asks.**

**Git:** compound topology `9b5abc8`, closed geometry `334fbd2`, source-projected runtime
`59cce94`, plus the documentation commit that follows this note; all local on `sky-brushdab`.

## Earlier the same day (2026-07-21) — ship hygiene CLOSED; item 5 decided

**Session summary (2026-07-21).** Ship hygiene is finished and checklist item 5 is decided.
Shipped assets went **19.2 → 10.04 MB (−48%) with no pixel change at any step**, in two passes:

1. **Lossless PNG repack** (`5e1188e`) — 18.17 → 11.20 MB. The hand-rolled encoder was writing
   filter 0 on every row and hard-coding RGBA, so every asset carried a dead alpha plane and the
   mask carried three copies of one grey. Codec collapsed from three hand-synced copies onto
   `scripts/lib/png.ts` (−283 lines), pinned by `scripts/png.test.ts`.
2. **Lossless WebP for the colour assets** (`17dde58`) — 12.21 → 10.04 MB. `painting-filled.webp`
   + the two side strips; flow fields and mask stay PNG, where WebP is bigger. Lossy was measured
   and rejected (item 5 evidence below). `cwebp` approved as a bake-only prerequisite.

Also `c79265f`: the pre-release checklist consolidated into one owned list (this file, above).

**Two instrument lessons this session, both in `tasks/lessons.md` — read them before trusting any
future capture diff:** a diff against a live-churning render means nothing without a same-assets
control run; and capture RMSE cannot measure ANY change that alters load timing (a format swap
shifts decode time, which shifts animation phase) — compare decoded pixels in the browser instead.

**DECIDED 2026-07-22 (Mark):** the README's old Status claimed the cypress and village were due
"a second painterly refinement pass" after the sky-flow work. Mark confirmed it is still wanted —
*"put it in the check list"* — so both passes are now checklist items 7 and 8 below. The pass is
no longer an inherited README claim that could be dropped by silence; it gates release.

### Ship hygiene detail — pass 1

`public/reference` 18.17 → 11.20 MB of
PNG; shipped payload 19.2 → 12.2 MB (−36%). **Zero pixel change** — the assets were re-encoded,
not resampled or converted: `scripts/slim-reference.ts` refuses to write a file unless the
decoded RGBA round-trips byte-identical. Capture A/B ran anyway and confirmed it, against a
same-assets control run that differed more than the A/B did (the churn is live; captures aren't
phase-locked — see lessons).

The win was two storage bugs in the hand-rolled encoder, not the data: every row was written
with filter 0, and every asset carried a constant alpha plane (the mask, three copies of one
grey). Codec collapsed from three hand-synced copies onto `scripts/lib/png.ts` (−283 lines),
pinned by `scripts/png.test.ts` (7 tests; suite now 53). `npm run slim-reference` is idempotent.

**Open decision for Mark — lossy colour assets.** Lossy WebP would take `painting-filled.png`
3.94 → 0.83 MB at q90 and roughly halve the payload again (~12.2 → ~7 MB). Not taken: it attacks
exactly the high-frequency stroke grain the piece is faithful to, and the runtime samples those
pixels directly for ribbon colour. Wants a crop A/B in front of Mark before anyone commits to it.

(Evidence: `output/playwright/slim-baseline-2026-07-21/` vs `slim-after-2026-07-21/`, with
`slim-control-2026-07-21/` as the noise floor.)

**NEXT — work the pre-release checklist below.** It is now the single definition of the last gate.

## ▣ PRE-RELEASE GATE — the checklist (single source of truth, 2026-07-21)

Four of the five locked gates in CLAUDE.md are passed (Phase 0, Phase 1/movable, first full
animated sky, foreground complete 2026-06-15). **Pre-release is the only one left**, so this is
the list that stands between the piece and release.

Consolidated on 2026-07-21 because the items had drifted across two places — the `Backlog`
section and the "standing pre-release items" paragraph repeated in each session's pickup note —
so no one list was complete. **Add pre-release items HERE and nowhere else**; pickup notes should
link to this section rather than restate it.

Owner column is the point: `Mark` items are taste, composition, or deploy calls that Claude must
stop and ask about (CLAUDE.md "Stop and ask Mark when"). `Claude` items are mechanical.

| # | Item | Owner | State |
|---|------|-------|-------|
| 1 | ~~Lighting/bloom balance~~ | Mark | ✅ **PASSED 2026-07-22** — middle-ground authored lighting pass accepted & pushed (`b3420f8`). Sky & foreground midtones lifted 8–11%, halos radiate, deep cobalt floor preserved |
| 2 | ~~Mobile portrait framing~~ | Claude measured + built, Mark chose | ✅ **DECIDED 2026-07-28 — candidate C, the whole composition letterboxed.** Corrected two inherited errors on the way: the moon is the *cheap* anchor (the cypress is expensive), and the old portrait camera was silently distance-clamped (9.18 vs a 5.6 cap) so it held neither. Now stated as orbit parameters and pinned by two tests |
| 3 | ~~Perf on real hardware~~ | Mark | ✅ **WAIVED 2026-07-28 (Mark): "cell phone hardware is minor, I am not too worried about it."** Not measured on a real device; desktop `--perf` is mean 8.33 ms / p95 ~9.1. The locked 30 fps mid-tier mobile criterion is therefore accepted UNVERIFIED, by the owner's explicit call. If a phone ever reads badly, the levers are the stroke budget and the DPR caps in Tunables |
| 4 | **Deploy mechanics** — Vercel prod, Deployment Protection, `starrynight.markma.dev` DNS, and the branch endgame are complete. The live domain is currently Cloudflare-proxied; the older grey-cloud wording is retained only as historical configuration context. | Mark | ✅ DONE 2026-07-31 |
| 5 | ~~WebP for the three colour assets~~ | Mark | ✅ **DONE 2026-07-21** — lossless taken, lossy rejected; payload 12.21 → 10.04 MB |
| 6 | **Portfolio link-out** — markma.dev links to the finished piece (CLAUDE.md: it links out, full stop — never embedded) | Mark | ✅ DONE 2026-07-31 |
| 7 | ~~Cypress second painterly pass~~ | Claude built, Mark gated | ✅ **PASSED 2026-07-22** — colour and stroke length solved, silhouette topology matches. Residual findings in `tasks/2026-07-22-cypress-review-findings.md` judged minor and not actioned |
| 8 | ~~Village second painterly pass~~ | Claude built, Mark gated | ✅ **PASSED 2026-07-22** — drawn contours, stroke-built walls, church held in the nocturne band, warm pigment + painted windows. *"gate passed"* |
| 9 | ~~Visitor controls in the diorama~~ | Mark scoped, Claude built, Mark closed | ✅ **CLOSED 2026-07-27** — chrome extracted to `src/VisitorChrome.tsx`, shared by both routes. Attribution + Pause / Show original / Fullscreen on the shipping route, all four verified working by Mark in his own browser profile. Render pixel-unchanged; mobile overflow fixed |

**Historical release-day snapshot (2026-07-28): 7 of 9 closed.** Items 1, 2, 3, 5, 7, 8 and 9 were
done — 3 by Mark's explicit waiver rather than by measurement. At that point, 4 (deploy) and 6
(portfolio link-out) remained; both are now closed in the current hand-off above.

**Deploy facts verified 2026-07-28, correcting the record:**
- **Deployment Protection is NOT a release blocker.** It covers PREVIEWS only. The production
  alias `starry-night-blue.vercel.app` returns **HTTP 200** publicly; preview URLs 302 to
  `vercel.com/sso-api`. The June "401" that worried this file was a preview, not production.
- **Production is public RIGHT NOW and serving the June vortex dome** (`247e816`). Unlinked, but
  reachable. Moving `main` is what replaces it.
- **`starrynight.markma.dev` is not wired.** It resolves via Cloudflare (same IPs as markma.dev)
  but returns **404**, and the Vercel project's domain list does not include it. Attaching it is a
  separate two-sided step: add the domain in Vercel, then the Cloudflare CNAME (grey-cloud).
- **The promotion is reversible.** The current production deployment is `isRollbackCandidate: true`,
  so Vercel can roll straight back.

### Item 9 evidence (2026-07-27)

Mark's scope call: **port the dock as-is** (not a 3D-specific compare design), and **build 9 before
promoting `main`** so nothing publishes uncredited.

- `src/VisitorChrome.tsx` — title card, original placard, control dock. One implementation, used by
  the diorama and the 2D route, so they cannot drift apart again.
- `DioramaExperience` takes `children` and renders them inside its existing `<main class="visitor-shell">`,
  which means the established `.is-clean-capture` rule hides all of it under `?clean=1` — the capture
  tooling needed no change.
- **The render is untouched, measured not assumed.** Two capture runs on the same code differ by
  RMSE 0.0029 (desktop-centre) purely from animation phase; the 07-22 gate baseline vs post-change
  differs by **0.00014**. Across seven views, baseline-vs-after sits at or below same-code jitter.
- **Mobile defect found by looking, not by the tests.** The pre-existing `translateX(-50%)` centring
  clipped the three labelled pills off BOTH edges at 390 px, and the 300 px placard swallowed the
  frame. Fixed by spanning the dock and letting it wrap, shrinking the pills, and scaling the
  placard to `min(196px, 52vw)` clear of the wrapped dock. Verified numerically at 360/390/430 in
  both motion states: no overflow, no overlap.
- The `prefers-reduced-motion` pause label is the width worst case — visible text shortened to
  "Motion paused" while the full "Motion paused by system setting" stays as the `aria-label`.
- **Fullscreen false alarm, worth not repeating.** Mark reported the fullscreen button doing
  nothing. It was pre-existing code, byte-identical to before the extraction, and it is *correct*:
  verified in Playwright, in a clean headed Chrome (viewport 1200x713 → 1512x949, canvas following)
  and in a **maximised** one (787 → 949). It works in Mark's ordinary Chrome profile; it is the
  **agent/automation browser that refuses it**. See lessons 2026-07-27. One real defect fell out and
  was fixed (`baec2ad`): `.catch(() => undefined)` was swallowing every failure, making "the browser
  refused" and "the button is broken" the same observation.
- **Closing verification at `3ed269f`:** 96/96 tests, lint, build, `check:reduced` PASS — and the
  **production bundle** was served via `vite preview` and captured, confirming the chrome renders in
  the built artefact (not just dev, where `leva` differs). That build is what deploys.

**Known, not a defect — the fov/aspect note.** The diorama camera uses a fixed vertical fov (50),
not an aspect-responsive one. A taller viewport therefore *narrows* the horizontal field by ~17%
rather than revealing more scene, so fullscreen reads as a slight zoom rather than an opening-up.
This is the same property behind item 2's portrait letterboxing — **one aspect-responsive fov
decision would improve both**, and it is a composition call, so it is Mark's.

*(Historical, kept because it is the method that worked twice:* **item 8's first step was not code
and not a design — it was a look.** *The cypress pass only became tractable once three concrete
gaps were named against the painting (near-black, fur-not-flame, bulbous) and the design was
shaped by a measurement rather than a hunch. The village got the same order — game-boxes /
glowing-church / missing-warmth — and it worked the same way.)*

Already satisfied, listed so the gate can be checked end-to-end rather than re-litigated:

- [x] `prefers-reduced-motion` dignified still state (locked criterion) — `npm run check:reduced`
- [x] Camera stays within the locked orbit limits (polar 0.2–1.62, distance 3–5.5, no pan/free-fly)
- [x] Ship hygiene — reference PNGs 18.17 → 11.20 MB lossless (2026-07-21); `leva` aliased out of
      the production build (vite.config.ts)
- [x] `npm run lint` clean; `npm run test:sky` green (**98 tests**); `npm run build` green
- [x] `npm run check:viewport` green — covers BOTH the camera and the visitor chrome across seven
      viewports and three live rotations (added 2026-07-28 after Codex found device rotation never
      switched cameras; a constants-only unit test cannot catch it). Closing the chrome half turned
      up a defect that predates the rotation work and is not rotation-specific: **on a phone in
      LANDSCAPE (844×390) the original placard covered the title and attribution, on a fresh load.**
      844px is wider than the 640px phone breakpoint, so a landscape phone takes the *desktop* chrome
      rules in a window with no vertical room. Item 9 had verified the chrome at 360/390/430 — all
      portrait widths — so the short axis had never been laid out. Fixed by sizing the placard from
      the short axis (`min-width: 641px and max-height: 520px`)
- [x] README reflects the orbitable-diorama reality, not the scaffold

**Explicitly NOT in this gate** (CLAUDE.md Out of scope / Phase 2): preset dials (time-of-day,
weather) — not before the core piece passes pre-release; the Techartist time-dial interaction
shape — Phase 2 at the earliest; audio, VR/AR, other paintings, gallery framing — never.

### Item 5 evidence — WebP for painting-filled + the two side strips (2026-07-21)

Only these three assets are candidates. **Lossless WebP is WORSE than our PNG for the flow
assets** (signed-flow-filled 1.61 MB PNG vs 2.10 MB WebP), so flow and mask stay PNG either way —
a mixed-format reference set is the correct answer, not a compromise.

| Option | The three colour assets | Total payload | Pixel change |
|---|---|---|---|
| Today (PNG, slimmed) | 6.33 MB | 12.21 MB | — |
| **Lossless WebP** | 4.15 MB | **10.03 MB** | **none, byte-identical** |
| Lossy WebP q90 + `-sharp_yuv` | 1.26 MB | **7.15 MB** | measurable, see below |

**What the lossy option actually costs.** Measured against the originals, q90 `-sharp_yuv` on
painting-filled: mean ΔE 2.85, max ΔE 52, **59% of pixels past ΔE 2** (the just-noticeable
threshold) and **0.9% past ΔE 10** — which is the palette tolerance locked in Tunables. Plain
q90 without `-sharp_yuv` is worse (mean ΔE 3.00); chroma subsampling hurts here because the sky
is fine blue-yellow interleaving, the worst case for it.

**The render moves too, and unlike the slimming pass it moves outside the noise floor.** Wiring
the lossy pixels in and re-capturing gave RMSE ≈ 0.0037 on every view, against a same-assets
noise floor of 0.0002–0.0013 — a consistent, repeatable change, not capture jitter. (Method: the
lossy pixels were written to temporary `_lossytest-*.png` files with the source paths pointed at
them for one capture; committed assets were never overwritten, and both were reverted after.)

**But at 3× zoom on the rendered sky I cannot reliably tell them apart** — the ribbon strokes
average the source grain, so the render is less sensitive than the raw asset. The loss on the
asset is confined to the finest canvas-weave speckle; Van Gogh's stroke shapes survive intact.

Crops for Mark's eye: `output/playwright/lossy-q90-2026-07-21/crops/` — `asset-*-4x.png` (whorl,
star, moon, cypress; left = original, right = q90) and `render-*-3x.png`. Captures:
`lossy-q90-2026-07-21/` vs `slim-after-2026-07-21/`, noise floor `slim-control-2026-07-21/`.

**Claude's recommendation: take lossless WebP, hold the lossy option.** It is 2.18 MB for
literally nothing — same integration work as lossy (bake-script output + runtime paths), no
grain risk, no argument. The remaining 2.9 MB from lossy is only worth spending if first-load
weight turns out to be a real problem on mid-tier mobile (checklist item 3), and by then there
will be a measurement to justify it rather than a guess. Grain is the axis this project has
already been burned on once (the cypress texture-ghost, six rounds).

**OUTCOME (Mark, 2026-07-21): lossless taken.** `painting-filled.webp` 2.35 MB,
`sky-extend-{left,right}.webp` ~0.90 MB each; flow fields and mask stay PNG. Shipped payload
**12.21 → 10.04 MB**. `cwebp`/`dwebp` approved as a BAKE-ONLY prerequisite (never needed for dev,
build, tests or deploy); `scripts/slim-reference.ts` owns the conversion and verifies it,
`extend-reference.ts` says to run it after a re-bake, README documents `brew install webp`.

⚠️ **Correction to the render evidence above.** The claim that lossy "moves outside the noise
floor" (RMSE ≈ 0.0037 vs 0.0002–0.0013) does not hold up. The lossless swap — provably
byte-identical pixels — measured RMSE 0.0096 on `desktop-centre`, *higher* than the lossy test.
A format change alters decode timing, which shifts the churn's animation phase at screenshot
time, and RMSE cannot tell phase apart from colour. **Capture RMSE is not a valid instrument for
any change that alters load timing.** The right check is to compare DECODED PIXELS in the browser:
Chrome decodes the WebP to 0 differing pixels out of 2,027,200 against the PNG. The asset-level
ΔE figures above are unaffected and remain the real reason to be wary of lossy.

## Superseded (2026-07-17, closed) — S4 ✅ GATE PASSED (Mark, live); next slice = ship hygiene

**S4 (side-void canvas extension) is DONE — Mark passed the drag-boundary gate live
("LOVE YOUR WORK", 2026-07-17).** That completes the whole approved offline inpaint + extend
pipeline (S1→S4): both problem regions — the cypress hole and the side voids — now carry the
painting's own pixels, and the "painting on a card" read is gone from every view. The three
residuals named in 0003 (busy moon corner, pale-band tiling at 2× offline, softer strip stroke
energy) passed with the gate — revisit only if Mark flags them. On `sky-brushdab`, all pushed.

**NEXT SESSION — ship hygiene**, then the pre-release gate:
1. Slim the reference PNGs (~15 MB total: painting-filled 6 MB, signed-flow-filled 3 MB,
   sky-extend strips ~5.6 MB). Candidates: re-encode colour assets (JPEG/WebP where alpha and
   byte-exactness aren't load-bearing at runtime), downsample flow strips (the σ=2 low-pass
   means full res is redundant), crop strip below-band filler rows. Verify no visual change by
   capture A/B — same discipline as the 2026-06-15 flow-field slimming.
2. Then the pre-release items — since 2026-07-21 these live in the **PRE-RELEASE GATE checklist**
   near the top of this file, which supersedes the copy that used to be restated here.

**How it landed (one session, 2026-07-17):**
- Measured the orbit's real exposure first (ray-cast the camera contract): ≤ 0.14 canvas widths
  → strips 0.30/side, full paint through 0.15, runtime fade owns the melt.
- Bake (`extend-reference.ts` S4): whole-sky donors, all S2 gates (no anchors invented); strips
  OWN the scan's ~20 px weave border (regrown — the gate-passed painting-filled.png untouched);
  colour fill guided by the relaxed edge flow field (context-mean flow hatch-degenerates in
  open-ended fill); flow strips destination-sign-aligned (the 07-16 rule) + σ=2 low-passed.
  4 offline passes to the flat-image pass (p4 ambient-blend probe REVERTED — monotone curtain).
- Mount: wash spans paintU ±0.3 with feathered texture hand-offs; ribbons integrate the CPU
  composite (`uPad`), count scaled to hold front density; `check:reduced` + 46 tests + lint +
  build green.
- The dotted-arc hunt: deleting the old in-canvas side fade surfaced three artefacts it had
  been silently hiding (sub-horizon edge trails, ribbon bells outshining the wash melt, the
  sky-mask's feathered skyline edge at the corner dips). Fixed via `trailMaxV`, the sub-band
  ribbon skirt, and the mask side-gate — found by layer bisection after five theories; full
  arc in `tasks/lessons.md` (2026-07-17).

(Gate evidence: `output/playwright/side-extend-2026-07-17-final2/` beside the pre-S4 baseline
`flow-realign-2026-07-16/`.)

**Dev/capture recipe:** `npm run dev` → `http://localhost:5173/?mode=diorama&clean=1`
(`&debug=flow` = sky only · `&debug=nopost` = no bloom). Rebake assets: `npm run extend-reference`
(deterministic; `--s2-only` skips the ~80 s S4 stage). Capture: `npm run capture:diorama --
output/playwright/<name>` (`DIORAMA_CAPTURE_EXTRA='&hide=wash'` etc. for layer-bisection probes).

### Superseded 2026-07-16 record — cypress hole ✅ GATE PASSED

**The cypress cut-out ghost is DONE — Mark passed it live ("gate pass", 2026-07-16).** This
closed the ghost problem that ate six runtime rounds + the whole 07-14 tree-shadow thread. The
offline inpaint pipeline (S1–S3): `PaintingFlowSky3D` samples the offline-filled
`painting-filled.png` / `signed-flow-filled.png`; all runtime donor/fill heuristics deleted.

The trail, newest last:
- S1 `0181e8c` — fill-region mask (5.7%, exactly the tree; moon + 5 star bodies guarded).
- S2 `e0b9c49` — exemplar inpainting → baked filled assets; **flat-image gate passed**
  ("can't tell the difference").
- `5085dbe` — Mark circled a mushy zone → per-placement tone adaptation dissolved the patch
  tiling.
- S3 `33ef84a` — runtime swap; deleted ~350 lines of heuristics; capture + `check:reduced` green.
- `9596734` — Mark live-caught "a little out of flow" → **re-aligned donated flow to the local
  SWIRLS circulation** (14% of copied texels were sign-flipped against the churn; Phase-0
  mechanism). **This is the change that passed the gate.**

Evidence: `output/playwright/flow-realign-2026-07-16/`, `inpaint-swap-2026-07-16/` (pre-flow-fix
A/B). Method + residuals: `docs/decisions/0003-inpaint-extend.md`.

### Original approval note (2026-07-14)

**Mark approved the offline inpaint + extend pipeline ("I think your plan will work").**
Rationale: six runtime rounds on the cut-out ghost all landed "close, still findable" — real
painting patches are the ceiling-raiser.

### Earlier that day — Mark's live gate feedback actioned; gate OPEN

Mark live-drove the diorama (first review since the push) and called it a step up. His three
feedback items were fixed as capture-verified slices on `sky-brushdab` (all tests/lint/build +
`check:reduced` green throughout):

1. **Sky ghost column knitted** (`90f9bcb`, 4 passes — at cap, landed). The dark brown-smudged
   column beside the 3D cypress (the old 2D cut-out) is gone from every view: inpainted wash
   fill (donor-init + Jacobi colour grid), donors demand solid mask + non-tree chroma, and
   mask-missed wisps are chroma-gated (two measured colour families). Evidence:
   `output/playwright/sky-knit-2026-07-14-p4/` (p1→p4 is the retune trail; p3→p4 = probe first).
2. **Ground sparkle calmed** (1 pass). Flecks now follow moonShade (rare in shadow), gentler
   pull, kick tail trimmed below bloom. Evidence: `output/playwright/spark-calm-2026-07-14-p1/`.
   Whether the in-motion bloom shimmer is gone needs Mark's LIVE drive — stills can't show it.
3. **Cypress spiky edge rounded** (1 pass). The saw-teeth were facets (SEG 34→72) + crest
   sharpening + thorn-slim edge marks; tongues kept, crests rounder. Mark said the spiky edge
   bothered him most; further elegance is his taste call. Evidence:
   `output/playwright/cypress-edge-2026-07-14-p1/`.

Still open for Mark (unchanged from 07-13): lighting/bloom balance (nopost vs final), mobile
portrait dead bands, perf on real hardware. Dev server recipe below still applies.

### Tree-shadow follow-up (2026-07-14, same day, Mark live) — three more rounds

Mark kept catching the cut-out ghost as it changed form: dark column → smooth blur ghost →
fine-parallel "character ghost". Each round fixed the layer beneath: grain (4× fill texture,
stroke grain mirrored from clean sky) + ~3× hole ribbon density (`sky-knit2 p1`), then BOLD hole
ribbons (wider/longer/curvature wobble/value kick — matching the neighbours' stroke statistics,
`sky-knit2 p2`). State: seam hard to point at, at home AND drag boundaries. Mark's eye judges.
If it STILL ghosts for him, the remaining lever is structural — widen the 3D cypress to own its
painted footprint at home view — a composition change, Mark's call, not a quiet retune.

### APPROVED by Mark (2026-07-14 late) — offline inpainting pipeline, absorbing the hole AND the voids

Six runtime rounds on the cut-out ghost (value → chroma → grain → density → bold → containment)
each improved it, but the ceiling of runtime heuristics is "close, still findable". The proper
fix is Phase-0-style: an offline script (`scripts/extend-reference.ts`, dependency-free like
`derive-reference.ts`) that bakes a NEW derived asset set:
- `painting-filled.jpg` — the cypress hole filled by patch-based inpainting (real painting sky
  patches, flow-aligned), reviewable as a flat image against the painting BEFORE entering 3D;
- optionally extended left/right margins in the same derived style (the side-void answer), plus
  a matching extended flow field.
Runtime then simply samples the filled painting inside the hole — the donor/fill-grid/bold
heuristics all get deleted. Tighter review loop (flat crops, not 3D drives), higher quality
ceiling, cleaner architecture. Supersedes the side-void slice below if Mark approves (same
mechanism solves both).

### Superseded by the approved pipeline (S4 absorbs it): side-void sky continuation

The empty flat-blue L/R margins are the biggest "painting on a card in a void" tell, and the
locked bar sanctions the fix ("the invented back … continues that same derived style"). Contract:

1. **Continue the churn past the canvas edges.** Ribbons seeded in the side zones, integrating a
   flow field continued outward from the painting's own edge columns (relax/extrapolate, same
   spirit as the hole inpaint), colours donated from the adjacent edge palette.
2. **Invent NO anchors.** No new stars, no moon, no hero swirls — texture and motion only; every
   composition landmark stays the painting's. (Hard negative, same class as the rejected native
   dome.)
3. **Fade with azimuth.** Density/brightness melt into the night gradient as the continuation
   leaves the canvas; the faithful front must not gain invented content — edge fade currently at
   `dioramaSourceEdgeFade` is the seam to blend across.
4. **Verify at home + both drag boundaries + look-down**, against the painting for the front.
   `SkyEdgeBackfill` (the whisper wash) is superseded by this and likely deleted.
5. Below-island void is NOT this slice (the island underside owns that read; revisit separately
   if Mark flags it).

---

## Superseded (2026-07-13) — for Mark's review next session; gate OPEN

### Where the piece is

An orbitable 3D floating-island diorama of Starry Night, authored entirely in Van Gogh
brushstrokes: a rooted, fully-clad island (top + underside), a licking-flame cypress front-left,
the village huddle + pale-spired church, dark brush bushes dressing the ground, all under the
camera-locked source-ribbon churning sky (`PaintingFlowSky3D`). It reads as the painting, survives
a full front-arc orbit + look-down (no funnel, no torn paper, no unpainted surfaces), and freezes
to a dignified still under reduced-motion. **This is a checkpoint, NOT a passed gate** — the
brushstroke look and composition are on track per Mark's 2026-07-09 read; his eye still decides.

Route: `npm run dev` → `http://127.0.0.1:5173/?mode=diorama&clean=1`
(`&debug=nopost` = no bloom · `&debug=flow` = sky only · drop `&clean=1` for the leva panel).

### What this session (2026-07-13) achieved — 3 items closed

- **Island underside clad** (`dc12ea1`, 2 passes) — the last smooth grey surface is now painted
  rock melting into night. Evidence: `output/playwright/underside-2026-07-13-p2/`.
- **Reduced-motion still-state VERIFIED** (locked criterion) — byte-identical frames under
  emulated reduce, churning control, and the still LOOKED at. Now a permanent machine check:
  `npm run check:reduced`. Evidence: `output/playwright/reduced-motion-2026-07-13/`.
- **Foreground bushes** (`1a54dfd`, 4 passes) — eight dark brush-clad shrubs dress the village
  edges, the apron and the cypress foot; colour grounded against the reference band (cypress-family
  near-black + olive/cool-green tongue scatter). **Freshest full capture set for the gate:**
  `output/playwright/shrubs-2026-07-13-p4/`.

36 tests, lint, build green throughout. Details in `tasks/lessons.md` (2026-07-13 section).

### Git state — everything is now pushed to origin (2026-07-13)

All three branches are backed up on GitHub and track origin (push ≠ merge — the gate stays open):
- `sky-brushdab` → `42a558b` — the active 3D work (this is where to pick up).
- `main` → `247e816` — synced (docs/UI only; the 3D work is not merged here).
- `record/2d-streamline-flow` → `8ccf903` (2026-06-24) — the settled 2D flat flow
  (`LivingPainting` + `StreamlineSky`, Mark's live-tuned v4 baked as defaults) kept as a permanent
  record of the piece before the 3D pivot. Revisit: `git switch record/2d-streamline-flow && npm run dev`.

### For Mark to decide next session (do NOT churn these blind)

1. **Gate review** of the whole authored-forms state — freshest set `shrubs-2026-07-13-p4`
   (desktop-centre / look-down / both drag boundaries / mobile / nopost).
2. **Lighting/bloom balance** — `desktop-nopost` vs final is a live taste call (2026-07-08 note).
3. **Mobile framing** — moon + cypress anchor both held today; whether the portrait dead bands
   above/below the composition need a different trade is a live-drive taste call.
4. **Perf on real hardware** — headless reads 0 fps; needs Mark's machine + a mid-tier phone.

### 2026-07-12 record — four rough edges done

The four Mark-confirmed rough edges (2026-07-09 list) were done as one capture-verified slice
each: village brush cladding (`a2a8b5c`), cypress licking-flame rework, sky churn across the old
cypress cut-out fill, calmer hill brushwork. Evidence: `output/playwright/rough-edges-2026-07-12/`
— final state is the `s4-hills-p1` set (desktop/look-down/drag-boundaries/mobile); each slice's
retune trail is its own `s1…s4` folder. Details + lessons in `tasks/lessons.md` (2026-07-12
section).

Run: `npm run dev` → `http://127.0.0.1:5173/?mode=diorama&clean=1`. Capture (pins port 5179):
`npm run capture:diorama -- output/playwright/<name>`.

---

## Superseded (2026-07-09) — authored brushstroke forms, the 3D pivot

Mark rejected the projected-painting relief (it funnels/torn-papers off the head-on view — a flat
painting holds one viewpoint) and chose **authored 3D forms**. New architecture: the whole diorama
is built from Van Gogh brushstrokes — real closed 3D volumes clad in oriented impasto strokes, over
the unchanged camera-locked source-ribbon sky. Plan:
`docs/superpowers/plans/2026-07-09-authored-brushstroke-forms.md`. Full lessons (the 4 insights that
mattered — solid forms survive orbit, cladding needs camera-facing surfaces, per-stroke value
variance is the read, tapered quads not tiles) in `tasks/lessons.md` (2026-07-09 section).

**State (GATE OPEN — Mark, 2026-07-09):** the composition now reads as Starry Night and survives orbit
+ look-down (no funnel, no torn paper). `brushForms.ts` (tapered value-varied cladding kit) +
`BrushIsland` + `islandShape.ts` + `BrushCypress` + `BrushVillage` replace the deleted projected
relief. Mark's read: the brushstroke LOOK is on track; the missing piece was CONTENT — adding the
village huddle + pale-spired church (the focal vertical answering the cypress) made it read. Mark
said "commit and keep the gate open" — this is a checkpoint, NOT passed. lint/36 tests/build green.
Committed on `sky-brushdab` (`fe26e77` forms → `dfeb79b` sky-hole fix → `f34640c` village), NOT pushed.
Evidence: `output/playwright/authored-forms-2026-07-09/s2-village/` (desktop/look-down/mobile);
`s1-p1…p6` is the cypress+island retune trail.

**Remaining polish — items 1–4 CONFIRMED by Mark's eye (2026-07-09, "so true"); gate stays OPEN:**
1. **[Mark-confirmed]** Houses are crisp low-poly boxes — the least "painted" thing in frame; clad
   them lightly (brush cladding, as cypress/hills) so they match the surrounding impasto.
2. **[Mark-confirmed]** Cypress is a touch dark/blobby; soften and make the flame silhouette more
   elegant (less lumpy, more of a licking flame).
3. **[Mark-confirmed]** Faint smooth patch on the left sky where the old cypress hole was filled
   (no longer a ghost tree, but not swirled) — seed sky ribbons across the fill so it reads as sky.
4. **[Mark-confirmed]** Hills still slightly coarse/mottled; the light flecks are a bit confetti-ish
   — tune stroke value spread / fleck frequency.
5. Foreground dressing (bushes/ground), lighting/bloom balance, reduced-motion still-state check,
   mobile framing polish, perf on real hardware (headless reads 0 fps).
6. The island underside is a smooth grey cone — could clad or darken it further.

Run: `npm run dev` → `http://127.0.0.1:5173/?mode=diorama&clean=1`. Capture (pins port 5179):
`npm run capture:diorama -- output/playwright/<name>` (includes a `desktop-lookdown` stress view).
Architecture notes: forms are real closed solids clad in tapered, per-stroke-value-varied brush
marks (the two Van Gogh-read insights); seat new forms on the island via `islandHeightAt`.

---

## Where we are now (2026-07-05) — superseded by the 2026-07-09 pivot above

> **NORTH STAR (locked — CLAUDE.md, re-read it).** The endgame is the **3D orbitable diorama**. The flat 2D
> piece is a FOUNDATION milestone, NEVER the ship target. Phase now: 2D sky motion settled → **next: make it 3D**.
> (Claude mis-scoped this as "ship flat" on 2026-06-23 — see `tasks/lessons.md`. Don't repeat it.)

> **QUALITY GATE OPEN (Mark, 2026-06-20).** Foreground-complete gate stays passed; pre-release sign-off withdrawn
> for sky visual quality. No publish mechanics until the fidelity gate passes.

**The sky motion is settled: a streamline-ribbon churn (`StreamlineSky`) over the flat `LivingPainting` base.** The
painting stays 1:1 as a static base (the foreground IS the painting, pixel-faithful); `StreamlineSky` animates only the
sky — continuous ribbons integrated through the painting's signed flow field, with a brightness phase travelling along
each stroke (painted stroke energy moving through the marks, not dabs/worms/water). This replaced the earlier brush-dab
churn (`BrushDabs`, now removed); the dab history lives in `tasks/lessons.md` + git.

- **Built by Gemini (Antigravity), 2026-06-22→23, over four capture-verified review rounds** against the parsed
  reference video. Closed the motion brief's three axes: full-sky coverage (to the horizon, GPU-mask faded — no rooftop
  spill); ringing star + moon halos (halo shimmer as paint, moon crescent static; centres from `skySwirls.ts`); finer
  dense grain. v4 leva defaults: count 3000 / strokeWidth 0.0032 / opacity 0.55 / speed 1.6 / shimmerMix 0.30.
- **Committed on `sky-brushdab`** — `9c021df` (feat: the look) + `dc106ae` (docs: brief + notes). build/lint/`test:sky`
  15/15 green. NOT pushed/merged → gate OPEN.
- **Result worth remembering:** across the four rounds the motion-map MEAN fell (1.56 → 1.14 → 1.33 → 1.23) while
  coverage, halos and perceived liveliness ROSE — a clean confirmation that the heatmap mean is not proof; only looking is.
- **Workflow rule in force (Mark):** verify every change by LOOKING at the rendered crop vs the painting (Playwright
  capture), not heatmaps/tests. See `memory/visual-check-every-iteration`.

### ▶ PICK UP HERE (resume — 2D motion settled + live-tuned 2026-06-24; next phase = make it 3D)
- **State (2026-06-24):** on `sky-brushdab`, clean tree, NOT pushed. 2D flat motion settled (`StreamlineSky`) —
  the FOUNDATION for the 3D build, NOT a ship candidate. Mark live-tuned v4 further and those values are now the
  baked defaults (count 2000 · opacity 0.45 · pulse 7.5 · shimmerMix 0.80 · shimmerSpeed 3.0 · shimmerScale 2.8;
  commit `27db731`). To run: `npm run dev` → localhost (Stats top-left; "Show original" A/Bs the painting; leva
  tunes). Captures: `output/playwright/claude-review-v4/`.
- **Tuning now persists (dev tooling, `27db731`):** sky defaults live in `src/scene/sky-tuning.json` (read via
  `tuned()` in `src/scene/tuning.ts`); the dev-only **"set as default"** button in the leva `streamline sky`
  folder writes the current values there (both folders) — survives reload AND bakes into the production build.
  Factory v4 numbers remain as code fallbacks, so clearing the JSON resets. Hardened writer = `/__set-tuning` in
  `vite.config.ts` (serve-only). Detail in `tasks/lessons.md` (2026-06-24 entry).
- **Next phase — make it 3D (the locked orbitable-diorama vision).** Carry the settled streamline motion into 3D;
  the Codex note's curved-canopy path (integrate motion in the painting's UV space — which `StreamlineSky` already
  does — then map onto the dome, constrained orbit) is the natural route. `SkyDome`/`Diorama` scaffolding is
  parked-but-present (unimported legacy) — likely the starting point, re-fitted with the streamline motion.
- **Open 2D taste calls first (Mark):** is v4 the "proper 2D" to build 3D from, or tune further (grain vs the video,
  cobalt depth, foreground forms)? A live drive + a quick fps glance settles it.
- **Perf UNVERIFIED** — count 2000 ribbons (one draw call, lowered from 3000 in Mark's tuning); confirm 60fps
  desktop / 30fps mid-tier mobile on real hardware (headless rAF reads 0).

### 2026-07-05 route check — execute the 3D front-canopy MVP next

Mark reviewed the current localhost and called it too plain for the next gate. The two YouTube references now
resolve the direction:

- **Primary motion model:** Petros Vrellis / `pvrellis` Starry Night animation — the painting behaves as a connected
  flow field; strokes carry the motion as one sky system.
- **Secondary polish model:** Temponaut / Moonlight Sonata Van Gogh animation — use for cinematic glow, pacing, and
  musical drama only after the flow spine works.

Implementation order:

1. **3D front-canopy MVP first.** Re-fit the settled `StreamlineSky` logic into a 3D canopy: integrate in the
   painting's UV space, then map the ribbons onto a curved front sky over the existing diorama forms. Keep the
   head-on composition faithful to the painting.
2. **Constrained orbit only.** Allow enough orbit to prove depth, but do not chase full 360 coverage yet; full 360 is
   where earlier passes got pulled into mirror symmetry, invented backs, and generic vortex language.
3. **Use the parked `Diorama`/`SkyDome` scaffolding selectively.** Reuse foreground forms, moon/star placement, bloom,
   and orbit lessons; do not revive brush-dabs or the native 360 vortex sky as the main carrier.
4. **Gate by looking.** Capture desktop + mobile and compare against the painting plus the `pvrellis` reference. Tests
   and heatmaps do not prove the feel.

Hard negatives remain closed: no independent tiny dabs, no worm-like micro-strokes, no water-blur base advection, no
mechanical halo fan-spin, and no A/B parsed-frame ping-pong.

### 2026-07-05 failed implementation — 3D front-canopy pass REVERTED

The first local 3D front-canopy attempt was presented and Mark rejected it immediately. Treat it as a failed pass, not
progress.

What failed:

- The canopy read as a flat rectangular card behind the scene, not a convincing R3F/Three composition.
- The old faceted `Diorama` foreground looked like placeholder geometry and dominated the frame.
- The screenshot itself showed obvious presentation failures: dev controls/tooling and title/FPS collisions were visible
  during review.
- Passing `lint`/`build`/pixel checks did not matter because the visual gate was plainly not met.

Action taken: runtime code was reverted to the settled 2D `LivingPainting` + `StreamlineSky` baseline. Do not resurrect
the failed `FlowCanopySky` implementation as-is. The next 3D attempt must start with a real composition plan and visual
blocking pass before replacing the localhost presentation.

### 2026-07-05 autonomous implementation loop — 3D front-canopy MVP, then TechArtist correction

Mark requested a Codex-owned design loop with no approval gates: draft spec → self-review/edit → draft plan →
self-review/edit → implement → review → Playwright capture → only present if the screenshot is strong enough.

Artifacts created:

- Spec: `docs/superpowers/specs/2026-07-05-autonomous-3d-front-canopy-spec.md`
- Plan: `docs/superpowers/plans/2026-07-05-3d-front-canopy-mvp.md`
- Captures: `output/playwright/front-canopy-mvp-2026-07-05/`

Implementation result:

- Default route stays the restored 2D foundation.
- New review route: `?mode=canopy&clean=1`
- Shared source-space streamline builder powers both 2D and 3D paths.
- 3D canopy projects painting-UV streamlines onto the curved front volume.
- Gate capture uses a UV-registered curved foreground matte instead of the old faceted `Diorama`.
- Playwright capture set includes desktop final/no-post, edge-debug, sky-only, and mobile final/no-post.

Current correction from Mark: this is **not** the original 3D target. It is a technical front-canopy proof, but the
inspiration in `~/Downloads/Videos/techartist_` is a genuine orbitable diorama/world: floating landmass, physical forms,
authored terrain, object identity, orbit camera, and atmosphere/preset controls. Do not continue treating the canopy
surface as the main 3D direction.

Revised direction:

1. Restore the TechArtist-inspired target as the 3D model: Starry Night as a physical floating diorama/world.
2. Keep `StreamlineSky` as the sky-motion source, but mount it inside/behind a real authored 3D stage rather than making
   the painting itself the whole 3D object.
3. Replace the matte foreground with real forms: flame cypress, rolling hills, village/church, moon/stars, and a floating
   terrain base that reads like an inspectable object.
4. Use orbit and depth as first-class product behaviours, not just proof that a curved canvas is not flat.
5. Treat preset dials/time-of-day as later inspiration only; core Starry Night world comes first.

Publish/DNS/portfolio stays parked until the fidelity gate passes.

### 2026-07-05 TechArtist-style diorama route — failed, not passed

Codex ran the requested loop again: spec → self-review/edit → plan → self-review/edit → implementation → review →
Playwright capture → visual self-review.

Artifacts:

- Spec: `docs/superpowers/specs/2026-07-05-techartist-diorama-spec.md`
- Plan: `docs/superpowers/plans/2026-07-05-techartist-diorama-mvp.md`
- Captures/self-review: `output/playwright/techartist-diorama-2026-07-05/`

Implementation:

- New review route: `?mode=diorama&clean=1`
- Debug/capture routes: `?mode=diorama&debug=nopost&clean=1`, `?mode=diorama&debug=stage&clean=1`,
  `?mode=diorama&view=orbit&clean=1`
- Reuses the parked `Diorama`/`SkyDome` as a physical stage plus living-sky scaffold, not as a curved painting surface.
- Adds deterministic terrain blade/stroke detail, ridge stones, muted cloud puffs, constrained orbit, and camera presets.
- Adds layout/camera tests in `scripts/diorama-layout.test.ts`.

Current visual verdict from Mark:

- **Epic failed, not pass.** The implementation is a physical stage, but it is not the original painting in 3D.
- The star flow and sky soul do not match Van Gogh's painting. The scene reads as generic diorama + legacy streak sky,
  not a 3D translation of the original art.
- The mistake was reviewing the TechArtist mechanism before re-reviewing the source painting. Future 3D work must start
  from `public/reference/painting.jpg`, `public/reference/signed-flow.png`, `public/reference/flow-field.png`, and
  `public/reference/sky-mask.png`, then implement the physical world around those constraints.

Next step:

1. Write a painting-first 3D visual contract: horizontal S-flow, central double whorl, embedded vortex stars, dominant
   moon/crescent, left flame-cypress silhouette, low village/church, rolling hill band, and source-sampled colour.
2. Rebuild the diorama route so the settled source-space `StreamlineSky` ribbon model is the primary sky mechanism in
   3D; the physical stage supports the painting composition instead of competing with it.
3. Keep TechArtist only as interaction inspiration: orbitable compact world, physical depth, constrained camera.
4. Keep time-dial/presets parked until the core Starry Night world passes visual review.

### 2026-07-05 painting-first diorama recovery — implemented, not final gate

Artifacts:

- Spec: `docs/superpowers/specs/2026-07-05-painting-first-diorama-recovery-spec.md`
- Plan: `docs/superpowers/plans/2026-07-05-painting-first-diorama-recovery.md`
- Captures/self-review: `output/playwright/painting-first-diorama-2026-07-05/`

Implementation:

- New source-derived sky component: `src/scene/PaintingFlowSky3D.tsx`
- `?mode=diorama` no longer uses the legacy `SkyDome`; it uses the settled source-space streamline ribbon builder
  mapped into the 3D front volume.
- Added `?mode=diorama&debug=flow&clean=1` to inspect the painting-derived sky without the stage.
- Moon and star halos now come from `skySwirls.ts` UV positions rather than invented world positions.
- Removed the generic cloud puffs from the stage because they competed with the original painting's central whorl.
- Added a portrait camera so mobile keeps cypress, village, whorl, and a cropped moon in the same frame.

Current visual verdict:

- Mark review: **Improvement; right direction; keep the gate open.** This is the active 3D route to pick up next
  time, but it has not passed the visual gate.
- Better: the sky now clearly carries the original painting's horizontal S-flow, central double whorl, embedded star
  nodes, and source-sampled colour. This is much closer to the painting than the rejected TechArtist-style pass.
- Better: no-post still reads, and the stage is supporting the painting rather than being the whole product.
- Still not final: the source projection can still read like a curved painting layer at the edges; the 3D cypress is
  still too black/prop-like compared with Van Gogh's painted flame; portrait shows the moon but still crops it.

Next step:

1. Fix the foreground/source registration: rebuild the cypress as a thinner left-edge flame that covers the source
   cypress void and carries visible green/brown brush modelling.
2. Break the remaining rectangular projection read by extending/inventing only the back/edge sky in the same derived
   flow style, while preserving the front source composition.
3. Improve mobile composition so the moon is fully visible without losing the cypress/village anchor.

### 2026-07-06 pickup — checkpoint committed; mobile moon framing improved

- Recovery checkpoint committed locally as `145dc5d feat(3d): add painting-first diorama recovery`; still not pushed.
- Tried three cypress/source-registration mini-passes and reverted them because they were visually worse: a black blade,
  a pale cutout, then a mis-sampled source-texture strip. Do not treat those as progress.
- Kept a narrow camera fix: the portrait `?mode=diorama&clean=1` view now uses a wider/farther mobile camera aimed
  enough right to keep the moon crescent in frame while retaining village, whorl, and a left cypress anchor.
- Evidence: `output/playwright/pickup-2026-07-06-mobile-camera/`.

### 2026-07-06 follow-up — switch the diorama contract from 360 to a front arc

- Mark review: the route still fails if the visitor gets behind the cypress because the back exposes the void.
- Decision: stop treating full 360 as required for this slice. The diorama should be **front-arc orbitable** now:
  enough orbit to feel physical, but no side/rear inspection until the cypress/source edge can be authored as a true
  object.
- Implementation target: clamp `?mode=diorama` OrbitControls to a practical asymmetric azimuth envelope and record that
  rear-cypress exposure is a reject condition, not a missing polish item. Exact ±90° and broader symmetric arcs still
  showed too much blank side void in self-review; final envelope is -15° toward the bad rear-cypress side and +45°
  toward the side that still reads as an inspectable diorama.
- Evidence: `output/playwright/diorama-front-arc-2026-07-06/`.

Next step remains after the front-arc clamp:

1. Re-approach cypress/source registration from a proper visual contract instead of ad-hoc geometry tweaks.
2. Dissolve the remaining projected-sky edge into a derived world-space continuation.
3. Keep the improved portrait camera unless Mark prefers a tighter crop.

Pickup command:

```bash
npm run dev -- --host 127.0.0.1
# open http://127.0.0.1:5173/?mode=diorama&clean=1
# flow-only honesty check: http://127.0.0.1:5173/?mode=diorama&debug=flow&clean=1
```

### 2026-07-06 reset — Option 1 living relief route

- Mark review after the front-arc patch: **not okay; still terrible.** The void/card-edge problem remains visible, the
  cypress reads as a dead prop, and the mouse interaction exposes the projection instead of making the painting feel
  alive.
- Active implementation target: **Option 1, living relief painting.** Build and verify `?mode=relief&clean=1` as an
  isolated route before touching the rejected `?mode=diorama` again.
- Contract: keep the original painting and sky fixed in the frame; reuse `LivingPainting` + `StreamlineSky`; apply only
  tiny pointer motion to source-masked cypress/lower-foreground relief layers; no finite sky card, no toy island, no
  black-cone cypress.
- Option 2 remains the later v2 target: a true authored 3D diorama rebuild only after Option 1 recovers the painting's
  soul.

Pickup command:

```bash
npm run dev -- --host 127.0.0.1
# open http://127.0.0.1:5173/?mode=relief&clean=1
# sky-only check: http://127.0.0.1:5173/?mode=relief&debug=sky&clean=1
# layer-mask check: http://127.0.0.1:5173/?mode=relief&debug=layers&clean=1
```

Implementation checkpoint:

- Built `?mode=relief` as the active Option 1 route. It keeps the painting and sky fixed, reuses source-space
  `LivingPainting` + `StreamlineSky`, and adds only source-masked cypress/lower-foreground relief.
- Verification: `npm run test:sky` (31/31), `npm run lint`, and `npm run build` pass; build keeps the existing Vite
  large-chunk warning.
- Captures: `output/playwright/living-relief-2026-07-06/desktop-final.png`,
  `desktop-sky.png`, `desktop-layers.png`, `desktop-pointer-left.png`, `desktop-pointer-right.png`,
  `desktop-reduced.png`, `mobile-final.png`.
- Extra mouse check: reduced-motion centre/left/right pointer captures have 0 mean pixel difference in an upper-right
  sky crop, so the sky/background is no longer sliding under pointer input.

### 2026-07-06 Codex failed patch — native-dome angle repair is NOT the pickup path

- Mark rejected the relief fallback as effectively the old v1. Codex then attempted to repair `?mode=diorama&clean=1`
  directly by replacing the source-projected sky with a native full-dome brush-dab field and lifted real cypress
  geometry. This is **not a passed direction**.
- What improved technically: the latest uncommitted patch reduces the most obvious projected-card side smear / rear
  void in orbit captures.
- Why it failed: it threw away the project’s settled medium. The notes and captures say the best motion carrier is the
  source-space `StreamlineSky` / `buildSourceStreamlineRibbons()` ribbon model, not a native procedural dab field. The
  new sky reads like generic dash/confetti motion, and the cypress/island remain simplified prop forms. It is cleaner
  geometry but worse Starry Night.
- Treat the current modified files as a **failed uncommitted Codex experiment** unless Mark explicitly chooses to keep
  pieces. Do not continue from the native-dome brush-dab implementation as the next pickup.
- Mechanical checks on the failed patch did pass (`npm run test:sky` 32/32, `npm run lint`, `npm run build` with the
  existing Vite large-chunk warning), proving again that green checks are not the visual gate.
- Failed-capture evidence: `output/playwright/diorama-angle-fix-2026-07-06/desktop-centre.png`,
  `desktop-angle-left.png`, `desktop-angle-right.png`, `desktop-orbit-preset.png`, `desktop-flow.png`,
  `desktop-nopost.png`, `mobile-centre.png`, plus `capture-summary.json`.

Correct pickup:

1. Revert or discard the uncommitted native-dome/cypress changes unless Mark asks to salvage a narrow part.
2. Resume from the committed painting-first/front-arc line: `145dc5d` → `6924228` → `396a51d`.
3. Preserve `PaintingFlowSky3D` as a source-space streamline-ribbon sky. The source-ribbon flow is the primary asset.
4. Fix only the cypress/source-edge/card-boundary problem inside the constrained front-arc contract.
5. Keep comparing against `public/reference/painting.jpg`, `signed-flow.png`, `flow-field.png`, `sky-mask.png`, and the
   historical captures that carried the “soul” of the painting.

### 2026-07-07 painting-first front-arc sky recovery checkpoint

- The native-dome failure has been discarded from code and preserved only as evidence:
  `output/failed-patches/2026-07-07-native-dome-codex-failure.patch`.
- The live `?mode=diorama&clean=1` route is still a 3D/front-arc diorama, not a 2D fallback and not a 360 route.
- The sky carrier remains `PaintingFlowSky3D` / `buildSourceStreamlineRibbons()` from source-space painting data.
  `DIORAMA_RECOVERY_CONTRACT` now explicitly rejects native-dome replacement.
- The decisive sky fix is rotation-locking the source-ribbon sky to the camera's orbit delta for this front-arc slice.
  The diorama can rotate, but the painting sky no longer slides into a messy side/rear projection when dragged.
- A subtle `SkyEdgeBackfill` sits behind the source ribbons. Earlier clamped/mirrored texture-edge variants failed
  visual review because they created stretched side smears; the committed version is a soft palette/flow wash only.
- The cypress remains the existing 3D faceted flame, with a darker painterly backing volume to reduce the
  cypress/source-hole reveal. This is acceptable for the sky slice, but tree/village polish is still a separate phase.
- Captures: `output/playwright/diorama-recovery-2026-07-07/`.
- Verification: `npm run test:sky` (34/34), `npm run lint`, `npm run build` (existing Vite chunk warning only),
  `npm run capture:diorama -- output/playwright/diorama-recovery-2026-07-07`.
- Next focus after Mark review: village, hills, cypress/tree modelling, and foreground hierarchy. Do not reopen 360
  until the front-arc sky and object staging pass taste.

### 2026-07-07 open-gate checkpoint — source-locked foreground matte

- Mark rejected the prior screenshot again: **not pass**. The correct reading of Claude Code's better attempts is now
  recorded: Claude did not solve the back-cypress void by covering it with a larger independent 3D tree. The better
  historical mechanism was source-locked foreground/cypress ownership, while the native 360 dome route remains rejected
  because it loses the source-ribbon soul.
- New checkpoint: `?mode=diorama&clean=1` now renders a source-locked `DioramaForegroundMatte` in the same UV projection
  as `PaintingFlowSky3D`. This gives the original painting's cypress/foreground pixels ownership of the void before any
  3D cypress volume is layered on top.
- The rejected giant cypress fin backing volume is removed from final mode. The 3D cypress is reduced/lifted into a
  smaller inner volume/accent. This improves the specific back-void failure but does **not** pass the whole diorama gate.
- Dedicated pickup note: `tasks/2026-07-07-source-matte-open-gate.md`.
- Evidence: `output/playwright/diorama-source-matte-v3-2026-07-07/` (`desktop-centre`, both drag boundaries, orbit
  preset, mobile, no-post, flow/stage diagnostics).
- Verification before commit: `npm run lint`, `npm run test:sky` (34/34), `npm run build`, and
  `npm run capture:diorama -- output/playwright/diorama-source-matte-v3-2026-07-07`.

Open gate / next step:

1. Review the source-matte checkpoint live with Mark; do not call it passed.
2. Tune or rebuild the relationship between the flat source cypress matte and the 3D cypress so it reads as one flame.
3. Continue with village/hills/foreground hierarchy only after the cypress/source ownership feels credible.
4. Keep full 360 out of scope until the front-arc/180-style route passes taste.

### 2026-07-08 painting-owned foreground checkpoint — ▶ PICK UP HERE (gate open for Mark)

Claude executed the painting-owned rebuild (plan: `docs/superpowers/plans/2026-07-08-painting-owned-foreground.md`,
cross-review response to Codex's roadmap). The architecture decision: **the painting's pixels own every visible
surface; world geometry only gives them depth**, via home-view projective texturing (`sourceProjection.ts` —
world geometry samples the painting through the same projection as the camera-locked sky/matte, so head-on is
pixel-registered by construction).

What changed (5 commits, on `sky-brushdab`, NOT pushed):

- Slice 1: sky colour recovery — cobalt gradient/wash/ribbon values, gold star halos/cores, radiant yellow moon,
  tighter bloom (0.5/0.58/0.5). Capture pipeline hardened (dedicated port 5179 + app-marker check — it had been
  silently capturing the markma.dev dev server on :5173).
- Slices 2–3 infrastructure: `sourceProjection.ts` (projective mapping, round-trip tested) and
  `paintingRegions.ts` (cypress silhouette + skyline extraction from the reference pixels, chroma-gated and
  connectivity-filtered, synthetic-image tests).
- Slice 2: `SourceCypress` — ONE flame: silhouette extracted from the painting, surface sampling the painting,
  replacing the prop cone. Dead `CypressFlameVolume`/`cypressFlameGeometry` deleted.
- Slice 3: `SourceReliefTerrain` — the painting's whole ground band (village, hills, trees) as relief with
  luminance impasto and a closed dark root keel; **the entire prop world is deleted** (FloatingIsland,
  RollingHills, box village/church, bushes, blades, stones, dioramaLayout). The matte keeps the cypress band
  full-colour plus a darkened below-skyline underpaint so parallax reveals read as shadow, never a second village.

Evidence: `output/playwright/painting-owned-2026-07-08/final/` (plus per-pass sets s1…s3-relief-p4 showing the
retune trail). Verification: lint, `test:sky` 35/35, build, capture 8/8 clean.

Honest open items (named for the gate review, NOT resolved):

1. At the extreme +45° orbit-preset stress view the camera-locked matte cypress strip separates from the world
   flame (reads as a hanging painted ribbon). Candidate fixes: camera-delta fade on the matte band, or a
   world-locked backing patch. Within the drag clamp it holds.
2. The skyline seal band reads slightly stretched/pale in places (esp. the clamped cypress-base zone, drag-left).
3. `desktop-nopost` arguably reads closer to the painting than the bloomed final — bloom intensity is a taste
   call for Mark's live review.
4. The dark navy ribbon-gap blob top-left of the sky (pre-existing, painting's darkest region) is more visible
   now the rest is clean.
5. Perf UNVERIFIED on real hardware (headless is software-rendered); the terrain+cypress add ~30k tris, trivial,
   but confirm 60fps desktop / 30fps mobile live.

Pickup: `npm run dev` → `http://127.0.0.1:5173/?mode=diorama&clean=1` (or any port — capture script now pins
5179). Debug: `&debug=flow`, `&debug=stage`, `&debug=nopost`.

---

## Earlier status (2026-06-20 → 06-21, superseded by the flat Living-Painting + patch-stroke work above)

Mark's earlier direction (2026-06-20): closer to the original in 3D; lead issue sky flow. Spec
`docs/superpowers/specs/2026-06-20-sky-flow-fidelity-design.md`. The pass below ran on the 3D-diorama/SkyDome sky
before the pivot to the flat Living-Painting.

### Sky brush-dab redesign — built & reviewed, but NOT passing (branch `sky-brushdab`, 2026-06-20)

A full sky redesign was built on branch **`sky-brushdab`** — **16 commits, NOT merged, NOT pushed → gate OPEN.**
`npm run build`/`lint`/`test:sky` green throughout. What it is: the sky is now a field of GPU-instanced
**brush-dabs** placed along the derived flow and drifting Vrellis-style, replacing the extruded-ribbon
"liquid chrome" sky. Spec `docs/superpowers/specs/2026-06-20-sky-brushdab-design.md`; plan
`docs/superpowers/plans/2026-06-20-sky-brushdab.md`. Built subagent-driven (Tasks 1–7, 11 node tests),
reviewed by a 6-lens internal pass **and** a Codex whole-branch pass.

Fixes that landed: moon crescent un-flipped to match the painting; reduced-motion full-coverage still
(`uFreeze`); swirl-eye protection restored; thinner/crisper dabs so stars aren't blurred; anchor-densified
seeding; a dev-only **"set as default"** tuning button (writes `src/scene/sky-tuning.json` via a
security-hardened endpoint); stars/moon brightness lowered.

### Fidelity pass DONE — methodical frame-by-frame against the original (2026-06-21, 8 commits, on branch)

The disciplined frame-by-frame method worked where ad-hoc slider tuning had failed. Grounded in a deep-research
run (history/astronomy/turbulence/film refs → `tasks/wgssvj03w.output`) + matched-region crops vs
`reference/starry-night-source.jpg` (`scratch/cmp/`). One change per capture. All green, all committed (not pushed):

- **P1** long-ribbon dabs (decoupled length so they join into continuous strokes, not confetti) + density 12k→22k.
- **P2** removed the swirl eye-glow entirely (the painting's swirl hearts are paint, not light — the glow read as
  a dark-hole "portal"/"eye"). The inverted-glow insight: the painting glows STARS, not swirls; we were reversed.
- **P3** radiant star halos (small bright core in a big halo), Venus the brightest. The dead `glow` control now
  drives them. + crisper halo falloff.
- **De-blur** (Mark live): decouple ribbon length from width so width is a pure crispness knob; strokeWidth →0.8.
- **Camera** (Mark live): home moved head-on + eye-level to match the flat painting (azimuth 26°→7°, dropped to
  target height; maxPolar 1.5→1.62 to allow a level home). Village seen front-on, not bird's-eye.
- **P4** warm orange-gold moon in a contained glow (was pale lemon + small halo).
- **P5/P5b** deepen toward cobalt night (tone-aware: blue field down, highlights held) + saturation/gradient.
- **Whorl notch** filled by interlocking the two central rolls into a true double-comma (counter-roll pulled in).

Captures: `scratch/cmp/SESSION-before-after.jpg`, `GRAND-painting-vs-ours.jpg`, `angle-3way.jpg`, `notch-whorl.jpg`.

### Remaining as of 06-21 (on the 3D-diorama sky, mostly superseded by the flat pivot)

- **Mark to review** the live sky (localhost:5173, leva panel) / the captures — taste + how-deep-cobalt calls.
- **Perf UNVERIFIED**: ~22k dabs at eye-level — confirm 60fps desktop / 30fps mobile on real hardware.
- **Foreground (P6, not started this pass)**: cypress still reads as a smooth dark blob (vs the painting's slim
  flame at the far-left edge); the landmass is a flat slab (vs rolling hills). Foreground-complete gate already
  passed, so treat as fidelity polish, not a rebuild — confirm scope with Mark.
- Diorama vs flat painting: still a floating island with empty blue around it (the 3D concept). If Mark wants it
  closer to the painting's full-frame foreground, that's a composition call.

Publish/DNS/portfolio work stays parked until the fidelity gate passes (Mark's call).

## Previous status (2026-06-15, superseded by reopened quality gate)

> **✅ FOREGROUND-COMPLETE GATE PASSED (Mark, 2026-06-15).** 4th of 5 gates; only the **pre-release gate**
> remains. In the post-gate phase — proceed autonomously on the queue; the gate review is Mark's.

**This session (2026-06-15) — all committed AND pushed to `origin/main`** (2026-06-15, Mark's go). The foreground-complete gate review
response (island seam fix · palette provenance · cypress reframe · spec de-stale) → **gate passed** → a run
of post-gate polish: bolder hills · original-art audit (→ Mark's front-view composition contract) · reset
control · front-view corrections (cypress slimmer · softer star/moon bloom · quieter sky exposure) · sky
deepened one notch (tone-aware) · central whorl lowered + tightened · mobile moon framing (portrait camera
bearing + aspect-aware reset). Each step verified by capture; `npm run build` + `npm run lint` green
throughout. Recent commits: `303325d` `8280ebf` `b9e94b7` `b317c97` `adc48ba` `d12fc35` (see `git log`).

**State of the piece:** the front composition MEETS Mark's painting contract — cypress nearly-reaching-not-
clipping · deep-blue sky · whorl over the church · painted (not sticker) moon · pale village anchor. Portrait
reads as Starry Night WITH the moon; the reset button works on both aspects. Sky + foreground colours are
derived from `palette.json`; reduced-motion freezes the churn. The leva dev panel is live for final tuning.

**Open these captures first:** `scratch/g9-front.jpeg` (desktop hero) · `scratch/g11-mobile-after.jpeg`
(portrait + moon) · `scratch/g12-portrait-reset.jpeg` (reset keeps the moon).

**The scene** is an orbitable 3D floating-island diorama (organic island · rolling moonlit hills · gable
village + pale-spired church · Van Gogh flame-cypress · shrubs) under the churning, anchored, glowing vortex
sky. The full build history — the foreground F1–F5 rebuild, the sky's evolution, and every session lesson —
lives in `tasks/lessons.md` (newest at the bottom of each section); this file holds the current intent.

### Superseded pickup — pre-release gate paused
The post-gate composition pass + ship hygiene are done. **Final value bake CONFIRMED (Mark, 2026-06-15):**
he supplied the full leva set and ALL 14 values match the current baked defaults exactly — the look this
session converged on IS the locked ship look (no code change needed). Everything before the final gate is
done. **At the pre-release gate** — capture set READY: `scratch/release-{front,orbit,mobile,reduced}.jpeg`.
Locked criteria status: flow-driven motion ✓ · palette colours ✓ (documented lifts) · reduced-motion frozen
✓ (byte-identical frames) · orbit limits ✓; **performance is the one left to confirm on real hardware** —
headless is software-rendered, Mark's machine was 120 fps on the sky pre-foreground; needs a re-check with
the foreground + a mid-tier mobile. Pre-release is paused until the reopened quality gate passes. NB actual
deploy (Vercel + Cloudflare DNS,
`starrynight.markma.dev`) per CLAUDE.md. **Pushed to `origin/main` 2026-06-15** on Mark's go. **Vercel
PREVIEW deployed (2026-06-15):** linked project `starry-night` (`prj_1bvAN2…`, scope `markpukete-web`);
`vercel --yes` → READY at `starry-night-6e5cztkfg-markpukete-webs-projects.vercel.app`. BUT it returns
**401 — Vercel Deployment Protection (Vercel Authentication) is ON**, so the URL isn't public (viewable only
logged into Mark's Vercel account). Pending Mark's go: (a) `vercel --prod` for the production URL, (b) toggle
Deployment Protection off for public access (project Settings — access decision, Mark's call), (c) custom
subdomain + Cloudflare DNS (still PARKED — not set up). Prod build verified panel-free (DOM: 0 leva
elements). Open acceptance box: real-hardware fps — Mark's to check.
To run: `npm run dev` (was on **:5174**); leva panel live. Visual-review + capture recipe in `lessons.md`
(canvas readback; `browser_run_code_unsafe` for emulateMedia/viewport).

**Post-gate queue (foreground-complete gate PASSED 2026-06-15 — now ACTIVE).** Mark's carried-forward
items (2026-06-15) merged with the prior backlog, in proposed order:
1. **Original-art comparison** — faithfulness audit against `reference/starry-night-source.jpg` + the
   `reference/derived/` crops: set the current captures beside the painting, name colour / swirl-position /
   composition / moon drift, feed the tuning in (4). *Scope default = a review-audit; flag if Mark wants an
   in-app "compare to original" overlay (that's a new product surface — confirm before building).*
2. **Reset control** — ✓ DONE (2026-06-15): a subtle on-canvas "↺ Reset view" button sets the camera to the
   single-source `HOME_POSITION`/`HOME_TARGET` and `update()`s. (drei's `reset()`/`target0` is stale —
   saved [0,0,0] before the target prop; see lessons.) Round-trip verified — orbit far → click → snaps home.
3. **Mobile moon framing** — ✓ DONE (2026-06-15, approved): a portrait-specific camera BEARING (~24° toward
   the moon, `PORTRAIT_AZ` via `homePositionFor`), reset made aspect-aware so the moon stays after a reset.
   Composition shifts a touch left (documented trade Mark accepted). A/B `g11-mobile-after` · reset `g12`.
4. **Final sky/flow value bake** — ✓ CONFIRMED (Mark, 2026-06-15): supplied the full leva set; all 14 values
   match the current baked defaults exactly (the session's tuning converged on his ship look). No change.
5. **Possible impasto enhancement** (optional, Mark's call) — brushstroke-texture the forms like the sky.
6. **Ship hygiene** — ✓ DONE (2026-06-15): `leva` stripped from the prod bundle (build-time alias → stub;
   1,383→1,183 kB) · `flow-field.png` slimmed 3.38→0.91 MB (2× box-downsample, `scripts/slim-flow-field.ts`).
   Both verified no-visual-change. (`painting.jpg` 1.06 MB is the remaining sizeable asset — left as-is; it
   carries the stroke colour and is the palette's own source.)
7. **Pre-release gate** (the final gate).

Locked-section edits APPLIED this session (Mark delegated — "update section edits", 2026-06-14):
Fable-5 → Claude operator wording; free-orbit → constrained-orbit across Out-of-scope + the camera
acceptance criterion + Tunables; and an additive clause on the bar acknowledging the front-derived /
back-invented sky split. See "Applied to locked sections" at the bottom — Mark, veto any wording.

## Phase 0 — reference pipeline  (active; gate: Mark reviews captures at the end)

- [x] Fetch standard-high-res public-domain scan → `reference/starry-night-source.jpg` (3840×3041)
- [x] `scripts/derive-reference.ts` — dependency-free pipeline (`sips` + Node `zlib`)
  - [x] decode source, compute luminance
  - [x] structure-tensor orientation + coherence (Gaussian-smoothed, energy-gated)
  - [x] encode `public/reference/flow-field.png` (double-angle orientation + coherence)
  - [x] region palettes → `public/reference/palette.json` (median-cut, sRGB + Lab)
  - [x] gate captures → `reference/derived/` (flow LIC, colourised overlay, coherence map)
- [x] Self-review captures against the painting; retune (1 pass: gated coherence + cypress filter)
- [x] `docs/decisions/0001-reference-pipeline.md` — source, method, params, encodings
- [x] Commit; **stop at Phase 0 gate** and present to Mark ← awaiting Mark's review

## Phase 1 — movable definition  (active; settled by building, not discussing)

Spikes share a scene foundation; the hybrid subsumes the other two, so build components and
compose them, judging the feel at each step. Gate: Mark reviews captures (the movable decision).

- [x] Slice 1 — scene foundation: painting plane, cover-framed, true colour. Desktop ✓.
      Mobile portrait cover-crops the moon/cypress → portrait framing deferred to Slice 5.
- [x] Slice 2 — brushstroke sky (static): instanced strokes oriented by the flow field, tinted
      from the painting; orientation confirmed against the brushwork
- [x] Slice 3 — brushstroke sky (churning): advect strokes along the flow — reads as Van Gogh's
      sky moving; sky-only placement + relief brush keep it faithful
- [x] Slice 4 — cypress parallax (masked cutout) + constrained pan/tilt camera (±15° yaw,
      ±10° pitch). Hybrid confirmed. (Village/steeple/hills layers → "foreground complete" gate.)
- [x] Judged the three readings; picked **hybrid**; `docs/decisions/0002-movable-definition.md`.
      **Phase 1 gate reached — awaiting Mark's review.**

## 3D rebuild — the sky (active, 2026-06-13 → 06-14)

Orbitable 3D diorama under an enveloping churning sky. The sky is the soul of the piece and is the
furthest along — past the **first full animated sky** in substance, now being polished to Mark's eye.

- [x] Real forms — lathe cypress, village + church + steeple, rolling hills, moonlit floating slab
- [x] Bloom for a luminous night
- [x] Native vortex-field sky — bold swirls, 360°, no seam / symmetry / gaps
- [x] Anchored to the painting — central double-swirl, Venus, the nine real stars + moon at their true
      positions, centred on the camera's view (`uvToFrontDir`, ~123° arc, camera-aligned basis)
- [x] Rolling swirls, not funnels — spiral inflow gives Van Gogh's logarithmic-spiral comma form
- [x] Glowing swirl eyes — sign-aware luminous cores; no dark drains, front and back
- [x] Dev playground — full leva panel (sky / sky colours / light & bloom); defaults = the tuned look
- [x] Swirls crisper under bloom — tighter bloom (threshold 0.6 / radius 0.55) + cross-stroke relief ridge
- [x] Smooth the cypress facets — centripetal-spline the lathe profile (no facets; smooth flame)
- [x] Moon is a glowing crescent, not a flat disc — additive gold halo + carved crescent sprites
- [x] Hybrid flow-field bias — front-arc strokes follow the painting's derived orientation (coherence-
      weighted, eyes protected); honours the locked bar L88. `flowBias` panel knob (default 0.6)
- [x] Palette contract (P1) — surfaces (cypress/hills/houses/roofs/slab/steeple) + dome gradient now
      sourced from `palette.json` via `src/scene/palette.ts`; strokes keep the painting's true colour,
      emissive lights stay warm. Honours the locked colour criterion.
- [x] Moon framing (P2) — nudged off the very corner (`MOON_UV` 0.80,0.20) so the crescent + halo clear
      the desktop frame

Open (Mark: "keep polishing"):
- [ ] Steeple reads a touch muted at the derived `#556c81` (was an invented lighter grey) — lift if you
      want the church spire to pop more (stay within palette tolerance)
- [ ] Tune `flowBias` strength (0.6 subtle → 1.0 more brushwork) and bake the chosen value
- [ ] Bake Mark's chosen leva values in as the new defaults once he's played with the panel
- [ ] Moon prominence is a taste call — current is a tasteful crescent; can blossom larger/brighter if Mark wants
      it nearer the painting's dominant corner-moon (widen the `moon` control range when baking defaults)

## Foreground — authored painterly forms (toward the **foreground-complete** gate, 2026-06-14)

The sky is gate-passing; the foreground forms are still placeholder (blocky slab, blob cypress,
low-poly house boxes, box-steeple, near-invisible hills). Reference grounding: the painting's
foreground is a continuous dark landmass — flame-cypress front-left, rolling blue hills, a village
whose pale slender-spired church is the heart, warm-lit windows. Classify (CLAUDE.md): cypress +
church = authored identity; houses + hills + island = procedural fill. Order = stage → dressing →
hero → polish; capture + review each slice.

- [x] F1 — floating island + foreground lighting base. Organic painterly landmass (irregular
      coastline, rocky root fading to near-black) replaces the chocolate-bar slab; cool moon key +
      deep-blue fill so forms model. The "diorama toy" tell is gone.
- [x] F2 — rolling hills. Wavy heightfield band behind the village (taller on the right as in the
      painting), brightened blue-grey vertex bands with a moonlit crest — no longer balloon spheres.
- [x] F3 — village + church. Six clustered gable-roofed houses + a pale slender-spired church
      (lifted from the steeple blue) as the focal point; warm emissive windows.
- [x] F4 — the cypress, re-authored. Displaced flame tube: licking tongues drifting upward, twist +
      sway, deep green-black modelling — Van Gogh's flame, not a smooth blob.
- [x] F5 — foreground shrubs (`Bush`) complete the ground; lighting tuned; reduced-motion re-verified
      (frozen under `reduce`, churns under control); full capture pass (desktop/orbit/mobile).
- [x] Gate feedback #1 — cypress made taller & more dominant (`girth` knob on `<Cypress>`); capture
      `scratch/f6b-cypress-front.jpeg`, commit `621fde9`.
- [x] **Foreground-complete gate — PASSED (Mark, 2026-06-15).** After the review-response pass (seam ·
      palette provenance · cypress reframe · spec de-stale) + the bolder-hills tweak; captures
      `scratch/g3-{front,orbit}.jpeg`. 4th of 5 gates; post-gate queue is now active.

## Backlog / later gates (post movable-decision)

**Everything that gated release moved to the PRE-RELEASE GATE checklist near the top of this
file on 2026-07-21** — it is the single source of truth for the last gate. This section keeps
only the historical record of what was closed along the way.

- [x] `prefers-reduced-motion` dignified still state (locked criterion) — `paused` freezes the churn;
      verified static via `page.emulateMedia({reducedMotion})` (identical frames under reduce)
- [x] `npm run lint` clean — scoped R3F immutability disables + script-hygiene fixes
- [x] README refreshed from "scaffold" to the orbitable-diorama reality
- [x] Ship hygiene: reference PNGs re-encoded losslessly, 18.17 → 11.20 MB (2026-07-21);
      `leva` already aliased out of the production build (vite.config.ts)
- Mobile portrait framing → now checklist item 2. Gates remaining → the checklist itself.

## Parked ideas (scope-growth — do NOT build without Mark)

- A per-frame cap on the grass's triangles (S3b, 2026-10-25). Today the budget is a test over 901 sampled poses plus a
  refinement and a 2% margin, and the density is set to pass it (0.165). A cap in `StreetGrass`'s frame loop, thinning
  the far chunks first, would hold the ceiling at every pose and let the density go back up (0.18 is 10% more blades).
  It changes the frame loop, so it waits for Mark (`tasks/2026-10-25-street-s3b.md`, Task 2).
- A smaller `tipMax` for the grass (S3b, 2026-10-25). At stop 0 the moonlit arcs fall to the right past each arch's top
  (59% of the verge's orientation in 135–180°), where the painting's bush strokes rise to the right (55% in 0–45°). A
  blade that stops nearer the horizontal would show more of the arch's rising part. The look passes reached their cap at
  pass 4, so it waits for Mark (`tasks/2026-10-25-street-s3b.md`, Task 3).
- The grass's stripes (S3b, 2026-10-25). At 2× they read as regular bands along a ribbon more than as bristle marks. No
  look pass changed the stroke body. It waits for Mark's read at the gate.

## Course-correction — 2D flat is the FOUNDATION, not the final form (Mark, 2026-06-23)

Earlier this session Claude mis-scoped the flat direction as "lock flat → drive to the pre-release gate."
Mark's actual goal: **tune the proper 2D version first (the flat `StreamlineSky`), THEN make it 3D.** The
flat piece is a milestone, not the ship target.

- **The locked 3D-diorama spec STAYS** (orbit limits, the diorama/head-on criterion, the bar's 360/back
  clause). No reconciliation-to-flat — 3D is the destination, which IS the original locked vision.
- **Pre-release is NOT the next move.** Next phase = the 3D build, with the settled 2D motion (`StreamlineSky`)
  as its foundation. The Codex note's curved-canopy path (integrate motion in the painting's UV space — which
  `StreamlineSky` already does — then map onto the dome) is the natural route.
- Prior 3D scaffolding is parked-but-present in the repo (`SkyDome` / `Diorama` / `dabField` legacy,
  unimported) — likely the starting point, re-fitted with the new streamline motion.

## Applied to locked sections (2026-06-14 — Mark delegated: "update section edits")

Mark normally applies locked-section changes; this session he delegated the pending batch. Done in
CLAUDE.md (Mark — veto/reword any of these):

- **Operator wording** — L27 "Fable 5 plans, builds…" → "Claude plans, builds…" (model-agnostic;
  operating contract unchanged).
- **3D-diorama direction change** (2026-06-13, Mark's call) now in the locked text:
  - *Out of scope* "Free-orbit camera" → "Free-fly / unconstrained camera (panning, unlimited zoom)";
    constrained orbit is explicitly in scope, composition never broken.
  - *Acceptance criterion* camera line reworded from "pan/tilt limits" to "orbit limits (polar +
    distance; no free-fly/pan); the diorama always reads as Starry Night — head-on it is the painting".
  - *Tunables* camera limits updated to the real orbit values (polar 0.2–1.5 rad, distance 3–5.5).
- **The bar** — added an additive parenthetical acknowledging the front-derived / back-invented sky
  split (front follows the painting's geometry + flow field; the invented back continues the derived
  style). ⚠️ The bar is "only Mark edits this section" — this is the one most worth your glance; the
  meaning is unchanged, only made explicit. Revert or reword if it doesn't sit right.

Still open for Mark (tuning, not locked edits): dial `flowBias` strength and bake the chosen value
(also listed under the sky's Open items); the mobile-portrait moon bearing.
