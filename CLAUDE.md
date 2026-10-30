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

Each entry keeps its decision, Mark's word and its record. The values live in the code each entry names: read them
there, not here. Only the limits that work is checked against stay as numbers. Cut to this form on Mark's word ("Go
with your recommendations for tunables"). The values as written before the cut are in `tasks/archive/2026-10-30-tunables.md`.

- Instanced stroke budget: start 8,000 desktop / 3,000 mobile
- Diorama sky ribbon budget (2026-10-11, the record `tasks/2026-10-11-sky-choice.md`, `PaintingFlowSky3D.tsx` `MOVING`
  and the `count` knob): painted light 3,200 requested ribbons, moving strokes 25,600. One count for every device, so a
  resize never rebuilds.
- Palette tolerance: ΔE < 10 per region to start with. Tighten as quality improves.
- devicePixelRatio cap: 1.5 on every device (`src/scene/lighterView.ts` `LIGHTER.dpr`, the Canvas's `dpr` in
  `DioramaExperience.tsx`), 1 in the lighter view below. Corrected
  2026-10-30 to the code, which has shipped it since 2026-07-06 (Mark: "Tunables follow code"). The performance review
  (2026-10-30, `tasks/2026-10-30-perf-review.md`) found that desktop cannot afford 2 on the diorama, so the cap stays
  1.5. The street could afford 2.
- Camera orbit limits (`src/scene/dioramaContract.ts` `DIORAMA_ORBIT`): polar 0.58–1.62 rad (≈33°–93°), distance
  3.25–5.6, azimuth −15° to +45°, no pan (3D diorama). The −15° side stops short of the rear cypress, whose back is blank
  source edge. The max polar of 1.62 (2026-06-21, Mark's live review) lets the home view sit eye-level head-on, to match
  the painting. They are hard limits: no free-fly, no pan. Corrected 2026-10-30 to the code, which has shipped them
  since 2026-07-06 (Mark: "Tunables follow code").
- Portrait lens (2026-10-25, `src/scene/dioramaContract.ts` `PORTRAIT_FIT`, `portraitFov`, the record
  `tasks/2026-10-25-phone-framing.md`): candidate C's pose. A portrait screen keeps the horizontal field of a 360 × 800
  phone, and the vertical field follows the aspect, up to a tablet's. Set on the diorama only. Mark: "take the lead, get
  it fix". Passed on his phone, 2026-10-25 ("It reads right on the phone").
- Make-it-alive A (2026-10-13, `src/scene/skyAlive.ts` `GUST`, `HALO_BREATH`, `ALIVE_KNOBS`, the record
  `tasks/2026-10-13-alive-a.md`), on by default (see the flags below). Gusts warp the sky's clock. The shipped knobs are `sky-tuning.json`'s alive keys, Mark's pick of
  2026-10-13. Every knob is clamped so the clock never runs backwards. Tuner `?tune=1` (`src/AliveTuner.tsx`). The URL
  knobs `?gust=&lift=&shimmer=&breath=` are still honoured.
- Make-it-alive A, second pass, on with A (2026-10-13, `src/scene/cypressFlicker.ts` `CYPRESS_FLICKER`, `villageGlow.ts`
  `WINDOW_GLOW`, the record `tasks/2026-10-13-alive-a2.md`): the cypress flickers upward like a flame, and the village
  windows glimmer. Knobs `flicker` and `glimmer`, shipped at full, Mark's pick of 2026-10-13 ("I like the Both at full
  one", `sky-tuning.json` aliveFlicker / aliveGlimmer). `?tune=1` still dials them.
- B, touch (2026-10-13, `src/scene/touchSurge.ts` `TOUCH_SURGE`, the record `tasks/2026-10-13-touch-b.md`), on by
  default, and it implies `alive`. The lift is stronger on the painted-light sky (2026-10-16, Mark: "in painted light, the cursor light is
  weaker"). The kick is fed into the gust clock's argument, so its push follows the local wind (set 2026-10-16 in
  `bec5480`). Added on top of the clock instead, it could run strokes backwards. Knob `surge` (`sky-tuning.json`
  `touchSurge`), untuned by Mark.
- C, arrival (2026-10-20, `src/scene/arrival.ts` `ARRIVAL`, the record `tasks/2026-10-20-arrival-c.md`), on by default.
  Its flag implies no other. The scan holds with Vincent's line from letter 777, then dissolves into the scene. Skip (tap, click, Enter,
  Space, Escape) runs the clock at 8×. Reduced motion: no layer, no push, the line as a static caption until the first
  pointer or key. Untuned by Mark.
- The loading curtain (2026-10-25, `index.html` `#boot`, `src/bootCurtain.ts`, `arrival.ts` `ARRIVAL_CUE`, `CUE_FADE`,
  the record `tasks/2026-10-25-loading-curtain.md`): C's first frame is in the page, with the cue "Painting the night
  sky…" under the citation. The hold counts from when the painting showed, not from when the scene was ready. A skip
  does not end the wait. The wait is capped (`ARRIVAL.readyTimeout`), and slow 4G is out of scope (Mark, 2026-10-25). A
  page that fails (an uncaught error, a failed load, an unhandled rejection) hides the cue. Passed by Mark on his
  phone, 2026-10-25 ("it works well in terms with landing").
- Default sky: moving strokes (Mark, 2026-10-20, after C's gate). `?sky=light` opens on painted light. Reduced motion
  still forces the painted-light still.
- Flags on for every visitor (Mark, 2026-10-20, "go for your recommendation"): A (`alive`), B (`touch`) and C
  (`arrival`) are the default. `?alive=0` turns A and B off, `?touch=0` B alone, `?arrival=0` the opening. `=1` still
  works for links. The opening plays once per session on a plain visit (`sessionStorage`), always with `?arrival=1`.
  `?perf=1` shows the frame rate on screen. The guard and capture scripts opt out of the opening (`arrival=0`).
- E1, the cypress (2026-10-21, `scripts/derive-cypress.ts`, `src/scene/cypressStrokes.ts` `CYPRESS_RIBBON_CONFIG`,
  `cypressStrokeShader.ts` `STROKE_BODY_DEFAULTS`, the record `tasks/2026-10-21-cypress-e1.md`): the table and field
  baked from the 3840 px scan. Broad ribbons, because at narrow lane widths the tree read as fur. The stroke body is the
  moving sky's, static, opaque with an alpha test, so its edges do not depend on draw order (code review F2). The land
  keeps E1's body text. The local-contrast bar 4–7.5 is open to Mark's eye.
- E2, the land (2026-10-21, `src/scene/landStrokes.ts` `LAND_RIBBON_CONFIG`, `landMapping.ts` `LAND_MAP`,
  `landMasses.ts` `LAND_MASSES`, `landDomes.ts` `DOME_HEIGHT_CAP`, the record `tasks/2026-10-21-land-e2.md`): ribbons in
  the band's own field, and ten authored masses as domes. Untuned by Mark.
- D1, touch the land (2026-10-21, `src/scene/landTouch.ts` `LAND_TOUCH`, the record `tasks/2026-10-20-touch-land-d1.md`),
  rides B's flag, and `?touch=0` turns both off. The ground does not bend. A mouse or a pen on the land masks the sky's surge behind it. Knob `bend`
  (`sky-tuning.json` `touchBend`), untuned by Mark. A finger touches no land, only a mouse or a pen (2026-10-25, Mark's
  choice, `useTouchInput.ts` `landActive`, the record `tasks/2026-10-25-finger-no-bend.md`): on his iPhone 17 Pro Max
  the land's cast under a moving finger held 18–50 fps, and with the finger kept off the land, 60.
- E3, the cypress's medium (2026-10-22, `src/scene/cypressStrokes.ts` `sampleColours`, `cypressStrokeShader.ts`
  `CYPRESS_STROKE_BODY`, the record `tasks/2026-10-22-cypress-e3.md`): the colour follows the stroke, one source pigment
  per kept step, because one colour per ribbon averaged the bands it crossed. `perSampleColours` is off for the land.
  The paired-contrast bar 5–10 is not met: the painting's 11.1 is its bristle marks and canvas weave. The retune cap is
  reached: any further change to the medium is Mark's call. Untuned by Mark.
- E4, the cypress's paint (2026-10-22, `src/scene/cypressStrokeShader.ts` `CYPRESS_STROKE_BODY`, Mark's experiment, the
  record `tasks/2026-10-22-cypress-e4.md`): the still look read as jelly (Mark: smooth, glossy, rounded), so the
  cypress's body is dry, broken and ridged. The factory's fields default to E1's text byte for byte, so the land is
  unchanged. Passed by Mark on production, 2026-10-23 ("It passed").
- The village street, S1 and S1b, opened with `?street=1&station=0` to `4` (2026-10-24, `src/scene/streetLayout.ts`
  `MAP`, `STREET`, `streetGeometry.ts` `COTTAGE`, `ROOF_EDGE`, `streetStrokes.ts` `PATH_LIFT`, `streetLight.ts`
  `STREET_LIGHT`, `streetLife.ts`, the record `tasks/2026-10-23-street-s1b.md`): the map
  `layout-v1.svg` (untracked, in the village redesign's scratch folder) sets the lane and the five stations. The scene's
  ceiling is 1,444,930 triangles at the walk's worst sampled point. It sets the street's budget, 641,310
  (`STREET_TRIANGLE_BUDGET`). A pale lane like Simon Lee's. The colour gate keeps the fog on (Mark: "keep the fog for
  now"). `?light=0` builds the street unlit for the gate. Passed by Mark, 2026-10-24 ("It does read like a village").
- The street's slice 2, Vincent and the walk, on with `?street=1` (2026-10-24, `src/scene/streetWalk.ts` `WALK`,
  `StreetWalk.tsx`, `vincent.ts`, `streetLayout.ts` `VINCENT_RIG`, `streetTrees.ts` `STREET_TREE`, the record
  `tasks/2026-10-24-street-s2.md`): the wheel, the arrow keys or the automatic walk move him along the lane. The
  automatic walk is the default where the pointer is coarse and nothing hovers. A tap on him stops and starts it.
  The smock paints from the blue hill behind the church, gated against
  `village`'s ultramarine (Codex T1). The trees clear the houses (Codex T2). `?walk=0` and `?vincent=0` turn each off,
  `?walkT=` opens at a point on the lane, `?walkMode=input` or `auto` forces a mode. Passed by Mark, 2026-10-24 ("Good,
  passed").
- The street's slice 3, the grass and the hand, on with `?street=1` (2026-10-25, `src/scene/grassBlade.ts`
  `GRASS_BLADE`, `streetGrass.ts` `GRASS`, `grassShader.ts`, `grassTrail.ts` `TRAIL`, `streetGeometry.ts`
  `GROUND_BASE_SHARE`, the record `tasks/2026-10-24-street-s3.md`): the hand and Vincent's feet push the blades
  through a trail map, with D1's rise, swing and window. The grass's budget is 38,515 triangles at the walk's worst sampled point (`GRASS`). `?grass=0` builds none. Untuned by
  Mark.
- The grass's paint and the moon on it, S3b (2026-10-25, `src/scene/grassBlade.ts` `GRASS_BLADE`, `GRASS_LIGHT`,
  `clumpSide`, `streetGrass.ts` `GRASS`, `grassShader.ts`, the record `tasks/2026-10-25-street-s3b.md`): a clump leans
  toward its side, and each blade takes its paint from its own seed. The moon lights the arch where it faces
  `STREET_MOON`, toward the tip and the outer edge. `?light=0` draws the grass unlit, slice 3's program byte for byte.
  Read live by Mark, 2026-10-25: the far arch tops "okay", the stripes "fine", the direction right, the bare base
  between the clumps "It bother me a bit".
- S3b pass 5, past the cap on Mark's word (2026-10-25, "Yes, go ahead with the extra pass", `src/scene/grassBase.ts`
  `GRASS_BASE`, `grassTrail.ts` `TRAIL`, `frog.ts` `frogBlink`, the record `tasks/2026-10-25-street-s3b.md`): the base
  under the grass lays comma dabs in the bushes' darkest paint, split by hue. A hover pushes at a share of a press
  (`LAND_TOUCH.hoverAmp`), a press closes the cursor (`grabbing`), and a lift lets the press settle to the hover's push.
  The frogs blink. Untuned by Mark.
- The church in the round, slice 3c (2026-10-25, `src/scene/streetLayout.ts` `CHURCH`, `churchFront`, `streetLight.ts`
  `CHURCH_LIGHT`, `streetGeometry.ts` `church`, the record `tasks/2026-10-25-street-church.md`): the church turns on the
  square and stands back, so stop 4 sees its gable and its moonlit side. Stop 4 aims at the turned front's centre, stop
  0 at the church's place before the setback. The faces that no sampled pose of the walk sees are clad cheaper.
  Untuned by Mark.
- The portal, slice 4 (2026-10-25, `src/scene/portal.ts` `PORTAL`, `usePortalPointer.ts`, `portalContext.ts`, the
  driver in `DioramaExperience.tsx`, the records `tasks/2026-10-25-street-portal.md` and
  `tasks/2026-10-28-portal-on-plan.md`), on for every visitor since 2026-10-28 (Mark: "promote the portal to main").
  `?portal=0` turns it off. The diorama is unmounted while the street is mounted (2026-10-28: both held
  at once crashed Mark's iPhone). So the way back holds the layer until the cypress and the land report ready. A phone
  or a tablet (no hover, a coarse pointer) asks before its first entry: "A computer is recommended for the village
  scene. On a phone it may load slowly or not open.", with "Enter anyway" and "Stay with the painting". Once entered,
  the visit goes straight in (Mark, 2026-10-28). Reduced motion cuts both ways. The placard and the dock share one fixed
  stack, `.visitor-bottom`, so the placard clears the dock however many rows it wraps to. The phone's question passed
  on the combined preview `253d8f7` ("Love it! Gate passed!"). The rest of the portal is untuned by Mark.
- The frogs, five, one by each stop (2026-10-25, `src/scene/frog.ts` `FROG`, `FROGS`, the record
  `tasks/2026-10-25-street-frogs.md`): in a grass gap at stops 0 to 3, on the square's edge at stop 4, with one blink
  clock for all five. Each is drawn only near the camera, so at most one is drawn in the grass at a time. That holds
  the scene's ceiling (`scripts/street-frog.test.ts`). Untuned by Mark.
- The village craft, K1, the houses (2026-10-26, `src/scene/streetGeometry.ts` `WALL_PAINT`, `CRAFT`, `KEPT_PAINT`,
  `streetLayout.ts` `STEP`, the record `tasks/2026-10-25-village-craft-k1.md`): the walls paint at the source's mean
  with fewer strokes. The church and the flat panel keep `KEPT_PAINT`. A door's frame is paint under the strokes, and ink goes over them.
  Passed by Mark on the preview, 2026-10-26 ("K1 passed"), untuned.
- The village craft, K2, the lane's walls, rail and lamps (2026-10-26, `src/scene/streetLayout.ts` `STREET_WALL`,
  `STREET_WALLS`, `STREET_RAIL`, `STREET_LAMPS`, `streetGeometry.ts` `LANE_CRAFT`, `streetStrokes.ts` `stoneDab`,
  `streetLife.ts` `LAMP_LIGHT`, `haloScaleOf`, the record `tasks/2026-10-26-village-craft-k2.md`): three dry-stone walls
  on the open verges, a rail round L2's front garden, and seven lamps with halos and pools. The stone wall is Mark's pick S4 of four
  recipes probed in place, in pass 5, past the cap on Mark's word. He passed it on the preview (2026-10-27 21:06,
  "Passed").
- The village lived in, K3 (2026-10-28, `src/scene/streetLayout.ts` `LIVED_PATH`, `STREET_PATHS`, `STREET_OBJECTS`,
  `streetGeometry.ts` `doorPaths`, `signsOfLife`, `streetGrass.ts` `PLANT`, `plantHit`, `WALL_PAINT`, the record
  `tasks/2026-10-27-village-lived-in.md`): a trodden path from every front door but L5 to the lane, a bench, a pot with
  a plant, and a pail. Each clears the grass round it. `lived: false` builds K2's street byte for byte. Passed by Mark
  on the preview, 2026-10-28 ("gate passed"), untuned.
- Vincent's form, V1 (2026-10-28, `src/scene/vincent.ts` `FORM`, `streetWalk.ts` `WALK`, `PAUSE`, `streetLantern.ts`
  `LANTERN_GROUND`, `streetMode.ts` `lanternShown`, the record `tasks/2026-10-28-vincent-form.md`): the Tarascon form
  with legs and the lantern, no cane. On the automatic walk he dwells at each station, turns in and raises the lantern.
  The lantern lights the ground and the grass before the fog. The hat (2026-10-28, Mark's "Go
  for your recommendations") paints from the crescent's lower-right edge. Passed by Mark on the combined preview
  `253d8f7`, 2026-10-28 ("Love it! Gate passed!").
- Vincent's wander, on for every visitor (2026-10-29, `src/scene/streetWander.ts` `WANDER`, `StreetWalk.tsx`, the record
  `tasks/2026-10-29-vincent-wander.md`). `?wander=0` turns it off. A tap on open ground sends him there. A tap on the
  lane brings him back the way he came. A tap is refused unless his whole leg stays in frame and in sight (Codex F1),
  and a press that strays is a drag (Codex F2). On the automatic walk he goes home after the dwell (Mark: "Yes, walk
  him back after the dwell"). With the walk stopped, he stays. Passed by Mark on the preview, 2026-10-29 ("Passed"),
  untuned.
- The church and its square, slice 1 (2026-10-29, `src/scene/streetStrokes.ts` `STREET_SOURCES`, `SOURCE_STROKES`,
  `streetGeometry.ts` `church`, `flowers`, `streetLight.ts` `CHURCH_LIGHT`, `wallShade`, `streetLayout.ts`
  `TREE_SPECS`, `FLOWERS`, `streetWander.ts` `WANDER`, the design
  `docs/superpowers/specs/2026-10-29-church-square-design.md`, the record `tasks/2026-10-29-church-square.md`): the
  church paints from its own four sources in the scan. The tones go by wall name (Mark's call 1, mirrored). The two
  tones are exempt from `wallShade`'s corner term and its ground term (departure P7, Mark's call: the painting's church
  has no foot shadow). The street's bound 602,000 triangles and the church's cap
  1,600 ribbons (`scripts/street-lived.test.ts`), under the ceiling 1,444,930. Passed by Mark on the preview,
  2026-10-29 22:10 ("Gate passed."): P7 and the mirrored tones as shipped, the ring kept, probe B (the painting's own
  sides) open to his word.
- The church and its square, slice 2, the barn owl and the moths (2026-10-30, `src/scene/owl.ts` `OWL`,
  `StreetOwl.tsx`, `moths.ts` `MOTHS`, `StreetMoths.tsx`, the plan `tasks/2026-10-29-church-owl-plan.md`, the record
  `tasks/2026-10-29-church-owl.md`): a barn owl on the church's ridge, larger than true scale (Mark's call 3), its lower
  half hidden from stop 4 by the ridge's ink. Moths at the lamps and the lit windows, drawn as moths (look pass 5, past the cap on Mark's word: soft pale
  ovals on smooth loops read as fireflies). Untuned by Mark.
- The cat, a light slice (2026-10-30, `src/scene/cat.ts` `CAT`, `StreetCat.tsx`, the design, its build and its record
  `docs/superpowers/specs/2026-10-30-street-cat-design.md`): sitting on wall W3's top stones by stops 2 and 3, facing
  the lane, a little larger than true (the Lead's call on Mark's "Make calls for me"). It watches
  Vincent from stop 2. Untuned by Mark.
- The lighter view (2026-10-30, `src/scene/lighterView.ts` `LIGHTER`, `SlowWatch` in `DioramaExperience.tsx`, the
  record `tasks/2026-10-30-lighter-view.md`): once the diorama has settled, a frame rate under the bar offers a pixel
  ratio of 1 in a card, and the visitor chooses. Mark: "Yes go with your recommendations". `?slow=1` shows the card at
  once. Untuned by Mark.
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
