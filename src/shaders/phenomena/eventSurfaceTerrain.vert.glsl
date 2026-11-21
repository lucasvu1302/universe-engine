uniform float uTime;
uniform float uBiome;
uniform float uIntensity;
uniform float uBurst;
uniform float uReducedMotion;

varying vec3 vWorldPos;
varying vec3 vNormal;
varying float vHeight;
varying float vDetail;
varying vec2 vUv;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
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
  mat2 rot = mat2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 4; i++) {
    v += a * noise2D(p);
    p = rot * p * 2.02 + vec2(11.3, 7.9);
    a *= 0.5;
  }
  return v;
}

float evalHeight(vec2 xz, float t) {
  // Keep gentle hover corridor clear around foreground Ranger craft at (-1.4, z=2.0)
  vec2 craftDelta = xz - vec2(-1.4, 2.0);
  float craftClear = smoothstep(6.5, 22.0, length(craftDelta));
  float farRise = smoothstep(46.0, 210.0, length(xz));

  if (uBiome < 0.5) {
    // Biome 0: volcanic_lava — undulating dark basalt ridges & distant caldera rim
    float ridge = abs(fbm(xz * 0.024 + vec2(1.4, -0.8)) - 0.5) * 2.0;
    float peaks = (1.0 - ridge) * 6.2 + fbm(xz * 0.055) * 2.6;
    float rim = farRise * 14.0 * (0.55 + 0.45 * noise2D(xz * 0.015));
    return (peaks + rim) * craftClear - 1.4;
  } else if (uBiome < 1.5) {
    // Biome 1: cryo_ice_geyser — smooth glaciated ridges & gentle wide Tiger Stripe troughs (zero triangle zippering!)
    float plate = fbm(xz * 0.026 + vec2(3.1, 1.9));
    float stripe = abs(sin(xz.x * 0.044 + sin(xz.y * 0.024) * 1.6));
    float canyon = smoothstep(0.42, 0.08, stripe) * 2.4;
    float crags = smoothstep(0.42, 0.86, plate) * 5.2;
    float rim = farRise * 11.5 * (0.5 + 0.5 * plate);
    return (crags - canyon + rim) * craftClear - 1.0;
  } else if (uBiome < 2.5) {
    // Biome 2: dust_impact_desert — wind-rippled Martian/lunar dunes & cratered mesas
    float dunes = sin(xz.x * 0.075 + xz.y * 0.045 + fbm(xz * 0.03) * 3.2) * 1.85;
    float basinR = length(xz - vec2(0.0, -44.0));
    float craterRimD = (basinR - 30.0) * 0.09;
    float crater = -smoothstep(28.0, 6.0, basinR) * 3.6 + exp(-(craterRimD * craterRimD)) * 5.2;
    float mesas = smoothstep(0.55, 0.82, fbm(xz * 0.018 + vec2(-2.2, 4.1))) * 9.5;
    return (dunes + crater + mesas + farRise * 10.0) * craftClear - 0.6;
  } else if (uBiome < 3.5) {
    // Biome 3: gas_giant_clouds — sweeping Miller-style towering cloud-ocean billows
    float speed = mix(1.0, 0.25, uReducedMotion);
    float wave1 = sin(xz.y * 0.052 + xz.x * 0.018 + t * 1.25 * speed) * 2.3;
    float wave2 = cos(xz.x * 0.046 - xz.y * 0.034 + t * 1.05 * speed) * 1.65;
    float billow = fbm(xz * 0.025 + vec2(t * 0.14 * speed, t * 0.22 * speed)) * 8.4;
    float swell = sin(xz.y * 0.018 + t * 0.55 * speed) * 3.2 * smoothstep(14.0, 95.0, -xz.y);
    float burstLift = 1.0 + (uBurst - 1.0) * 0.22;
    return (wave1 + wave2 + billow + swell) * burstLift * (0.45 + 0.55 * craftClear) - 3.6;
  } else {
    // Biome 4: polar_aurora_sky — frost tundra flats framed by distant arctic mountain silhouette
    float flats = fbm(xz * 0.026 + vec2(-1.2, 2.8)) * 3.2;
    float mtnMask = smoothstep(55.0, 195.0, length(xz - vec2(0.0, 12.0)));
    float ridge = abs(fbm(xz * 0.019 + vec2(4.2, -3.1)) - 0.5) * 2.0;
    float peaks = (1.0 - ridge) * 22.0 * mtnMask;
    return (flats + peaks) * craftClear - 1.4;
  }
}

void main() {
  vUv = uv;
  float animT = uTime * mix(1.0, 0.2, uReducedMotion);
  vec3 pos = position;

  float h = evalHeight(pos.xz, animT);
  float eps = 1.35;
  float hx = evalHeight(pos.xz + vec2(eps, 0.0), animT);
  float hz = evalHeight(pos.xz + vec2(0.0, eps), animT);

  pos.y += h;
  vec3 calcN = vec3(h - hx, eps, h - hz);
  float nLen = length(calcN);
  vNormal = nLen > 1e-4 ? (calcN / nLen) : vec3(0.0, 1.0, 0.0);
  vHeight = h;
  vDetail = fbm(pos.xz * 0.085 + vec2(animT * 0.04, -animT * 0.03));

  vec4 worldPos = modelMatrix * vec4(pos, 1.0);
  vWorldPos = worldPos.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
