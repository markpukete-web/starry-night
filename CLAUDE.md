# The Starry Night — interactive painting

## What this is

A standalone interactive 3D piece that makes Vincent van Gogh's *The Starry Night* (1889, public
domain) movable — the painting's sky genuinely churning the way Van Gogh painted the motion, not a
static canvas with effects on top. This is Mark's passion piece: the ONE painting he most wants to
build.

Standalone by decision (2026-06-12): its own repo, its own deploy. It is **not** a scene inside
markma.dev and not bound by that project's spec. Once finished it links from the portfolio and
lives at `starrynight.markma.dev` (Vercel Hobby + Cloudflare custom domain).

## The bar (locked — only Mark edits this section)

The swirl motion must read as **Van Gogh's brushstrokes**, not generic noise soup. Faithfulness
to the painting's motion, colour, and impasto energy is the whole point. Motion and colour are
derived from the painting itself (see Phase 0), never re-derived from memory or generic noise. (For
the orbitable 360° sky: the front composition follows the painting's real geometry and derived flow
field; the invented back — which a flat painting cannot supply — continues that same derived style.)

Prior art to study — study, never copy implementation or assets: Petros Vrellis' interactive
Starry Night (flow-field brushstroke animation); the Techartist time-dial diorama (markma.dev
repo, `docs/superpowers/references/2026-06-12-techartist-time-dial-diorama.md`) for the
preset-switch interaction shape, which is Phase 2 material at the earliest.

## Operating mode — autonomous, self-improving (decided 2026-06-13)

This project deliberately runs with more autonomy than markma.dev v3. Claude plans, builds,
self-reviews, and improves its own process between Mark's milestone gates. Use dynamic workflows
(`/effort ultracode`) for substantial passes; plain sessions for small fixes. Read
`tasks/lessons.md` at the start of every session — it is the project's memory.

### Phase 0 — reference pipeline (before any scene work)

1. Fetch the high-resolution public-domain scan into `reference/` and treat it as the source of
   truth for colour and stroke direction.
2. Build an offline script (`scripts/derive-reference.ts`) that outputs:
   - `public/reference/flow-field.png` — per-pixel stroke orientation via structure-tensor
     analysis of the scan
   - `public/reference/palette.json` — dominant colours per region (sky, moon, stars, cypress,
     village, hills)
3. Commit the derived assets and document the method in
   `docs/decisions/0001-reference-pipeline.md`.

### Phase 1 — design spikes (Claude decides, Mark reviews at the gate)

"What does movable mean" is settled by building, not discussing. Produce two or three small
spikes — e.g. flow-field instanced-brushstroke sky; 2.5D depth parallax; hybrid of both. Judge
each against the acceptance criteria and the painting, pick one, and record the rationale in
`docs/decisions/0002-movable-definition.md`. Default candidate to beat: hybrid — animated
brushstroke sky over a layered parallax foreground (cypress, village, steeple) with a
constrained camera — tasteful orbit limits, not free-fly (panning, unlimited zoom). See Out of scope.

### Build loop (every substantial change)

Plan → implement one slice → run the app → drive it across desktop + mobile viewports with
Playwright and capture screenshots → visually review the captures against the reference crops
and acceptance criteria, naming what looks wrong → retune mechanical fails → re-capture to
confirm → append what was learnt to `tasks/lessons.md` → next slice.

Never report a slice as done without having looked at the captures.

### Self-improvement rules

- Maintain `tasks/todo.md` (the plan, checkable items) and `tasks/lessons.md` (append after
  every correction, failed approach, or surprising result).
- Claude MAY edit: `tasks/*`, `docs/decisions/*`, the **Tunables** section below, and its own
  skills in `.claude/skills/`.
- Claude MUST NOT edit: **The bar**, **Gates**, **Out of scope**, or the acceptance criteria
  list. Propose changes in `tasks/todo.md`; Mark applies them.

### Stop and ask Mark when

- A milestone gate is reached.
- Acceptance criteria still fail after the retune cap on the same slice.
- A dependency beyond the approved list is wanted.
- Anything touches deploy, DNS, or analytics.
- Scope is tempted to grow — note the idea in `tasks/todo.md` instead of building it.

## Gates (Mark's taste calls — locked)

Mark reviews captures, not code, at five points: end of Phase 0; end of Phase 1 (the movable
decision); first full animated sky; foreground complete; pre-release. Between gates, Claude
proceeds without asking. Taste and release calls are Mark's, always — Claude flags what looks
wrong; Mark decides what feels right.

## Acceptance criteria (machine-checked every loop — locked)

- Stroke motion is driven by the derived flow field; alignment with the painting's orientation
  map, not generic curl noise.
- Colours sampled from `palette.json`; no drift beyond the tolerance in Tunables.
- Performance: 60 fps desktop, 30 fps mid-tier mobile, devicePixelRatio capped per Tunables.
- `prefers-reduced-motion` yields a dignified still state — the painting, well lit, no churn.
- Camera stays within the orbit limits in Tunables (polar + distance; no free-fly or panning); the
  diorama always reads as Starry Night — head-on it is the painting's composition.

## Stack (decided)

Vite + React + TypeScript + three.js + React Three Fiber + drei. npm. Same proven stack as
markma.dev v3 — capability transfers both ways. Approved additions: `leva` (dev-only tuning
panel), `@react-three/postprocessing` (bloom, optional). Any other dependency: stop and ask.
The current `App.tsx` scene is a scaffold smoke-test placeholder, not design.

## Tunables (Claude may adjust; log every change in tasks/lessons.md)

- Instanced stroke budget: start 8,000 desktop / 3,000 mobile
- Diorama sky ribbon budget (2026-10-11): painted light 3,200 requested ribbons (2,000 × 1.6 for the side
  strips), 194,850 scene triangles, 120 fps on an M5 Pro. Moving strokes 25,600 requested (×8), minPoints 5,
  601,128 ribbon triangles and 737,970 scene triangles with the star-body layer, 103 fps on an M5 Pro (was
  678,296 and 120 fps before the afternoon refinement). One count for every device, so a resize never
  rebuilds. Phone unmeasured.
- Palette tolerance: ΔE < 10 per region to begin; tighten as quality improves
- devicePixelRatio cap: 2 desktop / 1.5 mobile
- Camera orbit limits: polar 0.2–1.62 rad (≈11°–93°), distance 3–5.5; azimuth free; no pan (3D diorama).
  Max polar raised 1.5→1.62 on 2026-06-21 so the home view sits eye-level head-on to match the painting
  (Mark live review); still a hard limit, no free-fly/pan.
- Make-it-alive A, behind `?alive=1` until Mark's gate (2026-10-13, `src/scene/skyAlive.ts`): gust periods
  9.7 / 5.9 / 16.3 s, amplitudes 0.46 / 0.28 / 0.16 (sum 0.90; tempo 0.1×–1.9× in the band, mean 1; pass 1 raised
  them from 0.36 / 0.22 / 0.12), travel 3 s per canvas width left to right, brightness lift 0.15 (was 0.06),
  light-sky shimmer share 1 (was 0.5), calm floor 0.15, band luminance 0.38–0.52 (the ribbons' 35th–90th
  percentiles); star halos 4.5–9 s (±30% opacity, ±12% scale; were ±14/5%), moon 13 s (±18%, was ±8%). The
  shipped knobs are `sky-tuning.json`'s alive keys, Mark's pick of 2026-10-13: gust 0.95 (amplitude sum), lift
  0.3, shimmer 1, breath 2 (halos ±60/24%, moon ±36%). Tuner `?tune=1` (`src/AliveTuner.tsx`), URL knobs
  `?gust=&lift=&shimmer=&breath=` still honoured; every knob clamped so the clock never runs backwards.
- Make-it-alive A, second pass, behind the same flag (2026-10-13, `src/scene/cypressFlicker.ts`, `villageGlow.ts`):
  cypress flicker periods 1.9 / 3.1 s, amplitudes 0.6 / 0.4, 1.3 / 0.8 cycles over the tree (climbs 0.40 tree
  heights per second), envelope τ 1.5 s, depth 0.6 (±60% at the knob's maximum), floor 0.12, tip band 0.55–0.9 of
  the vertex's own lobe, tongue band |lateral| 0.40–0.75 (the strokes' 75th–95th percentiles), back strokes half
  the tongue, the underpaint solid half the knob. Window glimmer slow 2.3–4.1 s, fast 0.9–1.6 s (hashed per
  window), shares 0.7 / 0.3, depth 0.6. Knobs `flicker` and `glimmer` 0–1; shipped at 1 / 1, Mark's pick of
  2026-10-13 ("I like the Both at full one"; `sky-tuning.json` aliveFlicker / aliveGlimmer, `?tune=1` still dials).
- B, touch, behind `?touch=1` (implies `alive`; 2026-10-13, `src/scene/touchSurge.ts`): the lift's pulse speed 0.25
  canvas widths/s, σ 0.06 along × 0.025 across, bloom σ 0.08 × 0.04 along the stroke, rise 0.08 s, decay τ 1.6 s,
  ceiling 0.5 (A's), × 1.8 on the painted-light sky only (its glazes showed the lift at two thirds of the moving
  sky's; 2026-10-16, Mark: "in painted light, the cursor light is weaker"), 12 live surges in 16 slots with a 0.25 s fade on eviction; the kick 0.4 s fed into the gust
  clock's argument, so its push follows the local wind, 0.023–0.78 s of flow on a full-weight ribbon, 0.4 s on
  average (set 2026-10-16 in `bec5480`, replacing 0.4 s added on top, which could run strokes backwards), rise 0.4 s,
  decay 3 s, σ 0.05 from the ribbon's centreline segment, closed to zero by 10 s, max 4, never evicted live; every
  falloff cut at 3σ; hover amp 0.5 at ≥ 60 ms and ≥ 0.02 u, tap ≤ 300 ms and ≤ 8 px; star radius 0.04, moon 0.06;
  flare ×2.2 colour, ×1.5 scale, 0.12 s rise, 1.4 s fall. Knob `surge` 0–1.5, shipped 1 (`sky-tuning.json`
  `touchSurge`), untuned by Mark.
- C, arrival, behind `?arrival=1` (implies nothing; 2026-10-20, `src/scene/arrival.ts`): hold 4 s (the scan on a dark
  ground, Vincent's line from letter 777 beneath), the line fades over the last 1 s of the hold, the dissolve 1.5 s
  from the hold (the ground over its first half, `groundShare` 0.5, then the scan, which grows to 1.12), the sky's
  clock eased 0 → 1 over 3 s and the camera pushed from distance 5.55 to the home over 4 s, both from 0.75 s into
  the dissolve (`lead`); done at 8.75 s. Skip (tap, click, Enter, Space, Escape) runs the clock at 8×, so the whole
  arrival ends within 1.1 s; a frame counts at most 0.1 s (`maxDt`); the opening waits for the sky, the cypress and
  the scan, at most 15 s (`readyTimeout`); the chrome fades in over 600 ms (`reveal`). Reduced motion: no layer, no
  push, the line as a static caption until the first pointer or key. Untuned by Mark.
- Default sky: moving strokes (Mark, 2026-10-20, after C's gate); `?sky=light` opens on painted light. Reduced motion
  still forces the painted-light still.
- Flags on for every visitor (Mark, 2026-10-20, "go for your recommendation"): A (`alive`), B (`touch`) and C
  (`arrival`) are the default. `?alive=0` turns A and B off, `?touch=0` B alone, `?arrival=0` the opening; `=1` still
  works for links. The opening plays once per session on a plain visit (`sessionStorage`), always with `?arrival=1`.
  `?perf=1` shows the frame rate on screen. The guard and capture scripts opt out of the opening (`arrival=0`).
- E1, the cypress (2026-10-21, `tasks/2026-10-21-cypress-e1-plan.md`, the record `tasks/2026-10-21-cypress-e1.md`): the
  table and field baked from the 3840 px scan (`scripts/derive-cypress.ts`: the seed at 1600, the whole-tree component
  flooded raw inside the seed's box then closed by 1 px, tensor σ 6, low-pass σ 5, the blend to vertical gated on
  anisotropy 0.05–0.15). Ribbons (`src/scene/cypressStrokes.ts`, after four retunes): 450 front, back share 0.25,
  lengths 0.07–0.30 of the crop's height log-uniform (× 1.5 above 0.6, seeds there weighted 1.8×), step 0.0019,
  half-widths 0.03–0.06 crop widths capped at 0.45 of the seed's run (the painting's strokes are 30–60 px bands of
  453; at the 8–14 px lane width the tree read as fur), overshoot 4 steps, taper 0.45, relief spread 0.035, one
  pigment per ribbon: the mean of the tree texels across its width at the middle sample. The lift: the compiled rings'
  interpolation, the overshoot to 0.6 laterals, the edges clamped there, the ribbons 0.004 toward the camera. The
  underpaint `#151c1b`. The flicker's tongue band 0.72–0.93 (the ribbons' 75th and 95th percentiles of mean |lateral|;
  was 0.4–0.75). Each strip is lifted in five columns across its width (code review F1). The stroke body
  (`cypressStrokeShader.ts`) is the moving sky's, static, opaque with alphaTest 0.5 (order-independent edges, code
  review F2), one bristle lane 4.5 cycles across at mix(0.86, 1.08), rake 0.35, rim mix(0.8, 1), sheen 0.06, the dry
  brush over the tip's last quarter. Gate numbers after the review's fixes: IoU 0.817 (main 0.787), ΔE 1.0 / 1.2 /
  3.0, the expected area 96% covered, local contrast 0.93 (the painting 6.45; the bar 4–7.5 is open to Mark's eye),
  build 70 ms.
- E2, the land (2026-10-21, `src/scene/landStrokes.ts`, `landDomes.ts`, `landMapping.ts`, `landMasses.ts`): the ground
  2,000 ribbons in the band's field (960 × 319 at a quarter of the 3840 scan, tensor σ 1.5, low-pass σ 1.5 on the
  masses' curls and σ 3.5 elsewhere), lengths 0.1–0.3 of the band's height, step 4 px, half-widths 0.003–0.006 of the
  width laid out in world at 4.75 per u (the hills' × 1.7), taper 0.7, three columns, lift 0.02 along the normal,
  coverage about 2.7× on the apron and 6.5× on the hills, the top's solid hills × 0.3 (linear). The map: u 0.56 ↔
  x −0.036, 4.75 world per u (the right coast under the painting's right edge), the apron v 1.0–0.78 over z 1.35–0.25,
  the hills from 0.78 to the crest at that u over z 0.25 to −1.35; the cypress column filled from the band past the
  tree. The masses: ten authored boxes, domes capped at 0.3 high (a house's eave), rx 0.75 of the spacing, rz half the
  smaller radius, lift 0.012 along the facing axis, contact 0.005, strips `clamp(pixels / 40, 24, 180)` per mass
  (0.4 of them on the back), half-widths 0.04–0.08 of the box, overshoot 3, taper 0.5. Untuned by Mark.
- D1, touch the land (2026-10-21, `src/scene/landTouch.ts`, rides B's flag; `?touch=0` turns both off): radius 0.55 world
  units, push 0.14 on the cypress and 0.035 on the trees and bushes (a full-weight vertex where the lateral field peaks,
  at 0.447 of the radius), dip 0.35 of the push, rise 0.12 s, swing τ 0.9 s and period 1.3 s, closed between 4 and 5 s
  after the release, 4 live touches, hover amplitude 0.6, a hand on the land masks the sky's surge behind it; the bend
  weight is the vertex's local height over 2.7 on the cypress and its height over the terrain over the mass's height on
  the trees; the ground does not bend. Knob `bend` 0–1.5, shipped 1 (`sky-tuning.json` `touchBend`), untuned by Mark.
- E3, the cypress's medium (2026-10-22, `src/scene/cypressStrokes.ts` `sampleColours`, `cypressStrokeShader.ts`
  `CYPRESS_STROKE_BODY`): the colour along the stroke, one source pigment per kept step (the texel under each sample,
  sky samples filled from the nearest accepted, a box of ±3 samples in linear RGB; `perSampleColours`, off for the
  land); the cypress's stroke body lane mix 0.78–1.14 sharpened by smoothstep 0.3–0.7, rake 0.5, a coarse lane at
  2.2 cycles across (on the 0–1 coordinate) and a third, saturation 1.1 (E1's 1.3 compensated the one-colour mean's
  desaturation); the land's body keeps E1's text, pinned by hash. Gate at pass 5: spread 17.3 (the painting 18.5),
  light 13.9% (10.6%), warm 5.4% (5.9%), green 32.2% (30.3%), ΔE 3.0 / 1.5 / 2.0, IoU 0.840, 60 fps; the paired
  contrast 3.4 (the painting 11.1, the bar 5–10 not met: its bristle marks and canvas weave). The retune cap is
  reached (passes 1, 2, 3 and 5; 4 was F8's coordinate fix): any further change to the medium is Mark's call.
  Untuned by Mark.
- E4, the cypress's paint (2026-10-22, `src/scene/cypressStrokeShader.ts` `CYPRESS_STROKE_BODY`, built by the worker
  on Gemini 4 Argon as Mark's experiment, the Lead gating; the record `tasks/2026-10-22-cypress-e4.md`): the still look
  read as jelly (Mark: smooth, glossy, rounded), so the cypress's body is dry, broken and ridged. The factory's new
  fields, each defaulting to E1's text byte for byte for the land: tube flat 0.95 (E1 the rounded term), rim 1.0 (E1
  shaded), sheen 0 (E1 0.06, the line omitted), lanes 5.0 cycles across (E1 4.5), lane edge [0.42, 0.58] (E3 [0.3, 0.7])
  drifting by 0.15 × a slow noise along the stroke, fray 0.16 at 40 cycles along, gaps on the outer 30% of the shaped
  radius where the lane noise is under 0.3 (0.25% of the column's pixels: a dial that does nothing visible), the dry
  brush from 0.55 of the stroke (E1 0.75), the lit term side × 0.15 − 0.5 × the lane slope (E1 side − 0.12 × slope),
  rake 0.8 clamped [0.4, 1.6] (E3 0.5, unclamped). The colour along the stroke smoothed over ±1 sample (E3 ±3). Gate at
  pass 2: ΔE 1.41 / 0.49 / 0.91, spread 18.1, light 11.6%, L p50 15.0 (E3 15.4), IoU 0.844, the registered trunk
  window's 3 × 3 std 7.33 (the painting 9.05, E3 5.04), 60 fps (p95 17.4 ms). Two passes of the four used. Passed by
  Mark on production, 2026-10-23 ("It passed").
- The village street, S1 and S1b, behind `?street=1&station=0` to `4` (2026-10-24, `src/scene/streetLayout.ts`,
  `streetGeometry.ts`, `streetStrokes.ts`, `streetLight.ts`, `streetLife.ts`; the record `tasks/2026-10-23-street-s1b.md`):
  the map `layout-v1.svg` read at 0.0024 per pixel, the lane its Bézier, 2.396 long; stations at `t` 0, 0.23, 0.44, 0.66,
  0.9; stop 0 aimed 9° left of the church (portrait 17°), the cypress 0.9 from stop 0's camera 26° left of its heading,
  height 0.9, stride 4; stop 4's target centring the door's foot and the gable's peak (0.203). The budget 641,310 for the
  street (1,444,930 − 660,388 − 143,232), `DETAIL` lane 0.6, house 0.46; the street 631,290 triangles. `COTTAGE`
  thickness 0.02, overhang 0.02, rake 0.03; `ROOF_EDGE` 0.012; the thatch [972, 1186, 1020, 1226]; the bases at the
  source's mean, the ground's at its darkest 40%; the hills at radii 4.9 and 5.6, 0.8 of their height; `STREET_LIGHT`
  ambient 0.4, key 0.9 (the spike's). The path 0.12 wide, `PATH_LIFT` 0.5 toward `hillsCrest` on its strokes and its
  base, the base inset 0.024 from each edge (across on the lane, all four sides of the square), the segments' overlap
  0.02 in `t` (look pass 3 of 4, a pale lane like Simon Lee's). The colour gate keeps the fog on (Mark: "keep the fog for
  now"). `?light=0` builds the street unlit for the gate. Passed by Mark, 2026-10-24 ("It does read like a village").
- Retune cap per slice: 4 passes

## Working discipline (carried from markma.dev v3 — proven there)

- **British English** throughout.
- **Conventional commits**; the log reads as a build-in-public timeline.
- **Ground in the reference first** — the scan, not memory.
- **Visual review is part of every loop, not just the gates.** Playwright captures the frames;
  Claude reads them against the reference and fixes what it can see. A slice isn't done until the
  captures have been looked at and compared, not merely generated.
- **Classify before building:** authored assets for identity objects, procedural for fill.
- **Honest AI framing:** human-led product thinking supported by AI coding tools.

## Out of scope (locked)

- Audio, VR/AR, other paintings, gallery/series framing — this is one painting done deeply.
- Anything that puts Starry Night inside the markma.dev world. It links out, full stop.
- Free-fly / unconstrained camera (panning, unlimited zoom). Adopted 2026-06-13 with the 3D-diorama
  direction change: the diorama turns within tasteful orbit limits (polar + distance, see Tunables),
  so the composition is never broken.
- Preset dials (time-of-day, weather) before the core piece passes the pre-release gate.
