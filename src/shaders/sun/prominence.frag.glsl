precision highp float;

uniform float uTime;
uniform vec3 uCameraPosition;
uniform float uSunRadius;
uniform float uProminenceRadius;

varying vec3 vWorldPosition;
varying vec3 vNormal;
varying vec3 vLocalPosition;
varying vec2 vUv;

vec4 permute(vec4 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
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
  i = mod(i, 289.0);
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
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;
  for (int i = 0; i < 4; i++) {
    value += amplitude * snoise(p * frequency);
    p += vec3(1.23, 2.34, 3.45);
    frequency *= 2.1;
    amplitude *= 0.48;
  }
  return value;
}

void main() {
  vec3 viewDir = normalize(uCameraPosition - vWorldPosition);
  vec3 norm = normalize(vNormal);

  float ndotv = clamp(abs(dot(norm, viewDir)), 0.0, 1.0);
  float impactRadius = uProminenceRadius * sqrt(max(0.0, 1.0 - ndotv * ndotv));
  float altitude = clamp((impactRadius - uSunRadius) / max(0.001, (uProminenceRadius - uSunRadius)), 0.0, 1.0);

  float outerFade = 1.0 - smoothstep(0.55, 0.99, altitude);
  if (outerFade <= 0.002) {
    discard;
  }

  // Chromosphere & coronal filaments peak smoothly right at the photosphere limb (zero detached inner ring!)
  float limbFalloff = exp(-altitude * 3.4) * outerFade;

  float t = uTime * 0.16;
  vec3 dir = normalize(vLocalPosition);
  vec3 p = dir * 2.8;
  vec3 warp = vec3(
    snoise(p + vec3(0.0, t * 0.35, 0.0)),
    snoise(p + vec3(4.3, 0.0, t * 0.25)),
    snoise(p + vec3(0.0, t * 0.2, 7.1))
  );

  float n1 = fbm(p * 1.15 + warp * 0.45 + vec3(t * 0.12));
  float n2 = snoise(p * 2.2 - warp * 0.35 - vec3(0.0, t * 0.22, 0.0));

  float filamentMod = mix(0.68, 1.18, clamp(n1 * 0.65 + n2 * 0.35 + 0.5, 0.0, 1.0));
  float plasmaDensity = limbFalloff * filamentMod;

  if (plasmaDensity < 0.006) {
    discard;
  }

  vec3 rubyRed = vec3(0.88, 0.16, 0.03);
  vec3 solarOrange = vec3(1.0, 0.50, 0.08);
  vec3 warmGold = vec3(1.05, 0.82, 0.42);

  vec3 color = mix(rubyRed, solarOrange, smoothstep(0.08, 0.48, plasmaDensity));
  color = mix(color, warmGold, smoothstep(0.52, 0.95, plasmaDensity));

  float alpha = clamp(plasmaDensity * 0.58, 0.0, 0.68);
  gl_FragColor = vec4(color, alpha);
}
