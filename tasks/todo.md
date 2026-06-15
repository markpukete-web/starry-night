# The Starry Night — plan of record

Durable cross-session plan. `tasks/lessons.md` holds the memory; this holds the intent.
Locked sections in CLAUDE.md are Mark's. Proposed changes to them go under "Proposed to Mark"
below — never edited in place.

> **Human-facing record (Obsidian):** `~/File Vault/The Starry-night` — dashboard (`_Map`), Status
> (where we are), Sky evolution (visual journey), Concepts (glossary), Timeline. The repo files here
> stay the source of truth; the vault is the navigable layer over them. At session start, read
> `tasks/lessons.md`; the vault's `Status` note mirrors the current state for a quick human catch-up.

## Where we are now (2026-06-15) — read this first

> **✅ FOREGROUND-COMPLETE GATE PASSED (Mark, 2026-06-15).** 4th of 5 gates done; only the pre-release gate
> remains. Now in the post-gate phase — proceed on the queue below (autonomous between gates).

**2026-06-15 — review-response pass (done, verified, committed).** Mark relayed a 4-point review at the
gate; all four addressed (detail in `lessons.md` → "Review-response pass"): P1 cypress reframed (3.05/1.2 —
clears the frame, still the dominant counterweight); P2 island seam bug fixed (circular angular noise — the
orbit shard is gone); P2 palette provenance (foreground colours now derive from palette.json swatches ×
documented factors, visual preserved, ΔE<1 on the church); P3 spec de-staled (`CLAUDE.md:53`). Build + lint
green; committed to main (not pushed). **Then** made the hills bolder per Mark — a brighter luminous rolling
band, kept just below the church pale (`lessons.md` → "Hills made bolder").

**Open these captures first:** `scratch/g3-front.jpeg` (current hero — bolder hills) · `scratch/g3-orbit.jpeg`
(orbit) · `scratch/g1-orbit2.jpeg` (seam-free island) · `scratch/g1-mobile.jpeg` (mobile portrait).

**What the scene is now:** an orbitable 3D floating-island diorama under the churning, anchored,
glowing vortex sky (the sky was already done + twice Codex-reviewed). This session rebuilt the entire
foreground (F1–F5), then made the cypress dominant per Mark's first gate note:
- **F1** organic floating island (irregular coastline, rocky root fading to dark) — killed the slab.
- **F2** rolling moonlit blue-grey hills (heightfield) — killed the balloon spheres.
- **F3** clustered gable-roofed village + a pale slender-spired church as the focal point, warm windows.
- **F4** the cypress as a real Van Gogh flame (displaced tube: licking tongues, twist, green-black).
- **F5** foreground shrubs + full capture pass; **reduced-motion re-verified** (frozen under reduce).
- **+ gate feedback** — cypress made taller & more dominant via a `girth` knob.

All committed to `main` this session: `f9a5847` (docs/locked edits) → `0b9cdd6` F1 → `f7fb9d4` F2 →
`d41a51f` F3 → `693e393` F4 → `c4bcd9b` F5 → `621fde9` cypress. `npm run build` + `npm run lint` green.

### ▶ PICK UP HERE — post-gate phase (gate passed 2026-06-15)
Done so far: (1) **original-art audit** — confirmed audit-not-feature; Mark turned it into a front-view
composition contract (cypress nearly-reaching-not-clipping · whorl lower/smaller · painted moon · pale
village anchor). (2) **Reset control** built + round-trip verified (direct-set home; drei `target0` bug —
see lessons). (3) **Front-view taste corrections** per the contract — cypress slimmer, softer star/moon
bloom, quieter sky exposure (all baked as leva defaults).
**Next (the stroke-math step in Mark's order):** central whorl lower/less-oversized + deeper-blue sky, with
the flow-field as fine verification only (not a hammer). Then mobile moon framing (needs Mark's bearing) +
the final sky/flow value bake. Awaiting Mark: is the sky deep enough, or push the exposure darker?
To run it: `npm run dev` (was on **:5174**); the leva panel is live for him to drive. Visual-review
loop + capture recipe are in `lessons.md` (canvas readback; `browser_run_code_unsafe` for emulateMedia).

**Post-gate queue (foreground-complete gate PASSED 2026-06-15 — now ACTIVE).** Mark's carried-forward
items (2026-06-15) merged with the prior backlog, in proposed order:
1. **Original-art comparison** — faithfulness audit against `reference/starry-night-source.jpg` + the
   `reference/derived/` crops: set the current captures beside the painting, name colour / swirl-position /
   composition / moon drift, feed the tuning in (4). *Scope default = a review-audit; flag if Mark wants an
   in-app "compare to original" overlay (that's a new product surface — confirm before building).*
2. **Reset control** — ✓ DONE (2026-06-15): a subtle on-canvas "↺ Reset view" button sets the camera to the
   single-source `HOME_POSITION`/`HOME_TARGET` and `update()`s. (drei's `reset()`/`target0` is stale —
   saved [0,0,0] before the target prop; see lessons.) Round-trip verified — orbit far → click → snaps home.
3. **Mobile moon framing** — the moon anchor sits ~42° off view-centre on the arc, so fov alone can't bring
   it into portrait (documented hard limit). Add a portrait-specific camera BEARING in `ResponsiveFraming`
   (currently fov-only). Needs Mark's composition call on the bearing.
4. **Final sky/flow tuning** — bake `flowBias` (0.6 → ?) + the chosen leva values (steeple lift, moon
   prominence, churn speed) as the new defaults. Needs Mark's values from the panel; informed by (1).
5. **Possible impasto enhancement** (optional, Mark's call) — brushstroke-texture the forms like the sky.
6. **Ship hygiene** — slim `flow-field.png` (3.2 MB); strip `leva` from the production build.
7. **Pre-release gate** (the final gate).

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

- [x] F1 — floating island + foreground lighting base. Organic painterly landmass (irregular
      coastline, rocky root fading to near-black) replaces the chocolate-bar slab; cool moon key +
      deep-blue fill so forms model. The "diorama toy" tell is gone.
- [x] F2 — rolling hills. Wavy heightfield band behind the village (taller on the right as in the
      painting), brightened blue-grey vertex bands with a moonlit crest — no longer balloon spheres.
- [x] F3 — village + church. Six clustered gable-roofed houses + a pale slender-spired church
      (lifted from the steeple blue) as the focal point; warm emissive windows.
- [x] F4 — the cypress, re-authored. Displaced flame tube: licking tongues drifting upward, twist +
      sway, deep green-black modelling — Van Gogh's flame, not a smooth blob.
- [x] F5 — foreground shrubs (`Bush`) complete the ground; lighting tuned; reduced-motion re-verified
      (frozen under `reduce`, churns under control); full capture pass (desktop/orbit/mobile).
- [x] Gate feedback #1 — cypress made taller & more dominant (`girth` knob on `<Cypress>`); capture
      `scratch/f6b-cypress-front.jpeg`, commit `621fde9`.
- [x] **Foreground-complete gate — PASSED (Mark, 2026-06-15).** After the review-response pass (seam ·
      palette provenance · cypress reframe · spec de-stale) + the bolder-hills tweak; captures
      `scratch/g3-{front,orbit}.jpeg`. 4th of 5 gates; post-gate queue is now active.

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
