import React, { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AssetManager } from '@/engine/assets/AssetManager';
import { CameraManager } from '@/engine/camera/CameraManager';
import { SpacecraftEphemeris } from '@/engine/ephemeris/SpacecraftEphemeris';
import { SimulationClock } from '@/engine/simulation/SimulationClock';

interface ISSProps {
  earthPosition: THREE.Vector3;
  onFocus?: () => void;
}

const NOOP_RAYCAST: THREE.Object3D['raycast'] = () => {};
const LOD_ENTER_DISTANCE = 23.5;
const LOD_EXIT_DISTANCE = 25.0;
const ISS_INC_RAD = THREE.MathUtils.degToRad(51.6);
const ISS_ORBIT_UP = new THREE.Vector3(0, Math.cos(ISS_INC_RAD), Math.sin(ISS_INC_RAD)).normalize();

function createTiledPlane(
  width: number,
  height: number,
  repeatX: number,
  repeatY: number
): THREE.PlaneGeometry {
  const geo = new THREE.PlaneGeometry(width, height, 1, 1);
  const uv = geo.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, uv.getX(i) * repeatX, uv.getY(i) * repeatY);
  }
  uv.needsUpdate = true;
  return geo;
}

export const ISSCupola: React.FC<ISSProps> = ({ earthPosition, onFocus }) => {
  const groupRef = useRef<THREE.Group>(null);
  const detailGroupRef = useRef<THREE.Group>(null);
  const distantProxyRef = useRef<THREE.Group>(null);
  const solarRef = useRef<THREE.Group>(null);
  const cupolaLightRef = useRef<THREE.PointLight>(null);
  const isNearRef = useRef(true);
  const ephem = SpacecraftEphemeris.getInstance();
  const tempPos = useRef(new THREE.Vector3());
  const liveEarthPos = useRef(new THREE.Vector3());

  const assets = useMemo(() => AssetManager.getInstance(), []);
  const solarArrayMap = useMemo(() => assets.getSolarArrayMap(), [assets]);
  const aeroBumpMap = useMemo(() => assets.getAerospaceBumpMap(), [assets]);
  const hullMap = useMemo(() => assets.getAerospaceHullMap(), [assets]);
  const trussAlphaMap = useMemo(() => assets.getSteelTrussAlphaMap(), [assets]);
  const kaptonGoldMap = useMemo(() => assets.getKaptonFoilMap('gold'), [assets]);
  const kaptonBumpMap = useMemo(() => assets.getKaptonBumpMap(), [assets]);

  const trussSideGeo = useMemo(() => createTiledPlane(7.2, 0.48, 12, 1), []);
  const solarBlanketGeo = useMemo(() => createTiledPlane(0.84, 5.65, 1, 4), []);

  const trussLatticeMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#cbd5e1',
        alphaMap: trussAlphaMap,
        alphaTest: 0.38,
        metalness: 0.88,
        roughness: 0.28,
        side: THREE.DoubleSide,
      }),
    [trussAlphaMap]
  );

  const solarBlanketMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: solarArrayMap,
        bumpMap: aeroBumpMap,
        bumpScale: 0.012,
        color: '#ffffff',
        emissive: '#92400e',
        emissiveIntensity: 0.14,
        metalness: 0.78,
        roughness: 0.22,
        side: THREE.DoubleSide,
      }),
    [solarArrayMap, aeroBumpMap]
  );

  useLayoutEffect(() => {
    detailGroupRef.current?.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        obj.raycast = NOOP_RAYCAST;
      }
    });
    distantProxyRef.current?.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        obj.raycast = NOOP_RAYCAST;
      }
    });
  }, []);

  useEffect(() => {
    const root = groupRef.current;
    return () => {
      trussSideGeo.dispose();
      solarBlanketGeo.dispose();
      trussLatticeMat.dispose();
      solarBlanketMat.dispose();
      root?.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.isMesh) {
          mesh.geometry?.dispose();
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose());
          } else {
            mesh.material?.dispose();
          }
        }
      });
    };
  }, [trussSideGeo, solarBlanketGeo, trussLatticeMat, solarBlanketMat]);

  useFrame((state) => {
    if (!groupRef.current) return;
    const simTime = SimulationClock.getInstance().simulationTime;
    const earthCenter =
      CameraManager.getInstance().getLiveBodyPosition('earth', liveEarthPos.current) || earthPosition;
    const pos = ephem.getISSPosition(simTime, earthCenter, tempPos.current);
    groupRef.current.position.copy(pos);

    // Keep bottom Cupola pointed directly at Earth's center with roll stabilized to the 51.6° orbital plane
    groupRef.current.up.copy(ISS_ORBIT_UP);
    groupRef.current.lookAt(earthCenter);

    const dist = state.camera.position.distanceTo(pos);
    const isNear = isNearRef.current ? dist <= LOD_EXIT_DISTANCE : dist <= LOD_ENTER_DISTANCE;
    isNearRef.current = isNear;
    if (detailGroupRef.current) {
      detailGroupRef.current.visible = isNear;
    }
    if (distantProxyRef.current) {
      distantProxyRef.current.visible = !isNear;
    }
    if (cupolaLightRef.current) {
      cupolaLightRef.current.intensity = isNear ? 1.15 : 0;
    }

    // Solar arrays rotate smoothly around the Integrated Truss axis (X axis) canted to display their 8 golden wings clearly
    if (isNear && solarRef.current) {
      solarRef.current.rotation.x = 0.62 + simTime * 0.14;
    }
  });

  return (
    <group ref={groupRef} scale={0.025}>
      {/* Single raycastable hit-sphere proxy */}
      <mesh onClick={onFocus}>
        <sphereGeometry args={[12, 12, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>

      {/* Persistent nadir Earthshine & Cupola cabin fill light modulated via intensity (INV3) */}
      <pointLight ref={cupolaLightRef} position={[0, 0.4, 1.35]} color="#bae6fd" intensity={0} distance={3.8} />

      {/* Lightweight distant proxy rendered beyond 25 units */}
      <group ref={distantProxyRef} visible={false}>
        <mesh position={[0, 0, -0.3]} raycast={NOOP_RAYCAST}>
          <boxGeometry args={[17.5, 0.55, 0.55]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.22} />
        </mesh>
        <mesh position={[0, 0, -0.3]} raycast={NOOP_RAYCAST}>
          <boxGeometry args={[16.8, 11.2, 0.04]} />
          <meshStandardMaterial
            map={solarArrayMap}
            color="#ffffff"
            emissive="#b45309"
            emissiveIntensity={0.2}
            metalness={0.82}
            roughness={0.24}
          />
        </mesh>
      </group>

      {/* High-detail cinema station assembly */}
      <group ref={detailGroupRef}>
        {/* ---------------------------------------------------- */}
        {/* 1. OPEN-LATTICE INTEGRATED TRUSS STRUCTURE (108m)    */}
        {/* ---------------------------------------------------- */}
        <mesh position={[0, 0, -0.3]}>
          <boxGeometry args={[2.1, 0.56, 0.56]} />
          <meshStandardMaterial
            color="#94a3b8"
            bumpMap={aeroBumpMap}
            bumpScale={0.02}
            metalness={0.88}
            roughness={0.26}
          />
        </mesh>

        {[-4.85, 4.85].map((tx, idx) => (
          <group key={`truss-girder-${idx}`} position={[tx, 0, -0.3]}>
            {/* 4 Corner Aluminum Truss Chords */}
            {[-0.22, 0.22].map((cy) =>
              [-0.22, 0.22].map((cz) => (
                <mesh key={`chord-${cy}-${cz}`} position={[0, cy, cz]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.028, 0.028, 7.2, 8]} />
                  <meshStandardMaterial color="#e2e8f0" metalness={0.92} roughness={0.2} />
                </mesh>
              ))
            )}
            {/* See-Through Diagonal X-Braced Truss Webbing */}
            <mesh geometry={trussSideGeo} material={trussLatticeMat} position={[0, 0, 0.22]} />
            <mesh geometry={trussSideGeo} material={trussLatticeMat} position={[0, 0, -0.22]} />
            <mesh
              geometry={trussSideGeo}
              material={trussLatticeMat}
              position={[0, 0.22, 0]}
              rotation={[Math.PI / 2, 0, 0]}
            />
            <mesh
              geometry={trussSideGeo}
              material={trussLatticeMat}
              position={[0, -0.22, 0]}
              rotation={[Math.PI / 2, 0, 0]}
            />
            {/* Mobile Transporter Rail */}
            <mesh position={[0, 0.26, 0.14]}>
              <boxGeometry args={[7.0, 0.05, 0.09]} />
              <meshStandardMaterial color="#f8fafc" metalness={0.94} roughness={0.16} />
            </mesh>
          </group>
        ))}

        {/* Solar Alpha Rotary Joints (SARJ) + Gold Kapton Thermal Covers */}
        {[-3.8, 3.8].map((rx, idx) => (
          <group key={`sarj-${idx}`} position={[rx, 0, -0.3]}>
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.56, 0.56, 0.48, 28]} />
              <meshStandardMaterial
                color="#334155"
                bumpMap={aeroBumpMap}
                bumpScale={0.025}
                metalness={0.92}
                roughness={0.2}
              />
            </mesh>
            <mesh rotation={[0, Math.PI / 2, 0]}>
              <torusGeometry args={[0.58, 0.04, 10, 28]} />
              <meshStandardMaterial
                map={kaptonGoldMap}
                bumpMap={kaptonBumpMap}
                bumpScale={0.02}
                metalness={0.94}
                roughness={0.18}
              />
            </mesh>
          </group>
        ))}

        {/* ---------------------------------------------------- */}
        {/* 2. 8 PHOTOVOLTAIC SOLAR ARRAY WINGS (SAW + iROSA)    */}
        {/* ---------------------------------------------------- */}
        <group ref={solarRef}>
          {[5.8, 8.2, -5.8, -8.2].map((wx, wi) => (
            <group key={`saw-pair-${wi}`} position={[wx, 0, -0.3]}>
              {/* Beta Gimbal Assembly Canister wrapped in Gold Kapton */}
              <mesh rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.24, 0.24, 0.52, 18]} />
                <meshStandardMaterial
                  map={kaptonGoldMap}
                  bumpMap={kaptonBumpMap}
                  bumpScale={0.025}
                  metalness={0.92}
                  roughness={0.2}
                />
              </mesh>

              {[1, -1].map((yDir) => (
                <group key={`wing-${yDir}`} position={[0, yDir * 3.05, 0]}>
                  {/* Deployable Fiberglass Lattice Mast */}
                  <mesh>
                    <cylinderGeometry args={[0.038, 0.038, 5.85, 10]} />
                    <meshStandardMaterial color="#cbd5e1" metalness={0.92} roughness={0.18} />
                  </mesh>
                  {/* Twin Textured Silicon Photovoltaic Blankets */}
                  <mesh geometry={solarBlanketGeo} material={solarBlanketMat} position={[-0.49, 0, 0]} />
                  <mesh geometry={solarBlanketGeo} material={solarBlanketMat} position={[0.49, 0, 0]} />
                  {/* iROSA Roll-Out Overlay Wing (Inner High-Efficiency Panel) */}
                  <mesh
                    geometry={solarBlanketGeo}
                    material={solarBlanketMat}
                    position={[0, -yDir * 0.65, 0.05]}
                    scale={[0.72, 0.68, 1]}
                  />
                  {/* Tensioner Crossbeams */}
                  <mesh position={[0, yDir * 2.86, 0]}>
                    <boxGeometry args={[1.88, 0.07, 0.06]} />
                    <meshStandardMaterial color="#e2e8f0" metalness={0.9} roughness={0.2} />
                  </mesh>
                  <mesh position={[0, -yDir * 2.84, 0]}>
                    <boxGeometry args={[1.88, 0.07, 0.06]} />
                    <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.22} />
                  </mesh>
                </group>
              ))}
            </group>
          ))}
        </group>

        {/* ---------------------------------------------------- */}
        {/* 3. THIN ACCORDION AMMONIA HEAT-REJECTION RADIATORS   */}
        {/* ---------------------------------------------------- */}
        {[-2.05, 0.0, 2.05].map((radX, ri) => (
          <group key={`radiator-${ri}`} position={[radX, -0.55, -1.78]} rotation={[-0.22, 0, 0]}>
            {[-0.28, 0, 0.28].map((pleatX, pi) => (
              <mesh
                key={`pleat-${pi}`}
                position={[pleatX, 0, 0]}
                rotation={[0, 0, pi % 2 === 0 ? 0.18 : -0.18]}
              >
                <boxGeometry args={[0.24, 0.06, 2.65]} />
                <meshStandardMaterial
                  color="#f1f5f9"
                  bumpMap={aeroBumpMap}
                  bumpScale={0.02}
                  metalness={0.52}
                  roughness={0.34}
                />
              </mesh>
            ))}
            <mesh position={[0, 0.05, 0.95]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.04, 0.04, 1.35, 10]} />
              <meshStandardMaterial color="#64748b" metalness={0.9} roughness={0.22} />
            </mesh>
          </group>
        ))}

        {/* ---------------------------------------------------- */}
        {/* 4. QUILTED MLI PRESSURIZED HABITATION & LAB MODULES  */}
        {/* ---------------------------------------------------- */}
        {/* Unity Node 1 + Conical Bulkheads */}
        <group position={[0, 0, 0.35]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.62, 0.62, 1.05, 32]} />
            <meshStandardMaterial
              map={hullMap}
              bumpMap={aeroBumpMap}
              bumpScale={0.022}
              color="#dbe4ef"
              metalness={0.5}
              roughness={0.34}
            />
          </mesh>
          <mesh position={[0, 0.62, 0]}>
            <cylinderGeometry args={[0.46, 0.62, 0.2, 32]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.72} roughness={0.28} />
          </mesh>
        </group>

        {/* US Destiny Laboratory Module */}
        <group position={[0, 1.42, 0.35]}>
          <mesh>
            <cylinderGeometry args={[0.68, 0.68, 1.52, 36]} />
            <meshStandardMaterial
              map={hullMap}
              bumpMap={aeroBumpMap}
              bumpScale={0.02}
              color="#f8fafc"
              metalness={0.46}
              roughness={0.28}
            />
          </mesh>
          {[-0.48, 0, 0.48].map((ringY) => (
            <mesh key={`destiny-ring-${ringY}`} position={[0, ringY, 0]}>
              <cylinderGeometry args={[0.692, 0.692, 0.06, 36]} />
              <meshStandardMaterial color="#334155" metalness={0.85} roughness={0.24} />
            </mesh>
          ))}
        </group>

        {/* Harmony Node 2 */}
        <mesh position={[0, 2.62, 0.35]}>
          <cylinderGeometry args={[0.62, 0.62, 0.94, 32]} />
          <meshStandardMaterial
            map={hullMap}
            bumpMap={aeroBumpMap}
            bumpScale={0.02}
            color="#e2e8f0"
            metalness={0.5}
            roughness={0.3}
          />
        </mesh>

        {/* Columbus European Laboratory (+X) */}
        <group position={[1.42, 2.62, 0.35]} rotation={[0, 0, Math.PI / 2]}>
          <mesh>
            <cylinderGeometry args={[0.63, 0.63, 1.48, 32]} />
            <meshStandardMaterial
              map={hullMap}
              bumpMap={aeroBumpMap}
              bumpScale={0.02}
              color="#f8fafc"
              metalness={0.45}
              roughness={0.3}
            />
          </mesh>
          <mesh position={[0, -0.82, 0]}>
            <cylinderGeometry args={[0.42, 0.63, 0.18, 28]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.7} roughness={0.3} />
          </mesh>
        </group>
        <mesh position={[2.28, 2.62, 0.35]}>
          <boxGeometry args={[0.22, 0.52, 0.52]} />
          <meshStandardMaterial
            map={kaptonGoldMap}
            bumpMap={kaptonBumpMap}
            bumpScale={0.025}
            metalness={0.92}
            roughness={0.18}
          />
        </mesh>

        {/* Kibo Japanese Experiment Module JEM (-X) + Logistics ELM-PS */}
        <group position={[-1.72, 2.62, 0.35]}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.7, 0.7, 2.12, 36]} />
            <meshStandardMaterial
              map={hullMap}
              bumpMap={aeroBumpMap}
              bumpScale={0.02}
              color="#f1f5f9"
              metalness={0.48}
              roughness={0.28}
            />
          </mesh>
          {/* Kibo Upper Pressurized Logistics Module */}
          <mesh position={[-0.35, 0, -0.82]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.52, 0.52, 0.92, 28]} />
            <meshStandardMaterial
              map={hullMap}
              bumpMap={aeroBumpMap}
              bumpScale={0.018}
              color="#e2e8f0"
              metalness={0.5}
              roughness={0.3}
            />
          </mesh>
          {/* Kibo Exposed Facility Porch */}
          <mesh position={[-1.28, 0, 0]}>
            <boxGeometry args={[0.58, 0.82, 0.82]} />
            <meshStandardMaterial
              color="#64748b"
              bumpMap={aeroBumpMap}
              bumpScale={0.025}
              metalness={0.76}
              roughness={0.3}
            />
          </mesh>
        </group>

        {/* Quest Joint Airlock & High-Pressure O2/N2 Tanks */}
        <group position={[0.98, 0, 0.35]} rotation={[0, 0, Math.PI / 2]}>
          <mesh>
            <cylinderGeometry args={[0.48, 0.6, 0.84, 24]} />
            <meshStandardMaterial
              map={hullMap}
              bumpMap={aeroBumpMap}
              bumpScale={0.022}
              color="#e2e8f0"
              metalness={0.52}
              roughness={0.32}
            />
          </mesh>
          {[-0.28, 0.28].map((tz, tzi) => (
            <mesh key={`tank-${tzi}`} position={[0, 0.46, tz]}>
              <sphereGeometry args={[0.19, 18, 18]} />
              <meshStandardMaterial color="#f8fafc" metalness={0.62} roughness={0.24} />
            </mesh>
          ))}
        </group>

        {/* Docked SpaceX Crew Dragon at Forward PMA-2 */}
        <group position={[0, 3.82, 0.35]}>
          <mesh position={[0, -0.42, 0]}>
            <cylinderGeometry args={[0.34, 0.5, 0.42, 24]} />
            <meshStandardMaterial color="#334155" metalness={0.82} roughness={0.28} />
          </mesh>
          <mesh position={[0, 0.08, 0]}>
            <cylinderGeometry args={[0.38, 0.38, 0.52, 28]} />
            <meshStandardMaterial
              map={solarArrayMap}
              bumpMap={aeroBumpMap}
              bumpScale={0.015}
              metalness={0.75}
              roughness={0.24}
            />
          </mesh>
          <mesh position={[0, 0.56, 0]}>
            <cylinderGeometry args={[0.18, 0.38, 0.52, 28]} />
            <meshStandardMaterial
              map={hullMap}
              bumpMap={aeroBumpMap}
              bumpScale={0.015}
              color="#f8fafc"
              metalness={0.42}
              roughness={0.24}
            />
          </mesh>
        </group>

        {/* Russian Orbital Segment: Zarya FGB + Zvezda + Docked Soyuz MS */}
        <mesh position={[0, -1.22, 0.35]}>
          <cylinderGeometry args={[0.6, 0.64, 1.34, 28]} />
          <meshStandardMaterial
            color="#cbd5e1"
            bumpMap={kaptonBumpMap}
            bumpScale={0.03}
            metalness={0.48}
            roughness={0.42}
          />
        </mesh>

        <group position={[0, -2.52, 0.35]}>
          <mesh>
            <cylinderGeometry args={[0.54, 0.68, 1.42, 28]} />
            <meshStandardMaterial
              map={hullMap}
              bumpMap={kaptonBumpMap}
              bumpScale={0.025}
              color="#d6d3d1"
              metalness={0.52}
              roughness={0.36}
            />
          </mesh>
          {[-1.62, 1.62].map((zx, zi) => (
            <mesh key={`zvezda-solar-${zi}`} position={[zx, 0, 0]} material={solarBlanketMat}>
              <boxGeometry args={[1.65, 0.42, 0.025]} />
            </mesh>
          ))}
        </group>

        <group position={[0, -3.82, 0.35]}>
          <mesh position={[0, -0.45, 0]}>
            <sphereGeometry args={[0.32, 20, 20]} />
            <meshStandardMaterial
              color="#334155"
              bumpMap={kaptonBumpMap}
              bumpScale={0.03}
              metalness={0.58}
              roughness={0.42}
            />
          </mesh>
          <mesh position={[0, 0.0, 0]}>
            <cylinderGeometry args={[0.34, 0.26, 0.46, 20]} />
            <meshStandardMaterial
              color="#1e293b"
              bumpMap={kaptonBumpMap}
              bumpScale={0.028}
              metalness={0.68}
              roughness={0.36}
            />
          </mesh>
          <mesh position={[0, 0.42, 0]}>
            <cylinderGeometry args={[0.34, 0.34, 0.44, 20]} />
            <meshStandardMaterial color="#64748b" metalness={0.75} roughness={0.3} />
          </mesh>
          {[-1.12, 1.12].map((sx, si) => (
            <mesh key={`soyuz-solar-${si}`} position={[sx, 0.42, 0]} material={solarBlanketMat}>
              <boxGeometry args={[1.22, 0.28, 0.02]} />
            </mesh>
          ))}
        </group>

        {/* ---------------------------------------------------- */}
        {/* 5. TRANQUILITY NODE 3 & 7-WINDOW CUPOLA DOME         */}
        {/* ---------------------------------------------------- */}
        <group position={[0, 0.4, 1.05]}>
          <mesh rotation={[Math.PI / 2, Math.PI / 8, 0]}>
            <cylinderGeometry args={[0.48, 0.64, 0.34, 8]} />
            <meshStandardMaterial
              color="#334155"
              bumpMap={aeroBumpMap}
              bumpScale={0.02}
              metalness={0.88}
              roughness={0.22}
            />
          </mesh>

          <mesh position={[0, 0, 0.18]}>
            <circleGeometry args={[0.24, 28]} />
            <meshPhysicalMaterial
              color="#060b16"
              metalness={0.92}
              roughness={0.04}
              clearcoat={1.0}
              clearcoatRoughness={0.06}
              reflectivity={0.95}
            />
          </mesh>

          {[0, Math.PI / 3, (2 * Math.PI) / 3, Math.PI, (4 * Math.PI) / 3, (5 * Math.PI) / 3].map(
            (winAngle, wi) => (
              <mesh
                key={`cupola-win-${wi}`}
                position={[Math.cos(winAngle) * 0.38, Math.sin(winAngle) * 0.38, 0.05]}
                rotation={[-Math.sin(winAngle) * 0.45, Math.cos(winAngle) * 0.45, winAngle]}
              >
                <planeGeometry args={[0.22, 0.18]} />
                <meshPhysicalMaterial
                  color="#060b16"
                  metalness={0.92}
                  roughness={0.04}
                  clearcoat={1.0}
                  clearcoatRoughness={0.06}
                  reflectivity={0.95}
                  side={THREE.DoubleSide}
                />
              </mesh>
            )
          )}
        </group>

        {/* ---------------------------------------------------- */}
        {/* 6. CANADARM2 & KU-BAND PARABOLIC COMMS               */}
        {/* ---------------------------------------------------- */}
        <group position={[-0.8, 0.6, -0.05]}>
          <mesh>
            <sphereGeometry args={[0.1, 16, 16]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.85} roughness={0.2} />
          </mesh>
          <mesh position={[0.25, 0.6, 0.15]} rotation={[0.4, 0.2, 0.6]}>
            <cylinderGeometry args={[0.042, 0.042, 1.4, 12]} />
            <meshStandardMaterial color="#f8fafc" metalness={0.5} roughness={0.28} />
          </mesh>
          <mesh position={[0.5, 1.15, 0.3]}>
            <sphereGeometry args={[0.09, 16, 16]} />
            <meshStandardMaterial
              map={kaptonGoldMap}
              metalness={0.92}
              roughness={0.18}
            />
          </mesh>
          <mesh position={[0.4, 1.7, 0.15]} rotation={[-0.3, 0.1, 0.3]}>
            <cylinderGeometry args={[0.04, 0.04, 1.2, 12]} />
            <meshStandardMaterial color="#f8fafc" metalness={0.5} roughness={0.28} />
          </mesh>
          <mesh position={[0.3, 2.25, 0]}>
            <cylinderGeometry args={[0.06, 0.07, 0.18, 14]} />
            <meshStandardMaterial color="#1e293b" metalness={0.94} roughness={0.16} />
          </mesh>
        </group>

        <group position={[1.8, 0.4, -0.6]} rotation={[-0.5, 0.3, 0]}>
          <mesh>
            <cylinderGeometry args={[0.03, 0.03, 0.6, 8]} />
            <meshStandardMaterial color="#475569" metalness={0.9} roughness={0.2} />
          </mesh>
          <mesh position={[0, 0.32, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.42, 0.06, 0.1, 24]} />
            <meshStandardMaterial color="#f1f5f9" metalness={0.65} roughness={0.24} />
          </mesh>
        </group>

        {/* Navigation Wingtip Beacons */}
        <mesh position={[-9.2, 0, -0.3]}>
          <sphereGeometry args={[0.06, 12, 12]} />
          <meshBasicMaterial color="#ef4444" />
        </mesh>
        <mesh position={[9.2, 0, -0.3]}>
          <sphereGeometry args={[0.06, 12, 12]} />
          <meshBasicMaterial color="#10b981" />
        </mesh>
      </group>
    </group>
  );
};
