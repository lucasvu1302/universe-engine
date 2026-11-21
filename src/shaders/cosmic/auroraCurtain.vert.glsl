uniform float uTime;
uniform float uIntensity;

varying vec2 vUv;
varying vec3 vNormalDir;
varying vec3 vViewDir;

void main() {
  vUv = uv;
  vec3 pos = position;

  // Undulating geomagnetic Alfven wave curtains wrapping the auroral oval
  float angle = uv.x * 6.2831853;
  float ripple =
    sin(angle * 6.0 + uTime * 2.1) * 0.085 +
    cos(angle * 11.0 - uTime * 3.0 + uv.y * 2.5) * 0.055 +
    sin(angle * 17.0 + uTime * 4.2) * 0.025;
  float radialPush = ripple * (0.45 + 0.85 * uIntensity) * (0.3 + 0.7 * uv.y);

  vec2 horiz = normalize(vec2(pos.x, pos.z) + vec2(1e-5, 0.0));
  pos.x += horiz.x * radialPush;
  pos.z += horiz.y * radialPush;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  vNormalDir = normalize(normalMatrix * normal);
  vViewDir = normalize(-mvPosition.xyz);

  gl_Position = projectionMatrix * mvPosition;
}
