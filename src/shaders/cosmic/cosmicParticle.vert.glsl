uniform float uSize;
uniform float uScale;
attribute float aScale;
attribute vec3 aColor;
varying vec3 vColor;

void main() {
  vColor = aColor;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  float s = (aScale > 0.0) ? aScale : 1.0;
  gl_PointSize = (uSize * s * uScale) * (320.0 / -mvPosition.z);
  gl_PointSize = clamp(gl_PointSize, 1.0, 128.0);
  gl_Position = projectionMatrix * mvPosition;
}
