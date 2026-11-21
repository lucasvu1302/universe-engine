precision highp float;

uniform sampler2D uCloudsMap;
uniform float uOpacity;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorldPosition;
varying vec3 vSunDirection;
varying vec3 vObjPos;

float hash31(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.yzx + 33.33);
  return fract((p.x + p.y) * p.z);
}

float noise3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);

  float n000 = hash31(i + vec3(0.0, 0.0, 0.0));
  float n100 = hash31(i + vec3(1.0, 0.0, 0.0));
  float n010 = hash31(i + vec3(0.0, 1.0, 0.0));
  float n110 = hash31(i + vec3(1.0, 1.0, 0.0));
  float n001 = hash31(i + vec3(0.0, 0.0, 1.0));
  float n101 = hash31(i + vec3(1.0, 0.0, 1.0));
  float n011 = hash31(i + vec3(0.0, 1.0, 1.0));
  float n111 = hash31(i + vec3(1.0, 1.0, 1.0));

  float nx00 = mix(n000, n100, f.x);
  float nx10 = mix(n010, n110, f.x);
  float nx01 = mix(n001, n101, f.x);
  float nx11 = mix(n011, n111, f.x);

  float nxy0 = mix(nx00, nx10, f.y);
  float nxy1 = mix(nx01, nx11, f.y);
  return mix(nxy0, nxy1, f.z);
}

float fbm3(vec3 p) {
  float v = 0.55 * noise3(p);
  p = p * 2.08 + vec3(11.3, 5.7, 17.9);
  v += 0.29 * noise3(p);
  p = p * 2.14 + vec3(4.1, 14.3, 9.7);
  v += 0.16 * noise3(p);
  return v;
}

void main() {
  if (uOpacity <= 0.004) discard;

  vec3 norm = normalize(vNormal);
  vec3 sunDir = normalize(vSunDirection);
  vec3 viewDir = normalize(cameraPosition - vWorldPosition);
  vec3 spherePos = normalize(vObjPos);

  // Domain-warped trade-wind weather fronts + crisp billowing cumulus cells + fine cirrus wisps
  float swirlA = fbm3(spherePos * 22.0 + vec3(3.4, -2.1, 6.2));
  vec3 warp = vec3(swirlA - 0.5, (noise3(spherePos * 34.0) - 0.5), (0.5 - swirlA)) * 0.048;
  float weatherFront = fbm3((spherePos + warp) * 28.0 + vec3(8.5, 2.1, -4.7));
  float cumulusBillow = fbm3((spherePos + warp * 0.45) * 118.0 + vec3(19.2, -11.4, 6.8));
  float cirrusWisp = noise3(spherePos * 340.0 + vec3(7.1, 13.4, -5.2));
  float satCloud = texture2D(uCloudsMap, vUv).r;

  float combined = weatherFront * 0.54 + cumulusBillow * 0.34 + satCloud * 0.20 + (cirrusWisp - 0.5) * 0.14;
  float density = smoothstep(0.49, 0.78, combined);

  // Softly fade cloud sheet right at extreme grazing horizon (clamped viewDot avoids Metal/ANGLE pow(-eps) NaN!)
  float viewDot = clamp(dot(norm, viewDir), 0.0, 1.0);
  float horizonSoft = smoothstep(0.03, 0.24, viewDot);
  float alpha = density * horizonSoft * clamp(uOpacity, 0.0, 1.0) * 0.88;
  if (alpha < 0.01) discard;

  // Volumetric self-shadowed cumulus tops & cool atmospheric cloud bases
  float NdotL = dot(norm, sunDir);
  float dayLit = smoothstep(-0.14, 0.20, NdotL);
  float twilight = smoothstep(-0.18, 0.04, NdotL) * (1.0 - smoothstep(0.02, 0.24, NdotL));

  vec3 cloudBase = vec3(0.56, 0.67, 0.82);
  vec3 cloudTop = vec3(0.97, 0.985, 1.0);
  float topLight = smoothstep(0.35, 0.82, cumulusBillow * 0.65 + weatherFront * 0.35);
  vec3 dayCol = mix(cloudBase, cloudTop, topLight) * (0.38 + 0.62 * max(NdotL, 0.0));
  vec3 nightCol = vec3(0.02, 0.035, 0.075);
  vec3 twilightCol = vec3(0.95, 0.62, 0.40) * 0.48;

  // Subtle Rayleigh blue perspective tint toward distant horizon
  float horizonTint = pow(1.0 - viewDot, 2.2) * 0.42;
  vec3 col = mix(nightCol, dayCol, dayLit) + twilightCol * twilight;
  col = mix(col, vec3(0.45, 0.72, 0.98) * (0.2 + 0.8 * dayLit), horizonTint);

  gl_FragColor = vec4(col, alpha);
}
