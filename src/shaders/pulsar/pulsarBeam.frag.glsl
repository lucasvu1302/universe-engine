precision highp float;

uniform float uTime;
uniform vec3 uColorCore;
uniform vec3 uColorGlow;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
  // Seamless 3D view-angle Fresnel across open cone/cylinder (eliminates vUv.x seam!)
  vec3 norm = normalize(vNormal);
  vec3 viewDir = normalize(vViewPosition);
  float radialAlign = clamp(abs(dot(norm, viewDir)), 0.0, 1.0);

  // Blazing collimated relativistic core + soft synchrotron outer sheath
  float coreIntensity = pow(radialAlign, 6.0);
  float glowIntensity = pow(radialAlign, 1.85);

  // Smooth base emergence & far-space dissipation
  float baseFade = smoothstep(0.0, 0.06, vUv.y);
  float tipFade = pow(clamp(1.0 - vUv.y, 0.0, 1.0), 1.65);
  float lengthFade = baseFade * tipFade;

  // Relativistic helical plasma knots propagating along jet axis
  float wave1 = sin(vUv.y * 28.0 - uTime * 15.0) * 0.14 + 0.86;
  float wave2 = sin(vUv.y * 64.0 - uTime * 27.0) * 0.08 + 0.92;
  float pulse = wave1 * wave2;

  vec3 color = mix(uColorGlow, uColorCore, clamp(coreIntensity * 1.25, 0.0, 1.0)) * pulse;
  float alpha = clamp((coreIntensity * 1.35 + glowIntensity * 0.58) * lengthFade, 0.0, 0.94);

  if (alpha < 0.005) {
    discard;
  }

  gl_FragColor = vec4(color, alpha);
}
