precision highp float;

uniform sampler2D uMarsMap;
uniform float uTime;
uniform float uOceanLevel;
uniform float uVegLevel;
uniform float uCloudLevel;
uniform float uIceCapScale;
uniform float uAtmosBlue;
uniform float uColonyLights;

varying vec2 vUv;
varying vec3 vWorldNormal;
varying vec3 vWorldView;
varying vec3 vLocalPos;

float hash3(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float noise3(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash3(i + vec3(0,0,0)), hash3(i + vec3(1,0,0)), f.x),
        mix(hash3(i + vec3(0,1,0)), hash3(i + vec3(1,1,0)), f.x), f.y),
    mix(mix(hash3(i + vec3(0,0,1)), hash3(i + vec3(1,0,1)), f.x),
        mix(hash3(i + vec3(0,1,1)), hash3(i + vec3(1,1,1)), f.x), f.y),
    f.z
  );
}

float fbm3(vec3 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise3(p);
    p = p * 2.04 + vec3(1.13, -0.77, 0.61);
    a *= 0.5;
  }
  return v;
}

void main() {
  vec3 n = normalize(vWorldNormal);
  vec3 v = normalize(vWorldView);
  vec3 sp = normalize(vLocalPos);
  vec3 sunDir = normalize(vec3(0.76, 0.32, 0.56));

  float ndotl = max(0.0, dot(n, sunDir));
  float wrapLight = clamp(dot(n, sunDir) * 0.65 + 0.35, 0.0, 1.0);
  float ndotv = clamp(abs(dot(n, v)), 0.0, 1.0);

  vec3 marsBase = texture2D(uMarsMap, vUv).rgb;
  float lat = abs(sp.y);

  // Seamless 3D object-space Mars topographic heightfield (zero UV seam or polar pinch)
  float northBias = smoothstep(-0.22, 0.52, sp.y);
  float fbmRelief = fbm3(sp * 3.8);
  float fineRelief = fbm3(sp * 9.5);
  float elevation = clamp(0.60 - northBias * 0.35 + (fbmRelief - 0.5) * 0.44 + (fineRelief - 0.5) * 0.14, 0.0, 1.0);

  // 1. Liquid Northern Ocean + Valles Marineris flooded basin with world-space specular glint
  float seaThreshold = uOceanLevel * 0.54;
  float waterMask = 1.0 - smoothstep(seaThreshold - 0.025, seaThreshold + 0.02, elevation);
  float shallowWater = smoothstep(seaThreshold - 0.12, seaThreshold, elevation) * waterMask;

  vec3 deepOcean = vec3(0.03, 0.16, 0.38);
  vec3 coastalTeal = vec3(0.08, 0.44, 0.56);
  vec3 oceanCol = mix(deepOcean, coastalTeal, shallowWater);

  vec3 halfVec = normalize(sunDir + v);
  float spec = pow(max(0.0001, dot(n, halfVec)), 52.0) * waterMask * ndotl;
  float fresnel = pow(max(0.0001, 1.0 - ndotv), 3.4);
  oceanCol += vec3(0.88, 0.95, 1.0) * spec * 1.05 + vec3(0.24, 0.58, 0.92) * fresnel * 0.38 * waterMask;

  // 2. Coastal Boreal Vegetation & Moss spreading on damp temperate lowlands above sea level
  float coastProx = (1.0 - smoothstep(seaThreshold + 0.01, seaThreshold + 0.28, elevation)) * (1.0 - waterMask);
  float tempBand = 1.0 - smoothstep(0.52, 0.82, lat);
  float vegMask = clamp(coastProx * tempBand * uVegLevel * (0.55 + 0.65 * fineRelief), 0.0, 0.92);

  vec3 mossGreen = vec3(0.16, 0.39, 0.15);
  vec3 forestGreen = vec3(0.09, 0.28, 0.12);
  vec3 landCol = mix(marsBase * vec3(1.06, 0.96, 0.88), mix(mossGreen, forestGreen, fineRelief), vegMask);

  // 3. Polar CO2 / Water Ice Caps shrinking dynamically with orbital mirrors
  float iceEdge = 0.72 + (1.0 - uIceCapScale) * 0.22 + (fbmRelief - 0.5) * 0.08;
  float iceMask = smoothstep(iceEdge, iceEdge + 0.06, lat);
  vec3 surfaceCol = mix(landCol, oceanCol, waterMask);
  surfaceCol = mix(surfaceCol, vec3(0.92, 0.96, 1.0), iceMask * 0.92);

  // 4. Seamless 3D Drifting Wispy Terraformed Cloud Bands (zero polar pinching)
  float cAng = uTime * 0.025;
  float cs = cos(cAng);
  float sn = sin(cAng);
  vec3 cloudCoord = vec3(sp.x * cs - sp.z * sn, sp.y, sp.x * sn + sp.z * cs);
  float swirl = fbm3(cloudCoord * vec3(4.2, 6.2, 4.2));
  float fineWisp = fbm3(cloudCoord * 10.5 + vec3(swirl * 1.35, -swirl * 0.6, swirl * 0.9));
  float cloudNoise = swirl * 0.58 + fineWisp * 0.42;
  float cloudMask = smoothstep(0.58 - uCloudLevel * 0.15, 0.80 - uCloudLevel * 0.08, cloudNoise) * uCloudLevel;

  vec3 litSurface = surfaceCol * (0.09 + 1.08 * ndotl);
  vec3 litCloud = vec3(0.96, 0.98, 1.0) * (0.1 + 1.0 * wrapLight);
  vec3 col = mix(litSurface, litCloud, clamp(cloudMask * 0.54, 0.0, 0.56));

  // 5. Night-side Terraformed Colony Lights along habitable coastlines (3D noise)
  float nightSide = 1.0 - smoothstep(-0.15, 0.18, dot(n, sunDir));
  float cityNoise = smoothstep(0.73, 0.87, fbm3(sp * 24.0));
  col += vec3(1.0, 0.78, 0.36) * cityNoise * nightSide * coastProx * uColonyLights * 1.15;

  // 6. Vivid Atmospheric Rayleigh Rim transitioning from dusty Mars salmon -> Earth sapphire
  vec3 dustRim = vec3(0.84, 0.46, 0.24);
  vec3 blueRim = vec3(0.24, 0.66, 1.0);
  vec3 atmosCol = mix(dustRim, blueRim, uAtmosBlue);
  col += atmosCol * pow(max(0.0001, 1.0 - ndotv), 2.8) * (0.34 + 0.66 * ndotl) * (0.52 + 0.68 * uAtmosBlue);

  gl_FragColor = vec4(col, 1.0);
}
