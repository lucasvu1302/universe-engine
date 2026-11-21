import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { AssetManager } from '@/engine/assets/AssetManager';
import { useAppStore } from '@/stores/useAppStore';

interface TitanSurfaceSceneProps {
  visible?: boolean;
}

const TITAN_SKY_VERT = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const TITAN_SKY_FRAG = /* glsl */ `
  precision highp float;
  varying vec3 vDir;
  void main() {
    float elev = clamp(normalize(vDir).y, -0.1, 1.0);
    vec3 horizonHaze = vec3(0.84, 0.49, 0.18);
    vec3 midAmber = vec3(0.58, 0.29, 0.10);
    vec3 zenithSmog = vec3(0.20, 0.09, 0.035);
    vec3 sky = mix(horizonHaze, midAmber, smoothstep(-0.02, 0.34, elev));
    sky = mix(sky, zenithSmog, smoothstep(0.30, 0.92, elev));
    gl_FragColor = vec4(sky, 1.0);
  }
`;

// World-space Kraken Mare cryogenic liquid hydrocarbon sea shader (F4 + U5 fix!)
const METHANE_LAKE_VERT = /* glsl */ `
  varying vec2 vWorldXZ;
  varying vec3 vViewWorld;
  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldXZ = worldPos.xz;
    // World-space camera-to-surface vector matching world-space normals (F4 fix!)
    vViewWorld = cameraPosition - worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const METHANE_LAKE_FRAG = /* glsl */ `
  precision highp float;
  uniform float uTime;
  varying vec2 vWorldXZ;
  varying vec3 vViewWorld;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  void main() {
    // Multi-frequency isotropic capillary ripples on dark liquid methane-ethane sea
    vec2 p1 = vWorldXZ * 0.28 + vec2(uTime * 0.14, -uTime * 0.10);
    vec2 p2 = vWorldXZ * 0.78 + vec2(-uTime * 0.18, uTime * 0.16);
    vec2 p3 = vWorldXZ * 1.95 + vec2(uTime * 0.09, uTime * 0.12);
    float h0 = noise(p1) * 0.55 + noise(p2) * 0.30 + noise(p3) * 0.15;
    float hx = noise(p1 + vec2(0.14, 0.0)) * 0.55 + noise(p2 + vec2(0.14, 0.0)) * 0.30 + noise(p3 + vec2(0.14, 0.0)) * 0.15;
    float hz = noise(p1 + vec2(0.0, 0.14)) * 0.55 + noise(p2 + vec2(0.0, 0.14)) * 0.30 + noise(p3 + vec2(0.0, 0.14)) * 0.15;

    vec3 n = normalize(vec3((h0 - hx) * 1.15, 1.0, (h0 - hz) * 1.15));
    float dist = length(vViewWorld);
    vec3 v = vViewWorld / max(dist, 1e-4);

    float ndotv = clamp(abs(dot(n, v)), 0.0, 1.0);
    float fresnel = pow(clamp(1.0 - ndotv, 0.0, 1.0), 3.4);

    vec3 sunDir = normalize(vec3(0.22, 0.24, -0.94));
    vec3 halfVec = normalize(sunDir + v);
    float spec = pow(clamp(dot(n, halfVec), 0.0, 1.0), 64.0) * 0.62;

    // Dark mirror-like cryogenic methane albedo reflecting amber atmospheric haze
    vec3 deepMethane = vec3(0.035, 0.018, 0.008);
    vec3 amberReflect = vec3(0.82, 0.46, 0.16);
    vec3 col = mix(deepMethane, amberReflect, clamp(0.08 + fresnel * 0.78, 0.0, 0.88));
    col += vec3(1.0, 0.76, 0.42) * spec;

    // Smooth atmospheric fog blend matching scene.fog
    float fogF = 1.0 - exp(-pow(dist * 0.0082, 2.0));
    col = mix(col, vec3(0.71, 0.40, 0.14), clamp(fogF, 0.0, 0.9));

    gl_FragColor = vec4(col, 0.96);
  }
`;

const SATURN_SKY_VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormalWorld;
  void main() {
    vUv = uv;
    vNormalWorld = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SATURN_SKY_FRAG = /* glsl */ `
  precision highp float;
  uniform sampler2D uSaturnMap;
  varying vec2 vUv;
  varying vec3 vNormalWorld;
  void main() {
    vec3 tex = texture2D(uSaturnMap, vUv).rgb;
    vec3 sunDir = normalize(vec3(0.45, 0.35, 0.82));
    float ndotl = clamp(dot(normalize(vNormalWorld), sunDir), 0.0, 1.0);
    vec3 lit = tex * (0.08 + 0.92 * smoothstep(-0.08, 0.62, ndotl));
    // Soft golden Titan nitrogen-haze veil washing Saturn organically into the sky
    vec3 hazeCol = vec3(0.72, 0.39, 0.14);
    gl_FragColor = vec4(mix(lit, hazeCol, 0.46), 1.0);
  }
`;

const SATURN_RING_VERT = /* glsl */ `
  varying vec2 vLocalXY;
  void main() {
    vLocalXY = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SATURN_RING_FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vLocalXY;
  void main() {
    float r = length(vLocalXY);
    float t = clamp((r - 19.0) / 16.0, 0.0, 1.0);
    float cassiniGap = 1.0 - smoothstep(0.56, 0.60, t) * (1.0 - smoothstep(0.66, 0.70, t));
    float bands = 0.65 + 0.35 * sin(t * 48.0) * cos(t * 17.0);
    float edge = smoothstep(0.0, 0.08, t) * (1.0 - smoothstep(0.92, 1.0, t));
    // Subtle planetary shadow across rear-left ring quadrant
    float shadow = 1.0 - 0.55 * smoothstep(-4.0, -14.0, vLocalXY.x) * smoothstep(10.0, -6.0, vLocalXY.y);
    vec3 col = mix(vec3(0.84, 0.56, 0.28), vec3(0.98, 0.84, 0.58), bands) * shadow;
    float alpha = edge * cassiniGap * bands * 0.46;
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(col, alpha);
  }
`;

function hash2D(ix: number, iz: number): number {
  const s = Math.sin(ix * 127.1 + iz * 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

function valueNoise2D(x: number, z: number): number {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx);
  const uz = fz * fz * (3 - 2 * fz);
  const a = hash2D(ix, iz);
  const b = hash2D(ix + 1, iz);
  const c = hash2D(ix, iz + 1);
  const d = hash2D(ix + 1, iz + 1);
  return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
}

/**
 * Organically meandering Kraken Mare shoreline (coves & peninsulas, zero straight horizontal cut!).
 */
function shorelineZ(x: number): number {
  return (
    -4.6 +
    Math.sin(x * 0.11 + 0.5) * 4.2 +
    Math.cos(x * 0.052 - 0.9) * 5.1 +
    (valueNoise2D(x * 0.14 + 3.1, 1.7) - 0.5) * 4.4
  );
}

function titanHeight(x: number, z: number): number {
  const shoreDist = shorelineZ(x) - z; // positive into lake, negative on land
  const lakeDrop = THREE.MathUtils.smoothstep(shoreDist, -2.5, 9.5) * -2.35;
  const headlands = THREE.MathUtils.smoothstep(Math.abs(x), 15.0, 58.0) * 6.4;
  const rollingHills =
    (valueNoise2D(x * 0.06 + 2.2, z * 0.06 - 1.4) - 0.45) * 2.2 +
    Math.sin(x * 0.18 + z * 0.13) * 0.16;
  const flatPad = THREE.MathUtils.smoothstep(Math.hypot(x, z - 1.5), 3.2, 12.0);
  return -0.22 + lakeDrop + (headlands + rollingHills) * flatPad;
}

/**
 * Smoothly welded eroded water-ice river cobbles (SphereGeometry, zero flat low-poly triangles!).
 */
function createWeldedIceCobbleGeo(): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(0.64, 24, 18);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i);
    const vy = pos.getY(i);
    const vz = pos.getZ(i);
    const wear = 0.86 + 0.18 * valueNoise2D(vx * 2.8 + 4.1, vz * 2.8 + vy * 2.2);
    pos.setXYZ(i, vx * wear * 1.12, vy * (vy < -0.15 ? 0.52 : 0.78) * wear, vz * wear);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

export const TitanSurfaceScene: React.FC<TitanSurfaceSceneProps> = ({ visible = true }) => {
  const mistRef = useRef<THREE.Points>(null);
  const { scene } = useThree();

  // Bind THREE.FogExp2 properly onto root scene.fog so distant Titan ridges dissolve into golden haze (U5.3 & F6!)
  useEffect(() => {
    if (!visible) return;
    const prevFog = scene.fog;
    scene.fog = new THREE.FogExp2('#b56522', 0.0082);
    return () => {
      scene.fog = prevFog;
    };
  }, [scene, visible]);

  const assets = useMemo(() => AssetManager.getInstance(), []);
  const titanAlbedo = useMemo(() => assets.getRegolithAlbedoMap('titan'), [assets]);
  const titanBump = useMemo(() => assets.getRegolithBumpMap('titan'), [assets]);
  const saturnMap = useMemo(() => assets.loadTexture('saturn'), [assets]);
  const softParticle = useMemo(() => assets.getSoftParticleMap(), [assets]);
  const kaptonGold = useMemo(() => assets.getKaptonFoilMap('gold'), [assets]);
  const kaptonBump = useMemo(() => assets.getKaptonBumpMap(), [assets]);
  const hullMap = useMemo(() => assets.getAerospaceHullMap(), [assets]);
  const aeroBump = useMemo(() => assets.getAerospaceBumpMap(), [assets]);

  const gpu = useMemo(() => {
    const skyGeo = new THREE.SphereGeometry(240, 40, 28);
    const skyMat = new THREE.ShaderMaterial({
      vertexShader: TITAN_SKY_VERT,
      fragmentShader: TITAN_SKY_FRAG,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    });

    const terrainGeo = new THREE.PlaneGeometry(240, 240, 144, 144);
    terrainGeo.rotateX(-Math.PI / 2);
    const pos = terrainGeo.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    const dryOchre = new THREE.Color('#c87632');
    const warmSand = new THREE.Color('#df954e');
    const wetShoreMud = new THREE.Color('#47200a');
    const tmp = new THREE.Color();

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = titanHeight(x, z);
      pos.setY(i, y);

      const n = valueNoise2D(x * 0.12 + 1.5, z * 0.12 - 2.4);
      const wetness = 1.0 - THREE.MathUtils.smoothstep(y, -1.25, -0.42);
      tmp.copy(dryOchre).lerp(warmSand, n * 0.35).lerp(wetShoreMud, wetness * 0.85);
      colors[i * 3] = tmp.r;
      colors[i * 3 + 1] = tmp.g;
      colors[i * 3 + 2] = tmp.b;
    }
    terrainGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    terrainGeo.computeVertexNormals();
    const terrainMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      map: titanAlbedo,
      bumpMap: titanBump,
      bumpScale: 0.18,
      roughness: 0.86,
      metalness: 0.04,
    });

    const lakeGeo = new THREE.PlaneGeometry(220, 180, 4, 4);
    lakeGeo.rotateX(-Math.PI / 2);
    const lakeMat = new THREE.ShaderMaterial({
      vertexShader: METHANE_LAKE_VERT,
      fragmentShader: METHANE_LAKE_FRAG,
      uniforms: { uTime: { value: 0 } },
      transparent: true,
    });

    // NASA-textured Ringed Saturn cleanly framed through Titan's golden atmospheric haze (U5.5!)
    const saturnGeo = new THREE.SphereGeometry(14.5, 48, 36);
    const saturnMat = new THREE.ShaderMaterial({
      vertexShader: SATURN_SKY_VERT,
      fragmentShader: SATURN_SKY_FRAG,
      uniforms: { uSaturnMap: { value: saturnMap } },
      fog: false,
    });
    const ringGeo = new THREE.RingGeometry(19, 35, 72);
    const ringMat = new THREE.ShaderMaterial({
      vertexShader: SATURN_RING_VERT,
      fragmentShader: SATURN_RING_FRAG,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      fog: false,
    });

    // Welded eroded water-ice river cobbles
    const pebbleGeo = createWeldedIceCobbleGeo();
    const pebbleMat = new THREE.MeshStandardMaterial({
      map: titanAlbedo,
      bumpMap: titanBump,
      bumpScale: 0.2,
      color: '#a85d26',
      roughness: 0.84,
    });

    // Cinema-Detail ESA Huygens Descent Probe (Ribbed Heatshield, Bolt Flange, Gold Kapton Deck, DISR Camera, HASI Boom, Parachute Ring)
    const shellGeo = new THREE.CylinderGeometry(1.08, 1.56, 0.42, 32);
    const shellMat = new THREE.MeshStandardMaterial({
      map: hullMap,
      bumpMap: aeroBump,
      bumpScale: 0.035,
      color: '#d4dce6',
      metalness: 0.72,
      roughness: 0.32,
    });
    const thermalRimGeo = new THREE.TorusGeometry(1.55, 0.075, 14, 36);
    const darkCarbonMat = new THREE.MeshStandardMaterial({ color: '#1e293b', metalness: 0.45, roughness: 0.65 });
    const coreGeo = new THREE.CylinderGeometry(0.86, 0.96, 0.56, 16);
    const coreMat = new THREE.MeshStandardMaterial({
      map: kaptonGold,
      bumpMap: kaptonBump,
      bumpScale: 0.05,
      metalness: 0.92,
      roughness: 0.22,
    });
    const topDeckGeo = new THREE.CylinderGeometry(0.9, 0.9, 0.08, 16);
    const chuteRingGeo = new THREE.TorusGeometry(0.54, 0.035, 10, 24);
    const disrShroudGeo = new THREE.BoxGeometry(0.32, 0.22, 0.38);
    const lensGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.06, 16);
    const lensMat = new THREE.MeshPhysicalMaterial({
      color: '#0ea5e9',
      metalness: 0.9,
      roughness: 0.05,
      clearcoat: 1.0,
    });
    const dishGeo = new THREE.CylinderGeometry(0.32, 0.2, 0.14, 18);
    const boomGeo = new THREE.CylinderGeometry(0.022, 0.026, 0.92, 8);
    const sensorPodGeo = new THREE.BoxGeometry(0.14, 0.1, 0.14);
    const antennaMat = new THREE.MeshStandardMaterial({ color: '#e2e8f0', metalness: 0.85, roughness: 0.24 });
    const aoGeo = new THREE.PlaneGeometry(5.0, 5.0);
    const aoMat = new THREE.MeshBasicMaterial({
      map: softParticle,
      color: '#1c0b03',
      transparent: true,
      opacity: 0.52,
      depthWrite: false,
    });

    // Subtle low ground-hugging hydrocarbon mist (height < 4.5, size 0.36 — never floating dots across Saturn!)
    const mistCount = 340;
    const mistPos = new Float32Array(mistCount * 3);
    for (let i = 0; i < mistCount; i++) {
      const h1 = Math.abs((Math.sin(i * 17.3) * 43758.54) % 1);
      const h2 = Math.abs((Math.sin(i * 43.1 + 1.5) * 19283.12) % 1);
      const h3 = Math.abs((Math.sin(i * 81.9 + 3.2) * 28471.41) % 1);
      mistPos[i * 3] = (h1 - 0.5) * 90;
      mistPos[i * 3 + 1] = 0.2 + h2 * 3.8;
      mistPos[i * 3 + 2] = (h3 - 0.5) * 90;
    }
    const mistGeo = new THREE.BufferGeometry();
    mistGeo.setAttribute('position', new THREE.BufferAttribute(mistPos, 3));
    const mistMat = new THREE.PointsMaterial({
      map: softParticle,
      color: '#f59e0b',
      size: 0.36,
      transparent: true,
      opacity: 0.08,
      depthWrite: false,
    });

    return {
      skyGeo,
      skyMat,
      terrainGeo,
      terrainMat,
      lakeGeo,
      lakeMat,
      saturnGeo,
      saturnMat,
      ringGeo,
      ringMat,
      pebbleGeo,
      pebbleMat,
      shellGeo,
      shellMat,
      thermalRimGeo,
      darkCarbonMat,
      coreGeo,
      coreMat,
      topDeckGeo,
      chuteRingGeo,
      disrShroudGeo,
      lensGeo,
      lensMat,
      dishGeo,
      boomGeo,
      sensorPodGeo,
      antennaMat,
      aoGeo,
      aoMat,
      mistGeo,
      mistMat,
    };
  }, [titanAlbedo, titanBump, saturnMap, softParticle, kaptonGold, kaptonBump, hullMap, aeroBump]);

  useEffect(() => {
    return () => {
      gpu.skyGeo.dispose();
      gpu.skyMat.dispose();
      gpu.terrainGeo.dispose();
      gpu.terrainMat.dispose();
      gpu.lakeGeo.dispose();
      gpu.lakeMat.dispose();
      gpu.saturnGeo.dispose();
      gpu.saturnMat.dispose();
      gpu.ringGeo.dispose();
      gpu.ringMat.dispose();
      gpu.pebbleGeo.dispose();
      gpu.pebbleMat.dispose();
      gpu.shellGeo.dispose();
      gpu.shellMat.dispose();
      gpu.thermalRimGeo.dispose();
      gpu.darkCarbonMat.dispose();
      gpu.coreGeo.dispose();
      gpu.coreMat.dispose();
      gpu.topDeckGeo.dispose();
      gpu.chuteRingGeo.dispose();
      gpu.disrShroudGeo.dispose();
      gpu.lensGeo.dispose();
      gpu.lensMat.dispose();
      gpu.dishGeo.dispose();
      gpu.boomGeo.dispose();
      gpu.sensorPodGeo.dispose();
      gpu.antennaMat.dispose();
      gpu.aoGeo.dispose();
      gpu.aoMat.dispose();
      gpu.mistGeo.dispose();
      gpu.mistMat.dispose();
    };
  }, [gpu]);

  useFrame((state, delta) => {
    if (!visible) return;
    const reduced = useAppStore.getState().reducedMotion;
    gpu.lakeMat.uniforms.uTime.value = reduced ? 0 : state.clock.elapsedTime;
    if (mistRef.current && !reduced) {
      const dt = Math.min(Math.max(delta, 0.001), 0.05);
      const posAttr = gpu.mistGeo.attributes.position as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      for (let i = 0; i < arr.length; i += 3) {
        arr[i] += dt * 1.4;
        if (arr[i] > 45) arr[i] = -45;
      }
      posAttr.needsUpdate = true;
    }
  });

  if (!visible) return null;

  // Natural asymmetric multi-scale water-ice river cobble clusters (zero mirror symmetry!)
  const cobbles: Array<[number, number, number]> = [
    [-5.2, 2.8, 0.88],
    [-4.3, 3.6, 0.42],
    [-3.8, 2.2, 0.32],
    [3.9, 1.1, 0.72],
    [5.6, 2.4, 0.48],
    [2.8, 4.9, 0.54],
    [-1.9, 5.7, 0.38],
    [-8.4, -0.4, 1.18],
    [7.8, -1.9, 1.05],
    [6.4, 4.4, 0.34],
    [-6.5, 4.8, 0.56],
  ];

  const probeGroundY = titanHeight(0, 1.5);

  return (
    <group name="titan-surface-scene" position={[0, -0.5, 0]}>
      <ambientLight intensity={0.44} color="#d97706" />
      <directionalLight position={[28, 36, -65]} intensity={1.85} color="#fed7aa" castShadow />
      <directionalLight position={[-35, 18, 42]} intensity={0.55} color="#ea580c" />

      <mesh geometry={gpu.skyGeo} material={gpu.skyMat} />

      {/* NASA-Textured Ringed Saturn Looming Softly Through Titan's Golden Haze */}
      <group position={[14, 24, -152]} rotation={[0.24, -0.22, 0.32]}>
        <mesh geometry={gpu.saturnGeo} material={gpu.saturnMat} />
        <mesh rotation={[Math.PI / 2.25, 0, 0]} geometry={gpu.ringGeo} material={gpu.ringMat} />
      </group>

      {/* Meandering Orange Hydrocarbon Shoreline & Wet Dark Mud Bank */}
      <mesh geometry={gpu.terrainGeo} material={gpu.terrainMat} receiveShadow />

      {/* Kraken Mare Organic Cryogenic Methane-Ethane Lake */}
      <mesh position={[0, -0.98, -76]} geometry={gpu.lakeGeo} material={gpu.lakeMat} />

      {/* Low Ground-Hugging Hydrocarbon Mist */}
      <points ref={mistRef} geometry={gpu.mistGeo} material={gpu.mistMat} />

      {/* Asymmetric Eroded Water-Ice River Cobble Clusters */}
      {cobbles.map(([x, z, s], idx) => (
        <mesh
          key={`titan-cobble-${idx}`}
          position={[x, titanHeight(x, z) + s * 0.15, z]}
          scale={[s * 1.18, s * 0.62, s * 0.96]}
          rotation={[0.14 * idx, idx * 1.37, 0.08]}
          geometry={gpu.pebbleGeo}
          material={gpu.pebbleMat}
          castShadow
        />
      ))}

      {/* Cinema-Detail ESA Huygens Descent Lander Probe */}
      <group position={[0, probeGroundY + 0.32, 1.5]} rotation={[0.04, 0.38, -0.03]}>
        <mesh position={[0, -0.26, 0]} rotation={[-Math.PI / 2, 0, 0]} geometry={gpu.aoGeo} material={gpu.aoMat} />
        <mesh geometry={gpu.shellGeo} material={gpu.shellMat} castShadow />
        <mesh position={[0, -0.17, 0]} rotation={[Math.PI / 2, 0, 0]} geometry={gpu.thermalRimGeo} material={gpu.darkCarbonMat} />
        <mesh position={[0, 0.4, 0]} geometry={gpu.coreGeo} material={gpu.coreMat} castShadow />
        <mesh position={[0, 0.7, 0]} geometry={gpu.topDeckGeo} material={gpu.shellMat} />
        <mesh position={[0, 0.75, 0]} rotation={[Math.PI / 2, 0, 0]} geometry={gpu.chuteRingGeo} material={gpu.darkCarbonMat} />

        {/* Recessed DISR Optical Camera Turret with Sapphire Lens */}
        <group position={[0.72, 0.38, 0.58]} rotation={[0, 0.65, 0]}>
          <mesh geometry={gpu.disrShroudGeo} material={gpu.darkCarbonMat} />
          <mesh position={[0, 0, 0.2]} rotation={[Math.PI / 2, 0, 0]} geometry={gpu.lensGeo} material={gpu.lensMat} />
        </group>

        {/* Top S-Band Telemetry Dish */}
        <mesh position={[-0.18, 0.82, -0.12]} geometry={gpu.dishGeo} material={gpu.shellMat} />

        {/* Articulated HASI Meteorological Boom + Radar Altimeter Sensor Arm */}
        <group position={[0.82, 0.46, -0.22]} rotation={[0.05, 0, -1.18]}>
          <mesh position={[0, 0.42, 0]} geometry={gpu.boomGeo} material={gpu.antennaMat} />
          <mesh position={[0, 0.88, 0]} geometry={gpu.sensorPodGeo} material={gpu.darkCarbonMat} />
        </group>
        <group position={[-0.78, 0.44, 0.32]} rotation={[-0.08, 0, 1.12]}>
          <mesh position={[0, 0.36, 0]} geometry={gpu.boomGeo} material={gpu.antennaMat} />
        </group>
      </group>
    </group>
  );
};

export default TitanSurfaceScene;
