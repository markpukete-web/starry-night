# Street S2, Vincent and the walk: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Revision 1 (2026-10-24, afternoon).** Not reviewed yet. Every number below comes from the Lead's probes in
`scratch/street-s2-2026-10-24/` (`probe-rig.ts`, `probe-walk.ts`, `probe-stop4.ts`, `probe-detail.ts`, gitignored),
which import `src/scene/streetLayout.ts` and project with three's camera, or from the colour scan
(`lab.py` in the Lead's scratchpad: the painting's crops against `palette.json`, ΔE76).

**Goal:** Vincent stands on the street's lane, small and seen from behind, and walks it to the church: the scroll
wheel and the arrow keys on a computer, an automatic walk with a tap on a phone, steps under reduced motion, the camera
behind him.

**Architecture:** One number, the walk's `t`, moves along the lane from stop 0 to stop 4. A pure controller turns
wheel, keys, the automatic walk and taps into `t`. A pure pose function turns `t` into the camera's pose, equal to
S1b's station pose at each station and smooth between them. Vincent is built once in code, a few shapes clad in the
painting's strokes, and placed each frame 0.4 ahead of the station point. All of it lives in the street's lazy chunk.

**Tech stack:** Vite, React, TypeScript, three.js, React Three Fiber, drei. `node --test` (type stripping on).

**Spec:** `docs/superpowers/specs/2026-10-23-village-street-design.md`: "What the visitor does" items 3 and 4, the
constraint "Reduced motion", C6, C8 (the tap on Vincent), C19 (the pause), and "Left to the builder". The street it
builds on: `tasks/2026-10-23-street-s1b-plan.md` and its record `tasks/2026-10-23-street-s1b.md`.

## Session mapping

Herdr workspace `w4`, checked with `herdr agent list` on 2026-10-24. Lead: Claude at `w4:p1`. Reviewer: Codex at
`w4:p4`. Worker: Antigravity at `w4:p5`. Consultant: Fable at `w4:p6` (tab `w4:t2`), the reviewer when Codex runs low.
The worker builds Tasks 0, 1, 2 and 4 and runs Task 5's commands. The Lead builds Task 3 (Vincent's look is visual
work) and owns Task 6.

## Global constraints

- No new dependency.
- Every colour comes from the painting or `public/reference/palette.json` (the bar, locked). Vincent's smock is gated
  against the village region's blues (swatches 1 and 2, `#2a3f6f` and `#556c81`, weight-averaged) and his hat against
  `villageWarm` (all swatches, weight-averaged), unlit (`light=0`), ΔE76 < 10 (Tunables).
- A plain visit (no `?street=1`) is unchanged: a pinned capture byte-identical to Task 0's.
- With Vincent hidden (`vincent=0`) and the walk off (`walk=0`), each station's capture is byte-identical to Task 0's
  capture of `main` at that station. The walk's pose reproduces the stations exactly.
- Budget at DPR 1.5: `info.triangles` ≤ 1,444,930 at every station and walk point. Vincent ≤ 4,000 triangles. The
  street with Vincent ≤ 641,310 (`STREET_TRIANGLE_BUDGET`; it stands at 631,290).
- Perf, read as S1b's G7 (`tasks/lessons.md`, 2026-10-24): the mean frame time at the 60 Hz lock at every point;
  p95 read over five rounds, base against head, never from one run.
- The main chunk grows by one prop only: `<Street still={still} />`.
- Branches stay local until Mark has seen the street live. Commits end with the session's `Claude-Session:` line.
- `CLAUDE.md`'s locked sections are not edited. Mark's edit of the camera criterion (proposed in `tasks/todo.md`)
  lands before slice 2 merges to `main`.
- Look passes: at most four (`CLAUDE.md`, retune cap).
- A browser check throws on failure, never `process.exit` inside `try`, and counts headless Chromes before and after
  (`tasks/lessons.md`, 2026-10-24). Each check asserts that its precondition happened before it asserts the result.

## The decisions (from the probes)

- **The walk's `t`** is the lane parameter of S1b's stations: the camera stands `STREET.behind` (0.18) behind
  `pathPoint(t)` along the tangent, at `STREET.eye`. It runs from 0 (stop 0) to 0.9 (stop 4). `?station=N` starts at
  `STATION_T[N]`, `?walkT=x` at `x` clamped to [0, 0.9].
- **The camera.** Between stations it aims 0.6 ahead along the lane at `STREET.lookHeight`, as stations 1 to 3 do.
  Stop 0's and stop 4's aims are kept as offsets from the camera, blended out over [stop 0, stop 1] and in over
  [stop 3, stop 4] with smoothstep, so every station is reproduced to 1e-9 and stations 1 to 3 are untouched. The
  probe reproduced all ten station poses exactly.
- **Vincent's place:** 0.4 ahead of `pathPoint(t)` along the lane (lane `t + 0.4 / STREET.pathLength`), 0.03 to the
  walker's right, easing to 0.07 over [stop 3, stop 4] so he clears the church door there. He faces the lane's
  tangent at his own place. Past the lane's end `pathPoint` extends straight, so at stop 4 he stands in the square,
  0.17 from the church front. He is 0.58 from the camera: 16–17% of the frame's height on a 1440 × 900 desktop,
  9–11% on a 390 × 844 phone, his head near the horizon. At 0.3 ahead the phone lost him off the frame's edge on the
  bends (x up to 1.26); at 0.4 his head stays within x −0.61 to 0.82.
- **Height 0.085**, a little under the eye (0.09), so his head stays below the horizon and the spire and roofs above it
  stay clear.
- **Speeds** (world units per second, the lane 2.16 long from stop 0 to stop 4): keys 0.15 (14 s), the phone's
  automatic walk 0.08 (27 s), a cap of 0.5 on any movement. The wheel: 0.001 per pixel of `deltaY` (`deltaMode` 1 ×
  16, `deltaMode` 2 × the viewport's height), scrolling down walks forward. `t` eases to its target with τ 0.25 s.
  `ctrlKey` wheels (a trackpad's pinch) are ignored and not prevented.
- **Reduced motion** (`still`, the system setting): no automatic walk, no gait, no easing (`t` takes the target at
  once). The wheel and the keys still walk him. On a phone a tap on Vincent cuts to the next station's `t`, and at
  stop 4 does nothing.
- **The pause** (`reduced` on `<Street />` is `reduced || visitorPaused`): stops the automatic walk. Wheel and keys
  still walk.
- **The phone** is `(hover: none) and (pointer: coarse)`; `?walkMode=auto` or `?walkMode=input` overrides it. On a
  phone the automatic walk starts once the street is ready and stops at stop 4. A tap (≤ 300 ms and ≤ 8 px, B's rule)
  inside Vincent's projected box, padded to at least 48 × 48 CSS px, starts or stops him. Only a pointer whose target
  is the canvas can tap.
- **Walking back:** Vincent keeps facing up the lane and steps back. He is never seen from the front. (The Lead's
  call, for Mark at the gate.)
- **The gait** comes from the distance walked, not the clock: a step every 0.04, the body rising 0.0015 at each step
  and rolling ±0.03 rad, the left arm swinging ±0.25 rad, all scaled by `min(1, speed / 0.05)` so he settles when he
  stops. No legs: the smock reaches the ground, as Simon's figure rides on wheels. Swinging legs are a look pass's
  option if the glide reads as sliding.
- **Detail:** unchanged. R2 and R4 stay at half detail, although the walk's camera passes within 0.44 and 0.36 of
  them (`probe-detail.ts`). Task 6 judges them at those two points. Full detail for both would not fit the 10,020
  triangles left.

## Vincent's construction (Task 3)

In his own frame: feet at the origin, `+y` up, `+z` his facing direction, `+x` his right.

| Part | Shape | Strokes | Pigment (painting px, 1600 × 1267) | ID class |
|---|---|---|---|---|
| Smock | frustum y 0.004–0.062, radius 0.0155 at the hem and 0.0105 at the shoulders, x : z = 1.2 : 0.8, a dome to the neck (r 0.004) by 0.066 | 18 vertical | the hills behind the village `[796, 868, 828, 900]`, ΔE 0.3 to the village blues | 7 |
| Arms | tapered cylinders r 0.0032, from (±0.0115, 0.060) to (±0.0135, 0.034) | 2 each | the smock's | 7 |
| Head | sphere at y 0.071, r 0.0065 | 6, over the back of the head | `roofSienna` (his red hair) | none (255) |
| Hat | crown y 0.0745–0.081, r 0.0068; brim r 0.0145 at y 0.0745, its edge 0.0015 lower | crown 8 vertical, brim 12 radial | `thatch`, ΔE 9.2 to `villageWarm` | 8 |
| Canvas | a roll r 0.0035, 0.034 long, under the right arm at (0.017, 0.05, 0), turned 30° from `+z` | 3 along it | `plaster` | none (255) |
| Shadow | a soft dark ellipse r 0.022 on the ground | — | black at 0.6, as the trees' | — |

Each part has an underpaint shape under its strokes in its source's darkest 40% mean (the ground's rule,
`sourceUnderpaint(painting, source, 0.4)`), so a gap between strokes reads as shade. Strokes carry `aStroke` (along
0–1, across 0–1) and `aSeed` and draw with the cypress's stroke body, as the street's faces do. One pigment per
stroke, a random texel of its source. The moon lights him in the shader, not in his vertex colours, because he turns
as he walks: `0.4 + 0.9 × max(0, n · STREET_MOON)` with `n` his world normal (`STREET_LIGHT`'s values), and 1 under
`light=0`. The hat's 9.2 is close to the bar. If the rendered hat fails the gate, Task 6 picks a sub-rectangle of the
thatch by the same scan; it does not move the bar.

## Review Focus

1. **A trackpad fling**: hundreds of wheel events in a frame. Expected: Vincent moves at most at the cap and stops at
   stop 4. Test in Task 2.
2. **A key held while the window loses focus**: the key-up never arrives. Expected: he stops. Tests in Tasks 2 and 4.
3. **A tap that turns into a drag** over Vincent. Expected: no toggle. Test in Task 2.
4. **A tap on a chrome button** (the pause) that sits over Vincent's box on a phone. Expected: the button acts, Vincent
   does not toggle. Test in Task 4.
5. **Turning the phone mid-walk**. Expected: the portrait pose at the same `t`, no rebuild, Vincent in frame. Test in
   Task 5.

---

### Task 0: Baselines on `main` (worker)

**Files:** none in the repo. Output to `scratch/street-s2-2026-10-24/t0/`.

- [ ] **Step 1:** On `main` (`7a5981c` or later), start Vite on a free port. Capture the plain visit pinned, as S1b's
  Task 0 did, and stations 0 to 4 at 1440 × 900 and 390 × 844 with `?street=1&station=S&arrival=0` and
  `__skyTime` pinned. Two runs each: the two runs must be byte-identical, or the capture is not deterministic and the
  Lead is told before Task 1 starts.
- [ ] **Step 2:** Perf at stations 0, 2 and 4, five rounds each:
  `DIORAMA_CAPTURE_URL=http://127.0.0.1:<port>/ DIORAMA_CAPTURE_EXTRA='street=1&station=S' node scripts/capture-diorama.mjs scratch/street-s2-2026-10-24/t0/perf-sS-rR --perf --dpr 1.5`.
  Record mean, p95, max and `info.triangles` in `t0/numbers.md`.

### Task 1: The walk's pose and Vincent's place (worker)

**Files:**
- Modify: `src/scene/streetLayout.ts` (export `STATION_T`, add the functions below beside `stationPose`)
- Test: `scripts/street-layout.test.ts`

**Interfaces:**
- Produces: `STATION_T: readonly [0, 0.23, 0.44, 0.66, 0.9]`; `WALK_T = { min: 0, max: 0.9 }`;
  `type StationPose = ReturnType<typeof stationPose>`; `walkPose(t: number, portrait: boolean): StationPose`;
  `VINCENT_RIG = { ahead: 0.4, lateral: 0.03, lateralEnd: 0.07, height: 0.085 }`;
  `vincentPlace(t: number): { position: [number, number, number]; yaw: number }` (yaw so that `+z` faces the
  lane's tangent at his place: `Math.atan2(tx, tz)`).

- [ ] **Step 1: Write the failing tests** in `scripts/street-layout.test.ts`:
  - `walk pose reproduces the stations`: for both orientations and `i` 0–4, every component of `walkPose(STATION_T[i])`
    `position`, `target`, `fov`, `near`, `far` equals `stationPose(i)`'s within 1e-9.
  - `walk pose is smooth`: 901 samples `t = k / 1000` for `k` 0–900. Between neighbours the camera moves ≤ 0.004 and
    its heading (the target's direction in the ground plane) turns ≤ 1.5°.
  - `the walk stays inside the painted arc`: the station test's three assertions (heading within ±60°, pitch −20° to
    +40°, `pitch + fov / 2 ≤ 50`) at all 901 samples, both orientations.
  - `Vincent stays in frame`: at the 901 samples, with a `PerspectiveCamera` of aspect 1.6 (landscape) and 390 / 844
    (portrait) at `walkPose`, his head point (`height` above his place) projects to |x| ≤ 0.85 and his feet to y ≥
    −0.95, and his height on screen is 14–22% of the frame (landscape) and 8–13% (portrait).
  - `Vincent clears the church door at stop 4`: at `t = 0.9`, both orientations, his projected box (half-width 0.016,
    height 0.085) does not overlap the door's (the nave's front-wall centre at the ground, ±0.025 across, 0 to 0.12
    high; `probe-stop4.ts` has the construction).
  - `Vincent stands in the square at stop 4`: `vincentPlace(0.9)` is within `STREET_SQUARE.radius` of its centre.
- [ ] **Step 2:** Run `node --test scripts/street-layout.test.ts`. Expected: the new tests FAIL (`walkPose` is not
  exported).
- [ ] **Step 3:** Implement `walkPose` as "The decisions" describes (`probe-walk.ts` is the reference) and
  `vincentPlace` with the lateral `lateral + (lateralEnd − lateral) × smoothstep(STATION_T[3], STATION_T[4], t)`.
- [ ] **Step 4:** Run `npm run test:sky`. Expected: all PASS.
- [ ] **Step 5:** Commit `feat(street): the walk's pose through the stations and Vincent's place on the lane (S2 task 1)`.

### Task 2: The walk controller (worker)

**Files:**
- Create: `src/scene/streetWalk.ts`
- Test: `scripts/street-walk.test.ts` (and add it to `test:sky` in `package.json`)

**Interfaces:**
- Consumes: `WALK_T`, `STATION_T`, `STREET.pathLength` (Task 1).
- Produces:
  - `WALK = { keys: 0.15, auto: 0.08, cap: 0.5, wheel: 0.001, ease: 0.25, stride: 0.04, bob: 0.0015, roll: 0.03, arm: 0.25, settle: 0.05, tapMs: 300, tapPx: 8, hitMin: 48 }`
  - `type WalkState = { t: number; target: number; auto: boolean; distance: number; speed: number }`
  - `type WalkInput = { dt: number; wheelPx: number; keys: -1 | 0 | 1; autoMode: boolean; paused: boolean; still: boolean }`
  - `initialWalk(t: number, autoMode: boolean): WalkState` (`auto` true when `autoMode`)
  - `stepWalk(s: WalkState, i: WalkInput): WalkState` (pure; `distance` adds |Δt| × `pathLength`; `speed` is world
    units per second this step)
  - `toggleWalk(s: WalkState, still: boolean): WalkState` (a tap on Vincent: flips `auto`; under `still`, sets `t` and
    `target` to `nextStop(t)` and leaves `auto` false)
  - `nextStop(t: number): number` (the first `STATION_T` above `t + 1e-6`, else `WALK_T.max`)
  - `wheelPixels(e: { deltaY: number; deltaMode: number; ctrlKey: boolean }, viewportHeight: number): number`
  - `gait(distance: number, speed: number, still: boolean): { lift: number; roll: number; arm: number }`
  - `isTap(down: { x: number; y: number; time: number }, up: { x: number; y: number; time: number }): boolean`
  - `hitBox(box: { x0: number; y0: number; x1: number; y1: number }, x: number, y: number): boolean` (the box grown
    about its centre to at least `hitMin` px each way)

- [ ] **Step 1: Write the failing tests**, one `test()` each:
  - `the wheel walks forward and eases`: from `t` 0.2, `wheelPx` 100 with `dt` 1/60 moves `target` by 0.1 / L; after
    60 more steps with no input, `t` is within 1e-3 of `target`.
  - `a fling is capped` (Review Focus 1): `wheelPx` 20,000 in one step of `dt` 1/60 moves `t` by ≤ 0.5 / 60 / L; 600
    such steps end at exactly `WALK_T.max`, never above.
  - `keys walk at their speed`: `keys` 1 for 60 steps of 1/60 moves `t` by 0.15 / L ± 2%; `keys` −1 walks back; `t`
    never goes below 0.
  - `the automatic walk`: `autoMode` true, `auto` true, 60 steps: Δt = 0.08 / L ± 2%. With `paused` true: Δt = 0. With
    `still` true: Δt = 0. At `WALK_T.max` it stays there.
  - `still has no easing`: `still` true, `wheelPx` 100: `t` equals `target` after that one step.
  - `a tap toggles, and under still steps to the next stop`: `toggleWalk` flips `auto`; with `still`, from `t` 0.3
    gives 0.44, from 0.44 gives 0.66, from 0.9 stays 0.9, and `auto` is false.
  - `wheel units` (Review Focus): `deltaMode` 0 → `deltaY`; 1 → × 16; 2 → × the height; `ctrlKey` → 0.
  - `the gait settles`: `gait(d, 0, false)` lift and roll are 0 for any `d`; `gait(0.02, 0.15, false).lift` is
    0.0015 (mid-step); `still` gives all 0.
  - `a tap is short and still` (Review Focus 3): 200 ms and 3 px → true; 400 ms → false; 12 px → false.
  - `the hit box is at least 48 px`: a 10 × 30 box centred at (100, 100) hits (100, 76) and (120, 100), misses (100, 70).
- [ ] **Step 2:** Run `node --test scripts/street-walk.test.ts`. Expected: FAIL (module missing).
- [ ] **Step 3:** Implement `src/scene/streetWalk.ts` with the signatures above. Plain `.ts` imports only (the tests
  run under node). The ease: `t += clamp((target − t) × (1 − exp(−dt / ease)), ±cap × dt / L)`.
- [ ] **Step 4:** Run `npm run test:sky`. Expected: all PASS.
- [ ] **Step 5:** Commit `feat(street): the walk controller, wheel, keys, the automatic walk and the tap (S2 task 2)`.

### Task 3: Vincent (Lead)

**Files:**
- Create: `src/scene/vincent.ts` (the build), `scripts/street-vincent.test.ts` (add to `test:sky`)
- Modify: `src/scene/streetStrokes.ts` (`STREET_SOURCES.smock = [796, 868, 828, 900]`)

**Interfaces:**
- Consumes: `VINCENT_RIG.height` (Task 1), `STREET_SOURCES`, `sourceUnderpaint`, `makeBrushArrays`.
- Produces: `buildVincent(painting: ImageData2D): VincentBuild` with
  `type VincentBuild = { strokes: { arrays: BrushArrays; stroke: number[]; seed: number[]; cls: number[] }; underpaint: BrushArraysWithCls; armLeft: { pivot: [number, number, number]; first: number; count: number }; triangles: number }`.
  `armLeft` names the left arm's vertex range and its shoulder pivot, which Task 4 swings.

- [ ] **Step 1: Write the failing tests**: `Vincent fits the rig` (bounding box height 0.085 ± 0.002, width ≤ 0.035,
  depth ≤ 0.04, lowest y ≥ 0); `Vincent is cheap` (`triangles` ≤ 4,000); `the smock and the hat carry their classes`
  (class 7 and class 8 vertices both present, every vertex's class in {7, 8, 255}); `his paint is the painting's` (the
  mean of class 7 stroke colours within ΔE76 10 of the village blues, class 8 within 10 of `villageWarm`, both
  converted from linear back to sRGB first); `the build is deterministic` (two builds, equal arrays).
- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3:** Build the parts in the table. The Lead looks at a capture of him at stop 2 beside Simon's figure
  (`scratch/explore-2026-10-23/simon/`) and the painting's figures before calling it done.
- [ ] **Step 4:** `npm run test:sky`: PASS.
- [ ] **Step 5:** Commit `feat(street): Vincent in the painting's strokes, smock, hat, hair and canvas (S2 task 3)`.

### Task 4: The walk in the street (worker)

**Files:**
- Create: `src/scene/StreetWalk.tsx`
- Modify: `src/scene/Street.tsx` (mount `<StreetWalk>`, the ID classes 7 and 8, the camera placement moves to the
  walk), `src/scene/streetMode.ts` (flags), `src/scene/DioramaExperience.tsx` (`<Street reduced={reduced} still={still} />`)
- Create: `scripts/check-street-walk.mjs`
- Test: `scripts/street-mode.test.ts`

**Interfaces:**
- Consumes: Tasks 1–3.
- Produces: `readStreetFlags` gains `walk: boolean` (false only for `walk=0`), `walkT: number | null` (clamped to
  [0, 0.9]), `walkMode: 'auto' | 'input' | null`, `vincent: boolean` (false only for `vincent=0`). Capture seams:
  `window.__streetWalk = { t, target, auto, set(t: number): void }` and `window.__vincentBox(): { x0, y0, x1, y1 }`
  in client pixels.

- [ ] **Step 1: Write the failing flag tests** in `street-mode.test.ts`: the four defaults (`walk` true, `walkT` null,
  `walkMode` null, `vincent` true); `walk=0`, `vincent=0`; `walkT=0.55` → 0.55, `walkT=2` → 0.9, `walkT=x` → null;
  `walkMode=auto` and `input`, anything else null.
- [ ] **Step 2:** Run it: FAIL. Implement the flags. Run `npm run test:sky`: PASS.
- [ ] **Step 3:** `StreetWalk.tsx`: one `useFrame(…, -1)`, so the camera is placed before the sky's frame reads it
  (`PaintingFlowSky3D.tsx:1166`; a negative priority keeps R3F's own render). Each frame: `stepWalk`, then the camera
  from `walkPose(t, portrait)` (fov, near, far and `updateProjectionMatrix` only when the orientation changes), then
  Vincent's group at `vincentPlace(t)` with `gait`'s lift and roll and the left arm's swing. Input on `window`: `wheel`
  (`passive: false`, `preventDefault` unless `ctrlKey`), `keydown` and `keyup` for ArrowUp, KeyW (forward) and
  ArrowDown, KeyS (back), ignored when the target is an input, select, textarea or contenteditable; `blur` releases
  every key (Review Focus 2). `pointerdown` and `pointerup` for the tap, only when `pointerdown`'s target is the
  canvas (Review Focus 4). With `walk=0` no listener is added and the automatic walk is off. Street.tsx's layout
  effect still sets `__streetCamera`. The phone test: `walkMode ?? (matchMedia('(hover: none) and (pointer: coarse)').matches ? 'auto' : 'input')`.
- [ ] **Step 4:** The ID pass: `idInjection` gains class 7 → (0.5, 0, 1) and class 8 → (0.5, 1, 0). Vincent's
  materials: `material('vincent', strokeGlslWith(CYPRESS_STROKE_BODY), fog(), true, ids, moon)` and a solid one, where
  `moon` is the light injection of "Vincent's construction", off under `light=0`.
- [ ] **Step 5:** `scripts/check-street-walk.mjs`, after `check-street-rotation.mjs`'s pattern. Each case asserts its
  precondition first, then its result, and throws its own message:
  1. Wheel: `?street=1&station=0&arrival=0&walkMode=input`, three wheel events of 200 px over the canvas: `t` rises
     by more than 0.1 / L within 1 s, and `__streetCamera().position` moved.
  2. Keys: ArrowUp held 1 s: Δt = 0.15 / L ± 25%. Then ArrowUp down, a `blur` event, 0.5 s: `t` changes by < 0.002
     after the blur.
  3. Phone: `walkMode=auto` at 390 × 844 with touch on: `t` rises over 2 s; a tap at `__vincentBox()`'s centre: `auto`
     false and `t` unchanged over 1 s; a second tap: `auto` true. A tap on the "Pause motion" button: `t` still over
     1 s, and `auto` still true (the pause stopped him, not a toggle).
  4. Reduced motion (`Emulation.setEmulatedMedia` `prefers-reduced-motion: reduce`) with `walkMode=auto`: `t`
     unchanged over 2 s; a tap on Vincent: `t` equals 0.23 exactly. Two captures 1 s apart: byte-identical.
- [ ] **Step 6:** Run it against Vite. Expected: four PASS lines. `npm run lint`, `npm run build`: clean.
- [ ] **Step 7:** Commit `feat(street): Vincent walks the lane, scroll and keys, the phone's walk and tap, reduced-motion steps (S2 task 4)`.

### Task 5: The gate's runs (worker; the Lead reads the output)

**Files:** `scripts/check-street-colour.ts` (classes 7 and 8 with the references in Global constraints),
`scripts/check-street-rotation.mjs` (its URL is fixed at `?street=1&station=2`: it gains `DIORAMA_CAPTURE_EXTRA`,
merged as `capture-diorama.mjs` does at line 292, and after the turn it asserts `__vincentBox()` lies inside the
viewport when the seam exists). Output to `scratch/street-s2-2026-10-24/t5/`.

- [ ] **Step 1:** Stations unchanged: stations 0–4, both viewports, `&vincent=0&walk=0`, pinned: byte-identical to
  Task 0's. The plain visit: byte-identical to Task 0's.
- [ ] **Step 2:** The palette: `check-street-colour.ts` at stations 0 and 2, desktop, unlit, IDs and full: smock and
  hat ΔE76 < 10, every S1b class still passing.
- [ ] **Step 3:** Perf, five rounds each, at stations 0, 2, 4 and at `walkT` 0.33 and 0.55 (`probe-detail.ts`: the
  nearest walk cameras to R2 and R4): mean, p95, max, `info.triangles`, against Task 0.
- [ ] **Step 4:** Rotation mid-walk (Review Focus 5): `check-street-rotation.mjs` with `walkT=0.55`: no rebuild,
  `fov` 75, and `__vincentBox()` inside the viewport after the turn.
- [ ] **Step 5:** Captures for the Lead: stations 0–4 and `walkT` 0.33, 0.55, both viewports, with Vincent; and a
  4 s clip of the keys walking from stop 1, frames at 10 per second (`bringToFront` before each capture).
- [ ] **Step 6:** Commit the colour gate's change: `test(street): the palette gate measures Vincent's smock and hat (S2 task 5)`.

### Task 6: The Lead's gate, the look passes and Mark's gate (Lead)

- [ ] **Step 1:** Read every Task 5 output. G1 tests, lint and build. G2 stations and plain visit byte-identical. G3
  palette. G4 perf and triangles. G5 reduced motion. G6 rotation. G7 R2 and R4 at their nearest walk points: read at
  1:1. G8 Vincent at 1:1 beside the painting's figures and Simon's: does he read as a figure walking, not a cone
  sliding?
- [ ] **Step 2:** Look passes on what G7 and G8 name, at most four. Each: the change, the captures, the read, the
  lessons.
- [ ] **Step 3:** Codex reviews the branch (Fable if Codex runs low). Answer every finding in the record.
- [ ] **Step 4:** Mark's gate: the live link on the Mac's LAN (desktop and phone), the sheets, and what is open
  (the phone's frame rate on a real device, open since S1; the camera criterion's edit).

## Not in this slice

The grass and the hand (slice 3), the grass parting at Vincent's feet, the portal and the way back (slice 4), legs
unless a look pass needs them, R2's and R4's detail unless G7 fails, and the camera criterion's text (Mark's).
