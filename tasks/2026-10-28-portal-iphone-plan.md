# The portal crashes the iPhone: unmount the diorama in the street (plan, revision 0)

2026-10-28, 19:05 Brisbane. Branch `feat/portal-on`, base `e71829b`. The Lead builds it (a small fix). Codex reads it
for correctness. Mark tests the preview on his iPhone, the only device that shows the crash.

## The defect

Mark's iPhone killed the page ("A problem repeatedly occurred") on entering the street through the portal, and again on
the reload. `?street=1` alone loads on the same phone. Through the portal the diorama stays mounted, hidden, while the
street builds and shows (`src/scene/DioramaExperience.tsx:544-548`, `portal.ts:47` `dioramaVisible`).

## The measurement that chose the fix

Headless Chrome as a 390 × 844 touch phone at dpr 3, `scratch/portal-iphone-2026-10-28/tools/phone-mem.mjs` (the
wander repro's `phone-enter.mjs` plus texture bytes net of `deleteTexture`). The raw logs are in
`scratch/portal-iphone-2026-10-28/mem/` (`base.log`, `unmount.log`, `direct.log`), the probe's one-line change in
`probe-DioramaExperience.tsx`. After the entry, settled:

| | WebGL buffers | WebGL textures | JS heap (used) |
| --- | --- | --- | --- |
| The portal as it stands (diorama kept) | 137 MB | 37 MB | 274 MB |
| A probe: the diorama unmounted while the street is mounted | 102 MB | 32 MB | 149 MB |
| `?street=1` loaded directly (safe on the phone) | 81 MB | 26 MB | 227 MB (at ready) |

The unmount frees 35 MB of buffers and 125 MB of live heap. It brings the street through the portal near the direct
load. Chrome does not model the iPhone's limit, so only Mark's phone can confirm the fix. If it still crashes there,
the fallback is option (b): enter by a page load to `?street=1`.

## The change

1. `DioramaExperience.tsx` `Scene`: mount the diorama only while the street is not mounted (`!showStreet`). The
   diorama unmounts in the same commit that mounts the street, at `entering`, after the flight's last frame is in the
   layer. It mounts again at `leaving`, under the layer that holds the street's last frame. The `<group visible>`
   wrapper goes. `portal.ts`: `dioramaVisible` becomes `dioramaMounted`, the same predicate.
2. The diorama's ready refs are passed on every mount, not only with the arrival (`cypressReady`, `landReady`).
   `BrushCypress.tsx:294-296` and `BrushIsland.tsx:130-132` reset their ref to false in the effect's cleanup, so a
   ref never reads true for a mount that has not built.
3. `PortalDriver`, `leaving`: hold the layer until the cypress and the land report ready and `PORTAL.settleFrames`
   frames have drawn, or `ARRIVAL.readyTimeout` (15 s) passes. Then fade it over `PORTAL.fadeOut` from that moment and
   send `left`. Under reduced motion the fade stays a cut. The sky stays mounted throughout, as today.
4. `scripts/portal.test.ts`: the mount test names `dioramaMounted`.

## The checks

tsc, lint, `test:sky`, `scripts/check-portal.mjs` (case 3b reads the return's fade, case 11 the renderer's geometries
and textures over three round trips), and `phone-mem.mjs` again on the built branch. One look at the way back on the
phone viewport. Then push for the preview, and Mark enters the street on his iPhone.

## Out of the fix

The 2D canvases (139 MB counted, never decremented by the probe) are mostly the painting decoded at 1600 × 1267 by
each part. Sharing one decode is a later cut if the phone still fails.
