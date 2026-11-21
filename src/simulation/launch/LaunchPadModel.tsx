import React, { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { AssetManager } from "@/engine/assets/AssetManager";
import { LaunchController } from "./LaunchController";

interface LaunchPadModelProps {
  timeSeconds?: number;
}

function createTiledPlaneGeometry(
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

export const LaunchPadModel: React.FC<LaunchPadModelProps> = () => {
  const padRootRef = useRef<THREE.Group>(null);
  const crewArmRef = useRef<THREE.Group>(null);
  const strongbackRef = useRef<THREE.Group>(null);
  const beaconMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const beaconGlowRef = useRef<THREE.SpriteMaterial>(null);

  const assets = useMemo(() => AssetManager.getInstance(), []);
  const trussAlphaMap = useMemo(() => assets.getSteelTrussAlphaMap(), [assets]);
  const aeroBumpMap = useMemo(() => assets.getAerospaceBumpMap(), [assets]);
  const softGlowMap = useMemo(() => assets.getSoftParticleMap(), [assets]);

  // Pre-tiled lattice truss geometries (preserves shared AssetManager texture repeat)
  const towerTrussFaceGeo = useMemo(
    () => createTiledPlaneGeometry(3.7, 29.0, 1, 8),
    []
  );
  const strongbackSideGeo = useMemo(
    () => createTiledPlaneGeometry(1.55, 22.4, 1, 9),
    []
  );
  const strongbackFrontGeo = useMemo(
    () => createTiledPlaneGeometry(1.35, 22.4, 1, 9),
    []
  );
  const crewArmTrussGeo = useMemo(
    () => createTiledPlaneGeometry(3.55, 1.42, 2, 1),
    []
  );

  // Open-lattice steel truss materials
  const fssTrussMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#334155",
        alphaMap: trussAlphaMap,
        alphaTest: 0.38,
        side: THREE.DoubleSide,
        metalness: 0.86,
        roughness: 0.32
      }),
    [trussAlphaMap]
  );

  const strongbackTrussMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#64748b",
        alphaMap: trussAlphaMap,
        alphaTest: 0.38,
        side: THREE.DoubleSide,
        metalness: 0.84,
        roughness: 0.34
      }),
    [trussAlphaMap]
  );

  const crewArmTrussMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#cbd5e1",
        alphaMap: trussAlphaMap,
        alphaTest: 0.38,
        side: THREE.DoubleSide,
        metalness: 0.78,
        roughness: 0.28
      }),
    [trussAlphaMap]
  );

  useEffect(() => {
    const root = padRootRef.current;
    return () => {
      towerTrussFaceGeo.dispose();
      strongbackSideGeo.dispose();
      strongbackFrontGeo.dispose();
      crewArmTrussGeo.dispose();
      fssTrussMat.dispose();
      strongbackTrussMat.dispose();
      crewArmTrussMat.dispose();
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
        const sprite = obj as THREE.Sprite;
        if (sprite.isSprite) {
          sprite.material?.dispose();
        }
      });
    };
  }, [
    towerTrussFaceGeo,
    strongbackSideGeo,
    strongbackFrontGeo,
    crewArmTrussGeo,
    fssTrussMat,
    strongbackTrussMat,
    crewArmTrussMat
  ]);

  useFrame(() => {
    const traj = LaunchController.getInstance().getTrajectoryState();
    const isVisible = traj.altitudeKm < 12;
    if (padRootRef.current) {
      padRootRef.current.visible = isVisible;
    }
    if (!isVisible) return;

    // Deterministic Crew Access Arm retraction (+112° behind/right of FSS tower, 100% clear of rocket & FOLLOW sightline)
    const armProgress = THREE.MathUtils.smoothstep(traj.timeSeconds, 3.0, 7.5);
    if (crewArmRef.current) {
      crewArmRef.current.rotation.y = THREE.MathUtils.degToRad(112.0) * armProgress;
    }

    // Deterministic Transporter-Erector (Strongback) rapid throwback at T+10s liftoff
    const throwbackProgress = THREE.MathUtils.smoothstep(traj.timeSeconds, 9.4, 11.2);
    if (strongbackRef.current) {
      strongbackRef.current.rotation.z = THREE.MathUtils.degToRad(1.6 + 16.4 * throwbackProgress);
    }

    const pulse = 0.5 + 0.5 * Math.sin(performance.now() * 0.0055);
    const flash = Math.pow(pulse, 3.0);
    if (beaconMatRef.current) {
      beaconMatRef.current.color.setRGB(
        0.35 + flash * 0.65,
        0.04 + flash * 0.14,
        0.08 + flash * 0.16
      );
    }
    if (beaconGlowRef.current) {
      beaconGlowRef.current.opacity = 0.18 + flash * 0.72;
    }
  });

  const deckHeights = [-10.5, -6.0, -1.5, 3.0, 7.5, 11.5, 14.8];

  return (
    <group ref={padRootRef} position={[0, 0, 0]}>
      {/* ---------------------------------------------------- */}
      {/* 1. REINFORCED CONCRETE APRON & DUAL FLAME DEFLECTOR  */}
      {/* ---------------------------------------------------- */}
      <mesh position={[0, -13.25, 0]}>
        <cylinderGeometry args={[42, 46.5, 2.3, 8]} />
        <meshStandardMaterial
          color="#3b4656"
          bumpMap={aeroBumpMap}
          bumpScale={0.04}
          roughness={0.92}
          metalness={0.08}
        />
      </mesh>

      {/* Scorched Refractory Brick Flame Trench Channel */}
      <mesh position={[0, -13.02, 0]}>
        <boxGeometry args={[8.4, 2.25, 24.5]} />
        <meshStandardMaterial color="#0b101b" roughness={0.96} metalness={0.12} />
      </mesh>

      {/* Water-Cooled Steel Wedge Flame Deflector */}
      <mesh position={[0, -13.75, 0]} rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[5.0, 5.0, 14.8]} />
        <meshStandardMaterial
          color="#1e293b"
          bumpMap={aeroBumpMap}
          bumpScale={0.025}
          metalness={0.84}
          roughness={0.34}
        />
      </mesh>

      {/* ---------------------------------------------------- */}
      {/* 2. OCTAGONAL ORBITAL LAUNCH MOUNT (OLM) & HOLD-DOWNS */}
      {/* ---------------------------------------------------- */}
      {/* 6 Tapered Heavy Steel Support Columns + Diagonal Braces */}
      {[0, 1, 2, 3, 4, 5].map((pi) => {
        const angle = (pi / 6) * Math.PI * 2 + Math.PI / 6;
        const px = Math.cos(angle) * 3.45;
        const pz = Math.sin(angle) * 3.45;
        return (
          <group key={`olm-leg-${pi}`} position={[px, -12.35, pz]} rotation={[0, -angle, 0]}>
            <mesh rotation={[0, 0, -0.08]}>
              <cylinderGeometry args={[0.42, 0.58, 2.35, 16]} />
              <meshStandardMaterial color="#334155" metalness={0.88} roughness={0.28} />
            </mesh>
            <mesh position={[-0.38, 0.15, 0]} rotation={[0, 0, 0.52]}>
              <cylinderGeometry args={[0.12, 0.14, 1.9, 10]} />
              <meshStandardMaterial color="#1e293b" metalness={0.86} roughness={0.32} />
            </mesh>
          </group>
        );
      })}

      {/* Octagonal Steel Reaction Deck Table (replaces toy torus ring) */}
      <mesh position={[0, -11.55, 0]}>
        <cylinderGeometry args={[3.65, 3.85, 0.88, 8]} />
        <meshStandardMaterial
          color="#1e293b"
          bumpMap={aeroBumpMap}
          bumpScale={0.03}
          metalness={0.88}
          roughness={0.26}
        />
      </mesh>

      {/* Dark Recessed Central Exhaust Plenum Aperture */}
      <mesh position={[0, -11.52, 0]}>
        <cylinderGeometry args={[2.12, 2.25, 0.94, 24]} />
        <meshStandardMaterial color="#060911" metalness={0.75} roughness={0.65} />
      </mesh>

      {/* 4 Hydraulic Hold-Down Clamps & 2 Tail Service Mast (TSM) Cryo Housings */}
      {[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((cAngle, ci) => (
        <group
          key={`hold-down-${ci}`}
          position={[Math.cos(cAngle) * 2.42, -11.05, Math.sin(cAngle) * 2.42]}
          rotation={[0, -cAngle, 0]}
        >
          <mesh>
            <boxGeometry args={[0.58, 0.62, 0.52]} />
            <meshStandardMaterial color="#64748b" metalness={0.88} roughness={0.24} />
          </mesh>
          <mesh position={[-0.22, 0.24, 0]} rotation={[0, 0, 0.35]}>
            <boxGeometry args={[0.36, 0.28, 0.34]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.92} roughness={0.2} />
          </mesh>
        </group>
      ))}

      {[-1, 1].map((zSign) => (
        <group key={`tsm-${zSign}`} position={[2.25, -10.55, zSign * 2.05]}>
          <mesh rotation={[0, 0, 0.14]}>
            <boxGeometry args={[0.78, 1.45, 0.68]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.72} roughness={0.32} />
          </mesh>
          <mesh position={[-0.36, 0.2, 0]} rotation={[0, 0, Math.PI / 3]}>
            <cylinderGeometry args={[0.09, 0.09, 0.95, 12]} />
            <meshStandardMaterial color="#475569" metalness={0.88} roughness={0.26} />
          </mesh>
        </group>
      ))}

      {/* ---------------------------------------------------- */}
      {/* 3. TRANSPORTER-ERECTOR (STRONGBACK) LATTICE BOOM     */}
      {/* ---------------------------------------------------- */}
      <group ref={strongbackRef} position={[-3.25, -11.5, 0]} rotation={[0, 0, 0.028]}>
        {/* 4 Corner Chords */}
        {[-0.68, 0.68].map((sx) =>
          [-0.78, 0.78].map((sz) => (
            <mesh key={`sb-chord-${sx}-${sz}`} position={[sx, 11.2, sz]}>
              <cylinderGeometry args={[0.11, 0.14, 22.4, 10]} />
              <meshStandardMaterial color="#64748b" metalness={0.86} roughness={0.3} />
            </mesh>
          ))
        )}
        {/* Open X-Braced Lattice Webbing on all 4 sides */}
        <mesh geometry={strongbackSideGeo} material={strongbackTrussMat} position={[0, 11.2, 0.78]} />
        <mesh geometry={strongbackSideGeo} material={strongbackTrussMat} position={[0, 11.2, -0.78]} />
        <mesh
          geometry={strongbackFrontGeo}
          material={strongbackTrussMat}
          position={[0.68, 11.2, 0]}
          rotation={[0, Math.PI / 2, 0]}
        />
        <mesh
          geometry={strongbackFrontGeo}
          material={strongbackTrussMat}
          position={[-0.68, 11.2, 0]}
          rotation={[0, Math.PI / 2, 0]}
        />
        {/* Upper Stage Cradle Clamp Ring */}
        <mesh position={[0.95, 16.4, 0]}>
          <boxGeometry args={[1.15, 0.36, 1.75]} />
          <meshStandardMaterial color="#475569" metalness={0.88} roughness={0.28} />
        </mesh>
      </group>

      {/* ---------------------------------------------------- */}
      {/* 4. OPEN-LATTICE FIXED SERVICE STRUCTURE (FSS TOWER)  */}
      {/* ---------------------------------------------------- */}
      <group position={[-7.8, 0, 0]}>
        {/* 4 Corner Structural Steel Columns */}
        {[-1.85, 1.85].map((tx) =>
          [-1.85, 1.85].map((tz) => (
            <mesh key={`fss-col-${tx}-${tz}`} position={[tx, 1.25, tz]}>
              <cylinderGeometry args={[0.2, 0.26, 29.0, 14]} />
              <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.24} />
            </mesh>
          ))
        )}

        {/* 4 See-Through Diagonal X-Braced Steel Truss Faces */}
        <mesh geometry={towerTrussFaceGeo} material={fssTrussMat} position={[0, 1.25, 1.85]} />
        <mesh geometry={towerTrussFaceGeo} material={fssTrussMat} position={[0, 1.25, -1.85]} />
        <mesh
          geometry={towerTrussFaceGeo}
          material={fssTrussMat}
          position={[1.85, 1.25, 0]}
          rotation={[0, Math.PI / 2, 0]}
        />
        <mesh
          geometry={towerTrussFaceGeo}
          material={fssTrussMat}
          position={[-1.85, 1.25, 0]}
          rotation={[0, Math.PI / 2, 0]}
        />

        {/* Recessed Dark Elevator Hoistway Core & Cryogenic LOX Standpipes */}
        <mesh position={[-0.45, 1.25, 0]}>
          <boxGeometry args={[1.25, 28.6, 1.35]} />
          <meshStandardMaterial
            color="#0f172a"
            bumpMap={aeroBumpMap}
            bumpScale={0.02}
            metalness={0.82}
            roughness={0.36}
          />
        </mesh>
        <mesh position={[1.15, 1.0, 1.15]}>
          <cylinderGeometry args={[0.16, 0.16, 28.2, 12]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.92} roughness={0.18} />
        </mesh>
        <mesh position={[1.15, 1.0, -1.15]}>
          <cylinderGeometry args={[0.12, 0.12, 28.2, 12]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.88} roughness={0.24} />
        </mesh>

        {/* Grated Steel Access Platforms with Fine Industrial Handrail Bars */}
        {deckHeights.map((deckY) => (
          <group key={`fss-deck-${deckY}`} position={[0, deckY, 0]}>
            <mesh>
              <boxGeometry args={[4.05, 0.16, 4.05]} />
              <meshStandardMaterial color="#273449" metalness={0.85} roughness={0.34} />
            </mesh>
            {/* Subtle tubular top & mid handrails instead of solid toy-yellow slabs */}
            {[-1.96, 1.96].map((rz) => (
              <group key={`rail-z-${rz}`} position={[0, 0, rz]}>
                <mesh position={[0, 0.56, 0]}>
                  <boxGeometry args={[3.95, 0.045, 0.045]} />
                  <meshStandardMaterial color="#b45309" metalness={0.7} roughness={0.38} />
                </mesh>
                <mesh position={[0, 0.28, 0]}>
                  <boxGeometry args={[3.95, 0.035, 0.035]} />
                  <meshStandardMaterial color="#64748b" metalness={0.8} roughness={0.35} />
                </mesh>
              </group>
            ))}
          </group>
        ))}

        {/* Tapered Lightning Mast Peak & Soft Optical Warning Strobe */}
        <mesh position={[0, 20.1, 0]}>
          <cylinderGeometry args={[0.06, 0.32, 8.8, 14]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.94} roughness={0.14} />
        </mesh>
        <mesh position={[0, 24.6, 0]}>
          <sphereGeometry args={[0.16, 14, 14]} />
          <meshBasicMaterial ref={beaconMatRef} color="#ff3b5c" />
        </mesh>
        <sprite position={[0, 24.6, 0]} scale={[2.6, 2.6, 1]}>
          <spriteMaterial
            ref={beaconGlowRef}
            map={softGlowMap}
            color="#fb7185"
            transparent
            opacity={0.75}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </sprite>

        {/* ---------------------------------------------------- */}
        {/* 5. TRUSS-FRAMED CREW ACCESS ARM & WHITE ROOM COLLAR  */}
        {/* ---------------------------------------------------- */}
        <group ref={crewArmRef} position={[1.45, 8.4, 0]}>
          {/* Heavy Gimbal Hinge Assembly */}
          <mesh>
            <cylinderGeometry args={[0.36, 0.36, 1.85, 16]} />
            <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.22} />
          </mesh>

          {/* White Composite Roof & Floor Walkways (Sized strictly to stop flush outside R=1.76m Dragon hull!) */}
          <mesh position={[1.82, 0.72, 0]}>
            <boxGeometry args={[3.58, 0.14, 1.42]} />
            <meshStandardMaterial color="#f1f5f9" metalness={0.55} roughness={0.26} />
          </mesh>
          <mesh position={[1.82, -0.72, 0]}>
            <boxGeometry args={[3.58, 0.16, 1.42]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.65} roughness={0.3} />
          </mesh>

          {/* Open X-Braced Side Trusses + Tinted Architectural Glass Corridor */}
          <mesh
            geometry={crewArmTrussGeo}
            material={crewArmTrussMat}
            position={[1.82, 0, 0.68]}
          />
          <mesh
            geometry={crewArmTrussGeo}
            material={crewArmTrussMat}
            position={[1.82, 0, -0.68]}
          />
          <mesh position={[1.82, 0, 0]}>
            <boxGeometry args={[3.45, 1.28, 1.26]} />
            <meshPhysicalMaterial
              color="#0f172a"
              metalness={0.2}
              roughness={0.08}
              transparent
              opacity={0.58}
              clearcoat={1.0}
            />
          </mesh>

          {/* Environmental Cleanroom "White Room" + Flexible Black Concertina Seal (Stops at world x = -1.77, outside cabin!) */}
          <mesh position={[3.96, 0, 0]}>
            <boxGeometry args={[0.74, 1.56, 1.46]} />
            <meshStandardMaterial color="#f8fafc" metalness={0.55} roughness={0.25} />
          </mesh>
          <mesh position={[4.44, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.56, 0.62, 0.28, 20]} />
            <meshStandardMaterial
              color="#090d16"
              bumpMap={aeroBumpMap}
              bumpScale={0.05}
              metalness={0.35}
              roughness={0.78}
            />
          </mesh>
        </group>
      </group>
    </group>
  );
};
