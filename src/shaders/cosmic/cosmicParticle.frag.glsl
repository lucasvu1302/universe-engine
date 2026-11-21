precision highp float;

uniform float uOpacity;
uniform float uTime;
varying vec3 vColor;

void main() {
  vec2 coord = gl_PointCoord - vec2(0.5);
  float dist = length(coord);
  if (dist > 0.5) {
    discard;
  }

  // 1. Concentrated Gaussian stellar core
  float core = exp(-dist * dist * 34.0);

  // 2. Soft atmospheric / coronal glow
  float glow = exp(-dist * 4.6) * 0.45;

  // 3. Subtle 4-ray diffraction flare
  float spike = max(
    exp(-abs(coord.x) * 32.0) * exp(-abs(coord.y) * 4.0),
    exp(-abs(coord.y) * 32.0) * exp(-abs(coord.x) * 4.0)
  ) * 0.25;

  float alpha = clamp((core * 0.95 + glow + spike) * uOpacity, 0.0, 1.0);
  if (alpha < 0.005) {
    discard;
  }

  // Hot white core boost
  vec3 boostedColor = mix(vColor, vec3(1.35, 1.35, 1.45), core * 0.7);

  gl_FragColor = vec4(boostedColor, alpha);
}
