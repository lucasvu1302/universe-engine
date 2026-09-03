precision highp float;

uniform sampler2D uRingTexture;
uniform vec3 uSunPosition;
uniform vec3 uPlanetCenter;
uniform float uPlanetRadius;

varying vec2 vUv;
varying vec3 vWorldPosition;
varying vec3 vNormal;

void main() {
  // Sample procedural or NASA radial ring texture
  vec4 ringColor = texture2D(uRingTexture, vUv);
  if (ringColor.a < 0.05) {
    discard;
  }

  vec3 sunDir = normalize(uSunPosition - vWorldPosition);
  vec3 viewDir = normalize(cameraPosition - vWorldPosition);

  // Optical forward scattering: icy particles forward-scatter sunlight
  float cosTheta = dot(-viewDir, sunDir);
  float forwardScatter = 1.0 + pow(max(cosTheta, 0.0), 3.0) * 0.8;

  // Planetary Shadow Projection (Ray-Sphere intersection test)
  vec3 oc = uPlanetCenter - vWorldPosition;
  float tproj = dot(oc, sunDir);
  float shadow = 1.0;

  if (tproj > 0.0) {
    float distSq = dot(oc, oc) - (tproj * tproj);
    float radiusSq = uPlanetRadius * uPlanetRadius;
    if (distSq < radiusSq * 1.08) {
      // Soft penumbra shadow edge
      shadow = smoothstep(radiusSq * 0.92, radiusSq * 1.05, distSq);
    }
  }

  // Double-sided lighting
  float lightFactor = abs(dot(vNormal, sunDir)) * 0.6 + 0.4;
  vec3 finalColor = ringColor.rgb * lightFactor * forwardScatter * (shadow * 0.9 + 0.1);

  gl_FragColor = vec4(finalColor, ringColor.a);
}
