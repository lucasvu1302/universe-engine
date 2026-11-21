precision highp float;

uniform float uTime;
uniform float uBiome;
uniform float uIntensity;
uniform float uBurst;
uniform float uReducedMotion;
uniform vec3 uGroundPrimary;
uniform vec3 uGroundSecondary;
uniform vec3 uGroundAccent;
uniform vec3 uSkyHorizon;
uniform vec3 uSkyGlow;
uniform vec3 uPrimaryColor;
uniform vec3 uSecondaryColor;
uniform vec3 uLightDir;

varying vec3 vWorldPos;
varying vec3 vNormal;
varying float vHeight;
varying float vDetail;
varying vec2 vUv;

float hash21(vec2 p) {
  p = fract(p * vec2(127.1, 311.7));
  p += dot(p, p + 34.5);
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

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 3; i++) {
    v += a * noise2D(p);
    p = p * 2.08 + vec2(7.3, -4.1);
    a *= 0.5;
  }
  return v;
}

void main() {
  float animT = uTime * mix(1.0, 0.2, uReducedMotion);
  vec3 N = length(vNormal) > 1e-4 ? normalize(vNormal) : vec3(0.0, 1.0, 0.0);
  vec3 L = length(uLightDir) > 1e-4 ? normalize(uLightDir) : vec3(0.0, 0.4, -0.9);
  vec3 viewVec = cameraPosition - vWorldPos;
  vec3 V = length(viewVec) > 1e-4 ? normalize(viewVec) : vec3(0.0, 0.0, 1.0);
  vec3 H = length(L + V) > 1e-4 ? normalize(L + V) : N;

  float ndotl = max(dot(N, L), 0.0);
  float fresnel = pow(max(1.0 - max(dot(N, V), 0.0), 1e-4), 3.2);
  float spec = pow(max(dot(N, H), 1e-4), 28.0);
  float fine = fbm(vWorldPos.xz * 0.16);
  float burstBoost = clamp(uBurst, 1.0, 2.4);
  float intens = clamp(uIntensity, 0.5, 1.8);

  vec3 col = mix(uGroundSecondary, uGroundPrimary, clamp(vDetail * 0.75 + fine * 0.4, 0.0, 1.0));
  col *= (0.34 + 0.78 * ndotl);

  if (uBiome < 0.5) {
    // Biome 0: volcanic_lava — dark obsidian basalt crust with razor-crisp incandescent magma fissures (zero salmon blotches)
    vec2 warp = vec2(
      fbm(vWorldPos.xz * 0.065 + vec2(animT * 0.015, 0.0)),
      fbm(vWorldPos.xz * 0.065 + vec2(4.2, -animT * 0.012))
    );
    float crack1 = abs(fbm(vWorldPos.xz * 0.085 + (warp - 0.5) * 1.35) - 0.5);
    float crack2 = abs(fbm(vWorldPos.xz * 0.17 - (warp - 0.5) * 0.9) - 0.5);
    float lavaVein = smoothstep(0.036, 0.006, crack1) + smoothstep(0.028, 0.004, crack2) * 0.55;
    float calderaProximity = smoothstep(78.0, 22.0, length(vWorldPos.xz - vec2(2.0, -50.0)));
    float molten = clamp(lavaVein * (0.55 + 0.65 * calderaProximity), 0.0, 1.0);
    float pulse = 0.84 + 0.16 * sin(animT * 2.8 + vWorldPos.z * 0.09);
    vec3 basalt = mix(uGroundSecondary * 0.52, uGroundPrimary * 0.68, clamp(fine * 0.7 + vDetail * 0.3, 0.0, 1.0));
    basalt *= (0.36 + 0.72 * ndotl);
    vec3 lavaCol = mix(uPrimaryColor, vec3(1.0, 0.92, 0.52), molten * 0.62);
    col = mix(basalt, lavaCol * (1.28 + 0.48 * (burstBoost - 1.0)) * pulse, molten * min(intens, 1.35));
    col += uSkyGlow * fresnel * 0.24;
  } else if (uBiome < 1.5) {
    // Biome 1: cryo_ice_geyser — crystalline blue-white glacial crust & sharp anti-aliased Tiger Stripes
    float stripeWarp = (fine - 0.5) * 0.35;
    float stripe = abs(sin(vWorldPos.x * 0.044 + sin(vWorldPos.z * 0.024) * 1.6 + stripeWarp));
    float fissureCore = smoothstep(0.085, 0.012, stripe);
    float fissureHalo = smoothstep(0.22, 0.03, stripe) * 0.35;
    float fissureGlow = (fissureCore + fissureHalo) * (0.78 + 0.22 * sin(animT * 2.2 + vWorldPos.z * 0.08));
    vec3 iceTint = mix(uGroundSecondary * 0.75, uGroundPrimary, smoothstep(-1.5, 4.2, vHeight) * 0.72 + fine * 0.28);
    col = iceTint * (0.44 + 0.74 * ndotl) + vec3(0.75, 0.94, 1.0) * spec * 0.58;
    col += mix(uGroundAccent, uPrimaryColor, 0.55) * fissureGlow * (1.05 + 0.45 * (burstBoost - 1.0)) * intens;
    col += uSkyGlow * fresnel * 0.32;
  } else if (uBiome < 2.5) {
    // Biome 2: dust_impact_desert — legible warm wind-rippled dunes & cratered red mesas
    float ripple = 0.5 + 0.5 * sin(vWorldPos.x * 0.45 + vWorldPos.z * 0.28 + fine * 4.5);
    col = mix(uGroundSecondary * 1.15, uGroundPrimary * 1.12, clamp(0.32 + ripple * 0.36 + vDetail * 0.34, 0.0, 1.0));
    col *= (0.48 + 0.80 * ndotl);
    float centerGlow = exp(-dot(vWorldPos.xz - vec2(0.0, -44.0), vWorldPos.xz - vec2(0.0, -44.0)) * 0.0022);
    col += uPrimaryColor * centerGlow * 0.36 * (0.7 + 0.5 * (burstBoost - 1.0));
    col += uSkyHorizon * fresnel * 0.36;
  } else if (uBiome < 3.5) {
    // Biome 3: gas_giant_clouds — sweeping multi-band storm cloud ocean & lightning sheet flashes
    float bandFlow = fbm(vec2(vWorldPos.x * 0.032 + animT * 0.12, vWorldPos.z * 0.055 + animT * 0.22));
    float crestMask = smoothstep(1.2, 8.2, vHeight + bandFlow * 2.6);
    vec3 troughCol = mix(uGroundSecondary, uGroundPrimary, 0.32);
    vec3 crestCol = mix(uGroundPrimary, uGroundAccent, 0.65);
    col = mix(troughCol, crestCol, clamp(crestMask * 0.85 + bandFlow * 0.25, 0.0, 1.0));
    col *= (0.45 + 0.72 * ndotl);
    col += uSkyGlow * fresnel * 0.45;
    // Subtle internal storm-cloud sheet lightning glow pulsing across the cloud sea (GLSL ES NaN-safe square)
    float flashRaw = max(0.0, sin(animT * 4.8 + vWorldPos.x * 0.04) * sin(animT * 9.3 - vWorldPos.z * 0.03));
    float flashWave = flashRaw * flashRaw;
    float stormFlash = flashWave * (0.18 + 0.45 * (burstBoost - 1.0)) * smoothstep(0.35, 0.85, bandFlow);
    col += mix(uPrimaryColor, vec3(0.95, 0.98, 1.0), 0.55) * stormFlash * intens;
  } else {
    // Biome 4: polar_aurora_sky — frost-covered polar terrain reflecting overhead aurora light
    float snow = smoothstep(0.25, 0.75, fine * 0.65 + vDetail * 0.45);
    col = mix(uGroundSecondary * 0.55, mix(uGroundPrimary, vec3(0.76, 0.88, 0.96), 0.42), snow);
    col *= (0.28 + 0.62 * ndotl);
    float auroraBounce = 0.5 + 0.5 * sin(vWorldPos.x * 0.038 + animT * 0.85 + fine * 2.0);
    vec3 auroraTint = mix(uPrimaryColor, uSecondaryColor, auroraBounce);
    col += auroraTint * (0.22 + 0.34 * fresnel + 0.26 * spec) * (0.9 + 0.35 * (burstBoost - 1.0)) * intens;
  }

  // Distance fog seamlessly dissolving terrain into horizon sky
  float camDist = length(cameraPosition - vWorldPos);
  float fogFactor = 1.0 - exp(-pow(max(camDist * 0.0044, 1e-4), 1.65));
  vec3 fogCol = mix(uSkyHorizon, uSkyGlow, 0.22);
  col = mix(col, fogCol, clamp(fogFactor, 0.0, 0.96));

  gl_FragColor = vec4(col, 1.0);
}
