precision highp float;

uniform float uWaveAmp;

varying vec2 vWorldXZ;
varying float vWaveHeight;
varying float vWellDepth;
varying float vMinBhDist;

void main() {
  // Refined thin relativistic spacetime coordinate grid with smooth horizon-throat cutout (zero pins!)
  vec2 grid = abs(fract(vWorldXZ * 0.42 - 0.5) - 0.5) / max(fwidth(vWorldXZ * 0.42), vec2(0.002));
  float lineVal = 1.0 - min(min(grid.x, grid.y), 1.0);

  float r = length(vWorldXZ);
  float edgeFade = 1.0 - smoothstep(14.5, 21.0, r);
  float horizonMask = smoothstep(1.05, 1.72, vMinBhDist);

  float crest = clamp(vWaveHeight * 0.9 + 0.5, 0.0, 1.0);
  vec3 troughCol = vec3(0.20, 0.14, 0.64);
  vec3 crestCol = vec3(0.14, 0.86, 1.0);
  vec3 wellCol = vec3(0.98, 0.48, 0.14);

  vec3 col = mix(troughCol, crestCol, crest);
  col = mix(col, wellCol, smoothstep(0.28, 0.88, vWellDepth));

  float rippleGlow = clamp(abs(vWaveHeight) * (0.48 + 0.52 * uWaveAmp), 0.0, 0.72);
  float alpha = clamp((lineVal * 0.58 + rippleGlow * 0.32 + vWellDepth * 0.22) * edgeFade * horizonMask, 0.0, 0.92);
  if (alpha < 0.01) discard;

  gl_FragColor = vec4(col * (0.85 + lineVal * 0.5), alpha);
}
