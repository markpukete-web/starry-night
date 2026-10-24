import {
  Color,
  type DataTexture,
  type MeshBasicMaterial,
  Vector4,
} from 'three'
import type { AliveInjection } from './aliveMaterial.ts'
import { CYPRESS_STROKE_BODY, strokeGlslWith } from './cypressStrokeShader.ts'
import { GRASS_BLADE, GRASS_BLADE_GLSL } from './grassBlade.ts'
import { PALETTE } from './palette.ts'
import { fogInjection } from './streetFog.ts'
import { lifeTimeUniform } from './streetLife.ts'
import { material } from './streetMaterial.ts'

export function grassInjection(
  trailTexture: DataTexture,
  trailRect: [number, number, number, number],
): Omit<AliveInjection, 'key'> {
  const liftColour = new Color(PALETTE.hillsCrest)
  return {
    uniforms: {
      uTrailMap: { value: trailTexture },
      uTrailRect: { value: new Vector4(trailRect[0], trailRect[1], trailRect[2], trailRect[3]) },
      uAliveTime: lifeTimeUniform,
      uLift: { value: 0.8 },
      uLiftColour: { value: liftColour },
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

${GRASS_BLADE_GLSL}
`,
    vertexBody: /* glsl */ `
vColor = vec4(aBladeColour * mix(${GRASS_BLADE.shade[0].toFixed(3)}, ${GRASS_BLADE.shade[1].toFixed(3)}, position.y), 1.0);
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
float widen = max(1.0, d / ${GRASS_BLADE.widenFrom.toFixed(3)});

vec3 pos = grassBladeVertex(root, position.y, position.x, aHeight, aHalfWidth, aLean, aCurl, aYaw, right, widen);

vec2 trailUV = (aRoot - uTrailRect.xy) / uTrailRect.zw;
vec2 push = (texture2D(uTrailMap, trailUV).rg * 255.0 - 128.0) / 127.0;
vPush = length(push);

float gust = clamp(0.4 + 0.6 * sin(uAliveTime * 0.9 + aRoot.x * 3.0 + aRoot.y * 2.0), 0.0, 1.0);
float windAngle = uAliveTime * 1.6 + aRoot.x * 5.0 + aRoot.y * 7.0;
vec2 windDir = vec2(cos(windAngle), sin(windAngle));
vec2 wind = windDir * (${GRASS_BLADE.wind.toFixed(4)} * gust);

float a = position.y;
vec2 offset = (push * ${GRASS_BLADE.push.toFixed(4)} + wind) * (a * a);
// displacement
pos.xz += offset;
pos.y = max(0.0, pos.y - 0.7 * length(offset) * a);
transformed = pos;
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

export function buildGrassMaterial(
  trailTexture: DataTexture,
  trailRect: [number, number, number, number],
  ids: boolean,
): MeshBasicMaterial {
  const strokeBody = strokeGlslWith({
    ...CYPRESS_STROKE_BODY,
    gaps: null,
    dryFrom: 0.85,
    fray: 0.08,
  })
  const injection = grassInjection(trailTexture, trailRect)
  return material('street-grass', strokeBody, fogInjection(), true, ids, injection)
}
