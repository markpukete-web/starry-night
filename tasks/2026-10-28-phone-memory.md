# The street on phones: the record

The plan is `tasks/2026-10-28-phone-memory-plan.md`. The evidence is in `scratch/phone-memory-2026-10-28/` (git-ignored):
the probe and snapshot readers in `tools/`, `main`'s numbers in `base/`, stage 1's in `spike/`, stage 2's in `stage2/`,
the gate's logs in `gate/`, the frames in `frames/`. The Lead built both stages: each is under 80 lines across files
it had read in full, so a brief would have been longer than the change. Codex read the plan in its pane.

## What changed

- **Stage 1 (`ef2e5ec`, `989840c`): R3F's initial `internal` released.** `ReleaseInitialInternal` in
  `DioramaExperience.tsx` empties the initial copy's `subscribers`, `interaction` and `initialHits` once the `Provider`
  has made the live copy. The initial copy had kept the unmounted diorama's 11 frame callbacks, and with them its
  cypress, its land and two painting decodes. `check-portal.mjs` case 2 now requires `__r3fInitialSubscribers()` to
  read 0 in the street.
- **Stage 2 (`57e3503`): the street keeps only what it reads after its build.** One memo in `Street.tsx` makes the
  build and its meshes and returns the meshes, the windows, the lamps and the counts, so the build's plain number
  arrays go when it returns. The street's cypress takes the street's painting (`BrushCypress` `painting`), and
  `useImageData` loads nothing for a null URL. The street's eight build meshes keep no vertex normals, and no `aClass`
  outside the ID views (Codex P3): `strokeGeometry` and `plainGeometry` take `normals`, true by default.

## The numbers

Headless Chrome as a 390 × 844 touch phone at dpr 3, against `vite build`. The main thread after a forced GC: the V8
heap used plus the ArrayBuffer stores. Chrome cannot model the iPhone's limit, so the numbers rank the cuts and no more.

| The street, entered | `main` (`c1c6fbc`) | Stage 1 | Stage 2 |
|---|---|---|---|
| Through the portal, moving sky (the default) | 72 + 217 = 289 MB | 72 + 161 = 233 MB | 18 + 145 = **163 MB** |
| Through the portal, `?sky=light` | 74 + 155 = 229 MB | 72 + 99 = 171 MB | 16 + 83 = **99 MB** |
| Direct `?street=1` | 72 + 137 = 209 MB | — | 15 + 121 = **136 MB** |

The renderer process after GC, through the portal with the moving sky: 636 MB on `main`, 517 MB at stage 2. Its peaks
move by about ±70 MB from run to run, so they are not ranked. The JS heap's peak during the entry: 145–147 MB used on
`main`, 130 MB at stage 2. The street's build still makes its plain arrays before it lets them go.

The stage 2 snapshot (`stage2/street-light.heapsnapshot`, `?sky=light`): no `arrays` owner, no `normal` buffer, one
`painting.jpg` decode. The decoded images are 39 MB (were 47): the sky's seven sources and the cypress's flow field
(29.7 MB), the street's painting (8.1 MB), the land's flow (1.2 MB).

## The checks

- tsc, lint (`eslint src scripts`) and `test:sky` (452) pass at `57e3503`.
- The frames, clocks pinned (`tools/frames.sh`, `capture-sky-frames.mjs`): stations 0 to 4 on the desktop and the
  phone, and the ID views `ids=1` and `ids=2` at stop 0, all 12 byte-identical to `main`'s. Looked at: the desktop's
  stop 0 and the phone's stop 3 show the whole street, Vincent, the lamps, the walls and the moving sky.
- Stage 1's mutation (`gate/mutation-1-no-release.log`): the release line removed, case 2 red ("R3F's initial internal
  holds 10 frame callbacks in the street"); restored, the tree clean and case 2 green.
- Stage 2 has no mutation: it changes memory, not behaviour. Its proof is the identical frames and the snapshot.
- `check-street-walk.mjs` passes at `57e3503` (`gate/walk-stage2.log`). `check-portal.mjs` passes in full at
  `57e3503` (`gate/portal-stage2-2.log`, every case through 13 and 9), after one run that failed on the case 2 (phone)
  race below (`gate/portal-stage2-1.log`).
- The Lead read the whole diff against `main`: the six source files and the check, nothing else.

## Found while gating: `check-portal.mjs` case 2 (phone) fails on `main`

4 of 4 runs on `main`'s build with `main`'s check (`gate/portal-main-*.log`), 2 of 4 on stage 1. Vincent's walk reads
`t` 0.00012 to 0.00054 on the first frame the check records as the street, and the check requires 0. `Street.tsx`
passes `reduced={reduced || hold}` to the walk, so once `place` flips the walk's `useFrame` can step in the same
browser frame, before the check's `requestAnimationFrame` records it. Under a millimetre, not visible. Not this
slice's: noted in `tasks/todo.md` for its own commit.

## Mark's iPhone

On the preview of `cd3f85e` (`https://starry-night-kxrkvpoz4-markpukete-webs-projects.vercel.app`), entered through
"Enter anyway". Mark: "it holds". Stage 3 is not needed now. It stays in the plan for a phone that fails later.

## Next

The PR against `main`, as a draft, then ready so Codex reviews it.
