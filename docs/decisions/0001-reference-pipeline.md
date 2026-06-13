# 0001 — Reference pipeline (Phase 0)

**Status:** done, awaiting Mark's gate review · **Date:** 2026-06-13

## Why

The bar for this piece is that the sky's motion reads as *Van Gogh's brushstrokes*, derived from
the painting itself — never generic curl noise. Phase 0 turns the painting into two machine-usable
assets the renderer can trust as ground truth:

- `public/reference/flow-field.png` — per-pixel stroke orientation + confidence
- `public/reference/palette.json` — dominant colours per region, in sRGB + CIELAB

Everything downstream (instanced strokes, colour validation, the acceptance checks) keys off these.

## Source of truth

- **Image:** Van Gogh, *The Starry Night* (1889), public domain. Scan from the Google Art Project
  via Wikimedia Commons (`Special:FilePath/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg`).
- **Fidelity:** *standard high-res* (Mark's call, 2026-06-13) over the gigapixel original —
  simpler to handle and commit, and finer impasto detail would not survive texture sampling at our
  render resolutions anyway.
- **As fetched:** 3840 × 3041, committed at `reference/starry-night-source.jpg` (~5.3 MB) so the
  derivation is reproducible offline. It is the source of truth for colour and stroke direction.

## Approach — dependency-free by design

CLAUDE.md gates new dependencies. This pipeline adds none:

- **macOS `sips`** converts the source JPEG → PNG and downscales to the analysis width.
- **Node built-in `zlib`** decodes/encodes PNG (hand-rolled chunk + filter handling in the
  script). No `sharp` / `pngjs` / `jpeg-js`.
- The orientation analysis is plain arithmetic over pixel arrays.
- Runs on Node ≥ 23.6 via native type-stripping: `npm run derive-reference`.

## Method

1. **Downscale** to `ANALYSIS_WIDTH` (1280 px → 1280 × 1013). Flow field and captures are produced
   at this resolution.
2. **Luminance** (Rec. 601 weights) → **pre-blur** (σ `PRE_BLUR`) to denoise.
3. **Gradients** via Sobel. The gradient points *across* a brushstroke.
4. **Structure tensor** J = [[Jxx, Jxy], [Jxy, Jyy]] from the gradients, each component
   **Gaussian-smoothed** at σ `TENSOR_SIGMA` to integrate orientation over a stroke-sized
   neighbourhood.
5. **Stroke orientation** = gradient orientation rotated 90° (strokes run *along* ridges). In
   double-angle form the along-stroke vector is ∝ `(Syy − Sxx, −2·Sxy)`, normalised.
6. **Coherence** = (λ1 − λ2)/(λ1 + λ2), then **gated by gradient energy** (smoothstep over the
   p30–p85 energy percentiles) so near-flat micro-areas don't report spurious confidence.

### Parameters (script-level, not the locked Tunables)

| Name | Value | Role |
| --- | --- | --- |
| `ANALYSIS_WIDTH` | 1280 | analysis / output resolution |
| `PRE_BLUR` | 1.2 | denoise σ before gradients |
| `TENSOR_SIGMA` | 4.0 | orientation integration σ |
| energy gate | p30 → p85 | coherence confidence ramp |
| `LIC_LENGTH` / `LIC_STEP` | 18 / 1.0 | streamline length for the capture |

## Outputs

### `flow-field.png` (8-bit RGBA, 1280 × 1013)

| Channel | Meaning |
| --- | --- |
| R, G | double-angle orientation (cos2θ, sin2θ) mapped [−1, 1] → [0, 255] |
| B | coherence (energy-gated) [0, 1] → [0, 255] |
| A | 255 |

**Decode:** `2θ = atan2(G·2−1, R·2−1)`; `θ = 0.5·2θ`; stroke axis = `(cos θ, sin θ)`.
Double-angle is used so the texture interpolates **continuously across the θ = 0/π wrap** under GPU
bilinear sampling. Orientation is **undirected** (mod π) — the signed churn direction is a Phase 1
animation decision, deliberately not baked in here.

### `palette.json`

Per region: the bounding `rect` (normalised), and `colours` = median-cut dominant colours with
`hex`, `srgb`, `lab` (CIELAB D65), and `weight`. Regions: `sky`, `moon`, `cypress` (luminance-gated
to isolate the dark tree), `village`, `hills`, and `stars` (brightest warm points in the upper sky,
moon excluded). `lab` is there for the ΔE colour-drift acceptance check later.

### Gate captures — `reference/derived/` (git-ignored, regenerable)

- `flow-lic.png` — line-integral-convolution of the flow field (the decisive faithfulness check).
- `flow-lic-overlay.png` — the LIC painted with the picture's own colour.
- `coherence.png` — where orientation is trustworthy.

## Self-review (looked, did not just run)

- **Orientation is faithful, first pass.** The LIC shows *concentric* vortices around every star
  (not radial spokes — the tell that the +90° convention is right), vertical flame-licks along the
  cypress, the central double-whorl, and the moon's halo. It reads as the painting's own motion.
- Coherence needed the energy gate (above) to stop salt-and-pepper noise in flat micro-areas.
- Cypress palette needed a luminance gate to stop sky-blue bleeding into the dark tree.

## Known limitations / flags for Phase 1

- **`flow-field.png` is ~3.2 MB** — high-entropy orientation compresses poorly. Before shipping,
  downscale and/or smooth orientation in low-coherence areas to hit the texture budget. Not
  optimised now to avoid guessing the renderer's sampling needs.
- **Rectangular region palettes bleed at boundaries** (one faint blue survives in `cypress`). A
  hand-drawn mask is the proper fix *if* tighter palettes are ever needed.
- **Village warm lights** are too small a fraction to surface as a palette entry; special-case them
  like `stars` if the foreground needs them.
- Orientation is noisy where coherence is low; the renderer should down-weight strokes by the B
  channel there.
