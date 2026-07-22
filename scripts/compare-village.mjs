#!/usr/bin/env node
// Village original-vs-live compare — checklist item 8's standing review artifact.
//
// Usage: node scripts/compare-village.mjs <capture-dir>
//   e.g. node scripts/compare-village.mjs output/playwright/village-look-2026-07-22
//
// Emits <capture-dir>/village-original-vs-live.png: the painting's village region
// above the matching live crop from desktop-centre.png, height-matched 1:1 so the
// read is at true scale (never judge texture from a blow-up — tasks/lessons.md).
//
// Also prints the three gap indicators named in tasks/2026-07-22-village-look.md.
// The numbers are TREND indicators between passes, not gates: the gate is looking
// at the emitted image beside the painting (CLAUDE.md, visual review every loop).
//
// Requires ImageMagick (`magick`), same as the recorded crop recipes in tasks/todo.md.
// Crop rects assume the deterministic desktop-centre capture pose (1600×900); if the
// camera contract or framing changes, re-derive LIVE_* below and update the look note.

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const PAINTING = 'public/reference/painting.jpg';

// Painting village region: normalised [0.28, 0.66, 0.78, 0.86] from palette.json
// on the 1600×1267 scan → x 448..1248, y 836..1090.
const SRC_CROP = '800x254+448+836';
// Live village rect on the deterministic desktop-centre pose (1600×900).
const LIVE_CROP = '560x260+560+440';

// Gap-indicator rects (placement proven in village-look-2026-07-22/steeple-check2.png).
const SRC_HOUSES = '500x80+560+1005';
const LIVE_HOUSES = '500x70+580+600';
const SRC_SPIRE = '20x80+896+950';
const SRC_SKY = '20x80+935+930';
const LIVE_SPIRE = '14x60+774+495';
const LIVE_SKY = '20x60+815+485';

const dir = process.argv[2];
if (!dir) {
  console.error('usage: node scripts/compare-village.mjs <capture-dir>');
  process.exit(1);
}
const centre = join(dir, 'desktop-centre.png');
if (!existsSync(centre)) {
  console.error(`no desktop-centre.png in ${dir} — run npm run capture:diorama first`);
  process.exit(1);
}

const magick = (args) => execFileSync('magick', args, { encoding: 'utf8' }).trim();

const num = (img, crop, ops) =>
  Number(magick([img, '-crop', crop, '+repage', ...ops, 'info:']));

// Mean luminance of a rect.
const lum = (img, crop) =>
  num(img, crop, ['-colorspace', 'Gray', '-format', '%[fx:mean*255]']);
// 3×3 local standard deviation — the sharpness/paint-energy metric from the cypress pass.
const stddev = (img, crop) =>
  num(img, crop, ['-colorspace', 'Gray', '-statistic', 'StandardDeviation', '3x3', '-format', '%[fx:mean*255]']);
// Warm-pigment fraction: red exceeding blue by 15% and not near-black. Catches the
// painting's umber/ochre family and the orange roof; navy and charcoal score 0.
const warm = (img, crop) =>
  num(img, crop, ['-fx', '(r>b*1.15&&r>0.12)?1:0', '-format', '%[fx:mean*100]']);

const out = join(dir, 'village-original-vs-live.png');
const tmpSrc = join(dir, '.vil-src.png');
const tmpLive = join(dir, '.vil-live.png');
magick([PAINTING, '-crop', SRC_CROP, '+repage', tmpSrc]);
magick([centre, '-crop', LIVE_CROP, '+repage', '-resize', 'x254', tmpLive]);
magick([tmpSrc, tmpLive, '-background', '#222', '-splice', '0x6', '-append', out]);
execFileSync('rm', [tmpSrc, tmpLive]);

const rows = [
  ['houses 3x3 stddev', stddev(PAINTING, SRC_HOUSES), stddev(centre, LIVE_HOUSES)],
  ['spire mean lum', lum(PAINTING, SRC_SPIRE), lum(centre, LIVE_SPIRE)],
  ['spire-vs-sky delta', lum(PAINTING, SRC_SPIRE) - lum(PAINTING, SRC_SKY), lum(centre, LIVE_SPIRE) - lum(centre, LIVE_SKY)],
  ['warm pigment %', warm(PAINTING, SRC_HOUSES), warm(centre, LIVE_HOUSES)],
];

console.log(`wrote ${out}\n`);
console.log('indicator            painting      live');
for (const [label, src, live] of rows) {
  console.log(`${label.padEnd(20)} ${src.toFixed(2).padStart(8)}  ${live.toFixed(2).padStart(8)}`);
}
console.log('\nTrend indicators only — the gate is LOOKING at the compare image.');
