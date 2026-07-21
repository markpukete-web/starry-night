/**
 * Script-level tests for the PNG codec's storage choices (ship-hygiene slimming, 2026-07-21).
 *
 * The encoder now picks a per-row filter and drops channels the data does not use. Both are
 * pure STORAGE decisions: the invariant every test here defends is that what comes back out
 * of decodePNG is byte-identical to what went in. If that holds, the runtime — which only
 * ever sees decoded RGBA — cannot tell the difference, so a smaller file is free.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { decodePNG, encodePNG } from './lib/png.ts';

const W = 61; // deliberately odd/prime-ish: catches stride and row-boundary slips
const H = 37;

/** Build an RGBA buffer from a per-pixel colour function. */
function make(fn: (x: number, y: number) => [number, number, number, number]): Uint8Array {
  const rgba = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const [r, g, b, a] = fn(x, y);
      const i = (y * W + x) * 4;
      rgba[i] = r;
      rgba[i + 1] = g;
      rgba[i + 2] = b;
      rgba[i + 3] = a;
    }
  }
  return rgba;
}

/** Colour type sits at byte 9 of IHDR: 8 sig + 4 len + 4 'IHDR' + 9. */
function colourTypeOf(png: Buffer): number {
  return png[8 + 4 + 4 + 9];
}

function assertRoundTrips(rgba: Uint8Array, label: string): Buffer {
  const png = encodePNG(W, H, rgba);
  const back = decodePNG(png);
  assert.equal(back.width, W, `${label}: width`);
  assert.equal(back.height, H, `${label}: height`);
  assert.deepEqual(back.rgba, rgba, `${label}: decoded pixels must be byte-identical`);
  return png;
}

test('opaque colour round-trips byte-identically and is stored without the alpha channel', () => {
  // Painting-like: smooth gradients plus grain, the case painting-filled.png represents.
  const rgba = make((x, y) => [(x * 3 + y) & 255, (y * 5) & 255, (x * x + y) & 255, 255]);
  const png = assertRoundTrips(rgba, 'opaque colour');
  assert.equal(colourTypeOf(png), 2, 'uniform-255 alpha must be dropped (colour type 2 = RGB)');
});

test('opaque greyscale is stored as a single channel', () => {
  // sky-mask.png: r === g === b everywhere, alpha unused.
  const rgba = make((x, y) => {
    const v = (x * 4 + y * 2) & 255;
    return [v, v, v, 255];
  });
  const png = assertRoundTrips(rgba, 'greyscale');
  assert.equal(colourTypeOf(png), 0, 'grey + opaque must collapse to colour type 0');
});

test('a single non-opaque pixel keeps the alpha channel for every pixel', () => {
  const rgba = make((x, y) => [x & 255, y & 255, 128, x === 40 && y === 11 ? 254 : 255]);
  const png = assertRoundTrips(rgba, 'has transparency');
  assert.equal(colourTypeOf(png), 6, 'real alpha must be preserved (colour type 6 = RGBA)');
});

test('a single off-grey pixel keeps all three colour channels', () => {
  const rgba = make((x, y) => {
    const v = (x + y) & 255;
    return x === 7 && y === 9 ? [v, v, (v + 1) & 255, 255] : [v, v, v, 255];
  });
  const png = assertRoundTrips(rgba, 'nearly grey');
  assert.equal(colourTypeOf(png), 2, 'not truly grey — must stay RGB');
});

test('signed-flow-style data round-trips exactly (no lossy step may creep in)', () => {
  // Vectors encoded around the 128 midpoint, sign-carrying: any value drift is a bug, not a
  // quality trade-off. Adjacent texels deliberately flip sign.
  const rgba = make((x, y) => [128 + (x % 2 ? 40 : -40), 128 + (y % 2 ? 33 : -33), (x * y) & 255, 255]);
  assertRoundTrips(rgba, 'signed flow');
});

test('flat and single-row images encode correctly', () => {
  const flat = make(() => [17, 17, 17, 255]);
  assertRoundTrips(flat, 'flat grey');
  const one = encodePNG(3, 1, new Uint8Array([1, 2, 3, 255, 4, 5, 6, 255, 7, 8, 9, 255]));
  assert.deepEqual(decodePNG(one).rgba, new Uint8Array([1, 2, 3, 255, 4, 5, 6, 255, 7, 8, 9, 255]));
});

test('adaptive filtering beats the old filter-0 RGBA encoding on painting-like data', () => {
  // The whole point of the slimming pass: prove the win exists, so a regression that silently
  // reverts to filter 0 / forced RGBA shows up as a failing test rather than a fatter deploy.
  const rgba = make((x, y) => {
    const base = 60 + Math.round(40 * Math.sin(x / 9) + 30 * Math.cos(y / 7));
    return [base, base + 12, base + 40, 255];
  });
  const png = encodePNG(W, H, rgba);
  assert.ok(png.length < rgba.length / 3, `expected strong compression, got ${png.length} bytes for ${rgba.length}`);
});
