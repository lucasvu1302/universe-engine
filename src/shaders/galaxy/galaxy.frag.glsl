precision highp float;

uniform float uTime;

varying vec3 vColor;
varying float vAlpha;
varying vec2 vTwinkle;

void main() {
  vec2 coord = gl_PointCoord - vec2(0.5);
  float dist = length(coord);

  if (dist > 0.5) {
    discard;
  }

  // 1. Brilliant stellar core with gaussian profile
  float core = exp(-dist * dist * 38.0);
  
  // 2. Soft atmospheric corona
  float corona = exp(-dist * 5.2);
  
  // 3. Subtle 4-point diffraction spike for brightest stars
  float spike = max(
    exp(-abs(coord.x) * 36.0) * exp(-abs(coord.y) * 4.5),
    exp(-abs(coord.y) * 36.0) * exp(-abs(coord.x) * 4.5)
  ) * 0.45;

  // 4. Subtle twinkle scintillation
  float twinkle = 0.88 + 0.12 * sin(uTime * vTwinkle.x + vTwinkle.y);

  float intensity = (core * 0.85 + corona * 0.38 + spike) * twinkle;
  float finalAlpha = clamp(vAlpha * intensity, 0.0, 1.0);

  if (finalAlpha < 0.008) {
    discard;
  }

  // Pure white-hot core boost
  vec3 outColor = mix(vColor, vec3(1.4, 1.4, 1.5), core * 0.55);

  gl_FragColor = vec4(outColor, finalAlpha);
}

