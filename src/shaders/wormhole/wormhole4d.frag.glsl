uniform float uTime;
uniform vec3 uColorA;
uniform vec3 uColorB;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
  vec3 normal = normalize(vNormal);
  vec3 viewDir = normalize(vViewPosition);

  // Spherical gravitational lensing: light bends sharply near the throat rim
  float NdotV = clamp(abs(dot(normal, viewDir)), 0.0, 1.0);
  float rim = 1.0 - NdotV;
  float lensStrength = pow(clamp(rim, 0.0, 1.0), 2.2);

  // Swirling spacetime throat distortion
  vec2 p = vUv - 0.5;
  float r = length(p);
  float theta = atan(p.y, p.x + 0.000001);
  float swirl = sin(r * 28.0 - uTime * 3.5 + theta * 3.0) * 0.5 + 0.5;

  // Blending the other side of the galaxy through the throat
  vec3 galaxyInside = mix(uColorA, uColorB, swirl);
  vec3 throatGlow = vec3(0.3, 0.7, 1.0) * lensStrength * 2.2;

  vec3 finalColor = galaxyInside * (1.0 - lensStrength) + throatGlow;
  float alpha = clamp(0.75 + lensStrength * 0.25, 0.0, 1.0);

  gl_FragColor = vec4(finalColor, alpha);
}
