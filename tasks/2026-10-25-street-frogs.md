# The frogs: the record, 2026-10-25

Mark at the portal's gate: "the frog doesn't seem like a frog and I think we should put multipule frogs in different
location instead of just stop 0". He chose one frog near each stop and, at stop 4, the square's edge. The plan is
`tasks/2026-10-25-street-frogs-plan.md`, revision 2 (Codex's plan review and its bounded re-read folded). The evidence
is in `/Users/markma/Projects/starry-night/scratch/street-frogs-2026-10-25/`. The branch is `feat/street-frogs`,
stacked on the portal (`cc56207`), local, no PR.

## Task 1: the frog rebuilt (`1126ab2`)

A sitting outline, a folded back leg, a flat head with its eyes on top, five spots. Slim: 1,212 triangles
(`skin` band 0.45 to 0.95), because Fact 9 left no room for the first draft's 2,600 at the walk's tightest pose. The
group scales uniformly, so Vincent's moon shader, which uses `mat3(modelMatrix)`, needs no change. Vincent's strokes
keep their hash `79338a361cd6b11c`.

## Task 2: five frogs (`481072e`, the table measured in `5312024`)

`FROGS` holds each frog's stop, spot (`t`, lateral, `y`), its turn from side-on (`toward`, `face`) and its size. The
spot search measured each candidate in the render (`t2/`). Two changes from the plan, both in the plan's table:

- The ring test reads blades within three clearances, not two. At two, stop 0's gap had one blade, so the test
  rejected a frog that sits in a gap ringed by grass. Codex's re-read checked that the test still fails with no blades
  in the ring and with roots inside the clearance.
- Stop 1 turns `'away'`, not `'lane'`. Facing the lane it was 0.82 seen on desktop and 0.80 on the phone. Turned away,
  0.89.

## Task 3: the look passes (`b42f01e`), three of four

1. `FROG.size` 0.0108 (was 0.0086), and a lighter back. The size helped both viewports: at 0.0086 the phone saw the
   stop 0 frog at 15 px long. The lighter back turned the frogs blue-grey among the blades and lost the yellow-green
   stripes that find them.
2. The size kept and the back as before (`t3/p3/cmp-*.png`).
3. Stop 4's frog drawn from 1.1. At the common 0.5 it appeared from nothing at about 20 px on the open square
   (`t3/pop/`). At 1.1 it first draws at `t` 0.511, behind a near blade (`t3/pop2/pop4.png`). In the grass, the blades
   hide each frog where it first draws, so 0.5 stays there.

Seen and whole pixels at size 0.0108 (`t3/p3-vis.json`, desktop / phone):

| Stop | Seen | Whole px |
| --- | --- | --- |
| 0 | 0.99 / 0.98 | 803 / 234 |
| 1 | 0.88 / 0.89 | 449 / 158 |
| 2 | 0.96 / 0.95 | 794 / 270 |
| 3 | 0.95 / 0.94 | 799 / 278 |
| 4 | 0.99 / 0.99 | 398 / 137 |

No crop cut a frog. The shape's source at the gate: `frog.ts` SHA-256 `7c2aa1a05e9004aa…`.

## Task 4: the gate's runs (`t4/`)

The studio stashed and `git status --short` empty first.

- `npx tsc -b`, `npm run -s lint`, `npm run -s build`: clean. `test:sky` 359 of 359.
- `check-street-grass.mjs`: every case passes (`grass.log`, then 18 cases in `fix/grass.log` after the review's fix).
- `check-street-walk.mjs`: case 6 (K1) failed once, straight after the stash made the dev server reload ("a wheel
  before a blur moved him by 0.00344"). It passed on the next run on this branch and on its base, both at drift
  0.00000 (`walk2.log`, `walk-base.log`). Read as a timing flake in the check: the first wheel's walk had not settled
  in its 800 ms.
- The frame time (`perf/`), five rounds at stops 0 and 3, the branch and its base side by side in each round, dpr 1.5:
  p50 16.7 ms everywhere, p95 16.8 to 17.6 ms on both. Stop 0 is 732 triangles lighter than the base (the slim frog
  replaced the old one). Stop 3 draws two frogs, its own and stop 4's far one: 2,424 triangles and 14 draw calls more.
  The hand's sweep across the grass at stops 0 and 3, both viewports: mean 16.67 ms on both.
- The triangles in the browser (`tri-sweep.log`), 32 walk points on both viewports: every 0.01 from 0.25 to 0.40,
  0.295, and every 0.05 elsewhere. All 64 under 1,444,930. The tightest: desktop at 0.295, 1,444,499 (431 to spare),
  which Codex's model put at 1,444,511. The phone's tightest: 1,439,153 at 0.31.
- The clips (`clips/`): each stop's frog through the first blink, both viewports, real time and 5× slow, at 3×. The
  sheets `sheet-desktop.png` and `sheet-phone.png` hold each frog open and shut.

## Codex's branch review (`branch-review-codex.md`): FIX, then the fixes

- **F1, P2: the draw tests bypassed the component's own cull.** The unit tests judged the table with a predicate of
  their own, so a cull that drew every frog (3,173 triangles over the ceiling at `t` 0.33), hid every frog, or kept the
  common 0.5 still passed. Fixed in `8152937`: the seam `__frogsDrawn()` gives each group's `visible` as the frame left
  it, with its world place and the camera's, and case 18 of `check-street-grass.mjs` judges it at twelve poses by its
  own distances. Each of Codex's three regressions fails case 18 (`fix/mutants.txt`).
- **F2, P3: the plan and the test header still promised one frog at every pose.** Fixed in `9bc05b8`: one before `t`
  0.45, and a second later only at 0.8 or more, where its eyes are a pixel or two.

Codex's bounded re-read (`branch-rereview-codex.md`): FIX. F1 was still open for a cull that runs on its first frame
and stops, because case 18 loaded a fresh page at each pose: in a live walk that leaves stop 2's frog drawn at `t` 0.33,
737 triangles over the ceiling. F2 left two sentences in the plan's revision note. Fixed in `eca68c4`: one page walks
0.4, 0.33, 0.4, 0.45, 0.6, 0.45 by `__streetWalk.set`, and stop 2's and stop 4's frogs must flip both ways. That
mutant fails at `t` 0.33 (`fix/mutants.txt`). Codex's second read (`branch-reread2-codex.md`): both closed,
MERGEABLE.

## Open for Mark

- Do they read as frogs? The sheets and the live street: `http://192.168.0.148:5199/?street=1`.
- Stop 1's frog sits mostly behind blades. It measures 0.88 seen, but on the phone it is the hardest to find.
- One look pass is left of four.
