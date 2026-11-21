precision highp float;

uniform float uTime;

varying vec2 vUv;
varying vec3 vWorldPosition;
varying vec3 vNormal;
varying vec3 vBillboardRight;
varying vec3 vBillboardUp;

void main() {
  vUv = uv;

  // Extract puff center & uniform scale from instanceMatrix
  vec3 centerLocal = vec3(0.0);
  float scaleX = 1.0;
  float scaleY = 1.0;
  float rotZ = 0.0;

  #ifdef USE_INSTANCING
    centerLocal = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
    scaleX = length(vec3(instanceMatrix[0][0], instanceMatrix[0][1], instanceMatrix[0][2]));
    scaleY = length(vec3(instanceMatrix[1][0], instanceMatrix[1][1], instanceMatrix[1][2]));
    // Subtle rolling rotation encoded in instanceMatrix X/Z basis
    rotZ = atan(instanceMatrix[0][2], instanceMatrix[0][0]);
  #endif

  vec4 centerWorld = modelMatrix * vec4(centerLocal, 1.0);

  // Camera-aligned billboard basis in world space (eliminates 3D sphere seams completely!)
  vec3 camRight = normalize(vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]));
  vec3 camUp = normalize(vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]));

  float c = cos(rotZ);
  float s = sin(rotZ);
  vec2 quad = position.xy;
  vec2 rotQuad = vec2(quad.x * c - quad.y * s, quad.x * s + quad.y * c);

  vec3 worldOffset = camRight * (rotQuad.x * scaleX) + camUp * (rotQuad.y * scaleY);
  vec3 finalWorld = centerWorld.xyz + worldOffset;

  // Reconstruct soft 3D hemispherical puff normal across the billboard so dot(norm, viewDir) & sun lighting are genuinely 3D
  vec2 disc = clamp(quad * 1.15, -1.0, 1.0);
  float zHemisphere = sqrt(max(0.02, 1.0 - dot(disc, disc)));
  vec3 viewToCam = normalize(cameraPosition - centerWorld.xyz);
  vNormal = normalize(camRight * disc.x + camUp * disc.y + viewToCam * zHemisphere);
  vBillboardRight = camRight;
  vBillboardUp = camUp;
  vWorldPosition = finalWorld;

  gl_Position = projectionMatrix * viewMatrix * vec4(finalWorld, 1.0);
}
