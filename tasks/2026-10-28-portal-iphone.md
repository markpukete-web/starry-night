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

## Mark's phone, before the portal test (19:27)

At about 19:24, V1's hat preview (`da4a86c`) opened, ran for about 3 s, then Chrome on his iPhone showed "Can't open
this page". With every other tab closed, the older preview `7850cc7` at `?street=1` failed the same way. That one
opened on the same phone at about 18:20. The two builds differ only in the hat's source rectangle. So the street on its
own is at or past the iPhone's limit, depending on the phone's state. The portal fix brings the entry close to the
direct load, so it cannot make the phone hold the street. Mark: "I think we need to let users know the site works
better in computer".

## The village on computers (19:39, `8531440`)

Mark chose it at about 19:30: "Village on computers". A device with no hover and a coarse pointer (the walk's own
test, `StreetWalk.tsx:78`) keeps the painting. A tap on "Enter the village" or on a house shows "The village walk opens
on a computer for now." above the dock for 5 s (`VILLAGE_NOTE_MS`), in a `role="status"` line that is always in the
page. `?phoneVillage=1` opens the village there, for tests on the phone. The gate is in the portal's `enter`
(`DioramaExperience.tsx`), where the pill, the house tap and the check's seam all route, and the rule is
`villageOnDevice` in `streetEntry.ts`. `?street=1` is not gated: it is the previews' and the checks' link.

- `check-portal.mjs` all pass (`gate/portal-note.log`). Case 13: a touch phone keeps the painting with the note, and
  `?phoneVillage=1` enters (flying, entering, street).
- Mutation 4, the gate removed: case 13 red ("the pill on a phone went to flying with the note \"\""), the tree clean
  after (`gate/mutations/m4-no-phone-gate.log`).
- tsc, lint and `test:sky` (402, one new: `villageOnDevice`) pass.
- The look (`mem/note-sheet.png`, 390 × 844 at dpr 3, touch): the note above the dock in the dock's ink on the
  placard's panel, gone after 5 s.
- Not covered: an iPad with a trackpad reads as hovering, so it enters the village. Its limit is unmeasured.

Mark then asked whether a loading card could let a phone read the village. It cannot alone: the phone runs out of
memory and iOS closes the page, card and all. The way to phones is a lighter street, measured on his phone. One cut is
in the measurements: the street decodes the painting about eight times at 1600 × 1267, 8 MB each. Proposed as the
next slice in `tasks/todo.md`.

## Phones enter, told first (20:02, `1169994`, replacing `8531440`)

Mark, on the note: "I want phone user still be able to enter the village but there should be warning or a message
telling the user that computer would have a better experience or tell the user computer would be recommended for
entering the village scene". So a phone or a tablet now asks before its first entry. The card above the dock reads "A
computer is recommended for the village scene. On a phone it may load slowly or not open." It has "Enter anyway"
(focused) and "Stay with the painting". Once a phone has entered, the visit's later entries go straight in. The card
is a `role="alertdialog"`. The note, its 5 s timer, `villageOnDevice` and `?phoneVillage=1` are gone.

- `check-portal.mjs` all pass (`gate/portal-ask.log`). Case 13: the card on the first tap with the place still the
  diorama, "Stay with the painting" closes it, "Enter anyway" enters (flying, entering, street), the second entry goes
  straight in.
- Mutation 5, the ask removed: case 13 red, the tree clean after (`gate/mutations/m5-no-ask.log`).
- tsc, lint and `test:sky` (401) pass.
- The look (`mem/ask-crop.png`, 390 × 844 at dpr 3, touch): the card above the dock, the text on two lines, the two
  answers as the dock's pills.
- A phone that enters may still lose the page: the street alone failed on Mark's iPhone. The card says so.
