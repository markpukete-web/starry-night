The rules that still apply to The Starry Night, one per bullet and grouped by theme. Read it at the start of every session, and add each new lesson under its theme with its date.
The full history, 2026-06-13 to 2026-10-30, is in `tasks/archive/2026-10-30-lessons.md`. Each bullet ends with its date, where the archive gives one, and the first words of its heading or bullet there.

## Reading the project and the record

- Re-read `CLAUDE.md` before any direction call. When the code differs from the locked vision, the vision wins: name the gap and ask Mark. `2026-06-23 · Read CLAUDE.md often`
- Never reopen the locked sections. Ask before any dependency or tool beyond the approved list, and say what adopting it costs. `2026-07-21 · Ask before adding a tool`
- An inherited note is not evidence. Check branch, deploy and protection claims with git and the API before repeating them. `2026-07-22 · An inherited note`
- Keep one owned copy of any list, state or code. Copies drift, and the copy that drifts is the one you read. `2026-07-21 · A checklist restated`
- Read the code a design names before giving it values. `2026-10-25 · Read the code a design names`
- Run `date` before writing a time, take past times from the git log, and write Brisbane time. `2026-10-29 · Read the clock`
- Quote the shipped knob from `sky-tuning.json`, not the code default. Give the worst case and the common case together. `2026-10-16 · Quote the shipped knob`
- A wrong reason in a comment is a trap. A comment that calls an optimisation impossible gets one measurement first. `2026-07-21 · The header comment`
- When a fix changes what the visitor feels or pays, write the trade where the setting lives. `2026-10-16 · A fix that changes how`
- Edit a record section only up to its own next heading. List the headings and read the hunks before each commit. `2026-10-24 · Replace a section`
- When a branch goes, fix every instruction that names it in the same change. `2026-07-28 · Retiring the staging branch`

## Mark's taste and the gates

- Mechanical closure only earns entry to the visual gate. Never present visual work without looking at it beside the source. `2026-07-22 · Do not present authored`
- A gate pass is for the piece as it stood. When the parts around a part improve, it comes up for review again. `2026-10-21 · The bar moved`
- Mark judges a 3D scene on light, motion and depth against Simon Lee's live village. Show him a live view early: a colour gate measures drift, not life. `2026-10-23 · the street: a colour gate`
- Where the painting shows nothing, the live reference decides. `2026-10-24 · Where the painting shows nothing`
- Borrow a reference's craft, not its method. `2026-10-11 · Borrow a reference's craft`
- Use the TechArtist diorama for orbit and interaction only, never for visual language. `2026-07-05 · TechArtist-style physical diorama`
- The target is a physical 3D world of the painting. Solid closed forms survive orbit, and a projection never does. `2026-07-09 · Solid closed forms`
- Head-on is a composition contract: the cypress nearly at the top, the whorl over the village, a painted moon, a small pale village. `2026-06-15 · Front-view taste corrections`
- Composition is the content. Identity comes from authored relations between forms, such as the spire answering the cypress. `2026-10-05 · Identity needs an authored`
- Completeness beats impact. Offered a striking crop or the whole subject, Mark keeps the whole subject. `2026-07-28 · Mark chose the letterbox`
- Mark's prior is "more". Build the range above where your eye says enough, let the gates police boil, and record what the chosen numbers cost. `2026-10-13 · He chose the strongest preset`
- Build the tuning tool where Mark judges: sliders on `?tune=1`, which work on every build. `2026-10-13 · The taste gate wants sliders`
- A spike behind a URL switch answers a taste question in twenty minutes. `2026-10-22 · A spike with a URL switch`
- Mark's reading of an object outranks a mechanically sound proxy. `2026-10-05 · Mark's object reading`
- Rate findings honestly, and never dress a refinement as a blocker. Keep a residue in a record, not open. `2026-07-22 · The reviewer's bar`
- Say which frame a verdict is in: the painting, or the last build. `2026-07-22 · Absolute and relative readings`
- Calibrate a defect list against a gate-passed capture before fixing anything. `2026-07-28 · Calibrate a defect list`
- The painting glows its stars, not its swirl. Faithfulness lives in motion, colour and impasto, not astronomy. `2026-06-21 · The diff's headline`
- Venus is the brightest light after the moon. Tune the swirls by eye against the painting, never to a turbulence slope. `2026-06-21 · Research takeaways`
- An extra whorl made a two-eyed face. Interlocking two existing rolls is safe. `2026-06-21 · Whorl notch`
- A screenshot Mark likes can name the mechanism, not only the mood. Measure it against the candidates. `2026-07-22 · A liked screenshot`
- A self-set working bound is not the locked criterion. Report both, and only the locked one gates. `2026-10-13 · A self-set working bound`
- Lossy compression of the paint is Mark's call, made from a crop A/B. `2026-07-21 · Still on the table`
- Place a creature where it would live, then find a spot there that the camera sees. `2026-10-25 · Place a creature`
- Stop at the retune cap of four passes, and an in-place probe counts as one. Past the cap, the call is Mark's. `2026-10-21 · Retune within the cap`

## Captures and visual review

- One change per capture, and a second mechanism gets its own pass. `2026-06-20 · One change per capture`
- Compare matched crops of the render and the painting. Zoom 2× to judge hue and edges, and judge strokes at 1:1. `2026-06-20 · Frame-by-frame, region-by-region`
- Read all four edges of a capture, not only its centre. `2026-10-11 · Read the edges`
- Look before recommending, then measure to close. A number that says "hidden" is not a capture that shows it. `2026-10-29 · A measurement that says`
- Judge a silhouette on a thresholded mask, not a shaded render. A defect claim needs a fix's evidence, at true scale. `2026-07-22 · Judge a silhouette`
- Draw the strokes flat in the painting's frame before draping, every retune. `2026-10-21 · A flat gate finds`
- A capture gate cannot see a missing button, so a pre-release pass reads the DOM. `2026-07-27 · "All build work is done"`
- A capture that looks nothing like the scene is a pipeline failure first. `2026-07-08 · Capture-pipeline trap`
- Before a capture, wait on `__skyReady`, and on `__streetReady` in the street. Take the base the same way. `2026-10-25 · __streetReady never waited`
- Wait on a hook every mode produces, and print the condition on a timeout. `2026-10-28 · A capture helper that waits`
- Register lit, unlit and ID captures at one pinned clock. Read a capture's size before projecting into it. `2026-10-25 · Register lit, unlit and ID`
- The capture helper pins the sky's clock, so check motion on a page with the pin removed. `2026-10-30 · The capture helper pins`
- Anything that moves on real time needs a snap or a settled flag that the capture waits for. `2026-10-30 · A real-time easing`
- Capture a motion's strips round its computed peak. `2026-10-13 · Capture the strips`
- Probe what hides a part, and which side faces the camera, before naming a lever. `2026-10-30 · Probe what hides a thing`
- Before blaming new code for an artefact, crop the same view from the untouched baseline. `2026-07-14 · Before blaming new code`
- Capture labels are not camera measurements. `2026-10-05 · Capture labels are not`
- Check a composition premise against the painting and the camera before building on it. `2026-10-05 · Check composition against`
- Register a side-by-side pair by the subject's size and silhouette, not by a fixed rectangle. `2026-10-22 · A composite "at the render's scale"`
- Before naming a silhouette defect, run a width table against the painting in 2D and in render space. `2026-10-21 · A direction decided on a triptych`
- Probe a check's fixed screen point at every stop and viewport it runs at. `2026-10-24 · Probe a check's fixed screen point`
- Check a fix from every stop and viewport that faces it. `2026-10-24 · Check a fix from every view`
- Draw a weight in a loud colour before tuning its strength. `2026-10-25 · Draw the weight`

## Measurement and evidence

- Heatmaps and motion means show where motion is, never how it looks. A motion diff cannot tell spin from flicker. `2026-06-23 · The heatmap mean`
- Run a same-input control in this pass before reading a capture diff. `2026-07-27 · Establish the jitter`
- Capture RMSE cannot measure a change in load timing. Compare decoded `ImageData` instead. `2026-07-21 · Capture RMSE cannot measure`
- A baseline differs only in the thing under test. `2026-07-22 · Isolate the variable`
- Find which property disagrees before turning the obvious dial. A dial that barely moves is fighting something upstream. `2026-07-22 · A grade upstream`
- Prove a cause by removing it. `2026-10-24 · A gate tuned on a short street`
- Bisect, do not theorise. After two mechanism fixes fail, use instruments. `2026-07-17 · The dotted-arc hunt`
- A true bug report can be half a diagnosis. Fix the named cause, then measure again. `2026-07-28 · A correct bug report`
- When a 3D control does nothing, expose it on `window` and read its state. `2026-06-15 · Reset control`
- Measure the real field before choosing a threshold: histogram, quantiles, then the map. `2026-10-13 · Set thresholds from the real field`
- Measure the need before choosing a margin, and time a bake before scheduling it. `2026-07-17 · Measure the need`
- Measure on the part's own mask, because a rectangle holds its neighbours. `2026-10-22 · Measure on the thing's own mask`
- Measure a colour claim against the source's distribution before changing the rule. `2026-10-21 · The grey is Van Gogh's`
- Count the source's texels by hue before writing a colour rule. Dump the real pixels when a gate misses. `2026-10-24 · Count a source's texels`
- Frame a metric against what sits behind the region, and count the negative space. `2026-07-28 · A framing metric`
- When a metric rewards the named defect, the visual gate overrules it. `2026-07-22 · Reject a numeric gate`
- A mean-Lab gate cannot see flat paint, so measure texture too. `2026-10-11 · The mean-Lab gate`
- A metric the canvas weave drives is not a stroke metric. `2026-10-22 · A metric the painting's canvas`
- Under sparse strokes, the colour gate measures the base. `2026-10-25 · A dark base under sparse strokes`
- A lit vertex reaches its whole triangle, so dilate an isolation mask by a segment. `2026-10-13 · A lit vertex`
- A probe painting stub admits every texel. Decode the real painting for any coverage or colour claim. `2026-10-21 · A probe with the tests' stub`
- Filter a coverage probe by part, and check a "clean" crop against the diff image. `2026-10-21 · A coverage probe over an x-range`, `2026-10-21 · A "land-only" crop`
- Compare band-mean Lab when strokes move. Differing pixels count area, not magnitude. `2026-10-13 · Compare band-mean Lab`
- Isolate a feature with the other knobs at 0, then classify every differing pixel. `2026-10-13 · Isolate the feature`
- Name a fallback honestly. A regional Lab comparison is not per-pixel evidence. `2026-07-22 · Name a colour fallback`
- Measure coverage in the render, per region, on a loud background. `2026-10-11 · Measure coverage in the render`
- Project the probe point onto the capture before naming a cause. `2026-10-11 · Register the photographed feature`
- Measure a part against its neighbours too. A figure can pass its gate and vanish into the ground. `2026-10-24 · Measure a part against`
- A colour knob acts differently per source, so read it in Lab per part. `2026-10-26 · A colour knob's effect`
- A new part in front of an old one moves the old one's colour gate. `2026-10-25 · A new part in front`
- Measure main before bounding a change. Set the bound between what working code and a mutant read. `2026-10-25 · Measure main`
- Judge a multiplicative light by its footprint against the term off. Ramps that multiply leave the light under half. `2026-10-28 · Judge a multiplicative light`, `2026-10-25 · Ramps that multiply`
- A size on screen and a light's reach are numbers. Project the real point through the real camera. `2026-10-29 · A size on screen`
- A lamp's halo is a screen-space sprite. Bin pixels by screen position before blaming a colour. `2026-10-29 · A lamp's halo`
- A lightness miss can sit under the strokes. Measure the underpaint first. `2026-10-29 · A lightness miss`
- Repeating byte counts in a failed comparison mean two states, not noise. `2026-10-13 · Identical byte counts`
- Sample many frames before naming a cause for a triangle count that differs. `2026-10-25 · A triangle count`


## Tests, checks and mutants

- Write the wrong implementation and see the test fail on it. A compound guard gets a mutant per term. `2026-10-11 · Write the wrong implementation`
- A check you have never seen say "no" is not a check. Run the negative case. `2026-09-24 · An API filter`
- A PASS must prove its event happened. Assert the precondition, and treat a class with no pixels as an error. `2026-10-24 · A check's PASS`
- A test that pins constants or rebuilds the code's rule cannot catch the code ignoring it. Read the state the runtime left. `2026-10-25 · A test that rebuilds`
- Bind a report to what was drawn, not to values computed beside the draw. `2026-10-29 · A guard that reads a copy`
- Fixtures vary and straddle the threshold. A negative fixture picked by the code under test passes with it. `2026-10-29 · A fixture chosen`
- A fixture that must not be tree needs blue in it. Test a morphology helper on a mask with an edge, and a selection on its empty case. `2026-10-21 · A "treeish" fixture`
- A detector needs failing controls of every shape the defect can take. `2026-10-11 · A detector needs failing controls`
- An expected area comes from an input the render cannot move, such as the crop box. `2026-10-21 · An expected area fitted`
- A box difference proves some change, not yours. Isolate yours with a mutant that removes only it. `2026-10-22 · A box difference`
- Gate scripts reject non-finite input first, because NaN passes a threshold. `2026-10-11 · NaN passes`
- A gate's target never comes from the builder's own constant. Read it from `palette.json` or a painting rectangle written in the gate. `2026-10-24 · A gate's target`
- Require each expected part and its count before checking values. `2026-10-26 · A test that loops`
- Assert what holds at every setting of a tunable, not one exact count. Keep measured counts in the record. `2026-10-28 · A test that pins an exact`
- A clearance test bounds the built geometry over every leg at full width, not a point or a radius. `2026-10-24 · A clearance test must bound`
- Test whole batches and the emitted triangles' centroids, not samples or corners. `2026-10-21 · A sample of the batch`
- A hash test that says only "differs" protects nothing. Pin the behaviour, and make the wrong call impossible to write. `2026-10-25 · A hash test`
- A direction assertion decides the direction once. Remove a guard a reviewer proves unreachable. `2026-10-21 · A guard a reviewer`
- A margin in a crossing test is a hole unless something needs it. `2026-10-28 · A crossing test`
- `0 · (negative)` is `−0`, and `assert.equal` sees it. A shader-order test matches the statement `discard;`, not the word. `2026-10-13 · 0 · (negative)`, `2026-10-21 · discard in a comment`
- Add each new test file to `test:sky` in the same commit, and read the test count against the expected one. `2026-10-22 · The same slip twice`
- A green suite under Node's type stripping proves neither types nor lint. Every green step runs `npx tsc -b` and `npm run -s lint`. `2026-10-28 · A worker's task step`
- `tsc --noEmit` checks nothing here, because the root `tsconfig.json` holds only references. `2026-06-14 · tsc --noEmit is a NO-OP`
- Commit before a mutation run, and restore from one fixed backup path. `git checkout` cannot restore an untracked file. `2026-10-28 · Commit before a mutation`
- A mutant's red comes from the named mutation alone. Write each mutation as a text substitution, or record its diff at the gate's head. `2026-10-27 · A mutation artefact's diff`
- Run a gate's mutants in a checkout nobody else uses, made with `git worktree add --detach`. `2026-10-22 · Run the gate's mutants`
- Prove each change's identity before the next visible change lands. `2026-10-25 · An identity gate`
- A browser check's point is a premise, and a new object near it changes what it measures. A replacement point carries the check's control. `2026-10-27 · A replacement point`
- Name a check's escape hatch, such as `--moving`. Never imply one. `2026-10-25 · A check's escape hatch`
- Scope a regression test to the view where the defect showed. Write the excluded views into the plan for Mark's eye. `2026-10-26 · A test over every camera`
- Read each knob's range against the tightest margin it moves. `2026-10-26 · A knob range`
- A plan that moves a geometry parameter names every test that reads it, and a probe runs them first. `2026-10-27 · Moving a wall's end`
- Change the browser cases in the commit that changes their behaviour. `2026-10-29 · Change the browser cases`
- Sweep a rule over every walk sample, not the stations alone. `2026-10-29 · A rule about a region`
- An opt-in feature's off path is the old path in bytes. Make a zero exact by a branch, not by cancellation. `2026-10-13 · An opt-in feature's off path`
- A flag needs evidence from the flagged URL. Grep `src` for every parameter a check passes. `2026-10-24 · a check's URL parameter`
- Build a check's URL with `URL` and `searchParams.set`, and prove the variant loaded. `2026-10-11 · Appending a query string`
- While a reviewer reads, check the maths in a scratch copy, never in the files under review. `2026-10-13 · Check the mapping and the maths`
- A part that borrows another's input works with that part off. Run a flagged feature's chrome through the viewport check at its own gate, flag on. `2026-10-25 · A part that borrows`
- Keep accepted work an exact prefix and its screenshots at AE 0. Prove a promotion against the approved captures on dev, preview and live. `2026-10-05 · Preserve accepted work`
- Run the existing guards after every review fix. `2026-10-11 · A guard script catches`
- Run the suite with `reference/derived` hidden before pushing a test that reads it. CI has no derived files. `2026-10-25 · Read the PR's CI`
- A synthetic fixture's bound is not the real ceiling. Raise it to its own base plus the allowance, and say why in the test. `2026-10-29 · A synthetic fixture's bound`
- The colour gates read untracked baked references, so a fresh clone rebakes them first. `2026-10-13 · The colour gates read baked`
- A diagnostic imports the code it diagnoses and removes one factor at a time. `2026-07-21 · Diagnostics must import`
- A gate off the real path is decoration. Share one integrator with the runtime, and write down what the gate omits. `2026-07-21 · A gate that does not exercise`
- `process.exit` inside `try` skips `finally` and leaves Chrome running. Throw instead. `2026-10-24 · process.exit inside try`

## Browser checks and capture tools

- `npm run check:reduced` must see byte-identical frames under reduced motion and a control that moves. Run it when animation wiring changes. `2026-07-13 · npm run check:reduced added`
- `npm run check:viewport` compares fresh and rotated loads. A width breakpoint cannot describe a phone, so test the short axis. `2026-07-28 · The rotation gap`
- `page.screenshot` stalls on an animating canvas. Read the canvas in the page, and use CDP `Page.captureScreenshot` for the chrome. `2026-07-27 · Playwright's page.screenshot`
- For motion, draw the canvas into a 2D canvas and read `getImageData`. A `toDataURL` round trip can return a stale frame. `2026-06-22 · Capture pitfall`
- A canvas readback needs `preserveDrawingBuffer`. `browser_run_code_unsafe` reaches the Playwright page APIs that the plain MCP tools lack. `2026-06-13 · Requires gl=`, `2026-06-14 · browser_run_code_unsafe drives`
- `DIORAMA_CAPTURE_EXTRA` appends URL parameters to the capture pipeline. `2026-07-17 · DIORAMA_CAPTURE_EXTRA`
- A screenshot waits for the main thread. To judge motion during a long task, read a CDP screencast. `2026-10-25 · A screenshot waits`
- Drive orbit with pointer events on the canvas element itself. `2026-06-13 · Headless orbit`
- Send a race's events and read its state in one evaluate, because a frame can run between two calls. `2026-10-29 · A read and an act`
- Fire a synthetic press and release together, or a software frame between them reads as a drag. `2026-10-13 · DevTools waits`
- A visible browser's screenshot sends the real cursor. Drive hover and press tests through a page seam. `2026-10-25 · A screenshot of a visible`
- A scripted `.click()` proves the handler, not the control. Click at the drawn centre after `elementFromPoint`. `2026-10-28 · A JavaScript .click()`
- A covered Playwright window drops to 1.5 fps. Call `page.bringToFront()` before a capture, and close the browser after. `2026-10-24 · A covered Playwright window`
- Run one browser check and one software Chrome at a time. Parallel runs miss the canvas and poison the leak count. `2026-10-29 · Two browser checks`
- Run browser checks from a runner that starts Vite with `--host 127.0.0.1`, because `localhost` is `::1` here. `2026-10-29 · A browser check needs`
- Restart the server under test after a mutation run, with no second dev server up. Run a failing check twice before naming a defect. `2026-10-27 · A second dev server`
- Never run unit-test batches beside browser checks. The load fails timing cases that pass alone. `2026-10-28 · Do not run unit-test batches`
- Read the URL in the raw output and the PNG's size before reading a number. `2026-10-25 · Read the URL in the raw`
- A checker reads the exact frame it names. Frame names follow `Number`, so `--times 8.0` writes `t8`. `2026-10-25 · A checker that guesses`
- A cloud session needs `CHROME_FLAGS=--no-sandbox` and `CAPTURE_SETTLE_MS=10000`. It reads production state from the Vercel API. `2026-10-13 · Cloud session captures`
- Headless Chrome on this Mac uses the GPU, but frame rate still needs a headed window. Capture a change's parent on the same GPU before blaming it. `2026-10-16 · Headless Chrome on this Mac`
- A lost gate tool comes back as a tracked option, not a scratch script. `2026-10-16 · A lost gate tool`
- Check gesture- and permission-gated features, such as fullscreen, in a real profile, not the agent browser. A swallowed error hides which failed. `2026-07-27 · Do not diagnose`
- To test a long frame delta, block the main thread for N seconds. Hiding the page does not stop headless frames. `2026-10-20 · Neither headless Chromium`
- A page's frame recorder runs after R3F's loop. Assert inside the phase that owns the state, with at least one frame read. `2026-10-28 · A page's frame recorder`
- A pinned clock freezes every ramp that reads it, and it cannot test the clock. Test the clock unpinned against the recorded `dt`. `2026-10-11 · A pinned clock`, `2026-10-21 · A pinned sky clock`
- Poll a settled flag with a cap, never a fixed sleep. `2026-10-28 · A check that sleeps`
- A pixel pair proves layout only on a pinned frame. Report rects beside pixels. `2026-10-28 · A pixel pair`
- A page-error check accepts R3F's caught error by its text. `2026-10-25 · R3F reports a caught error`
- A failure path gets its own browser run. Without WebGL, R3F raises an unhandled rejection, not a window error. `2026-10-25 · A page with no WebGL`
- Network emulation cannot show a `fetchpriority` effect. `2026-10-25 · Chrome's network emulation`
- A test of an inline script can run it over stubbed globals. `2026-10-25 · A test of an inline script`
- `sips --cropOffset` goes before `-c`, and `-z` takes height first. Build contact sheets with `magick`, not `montage`. `2026-07-12 · sips gotcha`

## Performance, memory and real devices

- Take frame rate from a headed window or Mark's device, never from a software-rendered page. `2026-06-13 · Perf reality check`
- A phone's costs do not show on the Mac. Use Mark's iPhone with `?perf=1` and URL flags to split causes. `2026-10-25 · A phone's touch cost`
- A change that holds two scenes at once needs a check on Mark's phone before the preview counts as done. `2026-10-28 · Memory that fits on the Mac`
- Measure what an unmount frees before choosing it as a fix. `2026-10-28 · Measure whether an unmount`
- Measure memory on the production build after a forced GC. Label allocations by retainer path, not heap id. `2026-10-28 · Measure memory`
- `ReleaseInitialInternal` frees R3F's first `internal` and its stale `useFrame` closures. `2026-10-28 · R3F 9.6 with zustand 5`
- Under a 60 Hz lock, p95 is jitter. Read the mean, the max and the mean without the largest interval, with base and head back to back. `2026-10-24 · Under a 60 Hz lock`
- Before a perf round, idle the Lead, close orphaned Chromes and read power and thermal state. `2026-10-24 · The Lead stays idle`
- A perf round across a sleep is void. Read `pmset -g log`. `2026-10-24 · Read pmset -g log`
- During perf, edit only files outside the module graph. Stop a run when its guard marker cannot be made. `2026-10-25 · A guard marker`
- Measure a hitch with an independent `requestAnimationFrame` loop. `2026-10-11 · Measure a hitch`
- Price a part by running its generator, never by area. A clad face costs about 4 ms to build, however few strokes it draws. `2026-10-28 · A clad face costs`
- A triangle budget is not monotone in density, and a new draw in a seeded stream moves it. Run the suite at each value near the bound. `2026-10-25 · A triangle budget`
- Check what each camera frames before paying for a part. A chunk partly in view draws all its blades. `2026-10-23 · Check what each camera`
- Build geometry once and animate it from a GPU time uniform. A camera inside transparent strokes pays heavy overdraw. `2026-06-13 · GPU animation`
- A Web Worker moves the wait. Ask where "show the old state" also applies. `2026-10-11 · A worker removes`
- A byte-identical bundle hash proves a dependency bump inert. `2026-09-24 · A byte-identical bundle hash`

## Rendering and shaders

- Show true colour with `toneMapped={false}` and sRGB textures. `2026-06-13 · Painting on a cover-scaled plane`
- A raw `ShaderMaterial` writes linear values as screen colour. Pass a hex through `setStyle(hex, LinearSRGBColorSpace)`. `2026-10-11 · A raw ShaderMaterial`
- The canvas writes sRGB, so an ID value of 128 reads back as 188. A multisampled ID view blends its edges. `2026-10-24 · The canvas writes sRGB`
- An axis flip in the vertex stage reverses the winding. Test normals against the runtime material's side. `2026-10-21 · A solid's winding`
- Prove a layer renders with a constant-colour fragment before blaming the data. Absent and dim are different defects. `2026-06-22 · Diagnosis path`
- `InstancedMesh` culls against an origin-centred sphere, so far-out instances need `frustumCulled = false`. `2026-06-13 · Two instancing gotchas`
- A per-ribbon constant goes through a `flat` varying, because a hash amplifies interpolation drift. `2026-10-13 · A per-ribbon constant`
- Sample a mipmapped texture before any fragment-dependent discard. `2026-10-11 · A mipmapped texture lookup`
- Opaque objects draw before transparent ones, whatever `renderOrder` says. `2026-10-11 · Opaque objects draw`
- A far float32 sentinel breaks GPU maths. Fade on the time left. `2026-10-16 · A far sentinel`
- `onBeforeCompile` variants each need their own `customProgramCacheKey`. `2026-10-13 · onBeforeCompile keeps`
- A shared shader gets a factory whose defaults reproduce the old text, pinned by hash. `2026-10-22 · A shared shader`
- Bilinear sampling cannot blend across textures, so a texture hand-off needs a shader feather. `2026-07-17 · bilinear cannot blend`
- A fade can do several jobs. List its dependants before removing it. `2026-07-17 · A fade is a systems component`
- Mix a colour that varies across a ribbon in the fragment shader. `2026-10-25 · A colour mixed`
- A light band at a stroke's edge falls where the alpha test cuts. Reach full strength inside the band. `2026-10-25 · A light band`
- Alpha-to-coverage stipples a thin stroke. Read the crop before trusting which side of a bar a number sits on. `2026-10-21 · Alpha-to-coverage stipples`
- Size an additive halo to pop, not flood. Keep value kicks under the bloom threshold. `2026-07-14 · Sparkle`
- Do not grade around a post-processing ownership error. Full-frame Bloom left the diorama, and authored halos carry the glow. `2026-07-22 · Do not grade around`
- A phantom object in a masked composite is often a hole showing the layer behind. Check the mask first. `2026-07-09 · The ghost`
- A spiky silhouette is usually the mesh's facet density, not the strokes. `2026-07-14 · A spiky silhouette`

## Paint, strokes and colour

- Ribbons read as the painting's own stroke energy. Dabs read as objects over it. `2026-06-23 · Medium beats magnitude`
- Never overwrite the painting's flow direction with an analytic field, which reads as water. Nudge the sign instead. `2026-06-22 · Forcing pure-tangential`
- Signed flow has a direction. Align its sign again wherever flow values move. `2026-07-16 · Mark's live catch`
- Integrate streamlines in the painting's UV space, carrying a heading that never reverses. `2026-06-13 · Heading continuity`
- Overlapping translucent flat-colour strokes average into a milky field. `2026-06-22 · Brush-dab smear fix`
- The 2D `LivingPainting` base flow stays at 0, because its advection blurs the painting. `2026-06-22 · Base-flow advection re-blurs`
- `skySwirls.ts` is the one swirl table for the CPU and the GPU. `2026-06-22 · Shared swirl table`
- Repeated procedural strips read as clapboard, and a wider procedural mark is still procedural. `2026-10-05 · The paint medium matters`, `2026-10-05 · Increasing mark width`
- The moving sky takes one colour per stroke. The cypress's colour follows the stroke, because one colour averages the bands it crosses. `2026-10-22 · One colour per ribbon`
- A stroke is longer than its streamline spacing. Keep length and width on separate controls. `2026-06-21 · De-blur`
- Size short strokes in absolute units, or short paths turn into pebbles. `2026-10-11 · A stroke sized`
- Thick opaque strokes show path faults that thin ones hide. `2026-10-11 · Thick opaque strokes`
- Visibility comes from speed and flow contrast. More shimmer and bristle make crawling worms. `2026-06-23 · Visibility comes`
- Per-stroke value variance reads as Van Gogh: about ±35% at composition distance, not ±50%. `2026-07-12 · Hills (1 pass)`
- Taper the brush quad, and lay lit strokes over a dark solid base. `2026-07-09 · Taper the brush quad`
- Cladding reads only on faces that face the camera. `2026-07-09 · Cladding only reads`
- Slim marks sticking out at a silhouette read as fur. Use broad marks at edges. `2026-07-13 · Island underside`
- Pair a low-frequency outline with high-frequency value. `2026-07-12 · Cypress (3 passes)`
- When density turns to fur, organise marks into courses before cutting them. `2026-07-22 · Uniform scatter`
- Measure a stroke's width as one colour's band, at 1:1 on the capture. `2026-10-21 · A lane is not a stroke`
- The painting's layered strokes need about three coverages. `2026-10-21 · One nominal coverage`
- Read the stroke body's shader before tuning a part's literals. Give a part the stroke range that draws its shape. `2026-10-27 · A dab's look`
- The stroke body tapers both ends, so a root-grown stroke uses along 0.5 to 1. `2026-10-24 · The stroke body tapers`
- The sky's bristle constants alias on strokes under about 20 px. `2026-10-21 · The sky's shader constants`
- Paint-like parts go under the strokes, and ink goes over them. `2026-10-26 · A part laid over`
- A base is its source's mean, and the ground's is its darkest 40%. Check a new part against this before tuning it. `2026-10-24 · A figure's underpaint`
- Inset a base at every edge it does not share, or the short strokes leave a ruled edge. `2026-10-28 · A base inset`
- "Painted exactly as X" carries X's stroke scale. State the part's own reference height. `2026-10-26 · "Painted exactly as X"`
- Sampled paint needs a brush-scale judgement. Stretching smears, and repeats flute. `2026-10-05 · Source sampling still needs`
- Cladding and underpaint describe one surface. `2026-10-05 · Cladding and underpaint`
- Uniform paint hides interpenetration. Check footprints again when neighbours get different paint. `2026-10-06 · Uniform paint hides`
- Clip strokes that texture a region to that region. `2026-07-14 · The bold pass overshot`
- A smooth patch in a grained field reads as a ghost. Add the field's own grain. `2026-07-14 · Fixing the VALUE`
- A bent blade changes colour as well as shape. `2026-10-24 · A bent blade`
- A marker needs height and must face the camera. `2026-10-29 · A flat mark`
- A colour rule cannot tell a pale wall from a lit hill. Exclude authored footprints. `2026-10-21 · A colour rule cannot tell`
- Warm is not bright in a nocturne. Keep warm accents to sparse marks, chosen per stroke. `2026-07-22 · The master insight`
- Starry Night is high-contrast, not dark. Add light where the painting has it, because a wash cannot be unmixed. `2026-07-22 · Bloom removal`
- Darken on a luminance curve, never a flat multiply. `2026-06-15 · Sky deepened one notch`
- When a glow reads milky, check the background value. `2026-06-21 · The milkiness`
- Blurring the painting turns complementary paint to mud. `2026-10-11 · Blurring the painting`
- Coverage lifts lightness. `2026-10-11 · Coverage lifts lightness`
- A chroma boost for a dull input oversaturates a faithful one. `2026-10-22 · A chroma boost`
- A `Color` multiply works in linear light. Fit factors in linear, and name each factor's colour space. `2026-10-21 · A multiply on a three`
- `palette.json` gates painted surfaces. The strokes and emissive light are the exceptions. `2026-06-14 · Palette contract`
- Median cut misses a small family. Stratify by the property that matters. `2026-07-22 · Median cut`
- A reproduction's chroma gives a direction, not a target. `2026-10-28 · A reference reproduction's`
- Measure the unlit colour before calling it a lighting fault. A dark pigment bounds a brightness effect. `2026-10-24 · A dark palette`
- The same lift reads weaker on a glaze. Compare skies by relative gain. `2026-10-16 · The same lift`

## Forms, geometry and cameras

- Use deterministic value noise, never `Math.random`, for geometry. Seed each copy so twins differ. `2026-06-14 · Deterministic value noise`
- Sample noise on the circle, never the raw angle. `2026-06-14 · Sample noise on the circle`
- After fixing a pattern in one place, grep for it everywhere. `2026-06-15 · Island seam`
- Keep a crop's pixel aspect explicit when mapping it to the world. `2026-07-22 · Preserve pixel aspect`
- Make a part dominant with mass and height, inside the frame. `2026-06-14 · Taller alone`
- Lift every column onto the surface the triangles span, with one measured value and a margin. `2026-10-21 · The lift must sample`
- Settle a point two surfaces constrain on their contact, and test both. `2026-10-21 · A clamp that moves`
- Take a slope's frame from the terrain under the point itself. `2026-10-21 · Two frames`
- Flood the raw map, then close it, because a closing first bridges speckles. `2026-10-21 · A closing before a flood`
- Beyond a domain, dilation reads 0 and erosion reads 1. Interpolate a sparse seed onto every row first. `2026-10-21 · A morphology confined`
- Root a frond the least distance into the main body that closes the volume, not at its centre. `2026-10-21 · A frond rooted`
- Find every index another function reads before thinning a list. `2026-10-23 · Keep a decimation's anchors`
- Filter a seeded generator's output after generation. An exclusion inside it moves every later draw. `2026-10-25 · An exclusion inside`
- A hard-coded loop count hides a changed list. `2026-10-25 · A hard-coded loop`
- A sketch map's scale is a decision. Its dots are not footprints. `2026-10-23 · A sketch map's scale`
- With OrbitControls, target height and camera height are one lever. Fill a tall frame with fov and distance. `2026-07-28 · With OrbitControls`
- A home that looks down may sit on the polar limit. `2026-06-21 · Angle`
- The diorama's azimuth is clamped asymmetrically, −15° toward the rear cypress and +45° the other way (`DIORAMA_ORBIT`). A symmetric side arc shows the blank source edge behind the cypress. `2026-07-06 · Mark caught the remaining back-of-cypress void`
- An authored camera outside the orbit envelope is silently clamped. State poses as azimuth, polar and distance. `2026-07-28 · The shipped portrait camera`
- drei's `reset()` aims at the origin when `target` is a prop. Set position and target, then `update()`. `2026-06-15 · Reset control`
- A portrait framing holds its horizontal field, and the vertical fov follows the aspect. `2026-10-25 · A fixed vertical fov`
- A lens prop reaches every camera user. Set a per-place lens in an effect gated on the place. `2026-10-25 · A lens prop`
- Take a camera's sign from a capture. `2026-06-15 · SIGN gotcha`
- When a review changes an axis, recompute every constant in the old frame. `2026-10-29 · When a review changes`
- Overlays on painted features take positions from measured pixels, never `SWIRLS`. `2026-07-22 · The vortex anchor`
- The nearest hit among the meshes you ask is not the nearest visible surface. Ray cast every occluder. `2026-10-21 · The nearest hit`
- A tree reads by its fork and its gaps. Size a part in pixels at the stops before thickening it. `2026-10-24 · A tree reads`
- Check a part's height against the roof over it. `2026-10-26 · Check a part's height`
- Check a uv-anchored map at both ends. `2026-10-21 · Check a uv-anchored map`

## Motion, clocks and input

- Warp the clock, not the paths. The flow field, the ribbons and the colours stay derived. `2026-10-13 · Warp the clock`
- Prove monotonicity on the clock the shader computes. Put a kick inside the clock's argument. `2026-10-16 · A monotone proof`
- A term that must never jump reaches zero before removal, and a live one is never evicted. `2026-10-13 · The reviewer's blocker`
- Cut a Gaussian at 3σ for an isolation gate. `2026-10-13 · A Gaussian never`
- Clamp each knob where a guarantee lives. `Number('')` is 0, so treat an empty knob as absent. `2026-10-13 · Number('') is 0`
- A new knob needs its type, the tuner, the JSON and `TUNING_FIELDS`. `2026-10-21 · A new knob`
- Name every gain for what it scales. `2026-10-21 · An unqualified name`
- Build a save from the knobs shown, because the writer merges. Check the written file, not the HTTP 200. `2026-10-13 · A hidden knob`
- Write a displacement as a vector field, not a direction times a scalar. Run a plan's formula before the code exists. `2026-10-21 · A formula in a plan`
- An interaction plan lists every event, including a still press and a pointer leaving. `2026-10-21 · An interaction plan`
- Read every coalesced sample of a pointer move. `2026-10-29 · A pointer move`
- The frame's hit test lags the pointer by one move. Hit-test once per hover step. `2026-10-21 · The frame's hit test`
- A trail needs a map, not touch points. `2026-10-24 · A trail needs a map`
- A change of strength needs its own release. `2026-10-25 · A weaker stamp`
- A heading that turns fast reads as circling. `2026-10-25 · A wind whose heading`
- Start a hand-off at the last motion's speed, not at rest. `2026-10-25 · Start a hand-off`
- In a dissolve, the ground goes first. `2026-10-20 · At one speed`
- Release a ref on the next frame when another subscriber reads it later in the frame. `2026-10-20 · A ref handed back`
- Two guards that decide one thing drift apart. One function decides both. `2026-10-28 · Two guards`
- A station's stop comes from the automatic walk alone. `2026-10-28 · A station's stop`

## React, R3F and the page

- Key a disposal effect on its own resource. `2026-06-14 · DISPOSAL TRAP`
- StrictMode runs effect cleanups at mount in dev. `2026-10-11 · React StrictMode`
- Scope a `react-hooks/immutability` disable around `useFrame`, with its reason, and read props inside the loop. `2026-10-13 · Read a prop in the frame loop`
- Name refs `*Ref` for the React Compiler lint, which also refuses a clock read in a memo. `2026-10-20 · A driver's writes`
- The canvas is a second React root and commits a frame or more after the page. Guard per-place effects to run once. `2026-10-25 · The canvas is a second`
- A ready seam set in an effect needs a reset on unmount once its component can mount twice. `2026-10-28 · A ready seam`
- Every load feeding a latch needs a failure path. `2026-10-21 · The third fetch`
- Derive a value from the active spec. A first-frame latch hides a load-order dependency. `2026-07-28 · "Latch it on the first frame"`
- Mount a DOM layer only while its driver runs. `2026-10-20 · A conditional DOM layer`
- A later CSS rule with the same selectors wins, media query or not. `2026-10-20 · A later rule`
- Centring hides overflow. Span and wrap instead, then measure with `getBoundingClientRect`. `2026-07-27 · The layout bug`
- Stack chrome in one flow, because a fixed offset encodes a row count. `2026-10-28 · A fixed offset`
- Vite's first run reloads the page. Reload before believing an odd HMR error. `2026-06-14 · HMR gotcha`
- Production aliases leva to a stub, and `tsc` still checks against the real leva. `2026-06-15 · leva out of the prod bundle`
- A leva knob in a geometry `useMemo`'s deps rebuilds the strokes on each change. Uniform and material knobs update live. `2026-06-14 · Live vs rebuild`
- Grep for a prior version before building a tool. `2026-06-24 · The endpoint`

## Assets and offline bakes

- Orientation is the structure tensor's angle plus 90°. The LIC capture checks it. `Technique notes`
- `flow-field.png` stores double-angle orientation, so it interpolates across the wrap. Gradient energy gates the coherence. `Technique notes`, `Phase 0 results`
- `sky-mask.png` is a churn mask, not a segmentation. Cobalt sky passes a luminance gate, so tree evidence needs chroma and connection too. `2026-07-16 · sky-mask.png`
- Guard the moon's and stars' umber strokes in any hunt for tree pixels. `2026-07-16 · The moon's painted`
- Fix a bad input offline and remove the runtime compensations. `2026-07-16 · S3 runtime swap`
- Remove a compensation once the source supplies its cause. `2026-07-22 · When the source starts`
- Fill donors come from solid, clean sky. Feather lightly, low-pass copied flow, and steer an open-ended fill by a guide field. `2026-07-14 · Donors must be`, `2026-07-17 · Open-ended exemplar fill`
- Use nearest donors for colour, never for a field you integrate. Relax a field with Jacobi, and seed a colour fill from nearest donors. `2026-07-12 · Sky-fill churn`
- The scan's weave border is not paint. Never rebake a passed asset for a nearby fault. `2026-07-17 · The scan's canvas-weave`
- Offline scripts use `sips`, Node's `zlib` and plain maths. Node runs `.ts` directly, and the scan is the standard high-resolution file. `2026-06-13 · Phase 0 derivation`
- Downsample data PNGs in raw values, never with `sips`. Re-run the slimmer after a re-derive. `2026-06-15 · flow-field.png 3.38 MB`
- Guard an in-place transform against a rerun. `2026-06-15 · Idempotence guard`
- Prove losslessness by a round trip, then check visually. `scripts/lib/png.ts` is the one codec. `2026-07-21 · Prove losslessness`
- `WEBP_ASSETS` is a measured mixed set: paint ships lossless WebP, flow and mask stay PNG. `2026-07-21 · A mixed-format asset set`
- Use `cwebp -exact` where transparent RGB is data. `2026-07-22 · Transparent RGB`
- Record decoded inputs' digests in a bake, because a sandboxed `sips` decodes differently. `2026-10-21 · A sandboxed sips`
- App-importing scratch scripts live in the repo's `scratch/`, so Node finds `three`. `2026-10-13 · A scratch script`

## Plans and design

- Plans fail on units and frames, not ideas. Write the coordinate contract and test its round trip. `2026-07-21 · Plans fail on coordinate`
- Test a fix with the measurement that condemned the original. `2026-07-21 · My repairs were wrong`
- Brief a plan's reviewer to run its complete code. Run a gate command before writing it into a plan. `2026-10-20 · A plan with complete code`
- Pin every input in a plan. A delegate takes the obvious reading of an ambiguous one. `2026-10-11 · A delegate can confirm`
- Internal inconsistency in a plan is findable without the repo. `2026-07-21 · Internal inconsistency`
- Compose camera, scale and sky first, and review visually before replacing the live route. `2026-07-05 · Failed 3D front-canopy`
- Protect the default route, and put new work behind a URL flag. `2026-07-05 · Autonomous recovery loop`
- Render a draft in a sandbox copy for review. `2026-10-06 · Render the draft`
- Probe a pass's values in place before spending it. Four recipes at one stop settle a look in twenty minutes. `2026-10-27 · Four in-place recipes`
- A hole a fill keeps missing has a direction. Find what sets it. `2026-06-14 · Sequence that wasted`
- Experiment in a worktree on its own port while Mark's server runs. `2026-10-16 · Experiment in a worktree`

## Agents, delegates and reviews

- Measure a review's claims before acting on them, and hold a position with evidence. `2026-07-21 · Verify the review`
- Pair a Codex source review with a runtime capture. `2026-06-22 · Codex's two must-fixes`
- Have a fresh reviewer read the plan with the shaders open, before the build, and measure what the author asserted. `2026-10-13 · A fresh reviewer`
- A builder's read finds what a correctness read misses. `2026-10-24 · A builder's read`
- A builder that stops on a false assertion is doing its job. Fix the plan and send a continuation. `2026-10-29 · A builder that stops`
- A long review read can be a probe. Check the folder before calling a stall. `2026-10-29 · A reviewer's long read`
- A worker's prose is not evidence. Read its code and raw files for every number. `2026-10-22 · A worker's visual reads`
- Never edit code a delegate is gating, or swap files in its worktree even while it is idle. Read old code with `git show`. `2026-10-23 · Never swap files`
- Never commit on a branch whose head a sent brief pins. `2026-10-26 · Do not commit on a branch`
- Keep draft briefs out of a worker's folder, where a brief is a dispatch. `2026-10-27 · A brief file`
- Lint a brief in its own command before sending it. `2026-10-21 · Lint the brief`
- "agent_prompted" is not delivery. Check that the pane starts working within ten seconds. `2026-10-23 · "agent_prompted"`
- Wait on artefacts and processes, not pane status. Match a report heading loosely. `2026-10-29 · A worker's pane status`
- Run `herdr agent list` first. Never stop a working delegate, and route only the next job. `2026-10-28 · Check for the panes`
- Answer a review with every route to the fault. Removing data can meet a finding. `2026-10-25 · Answer a review`, `2026-10-21 · A reviewer's "same field"`
- Read `codex-review-state` before naming a reviewed commit. `2026-10-16 · Codex also reviews`
- Read the PR timeline again after a merge. `2026-10-16 · A review can land`

## Git, PRs, deploy and the shell

- Pushing `main` publishes, because Vercel's project is git-connected. Query the API for whether an action publishes. `2026-07-27 · For the fact`
- "Merged" needs a read of the PR, the ref and the deployment. `2026-10-13 · "Merged" needs a read`
- Read a PR's CI before calling its gate passed. `2026-10-25 · Read the PR's CI`
- A ruleset needs a target and an empty bypass list, because agents push with Mark's credentials. Read the rules API. `2026-09-24 · A ruleset with no target`
- Lint ignores `scratch` and `.claude`. A baseline in the main checkout finds what worktrees hide. `2026-10-29 · A baseline run`
- Run a sweep on the committed head, or say which build it read. `2026-10-25 · A sweep belongs`
- In zsh, use `${=VAR}`, avoid `status`, and brace variables before a colon. `2026-10-25 · zsh reads`
- Run a watch loop's command once by hand first. `2026-10-11 · A shell watch loop`
- A waiter matches a process name, never its own text. `2026-10-29 · A waiter must not match`
- Kill jobs by name or pid file, never by wrapper, and wipe the output folder before a re-run. `2026-10-13 · A killed wrapper`
- Use absolute paths in parallel shell calls. `2026-10-29 · The shell's cwd`
- Rule out a dead server before blaming a proxy. `2026-10-13 · Rule out the dead server`
- Write `-(x ** 2)`, not `-x ** 2`. `2026-10-13 · -x ** 2`
