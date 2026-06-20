# Sky Brush-Dab Fidelity — Design

Date: 2026-06-20
Status: Draft for Mark's review; implementation not started

## Relationship to the sky-flow-fidelity draft

This supersedes the **approach** in `2026-06-20-sky-flow-fidelity-design.md` / its plan for the
sky, while keeping that draft's **diagnosis** (pre-release sign-off withdrawn; the sky does not read
close enough to the painting; cypress and village follow once the sky's brush language is settled).

That draft stayed inside the existing *ribbon* paradigm — shorter, broken, flow-derived ribbons.
Reviewing the current front capture beside the original, Mark and Claude judged that the ribbon
paradigm cannot fully cross the gap: long extruded ribbons read as **liquid chrome / marbled paper**,
not as paint, no matter how they are recoloured. The decision (2026-06-20) is to change what the sky
is *made of*.

## Decision

Render the whole sky dome as a **field of instanced brush-dabs** — thousands of short, oriented,
impasto strokes placed along the flow field — instead of extruded ribbons. The dabs **drift slowly
along the flow** (Vrellis-style: short-lived marks born-and-die with a fade), so the sky genuinely
churns rather than carrying an effect on a static canvas.

Two taste calls Mark made during brainstorming, recorded here:

- **Whole dome in dabs** (not dabs-front / ribbons-back). The most unified and faithful option; the
  dab becomes the one brush primitive reused later on the cypress and village.
- **Motion = drift, Vrellis-style.** More faithful to the *current* Van Gogh painted than a
  shimmer-in-place, and aligned with the bar's wording ("genuinely churning … not a static canvas
  with effects on top"). Accepted with the discipline that keeps drift from becoming "soup":
  slow, short travel, birth-and-death fade, density high enough that the swirl composition holds in
  aggregate.

## Goal

Make the default/front view read materially closer to the original painting on two axes Mark named:

1. **Substance** — countable impasto brush-marks, not smooth continuous tubes.
2. **Flow** — marks placed *along* the painting's derived flow, so orientation *is* the painting's
   movement, not decoration on top of a generic vortex swirl.

Colour/value is **not** a primary target (Mark is at ease with it). The move to discrete dabs plus
the bloom-threshold change below is expected to recover some deep-blue negative space and reduce the
silvery wash as a side effect; we do not chase it further.

## What is kept

- The 360° orbitable dome, constrained camera, and the camera-anchored front basis (the painting
  faces the home bearing). Orbit limits unchanged (Tunables: polar 0.2–1.5, distance 3–5.5, no pan).
- The moon (halo + carved crescent sprites), the stars, and the swirl-eye glow sprites — they are
  identity light and already read well. They remain the elements that bloom.
- Colours derived from the painting (`/reference/painting.jpg`) on the front and from `palette.json`
  (`PALETTE`) on the invented back. No colour re-derivation from memory.
- The derived flow field (`/reference/flow-field.png`) as the front orientation source.
- `prefers-reduced-motion` and the visitor pause button → a dignified still painting.

## Architecture (small, independently testable units)

The pipeline is split so the hard parts are pure functions with node tests, and only the final
assembly touches React/three rendering. The first unit is the extraction already proposed in the
superseded plan's Task 1 — that refactor is good and is reused.

- **`src/scene/skyMapping.ts`** *(extract from `SkyDome.tsx`)* — dome radius/constants, the
  camera-facing basis (`FWD/RIGHT/TRUEUP`, `FRONT_AZ`, `BACK_AZ`), `dirAzEl`, painting-UV mapping
  `uvToFrontDir` / inverse `frontUV`, star/moon/Venus anchors, `smoothstep`, and `buildVortices`.
  Pure. Node test: `frontUV(uvToFrontDir(u,v))` round-trips the painting anchors (verified to be an
  exact analytic inverse over the orthonormal basis for |w| < π/2).

- **`src/scene/flowField.ts`** *(new)* — one sampler, `flowTangentAt(dir, out): number` returning
  the unit flow tangent on the dome at `dir` (and a confidence/coherence weight): the **derived**
  painting field where `frontUV(dir).onArc` (decode `sampleFlow`, map the painting's u/v axes to
  sphere tangents — the existing `flowBiasAt` maths, generalised), the **native vortex** field
  (`buildVortices` circulation + spiral inflow — the existing `flowAt` maths) elsewhere, blended
  across the arc boundary so front and back are one continuous field. Node test: vortex circulation
  sign and tangency (`flowTangentAt(dir) ⟂ dir`).

- **`src/scene/dabField.ts`** *(new)* — the generator. Walks **streamlines** through `flowTangentAt`
  (the integration loop the superseded plan put in `frontFlow.ts`, reused) and **drops dab instances
  at intervals along each line** rather than extruding a ribbon. Front streamlines seed in painting
  UV and colour from `colourSrc`; back streamlines seed across back directions and colour from
  `PALETTE`. Returns plain typed arrays — per dab: `dir` (unit, on dome), `tangent` (unit flow, ⟂
  dir), `colour` (rgb 0..1), `scale`, `phase` (0..1), `drift` (arc length). Pure given (flow sampler,
  colour sampler, seeded `mulberry32`). Node tests: determinism for a fixed seed, all `dir` on the
  unit sphere and above `HORIZON`, every `tangent ⟂ dir`, counts split front/back as requested.

- **`src/scene/dabGeometry.ts`** *(new)* — builds an `InstancedBufferGeometry` (a unit quad +
  per-instance attributes `iDir`, `iTangent`, `iColor`, `iScale`, `iPhase`, `iDrift`) and the dab
  `ShaderMaterial`. The dab texture **already exists and is currently unused**: `makeBrushTexture()`
  in `brush.ts` (a tapered impasto stroke). The vertex shader advects + orients each dab and lays the
  quad in the dome tangent plane (see Motion). The fragment shader samples the brush alpha, applies
  the dab colour and a gentle cross-stroke impasto ridge, and the birth/death fade.

- **`src/scene/SkyDome.tsx`** *(slimmed)* — React assembly only: load textures, build the dab
  geometry in `useMemo` keyed on the existing deps, drive `uTime` in `useFrame` (frozen when
  `paused`), keep the moon/star/glow sprite groups, dispose on rebuild/unmount.

## Data flow — how one dab is born

```
seed (painting-UV front / dome-dir back)
  → integrate streamline through flowTangentAt (a few short steps)
  → at each step: place a dab { dir, tangent=flow, colour, scale, phase~U(0,1), drift }
  → dabField returns instance arrays
  → dabGeometry packs InstancedBufferGeometry
  → vertex shader advects along the great circle + builds the oriented quad
  → fragment shader: brush alpha × colour × impasto ridge × birth/death fade
```

Clustering dabs **along** streamlines is what reproduces the painting's commas and whorls: discrete
marks that *add up to* a swirl, instead of one smooth tube. Star/Venus/whorl anchors seed denser,
brighter clusters so those forms read.

## Motion — GPU drift, reduced-motion-safe

Each dab slides a short arc along its own flow tangent and is reborn, entirely in the vertex shader
from `uTime` — no per-frame CPU work over the instance set, and `paused` freezes it into a still:

```
t        = fract(iPhase + uTime * driftSpeed)          // 0..1 life
a        = t * iDrift                                    // small arc (radians)
pos.dir  = normalize(iDir * cos(a) + iTangent * sin(a)) // great-circle micro-advection
fade     = sin(PI * t)                                   // born at 0, peak mid-life, die at 1
```

Because each mark only travels a short arc before fading and rebirth, the *placement* (static field)
carries the swirl composition while the *motion* carries the churn — the marble/soup failure mode
(everything conveyor-belting) is avoided by construction. `driftSpeed` maps to the existing
`churnSpeed` control; `iDrift` and the fade are new dab tunables.

`paused` (from `prefers-reduced-motion` OR the visitor pause button, via the existing `motionPaused`
plumbing) stops `uTime` → every dab holds at its phase → a dignified, fully-lit still. No separate
reduced-motion code path.

## Bloom / colour interaction

The current "chrome" sheen is partly Bloom (`intensity 1.0`, `luminanceThreshold 0.63`): bright
strokes bloom and smear. Design intent: **sky dabs sit below the bloom threshold** (matte paint);
**only the stars, moon and swirl-eye glows bloom**. Dab brightness is tuned against the threshold so
the sky reads as impasto, not light. Bloom controls themselves are unchanged.

## Tunables / control surface

Keep the dev-only Leva surface meaningful; repurpose the two ribbon-era controls:

| Control (Leva)      | Now drives                                   |
|---------------------|----------------------------------------------|
| `churn speed`       | `driftSpeed` (along-flow advection rate)      |
| `stroke count`      | dab instance count (Tunables: 8,000 / 3,000)  |
| `stroke width`      | dab `scale`                                   |
| `colour pop`        | saturation (unchanged)                        |
| `swirl tightness`   | **repurposed** → dab `drift` arc length        |
| `flow bias (front)` | **retained** → front painting-flow bias strength (the knob that pulls front dabs toward the painting's orientation — kept, not repurposed) |
| bloom / moon / stars / glow / colours | unchanged                   |

Tunables unchanged: stroke budget 8,000 desktop / 3,000 mobile; dpr cap (current Canvas `dpr={[1,
1.5]}`); palette tolerance ΔE < 10; orbit limits; retune cap 4 passes.

## Risks (and how each is checked)

1. **Transparent overdraw / sort order** — the main visual risk. Thousands of soft transparent dabs
   on a dome viewed from inside, `depthWrite` off. Validate in captures; tune dab size/count/alpha;
   accept order-independent softness if it reads well.
2. **Drift becoming "soup"** — mitigated by short `iDrift` + birth/death fade + static placement;
   tune `driftSpeed`/`iDrift` against captures, reduced-motion still as the anchor.
3. **Mobile performance** — 3,000 dabs + fill-rate at dpr 1.5; verify 30 fps mid-tier, drop count/size
   before dropping the look.
4. **Pole/seam orientation** — reuse the existing circle-sampling continuity trick.
5. **Stars/moon consistency** — sprite stars beside painterly dabs may look "stuck on"; if so, treat
   star halos as dab clusters in a later pass (out of scope now — note only).

## Testing & review

- **Node pure-math tests** (`scripts/*.test.ts`, run via `node --test`): mapping round-trip; flow
  tangency/sign; dab determinism, on-dome bounds, tangent ⟂ normal, front/back split.
  **Import note (a bug found in the superseded plan): `node --test` does *not* resolve extensionless
  relative imports — proven on Node 25. New modules must use explicit `.ts` extensions in their
  internal relative imports (e.g. `from './brush.ts'`), which `tsc` allows
  (`allowImportingTsExtensions: true`) and Vite accepts.**
- **Visual capture loop** (the project's canvas-readback workflow): front / orbit / mobile / reduced
  each read against the original, naming what moved closer. Captures live in gitignored `scratch/`
  and are **not committed** (project convention; the superseded plan's `git add scratch/*` steps
  would have failed).

## Acceptance

Locked criteria (unchanged): flow-derived orientation; palette colours within ΔE; 60 fps desktop /
30 fps mobile; reduced-motion dignified still; camera within orbit limits; head-on it reads as the
painting's composition. Plus, for this pass:

- The sky reads as **discrete impasto brush-marks**, not continuous chrome ribbons.
- Front composition anchors (central whorl, Venus, moon corner, star halos) line up with the original.
- Drift reads as **churn**, not scrolling soup; the still (paused) frame is a clean painting.

## Scope / non-goals

- **Sky only.** Cypress, village, hills, island, and the glb-vs-dab-cloud question are deferred to a
  later pass, by Mark's sequencing (settle the sky brush language first, then reuse it).
- No new dependencies — instancing is core three; the dab texture already exists.
- No new public controls or comparison UI; no deploy/DNS/analytics changes (those need Mark).
- Colour palette not re-opened.

## Build sequence (high level — detailed tasks belong to the implementation plan)

1. Extract `skyMapping.ts` (+ round-trip test); slim `SkyDome.tsx` imports — behaviour unchanged.
2. `flowField.ts` unified sampler (+ tangency test).
3. `dabField.ts` streamline→dab generator (+ determinism/bounds tests).
4. `dabGeometry.ts` instanced geometry + dab shader, **static placement first** (no drift). Capture
   vs original; tune density/size/blend/bloom-threshold until the sky reads as paint, not chrome.
5. Add the GPU drift + birth/death fade. Capture; tune to avoid soup; verify the paused still.
6. Back-dome coverage + front/back seam blend. Capture orbit.
7. Mobile pass (3,000 dabs, perf budget). Capture.
8. **Mark gate:** front / orbit / mobile / reduced beside the original.

## Open question for Mark

This is a bigger change than the superseded ribbon-evolution plan — a redesign of what the sky is
made of, not a retune. It is the faithful path, but it carries the overdraw/soup risks above and will
take several capture-and-tune passes. Confirm you want to commit to the dab redesign now (vs a
smaller ribbon-evolution pass as an interim), and I will turn this into a task-by-task implementation
plan.
