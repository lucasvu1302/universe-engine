import React, { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { AssetManager } from "@/engine/assets/AssetManager";
import partVert from "@/shaders/cosmic/cosmicParticle.vert.glsl";
import partFrag from "@/shaders/cosmic/cosmicParticle.frag.glsl";
import beamVert from "@/shaders/pulsar/pulsarBeam.vert.glsl";
import beamFrag from "@/shaders/pulsar/pulsarBeam.frag.glsl";
import accretionDiskVert from "@/shaders/cosmic/accretionDisk.vert.glsl";
import accretionDiskFrag from "@/shaders/cosmic/accretionDisk.frag.glsl";
import { SimulationManager } from "../core/SimulationManager";
import { CosmicEventManager } from "./CosmicEventManager";
import { ShockwaveRing } from "../effects/ShockwaveRing";
import { NebulaCloud } from "../effects/NebulaCloud";

interface SupernovaVisualProps {
  progress?: number; // 0 to 1
}

export const SupernovaVisual: React.FC<SupernovaVisualProps> = ({ progress = 0 }) => {
  const coreRef = useRef<THREE.Mesh>(null);
  const coronaSpriteRef = useRef<THREE.Sprite>(null);
  const pulsarJetGroupRef = useRef<THREE.Group>(null);
  const shockDiskMeshRef = useRef<THREE.Mesh>(null);
  const shockDiskMatRef = useRef<THREE.ShaderMaterial>(null);
  const beamMat1Ref = useRef<THREE.ShaderMaterial>(null);
  const beamMat2Ref = useRef<THREE.ShaderMaterial>(null);
  const ejectaPointsRef = useRef<THREE.Points>(null);
  const ejectaMatRef = useRef<THREE.ShaderMaterial>(null);
  const blastLightRef = useRef<THREE.PointLight>(null);

  const particleCount = 4200;
  const assets = useMemo(() => AssetManager.getInstance(), []);
  const unitSphere32 = useMemo(() => assets.getUnitSphereGeometry(32), [assets]);
  const softParticleMap = useMemo(() => assets.getSoftParticleMap(), [assets]);

  const resolveProgress = () => {
    if (SimulationManager.getInstance().getActiveScenario() === "cosmic_history") {
      return THREE.MathUtils.clamp(
        CosmicEventManager.getInstance().getPlaybackState().progress,
        0,
        1
      );
    }
    return THREE.MathUtils.clamp(progress, 0, 1);
  };

  const { velocities, basePositions, colors, scales } = useMemo(() => {
    const vels = new Float32Array(particleCount * 3);
    const pos = new Float32Array(particleCount * 3);
    const cols = new Float32Array(particleCount * 3);
    const scls = new Float32Array(particleCount);

    const colorOxygen = new THREE.Color("#38bdf8");
    const colorSulfur = new THREE.Color("#fbbf24");
    const colorHydrogen = new THREE.Color("#f43f5e");
    const colorCoreWhite = new THREE.Color("#ffffff");
    const tempCol = new THREE.Color();

    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      const filamentMod =
        1.0 +
        0.28 * Math.sin(3 * theta) * Math.cos(2 * phi) +
        0.15 * Math.sin(7 * phi);
      const baseSpeed = (0.2 + Math.pow(Math.random(), 0.7) * 0.9) * filamentMod;

      vels[i * 3] = Math.sin(phi) * Math.cos(theta) * baseSpeed;
      vels[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * baseSpeed;
      vels[i * 3 + 2] = Math.cos(phi) * baseSpeed;

      const rRatio = baseSpeed / 1.35;
      if (rRatio < 0.3) {
        tempCol.copy(colorCoreWhite).lerp(colorOxygen, rRatio / 0.3);
      } else if (rRatio < 0.65) {
        tempCol.copy(colorOxygen).lerp(colorSulfur, (rRatio - 0.3) / 0.35);
      } else {
        tempCol.copy(colorSulfur).lerp(colorHydrogen, (rRatio - 0.65) / 0.35);
      }

      cols[i * 3] = tempCol.r;
      cols[i * 3 + 1] = tempCol.g;
      cols[i * 3 + 2] = tempCol.b;

      scls[i] = 0.8 + Math.random() * 1.8;
    }

    return { velocities: vels, basePositions: pos, colors: cols, scales: scls };
  }, [particleCount]);

  const currentPositions = useMemo(() => new Float32Array(basePositions), [basePositions]);

  const ejectaUniforms = useMemo(
    () => ({
      uSize: { value: 2.8 },
      uScale: { value: 1.0 },
      uOpacity: { value: 1.0 },
      uTime: { value: 0.0 },
    }),
    []
  );

  const shockDiskUniforms = useMemo(
    () => ({
      uTime: { value: 0.0 },
      uInnerRadius: { value: 3.2 },
      uOuterRadius: { value: 14.0 },
    }),
    []
  );

  const beamUniforms1 = useMemo(
    () => ({
      uTime: { value: 0.0 },
      uColorCore: { value: new THREE.Color("#ffffff") },
      uColorGlow: { value: new THREE.Color("#38bdf8") },
    }),
    []
  );

  const beamUniforms2 = useMemo(
    () => ({
      uTime: { value: 0.0 },
      uColorCore: { value: new THREE.Color("#ffffff") },
      uColorGlow: { value: new THREE.Color("#38bdf8") },
    }),
    []
  );

  useEffect(() => {
    const core = coreRef.current;
    const corona = coronaSpriteRef.current;
    const sMesh = shockDiskMeshRef.current;
    const sMat = shockDiskMatRef.current;
    const pts = ejectaPointsRef.current;
    const mat = ejectaMatRef.current;
    const jets = pulsarJetGroupRef.current;
    return () => {
      (core?.material as THREE.Material | undefined)?.dispose();
      corona?.material?.dispose();
      sMesh?.geometry?.dispose();
      sMat?.dispose();
      pts?.geometry?.dispose();
      mat?.dispose();
      jets?.traverse((obj) => {
        const m = obj as THREE.Mesh;
        if (m.isMesh) {
          m.geometry?.dispose();
          (m.material as THREE.Material | undefined)?.dispose();
        }
      });
    };
  }, []);

  useFrame((_, delta) => {
    const clamped = resolveProgress();
    const opacity = Math.pow(1.0 - clamped * 0.85, 1.2);

    if (coreRef.current) coreRef.current.rotation.y += delta * 5.0;
    if (pulsarJetGroupRef.current) pulsarJetGroupRef.current.rotation.y += delta * 2.2;
    if (shockDiskMatRef.current) shockDiskMatRef.current.uniforms.uTime.value += delta * 2.0;
    if (beamMat1Ref.current) beamMat1Ref.current.uniforms.uTime.value += delta;
    if (beamMat2Ref.current) beamMat2Ref.current.uniforms.uTime.value += delta;

    if (ejectaPointsRef.current) {
      const geom = ejectaPointsRef.current.geometry;
      const posAttr = geom.attributes.position as THREE.BufferAttribute;
      const expansion = Math.max(0.2, clamped * 125);

      for (let i = 0; i < particleCount; i++) {
        currentPositions[i * 3] = velocities[i * 3] * expansion;
        currentPositions[i * 3 + 1] = velocities[i * 3 + 1] * expansion;
        currentPositions[i * 3 + 2] = velocities[i * 3 + 2] * expansion;
      }
      posAttr.copyArray(currentPositions);
      posAttr.needsUpdate = true;
    }

    if (ejectaMatRef.current) {
      ejectaMatRef.current.uniforms.uOpacity.value = opacity;
      ejectaMatRef.current.uniforms.uTime.value += delta;
    }

    if (blastLightRef.current) {
      blastLightRef.current.intensity = Math.max(4, (1.0 - clamped) * 35);
    }
  });

  return (
    <group>
      <group>
        {/* Newborn Millisecond Pulsar Core + Volumetric Synchrotron PWN Glow */}
        <mesh ref={coreRef} geometry={unitSphere32} scale={1.8}>
          <meshStandardMaterial
            color="#ffffff"
            emissive="#38bdf8"
            emissiveIntensity={5.5}
            roughness={0.08}
            metalness={0.9}
          />
        </mesh>

        <sprite ref={coronaSpriteRef} scale={[18, 18, 1]}>
          <spriteMaterial
            map={softParticleMap}
            color="#38bdf8"
            transparent
            opacity={0.72}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </sprite>

        {/* Crab-Nebula-Style Equatorial Wispy Termination Shock Disk */}
        <mesh ref={shockDiskMeshRef} rotation={[Math.PI / 2.1, 0.15, 0]}>
          <planeGeometry args={[30, 30, 1, 1]} />
          <shaderMaterial
            ref={shockDiskMatRef}
            vertexShader={accretionDiskVert}
            fragmentShader={accretionDiskFrag}
            uniforms={shockDiskUniforms}
            transparent
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>

        {/* Seamless Fresnel Bipolar Pulsar Jets */}
        <group ref={pulsarJetGroupRef} rotation={[0, 0, THREE.MathUtils.degToRad(22)]}>
          <mesh position={[0, 30, 0]}>
            <cylinderGeometry args={[4.0, 0.5, 60, 36, 1, true]} />
            <shaderMaterial
              ref={beamMat1Ref}
              vertexShader={beamVert}
              fragmentShader={beamFrag}
              uniforms={beamUniforms1}
              transparent
              side={THREE.DoubleSide}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>

          <mesh position={[0, -30, 0]} rotation={[Math.PI, 0, 0]}>
            <cylinderGeometry args={[4.0, 0.5, 60, 36, 1, true]} />
            <shaderMaterial
              ref={beamMat2Ref}
              vertexShader={beamVert}
              fragmentShader={beamFrag}
              uniforms={beamUniforms2}
              transparent
              side={THREE.DoubleSide}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        </group>
      </group>

      <points ref={ejectaPointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[currentPositions, 3]} />
          <bufferAttribute attach="attributes-aColor" args={[colors, 3]} />
          <bufferAttribute attach="attributes-aScale" args={[scales, 1]} />
        </bufferGeometry>
        <shaderMaterial
          ref={ejectaMatRef}
          vertexShader={partVert}
          fragmentShader={partFrag}
          uniforms={ejectaUniforms}
          transparent
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      <ShockwaveRing
        progressGetter={resolveProgress}
        maxRadius={135}
        color="#f43f5e"
        thickness={5.0}
        rotation={[Math.PI / 2.2, 0, 0]}
      />
      <ShockwaveRing
        progressGetter={() => Math.max(0, resolveProgress() - 0.18)}
        maxRadius={95}
        color="#fb7185"
        thickness={3.5}
        rotation={[Math.PI / 1.8, 0, Math.PI / 4]}
      />

      <NebulaCloud
        color="#db2777"
        size={60}
        intensityGetter={() => Math.max(0.15, (1.0 - resolveProgress()) * 0.7)}
      />
      <NebulaCloud color="#0284c7" size={35} intensity={0.4} />

      <pointLight ref={blastLightRef} color="#f43f5e" intensity={35} distance={350} />
      <pointLight color="#38bdf8" intensity={12} distance={180} />
    </group>
  );
};
