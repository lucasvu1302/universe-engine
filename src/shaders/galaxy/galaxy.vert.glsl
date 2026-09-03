uniform float uTime;
uniform float uSize;

attribute float aScale;
attribute vec3 aColor;
attribute float aAngle;
attribute float aDistance;

varying vec3 vColor;
varying float vAlpha;

void main() {
  vColor = aColor;

  // Differential Galactic Rotation: inner stars rotate faster than outer stars
  float currentAngle = aAngle + (uTime * 0.02) / (0.1 + aDistance * 0.005);
  
  vec3 pos = position;
  pos.x = cos(currentAngle) * aDistance;
  pos.z = sin(currentAngle) * aDistance;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  // Size attenuation
  gl_PointSize = clamp((uSize * aScale) * (180.0 / -mvPosition.z), 1.0, 30.0);
  vAlpha = clamp(1.2 - (aDistance / 250.0), 0.2, 1.0);
}
