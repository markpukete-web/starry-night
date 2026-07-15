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
import { computeFillRegion, FILL_DILATED, FILL_FEATHER, FILL_HOLE, FILL_WISP } from './lib/fill-region.ts';
import { decodePNG, encodePNG } from './lib/png.ts';

// ---------------------------------------------------------------- config ----

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PAINTING = resolve(ROOT, 'public/reference/painting.jpg'); // committed web texture — the resolution we fill at
const SKY_MASK = resolve(ROOT, 'public/reference/sky-mask.png');
const WORK_PAINTING = resolve(ROOT, 'reference/derived/_work-painting.png');
const OUT_OVERLAY = resolve(ROOT, 'reference/derived/fill-region-overlay.png');
const OUT_CROP = resolve(ROOT, 'reference/derived/fill-region-crop.png');

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
    { u: 0.23, v: 0.036, r: 0.03 }, // red-cored star above the tip
    { u: 0.232, v: 0.172, r: 0.042 }, // swirled star the tip curls into
    { u: 0.327, v: 0.328, r: 0.028 }, // white-cored star right of the column
    { u: 0.129, v: 0.479, r: 0.045 }, // ringed star at the tree's left edge
  ],
};

const CROP_PAD = 40; // px around the fill bbox
const CROP_SCALE = 2; // nearest-neighbour zoom for the review crop

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
