import React, { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import partVert from "@/shaders/cosmic/cosmicParticle.vert.glsl";
import partFrag from "@/shaders/cosmic/cosmicParticle.frag.glsl";

interface NebulaCloudProps {
  color?: string;
  size?: number;
  intensity?: number;
  intensityGetter?: () => number;
  rotationSpeed?: number;
}

export const NebulaCloud: React.FC<NebulaCloudProps> = ({
  color = "#ec4899",
  size = 45,
  intensity = 0.5,
  intensityGetter,
  rotationSpeed = 0.02
}) => {
  const pointsRef = useRef<THREE.Points>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const particleCount = 750;

  const geometry = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const cols = new Float32Array(particleCount * 3);
    const scls = new Float32Array(particleCount);

    const baseCol = new THREE.Color(color);
    const highlightCol = new THREE.Color(color).offsetHSL(0.08, -0.1, 0.15);
    const tempCol = new THREE.Color();

    for (let i = 0; i < particleCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const radius = Math.sqrt(-2.0 * Math.log(Math.max(u, 0.0001))) * (size * 0.45);
      const theta = v * Math.PI * 2;
      const phi = Math.acos(2.0 * Math.random() - 1.0);

      pos[i * 3] = radius * Math.sin(phi) * Math.cos(theta) * 1.3;
      pos[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta) * 0.75;
      pos[i * 3 + 2] = radius * Math.cos(phi) * 1.1;

      tempCol.copy(baseCol).lerp(highlightCol, Math.random());
      cols[i * 3] = tempCol.r;
      cols[i * 3 + 1] = tempCol.g;
      cols[i * 3 + 2] = tempCol.b;

      scls[i] = 2.5 + Math.random() * 4.0;
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aColor", new THREE.BufferAttribute(cols, 3));
    g.setAttribute("aScale", new THREE.BufferAttribute(scls, 1));
    return g;
  }, [color, size]);

  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  const uniforms = useMemo(
    () => ({
      uSize: { value: 9.0 },
      uScale: { value: 1.0 },
      uOpacity: { value: 0.2 },
      uTime: { value: 0.0 }
    }),
    []
  );

  useEffect(() => {
    const mat = matRef.current;
    return () => {
      mat?.dispose();
    };
  }, []);

  useFrame((_, delta) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * rotationSpeed;
      pointsRef.current.rotation.z += delta * (rotationSpeed * 0.4);
    }
    if (matRef.current) {
      const liveIntensity = intensityGetter ? intensityGetter() : intensity;
      matRef.current.uniforms.uOpacity.value = Math.min(liveIntensity * 0.35, 0.45);
      matRef.current.uniforms.uTime.value += delta;
    }
  });

  return (
    <points ref={pointsRef} geometry={geometry}>
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
