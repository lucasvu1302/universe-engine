import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { AssetManager } from '@/engine/assets/AssetManager';
import { StarField } from '@/entities/StarField/StarField';
import earthGroundVert from '@/shaders/earth/earthGround.vert.glsl';
import earthGroundFrag from '@/shaders/earth/earthGround.frag.glsl';
import atmosphereVert from '@/shaders/atmosphere/atmosphere.vert.glsl';
import atmosphereFrag from '@/shaders/atmosphere/atmosphere.frag.glsl';

interface MoonSurfaceSceneProps {
  visible: boolean;
}

function lunarHash(ix: number, iz: number): number {
  const s = Math.sin(ix * 127.1 + iz * 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

function lunarNoise(x: number, z: number): number {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const ux = fx * fx * (3.0 - 2.0 * fx);
  const uz = fz * fz * (3.0 - 2.0 * fz);
  const a = lunarHash(ix, iz);
  const b = lunarHash(ix + 1, iz);
  const c = lunarHash(ix, iz + 1);
  const d = lunarHash(ix + 1, iz + 1);
  return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
}

function lunarFbm(x: number, z: number): number {
  let v = 0.0;
  let amp = 0.5;
  let freq = 1.0;
  for (let i = 0; i < 5; i++) {
    v += lunarNoise(x * freq, z * freq) * amp;
    freq *= 2.04;
    amp *= 0.5;
  }
  return v;
}

const CRATERS: Array<[number, number, number, number]> = [
  [-18, -24, 14.0, 2.8],
  [22, -32, 19.0, 3.6],
  [-42, -55, 28.0, 5.2],
  [48, -68, 32.0, 5.8],
  [8, -14, 5.8, 0.95],
  [-9, 5.5, 4.2, 0.68],
  [12, 6.8, 3.6, 0.55],
  [-28, 12, 11.0, 1.9],
  [34, 8, 13.5, 2.3],
  [0, -48, 16.0, 3.1],
  [-65, -18, 24.0, 4.2],
  [68, -22, 22.0, 3.9],
];

function craterBowl(dist: number, radius: number, depth: number): number {
  const rNorm = dist / radius;
  if (rNorm >= 1.45) return 0.0;
  if (rNorm < 1.0) {
    return -depth * (1.0 - rNorm * rNorm);
  }
  const rimT = (rNorm - 1.0) / 0.45;
  return depth * 0.28 * Math.sin(Math.PI * (1.0 - rimT)) * (1.0 - rimT);
}

function getLunarElevation(x: number, z: number): number {
  const distOrigin = Math.hypot(x + 1.2, z + 0.8);
  const padFlatten = THREE.MathUtils.smoothstep(distOrigin, 4.2, 13.5);

  let h = (lunarFbm(x * 0.025 + 4.2, z * 0.025 - 2.9) - 0.5) * 4.8;
  h += (lunarFbm(x * 0.14, z * 0.14) - 0.5) * 0.42;

  for (let i = 0; i < CRATERS.length; i++) {
    const [cx, cz, cr, cd] = CRATERS[i];
    const d = Math.hypot(x - cx, z - cz);
    h += craterBowl(d, cr, cd);
  }

  if (z < -70) {
    h += THREE.MathUtils.smoothstep(-z, 70, 145) * (7.5 + lunarFbm(x * 0.04, z * 0.04) * 8.5);
  }

  return -0.65 + h * padFlatten;
}

function createFracturedLunarBoulderGeo(): THREE.BufferGeometry {
  // High-detail 1,280-triangle angular fractured Apollo 11 lunar breccia/basalt boulder
  const geo = new THREE.IcosahedronGeometry(1.0, 3);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const uv = geo.attributes.uv as THREE.BufferAttribute;
  const planes: Array<[number, number, number, number]> = [
    [0.74, 0.52, 0.42, 0.75],
    [-0.7, 0.56, 0.44, 0.74],
    [0.2, 0.76, -0.62, 0.72],
    [-0.44, 0.46, -0.77, 0.78],
    [0.83, 0.28, -0.48, 0.8],
    [-0.79, 0.34, 0.51, 0.79],
    [0.12, 0.92, 0.37, 0.76],
  ];
  const colors = new Float32Array(pos.count * 3);
  const darkBreccia = new THREE.Color('#343942');
  const midAnorthosite = new THREE.Color('#6b7280');
  const dustMantle = new THREE.Color('#a1a8b5');
  const tmpCol = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i);
    const vy = pos.getY(i);
    const vz = pos.getZ(i);
    let rClip = 1.08;
    for (let p = 0; p < planes.length; p++) {
      const [nx, ny, nz, d] = planes[p];
      const dot = vx * nx + vy * ny + vz * nz;
      if (dot > 0.14) {
        rClip = Math.min(rClip, d / dot);
      }
    }
    const crag =
      0.82 +
      0.26 * lunarFbm(vx * 3.1 + vz * 1.8 + 3.7, vz * 3.1 - vy * 2.2 + 6.9) +
      0.1 * lunarNoise(vx * 10.5, vz * 10.5);
    const rad = Math.min(rClip, 1.04) * crag;
    const flatBase = vy < -0.2 ? 0.5 : 1.0;
    pos.setXYZ(i, vx * rad, vy * flatBase * rad, vz * rad);

    const dustFactor = THREE.MathUtils.smoothstep(vy, -0.18, 0.62);
    tmpCol.copy(darkBreccia).lerp(midAnorthosite, crag - 0.65).lerp(dustMantle, dustFactor * 0.66);
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

export const MoonSurfaceScene: React.FC<MoonSurfaceSceneProps> = ({ visible }) => {
  const rootRef = useRef<THREE.Group>(null);
  const assets = useMemo(() => AssetManager.getInstance(), []);

  const moonRegolithAlbedo = useMemo(() => assets.getRegolithAlbedoMap('moon'), [assets]);
  const moonRegolithBump = useMemo(() => assets.getRegolithBumpMap('moon'), [assets]);
  const kaptonGoldMap = useMemo(() => assets.getKaptonFoilMap('gold'), [assets]);
  const kaptonSilverMap = useMemo(() => assets.getKaptonFoilMap('silver'), [assets]);
  const kaptonBumpMap = useMemo(() => assets.getKaptonBumpMap(), [assets]);
  const hullMap = useMemo(() => assets.getAerospaceHullMap(), [assets]);
  const aeroBumpMap = useMemo(() => assets.getAerospaceBumpMap(), [assets]);
  const usFlagTexture = useMemo(() => assets.getUSFlagTexture(), [assets]);
  const solarArrayMap = useMemo(() => assets.getSolarArrayMap(), [assets]);
  const softParticleMap = useMemo(() => assets.getSoftParticleMap(), [assets]);

  // Photorealistic Side-Lit Gibbous/Crescent Earthrise (75° phase eliminates center-disc specular blowout!)
  const earthDayMap = useMemo(
    () => assets.loadTexture('earth_day', () => assets.getProceduralPlanetTexture('earth', '#1e3a8a')),
    [assets]
  );
  const earthNightMap = useMemo(() => assets.getEarthNightMap(), [assets]);
  const earthSpecularMap = useMemo(() => assets.getEarthSpecularMap(), [assets]);
  const earthCloudsMap = useMemo(() => assets.getEarthCloudsMap(), [assets]);

  const sunWorldPos = useMemo(() => new THREE.Vector3(-340, 175, -105), []);

  const earthGroundUniforms = useMemo(
    () => ({
      uDayMap: { value: earthDayMap },
      uNightMap: { value: earthNightMap },
      uSpecularMap: { value: earthSpecularMap },
      uCloudsMap: { value: earthCloudsMap },
      uSunPosition: { value: sunWorldPos },
    }),
    [earthDayMap, earthNightMap, earthSpecularMap, earthCloudsMap, sunWorldPos]
  );

  const earthAtmUniforms = useMemo(
    () => ({
      uSunPosition: { value: sunWorldPos },
      uAtmosphereColor: { value: new THREE.Color('#38bdf8') },
      uOpacity: { value: 1.0 },
    }),
    [sunWorldPos]
  );

  // 1. Multi-Cratered Smooth Mare Tranquillitatis Regolith Terrain
  const moonTerrainGeo = useMemo(() => {
    if (!visible) return null;
    const geo = new THREE.PlaneGeometry(310, 310, 160, 160);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    const mareDark = new THREE.Color('#686e78');
    const regolithMid = new THREE.Color('#979ea8');
    const ejectaBright = new THREE.Color('#c8ced6');
    const tmp = new THREE.Color();

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = getLunarElevation(x, z);
      pos.setY(i, y);

      const albedoVar = lunarFbm(x * 0.08 + 9.4, z * 0.08 - 3.2);
      tmp.copy(mareDark).lerp(regolithMid, THREE.MathUtils.clamp((y + 2.8) / 5.2, 0.0, 1.0));
      if (albedoVar > 0.56) {
        tmp.lerp(ejectaBright, (albedoVar - 0.56) * 1.5);
      }
      const blastDist = Math.hypot(x + 1.45, z + 1.1);
      if (blastDist < 4.8) {
        tmp.lerp(ejectaBright, (1.0 - blastDist / 4.8) * 0.22);
      }
      colors[i * 3] = tmp.r;
      colors[i * 3 + 1] = tmp.g;
      colors[i * 3 + 2] = tmp.b;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    return geo;
  }, [visible]);

  // Tiled Octagonal Descent Stage Geometry (6x2 UV repeat so Kapton foil crinkles crisply without wood-grain stretch!)
  const descentOctagonGeo = useMemo(() => {
    if (!visible) return null;
    const geo = new THREE.CylinderGeometry(2.22, 2.32, 1.52, 8);
    const uv = geo.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) {
      uv.setXY(i, uv.getX(i) * 6.0, uv.getY(i) * 2.0);
    }
    uv.needsUpdate = true;
    return geo;
  }, [visible]);

  const rippledFlagGeo = useMemo(() => {
    if (!visible) return null;
    const geo = new THREE.PlaneGeometry(1.42, 0.88, 18, 10);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const wave = Math.sin(x * 7.5 + y * 2.2) * 0.032 + Math.cos(x * 14.0) * 0.012;
      pos.setZ(i, wave);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  }, [visible]);

  const descentBellGeo = useMemo(() => {
    if (!visible) return null;
    const pts = [
      new THREE.Vector2(0.28, 0.0),
      new THREE.Vector2(0.46, -0.35),
      new THREE.Vector2(0.68, -0.78),
      new THREE.Vector2(0.82, -1.12),
    ];
    const geo = new THREE.LatheGeometry(pts, 28);
    geo.computeVertexNormals();
    return geo;
  }, [visible]);

  const lunarBoulderGeo = useMemo(
    () => (visible ? createFracturedLunarBoulderGeo() : null),
    [visible]
  );

  // Deterministic GPU cleanup (INV2: disposes ALL component-owned geometries & materials)
  useEffect(() => {
    const root = rootRef.current;
    return () => {
      moonTerrainGeo?.dispose();
      descentOctagonGeo?.dispose();
      rippledFlagGeo?.dispose();
      descentBellGeo?.dispose();
      lunarBoulderGeo?.dispose();
      root?.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.isMesh) {
          if (
            mesh.geometry !== moonTerrainGeo &&
            mesh.geometry !== descentOctagonGeo &&
            mesh.geometry !== rippledFlagGeo &&
            mesh.geometry !== descentBellGeo &&
            mesh.geometry !== lunarBoulderGeo
          ) {
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
  }, [moonTerrainGeo, descentOctagonGeo, rippledFlagGeo, descentBellGeo, lunarBoulderGeo]);

  if (
    !visible ||
    !moonTerrainGeo ||
    !descentOctagonGeo ||
    !rippledFlagGeo ||
    !descentBellGeo ||
    !lunarBoulderGeo
  ) {
    return null;
  }

  const eagleX = -1.45;
  const eagleZ = -1.1;
  const eagleGroundY = getLunarElevation(eagleX, eagleZ);

  const flagX = 3.35;
  const flagZ = 1.65;
  const flagGroundY = getLunarElevation(flagX, flagZ);

  const pseX = 1.85;
  const pseZ = 3.85;
  const pseGroundY = getLunarElevation(pseX, pseZ);

  return (
    <group ref={rootRef} position={[0, -0.8, 0]}>
      {/* Airless Pitch-Black Lunar Sky + Crisp Vacuum Starfield */}
      <mesh>
        <sphereGeometry args={[295, 32, 16]} />
        <meshBasicMaterial color="#010206" side={THREE.BackSide} depthWrite={false} />
      </mesh>
      <StarField radius={260} />

      {/* ---------------------------------------------------- */}
      {/* PHOTOREALISTIC CRESCENT/GIBBOUS APOLLO EARTHRISE     */}
      {/* ---------------------------------------------------- */}
      <group position={[34, 26, -150]} rotation={[0.16, -0.55, -0.18]}>
        <mesh>
          <sphereGeometry args={[12.8, 64, 64]} />
          <shaderMaterial
            vertexShader={earthGroundVert}
            fragmentShader={earthGroundFrag}
            uniforms={earthGroundUniforms}
          />
        </mesh>
        <mesh scale={1.008}>
          <sphereGeometry args={[12.8, 48, 48]} />
          <meshStandardMaterial
            map={earthCloudsMap}
            color="#ffffff"
            roughness={0.78}
            transparent
            opacity={0.74}
            depthWrite={false}
          />
        </mesh>
        <mesh scale={1.036}>
          <sphereGeometry args={[12.8, 48, 48]} />
          <shaderMaterial
            vertexShader={atmosphereVert}
            fragmentShader={atmosphereFrag}
            uniforms={earthAtmUniforms}
            transparent
            side={THREE.BackSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      </group>

      {/* High-Detail Shadow-Receiving Mare Tranquillitatis Regolith (56x56 Micro-Grit Albedo + Bump) */}
      <mesh geometry={moonTerrainGeo} receiveShadow>
        <meshStandardMaterial
          vertexColors
          map={moonRegolithAlbedo}
          bumpMap={moonRegolithBump}
          bumpScale={0.075}
          roughness={0.96}
          metalness={0.02}
        />
      </mesh>

      {/* Razor-Sharp Vacuum Solar Key Light Casting Long Ink-Black Lunar Shadows */}
      <directionalLight
        position={[-72, 54, 98]}
        intensity={2.75}
        color="#fffef8"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={10}
        shadow-camera-far={240}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={16}
        shadow-camera-bottom={-16}
        shadow-bias={-0.0004}
      />
      <directionalLight position={[42, 18, 72]} intensity={0.26} color="#cbd5e1" />
      <ambientLight intensity={0.08} color="#1e293b" />

      {/* 1,280-Tri Angular Lunar Breccia Boulders + Soft Contact AO */}
      {[
        [-5.6, 3.4, 0.44],
        [5.4, -3.2, 0.58],
        [-7.2, -8.0, 0.82],
        [8.8, -11.2, 0.92],
        [-3.2, 5.5, 0.32],
      ].map(([rx, rz, rs], ri) => (
        <group key={`lunar-rock-${ri}`} position={[rx, getLunarElevation(rx, rz) + rs * 0.1, rz]}>
          <mesh
            geometry={lunarBoulderGeo}
            rotation={[ri * 0.3, ri * 1.15, 0.15]}
            scale={[rs * 1.32, rs * 0.64, rs * 1.1]}
            castShadow
            receiveShadow
          >
            <meshStandardMaterial
              vertexColors
              map={moonRegolithAlbedo}
              bumpMap={moonRegolithBump}
              bumpScale={0.18}
              color="#ffffff"
              roughness={0.95}
            />
          </mesh>
          <mesh position={[0, -rs * 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[rs * 2.8, rs * 2.4]} />
            <meshBasicMaterial
              map={softParticleMap}
              color="#05070c"
              transparent
              opacity={0.5}
              depthWrite={false}
            />
          </mesh>
        </group>
      ))}

      {/* ---------------------------------------------------- */}
      {/* APOLLO 11 LUNAR MODULE "EAGLE" (GRUMMAN LM-5)        */}
      {/* ---------------------------------------------------- */}
      <group position={[eagleX, eagleGroundY, eagleZ]} rotation={[0, 0.42, 0]} scale={0.92}>
        {/* Under-Lander Lunar Contact Occlusion */}
        <mesh position={[0, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[6.8, 6.8]} />
          <meshBasicMaterial
            map={softParticleMap}
            color="#04060a"
            transparent
            opacity={0.55}
            depthWrite={false}
          />
        </mesh>

        {/* 1. Octagonal Gold-Kapton Descent Stage (6x2 Tiled Foil + 8 Structural Vertical Corner Struts) */}
        <mesh
          geometry={descentOctagonGeo}
          position={[0, 1.48, 0]}
          rotation={[0, Math.PI / 8, 0]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial
            map={kaptonGoldMap}
            bumpMap={kaptonBumpMap}
            bumpScale={0.048}
            color="#fbbf24"
            emissive="#78350f"
            emissiveIntensity={0.12}
            metalness={0.92}
            roughness={0.24}
            envMapIntensity={1.6}
          />
        </mesh>

        {/* 8 Anodized Vertical Corner Ribs Framing Octagon Bays */}
        {[0, 1, 2, 3, 4, 5, 6, 7].map((ci) => {
          const ca = (ci / 8) * Math.PI * 2 + Math.PI / 8;
          return (
            <mesh
              key={`corner-rib-${ci}`}
              position={[Math.cos(ca) * 2.24, 1.48, Math.sin(ca) * 2.24]}
              castShadow
            >
              <cylinderGeometry args={[0.045, 0.045, 1.56, 8]} />
              <meshStandardMaterial color="#1e293b" metalness={0.88} roughness={0.28} />
            </mesh>
          );
        })}

        {/* Dark Plume-Deflector Panels & MESA Equipment Bay */}
        {[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((pa, pi) => (
          <mesh
            key={`descent-panel-${pi}`}
            position={[Math.cos(pa) * 2.15, 1.48, Math.sin(pa) * 2.15]}
            rotation={[0, -pa + Math.PI / 2, 0]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[1.18, 1.32, 0.08]} />
            <meshStandardMaterial
              map={pi % 2 === 0 ? kaptonGoldMap : kaptonSilverMap}
              bumpMap={kaptonBumpMap}
              bumpScale={0.04}
              color={pi % 2 === 0 ? '#fbbf24' : '#334155'}
              metalness={0.9}
              roughness={0.26}
            />
          </mesh>
        ))}

        {/* Open Columbium Descent Engine Skirt */}
        <mesh geometry={descentBellGeo} position={[0, 1.18, 0]} castShadow>
          <meshStandardMaterial
            color="#1e293b"
            bumpMap={aeroBumpMap}
            bumpScale={0.025}
            metalness={0.9}
            roughness={0.32}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* 2. 4 Cross-Braced A-Frame Landing Gear Assemblies + Footpads + Forward EVA Ladder */}
        {[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((angle, idx) => (
          <group key={`eagle-leg-${idx}`} rotation={[0, angle, 0]}>
            <mesh position={[2.75, 0.92, 0]} rotation={[0, 0, 0.42]} castShadow>
              <cylinderGeometry args={[0.095, 0.08, 2.05, 14]} />
              <meshStandardMaterial
                map={kaptonGoldMap}
                bumpMap={kaptonBumpMap}
                bumpScale={0.03}
                metalness={0.92}
                roughness={0.22}
              />
            </mesh>
            {[-0.48, 0.48].map((sz) => (
              <mesh
                key={`upper-strut-${sz}`}
                position={[2.32, 1.56, sz * 0.5]}
                rotation={[sz * 0.42, 0, Math.PI / 2 - 0.18]}
                castShadow
              >
                <cylinderGeometry args={[0.04, 0.04, 1.12, 10]} />
                <meshStandardMaterial
                  map={kaptonGoldMap}
                  metalness={0.88}
                  roughness={0.24}
                />
              </mesh>
            ))}
            {[-0.42, 0.42].map((sz) => (
              <mesh
                key={`lower-strut-${sz}`}
                position={[2.46, 0.78, sz * 0.45]}
                rotation={[sz * 0.36, 0, 1.18]}
                castShadow
              >
                <cylinderGeometry args={[0.035, 0.035, 1.22, 10]} />
                <meshStandardMaterial map={kaptonGoldMap} metalness={0.9} roughness={0.24} />
              </mesh>
            ))}
            <mesh position={[3.16, 0.06, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[0.48, 0.56, 0.12, 24]} />
              <meshStandardMaterial
                map={kaptonGoldMap}
                bumpMap={kaptonBumpMap}
                bumpScale={0.03}
                metalness={0.92}
                roughness={0.24}
              />
            </mesh>
            {/* Footpad Contact Shadow */}
            <mesh position={[3.16, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[1.5, 1.5]} />
              <meshBasicMaterial
                map={softParticleMap}
                color="#030508"
                transparent
                opacity={0.58}
                depthWrite={false}
              />
            </mesh>

            {idx === 3 && (
              <group position={[2.68, 1.05, 0]} rotation={[0, 0, 0.42]}>
                {[-0.18, 0.18].map((railZ) => (
                  <mesh key={`ladder-rail-${railZ}`} position={[0.14, 0, railZ]} castShadow>
                    <cylinderGeometry args={[0.018, 0.018, 1.68, 8]} />
                    <meshStandardMaterial color="#e2e8f0" metalness={0.92} roughness={0.18} />
                  </mesh>
                ))}
                {[-0.65, -0.45, -0.25, -0.05, 0.15, 0.35, 0.55, 0.75].map((ry) => (
                  <mesh
                    key={`rung-${ry}`}
                    position={[0.14, ry, 0]}
                    rotation={[Math.PI / 2, 0, 0]}
                    castShadow
                  >
                    <cylinderGeometry args={[0.014, 0.014, 0.36, 8]} />
                    <meshStandardMaterial color="#f8fafc" metalness={0.92} roughness={0.18} />
                  </mesh>
                ))}
              </group>
            )}
          </group>
        ))}

        {/* Gold Interstage Thermal Blanket Collar & Forward EVA Porch */}
        <mesh position={[0, 2.28, 0]} rotation={[0, Math.PI / 8, 0]} castShadow>
          <cylinderGeometry args={[1.52, 1.72, 0.18, 8]} />
          <meshStandardMaterial map={kaptonGoldMap} metalness={0.92} roughness={0.22} />
        </mesh>
        <mesh position={[0, 2.24, 2.38]} castShadow>
          <boxGeometry args={[0.88, 0.08, 0.72]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.86} roughness={0.28} />
        </mesh>

        {/* 3. Authentic Grumman LM-5 "Eagle" Multi-Sheet Ascent Stage + Windowed Faceplate & 3D Rendezvous Radar */}
        <group position={[0, 3.05, 0]}>
          {/* Smooth Pressurized Cylindrical Crew Compartment Wrapped in Brushed Grumman Thermal Skin */}
          <mesh rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[1.28, 1.32, 1.86, 28]} />
            <meshStandardMaterial
              map={hullMap}
              bumpMap={aeroBumpMap}
              bumpScale={0.025}
              color="#cbd5e1"
              metalness={0.64}
              roughness={0.34}
            />
          </mesh>

          {/* Stepped Multi-Sheet Upper & Chin Micrometeoroid Armor Panels */}
          <mesh position={[0, 0.58, 0.14]} castShadow receiveShadow>
            <boxGeometry args={[1.66, 0.56, 1.56]} />
            <meshStandardMaterial
              map={hullMap}
              bumpMap={aeroBumpMap}
              bumpScale={0.022}
              color="#dce3ec"
              metalness={0.58}
              roughness={0.32}
            />
          </mesh>
          <mesh position={[0, -0.52, 0.12]} castShadow receiveShadow>
            <boxGeometry args={[1.76, 0.54, 1.58]} />
            <meshStandardMaterial
              color="#334155"
              bumpMap={aeroBumpMap}
              bumpScale={0.024}
              metalness={0.68}
              roughness={0.42}
            />
          </mesh>

          {/* Overhead Cylindrical Docking Tunnel & Aft Avionics Bay */}
          <mesh position={[0, 1.02, 0.05]} castShadow>
            <cylinderGeometry args={[0.5, 0.56, 0.38, 24]} />
            <meshStandardMaterial color="#334155" metalness={0.82} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.06, -0.98]} castShadow receiveShadow>
            <boxGeometry args={[1.62, 1.42, 1.05]} />
            <meshStandardMaterial
              color="#334155"
              bumpMap={aeroBumpMap}
              bumpScale={0.025}
              metalness={0.78}
              roughness={0.34}
            />
          </mesh>

          {/* Port & Starboard ECS / Propellant Shroud Pods (Brushed Silver & Pale Olive-Gold Kapton — Zero Orange!) */}
          {[-1.24, 1.24].map((sx, si) => (
            <group key={`ascent-pod-${si}`} position={[sx, -0.04, -0.06]}>
              <mesh rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
                <cylinderGeometry args={[0.58, 0.58, 1.16, 18]} />
                <meshStandardMaterial
                  map={kaptonSilverMap}
                  bumpMap={kaptonBumpMap}
                  bumpScale={0.028}
                  color={si === 0 ? '#cbd5e1' : '#b5aa84'}
                  metalness={0.78}
                  roughness={0.3}
                />
              </mesh>
            </group>
          ))}

          {/* Sculpted Light-Grey Forward Bulkhead Faceplate Cleared Ahead of Hull Cylinder (Zero Z-Fighting!) */}
          <mesh position={[0, 0.16, 0.98]} castShadow receiveShadow>
            <boxGeometry args={[1.56, 0.94, 0.14]} />
            <meshStandardMaterial
              map={hullMap}
              bumpMap={aeroBumpMap}
              bumpScale={0.02}
              color="#cbd5e1"
              metalness={0.6}
              roughness={0.34}
            />
          </mesh>

          {/* Distinct Canted Triangular Commander & LMP Windows with Brushed Bezels + Dark Coated Glass */}
          {[-0.48, 0.48].map((wx) => (
            <group
              key={`lm-win-${wx}`}
              position={[wx, 0.24, 1.07]}
              rotation={[0.16, wx > 0 ? -0.14 : 0.14, wx > 0 ? -0.26 : 0.26]}
            >
              {/* Brushed Aluminum Triangular Window Frame */}
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.28, 0.28, 0.035, 3]} />
                <meshStandardMaterial color="#e2e8f0" metalness={0.86} roughness={0.24} />
              </mesh>
              {/* Recessed Dark Coated Astronaut Window Pane (Cleared +0.022 forward of bezel!) */}
              <mesh position={[0, 0, 0.022]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.215, 0.215, 0.02, 3]} />
                <meshStandardMaterial
                  color="#091322"
                  emissive="#172554"
                  emissiveIntensity={0.22}
                  metalness={0.96}
                  roughness={0.06}
                />
              </mesh>
              {/* Narrow Charcoal Anti-Glare Brow Strip Above Window */}
              <mesh position={[0, 0.19, 0.03]} rotation={[0.35, 0, 0]}>
                <boxGeometry args={[0.42, 0.04, 0.07]} />
                <meshStandardMaterial color="#1e293b" metalness={0.6} roughness={0.45} />
              </mesh>
            </group>
          ))}

          {/* 3D Forward-Facing Parabolic Rendezvous Radar Dish (+Z Bowl Axis = Rotation [-PI/2, 0, 0]) */}
          <group position={[0, 0.68, 1.12]} rotation={[-0.14, 0.1, 0]}>
            {/* Stand-off Gimbal Yoke Behind Dish */}
            <mesh position={[0, 0, -0.06]}>
              <boxGeometry args={[0.18, 0.18, 0.12]} />
              <meshStandardMaterial color="#1e293b" metalness={0.84} roughness={0.32} />
            </mesh>
            {/* 3D Concave White Parabolic Dish Bowl Opening Forward (+Z) */}
            <mesh position={[0, 0, 0.28]} rotation={[-Math.PI / 2, 0, 0]} castShadow>
              <sphereGeometry args={[0.3, 28, 16, 0, Math.PI * 2, 0, 0.65]} />
              <meshStandardMaterial
                color="#f1f5f9"
                metalness={0.48}
                roughness={0.3}
                side={THREE.DoubleSide}
              />
            </mesh>
            {/* Central Dark Feedhorn Waveguide & Gold Quad-Tip Inside Bowl */}
            <mesh position={[0, 0, 0.11]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.022, 0.032, 0.2, 12]} />
              <meshStandardMaterial color="#0f172a" metalness={0.88} roughness={0.25} />
            </mesh>
            <mesh position={[0, 0, 0.21]}>
              <sphereGeometry args={[0.032, 12, 12]} />
              <meshStandardMaterial map={kaptonGoldMap} metalness={0.92} roughness={0.18} />
            </mesh>
          </group>

          {/* Framed Rectangular Forward EVA Hatch + Silver Perimeter Trim & Latch */}
          <group position={[0, -0.38, 1.04]}>
            <mesh castShadow>
              <boxGeometry args={[0.74, 0.68, 0.08]} />
              <meshStandardMaterial color="#94a3b8" metalness={0.82} roughness={0.28} />
            </mesh>
            <mesh position={[0, 0, 0.03]}>
              <boxGeometry args={[0.62, 0.56, 0.06]} />
              <meshStandardMaterial
                color="#1e293b"
                bumpMap={aeroBumpMap}
                bumpScale={0.025}
                metalness={0.74}
                roughness={0.38}
              />
            </mesh>
            <mesh position={[0.2, 0.02, 0.07]}>
              <boxGeometry args={[0.08, 0.14, 0.04]} />
              <meshStandardMaterial color="#f8fafc" metalness={0.9} roughness={0.2} />
            </mesh>
          </group>

          {/* 4 Outrigger R-4D Attitude Control RCS Thruster Quads (16 Nozzles) */}
          {[-1.24, 1.24].map((qx) =>
            [-0.92, 0.92].map((qz) => (
              <group key={`rcs-quad-${qx}-${qz}`} position={[qx, 0.2, qz]}>
                <mesh castShadow>
                  <cylinderGeometry args={[0.13, 0.13, 0.32, 12]} />
                  <meshStandardMaterial color="#e2e8f0" metalness={0.88} roughness={0.22} />
                </mesh>
                {[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((na, ni) => (
                  <mesh
                    key={`rcs-noz-${ni}`}
                    position={[Math.cos(na) * 0.17, 0, Math.sin(na) * 0.17]}
                    rotation={[0, -na, Math.PI / 2]}
                  >
                    <coneGeometry args={[0.05, 0.15, 10, 1, true]} />
                    <meshStandardMaterial
                      color="#334155"
                      metalness={0.92}
                      roughness={0.22}
                      side={THREE.DoubleSide}
                    />
                  </mesh>
                ))}
              </group>
            ))
          )}

          {/* Steerable S-Band Parabolic Dish & VHF Whip Antennas Atop Cabin */}
          <group position={[0.48, 1.24, 0.38]} rotation={[0.35, 0.32, 0]}>
            <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[0.36, 0.05, 0.14, 20]} />
              <meshStandardMaterial map={kaptonGoldMap} metalness={0.92} roughness={0.2} />
            </mesh>
          </group>
        </group>
      </group>

      {/* ---------------------------------------------------- */}
      {/* APOLLO 11 STARS-AND-STRIPES FLAG (CASTS REAL SHADOW) */}
      {/* ---------------------------------------------------- */}
      <group position={[flagX, flagGroundY, flagZ]} rotation={[0, -0.45, 0]}>
        <mesh position={[0, 1.38, 0]} castShadow>
          <cylinderGeometry args={[0.026, 0.03, 2.76, 12]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.92} roughness={0.18} />
        </mesh>
        <mesh position={[0.72, 2.72, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.018, 0.018, 1.44, 10]} />
          <meshStandardMaterial color="#f8fafc" metalness={0.92} roughness={0.18} />
        </mesh>
        <mesh geometry={rippledFlagGeo} position={[0.73, 2.26, 0]} castShadow receiveShadow>
          <meshStandardMaterial
            map={usFlagTexture}
            bumpMap={kaptonBumpMap}
            bumpScale={0.014}
            roughness={0.72}
            metalness={0.06}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>

      {/* ---------------------------------------------------- */}
      {/* DEPLOYED EASEP SCIENCE PACKAGES (PSE & LRRR)         */}
      {/* ---------------------------------------------------- */}
      <group position={[pseX, pseGroundY, pseZ]} rotation={[0, 0.35, 0]}>
        <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.28, 0.3, 0.42, 16]} />
          <meshStandardMaterial
            map={kaptonGoldMap}
            bumpMap={kaptonBumpMap}
            bumpScale={0.03}
            metalness={0.92}
            roughness={0.22}
          />
        </mesh>
        {[-0.48, 0.48].map((px, pi) => (
          <mesh
            key={`pse-solar-${pi}`}
            position={[px, 0.18, 0]}
            rotation={[0, 0, px > 0 ? -0.35 : 0.35]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[0.52, 0.02, 0.44]} />
            <meshStandardMaterial map={solarArrayMap} metalness={0.82} roughness={0.22} />
          </mesh>
        ))}
      </group>

      {/* Feathered Astronaut Bootprint Impressions in Mare Tranquillitatis Regolith */}
      {[
        [-0.4, 1.2],
        [0.2, 1.6],
        [0.85, 1.9],
        [1.55, 2.05],
        [2.25, 1.95],
        [2.85, 1.8],
      ].map(([fx, fz], idx) => (
        <mesh
          key={`bootprint-${idx}`}
          position={[fx, getLunarElevation(fx, fz) + 0.015, fz]}
          rotation={[-Math.PI / 2, 0, 0.48 + (idx % 2) * 0.14]}
        >
          <planeGeometry args={[0.24, 0.44]} />
          <meshBasicMaterial
            map={softParticleMap}
            color="#11161f"
            transparent
            opacity={0.48}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
};
