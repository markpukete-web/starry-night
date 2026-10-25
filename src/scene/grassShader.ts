import {
  Color,
  type DataTexture,
  type MeshBasicMaterial,
  Vector4,
} from 'three'
import type { AliveInjection } from './aliveMaterial.ts'
import { CYPRESS_STROKE_BODY, type StrokeBody, strokeGlslWith } from './cypressStrokeShader.ts'
import { GRASS_BLADE, GRASS_BLADE_GLSL, GRASS_LIGHT, GRASS_MOON_GLSL } from './grassBlade.ts'
import { PALETTE } from './palette.ts'
import { fogInjection } from './streetFog.ts'
import { lifeTimeUniform } from './streetLife.ts'
import { STREET_MOON } from './streetLight.ts'
import { material } from './streetMaterial.ts'

/**
 * The grass's own stroke body (S3b decision (d)): the cypress's, without its gaps, its dry brush from 0.85 and a finer
 * fray, as slice 3 drew it. The look passes set its lanes, edge and rake, and the cypress's text does not change.
 */
export const GRASS_STROKE_BODY: StrokeBody = { ...CYPRESS_STROKE_BODY, gaps: null, dryFrom: 0.85, fray: 0.08 }

const MOON_VARYINGS = 'varying vec3 vTopColour;\nvarying float vMoon;\nvarying float vMoonSide;'

/**
 * The moon's colour, before the stroke body so the bristles shade it. `vStroke.y` is 0 at across −1, and the outer edge
 * has across of the curl's opposite sign (`bladeMoonFacing`'s derivation).
 */
const MOON_FRAGMENT = `
float moonOuter = vMoonSide > 0.0 ? 1.0 - vStroke.y : vStroke.y;
diffuseColor.rgb = mix(diffuseColor.rgb, vTopColour, vMoon * smoothstep(${(1 - GRASS_LIGHT.edge).toFixed(6)}, 1.0, moonOuter));
`

/** `grassBladeVertex`'s arguments in the shader. `grassMoonFacing` takes the same text, so both read one blade (Codex R7). */
export const GRASS_BLADE_ARGS = 'root, position.y, position.x, aHeight, aHalfWidth, aLean, aCurl, aYaw, right, widen'

/**
 * The grass's shader pieces. `lit` adds the street's moon on each blade's outer arch (S3b task 1). Unlit, the text is
 * slice 3's byte for byte, which the unlit captures and the colour gate rely on.
 */
export function grassInjection(
  trailTexture: DataTexture,
  trailRect: [number, number, number, number],
  lit: boolean,
): Omit<AliveInjection, 'key'> {
  const liftColour = new Color(PALETTE.hillsCrest)
  const L = GRASS_LIGHT
  const moonHead = lit ? `
attribute vec3 aTopColour;
uniform vec3 uMoon;
${MOON_VARYINGS}
${GRASS_MOON_GLSL}` : ''
  // the colour is mixed in the fragment (\`MOON_FRAGMENT\`), which shapes it across the blade's two columns
  const moonColour = lit ? `
float moonFacing = grassMoonFacing(${GRASS_BLADE_ARGS}, uMoon);
vColor.rgb *= ${L.ambient.toFixed(6)};
vTopColour = aTopColour;
vMoon = ${L.top.toFixed(6)} * smoothstep(${L.facing[0].toFixed(6)}, ${L.facing[1].toFixed(6)}, moonFacing) * smoothstep(${L.from.toFixed(6)}, 1.0, position.y);
vMoonSide = sign(aCurl);` : ''
  return {
    uniforms: {
      uTrailMap: { value: trailTexture },
      uTrailRect: { value: new Vector4(trailRect[0], trailRect[1], trailRect[2], trailRect[3]) },
      uAliveTime: lifeTimeUniform,
      uLift: { value: 0.8 },
      uLiftColour: { value: liftColour },
      ...(lit ? { uMoon: { value: STREET_MOON } } : {}),
    },
    vertexHead: /* glsl */ `
attribute vec2 aRoot;
attribute float aYaw;
attribute float aHeight;
attribute float aHalfWidth;
attribute float aLean;
attribute float aCurl;
attribute vec3 aBladeColour;
uniform sampler2D uTrailMap;
uniform vec4 uTrailRect;
uniform float uAliveTime;
varying float vPush;

${GRASS_BLADE_GLSL}${moonHead}
`,
    vertexBody: /* glsl */ `
vColor = vec4(aBladeColour * mix(${GRASS_BLADE.shade[0].toFixed(6)}, ${GRASS_BLADE.shade[1].toFixed(6)}, position.y), 1.0);
`,
    vertexTransform: /* glsl */ `
vec3 root = vec3(aRoot.x, 0.0, aRoot.y);
vec4 worldRoot4 = modelMatrix * vec4(root, 1.0);
vec3 worldRoot = worldRoot4.xyz;
vec2 toCam = cameraPosition.xz - worldRoot.xz;
float lenToCam = length(toCam);
vec2 dirToCam = lenToCam > 1e-5 ? toCam / lenToCam : vec2(0.0, 1.0);
vec2 right = vec2(dirToCam.y, -dirToCam.x);
float d = distance(worldRoot, cameraPosition);
float widen = max(1.0, d / ${GRASS_BLADE.widenFrom.toFixed(6)});

vec3 pos = grassBladeVertex(${GRASS_BLADE_ARGS});${moonColour}

vec2 trailUV = (aRoot - uTrailRect.xy) / uTrailRect.zw;
vec2 push = (texture2D(uTrailMap, trailUV).rg * 255.0 - 128.0) / 127.0;
vPush = length(push);

// the wind blows toward +x (the sky's travel, left to right from stop 0) and its gusts run the same way; the heading
// only wobbles by 0.3 rad (S3 look pass 3: a heading that turned 1.6 rad/s circled every tip in place)
float gust = clamp(0.4 + 0.6 * sin(uAliveTime * 0.9 - aRoot.x * 3.0 + aRoot.y * 2.0), 0.0, 1.0);
float windAngle = 0.3 * sin(uAliveTime * 0.7 + aRoot.x * 5.0 + aRoot.y * 7.0);
vec2 windDir = vec2(cos(windAngle), sin(windAngle));
vec2 wind = windDir * (${GRASS_BLADE.wind.toFixed(6)} * gust);

float a = position.y;
vec2 offset = (push * ${GRASS_BLADE.push.toFixed(6)} + wind) * (a * a);
// displacement
pos.xz += offset;
pos.y = max(0.0, pos.y - 0.7 * length(offset) * a);
transformed = pos;
vFogDistance = -(modelViewMatrix * vec4(transformed, 1.0)).z;
`,
    fragmentHead: /* glsl */ `
uniform float uLift;
uniform vec3 uLiftColour;
varying float vPush;
`,
    fragmentBody: /* glsl */ `
diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 1.4 + uLiftColour * 0.6, uLift * smoothstep(0.05, 0.8, vPush));
`,
  }
}

/** `lit` is ignored under `ids`: the ID view's program stays slice 3's. */
export function buildGrassMaterial(
  trailTexture: DataTexture,
  trailRect: [number, number, number, number],
  ids: boolean,
  lit: boolean,
): MeshBasicMaterial {
  const stroke = strokeGlslWith(GRASS_STROKE_BODY)
  const moon = lit && !ids
  const strokeBody = moon
    ? { ...stroke, fragmentHead: `${stroke.fragmentHead}\n${MOON_VARYINGS}`, fragmentBody: MOON_FRAGMENT + stroke.fragmentBody }
    : stroke
  const injection = grassInjection(trailTexture, trailRect, moon)
  return material(
    moon ? 'street-grass-moon' : 'street-grass',
    strokeBody,
    { ...fogInjection(), vertexBody: '' },
    true,
    ids,
    injection,
  )
}
