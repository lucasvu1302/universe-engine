precision highp float;

uniform vec3 uSkyColor;
uniform vec3 uSunDir;
uniform float uStarVisibility;
uniform float uAltitudeKm;
uniform float uReentryGlow;

varying vec3 vWorldPosition;
varying vec3 vRayDir;

float hash3(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

void main() {
  vec3 dir = normalize(vRayDir);
  
  float upFactor = clamp(dir.y, 0.0, 1.0);
  float horizonFactor = 1.0 - abs(dir.y);
  
  vec3 zenithColor = uSkyColor * 0.7;
  vec3 horizonColor = uSkyColor * 1.35 + vec3(0.1, 0.08, 0.05) * horizonFactor;
  vec3 atmColor = mix(horizonColor, zenithColor, pow(upFactor, 0.6));
  
  float sunDot = max(dot(dir, normalize(uSunDir)), 0.0);
  float sunGlow = pow(sunDot, 64.0) * 2.0 + pow(sunDot, 8.0) * 0.4;
  vec3 sunLight = vec3(1.0, 0.95, 0.8) * sunGlow;
  
  vec3 shockColor = vec3(1.0, 0.35, 0.08) * uReentryGlow * (0.8 + 0.2 * sin(vWorldPosition.y * 0.1));

  float starDensity = 0.0;
  if (uStarVisibility > 0.01) {
    vec3 starCoord = floor(dir * 240.0);
    float h = hash3(starCoord);
    if (h > 0.994) {
      float brightness = (h - 0.994) / 0.006;
      starDensity = pow(brightness, 3.0) * uStarVisibility;
    }
  }

  vec3 finalColor = atmColor + sunLight + shockColor + vec3(starDensity);

  gl_FragColor = vec4(finalColor, 1.0);
}
