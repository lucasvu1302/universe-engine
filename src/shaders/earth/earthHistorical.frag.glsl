precision highp float;

uniform vec3 uSunPosition;
uniform float uEpochStage; // 0.0 (Hadean) -> 5.0 (Modern)
uniform float uImpactGlow; // Asteroid impact flash / shockwave
uniform float uTime;

varying vec3 vNormal;
varying vec3 vWorldPosition;
varying vec2 vUv;

// Simplex-style 2D & 3D noise for procedural continents & magma veins
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

// Fractal Brownian Motion for rich continents
float fbm(vec3 p) {
  float f = 0.0;
  f += 0.5000 * snoise(p); p *= 2.02;
  f += 0.2500 * snoise(p); p *= 2.03;
  f += 0.1250 * snoise(p); p *= 2.01;
  f += 0.0625 * snoise(p);
  return f;
}

void main() {
  vec3 norm = normalize(vNormal);
  vec3 sunDir = normalize(uSunPosition - vWorldPosition);
  float sunDot = dot(norm, sunDir);
  float dayFactor = smoothstep(-0.15, 0.25, sunDot);

  // Normal spherical position for texture lookup
  vec3 sphereCoord = normalize(vWorldPosition);

  // -----------------------------------------------------------------
  // 1. EPOCH 0: HADEAN MAGMA HELL
  // -----------------------------------------------------------------
  float magmaNoise = snoise(sphereCoord * 12.0 + uTime * 0.05);
  float lavaCrack = smoothstep(0.1, 0.28, abs(magmaNoise));
  vec3 basalt = vec3(0.06, 0.05, 0.07);
  vec3 glowingLava = mix(vec3(1.0, 0.2, 0.0), vec3(1.0, 0.85, 0.1), clamp(1.0 - lavaCrack, 0.0, 1.0));
  vec3 colorHadean = mix(glowingLava * 1.8, basalt, lavaCrack);

  // -----------------------------------------------------------------
  // 2. EPOCH 1: ARCHEAN & PROTEROZOIC (Greenish-cyan ocean + iron cratons)
  // -----------------------------------------------------------------
  float archNoise = fbm(sphereCoord * 3.5);
  bool isArchLand = archNoise > 0.18;
  vec3 archOcean = vec3(0.04, 0.28, 0.32); // Greenish iron-rich water
  vec3 archLand = vec3(0.38, 0.22, 0.14); // Barren red/brown craton
  vec3 colorArchean = isArchLand ? archLand : archOcean;

  // -----------------------------------------------------------------
  // 3. EPOCH 2: PANGAEA (Single unified giant supercontinent)
  // -----------------------------------------------------------------
  // Giant landmass focused on one side of globe (X > -0.2)
  float pangeaMask = fbm(sphereCoord * 2.8);
  bool isPangeaLand = (pangeaMask > 0.05) && (sphereCoord.x > -0.45);
  vec3 pangeaOcean = vec3(0.01, 0.18, 0.45); // Giant Panthalassa
  vec3 pangeaDesert = mix(vec3(0.65, 0.28, 0.12), vec3(0.18, 0.38, 0.15), clamp(abs(sphereCoord.y) * 1.5, 0.0, 1.0));
  vec3 colorPangaea = isPangeaLand ? pangeaDesert : pangeaOcean;

  // -----------------------------------------------------------------
  // 4. EPOCH 3: JURASSIC & CRETACEOUS (Tropical warm, fragmented continents)
  // -----------------------------------------------------------------
  float jurassicNoise = fbm(sphereCoord * 4.2);
  bool isJurassicLand = jurassicNoise > 0.08;
  vec3 jurassicOcean = vec3(0.02, 0.32, 0.65); // Warm turquoise shallow seas
  vec3 jurassicJungle = vec3(0.05, 0.52, 0.18); // Deep tropical vegetation
  vec3 colorJurassic = isJurassicLand ? jurassicJungle : jurassicOcean;

  // -----------------------------------------------------------------
  // 5. EPOCH 4: QUATERNARY ICE AGE (Massive white polar ice caps to 45 deg)
  // -----------------------------------------------------------------
  float modernLandNoise = fbm(sphereCoord * 5.0);
  bool isLandBase = modernLandNoise > 0.12;
  // Ice sheets down to latitude 40 degrees
  float latAbs = abs(sphereCoord.y);
  bool isGlacialIce = latAbs > 0.45 || (latAbs > 0.35 && modernLandNoise > 0.05);
  vec3 iceColor = vec3(0.92, 0.96, 1.0);
  vec3 tundraColor = vec3(0.28, 0.32, 0.24);
  vec3 iceAgeOcean = vec3(0.01, 0.15, 0.38);
  vec3 colorIceAge = isGlacialIce ? iceColor : (isLandBase ? tundraColor : iceAgeOcean);

  // -----------------------------------------------------------------
  // 6. EPOCH 5: MODERN ANTHROPOCENE (Familiar continents & night city lights)
  // -----------------------------------------------------------------
  vec3 modernOcean = vec3(0.02, 0.24, 0.55);
  vec3 modernForest = vec3(0.08, 0.48, 0.18);
  vec3 modernDesert = vec3(0.68, 0.55, 0.35);
  vec3 modernLand = mix(modernDesert, modernForest, smoothstep(0.12, 0.45, modernLandNoise));
  vec3 colorModernDay = isLandBase ? modernLand : modernOcean;

  // Night lights on modern land
  float nightFactor = 1.0 - dayFactor;
  float cityNoise = snoise(sphereCoord * 35.0);
  vec3 cityLights = vec3(1.0, 0.85, 0.4) * step(0.65, cityNoise) * (isLandBase ? 1.0 : 0.0) * nightFactor * 2.5;

  // -----------------------------------------------------------------
  // CONTINUOUS SHADER BLENDING ACROSS THE 6 EPOCHS
  // -----------------------------------------------------------------
  float stage = clamp(uEpochStage, 0.0, 5.0);
  vec3 surfaceColor = colorHadean;

  if (stage < 1.0) {
    surfaceColor = mix(colorHadean, colorArchean, stage);
  } else if (stage < 2.0) {
    surfaceColor = mix(colorArchean, colorPangaea, stage - 1.0);
  } else if (stage < 3.0) {
    surfaceColor = mix(colorPangaea, colorJurassic, stage - 2.0);
  } else if (stage < 4.0) {
    surfaceColor = mix(colorJurassic, colorIceAge, stage - 3.0);
  } else {
    surfaceColor = mix(colorIceAge, colorModernDay, stage - 4.0);
  }

  // Sunlight lighting (Day vs Night)
  // Note: Hadean magma self-illuminates regardless of day/night
  float selfIllum = (1.0 - clamp(stage, 0.0, 1.0)) * (1.0 - lavaCrack) * 0.8;
  vec3 litColor = surfaceColor * (dayFactor * 0.95 + 0.05 + selfIllum);

  // Add modern night city lights if approaching modern stage
  if (stage > 4.0) {
    litColor += cityLights * (stage - 4.0);
  }

  // Asteroid impact cataclysm shockwave flash
  if (uImpactGlow > 0.01) {
    float distFromImpact = length(sphereCoord - vec3(0.3, 0.2, 0.9));
    float shockRing = smoothstep(uImpactGlow - 0.08, uImpactGlow, distFromImpact) *
                      smoothstep(uImpactGlow + 0.08, uImpactGlow, distFromImpact);
    vec3 impactFlash = vec3(1.0, 0.4, 0.05) * shockRing * 4.0;
    litColor += impactFlash;
  }

  // Atmospheric limb fresnel glow
  vec3 viewDir = normalize(cameraPosition - vWorldPosition);
  float fresnel = 1.0 - max(dot(viewDir, norm), 0.0);
  fresnel = pow(fresnel, 3.5);
  vec3 atmoColor = mix(vec3(0.9, 0.3, 0.05), vec3(0.2, 0.65, 1.0), clamp(stage / 2.0, 0.0, 1.0));
  litColor += atmoColor * fresnel * 0.65;

  gl_FragColor = vec4(litColor, 1.0);
}
