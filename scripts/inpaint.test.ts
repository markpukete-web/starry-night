/**
 * Script-level tests for the exemplar inpainting core (S2 of the offline inpaint pipeline).
 * Synthetic images, same discipline as painting-regions.test.ts: the invariants the plan
 * names — determinism, no bright-core donation, original paint never touched — plus a
 * structure check that striped texture actually continues across the hole.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { inpaint, type InpaintFlags, type InpaintOptions } from './lib/inpaint.ts';
import type { DecodedPNG } from './lib/png.ts';

const W = 96;
const H = 96;

const OPTS: InpaintOptions = {
  patchRadius: 4,
  searchRadiusPx: 40,
  coarseStridePx: 3,
  refineTopK: 8,
  refineRadiusPx: 3,
  flowWeight: 1500,
  donorTreeishMaxFraction: 0.15,
  dataTermFloor: 0.15,
  featherAlpha: 0.45,
  toneShiftMax: 14,
};

/** Horizontal stripes (8 px bands, two blues), flow along +x — a hole must knit the bands. */
function stripedScene(withBrightBlob: boolean): { image: DecodedPNG; flags: InpaintFlags } {
  const rgba = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y++) {
    const band = (y >> 3) % 2;
    for (let x = 0; x < W; x++) {
      const p = (y * W + x) * 4;
      rgba[p] = band ? 40 : 90;
      rgba[p + 1] = band ? 60 : 110;
      rgba[p + 2] = band ? 120 : 180;
      rgba[p + 3] = 255;
    }
  }
  const fill = new Uint8Array(W * H);
  for (let y = 38; y < 58; y++) for (let x = 38; x < 58; x++) fill[y * W + x] = 1;
  const bright = new Uint8Array(W * H);
  if (withBrightBlob) {
    // a bright-warm "star" close to the hole, well inside the search radius
    for (let y = 20; y < 27; y++) {
      for (let x = 62; x < 69; x++) {
        const p = (y * W + x) * 4;
        rgba[p] = 250;
        rgba[p + 1] = 240;
        rgba[p + 2] = 160;
        bright[y * W + x] = 1;
      }
    }
  }
  const donorOK = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) donorOK[i] = fill[i] ? 0 : 1;
  const flow = new Float32Array(W * H * 2);
  for (let i = 0; i < W * H; i++) flow[i * 2] = 1;
  return { image: { width: W, height: H, rgba }, flags: { fill, donorOK, bright, treeish: new Uint8Array(W * H), flow } };
}

test('deterministic: two runs are byte-identical', () => {
  const a = inpaint(stripedScene(false).image, stripedScene(false).flags, OPTS);
  const b = inpaint(stripedScene(false).image, stripedScene(false).flags, OPTS);
  assert.deepEqual(Buffer.from(a.rgba), Buffer.from(b.rgba));
  assert.deepEqual([...a.srcOf], [...b.srcOf]);
});

test('original paint is never touched; every fill pixel gets painted with a recorded source', () => {
  const { image, flags } = stripedScene(false);
  const original = new Uint8Array(image.rgba);
  const res = inpaint(image, flags, OPTS);
  for (let i = 0; i < W * H; i++) {
    const p = i * 4;
    if (!flags.fill[i]) {
      assert.equal(res.rgba[p], original[p]);
      assert.equal(res.rgba[p + 1], original[p + 1]);
      assert.equal(res.rgba[p + 2], original[p + 2]);
      assert.equal(res.srcOf[i], -1);
    } else {
      assert.ok(res.srcOf[i] >= 0, `fill px ${i} has a source`);
      assert.ok(!flags.fill[res.srcOf[i]], `source of ${i} is original paint, not fill`);
    }
  }
});

test('striped texture continues across the hole', () => {
  const { image, flags } = stripedScene(false);
  const res = inpaint(image, flags, OPTS);
  let good = 0;
  let total = 0;
  for (let y = 38; y < 58; y++) {
    const band = (y >> 3) % 2;
    const expected = band ? 40 : 90;
    for (let x = 38; x < 58; x++) {
      const p = (y * W + x) * 4;
      total++;
      if (Math.abs(res.rgba[p] - expected) <= 12) good++;
    }
  }
  assert.ok(good / total > 0.9, `stripe continuation ${good}/${total}`);
});

test('donor patches never contain bright-warm pixels', () => {
  const { image, flags } = stripedScene(true);
  const res = inpaint(image, flags, OPTS);
  for (const { source } of res.placements) {
    const sx = source % W;
    const sy = (source / W) | 0;
    for (let dy = -OPTS.patchRadius; dy <= OPTS.patchRadius; dy++) {
      for (let dx = -OPTS.patchRadius; dx <= OPTS.patchRadius; dx++) {
        assert.equal(flags.bright[(sy + dy) * W + (sx + dx)], 0, `bright px donated at ${sx + dx},${sy + dy}`);
      }
    }
  }
});
