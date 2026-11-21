precision highp float;

uniform float uTime;
uniform float uBiome;
uniform float uIntensity;
uniform float uBurst;
uniform float uStarfieldOpacity;
uniform vec3 uSkyZenith;
uniform vec3 uSkyHorizon;
uniform vec3 uSkyGlow;
uniform vec3 uPrimaryColor;
uniform vec3 uLightDir;

varying vec3 vDir;

float hash21(vec2 p) {
  p = fract(p * vec2(127.1, 311.7));
  p += dot(p, p + 19.19);
  return fract(p.x * p.y);
}

float noise2D(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash21(i + vec2(0.0, 0.0)), hash21(i + vec2(1.0, 0.0)), u.x),
    mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

void main() {
  vec3 dir = length(vDir) > 1e-4 ? normalize(vDir) : vec3(0.0, 1.0, 0.0);
  vec3 lightD = length(uLightDir) > 1e-4 ? normalize(uLightDir) : vec3(0.05, 0.24, -0.97);
  float elev = clamp(dir.y, -0.15, 1.0);

  vec3 midSky = mix(uSkyHorizon, uSkyZenith, 0.48);
  vec3 sky = mix(uSkyHorizon, midSky, smoothstep(-0.04, 0.22, elev));
  sky = mix(sky, uSkyZenith, smoothstep(0.20, 0.78, elev));

  // Directional sun/horizon atmospheric forward scatter glow
  float sunCos = max(dot(dir, lightD), 1e-4);
  float scatterWide = pow(sunCos, 4.5) * 0.36;
  float scatterCore = pow(sunCos, 24.0) * 0.42;
  float horizonBand = 1.0 - smoothstep(0.0, 0.52, max(elev, 0.0)) * 0.55;
  sky += uSkyGlow * (scatterWide + scatterCore) * horizonBand * (0.85 + 0.35 * (clamp(uBurst, 1.0, 2.2) - 1.0));

  // High-altitude atmospheric wispy cloud bands (pronounced in thick atmospheres)
  float atmWeight = clamp(1.0 - uStarfieldOpacity * 0.78, 0.12, 1.0);
  vec2 cloudUv = dir.xz / (max(elev, 0.08) + 0.35);
  float wisp1 = noise2D(cloudUv * 2.2 + vec2(uTime * 0.035, -uTime * 0.015));
  float wisp2 = noise2D(cloudUv * 4.8 - vec2(uTime * 0.055, uTime * 0.025));
  float wisps = smoothstep(0.42, 0.85, wisp1 * 0.65 + wisp2 * 0.35) * smoothstep(0.0, 0.25, elev) * (1.0 - smoothstep(0.55, 0.96, elev));
  sky += mix(uSkyGlow, uPrimaryColor, 0.35) * wisps * 0.24 * atmWeight * clamp(uIntensity, 0.6, 1.6);

  // Crisp circular pinpoint starfield visible through thin/vacuum skies
  if (uStarfieldOpacity > 0.04 && elev > 0.02) {
    vec2 starUv = dir.xz / (elev + 0.42) * 85.0;
    vec2 starCell = floor(starUv);
    vec2 starLocal = fract(starUv) - 0.5;
    float rnd = hash21(starCell + vec2(11.7, 37.3));
    float isStar = step(0.986, rnd);
    float pinpoint = smoothstep(0.26, 0.04, length(starLocal));
    float twinkle = 0.72 + 0.28 * sin(uTime * 2.4 + rnd * 62.8);
    sky += vec3(0.90, 0.95, 1.0) * isStar * pinpoint * twinkle * uStarfieldOpacity * smoothstep(0.03, 0.30, elev);
  }

  gl_FragColor = vec4(sky, 1.0);
}
