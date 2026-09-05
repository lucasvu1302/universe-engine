precision highp float;

uniform float uTime;
uniform vec3 uLocalCamPos;

varying vec2 vUv;
varying vec3 vWorldPosition;
varying vec3 vLocalPos;
varying vec3 vNormal;

// Calibrated physical dimensions for visualRadius = 28.0
const float RS = 5.6;         // Schwarzschild Radius r_s
const float R_HORIZON = 5.88; // Event Horizon (1.05 * RS)
const float R_ISCO = 8.6;     // Innermost Stable Circular Orbit (~1.5 * RS)
const float R_OUTER = 34.0;   // Outer edge of accretion disk

// Safe hashing and noise functions
float hash(vec2 p) {
  vec2 h = fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453);
  return h.x;
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.55;
  mat2 rot = mat2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 4; ++i) {
    v += a * noise(p);
    p = rot * p * 2.05 + vec2(12.3, 31.7);
    a *= 0.5;
  }
  return v;
}

void main() {
  // Ray origin and unit velocity in black hole local coordinate system
  vec3 rayPos = (length(uLocalCamPos) < 64.0) ? uLocalCamPos : vLocalPos;
  vec3 rayVel = normalize(vLocalPos - uLocalCamPos);

  vec3 accumColor = vec3(0.0);
  float accumAlpha = 0.0;
  float minR = 9999.0;
  bool hitHorizon = false;

  // Numerical integration of null geodesics in Schwarzschild curved spacetime
  for (int i = 0; i < 55; i++) {
    float r = length(rayPos);
    minR = min(minR, r);

    // 1. Ray fell into the event horizon: swallowed into the singularity
    if (r < R_HORIZON) {
      hitHorizon = true;
      break;
    }

    // 2. Ray escaped into outer space beyond bounding volume
    if (r > 64.0 && i > 8) {
      break;
    }

    // 3. Adaptive step size: fine resolution near photon sphere, larger steps in far field
    float dt = clamp(r * 0.055, 0.18, 1.6);

    // 4. Schwarzschild gravitational acceleration:
    // a = -1.5 * RS * (pos - vel * dot(pos, vel)) / (r^3)
    float posDotVel = dot(rayPos, rayVel);
    vec3 perp = rayPos - rayVel * posDotVel;
    vec3 accel = -1.5 * RS * perp / (r * r * r);

    rayVel += accel * dt;
    rayVel = normalize(rayVel);

    vec3 oldPos = rayPos;
    rayPos += rayVel * dt;

    // 5. Plane crossing test for equatorial accretion disk at y = 0
    if (oldPos.y * rayPos.y <= 0.0) {
      float frac = abs(oldPos.y) / (abs(oldPos.y) + abs(rayPos.y) + 0.00001);
      vec3 crossPos = mix(oldPos, rayPos, frac);
      float rDisk = length(crossPos.xz);

      if (rDisk >= R_ISCO && rDisk <= R_OUTER) {
        float u = (rDisk - R_ISCO) / (R_OUTER - R_ISCO);
        float phi = atan(crossPos.z, crossPos.x + 0.00001);

        // Differential Keplerian rotation: Omega ~ 1 / r^1.5
        float omega = sqrt(RS / max(rDisk * rDisk * rDisk, 0.1)) * 1.8;
        float swirl = phi - omega * uTime * 2.2;

        // Multi-octave burning plasma filaments
        vec2 uv = vec2(swirl * 2.6, rDisk * 0.5);
        float turb = fbm(uv);
        float filaments = pow(clamp(turb, 0.0, 1.0), 1.35) * 1.35;

        // Radial emission profile
        float radialProf = pow(clamp(1.0 - u, 0.0, 1.0), 1.5) * smoothstep(0.0, 0.08, u);

        // Relativistic Doppler Beaming
        float beta = clamp(sqrt(RS / (2.0 * rDisk)), 0.1, 0.6);
        vec3 vGas = vec3(-sin(phi), 0.0, cos(phi)) * beta;
        float vLos = dot(vGas, -rayVel);
        float gamma = 1.0 / sqrt(max(1.0 - beta * beta, 0.01));
        float doppler = 1.0 / (gamma * (1.0 - vLos));
        float dopplerBoost = pow(clamp(doppler, 0.2, 4.0), 3.0);

        // Thermal Color Progression
        vec3 colorHot = vec3(1.5, 1.5, 1.8);
        vec3 colorWarm = vec3(1.6, 1.05, 0.3);
        vec3 colorCool = vec3(0.85, 0.22, 0.02);

        vec3 diskCol = mix(colorHot, colorWarm, smoothstep(0.0, 0.35, u));
        diskCol = mix(diskCol, colorCool, smoothstep(0.35, 1.0, u));

        if (doppler > 1.0) {
          diskCol = mix(diskCol, vec3(1.4, 1.6, 2.0), clamp((doppler - 1.0) * 0.6, 0.0, 0.8));
        }

        // Optical depth scaling with angle of incidence
        float opticalDepth = 1.0 / max(abs(rayVel.y), 0.2);
        float dAlpha = clamp(radialProf * filaments * opticalDepth * 0.85, 0.0, 0.95);
        vec3 dColor = diskCol * radialProf * filaments * dopplerBoost * 2.8;

        // Front-to-back accumulation
        accumColor += dColor * (1.0 - accumAlpha);
        accumAlpha += dAlpha * (1.0 - accumAlpha);

        if (accumAlpha > 0.98) {
          break;
        }
      }
    }
  }

  // 6. Razor-sharp Photon Sphere Ring (at r ~ 1.5 * RS)
  float photonDist = abs(minR - RS * 1.5);
  float photonGlow = exp(-pow(photonDist * 5.5, 2.0)) * 2.8;
  vec3 photonColor = vec3(1.6, 1.5, 1.3) * photonGlow;
  accumColor += photonColor * (1.0 - accumAlpha);
  accumAlpha = clamp(accumAlpha + photonGlow * 0.6, 0.0, 1.0);

  // 7. Output composition
  if (hitHorizon) {
    // Pure pitch-black event horizon shadow (swallows all background light)
    gl_FragColor = vec4(accumColor, 1.0);
  } else {
    if (accumAlpha < 0.005) {
      discard;
    }
    gl_FragColor = vec4(accumColor, accumAlpha);
  }
}
