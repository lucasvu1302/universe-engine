import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AssetManager } from '@/engine/assets/AssetManager';

interface MarsSurfaceSceneProps {
  visible: boolean;
}

function hash2D(ix: number, iz: number): number {
  const s = Math.sin(ix * 127.1 + iz * 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

function valueNoise2D(x: number, z: number): number {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const ux = fx * fx * (3.0 - 2.0 * fx);
  const uz = fz * fz * (3.0 - 2.0 * fz);
  const a = hash2D(ix, iz);
  const b = hash2D(ix + 1, iz);
  const c = hash2D(ix, iz + 1);
  const d = hash2D(ix + 1, iz + 1);
  return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
}

function ridgedMarsFbm(x: number, z: number): number {
  let sum = 0.0;
  let amp = 0.55;
  let freq = 1.0;
  for (let i = 0; i < 5; i++) {
    const n = 1.0 - Math.abs(valueNoise2D(x * freq, z * freq) * 2.0 - 1.0);
    sum += n * n * amp;
    freq *= 2.07;
    amp *= 0.48;
  }
  return sum;
}

function getMarsTerrainHeight(x: number, z: number): number {
  const dist = Math.hypot(x, z);
  const landingFlatten = THREE.MathUtils.smoothstep(dist, 5.2, 23.0);

  const fbmMacro = (ridgedMarsFbm(x * 0.024 + 3.1, z * 0.024 - 1.7) - 0.45) * 8.2;
  const aeolianRipples =
    Math.sin(x * 0.45 + z * 0.22 + valueNoise2D(x * 0.12, z * 0.12) * 2.6) * 0.14;
  const canyonPass = 0.34 + 0.66 * THREE.MathUtils.smoothstep(Math.abs(x - 16.0), 9.0, 50.0);
  const deltaMesa =
    z < -30.0
      ? THREE.MathUtils.smoothstep(-z, 30.0, 105.0) *
        (7.5 + ridgedMarsFbm(x * 0.036, z * 0.036) * 10.5) *
        canyonPass
      : 0.0;
  const craterRim = THREE.MathUtils.smoothstep(dist, 76.0, 150.0) * 12.0 * canyonPass;

  return (
    -0.55 +
    aeolianRipples * 0.5 +
    (fbmMacro + aeolianRipples * 0.5 + deltaMesa + craterRim) * landingFlatten
  );
}

function createFracturedMartianRockGeo(): THREE.BufferGeometry {
  // High-detail indexed 1,280-triangle geological boulder with ridged sedimentary ledges
  const geo = new THREE.IcosahedronGeometry(1.0, 3);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const uv = geo.attributes.uv as THREE.BufferAttribute;
  // Angular geological cleavage planes (slices rounded dome into real fractured Jezero basalt slabs)
  const planes: Array<[number, number, number, number]> = [
    [0.72, 0.56, 0.41, 0.78],
    [-0.68, 0.58, 0.45, 0.76],
    [0.18, 0.75, -0.64, 0.74],
    [-0.42, 0.48, -0.77, 0.79],
    [0.84, 0.25, -0.48, 0.82],
    [-0.81, 0.31, 0.49, 0.81],
  ];
  const colors = new Float32Array(pos.count * 3);
  const darkBasalt = new THREE.Color('#3b1f16');
  const midBasalt = new THREE.Color('#6b3826');
  const topDust = new THREE.Color('#b86b43');
  const tmpCol = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i);
    const vy = pos.getY(i);
    const vz = pos.getZ(i);
    const strata = 1.0 + 0.1 * Math.sin(vy * 14.0 + vx * 3.0);
    let rClip = 1.08;
    for (let p = 0; p < planes.length; p++) {
      const [nx, ny, nz, d] = planes[p];
      const dot = vx * nx + vy * ny + vz * nz;
      if (dot > 0.15) {
        rClip = Math.min(rClip, d / dot);
      }
    }
    const crag =
      0.84 +
      0.24 * ridgedMarsFbm(vx * 2.8 + vz * 1.6 + 4.7, vz * 2.8 - vy * 2.1 + 7.9) +
      0.09 * valueNoise2D(vx * 9.5, vz * 9.5);
    const rad = Math.min(rClip, 1.05) * crag;
    const bottomEmbed = vy < -0.2 ? 0.52 : 1.0;
    pos.setXYZ(i, vx * strata * rad, vy * bottomEmbed * rad, vz * strata * rad);

    // Dust-mantled top surfaces vs dark freshly cleaved basalt faces
    const dustFactor = THREE.MathUtils.smoothstep(vy, -0.15, 0.65);
    tmpCol.copy(darkBasalt).lerp(midBasalt, crag - 0.65).lerp(topDust, dustFactor * 0.68);
    colors[i * 3] = tmpCol.r;
    colors[i * 3 + 1] = tmpCol.g;
    colors[i * 3 + 2] = tmpCol.b;
  }
  if (uv) {
    for (let i = 0; i < uv.count; i++) {
      const vx = pos.getX(i);
      const vy = pos.getY(i);
      const vz = pos.getZ(i);
      uv.setXY(i, (vx + vz) * 0.16 + 0.5, (vy + vz * 0.5) * 0.16 + 0.5);
    }
    uv.needsUpdate = true;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

const MARS_SKY_VERT = /* glsl */ `
  varying vec3 vWorldDir;
  void main() {
    vWorldDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const MARS_SKY_FRAG = /* glsl */ `
  precision highp float;
  uniform vec3 uSunDir;
  varying vec3 vWorldDir;

  void main() {
    vec3 dir = normalize(vWorldDir);
    float elev = clamp(dir.y, -0.15, 1.0);

    // Authentic NASA Curiosity/Perseverance butterscotch dust zenith -> warm salmon-ochre horizon
    vec3 zenithCol = vec3(0.36, 0.20, 0.13);
    vec3 midSkyCol = vec3(0.66, 0.40, 0.26);
    vec3 horizonCol = vec3(0.78, 0.53, 0.37);

    vec3 sky = mix(horizonCol, midSkyCol, smoothstep(-0.02, 0.26, elev));
    sky = mix(sky, zenithCol, smoothstep(0.24, 0.85, elev));

    // Signature Martian steel-blue Mie forward-scattering veil compressed below Bloom threshold (0.78)
    // so post-processing never explodes into a giant white nuclear fireball!
    float sunCos = max(dot(dir, normalize(uSunDir)), 0.0);
    float blueMieVeil = pow(sunCos, 12.0) * 0.52 + pow(sunCos, 75.0) * 0.42;
    float solarCorona = pow(sunCos, 520.0) * 0.38;
    float solarDisc = smoothstep(0.99988, 0.99998, sunCos);

    vec3 mieBlue = vec3(0.52, 0.72, 0.90);
    sky = mix(sky, mieBlue, clamp(blueMieVeil * 0.74, 0.0, 0.78));
    sky += vec3(0.58, 0.70, 0.84) * solarCorona;
    sky = (sky / (1.0 + sky * 0.48)) * 0.84;

    // Compact ~0.5° Martian solar pearl right above the Jezero rim
    sky += vec3(1.12, 1.16, 1.24) * solarDisc;

    gl_FragColor = vec4(sky, 1.0);
  }
`;

export const MarsSurfaceScene: React.FC<MarsSurfaceSceneProps> = ({ visible }) => {
  const rootRef = useRef<THREE.Group>(null);
  const dustParticlesRef = useRef<THREE.Points>(null);

  const assets = useMemo(() => AssetManager.getInstance(), []);
  const regolithAlbedoMap = useMemo(() => assets.getRegolithAlbedoMap('mars'), [assets]);
  const regolithBumpMap = useMemo(() => assets.getRegolithBumpMap('mars'), [assets]);
  const softParticleMap = useMemo(() => assets.getSoftParticleMap(), [assets]);
  const hullMap = useMemo(() => assets.getAerospaceHullMap(), [assets]);
  const aeroBumpMap = useMemo(() => assets.getAerospaceBumpMap(), [assets]);
  const kaptonGoldMap = useMemo(() => assets.getKaptonFoilMap('gold'), [assets]);
  const kaptonBumpMap = useMemo(() => assets.getKaptonBumpMap(), [assets]);

  const sunDir = useMemo(() => new THREE.Vector3(0.14, 0.125, -0.98).normalize(), []);
  const skyUniforms = useMemo(() => ({ uSunDir: { value: sunDir } }), [sunDir]);
  const fracturedRockGeo = useMemo(
    () => (visible ? createFracturedMartianRockGeo() : null),
    [visible]
  );

  // 1. High-resolution smooth FBM Jezero Crater Terrain with Mineral Vertex Colors + Micro-Grit Maps
  const terrainGeo = useMemo(() => {
    if (!visible) return null;
    const geo = new THREE.PlaneGeometry(320, 320, 160, 160);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    const rustLow = new THREE.Color('#8c3b1e');
    const ochreMid = new THREE.Color('#c4683c');
    const basaltOutcrop = new THREE.Color('#543225');
    const dustCrest = new THREE.Color('#dda072');
    const tmpCol = new THREE.Color();

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = getMarsTerrainHeight(x, z);
      pos.setY(i, y);

      const mineralPatch = valueNoise2D(x * 0.09 + 7.2, z * 0.09 - 4.1);
      const heightBlend = THREE.MathUtils.clamp((y + 2.5) / 13.0, 0.0, 1.0);
      tmpCol.copy(rustLow).lerp(ochreMid, heightBlend);
      if (mineralPatch > 0.6) {
        tmpCol.lerp(basaltOutcrop, (mineralPatch - 0.6) * 1.8);
      } else if (mineralPatch < 0.35) {
        tmpCol.lerp(dustCrest, (0.35 - mineralPatch) * 1.35);
      }
      colors[i * 3] = tmpCol.r;
      colors[i * 3 + 1] = tmpCol.g;
      colors[i * 3 + 2] = tmpCol.b;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    return geo;
  }, [visible]);

  // 2. Deterministic Terrain-Embedded Stratified Martian Basalt Boulders & Pebbles
  const boulders = useMemo(() => {
    if (!visible) return [];
    const specs: Array<[number, number, number, number]> = [
      [-5.6, 3.8, 0.62, 0.4],
      [6.4, 3.1, 0.74, 1.2],
      [-9.8, -5.8, 1.15, 2.1],
      [11.8, -8.4, 1.38, 0.8],
      [-3.8, -9.5, 0.68, 1.7],
      [2.55, 1.65, 0.36, 0.9], // Target bedrock outcrop beneath Perseverance's coring drill
      [-1.8, 5.4, 0.28, 2.4],
      [3.9, 5.8, 0.25, 0.3],
      [-22.0, -21.0, 2.4, 2.6],
      [25.0, -25.0, 2.7, 1.4],
      [-36.0, -40.0, 3.8, 0.5],
      [39.0, -46.0, 4.2, 2.9],
      [-14.5, -31.0, 1.85, 1.1],
      [17.5, 8.2, 0.92, 2.3],
    ];
    return specs.map(([x, z, s, rot]) => ({
      x,
      y: getMarsTerrainHeight(x, z) + s * 0.18,
      z,
      s,
      rot,
    }));
  }, [visible]);

  // 3. Soft Atmospheric Martian Dust Motes
  const dustData = useMemo(() => {
    if (!visible) return null;
    const count = 1800;
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r1 = hash2D(i, 11);
      const r2 = hash2D(i, 29);
      const r3 = hash2D(i, 47);
      positions[i * 3] = (r1 - 0.5) * 220;
      positions[i * 3 + 1] = r2 * 28;
      positions[i * 3 + 2] = (r3 - 0.5) * 220;

      velocities[i * 3] = 0.7 + hash2D(i, 71) * 0.55;
      velocities[i * 3 + 1] = (hash2D(i, 89) - 0.5) * 0.08;
      velocities[i * 3 + 2] = (hash2D(i, 103) - 0.5) * 0.25;
    }
    return { positions, velocities };
  }, [visible]);

  // Deterministic GPU cleanup (INV2: disposes ALL component-owned geometries & materials)
  useEffect(() => {
    const root = rootRef.current;
    const dustPts = dustParticlesRef.current;
    return () => {
      terrainGeo?.dispose();
      fracturedRockGeo?.dispose();
      dustPts?.geometry?.dispose();
      (dustPts?.material as THREE.Material | undefined)?.dispose();
      root?.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.isMesh) {
          if (mesh.geometry !== terrainGeo && mesh.geometry !== fracturedRockGeo) {
            mesh.geometry?.dispose();
          }
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose());
          } else {
            mesh.material?.dispose();
          }
        }
      });
    };
  }, [terrainGeo, fracturedRockGeo]);

  useFrame((_, delta) => {
    if (!visible || !dustData || !dustParticlesRef.current) return;
    const posAttr = dustParticlesRef.current.geometry.attributes.position;
    const pos = posAttr.array as Float32Array;
    for (let i = 0; i < pos.length / 3; i++) {
      pos[i * 3] += dustData.velocities[i * 3] * delta * 11.0;
      pos[i * 3 + 1] += dustData.velocities[i * 3 + 1] * delta * 4.0;
      pos[i * 3 + 2] += dustData.velocities[i * 3 + 2] * delta * 4.0;

      if (pos[i * 3] > 110) pos[i * 3] = -110;
      if (pos[i * 3 + 1] > 28) pos[i * 3 + 1] = 0.4;
      if (pos[i * 3 + 1] < 0.2) pos[i * 3 + 1] = 24;
    }
    posAttr.needsUpdate = true;
  });

  if (!visible || !terrainGeo || !fracturedRockGeo || !dustData) return null;

  const roverGroundY = getMarsTerrainHeight(0, 0);

  return (
    <group ref={rootRef} position={[0, -0.8, 0]}>
      <fogExp2 attach="fog" args={['#b86d46', 0.0078]} />

      {/* Rayleigh/Mie Martian Sunset Sky Dome */}
      <mesh>
        <sphereGeometry args={[290, 48, 32]} />
        <shaderMaterial
          vertexShader={MARS_SKY_VERT}
          fragmentShader={MARS_SKY_FRAG}
          uniforms={skyUniforms}
          side={THREE.BackSide}
          depthWrite={false}
          fog={false}
        />
      </mesh>

      {/* High-Detail Shadow-Receiving Jezero Crater Regolith (56x56 Micro-Grit Albedo + Bump) */}
      <mesh geometry={terrainGeo} receiveShadow>
        <meshStandardMaterial
          vertexColors
          map={regolithAlbedoMap}
          bumpMap={regolithBumpMap}
          bumpScale={0.14}
          roughness={0.95}
          metalness={0.03}
        />
      </mesh>

      {/* Soft Gaussian Atmospheric Martian Dust Motes */}
      <points ref={dustParticlesRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[dustData.positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          map={softParticleMap}
          size={0.72}
          color="#eab082"
          transparent
          opacity={0.26}
          depthWrite={false}
        />
      </points>

      {/* Shadow-Casting Low-Angle Martian Sunset Key Light + Warm Ochre Sky Bounce */}
      <directionalLight
        position={[32, 34, -145]}
        intensity={2.35}
        color="#ffe0c8"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={10}
        shadow-camera-far={240}
        shadow-camera-left={-18}
        shadow-camera-right={18}
        shadow-camera-top={18}
        shadow-camera-bottom={-18}
        shadow-bias={-0.0004}
      />
      <directionalLight position={[-48, 30, 85]} intensity={0.62} color="#e08e5e" />
      <ambientLight intensity={0.34} color="#8c4425" />

      {/* 1,280-Tri Craggy Fractured Basalt Boulders + Soft Ground Contact AO */}
      {boulders.map((b, idx) => (
        <group key={`mars-boulder-${idx}`} position={[b.x, b.y - b.s * 0.08, b.z]}>
          <mesh
            geometry={fracturedRockGeo}
            rotation={[0.08 * idx, b.rot, 0.05 * idx]}
            scale={[b.s * 1.32, b.s * 0.64, b.s * 1.12]}
            castShadow
            receiveShadow
          >
            <meshStandardMaterial
              vertexColors
              map={regolithAlbedoMap}
              bumpMap={regolithBumpMap}
              bumpScale={0.18}
              color="#ffffff"
              roughness={0.95}
              metalness={0.04}
            />
          </mesh>
          <mesh position={[0, -b.s * 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[b.s * 2.8, b.s * 2.4]} />
            <meshBasicMaterial
              map={softParticleMap}
              color="#261008"
              transparent
              opacity={0.44}
              depthWrite={false}
            />
          </mesh>
        </group>
      ))}

      {/* ---------------------------------------------------- */}
      {/* NASA PERSEVERANCE (MARS 2020) ARTICULATED ROVER      */}
      {/* ---------------------------------------------------- */}
      <group position={[0, roverGroundY, 0]} rotation={[0, -0.58, 0]} scale={0.96}>
        {/* Twin Compressed Rover Wheel Track Ruts Trailing Across Martian Sand */}
        {[-1.18, 1.18].map((tz) => (
          <mesh
            key={`rover-rut-${tz}`}
            position={[-4.2, 0.02, tz]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <planeGeometry args={[7.2, 0.42]} />
            <meshBasicMaterial
              map={softParticleMap}
              color="#3b190d"
              transparent
              opacity={0.42}
              depthWrite={false}
            />
          </mesh>
        ))}

        {/* Under-Chassis Soft Contact AO Shadow */}
        <mesh position={[0, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[4.2, 3.2]} />
          <meshBasicMaterial
            map={softParticleMap}
            color="#240e06"
            transparent
            opacity={0.48}
            depthWrite={false}
          />
        </mesh>

        {/* 1. Authentic Slimmed Warm Electronics Box (WEB) Chassis Perched High Above Ground */}
        <mesh position={[0, 1.12, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.28, 0.58, 1.56]} />
          <meshStandardMaterial
            map={hullMap}
            bumpMap={aeroBumpMap}
            bumpScale={0.022}
            color="#f1f5f9"
            metalness={0.44}
            roughness={0.34}
          />
        </mesh>
        {/* Gold Kapton Belly Thermal Pan & Side Louvered Avionics Bays */}
        <mesh position={[0, 0.88, 0]} castShadow>
          <boxGeometry args={[2.08, 0.16, 1.48]} />
          <meshStandardMaterial
            map={kaptonGoldMap}
            bumpMap={kaptonBumpMap}
            bumpScale={0.03}
            metalness={0.9}
            roughness={0.22}
          />
        </mesh>
        {/* Forward Stereo Hazcam Baffle Bar & Bit Carousel */}
        <mesh position={[1.18, 1.04, -0.18]} castShadow>
          <boxGeometry args={[0.14, 0.22, 0.78]} />
          <meshStandardMaterial color="#1e293b" metalness={0.86} roughness={0.28} />
        </mesh>
        <mesh position={[1.18, 1.0, 0.36]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.18, 0.2, 0.14, 16]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.78} roughness={0.28} />
        </mesh>

        {/* Top Deck Equipment: Differential Bar, X-Band Hex HGA, MEDA Boom & UHF Whip */}
        <mesh position={[0.08, 1.46, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.038, 0.038, 2.22, 12]} />
          <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.24} />
        </mesh>
        <mesh position={[-0.48, 1.62, -0.42]} rotation={[0.35, 0.4, 0]} castShadow>
          <cylinderGeometry args={[0.24, 0.24, 0.05, 6]} />
          <meshStandardMaterial map={kaptonGoldMap} metalness={0.92} roughness={0.2} />
        </mesh>
        <mesh position={[-0.78, 1.82, 0.48]} castShadow>
          <cylinderGeometry args={[0.03, 0.04, 0.85, 10]} />
          <meshStandardMaterial color="#0f172a" metalness={0.85} roughness={0.3} />
        </mesh>

        {/* 2. Angled Rear Finned Plutonium MMRTG Power Source */}
        <group position={[-1.48, 1.28, 0]} rotation={[0, 0, -0.48]}>
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.26, 0.28, 0.98, 16]} />
            <meshStandardMaterial
              color="#e2e8f0"
              emissive="#9a3412"
              emissiveIntensity={0.14}
              metalness={0.62}
              roughness={0.34}
            />
          </mesh>
          {[0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4].map((fa, fi) => (
            <mesh key={`mmrtg-fin-${fi}`} rotation={[fa, 0, 0]} castShadow>
              <boxGeometry args={[0.92, 0.72, 0.025]} />
              <meshStandardMaterial color="#f8fafc" metalness={0.55} roughness={0.36} />
            </mesh>
          ))}
        </group>

        {/* 3. Remote Sensing Mast (SuperCam Cyclops Laser + Mastcam-Z Visor + Cable Harness) */}
        <group position={[0.84, 1.42, -0.46]}>
          <mesh position={[0, 0.62, 0]} castShadow>
            <cylinderGeometry args={[0.062, 0.078, 1.25, 14]} />
            <meshStandardMaterial color="#e2e8f0" metalness={0.72} roughness={0.28} />
          </mesh>
          {/* Gold Kapton Avionics Cable Harness Spiraling Up Mast */}
          <mesh position={[-0.055, 0.6, 0.03]} castShadow>
            <cylinderGeometry args={[0.018, 0.018, 1.18, 8]} />
            <meshStandardMaterial map={kaptonGoldMap} metalness={0.88} roughness={0.25} />
          </mesh>
          <group position={[0, 1.32, 0]} rotation={[0, 0.36, 0]}>
            <mesh castShadow>
              <boxGeometry args={[0.38, 0.32, 0.52]} />
              <meshStandardMaterial color="#f8fafc" metalness={0.48} roughness={0.3} />
            </mesh>
            {/* Masthead Sun-Visor Brow */}
            <mesh position={[0.16, 0.17, 0]}>
              <boxGeometry args={[0.18, 0.03, 0.54]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.7} roughness={0.28} />
            </mesh>
            <mesh position={[0.2, 0.05, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.095, 0.095, 0.07, 20]} />
              <meshPhysicalMaterial color="#090d16" metalness={0.9} roughness={0.05} clearcoat={1.0} />
            </mesh>
            {[-0.16, 0.16].map((mz) => (
              <mesh key={`mastcam-${mz}`} position={[0.2, -0.09, mz]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.044, 0.044, 0.06, 14]} />
                <meshPhysicalMaterial color="#020617" metalness={0.95} roughness={0.05} clearcoat={1.0} />
              </mesh>
            ))}
          </group>
        </group>

        {/* 4. Hierarchically Connected 5-DOF Robotic Arm & Coring Drill Turret */}
        <group position={[1.16, 1.02, 0.38]} rotation={[0, -0.16, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.13, 14, 14]} />
            <meshStandardMaterial color="#334155" metalness={0.88} roughness={0.24} />
          </mesh>
          <group rotation={[0, 0, -1.22]}>
            <mesh position={[0, 0.5, 0]} castShadow>
              <cylinderGeometry args={[0.045, 0.055, 1.0, 12]} />
              <meshStandardMaterial color="#e2e8f0" metalness={0.65} roughness={0.3} />
            </mesh>
            <group position={[0, 1.0, 0]} rotation={[0, 0, -1.16]}>
              <mesh castShadow>
                <sphereGeometry args={[0.11, 14, 14]} />
                <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.22} />
              </mesh>
              <mesh position={[0, 0.46, 0]} castShadow>
                <cylinderGeometry args={[0.042, 0.048, 0.92, 12]} />
                <meshStandardMaterial color="#f1f5f9" metalness={0.65} roughness={0.3} />
              </mesh>
              <group position={[0, 0.96, 0]} rotation={[0, 0, 2.38]}>
                <mesh castShadow>
                  <cylinderGeometry args={[0.21, 0.21, 0.24, 16]} />
                  <meshStandardMaterial color="#1e293b" metalness={0.86} roughness={0.28} />
                </mesh>
                <mesh position={[0, -0.2, 0]} castShadow>
                  <cylinderGeometry args={[0.024, 0.04, 0.24, 10]} />
                  <meshStandardMaterial color="#cbd5e1" metalness={0.95} roughness={0.15} />
                </mesh>
              </group>
            </group>
          </group>
        </group>

        {/* 5. Articulated Dark-Titanium Rocker-Bogie Suspension & 6 Cleated Aluminum Wheels */}
        {[-1, 1].map((sideSign) => {
          const zSide = sideSign * 1.18;
          return (
            <group key={`rockerBogie-${sideSign}`} name="rockerBogie">
              {/* Differential Chassis Pivot Hub */}
              <mesh position={[0.1, 1.12, sideSign * 0.92]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                <cylinderGeometry args={[0.11, 0.11, 0.34, 16]} />
                <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.24} />
              </mesh>

              {/* Tall Forward Titanium Rocker Tube -> Front Vertical Steering Strut */}
              <mesh position={[0.72, 0.9, zSide]} rotation={[0, 0, -0.34]} castShadow>
                <cylinderGeometry args={[0.045, 0.045, 1.36, 12]} />
                <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.24} />
              </mesh>
              <mesh position={[1.32, 0.56, zSide]} castShadow>
                <cylinderGeometry args={[0.042, 0.042, 0.42, 12]} />
                <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.22} />
              </mesh>

              {/* Rear Rocker Link -> Bogie Pivot Joint -> Fore/Aft Bogie Struts */}
              <mesh position={[-0.32, 0.95, zSide]} rotation={[0, 0, 0.38]} castShadow>
                <cylinderGeometry args={[0.045, 0.045, 0.98, 12]} />
                <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.24} />
              </mesh>
              <mesh position={[-0.76, 0.76, zSide]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                <cylinderGeometry args={[0.085, 0.085, 0.16, 14]} />
                <meshStandardMaterial map={kaptonGoldMap} metalness={0.9} roughness={0.22} />
              </mesh>
              <mesh position={[-0.38, 0.58, zSide]} rotation={[0, 0, -0.42]} castShadow>
                <cylinderGeometry args={[0.04, 0.04, 0.88, 10]} />
                <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.24} />
              </mesh>
              <mesh position={[-1.12, 0.58, zSide]} rotation={[0, 0, 0.42]} castShadow>
                <cylinderGeometry args={[0.04, 0.04, 0.88, 10]} />
                <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.24} />
              </mesh>

              {/* 3 Machined Cleated Aluminum Wheels per Side (r = 0.36) */}
              {[-1.44, -0.06, 1.32].map((wx, wi) => (
                <group key={`wheel-${sideSign}-${wi}`} position={[wx, 0.36, zSide]}>
                  <mesh rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
                    <cylinderGeometry args={[0.36, 0.36, 0.32, 32, 1, true]} />
                    <meshStandardMaterial
                      color="#27272a"
                      bumpMap={aeroBumpMap}
                      bumpScale={0.06}
                      metalness={0.76}
                      roughness={0.44}
                      side={THREE.DoubleSide}
                    />
                  </mesh>
                  <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
                    <cylinderGeometry args={[0.12, 0.12, 0.3, 16]} />
                    <meshStandardMaterial map={kaptonGoldMap} metalness={0.9} roughness={0.22} />
                  </mesh>
                  {[0, Math.PI / 3, (2 * Math.PI) / 3].map((sa, si) => (
                    <mesh key={`spoke-${si}`} rotation={[0, 0, sa + 0.2]} castShadow>
                      <boxGeometry args={[0.66, 0.032, 0.1]} />
                      <meshStandardMaterial color="#cbd5e1" metalness={0.88} roughness={0.24} />
                    </mesh>
                  ))}
                </group>
              ))}
            </group>
          );
        })}
      </group>
    </group>
  );
};
