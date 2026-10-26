# The village's craft: design, 2026-10-25

Status: draft for Mark. Nothing is built. Each decision is marked **Mark** (his words) or **Lead** (my call, open to
him). The Consultant's builder check (`scratch/village-craft-2026-10-25/builder-check-consultant.md`, eleven questions,
seven of them claims the code contradicted) is folded in: each answer is a Lead's call below.

## Why

Mark on the street's first slice: "flat and dull", then "the house feels like a cardboard". After S1b: "Simon's path
and village comes with a cartoon feel and a bit more realistic than us". The village study
(`tasks/2026-10-11-simon-lee-study.md`, 2026-10-23) names what gives Simon's village its solid read. Houses are simple
volumes with modelled detail: door frames, shutters, steps, eaves, fences, and small lights along the paths. Their
surfaces read as solid paint. Slices 2 to 4 (Vincent, the walk, the grass, the church, the portal, the frogs) did not
change how a house is made. So they did not close that gap.

**Mark**, 2026-10-25: the craft slice is next on the roadmap ("go with your recommendation"), then "start the design".

## What the visitor should feel

On the lane, each house reads as a solid building painted in Vincent's strokes. It has a door you could step up to,
shutters, and a roof with thickness. A low stone wall runs along the lane, and lamps lead the eye to the square. From
stop 0 the village still reads as the painting's village.

## Goals

1. Walls read as solid paint. Roofs too, if the crops show the same fault there.
2. Each house gets modelled detail: a door set into the wall with a frame and a step, shutters on its front windows,
   and eaves with depth.
3. The lane gets furniture: low dry-stone walls, one wooden rail round a cottage garden, and lamps.

## Non-goals

- Layout changes: the houses' places, the lane, the stops.
- New house types, interiors, doors that open.
- Real-time lights or shadows. A lamp is painted light, as a lit window is.
- The church. It passed in its own slice and keeps its door. The diorama's village is unchanged.
- New motion. The street's lit windows are steady (only the diorama's village glimmers, `villageGlow.ts`), so the
  lamps are steady too.

## Anti-goals (a failure even if every check passes)

- **Planks.** Walls of long vertical stripes with dark gaps (S1b's near walls). Or a dark wall with a few light streaks
  (the walls turned from the moon at stop 2, `scratch/street-frogs-2026-10-25/t3/p3/s2-desktop.png`).
- **A generic texture.** Simon's one paint texture on every surface. The bar forbids it.
- **A toy town.** Bright saturated shutters, white pickets, or a lamp every few steps like a runway.
- **Clutter.** Detail so dense that a house loses its simple volume, or ink on every small part so the street reads as
  a comic.
- **The far read broken.** From stop 0 the village must still read as the painting's.
- **A slower frame or a triangle over the ceiling.**

## Constraints

- **The bar** (`CLAUDE.md`, locked). An invented part continues the derived style. Every new surface is painted from a
  source rectangle of the scan, or takes a flat colour from `palette.json` under the street's ink. No new texture.
- **Stroke scale (C3 of the street's design).** A stroke's width and length are fractions of its object, measured from
  the scan at 1:1 (S1 Task 1, `SOURCE_STROKES` in `src/scene/streetStrokes.ts`). This slice may move a value inside its
  measured range. A value outside that range needs a new 1:1 measurement of the scan's village first. The measurement
  goes in the slice's record before the value is used.
- **The palette gate (C5).** **Lead:** the new parts ride the gate's existing ID classes, since all ten are taken
  (`streetMaterial.ts:37-48`, `check-street-colour.ts:279-290`). Door frames, shutters, stone walls, the rail and the
  posts ride the walls' class. A lamp's core rides the lit windows' class, measured against the `windowLit` source as
  the lit windows are. The gate reports how far the new parts move the walls' mean.
- **Parts the scan does not show.** Flat parts under the ink (shutter leaves, louvres, the rail, the posts, the frame
  band) take no stroke scale: they are flat colours, and the ink keeps its measured `OUTLINE_FRACTION`. The stone
  walls' dabs are strokes. They use an existing source's measured row, with the wall's own height as the reference.
- **The triangle ceiling,** 1,444,930 at every pose. The constraint is the browser's count, not the unit test's
  budget. The walk's tightest point (desktop, `t` 0.295) has 431 to spare (`scratch/street-frogs-2026-10-25/t4/tri-sweep.log`).
  The street is one mesh per layer (`Street.tsx:182-190`), and a layer draws whole once any of it is in view. So the
  accounting is global: the craft's triangles may not exceed the triangles saved plus 431, read at that point.
- **Frame rate** (locked): 60 fps desktop, 30 fps mid-tier phone, the devicePixelRatio caps in Tunables.
- **Reduced motion** (locked): the lamps hold steady, as the lit windows do.
- **The build.** The street builds under the last frame of the portal's flight. The craft must not lengthen the build
  enough to show. The build's time is measured before and after.

## The budget, and who pays

The street's build is 603,641 triangles. That count is from node at `feat/street-frogs` `8699a4b`, with the real scan
and the grass on. The split:

| Part | Triangles |
| --- | --- |
| Wall strokes | 183,404 |
| Ground strokes (outside the grass) | 119,901 |
| Tree strokes | 100,152 |
| Roof strokes | 74,916 |
| Path strokes | 49,512 |
| Door and window strokes | 43,272 |
| Outlines | 22,680 |
| Tree solids, bases, windows | 9,804 |

A ribbon costs about 100 triangles. My rough estimate for the craft is 15,000 triangles. The build's own count
replaces that estimate in the plan.

**Lead:** the walls' strokes pay. Solid paint means a base that carries the colour, with fewer strokes on it. Each 0.1
of the houses' cover (3.5 today) is worth a little under 5,000 triangles, since the church keeps its own (below). If a
lower cover over a stronger base reads as solid, one change meets both goals. If it does not, the next payers are, in
order, the far ground at half density and the trees' strokes. Any street triangle can pay, since the count is global.

## What each part is

### Solid paint

**Lead:** judged at 1:1 against two references. The first is the scan's village at 1:1: flat pale walls broken by a
few short strokes. The second is Simon's frame from the study (`scratch/simon-village-2026-10-23/v100.jpg`, study only,
gitignored, never shipped). A wall must stop reading as planks or as a dark wall with streaks. The knobs, in the order
to try them:

1. The base, today the source's mean, raised toward the strokes' lit mean.
2. The walls' cover.
3. The dry brush and the gaps of the stroke body on walls only. The land keeps E4's body unchanged.
4. The stroke width, inside each source's measured range (`wallA` and `wallB` 0.12–0.2 of the eave, `plaster`
   0.1–0.15). No re-measurement in K1.
5. The street's ambient light (0.4), only if the walls turned from the moon still read near-black after 1 to 4. That
   one is open from S1b's gate, so a change goes to Mark.

The look passes find the values. The cap is four passes.

**Lead:** the church keeps its paint. It passed in its own slice, and its walls are `kind: 'wall'` faces that knobs 1
to 4 would reach, so the build gives it an owner-level exemption in `clad`. K1's gate shows it beside the new houses.
If it then reads out of place, Mark decides whether it follows.

### Doors

**Lead:** every house's front door gets the church's treatment (`recessedDoor` and `cladRound` in
`src/scene/streetGeometry.ts`). The door is set 0.02 into the wall. Its jambs and lintel are in the recess's shadow, and
a step sits at its foot. A house's door takes the opening's ink (`FRAME`), not the church's wall-height ink, which is
wider than a house's door can carry. A frame band runs round the opening on the wall's face, from the hole's edge out
to 0.3 of the door's width, so about two thirds of it shows beyond the ink. It is painted in the `plaster` source's
paint on a dark wall, and the wall's own paint darkened on a pale wall.

The four cottages (L2, L5, R1, R5) get the step and the frame, but no recess. Their door under the thatch stays as it is
(S1b's C2, open since S1b). A recess under a thatch eave needs the thatch cut over the door, which is its own job.

### Shutters

**Lead:** two open leaves beside each front window of every house and cottage. Each leaf is a flat panel the window's
height and half its width. It sits above the stroke stack and the window's pane (0.0055 off the face), and its ink and
louvres sit above the leaf. The plan sets the levels. It is painted a muted blue-green from the `village` region, with
one ink outline and three thin dark strokes across it for the louvres. A lit window keeps its shutters open, so the
light shows.

### Eaves

**Lead:** a house's eaves overhang 0.03 (today 0.015). The rakes over the gables keep 0.015. Under each eave, the roof's
underside runs from the wall's top to the eave's edge, in the colour of the roof's edge band. A cottage's thatch already
has its own thickness and overhang, so it does not change.

### Low dry-stone walls

**Lead:** three to five stretches along the lane's verges, where no house fronts the lane. Each stretch is 0.3–0.8
long, 0.05–0.06 high and 0.03 thick. For scale, a door is about 0.11 high. A wall's inner face stands at lateral 0.09 or
more from the lane's centre, in the short grass inside 0.152, where blades reach about 0.035 (past it they reach 0.07
and would bury the wall). It stays 0.03 or more clear of Vincent's walk line (lateral 0.03, out to 0.07 by stop 4). The Lead places them by hand from captures,
as identity objects (the rule: authored assets for identity, procedural for fill).

Each face is clad in short broad dabs, one per stone, over a darker base. Here the gaps are wanted: they read as the
joints. The paint comes from a source picked from rendered candidates, as the thatch's was (S1b Task 2). The candidates
are the existing sources `wallA`, `wallB` and `plaster`, so no new measurement is needed. The grass is cleared under
each wall with the houses' margin (0.012).

### The wooden rail

**Lead:** one rail, round the garden of the cottage best seen from a stop, chosen from captures. Posts stand every
0.12, with two rails between them, 0.05 high. Each part is a flat colour from the thatch source's mean, under the ink.

### Lamps

**Lead:** about seven lanterns on short wooden posts at the lane's edge. They alternate sides, spaced so that one is
always ahead in view on the walk. A post keeps the stone walls' lateral rule: 0.03 or more clear of Vincent's line. The last one stands at the square's edge by the church. A post is a dark ink stroke
about 1.2 doors high. The lantern is a small box with a warm core in the `windowLit` source's paint. Each lamp takes
the lit windows' halo and ground pool sizes (`LIFE.halo` and `LIFE.pool` in `src/scene/streetLife.ts`), so lamps and
windows read as one kind of light. A window's halo is a plane turned to its wall's normal. A post has no wall, so a
lamp's halo is a billboard that faces the camera, and its pool is centred on the post's foot. Lamps get their own list
and meshes, not the windows' path. They are steady, as the windows are.

The alternative was lanterns on house walls by the doors. That leaves the lane dark between houses, so the lamps
would not lead the walk.

## Slicing

**Lead:** two slices. As with every street slice so far, each has its own cap of four look passes and Mark's live
gate.

1. **K1, the houses:** solid paint, doors, shutters, eaves. It goes first because it creates the budget for both
   slices and it answers "cardboard".
2. **K2, the lane:** the stone walls, the rail, the lamps.

The branch is `feat/village-craft`, on top of the stack (`fix/finger-no-bend` today).

## What each gate shows

- 1:1 crops at stops 0 to 4, desktop and phone, beside the scan's village and Simon's frame.
- The far read: stop 0 beside the painting's village crop.
- The browser's triangle sweep, both viewports: every 0.01 from `t` 0.25 to 0.40, 0.295, and every 0.05 elsewhere.
  Every point under 1,444,930.
- The frame time at stops 0 and 3, the branch beside its base.
- The palette gate (`scripts/check-street-colour.ts`).
- The build's time, before and after.

## Left to the builder

The exact places of the walls, the rail and the lamps, picked from captures. The sizes inside the ranges above. The
order of the knob trials inside a pass. The test seams.

## Open for Mark at the gates, not now

- Lamps on posts, or on the house walls.
- The church's paint, if it reads out of place beside the new houses.
- The shutters' colour.
- The ambient light, if solid paint needs it.
