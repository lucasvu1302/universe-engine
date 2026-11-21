precision highp float;

uniform float uTime;
uniform float uIntensity;
uniform float uOpacity;
uniform float uPattern;
uniform float uHasEye;
uniform vec3 uPrimaryColor;
uniform vec3 uSecondaryColor;

varying vec2 vUv;
varying vec3 vLocalPos;
varying vec3 vWorldPos;
varying vec3 vWorldNormal;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 rot = mat2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = rot * p * 2.04 + vec2(9.2, 13.7);
    a *= 0.5;
  }
  return v;
}

void main() {
  if (uOpacity <= 0.002) {
    discard;
  }

  vec2 p = (vUv - 0.5) * 2.0;
  float r = length(p);
  if (r > 1.0) {
    discard;
  }

  float angle = r > 1e-5 ? atan(p.y, p.x) : 0.0;
  float edgeFade = 1.0 - smoothstep(0.32, 0.98, r);
  vec3 col = uPrimaryColor;
  float alpha = 0.0;

  // Solar terminator illumination from Sun at world origin (0,0,0) for atmospheric patterns (0, 1, 2)
  float wpLen = length(vWorldPos);
  vec3 sunDir = wpLen > 1e-4 ? (-vWorldPos / wpLen) : vec3(0.0, 1.0, 0.0);
  float wnLen = length(vWorldNormal);
  vec3 worldN = wnLen > 1e-4 ? (vWorldNormal / wnLen) : vec3(0.0, 1.0, 0.0);
  float ndotl = dot(worldN, sunDir);
  float solarLit = mix(0.16, 1.0, smoothstep(-0.24, 0.30, ndotl));
  float solarAlpha = mix(0.38, 1.0, smoothstep(-0.28, 0.24, ndotl));

  if (uPattern < 0.5) {
    // Pattern 0: Photorealistic elliptical anticyclone (solid dome) or low-pressure tropical cyclone (with calm eye)
    vec2 ep = vec2(p.x * 0.82, p.y * 1.18);
    float er = length(ep);
    if (er > 1.0) {
      discard;
    }
    float eAngle = er > 1e-5 ? atan(ep.y, ep.x) : 0.0;
    float diffSpin = eAngle + 3.4 * (1.0 - smoothstep(0.0, 0.96, er)) * 1.65 - uTime * 0.82;
    vec2 sw = vec2(cos(diffSpin), sin(diffSpin)) * er;

    // Domain-warped FBM cloud wisps break mathematical rings into organic turbulent bands
    vec2 warp = vec2(
      fbm(sw * 3.1 + vec2(uTime * 0.12, -uTime * 0.09)),
      fbm(sw * 3.1 + vec2(5.4, 1.7) - uTime * 0.10)
    );
    float clouds = fbm(sw * 4.5 + (warp - 0.5) * 1.45);
    float fineWisps = fbm(sw * 9.0 + (warp - 0.5) * 2.1 + vec2(-uTime * 0.16, uTime * 0.14));
    float feederWave = max(
      1e-4,
      0.5 + 0.5 * sin(eAngle * 2.0 + 4.1 * log(max(er, 0.08)) - uTime * 1.05 + (warp.x - 0.5) * 2.8)
    );
    float feederArms = pow(feederWave, 2.0);

    float eyeOpen = mix(1.0, smoothstep(0.04, 0.21, er), uHasEye);
    float ewDelta = (er - 0.24) * 6.8;
    float eyewall = exp(-(ewDelta * ewDelta)) * (0.62 + 0.72 * clouds) * uHasEye;
    float domeCore = (1.0 - smoothstep(0.0, 0.45, er)) * (0.52 + 0.58 * clouds) * (1.0 - uHasEye);
    float softOvalFade = 1.0 - smoothstep(0.24, 0.98, er);

    float cloudBody = (clouds * 0.65 + fineWisps * 0.26 + feederArms * 0.34 * clouds) * (0.35 + 0.65 * eyeOpen);
    float ridgeMask = smoothstep(0.52, 0.88, cloudBody + eyewall * 0.40 + domeCore * 0.30);

    col = mix(uSecondaryColor, uPrimaryColor, clamp(cloudBody * 1.12 + eyewall * 0.40 + domeCore * 0.38, 0.0, 1.0));
    col = mix(col, mix(uPrimaryColor, vec3(1.0, 0.96, 0.91), 0.36), ridgeMask * 0.46);
    col *= mix(0.68, 1.0, eyeOpen);
    col *= mix(0.32, 1.08, smoothstep(-0.26, 0.24, ndotl));

    float stormAlphaLit = mix(0.52, 1.0, smoothstep(-0.28, 0.24, ndotl));
    // Crisp visibly churning anticyclone (uHasEye=0) and vivid tropical eyewall (uHasEye=1)
    float maxStormAlpha = mix(0.62, 0.84, uHasEye);
    alpha = clamp((cloudBody * 0.68 + eyewall * 0.36 + domeCore * 0.28) * softOvalFade * stormAlphaLit * min(uIntensity, 1.55), 0.0, maxStormAlpha);
  } else if (uPattern < 1.5) {
    // Pattern 1: Authentic Cassini soft-edged Saturn North Polar 6-fold Rossby hexagon (solar-lit)
    float hexAngle = angle - uTime * 0.28;
    float sector = mod(hexAngle + 0.52359877, 1.04719755) - 0.52359877;
    float polyHexR = r * cos(sector) / 0.8660254;
    float hexRadius = mix(r, polyHexR, 0.64);
    float outerBlend = 1.0 - smoothstep(0.42, 0.98, r);
    float hexFade = (1.0 - smoothstep(0.58, 0.98, hexRadius)) * outerBlend;

    vec2 shearUv = vec2(hexAngle * 2.6, hexRadius * 10.5 - uTime * 0.28);
    float turb = fbm(shearUv + vec2(fbm(shearUv * 0.7) * 0.85, 0.0));
    float jwD = (hexRadius - 0.66) * 6.5;
    float mbD = (hexRadius - 0.46) * 6.0;
    float ivD = (hexRadius - 0.20) * 8.5;
    float jetWall = exp(-(jwD * jwD)) * (0.76 + 0.52 * turb);
    float midBand = exp(-(mbD * mbD)) * (0.58 + 0.52 * turb);
    float innerVortex = exp(-(ivD * ivD)) * 0.54;
    float polarEyeDark = 1.0 - smoothstep(0.0, 0.17, r);

    vec3 tealCore = mix(uSecondaryColor, vec3(0.24, 0.44, 0.48), 0.45);
    vec3 ochreJet = mix(uPrimaryColor, vec3(0.88, 0.78, 0.58), 0.45);
    col = mix(tealCore, ochreJet, clamp(jetWall * 1.02 + midBand * 0.58 + turb * 0.24, 0.0, 1.0));
    col *= (1.0 - polarEyeDark * 0.42);
    col *= solarLit;

    float density = jetWall * 0.74 + midBand * 0.46 + innerVortex * 0.40 + turb * 0.22 * hexFade;
    alpha = clamp(density * hexFade * solarAlpha * min(uIntensity, 1.48), 0.0, 0.74);
  } else if (uPattern < 2.5) {
    // Pattern 2: Wind-sheared atmospheric dust storm / high-altitude methane & CO2 cirrus veil (solar-lit)
    vec2 flowUv = vec2(p.x * 2.3 - uTime * 0.42, p.y * 3.8 + sin(p.x * 2.8 + uTime * 0.46) * 0.36);
    float warp = fbm(flowUv * 0.85 + vec2(3.1, -1.9));
    float n1 = fbm(flowUv + vec2(warp * 0.65, -warp * 0.35));
    float n2 = fbm(flowUv * 2.1 + vec2(-uTime * 0.52, 2.3));
    float streaks = smoothstep(0.26, 0.80, n1 * 0.66 + n2 * 0.46);
    col = mix(uSecondaryColor, uPrimaryColor, streaks) * mix(0.24, 1.08, smoothstep(-0.24, 0.30, ndotl));
    alpha = clamp(streaks * edgeFade * solarAlpha * 0.68 * min(uIntensity, 1.55), 0.0, 0.76);
  } else if (uPattern < 3.5) {
    // Pattern 3: Incandescent thermal / lava / tidal ice fissure network (self-emissive)
    vec2 q = p * 3.8 + vec2(sin(uTime * 0.40) * 0.10, cos(uTime * 0.34) * 0.10);
    float f1 = abs(fbm(q) - 0.5);
    float f2 = abs(fbm(q * 1.9 + vec2(4.2, -3.1)) - 0.5);
    float crack = smoothstep(0.11, 0.012, f1) + smoothstep(0.09, 0.01, f2) * 0.62;
    float pulse = 0.84 + 0.24 * sin(uTime * 3.2 + r * 6.0);
    float coreGlow = exp(-r * r * 6.5) * 0.48;
    col = mix(uPrimaryColor, uSecondaryColor, clamp(crack * 0.78 + coreGlow, 0.0, 1.0));
    col *= (1.05 + 0.28 * pulse);
    alpha = clamp((crack * 0.84 + coreGlow) * edgeFade * pulse * min(uIntensity, 1.55), 0.0, 0.94);
  } else {
    // Pattern 4: Periodic hypervelocity bolide impact fireball + expanding shockwave ring
    float cycle = fract(uTime * 0.34);
    float burstBoost = smoothstep(1.3, 2.0, uIntensity);
    float phase = mix(cycle, fract(uTime * 0.82), burstBoost);
    float flash = exp(-phase * 6.8) * exp(-r * r * 12.0);
    float ringPos = phase * 0.92;
    float ringD = (r - ringPos) * 14.5;
    float ring = exp(-(ringD * ringD)) * (1.0 - phase) * smoothstep(0.02, 0.14, phase);
    float craterAfterglow = exp(-r * r * 8.0) * (1.0 - phase * 0.72) * 0.62;
    float energy = flash * 2.1 + ring * 1.35 + craterAfterglow;
    col = mix(uSecondaryColor, uPrimaryColor, clamp(flash * 1.45 + ring * 0.68, 0.0, 1.0));
    alpha = clamp(energy * edgeFade * min(uIntensity, 2.3), 0.0, 0.98);
  }

  alpha *= uOpacity;
  if (alpha < 0.006) {
    discard;
  }

  gl_FragColor = vec4(col, alpha);
}
