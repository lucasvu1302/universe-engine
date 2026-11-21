import React, { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { EarthTimelineController } from "./EarthTimelineController";
import { SimulationManager } from "../core/SimulationManager";
import { EarthHistoricalGlobe } from "./EarthHistoricalGlobe";
import { CameraManager } from "@/engine/camera/CameraManager";
import { StarField } from "@/entities/StarField/StarField";

export const EarthHistoryScene: React.FC = () => {
  const simulationManager = useMemo(() => SimulationManager.getInstance(), []);
  const timeline = useMemo(() => simulationManager.getTimelineEngine(), [simulationManager]);
  const controller = useMemo(() => EarthTimelineController.getInstance(), []);
  const backdropMeshRef = useRef<THREE.Mesh>(null);

  useEffect(() => {
    const cam = CameraManager.getInstance();
    cam.setScenarioMode("earth_history");
    const bd = backdropMeshRef.current;
    return () => {
      cam.setScenarioMode("none");
      bd?.geometry?.dispose();
      (bd?.material as THREE.Material | undefined)?.dispose();
    };
  }, []);

  useFrame((_, delta) => {
    simulationManager.update(delta);
    controller.evaluateAtMa(timeline.getCurrentTime());
  });

  return (
    <group>
      {/* 0. 3D Spectral Deep Space Starfield */}
      <StarField radius={9500} />

      {/* 1. Historical Earth Globe */}
      <EarthHistoricalGlobe radius={24} />

      {/* 2. Sun Directional Light */}
      <directionalLight
        position={[200, 80, 150]}
        intensity={2.4}
        color="#ffffff"
      />
      <directionalLight
        position={[-150, -40, -100]}
        intensity={0.25}
        color="#38bdf8"
      />
      <ambientLight intensity={0.15} />

      {/* 3. Outer Deep Space Backdrop */}
      <mesh ref={backdropMeshRef} raycast={() => null}>
        <sphereGeometry args={[18000, 24, 24]} />
        <meshBasicMaterial color="#020208" side={THREE.BackSide} depthWrite={false} />
      </mesh>
    </group>
  );
};
