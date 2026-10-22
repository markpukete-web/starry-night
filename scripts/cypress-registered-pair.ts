/*
 * Registered body pair for the cypress (E4.4, Codex F10, Fix F2): cuts one body window from the painting and one from
 * the render in each image's own pixels, using the treeish mask's extent (rows 34% to 60% from the top) and the central
 * 80% of the intersection of the trunk runs across every row of the band (tracked from the base). Prints the mask
 * coverage for each image and exits 1 if either is under 0.95. Resizes the render's window to the painting window's
 * height (nearest neighbour) and writes `<outPrefix>-painting.png`, `<outPrefix>-render.png`, and `<outPrefix>-pair-3x.png`.
 *
 *   node scripts/cypress-registered-pair.ts <desktop-centre.png> <outPrefix>
 */

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import { decodePNG, encodePNG } from './lib/png.ts'
import { alignRender, extent, runsOf, treeComponent, trunkRun, type Mask } from './lib/silhouette.ts'

export function bodyWindow(mask: Mask, ox: number, oy: number) {
  const ext = extent(mask)
  const y0 = Math.round(ext.top + 0.34 * ext.height)
  const y1 = Math.round(ext.top + 0.60 * ext.height)
  const h = Math.max(1, y1 - y0)
  let near = ext.baseCentre
  let interLeft = 0
  let interRight = mask.width - 1
  for (let y = ext.bottom; y >= y0; y--) {
    const tr = trunkRun(runsOf(mask, y), near)
    if (tr) near = (tr[0] + tr[1]) / 2
    if (y < y0 + h) {
      if (tr) {
        interLeft = Math.max(interLeft, tr[0])
        interRight = Math.min(interRight, tr[1])
      } else {
        interLeft = mask.width
        interRight = -1
      }
    }
  }
  const run: [number, number] = interLeft <= interRight ? [interLeft, interRight] : [Math.round(near), Math.round(near)]
  const rw = run[1] - run[0] + 1
  const x0 = Math.max(run[0], Math.round(run[0] + 0.1 * rw))
  const x1 = Math.min(run[1], Math.round(run[1] - 0.1 * rw))
  return { x: ox + x0, y: oy + y0, w: Math.max(1, x1 - x0 + 1), h, run }
}

export function maskCoverage(mask: Mask, ox: number, oy: number, win: { x: number; y: number; w: number; h: number }): number {
  let onTree = 0
  const total = win.w * win.h
  if (total === 0) return 0
  for (let py = 0; py < win.h; py++) {
    const my = win.y - oy + py
    for (let px = 0; px < win.w; px++) {
      const mx = win.x - ox + px
      if (mx >= 0 && mx < mask.width && my >= 0 && my < mask.height && mask.data[my * mask.width + mx] === 1) {
        onTree++
      }
    }
  }
  return onTree / total
}

function cropImage(src: { rgba: Uint8Array; width: number; height: number }, win: { x: number; y: number; w: number; h: number }) {
  const out = new Uint8Array(win.w * win.h * 4)
  for (let y = 0; y < win.h; y++) {
    for (let x = 0; x < win.w; x++) {
      const si = ((win.y + y) * src.width + (win.x + x)) * 4
      const di = (y * win.w + x) * 4
      out[di] = src.rgba[si]
      out[di + 1] = src.rgba[si + 1]
      out[di + 2] = src.rgba[si + 2]
      out[di + 3] = 255
    }
  }
  return { rgba: out, width: win.w, height: win.h }
}

function resizeNearest(src: { rgba: Uint8Array; width: number; height: number }, dstW: number, dstH: number) {
  const out = new Uint8Array(dstW * dstH * 4)
  for (let y = 0; y < dstH; y++) {
    const sy = Math.min(src.height - 1, Math.floor((y * src.height) / dstH))
    for (let x = 0; x < dstW; x++) {
      const sx = Math.min(src.width - 1, Math.floor((x * src.width) / dstW))
      const si = (sy * src.width + sx) * 4
      const di = (y * dstW + x) * 4
      out[di] = src.rgba[si]
      out[di + 1] = src.rgba[si + 1]
      out[di + 2] = src.rgba[si + 2]
      out[di + 3] = 255
    }
  }
  return { rgba: out, width: dstW, height: dstH }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const ROOT = resolve(import.meta.dirname, '..')
  const args = process.argv.slice(2)
  const capturePath = resolve(ROOT, args[0] ?? 'output/playwright/e1-measure-2026-10-21/desktop-centre.png')
  const outPrefix = resolve(ROOT, args[1] ?? 'reference/derived/cypress-reg')
  mkdirSync(resolve(outPrefix, '..'), { recursive: true })

  const [CX, CY, CW, CH] = [330, 80, 220, 578]

  const rows = JSON.parse(readFileSync(resolve(ROOT, 'public/reference/cypress-rows.json'), 'utf8')) as {
    uv?: number[]
    x0?: number
    y0?: number
    width: number
    height: number
  }
  const work = resolve(ROOT, 'reference/derived/cypress-work-1600.png')
  if (!existsSync(work)) {
    mkdirSync(resolve(work, '..'), { recursive: true })
    execFileSync('sips', ['-s', 'format', 'png', resolve(ROOT, 'public/reference/painting.jpg'), '--out', work], { stdio: 'ignore' })
  }
  const painting = decodePNG(readFileSync(work))
  const px0 = rows.uv ? Math.round(rows.uv[0] * painting.width) : rows.x0!
  const py0 = rows.uv ? Math.round(rows.uv[1] * painting.height) : rows.y0!
  const pw = rows.uv ? Math.round((rows.uv[2] - rows.uv[0]) * painting.width) : rows.width
  const ph = rows.uv ? Math.round((rows.uv[3] - rows.uv[1]) * painting.height) : rows.height
  const PX0 = Math.max(0, px0 - 40)
  const PW = Math.min(painting.width - PX0, pw + 80)
  const paintMask = treeComponent(painting.rgba, painting.width, PX0, py0, PW, ph, 1)

  const capture = decodePNG(readFileSync(capturePath))
  const renderMask = treeComponent(capture.rgba, capture.width, CX, CY, CW, CH, 1)
  const alignment = alignRender(paintMask, renderMask)

  const paintWin = bodyWindow(paintMask, PX0, py0)
  const renderWin = bodyWindow(renderMask, CX, CY)
  const paintCov = maskCoverage(paintMask, PX0, py0, paintWin)
  const renderCov = maskCoverage(renderMask, CX, CY, renderWin)

  const paintCrop = cropImage(painting, paintWin)
  const renderCropRaw = cropImage(capture, renderWin)
  const scaledRenderW = Math.max(1, Math.round((renderWin.w * paintWin.h) / renderWin.h))
  const renderCrop = resizeNearest(renderCropRaw, scaledRenderW, paintWin.h)

  writeFileSync(`${outPrefix}-painting.png`, encodePNG(paintCrop.width, paintCrop.height, paintCrop.rgba))
  writeFileSync(`${outPrefix}-render.png`, encodePNG(renderCrop.width, renderCrop.height, renderCrop.rgba))

  const paint3x = resizeNearest(paintCrop, paintCrop.width * 3, paintCrop.height * 3)
  const render3x = resizeNearest(renderCrop, renderCrop.width * 3, renderCrop.height * 3)
  const gap = 6
  const pairW = paint3x.width + gap + render3x.width
  const pairH = paint3x.height
  const pairRgba = new Uint8Array(pairW * pairH * 4)
  for (let y = 0; y < pairH; y++) {
    for (let x = 0; x < pairW; x++) {
      const di = (y * pairW + x) * 4
      if (x < paint3x.width) {
        const si = (y * paint3x.width + x) * 4
        pairRgba[di] = paint3x.rgba[si]
        pairRgba[di + 1] = paint3x.rgba[si + 1]
        pairRgba[di + 2] = paint3x.rgba[si + 2]
      } else if (x >= paint3x.width + gap) {
        const rx = x - paint3x.width - gap
        const si = (y * render3x.width + rx) * 4
        pairRgba[di] = render3x.rgba[si]
        pairRgba[di + 1] = render3x.rgba[si + 1]
        pairRgba[di + 2] = render3x.rgba[si + 2]
      }
      pairRgba[di + 3] = 255
    }
  }
  writeFileSync(`${outPrefix}-pair-3x.png`, encodePNG(pairW, pairH, pairRgba))
  console.log(
    JSON.stringify({
      scale: Number(alignment.scale.toFixed(3)),
      shift: alignment.shift,
      iou: Number(alignment.iou.toFixed(3)),
      paintingWindow: `${paintWin.w}x${paintWin.h}+${paintWin.x}+${paintWin.y}`,
      renderWindow: `${renderWin.w}x${renderWin.h}+${renderWin.x}+${renderWin.y}`,
      renderScaledSize: `${renderCrop.width}x${renderCrop.height}`,
      paintingCoverage: Number(paintCov.toFixed(4)),
      renderCoverage: Number(renderCov.toFixed(4)),
      maskCoverage: {
        painting: Number(paintCov.toFixed(4)),
        render: Number(renderCov.toFixed(4)),
      },
      files: [`${outPrefix}-painting.png`, `${outPrefix}-render.png`, `${outPrefix}-pair-3x.png`],
    }),
  )
  if (paintCov < 0.95 || renderCov < 0.95) {
    console.error(`FAIL: mask coverage below 0.95 (painting=${paintCov.toFixed(4)}, render=${renderCov.toFixed(4)})`)
    process.exit(1)
  }
}
