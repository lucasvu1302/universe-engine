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

interface StarBirthVisualProps {
  progress?: number; // 0 to 1
}

export const StarBirthVisual: React.FC<StarBirthVisualProps> = ({ progress = 0 }) => {
  const coreRef = useRef<THREE.Mesh>(null);
  const coreMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const haloSpriteRef = useRef<THREE.Sprite>(null);
  const starLightRef = useRef<THREE.PointLight>(null);
  const jetGroupRef = useRef<THREE.Group>(null);
  const beamMat1Ref = useRef<THREE.ShaderMaterial>(null);
  const beamMat2Ref = useRef<THREE.ShaderMaterial>(null);
  const diskMeshRef = useRef<THREE.Mesh>(null);
  const diskMatRef = useRef<THREE.ShaderMaterial>(null);

  const infallPointsRef = useRef<THREE.Points>(null);
  const infallMatRef = useRef<THREE.ShaderMaterial>(null);

  const particleCount = 3500;
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

  const { baseData } = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const cols = new Float32Array(particleCount * 3);
    const scales = new Float32Array(particleCount);
    const params = new Float32Array(particleCount * 4);

    const colColdGas = new THREE.Color("#818cf8");
    const colIgnition = new THREE.Color("#38bdf8");
    const colWhite = new THREE.Color("#ffffff");
    const tempCol = new THREE.Color();

    for (let i = 0; i < particleCount; i++) {
      const r0 = 15 + Math.pow(Math.random(), 0.8) * 85;
      const theta0 = Math.random() * Math.PI * 2;
      const z0 = (Math.random() - 0.5) * 22 * (r0 / 100);
      const infallSpeed = 0.35 + Math.random() * 0.65;

      pos[i * 3] = r0 * Math.cos(theta0);
      pos[i * 3 + 1] = z0;
      pos[i * 3 + 2] = r0 * Math.sin(theta0);

      const rNorm = (r0 - 15) / 85;
      tempCol.copy(colColdGas).lerp(colIgnition, 1.0 - rNorm);
      if (rNorm < 0.2) tempCol.lerp(colWhite, 0.4);

      cols[i * 3] = tempCol.r;
      cols[i * 3 + 1] = tempCol.g;
      cols[i * 3 + 2] = tempCol.b;

      scales[i] = 0.8 + Math.random() * 1.8;

      params[i * 4] = r0;
      params[i * 4 + 1] = theta0;
      params[i * 4 + 2] = infallSpeed;
      params[i * 4 + 3] = z0;
    }

    return { baseData: { pos, cols, scales, params } };
  }, [particleCount]);

  const currentPositions = useMemo(() => new Float32Array(baseData.pos), [baseData.pos]);

  const infallUniforms = useMemo(
    () => ({
      uSize: { value: 2.6 },
      uScale: { value: 1.0 },
      uOpacity: { value: 0.95 },
      uTime: { value: 0.0 },
    }),
    []
  );

  const diskUniforms = useMemo(
    () => ({
      uTime: { value: 0.0 },
      uInnerRadius: { value: 12.5 },
      uOuterRadius: { value: 58.0 },
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
    const pts = infallPointsRef.current;
    const mat = infallMatRef.current;
    const cMat = coreMatRef.current;
    const hSprite = haloSpriteRef.current;
    const dMesh = diskMeshRef.current;
    const dMat = diskMatRef.current;
    const jets = jetGroupRef.current;
    return () => {
      pts?.geometry?.dispose();
      mat?.dispose();
      cMat?.dispose();
      hSprite?.material?.dispose();
      dMesh?.geometry?.dispose();
      dMat?.dispose();
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
    const p = resolveProgress();
    const isIgnited = p >= 0.25;
    const ignitionFactor = isIgnited ? Math.min(1.0, (p - 0.25) / 0.2) : 0;

    if (coreRef.current) {
      coreRef.current.rotation.y += delta * 0.4;
      const coreSize = 5.5 + ignitionFactor * 5.5;
      coreRef.current.scale.setScalar(coreSize);
    }
    if (coreMatRef.current) {
      coreMatRef.current.color.set(isIgnited ? "#ffffff" : "#fb923c");
      coreMatRef.current.emissive.set(isIgnited ? "#38bdf8" : "#c2410c");
      coreMatRef.current.emissiveIntensity = 3.2 + ignitionFactor * 3.2;
    }
    if (haloSpriteRef.current) {
      const haloScale = 28 + ignitionFactor * 26 + Math.sin(performance.now() * 0.005) * 1.8;
      haloSpriteRef.current.scale.set(haloScale, haloScale, 1);
      haloSpriteRef.current.material.color.set(isIgnited ? "#38bdf8" : "#ea580c");
    }
    if (starLightRef.current) {
      starLightRef.current.color.set(isIgnited ? "#38bdf8" : "#f97316");
      starLightRef.current.intensity = 8 + ignitionFactor * 24;
    }

    if (diskMeshRef.current) {
      diskMeshRef.current.rotation.z += delta * 0.35;
    }
    if (diskMatRef.current) {
      diskMatRef.current.uniforms.uTime.value += delta;
    }

    if (jetGroupRef.current) {
      jetGroupRef.current.visible = isIgnited;
      if (isIgnited) {
        jetGroupRef.current.rotation.y += delta * 0.25;
      }
    }
    if (beamMat1Ref.current) beamMat1Ref.current.uniforms.uTime.value += delta;
    if (beamMat2Ref.current) beamMat2Ref.current.uniforms.uTime.value += delta;

    if (infallPointsRef.current) {
      const geom = infallPointsRef.current.geometry;
      const posAttr = geom.attributes.position as THREE.BufferAttribute;

      for (let i = 0; i < particleCount; i++) {
        const r0 = baseData.params[i * 4];
        const theta0 = baseData.params[i * 4 + 1];
        const speed = baseData.params[i * 4 + 2];
        const z0 = baseData.params[i * 4 + 3];

        const cycle = (p * 2.5 * speed + (i % 100) / 100) % 1.0;
        const currentR = Math.max(10, r0 * (1.0 - cycle * 0.82));
        const currentTheta = theta0 + (1.0 / Math.sqrt(currentR)) * 25 * (p + 0.1);
        const currentZ = z0 * (1.0 - cycle * 0.75);

        currentPositions[i * 3] = currentR * Math.cos(currentTheta);
        currentPositions[i * 3 + 1] = currentZ;
        currentPositions[i * 3 + 2] = currentR * Math.sin(currentTheta);
      }

      posAttr.copyArray(currentPositions);
      posAttr.needsUpdate = true;
    }

    if (infallMatRef.current) {
      infallMatRef.current.uniforms.uTime.value += delta;
    }
  });

  return (
    <group>
      {/* Protostellar Hydrostatic Core + Volumetric Gaussian Corona */}
      <mesh ref={coreRef} geometry={unitSphere32}>
        <meshStandardMaterial
          ref={coreMatRef}
          color="#fb923c"
          emissive="#c2410c"
          emissiveIntensity={3.2}
          roughness={0.12}
        />
      </mesh>

      <sprite ref={haloSpriteRef} scale={[32, 32, 1]}>
        <spriteMaterial
          map={softParticleMap}
          color="#ea580c"
          transparent
          opacity={0.72}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </sprite>

      <pointLight ref={starLightRef} color="#f97316" intensity={8} distance={250} />

      {/* Seamless Fresnel Herbig-Haro Bipolar Protostellar Jets */}
      <group ref={jetGroupRef} visible={false}>
        <mesh position={[0, 36, 0]}>
          <cylinderGeometry args={[4.2, 0.6, 72, 36, 1, true]} />
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

        <mesh position={[0, -36, 0]} rotation={[Math.PI, 0, 0]}>
          <cylinderGeometry args={[4.2, 0.6, 72, 36, 1, true]} />
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

      {/* Spiraling Collapsing Molecular Cloud Envelope */}
      <points ref={infallPointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[currentPositions, 3]} />
          <bufferAttribute attach="attributes-aColor" args={[baseData.cols, 3]} />
          <bufferAttribute attach="attributes-aScale" args={[baseData.scales, 1]} />
        </bufferGeometry>
        <shaderMaterial
          ref={infallMatRef}
          vertexShader={partVert}
          fragmentShader={partFrag}
          uniforms={infallUniforms}
          transparent
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      {/* Shader-Driven Spiral Protostellar Accretion Disk (Replaces Flat Cyan Ring) */}
      <mesh ref={diskMeshRef} rotation={[Math.PI / 2.1, 0, 0]}>
        <planeGeometry args={[120, 120, 1, 1]} />
        <shaderMaterial
          ref={diskMatRef}
          vertexShader={accretionDiskVert}
          fragmentShader={accretionDiskFrag}
          uniforms={diskUniforms}
          transparent
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      <ShockwaveRing
        progressGetter={() => {
          const p = resolveProgress();
          return p >= 0.25 ? Math.min(1.0, (p - 0.25) / 0.2) : 0;
        }}
        maxRadius={110}
        color="#38bdf8"
        thickness={4.0}
        rotation={[Math.PI / 2, 0, 0]}
      />
      <NebulaCloud color="#818cf8" size={60} intensity={0.55} />
      <NebulaCloud color="#38bdf8" size={40} intensity={0.4} />
    </group>
  );
};
