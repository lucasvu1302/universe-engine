import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AssetManager } from '@/engine/assets/AssetManager';
import { useAppStore } from '@/stores/useAppStore';

interface EuropaSurfaceSceneProps {
  visible?: boolean;
}

const JUPITER_SKY_VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormalWorld;
  varying vec3 vViewWorld;
  void main() {
    vUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vNormalWorld = normalize(mat3(modelMatrix) * normal);
    // World-space view vector matching world-space normal (F4 fix!)
    vViewWorld = normalize(cameraPosition - worldPos.xyz);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const JUPITER_SKY_FRAG = /* glsl */ `
  precision highp float;
  uniform sampler2D uJupiterMap;
  varying vec2 vUv;
  varying vec3 vNormalWorld;
  varying vec3 vViewWorld;

  void main() {
    vec3 tex = texture2D(uJupiterMap, vUv).rgb;
    vec3 n = normalize(vNormalWorld);
    vec3 v = normalize(vViewWorld);
    vec3 sunDir = normalize(vec3(0.58, 0.36, 0.72));

    float ndotl = clamp(dot(n, sunDir), 0.0, 1.0);
    float terminator = 0.03 + 1.02 * smoothstep(-0.08, 0.58, ndotl);

    // Subtle Jovian upper-atmosphere scattering rim along sunlit limb (clamped dot for Metal safety)
    float ndotv = clamp(abs(dot(n, v)), 0.0, 1.0);
    float rim = pow(clamp(1.0 - ndotv, 0.0, 1.0), 3.2) * smoothstep(-0.05, 0.45, ndotl);

    vec3 col = tex * terminator + vec3(0.92, 0.80, 0.64) * rim * 0.28;
    gl_FragColor = vec4(col, 1.0);
  }
`;

// Volumetric supersonic cryogeyser water-vapor plume shader (zero cotton-swab bokeh dots!)
const GEYSER_PLUME_VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormalWorld;
  varying vec3 vViewWorld;
  void main() {
    vUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vNormalWorld = normalize(mat3(modelMatrix) * normal);
    vViewWorld = normalize(cameraPosition - worldPos.xyz);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const GEYSER_PLUME_FRAG = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform float uSeed;
  varying vec2 vUv;
  varying vec3 vNormalWorld;
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
    float ndotv = clamp(abs(dot(normalize(vNormalWorld), normalize(vViewWorld))), 0.0, 1.0);
    float softEdge = pow(ndotv, 1.5);
    float flow1 = noise(vec2(vUv.x * 7.0 + uSeed, vUv.y * 5.0 - uTime * 1.15));
    float flow2 = noise(vec2(vUv.x * 15.0 - uSeed, vUv.y * 10.0 - uTime * 2.1));
    float mist = mix(0.45, 1.0, flow1 * 0.65 + flow2 * 0.35);

    float vertical = smoothstep(0.0, 0.14, vUv.y) * (1.0 - smoothstep(0.32, 1.0, vUv.y));
    vec3 col = mix(vec3(0.42, 0.82, 1.0), vec3(0.92, 0.97, 1.0), 1.0 - vUv.y * 0.65);
    float alpha = vertical * softEdge * mist * 0.34;
    if (alpha < 0.005) discard;
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

function ridgedIceFbm(x: number, z: number): number {
  let sum = 0;
  let amp = 0.55;
  let freq = 1.0;
  for (let i = 0; i < 4; i++) {
    const n = 1.0 - Math.abs(valueNoise2D(x * freq, z * freq) * 2.0 - 1.0);
    sum += n * n * amp;
    freq *= 2.08;
    amp *= 0.48;
  }
  return sum;
}

function europaHeight(x: number, z: number): number {
  const dist = Math.hypot(x, z);
  const padFlat = THREE.MathUtils.smoothstep(dist, 5.2, 22.0);
  const macro = (ridgedIceFbm(x * 0.036 + 2.3, z * 0.036 - 1.9) - 0.42) * 6.2;
  // Conamara Chaos raised double tectonic ridge & deep sapphire crevasse behind lander
  const fissureDist = Math.abs(z + 17.5 + Math.sin(x * 0.13) * 3.6);
  const fissureCut = (1.0 - THREE.MathUtils.smoothstep(fissureDist, 0.5, 2.8)) * -1.8;
  const doubleRidge =
    Math.exp(-Math.pow((fissureDist - 3.6) / 1.5, 2)) * 1.15;
  const horizonCrags = THREE.MathUtils.smoothstep(dist, 56, 122) * 9.2;
  return -0.5 + (macro + horizonCrags + doubleRidge) * padFlat + fissureCut * padFlat;
}

/**
 * Builds smoothly welded indexed glacial ice slabs (SphereGeometry displaced with ridged cleavage FBM
 * — ZERO non-indexed flat PS2 triangles!).
 */
function createWeldedIceSlabGeo(): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(1.0, 32, 24);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const deepIce = new THREE.Color('#4d88c4');
  const midIce = new THREE.Color('#b6dbf7');
  const frostCrest = new THREE.Color('#f0f9ff');
  const saltStreak = new THREE.Color('#a46c54');
  const tmp = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i);
    const vy = pos.getY(i);
    const vz = pos.getZ(i);
    const strata = 0.84 + 0.24 * ridgedIceFbm(vx * 2.2 + 1.5, vz * 2.2 - vy * 1.8);
    const chiseled = 1.0 - 0.16 * Math.abs(Math.sin(vx * 3.2 + vz * 2.6));
    const r = strata * chiseled;
    const baseFlat = vy < -0.15 ? 0.45 : 0.92;
    pos.setXYZ(i, vx * r * 1.15, vy * baseFlat * r, vz * r);

    const topBlend = THREE.MathUtils.smoothstep(vy, -0.25, 0.68);
    const salt = valueNoise2D(vx * 3.5 + 4.1, vz * 3.5 - 2.2);
    tmp.copy(deepIce).lerp(midIce, 0.4 + topBlend * 0.42).lerp(frostCrest, topBlend * 0.55);
    if (salt > 0.72) tmp.lerp(saltStreak, (salt - 0.72) * 1.1);
    colors[i * 3] = tmp.r;
    colors[i * 3 + 1] = tmp.g;
    colors[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

const CRYSTAL_SPRAY_COUNT = 360;

export const EuropaSurfaceScene: React.FC<EuropaSurfaceSceneProps> = ({ visible = true }) => {
  const sprayRef = useRef<THREE.Points>(null);

  const assets = useMemo(() => AssetManager.getInstance(), []);
  const iceAlbedo = useMemo(() => assets.getRegolithAlbedoMap('europa'), [assets]);
  const iceBump = useMemo(() => assets.getRegolithBumpMap('europa'), [assets]);
  const jupiterMap = useMemo(() => assets.loadTexture('jupiter'), [assets]);
  const softParticle = useMemo(() => assets.getSoftParticleMap(), [assets]);
  const kaptonGold = useMemo(() => assets.getKaptonFoilMap('gold'), [assets]);
  const kaptonBump = useMemo(() => assets.getKaptonBumpMap(), [assets]);
  const hullMap = useMemo(() => assets.getAerospaceHullMap(), [assets]);
  const aeroBump = useMemo(() => assets.getAerospaceBumpMap(), [assets]);
  const solarMap = useMemo(() => assets.getSolarArrayMap(), [assets]);

  const geyserOrigins = useMemo<Array<[number, number, number]>>(
    () => [
      [-19, -0.5, -20],
      [13, -0.5, -22],
      [29, 0.0, -35],
    ],
    []
  );

  const spraySeeds = useMemo(() => {
    const phase = new Float32Array(CRYSTAL_SPRAY_COUNT);
    const vx = new Float32Array(CRYSTAL_SPRAY_COUNT);
    const vz = new Float32Array(CRYSTAL_SPRAY_COUNT);
    const ventIdx = new Uint8Array(CRYSTAL_SPRAY_COUNT);
    for (let i = 0; i < CRYSTAL_SPRAY_COUNT; i++) {
      const h1 = Math.abs((Math.sin(i * 13.71) * 43758.54) % 1);
      const h2 = Math.abs((Math.sin(i * 59.17 + 2.3) * 19283.12) % 1);
      const h3 = Math.abs((Math.sin(i * 91.33 + 0.7) * 28471.41) % 1);
      phase[i] = h1;
      const a = h2 * Math.PI * 2;
      const spread = 0.5 + h3 * 2.8;
      vx[i] = Math.cos(a) * spread;
      vz[i] = Math.sin(a) * spread;
      ventIdx[i] = i % 3;
    }
    return { phase, vx, vz, ventIdx };
  }, []);

  const gpu = useMemo(() => {
    const terrainGeo = new THREE.PlaneGeometry(260, 260, 144, 144);
    terrainGeo.rotateX(-Math.PI / 2);
    const pos = terrainGeo.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    const snowIce = new THREE.Color('#ddeeff');
    const glacierBlue = new THREE.Color('#7cc5f2');
    const sapphireCrack = new THREE.Color('#0c699c');
    const rustLineae = new THREE.Color('#9a5238');
    const tmp = new THREE.Color();

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = europaHeight(x, z);
      pos.setY(i, y);

      if (y < -0.9) {
        tmp.copy(sapphireCrack).lerp(glacierBlue, 0.32);
      } else {
        const mineral = valueNoise2D(x * 0.075 + 4.2, z * 0.075 - 3.1);
        tmp.copy(snowIce).lerp(glacierBlue, mineral * 0.28);
        if (mineral > 0.64) {
          tmp.lerp(rustLineae, (mineral - 0.64) * 1.25);
        }
      }
      colors[i * 3] = tmp.r;
      colors[i * 3 + 1] = tmp.g;
      colors[i * 3 + 2] = tmp.b;
    }
    terrainGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    terrainGeo.computeVertexNormals();

    const terrainMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      map: iceAlbedo,
      bumpMap: iceBump,
      bumpScale: 0.16,
      roughness: 0.52,
      metalness: 0.06,
    });

    const iceSlabGeo = createWeldedIceSlabGeo();
    const iceSlabMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      map: iceAlbedo,
      bumpMap: iceBump,
      bumpScale: 0.2,
      roughness: 0.34,
      metalness: 0.06,
    });

    // Authentic NASA-textured Jupiter framed with generous starry headroom above horizon (U4!)
    const jupiterGeo = new THREE.SphereGeometry(21, 64, 48);
    const jupiterMat = new THREE.ShaderMaterial({
      vertexShader: JUPITER_SKY_VERT,
      fragmentShader: JUPITER_SKY_FRAG,
      uniforms: { uJupiterMap: { value: jupiterMap } },
    });

    const starCount = 1500;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const u = Math.abs((Math.sin(i * 12.98) * 43758.54) % 1);
      const v = Math.abs((Math.sin(i * 78.23 + 1.1) * 24634.63) % 1);
      const theta = u * Math.PI * 2;
      const phi = Math.acos(v * 0.92);
      const r = 210;
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = Math.max(4, r * Math.cos(phi));
      starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const starsGeo = new THREE.BufferGeometry();
    starsGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starsMat = new THREE.PointsMaterial({
      map: softParticle,
      color: '#f0f9ff',
      size: 0.65,
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
    });

    // Volumetric conical supersonic ice-vapor cryogeyser plumes (zero polka dots!)
    const plumeConeGeo = new THREE.CylinderGeometry(3.6, 0.32, 23.0, 24, 1, true);
    plumeConeGeo.translate(0, 11.5, 0);
    const plumeMats = [0, 1, 2].map(
      (idx) =>
        new THREE.ShaderMaterial({
          vertexShader: GEYSER_PLUME_VERT,
          fragmentShader: GEYSER_PLUME_FRAG,
          uniforms: { uTime: { value: 0 }, uSeed: { value: idx * 3.7 } },
          transparent: true,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
    );

    const sprayGeo = new THREE.BufferGeometry();
    sprayGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(CRYSTAL_SPRAY_COUNT * 3), 3));
    const sprayMat = new THREE.PointsMaterial({
      map: softParticle,
      color: '#e0f2fe',
      size: 0.44,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    // Cinema-detail NASA Europa Clipper Cryo-Lander
    const busGeo = new THREE.CylinderGeometry(0.95, 1.08, 0.98, 8);
    const busMat = new THREE.MeshStandardMaterial({
      map: kaptonGold,
      bumpMap: kaptonBump,
      bumpScale: 0.05,
      metalness: 0.9,
      roughness: 0.24,
    });
    const collarGeo = new THREE.CylinderGeometry(1.14, 1.14, 0.15, 8);
    const collarMat = new THREE.MeshStandardMaterial({
      map: hullMap,
      bumpMap: aeroBump,
      bumpScale: 0.03,
      color: '#e2e8f0',
      metalness: 0.68,
      roughness: 0.28,
    });
    const louverGeo = new THREE.BoxGeometry(0.42, 0.56, 0.08);
    const darkMetalMat = new THREE.MeshStandardMaterial({
      color: '#1e293b',
      metalness: 0.85,
      roughness: 0.3,
    });
    const wingGeo = new THREE.BoxGeometry(2.75, 0.05, 1.02);
    const wingMat = new THREE.MeshStandardMaterial({
      map: solarMap,
      color: '#ffffff',
      metalness: 0.5,
      roughness: 0.2,
    });
    const wingFrameGeo = new THREE.BoxGeometry(2.85, 0.07, 1.08);
    const boomGeo = new THREE.CylinderGeometry(0.04, 0.04, 6.4, 10);
    const dishGeo = new THREE.SphereGeometry(0.76, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.45);
    const dishMat = new THREE.MeshStandardMaterial({
      map: hullMap,
      color: '#f8fafc',
      metalness: 0.45,
      roughness: 0.28,
      side: THREE.DoubleSide,
    });
    const feedStrutGeo = new THREE.CylinderGeometry(0.015, 0.018, 0.58, 6);
    const feedHornGeo = new THREE.CylinderGeometry(0.06, 0.04, 0.14, 12);
    const legGeo = new THREE.CylinderGeometry(0.045, 0.06, 1.62, 10);
    const strutGeo = new THREE.CylinderGeometry(0.025, 0.028, 1.15, 8);
    const padGeo = new THREE.CylinderGeometry(0.28, 0.34, 0.09, 14);
    const legMat = new THREE.MeshStandardMaterial({ color: '#94a3b8', metalness: 0.86, roughness: 0.26 });
    const mastGeo = new THREE.CylinderGeometry(0.042, 0.055, 1.38, 10);
    const camHeadGeo = new THREE.BoxGeometry(0.36, 0.2, 0.28);
    const lensGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.05, 16);
    const lensMat = new THREE.MeshPhysicalMaterial({
      color: '#0284c7',
      metalness: 0.9,
      roughness: 0.06,
      clearcoat: 1.0,
    });
    const rtgGeo = new THREE.CylinderGeometry(0.18, 0.2, 0.72, 14);
    const aoGeo = new THREE.PlaneGeometry(5.6, 5.6);
    const aoMat = new THREE.MeshBasicMaterial({
      map: softParticle,
      color: '#0f172a',
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    });

    return {
      terrainGeo,
      terrainMat,
      iceSlabGeo,
      iceSlabMat,
      jupiterGeo,
      jupiterMat,
      starsGeo,
      starsMat,
      plumeConeGeo,
      plumeMats,
      sprayGeo,
      sprayMat,
      busGeo,
      busMat,
      collarGeo,
      collarMat,
      louverGeo,
      darkMetalMat,
      wingGeo,
      wingMat,
      wingFrameGeo,
      boomGeo,
      dishGeo,
      dishMat,
      feedStrutGeo,
      feedHornGeo,
      legGeo,
      strutGeo,
      padGeo,
      legMat,
      mastGeo,
      camHeadGeo,
      lensGeo,
      lensMat,
      rtgGeo,
      aoGeo,
      aoMat,
    };
  }, [iceAlbedo, iceBump, jupiterMap, softParticle, kaptonGold, kaptonBump, hullMap, aeroBump, solarMap]);

  useEffect(() => {
    return () => {
      gpu.terrainGeo.dispose();
      gpu.terrainMat.dispose();
      gpu.iceSlabGeo.dispose();
      gpu.iceSlabMat.dispose();
      gpu.jupiterGeo.dispose();
      gpu.jupiterMat.dispose();
      gpu.starsGeo.dispose();
      gpu.starsMat.dispose();
      gpu.plumeConeGeo.dispose();
      gpu.plumeMats.forEach((m) => m.dispose());
      gpu.sprayGeo.dispose();
      gpu.sprayMat.dispose();
      gpu.busGeo.dispose();
      gpu.busMat.dispose();
      gpu.collarGeo.dispose();
      gpu.collarMat.dispose();
      gpu.louverGeo.dispose();
      gpu.darkMetalMat.dispose();
      gpu.wingGeo.dispose();
      gpu.wingMat.dispose();
      gpu.wingFrameGeo.dispose();
      gpu.boomGeo.dispose();
      gpu.dishGeo.dispose();
      gpu.dishMat.dispose();
      gpu.feedStrutGeo.dispose();
      gpu.feedHornGeo.dispose();
      gpu.legGeo.dispose();
      gpu.strutGeo.dispose();
      gpu.padGeo.dispose();
      gpu.legMat.dispose();
      gpu.mastGeo.dispose();
      gpu.camHeadGeo.dispose();
      gpu.lensGeo.dispose();
      gpu.lensMat.dispose();
      gpu.rtgGeo.dispose();
      gpu.aoGeo.dispose();
      gpu.aoMat.dispose();
    };
  }, [gpu]);

  useFrame((state, delta) => {
    if (!visible) return;
    const reduced = useAppStore.getState().reducedMotion;
    const elapsed = reduced ? 0 : state.clock.elapsedTime;
    for (let i = 0; i < gpu.plumeMats.length; i++) {
      gpu.plumeMats[i].uniforms.uTime.value = elapsed;
    }

    if (sprayRef.current) {
      const dt = reduced ? 0 : Math.min(Math.max(delta, 0.001), 0.05);
      const posAttr = gpu.sprayGeo.attributes.position as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      for (let i = 0; i < CRYSTAL_SPRAY_COUNT; i++) {
        let p = spraySeeds.phase[i] + dt * 0.24;
        if (p > 1.0) p -= 1.0;
        spraySeeds.phase[i] = p;
        const [ox, oy, oz] = geyserOrigins[spraySeeds.ventIdx[i]];
        const h = p * 23.0 - p * p * 4.5;
        arr[i * 3] = ox + spraySeeds.vx[i] * p * 3.1;
        arr[i * 3 + 1] = oy + h;
        arr[i * 3 + 2] = oz + spraySeeds.vz[i] * p * 3.1;
      }
      posAttr.needsUpdate = true;
    }
  });

  if (!visible) return null;

  const iceSpireCoords: Array<[number, number, number]> = [
    [-8.2, -4.8, 1.25],
    [9.4, -6.6, 1.48],
    [-14.2, -15.0, 2.15],
    [15.4, -14.2, 2.3],
    [-5.1, 5.1, 0.68],
    [6.4, 3.8, 0.78],
    [2.6, -10.5, 0.92],
  ];

  const groundY = europaHeight(0, 0);

  return (
    <group name="europa-surface-scene" position={[0, -0.6, 0]}>
      <ambientLight intensity={0.32} color="#93c5fd" />
      <directionalLight position={[42, 46, 38]} intensity={2.1} color="#f0f9ff" castShadow />
      <directionalLight position={[-25, 22, -65]} intensity={0.7} color="#fdba74" />

      <points geometry={gpu.starsGeo} material={gpu.starsMat} />

      {/* Authentic NASA-Textured Banded Jupiter Framed Cleanly Above Europa's Icy Horizon */}
      <mesh
        position={[-15, 14.5, -132]}
        rotation={[0.08, -0.55, 0.05]}
        geometry={gpu.jupiterGeo}
        material={gpu.jupiterMat}
      />

      {/* Fractured Sapphire-White Conamara Chaos Ice Terrain */}
      <mesh geometry={gpu.terrainGeo} material={gpu.terrainMat} receiveShadow />

      {/* 3 Volumetric Backlit Supersonic Cryogeyser Vapor Plumes + Ballistic Ice Crystal Spray */}
      {geyserOrigins.map(([gx, gy, gz], idx) => (
        <mesh
          key={`geyser-plume-${idx}`}
          position={[gx, gy, gz]}
          geometry={gpu.plumeConeGeo}
          material={gpu.plumeMats[idx]}
        />
      ))}
      <points ref={sprayRef} geometry={gpu.sprayGeo} material={gpu.sprayMat} frustumCulled={false} />

      {/* Smoothly Welded Glacial Ice Slabs */}
      {iceSpireCoords.map(([x, z, s], idx) => (
        <mesh
          key={`ice-slab-${idx}`}
          position={[x, europaHeight(x, z) + s * 0.16, z]}
          rotation={[0.08 * idx, idx * 1.15, 0.06]}
          scale={[s * 1.28, s * 0.76, s * 1.05]}
          geometry={gpu.iceSlabGeo}
          material={gpu.iceSlabMat}
          castShadow
          receiveShadow
        />
      ))}

      {/* Cinema-Detail NASA Europa Clipper Cryo-Lander */}
      <group position={[0, groundY + 1.16, 0]} rotation={[0, -0.45, 0]}>
        <mesh position={[0, -1.12, 0]} rotation={[-Math.PI / 2, 0, 0]} geometry={gpu.aoGeo} material={gpu.aoMat} />
        <mesh geometry={gpu.busGeo} material={gpu.busMat} castShadow />
        <mesh position={[0, 0.49, 0]} geometry={gpu.collarGeo} material={gpu.collarMat} castShadow />
        <mesh position={[0, -0.49, 0]} geometry={gpu.collarGeo} material={gpu.collarMat} castShadow />

        {/* Recessed Side Avionics Louvers & Rear RTG Power Core */}
        <mesh position={[0, 0.02, 1.03]} geometry={gpu.louverGeo} material={gpu.darkMetalMat} />
        <mesh position={[0, 0.02, -1.03]} geometry={gpu.louverGeo} material={gpu.darkMetalMat} />
        <mesh position={[-1.12, 0.1, -0.45]} rotation={[0.25, 0, 0.9]} geometry={gpu.rtgGeo} material={gpu.darkMetalMat} />

        {/* Metallic Solar-Array Boom + Framed Sunlit Photovoltaic Wings */}
        <mesh position={[0, 0.24, 0]} rotation={[0, 0, Math.PI / 2]} geometry={gpu.boomGeo} material={gpu.legMat} />
        <group position={[-2.52, 0.24, 0]}>
          <mesh geometry={gpu.wingFrameGeo} material={gpu.darkMetalMat} castShadow />
          <mesh position={[0, 0.02, 0]} geometry={gpu.wingGeo} material={gpu.wingMat} />
        </group>
        <group position={[2.52, 0.24, 0]}>
          <mesh geometry={gpu.wingFrameGeo} material={gpu.darkMetalMat} castShadow />
          <mesh position={[0, 0.02, 0]} geometry={gpu.wingGeo} material={gpu.wingMat} />
        </group>

        {/* High-Gain Parabolic Dish with 3-Strut Feed Tripod & Gold Feed Horn */}
        <group position={[-0.22, 1.05, -0.1]} rotation={[0.15, 0.35, -0.22]}>
          <mesh rotation={[Math.PI, 0, 0]} geometry={gpu.dishGeo} material={gpu.dishMat} />
          <mesh position={[0, 0.32, 0]} geometry={gpu.feedHornGeo} material={gpu.busMat} />
          {[0, 1, 2].map((si) => {
            const ang = (si * Math.PI * 2) / 3;
            return (
              <mesh
                key={`feed-strut-${si}`}
                position={[Math.cos(ang) * 0.28, 0.1, Math.sin(ang) * 0.28]}
                rotation={[Math.sin(ang) * 0.65, 0, -Math.cos(ang) * 0.65]}
                geometry={gpu.feedStrutGeo}
                material={gpu.legMat}
              />
            );
          })}
        </group>

        {/* Articulated Stereo Mastcam Optics Mast with Sapphire Lenses */}
        <mesh position={[0.58, 1.08, 0.36]} geometry={gpu.mastGeo} material={gpu.legMat} />
        <group position={[0.58, 1.78, 0.36]} rotation={[0, 0.42, 0]}>
          <mesh geometry={gpu.camHeadGeo} material={gpu.collarMat} />
          <mesh position={[-0.08, 0, 0.14]} rotation={[Math.PI / 2, 0, 0]} geometry={gpu.lensGeo} material={gpu.lensMat} />
          <mesh position={[0.08, 0, 0.14]} rotation={[Math.PI / 2, 0, 0]} geometry={gpu.lensGeo} material={gpu.lensMat} />
        </group>

        {/* 4 Articulated Truss Landing Legs + Cross Dampers + Snowshoe Ice Pads */}
        {[0, 1, 2, 3].map((li) => {
          const a = (li * Math.PI) / 2 + Math.PI / 4;
          return (
            <group key={`eu-leg-${li}`}>
              <mesh
                position={[Math.cos(a) * 1.16, -0.7, Math.sin(a) * 1.16]}
                rotation={[Math.sin(a) * 0.38, 0, -Math.cos(a) * 0.38]}
                geometry={gpu.legGeo}
                material={gpu.legMat}
              />
              <mesh
                position={[Math.cos(a) * 0.92, -0.52, Math.sin(a) * 0.92]}
                rotation={[-Math.sin(a) * 0.62, 0, Math.cos(a) * 0.62]}
                geometry={gpu.strutGeo}
                material={gpu.darkMetalMat}
              />
              <mesh
                position={[Math.cos(a) * 1.54, -1.12, Math.sin(a) * 1.54]}
                geometry={gpu.padGeo}
                material={gpu.collarMat}
              />
            </group>
          );
        })}
      </group>
    </group>
  );
};

export default EuropaSurfaceScene;
