precision highp float;

uniform float uOpacity;
uniform float uIntensity;
uniform vec3 uPrimaryColor;
uniform vec3 uSecondaryColor;

varying float vLife;
varying float vSparkle;

void main() {
  if (uOpacity <= 0.002) {
    discard;
  }

  vec2 c = gl_PointCoord - vec2(0.5);
  float d = length(c);
  if (d > 0.5) {
    discard;
  }

  float core = exp(-d * d * 22.0);
  float halo = exp(-d * 4.2) * 0.56;
  float lifeEnvelope = smoothstep(0.0, 0.12, vLife) * (1.0 - smoothstep(0.64, 1.0, vLife));

  vec3 col = mix(uPrimaryColor, uSecondaryColor, smoothstep(0.18, 0.85, vLife));
  col = mix(col, vec3(1.0, 0.98, 0.94), core * 0.48);

  float alpha = (core * 0.76 + halo) * lifeEnvelope * vSparkle * min(uIntensity, 1.85) * uOpacity;
  if (alpha < 0.006) {
    discard;
  }

  gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.94));
}
