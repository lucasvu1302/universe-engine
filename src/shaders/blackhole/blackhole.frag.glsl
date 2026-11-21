precision highp float;

uniform float uTime;
uniform vec3 uLocalCamPos;
uniform int uMaxSteps;
uniform float uVolumeRadius;

varying vec2 vUv;
varying vec3 vWorldPosition;
varying vec3 vLocalPos;
varying vec3 vNormal;

// Calibrated relativistic dimensions (R_SHADOW = 1.5 * RS photon-sphere capture boundary — zero sky gap!)
const float RS = 5.6;
const float R_SHADOW = 8.4;   // Photon sphere capture shadow boundary (1.5 * RS)
const float R_ISCO = 8.55;    // Innermost Stable Circular Orbit hugging photon shadow
const float R_OUTER = 34.5;   // Outer edge of Keplerian accretion disk

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
  float volumeRadius = (uVolumeRadius > 0.0) ? uVolumeRadius : 65.0;
  vec3 volumePos = vLocalPos * volumeRadius;

  vec3 rayPos = (length(uLocalCamPos) < 65.5) ? uLocalCamPos : volumePos;
  vec3 rayVel = normalize(volumePos - uLocalCamPos);
  int maxSteps = max(uMaxSteps, 24);
  float stepScale = (uMaxSteps > 0) ? (55.0 / float(uMaxSteps)) : 1.0;

  vec3 accumColor = vec3(0.0);
  float accumAlpha = 0.0;
  float minR = 9999.0;
  bool hitHorizon = false;

  // Null geodesic integration in curved Schwarzschild spacetime (DNGR Interstellar lensing)
  for (int i = 0; i < 64; i++) {
    if (i >= maxSteps) {
      break;
    }
    float r = length(rayPos);
    minR = min(minR, r);

    // 1. Any ray crossing inside R_SHADOW (1.5 * RS photon sphere) is captured by the black hole shadow
    if (r < R_SHADOW) {
      hitHorizon = true;
      break;
    }

    // 2. Escaped bounding sphere
    if (r > 65.5 && i > 4) {
      break;
    }

    // 3. Calibrated adaptive step size so rays reach R_SHADOW well within 24..48 step budgets while resolving smooth Einstein arches
    float dt = clamp((r - R_SHADOW * 0.66) * 0.115, 0.34, 2.48) * stepScale;

    // 4. Relativistic gravitational deflection bending rays over & under the shadow onto the far accretion disk
    float posDotVel = dot(rayPos, rayVel);
    vec3 perp = rayPos - rayVel * posDotVel;
    vec3 accel = -2.45 * RS * perp / max(r * r * r, 1.0);

    rayVel = normalize(rayVel + accel * dt);

    vec3 oldPos = rayPos;
    rayPos += rayVel * dt;

    // 5. Equatorial accretion disk plane-crossing test (y = 0)
    if (oldPos.y * rayPos.y <= 0.0) {
      float frac = abs(oldPos.y) / (abs(oldPos.y) + abs(rayPos.y) + 0.00001);
      vec3 crossPos = mix(oldPos, rayPos, frac);
      float rDisk = length(crossPos.xz);

      if (rDisk >= R_ISCO && rDisk <= R_OUTER) {
        float u = (rDisk - R_ISCO) / (R_OUTER - R_ISCO);
        float phi = atan(crossPos.z, crossPos.x + 0.00001);

        float omega = sqrt(RS / max(rDisk * rDisk * rDisk, 0.1)) * 1.8;
        float swirl = phi - omega * uTime * 2.2;

        vec2 uv = vec2(swirl * 2.6, rDisk * 0.52);
        float turb = fbm(uv);
        float rings = 0.78 + 0.22 * sin(rDisk * 2.8);
        float filaments = pow(clamp(turb, 0.0, 1.0), 1.3) * 1.38 * rings;

        float radialProf = pow(clamp(1.0 - u, 0.0, 1.0), 1.5) * smoothstep(0.0, 0.085, u);

        // Relativistic Doppler beaming
        float beta = clamp(sqrt(RS / (2.0 * rDisk)), 0.1, 0.56);
        vec3 vGas = vec3(-sin(phi), 0.0, cos(phi)) * beta;
        float vLos = dot(vGas, -rayVel);
        float gamma = 1.0 / sqrt(max(1.0 - beta * beta, 0.01));
        float doppler = 1.0 / (gamma * (1.0 - vLos));
        float dopplerBoost = pow(clamp(doppler, 0.28, 3.4), 2.6);

        vec3 colorHot = vec3(1.55, 1.38, 1.05);
        vec3 colorWarm = vec3(1.52, 0.96, 0.32);
        vec3 colorCool = vec3(0.78, 0.22, 0.03);

        vec3 diskCol = mix(colorHot, colorWarm, smoothstep(0.0, 0.34, u));
        diskCol = mix(diskCol, colorCool, smoothstep(0.34, 1.0, u));

        if (doppler > 1.05) {
          diskCol = mix(diskCol, vec3(1.55, 1.48, 1.28), clamp((doppler - 1.05) * 0.45, 0.0, 0.65));
        }

        float opticalDepth = 1.0 / max(abs(rayVel.y), 0.22);
        float dAlpha = clamp(radialProf * filaments * opticalDepth * 0.86, 0.0, 0.96);
        vec3 dColor = diskCol * radialProf * filaments * dopplerBoost * 2.45;

        accumColor += dColor * (1.0 - accumAlpha);
        accumAlpha += dAlpha * (1.0 - accumAlpha);

        if (accumAlpha > 0.98) {
          break;
        }
      }
    }
  }

  // 6. Warm golden relativistic photon-sphere rim hugging directly against R_SHADOW (zero detached white hoop!)
  if (!hitHorizon) {
    float photonDist = max(0.0, minR - R_SHADOW);
    float photonGlow = exp(-pow(photonDist * 2.6, 2.0)) * 0.92;
    vec3 photonColor = vec3(1.48, 1.08, 0.54) * photonGlow;
    accumColor += photonColor * (1.0 - accumAlpha);
    accumAlpha = clamp(accumAlpha + photonGlow * 0.68, 0.0, 1.0);
  }

  if (hitHorizon) {
    gl_FragColor = vec4(accumColor, 1.0);
  } else {
    if (accumAlpha < 0.005) {
      discard;
    }
    gl_FragColor = vec4(accumColor, accumAlpha);
  }
}
