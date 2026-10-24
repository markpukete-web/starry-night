# Street S3, the grass and the hand: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Revision 2 (2026-10-24, evening).** Revision 1 (`618939c`) was reviewed by Codex: REVISE, eight P2 findings, S1–S8,
all accepted and folded here (`scratch/street-s3-2026-10-24/plan-review-codex.md`, the record lists each). Written
while slice 2 waits for Mark's gate. Mark: "Okay carry on", after the Lead said slice 3's plan would be written and
reviewed but not built until he reads it. Every number comes from the Lead's probes in `scratch/street-s3-2026-10-24/`
(`probe-verge.ts`, `probe-removal.ts`, `probe-fit.ts`, gitignored), which build the street on `feat/street-s2` and
project with three's camera.

**Revision 3 (2026-10-24, evening).** Codex's confirmation of revision 2 (`plan-confirm-codex.md`): S2–S6 and S8
closed, S7 an acknowledged deferral for Mark, and three new P2 findings, all accepted and fixed here. C1: the culling
pad is proved at the farthest camera, not the nearest, because the widening grows with distance. C2: the camera check
projects through a reference camera built from the walk's pose, not through the camera that cast the ray. C3: the dark
base sits at y = 0.001, between the ground's underpaint and its strokes.

**Goal:** Grass stands along both edges of the lane, painted in the painting's strokes, and the visitor's hand moves
through it: the blades bend away under the hand and swing back after it.

**Architecture:** The blades are instanced strokes in short chunks along the lane. Each frame a chunk draws a prefix of
its blades, thinned by its distance from the walking camera, so the grass stays inside the triangle ceiling at every
point of the walk. The hand writes a trail map over the grass, and every blade reads it to bend. Each texel follows
D1's model: the push rises, then swings back as a damped cosine. With the grass on, the ground's strokes under the
grass are clipped away, and a dark base takes their place.

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
- The triangle ceiling is 1,444,930 at every pose, both orientations. It is the diorama's own count, a proxy taken
  because the phone has never been measured (design C12). A reading of `?perf=1` on Mark's phone replaces it if he
  gives one, and the grass's density rises with the room it gives.
- Performance (locked): 60 fps desktop, 30 fps mid-tier mobile, devicePixelRatio capped per Tunables.
- The palette (C5): the grass against the `hills` region, ΔE76 < 10 on the unlit capture, as Tunables sets.
- Reduced motion (locked): the hand still bends the grass, with no swing and no wind. Two frames 1 s apart are
  byte-identical once the hand has gone.
- The pause (C19) stops the grass's wind and its trail with the sky and Vincent's walk.
- The bar: the grass's colours come from the painting, and its blades are strokes in the painting's style.
- Captures use the scripts' own viewports (desktop 1600 × 900, mobile 390 × 844). Unit tests project at the same
  aspects, 1600 / 900 and 390 / 844 (S1).

## The probes

- **The ceiling's headroom.** The most a pose renders without grass is 1,434,674 (slice 2's Task 0, stop 0 on the
  phone), and Vincent adds 2,084: 8,172 under the ceiling. Task 0 measures every 0.05 of the walk on slice 2's head to
  show whether stop 0 is the most (S1).
- **The ground under the grass** (`probe-removal.ts`, S2). The ground's array holds the ground (class 3, 152,252
  triangles) and the path (class 4, 49,512). Most ground strokes are long and cross the grass's edge. Removing only the
  strokes wholly inside the grass's footprint frees 18,236 triangles. Clipping them, dropping each class-3 triangle
  whose three corners all lie in the footprint, frees 38,484 with the footprint out to 0.765 off the lane, and
  **32,343** out to 0.6. The plan clips to 0.6: the ground's strokes run on under the grass's sparse outer band, so no
  cut edge shows beyond the blades.
- **The grass's room** is 8,172 + 32,343 − 2,000 (the dark base's most) = **38,515** triangles at any pose.
- **The density.** The grass test's sampler gives a full density of 82,184 blades per square unit near its cameras
  (106,713 tries over 1.298 square units for 30,000 blades).
- **The chunks** (`probe-fit.ts`, S1): per side, per lateral band 0.052–0.2, 0.2–0.4 and 0.4–0.765, per 0.05 of `t`.
  Three culls each chunk by its bounding sphere, so the probe does too, padded by the blades' reach (0.04 across, 0.05
  up). The 0.04 is a first figure: Task 2 pads each chunk by its own computed reach (C1), and its budget test runs on
  those spheres. Each chunk draws `ceil(n × min(1, (max(0.22, latIn) / max(0.22, d))²))` blades, where `d` is the distance from
  the camera to the chunk's unpadded box. The worst of the walk's 901 points, at 1600 / 900 and 390 / 844:

  | Segments a blade | Density (share of the test's) | Worst triangles | at `t` | Stop 0 blades | Draw calls (most) |
  | --- | --- | --- | --- | --- | --- |
  | 1 (2 triangles) | 0.68 | 38,028 | 0.307 | 14,348 | 121 |
  | 2 (4 triangles) | 0.34 | 38,016 | 0.250 | 7,149 | 121 |
  | 3 (6 triangles) | 0.22 | 36,942 | 0.252 | 4,645 | 121 |

  Fewer segments buy more blades. A one-segment blade bends as a whole and draws its curve in the fragment shader.
  Task 1 chooses, on the look.

## The decisions

- **Where.** Both edges of the lane, `t` −0.06 to 0.97, from 0.052 to 0.765 off the lane's centre. Not within 0.012 of
  a house, 0.07 of the cypress's trunk, or inside `STREET_SQUARE`. The static density falls with the distance from the
  lane, `min(1, (0.22 / lat)²)`, because the walking camera never comes nearer than that.
- **The chunks** as the probe has them. Each chunk is one `InstancedBufferGeometry`: one blade template and one set of
  per-blade attributes. Its bounding sphere is the chunk's box padded by the chunk's own `reach`, so three never
  culls a blade the shader moved into view (S1). The reach is the largest `bladeReach` of the chunk's blades (lean,
  curl, widening, wind and the map's full push) at the farthest distance from any walk camera to the chunk's box. The
  widening grows with distance, so the farthest camera moves a blade most (C1). Its blades are in random order, so a prefix is an even sample. Each frame,
  `instanceCount` is set from `grassDrawCount`.
- **The blade** starts from the test's lesson (`tasks/todo.md`, "Not yet Van Gogh"). The painting's bushes are fat
  curved comma strokes that fan out from a clump, dark at the centre with pale yellow-green edges. The test's were thin
  straight spikes in an even grey-green. Task 1 settles the shape and the segment count on a flat strip beside the
  painting's bushes, and the density follows the table. Fixed before it: height 0.024 with the test's tuft noise and a
  shorter verge (lesson: 0.014 left gaps), and the half-width widened with the camera's distance in the vertex shader
  (`× max(1, d / 0.3)`, the test's rule, now per frame). The colours come from the test's two sources: the field strip
  (`STREET_SOURCES.field`) and the bushes at the painting's lower right, 1420–1600 × 1110–1267.
- **The ground under the grass** (S2). The footprint is one shape for the clip and the base: lane `t` −0.06 to 0.97,
  0.06 to 0.6 off the lane, outside the square. With the grass on, `buildStreet` drops each class-3 ground triangle
  whose three corners lie in the footprint. The path (class 4) and the square are never touched. A dark base strip
  runs along each side of the lane from 0.052 to 0.765, laid as the path's segments are, at y = 0.001: above the
  ground's underpaint at 0 and below its lowest stroke at `STROKE_LIFT` 0.002, as the path's base sits at 0.002 under
  its own strokes (C3). Beyond 0.6 the ground's kept strokes lie over it. Its colour is the field source's darkest 20%, easing to the ground's base over its outer
  0.1, so a gap between blades reads as shadow (Mark's crop: the ground's long strokes read through the grass as
  planks). It carries the ground's class, 3. `laneParam(x, z): [t, lat]`, beside `laneOffset` in `streetLayout.ts`,
  places a point on the lane for the clip.
- **The hand's trail is a map, not touch points.** The design names D1's model (`src/scene/landTouch.ts`). D1 holds
  four touches, and a sweeping hand needs every point it passed (lesson: "A trail needs a map, not touch points"). So
  the map keeps D1's model per texel, and reuses its functions: each live texel is a `LandTouch`-shaped record (its
  `t0`, `amp`, `from`, `release`) with a direction, and its amplitude is `landAmplitude` with `closing` (Codex's
  quality note). A held stamp retargets from the current amplitude, as `followHeld` does, and never restarts the ramp.
  The map covers the blades' rectangle, about 1.93 × 2.64, at 0.005 a texel: about 387 × 528. Under the hand a texel's
  target is `(1 − q)²` over the radius 0.045 (the test's), pointing away from the hand's centre. Where two stamps meet,
  the stronger is kept. After the hand leaves, the texel swings back as D1's damped cosine (`tau` 0.9 s, `period`
  1.3 s, closed between `windowStart` 4 s and `windowEnd` 5 s). The CPU steps only live texels. It writes them as two
  bytes, `128 + 127 × push`, and uploads the map only on a frame that changed it: at most 408,672 bytes. Task 5
  measures the cost during a sweep.
- **Reduced motion** (the system setting): the hand bends the grass. A released texel falls from its current
  displacement to zero over `rise`, and never passes through zero. A texel mid-swing when the setting turns on starts
  that fall from where it is.
- **The pause freezes the trail** (S6). While paused, the trail's clock stops: no texel moves, and the hand stamps
  nothing, as B and D1 take no touch while paused on the diorama (`streetEntry.ts`, `touchEnabled`). Unpaused, the
  trail resumes from the frozen state, with the paused time left out.
- **The hand along its path.** A frame stamps the segment from the last hit to this hit, every half radius, so a fast
  sweep leaves a line, not dots.
- **The hand is cast through this frame's camera** (C8, S3). The walk's frame loop (priority −1) places the camera and
  then calls `updateMatrixWorld()`, because three's `lookAt` writes the quaternion after it updates the matrix and
  `Raycaster.setFromCamera` reads the matrix. The grass's loop (priority 0) casts the pointer onto the plane at half
  the blades' height. A still mouse or a resting finger keeps bending the grass under it while Vincent walks.
- **One owner for each gesture** (S4). The walk decides at `pointerdown`, once: a primary pointer on the canvas whose
  down lands in Vincent's padded hit box is a **Vincent gesture**. It toggles him on its up if `classifyGesture` calls
  it a tap, wherever the box has moved, and it never bends grass. Any other primary pointer on the canvas is a **hand
  gesture**. The walk keeps both in one small store, `streetGesture: { pointerId: number; vincent: boolean } | null`,
  which the grass reads. A second contact, an up or a cancel from the owning pointer, a lost focus and a hidden page
  clear it. An up or a cancel from another pointer is ignored. On a computer the mouse over the canvas is the hand
  without a button (design step 4). The canvas's cursor is `grab`, the system's open hand (design: "a hand icon, not a
  pointer"), set while the street shows and restored after.
- **Vincent parts the grass** (the design's call). While Vincent shows, his place is stamped each frame with radius
  0.03 (his hem is 0.0186 across), so the blades at the path's edge lean away as he passes. The seams count the hand's
  stamps and his separately (S5).
- **The wind** is the test's (0.0025, its gusts). It runs on the street's life clock (`lifeTimeUniform`), so the pause
  and reduced motion freeze it with the trees' sway.
- **The ID pass**: class 9, `vec3(0.0, 128.0 / 255.0, 1.0)`, which reads back as (0, 188, 255) (slice 2's C1). It goes
  in `src/scene/streetMaterial.ts` (slice 2's F3 fix), the one copy of the classes.
- **The flag**: `grass`, on in street mode, `?grass=0` off. The test's URL knobs are not kept.
- **Not in this slice**, each for Mark:
  - **The sky's surge above the roofs (C19)** (S7). Slice 1 turned all touch off in the street (`touchEnabled` returns
    false there), so B's surge has never run in it. Turning it on needs the touch hook's sky mapping re-keyed for the
    street's world-fixed, following sky (`useTouchInput.ts:95–106` assumes the lock, the design's sky section says
    so), and a rule that a hand on a roof or in the grass does not surge the sky behind it. It is a task of its own,
    after this slice or with the portal's pointer in slice 4.
  - The flowers by the path (his idea of 2026-10-23, in `tasks/todo.md`).
  - The low camera in the grass (the test's `grassView=low`, closer to Jeroen's clip, while the design keeps eye level).
  - A second portal.

## Review Focus

1. **A fling.** A hand swept across the screen in one frame leaves a continuous trail, not dots (Task 3,
   `stampSegment`).
2. **A pointer over the sky or a roof.** A ray that does not meet the grass's plane inside the map leaves no stamp. A
   ray through a house meets the plane behind it and bends hidden grass: harmless, and accepted (Task 4, case 2).
3. **The tap and the hand on a phone.** One owner per gesture, decided at the down (Task 4, case 5).
4. **A finger that leaves.** A `pointercancel` or a lift off the canvas ends the hand: no stuck push (Task 4, case 5).
5. **The frame rate while the hand moves.** The upload runs only on frames that change the map, and Task 5 measures a
   sweep as well as a still frame.

---

### Task 0: Baselines (worker)

- [ ] **Step 1:** In `feat/street-s3`'s worktree at its base, capture stations 0–4 and `walkT` 0.33 and 0.55, both
  viewports, `--times 5`, with `&arrival=0&walkMode=input`, into `scratch/street-s3-2026-10-24/t0/`. Capture each twice
  and `cmp` the pairs (the test of the capture, not of the code).
- [ ] **Step 2:** Perf, five rounds, at the same seven poses, `&walkMode=input`, slice 2's command and its `numbers.md`
  table, with the triangles.
- [ ] **Step 3:** The triangles without grass along the walk (S1): `walkT` 0 to 0.9 every 0.05, both viewports, one
  read each of `renderer.info.render.triangles` after the street is ready. Record the largest and its pose.
- [ ] **Step 4:** Run `probe-removal.ts` and `probe-fit.ts` (each segment count at its density in the table) from the
  worktree, and copy their output into `numbers.md`.

### Task 1: The blade's look (Lead)

**Files:** Create `src/scene/grassBlade.ts`, `scripts/street-grass-blade.test.ts`. Modify `src/scene/streetGeometry.ts`
(`buildFlatPanel` gains a strip of clumps under `?flat=1&grass=1`), `package.json` (`test:sky`).

**Interfaces (produces):** `GRASS_BLADE = { segments, height: 0.024, halfWidth, curve, clump, fan, shade }` (the look
pass sets the values not given here, and `segments` is 1, 2 or 3); `bladeTemplate(): { positions: number[]; stroke:
number[]; indices: number[] }` in blade space (root at the origin, up +y, across +x, `stroke` x along 0.5 → 1 so the
body shapes the tip only, the lesson); `type BladeSpec = { x: number; z: number; yaw: number; height: number;
halfWidth: number; lean: number; curl: number; colour: [number, number, number]; seed: number }`; `clump(rand: () =>
number, painting: ImageData2D, x: number, z: number, height: number): BladeSpec[]`; `bladeReach(spec: BladeSpec,
distance: number): number` (the farthest the shader can move any of its vertices from the root across the ground, at
that camera distance, with the full push and the wind); `GRASS_SOURCES` (the field strip and the bushes).

- [ ] **Step 1:** Tests: the template has `segments + 1` rows and `2 × segments` triangles. Its width tapers to the
  tip. `clump` is deterministic for a seed. Every colour comes from a texel of a source (no near-whites, the test's
  `r + g + b < 520`).
- [ ] **Step 2:** The flat strip: one row of clumps across the flat panel's ground, seen by `FLAT_VIEW`, captured
  beside the painting's bush crop at matched scale (the blade's height against the bushes' stroke length at 1:1).
- [ ] **Step 3:** Look passes on the strip, at most four. Each: the change, the sheet, the read, the lessons. The
  questions: does a clump read as the painting's bush strokes (curved, fanned, dark at the centre, pale at the edge),
  and how few segments keep that read? The density for the chosen count comes from the table.
- [ ] **Step 4:** Commit `feat(street): the grass's blade, curved strokes fanned in clumps, on the flat panel (S3 task 1)`.

### Task 2: The blades, the chunks and the ground (worker)

**Files:** Create `src/scene/streetGrass.ts`, `scripts/street-grass.test.ts`. Modify `src/scene/streetGeometry.ts`
(`buildStreet`'s options gain `grass: boolean`, default false, beside `lit`), `src/scene/streetLayout.ts`
(`laneParam`), `package.json` (`test:sky`).

**Interfaces:**
- Consumes: Task 1's `clump`, `bladeTemplate`, `bladeReach`, `GRASS_BLADE.segments`; `pathPoint`, `pathTangent`,
  `laneOffset`, `STREET_HOUSES`, `STREET_CYPRESS`, `STREET_SQUARE`, `walkPose`.
- Produces: `GRASS = { t: [-0.06, 0.97], lat: [0.052, 0.765], bands: [0.052, 0.2, 0.4, 0.765], dt: 0.05, r0: 0.22,
  density, full: 82184, house: 0.012, cypress: 0.07, top: 0.05, baseY: 0.001, footprint: { t: [-0.06, 0.97], lat:
  [0.06, 0.6] }, budget: 38515 }` (`density` from the table for Task 1's segment count);
  `laneParam(x: number, z: number): [t: number, lat: number]` (the nearest point on the lane, sampled as `laneOffset`
  samples it); `type GrassChunk = { blades: BladeSpec[]; latIn: number; box: { min: [number, number, number]; max:
  [number, number, number] }; reach: number; sphere: { centre: [number, number, number]; radius: number } }`;
  `grassChunks(painting: ImageData2D): GrassChunk[]`; `grassDrawCount(chunk: GrassChunk, camera: [number, number,
  number]): number`; `grassRect(chunks: GrassChunk[]): [x0: number, z0: number, width: number, depth: number]`;
  `inFootprint(x: number, z: number): boolean`.

- [ ] **Step 1: The failing tests** in `scripts/street-grass.test.ts`:
  - `the grass keeps off the houses, the tree, the square and the path`: every blade's root obeys the exclusions and
    `lat ≥ 0.052`.
  - `the density falls with the distance from the lane`: per band, the blade count is within 10% of
    `full × density × area × mean(min(1, (r0 / lat)²))` less the excluded area.
  - `a chunk's prefix is an even sample`: for every chunk with ≥ 40 blades, the first half's mean `lat` is within 15%
    of the chunk's.
  - `the sphere holds every displaced blade` (S1, C1): for every blade, `bladeReach` at the farthest distance from any
    walk camera (the 901 points `t = k / 1000`, both orientations) to its chunk's box is ≤ the chunk's `reach`, and its
    tallest point is ≤ `GRASS.top`. Each chunk's sphere contains its box grown by `reach` across and up to `top`.
    Negative control: at three times that distance, `bladeReach` exceeds `reach` for some blade (the widening is
    live).
  - `the grass fits its room at every point of the walk` (S1): at the 901 points `t = k / 1000`, at 1600 / 900 and
    390 / 844, the sum over the chunks whose sphere meets the camera's frustum of `grassDrawCount × 2 × segments` is
    ≤ `GRASS.budget`. The test prints the worst point. Negative control: at twice `density` the sum exceeds the budget
    somewhere. If the computed spheres are larger than the probe's and the test fails, lower `density` until it passes
    and report the value: `density` is this task's tunable, the budget is not.
  - `a near chunk draws all, a far one a share`: a chunk whose box contains the camera's ground point draws every
    blade. The same chunk seen from 1.0 away draws `ceil(n × (max(r0, latIn) / 1.0)²)`.
  - `the map is small`: `grassRect`'s sides over 0.005 are ≤ 1024 each.
  - `the ground without grass is today's`: `buildStreet(p, f, m)` deep-equals
    `buildStreet(p, f, m, { lit: true, grass: false })`.
  - `with grass the ground is clipped to the footprint and nothing else` (S2): every dropped triangle is class 3 with
    its three corners `inFootprint`. Every class-4 triangle and every triangle with a corner outside the footprint is
    kept, in the same order. The drop is 32,343 ± 1% (the probe), printed. The base's triangles are ≤ 2,000, every
    base vertex is at `GRASS.baseY`, and points sampled across 0.052–0.765 along `t` −0.06 to 0.97 outside the square
    each meet a base triangle.
- [ ] **Step 2:** Run them: FAIL. Implement. Run `npm run test:sky` and `npx tsc -b`: PASS.
- [ ] **Step 3:** Commit `feat(street): the grass's blades in chunks along the lane, the ground clipped under them (S3 task 2)`.

### Task 3: The trail (worker)

**Files:** Create `src/scene/grassTrail.ts`, `scripts/grass-trail.test.ts`. Modify `package.json` (`test:sky`).

**Interfaces (produces):** `TRAIL = { texel: 0.005, radius: 0.045, feet: 0.03 }` with the timing from `LAND_TOUCH`;
`type Trail` (the rect, the size, the live texels as `LandTouch`-shaped records with a direction, the clock, `bytes:
Uint8Array` of RG pairs); `createTrail(rect: [number, number, number, number]): Trail`; `stampSegment(trail: Trail,
from: [number, number] | null, to: [number, number], radius: number, now: number): void`; `stepTrail(trail: Trail,
now: number, mode: 'swing' | 'settle' | 'frozen'): boolean` (true when `bytes` changed). `swing` is normal, `settle`
reduced motion, `frozen` the pause.

- [ ] **Step 1: The failing tests:**
  - `a held stamp rises and pushes away`: stamped each frame at one point, the texel at 0.6 of the radius reaches its
    full push by `rise` (± one frame at 1/60) and points away from the centre. The centre texel's push is 0.
  - `a moving hand retargets without restarting`: a texel stamped at 0.3 then at 0.6 of its target keeps rising from
    its current amplitude: its push never drops between the two stamps.
  - `released, it swings back and closes`: its push changes sign between `period / 4` and `period / 2` after the
    release, and is exactly 0 from `windowEnd`. The live list is empty then.
  - `settle never crosses zero`: in `settle`, a released push falls monotonically to 0 by `rise`. From a texel already
    swinging negative, it rises monotonically to 0. Neither changes sign.
  - `frozen holds still and resumes` (S6): switched to `frozen` 0.05 s after a release and 0.5 s after (mid-swing,
    negative), `bytes` stay identical over 2 s of `stepTrail` calls, and `stampSegment` while frozen changes nothing.
    Back in `swing`, the push continues from the frozen value with the frozen time left out.
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
`src/scene/StreetWalk.tsx` and `src/scene/streetWalk.ts` (the camera's `updateMatrixWorld`, the down-time admission
and `streetGesture`, S3 and S4), `src/scene/streetMaterial.ts` (class 9), `src/scene/streetMode.ts` (`grass:
boolean`), `scripts/street-mode.test.ts`, `scripts/street-walk.test.ts`, `scripts/check-street-walk.mjs`.

**Interfaces:** Consumes Tasks 1–3 and slice 2's `hitBox`, `classifyGesture` and `__vincentBox`. Produces
`streetGesture` and the seams `window.__grassHand(x: number | null, y?: number): void` (a client point for the mouse
hand, or `null` to lift it), `window.__grassHit: { x: number; z: number; t: number } | null` (this frame's world hit, and the walk's `t` its
camera was placed at),
`window.__grassPeak: number` (the largest |push| in the map), `window.__grassStamps: { hand: number; feet: number }`
(stamps made, per source), `window.__grassHandLive: number` (live texels last stamped by the hand),
`window.__grassCount: number` (blades built).

- [ ] **Step 1:** Flag tests: `grass` true by default, false for `grass=0`. Run: FAIL. Implement: PASS.
- [ ] **Step 2:** The walk (S3, S4): after `lookAt`, `persp.updateMatrixWorld()`. The gesture admitted at the down as
  "The decisions" give it, and its tap toggling whatever the box at the up. `street-walk.test.ts` gains the admission
  as a pure function's tests: a down 1 px outside the padded box with an up 1 px inside is a hand gesture. A down
  inside with the box moved away by the up is still Vincent's.
- [ ] **Step 3:** `grassShader.ts`: the vertex body builds the blade from the template and the per-blade attributes,
  widens it with the camera's distance, adds the wind on `lifeTimeUniform`, and bends it by the map at its root (the
  test's `gH = a²` profile, its drop of `0.7 × |offset| × a`). The fragment body turns a bent blade paler, toward
  `PALETTE.hillsCrest` (lesson: "A bent blade must change colour as well as shape"). The stroke body is the street
  ground's (`strokeGlslWith({ ...CYPRESS_STROKE_BODY, gaps: null, dryFrom: 0.85, fray: 0.08 })`, the test's).
- [ ] **Step 4:** `StreetGrass.tsx`: the chunks as meshes, `instanceCount` per frame, the trail stepped and uploaded
  in one `useFrame` (priority 0), the hand's listeners and cursor, Vincent's feet stamped from `vincentPlace(t)`
  while he shows, the trail's mode `frozen` while paused, else `settle` under reduced motion, else `swing`.
- [ ] **Step 5:** `check-street-grass.mjs`, after `check-street-walk.mjs`'s pattern, each case its precondition first:
  1. The hand bends: stop 0, `__grassHand` at a verge point (precondition: `__grassHit` inside the map): `__grassPeak`
     > 0.5 within 0.3 s.
  2. The blades move (S8): with `ids=1`, the class-9 pixels within 80 px of a held hand differ from a capture without
     the hand at the same pinned time, and none differ beyond 300 px. The ID colour is constant, so only geometry
     differs. The gate's negative control: with the displacement deleted from `grassShader.ts`, this case fails.
  3. The sky and the roof: `__grassHand` at a point above the horizon: `__grassHit` null and `__grassStamps.hand`
     unchanged.
  4. The walk re-casts (S3, C2): the hand held still on the verge, ArrowUp for 1 s: `__grassHit` moves by > 0.1. On
     ten frames during the walk, the page builds a reference camera from `walkPose(__grassHit.t, portrait)` at the
     canvas's aspect, calls that camera's own `updateMatrixWorld()`, and projects the hit through it: within 1 px of
     the client point. Never project through the camera that cast the ray: a stale matrix round-trips to zero error.
     Precondition: `__grassHit.t` advances by ≥ 0.002 between sampled frames, so a camera one frame stale lands
     several pixels off.
  5. The phone (`walkMode=auto`, touch, 390 × 844): a tap on Vincent toggles `auto` and leaves `__grassStamps.hand`
     unchanged (precondition: a tap elsewhere does not toggle). A down 1 px outside his padded box moved 2 px inside
     by its up bends (hand stamps rise) and does not toggle. A touch-drag across the verge bends and leaves `auto` as
     it was. A touch ended by `touchCancel` stops the hand's stamps at once.
  6. The swing and its end, with `vincent=0` (S5): the hand held still on the verge for 0.5 s, then lifted:
     `__grassPeak` falls below 0.05 and rises again (the swing), and `__grassHandLive` is 0 by 5.5 s.
  7. Vincent's feet: with Vincent walking, `__grassStamps.feet` rises and texels beside his place are live.
  8. Reduced motion, `vincent=0`: the hand held still bends (> 0.5). After it lifts, `__grassPeak` never rises again,
     and two captures 1 s apart, from 1 s after the release, are byte-identical.
  9. The pause (S6), `vincent=0`: the hand lifted mid-swing, then "Pause motion" on: two captures 0.1 s apart and 1 s
     apart are byte-identical, and a new hand sweep adds no hand stamps. Pause off: `__grassPeak` changes again.
  10. `grass=0`: `__grassCount` undefined, the canvas's cursor is not `grab`.
- [ ] **Step 6:** Run it and `check-street-walk.mjs` against Vite: all PASS. `npm run lint`, `npm run build`: clean.
- [ ] **Step 7:** Commit `feat(street): the grass by the lane and the hand that parts it (S3 task 4)`.

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
- [ ] **Step 4:** The triangles with grass along the walk, as Task 0's Step 3: every reading ≤ 1,444,930.
- [ ] **Step 5:** Captures for the Lead: the seven poses, both viewports, and stops 0 and 2 with the hand mid-sweep.
- [ ] **Step 6:** Commit `test(street): the palette gate measures the grass (S3 task 5)`.

### Task 6: The Lead's gate, the look passes and Mark's gate (Lead)

- [ ] **Step 1:** Read every Task 5 output. G1 tests, lint and build. G2 `grass=0` byte-identical. G3 palette. G4 perf
  and triangles. G5 reduced motion and the pause. G6 the grass at 1:1 beside the painting's bushes at stops 0 and 2,
  the clip's edges at the footprint's ends, and the verge from the phone. G7 a 4 s clip of the hand sweeping the
  verge while Vincent walks, recorded with the Playwright browser at 10 frames a second, `bringToFront` before each.
  G8 mutations: the displacement deleted (case 2 fails), the `updateMatrixWorld` deleted (case 4 fails), the
  down-time admission replaced by the up's box (case 5 fails).
- [ ] **Step 2:** Look passes on what G6 and G7 name, at most four.
- [ ] **Step 3:** Codex reviews the branch. Answer every finding in the record.
- [ ] **Step 4:** Mark's gate: the live link on the Mac's LAN, the sheets, the clip, and what is open (the sky's surge
  above the roofs, the flowers, the low camera, the phone's frame rate).
