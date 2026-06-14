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
