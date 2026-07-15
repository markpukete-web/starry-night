/**
 * Offline inpaint + extend pipeline (docs/superpowers/plans/2026-07-14-offline-inpaint-extend-pipeline.md).
 *
 * Fills the cypress cut-out hole (and its mask-missed wisp fringes) with real, flow-aligned
 * patches of the painting's own sky, baked as derived assets so the runtime simply renders
 * them. Dependency-free, same constraints as derive-reference.ts:
 *   - macOS `sips` for JPEG↔PNG conversion
 *   - Node built-in `zlib` for PNG IO (scripts/lib/png.ts)
 *   - plain arithmetic for everything else
 *
 * Slices (this file grows with the pipeline):
 *   S1 (this bake) — fill-region mask + overlay visualisation for eyeball agreement
 *   S2 — Criminisi-style exemplar inpainting → painting-filled.png + signed-flow-filled.png
 *   S4 — side extensions past the canvas edges
 *
 * Run: node scripts/extend-reference.ts
 * Outputs (S1, gitignored gate captures): reference/derived/fill-region-overlay.png,
 * reference/derived/fill-region-crop.png
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { MOON_R, MOON_UV } from '../src/scene/skySwirls.ts';
import { computeFillRegion, FILL_DILATED, FILL_FEATHER, FILL_HOLE, FILL_WISP, treeishColour } from './lib/fill-region.ts';
import { inpaint } from './lib/inpaint.ts';
import { decodePNG, encodePNG } from './lib/png.ts';

// ---------------------------------------------------------------- config ----

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PAINTING = resolve(ROOT, 'public/reference/painting.jpg'); // committed web texture — the resolution we fill at
const SKY_MASK = resolve(ROOT, 'public/reference/sky-mask.png');
const SIGNED_FLOW = resolve(ROOT, 'public/reference/signed-flow.png');
const WORK_PAINTING = resolve(ROOT, 'reference/derived/_work-painting.png');
const OUT_OVERLAY = resolve(ROOT, 'reference/derived/fill-region-overlay.png');
const OUT_CROP = resolve(ROOT, 'reference/derived/fill-region-crop.png');
const OUT_FILLED = resolve(ROOT, 'public/reference/painting-filled.png');
const OUT_FLOW_FILLED = resolve(ROOT, 'public/reference/signed-flow-filled.png');
const OUT_BEFORE_AFTER = resolve(ROOT, 'reference/derived/inpaint-before-after.png');
const OUT_FILLED_2X = resolve(ROOT, 'reference/derived/inpaint-filled-2x.png');

// Fill-region parameters. Band + mask thresholds mirror the runtime the pipeline replaces:
// openSkyBandV 0.62 (PaintingFlowSky3D), hole ≤ 16 / solid > 140 (streamlineGeometry.ts).
// Tree evidence (lum gate, treeish component fraction) + reach/dilation radii (px at 1600w)
// are this pipeline's own — retuned by eye against the overlay.
const FILL_OPTS = {
  skyBandV: 0.62,
  holeMaskMax: 16,
  featherMaskMax: 140,
  paintingLumMax: 0.55,
  minComponentPx: 32,
  treeishMinFraction: 0.25,
  componentReachPx: 56,
  bandBelowMarginV: 0.04,
  featherReachPx: 12,
  wispReachPx: 48,
  dilatePx: 6,
  moonUV: MOON_UV,
  moonGuardR: MOON_R * 1.6, // past the zeroed mask disc AND the painted umber outline ring
  // Painted star bodies near the fill zone, hand-measured from the painting via the
  // fill-region crop (the SWIRLS table anchors vortices and sits offset from the painted
  // stars, so it cannot supply these). Body + a small margin; see FillRegionOptions for
  // what guards do and don't block.
  starGuards: [
    { u: 0.104, v: 0.04, r: 0.035 }, // big yellow star, top-left
    { u: 0.23, v: 0.036, r: 0.026 }, // red-cored star above the tip (p2: shrunk — wisps survived inside)
    { u: 0.236, v: 0.172, r: 0.036 }, // swirled star the tip curls into (p2: shrunk + shifted off the tree
    // side so the wisp fringe crossing its outer halo gets cleaned; core + inner ring stay protected)
    { u: 0.327, v: 0.328, r: 0.028 }, // white-cored star right of the column
    { u: 0.129, v: 0.479, r: 0.045 }, // ringed star at the tree's left edge
  ],
};

const CROP_PAD = 40; // px around the fill bbox
const CROP_SCALE = 2; // nearest-neighbour zoom for the review crop

// Inpainting parameters (S2). SSD is per-known-pixel mean over 3 channels (typical good match
// ~300, bad ~10k), so flowWeight ~1500 makes stroke orientation a real vote without drowning
// colour. Bright-warm = star/moon light (warm AND bright — the pale BLUE swirl band must stay
// donatable, so plain luminance is not enough).
const INPAINT_OPTS = {
  patchRadius: 7, // 15×15 (p2: 13→15 — longer stroke continuity, fewer orientation breaks)
  // p3 probe (searchRadius 380 / topK 16) REGRESSED — wider search pulled in more varied
  // donors and creased the pale band; reverted to the p2 values.
  searchRadiusPx: 300,
  coarseStridePx: 6,
  refineTopK: 12,
  refineRadiusPx: 5,
  flowWeight: 2600, // p2: 1500→2600 — a vertical pale rectangle crossed horizontal strokes
  donorTreeishMaxFraction: 0.15,
  dataTermFloor: 0.15,
  featherAlpha: 0.22, // p2: 0.45→0.22 — heavy feather averaged away the impasto crispness
};
const BRIGHT_WARM_LUM = 0.62; // p2: 0.72→0.62 — pale green-yellow halo fringe donated a smear
const DONOR_GUARD_SCALE = 1.6; // p2: donors excluded within guard r × this (halo fringes must not donate)
const DONOR_EDGE_MARGIN_PX = 24; // p4: the canvas border strips are weave-heavy thin paint — donating
// them stippled the fill with canvas texture; keep donors off the edges

// ------------------------------------------------------------------ S1 ------

const t0 = Date.now();
mkdirSync(dirname(WORK_PAINTING), { recursive: true });

// Painting JPEG → PNG at its native resolution (sips, like derive-reference.ts).
execFileSync('sips', ['-s', 'format', 'png', PAINTING, '--out', WORK_PAINTING], { stdio: 'ignore' });
const painting = decodePNG(readFileSync(WORK_PAINTING));
const mask = decodePNG(readFileSync(SKY_MASK));
console.log(`painting ${painting.width}×${painting.height}, mask ${mask.width}×${mask.height}`);

const region = computeFillRegion(painting, mask, FILL_OPTS);
const { counts, bbox } = region;
const total = counts.hole + counts.feather + counts.wisp + counts.dilated;
const pct = ((100 * total) / (painting.width * painting.height)).toFixed(2);
console.log(
  `fill region: ${total} px (${pct}% of image) — hole ${counts.hole}, feather ${counts.feather}, wisp ${counts.wisp}, dilated ${counts.dilated}`,
);
console.log(
  `kept components: ${region.components.map((c) => `${c.px}px @ ${(c.treeishFraction * 100).toFixed(0)}% treeish, ${(c.guardedFraction * 100).toFixed(0)}% star-guarded`).join(', ') || 'none'}`,
);
if (!bbox) throw new Error('empty fill region — nothing to inpaint?');
console.log(`bbox x ${bbox.x0}–${bbox.x1}, y ${bbox.y0}–${bbox.y1}`);

// Overlay: the painting with each label class tinted (paint still visible underneath), plus
// a thin line marking the sky band so the gate can see the reach.
const TINTS: Record<number, [number, number, number]> = {
  [FILL_HOLE]: [255, 42, 42], // red — cut-out core
  [FILL_FEATHER]: [255, 157, 42], // orange — feathered edge near the core
  [FILL_WISP]: [255, 226, 42], // yellow — chroma-caught wisps
  [FILL_DILATED]: [42, 217, 255], // cyan — dilation margin
};
const TINT_MIX = 0.55;

const { width: w, height: h } = painting;
const overlay = new Uint8Array(painting.rgba);
for (let i = 0; i < w * h; i++) {
  const tint = TINTS[region.labels[i]];
  if (!tint) continue;
  const p = i * 4;
  overlay[p] = Math.round(overlay[p] * (1 - TINT_MIX) + tint[0] * TINT_MIX);
  overlay[p + 1] = Math.round(overlay[p + 1] * (1 - TINT_MIX) + tint[1] * TINT_MIX);
  overlay[p + 2] = Math.round(overlay[p + 2] * (1 - TINT_MIX) + tint[2] * TINT_MIX);
}
{
  const y = Math.min(h - 1, Math.round(FILL_OPTS.skyBandV * h));
  for (let x = 0; x < w; x++) {
    const p = (y * w + x) * 4;
    overlay[p] = 42;
    overlay[p + 1] = 255;
    overlay[p + 2] = 42;
  }
}
// Diagnostic: ring each star guard (green circle) so its placement against the painted star
// can be judged by eye.
for (const s of FILL_OPTS.starGuards) {
  for (let a = 0; a < 720; a++) {
    const x = Math.round((s.u + s.r * Math.cos((a * Math.PI) / 360)) * w);
    const y = Math.round((s.v + s.r * Math.sin((a * Math.PI) / 360)) * h);
    if (x < 0 || x >= w || y < 0 || y >= h) continue;
    const p = (y * w + x) * 4;
    overlay[p] = 42;
    overlay[p + 1] = 255;
    overlay[p + 2] = 42;
  }
}
writeFileSync(OUT_OVERLAY, encodePNG(w, h, overlay));

// Review crop: the fill bbox + padding, zoomed for the eyeball gate.
const cx0 = Math.max(0, bbox.x0 - CROP_PAD);
const cy0 = Math.max(0, bbox.y0 - CROP_PAD);
const cx1 = Math.min(w - 1, bbox.x1 + CROP_PAD);
const cy1 = Math.min(h - 1, bbox.y1 + CROP_PAD);
const cw = cx1 - cx0 + 1;
const ch = cy1 - cy0 + 1;
const crop = new Uint8Array(cw * CROP_SCALE * ch * CROP_SCALE * 4);
for (let y = 0; y < ch * CROP_SCALE; y++) {
  const sy = cy0 + Math.floor(y / CROP_SCALE);
  for (let x = 0; x < cw * CROP_SCALE; x++) {
    const sx = cx0 + Math.floor(x / CROP_SCALE);
    const sp = (sy * w + sx) * 4;
    const dp = (y * cw * CROP_SCALE + x) * 4;
    crop[dp] = overlay[sp];
    crop[dp + 1] = overlay[sp + 1];
    crop[dp + 2] = overlay[sp + 2];
    crop[dp + 3] = 255;
  }
}
writeFileSync(OUT_CROP, encodePNG(cw * CROP_SCALE, ch * CROP_SCALE, crop));

console.log(`wrote fill-region overlay + crop (${((Date.now() - t0) / 1000).toFixed(1)}s)`);

if (process.argv.includes('--s1-only')) process.exit(0);

// ------------------------------------------------------------------ S2 ------
// Exemplar inpainting: fill the region with real flow-aligned sky patches, bake
// painting-filled.png + signed-flow-filled.png, and write the flat review crops.

const t1 = Date.now();
const signedFlow = decodePNG(readFileSync(SIGNED_FLOW));

// Per-pixel flags at painting resolution.
const N = w * h;
const fill = new Uint8Array(N);
const donorOK = new Uint8Array(N);
const bright = new Uint8Array(N);
const treeish = new Uint8Array(N);
const flowPairs = new Float32Array(N * 2);
// Donors keep a wider berth than the fill guards: a star's pale halo fringe outside the guard
// must not be copied into the fill (it reads as a phantom halo fragment).
const donorGuardedAt = (u: number, v: number): boolean => {
  if (Math.hypot(u - FILL_OPTS.moonUV[0], v - FILL_OPTS.moonUV[1]) < FILL_OPTS.moonGuardR * DONOR_GUARD_SCALE)
    return true;
  return FILL_OPTS.starGuards.some((s) => Math.hypot(u - s.u, v - s.v) < s.r * DONOR_GUARD_SCALE);
};
for (let y = 0; y < h; y++) {
  const v = (y + 0.5) / h;
  for (let x = 0; x < w; x++) {
    const i = y * w + x;
    const u = (x + 0.5) / w;
    const p = i * 4;
    const r8 = painting.rgba[p];
    const g8 = painting.rgba[p + 1];
    const b8 = painting.rgba[p + 2];
    const lum = (0.299 * r8 + 0.587 * g8 + 0.114 * b8) / 255;
    const offEdge =
      x >= DONOR_EDGE_MARGIN_PX && x < w - DONOR_EDGE_MARGIN_PX && y >= DONOR_EDGE_MARGIN_PX;
    if (region.labels[i] !== 0) fill[i] = 1;
    else if (v < FILL_OPTS.skyBandV && offEdge && !donorGuardedAt(u, v)) donorOK[i] = 1;
    if (lum >= BRIGHT_WARM_LUM && b8 < Math.max(r8, g8)) bright[i] = 1;
    if (treeishColour(r8 / 255, g8 / 255, b8 / 255)) treeish[i] = 1;
    // signed flow, nearest texel, decoded to a direction pair
    const fx = Math.min(signedFlow.width - 1, Math.floor(u * signedFlow.width));
    const fy = Math.min(signedFlow.height - 1, Math.floor(v * signedFlow.height));
    const fp = (fy * signedFlow.width + fx) * 4;
    const dx = (signedFlow.rgba[fp] / 255) * 2 - 1;
    const dy = (signedFlow.rgba[fp + 1] / 255) * 2 - 1;
    const m = Math.hypot(dx, dy) || 1;
    flowPairs[i * 2] = dx / m;
    flowPairs[i * 2 + 1] = dy / m;
  }
}

const result = inpaint(painting, { fill, donorOK, bright, treeish, flow: flowPairs }, INPAINT_OPTS);
console.log(`inpainted ${counts.hole + counts.feather + counts.wisp + counts.dilated} px in ${result.placements.length} placements (${((Date.now() - t1) / 1000).toFixed(1)}s)`);

// Hard invariant: pixels outside the fill region are byte-identical to the source painting.
for (let i = 0; i < N; i++) {
  if (region.labels[i] !== 0) continue;
  const p = i * 4;
  if (
    result.rgba[p] !== painting.rgba[p] ||
    result.rgba[p + 1] !== painting.rgba[p + 1] ||
    result.rgba[p + 2] !== painting.rgba[p + 2]
  )
    throw new Error(`inpaint touched original paint at px ${i % w},${(i / w) | 0}`);
}

writeFileSync(OUT_FILLED, encodePNG(w, h, result.rgba));

// Flow fill: each filled flow texel copies from wherever its paint came from, then the filled
// texels are low-passed back to the field's native smoothness. The original field is smooth by
// construction (Gaussian structure-tensor integration in derive-reference.ts); raw donor
// patchwork is blocky, and ribbons integrating through blocky flow wobble exactly where the
// ghost used to be. The blur only ever WRITES filled texels — original flow stays untouched.
const flowFilled = new Uint8Array(signedFlow.rgba);
const fw = signedFlow.width;
const fh = signedFlow.height;
const flowTexelFilled = new Uint8Array(fw * fh);
for (let y = 0; y < fh; y++) {
  const py = Math.min(h - 1, Math.floor(((y + 0.5) / fh) * h));
  for (let x = 0; x < fw; x++) {
    const px = Math.min(w - 1, Math.floor(((x + 0.5) / fw) * w));
    const i = py * w + px;
    if (region.labels[i] === 0 || result.srcOf[i] < 0) continue;
    const s = result.srcOf[i];
    const sx = Math.min(fw - 1, Math.floor((((s % w) + 0.5) / w) * fw));
    const sy = Math.min(fh - 1, Math.floor(((((s / w) | 0) + 0.5) / h) * fh));
    const sp = (sy * fw + sx) * 4;
    const dp = (y * fw + x) * 4;
    flowFilled[dp] = signedFlow.rgba[sp];
    flowFilled[dp + 1] = signedFlow.rgba[sp + 1];
    flowFilled[dp + 2] = signedFlow.rgba[sp + 2];
    flowFilled[dp + 3] = signedFlow.rgba[sp + 3];
    flowTexelFilled[y * fw + x] = 1;
  }
}
{
  const FLOW_BLUR_SIGMA = 2;
  const kr = Math.ceil(FLOW_BLUR_SIGMA * 3);
  const kernel: number[] = [];
  for (let k = -kr; k <= kr; k++) kernel.push(Math.exp(-(k * k) / (2 * FLOW_BLUR_SIGMA * FLOW_BLUR_SIGMA)));
  const blurred = new Uint8Array(flowFilled);
  for (let y = 0; y < fh; y++) {
    for (let x = 0; x < fw; x++) {
      if (!flowTexelFilled[y * fw + x]) continue;
      let sr = 0;
      let sg = 0;
      let sb = 0;
      let wsum = 0;
      for (let ky = -kr; ky <= kr; ky++) {
        const yy = y + ky;
        if (yy < 0 || yy >= fh) continue;
        for (let kx = -kr; kx <= kr; kx++) {
          const xx = x + kx;
          if (xx < 0 || xx >= fw) continue;
          const wgt = kernel[ky + kr] * kernel[kx + kr];
          const p = (yy * fw + xx) * 4;
          sr += flowFilled[p] * wgt;
          sg += flowFilled[p + 1] * wgt;
          sb += flowFilled[p + 2] * wgt;
          wsum += wgt;
        }
      }
      const dp = (y * fw + x) * 4;
      blurred[dp] = Math.round(sr / wsum);
      blurred[dp + 1] = Math.round(sg / wsum);
      blurred[dp + 2] = Math.round(sb / wsum);
    }
  }
  writeFileSync(OUT_FLOW_FILLED, encodePNG(fw, fh, blurred));
}

// Review crops for the flat-image gate: original vs filled side by side at 1×, filled at 2×.
const gap = 6;
const baW = cw * 2 + gap;
const beforeAfter = new Uint8Array(baW * ch * 4).fill(255);
for (let y = 0; y < ch; y++) {
  for (let x = 0; x < cw; x++) {
    const sp = ((cy0 + y) * w + (cx0 + x)) * 4;
    const dl = (y * baW + x) * 4;
    const dr = (y * baW + cw + gap + x) * 4;
    for (let k = 0; k < 3; k++) {
      beforeAfter[dl + k] = painting.rgba[sp + k];
      beforeAfter[dr + k] = result.rgba[sp + k];
    }
    beforeAfter[dl + 3] = 255;
    beforeAfter[dr + 3] = 255;
  }
}
writeFileSync(OUT_BEFORE_AFTER, encodePNG(baW, ch, beforeAfter));

const f2 = new Uint8Array(cw * 2 * ch * 2 * 4);
for (let y = 0; y < ch * 2; y++) {
  const sy = cy0 + (y >> 1);
  for (let x = 0; x < cw * 2; x++) {
    const sx = cx0 + (x >> 1);
    const sp = (sy * w + sx) * 4;
    const dp = (y * cw * 2 + x) * 4;
    f2[dp] = result.rgba[sp];
    f2[dp + 1] = result.rgba[sp + 1];
    f2[dp + 2] = result.rgba[sp + 2];
    f2[dp + 3] = 255;
  }
}
writeFileSync(OUT_FILLED_2X, encodePNG(cw * 2, ch * 2, f2));

console.log(`wrote painting-filled.png, signed-flow-filled.png + review crops (total ${((Date.now() - t0) / 1000).toFixed(1)}s)`);
