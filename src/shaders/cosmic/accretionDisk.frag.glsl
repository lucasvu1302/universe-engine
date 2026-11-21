precision highp float;

uniform float uTime;
uniform float uInnerRadius;
uniform float uOuterRadius;

varying vec2 vUv;
varying vec3 vLocalPos;

void main() {
  float r = length(vLocalPos.xy);
  if (r < uInnerRadius || r > uOuterRadius) {
    discard;
  }

  float normR = (r - uInnerRadius) / (uOuterRadius - uInnerRadius);
  float angle = atan(vLocalPos.y, vLocalPos.x);

  // 1. Concentric annular gaps carved by forming protoplanets (ALMA HL Tauri style)
  float gap1 = 1.0 - exp(-pow((normR - 0.28) / 0.045, 2.0));
  float gap2 = 1.0 - exp(-pow((normR - 0.55) / 0.055, 2.0));
  float gap3 = 1.0 - exp(-pow((normR - 0.80) / 0.040, 2.0));
  float gapMask = gap1 * gap2 * gap3;

  // 2. Fine concentric resonant dust rings
  float fineRings = 0.85 + 0.15 * sin(normR * 72.0);

  // 3. Spiral density wave perturbation
  float spiral = sin(angle * 2.0 - normR * 16.0 + uTime * 0.5) * 0.15;

  // 4. Smooth inner and outer radial falloff
  float innerFade = smoothstep(0.0, 0.06, normR);
  float outerFade = 1.0 - smoothstep(0.88, 1.0, normR);
  float radialMask = innerFade * outerFade;

  float density = gapMask * fineRings * (1.0 + spiral) * radialMask;

  // 5. Astrophysical temperature gradient:
  // Hot inner sublimation zone -> warm mid dust -> cold outer icy silicates
  vec3 innerColor = vec3(1.3, 0.88, 0.4);
  vec3 midColor   = vec3(0.95, 0.46, 0.12);
  vec3 outerColor = vec3(0.38, 0.18, 0.08);

  vec3 diskColor = mix(innerColor, midColor, smoothstep(0.0, 0.45, normR));
  diskColor = mix(diskColor, outerColor, smoothstep(0.45, 0.95, normR));

  float alpha = clamp(density * 0.85, 0.0, 0.95);
  if (alpha < 0.008) discard;

  gl_FragColor = vec4(diskColor, alpha);
}
