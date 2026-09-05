import React, { useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { EarthTimelineController, EarthClimateState } from "./EarthTimelineController";
import { SimulationManager } from "../core/SimulationManager";
import { EarthHistoricalGlobe } from "./EarthHistoricalGlobe";
import { CameraManager } from "@/engine/camera/CameraManager";

export const EarthHistoryScene: React.FC = () => {
  const simulationManager = SimulationManager.getInstance();
  const timeline = simulationManager.getTimelineEngine();
  const controller = EarthTimelineController.getInstance();

  const [climate, setClimate] = useState<EarthClimateState>(controller.getState());

  useEffect(() => {
    // Set up camera to focus on historical globe
    const cam = CameraManager.getInstance();
    cam.state = "ORBIT";
    if (cam.camera) {
      cam.target.set(0, 0, 0);
      cam.camera.position.set(0, 15, 68);
      cam.camera.lookAt(0, 0, 0);
    }
  }, []);

  useFrame((_, delta) => {
    // Advance timeline if playing
    simulationManager.update(delta);

    // Update climate state
    const current = controller.evaluateAtMa(timeline.getCurrentTime());
    setClimate({ ...current });
  });

  return (
    <group>
      {/* 1. Historical Earth Globe */}
      <EarthHistoricalGlobe climate={climate} radius={24} />

      {/* 2. Sun Directional Light */}
      <directionalLight
        position={[200, 80, 150]}
        intensity={2.8}
        color="#ffffff"
      />
      {/* Soft fill light from dark side */}
      <directionalLight
        position={[-150, -40, -100]}
        intensity={0.25}
        color="#38bdf8"
      />
      <ambientLight intensity={0.15} />

      {/* 3. Deep Space Background Stars */}
      <mesh>
        <sphereGeometry args={[2000, 32, 32]} />
        <meshBasicMaterial color="#020208" side={THREE.BackSide} />
      </mesh>
    </group>
  );
};
