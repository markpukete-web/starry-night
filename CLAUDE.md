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
- Camera stays within the orbit limits in Tunables (polar + distance; no free-fly or panning) while
  the visitor orbits the diorama. Inside a portal scene (the village street, 2026-10-23), an authored
  camera path may leave them: the portal's flight, and the walk along the scene's path. The visitor
  moves the camera only along that path, never off it. The diorama always reads as Starry Night —
  head-on it is the painting's composition.

## Stack (decided)

Vite + React + TypeScript + three.js + React Three Fiber + drei. npm. Same proven stack as
markma.dev v3 — capability transfers both ways. Approved additions: `leva` (dev-only tuning
panel), `@react-three/postprocessing` (bloom, optional). Any other dependency: stop and ask.
The current `App.tsx` scene is a scaffold smoke-test placeholder, not design.

## Tunables (Claude may adjust; log every change in tasks/lessons.md)

- Instanced stroke budget: start 8,000 desktop / 3,000 mobile
- Diorama sky ribbon budget (2026-10-11, the record `tasks/2026-10-11-sky-choice.md`): painted light 3,200 requested
  ribbons (2,000 × 1.6 for the side strips), 194,850 scene triangles. Moving strokes 25,600 requested (×8), minPoints 5,
  601,128 ribbon triangles and 737,970 scene triangles with the star-body layer. One count for every device, so a
  resize never rebuilds. Phone unmeasured.
- Palette tolerance: ΔE < 10 per region to start with. Tighten as quality improves.
- devicePixelRatio cap: 1.5 on every device (`DioramaExperience.tsx`, the Canvas's `dpr={[1, 1.5]}`). Corrected
  2026-10-30 to the code, which has shipped it since 2026-07-06 (Mark: "Tunables follow code"). The Tunables had said 2
  on desktop. The performance review (2026-10-30, `tasks/2026-10-30-perf-review.md`) found that desktop cannot afford
  2 on the diorama: its median frame is 17.2 ms on an M5 Pro, so the cap stays 1.5. The street could afford 2.
- Camera orbit limits (`src/scene/dioramaContract.ts` `DIORAMA_ORBIT`): polar 0.58–1.62 rad (≈33°–93°), distance
  3.25–5.6, azimuth −15° to +45° (−15° toward the rear cypress, whose back is blank source edge), no pan (3D diorama).
  The max polar of 1.62 (2026-06-21, Mark's live review) lets the home view sit eye-level head-on, to match the
  painting. They are hard limits: no free-fly, no pan. Corrected 2026-10-30 to the code, which has shipped them since
  2026-07-06 (Mark: "Tunables follow code"). The Tunables had said polar 0.2–1.62, distance 3–5.5 and azimuth free.
- Portrait lens (2026-10-25, `src/scene/dioramaContract.ts` `PORTRAIT_FIT`, the record `tasks/2026-10-25-phone-framing.md`):
  candidate C's pose. It holds the horizontal field of 360 × 800 (vertical fov 88 at aspect 0.45) up to aspect 0.65,
  and the vertical fov narrows to keep it (72.0° at Mark's 440 × 735, 86.5° at 390 × 844). Below 0.45 the fov is 88.
  Above 0.65 (a tablet) the lens stays at 0.65's. Set on the diorama only. Mark: "take the lead, get it fix". Passed
  on his phone, 2026-10-25 ("It reads right on the phone").
- Make-it-alive A (2026-10-13, `src/scene/skyAlive.ts`, the record `tasks/2026-10-13-alive-a.md`), on by default (see
  the flags below). The code's values: gust periods 9.7 / 5.9 / 16.3 s, amplitudes 0.46 / 0.28 / 0.16 (sum 0.90, tempo
  0.1×–1.9× in the band, mean 1), travel 3 s per canvas width left to right, brightness lift 0.15, light-sky shimmer
  share 1, calm floor 0.15, band luminance 0.38–0.52 (the ribbons' 35th–90th percentiles). Star halos 4.5–9 s (±30%
  opacity, ±12% scale), moon 13 s (±18%). The shipped knobs are `sky-tuning.json`'s alive keys, Mark's pick of
  2026-10-13: gust 0.95 (amplitude sum), lift 0.3, shimmer 1, breath 2 (halos ±60/24%, moon ±36%). Tuner `?tune=1`
  (`src/AliveTuner.tsx`). The URL knobs `?gust=&lift=&shimmer=&breath=` are still honoured. Every knob is clamped so
  the clock never runs backwards.
- Make-it-alive A, second pass, on with A (2026-10-13, `src/scene/cypressFlicker.ts`, `villageGlow.ts`, the record
  `tasks/2026-10-13-alive-a2.md`): cypress flicker periods 1.9 / 3.1 s, amplitudes 0.6 / 0.4, 1.3 / 0.8 cycles over the
  tree (climbs 0.40 tree heights per second), envelope τ 1.5 s, depth 0.6 (±60% at the knob's maximum), floor 0.12,
  tip band 0.55–0.9 of the vertex's own lobe. The tongue band is E1's (below). Back strokes take half the tongue, the
  underpaint solid half the knob. Window glimmer slow 2.3–4.1 s, fast 0.9–1.6 s (hashed per window), shares 0.7 / 0.3,
  depth 0.6. Knobs `flicker` and `glimmer` 0–1, shipped at 1 / 1, Mark's pick of 2026-10-13 ("I like the Both at
  full one", `sky-tuning.json` aliveFlicker / aliveGlimmer). `?tune=1` still dials them.
- B, touch (2026-10-13, `src/scene/touchSurge.ts`, the record `tasks/2026-10-13-touch-b.md`), on by default, and it
  implies `alive`. The lift's pulse speed 0.25 canvas widths/s, σ 0.06 along × 0.025 across, bloom σ 0.08 × 0.04 along
  the stroke, rise 0.08 s, decay τ 1.6 s, ceiling 0.5 (A's), × 1.8 on the painted-light sky only (2026-10-16, Mark: "in
  painted light, the cursor light is weaker"). 12 live surges in 16 slots, with a 0.25 s fade on eviction. The kick
  0.4 s is fed into the gust clock's argument, so its push follows the local wind: 0.023–0.78 s of flow on a
  full-weight ribbon, 0.4 s on average (set 2026-10-16 in `bec5480`). Added on top of the clock instead, it could run
  strokes backwards. The kick's rise 0.4 s, decay 3 s, σ 0.05 from the ribbon's centreline segment, closed to zero by
  10 s, max 4, never evicted live. Every falloff is cut at 3σ. Hover amp 0.5 at ≥ 60 ms and ≥ 0.02 u. Tap ≤ 300 ms and
  ≤ 8 px. Star radius 0.04, moon 0.06. Flare ×2.2 colour, ×1.5 scale, 0.12 s rise, 1.4 s fall. Knob `surge` 0–1.5,
  shipped 1 (`sky-tuning.json` `touchSurge`), untuned by Mark.
- C, arrival (2026-10-20, `src/scene/arrival.ts`, the record `tasks/2026-10-20-arrival-c.md`), on by default. Its flag
  implies no other. Hold 4 s (the scan on a dark ground, Vincent's line from letter 777 beneath). The line fades over
  the last 1 s of the hold. The dissolve takes 1.5 s from the hold: the ground over its first half (`groundShare`
  0.5), then the scan, which grows to 1.12. The sky's clock eases 0 → 1 over 3 s and the camera pushes from distance
  5.55 to the home over 4 s, both from 0.75 s into the dissolve (`lead`). Done at 8.75 s. Skip (tap, click, Enter,
  Space, Escape) runs the clock at 8×, so the whole arrival ends within 1.1 s. A frame counts at most 0.1 s (`maxDt`).
  The opening waits for the sky, the cypress and the scan, at most 15 s (`readyTimeout`). The chrome fades in over
  600 ms (`reveal`). Reduced motion: no layer, no push, the line as a static caption until the first pointer or key.
  Untuned by Mark.
- The loading curtain (2026-10-25, `index.html` `#boot`, `src/bootCurtain.ts`, the record
  `tasks/2026-10-25-loading-curtain.md`): C's first frame is in the page, with the cue "Painting the night sky…" under
  the citation at 0.6 of the line's opacity, faded over 0.5 s (`CUE_FADE`) once the wait ends. The hold counts from the
  painting: the time it was shown while waiting, at most 1 s per frame (`seenDt`), capped so 1.5 s of the hold is left
  once the scene is ready (`afterReady`). A skip does not end the wait: it runs the clock at 8× from the moment the
  scene is ready. `readyTimeout` is 15 s, and slow 4G is out of scope (Mark, 2026-10-25). A page that fails (an
  uncaught error, a failed load, an unhandled rejection) hides the cue. Passed by Mark on his phone, 2026-10-25 ("it
  works well in terms with landing").
- Default sky: moving strokes (Mark, 2026-10-20, after C's gate). `?sky=light` opens on painted light. Reduced motion
  still forces the painted-light still.
- Flags on for every visitor (Mark, 2026-10-20, "go for your recommendation"): A (`alive`), B (`touch`) and C
  (`arrival`) are the default. `?alive=0` turns A and B off, `?touch=0` B alone, `?arrival=0` the opening. `=1` still
  works for links. The opening plays once per session on a plain visit (`sessionStorage`), always with `?arrival=1`.
  `?perf=1` shows the frame rate on screen. The guard and capture scripts opt out of the opening (`arrival=0`).
- E1, the cypress (2026-10-21, `tasks/2026-10-21-cypress-e1-plan.md`, the record `tasks/2026-10-21-cypress-e1.md`): the
  table and field baked from the 3840 px scan (`scripts/derive-cypress.ts`: the seed at 1600, the whole-tree component
  flooded raw inside the seed's box then closed by 1 px, tensor σ 6, low-pass σ 5, the blend to vertical gated on
  anisotropy 0.05–0.15). Ribbons (`src/scene/cypressStrokes.ts`): 450 front, back share 0.25, lengths 0.07–0.30 of the
  crop's height log-uniform (× 1.5 above 0.6, seeds there weighted 1.8×), step 0.0019, half-widths 0.03–0.06 crop
  widths capped at 0.45 of the seed's run (the painting's strokes are 30–60 px bands of 453), overshoot 4 steps, taper
  0.45, relief spread 0.035. Their colour is E3's and E4's (below). The lift: the compiled rings' interpolation, the
  overshoot to 0.6 laterals, the edges clamped there, the ribbons 0.004 toward the camera. Each strip is lifted in five
  columns across its width (code review F1). The underpaint `#151c1b`. The flicker's tongue band 0.72–0.93 (the
  ribbons' 75th and 95th percentiles of mean |lateral|). The stroke body (`cypressStrokeShader.ts`) is the moving
  sky's, static, opaque with alphaTest 0.5 (order-independent edges, code review F2). E1's body text, which the land
  keeps (E3 and E4 set the cypress's): one bristle lane 4.5 cycles across at mix(0.86, 1.08), rake 0.35, rim mix(0.8,
  1), sheen 0.06, the dry brush over the tip's last quarter. The local-contrast bar 4–7.5 is open to Mark's eye (the
  painting 6.45).
- E2, the land (2026-10-21, `src/scene/landStrokes.ts`, `landDomes.ts`, `landMapping.ts`, `landMasses.ts`, the record
  `tasks/2026-10-21-land-e2.md`): the ground 2,000 ribbons in the band's field (960 × 319 at a quarter of the 3840
  scan, tensor σ 1.5, low-pass σ 1.5 on the masses' curls and σ 3.5 elsewhere), lengths 0.1–0.3 of the band's height,
  step 4 px, half-widths 0.003–0.006 of the width laid out in world at 4.75 per u (the hills' × 1.7), taper 0.7, three
  columns, lift 0.02 along the normal. The top's solid hills × 0.3 (linear). The map: u 0.56 ↔ x −0.036, 4.75 world
  per u (the right coast under the painting's right edge), the apron v 1.0–0.78 over z 1.35–0.25, the hills from 0.78
  to the crest at that u over z 0.25 to −1.35. The cypress column is filled from the band past the tree. The masses:
  ten authored boxes, domes capped at 0.3 high (a house's eave), rx 0.75 of the spacing, rz half the smaller radius,
  lift 0.012 along the facing axis, contact 0.005, strips `clamp(pixels / 40, 24, 180)` per mass (0.4 of them on the
  back), half-widths 0.04–0.08 of the box, overshoot 3, taper 0.5. Untuned by Mark.
- D1, touch the land (2026-10-21, `src/scene/landTouch.ts`, the record `tasks/2026-10-20-touch-land-d1.md`), rides B's
  flag, and `?touch=0` turns both off. Radius 0.55 world units. Push 0.14 on the cypress and 0.035 on the trees and
  bushes (a full-weight vertex where the lateral field peaks, at 0.447 of the radius). Dip 0.35 of the push, rise
  0.12 s, swing τ 0.9 s and period 1.3 s, closed between 4 and 5 s after the release. 4 live touches, hover amplitude
  0.6. A mouse or a pen on the land masks the sky's surge behind it. The bend weight is the vertex's local height over
  2.7 on the cypress, and its height over the terrain over the mass's height on the trees. The ground does not bend.
  Knob `bend` 0–1.5, shipped 1 (`sky-tuning.json` `touchBend`), untuned by Mark. A finger touches no land, only a mouse
  or a pen (2026-10-25, Mark's choice, `useTouchInput.ts` `landActive`, the record `tasks/2026-10-25-finger-no-bend.md`):
  on his iPhone 17 Pro Max the land's cast under a moving finger held 18–50 fps, and with the finger kept off the land,
  60.
- E3, the cypress's medium (2026-10-22, `src/scene/cypressStrokes.ts` `sampleColours`, `cypressStrokeShader.ts`
  `CYPRESS_STROKE_BODY`, the record `tasks/2026-10-22-cypress-e3.md`): the colour along the stroke, one source pigment
  per kept step (the texel under each sample, sky samples filled from the nearest accepted, smoothed in linear RGB as
  E4 sets). `perSampleColours` is off for the land. The cypress's stroke body: lane mix 0.78–1.14 sharpened by a smoothstep
  over E4's lane edge, a coarse lane at 2.2 cycles across (on the 0–1 coordinate) and a third, saturation 1.1. E4 sets
  its rake. The land's body
  keeps E1's text, pinned by hash. The paired-contrast bar 5–10 is not met: the painting's 11.1 is its bristle marks and
  canvas weave. The retune cap is reached: any further change to the medium is Mark's call.
  Untuned by Mark.
- E4, the cypress's paint (2026-10-22, `src/scene/cypressStrokeShader.ts` `CYPRESS_STROKE_BODY`, Mark's experiment, the
  record `tasks/2026-10-22-cypress-e4.md`): the still look read as jelly (Mark: smooth, glossy, rounded), so the
  cypress's body is dry, broken and ridged. The factory's fields, each defaulting to E1's text byte for byte for the
  land: tube flat 0.95 (the land: the rounded term), rim 1.0 (the land: shaded), sheen 0 (the land: 0.06, the line
  omitted), lanes 5.0 cycles across (the land: 4.5), lane edge [0.42, 0.58] drifting by 0.15 × a slow noise along the
  stroke, fray 0.16 at 40 cycles along, gaps on the outer 30% of the shaped radius where the lane noise is under 0.3
  (0.25% of the column's pixels: a dial that does nothing visible), the dry brush from 0.55 of the stroke (the land:
  0.75), the lit term side × 0.15 − 0.5 × the lane slope (the land: side − 0.12 × slope), rake 0.8 clamped [0.4, 1.6].
  The colour along the stroke is smoothed over ±1 sample. Passed by Mark on production, 2026-10-23 ("It passed").
- The village street, S1 and S1b, opened with `?street=1&station=0` to `4` (2026-10-24, `src/scene/streetLayout.ts`,
  `streetGeometry.ts`, `streetStrokes.ts`, `streetLight.ts`, `streetLife.ts`, the record `tasks/2026-10-23-street-s1b.md`):
  the map `layout-v1.svg` read at 0.0024 per pixel, the lane its Bézier, 2.396 long. Stations at `t` 0, 0.23, 0.44,
  0.66, 0.9. Stop 0 aimed 9° left of the church (portrait 17°). Stop 4's aim is the church's (below). The cypress 0.9
  from stop 0's camera, 26° left of its heading, height 0.9, stride 4. The budget 641,310 for the street (1,444,930 −
  660,388 − 143,232). 1,444,930 is the scene's ceiling at the walk's worst point. `DETAIL` lane 0.6, house 0.46. `COTTAGE` thickness 0.02,
  overhang 0.02, rake 0.03. `ROOF_EDGE` 0.012. The thatch [972, 1186, 1020, 1226]. The bases at the source's mean, the
  ground's at its darkest 40%. The hills at radii 4.9 and 5.6, 0.8 of their height. `STREET_LIGHT` ambient 0.4, key 0.9
  (the spike's). The path 0.12 wide, `PATH_LIFT` 0.5 toward `hillsCrest` on its strokes and its base, the base inset
  0.024 from each edge (across on the lane, all four sides of the square), the segments' overlap 0.02 in `t` (a pale
  lane like Simon Lee's). The colour gate keeps the fog on (Mark: "keep the fog for now"). `?light=0` builds the street
  unlit for the gate. Passed by Mark, 2026-10-24 ("It does read like a village").
- The street's slice 2, Vincent and the walk, on with `?street=1` (2026-10-24, `src/scene/streetWalk.ts`, `StreetWalk.tsx`,
  `vincent.ts`, `streetLayout.ts` `VINCENT_RIG`, the record `tasks/2026-10-24-street-s2.md`): the walk runs `t` 0–0.9
  along the lane. The wheel 0.001 world units per pixel, eased over τ 0.25 s. The arrow keys 0.15 per second. The
  automatic walk 0.08 per second, the default where the pointer is coarse and nothing hovers. A tap on him stops and
  starts it. Every speed is capped at 0.5 per second, with a snap within 1e-4. The lane's two kinks are rounded over
  0.02 of `t` (`WALK_ROUND`). The gait runs from the distance walked: a step every 0.04, scaled down below 0.05 per
  second. V1 (below) sets its sizes and the form. Vincent 0.4 ahead of the camera on the lane, 0.03 left of its centre,
  easing to 0.07 over stops 3–4 (the church door), 0.085 tall, his tap target at least 48 px. The smock from the blue
  hill behind the church `[1176, 840, 1208, 872]`, gated against `village`'s ultramarine `#2a3f6f` (Codex T1). The
  trees (`streetTrees.ts` `STREET_TREE`): the fork at 0.08 + 0.35 R, four limbs each splitting into two twigs, nine
  clumps of 0.28 R as domes 1.15 × 0.8, 115 curls a clump of 0.3–0.55 R. The trees clear the houses by 0.025 (Codex
  T2). `?walk=0` and `?vincent=0` turn each off, `?walkT=` opens at a point on the lane, `?walkMode=input` or `auto`
  forces a mode. Passed by Mark, 2026-10-24 ("Good, passed").
- The street's slice 3, the grass and the hand, on with `?street=1` (2026-10-25, `src/scene/grassBlade.ts`
  `GRASS_BLADE`, `streetGrass.ts` `GRASS`, `grassShader.ts`, `grassTrail.ts` `TRAIL`, `streetGeometry.ts`
  `GROUND_BASE_SHARE`, the record `tasks/2026-10-24-street-s3.md`). Clumps of 5–9 blades on the verge. The grass's
  budget is 38,515 triangles at the walk's worst sampled point. A blade 0.036 tall (× 0.75–1.25), half-width
  0.0024–0.0034, a bend of 1.0–2.0 rad from root to tip, the tip at most 1.8 rad from the vertical, spread 0.012, shade
  0.6 at the root to 1.05 at the tip. S3b (below) sets the segments, the density, the fan and the turn. The chunk box's
  top 0.065. The dark base under the grass is the ground's, the field's darkest 40%. The wind 0.0035 at the tip, toward
  +x, its heading wobbling by 0.3 rad, its gusts travelling across the verge. The hand's push 0.03 at the tip, the
  trail's texel 0.005, radius 0.045, Vincent's feet 0.03, with D1's rise, swing and window. `?grass=0` builds none.
  Untuned by Mark.
- The grass's paint and the moon on it, S3b (2026-10-25, `src/scene/grassBlade.ts` `GRASS_BLADE` and `GRASS_LIGHT`,
  `streetGrass.ts` `GRASS`, `grassShader.ts`, the record `tasks/2026-10-25-street-s3b.md`). Four segments, no joint
  turning more than 0.38 rad. A clump leans 0.35 toward its side, `clumpSide`'s value noise at 5 per world unit, its
  blades fanned 0.3 either way from that, 15% curling against it. Turn 0.3. Density 0.165, the chunks 0.025 long in
  `t`. The paint comes from each blade's own seed, apart from the layout. The moon: the top colour one of the lightest
  2% of the bushes' lit texels, mixed up to all the way where the arch faces `STREET_MOON` (the facing eased over
  0.55–0.75), rising from 0.2 to 0.5 along the blade and full to the tip, over the outer quarter of the blade's width at
  full strength and the next quarter fading. `?light=0` draws the grass unlit, slice 3's program byte for byte. Read
  live by Mark, 2026-10-25: the far arch tops "okay", the stripes "fine", the direction right, the bare base between
  the clumps "It bother me a bit".
- S3b pass 5, past the cap on Mark's word (2026-10-25, "Yes, go ahead with the extra pass", `src/scene/grassBase.ts`
  `GRASS_BASE`, `grassTrail.ts` `TRAIL.hoverAmp`, `frog.ts` `FROG`, the record `tasks/2026-10-25-street-s3b.md`). The
  base under the grass lays one comma dab per 0.01 cell in its own mesh: half-size 0.009 × 0.003, bent 0.8, the tail
  0.55 of the head, the angle from a field at 6 per world unit, the value ± 0.15, the paint the bushes' darkest 80%
  split by hue in their own shares. The hand: a hover pushes at 0.6 of a press (`LAND_TOUCH.hoverAmp`), a press closes
  the cursor (`grabbing`), and a lift lets the press's texels settle to the hover's push. The frogs' places are below.
  Their blink: each eye shrinks to 0.3 and sinks 0.6 of its radius, 0.06 s down, 0.06 s shut, 0.1 s up, the gaps
  2.5–6 s, one double in five, the first at 1.7 s. Untuned by Mark.
- The church in the round, slice 3c (2026-10-25, `src/scene/streetLayout.ts` `CHURCH`, `streetLight.ts` `CHURCH_LIGHT`,
  `streetGeometry.ts` `church()`, the record `tasks/2026-10-25-street-church.md`): the church turns 0.45 rad on the
  square and stands 0.02 further back. Stop 4 aims at the turned front's centre (`churchFront()`), stop 0 at the
  church's place before the setback. The church's walls, gables, belfry and spire take `CHURCH_LIGHT` (its values are
  under the church and its square, below). Its roofs keep `STREET_LIGHT`. The brush 0.16 on every church face. The
  eight faces no sampled pose of the walk sees are clad at 0.25. The door 0.02 behind the wall (`CHURCH.recess`), its
  panel at tint 0.3 × 0.6 (`REVEAL_SHADE`), a step 0.012 high and 0.03 deep. Three windows down the moonlit side,
  centred at 0.55 of the wall's height, each 0.08 of its run wide and 0.3 of its height tall. Untuned by Mark.
- The portal, slice 4 (2026-10-25, `src/scene/portal.ts`, `usePortalPointer.ts`, `portalContext.ts`, the driver in
  `DioramaExperience.tsx`, the records `tasks/2026-10-25-street-portal.md` and `tasks/2026-10-28-portal-on-plan.md`), on
  for every visitor since 2026-10-28 (Mark: "promote the portal to main"). `?portal=0` turns it off. The flight 2.4 s,
  one smoothstep on position and target from the visitor's orbit pose to v2 (position [0.9, 0.35, 1.5], target
  [0.4, 0.1, 0.2]), the default camera's lens written every frame. The flight's last frame is copied to a 2D layer that
  drifts toward the centre, 4 s to scale 1.045 on `cubic-bezier(0.2, 0.4, 0.5, 1)`, from 2.2% a second (the flight's
  last-frame push-in). The layer fades off the street 1.0 s after 2 settle frames, and off the diorama 0.8 s on the
  way back. The diorama is unmounted while the street is mounted (2026-10-28: both held at once crashed Mark's iPhone).
  So the way back holds the layer until the cypress and the land report ready and 2 frames draw, at most 15 s, then
  fades. The street gets 15 s to be ready (the arrival's `readyTimeout`). A phone or a tablet (no hover, a coarse
  pointer) asks before its first entry: "A computer is recommended for the village scene. On a phone it may load
  slowly or not open.", with "Enter anyway" and "Stay with the painting". Once entered, the visit goes straight in
  (Mark, 2026-10-28). The hover casts once per move against the village with the land and the island in front: the
  hand, and the hint "Enter the village" 16 px right and 18 px below the pointer. A tap on a house enters, and the
  sky's surge is masked there. Escape and the dock's "Back to the painting" return. Reduced motion cuts both ways. The
  placard and the dock share one fixed stack, `.visitor-bottom`, so the placard clears the dock however many rows it
  wraps to. The gap 10 px over 640 px wide, 16 px on a phone. The stack's left 8 px, so four pills (639 px) still fit
  one row at 667 px. The desktop dock wraps where five pills do not fit. The phone's question passed on the combined
  preview `253d8f7` ("Love it! Gate passed!"). The rest of the portal is untuned by Mark.
- The frogs, five, one by each stop (2026-10-25, `src/scene/frog.ts` `FROG`, `FROGS`, the record
  `tasks/2026-10-25-street-frogs.md`): `FROG.size` 0.0108 (about 22 cm beside Vincent), one blink clock for all five
  (S3b's, above). Stops 0 to 3 in a grass gap at `t` 0.035, 0.283, 0.466, 0.677, laterals −0.086, 0.086, −0.098,
  −0.098, turned 0.35, 0.3, 0.4, 0.3 rad from side-on, sizes 1.0, 0.94, 1.06, 0.97. Stop 4 on the square's edge at `t`
  0.975, lateral −0.08, `y` 0.0065, 0.35 rad, size 1.02. Each is drawn within its `draw` of the camera: 0.5 in the
  grass, 1.1 on the square. So one is drawn before `t` 0.45 and a second only at 0.8 or more. Untuned by Mark.
- The village craft, K1, the houses (2026-10-26, `src/scene/streetGeometry.ts` `WALL_PAINT`, `CRAFT`,
  `streetLayout.ts` `STEP`, the record `tasks/2026-10-25-village-craft-k1.md`): the walls' paint `base` 0 (the source's
  mean), `light` 0.5, `cover` 0.8 (a fifth fewer strokes). The church and the flat panel keep `KEPT_PAINT`, cover 1. K3
  (below) sets the four plaster houses' row. The six painting houses' doors set 0.02 into the wall. Every door framed
  by a band 0.3 of the door's width, at 0.001 off the front, under the strokes (A2). A cottage's band stops at the
  door's top, under the thatch (A1). The band is the plaster's mean, × 0.7 on a plaster wall. A step 0.012 high, 0.03
  deep. 22 shutter leaves at 0.006 off the front, louvres at 0.25, 0.5 and 0.75, ink at five samples an edge. The
  painting houses' eaves 0.03 (rakes 0.015) with an underside. Passed by Mark on the preview, 2026-10-26 ("K1
  passed"), untuned.
- The village craft, K2, the lane's walls, rail and lamps (2026-10-26, `src/scene/streetLayout.ts` `STREET_WALL`,
  `STREET_WALLS`, `STREET_RAIL`, `STREET_LAMPS`, `streetGeometry.ts` `LANE_CRAFT`, `streetLife.ts` `LAMP_LIGHT`,
  `haloScaleOf`, the record `tasks/2026-10-26-village-craft-k2.md`): three dry-stone walls on the open verges (W1 left
  `t` 0.06 to 0.22, W2 right 0.14 to 0.41 in 14 segments, K3's end, W3 left 0.54 to 0.84). The lane face at lateral
  0.135, 0.03 thick, 0.055 high, segments of at most 0.02 in `t`. The grass cleared 0.012 round each segment's
  rectangle, with a 0.002 end overlap. A wall's stones are draped dabs (`stoneDab`, 3 × 3, 8 triangles) on wallB's
  darkest 40%. A stone takes the stroke's full-bodied middle (along 0.3 to 0.7, flipped on odd seeds), its ends 0.92
  of its middle, its wobble 0.12 widths. Four courses and two top rows, each planned to fill its run flush to both
  heads (stones drawn 0.6 to 1.0 of the height, scaled to the run, clamped to wallB's measured 0.6 to 2.0, the last
  stone fitted to the head). The joint 0.92, 0.2 of the height wide. A stone per course on each head (0.6 high across
  the 0.03 cap). The texels from wallB's lightest 55%. The report's length is the emitted one. The rail round L2's
  front garden: 7 posts 0.005 square and 0.05 high, rails at 0.02 and 0.042, open at the door, the thatch's mean, no
  ink. Seven lamps (`t` 0.10, 0.24, 0.38, 0.55, 0.65, 0.79, 1.0, alternate sides at lateral ±0.11, the last on the
  square): a post 0.004 square and 0.13 high in ink, a lantern 0.012 × 0.016 in the lit window's mean (class 2), an
  ink cap wound outward, a halo sprite scaled each frame from the sprite's world position (`haloScaleOf`: at most 0.5
  of the view's short side, 0.7 of the plan's 0.192), a pool at y 0.007 over the square's stroke top. The stone wall
  is Mark's pick S4 of four recipes probed in place, in pass 5, past the cap on Mark's word. He passed it on the
  preview (2026-10-27 21:06, "Passed").
- The village lived in, K3 (2026-10-28, `src/scene/streetLayout.ts` `LIVED_PATH`, `STREET_PATHS`, `STREET_OBJECTS`,
  `streetGeometry.ts` `doorPaths`, `signsOfLife`, `streetGrass.ts` `PLANT`, `plantHit`, `WALL_PAINT.plasterLength`, the
  record `tasks/2026-10-27-village-lived-in.md`): a trodden path from every front door but L5 to the lane, nine paths in
  14 legs. Each is the door's width plus 0.02 (L2's 0), the first leg 0.08 (L2 0.11, R5 0.056), clipped to the step's
  front, with a mitre at a bend and the lane's edge at lateral 0.06. The lane's paint at cover 0.25, the base inset 0.3
  of the width across and at the free end. A bench by L2 (a plank 0.10 × 0.03 × 0.012, its top at 0.037). A pot 0.022
  by R4 with a clump of the grass's blades at scale 0.7. A pail by L4 (0.016 across, 0.018 high, the handle to 0.026).
  Each clears the grass round it. The hand bends the plant through a cylinder of its blades' rest reach. The four
  plaster houses' strokes 0.7 of the measured row, the cover scaled to hold the count. The church keeps its row. W2
  ends at `t` 0.41. `lived: false` builds K2's street byte for byte. Passed by Mark on the preview, 2026-10-28 ("gate
  passed"), untuned.
- Vincent's form, V1 (2026-10-28, `src/scene/vincent.ts` `FORM`, `streetWalk.ts` `WALK`, `PAUSE`, `streetLantern.ts`
  `LANTERN_GROUND`, `streetMode.ts` `lanternShown`, the record `tasks/2026-10-28-vincent-form.md`): the Tarascon form
  with legs and the lantern, no cane. The gait a bob of 0.003, a roll of 0.015, each arm 0.12 with the opposite leg
  0.35, pitch 0.06. On the automatic walk a 4 s dwell at each station: a 0.5 s rest, the turn in over 0.6 s, out over
  0.3 s from 0.45 s before the dwell ends, the body π/2 and the head π/4, the left arm raised 0.75 with the lantern
  lagging 0.15. He strides only while turned under 0.2. A scroll or a key carries him past a stop. The lantern's lift
  on the ground, the grass's base and the grass is the lamps' glow × 1.5 over a reach of 0.08, before the fog. Its halo
  0.18 of a lamp's, its pool 0.1 × 0.16 placed 0.046 ahead. With `walk=0`, `flat=1`, `vincent=0`, `light=0` or `ids=1`
  there is no lantern. The hat (2026-10-28, Mark's "Go for your recommendations") paints from the crescent's
  lower-right edge `[1490, 280, 1514, 304]` (L 63 at hue 90), gated against that patch's mean. Passed by Mark on the
  combined preview `253d8f7`, 2026-10-28 ("Love it! Gate passed!").
- Vincent's wander, on for every visitor (2026-10-29, `src/scene/streetWander.ts` `WANDER`, `StreetWalk.tsx`, the record
  `tasks/2026-10-29-vincent-wander.md`). `?wander=0` turns it off. A tap on open ground sends him there at the spike's
  wander speed (0.19 world units a second, 2.4 times the lane's automatic walk). A tap on the lane brings him back the
  way he came (`route`, 8 entries at most). So does a tap within 0.06 of where he stood once his slot is off the lane's
  strip, from `t` 0.825 (Fable F1). He stands on the verge, the door paths and the square. He keeps off the lane
  (|offset| ≤ 0.06), a house, a step, a wall, an object, the cypress, the church (0.02), a lamp post (0.015), a frog
  (0.02) and a trunk (0.03). A leg is sampled every 0.01 and may not cross the garden rail. A tap is refused unless
  every 0.02 of its leg is in frame (the half-field less 4°) and not hidden from the follow camera (three ground lines
  0.025 apart, the houses grown 0.03, the church 0.02). A tap is also refused where a house or the church hides the
  ground from the live camera (a tap on the wall, Codex F1). A press any of whose samples, coalesced ones too, strays
  past 8 px is a drag and sends him nowhere (Codex F2). The camera stays on the walk's rail at his lane coordinate, its
  aim turned toward him by at most 20°, eased over τ 0.4 s. At his tap he rests 0.5 s and raises the lantern (V1's
  turn, the body straight). On the automatic walk he goes home 3.55 s after he arrives (Mark: "Yes, walk him back
  after the dwell"). With the walk stopped, he stays. The mark is his lantern's halo at 0.023 over the ground, the
  raised glass's height. Passed by Mark on the preview, 2026-10-29 ("Passed"), untuned.
- The church and its square, slice 1 (2026-10-29, `src/scene/streetStrokes.ts` `STREET_SOURCES`, `SOURCE_STROKES`,
  `streetGeometry.ts` `church()`, `flowers()`, `streetLight.ts` `CHURCH_LIGHT`, `wallShade`, `streetLayout.ts`
  `TREE_SPECS`, `FLOWERS`, `streetWander.ts` `WANDER.ring`, the design
  `docs/superpowers/specs/2026-10-29-church-square-design.md`, the record `tasks/2026-10-29-church-square.md`): the
  church paints from its own four sources in the 1600 × 1267 work scan: `churchLit` [886, 1050, 906, 1072] (L p50
  49.7), `churchShade` [936, 1056, 954, 1094] (26.8), `spire` [904, 860, 914, 990] (48.9), `belfry` [898, 1000, 922,
  1012] (14.4). The tones go by wall name (Mark's call 1, mirrored): the right wall `churchLit`, and the front, its
  gable, the back and the left `churchShade`. `wallSource` plaster for the openings, the step and the reveals. The
  recipes: churchLit width [0.11, 0.13] length [0.33, 0.8] cover 2.5, churchShade [0.095, 0.11] [0.42, 0.85] cover
  2.2, spire [0.05, 0.09] [0.7, 1.9] along the shaft cover 2.5, belfry [0.08, 0.13] [0.28, 0.47] across cover 1.25.
  `CHURCH_LIGHT` ambient 0.81 (the moonlit side at 0.996 of `max` 1), key 0.9. The two tones are exempt from
  `wallShade`'s corner term and its ground term (departure P7, Mark's call: the painting's church has no foot shadow).
  At stop 3 the front's left half sits under the `t` 0.65 lamp's halo, which lifts it. The four sources take ID classes
  10 to 13 (`ids=2`), one church class in `ids=1`. The trees `orchard-lower` at map (666, 181) and `olive-right` at
  (308, 184), the sway bounded against every line of sight from stops 3 and 4. `FLOWERS` radius 0.03, 6 clumps, scale
  0.5, heads 2 to 4 a clump 0.0035 wide, 5 Lab from the lit window's underpaint, roots at y 0.005, lifted 0.0004
  toward stop 4's eye, appended last with class and source 255. `WANDER.ring` 0.06. The street's bound 602,000
  triangles (the design's), the church's cap 1,600 ribbons, the ceiling 1,444,930. Two probes went to Mark (B the
  painting's own sides, C no foot shadow). Passed by Mark on the preview, 2026-10-29 22:10 ("Gate passed."): P7 and
  the mirrored tones as shipped, the ring kept, probe B open to his word.
- The church and its square, slice 2, the barn owl and the moths (2026-10-30, `src/scene/owl.ts` `OWL`,
  `StreetOwl.tsx`, `moths.ts` `MOTHS`, `StreetMoths.tsx`, the plan `tasks/2026-10-29-church-owl-plan.md`, the record
  `tasks/2026-10-29-church-owl.md`): the owl 0.024 feet to crown (Mark's call 3, the true scale 0.018). The body and
  the head clad in `churchLit` on the chest and the face and `thatch` on the back, the eyes the ground's. The perch on
  the ridge's ink 0.04 behind the front gable's peak. The ridge's flat ink, 0.034 wide, hides the owl's lower half
  from stop 4. Drawn within 1.5 of the camera (stops 3 and 4). The head turns to Vincent within 0.6 and 70° of the
  body's facing, the pitch capped at 0.7 rad, eased over τ 0.6 s and snapped within 1e-4 rad, held under reduced
  motion. The frogs' blink 1.3 s ahead. The moths 29 (7 lamps × 3, 4 lit windows × 2, a window's drawn within 0.6), a
  quad 0.006 × 0.0045 in one instanced mesh, drawn as a moth (look pass 5, past the cap on Mark's word: soft pale
  ovals on smooth loops read as the fireflies). Forewings and hindwings either side of a dark body
  (`PALETTE.ground`). The wings' half toward the glass lit in the lantern's lit mean mixed 0.6 toward white
  (`MOTHS.pale`), the far half in the thatch's darkest 40%. A loop of radius 0.02 to 0.05 and period 1.2 to 2.5 s, its
  angle lurching by 0.5 sin 3θ (`MOTHS.lurch`), a jitter of 0.0045 at 5.3 Hz and half at 8.7 Hz (`MOTHS.jitter`),
  both zero at the rest point. Wobble 0.006, the wings 0.12 to 0.2 s a beat, the rest point 0.0105 off the glass,
  dimmed to 0.15 at the halo's edge. Untuned by Mark.
- The cat, a light slice (2026-10-30, `src/scene/cat.ts` `CAT`, `StreetCat.tsx`, the design, its build and its record
  `docs/superpowers/specs/2026-10-30-street-cat-design.md`): sitting on wall W3's top stones at `t` 0.81, lateral
  −0.15, facing the lane, 0.015 feet to ear tips (the true 0.0125, the Lead's call on Mark's "Make calls for me"). The
  coat `roofSienna` (Vincent's hair), the bib and muzzle `churchLit`. Drawn within 0.9 of the camera (stops 2 and 3,
  from walk `t` 0.403). The owl's look with a cone of 1.75 rad, so from stop 2 it watches Vincent come. Eased over τ
  0.6 s, snapped within 1e-4, held under reduced motion. The frogs' blink 2.9 s ahead. The tail's free part sways
  0.45 rad over 3.1 s, on the cat's left, which faces the camera at stops 2 and 3. Untuned by Mark.
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
