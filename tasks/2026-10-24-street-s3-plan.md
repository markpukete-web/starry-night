# Street S3, the grass and the hand: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Revision 1 (2026-10-24, evening), for review.** Written while slice 2 waits for Mark's gate. Mark: "Okay carry on",
after the Lead said slice 3's plan would be written and reviewed but not built until he reads it. Every number comes
from the Lead's probes in `scratch/street-s3-2026-10-24/` (`probe-verge.ts`, `probe-chunks.ts`, gitignored), which
build the street on `feat/street-s2` and project with three's camera.

**Goal:** Grass stands along both edges of the lane, painted in the painting's strokes, and the visitor's hand moves
through it: the blades bend away under the hand and swing back after it.

**Architecture:** The blades are instanced strokes in short chunks along the lane. Each frame a chunk draws a prefix of
its blades, thinned by its distance from the walking camera, so the grass stays inside the triangle ceiling at every
point of the walk. The hand writes a trail map over the grass, and every blade reads it to bend. Each texel follows
D1's model: the push rises, then swings back as a damped cosine. With the grass on, the ground's strokes under it are
not built, and a dark base takes their place.

**Tech Stack:** three.js, React Three Fiber, the project's stroke shader (`strokeGlslWith`), `node --test`, the
capture scripts. No new dependency.

**Spec:** `docs/superpowers/specs/2026-10-23-village-street-design.md` (step 5, the Goals, C5, C8, C19, "The Lead's
calls", slice 3), the grass test on `spike/grass-hand` (`1bfb8c2`, `src/scene/grassSpike.tsx`), its lessons
(`tasks/lessons.md`, "The grass and the hand"), and Mark's read of it in `tasks/todo.md`.

## Session mapping

Lead: Claude, `w4:p1`. Reviewer: Codex, `w4:p4`, Fable (the Consultant tab, `w4:p6`) when Codex runs low. Worker:
Antigravity, `w4:p5`. The build starts from `feat/street-s2`'s head after Mark's slice 2 gate, in a worktree of its own
on `feat/street-s3`.

## Global constraints

- No new dependency. The worker never installs.
- `?grass=0` gives slice 2's street exactly. The stations, the walk points and the plain visit are byte-identical to
  Task 0's captures, and `buildStreet` without grass is deep-equal to today's.
- The triangle ceiling is 1,444,930 at every pose: the stations, the walk's points, both orientations. It is the
  diorama's own count, a proxy taken because the phone has never been measured (design C12). A reading of `?perf=1` on
  Mark's phone replaces it if he gives one.
- Performance (locked): 60 fps desktop, 30 fps mid-tier mobile, devicePixelRatio capped per Tunables.
- The palette (C5): the grass against the `hills` region, ΔE76 < 10 on the unlit capture, as Tunables sets.
- Reduced motion (locked): the hand still bends the grass, with no swing and no wind. Two frames 1 s apart are
  byte-identical once the hand has gone.
- The pause (C19) stops the grass's wind and swing with the sky and Vincent's walk.
- The bar: the grass's colours come from the painting, and its blades are strokes in the painting's style.
- Captures use the scripts' own viewports (desktop 1600 × 900, mobile 390 × 844). Unit tests project at aspect 1.6 and
  390 / 844.

## The probes

- **The budget.** Stop 0 renders 1,434,424 triangles on the desktop (slice 2's Task 0), 10,506 under the ceiling. The
  grass test's 30,000 blades of eight triangles each were 240,000.
- **The verge's ground.** The ground's strokes whose triangles lie 0.06 to 0.77 from the lane cost 60,538 triangles
  (`probe-verge.ts`: 50,068 on the path, 91,158 beyond). With the grass on, they are not built.
- **The grass's room** is 60,538 + 10,506 − 2,084 (Vincent) = **68,960** triangles at any pose. Stop 0 binds: every
  other pose measured in slice 2 renders fewer triangles.
- **The density.** The grass test's sampler gives a full density of 82,184 blades per square unit near its cameras
  (106,713 tries over 1.298 square units for 30,000 blades). Along the whole lane, thinned only by the distance from
  the lane, that density needs 144,527 blades: too many to draw at once.
- **The chunks** (`probe-chunks.ts`): per side, per lateral band 0.052–0.2, 0.2–0.4 and 0.4–0.765, per 0.05 of `t`,
  126 chunks. Each draws `ceil(n × min(1, (max(0.22, latIn) / max(0.22, d))²))` blades, where `d` is the distance from
  the camera to the chunk's box. At half the test's density, three segments a blade (six triangles):

  | Pose | Landscape | Portrait |
  | --- | --- | --- |
  | stop 0 | 52,992 (116 calls) | 36,072 (74) |
  | stop 1 | 61,320 (92) | 40,278 (73) |
  | stop 2 | 47,490 (60) | 43,248 (44) |
  | stop 3 | 61,908 (44) | 40,704 (25) |
  | stop 4 | 24,288 (9) | 22,866 (6) |
  | walk 0.33 | 59,040 (76) | 38,058 (52) |
  | walk 0.55 | 63,876 (54) | 39,030 (35) |

  Over the walk's 901 points the worst is 69,960 at `t` 0.279 landscape, 1,000 over the room. So the density starts at
  0.45 of the test's. One chunk per stretch of lane, both sides and every band together, is worse (up to 262,818):
  a wide chunk is rarely culled and is always near the camera.

## The decisions

- **Where.** Both edges of the lane, `t` −0.06 to 0.97, from 0.052 to 0.765 off the lane's centre. Not within 0.012 of
  a house, 0.07 of the cypress's trunk, or inside `STREET_SQUARE`. The static density falls with the distance from the
  lane, `min(1, (0.22 / lat)²)`, because the walking camera never comes nearer than that.
- **The chunks** as the probe has them. Each chunk is one `InstancedBufferGeometry`: one blade template and one set of
  per-blade attributes. Its bounding sphere is set from its blades, so three culls it. Its blades are in random order,
  so a prefix is an even sample. Each frame, `instanceCount` is set from `grassDrawCount`.
- **The blade** starts from the test's lesson (`tasks/todo.md`, "Not yet Van Gogh"). The painting's bushes are fat
  curved comma strokes that fan out from a clump, dark at the centre with pale yellow-green edges. The test's were thin
  straight spikes in an even grey-green. Task 1 settles the shape on a flat strip beside the painting's bushes. Fixed
  before it: three segments, height 0.024 with the test's tuft noise and a shorter verge (lesson: 0.014 left gaps), and
  the half-width widened with the camera's distance in the vertex shader (`× max(1, d / 0.3)`, the test's rule, now per
  frame). The colours come from the test's two sources: the field strip (`STREET_SOURCES.field`) and the bushes at the
  painting's lower right, 1420–1600 × 1110–1267.
- **The ground under the grass.** With the grass on, `buildStreet` drops each ground stroke whose middle sample lies
  0.06 to 0.77 off the lane. A dark base takes its place: a strip along each side of the lane from 0.052 to 0.765, as
  the path's segments are laid. Its colour is the field source's darkest 20%, and it eases to the ground's base over
  its outer 0.1, so a gap between blades reads as shadow (Mark's crop: the ground's long strokes read through the grass
  as planks). The base carries the ground's class, 3.
- **The hand's trail is a map, not touch points.** The design names D1's model (`src/scene/landTouch.ts`). D1 holds
  four touches, and a sweeping hand needs every point it passed (lesson: "A trail needs a map, not touch points"). So
  the map carries D1's model per texel. The map covers the blades' rectangle, about 1.93 × 2.64 (`probe-chunks.ts`), at
  0.005 a texel: about 387 × 528. A texel under the hand rises over `LAND_TOUCH.rise` (0.12 s) to the hand's push.
  The push points away from the hand's centre, with falloff `(1 − q)²` over the radius 0.045 (the test's). Where two
  stamps meet, the stronger push is kept. After the hand leaves, the texel swings back as D1's damped cosine
  (`tau` 0.9 s, `period` 1.3 s, closed between `windowStart` 4 s and `windowEnd` 5 s). The CPU steps only texels with a live push. It writes them as
  two bytes, `128 + 127 × push`, and uploads the map only on a frame that changed it.
- **Without the swing** (reduced motion or the pause), a released texel falls to zero over `rise`, and never passes
  through it.
- **The hand along its path.** A frame stamps the segment from the last hit to this hit, every half radius, so a fast
  sweep leaves a line, not dots.
- **The hand is re-cast every frame** (C8). The grass's frame loop runs after the walk's (priority −1), so it casts
  the pointer through this frame's camera onto the plane at half the blades' height. A still mouse or a resting finger
  keeps bending the grass under it while Vincent walks.
- **The pointer.** On a computer the mouse over the canvas is the hand (design step 4). The canvas's cursor is `grab`,
  the system's open hand (design: "a hand icon, not a pointer"), set while the street shows and restored after. On a
  phone a finger down on the canvas is the hand while it stays down. One exception: a gesture whose `pointerdown` lands
  in Vincent's padded hit box (slice 2's `hitBox`) never bends grass, because that gesture is the tap. Only the primary
  pointer is the hand. `pointerup`, `pointercancel`, a lost focus and a hidden page end it.
- **Vincent parts the grass** (the design's call). His place is stamped each frame with radius 0.03 (his hem is 0.0186
  across), so the blades at the path's edge lean away as he passes.
- **The wind** is the test's (0.0025, its gusts). It runs on the street's life clock (`lifeTimeUniform`), so the pause
  and reduced motion freeze it with the trees' sway.
- **The ID pass**: class 9, `vec3(0.0, 128.0 / 255.0, 1.0)`, which reads back as (0, 188, 255) (slice 2's C1). It goes
  in `src/scene/streetMaterial.ts` (slice 2's F3 fix), the one copy of the classes.
- **The flag**: `grass`, on in street mode, `?grass=0` off. The test's URL knobs are not kept.
- **Not in this slice**, each for Mark: the flowers by the path (his idea of 2026-10-23, in `tasks/todo.md`), the low
  camera in the grass (the test's `grassView=low`, closer to Jeroen's clip, while the design keeps eye level), and a
  second portal.

## Review Focus

1. **A fling.** A hand swept across the screen in one frame leaves a continuous trail, not dots (Task 3,
   `stampSegment`).
2. **A pointer over the sky or a roof.** A ray that does not meet the grass's plane inside the map leaves no stamp. A
   ray through a house meets the plane behind it and bends hidden grass: harmless, and accepted (Task 4, case 2).
3. **The tap and the hand on a phone.** A tap on Vincent toggles his walk and bends nothing. A drag on the verge bends
   and does not toggle (Task 4, case 5).
4. **A finger that leaves.** A `pointercancel` or a lift off the canvas ends the hand: no stuck push (Task 4, case 5).
5. **The frame rate while the hand moves.** The map's upload runs only on frames it changes, and Task 5 measures a
   sweep as well as a still frame.

---

### Task 0: Baselines (worker)

- [ ] **Step 1:** In `feat/street-s3`'s worktree at its base, capture stations 0–4 and `walkT` 0.33 and 0.55, both
  viewports, `--times 5`, with `&arrival=0&walkMode=input`, into `scratch/street-s3-2026-10-24/t0/`. Capture each twice
  and `cmp` the pairs (the test of the capture, not of the code).
- [ ] **Step 2:** Perf, five rounds, at the same seven poses, `&walkMode=input`, slice 2's command and its `numbers.md`
  table, with the triangles.
- [ ] **Step 3:** Run `node scratch/street-s3-2026-10-24/probe-verge.ts` and `probe-chunks.ts k=0.45 segs=3 dt=0.05`
  from the worktree, and copy their output into `numbers.md`.

### Task 1: The blade's look (Lead)

**Files:** Create `src/scene/grassBlade.ts`, `scripts/street-grass-blade.test.ts`. Modify `src/scene/streetGeometry.ts`
(`buildFlatPanel` gains a strip of clumps under `?flat=1&grass=1`), `package.json` (`test:sky`).

**Interfaces (produces):** `GRASS_BLADE = { segments: 3, height: 0.024, halfWidth, curve, clump, fan, shade }` (the
look pass sets the values not given here); `bladeTemplate(): { positions: number[]; stroke: number[]; indices: number[] }`
in blade space (root at the origin, up +y, across +x, `stroke` x along 0.5 → 1 so the body shapes the tip only, the
lesson); `type BladeSpec = { x: number; z: number; yaw: number; height: number; halfWidth: number; lean: number; curl:
number; colour: [number, number, number]; seed: number }`; `clump(rand: () => number, painting: ImageData2D, x: number,
z: number, height: number): BladeSpec[]`; `GRASS_SOURCES` (the field strip and the bushes).

- [ ] **Step 1:** Tests: the template has `segments + 1` rows and `2 × segments` triangles; its width tapers to the
  tip; `clump` is deterministic for a seed; every colour comes from a texel of a source (no near-whites, the test's
  `r + g + b < 520`).
- [ ] **Step 2:** The flat strip: one row of clumps across the flat panel's ground, seen by `FLAT_VIEW`, captured
  beside the painting's bush crop at matched scale (the blade's height against the bushes' stroke length at 1:1).
- [ ] **Step 3:** Look passes on the strip, at most four. Each: the change, the sheet, the read, the lessons. The
  question: does a clump read as the painting's bush strokes (curved, fanned, dark at the centre, pale at the edge)?
- [ ] **Step 4:** Commit `feat(street): the grass's blade, curved strokes fanned in clumps, on the flat panel (S3 task 1)`.

### Task 2: The blades, the chunks and the ground (worker)

**Files:** Create `src/scene/streetGrass.ts`, `scripts/street-grass.test.ts`. Modify `src/scene/streetGeometry.ts`
(`buildStreet`'s options gain `grass: boolean`, default false, beside `lit`), `package.json` (`test:sky`).

**Interfaces:**
- Consumes: Task 1's `clump`, `bladeTemplate`; `pathPoint`, `pathTangent`, `laneDistance`, `STREET_HOUSES`,
  `STREET_CYPRESS`, `STREET_SQUARE`, `walkPose`, `STATION_T`.
- Produces: `GRASS = { t: [-0.06, 0.97], lat: [0.052, 0.765], bands: [0.052, 0.2, 0.4, 0.765], dt: 0.05, r0: 0.22,
  density: 0.45, full: 82184, house: 0.012, cypress: 0.07, verge: [0.06, 0.77], budget: 68960 }`;
  `type GrassChunk = { blades: BladeSpec[]; latIn: number; box: { min: [number, number, number]; max: [number, number, number] } }`;
  `grassChunks(painting: ImageData2D): GrassChunk[]`; `grassDrawCount(chunk: GrassChunk, camera: [number, number,
  number]): number`; `grassRect(chunks: GrassChunk[]): [x0: number, z0: number, width: number, depth: number]`;
  `inVerge(x: number, z: number): boolean`.

- [ ] **Step 1: The failing tests** in `scripts/street-grass.test.ts`:
  - `the grass keeps off the houses, the tree, the square and the path`: every blade's root obeys the exclusions and
    `lat ≥ 0.052`.
  - `the density falls with the distance from the lane`: per band, the blade count is within 10% of
    `full × density × area × mean(min(1, (r0 / lat)²))` less the excluded area.
  - `a chunk's prefix is an even sample`: for every chunk with ≥ 40 blades, the first half's mean `lat` is within 15%
    of the chunk's.
  - `the grass fits its room at every point of the walk`: at the 901 points `t = k / 1000` and both orientations, the
    sum over the chunks whose bounding sphere meets the camera's frustum (as three culls) of `grassDrawCount × 2 × segments` is ≤ `GRASS.budget`. The test
    prints the worst point. Negative control: at `density` 0.5 the same sum exceeds the budget somewhere (the probe's
    69,960 at 0.279).
  - `a near chunk draws all, a far one a share`: a chunk whose box contains the camera's ground point draws every
    blade. The same chunk seen from 1.0 away draws `ceil(n × (max(r0, latIn) / 1.0)²)`.
  - `the map is small`: `grassRect`'s sides over 0.005 are ≤ 1024 each.
  - `the ground without grass is today's`: `buildStreet(p, f, m)` deep-equals `buildStreet(p, f, m, { lit: true, grass: false })`.
  - `with grass the verge's strokes go and its base comes`: no ground stroke's middle sample is `inVerge`. The ground's
    triangles fall by 60,538 ± 5% (the probe counted triangles by their centres, the build drops whole strokes), and the test prints the number. Points sampled across the band hit a base triangle. The base's triangles are ≤ 2,000.
- [ ] **Step 2:** Run them: FAIL. Implement. Run `npm run test:sky` and `npx tsc -b`: PASS.
- [ ] **Step 3:** Commit `feat(street): the grass's blades in chunks along the lane, the verge's dark base (S3 task 2)`.

### Task 3: The trail (worker)

**Files:** Create `src/scene/grassTrail.ts`, `scripts/grass-trail.test.ts`. Modify `package.json` (`test:sky`).

**Interfaces (produces):** `TRAIL = { texel: 0.005, radius: 0.045, feet: 0.03, rise: LAND_TOUCH.rise, tau:
LAND_TOUCH.tau, period: LAND_TOUCH.period, windowStart: LAND_TOUCH.windowStart, windowEnd: LAND_TOUCH.windowEnd }`; `type Trail` (the rect, the size, per-texel push
and state, the live list, `bytes: Uint8Array` of RG pairs); `createTrail(rect: [number, number, number, number]):
Trail`; `stampSegment(trail: Trail, from: [number, number] | null, to: [number, number], radius: number, now: number):
void`; `stepTrail(trail: Trail, now: number, swing: boolean): boolean` (true when `bytes` changed).

- [ ] **Step 1: The failing tests:**
  - `a held stamp rises and pushes away`: stamped each frame at one point, the texel at 0.6 of the radius reaches its
    full push by `rise` (± one frame at 1/60) and points away from the centre. The centre texel's push is 0.
  - `released, it swings back and closes`: its push changes sign between `period / 4` and `period / 2` after the
    release, and is exactly 0 from `windowEnd`. The live list is empty then.
  - `without the swing it never crosses zero`: with `swing` false the released push falls monotonically to 0 by
    `rise` and never changes sign.
  - `a fling is a line`: one `stampSegment` from (x0, z0) to (x0 + 0.5, z0) leaves every texel on the line between them
    with a push > 0.5. Negative control: stamping only the end point leaves a gap.
  - `the stronger push is kept`: a weak stamp over a strong one leaves the strong one.
  - `outside the map nothing is stamped`, `outside the radius nothing changes`.
  - `the bytes`: push −1, 0 and 1 encode as 1, 128 and 255.
- [ ] **Step 2:** Run them: FAIL. Implement. Run `npm run test:sky`: PASS.
- [ ] **Step 3:** Commit `feat(street): the hand's trail, D1's rise and swing in every texel (S3 task 3)`.

### Task 4: The grass in the street (worker)

**Files:** Create `src/scene/StreetGrass.tsx`, `src/scene/grassShader.ts`, `scripts/check-street-grass.mjs`. Modify
`src/scene/Street.tsx` (mount `<StreetGrass>` unless `flat` or `grass=0`, build the street with `{ lit, grass }`),
`src/scene/streetMaterial.ts` (class 9), `src/scene/streetMode.ts` (`grass: boolean`), `scripts/street-mode.test.ts`.

**Interfaces:** Consumes Tasks 1–3 and slice 2's `hitBox` and `__vincentBox`. Produces the seams
`window.__grassHand(x: number | null, y?: number): void` (a client point, or `null` to lift the hand),
`window.__grassHit: [number, number] | null` (this frame's world hit), `window.__grassPeak: number` (the largest
|push| in the map), `window.__grassLive: number` (the live texels), `window.__grassCount: number` (blades built).

- [ ] **Step 1:** Flag tests: `grass` true by default, false for `grass=0`. Run: FAIL. Implement: PASS.
- [ ] **Step 2:** `grassShader.ts`: the vertex body builds the blade from the template and the per-blade attributes,
  widens it with the camera's distance, adds the wind on `lifeTimeUniform`, and bends it by the map at its root (the
  test's `gH = a²` profile, its drop of `0.7 × |offset| × a`). The fragment body turns a bent blade paler, toward
  `PALETTE.hillsCrest` (lesson: "A bent blade must change colour as well as shape"). The stroke body is the street
  ground's (`strokeGlslWith({ ...CYPRESS_STROKE_BODY, gaps: null, dryFrom: 0.85, fray: 0.08 })`, the test's).
- [ ] **Step 3:** `StreetGrass.tsx`: the chunks as meshes, `instanceCount` per frame, the trail stepped and uploaded
  in one `useFrame` (priority 0, after the walk's −1), the hand's listeners and cursor as "The decisions" give them,
  Vincent's feet stamped from `vincentPlace(t)`, `swing` false when `reduced || still`.
- [ ] **Step 4:** `check-street-grass.mjs`, after `check-street-walk.mjs`'s pattern, each case its precondition first:
  1. The hand bends: stop 0, `__grassHand` at a verge point (precondition: `__grassHit` inside the map): `__grassPeak`
     > 0.5 within 0.3 s. A capture differs from one without the hand, at the same pinned time, within 60 px of the
     point, and is identical beyond 300 px.
  2. The sky and the roof: `__grassHand` at a point above the horizon: `__grassHit` null and `__grassLive` 0.
  3. The walk re-casts: the hand held still on the verge, ArrowUp for 1 s: `__grassHit` moves by > 0.1.
  4. The swing and its end: the hand held still on the verge for 0.5 s, then `__grassHand(null)`: `__grassPeak` falls
     below 0.05 and rises again (the swing), and `__grassLive` is 0 by 5.5 s.
  5. The phone (`walkMode=auto`, touch, 390 × 844): a tap on Vincent's box toggles `auto` and `__grassPeak` stays 0
     (precondition: a tap elsewhere does not toggle). A touch-drag across the verge gives `__grassPeak` > 0.5 and
     leaves `auto` as it was. A touch ended by `touchCancel` leaves `__grassLive` 0 by 5.5 s.
  6. Reduced motion: the hand held still bends (> 0.5). After `__grassHand(null)`, `__grassPeak` never rises again, and two
     captures 1 s apart, from 1 s after the release, are byte-identical.
  7. The pause: with "Pause motion" on and no hand, two captures 1 s apart are byte-identical.
  8. `grass=0`: `__grassCount` undefined, the canvas's cursor is not `grab`.
- [ ] **Step 5:** Run it against Vite: eight PASS lines. `npm run lint`, `npm run build`: clean.
- [ ] **Step 6:** Commit `feat(street): the grass by the lane and the hand that parts it (S3 task 4)`.

### Task 5: The gate's runs (worker; the Lead reads the output)

**Files:** `scripts/check-street-colour.ts` (class 9 as `grass: { idR: 0, idG: 188, idB: 255, minArea: 2000, ref:
refHills }`, `refHills` the weight-averaged mean of `palette.json`'s `hills` swatches). Output to
`scratch/street-s3-2026-10-24/t5/`.

- [ ] **Step 1:** `grass=0`: the seven poses, both viewports, byte-identical to Task 0's.
- [ ] **Step 2:** The palette at stops 0 and 2, both viewports, slice 2's commands with the grass on: the grass ΔE76
  < 10, every class that passed in slice 2 still passing.
- [ ] **Step 3:** Perf, five rounds, the seven poses, `&walkMode=input`: frame time and triangles (≤ 1,444,930). Then
  one more run at stops 0 and 2 with a scripted sweep of `__grassHand` across the verge, back and forth every 2 s.
  The Lead stays idle during perf (`t5/PERF-RUNNING`, as slice 2).
- [ ] **Step 4:** Reduced motion: `scripts/check-reduced-motion.mjs` in street mode, if it takes the street's URL.
  Otherwise Task 4's case 6 is the record.
- [ ] **Step 5:** Captures for the Lead: the seven poses, both viewports, and stops 0 and 2 with the hand mid-sweep.
- [ ] **Step 6:** Commit `test(street): the palette gate measures the grass (S3 task 5)`.

### Task 6: The Lead's gate, the look passes and Mark's gate (Lead)

- [ ] **Step 1:** Read every Task 5 output. G1 tests, lint and build. G2 `grass=0` byte-identical. G3 palette. G4 perf
  and triangles. G5 reduced motion and the pause. G6 the grass at 1:1 beside the painting's bushes at stops 0 and 2,
  and the verge from the phone, and whether a hand on the verge lights the sky above it (B's surge is on in the
  street, C19). G7 a 4 s clip of the hand sweeping the verge while Vincent walks, recorded with the
  Playwright browser at 10 frames a second, `bringToFront` before each.
- [ ] **Step 2:** Look passes on what G6 and G7 name, at most four.
- [ ] **Step 3:** Codex reviews the branch. Answer every finding in the record.
- [ ] **Step 4:** Mark's gate: the live link on the Mac's LAN, the sheets, the clip, and what is open (the flowers,
  the low camera, the phone's frame rate).
