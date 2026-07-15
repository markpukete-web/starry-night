/**
 * Dependency-free 8-bit PNG codec (Node `zlib` only) for the offline reference pipelines.
 *
 * Extracted from the codec embedded in scripts/derive-reference.ts so extend-reference.ts can
 * share it. derive-reference.ts deliberately KEEPS its own copy: it is a settled Phase-0
 * pipeline whose committed outputs were post-processed (scripts/slim-flow-field.ts downsampled
 * flow-field.png after the bake), so re-running it to verify a refactor would overwrite the
 * slimmed asset. Keep the two copies byte-for-byte in sync if a bug is ever found.
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

export function encodePNG(width: number, height: number, rgba: Uint8Array): Buffer {
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
