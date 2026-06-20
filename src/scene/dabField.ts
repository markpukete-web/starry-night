import { Vector3 } from 'three'
import type { ImageData2D } from './useImageData.ts'
import type { FlowField } from './flowField.ts'
import { mulberry32, sampleColour } from './brush.ts'
import { ANCHOR_UVS, HORIZON, POINTS, STEP, dirAzEl, frontUV, uvToFrontDir } from './skyMapping.ts'

export type Dab = {
  dir: Vector3
  tangent: Vector3
  color: [number, number, number]
  scale: number
  phase: number
  drift: number
}

export function buildDabField({
  field,
  colourSrc,
  count,
  seed = 0x13ade7,
  frontFraction = 0.6,
  anchorFraction = 0.5,
}: {
  field: FlowField
  colourSrc: ImageData2D
  count: number
  seed?: number
  frontFraction?: number
  anchorFraction?: number
}): Dab[] {
  const rng = mulberry32(seed)
  const dabs: Dab[] = []
  const p = new Vector3()
  const f = new Vector3()
  const dir = new Vector3()
  let guard = 0

  while (dabs.length < count && guard < count * 20) {
    guard++
    // seed: front-biased onto the painting arc — densified around the anchors (swirl eyes, Venus,
    // stars) where impasto piles thickest — else spread across the front, else uniform over the dome.
    if (rng() < frontFraction) {
      if (rng() < anchorFraction) {
        const a = ANCHOR_UVS[Math.floor(rng() * ANCHOR_UVS.length)]
        p.copy(uvToFrontDir(a[0] + (rng() - 0.5) * 0.12, a[1] + (rng() - 0.5) * 0.12))
      } else {
        p.copy(uvToFrontDir(0.04 + rng() * 0.92, 0.03 + rng() * 0.6))
      }
    } else {
      p.copy(dirAzEl(rng() * Math.PI * 2, HORIZON + 0.04 + rng() * 1.5))
    }

    let have = false
    for (let k = 0; k < POINTS && dabs.length < count; k++) {
      field(p, f)
      if (f.lengthSq() < 1e-8) {
        if (!have) break
        f.copy(dir)
        f.addScaledVector(p, -f.dot(p)) // keep the reused heading ⊥ the current p
        if (f.lengthSq() < 1e-8) break
        f.normalize()
      } else {
        f.normalize()
        if (have && f.dot(dir) < 0) f.multiplyScalar(-1)
      }
      dir.copy(f)
      have = true

      // colour: painting-accurate on the front arc, palette-consistent (random sky pixel) on the back
      const fuv = frontUV(p)
      const cu = fuv.onArc ? fuv.u : 0.05 + rng() * 0.9
      const cv = fuv.onArc ? fuv.v : rng() * 0.5

      dabs.push({
        dir: p.clone(),
        tangent: dir.clone(),
        color: sampleColour(colourSrc, cu, cv),
        scale: 0.045 + 0.05 * rng(),
        phase: rng(),
        drift: 0.6 + 0.8 * rng(),
      })

      p.addScaledVector(dir, STEP).normalize()
      if (p.y < HORIZON) break
    }
  }
  return dabs
}
