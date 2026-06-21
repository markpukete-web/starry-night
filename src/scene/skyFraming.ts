// Shared painting framing for the living painting + the brush-dab overlay, so they register exactly
// (Codex plan-review). ONE convention: image-space UV (y-down, origin top-left — matches getImageData
// and the derived assets), all textures flipY=false, contain-fit into the viewport with a letterbox.

export const TEX_ASPECT = 1280 / 1013 // derived-asset / painting aspect

// Contain-fit a screen-UV into the painting's image-UV (values outside [0,1] are the letterbox).
export const CONTAIN_GLSL = /* glsl */ `
  vec2 containUv(vec2 uv, float va, float ta) {
    vec2 st = va > ta ? vec2(va / ta, 1.0) : vec2(1.0, ta / va);
    return (uv - 0.5) * st + 0.5;
  }
`

// Inverse: map a painting image-UV (y-down) to clip space — the dab layer places strokes with this, so
// a dab at image position P lands exactly where the base shows P. Exact inverse of containUv ∘ y-flip.
export const IMG_TO_CLIP_GLSL = /* glsl */ `
  vec2 imgToClip(vec2 p, float va, float ta) {
    vec2 st = va > ta ? vec2(va / ta, 1.0) : vec2(1.0, ta / va);
    vec2 uncontain = (p - 0.5) / st + 0.5;                     // image-UV → screen-UV (y-down)
    return vec2(uncontain.x, 1.0 - uncontain.y) * 2.0 - 1.0;   // → screen-up → clip
  }
`
