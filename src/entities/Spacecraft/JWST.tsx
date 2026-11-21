import React, { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AssetManager } from '@/engine/assets/AssetManager';
import { CameraManager } from '@/engine/camera/CameraManager';
import { SpacecraftEphemeris } from '@/engine/ephemeris/SpacecraftEphemeris';
import { SimulationClock } from '@/engine/simulation/SimulationClock';

interface JWSTProps {
  earthPosition: THREE.Vector3;
  onFocus?: () => void;
}

const NOOP_RAYCAST: THREE.Object3D['raycast'] = () => {};
const LOD_ENTER_DISTANCE = 23.5;
const LOD_EXIT_DISTANCE = 25.0;

export function updateJWSTFrame(
  group: THREE.Group,
  detailGroup: THREE.Group | null,
  distantProxy: THREE.Group | null,
  cameraPosition: THREE.Vector3,
  simTime: number,
  earthPosition: THREE.Vector3,
  scratchPos: THREE.Vector3
): void {
  const pos = SpacecraftEphemeris.getInstance().getJWSTPosition(simTime, earthPosition, scratchPos);
  group.position.copy(pos);

  // +Z points toward the Sun at (0, 0, 0); primary mirror & sunshield bow face -Z into deep space
  group.lookAt(0, 0, 0);

  const dist = cameraPosition.distanceTo(pos);
  const wasNear = detailGroup ? detailGroup.visible : true;
  const isNear = wasNear ? dist <= LOD_EXIT_DISTANCE : dist <= LOD_ENTER_DISTANCE;
  if (detailGroup) {
    detailGroup.visible = isNear;
  }
  if (distantProxy) {
    distantProxy.visible = !isNear;
  }
}

function createSubdividedKiteSunshieldGeo(): THREE.BufferGeometry {
  const segU = 48;
  const segV = 32;
  const cols = segU + 1;
  const rows = segV + 1;
  const positions = new Float32Array(cols * rows * 3);
  const uvs = new Float32Array(cols * rows * 2);
  const indices: number[] = [];

  const kiteHalfWidth = (yKite: number): number => {
    if (yKite >= 2.2) {
      return THREE.MathUtils.lerp(2.38, 0.08, (yKite - 2.2) / 3.0);
    }
    if (yKite >= -0.45) {
      return THREE.MathUtils.lerp(3.68, 2.38, (yKite + 0.45) / 2.65);
    }
    if (yKite >= -4.65) {
      return THREE.MathUtils.lerp(1.76, 3.68, (yKite + 4.65) / 4.2);
    }
    return THREE.MathUtils.lerp(0.68, 1.76, (yKite + 5.0) / 0.35);
  };

  for (let r = 0; r < rows; r++) {
    const tv = r / segV;
    const v = tv * 2.0 - 1.0;
    const yKite = THREE.MathUtils.lerp(-5.0, 5.2, tv);
    const halfW = kiteHalfWidth(yKite);

    for (let c = 0; c < cols; c++) {
      const tu = c / segU;
      const u = tu * 2.0 - 1.0;
      const px = u * halfW;

      // Authentic subtle catenary membrane sag + fine spreader tension ripples (zero zebra banding) + upturned bow/stern camber
      const catenarySag = -0.055 * Math.sin(Math.abs(u) * Math.PI) * (1.0 - 0.35 * Math.abs(v));
      const tensionRipples =
        0.0045 * Math.sin(u * 12.0 + Math.abs(v) * 6.5) * Math.sin(Math.abs(u) * Math.PI);
      const bowSternCamber = 0.075 * Math.pow(Math.abs(v), 2.3);
      const pz = catenarySag + tensionRipples + bowSternCamber;

      const idx = r * cols + c;
      positions[idx * 3] = px;
      positions[idx * 3 + 1] = yKite;
      positions[idx * 3 + 2] = pz;

      uvs[idx * 2] = tu * 3.2;
      uvs[idx * 2 + 1] = tv * 4.2;
    }
  }

  for (let r = 0; r < segV; r++) {
    for (let c = 0; c < segU; c++) {
      const a = r * cols + c;
      const b = a + 1;
      const d = (r + 1) * cols + c;
      const e = d + 1;
      indices.push(a, b, d, b, e, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

export const JWST: React.FC<JWSTProps> = ({ earthPosition, onFocus }) => {
  const groupRef = useRef<THREE.Group>(null);
  const detailGroupRef = useRef<THREE.Group>(null);
  const distantProxyRef = useRef<THREE.Group>(null);
  const sunshieldDeckRef = useRef<THREE.Group>(null);
  const mirrorInstancedRef = useRef<THREE.InstancedMesh>(null);
  const tempPos = useRef(new THREE.Vector3());
  const liveEarthPos = useRef(new THREE.Vector3());

  const assets = useMemo(() => AssetManager.getInstance(), []);
  const kaptonRoseMap = useMemo(() => assets.getKaptonFoilMap('rose'), [assets]);
  const kaptonSilverMap = useMemo(() => assets.getKaptonFoilMap('silver'), [assets]);
  const kaptonGoldMap = useMemo(() => assets.getKaptonFoilMap('gold'), [assets]);
  const kaptonBumpMap = useMemo(() => assets.getKaptonBumpMap(), [assets]);
  const solarArrayMap = useMemo(() => assets.getSolarArrayMap(), [assets]);
  const aeroBumpMap = useMemo(() => assets.getAerospaceBumpMap(), [assets]);

  useFrame((state) => {
    if (!groupRef.current) return;
    const earthCenter =
      CameraManager.getInstance().getLiveBodyPosition('earth', liveEarthPos.current) || earthPosition;
    updateJWSTFrame(
      groupRef.current,
      detailGroupRef.current,
      distantProxyRef.current,
      state.camera.position,
      SimulationClock.getInstance().simulationTime,
      earthCenter,
      tempPos.current
    );
  });

  // High-density 48x32 subdivided parametric kite sunshield membrane with catenary sag & tension ripples
  const sunshieldGeom = useMemo(() => createSubdividedKiteSunshieldGeo(), []);

  // Parabolic Ka-band high-gain dish (LatheGeometry)
  const commsDishGeo = useMemo(() => {
    const pts = [
      new THREE.Vector2(0.0, 0.0),
      new THREE.Vector2(0.16, 0.025),
      new THREE.Vector2(0.3, 0.085),
      new THREE.Vector2(0.42, 0.175),
    ];
    const geo = new THREE.LatheGeometry(pts, 28);
    geo.computeVertexNormals();
    return geo;
  }, []);

  // Exact coordinates for the 18 individual hexagonal gold-coated beryllium mirror segments
  const mirrorSegments = useMemo(() => {
    const d = 0.44;
    const list: Array<{ x: number; y: number }> = [];
    for (let q = -2; q <= 2; q++) {
      for (let r = -2; r <= 2; r++) {
        if (Math.abs(q + r) <= 2) {
          if (q === 0 && r === 0) continue; // Central hole for Aft Optics Subsystem baffle
          const x = d * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r);
          const y = d * (1.5 * r);
          list.push({ x: +x.toFixed(4), y: +y.toFixed(4) });
        }
      }
    }
    return list;
  }, []);

  useLayoutEffect(() => {
    const instanced = mirrorInstancedRef.current;
    if (instanced) {
      const dummy = new THREE.Object3D();
      const baseQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));
      const tiltQuat = new THREE.Quaternion();
      const tiltAxis = new THREE.Vector3();
      const focalLength = 2.85;

      mirrorSegments.forEach((seg, idx) => {
        const radialDist = Math.hypot(seg.x, seg.y);
        // True concave parabolic optical curvature facing -Z (secondary mirror over forward bow)
        const dz = -(radialDist * radialDist) / (4.0 * focalLength);
        dummy.position.set(seg.x, seg.y, dz);

        dummy.quaternion.copy(baseQuat);
        if (radialDist > 1e-4) {
          tiltAxis.set(-seg.y / radialDist, seg.x / radialDist, 0);
          const slopeAngle = Math.atan2(radialDist, 2.0 * focalLength);
          tiltQuat.setFromAxisAngle(tiltAxis, -slopeAngle);
          dummy.quaternion.premultiply(tiltQuat);
        }

        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        instanced.setMatrixAt(idx, dummy.matrix);
      });
      instanced.instanceMatrix.needsUpdate = true;
      instanced.computeBoundingSphere();
    }

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
  }, [mirrorSegments]);

  useEffect(() => {
    const root = groupRef.current;
    return () => {
      sunshieldGeom.dispose();
      commsDishGeo.dispose();
      root?.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.isMesh) {
          if (mesh.geometry !== sunshieldGeom && mesh.geometry !== commsDishGeo) {
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
  }, [sunshieldGeom, commsDishGeo]);

  return (
    <group ref={groupRef} scale={0.03}>
      {/* Single raycastable hit-sphere proxy */}
      <mesh onClick={onFocus}>
        <sphereGeometry args={[10, 12, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>

      {/* Lightweight distant proxy rendered beyond 25 units (90° perpendicular sunshield + upright mirror) */}
      <group ref={distantProxyRef} visible={false} rotation={[0.18, 0, 0]}>
        <mesh geometry={sunshieldGeom} position={[0, -1.35, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={NOOP_RAYCAST}>
          <meshStandardMaterial
            map={kaptonSilverMap}
            color="#e2e8f0"
            metalness={0.94}
            roughness={0.18}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh position={[0, 1.05, -0.35]} rotation={[Math.PI / 2, 0, 0]} raycast={NOOP_RAYCAST}>
          <cylinderGeometry args={[2.15, 2.15, 0.08, 6]} />
          <meshStandardMaterial
            color="#fbbf24"
            emissive="#d97706"
            emissiveIntensity={0.22}
            metalness={0.98}
            roughness={0.08}
          />
        </mesh>
      </group>

      {/* High-detail NASA JWST Observatory (Horizontal XZ 5-Layer Sunshield Deck + Upright XY Primary Mirror) */}
      <group ref={detailGroupRef} rotation={[0.18, 0, 0]}>
        {/* ---------------------------------------------------- */}
        {/* 1. HORIZONTAL 5-LAYER KAPTON KITE SUNSHIELD DECK     */}
        {/* (90° perpendicular beneath the upright gold mirror!) */}
        {/* ---------------------------------------------------- */}
        <group ref={sunshieldDeckRef} position={[0, -1.35, 0]}>
          {/* Layers 5..2 (Cold-facing VDA aluminized Kapton membranes fanned cleanly with taut satin foil sheen) */}
          {[
            { y: 0.3, s: 0.92, tilt: 0.018, col: '#cbd5e1', rough: 0.28, env: 1.55 },
            { y: 0.16, s: 0.95, tilt: 0.008, col: '#94a3b8', rough: 0.30, env: 1.45 },
            { y: 0.02, s: 0.975, tilt: 0.0, col: '#cbd5e1', rough: 0.31, env: 1.40 },
            { y: -0.12, s: 0.99, tilt: -0.008, col: '#d8b4fe', rough: 0.33, env: 1.35 },
          ].map((layer, li) => (
            <mesh
              key={`shield-vda-${li}`}
              geometry={sunshieldGeom}
              position={[0, layer.y, 0]}
              rotation={[-Math.PI / 2 + layer.tilt, 0, 0]}
              scale={[layer.s, layer.s, 1]}
            >
              <meshStandardMaterial
                map={kaptonSilverMap}
                bumpMap={kaptonBumpMap}
                bumpScale={0.012}
                color={layer.col}
                metalness={0.88}
                roughness={layer.rough}
                envMapIntensity={layer.env}
                side={THREE.DoubleSide}
              />
            </mesh>
          ))}

          {/* Layer 1 (Bottom Sun-facing silicon-coated rose-copper Kapton E membrane) */}
          <mesh
            geometry={sunshieldGeom}
            position={[0, -0.28, 0]}
            rotation={[-Math.PI / 2 - 0.018, 0, 0]}
            scale={[1.01, 1.01, 1]}
          >
            <meshStandardMaterial
              map={kaptonRoseMap}
              bumpMap={kaptonBumpMap}
              bumpScale={0.014}
              color="#d89bb8"
              metalness={0.86}
              roughness={0.34}
              envMapIntensity={1.4}
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* Port & Starboard Telescoping Mid-Booms & Vertical Membrane Spreader Posts */}
          <mesh position={[0, -0.02, 0.45]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.045, 0.045, 7.45, 16]} />
            <meshStandardMaterial color="#64748b" metalness={0.94} roughness={0.18} />
          </mesh>
          {[
            [-3.62, 0.45],
            [3.62, 0.45],
            [-1.72, 4.62],
            [1.72, 4.62],
            [0, -5.12],
          ].map(([sx, sz], si) => (
            <mesh key={`spreader-post-${si}`} position={[sx, 0, sz]}>
              <cylinderGeometry args={[0.028, 0.028, 0.58, 10]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.92} roughness={0.2} />
            </mesh>
          ))}

          {/* Forward (-Z) & Aft (+Z) Unitized Pallet Structures (UPS) */}
          <mesh position={[0, -0.05, -4.65]}>
            <boxGeometry args={[1.25, 0.24, 0.42]} />
            <meshStandardMaterial
              color="#334155"
              bumpMap={aeroBumpMap}
              bumpScale={0.02}
              metalness={0.88}
              roughness={0.26}
            />
          </mesh>
          <mesh position={[0, -0.05, 4.65]}>
            <boxGeometry args={[1.35, 0.24, 0.42]} />
            <meshStandardMaterial
              color="#334155"
              bumpMap={aeroBumpMap}
              bumpScale={0.02}
              metalness={0.88}
              roughness={0.26}
            />
          </mesh>

          {/* Aft Momentum Trim Flap at Stern (+Z) */}
          <mesh position={[0, 0.12, 5.25]} rotation={[0.42, 0, 0]}>
            <boxGeometry args={[1.95, 0.03, 0.62]} />
            <meshStandardMaterial
              map={kaptonSilverMap}
              bumpMap={kaptonBumpMap}
              bumpScale={0.015}
              metalness={0.94}
              roughness={0.18}
            />
          </mesh>
        </group>

        {/* ---------------------------------------------------- */}
        {/* 2. SUNWARD GOLD-MLI SPACECRAFT BUS & SOLAR TAIL (-Y) */}
        {/* ---------------------------------------------------- */}
        <group position={[0, -2.18, 0.45]}>
          <mesh>
            <boxGeometry args={[1.55, 0.92, 1.35]} />
            <meshStandardMaterial
              map={kaptonGoldMap}
              bumpMap={kaptonBumpMap}
              bumpScale={0.03}
              color="#fbbf24"
              metalness={0.94}
              roughness={0.2}
            />
          </mesh>

          {/* Earth-Pointing Parabolic Ka-Band High-Gain Dish */}
          <group position={[0.85, -0.25, 0.48]} rotation={[0.35, 0.4, 0]}>
            <mesh geometry={commsDishGeo} rotation={[Math.PI / 2, 0, 0]}>
              <meshStandardMaterial
                color="#f8fafc"
                metalness={0.55}
                roughness={0.26}
                side={THREE.DoubleSide}
              />
            </mesh>
          </group>

          {/* 6-Meter Sunward Photovoltaic Solar Array Tail Extending Aft (+Z) */}
          <group position={[0, -0.18, 1.95]} rotation={[0.18, 0, 0]}>
            <mesh>
              <boxGeometry args={[0.92, 0.035, 2.55]} />
              <meshStandardMaterial
                map={solarArrayMap}
                bumpMap={aeroBumpMap}
                bumpScale={0.012}
                color="#ffffff"
                emissive="#92400e"
                emissiveIntensity={0.12}
                metalness={0.8}
                roughness={0.2}
              />
            </mesh>
          </group>
        </group>

        {/* ---------------------------------------------------- */}
        {/* 3. VERTICAL DEPLOYABLE TOWER (DTA) & CRYOGENIC ISIM  */}
        {/* ---------------------------------------------------- */}
        <mesh position={[0, -0.15, 0.12]}>
          <cylinderGeometry args={[0.34, 0.4, 2.15, 8]} />
          <meshStandardMaterial color="#111827" metalness={0.88} roughness={0.28} />
        </mesh>

        {/* Cryogenic ISIM Science Instrument Enclosure Behind Primary Mirror (+Z) */}
        <mesh position={[0, 1.08, 0.42]}>
          <boxGeometry args={[2.05, 1.85, 0.92]} />
          <meshStandardMaterial
            color="#090d16"
            bumpMap={aeroBumpMap}
            bumpScale={0.025}
            metalness={0.84}
            roughness={0.36}
          />
        </mesh>
        {/* Top MIRI Cryo-Radiator Fin */}
        <mesh position={[0, 2.25, 0.36]} rotation={[0.22, 0, 0]}>
          <boxGeometry args={[1.48, 0.58, 0.06]} />
          <meshStandardMaterial
            color="#e2e8f0"
            bumpMap={aeroBumpMap}
            bumpScale={0.02}
            metalness={0.72}
            roughness={0.26}
          />
        </mesh>

        {/* ---------------------------------------------------- */}
        {/* 4. UPRIGHT 6.5m 18-HEXAGON 24K GOLD PRIMARY MIRROR   */}
        {/* (Facing -Z over forward bow, perpendicular to deck!) */}
        {/* ---------------------------------------------------- */}
        <group position={[0, 1.15, -0.12]}>
          {/* Matte Black Graphite-Composite Honeycomb Backplane */}
          <mesh position={[0, 0, 0.06]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[2.28, 2.34, 0.1, 6]} />
            <meshStandardMaterial color="#05080f" metalness={0.85} roughness={0.44} />
          </mesh>

          {/* 18 Concave Parabolic Gold-Coated Beryllium Segments (controlled speculars, zero Bloom blowout) */}
          <instancedMesh
            ref={mirrorInstancedRef}
            args={[undefined, undefined, mirrorSegments.length]}
            raycast={NOOP_RAYCAST}
          >
            <cylinderGeometry args={[0.396, 0.396, 0.05, 6]} />
            <meshStandardMaterial
              color="#d4941a"
              emissive="#78350f"
              emissiveIntensity={0.11}
              metalness={0.95}
              roughness={0.145}
              envMapIntensity={1.65}
            />
          </instancedMesh>

          {/* Central Aft Optics Subsystem (AOS) Ribbed Black Baffle Cone */}
          <mesh position={[0, 0, -0.24]} rotation={[-Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.14, 0.28, 0.48, 18]} />
            <meshStandardMaterial
              color="#05070d"
              bumpMap={aeroBumpMap}
              bumpScale={0.03}
              metalness={0.82}
              roughness={0.52}
            />
          </mesh>

          {/* Cold-Side Zodiacal Optical Rim Fill Light (INV3 persistent light, balanced below Bloom blowout) */}
          <pointLight position={[-1.8, 1.6, -4.5]} color="#fde68a" intensity={0.55} distance={9.5} />

          {/* ---------------------------------------------------- */}
          {/* 5. SECONDARY MIRROR TRIPOD STRUTS OVERHANGING BOW    */}
          {/* ---------------------------------------------------- */}
          <group>
            {/* Upper Hinged Strut */}
            <mesh position={[0, 0.94, -1.18]} rotation={[0.66, 0, 0]}>
              <cylinderGeometry args={[0.028, 0.028, 2.95, 10]} />
              <meshStandardMaterial color="#0f172a" metalness={0.92} roughness={0.26} />
            </mesh>
            {/* Lower Twin V-Struts */}
            <mesh position={[-0.78, -0.54, -1.18]} rotation={[-0.36, -0.52, -0.52]}>
              <cylinderGeometry args={[0.028, 0.028, 2.98, 10]} />
              <meshStandardMaterial color="#0f172a" metalness={0.92} roughness={0.26} />
            </mesh>
            <mesh position={[0.78, -0.54, -1.18]} rotation={[-0.36, 0.52, 0.52]}>
              <cylinderGeometry args={[0.028, 0.028, 2.98, 10]} />
              <meshStandardMaterial color="#0f172a" metalness={0.92} roughness={0.26} />
            </mesh>
          </group>

          {/* 3D Curved Convex Gold Secondary Mirror & Carbon-Composite Baffle Shroud at Focal Apex (-Z) */}
          <group position={[0, 0, -2.35]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.29, 0.32, 0.24, 28]} />
              <meshStandardMaterial
                color="#090d16"
                bumpMap={aeroBumpMap}
                bumpScale={0.02}
                metalness={0.86}
                roughness={0.36}
              />
            </mesh>
            <mesh position={[0, 0, 0.23]} rotation={[-Math.PI / 2, 0, 0]}>
              <sphereGeometry args={[0.24, 24, 16, 0, Math.PI * 2, 0, 0.58]} />
              <meshStandardMaterial
                color="#d9961b"
                emissive="#78350f"
                emissiveIntensity={0.14}
                metalness={0.96}
                roughness={0.12}
                envMapIntensity={1.75}
                side={THREE.DoubleSide}
              />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );
};
