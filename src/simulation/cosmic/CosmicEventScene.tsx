import React, { useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CosmicEventManager, CosmicPlaybackState } from "./CosmicEventManager";
import { SimulationManager } from "../core/SimulationManager";
import { CosmicEventRenderer } from "./CosmicEventRenderer";
import { CameraManager } from "@/engine/camera/CameraManager";

export const CosmicEventScene: React.FC = () => {
  const simulationManager = SimulationManager.getInstance();
  const timeline = simulationManager.getTimelineEngine();
  const manager = CosmicEventManager.getInstance();

  const [playback, setPlayback] = useState<CosmicPlaybackState>(manager.getPlaybackState());

  useEffect(() => {
    const cam = CameraManager.getInstance();
    cam.state = "ORBIT";
    if (cam.camera) {
      cam.target.set(0, 0, 0);
      cam.camera.position.set(0, 20, 115);
      cam.camera.lookAt(0, 0, 0);
    }
  }, []);

  useFrame((_, delta) => {
    // Advance timeline if playing
    simulationManager.update(delta);

    const current = manager.evaluateAtTime(timeline.getCurrentTime());
    setPlayback({ ...current });
  });

  return (
    <group>
      {/* 1. Cosmic Visual Effects */}
      <CosmicEventRenderer playback={playback} />

      {/* 2. Starry Deep Space Backdrop */}
      <mesh>
        <sphereGeometry args={[2500, 32, 32]} />
        <meshBasicMaterial color="#020108" side={THREE.BackSide} />
      </mesh>
      <ambientLight intensity={0.2} />
    </group>
  );
};
