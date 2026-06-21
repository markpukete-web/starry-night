# Brush-dab churn engine — design & plan (2026-06-21)

Status: APPROVED direction (Mark). Pipeline: draft → self-review → Codex plan-review → edit → implement
→ Codex code-review → fix → commit → present.

## Why / target

The flow-map advection on the living painting reads as smooth "water flow", not Van Gogh's churn. Mark's
reference (`~/Downloads/starry-night-in-motion-Bm9YvhBUmc4.mp4`, studied: `scratch/ref/`) is a hand-painted
per-stroke animation where (a) the motion is **brush-stroke level / dabby**, (b) the **whole sky** churns,
and (c) the **star/swirl halos visibly ROTATE** (bright spinning rings in the frame-diff). Target: that
brush-dab churn, while KEEPING the real painting's fidelity.

## Approach — moving brush-dabs over the real painting

Keep the real painting as the faithful base; add a layer of instanced **brush-dabs coloured from the
painting itself**, drifting along the derived SIGNED flow (which is circulation-aligned, so dabs travel
along streamlines = rotate around the swirls/stars). The base painting underneath holds fidelity and
fills behind the moving dabs with matching colour, so the churn reads as the painting's own brushwork
lifting and flowing — not a separate effect.

Why dabs sampled at HOME (not current position): a dab must carry colour FROM somewhere to read as
motion; sampling the painting at the dab's birth (home) UV and drifting it transports that colour a short
way (= visible churn). A short lifecycle + short drift keeps the transport small, so the image stays the
painting (no long smear); the base fills the rest.

## Components

- `LivingPainting` (base): simplify to the painting displayed statically by default (keep the flow-map but
  default its amplitude very low / 0 — the dabs are the churn now). Contain framing, sky letterbox,
  reduced-motion freeze, all unchanged.
- `BrushDabs` (NEW): the churn layer over the base.

### BrushDabs — CPU seeding (`buildDabField2D`)
- Load `signed-flow.png` + `sky-mask.png` on the CPU via `useImageData` (existing hook) to read flow
  direction + sky coverage per pixel.
- Seed N dabs ONLY where `sky-mask > 0` (so the cypress/village/moon get none): random UV in the sky,
  `tangent` = decoded signed-flow direction at that UV (rg*2-1), random `phase`, `scale`, `len` (drift
  distance). Densify toward high-coherence/swirl areas optional (v2).
- Output instanced attributes: `aHome (vec2 uv)`, `aTangent (vec2)`, `aScale`, `aPhase`, `aLen`.

### BrushDabs — geometry + shaders (`brushDabGeometry`)
- `InstancedBufferGeometry`: a small brush-stroke quad (base [-1,-0.5..1,0.5]); a soft brush alpha
  (reuse `makeBrushTexture` from brush.ts, or a procedural soft-rect) for impasto edges.
- Vertex:
  ```
  float t = fract(aPhase + uTime * uSpeed);
  vec2 center = aHome + aTangent * aLen * t;           // drift along the flow (→ rotates around swirls)
  vec2 along = aTangent, across = vec2(-along.y, along.x);
  vec2 uv = center + (position.x * halfLen) * along + (position.y * halfWid) * across; // oriented stroke
  // map painting-UV → clip space with the SAME contain-fit as the base, so dabs register with it
  gl_Position = vec4(uvToClip(uv), 0.0, 1.0);
  vFade = sin(3.14159 * t) * (1.0 - uFreeze);          // born→peak→die; frozen → 0 (only base shows)
  vHome = aHome; vUv = uv_local;
  ```
- Fragment:
  ```
  vec3 col = texture2D(uPainting, vHome).rgb;           // the painting's OWN colour at the dab's origin
  float a  = brush(vUv).a * vFade;
  if (a < 0.01) discard;
  gl_FragColor = vec4(col, a);                          // NormalBlend over the base painting
  ```
- `uvToClip` must apply the same contain-fit + flipY convention as the base `LivingPainting` so the dab
  layer lines up exactly with the painting. (Factor the contain math into a shared helper / duplicated
  constant `TEX_ASPECT` + `uViewA`.)

### Rotation around swirls
Because the dabs drift along the SIGNED (circulation-aligned) flow, dabs near a star/swirl travel along
its circular streamline → the halo rotates (matches the reference's spinning rings). Drift `len` is short
(a fraction of UV) so each dab traces a short arc, not a full loop — the lifecycle continuously respawns
them, giving sustained churn.

### Mask / fidelity
- Dabs only exist in the sky (seeded by `sky-mask`), so cypress/village/moon stay the crisp static
  painting. The moving dabs carry the painting's colour, and the base painting (same colour) sits behind,
  so fidelity holds even as dabs move.

### Reduced motion
`uFreeze` → `vFade = 0` (dabs invisible) → only the static base painting shows. Verify byte-identical.

### Dev tunables (leva)
dab count, dab size, drift length, churn speed. Sensible baked defaults.

## Perf
~15–25k instanced dabs, fully vertex-shader animated from a single `uTime` (no per-frame CPU rebuild),
one draw call. Cheap (the old dome dab-sky ran 120 fps at similar counts). Mobile: scale count down.

## Codex plan-review (2026-06-21) — resolutions folded in

1. **One coordinate convention (the top risk).** Work entirely in IMAGE-space UV (y-down, origin
   top-left — matches `useImageData`/getImageData and the bake). Set ALL textures (painting, signed-flow,
   sky-mask) `flipY=false` on BOTH the base and the dab layer, and sample base at `vec2(u, 1-v)`; CPU dab
   seeding reads signed-flow via getImageData directly → `dir = rg*2-1` is already image-y-down (no extra
   negation needed, because getImageData is image-space, unlike the flipY=true texture path the base
   currently negates for). VERIFY rotation sense empirically (capture); flip the drift sign if a swirl
   turns the wrong way. Refactor `LivingPainting` to flipY=false too so base + dabs share one convention.
2. **Share the contain-fit, don't duplicate.** Export `TEX_ASPECT` + a single `containUv`/`imgToClip`
   pair (image-UV ↔ clip) from one module (skyMapping or a new `skyFraming.ts`); base and dab shaders use
   the SAME formula + the same `uViewA` uniform. Validate registration by rendering dabs at t=0 (home, no
   drift) at full opacity in a debug toggle — they must exactly overlay the painting.
3. **Colour transport — default HOME with a hard drift cap, A/B vs current-position.** Keep `aHome`
   sampling but cap `aLen ≤ 0.03` UV and lifecycle short so smear is bounded; expose a build flag to A/B
   against current-position sampling and pick visually against the reference.
4. **Footprint masking.** In the fragment, also sample `sky-mask` at the dab's CURRENT position and
   `alpha *= mask` — so a drifting dab fades out rather than overpainting the cypress/village/moon.
5. **Explicit material state:** `transparent`, `depthTest=false`, `depthWrite=false`, `NormalBlending`,
   `renderOrder` above the base, `uPainting.colorSpace=NoColorSpace` (match the base 1:1).
6. **Numeric bounds (first pass):** count 18k desktop / ~5k mobile; dab half-length `iScale*~2.0` (≥ the
   along-flow spacing, per the "length exceeds spacing" anti-confetti lesson); `aLen` 0.02–0.03 UV;
   churn speed ~0.15 (cycle ~6.7s); alpha from a crisp brush texture × `sin(pi*t)` fade.
   Reduced-motion: `uFreeze` → fade 0 (overlay gone, base only) — verify byte-identical, NOT the old
   dab shader's freeze-to-full-coverage behaviour.

## Build order
1. `useImageData` for signed-flow + sky-mask (CPU read).
2. `buildDabField2D` (seed) + `brushDabGeometry`/material (geometry + shaders).
3. `BrushDabs` component; wire into the scene over `LivingPainting`; reduce base flow amp.
4. Capture + visually compare the churn against the reference (`scratch/ref/`) + the original.
5. Reduced-motion verify; build/lint/test; Codex code-review; commit.

## Risks / open
- Colour transport smear if `len` too large → keep short, lifecycle short.
- Dab density vs perf vs coverage — tune.
- Dab stroke shape/size must read as impasto, not confetti (lesson from the old dab work: long-enough,
  fat-enough strokes; crisp brush alpha).
- Registration: the dab layer's contain-fit MUST match the base exactly or dabs drift off the painting.
- This re-introduces a dab engine (the retired `dabField`/`dabGeometry` are 3D-dome; write fresh 2D ones).
