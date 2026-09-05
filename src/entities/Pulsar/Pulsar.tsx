import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import beamVert from '@/shaders/pulsar/pulsarBeam.vert.glsl';
import beamFrag from '@/shaders/pulsar/pulsarBeam.frag.glsl';

interface PulsarProps {
  position?: [number, number, number];
  onSelect?: () => void;
}

export const Pulsar: React.FC<PulsarProps> = ({
  position = [-650, 220, -750],
  onSelect
}) => {
  const coreRef = useRef<THREE.Mesh>(null);
  const jetGroupRef = useRef<THREE.Group>(null);
  const torusRef = useRef<THREE.Mesh>(null);
  const beamMatRef1 = useRef<THREE.ShaderMaterial>(null);
  const beamMatRef2 = useRef<THREE.ShaderMaterial>(null);

  useFrame((_, delta) => {
    // 1. Ultra-smooth continuous spin on rotation axis (NO erratic pendulum swinging!)
    if (coreRef.current) {
      coreRef.current.rotation.y += delta * 2.5;
    }

    // 2. Smooth steady conical sweep around the magnetic pole (smooth 360-degree rotation)
    if (jetGroupRef.current) {
      jetGroupRef.current.rotation.y += delta * 1.2;
    }

    // 3. Equatorial synchrotron plasma ring slowly rotating
    if (torusRef.current) {
      torusRef.current.rotation.z += delta * 0.4;
    }

    // 4. Update beam shaders
    if (beamMatRef1.current) {
      beamMatRef1.current.uniforms.uTime.value += delta;
    }
    if (beamMatRef2.current) {
      beamMatRef2.current.uniforms.uTime.value += delta;
    }
  });

  return (
    <group position={position} onClick={onSelect}>
      {/* 1. Ultra-dense Neutron Star Core */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[2.2, 32, 32]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#38bdf8"
          emissiveIntensity={4.5}
          roughness={0.05}
          metalness={0.95}
        />
      </mesh>

      {/* Atmospheric Core Glare */}
      <mesh scale={1.6}>
        <sphereGeometry args={[2.2, 32, 32]} />
        <meshBasicMaterial
          color="#0284c7"
          transparent
          opacity={0.35}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* 2. Synchrotron Torus Ring (Smooth plasma donut around equator) */}
      <mesh ref={torusRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[5.2, 0.45, 16, 64]} />
        <meshBasicMaterial
          color="#a855f7"
          transparent
          opacity={0.55}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* 3. Smooth Relativistic Beams (Tilted at 18 degrees, sweeping smoothly) */}
      <group ref={jetGroupRef} rotation={[0, 0, THREE.MathUtils.degToRad(18)]}>
        {/* North Jet Beam */}
        <mesh position={[0, 32, 0]}>
          <cylinderGeometry args={[4.2, 0.6, 62, 32, 1, true]} />
          <shaderMaterial
            ref={beamMatRef1}
            vertexShader={beamVert}
            fragmentShader={beamFrag}
            uniforms={{
              uTime: { value: 0.0 },
              uColorCore: { value: new THREE.Color('#ffffff') },
              uColorGlow: { value: new THREE.Color('#0ea5e9') }
            }}
            transparent
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>

        {/* South Jet Beam */}
        <mesh position={[0, -32, 0]} rotation={[Math.PI, 0, 0]}>
          <cylinderGeometry args={[4.2, 0.6, 62, 32, 1, true]} />
          <shaderMaterial
            ref={beamMatRef2}
            vertexShader={beamVert}
            fragmentShader={beamFrag}
            uniforms={{
              uTime: { value: 0.0 },
              uColorCore: { value: new THREE.Color('#ffffff') },
              uColorGlow: { value: new THREE.Color('#0ea5e9') }
            }}
            transparent
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      </group>

      {/* Radiation Glow Beacon */}
      <pointLight color="#38bdf8" intensity={3.5} distance={150} />
    </group>
  );
};
