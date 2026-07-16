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
 *   S1 — fill-region mask + overlay visualisation for eyeball agreement
 *   S2 — Criminisi-style exemplar inpainting → painting-filled.png + signed-flow-filled.png
 *   S4 — side extensions past the canvas edges → sky-extend-{left,right}.png (+ flow strips)
 *
 * Run: node scripts/extend-reference.ts  (--s1-only / --s2-only stop after that slice)
 * Committed outputs land in public/reference/; gitignored gate captures (fill-region overlay
 * + crop, inpaint before/after, side-extend seam/flow crops) land in reference/derived/
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { MOON_R, MOON_UV, SWIRLS } from '../src/scene/skySwirls.ts';
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
  // p5 probe (patchRadius 10) REGRESSED: bigger patches carried whole strokes but tiled the
  // fill with block-tone rectangles — the real culprit was patch-to-patch tonal mismatch,
  // now fixed by toneShiftMax instead. Back to 15×15.
  patchRadius: 7,
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
  toneShiftMax: 14, // p6 (Mark's circled zone): donors shift toward the target's known mean so
  // adjacent placements agree in base tone — no more rectangle tiling in the pale band
};
const BRIGHT_WARM_LUM = 0.62; // p2: 0.72→0.62 — pale green-yellow halo fringe donated a smear
const DONOR_GUARD_SCALE = 1.6; // p2: donors excluded within guard r × this (halo fringes must not donate)
const DONOR_EDGE_MARGIN_PX = 24; // p4: the canvas border strips are weave-heavy thin paint — donating
// them stippled the fill with canvas texture; keep donors off the edges

// Side extension (S4). Margin measured from the orbit envelope (scratch/measure-exposure.ts):
// every reachable drag/zoom pose exposes ≤ 0.14 of canvas width past an edge (worst: mobile
// home 0.133 right; drag boundaries at max distance ~0.09–0.10); the look-down horizon sweep
// reaches much further but melts into the night gradient via the runtime side fade
// (dioramaSkyProjection). 0.30 per side keeps full paint over every direct exposure with the
// approved plan's 25–35% guidance respected; the runtime fade starts at 0.15 past the edge.
const SIDE_MARGIN_U = 0.3;
// The scan's raw canvas-weave border (the painting's unpainted physical edge): left weave
// fades out by x≈18, right starts by x≈1580 at 1600w (measured, scratch/measure-border.ts).
// It is not paint — it read as a pale vertical tear once mounted at full alpha (p1), and it
// poisoned the continuation's colour/flow context. The side strips OWN these columns: the S4
// fill regrows them from real paint, and the runtime renders the strip texture over them.
// painting-filled.png — Mark's gate-passed S2 asset — stays byte-identical.
const SIDE_BORDER_PX = 20;
const SIDE_INPAINT_OPTS = {
  ...INPAINT_OPTS,
  // whole-sky donor domain (the plan's S4 contract): the radius covers the full padded width
  // from any strip texel; the coarser lattice keeps the candidate count near the S2 cost
  searchRadiusPx: 2200,
  coarseStridePx: 10,
};
// Below this circulation magnitude the SWIRLS field has nothing to say (the strips are outside
// every swirl's reach by design — no invented anchors), and the copied vector's sign follows
// the inward neighbourhood instead: the directed churn continues smoothly out of the canvas.
const SIDE_SIGN_CIRC_EPS = 0.02;
const OUT_EXTEND = (side: string) => resolve(ROOT, `public/reference/sky-extend-${side}.png`);
const OUT_EXTEND_FLOW = (side: string) => resolve(ROOT, `public/reference/sky-extend-flow-${side}.png`);
const OUT_EXTEND_CROP = (side: string, kind: string) => resolve(ROOT, `reference/derived/side-extend-${side}-${kind}.png`);
const OUT_EXTEND_OVERVIEW = resolve(ROOT, 'reference/derived/side-extend-overview.png');

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

// Flow fill: each filled flow texel copies from wherever its paint came from — then two
// corrections restore the field's contract:
//  1. SIGN RE-ALIGNMENT. signed-flow is DIRECTED: derive-reference sign-aligns each vector to
//     the SWIRLS circulation field at its own position. A donor's vector was aligned at the
//     DONOR's position; at the target the circulation can point the other way, so verbatim
//     copies flip against the local churn — and blurring opposing vectors cancels them into
//     aimless mush the ribbons wander through ("out of flow", Mark's live catch 2026-07-16).
//     Re-align every copied vector to the circulation at the TARGET texel, exactly as the
//     Phase-0 bake does.
//  2. LOW-PASS back to the field's native smoothness (Gaussian tensor integration upstream);
//     raw donor patchwork is blocky. Blur only ever WRITES filled texels.
const flowFilled = new Uint8Array(signedFlow.rgba);
const fw = signedFlow.width;
const fh = signedFlow.height;
const flowTexelFilled = new Uint8Array(fw * fh);
const circAt = (u: number, v: number): [number, number] => {
  let cx = 0;
  let cy = 0;
  for (const [sx, sy, s, r] of SWIRLS) {
    const du = u - sx;
    const dv = v - sy;
    const wgt = Math.exp(-(du * du + dv * dv) / (r * r));
    cx += s * -dv * wgt; // tangential = sign · perp(p − centre), as in derive-reference.ts
    cy += s * du * wgt;
  }
  return [cx, cy];
};
let flipped = 0;
let copied = 0;
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
    let dx = (signedFlow.rgba[sp] / 255) * 2 - 1;
    let dy = (signedFlow.rgba[sp + 1] / 255) * 2 - 1;
    const [cx, cy] = circAt((x + 0.5) / fw, (y + 0.5) / fh);
    copied++;
    if (dx * cx + dy * cy < 0) {
      dx = -dx;
      dy = -dy;
      flipped++;
    }
    flowFilled[dp] = Math.round((dx * 0.5 + 0.5) * 255);
    flowFilled[dp + 1] = Math.round((dy * 0.5 + 0.5) * 255);
    flowFilled[dp + 2] = signedFlow.rgba[sp + 2];
    flowFilled[dp + 3] = signedFlow.rgba[sp + 3];
    flowTexelFilled[y * fw + x] = 1;
  }
}
console.log(`flow fill: ${copied} texels copied, ${flipped} sign-flipped to the local circulation (${((100 * flipped) / Math.max(1, copied)).toFixed(0)}%)`);
/** Gaussian σ=2 low-pass over ONLY the flagged texels (restores the field's native smoothness
 *  after donor patchwork; the kernel READS every texel, so seams blend across the boundary). */
function blurFlowTexels(buf: Uint8Array, bw: number, bh: number, flagged: Uint8Array): Uint8Array {
  const FLOW_BLUR_SIGMA = 2;
  const kr = Math.ceil(FLOW_BLUR_SIGMA * 3);
  const kernel: number[] = [];
  for (let k = -kr; k <= kr; k++) kernel.push(Math.exp(-(k * k) / (2 * FLOW_BLUR_SIGMA * FLOW_BLUR_SIGMA)));
  const blurred = new Uint8Array(buf);
  for (let y = 0; y < bh; y++) {
    for (let x = 0; x < bw; x++) {
      if (!flagged[y * bw + x]) continue;
      let sr = 0;
      let sg = 0;
      let sb = 0;
      let wsum = 0;
      for (let ky = -kr; ky <= kr; ky++) {
        const yy = y + ky;
        if (yy < 0 || yy >= bh) continue;
        for (let kx = -kr; kx <= kr; kx++) {
          const xx = x + kx;
          if (xx < 0 || xx >= bw) continue;
          const wgt = kernel[ky + kr] * kernel[kx + kr];
          const p = (yy * bw + xx) * 4;
          sr += buf[p] * wgt;
          sg += buf[p + 1] * wgt;
          sb += buf[p + 2] * wgt;
          wsum += wgt;
        }
      }
      const dp = (y * bw + x) * 4;
      blurred[dp] = Math.round(sr / wsum);
      blurred[dp + 1] = Math.round(sg / wsum);
      blurred[dp + 2] = Math.round(sb / wsum);
    }
  }
  return blurred;
}

const flowFilledFinal = blurFlowTexels(flowFilled, fw, fh, flowTexelFilled);
writeFileSync(OUT_FLOW_FILLED, encodePNG(fw, fh, flowFilledFinal));

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

if (process.argv.includes('--s2-only')) process.exit(0);

// ------------------------------------------------------------------ S4 ------
// Side extension: continue the painting past its L/R edges with the same exemplar machinery.
// Seeding from the edge columns happens by construction — the onion-peel boundary starts where
// the strip touches the canvas, so stroke streams grow outward from real paint. Donors come
// from the WHOLE original sky band (the plan's S4 contract), with every S2 gate intact: no
// bright-core donation (no phantom stars/moon), treeish budget, guard exclusions, no synthetic
// (S1-filled) pixels ever donating. The strips are baked at full paint strength; the RUNTIME
// owns the outward melt into the night gradient (the side fade in dioramaSkyProjection.ts), so
// these assets stay reviewable as pure continuation content.

const t2 = Date.now();
const padPx = Math.round(SIDE_MARGIN_U * w); // 480 at 1600w
const padF = Math.round(SIDE_MARGIN_U * fw); // 384 at 1280w flow
const SKY_CROP_BOTTOM = 0.72; // review crops show the drawable band; the assets keep full height

type SideName = 'left' | 'right';
type SideBake = {
  side: SideName;
  ext: ReturnType<typeof inpaint>;
  strip: Uint8Array;
  Wp: number;
  off: number;
  stripX0: number;
  flowWide: Uint8Array;
  fwP: number;
  offF: number;
};

const bakeSide = (side: SideName): SideBake => {
  const tSide = Date.now();
  const off = side === 'left' ? padPx : 0; // painting x-offset inside the padded image
  const Wp = w + padPx;
  const stripX0 = side === 'left' ? 0 : w; // strip columns in padded coords

  // Padded buffers: the S2-FILLED painting (what the runtime renders — its edge columns are
  // the continuation context, including baked fill where the old cut-out met the border) plus
  // an unknown strip. Flags translate from the S2 arrays; donorOK already excludes the S1
  // region, guards, bright cores and the weave-heavy canvas border.
  const Np = Wp * h;
  const rgbaP = new Uint8Array(Np * 4);
  const fillP = new Uint8Array(Np);
  const donorOKP = new Uint8Array(Np);
  const brightP = new Uint8Array(Np);
  const treeishP = new Uint8Array(Np);
  const flowPairsP = new Float32Array(Np * 2);
  for (let y = 0; y < h; y++) {
    rgbaP.set(result.rgba.subarray(y * w * 4, (y + 1) * w * 4), (y * Wp + off) * 4);
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const ip = y * Wp + x + off;
      donorOKP[ip] = donorOK[i];
      brightP[ip] = bright[i];
      treeishP[ip] = treeish[i];
      // flow context = the FILLED field (what the runtime integrates), so boundary columns
      // beside the old cut-out read the baked continuation, not the cut-out's garbage
      const fx = Math.min(fw - 1, Math.floor(((x + 0.5) / w) * fw));
      const fy = Math.min(fh - 1, Math.floor(((y + 0.5) / h) * fh));
      const fp = (fy * fw + fx) * 4;
      const dx = (flowFilledFinal[fp] / 255) * 2 - 1;
      const dy = (flowFilledFinal[fp + 1] / 255) * 2 - 1;
      const m = Math.hypot(dx, dy) || 1;
      flowPairsP[ip * 2] = dx / m;
      flowPairsP[ip * 2 + 1] = dy / m;
    }
    // the WHOLE strip height is fill: partial-height fill would leave black "known" texels
    // feeding SSD context, and ribbons that wander below the band must still find paint
    for (let x = stripX0; x < stripX0 + padPx; x++) fillP[y * Wp + x] = 1;
    // ...plus the canvas-weave border columns the strip owns (see SIDE_BORDER_PX)
    const bx0 = side === 'left' ? off : off + w - SIDE_BORDER_PX;
    for (let x = bx0; x < bx0 + SIDE_BORDER_PX; x++) fillP[y * Wp + x] = 1;
  }

  // ---- smooth directed reference field (built BEFORE the colour fill: it guides it) --------
  // The 07-16 rule: whenever flow values move to a new position, re-run sign alignment at the
  // DESTINATION. Outside the canvas the SWIRLS circulation is near-silent (no invented
  // anchors), so the workhorse reference is the canvas edge vectors RELAXED across the strip
  // (Jacobi over a row-anchored init): a smooth directed field. p1 lesson: a per-texel
  // inward-neighbour chain is unstable wherever donor orientation runs near-perpendicular to
  // it — trails stalled into dashes; a relaxed global reference doesn't.
  const fwP = fw + padF;
  const offF = side === 'left' ? padF : 0;
  const borderF = Math.round((SIDE_BORDER_PX * fw) / w);
  const flowWide = new Uint8Array(fwP * fh * 4);
  const flaggedWide = new Uint8Array(fwP * fh);
  for (let y = 0; y < fh; y++)
    flowWide.set(flowFilledFinal.subarray(y * fw * 4, (y + 1) * fw * 4), (y * fwP + offF) * 4);

  // fill-flow columns in wide coords: the strip plus the border columns it owns
  const ffx0 = side === 'left' ? 0 : fw - borderF;
  const ffx1 = side === 'left' ? padF + borderF : fw + padF; // exclusive
  const anchorX = side === 'left' ? ffx1 : ffx0 - 1; // innermost untouched real-paint column
  const refW = ffx1 - ffx0;

  const anchorVecRaw = (fy: number): [number, number] => {
    const ap = (fy * fwP + anchorX) * 4;
    const dx = (flowWide[ap] / 255) * 2 - 1;
    const dy = (flowWide[ap + 1] / 255) * 2 - 1;
    const m = Math.hypot(dx, dy) || 1;
    return [dx / m, dy / m];
  };
  // p3 lesson: raw anchors extrapolate LOCAL edge features (a star ring's vertical tangents,
  // the dark corner's diagonals) across the whole strip — the flow diagnostic showed a
  // waterfall. The painting's own behaviour is local feature at the seam relaxing into the
  // ambient churn, so: (a) vertically smooth the anchors (σ≈16 texels) to wash out blips,
  // (b) blend the reference outward toward the sky band's ambient edge direction.
  const anchorSm = new Float32Array(fh * 2);
  {
    const SIG = 16;
    const kr = SIG * 3;
    for (let fy = 0; fy < fh; fy++) {
      let sx = 0;
      let sy = 0;
      for (let k = -kr; k <= kr; k++) {
        const yy = fy + k;
        if (yy < 0 || yy >= fh) continue;
        const [dx, dy] = anchorVecRaw(yy);
        const wgt = Math.exp(-(k * k) / (2 * SIG * SIG));
        sx += dx * wgt;
        sy += dy * wgt;
      }
      const m = Math.hypot(sx, sy) || 1;
      anchorSm[fy * 2] = sx / m;
      anchorSm[fy * 2 + 1] = sy / m;
    }
  }
  // p4 probe REVERTED: blending the reference outward toward one global "ambient" direction
  // collapsed the strips into a monotone diagonal curtain — per-row anchor directions are what
  // keep the continuation's stroke variety (p3's paint read best). Smoothing alone stays.
  let ref = new Float32Array(refW * fh * 2);
  for (let fy = 0; fy < fh; fy++) {
    for (let x = 0; x < refW; x++) {
      ref[(fy * refW + x) * 2] = anchorSm[fy * 2];
      ref[(fy * refW + x) * 2 + 1] = anchorSm[fy * 2 + 1];
    }
  }
  let refNext = new Float32Array(ref.length);
  const innerX = side === 'left' ? refW - 1 : 0; // region column adjacent to the anchor
  for (let it = 0; it < 40; it++) {
    for (let fy = 0; fy < fh; fy++) {
      for (let x = 0; x < refW; x++) {
        let sx = 0;
        let sy = 0;
        const add = (xx: number, yy: number): void => {
          sx += ref[(yy * refW + xx) * 2];
          sy += ref[(yy * refW + xx) * 2 + 1];
        };
        if (fy > 0) add(x, fy - 1);
        if (fy < fh - 1) add(x, fy + 1);
        if (x > 0) add(x - 1, fy);
        if (x < refW - 1) add(x + 1, fy);
        if (x === innerX) {
          // Dirichlet at the canvas side: the (smoothed) anchor keeps injecting the edge flow
          sx += anchorSm[fy * 2];
          sy += anchorSm[fy * 2 + 1];
        }
        const p = (fy * refW + x) * 2;
        const m = Math.hypot(sx, sy) || 1; // normalised mean direction
        refNext[p] = sx / m;
        refNext[p + 1] = sy / m;
      }
    }
    ;[ref, refNext] = [refNext, ref];
  }

  // Guide flow at painting resolution: donor scoring for every strip target agrees with the
  // SAME smoothly-extrapolated field the ribbons will later integrate. p2 lesson: deep in the
  // strip the fill's context is entirely previously-filled pixels, and context-mean flow
  // degenerates into patch-scale hatch chaos (feedback); the strokes must SWEEP the way the
  // painting's edge region sweeps, so the guide — not the drifting context — sets direction.
  const guideFlow = new Float32Array(Np * 2);
  for (let y = 0; y < h; y++) {
    const fy = Math.min(fh - 1, Math.floor(((y + 0.5) / h) * fh));
    for (let x = 0; x < Wp; x++) {
      const ip = y * Wp + x;
      if (!fillP[ip]) continue;
      const paintU = (x - off + 0.5) / w;
      const fx = Math.min(fwP - 1, Math.max(0, Math.floor(paintU * fw + offF)));
      const rx = fx - ffx0;
      if (rx < 0 || rx >= refW) continue;
      const rp = (fy * refW + rx) * 2;
      guideFlow[ip * 2] = ref[rp];
      guideFlow[ip * 2 + 1] = ref[rp + 1];
    }
  }

  const ext = inpaint(
    { width: Wp, height: h, rgba: rgbaP },
    { fill: fillP, donorOK: donorOKP, bright: brightP, treeish: treeishP, flow: flowPairsP, guideFlow },
    SIDE_INPAINT_OPTS,
  );

  // Hard invariant: the painting area — minus the weave border the strip now owns — is
  // byte-identical to the S2-filled painting.
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (side === 'left' ? x < SIDE_BORDER_PX : x >= w - SIDE_BORDER_PX) continue;
      const sp = (y * w + x) * 4;
      const dp = (y * Wp + x + off) * 4;
      if (
        ext.rgba[dp] !== result.rgba[sp] ||
        ext.rgba[dp + 1] !== result.rgba[sp + 1] ||
        ext.rgba[dp + 2] !== result.rgba[sp + 2]
      )
        throw new Error(`side extend ${side} touched the painting at ${x},${y}`);
    }
  }

  // The strip asset = the extension plus the border columns it owns (contiguous in the padded
  // image), so the runtime mounts one texture per side covering paintU ∈ [−m, borderU].
  const stripW = padPx + SIDE_BORDER_PX;
  const stripSrcX0 = side === 'left' ? 0 : w - SIDE_BORDER_PX;
  const strip = new Uint8Array(stripW * h * 4);
  for (let y = 0; y < h; y++)
    strip.set(ext.rgba.subarray((y * Wp + stripSrcX0) * 4, (y * Wp + stripSrcX0 + stripW) * 4), y * stripW * 4);
  writeFileSync(OUT_EXTEND(side), encodePNG(stripW, h, strip));

  // ---- flow strip: donor-copied, destination-sign-aligned (via the reference field built
  // above), low-passed ----------------------------------------------------------------------
  let signFallback = 0;
  let texels = 0;
  for (let fx = ffx0; fx < ffx1; fx++) {
    for (let fy = 0; fy < fh; fy++) {
      const px = Math.min(Wp - 1, Math.floor(((fx + 0.5) / fwP) * Wp));
      const py = Math.min(h - 1, Math.floor(((fy + 0.5) / fh) * h));
      const s = ext.srcOf[py * Wp + px];
      if (s < 0) continue;
      const sxPaint = (s % Wp) - off;
      const syPaint = (s / Wp) | 0;
      const sfx = Math.min(fw - 1, Math.floor(((sxPaint + 0.5) / w) * fw));
      const sfy = Math.min(fh - 1, Math.floor(((syPaint + 0.5) / h) * fh));
      const sp = (sfy * fw + sfx) * 4;
      let dx = (flowFilledFinal[sp] / 255) * 2 - 1;
      let dy = (flowFilledFinal[sp + 1] / 255) * 2 - 1;
      const paintU = (fx + 0.5 - offF) / fw;
      let [ax, ay] = circAt(paintU, (fy + 0.5) / fh);
      if (Math.hypot(ax, ay) < SIDE_SIGN_CIRC_EPS) {
        signFallback++;
        const rp = (fy * refW + (fx - ffx0)) * 2;
        ax = ref[rp];
        ay = ref[rp + 1];
      }
      if (dx * ax + dy * ay < 0) {
        dx = -dx;
        dy = -dy;
      }
      const dp = (fy * fwP + fx) * 4;
      flowWide[dp] = Math.round((dx * 0.5 + 0.5) * 255);
      flowWide[dp + 1] = Math.round((dy * 0.5 + 0.5) * 255);
      flowWide[dp + 2] = flowFilledFinal[sp + 2];
      flowWide[dp + 3] = flowFilledFinal[sp + 3];
      flaggedWide[fy * fwP + fx] = 1;
      texels++;
    }
  }
  const flowWideBlurred = blurFlowTexels(flowWide, fwP, fh, flaggedWide);
  const flowStrip = new Uint8Array(refW * fh * 4);
  for (let y = 0; y < fh; y++)
    flowStrip.set(flowWideBlurred.subarray((y * fwP + ffx0) * 4, (y * fwP + ffx1) * 4), y * refW * 4);
  writeFileSync(OUT_EXTEND_FLOW(side), encodePNG(refW, fh, flowStrip));

  console.log(
    `side ${side}: ${ext.placements.length} placements, flow ${texels} texels (${((100 * signFallback) / Math.max(1, texels)).toFixed(0)}% reference-signed) in ${((Date.now() - tSide) / 1000).toFixed(1)}s`,
  );
  return { side, ext, strip, Wp, off, stripX0, flowWide: flowWideBlurred, fwP, offF };
};

const writeSideCrops = (bake: SideBake): void => {
  const { side, ext, Wp, off, stripX0 } = bake;
  const bandH = Math.round(SKY_CROP_BOTTOM * h);

  // 1×: the strip + 220 px of neighbouring canvas, drawable band — the seam-hunt image
  const CTX_PX = 220;
  const cropX0 = side === 'left' ? 0 : stripX0 - CTX_PX;
  const cropW = padPx + CTX_PX;
  const c1 = new Uint8Array(cropW * bandH * 4);
  for (let y = 0; y < bandH; y++)
    c1.set(ext.rgba.subarray((y * Wp + cropX0) * 4, (y * Wp + cropX0 + cropW) * 4), y * cropW * 4);
  writeFileSync(OUT_EXTEND_CROP(side, '1x'), encodePNG(cropW, bandH, c1));

  // 2×: the seam ±0.08 canvas widths, upper sky
  const zw = Math.round(0.16 * w);
  const zx0 = side === 'left' ? off - (zw >> 1) : off + w - (zw >> 1);
  const zy0 = Math.round(0.05 * h);
  const zh = Math.round(0.5 * h);
  const z = new Uint8Array(zw * 2 * zh * 2 * 4);
  for (let y = 0; y < zh * 2; y++) {
    const sy = zy0 + (y >> 1);
    for (let x = 0; x < zw * 2; x++) {
      const sx = zx0 + (x >> 1);
      const sp = (sy * Wp + sx) * 4;
      const dp = (y * zw * 2 + x) * 4;
      z[dp] = ext.rgba[sp];
      z[dp + 1] = ext.rgba[sp + 1];
      z[dp + 2] = ext.rgba[sp + 2];
      z[dp + 3] = 255;
    }
  }
  writeFileSync(OUT_EXTEND_CROP(side, '2x'), encodePNG(zw * 2, zh * 2, z));

  // Flow diagnostic: raw DIRECTED streamlines integrated through the baked strip flow over a
  // dimmed 1× crop. Sign incoherence shows as tangles/stalls here — the offline version of the
  // check that caught the 07-16 "out of flow" live. No heading-flip: the signed field must be
  // coherent on its own.
  const fcrop = new Uint8Array(c1);
  for (let i = 0; i < fcrop.length; i += 4) {
    fcrop[i] = (fcrop[i] * 0.45) | 0;
    fcrop[i + 1] = (fcrop[i + 1] * 0.45) | 0;
    fcrop[i + 2] = (fcrop[i + 2] * 0.45) | 0;
  }
  const { fwP, offF } = bake;
  const flowAtPaint = (u: number, v: number): [number, number] => {
    const fx = Math.min(fwP - 1, Math.max(0, Math.floor(u * fw + offF)));
    const fy = Math.min(fh - 1, Math.max(0, Math.floor(v * fh)));
    const p = (fy * fwP + fx) * 4;
    const dx = (bake.flowWide[p] / 255) * 2 - 1;
    const dy = (bake.flowWide[p + 1] / 255) * 2 - 1;
    const m = Math.hypot(dx, dy) || 1;
    return [dx / m, dy / m];
  };
  const plot = (u: number, v: number, r: number, g: number, b: number): void => {
    const x = Math.round(u * w + off - cropX0);
    const y = Math.round(v * h);
    if (x < 0 || x >= cropW || y < 0 || y >= bandH) return;
    const p = (y * cropW + x) * 4;
    fcrop[p] = r;
    fcrop[p + 1] = g;
    fcrop[p + 2] = b;
  };
  const seedX0 = side === 'left' ? -padPx : w - 40;
  const seedX1 = side === 'left' ? 40 : w + padPx;
  for (let sy = 24; sy < bandH; sy += 32) {
    for (let sx = seedX0 + 16; sx < seedX1; sx += 32) {
      let u = sx / w;
      let v = sy / h;
      for (let step = 0; step < 90; step++) {
        const [dx, dy] = flowAtPaint(u, v);
        u += (dx * 2) / w;
        v += (dy * 2) / h;
        plot(u, v, 120, 255, 140);
      }
      plot(u, v, 255, 255, 255); // direction head
    }
  }
  writeFileSync(OUT_EXTEND_CROP(side, 'flow'), encodePNG(cropW, bandH, fcrop));
};

const left = bakeSide('left');
const right = bakeSide('right');
writeSideCrops(left);
writeSideCrops(right);

// Overview: the full extended panorama at 0.5× — the whole-composition read.
{
  const fullW = padPx + w + padPx;
  const ow = fullW >> 1;
  const oh = h >> 1;
  const o = new Uint8Array(ow * oh * 4);
  for (let y = 0; y < oh; y++) {
    const sy = y * 2;
    for (let x = 0; x < ow; x++) {
      const sx = x * 2;
      // strips OWN the weave border columns, exactly as the runtime mounts them
      const stripW = padPx + SIDE_BORDER_PX;
      let buf: Uint8Array;
      let sp: number;
      if (sx < stripW) {
        buf = left.strip;
        sp = (sy * stripW + sx) * 4;
      } else if (sx < padPx + w - SIDE_BORDER_PX) {
        buf = result.rgba;
        sp = (sy * w + (sx - padPx)) * 4;
      } else {
        buf = right.strip;
        sp = (sy * stripW + (sx - (padPx + w - SIDE_BORDER_PX))) * 4;
      }
      const dp = (y * ow + x) * 4;
      o[dp] = buf[sp];
      o[dp + 1] = buf[sp + 1];
      o[dp + 2] = buf[sp + 2];
      o[dp + 3] = 255;
    }
  }
  writeFileSync(OUT_EXTEND_OVERVIEW, encodePNG(ow, oh, o));
}

console.log(
  `wrote sky-extend strips + flow strips + review crops (S4 ${((Date.now() - t2) / 1000).toFixed(1)}s, total ${((Date.now() - t0) / 1000).toFixed(1)}s)`,
);
