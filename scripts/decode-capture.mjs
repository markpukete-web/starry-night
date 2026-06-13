/**
 * Decode a canvas-readback data URL (saved by Playwright browser_evaluate) into an image file.
 * Part of the visual-review loop: page.screenshot does not reliably composite the WebGL canvas
 * in this headless env, so we read the canvas back via toDataURL and decode it here.
 *
 *   node scripts/decode-capture.mjs <in.txt> <out.jpeg>
 */
import { readFileSync, writeFileSync, statSync } from 'node:fs';

const [, , inFile, outFile] = process.argv;
if (!inFile || !outFile) {
  console.error('usage: node scripts/decode-capture.mjs <in.txt> <out.jpeg>');
  process.exit(1);
}
let s = readFileSync(inFile, 'utf8');
const i = s.indexOf('base64,');
if (i < 0) {
  console.error('no base64 marker in ' + inFile);
  process.exit(1);
}
s = s.slice(i + 7).replace(/[^A-Za-z0-9+/=]/g, '');
writeFileSync(outFile, Buffer.from(s, 'base64'));
console.log('wrote', outFile, statSync(outFile).size, 'bytes');
