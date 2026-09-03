precision highp float;

uniform sampler2D uDayMap;
uniform sampler2D uNightMap;
uniform sampler2D uSpecularMap;
uniform sampler2D uCloudsMap;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorldPosition;
varying vec3 vSunDirection;

void main() {
  vec3 norm = normalize(vNormal);
  vec3 sunDir = normalize(vSunDirection);
  vec3 viewDir = normalize(cameraPosition - vWorldPosition);

  // Surface light factor (-1.0 to 1.0)
  float NdotL = dot(norm, sunDir);

  // Smooth day / night terminator transition
  float dayFactor = smoothstep(-0.08, 0.12, NdotL);

  // Sample authentic satellite maps
  vec3 dayColor = texture2D(uDayMap, vUv).rgb;
  vec3 nightColor = texture2D(uNightMap, vUv).rgb;
  float specularMask = texture2D(uSpecularMap, vUv).r;
  float clouds = texture2D(uCloudsMap, vUv).r;

  // Realistic cloud shadows cast on ground
  vec2 shadowOffset = -sunDir.xy * 0.003;
  float cloudShadow = texture2D(uCloudsMap, vUv + shadowOffset).r;
  dayColor *= (1.0 - cloudShadow * 0.4);

  // Ocean Specular Sunlight Glint (Blinn-Phong)
  vec3 halfVector = normalize(sunDir + viewDir);
  float NdotH = max(dot(norm, halfVector), 0.0);
  float specular = pow(NdotH, 64.0) * specularMask * 2.2;
  vec3 specularColor = vec3(1.0, 0.95, 0.88) * specular * max(NdotL, 0.0);

  // Nocturnal city lights (only glow on the night side)
  vec3 cityLights = nightColor * (1.0 - dayFactor) * 2.5;

  // Starlight ambient fill for dark side
  vec3 ambient = dayColor * 0.02;

  // Natural sunlit surface
  vec3 sunlitGround = dayColor * max(NdotL, 0.0);

  // Final composite: day side + ocean glint + night side city lights
  vec3 finalColor = mix(cityLights + ambient, sunlitGround + specularColor, dayFactor);

  gl_FragColor = vec4(finalColor, 1.0);
}
