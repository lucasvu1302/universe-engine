precision highp float;

uniform float uTime;
uniform float uFireGlow;
uniform vec3 uEnginePos;
uniform float uSmokeDensity;
uniform vec3 uSunDir;

varying vec2 vUv;
varying vec3 vWorldPosition;
varying vec3 vNormal;
varying vec3 vBillboardRight;
varying vec3 vBillboardUp;

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
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

float fbm(vec3 p) {
  float f = 0.0;
  f += 0.520 * snoise(p); p *= 2.04;
  f += 0.280 * snoise(p); p *= 2.07;
  f += 0.140 * snoise(p);
  return f;
}

void main() {
  if (uSmokeDensity <= 0.005) {
    discard;
  }

  // Radial billboard coordinate [-1, 1]
  vec2 centered = (vUv - 0.5) * 2.0;
  float r = length(centered);
  if (r > 1.0) {
    discard;
  }

  vec3 norm = normalize(vNormal);
  vec3 viewDir = normalize(cameraPosition - vWorldPosition);
  float viewFacing = clamp(dot(norm, viewDir), 0.0, 1.0);

  // 3D turbulent cauliflower cumulus noise in world space
  vec3 flowPos = vWorldPosition * 0.11 + vec3(0.0, -uTime * 0.55, 0.0);
  float billow = fbm(flowPos) * 0.5 + 0.5;
  float detail = snoise(vWorldPosition * 0.36 - vec3(0.0, uTime * 1.15, 0.0)) * 0.5 + 0.5;
  float turbulence = billow * 0.68 + detail * 0.32;

  // Erode radial disc with multi-octave FBM so every puff has organic billowing cloud lobes
  float erodedR = r - (turbulence - 0.46) * 0.48;
  float radialMask = 1.0 - smoothstep(0.18, 0.88, erodedR);
  float groundCushion = smoothstep(-14.2, -12.8, vWorldPosition.y);

  float density = radialMask * (0.45 + 0.55 * viewFacing) * groundCushion;
  if (density < 0.015) {
    discard;
  }

  // Perturb hemisphere normal with FBM lobes for rich cumulus self-shadowing
  vec3 perturbedNorm = normalize(
    norm + vBillboardRight * (billow - 0.5) * 0.55 + vBillboardUp * (detail - 0.5) * 0.55
  );
  float sunLight = clamp(dot(perturbedNorm, normalize(uSunDir)) * 0.5 + 0.5, 0.0, 1.0);
  float powder = 1.0 - exp(-density * 3.0);

  vec3 coolShadow = vec3(0.28, 0.32, 0.39);
  vec3 sunlitSteam = vec3(0.71, 0.72, 0.74);
  vec3 steamCol = mix(coolShadow, sunlitSteam, clamp(sunLight * (0.55 + 0.45 * powder), 0.0, 1.0));

  // Fiery Merlin-1D kerosene/LOX scattering near flame trench & nozzle
  float distToEngine = length(vWorldPosition - uEnginePos);
  float engineGlow = pow(clamp(1.0 - distToEngine / 26.0, 0.0, 1.0), 1.9);
  vec3 fireOrange = mix(vec3(0.96, 0.36, 0.05), vec3(1.12, 0.76, 0.24), engineGlow);
  float fireMix = engineGlow * uFireGlow * (0.55 + 0.45 * turbulence);

  vec3 finalColor = mix(steamCol, fireOrange, clamp(fireMix * 0.72, 0.0, 0.88));
  finalColor += fireOrange * (fireMix * 0.25);

  float alpha = clamp(density * uSmokeDensity * 0.68, 0.0, 0.78);
  gl_FragColor = vec4(finalColor, alpha);
}
