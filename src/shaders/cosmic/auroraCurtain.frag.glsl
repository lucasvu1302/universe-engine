precision highp float;

uniform float uTime;
uniform float uIntensity;

varying vec2 vUv;
varying vec3 vNormalDir;
varying vec3 vViewDir;

void main() {
  float angle = vUv.x * 6.2831853;

  // Shimmering vertical geomagnetic field-line aurora curtains (silky exponential taper — zero hard top edge!)
  float ray1 = 0.5 + 0.5 * sin(angle * 24.0 + uTime * 1.9 + sin(angle * 5.0 - uTime * 0.7) * 1.5);
  float ray2 = 0.5 + 0.5 * sin(angle * 43.0 - uTime * 2.6 + vUv.y * 1.6);
  float rays = mix(0.28, 1.0, pow(clamp(ray1 * 0.65 + ray2 * 0.35, 0.0, 1.0), 1.8));

  float bottomEdge = smoothstep(0.0, 0.16, vUv.y);
  float topEdge = exp(-pow(clamp(max(0.0, vUv.y - 0.22) / 0.38, 0.0, 2.5), 2.0)) * (1.0 - smoothstep(0.72, 0.98, vUv.y));
  float verticalMask = bottomEdge * topEdge;

  float ndotv = clamp(abs(dot(normalize(vNormalDir), normalize(vViewDir))), 0.0, 1.0);
  float grazing = 0.38 + 0.62 * pow(clamp(1.0 - ndotv, 0.0, 1.0), 1.5);

  vec3 emeraldO2 = vec3(0.10, 0.96, 0.52);
  vec3 cyanMid = vec3(0.10, 0.80, 0.92);
  vec3 violetN2 = vec3(0.68, 0.26, 0.96);
  vec3 crimsonTop = vec3(0.95, 0.22, 0.50);

  vec3 col = mix(emeraldO2, cyanMid, smoothstep(0.15, 0.48, vUv.y));
  col = mix(col, violetN2, smoothstep(0.38, 0.72, vUv.y));
  col = mix(col, crimsonTop, smoothstep(0.60, 0.88, vUv.y) * uIntensity);

  float alpha = verticalMask * rays * grazing * (0.38 + 0.52 * uIntensity);
  if (alpha < 0.008) discard;

  gl_FragColor = vec4(col * (0.9 + 0.45 * uIntensity), clamp(alpha, 0.0, 0.88));
}
