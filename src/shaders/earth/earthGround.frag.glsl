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

float fbm2(vec3 p) {
  float v = 0.62 * noise3(p);
  p = p * 2.13 + vec3(7.1, 13.7, 5.3);
  v += 0.38 * noise3(p);
  return v;
}

void main() {
  vec3 norm = normalize(vNormal);
  vec3 sunDir = normalize(vSunDirection);
  vec3 viewDir = normalize(cameraPosition - vWorldPosition);

  // Seamless 3D LEO micro-detail blend (zero GPU noise cost outside 7.5 units, e.g. LaunchScene & Solar Overview!)
  float camDist = length(cameraPosition - vWorldPosition);
  float leoDetail = 1.0 - smoothstep(1.4, 7.5, camDist);

  float warpA = 0.5;
  float fineRelief = 0.5;
  vec2 microWarp = vec2(0.0);
  if (leoDetail > 0.01) {
    warpA = fbm2(vObjPos * 26.0);
    fineRelief = fbm2(vObjPos * 88.0 + vec3(19.3, 7.7, 31.1));
    microWarp = (vec2(warpA, fineRelief) - 0.5) * (0.0044 * leoDetail);
  }
  vec2 detailUv = vec2(fract(vUv.x + microWarp.x), clamp(vUv.y + microWarp.y, 0.001, 0.999));

  // Surface light factor (-1.0 to 1.0)
  float NdotL = dot(norm, sunDir);
  float dayFactor = smoothstep(-0.08, 0.12, NdotL);

  // Sample satellite maps with fractal coastline sharpening at close LEO range
  vec3 dayColor = texture2D(uDayMap, detailUv).rgb;
  vec3 nightColor = texture2D(uNightMap, detailUv).rgb;
  float rawSpec = texture2D(uSpecularMap, detailUv).r;
  float specularMask = mix(
    rawSpec,
    smoothstep(0.35, 0.65, rawSpec + (fineRelief - 0.5) * 0.24),
    leoDetail
  );
  float landMask = 1.0 - specularMask;

  // Enrich close-up land topography & bathymetric sapphire oceans (lift dark sunlit land subtly for crisp LEO continents)
  float terrainMod = 1.0 + ((fineRelief - 0.5) * 0.24 + (warpA - 0.5) * 0.12) * leoDetail * landMask;
  float oceanDepthMod = 0.95 + (warpA - 0.5) * 0.14 * leoDetail;
  vec3 landTint = (dayColor * 1.14 + vec3(0.022, 0.030, 0.024) * landMask) * terrainMod;
  vec3 oceanTint = max(dayColor * 1.12, vec3(0.04, 0.24, 0.58)) * oceanDepthMod;
  dayColor = mix(landTint, oceanTint, specularMask * 0.72);

  // Organic FBM-sculpted cloud shadows cast onto oceans and continents (softened so continents stay crisp)
  vec2 shadowOffset = -sunDir.xy * 0.0035 + microWarp * 1.35;
  float rawCloudShadow = texture2D(uCloudsMap, vec2(fract(vUv.x + shadowOffset.x), clamp(vUv.y + shadowOffset.y, 0.001, 0.999))).r;
  float cloudFbm = mix(1.0, smoothstep(0.16, 0.84, rawCloudShadow * (0.76 + 0.48 * fineRelief)), leoDetail);
  float cloudShadow = mix(rawCloudShadow, cloudFbm, leoDetail);
  dayColor *= (1.0 - cloudShadow * 0.28);

  // Perturb normal subtly at close LEO range for continental relief & ocean capillary sheen
  vec3 detailNorm = normalize(
    norm + (vec3(fineRelief - 0.5, warpA - 0.5, fineRelief - warpA) * (0.14 * landMask + 0.045 * specularMask) * leoDetail)
  );
  float detailNdotL = mix(max(NdotL, 0.0), max(dot(detailNorm, sunDir), 0.0), leoDetail * 0.65);

  // Broad atmospheric ocean sun-sheen
  vec3 halfVector = normalize(sunDir + viewDir);
  float NdotH = max(dot(detailNorm, halfVector), 0.0);
  float specular = pow(NdotH, 20.0) * specularMask * 0.52 * (1.0 - cloudShadow * 0.85);
  vec3 specularColor = vec3(0.95, 0.93, 0.88) * specular * max(NdotL, 0.0);

  // Nocturnal city lights (only glow on the night side)
  vec3 cityLights = nightColor * (1.0 - dayFactor) * 2.5;

  // Starlight ambient fill for dark side
  vec3 ambient = dayColor * 0.02;

  // Natural sunlit surface
  vec3 sunlitGround = dayColor * detailNdotL;

  // Final composite: day side + ocean glint + night side city lights
  vec3 finalColor = mix(cityLights + ambient, sunlitGround + specularColor, dayFactor);

  gl_FragColor = vec4(finalColor, 1.0);
}
