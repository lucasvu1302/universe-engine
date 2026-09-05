uniform vec3 uDepthColor;
uniform vec3 uSurfaceColor;
varying vec2 vUv;
varying vec3 vNormal;
varying float vElevation;

void main() {
  // Wave peak foam blend
  float mixFactor = clamp((vElevation + 15.0) / 45.0, 0.0, 1.0);
  vec3 waterColor = mix(uDepthColor, uSurfaceColor, mixFactor);

  // Crest spray foam
  if (vElevation > 28.0) {
    waterColor = mix(waterColor, vec3(0.9, 0.95, 1.0), (vElevation - 28.0) / 17.0);
  }

  gl_FragColor = vec4(waterColor, 0.88);
}
