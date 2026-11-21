varying vec2 vUv;
varying vec3 vLocalPos;
varying vec3 vWorldPos;
varying vec3 vWorldNormal;

void main() {
  vUv = uv;
  vLocalPos = position;
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPos = worldPos.xyz;
  // Guaranteed outward radial unit normal for the spherical cap centered at local origin
  vWorldNormal = normalize(mat3(modelMatrix) * normalize(position));
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
