precision highp float;

uniform float uTime;
uniform float uIntensity;
uniform float uOpacity;
uniform vec3 uPrimaryColor;
uniform vec3 uSecondaryColor;

varying vec2 vUv;
varying vec3 vNormalDir;
varying vec3 vViewDir;

float hash2(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise2D(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash2(i + vec2(0.0, 0.0)), hash2(i + vec2(1.0, 0.0)), u.x),
    mix(hash2(i + vec2(0.0, 1.0)), hash2(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

void main() {
  if (uOpacity <= 0.002) {
    discard;
  }

  // Seamless periodic circular sampling eliminates UV seam creases & spiky discontinuities
  float theta = vUv.x * 6.2831853;
  vec2 ringCoord = vec2(cos(theta), sin(theta));

  // Crisp multi-frequency geomagnetic ray striations + organic azimuthal curtain folds
  float rays =
    0.42 * noise2D(ringCoord * 9.0 + vec2(uTime * 0.38, -uTime * 0.26)) +
    0.34 * noise2D(ringCoord * 22.0 - vec2(uTime * 0.52, uTime * 0.36)) +
    0.24 * noise2D(ringCoord * 42.0 + vec2(uTime * 0.68, uTime * 0.28));
  rays = smoothstep(0.26, 0.82, rays);

  // Organic azimuthal curtain modulation prevents any hard continuous ring outline
  float curtainArc = smoothstep(0.18, 0.78, noise2D(ringCoord * 2.6 + vec2(uTime * 0.14, 1.7)));
  float rayMask = (0.12 + 0.88 * rays) * (0.28 + 0.72 * curtainArc);

  float clampedI = clamp(uIntensity, 0.0, 1.25);
  // Crisp bright oxygen-emerald lower curtain rim tapering gracefully into high-altitude nitrogen violet
  float lowerRim = smoothstep(0.0, 0.14, vUv.y) * (1.0 - smoothstep(0.18, 0.48, vUv.y));
  float verticalFade = smoothstep(0.0, 0.18, vUv.y) * (1.0 - smoothstep(0.42, 0.98, vUv.y));
  vec3 color = mix(uPrimaryColor, uSecondaryColor, smoothstep(0.22, 0.76, vUv.y));
  color += mix(uPrimaryColor, vec3(0.76, 1.0, 0.88), 0.42) * lowerRim * rays * 0.42;

  // Soft grazing fade removes harsh edge-on ribbon spikes and creases on planetary limbs
  float viewDot = abs(dot(normalize(vNormalDir), normalize(vViewDir)));
  float grazingSoft = smoothstep(0.06, 0.38, viewDot);
  float limbGlow = mix(0.88, 0.50, viewDot) * grazingSoft;

  float alpha = (verticalFade * 0.78 + lowerRim * 0.38) * rayMask * (0.40 + 0.46 * clampedI) * limbGlow * uOpacity;
  if (alpha < 0.006) {
    discard;
  }

  gl_FragColor = vec4(color * (0.98 + 0.24 * clampedI), clamp(alpha, 0.0, 0.66));
}
