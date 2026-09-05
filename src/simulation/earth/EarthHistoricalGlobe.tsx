import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { EarthClimateState } from "./EarthTimelineController";
import earthVert from "@/shaders/earth/earthHistorical.vert.glsl";
import earthFrag from "@/shaders/earth/earthHistorical.frag.glsl";

interface EarthHistoricalGlobeProps {
  climate: EarthClimateState;
  radius?: number;
}

export const EarthHistoricalGlobe: React.FC<EarthHistoricalGlobeProps> = ({
  climate,
  radius = 24
}) => {
  const globeGroupRef = useRef<THREE.Group>(null);
  const shaderMatRef = useRef<THREE.ShaderMaterial>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);

  const sunPos = useMemo(() => new THREE.Vector3(200, 80, 150), []);

  const uniforms = useMemo(
    () => ({
      uSunPosition: { value: sunPos },
      uEpochStage: { value: 0.0 },
      uImpactGlow: { value: 0.0 },
      uTime: { value: 0.0 }
    }),
    [sunPos]
  );

  useFrame((_, delta) => {
    // Rotate Earth on its axis
    if (globeGroupRef.current) {
      globeGroupRef.current.rotation.y += delta * 0.04;
    }
    // Atmospheric clouds drift slightly faster
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y += delta * 0.055;
    }

    // Update shader uniforms
    if (shaderMatRef.current) {
      shaderMatRef.current.uniforms.uEpochStage.value = climate.epochStage;
      shaderMatRef.current.uniforms.uImpactGlow.value = climate.activeImpactGlow;
      shaderMatRef.current.uniforms.uTime.value = performance.now() * 0.001;
    }
  });

  // Cloud opacity increases as Earth cools down (absent in super-hot Hadean)
  const cloudOpacity = Math.min(Math.max((climate.epochStage - 0.4) * 0.5, 0.0), 0.35);

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

      {/* 2. Atmospheric Cloud Veil (Fades in after Hadean ocean condensation) */}
      {cloudOpacity > 0.01 && (
        <mesh ref={cloudsRef}>
          <sphereGeometry args={[radius * 1.015, 48, 48]} />
          <meshStandardMaterial
            color="#ffffff"
            transparent
            opacity={cloudOpacity}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* 3. Outer Atmospheric Cyan/Blue Scattering Halo */}
      <mesh>
        <sphereGeometry args={[radius * 1.035, 32, 32]} />
        <meshBasicMaterial
          color={climate.epochStage < 1.0 ? "#f97316" : "#38bdf8"}
          transparent
          opacity={0.25}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* 4. Asteroid Impact Shockwave Expansion Effect */}
      {climate.activeImpactGlow > 0.01 && (
        <mesh position={[radius * 0.3, radius * 0.2, radius * 0.9]}>
          <ringGeometry args={[0.2, radius * 0.6 * climate.activeImpactGlow, 32]} />
          <meshBasicMaterial
            color="#ff4400"
            transparent
            opacity={climate.activeImpactGlow * 0.8}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
};
