precision highp float;

uniform float uTime;
uniform vec3 uDepthColor;
uniform vec3 uSurfaceColor;
uniform vec3 uLightDir;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorldPosition;
varying float vElevation;
varying float vSlope;

float hashOcean(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noiseOcean(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hashOcean(i);
  float b = hashOcean(i + vec2(1.0, 0.0));
  float c = hashOcean(i + vec2(0.0, 1.0));
  float d = hashOcean(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbmOcean(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noiseOcean(p);
    p = p * 2.04 + vec2(7.3, -11.9);
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 worldXZ = vWorldPosition.xz;

  // Fine wind-driven capillary wave normal perturbation
  float r1 = fbmOcean(worldXZ * 0.28 + vec2(uTime * 0.65, -uTime * 0.42));
  float r2 = fbmOcean(worldXZ * 0.72 - vec2(uTime * 0.9, uTime * 0.55));
  vec3 ripplePerturb = vec3((r1 - 0.5) * 0.2, 0.0, (r2 - 0.5) * 0.2);

  vec3 norm = normalize(vNormal + ripplePerturb);
  vec3 viewDir = normalize(cameraPosition - vWorldPosition);
  vec3 lightDir = normalize(uLightDir);

  // Schlick Fresnel dielectric water reflectance
  float nDotV = max(dot(norm, viewDir), 0.0);
  float fresnel = 0.02 + 0.98 * pow(1.0 - nDotV, 5.0);

  // Deep abyssal slate-navy -> backlit emerald-teal subsurface scattering through towering crest
  float heightFactor = clamp((vElevation + 3.0) / 25.0, 0.0, 1.0);
  vec3 deepBody = mix(uDepthColor, uSurfaceColor, heightFactor * 0.68);

  float backLight = pow(clamp(dot(viewDir, -lightDir) * 0.5 + 0.5, 0.0, 1.0), 3.0);
  vec3 sssTeal = vec3(0.11, 0.52, 0.56) * heightFactor * (0.45 + 0.55 * backLight);
  vec3 refractedWater = deepBody + sssTeal;

  // Reflected misty exoplanet sky + warm Gargantua horizon glow
  vec3 reflDir = reflect(-viewDir, norm);
  float skyGrad = clamp(reflDir.y * 0.5 + 0.5, 0.0, 1.0);
  vec3 skyRefl = mix(vec3(0.46, 0.36, 0.28), vec3(0.08, 0.15, 0.24), smoothstep(0.32, 0.85, skyGrad));

  // Blazing Gargantua accretion-disk specular sun-path across rippled ocean
  vec3 halfVec = normalize(lightDir + viewDir);
  float specTight = pow(max(dot(norm, halfVec), 0.0), 180.0);
  float specBroad = pow(max(dot(norm, halfVec), 0.0), 22.0);
  vec3 gargantuaGlint = vec3(1.55, 1.12, 0.58) * specTight * 2.1 + vec3(0.92, 0.58, 0.28) * specBroad * 0.45;

  vec3 color = mix(refractedWater, skyRefl, clamp(fresnel * 0.88, 0.0, 0.92)) + gargantuaGlint;

  // Wind-sheared whitecap spray & aerated foam veins on steep megawave face and peak
  float foamNoise = fbmOcean(worldXZ * 0.16 + vec2(0.0, uTime * 1.1));
  float fineSpray = fbmOcean(worldXZ * 0.48 + vec2(uTime * 0.8, -uTime * 1.4));
  float crestFoam = smoothstep(13.5, 22.8, vElevation + foamNoise * 4.5 + fineSpray * 2.2);
  float slopeStreaks = smoothstep(0.20, 0.56, vSlope) * smoothstep(0.40, 0.72, foamNoise) * 0.82;
  float totalFoam = clamp(crestFoam * 0.95 + slopeStreaks, 0.0, 1.0);

  vec3 foamColor = vec3(0.93, 0.95, 0.98) * (0.76 + 0.24 * max(dot(norm, lightDir), 0.2));
  color = mix(color, foamColor, totalFoam * 0.88);

  // Atmospheric distance mist blend toward horizon (preserving crisp whitewater spray at crest peak)
  float dist = length(cameraPosition - vWorldPosition);
  float mist = (1.0 - exp(-pow(dist * 0.0029, 2.0))) * (1.0 - crestFoam * 0.42);
  vec3 horizonMist = vec3(0.22, 0.27, 0.34);
  color = mix(color, horizonMist, clamp(mist, 0.0, 0.90));

  gl_FragColor = vec4(color, 1.0);
}
