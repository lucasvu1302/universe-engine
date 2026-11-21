uniform float uThroatRadius;
uniform float uLength;
uniform float uExpansion;

varying vec2 vUv;
varying vec3 vLocalPos;
varying vec3 vNormal;
varying vec3 vWorldPosition;

void main() {
  vUv = uv;
  float shellScale = length(position.xz);
  vec2 dirXZ = position.xz / max(shellScale, 0.001);
  float axial = clamp(-position.y, 0.0, 1.0);

  // Coaxial dual-shell Prandtl-Meyer supersonic envelope:
  // inner core shell (~0.45) hugs Mach shock diamonds; outer shell (~1.0) blooms with altitude
  float shellBlend = smoothstep(0.4, 1.0, shellScale);
  float baseR = uThroatRadius * mix(0.52, 1.0, shellBlend);
  float expandAmt = uExpansion * mix(0.36, 1.0, shellBlend);
  float radius = baseR + pow(axial, 0.66) * expandAmt;

  vec3 shapedPos = vec3(dirXZ.x * radius, -axial * uLength, dirXZ.y * radius);
  float dRdY = (0.66 * pow(max(axial, 0.025), -0.34) * expandAmt) / max(uLength, 1.0);
  vec3 localNorm = normalize(vec3(dirXZ.x, dRdY, dirXZ.y));

  vLocalPos = vec3(shellScale, -axial * uLength, atan(dirXZ.y, dirXZ.x));
  vNormal = normalize(mat3(modelMatrix) * localNorm);
  vec4 worldPos = modelMatrix * vec4(shapedPos, 1.0);
  vWorldPosition = worldPos.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
