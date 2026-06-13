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
