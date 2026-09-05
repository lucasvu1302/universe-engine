import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { LaunchTrajectoryState } from "./LaunchController";

interface RocketModelProps {
  trajectory: LaunchTrajectoryState;
}

export const RocketModel: React.FC<RocketModelProps> = ({ trajectory }) => {
  const rocketRootRef = useRef<THREE.Group>(null);
  const stage1Ref = useRef<THREE.Group>(null);
  const stage2Ref = useRef<THREE.Group>(null);
  const plume1Ref = useRef<THREE.Group>(null);
  const plume2Ref = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (!rocketRootRef.current) return;

    // Apply world position & orientation calculated by LaunchController
    rocketRootRef.current.position.copy(trajectory.position);
    rocketRootRef.current.quaternion.copy(trajectory.quaternion);

    // Staging physics animation
    if (trajectory.stage1Separated && stage1Ref.current) {
      // Stage 1 drifts backward along local -Y and slight tumble
      stage1Ref.current.position.y -= delta * 12.0;
      stage1Ref.current.position.z += delta * 2.5;
      stage1Ref.current.rotation.x += delta * 0.15;
    } else if (stage1Ref.current) {
      stage1Ref.current.position.set(0, 0, 0);
      stage1Ref.current.rotation.set(0, 0, 0);
    }

    // Engine exhaust plume animation
    const time = trajectory.timeSeconds;
    const isStage1Firing = time >= 10 && time < 100;
    const isStage2Firing = time >= 105 && time < 280;

    if (plume1Ref.current) {
      plume1Ref.current.visible = isStage1Firing;
      if (isStage1Firing) {
        // Dynamic plume flicker
        const flicker = 1.0 + Math.sin(performance.now() * 0.05) * 0.12;
        plume1Ref.current.scale.set(flicker, flicker * 1.2, flicker);
      }
    }

    if (plume2Ref.current) {
      plume2Ref.current.visible = isStage2Firing;
      if (isStage2Firing) {
        // Vacuum plume expands more broadly
        const flicker2 = 1.0 + Math.sin(performance.now() * 0.04) * 0.08;
        plume2Ref.current.scale.set(flicker2 * 1.4, flicker2 * 1.1, flicker2 * 1.4);
      }
    }
  });

  return (
    <group ref={rocketRootRef}>
      {/* ---------------------------------------------------- */}
      {/* 1. FIRST STAGE BOOSTER                               */}
      {/* ---------------------------------------------------- */}
      <group ref={stage1Ref}>
        {/* Main Booster Tank */}
        <mesh position={[0, -4.5, 0]}>
          <cylinderGeometry args={[1.8, 1.8, 12, 32]} />
          <meshStandardMaterial color="#f8fafc" metalness={0.4} roughness={0.3} />
        </mesh>

        {/* Interstage black ring */}
        <mesh position={[0, 1.6, 0]}>
          <cylinderGeometry args={[1.82, 1.82, 0.4, 32]} />
          <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.2} />
        </mesh>

        {/* 4 Titanium Grid Fins at top of booster */}
        {[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((angle, i) => (
          <mesh
            key={`grid-fin-${i}`}
            position={[Math.cos(angle) * 2.0, 1.2, Math.sin(angle) * 2.0]}
            rotation={[0, -angle, Math.PI / 4]}
          >
            <boxGeometry args={[0.8, 0.8, 0.06]} />
            <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.1} />
          </mesh>
        ))}

        {/* 4 Landing Legs folded on booster base */}
        {[Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4].map(
          (angle, i) => (
            <mesh
              key={`landing-leg-${i}`}
              position={[Math.cos(angle) * 1.9, -8.0, Math.sin(angle) * 1.9]}
              rotation={[0, -angle, 0]}
            >
              <boxGeometry args={[0.2, 5.0, 0.2]} />
              <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.2} />
            </mesh>
          )
        )}

        {/* Engine Bell Nozzles Cluster (9 Merlin-style engines) */}
        {[-0.8, 0, 0.8].map((x) =>
          [-0.8, 0, 0.8].map((z) => (
            <mesh key={`nozzle-${x}-${z}`} position={[x * 0.9, -11.0, z * 0.9]}>
              <cylinderGeometry args={[0.35, 0.55, 1.2, 16]} />
              <meshStandardMaterial color="#334155" metalness={0.95} roughness={0.15} />
            </mesh>
          ))
        )}

        {/* Stage 1 Engine Exhaust Plumes */}
        <group ref={plume1Ref} position={[0, -11.6, 0]}>
          {/* Inner white-hot diamond shock cone */}
          <mesh position={[0, -3.5, 0]} rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[1.4, 7.0, 32]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.95} />
          </mesh>
          {/* Outer incandescent orange flame cone */}
          <mesh position={[0, -7.0, 0]} rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[2.6, 14.0, 32]} />
            <meshBasicMaterial color="#ff5500" transparent opacity={0.65} />
          </mesh>
          {/* Flame Point Light illuminating environment */}
          <pointLight color="#ff8822" intensity={8} distance={80} />
        </group>
      </group>

      {/* ---------------------------------------------------- */}
      {/* 2. SECOND STAGE & CREW CAPSULE                       */}
      {/* ---------------------------------------------------- */}
      <group ref={stage2Ref}>
        {/* Second Stage Tank */}
        <mesh position={[0, 4.2, 0]}>
          <cylinderGeometry args={[1.78, 1.78, 4.8, 32]} />
          <meshStandardMaterial color="#f8fafc" metalness={0.3} roughness={0.3} />
        </mesh>

        {/* Vacuum Engine Nozzle (hidden inside interstage when stacked) */}
        <mesh position={[0, 1.5, 0]}>
          <cylinderGeometry args={[0.5, 1.1, 1.6, 24]} />
          <meshStandardMaterial color="#475569" metalness={0.9} roughness={0.2} />
        </mesh>

        {/* Stage 2 Vacuum Exhaust Plume (Broad translucent blue-violet) */}
        <group ref={plume2Ref} position={[0, 0.7, 0]}>
          <mesh position={[0, -4.5, 0]} rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[3.2, 9.0, 32]} />
            <meshBasicMaterial color="#6366f1" transparent opacity={0.7} />
          </mesh>
          <pointLight color="#818cf8" intensity={5} distance={50} />
        </group>

        {/* ---------------------------------------------------- */}
        {/* 3. CREW CAPSULE / COCKPIT SHELL                      */}
        {/* ---------------------------------------------------- */}
        {/* Truncated Cone Crew Cabin */}
        <mesh position={[0, 8.0, 0]}>
          <cylinderGeometry args={[1.1, 1.78, 2.8, 32]} />
          <meshStandardMaterial color="#f1f5f9" metalness={0.5} roughness={0.25} />
        </mesh>

        {/* Nose Cone / Docking Mechanism */}
        <mesh position={[0, 9.8, 0]}>
          <coneGeometry args={[1.1, 1.2, 32]} />
          <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.2} />
        </mesh>

        {/* Cockpit Panoramic Windows (Tinted glass) */}
        <mesh position={[0, 8.3, 1.15]} rotation={[-0.35, 0, 0]}>
          <boxGeometry args={[1.4, 0.8, 0.15]} />
          <meshStandardMaterial
            color="#0ea5e9"
            emissive="#0284c7"
            emissiveIntensity={0.6}
            metalness={0.9}
            roughness={0.1}
          />
        </mesh>

        {/* Side Passenger Windows */}
        <mesh position={[1.15, 8.0, 0]} rotation={[0, 0, -0.3]}>
          <boxGeometry args={[0.15, 0.6, 0.6]} />
          <meshStandardMaterial
            color="#0ea5e9"
            emissive="#0284c7"
            emissiveIntensity={0.4}
            metalness={0.9}
            roughness={0.1}
          />
        </mesh>
      </group>
    </group>
  );
};
