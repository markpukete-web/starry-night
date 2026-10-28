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
4. The other routes (`?mode=relief` and `?mode=canopy`) share `VisitorChrome`. Their chrome must not move.
5. A phone at 320 px wide: the dock wraps to four rows with the portal's pill. The placard must still clear it.
