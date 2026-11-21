precision highp float;

uniform sampler2D uSurfaceTexture;
uniform vec3 uSunPosition;
uniform vec3 uRingNormal;
uniform vec3 uPlanetCenter;
uniform float uRingInnerRadius;
uniform float uRingOuterRadius;

varying vec2 vUv;
varying vec3 vWorldPosition;
varying vec3 vNormal;

void main() {
  vec3 norm = normalize(vNormal);
  vec3 sunDir = normalize(uSunPosition - vWorldPosition);

  // Surface texture
  vec3 surfaceColor = texture2D(uSurfaceTexture, vUv).rgb;

  // Day lighting with soft terminator
  float NdotL = max(dot(norm, sunDir), 0.0);
  float dayLighting = smoothstep(0.0, 0.25, NdotL);

  // Derivative-filtered Cassini ring shadow with solar penumbra softening at grazing sun angles
  float denom = dot(sunDir, uRingNormal);
  float ringShadow = 1.0;

  if (abs(denom) > 0.002) {
    float t = dot(uPlanetCenter - vWorldPosition, uRingNormal) / denom;
    if (t > 0.0) {
      vec3 intersectPoint = vWorldPosition + sunDir * t;
      float r = length(intersectPoint - uPlanetCenter);
      float normR = (r - uRingInnerRadius) / max(0.001, (uRingOuterRadius - uRingInnerRadius));
      float fw = clamp(fwidth(normR) * 1.65, 0.005, 0.24);

      if (normR > -fw && normR < 1.0 + fw) {
        float cRing = smoothstep(0.14 - fw, 0.2 + fw, normR) * (1.0 - smoothstep(0.38 - fw, 0.38 + fw, normR));
        float bRing = smoothstep(0.38 - fw, 0.38 + fw, normR) * (1.0 - smoothstep(0.715 - fw, 0.725 + fw, normR));
        float aRing = smoothstep(0.768 - fw, 0.778 + fw, normR) * (1.0 - smoothstep(0.955 - fw, 0.965 + fw, normR));
        float enckeGap = smoothstep(0.902 - fw, 0.908 + fw, normR) * (1.0 - smoothstep(0.922 - fw, 0.928 + fw, normR));
        float outerEnvelope = smoothstep(0.0, 0.05 + fw, normR) * (1.0 - smoothstep(0.95 - fw, 1.0 + fw, normR));

        float opticalBlock = (cRing * 0.40 + bRing * 0.78 + aRing * 0.62 * (1.0 - enckeGap * 0.72)) * outerEnvelope;
        float rawShadow = 1.0 - clamp(opticalBlock, 0.0, 0.80);

        // Grazing solar-elevation penumbra softening (eliminates sub-pixel equatorial staircase seam)
        float grazingSoft = smoothstep(0.03, 0.18, abs(denom));
        ringShadow = mix(1.0, rawShadow, grazingSoft);
      }
    }
  }

  // Atmospheric limb brightening & darkening
  vec3 viewDir = normalize(cameraPosition - vWorldPosition);
  float nDotV = max(dot(norm, viewDir), 0.0);
  float limb = pow(nDotV, 0.36);

  // Authentic Cassini Kronian "ring-shine": sunlight scattered off icy B/A rings illuminating Saturn's night hemisphere
  float latFromRing = abs(dot(norm, normalize(uRingNormal)));
  float ringViewZone = smoothstep(0.04, 0.55, latFromRing) * (1.0 - smoothstep(0.55, 0.98, latFromRing));
  float nightMask = 1.0 - smoothstep(-0.15, 0.28, dot(norm, sunDir));
  float ringShine = (0.065 + 0.14 * ringViewZone) * nightMask;

  // Golden-blue Rayleigh atmospheric limb haze
  float fresnelRim = pow(1.0 - nDotV, 3.2);
  vec3 atmosphericHaze = mix(vec3(0.42, 0.58, 0.85), vec3(0.95, 0.82, 0.58), dayLighting) * fresnelRim * (0.14 + 0.26 * dayLighting);

  vec3 finalColor = surfaceColor * (dayLighting * ringShadow * limb + ringShine + 0.035) + atmosphericHaze;

  gl_FragColor = vec4(finalColor, 1.0);
}
