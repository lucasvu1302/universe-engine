import React, { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { AssetManager } from "@/engine/assets/AssetManager";
import diskVert from "@/shaders/cosmic/accretionDisk.vert.glsl";
import diskFrag from "@/shaders/cosmic/accretionDisk.frag.glsl";
import partVert from "@/shaders/cosmic/cosmicParticle.vert.glsl";
import partFrag from "@/shaders/cosmic/cosmicParticle.frag.glsl";
import earthHistoricalVert from "@/shaders/earth/earthHistorical.vert.glsl";
import earthHistoricalFrag from "@/shaders/earth/earthHistorical.frag.glsl";
import sunVert from "@/shaders/sun/sun.vert.glsl";
import sunFrag from "@/shaders/sun/sun.frag.glsl";
import { SimulationManager } from "../core/SimulationManager";
import { CosmicEventManager } from "./CosmicEventManager";
import { NebulaCloud } from "../effects/NebulaCloud";

interface PlanetFormationVisualProps {
  progress?: number; // 0 to 1
}

export const PlanetFormationVisual: React.FC<PlanetFormationVisualProps> = ({ progress = 0 }) => {
  const sunMeshRef = useRef<THREE.Mesh>(null);
  const sunMatRef = useRef<THREE.ShaderMaterial>(null);
  const sunCoronaRef = useRef<THREE.Sprite>(null);
  const diskMeshRef = useRef<THREE.Mesh>(null);
  const diskMatRef = useRef<THREE.ShaderMaterial>(null);
  const protoEarthRef = useRef<THREE.Group>(null);
  const earthGlobeRef = useRef<THREE.Mesh>(null);
  const earthMatRef = useRef<THREE.ShaderMaterial>(null);
  const earthCoronaRef = useRef<THREE.Sprite>(null);
  const particlesRef = useRef<THREE.Points>(null);
  const particleMatRef = useRef<THREE.ShaderMaterial>(null);
  const impactFlashRef = useRef<THREE.PointLight>(null);
  const simElapsedRef = useRef<number>(0);

  const particleCount = 3600;
  const assets = useMemo(() => AssetManager.getInstance(), []);
  const unitSphere48 = useMemo(() => assets.getUnitSphereGeometry(48), [assets]);
  const softParticleMap = useMemo(() => assets.getSoftParticleMap(), [assets]);

  // 1. Protoplanetary Keplerian Swarm of Dust & Planetesimals
  const { baseData } = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const cols = new Float32Array(particleCount * 3);
    const scales = new Float32Array(particleCount);
    const params = new Float32Array(particleCount * 3);

    const colInner = new THREE.Color("#fbbf24");
    const colMid = new THREE.Color("#ea580c");
    const colOuter = new THREE.Color("#78350f");
    const tempCol = new THREE.Color();

    for (let i = 0; i < particleCount; i++) {
      let r = 16 + Math.pow(Math.random(), 1.1) * 64;
      if (r > 28 && r < 34 && Math.random() < 0.75) r += 8;
      if (r > 52 && r < 60 && Math.random() < 0.75) r += 10;

      const theta0 = Math.random() * Math.PI * 2;
      const z = (Math.random() - 0.5) * 3.5 * (r / 50);

      pos[i * 3] = r * Math.cos(theta0);
      pos[i * 3 + 1] = z;
      pos[i * 3 + 2] = r * Math.sin(theta0);

      const rNorm = (r - 16) / 64;
      if (rNorm < 0.4) {
        tempCol.copy(colInner).lerp(colMid, rNorm / 0.4);
      } else {
        tempCol.copy(colMid).lerp(colOuter, (rNorm - 0.4) / 0.6);
      }

      cols[i * 3] = tempCol.r;
      cols[i * 3 + 1] = tempCol.g;
      cols[i * 3 + 2] = tempCol.b;

      scales[i] = 0.7 + Math.random() * 1.6;

      const omega = 12.0 / Math.pow(r, 1.35);
      params[i * 3] = r;
      params[i * 3 + 1] = theta0;
      params[i * 3 + 2] = omega;
    }

    return { baseData: { pos, cols, scales, params } };
  }, [particleCount]);

  const currentPositions = useMemo(() => new Float32Array(baseData.pos), [baseData.pos]);

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

  const earthOrbitRadius = 31;
  const earthOrbitSpeed = 0.35;

  const sunUniforms = useMemo(
    () => ({
      uTime: { value: 0.0 },
    }),
    []
  );

  const diskUniforms = useMemo(
    () => ({
      uTime: { value: 0.0 },
      uInnerRadius: { value: 14.0 },
      uOuterRadius: { value: 80.0 },
    }),
    []
  );

  const hadeanEarthUniforms = useMemo(
    () => ({
      uSunPosition: { value: new THREE.Vector3(0, 0, 0) },
      uEpochStage: { value: 0.0 }, // Molten Hadean magma world with basalt crust fissures
      uImpactGlow: { value: 0.0 },
      uTime: { value: 0.0 },
    }),
    []
  );

  const particleUniforms = useMemo(
    () => ({
      uSize: { value: 2.2 },
      uScale: { value: 1.0 },
      uOpacity: { value: 0.9 },
      uTime: { value: 0.0 },
    }),
    []
  );

  useEffect(() => {
    const sMat = sunMatRef.current;
    const sCor = sunCoronaRef.current;
    const dMesh = diskMeshRef.current;
    const dMat = diskMatRef.current;
    const eMat = earthMatRef.current;
    const eCor = earthCoronaRef.current;
    const pts = particlesRef.current;
    const pMat = particleMatRef.current;
    return () => {
      sMat?.dispose();
      sCor?.material?.dispose();
      dMesh?.geometry?.dispose();
      dMat?.dispose();
      eMat?.dispose();
      eCor?.material?.dispose();
      pts?.geometry?.dispose();
      pMat?.dispose();
    };
  }, []);

  useFrame((_, delta) => {
    const p = resolveProgress();
    const isPlaying =
      SimulationManager.getInstance().getActiveScenario() !== "cosmic_history" ||
      SimulationManager.getInstance().getTimelineEngine().getIsPlaying();
    const activeDelta = isPlaying ? delta : 0;
    simElapsedRef.current += activeDelta;
    const simTime = simElapsedRef.current;

    if (sunMeshRef.current) {
      sunMeshRef.current.rotation.y += activeDelta * 0.25;
    }
    if (sunMatRef.current) {
      sunMatRef.current.uniforms.uTime.value = simTime;
    }

    if (diskMatRef.current) {
      diskMatRef.current.uniforms.uTime.value += activeDelta;
    }

    const earthTheta = p * 12 + simTime * 0.3 * earthOrbitSpeed;
    const earthX = earthOrbitRadius * Math.cos(earthTheta);
    const earthZ = earthOrbitRadius * Math.sin(earthTheta);

    if (protoEarthRef.current) {
      protoEarthRef.current.position.set(earthX, 0, earthZ);
    }
    if (earthGlobeRef.current) {
      earthGlobeRef.current.rotation.y += activeDelta * 1.2;
    }

    const impactPulse = Math.max(0.0, Math.sin(simTime * 6.5));
    if (earthMatRef.current) {
      earthMatRef.current.uniforms.uTime.value = simTime * 2.5;
      earthMatRef.current.uniforms.uImpactGlow.value =
        impactPulse > 0.72 ? (impactPulse - 0.72) * 1.8 : 0.0;
    }
    if (impactFlashRef.current) {
      impactFlashRef.current.intensity = isPlaying && impactPulse > 0.82 ? 12 : 0;
    }

    if (particlesRef.current) {
      const geom = particlesRef.current.geometry;
      const posAttr = geom.attributes.position as THREE.BufferAttribute;

      for (let i = 0; i < particleCount; i++) {
        const r = baseData.params[i * 3];
        const theta0 = baseData.params[i * 3 + 1];
        const omega = baseData.params[i * 3 + 2];

        const curTheta = theta0 + omega * (p * 35 + simTime * 0.8);
        currentPositions[i * 3] = r * Math.cos(curTheta);
        currentPositions[i * 3 + 2] = r * Math.sin(curTheta);
      }

      posAttr.copyArray(currentPositions);
      posAttr.needsUpdate = true;
    }
  });

  return (
    <group>
      {/* 1. Boiling Convective T Tauri Young Sun + Volumetric Corona */}
      <mesh ref={sunMeshRef} geometry={unitSphere48} scale={8.5}>
        <shaderMaterial
          ref={sunMatRef}
          vertexShader={sunVert}
          fragmentShader={sunFrag}
          uniforms={sunUniforms}
        />
      </mesh>
      <sprite ref={sunCoronaRef} scale={[34, 34, 1]}>
        <spriteMaterial
          map={softParticleMap}
          color="#f59e0b"
          transparent
          opacity={0.68}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </sprite>
      <pointLight color="#fde047" intensity={18} distance={220} />

      {/* 2. Multi-Gap Protoplanetary Accretion Disk (ALMA HL Tauri) */}
      <mesh ref={diskMeshRef} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[165, 165, 1, 1]} />
        <shaderMaterial
          ref={diskMatRef}
          vertexShader={diskVert}
          fragmentShader={diskFrag}
          uniforms={diskUniforms}
          transparent
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* 3. 3,600 Keplerian Planetesimal & Silicate Dust Particles */}
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[currentPositions, 3]} />
          <bufferAttribute attach="attributes-aColor" args={[baseData.cols, 3]} />
          <bufferAttribute attach="attributes-aScale" args={[baseData.scales, 1]} />
        </bufferGeometry>
        <shaderMaterial
          ref={particleMatRef}
          vertexShader={partVert}
          fragmentShader={partFrag}
          uniforms={particleUniforms}
          transparent
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      {/* 4. Molten Hadean Proto-Earth with Procedural Basalt & Lava Fissures */}
      <group ref={protoEarthRef} position={[earthOrbitRadius, 0, 0]}>
        <mesh ref={earthGlobeRef} geometry={unitSphere48} scale={2.55}>
          <shaderMaterial
            ref={earthMatRef}
            vertexShader={earthHistoricalVert}
            fragmentShader={earthHistoricalFrag}
            uniforms={hadeanEarthUniforms}
          />
        </mesh>

        {/* Soft Volumetric Hill-Sphere Vapor & Accretion Glow */}
        <sprite ref={earthCoronaRef} scale={[11.5, 11.5, 1]}>
          <spriteMaterial
            map={softParticleMap}
            color="#f97316"
            transparent
            opacity={0.52}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </sprite>

        <pointLight ref={impactFlashRef} color="#ffedd5" intensity={0} distance={35} />
      </group>

      {/* 5. Circumstellar Gas Cloud */}
      <NebulaCloud color="#f59e0b" size={55} intensity={0.28} />
      <NebulaCloud color="#ea580c" size={75} intensity={0.22} />
    </group>
  );
};
