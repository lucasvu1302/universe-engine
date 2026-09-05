uniform float uTime;
uniform vec3 uColorCore;
uniform vec3 uColorGlow;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
  // Center across beam width: [-1, 1]
  float xDist = abs(vUv.x - 0.5) * 2.0;

  // Gaussian transverse profile: blazing white-hot center, smooth ethereal falloff
  float coreIntensity = exp(-xDist * xDist * 8.0);
  float glowIntensity = exp(-xDist * 3.2);

  // Longitudinal fade: beam smoothly dissipates into deep space
  float lengthFade = pow(clamp(1.0 - vUv.y, 0.0, 1.0), 1.6);

  // Relativistic plasma pulse wave traveling outward along jet
  float pulse = sin(vUv.y * 32.0 - uTime * 14.0) * 0.15 + 0.85;

  vec3 color = mix(uColorGlow, uColorCore, coreIntensity) * pulse;
  float alpha = clamp((coreIntensity * 1.5 + glowIntensity * 0.6) * lengthFade, 0.0, 0.95);

  gl_FragColor = vec4(color, alpha);
}
