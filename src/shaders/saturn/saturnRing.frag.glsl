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
  float localR = length(vLocalPosition.xy);

  if (localR < uInnerRadius || localR > uOuterRadius) {
    discard;
  }

  float r = clamp((localR - uInnerRadius) / max(0.001, (uOuterRadius - uInnerRadius)), 0.0, 1.0);

  // Analytical screen-space derivative fwidth(r) eliminates Moire shimmer at orbital distances
  // while preserving razor-sharp Cassini micro-ringlets in close-ups
  float dr = max(fwidth(r), 0.00005);
  float aa320  = exp(-pow(320.0  * dr * 0.55, 2.0));
  float aa740  = exp(-pow(740.0  * dr * 0.55, 2.0));
  float aa1680 = exp(-pow(1680.0 * dr * 0.55, 2.0));
  float aa3400 = exp(-pow(3400.0 * dr * 0.55, 2.0));

  float microGrooves =
    sin(r * 320.0)  * 0.055 * aa320 +
    sin(r * 740.0)  * 0.036 * aa740 +
    sin(r * 1680.0) * 0.022 * aa1680 +
    sin(r * 3400.0) * 0.014 * aa3400;

  float edgeSoft = max(dr * 1.4, 0.0012);
  float density = 0.0;
  vec3 baseColor = vec3(0.92, 0.85, 0.72);

  if (r < 0.12) {
    // Ring D: gossamer inner dust sheet
    density = smoothstep(0.01, 0.10, r) * 0.17;
    baseColor = vec3(0.68, 0.62, 0.53);
  } else if (r < 0.36) {
    // Ring C (Crepe Ring): translucent smoky quartz-ice
    float t = (r - 0.12) / 0.24;
    float cWave = sin(t * 36.0) * 0.04 * exp(-pow(150.0 * dr * 0.5, 2.0));
    density = clamp(0.28 + cWave + microGrooves * 0.5, 0.14, 0.45);
    baseColor = vec3(0.80, 0.73, 0.60);

    // Anti-aliased Maxwell Gap
    float maxwellGap = smoothstep(0.275 - edgeSoft, 0.275 + edgeSoft, r) *
                       (1.0 - smoothstep(0.292 - edgeSoft, 0.292 + edgeSoft, r));
    density = mix(density, 0.025, maxwellGap);
  } else if (r < 0.725) {
    // Ring B: dense bright water-ice core with color-banded optical depth variations
    float t = (r - 0.36) / 0.365;
    float innerRamp = smoothstep(0.0, 0.035, t);
    float bandTone = 0.5 + 0.5 * sin(t * 22.0) * aa320;
    density = clamp((0.86 + microGrooves) * innerRamp, 0.68, 0.98);
    baseColor = mix(vec3(0.91, 0.83, 0.69), vec3(0.98, 0.92, 0.80), bandTone);
  } else if (r < 0.775) {
    // Cassini Division: 4,800 km cleared orbital resonance gap with faint Huygens ringlet
    float t = (r - 0.725) / 0.05;
    density = sin(t * 3.14159265) * 0.028;
    baseColor = vec3(0.38, 0.33, 0.28);
  } else if (r < 0.965) {
    // Ring A: pearlescent outer main ring
    density = clamp(0.66 + microGrooves * 0.85, 0.48, 0.79);
    baseColor = vec3(0.88, 0.82, 0.72);

    // Anti-aliased Encke Gap (325 km) & Keeler Gap (35 km)
    float enckeMask = smoothstep(0.908 - edgeSoft, 0.908 + edgeSoft, r) *
                      (1.0 - smoothstep(0.924 - edgeSoft, 0.924 + edgeSoft, r));
    float keelerMask = smoothstep(0.954 - edgeSoft, 0.954 + edgeSoft, r) *
                       (1.0 - smoothstep(0.961 - edgeSoft, 0.961 + edgeSoft, r));
    density = mix(density, 0.015, clamp(enckeMask + keelerMask, 0.0, 1.0));
  } else if (r < 0.982) {
    density = 0.01;
  } else {
    // Ring F: narrow braided shepherd ringlet
    float t = (r - 0.982) / 0.018;
    density = sin(t * 3.14159265) * 0.42;
    baseColor = vec3(0.87, 0.80, 0.70);
  }

  if (density < 0.014) {
    discard;
  }

  // Micron water-ice Mie forward scattering & Seeliger opposition surge
  vec3 sunDir = normalize(uSunPosition - vWorldPosition);
  vec3 viewDir = normalize(cameraPosition - vWorldPosition);

  float cosTheta = dot(-viewDir, sunDir);
  float forwardScatter = 1.0 + pow(max(cosTheta, 0.0), 4.0) * 1.75;
  float oppositionSurge = 1.0 + pow(max(-cosTheta, 0.0), 5.0) * 0.95;

  // Saturn globe shadow ray-sphere intersection with soft solar penumbra
  vec3 oc = uPlanetCenter - vWorldPosition;
  float tproj = dot(oc, sunDir);
  float shadow = 1.0;

  if (tproj > 0.0) {
    float distSq = dot(oc, oc) - (tproj * tproj);
    float radiusSq = uPlanetRadius * uPlanetRadius;
    if (distSq < radiusSq * 1.05) {
      shadow = smoothstep(radiusSq * 0.93, radiusSq * 1.02, distSq);
    }
  }

  float lightFactor = abs(dot(normalize(vNormal), sunDir)) * 0.62 + 0.38;
  vec3 finalColor = baseColor * lightFactor * forwardScatter * oppositionSurge * (shadow * 0.94 + 0.06);
  float alpha = clamp(density * (0.86 + forwardScatter * 0.12), 0.0, 0.97);

  gl_FragColor = vec4(finalColor, alpha);
}
