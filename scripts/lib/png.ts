/**
 * Dependency-free 8-bit PNG codec (Node `zlib` only) for the offline reference pipelines.
 *
 * Sole owner of the codec: derive-reference.ts, extend-reference.ts, slim-flow-field.ts and
 * slim-reference.ts all import it. It previously had two hand-synced copies, which is how the
 * encoder's filter-0/forced-RGBA waste survived unnoticed in the Phase-0 pipeline long after the
 * shared copy was extracted — a fix had to be applied three times to count, so it never was.
 * scripts/png.test.ts pins the round-trip and the storage choices.
 *
 * Note for anyone re-running derive-reference.ts: its committed output is post-processed
 * (slim-flow-field.ts downsamples flow-field.png after the bake), so a bare re-run leaves that
 * asset full-res. That is a pipeline-ordering caveat, not a reason to fork the codec again.
 */

import { deflateSync, inflateSync } from 'node:zlib';

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

export type DecodedPNG = { width: number; height: number; rgba: Uint8Array };

export function decodePNG(buf: Buffer): DecodedPNG {
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

/**
 * Encode RGBA as the smallest PNG that decodes back to exactly these bytes.
 *
 * Two storage decisions, both lossless — the decoded RGBA is byte-identical either way, so the
 * runtime (which only ever sees decoded pixels) cannot tell:
 *
 *  - **Channels.** Every asset this pipeline bakes is fully opaque, and the mask is grey; storing
 *    a constant alpha plane and three copies of the same grey cost ~25%/75% of the raw bytes for
 *    nothing. Detected from the data, so a future bake that DOES use alpha keeps it.
 *  - **Filtering.** PNG's per-row filters are what make it compress continuous-tone images at all.
 *    This encoder previously wrote filter 0 (none) on every row, which left deflate to squeeze raw
 *    brushwork — the reference set was ~38% larger than it needed to be. Row filter chosen by the
 *    minimum-sum-of-absolute-differences heuristic from the PNG spec.
 */
export function encodePNG(width: number, height: number, rgba: Uint8Array): Buffer {
  const pixels = width * height;
  let hasAlpha = false;
  let hasColour = false;
  for (let i = 0; i < pixels; i++) {
    const r = rgba[i * 4];
    if (rgba[i * 4 + 3] !== 255) hasAlpha = true;
    if (r !== rgba[i * 4 + 1] || r !== rgba[i * 4 + 2]) hasColour = true;
    if (hasAlpha && hasColour) break;
  }
  const channels = hasAlpha ? 4 : hasColour ? 3 : 1;
  const colourType = channels === 4 ? 6 : channels === 3 ? 2 : 0;

  // Pack down to the channels we are actually storing.
  const stride = width * channels;
  const samples = new Uint8Array(stride * height);
  for (let i = 0; i < pixels; i++) {
    const s = i * channels;
    samples[s] = rgba[i * 4];
    if (channels >= 3) {
      samples[s + 1] = rgba[i * 4 + 1];
      samples[s + 2] = rgba[i * 4 + 2];
      if (channels === 4) samples[s + 3] = rgba[i * 4 + 3];
    }
  }

  const raw = Buffer.alloc((stride + 1) * height);
  const prev = new Uint8Array(stride);
  const candidates = [0, 1, 2, 3, 4].map(() => new Uint8Array(stride));
  for (let y = 0; y < height; y++) {
    const row = samples.subarray(y * stride, (y + 1) * stride);
    let best = 0;
    let bestScore = Infinity;
    for (let f = 0; f < 5; f++) {
      const out = candidates[f];
      let score = 0;
      for (let x = 0; x < stride; x++) {
        const a = x >= channels ? row[x - channels] : 0;
        const b = prev[x];
        const c = x >= channels ? prev[x - channels] : 0;
        const v = row[x];
        const filtered =
          f === 0 ? v : f === 1 ? (v - a) & 255 : f === 2 ? (v - b) & 255 : f === 3 ? (v - ((a + b) >> 1)) & 255 : (v - paeth(a, b, c)) & 255;
        out[x] = filtered;
        score += filtered < 128 ? filtered : 256 - filtered; // treat bytes as signed magnitudes
      }
      if (score < bestScore) {
        bestScore = score;
        best = f;
      }
    }
    const at = y * (stride + 1);
    raw[at] = best;
    for (let x = 0; x < stride; x++) raw[at + 1 + x] = candidates[best][x];
    prev.set(row);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = colourType;
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
