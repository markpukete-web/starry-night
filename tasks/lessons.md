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
