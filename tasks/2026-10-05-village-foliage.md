# Village foliage — 2026-10-05

**Current checkpoint: F2 visually approved.** Mark: “Looks better. Commit and push. Well record
where we at”. This closes the foliage taste gate and authorises committing and pushing
`codex/village-authored-study`. Delivery is pending below; no merge or production promotion is
authorised. The approved study remains behind the existing DEV-only flag.

Earlier, Mark approved the R5 improvement and authorised “commit and work on next”. Checkpoint:
`92a8f56` (`feat(village): add source-painted village study`). The unrelated Search Console edits in
`tasks/todo.md` were deliberately left uncommitted. Push was not authorised at that earlier gate;
the latest instruction now authorises the study branch push.

This completed slice is convincing village foliage, bounded to the front band and the failed back
mass. Lead owns visual work; Reviewer is peer critique; Worker owns mechanical captures/checks.
Sky, camera, approved architectural paint and default route are outside this slice. Mark keeps
the final taste gate. Two of the maximum four rendered passes were used.

Method consultation favours source-painted **rows with traced crests**, steep fronts and short,
separately textured darker tops/ends. Smooth domes with paint applied would repeat the failed hill.
First test one low dark front row against R5, leaving the back unchanged. Only if that falsifying
probe passes will a reviewed disposition replace the back band. Source is the original painting;
the exact painting texture is already used by Cypress and can share the same sampler settings.

- [x] Commit R5 and preserve prior evidence.
- [x] Peer method opinion and mechanical source/texture/export reconnaissance.
- [x] Independent reviews of exact F1 front-row plan.
- [x] Lead authors front row, verifies actual runtime geometry in Blender and freezes it.
- [x] Worker captures bounded matching views; Lead and Reviewer judge against painting/R5.
- [x] Reviewed back-row disposition, authoring, Blender and all eleven F2 captures.
- [x] Lead final checks and independent visual review; Reviewer SHOW.
- [x] Final comparison page: Lead opened rendered page, checked slider and all image/data links.
- [x] Mark's taste gate on F2: “Looks better. Commit and push.”
- [ ] Commit and push the approved study branch, then record the verified remote checkpoint.

Working plan and reports: `scratch/village-foliage-2026-10-05/`. Exact F1 plan `F1-plan.md`, source
contour `front-row-source.json` and labelled proof `front-row-source.png`.

## F1 — front-row probe

Lead opened all five captures and compared native near crop to R5 and the painting. Dark curled
foliage reads at centre/near, top and closed ends remain convincing under the two orbit input probes,
and the church door stays visible. Reviewer independently returns **PROCEED_BACK**. Known residual:
foliage paint is softer than the architecture at near, and its two-lobed silhouette is smoother
than the finer source strokes; neither reached the method reject line at native scale.

Lead checked manifest: five reduced-motion captures, sourceStable true, every source hash still
matches, zero runtime errors/warnings. Three original R5 buffers and atlas exact. Worker demonstrated
the closure guard fails when a real end cap is removed and returns green after checkout in a unique
temporary repo; Lead inspected raw diff, assertion failure, restore and green. No timing/FPS claim.
F1 report/capture: `scratch/village-foliage-2026-10-05/worker-F1-report.md`,
`reviewer-F1-render-report.md`, `F1-topology-negative-control.log`; renders under
`output/playwright/village-foliage-2026-10-05/F1/`.

The resulting F2 disposition went through dual review: replace the remaining synthetic dome with
one traced back row and preserve the F1 front mesh exactly. Source contour and plan are in scratch.

## F2 — approved foliage checkpoint

The back row replaces the old dome and all its synthetic chevrons. The traced source contour uses
53 stations at four-pixel spacing. Reviewer caught and corrected an erroneous compositional premise
before construction: the painting's crown band rises above the neighbouring house roofs. An
isotropic world scale (1.20/208) preserves the curling strokes and makes the band visible above those
roofs while the church/spire still dominate. The actual top peaks at about 0.352 world Y. Worker
verified sampled terrain clearance; rendered views determine appearance.

Both plan legs READY (`reviewer-F2-confirmation.md`, `worker-F2-plan.md`). Lead authored the change,
exported actual meshes and inspected them in isolated Blender, then froze source in
`F2-source-hashes.json`. Architecture is EXACTLY the isolated F1 tree-free export (only the old
`trees()` call omitted); skin/atlas unchanged. F1's four foliage arrays are exact prefixes. Raw
proofs: `F1-treefree-baseline.log`, `F2-preservation.json`. No new texture asset or dependency.
Study geometry falls from R5's 23,320 triangles to 14,346; this is geometry accounting, not an FPS claim.

Lead opened all eleven F2 views: centre, near, mobile, far, orbit preset, both azimuth inputs,
look-down, high-angle, stage and no-post. The front row stays low/dark with both doors readable;
the back's original curling paint replaces flat pale chevrons and shows above the roofs. No visible
floating/roof contamination or stretched top/end at native scale. Reviewer independently returns
**SHOW, no necessary corrections** (`reviewer-F2-final-report.md`). Measured by Reviewer in hand-placed
rectangles: centre back row luma 70 / 10% pale versus source 74 / 11%; not a whole-frame colour proof.

### Evidence and limits

- Candidate: eleven captures, sourceStable true, all reduced-motion true, zero runtime errors or
  warnings; Lead checked hashes against current files. Default: centre/mobile/stage AE0 versus R5,
  independently recomputed by Lead. Camera wheel/drag captures remain input probes without actual
  post-input camera-matrix readback.
- Lead reran `npm run lint`, `npm run build`, `npm run test:sky` (98 passed), runtime export, the
  authored reduced-motion guard (still frames equal, moving control differs) and authored camera/
  viewport guard. All passed on frozen F2 source. Raw commands/output/status and before/after source
  hashes: `scratch/village-foliage-2026-10-05/lead-checks-F2/`.
- Export reports foliage 1,088 vertices/544 triangles, 276 welded positions/816 edges, closed incidence.
  Lead independently reran the real missing-end-cap negative control before F2; the unchanged guard
  failed red, literal checkout/clean diff and restored green are in one log. Closure is not proof of
  winding, seating or appearance; those have separate numerical and rendered inspection evidence.
- Build retains the existing >500kB chunk warning. Worker measured 599 headless rAF intervals per
  case, mean about 16.67 ms, desktop p95 17.2 ms and emulated mobile p95 17.3 ms. This is desktop hardware
  and viewport emulation, not a physical mid-tier phone or GPU timing. Raw `F2-perf/perf-summary.json`.
- Residuals for Mark: thin hedge/rope from high angle, softer foliage than 3840-sourced architecture
  at near, row partly occluded by houses, old synthetic context houses beside authored paint.
  These did not cross the method reject line. Two of four rendered passes used; further form/depth
  tuning is a new disposition only if Mark flags it. No sky/camera/island/architecture scope expansion.

**State:** R5 committed as `92a8f56`; F2 approved for commit and branch push. Mark's foliage taste
gate is CLOSED. The default route is unchanged; production promotion is a separate decision.
Existing unrelated Search Console todo edits are preserved. Main comparison path is
`output/playwright/village-foliage-2026-10-05/index.html`; runtime
`?mode=diorama&clean=1&villageStudy=authored` on the local dev server.


### Gate close-out

Worker report COMPLETE: `scratch/village-foliage-2026-10-05/worker-F2-report.md`. Lead inspected
its raw logs and 33-file stability snapshots, then ran the independent final gates above. Reviewer
and Worker are idle. Lead corrected the gallery's reversed slider-side labels and moved the village
close comparisons first, then opened an actual isolated-Chrome render (`lead-checks-F2/gallery.png`).
The slider recheck passed at 73%; all 19 unique referenced image/data targets exist and return HTTP 200
with the correct MIME types. `lead-checks-F2/gallery-links.json` records the responses. These are
presentation-only changes after the scene freeze, not another rendered scene pass.

Review URL: http://127.0.0.1:5181/output/playwright/village-foliage-2026-10-05/index.html
Interactive study: http://127.0.0.1:5181/?mode=diorama&clean=1&villageStudy=authored

No further foliage retune is queued. The approved source still matches all five frozen source/asset
hashes at the commit preflight; saved Lead logs have exit 0 for lint, build, 98 sky tests, export,
reduced-motion, viewport and all three AE comparisons. Only records change after that freeze.

### Next-session pickup

1. Read CLAUDE.md, lessons and the village section at the top of `tasks/todo.md`. Refresh Git state
   on `codex/village-authored-study`; older release/sky entries below the current village section
   are history, not permission to resume rejected sky experiments.
2. Inspect the approved F2/R5 comparison and original painting before choosing another visual slice.
   The most obvious remaining consistency question is the old synthetic context houses beside the
   painted cluster. The narrow high-angle foliage, near softness and known R5 mirrored architecture
   paint are recorded limitations, not an instruction to reopen the accepted pass.
3. Agree the next bounded visual scope or a study-promotion plan with Mark. Lead owns visual work;
   Reviewer supplies peer critique; Worker handles mechanical work. Preserve sky/camera/default
   behaviour until a change is explicitly scoped. A feature-branch push does not promote the study:
   `villageStudy=authored` is DEV-only, so a production preview build will retain the existing view.

The tracked implementation and this record travel with Git. `scratch/` and `output/playwright/`
are ignored local evidence, including captures, Blender files and the comparison page; they are
not backed up by this push. The local URLs require the dev server. On another machine the study
can be run with `npm run dev` and `?mode=diorama&clean=1&villageStudy=authored`; the gallery and
saved capture reports will not be present unless separately copied.
