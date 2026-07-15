/**
 * Criminisi-style exemplar inpainting for the offline pipeline (S2 of
 * docs/superpowers/plans/2026-07-14-offline-inpaint-extend-pipeline.md).
 *
 * Fills a region with real patches of the same image, deterministically:
 *  - onion-peel the fill boundary in priority order — confidence × a flow data term, so
 *    boundary pixels whose surrounding strokes run INTO the hole fill first (structure
 *    continues before texture fills the calm areas);
 *  - for each target patch, search donor patches over a fixed candidate lattice (coarse
 *    stride, then stride-1 refinement around the best coarse hits — exhaustive and RNG-free,
 *    so reruns are byte-identical), scored by SSD over the target's known pixels plus a
 *    flow-orientation agreement term (undirected: stroke texture cares about orientation,
 *    not circulation sign);
 *  - copy the winner into the unknown pixels, feather-blend into previously-FILLED pixels
 *    (NEVER into original paint — pixels outside the fill region are never written), and
 *    record the source offset per pixel so the flow field can later be filled from wherever
 *    the paint came from.
 *
 * Donors come only from ORIGINAL image pixels (filled pixels never donate — no error
 * propagation), pre-gated by the caller via per-pixel flags: donor validity, bright-warm
 * cores (star/moon light must not be copied into the fill — no phantom stars), treeish
 * chroma (a patch may contain at most a small fraction). Patch-level gates are O(1) per
 * candidate via summed-area tables.
 *
 * A working flow field at image resolution is maintained alongside the colour: filled pixels
 * take their donor's flow, so later placements never read the cut-out's garbage flow.
 *
 * Pure logic, no IO; the driver owns files and flag preparation. Tests feed synthetic images.
 */

import type { DecodedPNG } from './png.ts';

export type InpaintOptions = {
  /** patch half-size; 6 → 13×13 (plan: tune 9–21) */
  patchRadius: number;
  /** donor search radius around the target (px) */
  searchRadiusPx: number;
  /** coarse lattice stride (px) */
  coarseStridePx: number;
  /** how many coarse winners get stride-1 refinement */
  refineTopK: number;
  /** refinement half-window around each coarse winner (px) */
  refineRadiusPx: number;
  /** weight of the flow-orientation disagreement term against per-pixel SSD */
  flowWeight: number;
  /** a donor patch may contain at most this fraction of treeish pixels */
  donorTreeishMaxFraction: number;
  /** priority floor for the data term so pure-texture areas still fill */
  dataTermFloor: number;
  /** feather strength when blending a donor over previously-filled pixels (0 = hard copy) */
  featherAlpha: number;
  /** per-placement tone adaptation: the donor is shifted toward the target's known-pixel mean,
   *  clamped to ±this per channel (0 = off). Kills patch-to-patch block-tone seams while
   *  keeping the donor's stroke texture. */
  toneShiftMax: number;
};

export type InpaintFlags = {
  /** 1 = pixel is in the fill region (unknown, to be painted) */
  fill: Uint8Array;
  /** 1 = pixel may appear in a donor patch (outside fill, in the sky band, unguarded) */
  donorOK: Uint8Array;
  /** 1 = bright-warm core pixel (star/moon light) — a donor patch containing any is invalid */
  bright: Uint8Array;
  /** 1 = treeish chroma — a donor patch may contain at most donorTreeishMaxFraction of these */
  treeish: Uint8Array;
  /** normalised flow direction per pixel, pairs [dx, dy]; the fill region's entries are
   *  garbage (the cut-out's flow) and are ignored until overwritten by donor flow */
  flow: Float32Array;
};

export type InpaintResult = {
  /** the image with the fill region painted (all other pixels byte-identical) */
  rgba: Uint8Array;
  /** per-pixel donor index for filled pixels, -1 elsewhere */
  srcOf: Int32Array;
  /** working flow after fill (filled pixels carry their donor's flow) */
  flow: Float32Array;
  /** patch placements in fill order (target/source patch centres), for tests and logs */
  placements: { target: number; source: number }[];
};

/** Summed-area table over a per-pixel 0/1 flag; query is an inclusive box count. */
function sat(flag: Uint8Array, w: number, h: number): Float64Array {
  const t = new Float64Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y++) {
    let row = 0;
    for (let x = 0; x < w; x++) {
      row += flag[y * w + x];
      t[(y + 1) * (w + 1) + (x + 1)] = t[y * (w + 1) + (x + 1)] + row;
    }
  }
  return t;
}

function satBox(t: Float64Array, w: number, x0: number, y0: number, x1: number, y1: number): number {
  return (
    t[(y1 + 1) * (w + 1) + (x1 + 1)] - t[y0 * (w + 1) + (x1 + 1)] - t[(y1 + 1) * (w + 1) + x0] + t[y0 * (w + 1) + x0]
  );
}

export function inpaint(image: DecodedPNG, flags: InpaintFlags, opts: InpaintOptions): InpaintResult {
  const { width: w, height: h } = image;
  const N = w * h;
  const r = opts.patchRadius;
  const patchArea = (2 * r + 1) * (2 * r + 1);
  const rgba = new Uint8Array(image.rgba);
  const srcOf = new Int32Array(N).fill(-1);
  const flow = new Float32Array(flags.flow);
  const placements: { target: number; source: number }[] = [];

  // known = original non-fill pixels; fill pixels become known as they are painted.
  const known = new Uint8Array(N);
  let unknownCount = 0;
  for (let i = 0; i < N; i++) {
    if (flags.fill[i]) unknownCount++;
    else known[i] = 1;
  }

  // Patch validity for donor centres, O(1) per candidate via SATs. A valid donor patch is
  // fully in-image, all-donorOK, zero bright pixels, and within the treeish budget.
  const donorBad = new Uint8Array(N);
  for (let i = 0; i < N; i++) donorBad[i] = flags.donorOK[i] ? 0 : 1;
  const satBad = sat(donorBad, w, h);
  const satBright = sat(flags.bright, w, h);
  const satTreeish = sat(flags.treeish, w, h);
  const treeishBudget = opts.donorTreeishMaxFraction * patchArea;
  const validDonorCentre = (cx: number, cy: number): boolean => {
    if (cx < r || cy < r || cx >= w - r || cy >= h - r) return false;
    const x0 = cx - r;
    const y0 = cy - r;
    const x1 = cx + r;
    const y1 = cy + r;
    if (satBox(satBad, w, x0, y0, x1, y1) > 0) return false;
    if (satBox(satBright, w, x0, y0, x1, y1) > 0) return false;
    return satBox(satTreeish, w, x0, y0, x1, y1) <= treeishBudget;
  };

  // Confidence (Criminisi): 1 for original known, 0 for unknown; filled pixels inherit the
  // mean confidence of the patch that painted them.
  const confidence = new Float32Array(N);
  for (let i = 0; i < N; i++) confidence[i] = known[i];

  // ---- boundary bookkeeping ------------------------------------------------------------
  const isBoundary = new Uint8Array(N);
  const boundary = new Set<number>();
  const priority = new Float32Array(N);

  const isBoundaryAt = (i: number): boolean => {
    if (!flags.fill[i] || known[i]) return false;
    const x = i % w;
    if (x > 0 && known[i - 1]) return true;
    if (x < w - 1 && known[i + 1]) return true;
    if (i >= w && known[i - w]) return true;
    if (i < N - w && known[i + w]) return true;
    return false;
  };

  /** Priority = mean confidence of known patch pixels × flow-into-hole data term. */
  const priorityAt = (i: number): number => {
    const x = i % w;
    const y = (i / w) | 0;
    let cSum = 0;
    let nx = 0; // into-hole normal ≈ minus the sum of offsets toward known neighbours
    let ny = 0;
    let fx = 0; // mean known flow near the boundary pixel
    let fy = 0;
    let nFlow = 0;
    for (let dy = -r; dy <= r; dy++) {
      const yy = y + dy;
      if (yy < 0 || yy >= h) continue;
      for (let dx = -r; dx <= r; dx++) {
        const xx = x + dx;
        if (xx < 0 || xx >= w) continue;
        const j = yy * w + xx;
        if (!known[j]) continue;
        cSum += confidence[j];
        if (Math.abs(dx) <= 2 && Math.abs(dy) <= 2) {
          nx -= dx;
          ny -= dy;
          fx += flow[j * 2];
          fy += flow[j * 2 + 1];
          nFlow++;
        }
      }
    }
    const c = cSum / patchArea;
    let d = opts.dataTermFloor;
    const nLen = Math.hypot(nx, ny);
    const fLen = Math.hypot(fx, fy);
    if (nLen > 1e-6 && fLen > 1e-6 && nFlow > 0) {
      // |cos| — a stroke crossing the boundary runs along the hole normal, undirected
      d = Math.max(opts.dataTermFloor, Math.abs((nx * fx + ny * fy) / (nLen * fLen)));
    }
    return c * d;
  };

  const refreshBoundaryAround = (cx: number, cy: number, radius: number): void => {
    for (let y = Math.max(0, cy - radius); y <= Math.min(h - 1, cy + radius); y++) {
      for (let x = Math.max(0, cx - radius); x <= Math.min(w - 1, cx + radius); x++) {
        const i = y * w + x;
        const should = isBoundaryAt(i);
        if (should && !isBoundary[i]) {
          isBoundary[i] = 1;
          boundary.add(i);
          priority[i] = priorityAt(i);
        } else if (!should && isBoundary[i]) {
          isBoundary[i] = 0;
          boundary.delete(i);
        } else if (should) {
          priority[i] = priorityAt(i);
        }
      }
    }
  };

  for (let i = 0; i < N; i++) {
    if (isBoundaryAt(i)) {
      isBoundary[i] = 1;
      boundary.add(i);
      priority[i] = priorityAt(i);
    }
  }

  // ---- target patch scoring ------------------------------------------------------------
  /** SSD over the target's known pixels (early-out past `best`), plus flow disagreement. */
  const scoreCandidate = (tx: number, ty: number, cx: number, cy: number, tFlowX: number, tFlowY: number, tFlowLen: number, best: number): number => {
    let ssd = 0;
    let n = 0;
    for (let dy = -r; dy <= r; dy++) {
      const tyy = ty + dy;
      if (tyy < 0 || tyy >= h) continue;
      const cyy = cy + dy;
      for (let dx = -r; dx <= r; dx++) {
        const txx = tx + dx;
        if (txx < 0 || txx >= w) continue;
        const t = tyy * w + txx;
        if (!known[t]) continue;
        const c = (cyy * w + (cx + dx)) * 4;
        const tp = t * 4;
        const dr = rgba[tp] - rgba[c];
        const dg = rgba[tp + 1] - rgba[c + 1];
        const db = rgba[tp + 2] - rgba[c + 2];
        ssd += dr * dr + dg * dg + db * db;
        n++;
      }
      if (n > 0 && ssd / n > best) return Infinity; // cannot win — bail early
    }
    if (n === 0) return Infinity;
    let score = ssd / n;
    if (tFlowLen > 1e-6) {
      const ci = (cy * w + cx) * 2;
      const cLen = Math.hypot(flow[ci], flow[ci + 1]);
      if (cLen > 1e-6) {
        const cos = Math.abs((tFlowX * flow[ci] + tFlowY * flow[ci + 1]) / (tFlowLen * cLen));
        score += opts.flowWeight * (1 - cos);
      }
    }
    return score;
  };

  // ---- main loop -----------------------------------------------------------------------
  while (unknownCount > 0) {
    // Highest-priority boundary pixel (fixed iteration order → deterministic tie-break).
    let target = -1;
    let bestP = -Infinity;
    for (const i of boundary) {
      if (priority[i] > bestP) {
        bestP = priority[i];
        target = i;
      }
    }
    if (target === -1) {
      // No boundary but unknowns remain (fully enclosed by other unknowns cannot happen in a
      // connected fill; guard anyway): promote any unknown adjacent to the image state.
      for (let i = 0; i < N; i++) {
        if (flags.fill[i] && !known[i]) {
          target = i;
          break;
        }
      }
      if (target === -1) break;
    }
    const tx = target % w;
    const ty = (target / w) | 0;

    // Mean known flow of the target patch (undirected agreement uses |cos|, sign is fine).
    let tFlowX = 0;
    let tFlowY = 0;
    for (let dy = -r; dy <= r; dy++) {
      const yy = ty + dy;
      if (yy < 0 || yy >= h) continue;
      for (let dx = -r; dx <= r; dx++) {
        const xx = tx + dx;
        if (xx < 0 || xx >= w) continue;
        const j = yy * w + xx;
        if (!known[j]) continue;
        tFlowX += flow[j * 2];
        tFlowY += flow[j * 2 + 1];
      }
    }
    const tFlowLen = Math.hypot(tFlowX, tFlowY);

    // Coarse lattice search, then stride-1 refinement around the best hits.
    const R = opts.searchRadiusPx;
    const coarse: { score: number; cx: number; cy: number }[] = [];
    let bestScore = Infinity;
    for (let cy = ty - R; cy <= ty + R; cy += opts.coarseStridePx) {
      for (let cx = tx - R; cx <= tx + R; cx += opts.coarseStridePx) {
        if (!validDonorCentre(cx, cy)) continue;
        const s = scoreCandidate(tx, ty, cx, cy, tFlowX, tFlowY, tFlowLen, Infinity);
        if (s === Infinity) continue;
        coarse.push({ score: s, cx, cy });
        if (s < bestScore) bestScore = s;
      }
    }
    coarse.sort((a, b) => a.score - b.score);
    let bestCx = -1;
    let bestCy = -1;
    let best = Infinity;
    for (const hit of coarse.slice(0, opts.refineTopK)) {
      for (let cy = hit.cy - opts.refineRadiusPx; cy <= hit.cy + opts.refineRadiusPx; cy++) {
        for (let cx = hit.cx - opts.refineRadiusPx; cx <= hit.cx + opts.refineRadiusPx; cx++) {
          if (!validDonorCentre(cx, cy)) continue;
          const s = scoreCandidate(tx, ty, cx, cy, tFlowX, tFlowY, tFlowLen, best);
          if (s < best) {
            best = s;
            bestCx = cx;
            bestCy = cy;
          }
        }
      }
    }
    if (bestCx === -1) {
      // No valid donor in range (should not happen with a generous radius) — widen once by
      // scanning the whole image coarsely rather than failing the bake.
      for (let cy = r; cy < h - r; cy += opts.coarseStridePx) {
        for (let cx = r; cx < w - r; cx += opts.coarseStridePx) {
          if (!validDonorCentre(cx, cy)) continue;
          const s = scoreCandidate(tx, ty, cx, cy, tFlowX, tFlowY, tFlowLen, best);
          if (s < best) {
            best = s;
            bestCx = cx;
            bestCy = cy;
          }
        }
      }
      if (bestCx === -1) throw new Error('inpaint: no valid donor patch anywhere');
    }

    // Copy the donor: unknown pixels take it outright (and its flow, and the source offset);
    // previously-FILLED pixels get a feathered blend; original paint is never written.
    // Tone adaptation: shift the donor toward the target's known-pixel mean (clamped) so
    // adjacent placements agree in base tone instead of tiling as rectangles.
    let cPatch = 0;
    let tSumR = 0;
    let tSumG = 0;
    let tSumB = 0;
    let dSumR = 0;
    let dSumG = 0;
    let dSumB = 0;
    let nMean = 0;
    for (let dy = -r; dy <= r; dy++) {
      const yy = ty + dy;
      if (yy < 0 || yy >= h) continue;
      const cyy = bestCy + dy;
      for (let dx = -r; dx <= r; dx++) {
        const xx = tx + dx;
        if (xx < 0 || xx >= w) continue;
        const t = yy * w + xx;
        if (!known[t]) continue;
        cPatch += confidence[t];
        const tp = t * 4;
        const sp = (cyy * w + (bestCx + dx)) * 4;
        tSumR += rgba[tp];
        tSumG += rgba[tp + 1];
        tSumB += rgba[tp + 2];
        dSumR += rgba[sp];
        dSumG += rgba[sp + 1];
        dSumB += rgba[sp + 2];
        nMean++;
      }
    }
    cPatch /= patchArea;
    const clampShift = (s: number) => Math.max(-opts.toneShiftMax, Math.min(opts.toneShiftMax, s));
    const shR = nMean > 0 ? clampShift((tSumR - dSumR) / nMean) : 0;
    const shG = nMean > 0 ? clampShift((tSumG - dSumG) / nMean) : 0;
    const shB = nMean > 0 ? clampShift((tSumB - dSumB) / nMean) : 0;
    const u8 = (x: number) => Math.max(0, Math.min(255, Math.round(x)));

    for (let dy = -r; dy <= r; dy++) {
      const yy = ty + dy;
      if (yy < 0 || yy >= h) continue;
      const cyy = bestCy + dy;
      for (let dx = -r; dx <= r; dx++) {
        const xx = tx + dx;
        if (xx < 0 || xx >= w) continue;
        const t = yy * w + xx;
        if (!flags.fill[t]) continue; // original paint: hands off
        const s = cyy * w + (bestCx + dx);
        if (!known[t]) {
          rgba[t * 4] = u8(rgba[s * 4] + shR);
          rgba[t * 4 + 1] = u8(rgba[s * 4 + 1] + shG);
          rgba[t * 4 + 2] = u8(rgba[s * 4 + 2] + shB);
          rgba[t * 4 + 3] = 255;
          flow[t * 2] = flow[s * 2];
          flow[t * 2 + 1] = flow[s * 2 + 1];
          srcOf[t] = s;
          confidence[t] = cPatch;
          known[t] = 1;
          unknownCount--;
        } else if (opts.featherAlpha > 0) {
          const wgt = opts.featherAlpha * (1 - Math.max(Math.abs(dx), Math.abs(dy)) / (r + 1));
          if (wgt > 0) {
            rgba[t * 4] = Math.round(rgba[t * 4] * (1 - wgt) + u8(rgba[s * 4] + shR) * wgt);
            rgba[t * 4 + 1] = Math.round(rgba[t * 4 + 1] * (1 - wgt) + u8(rgba[s * 4 + 1] + shG) * wgt);
            rgba[t * 4 + 2] = Math.round(rgba[t * 4 + 2] * (1 - wgt) + u8(rgba[s * 4 + 2] + shB) * wgt);
          }
        }
      }
    }
    placements.push({ target, source: bestCy * w + bestCx });
    refreshBoundaryAround(tx, ty, r + 2);
  }

  return { rgba, srcOf, flow, placements };
}
