precision highp float;

uniform sampler2D uRingTexture;
uniform vec3 uSunPosition;
uniform vec3 uPlanetCenter;
uniform float uPlanetRadius;

varying vec2 vUv;
varying vec3 vWorldPosition;
varying vec3 vNormal;
varying float vRadius;
varying float vRadiusRatio;

void main() {
  float r = vRadiusRatio;

  // Outer and inner safety boundaries
  if (r <= 0.0 || r >= 1.0) {
    discard;
  }

  // 1. Analytical Photorealistic Saturn Ring Structure
  // Realistic ring division optical densities based on Cassini-Huygens data:
  // Ring D: 0.00 - 0.15 (faint inner dust ring)
  // Ring C: 0.15 - 0.38 (translucent Crepe ring)
  // Ring B: 0.38 - 0.72 (brightest, densest main ring)
  // Cassini Division: 0.72 - 0.77 (prominent dark gap)
  // Ring A: 0.77 - 0.96 (translucent outer main ring)
  // Encke Gap: 0.905 - 0.925 (sharp narrow gap in Ring A)
  // Ring F: 0.98 - 1.00 (faint narrow outer shepherd ring)

  float density = 0.0;
  vec3 baseColor = vec3(0.9, 0.82, 0.7);

  if (r < 0.15) {
    // Ring D
    density = smoothstep(0.02, 0.12, r) * 0.22;
    baseColor = vec3(0.72, 0.65, 0.55);
  } else if (r < 0.38) {
    // Ring C (Crepe Ring)
    float t = (r - 0.15) / 0.23;
    density = 0.35 + sin(t * 40.0) * 0.05 + t * 0.15;
    baseColor = vec3(0.82, 0.73, 0.58);
  } else if (r < 0.72) {
    // Ring B (Brilliant main ring)
    float t = (r - 0.38) / 0.34;
    // Micro-grooves and ripple density waves
    float ripples = sin(t * 85.0) * 0.06 + sin(t * 190.0) * 0.03;
    density = clamp(0.88 + ripples, 0.65, 0.98);
    baseColor = vec3(0.96, 0.88, 0.75);
  } else if (r < 0.77) {
    // CASSINI DIVISION (The great void)
    float t = (r - 0.72) / 0.05;
    density = sin(t * 3.14159265) * 0.035; // Near transparent void
    baseColor = vec3(0.4, 0.35, 0.3);
  } else if (r < 0.96) {
    // Ring A
    float t = (r - 0.77) / 0.19;
    density = 0.68 + sin(t * 60.0) * 0.04;
    baseColor = vec3(0.88, 0.80, 0.68);

    // Encke Gap inside Ring A
    if (r > 0.905 && r < 0.925) {
      density = 0.02; // Sharp clear slit
    }
  } else if (r < 0.98) {
    // Outer gap
    density = 0.01;
  } else {
    // Ring F
    float t = (r - 0.98) / 0.02;
    density = sin(t * 3.14159265) * 0.35;
    baseColor = vec3(0.85, 0.78, 0.65);
  }

  // Multiply with high-res radial canvas texture if available
  vec4 texSample = texture2D(uRingTexture, vec2(r, 0.5));
  if (texSample.a > 0.01) {
    density = mix(density, texSample.a, 0.5);
    baseColor = mix(baseColor, texSample.rgb, 0.5);
  }

  if (density < 0.01) {
    discard;
  }

  // 2. Optical Forward & Backward Scattering (Mie & Rayleigh on micron water ice)
  vec3 sunDir = normalize(uSunPosition - vWorldPosition);
  vec3 viewDir = normalize(cameraPosition - vWorldPosition);

  float cosTheta = dot(-viewDir, sunDir);
  // Forward scattering peak when looking towards Sun through the ring
  float forwardScatter = 1.0 + pow(max(cosTheta, 0.0), 3.5) * 1.6;
  // Backscatter peak when Sun is directly behind camera (opposition surge)
  float backScatter = 1.0 + pow(max(-cosTheta, 0.0), 4.0) * 0.8;

  // 3. Planetary Shadow Projection (Ray-Sphere intersection test)
  // Saturn casts a deep elliptical shadow onto the rings behind it
  vec3 oc = uPlanetCenter - vWorldPosition;
  float tproj = dot(oc, sunDir);
  float shadow = 1.0;

  if (tproj > 0.0) {
    float distSq = dot(oc, oc) - (tproj * tproj);
    float radiusSq = uPlanetRadius * uPlanetRadius;
    if (distSq < radiusSq * 1.05) {
      // Soft penumbra shadow edge
      shadow = smoothstep(radiusSq * 0.94, radiusSq * 1.02, distSq);
    }
  }

  // 4. Double-sided Lighting on Ring Plane
  float lightFactor = abs(dot(vNormal, sunDir)) * 0.65 + 0.35;
  vec3 finalColor = baseColor * lightFactor * forwardScatter * backScatter * (shadow * 0.92 + 0.08);

  float alpha = clamp(density * (0.85 + forwardScatter * 0.15), 0.0, 0.96);

  gl_FragColor = vec4(finalColor, alpha);
}
