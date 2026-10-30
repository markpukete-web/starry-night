# The performance review, 2026-10-30

Mark: "Go ahead with the performance review after the trim", then "Take the lead" (17:58). The review measures the
whole piece and fixes nothing. Each fix below is a proposed slice that waits for Mark's word. The raw files are in
`scratch/perf-review-2026-10-30/`.

## The answer

**Desktop cannot afford a pixel ratio of 2 on the diorama.** On this M5 Pro the diorama's median frame takes 17.2 ms
at a ratio of 2, above the 16.7 ms that 60 fps needs. At the shipped cap of 1.5 it takes 11.5 ms. **The street can
afford 2**: every stop stays at 9.0 ms or less. The diorama is the expensive scene, and the moving-strokes sky is about
80% of its frame. Pixel fill sets that cost, not triangles: the street's 1.4 million triangles and up to 322 draw calls
cost less than the sky.

## Method

- The production build (`npm run build` at `e9b9d2d`, whose source is `main` at `0a9e1c9`: the commits between are docs
  only), served by `vite preview` on
  `127.0.0.1:5230`. The pixel-ratio question used a throwaway copy with one change, `dpr={[1, 2]}` at
  `DioramaExperience.tsx:837`, built and served on 5231. That copy was a detached worktree and was never committed.
- `scripts/capture-diorama.mjs --perf --dpr 2`, a retina device at 1600 × 900, so the shipped cap draws 2400 × 1350 and
  the raised cap 3200 × 1800. The phone viewport is 390 × 844 on this Mac's GPU, not a phone.
- **Vsync off**, through the tool's existing `CHROME_FLAGS`: `--disable-gpu-vsync --disable-frame-rate-limit`. With the
  lock on, every case reads 16.7 ms (`probe/dio-locked/`), so the old gates could not show headroom.
- The diorama and the street's stations 0 to 4 (`walkMode=input`, so Vincent stands), both caps, three rounds,
  interleaved (`matrix.sh`, 17:56 to 18:27). No thermal warning before or after. The Mac ran on battery, low power mode
  off. The three rounds' medians agree within 0.7 ms on desktop, 0.8 ms on the phone viewport and 1.1 ms on
  `desktop-nopost`.
- One run in a visible window (`tools/headed-chrome.sh` as `CHROME_PATH`) to check headless: the diorama's median
  11.3 ms visible against 11.5 ms headless, stop 0 4.1 ms against 4.2 ms. The headless numbers stand for this Mac.
- Memory and download (`tools/mem-load.mjs`, the 28 October phone-memory probe plus a byte tally), a cold profile per
  run, through the portal and straight into the street. "Phone" there means a phone viewport in Chrome on this Mac
  (390 × 844, dpr 3, touch), not a phone: a phone's memory and frame costs do not show on the Mac (lesson 2026-10-25).
  The ready times come from a local server with no network. Slow 4G is out of scope (Mark, 2026-10-25). Gemini ran
  this batch and the next (`rest.sh`, `split.sh`).

## The numbers

Median frame time in ms over three rounds, vsync off, `desktop-final` (p50 / p95):

| Place | Triangles | Draw calls | Cap 1.5 (shipped) | Cap 2 | Phone viewport, cap 1.5 |
|---|---|---|---|---|---|
| Diorama | 1,444,930 | 31 | 11.5 / 12.7 | 17.2 / 18.5 | 3.4 / 3.7 |
| Stop 0 | 1,430,223 | 322 | 4.2 / 5.0 | 6.6 / 7.4 | 2.9 / 3.4 |
| Stop 1 | 1,431,177 | 269 | 3.2 / 4.3 | 5.4 / 6.0 | 2.9 / 3.3 |
| Stop 2 | 1,286,939 | 211 | 4.0 / 5.2 | 7.3 / 7.6 | 2.6 / 3.6 |
| Stop 3 | 1,290,659 | 181 | 3.7 / 4.1 | 5.2 / 6.3 | 2.6 / 2.7 |
| Stop 4 | 1,277,899 | 88 | 5.8 / 6.1 | 8.5 / 9.5 | 2.6 / 3.6 |

The diorama at cap 2 has a worst frame of 34 ms. `desktop-nopost` reads the same as `desktop-final` in every run.

Where the diorama's time goes (`split/`, `desktop-final` p50 in ms, round 1 and round 2, existing URL switches only):

| Variant | Triangles | Cap 1.5 | Cap 2 |
|---|---|---|---|
| As shipped: the moving strokes, alive on | 1,444,930 | 11.3, 11.3 | 16.6, 16.7 |
| `alive=0`: the moving strokes, no animation | 1,444,930 | 11.5, 10.9 | 16.5, 16.5 |
| `sky=light`: the painted-light sky | 901,810 | 2.7, 2.6 | 3.9, 3.6 |
| `debug=stage`: no sky | 784,040 | 2.2, 2.5 | 2.6, 2.4 |

The moving strokes take about 9 of the diorama's 11.3 ms at the shipped cap. At a ratio of 2 they take about 14 of 16.6 ms.
The animation costs nothing measurable. The cypress, the land and the village together take about 2.2 ms. The split
cannot say whether the strokes' cost is their overlapping transparent fill or their fragment shader: a probe would.

Memory and download (`rest/mem-*.log`), Chrome on this Mac, a local server:

| Run | Ready after | Downloaded | Renderer after GC | GPU process |
|---|---|---|---|---|
| Phone viewport, the painting | 1.4 s | 9.93 MB, 20 files | 599 MB | 307 MB |
| Phone viewport, then the portal into the street | 4.7 s (the 2.4 s flight included) | 0.06 MB more | 512 MB | 314 MB |
| Desktop, then the portal into the street | 4.3 s | 0.06 MB more | 507 MB | 317 MB |
| Phone viewport, straight into the street | 1.8 s | 9.87 MB | 579 MB | 293 MB |

The renderer after GC through the portal was 517 MB at the 28 October fix's stage 2
(`tasks/2026-10-28-phone-memory.md`). The owl, the moths and the cat added nothing measurable. The sky's build worker
peaks at 165–183 MB of heap, and the code terminates it after the build (`PaintingFlowSky3D.tsx:998`, `:1035`).

The largest downloads on a cold visit: `painting-filled.webp` 2.47 MB (lossless), `signed-flow-filled.png` 1.69 MB,
`painting.jpg` 1.06 MB, the two sky extensions 0.96 and 0.94 MB, their flows 0.52 and 0.45 MB, the favicon 0.44 MB,
`land-flow.png` 0.41 MB, the main script 0.38 MB compressed (1.39 MB raw), `cypress-flow.png` 0.29 MB.

## Findings, ranked

1. **No adaptive quality: a weaker GPU draws the same frame.** The diorama has 5 ms of headroom on an M5 Pro at the
   shipped cap. A desktop GPU at half this Mac's speed would take about 23 ms, under 60 fps. That figure is an estimate
   from the measured 11.5 ms, not a measurement. Nothing in `src` lowers the pixel ratio when frames run long. Proposed
   slice: drei's `PerformanceMonitor` (drei is an approved dependency) steps the cap down to 1 when the frame rate
   falls, and back up when it recovers. A ratio of 1 draws 44% of the pixels of 1.5. In the first probe the diorama took
   7.6 ms at 1 against 12.4 ms at 1.5 (`probe/dio-unlocked-dpr1/`, `probe/dio-unlocked/`). Cost: a small slice, plus a check
   that a step never shows as a visible jump. The other lever is a cheaper moving sky, since it is 80% of the frame.
   That changes the piece's heart, so it is Mark's call and would start with a probe of fill against shader cost.
2. **The perf gate cannot see a regression until it costs a frame.** Every gate since the street read p50 16.7 and
   p95 17.5 under vsync. A change that raised the diorama's frame from 11.5 to 16 ms would have passed. Proposed slice:
   a tracked `--unlocked` option on `capture-diorama.mjs` (lesson: a lost gate tool comes back as a tracked option),
   and gates that report the unlocked median beside the locked one. Delete the `desktop-nopost` case at the same time:
   it has read the same as `final` since bloom left the diorama, and it is a third of every perf round's time.
   Done on Mark's go (2026-10-30 evening, `14d3228`): `--unlocked`, the nopost case deleted, the lesson names the
   option. On the production build, `desktop-final` p50 read 16.7 ms locked and 11.3 ms unlocked
   (`gate-unlocked/`).
3. **The street misses the phone bar on Mark's iPhone.** Read by Mark on the links below, 2026-10-30 evening: the
   painting "very stable once loaded remains 60", the street's stops "25-32". The locked bar is 30 fps on a mid-tier
   phone, and a mid-tier phone is slower than his. The painting's 60 is probably Safari's frame cap, so its headroom is
   unknown. The cause in the street is not known. The two scenes draw about the same triangles (1.28 to 1.44 million),
   and on this Mac the street's frame costs half the diorama's. The street has 88 to 322 draw calls against the
   diorama's 31. The fix depends on what the phone pays for: pixels (a lower ratio, finding 1) or draw calls (fewer
   meshes, the grass chunks and the lamps first). The portal already asks a phone before its first entry and
   recommends a computer. Whether that warning is enough is Mark's call. Proposed: the phone split below. No code.
4. **Pixel ratio 2 for the street only.** The street stays at 9.0 ms or less at a ratio of 2. A cap per scene (2 in the
   street, 1.5 on the diorama) would make the street's grass, frogs and lamps sharper on a retina screen. Whether the
   sharper street is worth it is a visual call: the slice would show Mark 1:1 crops at both caps before anything ships.
   It should wait for finding 1, so a weaker GPU can still step down.
5. **The favicon is a 512 × 512 PNG of 0.44 MB**, fetched on every cold visit, 4% of the painting page's download.
   Icons at 32, 180 and 192 px would be a few kilobytes. Proposed: a small slice, no visual risk to the scene.
   Done on Mark's go (`7df401f`): a 32 px tab icon of 2.9 KB and a 180 px touch icon of 57.9 KB, the same painted
   icon downscaled. No page uses a 192 px icon, so none was made. The fix was offered in July and not taken
   (`tasks/todo.md:2146`).
6. **The paint ships lossless: `painting-filled.webp` is 2.47 MB**, the largest file. A lossy version is Mark's call
   from a crop A/B (lesson 2026-07-21, "Lossy compression of the paint is Mark's call"). Listed, not proposed.
7. **The retired modes ship in the main script.** `App.tsx` still imports `ReliefExperience`, `CanopyExperience`,
   `LivingPainting` and `StreamlineSky`, the earlier spikes reached by `?mode=`. They are in the 1.39 MB main script. How
   much a lazy import or a removal saves is unmeasured. `signed-flow.png` (1.64 MB) ships in the deploy for them but the
   shipped scene never fetches it. Removing modes is Mark's call.
   Done on Mark's word ("go with the lazy-load of the retired modes", `perf/lazy-retired-modes`): `App.tsx` imports the
   four modes lazily. The diorama's start scripts went from 1,388.9 kB (390.2 kB gzipped) to 1,293.3 kB (366.8 kB) in two
   chunks, the main script and react-three-fiber, which the page preloads together. Nearly all the saving is the canopy
   mode's postprocessing (its chunk is 80.1 kB). `leva` was never in the shipped script: production aliases it to a stub.
   The diorama's frame is byte-identical to production's, and it fetches no retired chunk. Canopy, relief and the flat
   route each open and draw. `signed-flow.png` stays in the deploy: removing it is part of removing the modes.

Not measured: the walk between stops, the portal's flight, the opening, and pointer work (the sky's surge, the land's
bend, the hover's cast). The matrix held the camera still with no pointer. The phone's one known cost is under a moving
finger (18–50 fps on the land, 2026-10-25). Also not measured: what a 120 Hz display shows. At 11.5 ms the diorama
cannot hold 120 fps, so there it alternates between 8.3 and 16.7 ms frames.

Not findings: memory holds since 28 October. The street's draw calls (88 to 322) do not limit it on this Mac. If the
phone reading in finding 3 shows the street under 60 fps, the grass chunks and the lamps' separate meshes are the first
place to look.

## For Mark's iPhone

Open each on the phone, wait 10 seconds, and read the frame rate at the top centre of the screen:

- The painting: https://starrynight.markma.dev/?perf=1&arrival=0
- Stop 0: https://starrynight.markma.dev/?street=1&station=0&walkMode=input&perf=1&arrival=0
- Stop 1: https://starrynight.markma.dev/?street=1&station=1&walkMode=input&perf=1&arrival=0
- Stop 2: https://starrynight.markma.dev/?street=1&station=2&walkMode=input&perf=1&arrival=0
- Stop 3: https://starrynight.markma.dev/?street=1&station=3&walkMode=input&perf=1&arrival=0
- Stop 4: https://starrynight.markma.dev/?street=1&station=4&walkMode=input&perf=1&arrival=0

The phone split (finding 3), each against stop 0's plain reading. Stop 0 has the most draw calls. A switch that lifts
the frame rate names the cost:

- No grass: https://starrynight.markma.dev/?street=1&station=0&walkMode=input&perf=1&arrival=0&grass=0
- Unlit: https://starrynight.markma.dev/?street=1&station=0&walkMode=input&perf=1&arrival=0&light=0
- No Vincent: https://starrynight.markma.dev/?street=1&station=0&walkMode=input&perf=1&arrival=0&vincent=0

No switch lowers the pixel ratio. That test needs a `?dpr=` switch on a preview deploy.

Mark's split, 2026-10-30 evening: no grass "once stable: 60", unlit 60, no Vincent "28 at start then 60". Every link
failed to open at first try and showed after a refresh. No Vincent took three refreshes. What the failure looked like,
and whether the earlier links' tabs were still open, is not yet known. Mark: "We can try our best to get the phone
working but I don't want to lower our quality". So a lower pixel ratio on the phone (finding 1) is out. Whether a step-down on a weak desktop GPU is also out is not yet asked.

The reading: every switch reaches 60, so no one part is the cost. First, the street has a start-up dip that outlasts
10 seconds on a phone (no Vincent: "28 at start then 60"). The links above said "wait 10 seconds", so the stop readings
were probably taken inside that dip. Second, a frame over 16.7 ms waits for the next display refresh and shows as 30
fps. A reading of 25 to 32 means most frames missed one refresh. So the plain street may be a little over the phone's
budget, and removing any one part brings it under. One plain reading of stop 0 in a fresh tab, after the number stops
moving, separates the two.

Mark's fresh-tab reading of plain stop 0, after the number stopped moving: "60". So the 25 to 32 were the start-up
dip, and the street holds 60 once settled on his iPhone. Stop 0 is the only stop read this way. Finding 3 is now
the dip itself, which runs past 10 seconds under 30 fps, and the first-try load failures, whose cause is not known.
