# The Starry Night — plan of record

Durable cross-session plan. `tasks/lessons.md` holds the memory; this holds the intent.
Locked sections in CLAUDE.md are Mark's. Proposed changes to them go under "Proposed to Mark"
below — never edited in place.

> **Human-facing record (Obsidian):** `~/File Vault/The Starry-night` — dashboard (`_Map`), Status
> (where we are), Sky evolution (visual journey), Concepts (glossary), Timeline. The repo files here
> stay the source of truth; the vault is the navigable layer over them. At session start, read
> `tasks/lessons.md`; the vault's `Status` note mirrors the current state for a quick human catch-up.

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
- [x] Slice 4 — cypress parallax (masked cutout) + constrained pan/tilt camera (±15° yaw,
      ±10° pitch). Hybrid confirmed. (Village/steeple/hills layers → "foreground complete" gate.)
- [x] Judged the three readings; picked **hybrid**; `docs/decisions/0002-movable-definition.md`.
      **Phase 1 gate reached — awaiting Mark's review.**

## 3D rebuild — beauty pass (active, 2026-06-13)

Pivoted to the orbitable 3D diorama. Done: enveloping churning sky dome, bloom (luminous night),
real forms (lathe cypress, village + church, rolling hills, moonlit floating slab). A cohesive
beautiful milestone for Mark. Open: the sky reads as dabs not continuous swirls (streamline strokes
would fix it); smooth the cypress facets; mobile + reduced-motion + perf (GPU churn if needed).

## Backlog / later gates (post movable-decision)

- First full animated sky (real, optimised build; flow-field.png is 3.2MB → slim it)
- Foreground complete: authored parallax layers (cypress, village + steeple, hills)
- `prefers-reduced-motion` dignified still state (locked acceptance criterion)
- Mobile portrait framing (contain vs guided pan); stroke budget + DPR caps; perf
- Pre-release

## Parked ideas (scope-growth — do NOT build without Mark)

- (none yet)

## Proposed to Mark (changes to locked sections — Mark applies)

- CLAUDE.md L27 names "Fable 5" as the autonomous operator; the operator this session is
  Opus 4.8. Reconcile the wording if desired — operating contract is unaffected either way.
- **2026-06-13 — DIRECTION CHANGE (Mark's call): full 3D diorama.** Mark wants Starry Night as a
  real orbitable 3D world (techartist reference), not a flat painting + overlay. This relaxes two
  LOCKED items — please update when you're happy:
  - "Out of scope → Free-orbit camera" — now in scope (constrained orbit, tasteful limits).
  - Acceptance criterion "Camera stays within pan/tilt limits; composition always reads as the
    painting" — needs rewording for an orbitable diorama.
  Kept: painterly impasto (the bar), flow-derived churn, palette fidelity. 0002 revised to suit.
