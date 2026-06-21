/**
 * derive-reference.ts — Phase 0 reference pipeline for The Starry Night.
 *
 * Dependency-free by design (see CLAUDE.md dependency gate). Uses:
 *   - macOS `sips` to convert the source JPEG to PNG and downscale to analysis width
 *   - Node built-in `zlib` to decode/encode PNG (no sharp / pngjs / jpeg-js)
 *   - plain arithmetic for the structure-tensor orientation analysis
 *
 * Outputs (committed):
 *   - public/reference/flow-field.png   per-pixel stroke orientation + coherence
 *   - public/reference/palette.json     dominant colours per region (sRGB + Lab)
 * Gate captures (for visual review, not shipped):
 *   - reference/derived/flow-lic.png            line-integral-convolution of the flow
 *   - reference/derived/flow-lic-overlay.png    the LIC painted with the picture's colour
 *   - reference/derived/coherence.png           where the orientation is trustworthy
 *
 * flow-field.png encoding (8-bit RGBA):
 *   R,G = double-angle stroke orientation (cos2θ, sin2θ) mapped [-1,1] -> [0,255].
 *         Double-angle so the texture interpolates continuously across the θ=0/π wrap
 *         under GPU bilinear sampling. Decode: 2θ = atan2(G',R'); θ = 0.5·2θ.
 *   B   = coherence in [0,1] -> [0,255] (how strongly oriented the neighbourhood is).
 *   A   = 255.
 *   Orientation is undirected (mod π). Signed churn direction is a Phase 1 decision.
 *
 * Run: node scripts/derive-reference.ts   (Node >= 23.6 strips the types natively)
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateSync, deflateSync } from 'node:zlib';

// ---------------------------------------------------------------- config ----

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = resolve(ROOT, 'reference/starry-night-source.jpg');
const WORK = resolve(ROOT, 'reference/derived/_work.png');
const OUT_FLOW = resolve(ROOT, 'public/reference/flow-field.png');
const OUT_PALETTE = resolve(ROOT, 'public/reference/palette.json');
const OUT_LIC = resolve(ROOT, 'reference/derived/flow-lic.png');
const OUT_LIC_OVERLAY = resolve(ROOT, 'reference/derived/flow-lic-overlay.png');
const OUT_COHERENCE = resolve(ROOT, 'reference/derived/coherence.png');
const OUT_PAINTING = resolve(ROOT, 'public/reference/painting.jpg'); // web-sized texture for the app
const OUT_SIGNED_FLOW = resolve(ROOT, 'public/reference/signed-flow.png'); // directed flow for advection
const OUT_SKY_MASK = resolve(ROOT, 'public/reference/sky-mask.png'); // where the living painting churns
const OUT_MASK_OVERLAY = resolve(ROOT, 'reference/derived/sky-mask-overlay.png'); // mask validation capture

const ANALYSIS_WIDTH = 1280; // px; flow-field + captures are produced at this width
const PRE_BLUR = 1.2; // σ, denoise before gradients
const TENSOR_SIGMA = 4.0; // σ, integrates orientation over a neighbourhood
const LIC_LENGTH = 18; // steps each way along a streamline
const LIC_STEP = 1.0; // px per step

// ----------------------------------------------------------- PNG codec ------

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function decodePNG(buf: Buffer): { width: number; height: number; rgba: Uint8Array } {
  const sig = [137, 80, 78, 71, 13, 10, 26, 10];
  for (let i = 0; i < 8; i++) if (buf[i] !== sig[i]) throw new Error('not a PNG');
  let pos = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  const idat: Buffer[] = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    pos += 4;
    const type = buf.toString('ascii', pos, pos + 4);
    pos += 4;
    const data = buf.subarray(pos, pos + len);
    pos += len + 4; // + crc
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === 'IDAT') {
      idat.push(Buffer.from(data));
    } else if (type === 'IEND') {
      break;
    }
  }
  if (bitDepth !== 8) throw new Error('expected 8-bit PNG, got ' + bitDepth);
  if (interlace !== 0) throw new Error('interlaced PNG unsupported');
  const channels = colorType === 2 ? 3 : colorType === 6 ? 4 : colorType === 0 ? 1 : colorType === 4 ? 2 : 0;
  if (!channels) throw new Error('unsupported colour type ' + colorType);

  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const prev = new Uint8Array(stride);
  const cur = new Uint8Array(stride);
  const recon = new Uint8Array(width * height * channels);
  let rp = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[rp++];
    for (let x = 0; x < stride; x++) cur[x] = raw[rp++];
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? cur[x - channels] : 0;
      const b = prev[x];
      const c = x >= channels ? prev[x - channels] : 0;
      let v = cur[x];
      if (filter === 1) v = (v + a) & 255;
      else if (filter === 2) v = (v + b) & 255;
      else if (filter === 3) v = (v + ((a + b) >> 1)) & 255;
      else if (filter === 4) v = (v + paeth(a, b, c)) & 255;
      else if (filter !== 0) throw new Error('bad filter ' + filter);
      cur[x] = v;
    }
    recon.set(cur, y * stride);
    prev.set(cur);
  }

  const rgba = new Uint8Array(width * height * 4);
  for (let i = 0, p = 0; i < width * height; i++) {
    let r: number;
    let g: number;
    let b: number;
    let a = 255;
    if (channels === 3) {
      r = recon[p++];
      g = recon[p++];
      b = recon[p++];
    } else if (channels === 4) {
      r = recon[p++];
      g = recon[p++];
      b = recon[p++];
      a = recon[p++];
    } else if (channels === 1) {
      r = g = b = recon[p++];
    } else {
      r = g = b = recon[p++];
      a = recon[p++];
    }
    rgba[i * 4] = r;
    rgba[i * 4 + 1] = g;
    rgba[i * 4 + 2] = b;
    rgba[i * 4 + 3] = a;
  }
  return { width, height, rgba };
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePNG(width: number, height: number, rgba: Uint8Array): Buffer {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    for (let x = 0; x < stride; x++) raw[y * (stride + 1) + 1 + x] = rgba[y * stride + x];
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type RGBA
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

// ------------------------------------------------------------- helpers ------

function gaussianBlur(src: Float64Array, w: number, h: number, sigma: number): Float64Array {
  const r = Math.max(1, Math.ceil(sigma * 3));
  const k = new Float64Array(2 * r + 1);
  let sum = 0;
  for (let i = -r; i <= r; i++) {
    const v = Math.exp(-(i * i) / (2 * sigma * sigma));
    k[i + r] = v;
    sum += v;
  }
  for (let i = 0; i < k.length; i++) k[i] /= sum;
  const tmp = new Float64Array(w * h);
  const out = new Float64Array(w * h);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let i = -r; i <= r; i++) {
        let xx = x + i;
        if (xx < 0) xx = 0;
        else if (xx >= w) xx = w - 1;
        acc += src[row + xx] * k[i + r];
      }
      tmp[row + x] = acc;
    }
  }
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      let acc = 0;
      for (let i = -r; i <= r; i++) {
        let yy = y + i;
        if (yy < 0) yy = 0;
        else if (yy >= h) yy = h - 1;
        acc += tmp[yy * w + x] * k[i + r];
      }
      out[y * w + x] = acc;
    }
  }
  return out;
}

function srgbToLinear(c: number): number {
  const x = c / 255;
  return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
}

function rgbToLab(r: number, g: number, b: number): number[] {
  const rl = srgbToLinear(r);
  const gl = srgbToLinear(g);
  const bl = srgbToLinear(b);
  const x = rl * 0.4124 + gl * 0.3576 + bl * 0.1805;
  const y = rl * 0.2126 + gl * 0.7152 + bl * 0.0722;
  const z = rl * 0.0193 + gl * 0.1192 + bl * 0.9505;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(x / 0.95047);
  const fy = f(y / 1.0);
  const fz = f(z / 1.08883);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

function medianCut(samples: number[][], count: number): { rgb: number[]; weight: number }[] {
  if (samples.length === 0) return [];
  const boxes = [samples];
  while (boxes.length < count) {
    let bi = -1;
    let bestRange = -1;
    let bestCh = 0;
    for (let i = 0; i < boxes.length; i++) {
      const bx = boxes[i];
      if (bx.length < 2) continue;
      const mn = [255, 255, 255];
      const mx = [0, 0, 0];
      for (const p of bx)
        for (let c = 0; c < 3; c++) {
          if (p[c] < mn[c]) mn[c] = p[c];
          if (p[c] > mx[c]) mx[c] = p[c];
        }
      for (let c = 0; c < 3; c++) {
        const range = mx[c] - mn[c];
        if (range > bestRange) {
          bestRange = range;
          bi = i;
          bestCh = c;
        }
      }
    }
    if (bi < 0) break;
    const bx = boxes[bi];
    bx.sort((p, q) => p[bestCh] - q[bestCh]);
    const mid = bx.length >> 1;
    boxes.splice(bi, 1, bx.slice(0, mid), bx.slice(mid));
  }
  const total = samples.length;
  return boxes
    .map((bx) => {
      let r = 0;
      let g = 0;
      let b = 0;
      for (const p of bx) {
        r += p[0];
        g += p[1];
        b += p[2];
      }
      const n = bx.length;
      return { rgb: [Math.round(r / n), Math.round(g / n), Math.round(b / n)], weight: +(n / total).toFixed(3) };
    })
    .sort((a, b) => b.weight - a.weight);
}

// ------------------------------------------------------- analysis ----------

mkdirSync(dirname(WORK), { recursive: true });
mkdirSync(dirname(OUT_FLOW), { recursive: true });

const srcInfo = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', SOURCE], { encoding: 'utf8' });
const srcW = Number(/pixelWidth:\s*(\d+)/.exec(srcInfo)?.[1] ?? 0);
const srcH = Number(/pixelHeight:\s*(\d+)/.exec(srcInfo)?.[1] ?? 0);

console.log(`source ${srcW}×${srcH} -> analysis width ${ANALYSIS_WIDTH}`);
execFileSync('sips', ['-s', 'format', 'png', '-Z', String(ANALYSIS_WIDTH), SOURCE, '--out', WORK], { stdio: 'ignore' });
// Web-sized painting texture the renderer loads (the 5.3 MB source is too heavy to ship).
execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '82', '-Z', '1600', SOURCE, '--out', OUT_PAINTING], { stdio: 'ignore' });
console.log('wrote painting.jpg (web texture)');

const t0 = Date.now();
const work = decodePNG(readFileSync(WORK));
const W = work.width;
const H = work.height;
const px = work.rgba;
console.log(`decoded ${W}×${H}`);

const lum = new Float64Array(W * H);
for (let i = 0; i < W * H; i++) lum[i] = 0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2];
const lumB = gaussianBlur(lum, W, H, PRE_BLUR);

const gx = new Float64Array(W * H);
const gy = new Float64Array(W * H);
for (let y = 0; y < H; y++)
  for (let x = 0; x < W; x++) {
    const xm = x > 0 ? x - 1 : 0;
    const xp = x < W - 1 ? x + 1 : W - 1;
    const ym = y > 0 ? y - 1 : 0;
    const yp = y < H - 1 ? y + 1 : H - 1;
    const tl = lumB[ym * W + xm];
    const tc = lumB[ym * W + x];
    const tr = lumB[ym * W + xp];
    const ml = lumB[y * W + xm];
    const mr = lumB[y * W + xp];
    const bl = lumB[yp * W + xm];
    const bc = lumB[yp * W + x];
    const br = lumB[yp * W + xp];
    gx[y * W + x] = tr + 2 * mr + br - (tl + 2 * ml + bl);
    gy[y * W + x] = bl + 2 * bc + br - (tl + 2 * tc + tr);
  }

const Jxx = new Float64Array(W * H);
const Jxy = new Float64Array(W * H);
const Jyy = new Float64Array(W * H);
for (let i = 0; i < W * H; i++) {
  Jxx[i] = gx[i] * gx[i];
  Jxy[i] = gx[i] * gy[i];
  Jyy[i] = gy[i] * gy[i];
}
const Sxx = gaussianBlur(Jxx, W, H, TENSOR_SIGMA);
const Sxy = gaussianBlur(Jxy, W, H, TENSOR_SIGMA);
const Syy = gaussianBlur(Jyy, W, H, TENSOR_SIGMA);

// Stroke orientation = gradient orientation rotated 90°. In double-angle form the
// along-stroke vector is ∝ (Syy-Sxx, -2·Sxy). Coherence = (λ1-λ2)/(λ1+λ2).
const cos2 = new Float64Array(W * H);
const sin2 = new Float64Array(W * H);
const coh = new Float64Array(W * H);
const energy = new Float64Array(W * H);
for (let i = 0; i < W * H; i++) {
  const a = Sxx[i];
  const b = Sxy[i];
  const c = Syy[i];
  let dax = c - a;
  let day = -2 * b;
  const mag = Math.hypot(dax, day);
  if (mag > 1e-12) {
    dax /= mag;
    day /= mag;
  } else {
    dax = 0;
    day = 0;
  }
  cos2[i] = dax;
  sin2[i] = day;
  const tr = a + c;
  coh[i] = tr > 1e-9 ? Math.min(1, Math.sqrt((a - c) * (a - c) + 4 * b * b) / tr) : 0;
  energy[i] = tr;
}

// Gate coherence by gradient energy: a strong orientation ratio in a near-flat patch is
// meaningless noise, so fade it where there is little stroke energy. Percentile-based so it
// adapts to the image rather than a magic threshold.
const eSamples: number[] = [];
const eStride = Math.max(1, Math.floor((W * H) / 100000));
for (let i = 0; i < W * H; i += eStride) eSamples.push(energy[i]);
eSamples.sort((a, b) => a - b);
const ePct = (p: number) => eSamples[Math.min(eSamples.length - 1, Math.floor(p * eSamples.length))];
const eLo = ePct(0.3);
const eHi = ePct(0.85);
for (let i = 0; i < W * H; i++) {
  let t = (energy[i] - eLo) / (eHi - eLo + 1e-9);
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  coh[i] *= t * t * (3 - 2 * t); // smoothstep
}

const flow = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) {
  flow[i * 4] = Math.round((cos2[i] * 0.5 + 0.5) * 255);
  flow[i * 4 + 1] = Math.round((sin2[i] * 0.5 + 0.5) * 255);
  flow[i * 4 + 2] = Math.round(coh[i] * 255);
  flow[i * 4 + 3] = 255;
}
writeFileSync(OUT_FLOW, encodePNG(W, H, flow));
console.log(`wrote flow-field.png (${((Date.now() - t0) / 1000).toFixed(1)}s)`);

// ------------------------------------------------------- LIC capture -------

function noiseAt(x: number, y: number): number {
  let n = (Math.imul(x, 374761393) + Math.imul(y, 668265263)) >>> 0;
  n = (n ^ (n >>> 13)) >>> 0;
  n = Math.imul(n, 1274126177) >>> 0;
  return (n % 1024) / 1023;
}

function sampleDir(x: number, y: number): [number, number] {
  let x0 = Math.floor(x);
  let y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  if (x0 < 0) x0 = 0;
  else if (x0 > W - 1) x0 = W - 1;
  if (y0 < 0) y0 = 0;
  else if (y0 > H - 1) y0 = H - 1;
  const x1 = x0 < W - 1 ? x0 + 1 : x0;
  const y1 = y0 < H - 1 ? y0 + 1 : y0;
  const i00 = y0 * W + x0;
  const i10 = y0 * W + x1;
  const i01 = y1 * W + x0;
  const i11 = y1 * W + x1;
  const c = (cos2[i00] * (1 - fx) + cos2[i10] * fx) * (1 - fy) + (cos2[i01] * (1 - fx) + cos2[i11] * fx) * fy;
  const s = (sin2[i00] * (1 - fx) + sin2[i10] * fx) * (1 - fy) + (sin2[i01] * (1 - fx) + sin2[i11] * fx) * fy;
  const th = 0.5 * Math.atan2(s, c);
  return [Math.cos(th), Math.sin(th)];
}

function licAt(px0: number, py0: number): number {
  let sum = 0;
  let cnt = 0;
  for (let sign = 0; sign < 2; sign++) {
    let x = px0 + 0.5;
    let y = py0 + 0.5;
    const d = sampleDir(x, y);
    let dx = sign === 0 ? d[0] : -d[0];
    let dy = sign === 0 ? d[1] : -d[1];
    for (let i = 0; i < LIC_LENGTH; i++) {
      sum += noiseAt(Math.round(x), Math.round(y));
      cnt++;
      const nd = sampleDir(x, y);
      let sx = nd[0];
      let sy = nd[1];
      if (sx * dx + sy * dy < 0) {
        sx = -sx;
        sy = -sy;
      }
      dx = sx;
      dy = sy;
      x += dx * LIC_STEP;
      y += dy * LIC_STEP;
      if (x < 0 || y < 0 || x >= W || y >= H) break;
    }
  }
  return cnt ? sum / cnt : 0.5;
}

const lic = new Float64Array(W * H);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) lic[y * W + x] = licAt(x, y);
let mean = 0;
for (let i = 0; i < W * H; i++) mean += lic[i];
mean /= W * H;
let varr = 0;
for (let i = 0; i < W * H; i++) {
  const d = lic[i] - mean;
  varr += d * d;
}
const std = Math.sqrt(varr / (W * H)) || 1e-6;
const lo = mean - 2 * std;
const hi = mean + 2 * std;

const greyImg = new Uint8Array(W * H * 4);
const overlay = new Uint8Array(W * H * 4);
const cohImg = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) {
  const n = Math.min(1, Math.max(0, (lic[i] - lo) / (hi - lo)));
  const v = Math.round(n * 255);
  greyImg[i * 4] = greyImg[i * 4 + 1] = greyImg[i * 4 + 2] = v;
  greyImg[i * 4 + 3] = 255;
  const f = 0.4 + 1.2 * n;
  for (let c = 0; c < 3; c++) overlay[i * 4 + c] = Math.min(255, Math.max(0, Math.round(px[i * 4 + c] * f)));
  overlay[i * 4 + 3] = 255;
  const cv = Math.round(Math.sqrt(coh[i]) * 255);
  cohImg[i * 4] = cohImg[i * 4 + 1] = cohImg[i * 4 + 2] = cv;
  cohImg[i * 4 + 3] = 255;
}
writeFileSync(OUT_LIC, encodePNG(W, H, greyImg));
writeFileSync(OUT_LIC_OVERLAY, encodePNG(W, H, overlay));
writeFileSync(OUT_COHERENCE, encodePNG(W, H, cohImg));
console.log(`wrote LIC captures (${((Date.now() - t0) / 1000).toFixed(1)}s)`);

// ------------------------------------------ signed flow + sky mask (Phase 0) ----
// A DIRECTED flow for GPU advection: take the undirected orientation and sign-align it to a SMOOTH
// circulation field built from the painting's swirl centres, so the living-painting shader rotates each
// swirl the right way (a stateless half-plane hack cannot — Codex plan-review). The circulation field is
// smooth and directed everywhere (gaussian tails overlap), so there is no branch-cut seam at the vortices.

// Swirl centres in UV (x right, y down), rotation sign, gaussian falloff radius. Central whorl dominates;
// the bright stars add local halo swirl. Signs are validated by the living-painting capture (flip if a
// swirl turns the wrong way).
const SWIRLS: [number, number, number, number][] = [
  [0.45, 0.41, +1, 0.2], // central whorl (dominant)
  [0.52, 0.37, -1, 0.12], // counter-roll of the double comma
  [0.27, 0.33, -1, 0.07], // Venus / bright left star
  [0.13, 0.13, +1, 0.05],
  [0.31, 0.13, -1, 0.05],
  [0.4, 0.1, +1, 0.05],
  [0.52, 0.2, -1, 0.05],
  [0.59, 0.1, +1, 0.05],
  [0.66, 0.27, -1, 0.05],
  [0.72, 0.18, +1, 0.05],
  [0.1, 0.42, +1, 0.05],
];

const signed = new Uint8Array(W * H * 4);
for (let y = 0; y < H; y++)
  for (let x = 0; x < W; x++) {
    const i = y * W + x;
    const u = (x + 0.5) / W;
    const v = (y + 0.5) / H;
    let cxr = 0;
    let cyr = 0;
    for (const [sx, sy, s, r] of SWIRLS) {
      const dux = u - sx;
      const dvy = v - sy;
      const w = Math.exp(-(dux * dux + dvy * dvy) / (r * r));
      cxr += s * -dvy * w; // tangential = sign · perp(p − centre)
      cyr += s * dux * w;
    }
    const th = 0.5 * Math.atan2(sin2[i], cos2[i]);
    let dx = Math.cos(th);
    let dy = Math.sin(th);
    if (dx * cxr + dy * cyr < 0) {
      dx = -dx;
      dy = -dy;
    }
    signed[i * 4] = Math.round((dx * 0.5 + 0.5) * 255);
    signed[i * 4 + 1] = Math.round((dy * 0.5 + 0.5) * 255);
    signed[i * 4 + 2] = Math.round(coh[i] * 255);
    signed[i * 4 + 3] = 255;
  }
writeFileSync(OUT_SIGNED_FLOW, encodePNG(W, H, signed));
console.log('wrote signed-flow.png');

// Sky mask: bright = sky (the living painting churns here), dark foreground (cypress/village/hills) stays
// still. Eroded inward so advected sky never samples across a silhouette, and the moon disc is forced
// static so the painted crescent does not smear (Codex plan-review).
const MOON_UV = [0.85, 0.16];
const MOON_R = 0.07;
const smooth01 = (x: number) => {
  const t = x < 0 ? 0 : x > 1 ? 1 : x;
  return t * t * (3 - 2 * t);
};
const maskRaw = new Float64Array(W * H);
for (let i = 0; i < W * H; i++) {
  const l = lumB[i];
  const lm = smooth01((l - 70) / 40); // bright enough to be sky
  const r = px[i * 4];
  const g = px[i * 4 + 1];
  const b = px[i * 4 + 2];
  // sky is BLUE; the cypress (and village) are green/brown — exclude them by chroma so their lighter
  // strokes don't churn (the creepy "churning tree"). Keep very-bright pixels (yellow star/swirl
  // highlights) as sky regardless, since they read as light, not foreground.
  const blue = smooth01((b - 0.5 * (r + g)) / 35);
  const bright = smooth01((l - 150) / 50);
  maskRaw[i] = lm * Math.max(blue, bright);
}
const maskBlur = gaussianBlur(maskRaw, W, H, 2.5);
const maskF = new Float64Array(W * H);
for (let y = 0; y < H; y++)
  for (let x = 0; x < W; x++) {
    const i = y * W + x;
    let m = (maskBlur[i] - 0.5) / 0.4; // erode: keep only the confident interior (smoothstep 0.5..0.9)
    m = m < 0 ? 0 : m > 1 ? 1 : m;
    m = m * m * (3 - 2 * m);
    const u = (x + 0.5) / W;
    const v = (y + 0.5) / H;
    const md = Math.hypot(u - MOON_UV[0], v - MOON_UV[1]);
    const moon = md <= MOON_R ? 0 : md >= MOON_R * 1.5 ? 1 : (md - MOON_R) / (MOON_R * 0.5);
    maskF[i] = m * moon;
  }
const maskImg = new Uint8Array(W * H * 4);
const maskOverlay = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) {
  const v = Math.round(maskF[i] * 255);
  maskImg[i * 4] = maskImg[i * 4 + 1] = maskImg[i * 4 + 2] = v;
  maskImg[i * 4 + 3] = 255;
  for (let c = 0; c < 3; c++) maskOverlay[i * 4 + c] = Math.round(px[i * 4 + c] * (0.25 + 0.75 * maskF[i]));
  maskOverlay[i * 4 + 3] = 255;
}
writeFileSync(OUT_SKY_MASK, encodePNG(W, H, maskImg));
writeFileSync(OUT_MASK_OVERLAY, encodePNG(W, H, maskOverlay));
console.log(`wrote sky-mask.png + overlay (${((Date.now() - t0) / 1000).toFixed(1)}s)`);

// --------------------------------------------------------- palette ---------

function collectSamples(rect: number[], maxSamples: number, minLum?: number, maxLum?: number): number[][] {
  const ix0 = Math.floor(rect[0] * W);
  const iy0 = Math.floor(rect[1] * H);
  const ix1 = Math.floor(rect[2] * W);
  const iy1 = Math.floor(rect[3] * H);
  const total = Math.max(1, (ix1 - ix0) * (iy1 - iy0));
  const step = Math.max(1, Math.floor(Math.sqrt(total / maxSamples)));
  const out: number[][] = [];
  for (let y = iy0; y < iy1; y += step)
    for (let x = ix0; x < ix1; x += step) {
      const i = (y * W + x) * 4;
      const r = px[i];
      const g = px[i + 1];
      const b = px[i + 2];
      if (minLum !== undefined || maxLum !== undefined) {
        const l = 0.299 * r + 0.587 * g + 0.114 * b;
        if (minLum !== undefined && l < minLum) continue;
        if (maxLum !== undefined && l > maxLum) continue;
      }
      out.push([r, g, b]);
    }
  return out;
}

function collectStars(): number[][] {
  const ix1 = W;
  const iy1 = Math.floor(0.55 * H);
  const cand: number[][] = [];
  for (let y = 0; y < iy1; y++)
    for (let x = 0; x < ix1; x++) {
      if (x > 0.78 * W && y < 0.32 * H) continue; // exclude the moon
      const i = (y * W + x) * 4;
      const r = px[i];
      const g = px[i + 1];
      const b = px[i + 2];
      const l = 0.299 * r + 0.587 * g + 0.114 * b;
      if (l > 175 && r + g > 2.0 * b) cand.push([l, r, g, b]);
    }
  cand.sort((a, b) => b[0] - a[0]);
  const keep = Math.max(50, Math.floor(cand.length * 0.15));
  return cand.slice(0, keep).map((c) => [c[1], c[2], c[3]]);
}

function toHex(rgb: number[]): string {
  return '#' + rgb.map((v) => v.toString(16).padStart(2, '0')).join('');
}

function entry(c: { rgb: number[]; weight: number }) {
  return {
    hex: toHex(c.rgb),
    srgb: c.rgb,
    lab: rgbToLab(c.rgb[0], c.rgb[1], c.rgb[2]).map((v) => +v.toFixed(1)),
    weight: c.weight,
  };
}

const REGIONS: { name: string; rect: number[]; minLum?: number; maxLum?: number }[] = [
  { name: 'sky', rect: [0.05, 0.05, 0.95, 0.5] },
  { name: 'moon', rect: [0.8, 0.1, 0.97, 0.3] },
  { name: 'cypress', rect: [0.02, 0.12, 0.2, 0.98], maxLum: 80 },
  { name: 'village', rect: [0.28, 0.66, 0.78, 0.86] },
  { name: 'hills', rect: [0.0, 0.84, 1.0, 1.0] },
];

const regions: Record<string, unknown> = {};
for (const reg of REGIONS) {
  const colours = medianCut(collectSamples(reg.rect, 25000, reg.minLum, reg.maxLum), 5).map(entry);
  const out: Record<string, unknown> = { rect: reg.rect, colours };
  if (reg.minLum !== undefined) out.minLum = reg.minLum;
  if (reg.maxLum !== undefined) out.maxLum = reg.maxLum;
  regions[reg.name] = out;
}
regions['stars'] = {
  rect: [0, 0, 1, 0.55],
  note: 'brightest warm points in the upper sky, moon excluded',
  colours: medianCut(collectStars(), 3).map(entry),
};

const palette = {
  meta: {
    source: 'Wikimedia Commons — Van Gogh, The Starry Night (Google Art Project), public domain',
    sourcePixels: [srcW, srcH],
    analysisPixels: [W, H],
    colourSpace: 'sRGB (8-bit); lab is CIELAB D65',
    method: 'median-cut per region; see docs/decisions/0001-reference-pipeline.md',
  },
  regions,
};
writeFileSync(OUT_PALETTE, JSON.stringify(palette, null, 2) + '\n');
console.log(`wrote palette.json — ${REGIONS.length + 1} regions (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
