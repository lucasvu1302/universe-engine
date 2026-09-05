import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface NebulaCloudProps {
  color?: string;
  size?: number;
  intensity?: number;
  rotationSpeed?: number;
}

export const NebulaCloud: React.FC<NebulaCloudProps> = ({
  color = "#ec4899",
  size = 40,
  intensity = 0.5,
  rotationSpeed = 0.02
}) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * rotationSpeed;
      groupRef.current.rotation.z += delta * (rotationSpeed * 0.5);
    }
  });

  return (
    <group ref={groupRef}>
      {/* Layer 1: Core glow */}
      <mesh>
        <sphereGeometry args={[size * 0.6, 16, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={intensity * 0.6}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Layer 2: Medium diffuse halo */}
      <mesh scale={[1.2, 0.8, 1.4]}>
        <sphereGeometry args={[size * 0.9, 16, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={intensity * 0.35}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Layer 3: Broad outer veil */}
      <mesh scale={[1.5, 1.3, 0.9]}>
        <sphereGeometry args={[size * 1.3, 16, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={intensity * 0.18}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
};
