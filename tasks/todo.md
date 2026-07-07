# The Starry Night — plan of record

Durable cross-session plan. `tasks/lessons.md` holds the memory; this holds the intent.
Locked sections in CLAUDE.md are Mark's. Proposed changes to them go under "Proposed to Mark"
below — never edited in place.

> **Human-facing record (Obsidian):** `~/File Vault/The Starry-night` — dashboard (`_Map`), Status
> (where we are), Sky evolution (visual journey), Concepts (glossary), Timeline. The repo files here
> stay the source of truth; the vault is the navigable layer over them. At session start, read
> `tasks/lessons.md`; the vault's `Status` note mirrors the current state for a quick human catch-up.

## Where we are now (2026-07-05) — read this first

> **NORTH STAR (locked — CLAUDE.md, re-read it).** The endgame is the **3D orbitable diorama**. The flat 2D
> piece is a FOUNDATION milestone, NEVER the ship target. Phase now: 2D sky motion settled → **next: make it 3D**.
> (Claude mis-scoped this as "ship flat" on 2026-06-23 — see `tasks/lessons.md`. Don't repeat it.)

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

### ▶ PICK UP HERE (resume — 2D motion settled + live-tuned 2026-06-24; next phase = make it 3D)
- **State (2026-06-24):** on `sky-brushdab`, clean tree, NOT pushed. 2D flat motion settled (`StreamlineSky`) —
  the FOUNDATION for the 3D build, NOT a ship candidate. Mark live-tuned v4 further and those values are now the
  baked defaults (count 2000 · opacity 0.45 · pulse 7.5 · shimmerMix 0.80 · shimmerSpeed 3.0 · shimmerScale 2.8;
  commit `27db731`). To run: `npm run dev` → localhost (Stats top-left; "Show original" A/Bs the painting; leva
  tunes). Captures: `output/playwright/claude-review-v4/`.
- **Tuning now persists (dev tooling, `27db731`):** sky defaults live in `src/scene/sky-tuning.json` (read via
  `tuned()` in `src/scene/tuning.ts`); the dev-only **"set as default"** button in the leva `streamline sky`
  folder writes the current values there (both folders) — survives reload AND bakes into the production build.
  Factory v4 numbers remain as code fallbacks, so clearing the JSON resets. Hardened writer = `/__set-tuning` in
  `vite.config.ts` (serve-only). Detail in `tasks/lessons.md` (2026-06-24 entry).
- **Next phase — make it 3D (the locked orbitable-diorama vision).** Carry the settled streamline motion into 3D;
  the Codex note's curved-canopy path (integrate motion in the painting's UV space — which `StreamlineSky` already
  does — then map onto the dome, constrained orbit) is the natural route. `SkyDome`/`Diorama` scaffolding is
  parked-but-present (unimported legacy) — likely the starting point, re-fitted with the streamline motion.
- **Open 2D taste calls first (Mark):** is v4 the "proper 2D" to build 3D from, or tune further (grain vs the video,
  cobalt depth, foreground forms)? A live drive + a quick fps glance settles it.
- **Perf UNVERIFIED** — count 2000 ribbons (one draw call, lowered from 3000 in Mark's tuning); confirm 60fps
  desktop / 30fps mid-tier mobile on real hardware (headless rAF reads 0).

### 2026-07-05 route check — execute the 3D front-canopy MVP next

Mark reviewed the current localhost and called it too plain for the next gate. The two YouTube references now
resolve the direction:

- **Primary motion model:** Petros Vrellis / `pvrellis` Starry Night animation — the painting behaves as a connected
  flow field; strokes carry the motion as one sky system.
- **Secondary polish model:** Temponaut / Moonlight Sonata Van Gogh animation — use for cinematic glow, pacing, and
  musical drama only after the flow spine works.

Implementation order:

1. **3D front-canopy MVP first.** Re-fit the settled `StreamlineSky` logic into a 3D canopy: integrate in the
   painting's UV space, then map the ribbons onto a curved front sky over the existing diorama forms. Keep the
   head-on composition faithful to the painting.
2. **Constrained orbit only.** Allow enough orbit to prove depth, but do not chase full 360 coverage yet; full 360 is
   where earlier passes got pulled into mirror symmetry, invented backs, and generic vortex language.
3. **Use the parked `Diorama`/`SkyDome` scaffolding selectively.** Reuse foreground forms, moon/star placement, bloom,
   and orbit lessons; do not revive brush-dabs or the native 360 vortex sky as the main carrier.
4. **Gate by looking.** Capture desktop + mobile and compare against the painting plus the `pvrellis` reference. Tests
   and heatmaps do not prove the feel.

Hard negatives remain closed: no independent tiny dabs, no worm-like micro-strokes, no water-blur base advection, no
mechanical halo fan-spin, and no A/B parsed-frame ping-pong.

### 2026-07-05 failed implementation — 3D front-canopy pass REVERTED

The first local 3D front-canopy attempt was presented and Mark rejected it immediately. Treat it as a failed pass, not
progress.

What failed:

- The canopy read as a flat rectangular card behind the scene, not a convincing R3F/Three composition.
- The old faceted `Diorama` foreground looked like placeholder geometry and dominated the frame.
- The screenshot itself showed obvious presentation failures: dev controls/tooling and title/FPS collisions were visible
  during review.
- Passing `lint`/`build`/pixel checks did not matter because the visual gate was plainly not met.

Action taken: runtime code was reverted to the settled 2D `LivingPainting` + `StreamlineSky` baseline. Do not resurrect
the failed `FlowCanopySky` implementation as-is. The next 3D attempt must start with a real composition plan and visual
blocking pass before replacing the localhost presentation.

### 2026-07-05 autonomous implementation loop — 3D front-canopy MVP, then TechArtist correction

Mark requested a Codex-owned design loop with no approval gates: draft spec → self-review/edit → draft plan →
self-review/edit → implement → review → Playwright capture → only present if the screenshot is strong enough.

Artifacts created:

- Spec: `docs/superpowers/specs/2026-07-05-autonomous-3d-front-canopy-spec.md`
- Plan: `docs/superpowers/plans/2026-07-05-3d-front-canopy-mvp.md`
- Captures: `output/playwright/front-canopy-mvp-2026-07-05/`

Implementation result:

- Default route stays the restored 2D foundation.
- New review route: `?mode=canopy&clean=1`
- Shared source-space streamline builder powers both 2D and 3D paths.
- 3D canopy projects painting-UV streamlines onto the curved front volume.
- Gate capture uses a UV-registered curved foreground matte instead of the old faceted `Diorama`.
- Playwright capture set includes desktop final/no-post, edge-debug, sky-only, and mobile final/no-post.

Current correction from Mark: this is **not** the original 3D target. It is a technical front-canopy proof, but the
inspiration in `~/Downloads/Videos/techartist_` is a genuine orbitable diorama/world: floating landmass, physical forms,
authored terrain, object identity, orbit camera, and atmosphere/preset controls. Do not continue treating the canopy
surface as the main 3D direction.

Revised direction:

1. Restore the TechArtist-inspired target as the 3D model: Starry Night as a physical floating diorama/world.
2. Keep `StreamlineSky` as the sky-motion source, but mount it inside/behind a real authored 3D stage rather than making
   the painting itself the whole 3D object.
3. Replace the matte foreground with real forms: flame cypress, rolling hills, village/church, moon/stars, and a floating
   terrain base that reads like an inspectable object.
4. Use orbit and depth as first-class product behaviours, not just proof that a curved canvas is not flat.
5. Treat preset dials/time-of-day as later inspiration only; core Starry Night world comes first.

Publish/DNS/portfolio stays parked until the fidelity gate passes.

### 2026-07-05 TechArtist-style diorama route — failed, not passed

Codex ran the requested loop again: spec → self-review/edit → plan → self-review/edit → implementation → review →
Playwright capture → visual self-review.

Artifacts:

- Spec: `docs/superpowers/specs/2026-07-05-techartist-diorama-spec.md`
- Plan: `docs/superpowers/plans/2026-07-05-techartist-diorama-mvp.md`
- Captures/self-review: `output/playwright/techartist-diorama-2026-07-05/`

Implementation:

- New review route: `?mode=diorama&clean=1`
- Debug/capture routes: `?mode=diorama&debug=nopost&clean=1`, `?mode=diorama&debug=stage&clean=1`,
  `?mode=diorama&view=orbit&clean=1`
- Reuses the parked `Diorama`/`SkyDome` as a physical stage plus living-sky scaffold, not as a curved painting surface.
- Adds deterministic terrain blade/stroke detail, ridge stones, muted cloud puffs, constrained orbit, and camera presets.
- Adds layout/camera tests in `scripts/diorama-layout.test.ts`.

Current visual verdict from Mark:

- **Epic failed, not pass.** The implementation is a physical stage, but it is not the original painting in 3D.
- The star flow and sky soul do not match Van Gogh's painting. The scene reads as generic diorama + legacy streak sky,
  not a 3D translation of the original art.
- The mistake was reviewing the TechArtist mechanism before re-reviewing the source painting. Future 3D work must start
  from `public/reference/painting.jpg`, `public/reference/signed-flow.png`, `public/reference/flow-field.png`, and
  `public/reference/sky-mask.png`, then implement the physical world around those constraints.

Next step:

1. Write a painting-first 3D visual contract: horizontal S-flow, central double whorl, embedded vortex stars, dominant
   moon/crescent, left flame-cypress silhouette, low village/church, rolling hill band, and source-sampled colour.
2. Rebuild the diorama route so the settled source-space `StreamlineSky` ribbon model is the primary sky mechanism in
   3D; the physical stage supports the painting composition instead of competing with it.
3. Keep TechArtist only as interaction inspiration: orbitable compact world, physical depth, constrained camera.
4. Keep time-dial/presets parked until the core Starry Night world passes visual review.

### 2026-07-05 painting-first diorama recovery — implemented, not final gate

Artifacts:

- Spec: `docs/superpowers/specs/2026-07-05-painting-first-diorama-recovery-spec.md`
- Plan: `docs/superpowers/plans/2026-07-05-painting-first-diorama-recovery.md`
- Captures/self-review: `output/playwright/painting-first-diorama-2026-07-05/`

Implementation:

- New source-derived sky component: `src/scene/PaintingFlowSky3D.tsx`
- `?mode=diorama` no longer uses the legacy `SkyDome`; it uses the settled source-space streamline ribbon builder
  mapped into the 3D front volume.
- Added `?mode=diorama&debug=flow&clean=1` to inspect the painting-derived sky without the stage.
- Moon and star halos now come from `skySwirls.ts` UV positions rather than invented world positions.
- Removed the generic cloud puffs from the stage because they competed with the original painting's central whorl.
- Added a portrait camera so mobile keeps cypress, village, whorl, and a cropped moon in the same frame.

Current visual verdict:

- Mark review: **Improvement; right direction; keep the gate open.** This is the active 3D route to pick up next
  time, but it has not passed the visual gate.
- Better: the sky now clearly carries the original painting's horizontal S-flow, central double whorl, embedded star
  nodes, and source-sampled colour. This is much closer to the painting than the rejected TechArtist-style pass.
- Better: no-post still reads, and the stage is supporting the painting rather than being the whole product.
- Still not final: the source projection can still read like a curved painting layer at the edges; the 3D cypress is
  still too black/prop-like compared with Van Gogh's painted flame; portrait shows the moon but still crops it.

Next step:

1. Fix the foreground/source registration: rebuild the cypress as a thinner left-edge flame that covers the source
   cypress void and carries visible green/brown brush modelling.
2. Break the remaining rectangular projection read by extending/inventing only the back/edge sky in the same derived
   flow style, while preserving the front source composition.
3. Improve mobile composition so the moon is fully visible without losing the cypress/village anchor.

### 2026-07-06 pickup — checkpoint committed; mobile moon framing improved

- Recovery checkpoint committed locally as `145dc5d feat(3d): add painting-first diorama recovery`; still not pushed.
- Tried three cypress/source-registration mini-passes and reverted them because they were visually worse: a black blade,
  a pale cutout, then a mis-sampled source-texture strip. Do not treat those as progress.
- Kept a narrow camera fix: the portrait `?mode=diorama&clean=1` view now uses a wider/farther mobile camera aimed
  enough right to keep the moon crescent in frame while retaining village, whorl, and a left cypress anchor.
- Evidence: `output/playwright/pickup-2026-07-06-mobile-camera/`.

### 2026-07-06 follow-up — switch the diorama contract from 360 to a front arc

- Mark review: the route still fails if the visitor gets behind the cypress because the back exposes the void.
- Decision: stop treating full 360 as required for this slice. The diorama should be **front-arc orbitable** now:
  enough orbit to feel physical, but no side/rear inspection until the cypress/source edge can be authored as a true
  object.
- Implementation target: clamp `?mode=diorama` OrbitControls to a practical asymmetric azimuth envelope and record that
  rear-cypress exposure is a reject condition, not a missing polish item. Exact ±90° and broader symmetric arcs still
  showed too much blank side void in self-review; final envelope is -15° toward the bad rear-cypress side and +45°
  toward the side that still reads as an inspectable diorama.
- Evidence: `output/playwright/diorama-front-arc-2026-07-06/`.

Next step remains after the front-arc clamp:

1. Re-approach cypress/source registration from a proper visual contract instead of ad-hoc geometry tweaks.
2. Dissolve the remaining projected-sky edge into a derived world-space continuation.
3. Keep the improved portrait camera unless Mark prefers a tighter crop.

Pickup command:

```bash
npm run dev -- --host 127.0.0.1
# open http://127.0.0.1:5173/?mode=diorama&clean=1
# flow-only honesty check: http://127.0.0.1:5173/?mode=diorama&debug=flow&clean=1
```

### 2026-07-06 reset — Option 1 living relief route

- Mark review after the front-arc patch: **not okay; still terrible.** The void/card-edge problem remains visible, the
  cypress reads as a dead prop, and the mouse interaction exposes the projection instead of making the painting feel
  alive.
- Active implementation target: **Option 1, living relief painting.** Build and verify `?mode=relief&clean=1` as an
  isolated route before touching the rejected `?mode=diorama` again.
- Contract: keep the original painting and sky fixed in the frame; reuse `LivingPainting` + `StreamlineSky`; apply only
  tiny pointer motion to source-masked cypress/lower-foreground relief layers; no finite sky card, no toy island, no
  black-cone cypress.
- Option 2 remains the later v2 target: a true authored 3D diorama rebuild only after Option 1 recovers the painting's
  soul.

Pickup command:

```bash
npm run dev -- --host 127.0.0.1
# open http://127.0.0.1:5173/?mode=relief&clean=1
# sky-only check: http://127.0.0.1:5173/?mode=relief&debug=sky&clean=1
# layer-mask check: http://127.0.0.1:5173/?mode=relief&debug=layers&clean=1
```

Implementation checkpoint:

- Built `?mode=relief` as the active Option 1 route. It keeps the painting and sky fixed, reuses source-space
  `LivingPainting` + `StreamlineSky`, and adds only source-masked cypress/lower-foreground relief.
- Verification: `npm run test:sky` (31/31), `npm run lint`, and `npm run build` pass; build keeps the existing Vite
  large-chunk warning.
- Captures: `output/playwright/living-relief-2026-07-06/desktop-final.png`,
  `desktop-sky.png`, `desktop-layers.png`, `desktop-pointer-left.png`, `desktop-pointer-right.png`,
  `desktop-reduced.png`, `mobile-final.png`.
- Extra mouse check: reduced-motion centre/left/right pointer captures have 0 mean pixel difference in an upper-right
  sky crop, so the sky/background is no longer sliding under pointer input.

### 2026-07-06 Codex failed patch — native-dome angle repair is NOT the pickup path

- Mark rejected the relief fallback as effectively the old v1. Codex then attempted to repair `?mode=diorama&clean=1`
  directly by replacing the source-projected sky with a native full-dome brush-dab field and lifted real cypress
  geometry. This is **not a passed direction**.
- What improved technically: the latest uncommitted patch reduces the most obvious projected-card side smear / rear
  void in orbit captures.
- Why it failed: it threw away the project’s settled medium. The notes and captures say the best motion carrier is the
  source-space `StreamlineSky` / `buildSourceStreamlineRibbons()` ribbon model, not a native procedural dab field. The
  new sky reads like generic dash/confetti motion, and the cypress/island remain simplified prop forms. It is cleaner
  geometry but worse Starry Night.
- Treat the current modified files as a **failed uncommitted Codex experiment** unless Mark explicitly chooses to keep
  pieces. Do not continue from the native-dome brush-dab implementation as the next pickup.
- Mechanical checks on the failed patch did pass (`npm run test:sky` 32/32, `npm run lint`, `npm run build` with the
  existing Vite large-chunk warning), proving again that green checks are not the visual gate.
- Failed-capture evidence: `output/playwright/diorama-angle-fix-2026-07-06/desktop-centre.png`,
  `desktop-angle-left.png`, `desktop-angle-right.png`, `desktop-orbit-preset.png`, `desktop-flow.png`,
  `desktop-nopost.png`, `mobile-centre.png`, plus `capture-summary.json`.

Correct pickup:

1. Revert or discard the uncommitted native-dome/cypress changes unless Mark asks to salvage a narrow part.
2. Resume from the committed painting-first/front-arc line: `145dc5d` → `6924228` → `396a51d`.
3. Preserve `PaintingFlowSky3D` as a source-space streamline-ribbon sky. The source-ribbon flow is the primary asset.
4. Fix only the cypress/source-edge/card-boundary problem inside the constrained front-arc contract.
5. Keep comparing against `public/reference/painting.jpg`, `signed-flow.png`, `flow-field.png`, `sky-mask.png`, and the
   historical captures that carried the “soul” of the painting.

### 2026-07-07 painting-first front-arc sky recovery checkpoint

- The native-dome failure has been discarded from code and preserved only as evidence:
  `output/failed-patches/2026-07-07-native-dome-codex-failure.patch`.
- The live `?mode=diorama&clean=1` route is still a 3D/front-arc diorama, not a 2D fallback and not a 360 route.
- The sky carrier remains `PaintingFlowSky3D` / `buildSourceStreamlineRibbons()` from source-space painting data.
  `DIORAMA_RECOVERY_CONTRACT` now explicitly rejects native-dome replacement.
- The decisive sky fix is rotation-locking the source-ribbon sky to the camera's orbit delta for this front-arc slice.
  The diorama can rotate, but the painting sky no longer slides into a messy side/rear projection when dragged.
- A subtle `SkyEdgeBackfill` sits behind the source ribbons. Earlier clamped/mirrored texture-edge variants failed
  visual review because they created stretched side smears; the committed version is a soft palette/flow wash only.
- The cypress remains the existing 3D faceted flame, with a darker painterly backing volume to reduce the
  cypress/source-hole reveal. This is acceptable for the sky slice, but tree/village polish is still a separate phase.
- Captures: `output/playwright/diorama-recovery-2026-07-07/`.
- Verification: `npm run test:sky` (34/34), `npm run lint`, `npm run build` (existing Vite chunk warning only),
  `npm run capture:diorama -- output/playwright/diorama-recovery-2026-07-07`.
- Next focus after Mark review: village, hills, cypress/tree modelling, and foreground hierarchy. Do not reopen 360
  until the front-arc sky and object staging pass taste.

### 2026-07-07 open-gate checkpoint — source-locked foreground matte

- Mark rejected the prior screenshot again: **not pass**. The correct reading of Claude Code's better attempts is now
  recorded: Claude did not solve the back-cypress void by covering it with a larger independent 3D tree. The better
  historical mechanism was source-locked foreground/cypress ownership, while the native 360 dome route remains rejected
  because it loses the source-ribbon soul.
- New checkpoint: `?mode=diorama&clean=1` now renders a source-locked `DioramaForegroundMatte` in the same UV projection
  as `PaintingFlowSky3D`. This gives the original painting's cypress/foreground pixels ownership of the void before any
  3D cypress volume is layered on top.
- The rejected giant cypress fin backing volume is removed from final mode. The 3D cypress is reduced/lifted into a
  smaller inner volume/accent. This improves the specific back-void failure but does **not** pass the whole diorama gate.
- Dedicated pickup note: `tasks/2026-07-07-source-matte-open-gate.md`.
- Evidence: `output/playwright/diorama-source-matte-v3-2026-07-07/` (`desktop-centre`, both drag boundaries, orbit
  preset, mobile, no-post, flow/stage diagnostics).
- Verification before commit: `npm run lint`, `npm run test:sky` (34/34), `npm run build`, and
  `npm run capture:diorama -- output/playwright/diorama-source-matte-v3-2026-07-07`.

Open gate / next step:

1. Review the source-matte checkpoint live with Mark; do not call it passed.
2. Tune or rebuild the relationship between the flat source cypress matte and the 3D cypress so it reads as one flame.
3. Continue with village/hills/foreground hierarchy only after the cypress/source ownership feels credible.
4. Keep full 360 out of scope until the front-arc/180-style route passes taste.

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

## Course-correction — 2D flat is the FOUNDATION, not the final form (Mark, 2026-06-23)

Earlier this session Claude mis-scoped the flat direction as "lock flat → drive to the pre-release gate."
Mark's actual goal: **tune the proper 2D version first (the flat `StreamlineSky`), THEN make it 3D.** The
flat piece is a milestone, not the ship target.

- **The locked 3D-diorama spec STAYS** (orbit limits, the diorama/head-on criterion, the bar's 360/back
  clause). No reconciliation-to-flat — 3D is the destination, which IS the original locked vision.
- **Pre-release is NOT the next move.** Next phase = the 3D build, with the settled 2D motion (`StreamlineSky`)
  as its foundation. The Codex note's curved-canopy path (integrate motion in the painting's UV space — which
  `StreamlineSky` already does — then map onto the dome) is the natural route.
- Prior 3D scaffolding is parked-but-present in the repo (`SkyDome` / `Diorama` / `dabField` legacy,
  unimported) — likely the starting point, re-fitted with the new streamline motion.

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
