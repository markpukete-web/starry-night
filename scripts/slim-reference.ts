/*
 * Re-encode the committed reference PNGs with the shared codec's storage choices (ship hygiene,
 * 2026-07-21). Pure repacking: no resampling, no quantisation, no format change.
 *
 * Why this exists rather than "just re-bake": the assets in public/reference are baked by two
 * different pipelines (derive-reference.ts, extend-reference.ts) and one of them was itself
 * post-processed (slim-flow-field.ts downsampled flow-field.png after the bake). Re-running
 * everything to pick up an encoder improvement would risk the settled Phase-0 outputs. Decoding
 * and re-encoding in place gets the same bytes with none of that risk.
 *
 * SAFETY: every file is verified byte-identical after the round-trip BEFORE it is written — the
 * decoded RGBA going in must equal the decoded RGBA coming back out, or the file is left alone
 * and the script exits non-zero. That is the whole argument for why no visual check can fail:
 * the runtime only ever sees decoded pixels, and those are unchanged by construction.
 *
 * Idempotent: re-running finds nothing left to win and reports each file as already minimal.
 *
 * Run: node scripts/slim-reference.ts   (then capture A/B anyway — cheap, and the discipline)
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { decodePNG, encodePNG } from './lib/png.ts';

const DIR = resolve(import.meta.dirname, '../public/reference');

const files = readdirSync(DIR)
  .filter((f) => f.endsWith('.png'))
  .sort();

let totalBefore = 0;
let totalAfter = 0;
let failed = 0;

for (const name of files) {
  const path = resolve(DIR, name);
  const before = readFileSync(path);
  const src = decodePNG(before);
  const encoded = encodePNG(src.width, src.height, src.rgba);

  // Prove the round-trip before touching the file on disk.
  const check = decodePNG(encoded);
  const identical =
    check.width === src.width && check.height === src.height && Buffer.compare(Buffer.from(check.rgba), Buffer.from(src.rgba)) === 0;
  if (!identical) {
    console.error(`✗ ${name}: round-trip is NOT byte-identical — left untouched`);
    failed++;
    continue;
  }

  totalBefore += before.length;
  if (encoded.length >= before.length) {
    totalAfter += before.length;
    console.log(`· ${name.padEnd(28)} ${(before.length / 1048576).toFixed(2)} MB — already minimal, kept`);
    continue;
  }
  writeFileSync(path, encoded);
  totalAfter += encoded.length;
  const after = statSync(path).size;
  console.log(
    `✓ ${name.padEnd(28)} ${(before.length / 1048576).toFixed(2)} MB -> ${(after / 1048576).toFixed(2)} MB ` +
      `(${(100 * (1 - after / before.length)).toFixed(0)}% smaller, ${src.width}×${src.height} unchanged)`,
  );
}

console.log(
  `\nreference total  ${(totalBefore / 1048576).toFixed(2)} MB -> ${(totalAfter / 1048576).toFixed(2)} MB ` +
    `(${(100 * (1 - totalAfter / totalBefore)).toFixed(0)}% smaller)`,
);
if (failed) {
  console.error(`\n${failed} file(s) failed the round-trip check and were left untouched.`);
  process.exit(1);
}
