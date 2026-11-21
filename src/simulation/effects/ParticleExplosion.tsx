import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import partVert from "@/shaders/cosmic/cosmicParticle.vert.glsl";
import partFrag from "@/shaders/cosmic/cosmicParticle.frag.glsl";

interface ParticleExplosionProps {
  progress: number; // 0 to 1
  count?: number;
  primaryColor?: string;
  secondaryColor?: string;
  maxSpread?: number;
  size?: number;
}

export const ParticleExplosion: React.FC<ParticleExplosionProps> = ({
  progress,
  count = 1600,
  primaryColor = "#ffaa00",
  secondaryColor = "#ff2200",
  maxSpread = 85,
  size = 2.4
}) => {
  const pointsRef = useRef<THREE.Points>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);

  // Generate initial velocity directions, scales, and colors
  const { velocities, basePositions, colors, scales } = useMemo(() => {
    const vels = new Float32Array(count * 3);
    const pos = new Float32Array(count * 3);
    const cols = new Float32Array(count * 3);
    const scls = new Float32Array(count);

    const c1 = new THREE.Color(primaryColor);
    const c2 = new THREE.Color(secondaryColor);
    const tempCol = new THREE.Color();

    for (let i = 0; i < count; i++) {
      // Uniform spherical direction with velocity dispersion
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      // Realistic blast speed distribution (most debris at mid-speed, some high-velocity ejecta)
      const speed = 0.25 + Math.pow(Math.random(), 0.8) * 0.85;

      const vx = Math.sin(phi) * Math.cos(theta) * speed;
      const vy = Math.sin(phi) * Math.sin(theta) * speed;
      const vz = Math.cos(phi) * speed;

      vels[i * 3] = vx;
      vels[i * 3 + 1] = vy;
      vels[i * 3 + 2] = vz;

      pos[i * 3] = 0;
      pos[i * 3 + 1] = 0;
      pos[i * 3 + 2] = 0;

      // Color variation between primary and secondary
      tempCol.copy(c1).lerp(c2, Math.random());
      cols[i * 3] = tempCol.r;
      cols[i * 3 + 1] = tempCol.g;
      cols[i * 3 + 2] = tempCol.b;

      scls[i] = 0.6 + Math.random() * 1.6;
    }

    return { velocities: vels, basePositions: pos, colors: cols, scales: scls };
  }, [count, primaryColor, secondaryColor]);

  // Current dynamic positions buffer
  const currentPositions = useMemo(() => new Float32Array(basePositions), [basePositions]);

  const clamped = Math.min(Math.max(progress, 0), 1);
  const opacity = Math.pow(1.0 - clamped, 1.4);

  const uniforms = useMemo(
    () => ({
      uSize: { value: size },
      uScale: { value: 1.0 },
      uOpacity: { value: opacity },
      uTime: { value: 0.0 }
    }),
    [size]
  );

  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    const geom = pointsRef.current.geometry;
    const posAttr = geom.attributes.position as THREE.BufferAttribute;

    const expansion = Math.max(0.1, clamped * maxSpread);
    for (let i = 0; i < count; i++) {
      currentPositions[i * 3] = velocities[i * 3] * expansion;
      currentPositions[i * 3 + 1] = velocities[i * 3 + 1] * expansion;
      currentPositions[i * 3 + 2] = velocities[i * 3 + 2] * expansion;
    }
    posAttr.copyArray(currentPositions);
    posAttr.needsUpdate = true;

    if (matRef.current) {
      matRef.current.uniforms.uOpacity.value = opacity;
      matRef.current.uniforms.uTime.value += delta;
    }
  });

  if (clamped < 0.001 || clamped >= 0.999) return null;

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[currentPositions, 3]}
        />
        <bufferAttribute
          attach="attributes-aColor"
          args={[colors, 3]}
        />
        <bufferAttribute
          attach="attributes-aScale"
          args={[scales, 1]}
        />
      </bufferGeometry>
      <shaderMaterial
        ref={matRef}
        vertexShader={partVert}
        fragmentShader={partFrag}
        uniforms={uniforms}
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
};
