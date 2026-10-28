# The street on phones: cut its memory — the plan

Mark, 2026-10-28 22:00: "go with the phone memory slice". The goal: Mark's iPhone holds the village street, entered
through the portal's "Enter anyway". The evidence is in `scratch/phone-memory-2026-10-28/` (git-ignored): the probe
`tools/phone-mem2.mjs`, the snapshot readers `tools/snap-*.py`, and the logs in `base/` and `spike/`.

## What the production build holds (measured 2026-10-28)

Headless Chrome as a 390 × 844 touch phone at dpr 3, against `vite build` and `vite preview` of `main` (`c1c6fbc`).
"Buffers" are the main thread's ArrayBuffer stores after a forced GC (`Runtime.getHeapUsage().backingStorageSize`),
"heap" its V8 heap used after GC. Chrome cannot model the iPhone's limit, so these are relative numbers only.

| The street, entered | Heap | Buffers | Renderer RSS after GC | Renderer peak (±70 MB run to run) |
|---|---|---|---|---|
| Through the portal, moving sky (the default) | 72 MB | 217 MB | 636 MB | 751–825 MB |
| Through the portal, `?sky=light` | 74 MB | 155 MB | 551 MB | 617 MB |
| Direct `?street=1` | 72 MB | 137 MB | 656 MB | 731 MB |
| Direct `?street=1&sky=light` | 71 MB | 96 MB | 474 MB | 600 MB |

The moving sky's worker peaks at 170–310 MB while it builds, at the painting's load. Through the portal it has ended
before the entry.

Two corrections to the notes (`tasks/todo.md`, `tasks/2026-10-28-portal-iphone.md`). "The street decodes the painting
about eight times" came from the dev server, where StrictMode runs each load twice, and from the probe's 2D-canvas
count, which adds every canvas and never subtracts. In production the street holds three painting-sized decodes: the
sky's `painting-filled.webp`, the street's `painting.jpg`, and the street cypress's own `painting.jpg`.

## What holds it

Heap snapshots of the street, read by owner (`tools/snap-owners.py`, `tools/snap-subs.py`):

1. **R3F's initial state keeps the unmounted diorama (53–56 MB, portal path only).** R3F 9.6 builds its store with
   zustand 5, which keeps the initial state for `getInitialState()`. R3F's `Provider` replaces `internal` with a spread
   copy once the canvas mounts. Subscribing pushes into the array both copies share. The first unsubscribe replaces the
   live copy's array with `filter`, so the initial copy keeps the old array for the page's life. The first unsubscribe
   comes at the entry, when the diorama unmounts. The initial copy then holds the diorama's 11 `useFrame` callbacks,
   and each callback's closure holds its component's last render: the cypress's and the land's two painting decodes,
   their flow fields and their stroke geometry. `interaction` and `initialHits` are filtered the same way.
2. **The street's build output as plain arrays (54 MB).** `buildStreet` returns `number[]` arrays (`arrays.positions`,
   `colors`, `indices`, `stroke`, `seed`, `cls`, `src`). `Street.tsx`'s `meshes` memo copies them into typed geometry,
   and the `build` memo keeps the originals for the street's life. A plain array costs 8 bytes a number against
   `Float32Array`'s 4. After `meshes`, the street reads only `build.windows`, `build.report.lane.lamps` and `build.counts`.
3. **Decoded images (47 MB with `?sky=light`).** The sky's seven sources (27 MB), held in `useImageData` state for the
   page's life. The street's `painting.jpg` (8.1 MB) and the street cypress's second decode of the same file (8.1 MB),
   its flow field (2.9 MB), the land flow (1.2 MB).
4. **The geometry's CPU copies (46 MB with `?sky=light`, more with the moving sky).** three.js keeps every attribute's
   array after the upload.

## The cuts, in stages; Mark's phone decides whether the next stage is needed

**Stage 1, built (`ef2e5ec`, `989840c`): release R3F's initial internal.** `ReleaseInitialInternal` in
`DioramaExperience.tsx`, inside the canvas: a passive effect, so it runs after the `Provider`'s layout effect has made
the copy. If the initial `internal` is not the live one, it sets the initial one's `subscribers`, `interaction` and
`initialHits` to empty arrays. R3F reads `internal` only through `get()` and `getState()`. Measured: the buffers in the
street through the portal fall from 217 to 161 MB (moving sky) and from 155 to 99 MB (painted light, now the direct
load's 96). The snapshot's initial copy holds 0 callbacks (was 11). Check: `check-portal.mjs` case 2 reads
`__r3fInitialSubscribers()` in the street and requires 0.

**Stage 2: the street's build and the cypress's second decode (about −62 MB).**
- `Street.tsx`: one memo makes the build and its meshes together, and returns only the meshes, `windows`, the lamps
  report and the counts. The plain arrays go out of scope when the memo returns. No change to what is drawn.
- `BrushCypress.tsx`: an optional `painting` prop. When given, the tree uses it and loads no painting of its own.
  `useImageData` accepts a null URL and then loads nothing. The street passes its `paintingData`. The diorama's cypress
  is unchanged.
- The street's eight build meshes keep no vertex normals and no `aClass` outside the ID views (Codex P3, below):
  `strokeGeometry` and `plainGeometry` take `normals` (true by default, so the diorama is unchanged), and the street
  passes a class only with `ids`. Its basic materials read no vertex normal, and only `idInjection` reads `aClass`.
- Checks: tsc, lint, `test:sky`, `check-portal.mjs`, `check-street-walk.mjs`. The ID views' frames at stop 0 with
  `ids=1` and `ids=2`, byte-identical too. The street's frames at stops 0 to 4 on
  the desktop and the phone, byte-identical to `main`'s. The probe again through the portal: the heap and buffers
  after GC, and a snapshot showing no `arrays` owner and one `painting.jpg` decode.

**Stage 3, only if the phone still fails: the sky's images, the CPU copies, the build's peak.**
- The sky's seven images (27 MB) can go once both of its geometries exist. The worker effect depends on `images` and
  its cleanup disposes the moving geometry. A plain release would run that cleanup: the sky would not blank, because
  three.js uploads a disposed geometry again from its CPU arrays on the next draw, but the moving sky's 25,600 ribbons
  would upload twice and stall a frame. The light geometry's memo would also return null without the images. It needs
  its own plan.
- The CPU copies (about 46 MB and the moving sky's) can be freed after upload only on geometry nothing reads back.
  That needs an audit of the readers first: the portal's pick, the land touch, Vincent's tap target, the grass trail,
  bounding volumes.
- The street build's transient heap peak (122–147 MB used) would fall if the builders wrote typed arrays directly.

## How done is judged

Mark enters the village through "Enter anyway" on his iPhone, more than once, with his usual tabs open. One entry is
not a rate (`tasks/2026-10-28-portal-iphone.md`). Chrome's numbers rank the cuts. They cannot say what the iPhone holds.

## Out of the slice

- The window seams (`__vincentBox`, `__streetCamera`, `__portalLeave`, `__skyTransform`) hold closures, and with them
  their components' scopes. In the street they hold only live data. After the way back, `__vincentBox` may still hold
  the street's painting. Measure that on the way back before cutting it.
- Lowering the street's triangle budget on phones changes the look, so it is Mark's call. It is not proposed.

## Codex's plan read (the pane, `scratch/phone-memory-2026-10-28/plan-review-codex.md`)

- **P2, fixed: the probe could report a saving without entering the street.** `phone-mem2.mjs` now throws unless the
  entry ends at `street` with the layer at 0, or the direct load reports `__streetReady`, and it voids a run with an
  uncaught exception or a failed load. Every number above came from runs whose logs show `flying > entering > street`
  or `ready: true`, so they stand.
- **P3, taken into stage 2: 8 MB of attributes the street never reads.** Vertex normals (6.0 MB) and `aClass`
  (2.0 MB) on the eight build meshes. Checked: no street shader reads `normal`, and only `idInjection` reads `aClass`.
  The frames at the five stations and in the ID views are the guard: a read the grep missed would change them.
- Stage 3's "would blank the moving sky" was wrong, and the plan was corrected before this read: a disposed geometry
  uploads again on the next draw.
