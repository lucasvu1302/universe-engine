precision highp float;

uniform vec3 uColor;
uniform float uRadius;
uniform float uThickness;
uniform float uOpacity;
uniform float uTime;

varying vec2 vUv;
varying vec3 vLocalPos;

void main() {
  float r = length(vLocalPos.xy);
  float diff = abs(r - uRadius);
  if (diff > uThickness) {
    discard;
  }

  // Gaussian profile across shockwave wavefront
  float d = diff / max(uThickness, 0.001);
  float waveProfile = exp(-d * d * 3.8) * (1.0 - d);

  // Subtle angular plasma interference ripples
  float angle = atan(vLocalPos.y, vLocalPos.x);
  float ripple = 0.88 + 0.12 * sin(angle * 14.0 - uTime * 4.0);

  float alpha = clamp(waveProfile * uOpacity * ripple, 0.0, 1.0);
  if (alpha < 0.003) {
    discard;
  }

  // Intense leading shock ionization edge
  vec3 brightColor = mix(uColor, vec3(1.3, 1.3, 1.4), (1.0 - d) * 0.5);

  gl_FragColor = vec4(brightColor, alpha);
}
