precision highp float;

uniform float uTime;
uniform float uMode; // 0.0 = Einstein Ring Lensing, 1.0 = First-Person Black Hole Dive
uniform float uEinsteinRadius;
uniform float uLensOffset;
uniform float uVelocityC;
uniform float uDiveProgress;

varying vec2 vUv;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

vec3 sampleSpiralGalaxy(vec2 beta, float time) {
  // Shift background spiral galaxy by user lens offset so offset=0 forms a perfect Einstein Ring
  vec2 g = beta - vec2(uLensOffset * 0.42, uLensOffset * 0.14);
  // Subtle galaxy disk tilt for natural astrophysical perspective
  g.y *= 1.38;

  float r = length(g);
  float ang = r > 1e-4 ? atan(g.y, g.x) : 0.0;

  // Logarithmic 2-arm spiral density wave
  float twist = ang + 5.6 * log(r + 0.045) - time * 0.18;
  float arms = 0.5 + 0.5 * cos(twist * 2.0);
  arms = pow(max(0.0001, arms), 2.4);

  float disk = exp(-r * 6.8);
  float core = exp(-r * r * 115.0);
  float halo = exp(-r * 3.1) * 0.25;

  // Star-forming knots along spiral arms
  float knots = 0.5 + 0.5 * sin(ang * 14.0 + r * 42.0);
  vec3 coreCol = vec3(1.0, 0.85, 0.56) * core * 1.25;
  vec3 armCol = mix(vec3(0.28, 0.64, 1.0), vec3(0.82, 0.44, 0.98), knots * 0.48) * arms * disk * 1.45;
  vec3 dustCol = vec3(0.14, 0.28, 0.54) * halo;

  // Crisp procedural background starfield warped by the lens
  vec2 cell = floor(beta * 28.0);
  vec2 f = fract(beta * 28.0) - 0.5;
  float h = hash21(cell);
  float starMask = step(0.92, h) * exp(-dot(f, f) * 46.0);
  vec3 starTint = mix(vec3(0.68, 0.85, 1.0), vec3(1.0, 0.88, 0.66), fract(h * 19.7));

  return coreCol + armCol + dustCol + starTint * starMask * 1.4;
}

void main() {
  // Centered aspect-corrected screen coordinates (-1..1 vertically, -1.72..1.72 horizontally)
  vec2 uv = (vUv - 0.5) * 2.0;
  vec2 p = vec2(uv.x * 1.72, uv.y);
  float r = length(p);
  float ang = r > 1e-4 ? atan(p.y, p.x) : 0.0;

  // Soft outer vignette so the 3D lensing frame blends organically into surrounding 3D starfield
  float edgeFade = smoothstep(1.0, 0.72, max(abs(uv.x), abs(uv.y)));

  if (uMode < 0.5) {
    // =========================================================================
    // MODE 0: Gravitational Lensing & Einstein Ring
    // =========================================================================
    float thetaE = clamp(uEinsteinRadius, 0.16, 0.52);
    float rShadow = thetaE * 0.54;

    // Exact thin-lens deflection equation: beta = theta - (thetaE^2 / r^2) * theta
    float defl = (thetaE * thetaE) / max(r * r, 0.0025);
    vec2 beta = p * (1.0 - defl);

    vec3 col = sampleSpiralGalaxy(beta, uTime);

    // Relativistic Doppler color shift across the viewport as ship velocity approaches c
    float doppler = clamp(uVelocityC, 0.0, 0.999);
    vec3 blueShift = vec3(0.75, 0.92, 1.25);
    col = mix(col, col * blueShift, doppler * 0.42);

    // Razor-sharp luminous photon ring hugging the black hole shadow boundary
    float photonDist = abs(r - rShadow * 1.08);
    float photonRing = exp(-photonDist * 64.0) * 1.35;
    float outerEinsteinGlow = exp(-abs(r - thetaE) * 20.0) * 0.22;
    col += vec3(1.0, 0.78, 0.42) * photonRing + vec3(0.38, 0.76, 1.0) * outerEinsteinGlow;

    // Soft HDR shoulder tone-curve so aligned Einstein Ring preserves luminous blue/violet/gold spiral filament texture under Bloom
    col = col / (1.0 + col * 0.58);

    // Pitch-black Kerr shadow inside event horizon capture radius
    float shadowMask = smoothstep(rShadow * 0.95, rShadow * 1.04, r);
    col *= shadowMask;

    gl_FragColor = vec4(col, edgeFade);
  } else {
    // =========================================================================
    // MODE 1: First-Person Plunge Across Photon Sphere & Event Horizon
    // =========================================================================
    float dive = clamp(uDiveProgress, 0.0, 1.0);
    // Overhead sky window shrinks from r=0.88 toward a brilliant blueshifted halo ring as dive -> 1
    float horizonRadius = mix(0.24, 0.78, dive);
    float skyRingRadius = horizonRadius + 0.08;

    // Swirling relativistic accretion light compressed around the closing sky aperture
    float swirl = 0.5 + 0.5 * sin(ang * 8.0 + uTime * (1.6 + dive * 3.5) - r * 14.0);
    float streaks = 0.5 + 0.5 * cos(ang * 16.0 - r * 22.0 + uTime * 2.4);

    // Intensely blueshifted external cosmos ring at the rim of the black hole abyss
    float ringBand = exp(-abs(r - skyRingRadius) * (18.0 + dive * 16.0));
    float innerPhoton = exp(-abs(r - horizonRadius) * 44.0);

    vec3 blueshiftSky = vec3(0.55, 0.88, 1.0) * ringBand * (1.6 + dive * 1.4);
    vec3 accretionFlame = mix(vec3(1.0, 0.42, 0.08), vec3(1.0, 0.88, 0.58), swirl) *
      exp(-abs(r - (skyRingRadius + 0.14)) * 9.5) * (0.7 + 0.65 * streaks);
    vec3 photonFlash = vec3(1.0, 0.96, 0.88) * innerPhoton * 2.1;

    // Warped outer starlight pulled inward by extreme tidal gravity
    vec2 warpedBeta = p * (1.0 + 0.45 * dive / max(r, 0.18));
    vec3 outerCosmos = sampleSpiralGalaxy(warpedBeta, uTime * 1.8) * smoothstep(horizonRadius, horizonRadius + 0.35, r) * 0.75;

    vec3 col = outerCosmos + accretionFlame + blueshiftSky + photonFlash;

    // Expanding pitch-black singularity shadow filling the center ahead
    float abyssMask = smoothstep(horizonRadius * 0.94, horizonRadius * 1.03, r);
    col *= abyssMask;

    gl_FragColor = vec4(col, edgeFade);
  }
}
