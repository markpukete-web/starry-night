# The Starry Night — plan of record

Durable cross-session plan. `tasks/lessons.md` holds the memory; this holds the intent.
Locked sections in CLAUDE.md are Mark's. Proposed changes to them go under "Proposed to Mark"
below — never edited in place.

> **Human-facing record (Obsidian):** `~/File Vault/The Starry-night` — dashboard (`_Map`), Status
> (where we are), Sky evolution (visual journey), Concepts (glossary), Timeline. The repo files here
> stay the source of truth; the vault is the navigable layer over them. At session start, read
> `tasks/lessons.md`; the vault's `Status` note mirrors the current state for a quick human catch-up.

## Where we are now (2026-06-23) — read this first

> **QUALITY GATE OPEN (Mark, 2026-06-20).** Foreground-complete gate stays passed; pre-release sign-off withdrawn
> for sky visual quality. No publish mechanics until the fidelity gate passes.

**The sky motion is settled: a streamline-ribbon churn (`StreamlineSky`) over the flat `LivingPainting` base.** The
painting stays 1:1 as a static base (the foreground IS the painting, pixel-faithful); `StreamlineSky` animates only the
sky — continuous ribbons integrated through the painting's signed flow field, with a brightness phase travelling along
each stroke (painted stroke energy moving through the marks, not dabs/worms/water). This replaced the earlier brush-dab
churn (`BrushDabs`, now removed); the dab history lives in `tasks/lessons.md` + git.

- **Built by Gemini (Antigravity), 2026-06-22→23, over four capture-verified review rounds** against the parsed
  reference video. Closed the motion brief's three axes: full-sky coverage (to the horizon, GPU-mask faded — no rooftop
  spill); ringing star + moon halos (halo shimmer as paint, moon crescent static; centres from `skySwirls.ts`); finer
  dense grain. v4 leva defaults: count 3000 / strokeWidth 0.0032 / opacity 0.55 / speed 1.6 / shimmerMix 0.30.
- **Committed on `sky-brushdab`** — `9c021df` (feat: the look) + `dc106ae` (docs: brief + notes). build/lint/`test:sky`
  15/15 green. NOT pushed/merged → gate OPEN.
- **Result worth remembering:** across the four rounds the motion-map MEAN fell (1.56 → 1.14 → 1.33 → 1.23) while
  coverage, halos and perceived liveliness ROSE — a clean confirmation that the heatmap mean is not proof; only looking is.
- **Workflow rule in force (Mark):** verify every change by LOOKING at the rendered crop vs the painting (Playwright
  capture), not heatmaps/tests. See `memory/visual-check-every-iteration`.

### ▶ PICK UP HERE (resume — sky motion settled 2026-06-23, awaiting Mark's live sign-off)
- **State:** committed `9c021df` + `dc106ae` on `sky-brushdab`, clean tree, NOT pushed. Motion look settled
  (`StreamlineSky`). To run: `npm run dev` → localhost (Stats panel top-left; "Show original" A/Bs vs the painting; leva
  panel for live tuning). Review captures (regenerable, gitignored): `output/playwright/claude-review-v4/`.
- **Mark's live sign-off** on the settled motion is the open call — taste, and whether to push/merge (deploy is Mark's).
- **Perf UNVERIFIED** — count 3000 ribbons (one draw call); confirm 60fps desktop / 30fps mid-tier mobile on real
  hardware (headless rAF reads 0).
- **Remaining vs the video (taste, diminishing returns):** deepest low-sky corners a touch calmer + grain marginally
  less fine than the video's stipple — pushing further trades against the boil/fog margin.
- **3D parked:** Codex's `?mode=3d` bridge (flat sky → SkyDome diorama) was stripped "for now" (Mark). Revisit if
  returning to an orbitable diorama — the flat approach diverges from the locked 3D-diorama camera criteria, Mark's call.

Publish/DNS/portfolio stays parked until the fidelity gate passes.

---

## Earlier status (2026-06-20 → 06-21, superseded by the flat Living-Painting + patch-stroke work above)

Mark's earlier direction (2026-06-20): closer to the original in 3D; lead issue sky flow. Spec
`docs/superpowers/specs/2026-06-20-sky-flow-fidelity-design.md`. The pass below ran on the 3D-diorama/SkyDome sky
before the pivot to the flat Living-Painting.

### Sky brush-dab redesign — built & reviewed, but NOT passing (branch `sky-brushdab`, 2026-06-20)

A full sky redesign was built on branch **`sky-brushdab`** — **16 commits, NOT merged, NOT pushed → gate OPEN.**
`npm run build`/`lint`/`test:sky` green throughout. What it is: the sky is now a field of GPU-instanced
**brush-dabs** placed along the derived flow and drifting Vrellis-style, replacing the extruded-ribbon
"liquid chrome" sky. Spec `docs/superpowers/specs/2026-06-20-sky-brushdab-design.md`; plan
`docs/superpowers/plans/2026-06-20-sky-brushdab.md`. Built subagent-driven (Tasks 1–7, 11 node tests),
reviewed by a 6-lens internal pass **and** a Codex whole-branch pass.

Fixes that landed: moon crescent un-flipped to match the painting; reduced-motion full-coverage still
(`uFreeze`); swirl-eye protection restored; thinner/crisper dabs so stars aren't blurred; anchor-densified
seeding; a dev-only **"set as default"** tuning button (writes `src/scene/sky-tuning.json` via a
security-hardened endpoint); stars/moon brightness lowered.

### Fidelity pass DONE — methodical frame-by-frame against the original (2026-06-21, 8 commits, on branch)

The disciplined frame-by-frame method worked where ad-hoc slider tuning had failed. Grounded in a deep-research
run (history/astronomy/turbulence/film refs → `tasks/wgssvj03w.output`) + matched-region crops vs
`reference/starry-night-source.jpg` (`scratch/cmp/`). One change per capture. All green, all committed (not pushed):

- **P1** long-ribbon dabs (decoupled length so they join into continuous strokes, not confetti) + density 12k→22k.
- **P2** removed the swirl eye-glow entirely (the painting's swirl hearts are paint, not light — the glow read as
  a dark-hole "portal"/"eye"). The inverted-glow insight: the painting glows STARS, not swirls; we were reversed.
- **P3** radiant star halos (small bright core in a big halo), Venus the brightest. The dead `glow` control now
  drives them. + crisper halo falloff.
- **De-blur** (Mark live): decouple ribbon length from width so width is a pure crispness knob; strokeWidth →0.8.
- **Camera** (Mark live): home moved head-on + eye-level to match the flat painting (azimuth 26°→7°, dropped to
  target height; maxPolar 1.5→1.62 to allow a level home). Village seen front-on, not bird's-eye.
- **P4** warm orange-gold moon in a contained glow (was pale lemon + small halo).
- **P5/P5b** deepen toward cobalt night (tone-aware: blue field down, highlights held) + saturation/gradient.
- **Whorl notch** filled by interlocking the two central rolls into a true double-comma (counter-roll pulled in).

Captures: `scratch/cmp/SESSION-before-after.jpg`, `GRAND-painting-vs-ours.jpg`, `angle-3way.jpg`, `notch-whorl.jpg`.

### Remaining as of 06-21 (on the 3D-diorama sky, mostly superseded by the flat pivot)

- **Mark to review** the live sky (localhost:5173, leva panel) / the captures — taste + how-deep-cobalt calls.
- **Perf UNVERIFIED**: ~22k dabs at eye-level — confirm 60fps desktop / 30fps mobile on real hardware.
- **Foreground (P6, not started this pass)**: cypress still reads as a smooth dark blob (vs the painting's slim
  flame at the far-left edge); the landmass is a flat slab (vs rolling hills). Foreground-complete gate already
  passed, so treat as fidelity polish, not a rebuild — confirm scope with Mark.
- Diorama vs flat painting: still a floating island with empty blue around it (the 3D concept). If Mark wants it
  closer to the painting's full-frame foreground, that's a composition call.

Publish/DNS/portfolio work stays parked until the fidelity gate passes (Mark's call).

## Previous status (2026-06-15, superseded by reopened quality gate)

> **✅ FOREGROUND-COMPLETE GATE PASSED (Mark, 2026-06-15).** 4th of 5 gates; only the **pre-release gate**
> remains. In the post-gate phase — proceed autonomously on the queue; the gate review is Mark's.

**This session (2026-06-15) — all committed AND pushed to `origin/main`** (2026-06-15, Mark's go). The foreground-complete gate review
response (island seam fix · palette provenance · cypress reframe · spec de-stale) → **gate passed** → a run
of post-gate polish: bolder hills · original-art audit (→ Mark's front-view composition contract) · reset
control · front-view corrections (cypress slimmer · softer star/moon bloom · quieter sky exposure) · sky
deepened one notch (tone-aware) · central whorl lowered + tightened · mobile moon framing (portrait camera
bearing + aspect-aware reset). Each step verified by capture; `npm run build` + `npm run lint` green
throughout. Recent commits: `303325d` `8280ebf` `b9e94b7` `b317c97` `adc48ba` `d12fc35` (see `git log`).

**State of the piece:** the front composition MEETS Mark's painting contract — cypress nearly-reaching-not-
clipping · deep-blue sky · whorl over the church · painted (not sticker) moon · pale village anchor. Portrait
reads as Starry Night WITH the moon; the reset button works on both aspects. Sky + foreground colours are
derived from `palette.json`; reduced-motion freezes the churn. The leva dev panel is live for final tuning.

**Open these captures first:** `scratch/g9-front.jpeg` (desktop hero) · `scratch/g11-mobile-after.jpeg`
(portrait + moon) · `scratch/g12-portrait-reset.jpeg` (reset keeps the moon).

**The scene** is an orbitable 3D floating-island diorama (organic island · rolling moonlit hills · gable
village + pale-spired church · Van Gogh flame-cypress · shrubs) under the churning, anchored, glowing vortex
sky. The full build history — the foreground F1–F5 rebuild, the sky's evolution, and every session lesson —
lives in `tasks/lessons.md` (newest at the bottom of each section); this file holds the current intent.

### Superseded pickup — pre-release gate paused
The post-gate composition pass + ship hygiene are done. **Final value bake CONFIRMED (Mark, 2026-06-15):**
he supplied the full leva set and ALL 14 values match the current baked defaults exactly — the look this
session converged on IS the locked ship look (no code change needed). Everything before the final gate is
done. **At the pre-release gate** — capture set READY: `scratch/release-{front,orbit,mobile,reduced}.jpeg`.
Locked criteria status: flow-driven motion ✓ · palette colours ✓ (documented lifts) · reduced-motion frozen
✓ (byte-identical frames) · orbit limits ✓; **performance is the one left to confirm on real hardware** —
headless is software-rendered, Mark's machine was 120 fps on the sky pre-foreground; needs a re-check with
the foreground + a mid-tier mobile. Pre-release is paused until the reopened quality gate passes. NB actual
deploy (Vercel + Cloudflare DNS,
`starrynight.markma.dev`) per CLAUDE.md. **Pushed to `origin/main` 2026-06-15** on Mark's go. **Vercel
PREVIEW deployed (2026-06-15):** linked project `starry-night` (`prj_1bvAN2…`, scope `markpukete-web`);
`vercel --yes` → READY at `starry-night-6e5cztkfg-markpukete-webs-projects.vercel.app`. BUT it returns
**401 — Vercel Deployment Protection (Vercel Authentication) is ON**, so the URL isn't public (viewable only
logged into Mark's Vercel account). Pending Mark's go: (a) `vercel --prod` for the production URL, (b) toggle
Deployment Protection off for public access (project Settings — access decision, Mark's call), (c) custom
subdomain + Cloudflare DNS (still PARKED — not set up). Prod build verified panel-free (DOM: 0 leva
elements). Open acceptance box: real-hardware fps — Mark's to check.
To run: `npm run dev` (was on **:5174**); leva panel live. Visual-review + capture recipe in `lessons.md`
(canvas readback; `browser_run_code_unsafe` for emulateMedia/viewport).

**Post-gate queue (foreground-complete gate PASSED 2026-06-15 — now ACTIVE).** Mark's carried-forward
items (2026-06-15) merged with the prior backlog, in proposed order:
1. **Original-art comparison** — faithfulness audit against `reference/starry-night-source.jpg` + the
   `reference/derived/` crops: set the current captures beside the painting, name colour / swirl-position /
   composition / moon drift, feed the tuning in (4). *Scope default = a review-audit; flag if Mark wants an
   in-app "compare to original" overlay (that's a new product surface — confirm before building).*
2. **Reset control** — ✓ DONE (2026-06-15): a subtle on-canvas "↺ Reset view" button sets the camera to the
   single-source `HOME_POSITION`/`HOME_TARGET` and `update()`s. (drei's `reset()`/`target0` is stale —
   saved [0,0,0] before the target prop; see lessons.) Round-trip verified — orbit far → click → snaps home.
3. **Mobile moon framing** — ✓ DONE (2026-06-15, approved): a portrait-specific camera BEARING (~24° toward
   the moon, `PORTRAIT_AZ` via `homePositionFor`), reset made aspect-aware so the moon stays after a reset.
   Composition shifts a touch left (documented trade Mark accepted). A/B `g11-mobile-after` · reset `g12`.
4. **Final sky/flow value bake** — ✓ CONFIRMED (Mark, 2026-06-15): supplied the full leva set; all 14 values
   match the current baked defaults exactly (the session's tuning converged on his ship look). No change.
5. **Possible impasto enhancement** (optional, Mark's call) — brushstroke-texture the forms like the sky.
6. **Ship hygiene** — ✓ DONE (2026-06-15): `leva` stripped from the prod bundle (build-time alias → stub;
   1,383→1,183 kB) · `flow-field.png` slimmed 3.38→0.91 MB (2× box-downsample, `scripts/slim-flow-field.ts`).
   Both verified no-visual-change. (`painting.jpg` 1.06 MB is the remaining sizeable asset — left as-is; it
   carries the stroke colour and is the palette's own source.)
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
- [ ] Gates remaining: **pre-release** — the last gate (foreground-complete passed 2026-06-15)

## Parked ideas (scope-growth — do NOT build without Mark)

- (none yet)

## Proposed to Mark — reconcile the locked spec to the flat direction (2026-06-23)

Mark chose to lock the flat Living-Painting + `StreamlineSky` as the final form (2026-06-23). The locked
sections still describe the orbitable 3D diorama; these edits bring them in line. Mark applies (locked
sections are his) — veto/reword freely.

- **Acceptance criterion — camera.** Current: "Camera stays within the orbit limits in Tunables (polar +
  distance; no free-fly or panning); the diorama always reads as Starry Night — head-on it is the painting's
  composition." → Propose: "The view is the painting's composition head-on — a fixed, non-navigable framing
  (no orbit, pan, or zoom). Visitor controls are pause/play, compare-to-original, and fullscreen only; the
  piece always reads as Starry Night."
- **The bar (only Mark edits).** The additive 360°/invented-back parenthetical no longer applies (a flat
  painting has no back). → Propose replacing it with: "(The sky's motion and colour are derived from the
  painting itself — the head-on composition follows the painting's real geometry and derived flow field.)"
- **Out of scope.** "Free-fly / unconstrained camera" still holds trivially (the flat piece has no camera nav
  at all). → Propose adding: "Camera navigation of any kind (orbit / pan / zoom). The flat direction
  (2026-06-22) presents the painting head-on, fixed; the earlier 3D-diorama orbit is retired — revisit only
  as a deliberate new phase."
- **Tunables — camera orbit limits** (Claude may edit, but this pairs with the locked criterion, so it's
  grouped here). → Propose: "N/A for the flat direction — no camera navigation."
- **Not locked, Claude can apply on your nod:** the Stack note "current App.tsx scene is a scaffold
  smoke-test placeholder" is stale (App.tsx is the shipping flat piece), and the `README` still describes the
  orbitable diorama — both want a flat-direction refresh before release.

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
