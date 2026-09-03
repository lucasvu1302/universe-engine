import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import galaxyVert from '@/shaders/galaxy/galaxy.vert.glsl';
import galaxyFrag from '@/shaders/galaxy/galaxy.frag.glsl';

interface GalaxySceneProps {
  onEnterSolarSystem?: () => void;
}

export const GalaxyScene: React.FC<GalaxySceneProps> = ({ onEnterSolarSystem }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const particleCount = 40000;
  const arms = 2;
  const armSpread = 0.45;
  const maxRadius = 380;

  const { positions, colors, scales, angles, distances } = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const col = new Float32Array(particleCount * 3);
    const scl = new Float32Array(particleCount);
    const ang = new Float32Array(particleCount);
    const dist = new Float32Array(particleCount);

    const insideColor = new THREE.Color('#ffe8c2'); // Warm golden core
    const outsideColor = new THREE.Color('#38bdf8'); // Blue outer spiral arms
    const dustColor = new THREE.Color('#e066ff'); // Magenta interstellar dust

    for (let i = 0; i < particleCount; i++) {
      // Radius with power distribution towards the dense center
      const r = Math.pow(Math.random(), 2.2) * maxRadius;
      const spinAngle = r * 0.08;
      const branchAngle = ((i % arms) * ((2 * Math.PI) / arms));

      // Gaussian-like random dispersal along arm width and height
      const randomX = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * armSpread * r;
      const randomY = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * (18 - (r / maxRadius) * 12);
      const randomZ = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * armSpread * r;

      const baseAngle = branchAngle + spinAngle;
      const x = Math.cos(baseAngle) * r + randomX;
      const z = Math.sin(baseAngle) * r + randomZ;
      const y = randomY;

      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;

      ang[i] = baseAngle;
      dist[i] = r;
      scl[i] = Math.random() * 2.0 + 0.8;

      // Color blending based on distance from core
      const mixedColor = insideColor.clone();
      if (r < maxRadius * 0.2) {
        mixedColor.lerp(insideColor, 0.9);
      } else if (r < maxRadius * 0.7) {
        mixedColor.lerp(outsideColor, (r - maxRadius * 0.2) / (maxRadius * 0.5));
      } else {
        mixedColor.lerp(dustColor, (r - maxRadius * 0.7) / (maxRadius * 0.3));
      }

      col[i * 3] = mixedColor.r;
      col[i * 3 + 1] = mixedColor.g;
      col[i * 3 + 2] = mixedColor.b;
    }

    return {
      positions: pos,
      colors: col,
      scales: scl,
      angles: ang,
      distances: dist
    };
  }, [particleCount, arms, armSpread, maxRadius]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSize: { value: 2.2 }
    }),
    []
  );

  useFrame((_, delta) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value += delta;
    }
  });

  // Solar system position within the Milky Way (Orion Cygnus arm, ~26,000 light years from core)
  const solPos: [number, number, number] = [120, 2, 80];

  return (
    <group>
      {/* Volumetric Milky Way Galaxy */}
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[positions, 3]}
          />
          <bufferAttribute
            attach="attributes-aColor"
            args={[colors, 3]}
          />
          <bufferAttribute
            attach="attributes-aScale"
            args={[scales, 1]}
          />
          <bufferAttribute
            attach="attributes-aAngle"
            args={[angles, 1]}
          />
          <bufferAttribute
            attach="attributes-aDistance"
            args={[distances, 1]}
          />
        </bufferGeometry>
        <shaderMaterial
          ref={materialRef}
          vertexShader={galaxyVert}
          fragmentShader={galaxyFrag}
          uniforms={uniforms}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          transparent
        />
      </points>

      {/* "YOU ARE HERE / SOL SYSTEM" Navigation Beacon */}
      <group position={solPos}>
        <mesh
          onClick={(e) => {
            e.stopPropagation();
            onEnterSolarSystem?.();
          }}
          onPointerOver={() => {
            document.body.style.cursor = 'pointer';
          }}
          onPointerOut={() => {
            document.body.style.cursor = 'auto';
          }}
        >
          <sphereGeometry args={[4.5, 16, 16]} />
          <meshBasicMaterial color="#38bdf8" />
        </mesh>

        {/* Pulsing Beacon Ring */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[6.5, 8.0, 32]} />
          <meshBasicMaterial
            color="#38bdf8"
            transparent
            opacity={0.6}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>
    </group>
  );
};
