# The Starry Night — plan of record

Durable cross-session plan. `tasks/lessons.md` holds the memory; this holds the intent.
Locked sections in CLAUDE.md are Mark's. Proposed changes to them go under "Proposed to Mark"
below — never edited in place.

> **Human-facing record (Obsidian):** `~/File Vault/The Starry-night` — dashboard (`_Map`), Status
> (where we are), Sky evolution (visual journey), Concepts (glossary), Timeline. The repo files here
> stay the source of truth; the vault is the navigable layer over them. At session start, read
> `tasks/lessons.md`; the vault's `Status` note mirrors the current state for a quick human catch-up.

## Where we are now (2026-06-14, end of session) — read this first

The **sky has passed every locked acceptance criterion** and cleared two rounds of external (Codex)
review. It's an orbitable 3D diorama under a churning, anchored, glowing vortex sky:

- **Soul is there:** anchored swirls, rolling comma form, glowing crescent moon, glowing eyes, 360°.
- **Locked contracts now honoured:** flow-derived motion (hybrid front-arc bias of the derived flow
  field), palette-derived colours (`palette.json` is load-bearing), `prefers-reduced-motion` still
  state, responsive framing. Lint + `tsc -b` + `npm run build` all green. Committed through `b2dc008`.

**Next up (priority order):**
1. **Foreground-complete gate (the next big body + a Mark gate).** The diorama FORMS are still
   placeholder-ish — blocky houses, plain slab, simple steeple, dark cypress. Authored, painterly
   forms with real materials is the next major work. The sky is done; the foreground is not.
2. **Tuning, once Mark plays with the leva panel** — `flowBias` strength (0.6 → ?), steeple lift,
   moon prominence; then bake the chosen values in as defaults.
3. **Mobile-portrait moon** — needs a portrait-specific camera bearing (a composition call).
4. **Ship hygiene** — slim `flow-field.png` (3.2 MB), strip `leva` from the production build.
5. **Pre-release gate.**

Locked-section edits APPLIED this session (Mark delegated — "update section edits", 2026-06-14):
Fable-5 → Claude operator wording; free-orbit → constrained-orbit across Out-of-scope + the camera
acceptance criterion + Tunables; and an additive clause on the bar acknowledging the front-derived /
back-invented sky split. See "Applied to locked sections" at the bottom — Mark, veto any wording.

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

## 3D rebuild — the sky (active, 2026-06-13 → 06-14)

Orbitable 3D diorama under an enveloping churning sky. The sky is the soul of the piece and is the
furthest along — past the **first full animated sky** in substance, now being polished to Mark's eye.

- [x] Real forms — lathe cypress, village + church + steeple, rolling hills, moonlit floating slab
- [x] Bloom for a luminous night
- [x] Native vortex-field sky — bold swirls, 360°, no seam / symmetry / gaps
- [x] Anchored to the painting — central double-swirl, Venus, the nine real stars + moon at their true
      positions, centred on the camera's view (`uvToFrontDir`, ~123° arc, camera-aligned basis)
- [x] Rolling swirls, not funnels — spiral inflow gives Van Gogh's logarithmic-spiral comma form
- [x] Glowing swirl eyes — sign-aware luminous cores; no dark drains, front and back
- [x] Dev playground — full leva panel (sky / sky colours / light & bloom); defaults = the tuned look
- [x] Swirls crisper under bloom — tighter bloom (threshold 0.6 / radius 0.55) + cross-stroke relief ridge
- [x] Smooth the cypress facets — centripetal-spline the lathe profile (no facets; smooth flame)
- [x] Moon is a glowing crescent, not a flat disc — additive gold halo + carved crescent sprites
- [x] Hybrid flow-field bias — front-arc strokes follow the painting's derived orientation (coherence-
      weighted, eyes protected); honours the locked bar L88. `flowBias` panel knob (default 0.6)
- [x] Palette contract (P1) — surfaces (cypress/hills/houses/roofs/slab/steeple) + dome gradient now
      sourced from `palette.json` via `src/scene/palette.ts`; strokes keep the painting's true colour,
      emissive lights stay warm. Honours the locked colour criterion.
- [x] Moon framing (P2) — nudged off the very corner (`MOON_UV` 0.80,0.20) so the crescent + halo clear
      the desktop frame

Open (Mark: "keep polishing"):
- [ ] Steeple reads a touch muted at the derived `#556c81` (was an invented lighter grey) — lift if you
      want the church spire to pop more (stay within palette tolerance)
- [ ] Tune `flowBias` strength (0.6 subtle → 1.0 more brushwork) and bake the chosen value
- [ ] Bake Mark's chosen leva values in as the new defaults once he's played with the panel
- [ ] Moon prominence is a taste call — current is a tasteful crescent; can blossom larger/brighter if Mark wants
      it nearer the painting's dominant corner-moon (widen the `moon` control range when baking defaults)

## Foreground — authored painterly forms (toward the **foreground-complete** gate, 2026-06-14)

The sky is gate-passing; the foreground forms are still placeholder (blocky slab, blob cypress,
low-poly house boxes, box-steeple, near-invisible hills). Reference grounding: the painting's
foreground is a continuous dark landmass — flame-cypress front-left, rolling blue hills, a village
whose pale slender-spired church is the heart, warm-lit windows. Classify (CLAUDE.md): cypress +
church = authored identity; houses + hills + island = procedural fill. Order = stage → dressing →
hero → polish; capture + review each slice.

- [ ] F1 — floating island + foreground lighting base. Replace the chocolate-bar slab with an organic
      painterly landmass (terrain rising to the back, earthy underside fading to dark); re-light so
      forms model in moonlight instead of going flat-black. The "diorama toy" tell dies here.
- [ ] F2 — rolling hills. The painting's blue-grey ridges behind the village, brushy undulation,
      catching cool moonlight (palette `hills`); they currently vanish.
- [ ] F3 — village + church. Cluster varied little houses; make the church the pale, slender-spired
      centrepiece; warm window glow (emissive light, not surface).
- [ ] F4 — the cypress, re-authored. Van Gogh's flame: tall, twisting, feathered/spiky silhouette,
      deep green-black with modelling — not a smooth black blob.
- [ ] F5 — painterly material + impasto pass; final foreground lighting tune; full capture pass.
- [ ] **Foreground-complete gate** — present captures to Mark.

## Backlog / later gates (post movable-decision)

- [x] `prefers-reduced-motion` dignified still state (locked criterion) — `paused` freezes the churn;
      verified static via `page.emulateMedia({reducedMotion})` (identical frames under reduce)
- [x] `npm run lint` clean — scoped R3F immutability disables + script-hygiene fixes
- [x] README refreshed from "scaffold" to the orbitable-diorama reality
- [ ] Mobile portrait framing — responsive fov now keeps the cypress edge + central whorl + steeple;
      the MOON still can't fit a portrait frame (≈42° off-centre on the arc) → needs a portrait-specific
      camera bearing (Mark's composition call). Plus stroke budget + DPR caps; perf on real mid-tier mobile
- [ ] Ship hygiene: slim `flow-field.png` (3.2 MB); strip `leva` from the production build
- [ ] Gates remaining: **foreground complete** · **pre-release**

## Parked ideas (scope-growth — do NOT build without Mark)

- (none yet)

## Applied to locked sections (2026-06-14 — Mark delegated: "update section edits")

Mark normally applies locked-section changes; this session he delegated the pending batch. Done in
CLAUDE.md (Mark — veto/reword any of these):

- **Operator wording** — L27 "Fable 5 plans, builds…" → "Claude plans, builds…" (model-agnostic;
  operating contract unchanged).
- **3D-diorama direction change** (2026-06-13, Mark's call) now in the locked text:
  - *Out of scope* "Free-orbit camera" → "Free-fly / unconstrained camera (panning, unlimited zoom)";
    constrained orbit is explicitly in scope, composition never broken.
  - *Acceptance criterion* camera line reworded from "pan/tilt limits" to "orbit limits (polar +
    distance; no free-fly/pan); the diorama always reads as Starry Night — head-on it is the painting".
  - *Tunables* camera limits updated to the real orbit values (polar 0.2–1.5 rad, distance 3–5.5).
- **The bar** — added an additive parenthetical acknowledging the front-derived / back-invented sky
  split (front follows the painting's geometry + flow field; the invented back continues the derived
  style). ⚠️ The bar is "only Mark edits this section" — this is the one most worth your glance; the
  meaning is unchanged, only made explicit. Revert or reword if it doesn't sit right.

Still open for Mark (tuning, not locked edits): dial `flowBias` strength and bake the chosen value
(also listed under the sky's Open items); the mobile-portrait moon bearing.
