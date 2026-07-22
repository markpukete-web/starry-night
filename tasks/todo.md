# The Starry Night — plan of record

Durable cross-session plan. `tasks/lessons.md` holds the memory; this holds the intent.
Locked sections in CLAUDE.md are Mark's. Proposed changes to them go under "Proposed to Mark"
below — never edited in place.

> **Human-facing record (Obsidian):** `~/File Vault/The Starry-night` — dashboard (`_Map`), Status
> (where we are), Sky evolution (visual journey), Concepts (glossary), Timeline. The repo files here
> stay the source of truth; the vault is the navigable layer over them. At session start, read
> `tasks/lessons.md`; the vault's `Status` note mirrors the current state for a quick human catch-up.

## ▶ WHERE WE ARE (2026-07-22, later) — village pass BUILT (S0–S5); ⏳ at Mark's visual gate

**Checklist item 8 is implemented and verified; Mark gates on the captures.** The three gaps
named in `tasks/2026-07-22-village-look.md` (Mark confirmed the list live) were closed in six
slices after a two-round plan cross-review with Codex
(`docs/superpowers/plans/2026-07-22-village-painterly-pass.md`, all round-1 findings
dispositioned in the plan):

- **S0** `deddf0a` — `villageWarm` palette region derived (0001's stars-style special case;
  sienna stratified because median cut folds a low-population red family into umber at any
  count). `--palette-only` flag guards the gate-passed image assets. `check:village` ΔE census.
- **S1** — cloisonnist ink contours on every house/church edge (belfry band, spire edges);
  p2 scaled segments by edge length (short edges dot-chained) and thinned the lines.
- **S2** `1070259` — church held inside the nocturne band (spire ×2.05+white → ×1.05; delta
  vs background now −4.3 against the painting's −0.37; the contours carry the separation).
- **S3** — cladding 230→700/area IN QUANTISED COURSES (p1's uniform scatter dissolved the
  silhouette into cypress-class fur); per-house palette-family interpolation incl. a
  pale-walled minority (p3), echoing the painting's church-flanking white houses.
- **S4** `4165417` — umber weave (12%/8% dials → band warm fraction 10.9% vs painting 9.78%)
  + the sienna roof landmark left of the church, kicks bounded by the roof rect's p90.
- **S5** — windows as ochre daub clusters with a p90-bounded core; p2 found them ABSENT not
  dim (pushBrush winds CW; windows material was FrontSide → fully culled; now DoubleSide).

**Verification at HEAD:** 96/96 tests, lint, build, `check:reduced` PASS. ΔE census 6.39 →
**2.20** (band Lab L matches the painting exactly). Perf `--perf`: mean 8.33 ms / p95 9.0–9.2 —
identical to the cypress-pass baseline; DPR caps untouched; real-device fps remains item 3.
Indicators (painting/live): stddev 11.32/2.30 · spire delta −0.37/−4.28 · warm 9.78/10.89.

**Review in this order** (all in `output/playwright/`):
1. `village-pass-2026-07-22-s5p3/village-original-vs-live.png` — final matched crop
2. `village-look-2026-07-22/village-original-vs-live.png` — the morning baseline, for the delta
3. `village-pass-2026-07-22-s5p3/desktop-centre.png` + `mobile-centre.png` + drag boundaries
4. Live: `npm run dev` → `http://localhost:5173/?mode=diorama&clean=1`

**If the gate passes:** items 2 (mobile portrait framing), 3 (real-device perf), 4 (deploy) are
what remains — all Mark-owned. Nothing pushed this session yet.

---

## Superseded same day — the morning record (cypress gate)

## ▶ WHERE WE ARE (2026-07-22) — cypress ✅ GATE PASSED; next session = the village

**Gate call, 2026-07-22 (Mark, live):** checklist **item 7 PASSES**. Reviewed against the painting
with fresh captures at `40c0a70`; Mark's verdict on the three review findings was **"those findings
are minor"**. Item 1 (bloom/night balance) is settled in the same call — the diorama ships without
full-frame Bloom. Everything on `sky-brushdab` is **pushed** as of this session.

**What passing means here:** colour solved, stroke length solved, silhouette topology matching the
painting. The open findings are recorded in `tasks/2026-07-22-cypress-review-findings.md` and were
judged not worth another pass — they are **not** a to-do list. Do not reopen them without Mark
asking; specifically, do not re-run the eliminated mip-filtering hypothesis.

**Calibration worth carrying:** my review rated the local-contrast gap as "the one substantive
defect"; Mark rated the whole set minor and shipped. The reviewer's bar was set higher than the
owner's ship bar. Flag what is seen, rate it honestly, and let the gate decide — but do not present
a refinement as though it blocked release.

---

## ▶ NEXT SESSION — checklist item 8, the village painterly pass (agreed with Mark 2026-07-22)

**Start here. Do not start by writing code, a design, or a plan.** The cypress pass only became
tractable once three concrete defects were named against the painting and one measurement shaped the
design. The village gets the same order.

### Step 1 — the look (this is the whole first move)

1. `npm run capture:diorama -- output/playwright/village-look-<date>` — fresh frames at HEAD.
2. Crop the village from the live capture and from the painting, scale both to the same height, and
   put them side by side. Recipe that worked for the cypress, reusable as-is:

   ```sh
   # source: village region rect from palette.json is normalised [0.28, 0.66, 0.78, 0.86]
   # on the 1600x1267 painting that is x 448..1248, y 836..1090
   magick public/reference/painting.jpg -crop 800x254+448+836 +repage -resize x600 /tmp/vil-src.png
   magick output/playwright/village-look-<date>/desktop-centre.png \
     -crop <w>x<h>+<x>+<y> +repage -resize x600 /tmp/vil-live.png
   magick /tmp/vil-src.png /tmp/vil-live.png -append /tmp/vil-compare.png
   ```

3. **Look at it, at true scale, and name the gaps in concrete terms** — the way the cypress got
   "reads near-black", "reads as fur not flame", "silhouette is bulbous". Three or so, specific
   enough that a fix can be aimed at them.
4. Only then: measure whatever the named gaps imply, and let the measurement shape the design.

### Traps paid for on the cypress — do not re-learn these

- **Never judge shape from a shaded render.** Threshold both images to bare masks first. I called
  flat sawn-off tops that did not exist in the geometry; it was shading on the near face.
- **Never judge texture from a blow-up.** Compare at 1:1. A 3× magnification of a 200 px crop made
  correct paint look like smeared driftwood.
- **Say which frame a verdict is in** — against the painting, or against the previous state. Both
  are valid; giving only the absolute one makes a real advance sound like a failure.
- **A useful sharpness metric**, if softness comes up again — 3×3 local standard deviation over a
  matched crop, source versus live:
  `magick X.png -crop WxH+X+Y +repage -colorspace Gray -statistic StandardDeviation 3x3 -format "%[fx:mean*255]\n" info:`
  (Cypress reference numbers: painting 6.45, render 2.01. Mark judged that gap minor — calibrate
  expectations accordingly, and do not treat a number as a defect on its own.)

### Where the village lives

| File | Lines | What it is |
|---|---|---|
| `src/scene/BrushVillage.tsx` | 302 | the houses and steeple |
| `src/scene/BrushIsland.tsx` | 220 | the island mass the village sits on |
| `src/scene/BrushShrubs.tsx` | 148 | the planting around it |
| `src/scene/islandShape.ts` | — | island silhouette source |
| `src/scene/Diorama.tsx` | 26 | assembles the three |

The cypress technique that earned the gate pass, available to reuse: **project the painting's own
pixels onto source-derived geometry** rather than synthesising Van Gogh procedurally
(`BrushCypress.tsx` + `cypressLobes.ts` + `cypressLobeGeometry.ts` are the worked example).
Whether the village wants the same treatment is a design question for after the look — the village
is small, distant and geometric in the painting, where the cypress was large and organic, so the
answer may legitimately differ.

### Working agreement for this pass

- Mark gates on captures, not code. Nothing is "done" until the captures have been looked at
  beside the reference.
- Implementation may go to Codex again; cross-review the plan before greenlighting, as with the
  cypress (two rounds caught 4 P0s, all coordinate-contract errors rather than architectural ones).
- Stop and ask Mark at the gate, on scope growth, or on any new dependency.

---

### Superseded by the gate pass above — the pre-gate record (2026-07-22)

**Where we stopped (2026-07-22):** Mark rejected the first implemented second pass after an
original/live comparison exposed the same black-fur read. That implementation has now been
structurally replaced locally on `sky-brushdab`: the painting's persistent row runs form one main
closed lobe plus two connected side lobes, and the painting itself is source-projected onto those
volumes. Mark then approved implementing the darker, higher-contrast mood in his 2026-07-22
screenshot. Isolation proved that screenshot already matched the authored no-post render; the
full-frame composer was lifting the pale sky strokes. Bloom has therefore been removed from the
diorama rather than countered with a heavy grade. **Checklist items 1 and 7 remain at Mark's visual
gate. Nothing from either repair was pushed.**

**Review in this order:**

1. `output/playwright/cypress-compound-final-2026-07-22/original-vs-live.png` — painting left,
   deterministic live design crop right
2. `output/playwright/cypress-compound-final-2026-07-22/desktop-centre.png` — full composition
3. `output/playwright/cypress-compound-final-2026-07-22/runtime-contact-sheet.png` — final,
   no-post, orbit preset and both drag boundaries
4. `output/playwright/cypress-compound-final-2026-07-22/mobile-drag-left.png` — portrait viewport
   after orbiting the otherwise off-screen far-left tree into view
5. `reference/derived/cypress-lobe-gate.png` — source paint beside the retained lobe identities
6. `output/playwright/night-balance-authored-2026-07-22/desktop-centre.png` — the approved darker
   direction implemented without a full-frame post pass

**What changed after the rejection:**

- The old continuous profile and its self-reproducing ablation were retired. Row-run tracks now
  preserve the source's compound topology and reject distant dark sky paint before 3D compilation.
- Three lobes compile into one batched, closed shallow solid: **2,210 vertices / 3,936 triangles**.
  Their front projection preserves the baked crop's real 176:662 pixel aspect; the rejected pass
  squeezed the tree about 30% horizontally and made every frond look like a spire.
- UVs remain on detected cypress pigment even where a lobe envelope broadens, so side flames do
  not sample blue sky. The source painting supplies the visible long, irregular stroke field.
- The procedural overlay fell from 2,200 ribbons to **48 front + 9 mirrored back** sparse relief
  accents (**4,902 vertices / 4,788 triangles**). This removed both the short-mark fur and the
  evenly spaced bark waves seen in intermediate captures.
- Full-frame Bloom was removed. Authored additive moon/star halos still supply the glow, while the
  cobalt sky and foreground retain the local contrast visible in Mark's reference screenshot.
  `debug=final` and `debug=nopost` intentionally converge; the latter remains a regression control.

**Current evidence:**

- Original/live matched crop: `output/playwright/cypress-compound-final-2026-07-22/original-vs-live.png`
- Displayed regional Lab distribution (honestly not registered per-pixel): mean ΔE76 base
  **0.85**, middle **0.70**, top **3.62**, all below the locked tolerance of 10 after the
  source-alpha stencil excludes surrounding cobalt from the regional sample
- Nine deterministic runtime views, including final/no-post/orbit boundaries: **0 errors**
- Local 1600×900 authored final pipeline, 599 intervals: mean **8.33 ms**, p95 **9.1 ms**, max
  **9.7 ms**; no-post p95 **8.9 ms**. Portrait viewport p95 **9.3 ms** on desktop hardware only; the locked
  real mid-tier mobile gate remains checklist item 3
- **96 tests pass**, lint clean, production build green; reduced-motion frames byte-identical
  while the control churns

**NEXT:** Mark reviews the live localhost tree and authored night balance. If accepted, mark
checklist items 1 and 7 done; if not, record the precise remaining source/live or tonal gap before
another change. Item 8 (village) follows only after the cypress gate. **Do not push unless Mark asks.**

**Git:** compound topology `9b5abc8`, closed geometry `334fbd2`, source-projected runtime
`59cce94`, plus the documentation commit that follows this note; all local on `sky-brushdab`.

## Earlier the same day (2026-07-21) — ship hygiene CLOSED; item 5 decided

**Session summary (2026-07-21).** Ship hygiene is finished and checklist item 5 is decided.
Shipped assets went **19.2 → 10.04 MB (−48%) with no pixel change at any step**, in two passes:

1. **Lossless PNG repack** (`5e1188e`) — 18.17 → 11.20 MB. The hand-rolled encoder was writing
   filter 0 on every row and hard-coding RGBA, so every asset carried a dead alpha plane and the
   mask carried three copies of one grey. Codec collapsed from three hand-synced copies onto
   `scripts/lib/png.ts` (−283 lines), pinned by `scripts/png.test.ts`.
2. **Lossless WebP for the colour assets** (`17dde58`) — 12.21 → 10.04 MB. `painting-filled.webp`
   + the two side strips; flow fields and mask stay PNG, where WebP is bigger. Lossy was measured
   and rejected (item 5 evidence below). `cwebp` approved as a bake-only prerequisite.

Also `c79265f`: the pre-release checklist consolidated into one owned list (this file, above).

**Two instrument lessons this session, both in `tasks/lessons.md` — read them before trusting any
future capture diff:** a diff against a live-churning render means nothing without a same-assets
control run; and capture RMSE cannot measure ANY change that alters load timing (a format swap
shifts decode time, which shifts animation phase) — compare decoded pixels in the browser instead.

**DECIDED 2026-07-22 (Mark):** the README's old Status claimed the cypress and village were due
"a second painterly refinement pass" after the sky-flow work. Mark confirmed it is still wanted —
*"put it in the check list"* — so both passes are now checklist items 7 and 8 below. The pass is
no longer an inherited README claim that could be dropped by silence; it gates release.

### Ship hygiene detail — pass 1

`public/reference` 18.17 → 11.20 MB of
PNG; shipped payload 19.2 → 12.2 MB (−36%). **Zero pixel change** — the assets were re-encoded,
not resampled or converted: `scripts/slim-reference.ts` refuses to write a file unless the
decoded RGBA round-trips byte-identical. Capture A/B ran anyway and confirmed it, against a
same-assets control run that differed more than the A/B did (the churn is live; captures aren't
phase-locked — see lessons).

The win was two storage bugs in the hand-rolled encoder, not the data: every row was written
with filter 0, and every asset carried a constant alpha plane (the mask, three copies of one
grey). Codec collapsed from three hand-synced copies onto `scripts/lib/png.ts` (−283 lines),
pinned by `scripts/png.test.ts` (7 tests; suite now 53). `npm run slim-reference` is idempotent.

**Open decision for Mark — lossy colour assets.** Lossy WebP would take `painting-filled.png`
3.94 → 0.83 MB at q90 and roughly halve the payload again (~12.2 → ~7 MB). Not taken: it attacks
exactly the high-frequency stroke grain the piece is faithful to, and the runtime samples those
pixels directly for ribbon colour. Wants a crop A/B in front of Mark before anyone commits to it.

(Evidence: `output/playwright/slim-baseline-2026-07-21/` vs `slim-after-2026-07-21/`, with
`slim-control-2026-07-21/` as the noise floor.)

**NEXT — work the pre-release checklist below.** It is now the single definition of the last gate.

## ▣ PRE-RELEASE GATE — the checklist (single source of truth, 2026-07-21)

Four of the five locked gates in CLAUDE.md are passed (Phase 0, Phase 1/movable, first full
animated sky, foreground complete 2026-06-15). **Pre-release is the only one left**, so this is
the list that stands between the piece and release.

Consolidated on 2026-07-21 because the items had drifted across two places — the `Backlog`
section and the "standing pre-release items" paragraph repeated in each session's pickup note —
so no one list was complete. **Add pre-release items HERE and nowhere else**; pickup notes should
link to this section rather than restate it.

Owner column is the point: `Mark` items are taste, composition, or deploy calls that Claude must
stop and ask about (CLAUDE.md "Stop and ask Mark when"). `Claude` items are mechanical.

| # | Item | Owner | State |
|---|------|-------|-------|
| 1 | ~~Lighting/bloom balance~~ | Mark | ✅ **PASSED 2026-07-22** — middle-ground authored lighting pass accepted & pushed (`b3420f8`). Sky & foreground midtones lifted 8–11%, halos radiate, deep cobalt floor preserved |
| 2 | **Mobile portrait framing** — responsive fov keeps cypress edge + central whorl + steeple, but the MOON can't fit a portrait frame (≈42° off-centre on the arc); needs a portrait-specific camera bearing | Mark (composition) | open |
| 3 | **Perf on real hardware** — locked criterion: 60 fps desktop, 30 fps mid-tier mobile. Headless cannot measure this; needs a real device pass. Includes confirming stroke budget + DPR caps (Tunables) hold up | Mark to run, Claude to retune | open |
| 4 | **Deploy mechanics** — Vercel prod, Deployment Protection, `starrynight.markma.dev` DNS (Cloudflare CNAME, grey-cloud). CLAUDE.md: anything touching deploy/DNS/analytics is stop-and-ask | Mark | open |
| 5 | ~~WebP for the three colour assets~~ | Mark | ✅ **DONE 2026-07-21** — lossless taken, lossy rejected; payload 12.21 → 10.04 MB |
| 6 | **Portfolio link-out** — markma.dev links to the finished piece (CLAUDE.md: it links out, full stop — never embedded) | Mark | open, post-deploy |
| 7 | ~~Cypress second painterly pass~~ | Claude built, Mark gated | ✅ **PASSED 2026-07-22** — colour and stroke length solved, silhouette topology matches. Residual findings in `tasks/2026-07-22-cypress-review-findings.md` judged minor and not actioned |
| 8 | **Village second painterly pass** | Claude built, Mark gates | ⏳ **BUILT 2026-07-22** (S0–S5, see WHERE WE ARE) — at Mark's visual gate |

**Item 8's first step is not code and not a design — it is a look.** The cypress pass only became
tractable once Mark named three concrete gaps against the painting (near-black, fur-not-flame,
bulbous) and the design was shaped by a measurement rather than a hunch. The village gets the same
order: capture it, read it against the reference crop, name what is wrong in those terms, and only
then design. Sequenced after item 7 so the cladding technique is proven once before it is reused.

Already satisfied, listed so the gate can be checked end-to-end rather than re-litigated:

- [x] `prefers-reduced-motion` dignified still state (locked criterion) — `npm run check:reduced`
- [x] Camera stays within the locked orbit limits (polar 0.2–1.62, distance 3–5.5, no pan/free-fly)
- [x] Ship hygiene — reference PNGs 18.17 → 11.20 MB lossless (2026-07-21); `leva` aliased out of
      the production build (vite.config.ts)
- [x] `npm run lint` clean; `npm run test:sky` green (**96 tests**); `npm run build` green
- [x] README reflects the orbitable-diorama reality, not the scaffold

**Explicitly NOT in this gate** (CLAUDE.md Out of scope / Phase 2): preset dials (time-of-day,
weather) — not before the core piece passes pre-release; the Techartist time-dial interaction
shape — Phase 2 at the earliest; audio, VR/AR, other paintings, gallery framing — never.

### Item 5 evidence — WebP for painting-filled + the two side strips (2026-07-21)

Only these three assets are candidates. **Lossless WebP is WORSE than our PNG for the flow
assets** (signed-flow-filled 1.61 MB PNG vs 2.10 MB WebP), so flow and mask stay PNG either way —
a mixed-format reference set is the correct answer, not a compromise.

| Option | The three colour assets | Total payload | Pixel change |
|---|---|---|---|
| Today (PNG, slimmed) | 6.33 MB | 12.21 MB | — |
| **Lossless WebP** | 4.15 MB | **10.03 MB** | **none, byte-identical** |
| Lossy WebP q90 + `-sharp_yuv` | 1.26 MB | **7.15 MB** | measurable, see below |

**What the lossy option actually costs.** Measured against the originals, q90 `-sharp_yuv` on
painting-filled: mean ΔE 2.85, max ΔE 52, **59% of pixels past ΔE 2** (the just-noticeable
threshold) and **0.9% past ΔE 10** — which is the palette tolerance locked in Tunables. Plain
q90 without `-sharp_yuv` is worse (mean ΔE 3.00); chroma subsampling hurts here because the sky
is fine blue-yellow interleaving, the worst case for it.

**The render moves too, and unlike the slimming pass it moves outside the noise floor.** Wiring
the lossy pixels in and re-capturing gave RMSE ≈ 0.0037 on every view, against a same-assets
noise floor of 0.0002–0.0013 — a consistent, repeatable change, not capture jitter. (Method: the
lossy pixels were written to temporary `_lossytest-*.png` files with the source paths pointed at
them for one capture; committed assets were never overwritten, and both were reverted after.)

**But at 3× zoom on the rendered sky I cannot reliably tell them apart** — the ribbon strokes
average the source grain, so the render is less sensitive than the raw asset. The loss on the
asset is confined to the finest canvas-weave speckle; Van Gogh's stroke shapes survive intact.

Crops for Mark's eye: `output/playwright/lossy-q90-2026-07-21/crops/` — `asset-*-4x.png` (whorl,
star, moon, cypress; left = original, right = q90) and `render-*-3x.png`. Captures:
`lossy-q90-2026-07-21/` vs `slim-after-2026-07-21/`, noise floor `slim-control-2026-07-21/`.

**Claude's recommendation: take lossless WebP, hold the lossy option.** It is 2.18 MB for
literally nothing — same integration work as lossy (bake-script output + runtime paths), no
grain risk, no argument. The remaining 2.9 MB from lossy is only worth spending if first-load
weight turns out to be a real problem on mid-tier mobile (checklist item 3), and by then there
will be a measurement to justify it rather than a guess. Grain is the axis this project has
already been burned on once (the cypress texture-ghost, six rounds).

**OUTCOME (Mark, 2026-07-21): lossless taken.** `painting-filled.webp` 2.35 MB,
`sky-extend-{left,right}.webp` ~0.90 MB each; flow fields and mask stay PNG. Shipped payload
**12.21 → 10.04 MB**. `cwebp`/`dwebp` approved as a BAKE-ONLY prerequisite (never needed for dev,
build, tests or deploy); `scripts/slim-reference.ts` owns the conversion and verifies it,
`extend-reference.ts` says to run it after a re-bake, README documents `brew install webp`.

⚠️ **Correction to the render evidence above.** The claim that lossy "moves outside the noise
floor" (RMSE ≈ 0.0037 vs 0.0002–0.0013) does not hold up. The lossless swap — provably
byte-identical pixels — measured RMSE 0.0096 on `desktop-centre`, *higher* than the lossy test.
A format change alters decode timing, which shifts the churn's animation phase at screenshot
time, and RMSE cannot tell phase apart from colour. **Capture RMSE is not a valid instrument for
any change that alters load timing.** The right check is to compare DECODED PIXELS in the browser:
Chrome decodes the WebP to 0 differing pixels out of 2,027,200 against the PNG. The asset-level
ΔE figures above are unaffected and remain the real reason to be wary of lossy.

## Superseded (2026-07-17, closed) — S4 ✅ GATE PASSED (Mark, live); next slice = ship hygiene

**S4 (side-void canvas extension) is DONE — Mark passed the drag-boundary gate live
("LOVE YOUR WORK", 2026-07-17).** That completes the whole approved offline inpaint + extend
pipeline (S1→S4): both problem regions — the cypress hole and the side voids — now carry the
painting's own pixels, and the "painting on a card" read is gone from every view. The three
residuals named in 0003 (busy moon corner, pale-band tiling at 2× offline, softer strip stroke
energy) passed with the gate — revisit only if Mark flags them. On `sky-brushdab`, all pushed.

**NEXT SESSION — ship hygiene**, then the pre-release gate:
1. Slim the reference PNGs (~15 MB total: painting-filled 6 MB, signed-flow-filled 3 MB,
   sky-extend strips ~5.6 MB). Candidates: re-encode colour assets (JPEG/WebP where alpha and
   byte-exactness aren't load-bearing at runtime), downsample flow strips (the σ=2 low-pass
   means full res is redundant), crop strip below-band filler rows. Verify no visual change by
   capture A/B — same discipline as the 2026-06-15 flow-field slimming.
2. Then the pre-release items — since 2026-07-21 these live in the **PRE-RELEASE GATE checklist**
   near the top of this file, which supersedes the copy that used to be restated here.

**How it landed (one session, 2026-07-17):**
- Measured the orbit's real exposure first (ray-cast the camera contract): ≤ 0.14 canvas widths
  → strips 0.30/side, full paint through 0.15, runtime fade owns the melt.
- Bake (`extend-reference.ts` S4): whole-sky donors, all S2 gates (no anchors invented); strips
  OWN the scan's ~20 px weave border (regrown — the gate-passed painting-filled.png untouched);
  colour fill guided by the relaxed edge flow field (context-mean flow hatch-degenerates in
  open-ended fill); flow strips destination-sign-aligned (the 07-16 rule) + σ=2 low-passed.
  4 offline passes to the flat-image pass (p4 ambient-blend probe REVERTED — monotone curtain).
- Mount: wash spans paintU ±0.3 with feathered texture hand-offs; ribbons integrate the CPU
  composite (`uPad`), count scaled to hold front density; `check:reduced` + 46 tests + lint +
  build green.
- The dotted-arc hunt: deleting the old in-canvas side fade surfaced three artefacts it had
  been silently hiding (sub-horizon edge trails, ribbon bells outshining the wash melt, the
  sky-mask's feathered skyline edge at the corner dips). Fixed via `trailMaxV`, the sub-band
  ribbon skirt, and the mask side-gate — found by layer bisection after five theories; full
  arc in `tasks/lessons.md` (2026-07-17).

(Gate evidence: `output/playwright/side-extend-2026-07-17-final2/` beside the pre-S4 baseline
`flow-realign-2026-07-16/`.)

**Dev/capture recipe:** `npm run dev` → `http://localhost:5173/?mode=diorama&clean=1`
(`&debug=flow` = sky only · `&debug=nopost` = no bloom). Rebake assets: `npm run extend-reference`
(deterministic; `--s2-only` skips the ~80 s S4 stage). Capture: `npm run capture:diorama --
output/playwright/<name>` (`DIORAMA_CAPTURE_EXTRA='&hide=wash'` etc. for layer-bisection probes).

### Superseded 2026-07-16 record — cypress hole ✅ GATE PASSED

**The cypress cut-out ghost is DONE — Mark passed it live ("gate pass", 2026-07-16).** This
closed the ghost problem that ate six runtime rounds + the whole 07-14 tree-shadow thread. The
offline inpaint pipeline (S1–S3): `PaintingFlowSky3D` samples the offline-filled
`painting-filled.png` / `signed-flow-filled.png`; all runtime donor/fill heuristics deleted.

The trail, newest last:
- S1 `0181e8c` — fill-region mask (5.7%, exactly the tree; moon + 5 star bodies guarded).
- S2 `e0b9c49` — exemplar inpainting → baked filled assets; **flat-image gate passed**
  ("can't tell the difference").
- `5085dbe` — Mark circled a mushy zone → per-placement tone adaptation dissolved the patch
  tiling.
- S3 `33ef84a` — runtime swap; deleted ~350 lines of heuristics; capture + `check:reduced` green.
- `9596734` — Mark live-caught "a little out of flow" → **re-aligned donated flow to the local
  SWIRLS circulation** (14% of copied texels were sign-flipped against the churn; Phase-0
  mechanism). **This is the change that passed the gate.**

Evidence: `output/playwright/flow-realign-2026-07-16/`, `inpaint-swap-2026-07-16/` (pre-flow-fix
A/B). Method + residuals: `docs/decisions/0003-inpaint-extend.md`.

### Original approval note (2026-07-14)

**Mark approved the offline inpaint + extend pipeline ("I think your plan will work").**
Rationale: six runtime rounds on the cut-out ghost all landed "close, still findable" — real
painting patches are the ceiling-raiser.

### Earlier that day — Mark's live gate feedback actioned; gate OPEN

Mark live-drove the diorama (first review since the push) and called it a step up. His three
feedback items were fixed as capture-verified slices on `sky-brushdab` (all tests/lint/build +
`check:reduced` green throughout):

1. **Sky ghost column knitted** (`90f9bcb`, 4 passes — at cap, landed). The dark brown-smudged
   column beside the 3D cypress (the old 2D cut-out) is gone from every view: inpainted wash
   fill (donor-init + Jacobi colour grid), donors demand solid mask + non-tree chroma, and
   mask-missed wisps are chroma-gated (two measured colour families). Evidence:
   `output/playwright/sky-knit-2026-07-14-p4/` (p1→p4 is the retune trail; p3→p4 = probe first).
2. **Ground sparkle calmed** (1 pass). Flecks now follow moonShade (rare in shadow), gentler
   pull, kick tail trimmed below bloom. Evidence: `output/playwright/spark-calm-2026-07-14-p1/`.
   Whether the in-motion bloom shimmer is gone needs Mark's LIVE drive — stills can't show it.
3. **Cypress spiky edge rounded** (1 pass). The saw-teeth were facets (SEG 34→72) + crest
   sharpening + thorn-slim edge marks; tongues kept, crests rounder. Mark said the spiky edge
   bothered him most; further elegance is his taste call. Evidence:
   `output/playwright/cypress-edge-2026-07-14-p1/`.

Still open for Mark (unchanged from 07-13): lighting/bloom balance (nopost vs final), mobile
portrait dead bands, perf on real hardware. Dev server recipe below still applies.

### Tree-shadow follow-up (2026-07-14, same day, Mark live) — three more rounds

Mark kept catching the cut-out ghost as it changed form: dark column → smooth blur ghost →
fine-parallel "character ghost". Each round fixed the layer beneath: grain (4× fill texture,
stroke grain mirrored from clean sky) + ~3× hole ribbon density (`sky-knit2 p1`), then BOLD hole
ribbons (wider/longer/curvature wobble/value kick — matching the neighbours' stroke statistics,
`sky-knit2 p2`). State: seam hard to point at, at home AND drag boundaries. Mark's eye judges.
If it STILL ghosts for him, the remaining lever is structural — widen the 3D cypress to own its
painted footprint at home view — a composition change, Mark's call, not a quiet retune.

### APPROVED by Mark (2026-07-14 late) — offline inpainting pipeline, absorbing the hole AND the voids

Six runtime rounds on the cut-out ghost (value → chroma → grain → density → bold → containment)
each improved it, but the ceiling of runtime heuristics is "close, still findable". The proper
fix is Phase-0-style: an offline script (`scripts/extend-reference.ts`, dependency-free like
`derive-reference.ts`) that bakes a NEW derived asset set:
- `painting-filled.jpg` — the cypress hole filled by patch-based inpainting (real painting sky
  patches, flow-aligned), reviewable as a flat image against the painting BEFORE entering 3D;
- optionally extended left/right margins in the same derived style (the side-void answer), plus
  a matching extended flow field.
Runtime then simply samples the filled painting inside the hole — the donor/fill-grid/bold
heuristics all get deleted. Tighter review loop (flat crops, not 3D drives), higher quality
ceiling, cleaner architecture. Supersedes the side-void slice below if Mark approves (same
mechanism solves both).

### Superseded by the approved pipeline (S4 absorbs it): side-void sky continuation

The empty flat-blue L/R margins are the biggest "painting on a card in a void" tell, and the
locked bar sanctions the fix ("the invented back … continues that same derived style"). Contract:

1. **Continue the churn past the canvas edges.** Ribbons seeded in the side zones, integrating a
   flow field continued outward from the painting's own edge columns (relax/extrapolate, same
   spirit as the hole inpaint), colours donated from the adjacent edge palette.
2. **Invent NO anchors.** No new stars, no moon, no hero swirls — texture and motion only; every
   composition landmark stays the painting's. (Hard negative, same class as the rejected native
   dome.)
3. **Fade with azimuth.** Density/brightness melt into the night gradient as the continuation
   leaves the canvas; the faithful front must not gain invented content — edge fade currently at
   `dioramaSourceEdgeFade` is the seam to blend across.
4. **Verify at home + both drag boundaries + look-down**, against the painting for the front.
   `SkyEdgeBackfill` (the whisper wash) is superseded by this and likely deleted.
5. Below-island void is NOT this slice (the island underside owns that read; revisit separately
   if Mark flags it).

---

## Superseded (2026-07-13) — for Mark's review next session; gate OPEN

### Where the piece is

An orbitable 3D floating-island diorama of Starry Night, authored entirely in Van Gogh
brushstrokes: a rooted, fully-clad island (top + underside), a licking-flame cypress front-left,
the village huddle + pale-spired church, dark brush bushes dressing the ground, all under the
camera-locked source-ribbon churning sky (`PaintingFlowSky3D`). It reads as the painting, survives
a full front-arc orbit + look-down (no funnel, no torn paper, no unpainted surfaces), and freezes
to a dignified still under reduced-motion. **This is a checkpoint, NOT a passed gate** — the
brushstroke look and composition are on track per Mark's 2026-07-09 read; his eye still decides.

Route: `npm run dev` → `http://127.0.0.1:5173/?mode=diorama&clean=1`
(`&debug=nopost` = no bloom · `&debug=flow` = sky only · drop `&clean=1` for the leva panel).

### What this session (2026-07-13) achieved — 3 items closed

- **Island underside clad** (`dc12ea1`, 2 passes) — the last smooth grey surface is now painted
  rock melting into night. Evidence: `output/playwright/underside-2026-07-13-p2/`.
- **Reduced-motion still-state VERIFIED** (locked criterion) — byte-identical frames under
  emulated reduce, churning control, and the still LOOKED at. Now a permanent machine check:
  `npm run check:reduced`. Evidence: `output/playwright/reduced-motion-2026-07-13/`.
- **Foreground bushes** (`1a54dfd`, 4 passes) — eight dark brush-clad shrubs dress the village
  edges, the apron and the cypress foot; colour grounded against the reference band (cypress-family
  near-black + olive/cool-green tongue scatter). **Freshest full capture set for the gate:**
  `output/playwright/shrubs-2026-07-13-p4/`.

36 tests, lint, build green throughout. Details in `tasks/lessons.md` (2026-07-13 section).

### Git state — everything is now pushed to origin (2026-07-13)

All three branches are backed up on GitHub and track origin (push ≠ merge — the gate stays open):
- `sky-brushdab` → `42a558b` — the active 3D work (this is where to pick up).
- `main` → `247e816` — synced (docs/UI only; the 3D work is not merged here).
- `record/2d-streamline-flow` → `8ccf903` (2026-06-24) — the settled 2D flat flow
  (`LivingPainting` + `StreamlineSky`, Mark's live-tuned v4 baked as defaults) kept as a permanent
  record of the piece before the 3D pivot. Revisit: `git switch record/2d-streamline-flow && npm run dev`.

### For Mark to decide next session (do NOT churn these blind)

1. **Gate review** of the whole authored-forms state — freshest set `shrubs-2026-07-13-p4`
   (desktop-centre / look-down / both drag boundaries / mobile / nopost).
2. **Lighting/bloom balance** — `desktop-nopost` vs final is a live taste call (2026-07-08 note).
3. **Mobile framing** — moon + cypress anchor both held today; whether the portrait dead bands
   above/below the composition need a different trade is a live-drive taste call.
4. **Perf on real hardware** — headless reads 0 fps; needs Mark's machine + a mid-tier phone.

### 2026-07-12 record — four rough edges done

The four Mark-confirmed rough edges (2026-07-09 list) were done as one capture-verified slice
each: village brush cladding (`a2a8b5c`), cypress licking-flame rework, sky churn across the old
cypress cut-out fill, calmer hill brushwork. Evidence: `output/playwright/rough-edges-2026-07-12/`
— final state is the `s4-hills-p1` set (desktop/look-down/drag-boundaries/mobile); each slice's
retune trail is its own `s1…s4` folder. Details + lessons in `tasks/lessons.md` (2026-07-12
section).

Run: `npm run dev` → `http://127.0.0.1:5173/?mode=diorama&clean=1`. Capture (pins port 5179):
`npm run capture:diorama -- output/playwright/<name>`.

---

## Superseded (2026-07-09) — authored brushstroke forms, the 3D pivot

Mark rejected the projected-painting relief (it funnels/torn-papers off the head-on view — a flat
painting holds one viewpoint) and chose **authored 3D forms**. New architecture: the whole diorama
is built from Van Gogh brushstrokes — real closed 3D volumes clad in oriented impasto strokes, over
the unchanged camera-locked source-ribbon sky. Plan:
`docs/superpowers/plans/2026-07-09-authored-brushstroke-forms.md`. Full lessons (the 4 insights that
mattered — solid forms survive orbit, cladding needs camera-facing surfaces, per-stroke value
variance is the read, tapered quads not tiles) in `tasks/lessons.md` (2026-07-09 section).

**State (GATE OPEN — Mark, 2026-07-09):** the composition now reads as Starry Night and survives orbit
+ look-down (no funnel, no torn paper). `brushForms.ts` (tapered value-varied cladding kit) +
`BrushIsland` + `islandShape.ts` + `BrushCypress` + `BrushVillage` replace the deleted projected
relief. Mark's read: the brushstroke LOOK is on track; the missing piece was CONTENT — adding the
village huddle + pale-spired church (the focal vertical answering the cypress) made it read. Mark
said "commit and keep the gate open" — this is a checkpoint, NOT passed. lint/36 tests/build green.
Committed on `sky-brushdab` (`fe26e77` forms → `dfeb79b` sky-hole fix → `f34640c` village), NOT pushed.
Evidence: `output/playwright/authored-forms-2026-07-09/s2-village/` (desktop/look-down/mobile);
`s1-p1…p6` is the cypress+island retune trail.

**Remaining polish — items 1–4 CONFIRMED by Mark's eye (2026-07-09, "so true"); gate stays OPEN:**
1. **[Mark-confirmed]** Houses are crisp low-poly boxes — the least "painted" thing in frame; clad
   them lightly (brush cladding, as cypress/hills) so they match the surrounding impasto.
2. **[Mark-confirmed]** Cypress is a touch dark/blobby; soften and make the flame silhouette more
   elegant (less lumpy, more of a licking flame).
3. **[Mark-confirmed]** Faint smooth patch on the left sky where the old cypress hole was filled
   (no longer a ghost tree, but not swirled) — seed sky ribbons across the fill so it reads as sky.
4. **[Mark-confirmed]** Hills still slightly coarse/mottled; the light flecks are a bit confetti-ish
   — tune stroke value spread / fleck frequency.
5. Foreground dressing (bushes/ground), lighting/bloom balance, reduced-motion still-state check,
   mobile framing polish, perf on real hardware (headless reads 0 fps).
6. The island underside is a smooth grey cone — could clad or darken it further.

Run: `npm run dev` → `http://127.0.0.1:5173/?mode=diorama&clean=1`. Capture (pins port 5179):
`npm run capture:diorama -- output/playwright/<name>` (includes a `desktop-lookdown` stress view).
Architecture notes: forms are real closed solids clad in tapered, per-stroke-value-varied brush
marks (the two Van Gogh-read insights); seat new forms on the island via `islandHeightAt`.

---

## Where we are now (2026-07-05) — superseded by the 2026-07-09 pivot above

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

### 2026-07-08 painting-owned foreground checkpoint — ▶ PICK UP HERE (gate open for Mark)

Claude executed the painting-owned rebuild (plan: `docs/superpowers/plans/2026-07-08-painting-owned-foreground.md`,
cross-review response to Codex's roadmap). The architecture decision: **the painting's pixels own every visible
surface; world geometry only gives them depth**, via home-view projective texturing (`sourceProjection.ts` —
world geometry samples the painting through the same projection as the camera-locked sky/matte, so head-on is
pixel-registered by construction).

What changed (5 commits, on `sky-brushdab`, NOT pushed):

- Slice 1: sky colour recovery — cobalt gradient/wash/ribbon values, gold star halos/cores, radiant yellow moon,
  tighter bloom (0.5/0.58/0.5). Capture pipeline hardened (dedicated port 5179 + app-marker check — it had been
  silently capturing the markma.dev dev server on :5173).
- Slices 2–3 infrastructure: `sourceProjection.ts` (projective mapping, round-trip tested) and
  `paintingRegions.ts` (cypress silhouette + skyline extraction from the reference pixels, chroma-gated and
  connectivity-filtered, synthetic-image tests).
- Slice 2: `SourceCypress` — ONE flame: silhouette extracted from the painting, surface sampling the painting,
  replacing the prop cone. Dead `CypressFlameVolume`/`cypressFlameGeometry` deleted.
- Slice 3: `SourceReliefTerrain` — the painting's whole ground band (village, hills, trees) as relief with
  luminance impasto and a closed dark root keel; **the entire prop world is deleted** (FloatingIsland,
  RollingHills, box village/church, bushes, blades, stones, dioramaLayout). The matte keeps the cypress band
  full-colour plus a darkened below-skyline underpaint so parallax reveals read as shadow, never a second village.

Evidence: `output/playwright/painting-owned-2026-07-08/final/` (plus per-pass sets s1…s3-relief-p4 showing the
retune trail). Verification: lint, `test:sky` 35/35, build, capture 8/8 clean.

Honest open items (named for the gate review, NOT resolved):

1. At the extreme +45° orbit-preset stress view the camera-locked matte cypress strip separates from the world
   flame (reads as a hanging painted ribbon). Candidate fixes: camera-delta fade on the matte band, or a
   world-locked backing patch. Within the drag clamp it holds.
2. The skyline seal band reads slightly stretched/pale in places (esp. the clamped cypress-base zone, drag-left).
3. `desktop-nopost` arguably reads closer to the painting than the bloomed final — bloom intensity is a taste
   call for Mark's live review.
4. The dark navy ribbon-gap blob top-left of the sky (pre-existing, painting's darkest region) is more visible
   now the rest is clean.
5. Perf UNVERIFIED on real hardware (headless is software-rendered); the terrain+cypress add ~30k tris, trivial,
   but confirm 60fps desktop / 30fps mobile live.

Pickup: `npm run dev` → `http://127.0.0.1:5173/?mode=diorama&clean=1` (or any port — capture script now pins
5179). Debug: `&debug=flow`, `&debug=stage`, `&debug=nopost`.

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

**Everything that gated release moved to the PRE-RELEASE GATE checklist near the top of this
file on 2026-07-21** — it is the single source of truth for the last gate. This section keeps
only the historical record of what was closed along the way.

- [x] `prefers-reduced-motion` dignified still state (locked criterion) — `paused` freezes the churn;
      verified static via `page.emulateMedia({reducedMotion})` (identical frames under reduce)
- [x] `npm run lint` clean — scoped R3F immutability disables + script-hygiene fixes
- [x] README refreshed from "scaffold" to the orbitable-diorama reality
- [x] Ship hygiene: reference PNGs re-encoded losslessly, 18.17 → 11.20 MB (2026-07-21);
      `leva` already aliased out of the production build (vite.config.ts)
- Mobile portrait framing → now checklist item 2. Gates remaining → the checklist itself.

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
