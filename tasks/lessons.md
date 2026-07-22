# Lessons — The Starry Night

Append-only project memory. Read at the start of every session (CLAUDE.md operating mode).
Newest at the bottom of each section.

## Operating contract

- Runs autonomously between Mark's gates. Build first, show captures at gates, don't
  re-litigate locked sections (The bar, Gates, Out of scope, acceptance criteria).
- The dependency gate is real: nothing beyond the approved list without asking. Phase 0 was
  built dependency-free on purpose (see Decisions).

## Decisions

- 2026-06-13 — Scan source = **standard high-res** (Mark's call), not the gigapixel. Simpler
  to handle and commit; finer impasto detail would not survive texture sampling at our render
  resolutions anyway.
- 2026-06-13 — Phase 0 derivation is **dependency-free**: macOS `sips` for JPEG→PNG + resize,
  Node built-in `zlib` for PNG read/write, plain arithmetic for the structure tensor. Avoided
  sharp / jpeg-js / pngjs so no stop-and-ask was needed and the stack stays lean.
- 2026-06-20 — Pre-release sign-off withdrawn by Mark for visual quality. The project re-enters a
  fidelity gate: lead with sky flow, judged visually against the original art; then refine cypress
  and village. Do not treat publish mechanics as the next task until this gate passes.
- 2026-07-05 — The two video references resolve into a hierarchy, not a fork. The `pvrellis`
  Starry Night animation is the primary motion model because it treats the painting as a connected
  flow field. The Moonlight Sonata Van Gogh animation is secondary polish: glow, pacing, and
  cinematic drama after the flow spine works. Next implementation slice is therefore a **3D
  front-canopy MVP**: integrate streamlines in painting UV space, project them onto a curved front
  canopy above the diorama, and defer full 360 coverage until the front view passes taste.
- 2026-07-05 — Failed 3D front-canopy pass reverted. The attempted `FlowCanopySky` projected the
  2D ribbons onto a card-like curved surface behind the old faceted diorama, which did not pass
  even a screenshot-level visual read. The failure was not TypeScript/R3F mechanics; it was product
  judgment and composition: placeholder forms dominated, the canopy edge read as a flat backdrop,
  and visible dev/UI collisions made the presentation obviously unfit for a gate. Future R3F work
  must block the camera, foreground scale, and sky volume as a composition first, then run visual
  review before replacing the live localhost. Do not resurrect `FlowCanopySky` as-is.
- 2026-07-05 — Autonomous recovery loop produced the first presentable 3D front-canopy MVP. Mark
  asked Codex to own design calls with no approval gates and to self-review through spec, plan,
  implementation, and Playwright captures before presentation. The recovery path that worked:
  protect the default 2D route, isolate 3D behind `?mode=canopy`, extract source-space streamline
  geometry, project it onto the proven front-arc mapping, and use a curved UV-registered foreground
  matte instead of the old faceted `Diorama`. The first flat-matte capture failed with registration
  holes and bad scale; the second fix moved the foreground onto the same curved UV field and aligned
  the authored camera to `skyMapping`'s front basis. Evidence: `output/playwright/front-canopy-mvp-2026-07-05/`.
- 2026-07-05 — Mark corrected the direction: the front-canopy MVP is NOT the original 3D he wanted.
  Re-read `~/Downloads/Videos/techartist_/2065114227304702445/summary.md` and frames. The inspiration
  is a real orbitable diorama/world: a floating low-poly landmass with dense grass, river/paths, cabin,
  windmill, clouds, physical objects, orbit controls, and preset-driven atmosphere. For Starry Night,
  the target is therefore a physical 3D diorama of the painting, not a curved painting surface. Use the
  canopy work only as a possible sky-motion layer; do not let it replace authored cypress/village/hills
  standing in space.
- 2026-07-05 — TechArtist-style physical diorama route failed Mark's visual gate. Treat the route
  `?mode=diorama&clean=1` as a rejected execution attempt, not a candidate pass. What failed: it copied the
  TechArtist mechanism at the wrong level, producing a generic floating stage with a legacy `SkyDome` backdrop
  instead of lifting Van Gogh's original composition, star flow, colour weight, and brushstroke soul into 3D.
  The star field read like streaks/fireworks, the moon/star hierarchy did not match the painting, the cypress
  was a black prop rather than a painted flame, and the village/island details pulled attention away from the
  source art. Recovery rule: before any more 3D implementation, review `public/reference/painting.jpg`,
  `signed-flow.png`, `flow-field.png`, and `sky-mask.png`; write the visual contract from the painting's
  horizontal S-flow, embedded vortex stars, moon dominance, left cypress anchor, low village, and rolling hill
  band. Reuse the TechArtist reference only for orbitable physical-world interaction, never for the Starry Night
  visual language.
- 2026-07-05 — Painting-first diorama recovery implemented after the failed TechArtist-style pass. The fix was
  not adding more props; it was replacing the diorama route's legacy `SkyDome` with `PaintingFlowSky3D`, which
  reuses the settled source-space `buildSourceStreamlineRibbons()` path from `StreamlineSky`, maps those ribbons
  into the 3D front volume, and places moon/star halos from `skySwirls.ts` source UVs. Added `debug=flow` as the
  honesty view. Removed the generic moonlit cloud puffs because they competed with the central whorl. Visual verdict:
  materially closer to the original painting's sky flow and composition, but not final gate quality. Remaining gaps:
  the source projection can still read like a curved painting layer at the edges, the 3D cypress still needs more
  painted flame modelling, and mobile portrait now includes the moon but only cropped at the right edge. Evidence:
  `output/playwright/painting-first-diorama-2026-07-05/`.
- 2026-07-05 — Mark reviewed the painting-first recovery and called it an improvement in the right direction.
  Keep the gate open: this is a validated direction, not a passed milestone. The next pickup should continue from
  `?mode=diorama&clean=1` and the `PaintingFlowSky3D` source-flow route, not the rejected legacy `SkyDome`
  diorama. First fixes next time: cypress/source registration, thinner painted flame modelling, dissolving the
  remaining projected sky edge into world-space continuation, and a portrait composition where the moon is not
  cropped.
- 2026-07-06 — Pickup checkpoint: committed the painting-first recovery as `145dc5d`, then tested the first next
  slice. The attempted procedural/source-textured cypress rewrites were visually weaker (black blade, pale cutout, then
  mis-sampled source texture) and were reverted; do not count them as progress. The kept change is portrait camera
  framing only: wider/farther mobile camera, aimed enough right that the moon crescent is no longer cropped while the
  village, whorl, and left cypress anchor remain visible. Evidence: `output/playwright/pickup-2026-07-06-mobile-camera/`.
- 2026-07-06 — Mark caught the remaining back-of-cypress void in the painting-first route. Treat that as proof that
  the current cypress/source projection is not a credible 360-degree object. Product decision for this slice: make the
  diorama front-arc orbitable so visitors can inspect depth without getting behind the authored painting composition.
  Exact side-profile ±90° and even a symmetric broad side arc expose too much blank source edge, so the practical clamp
  is asymmetric: -15° toward the bad rear-cypress side, +45° toward the side that still reads as an inspectable diorama.
  Evidence: `output/playwright/diorama-front-arc-2026-07-06/`. Do not burn another pass trying to prettify an invented
  rear until the front view passes.
- 2026-07-06 — Mark rejected the front-arc diorama screenshot as still visually unacceptable. Treat `396a51d` as a
  failed containment patch, not a taste pass: the huge dark cypress still reads as a prop, the sky still reads as a
  projected card with visible void/edge behaviour, the toy island competes with the painting, and mouse orbit still
  makes the background construction show. Current Option 1 direction: isolate a `?mode=relief` route that keeps the
  original painting composition fixed, reuses `LivingPainting` + `StreamlineSky` for the soul of the sky, and applies
  only shallow source-masked foreground parallax. Option 2 remains the later true 3D rebuild after the relief route
  proves the painting feel.
- 2026-07-06 — Option 1 implemented as `?mode=relief&clean=1`. This deliberately steps back from the failed 3D
  object route: the original painting remains the source-locked base, `StreamlineSky` remains the only sky-motion
  mechanism, and pointer input moves only real source-masked cypress/lower-foreground relief layers. Desktop visual
  read is materially closer to the painting than the failed diorama: no floating island, no finite sky card, no black
  cone cypress. Mobile is improved via a route-specific portrait crop but remains a compromise because the painting is
  wide. Evidence: `output/playwright/living-relief-2026-07-06/`; reduced-motion pointer stability check measured
  0 mean pixel difference in an upper-right sky crop across centre/left/right pointer positions.
- 2026-07-06 — Codex failed after Mark rejected the relief fallback: the native full-dome brush-dab repair reduced the
  visible projected-card/void symptom, but it regressed the actual art direction by discarding the settled source-space
  streamline-ribbon medium. Green checks (`test:sky`, lint, build) did not matter; the screenshot was cleaner
  geometrically but less like Van Gogh. Treat the uncommitted `PaintingFlowSky3D` native-dome/cypress changes as a
  failed experiment unless Mark explicitly salvages a narrow part. Correct pickup is the committed painting-first
  front-arc line (`145dc5d` → `6924228` → `396a51d`), preserving source-space ribbons and fixing only the
  cypress/source-edge/card-boundary failure. Evidence: `output/playwright/diorama-angle-fix-2026-07-06/`.
- 2026-07-07 — The front-arc sky recovery passed only after separating two problems: keep source-space streamline
  ribbons as the primary sky, but prevent the projected source sky from behaving like a finite object during orbit.
  Full camera-position locking cropped the painting and failed the soul gate; clamped/mirrored source-edge backfills
  created stretched side smears and failed too. The accepted mechanism is rotation-locking the source-ribbon sky to the
  camera's orbit delta while keeping world scale, plus a very subtle non-texture edge wash. Evidence:
  `output/playwright/diorama-recovery-2026-07-07/`. Still open: object polish for village/hills/cypress; do not treat
  this as 360 coverage.
- 2026-07-07 — Source-matte cypress checkpoint: the important correction is architectural, not cosmetic. The bad model
  is "projected source sky with a cypress hole + independent black 3D tree." Claude's better historical solves kept the
  cypress/foreground source-locked or used a fully native dome; since native dome is a rejected hard negative, the
  current pickup is `DioramaForegroundMatte` sharing the `PaintingFlowSky3D` UV projection. This removes the obvious
  rear void in front-arc captures, but it is **open gate, not pass**: the source cypress can still read as a flat strip
  beside a 3D object. Evidence: `output/playwright/diorama-source-matte-v3-2026-07-07/`; pickup note:
  `tasks/2026-07-07-source-matte-open-gate.md`.
- 2026-07-16 — Inpaint pipeline S1 (fill-region mask) landed, three findings that shape S2:
  1. **`sky-mask.png` is a CHURN mask, not a segmentation.** Dark means "don't churn", which covers the
     cypress cut-out but ALSO real paint: star cores, the deliberately-zeroed moon disc, dark navy
     stroke-gaps, horizon smudges, the whole foreground. A threshold-only fill region caught 33% of the
     image. Tree evidence has to be conjunctive: mask hole + treeish chroma fraction per connected
     component + connectivity to the primary (largest) component — that lands at 5.7% and exactly the tree.
  2. **The moon's painted umber outline passes the treeish chroma test** — without a generous guard
     (1.6 × MOON_R, past the zeroed mask disc) the pipeline would have erased the moon's outline. Same
     class of trap: a star's dark umber swirl strokes are chroma-treeish; five hand-measured star-body
     guards protect them. The `SWIRLS` table CANNOT supply those positions — it anchors vortices and sits
     visibly offset from the painted stars (proven by drawing its rings on the overlay).
  3. **Guards must not block the primary mask component.** The mask column is ground truth of what the 2D
     route cut — it genuinely overlaps two star bodies (primary is 15% star-guarded), and those pixels have
     been donor-synthesised at runtime all along, so filling them with real sky patches is strictly better.
     Guards only block the error-prone chroma/proximity passes (satellites, feather, wisps, dilation).
  Plus: the trunk fill extends below the band (v 0.62→0.66) by straight-down column growth only — runtime
  ribbon trails dip under the band, but sideways growth would merge into the foreground mass. Evidence:
  `reference/derived/fill-region-{overlay,crop}.png` (deterministic — reruns are byte-identical; verified).
- 2026-07-16 — Inpaint pipeline S2 (exemplar inpainting) baked; four lessons from the tuning trail:
  1. **Heavy feathering is the blur ghost reborn.** featherAlpha 0.45 averaged away impasto crispness —
     the same "smooth blur ghost" failure the runtime rounds hit. 0.22, edge-faded, only ever over
     previously-filled pixels. Original paint is never written (asserted in the bake).
  2. **Donor hygiene beats scoring cleverness.** The three visible artefact classes each traced to donor
     CONTENT, not search quality: a pale halo fringe (fixed by bright-warm gate 0.62 + 1.6× guard-scaled
     donor exclusion), canvas-border weave (fixed by a 24 px edge margin), and orientation breaks (fixed
     by flowWeight 2600 + patch 15). Conversely the p3 probe that only improved SEARCH (radius 380,
     topK 16) regressed — more donor variety creased the pale band. Probe-then-revert paid off again.
  3. **Donor-copied flow is blocky; low-pass it to the field's native bandwidth.** The original signed
     flow is Gaussian tensor-integrated (smooth by construction); patch-copied flow texels checkerboard,
     and ribbons integrating through that would wobble exactly where the ghost was. σ=2 blur over ONLY
     the filled texels restores the field's own smoothness while keeping donor-derived directions.
  4. **Exemplar inpainting at this scale is CHEAP** — 116,865 px in ~1,840 placements ≈ 3 s (SAT-based
     O(1) patch validity + SSD early-out). The offline loop really is seconds per iteration; never again
     assume a bake needs background scheduling before measuring.
  State: assets baked + committed; **Mark's flat-image gate is open** — S3 (runtime swap) must not start
  until he judges `reference/derived/inpaint-before-after.png` / `inpaint-filled-2x.png`. Decision doc:
  `docs/decisions/0003-inpaint-extend.md`.
- 2026-07-16 — Mark's gate feedback round (circled the mid pale-band fill: "not 100% but close"). The
  round confirmed a pattern worth keeping: **when a texture fill reads wrong, diagnose WHICH property
  disagrees before reaching for the obvious dial.** The mush wasn't patch size — p5 (21×21) carried whole
  strokes yet REGRESSED into block-tone rectangle tiling; the actual disagreement was per-patch base TONE.
  p6 kept 15×15 and added clamped per-placement tone adaptation (donor shifted toward the target's
  known-pixel mean, ±14/channel) — rectangles dissolved, the circled zone reads as sweeping strokes.
  Probe-then-revert again the cheapest diagnostic: two bakes, ~6 s each, decisive.
- 2026-07-16 — S3 runtime swap landed: the six-round heuristic stack (treeishColour, skyDonorUV, hole
  flow grid, hole fill grid + uFill + wisp alpha override, bold hole ribbons) DELETED in one slice —
  ~350 lines out of streamlineGeometry.ts, the wash back to a plain sample + skyBand discard. The
  architecture lesson the whole pipeline confirms: **when a runtime keeps growing compensations for a
  bad input, fix the INPUT offline and delete the compensations** — the result was simultaneously
  simpler and better than the best-tuned heuristic state. Verified by A/B capture against
  `sky-knit2-2026-07-14-p3`: the ghost/smudge zones now carry the sky's own churn in every view
  (`output/playwright/inpaint-swap-2026-07-16/`). Scoping detail that mattered: only the 3D route
  swaps to the filled assets — the 2D routes (LivingPainting/StreamlineSky/relief) keep the unfilled
  originals because the painting's own cypress sits on top there.
- 2026-07-16 — Mark's live catch on the swap: the filled zone read "a little bit out of flow". Root
  cause found by hypothesis-then-measure: **signed flow is DIRECTED, and direction is positional.**
  The donor search scores orientation agreement undirected (|cos| — right for stroke texture), and a
  donor's vector was sign-aligned to the circulation at the DONOR's position — copied to the target it
  can point against the LOCAL churn. Measured: 14% of copied flow texels flipped, in patch-sized
  clusters; the σ=2 blur then cancelled opposing vectors into aimless mush that ribbons wandered
  through. Fix = re-align every copied vector to the SWIRLS circulation at the TARGET texel (the exact
  Phase-0 `derive-reference` mechanism) before the blur. Rule worth keeping: whenever flow values move
  to a new position (donors, mirrors, extensions), re-run sign alignment at the destination.
- 2026-07-16 — ✅ **GATE PASSED (Mark, live): the cypress cut-out ghost is DONE.** The flow re-alignment
  above was the change that closed it. This ends the ghost thread that spanned six runtime rounds
  (value → chroma → grain → density → bold → containment, all 07-12→07-14) plus the whole approved
  offline pipeline (S1–S3). The lasting takeaway across the entire arc: the runtime heuristics could
  only ever get "close, still findable"; moving the fix OFFLINE (real painting patches, reviewed as a
  flat image) raised the ceiling AND deleted ~350 lines. Next slice is S4 (side-void extension) — same
  machinery, and it MUST carry the destination-sign-alignment rule from the entry above.
- 2026-07-17 — S4 side-extension bake, four lessons from the offline trail (crops in
  `reference/derived/side-extend-*`):
  1. **Measure the need before choosing the margin.** Ray-casting the real camera contract
     (`scratch/measure-exposure.ts`) showed every reachable pose exposes ≤ 0.14 of canvas width
     past an edge — the plan's 25–35% guess was right for the strip, but the FULL-PAINT zone
     only needs 0.15 with the fade owning the rest. Ten minutes of measurement scoped the whole
     slice.
  2. **The scan's canvas-weave border is not paint.** Mounted at full alpha it reads as a pale
     vertical tear, and as fill context it seeds weave-stippled donors. The strips own those
     ~20 px columns (regrown from real paint); `painting-filled.png` — a gate-passed asset —
     stays byte-identical. Never rebake a passed asset to fix an adjacent problem.
  3. **Open-ended exemplar fill needs a GUIDE FIELD.** In a hole, real paint surrounds the fill
     and context-mean flow self-corrects; in a strip the deep context is all previously-filled
     pixels and context-mean flow feeds back into patch-scale hatch chaos. Scoring donors
     against the relaxed edge field (the SAME field the ribbons ride) restored the sweep. And
     the p4 probe — blending that guide toward one global ambient direction — collapsed the
     strips into a monotone curtain (REVERTED): per-row anchor directions carry the variety.
  4. **Sign-continuity needs a relaxed global reference, not a texel chain.** Aligning each
     copied flow vector to its inward neighbour stalls wherever donor orientation runs
     near-perpendicular to the chain; row-anchored Jacobi relaxation of the edge vectors gives
     every texel a stable reference. (SWIRLS circulation is near-silent outside the canvas by
     design — no invented anchors — so the relaxed field is the workhorse there.)
- 2026-07-17 — The dotted-arc hunt (S4 mount): a thin dotted line swept below the horizon at
  both canvas edges, and FIVE plausible theories each fixed something real without killing it
  (strip trails walking below the band → `trailMaxV` cap; ribbon bells outshining the wash melt
  → sub-band skirt; mask border sliver → inset). What actually worked: **stop theorising and
  bisect** — baseline A/B proved it new; a temporary `?hide=<layer>` param proved it the wash;
  a flat-colour wash probe proved it alpha-side; the culprit was the sky-mask's own feathered
  SKYLINE EDGE at the corner dips, which hangs over the void where the island never covers it.
  Two rules worth keeping:
  1. **A fade is a systems component — list its dependants before deleting it.** The old
     in-canvas side fade (0→0.22) looked decorative but was silently doing three jobs: killing
     sub-horizon edge trails, hiding the wash's below-band mask feather, and softening the
     texture hand-off. Deleting it surfaced all three as separate artefacts.
  2. **When two mechanism-level fixes in a row "should have worked" and don't, switch from
     reasoning to instrumentation.** Ray-casting measured dot pixels to UV, layer bisection and
     an in-shader flat-colour probe cost ~20 minutes total and ended a hunt that theory kept
     missing. `DIORAMA_CAPTURE_EXTRA` (append URL params to the capture pipeline) is the new
     affordance that made headless probes cheap — the artefact never reproduced in the
     interactive browser (dpr 1.5 vs the capture pipeline's dpr 1).
  Also: bilinear cannot blend ACROSS textures — any multi-texture hand-off needs a shader
  feather (the painting↔strip switch left a dashed hairline until feathered over ~0.006 u).
- 2026-07-17 — ✅ **S4 GATE PASSED (Mark, live): the side extension is done — and with it the
  whole offline inpaint + extend pipeline (S1→S4).** Mark passed the drag-boundary look with the
  three named residuals standing (busy moon corner, pale-band tiling at 2× offline, softer strip
  stroke energy) — accepted at the gate; revisit only if he flags them later. The pipeline arc's
  final score: two Mark-passed gates (hole 07-16, sides 07-17), ~350 lines of runtime heuristics
  deleted, one whisper-wash component deleted, and every problem region now carries the
  painting's own pixels. Remaining before the pre-release gate: ship hygiene (~15 MB of
  reference PNGs to slim/re-encode) and Mark's standing taste items (lighting/bloom balance,
  mobile portrait dead bands, perf on real hardware).

- Node v25.8.1 → runs `.ts` directly via native type-stripping
  (`node scripts/derive-reference.ts`).
- `sips` and `curl` at `/usr/bin` (darwin). Wikimedia reachable from the sandbox — no
  `dangerouslyDisableSandbox` needed.
- Source: Wikimedia Commons "Van Gogh - Starry Night - Google Art Project.jpg".
  `Special:FilePath/<name>?width=N` resolves to a thumbnail without needing the md5 path.

## Technique notes (so future sessions do not re-derive or re-bug these)

- Structure tensor: the gradient points ACROSS the stroke; stroke orientation θ = φ + 90°,
  where φ = ½·atan2(2·Jxy, Jxx − Jyy). The classic bug is being 90° off — strokes must run
  ALONG the ridges, not across them. Self-check at the gate via the LIC capture.
- `flow-field.png` encodes **double-angle** orientation (cos2θ, sin2θ) → R, G so the texture
  interpolates continuously across the θ = 0/π wrap under GPU bilinear sampling. Coherence → B.
  Orientation is undirected (mod π); signed churn direction is a Phase 1 animation decision,
  deliberately not baked here.

## Phase 0 results (2026-06-13)

- Orientation was **right on the first pass** — the LIC capture shows concentric vortices
  around each star (not radial spokes), vertical flame-licks along the cypress, and the central
  double-whorl. That visual is the proof the +90° convention is correct; trust the LIC over the
  raw rainbow map when sanity-checking.
- Raw coherence (D/tr) is noisy salt-and-pepper in low-gradient micro-areas (ratio of two tiny
  numbers). Fix: **gate coherence by gradient energy** via smoothstep over energy percentiles
  (p30–p85). After gating, B = "a strong oriented stroke is here", which is what the renderer
  wants. Orientation channels (R,G) were untouched — the fix was zero-risk to the good part.
- Rectangular region palettes **bleed at boundaries** (the cypress rect caught sky-blue beside
  the narrow trunk). An optional per-region luminance gate (cypress `maxLum: 80`) cleans most of
  it; one faint dark-blue contaminant remains. Proper fix if ever needed: hand-drawn masks. Not
  worth it for Phase 0 — documented for Mark instead.
- Analysis at 1280px runs the whole pipeline in ~3.4s, so retune iteration is cheap. The LIC was
  the cheapest, most decisive self-check — lead with it next time.

## Phase 1 tooling — the visual-review loop (2026-06-13)

Hard-won; reuse this, don't rediscover it.

- `page.screenshot` (Playwright MCP) is UNRELIABLE here: it hangs past the MCP's 5s call cap
  (especially PNG), and even when it returns it often shows only the clear-colour — it does not
  composite the live WebGL canvas in this headless env.
- RELIABLE capture = read the canvas back in-page, then decode:
  1. `browser_evaluate`: draw `document.querySelector('canvas')` onto a 2D canvas, return
     `toDataURL('image/jpeg', 0.85)`, save via the tool's `filename` (e.g. `scratch/cap.txt`).
  2. `node scripts/decode-capture.mjs scratch/cap.txt scratch/cap.jpeg`, then Read the jpeg.
  Requires `gl={{ preserveDrawingBuffer: true }}` on the Canvas so the buffer stays readable.
- R3F `frameloop="demand"`: a Suspense-resolved texture or a resize will NOT paint itself — call
  `invalidate()` from an effect on the relevant deps, or the frame stays blank.
- Vite first-run optimises `three` and force-reloads; the first navigate after a cold start can
  land mid-reload (blank). Re-navigate once settled.
- Dev server is on :5174 here (:5173 was already taken).

## Phase 1 — Slice 1 (scene foundation, done 2026-06-13)

- Painting on a cover-scaled plane, perspective cam (z=2, fov 45), true colour
  (`meshBasicMaterial` + `toneMapped={false}` + `SRGBColorSpace`). Desktop framing reads well.
- MOBILE (390×844 portrait): cover-crop loses the moon and most of the cypress — landscape
  painting, portrait frame. Portrait framing is a Slice 5 decision (contain / guided pan /
  portrait-specific crop on the cypress–moon line).

## Phase 1 — Slices 2–3 (brushstroke sky, done 2026-06-13)

- Instanced dabs (8,000), oriented by sampling flow-field.png on the CPU, coloured from the
  painting, advected along the flow (UV += dir·sign·speed·dt) with finite lives + size-fade on
  respawn. `frameloop="always"` drives the loop; the readback capture shows motion across frames.
- Orientation was right immediately (the LIC had already proven the field). Two fixes after
  looking: (a) seed strokes SKY-ONLY via a luminance gate (lum > 0.2) so they keep off the
  near-black cypress and dark hills; (b) true colour + a relief-shaded brush (bright core, dark
  rim) instead of brightening — the earlier ×1.12 brighten had washed the deep blues milky.
- Reads as Starry Night's own sky, gently churning along the painted swirls. Speed 0.05 UV/s
  feels dignified, not frantic — but motion-feel is Mark's call, revisit at the gate.
- Colour is re-sampled at each stroke's CURRENT position every frame, so the image stays the
  painting while the impasto flows (carrying birth colour instead would smear the image).
- Architecture: `src/scene/{useImageData, brush, BrushstrokeSky}`. CPU advection of 8k strokes
  per frame is comfortable on desktop.

## Phase 1 — Slice 4 (camera + parallax, done 2026-06-13)

- Constrained pan/tilt camera (`src/scene/CameraRig`): orbits the origin within ±15°/±10°,
  pointer + slow idle Lissajous drift, smoothed. Needs a cover ×1.15 margin or tilting reveals
  the plane edge.
- A moving camera over a FLAT plane is barely perceptible (4a) — depth is what makes it read.
- Parallax via masked cutout (`src/scene/layers` makeMaskedTexture): cypress cut from the
  painting by luminance, placed at z ≈ 0.3 over the full-painting back plane. Shifts convincingly
  against the sky; minor edge softness, no glaring ghost at ±15°. Enough to decide — authored
  layers come at the "foreground complete" gate.
- Layering gotcha: the brushstroke sky uses depthTest:false, so the cypress layer needs
  renderOrder:10 + depthTest:false to sit ON TOP of the strokes (else strokes draw over the
  foreground).
- Hybrid confirmed as the movable definition → 0002.

## Phase 1 → 3D pivot (Mark's redirect, 2026-06-13)

- Mark's reference (techartist time-dial diorama, `~/Downloads/Videos/techartist_`) is a genuine
  ORBITABLE 3D world — forms standing in real space, camera orbiting. He found the flat painting +
  sky overlay "not 3D enough", and the cover-framing cropped the painting to a fraction. → Pivot
  to a full 3D diorama (Mark's call; relaxes the locked "no free orbit" — see todo "Proposed to
  Mark"). Framing first fix: contain (whole painting), then superseded by the 3D stage.
- First blocky spike (`src/scene/Diorama`): floating base slab, cypress (cone), village boxes +
  lit windows + steeple, hill mounds, emissive moon + stars, the churning brushstroke sky as a
  backdrop plane behind, OrbitControls (azimuth ±75°, polar ~20–83°, no pan). It IS 3D and orbits.
- Carried over intact: the flow-field churn (`BrushstrokeSky`, now depthTest:true so forms occlude
  it), palette colours, the capture loop. Deleted as superseded: `CameraRig` + `layers.ts` (the 2D
  pan/tilt rig + cypress cutout) — the 3D world uses OrbitControls and real forms instead.
- Rough state to fix next: under-lit (forms near-black), flat sky panel shows its edge (wants a
  dome/enveloping sky), placeholder forms, and the painted moon/stars on the backdrop double the
  3D ones. Painterly materials + real authored forms are the next work.

## 3D enveloping sky dome (2026-06-13)

- Mark's catch: a flat sky panel only works head-on; orbiting reveals it's a 2D card in a void.
  Fix = `SkyDome`: a gradient night-sky sphere (BackSide — fills every direction, kills the void)
  plus brushstrokes distributed across the dome interior, oriented by the flow wrapped onto the
  dome (azimuth→u, elevation→v). Orbit is now free (full azimuth).
- Two instancing gotchas, both made the dome strokes INVISIBLE and cost real time:
  1. `InstancedMesh` frustum-culls against an ORIGIN-centred bounding sphere; the strokes live at
     radius ~8, so looking outward culled the whole mesh → set `frustumCulled = false`.
  2. The dome tangent basis (inward normal) is LEFT-handed, so quads were back-face culled →
     `side: DoubleSide` (or fix the handedness so axis×perp = inward).
- Density matters a lot: 8k strokes over a big dome = sparse confetti. Pulling the dome in (R≈9)
  and raising to ~14k strokes brings the swirl structure back. Still wants thicker/overlapping
  strokes to read as continuous impasto rather than dashes-on-dark — next refinement.
- Superseded/deleted: `BrushstrokeSky` (the flat-plane sky) — `SkyDome` replaces it.

## Perf reality check — headless is software-rendered (2026-06-13)

- The Playwright/headless browser used for captures is SOFTWARE-rendered: even the gradient sphere
  + a few boxes (strokes removed, count=0) runs at ~1 fps / ~900 ms per frame. That is a fixed
  floor and tells you NOTHING about the real machine — never tune perf to the headless fps. Use it
  for capture stills only; get real fps from Mark's machine (added a dev-only drei `<Stats/>`).
- The dome puts the camera INSIDE a shell of transparent strokes → heavy overdraw on a real GPU,
  which the headless can't reveal. This is almost certainly why Mark could rotate the flat version
  but not the dome. Lightened: single-sided strokes (negated `perp` so the basis is right-handed
  and FrontSide shows them), 6k not 14k strokes, dpr capped 1.5.
- If still slow on Mark's machine: move the churn to the GPU (animate stroke position/orientation
  in a vertex shader from a time uniform) so the main thread stays free for input — the per-frame
  CPU rebuild of thousands of instances is the thing that starves OrbitControls.
- Confirmed: 120 fps on Mark's machine at 6k single-sided strokes — lots of headroom (now 12k).

## Beauty pass — 3D diorama (2026-06-13)

- Bloom (`@react-three/postprocessing` EffectComposer + Bloom) is the biggest mood win: moon,
  stars, windows and bright sky strokes glow; dark forms read as silhouettes against a luminous
  sky — very Van Gogh. Settings: intensity 1.2, luminanceThreshold 0.35, mipmapBlur, radius 0.7.
- Forms (`src/scene/Diorama`): cypress as a LatheGeometry flame profile (×2 for the licking
  shape), gable-roofed houses + a church/steeple, flatter faceted rolling hills, a floating slab.
  Lifted the material base colours + moonlight so forms have modelling instead of reading black.
- The sky is denser/brighter impasto but still reads as oriented DABS, not the painting's
  continuous swirls — a limit of dome-mapping + discrete quads. If Mark wants the true swirls, the
  next step is streamline strokes (longer curved marks tracing the flow) — a bigger build.

## True swirls — streamline-ribbon sky (2026-06-13) ★ the soul

- The dab approach never read as Van Gogh's continuous swirls. The fix that finally landed:
  `SkyDome` builds STREAMLINE RIBBONS — each stroke integrates along the flow field over the dome
  (POINTS steps) and a thin triangle ribbon is laid along that path, coloured from the painting.
  ~2800 of them → continuous flowing brushstrokes that trace the actual swirls. Mark: "I can see
  the soul of the painting."
- Two essentials:
  - Heading continuity: the flow orientation is undirected (mod π), so integrate by carrying a
    heading and never reversing on the previous step — otherwise streamlines zigzag badly where
    the orientation flips 180°.
  - GPU animation: the geometry is built ONCE; the churn is a shader flow term (a brightness pulse
    travelling along `vLen` with `uTime`), so the main thread stays free and the orbit stays
    smooth — far better than the per-frame CPU instance rebuild the dabs needed.
- Bloom over the glowing ribbons gives the luminous Van Gogh night.

## "Have both" — the curved-canopy sky (2026-06-13) ★

- Full-dome wrapping DISTORTS the painting's bold swirls (TILE=1 stretches them to horizontal
  waves; TILE=3 → busy small repetition). Mark, with the original beside it: "doesn't have the
  same feeling." The fix that worked: a CURVED CANOPY. Integrate the streamlines in the painting's
  OWN UV space (so they trace the real swirls — the central whorl actually reads), then map each
  UV point to a gently curved front canopy (`uvToPos`: SPAN_AZ ~225°, an elevation band reaching
  the horizon). Undistorted bold swirls in front; the gradient sphere fills the rest for orbit.
  Mark: "Now THAT'S the feeling."
- Details that mattered: seed only in the bright sky (luminance gate, off the dark cypress); map
  the painting's sky band v∈[0,SKY_V] across the FULL elevation so the sky reaches the horizon (no
  ceiling gap); fade strokes at the painting's L/R edges (`aFade`) to melt the canopy seam; place
  the 3D moon + stars at their painting UVs via the same `uvToPos` so they sit inside the swirls.
- Still open: the seam is visible orbiting ~90° to the side (the wrap edge + a little brown bleed
  from the cypress column). Front and moderate orbit are lovely; full side-on needs more blending.

## 360° sky — mirror-tiling (2026-06-13)

- Mark: "make it 360" (the canopy left a gap by the cypress). A flat image can't wrap a dome
  seamlessly without EITHER a seam (repeat) OR symmetry (mirror). Chose MIRROR: tile the painting
  `TILES=2` around the dome, odd copies flipped (`azFor`), so adjacent copies meet at the same
  painting edge — seamless, no gap, swirls all the way round. The front still shows the real
  composition; orbit is unbroken.
- Recolour foreground bleed (cypress brown/green = where b is the lowest channel) to a sky tone —
  this removed the brown vertical lines that had marked (and advertised) the mirror joins.
- Trade-off left: a faint bilateral symmetry when you look UP at the back where the two copies
  converge. Front + moderate orbit are clean. To reduce it: TILES=3 (narrower copies), an abstract
  procedural back, or constrain the look-up angle.

## Vortex-field sky — bold swirls 360°, no symmetry (2026-06-13) ★★ the answer

- Mirror-tiling gave butterfly symmetry AND gaps. Wrapping a flat painting onto a dome can't avoid
  both. The fix that finally worked: grow the swirls NATIVELY on the sphere. A flow field of
  VORTICES (a couple of big central whorls + one vortex per star + fill vortices), streamlines
  integrated through it ON the sphere surface → bold round Van Gogh swirls everywhere, organic,
  no seam, no symmetry, no gaps. Stars sit AT vortex centres so they get real swirling halos.
  Colours sampled from the painting's sky. `flowAt(p) = Σ sign·strength·exp(-(ang/r)²)·(p × c)`.
- TENSION with the locked bar ("motion derived from the painting, never generic noise"): a flat
  painting has no "back", so a true 360° sky MUST invent it — faithfulness and full 360° genuinely
  conflict. This version is procedural Van-Gogh-STYLE vortices, not the derived flow field. Possible
  reconciliation: anchor the FRONT vortices to the painting's real swirl/star positions (derived),
  continue the style around the back. FLAGGED to Mark — his locked bar vs his 360° ask, his call.
- RESOLVED (Mark chose "anchor"): the front vortices (central double-whorl, the 10 real stars, the
  moon) are placed at the painting's actual positions via `uvToFrontDir` — head-on it's the real
  composition (derived); the back is invented in the same vortex style for the 360° it can't
  derive. Best of both, and it honours the bar where the painting actually exists.

## Anchoring the swirl to the painting's real geometry (2026-06-13) — Mark: "swirl position not the same"

- The first anchor pass placed the front vortices via a naive `uvToFrontDir` that spread the
  painting across 180° of dome (az = π − (u−0.5)π) and centred it on az=180°. But the camera's
  default look bearing is az≈205° (it sits at +X,+Z, not on −Z), so the whole composition was both
  STRETCHED (180° is far too wide — a gallery view is ~50°, an immersive dome ~120°) and SLID
  off-axis. Result: swirls landed in the wrong places relative to where you look.
- Fix = three things together:
  1. **Camera-anchored basis.** Derive (FWD, RIGHT, TRUEUP) from the actual default camera
     bearing; lay the painting onto a gentle arc around FWD. Now u=0.5 sits exactly where the
     camera looks, so it reads centred on load. `FRONT_AZ = atan2(target.x−cam.x, target.z−cam.z)`.
  2. **Compress the arc.** SPAN_H 180°→123°, SPAN_V = SPAN_H/1.26 (painting aspect). Keeps the
     swirls clustered in the painting's relative positions instead of smeared.
  3. **One dominant hero.** The central double-swirl must out-mass everything (strength 2.2 / r0.62
     + counter-roll), with Venus as a genuinely larger star (own bigger orb). Equal-strength
     vortices read as "lots of swirls", never as THE swirl.
- **Spiral inflow is the unlock for swirl FORM.** Pure circulation (p×dir) draws concentric rings
  with a hollow dark eye — a drain, not a Van Gogh swirl. Adding a small tangent-toward-centre
  component (`tin = dir − p(p·dir)`, scaled ~0.45·w) makes streamlines spiral INWARD → logarithmic
  spirals that fill the eye in that signature comma/rolling-wave shape. Van Gogh's swirls ARE log
  spirals; this is faithful, not a hack. It vanishes at the exact centre (sin(ang)→0) so no
  singularity. This single change turned the hero from a funnel into the real rolling swirl.
- Isolated strong vortices still leave a small dark eye (concentric, nothing sweeps across the
  centre). The front hero fills because it's a DOUBLE swirl (roll + counter-roll) — the counter
  sweeps flow across the eye as a comma. So every big swirl wants a counter-roll companion; gave
  the invented back swirls theirs too. A tiny calm eye remains and reads as the natural swirl
  centre (acceptable; the painting has them). Don't raise the global inflow to chase it — that
  tightens the hero and busies the flowing strokes between swirls.
- Headless orbit for back-capture: synthetic pointer drags must dispatch pointerdown + every
  pointermove (with buttons:1) + pointerup ON THE CANVAS element (three's OrbitControls captures
  the pointer on gl.domElement, not window). Window-targeted moves are ignored. `c.__r3f` is not
  exposed in this build, so driving the camera via the R3F store isn't available — drive the
  controls through real events.

## Plugging the swirl eyes with luminous cores (2026-06-14) — Mark: "plug the eyes so they glow"

- The swirl centres read as small dark voids: where the flow → 0 nothing is stroked, so the dark
  gradient shows through. Fix = a soft warm radial glow sprite (CanvasTexture, AdditiveBlending,
  toneMapped off) at each big swirl's eye; Bloom amplifies the bright core so the centre reads as
  LIGHT. Faithful too — Van Gogh's swirl hearts are luminous yellow-white.
- The void is NOT at the vortex centre. Spiral inflow + the counter-roll push the visual eye
  "up-current": up, AND to one side set by the swirl's rotation sign. A glow placed at v.dir lights
  AROUND the comma and (worse) flooding it bigger only throws the dark crescent into relief. What
  worked: offset the glow `+0.09·upTangent − sign·0.10·horizontal` (horizontal = dir × upTangent).
  The sign term is the key — it flips the side for CW vs CCW swirls, so one rule lands the glow on
  every swirl's comma (front hero and both invented back swirls).
- Sequence that wasted passes: (1) centred glow → lit below the eye; (2) softer/smaller → eye still
  dark; (3) bigger+brighter flood → highlighted the crescent; (4) straight-up nudge → closer but
  the void is up-LEFT not up. Only the sign-aware horizontal term actually plugged it. Lesson:
  when a fill keeps missing a hole, the hole has a DIRECTION — find what sets it (here, circulation
  sign) instead of scaling the fill.
- Don't chase the void by enlarging the glow; a flood makes a dark-hole-in-light. Land a medium
  glow ON it. Softening the counter-roll (1.7→1.4) also shrinks the stagnation comma at its source.
- Glow sprites: depthTest on (diorama occludes correctly), depthWrite off, renderOrder 1 so they
  draw over the strokes; placed at radius DOME_R−0.15 (just inside the stroke shell).

## Dev playground — leva controls, and a disposal trap (2026-06-14)

- The leva panel only ever exposed `churnSpeed`; every sky rewrite hardcoded the rest. Re-exposed a
  full set across three folders: churn speed · stroke count · stroke width · swirl tightness (the
  spiral-inflow factor) · colour pop (`uSat`) · sky top/horizon colours · bloom + threshold + spread ·
  eye glow · moon · stars. Every default reproduces the tuned look exactly, so the panel changes
  nothing until you touch it.
- Live vs rebuild: uniform/material/light knobs update live (churn, saturation via `uSat`, gradient
  colours via `gradient.uniforms.*.value.set()` in an effect, bloom props, glow sprite opacity,
  emissive intensities). The geometry-shaping knobs (count, width, tightness) are in the geometry
  `useMemo` deps, so changing them rebuilds the strokes — fine for a dev panel, slight hitch on drag.
- **DISPOSAL TRAP (fixed):** the cleanup effect disposed geometry AND the materials together, keyed on
  all of them. The moment geometry became rebuildable, a rebuild fired that cleanup and disposed the
  STABLE materials (`useMemo([])`, never recreated) → blank/broken render. Fix: dispose geometry in
  its own effect keyed on `[geometry]`; dispose the stable materials in a separate effect keyed on `[]`
  (unmount only). Rule: a resource's disposal effect must be keyed on *that resource alone*.

## Sky polish — moon, crisper swirls, smooth cypress (2026-06-14)

Mark's "finish the sky" pass — the three open polish items plus the flat moon. All three landed in
one capture pass (front + mobile + a synthetic side-orbit); no retune needed.

- **The flat moon → a glowing crescent.** The old moon was a single emissive sphere (r 0.55): a
  hard-edged disc that bloom only rimmed. Replaced with two billboarded sprites at the same dome
  position — an additive warm-gold HALO (`makeMoonHalo`) that blossoms under Bloom into the orb, and
  a carved CRESCENT (`makeMoonCrescent`: fill a gold radial disc, then `destination-out` an offset
  disc so the lit sliver hugs the upper-right with its concavity facing down-left, as in the
  painting). Sprites (not a sphere) so the moon keeps its crescent face from every orbit angle, and
  so Bloom does the glowing — exactly the swirl-eye recipe, just warmer and larger. Palette gold
  confirmed the hue (`#c0b451` / `#b0a84f`), not the prior pure `#f2c233`.
  - Wiring: `moonBright` now drives halo opacity (`min(1, 0.5·moonBright)`); the crescent stays full
    bright. The control saturates by ~moonBright 2 — fine for a dev knob, widen later if Mark wants
    a brighter moon. Kept the moon `pointLight` (it lights the diorama forms, doesn't render).
- **Crisper swirls = tighter bloom + a stroke relief ridge.** Two levers together: (1) Bloom
  defaults threshold 0.55→0.6 and radius 0.7→0.55, so only the bright filaments/cores bloom instead
  of hazing the whole sky; (2) a cross-stroke relief in `strokeFrag` — `ridge = 0.82 + 0.36·edge`
  (lit centre falling to darker flanks) multiplied into the colour, so each ribbon reads as a crisp
  impasto mark rather than a soft smear. The two compound: tighter bloom stops washing out the
  relief the ridge adds. Visibly crisper front and side without losing the luminous eyes.
- **Smooth cypress facets = spline the lathe profile.** The `LatheGeometry` faceted vertically
  between its 14 sparse profile points. Fix: resample the silhouette through a `CatmullRomCurve3`
  (`'centripetal'` so it doesn't overshoot into a negative radius at the r→0 tip) to 64 points,
  lathe segments 32→48. Reads as a smooth licking flame now. NB this is the one foreground form
  touched this pass — the rest of the diorama (slab, houses, materials) is still the "foreground
  complete" gate, deliberately untouched.

## Codex review response — reduced motion, lint, framing, README (2026-06-14)

Codex reviewed the committed diorama and flagged six things; verified each against the code before
acting (the clear five fixed, the locked-bar one escalated to Mark).

- **prefers-reduced-motion (locked L92) was genuinely missing** — `uTime` advanced unconditionally.
  Fix: a `usePrefersReducedMotion` matchMedia hook in App → `paused` prop on `SkyDome`; `useFrame`
  early-returns when paused, freezing the churn clock. Static stars/moon/bloom + no auto-camera =
  a still, lit painting. VERIFIED with `page.emulateMedia({reducedMotion})`: two frames 1.3s apart
  are byte-identical under reduce, and differ under no-preference (control). Kept `frameloop=always`
  (freezing uTime is enough; didn't risk the demand-mode blank-frame trap).
- **`react-hooks/immutability` (lint) vs R3F.** The new react-hooks v7 rule rejects *property
  assignment* on hook-derived objects (`material.uniforms.x.value = …`, `camera.fov = …`) — but NOT
  method calls (`.value.set(…)`, which is why the gradient effect never tripped). This is
  fundamentally at odds with R3F's render-loop mutation model. Resolution: scoped, justified
  `eslint-disable react-hooks/immutability` at each genuine render-target mutation (the useFrame
  uniform writes; the responsive-camera fov). Not a project-wide disable — the rule still guards real
  React code. If these proliferate, revisit as an `overrides` block for `src/scene/**`.
- **The 5 script-hygiene lint errors** in `derive-reference.ts` were real: drop the dead `=0` inits
  on r/g/b (every branch reassigns; `a=255` stays so it's kept), `let`→`const` for `boxes` and `d`.
- **Responsive framing (fov-only).** Moon was clipped at the default desktop fov; portrait lost the
  cypress + moon. `ResponsiveFraming` sets `camera.fov` by aspect (portrait 70 · narrow-landscape 52
  · wide 48) and ONLY the fov — position/target stay fixed so SkyDome's camera-anchored swirl basis
  stays centred (its basis derives from the camera bearing, not fov). Desktop now shows the full
  moon; portrait regains the cypress edge + central whorl + steeple.
  - **Hard limit found:** fov alone CANNOT bring the moon into portrait. The moon anchor sits ~42°
    right of view-centre on the arc; portrait horizontal-fov half-angle maxes ~18–20° before
    fisheye. Getting the moon into portrait needs a portrait-specific camera *bearing* (or moving the
    moon) — a real composition decision, left for Mark with the rest of the mobile-portrait work.
- **README** Status was still "Scaffold… smoke test"; rewrote it to the current orbitable-diorama
  reality, carefully NOT overclaiming flow-field fidelity (see below).
- **THE BIG ONE — flow field unused (locked L88), ESCALATED not silently changed.** Confirmed: App
  loads `flow-field.png` and passes it to `SkyDome`, but `flow` is never destructured and `sampleFlow`
  (brush.ts) is unused. Motion is procedural vortices anchored at the painting's real star/swirl/moon
  POSITIONS (composition derived) but the per-pixel ORIENTATION map is not sampled. Codex is right
  it's drift from the literal bar. But this is the vortex sky Mark explicitly approved ("★★ the
  answer", "the soul"), and the bar is a LOCKED section. Per the code-review discipline (architectural
  conflict with the partner's prior decision → stop and discuss), did NOT rip out the approved look —
  left `flow` wired with a `// reserved … pending the flow-field reconciliation` comment and put the
  reconciliation to Mark as a decision (honour-literally / reword-bar / hybrid-bias). His call.

## Hybrid flow-field bias — honouring the bar without losing the vortices (2026-06-14)

Mark chose the hybrid: vortices stay the macro composition + motion engine; add a coherence-weighted
flow-field bias to FINE stroke orientation on the front arc, strongest between swirls, zero at the
eyes. Built as a leva-toggled A/B (`flowBias`, default 0.6) at a fixed seed so current-vs-hybrid is a
clean comparison. `flow` + `sampleFlow` are now live — the locked bar L88 is honoured where the
painting exists.

- **The mechanism.** During streamline integration, after the vortex tangent `f` is computed, on the
  front arc blend `f` toward the painting's derived orientation: `f = normalize((1-b)·f + b·flowDir)`.
  - `frontUV(p)` is the analytic inverse of `uvToFrontDir` (recover u,v,h,w; `onArc` gate) so the bias
    only ever touches the front composition; the invented back is untouched (and has no flow data).
  - The painting's image axes become orthonormal sphere tangents at p: `eU = RIGHT·cos h − FWD·sin h`
    (+u/right), `eV = sin w·(FWD·cos h + RIGHT·sin h) − TRUEUP·cos w` (+v/down). They fall out exactly
    orthonormal. `flowDir = cos θ·eU + sin θ·eV` from `sampleFlow`'s θ (image x-right, y-down).
  - Undirected orientation (mod π): sign-align `flowDir` to the carried heading, same as the vortex
    integration, or streamlines zigzag where θ wraps.
  - `b = min(0.85, flowBias · coh · (1 − nearEye) · edgeFade)`. `coh` = the field's energy-gated
    coherence (strong brushwork → strong bias; smooth sky → keep the vortex). `nearEye` = max gaussian
    over the `core` vortices → bias → 0 at the hero/counter-roll eyes (comma forms protected).
    `edgeFade` = smoothstep margins on u,v so there's no seam where the biased front meets the rest.
- **A/B result (front/side/mobile, same seed).** Front: the eyes are untouched (protection works) and
  the strokes BETWEEN swirls gain finer, more varied brushwork — less uniform/"digital", more Van
  Gogh. Side: near-identical (that orbit is mostly the invented back — proves the bias is front-only).
  Mobile: eye preserved, a touch more texture. At 0.6 the effect is real but subtle; it's a panel
  knob now, so Mark can push 0.6→1.0 for more pronounced brushwork or back off.
- **Perf:** the bias adds an inverse-map + a few-vortex loop per integration step (~count·POINTS
  calls), all in the one-time geometry `useMemo` build — negligible. Geometry rebuilds when `flowBias`
  changes (it's in the deps), a slight hitch on the slider, fine for dev.

## `tsc --noEmit` is a NO-OP in this project — use `tsc -b` (2026-06-14)

Bare `npx tsc --noEmit` reported clean while the app threw `sampleFlow is not defined` at runtime (I'd
used it without importing it). Cause: the root `tsconfig.json` is a solution file (only `references`),
so `--noEmit` against it checks nothing. The REAL typecheck is `tsc -b` (what `npm run build` runs).
Use `tsc -b` (or `npm run build`) to verify types — and never trust tsc alone over actually loading
the app; the console readback caught this where tsc didn't.

## Palette contract + moon framing (2026-06-14, Codex P1/P2)

- **P1 — palette.json is now load-bearing (locked colour criterion).** It had ZERO runtime use; the
  diorama colours were hand-picked hex and the sky gradient was hardcoded. New `src/scene/palette.ts`
  imports `palette.json` (build-time JSON import — needed `resolveJsonModule: true`; `moduleResolution
  bundler` alone doesn't enable it) and exports named surface colours, each from a region's median-cut
  swatch. Now derived: cypress, hills, houses, roofs, the slab, the steeple, and the dome gradient
  (skyTop/skyBottom). The hand-picked **purple roof vanished** → derived dark; the scene reads as one
  palette family.
  - **Two deliberate, faithful exceptions (documented in palette.ts):** (1) the sky STROKES keep
    sampling `painting.jpg` directly — that's the palette's own source, so they carry the painting's
    true local colour rather than its 5-colour reduction (strictly *more* faithful, zero drift). (2)
    Emissive LIGHT — moon, stars, lit windows — stays warm/bright; it's light, not a painted surface
    (Van Gogh's own moon/windows are luminous points). So "sampled from palette.json" holds for every
    painted surface; light and the richer-than-palette strokes are the principled carve-outs.
  - Mapping picks the region swatch nearest the old tuned hex, so the shift is small for the dark
    forms; the steeple is now the lightest village swatch (#556c81) — a touch more muted than the old
    invented #a6b6c6 (reads as the church spire; flag if Mark wants it to pop more).
- **P2 — the moon was still escaping the top-right corner.** fov alone wasn't enough (it's anchored at
  the painting's corner). Fix: nudge `MOON_UV` 0.84,0.15 → 0.80,0.20 (down + in) — still unmistakably
  the top-right moon, but the crescent + halo now clear the desktop frame. Moves the moon sprite and
  its vortex together, so the swirl halo stays consistent. Verified: full moon in frame, front + mobile.

## Foreground F1 — the floating island + lighting base (2026-06-14)

Start of the foreground-complete push. Replaced the blocky "chocolate-bar" slab (a hard box that
screamed "toy diorama") with an organic floating landmass, and lifted the foreground lighting.

- **The island is one radial-grid `BufferGeometry`** (`FloatingIsland`): a top surface (centre →
  coast) that wraps over an irregular elliptical coastline and continues down a tapering, rocky root.
  Winding `(a,b,c)/(b,d,c)` + `computeVertexNormals` faces the whole closed-ish blob outward (verified
  — lit correctly, no inside-out black).
- **Reads as "land dissolving into night", not a slab:** per-vertex colour fades the root from the
  earthy `hills` tone to near-black `#05070d` by depth, so the underside melts away. The hard flat rim
  was the remaining "plate" tell — fixed with a per-angle `rimWobble` that varies the coastline HEIGHT
  (bushy silhouette), not just the plan-view radius.
- **Don't dome the top by lifting the centre** — forms sit at y=0, so a raised crown floats them. Kept
  the crown ~flat (forms grounded); got the mound read from the wobbled rim + rocky root below instead.
- **Footprint discipline:** first pass (RX 2.1 / RZ 1.55) left a dead empty apron of ground in front
  of the village → tightened to 1.95 / 1.25 and pulled the cypress inboard so it isn't sliding off the
  rim.
- **Lighting:** cool moon key from upper-right `[4,6,3]` `#cdd8f5` 1.6 + deep-blue hemisphere/ambient
  fill so forms model instead of flat-black. The moon's own warm pointLight stays in SkyDome.
- **Deterministic value noise** (sin-hash `vnoise`, NOT Math.random) so geometry is stable across
  rerenders — a Math.random island would reshuffle on every HMR/leva tweak.
- Orbit capture exposed the next problem: the `Hill` spheres read as smooth balloon-lumps from the
  side → F2 (rolling brushy ridges).

## Foreground F2 — rolling hills (2026-06-14)

Replaced the three smooth `Hill` spheres (balloon-lumps from any orbit angle) with `RollingHills`: a
wavy heightfield band behind the village, rising taller on the right as in the painting.

- **Heightfield, not spheres.** A grid (NX×NZ) in (x, depth); height = rolling swells (a couple of
  sines in x drifting with z) × a back-rise envelope × a right-bias, + value noise. Reads as the
  painting's rolling ridges; the spheres never could.
- **The first pass was far too DARK** — the moonlit crest colour was there but didn't show, because
  the hills' front slopes face the camera (i.e. AWAY from the upper-right moon key), so dark vertex
  colour × low light = near-black, and the whole foreground collapsed into one mass. Vertex colour
  MULTIPLIES light, so a faithful-but-dark palette swatch still goes black on an unlit face. Fix:
  brighten the band — troughs `#1d2735`, mid `#3a4a63`, crest `#74808d` — and widen the lit band
  (`smooth(0.42,0.95,t)`). Now the ridges read as luminous blue-grey, the moonlit crest popping on the
  right exactly like the painting. Lesson: for dark-scene forms, push the base colour brighter than the
  reference swatch — the night lighting eats most of it back.
- **Keep it inside the island footprint.** The island narrows at the back; a full-width hill band
  (x ±1.45 to z −1.5) floated off the back corners. Clamped to x ±1.25, z 0.7 → −0.85 (well inside),
  foot buried −0.05 so hills emerge from the ground with no seam. Verified on orbit: nothing floats.

## Foreground F3 — village + church (2026-06-14)

The houses were uniform low-poly boxes with tent-cone roofs; the church was a chunky box-steeple.
Re-authored the village as the painting's huddle of gable-roofed houses dominated by a pale,
slender-spired church.

- **Gable roofs, not cones.** A tiny triangular-prism geometry (`gableRoofGeo`, 6 verts, ridge along
  z) reads as a proper pitched roof with a gable end facing the camera — far more "village" than the
  4-sided pyramid cones, which read as tents. flatShading for crisp facets.
- **The church is the focal point** = the one place worth lifting off the literal palette. The derived
  steeple swatch `#556c81` is too muted to be the village's pale star, so the church uses `#8b9bad`
  (body) / `#a6b4c4` (spire tip) — lifts of that same blue, documented in code as a deliberate,
  faithful exception (the painting's church IS the pale moonlit accent that stands out against the dark
  hills, echoing the cypress vertical). A slender bell tower + a thin 8-sided spire + a lit belfry
  window. It now unmistakably reads as the church.
- **Cluster, don't space out.** Six varied houses (size/rotation/lit) huddled around the church at the
  hills' foot, in a `group` sunk −0.02 so they seat on the bumpy terrain instead of floating. Warm
  windows stay emissive `meshBasicMaterial toneMapped={false}` (bloom catches them).
- Houses verified close-up (cropped the capture with `sips`): gable normals correct, no black/inverted
  faces, windows glow. Roofs at the derived `#26282b` read near-black — acceptable as the night
  village; lift later only if Mark wants them to model more.

## Foreground F4 — the cypress as a flame (2026-06-14)

The cypress was a smooth `LatheGeometry` surface of revolution — a black gummy spindle with none of
Van Gogh's flame. Rebuilt as a displaced tube.

- **A surface of revolution can't be a flame** — it's too regular. The fix: build the tube as a
  (RINGS×SEG) grid from the same flame profile (CatmullRom), then displace each vertex's radius by
  coherent angular noise that DRIFTS UPWARD with height (`vnoise(cos a, sin a + t·k)`), so the bumps
  become vertical licking tongues that spiral. Twist (`a += t·1.5`) + a sine sway off-vertical give the
  living, leaning flame.
- **Sample noise on the circle (`cos a`, `sin a`), not on the raw angle** — `vnoise(a·k)` has a seam
  at a=0/2π; the circle coords wrap continuously, no seam up the cypress.
- **Sharpen tongues asymmetrically:** `bump = bump>0 ? bump·1.5 : bump·0.6` pushes the outward licks
  out while keeping the troughs shallow → reads as tongues, not lumps. Taper the displacement toward
  the tip so the top stays a clean point.
- **Green-black modelling** from vertex colours (core `#10150f` → `#26301f` cypress green → `#3a4640`
  moonlit edge, keyed on tongue exposure + height) so it's a living dark-green flame, not flat black —
  faithful (the painting's cypress IS near-black green; the green only reads up close, which is right).
- **`seed` per flame** so the two clustered cypresses aren't identical (same noise → twins otherwise).
- **HMR gotcha:** dropping the `Vector2`/`LatheGeometry` imports the same turn as the rewrite left a
  transient HMR state that threw `Vector2 is not defined` and lost the WebGL context. The file was
  consistent — a reload cleared it. When an HMR error references a line that looks wrong, reload before
  believing it; don't chase a ghost.

## Foreground F5 — shrubs, full capture pass + reduced-motion re-verify (2026-06-14)

Polish + completion pass closing toward the foreground-complete gate.

- **Foreground shrubs** (`Bush`): small noise-displaced faceted icosahedra in the cypress-green family
  (`#232622`, palette), dotted along the ground as Van Gogh did — they fill the bare island top
  front-right and add foreground interest. Procedural fill (CLAUDE.md classification).
- **Left the forms' shading as-is** — silhouette + palette vertex colours + flatShading facets + bloom
  already carry the painterly mood. Full brushstroke-texture forms (wrapping meshes in oriented strokes
  like the sky) would be a bigger, riskier build — noted as a possible post-gate enhancement rather
  than risking the gate state.
- **Reduced-motion (locked) re-verified after all the geometry changes** via `browser_run_code_unsafe`
  → `page.emulateMedia({reducedMotion})`: under `reduce`, two frames 1.4s apart are byte-identical
  (churn frozen); under `no-preference` they differ (control). The foreground is static geometry (no
  `useFrame`), so it never threatened the criterion — but verified, not assumed.
- **`browser_run_code_unsafe` drives the Playwright `page` APIs** the plain MCP tools don't expose
  (emulateMedia, viewport, multi-step capture). The reduced-motion A/B is a single self-contained
  script — add this to the visual-review toolkit alongside the canvas-readback recipe.
- Full capture pass: desktop front, desktop orbit, mobile portrait — all read as Starry Night. Mobile
  portrait still can't fit the moon (the documented ~42°-off-arc limit; Mark's portrait-bearing call).
- `npm run build` + `npm run lint` green. The 1.38 MB bundle warning is pre-existing (three) — ship
  hygiene backlog, not a gate blocker.

## Gate feedback — "make the cypress taller and more dominant" (Mark, 2026-06-14)

First taste call at the foreground-complete gate.

- **Taller alone = a thin spike.** The cypress radius is independent of its height, so just raising
  `height` stretches it into a needle. Added a `girth` multiplier on the radius so it gains MASS, not
  just length — dominance = tall AND substantial.
- **Overshot first (height 3.8 / girth 1.45):** the flame tip clipped off the top of the frame and the
  middle went bulbous (blob, not flame). Dialled to height 3.35 / girth 1.3 — tip sits just inside the
  top edge, reads as a flame, now the clear dark counterweight to the sky. Pulled the base inboard
  (x −1.4 → −1.35) so the wider flame stays on the island without swallowing the village (the trunk
  base is thin; the bulge clears the houses).
- Lesson for "make X dominant": grow mass + height together and check the silhouette stays in frame —
  a giant that clips the frame edge reads as broken, not big.

## Review-response pass — seam, palette provenance, cypress reframe (Mark's review, 2026-06-15)

Mark relayed a four-point review at the open foreground gate; verified each against the code before
acting (receiving-code-review discipline), fixed the mechanical ones, took his calls on the taste/locked.

- **Island seam was a real bug — same class as the F4 cypress.** `rimWobble` + the two root-noise
  lookups sampled the RAW angle (`vnoise(ang*k, …)`), discontinuous at 0/2π → two coincident-in-xz
  vertices at different heights = a triangular shard/flap on the coastline, visible in orbit (clear in
  `f5-orbit.jpeg`, gone in `g1-orbit2.jpeg`). Fix = sample on the circle `vnoise(cos·k+ox, sin·k+oy)`,
  with k riding the y axis for the root rings. `coastR` was already safe (integer sine harmonics are
  periodic). LESSON: when you fix a seam in ONE place (F4 cypress), grep the whole file for raw-angle
  noise (`vnoise(ang`) — the island predated that lesson and silently kept the bug.

- **Palette provenance without a retune (Mark's locked-criterion call).** The foreground had hand-picked
  lifted hexes (church, hills, cypress modelling, island earth, bush) outside palette.json — drift by the
  letter of the locked colour criterion. Converted each to `PALETTE.<swatch> × documented factor`
  (multiplyScalar, or lerp-toward-white), with factors chosen to REPRODUCE the current hex, not change it.
  - **Fit in LINEAR space, not sRGB.** three.js Color stores linear and `multiplyScalar`/`lerp` act on
    linear; vertex colours are linear. So the lift factor must be fit in linear (least-squares
    `f = (s·t)/(s·s)`), else the reproduced colour is wrong — the sRGB-eyeballed 1.53 was really 2.33 in
    linear. Scripts: `scratch/palette-fit.mjs`, `scratch/church-fit.mjs`.
  - Most surfaces hit ΔE<2 with a single scalar (island = hills ×{0.075, 0.45, 1, 2.33}; the hills band;
    the cypress greens). The focal CHURCH needed ΔE<1, so a 2-param fit `steeple ×a →white t` (pale
    ×1.45→.14, tip ×1.77→.26) — landed ΔE 0.5/0.4, visually identical.
  - New named swatches exposed in `palette.ts`: villageCool #36403f, hillsCrest #5c6872, cypressGreen
    #333426, cypressShade #232622. The light + painting-sampled-stroke carve-outs are unchanged.
  - The distinction that matters: PROVENANCE (swatch × logged factor, visual preserved), NOT a taste
    retune. Mark was explicit — "not darker." Captures confirm no colour shift.

- **Cypress reframe (gate feedback #2).** 3.35/1.3 was marginally over the line — tip pressed the top,
  crowded the left, risked clipping on portrait fov (trips the F6 "a giant that clips reads as broken"
  lesson). Mark's call: height 3.05 / girth 1.2 / x −1.3 (a little inboard). Still the dominant left
  counterweight; tip now clears the top with margin, church readable, left sky breathes. Front+mobile+orbit.

- **Spec de-stale (Mark delegated).** `CLAUDE.md:53` still said "constrained pan/tilt camera. Free orbit …
  out of scope," contradicting the locked `:128` (constrained orbit IS in scope; only free-fly out).
  Reworded line 53 to match. Line 53 is outside Claude's edit-allowlist — Mark delegated this one
  explicitly (as with the 2026-06-14 locked-edit batch).

Build + lint green; committed to main (not pushed). Gate stays OPEN — these were review responses, not the
gate approval, which is Mark's taste call.

## Hills made bolder (Mark, 2026-06-15)

Mark's post-review taste call: the hills read too dark/recessive (both of us had flagged it). Bolder =
brighter + more present, NOT a new palette — kept the `swatch × documented factor` provenance from the
provenance pass, just bolder factors.

- **First pass was too timid** (hills ×1.3/2.9, crest ×2.1, MAXH 1.1) — barely moved from the front,
  because the F2 lighting trap bites: the hills' near slopes face AWAY from the upper-right moon key, so
  the vertex colour has to carry the boldness and a small lift gets eaten by the low light. Reconfirms F2:
  push the colour harder than feels right for night forms.
- **Firm pass that landed (g3):** hills ×{1.5 trough, 3.5 mid}, hillsCrest ×2.25 crest (≈ #8797a5); a WIDE
  lit band (crest from t≈0.22, not 0.42, so the ridge FLANKS light, not just the very top — this matters
  more than the crest value because the flanks are what the camera sees); MAXH 1.1→1.3; swell amplitude up
  (0.25/0.2 → 0.32/0.24) for more pronounced rolling. Now a luminous blue-grey rolling presence behind the
  village, front + orbit.
- **Kept the crest (#8797a5) just BELOW the church pale (#8b9bad)** so the church still out-reads the hills
  as the village's focal point — the one rule that stops "bolder hills" from swallowing the pale spire.

## Foreground-complete gate PASSED (Mark, 2026-06-15) — entering the post-gate phase

Mark passed the foreground-complete gate after the bolder-hills tweak (g3). 4th of the 5 locked gates done
(end of Phase 0 ✓ · Phase 1 movable-decision ✓ · first full animated sky ✓ · foreground complete ✓); only
the pre-release gate remains. Carried forward 4 post-gate items (see todo "Post-gate queue"): original-art
comparison (faithfulness audit) · mobile moon framing (portrait bearing) · reset control · final sky/flow
tuning (bake flowBias + leva values). Now proceeding autonomously on that queue between here and pre-release.

## Front-view taste corrections + reset control (Mark, 2026-06-15, post-gate)

Mark set the original painting as a front-view composition CONTRACT — cypress nearly reaching but not
clipping; central whorl lower/less-oversized; moon painted not sticker-bright; village/church a small pale
anchor — and asked for tiny corrections IN ORDER (cypress → bloom → sky exposure) BEFORE any stroke/flow
math, with the flow-field used only as fine verification afterward (not a visual hammer).

- **Corrections (all small, baked as the leva defaults):** main cypress girth 1.2→1.1 + height 3.05→3.0
  (slimmer, still nearly reaching the top); star/moon bloom softened (bloom 1.1→1.0, threshold 0.6→0.63,
  moon 1.7→1.45, stars 2.5→2.0) so the moon/stars read painted not sticker; sky exposure quieted via the
  stroke brightness term in `strokeFrag` (`0.62+0.34·flow` → `0.54+0.32·flow`) — that's EXPOSURE, not the
  flow MATH Mark deferred. The sky is deeper but still reads pale; more darkening + the whorl reposition
  are the next (stroke-math) step.

- **Reset control — the bug hunt that mattered.** A subtle on-canvas "↺ Reset view" button. The first two
  attempts (forwarded ref; then `makeDefault` store + `controls.reset()`) BOTH left the camera orbited. A
  window-exposed diagnostic bisected it: onClick fired (tick 0→1), controls present, reset() callable — so
  reset WAS running. Reading `controls.object.position` / `target` / `target0` before+after revealed the
  cause: **drei saves OrbitControls `target0` = [0,0,0] at construction, BEFORE the `target` prop
  ([0,1.05,0]) is applied**, so `reset()` reverts the look-at to the ORIGIN → the camera tilts down at the
  void (not an orbit at all). Fix: don't use `reset()`; set `controls.object.position` + `controls.target`
  directly to a single-source `HOME_POSITION`/`HOME_TARGET`, then `update()`. `.set()`/`.update()` are
  method calls, so react-hooks/immutability doesn't fire (no disable needed). Round-trip verified (g7-reset).
  - LESSON: when a 3D control "no-ops", expose the object on `window` and READ its real state
    (position/target/target0) — don't theorise. I wasted a pass on a wrong damping-inertia theory before
    reading the numbers. And don't trust drei's `reset()`/`target0` when you set `target` via a prop.

## Sky deepened one notch — tone-aware, motion preserved (Mark, 2026-06-15)

Mark: push the sky one notch darker, keep it subtle — deepen the blue FIELD and low/mid stroke values,
PRESERVE the yellow/white highlight strokes + moon + stars; back off if it loses motion or turns muddy. No
flow math.

- The trick is a BRIGHTNESS-SELECTIVE darken in `strokeFrag`, not a global one: `deepen = mix(0.78, 1.0,
  smoothstep(0.42, 0.82, baseLum(vColor)))` — low/mid (blue) strokes ×0.78, bright (highlight) strokes ×1.0.
  So the luminous swirl filaments survive while the blue deepens. A global brightness cut would have
  flattened the motion; the tone curve keeps the bright-vs-deep contrast that IS the motion.
- Plus the dome gradient deepened ×0.85 (`PALETTE.skyZenith`/`skyHorizon` × factor via `deepenHex` —
  provenance kept) to darken the field behind the strokes.
- A/B (`g7-reset` → `g8-front`): blue field richer, swirls/moon/stars untouched, the Van-Gogh contrast
  actually reads BETTER — not muddy, motion intact. Kept. Lesson: to deepen a night sky without killing the
  glow, darken on a luminance curve (shadows/mids down, highlights held), never a flat multiply.

## Central whorl lowered + tightened (Mark approved, 2026-06-15)

The stroke-math step Mark sequenced after the corrections: move the authored central swirl LOWER + make it
LESS OVERSIZED, with the flow-field left as fine verification only (the big anchor stays authored). Changed
the two central vortices in `buildVortices`: main roll `v 0.34→0.40 / r 0.62→0.54 / strength 2.2→2.05`;
counter-roll `v 0.29→0.35 / r 0.46→0.40`. A/B (`g8-front`→`g9-front`): the glowing eye drops from the high
corner to mid-sky just above the church spire — MORE faithful to the painting (the swirl hangs over the
village), and the spire now reaches into the base of the whorl. Still the unmistakable hero swirl; sky
depth, highlights, moon, stars and motion all intact. Lesson: lowering the hero anchor toward the village
tightened the swirl↔steeple relationship — the painting's own arrangement, not something to invent.

## Mobile moon framing — portrait camera bearing (Mark approved, 2026-06-15)

The documented hard limit: in portrait the moon anchor sits ~37° off the composition centre and the portrait
horizontal-fov half-angle maxes ~18°, so fov alone can't fit it. Fix = a portrait-specific camera BEARING:
rotate the camera ~24° toward the moon's corner about the orbit target (`PORTRAIT_AZ`, applied via
`homePositionFor(aspect)`). Landscape is untouched (rotation 0 unless aspect<1).

- The swirl basis stays landscape-anchored, so the composition shifts a touch left as the moon comes in —
  cypress to the left edge, whorl up-left, moon upper-right. Reads as a complete Starry Night portrait WITH
  the moon (the trade Mark accepted on the A/B `g10-mobile-before` → `g11-mobile-after`).
- SIGN gotcha: positive `PORTRAIT_AZ` pushed the moon FURTHER off (the whorl moved right); negative pans the
  view right so the moon comes in. Got it from the capture, not analysis — empirical is faster for camera signs.
- Reset made aspect-aware: `homePositionFor(aspect)` is shared by `ResponsiveFraming` AND `ResetView`, so the
  reset button returns to the portrait bearing on a phone (moon stays) instead of the landscape home.
  Verified: orbit in portrait → reset → moon back in frame (`g12-portrait-reset`).

## Session wrap — 2026-06-15

Big session. Foreground-complete gate **review response** (island seam fix · palette provenance · cypress
reframe · spec de-stale) → **GATE PASSED** → a full post-gate composition pass: bolder hills · original-art
audit (→ Mark's front-view composition contract) · reset control · front-view corrections (cypress slimmer ·
softer star/moon bloom · quieter sky exposure) · sky deepened one notch (tone-aware) · central whorl lowered
+ tightened · mobile moon framing (portrait bearing + aspect-aware reset). All committed to `main` (NOT
pushed); `build` + `lint` green throughout; each step verified by capture.

**OPEN THREAD for next session** — two items to the pre-release gate (see todo "PICK UP HERE"):
1. **Final sky/flow value bake** (Mark's taste) — every change baked its value as the leva default, so the
   current look is the candidate; Mark either dials the panel or confirms the defaults ship. flowBias stays
   subtle/fine-verification only.
2. **Ship hygiene** (autonomous) — slim `flow-field.png` (3.2 MB) · strip `leva` from the prod build.
Then → **pre-release gate**. Ship hygiene (item 2) is now DONE — see the next section. Item 1 (final sky/flow
value bake, Mark's taste) is the remaining open thread — resume by surfacing that choice.

## Ship hygiene — leva stripped, flow-field slimmed (2026-06-15, autonomous)

Two release-readiness wins, both verified no-visual-change against the dev look.

- **leva out of the prod bundle.** The tuning panel is dev-only but its library was still bundled. Alias
  `leva` → a tiny stub (`src/dev/leva-stub.ts`) at build time only (`vite.config.ts`, `command === 'build'`);
  the stub's `useControls(name, schema)` returns each control's baked `.value`, so the shipped defaults are
  identical and leva (+ its deps) is dropped. App code unchanged; dev `serve` keeps the real panel. `tsc`
  checks App against the REAL leva types (the alias is a vite-build swap, post-typecheck), so no type
  conflict. Bundle 1,383 → 1,183 kB (gzip 390 → 324). Verified the prod build via `vite preview` renders
  identically (`g13-prod-front` == `g9-front`); no panel in prod.
- **flow-field.png 3.38 MB → 0.91 MB.** `encodePNG` already deflates at level 9 (filter:none) and the data is
  high-entropy noise, so lossless re-encode is a dead end — resolution is the only lever. `scripts/slim-flow-
  field.ts` does a 2× box-downsample in RAW value space (NOT `sips`, which would gamma-average the data
  channels and distort orientation). Averaging the double-angle channels (R=cos2θ, G=sin2θ) IS the correct
  orientation average — the whole reason for that encoding — so half-res is faithful, and the flow bias is a
  subtle fine correction anyway. Verified: with the fixed stroke seed, the front A/B (`g9-front` →
  `g14-front-slimflow`) is visually identical — swirl structure + stroke orientation unchanged. Locked-bar
  flow fidelity preserved. (NB: re-running `derive-reference.ts` regenerates the full-res png → re-run the
  slimmer after.)
  - **Idempotence guard (review catch, Mark).** The slimmer read + wrote the same path, so a stray second
    run would take 640→320→… and silently degrade the locked asset (the full-res only survives in git
    history). Fixed with a guard: only downsample the full-res 1280×1013 derive output; skip otherwise.
    Lesson: any in-place, destructive asset transform needs an idempotence guard (or a separate
    preserved-source → output) — assume it WILL get run twice.

## Sky brush-dab tunables (2026-06-20)

- Dev Leva control `swirl tightness` repurposed → dab `drift (arc)` (uDrift); vortex spiral-inflow
  tightness fixed at the tuned 0.45 inside makeFlowField. `flow bias` kept as the front painting-flow
  bias (NOT repurposed to jitter — it is the painting-fidelity knob). `churn speed` → drift SPEED
  (uDriftSpeed = speed*4). Dab size is the live `stroke width` (uWidth); per-dab size/drift variation
  is baked, absolute scale/arc are live uniforms (no rebuild on tweak).
- Tuned desktop defaults after the static→drift captures: strokes 8000→10000 (denser), stroke width
  1→1.45 (fatter — kills the "confetti/sparks" sparseness), bloom 1.0→0.85, bloom threshold 0.63→0.72
  and stars 2.0→1.4 (tamed the white star/whorl blow-out; stars read as gold haloed whorls now).
- Mobile budget: added `useIsCompact()` (max-width 768px) — strokes ×0.32 (~3200, near the Tunables
  3,000 figure) and stroke width ×1.3 so fatter dabs keep coverage at the lower count. dpr stays
  capped [1,1.5]. NOTE: real mid-tier-device fps is UNVERIFIED in this environment (headless rAF
  reads 0); confirm 30fps on a real phone before release.
- Captures (gitignored scratch/): bd1-front (static milestone), bd2-front (drift), bd3-front
  (tuned desktop), bd3-mobile (tuned mobile). Big lift on Mark's two tells: substance (chrome→paint)
  and flow — the sky now reads as packed Van Gogh brushstrokes tracing the painting's swirls.

## Sky brush-dab redesign — built & reviewed, fidelity tuning FAILED (2026-06-20)

Branch `sky-brushdab` (16 commits, NOT merged/pushed, gate OPEN). The sky was rebuilt from extruded ribbons
("liquid chrome") into a field of GPU-instanced brush-dabs placed along the derived flow, drifting Vrellis-style.
Built subagent-driven (Tasks 1–7, 11 node tests, all gates green), reviewed by a 6-lens internal pass + a Codex
whole-branch pass. Landed: moon crescent un-flipped; reduced-motion full-coverage still (`uFreeze`); swirl-eye
protection; thinner/crisper dabs (stars un-blurred); anchor-densified seeding; a dev-only "set as default"
button (writes `src/scene/sky-tuning.json`, security-hardened endpoint); stars/moon lowered.

**The substance/flow direction works (chrome→paint is a clear win). The fine FIDELITY tuning failed.** Mark
stopped the session: piece-by-piece live slider tuning + stacking several art changes between captures did NOT
converge to the painting, and the last passes (centring the whorl eye-glow + adding a 2nd whorl) made the
central whorls read as a two-eyed "face" — worse. The 2nd-whorl experiment was discarded (uncommitted).

**Lessons (apply next session):**
- **One change per capture.** Stacking eye-glow + 2nd-whorl + brightness in one go made it impossible to tell
  what helped vs hurt, and produced the "face". Change ONE variable, capture, judge against the original, repeat.
- **Frame-by-frame, region-by-region.** Crop MATCHED regions of our front vs `reference/starry-night-source.jpg`
  (whorl, Venus, star halos, moon corner) and diff each — don't eyeball the whole frame.
- **`canvas.toDataURL()` captures the GL scene only** (no DOM UI overlays) — the MCP page-screenshot times out on
  the always-on render loop, so use toDataURL for clean scene crops; use a real page screenshot only to show the UI.
- The committed eye-glow-centring (offset 0.09/0.1 → 0.03/0.04) is suspect — it makes the swirl eye a dark hole
  ringed by bright dabs (an "eye"); revisit/revert first next session.
- Captures live in gitignored `scratch/bd*` as the visual journey; `git log main..HEAD` is the session trail.

## Research-grounded sky fidelity — P1 coverage + P2 de-glow (2026-06-21)

Session started with a deep-research run (history/astronomy/turbulence/film refs → `tasks/` brief; key actionable
findings recorded below) and a methodical frame-by-frame diff of the front vs `reference/starry-night-source.jpg`
(matched-region crops in `scratch/cmp/`). The diff named the real gaps; built P1+P2 against them.

- **Research takeaways that steer the build:** (1) faithfulness lives in MOTION/COLOUR/IMPASTO, not astronomy —
  the painted crescent doesn't match June-1889's real moon and the stars aren't a datable map (Olson never
  published on it), so never chase a sky map. (2) Venus is the one solid celestial anchor — the single brightest
  light after the moon (Boime/Whitney + VG's letter); position debated, so anchor brightness not pixel. (3) Motion =
  MULTI-SCALE: a few big driving swirls → fine dabs with a minimum stroke size (dissipation cutoff). Do NOT tune to
  a Kolmogorov −5/3 slope — that stronger claim is REFUTED (Finlay 2020 rebuttal); tune by EYE vs reference crops.
  (4) Authentic motion = per-stroke (Loving Vincent), not a shader wash → keep discrete oriented ribbons. (5) Even
  Vrellis (~80k particles) + Still Night HAND-AUTHORED their flow fields and found it hard — expect a manual
  correction pass; our structure-tensor field is only the base.

- **The diff's headline: our glow was INVERTED.** The painting glows its STARS (radiant concentric halos) and
  leaves its central SWIRL as pure flowing paint. We were doing the opposite — a luminous "eye" on the pure-flow
  whorl (read as a dark-hole/portal) and FLAT gold-disc stars (no halo). So the glow budget must move OFF the swirl,
  ONTO the stars (P3).

- **P1 — the dashes→ribbons fix (the big win).** Dabs read as confetti over flat gradient because consecutive dabs
  along a streamline sit `STEP·R ≈ 0.3` world-units apart but were only ~0.15–0.28 long → they didn't TOUCH.
  Fix = lengthen along-flow ONLY (`halfLen = iScale·uWidth·2.6` in dabGeometry; width untouched so stars/filaments
  stay crisp) so neighbours join into continuous ribbons, + raise count 12000→22000 (cross-flow density; leva max
  →26000; mobile mult 0.28→0.16 to hold ~3.5k). Result: the sky now reads as packed flowing Van Gogh brushstrokes.
  Lesson: for a dab/streamline sky, dab length must EXCEED the along-streamline spacing or it reads as dashes —
  lengthen before adding count.

- **P2 — removed the swirl eye-glow entirely** (the `cores.map` glow sprites in SkyDome; kept the moon halo). Mark:
  "remove it, fill with strokes." First reverted the suspect centring offset (0.03/0.04→0.09/0.1) but the glow STILL
  read as an eye against the painting, confirming the concept itself fights the art — so deleted it.
- **Void caveat (honest):** removing the glow re-exposed the dark eye it had masked. At a vortex centre BOTH the
  circulation (`p×dir`) and inflow (`dir − p(p·dir)`) vanish → flow stalls → streamlines circle without crossing →
  a dark stagnation hole (worst between the two counter-rotating central rolls). Weighting dab seeding into the
  whorl centre + the S-bridge (`WHORL_FILL` in skyMapping ANCHOR_UVS) REDUCED it a lot but a small dark notch
  remains. The faithful full fix is a flow-FORM change (interlock the two rolls into a true double-comma so strokes
  sweep through) — deferred to avoid the earlier "two-eyed face" regression; flagged to Mark.
- Build/lint/tsc green throughout; NOT committed. Captures: `scratch/diff-front{,-p1p2,-p1p2b}.jpeg`, pairs in
  `scratch/cmp/RESULT-*.jpg`. Perf: 22k dabs unverified on real hardware (headless rAF reads 0) — confirm fps.
- Committed (sky-brushdab): P1+P2 `421c84d`.

## Sky fidelity P3 (star halos) + P5 (deepen) — 2026-06-21

Continued the same session, one change per capture, Mark reviewing each step.

- **P3 — radiant star halos (the inverted-glow fix).** Replaced the flat emissive gold-disc stars with a small
  bright core inside a big additive halo sprite (`makeStarHaloTexture`), so each reads as the painting's "tiny
  intense centre in a wide spiralling glow". Halo size scales with the star's own `scale`, so Venus (the largest,
  0.24) is the single brightest star after the moon — the one solid celestial anchor from the research. The dead
  `glow` control (orphaned by the P2 de-glow) now drives star-halo opacity. Committed `7ae4930`.
  - Balance lesson: first pass (halo ×11, core ×0.6) read as core-heavy gold BALLS; ×15 / core ×0.42 gave the
    right small-core-in-big-halo read but went MILKY in the dense band. Crisping the halo texture falloff
    (brightness concentrated in inner third, short tail to zero by ~0.6) helped only marginally (`87effc2`).
- **The milkiness is a CONTRAST problem, not a halo one.** The diagnostic 3-way (painting/soft/crisp) + the full
  frame showed the real cause: our stroke field is too LIGHT/pastel, so bright halos have no deep field to pop
  against — they wash together. The painting's stars pop because they sit on deep cobalt. → the halo-tighten has
  gone as far as it usefully can; the lever is colour (P5). Lesson: when added glows read "milky/washed", check the
  BACKGROUND VALUE before tuning the glow — a bright field defeats any halo.
- **P5 — deepen toward cobalt night (tone-aware).** Added a brightness-selective deepen to `dabFrag` (NOT the old
  ribbon `strokeFrag`, which the brush-dab redesign replaced): `col *= mix(0.58, 1.0, smoothstep(0.32, 0.8, bl))`
  where `bl` = base-stroke luminance — pulls the low/mid blue field strokes down while holding the bright highlight
  filaments + near-star creams. The sky now reads as night and the stars/filaments pop. A flat darken would kill
  the motion; the tone curve keeps the bright-vs-deep contrast that IS the motion (same principle as the 2026-06-15
  ribbon deepen, re-applied to the dab shader). NOT yet committed — depth is a taste call (could go a notch deeper /
  raise saturation to fully match the painting's cobalt).
- Still open on the sky: small residual whorl-centre notch; P4 moon (pale crescent → fat orange-gold + big warm
  halo); possibly deeper P5 / more saturation. Then P6 foreground (cypress blob, flat hills). Captures:
  `scratch/diff-front-p3{,b,c}.jpeg`, `-p5.jpeg`; pairs `scratch/cmp/{p3c-stars-3way,p5-*,GRAND-*}.jpg`.
- Committed: P3 `7ae4930`, crisp halo `87effc2`, P5 deepen+de-blur `0dc758d`.

## Sky fidelity — live-review round: blur, angle, moon, colour, notch (2026-06-21)

Mark reviewed live on localhost and gave two notes (angle wrong + blurry), then said "keep going" → finished a
full sky pass autonomously, one change per capture, all committed.

- **De-blur — DECOUPLE length from width.** The ribbons read as a smeary blend because the P1 length factor was
  COUPLED to the width control (`halfLen = iScale·uWidth·2.6`), so they were both long AND fat. Fix: make length
  absolute (`halfLen = iScale·2.7`) and let width (`halfWid = iScale·uWidth·0.5`) be a pure crispness knob; drop
  strokeWidth 1.05→0.8. Now thinner = crisper distinct strokes WITHOUT losing along-flow continuity. Lesson: keep
  a stroke's LENGTH (continuity) and WIDTH (crispness) on independent controls — coupling them means you can't
  de-blur without re-introducing dashes.
- **Angle — head-on eye-level is TWO coupled changes.** Mark: the 3/4 downward diorama view didn't match the flat
  painting. (1) Azimuth: rotate the home nearly head-on (HOME_POSITION + skyMapping CAM_POS x 2.2→0.6, kept EQUAL
  so the swirl basis re-centres on the new bearing — they MUST stay equal). (2) Elevation: the orbit `maxPolarAngle`
  (1.5 rad) was CAPPING how level the home could sit — it forced a downward look. Dropped the camera to the target
  height (y 1.5→1.05) AND raised maxPolar 1.5→1.62 so a level home is allowed. Result: village seen front-on, not
  bird's-eye. Lesson: a "looking down too much" home can be the POLAR LIMIT, not just the camera height — check the
  orbit clamp. CLAUDE.md Tunables updated (polar max 1.62); still constrained, no free-fly.
- **Moon P4.** Pale lemon → warm orange-gold crescent; broaden+warm the halo. First pass FLOODED the corner pale
  (halo scale 5.6 / op 0.6 + bloom) → dialled back to scale 4.6 / op×0.45 = a contained glow that pops against the
  deepened night. Lesson: an additive halo that's too big/bright washes its whole corner under Bloom — size it to
  pop, not flood.
- **Colour P5b.** Deeper still: tone floor 0.58→0.48, saturation 1.3→1.45, gradient zenith/horizon deepened.
  Subtle on the strokes (they carry the painting's own light swirl colours) but the between-stroke field + lower sky
  read richer. Diminishing returns here — the strokes ARE the painting's bright colours, so the field can only go so
  deep without darkening the highlights.
- **Whorl notch — the faithful fix (worked).** The de-glow exposed the stagnation void; filled it by INTERLOCKING
  the two central rolls (counter-roll uv 0.58,0.35→0.52,0.37, r0.40→0.44, str1.4→1.5) so the counter's circulation
  sweeps flow across the main eye = the painting's double-comma S. Notch essentially gone. Lesson: this is NOT the
  "two-eyed face" risk (that was a SEPARATE extra whorl) — merging two existing rolls into one interlocked swirl is
  the opposite move and is safe + faithful.
- All 8 commits this session `git log main..HEAD`; build/lint/tsc green throughout. Captures:
  `scratch/{deblur,angle,eyelevel,p4,p4b,p5b,notch}-wide.jpeg`; `scratch/cmp/{angle-3way,notch-whorl,SESSION-before-after,GRAND-*}.jpg`.
  Perf: ~22k dabs at eye-level still UNVERIFIED on real hardware — confirm fps on Mark's machine + a phone.

## Brush-dab churn engine — the dabs NEVER rendered (DoubleSide bug) (2026-06-22)

After the brush-dab engine was built, reviewed, and committed (2865909), Codex code-review flagged two
must-fixes; applying + verifying them surfaced that the engine had been **completely non-functional** —
the live "churn" everyone saw was 100% the base flow-map advection (the smooth "water" Mark rejected).

- **THE BUG: a y-flip reverses winding → FrontSide culls every instance.** `imgToClip` (skyFraming)
  does `1.0 - uncontain.y` to map image-UV (y-down) → clip (y-up). That flip reverses the dab quad's
  triangle winding to back-facing, so the default `side: FrontSide` material culled all 18,000 dabs.
  The base full-screen quad does NOT flip y in its vertex shader, so it rendered fine — which masked
  the problem. **Fix: `side: DoubleSide` on the dab material.** Lesson: any shader that flips an axis in
  the vertex stage flips winding too — set DoubleSide (or invert the index) or the geometry vanishes
  silently with NO console error.
- **Capture pitfall: `canvas.toDataURL()` via Playwright returned a STALE, byte-identical frame** every
  call (same md5) even with `preserveDrawingBuffer` and rAF ticking at 120fps — made a moving scene look
  frozen (motion-diff 0). The RELIABLE method: in-page `ctx.drawImage(canvas,…)` into an offscreen 2D
  canvas, then `getImageData` and diff/export from THAT. Use drawImage→getImageData for all motion checks,
  not toDataURL round-trips.
- **Diagnosis path that worked:** zero motion with base static → suspect dabs → forced dabs solid red
  ignoring mask/fade (still 0 red) → ruled out assets (fetch+getImageData OK) and geometry (logged 18k
  instances, valid homes) → only rendering left → winding/culling. Lesson: when an instanced layer shows
  nothing, prove render-vs-not with a constant-colour debug frag BEFORE blaming the data.
- **Codex's two must-fixes (both applied):** (1) base `flowAmount`/`uAmp` default 0 so the dabs are the
  sole churn and the base holds the painting 1:1 (also kills the water-flow read); (2) per-fragment
  footprint mask — sample `uMask` at the fragment's own image-UV (`vImg`), not the dab centre, so a dab
  edge lapping onto cypress/village/moon fades out (the creepy-tree shimmer). Codex reviews source only —
  it explicitly could NOT confirm registration "without capture evidence" and missed the culling bug; the
  runtime capture caught it. Lesson: pair every Codex source review with a runtime capture pass.
- **Verified result:** whole sky churns as discrete brush-dabs flowing along the swirl streamlines
  (heatmap `scratch/dab-heatmap.png` — dab-shaped streaks, not blur); stars/moon/cypress/village static
  (sky-mask holes); reduced-motion frozen byte-identical; tsc/lint green. Commit applies all three fixes.
  Open/taste for Mark: the star+swirl halos are masked static (dark holes) — reference video has them
  ROTATING; widening the mask to let halos churn is a possible next refinement. Perf at 18k UNVERIFIED on
  real hardware/phone.

## Halos must ORBIT, not just churn — force tangential flow in the bake (2026-06-22)

Mark: "let the halos spin too" (stars sat static), then "nothing's moving around the moon". Two passes:

- **Pass 1 (mask only) made halos CHURN but not SPIN.** Forcing the star halos into sky-mask.png (so dabs
  seed there) made them move, but a 4-lens adversarial workflow (verify-halo-spin) caught the real gap: the
  dab motion model is LINEAR DRIFT + snap-back (dabEngine vertex: `center = aHome + aTangent*aLen*t`), so a
  halo only reads as rotation if the baked flow is COHERENTLY TANGENTIAL there. It wasn't — at the small
  stars the structure-tensor orientation is noisy/radial and 3 stars were even wrong-signed, so dabs drifted
  in/out, not around. Only the central whorl (coherent circular flow) actually spun. Lesson: seeding dabs in
  a region ≠ making it spin; the FLOW FIELD must be tangential. A motion-diff metric can't tell spin from
  flicker (the `sin(pi*t)` opacity pulse guarantees diff>0), so a heatmap RING around a static core is the
  real evidence of orbit.
- **Pass 2 (orbit-forcing) — the fix.** In the signed-flow bake, near each HALO_SWIRLS centre blend the
  direction toward the PURE tangential circulation (`dir = mix(structureDir, normalize(cx,cy), wOrbit)`,
  wOrbit→1 at centre, →0 by the halo edge). Open sky keeps the painting's own brush orientation, so fidelity
  holds. Result: stars + moon halo now ORBIT (heatmap shows churning rings around small static cores).
- **The moon halo** needed the same treatment + a circulation centre: added `[0.85,0.16,+1,0.11]` to SWIRLS
  so the ring orbits, and the existing `* moon` guard still zeroes the crescent — so the bright RINGS spin
  while the gold crescent stays crisp/static. (moonCrescent diff 0, moonRing 5.2, was a dead hole before.)
- **Shared HALO_SWIRLS** (defined once, used by both signed-flow orbit-forcing AND the mask discs) so the
  masked halos are exactly the orbited ones. Excludes the dominant central whorl (r>0.12) and any swirl on
  the cypress column (`u<0.2 && v>0.3`) — that drops the [0.1,0.42] swirl the review flagged as lapping the
  cypress tip. Verified: cypress 1.9 / village 0 static, reduced-motion 0, fidelity still faithful, build green.
- **Crisper dabs:** default dab size 1.0 read blurry to Mark → 0.55 (leva default + material uSize init).
- Adversarial-workflow verdict that drove pass 2: `tasks/wmeujjsxm.output`. Captures:
  `scratch/{orbit-heatmap.png,orbit-full.jpeg,orbit-moon.jpeg}`. signed-flow.png still 3MB (ship-hygiene TODO).

## Forcing pure-tangential flow = "water"/blur — keep the painting's own orientation (2026-06-22)

The orbit-forcing from the previous entry (blend the halo flow toward a pure mathematical tangential circle)
DID make halos orbit — but Mark: "it's now looking like a water and getting blurry." A pure circular field
makes every dab in the region align into smooth, coherent, laminar streaks = the exact "water flow" the brush-
dab engine exists to avoid, and coherent overlap reads as blur. REVERTED to sign-align ONLY (keep the
structure-tensor orientation = the painting's own brush direction, just choose which way each swirl turns).
Around the moon/stars the painting's OWN strokes already curve along the halo rings, so they still rotate —
but with brushstroke texture intact (dabby, not glassy). Moon halo still moves (it's in the mask now);
moonRing 5.22, crescent 0 static, openSky 12.4.
Lesson: the dabby character depends on the flow field carrying the painting's orientation VARIATION. Any step
that replaces it with a smooth analytic field (pure curl/tangential) trades the brushwork for water. To bias
rotation, nudge the SIGN, never overwrite the direction. Priority order Mark has shown: dabby-not-water >
exact orbit. Capture: scratch/moon-dabby.jpeg.

## Brush-dab smear fix: strokes must carry source paint detail (2026-06-22)

The flat-colour dab layer was the actual smear source. Paused/base-only renders were pixel-sharp against
`painting.jpg`, but running dabs fogged the whorl because every dab sampled one colour at `vHome` and thousands
of translucent overlaps averaged into a milky field. Tuning halo spin, count, or width could not solve that
fundamental lose-lose: translucent flat dabs blur, opaque flat dabs become a low-detail mosaic.

Fix: keep the H1 orbit/path work, but make each dab a brush-shaped cut-out from the painting itself. The vertex
shader now passes a `vSourceImg` footprint around `aHome`; the fragment shader samples `uPainting` at that
patch coordinate instead of one flat home colour, while still masking the destination footprint (and source
footprint in patch mode) against `sky-mask.png`. Added `patch strokes` A/B and `stroke opacity` controls; default
opacity 0.6 preserved crisp rendered crops while restoring visible motion.

Verification loop: lint, build, and `test:sky` green. Rendered crop-vs-painting captures show the running whorl
stays close to source detail instead of fogging (`scratch/codex-patch060-whorl-cmp.jpeg`), with full-frame
sharpness intact (`scratch/codex-patch060-full.jpeg`). Motion survived at a lower, cleaner intensity
(`scratch/codex-patch060-motion.png`, mean diff 2.35, moving fraction 22.5%). Remaining visual gap: compared
with the parsed video motion (`scratch/codex-patch060-vs-ref-motion.png`), the render is still darker and less
ring-forward, especially around the moon, so the next tuning should be halo/ring emphasis after this fidelity
fix, not a return to flat-colour dabs.

## Crisp churn locked — base static + patch dabs for motion; 3D detour removed (2026-06-22, Mark review loop)

Closing the smear saga. Reviewed Codex's patch-stroke fix in code AND visually (the discipline Mark set: rendered
crop vs `painting.jpg` every step, never heatmaps alone). Patch/cut-out strokes are the right fix; this pass tuned
the motion to the crisp source and removed an unrequested 3D detour.

- **Base-flow advection re-blurs — keep it OFF.** Codex briefly set `LivingPainting` flowAmount 0→0.03 for life. It
  pumps motion (frame-diff mean ~14.9) but the dual-phase cross-fade softens the base wherever flowAmount>0 → the
  whorl blurs again (the "ass" look), worst when zoomed. A/B at identical dabs: flow 0.03 = mean 14.9 but soft;
  flow 0 = crisp (`scratch/codex-r2-whorl.jpeg` vs `codex-r2-noflow-whorl.jpeg`). LESSON: base stays STATIC
  (flowAmount 0); ALL churn comes from the patch dabs. Base advection is the blur lever, the patch dabs are the
  crisp-motion lever — this is the same dual-phase blur that earned the "water" verdict, now pinned to the cross-fade.
- **Crisp-churn balance (shipped leva defaults).** base flowAmount 0; dabs strokeOpacity 0.5 / drift 0.9 /
  churnSpeed 0.13 / dabSize 0.5 / haloSpin 0.5 / patchStrokes on / count 12000. Verified: whorl matches the painting
  (`scratch/final-whorl.jpeg`), motion mean 5.19 / 13.9% moving, clean full frame (`scratch/final-full.jpeg`).
  Headroom: push drift/opacity for more churn at a small sharpness cost — crisp tops out ~mean 5–6; past that only
  base flow adds motion, and it blurs.
- **Halo orbit is ANNULAR now (supersedes the reverted orbit-forcing).** `haloOrbit` weight peaks in the swirl's
  RING band (≈0 at the centre where rel→0 so orbit is invisible, ≈0 past the edge); the shader keeps angular speed
  CONSTANT (decoupled from weight) so each ring turns rigidly (v=ωR, strongest at the ring radius). Stars read as
  rotating rings; the moon stays subtler (pale-uniform halo = low motion contrast). The old centre-peaked gaussian
  was the bug — spin concentrated where rel→0 = invisible. Shared swirl table `src/scene/skySwirls.ts` is the single
  source for BOTH the bake mask discs and the orbit, so they can't drift.
- **3D `?mode=3d` was scope creep — removed.** Codex also bridged the flat sky back onto the SkyDome arc
  (`FrontPatchSky` + revived `SkyDome`/`Diorama`). Project direction is the flat living-painting; deleted
  `FrontPatchSky.tsx`, restored `App.tsx` to flat-only, stripped the front-patch material from `dabEngine.ts`.
  (`SkyDome`/`Diorama`/`dabField`/`dabGeometry` remain as untouched, unimported legacy.)
- **Method that worked (Mark's visual gate):** capture a matched whorl crop OURS vs `painting.jpg` in-browser +
  a 1s frame-diff for motion magnitude; the paused frame (dabs off) == painting proved the base was fine and the
  dabs were the smear. Heatmaps show motion presence/location only, never look-quality — that miss is what burned
  the earlier halo passes.
- Committed on `sky-brushdab`; build/lint/`test:sky` (15/15) green. Perf at 12k dabs still UNVERIFIED on real
  hardware/phone (headless rAF reads 0).

## Sky motion settled — streamline ribbons replace brush-dabs (Gemini build, 2026-06-22→23)

`BrushDabs` was replaced by `StreamlineSky`: continuous ribbons integrated through the painting's signed flow field,
with a brightness phase travelling along each stroke. Built by Gemini (Antigravity) over four capture-verified rounds
against the parsed reference video; committed `9c021df`. Claude wrote the brief, cross-reviewed Gemini's plan, and
reviewed every pass by Playwright capture.

- **Medium beats magnitude.** Dabs / worms / water / A-B blends all failed because they read as objects moving OVER
  the painting; streamline ribbons read as the painting's OWN stroke energy moving. This was the Codex note's
  diagnosis (`tasks/codex-motion-note-2026-06-22.md`) and it held.
- **Closing the gap to the video took three axes, in order:** coverage (seed + integrate across the whole sky mask,
  fade with the mask on the GPU — don't cut integration short, no rooftop spill), halos (activate star cores + the
  moon halo RING as the same streamline shimmer, keep the moon crescent static — NOT a mechanical spin/fan), grain
  (more + finer ribbons to fill the inter-swirl gaps).
- **Visibility comes from the RIGHT knob.** Raising `speed` (phase travel) + flow contrast reads as faster painted
  flow; raising `shimmerSpeed`/`shimmerMix`/`bristle` tips into crawling-worms/boil. When density went up (count
  2400→3000, width 0.0038→0.0032), dropping `opacity` 0.6→0.55 kept the base crisp — the fog the dabs once had.
- **The heatmap mean is NOT proof — proven again.** Across v1→v4 the motion-map MEAN FELL (1.56→1.14→1.33→1.23)
  while coverage, ringing halos and perceived liveliness ROSE. Gemini's first plan gated on "push the mean to
  3.5–4.5"; cross-review rejected that because a render can hit the number by boiling. Every round was judged by
  looking at render-motion vs video-motion side by side, not by the number.
- v4 leva defaults baked: count 3000 / strokeWidth 0.0032 / opacity 0.55 / speed 1.6 / shimmerMix 0.30. Centres from
  `skySwirls.ts` (single source) so CPU + GPU can't drift. Open: Mark's live sign-off + perf on real hardware
  (count 3000, one draw call); gate still OPEN.

## Read CLAUDE.md often — skipping it inverted the project direction (2026-06-23)

Asked "what's our next move?", Claude recommended "lock the flat 2D version and drive to the pre-release gate"
— and even drafted edits to RETIRE the locked 3D-diorama vision. Wrong. The flat 2D is a foundation milestone;
the **3D orbitable diorama is the endgame** (the locked CLAUDE.md vision), and Mark's plan is *tune the proper
2D, THEN make it 3D.* Mark: *"another day that proved you can't be trusted"* and *"CLAUDE.md is the one you need
to read often and you skipped that."*

- **Root cause:** anchored on the current flat CODE + the gate map instead of re-reading CLAUDE.md; the
  session-start copy faded from attention by the time a direction call was made.
- **Fix (saved to memory `anchor-on-vision-not-current-code` + `starry-night-endgame-is-3d`):** RE-READ
  CLAUDE.md at the start of work and before any strategy/direction call. When the code has diverged from the
  locked vision, the vision wins — surface the divergence and ASK, don't recommend the path the code sits on,
  and never default to "ship it."
- **The arc that explains the divergence:** the 3D vortex-dome diorama existed (06-20) but the sky didn't FEEL
  like the painting → dropped to a flat 2D living-painting to nail the sky MOTION against the painting + the
  parsed video (06-22) → `StreamlineSky` settled the 2D motion (06-23) → next phase carries that motion back
  into the 3D diorama (curved-canopy route).

## "Set as default" button re-wired to the streamline-sky controls (2026-06-24)

Mark tuned the v4 sky live (count 3000→2000, opacity 0.55→0.45, pulse 8→7.5, shimmerMix 0.30→0.80, shimmerSpeed
2.5→3.0, shimmerScale 2.5→2.8) and asked for the "set as default" button so live tweaks persist. The persistence
plumbing already EXISTED from the old brush-dab engine but was half-wired to dead fields — re-targeting beat
rebuilding.

- **The endpoint was already there, just stale.** `vite.config.ts` has a dev-only (`apply:'serve'`) hardened
  `/__set-tuning` middleware that writes `src/scene/sky-tuning.json`. Its `TUNING_FIELDS` allowlist + the JSON
  still held the OLD ribbon-engine keys (strokes/swirlTightness/skyTop/…); neither current component read the
  JSON or sent a save. Fix = retarget the allowlist to the 14 current keys (living-painting churnSpeed/flowAmount
  + the 12 streamline-sky controls), rewrite the JSON to those keys, wire both components to read it. Lesson:
  before building dev tooling, grep for a prior version — this repo's "set as default" infra survived two sky
  rewrites and only needed re-pointing.
- **leva `button((get) => …)` reads the GLOBAL store cross-folder.** One button in the `streamline sky` folder
  collects BOTH folders via `get('living painting.churnSpeed')` etc. — leva paths are `folderName.schemaKey`
  (the KEY, not the label; spaces in the folder name are fine). Verified: clicking it wrote all 14 keys incl. the
  other folder's two. So the save button doesn't need to live with the controls it captures.
- **The writer OVERWRITES, never merges** — it writes exactly the cleaned payload. So the button MUST send all
  14 fields every time (it does), and any curl/test must too, or fields silently vanish. A wrong `get` path →
  `undefined` → `JSON.stringify` drops the key → field silently missing (no error); so verify by asserting the
  written file has the full key count, not just HTTP 200.
- **Defaults via `tuned(key, factory)`** (`src/scene/tuning.ts`): reads `sky-tuning.json`, falls back to the
  hardcoded factory value per key. The JSON is the OVERRIDE layer; the code keeps the factory values as the
  second arg (so "reset to factory" = clear the JSON). In production leva is aliased to the stub, whose
  `useControls` returns `schema[key].value` = `tuned(...)` = the saved JSON value → the shipped default IS the
  saved look. So the same file drives the dev panel default AND the baked production default.
- **leva-stub `button()` stays no-arg.** tsc typechecks call sites against the REAL leva (the stub is a
  vite-BUILD alias, post-typecheck — see the 2026-06-15 leva-strip lesson), so `button((get)=>…)` is checked
  against real leva's signature; the stub's `button` only needs internal consistency. A `_onClick` param tripped
  `no-unused-vars` — dropped it.
- **Editing these files HMR-resets the live panel**, so I baked Mark's current tuned values into sky-tuning.json
  as part of the change — his panel comes back tuned, nothing lost. The factory v4 numbers live on as the
  `tuned()` fallbacks. Verified end-to-end: read-back (panel opens at 2000/0.45/7.5/0.80/3.0/2.8), button writes
  all 14, endpoint allowlist/bad-type/origin/content-type guards (200/400/403/403), build+lint+test:sky green.
  NOT committed (awaiting Mark).
- 2026-07-08 — Capture-pipeline trap: `capture:diorama` trusted any 200-OK on :5173 and captured the
  markma.dev portfolio's canvas (a cream fog) instead of this app — all 8 "captures" were of the wrong
  application. Fix in `scripts/capture-diorama.mjs`: dedicated default port 5179 + `--strictPort`, an
  app-marker check (`The Starry Night` in the served HTML), and a poll-for-canvas wait replacing the
  fixed 1.8s sleep that raced Vite's cold-start optimise/reload. Rule reaffirmed: a capture that looks
  nothing like the scene is a pipeline failure first, a render failure second.
- 2026-07-08 — Slice 1 sky-colour tunables (painting-owned foreground plan, task 1): Bloom
  0.42/0.38/0.42 → 0.5/0.58/0.5 (tighter, only true brights bloom — the proven crisper recipe);
  gradient 0.72/0.86 → 0.58/0.68 (deeper cobalt night); wash lift 0.68,0.82,1.04 → 0.6,0.72,0.95 at
  alpha 0.5; ribbon pulse 0.58+0.46 → 0.46+0.38 with saturation mix 1.2 → 1.45 clamped at 1.05 (two
  passes — the first was not saturated enough); star halos/cores and moon crescent shifted from white/
  orange to the painting's golds; moon halo sprite 3.35 → 3.85. Verdict after pass 2: cobalt field,
  gold star orbs, radiant moon — good enough to proceed; final colour polish deferred until the
  foreground rebuild changes the whole frame's context.
- 2026-07-08 — Slice 2 (SourceCypress): home-view projective texturing works as the "one flame"
  mechanism — the volume's silhouette comes from `extractCypressSlices` (painting's own dark left
  band) and its surface samples painting.jpg through the same projection as the camera-locked matte,
  so head-on they are pixel-identical and drag reveals only depth. Two extraction traps found by
  looking, fixed in pass 2: (1) dark COBALT sky passes a pure luminance gate — cypress needs a chroma
  gate too (blue not dominant: b < g + 12), or the tip grows blocky sky-blue facets; (2) runs must be
  CONNECTED to the flame column (walk up/down from the widest run requiring interval overlap) or
  detached dark blobs join the silhouette. UV_COMPRESS 0.82 → 0.7 kept edge samples on painted bark.
  Open item after this slice: at the extreme +45° orbit-preset stress view the camera-locked matte
  strip still separates from the world volume (reads as a hanging painted ribbon) — re-examine after
  the slice-3 composition change; candidate fixes are a camera-delta fade on the matte band or a
  world-locked backing patch.
- 2026-07-08 — Slice 3 (SourceReliefTerrain): the prop world (FloatingIsland, RollingHills, box
  village/church, bushes, blades, stones, dioramaLayout) is DELETED; the foreground is now a relief
  grid over the painting's ground band — home-view projective registration, depth staged hills-far →
  ground-near with rolling swells + luminance impasto, and a dark palette-earth root closing the
  volume. Four passes, each fixing something found only by looking: (1) the matte's underpaint band
  needs a LOWER-BAND v-gate or non-sky blobs inside the sky (moon disc, whorl cores) get underpainted
  → mottled sky and a broken "eye" moon; skyline arrays need moving-average smoothing or per-column
  jumps stretch white sky texels into skyline spikes; (2) edge columns must MELT to the underpaint
  shell distance (dist += (SHELL_MELT−dist)·curl), not add a constant offset — a constant curl builds
  a visible mid-air wall at the frame corners; (3) the paint→root transition needs an aPaint fade over
  the last painted rows or the bottom clamp smears white before snapping to black; (4) the root must
  CLOSE into a keel (collapse the final rings) — an open bottom shows the far wall's interior as a
  pale arch from the mobile camera, which sits ~4 units behind the home eye and looks under the band.
  Matte design decision: keep the below-skyline band as a DARKENED underpaint (not removed) so world/
  backdrop parallax reveals read as shadowed ground, never as a second bright village.

## Authored brushstroke forms — the 3D pivot (2026-07-09)

Mark chose "authored 3D forms" over the projected-painting relief (which funnelled/torn-papered the
moment the camera left head-on — a flat painting holds one viewpoint). New thesis: **the whole
diorama is built from Van Gogh brushstrokes** — real closed 3D volumes CLAD in oriented impasto
strokes. Plan: `docs/superpowers/plans/2026-07-09-authored-brushstroke-forms.md`. Built the shared
cladding kit (`brushForms.ts`), the cypress (`BrushCypress`), and the solid island (`BrushIsland`);
deleted the projected-relief foreground (SourceCypress/SourceReliefTerrain/DioramaForegroundMatte/
sourceProjection). Five capture-verified passes; the three insights that actually mattered, in order:

- **Solid closed forms survive orbit; projection never will.** A rooted island closed to a keel
  point shows solid painted rock from every angle — the black funnel and torn-paper edges are gone
  for good. This is the whole point of the pivot and it works: look-down and full front-arc orbit
  hold. Verify EVERY slice with the look-down capture (added to `capture-diorama.mjs`).
- **Cladding only reads on surfaces that FACE the camera.** Flat strokes laid on a near-horizontal
  hilltop, viewed at a grazing angle, foreshorten to nothing — three passes of a "smooth clay"
  mound proved it. The cypress read immediately because it's vertical. Fix: model hills as STEEP
  rounded humps whose near faces present to the front camera (rewrote `topY` to gaussian humps).
- **Per-stroke VALUE VARIANCE is the Van Gogh read.** Strokes that vary smoothly (by height/light)
  average into a gradient = smooth clay. A strong per-stroke random value kick (×[0.5..1.5]) makes
  adjacent marks contrast hard → they read as distinct brushstrokes. This was THE breakthrough — it
  turned the mound into brushwork in one change. Van Gogh's surfaces are high-frequency value
  contrast between neighbours; reproduce that literally.
- **Taper the brush quad → brushstroke, not tile.** Rectangular quads read as a Minecraft/voxel
  mosaic. Making `pushBrush` a tapered lens (pointed ends, full-width middle, 6 verts) softened
  every form at once from "blocky" to "brushy".
- Baked moon-lit modelling into vertex colour (`meshBasicMaterial vertexColors, toneMapped false`)
  over a dark solid base so stroke gaps read as shadow, not void — same recipe as the sky.

**Status: validated proof-of-technique, NOT finished.** Open for the next passes: cypress tip is a
touch blobby; the island is ONE hump with no village/church yet; the light flecks read a little
confetti-ish; the smooth grey underside cone could itself be clad; pre-existing navy sky-gap blob
top-left is more visible now. But it reads as Starry Night's cypress + a painted floating island
under the churning sky, and it SURVIVES ORBIT. Evidence:
`output/playwright/authored-forms-2026-07-09/s1-p5/` (p1→p5 shows the retune trail).
- 2026-07-09 — The ghost "tree in the background" was NOT a rendered tree: the sky-mask cuts the 2D
  cypress (and star-swirl blobs) out of the camera-locked backdrop sky as black holes, and the dark
  gradient sphere behind showed through the cypress-shaped hole (my slice-1 gradient-darkening made
  it worse). Now that the cypress is a real 3D form, that cutout is obsolete — fixed by filling the
  sky-band mask holes with a night-sky blue in the wash shader (`PaintingFlowSky3D` washFrag). Lesson:
  a "phantom object" in a masked composite is often a HOLE revealing the layer behind, not a drawn
  thing — check the mask before hunting for a stray mesh.
- 2026-07-09 — Mark's read on the authored forms: the brushstroke LOOK is on track; what broke the
  "Starry Night" read was MISSING CONTENT (a lonely cypress + bare hill). Adding `BrushVillage` (the
  huddle of gable houses + the pale slender-spired church as the focal vertical, warm emissive
  windows, seated on the island via `islandHeightAt`) made it read as the painting — best the piece
  has looked. Composition is the content, not just the texture: the church spire answering the
  cypress across the frame is what says "Starry Night". Evidence:
  `output/playwright/authored-forms-2026-07-09/s2-village/`.

## Four rough edges — village cladding, cypress flame, sky-fill churn, hill calm (2026-07-12)

The 2026-07-09 Mark-confirmed polish list, one capture-verified slice each. What was learnt:

- **Village cladding (2 passes):** scattering tapered marks on the box faces was easy; making them
  READ was the same lesson as the hills — walls needed a HARD value kick (0.58–1.38) plus
  occasional pale moonlit flecks before they stopped being flat CAD blue. A subtle kick (0.72–1.24)
  on a dark base is invisible at composition distance. The church wants the opposite: a narrow
  bright spread (0.86–1.16) so it stays the clean pale focal; its thin spire stays UNCLAD — the one
  crisp edge in the village is what makes it read as the spire.
- **Cypress (3 passes):** the lumpiness was FREQUENCY, not amplitude — ridge noise cycling ~5× up
  the column stacks horizontal lumps; halving both angular and vertical frequency (few TALL
  tongues) is what made it a licking flame. Two traps the low-frequency change then exposed:
  (1) low-frequency exposure noise POOLS pale strokes into big grey bands (badger stripe) — fix
  with per-stroke exposure jitter so pale marks scatter through the dark mass; (2) long slim
  strokes with radial tilt + stick-out read as FUR at the silhouette — thicker marks (halfWid up),
  less stick-out and less radial tilt read as flame flicks. Elegance = low-frequency silhouette +
  high-frequency value scatter, the exact opposite pairing of what it had.
- **Sky-fill churn (3 passes; the mechanism lesson of the session):** seeding ribbons in the
  mask hole was necessary but nowhere near sufficient. Three failures in order: (a) hole trail
  points sample the CUT-OUT TREE's pixels → brown ghost strokes — donor-colour from the nearest
  true-sky pixel; (b) the donor test must use the RAW mask — `effectiveMask`'s star-halo boost
  deliberately claims hole pixels near star swirls (for seed density), and judged on it the donor
  logic re-served tree browns near the tip; (c) nearest-donor FLOW is discontinuous (the donor side
  flips as a trail crosses the hole) → jagged circuit-board zigzags. The fix that landed: inpaint
  the flow across the hole ONCE per build (coarse 112×80 grid, true-sky cells fixed, hole cells
  Jacobi-relaxed 60 iters) and integrate against that — smooth by construction. Rule of thumb: a
  nearest-donor lookup is fine for COLOUR (local, per-point) but never for a field you INTEGRATE;
  integration amplifies donor discontinuities into geometry.
- **Hills (1 pass):** the 2026-07-09 breakthrough (±50% per-stroke value kick) was a proof of
  MECHANISM, not a tuned value — at composition distance ±50% is salt-and-pepper; ±35% keeps the
  brushwork read while the contours knit. Flecks 10% → 4.5%. Longer marks (halfLen 0.135–0.225)
  turn grain into contour lines.
- **sips gotcha:** `--cropOffset` must PRECEDE `-c` on the command line or it is silently ignored
  and the crop centres itself — two wasted review reads before catching it.

## Reduced-motion verified + island underside clad (2026-07-13)

- **Reduced-motion still-state on `?mode=diorama` PASSES (locked criterion).** CDP
  `Emulation.setEmulatedMedia` with `prefers-reduced-motion: reduce` → two frames 1.5s apart are
  byte-identical; a control page without the emulation churns (frames differ). The still was also
  LOOKED at: full painted sky, lit village, dignified. The freeze path is complete because the
  only clock in the diorama route is `PaintingFlowSky3D`'s ribbon `uTime` (frozen by `uFreeze` +
  the useFrame early-return); the Brush* stage forms are static geometry with no clocks. Evidence:
  `output/playwright/reduced-motion-2026-07-13/` (frames + summary.json); script kept at the
  session scratchpad's `reduced-motion-check.mjs` — worth promoting into `scripts/` if this check
  should join the loop.
- **Island underside (2 passes, `dc12ea1`):** the root was the last smooth unpainted surface.
  Pass 1 re-proved the cypress fur trap on a NEW form: slim downward marks (halfWid ~0.02) with
  0.9 wobble read as a thorny burr at the silhouette, and a rim-start of k=0.03 poked a shaggy
  fringe above the coastline. Pass 2 landed it: SHORT BROAD marks (halfLen 0.09–0.16,
  halfWid 0.03–0.055), wobble halved, offset 0.012, k from 0.07 — reads as painted rock. Two
  transferable rules: (1) the fur trap is about stroke aspect + silhouette stick-out, not about
  which form — apply the broad-mark fix by default on any steep silhouetted surface; (2) let the
  SOLID darken (×0.62) and keep the STROKES carrying the light with a slower melt
  (smooth(0.12,0.75,k) toward abyss) — dark base + lit strokes is what reads as paint at night.
  Extracted `rootPoint(ang,k)` so solid rings and cladding share the exact surface maths — strokes
  hug the shell by construction. Evidence: `output/playwright/underside-2026-07-13-p2/`.
- **Foreground bushes (`BrushShrubs`, 4 passes):** the colour lesson of the session. Bushes built
  from the olive cypress-green family read as KHAKI BOULDERS / dirt mounds against the cool night —
  even at dark values, an all-warm mass is read by hue, not value. Grounding in the reference band
  (`painting.jpg` rows 850–1150) showed Van Gogh's village vegetation is a near-black COOL mass
  with olive AND blue-green strokes scattered through it — i.e. the cypress recipe at bush scale:
  `dark = PALETTE.cypress`, per-STROKE tongue lerp toward `cypressGreen` (60%) or `villageCool`
  (40%), never an overall tint. Per-stroke tongue choice matters: a per-position lerp tints the
  whole form; a per-stroke random scatters glints through the dark, which is the Van Gogh read.
  Rule of thumb: on a cool night stage, warm accents must be SPARSE marks; the moment they become
  the mass, the form leaves the painting. Also: crop + 2× zoom the capture (`sips`) before
  retuning colour — the full frame hides hue drift that the zoom makes obvious. Evidence trail:
  `output/playwright/shrubs-2026-07-13-p1…p4/`.
- **`npm run check:reduced` added** (`scripts/check-reduced-motion.mjs`): the reduced-motion
  locked criterion is now machine-checked (emulated reduce → byte-identical frames; control must
  churn; PASS/FAIL exit code). Run it whenever the diorama route's animation wiring changes.
- **All branches pushed to origin (Mark's call, 2026-07-13).** After ~a month of deliberate
  local-only "gate open" discipline, Mark asked to back everything up to GitHub. Pushed:
  `record/2d-streamline-flow` (the 2D record at `8ccf903`), `sky-brushdab` (active 3D work,
  `42a558b`), and fast-forwarded `main` (`247e816`, docs/UI only). All three now track origin.
  Key point for future sessions: **pushing did NOT change the gate or merge anything** — the 3D
  work lives on `sky-brushdab` as an unmerged branch; the gate is still OPEN awaiting Mark's eye.
  `main` still carries only the 2D-era docs/UI, not the 3D pivot.

## Mark's live gate feedback — sky knit, sparkle calm, cypress edge (2026-07-14)

- **A flat constant fill reads as a ghost column; inpaint colour instead — but colours need
  donor-init.** The wash's flat night-blue in the old cypress cut-out sat darker than the
  surrounding painted sky, so the hole read as a dark ghost beside the 3D tree. Fix: a coarse
  Jacobi-relaxed colour grid (true-sky cells hold the painting, holes relax), same pattern as the
  hole FLOW grid — with one crucial difference: plain Jacobi from a black start needs O(width²)
  iterations to carry COLOUR across a wide hole. The flow grid only tolerates few iterations
  because its vectors are re-normalised to unit length every sample; colours have no such rescue.
  Nearest-donor initialise the hole cells, then relax to smooth. (Donor-init is fine here because
  the fill is only LOOKED at — never integrate against nearest-donor fields.)
- **Chroma-gate what the mask misses — and MEASURE the chroma, don't guess it.** The
  luminance-derived sky-mask claims the cypress's wispy fringes as solid sky, so both wash and
  ribbons faithfully painted tree colour floating in the open sky. One pass was burnt on a guessed
  warm-olive test (caught 0% of the visible blobs); a pixel probe of the actual region showed TWO
  families: warm dark olive (min(r,g) clearly above b) and near-neutral dark grey-green
  (rgb ~17–97, blue failing to dominate). The sky's own darks are always blue-DOMINANT navy, so
  "b fails to clear the warm channels AND dark" is safe there. Rule of thumb: when a colour gate
  misses, dump the actual pixel values before adjusting thresholds.
- **Donors must be solid-sky AND clean-chroma.** Feathered cut-out edge pixels (mask 16–140)
  blend tree browns into the painting texels — donors and direct samples taken there smudge mud.
  The donor gate, the colour-sample gate, and the wash's colour mix all need the same discipline
  (the wash keeps raw mask for coverage/alpha, solid mask only for colour).
- **Sparkle = flecks in shadow + kick peaks over bloom threshold.** The ground's moonlit flecks
  were scattered uniformly, so they read as white scratches on SHADOWED ground; gating the fleck
  probability by moonShade keeps them where light justifies them. The value kick's top (×1.35)
  crossed the bloom threshold and glinted during orbit; ×1.27 keeps the brushwork contrast
  without feeding bloom.
- **A spiky silhouette is usually the MESH, not the strokes: check facet density first.** The
  cypress's saw-tooth edge was 34 angular segments sampling a perfectly smooth tongue curve —
  the curve was never spiky; the sampling was. SEG 72 rounds it for free (tongue() is continuous).
  Compounding: the outward-lick sharpening (×1.7) peaked the crests, and slim pointed marks with
  stick-out fringed the edge with thorns (the underside lesson again — broad marks at silhouettes;
  now also: scale halfWid UP on tongue crests, where marks define the edge).
- Capture-crop recipe reminder that keeps paying: crop + 2× zoom (`sips --cropOffset Y X -c H W`,
  offset BEFORE -c; `-z H W` height-first) before judging any region; full frames hide both hue
  drift and edge character.
- **Fixing the VALUE of a fill is not enough — a smooth patch in a stroke-grained sky reads as a
  texture ghost.** Mark caught it live from an orbit angle the standard captures under-sample:
  the knitted fill was the right colour but blurry, so the tree shape survived as a soft
  silhouette. Fix: emit the fill texture at 4× the relax grid and add real stroke GRAIN mirrored
  in from the nearest clean sky on the same row (grain = painting − its local mean, zero-mean by
  construction, so the relaxed colour still sets the value and mirroring copies brushwork rather
  than smearing colour); plus seed ribbons ~3× denser inside the holes — over the hole they are
  the only brushwork, everywhere else they ride the painting's own texture. Appending the extra
  seeds AFTER the main loop keeps the base geometry byte-identical per seed.
- **Before blaming new code for an at-angle artefact, crop the same view from the untouched
  baseline.** The wispy vertical smearing at the drag boundary exists in the pre-session captures
  too — it is the source projection stretching at its edge, not the fill. The comparison saved a
  retune pass aimed at the wrong target.
- **The bold pass overshot — containment is part of any targeted-stroke design.** Bold hole
  ribbons seeded IN the hole but their longer curved trails escaped it, carpeting clean sky with
  pale kicked strokes: the awkward zone grew WIDER than the hole. Any stroke population that
  exists to texture a region must be clipped to that region (trails stop a few steps past the
  boundary), and value kicks must stay below "reads pale at composition distance" (top 1.12).
- **Runtime synthesis has a ceiling; the painting itself is the asset (DECISION, Mark-approved
  2026-07-14).** Six rounds (value → chroma → grain → density → bold → containment) each
  narrowed the cut-out ghost; none survived Mark's inspection, because generated texture never
  carries Van Gogh's stroke statistics. The approved path is Phase-0-style OFFLINE exemplar
  inpainting (`docs/superpowers/plans/2026-07-14-offline-inpaint-extend-pipeline.md`): bake
  `painting-filled.png` + `signed-flow-filled.png` from real flow-aligned painting patches,
  review as FLAT CROPS before anything enters 3D, then delete the runtime heuristics. The same
  machinery extends the canvas into the side voids (S4). General rule: when a reconstruction
  keeps failing a taste gate, move the problem to where the review loop is cheapest and the
  source material is real.

## Ship hygiene — the reference set was 38% larger than the data required (2026-07-21)

Slimmed `public/reference` from 18.17 MB to 11.20 MB of PNG (shipped payload 19.2 → 12.2 MB)
with **zero pixel change** — no resampling, no quantisation, no format change. All of it came
from two storage bugs in the hand-rolled encoder, not from the data.

- **The encoder was writing filter 0 on every row.** PNG's per-row filters are the entire reason
  it compresses continuous-tone images; without them deflate is left to squeeze raw brushwork.
  Adaptive selection (min-sum-of-absolute-differences, straight from the spec) is most of the win.
- **Every asset carried a constant alpha plane, and the mask carried three copies of one grey.**
  `ihdr[9] = 6 // colour type RGBA` was hard-coded. Detecting the channels actually used drops
  25% of the raw bytes on the colour assets and 75% on the mask. Detected from data, so a future
  bake that genuinely uses alpha keeps it.
- **The header comment that said this was impossible was measuring the wrong thing.**
  slim-flow-field.ts asserted "lossless re-encoding can't help (the data is high-entropy and
  already deflate level-9)" — true of deflate in isolation, false of PNG, because it ignored
  filters and the dead alpha plane. That claim went unchallenged for five weeks and cost ~7 MB.
  **A confident comment explaining why an optimisation is impossible deserves one measurement
  before it is believed** — it is a hypothesis someone wrote down, not a result.
- **Three hand-synced copies of the codec are why the bug survived.** The lib header instructed
  future readers to "keep the two copies byte-for-byte in sync"; a fix would have had to be
  applied three times to count, so it was never applied once. Collapsed onto `scripts/lib/png.ts`
  (−283 lines). Duplication doesn't just risk drift — it raises the price of every improvement
  until improvements stop happening.
- **Prove losslessness in the tool, then verify visually anyway.** `slim-reference.ts` decodes,
  re-encodes, and re-decodes, and refuses to write unless the RGBA round-trips byte-identical —
  so "no visual change" is true by construction, not by inspection. The capture A/B still ran.
- **Establish the noise floor before reading a capture diff.** The A/B showed 300k+ differing
  pixels per view and I nearly chased it. A control — same assets, two capture runs — differed
  MORE (RMSE 1.3e-3 vs 1.9e-4 on `desktop-lookdown`), because the churn is live and the captures
  aren't phase-locked. **A diff against a moving target means nothing without a same-input control
  run.** Cheap to produce, and it converts "looks close enough" into an actual measurement.
- Still on the table, NOT taken: lossy WebP for the three colour assets (painting-filled
  3.94 → 0.83 MB at q90) would roughly halve the payload again, but it attacks precisely the
  high-frequency stroke grain the piece is faithful to. That is Mark's taste call, with a crop
  A/B in front of him — not a silent optimisation.
- **A checklist restated in every pickup note is not a checklist.** The pre-release items were
  copied forward in each session's "NEXT" paragraph while a separate `Backlog` section held a
  different subset; neither was complete, and I answered Mark from my own summary rather than
  either file. Consolidated into one owned table (`PRE-RELEASE GATE`) with an explicit "add items
  HERE and nowhere else" rule, and the old copies replaced by pointers. Same failure as the three
  hand-synced PNG codecs, in prose: **duplicated state drifts, and the duplicate that drifts is
  the one you are reading.** When Mark asks "is this the roadmap?", check the sources before
  answering — the honest answer was that my list was one gate's checklist, assembled from two
  half-lists.
- **Capture RMSE cannot measure any change that alters load timing — including a file-format
  swap.** Converting the colour assets to LOSSLESS WebP (pixels provably byte-identical) produced
  a bigger capture diff than the lossy test it was meant to beat: RMSE 0.0096 on `desktop-centre`
  against a 0.0002–0.0013 same-assets noise floor. Nothing had changed in the pixels; the WebP
  decodes at a different speed, the churn is live, and the screenshot lands on a different
  animation phase. I had already used that instrument to conclude lossy "moves the render outside
  the noise floor" — that conclusion was confounded and is corrected in `tasks/todo.md`.
  **The right instrument for a format change is the decoded pixels, in the browser that will
  decode them**: load both, draw to canvas, compare `ImageData` (Chrome: 0 differing pixels out
  of 2,027,200). Note this refines, not contradicts, the noise-floor lesson above — a control run
  bounds jitter for a SAME-timing change; it cannot bound a timing change.
- **Ask before adding a tool, even a "standard" one.** Lossless WebP needs `cwebp` (Homebrew
  libwebp) — `sips`, which the pipeline already shells out to, cannot write WebP at all. That is a
  dependency beyond the approved list, so it went to Mark rather than being slipped in: approved
  as BAKE-ONLY, never required for dev/build/test/deploy. Recommending an option obliges you to
  surface what adopting it actually costs, not just what it saves.
- **A mixed-format asset set is a result, not a compromise.** Lossless WebP beats our PNG by ~40%
  on continuous-tone paint and LOSES to it on the flow fields (1.61 MB PNG vs 2.10 MB WebP), so
  the colour assets ship WebP and the flow/mask stay PNG. `WEBP_ASSETS` is a measured, named list
  for exactly this reason — "convert everything" would have been slower AND bigger.

## Plan cross-review, two rounds — what surviving it actually took (2026-07-21)

The cypress plan went through two rounds of Mark's cross-review before he was willing to greenlight
implementation. Round 1: 1 P0 + 6 P1. Round 2: 3 P0 + 2 P1. **Every empirical claim in both rounds
was independently re-measured before being accepted, and every one checked out.** Worth recording
what kept going wrong, because the pattern is more useful than the individual bugs.

- **Verify the review, then act on it — performative agreement is as bad as reflexive defence.**
  Re-running each claim cost a few minutes and was worth it every time: it turned "the mask is
  wrong" into "the widest run is 80 px of terrain against a 27 px trunk", which is what actually
  showed the *fix* was also wrong. It also let me hold one position (per-stroke relief is not the
  global attenuation the design rejected) with evidence rather than caving on everything.
- **My repairs were wrong in the same way as the originals, twice.** Round 1: flood-fill mask
  leaks into terrain → I replaced it with "seed the widest run and guard on its width", which is
  worse, because the widest run IS the terrain, so the guard could never fire. The lesson is not
  "check the fix" but **check the fix against the same measurement that condemned the original.**
  I had the row-occupancy data in hand and did not re-run it on the replacement.
- **Plans fail on coordinate contracts, not on ideas.** Nearly every P0 across both rounds was a
  units or frame-of-reference error: raw pixels stored as normalised, normalised advanced by a
  pixel-space vector, a camera assumed on +Z when it sits 25° off, tests asserting the opposite of
  the formula beneath them. The architecture was right from the first draft. **Write the coordinate
  contract down explicitly and test the round-trip, or the plan will read fine and not work.**
- **A gate that does not exercise the real path is decoration.** My first flat gate drew direction
  ticks; the second drew square dots. Neither tested taper, density or the colour path — the things
  that decide fur-versus-flame. The fix was structural: one integrator shared by the gate and the
  runtime, plus writing down in the file what the gate does NOT cover so a pass can't be
  over-claimed later.
- **Internal inconsistency is a smell you can catch yourself.** The plan set a "reduce if vertices
  rise more than 50%" rule and defaulted to a configuration that raised them 83%. Nobody needed the
  repo to find that — it was two numbers in the same document.
- **Diagnostics must import the code they diagnose.** The profile ablation duplicated the runtime's
  formulas, so it could not have verified the fix it was meant to justify; and it compared
  cumulative recipes, which cannot attribute blame. Leave-one-factor-out against one composed
  baseline, through a function both sides import.
- I also got a *diagnosis* backwards while the *code* was right: treating sRGB as linear makes
  midtones display brighter, not darker. Correct fix, wrong reason written into the comments — and
  a wrong reason in a comment is a trap set for the next reader.

## Cypress second pass — source-locked flame, profile-truth failure, measurable gate (2026-07-22)

- **A row domain is part of the texture map, not mask metadata.** The tree occupies 42.9% of its
  176×662 guarded crop and approaches zero width at the tip, so rectangular `u` sampled sky over
  much of the form. Baking the actual interval for every row made `u=0/1` mean the tree's real
  edges at that height. The flat gate and 3D runtime then shared one integrator, which made the
  gate exercise density, flow, clipping, taper and colour rather than draw a reassuring diagram.
- **Reject a numeric gate when optimising it makes the image less true.** The plan's ≥55% crop
  occupancy target was inherited from a bad comparison with the flood-filled mask. The accepted
  width-guarded mask is 49,941 px at 42.9% occupancy and visibly stops at the ground; raising the
  number meant recruiting terrain. The mask overlay and row containment were the meaningful
  evidence. Its 0.406 coherence is from the shipping mask-aware tensor and low-pass path, not the
  old raw 0.134 statistic, so treating those numbers as interchangeable would be false precision.
- **One integrator, two consumers made fur-versus-flame testable.** The flat gate passed on its
  first render: 1,902 of 2,200 long ribbons survived (86.5%), averaging 7.9 of 9 samples. Those
  exact strokes clad the runtime's front; the invented back uses 45% density. Short outward marks
  are still the cypress fur trap. Long coherent paths, not merely an upward normal, make the form
  lick upward.
- **Transparent RGB is data when a later stage samples it.** `cwebp` must use `-exact` for the
  cypress skin or transparent source colours are rewritten even though alpha makes the file look
  lossless. Runtime samples are explicitly tagged sRGB before Three converts them to its working
  space. Relief is constant per stroke and jittered between neighbours; a fade along a ribbon
  would recreate dark stroke ends and read as a vignette rather than impasto.
- **A diagnostic can be shared with production and still have a false target.** The initial
  design-camera ablation was structurally sound and removing the explicit upper taper improved
  mean outline error 0.20726 → 0.20074. The live capture nevertheless retained an hourglass and
  blunt tip because the extracted row profile itself encoded the defect. The shipping continuous
  taper scores worse (0.23760) against that contaminated target and looks materially more faithful.
  Sharing code prevents drift; it cannot make the measurement's definition true. When a metric
  rewards the named visual defect, record the contradiction and let the visual gate overrule it.
- **Source-derived tendrils still need art direction.** Satellite runs were converted to crop-local
  coordinates, connected across adjacent rows with a one-row gap tolerance, rim-assigned from the
  real 64.6° design bearing, and capped at two upper-third tracks. The second retune exposed them
  but read as thorns; the third eased them over their full height, lengthened the short track and
  used warmer source interior colour. The result breaks the top rim without becoming a fringe or
  a second tree. Three retunes were used, within the cap of four.
- **Budget the complete presentation pipeline.** Actual cypress cladding is 43,700 vertices and
  38,158 triangles (+102.3% / +165.0% over the old cladding), so the plan's static growth threshold
  was not a useful gate. The final 1600×900 local pipeline measured 8.33 ms mean, 9.0 ms p95 and
  9.4 ms max over 599 frames; no-post measured 8.33 / 8.8 / 9.4. These are deterministic desktop
  figures, not representative mobile hardware: the locked real-device 30 fps gate remains open.
- **Name a colour fallback honestly.** Exact rendered/source registration was not practical in
  this pass, so the check compares masked regional Lab distributions, not corresponding pixels.
  Mean ΔE76 was 0.89 base, 0.66 middle and 2.13 top, all below the locked tolerance of 10. That is
  useful evidence that global attenuation is gone, but it is not a per-pixel colour-fidelity claim.
- **Mechanical state of this now-rejected implementation:** 97 tests passed; lint, production
  build and reduced-motion passed. Mark's source comparison then rejected the result. Mechanical
  closure only hands work to the visual gate; it cannot close the painterly gate on its behalf.

## Cypress compound correction — the original/live gate overruled a mechanically green pass (2026-07-22)

- **Do not present authored visual work without looking at it beside the source.** The first
  implementation passed its flat metric, tests, colour distribution and timing gate, yet Mark's
  immediate source comparison correctly rejected it as a black furry spear. Mechanical closure
  only earns entry to the visual gate; it is not visual evidence.
- **A source mask can contain the missing topology even when the runtime throws it away.** The
  baked satellite runs retained two persistent, rim-adjacent paint tracks. The upper-third-only
  tendril filter demoted them to decoration around one synthetic solid. Tracking them across rows,
  rejecting runs beyond three primary-rim half-widths and compiling the survivors as their own
  closed lobes recovered one main flame plus two real side flames. The flat lobe gate also caught
  distant dark sky strokes before they became absurd branches.
- **Preserve pixel aspect explicitly.** `sourceToWorld` was still inherited from a viewport-scale
  constant: the 176×662 crop rendered at width:height 0.187 instead of 0.266, squeezing every
  source lobe about 30% into a gothic needle. The correct mapping is simply
  `HEIGHT * cropWidth / cropHeight`; a source-derived silhouette with the wrong aspect is not a
  source-faithful silhouette.
- **When the painting is already the asset, project it instead of rebuilding its statistics.**
  Thousands of procedural ribbons repeatedly produced fur, tiles, bark and finally evenly spaced
  waves. Giving the closed lobe skin source UVs restored the actual green/umber/sienna field and
  its irregular vertical strokes in one step. Geometry and paint domains stay separate so a broad
  flame envelope can stretch detected pigment without sampling adjacent blue sky.
- **Relief should support the painting, not redraw it.** Even 240 long accents visibly regularised
  the source texture. Forty-eight front and nine mirrored back accents retain shallow impasto and
  orbit depth without becoming the dominant mark system. The resulting cypress totals 2,210 solid
  vertices / 3,936 triangles plus 4,902 relief vertices / 4,788 triangles.
- **Current evidence, still Mark-gated:** displayed regional mean ΔE76 is 0.91 / 1.98 / 2.05
  (base/middle/top); the desktop final pipeline is 8.33 ms mean, 9.0 ms p95 over 599 intervals;
  nine runtime captures report zero errors; 96 tests, lint, build and reduced-motion pass. The
  matched source/live crop is `output/playwright/cypress-compound-final-2026-07-22/original-vs-live.png`.
