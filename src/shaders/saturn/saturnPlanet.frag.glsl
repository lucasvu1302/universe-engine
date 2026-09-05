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

  // Ring Shadow calculation: Ray from fragment toward Sun intersecting the ring plane
  float denom = dot(sunDir, uRingNormal);
  float ringShadow = 1.0;

  if (abs(denom) > 0.001) {
    // Distance from fragment to ring plane along Sun ray
    float t = dot(uPlanetCenter - vWorldPosition, uRingNormal) / denom;
    if (t > 0.0) {
      vec3 intersectPoint = vWorldPosition + sunDir * t;
      float r = length(intersectPoint - uPlanetCenter);
      if (r >= uRingInnerRadius && r <= uRingOuterRadius) {
        float normR = (r - uRingInnerRadius) / max(0.001, (uRingOuterRadius - uRingInnerRadius));
        
        // Multi-tier ring shadow density based on Cassini structure
        if (normR >= 0.72 && normR <= 0.77) {
          // Cassini Division allows sunlight to stream through
          ringShadow = 0.88;
        } else if (normR > 0.905 && normR < 0.925) {
          // Encke Gap
          ringShadow = 0.82;
        } else if (normR >= 0.38 && normR < 0.72) {
          // Ring B casts dense dark shadow
          ringShadow = 0.18;
        } else if (normR >= 0.77 && normR <= 0.96) {
          // Ring A casts medium shadow
          ringShadow = 0.35;
        } else if (normR >= 0.15 && normR < 0.38) {
          // Ring C casts soft translucent shadow
          ringShadow = 0.58;
        } else {
          ringShadow = 0.85;
        }
      }
    }
  }

  // Atmospheric limb brightening & darkening
  vec3 viewDir = normalize(cameraPosition - vWorldPosition);
  float limb = pow(max(dot(norm, viewDir), 0.0), 0.38);

  // Subtle golden atmospheric haze
  vec3 atmosphericHaze = vec3(0.9, 0.78, 0.55) * pow(1.0 - max(dot(norm, viewDir), 0.0), 3.0) * 0.35;

  vec3 finalColor = surfaceColor * (dayLighting * ringShadow * limb + 0.06) + atmosphericHaze * dayLighting;

  gl_FragColor = vec4(finalColor, 1.0);
}
