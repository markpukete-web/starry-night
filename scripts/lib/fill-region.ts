/**
 * Fill-region detection for the offline inpaint pipeline (S1 of
 * docs/superpowers/plans/2026-07-14-offline-inpaint-extend-pipeline.md).
 *
 * The sky-mask is a CHURN mask, not a segmentation: dark means "don't churn here", which covers
 * the cypress cut-out but ALSO real painting that must never be inpainted — star cores, the
 * deliberately-zeroed moon disc, dark navy stroke-gaps, horizon smudges, the whole foreground.
 * (The first threshold-only pass caught 33% of the image; the overlay showed why.)
 *
 * So a mask hole alone is not enough. The fill region is built from evidence that the pixels are
 * the CUT-OUT TREE, not just "not sky":
 *  - hole candidates: mask ≤ holeMaskMax, in the sky band, DARK paint (the tree is near-black —
 *    any bright pixel is real star/halo/cloud paint and survives, even inside the tree column);
 *  - connected components qualify only when a meaningful fraction of their paint is treeish
 *    chroma (the tree column ≈ 90%; star cores are gold, navy gaps blue-dominant → dropped);
 *  - of the qualifiers, keep the PRIMARY (largest — the tree) plus satellites within reach of
 *    it: the tree is ONE rooted object with close-by detached tufts, while dark umber strokes
 *    far away in the sky are Van Gogh's own paint however treeish their chroma reads;
 *  - the trunk extends below the band by column continuity only (runtime ribbon trails dip
 *    under v = skyBandV, so the fill must reach there; sideways growth would merge into the
 *    foreground mass, so only straight down);
 *  - feathered mask edge (≤ featherMaskMax) near the kept region — the blend zone that smears
 *    tree browns into sky;
 *  - chroma wisps near the kept region (the mask-missed fringe families measured at runtime);
 *  - a small dilation margin, never onto bright paint.
 *
 * The moon is guarded outright: its mask disc is zeroed by design (derive-reference.ts keeps the
 * crescent static) and its painted umber OUTLINE passes the treeish chroma test, so without a
 * generous guard the pipeline would erase the moon's outline.
 *
 * Pure functions, no IO — the driver (scripts/extend-reference.ts) owns files; tests can feed
 * synthetic images (same discipline as scripts/painting-regions.test.ts).
 */

import type { DecodedPNG } from './png.ts';

// Label classes (higher label never overwrites lower).
export const FILL_NONE = 0;
export const FILL_HOLE = 1; // kept cut-out component
export const FILL_FEATHER = 2; // feathered mask edge near a kept component
export const FILL_WISP = 3; // treeish chroma near the kept region
export const FILL_DILATED = 4; // dilation margin around the union

export type FillRegionOptions = {
  /** Open sky band: image-space v below which cut-outs are obsolete (PaintingFlowSky3D uses 0.62). */
  skyBandV: number;
  /** Raw mask value at/below which a pixel is a hole candidate (runtime hole test: ≤ 16). */
  holeMaskMax: number;
  /** Raw mask value at/below which a pixel is feathered edge (runtime donors demand > 140). */
  featherMaskMax: number;
  /** Paint at/above this luminance (0–1) is never filled — the tree is near-black; bright pixels
   *  are real star/halo/cloud paint even when the mask around them is dark. */
  paintingLumMax: number;
  /** Hole components smaller than this (px) are mask speckle, not the tree. */
  minComponentPx: number;
  /** A hole component qualifies only when at least this fraction of its pixels is treeish. */
  treeishMinFraction: number;
  /** Qualifying components join the fill only within this radius (px) of the primary (largest)
   *  component — the tree's detached tufts are close; distant dark strokes are real paint. */
  componentReachPx: number;
  /** The trunk continues below the band by up to this much v, grown straight down only. */
  bandBelowMarginV: number;
  /** Feather pixels join within this radius (px) of a kept component. */
  featherReachPx: number;
  /** Wisp pixels join within this radius (px) of the kept+feather region. */
  wispReachPx: number;
  /** Dilation margin (px, euclidean disc) around the final union. */
  dilatePx: number;
  /** Never fill within moonGuardR (UV distance) of moonUV — covers the zeroed mask disc AND the
   *  painted outline ring (use ~1.6 × the runtime MOON_R). */
  moonUV: [number, number];
  moonGuardR: number;
  /** Painted star bodies near the fill zone (hand-measured UVs — the SWIRLS table is offset from
   *  the painted stars; it anchors vortices, not star pixels). A star's dark umber swirl strokes
   *  are chroma-treeish, so guards block the chroma/proximity passes (satellites, feather, wisps,
   *  dilation). They deliberately do NOT block the primary mask component: the mask column is
   *  ground truth of what the 2D cut-out took, so where the tree overlapped a star halo the cut
   *  pixels still fill and the boundary follows the real cut. */
  starGuards: { u: number; v: number; r: number }[];
};

/**
 * A painting texel that belongs to the cut-out tree rather than the sky — mirrored EXACTLY from
 * src/scene/streamlineGeometry.ts (the two families measured from the actual blobs: warm dark
 * olive trunk fringes; near-neutral dark grey-green wisp tips). The runtime copy is deleted in
 * S3 of the pipeline; until then keep the two in sync. Inputs are 0–1 floats.
 */
export function treeishColour(r: number, g: number, b: number): boolean {
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  if (b < Math.max(r, g) + 0.04 && lum < 0.43) return true;
  return Math.min(r, g) > b + 0.03 && lum < 0.48;
}

function rawMaskAt(mask: DecodedPNG, u: number, v: number): number {
  const mx = Math.min(mask.width - 1, Math.max(0, Math.floor(u * mask.width)));
  const my = Math.min(mask.height - 1, Math.max(0, Math.floor(v * mask.height)));
  return mask.rgba[(my * mask.width + mx) * 4];
}

export type FillRegion = {
  /** painting-resolution label per pixel (FILL_* constants) */
  labels: Uint8Array;
  counts: { hole: number; feather: number; wisp: number; dilated: number };
  /** kept hole components, largest first: size + treeish/star-guarded fractions, for the bake log */
  components: { px: number; treeishFraction: number; guardedFraction: number }[];
  /** bounding box of all non-zero labels, or null if empty */
  bbox: { x0: number; y0: number; x1: number; y1: number } | null;
};

/** Stamp a euclidean disc of `radius` px around every set pixel of `src` into `out` (value 1). */
function dilateStencil(src: Uint8Array, w: number, h: number, radius: number): Uint8Array {
  const out = new Uint8Array(w * h);
  const r = Math.ceil(radius);
  const r2 = radius * radius;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!src[y * w + x]) continue;
      for (let dy = -r; dy <= r; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -r; dx <= r; dx++) {
          if (dx * dx + dy * dy > r2) continue;
          const xx = x + dx;
          if (xx >= 0 && xx < w) out[yy * w + xx] = 1;
        }
      }
    }
  }
  return out;
}

export function computeFillRegion(painting: DecodedPNG, mask: DecodedPNG, opts: FillRegionOptions): FillRegion {
  const { width: w, height: h } = painting;
  const bandYMax = Math.min(h, Math.ceil(opts.skyBandV * h)); // rows strictly below the band are untouched

  const lumOf = (i: number) =>
    (0.299 * painting.rgba[i * 4] + 0.587 * painting.rgba[i * 4 + 1] + 0.114 * painting.rgba[i * 4 + 2]) / 255;
  const treeishAt = (i: number) =>
    treeishColour(painting.rgba[i * 4] / 255, painting.rgba[i * 4 + 1] / 255, painting.rgba[i * 4 + 2] / 255);
  const moonGuarded = (x: number, y: number) =>
    Math.hypot((x + 0.5) / w - opts.moonUV[0], (y + 0.5) / h - opts.moonUV[1]) < opts.moonGuardR;
  const starGuarded = (x: number, y: number) => {
    const u = (x + 0.5) / w;
    const v = (y + 0.5) / h;
    return opts.starGuards.some((s) => Math.hypot(u - s.u, v - s.v) < s.r);
  };

  // Hole candidates: mask hole + in band + dark paint + outside the moon guard.
  const candidates = new Uint8Array(w * h);
  for (let y = 0; y < bandYMax; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (lumOf(i) >= opts.paintingLumMax) continue;
      if (moonGuarded(x, y)) continue;
      if (rawMaskAt(mask, (x + 0.5) / w, (y + 0.5) / h) <= opts.holeMaskMax) candidates[i] = 1;
    }
  }

  // Connected components (4-neighbour BFS) over the candidates; a component qualifies on tree
  // evidence (size + treeish fraction).
  const seen = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  const qualifying: { px: number; treeishFraction: number; member: number[] }[] = [];
  for (let start = 0; start < w * h; start++) {
    if (!candidates[start] || seen[start]) continue;
    let head = 0;
    let tail = 0;
    queue[tail++] = start;
    seen[start] = 1;
    const member: number[] = [];
    let treeish = 0;
    while (head < tail) {
      const i = queue[head++];
      member.push(i);
      if (treeishAt(i)) treeish++;
      const x = i % w;
      const neighbours = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i >= w ? i - w : -1, i < w * (h - 1) ? i + w : -1];
      for (const j of neighbours) {
        if (j >= 0 && candidates[j] && !seen[j]) {
          seen[j] = 1;
          queue[tail++] = j;
        }
      }
    }
    const fraction = treeish / member.length;
    if (member.length >= opts.minComponentPx && fraction >= opts.treeishMinFraction) {
      qualifying.push({ px: member.length, treeishFraction: fraction, member });
    }
  }
  qualifying.sort((a, b) => b.px - a.px);

  // Keep the primary (the tree) + satellites within reach of it. No primary → empty region.
  // Satellites mostly inside a star guard are the star's own dark strokes, not tree tufts.
  const labels = new Uint8Array(w * h);
  const components: { px: number; treeishFraction: number; guardedFraction: number }[] = [];
  if (qualifying.length > 0) {
    const primary = new Uint8Array(w * h);
    for (const i of qualifying[0].member) primary[i] = 1;
    const nearPrimary = dilateStencil(primary, w, h, opts.componentReachPx);
    for (const comp of qualifying) {
      const guarded = comp.member.reduce((n, i) => n + (starGuarded(i % w, Math.floor(i / w)) ? 1 : 0), 0);
      if (comp !== qualifying[0]) {
        if (!comp.member.some((i) => nearPrimary[i])) continue;
        if (guarded >= comp.member.length * 0.5) continue;
      }
      for (const i of comp.member) labels[i] = FILL_HOLE;
      components.push({ px: comp.px, treeishFraction: comp.treeishFraction, guardedFraction: guarded / comp.px });
    }
  }

  // Trunk continuation below the band: straight-down column growth only, same pixel gates.
  const extYMax = Math.min(h, Math.ceil((opts.skyBandV + opts.bandBelowMarginV) * h));
  for (let y = bandYMax; y < extYMax; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (labels[i - w] !== FILL_HOLE) continue;
      if (lumOf(i) >= opts.paintingLumMax) continue;
      if (moonGuarded(x, y)) continue;
      if (rawMaskAt(mask, (x + 0.5) / w, (y + 0.5) / h) <= opts.holeMaskMax) labels[i] = FILL_HOLE;
    }
  }

  const kept = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) kept[i] = labels[i] === FILL_HOLE ? 1 : 0;

  // Feathered edge near a kept component.
  const nearKept = dilateStencil(kept, w, h, opts.featherReachPx);
  for (let y = 0; y < bandYMax; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (labels[i] !== FILL_NONE || !nearKept[i]) continue;
      if (lumOf(i) >= opts.paintingLumMax) continue;
      if (moonGuarded(x, y) || starGuarded(x, y)) continue;
      if (rawMaskAt(mask, (x + 0.5) / w, (y + 0.5) / h) <= opts.featherMaskMax) labels[i] = FILL_FEATHER;
    }
  }

  // Chroma wisps near the kept+feather region.
  const keptPlusFeather = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) keptPlusFeather[i] = labels[i] !== FILL_NONE ? 1 : 0;
  const nearRegion = dilateStencil(keptPlusFeather, w, h, opts.wispReachPx);
  for (let y = 0; y < bandYMax; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (labels[i] !== FILL_NONE || !nearRegion[i]) continue;
      if (moonGuarded(x, y) || starGuarded(x, y)) continue;
      if (treeishAt(i)) labels[i] = FILL_WISP;
    }
  }

  // Dilation margin around the whole union — never onto bright real paint.
  const union = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) union[i] = labels[i] !== FILL_NONE ? 1 : 0;
  const grown = dilateStencil(union, w, h, opts.dilatePx);
  for (let i = 0; i < w * h; i++) {
    if (grown[i] && labels[i] === FILL_NONE && lumOf(i) < opts.paintingLumMax && !starGuarded(i % w, Math.floor(i / w)))
      labels[i] = FILL_DILATED;
  }

  // Stats + bbox.
  const counts = { hole: 0, feather: 0, wisp: 0, dilated: 0 };
  let x0 = w;
  let y0 = h;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const l = labels[y * w + x];
      if (l === FILL_NONE) continue;
      if (l === FILL_HOLE) counts.hole++;
      else if (l === FILL_FEATHER) counts.feather++;
      else if (l === FILL_WISP) counts.wisp++;
      else counts.dilated++;
      if (x < x0) x0 = x;
      if (y < y0) y0 = y;
      if (x > x1) x1 = x;
      if (y > y1) y1 = y;
    }
  }
  return { labels, counts, components, bbox: x1 >= 0 ? { x0, y0, x1, y1 } : null };
}
