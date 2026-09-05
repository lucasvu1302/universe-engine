uniform float uTime;
uniform float uSize;

attribute float aScale;
attribute vec3 aColor;
attribute vec2 aTwinkle;

varying vec3 vColor;
varying float vAlpha;
varying vec2 vTwinkle;

void main() {
  vColor = aColor;
  vTwinkle = aTwinkle;

  // Pattern speed density wave rotation (rigid whole-galaxy rotation)
  // Maintains 100% of the spiral arm geometry, central bar, and spurs without winding into circles
  float angle = uTime * 0.012;
  float cosA = cos(angle);
  float sinA = sin(angle);
  
  vec3 pos = position;
  pos.x = position.x * cosA - position.z * sinA;
  pos.z = position.x * sinA + position.z * cosA;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  // Size attenuation with perspective scaling
  float distToCam = -mvPosition.z;
  gl_PointSize = clamp((uSize * aScale) * (340.0 / max(distToCam, 10.0)), 1.2, 45.0);
  
  // Radial alpha falloff
  float r = length(position.xz);
  vAlpha = clamp(1.4 - (r / 380.0) * 0.5, 0.4, 1.0);
}

