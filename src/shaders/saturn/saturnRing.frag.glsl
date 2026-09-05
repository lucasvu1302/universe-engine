precision highp float;

uniform vec3 uSunPosition;
uniform vec3 uPlanetCenter;
uniform float uPlanetRadius;
uniform float uInnerRadius;
uniform float uOuterRadius;

varying vec2 vUv;
varying vec3 vWorldPosition;
varying vec3 vLocalPosition;
varying vec3 vNormal;

void main() {
  // Exact per-fragment radial distance in ring local plane
  float localR = length(vLocalPosition.xy);

  // Geometric boundary safety check
  if (localR < uInnerRadius || localR > uOuterRadius) {
    discard;
  }

  // Normalized radial coordinate r in [0, 1] across the entire ring system
  float r = clamp((localR - uInnerRadius) / max(0.001, (uOuterRadius - uInnerRadius)), 0.0, 1.0);

  // 1. Analytical Photorealistic Saturn Ring Architecture (NASA Cassini-Huygens data)
  // Multi-frequency gravitational density waves & micro-grooves
  float microGrooves =
    sin(r * 320.0) * 0.055 +
    sin(r * 740.0) * 0.035 +
    sin(r * 1680.0) * 0.02 +
    sin(r * 3400.0) * 0.012;

  float density = 0.0;
  vec3 baseColor = vec3(0.92, 0.85, 0.72);

  if (r < 0.12) {
    // Ring D: faint ethereal inner dust ring
    density = smoothstep(0.01, 0.10, r) * 0.18;
    baseColor = vec3(0.68, 0.62, 0.52);
  } else if (r < 0.36) {
    // Ring C (Crepe Ring): translucent smoky amber
    float t = (r - 0.12) / 0.24;
    density = clamp(0.28 + sin(t * 36.0) * 0.04 + microGrooves * 0.5, 0.15, 0.45);
    baseColor = vec3(0.80, 0.72, 0.58);

    // Maxwell Gap
    if (r > 0.275 && r < 0.292) {
      density = 0.03;
    }
  } else if (r < 0.725) {
    // Ring B: the brilliant, dense, massive core ring
    float t = (r - 0.36) / 0.365;
    float innerRamp = smoothstep(0.0, 0.04, t);
    density = clamp((0.85 + microGrooves) * innerRamp, 0.68, 0.98);
    // Golden-cream pure water ice
    baseColor = vec3(0.96, 0.89, 0.76);
  } else if (r < 0.775) {
    // CASSINI DIVISION: 4,800 km wide transparent vacuum void
    float t = (r - 0.725) / 0.05;
    density = sin(t * 3.14159265) * 0.025; // Pure empty space, stars visible right through
    baseColor = vec3(0.35, 0.30, 0.25);
  } else if (r < 0.965) {
    // Ring A: translucent pearlescent silver-ice outer main ring
    float t = (r - 0.775) / 0.19;
    density = clamp(0.65 + microGrooves * 0.8, 0.48, 0.78);
    baseColor = vec3(0.88, 0.81, 0.70);

    // Encke Gap: razor-sharp 325 km clear gap cleared by moon Pan
    if (r > 0.908 && r < 0.924) {
      density = 0.015;
    }

    // Keeler Gap near outer rim cleared by moon Daphnis
    if (r > 0.954 && r < 0.961) {
      density = 0.02;
    }
  } else if (r < 0.982) {
    // Outer gap
    density = 0.01;
  } else {
    // Ring F: delicate narrow shepherd ring held by Prometheus and Pandora
    float t = (r - 0.982) / 0.018;
    density = sin(t * 3.14159265) * 0.38;
    baseColor = vec3(0.86, 0.79, 0.68);
  }

  // Pure vacuum discard
  if (density < 0.015) {
    discard;
  }

  // 2. Icy Grain Optical Scattering (Mie & Rayleigh on micron water ice)
  vec3 sunDir = normalize(uSunPosition - vWorldPosition);
  vec3 viewDir = normalize(cameraPosition - vWorldPosition);

  float cosTheta = dot(-viewDir, sunDir);
  // Forward scattering peak when backlighted by the Sun
  float forwardScatter = 1.0 + pow(max(cosTheta, 0.0), 3.8) * 1.8;
  // Opposition surge when Sun is directly behind camera
  float backScatter = 1.0 + pow(max(-cosTheta, 0.0), 4.2) * 0.9;

  // 3. Planetary Shadow Projection (Ray-Sphere intersection test)
  vec3 oc = uPlanetCenter - vWorldPosition;
  float tproj = dot(oc, sunDir);
  float shadow = 1.0;

  if (tproj > 0.0) {
    float distSq = dot(oc, oc) - (tproj * tproj);
    float radiusSq = uPlanetRadius * uPlanetRadius;
    if (distSq < radiusSq * 1.04) {
      // Soft penumbra shadow boundary
      shadow = smoothstep(radiusSq * 0.94, radiusSq * 1.01, distSq);
    }
  }

  // 4. Double-sided Lighting on Ring Plane
  float lightFactor = abs(dot(vNormal, sunDir)) * 0.65 + 0.35;
  vec3 finalColor = baseColor * lightFactor * forwardScatter * backScatter * (shadow * 0.92 + 0.08);

  float alpha = clamp(density * (0.86 + forwardScatter * 0.14), 0.0, 0.96);

  gl_FragColor = vec4(finalColor, alpha);
}
