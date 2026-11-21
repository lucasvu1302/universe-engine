import React, { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CosmicEventManager } from "./CosmicEventManager";
import { SimulationManager } from "../core/SimulationManager";
import { CosmicEventRenderer } from "./CosmicEventRenderer";
import { CosmicEventType } from "../core/types";
import { CameraManager } from "@/engine/camera/CameraManager";
import { StarField } from "@/entities/StarField/StarField";

export const CosmicEventScene: React.FC = () => {
  const simulationManager = useMemo(() => SimulationManager.getInstance(), []);
  const timeline = useMemo(() => simulationManager.getTimelineEngine(), [simulationManager]);
  const manager = useMemo(() => CosmicEventManager.getInstance(), []);
  const backdropMeshRef = useRef<THREE.Mesh>(null);

  const [activeEventType, setActiveEventType] = useState<CosmicEventType>(
    manager.getPlaybackState().currentEvent.type
  );
  const lastEventTypeRef = useRef<CosmicEventType>(activeEventType);

  useEffect(() => {
    const cam = CameraManager.getInstance();
    cam.setScenarioMode("cosmic_history");
    const bd = backdropMeshRef.current;
    return () => {
      cam.setScenarioMode("none");
      bd?.geometry?.dispose();
      (bd?.material as THREE.Material | undefined)?.dispose();
    };
  }, []);

  useFrame((_, delta) => {
    simulationManager.update(delta);

    const current = manager.evaluateAtTime(timeline.getCurrentTime());
    if (current.currentEvent.type !== lastEventTypeRef.current) {
      lastEventTypeRef.current = current.currentEvent.type;
      setActiveEventType(current.currentEvent.type);
    }
  });

  return (
    <group>
      {/* 0. 3D Spectral Deep Space Starfield */}
      <StarField radius={9500} />

      {/* 1. Cosmic Visual Effects */}
      <CosmicEventRenderer eventType={activeEventType} />

      {/* 2. Starry Deep Space Backdrop */}
      <mesh ref={backdropMeshRef} raycast={() => null}>
        <sphereGeometry args={[18000, 24, 24]} />
        <meshBasicMaterial color="#020108" side={THREE.BackSide} depthWrite={false} />
      </mesh>
      <ambientLight intensity={0.2} />
    </group>
  );
};
