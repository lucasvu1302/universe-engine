import React, { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { EarthTimelineController, EarthClimateState } from "./EarthTimelineController";
import { SimulationManager } from "../core/SimulationManager";
import earthVert from "@/shaders/earth/earthHistorical.vert.glsl";
import earthFrag from "@/shaders/earth/earthHistorical.frag.glsl";

interface EarthHistoricalGlobeProps {
  climate?: EarthClimateState;
  radius?: number;
}

export const EarthHistoricalGlobe: React.FC<EarthHistoricalGlobeProps> = ({
  climate,
  radius = 24
}) => {
  const controller = useMemo(() => EarthTimelineController.getInstance(), []);
  const timeline = useMemo(() => SimulationManager.getInstance().getTimelineEngine(), []);
  const globeGroupRef = useRef<THREE.Group>(null);
  const shaderMatRef = useRef<THREE.ShaderMaterial>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);
  const cloudMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const haloMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const impactMeshRef = useRef<THREE.Mesh>(null);
  const impactMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const simElapsedRef = useRef(0);

  const sunPos = useMemo(() => new THREE.Vector3(200, 80, 150), []);
  const hadeanColor = useMemo(() => new THREE.Color("#f97316"), []);
  const modernColor = useMemo(() => new THREE.Color("#38bdf8"), []);
  const tempColor = useMemo(() => new THREE.Color(), []);

  const uniforms = useMemo(
    () => ({
      uSunPosition: { value: sunPos },
      uEpochStage: { value: 0.0 },
      uImpactGlow: { value: 0.0 },
      uTime: { value: 0.0 }
    }),
    [sunPos]
  );

  useEffect(() => {
    const root = globeGroupRef.current;
    return () => {
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
      });
    };
  }, []);

  useFrame((_, delta) => {
    const activeDelta = timeline.getIsPlaying() ? delta : 0;
    simElapsedRef.current += activeDelta;

    // 1. Rotate Earth on its axis (paused-safe)
    if (globeGroupRef.current && activeDelta > 0) {
      globeGroupRef.current.rotation.y += activeDelta * 0.04;
    }
    // 2. Atmospheric clouds drift slightly faster
    if (cloudsRef.current && activeDelta > 0) {
      cloudsRef.current.rotation.y += activeDelta * 0.055;
    }

    const activeClimate = climate || controller.getState();
    const stage = activeClimate.epochStage;
    const impactGlow = activeClimate.activeImpactGlow;

    // 3. Update main shader uniforms smoothly
    if (shaderMatRef.current) {
      shaderMatRef.current.uniforms.uEpochStage.value = stage;
      shaderMatRef.current.uniforms.uImpactGlow.value = impactGlow;
      shaderMatRef.current.uniforms.uTime.value = simElapsedRef.current;
    }

    // 4. Smooth atmospheric cloud veil opacity (fades in after Hadean ocean condensation)
    if (cloudMatRef.current) {
      const cloudOpacity = Math.min(Math.max((stage - 0.4) * 0.5, 0.0), 0.35);
      cloudMatRef.current.opacity = cloudOpacity;
      cloudMatRef.current.visible = cloudOpacity > 0.001;
    }

    // 5. Smooth atmospheric scattering halo crossfade (Hadean orange -> Modern cyan)
    if (haloMatRef.current) {
      const t = THREE.MathUtils.clamp(stage / 1.5, 0, 1);
      tempColor.lerpColors(hadeanColor, modernColor, t);
      haloMatRef.current.color.copy(tempColor);
    }

    // 6. Asteroid impact shockwave expansion (scale & fade without buffer re-allocation)
    if (impactMeshRef.current && impactMatRef.current) {
      if (impactGlow > 0.01) {
        impactMeshRef.current.visible = true;
        impactMeshRef.current.scale.setScalar(Math.max(0.1, impactGlow));
        impactMatRef.current.opacity = impactGlow * 0.8;
      } else {
        impactMeshRef.current.visible = false;
      }
    }
  });

  return (
    <group ref={globeGroupRef}>
      {/* 1. Main Historical Earth Body with Crossfade Shader */}
      <mesh>
        <sphereGeometry args={[radius, 64, 64]} />
        <shaderMaterial
          ref={shaderMatRef}
          vertexShader={earthVert}
          fragmentShader={earthFrag}
          uniforms={uniforms}
        />
      </mesh>

      {/* 2. Atmospheric Cloud Veil (Permanently mounted, smooth opacity fade) */}
      <mesh ref={cloudsRef}>
        <sphereGeometry args={[radius * 1.015, 48, 48]} />
        <meshStandardMaterial
          ref={cloudMatRef}
          color="#ffffff"
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* 3. Outer Atmospheric Cyan/Blue Scattering Halo (Smooth color lerp) */}
      <mesh>
        <sphereGeometry args={[radius * 1.035, 32, 32]} />
        <meshBasicMaterial
          ref={haloMatRef}
          color="#f97316"
          transparent
          opacity={0.25}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* 4. Asteroid Impact Shockwave Expansion Effect (Fixed geometry with scalar transform) */}
      <mesh
        ref={impactMeshRef}
        position={[radius * 0.3, radius * 0.2, radius * 0.9]}
        visible={false}
      >
        <ringGeometry args={[0.2, radius * 0.6, 32]} />
        <meshBasicMaterial
          ref={impactMatRef}
          color="#ff4400"
          transparent
          opacity={0}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
};
