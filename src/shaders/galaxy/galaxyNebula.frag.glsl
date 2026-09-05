precision highp float;

uniform float uTime;

varying vec2 vUv;
varying vec3 vWorldPosition;

// High quality 2D hash and noise
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
  float a = 0.52;
  mat2 rot = mat2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 4; ++i) {
    v += a * noise(p);
    p = rot * p * 2.05 + vec2(11.3, 27.8);
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 p = vUv - vec2(0.5);
  float r = length(p) * 2.0;

  if (r > 1.0 || r < 0.001) {
    discard;
  }

  float angle = atan(p.y, p.x + 0.000001);

  // 1. Central Bulge volumetric radiance
  float bulge = exp(-r * 7.5) * 3.2;
  vec3 bulgeColor = vec3(1.2, 0.95, 0.65);

  // 2. 4 Logarithmic Spiral Arms
  float b = 0.22;
  float spiral = angle - (1.0 / b) * log(max(r * 10.0, 0.08)) - uTime * 0.012;

  // 4 arms symmetry: cos(2.0 * spiral) gives 4 peaks around the circle
  float armProfile = pow(clamp(cos(2.0 * spiral) * 0.5 + 0.5, 0.0, 1.0), 2.8);

  // 3. Turbulent interstellar gas clouds & glowing emission nebulae
  vec2 gasCoord = vec2(spiral * 2.4, r * 12.0);
  float gasNoise = fbm(gasCoord);
  float gasClouds = armProfile * pow(gasNoise, 1.25) * smoothstep(0.05, 0.2, r) * (1.0 - smoothstep(0.8, 1.0, r));

  // 4. Dark molecular dust lanes (silhouetted against the bright inner edges of the arms)
  float dustSpiral = spiral - 0.28;
  float dustProfile = pow(clamp(cos(2.0 * dustSpiral) * 0.5 + 0.5, 0.0, 1.0), 3.2);
  float dustNoise = fbm(vec2(dustSpiral * 3.2, r * 16.0));
  float dustLane = dustProfile * dustNoise * smoothstep(0.08, 0.28, r) * (1.0 - smoothstep(0.75, 0.95, r));

  // 5. Rich astrophysical colors
  vec3 armBlue = vec3(0.18, 0.55, 0.98);
  vec3 armMagenta = vec3(0.92, 0.28, 0.75);
  vec3 armColor = mix(armBlue, armMagenta, smoothstep(0.15, 0.65, r) * gasNoise);

  vec3 finalColor = bulgeColor * bulge + armColor * gasClouds * 1.8;

  // Extinction from dark molecular clouds
  finalColor *= clamp(1.0 - dustLane * 0.75, 0.12, 1.0);

  float alpha = clamp(bulge * 0.8 + gasClouds * 0.55 + dustLane * 0.22, 0.0, 0.92);
  if (alpha < 0.008) {
    discard;
  }

  gl_FragColor = vec4(finalColor, alpha);
}
