precision mediump float;

varying vec3 vColor;
varying float vAlpha;

void main() {
  vec2 coord = gl_PointCoord - vec2(0.5);
  float dist = length(coord);

  if (dist > 0.5) {
    discard;
  }

  // Soft luminous particle
  float glow = exp(-dist * 4.0);
  gl_FragColor = vec4(vColor, vAlpha * glow);
}
