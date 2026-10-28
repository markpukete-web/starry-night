// Vincent (S2 task 3, then V1 task 1): the build fits the rig, stays cheap, carries the gate's classes and the painting's paint.
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'
import { BufferGeometry, Color, Float32BufferAttribute, Group, Mesh, PerspectiveCamera, Sprite, Vector3 } from 'three'
import palette from '../public/reference/palette.json' with { type: 'json' }
import { mulberry32 } from '../src/scene/brush.ts'
import { STREET, VINCENT_RIG, vincentPlace, vincentTapCorners, walkPose } from '../src/scene/streetLayout.ts'
import { hitBox, turnPose, vincentFigureBounds, WALK } from '../src/scene/streetWalk.ts'
import { rectUnderpaint, sourceUnderpaint, STREET_SOURCES, type StreetSourceName } from '../src/scene/streetStrokes.ts'
import type { ImageData2D } from '../src/scene/useImageData.ts'
import {
  buildVincent,
  FORM,
  lanternUniform,
  underpaintColour,
  vincentMoon,
  vincentStrokeBody,
  VINCENT_CLASS,
  VINCENT_SOURCES,
  type VincentBuild,
  type VincentPart,
} from '../src/scene/vincent.ts'
import { decodePNG } from './lib/png.ts'

/** A 1600 × 1267 painting of seeded noise: the geometry does not depend on the colours. */
function noisePainting(): ImageData2D {
  const [width, height] = [1600, 1267]
  const rand = mulberry32(7)
  const data = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 40 + rand() * 120
    data[i + 1] = 40 + rand() * 120
    data[i + 2] = 40 + rand() * 120
    data[i + 3] = 255
  }
  return { data, width, height }
}

const painting = noisePainting()
const build = buildVincent(painting)

function flat(positions: number[]): Vector3[] {
  const out: Vector3[] = []
  for (let i = 0; i < positions.length; i += 3) out.push(new Vector3(positions[i], positions[i + 1], positions[i + 2]))
  return out
}

function points(part: VincentPart): Vector3[] {
  return [...flat(part.strokes.arrays.positions), ...flat(part.underpaint.positions)]
}

const X = new Vector3(1, 0, 0)
const Y = new Vector3(0, 1, 0)
type Pose = { yaw: number; head: number; armLeft: number; armRight: number; legLeft: number; legRight: number }
const REST: Pose = { yaw: 0, head: 0, armLeft: 0, armRight: 0, legLeft: 0, legRight: 0 }

/** Every vertex of every part, placed as the frame loop places them (`70acd5b:src/scene/StreetWalk.tsx:514-530`): the
 * head about its neck, each arm about its shoulder, each leg about its hip, the lantern counter-rotated under the left
 * hand so it hangs plumb, then the whole figure yawed about y. The gait's pitch is left out. */
function posed(b: VincentBuild, pose: Pose): Vector3[] {
  const out: Vector3[] = []
  const place = (positions: number[], f: (p: Vector3) => Vector3) => out.push(...flat(positions).map(f))
  const about = (part: VincentPart & { pivot: number[] }, angle: number, axis: Vector3) => {
    for (const positions of [part.strokes.arrays.positions, part.underpaint.positions]) {
      place(positions, (p) => p.applyAxisAngle(axis, angle).add(new Vector3(...part.pivot)))
    }
  }
  for (const positions of [b.body.strokes.arrays.positions, b.body.underpaint.positions]) place(positions, (p) => p)
  about(b.head, pose.head, Y)
  about(b.armLeft, pose.armLeft, X)
  about(b.armRight, pose.armRight, X)
  about(b.legs[0], pose.legLeft, X)
  about(b.legs[1], pose.legRight, X)
  for (const positions of [b.lantern.glass.positions, b.lantern.ink.positions]) {
    place(positions, (p) => p.applyAxisAngle(X, -pose.armLeft).add(new Vector3(...b.lantern.pivot)).applyAxisAngle(X, pose.armLeft).add(new Vector3(...b.armLeft.pivot)))
  }
  return out.map((p) => p.applyAxisAngle(Y, pose.yaw))
}

test('Vincent fits the rig', () => {
  // walking: the arms swing ±0.12, the legs ±0.35, no raise, no yaw; every sign pair
  const walking: Pose[] = []
  for (const a of [-1, 1]) for (const l of [-1, 1]) walking.push({ ...REST, armLeft: 0.12 * a, armRight: -0.12 * a, legLeft: -0.35 * l, legRight: 0.35 * l })
  // turned: the left arm raised 0.75, the lantern plumb, the head a further π/4, the body yawed π/2 (measured 0.0027
  // past the box along the lane, `lead-tarascon-turned.log`)
  const turned: Pose = { ...REST, yaw: Math.PI / 2, head: Math.PI / 4, armLeft: -0.75 }
  const cases = [
    ...walking.map((pose, i) => ({ name: `walking ${i}`, pose, depth: VINCENT_RIG.halfDepth })),
    { name: 'turned', pose: turned, depth: VINCENT_RIG.halfDepth + 0.003 },
  ]
  for (const { name, pose, depth } of cases) {
    let top = -Infinity
    for (const p of posed(build, pose)) {
      assert.ok(Math.abs(p.x) <= VINCENT_RIG.halfWidth, `${name}: x ${p.x.toFixed(4)} past the half-width ${VINCENT_RIG.halfWidth}`)
      assert.ok(Math.abs(p.z) <= depth, `${name}: z ${p.z.toFixed(4)} past the depth bound ${depth}`)
      assert.ok(p.y >= 0 && p.y <= VINCENT_RIG.height + 0.002, `${name}: y ${p.y.toFixed(4)} outside 0 to ${VINCENT_RIG.height} + 0.002`)
      top = Math.max(top, p.y)
    }
    assert.ok(top >= 0.08 && top <= 0.0825, `${name}: his top is ${top.toFixed(4)}, outside [0.080, 0.0825]`)
  }
})

const count = (part: VincentPart) => (part.strokes.arrays.indices.length + part.underpaint.indices.length) / 3

test('Vincent is cheap', () => {
  const lantern = (build.lantern.glass.indices.length + build.lantern.ink.indices.length) / 3
  const sum = [build.body, build.head, build.armLeft, build.armRight, ...build.legs].reduce((n, part) => n + count(part), 0) + lantern + build.shadow.indices.length / 3
  assert.equal(build.triangles, sum)
  assert.ok(build.triangles <= 4000, `${build.triangles} triangles`)
})

test('the smock and the hat carry their classes', () => {
  const allowed = new Set<number>([VINCENT_CLASS.smock, VINCENT_CLASS.hat, VINCENT_CLASS.none])
  for (const part of [build.body, build.head, build.armLeft, build.armRight]) {
    const vertices = part.strokes.arrays.positions.length / 3
    assert.equal(part.strokes.cls.length, vertices)
    assert.equal(part.strokes.stroke.length, vertices * 2)
    assert.equal(part.strokes.seed.length, vertices)
    assert.equal(part.underpaint.cls.length, part.underpaint.positions.length / 3)
    assert.deepEqual(part.underpaint.src, part.underpaint.cls, 'the source pass carries his classes too')
    for (const c of [...part.strokes.cls, ...part.underpaint.cls]) assert.ok(allowed.has(c), `class ${c}`)
  }
  assert.ok(build.body.strokes.cls.includes(VINCENT_CLASS.smock))
  assert.ok(build.head.strokes.cls.includes(VINCENT_CLASS.hat))
  for (const sleeve of [build.armLeft, build.armRight]) {
    assert.ok(sleeve.strokes.cls.length > 0 && sleeve.strokes.cls.every((c) => c === VINCENT_CLASS.smock), 'his sleeve is the smock')
  }
  const bare = [...build.legs.flatMap((leg) => [...leg.strokes.cls, ...leg.underpaint.cls]), ...build.lantern.glass.cls, ...build.lantern.ink.cls]
  assert.ok(bare.length > 0 && bare.every((c) => c === VINCENT_CLASS.none), 'the legs and the lantern carry only none')
})

test('each part carries its class, where it sits on him', () => {
  // by place, so one part losing its class fails even while another part still carries it (a revert proof found both
  // hat parts redundant under a "class present" check). The hat is the head's, its pivot added back.
  const groups = { hatSide: [] as number[], crownTop: [] as number[], smockLow: [] as number[], smockHigh: [] as number[] }
  const head = build.head.strokes.arrays.positions
  for (let i = 0; i < head.length / 3; i++) {
    const [x, y, z] = [head[i * 3] + build.head.pivot[0], head[i * 3 + 1] + build.head.pivot[1], head[i * 3 + 2] + build.head.pivot[2]]
    const c = build.head.strokes.cls[i]
    if (y >= 0.0725 && Math.hypot(x, z) >= 0.0071) groups.hatSide.push(c) // the crown's side and the brim, outside the head
    if (y > 0.0785) groups.crownTop.push(c) // above the head's top
  }
  // the smock groups keep to z > −0.01, so the canvas and the easel on his back fall outside them
  const { positions } = build.body.strokes.arrays
  for (let i = 0; i < positions.length / 3; i++) {
    const [y, z] = [positions[i * 3 + 1], positions[i * 3 + 2]]
    const c = build.body.strokes.cls[i]
    if (z <= -0.01) continue
    if (y < 0.04) groups.smockLow.push(c) // below the canvas: the smock's lower tier
    if (y >= 0.054 && y <= 0.062) groups.smockHigh.push(c) // above the canvas, below the head: the upper tier
  }
  for (const [name, cls] of Object.entries(groups)) {
    assert.ok(cls.length > 0, `${name}: no vertex`)
    const want = name.startsWith('smock') ? VINCENT_CLASS.smock : VINCENT_CLASS.hat
    assert.ok(cls.every((c) => c === want), `${name}: a vertex of class ${cls.find((c) => c !== want)}, not ${want}`)
  }
})

test('no cane: only the boots reach the ground', () => {
  const lowest = Math.min(...points(build.body).map((p) => p.y))
  assert.ok(lowest >= 0.017, `the body reaches down to y ${lowest.toFixed(4)}, below 0.017`)
})

test('the right arm swings on its own', () => {
  assert.deepEqual(build.armRight.pivot, [-build.armLeft.pivot[0], build.armLeft.pivot[1], build.armLeft.pivot[2]])
  const left = flat(build.armLeft.underpaint.positions)
  const right = flat(build.armRight.underpaint.positions)
  assert.equal(right.length, left.length)
  const range = (ps: Vector3[], k: 'x' | 'y' | 'z') => [Math.min(...ps.map((p) => p[k])), Math.max(...ps.map((p) => p[k]))]
  const [lx, rx] = [range(left, 'x'), range(right, 'x')]
  assert.ok(Math.abs(rx[0] + lx[1]) < 1e-9 && Math.abs(rx[1] + lx[0]) < 1e-9, `x ${rx} is not ${lx} negated`)
  for (const k of ['y', 'z'] as const) {
    const [l, r] = [range(left, k), range(right, k)]
    assert.ok(Math.abs(l[0] - r[0]) < 1e-9 && Math.abs(l[1] - r[1]) < 1e-9, `${k}: ${r} is not ${l}`)
  }
  assert.ok(build.armRight.strokes.cls.length > 0)
  assert.ok(build.armRight.strokes.cls.every((c) => c === VINCENT_CLASS.smock), 'his right sleeve is the smock')
})

test("the hat is the crescent's ochre", () => {
  const want = underpaintColour(painting, FORM.tarascon.hat)
  const { positions, colors, cls } = build.head.underpaint
  let hat = 0
  for (let i = 0; i < positions.length / 3; i++) {
    if (cls[i] !== VINCENT_CLASS.hat) continue
    hat++
    assert.deepEqual([colors[i * 3], colors[i * 3 + 1], colors[i * 3 + 2]], [want.r, want.g, want.b], `hat vertex ${i}`)
  }
  assert.ok(hat > 0, 'no hat vertex in the head')
})

test('the lantern starts dark', () => {
  assert.deepEqual(lanternUniform.value.toArray(), [0, 0, 0, 0])
})

test('the build is deterministic', () => {
  assert.deepEqual(buildVincent(painting), build)
})

test('rectUnderpaint is sourceUnderpaint', () => {
  for (const name of Object.keys(STREET_SOURCES) as StreetSourceName[]) {
    for (const share of [0.1, 0.4, 1]) assert.deepEqual(rectUnderpaint(painting, STREET_SOURCES[name], share), sourceUnderpaint(painting, name, share))
  }
})

test('the moon is in the lit body only, after the stroke body', () => {
  assert.deepEqual(vincentMoon(false), { vertexHead: '', vertexBody: '', fragmentHead: '', fragmentBody: '' })
  const lit = vincentStrokeBody(true)
  const moon = vincentMoon(true).fragmentBody
  assert.ok(lit.fragmentBody.endsWith(moon), 'the light runs last in the body, so before the fog in material()')
  assert.match(moon, /gl_FrontFacing/)
  assert.doesNotMatch(vincentStrokeBody(false).fragmentBody, /vMoonNormal/)
})

type Lab = [number, number, number]
function srgbToLab(r: number, g: number, b: number): Lab {
  const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  const [R, G, B] = [lin(r), lin(g), lin(b)]
  const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116)
  const x = f((0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047)
  const y = f(0.2126 * R + 0.7152 * G + 0.0722 * B)
  const z = f((0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883)
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)]
}
function swatchMean(region: string, pick?: number[]): Lab {
  const colours = (palette.regions as Record<string, { colours: { lab: number[]; weight: number }[] }>)[region].colours
  const chosen = pick ? pick.map((i) => colours[i]) : colours
  const w = chosen.reduce((s, c) => s + c.weight, 0)
  return [0, 1, 2].map((k) => chosen.reduce((s, c) => s + c.lab[k] * c.weight, 0) / w) as Lab
}

const workPainting = new URL('../reference/derived/_work-painting.png', import.meta.url)
test('his paint is the painting\'s', { skip: !existsSync(workPainting) && 'needs reference/derived/_work-painting.png (not in CI); Task 5\'s browser gate measures the render' }, () => {
  const png = decodePNG(readFileSync(workPainting))
  const real = buildVincent({ data: new Uint8ClampedArray(png.rgba), width: png.width, height: png.height })
  const meanOf = (part: VincentPart, cls: number): Lab => {
    const labs: Lab[] = []
    const { colors } = part.strokes.arrays
    part.strokes.cls.forEach((c, i) => {
      if (c !== cls) return
      const s = new Color(colors[i * 3], colors[i * 3 + 1], colors[i * 3 + 2]).convertLinearToSRGB()
      labs.push(srgbToLab(s.r, s.g, s.b))
    })
    assert.ok(labs.length > 0, `no stroke vertex of class ${cls}`)
    return [0, 1, 2].map((k) => labs.reduce((s, l) => s + l[k], 0) / labs.length) as Lab
  }
  const sourceMeanOf = ([x0, y0, x1, y1]: readonly [number, number, number, number]): Lab => {
    const source: Lab[] = []
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const i = (Math.floor(y * png.height / 1267) * png.width + Math.floor(x * png.width / 1600)) * 4
      source.push(srgbToLab(png.rgba[i] / 255, png.rgba[i + 1] / 255, png.rgba[i + 2] / 255))
    }
    return [0, 1, 2].map((k) => source.reduce((s, l) => s + l[k], 0) / source.length) as Lab
  }
  const dE = (a: Lab, b: Lab) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
  // the smock against the village's ultramarine swatch (#2a3f6f, index 1), a target read from palette.json and never
  // from VINCENT_SOURCES (Codex T1); its source patch is a second check, that the strokes keep their patch's colour
  const smockMean = meanOf(real.body, VINCENT_CLASS.smock)
  const smock = dE(smockMean, swatchMean('village', [1]))
  const fidelity = dE(smockMean, sourceMeanOf(VINCENT_SOURCES.smock))
  // the hat is the head's, in the crescent's ochre edge: its strokes keep their source patch's colour. The moon's body
  // swatch #c0b451 is printed, not asserted: the raw patch is 14.1 from it, and the render gate measures the hat against
  // the patch
  const hatMean = meanOf(real.head, VINCENT_CLASS.hat)
  const hat = dE(hatMean, sourceMeanOf(FORM.tarascon.hat))
  const moonBody = (palette.regions as Record<string, { colours: { hex: string; lab: number[] }[] }>).moon.colours.find((c) => c.hex === '#c0b451')
  assert.ok(moonBody, 'palette.json has no moon swatch #c0b451')
  const hatToMoon = dE(hatMean, moonBody.lab as Lab)
  assert.ok(smock < 10, `smock ΔE76 ${smock.toFixed(2)} from the village's ultramarine`)
  assert.ok(fidelity < 3, `smock ΔE76 ${fidelity.toFixed(2)} from its source patch`)
  assert.ok(hat < 3, `hat ΔE76 ${hat.toFixed(2)} from its source patch`)
  console.log(`[margin] smock ${smock.toFixed(2)} from the ultramarine, ${fidelity.toFixed(2)} from its source; hat ${hat.toFixed(2)} from its source, ${hatToMoon.toFixed(2)} from #c0b451`)
})

/** The figure as the component nests it (`70acd5b:src/scene/StreetWalk.tsx:571-627`): a mesh a part, the arm, head and leg
 * groups at their pivots, the lantern's group inside the left arm's, and a sprite (the halo) in the lantern's group at the
 * glass. Posed at Codex's mid-turn pose (the plan's Facts, `$E/probe/codex-v1-confirm/visible-click-probe.json`). */
const MID_TURN = { t: 0.7251969475, bodyPast: 1.2315043202, turn: 0.7, armLeft: -0.588, lantern: 0.3616545427 }

function figureTree(withSprite: boolean): { root: Group; meshes: Mesh[] } {
  const meshes: Mesh[] = []
  const mesh = (part: { positions: number[]; indices: number[] }) => {
    const g = new BufferGeometry()
    g.setAttribute('position', new Float32BufferAttribute(part.positions, 3))
    g.setIndex(part.indices)
    const m = new Mesh(g)
    meshes.push(m)
    return m
  }
  const partMeshes = (part: VincentPart) => [mesh({ positions: part.strokes.arrays.positions, indices: part.strokes.arrays.indices }), mesh(part.underpaint)]
  const pivoted = (part: VincentPart & { pivot: [number, number, number] }) => {
    const g = new Group()
    g.position.set(...part.pivot)
    g.add(...partMeshes(part))
    return g
  }
  const place = vincentPlace(MID_TURN.t)
  const root = new Group()
  root.rotation.order = 'YXZ'
  root.position.set(...place.position)
  root.rotation.set(0, place.yaw + MID_TURN.bodyPast, 0)
  root.add(...partMeshes(build.body))
  const armLeft = pivoted(build.armLeft)
  armLeft.rotation.set(MID_TURN.armLeft, 0, 0)
  const lantern = new Group()
  lantern.position.set(...build.lantern.pivot)
  lantern.rotation.set(MID_TURN.lantern, 0, 0)
  lantern.add(mesh(build.lantern.ink), mesh(build.lantern.glass))
  if (withSprite) {
    const halo = new Sprite()
    halo.position.set(0, -FORM.lantern.handle - FORM.lantern.cap - FORM.lantern.h / 2, 0)
    halo.scale.setScalar(0.05)
    lantern.add(halo)
  }
  armLeft.add(lantern)
  const head = pivoted(build.head)
  head.rotation.set(0, turnPose(MID_TURN.turn).head, 0)
  root.add(armLeft, pivoted(build.armRight), head, ...build.legs.map(pivoted), mesh(build.shadow))
  root.updateMatrixWorld(true)
  return { root, meshes }
}

test('a tap on him lands in his tap rect, mid-turn', () => {
  const { root, meshes } = figureTree(true)
  const figure = vincentFigureBounds(root)
  assert.ok(figure, 'the tree holds meshes')
  const world: Vector3[] = []
  for (const m of meshes) {
    const pos = m.geometry.getAttribute('position')
    for (let i = 0; i < pos.count; i++) world.push(new Vector3().fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld))
  }
  for (const [width, height, portrait] of [[1280, 800, false], [390, 844, true]] as const) {
    const pose = walkPose(MID_TURN.t, portrait)
    const camera = new PerspectiveCamera(pose.fov, width / height, STREET.near, STREET.far)
    camera.position.set(...pose.position)
    camera.lookAt(...pose.target)
    camera.updateMatrixWorld()
    const px = (p: Vector3) => {
      const v = p.clone().project(camera)
      return { x: ((v.x + 1) / 2) * width, y: ((1 - v.y) / 2) * height }
    }
    const rect = (corners: [number, number, number][]) => {
      const pts = corners.map((c) => px(new Vector3(...c)))
      return { x0: Math.min(...pts.map((p) => p.x)), x1: Math.max(...pts.map((p) => p.x)), y0: Math.min(...pts.map((p) => p.y)), y1: Math.max(...pts.map((p) => p.y)) }
    }
    const withFigure = rect(vincentTapCorners(MID_TURN.t, figure))
    const without = rect(vincentTapCorners(MID_TURN.t, null))
    let outside = 0
    let worst = 0
    for (const p of world) {
      const q = px(p)
      assert.ok(hitBox(withFigure, q.x, q.y), `${width} x ${height}: a vertex at (${q.x.toFixed(2)}, ${q.y.toFixed(2)}) lies outside the rect ${JSON.stringify(withFigure)}`)
      if (!hitBox(without, q.x, q.y)) {
        outside++
        // by how far the vertex lies outside the K3 rect, hitBox's own minimum size included
        const cx = (without.x0 + without.x1) / 2
        const cy = (without.y0 + without.y1) / 2
        const hw = Math.max((without.x1 - without.x0) / 2, WALK.hitMin / 2)
        const hh = Math.max((without.y1 - without.y0) / 2, WALK.hitMin / 2)
        worst = Math.max(worst, Math.abs(q.x - cx) - hw, Math.abs(q.y - cy) - hh)
      }
    }
    // the control: the K3 box alone misses part of him in this pose, or the test proves nothing
    assert.ok(outside > 0, `${width} x ${height}: with figure null no vertex lies outside the K3 rect`)
    console.log(`[control] ${width} x ${height}: with figure null ${outside} of ${world.length} vertices lie outside, the worst by ${worst.toFixed(2)} px`)
  }
})

test('the lantern\'s light is not his figure', () => {
  const withHalo = vincentFigureBounds(figureTree(true).root)
  const without = vincentFigureBounds(figureTree(false).root)
  assert.ok(withHalo && without)
  for (const k of [0, 1, 2]) {
    assert.ok(Math.abs(withHalo.min[k] - without.min[k]) < 1e-12, `min[${k}]: ${withHalo.min[k]} against ${without.min[k]}`)
    assert.ok(Math.abs(withHalo.max[k] - without.max[k]) < 1e-12, `max[${k}]: ${withHalo.max[k]} against ${without.max[k]}`)
  }
  const onlyHalo = new Group()
  onlyHalo.add(new Sprite())
  onlyHalo.updateMatrixWorld(true)
  assert.equal(vincentFigureBounds(onlyHalo), null)
})
