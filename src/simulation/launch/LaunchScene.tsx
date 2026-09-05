import React, { useMemo, useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { LaunchController, LaunchTrajectoryState } from "./LaunchController";
import { AtmosphereController } from "./AtmosphereController";
import { CameraDirector } from "../camera/CameraDirector";
import { SimulationManager } from "../core/SimulationManager";
import { SimulationEventBus } from "../core/SimulationEventBus";
import { RocketModel } from "./RocketModel";
import { CockpitInterior } from "./CockpitInterior";
import { SimulationCameraMode } from "../core/types";
import skyVert from "@/shaders/launch/launchSky.vert.glsl";
import skyFrag from "@/shaders/launch/launchSky.frag.glsl";

export const LaunchScene: React.FC = () => {
  const simulationManager = SimulationManager.getInstance();
  const timeline = simulationManager.getTimelineEngine();
  const launchController = LaunchController.getInstance();
  const atmosphereController = AtmosphereController.getInstance();
  const cameraDirector = CameraDirector.getInstance();
  const eventBus = SimulationEventBus.getInstance();

  const [trajectory, setTrajectory] = useState<LaunchTrajectoryState>(
    launchController.getTrajectoryState()
  );
  const [cameraMode, setCameraMode] = useState<SimulationCameraMode>(
    cameraDirector.getMode()
  );

  const skyMatRef = useRef<THREE.ShaderMaterial>(null);
  const skyMeshRef = useRef<THREE.Mesh>(null);
  const earthGlobeRef = useRef<THREE.Group>(null);
  const sunDir = useMemo(() => new THREE.Vector3(0.5, 0.8, 0.3).normalize(), []);

  // Sky shader uniforms
  const skyUniforms = useMemo(
    () => ({
      uSkyColor: { value: new THREE.Color(0.35, 0.65, 0.98) },
      uSunDir: { value: sunDir },
      uStarVisibility: { value: 0.0 },
      uAltitudeKm: { value: 0.0 },
      uReentryGlow: { value: 0.0 }
    }),
    [sunDir]
  );

  useEffect(() => {
    const unsubCam = eventBus.on("camera:mode_change", (mode) => {
      setCameraMode(mode);
    });
    return () => {
      unsubCam();
    };
  }, [eventBus]);

  useFrame((_, delta) => {
    // 1. Advance simulation timeline if playing
    simulationManager.update(delta);

    // 2. Evaluate rocket trajectory and physics
    const currentTraj = launchController.evaluateAtTime(timeline.getCurrentTime());
    setTrajectory({ ...currentTraj });

    // 3. Update Camera
    cameraDirector.update(delta);

    // 4. Update Atmosphere & Sky shader
    const atmState = atmosphereController.getState();
    if (skyMatRef.current) {
      skyMatRef.current.uniforms.uSkyColor.value.copy(atmState.skyColor);
      skyMatRef.current.uniforms.uStarVisibility.value = atmState.starVisibility;
      skyMatRef.current.uniforms.uAltitudeKm.value = atmState.altitudeKm;
      skyMatRef.current.uniforms.uReentryGlow.value = atmState.reentryGlow;
    }

    // Sky dome follows rocket to simulate infinite background
    if (skyMeshRef.current) {
      skyMeshRef.current.position.copy(currentTraj.position);
    }

    // Slowly rotate Earth globe below
    if (earthGlobeRef.current) {
      earthGlobeRef.current.rotation.y += delta * 0.005;
    }
  });

  return (
    <group>
      {/* ---------------------------------------------------- */}
      {/* 1. ATMOSPHERIC SKY DOME SHADER                       */}
      {/* ---------------------------------------------------- */}
      <mesh ref={skyMeshRef}>
        <sphereGeometry args={[2500, 32, 32]} />
        <shaderMaterial
          ref={skyMatRef}
          vertexShader={skyVert}
          fragmentShader={skyFrag}
          uniforms={skyUniforms}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>

      {/* ---------------------------------------------------- */}
      {/* 2. EARTH CURVED HORIZON GLOBE                        */}
      {/* ---------------------------------------------------- */}
      <group ref={earthGlobeRef} position={[0, -795, 0]}>
        {/* Main Earth Body */}
        <mesh>
          <sphereGeometry args={[800, 64, 64]} />
          <meshStandardMaterial
            color="#0284c7"
            roughness={0.7}
            metalness={0.1}
          />
        </mesh>

        {/* Continents / Landmass relief layer */}
        <mesh scale={1.002}>
          <sphereGeometry args={[800, 48, 48]} />
          <meshStandardMaterial
            color="#15803d"
            roughness={0.9}
            transparent
            opacity={0.75}
            wireframe={false}
          />
        </mesh>

        {/* Atmosphere Blue Rim Glow */}
        <mesh scale={1.018}>
          <sphereGeometry args={[800, 48, 48]} />
          <meshBasicMaterial
            color="#38bdf8"
            transparent
            opacity={0.3}
            side={THREE.BackSide}
          />
        </mesh>
      </group>

      {/* ---------------------------------------------------- */}
      {/* 3. CAPE CANAVERAL LAUNCH PAD & TOWER                 */}
      {/* ---------------------------------------------------- */}
      <group position={[0, 0, 0]}>
        {/* Concrete Pad Base */}
        <mesh position={[0, -0.5, 0]}>
          <cylinderGeometry args={[25, 28, 1, 32]} />
          <meshStandardMaterial color="#475569" roughness={0.9} />
        </mesh>

        {/* Steel Launch Gantry Tower */}
        <mesh position={[-6, 15, 0]}>
          <boxGeometry args={[3, 30, 3]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.3} wireframe />
        </mesh>
        {/* Crew Access Arm swung out to rocket capsule */}
        <mesh position={[-3, 23, 0]}>
          <boxGeometry args={[4, 1.2, 1.2]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.7} roughness={0.3} />
        </mesh>
      </group>

      {/* ---------------------------------------------------- */}
      {/* 4. ROCKET MODEL & COCKPIT INTERIOR                   */}
      {/* ---------------------------------------------------- */}
      <RocketModel trajectory={trajectory} />
      <CockpitInterior cameraMode={cameraMode} trajectory={trajectory} />

      {/* ---------------------------------------------------- */}
      {/* 5. DYNAMIC SUNLIGHTING & ILLUMINATION                */}
      {/* ---------------------------------------------------- */}
      <directionalLight
        position={[sunDir.x * 300, sunDir.y * 300, sunDir.z * 300]}
        intensity={2.8}
        color="#ffffff"
      />
      {/* Earth Albedo Upward Light */}
      <directionalLight
        position={[0, -100, 0]}
        intensity={0.6}
        color="#38bdf8"
      />
      <ambientLight intensity={0.25} />
    </group>
  );
};
