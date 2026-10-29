# The church and its square, slice 1: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Revision 0 (2026-10-29, 18:10).** Written from the approved design and Mark's three calls of 17:20. The two plan
reads come next: Codex's correctness read and a builder's buildability read. Nothing is built.

**Goal:** The church takes its paint from the painting's own church in two tones, the spire and the belfry take their
own, the two flanking trees stand close against the nave, and a ring of pale flowers stands in the square lamp's pool.

**Architecture:** Four new entries in `STREET_SOURCES`, each a rectangle of the scan, with their own stroke recipes
and ID classes. `buildHouse` chooses a wall's source from its light when the shape names a shade source, so the church's
tones follow `CHURCH_LIGHT` and no other house changes. The belfry and the spire name their sources where they are
clad. The trees move by two numbers in `TREE_SPECS`, found by a search before the build. The flowers are built inside
`buildStreet`, after the lamps, into the street's `strokes` bucket: the grass's own blade function laid out by hand,
and the heads as `stoneDab`s. No new mesh, no new draw call, no change to the grass's chunks or the trail.

**Tech stack:** three.js, the street's builders (`clad`, `orientedFace`, `lightOf`, `stoneDab`, `pushDrapedRibbon`,
`append`), the grass's `clump`, `bladeVertex` and `bladeWidth`, `node --test`, the check scripts, the craft tools in
`scratch/village-craft-2026-10-25/tools/`. No new dependency.

**Spec:** `docs/superpowers/specs/2026-10-29-church-square-design.md`, Decisions (a) to (h) and "Mark's three
calls", with its Constraints and Anti-goals. Slice 2 (the owl and the moths) gets its own plan after this one ships.

## Where this plan departs from the design's text

Each is open to the two reads and to Mark at the gate.

| | The design says | The plan does | Why |
| --- | --- | --- | --- |
| P1 | (g) the flowers are "their own static mesh", and (n) slice 1 adds one draw call | The flowers go into the street's `strokes` bucket, built inside `buildStreet`. No new mesh, no new draw call | The design's reasons were the grass hash and the hand. The street's buckets take no trail and are not the grass's chunks, so both hold. One fewer mesh to plumb through `Street.tsx` |
| P2 | (g) about 350 triangles of blades | A blade is a ribbon of five rows and three columns, 16 triangles, as every street ribbon. The ring's bound is 1,000 triangles | The stroke body draws a three-column ribbon. Two columns would need a second geometry path |
| P3 | (f) "an ID-mask check in the plan" for the trees' cover | A ray probe in `node --test`, with the sway's reach as a margin, is the check that gates the move. The ID frames at the gate check it again | A test runs on every build. A capture runs once. The sway (`LIFE.sway`, height² × 0.06, at most 0.013 at a crown's top) moves a crown the probe would otherwise miss |
| P4 | (e) "the church record's measure takes the class as a parameter" and masks inside the church's box | The measure masks by the new classes alone, no box | No house uses the church's sources, so the mask is the church's |
| P5 | (b) the tones follow `lightOf` | The tone is decided with `lit` forced true, so `?light=0` shows both tones | The tone is paint, not light. The colour gate runs unlit |

## Session mapping

Lead: Claude Fable `w4:p1`, in the worktree
`/private/tmp/claude-502/-Users-markma-Projects-starry-night/7b901d75-9d6a-49c2-8abd-525273745dfd/scratchpad/church-wt`
on `feat/church-square` (head `967af52`, off `555b6c0`, which is in `main`). Reviewer: Codex `w4:p4`, Fable `w4:p6`
when Codex is low. Builder: the `builder` subagent (Sonnet 5.5, effort high, its own worktree) for Tasks 1, 3 and 4 and
for Task 0's probe scripts. Each builder brief names this plan, the task, the base commit and the branch, and the builder
switches to that branch first. The Lead does Task 0's reading of the scan, Task 2's ledger, Task 5 and Task 6. Evidence
goes to `/Users/markma/Projects/starry-night/scratch/church-animals-2026-10-29/` (below, `C/`), one folder per task.
Builders never push, install or open a PR. One browser check runs at a time, and each needs its vite server
(`DIORAMA_CAPTURE_URL`).

## Global constraints

- Every colour comes from a rectangle of the scan: `STREET_SOURCES` in painting px (1600 × 1267), or `palette.json`.
- Each source's rendered mean is within ΔE76 10 of its own rectangle's mean (`check-street-colour.ts --sources`).
- The church at most 1,600 ribbons. The street at most 602,000 triangles. The walk's worst sampled point at most
  1,444,930 (today 1,429,793 at `t` 0.26). 60 fps at stops 0 and 3 at dpr 1.5, p95 at most 18.6 ms.
- `?light=0` builds the street unlit and both tones still show. `prefers-reduced-motion` is a still state: nothing in
  this slice moves.
- The grass's chunk hash `def5470cc15817ba` (`scripts/street-lane.test.ts`) does not change.
- The retune cap: four look passes. The Lead's levers are named in Task 5 and nothing else is lifted by hand.
- No new dependency. British English. Conventional commits, each ending with
  `Claude-Session: https://claude.ai/code/session_016dU6Fh8H7N6GoFycno2Cvd`.
- Claude does not edit The bar, Gates, Out of scope or the acceptance criteria.

## Review focus

Five inputs the design implies and no decision names. Each has its test in the task that owns the code.

1. `?light=0`: the church's two tones must still show, or the colour gate (which runs unlit) reads one tone and the
   lit build another. Task 1, "the tones do not depend on the light flag".
2. The flat panel (`buildFlatPanel`, the diorama's village) has no lane and no lamps. The flowers must not build there,
   and `lamps[6]` must not be read when the lane is off. Task 4, "no flowers without the lane".
3. The trees sway (`LIFE.sway`): a crown that clears a window at rest can cover its edge in the wind. Task 3's probe
   dilates the crown by the sway's reach.
4. The wander: Vincent may not stand in the ring. `keptOff` keeps him `WANDER.post` (0.015) from every lamp's post,
   less than the ring's 0.03. Task 4 adds the ring to `keptOff`, for the square's lamp alone.
5. The ID views: a church stroke's `src` is 10 to 13 now. The gate's mask for `plaster` (class 2) must not count the
   church, and the build test's range check must accept the new numbers and refuse 14. Task 1's build test.

---

### Task 0: the facts (the Lead reads the scan, a builder writes the two probes)

**Files:**
- Create: `C/t0/sources.md` (the four rectangles, their L and Lab), `C/t0/recipe.md` (the strokes measured),
  `C/tools/sources.mjs`, `C/tools/tree-search.mjs`, `C/t0/tree-search.log`, `C/t0/baseline.md`.

**Interfaces:**
- Produces: four rectangles `[x0, y0, x1, y1]` in painting px for `churchLit`, `churchShade`, `spire`, `belfry`. A
  recipe `{ width: [a, b], length: [c, d], axis: [ax, ay], blend, cover }` for the walls and one for the spire and the
  belfry. Two map positions `(mapX, mapY)` for `orchard-lower` and `olive-right`. Task 1 and Task 3 copy them.

- [ ] **Step 1 (the Lead): the four rectangles.** Open `reference/derived/_work-painting.png` (1600 px) at 4× over the
  painting's church (its spire tip is near painting px (820, 985), its foot near y 1110). Pick, each axis-aligned and
  inside the painted church: `churchLit` on the white front, `churchShade` on the ultramarine side, `spire` on the
  striped shaft, `belfry` on the dark band at the spire's foot. Each wall rectangle at least 12 × 12 px, wider than the
  plaster patch's 10 px, and none crossing an outline, a window or the roof's edge. Write them to `C/t0/sources.md`
  with a 4× crop of each (`C/t0/src-<name>-4x.png`).

- [ ] **Step 2 (builder): `C/tools/sources.mjs`.** For each rectangle, print its L p10 / p50 / p90 and mean Lab in
  `_work-painting.png`, by `rectLabs` and `lab` as `C/review/probe-design-r0.mjs` computes them, and ΔE76 between
  every pair. Run it and append the table to `C/t0/sources.md`.

- [ ] **Step 3 (the Lead): check the rectangles.** `churchLit`'s L p50 is at least 8 above `churchShade`'s. `spire`'s
  mean is at least ΔE 5 from `churchLit`'s. `belfry`'s L p50 is under `churchShade`'s. If any fails, pick again (Step 1)
  and run Step 2 again. At most three picks.

- [ ] **Step 4 (the Lead): the recipe at 1:1.** On `reference/starry-night-source.jpg` (3840 px, the scan) over the
  same church: the wall strokes' full width and length in scan px, ten strokes each on the front and the side, and the
  lean of their long axis from the vertical (degrees, a positive lean toward the right). The reference height is the
  front wall's height from its foot to its eave, in scan px. Write `C/t0/recipe.md`: the ten measurements each, the
  reference height, and the recipe as fractions, `width [p10, p90]`, `length [p10, p90]`, `axis` the unit vector of the
  median lean in face coordinates (+y up), `blend` 0.75 as the walls', `cover` 3.5 to begin (Task 2 moves it). The spire's
  strokes the same way with the shaft's length as the reference height, `axis [0, 1]`, `blend` 0.9 as the thatch's.
  The belfry takes the wall recipe.

- [ ] **Step 5 (builder): `C/tools/tree-search.mjs`.** Build the street once (`buildStreet(painting, flow, masses,
  { grass: true, lit: true })`, the inputs as `C/review/probe-design-r0.mjs` loads them). For each of `orchard-lower`
  and `olive-right`, take its vertex offsets from its foot (`trees.solid` and `trees.strokes`, each vertex assigned to
  its nearest tree) and its flat reach. Then for every whole map pixel `(mapX, mapY)` within 100 px of today's
  (`TREE_SPECS` in `streetLayout.ts`, `mapToWorld`), score the position by these rules, in this order:
  1. The crown clears the nave by at least 0.025: `rectDistance(x, z, nave) − reach ≥ 0.025`, `rectDistance` as the
     probe's. And every house box by at least 0.025 (`STREET_HOUSES`, their `x, z, yaw, w, d`). And the belfry's square.
  2. The crown stays 0.02 clear of the other two trees' crowns and of the cypress (radius 0.12 at `STREET_CYPRESS`), and
     0.1 clear of every station camera (`stationPose(i, portrait)` for `i` 0 to 4, both). And the tree keeps its side
     of the square: `orchard-lower` right of the lane's end (its map x stays above 500), `olive-right` left (below 500).
  3. No cover: from `stationPose(3, p)` and `stationPose(4, p)` for both `p`, a ray to each target point misses the
     crown. The targets: the door panel's four corners and centre (`report.church.door.panel`), each window's four
     corners and centre (`report.church.windows`), and the gable's peak (the nave's front top centre, `churchFront()`
     raised to `nave.eave + nave.pitch`). The crown is the tree's triangles translated to the candidate, tested at rest
     and shifted by (±0.013, 0, 0) and (0, 0, ±0.008), the sway's reach at a crown's top (`LIFE.sway` × 0.45², and
     0.6 of that in z). A `Raycaster` against a `Mesh` of those triangles, `far` the ray's length less 1e-5.
  4. Among the positions that pass 1 to 3, prefer the one whose crown edge is nearest the nave, then the fewest pixels
     moved (Chebyshev). If none has its edge within 0.05 of the nave, say so, and still print the nearest.
  Print, per tree: today's position and its gap, the chosen position, its gap to the nave, its nearest house and the
  gap, its cover hits (none), and the number of candidates that passed each rule. Save to `C/t0/tree-search.log`.

- [ ] **Step 6 (the Lead): read the log.** Write the two positions into this plan's Task 3 and `C/t0/baseline.md`.
  Baseline there too: the church's ribbons 872, the street's triangles 596,919, the build hash from
  `scratch/village-craft-2026-10-25/tools/build-hash.ts`, the sweep's worst point 1,429,793 at `t` 0.26 (the wander's
  gate, `scratch/vincent-wander-2026-10-29/gate-final/`), stop 4's plaster L 31.6 / 43.7 / 57.8 (the church record),
  and today's captures `C/look0/`. The ring's ground: none of 64 samples on the ring lies in the grass's footprint
  (`C/review/probe-design-r0.log`, `ringSamplesInGrass`), so the grass hash is safe.

- [ ] **Step 7: commit the facts.** `git add tasks/2026-10-29-church-square-plan.md` with the positions filled in.
  `git commit -m "docs(church): slice 1's facts, the sources picked and the trees' positions found"`. The scratch
  files stay out of the repo.

### Task 1: the church's sources, classes and tones (builder)

**Files:**
- Modify: `src/scene/streetStrokes.ts` (`STREET_SOURCES`, `SOURCE_STROKES`), `src/scene/streetGeometry.ts`
  (`SOURCE_CLASSES`, `StreetShape`, `buildHouse`, `church`), `src/scene/streetMaterial.ts` (`idInjection`),
  `scripts/check-street-colour.ts` (the `--sources` tables), `scripts/street-build.test.ts` (the class test).
- Test: `scripts/street-church.test.ts`.

**Interfaces:**
- Produces: `STREET_SOURCES.churchLit`, `.churchShade`, `.spire`, `.belfry` (the Task 0 rectangles). `SOURCE_CLASSES`:
  `churchLit: 10, churchShade: 11, spire: 12, belfry: 13`. `StreetShape.shadeSource?: StreetSourceName`. The ID
  colours: 10 → (255, 128, 128), 11 → (128, 255, 255), 12 → (255, 128, 255), 13 → (128, 128, 255). The report's faces
  carry `source` already.

- [ ] **Step 1: the failing tests**, in `scripts/street-church.test.ts`:

```ts
test("the church's walls take their tone from the light: the moonlit wall churchLit, the rest churchShade", () => {
  const nave = churchFaces.filter((f) => f.owner === 'church')
  for (const f of nave) {
    if (f.name.endsWith('roof')) { assert.notEqual(f.source, 'churchLit'); continue }
    const lit = lightOf({ ...f, kind: 'wall' } as StreetFace, true, CHURCH_LIGHT) >= 0.9
    assert.equal(f.source, lit ? 'churchLit' : 'churchShade', `${f.name} at light ${f.light}`)
  }
  assert.equal(nave.find((f) => f.name === 'right')!.source, 'churchLit')
  assert.equal(nave.find((f) => f.name === 'front gable')!.source, 'churchShade')
})
test('the belfry takes belfry and the spire takes spire', () => {
  for (const f of churchFaces.filter((f) => f.owner === 'belfry')) assert.equal(f.source, 'belfry')
  for (const f of churchFaces.filter((f) => f.owner === 'spire')) assert.equal(f.source, 'spire')
})
test('no house uses a church source', () => {
  for (const f of build.report.faces.filter((f) => f.owner.startsWith('house-')))
    assert.ok(!['churchLit', 'churchShade', 'spire', 'belfry'].includes(f.source), `${f.owner} ${f.name}`)
})
test('the tones do not depend on the light flag', () => {
  const unlit = buildStreet(plainPainting(), flow, masses, { lit: false })!
  const srcOf = (b: typeof unlit) => b.report.faces.filter((f) => ['church', 'belfry', 'spire'].includes(f.owner)).map((f) => f.source)
  assert.deepEqual(srcOf(unlit), srcOf(build))
})
test('the church stays under 1,600 ribbons', () => {
  assert.ok(churchFaces.reduce((s, f) => s + f.ribbons, 0) <= 1600)
})
```

  And in `scripts/street-build.test.ts`, the test "every vertex of underpaint and strokes has a source class, and the
  church is plaster" becomes "…and the church is its own". The range check accepts `0..6`, `10..13` and `255`, and
  refuses 14. A church wall stroke's `src` is 10 or 11 (within 0.35 of the nave) or 13 (within 0.35 of the belfry, below
  `belfry.topY − ground`) or 12 (above it). The plaster houses' strokes stay 2. The street's triangles at most 602,000.

- [ ] **Step 2: run them.** `node --test scripts/street-church.test.ts scripts/street-build.test.ts`. Expected: the
  five new tests fail (`churchLit` is not a source) and the amended class test fails on `src` 2.

- [ ] **Step 3: the sources.** In `streetStrokes.ts`, the four rectangles from `C/t0/sources.md` in `STREET_SOURCES`
  with a one-line comment each, and their recipes from `C/t0/recipe.md` in `SOURCE_STROKES` (TypeScript requires
  both). In `streetGeometry.ts`, `SOURCE_CLASSES` gains the four numbers.

- [ ] **Step 4: the tones.** `StreetShape` gains `shadeSource?: StreetSourceName`. In `buildHouse`, after each wall
  face and each gable face is made by `orientedFace` and before it is clad: if `shape.shadeSource` is set and
  `lightOf(face, true, ctx.wallLight) < 0.9`, set `face.source = shape.shadeSource`. The front wall's `cladRound` sees
  the swapped face too. `church()` passes `wallSource: 'churchLit', shadeSource: 'churchShade'`. The belfry's four
  faces take `source: 'belfry'`, the spire's `source: 'spire'`.

- [ ] **Step 5: the ID colours.** `idInjection` gains the four lines for 10 to 13. In `check-street-colour.ts`'s
  `--sources` mode, four entries in `maskIndices`, `SOURCES` (`ref` from `meanLab(rectLabs(workPainting,
  STREET_SOURCES.<name>))`) and the matching `else if` lines, each channel of 128 matched at 120 to 136 as the thatch's
  188 is. The guard's `knownClassesIds` gains the four colours.

- [ ] **Step 6: run the tests.** `node --test scripts/street-church.test.ts scripts/street-build.test.ts
  scripts/street-craft.test.ts scripts/street-lane.test.ts scripts/check-street-colour.test.ts`. Expected: all pass,
  and the grass hash test still reads `def5470cc15817ba`. `npx tsc -b` clean.

- [ ] **Step 7: commit.** `git add src/scene/streetStrokes.ts src/scene/streetGeometry.ts src/scene/streetMaterial.ts
  scripts/check-street-colour.ts scripts/street-build.test.ts scripts/street-church.test.ts` and
  `git commit -m "feat(church): the church's paint from its own sources, two tones by the light, the spire and belfry their own"`.

### Task 2: the ledger (the Lead)

**Files:** `C/t2/ledger.md`.

- [ ] **Step 1:** build on Task 1's commit: the church's ribbons by owner, the street's triangles, the build hash
  (`scratch/village-craft-2026-10-25/tools/build-hash.ts`). The bounds: 1,600 and 602,000.
- [ ] **Step 2:** if either is over, lower `cover` on `churchLit` and `churchShade` in `SOURCE_STROKES` (3.5 toward
  2.5) until both hold, and record each value tried. `KEPT_PAINT` is not touched: the flat panel shares it.
- [ ] **Step 3:** capture stops 3 and 4, both viewports (`C/look0/capture.mjs` with its output folder set to `C/t2/`).
  Read them 1:1 beside `scratch/street-church-2026-10-25/t0/painting-church-2x.png`. Write what looks wrong in
  `C/t2/ledger.md`. This read is look pass 1 of four.
- [ ] **Step 4:** commit any `cover` change: `git commit -m "feat(church): the church's cover held to the ledger's bound"`.

### Task 3: the trees close in (builder)

**Files:**
- Modify: `src/scene/streetLayout.ts` (`TREE_SPECS`, two entries), `scripts/street-layout.test.ts` (the overlap test's
  margin for the two trees against the nave).
- Test: `scripts/street-church.test.ts`.

**Interfaces:**
- Consumes: the two positions from Task 0 Step 6: `orchard-lower` at `(____, ____)`, `olive-right` at `(____, ____)`.

- [ ] **Step 1: the failing tests**, in `scripts/street-church.test.ts`. The build here needs the painting: skip both
  when `reference/derived/_work-painting.png` is absent, as `street-trees.test.ts` does.

```ts
test('the two flanking trees stand close against the nave and clear of it', () => {
  for (const id of ['orchard-lower', 'olive-right']) {
    const gap = rectDistance(tree.x, tree.z, nave) - reachOf(id)   // the probe's two helpers, copied into the test
    assert.ok(gap >= 0.025 && gap <= 0.05, `${id}'s crown is ${gap.toFixed(4)} from the nave`)
  }
})
test('no crown covers the door, a window or the gable peak from stops 3 and 4, in the wind', () => {
  // the targets and the five shifted crowns as Task 0 Step 5 rule 3; assert no intersection for every ray
})
```

- [ ] **Step 2: run them.** Expected: the first fails (the gaps are 0.225 and 0.176).
- [ ] **Step 3: move the trees.** The two `TREE_SPECS` entries take Task 0's positions, with a comment naming
  `C/t0/tree-search.log`. In `street-layout.test.ts`'s "houses and trees do not overlap", the circle-to-nave margin for
  these two trees is 0.025 (the rest stay 0.02).
- [ ] **Step 4: run the tests.** `node --test scripts/street-church.test.ts scripts/street-layout.test.ts
  scripts/street-trees.test.ts scripts/street-wander.test.ts`. Expected: all pass. The wander test passes because
  `keptOff` reads `STREET_TREES` by position.
- [ ] **Step 5: commit.** `git commit -m "feat(church): the two flanking trees stand against the nave, as the painting's do"`.

### Task 4: the ring of flowers (builder)

**Files:**
- Modify: `src/scene/streetGeometry.ts` (`buildStreet`'s options gain `flowers = true`, a `flowers(ctx)` function
  called after the lamps inside the `if (lane)` block, the report gains `lane.flowers`, and `buildFlatPanel`'s report
  initialises it `null`), `src/scene/streetLayout.ts` (`FLOWERS` beside `STREET_LAMPS`), `src/scene/streetWander.ts`
  (`keptOff`, the ring).
- Test: `scripts/street-build.test.ts`, `scripts/street-wander.test.ts`.

**Interfaces:**
- Consumes: `clump(rand, painting, x, z, height): BladeSpec[]`, `bladeVertex(spec, a, across, right, widen)`,
  `bladeWidth(a)` and `GRASS_BLADE` from `grassBlade.ts`. `stoneDab(into, centres, across, width, colour, seed)` and
  `FaceStrokes` from `streetStrokes.ts`. `pushDrapedRibbon`, `append(ctx.strokes, from, 255, 255)` and
  `ctx.report.lane.lamps[6].foot` in `streetGeometry.ts`. `mulberry32` from `brush.ts`. `palette.json`'s `stars`
  region (`regions.stars.colours[].hex` and `.lab`). `sourceUnderpaint(painting, 'windowLit', 1)`. The test's Lab
  conversion is `lab()` from `C/review/probe-design-r0.mjs`, copied in, and ΔE76 the Euclidean distance in Lab.
- Produces: `FLOWERS = { radius: 0.03, clumps: 6, scale: 0.5, heads: [2, 4], headWidth: 0.0035, headGap: 5 }` in
  `streetLayout.ts`. `report.lane.flowers: { centre: [number, number]; blades: number; heads: number; triangles: number;
  roots: [number, number][]; headColours: [number, number, number][] } | null`. `WANDER.ring`: the ring's keep-off
  radius, `FLOWERS.radius + GRASS_BLADE.spread + GRASS_BLADE.height × FLOWERS.scale` (0.06).

- [ ] **Step 1: the failing tests**, in `scripts/street-build.test.ts` (skipped without the painting):

```ts
test('a ring of flowers stands in the square lamp\'s pool, pale heads at the tips, and none without the lane', () => {
  const f = build.report.lane.flowers!
  const [lx, lz] = [build.report.lane.lamps[6].foot.x, build.report.lane.lamps[6].foot.z]
  assert.deepEqual(f.centre, [lx, lz])
  for (const [x, z] of f.roots) {
    const r = Math.hypot(x - lx, z - lz)
    assert.ok(r >= FLOWERS.radius - GRASS_BLADE.spread && r <= FLOWERS.radius + GRASS_BLADE.spread, `a root at ${r}`)
  }
  assert.ok(f.blades >= 30 && f.blades <= 54 && f.heads >= 12 && f.heads <= 24 && f.triangles <= 1000)
  const window = srgbToLab(...sourceUnderpaint(painting, 'windowLit', 1))
  for (const c of f.headColours) assert.ok(deltaE76(srgbToLab(...c), window) > FLOWERS.headGap)
  assert.equal(buildStreet(painting, flow, masses, { lane: false })!.report.lane.flowers, null)
  assert.equal(buildFlatPanel(painting, flow, masses)!.report.lane.flowers, null)
  const without = buildStreet(painting, flow, masses, { flowers: false })!
  assert.equal(without.counts.triangles, build.counts.triangles - f.triangles)
})
```

  And in `scripts/street-wander.test.ts`, no build needed:

```ts
test('Vincent cannot stand in the ring of flowers, and can stand past it', () => {
  const foot = laneAt(STREET_LAMPS[6].t, STREET_LAMPS[6].lateral)
  assert.ok(!standable(foot.x, foot.z))
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * 2 * Math.PI
    assert.ok(!standable(foot.x + 0.05 * Math.cos(a), foot.z + 0.05 * Math.sin(a)), `standable at ${k}`)
  }
  assert.equal(WANDER.ring, 0.06)
  // one point 0.08 from the foot toward the square's centre is on the square's disc and off everything kept off
  const toCentre = Math.atan2(STREET_SQUARE.z - foot.z, STREET_SQUARE.x - foot.x)
  assert.ok(standable(foot.x + 0.08 * Math.cos(toCentre), foot.z + 0.08 * Math.sin(toCentre)))
})
```

- [ ] **Step 2: run them.** Expected: fail, `flowers` is not in the report.
- [ ] **Step 3: build the ring.** `flowers(ctx)`: `rand = mulberry32(0x7f10)`; `right` is stop 4's camera right on
  the ground, from `stationPose(4, false)`'s position and target; the six clump centres at angles `k / 6 × 2π + 0.3`
  on the ring about the lamp's foot; each `clump(rand, ctx.painting, x, z, FLOWERS.scale × GRASS_BLADE.height)` with
  `halfWidth × FLOWERS.scale` as `plantChunks` does. Each blade: five rows at `a = j / 4`, three columns at `across`
  −`bladeWidth(a)`, 0, +`bladeWidth(a)`, through `bladeVertex(spec, a, across, right)`, lifted by the lamp's foot `y`;
  the colour `spec.colour` scaled by `mix(GRASS_BLADE.shade[0], GRASS_BLADE.shade[1], a)`; into a local `FaceStrokes`
  by `pushDrapedRibbon`, with `stroke` `(a, column / 2)` and the blade's `seed` per vertex. Heads: on the first
  `2 + floor(rand() × 3)` blades of each clump, a `stoneDab` of width `FLOWERS.headWidth` whose three centres sit at
  the tip (`a` 1) and 0.0012 back along the blade (`a` 0.93 and 0.86, by `bladeVertex` at `across` 0), `across` the
  blade's own across vector at the tip; the colour one of the `stars` region's `palette.json` colours whose ΔE76 from
  the `windowLit` mean exceeds `FLOWERS.headGap`, chosen by `rand`. `append(ctx.strokes, local, 255, 255)`. Fill the
  report. Call it after the lamps are built, inside `if (lane)`, only when `flowers`.
- [ ] **Step 4: the wander.** `WANDER` gains `ring: 0.06`. In `keptOff`, after the lamps' loop: the square's lamp
  (`STREET_LAMPS[6]`, its foot by `laneAt`) keeps him off within `WANDER.ring`. The other six lamps keep `WANDER.post`.
- [ ] **Step 5: run the tests.** `node --test scripts/street-build.test.ts scripts/street-lane.test.ts
  scripts/street-wander.test.ts scripts/street-grass.test.ts`. Expected: all pass, the grass hash unchanged.
- [ ] **Step 6: commit.** `git commit -m "feat(church): a ring of pale flowers in the square lamp's pool"`.

### Task 5: the look passes (the Lead, at most four, pass 1 is Task 2's read)

**Files:** `C/t5/p<n>/` per pass, `C/tools/church-l.mjs`, `C/t5/looks.md`.

**Levers**, and nothing else: `CHURCH_LIGHT.ambient` within 0.7 to 0.81; the church exempt from `wallShade`'s corner
term (`streetLight.ts:32`, a `face.source` test); the four recipes' `width`, `length`, `axis` within the measured
ranges; `cover` within Task 2's bound; `FLOWERS.scale`, `.clumps`, `.headWidth`; the two tree positions by a re-run of
the search with a different closeness bound.

- [ ] **Step 1: `C/tools/church-l.mjs`.** Takes a full capture and its `ids=2` pair (the colour gate's capture
  command, `scratch/village-craft-2026-10-25/tools/k2-colour.sh`, with `ids=2` and `light=0` dropped). For each of the
  four ID colours, the L p10 / p50 / p90 of the full frame's pixels under that mask. No box.
- [ ] **Step 2, each pass:** capture stops 3 and 4 on both viewports, lit and `ids=2`. Run the measure at stop 4. The
  target: the moonlit wall's L p50 within 4 of `churchLit`'s own p50, the gable's within 4 of `churchShade`'s. Crop the
  church 1:1 beside the painting's. Name what looks wrong, move one lever, say which, capture again.
- [ ] **Step 3:** write `C/t5/looks.md`: a table of passes, the levers moved, the L figures, and the two walls' light
  (the step kept: gable 0.8, moonlit 0.986 at ambient 0.8). Commit each kept lever:
  `git commit -m "feat(church): look pass <n>, <the lever>"`.
- [ ] **Step 4:** if the target is not met after four passes, stop and give Mark the four captures and the figures.

### Task 6: the gate (the Lead)

**Files:** `C/t6/gate.sh` (from `scratch/village-craft-2026-10-25/tools/k2-gate.sh`, the worktree and port changed),
`C/t6/colour.sh` (from `k2-colour.sh`), `tasks/2026-10-29-church-square.md`, `CLAUDE.md` (Tunables), `tasks/todo.md`,
`tasks/lessons.md`.

- [ ] **Step 1:** `npx tsc -b`, `npm run -s lint`, `npm run -s test:sky`, `npm run -s build`. Expected: all clean.
- [ ] **Step 2:** the six browser checks, one at a time, with vite on a fresh port: grass, walk, rotation, cypress-hang,
  portal, reduced motion. Expected: every case PASS.
- [ ] **Step 3:** the colour gate at stops 0 to 4, both viewports, `light=0`; and `--sources` at stops 3 and 4 so the
  four new sources read against their own rectangles. Expected: PASS, every ΔE76 under 10.
- [ ] **Step 4:** the ID frames at stops 3 and 4 (`ids=1`), both viewports: the door, the three windows and the gable's
  peak show no tree class (magenta) over them. Confirms Task 3's probe.
- [ ] **Step 5:** the triangle sweep (`tri-read.mjs`, `TS` as K2's list plus 0.26 and 0.9). Expected: the worst point
  at most 1,444,930. Perf at stops 0 and 3 at dpr 1.5 (`perf-street-grass.mjs`): p95 at most 18.6 ms. Draw calls at
  stop 0: 321, unchanged.
- [ ] **Step 6:** the build hash, the church's ribbons, the street's triangles, into the record
  `tasks/2026-10-29-church-square.md` with the before-and-after crops, Task 5's table and the tree move. The Tunables
  entry in `CLAUDE.md`. `tasks/todo.md`'s pickup. `tasks/lessons.md`. Commit:
  `git commit -m "docs(church): slice 1's record, the gate's runs"`.
- [ ] **Step 7:** the branch review by Codex (`w4:p4`, a brief file), fixes in one batch, then push and the PR with the
  session link, for Mark's pass on the preview. Slice 2's plan starts after his word.
