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

  // Day lighting
  float NdotL = max(dot(norm, sunDir), 0.0);

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
        // In the shadow of the rings
        ringShadow = 0.28;
      }
    }
  }

  // Limb darkening of the gas giant
  vec3 viewDir = normalize(cameraPosition - vWorldPosition);
  float limb = pow(max(dot(norm, viewDir), 0.0), 0.4);

  vec3 finalColor = surfaceColor * (NdotL * ringShadow * limb + 0.08);

  gl_FragColor = vec4(finalColor, 1.0);
}
