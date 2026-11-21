uniform float uTime;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorldPosition;
varying float vElevation;
varying float vSlope;

void main() {
  vUv = uv;
  vec3 pos = position;

  // 1. Primary Long-Period Exo-Ocean Swells (XZ plane: +Y is vertical wave height)
  float phase1 = pos.z * 0.042 + pos.x * 0.012 + uTime * 1.15;
  float wave1 = sin(phase1) * 1.65;
  float dW1x = cos(phase1) * 1.65 * 0.012;
  float dW1z = cos(phase1) * 1.65 * 0.042;

  float phase2 = pos.x * 0.055 - pos.z * 0.034 + uTime * 1.45;
  float wave2 = cos(phase2) * 0.95;
  float dW2x = -sin(phase2) * 0.95 * 0.055;
  float dW2z = sin(phase2) * 0.95 * 0.034;

  float phase3 = pos.z * 0.11 + pos.x * 0.08 - uTime * 2.2;
  float wave3 = sin(phase3) * 0.35;
  float dW3x = cos(phase3) * 0.35 * 0.08;
  float dW3z = cos(phase3) * 0.35 * 0.11;

  // 2. Solitary Towering Tidal Mountain Wall Sweeping from Gargantua Horizon
  float kMx = 0.0035;
  float kMz = 0.022;
  float thetaM = pos.z * kMz + pos.x * kMx + uTime * 0.38 + 1.85;
  float baseCos = clamp(0.5 + 0.5 * cos(thetaM), 0.0, 1.0);
  float megawaveCrest = pow(baseCos, 5.0) * 24.0;

  // Analytical chain-rule partial derivatives dHx, dHz
  float dBaseDTheta = -0.5 * sin(thetaM);
  float dMegaDTheta = 24.0 * 5.0 * pow(baseCos, 4.0) * dBaseDTheta;
  float dMx = dMegaDTheta * kMx;
  float dMz = dMegaDTheta * kMz;

  float dHx = dW1x + dW2x + dW3x + dMx;
  float dHz = dW1z + dW2z + dW3z + dMz;

  float elevation = wave1 + wave2 + wave3 + megawaveCrest;
  pos.y += elevation;

  vElevation = elevation;
  vSlope = length(vec2(dHx, dHz));

  vec3 analyticNormal = normalize(vec3(-dHx, 1.0, -dHz));
  vNormal = normalize(mat3(modelMatrix) * analyticNormal);

  vec4 worldPos = modelMatrix * vec4(pos, 1.0);
  vWorldPosition = worldPos.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
