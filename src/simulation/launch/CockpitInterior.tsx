import React, { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { SimulationCameraMode } from "../core/types";
import { LaunchController, LaunchTrajectoryState } from "./LaunchController";
import { CockpitDisplays } from "./CockpitDisplays";
import { useI18nStore } from "@/i18n";

interface CockpitInteriorProps {
  cameraMode: SimulationCameraMode;
  trajectory?: LaunchTrajectoryState;
}

const NOOP_RAYCAST: THREE.Object3D["raycast"] = () => {};
// Aligns pilot frame local +Z with reclined Crew Dragon gaze (0, +0.92, +0.39) & local +Y with (0, +0.39, -0.92)
const PILOT_FRAME_PITCH_RAD = -Math.atan2(0.92, 0.39); // -1.170 rad (-67.0°)

export const CockpitInterior: React.FC<CockpitInteriorProps> = ({
  cameraMode,
  trajectory
}) => {
  const cabinRootRef = useRef<THREE.Group>(null);
  const cabinMeshesRef = useRef<THREE.Group>(null);
  const displays = CockpitDisplays.getInstance();

  const displayCenterRef = useRef<THREE.MeshBasicMaterial>(null);
  const displayLeftRef = useRef<THREE.MeshBasicMaterial>(null);
  const displayRightRef = useRef<THREE.MeshBasicMaterial>(null);
  const screenLightRef = useRef<THREE.PointLight>(null);

  const isInside = cameraMode === "COCKPIT" || cameraMode === "WINDOW";
  const language = useI18nStore((s) => s.language);

  useEffect(() => {
    // Draw initial telemetry onto MFD canvases immediately on mount & language switch
    displays.update(LaunchController.getInstance().getTrajectoryState(), true, language === "vi");
  }, [displays, language]);

  useEffect(() => {
    const meshesGroup = cabinMeshesRef.current;
    return () => {
      meshesGroup?.traverse((obj) => {
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
  }, []);

  useFrame(() => {
    if (!cabinRootRef.current) return;

    if (cabinMeshesRef.current) {
      cabinMeshesRef.current.visible = isInside;
    }
    const liveTraj = trajectory ?? LaunchController.getInstance().getTrajectoryState();

    cabinRootRef.current.position.copy(liveTraj.position);
    cabinRootRef.current.quaternion.copy(liveTraj.quaternion);

    if (isInside) {
      displays.update(liveTraj, false, useI18nStore.getState().language === "vi");
      if (screenLightRef.current) {
        screenLightRef.current.intensity = 0.65;
      }
    } else if (screenLightRef.current) {
      screenLightRef.current.intensity = 0;
    }
  });

  return (
    <group ref={cabinRootRef}>
      <group ref={cabinMeshesRef} visible={isInside}>
        {/* ---------------------------------------------------- */}
        {/* 1. REAR & PORT CABIN PRESSURE HULL ARC               */}
        {/* Open across full forward canopy (-90°..+140°) AND    */}
        {/* starboard (+X) porthole (thetaStart=0.78π, len=0.72π)*/}
        {/* ---------------------------------------------------- */}
        <mesh position={[0, 7.65, 0]} raycast={NOOP_RAYCAST}>
          <cylinderGeometry
            args={[1.55, 1.72, 1.8, 32, 1, true, Math.PI * 0.96, Math.PI * 0.48]}
          />
          <meshStandardMaterial
            color="#0f172a"
            metalness={0.65}
            roughness={0.48}
            side={THREE.BackSide}
          />
        </mesh>

        {/* Aft Pressure Bulkhead Floor */}
        <mesh position={[0, 6.80, 0]} raycast={NOOP_RAYCAST}>
          <cylinderGeometry args={[1.72, 1.72, 0.14, 32]} />
          <meshStandardMaterial color="#020617" metalness={0.85} roughness={0.38} />
        </mesh>

        {/* ---------------------------------------------------- */}
        {/* 2. PILOT-ALIGNED CREW DRAGON CANOPY & 3 GLASS MFDs   */}
        {/* Camera sits at [0,0,0] inside this group looking +Z! */}
        {/* ---------------------------------------------------- */}
        <group position={[0, 8.05, -0.05]} rotation={[PILOT_FRAME_PITCH_RAD, 0, 0]}>
          {/* Left Panoramic Canopy Titanium A-Pillar */}
          <mesh position={[-0.86, 0.18, 0.92]} rotation={[0, 0, 0.22]} raycast={NOOP_RAYCAST}>
            <boxGeometry args={[0.065, 1.18, 0.09]} />
            <meshStandardMaterial color="#1e293b" metalness={0.82} roughness={0.3} />
          </mesh>

          {/* Right Panoramic Canopy Titanium A-Pillar */}
          <mesh position={[0.86, 0.18, 0.92]} rotation={[0, 0, -0.22]} raycast={NOOP_RAYCAST}>
            <boxGeometry args={[0.065, 1.18, 0.09]} />
            <meshStandardMaterial color="#1e293b" metalness={0.82} roughness={0.3} />
          </mesh>

          {/* Upper Canopy Arch Brow */}
          <mesh position={[0, 0.68, 0.88]} rotation={[0.28, 0, 0]} raycast={NOOP_RAYCAST}>
            <boxGeometry args={[1.68, 0.075, 0.14]} />
            <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.32} />
          </mesh>

          {/* Lower Canopy Sill Below Touchscreens */}
          <mesh position={[0, -0.39, 0.96]} raycast={NOOP_RAYCAST}>
            <boxGeometry args={[1.84, 0.22, 0.16]} />
            <meshStandardMaterial color="#090d16" metalness={0.75} roughness={0.45} />
          </mesh>

          {/* 3-PANEL SPACEX CREW DRAGON GLASS TOUCHSCREEN CONSOLE (Lifted cleanly above bottom HUD timeline!) */}
          <group position={[0, -0.135, 0.88]}>
            {/* Slim Matte Carbon Anti-Glare Lip */}
            <mesh position={[0, 0.165, -0.02]} rotation={[0.18, 0, 0]} raycast={NOOP_RAYCAST}>
              <boxGeometry args={[1.44, 0.02, 0.06]} />
              <meshStandardMaterial color="#020617" metalness={0.25} roughness={0.88} />
            </mesh>

            {/* Console Support Bar (Behind screens at +Z) */}
            <mesh position={[0, -0.01, 0.035]} rotation={[0.18, 0, 0]} raycast={NOOP_RAYCAST}>
              <boxGeometry args={[1.46, 0.32, 0.03]} />
              <meshStandardMaterial color="#090d16" metalness={0.75} roughness={0.4} />
            </mesh>

            {/* A. CENTER PRIMARY FLIGHT DISPLAY (PFD - Facing pilot -Z) */}
            <group position={[0, 0.0, 0.0]} rotation={[0.18, Math.PI, 0]}>
              <mesh position={[0, 0, -0.012]} raycast={NOOP_RAYCAST}>
                <boxGeometry args={[0.45, 0.30, 0.018]} />
                <meshStandardMaterial color="#1e293b" metalness={0.85} roughness={0.28} />
              </mesh>
              <mesh raycast={NOOP_RAYCAST}>
                <planeGeometry args={[0.425, 0.275]} />
                <meshBasicMaterial
                  ref={displayCenterRef}
                  map={displays.textureCenter}
                  toneMapped={false}
                />
              </mesh>
            </group>

            {/* B. LEFT PROPULSION & SYSTEMS MFD (+X is pilot's left when gazing along +Z) */}
            <group position={[0.47, 0.0, -0.04]} rotation={[0.18, Math.PI + 0.22, 0]}>
              <mesh position={[0, 0, -0.012]} raycast={NOOP_RAYCAST}>
                <boxGeometry args={[0.43, 0.30, 0.018]} />
                <meshStandardMaterial color="#1e293b" metalness={0.85} roughness={0.28} />
              </mesh>
              <mesh raycast={NOOP_RAYCAST}>
                <planeGeometry args={[0.405, 0.275]} />
                <meshBasicMaterial
                  ref={displayLeftRef}
                  map={displays.textureLeft}
                  toneMapped={false}
                />
              </mesh>
            </group>

            {/* C. RIGHT ORBITAL TRAJECTORY MFD (-X is pilot's right when gazing along +Z) */}
            <group position={[-0.47, 0.0, -0.04]} rotation={[0.18, Math.PI - 0.22, 0]}>
              <mesh position={[0, 0, -0.012]} raycast={NOOP_RAYCAST}>
                <boxGeometry args={[0.43, 0.30, 0.018]} />
                <meshStandardMaterial color="#1e293b" metalness={0.85} roughness={0.28} />
              </mesh>
              <mesh raycast={NOOP_RAYCAST}>
                <planeGeometry args={[0.405, 0.275]} />
                <meshBasicMaterial
                  ref={displayRightRef}
                  map={displays.textureRight}
                  toneMapped={false}
                />
              </mesh>
            </group>

            {/* Tactile Edge-Lit Bezel Keys (Tucked cleanly above lower HUD bar) */}
            {[-0.42, -0.28, -0.14, 0, 0.14, 0.28, 0.42].map((bx, bi) => (
              <mesh
                key={`mfd-btn-${bi}`}
                position={[bx, -0.142, -0.015]}
                rotation={[0.18, 0, 0]}
                raycast={NOOP_RAYCAST}
              >
                <boxGeometry args={[0.042, 0.014, 0.012]} />
                <meshStandardMaterial
                  color={bi === 3 ? "#f59e0b" : "#0ea5e9"}
                  emissive={bi === 3 ? "#d97706" : "#0284c7"}
                  emissiveIntensity={0.38}
                  roughness={0.35}
                />
              </mesh>
            ))}
          </group>

          {/* Left & Right Hand Controllers (THC / RHC) */}
          <group position={[-0.46, -0.38, 0.52]}>
            <mesh position={[0, 0.09, 0]} raycast={NOOP_RAYCAST}>
              <cylinderGeometry args={[0.018, 0.022, 0.18, 12]} />
              <meshStandardMaterial color="#1e293b" metalness={0.85} roughness={0.25} />
            </mesh>
            <mesh position={[0, 0.18, 0]} rotation={[0, 0, Math.PI / 2]} raycast={NOOP_RAYCAST}>
              <cylinderGeometry args={[0.022, 0.022, 0.12, 12]} />
              <meshStandardMaterial color="#0f172a" roughness={0.75} />
            </mesh>
          </group>

          <group position={[0.46, -0.38, 0.52]}>
            <mesh position={[0, 0.09, 0]} rotation={[-0.1, 0, 0]} raycast={NOOP_RAYCAST}>
              <cylinderGeometry args={[0.018, 0.022, 0.18, 12]} />
              <meshStandardMaterial color="#1e293b" metalness={0.85} roughness={0.25} />
            </mesh>
            <mesh position={[0, 0.18, -0.01]} rotation={[-0.1, 0, 0]} raycast={NOOP_RAYCAST}>
              <boxGeometry args={[0.045, 0.075, 0.05]} />
              <meshStandardMaterial color="#0f172a" roughness={0.7} />
            </mesh>
          </group>
        </group>

        {/* ---------------------------------------------------- */}
        {/* 3. STARBOARD CIRCULAR OBSERVATION PORTHOLE (+X)      */}
        {/* Centered on WINDOW sightline with wide 4.5m mask     */}
        {/* sealing 100% of 16:9 viewport corners                */}
        {/* ---------------------------------------------------- */}
        <group position={[1.46, 8.07, 0.04]} rotation={[0, Math.PI / 2, 0]}>
          <mesh raycast={NOOP_RAYCAST}>
            <torusGeometry args={[0.43, 0.055, 24, 64]} />
            <meshStandardMaterial color="#1e293b" metalness={0.88} roughness={0.24} />
          </mesh>
          <mesh position={[0, 0, 0.015]} raycast={NOOP_RAYCAST}>
            <torusGeometry args={[0.39, 0.016, 16, 64]} />
            <meshStandardMaterial color="#38bdf8" emissive="#0284c7" emissiveIntensity={0.22} metalness={0.9} roughness={0.2} />
          </mesh>
          <mesh position={[0, 0, -0.02]} visible={cameraMode === "WINDOW"} raycast={NOOP_RAYCAST}>
            <ringGeometry args={[0.45, 5.2, 64]} />
            <meshBasicMaterial
              color="#03050a"
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      </group>

      {/* Soft cabin fill behind pilot seat (zero windshield glare) */}
      <pointLight
        ref={screenLightRef}
        position={[0, 8.25, -0.45]}
        color="#bae6fd"
        intensity={isInside ? 0.65 : 0}
        distance={3.6}
      />
    </group>
  );
};
