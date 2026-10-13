# B — touch: plan, 2026-10-13

Slice B of "Direction — make it alive" (`tasks/todo.md`): "the pointer or finger sends a local surge of light along
nearby ribbons that swirls, then decays back to the derived flow; tapping a star flares it. Resolve the drag
conflict with orbit on touch devices." Built in a cloud session on `claude/confident-bohr-1y7p2u` from `main` at
`ad15650` (all of A behind `?alive=1`), behind its own flag `?touch=1` (which implies `alive`: B rides A's clock
and shader variant), so the shipped default and the alive route both stay untouched until Mark's gate. Mark
judges feel on the preview; this session gates the mechanics with synthetic input under a pinned clock.

Reviewed by a fresh agent before the build (REVISE, F1–F13 below); the design here is the revised one.

## What is there today

- **No pointer handling in the diorama.** drei's `OrbitControls` (three-stdlib) binds `pointerdown` on the element
  R3F connects events to (the wrapper div), binds move and up on the document, never captures the pointer and
  `preventDefault`s only wheel, context menu and keys; `touch-action: none` is on that div. One finger rotates
  within `DIORAMA_ORBIT` (polar 0.58–1.62, distance 3.25–5.6 about the target near the origin), two fingers dolly
  (no pan), damping on.
- **The sky is camera-locked** (`skyRoot.quaternion = camera.quaternion × homeInverse`, identity at the home pose),
  a dome of radius `DOME_R` 6 about the scene origin, mapped by `uvToDioramaSkyPosition(u, v)`:
  `h = (u − 0.5)·SPAN_H·1.16`, `w = (0.5 − v)·SPAN_V·1.06`, direction `FWD cos w cos h + RIGHT cos w sin h +
  TRUEUP sin w`. At the orbit's extremes the camera sits OUTSIDE the dome (6.52 from the origin at polar 0.58,
  azimuth π/4, distance 5.6), looking in through the unpainted cap (review F4). The strips run u past 0..1 by 0.3.
- **Both ribbon shaders** carry per-vertex `aLen`, `aAcross`, `aPhase`, `aRate`, `aColor`, `aEdgeFade`, and with
  `ALIVE` the gust pair `aGust` (weight, lag) and the `flat` varyings `vGustTime` / `vGustLift`. The light sky's
  `ribbonFrag` applies `col *= 1 + vGustLift` after its clamp; `movingFrag` after its 0.93 line, and its stroke
  slots floor the warped clock. The builder emits each ribbon's vertices as side PAIRS with offset uvs, contiguous
  per ribbon; `ribbonsToArrays` groups a ribbon by its (phase, rate) pair; the moving worker takes `gust`.
- **Halos** (`SourceOrbs`): the star list is `SWIRLS` minus the moon, the whorls and the cypress, sprites at
  `uvToDioramaSkyPosition(u, v, DOME_R − 0.01)`, additive with `SrcAlpha`, so opacity clips at 1; the moon's halo
  sits at `MOON_PAINTED_UV` (0.8987, 0.1697), not `MOON_UV`. The frame loop writes opacity and scale (A2).
- **On pause** the light material is rebuilt at t = 0, the moving clock reset and the shared clock written 0.
- **Tooling.** `capture-diorama.mjs` drives a synthetic drag (`Input.dispatchMouseEvent`); `capture-sky-frames.mjs`
  pins the clock. The tuner shows A's six sliders.

## Design

### B1 — a screen point to a painting point

Manual listeners, not R3F's object events: the mapping is exact and cheap without raycasting any mesh, and the
ribbons need no handlers. `pointerdown` and `pointermove` on the element R3F connects events to
(`useThree(s => s.events.connected) ?? gl.domElement`), `pointerup` and `pointercancel` on `window` (a release
off the canvas must still close a gesture), reset on `visibilitychange` (review F5). NDC from the canvas's
`getBoundingClientRect()`. The hook unprojects a ray through the active camera and intersects the sphere of radius
`DOME_R` about the origin by the quadratic, taking the FAR root always (the painted far side, whether the camera
is inside or outside the dome), null when the ray misses or the far root is behind the camera (F4); rotates the
hit direction into the sky group's frame (`skyRoot.quaternion⁻¹`) and inverts the mapping analytically:

    h = atan2(d·RIGHT, d·FWD),  w = asin(d·TRUEUP)
    u = 0.5 + h / (SPAN_H·1.16),  v = 0.5 − w / (SPAN_V·1.06)

`uvFromSkyDirection` and `skyPointFromRay` live in `dioramaSkyProjection.ts` beside the forward map (node-tested,
round trip 4e-16; `|h| < π` and `|w| < π/2` over the strips and the cap, so no wrap). A point is kept only for v in
−0.1..0.75 and u in −0.3..1.3 (the sky). drei's `controls.update()` runs at priority −1 before the sky's quaternion
write, so the event-time camera and `skyRoot.quaternion⁻¹` agree.

### B2 — gestures, and the drag question

- **Desktop:** the pointer moving over the sky sends a gentle trail (a lift-only surge, amplitude 0.5 × the knob)
  when it has moved ≥ 0.02 u since the last and ≥ 60 ms have passed; a click sends a strong surge (1.0) that also
  kicks the tempo (B3). Hover leaves the orbit alone; a mouse drag orbits and trails.
- **Touch:** the drag conflict dissolves on inspection. The sky is camera-locked, so a finger moving across the
  screen traces a well-defined path over the sky whether or not the diorama turns under it. A one-finger drag does
  BOTH: OrbitControls rotates the diorama as today (our listeners never `preventDefault` and never stop
  propagation; three-stdlib's handler coexists, checked in its source) and the finger trails. A tap (down to up
  within 300 ms and 8 px) sends a strong surge with a kick, and when it lands within a star's radius the star
  flares (B4). Two fingers dolly as today and send nothing. A declared design choice for Mark's gate; the
  alternative (tap only, no trail) is one constant.
- **Paused or reduced motion:** input is ignored and the store is cleared; the store is also cleared on the
  material rebuild a pause causes, since the uniforms are recreated with it (F7).

### B3 — the surge, in both ribbon shaders

A `TOUCH` define (requires `ALIVE`) compiles the surge in; the materials' memo keys and `customProgramCacheKey`
gain it. With the flag on, two per-vertex attributes are packed in `ribbonsToArrays` (grouped by the (phase, rate)
pair; the moving worker takes `touch` like `gust`); off, the geometry is A's:

- `aTouch` = [u, v, tx, ty]: the vertex's painting point as the mean of its side pair (the builder offsets the
  two sides, F6) and the ribbon's unit tangent there, stride two (pairs), one-sided at the ends, guarded like the
  builder, normalised in the SAME isotropic metric the shader measures in (v scaled by `SKY_ASPECT` =
  (SPAN_V·1.06)/(SPAN_H·1.16) = 0.7252), so `dot(d, t)` is the along-distance.
- `aSeg` = [u0, v0, u1, v1]: the ribbon's centreline start and end (its first and last pair means), one value per
  ribbon, for the kick (F2).

Two lists reach the shader as uniform arrays mutated in place (F12): `uSurge[16]` vec4 (u, v, t0, amp) with
`uSurgeEnd[16]` (the forced end, or a large value) for the LIFT, and `uKick[4]` vec4 (u, v, t0, amp) for the
TEMPO; `uSurgeCount`, `uKickCount`. For each live entry with `age = t − t0 ≥ 0`, in isotropic units
(`d = uv − uvk`, `d.y *= aspect`):

    along  = dot(d, tangent)                    signed, downstream positive (increasing len, the signed field)
    across = |d − along·tangent|
    rise   = 1 − e^(−age/0.08)                  no pop-in: 0 at age 0 (F3)
    E      = amp · rise · e^(−age/τ) · W(t)     τ 1.6 s; W the closing window (below)
    S      = e^(−((along − speed·age)/σs)²) · e^(−(across/σa)²)       the pulse running down the ribbon
    B      = e^(−(along/σb∥)²) · e^(−(across/σb⊥)²)                   the bloom, along the stroke, not a disc (F13)
    lift_k = E · (S + B/2)

`vTouchLift = min(maxLift, aGust.x · Σ lift_k)` (plain varying; smooth along a ribbon, equal across its pair):
weighted by the ribbon's own gust weight, so the band and the whorls carry the light and the cobalt floor stays
calm, A's derivation (F3); `maxLift` 0.5, A's ceiling, so a strong surge is +50% at most and never blows a pale
stroke past hue. Speed 0.25 of the canvas width per second, σs 0.06, σa 0.025, σb∥ 0.08, σb⊥ 0.04.

The kick is ONE value per ribbon, so it can ride the `flat` clock without laddering (F2): evaluated in the vertex
shader from the ribbon's centreline segment `aSeg`, `Bseg = e^(−(dist(uvk, segment)/σk)²)` (σk 0.08, point-to-
segment distance in isotropic units: a touch near any part of a ribbon kicks that whole ribbon, neighbours
smoothly less):

    g(age) = (1 − e^(−age/τr)) · e^(−age/τk) · W(age)      τr 0.4 s, τk 3 s
    warp   = Σ ampk · kick · Bseg · g(age)                 kick 0.4 s

added into `vGustTime` for both skies (the shimmer's share formula is consistent with an added warp). `g` rises,
lingers and settles to EXACTLY zero: `W(age) = 1 − smoothstep(7, 10, age)` closes it at 10 s, and a kick is
pruned only once `age ≥ 10`, so nothing ever leaves the list with a value in it and the clock never steps back
(F1). Between, `d/dt warp ≥ −Σ ampk·kick·Bseg·|g'|min`; with at most 4 kicks, amp ≤ knob max 1.5, `|g'|min` ≈
0.17/s, the clock's rate stays above 1 − 4·1.5·0.4·0.17 ≈ 0.6: the strokes near a tap rush, linger, then run
slower for a moment as it settles, never backwards, and the moving sky's slots never pop. A tap when four kicks
are live and none finished lifts but does not kick (never evict a live kick). The lift list CAN evict: a new
surge on a full list of 16 sets the oldest's `end` = now + 0.25 s and `W(t) = 1 − smoothstep(end − 0.25, end, t)`
fades it out (a brightness fade, harmless); an entry is dropped once `t ≥ end` or `age ≥ 10`. The seam's
`__touchInject(u, v, amp, t0)` takes `t0` explicitly so the gate never rides the clock ref's one-frame lag (F10).

Both touch terms sit under `if (uSurgeCount > 0)` / `if (uKickCount > 0)` as SEPARATE statements after A's, so the
no-input path executes A's statements verbatim and the touch route with no input is byte-identical to the alive
route by construction, not by an FMA schedule (F9). Constants in `TOUCH_SURGE` (`touchSurge.ts`) reach the shader
as uniforms, with a TS twin for the tests (`surgeTerms`, `kickTerms`, the list model), as A's do.

### B4 — a tapped star flares

A tap within 0.04 (isotropic painting units; 53–85 px at home on 1600×900, 25–55 on the phone, larger at the
frame's edges) of a star's (u, v), or 0.06 of the moon's at `MOON_PAINTED_UV` (F8), pushes a flare {index, t0}
(max 4, pruned at 5 s). The halo writer multiplies the sprite's `material.color` (the texel, before the additive
clamp, so the falloff radiates outward; opacity clips, F8) by `1 + 1.2·flare(age)` and its scale by
`1 + 0.5·flare(age)`, `flare = (1 − e^(−age/0.12)) · e^(−age/1.4)`: a quick rise and a slow fall, 0 at age 0.
`nearestStar(u, v)` is node-tested.

### B5 — the store, the clock, the seams, the knob

- A `TouchStore` ref owned by `Scene`: `{ surges, kicks, flares }`, written by the input hook, read by the sky's
  frame loop into the uniform arrays (and by `SourceOrbs` for flares). `t0` is the sky clock at the event through
  the shared clock ref (A3). Cleared on pause, reduced motion and the material rebuild (F7).
- Seams (the flag and dev only): `window.__touch = { surges, kicks, flares, last }`, `window.__touchInject(u, v, amp,
  t0, kick?)`, `window.__camera()` (position and quaternion, for the drag check).
- Knob `surge` (0–1.5, default 1) scales every amplitude; on the tuner when the flag is on, whose share URL sets
  `touch=1` (F11); `sky-tuning.json` `touchSurge`; URL `?touch=1&surge=`. `readAliveTuning` gains `surge`.

## Commits

1. `feat(sky): the inverse sky mapping and the far-root ray` — `uvFromSkyDirection`, `skyPointFromRay`, T20.
2. `feat(sky): a touch sends a surge of light along the ribbons behind ?touch=1` — the hook, the store, `aTouch`
   and `aSeg`, the TOUCH variant in both shaders, the uniforms, the seams.
3. `feat(sky): a tapped star flares` — the hit test and the halo flare.
4. `feat(tuner): the surge knob` — knob, tuner, JSON, allowlist, App.
5. `test(touch): the mapping, the packing, the list model, the classifier` — T20–T25.
6. `docs(tasks): B's record, lessons, Tunables`.

## Tests (node, `test:sky`)

- **T20 mapping:** round trip over −0.3..1.3 × −0.1..0.9 within 1e-9; `skyPointFromRay` from inside the dome and
  from the measured outside pose (6.52 from the origin) both return the far root at radius `DOME_R`; a ray that
  misses returns null.
- **T21 packing:** on a built ribbon set the side pair shares (u, v, tx, ty); the tangent is unit in the isotropic
  metric and within 25° of the chord to the next pair; `aSeg` is one value per ribbon, its ends the first and last
  pair means; flag-off arrays carry neither; `ribbonBuffers` lists both (A's F8).
- **T22 the surge twin:** 0 for age < 0 and exactly 0 at age 0 (the rise); `lift ≤ maxLift`; the crest at
  speed·age within 1%; ANISOTROPY: the lift at (along 0, across speed·age) under 10% of the lift at (along
  speed·age, across 0) (F11); the bloom along a stroke longer than across; gone by 5τ.
- **T22b the kick:** `g(0) = 0`, `g ≥ 0`, `g(10) = 0` exactly and 0 after; on a modelled list (push, refuse at 4,
  prune at 10) of four coincident kicks at the knob's maximum and `Bseg` 1 the clock `t + Σ warp` is non-decreasing
  on a 1/240 s grid across the pruning instants (F1); point-to-segment distance against three hand cases.
- **T22c the lift list:** 17 pushes keep 16, the oldest gets an end 0.25 s out, W reaches 0 at the end and the entry
  is dropped; entries drop at age 10; hover emission needs both ≥ 0.02 u and ≥ 60 ms.
- **T23 the classifier:** as before.
- **T24 knobs:** `surge` defaults, clamps and reads like the six; the tuner's share URL carries `touch=1` with the
  flag on.
- **T25 the star hit test:** nearest within radius, none beyond, the moon at its larger radius at `MOON_PAINTED_UV`.
- Mutation proofs: the anisotropy assertion catches a radial pulse; `W` removed makes `g(10) ≠ 0`; the rise removed
  makes `lift(0) ≠ 0`; the refusal removed lets a fifth kick in.

## Gate (this session; Mark's taste gate follows)

Dev server 5179, `CHROME_FLAGS=--no-sandbox`, `CAPTURE_SETTLE_MS` 12,000, 1600×900 unless said. Baseline: the alive
route on `ad15650` (`?alive=1`, shipped defaults) at pinned t, captured before the build (session scratch
`b/frames-alive`: light 0 / 2.3 / 5 / 5.1 / 5.5 / 6.5 / 8 / 11.2 / 13, moving 0 / 3.7 / 5.1 / 5.5 / 6.5 / 8 / 13, phone
light 0 / 5.5), its t = 0 frame byte-identical to A2's gate frame.

1. lint, `tsc -b`, `test:sky`, build: green.
2. **Default vs `main`:** unchanged (the twelve frames of A2's gate), and **`?alive=1` vs its baseline** unchanged.
3. **`?touch=1` with no input vs `?alive=1`** at t 0 / 2.3 / 11.2 (light) and 0 / 3.7 (moving): byte-identical.
4. **An injected surge with a kick** at (u 0.62, v 0.30), amp 1, t0 = 5, through `__touchInject(…, 5, true)`: frames
   at 5.1 / 5.5 / 6.5 / 8 / 13 vs the baseline. The mask is built from the TS twin (F10): the light sky's ribbons
   built under node on the real assets (the WebP ones converted to PNG for the decoder), every vertex with lift or
   warp above 1e-3 at the frame's t projected through the home camera and dilated by the ribbon's width + 4 px;
   every differing pixel inside the mask, none in the cypress or window footprints; the diff's centroid at 5.1
   within 20 px of the predicted screen point (945, 232); the crest's centroid moving +x between 5.5 and 6.5; at
   13 only the kick's slowed strokes may differ, inside the mask. The moving sky's arrays build the same way.
5. **Across a prune:** consecutive frames at 14.99 and 15.01 (the kick ends at 15) differ by at most A's own
   per-0.01 s motion (measured on the baseline pair 5 / 5.1 scaled), no stroke appearing or vanishing.
6. **A real pointer:** `Input.dispatchMouseEvent` move and click at (1000, 300) → the seam's last (u, v) within 0.01
   of the mapping's prediction (0.660, 0.367), one surge of amp 1 and one kick. A drag with the existing helper's
   events → `__camera()` changed (the orbit still works) AND the seam holds ≥ 4 trailing surges. A tap on a star
   clear of the cypress (its screen point from its uv) → the diff against the baseline confined to that halo's
   disc. Phone (390×844, `Emulation.setTouchEmulationEnabled` with `maxTouchPoints` 2, then
   `Input.dispatchTouchEvent`): tap and drag, the same two outcomes.
7. **Colour:** band-mean Lab ΔE76 against the painting (A's crop) at the surge's peak frame: under 10.
8. **Motion by eye:** 3 s at 10 fps around a surge, light and moving, crop at 1:1: the light runs along the strokes
   away from the point, the strokes near it rush and settle, no ring, no pop, no stroke edge crawls; the flare
   rises fast and falls slow.
9. `check:reduced` on `?touch=1` (input ignored while paused); `check:viewport` on `?touch=1`.
10. Frame rate: not judgeable headless; per vertex up to 16 lift and 4 kick evaluations (a few exps each) on
    100k–650k vertices, nothing per fragment beyond one add; `aTouch` and `aSeg` add 32 bytes per vertex (about
    21 MB on the moving sky, packed only with the flag; recorded). `?perf=1` owed at the Mac with the rest.

## Risks

- **A ring, not a run.** The anisotropy test keeps the pulse longer than wide; if the eye still reads a glow, σb⊥
  comes down first.
- **The trail saturating.** 16 live lift surges with a 0.25 s fade on eviction: a long slow trail fades from the
  back; if that reads short, the cap goes to 24.
- **Touches over the foreground.** A tap on the cypress maps to the sky behind it; acceptable for a first pass,
  noted for Mark.
- **The kick's slow-down.** The settle runs the strokes at no less than 0.6× for a moment at the knob's maximum
  with four taps on one spot; the eye check decides whether that reads as "settling" or as a stall.
- **The strips.** u past 0..1 is a valid surge point; the strips carry the same attributes.

## Review

Reviewed before the build by a fresh agent with the shaders, the projection, the packer, the worker, the scene,
three-stdlib's OrbitControls and three's Ray open. Verdict REVISE; applied above:

- F1 (blocker) a pruned or evicted kick stepped the clock back → a kick that settles to exactly zero before it is
  pruned, never evicted live; the lift list evicts with a fade.
- F2 (blocker) a per-vertex kick through the `flat` clock laddered along a ribbon → one kick per ribbon from its
  centreline segment.
- F3 the lift popped in at full and could blow a stroke to white → a rise, `maxLift` 0.5, weighted by `aGust.x`.
- F4 the camera leaves the dome at the orbit's extremes → the far root always, null on a miss.
- F5 listeners: down/move on the connected element, up/cancel on `window`, `visibilitychange`; the rationale
  corrected.
- F6 the side pair's offset uvs → the pair mean; the tangent in the isotropic metric; `ribbonBuffers` tested.
- F7 the store cleared on pause, reduced motion and the rebuild.
- F8 the moon at `MOON_PAINTED_UV`; the flare on colour and scale, not opacity.
- F9 the touch terms as separate guarded statements.
- F10 a runnable mask from the TS twin; touch emulation; `t0` explicit on the seam.
- F11 the anisotropy assertion; `surge` through the knob plumbing; the share URL.
- F12 vec4 arrays mutated in place; the attribute cost recorded.
- F13 the bloom along the stroke; the glow named as a reading.
- Checked sound by the reviewer: the analytic inverse and its ranges; the ribbons at `DOME_R`; the group at the
  origin; the update order of the controls and the sky; the shimmer's share with an added warp; "downstream" is
  increasing len in both skies; `touch-action` and the two-finger dolly; no new dependency, no pan, the orbit
  untouched; flag-off geometry unchanged by a flag-only attribute.
