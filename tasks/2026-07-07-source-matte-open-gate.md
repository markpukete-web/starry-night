# 2026-07-07 Source-Matte Diorama Checkpoint — Gate Open

Status: **open gate, not passed by Mark**.

This checkpoint fixes the specific back-of-cypress void mechanism without closing the 3D diorama taste gate. Treat it
as an architectural correction and pickup point, not a finished visual direction.

## What changed

- Added `src/scene/dioramaSkyProjection.ts` so the diorama sky and foreground matte share one source-UV projection.
- Added `src/scene/DioramaForegroundMatte.tsx`, a Claude-style source-locked matte that keeps the original painting's
  cypress/foreground pixels registered to the sky instead of asking a separate 3D tree to hide the source hole.
- Updated `src/scene/PaintingFlowSky3D.tsx` to render that matte inside the camera-locked source-ribbon sky stack.
- Updated `src/scene/Diorama.tsx` to remove the rejected giant cypress fin backing volume from final mode and reduce
  the 3D cypress to a smaller inner volume/accent.

## Why

The failed architecture was:

```text
source-projected sky with a cypress-shaped hole
plus
independent 3D black cypress
```

When the camera moved, those two systems drifted apart and exposed the blue void/card edge. Claude's better historical
solutions did not solve this by enlarging the 3D tree; they kept foreground/cypress pixels source-locked, or abandoned
source projection entirely for a native 360 dome. The native dome route is already rejected for losing the source-ribbon
soul, so this checkpoint keeps the source-space ribbons and moves the cypress mask ownership back to the painting.

## Evidence

Latest accepted-by-Codex visual-gate captures:

- `output/playwright/diorama-source-matte-v3-2026-07-07/desktop-centre.png`
- `output/playwright/diorama-source-matte-v3-2026-07-07/desktop-drag-left-boundary.png`
- `output/playwright/diorama-source-matte-v3-2026-07-07/desktop-drag-right-boundary.png`
- `output/playwright/diorama-source-matte-v3-2026-07-07/desktop-orbit-preset.png`
- `output/playwright/diorama-source-matte-v3-2026-07-07/mobile-centre.png`
- `output/playwright/diorama-source-matte-v3-2026-07-07/capture-summary.json`

Verification run before commit:

```bash
npm run lint
npm run test:sky
npm run build
npm run capture:diorama -- output/playwright/diorama-source-matte-v3-2026-07-07
```

Observed result: lint passed; `test:sky` passed 34/34; build passed with the existing Vite large-chunk warning; capture
produced 8 images with no browser errors.

## Open Problems

- Mark has not passed this visual gate. Keep the gate open.
- The source cypress strip now owns the void, but it can still read as a flat painted wall beside a 3D object.
- The 3D cypress is less dominant than the rejected giant prop, but still needs real Van Gogh flame modelling.
- Village, hills, foreground hierarchy, and object styling remain behind the sky/cypress architecture.
- Full 360 remains out of scope. Continue as front-arc/180-style until the source-registered foreground and physical
  object staging pass taste.

## Pickup Next Session

Run:

```bash
npm run dev -- --host 127.0.0.1
```

Open:

- `http://127.0.0.1:5173/?mode=diorama&clean=1`
- `http://127.0.0.1:5173/?mode=diorama&debug=flow&clean=1`
- `http://127.0.0.1:5173/?mode=diorama&debug=nopost&clean=1`

Next step: review the source-matte checkpoint live, then either tune the matte/3D-cypress relationship or rebuild the
cypress as a proper source-registered foreground system with restrained 3D fins. Do not return to native-dome
replacement or black-tree cover-up.
