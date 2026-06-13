# The Starry Night — plan of record

Durable cross-session plan. `tasks/lessons.md` holds the memory; this holds the intent.
Locked sections in CLAUDE.md are Mark's. Proposed changes to them go under "Proposed to Mark"
below — never edited in place.

## Phase 0 — reference pipeline  (active; gate: Mark reviews captures at the end)

- [x] Fetch standard-high-res public-domain scan → `reference/starry-night-source.jpg` (3840×3041)
- [x] `scripts/derive-reference.ts` — dependency-free pipeline (`sips` + Node `zlib`)
  - [x] decode source, compute luminance
  - [x] structure-tensor orientation + coherence (Gaussian-smoothed, energy-gated)
  - [x] encode `public/reference/flow-field.png` (double-angle orientation + coherence)
  - [x] region palettes → `public/reference/palette.json` (median-cut, sRGB + Lab)
  - [x] gate captures → `reference/derived/` (flow LIC, colourised overlay, coherence map)
- [x] Self-review captures against the painting; retune (1 pass: gated coherence + cypress filter)
- [x] `docs/decisions/0001-reference-pipeline.md` — source, method, params, encodings
- [x] Commit; **stop at Phase 0 gate** and present to Mark ← awaiting Mark's review

## Phase 1 — movable definition  (active; settled by building, not discussing)

Spikes share a scene foundation; the hybrid subsumes the other two, so build components and
compose them, judging the feel at each step. Gate: Mark reviews captures (the movable decision).

- [x] Slice 1 — scene foundation: painting plane, cover-framed, true colour. Desktop ✓.
      Mobile portrait cover-crops the moon/cypress → portrait framing deferred to Slice 5.
- [x] Slice 2 — brushstroke sky (static): instanced strokes oriented by the flow field, tinted
      from the painting; orientation confirmed against the brushwork
- [x] Slice 3 — brushstroke sky (churning): advect strokes along the flow — reads as Van Gogh's
      sky moving; sky-only placement + relief brush keep it faithful
- [ ] Slice 4 — 2.5D parallax foreground (cypress/village/hills via region masks) + constrained
      pan/tilt camera (±10° pitch, ±15° yaw from Tunables)
- [ ] Slice 5 — reduced-motion still state; mobile pass: portrait framing (contain vs guided
      pan), stroke budget, DPR caps
- [ ] Judge the three readings (churn-only / parallax-only / hybrid) vs acceptance criteria +
      painting; pick one; `docs/decisions/0002-movable-definition.md`; **stop at Phase 1 gate**

## Backlog / later gates

- First full animated sky · foreground (cypress, village, steeple) · pre-release

## Parked ideas (scope-growth — do NOT build without Mark)

- (none yet)

## Proposed to Mark (changes to locked sections — Mark applies)

- CLAUDE.md L27 names "Fable 5" as the autonomous operator; the operator this session is
  Opus 4.8. Reconcile the wording if desired — operating contract is unaffected either way.
