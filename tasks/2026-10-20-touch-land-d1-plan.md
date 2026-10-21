# D1 — touch the land: plan, 2026-10-20

Slice D1 of "inside the painting" (`tasks/todo.md`, "Proposed to Mark — D"; Mark: "go for your recommendation").
The cypress's flame ribbons and the village's foliage bend away from the pointer or the finger and spring back:
Van Gogh's strokes as the grass in Jeroen van Welsenes' clip (`~/Downloads/videos/grass/`), in the painting's own
material. Built on the Mac on `feat/touch-land` from `docs/after-pr-14` (= `main` `e6567e3` plus the record).

D1 rides B's flag: `touch` is on for every visitor since PR #14, `?touch=0` turns B and D1 off together. It has its
own knob `bend` (0–1.5, shipped 1) in the tuner, so it can be dialled to zero without touching B. With `?touch=0`
every route is byte-identical to `main`: no injection, no attribute. With touch on and no input, the cypress and
the foliage draw through a new program (the bend injection, the `aBend` attribute) whose displacement adds exactly
zero, as B's sky shader does with `TOUCH` defined: B's gate (2026-10-16, row 7) recorded that such a program
differs from the old one on Metal at a few pixels by one grey level, invisible at 1:1. That is the bar for G4,
and it is said to Mark: the default route's bytes change, its look does not.

**One choice is Mark's, not the plan's (`landMasksSky`, D1.4):** a hover or a tap on the tree or the foliage
moves them and, with the constant true, no longer surges the sky behind them. B's record lists that surge as
"acceptable for a first pass, or masked later". The Lead recommends true (a hand on the tree moves the tree); the
constant flips it either way without touching the hook.

Mapping (`herdr agent list`, 2026-10-20): Lead `w4:p1` (Claude), Reviewer `w4:p4` (Codex). No worker (the gate's
captures are a handful of runs, as for C).

## What is there today

- **The cypress** (`BrushCypress.tsx`) is two meshes in a group at `BASE` (−1.5, 0.02, 0.72): the solid underpaint
  (lobe volumes, 12 radial × 96 sections, `HEIGHT` 2.7) and the strokes (48 structural ribbons front, 18% behind,
  43 samples each, two vertices per sample, `pushBrushRibbon`), both `MeshBasicMaterial`. With `alive` each carries
  `aFlicker = [w, h]`, `h` the tree's height axis (0 base, 1 tip: `1 − sourceV` on the solid, `heightFraction` on
  a stroke), and the flicker injection through `injectAlive` (`aliveMaterial.ts`): a vertex head and a body after
  `<color_vertex>`, a fragment head and a body after `<color_fragment>`. The frame loop writes `uTime` from the one
  sky clock; the knob writes `uFlicker` in a layout effect.
- **The village** (`Village.tsx`, `villageGeometry.ts`) is four meshes at the origin: solid, skin, paint (the
  glimmer's `aGlow` with `alive`) and foliage. The foliage is four rows of textured boxes (`foliageRow`): per
  station a front face `bf → tf`, a top strip, a back face, a bottom, and two end caps, every face four vertices
  through `face()` → `polygon()`. The rows are 0.13–0.25 tall. Named meshes: `village-foliage` and the others.
- **B's input** (`useTouchInput.ts`): manual listeners on the element R3F connects events to (`pointermove`,
  `pointerdown`) and on `window` (`pointerup`, `pointercancel`); a hover or a drag trails gentle surges, a tap (≤
  300 ms, ≤ 8 px) sends a strong one with a kick and may flare a star. The pointer is mapped to the sky dome by
  `skyPointFromRay`, never by raycasting a mesh. Known and accepted on B: a tap over the cypress or the village
  surges the sky behind it. The dev seams `__touchState`, `__touchInject`, `__camera`.
- **B's store** (`touchSurge.ts`): entries with an explicit `t0` on the sky clock, pure push and prune functions,
  finite support on every falloff (`support` 3 sigmas) so the untouched sky is byte-identical, a window that
  closes every term to exactly zero before it is pruned. The shader takes the lists as uniform arrays.
- **The knobs**: `AliveTuning` has seven (`skyAlive.ts`), each with a default, a ceiling, a `sky-tuning.json` key
  and a tuner slider (`AliveTuner.tsx`, `STEP`, labels); `App.tsx` reads the shipped values.
- **The clock**: the cypress and the village read `clock.current`, the sky's frame loop's value: pinned
  (`window.__skyTime`), advanced, or 0 while paused. A pin reaches the foreground one frame late (A3).
- **The capture tool**: `capture-sky-frames.mjs --eval` runs page code in the same evaluation as the first pin.

## Design

### D1.1 — the model (`src/scene/landTouch.ts`, new, pure, `.ts` imports only)

A land touch is a point on the cypress or the foliage, in world units, with an amplitude in time. Held (a finger
down, a mouse over), its amplitude rises over `rise` to `amp` and stays. Released, it swings back as a damped
cosine from the amplitude it had, and closes to exactly zero by `windowEnd` after the release. A tap is a touch
held for `rise` and released. The push in the shader is the amplitude times a falloff with finite support around
the point, times the vertex's `aBend` (0 at the ground or the tree's base, 1 at a crest or the tip), away from
the point in the ground plane with a share pressed down.

```ts
export const LAND_TOUCH = {
  /** world units: the push's reach from the touch point in the ground plane; the tree is 2.7 tall and about 0.5 wide */
  radius: 0.55,
  /** world units a full-bend vertex moves at amplitude 1: about 5% of the tree's height; the foliage takes `foliagePush` */
  push: 0.14,
  foliagePush: 0.035,
  /** the share of the push that presses down: a bent blade dips */
  down: 0.35,
  /** seconds: a held touch's rise, so nothing pops */
  rise: 0.12,
  /** seconds: the spring-back's decay and its swing's period (a damped cosine) */
  tau: 0.9,
  period: 1.3,
  /** the swing closes to exactly zero between these seconds after the release, and is pruned after the second */
  windowStart: 4,
  windowEnd: 5,
  /** live touches the shaders take; a fifth is refused (never an eviction mid-swing) */
  maxTouches: 4,
  /** a hover's amplitude; a tap's and a held finger's is 1 */
  hoverAmp: 0.6,
  /** a hand on the tree moves the tree and does not surge the sky behind it (B's open item); Mark's choice */
  landMasksSky: true,
}

export const NO_RELEASE = 1e9

export type LandTouch = { x: number; y: number; z: number; t0: number; amp: number; release: number }
export type LandStore = { touches: LandTouch[]; held: number }

export function emptyLandStore(): LandStore {
  return { touches: [], held: -1 }
}

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/** 1 − smoothstep over the closing window: exactly 0 from `windowEnd` on. */
export function closing(sinceRelease: number, T = LAND_TOUCH): number {
  return 1 - smoothstep(T.windowStart, T.windowEnd, sinceRelease)
}

/** The amplitude at time t: the rise while held; from the release, a damped cosine from the amplitude it had, closed. */
export function landAmplitude(touch: LandTouch, t: number, T = LAND_TOUCH): number {
  const held = touch.amp * smoothstep(0, T.rise, Math.min(t, touch.release) - touch.t0)
  if (t <= touch.release) return held
  const since = t - touch.release
  const omega = (2 * Math.PI) / T.period
  return held * Math.exp(-since / T.tau) * Math.cos(omega * since) * closing(since, T)
}

/** The falloff in the ground plane: a quartic hat, exactly 0 at and beyond `radius` (finite support). */
export function landFalloff(distance: number, T = LAND_TOUCH): number {
  const x = distance / T.radius
  if (x >= 1) return 0
  const s = 1 - x * x
  return s * s
}

/** TS twin of the shader's displacement for one vertex at `p` (local units, the same frame as the touches). */
export function landDisplacement(p: readonly [number, number, number], bend: number, touches: readonly { x: number; y: number; z: number; amp: number }[], push: number, T = LAND_TOUCH): [number, number, number] {
  let dx = 0
  let dy = 0
  let dz = 0
  for (const k of touches) {
    const ax = p[0] - k.x
    const az = p[2] - k.z
    const dist = Math.hypot(ax, az)
    const f = landFalloff(dist, T)
    if (f === 0 || k.amp === 0) continue
    const ux = dist > 1e-4 ? ax / dist : 0
    const uz = dist > 1e-4 ? az / dist : 0
    const m = k.amp * f * push * bend
    dx += m * ux
    dy -= m * T.down
    dz += m * uz
  }
  return [dx, dy, dz]
}

/** Drop every touch whose swing has closed. The held one is never dropped. */
export function pruneLand(store: LandStore, now: number, T = LAND_TOUCH): LandStore {
  const keep = store.touches.filter((k, i) => i === store.held || now - k.release < T.windowEnd)
  const held = store.held >= 0 ? keep.indexOf(store.touches[store.held]) : -1
  return { touches: keep, held }
}

/** Release the held touch at `now` (its swing begins from the amplitude it has). */
export function releaseHeld(store: LandStore, now: number): LandStore {
  if (store.held < 0) return store
  const touches = store.touches.map((k, i) => (i === store.held ? { ...k, release: now } : k))
  return { touches, held: -1 }
}

/** Begin a held touch at a point, releasing any held one; refused when the list is full. */
export function beginHeld(store: LandStore, point: readonly [number, number, number], amp: number, now: number, T = LAND_TOUCH): LandStore {
  const released = releaseHeld(store, now)
  if (released.touches.length >= T.maxTouches) return released
  const touch: LandTouch = { x: point[0], y: point[1], z: point[2], t0: now, amp, release: NO_RELEASE }
  return { touches: [...released.touches, touch], held: released.touches.length }
}

/**
 * The held touch follows the pointer: the field moves with the hand and the strokes it leaves stand up again at
 * once, the way grass does behind a hand. (A trail of swings per step was considered and dropped: with four live
 * touches and a five-second window a sweep would refuse touches within a second.) The swing comes on the release.
 */
export function followHeld(store: LandStore, point: readonly [number, number, number], amp: number, now: number, T = LAND_TOUCH): LandStore {
  if (store.held < 0) return beginHeld(store, point, amp, now, T)
  const touches = store.touches.map((h, i) => (i === store.held ? { ...h, x: point[0], y: point[1], z: point[2], amp } : h))
  return { touches, held: store.held }
}

/** A tap: a touch held for `rise`, then released. */
export function pushTap(store: LandStore, point: readonly [number, number, number], amp: number, now: number, T = LAND_TOUCH): LandStore {
  const released = releaseHeld(store, now)
  if (released.touches.length >= T.maxTouches) return released
  return { ...released, touches: [...released.touches, { x: point[0], y: point[1], z: point[2], t0: now, amp, release: now + T.rise }] }
}

/**
 * The uniforms' values for one material at time t: `[x, y, z, amp]` per live touch in the material's local frame
 * (`offset` is the mesh's group position), and the count. A touch whose amplitude is 0 is left out, so a held
 * touch's first frame (t = t0, the rise at 0) packs nothing: the t0 frame is the no-input frame by construction.
 * The caller writes `entries` into a `Float32Array(16)` uniform (`uLand`), as B's `uSurge` is, never an array of
 * vectors: three's upload path for an injected uniform array takes the flat typed array.
 */
export function landUniformValues(store: LandStore, t: number, offset: readonly [number, number, number] = [0, 0, 0], T = LAND_TOUCH) {
  const entries: number[] = []
  let count = 0
  for (const k of store.touches) {
    const amp = landAmplitude(k, t, T)
    if (amp === 0) continue
    entries.push(k.x - offset[0], k.y - offset[1], k.z - offset[2], amp)
    count++
  }
  return { entries, count }
}

/** The vertex-stage GLSL: `aBend`, the touch list, the push; injected after `<begin_vertex>` on `transformed`. */
export const landGlsl = {
  vertexHead: /* glsl */ `
  attribute float aBend;
  uniform int uLandCount;
  uniform vec4 uLand[4];
  uniform vec3 uLandParams; // radius, push (times the knob), down
  vec3 landBend(vec3 p, float bend) {
    vec3 d = vec3(0.0);
    for (int i = 0; i < 4; i++) {
      if (i >= uLandCount) break;
      vec2 away = p.xz - uLand[i].xz;
      float dist = length(away);
      float x = dist / uLandParams.x;
      float f = x < 1.0 ? (1.0 - x * x) * (1.0 - x * x) : 0.0;
      vec2 dir = dist > 1e-4 ? away / dist : vec2(0.0);
      float m = uLand[i].w * f * uLandParams.y * bend;
      d += vec3(m * dir.x, -m * uLandParams.z, m * dir.y);
    }
    return d;
  }`,
  vertexTransform: /* glsl */ `
  transformed += landBend(transformed, aBend);`,
}
```

The amplitude's continuity: at the release `since` is 0, so the cosine term is `held · 1 · 1 · 1`, the value the
touch had. The swing overshoots the other way (the cosine goes negative) and decays; `closing` makes it exactly
zero from `windowEnd`, so a pruned touch leaves nothing behind. With no live touch the shader's loop runs zero
times and `transformed += vec3(0.0)`, which is exact.

### D1.2 — the injection takes a vertex transform (`aliveMaterial.ts`)

`AliveInjection` gains an optional `vertexTransform?: string`, applied after `#include <begin_vertex>` (where
three declares `transformed`), through the same `replaceOnce`; `injectAliveSource` adds the step when the field is
present. The flicker's injection is unchanged. The guard test in `scripts/sky-alive.test.ts` gains a case: the
marker replaced once, a missing marker throws.

### D1.3 — the attribute (`BrushCypress.tsx`, `villageGeometry.ts`, `Village.tsx`)

`BrushCypress` takes `touch?: { store: RefObject<LandStore>; bend: number }` (the knob through a ref-free prop,
like `tuning`). With it, both geometries get `aBend` (one float per vertex): on the solid `1 − sourceV`, on a
stroke each sample's `heightFraction` twice (the ribbon's two vertices), packed by the before/after vertex count
as the flicker is. Both materials get a second injection: with `alive` the flicker's and the bend's GLSL are
concatenated into one injection (one key, `alive-flicker-bend-solid` / `-strokes`, the union of the uniforms);
with `alive` off and `touch` on, the bend alone (`bend-solid` / `bend-strokes`). The frame loop writes `uLand`,
`uLandCount` from `landUniformValues(store.current, t, [BASE.x, BASE.y, BASE.z])`; the layout effect writes
`uLandParams = [radius, push × bend, down]` (the knob).

`buildVillage({ glow, bend })`: with `bend`, `foliageRow` pushes `aBend` per vertex through `face()`, which gains
a fourth argument, the four bend values in vertex order: the front `[0, 0, 1, 1]`, the top `[1, 1, 1, 1]`, the
back `[0, 0, 1, 1]`, the bottom `[0, 0, 0, 0]`, the left cap `[0, 1, 1, 0]`, the right cap `[0, 0, 1, 1]`.
`geometry()` sets the attribute when given. `Village` takes the same `touch` prop; with it the foliage gets its own
`MeshBasicMaterial` with the bend injection (`uLandParams.y = foliagePush × bend`), the frame loop writes its list
with offset `[0, 0, 0]`. The three other village meshes are untouched.

`Diorama` passes `touch` to both. The village study's tracked check (`scripts/export-village.mjs`) asserts the
foliage's welded positions and closed edges from `position` and the index, which the attribute leaves untouched.

### D1.4 — the input (`useTouchInput.ts`)

The hook takes `land?: { store: RefObject<LandStore>; meshes: () => Object3D[]; knob: number }`. With it, every
move, tap and release first asks the land:

```ts
    const raycaster = new Raycaster()
    const landPoint = (clientX: number, clientY: number): [number, number, number] | null => {
      if (!land) return null
      const rect = canvas.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) return null
      ndc2.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1)
      raycaster.setFromCamera(ndc2, camera)
      const hit = raycaster.intersectObjects(land.meshes(), false)[0]
      return hit ? [hit.point.x, hit.point.y, hit.point.z] : null
    }
```

- `onMove`: `const p = landPoint(...)`; if `p`: `land.store.current = followHeld(store, p, down ? knob : hoverAmp × knob,
  clock.current)`, and with `landMasksSky` return (no sky surge). Else: if the land held a touch, release it
  (`releaseHeld` at `clock.current`), then the sky as today.
- `onUp`: a tap on the land → `pushTap` at amplitude `knob`, and with `landMasksSky` return; otherwise a held land
  touch is released, then the sky's tap as today. A drag's end releases the held touch too.
- `onCancel`, `visibilitychange`: release the held touch.
- The meshes: `() => [cypressSolid, villageFoliage]` found by name on the scene (`cypress-solid`, `village-foliage`;
  the cypress group gets `name="cypress"`, its solid mesh `name="cypress-solid"`); the strokes are not raycast (thin
  ribbons over the solid: the solid is the body). `intersectObjects` returns world points; each material's frame
  loop subtracts its group's offset. The solid is `DoubleSide`, so at a grazing orbit angle the nearest hit can be
  the lobe's far wall; `[0]` takes the nearest, and that is accepted: the point is still on the tree.
- The prune has one owner at a fixed priority: the hook's own `useFrame(…, -1)` prunes the land store once per
  frame (R3F orders subscribers by priority, then by registration, which Suspense and StrictMode do not keep stable
  by tree order); the cypress's and the village's frame loops only read it.
- The seams: `__landState()`, `__landInject(x, y, z, amp, t0, hold)` (`hold` true begins a held touch at `t0`,
  false a tap; pins and injected times go up only, as `__arrivalTime`'s do), `__landBounds()` (the two meshes'
  screen rects at the current camera, for the gate's mask).

The pointer's `raycaster` costs one intersection against the solid (about 12 k triangles) and the foliage per
move: well under a millisecond on the Mac, and `hoverDue` already rate-limits B's moves to one per 60 ms.

### D1.5 — the knob (`skyAlive.ts`, `AliveTuner.tsx`, `App.tsx`, `sky-tuning.json`)

`bend` joins `AliveTuning`: default 1, ceiling 1.5, key `touchBend`, step 0.05, label "bend (touch on the land,
D1)", shown on the touch route with `surge`. `sky-tuning.json` ships `touchBend: 1`. `App.tsx`'s `SHIPPED_ALIVE`
reads it. `Scene` passes `touch={touch ? { store: landStore, bend: aliveTuning.bend } : undefined}` to `Diorama`.

### D1.6 — the store in the scene (`DioramaExperience.tsx`)

`Scene` owns `const landStore = useRef<LandStore>(emptyLandStore())`. The hook prunes it (D1.4); the cypress and
the village only read it and pack their uniforms. Paused, the hook is off, the frame loops write a zero count and
the store is cleared, as B's is. `useTouchInput` gets `land` when `touch` is on and the arrival is done (`enabled`
already covers that).

## Commits

1. `test(land): the model's tests, red` then `feat(land): the land-touch model and its GLSL` (D1.1, D1.2).
2. `feat(land): the cypress and the foliage bend from the pointer` (D1.3–D1.6).
3. `docs(tasks): D1's record and gate`, with the Tunables entry.

## Tests (node, `test:sky`, `scripts/land-touch.test.ts`)

- L1 amplitude: held, 0 at t0, `amp` from `t0 + rise` on; a tap's value at its release is exactly
  `amp · smoothstep(0, rise, rise) = amp`; at the release the swing's first value equals the held value (continuity
  by construction: `cos 0 · e⁰ · closing 0 = 1`); the swing overshoots negative and never exceeds `amp` in
  magnitude; it is exactly 0 from `release + windowEnd`.
- L2 falloff: 1 at 0, exactly 0 at and beyond `radius`, monotone down.
- L3 displacement: zero bend moves nothing; a vertex at the touch's own point moves straight down by `down · push`;
  a vertex 0.2 away moves away from the point in the ground plane; finite support beyond `radius`.
- L4 the store: `beginHeld` releases the previous held one and adds; a fifth is refused with the held one released;
  `followHeld` moves the held one and begins one when none is held; `pushTap` holds for `rise`; `pruneLand` keeps
  the held one and every unclosed swing and drops the closed ones.
- L5 uniforms: `landUniformValues` leaves out zero amplitudes, subtracts the offset, counts right.
- L6 the injection: `vertexTransform` lands after `<begin_vertex>` once; a shader without the marker throws.

## Gate (this session; Mark's taste gate follows on the preview)

| # | Check | Pass when |
|---|---|---|
| G1 | Red first | L1–L6 fail before D1.1 and D1.2 land; pass after |
| G2 | `test:sky`, `tsc -b`, build, eslint on `src` and `scripts` | all green |
| G3 | `?touch=0` (both skies), pinned t 0 / 3.7 (moving) and 0 / 2.3 / 11.2 (light) vs `main`'s build | byte-identical: no injection, no attribute |
| G4 | The default route (touch on) with no input vs the pre-D1 build, the same times | the differing pixels, if any, at most B's row 7's residue (a handful of pixels, one grey level, from the new program on Metal), invisible at 1:1; any larger difference is a defect. Said plainly to Mark |
| G5 | A held touch injected on the cypress's mid-height (`__landInject` with `hold`), pinned at t0 + 0.02 / 0.06 / 0.12 / 1 (t0 + 0 is the no-input frame by construction), and a tap at t0 + 0.02 / 0.3 / 0.6 / 1 / 2 / 5, both skies, desktop; every differing pixel against the no-input frame inside the union of `__landBounds()` dilated by 40 px | the mask holds; with `landMasksSky` the sky is untouched |
| G6 | By eye, 1:1 crops of the tree at the hold's peak and through the swing: the strokes stay on the body (no tearing between the ribbons and the solid), the tip leans furthest, the base stays, the foliage dips under a touch on it | named, anything wrong fixed within the retune cap |
| G7 | Headed (Playwright): a hover over the tree bends it (frames differ from no hover at a pinned sky time); leaving restores within `windowEnd`; a drag across sweeps; a tap over the cypress no longer surges the sky (the sky's frame outside the land mask equals no-tap); `?perf=1` with a continuous hover | as stated; frame rate within 3 fps of `main` |
| G8 | `check:reduced` and `check:viewport` | PASS, PASS |
| G9 | Codex code review, then `tasks/2026-10-20-touch-land-d1.md` | no P0 or P1 open |

## Risks

- **The push reads as a flinch, or as jelly.** The radius, the push and the swing are three constants and a knob.
  Mark's taste gate decides; the fallback is a smaller push and a faster decay.
- **The strokes tear from the body.** Both get the same field (the same point, the same `h` → `aBend`), so nearby
  vertices move alike. The ribbons sit 0.003 above the solid; a tip push of 0.14 keeps them attached. G6 looks.
- **A hover now steals the sky's surge where the tree stands.** By design: a hand on the tree moves the tree. B's
  open item ("a tap over the cypress surges the sky behind it") closes.
- **Performance on the phone**: a raycast per 60 ms and a four-touch loop per vertex. Mark's `?perf=1` reads it.

## Review

Codex (`w4:p4`, read-only, 2026-10-21, `scratch/touch-land-2026-10-20/review-report.md`; it ran the plan's model in
memory, raycast the real village geometry with the design camera, and drove three's real uniform setter and the
tuning writer with stubs): **REVISE**. Each finding checked against the plan and the code; each holds. D1 is
third in the land roadmap (`tasks/todo.md`, "Direction — the land"), after E1 the cypress and E2 the ground, so
the revision below is the first task when D1 starts, on the new tree. Nothing of D1 is built.

- F1 (P1) the field is discontinuous at the touch point: below 1e-4 the direction is zero, above it a unit vector
  while the falloff is still 1, so a two-microunit move flips a full-weight vertex by 0.14 → a smooth vector field:
  the push proportional to `away / radius · (1 − x²)²`, zero at the centre, in TS and GLSL alike; L3 sweeps across
  the centre.
- F2 (P1) a finger held still never begins a touch (only `onMove` and the tap did) → `onDown` raycasts and begins
  the held touch; the gate holds a still press past the tap threshold.
- F3 (P1) a hover that leaves the canvas without a non-land move stays bent for ever → `pointerleave` on the
  connected element releases it; the gate exits straight onto an overlay.
- F4 (P1) the nearest hit among the two land meshes can be a hedge behind a house (114 of 327 probe rays over the
  foliage had a nearer house) → raycast every foreground mesh (the houses' solid, skin and paint, the island) and
  accept the hit only when the nearest is land.
- F5 (P1) hover → press overwrote the amplitude 0.6 → 1 in one frame → the entry's amplitude ramps to the new
  target over `rise`, never replaced.
- F6 (P1) "set as default" would silently drop `touchBend`: `vite.config.ts`'s `TUNING_FIELDS` allowlist
  (`:9–19`) is not in the plan's file list → add the field; test the writer's round trip, not the client payload.
- F7 (P2) the bend gain applied twice (the stored amplitude × knob and `uLandParams.y` × knob → bend²) → stored
  amplitudes normalised, the gain once, in the material; the hook's `knob` named `surgeGain`, the land's `bendGain`.
- F8 (P2) the raycast ran on every `pointermove`, before B's 60 ms gate → the hook keeps the latest pointer
  position and hit-tests it once per frame in its own `useFrame`, releases stay immediate.
- F9 (P2) the masking description was incomplete: a land tap consumes B's lift, kick and star flare, and masked
  even at bend 0 → the policy stated whole; at bend 0 no masking, so B is exactly today's.
- F10 (P1) admission against the raw list length refused a tap when four closed touches awaited the next prune
  (the prune at −1 reads the previous clock) → admission against the touches live at the input's `now`, B's
  `pushKick` pattern.
- F11–F14 (P3) `heldIndex`, `bendWeight` against `bendGain`; a comment that restated `releaseHeld`; `1e-4` and the
  capacity 4 repeated where `LAND_TOUCH` should be the one source (the array length derived from `maxTouches`);
  B's gesture, admission and closing-window code reused rather than a second store abstraction.
- Gate prerequisite: the arrival is on by default now, so D1's capture URLs carry `arrival=0` or pin the arrival
  done before `__landInject` exists (the seams mount with the input, after the arrival).
- Checked sound by the reviewer: `?touch=0` leaves no D1 injection or attribute (the flicker's injection stays,
  since `alive` is on); the amplitude's continuity at the release and its exact closure; the vec4-array upload
  (`Float32Array(16)` reaches `uniform4fv` as is); exactly one `<begin_vertex>` in `MeshBasicMaterial`; the
  world-to-local offsets; the single prune owner publishes whole stores.

## Rebase onto E1 and E2 (2026-10-21, before the build)

The plan above was written on 2026-10-20 against the old cypress (48 ribbons, `cypress-solid` the lobe volume) and
the village's four foliage rows. E1 (PR #15) rebuilt the cypress as 450 front ribbons traced in its own field, and
E2 (PR #16) retired the foliage rows for the ground strokes and the stroked domes. The design (D1.1, D1.4–D1.6) and
Codex's fourteen findings stand; what changes is the targets and what they already carry. Mark, 2026-10-21: "Let's
start D1, rebase the plan first."

### What E1 and E2 already built for D1

- **D1.2 is done.** `AliveInjection.vertexTransform` exists (`aliveMaterial.ts:29`, applied once after
  `<begin_vertex>`), and `concatInjections` merges injections into one key. E1's stroke body (`strokeGlsl`) is
  injected that way on the cypress's strokes and the land's strokes. The guard test in `scripts/sky-alive.test.ts`
  covers the marker.
- **The cypress carries its height already.** Both cypress geometries carry `aFlicker = [w, h]`, `h` the height
  axis (0 base, 1 tip), whenever `alive` is on; D1 rides B's flag, which `alive=0` turns off with it, so `h` is
  always present when the bend is. The bend reads `aFlicker.y`: no `aBend` on the cypress.
- **The village's foliage rows are gone.** D1.3's `foliageRow` / `face()` work is void. The targets on the island are
  E2's trees: `land-trees-strokes` (the domes' strips, `aStroke` [along, across] and `aSeed`) and
  `land-trees-solid` (the domes). The ground (`land-ground`) does not bend: the painting's fields are laid paint,
  not grass, and a ripple there is a different piece. Mark's call if he wants it.

### The rebased D1.3 — the attribute and the materials

- `buildLandTrees` emits `bend` per strip vertex and per dome vertex: the vertex's height above the terrain under
  it over the mass's height, clamped to [0, 1] (`(y − islandHeightAt(x, z)) / placed.height`). A strip settled on
  the dome–terrain contact has 0.005 / height; a crest point 1. The attribute is `aBend` (one float), set by
  `strokeGeometry` and `plainGeometry` when given, so the ground's geometries never carry it.
- The trees' strips get their own material, `treeMat`: E1's stroke body concatenated with the bend
  (`concatInjections('land-trees-bend', strokeGlsl, bendGlsl)`), `uLandParams.y = foliagePush × bendGain`. The
  ground keeps `landMat` unchanged, so its program and bytes are E2's: G4's no-input comparison has nothing to
  explain on the ground. The domes' solid gets a `MeshBasicMaterial` with the bend alone (`land-trees-bend-solid`).
- The cypress: both materials gain the bend through `concatInjections` with the flicker (`alive-flicker-bend-solid`,
  `cypress-strokes-flicker-bend`), the GLSL reading `aFlicker.y` as the bend weight (a `#define`-free rename:
  `bendGlsl` takes the weight expression as a parameter, `aBend` on the island, `aFlicker.y` on the cypress).
- `BrushIsland` and `BrushCypress` take `touch?: { store: RefObject<LandStore>; bendGain: number }`; the frame loops
  write `uLand` / `uLandCount` from `landUniformValues` with their group's offset (the island's group is at the
  origin, the cypress's at `BASE`).

### The rebased D1.4 — the raycast's targets (Codex F4, F8)

- The land meshes a hit counts on: `cypress-solid` (E1's solid; the group `cypress`, the mesh named now) and
  `land-trees-solid`. The strips and the ribbons are not raycast (thin, over the body).
- The occluders raycast with them, so a hedge behind a house or the island's rim never wins: `village-solid`,
  `village-skin`, `village-paint`, `land-ground`, and the island's solid (named `island-solid` now). The hit is land
  only when the nearest intersection is on a land mesh.
- The domes' solid is wound outward since `b3b2bc6` and front-side, so the nearest hit on a dome is its near shell.
  The cypress's solid is `DoubleSide`; `[0]` takes the nearest, accepted as before.
- The hit test runs once per frame on the latest pointer position in the hook's own `useFrame` (F8); releases on
  `pointerup`, `pointercancel`, `pointerleave` (F3) and `visibilitychange` are immediate.

### What the rebase does not change

D1.1's model with F1 (the smooth field: the push proportional to `away / radius · (1 − x²)²`), F5 (the amplitude
ramps to a new target over `rise`), F7 (the gain once, in the material), F10 (admission against the touches live at
`now`); D1.5's knob (`bend`, key `touchBend`, `TUNING_FIELDS` in `vite.config.ts`, F6); D1.6's store ownership and
the single prune at priority −1; the gate G1–G9, with G5's mask from `__landBounds()` now the cypress's and the
trees' screen rects, and G6's eye on the domes' strips staying on their shells through a touch (the same field on
the strip and the dome under it, as E1's lift keeps the ribbons on the lobes).

### Constants to revisit on the new trees

`foliagePush` 0.035 was set for hedge rows 0.13–0.25 tall; the domes are 0.13–0.30. It starts there; the knob and
Mark's eye set it. `radius` 0.55 covers a dome row's neighbour (the orchard's domes are 0.35–0.47 apart): a touch
on one dome stirs the next, which reads as a cluster, as the painting's clumps are.

### Mark's two choices

1. `landMasksSky` true: a hand on the tree moves the tree and no longer surges the sky behind it (recommended).
2. The ground stays still (recommended); a ripple of the fields is a separate slice if wanted.

### The order

1. Codex reads this rebase against the current code (`scratch/touch-land-2026-10-20/brief-rebase-read.md`), bounded
   to the delta: the attribute's definition, the material split, the raycast set, anything E1 or E2 changed that the
   plan still assumes. One read.
2. The build on `feat/touch-land-d1` from `main` (`7bd583e` plus the docs commit): the model and its tests red first
   (D1.1 with F1/F5/F10), then the attribute and the materials, then the input, then the knob, then the gate.

### Codex's read of the rebase (2026-10-21, `scratch/touch-land-2026-10-20/rebase-read-report.md`): REVISE, R1–R2 P2, R3–R4 P3

Each checked against the code; each holds. The dispositions, folded into the build (no second read: the code
review at G9 checks them in code):

- R1 (P2) the cypress ribbons' `aFlicker.y` is the step's centre height repeated across the seven columns, so it is
  not the solid's `1 − sourceV` at the same place (268,944 of 315,875 strip vertices differ, up to 0.012) → the
  cypress's bend weight is the vertex's own local height, `clamp(transformed.y / HEIGHT, 0, 1)`, evaluated in the
  vertex shader on both materials: the same field on the ribbon and the solid by construction, no attribute. The
  bend GLSL takes the weight expression as its parameter; the island passes `aBend`, the cypress the expression.
  `aFlicker` is untouched.
- R2 (P2) the ground ribbons in the nearest-hit set reject a bush through fragments the stroke shader discards (a
  design-camera ray to `row-right` hits a ground triangle whose across coordinate is beyond the rounded stroke's
  radius) → the occluders are opaque bodies only: `island-solid`, `village-solid`, `village-skin`, `village-paint`;
  the ground's and the trees' strips are never raycast; the island's solid is the ground's proxy, 0.02 under the
  strokes. The reported ray is a regression test's.
- R3 (P3) `cypress`, `cypress-solid`, `island-solid` are not assigned today → the build assigns them (the cypress
  group and its solid mesh, the island's solid mesh); the hook resolves every target and occluder by name once, and
  in development throws on a missing one before enabling input; `__landBounds()` reports which it found.
- R4 (P3) `strokeGlsl` lacks `uniforms` → the composition is `concatInjections('land-trees-bend', { uniforms: {},
  ...strokeGlsl }, bendInjection)`, the bend injection built with its own uniform objects and empty body fields.

### The code review (G9)

Codex (`w4:p4`, read-only, 2026-10-21 night, `scratch/touch-land-2026-10-20/code-review-report.md`, against
`375d825`; it ran the hook's transpiled body with shims, the real design camera and the shipped cypress solid, the
model, three r184's uniform upload, a GLSL twin, the supplied pinned frames and the gate's logs): **REVISE**, six
P2s and two P3s. Each checked against the code; each holds. The dispositions, all in `9136dc4`:

- F1 (P2) a rebind of the input effect (a rotation replaces `home`) starts a closure with no press in it, so the
  old hold is never released → the cleanup releases the held touch at the clock and resets the pointer's state;
  disabled, the frame loop resets it too.
- F2 (P2) the up releases the hold but leaves the pending move, so the next frame rebuilds a hold from the
  pre-release position → the up consumes the pending move; the hover resumes on the next real move (headed: no
  hold after a same-frame tap until the pointer moves).
- F3 (P2) a press held across the knob's zero came back as a full press when the knob was restored → the up
  releases a hold whatever the gain, and at gain 0 the frame loop empties the land as when disabled.
- F4 (P2) every down is a hold, so a short real tap released mid-ramp and a same-frame tap bent nothing, unlike
  the seam's `pushTap` → a classified tap releases at `max(now, t0 + rise)`: the ramp finishes, the swing starts
  from the target, the seam and the visitor share the transition (L9; headed: a same-frame tap releases at
  t0 + 0.12 at amplitude 1).
- F5 (P2) `test:sky` enumerated the files and never ran `land-touch.test.ts` → added; 178 pass.
- F6 (P2) the stale over-land early return dropped the first sky hover after leaving the tree when the pointer
  then stood still → gone; at an admitted hover step the land is asked on the current position, at most once per
  `hoverMs`, and a move off the tree releases the hold and surges the sky in the same step (headed: one move off,
  then still: released, one sky surge).
- F7 (P3) the mesh cache kept a detached mesh pickable → no cache; six `getObjectByName` lookups per pick.
- F8 (P3) the weight test passed a binary field → each mass built alone, every vertex's weight checked against
  the clamped height over that mass's height, 10,000+ intermediate values.
- Noted, not fixed: `__landBounds` projects the static boxes without frustum clipping (no visitor route to a
  reversed camera); the G5 painted-light row was missing and is captured now (a hold on the cypress at t0 5: 0 px
  at t0, 55,188 at +1 inside the cypress's box, the same box as the moving sky's).

The confirmation read: `brief-confirmation.md`, bounded to the eight, one word at the end.
