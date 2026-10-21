/**
 * One rule for a tree's silhouette in any image (E1's gates, `cypress-silhouette.ts` and `check-cypress-colour.ts`):
 * the treeish pixels of a crop, opened by 1 px to cut hairline bridges to dark sky strokes, then the 4-connected
 * component holding the column with the most tree. The painting and the render are measured by the same rule, so
 * neither side carries a projected stencil (Codex F9, 2026-10-21).
 */

import { treeishColour } from './fill-region.ts'

export type Mask = { data: Uint8Array; width: number; height: number }

function morph(src: Mask, radius: number, dilate: boolean): Mask {
  const { width: w, height: h } = src
  const out = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let v = dilate ? 0 : 1
      outer: for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const xx = x + dx
          const yy = y + dy
          const s = xx < 0 || yy < 0 || xx >= w || yy >= h ? 0 : src.data[yy * w + xx]
          if (dilate && s) { v = 1; break outer }
          if (!dilate && !s) { v = 0; break outer }
        }
      }
      out[y * w + x] = v
    }
  }
  return { data: out, width: w, height: h }
}

/** Treeish pixels of a crop, opened by `open` px, then the component holding the column with the most tree. */
export function treeComponent(rgba: Uint8Array | Uint8ClampedArray, imageWidth: number, x0: number, y0: number, w: number, h: number, open: number): Mask {
  const tree = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = ((y + y0) * imageWidth + x + x0) * 4
      tree[y * w + x] = treeishColour(rgba[i] / 255, rgba[i + 1] / 255, rgba[i + 2] / 255) ? 1 : 0
    }
  }
  const opened = open > 0 ? morph(morph({ data: tree, width: w, height: h }, open, false), open, true) : { data: tree, width: w, height: h }
  let bestX = 0
  let bestCount = 0
  for (let x = 0; x < w; x++) {
    let count = 0
    for (let y = 0; y < h; y++) count += opened.data[y * w + x]
    if (count > bestCount) { bestCount = count; bestX = x }
  }
  const comp = new Uint8Array(w * h)
  const stack: number[] = []
  for (let y = 0; y < h; y++) if (opened.data[y * w + bestX]) stack.push(y * w + bestX)
  while (stack.length) {
    const i = stack.pop()!
    if (comp[i] || !opened.data[i]) continue
    comp[i] = 1
    const x = i % w
    const y = (i - x) / w
    if (x > 0) stack.push(i - 1)
    if (x < w - 1) stack.push(i + 1)
    if (y > 0) stack.push(i - w)
    if (y < h - 1) stack.push(i + w)
  }
  return { data: comp, width: w, height: h }
}

/** The runs on a row. */
export function runsOf(mask: Mask, y: number): [number, number][] {
  const runs: [number, number][] = []
  let start = -1
  for (let x = 0; x <= mask.width; x++) {
    const on = x < mask.width && mask.data[y * mask.width + x] === 1
    if (on && start < 0) start = x
    if (!on && start >= 0) { runs.push([start, x - 1]); start = -1 }
  }
  return runs
}

/** The trunk run: the one nearest `nearX` (the previous row's trunk centre), the wider on a tie. */
export function trunkRun(runs: [number, number][], nearX: number): [number, number] | null {
  let best: [number, number] | null = null
  let bestDistance = Infinity
  for (const run of runs) {
    const distance = nearX < run[0] ? run[0] - nearX : nearX > run[1] ? nearX - run[1] : 0
    if (distance < bestDistance || (distance === bestDistance && best && run[1] - run[0] > best[1] - best[0])) { bestDistance = distance; best = run }
  }
  return best
}

/** The vertical extent of a mask, its pixel count, and its trunk's base centre (the mean trunk-run centre over the lowest 10%). */
export function extent(mask: Mask) {
  let top = mask.height
  let bottom = -1
  let pixels = 0
  for (let y = 0; y < mask.height; y++) for (let x = 0; x < mask.width; x++) if (mask.data[y * mask.width + x]) { pixels++; if (y < top) top = y; if (y > bottom) bottom = y }
  const height = bottom - top + 1
  let sum = 0
  let count = 0
  let nearX = mask.width / 2
  for (let y = bottom; y > bottom - height * 0.1; y--) {
    const run = trunkRun(runsOf(mask, y), nearX)
    if (!run) continue
    nearX = (run[0] + run[1]) / 2
    sum += nearX
    count++
  }
  return { top, bottom, height, pixels, baseCentre: count ? sum / count : nearX }
}
