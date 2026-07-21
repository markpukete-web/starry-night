/*
 * Slim public/reference/flow-field.png by a 2× box-downsample, in RAW value space so the double-angle
 * orientation channels (R = cos2θ, G = sin2θ) and coherence (B) average correctly — averaging the
 * double-angle encoding IS the correct way to average orientations, which is the whole reason the field
 * is double-angle-encoded (see derive-reference.ts / lessons). Resolution is the lever this script
 * pulls: the flow-field drives a subtle fine-orientation BIAS between swirls, so half-resolution is
 * ample. A `sips` resize is avoided because it would gamma-average the data channels (sRGB-linear),
 * distorting the orientation.
 *
 * (This header used to claim lossless re-encoding "can't help" because the data is high-entropy. That
 * was wrong — it measured deflate alone, ignoring PNG's row filters and the unused alpha plane. The
 * shared encoder now picks both, which is where the 2026-07-21 slimming pass got most of its bytes.
 * Downsampling and re-encoding are independent wins; this script still owns the downsample.)
 *
 * GUARDED + idempotent: it only ever downsamples the full-res 1280×1013 output of derive-reference.ts.
 * On an already-slimmed (or unexpected) file it SKIPS — so re-running can't take 640→320→… and silently
 * degrade the locked flow asset. To re-slim, re-run derive-reference.ts first (which regenerates full-res).
 *
 * Run: node scripts/slim-flow-field.ts   (verify the flow bias with a front capture A/B afterwards)
 */
import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

import { decodePNG, encodePNG } from './lib/png.ts';

const FLOW = resolve(import.meta.dirname, '../public/reference/flow-field.png');

// --- 2× box downsample in raw value space (averages the double-angle channels correctly) ---
function downsample2x(width: number, height: number, rgba: Uint8Array) {
  const w2 = width >> 1;
  const h2 = height >> 1;
  const out = new Uint8Array(w2 * h2 * 4);
  for (let y = 0; y < h2; y++) {
    for (let x = 0; x < w2; x++) {
      const sx = x * 2;
      const sy = y * 2;
      for (let ch = 0; ch < 4; ch++) {
        const i00 = (sy * width + sx) * 4 + ch;
        const i10 = (sy * width + sx + 1) * 4 + ch;
        const i01 = ((sy + 1) * width + sx) * 4 + ch;
        const i11 = ((sy + 1) * width + sx + 1) * 4 + ch;
        out[(y * w2 + x) * 4 + ch] = (rgba[i00] + rgba[i10] + rgba[i01] + rgba[i11] + 2) >> 2;
      }
    }
  }
  return { width: w2, height: h2, rgba: out };
}

// Only slim the full-res output of derive-reference.ts. Running on an already-slimmed file would
// re-downsample (640→320→…) and silently degrade the locked flow asset, so refuse — idempotently.
const FULL_RES = { width: 1280, height: 1013 };
const before = statSync(FLOW).size;
const src = decodePNG(readFileSync(FLOW));
if (src.width !== FULL_RES.width || src.height !== FULL_RES.height) {
  console.log(
    `flow-field.png is ${src.width}×${src.height}, not the full-res ${FULL_RES.width}×${FULL_RES.height} ` +
      `derive output — already slimmed (or unexpected). Skipping; re-run derive-reference.ts first to re-slim.`,
  );
  process.exit(0);
}
const small = downsample2x(src.width, src.height, src.rgba);
writeFileSync(FLOW, encodePNG(small.width, small.height, small.rgba));
const after = statSync(FLOW).size;
console.log(
  `flow-field.png  ${src.width}×${src.height} (${(before / 1e6).toFixed(2)} MB) -> ` +
    `${small.width}×${small.height} (${(after / 1e6).toFixed(2)} MB)`,
);
