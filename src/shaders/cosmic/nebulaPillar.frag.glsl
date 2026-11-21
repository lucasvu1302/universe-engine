precision highp float;

uniform float uTime;
uniform float uMode; // 0.0 = M16 Pillars Hero Volumetric Cloud, 1.0 = M1 Crab Nebula, 2.0 = M16 Background Ionized Veil

varying vec2 vUv;
varying vec3 vNormalDir;
varying vec3 vViewDir;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 6; i++) {
    v += a * noise(p);
    p = rot * p * 2.03 + vec2(13.7, 9.2);
    a *= 0.49;
  }
  return v;
}

// Soft billowing domain-warped density for a single cosmic molecular dust pillar (ZERO hard cartoon contours!)
float samplePillarDensity(vec2 uv) {
  vec2 warp = vec2(
    fbm(uv * vec2(4.2, 5.4) + vec2(1.1, -uTime * 0.008)) - 0.5,
    fbm(uv * vec2(4.8, 4.1) + vec2(5.7, uTime * 0.006)) - 0.5
  );
  vec2 q = uv + warp * vec2(0.11, 0.09);

  // Pillar 1 (Tall left elephant trunk)
  float dy1 = clamp((q.y - 0.04) / 0.78, 0.0, 1.0);
  float cx1 = 0.30 + dy1 * 0.095 + sin(dy1 * 4.5 + 0.6) * 0.025;
  float r1 = mix(0.135, 0.048, dy1) * (0.88 + 0.22 * sin(dy1 * 7.0));
  float above1 = max(0.0, q.y - 0.82) * 1.75;
  float d1 = length(vec2((q.x - cx1) / max(0.02, r1), above1 / 0.14));
  float p1 = exp(-(d1 * d1) * 1.15) * smoothstep(0.0, 0.12, q.y);

  // Pillar 2 (Middle arched finger)
  float dy2 = clamp((q.y - 0.04) / 0.61, 0.0, 1.0);
  float cx2 = 0.51 + dy2 * 0.068 + sin(dy2 * 5.0 + 2.1) * 0.022;
  float r2 = mix(0.115, 0.040, dy2);
  float above2 = max(0.0, q.y - 0.65) * 1.85;
  float d2 = length(vec2((q.x - cx2) / max(0.02, r2), above2 / 0.13));
  float p2 = exp(-(d2 * d2) * 1.2) * smoothstep(0.0, 0.12, q.y);

  // Pillar 3 (Right spire)
  float dy3 = clamp((q.y - 0.04) / 0.45, 0.0, 1.0);
  float cx3 = 0.68 + dy3 * 0.072 + sin(dy3 * 4.2 + 4.0) * 0.020;
  float r3 = mix(0.098, 0.034, dy3);
  float above3 = max(0.0, q.y - 0.49) * 1.95;
  float d3 = length(vec2((q.x - cx3) / max(0.02, r3), above3 / 0.12));
  float p3 = exp(-(d3 * d3) * 1.25) * smoothstep(0.0, 0.12, q.y);

  // Lower dusty mountain base merging the three trunks naturally
  float bY = max(0.0, (q.y - 0.11) / 0.18);
  float bX = (q.x - 0.49) / 0.34;
  float baseBank = exp(-(bY * bY)) * exp(-(bX * bX)) * 0.82;

  float raw = max(max(p1, p2), max(p3, baseBank));
  float billows = fbm(q * vec2(11.0, 14.0) + vec2(0.0, -uTime * 0.01));
  float wisps = fbm(q * vec2(24.0, 26.0) + 3.2);
  return clamp(raw * (0.58 + 0.56 * billows + 0.18 * wisps), 0.0, 1.0);
}

void main() {
  if (uMode > 1.5) {
    // Soft deep-field Eagle Nebula ionized background gas veil (pure parallax volume, NO pillar edges!)
    vec2 uv = vUv;
    float c1 = fbm(uv * vec2(3.1, 2.8) + vec2(0.4, uTime * 0.005));
    float c2 = fbm(uv * vec2(6.5, 5.4) - vec2(uTime * 0.004, 1.2));
    vec3 deepTeal = vec3(0.04, 0.22, 0.34);
    vec3 o3Cyan = vec3(0.14, 0.48, 0.66);
    vec3 dustAmber = vec3(0.32, 0.16, 0.07);
    vec3 col = mix(deepTeal, o3Cyan, smoothstep(0.35, 0.82, c2) * (0.3 + 0.7 * uv.y));
    col = mix(col, dustAmber, (1.0 - smoothstep(0.0, 0.52, uv.y)) * c1 * 0.65);

    vec2 cp = (uv - 0.5) * 2.0;
    float fade = 1.0 - smoothstep(0.42, 0.98, length(cp));
    float alpha = clamp((0.22 + 0.45 * c1) * fade, 0.0, 0.62);
    if (alpha < 0.004) discard;
    gl_FragColor = vec4(col, alpha);
    return;
  }

  if (uMode < 0.5) {
    // Authentic JWST NIRCam / Hubble M16 Pillars of Creation — soft volumetric directional photoevaporation
    vec2 uv = vUv;
    float density = samplePillarDensity(uv);

    // Directional lighting derivative toward ionizing OB stars at top-center/top-left
    float dLight = samplePillarDensity(uv + vec2(-0.014, 0.032));
    float dLeft = samplePillarDensity(uv + vec2(-0.022, 0.010));
    float dRight = samplePillarDensity(uv + vec2(0.022, 0.010));
    // Positive where the column faces UPWARD/OUTWARD into UV ionizing radiation
    float sunlitSlope = clamp((density - dLight) * 3.4 + (density - min(dLeft, dRight)) * 1.4, 0.0, 1.0);
    float thinEdge = smoothstep(0.08, 0.42, density) * (1.0 - smoothstep(0.45, 0.85, density));

    // Fine internal molecular cloud turbulence & wispy evaporating tendrils streaming UPWARD
    float detail = fbm(uv * vec2(17.0, 21.0) + vec2(2.3, -uTime * 0.012));
    float streakUp = fbm(vec2(uv.x * 26.0, uv.y * 7.5 - uTime * 0.015));
    float evapMist = samplePillarDensity(uv - vec2(0.004, 0.055)) * (1.0 - smoothstep(0.28, 0.68, density)) * streakUp;

    // Rich JWST palette: velvet obsidian-umber dust core -> warm copper-sienna translucent clouds -> golden rim
    vec3 obsidianCore = vec3(0.055, 0.024, 0.015);
    vec3 copperCloud = vec3(0.44, 0.19, 0.08);
    vec3 amberBacklit = vec3(0.92, 0.50, 0.18);
    vec3 peachHighlight = vec3(1.0, 0.76, 0.48);
    vec3 evapTeal = vec3(0.18, 0.64, 0.82);
    vec3 hhRuby = vec3(0.98, 0.18, 0.24);

    // Internal dust shading (absorption increases smoothly with density!)
    float opticalDepth = smoothstep(0.14, 0.88, density);
    vec3 dustCol = mix(copperCloud, obsidianCore, smoothstep(0.42, 0.92, density * (0.78 + 0.35 * detail)));
    dustCol = mix(dustCol, amberBacklit, clamp(sunlitSlope * 0.72 + thinEdge * 0.48 * detail, 0.0, 1.0));
    dustCol += peachHighlight * pow(max(0.0001, sunlitSlope), 2.2) * thinEdge * 0.45;

    // Embedded crimson Herbig-Haro newborn star knots tucked near the pillar fingertips
    float hh1 = exp(-dot(uv - vec2(0.39, 0.78), uv - vec2(0.39, 0.78)) * 520.0);
    float hh2 = exp(-dot(uv - vec2(0.57, 0.61), uv - vec2(0.57, 0.61)) * 640.0);
    float hh3 = exp(-dot(uv - vec2(0.74, 0.46), uv - vec2(0.74, 0.46)) * 700.0);
    dustCol += hhRuby * (hh1 + hh2 * 0.85 + hh3 * 0.75) * 0.95;

    // Ambient ionized background + gossamer cyan-teal evaporating gas rising off pillar crests
    float bgCloud = fbm(uv * vec2(4.4, 4.0) + vec2(0.8, 0.2));
    vec3 bgIon = mix(vec3(0.012, 0.028, 0.062), vec3(0.08, 0.34, 0.48), smoothstep(0.28, 0.85, bgCloud) * (0.35 + 0.65 * uv.y));
    vec3 col = mix(bgIon, dustCol, opticalDepth);
    col += evapTeal * evapMist * (0.45 + 0.55 * uv.y) * 0.68;

    vec2 centerP = (uv - 0.5) * 2.0;
    float radialFade = 1.0 - smoothstep(0.58, 0.98, length(centerP));
    float alpha = clamp((opticalDepth * 0.94 + evapMist * 0.48 + bgCloud * 0.22) * radialFade, 0.0, 0.98);
    if (alpha < 0.005) discard;

    gl_FragColor = vec4(col, alpha);
    return;
  }

  // M1 Crab Nebula: tangled crimson H-alpha filaments + electric blue-cyan synchrotron core
  vec3 n = normalize(vNormalDir);
  vec3 v = normalize(vViewDir);
  float ndotv = clamp(abs(dot(n, v)), 0.0, 1.0);
  float rim = pow(clamp(1.0 - ndotv, 0.0, 1.0), 1.85);

  float cloud = fbm(vUv * vec2(4.2, 6.4) + vec2(uTime * 0.04, -uTime * 0.03));
  float fine = fbm(vUv * vec2(10.5, 13.0) - vec2(uTime * 0.02, uTime * 0.05));

  vec3 syncBlue = vec3(0.22, 0.72, 1.0);
  vec3 crimsonFil = vec3(0.96, 0.24, 0.34);
  vec3 emeraldFil = vec3(0.18, 0.88, 0.62);
  float fil = smoothstep(0.38, 0.74, fine);
  vec3 col = mix(syncBlue, crimsonFil, fil);
  col = mix(col, emeraldFil, rim * 0.45);
  float alpha = clamp((cloud * 0.58 + rim * 0.65) * 0.82, 0.0, 0.88);
  if (alpha < 0.02) discard;
  gl_FragColor = vec4(col * 1.08, alpha);
}
