varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorldPosition;
varying vec3 vSunDirection;
varying vec3 vObjPos;

uniform vec3 uSunPosition;

void main() {
  vUv = uv;
  vObjPos = position;
  vNormal = normalize(mat3(modelMatrix) * normal);

  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;

  // Vector pointing from this vertex to the Sun in world space
  vSunDirection = normalize(uSunPosition - worldPos.xyz);

  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
