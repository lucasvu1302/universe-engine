import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { SimulationCameraMode } from "../core/types";
import { LaunchTrajectoryState } from "./LaunchController";

interface CockpitInteriorProps {
  cameraMode: SimulationCameraMode;
  trajectory: LaunchTrajectoryState;
}

export const CockpitInterior: React.FC<CockpitInteriorProps> = ({
  cameraMode,
  trajectory
}) => {
  const cabinRootRef = useRef<THREE.Group>(null);
  const displayLightRef = useRef<THREE.PointLight>(null);

  // Cockpit is only rendered if user is in COCKPIT or WINDOW camera mode
  const isInside = cameraMode === "COCKPIT" || cameraMode === "WINDOW";

  useFrame(() => {
    if (!cabinRootRef.current) return;
    // Align with rocket position and orientation
    cabinRootRef.current.position.copy(trajectory.position);
    cabinRootRef.current.quaternion.copy(trajectory.quaternion);

    // Subtle screen pulse
    if (displayLightRef.current) {
      displayLightRef.current.intensity = 1.2 + Math.sin(performance.now() * 0.003) * 0.2;
    }
  });

  if (!isInside) return null;

  return (
    <group ref={cabinRootRef}>
      {/* ---------------------------------------------------- */}
      {/* COCKPIT CABIN ENCLOSURE & INTERIOR SHELL             */}
      {/* ---------------------------------------------------- */}
      {/* Main Forward Windshield Frame */}
      <mesh position={[0, 4.6, 1.4]} rotation={[-0.45, 0, 0]}>
        <ringGeometry args={[1.1, 1.35, 16]} />
        <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* Structural Canopy Struts (Left, Center, Right) */}
      <mesh position={[0, 4.8, 1.3]} rotation={[-0.45, 0, 0]}>
        <boxGeometry args={[0.08, 1.2, 0.1]} />
        <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.15} />
      </mesh>
      <mesh position={[-0.6, 4.6, 1.2]} rotation={[-0.45, 0, 0.3]}>
        <boxGeometry args={[0.08, 1.2, 0.1]} />
        <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.15} />
      </mesh>
      <mesh position={[0.6, 4.6, 1.2]} rotation={[-0.45, 0, -0.3]}>
        <boxGeometry args={[0.08, 1.2, 0.1]} />
        <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.15} />
      </mesh>

      {/* ---------------------------------------------------- */}
      {/* 3 GLASS FLIGHT DISPLAYS (MFD)                        */}
      {/* ---------------------------------------------------- */}
      {/* Center Primary Flight Display (PFD) */}
      <mesh position={[0, 3.8, 1.35]} rotation={[-0.3, 0, 0]}>
        <planeGeometry args={[0.8, 0.55]} />
        <meshBasicMaterial color="#0369a1" transparent opacity={0.85} />
      </mesh>
      {/* Screen Frame */}
      <mesh position={[0, 3.8, 1.34]} rotation={[-0.3, 0, 0]}>
        <boxGeometry args={[0.84, 0.59, 0.04]} />
        <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Left Telemetry Display */}
      <mesh position={[-0.75, 3.8, 1.2]} rotation={[-0.3, 0.35, 0]}>
        <planeGeometry args={[0.65, 0.5]} />
        <meshBasicMaterial color="#0284c7" transparent opacity={0.75} />
      </mesh>

      {/* Right Navigation & Trajectory Display */}
      <mesh position={[0.75, 3.8, 1.2]} rotation={[-0.3, -0.35, 0]}>
        <planeGeometry args={[0.65, 0.5]} />
        <meshBasicMaterial color="#0d9488" transparent opacity={0.75} />
      </mesh>

      {/* ---------------------------------------------------- */}
      {/* OVERHEAD CONTROL PANELS & TOGGLE SWITCHES            */}
      {/* ---------------------------------------------------- */}
      <mesh position={[0, 5.2, 0.6]} rotation={[0.4, 0, 0]}>
        <boxGeometry args={[1.4, 0.6, 0.12]} />
        <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Glowing Status LED indicators */}
      {[-0.5, -0.25, 0, 0.25, 0.5].map((x, idx) => (
        <mesh key={`led-${idx}`} position={[x, 5.2, 0.68]} rotation={[0.4, 0, 0]}>
          <circleGeometry args={[0.025, 12]} />
          <meshBasicMaterial color={idx % 2 === 0 ? "#10b981" : "#06b6d4"} />
        </mesh>
      ))}

      {/* ---------------------------------------------------- */}
      {/* SIDE PASSENGER WINDOW FRAME                          */}
      {/* ---------------------------------------------------- */}
      <mesh position={[1.18, 4.0, -0.4]} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[0.35, 0.05, 16, 32]} />
        <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Cockpit Interior Ambient & Glow Lighting */}
      <pointLight ref={displayLightRef} position={[0, 4.0, 1.1]} color="#38bdf8" intensity={1.2} distance={3.5} />
      <pointLight position={[0, 4.8, 0.3]} color="#cbd5e1" intensity={0.4} distance={2.5} />
    </group>
  );
};
