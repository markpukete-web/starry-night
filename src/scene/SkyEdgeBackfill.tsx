import { useEffect, useMemo } from 'react'
import { BackSide, Color, ShaderMaterial } from 'three'
import { DOME_R, FWD, RIGHT, SPAN_H, SPAN_V, TRUEUP } from './skyMapping'
import { PALETTE } from './palette'

const edgeVert = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const edgeFrag = /* glsl */ `
  precision highp float;
  uniform vec3 uTop;
  uniform vec3 uBottom;
  uniform vec3 uFwd;
  uniform vec3 uRight;
  uniform vec3 uUp;
  uniform float uSpanH;
  uniform float uSpanV;
  varying vec3 vDir;

  void main() {
    vec3 dir = normalize(vDir);
    float fwdDot = dot(dir, normalize(uFwd));
    float h = atan(dot(dir, normalize(uRight)), fwdDot);
    float w = asin(clamp(dot(dir, normalize(uUp)), -1.0, 1.0));
    float u = 0.5 + h / (uSpanH * 1.16);
    float v = 0.5 - w / (uSpanV * 1.06);

    float outside = max(max(-u, u - 1.0), max(-v, v - 1.0));
    float insideEdge = 1.0 - smoothstep(0.015, 0.18, min(min(u, 1.0 - u), min(v, 1.0 - v)));
    float outsideBand = smoothstep(-0.015, 0.18, outside) * (1.0 - smoothstep(0.42, 0.72, outside));
    float edgeWeight = max(insideEdge * 0.62, outsideBand);
    if (edgeWeight < 0.01) discard;

    float t = clamp(dir.y * 0.5 + 0.5, 0.0, 1.0);
    vec3 gradient = mix(uBottom, uTop, pow(t, 0.86));
    float longFlow = 0.5 + 0.5 * sin(h * 3.0 + w * 5.8);
    float crossFlow = 0.5 + 0.5 * sin(h * 7.2 - w * 4.3);
    float current = mix(longFlow, crossFlow, 0.32);
    vec3 blueStroke = vec3(0.035, 0.055, 0.095) * current;
    vec3 moonStroke = vec3(0.055, 0.047, 0.026) * smoothstep(0.68, 1.08, w) * smoothstep(0.18, 0.9, h);
    vec3 col = gradient + blueStroke + moonStroke;

    float skyBand = smoothstep(-0.92, -0.2, w) * (1.0 - smoothstep(1.02, 1.22, w));
    float alpha = edgeWeight * skyBand * (0.2 + current * 0.05);
    gl_FragColor = vec4(col, alpha);
  }
`

export function SkyEdgeBackfill() {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          uTop: { value: new Color(PALETTE.skyZenith).multiplyScalar(0.66) },
          uBottom: { value: new Color(PALETTE.skyHorizon).multiplyScalar(0.78) },
          uFwd: { value: FWD },
          uRight: { value: RIGHT },
          uUp: { value: TRUEUP },
          uSpanH: { value: SPAN_H },
          uSpanV: { value: SPAN_V },
        },
        vertexShader: edgeVert,
        fragmentShader: edgeFrag,
        side: BackSide,
        transparent: true,
        depthWrite: false,
        depthTest: false,
      }),
    [],
  )

  useEffect(() => () => material.dispose(), [material])

  return (
    <mesh renderOrder={-3}>
      <sphereGeometry args={[DOME_R + 4.25, 32, 24]} />
      <primitive object={material} attach="material" />
    </mesh>
  )
}
