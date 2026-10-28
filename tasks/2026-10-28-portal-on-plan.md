# The portal on for every visitor: the plan, 2026-10-28

Mark, 2026-10-28 12:07: "I think we can promote the portal to main then the Vincent wander". The portal (slice 4,
`tasks/2026-10-25-street-portal.md`) opens today only with `?portal=1`. This slice makes it the default, as A, B and C
became the default on 2026-10-20 (`179c14b`). Branch `feat/portal-on` off `main` at `1b5e62f`. The Lead builds it.

## The probe (14:45, `scratch/portal-on-2026-10-28/probe/`)

The flip alone is one line in `src/App.tsx:75`. With it, `check-reduced-motion` and `check-sky-transform` pass.
`check-viewport-camera` fails four chrome cases, and passes all of them with `?portal=0`:

- phone portrait (390 × 844) and narrow (360 × 800), and the rotation to portrait: the placard overlaps the dock.
- phone landscape small (667 × 375): the dock runs off the left edge, and "Enter the village" with it.

The cause is the portal's fifth pill. On a phone the dock wraps to three rows, and the placard sits at a fixed
`bottom: 128px` that clears two. Over 640 px wide the dock does not wrap, so five pills (about 790 px) do not fit 667.
They are `main`'s faults with `?portal=1`, because the flip changes nothing else. The viewport check never ran with the
portal on.

## Decisions

(a) **The flag.** `const portal = !street && !off('portal')`, with the existing `off` helper. `?portal=0` turns it off,
`?portal=1` still works. Never with `?street=1`, as now. The street's chunk still loads on the first hover or focus,
not on the page's load, so a visit that never goes near the village loads nothing more.

(b) **The bottom stack.** One fixed element, `.visitor-bottom`, holds the placard and then the dock, in a flex column
at the bottom of the viewport. The placard sits above the dock however many rows the dock wraps to, so the three
fixed `bottom` values on `.visitor-reference` (84, 128 and 172 px) go. The stack takes the dock's old place: `right`,
`bottom` and, on a phone, `left`. Its `gap` is 10 px over 640 px wide and 16 px on a phone. These are the clearances
the fixed values gave: 84 = 16 + 58 + 10 on desktop, 128 = 14 + 98 + 16 for two rows, 172 = 14 + 142 + 16 for three.
So with `?portal=0` every layout the viewport check covers is the same to the pixel as `main`. The placard keeps
`left: 16px` on a phone by a 2 px margin, because the stack's `left` is the dock's 14.

(c) **Pointer events.** The stack is `pointer-events: none`, and the placard and the dock are `auto`. The space between
them is the canvas's, for the orbit drag and the sky's touch.

(d) **The desktop dock wraps.** Over 640 px wide the dock is `flex-wrap: wrap` with `justify-content: flex-end`, and
the stack's width bounds it. At 667 × 375 five pills wrap to two rows, right-aligned. On a wide desktop they fit one
row, as now.

(e) **Out of scope**: the tuner (`?tune=1`, Mark's dev tool) keeps its fixed `bottom: 132px` on a phone. With the
portal's pill the dock's third row can reach it. It goes in `tasks/todo.md`, not in this slice.

## The tasks

1. **The flag**, `src/App.tsx` (decision (a)), and its comment. `check-portal.mjs` keeps its explicit `portal=1`, and
   adds one case: on a plain `?arrival=0` the portal is on (`__portal().on` is true), and with `?portal=0` `__portal`
   is undefined.
2. **The bottom stack**, `src/VisitorChrome.tsx` and `src/index.css` (decisions (b) to (d)).
3. **The Tunables entry** for the portal in `CLAUDE.md`: "behind `?portal=1`" becomes "on for every visitor, `?portal=0`
   turns it off".

## The gate

- tsc, lint, `test:sky` and the build pass.
- `check-viewport-camera` passes on the default and on `?portal=0`.
- **The pixel pairs.** `main` and the branch with `?portal=0`, with the chrome shown, at the viewport check's seven
  viewports, with the placard off and on, pinned with `__skyTime` and `__arrivalTime`: every pair byte-identical.
- `check-portal`, `check-reduced-motion` and `check-sky-transform` pass on the branch.
- The look pass: the default with the chrome at phone portrait, 360 × 800, 667 × 375 and desktop, the placard off and
  on, read by the Lead. Then a Vercel preview for Mark.

## Review focus

1. A drag that starts in the stack's empty space, between the placard and the dock, must still orbit the diorama.
2. The arrival hides the dock by `visibility`. The placard is not hidden by it today. Neither must change.
3. In the street the dock's pill reads "Back to the painting". The stack must hold it as it holds "Enter the village".
4. The flat 2D route (any other `mode`, such as `?mode=painting`) shares `VisitorChrome`. Its chrome must not move.
   (`?mode=relief` and `?mode=canopy` draw no chrome. Revision 0 named them, wrongly: Codex.)
5. A phone at 320 px wide: the dock wraps to four rows with the portal's pill. The placard must still clear it.

## Revision 1 (15:35): Codex's plan review and the build's own findings

Codex read revision 0 (`scratch/portal-on-2026-10-28/review-plan-codex.md`, REVISE, three P2 findings and two notes).
The Lead read each against the code. The build, run in parallel, found the same first fault and one more.

- **F1, P2, declined.** At 640 × 360 with `?portal=0` and the placard shown, the four pills fit one row. The placard's
  fixed `bottom: 128px` assumed two, so the stack puts it 44 px lower, 16 px above the dock. The Lead found this in the
  pixel pairs too. It is the one pair that differs from `main`. The placard moves away from the title, which is the
  fault the old 640 × 360 comment names. A press that once fell in the 60 px gap now lands on the placard, because the
  placard is drawn there. Two layouts, one for `?portal=0`, would keep a fixed height that is wrong for any dock but
  two rows. The opposite corners on desktop hold: the placard is `align-self: flex-start` and the desktop pairs match.
- **The build's own find.** With the stack's `left: 16px`, `main`'s four-pill dock (639 px) wrapped at 667 × 375 and
  covered the village. The stack's left is 8 px, and the placard's margin 8 px keeps it at 16. At 667 × 375 the
  portal's five pills still wrap to two rows across the village: Mark's call at the preview.
- **F2, P2, accepted.** The portal check's case 4b clicks "Enter the village", then "Back to the painting", where each
  is drawn, at 390 × 844, 667 × 375 and 320 × 568, after an `elementFromPoint` test and a visibility test. Codex's
  counterexample (the street's dock hidden by `:has`) passes case 4 and fails 4b. The viewport check now tests that
  each control is the element at its centre, and that a press beside the dock lands on the canvas. With the stack's
  `pointer-events: none` removed, that test fails at five viewports. Case 0 waits for `__skyReady` and 1 s, then
  asserts no seam and no pill under `?portal=0`.
- **F3, P2, accepted.** The viewport check adds 320 × 568 and a live resize from 390 × 844 to it. `main` with
  `?portal=1` fails both. The branch passes.
- **The cost of the flag, accepted as a measurement.** The portal casts once per mouse move over the sky and twice
  per finger tap. A mouse swept over the sky at about 60 moves a second, desktop at dpr 1.5: p50 16.7 ms and p95 16.7
  to 16.8 ms, with the portal on and off alike (`movefps.log`).
- **The route list**: Review focus 4 now names the flat route. The pairs run the flat route at 390 × 844 and 1600 × 900: the
  rects of the dock, the placard and every control match `main`. Its pixels differ because the 2D canvas is not pinned.
- **The arrival.** The rule stays on `.visitor-dock`. The placard is off on load and the dock is hidden while the
  opening plays, so no placard can show during it.

No confirmation read: every finding is P2 and each answer is a check that runs at the gate.

## The gate (`c3022ce`, `scratch/portal-on-2026-10-28/gate/`, `tools/gate.sh`)

- tsc, lint and the build pass. `test:sky` runs 401 tests, 401 pass.
- The viewport check passes on the default and on `?portal=0`, with 320 × 568, the resize to it, the hit test and the
  canvas test. `main` with `?portal=1` fails six of its cases (`vp/main-portal1-red.log`). With the stack's
  `pointer-events: none` removed, five fail (`vp/mut-pointer.log`).
- The portal check passes every case, 0 and 4b among them. On `main`, case 0 fails: no portal on a plain visit
  (`portal-red-main.log`). With the street's dock hidden, case 4 passes and 4b fails (`portal-mut-back.log`).
- The sky transform, reduced motion (diorama and street), walk, rotation, grass and cypress-hang checks pass.
- The pixel pairs (`pairs.log`): fifteen of sixteen diorama pairs byte-identical to `main`, the sixteenth the 640 × 360
  placard above. The flat route's rects equal `main`'s at 390 × 844 and 1600 × 900.
- The frame time under a sweeping mouse (`movefps.log`): p50 16.7 ms, p95 16.7 to 16.8 ms, portal on and off alike.

## Look pass 1 (`scratch/portal-on-2026-10-28/look/`)

The default with the chrome at 390 × 844, 360 × 800, 320 × 568, 667 × 375, 844 × 390 and 1600 × 900, the placard off
and on, and the street through the portal at 390 × 844 and 320 × 568. On a phone in portrait the dock is three rows,
"Enter the village" and the sky's pill on the first, and the placard sits 16 px above it, clear of the title. In the
street "Back to the painting" takes the same place. On desktop and at 844 × 390 the five pills fit one row. At 320 × 568
the dock is four rows, and the placard, shown only on the visitor's tap, rises over the village. At 667 × 375 the dock
is two rows across the village: Mark's call (the pickup in `tasks/todo.md`).

The Lead's gate passes the slice. The branch is pushed for a Vercel preview. No PR until Mark has looked.
