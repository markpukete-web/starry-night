# Village study — 2026-10-05

Status: R5 **approved by Mark as a local checkpoint**; commit and next foliage pass authorised.
The rejected foreground mound has been removed. Foliage remains unfinished; release is not authorised.
Local branch `codex/village-authored-study`, based on `730c348ff6b6489aedd819d12099be2925ea7cb4`.
No commit, push, merge or deployment. Mark's visual gate remains open.

## Intent and boundary

Mark finds the village cartoon-like despite acceptable sky motion. The bounded study tests whether
authored architecture and source-derived paint carry more of the original's character. It replaces
the church, four neighbours and two tree masses, with a separately comparable darker hill value.
It does not redesign the whole village, move the camera, change the island silhouette or alter
the accepted sky medium/motion. The earlier A+B/C motion/arrival roadmap remains parked.

Lead owned all visual/source work. In the verified Starry Night Herdr team, Worker w4:p5 performed
mechanical captures/checks; Reviewer w4:p4 supplied peer review; Lead w4:p1 owns the final gate.
The canonical workflow and project ritual were read, including “Medium beats magnitude”, the boil
warning and the September 24 entries. Reviewer approval is evidence, not Mark's taste decision.

## Concrete implementation

- DEV-only query comparison: no flag = baseline; `villageStudy=value` = darker hill only;
  `villageStudy=authored` = new knot plus darker hill; `villageStudy=authored-bright` = new knot
  with the existing bright hill. The study is lazily imported only in DEV.
- Original houses 0,1,2,5 and bushes 2,3,4,7 are omitted only in authored variants. Their seeded
  generation still consumes the same random sequence, preserving the surrounding context's paint.
- Four individually composed neighbours, oblique compact nave, low belfry and long needle spire.
  Each opening belongs to a wall face. Building floors sit below the lowest footprint corner.
- Eleven architectural paint patches sampled from `reference/starry-night-source.jpg` using
  source pixel quads recorded in `villageStudyPatches.ts`. The generated atlas JSON records source
  SHA-256 and UVs; the labelled patch map shows their provenance. Texture colour space is sRGB,
  front vertex tint is white, side shading is documented locally, anisotropy is capped at8.
- Bilinear roof underpaint and texture share subdivisions. Narrow plaster and church-roof
  patches repeat with alternating mirrors to preserve brush scale. The final roof uses three
  repeats at the eave and accepts widening of paint towards the ridge. Geometry owns contours.
- Two continuous terrain-seated tree envelopes carry surface-mapped crescent strips. The final
  pass uses 180 per mass, width0.035–0.05, arcs0.3–0.6 and deterministic lift0.006–0.010. One quarter
  uses `PALETTE.house` ×1.9 in linear colour; pale strokes use `villageCool` ×2.2 in sRGB. These
  values are an unaccepted study, not new shipped defaults.

## Iterations and decisions

| Pass | Result | Disposition |
|---|---|---|
| Value probe | Darker hill separates the pale church more clearly | Retain both values for Mark; prefer darker in this study |
| Authored R1 | Better roof axes; repeated strips read as clapboard and ribbed foliage | Reject procedural architecture cladding; inspect source paint |
| R2 | Source paint strengthens architecture; tree strips tear and roof paint stretches | Fix actual surface agreement, seating and sampling scale |
| R3 | Tearing/seating repaired; trees sparse, church roof fluted | One final reviewed width/coverage and source-patch correction |
| R4 | Architecture worth showing; trees still resemble cut-paper marks | Retune cap reached; show with reservations and wait for Mark |

Peer dispositions are retained under `scratch/village-study-2026-10-05/`: plan review,
material method review, R2/R3 reports, R4 disposition and final confirmation. R3 source/atlas was
archived before R4; R3 and R4 Blender models have packed textures. Blender renders are diagnostic
views of exported runtime geometry, not camera-matched browser screenshots or separate authored layouts.

## Validation and evidence

Lead independently ran `npm run lint`, `npm run test:sky` (98 tests), `npm run build`, and
`node scripts/export-village-study.mjs` on R4: all exit0. Build retains the existing >500kB chunk
warning. Geometry checks cover finite buffers, indices, complete atlas UVs, height bounds and
determinism; final counts are solid17044, paint9170, skin6624 triangles. The finite-buffer check
was proven with an injected NaN in an isolated source copy: green → red → literal Git restoration
and matching SHA-256 → green. This does not prove aesthetic quality or surface attachment.

Raw Lead logs: `scratch/village-study-2026-10-05/lead-checks-r4/`; mutation proof:
`scratch/village-study-2026-10-05/lead-checks/geometry-mutation.log` (R3 source, unchanged guard).
Lead independently ran the repository's default reduced-motion and viewport scripts, then the
candidate copies with `villageStudy=authored`: all four exit0. Reduced pairs were byte-identical;
both animated controls changed. Both rotation directions reached fresh-load framing; visitor
chrome passed the viewport/rotation checks. Lead independently compared final default R4
centre/mobile/stage against the baseline: **AE0 / AE0 / AE0**, no threshold adjustment.

The frozen R4 capture matrix has eleven views, including an elevated input probe; bright/default
sets have three each. Manifests report stable source, reduced motion, and no runtime errors or
warnings. Lead opened all eleven authored stills, all three bright stills, the original full village,
the patch map, the native comparison and Blender diagnostic. Camera drags remain input probes;
exact post-input camera matrices were not read.

Worker's R4 performance run used 599 rAF intervals/scenario on desktop hardware: desktop final
mean16.6661ms/p9517.6ms, no-post16.6668/17.4, mobile viewport emulation16.6651/17.5.
Desktop final renderer counts:32 calls,213740 triangles,24 geometries,10 textures (baseline:
29 calls,192302 triangles,21 geometries,8 textures). These are supplied renderer/rAF evidence,
not GPU timings or a physical-phone result; no real-device performance claim is made.
Raw Worker evidence: `scratch/village-study-2026-10-05/checks-r4/` and `worker-r4-report.md`.

Final source identity: `lead-checks-r4/gate-source-hashes.json` records HEAD and SHA-256 of all
eleven changed/new scene and pipeline inputs. No source edits followed the R4 freeze before its gate;
the separately authorised R5 correction below follows Mark's rejection.

The production JS bundle has no `VillageStudy`, `village-study-atlas` or `quietRoof` match. The
public atlas still copies to `dist/reference`, so this DEV gate does not by itself exclude the asset
from a future release. No release is authorised.

## Local review

- Review page: `http://127.0.0.1:5181/output/playwright/village-study-2026-10-05/index.html`
- Live candidate: `http://127.0.0.1:5181/?villageStudy=authored`
- Existing hill comparison: `http://127.0.0.1:5181/?villageStudy=authored-bright`
- Baseline: `http://127.0.0.1:5181/`
- Full stills: `output/playwright/village-study-2026-10-05/authored-r4/`
- Final Blender inspection: `scratch/village-study-2026-10-05/village-material-r4.blend`

These URLs need the local Vite server running. The comparison keeps matching camera/viewport and
reduced-motion state; the original painting is labelled as an art reference, not camera-aligned.

## Lead gate — show with reservations

Lead agrees with the final peer verdict `SHOW_WITH_RESERVATIONS`. No technical blocker was found
in the scoped checks. The original roof relationships, compact pale nave and long spire now read
more clearly than the baseline's row of caps. The darker hill gives them better separation.

The tree marks remain flat and hard-edged, closer to cut-paper camouflage than the original's
streaked impasto. The back mass also reads as a low painted rug from above. Mirrored church paint
creates a visible feather/V motif on the near roof and a symmetric wall motif in the side view.
The bright striped neighbour competes with the church at phone scale. Surrounding old roofs and
the old coast edge retain their previous visual language. These reservations are shown, not hidden.

R2's surface tearing, footprint/rim seating, lint and resource ownership findings are closed.
The five R3 technical reject conditions are closed in the final captures; the tree medium and
paint repetition remain visual reservations. Peer final report:
`scratch/village-study-2026-10-05/reviewer-final-report.md`. Lead independently inspected the
source/diff, final captures, guards and parity rather than treating the peer verdict as acceptance.

The review page's HTML, image paths and comparison crops were inspected; its local route returns
HTTP200. Final native browser-page inspection was interrupted by the computer-use connection
becoming unavailable. A separate isolated Chrome page screenshot timed out after45s; no process
remained for that exact temporary profile. The gallery's interactive slider was not verified in a
live browser, so no claim is made for that UI check. The required scene/browser guards completed
successfully before this presentation-only issue. Open the fresh local URL; an existing candidate
tab needs one reload after rebuilding the atlas.

Mark reports another Codex project session may also be using computer use. Shared connection
contention is a plausible explanation for the unavailable browser channel, but was not confirmed.
Lead stopped using the channel after that observation. Mark then authorised continued use of
normal Chrome while directing the other session to incognito. A fresh inventory and runtime-reset
retry still reported no available browser and a native connection startup failure. The optional
live gallery check remains unavailable until the computer-use connection is restored.

Lead recommends retaining the architectural/darker-hill direction for Mark's judgement, with
tree paint and mirrored motifs unresolved before any promotion. Mark explicitly owns the final
gate; CLAUDE.md's four-pass retune cap is reached. This is a bounded direction study, not an
accepted foreground or release. The R4 gate stopped here; subsequent work is bounded by Mark's
specific rejection and continuation below. Expansion and A+B/C work remain parked.

## Mark's gate feedback — foreground tree mound

Mark circled the front blue-grey mass and said: “the little hill in front of the church? This part
doesn't make any sense to me”. Lead agrees: the supposed tree clump reads as a hill covered in paper
shapes and hides the church. This component is rejected, independently of the passed technical guards.
Mark then authorised Lead to continue while he walks and discuss doubts with Reviewer.

Proposed focused response: remove the failed front mass, inspect the cleared church/ground space,
and prepare a matching R4/R5 comparison. One corrective pass, no new tree-generation technique or
expanded village. Plan and independent review legs: `scratch/village-study-2026-10-05/R5-disposition.md`.
The rest of the study has not received Mark's acceptance; no release action is authorised.

## R5 Lead gate — correction complete, show with reservations

Both independent disposition legs returned READY. Lead made the exact removal and adjacent comment
change in `villageStudyGeometry.ts`; no other scene or pipeline source changed. R4 source and runtime
mesh were archived before editing in `scratch/village-study-2026-10-05/r4-source/`. R5 freeze and
source identity: `R5_FROZEN.md`, `lead-checks-r5/gate-source-hashes.json`.

Lead independently compared generated buffers: architectural `skin` is exact; the retained `solid`
and `paint` arrays are exact R4 prefixes. Only the last tree's appended geometry is removed. The
runtime export passes finite/bounded/deterministic/index/UV assertions, now solid 14876 vertices /
11846 triangles, paint 5396 / 4850, skin 4508 / 6624. Total study triangles fell by 9518; no new
frame-rate or device-performance claim is made.

Lead independently re-ran lint, build, all **98 sky tests**, the geometry exporter, and the existing
candidate-specific reduced-motion and viewport scripts: all exit0. Reduced frames are identical
and the animated control changes. Both rotations match fresh framing and visitor chrome checks
pass. The build retains the existing >500kB chunk warning. Raw logs/exits are under `lead-checks-r5/`.
The unchanged R4 finite-buffer mutation proof was not repeated for a data deletion; no new tests,
packages or validation framework were added.

Worker captured eleven authored R5 views and three each bright/default. Lead inspected the manifests:
all 17 reduced-motion observations true, frozen hashes match before/after, no runtime errors/warnings.
Lead independently compared default centre/mobile/stage against baseline: **AE0 / AE0 / AE0**,
no threshold adjustment. The Worker's initial local-port sandbox denial was resolved by the same
authorised local-only command with sandbox access; raw denied/successful logs are retained.

Lead opened **every authored R5 view**, all three bright alternatives, the actual runtime Blender
diagnostic, the original full painting, and both final comparisons. The church and pale neighbour now
stand clear down to their bases. There are no visible floating seams or exposed skirts in the checked
views. The bare ground reads quietly at centre/near, but side/high views strengthen the impression of
separate models on a board. This is a composition cost, smaller than the rejected mound.

Peer confirmation `reviewer-r5-report.md` returned **SHOW_WITH_RESERVATIONS**. Lead agrees. The front
hill criticism is closed; the village still lacks convincing foliage. The painting threads low,
dark crowns through the town. R5 leaves that front band absent, while the back band remains a weak
grey mound with hard pale/blue chevrons, most obvious near/from above. Mirrored church paint and the
loud striped roof remain unchanged reservations. None is relabelled as accepted art.

Review page remains on port 5181 at `output/playwright/village-study-2026-10-05/index.html`; R4 page
is retained as `index-r4.html`. `correction-r5.png` compares matching native 800x450 R4/R5 crops;
`comparison-r5.png` compares baseline/R5 full centre images. Worker demonstrated zero pixel
resampling with AE checks of the image regions and verified the actual gallery slider in an isolated
headless Chrome file page (73% split, computed clip `inset(0px 27% 0px 0px)`). Lead inspected that raw
record and the script. Lead then restored the Vite painting URL `/reference/painting.jpg`, labelled
it as a non-aligned art reference, and added the live study link; slider code unchanged. Lead HTTP
checked the final page and all **29** image/link targets on 5181: status200, image content types valid.
Raw HTTP record: `lead-checks-r5/gallery-http.json`. No live CUA gallery inspection is claimed; normal
Chrome was not controlled for R5. Captures and the slider check used isolated headless profiles.

Source remains local/uncommitted on `codex/village-authored-study`, HEAD
`730c348ff6b6489aedd819d12099be2925ea7cb4`. No push, merge, install or deployment. This one response
to Mark's rejected component is complete. Mark's architectural/foliage direction and release gate
remain open; no automatic replacement technique, village expansion or A+B/C work follows.

## Mark's checkpoint decision

After seeing the R4/R5 comparison, Mark said: “Okay, it looks better. let's commit and work on next”.
This accepts R5 as the local checkpoint and authorises the proposed next foliage pass. The source
state and restrictions above describe the earlier gate; this new instruction permits the commit
and continued foliage work. The DEV study remains separate from the default route. No push, merge,
deployment, release or broad village/sky redesign is authorised. Preserve the R5 evidence for the
next comparison, with Lead owning visual source work and Mark retaining the next taste gate.
