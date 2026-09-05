precision highp float;

uniform float uTime;
uniform vec3 uCameraPosition;
uniform vec3 uColorCore;
uniform vec3 uColorRim;

varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vWorldPosition;
varying vec2 vUv;

// --- 3D Simplex & Voronoi Noise Helpers ---
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + 1.0 * C.xxx;
  vec3 x2 = x0 - i2 + 2.0 * C.xxx;
  vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;

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

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

// 3D Voronoi Cellular Granulation for hot plasma cells
float voronoi(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  float minDist = 1.0;

  for (int x = -1; x <= 1; x++) {
    for (int y = -1; y <= 1; y++) {
      for (int z = -1; z <= 1; z++) {
        vec3 neighbor = vec3(float(x), float(y), float(z));
        // Pseudo-random cell feature point
        vec3 point = vec3(
          snoise(i + neighbor + vec3(0.0)),
          snoise(i + neighbor + vec3(17.3)),
          snoise(i + neighbor + vec3(43.7))
        ) * 0.5 + 0.5;
        vec3 diff = neighbor + point - f;
        float dist = length(diff);
        minDist = min(minDist, dist);
      }
    }
  }
  return minDist;
}

// Fractal Convection Granulation
float plasmaGranulation(vec3 p, float t) {
  // Domain Warping to mimic hydrodynamic boiling
  vec3 warp = vec3(
    snoise(p * 1.8 + vec3(0.0, t * 0.35, 0.0)),
    snoise(p * 1.8 + vec3(4.3, 0.0, t * 0.28)),
    snoise(p * 1.8 + vec3(0.0, t * 0.22, 6.7))
  );

  vec3 pos = p * 4.5 + warp * 0.45;
  
  // Voronoi cell centers represent hot rising plumes
  float v = voronoi(pos);
  float cell = 1.0 - smoothstep(0.05, 0.65, v);

  // Micro-granules and turbulent intergranular lanes
  float micro = snoise(pos * 3.2 - vec3(t * 0.4)) * 0.25;
  float meso = snoise(p * 1.5 + vec3(0.0, t * 0.15, 0.0)) * 0.35;

  return clamp(cell * 0.75 + micro + meso + 0.15, 0.0, 1.0);
}

// Procedural Sunspots with Umbra, Penumbra, and magnetic Faculae
float getSunspots(vec3 norm, float t, out float faculae) {
  // Sunspots concentrated in mid-latitudes (between 10° and 35°)
  float lat = abs(norm.y);
  float activeZone = smoothstep(0.12, 0.28, lat) * (1.0 - smoothstep(0.48, 0.72, lat));

  if (activeZone < 0.01) {
    faculae = 0.0;
    return 1.0;
  }

  // Slow differential solar drift
  float spotCoord = norm.x * 3.5 + snoise(norm * 4.0 + vec3(t * 0.02)) * 0.5;
  float spotNoise = snoise(vec3(spotCoord, norm.y * 5.0, norm.z * 3.5));

  // Sunspot Umbra (dark magnetic core) and Penumbra (striated rim)
  float spotMask = smoothstep(0.68, 0.88, spotNoise) * activeZone;
  float umbra = smoothstep(0.78, 0.92, spotNoise) * activeZone;

  // Faculae (bright hot magnetic plages crackling around the spots)
  float faculaeNoise = snoise(norm * 14.0 + vec3(t * 0.1));
  faculae = smoothstep(0.45, 0.82, faculaeNoise) * activeZone * (1.0 - umbra) * 1.2;

  // Return absorption factor (1.0 = normal surface, < 1.0 = sunspot darkening)
  return 1.0 - (spotMask * 0.65 + umbra * 0.3);
}

void main() {
  vec3 norm = normalize(vNormal);
  vec3 viewDir = normalize(uCameraPosition - vWorldPosition);

  // 1. Physically-based Eddington Limb Darkening
  // mu = cos(theta) = dot(normal, viewDir)
  float mu = clamp(dot(norm, viewDir), 0.0, 1.0);
  float limbDarkening = 0.32 + 0.68 * pow(mu, 0.68);

  // 2. Boiling Plasma Convective Granulation
  float t = uTime * 0.3;
  vec3 plasmaCoord = normalize(vPosition) * 3.8;
  float granulation = plasmaGranulation(plasmaCoord, t);

  // 3. Magnetic Active Regions & Sunspots
  float faculae = 0.0;
  float sunspotFactor = getSunspots(norm, t, faculae);

  // 4. Photosphere Color Mapping:
  // - Hot convective granule center: Blinding White-Gold (5,800 K)
  // - Intergranular sinking lanes: Deep Solar Orange/Amber (4,200 K)
  // - Sunspot Umbra: Magnetic Deep Black/Crimson (3,700 K)
  // - Faculae: Superheated High-Flux White (6,500+ K)
  vec3 granuleCool = vec3(0.85, 0.28, 0.02); // Deep fiery amber
  vec3 granuleWarm = vec3(1.05, 0.68, 0.12); // Solar gold
  vec3 granuleHot = vec3(1.35, 1.25, 1.05);  // Blinding white-hot core
  vec3 sunspotCore = vec3(0.08, 0.02, 0.01); // Dark magnetic pit
  vec3 faculaeColor = vec3(1.4, 1.35, 1.2);  // Superheated plage

  // Blend granulation layers
  vec3 plasmaColor = mix(granuleCool, granuleWarm, smoothstep(0.15, 0.55, granulation));
  plasmaColor = mix(plasmaColor, granuleHot, smoothstep(0.65, 0.95, granulation));

  // Apply Sunspots darkening
  plasmaColor = mix(sunspotCore, plasmaColor, sunspotFactor);

  // Add Faculae brightness
  plasmaColor += faculaeColor * faculae;

  // Apply Eddington Limb Darkening (spectral reddening towards limb)
  vec3 limbColor = mix(vec3(0.9, 0.2, 0.01), plasmaColor, pow(mu, 0.45));
  vec3 finalColor = limbColor * limbDarkening;

  // 5. Chromosphere & Spicule Ruby Fringe at the extreme limb (mu -> 0)
  float rim = 1.0 - mu;
  float chromosphere = pow(rim, 6.0) * 2.8;
  vec3 hAlphaGlow = vec3(1.2, 0.15, 0.05); // H-alpha 656.3 nm ruby laser emission
  finalColor += hAlphaGlow * chromosphere;

  // Subtle pulsing core luminescence
  finalColor *= (1.05 + 0.05 * sin(uTime * 1.5));

  gl_FragColor = vec4(finalColor, 1.0);
}
