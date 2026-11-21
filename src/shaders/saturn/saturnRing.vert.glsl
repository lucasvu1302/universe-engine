varying vec2 vUv;
varying vec3 vWorldPosition;
varying vec3 vLocalPosition;
varying vec3 vNormal;

void main() {
  vUv = uv;
  vLocalPosition = position;

  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);

  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
