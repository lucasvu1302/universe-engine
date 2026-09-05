uniform float uInnerRadius;
uniform float uOuterRadius;

varying vec2 vUv;
varying vec3 vWorldPosition;
varying vec3 vNormal;
varying float vRadius;
varying float vRadiusRatio;

void main() {
  vUv = uv;
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;
  vNormal = normalize(normalMatrix * normal);
  
  // High-precision radial distance in ring local space
  vRadius = length(position.xy);
  vRadiusRatio = clamp((vRadius - uInnerRadius) / max(0.001, (uOuterRadius - uInnerRadius)), 0.0, 1.0);
  
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
