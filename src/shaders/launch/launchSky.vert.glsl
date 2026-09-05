varying vec3 vWorldPosition;
varying vec3 vRayDir;

void main() {
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;
  vRayDir = normalize(position);
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
