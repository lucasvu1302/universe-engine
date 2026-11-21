import React, { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import shockVert from "@/shaders/cosmic/shockwave.vert.glsl";
import shockFrag from "@/shaders/cosmic/shockwave.frag.glsl";

interface ShockwaveRingProps {
  progress?: number; // 0 to 1
  progressGetter?: () => number;
  maxRadius?: number;
  color?: string;
  thickness?: number;
  rotation?: [number, number, number];
}

export const ShockwaveRing: React.FC<ShockwaveRingProps> = ({
  progress = 0,
  progressGetter,
  maxRadius = 80,
  color = "#38bdf8",
  thickness = 3.5,
  rotation = [Math.PI / 2, 0, 0]
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const shaderMatRef = useRef<THREE.ShaderMaterial>(null);

  const maxPlaneSize = useMemo(
    () => Math.max(20, (maxRadius + thickness * 2) * 2.2),
    [maxRadius, thickness]
  );

  const planeGeo = useMemo(
    () => new THREE.PlaneGeometry(maxPlaneSize, maxPlaneSize, 1, 1),
    [maxPlaneSize]
  );

  const uniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color('#ffffff') },
      uRadius: { value: 0.2 },
      uThickness: { value: 4.0 },
      uOpacity: { value: 0.0 },
      uTime: { value: 0.0 }
    }),
    []
  );

  useEffect(() => {
    uniforms.uColor.value.set(color);
    uniforms.uThickness.value = thickness;
  }, [color, thickness, uniforms]);

  useEffect(() => {
    return () => {
      planeGeo.dispose();
    };
  }, [planeGeo]);

  useEffect(() => {
    const mat = shaderMatRef.current;
    return () => {
      mat?.dispose();
    };
  }, []);

  useFrame((_, delta) => {
    const rawProgress = progressGetter ? progressGetter() : progress;
    const clamped = Math.min(Math.max(rawProgress, 0), 1);
    const visible = clamped >= 0.001 && clamped < 0.999;

    if (meshRef.current) {
      meshRef.current.visible = visible;
    }
    if (!visible || !shaderMatRef.current) return;

    shaderMatRef.current.uniforms.uRadius.value = Math.max(0.2, clamped * maxRadius);
    shaderMatRef.current.uniforms.uThickness.value = thickness;
    shaderMatRef.current.uniforms.uOpacity.value = Math.pow(1.0 - clamped, 1.6);
    shaderMatRef.current.uniforms.uTime.value += delta;
  });

  return (
    <mesh ref={meshRef} geometry={planeGeo} rotation={rotation}>
      <shaderMaterial
        ref={shaderMatRef}
        vertexShader={shockVert}
        fragmentShader={shockFrag}
        uniforms={uniforms}
        transparent
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
};
