# B — touch: plan, 2026-10-13

Slice B of "Direction — make it alive" (`tasks/todo.md`): "the pointer or finger sends a local surge of light along
nearby ribbons that swirls, then decays back to the derived flow; tapping a star flares it. Resolve the drag
conflict with orbit on touch devices." Built in a cloud session on `claude/confident-bohr-1y7p2u` from `main` at
`ad15650` (all of A behind `?alive=1`), behind its own flag `?touch=1` (which implies `alive`: B rides A's clock
and shader variant), so the shipped default and the alive route both stay untouched until Mark's gate. Mark
judges feel on the preview; this session gates the mechanics with synthetic input under a pinned clock.

## What is there today

- **No pointer handling in the diorama.** `OrbitControls` (drei) owns drag on the canvas: one finger or the mouse
  rotates within `DIORAMA_ORBIT`; no pan; damping on. `ReliefExperience` (a retired route) listened to
  `pointermove` on `window`; nothing in the diorama does.
- **The sky is camera-locked** (`skyRoot.quaternion = camera.quaternion × homeInverse`), a dome of radius `DOME_R`
  6 about the scene origin, mapped by `uvToDioramaSkyPosition(u, v)`: `h = (u − 0.5)·SPAN_H·1.16`,
  `w = (0.5 − v)·SPAN_V·1.06`, direction `FWD·cos w cos h + RIGHT·cos w sin h + TRUEUP·sin w` (SPAN_H 2.15,
  SPAN_V = SPAN_H / 1.26). The camera orbits at distance 3–5.5 from a target near the origin, inside the dome, so
  a ray from the camera through any screen point leaves the sphere exactly once. The strips run u past 0..1 by
  0.3.
- **Both ribbon shaders** carry per-vertex `aLen` (0..1 along the ribbon), `aAcross`, `aPhase`, `aRate`, `aColor`,
  `aEdgeFade`, and with `ALIVE` the gust pair `aGust` and the `flat` varyings `vGustTime` / `vGustLift`. The light
  sky's `ribbonFrag` applies `col *= 1 + vGustLift` after its clamp and source-lum lift; `movingFrag` after its
  0.93 line, and its stroke slots floor a `flat` warped clock. `ribbonsToArrays` packs attributes from contiguous
  per-ribbon vertex runs (the gust pair is grouped by the (phase, rate) pair); the moving worker takes `gust`.
- **Halos** (`SourceOrbs`): the star list is `SWIRLS` minus the moon, the whorls and the cypress, each a sprite at
  `uvToDioramaSkyPosition(u, v, DOME_R − 0.01)`; the frame loop writes opacity and scale from the clock (A2).
- **Tooling.** `scripts/capture-diorama.mjs` already drives a synthetic drag through DevTools
  (`Input.dispatchMouseEvent`); `capture-sky-frames.mjs` pins the clock. The tuner shows A's six sliders.

## Design

### B1 — a screen point to a painting point

Manual listeners on the canvas element (`gl.domElement`: `pointermove`, `pointerdown`, `pointerup`,
`pointercancel`, `blur`), not R3F's pointer events: R3F raycasts every mesh under the pointer on each move, and the
moving sky is 600k triangles (a frame-long stall per move). The hook turns the event into NDC, unprojects a ray
through the active camera, intersects the sphere of radius `DOME_R` about the origin (the far root; the camera is
inside), rotates the hit direction into the sky group's frame (`skyRoot.quaternion⁻¹`) and inverts the mapping
analytically:

    h = atan2(d·RIGHT, d·FWD),  w = asin(d·TRUEUP)
    u = 0.5 + h / (SPAN_H·1.16),  v = 0.5 − w / (SPAN_V·1.06)

`skyPointFromRay` and `uvFromSkyDirection` live in `dioramaSkyProjection.ts` beside the forward map (node-testable).
A point is kept only for v in −0.1..0.75 and u in −0.3..1.3 (the sky; the hills and the island sit below). Because
the sky turns with the camera, a screen point maps to nearly the same (u, v) at every orbit pose; the camera's
offset from the origin (parallax inside the dome) is exact through the intersection, never approximated.

### B2 — gestures, and the drag question

- **Desktop:** the pointer moving over the sky sends a gentle surge every 60 ms at its point (amplitude 0.5 × the
  knob); a click sends a strong one (1.0). Hover leaves the orbit alone; a mouse drag still orbits, and trails
  surges too.
- **Touch:** the drag conflict dissolves on inspection. The sky is camera-locked, so a finger moving across the
  screen traces a well-defined path over the sky whether or not the diorama is turning under it. A one-finger drag
  therefore does BOTH: OrbitControls rotates the diorama as today (the listeners never `preventDefault` and never
  stop propagation) and the finger trails surges along its path. A tap (pointerdown to pointerup within 300 ms and
  under 8 px) sends a strong surge, and when it lands within a star's radius the star flares (B4). Two fingers
  (pinch) are the dolly as today and send nothing. This is a declared design choice for Mark's gate: the
  alternative (tap only, no trail on drag) is one constant.
- **Paused or reduced motion:** input is ignored (the surge list is not written), so the still is today's.
- The classifier (tap vs drag; the throttle) is a pure function in `touchSurge.ts` with its thresholds in the
  table, node-tested.

### B3 — the surge, in both ribbon shaders

A `TOUCH` define (requires `ALIVE`) compiles the surge in; the materials' memo keys and `customProgramCacheKey`
gain it. Per vertex, with the flag on, `aTouch` = [u, v, tx, ty]: the vertex's painting point and the ribbon's unit
tangent there in painting space (from its neighbours along the ribbon, built in `ribbonsToArrays`, grouped as the
gust pair is; the moving worker takes `touch` like `gust`). Packed only with the flag: off, the geometry is A's.

Uniforms: `uTouchCount` (0–8), `uTouchUV[8]`, `uTouchT0[8]`, `uTouchAmp[8]`, written each frame from the surge
store. For each surge k with `age = t − t0 ≥ 0` (else skipped), in angular-isotropic painting units
(`d = uv − uvk`, `d.y *= (SPAN_V·1.06)/(SPAN_H·1.16)`):

    along  = dot(d, tangent)              signed, downstream positive
    across = |d − along·tangent|
    E      = amp · e^(−age/τ)                                 the envelope, τ 1.6 s
    S      = e^(−((along − speed·age)/σs)²) · e^(−(across/σa)²)   the pulse running down the ribbon
    B      = e^(−(|d|/σ0)²)                                   the bloom where the finger is
    lift_k = E · (S + 0.5·B)
    warp_k = amp · kick · B · (1 − e^(−age/τ))                a local tempo kick that eases off

`vTouchLift = min(maxLift, Σ lift_k)` (plain varying; smooth along a ribbon) multiplies the colour where
`vGustLift` does: `col *= 1 + vGustLift + vTouchLift`. `Σ warp_k` is added into `vGustTime` (already `flat`), so the
strokes near the finger rush and settle: the "swirl" is the derived flow itself, briefly faster, never a new path.
Monotone: `d/dt warp_k = amp·kick·B·e^(−age/τ)/τ ≥ 0`, so the moving sky's slots never pop. The `S` term runs
DOWNSTREAM along the tangent (speed 0.25 of the canvas width per second, σs 0.06, σa 0.025; σ0 0.08; kick 1.5 s;
maxLift 1.5), so the light is sent along the strokes from the touch the way the great wave runs, not a ring.
Upstream vertices see only the bloom.

With `uTouchCount` 0 the loop does not run and both terms are absent (the varying is exactly 0 at every vertex,
and interpolated zeros are zero), so the touch route with no input is byte-identical to the alive route (gate 3).
Constants in `TOUCH_SURGE` (`touchSurge.ts`) reach the shader as uniforms, with a TS twin for the tests, as A's do.

### B4 — a tapped star flares

A tap within 0.04 (painting units) of a star's (u, v), or 0.06 of the moon's, pushes a flare {index, t0} (max 4).
The halo writer adds `flare = F · (1 − e^(−age/0.12)) · e^(−age/1.4)` to the breath factor (F 1.2 opacity, 0.5
scale): a quick rise and a slow fall, 0 at age 0. The star list's (u, v) is kept beside its positions for the hit
test (`nearestStar(u, v)`, node-tested).

### B5 — the store, the clock, the seam, the knob

- A `SurgeStore` ref owned by `Scene`: `{ surges: {u, v, t0, amp}[], flares }`, written by the input hook, read by
  the sky's frame loop into the uniform arrays (oldest replaced beyond 8; pruned after 5τ). `t0` is the sky clock
  at the event, read through the shared clock ref (A3), so a pinned clock gates the surge frame-exactly.
- Seam for the gate: `window.__touch = { surges, last }` and `window.__touchInject(u, v, amp)` (dev and the flag
  only), so a surge can be placed at a known painting point without a pointer, and a real pointer event can be
  checked against the analytic mapping.
- Knob `surge` (0–2, default 1) scales every amplitude; on the tuner when the flag is on; `sky-tuning.json`
  `touchSurge`; URL `?touch=1&surge=`. Flag and knob plumbing follow A's (`readAliveTuning` gains `surge`).

## Commits

1. `feat(sky): the inverse sky mapping and a touch-to-sky hook` — `uvFromSkyDirection`, `skyPointFromRay`, the
   listeners and classifier, the store; nothing drawn yet.
2. `feat(sky): a touch sends a surge of light along the ribbons behind ?touch=1` — `touchSurge.ts`, `aTouch`,
   the TOUCH variant in both shaders, the uniforms.
3. `feat(sky): a tapped star flares` — the hit test and the halo flare.
4. `feat(tuner): the surge knob` — knob, tuner, JSON, allowlist, App.
5. `test(touch): the mapping, the packing, the surge twin, the classifier` — T20–T25.
6. `docs(tasks): B's record, lessons, Tunables`.

## Tests (node, `test:sky`)

- **T20 mapping roundtrip:** for a grid of (u, v) over −0.3..1.3 × −0.1..0.9, `uvFromSkyDirection(uvToDioramaSkyPosition(u, v))`
  returns (u, v) within 1e-9; `skyPointFromRay` from a camera inside the dome hits the far root at radius `DOME_R`.
- **T21 tangent packing:** on a built ribbon set, each vertex's tangent is unit length, points from the previous
  vertex toward the next in painting space (dot > 0.9 with the chord), and the flag-off arrays carry no `aTouch`.
- **T22 the surge twin:** `lift` and `warp` are 0 for age < 0; `warp` is non-decreasing in t on a dense grid for
  three surges at once; `lift ≤ maxLift`; both under 1e-3 of their peak after 5τ; the pulse's peak along the
  tangent moves at `speed` (the crest at age a sits at `speed·a` within 1%); a vertex upstream (along < −3σs) takes
  the bloom only.
- **T23 the classifier:** down-up within 300 ms and 8 px is a tap; longer or further is a drag; the throttle emits
  at most one move surge per 60 ms.
- **T24 knobs:** `surge` defaults, clamps and reads like the six; `gustUniformValues` unchanged.
- **T25 the star hit test:** the nearest star within its radius, none beyond, the moon at its larger radius.
- Mutation proofs: dropping the tangent term (a ring instead of a run) turns T22's crest test red; `≥` to `>` in
  the age guard turns the age-0 case red; the throttle removed turns T23 red.

## Gate (this session; Mark's taste gate follows)

Dev server 5179, `CHROME_FLAGS=--no-sandbox`, `CAPTURE_SETTLE_MS` 12,000, 1600×900 unless said. Baseline: the alive
route on `ad15650` (`?alive=1`, shipped defaults) at pinned t, captured before the build.

1. lint, `tsc -b`, `test:sky`, build: green.
2. **Default vs `main`:** unchanged (the twelve frames of A2's gate), and **`?alive=1` vs its baseline** unchanged
   (B adds nothing to A's variant without the define).
3. **`?touch=1` with no input vs `?alive=1`** at t 0 / 2.3 / 11.2 (light) and 0 / 3.7 (moving): byte-identical.
4. **An injected surge** at (u 0.62, v 0.30), amp 1, t0 = 5 on the touch route: frames at 5.1 / 5.5 / 6.5 / 8 / 13 vs the
   alive baseline at the same times. Every differing pixel inside a disc of 220 px around the surge's screen
   point plus the band downstream of it (x to the right, per the derived flow there), none in the cypress or
   window footprints or beyond the band; at 13 (5τ) byte-identical again. Both skies.
5. **A real pointer:** `Input.dispatchMouseEvent` move and click at (1000, 300) → the seam's last (u, v) within 0.01
   of the analytic mapping's prediction for that screen point, one surge of amp 1. A drag with the existing
   helper → the camera moved (the orbit still works) AND the seam holds ≥ 4 trailing surges along the path. A
   tap on a star's screen point (from its uv through the mapping) → a flare: the diff against the baseline is
   confined to that halo's disc. Phone (390×844): `Input.dispatchTouchEvent` tap and drag, the same two outcomes.
6. **Colour:** band-mean Lab ΔE76 against the painting (A's crop) at the surge's peak frame: under 10.
7. **Motion by eye:** 3 s at 10 fps around a surge, light and moving, crop at 1:1: the light runs along the strokes
   away from the point, the strokes near it rush and settle, no ring, no pop, no stroke edge crawls; the flare
   rises fast and falls slow.
8. `check:reduced` on `?touch=1` (input ignored while paused); `check:viewport` on `?touch=1`.
9. Frame rate: not judgeable headless; per vertex the surge loop is up to 8 × (two exps and a few dots) on 100k–600k
   vertices, nothing per fragment beyond one add. `?perf=1` owed at the Mac with the rest.

## Risks

- **A ring, not a run.** If the tangent term reads weak by eye (the pulse barely longer than it is wide), raise
  σs or lower σa; the test's crest check keeps the direction honest.
- **Too many surges.** Hover at 60 ms with τ 1.6 s holds about 27 live surges; the cap of 8 keeps the newest, so a
  long trail fades from the back. If that reads as a short trail, the cap goes to 16 (the uniform arrays grow).
- **Touches over the foreground.** A tap on the cypress maps to the sky behind it and surges there; acceptable for
  a first pass, noted for Mark.
- **The moving sky's slots and the kick.** Monotone by construction; the gate's consecutive frames prove no pop.
- **The strips.** u past 0..1 is a valid surge point; the strips carry the same attributes.

## Review

A fresh agent reviews this plan with `PaintingFlowSky3D.tsx`, `dioramaSkyProjection.ts`, `skyMapping.ts`,
`skyRibbonArrays.ts`, `movingSky.worker.ts`, `DioramaExperience.tsx` and `skyAlive.ts` open, before the build, as
both passes of A were. Findings are applied here and in `tasks/2026-10-13-touch-b.md` (the record).
