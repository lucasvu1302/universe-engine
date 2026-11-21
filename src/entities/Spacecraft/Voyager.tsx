import React, { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AssetManager } from '@/engine/assets/AssetManager';
import { SpacecraftEphemeris } from '@/engine/ephemeris/SpacecraftEphemeris';

interface VoyagerProps {
  id: 'voyager1' | 'voyager2';
  onFocus?: () => void;
}

export const Voyager: React.FC<VoyagerProps> = ({ id, onFocus }) => {
  const groupRef = useRef<THREE.Group>(null);
  const beaconSpriteRef = useRef<THREE.Sprite>(null);
  const ephem = SpacecraftEphemeris.getInstance();

  const assets = useMemo(() => AssetManager.getInstance(), []);
  const kaptonGoldMap = useMemo(() => assets.getKaptonFoilMap('gold'), [assets]);
  const kaptonBumpMap = useMemo(() => assets.getKaptonBumpMap(), [assets]);
  const aeroBumpMap = useMemo(() => assets.getAerospaceBumpMap(), [assets]);
  const trussAlphaMap = useMemo(() => assets.getSteelTrussAlphaMap(), [assets]);
  const softGlowMap = useMemo(() => assets.getSoftParticleMap(), [assets]);

  // 3.7-meter parabolic High-Gain Antenna dish profile (LatheGeometry, concave toward +Z Earth)
  const dishLatheGeo = useMemo(() => {
    const pts: THREE.Vector2[] = [];
    for (let i = 0; i <= 14; i++) {
      const r = (i / 14) * 1.85;
      const z = (r * r) * 0.22;
      pts.push(new THREE.Vector2(r, z));
    }
    const geo = new THREE.LatheGeometry(pts, 40);
    geo.computeVertexNormals();
    return geo;
  }, []);

  const magnetometerTrussMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#d97706',
        alphaMap: trussAlphaMap,
        alphaTest: 0.35,
        metalness: 0.84,
        roughness: 0.32,
        side: THREE.DoubleSide,
      }),
    [trussAlphaMap]
  );

  const isVoyager1 = id === 'voyager1';
  const pos = useMemo(() => {
    const target = new THREE.Vector3();
    return isVoyager1 ? ephem.getVoyager1Position(target) : ephem.getVoyager2Position(target);
  }, [isVoyager1, ephem]);

  useLayoutEffect(() => {
    // Orient High-Gain Antenna (+Z) back toward the inner Solar System / Earth at (0, 0, 0)
    groupRef.current?.lookAt(0, 0, 0);
  }, [pos]);

  useEffect(() => {
    const root = groupRef.current;
    return () => {
      dishLatheGeo.dispose();
      magnetometerTrussMat.dispose();
      root?.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.isMesh) {
          if (mesh.geometry !== dishLatheGeo) {
            mesh.geometry?.dispose();
          }
          if (Array.isArray(mesh.material) && mesh.material) {
            mesh.material.forEach((m) => {
              if (m !== magnetometerTrussMat) m.dispose();
            });
          } else if (mesh.material && mesh.material !== magnetometerTrussMat) {
            mesh.material.dispose();
          }
        }
        const sp = obj as THREE.Sprite;
        if (sp.isSprite) {
          sp.material?.dispose();
        }
      });
    };
  }, [dishLatheGeo, magnetometerTrussMat]);

  useFrame((state) => {
    // Fade distant locator star-beacon completely to 0 on close-up inspection (zero plastic hula-hoop!)
    if (beaconSpriteRef.current && groupRef.current) {
      const dist = state.camera.position.distanceTo(groupRef.current.position);
      const farVisibility = THREE.MathUtils.smoothstep(dist, 18.0, 55.0);
      const pulse = 0.75 + 0.25 * Math.sin(performance.now() * 0.004);
      beaconSpriteRef.current.material.opacity = farVisibility * 0.65 * pulse;
      beaconSpriteRef.current.visible = farVisibility > 0.01;
    }
  });

  return (
    <group position={pos} ref={groupRef} onClick={onFocus} scale={0.72}>
      {/* ---------------------------------------------------- */}
      {/* 1. 3.7m PARABOLIC HIGH-GAIN DISH & 3-STRUT TRIPOD    */}
      {/* ---------------------------------------------------- */}
      <group position={[0, 0, 0.25]}>
        <mesh geometry={dishLatheGeo} rotation={[Math.PI / 2, 0, 0]}>
          <meshStandardMaterial
            color="#f1f5f9"
            bumpMap={aeroBumpMap}
            bumpScale={0.016}
            roughness={0.38}
            metalness={0.24}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Dish Perimeter Stiffener Rim & Radial Back-Ribs */}
        <mesh position={[0, 0, 0.75]}>
          <torusGeometry args={[1.85, 0.032, 10, 40]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.8} roughness={0.25} />
        </mesh>

        {/* 3 Graphite Tripod Struts Connecting Dish Rim to Subreflector Apex */}
        {[0, (2 * Math.PI) / 3, (4 * Math.PI) / 3].map((sAngle, si) => {
          const rx = Math.cos(sAngle) * 0.68;
          const ry = Math.sin(sAngle) * 0.68;
          return (
            <group key={`feed-strut-${si}`}>
              <mesh
                position={[rx, ry, 1.08]}
                rotation={[-Math.sin(sAngle) * 0.68, Math.cos(sAngle) * 0.68, sAngle]}
              >
                <cylinderGeometry args={[0.022, 0.028, 1.65, 8]} />
                <meshStandardMaterial color="#334155" metalness={0.88} roughness={0.26} />
              </mesh>
            </group>
          );
        })}

        {/* Central X-Band Feed Cone + Frequency Selective Subreflector Cap */}
        <mesh position={[0, 0, 0.42]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.12, 0.24, 0.72, 20]} />
          <meshStandardMaterial color="#475569" metalness={0.86} roughness={0.28} />
        </mesh>
        <mesh position={[0, 0, 1.48]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.26, 0.3, 0.14, 24]} />
          <meshStandardMaterial
            map={kaptonGoldMap}
            bumpMap={kaptonBumpMap}
            bumpScale={0.02}
            metalness={0.92}
            roughness={0.2}
          />
        </mesh>
        <mesh position={[0, 0, 1.68]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.07, 0.07, 0.28, 14]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.85} roughness={0.22} />
        </mesh>
      </group>

      {/* ---------------------------------------------------- */}
      {/* 2. 10-SIDED DECAGONAL SPACECRAFT BUS & GOLDEN RECORD */}
      {/* ---------------------------------------------------- */}
      <group position={[0, 0, -0.32]}>
        <mesh position={[0, 0, 0.38]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.68, 0.84, 0.32, 10, 1, true]} />
          <meshStandardMaterial
            color="#475569"
            metalness={0.88}
            roughness={0.28}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Authentic 10-Sided Decagonal Avionics Bus Wrapped in Black MLI Blankets */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.88, 0.88, 0.66, 10]} />
          <meshStandardMaterial
            color="#18212f"
            bumpMap={kaptonBumpMap}
            bumpScale={0.032}
            metalness={0.62}
            roughness={0.44}
          />
        </mesh>

        {/* Polished Thermal Louver Bay Panels Around Decagonal Facets */}
        {[0, 2, 5, 7].map((fi) => {
          const fa = (fi / 10) * Math.PI * 2 + Math.PI / 10;
          return (
            <mesh
              key={`louver-${fi}`}
              position={[Math.cos(fa) * 0.85, Math.sin(fa) * 0.85, 0]}
              rotation={[0, 0, fa + Math.PI / 2]}
            >
              <boxGeometry args={[0.42, 0.03, 0.44]} />
              <meshStandardMaterial
                color="#cbd5e1"
                bumpMap={aeroBumpMap}
                bumpScale={0.025}
                metalness={0.94}
                roughness={0.18}
              />
            </mesh>
          );
        })}

        {/* Central Spherical Hydrazine Propellant Tank Inside Bus Ring */}
        <mesh position={[0, 0, -0.14]}>
          <sphereGeometry args={[0.48, 24, 24]} />
          <meshStandardMaterial
            map={kaptonGoldMap}
            bumpMap={kaptonBumpMap}
            bumpScale={0.025}
            metalness={0.9}
            roughness={0.24}
          />
        </mesh>

        {/* Iconic Gold-Plated Aluminum Voyager Golden Record Cover Mounted Flush on Bus Facet */}
        <group position={[0.86, 0.0, 0.02]} rotation={[0, Math.PI / 2, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.26, 0.26, 0.03, 32]} />
            <meshStandardMaterial
              map={kaptonGoldMap}
              color="#fbbf24"
              emissive="#b45309"
              emissiveIntensity={0.22}
              metalness={0.98}
              roughness={0.08}
            />
          </mesh>
          <mesh position={[0, 0, 0.018]}>
            <ringGeometry args={[0.08, 0.21, 24]} />
            <meshStandardMaterial color="#fef08a" metalness={0.98} roughness={0.05} />
          </mesh>
        </group>

        {/* ---------------------------------------------------- */}
        {/* 3. ANGLED RTG BOOM WITH 3 TANDEM MHW-RTG CYLINDERS   */}
        {/* ---------------------------------------------------- */}
        <group name="rtg-boom" position={[-0.78, -0.45, -0.05]} rotation={[0, 0.24, 0.42]}>
          <mesh position={[-1.05, 0, 0.08]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.03, 0.04, 2.15, 8]} />
            <meshStandardMaterial color="#64748b" metalness={0.88} roughness={0.26} />
          </mesh>
          <mesh position={[-1.05, 0, -0.08]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.03, 0.04, 2.15, 8]} />
            <meshStandardMaterial color="#64748b" metalness={0.88} roughness={0.26} />
          </mesh>

          {/* 3 Finned Plutonium-238 Radioisotope Thermoelectric Generators (rtg) */}
          {[0, 1, 2].map((ri) => (
            <group key={`rtg-unit-${ri}`} position={[-2.25 - ri * 0.56, 0, 0]}>
              <mesh rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.17, 0.17, 0.46, 16]} />
                <meshStandardMaterial
                  color="#1e293b"
                  emissive="#9a3412"
                  emissiveIntensity={0.24}
                  metalness={0.85}
                  roughness={0.38}
                />
              </mesh>
              {[0, Math.PI / 3, (2 * Math.PI) / 3].map((fa, fi) => (
                <mesh key={`rtg-fin-${fi}`} rotation={[fa, 0, 0]}>
                  <boxGeometry args={[0.42, 0.44, 0.018]} />
                  <meshStandardMaterial color="#0f172a" metalness={0.88} roughness={0.34} />
                </mesh>
              ))}
            </group>
          ))}
        </group>

        {/* ---------------------------------------------------- */}
        {/* 4. DIAGONAL ASTROMAST MAGNETOMETER BOOM & V-ANTENNAS */}
        {/* ---------------------------------------------------- */}
        <group name="magnetometer-boom" position={[-0.28, 0.68, -0.22]} rotation={[-0.95, 0.24, 0.72]}>
          <mesh position={[0, 1.85, 0]} material={magnetometerTrussMat}>
            <cylinderGeometry args={[0.075, 0.1, 3.7, 6, 1, true]} />
          </mesh>
          <mesh position={[0, 2.25, 0]}>
            <boxGeometry args={[0.16, 0.14, 0.16]} />
            <meshStandardMaterial map={kaptonGoldMap} metalness={0.92} roughness={0.2} />
          </mesh>
          <mesh position={[0, 3.75, 0]}>
            <boxGeometry args={[0.18, 0.19, 0.18]} />
            <meshStandardMaterial map={kaptonGoldMap} metalness={0.92} roughness={0.2} />
          </mesh>
        </group>

        {/* Science Scan Platform Boom (ISS Narrow/Wide Angle Cameras, IRIS, UVS) */}
        <group position={[0.78, -0.25, -0.05]} rotation={[0, -0.22, -0.28]}>
          <mesh position={[0.92, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.035, 0.045, 1.85, 10]} />
            <meshStandardMaterial color="#475569" metalness={0.88} roughness={0.25} />
          </mesh>
          <group position={[1.95, 0, 0.05]}>
            <mesh>
              <boxGeometry args={[0.44, 0.42, 0.38]} />
              <meshStandardMaterial
                color="#111827"
                bumpMap={kaptonBumpMap}
                bumpScale={0.025}
                metalness={0.75}
                roughness={0.4}
              />
            </mesh>
            <mesh position={[0.12, 0.12, 0.32]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.11, 0.12, 0.42, 16]} />
              <meshStandardMaterial color="#090d16" metalness={0.85} roughness={0.32} />
            </mesh>
            <mesh position={[-0.1, -0.08, 0.24]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.065, 0.075, 0.26, 14]} />
              <meshStandardMaterial color="#1e293b" metalness={0.85} roughness={0.3} />
            </mesh>
          </group>
        </group>

        {/* Twin 10m Orthogonal Planetary Radio Astronomy (PRA) Whip Antennas */}
        {[-0.48, 0.48].map((antAng, ai) => (
          <mesh
            key={`pra-whip-${ai}`}
            position={[antAng * 1.65, -1.7, -1.35]}
            rotation={[0.68, 0, antAng]}
          >
            <cylinderGeometry args={[0.008, 0.018, 3.8, 6]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.95} roughness={0.14} />
          </mesh>
        ))}
      </group>

      {/* Distant Heliopause Locator Star-Beacon (fades completely to 0 inside 18 units) */}
      <sprite ref={beaconSpriteRef} position={[0, 0, 0]} scale={[7.5, 7.5, 1]} raycast={() => null}>
        <spriteMaterial
          map={softGlowMap}
          color="#bae6fd"
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </sprite>

      {/* Subtle Pale-Solar Key Illumination at 163 AU (INV3 persistent light) */}
      <pointLight position={[4.5, 2.2, 6.5]} color="#fff7ed" intensity={2.4} distance={28} />
    </group>
  );
};
