precision highp float;

uniform float uTime;
uniform vec3 uColorA;
uniform vec3 uColorB;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorldPosition;

float hash3(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float noise3(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash3(i + vec3(0, 0, 0)), hash3(i + vec3(1, 0, 0)), f.x),
        mix(hash3(i + vec3(0, 1, 0)), hash3(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(hash3(i + vec3(0, 0, 1)), hash3(i + vec3(1, 0, 1)), f.x),
        mix(hash3(i + vec3(0, 1, 1)), hash3(i + vec3(1, 1, 1)), f.x), f.y),
    f.z
  );
}

float fbm3(vec3 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise3(p);
    p = p * 2.03 + vec3(3.1, -5.7, 2.4);
    a *= 0.5;
  }
  return v;
}

void main() {
  vec3 norm = normalize(vNormal);
  vec3 incident = normalize(vWorldPosition - cameraPosition);

  // Ellis-Morris-Thorne spherical gravitational throat lensing (100% 3D ray-based, zero UV seams!)
  float cosIncident = clamp(abs(dot(-incident, norm)), 0.0, 1.0);
  float impactParam = 1.0 - cosIncident;
  float einsteinBend = pow(impactParam, 2.35);

  // Refracted 3D ray curving isotropically through the 4D throat (100% pole-free, zero cross-product pinch!)
  vec3 refracted = refract(incident, norm, 0.56);
  if (length(refracted) < 0.001) {
    refracted = reflect(incident, norm);
  }
  vec3 radialReflect = reflect(incident, norm);
  vec3 bentRay = normalize(mix(refracted, radialReflect, einsteinBend * 0.54));

  // Rotate distant galaxy slowly inside the spherical crystal portal
  float rot = uTime * 0.06;
  mat3 galRot = mat3(
     cos(rot), 0.0, sin(rot),
     0.0,      1.0, 0.0,
    -sin(rot), 0.0, cos(rot)
  );
  vec3 portalDir = galRot * bentRay;

  // Distant galaxy nebula dust lanes + Gargantua warm amber core glow
  float neb1 = fbm3(portalDir * 3.2);
  float neb2 = fbm3(portalDir * 6.8 + vec3(neb1 * 1.4));
  float galacticBand = exp(-pow(portalDir.y * 2.6 + (neb1 - 0.5) * 0.9, 2.0));

  vec3 deepVoid = vec3(0.02, 0.035, 0.08);
  vec3 warmNebula = vec3(0.92, 0.58, 0.26) * galacticBand * smoothstep(0.32, 0.82, neb2) * 1.25;
  vec3 coolNebula = mix(uColorA, uColorB, neb1) * (0.45 + 0.85 * neb2);

  // Lensed background stars stretched tangentially near the Einstein ring
  float starCell = hash3(floor(portalDir * 95.0));
  float stars = smoothstep(0.986, 0.999, starCell) * (1.2 + einsteinBend * 2.4);

  // Razor-sharp relativistic Einstein photon ring at the spherical throat boundary
  float einsteinRing = exp(-pow((impactParam - 0.84) / 0.085, 2.0)) * 1.85;
  vec3 ringColor = mix(vec3(0.56, 0.82, 1.0), vec3(1.0, 0.88, 0.68), impactParam) * einsteinRing;

  vec3 finalColor = deepVoid + coolNebula * 0.72 + warmNebula + vec3(0.95, 0.97, 1.0) * stars + ringColor;
  float alpha = clamp(0.9 + einsteinRing * 0.1, 0.0, 1.0);

  gl_FragColor = vec4(finalColor, alpha);
}
