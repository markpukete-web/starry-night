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
