precision highp float;

uniform sampler2D uDayMap;
uniform sampler2D uNightMap;
uniform sampler2D uSpecularMap;
uniform sampler2D uCloudsMap;

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
  float v = 0.54 * noise3(p);
  p = p * 2.07 + vec3(13.1, 7.3, 19.7);
  v += 0.30 * noise3(p);
  p = p * 2.13 + vec3(5.9, 17.1, 11.3);
  v += 0.16 * noise3(p);
  return v;
}

void main() {
  vec3 norm = normalize(vNormal);
  vec3 sunDir = normalize(vSunDirection);
  vec3 viewDir = normalize(cameraPosition - vWorldPosition);
  vec3 spherePos = normalize(vObjPos);

  // High-frequency 3D spherical geography so the R=2600 launch globe stays razor-sharp across the entire 1920px viewport
  float macroWarp = fbm3(spherePos * 18.0);
  vec3 warpedPos = spherePos + vec3(macroWarp - 0.5) * 0.036;
  float continentNoise = fbm3(warpedPos * 34.0 + vec3(4.2, -1.7, 8.9));
  float ridgeDetail = fbm3(warpedPos * 155.0 + vec3(17.4, 9.2, 23.1));
  float microGrain = noise3(spherePos * 520.0 + vec3(3.1, 11.7, 7.5));

  // Blend satellite textures with crisp fractal coastlines & archipelagos (eliminates 68-texel blurry sphere stretch!)
  vec2 detailUv = vec2(
    fract(vUv.x + (macroWarp - 0.5) * 0.008),
    clamp(vUv.y + (ridgeDetail - 0.5) * 0.006, 0.001, 0.999)
  );
  vec3 satDay = texture2D(uDayMap, detailUv).rgb;
  vec3 satNight = texture2D(uNightMap, detailUv).rgb;
  float satOcean = texture2D(uSpecularMap, detailUv).r;

  // Combine satellite ocean mask with sharp fractal coastal elevation (Florida / Bahamas / Atlantic bathymetry)
  float elevation = (1.0 - satOcean) * 0.55 + (continentNoise - 0.44) * 0.92 + (ridgeDetail - 0.5) * 0.24;
  float landMask = smoothstep(0.06, 0.13, elevation);
  float oceanMask = 1.0 - landMask;
  float coastalShelf = smoothstep(-0.14, 0.07, elevation) * oceanMask;

  // Realistic orbital Atlantic bathymetry: deep sapphire abyss -> luminous Bahamian turquoise coastal shelves
  vec3 deepOcean = vec3(0.014, 0.078, 0.215) * (0.86 + 0.28 * macroWarp);
  vec3 midOcean = vec3(0.022, 0.165, 0.365);
  vec3 turquoiseShelf = vec3(0.065, 0.445, 0.595) * (0.85 + 0.30 * ridgeDetail);
  vec3 oceanCol = mix(deepOcean, midOcean, smoothstep(-0.35, -0.04, elevation));
  oceanCol = mix(oceanCol, turquoiseShelf, pow(coastalShelf, 1.35) * 0.78);

  // Realistic orbital continental biomes: coastal sand -> lush green plains -> warm ochre highlands -> pale alpine ridges
  float biomeTemp = fbm3(spherePos * 19.0 + vec3(29.1, -6.4, 12.7));
  vec3 lushForest = vec3(0.085, 0.225, 0.115);
  vec3 savannaPlains = vec3(0.245, 0.275, 0.155);
  vec3 aridPlateau = vec3(0.425, 0.345, 0.235);
  vec3 mountainPeak = vec3(0.545, 0.515, 0.475);

  vec3 landCol = mix(lushForest, savannaPlains, smoothstep(0.32, 0.62, biomeTemp));
  landCol = mix(landCol, aridPlateau, smoothstep(0.56, 0.80, biomeTemp));
  landCol = mix(landCol, mountainPeak, smoothstep(0.34, 0.62, elevation + (ridgeDetail - 0.5) * 0.25));
  landCol = mix(landCol, satDay * 1.15, 0.24) * (0.84 + 0.32 * ridgeDetail + (microGrain - 0.5) * 0.10);

  vec3 surfaceAlbedo = mix(oceanCol, landCol, landMask);

  // Synchronized orbital cloud shadows cast directly onto oceans & continents for crisp altitude parallax
  vec3 shadowSamplePos = normalize(spherePos - sunDir * 0.0045);
  float cloudMacro = fbm3(shadowSamplePos * 20.0 + vec3(8.5, 2.1, -4.7));
  float cloudCell = fbm3(shadowSamplePos * 72.0 + vec3(19.2, -11.4, 6.8));
  float satCloud = texture2D(uCloudsMap, vec2(fract(vUv.x - 0.003), clamp(vUv.y - 0.002, 0.001, 0.999))).r;
  float cloudShadow = smoothstep(0.46, 0.78, cloudMacro * 0.68 + cloudCell * 0.32 + satCloud * 0.22);
  surfaceAlbedo *= (1.0 - cloudShadow * 0.34);

  // Perturb normal subtly for continental relief & ocean capillary sheen
  vec3 reliefVec = vec3(ridgeDetail - 0.5, microGrain - 0.5, macroWarp - 0.5);
  vec3 detailNorm = normalize(norm + reliefVec * (0.16 * landMask + 0.025 * oceanMask));

  float NdotL = dot(norm, sunDir);
  float dayFactor = smoothstep(-0.10, 0.14, NdotL);
  float litDiff = max(dot(detailNorm, sunDir), 0.0);

  // Broad atmospheric solar ocean sun-glint
  vec3 halfVec = normalize(sunDir + viewDir);
  float NdotH = max(dot(detailNorm, halfVec), 0.0);
  float oceanGlint = pow(NdotH, 28.0) * oceanMask * 0.42 * (1.0 - cloudShadow * 0.82) * max(NdotL, 0.0);
  vec3 glintColor = vec3(0.95, 0.94, 0.89) * oceanGlint;

  // Nocturnal golden city clusters on nightside
  float cityNoise = smoothstep(0.68, 0.86, ridgeDetail) * landMask;
  vec3 cityLights = (satNight * 2.1 + vec3(1.0, 0.72, 0.36) * cityNoise * 0.35) * (1.0 - dayFactor);

  vec3 dayLit = surfaceAlbedo * (0.12 + 0.96 * litDiff) + glintColor;
  vec3 baseColor = mix(cityLights + surfaceAlbedo * 0.02, dayLit, dayFactor);

  // Physically grounded Rayleigh aerial-perspective horizon scattering (clamped viewDot avoids Metal/ANGLE pow(-eps) NaN!)
  float viewDot = clamp(dot(norm, viewDir), 0.0, 1.0);
  float limbHaze = pow(1.0 - viewDot, 2.7);
  float crispRim = pow(1.0 - viewDot, 6.2);
  float terminatorWarmth = (1.0 - smoothstep(0.0, 0.32, abs(NdotL))) * smoothstep(-0.22, 0.12, NdotL);

  vec3 rayleighBlue = mix(vec3(0.18, 0.46, 0.86), vec3(0.46, 0.76, 1.0), crispRim);
  vec3 horizonTint = rayleighBlue * (0.14 + 0.86 * dayFactor) + vec3(0.92, 0.48, 0.22) * terminatorWarmth * 0.35;

  vec3 finalColor = mix(baseColor, horizonTint, clamp(limbHaze * 0.82, 0.0, 0.88));
  finalColor += vec3(0.32, 0.64, 0.98) * crispRim * dayFactor * 0.22;

  gl_FragColor = vec4(finalColor, 1.0);
}
