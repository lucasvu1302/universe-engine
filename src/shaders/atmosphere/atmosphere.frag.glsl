precision highp float;

uniform vec3 uSunPosition;
uniform vec3 uAtmosphereColor;

varying vec3 vNormal;
varying vec3 vWorldPosition;

void main() {
  vec3 viewDir = normalize(cameraPosition - vWorldPosition);
  vec3 norm = normalize(vNormal);

  // Atmospheric limb Fresnel
  float fresnel = 1.0 - max(dot(viewDir, norm), 0.0);
  fresnel = pow(fresnel, 2.8);

  // Light incidence factor from Sun
  vec3 sunDir = normalize(uSunPosition - vWorldPosition);
  float sunFactor = dot(norm, sunDir);

  // Smooth day lighting transition
  float dayFactor = smoothstep(-0.25, 0.35, sunFactor);

  // Sunset / Sunrise reddening along the terminator line
  float terminatorFactor = 1.0 - smoothstep(0.0, 0.3, abs(sunFactor));
  vec3 sunsetColor = vec3(1.0, 0.42, 0.12) * terminatorFactor * 1.5;

  // Rayleigh scattered blue sky
  vec3 skyColor = uAtmosphereColor * (dayFactor * 1.1 + 0.15) + sunsetColor;

  float alpha = fresnel * (dayFactor * 0.85 + 0.15);

  gl_FragColor = vec4(skyColor, alpha);
}
