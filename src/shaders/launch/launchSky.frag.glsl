precision highp float;

uniform vec3 uSkyColor;
uniform vec3 uSunDir;
uniform float uStarVisibility;
uniform float uAltitudeKm;
uniform float uReentryGlow;

varying vec3 vWorldPosition;
varying vec3 vRayDir;

void main() {
  vec3 dir = normalize(vRayDir);

  float upFactor = clamp(dir.y, 0.0, 1.0);
  float horizonBand = pow(1.0 - clamp(abs(dir.y), 0.0, 1.0), 2.4);
  float atmPresence = clamp(1.0 - uAltitudeKm / 95.0, 0.0, 1.0);

  // Physically grounded Rayleigh gradient kept cleanly below Bloom threshold (0.78)
  vec3 zenithColor = uSkyColor * 0.44;
  vec3 coastalHorizon = mix(uSkyColor * 0.72, vec3(0.42, 0.56, 0.72), 0.45 * atmPresence);
  vec3 skyGrad = mix(coastalHorizon, zenithColor, pow(upFactor, 0.58));

  // Blend lower hemisphere seamlessly with Atlantic coastal haze at low altitude, deepening cleanly at high altitude
  vec3 lowerHaze = mix(zenithColor * 0.16, vec3(0.11, 0.21, 0.31), atmPresence * atmPresence);
  float belowHorizon = smoothstep(-0.24, 0.04, dir.y);
  vec3 atmColor = mix(lowerHaze, skyGrad, belowHorizon) + vec3(0.035, 0.055, 0.085) * horizonBand * atmPresence;

  // Crisp solar disc + subtle atmospheric Mie aureole
  float sunDot = max(dot(dir, normalize(uSunDir)), 0.0);
  float sunDisc = smoothstep(0.9985, 0.9997, sunDot) * 2.2;
  float sunHalo = pow(sunDot, 28.0) * 0.18 * atmPresence;
  vec3 sunLight = vec3(1.0, 0.95, 0.84) * (sunDisc + sunHalo);

  vec3 shockColor = vec3(1.0, 0.35, 0.08) * uReentryGlow * 0.55 * (0.85 + 0.15 * sin(vWorldPosition.y * 0.1));

  vec3 finalColor = atmColor + sunLight + shockColor;
  // Dissolve sky shell completely into vacuum so 3D StarField shines cleanly with zero grid artifacts
  float skyAlpha = clamp(1.0 - smoothstep(0.12, 0.88, uStarVisibility), 0.0, 1.0);
  if (skyAlpha <= 0.004) {
    discard;
  }

  gl_FragColor = vec4(finalColor, skyAlpha);
}
