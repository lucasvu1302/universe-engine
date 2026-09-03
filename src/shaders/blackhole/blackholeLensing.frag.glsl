precision highp float;

uniform float uTime;

varying vec2 vUv;
varying vec3 vWorldPosition;
varying vec3 vNormal;

void main() {
  vec2 p = vUv - vec2(0.5);
  float r = length(p) * 2.0;

  if (r > 1.0 || r < 0.25) {
    discard;
  }

  // Safe angle with epsilon offset
  float angle = atan(p.y, p.x + 0.000001);

  // Symmetrical Einstein Lensing Halo ring
  float haloRadius = 0.52;
  float ringDist = abs(r - haloRadius);
  float ring = exp(-pow(ringDist * 18.0, 2.0));

  // Fade near equator where the horizontal disk lies, enhance above & below poles
  float verticalIntensity = clamp(abs(sin(angle)), 0.0, 1.0);
  verticalIntensity = pow(verticalIntensity, 0.75);

  // High-temperature color gradient
  vec3 hotColor = vec3(1.4, 1.2, 0.85);
  vec3 amberColor = vec3(1.0, 0.5, 0.06);
  vec3 finalColor = mix(amberColor, hotColor, ring * 0.8) * ring * verticalIntensity * 3.0;

  float alpha = clamp(ring * verticalIntensity * 0.9, 0.0, 1.0);
  if (alpha < 0.005) {
    discard;
  }

  gl_FragColor = vec4(finalColor, alpha);
}
