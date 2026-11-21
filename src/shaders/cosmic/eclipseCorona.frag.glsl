precision highp float;

uniform float uTime;
uniform float uCoronaIntensity;
uniform float uDiamondRing;
uniform float uDiamondSide;

varying vec2 vUv;

void main() {
  vec2 p = (vUv - 0.5) * 2.0;
  float r = length(p);
  float angle = r > 1e-5 ? atan(p.y, p.x) : 0.0;

  // Aligned accurately to the Moon occulter's projected radius (r_moon / halfPlane = 3.06 / 12.0 = 0.255)
  float limb = 0.254;
  float radialDist = max(0.0, r - limb);

  // Authentic NASA/ESO Total Solar Eclipse K-corona: long sweeping asymmetric equatorial helmet streamers
  // stretching 3.8x lunar radii + delicate curving polar magnetic brush plumes + zero white donut blowout!
  float tiltAngle = angle - 0.16;
  float cosT = cos(tiltAngle);
  float sinT = sin(tiltAngle);
  float eqWing = abs(cosT);
  float polarAxis = abs(sinT);

  // Two primary asymmetric helmet streamers (east slightly broader, west slightly longer & forked)
  float westFork = exp(-pow(max(0.0001, abs(sin(tiltAngle + 0.14))), 1.5) * 6.5) * smoothstep(-0.2, 0.6, -cosT);
  float eastWing = exp(-pow(max(0.0001, abs(sin(tiltAngle - 0.06))), 1.6) * 5.2) * smoothstep(-0.2, 0.6, cosT);
  float helmetEnv = max(westFork * 1.08, eastWing * 0.96);

  // Gossamer radial magnetic corona fibers fanning smoothly outward
  float fiber1 = 0.68 + 0.32 * sin(angle * 17.0 + radialDist * 2.2 - uTime * 0.08);
  float fiber2 = 0.78 + 0.22 * sin(angle * 31.0 - radialDist * 3.1 + 1.1);
  float fiber3 = 0.82 + 0.18 * cos(angle * 11.0 + 0.6);
  float fineThreads = fiber1 * fiber2 * fiber3;

  // Delicate diverging polar magnetic plumes (curved north/south brush fibers)
  float polarMask = polarAxis * polarAxis * polarAxis;
  float polarAngleBend = angle + sign(sinT) * radialDist * 0.45 * cosT;
  float polarPlumes =
    polarMask *
    (0.45 + 0.55 * clamp(sin(polarAngleBend * 26.0) * 0.5 + 0.5, 0.0, 1.0)) *
    exp(-radialDist * 5.8) *
    0.42;

  // Balanced dynamic range: crisp inner pearlescent rim (stays below bloom blowout) + sweeping long wings
  float innerPearl = exp(-radialDist * 21.0) * 0.62;
  float midCorona = exp(-radialDist * (6.2 - 2.4 * eqWing)) * (0.26 + 0.36 * eqWing * eqWing) * fineThreads * 0.62;
  float longStreamers = exp(-radialDist * (2.9 - 1.55 * helmetEnv)) * helmetEnv * fineThreads * 0.72;

  float limbMask = smoothstep(limb - 0.005, limb + 0.009, r);
  float corona = (innerPearl + midCorona + longStreamers + polarPlumes) * limbMask;

  // Vivid ruby-crimson H-alpha chromosphere rim & 3 unmistakable eruptive solar prominence loops
  float dChromo = (r - (limb + 0.008)) / 0.011;
  float chromoArc =
    exp(-(dChromo * dChromo)) *
    (0.22 + 0.78 * smoothstep(0.1, 0.95, sin(angle * 2.0 + 1.2) * 0.5 + 0.5)) *
    limbMask;

  // 3 localized magnetic prominence arches peeking clearly out of the dark lunar limb
  float da1 = abs(atan(sin(angle - 2.15), cos(angle - 2.15)));
  float da2 = abs(atan(sin(angle + 0.65), cos(angle + 0.65)));
  float da3 = abs(atan(sin(angle + 2.42), cos(angle + 2.42)));
  float p1 = exp(-(da1 * da1) / 0.0055);
  float p2 = exp(-(da2 * da2) / 0.0085);
  float p3 = exp(-(da3 * da3) / 0.0042);

  float dProm1 = (r - (limb + 0.018)) / 0.016;
  float dProm2 = (r - (limb + 0.024)) / 0.020;
  float promMask =
    clamp((exp(-(dProm1 * dProm1)) * (p1 * 1.15 + p3 * 0.95) + exp(-(dProm2 * dProm2)) * p2 * 1.2) * limbMask, 0.0, 1.0);

  vec3 pearlWhite = vec3(0.95, 0.97, 1.0);
  vec3 silverBlue = vec3(0.58, 0.75, 0.98);
  vec3 outerCobalt = vec3(0.24, 0.40, 0.72);
  vec3 hAlphaRuby = vec3(1.0, 0.10, 0.30);
  vec3 promPink = vec3(1.0, 0.22, 0.42);

  vec3 coronaCol = mix(pearlWhite, silverBlue, smoothstep(limb, 0.46, r));
  coronaCol = mix(coronaCol, outerCobalt, smoothstep(0.46, 0.92, r));

  vec3 col = coronaCol * corona * uCoronaIntensity;
  // Blend ruby chromosphere & prominences directly so Bloom never washes them out to plain white!
  col = mix(col, hAlphaRuby * 0.92, clamp(chromoArc * uCoronaIntensity * 0.68, 0.0, 0.78));
  col = mix(col, promPink * 1.05, clamp(promMask * uCoronaIntensity * 0.92, 0.0, 0.94));

  // Diamond Ring & 6-point optical diffraction flare at 2nd / 3rd contact
  vec2 dPos = vec2(uDiamondSide * (limb + 0.004), 0.015);
  vec2 dp = p - dPos;
  float dDist = length(dp);
  float dCore = exp(-dDist * 24.0) * 1.35 + exp(-dDist * 7.0) * 0.45;
  float dAngle = dDist > 1e-5 ? atan(dp.y, dp.x) : 0.0;
  float spikes = pow(clamp(abs(cos(dAngle * 3.0)), 0.0, 1.0), 18.0) * exp(-dDist * 4.6) * 0.68;
  col += vec3(1.0, 0.96, 0.88) * (dCore + spikes) * uDiamondRing;

  float edgeFade = 1.0 - smoothstep(0.84, 0.995, r);
  float alpha = clamp(
    (corona * uCoronaIntensity * 0.96 + (chromoArc * 0.5 + promMask * 0.95) * uCoronaIntensity + (dCore + spikes) * uDiamondRing) * edgeFade,
    0.0,
    0.98
  );

  if (alpha < 0.004) discard;
  gl_FragColor = vec4(col * edgeFade, alpha);
}
