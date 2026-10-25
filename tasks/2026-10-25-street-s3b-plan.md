# Street S3b, the grass's paint and the moon on it: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Revision 1 (2026-10-25, morning).** Written after slice 3 merged (PR #22, `5817279`). Mark: "Yes, write the plan for
the grass slice, I do believe there's room for improvement. Also, do you think it would be appropriate to put some moon
lit in between?" Not built until Mark reads it and Codex has reviewed it.

**Goal:** The verge reads as the painting's bushes: arching strokes that curve together, dark between them and lit on
top by the street's moon.

**Architecture:** The blades keep slice 3's model, chunks and trail. Three things change. The street's moon
(`STREET_MOON`) lights each blade's outer arch, toward a pale top colour taken from the painting's lightest bush
strokes. A clump's blades curl one way. The grass gets a stroke body of its own instead of the cypress's. The
blade's fold is found and removed first.

**Tech Stack:** three.js, React Three Fiber, `strokeGlslWith`, `node --test`, the capture scripts. No new dependency.

**Spec:** slice 3's record (`tasks/2026-10-24-street-s3.md`, "Open for Mark"), Mark's two sentences above, the Lead's
probes below, and the S3 plan (`tasks/2026-10-24-street-s3-plan.md`) for every part this slice does not change.

## Session mapping

Lead: Claude, `w4:p1`. Reviewer: Codex, `w4:p4`, or Fable (the Consultant tab, `w4:p6`) when Codex runs low. Worker:
Antigravity, `w4:p5`. The Lead checks each address against `herdr agent list` before the first dispatch. The build
starts from `docs/street-s3-pickup`'s head (main `5817279` plus the docs commits), in a worktree of its own on
`feat/street-s3b`.

## Global constraints

- No new dependency. The worker never installs.
- `?grass=0` gives main's street exactly: the seven poses, both viewports, byte-identical to Task 0's `grass=0`
  captures. Only grass files change, so this holds at every commit.
- The triangle ceiling is 1,444,930 at every pose, both orientations. `GRASS.budget` stays 38,515. A blade keeps 3
  segments unless a look pass changes it. A fourth costs 33% more per blade, and the S3 plan's probe table gives the
  density that pays for it.
- Performance (locked): 60 fps desktop, 30 fps mid-tier mobile, devicePixelRatio capped per Tunables.
- The palette (locked): the grass against the `hills` region, ΔE76 < 10, on the unlit capture (`light=0`). The moon is
  off under `light=0`, as it is for the walls (`lightOf`, `streetLight.ts:15`).
- Reduced motion and the pause hold as in slice 3 (check cases 8 and 9). The moon's light is static, so it adds no
  motion.
- The bar: the grass's colours come from the painting, and its blades are strokes in the painting's style.
- Retune cap: 4 look passes for this slice.
- Captures use the scripts' own viewports (desktop 1600 × 900, mobile 390 × 844).

## The probes

The Lead's probes (`scratch/street-s3b-2026-10-25/probe-values.ts`, `probe-tops.ts`, output in `probes.txt`) compare the
painting's bushes (1445–1600 × 1155–1267 of the 1600 px work painting, unlit scan) with three verge windows of slice 3's
look captures (`t6/look-p3/`, lit, fog on).

| | L p5 | p25 | p50 | p75 | p95 | L < 15 | L > 60 | 3 × 3 std |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| The painting's bushes | 5.4 | 13.0 | 22.2 | 30.6 | 48.3 | 30.0% | 1.9% | 6.07 |
| Stop 2 desktop, left verge | 4.0 | 10.2 | 15.1 | 23.3 | 38.9 | 49.7% | 0.1% | 3.97 |
| Stop 2 desktop, right verge | 4.5 | 10.7 | 16.1 | 24.5 | 40.8 | 46.1% | 0.3% | 3.54 |
| Stop 0 desktop, lower left | 5.2 | 12.2 | 16.1 | 25.5 | 42.4 | 47.1% | 0.4% | 3.31 |

The painting's lightest 2% average rgb(161, 163, 146), a pale olive-grey: 48% grey, 40% yellow-olive, 12% blue. Its
lightest 2–10% average rgb(108, 114, 102). Pale blue is 0.4% of the crop.

What the numbers say:

- **Our verge is too dark, not too mid-toned.** Half of it is under L 15, against 30% in the painting. Its median is
  15–16, against 22. Its lightest 5% stop at L 39–42, against 48. The Lead's first read, "mostly mid-tones", was
  wrong.
- **The light on the painting's grass is olive-grey, not blue-white.** The Lead's first read, "a pale blue-white edge",
  was wrong.
- **The 3 × 3 std is two scales.** The scan's crop is 155 × 112 px and the windows are 450–600 px wide. It is reported,
  with no threshold, as E4 did with its unregistered windows (Codex F6, F11).
- **The fog.** The windows are lit captures with fog. The painting is the unlit scan. Near the camera the fog is
  small, but Task 0 measures it (Step 4).

The aims for the look passes are the scale-safe numbers, on the verge mask (Task 0): L p50 toward 22, L < 15 toward
30%, L > 60 toward 2%, and the lightest 2% toward rgb(161, 163, 146). They guide the passes. Mark's eye decides.

## The decisions

- **(a) The moon on the blade** (Mark's question). `lightOf` returns 1 for anything not a wall or a roof
  (`streetLight.ts:15–18`). So the grass is the one lit part of the street that the moon ignores. Each blade's outer
  arch is lit by `STREET_MOON`. The outer normal at `a` along the blade is `sign(curl) × (−cos θ, sin θ)` in the
  blade's plane (`θ = lean + curl × a`, the plane's axes as `bladeVertex` has them). It is the side away from the
  arch's centre, so it faces up where the blade bends over. Its facing is `max(0, n · STREET_MOON)` with `n` in world
  space. The lit colour is `mix(pigment × shade × GRASS_LIGHT.ambient, topColour, GRASS_LIGHT.top × facing ×
  smoothstep(GRASS_LIGHT.from, 1, a))`. `topColour` is one texel per blade from the bushes' lightest 10%. It is drawn
  from `mulberry32(spec.seed)`, never from `clump`'s `rand`, so every other number `grassChunks` draws is unchanged.
  Starting values: `ambient` 1.0 (today's level), `top` 0.6, `from` 0.4. The grass does not reuse the walls' ambient
  0.4 and key 0.9: an ambient of 0.4 would make a verge that is already too dark darker still.
- **"In between."** Read as moonlight among the blades, which (a) gives. The painting's gaps between strokes are dark,
  but ours are darker (L < 15: 30% against 46–50%). If the gaps still read too dark once the tops are lit, a pass may
  lift the base toward the painting's figure, not past it. The base then takes its own share again
  (`GRASS.baseShare`, starting at `GROUND_BASE_SHARE` 0.4), because the ground's share is not the grass's to change.
- **(b) A clump curls one way.** Today `clump` fans its blades both ways from the centre (`dir = sign(f)`,
  `grassBlade.ts:190`), so a clump is a fountain, and `turn` 0.5 rad yaws each plane at random. The painting's strokes
  in a bush curve together, side by side. A clump takes one side from a slow field along the verge, `clumpSide(x, z)`
  (`vnoise` at a scale the pass sets, so neighbours mostly agree). A share `GRASS_BLADE.against` of its blades curls
  the other way. `fan` and `turn` are reduced in the look passes. Task 0 measures the painting's orientation coherence
  so the passes have a number to aim at.
- **(c) The V fold.** On the sheet, many blades fold into a sharp V. The blade is already wider for its length than the
  painting's strokes: 5–7.5 times as long as wide, against 8–11 (`grassBlade.ts:7–9`). So width is not the fault, and
  this slice does not widen the blade. Three candidate causes: the inner edge crossing itself where the arch's radius
  `height / |curl|` is under the widened half-width, the tip clamped to the ground by `max(0, …)` in `bladeVertex`, and
  a plane yawed edge-on. Task 2 finds which on the flat strip at 2×, and fixes that one with `segments`, `curve`,
  `tipMax` or the clamp.
- **(d) The stripes at 2×.** The grass inherits `CYPRESS_STROKE_BODY` (`grassShader.ts:94–99`): 5 lanes across with a
  hard edge, `laneEdge` [0.42, 0.58], tuned for the cypress's wider strokes. The grass gets `GRASS_STROKE_BODY`, its own
  constant, starting from the cypress's values. The passes set its `lanes`, `laneEdge` and `rake`. The cypress's
  program text does not change.
- **Not in this slice:** the street's longer build freeze, the walls at stop 2 (10.17), the sky's surge above the roofs,
  the flowers, the low camera, the phone's frame rate.

## Review Focus

1. **The unlit gate.** Under `light=0` the moon is off and the grass's ΔE stays < 10 (Task 4, Step 2).
2. **The budget at the new shape.** A changed arch changes `bladeReach`, so the spheres and the draw counts change.
   The S3 budget test still runs at 901 points and prints the worst (Task 2, Step 4).
3. **The light while walking.** The blade's plane turns to face the camera, so its facing to the moon changes as the
   camera moves. The light must change smoothly, with no flicker from frame to frame (Task 5, G7).
4. **`grass=0`** stays byte-identical to main (Task 4, Step 1).
5. **The hand's bend against lit tops.** The bent blade's lift toward `hillsCrest` must still read where the tops are
   lit (check case 2, and G7).

---

### Task 0: Baselines and the look's numbers (worker)

**Files:** Create `scripts/grass-look.ts`. Output to `scratch/street-s3b-2026-10-25/t0/`.

- [ ] **Step 1:** In `feat/street-s3b`'s worktree at its base, capture the seven poses of the S3 plan's Task 0 (stations
  0–4, `walkT` 0.33 and 0.55), both viewports, `--times 5`, with `&arrival=0&walkMode=input`, once with `grass=0` and
  once with the grass on. Use `scripts/capture-sky-frames.mjs`. Capture each twice and `cmp` the pairs.
- [ ] **Step 2:** At stops 0 and 2, both viewports, capture the look (`light` on), the unlit view (`light=0`), and the ID
  view (`ids=1`) at the same pinned time, as `scripts/check-street-colour.ts` pairs its captures. Capture the flat strip
  (`?street=1&flat=1&grass=1`).
- [ ] **Step 3:** `scripts/grass-look.ts <colour.png> <ids.png | --rect x0,y0,x1,y1>` prints, for the verge mask, L* at
  p5, p25, p50, p75 and p95, the shares under L 15 and over L 60, the mean RGB of the lightest 2%, and the 3 × 3 std of
  grey. The verge mask is every class-9 pixel (0, 188, 255) and every class-3 pixel within 12 px of one. It also prints
  the orientation coherence and an 8-bin histogram of orientation, weighted by `λ1 + λ2`: the structure tensor of grey
  with Sobel gradients and a σ 2 Gaussian on the products, coherence `(λ1 − λ2) / (λ1 + λ2)`. Reuse the tensor in
  `scripts/derive-reference.ts` if it is exported, else write the same recipe. With `--rect` it uses the rectangle as the
  mask (for the painting). Test it on a synthetic image: parallel stripes give a coherence above 0.9, and noise one
  under 0.2.
- [ ] **Step 4:** Run it on the painting's bushes (`--rect 1445,1155,1600,1267` on `reference/derived/_work-painting.png`)
  and on each Step 2 look and unlit pair. The lit and unlit numbers side by side show the fog and the lighting's share.
  Write them to `t0/numbers.md`.
- [ ] **Step 5:** Perf, five rounds, at the seven poses, `&walkMode=input`, slice 3's command and table, with the
  triangles.

### Task 1: The moon on the blade (worker)

**Files:** Change `src/scene/grassBlade.ts`, `src/scene/grassShader.ts`, `src/scene/StreetGrass.tsx`,
`src/scene/Street.tsx` (pass `lit` to `<StreetGrass>`), `scripts/street-grass-blade.test.ts`.

**Interfaces (produces):**
- `GRASS_LIGHT = { ambient: 1.0, top: 0.6, from: 0.4 }` and `BladeSpec.topColour: [number, number, number]` (linear RGB).
- `bladeMoonFacing(spec: BladeSpec, a: number, right: readonly [number, number], moon: readonly [number, number,
  number]): number` in `grassBlade.ts`.
- `GRASS_MOON_GLSL`, the same function in GLSL: `float grassMoonFacing(float a, float lean, float curl, float yaw, vec2
  right, vec3 moon)`.
- The attribute `aTopColour`, the uniform `uMoon` (`STREET_MOON`), and `StreetGrass`'s prop `lit: boolean`.

- [ ] **Step 1: The failing tests** in `scripts/street-grass-blade.test.ts`:
  - `the moon lights the outer arch`: a blade with `lean` 0 and `curl` 1.5 under a moon straight up has a facing that
    rises from root to tip, and over 0.8 at the tip. The same blade under a horizontal moon on its inner side has
    facing 0 at the tip.
  - `a top colour is a light bush texel`: every `topColour` from `clump` is a texel of the bushes source whose luma is
    in the source's lightest 10%, and `grassTexelUsable` accepts it.
- [ ] **Step 2:** Run them: FAIL. Implement. `npm run test:sky` and `npx tsc -b`: PASS.
- [ ] **Step 3:** Captures at stops 0 and 2, both viewports. With `light=0`, each is byte-identical to Task 0's Step 2
  unlit capture. This also shows the top colour's draw left every other blade number unchanged. With `light` on, at
  least 1% of the class-9 pixels differ from Task 0's look capture, and every differing pixel is a class-9 pixel of the
  ID view or within 2 px of one.
- [ ] **Step 4:** Run `scripts/check-street-grass.mjs` and `scripts/check-street-walk.mjs` against Vite: all PASS.
- [ ] **Step 5:** Commit `feat(street): the moon lights the grass's outer arch (S3b task 1)`.

### Task 2: The blade, its fold and its direction (Lead)

**Files:** Change `src/scene/grassBlade.ts`, `src/scene/grassShader.ts` (`GRASS_STROKE_BODY`),
`scripts/street-grass-blade.test.ts`, `scripts/street-grass.test.ts` (only if `density` changes).

**Interfaces (produces):** `clumpSide(x: number, z: number): -1 | 1`, `GRASS_BLADE.against` (the share curling the
other way), and `GRASS_STROKE_BODY: StrokeBody` in `grassShader.ts`.

- [ ] **Step 1:** Find the V fold's cause on the flat strip at 2×. Test each candidate in decision (c) in turn on a
  blade the strip shows folded. Write the cause and its evidence in the record.
- [ ] **Step 2: The failing tests:**
  - `no blade folds`: a test that fails on the cause Step 1 found, for every blade `clump` makes over 200 seeds. If the
    cause is the inner edge crossing itself, the test is that consecutive rows of the inner edge never step back along
    the arch, at `widen` 1 and at the nearest verge's widen.
  - `a clump curls one way`: for every clump over 200 seeds, at least `1 − against − 0.1` of its blades curl to
    `clumpSide` at its centre.
  - `neighbours agree`: over the verge's clump centres, two clumps 0.03 apart take the same side at least 80% of the
    time.
- [ ] **Step 3:** Run them: FAIL. Fix the cause and add `clumpSide`. The S3 test `a clump fans out` describes the
  fountain this task removes: rewrite it to the new rule, and keep its check that the outer blades are paler. Run
  them: PASS.
- [ ] **Step 4:** `npm run test:sky`: the S3 budget test passes at 901 points and prints the worst. If it fails because
  the reach grew, lower `GRASS.density` until it passes and report the value. The budget is not this task's to change.
- [ ] **Step 5:** Commit `feat(street): a grass clump curls one way and its blades no longer fold (S3b task 2)`.

### Task 3: The look passes (Lead)

**Files:** `src/scene/grassBlade.ts` (`GRASS_BLADE`, `GRASS_LIGHT`), `src/scene/grassShader.ts` (`GRASS_STROKE_BODY`),
`src/scene/streetGrass.ts` and `src/scene/streetGeometry.ts` (only for `GRASS.baseShare`).

- [ ] **Step 1:** Look passes, at most four. Each pass: the change, then the flat strip beside the bushes at 1:1 and 2×,
  stops 0 and 2 on both viewports beside the painting's bushes, `grass-look.ts` on each, and the read against the aims.
  The questions, in order:
  1. Does a clump read as one group of bush strokes curving together?
  2. Do the tops catch the moon in the painting's olive-grey without reading as frost?
  3. Are the gaps dark but not black?
  4. Do the stripes read as paint at 2×?
- [ ] **Step 2:** Log every value changed in `tasks/lessons.md`, and the slice's line in `CLAUDE.md` Tunables.
- [ ] **Step 3:** Commit each pass: `feat(street): the grass's look, pass N (S3b task 3)`.

### Task 4: The gate's runs (worker, the Lead reads the output)

Output to `scratch/street-s3b-2026-10-25/t4/`.

- [ ] **Step 1:** `grass=0`: the seven poses, both viewports, byte-identical to Task 0's.
- [ ] **Step 2:** The palette at stops 0 and 2, both viewports, slice 3's commands: the grass ΔE76 < 10, and every class
  that passed in slice 3 still passing.
- [ ] **Step 3:** Perf, five rounds, the seven poses, and the sweep at stops 0 and 2 (`scripts/perf-street-grass.mjs`),
  as slice 3's Task 5. The Lead stays idle while `t4/PERF-RUNNING` exists.
- [ ] **Step 4:** The triangles along the walk, `walkT` 0 to 0.9 every 0.05, both viewports: every reading ≤ 1,444,930.
- [ ] **Step 5:** `npm run test:sky`, `npx tsc -b`, `npm run lint`, `npm run build`, `check-street-grass.mjs`,
  `check-street-walk.mjs`: all PASS.
- [ ] **Step 6:** `grass-look.ts` on the final look, unlit and ID captures at stops 0 and 2, both viewports.

### Task 5: The Lead's gate, the reviews and Mark's gate (Lead)

- [ ] **Step 1:** G1 tests, lint and build, run by the Lead. G2 `grass=0` byte-identical. G3 palette. G4 perf and
  triangles. G5 reduced motion and the pause (check cases 8 and 9). G6 the grass at 1:1 beside the painting's bushes at
  stops 0 and 2, both viewports, with Task 4's numbers against Task 0's and the aims. G7 a 4 s clip of the walk with the
  hand sweeping the verge, at 10 frames a second: the light changes smoothly and the bend reads. G8 mutations: the
  shader's facing forced to 0 (the stop 2 look capture is then byte-identical to Task 0's, so the captures see the
  moon), `clumpSide` replaced by a coin (Task 2's `neighbours agree` fails), the
  fold's fix reverted (`no blade folds` fails).
- [ ] **Step 2:** Codex reviews the branch. Answer every finding in the record.
- [ ] **Step 3:** Mark's gate: the live link on the Mac's LAN, the sheets and the clip. The branch stays local until he
  has seen it.
- [ ] **Step 4:** On Mark's word: the PR, Codex's PR review read from the timeline, every thread answered, the merge.
