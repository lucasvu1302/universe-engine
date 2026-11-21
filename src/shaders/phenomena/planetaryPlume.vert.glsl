uniform float uTime;
uniform float uHeight;
uniform float uSpread;
uniform float uGravity;
uniform float uIntensity;
uniform float uMode;
uniform float uPointScale;
uniform float uVisualRadius;

attribute vec4 aSeed;

varying float vLife;
varying float vSparkle;

void main() {
  float phase = aSeed.x;
  float azim = aSeed.y * 6.2831853;
  float radialFactor = aSeed.z;
  float sizeRand = aSeed.w;

  vec3 pos = vec3(0.0);
  float life = 0.0;
  float sparkle = 1.0;

  if (uMode < 0.5) {
    // Mode 0: Ballistic volcanic umbrella plume / cryo-geyser jet along local +Y (zenith)
    float speed = 0.26 + 0.14 * min(uIntensity, 1.8);
    float age = fract(phase + uTime * speed);
    life = age;

    // Tight central vent stem rising vertically, then fanning smoothly into a ballistic umbrella canopy
    float y = uHeight * (1.42 * age - uGravity * age * age);
    y = max(0.0, y);
    float fan = pow(max(1e-4, age), 1.45) * uSpread * (0.16 + 0.84 * radialFactor);
    float swirl = azim + age * 0.75;
    pos = vec3(cos(swirl) * fan, y, sin(swirl) * fan);
    sparkle = 0.82 + 0.18 * sin(uTime * 4.5 + azim * 3.0);
  } else if (uMode < 1.5) {
    // Mode 1: Anti-solar sodium plasma tail streaming away from Sun along local +Y
    float age = fract(phase + uTime * (0.24 + 0.12 * min(uIntensity, 1.8)));
    life = age;
    float streamDist = age * uHeight;
    float coneRadius = (0.18 + pow(max(1e-4, age), 0.85) * uSpread) * radialFactor;
    float wave = sin(age * 8.0 - uTime * 2.2 + azim) * uSpread * 0.08 * age;
    pos = vec3(cos(azim) * coneRadius + wave, streamDist, sin(azim) * coneRadius);
    sparkle = 0.8 + 0.2 * sin(uTime * 4.0 + phase * 18.0);
  } else if (uMode < 2.5) {
    // Mode 2: Crystalline diamond-rain shimmer / sparkling atmospheric micro-flashes
    float age = fract(phase + uTime * 0.35);
    life = age;
    float rPatch = sqrt(radialFactor) * uSpread;
    float driftAzim = azim + uTime * 0.22;
    float px = cos(driftAzim) * rPatch;
    float pz = sin(driftAzim) * rPatch;
    float py = uHeight * (0.15 + 0.85 * sin(age * 3.14159265));
    pos = vec3(px, py, pz);
    float s = max(0.0, sin(uTime * 7.5 + phase * 37.0));
    float s2 = s * s;
    sparkle = s2 * s2;
  } else {
    // Mode 3: Solar magnetic coronal flare arcade loop
    float age = fract(phase + uTime * (0.30 + 0.14 * min(uIntensity, 1.8)));
    life = age;
    float archAngle = age * 3.14159265;
    float strand = (radialFactor - 0.5) * 2.0;
    float spanX = -cos(archAngle) * uSpread * (0.82 + 0.20 * abs(strand));
    float archY = sin(archAngle) * uHeight * (0.85 + 0.25 * sizeRand);
    float twistZ = strand * uSpread * 0.32 + sin(archAngle * 2.0 + uTime * 2.0 + azim) * uSpread * 0.08;
    pos = vec3(spanX, archY, twistZ);
    sparkle = 0.75 + 0.25 * sin(uTime * 7.5 + phase * 24.0);
  }

  vLife = life;
  vSparkle = sparkle;

  vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPos;

  float dist = max(-mvPos.z, 0.4);
  float basePx = uPointScale * sizeRand * (0.78 + 0.36 * sin(life * 3.14159265));
  // Scale apparent particle size by body visualRadius/dist so moons (Io, Enceladus) render fine misty grains, not giant polka-dots
  gl_PointSize = clamp(basePx * max(uVisualRadius, 0.35) * (24.0 / dist), 1.6, 10.5);
}
