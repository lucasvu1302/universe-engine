precision highp float;

uniform float uTime;
uniform vec3 uColorCore;
uniform vec3 uColorFlame;
uniform float uThroatRadius;
uniform float uLength;
uniform float uExpansion;

varying vec2 vUv;
varying vec3 vLocalPos;
varying vec3 vNormal;
varying vec3 vWorldPosition;

float hashPlume(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noisePlume(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hashPlume(i);
  float b = hashPlume(i + vec2(1.0, 0.0));
  float c = hashPlume(i + vec2(0.0, 1.0));
  float d = hashPlume(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbmPlume(vec2 p) {
  float v = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 4; i++) {
    v += amp * noisePlume(p);
    p = p * 2.03 + vec2(13.7, -9.2);
    amp *= 0.5;
  }
  return v;
}

void main() {
  float shellScale = vLocalPos.x;
  float y = -vLocalPos.y;
  float azim = vLocalPos.z;

  if (y < 0.0 || y > uLength) {
    discard;
  }

  float normY = clamp(y / max(uLength, 0.1), 0.0, 1.0);
  float isCore = 1.0 - smoothstep(0.6, 0.85, shellScale);

  // View-angle Fresnel silhouette feathering (erases hard cylinder geometry walls!)
  vec3 norm = normalize(vNormal);
  vec3 viewDir = normalize(cameraPosition - vWorldPosition);
  float ndv = abs(dot(norm, viewDir));
  float normR = sqrt(max(0.0, 1.0 - ndv * ndv));
  float edgeFresnel = smoothstep(0.0, 0.36, ndv) * pow(ndv, 1.25);

  // Supersonic shear-layer turbulence
  float shear = fbmPlume(vec2(azim * 2.5, y * 0.52 - uTime * 28.0));
  float fineTurb = fbmPlume(vec2(azim * 5.2 + 3.1, y * 1.35 - uTime * 46.0));

  // Standing supersonic Mach shock diamonds inside the core column
  float vacuumFactor = clamp((uExpansion - 2.1) / 3.2, 0.0, 1.0);
  float diamondSpacing = mix(1.65, 0.92, vacuumFactor);
  float shockWave = pow(max(0.0, cos((y * diamondSpacing - 0.32) * 3.14159265)), 5.0);
  float machDiamond = isCore * shockWave * exp(-normR * normR * 3.8) * exp(-normY * 2.4) * (1.0 - vacuumFactor * 0.58);

  // Core incandescent column + outer turbulent kerosene/LOX afterburn plume
  float throatFlash = exp(-normY * 9.5) * 0.9;
  float innerCore = isCore * exp(-normR * normR * 2.1) * pow(1.0 - normY, 1.05);
  float outerMixing = (1.0 - isCore) * exp(-normR * normR * 1.35) * (0.62 + 0.62 * fineTurb) * pow(1.0 - normY, 1.28);

  float axialEntry = smoothstep(0.0, 0.02, normY);
  float flicker = 0.92 + 0.08 * sin(y * 8.2 - uTime * 38.0 + shear * 4.0);
  float plumeEnergy = (innerCore * 0.92 + outerMixing * 0.74 + machDiamond * 1.45 + throatFlash * 0.55) * axialEntry * flicker;

  // Cinema color temperature gradient: white-gold supersonic throat -> kerosene orange -> violet vacuum expansion
  vec3 afterburnRim = mix(uColorFlame * vec3(1.0, 0.48, 0.16), vec3(0.48, 0.58, 1.0), vacuumFactor * 0.68);
  vec3 color = mix(afterburnRim, uColorFlame, clamp(outerMixing * 1.35 + shear * 0.25, 0.0, 1.0));
  color = mix(color, uColorCore, clamp(innerCore * 1.15 + throatFlash * 0.75, 0.0, 1.0));
  color += vec3(1.25, 1.18, 1.05) * machDiamond * 0.85;

  float alpha = clamp(plumeEnergy * edgeFresnel, 0.0, 0.88);
  if (alpha < 0.005) {
    discard;
  }

  gl_FragColor = vec4(color, alpha);
}
