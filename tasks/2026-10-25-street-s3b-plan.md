# Street S3b, the grass's paint and the moon on it: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Revision 1 (2026-10-25, morning, `128d0c3`).** Written after slice 3 merged (PR #22, `5817279`). Mark: "Yes, write the
plan for the grass slice, I do believe there's room for improvement. Also, do you think it would be appropriate to put
some moon lit in between?"

**Mark's answers (2026-10-25, morning).** "In between" means light on the blades: "The first one, light on the
blades." The base does not change in this slice. He then asked for the build: "When Codex's review lands, fix whatever
you need to fix. I'd like you to take on this particular slice yourself." The Lead builds every task. No worker is
used. Mark asked whether the worker should still read the plan for buildability. The Lead's answer: not needed when
the plan's author builds it, because the build answers that question.

**Revision 2 (2026-10-25, late morning).** Codex reviewed revision 1 (`scratch/street-s3b-2026-10-25/plan-review-codex.md`):
REVISE, nine findings, R1–R8 at P2 and R9 at P3, no P0 or P1. All nine are accepted and folded here:

- R1: the moon task comes first and is moon-only. G8 no longer compares the final head with main.
- R2: the top colour has its own texel filter, ranked within its eligible pool.
- R3: the flat strip renders the ground's shader, so it is a geometry check only. The look is judged on the street.
- R4: the lit, unlit and ID captures that share a mask are taken at pinned time 0, where every page's wind is at 0.
- R5: the fold's causes include the chords' facets, and its test covers every widening the walk reaches.
- R6: the paint's random numbers are separated from the layout's. The budget test refines around its worst points
  and keeps a 2% margin.
- R7: the moon's GLSL is checked by number in the page, for both curl signs, yaw and three `right` vectors.
- R8: `against` starts at 0.15, and the clump test is run where the side field takes each sign.
- R9: "scale-safe" is gone. The median is the one aim. The tails and the coherence are diagnostics.

Task 0 also found that `__streetReady` never waited for the sky. A loaded machine captured the street with no sky
(`t0/first-try/`). Task 0 adds a `__skyReady` seam. Every capture that draws the sky waits for both. The ID view draws
no sky and waits for the street alone.

**Revision 3 (2026-10-25, midday).** Codex confirmed revision 2 (`scratch/street-s3b-2026-10-25/plan-confirm-codex.md`):
REVISE. R1–R6 and R8–R9 are closed. Three P2s remain, and all three are folded here:

- C1: the ID view never mounts the sky, so it cannot wait for `__skyReady`. It waits for `__streetReady` alone (Task 0
  found this first: eight ID captures timed out).
- C2: `check-street-colour.ts` looked only for `-t5.png` and `.png`, so it missed a time-0 pair or could match a stale
  time-5 image. It gains `--time T`, which reads `-tT.png` only and requires both captures' times to be `[T]`.
- R7: case 14 tested the GLSL function, not its call in the material. A call with `yaw` 0 or a fixed `right` would have
  passed. The fix makes that call impossible to write: `grassMoonFacing` takes `grassBladeVertex`'s own arguments, and
  the lit shader passes it the same argument text, one constant in `grassShader.ts`. A shader test pins the call. Codex
  also asked for an anchor A comparison of the lighting. It is not added: the facing's only position-dependent input is
  `right`, the vector that already places the vertex, and case 11 checks anchor A's geometry. A translation does not
  change a direction.

**Goal:** The verge reads as the painting's bushes: arching strokes that curve together, dark between them and lit on
top by the street's moon.

**Architecture:** The blades keep slice 3's model, chunks and trail. The street's moon (`STREET_MOON`) lights each
blade's outer arch, toward a pale top colour taken from the lit edges of the painting's bush strokes. Then the fold is
found and fixed, and a clump's blades curl one way. The grass gets a stroke body of its own instead of the cypress's.

**Tech Stack:** three.js, React Three Fiber, `strokeGlslWith`, `node --test`, the capture scripts. No new dependency.

**Spec:** slice 3's record (`tasks/2026-10-24-street-s3.md`, "Open for Mark"), Mark's sentences above, the Lead's
probes below, and the S3 plan (`tasks/2026-10-24-street-s3-plan.md`) for every part this slice does not change.

## Session mapping

Lead and builder: Claude, `w4:p1`, for every task (Mark's answer above). Reviewer: Codex, `w4:p4`, or Fable (the
Consultant tab, `w4:p6`) when Codex runs low. The Lead checks each address against `herdr agent list` before each
dispatch. The build starts from `docs/street-s3-pickup`'s head (main `5817279` plus the docs commits), in a worktree
of its own on `feat/street-s3b`, served at `http://127.0.0.1:5196/`.

## Global constraints

- No new dependency.
- `?grass=0` gives main's street exactly: the seven poses, both viewports, byte-identical to Task 0's `grass=0`
  captures. Only grass files change, and one seam outside them, `__skyReady` in `PaintingFlowSky3D.tsx` (Task 0),
  which changes no frame.
- The triangle ceiling is 1,444,930 at every pose, both orientations. `GRASS.budget` stays 38,515. After Task 2 the
  budget test's worst point, refined, is at most 98% of it (decision (e)). A sampled walk plus a margin makes a wrong
  acceptance unlikely, not impossible. The S3 table gives densities for 1 to 3 segments only, so a fourth segment
  needs its density measured by the test.
- Performance (locked): 60 fps desktop, 30 fps mid-tier mobile, devicePixelRatio capped per Tunables.
- The palette (locked): the grass against the `hills` region, ΔE76 < 10, on the unlit capture (`light=0`). The moon is
  off under `light=0`, as it is for the walls (`lightOf`, `streetLight.ts:15`).
- Reduced motion and the pause hold as in slice 3 (check cases 8 and 9). The moon's light is static, so it adds no
  motion.
- The bar: the grass's colours come from the painting, and its blades are strokes in the painting's style.
- Retune cap: 4 look passes for this slice.
- Captures use the scripts' own viewports (desktop 1600 × 900, mobile 390 × 844). They wait for
  `window.__streetReady && window.__skyReady`, except the ID view, which draws no sky
  (`DioramaExperience.tsx:327`) and waits for `window.__streetReady`.

## The probes

The Lead's probes are in `scratch/street-s3b-2026-10-25/`: `probe-values.ts`, `probe-tops.ts` and `probe-usable.ts`,
with their output in `probes.txt` and `probe-usable.txt`, and the map `bush-tops-4x.png`. Codex reproduced every
number in `probes.txt`. They compare the painting's bushes (1445–1600 × 1155–1267 of the 1600 px work painting) with
three rectangles of slice 3's lit look captures (`t6/look-p3/`).

| | L p5 | p25 | p50 | p75 | p95 | L < 15 | L > 60 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| The painting's bushes | 5.4 | 13.0 | 22.2 | 30.6 | 48.3 | 30.0% | 1.9% |
| Stop 2 desktop, left verge | 4.0 | 10.2 | 15.1 | 23.3 | 38.9 | 49.7% | 0.1% |
| Stop 2 desktop, right verge | 4.5 | 10.7 | 16.1 | 24.5 | 40.8 | 46.1% | 0.3% |
| Stop 0 desktop, lower left | 5.2 | 12.2 | 16.1 | 25.5 | 42.4 | 47.1% | 0.4% |

What the numbers say:

- **Our verge is too dark, not too mid-toned.** Its median L is 15–16, against the painting's 22. The Lead's first
  read, "mostly mid-tones", was wrong.
- **The light on the painting's bushes is a pale grey-green, along the top edge of each arching stroke.**
  `bush-tops-4x.png` marks the crop's lightest 2%. Most of it lies along the upper edges of the dark arches. That is
  paint. The canvas shows only in the crop's lower right corner, and the brown rule catches it there. The grass's texel
  filter (`grassTexelUsable`) refuses 340 of those 347 texels, most as "canvas grey". Without the near-white and the
  brown, the lightest 2% average rgb(146, 158, 150) and the lightest 5% rgb(128, 138, 132). The Lead's first read, "a
  pale blue-white edge", was wrong.
- **Only the median is stable across scales** (Codex R9: box-filtering the crop moves the median from 22.2 to 22.0 but
  L < 15 from 30% to 17% and L > 60 from 1.9% to 0%). So the one numeric aim is the verge mask's median L toward 22.
  The tails, the lightest 2%'s colour, the 3 × 3 std and the coherence are diagnostics, reported with no threshold.
  Mark's eye on the matched sheets decides.

Task 0 re-bases these numbers on the verge mask at pinned time 0, on main.

## The decisions

- **(a) The moon on the blade** (Mark's question). `lightOf` returns 1 for anything not a wall or a roof
  (`streetLight.ts:15–18`). So the grass is the one lit part of the street that the moon ignores. Each blade's outer
  arch is lit by `STREET_MOON`, a world direction. With `θ = lean + curl × a` and the plane's axis `ax` from `right`
  and `yaw` as `bladeVertex` has it, the outer normal is `n = s × (−cos θ × ax.x, sin θ, −cos θ × ax.y)`. Here
  `s = sign(curl)` when `|curl| ≥ 1e-6` (the side away from the arch's centre, Codex's derivation), else `s = 1` when
  `θ ≥ 0` and `−1` otherwise (a straight blade's upper side, at `bladeVertex`'s own straight threshold). The facing is
  `max(0, n · STREET_MOON)`. `grassMoonFacing` takes `right` and the moon, both world directions, and no matrix. So
  anchor A, which is a translation, cannot reach it. The lit colour is `mix(pigment × shade × GRASS_LIGHT.ambient,
  topColour, GRASS_LIGHT.top × facing × smoothstep(GRASS_LIGHT.from, 1, a))`. Starting values: `ambient` 1.0 (today's
  level), `top` 0.6, `from` 0.4. The grass does not reuse the walls' ambient 0.4 and key 0.9, which would make a verge
  that is already too dark darker still. Under `light=0`, `grassInjection` emits main's text exactly, so the unlit
  program is main's program.
- **The top colour** is one texel per blade from the bushes crop. A texel is eligible under `grassTopUsable(r, g, b)`:
  not a near-white (`r + g + b < 520`) and not the canvas's brown (`r > 1.05 g` and `r > b`). The grey stays. The pool
  is the eligible texels ranked by luma, the lightest `GRASS_LIGHT.topShare` (0.05) of them, built once per painting.
  A blade picks from it with `mulberry32(spec.seed)`. `seed` is `clump`'s last draw, so the pick never touches `rand`
  and every other number `grassChunks` draws is unchanged.
- **"In between"** is light on the blades, which (a) gives (Mark's answer). The base under the grass does not change.
  If the gaps still read too dark once the tops are lit, the passes use the blade's own knobs: the root's shade
  (`GRASS_BLADE.shade`) and the inner blades' pigment.
- **(b) A clump curls one way.** Today `clump` fans its blades both ways from the centre (`dir = sign(f)`,
  `grassBlade.ts:190`), so a clump is a fountain, and `turn` 0.5 rad yaws each plane at random. The painting's strokes
  in a bush curve together, side by side. A clump takes one side from a slow field along the verge, `clumpSide(x, z)`
  (`vnoise` at a scale the passes set, so neighbours mostly agree). A share `GRASS_BLADE.against` of its blades, 0.15
  to start and never above 0.25, curls the other way. `fan` and `turn` are reduced in the look passes. The painting's
  coherence (0.56 on the crop) is a diagnostic: the structure tensor does not see which way a curve turns.
- **(c) The V fold.** On the sheet, many blades fold into a sharp V. The candidate causes: the inner edge crossing
  itself where the arch's radius `height / |curl|` is under the widened half-width (Codex: `height` 0.024, `halfWidth`
  0.003, `curl` 1.5 reverses at widen 6, a distance of 1.8), the chords' facets (three segments at `curl` 1.5 turn
  28.6° at each joint, with no crossing at all), the tip clamped to the ground by `max(0, …)` in `bladeVertex`, a plane
  yawed edge-on, the fragment's tip and dry-brush discards, and the hand's or the wind's push. Task 2 tells them apart.
  The nominal ratio (5–7.5 times as long as wide) does not bound the blades the street makes: on the real chunks it
  runs from 0.9 to 13 (Codex R5). So the width stays a visual call, open to the passes.
- **(d) The stripes at 2×.** The grass inherits `CYPRESS_STROKE_BODY` (`grassShader.ts:94–99`): 5 lanes across with a
  hard edge, `laneEdge` [0.42, 0.58], tuned for the cypress's wider strokes. The grass gets `GRASS_STROKE_BODY`, its own
  constant, starting from the cypress's values. The passes set its `lanes`, `laneEdge` and `rake`. The cypress's
  program text does not change.
- **(e) The layout no longer depends on the paint** (Codex R6). The street loads `/reference/painting.jpg`, and the
  budget test decodes `reference/derived/_work-painting.png`. `pigment` draws from `clump`'s `rand` in a loop that
  refuses texels, so the two images give different layouts: 22,662 blades and a worst point of 37,674 from the JPEG,
  22,171 and 35,838 from the PNG. Task 2 draws `seed` first and takes `pigment` and the top colour from
  `mulberry32(seed)`. Then both images give one layout, and the test measures the street's. This changes the grass's
  layout, so it waits for Task 2, after Task 1's comparison with main.
- **Not in this slice:** the street's longer build freeze, the walls at stop 2 (10.17), the sky's surge above the roofs,
  the flowers, the low camera, the phone's frame rate.

## Review Focus

1. **The unlit gate.** Under `light=0` the program is main's and the grass's ΔE stays < 10 (Task 1, Task 4 Step 2).
2. **The budget at the new shape.** A changed arch changes `bladeReach`, the spheres and the draw counts. The budget
   test refines around its worst points and keeps its margin after every change to the shape (Task 2, Task 3).
3. **The light while walking.** The blade's plane turns to face the camera, so its facing to the moon changes as the
   camera moves. The light must change smoothly, with no flicker from frame to frame (Task 5, G7).
4. **`grass=0`** stays byte-identical to main (Task 4 Step 1).
5. **The hand's bend against lit tops.** The bent blade's lift toward `hillsCrest` must still read where the tops are
   lit (check case 15, and G7).

---

### Task 0: Baselines and the look's numbers (Lead)

**Files:** Create `scripts/grass-look.ts`, `scripts/grass-look.test.ts`. Change `src/scene/PaintingFlowSky3D.tsx` (the
`__skyReady` seam beside the ready ref), `scripts/check-street-colour.ts` (`--time T`, Codex C2), `package.json`
(`test:sky`). Output to `scratch/street-s3b-2026-10-25/t0/`.

- [ ] **Step 1:** The seam: the sky's ready layout effect also writes `window.__skyReady`. Every capture that draws
  the sky waits for `window.__streetReady && window.__skyReady`.
- [ ] **Step 2:** Capture the seven poses of the S3 plan's Task 0 (stations 0–4, `walkT` 0.33 and 0.55), both
  viewports, `--times 5`, with `&arrival=0&walkMode=input`, once with `grass=0` and once with the grass on. Use
  `scripts/capture-sky-frames.mjs`. Capture each twice and `cmp` the pairs. Compare the `grass=0` set with slice 3's
  `t6/final/grass0b/`.
- [ ] **Step 3:** At stops 0 and 2, both viewports, at `--times 0`: the look (`light` on), the unlit view (`light=0`),
  the ID view (`light=0&ids=1`) and the lit ID view (`ids=1`). At time 0 every page's wind is at 0, so one mask fits all
  four (Codex R4). Run `scripts/check-street-colour.ts --time 0` on each unlit and ID pair. Capture the flat strip
  (`?street=1&flat=1&grass=1`) as a geometry check: it draws the blades with the ground's shader.
- [ ] **Step 4:** `scripts/grass-look.ts <colour.png> <ids.png | --rect x0,y0,x1,y1>`. Grey is Rec. 601 luma. The verge
  mask is every grass pixel of the ID view (0, 188, 255) and every ground pixel (255, 255, 0) within 12 px of one. It
  prints L* at p5, p25, p50, p75 and p95, the shares under L 15 and over L 60, the mean sRGB of the lightest 2%, and the
  mean 3 × 3 std of grey. It also prints the structure tensor's coherence, `Σ(λ1 − λ2) / Σ(λ1 + λ2)` over the mask
  shrunk by 7 px (Sobel gradients, a σ 2 Gaussian on their products), and an 8-bin histogram of the strokes' direction
  weighted by `λ1 + λ2`. Its tests: parallel stripes give a coherence over 0.9 in the right bin, white noise under 0.3
  (a σ 2 window leaves it near 0.23), and the shares count only the mask.
- [ ] **Step 5:** Run it on the painting's bushes (`--rect 1445,1155,1600,1267` on `reference/derived/_work-painting.png`)
  and on each Step 3 look and unlit capture with its own ID mask. Write them to `t0/numbers.md`.
- [ ] **Step 6:** Perf, five rounds, at the seven poses, `&walkMode=input`, slice 3's command and table, with the
  triangles. Nothing else runs while `t0/PERF-RUNNING` exists, Codex included.
- [ ] **Step 7:** Commit `test(street): the grass's look in numbers, and the captures wait for the sky (S3b task 0)`.

### Task 1: The moon on the blade (Lead)

**Files:** Change `src/scene/grassBlade.ts`, `src/scene/grassShader.ts`, `src/scene/StreetGrass.tsx` (it reads
`flags.light`), `scripts/street-grass-blade.test.ts`, `scripts/street-grass-shader.test.ts`,
`scripts/check-street-grass.mjs`.

**Interfaces (produces):**
- `GRASS_LIGHT = { ambient: 1.0, top: 0.6, from: 0.4, topShare: 0.05 }` and `BladeSpec.topColour: [number, number,
  number]` (linear RGB).
- `grassTopUsable(r: number, g: number, b: number): boolean`.
- `bladeMoonFacing(spec: BladeSpec, a: number, right: readonly [number, number], moon: readonly [number, number,
  number]): number` in `grassBlade.ts`.
- `GRASS_MOON_GLSL`, the same function in GLSL: `float grassMoonFacing(vec3 root, float a, float across, float
  height, float halfWidth, float lean, float curl, float yaw, vec2 right, float widen, vec3 moon)`. Its first ten
  arguments are `grassBladeVertex`'s. The lit shader passes both functions one argument string (Codex R7).
- The attribute `aTopColour` and the uniform `uMoon` (`STREET_MOON`).

- [ ] **Step 1: The failing tests:**
  - `the moon lights the outer arch` (street-grass-blade): for `curl` ±1.5, `lean` ±0.3, `yaw` 0 and ±0.4, three
    `right` vectors, and `a` 0.25, 0.5 and 1, `bladeMoonFacing` equals `max(0, n · STREET_MOON)` within 1e-6, where `n`
    is the unit normal of `bladeVertex`'s centreline by finite differences, on the side away from its second
    difference. A straight blade (`curl` 0) takes its upper side. Near `curl` 0 the sign convention can flip when
    `lean` and `curl` differ in sign, so `every blade curls by at least 0.5 rad` (street-grass-blade) pins that `clump`
    never makes such a blade.
  - `a top colour is a lit bush texel` (street-grass-blade): every `topColour` from `clump` is a texel of the bushes
    source, `grassTopUsable` accepts it, and its luma is in the eligible pool's lightest `topShare`. The test's painting
    gains one pale grey swatch that `grassTopUsable` keeps and `grassTexelUsable` refuses. A painting with no eligible
    texel in the bushes throws.
  - `the unlit program is main's` (street-grass-shader): `buildGrassMaterial` under `lit` false compiles to main's
    text, hashes `4b0b48f47e712dbb` (colour) and `87c32b59ccf433d6` (ID). The lit program differs and has its own
    cache key.
  - `the moon reads the blade's own arguments` (street-grass-shader): the lit vertex shader calls `grassMoonFacing(`
    with the text of `grassBladeVertex(`'s arguments and `uMoon`.
  - Case 14 of `check-street-grass.mjs`, the moon's GLSL by number: in the page, a fragment shader with
    `GRASS_MOON_GLSL` writes `grassMoonFacing` for the unit test's cases into pixels, at 255 per unit. Each reads back
    within 1/255 of `bladeMoonFacing`.
  - Case 15, the hand against lit tops: stop 0, `--times 0`, `vincent=0`, lit. With the hand held still on the verge
    point, the mean L* within 80 px of it is at least 2 above the same capture without the hand.
- [ ] **Step 2:** Run them: FAIL. Implement. `npm run test:sky` and `npx tsc -b`: PASS.
- [ ] **Step 3:** Captures at stops 0 and 2, both viewports, `--times 0`. With `light=0`, each is byte-identical to Task
  0's Step 3 unlit capture. With `light` on, at least 1% of the lit ID view's grass pixels differ from Task 0's look,
  and every differing pixel is a grass pixel of that ID view or within 2 px of one.
- [ ] **Step 4:** Run `scripts/check-street-grass.mjs` and `scripts/check-street-walk.mjs` against Vite: all PASS.
- [ ] **Step 5:** Commit `feat(street): the moon lights the grass's outer arch (S3b task 1)`.

### Task 2: The layout, the fold and the direction (Lead)

**Files:** Change `src/scene/grassBlade.ts`, `src/scene/streetGrass.ts` (`GRASS.density`), `src/scene/grassShader.ts`
(`GRASS_STROKE_BODY`), `scripts/street-grass-blade.test.ts`, `scripts/street-grass.test.ts`.

**Interfaces (produces):** `clumpSide(x: number, z: number): -1 | 1`, `GRASS_BLADE.against`, and
`GRASS_STROKE_BODY: StrokeBody` in `grassShader.ts`.

- [ ] **Step 1:** Find the V fold's cause. Take five blades folded on the street's stop 0 and 2 crops at 2×. For each,
  read its numbers back (the chunk and index from a projected root), then test each candidate in decision (c) on it:
  the inner edge's order, the chord angle at each joint, the clamp, the yaw, the discards and the push. The flat strip
  shows the geometry at the near widening only. Write the cause and its evidence in the record.
- [ ] **Step 2: The failing tests:**
  - `the layout is the paint's no longer` (street-grass): `grassChunks` on two paintings that differ in every texel
    gives the same roots, heights, leans, curls and yaws.
  - `no blade folds` (street-grass-blade): a test that fails on the cause Step 1 found. Its domain is every blade
    `grassChunks` makes, at its own tuft height, at widen 1 and at the widen of the farthest walk camera from its root.
    If the cause is the inner edge, consecutive inner-edge rows projected on the arch's tangent never step back. If it
    is the facets, no joint turns more than the angle Step 1 finds acceptable at 2×.
  - `a clump curls with its side` (street-grass-blade): over 200 clumps at centres where `clumpSide` is 1, at least 75%
    of the blades curl that way, and over 200 where it is −1, at least 75% curl the other. Main's fountain gives about
    50%, and fails.
  - `neighbours agree` (street-grass-blade): over the verge's clump centres, two clumps 0.03 apart take the same side at
    least 80% of the time.
  - The budget test (street-grass): after the 901 points, it refines around its five worst points at steps of 0.0001
    over ±0.005 and prints the worst. The worst is at most 0.98 × `GRASS.budget`.
- [ ] **Step 3:** Run them: FAIL. Draw `seed` first and paint from `mulberry32(seed)` (decision (e)). Fix the fold's
  cause. Add `clumpSide` and `against` to `clump`. The S3 test `a clump fans out` describes the fountain this task
  removes: rewrite it to the new rule, and keep its check that the outer blades are paler. Run them: PASS. If the budget
  test fails, lower `GRASS.density` until it passes and report the value. The budget is not this task's to change.
- [ ] **Step 4:** `npm run test:sky`: PASS.
- [ ] **Step 5:** Commit `feat(street): a grass clump curls one way and its blades no longer fold (S3b task 2)`.

### Task 3: The look passes (Lead)

**Files:** `src/scene/grassBlade.ts` (`GRASS_BLADE`, `GRASS_LIGHT`), `src/scene/grassShader.ts` (`GRASS_STROKE_BODY`),
`src/scene/streetGrass.ts` (`GRASS.density`).

- [ ] **Step 1:** Look passes, at most four. Each pass: the change, then crops of stops 0 and 2 on both viewports at 1:1
  and 2× beside the painting's bushes, `grass-look.ts` on each at `--times 0`, and the read. The budget test runs after
  every change to the shape. The questions, in order:
  1. Does a clump read as one group of bush strokes curving together?
  2. Do the tops catch the moon in the painting's grey-green without reading as frost?
  3. Are the gaps dark but not black?
  4. Do the stripes read as paint at 2×?
- [ ] **Step 2:** Log every value changed in `tasks/lessons.md`, and the slice's line in `CLAUDE.md` Tunables.
- [ ] **Step 3:** Commit each pass: `feat(street): the grass's look, pass N (S3b task 3)`.

### Task 4: The gate's runs (Lead)

Output to `scratch/street-s3b-2026-10-25/t4/`.

- [ ] **Step 1:** `grass=0`: the seven poses, both viewports, byte-identical to Task 0's.
- [ ] **Step 2:** The palette at stops 0 and 2, both viewports, slice 3's commands: the grass ΔE76 < 10, and every class
  that passed in slice 3 still passing.
- [ ] **Step 3:** Perf, five rounds, the seven poses, and the sweep at stops 0 and 2 (`scripts/perf-street-grass.mjs`),
  as slice 3's Task 5. Nothing else runs while `t4/PERF-RUNNING` exists.
- [ ] **Step 4:** The triangles along the walk, `walkT` 0 to 0.9 every 0.05, both viewports: every reading ≤ 1,444,930.
- [ ] **Step 5:** `npm run test:sky`, `npx tsc -b`, `npm run lint`, `npm run build`, `check-street-grass.mjs`,
  `check-street-walk.mjs`: all PASS.
- [ ] **Step 6:** `grass-look.ts` on the final look and unlit captures at stops 0 and 2, both viewports, at `--times 0`.

### Task 5: The Lead's gate, the reviews and Mark's gate (Lead)

- [ ] **Step 1:** G1 tests, lint and build, run by the Lead. G2 `grass=0` byte-identical. G3 palette. G4 perf and
  triangles. G5 reduced motion and the pause (check cases 8 and 9). G6 the grass at 1:1 and 2× beside the painting's
  bushes at stops 0 and 2, both viewports, with Task 4's numbers beside Task 0's. G7 a 4 s clip of the walk with the
  hand sweeping the verge, at 10 frames a second: the light changes smoothly and the bend reads. G8 mutations, each
  against the same revision unmutated:
  - The GLSL facing forced to 0: case 14 fails, and the stop 2 lit capture at time 0 differs in at least 1% of its
    grass pixels.
  - `clump` ignoring `clumpSide`: `a clump curls with its side` fails.
  - The fold's fix reverted: `no blade folds` fails.
  - `pigment` back on `rand`: `the layout is the paint's no longer` fails.
- [ ] **Step 2:** Codex reviews the branch, with the `__skyReady` seam named. Answer every finding in the record.
- [ ] **Step 3:** Mark's gate: the live link on the Mac's LAN, the sheets and the clip. The branch stays local until he
  has seen it.
- [ ] **Step 4:** On Mark's word: the PR, Codex's PR review read from the timeline, every thread answered, the merge.
