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

## Phase 1 — movable definition  (queued; settled by building, not discussing)

- [ ] 2–3 small spikes; default candidate to beat: hybrid (brushstroke sky + parallax
      foreground, constrained pan/tilt camera)
- [ ] Judge vs acceptance criteria + painting; pick one; `docs/decisions/0002-movable-definition.md`

## Backlog / later gates

- First full animated sky · foreground (cypress, village, steeple) · pre-release

## Parked ideas (scope-growth — do NOT build without Mark)

- (none yet)

## Proposed to Mark (changes to locked sections — Mark applies)

- CLAUDE.md L27 names "Fable 5" as the autonomous operator; the operator this session is
  Opus 4.8. Reconcile the wording if desired — operating contract is unaffected either way.
