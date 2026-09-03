precision mediump float;

varying vec3 vColor;
varying float vAlpha;

void main() {
  // Circular point sprite with smooth Gaussian-like falloff
  vec2 coord = gl_PointCoord - vec2(0.5);
  float dist = length(coord);

  if (dist > 0.5) {
    discard;
  }

  // Soft glow core
  float core = 1.0 - smoothstep(0.0, 0.48, dist);
  float glow = exp(-dist * 4.5);

  vec3 finalColor = vColor * (core * 0.8 + glow * 0.4);
  gl_FragColor = vec4(finalColor, vAlpha * glow);
}
