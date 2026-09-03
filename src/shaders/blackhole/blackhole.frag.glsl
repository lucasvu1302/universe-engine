precision highp float;

uniform float uTime;
uniform vec3 uCenter;

varying vec2 vUv;
varying vec3 vWorldPosition;
varying vec3 vNormal;

// Safe hashing and noise with zero NaN
float hash(vec2 p) {
  vec2 h = fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453);
  return h.x;
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 rot = mat2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 5; ++i) {
    v += a * noise(p);
    p = rot * p * 2.02 + vec2(10.0);
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 p = vUv - vec2(0.5);
  float r = length(p) * 2.0;

  // Outer bounds discard
  if (r > 1.0 || r < 0.28) {
    discard;
  }

  // Safe angle calculation with epsilon offset
  float angle = atan(p.y, p.x + 0.000001);

  // 1. Razor-sharp Photon Ring at r ~ 0.32
  float photonDist = abs(r - 0.32);
  float photonRing = exp(-pow(photonDist * 48.0, 2.0)) * 3.5;

  // 2. Differential Keplerian Rotation (omega ~ 1 / r^1.5)
  float omega = 1.0 / (pow(max(r, 0.01), 1.5) + 0.05);
  float swirl = angle - uTime * 0.8 * omega;

  // 3. Multi-octave burning plasma filaments
  vec2 plasmaUv = vec2(swirl * 3.2, r * 14.0);
  float rawNoise = fbm(plasmaUv);
  float plasma = pow(clamp(rawNoise, 0.0, 1.0), 1.35);

  // Radial density profile
  float density = smoothstep(0.31, 0.45, r) * (1.0 - smoothstep(0.75, 1.0, r));

  // 4. Relativistic Doppler Beaming (left side bright blue-white, right side dim red-orange)
  float dopplerFactor = clamp(sin(angle) * 0.7 + 1.0, 0.0, 2.0);
  float doppler = pow(dopplerFactor, 2.8);

  // 5. Thermal Color Progression
  vec3 colorHot = vec3(1.4, 1.35, 1.2);   // Blazing white-hot innermost orbit
  vec3 colorMid = vec3(1.0, 0.62, 0.12);  // Fiery golden plasma
  vec3 colorCool = vec3(0.85, 0.2, 0.02); // Deep red-orange outer limb

  vec3 plasmaColor = mix(colorHot, colorMid, smoothstep(0.31, 0.55, r));
  plasmaColor = mix(plasmaColor, colorCool, smoothstep(0.55, 0.95, r));

  // Combine radiance
  vec3 finalColor = plasmaColor * plasma * density * doppler * 3.6;
  finalColor += vec3(1.4, 1.35, 1.2) * photonRing;

  float alpha = clamp(density * plasma * doppler + photonRing, 0.0, 1.0);
  if (alpha < 0.005) {
    discard;
  }

  gl_FragColor = vec4(finalColor, alpha);
}
