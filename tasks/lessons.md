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

## Environment facts (this machine)

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
