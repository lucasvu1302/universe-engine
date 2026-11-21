uniform float uTime;
uniform vec2 uBh1Pos;
uniform vec2 uBh2Pos;
uniform float uWaveAmp;
uniform float uOrbitalPhase;

varying vec2 vWorldXZ;
varying float vWaveHeight;
varying float vWellDepth;
varying float vMinBhDist;

void main() {
  vec3 pos = position;
  vec2 xz = pos.xz;
  vWorldXZ = xz;

  // Smooth Gaussian spacetime curvature wells (zero vertical cusp spikes or hanging triangles!)
  float d1 = length(xz - uBh1Pos);
  float d2 = length(xz - uBh2Pos);
  vMinBhDist = min(d1, d2);

  float well = -2.15 * exp(-(d1 * d1) / 4.8) - 1.85 * exp(-(d2 * d2) / 4.2);

  // Quadrupole spiral gravitational wave ripples radiating outward: cos(2*phi - k*r + 2*orbitalPhase)
  // Guard atan(0.0, 0.0) explicitly for Metal/ANGLE NaN safety (F1)
  float r = length(xz);
  float phi = r > 1e-5 ? atan(xz.y, xz.x) : 0.0;
  float radialFade = smoothstep(1.8, 4.6, r) / (1.0 + r * 0.08);
  float ripple = cos(2.0 * phi - r * 0.92 + uOrbitalPhase * 2.0 + uTime * 2.2) * uWaveAmp * 1.25 * radialFade;

  pos.y += well + ripple;
  vWaveHeight = ripple;
  vWellDepth = clamp(-well / 2.8, 0.0, 1.0);

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
