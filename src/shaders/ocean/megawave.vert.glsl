uniform float uTime;
varying vec2 vUv;
varying vec3 vNormal;
varying float vElevation;

void main() {
  vUv = uv;
  vec3 pos = position;

  // Gerstner-like solitary giant tidal megawaves
  float wave1 = sin(pos.x * 0.025 + uTime * 0.8) * 14.0;
  float wave2 = cos(pos.z * 0.018 + uTime * 0.5) * 8.0;
  
  // Massive solitary crest steepening (The 1,200m Megawave)
  float megawaveCrest = pow(clamp(sin(pos.x * 0.015 - uTime * 0.4) * 0.5 + 0.5, 0.0, 1.0), 5.0) * 45.0;

  float elevation = wave1 + wave2 + megawaveCrest;
  pos.y += elevation;
  vElevation = elevation;

  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
