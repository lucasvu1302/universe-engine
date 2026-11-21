precision highp float;

uniform vec3 uSunPosition;
uniform vec3 uAtmosphereColor;
uniform float uOpacity;

varying vec3 vNormal;
varying vec3 vWorldPosition;

void main() {
  vec3 viewDir = normalize(cameraPosition - vWorldPosition);
  vec3 norm = normalize(vNormal);

  float ndotv = dot(viewDir, norm);
  // BackSide outer atmospheric shell: -ndotv is 0 at vacuum outer edge and increases smoothly toward planet limb
  float limbDepth = clamp(-ndotv / 0.24, 0.0, 1.0);
  float fresnel = pow(limbDepth, 1.65) * smoothstep(0.05, 0.24, limbDepth);

  // Light incidence factor from Sun in world space
  vec3 sunDir = normalize(uSunPosition - vWorldPosition);
  float sunFactor = dot(norm, sunDir);

  // Smooth day lighting transition
  float dayFactor = smoothstep(-0.22, 0.38, sunFactor);

  // Sunset / Sunrise Rayleigh reddening along the terminator line
  float terminatorFactor = (1.0 - smoothstep(0.0, 0.28, abs(sunFactor))) * smoothstep(-0.35, 0.05, sunFactor);
  vec3 sunsetColor = vec3(1.0, 0.44, 0.14) * terminatorFactor * 0.85;

  // Rayleigh scattered blue limb (balanced below harsh bloom washout)
  vec3 skyColor = uAtmosphereColor * (dayFactor * 0.88 + 0.08) + sunsetColor;

  float opacityScale = clamp(uOpacity, 0.0, 1.0);
  float alpha = fresnel * (dayFactor * 0.78 + 0.10) * opacityScale;

  gl_FragColor = vec4(skyColor, clamp(alpha, 0.0, 0.92));
}
