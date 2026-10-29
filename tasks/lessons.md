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

## Authored night balance — remove the wash before adding a grade (2026-07-22)

- **A liked screenshot can identify the mechanism, not just the mood.** Mark's darker comparison
  measured almost identically to the existing no-post render. A four-way view (his screenshot,
  no-post, selective Bloom, and selective Bloom plus grade) showed that entering the composer path
  lifted the pale ribbon field across the whole sky. The desired contrast was already authored.
- **Do not grade around a post-processing ownership error.** A stronger display-domain grade made
  the bloomed version moodier, but it also crushed the village and biased the cypress darker. The
  structural fix was to remove full-frame Bloom from the diorama. Existing additive moon and star
  halo sprites remain readable and luminous without it, satisfying the original visual contract.
- **A colour heuristic can become pipeline-dependent.** The cypress distribution check originally
  used one broad screen rectangle plus `treeishColour`. With Bloom removed, dark cobalt sky around
  the narrow tip passed that heuristic and doubled the sampled top pixels, reporting a false
  ΔE76 10.47. Stencilling first with the source cypress alpha reduced the accepted authored result
  to 0.85 / 0.70 / 3.62 (base/middle/top). It remains a regional comparison, not registered
  per-pixel evidence.
- **Current local evidence, still Mark-gated:** nine captures report zero errors; desktop final is
  8.33 ms mean / 9.1 ms p95 over 599 intervals, and the desktop no-post control is 8.33 / 8.9 ms;
  96 tests, lint, production build and reduced-motion pass. Evidence lives at
  `output/playwright/night-balance-authored-2026-07-22/` and
  `output/playwright/night-balance-authored-perf-2026-07-22/`.

## Judge a silhouette on a silhouette, not on a shaded render (2026-07-22)

Reviewing Codex's compound cypress against the painting, I called the silhouette "not fixed" and
named flat sawn-off tops on the side lobes as the defect that made the tree read as splintered
timber. Mark disagreed — it is closer than that — and he was right.

- **The defect I named was not in the geometry.** Thresholding both crops to bare silhouettes
  (`output/review-2026-07-22/sil-compare.png`) shows the left lobe tapering to a clean point. What
  looked truncated was shading on its near face. **I attributed a texture artefact to geometry,
  which is the same class of error as reading a colour problem off a bloomed capture.** Isolate the
  variable before naming the cause: for shape questions, threshold to a mask; the shaded render
  answers a different question.
- **Absolute and relative readings are both valid and must be labelled.** I judged against the
  painting (not there yet); Mark judged against the previous implementation (much closer). Both
  were true, and stating only the absolute one made a real advance sound like a failure. Say which
  frame the verdict is in.
- **What survived the correction, narrower than the original claim:** the outline runs in straighter
  segments than the painting's curved tongues, and the source paint is visibly stretched into
  unbroken vertical bands over the lobe skin. The topology — main flame, left secondary at the right
  height, right tongues, base widening — genuinely matches the painting now.
- **A defect list is a claim, and gets the same standard of evidence as a fix.** Being the reviewer
  is not an exemption from verification. I ran tests, build and captures before commenting, then
  spent that credibility on an unverified read of a shaded image.

## The reviewer's bar is not the owner's ship bar (2026-07-22)

The cypress second pass went to Mark's gate with three findings from me: a measured local-contrast
gap on the skin (2.01 against the painting's 6.45), straighter silhouette edges than the painting's
curved tongues, and a scoping question about Bloom. I framed the first as "the one substantive
defect remaining." Mark's answer was *"those findings are minor"* — gate passed, pushed, move on.

- **Rate findings honestly, then let the gate decide — but do not dress a refinement as a blocker.**
  Nothing I reported was false by then (the false ones had already been withdrawn). The error was
  weighting: a 3× local-contrast difference is real and is also invisible to anyone who is not
  measuring it, on a form whose colour, stroke length and topology now match the painting. Taste
  calls are Mark's, and "measurable" is not the same as "matters".
- **Withdrawn claims cost more than missed ones here.** Two of my defects were artefacts of how I
  looked — a shaded render, a 3× blow-up — and one was the diorama contract working as designed.
  Each one spent credibility that the genuine finding then had to borrow back. Verify at true scale
  before naming a defect, not after being challenged.
- **Diminishing returns arrive earlier than the metric suggests.** Three named gaps went in; two
  were closed outright and the third moved from "bulbous" to "topology matches, edges a bit
  straight". That is a pass. Continuing to hunt would have been the reviewer optimising a number
  rather than the piece.
- **Keep the residue findable, not open.** They live in
  `tasks/2026-07-22-cypress-review-findings.md` with the eliminated hypothesis recorded, so if the
  contrast ever does start to matter nobody re-runs the mip-filtering test. Recorded ≠ outstanding.

## Authored middle-ground night balance — lift midtones without lifting black floor (2026-07-22)

- **Middle-ground target sits perceptually between bloomed wash and dark no-bloom.** The old bloomed render (`cypress-compound-final-2026-07-22`) was washed out with an elevated black floor (luminance 65.47), while the initial no-bloom render (`night-balance-authored-2026-07-22`) was judged too dark. Mark's decision set the target roughly one-third of the perceptual distance from current back toward the old bloomed version.
- **Diagnosis of authored controls that lift midtones while preserving shadows:**
  - Sky wash multiplier `vec3(0.67, 0.79, 1.0)` and alpha `0.68` (in `washFrag`) + ribbon brightness `(0.52 + 0.40 * combinedFlow)` and `uOpacity` multiplier `1.46` (in `ribbonFrag`) + sky gradient scalar `0.64`/`0.74` lift sky midtones by ~8.5-11.2%.
  - Foreground material base values (village `HOUSE` 1.28, `ROOF` 1.32, `CHURCH` 1.65, `litColor lo = 0.44`, wall/roof cladding kicks) + island top (`topBase` 1.88, `hillDark` `#284260`, `hillMid` `#477594`, `hillLit` 2.72, top strokes `0.71 + 0.62 * rng()`) improve midtone separation by ~8-9%.
  - Island underside root base (`0.70`), `rockLit` (`1.38`), and root strokes (`0.72 + 0.7 * rng()`) prevent the underside from feeling crushed (Lum 55.06 vs 50.85) while keeping a near-black base (keel abyss 0.07).
  - Authored additive moon/star halos strengthened (moon scale 4.25 / opacity 0.68, star scale 1.48 / opacity 0.74) so halos radiate into the cobalt sky.
  - Deep cobalt background floor is completely preserved (Lum 14.52 vs 14.49, vs old bloom 65.47). Cypress green/umber/sienna color and topology preserved (regional Lab ΔE means: base 0.92, middle 0.77, top 3.17, all < 10).
- **Candidate evaluation:**
  - Candidate 1 (Conservative): +5-8% lift (Sky Lum 67.38, Village 82.42, Island Top 70.65, Underside 52.86). Proved too subtle to reach the perceptual 1/3 target.
  - Candidate 2 (Moderate/Recommended — CHOSEN): +8-11% lift (Sky Lum 73.53, Village 87.51, Island Top 74.96, Underside 55.06). Reached Mark's visual gate.
- **Evidence & Performance:**
  - Main captures: `output/playwright/night-balance-middle-2026-07-22/`
  - Perf report (`output/playwright/night-balance-middle-perf-2026-07-22/perf-summary.json`): desktop final p95 9.1 ms (mean 8.33 ms over 599 frames), desktop no-post p95 8.8 ms, mobile viewport p95 9.1 ms; 0 errors.
  - Verification: 96 tests pass (`npm run test:sky`), `npm run lint` clean, `npm run build` green, `npm run check:reduced` PASS (bytes identical), `check-cypress-colour` passed (base 0.92, middle 0.77, top 3.17).


- 2026-07-22 — Village painterly pass (checklist item 8), five lessons from S0–S5:
  1. **Uniform scatter at painting density is fur — again.** Raising cladding 230→700/area with
     random placement dissolved the gable silhouettes exactly like the cypress's short-mark fur.
     What fixed it was STRUCTURE, not less density: marks quantised into courses (rows across the
     stroke axis, the way Van Gogh lays wall/roof strokes) plus face-hugging proud offsets
     (0.002–0.005, down from 0.006–0.011). Rule: when density turns to fur, organise the marks
     before cutting their number.
  2. **"Absent" and "dim" are different defects — zoom before retuning.** The painted windows
     vanished and pass 2 wasted a retune brightening them; a 4× crop showed them ABSENT, not dim.
     Mechanism: `pushBrush` fans wind clockwise re the +normal, every other consumer's material is
     DoubleSide, and the windows mesh was FrontSide — fully culled. Any new consumer of the brush
     kit needs DoubleSide or reversed winding. Diagnose presence before value.
  3. **Median cut cannot isolate a low-population family on a different axis, at any count.** The
     sienna roof (~4% of warm pixels, red-dominant) folded into umber at 4, 6 and 8 swatches —
     the splits keep landing on the widest (olive-gold) axis. Stratify by the property that
     matters (r−g > 12), cut each stratum, rescale weights over the union.
  4. **Frame a metric against what the render actually shows.** The plan's "spire mean ≤ 120"
     target assumed the painting's background (sky at ~85); our spire stands against the moonlit
     hill (~174), so absolute equality would have carved a dark silhouette the painting doesn't
     have. The RELATIVE criterion (spire-vs-sky delta ±8, painting −0.37, landed −4.3) was the
     faithful one. Check what sits behind a region before adopting its absolute value as a target.
  5. **The master insight that shaped every slice: the painting's warmth and pale church are HUE
     statements inside one nocturne value band.** Measured: orange roof rgb(65,47,46), window
     blobs rgb(127,124,35), spire at its background's exact value. Everything that worked added
     hue and drawing (ink contours, umber weave, sienna landmark, ochre daubs); the one thing
     that came DOWN was brightness (church ×2.05+white → ×1.05). Warm ≠ bright in a nocturne.

- 2026-07-22 (evening, after the village gate) — the night lift + the moon, five lessons:
  1. **A grade upstream of a gain can neutralise it — check the pipeline order before turning the
     dial.** Notching the sky's highlight gain 37% (0.38→0.52) moved the sky mean by **+1.6**. The
     wash's night grade `×(0.67,0.79,1.0)` was sinking the band ~22% BEFORE the lift's smoothstep
     keyed on it, so the ramp barely engaged. Softening the grade to `(0.74,0.84,1.0)` and keying
     the lift on the TRUE source paleness moved it +8.2 in one pass. When a dial barely responds,
     stop turning it and look at what runs before it.
  2. **The vortex anchor is not the painted body — the 07-16 star-guard trap, second occurrence.**
     `MOON_UV` (0.85,0.16) in `skySwirls.ts` anchors the moon's CIRCULATION; the painted moon's
     bright-warm centroid measures uv(0.8987,0.1697) — 78 px away. The authored crescent sprite
     sat on the anchor and read as a second moon beside the painting's own (Mark: "mismatched").
     Rule, now twice paid for: **any authored overlay registered to a painted feature takes its
     position from measured pixels, never from the SWIRLS table.**
  3. **When the source starts supplying what an authored layer was faking, delete the layer.** The
     flat crescent sprite existed because bloom left the source moon flat; once the highlight lift
     brightened the painted disc, the sprite became a duplicate. Same family as the S3 inpaint
     lesson (fix the input, delete the compensations) — **a compensation outlives its cause
     silently**, and only looking catches it. Deleting it left the painting's own crescent-in-disc
     as the moon, with authored layers supplying only the glow paint cannot emit.
  4. **Isolate the variable when comparing two states.** For the bloom before/after I first used
     `slim-after-2026-07-21` as "before" — it predated the cypress rebuild, so it differed in TWO
     ways. Mark supplied his own screenshot (current cypress + bloom), the honest control. The
     verdict did not change (sky mean 130.2 vs my 130.7) but the comparison's standing did. A
     baseline must differ only in the thing under test.
  5. **Bloom removal and brightness are different questions; answer them separately.** Removing
     bloom was right — it had destroyed the cobalt floor (2.7% deep-night vs the painting's 17.1%).
     But the resulting tune then undershot the painting's luminous mass by about as much as bloom
     had overshot it (4.6% vs 11.6% vs 15.1%). **Starry Night is not a dark painting; it is a
     high-contrast one**, carrying more darkness AND more light than either of our states. The fix
     was authored brightness keyed on the source's own paleness — stars, swirl band, painted
     window glow-bleed — not the return of a post pass. Approach the painting from the dark side:
     light can be added where the painting has it, but a wash cannot be un-mixed.

- 2026-07-22 — **An inherited note is not evidence: verify branch/deploy state before repeating it.**
  Both `tasks/todo.md` and the vault carried "`main` still carries only the 2D era", and I repeated
  it several times tonight without checking. Mark caught it. Verified truth: `main` (`247e816`,
  06-20) holds the JUNE VORTEX-DOME era — `SkyDome` + the blocky/lathe `Diorama` — and predates
  `LivingPainting`/`StreamlineSky` entirely; the 2D era is on `record/2d-streamline-flow`
  (`8ccf903`, 06-24); the piece is on `sky-brushdab`, 167 commits ahead of main. Wrong twice over.
  Two things worth carrying: (1) **claims about repo/deploy topology are cheap to verify and
  expensive to get wrong** — `git ls-tree`, `git merge-base --is-ancestor` and a grep for a marker
  symbol settle it in one command; (2) the error had a live consequence hiding in it — `main` also
  carries the June `vercel preview deployed` commit, so any deployment still pointed at `main`
  would publish the vortex dome rather than the gated piece. **A stale fact in the record can
  become a shipping mistake**; this one is now flagged against checklist item 4.

- 2026-07-27 — **For the fact that decides whether an action publishes, query the API — don't read
  the tea leaves.** The record had reasoned that a CLI-shaped `.vercel/project.json` plus a
  CLI-run June deploy meant a CLI-only project, so moving `main` "probably" published nothing.
  `vercel project inspect` seemed to confirm it — no git section in the output. All of that was
  circumstantial, and all of it was wrong: `GET /v9/projects/{id}` returns
  `link: {type: "github", productionBranch: "main"}`. Pushing the moved `main` **is** the
  production deploy. Two things carry: (1) the CLI's *absence* of a field is not the API's
  absence of the fact — v54 simply doesn't print the git section; the `-git-main-` alias in the
  domain list was the visible tell I under-weighted; (2) a project being git-connected and being
  CLI-deployable are not exclusive, so "the June deploy was a CLI run" was never evidence for
  anything. Same family as the 07-22 branch-topology error: **topology claims are cheap to verify
  and expensive to get wrong.**
- 2026-07-27 — **"All build work is done" was true of the painting and false of the product.**
  Three gates' worth of painterly work closed, and the checklist read 4-of-8 with nothing left for
  Claude — but nobody had opened the shipping route and looked at the DOM. `mode` defaults to
  `diorama`, which returns early from `App.tsx`, so the entire visitor dock (pause, **Show
  original**, fullscreen) and the Van Gogh / Mark Ma attribution card — all sitting in the
  fallback branch *below* that return — never render for a visitor. The a11y snapshot of `/` is
  `- main [ref=e3]`: one element, no controls, no credit. Mark found it from memory of a feature,
  not from the record. **A gate that only ever looks at captures cannot see a missing button** —
  the visual-review discipline photographs the canvas, and the canvas looked perfect. Add a DOM
  read to the pre-release pass, not just a picture.
- 2026-07-27 — **The layout bug was invisible to every check except looking at it.** Item 9's port
  passed lint, 96 tests, build and `check:reduced`, and the desktop capture looked right. On a
  390 px phone the dock was clipped off BOTH edges and the placard covered half the frame. Cause:
  the pre-existing mobile rule centred the dock with `left:50%; transform:translateX(-50%)`, which
  turns "too wide" into symmetric clipping rather than a visible overflow — and nothing had ever
  rendered that dock at phone width on the shipping route before. Two things carry: (1) **centring
  hides overflow**; span-and-wrap fails visibly and safely instead, (2) once a picture named the
  defect, `getBoundingClientRect` across 360/390/430 in both motion states was the cheap way to
  prove the fix — **look to find it, measure to close it.**
- 2026-07-27 — **Establish the jitter before calling a diff a regression.** Comparing the
  post-change capture to the 07-22 gate baseline gave RMSE 0.0029 on desktop-centre, well above the
  0.0002–0.0013 noise floor the record quotes — which looked like the chrome had disturbed the
  render. It had not: two runs of the *same* code differ by 0.0029 too, because the sky is
  advecting and captures land on different animation phases. Baseline-vs-after was actually
  0.00014. **A noise floor quoted from another pass is not this pass's noise floor** — the control
  run costs one command and turns an alarming number into a null result.
- 2026-07-27 — **Playwright's `page.screenshot` stalls on an always-animating canvas; raw CDP does
  not.** Repeated timeouts ("waiting for fonts to load… fonts loaded", then nothing) blocked the
  visual check. `capture-diorama.mjs` sidesteps it by grabbing `canvas.toDataURL()`, but that can
  never show DOM chrome. The tool that works for full-page-with-chrome is CDP
  `Page.captureScreenshot` driven over a websocket, with `--force-prefers-reduced-motion` to still
  the scene. Script kept at the session scratchpad's `capture-chrome.mjs` — worth promoting into
  `scripts/` if visitor chrome gets checked again.
- 2026-07-27 — **Do not diagnose visitor-facing browser features in the agent browser.** "Fullscreen
  doesn't do anything" cost a full systematic-debugging pass; the answer was that the automation
  browser refuses the request while Mark's ordinary Chrome profile honours it. Everything measured
  said the code was sound — Playwright reported `fullscreenElement: HTML` with the label flipping,
  a clean headed Chrome grew the viewport 1200x713 -> 1512x949, and a *maximised* one (the condition
  Mark was actually in) grew 787 -> 949 with the canvas following. The gap was never in the code:
  it was the browser doing the looking. Two things carry: (1) **APIs gated on user gesture,
  permission policy or window management — fullscreen, clipboard, pointer lock, notifications,
  autoplay — are exactly where an automated context diverges from a visitor's**, so confirm them in
  a real profile before believing a bug report or a green test; (2) the divergence was only
  *diagnosable* because the silent `.catch(() => undefined)` was replaced with a warning first
  (`baec2ad`) — **a swallowed error makes "the browser refused" and "the button is broken" the same
  observation**, and that is the defect worth fixing whether or not it explains the symptom.
- 2026-07-28 — **A framing metric that counts landmarks cannot see an empty frame.** Item 2's
  candidates were designed against "are moon / cypress / whorl / steeple inside the frame", and the
  first set scored perfectly — all four held at every phone aspect, generous margins. The captures
  showed why that was worthless: 39–51% of each frame was flat background, because a portrait frame
  is TALLER than the painted world and outruns it at both ends (the sky's top edge and the island's
  keel both fall inside it). The metric's own logic made it worse — widening fov to buy landmark
  margin buys void faster than subject, so the "safest" candidate (fov 100) was the emptiest at 51%.
  **Add the negative space to the measurement, not just the subjects**; `sky-top.y` and
  `island-keel.y` turned an invisible defect into two numbers. Same family as the 07-27 missing-dock
  lesson: the check looked at what it expected to be there.
- 2026-07-28 — **Calibrate a defect list against the gate-passed state before fixing anything.** I
  had "empty area below the island" at the top of the portrait defect list and spent a pass
  designing it out. Opening the gate-passed desktop capture (`moon-fix-2026-07-22-p2`) settled it in
  seconds: the island floats in exactly that dark, and Mark passed it. Only the flat band ABOVE the
  sky is unpainted background. **A capture that already passed a gate is the cheapest possible
  control for "is this a defect or the design"** — and I nearly spent the retune cap removing an
  authored look.
- 2026-07-28 — **With OrbitControls, "aim higher" means "move the camera higher".** The fix for the
  bottom void looked obvious — raise the target so the island sits on the bottom edge. It worked
  numerically (bottom void 18% → 0%) and produced a plan view of the village, because polar is
  measured FROM the target, so raising the target lifts the camera with it and the level look now
  stares down at the island. Tilting up instead of rising needs polar > 90°, and
  `maxPolarAngle` 1.62 rad (92.8°) allows only 2.8° of it. **Target height and camera height are
  the same lever here** — the only real ways to fill a tall frame are fov and distance.
- 2026-07-28 — **The shipped portrait camera never rendered as authored.** `DIORAMA_CAMERAS.mobile`
  asks for position (0.72, 1.18, 9.2) — distance 9.18 from its target — and `DIORAMA_ORBIT.maxDistance`
  is 5.6, so OrbitControls' first `update()` silently pulls it to 5.6. The "wider/farther mobile
  camera" recorded on 2026-06-15 is a third closer than intended, which is why portrait lost the
  cypress AND clipped the moon on every modern phone aspect while the record claimed it held the
  cypress. **An authored camera outside the orbit envelope is a wish, not a setting** — state
  portrait poses as azimuth/polar/distance so the envelope is visible in the numbers.
- 2026-07-28 — **In portrait, the moon costs a letterbox band; measured, not guessed.** Across a
  ~30k-pose search (fov × distance × target × azimuth) at the worst phone aspect, ZERO poses hold
  the moon without flat background at the top — it sits high enough that reaching it pushes the
  frame past the painting's top edge. The cypress has no such cost: a full-height cypress with the
  sky filling the frame edge-to-edge exists at fov 62 / az 27.5°. So the portrait trade is not
  "how much moon" (the inherited framing of item 2) but **which anchor you keep** — they sit at
  opposite ends of a landscape painting and a phone reaches one or the other.
- 2026-07-28 — **Mark chose the letterbox over the filled frame.** Given three portrait framings —
  A (sky filling the frame edge-to-edge, biggest paint, no moon), B (moon, no cypress, ~13% band)
  and C (everything held, ~19% band, smallest paint) — the call was C without hesitation.
  Calibration worth carrying: **completeness of the composition beat impact of the paint.** My own
  read had ranked A the most striking image; the owner's bar is that the piece must still be
  *Starry Night*, and Starry Night has both the cypress and the moon. When a trade is between "more
  beautiful crop" and "the whole subject", expect the whole subject to win here. Same direction as
  the 07-22 calibration (his ship bar differs from my review bar) but on the opposite axis: there
  he accepted less than I wanted, here he accepted a visible flaw to keep the composition intact.
- 2026-07-28 — **A correct bug report can still be a half-diagnosis; fix the named cause, then
  RE-MEASURE.** Codex reported that rotating an open page never switched camera, and named the
  cause exactly: `isPortrait` read `window.inner*` during render without subscribing to canvas
  size, so `Scene` never re-rendered. That was true and the fix (`useThree().size`) was right —
  and the transition still failed. A second half was hiding behind it: `PaintingFlowSky3D` latched
  `initialCameraInverse` from the FIRST rendered frame, so once the camera did follow the resize,
  the sky was still keyed to the previous orientation — camera right, sky ~21° off, moon clipped
  at the edge. Byte sizes told the story the report could not: 740432 vs 416304 before the first
  fix, 422942 vs 416304 after it, 416304 vs 416304 after the second. **Had I stopped when the
  reported cause was fixed, I would have shipped a portrait that looked nearly right and dropped
  the moon** — the one thing candidate C was chosen for.
- 2026-07-28 — **"Latch it on the first frame" is a hidden dependency on load order.** The sky's
  home orientation was captured from whatever the camera happened to be on frame 1, which is
  correct exactly once and silently wrong after any camera change. Replacing it with a value
  DERIVED from the active camera spec (`Matrix4.lookAt`, camera convention) removed the ordering
  dependency — and reproduced the old behaviour **byte-for-byte** on a fresh load in both
  orientations under reduced motion, so it was a strict improvement rather than a trade. The
  derivation is only equal to the live camera while the pose sits inside `DIORAMA_ORBIT` and is
  never clamped — which the envelope test added earlier the same day now guarantees. **Two changes
  that looked unrelated turned out to be one invariant.**
- 2026-07-28 — **A test that pins constants cannot catch a live failure.** `diorama-layout.test.ts`
  asserted the portrait camera's numbers and passed happily throughout the whole resize bug: the
  constants were right, the wiring was not. The failure only exists in a browser that has been
  resized without reloading. `npm run check:viewport` captures a fresh load and a rotated one under
  `prefers-reduced-motion` (which makes them comparable pixel-for-pixel instead of through a noise
  floor) and requires them identical. **Checked it FAILS on the broken code before trusting it** —
  it reported DIFFERENT on both transitions pre-fix, so it is not vacuous.
- 2026-07-28 — **The rotation gap turned out to hide a defect that had nothing to do with rotation.**
  Extending `check:viewport` to assert visitor-chrome geometry was meant to prove that media queries
  re-evaluate on resize (they do). What it actually found was the **original placard covering the
  title on a phone in LANDSCAPE (844×390) — on a FRESH load, no rotation involved.** Cause: 844px is
  wider than the 640px phone breakpoint, so a landscape phone takes the *desktop* chrome rules in a
  window with no vertical room; the placard is sized off the long axis (`min(300px, 100vw - 32px)`)
  and grew to ~254px tall in a 390px-tall frame. Item 9 had verified the chrome at 360/390/430 —
  all **portrait** widths — so the short-viewport case had never been laid out at all. Fixed with
  `@media (min-width: 641px) and (max-height: 520px) { width: min(300px, 38vh) }`, sizing it from
  the short axis. Two things carry: (1) **a breakpoint on width alone cannot describe a phone**,
  because the same device supplies both a 390px and an 844px viewport; test the short axis
  explicitly, (2) **the check you write to close a suspected gap is worth running even when you
  expect it to pass** — the value was not the rotation assertion but the five viewports it forced
  me to enumerate.
- 2026-07-28 — **Retiring the staging branch moves safety from structure to discipline.** With
  `sky-brushdab` gone, `main` is both the working branch and the deploy trigger, so the thing that
  used to make "commit freely, push as backup" safe no longer exists — a casual push now publishes.
  The merge itself was risk-free (verified `main` and `sky-brushdab` were the same commit before
  deleting, so no commit could be lost, and the branch is recreatable with `git switch -c`), but the
  *habit* it protected was not. Worth carrying: **when a branch is deleted, the instructions that
  referenced it become traps, not just staleness.** README, `tasks/todo.md` and the vault's pickup
  note all told the next reader to work on a branch that no longer existed; each was corrected in
  the same change rather than left for the next session to trip over.
- 2026-09-24 — **An API filter that returns the same answer for both values has proved nothing.**
  The public-repo security audit tried to confirm Vercel's Git Fork Protection by listing projects
  with `gitForkProtection=1` — the project came back, which looked like a yes. Asking again with
  `=0` returned it too, so the filter was being ignored and the "yes" was an artefact. **Always run
  the negative case before trusting a filter as evidence.** Same shape as the 07-28 lesson about
  checking that `check:viewport` FAILS on broken code: a check you have never seen say "no" is not
  a check.
- 2026-09-24 — **A byte-identical bundle hash is the cheapest proof that a dependency bump is
  inert.** `npm audit fix` moved 11 transitive packages, two of them nominally `[prod]` (`colord`
  via leva, `fflate` via three-stdlib). Rebuilding produced the same `index-RuY3F0pE.js` as the live
  site, which settles it: leva is aliased to a stub in production and fflate's unzip path is
  tree-shaken, so neither advisory ever reached a visitor. Classify `npm audit` hits by what the
  built bundle contains, not by the lockfile's `dev` flag.
- 2026-09-24 — **Cloud sessions run as root, and headless Chrome refuses root without
  `--no-sandbox`, which this environment's permission guard blocks.** So `check:reduced` and
  `check:viewport` cannot run in a cloud session; they are Mac-local checks. When a change leaves
  the production bundle byte-identical, say so and hand the two browser checks to Mark rather than
  reporting the suite as green.
- 2026-09-24 — **A ruleset with no target is saved but protects nothing.** Mark built the `main`
  ruleset in the GitHub UI and got "This ruleset does not target any resources and will not be
  applied": rules and target branches are separate sections, and a ruleset starts with no target.
  Fix: Target branches → Add target → Include default branch (API: `conditions.ref_name.include:
  ["~DEFAULT_BRANCH"]`). The branches API's `protected` flag DOES reflect a ruleset — it flipped
  `false` → `true` for `main` once the target was set — which gave a no-push way to verify it.
  Also carried: **leave the bypass list empty.** Agent sessions push with Mark's credentials, so an
  admin bypass would exempt every agent too, and the ruleset would guard nothing.

## Village authored study — 2026-10-05 (local; Mark's taste gate pending)

- **Identity needs an authored relationship between forms.** Replacing the central church and
  four neighbours as one composition made the oblique nave, low belfry, long spire, overlapping
  eaves, sienna roof and striped foreground roof legible. A palette pass alone left the repeated
  gable caps intact. Lead owned these visual decisions; Worker only captured and checked;
  Reviewer supplied peer critique. Sky motion and camera were held fixed.
- **The paint medium matters in the village too.** R1's repeated procedural roof/wall strips read
  as clapboard and barcodes. Source-derived paint on the actual closed 3D faces carries the
  painting's texture. The atlas uses explicit pixel quads from the original high-resolution scan;
  contours and openings are separately anchored to each geometric face. This is a local study,
  not an accepted replacement or a reason to texture-project the whole village.
- **Cladding and underpaint must describe the same surface.** A slightly twisted roof's two flat
  underpaint triangles pierced its bilinear textured grid. Sharing the same grid fixed that.
  Tangent-plane tree ribbons similarly cut through curved troughs: both width edges must map
  through the tree surface, with enough longitudinal samples and lift. A buried rim must follow
  the actual terrain around the footprint, not only the ground under its centre.
- **Source sampling still needs a brush-scale judgement.** Stretching a narrow plaster/roof
  sample across a long face smears it. Mirrored subdivisions along the eave restored scale, but
  eight repeats of a tiny roof patch made regular fluting and repeated source borders made a
  frieze. R4 uses the full church roof quad (three repeats; narrowing at the ridge is an accepted
  study tradeoff), and a plaster sample excluding the blue borders. Inspect both axes and the
  near view, not just atlas resolution or centre thumbnails.
- **Increasing mark width is not the same as finding the medium.** R3's thin tree scratches
  became broader blue-green crescents in R4. They still read as flat procedural marks beside the
  sampled architecture. That is a visual reservation, not a test failure to tune away with more
  random detail. The fourth authored pass reaches this slice's retune cap; show the evidence to
  Mark before further craft or expansion. The old island coast's saw-tooth edge remains a separate
  residual; this slice did not change its geometry.
- **A DEV flag needs candidate-specific evidence.** The existing reduced-motion and viewport
  scripts construct the default URL. Passing them does not exercise `villageStudy=authored`;
  mechanical scratch copies append the flag while retaining the assertions. Default preservation
  is measured separately with paused same-camera PNG comparisons. Production JS excludes the
  study module, but Vite still copies its public atlas into `dist/reference`; a future release
  decision must account for that asset.
- **Capture labels are not camera measurements.** The old `lookdown` drag moved towards ground
  level. The final matrix adds an opposite-sign vertical drag and checks the resulting high view.
  These remain documented input probes, not a claim to have read camera matrices. Rebuilding a
  public atlas during HMR also requires a full browser reload; fresh isolated captures avoid the
  stale-image/new-UV combination. Blender inspection is exported from runtime geometry, with
  textures packed in the final `.blend`, so it cannot silently become a second layout.

Plan, disposition and gate record: `tasks/2026-10-05-village-study.md`. Local captures and review
page: `output/playwright/village-study-2026-10-05/`.

- **Mark's object reading outranks a mechanically sound proxy.** At the R4 taste gate he read the
  foreground tree mass as a little hill in front of the church. That was accurate: its height,
  pale blue marks and single mound silhouette contradicted the painting's low, dark horizontal
  band and hid the church base. The peer-confirmed R5 response removes the failed front mass
  without disturbing the architectural paint or the back band's seeded sequence. The resulting
  open gap must be judged in the actual scene; deletion is not proof of a finished foliage medium.


## Village foliage — source-painted rows, 2026-10-05

- **The source paint needs a matching silhouette.** A low connected row traced through actual
  brush crests works where a smooth dome with synthetic pale chevrons read as a hill. The dark
  front band passed a five-view falsifying probe before the lighter back row was built. Short
  separately sampled tops and closed ends retained volume under orbit; the high-angle hedge/rope
  reading and near softness remain explicit taste residuals, not hidden by green geometry tests.
- **Check composition against the painting and the camera, not an inherited sentence.** Reviewer's
  original “below the nave roof, as the painting has it” premise was wrong. The actual crown band
  rises above neighbouring roofs. Its projected crest and matching horizontal/vertical source scale
  prevented spending a rendered pass on foliage hidden behind the houses. The correction was made
  before construction and confirmed independently; original source contour remained unchanged.
- **Preserve accepted work at the buffer boundary.** The F1 front row remained an exact prefix when
  the back row was added. Architecture matched an isolated F1 export with only the old tree call
  omitted. Default screenshots remained AE0. Exact preservation and a rendered quality judgement
  answer different questions; both were kept for Mark's gate. See `tasks/2026-10-05-village-foliage.md`.


## Village context C1 — 2026-10-06

- **A point is not a clearance test for a volume.** The plan cleared the LEFT row against the cypress's
  base point; the lobe solid's ground footprint is ~0.5 wide, and 34 of its vertices sat inside the row.
  Fable caught it by building the solid with BrushCypress's own options. Test against the geometry
  that renders, not a proxy position. `scratch/village-context-2026-10-06/clearance/run.mjs` now does
  this for every house and row, and it fails on the original plan (negative control).
- **Uniform paint hides interpenetration; the painted medium exposes it.** Houses 3/4 and house 6/the
  sienna neighbour had overlapped since F2, invisible under identical dark procedural paint. Distinct
  source patches on each face would have shown a box inside a box. Re-check footprints whenever a
  medium change gives neighbouring faces different paint.
- **Render the draft in a sandbox copy while the plan is under review.** A full app copy under scratch
  (own port, own atlas) gave the reviewers a real capture without touching the shared tree; the final
  Worker captures were then pixel-identical (AE0) to the reviewed sandbox render, so the review
  covered exactly what shipped.
- **zsh does not word-split an unquoted `$FILES`.** A freeze manifest went out with no hashes because
  `shasum $FILES` received one argument. List the paths literally or use an array; read the file you
  just wrote before dispatching a brief that depends on it.

## Village promotion — 2026-10-06

- **A recorded protection is not a live protection.** `tasks/todo.md` said `main` was PR-only with
  required checks (set up 2026-09-24). Fable checked the API before trusting it: the "Protect main"
  ruleset holds only `deletion` and `non_fast_forward`, and its `updated_at` is two minutes after its
  creation on 2026-09-24, so the PR and check rules were most likely never saved — not lost later. The
  2026-09-24 verification used the branches API's `protected` flag, which the deletion rule alone flips:
  a check that cannot tell "some rule" from "the rule you meant" proved nothing (same shape as the
  ignored-filter lesson that day). The PR process still held because the plan stopped at the merge, but
  nothing would have stopped a direct push. Read
  `gh api repos/<owner>/<repo>/rules/branches/main` before relying on the note; settings are Mark's.
- **Prove the promotion against the approved captures, not against the old default.** The default
  route was required to be AE 0 against the C1 views Mark approved, in all eleven views, from the dev
  server and from `vite preview` of the production build; the live site was then checked the same way
  (village band AE 0). A rename commit with its own AE 0 proof kept the behaviour change reviewable.

## Moving-sky spike — Simon Lee's model tested, 2026-10-11 (Mark's verdict pending)

Branch `spike/moving-sky` (`905223d`, throwaway, never merge), flag `?sky=moving`. Short opaque
single-colour strokes slide along the existing source streamlines; the painting copy (wash) is gone
from the sky band except the scan's own warm star/moon bodies, drawn over the strokes. Evidence:
`scratch/moving-sky-spike-2026-10-11/` (pass crops `whorl-compare-p{2,3,4}.png`, `compare-whorl-4s.mp4`).

- **Thick opaque strokes expose path faults that thin translucent ones hid.** The source ribbons
  fold into V-shaped kinks where heading continuity is relaxed near swirl centres. Invisible at 0.6
  opacity and 0.004 width; obvious as arrowheads at full opacity and twice the width (pass 3).
- **A stroke sized as a fraction of its path turns short paths into pebbles.** Cutting trails at
  sharp turns (pass 4) fixed the kinks and created round dabs, because the stroke window is a
  fraction of normalised path length. Fix: a minimum path length, or a stroke length in absolute uv.
- **One colour per stroke was the step that made it read as paint.** Per-vertex colour streaked
  each stroke through several colours; taking the path midpoint's colour (pass 3) gave the
  painting's distinct marks. Bristle texture at the doubled width read as corrugated metal (pass 1).
- **Pinned-clock capture makes motion judgeable headless.** `window.__skyTime` (spike branch) plus
  `scratch/moving-sky-spike-2026-10-11/frames.mjs` renders exact times: 60 frames at 15 fps in ~16 s,
  despite software rendering. `perf.mjs` there runs a HEADED Chrome for a real-GPU frame rate:
  120 fps (display cap), p95 9.3 ms for both skies on Mark's Mac at 625k vs 195k triangles.

## Sky-choice plan review — what three review rounds caught, 2026-10-11

Plan `tasks/2026-10-11-sky-choice-plan.md`. Codex found 13 defects across two rounds, Gemini 5 (all
also in Codex's list). None was in the design; all were in the proof. Patterns worth keeping:

- **Appending a query string to a URL that may already have one silently changes what is tested.**
  `check-reduced-motion.mjs` built `${appUrl}?mode=…`; with `?sky=moving` in `appUrl` the page parsed
  `sky = "moving?mode=diorama"` and the check passed on the default sky. Build URLs with `URL` and
  `searchParams.set`, and prove the variant was actually selected.
- **A pinned clock cannot test the clock.** Pinning `uTime` for frame-exact captures overrides the very
  advance a "motion unchanged" gate claims to check; a doubled increment passes. Test the clock with the
  pin absent, against recorded `dt`.
- **NaN passes a `>=` threshold.** The sky colour script read past a wrong-sized capture, got NaN, and
  `NaN >= 10` is false, so it passed. Gate scripts must reject bad input and non-finite values first.
- **A golden fixture with one flat colour cannot catch a colour-sampling bug.** The first T2 candidate
  used the uniform `holeScene()`; the adopted `rampScene()` has an asymmetric ramp, varied flow and
  side strips with their own colour.
- **Write the wrong implementation, then make the test fail on it.** Each new builder test was checked
  against a named wrong version (requested-points guard, painting-space sample, cutoff before the flip,
  cutoff removed): `scratch/sky-choice-2026-10-11/gate/mutations/`. Three of the plan's first five tests
  would have passed on broken code.
- **A delegate can confirm the obvious reading of an ambiguous spec.** Gemini computed four T2 hashes
  because the plan left the fixture open; the fix was to pin every input in the plan, not to pick one.

## Sky choice build and gate — 2026-10-11

- **Read the edges of a capture, not only its centre.** The moving sky's right edge drew the painting with a
  hard seam for three commits. It was in my own captures; I judged the whorl and stars and missed it. Fable
  found it (F1): a clamped painting sample read the scan's pale weave border in the side strips. Crop all
  four edges of every capture before calling a pass done.
- **A raw ShaderMaterial shows linear colour as if it were display colour.** `Color.set(hex)` converts to
  linear; the shader writes it unconverted, so the palette's #2d3c60 showed as (8, 16, 43). Harmless where a
  wash covers it, visible the moment it becomes the gap between opaque strokes. `setStyle(hex,
  LinearSRGBColorSpace)` passes the hex through unchanged.
- **Measure the real field before choosing a threshold.** The turn cutoff of cos 0.5 cut 6,784 real curves
  near swirls and left holes. A histogram on the real flow field showed every reversal (cos < −0.5) lies near a
  swirl and none elsewhere, so −0.5 cuts only the V-kinks.
- **Do not edit the code a delegate is gating.** I applied review fixes to the dev server Gemini was capturing
  against; anything after the edit was mixed evidence. Stop the delegate, commit, then rerun on the commit.
- **A guard script catches what a reviewer reads past.** Fable's F7 fix value was "by reading, not measured"
  for other sizes; `check:viewport` failed it at 640×360 within minutes. Run the existing guards after every
  review fix, not only at the end.
- **Measure a hitch with an independent frame loop.** The scene's own `useFrame` probe showed no long frame in
  production while an injected `requestAnimationFrame` gap tracker showed 207.8 ms. Cause not identified.
  Trust the independent tracker (`scratch/sky-choice-2026-10-11/gate/first-toggle-gap.mjs`).
- **React StrictMode runs effect cleanups once at mount in dev.** A disposal log counted those; the unmount
  check must count only disposals after the unmount (`gate/harness-probe.mjs`).
- **Tunables change logged:** added the diorama sky ribbon budget to CLAUDE.md Tunables (painted light 3,200
  requested / 194,850 triangles; moving 25,600 / 678,296; one count for every device). Measured 2026-10-11.

## Moving-sky refinement — 2026-10-11 (Mark: "room to improve")

- **The mean-Lab gate cannot see flat paint.** The moving sky passed at ΔE 6.67 while reading as cut paper.
  At 1:1 my eye called the strokes greyer than the painting, but per-pixel chroma matched (28.0 against 27.2).
  The defect was texture: mean |ΔL| between neighbours 2.42 against the painting's 4.6
  (`scratch/sky-polish-2026-10-11/sky-stats.ts`). Measure the eye's claim before tuning to it.
- **Hashing an interpolated per-ribbon constant amplifies its last-bit drift.** Barycentric interpolation of a
  constant is not exact, and `fract(sin(x) * 43758)` turns a 1e-5 error into a different hash. Pass the
  identity as a `flat` varying (`movingVert`).
- **Probe at the painted body, not at the `SWIRLS` anchor.** A hole probe centred on the `SWIRLS` star found
  normal ribbon density and nearly cleared the builder. The painted star sits 0.056 from that anchor, and
  there the core had almost no ribbon points. Same trap as the star guards (lessons 07-16).
- **Blurring the painting averages complementary paint into mud.** A ground of the painting at mip bias 4
  turned yellow-and-blue star halos olive grey and raised ΔE 6.89 → 8.18. A ground shown only in zero-count
  cells filled only the very centre and pasted a static patch into a whorl eye. Both reverted at the pass cap.
- **Coverage lifts lightness.** Longer, softer strokes covered more of the navy gaps and raised mean L
  52.6 → 54.6. The highlight lift came down 0.2 → 0.08 to hold the sky's lightness.
- **A mipmapped texture lookup is a derivative too.** Codex N1: `bodiesFrag` sampled the painting after a
  fragment-dependent discard. No `fwidth` was in sight, but implicit LOD reads the whole pixel quad. Sample first,
  discard after. Check every shader for any texture lookup or derivative below its first discard.
- **A detector needs failing controls of every shape the defect can take.** My pop detector passed a planted pop
  that stayed on screen. It missed a one-frame pop, because entry and exit cancel in a pairwise ratio (Codex N2).
  It then missed the same pop straddling a 16 px tile row (Fable N3). Plant one-frame, two-frame, persistent and
  tile-boundary pops, and require each to fail, before citing "no pops".
- **Register the photographed feature before naming its cause.** My close-up showed the lower star while my probe
  measured the upper one, with a non-production seed (Codex C1). Project the probe point onto the capture
  (`scratch/sky-polish-2026-10-11/project.ts`) and use the runtime seed.
- **Opaque objects draw before every transparent one, whatever `renderOrder` says.** The authored star spheres
  poke half through the wash's surface, which hides their top half in the light sky today. An opaque body layer
  at that radius made it a dark dot. Placing the layer at the strokes' radius, behind the spheres, fixed it.
- **Measure coverage in the render, not in the geometry.** Stroke centre-line counts said four stars had gaps;
  a magenta background showed seven stars and the moon (`holes/`). Life fades, discards and widths decide what
  shows.
- **Tunables change logged:** the moving sky's budget line now reads 25,600 requested, minPoints 5, 601,128 ribbon
  and 737,970 scene triangles, 103 fps on an M5 Pro. The old 678,296 was the scene total, not the ribbon mesh
  (Codex review-v1); the line now names both.
- **Borrow a reference's craft, not its method.** Simon Lee's strokes beat ours as brushwork, but his palette,
  stars and outer swirls are authored, not derived from the scan. Lighting, coverage and path smoothing
  carried over in three small commits without giving up the bar. Mark agreed the split, 2026-10-11.
- **Name the cost a fix puts on the visitor.** `minPoints` 5 bought coverage with short dabs; the commit said only
  the gain until Fable asked (review-v4). Write the trade where the setting lives.
- **A worker removes the freeze but moves the wait.** Building the moving strokes in a Web Worker took the first
  switch from one 230 ms frame to none, and the strokes land 0.32 s later. Fable's plan check caught what the
  plan's own rule hid: on the `?sky=moving` deep link the wait showed the light strokes first. Ask where else a
  "show the old state until the new one arrives" rule applies before shipping it.
- **A shell watch loop is code.** Two watches failed today on their own bugs: zsh's read-only `status`, and
  nested quotes in an inline Python one-liner. Run a watch's command once in the foreground before arming it.

## Cloud session captures — the Chrome guards run as root after all, 2026-10-13

Session on `claude/confident-bohr-1y7p2u` from `main` at `e80fdf7`, two days after PR #7 merged.

- **"Cannot run as root in a cloud session" named the symptom, not the cause.** Chrome exits at once as root
  without `--no-sandbox` (crbug.com/638180). The three Chrome scripts (`capture:diorama`, `check:reduced`,
  `check:viewport`) now read `CHROME_FLAGS` for extra launch flags; empty on a Mac, so nothing changes there.
  Cloud invocation: `CHROME_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome CHROME_FLAGS=--no-sandbox
  CAPTURE_SETTLE_MS=10000 npm run check:reduced` (the dev server on 5179 first).
- **Software WebGL draws the cypress about ten seconds late, and every fixed wait straddled it.** The scene
  appears ~6 s after navigation without the cypress (it waits on the painting's image data and the lobe plan,
  CPU work that is slow here) and is complete by ~10 s. `check:reduced` saw frame A without it and frame B
  with it (a "moving" still), `check:viewport` compared a fresh load without it to a rotation with it, and the
  orbit-preset and phone captures were bare gradient. `CAPTURE_SETTLE_MS` adds to every post-load wait; at
  10,000 all three pass and all nine views are complete. Measured with a probe that reads the canvas every
  second after navigation (session scratchpad, not tracked).
- **Identical byte counts across different runs told the two states apart before any image was opened.**
  Frames here are deterministic: 3,009,367 bytes (no cypress) and 3,132,206 (cypress) recurred across the
  capture, reduced and viewport runs. Repeating sizes in a "failed" comparison mean two states, not noise.
- **Rule out the dead server before blaming the proxy.** Chrome's "127.0.0.1 refused to connect" came while the
  dev server had died (the first capture attempt's orphaned Vite), not from the container's `HTTPS_PROXY`;
  with the server up, `--no-sandbox` alone reaches it. `--no-proxy-server` was a false lead and is not needed.
- **Still true:** a canvas readback takes ~3.5 s here (ReadPixels stall) and frame rate is never judgeable
  headless. Whether these software frames match the Mac's GPU frames pixel for pixel was not tested; the
  AE 0 comparisons in the records are Mac-to-Mac.
- **The live host is unreachable from a cloud container** (proxy policy). Production state was confirmed
  through the Vercel API instead: deployment `dpl_3qJcJeYvEAQifGT4vv9GVc8jFhvU` READY at `e80fdf7`.

## Make-it-alive A — the gust clock, 2026-10-13

Plan `tasks/2026-10-13-alive-a-plan.md`, record `tasks/2026-10-13-alive-a.md`. Built and gated in a cloud session.

- **Warp the clock, not the paths.** A's tempo is a per-ribbon time warp `T(t) = t + w (G(t − lag) − G(−lag))` on
  the one sky clock; the flow field, the ribbons and the colours stay exactly as derived, and the mean tempo
  over time is today's. With `uAlive` 0 every term is `t + 0·x`, and the default proved byte-identical to `main`
  at pinned t on both skies. Expected exact, proven anyway: the first build was one grey level off.
- **A per-ribbon constant through a plain varying is not constant.** The light shader read its warped clock
  through an interpolated varying; at t = 3.7 a few pixels moved one grey level against `main`. `flat` fixed
  it. The 2026-10-11 lesson named hashing as the amplifier; a `sin` of a growing clock amplifies too.
- **Set thresholds from the real field's quantiles, and look at the map.** The band luminance window was first
  guessed at 0.30–0.60; the light sky's 3,145 ribbons sit at lum 5% 0.257 / 50% 0.416 / 95% 0.551, so the
  guess put the band on the median. 0.38–0.52 (about the 35th and 90th percentiles) lit the whorls and the
  band right of the whorl and left the floor and the side strips calm, read on a weight map over the painting.
- **A fixture must straddle the threshold or a mutation sails through.** T7's first fixture gave every vertex of
  a ribbon a luminance on the same side of the band, so a per-vertex weight came out equal to the per-ribbon
  one and the mutation passed. Vary the fixture across the threshold before trusting the proof.
- **A fresh reviewer found what the author could not see in the gate.** Six fixes from one review of the plan:
  the lift's lag and the halos' phases broke the t = 0 identity the gate was about to assert; the halo writer
  ignored `paused`; nine transcendentals per fragment of a full-viewport mesh; a per-pixel ΔE on a sky whose
  strokes move measures motion, not colour; and the warp drove the shimmer, the known boil knob, to 5×. Review
  the plan before the build, with the shaders open.
- **Compare band-mean Lab, not per-pixel, when strokes move.** Alive against default at the same pinned t
  differs by ΔE76 0.1–0.5 in band mean while the per-pixel mean abs diff is 1–6 grey levels: the strokes are
  elsewhere, the colour is the same.
- **Four software-rendered Chromes at once all miss the canvas; one at a time they all find it.** And a
  DevTools helper that resolves the whole message where the others resolve `.result` reads `undefined` as "no
  canvas" with no error. Both cost a capture round.
- **Tunables change logged** (CLAUDE.md, Tunables): make-it-alive A behind `?alive=1`: gust periods 9.7 / 5.9 /
  16.3 s, amplitudes 0.36 / 0.22 / 0.12, travel 3 s per canvas width left to right, lift 0.06, shimmer share
  0.5, floor 0.15, band luminance 0.38–0.52; halos 4.5–9 s (±14% opacity, ±5% scale), moon 13 s (±8%). Set
  2026-10-13; untuned by Mark.

## Make-it-alive A, retune pass 1 — 2026-10-13

- **Cautious by design read as nothing at all.** A's first strength (tempo 0.3×–1.7×, lift 6%, shimmer at half the
  warp) passed every gate and Mark could not see the main difference on the preview. The boil lessons argued for
  caution; the taste gate argued the other way. Build the first pass at the strength the eye needs and let the
  captures police boil, rather than the reverse.
- **Give the taste gate knobs, not pushes.** URL knobs (`gust`, `lift`, `shimmer`, `breath`) let Mark dial the
  strength live on a preview and name the numbers; each push-and-look round otherwise costs a build, a gate and a
  deploy. Clamp every knob where a guarantee lives (the gust sum under 1 keeps the clock monotone).
- **`Number('')` is 0.** An empty knob (`lift=`) read as zero, not as missing; the test caught it because it tried
  the empty case. Treat empty as absent before parsing.
- **A self-set working bound is not the locked criterion.** The plan's "pair ΔE under 1.5" was a first-pass guess;
  pass 1 exceeds it at the tempo peak (1.83 light, 2.33 moving) while the locked band ΔE against the painting
  stays at 2.6–3.9 of 10, and the light sky actually moves closer to the painting's lightness. Report both; only
  the locked one gates.
- **Capture the strips round the peak, not from t = 0.** The tempo's first peak at the whorl is at 3.28 s (lag
  1.35 s) and its deep trough at 28.9 s; a strip from 0–3 s shows the ramp, not the extreme the boil question is
  about. Compute the peaks from the TS twin of the clock and centre the windows on them.
- **Tunables change logged** (CLAUDE.md, Tunables): pass 1 values as above, 2026-10-13; the knobs' defaults.
- **An opt-in feature's off path must be the old path in bytes, not just in arithmetic.** Three Codex findings
  on PR #8 were the same lesson: the gust functions ran with the flag off (multiplied by zero), the attribute was
  packed and uploaded with the flag off, and a knob at zero divided 0/0. The fix that ends the series is a variant:
  flag off compiles main's shaders (`defines.ALIVE` absent) over main's geometry (no `aGust`); flag on is the
  feature. The gate then proves the off path byte-identical to `main` and the on path byte-identical to its own
  earlier captures, both cheap once the frame scripts exist.
- **The taste gate wants sliders, not URLs.** Mark on the URL knobs: "I don't like how this way works ... build the
  tool so that I can tune myself like in previous we've done." The project already had that pattern (the dev leva
  panel with "set as default" writing `sky-tuning.json`); the 3D route never got a panel, and leva is aliased out
  of production, where Mark actually looks (the Vercel preview, the phone). A plain-React tuner on `?tune=1` works
  on every build and feeds the same JSON writer on the dev server. Build the tuning tool where the person judges.
- **He chose the strongest preset.** gust 0.95 / lift 0.3 / shimmer 1 / breath 2, from a list I offered as the
  "strong" extreme. The lift lands the light sky's band at ΔE 2.5 from the painting (closer than the default) and
  the moving sky's at 5.8 (further, under 10); the halos' top-of-breath opacity exceeds 1 under additive blending
  and over-brightens, which he saw and accepted. Record what the chosen numbers cost before the next pass argues
  about them.

## Make-it-alive A, second pass — the cypress flicker and the window glimmer, 2026-10-13 (night)

Plan `tasks/2026-10-13-alive-a2-plan.md`, record `tasks/2026-10-13-alive-a2.md`. Built and gated in the cloud session
after PR #8 merged (`246e817`, "Merge it then start the second pass").

- **"Merged" needs a read, not a nod — twice in one day.** Mark wrote "merged to main"; GitHub showed PR #8 open,
  `origin/main` unmoved and production at PR #7, the same shape as the afternoon's "merged" that meant the record
  branch. Read the PR, the ref and the deployment before building on a merge. The merge then went through the API
  on his word in one call.
- **The fresh review paid again: six blockers in a plan that had already been numerically checked.** A per-vertex
  factor through a plain varying is not exactly 1 at t = 0 (the sky's grey-level lesson, in a new coat); a GLSL
  `fract(sin · 43758)` is not the TS hash in float32, so a shader-side hash cannot be tested from node; my own
  transient check sampled four heights and missed the overshoot (max 1.42 at h 0.185) a search over h found; two
  meshes shared one material object, so "the solid is untouched" was false; the colour gates' rects are
  registration bands, not footprints (the tree reaches x 380, the striped house's windows y 685); and a count I
  had corrected in one section of the plan survived in another. Review the plan with the code open, and have the
  reviewer measure on a capture what the author asserted from memory.
- **Make the zero exact by construction, not by cancellation.** `sin(ωt − kh) − sin(−kh)·e^(−t/τ)` is 0 at t = 0
  only if the GPU's `sin` is exactly odd; `env(t) · Σ…` with `env = t > 0 ? 1 − e^(−t/τ) : 0` is 0 by a branch,
  and bounded by Σ Aᵢ for every t besides. The gate then proved every alive route byte-identical to the default at
  t = 0 with the injections compiled, and the paused still passed `check:reduced` twice.
- **`onBeforeCompile` keeps the off path in bytes with no shader fork.** Three's stock `MeshBasicMaterial`, a
  multiply after `<color_fragment>`, a distinct `customProgramCacheKey` per variant (the default key is the
  callback's source text, which two materials sharing one helper would share), uniforms assigned on the compile
  parameters and written from the frame loop. The default route matched `main` on all 12 baseline frames.
- **Isolate the feature with the other knobs at 0, then classify every differing pixel.** With the sky knobs at 0
  the sky is exactly the default, so a flicker-only frame differs from `main` only where the flicker draws:
  26–30k pixels inside the measured cypress footprint, 189 inside the window footprint for the glimmer, 0 anywhere
  else, at every time tried. Cheaper and sharper than a ΔE on a region.
- **A dark pigment bounds a brightness effect.** ±60% of the cypress's green is at most about 15 grey levels on
  the brightest tongues (the first diff frame's max was 23 on the strokes' edges), so the flicker at the knob's
  maximum reads as moderate in the stills; the sky's lesson ("cautious by design read as nothing at all") says to
  expect Mark to want more. The retune lever is the depth constant; the ceiling on the knob is the review's floor
  on the factor (0.4), to be renegotiated with him rather than quietly raised.
- **`0 · (negative)` is `−0`, and `assert.equal` is `Object.is`-strict about it.** The factor `1 + (−0)` is exactly
  1, which is what matters; the test asserts `=== 0` on the wave and strict equality on the factor.
- **Read a prop in the frame loop; do not copy it into a ref during render.** `react-hooks/refs` flags the render-
  time write, and the halos already read their `clock` prop inside `useFrame` without one. The `immutability`
  disable comment goes around the `useFrame` call, not inside its body.
- **Run the mutation proofs as a chain that restores the file.** Three mutations (no tongue term, no envelope, an
  off-by-one lit range) each turned exactly one test red, and the sources came back from a copy in the same
  command. A forgotten revert is a bug the next commit ships.
- **The capture script's frame names are `Number`'s.** `--times 8.0` writes `m-t8.png`; a strip builder that
  formats its own names misses every whole second. Build the list from the script's own JSON, or format as it does.
- **The colour gates read baked references that are not checked in** (`reference/derived/cypress-skin-source.png`,
  `_work-painting.png`); a fresh clone must rebake them before `check-cypress-colour` or `check:village` can run.
  The record names which bake produces which file.
- **Tunables change logged** (CLAUDE.md, Tunables): the second-pass entry (flicker periods 1.9 / 3.1 s, amplitudes
  0.6 / 0.4, 1.3 / 0.8 cycles, τ 1.5 s, depth 0.6, floor 0.12, tip 0.55–0.9 of the lobe, tongue 0.40–0.75, back
  half, solid half; glimmer 2.3–4.1 s and 0.9–1.6 s, shares 0.7 / 0.3, depth 0.6; knobs shipped at 0.5 / 0.5).
- **He chose the strongest preset, again.** Offered flicker 1 / glimmer 0.6 against both at 1 with the reasoning for
  the softer window, Mark took both at full. Two passes, two ceilings: on this project the taste gate's prior is
  "more", and the next pass should build its range above where the author's eye says enough, with the gates
  policing boil and colour rather than caution policing strength.

## B (touch) — the plan and its baseline, 2026-10-13 (late)

- **A killed wrapper is not a killed job.** A capture chain started with `nohup` children; its wrapper shell was
  killed (by its own `pkill -f`, whose pattern sat in the wrapper's command line because the script's text was
  written in the same command), and the capture child carried on. The second run then shared the output directory
  with the first: two Chromes at once, a "pinned clock self-check failed" from one of them, and frames of unknown
  parentage. Before a re-run, `pgrep` the capture script and Chrome by name and kill them; wipe the directory; and
  never write a script and invoke it in one command when the script's text contains the pattern a later `pkill`
  will match. Kill servers by pid file.
- **A scratch script that imports the app's modules must live under the repo** (`scratch/`, ignored): node resolves
  `three` from the importing file's directory, so a script in the session scratchpad cannot find it.
- **`-x ** 2` is a syntax error in JavaScript;** write `-(x ** 2)`.
- **Check the mapping and the maths before the review lands,** without touching the files the reviewer is reading:
  the dome's analytic inverse round-trips to 4e-16 and the angular isotropy factor is exactly the planned
  `(SPAN_V·1.06)/(SPAN_H·1.16)` = 0.7252; the surge's tempo kick never steps backwards over three overlapping
  surges on a dense grid, its crest runs at the planned speed, the lift is bounded and gone by five time constants.
  One number for the eye check: a single surge stays visible about 3.7 s and runs 0.9 of the canvas width.
- **Never edit a source file while a capture chain runs against the dev server.** Vite's reload under the capture
  took the canvas away mid-read ("no canvas") and lost a frame set. Build and test first, then capture; or capture
  against a production preview or a second worktree when a build must continue in parallel.
- **A Gaussian never reaches zero, and an isolation gate needs a zero.** The first surge model moved every ribbon
  in the sky by invisible amounts (the twin's mask covered the whole frame); a cutoff at three sigma on every term,
  in the twin and the shader, made the untouched sky byte-identical again and the gate well-posed.
- **DevTools waits for the page, and a software frame is most of a second.** Press and release awaited one after
  the other landed 972 ms apart (a probe with timestamps showed it), so every synthetic tap read as a drag and the
  gate blamed the code. Fired together they land 1 ms apart. When a synthetic gesture fails, probe the timestamps
  the page saw before touching the classifier.
- **A lit vertex reaches a whole triangle.** The twin's mask dilated by 10 px left stray diffs of 14 grey levels
  along the ribbon: the lift interpolates across the segment to the next vertex pair, about 16 px. Dilate by a
  segment, not by the stroke's width; the residue is then at most 1 grey level, the support's edge in float32.
- **The reviewer's blocker that a plan's numbers hid.** The first plan's kick was monotone only while a surge
  stayed in the list; pruning it would have stepped the clock back and re-birthed dead strokes. A term that must
  never jump has to reach exactly zero before it is removed, and a live one must never be evicted. The gate then
  proved the pair across the kick's end differs exactly as the baseline's own.
- **Tunables change logged** (CLAUDE.md, Tunables): B's entry, the constants above, shipped `surge` 1.
- **A hidden knob still rides a save (Codex, PR #10 P2).** The tuner hid B's `surge` slider off the touch route but
  its state restores every knob from local storage, and "set as default" sent them all: a surge left from a touch
  session would have overwritten the shipped `touchSurge` during an A-only save. Build a save's payload from the
  knobs shown, by construction (`aliveSavePayload`, T26), never from the whole state; the writer merges, so a key
  left out keeps its shipped value.

## The Mac session, 2026-10-16: Codex's two late P2s on PR #10

- **A review can land after the merge.** PR #10 merged at 12:53 UTC on 2026-10-13. Codex's re-review of the last
  fix posted two P2s at 12:54. Nobody read them for three days. After a merge, read the PR timeline once more
  before closing the session, and answer what arrived late.
- **A monotone proof holds only on the clock it was proved on.** T22b proved `t + K` never steps back, at tempo 1.
  The shader added `K` on top of A's gust clock, whose tempo falls to 0.05 at the shipped knob, and the kick's
  settle (−0.0665 s/s per tap) outran it. Prove the composition the shader computes. Putting the kick into the
  clock's argument, `G(t + K)`, makes the proof a product of two positive slopes.
- **A far sentinel breaks float32 maths on the GPU, and a 64-bit twin cannot see it.** `NO_END = 1e9` is exact in
  float32, but `1e9 − 0.25` is not (the spacing is 64), so a `smoothstep` built on it had equal edges. Write a
  fade on the time left, `end − t`, so its edges are constants. This driver happened to return the right value,
  so look for the spec's word, not a symptom.
- **Quote the shipped knob, not the code default.** I told Mark one tap stayed forwards, using `GUST_SUM` 0.90.
  `sky-tuning.json` ships 0.95, and one tap could reverse. Read `sky-tuning.json` before quoting a knob.
- **Give the worst case and the common case together.** One tap reverses at the triple trough only: 0.3% of tap
  moments, 2.3% for two taps, 8.8% for four, never at weight 0.5 or below. The bound alone made it sound common.
- **A fix that changes how something feels must say so where the knob lives.** Fable's P2: the composed kick's push
  now swings 0.023–0.78 s with the wind (was 0.4 s). The fix was right, and the Tunables line, the plan and the
  commit did not say so. Write the feel change into Tunables and the thread reply in the same pass.
- **Software-rendered identity is not GPU identity.** The cloud's "touch with no input = alive" was byte-exact under
  SwiftShader. On the M5 Pro it differs by one grey level at 3–7 pixels, on `main` too. Before blaming a change,
  capture the parent on the same GPU: the fix's frames matched `main`'s pixel for pixel.
- **Headless Chrome on this Mac runs on the GPU** (`ANGLE Metal Renderer: Apple M5 Pro`). Pinned captures here are
  real-GPU evidence. Frame rate still needs a headed window.
- **`vite preview` binds IPv6 only on macOS without `--host 127.0.0.1`,** so a capture aimed at `127.0.0.1` gets
  ECONNREFUSED. Pass `--host 127.0.0.1` (the worker found it).
- **A lost gate tool should come back as a tracked option, not a scratch script.** The cloud's tap injector lived in
  a session scratchpad and died with it. `capture-sky-frames.mjs --eval` now replays B's tap rows anywhere.
- **The desktop DPR cap in Tunables (2) does not match the code (1.5, `DioramaExperience.tsx:166`).** Found from
  the worker's canvas sizes, not fixed: today's frame rates are at 1.5. Mark's call which is the truth.
- **The same lift reads weaker on a glaze.** Mark saw painted light's tap light as weaker. The lift multiplies a
  stroke's colour, and painted light's strokes are glazes (alpha 0.61 × a soft edge), so only the glaze's share
  of each pixel brightens. Two cheap single-variable builds ruled out the obvious causes first: clipping (no lit
  pixel near white), the gust weight (both skies rose alike). Opacity alone closed a sixth of the gap. Compare
  skies on relative gain, not added levels, because their strokes start at different brightness.
- **Experiment in a worktree while Mark has the dev server open.** Each single-variable build ran in
  `scratch/.../wt-exp` on its own preview port, so his page never reloaded mid-feel. Only the chosen change went
  into the checkout.
- **Two CDP calls race the frame loop.** `--eval` injected a tap and a second call pinned the clock. A live frame
  between them pruned the tap whenever the live clock was past its window (15.45 s after a 13 s settle, t0 5).
  One run survived by luck, so a single green proved nothing. A 200 ms pause between the calls made it fail every
  time, and pinning in the same evaluation fixed it (Codex, PR #11 P2). Widen a race on purpose to get a red.
- **Codex also reviews new commits on an open PR.** After the P2 fix was pushed to #11, Codex re-reviewed the new
  head by itself (trigger: "New commits") and posted only a 👍, which is easy to miss. I wrote in the merge note
  that the last review covered the older commit, and had to correct it. Before writing which commit a review
  covers, read the `codex-review-state` line in Codex's summary comment. It names the commit and the status.

## C (arrival), 2026-10-20

- **A plan with complete code can be executed before it is built.** Codex ran the plan's timeline and driver in
  memory against three's real camera and found six P1s in a plan I believed complete (a caption that could never be
  dismissed, hidden chrome still clickable, a 30 s frame delta, a seam that missed the cypress, a curtain a failed
  asset would hold for ever, a skip 2× slower than claimed). Give a plan reviewer complete code and brief it to run
  it.
- **zsh does not split an unquoted variable.** `for combo in "desktop light"; set -- $combo` gave one word, and
  `--viewport $vp` became `--viewport "desktop light"`, which the script read as desktop; `--sky=$sky` became
  `sky=`. The frames had the right names and the wrong content. Before reading a sheet, check the frames JSON's
  `url` and `identify` the PNG's size. Use `${=VAR}` in zsh, or a bash script file.
- **At one speed, a dissolving picture reads as a frame.** The scan and its dark ground fading together left the
  scan's edge as a hard rectangle over the diorama half-way through. The ground must go first (`groundShare`), so
  the world appears around the painting before the painting melts into it.
- **Neither headless Chromium nor a new tab in the Chrome MCP group hides a page.** `Page.setWebLifecycleState
  frozen` kept rAF at 257 frames in 3 s; a covering tab left `visibilityState` visible and 120 fps running. To test
  a long frame delta, block the page's main thread for N seconds (`while (performance.now() < end) {}`): the next
  frame's `dt` is N, the same path a hidden tab takes.
- **`montage` wants a font the Mac lacks.** Build contact sheets with `magick ( a b +append ) ( c d +append )
  -append`.
- **A driver's writes want refs named `*Ref`.** The React Compiler lint flags `.current` writes through an object
  of refs ("cannot access refs during render"); naming each ref `xRef` and passing them as props is what it accepts,
  with no disable comment.
- **Tunables change logged** (CLAUDE.md): C's entry.
- **A ref handed back in the same frame is handed back too early.** The driver (priority −2) nulled the sky's step
  on the frame that ended the arrival, and the sky (priority 0) read null that same frame and took the raw `dt`:
  a 30 s frame at the very end still jumped the sky (Codex, code review F12). A value another subscriber reads
  later in the frame is released on the next frame, and the clock, not the driver, owns that rule so a test can
  see it (A10).
- **A later rule with the same selectors wins, media query or not.** The reduced-motion `transition: none` was
  written before the reveal rule it was meant to override and lost (F13). Put an override after what it overrides,
  and read the computed style once (`getComputedStyle(el).transitionDuration`).
- **A conditional DOM layer must be keyed to the state that drives it.** `arrival && !still` mounted a fresh opaque
  layer when reduced motion was toggled off after the end, with the driver already stopped (F11). Mount what a
  driver animates only while the driver runs.

## D1 (touch the land), the plan, 2026-10-21

- **A formula in a plan can be run before the code exists, and should be.** Codex executed D1's displacement and
  found the direction flip across the touch point (zero below 1e-4, a unit vector above it, the falloff still 1):
  a two-microunit move flipped a full-weight vertex by 0.14 units. A smooth vector field (`away / radius` times the
  hat) has no such seam. Write the field as a vector from the start, not a direction times a scalar.
- **An unqualified name costs a gain.** The plan's `knob` meant two things (B's surge gain, the land's bend gain),
  and the bend was multiplied twice. Name every gain for what it scales.
- **A new knob reaches four places, not three:** the tuning type, the tuner, the shipped JSON, and the writer's
  allowlist in `vite.config.ts` (`TUNING_FIELDS`), which drops unknown keys and answers 200. Test the round trip.
- **An interaction plan must list every event, including the ones that do nothing today.** A still press
  (`pointerdown` with no move) and a hover that leaves the canvas (`pointerleave`) had no handler, so one never
  started and the other never ended.
- **The nearest hit among the meshes you ask is not the nearest visible surface.** Raycast every occluder in the
  foreground and accept a land hit only when it is the nearest; 114 of 327 rays over the hedges hit a house first.
- **The bar moved.** The cypress and the village passed their gates in July; next to the moving sky, and to Simon
  Lee's village, they read as a cut-out and as boxes. A gate pass is for the piece as it stood; when the piece
  around a part improves, the part comes up for review again.

## E1 (the cypress), the plan, 2026-10-21

- **A direction decided on a triptych with unmatched scales names defects the measurement does not find.** The
  2026-10-20 reading ("too thin through the middle, the left tongue too low, one straight spire") came from three
  panels at different scales. Measured against the painting's treeish component at 21 heights, the lobe plan's
  widths match within 13 px, the left frond's tip is at 0.541 against the painting's 0.53, and the render at the
  design camera is 20–65 px *wider* than the painting through 0.15–0.40. One claim survived: the tip is a needle
  (22 px) where the painting has a club (36 px). Before naming a silhouette defect, run the width table in 2D (the
  plan against the painting) and in render space (the thresholded capture, scaled to the painting's crop height).
- **A derived flow field can be vertical by construction.** The shipped cypress field has 94% of its weight within
  10° of vertical: `blendToVertical` weighted by an energy-normalised coherence (mean 0.25–0.4 on a dark tree)
  pulls two thirds of the way to vertical everywhere. The low-passed field at 3840 has 50% beyond 15°, and its
  ticks follow the strokes at 1:1. Histogram a field's angles before tracing anything in it, and gate a fallback
  on the tensor's anisotropy, not on brightness.
- **The 1600 px mask held the main column only.** The left flame was a satellite chain, never masked, so it had no
  tensor and the vertical fallback. The closed treeish component at 3840 covers the whole tree and no sky.
- **A render's treeish component bridges to dark sky strokes and the island.** Cut the crop at the tree's base, open
  by 1 px before the flood, and compare the trunk's run; the first table was 60–90 px wide with the island in it.
- **`status` is a read-only variable in zsh.** A monitor loop assigning it dies at once with "read-only variable".

## E1 (the cypress), the build, 2026-10-21

- **A closing before a flood bridges through single speckles.** Closed first, the treeish map joined the spire to
  the star's halo beside it through one-pixel speckles: 113 rows reached the domain's edge and the halo became a
  third frond. Flood the raw map, then close the component: the closing fills gaps inside the tree and cannot
  reach what the flood never touched.
- **A morphology confined to a domain must decide what lies beyond it.** With "outside reads 0" the erosion ate
  the tree's base row off the domain's edge, and a test caught it. Dilation reads 0 beyond the domain, erosion
  reads 1.
- **A sparse seed scaled into a finer grid has gaps on every row it skips.** Classified against the seed's own
  rows (every 2.4th), the satellites fell on those rows only and no chain survived `maxRowGap` 2 (Codex F13).
  Interpolate the seed onto every row first.
- **A frond rooted at the main's centre draws a diagonal tail.** The root belongs the least distance into the
  main's interval that closes the volume, not at its centre; the flat lobe gate showed the tail at once.
- **The lift must sample the surface the triangles span.** Between the solid's rings the compiled surface is the
  blend of two ring ellipses; a per-row section can be a notch narrower, and a strip "beyond the analytic rim"
  sat 0.029 under a compiled triangle (Codex F4). Interpolating the compiled rings put every strip vertex on or
  in front of the solid; the raycast test proves it across the width.
- **The first stroke count was a quarter short.** 520 front ribbons (the plan's estimate) left the underpaint
  showing where the painting is solid paint; the flat gate showed it before any 3D work, and 1,400 with extra
  seeds in the spire read as the painting's density. Judge coverage in 2D first.
- **The grey is Van Gogh's.** The ribbons read grey-blue beside the painting's crop, but their pigment classes
  measured green 50%, grey 38%, brown 9%, blue 3% against the painting's own cypress texels at 51/36/11/2. The
  difference was the flat gate's flat colour against the painting's relief, not the sampling. Measure a colour
  claim against the source's own distribution before changing the rule.
- **A "treeish" fixture by accident.** A position-encoding test painting (R and G gradients, B 40) passed the
  tree-pigment test over most of its area, so a lane-pigment rule picked a neighbour and the colour test failed
  for the wrong reason. A fixture that must not be tree needs blue in it.
- **`discard` in a comment is a discard to `indexOf`.** A shader-order test matched the word in the body's own
  comment; match the statement, `discard;`.
- **The React Compiler lint refuses a clock read in a memo.** `performance.now()` in `useMemo` is "impure during
  render"; the timing seam carries a scoped disable with its reason, as the uniform writes already do.

## E1 (the cypress), the retunes, 2026-10-21

- **A lane is not a stroke.** At 1:1 the painting's cypress showed bands 8–14 px wide and I built the ribbons at
  that width; two retunes later the tree still read as fur. The bands are bristle lanes inside strokes 30–60 px
  wide. When measuring a stroke's width from a scan, find the band of one colour, not the finest visible line.
- **One texel's pigment is one lane's.** Adjacent ribbons jumped in value where the painting's strokes agree; the
  mean of the tree texels across the ribbon's own width gives the stroke's colour, and the colour gate went from
  ΔE 11 / 8 / 14 to 0.9 / 1.4 / 3.2 over the retunes with no other colour change.
- **Alpha-to-coverage stipples a thin stroke.** On ribbons 10–20 px wide the MSAA dither of every edge read as
  pale dots along the strokes at 1:1 and lifted the local-contrast metric to 7.6; blended edges with depth written
  took it to 1.06. The same metric fails on both sides: fur and stipple above the bar, smooth paint below it. Read
  the crop before trusting which side a number is on.
- **The sky's shader constants are for the sky's stroke width.** Its fine bristle octave (11 cycles across) aliases
  below about 20 px on screen; the cypress keeps one lane.
- **Retune within the cap, then stop.** Four passes moved the tree from a cut-out to broad dark strokes at the
  painting's values; the last open number is a texture dial, and that is Mark's call with the captures, not a
  fifth pass.

## E1 (the cypress), the code review, 2026-10-21

- **Two lifted edges do not lift the triangles between them.** A strip whose corners sit on a curved lobe has
  interiors inside it; the chord across a quarter of a wide ribbon sagged 0.004 at the rim, where the ellipse's
  curvature radius is 0.027. Lift every column, and test the emitted triangles' centroids, not the corners.
- **A sample of the batch misses the batch's worst.** The clearance test's first fifty ribbons passed while two
  ribbons in the full batches penetrated by 0.004. Probe whole batches, or every nth ribbon plus the ones a
  reviewer named.
- **A lift that depends on the lobe reintroduces the jump the lift was fixing.** Growing the lift toward the rim
  fixed the crease and jumped 0.0076 at a lobe switch, because the two lobes' laterals differ at their crossing.
  One value for every column; measure the minimum that clears and take a margin (0.008 clears, 0.010 ships).
- **An expected area fitted to the thing under test is not expected.** The colour gate's expected area aligned to
  the render's own component shrank with a recoloured tree and the control passed at 0.009 rejected. Take the
  area from an input the render's colours cannot move: the crop box, the tree's known screen box.
- **A "largest component" with no components is every pixel.** `best` left at 0 matched every unlabelled pixel, and
  a crop with no tree came back all tree, exit 0. Every selection needs its empty case tested.
- **A sandboxed `sips` is a different decoder.** The reviewer's fresh decode of `painting.jpg` had a different md5
  from the canonical one and a seed four rows taller; outside the sandbox the bake reproduces byte for byte. Record
  the decoded inputs' digests in the bake, and ask a reviewer how its decode was produced before chasing a
  reproducibility defect.
- **A test that recomputes the mechanism does not cover the runtime.** The crossing test computed both offsets
  itself and would stay green if the drape went back to the normal offset. Drive the runtime function at the
  established crossing and assert on what it emits.

## E2 (the land), the plan and the build, 2026-10-21

- **A flat gate finds what the 3D capture hides.** The first 3D capture read as "thin strokes on a dark slab".
  Drawing the traced ribbons flat beside the painting's band showed four defects in one look: the sky's swirls
  on the island's back (a flat crest), the cypress's brown paint seeding ground strokes (the column too narrow),
  the houses' white and yellow on the apron (walls seeding), and a fill that read as planks (one pigment per
  row). Draw the strokes flat in the painting's frame before draping, every retune.
- **Check a uv-anchored map at both ends.** Anchoring the church's nave at 4.1 world per u put the right coast at
  u 1.07: the rim beyond x 1.77 had no painting under it. 4.75 puts the painting's right edge on the coast.
- **Stroke width in scan pixels is not stroke width on screen.** At the home camera the island shows the painting
  at 0.6 of its pixel size, and the fields' 15–31 scan-pixel strokes drew as 2–4 px lines. Measure the width on
  the capture at 1:1, then set the fraction; and the hills' strokes are the painting's broad ones, not the fields'.
- **One nominal coverage leaves a third bare.** 1,000 strokes covered the top once over and the dark solid showed
  through everywhere; the painting's layered strokes need about three. Count the coverage per region before
  the capture: a script over the drape gives it in seconds.
- **A colour rule cannot tell a pale wall from a lit hill slope.** Both are pale blue-grey. The village's
  footprint in the painting is authored data, like the masses' boxes; exclude it from the ground's support.
- **A multiply on a three `Color` is linear light.** `hills × 0.55` reads as 0.76 in sRGB (L 36), lighter than a
  quarter of the strokes; 0.3 linear is 0.58 in sRGB (L 28). Say which space a factor lives in.
- **A cluster's box is not a crown's height.** The orchard's 152 px box gave domes two houses tall, which read as
  balls; the bushes' 160 px a mound. Cap a dome at a house's eave and let the curls compress onto it.
- **Two scales, one asset.** The masses' curls want a σ 1.5 low-pass, the fields' straight strokes σ 3.5; pick per
  texel by the masses' dilated runs and bake one field. The support rides in B with the anisotropy; the masses
  set their own B from their runs, so the ground's admission starves no mass.
- **The column's fill is a translated copy, aligned to the crest.** Under the cypress the painting has no ground.
  Reading the band past the tree's right edge, at the same depth between the fields' top and the crest at the
  source's own u, continues the fields and the hills in their own style; the same v would have read sky.
- **Keep out of `src/` while the worker captures.** The capture reads the dev server off the working tree, so an
  edit mid-run lands in the frames. New files nothing imports are safe; wiring waits for the report.

## E2 (the land), the domes' second pass, 2026-10-21 (evening)

- **Two frames for one surface drift apart on a slope.** The domes stood on the terrain under their own centres while
  the strips' source frame rose from the mass centre's base; orchard-upper's left dome stood 0.74 heights above the
  frame, so its strips covered its lower quarter and its top was a bare disc against the sky (capture 4). The planned
  fix (more strips, a flatter `rz`, a lighter underpaint) would not have reached the top. Before choosing a fix for
  bare paint, count the coverage per region of the thing that is bare: a 24 × 24 grid over each dome's ellipse by
  third took a minute and named the cause (0.78 / 0.06 / 0.00). The fix was one line: the frame from the terrain
  under the point's own x, as the domes stand.
- **A probe with the tests' stub painting cannot speak for the runtime.** The 1 × 1 stub admits every texel, so the
  ribbons run past the painting's foliage and the coverage numbers are not the capture's. Decode the real painting
  for any coverage or colour claim; the stub is for geometry.
- **A coverage probe over an x-range reads a neighbour's strips.** `row-left` and `bushes` overlap in x at the same z,
  so the probe's 12,071 vertices on `row-left` were the bushes'. Filter by mass, or read the number as the pair's.
- **A "land-only" crop must be checked against the diff image.** The first G9 crop at the hump's crest held the sky's
  haze and a dome's edge against it and differed on 35% of its pixels; the diff image showed the land's own pixels
  grey. The crop under the crest (300 × 60 at 600, 600) differed on none.

## E2 (the land), Codex's code review, 2026-10-21 (night)

- **A solid's winding is only tested against the material's side.** `pushDome` wound every triangle inward and the
  domes' material culls back faces, so for three captures the far shell rendered and the back strips showed through
  the dome; nobody saw it, because the look still read as curls over a dark body. The index-bounds test passed.
  Assert every triangle's normal against the centroid's outward vector, and raycast from outside with the runtime
  material's side (Codex E2 F1).
- **A clamp that moves one coordinate breaks the constraint that set the others.** The contact clamp raised a lifted
  point in y and kept the rim's shallow z, which put it 0.033 inside the solid; the terrain test was green because
  it asserted terrain clearance only. Where two surfaces constrain a point, settle it on their contact (a
  bisection on the height, every candidate verified against both), and test both constraints on the emitted
  vertices (Codex E2 F2). Trimming the points instead cut one mass's back strips from 8 to 1; the mass's plane
  beyond the union's reach is the surface the plain clamp had been using, and keeping it kept every strip.
- **The third fetch is the one without the callback.** The painting's `useImageData` had no failure callback where
  the flow's and the masses' had, so a failed decode never released the ready latch (Codex E2 F3). When several
  loads feed one latch, list them and check each has the same failure path.
- **`a > b − ε || a < b + ε` is true for every a and b.** The one-way assertion in the heading test was a tautology
  (Codex E2 F5). An assertion about direction needs the direction decided once, then every step's sign.
- **A guard a reviewer can prove unreachable is dead code with a misleading test.** The two-step cycle guard could not
  fire under the sign continuity (two steps end at least √2 steps from two back), and its test stayed green with the
  guard removed (Codex E2 F6). Removing it is the fix; the test is renamed to what it proves.

## D1 (touch the land), the build and the gate, 2026-10-21

- **A dev server started by hand binds `localhost`, which is `::1` here, so a tool that dials `127.0.0.1` is
  refused.** The pinned-frame capture failed with "no canvas" against both servers while Playwright and curl on
  `localhost` worked; a patched copy of the tool printed Chrome's "127.0.0.1 refused to connect" page. Start Vite
  with `--host 127.0.0.1` when a script will reach it; `localhost` in a browser still resolves to it.
- **A pinned sky clock freezes every ramp that reads it.** With `__skyTime` pinned, a hover's amplitude stays at its
  t0 value of zero, so a headed test cannot compare pixels before and after a real hover at one pinned time. Read
  the stores for the input path and take the pixels from injected touches at pinned times with an explicit t0.
- **Differing pixels count area, not magnitude.** A 7% push moved 42,000 pixels and a full push 55,000: every
  sub-pixel shift changes an alpha-cut edge and a bristle lane. Use the count for "where", the crop for "how much".
- **A reviewer's "same field" finding can be met by removing data, not adding it.** R1 asked for a per-vertex height
  on the cypress to match the solid; evaluating the vertex's own local position in the shader gave the same field
  on both materials with no attribute at all.
- **The frame's hit test is one move behind the pointer.** A move onto the tree surged the sky before the next
  frame flipped the mask; asking the land once per hover step, inside B's 60 ms gate, closed it at a bounded cost.
- **Lint the brief before the dispatch, not after.** Two briefs went out with semicolon chains because the dispatch
  ran in the same command as the lint. Lint first, read the count, then send.

## E3 (the cypress's medium), 2026-10-22

- **Measure on the thing's own mask before naming a number.** The painting's tree measured over the whole crop
  rectangle read a luminance spread of 28 and 19% light; on the tree's own component it is 18.5 and 10.6%. The
  rectangle held the bushes at the tree's foot. Codex found the mismatch the same hour; the plan was corrected
  before its read landed, and the light-seed step it had justified became a reserve nobody needed.
- **The first recommendation was wrong at 1:1.** "Shorter strokes" came from memory of the painting; the 1:1 crop
  showed long vertical bands, which E1's lengths already matched. The difference was the colour along each band
  and the light-dark alternation. Look at the crop before recommending.
- **One colour per ribbon averages the bands it crosses.** 328 of 450 ribbons cross a brown band and a green one
  along their length; the per-ribbon mean, and a median in the same window, both flattened the spread to 9 against
  the painting's 18.5. The colour along the stroke, per kept step, brought it to 17.
- **A chroma boost tuned for a desaturated input oversaturates a faithful one.** E1's ×1.3 compensated the mean's
  flattening; with per-sample colours the tree came out greener than the painting (37% against 30% green-classed
  pixels). The chromatic check Codex insisted on found it; the bound itself was not the point, the control was.
- **The same slip twice: a new test file left out of `test:sky`.** D1's F5 and E3's F1. The command enumerates
  files, so a new suite runs only when added. Add the file in the same commit that creates it, and read the test
  count against the expected one before quoting it.
- **A metric the painting's canvas drives is not a stroke metric.** The 3 × 3 contrast at the render's scale reads
  11 on the painting and 2.5 to 3.4 on ours through four relief passes that moved it 0.9 in all; the painting's
  number is its bristle marks and the weave. The bands were judged by the gate's distributions and the crops; the
  relief stays a dial.
- **A shared shader needs a factory, not an edit.** The stroke body serves the cypress and the land; the cypress's
  new constants went through a factory whose defaults reproduce E1's text, pinned by hash, so the land's program
  did not move.

## E4 (the cypress's paint), the worker as the builder, 2026-10-22

- **A spike with a URL switch answers a taste question in twenty minutes.** "It feels like a jelly" became three
  shader treatments behind `?paint=`, captured and put beside the painting at 2×, and Mark picked one. The
  smoothing that mattered was not the gloss (treatment 1 changed little) but the edges and the gradients. The spike
  was thrown away and its patch kept as the plan's source.
- **A plan's "gate command" must be run before it is written down.** The capture command in the first plan never
  wrote the perf file, the gap band was measured on a width the alpha test had already cut, and the two checks
  defaulted to the Lead's port. Codex found the first two, the worker's buildability read the third. A command
  copied from memory is a claim.
- **Isolate a second mechanism into its own pass.** The smoothing change rode with the relief in the first plan, so
  a cut-out could not have been blamed on either. Pass 1 at ±3 and pass 2 at ±1, same treatment, same clock, made
  the read of the pair the decision.
- **A composite "at the render's scale" is not registered until the two trees are the same height.** The spike's
  painting panel was 1.6× the render's tree. The registered pair now comes from the silhouette alignment and the
  trunk run, not from a rectangle, because a fixed rectangle put the render's window half on sky.
- **A worker's visual reads can be sound while its report is not.** Gemini 4 Argon's reads of the crops matched
  the Lead's on every item, and its code matched the plan in every field. Its build report then named constants
  that were never in the code and GLSL that does not exist. Read the code and the logs for every number. The
  report's prose is a summary of what the model believes it did.
- **A box difference proves a bend somewhere, not the bend you changed.** Codex's F8: the solid underpaint bends
  too. The mutant that removes only the stroke bend, compared held against held, isolated the ribbons: 48.9% of
  the box, the whole body.
- **Run the gate's mutants in a checkout nobody else is using.** Codex was running its own mutants in the worker's
  worktree at the same time. A second worktree, detached at the branch head, kept the two from corrupting each
  other, and `git worktree add` refused the branch name until `--detach`.
- **Pre-existing lint errors in an ignored folder hide behind a worktree.** `eslint .` on the main checkout failed
  on four old scratch scripts; the clean worktree passed. Lint where the branch is, not where the scratch is.
- **Tunables:** E4's entry added to CLAUDE.md on 2026-10-22 (the cypress's paint fields and the ±1 smoothing). No
  existing tunable changed.

## 2026-10-23 — the street: a colour gate that passes does not make a place feel alive

Slice 1 spent five look passes and a day of colour gating on the street's paint (strokes, openings, windows, roofs, a
per-source ΔE gate that ended green). Mark's first live view: "flat and dull", against Simon Lee's village with its
breeze, fireflies and 3D feel. The causes were structural and visible from the first frame: unlit materials, nothing
moving in the street, no depth behind it. Each pass compared crops against the painting, and the painting is a flat
image, so the comparison could never see what was missing. Lesson: when the reference that matters is a living 3D
scene, compare against it live (motion, light, depth) before the first look pass, and show Mark the live view early,
not montages of stills. The colour gate measures drift from the painting; it says nothing about whether the place
reads as alive.

## 2026-10-23 (night) — the street S1b plan, revision 2 and 3

- **A sketch map's scale is a decision, and its dots are not footprints.** Revision 1 read the map at about 0.0016 per
  pixel and kept the table's sizes, so seven house pairs overlapped. Sweeping the scale against the layout tests found
  the first clean one (0.0024) in a minute. The map's tree dots were drawn at a third of the trees' reach, so the trees
  had to be placed, not read.
- **Area does not predict a stroked face's cost.** The Lead scaled S1's triangles by area and count and came in 4% to 6%
  under at every rung. Fable's probe with the real tracer found why: a wall's ribbon count goes with its width over its
  eave, so a cottage's 0.09-high walls cost three times a painting house's. Measure with the real builder before a
  budget decides anything. A probe that first reproduces the shipped count to the triangle is trustworthy.
- **Check what each camera frames before paying for it.** A plan-view bearing test over every station and orientation
  found one tree no station ever frames, about 36,000 triangles for nothing.
- **Keep a decimation's anchors.** "Every k-th sample and the ends" dropped the seed sample the drape anchors on, so 37
  ribbons vanished at stride 4. Before thinning a list, find every index another function looks up in it.
- **"agent_prompted" is not delivery.** The second brief's pointer landed in the worker's input box and Enter went to
  a background-task log viewer (the worker had left Vite running as a background task, which takes focus in the
  Antigravity CLI). The pane went idle in under a minute with the prompt unsent. Clear the input (Escape, then focus it,
  then ctrl+u), resend, and confirm the status turns to working within ten seconds.
- **Never swap files in a delegate's worktree, even while it sits idle.** A probe that ran `git checkout 2278cc5 -- src`
  and back in the worker's checkout left the tree clean but fired a hot update in its dev server. Probe old code with
  `git show <rev>:<path>` or in a worktree of your own.

## 2026-10-24 (overnight) — the street S1b, built, gated and reviewed while Mark slept

- **A check's PASS must prove the event it names happened.** Three times in one slice a check could pass on nothing:
  F8 (a readiness test of a pure function), C1 (a build counter that deleted itself) and C7 (a hang check that passed
  when its pattern matched no request). Make every check assert that its precondition fired (the hold, the second
  build) and give each failure its own message.
- **`process.exit` inside `try` skips `finally`.** Two browser checks exited on failure without closing Chrome, and five
  orphaned headless Chromes burned GPU through the night's perf runs, doubling the plain diorama's p95. Throw instead,
  and count headless Chromes before and after any perf run.
- **Under a 60 Hz lock, p95 is the timer's jitter.** The mean sat at 16.67 ms at every station while p95 moved 16.9 to
  18.4 between runs of one build. Read the mean and the max, run base and head back to back, and run several rounds
  before calling a station over its bar.
- **A gate tuned on a short street meets the fog on a long one.** The colour gate's two failures at stop 0 were the
  fog's deliberate blue on houses 1.4 to 1.8 away, which the 1.2 lane never placed in the counted range. Pushing the fog
  out in a throwaway edit proved the paint itself matched (12.5 → 3.4). Prove a cause by removing it, not by reasoning.
- **A grazing angle shows a face's base.** The darkest-tenth base that read as separation on a wall seen square read as
  black on the ground and on half-density walls seen at eye level. The mean (and the darkest 40% for the ground) fixed
  both, at no triangle cost.


## S1b look pass 3, the path (2026-10-24, morning)

- **Where the painting shows nothing, the live reference decides.** In S1's pass 5 the Lead cut the path's lift
  0.35 → 0.12 and its width 0.12 → 0.08, reading a pale path as wrong against the painting's dark ground. The painting
  has no path. Simon Lee's village does, and it is pale. At Mark's gate the path read as part of the ground, and the
  fix was the old values back, near enough. Before toning down something the painting does not contain, look at
  what the reference Mark judges by does with it.
- **A lifted base under clipped strokes shows its ruled edge.** A face's strokes are dropped where any column leaves
  the face, so near the camera they stop short of its edges. A dark base hid that. A pale one showed as a flat grey
  band with straight sides. Inset the base, so the strokes draw the edge.
- **A gate whose reference reads the build's own constant cannot judge that constant.** The path passed the colour
  gate at 0.12 and at 0.5. Its distance to the palette's hills (8.5 → 17.7) is the number that moved.
- **Check a fix from every view that looks at it.** The Lead checked the square's inset at stop 4 on desktop, where the
  lane's mouth is off frame. Fable's ID-pass row probe found the gap at stop 3 and on the phone at stop 4 (C8). A change
  to a shared face needs the stops that face the change, on both viewports, before it is called done.
- **Replace a section up to its own next heading, never up to a later named one.** The pickup rewrite cut from
  "Pickup" to "Mark's gate" and took eleven sections with it, the same slip as the night before (`a89e353`). It was
  caught before the commit by listing the headings. List the headings and read the diff's hunks before every commit of a
  record.

## The grass and the hand, a throwaway test (2026-10-24, afternoon)

- **A covered Playwright window runs at 1.5 fps.** The MCP browser slowed its frames to 1.5 per second whenever its
  window was covered, and `page.screenshot` then timed out at 30 s. The street without grass measured the same, so
  the cause was the window, not the scene. Call `page.bringToFront()` before every capture, and measure the frame
  rate after it.
- **The stroke body tapers both ends of a stroke.** Its shape reads `|along − 0.5|`, so a blade with along 0 to 1 was
  cut to a lens on top of its built taper, and short blades read as slivers. For a stroke that grows from a root,
  give the shader along 0.5 to 1, so it shapes only the tip.
- **Short grass seen from eye height does not cover the ground.** At 0.014 high the near blades left gaps, and the
  ground's long strokes read through them as planks. Twice the count at that height did not fix it. 0.024 did.
- **A trail needs a map, not touch points.** D1 holds four touches. A sweeping hand needs every point it passed: a
  256 × 256 map that fades each frame, read once by each blade. The street held 120 fps with it on (the cost itself
  is unmeasured).
- **A bent blade must change colour as well as shape.** The parting did not read at station 0 until bent blades turned
  paler, toward the moonlit crest. Jeroen's night trail reads for the same reason.

## Slice 2, Vincent and the walk (2026-10-24, evening)

- **The Lead stays idle while a delegate measures frame times.** Task 0's first perf run had single frames of 1.4 to
  1.9 s. They lined up with the Lead's own test, tsc and eslint runs on the same machine. The re-run with the Lead
  idle was clean, at 16.7 ms on every stop.
- **The canvas writes sRGB, so an ID channel of 128/255 reads back as 188.** S1b's thatch source gate expected 128.
  Every one of its ten logs says "thatch: not in view (0 px)", while the ID capture holds 4,599 px of (255, 188, 0).
  A gate that finds nothing must fail, not pass: a class with no pixels is an error.
- **A "present" check passes while one of two parts loses its class.** The crown and the brim each carried the hat
  class, so reverting either left the check green. Test each part where it sits on the model.
- **A dark palette is not a lighting fault.** Vincent's hat rendered near black. Unlit it was (51, 39, 35), and the
  palette's villageWarm swatch is #262119, so the colour was faithful. The shape was the fault: a straight crown
  read as a top hat. Measure the unlit colour before tuning the light.
- **Read `pmset -g log` before you call a stall or trust a frame time across a gap.** The Lead told Mark the worker
  was stuck for 1.5 hours. The Mac had slept from 15:11 to 17:04, and the sleep also reset Codex's connection twice.
  One perf round ran across the sleep (25.6 ms against 16.7 ms on its re-run). A round that spans a sleep is void.
- **A figure's underpaint takes the street's base-share rule.** The smock's source patch sat 0.41 from the reference,
  but its base was the patch's darkest 40%, and the gaps between strokes held the render at ΔE 10.5–11.6. With the
  base at the source's mean, as S1b's walls have it, the smock read 5.3–5.7. Check a new part against S1b's rules
  before you tune it.
- **Read a worker's report against its raw files.** Task 5's report named the five mutations under names that are not
  the script's. The raw `mutations.txt` showed the right five, all red. The report was wrong and the evidence right.
- **Send two synthetic events in one evaluate to test a same-frame race.** K1's bug is a wheel queued in the same
  frame as a stop. Between two evaluates a frame can run and consume the wheel, which would hide the bug (reasoned,
  not run). Case 6 sends each pair in one evaluate, and the two K1 mutants moved him by 0.167 and 0.080.
- **A builder's read finds what a correctness read does not.** Codex confirmed revision 3 of slice 3's plan. The
  worker, reading as its builder, then found ten gaps: a seam no task defined, a seed, a release rule, a command.
  None changed the design, and each would have stopped the build.
- **Probe a check's fixed screen point at every stop and viewport it runs at.** The grass sweep's side of the lane
  is on screen at stop 0 in both viewports. At stop 2 the phone's frame cuts it off (x −39 on a 390 px canvas), and
  an along-the-lane sweep there moves only 30 px. The sweep now crosses the verge on each stop's own side.
- **Close the Playwright browser when a capture ends, and read the power state before a perf round.** At 18:15 the
  Mac was on a 30 W charger and still drained the battery at 21 W, at 28%, with thermal pressure moderate. The
  session's Playwright browser had run for 5 h 45 min with three street tabs rendering, its background throttling
  off. Closed, the battery charged at 22.7 W and the pressure fell to nominal. Read `pmset -g batt` and
  `notifyutil -g com.apple.system.thermalpressurelevel` before you measure frame times.
- **Measure a part against its neighbours, not only against its reference.** The smock passed the colour gate at 5.3
  from its reference, and Mark saw it blend into the ground. Its source was the ground's own grey-blue with pale
  strokes, so the figure carried the ground's pattern. The gate checks drift from a source. Whether a figure stands out
  is a second measure: its ΔE and chroma against the pixels around it.
- **A tree reads by its fork and its gaps, not its trunk's width.** At stop 0 the old trunk was already 13 px wide. It
  read as a pole because it forked at 1.4 R and its clumps touched. The fix was a low fork, smaller clumps and curls
  shorter than a clump. Size a part in pixels at the stops before you thicken it.
- **A gate's target must not come from the constant the builder reads.** Look pass 3 moved the smock's source and
  pointed the gate and the unit test at the same rectangle, so both passed whatever the source was. Codex found the
  smock 18.8 from the palette's nearest blue, past the locked bar of 10. A target read from `palette.json` catches a
  bad source. A source-fidelity check is a second assertion, not a replacement (Codex T1, 2026-10-24).
- **A clearance test must bound the geometry the code builds, not a radius written beside it.** The layout test kept
  trees clear of houses with 1.19 R. The crowns reached 1.39–1.41 R, and one tree reached into a house. The test now
  measures each tree's reach from its built vertices, so it follows the generator when a look pass changes it (Codex
  T2, 2026-10-24).
- **Count a source's texels by hue before writing a colour rule for it.** The grass test kept three blades in four green
  or ochre. The painting's bushes are 65% blue and blue-black, so the rule refused most of the painting, and the pale
  end of six picks found the canvas's beige instead. A ten-line hue count (`t1/hues.py`) showed both in a second
  (S3 Task 1, 2026-10-24).
- **Judge a segment count at the painting's stroke length, not zoomed.** Four segments looked smoother than three at
  2.5×, and the same at 1:1. Two against three differed at 1:1 only on the longest blades. The zoom answers "can I see
  a facet", the 1:1 answers "does it read as the stroke" (S3 Task 1, 2026-10-24).

## 2026-10-24 — a check's URL parameter the app never reads passes in silence (street S3, Task 4)

Case 2 of `check-street-grass.mjs` asked for "the same pinned time" and passed `pinnedTime=1.0`. No file in `src`
reads that parameter. The case passed only because `ids=1` happened to leave the life clock unwritten. A gate reads
every parameter a check passes and greps `src` for it. A pin also needs a control: two captures without the stimulus
must be byte-identical before the stimulus's difference means anything.

## 2026-10-25 (overnight) — street S3, Tasks 5 and 6: the gate's runs and the look passes

- **Read the URL in the raw output before you read a perf number.** The worker's perf rounds dropped `&street=1`, so
  all 35 timed the painting at 1,444,930 triangles. The report's table looked right. The frames file's `url` and the
  triangle count showed it in one line each (T5-1).
- **A one-time frame inside the timing window lifts the mean, not the steady state.** `readPerf` keeps the last 599
  intervals after an 11.8 s wait. The grass made the street's build 0.5–0.8 s longer, so its last frame now falls
  inside that window, and one 1.6 s interval reads as a mean of 20 ms. Report p50, p95 and the mean without the
  largest interval beside the mean, and say which frame the max is.
- **A check's escape hatch must be named, not implied.** The capture tool skipped its pinned-clock self-check for any
  `--eval`, to let one moving capture through. Every pinned capture with a touch lost the check. A `--moving` flag
  opts out by name (T5-4).
- **Two segments fold a curved blade into a chevron.** Pass 1 dropped a segment to afford more blades. At 2× each
  blade bent once, sharply. A longer blade with three segments covered the verge at lower density.
- **A dark base under sparse strokes is what the colour gate measures.** The ground's class covers the grass's base.
  With the blades spread thin, the base was most of the ground that showed, and its ΔE76 went from 1.5 to 11.2. A
  lighter base (the field's darkest 40%, not 20%) and more coverage closed it, not a change to the ground.
- **A triangle budget is not monotone in density.** The chunks' placement changes with density. 0.21 and 0.205 failed
  the budget and 0.203 met it but failed two other tests. Search the density near the bound and run the whole suite at
  each value.
- **A wind whose heading turns fast reads as circling, not wind.** A heading of 1.6 rad a second turned each tip in a
  small circle. One direction with a 0.3 rad wobble and gusts that travel across the verge read as wind.
- **A bound far above what correct code reads lets a mutant through.** Case 4 allowed 1 px, correct code read 0.00 px,
  and a stale camera matrix read 0.90 px. Set a bound from what correct code reads and what the mutant reads, not from
  a round number (G8).
- **A headed Playwright screenshot can send a pointer move.** It fires at the mouse's last place and wakes a hover
  effect. Drive a hover test through a page seam, not the real pointer.
- **A new part in front of an old one changes the old one's colour gate.** The grass hid the walls' dark foot at stop 2,
  and the walls moved from 9.82 to 10.17 with no wall pixel changed. Compare the old class's mask before and after
  before you call a colour drift.
- **A part that borrows another part's input must work when that part is off.** The grass followed a touch through the
  walk's gesture and relied on the walk's `touch-action: none`. With `?walk=0` it had neither, and a drag bent one spot
  (Codex, PR #22). Run each flag that turns a part off against the parts that read it.
- **Answer a review with every route to the fault, not only the one it names.** The fix for that finding needed the
  pointer and the `touch-action`. A test that removed each half alone showed both were needed.
- **Read the PR's CI before you call the gate passed.** The grass test read a derived file that only the Lead's
  worktree links, so every local run passed and every CI run failed with ENOENT. Run the suite once with
  `reference/derived` hidden before you push a test that reads a file (PR #22, 2026-10-25).

## 2026-10-25 — street S3b, Tasks 0 and 1: the baselines and the moon on the blade

- **`__streetReady` never waited for the sky.** On a loaded machine (Codex was running probes) a capture took the
  street before the sky had built, and a pinned pair differed between runs (`t0/first-try/`, stop 4 on the phone with no
  sky). A 24-capture retest on a quiet machine passed under both waits, so timing alone proved nothing. The pair with no
  sky did. The sky now writes `window.__skyReady`, and every capture that draws the sky waits for both.
- **A seam's consumer must know which pages never produce it.** The ID view does not mount the sky
  (`DioramaExperience.tsx:327`), so a wait on `__skyReady` timed out on all eight ID captures. Read the producer's mount
  condition before you add a wait to every caller (Codex C1).
- **A checker that guesses file names can read the wrong time.** `check-street-colour.ts` looked for `-t5.png` and then
  `.png`. A time-0 pair was missing to it, and a stale time-5 image beside it would have been read with time-0
  metadata. `--time T` reads `-tT.png` only and checks the metadata's times (Codex C2).
- **The blade's texel filter refused the lit edges it was meant to show.** `grassTexelUsable` drops the light grey of the
  canvas, and the painting's lit bush edges are pale grey-green. Only 7 of the bushes' 347 lightest texels passed it.
  The top colour has its own rule, which keeps the grey and still refuses near-white and brown (Codex R2).
- **Register lit, unlit and ID captures at one clock.** At time 5 the lit page's wind moved the blades and the unlit
  page's did not, so one ID mask could not fit both. At pinned time 0 every page's wind is at 0 (Codex R4).
- **A numerical test of a shader function does not test its call.** Case 14 checks `grassMoonFacing` by number, but a
  call with `yaw` 0 would still pass it. The facing takes the vertex function's own argument text, one constant, and a
  test pins both calls to it (Codex R7). Make the wrong call impossible to write, then test that.
- **Measure main before you set a bound on a change.** Case 15 asked the hand to raise the mean L* within 80 px by 2.
  Main's own grass raises it by 0.55, so the bound tested nothing about the moon. Counting the pixels the hand brightens,
  lit against unlit, gave 1.01 for the build and 0.65 for a mutant with the lift off.
- **A multisampled ID view has blended edges.** The lit change's "far" pixels were all quarter, half and three-quarter
  blends of the grass's ID colour with another class, at blades thinner than a pixel. A mask of pure ID colours misses
  them. Decompose the blend before you call a pixel "not grass".
- **A hard-coded loop count hides a changed list.** `grassChunks` looped over three bands with `bi < 3`. A probe that
  split the outer band built only three of four, and its triangle counts looked like a saving. The loop now follows
  `GRASS.bands`. Count the chunks a probe builds before you trust its totals.
- **A new draw in the layout's random stream moves the budget by several percent.** Drawing the curl's side for every
  blade changed every later draw, and the walk's worst point at density 0.18 went from 95% to 104%. Rerun the budget
  test after any change to what `clump` draws, not only after a change of density.
- **A chunk that is partly in view draws all its blades.** At the walk's worst point 46% of the drawn blades were off
  screen. Halving the chunks' length cut the triangles by 15% at the cost of about twice the draw calls.

- **A blade that leans one way and curls the other stands up.** After Task 2 about half the blades read upright: the
  fan's lean was signed at random and the curl followed the clump's side. Leaning the whole clump toward its side
  (`leanToSide` 0.35, `fan` 0.5 → 0.3, `turn` 0.5 → 0.3, `GRASS_LIGHT.top` 0.6 → 0.75, `edge` 1) laid the clumps
  over in low arcs (S3b look pass 1).
- **A colour mixed in the vertex shader cannot be shaped across a two-column ribbon.** The moon's edge ramp ran linearly
  over the blade's whole width. The mix moved to the fragment, before the stroke body, on `vStroke.y` (S3b look pass 2).
- **Draw the weight in a loud colour before you tune its strength.** Pass 2's light was invisible. One capture with the
  weight drawn in red showed it on the right place and at most 0.65 strong, so pass 3 tuned the strength, not the place.
- **A light band at a stroke's edge falls where the alpha test cuts the stroke.** Pass 3's light was strongest at the
  outer edge, and that edge is the part of the shaped stroke that is discarded. Reach full strength inside the band
  (S3b look pass 4).
- **Ramps that multiply leave the light under half.** The facing, the length and the width each eased from 0 to 1, and
  their product rarely passed 0.5. Measure what the change adds, lit against unlit, before you raise any one of them:
  pass 3 raised `top` and moved nothing.
- **Probe the last pass's values before you spend it.** Four throwaway captures at two stops (A–D) bracketed the
  painting's L > 60 share. Pass 4 then took one value (S3b: `facing` [0.55, 0.75], `edge` 0.5, `along` [0.2, 0.5],
  `top` 1.0, `topShare` 0.02).
- **zsh reads `$V:c` in a string as a modifier.** `"colour/full-s$S-$V:colour/ids-s$S-$V"` lost a character, so the
  unlit look lines never reached `look.txt` and nothing failed. Brace every variable next to a colon: `${V}:`.
- **Test a morphology helper on a mask with an edge.** `grass-look.ts` grew the zeros and shrank the ones, and its only
  tests used masks that were all ones or all zeros. Every look figure in S3b's Task 3 measured the blades alone. One test
  with a single pixel in a field would have shown it (Codex B1).
- **`tsc --noEmit -p .` checks nothing in this repo.** The root `tsconfig.json` only references the others, so a
  backtick that ended a GLSL template string passed it. Use `npx tsc -b`.
- **A hash test that only says "differs" protects nothing.** The lit program's test required its text to differ from
  the unlit one, so a mutant that inverted the moon's edge passed. Pin the behaviour: evaluate the compiled expression
  against what the geometry says (Codex B3).
- **A weaker stamp does not release a held press.** The trail keeps a held texel at the stronger of its targets, so
  scaling a stamp's amplitude made a hover weaker only on fresh texels. A press lifted under a hover stayed at full
  strength until the hand left. A change of strength needs its own release (`releaseSource`; Codex F1, S3b pass 5).
- **An identity gate holds only in the right order.** The base alone could be proven against Task 4's ID frames, and
  the frog then makes those frames differ by design. Prove each change's identity before the next visible one lands,
  then compare the rest of the frame (Codex F3).
- **A frog that only sinks its eyes shows them below the socket.** Shrink and sink together, each eye about its own
  pivot, so the closed eye hides inside the head (S3b pass 5, look pass 3).
- **Place a creature where it would live, then find the spot there that the camera sees.** Visibility put the frog on
  the pale path, and Mark asked why it was not in the grass. A search of the verge for gaps the grass already leaves,
  with each gap's screen position on both viewports, found one in frame on the phone with 13 blades round it.
- **Read a capture's size before projecting into it.** A helper that assumed 1280 × 800 cropped empty grass. The
  desktop captures are 1600 × 900 and the phone's 390 × 844 at a scale of 1.
- **`git checkout` cannot restore an untracked file.** A mutation run backed a new file up with `cp a || cp b`, then
  restored with `git checkout || cp b`. Both restores missed and two mutants stayed in the file. Back up to one fixed
  path and restore from it.
- **A screenshot of a visible browser reports the real cursor.** Mid-press, Playwright's screenshot made Chrome send a
  `pointerleave` and a move to the Mac's own cursor, with no button down, so the scripted press ended. A fix for a
  move in place went in before the event's position was logged, and it guarded nothing real. Log the event's position
  and target before you name its cause. Drive a recorded hand through the seam, which ignores the real pointer.
- **A guard marker must be made or the run must stop.** The church's perf script touched `t4/PERF-RUNNING` at the
  repo's root, a folder that did not exist, so `touch` failed and the run went on. The reviewer's brief checked that
  path, found nothing, and ran its unit tests during the measurement. Make the folder, and stop the run when the
  marker cannot be made (the church slice, 2026-10-25).
- **An edit to a source file reloads a page that is being measured.** The dev server's hot reload reaches any open
  page, so three comment fixes made during a perf round put that round in doubt. During perf, edit only files outside
  the app's module graph (`tasks/*.md`, `CLAUDE.md`), or wait.
- **A report built beside the geometry is not evidence of the geometry.** The church's door and window tests read
  values the builder computed next to its draw calls, so removing a draw call left them green. Have the drawing
  function return what it drew, and build the report from that (Codex C1).
- **A sweep belongs to a commit.** Task 3's triangle sweep ran three minutes before the door's last change, so the
  record carried a count from a build that was never committed. Run the sweep on the committed head, or say which
  build it read.
- **The canvas is a second React root, and it commits a frame or more after the page.** The portal's return did not
  fade: in the frames between the page's `leaving` and the canvas's, the driver still ran the street's finished fade
  and hid the copy the leave had just made. Guard a per-place effect so it runs once, and expect the canvas to see a
  place late (the portal, Task 3).
- **R3F reports a caught error as a page error.** Its `createRoot` passes `reportError` as `onCaughtError`, so an
  error boundary inside the canvas still fires the page's error event. A check that fails on any page error must
  accept that one error by its text, in that case only (the portal, Task 6).
- **A screenshot waits for the main thread, and a compositor animation does not.** During the street's 1.5 s build,
  timed screenshots came back at 0, 188 and 1,948 ms. A CDP screencast showed 155 distinct frames inside that long
  task. To judge motion during a long task, read the screencast (the portal, look pass 1).
- **Start a hand-off at the last motion's speed, not at rest.** A smoothstep is at rest only at its last instant: the
  flight's push-in is 10% a second at s 0.98 and 2.2% on its last frame. A drift that started at rest read as a stop.
  A frame-difference profile across the hand-off (change per 100 ms) showed it: 14, then 0.7 (the portal, pass 2).
- **A triangle count that differs between two pages is not yet a defect.** The phone's home read 2 triangles more than
  the home after a return, in all five rounds. The same plain page reads both counts over 300 frames, because one draw
  at the narrow frustum's edge comes and goes with time. Sample many frames, and compare the scene's objects, before
  you name a cause (the portal, Task 8).
- **A test that rebuilds the code's rule cannot catch the code ignoring it.** The frogs' draw tests computed `d < draw`
  from the table, so a cull that drew every frog, hid every frog or kept one common 0.5 still passed. Read the state
  the component left (`__frogsDrawn`), judge it by the check's own distances, and run the regressions against it
  (the frogs, Codex F1).
- **A phone's touch cost does not show on the Mac.** On an iPhone 17 Pro Max the painting held 60 fps still and fell
  to 18–50 under a finger, and `touch=0` restored it. The Mac, at 4× CPU throttle and with vsync off, showed no touch
  cost: 15 live surges and 3 land touches cost nothing measurable. The phone's `?perf=1` readout and URL flags are the
  loop (2026-10-25, Mark's first real-device reading). Two drags split it: `?bend=0` held 60, `?surge=0` read 38–60, so
  the land's ray cast was the cost, not the sky's surge Mark first suspected. With a finger kept off the land, 60.
- **A check run straight after a reload can catch the page still moving.** The walk check's K1 failed once after the
  studio's stash reloaded the dev server, then passed on the branch and its base. Wait for the reload to settle, and
  run a failing check twice before naming a defect (the frogs, Task 4).

## 2026-10-25 (late) — the loading curtain

- **Chrome's network emulation cannot show a fetch priority.** It divides the throughput evenly between open
  requests, and `vite preview` serves HTTP/1.1. So `fetchpriority="high"` on the curtain's painting moved nothing:
  20.7 s on slow 4G before and after, to within a few milliseconds. A priority's effect needs a real HTTP/2 server
  and a real link. Do not report it as measured from the emulation.
- **A page with no WebGL keeps React's tree.** R3F's context error does not unmount the root, so a fix that assumed
  "the root unmounts" (the Consultant's P2) left React's copy of the loading cue up for ever. The gate's browser
  check with `getContext` stubbed to null found it. A failure path gets its own browser run at the gate, not a
  reading of what the framework should do. The same run showed R3F's context failure reaches the page as an unhandled
  rejection, not a window `error`: a listener on `error` alone never fired.
- **A test of an inline script can run the script itself.** A13 slices the classic script out of `index.html` and
  runs it with `new Function` over stubbed `location`, `sessionStorage`, `matchMedia` and `document`. The rule then
  lives in one place, the page, and a change to it fails the test.

## 2026-10-25 (late) — the phone framing

- **A fixed vertical fov is a framing tuned for one aspect.** Candidate C was chosen across aspects 0.45 to 0.46. An
  in-app browser's bars made Mark's phone 0.60, and the same height of world across more width drew the whole
  composition at three quarters of its chosen size. A portrait framing that must hold a landscape subject holds its
  horizontal field, and the vertical fov follows the aspect.
- **Read the viewport off the phone, not off a screenshot.** I estimated 440 × 820 from the screenshot. The advisor
  read the bars as an in-app browser's and put it at about 440 × 735. `?perf=1` already prints
  `innerWidth × innerHeight @ devicePixelRatio`, so the next framing question starts with Mark reading that line.
- **A lens prop reaches every camera user.** The street's walk writes its lens only when the orientation flips. A
  diorama lens on the camera element's prop, re-applied on every resize, would have reached the street on a resize
  that keeps the orientation. A per-place value belongs in an effect gated on the place.
- **A probe on its own frame callback sees React's state before the frame loop acts on it.** Case 2b's recorder
  samples `place` from a ref on `requestAnimationFrame`. It caught one `leaving` sample before the driver's first
  leaving frame had written the lens. Filter such samples by what the visitor sees (the layer at 1), not by position
  in the list, and prove the filter with a mutation that must still fail.

## 2026-10-25 (late) — the village craft design

- **Read the code a design names before giving it values.** The craft design's builder check asked eleven questions,
  and seven began from a claim the code contradicted: the street's windows do not glimmer, R5 is a fourth cottage, the
  plaster's measured width differs, every street layer is one mesh, so the triangle count is global. Each was a value
  written from memory of the diorama or the plan, not from the file (2026-10-25, the Consultant's builder check).
- **A test file outside `test:sky`'s list never runs in the gate.** `package.json:22` names each test file. A plan
  that adds one must add it there in the same task, or the gate passes with the new test red (Codex F3 on K1's plan).
- **An exclusion inside a seeded generator moves everything after it.** `grassChunks` draws every blade from one
  `mulberry32(1)` stream. Rejecting a candidate earlier changes every later draw, so a local clearing moved blades
  into the frogs' gaps far from it. A local change to seeded output filters after the generation (Codex F1, the
  worker agreeing).


## 2026-10-26 — the village craft, K1 (the houses)

- **A capture taken before the sky and the cypress load is not a base.** K1's first base captures showed an empty
  sky and no tree, so every pair looked like a change. `CAPTURE_SETTLE_MS=4000` waits for them. Recapture the base
  the same way before any pass is compared to it (`E/t0/base-settled/`).
- **A part laid over the strokes' top reads as pasted on.** The door's band at 0.0046 sat above every wall stroke,
  the one surface no stroke touched, and read as a flat grey plate. At 0.001, under the strokes, they cross its edges
  and it reads as the wall's paint (A2). Paint-like parts go under the strokes. Ink goes over them.
- **Check a part's height against the roof that hangs over it.** A cottage's band stopped at 0.99 of the wall and
  pierced the thatch's slab by 6.5 mm, which showed as a pale bar on the roof at stop 4 (A1). A probe that projects
  every part into the frame named the part in one run (`scratchpad/probe/which-part.ts`).
- **A colour knob's effect differs by source. Read it in Lab before trusting the full frame.** `base` 1 cut the
  streaks at full frame, but it lifted the dark houses by L 11 to 16 and the plaster by only 5, where the streaks are.
  The palette gate caught it (walls' ΔE up 3 to 6). Pass 3 put `base` back to 0.
- **A test that loops over reported parts proves nothing when a part goes missing.** The levels test checked each
  leaf's ink range only where one was reported, so removing the ink kept it green (Codex F1). Require the expected
  part and its count first, then check its values.


## 2026-10-26 (night) — the village craft, K2's plan

- **A check at the stations misses the walk between them.** Revision 0 kept every lantern 0.35 from each station's
  camera, and the walk between the stops still passed four at 0.14 to 0.25, their halos 1.1 to 1.8 screen heights
  (Codex F4). A part the camera can pass gets its check over every walk sample, not only the stops.
- **A test over every camera can fail on a view nobody sees.** The pool-against-frog test, run from all five stops,
  failed at the fix: from stop 0, rays to frog 3 1.5 away crossed lamp 4's pool, under a pixel of the frog affected.
  Scope a regression test to the view the defect was found in (the frog's own stop), and write the excluded case into
  the plan for Mark's eye, not into the test's tolerance.
- **A knob range can eat a margin a test holds.** W3's clearing has 0.00015 to spare at frog 3's ring, so revision 0's
  "lane-side margin 0.012 to 0.03" knob would have broken the ring test at its first step. Read each knob's range
  against the tightest margin it moves before the plan offers it.

- **A cost by area is wrong by three against the generator.** K3's revision 0 priced the door paths at the lane's 92,000
  triangles per unit of area: 17,600. The real tracer gives 50,000 for the same strips. A ribbon costs about 250
  triangles whatever its length, and a narrow face takes more ribbons per unit of area (Codex K3-F2). Price a part by
  running the generator on its faces, never by area.
- **A probe that checks an endpoint passes a route that crosses a wall.** Revision 0's R2 route landed past W2's end and
  was called clear because its end was. Its second leg cut the wall (Codex K3-F1). Check every leg over its full width,
  and build the route the design describes, not a stand-in for it.
- **"Painted exactly as X" carries X's stroke scale.** The lane's stroke size on a 0.06-wide path gives one clipped
  stroke across, a hard-edged ribbon (the Consultant's Q2). When a part borrows another's paint, state its own reference
  height.

- **A plan's colour share needs a lightness probe before the build, not after the first capture** (K2's look
  passes 1 to 3, 2026-10-26). wallA's darkest 40% is L 4.7 and 57% of its texels
  are under L 20, so the walls read black with pale flecks (`E2/probe/lead-k2-wall-sources.mjs`, a minute to run).
  Both plan reviews passed the number. The street's convention is the houses' (K1): an object's base is its source's
  mean, and its strokes sit on it. "Dry stone with dark mortar" (the base at the darkest 40%) read as a black barrier
  with leaves on it in three recipes; the painted-wall convention read as a wall in one.
- **An in-place probe settles a look pass's knobs before a worker round** (K2 pass 3, 2026-10-26): patch the literals
  (`E/tools/k2-wall-variant.py`), capture one stop, crop at 1:1, restore the tree (`k2-wall-probe.sh`). Three recipes
  cost four minutes. It counts as a pass against the cap, and it saved a worker round and a Codex read on a guess.
- **A green suite under Node's type stripping proves neither the type check nor the lint** (Codex's K2 branch
  review, 2026-10-26). Node's type stripping runs the suite without the type check, so 396 green tests
  hid two unused imports that fail `npx tsc -b` and four that fail `npm run lint` (F2). The Lead's checks before the
  look passes now include both, not only the gate script. And a mutation's red must come from the named mutation
  alone: mutation 3's red came from an extra edit of the report's ranges, and the pure omission stayed green (F3).
- **Do not commit on a branch after dispatching a worker whose brief pins its head** (K2's fix round, 2026-10-26). The
  Lead committed docs 20 seconds before the worker ran Step 0's `git rev-parse` check, so the worker saw a head the
  brief did not name. Pin the brief to the code commit (`5806c1c`) and allow docs on top, or hold every commit until
  the worker reports.
- **A browser check's measured point is a premise, and a new object near it changes what the check measures** (K2's
  gate, 2026-10-27). The grass check's case 15 counts the pixels the hand brightens at `laneAt(0.12, 0.15)`. K2 put lamp 1's
  pool 0.063 from that point, so a bent blade over the pale pool darkens the pixel and the count fell to 0.74 of the
  unlit page's (K1 1.07). The hand's push was as visible as before. Diagnose such a failure by geometry first (the
  distances from the point to every new object, one node script) before any browser run, and name the premise the
  check carried.
- **A replacement point for a check must carry the check's control, patched on the same term** (K2's gate, 2026-10-27).
  Point B (0.12, +0.32) passed on both builds with identical counts, but S3b's check had a control (0.65 with the hand's
  lift off). The first control runs patched the moon's term and read 0.98 to 1.00 everywhere, a wasted set of four runs:
  read the original record's control to the knob (`uLift`, not `GRASS_LIGHT.top`) before patching. A point without a
  discriminating control is a weaker check, whatever its pass.

## 2026-10-27 (evening) — K2 pass 5, the stone wall

- **A dab's look is set by the stroke body before any literal** (K2 passes 1 to 4, 2026-10-26 to 27). The street's
  stroke body draws every stroke as a flame (a pointed head, the tail 0.72, the dry brush from 0.55), so a stone given
  the whole stroke drew as a leaf with gaps a third of its length whatever the joint literal said, and three body shares
  read the same. Mark read the wall as concrete. Before tuning a part's literals, read the shader its ribbons go
  through, and give a part the stroke's range that draws its shape (a stone: the full-bodied middle, 0.3 to 0.7).
- **Four in-place recipes at one stop settle a look in twenty minutes** (pass 5, 2026-10-27). The probe patched the
  literals and the loop, captured stop 0, cropped at 1:1 and restored, four times, and Mark chose from one stacked
  image. The same question through a worker round and a Codex read would have cost an evening.
- **A waiter on a report section must match the heading loosely** (pass 5's fix round, 2026-10-27). The brief said
  "append a section `## Fix round 1`", the worker wrote `## 8. Fix Round 1 (Codex F3)`, and the waiter's exact grep
  never fired: the fix sat finished for eleven minutes until Mark asked why every pane was idle. Match the section with
  `grep -i` on one word, or watch the report's mtime, and treat the pane's `done` state as a second signal.
- **A brief file in the worker's evidence folder is a dispatch** (2026-10-27). The Lead drafted the fix brief into
  `k2/t6/` to send after the worker's report. The worker listed its folder at the end of its own brief, found the file
  and ran it, unasked. It did the right work, but a draft the Lead meant to revise would have run as written. Keep
  drafts in the Lead's scratchpad and copy a brief into the evidence folder only when it is sent.
- **A mutation artefact's diff goes stale when a later commit touches its hunk** (pass 5, mutation 6). The worker
  recorded mutation 6 against its wall commit, then the fix round added two comment lines above the hunk, and the
  gate's `git apply` of the artefact failed at the new head. The gate applied the mutation by its line's text and it
  went red. Record each mutation's diff at the head the gate will run it on, or write the mutation as a text
  substitution.
- **A second dev server over the same `node_modules` link re-optimises the first's dependency cache, and a mutation
  run leaves HMR state** (pass 5's gate, 2026-10-27). The walk check's case 6 failed twice on the lane's server after
  the mutations and after K1's server started on 5205 ("re-optimizing dependencies because vite config has changed"
  in both logs, a failed module fetch in the lane's), and passed on K1 in the same minute and on the lane's server
  restarted alone. The grass check's case 4 failed the same way. Restart the server under test after a mutation run
  and before the browser gates, with no other server up, and read both servers' logs when a timing case fails.

## 2026-10-27 (night) — K3's plan and Task 1

- **Moving a wall's end re-runs every test that measures the wall, not only the ones the change names** (K3 Task 1,
  2026-10-27). The plan expected the full suite to pass with W2 at 0.41, and both plan reads ran only the grass and frog
  tests against it. K2's flush test failed: two courses stopped 0.008 and 0.0126 short of the new head. The planner
  sized the last stone from the lane's speed at the stone's start, and near `t` 0.41 that speed rises 15% across one
  stone. The old end at 0.47 sat on a steadier stretch, so K2 never showed it. The formula was the Lead's, from K2 pass 5's brief
  (`k2/t6/brief-k2-pass5.md:77`, "so the course ends at the wall head whatever the walk's curvature error"). The worker
  built it as written, and the Lead's K2 gate passed it. A plan that moves a K2 geometry
  parameter now names the K2 tests that read it, and a probe runs them before the plan claims the suite passes.
- **"Seen from stop N" is a distance unless a frame proves it** (K3's plan, 2026-10-27). The design named a stop for each
  object, measured as the distance from the stop to the door. None of the three is in frame at its stop. The probe that
  projects each object from every walk pose took a minute and changed the look pass's crops and Mark's gate brief.

## 2026-10-28 (overnight) — K3's build, review and gate

- **A worker's task step that names the suites but not tsc and lint lets the build break the compiler** (K3 Tasks 2 to
  4, Codex F1). Every task's suite passed, and the branch still had five tsc errors and six lint errors: unused imports
  and locals, and a `side` that `as const` typed as the literal `1`, so the plan's `=== -1` branch did not compile. The
  gate would have caught it at Task 6, after the look passes. A build brief now asks for `npx tsc -b` and
  `npm run -s lint` in each task's green step.
- **A test that pins an exact sample count over a tunable rejects the plan's own range** (K3 Task 3, Codex F2). The leaf
  test asserted 816 rays, the count at `PLANT.scale` 0.7. At 0.6 and 0.8, both inside the plan's range, leaf points cross
  the frame's edge and the count moves. Assert what must hold at every setting (each ray hits, each side point misses,
  the named counterexample is cast) and keep a measured count in the record, not in the test.
- **A base inset across its width but not at a free end shows as a slab** (K3 look pass 1, R1's path). A stroke ends
  short of its clip, so the base ran past the strokes as a flat pale quad with a hard edge, and the path read as paving.
  K2's square insets its base on all four sides. Inset a base at every edge that is not shared with another face.
- **A capture helper that waits on a hook another flag turns off times out without a word** (K3 look pass 1). The helper
  waited for `__vincentBox`, the shots passed `vincent=0`, and each shot ran its 60 s timeout before failing. Wait on
  a hook every mode has (`__streetWalk`), and print the wait condition when it times out.
- **A `clad` face costs about 4 ms however few strokes it draws** (K3's gate, the build's time). The 14 path legs draw
  93 ribbons at a quarter of the lane's cover and still cost 62 ms, because `traceFace` resamples a 64-row flow crop
  over each face, and a long narrow leg gives a wide crop. The plan counted triangles, not faces, and the build came in
  10.9% over K2's against a 10% bound. A plan that adds faces probes the build's time per face before it sets a bound.

## 2026-10-28 — V1, Vincent's form: the build, review and gate

- **Motion on the frame's real time breaks a pinned capture** (V1's gate, the portal's case 9). The capture seam pins
  the sky, the street's life and the frogs. The walk's state never followed it, and V1's turn and lantern swing are walk
  state, so a capture 2.5 s after load caught him mid-turn on every run. The fix went in the shared capture script, not
  in each caller: it waits for `__vincentForm().settled` after any eval, which also covers a portal entry that first
  shows him after the eval. New motion either follows `__skyTime` or reports when it rests.
- **A check that sleeps a fixed time reads a pose mid-animation** (V1 Task 3, the walk check's K3 leg). Two loads read
  500 ms after ready moved his box 3.39 px with the anchor's offset right. Poll the state that ends the animation, then
  wait about six times the slowest lag's τ.
- **Judge a multiplicative light by its footprint, not by eye** (V1 look pass 1). The lantern's lift multiplies the
  paint, so at reach 0.05 it showed only on the pale path. The Lead's eye read reach 0.08 as dimmer. The frame against
  the term off, stretched, settled it: 15,222 px lit against 4,937, no pixel more than 21 of 255 brighter.
- **Commit before a mutation that restores to HEAD** (V1, the B1 and B2 fixes). The Lead's helper restored each mutated
  file to HEAD while the fixes were uncommitted, which wiped the fixes and voided two results. The Task 2 builder had
  committed first for this reason.
- **Do not run unit-test batches beside browser checks** (V1's gate). The mutation runner, Codex and a build put the
  load average at 12.7. The grass check's 200 ms read after a pin and the portal's 1.5 s damping wait both failed, and
  both passed alone. A separate checkout keeps edits from reloading the server's pages, but it does not share the CPU
  fairly.
- **Two guards that decide one thing drift apart** (V1, Codex B1). The lantern rendered under one condition and was
  placed under another, so `walk=0` drew the halo at 41 times its size and the pool upright at the origin. One function
  now decides both, and a test pins it.
- **A station's stop must come from the automatic walk alone** (V1, Codex B2). Clearing the dwell on input read as
  giving input priority, but the next branch made a fresh dwell from the same frame's scroll. A scroll's ease also
  crosses a station on later frames with no input, so the fix tests both: input on the frame, and `target` ahead of
  `t`.

## 2026-10-28 (evening) — V1, the hat's colour

- **A reference reproduction's chroma is not a target** (the hat's colour). The Tarascon hat measures chroma 45 at
  hue 84, and no gold patch in The Starry Night falls under chroma 50. Scoring candidates on ΔE to Tarascon's mean
  ranked mixed patches of gold, brown and pale halo first. Its reference is a 1930s colour photograph of a burnt
  canvas, so only the direction transfers: darker and warmer. Choose the patch in the painting on those two signals,
  then gate it against the painting.
- **`palette.json` cannot gate every colour the scene uses** (the hat's colour). It has no ochre swatch. A darker,
  warmer hat moves away from every swatch, so the gate's target is a rectangle of the painting written in the gate
  itself. That keeps Codex T1's rule: the target does not move when the builder's patch moves.

## 2026-10-28 — the portal on for every visitor

- **A feature behind a flag never met the chrome guard with the flag on** (the probe, 14:45). The portal shipped on
  2026-10-25 behind `?portal=1`, and its fifth pill broke four of the viewport check's chrome cases: the placard over
  the phone's three-row dock, the dock off a 667 px landscape. No gate had run the check with the flag set. When a
  flagged feature adds chrome, run the viewport check with the flag on at its own gate, not at the flip.
- **A fixed offset encodes a row count** (the bottom stack). The placard's `bottom: 128px` was right for two rows of
  the dock and wrong for one or three. Put the two in one flow, so the clearance follows the dock. Measure the old
  numbers first: the pairs then prove every layout but the one the old number got wrong.
- **A pixel pair proves layout only where the frame is pinned.** The flat route's canvas is not pinned by `__skyTime`,
  so its pairs differed by 1,406 to 220,852 px with every rect equal. Report the rects beside the pixels, and split a
  differing pair into pixels inside and outside the chrome before reading it as a layout change.
- **A JavaScript `.click()` proves the handler, not the control** (Codex plan review F2). A control hidden by CSS still
  takes `.click()`. A check of a visible control clicks at its drawn centre after `elementFromPoint` and a visibility
  test. Codex's counterexample, the street's dock hidden by `:has`, passed case 4 and failed the new 4b.

## 2026-10-28 — the portal crashed the iPhone while every Mac check passed

- **Memory that fits on the Mac can crash the iPhone.** The portal keeps the diorama mounted while it builds the street.
  Every gate run passed in Chrome, including real touch taps at phone sizes. On Mark's iPhone the page was killed ("A
  problem repeatedly occurred"), while the street alone loaded. Headless Chrome's process memory does not model iOS's
  limit. A change that holds two scenes at once needs Mark's phone as a check before the preview is called done.

## 2026-10-28 (evening) — the portal's iPhone crash

- **Measure whether an unmount frees memory before choosing it as the fix** (the portal's iPhone crash). Both
  options were on the table for hours, and the doubt was whether R3F and drei's caches free anything. A ten-minute
  probe (one line, `!showStreet`, and the repro tool counting WebGL bytes net of deletes) showed it frees 35 MB of
  buffers and 125 MB of live heap. Textures barely move (37 to 32 MB): drei's loader cache keeps them.
- **A ready seam set in an effect needs a cleanup once its component can mount twice** (the portal's way back). The
  cypress's and the land's seams were written for the arrival, which mounts the diorama once. Without a reset on
  unmount, a remount reads the last mount's `true`. Mutation 3 removed both cleanups and case 2 went red.

## 2026-10-28 (night) — V1, Codex's review of `95088af`

- **A crossing test needs no margin below the mark** (Codex, PR #34, P2). `prev.t < st - 1e-6` left a 1e-6 band
  under each station. An automatic step that landed in it crossed the station with no dwell, about once in 560
  frames at 60 fps. The strict `prev.t < st` and the `last` guard already exclude a start on the station. A margin
  in a crossing test is a hole unless something needs it. Name what it is for, or leave it out.

## 2026-10-28 (night) — the phone's memory: the slice's first hour

- **Check for the panes before going solo, and never stop a working delegate to move it.** The Lead ran the plan
  review through the plugin's Codex subagent without checking Herdr. Codex and Gemini were open in `w4:p4` and `w4:p5`.
  When Mark said so, the Lead stopped the subagent after 5+ minutes of work and sent the same review to the pane. The
  work was lost, the review was paid twice, and Codex's 5-hour window fell to 39%. Run `herdr agent list` at the start.
  Let paid work finish, and route only the next job.
- **Measure memory on the production build, and read the probe's counters for what they are.** The "painting decoded
  about eight times" came from the dev server, where StrictMode loads everything twice, and from a 2D-canvas counter that
  never subtracts. On `vite build` the street holds three painting-sized decodes. Live memory is the heap and the
  ArrayBuffer stores after a forced GC (`Runtime.getHeapUsage`'s `backingStorageSize`), not cumulative allocations.
- **A heap-id diff between two snapshots misattributes native buffers.** Freed buffers' addresses are reused, so the
  street's own stroke buffers carried the diorama's ids. Label allocations by the property names on their retainer path
  instead, and compare two runs that differ in one thing.
- **R3F 9.6 with zustand 5 keeps the initial state, and with it the first `internal`.** The first unsubscribe replaces
  only the live copy's arrays, so every `useFrame` callback registered before it stays reachable from the initial copy,
  with its component's last closure. In the street that was the unmounted diorama: 56 MB. A component that empties the
  initial copy's three filtered arrays after mount frees it (`ReleaseInitialInternal`).

## 2026-10-28 (night) — the case 2 (phone) race

- **A page's frame recorder runs after R3F's frame loop, so it can read the loop's first step of a new phase.** R3F's
  `loop` requests its next frame at its top (`events-*.esm.js`), so a recorder started later is queued behind it in
  every frame. The old check passed on some runs and failed on others. The inferred variable, not observed: whether the
  canvas's root commits the new place in the same gap as the page's root. Assert the state inside the phase that owns
  it (every `entering` frame reads 0), and require at least one frame read, so the assertion is never empty.

## 2026-10-29 — Vincent's wander

- **A baseline run in the main checkout finds what worktrees hide.** `npm run -s lint` failed there with 1,848 parsing
  errors, because `eslint .` walked into the repo copies under `scratch/`, each with its own `eslint.config.js`. Every
  gate ran in a worktree, which has no `scratch/`, so CI and past gates were clean. Ignore `scratch` and `.claude`.
- **A measurement that says "hidden" is not a capture that shows it.** The raised glass stood 0.023 over the ground,
  under blade tips of 0.033 to 0.050 round the worst spots. The plan said "choose the fix from the numbers". The captures
  showed the glass clear at every stop but one: the camera looks down past the blades. Measure, then look, then choose.
  A fix chosen from the numbers alone would have flattened grass that needed nothing.
- **A flat mark at ground level does not read in this scene.** A disc 0.002 over the ground is under the blades on the
  verge and edge on from the camera's height on the square. A marker needs height and to face the camera. The lantern's
  own halo at the raised glass's height reads on both.
- **Change the browser cases with the behaviour they hold.** Decision (p) sends him home on the automatic walk, and the
  builder's phone case held him still with the walk on for 1.5 s. The Lead's change rewrote that case in the same commit.
  Grep the cases for the state a decision changes before building it.
- **A worker's pane status is not its job's state.** Gemini read "idle" while its mutation script still wrote logs, and
  again while the gate script ran in its background. Wait on the artefact and the process list.
- **Two browser checks at once poison each other's leak count.** The walk check counts every headless Chrome on the
  machine, before and after. The Lead ran its own walk check beside the worker's control run, and the control failed
  "before=0, after=2" with all 12 of its cases passed. One browser check at a time, or ports and counts of its own.
- **A waiter must not match its own pattern.** `while pgrep -f 'headless'` waited on its own shell, whose command line
  holds the word, and would have waited forever. The worker's "headless chrome left: 1" was the same shell. Match the
  process's own name (`'Chrome.*headless'`, as the checks do), never a word the waiter's own text holds.
- **A flag with three terms needs a case for each term.** `settled` is false while he moves, while the turn eases and
  while the aim eases. No case asked for `settled` while only the aim eased, so dropping that term survived (Task 4's
  b03). Run a mutation for each term of a compound guard, not one for the guard.
- **A fixture chosen by the code under test passes with it.** The wall fixture skipped every wall tap the page
  accepted, so a page that accepted walls passed (Codex F4). The phone's sight fixture, searched with a mutated module,
  found a point the mutant refused for another reason (Codex N1). Choose a negative fixture by geometry of its own, or
  require the one rule it tests to be the only one refusing it.
- **A pointer move may carry several samples.** The drag latch read only the move's own point. A browser may fold an
  out-and-back into one move (`getCoalescedEvents`, the W3C Pointer Events spec). Read every coalesced sample.
- **A read and an act in two calls leave a frame between them.** Case 6 read his `t` in one CDP call and sent the wheel
  and the blur in the next, while he still walked at the 0.5 cap. One frame between them moved him 0.0035, over the
  0.002 / L bar, so the case failed now and then (K2's record, and round 2's touch mutant twice). Read the state in the
  same task as the events it is compared with.
