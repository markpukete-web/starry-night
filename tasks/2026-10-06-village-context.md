# Village context (C1) — 2026-10-06

**Status: approved by Mark, committed and pushed (2026-10-06).** Branch `codex/village-authored-study`,
on top of the approved F2 checkpoint (`2c6809b`) and its docs (`ab763ac`). Nothing committed or pushed
before Mark's gate. The study stays behind the DEV-only `villageStudy=authored` flag; the default route is unchanged.

## Intent and boundary

Mark (2026-10-06), choosing from four options: "Repaint the 3 remaining old houses and 4 bushes the
same way, still behind the dev-only flag, so the whole village is one style. Lead does the visual work,
Gemini captures, Fable reviews, max 4 passes, then your gate. After that a separate PR puts it live."

Before C1, `?villageStudy=authored` still drew BrushVillage houses 3, 4, 6 (with two window blobs) and
BrushShrubs bushes 0, 1, 5, 6 beside the source-painted knot — two media side by side
(`output/playwright/village-foliage-2026-10-05/F2/near.png`). Out of scope and unchanged: sky, camera,
island silhouette and hill value, the approved R5 architecture and F2 rows, the default route, promotion.
The bare-ground "models on a board" reading is a separate slice Mark did not choose.

## Team

Herdr w4:t1, verified with `herdr agent list`: Lead w4:p1 (Claude Opus 5.5), Reviewer w4:p4 (Fable 5.1),
Worker w4:p5 (Gemini 3.8 Flash). Briefs, reports and evidence: `scratch/village-context-2026-10-06/`
(ignored, local). Captures and the comparison page: `output/playwright/village-context-2026-10-06/`.

## What changed

- `Diorama.tsx`: in authored modes the old `BrushVillage` and `BrushShrubs` are no longer mounted;
  `BrushVillage.tsx` and `BrushShrubs.tsx` are reverted byte-for-byte to `main`, deleting the
  `omitStudyCluster` seeded-sequence plumbing that only existed to keep the old context pieces.
- `villageStudyGeometry.ts`: three `CONTEXT` houses built with the existing `building()` after the
  church; `foliageRow()` driven by a four-entry `ROWS` table (FRONT keeps F1's literal values behind
  one `legacyFrontUV` flag) adding RIGHT and LEFT rows traced from the painting.
- `villageStudyPatches.ts` + regenerated atlas: five patches appended (cells 12–16), so the eleven
  existing UV entries are value-identical: `blueWallD`, `navyRoofRight`, `brownRoof`, `blueWallLeft`,
  `blueRoofLeft`. House 4's walls reuse the accepted, tiled `paleLeft`.
- `build-village-study-atlas.mjs` now requires an evidence directory argument, so a rebuild can never
  overwrite an earlier gate's tiles or patch map.

## Plan, review and revision

Lead's plan (`C1-plan.md`) went to both legs. Both returned **REVISE**, and both were right:

- Gemini (`worker-C1-plan.md`): the RIGHT row's first five stations stood inside house 4.
- Fable (`reviewer-C1-plan.md`), five corrections: LEFT row inside the cypress lobe solid (the plan's
  clearance test was a point, the cypress foot is a volume); house 6 through the approved sienna
  neighbour (21 %); houses 3 and 4 through each other (10 %) — both pre-existing overlaps that the old
  uniform dark paint had hidden; RIGHT row inside house 4; `paleRight` a sub-rectangle of `blueWallB`
  stretched 4×. Plus: `paleRoofRight` and the `quietRoof` twin exceeded the worst accepted stretch.

Revision 1 (dispositions table in `C1-plan.md`): houses moved to h3 (0.77, 0.585), h4 (1.10, 0.415),
h6 (-0.86, 0.35); RIGHT row x 1.32 → 1.669; LEFT row to where bush 1 fronted the cypress foot
(z0 0.95); three replacement roof cuts with no window paint inside or in the gutter. Declined: a
per-row UV closure in place of the one flag (more code for one odd row). Confirmations: Fable **BUILD**
(`reviewer-C1-r1.md`, recomputed independently), Gemini **READY** (`worker-C1-r1.md`).

Clearance is scripted (`clearance/run.mjs`, the cypress lobe solid built with BrushCypress's own
options): the final layout passes with ≥ 0.02 world units between every context house, row and
neighbour; the original plan fails it with the same clashes the reviews found.

## Evidence

Lead, on the applied tree: `tsc -b`, `npm run lint`, runtime export — all exit 0
(`lead-checks/`). Preservation: every F2 solid/paint/skin/foliage array is an exact prefix of C1's and
the eleven old atlas UVs are identical; the same check went red on a one-value mutation of the skin UVs
and of an atlas corner, then green again (`lead-checks/preservation-proof.log`). The applied export is
byte-identical to the sandbox export that produced the reviewed `r1-probe` render. Blender render of the
exported geometry: `output/playwright/village-context-2026-10-06/blender-C1.png`. Source hashes:
`C1_FROZEN.md`. Study geometry now solid 9,966 / paint 806 / skin 9,936 / foliage 808 triangles.

Worker (`worker-C1-checks.md`, COMPLETE), on the frozen tree with hashes checked before and after:
eleven authored views (`output/playwright/village-context-2026-10-06/C1/`, stable source, 0 errors,
0 warnings) — pixel-identical (AE 0) to the reviewed `r1-probe` set; default centre/mobile/stage AE 0
against `default-F2`; authored and default reduced-motion and viewport guards pass; lint, 98/98 sky
tests and build pass; no `VillageStudy`/`villageStudy`/`village-study-atlas` in production JS.
Headless desktop timing, 599 rAF intervals per case: mean 16.665 ms, p95 17.4 ms; 28 draw calls and
20 geometries against F2's 33 and 25, because the old village and bushes are no longer mounted in
the study. Desktop hardware and viewport emulation only — no phone or GPU claim.

## Lead gate — show to Mark

Lead reran lint, `test:sky` (98 pass, 0 fail) and build (all exit 0), the production-JS grep (0) and the
three default AE comparisons (all 0) itself (`lead-checks/gate-*.log`). Lead opened all eleven C1 views
plus the Blender render, against F2 and the painting. The whole village now reads as one painted medium;
no old dark caps or procedural domes remain, and nothing interpenetrates in any view. Fable's
confirmation covered the same eleven views (identical pixels).

Composition points for Mark's taste gate — not defects at the bar:
- Bare apron between the LEFT row and the sienna house, where old bush 0 stood (Fable).
- House 3's pale-dominant wall paint makes three pale forms right of the striped house — the church,
  houses 3 and 4 — where F2 had one dark procedural house (Fable).
- The LEFT row is a single arch of curls; it reads as foliage at home scale, boulder-like at 4×.
- Unchanged residuals: the village still stands on bare ground ("models on a board"), the striped
  roof is loud, and the church roof paint is mirrored. These were outside C1.

Atlas re-encode, measured on the applied atlas against `HEAD` (`lead-checks/atlas-cell-ae.log`): the
eleven existing cells keep their UVs exactly; WebP's lossy re-encode moves 0.15–3.9 % of each cell's
pixels by more than 1 % (`stripedRoof` worst), mean absolute error ≤ 0.15 % of full scale. Not visible
in any rendered view. (Gemini's plan-stage table measured a different, superseded patch set.)

Promotion-time item (unchanged from R5): Vite still copies `village-study-atlas.webp` into
`dist/reference/` although no production code references it.

Review page: `http://127.0.0.1:5181/output/playwright/village-context-2026-10-06/index.html` (needs the
local dev server). Interactive: `http://127.0.0.1:5181/?mode=diorama&clean=1&villageStudy=authored`.
Rendering so far: two sandbox renders (pre-review draft `draft-probe`, revision 1 `r1-probe`) and one formal capture pass, pixel-identical to `r1-probe`; three of the four allowed passes remain. Nothing is committed; Mark's gate decides that.

## Mark's gate

Mark, after the comparison page: "commit and push the branch then tackle the next". C1 is approved as a
checkpoint. The next piece is the promotion PR his chosen option named ("After that comes a separate PR
to put it live"); merging it deploys, so it stops at Mark before merge.

## Promotion

Built on the same branch as two commits: `refactor(village): drop the study naming` (pure rename,
proven AE0) and `feat(village): make the painted village the default` (flag and old village deleted;
the approved darker island values become the only values). The default route — dev server and the
production build served by `vite preview` — is AE0 against the approved C1 views in all eleven.
Production JS +4.4 kB raw / +1.9 kB gzip; the atlas is one 119 kB webp request. Plan and reviews:
`scratch/village-promotion-2026-10-06/`. Merge (= deploy) is Mark's.
