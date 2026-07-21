/*
 * Prepare public/reference for shipping (ship hygiene, 2026-07-21). Two passes, both lossless:
 *
 *  1. **Re-encode every PNG** with the shared codec's storage choices (adaptive row filters, drop
 *     channels the data doesn't use). Pure repacking — no resampling, no quantisation.
 *  2. **Convert the runtime's colour assets to lossless WebP** (see WEBP_ASSETS). WebP's lossless
 *     mode beats PNG on continuous-tone paint by ~40%; it LOSES to our PNG on the flow fields
 *     (signed-flow-filled: 1.61 MB PNG vs 2.10 MB WebP), which is why this is a named list rather
 *     than "convert everything". A mixed-format reference set is the correct answer, not a fudge.
 *
 * Why this exists rather than "just re-bake": the assets are baked by two pipelines
 * (derive-reference.ts, extend-reference.ts) and one output is post-processed (slim-flow-field.ts
 * downsamples flow-field.png after the bake). Re-running everything to pick up an encoder
 * improvement would risk the settled Phase-0 outputs. Decoding and re-encoding gets the same bytes
 * with none of that risk.
 *
 * SAFETY: nothing is written or deleted until the round-trip is proven byte-identical — the decoded
 * RGBA going in must equal the decoded RGBA coming back out, for both the PNG repack and the WebP
 * conversion. That is why no visual check can fail: the runtime only ever sees decoded pixels, and
 * those are unchanged by construction. A file that fails verification is left exactly as it was and
 * the script exits non-zero.
 *
 * PREREQUISITE: `cwebp` and `dwebp` (Homebrew `libwebp`) for pass 2 — approved by Mark on
 * 2026-07-21 as a BAKE-ONLY tool. It is never needed for `npm run dev`, `build`, tests or deploy;
 * only for re-preparing assets. Without it, pass 1 still runs and pass 2 reports what it skipped.
 *
 * Idempotent: re-running finds nothing left to win. After a re-bake (which writes PNGs again) just
 * run this script to restore the shipped set.
 *
 * Run: npm run slim-reference
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';

import { decodePNG, encodePNG } from './lib/png.ts';

const DIR = resolve(import.meta.dirname, '../public/reference');

/**
 * Assets shipped as lossless WebP. These are the runtime's colour textures — continuous-tone paint,
 * where WebP's lossless mode wins decisively. Everything else (flow fields, mask) stays PNG because
 * WebP is BIGGER for them; measure before adding to this list, don't assume.
 * Paths are referenced from src/scene/PaintingFlowSky3D.tsx — keep the two in step.
 */
const WEBP_ASSETS = ['painting-filled', 'sky-extend-left', 'sky-extend-right'];

function haveWebpTools(): boolean {
  try {
    execFileSync('cwebp', ['-version'], { stdio: 'ignore' });
    execFileSync('dwebp', ['-version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/** Encode to lossless WebP and prove it decodes back to exactly `rgba`. Returns the bytes, or null. */
function losslessWebp(pngPath: string, rgba: Uint8Array, width: number, height: number): Buffer | null {
  const out = join(tmpdir(), `slim-${basename(pngPath)}.webp`);
  const back = join(tmpdir(), `slim-${basename(pngPath)}.check.png`);
  try {
    execFileSync('cwebp', ['-quiet', '-lossless', '-z', '9', pngPath, '-o', out]);
    execFileSync('dwebp', ['-quiet', out, '-o', back]);
    const check = decodePNG(readFileSync(back));
    if (check.width !== width || check.height !== height) return null;
    if (Buffer.compare(Buffer.from(check.rgba), Buffer.from(rgba)) !== 0) return null;
    return readFileSync(out);
  } catch {
    return null;
  } finally {
    rmSync(out, { force: true });
    rmSync(back, { force: true });
  }
}

const webpOk = haveWebpTools();
let totalBefore = 0;
let totalAfter = 0;
let failed = 0;

for (const name of readdirSync(DIR).sort()) {
  if (!name.endsWith('.png')) continue;
  const stem = name.slice(0, -4);
  const path = resolve(DIR, name);
  const before = readFileSync(path);
  const src = decodePNG(before);
  totalBefore += before.length;

  // --- pass 2 candidates: convert to lossless WebP and drop the PNG ---
  if (WEBP_ASSETS.includes(stem)) {
    if (!webpOk) {
      totalAfter += before.length;
      console.log(`! ${name.padEnd(28)} WebP candidate skipped — cwebp/dwebp not found (brew install webp)`);
      continue;
    }
    const webp = losslessWebp(path, src.rgba, src.width, src.height);
    if (!webp) {
      console.error(`✗ ${name}: WebP round-trip is NOT byte-identical — left untouched`);
      totalAfter += before.length;
      failed++;
      continue;
    }
    if (webp.length >= before.length) {
      totalAfter += before.length;
      console.log(`· ${name.padEnd(28)} PNG already smaller than lossless WebP — kept as PNG`);
      continue;
    }
    writeFileSync(resolve(DIR, `${stem}.webp`), webp);
    rmSync(path);
    totalAfter += webp.length;
    console.log(
      `✓ ${name.padEnd(28)} ${(before.length / 1048576).toFixed(2)} MB -> ${stem}.webp ` +
        `${(webp.length / 1048576).toFixed(2)} MB (${(100 * (1 - webp.length / before.length)).toFixed(0)}% smaller, lossless)`,
    );
    continue;
  }

  // --- pass 1: lossless PNG repack ---
  const encoded = encodePNG(src.width, src.height, src.rgba);
  const check = decodePNG(encoded);
  const identical =
    check.width === src.width && check.height === src.height && Buffer.compare(Buffer.from(check.rgba), Buffer.from(src.rgba)) === 0;
  if (!identical) {
    console.error(`✗ ${name}: round-trip is NOT byte-identical — left untouched`);
    totalAfter += before.length;
    failed++;
    continue;
  }
  if (encoded.length >= before.length) {
    totalAfter += before.length;
    console.log(`· ${name.padEnd(28)} ${(before.length / 1048576).toFixed(2)} MB — already minimal, kept`);
    continue;
  }
  writeFileSync(path, encoded);
  totalAfter += statSync(path).size;
  console.log(
    `✓ ${name.padEnd(28)} ${(before.length / 1048576).toFixed(2)} MB -> ${(encoded.length / 1048576).toFixed(2)} MB ` +
      `(${(100 * (1 - encoded.length / before.length)).toFixed(0)}% smaller, ${src.width}×${src.height} unchanged)`,
  );
}

// Already-converted assets carry no PNG to walk, so count them for an honest total.
for (const stem of WEBP_ASSETS) {
  const webpPath = resolve(DIR, `${stem}.webp`);
  if (existsSync(webpPath) && !existsSync(resolve(DIR, `${stem}.png`))) {
    const size = statSync(webpPath).size;
    totalBefore += size;
    totalAfter += size;
  }
}

console.log(
  `\nreference total  ${(totalBefore / 1048576).toFixed(2)} MB -> ${(totalAfter / 1048576).toFixed(2)} MB ` +
    `(${(100 * (1 - totalAfter / totalBefore)).toFixed(0)}% smaller)`,
);
if (failed) {
  console.error(`\n${failed} file(s) failed verification and were left untouched.`);
  process.exit(1);
}
