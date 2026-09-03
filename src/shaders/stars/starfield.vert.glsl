uniform float uTime;
uniform float uWarpSpeed;
uniform vec3 uVelocityDirection;

attribute float aSize;
attribute vec3 aColor;
attribute float aTwinkleSpeed;
attribute float aTwinklePhase;

varying vec3 vColor;
varying float vAlpha;

void main() {
  vColor = aColor;

  // Twinkle intensity
  float twinkle = sin(uTime * aTwinkleSpeed + aTwinklePhase) * 0.35 + 0.65;
  vAlpha = twinkle;

  vec3 pos = position;

  // Warp streak stretching when uWarpSpeed > 0.1
  if (uWarpSpeed > 0.05) {
    pos += uVelocityDirection * (uWarpSpeed * 40.0 * (1.0 - aTwinklePhase * 0.5));
  }

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  // Attenuate point size by distance
  float pSize = aSize * (1.0 + uWarpSpeed * 0.5);
  gl_PointSize = clamp(pSize * (350.0 / -mvPosition.z), 1.0, 45.0);
}
