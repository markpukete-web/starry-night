# The portal crashes the iPhone: the record

The plan is `tasks/2026-10-28-portal-iphone-plan.md`, revision 0. The evidence is in `scratch/portal-iphone-2026-10-28/`.
The Lead built it in `fix/portal-unmount` (`77afc17`) and moved it onto `feat/portal-on` (`35bf02e`). Mark asked the
Lead to take the lead at 18:43.

## The fix

The diorama unmounts in the commit that mounts the street, at `entering`, after the flight's last frame is in the
layer (`DioramaExperience.tsx`, `dioramaMounted` in `portal.ts`). On the way back it mounts again under the layer. The
layer holds the street's last frame until the cypress and the land report ready and `PORTAL.settleFrames` frames have
drawn, or `ARRIVAL.readyTimeout` (15 s) passes. Then it fades over 0.8 s from that frame. Both ready seams clear on
unmount (`BrushCypress.tsx`, `BrushIsland.tsx`), so no frame reads the last mount's. `__portal()` reports `diorama`,
the two seams together.

## The checks

- Memory, headless Chrome as a 390 × 844 touch phone at dpr 3 (`mem/fix.log`), settled after the entry: WebGL buffers
  102 MB (137 with the diorama kept), JS heap 155 MB (274). Back in the diorama: buffers 99 MB, 21 geometries and
  8 textures, as before the entry. The JS heap's peak during the entry is 330 MB (281 with the diorama kept): the
  diorama's garbage is not yet collected while the street builds. Whether the iPhone survives that is the open
  question. Only Mark's phone can answer it.
- `check-portal.mjs` all pass on the fix (`gate/portal-green.log`). Case 2 now asserts the diorama's seams are clear in
  the street. Case 3 asserts no fading frame of the way back has the diorama unbuilt: 16 held and 94 fade frames.
  Case 11: three round trips leave 23 geometries and 8 textures each time.
- Three mutations, each red on its check, the tree clean after (`gate/mutations/`): the diorama kept mounted (case 2,
  100 of 100 street frames), no hold (case 3, 3 frames faded unbuilt), no seam clearing (case 2).
- tsc, lint and `test:sky` (401) pass on `feat/portal-on` at `35bf02e`.
- The way back on the phone (`mem/fix-sheet.png`): the street's frame held, then the fade onto the built island,
  cypress and village.

## Codex's plan read (`plan-review-codex.md`): BUILD, one P2

P2: the planned checks could pass an immediate fade over an unbuilt diorama. Answered by case 3's new assertion, and
mutation 2 shows it is red without the hold on a warm cache. Not done: a delayed asset to force a slow remount, and
the hold's 15 s timeout path. The timeout is one condition, the same as the entry's.

## Next

Mark enters the street through the portal on his iPhone. If it still crashes, the fallback is option (b): enter by a
page load to `?street=1`. A further cut, if needed: the painting is decoded at 1600 × 1267 by each part (the 2D
canvases count 139 MB, never decremented by the probe).
