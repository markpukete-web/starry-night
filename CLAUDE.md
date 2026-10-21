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
  was 0.4–0.75). The stroke body (`cypressStrokeShader.ts`) is the moving sky's, static, blended edges (transparent,
  depth written), one bristle lane 4.5 cycles across at mix(0.86, 1.08), rake 0.35, rim mix(0.8, 1), sheen 0.06, the
  dry brush over the tip's last quarter. Gate numbers at retune 4: IoU 0.822 (main 0.787), ΔE 0.9 / 1.4 / 3.2, local
  contrast 1.06 (the painting 6.45; the bar 4–7.5 is open to Mark's eye), build 34 ms.
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
