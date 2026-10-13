import type { Material } from 'three'

/**
 * Make-it-alive A, second pass: the foreground keeps three's own `MeshBasicMaterial` and, with the flag on only,
 * takes a small shader injection through `onBeforeCompile`: uniforms, one attribute, one varying, and a multiply
 * on `diffuseColor.rgb` right after `<color_fragment>` (the vertex-colour multiply, before the opaque, tone-mapping
 * and colour-space chunks). Flag off, the material is untouched and three's stock program draws it, byte for byte
 * today's path (the PR #8 rule: an opt-in feature's off path is the old path in bytes).
 *
 * Plain `.ts` imports only: `scripts/sky-alive.test.ts` runs `replaceOnce` under node.
 */
export type AliveInjection = {
  /**
   * The program cache key. three's default key is `onBeforeCompile.toString()`, so two materials sharing this
   * helper's source would share one program and one of them the wrong shader (review F9): each GLSL variant names
   * its own key.
   */
  key: string
  /** The uniforms the program reads; the same `{ value }` objects a frame loop and a layout effect write. */
  uniforms: Record<string, { value: unknown }>
  /** Vertex stage, before main: the attribute and the varying. */
  vertexHead: string
  /** Vertex main, after `<color_vertex>`: write the varying. */
  vertexBody: string
  /** Fragment stage, before main: the varying, the uniforms, the functions. */
  fragmentHead: string
  /** Fragment main, after `<color_fragment>`: multiply `diffuseColor.rgb`. */
  fragmentBody: string
}

/** Replace exactly one occurrence of a chunk marker, or throw: a three upgrade that renames a chunk must not silently drop the effect. */
export function replaceOnce(source: string, marker: string, replacement: string): string {
  const first = source.indexOf(marker)
  if (first < 0 || source.indexOf(marker, first + marker.length) >= 0) {
    throw new Error(`alive injection: expected exactly one "${marker}" in the shader`)
  }
  return source.slice(0, first) + replacement + source.slice(first + marker.length)
}

/** Apply the injection's text to three's shader source pair. Pure, so the guard test can run it on any strings. */
export function injectAliveSource(vertexShader: string, fragmentShader: string, injection: AliveInjection): { vertexShader: string; fragmentShader: string } {
  let vertex = replaceOnce(vertexShader, '#include <common>', `#include <common>\n${injection.vertexHead}`)
  vertex = replaceOnce(vertex, '#include <color_vertex>', `#include <color_vertex>\n${injection.vertexBody}`)
  let fragment = replaceOnce(fragmentShader, '#include <common>', `#include <common>\n${injection.fragmentHead}`)
  fragment = replaceOnce(fragment, '#include <color_fragment>', `#include <color_fragment>\n${injection.fragmentBody}`)
  return { vertexShader: vertex, fragmentShader: fragment }
}

/**
 * Wire the injection onto a material. In development a missing marker throws (the dev server shows it); in
 * production it warns and leaves the stock program, so a visitor sees today's foreground rather than nothing.
 */
export function injectAlive(material: Material, injection: AliveInjection): void {
  material.customProgramCacheKey = () => injection.key
  material.onBeforeCompile = (shader) => {
    try {
      const injected = injectAliveSource(shader.vertexShader, shader.fragmentShader, injection)
      shader.vertexShader = injected.vertexShader
      shader.fragmentShader = injected.fragmentShader
      Object.assign(shader.uniforms, injection.uniforms)
    } catch (error) {
      if (import.meta.env?.DEV) throw error
      console.warn('[alive] shader injection skipped', error)
    }
  }
}
