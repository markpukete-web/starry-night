# Living Painting — refactor design & plan (2026-06-21)

Status: APPROVED direction (Mark, 2026-06-21). Claude makes the design calls; pipeline is
draft → self-review → Codex plan-review → edit → implement → Codex review → fix → commit → present.

## Why (context)

The 3D-diorama + procedural dab-sky failed Mark's fidelity bar. Root cause: we were matching a FLAT
painting through a 3D world, so every fix collided with perspective, the dome, and the floating island
(camera angle wrong, the central swirl read as a dark "hole", the foreground diverged from the
composition). Mark's call: **draft the original in 2D faithfully first, then add depth step by step.**

## The decision (Mark's two calls)

1. **The 2D base IS the real painting.** Render the actual `painting.jpg` and animate its own
   brushstrokes flowing along the derived flow field. Fidelity is perfect by definition — it is the
   painting. (Honours the locked bar: "the painting's sky genuinely churning the way Van Gogh painted
   the motion", and "derived from the painting, never generic noise".)
2. **2.5D parallax**, not a full orbit diorama. Depth layers + a gentle constrained camera; it always
   reads head-on as the painting. (Lower risk; avoids today's failure mode.)

**Locked-section impact (flag for Mark):** this shifts the direction from *full orbitable 3D diorama* →
*2.5D parallax living painting*. CLAUDE.md "Out of scope" / the camera acceptance criterion / Tunables
(orbit→parallax) will need Mark's edit. Noted, not edited here.

## Codex plan-review (2026-06-21) — folded in

Codex reviewed this plan read-only against the repo. Verdict: direction sound, but three corrections are
**required before the Phase 1 gate** (promoted from optional):

1. **Signed flow is REQUIRED.** The half-plane `dir.x≥0` hack in a stateless fragment shader has no
   swirl-centre memory, so CW/CCW rotation collapses into arbitrary local sliding/divergence — the swirls
   won't read as turning. Confirmed encoding is undirected double-angle (`scripts/derive-reference.ts:17,
   404`; `src/scene/brush.ts:8,15`). The existing runtime fixes this by sign-aligning to a directed vortex
   heading (`src/scene/flowField.ts:86,91`). → **Phase 0 bakes a signed/directed flow** (below).
2. **Real sky mask required.** Luminance×y×coherence is a debug pass, not gate-quality: the **moon** gets
   selected and wobbles; sky pixels advected near the **cypress/steeple** edges sample dark foreground →
   black pull-in. → **Phase 0 bakes `sky-mask.png`** with moon + foreground exclusions.
3. **Texture state must be explicit.** `TextureLoader` makes a bare `Texture` (`colorSpace = NoColorSpace`)
   → painting.jpg renders wrong unless set `SRGBColorSpace`; flow/mask must stay `NoColorSpace`. Reconcile
   the decoder's image-space "x-right/y-down" (`src/scene/brush.ts:5`) with three's default `flipY=true` —
   we set **`flipY=false` on all three textures** so painting, flow and mask share one coordinate system.

Also adopted: small advection amplitude (the dual-phase blend ghosts mid-cycle — gate visually against
crops; keep impasto crisp); flow/mask use `LinearFilter`, **no mipmaps** (avoid boundary blur); painting
keeps mipmaps. Phase 2 camera limited to a few degrees with feathered masks + backfill. Reduced-motion
must stay byte-identical. Fallback if advection ghosts too much: keep the base painting static and animate
only a subtle signed-flow detail overlay (Codex's cheaper alternative) — try full advection first.

## Phase 0 — bake the derived signed flow + sky mask (REQUIRED, before Phase 1)

Extend `scripts/derive-reference.ts` (dependency-free Node, as today) to output two new assets:

- **`public/reference/signed-flow.png`** — a DIRECTED flow field. Per pixel: take the undirected painting
  orientation and sign-align it to a 2D circulation field built from the painting's known swirl centres
  (reuse the centres/signs already in `skyMapping.buildVortices`, computed in flat UV space:
  `tangent = sign · perp(normalize(uv − centre))`, summed with gaussian falloff). The painting orientation
  gives the fine stroke detail; the circulation gives the global rotational SIGN — so streamlines turn the
  right way around each swirl. Encode the directed unit vector as `R=(x+1)/2, G=(y+1)/2`, coherence in `B`.
- **`public/reference/sky-mask.png`** — `white = animate (sky), black = static`. Derive from luminance
  (sky is brighter than the dark cypress/village/hills) with a feather, then **subtract a disc at
  `MOON_UV`** so the moon stays a crisp static crescent. Stars stay in the sky region (their halos may flow
  a little — faithful). Slight erosion at foreground edges so advected sky never samples across a silhouette.
- Validate both with a capture (LIC + arrows for the signed flow; mask overlaid on the painting) before
  wiring the shader — same gate-capture discipline as Phase 0 originally.

## Architecture

A single new scene component tree replaces `SkyDome` + `Diorama`:

- `LivingPainting` (Phase 1): a full-frame plane textured with `painting.jpg`, a flow-map advection
  shader churning the sky.
- `PaintingLayers` (Phase 2): the painting split into depth planes (sky · hills · village · cypress),
  the sky plane keeping the animation; a gentle parallax camera.

Reused unchanged: `useImageData`, `palette.ts`, `reference/{painting.jpg, flow-field.png, palette.json}`,
the dev tuning-panel pattern, the "Show original" toggle, `prefers-reduced-motion`, the reset control,
and the canvas-readback capture/compare loop.

Retired: `src/scene/SkyDome.tsx`, `src/scene/Diorama.tsx`, and the dome/dab modules they pulled in
(`dabField`, `dabGeometry`, `skyMapping`, `flowField`, `brush` stroke bits) once nothing imports them.

Data flow: `App` loads `painting.jpg` + `flow-field.png` as textures → passes to `LivingPainting` →
shader samples both per-pixel. No CPU per-frame work (unlike the 22k-dab rebuild) — just a fragment
shader; performance is trivial.

## Phase 1 — Flat living painting (the gated foundation)

The deliverable for the first review: a flat, faithful, *real-painting* base whose **sky churns** and
whose **foreground stays still**, compared 1:1 against the original.

### Framing
- A perspective camera looking head-on at a plane sized so the painting fills the viewport (cover),
  aspect-handled. Head-on perspective (not orthographic) so Phase 2 parallax is a continuous evolution.
- Desktop landscape is the target for this gate; mobile-portrait framing is Phase 3.

### The flow-map advection shader (the core)
Fragment shader on the painting plane:

1. **Sample the DIRECTED flow** from `signed-flow.png` at `vUv`: `dir = texture(uFlow, vUv).rg*2-1`
   (already a directed unit vector — no decode/half-plane hack), coherence in `.b`. Baked in Phase 0 so
   the swirls rotate correctly. Textures: painting `SRGBColorSpace`, flow + mask `NoColorSpace`, all
   `flipY=false`; flow/mask `LinearFilter` + `generateMipmaps=false`.
2. **Flow-map advection** (the no-stretch "living painting" technique — dual phase cross-fade):
   ```
   float t = uTime * uSpeed;
   float p0 = fract(t);
   float p1 = fract(t + 0.5);
   vec2 f  = dir * uAmplitude * mask;            // mask scales motion (sky only, see below)
   vec3 c0 = texture2D(uPainting, vUv - f * p0).rgb;
   vec3 c1 = texture2D(uPainting, vUv - f * p1).rgb;
   float w = abs(p0 - 0.5) * 2.0;                // 0 mid-cycle, 1 at the wrap → hides the reset
   vec3 col = mix(c0, c1, w);
   ```
   `uAmplitude` is small (a few % of UV) → the strokes flow/breathe without distorting the image.
3. **Sky mask** = `texture(uMask, vUv).r` (baked in Phase 0 — sky white, foreground+moon black). Scale
   the advection amplitude by `mask * coherence` so only the sky swirls move and the moon/cypress/village
   stay crisp and still. (Replaces the fragile in-shader luminance heuristic, per Codex review.)
4. **Freeze**: `uFreeze` (prefers-reduced-motion OR pause) → amplitude 0 → the still painting.
5. **Colour**: `painting.jpg` is sRGB; sample as sRGB, output `toneMapped=false`, no saturation/relief
   tricks — it is the painting, untouched, only displaced.

### App wiring
- `World` drops `<SkyDome>` + `<Diorama>`, renders `<LivingPainting>`.
- **Static head-on camera** for Phase 1 — no `OrbitControls` until Phase 2's parallax rig. The dock's
  `Reset view` is a no-op in Phase 1 (hide it until Phase 2); `Pause`, `Show original`, `Fullscreen` stay.
- **Bloom OFF by default in Phase 1.** The real painting is already complete (its moon/stars are painted
  at their intended brightness); blooming it would falsify it. Reintroduce a *whisper* of bloom only if
  Mark wants the lights to glow. The `@react-three/postprocessing` dep stays available.

### Dev controls (leva, dev-only)
`churn speed` (uSpeed), `flow amount` (uAmplitude), sky-mask `lum threshold` + `horizon`, exposed so the
look is dialled live; defaults baked into `sky-tuning.json` (repurpose/trim the existing keys).

### Phase 1 acceptance
- Side-by-side / "Show original" toggle: ours reads as the painting (it is) with the sky gently flowing.
- Foreground (cypress, village) does NOT wobble.
- `prefers-reduced-motion`: byte-identical frames (still painting).
- 60fps trivially (single plane + shader).

## Phase 2 — 2.5D depth (only after Phase 1 passes the gate)

- **Masks**: derive `public/reference/layer-mask.png` (or per-layer alpha) in `derive-reference.ts`,
  classifying sky / hills / village / cypress by luminance + region + position. Start coarse: 2–3 layers
  (sky · midground village+hills · cypress front) is enough to read as depth; refine if wanted.
- **Layered planes**: one textured plane per layer at increasing camera distance, each masked by its
  alpha. The **sky plane keeps the flow animation**; foreground layers are static.
- **Parallax camera**: REMOVE the current wide `OrbitControls` (`src/App.tsx:303`, distance 3–5.5 / polar
  0.2–1.62 — old diorama tunables). Replace with a GENTLE pointer-/idle-driven offset of a few degrees
  (a small parallax rig), NOT orbit. Moving reveals depth between layers; head-on it is exactly the
  painting. Update the Tunables (orbit → parallax) when Mark edits the locked sections.
- Edge treatment where a near layer is cut out (feather the mask alpha so cut edges don't read as hard
  cardboard).

## Phase 3 — Polish
- "Show original" toggle (kept as-is — Mark relies on it; see memory).
- `prefers-reduced-motion` re-verify after layering.
- Mobile-portrait framing (the painting is landscape — contain or a portrait-bearing crop).
- Perf confirm on real hardware (expected: trivial).
- Tests: retire/replace the obsolete `test:sky` dab/mapping tests; add a unit test for the flow-decode
  (R,G,B → θ, coherence) math if it can run headless.

## Risks / open questions
- **Undirected flow sign**: advecting along a mod-π orientation can flow "out of" a swirl rather than
  around it, and seam where the sign flips. Mitigation: consistent half-plane + small amplitude; if the
  swirl rotation reads wrong, bake a SIGNED flow in `derive-reference.ts` (use the swirl-centre sense).
- **Sky-mask cleanliness**: in-shader luminance mask may catch bright village windows / miss dark sky
  patches. Acceptable for Phase 1; dedicated mask in Phase 2.
- **Texture sampling at UV offsets** near the painting edges can clamp-smear; use `ClampToEdge` + keep
  amplitude small, or pad.
- **Cover-framing** crops the painting edges on wide screens; ensure the key composition (cypress, moon,
  whorl) stays in frame, else contain with a painted letterbox.

## Out of scope (this refactor)
- Full 360° invented back (gone with the dome — 2.5D doesn't need it).
- New dependencies.
- The dev tuning-write endpoint changes.
