import React, { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { AssetManager } from "@/engine/assets/AssetManager";
import partVert from "@/shaders/cosmic/cosmicParticle.vert.glsl";
import partFrag from "@/shaders/cosmic/cosmicParticle.frag.glsl";
import { SimulationManager } from "../core/SimulationManager";
import { CosmicEventManager } from "./CosmicEventManager";
import { NebulaCloud } from "../effects/NebulaCloud";

interface GalaxyCollisionVisualProps {
  progress?: number; // 0 to 1
}

export const GalaxyCollisionVisual: React.FC<GalaxyCollisionVisualProps> = ({ progress = 0 }) => {
  const pointsRefA = useRef<THREE.Points>(null);
  const pointsRefB = useRef<THREE.Points>(null);
  const starburstPointsRef = useRef<THREE.Points>(null);

  const matRefA = useRef<THREE.ShaderMaterial>(null);
  const matRefB = useRef<THREE.ShaderMaterial>(null);
  const starburstMatRef = useRef<THREE.ShaderMaterial>(null);

  const coreGroupARef = useRef<THREE.Group>(null);
  const coreGroupBRef = useRef<THREE.Group>(null);
  const simElapsedRef = useRef<number>(0);

  const countPerGalaxy = 3200;
  const starburstCount = 600;
  const softParticleMap = useMemo(() => AssetManager.getInstance().getSoftParticleMap(), []);

  // 1. Milky Way Spiral Galaxy (2-arm barred spiral with warm golden bulge & sapphire arms)
  const galaxyAData = useMemo(() => {
    const pos = new Float32Array(countPerGalaxy * 3);
    const cols = new Float32Array(countPerGalaxy * 3);
    const scales = new Float32Array(countPerGalaxy);
    const orbitalParams = new Float32Array(countPerGalaxy * 4);

    const colorBulge = new THREE.Color("#fde68a");
    const colorArm = new THREE.Color("#60a5fa");
    const colorWhite = new THREE.Color("#ffffff");
    const tempCol = new THREE.Color();

    for (let i = 0; i < countPerGalaxy; i++) {
      const isBulge = Math.random() < 0.28;
      let r = 0;
      let theta = 0;
      let y = 0;

      if (isBulge) {
        r = Math.pow(Math.random(), 2.2) * 12;
        theta = Math.random() * Math.PI * 2;
        y = (Math.random() - 0.5) * 6 * (1.0 - r / 12);
        tempCol.copy(colorBulge).lerp(colorWhite, Math.random() * 0.4);
      } else {
        const arm = Math.random() < 0.5 ? 0 : Math.PI;
        r = 10 + Math.pow(Math.random(), 1.3) * 42;
        theta = arm + Math.log(r / 8) * 1.8 + (Math.random() - 0.5) * 0.45;
        y = (Math.random() - 0.5) * 3.5;
        tempCol.copy(colorArm).lerp(colorWhite, Math.random() * 0.5);
      }

      pos[i * 3] = r * Math.cos(theta);
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = r * Math.sin(theta);

      cols[i * 3] = tempCol.r;
      cols[i * 3 + 1] = tempCol.g;
      cols[i * 3 + 2] = tempCol.b;

      scales[i] = 0.8 + Math.random() * 1.8;

      orbitalParams[i * 4] = r;
      orbitalParams[i * 4 + 1] = theta;
      orbitalParams[i * 4 + 2] = 1.4 / Math.sqrt(Math.max(r, 4));
      orbitalParams[i * 4 + 3] = isBulge ? 1 : 0;
    }

    return { pos, cols, scales, orbitalParams };
  }, []);

  // 2. Andromeda M31 Spiral Galaxy (larger inclined disk with lilac-gold bulge & cyan/violet arms)
  const galaxyBData = useMemo(() => {
    const pos = new Float32Array(countPerGalaxy * 3);
    const cols = new Float32Array(countPerGalaxy * 3);
    const scales = new Float32Array(countPerGalaxy);
    const orbitalParams = new Float32Array(countPerGalaxy * 4);

    const colorBulge = new THREE.Color("#e9d5ff");
    const colorArm = new THREE.Color("#38bdf8");
    const colorViolet = new THREE.Color("#a855f7");
    const tempCol = new THREE.Color();

    for (let i = 0; i < countPerGalaxy; i++) {
      const isBulge = Math.random() < 0.25;
      let r = 0;
      let theta = 0;
      let y = 0;

      if (isBulge) {
        r = Math.pow(Math.random(), 2.0) * 14;
        theta = Math.random() * Math.PI * 2;
        y = (Math.random() - 0.5) * 7 * (1.0 - r / 14);
        tempCol.copy(colorBulge).lerp(colorArm, 0.3);
      } else {
        const arm = Math.floor(Math.random() * 2) * Math.PI;
        r = 12 + Math.pow(Math.random(), 1.25) * 46;
        theta = arm + Math.log(r / 9) * 2.1 + (Math.random() - 0.5) * 0.5;
        y = (Math.random() - 0.5) * 4.0;
        tempCol.copy(colorArm).lerp(colorViolet, Math.random() * 0.6);
      }

      pos[i * 3] = r * Math.cos(theta);
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = r * Math.sin(theta);

      cols[i * 3] = tempCol.r;
      cols[i * 3 + 1] = tempCol.g;
      cols[i * 3 + 2] = tempCol.b;

      scales[i] = 0.8 + Math.random() * 1.8;

      orbitalParams[i * 4] = r;
      orbitalParams[i * 4 + 1] = theta;
      orbitalParams[i * 4 + 2] = 1.3 / Math.sqrt(Math.max(r, 4));
      orbitalParams[i * 4 + 3] = isBulge ? 1 : 0;
    }

    return { pos, cols, scales, orbitalParams };
  }, []);

  // 3. Shock-Induced H-alpha Starburst Nurseries
  const starburstData = useMemo(() => {
    const pos = new Float32Array(starburstCount * 3);
    const cols = new Float32Array(starburstCount * 3);
    const scales = new Float32Array(starburstCount);

    const pinkColor = new THREE.Color("#f43f5e");
    const cyanColor = new THREE.Color("#06b6d4");
    const tempCol = new THREE.Color();

    for (let i = 0; i < starburstCount; i++) {
      tempCol.copy(pinkColor).lerp(cyanColor, Math.random() * 0.4);
      cols[i * 3] = tempCol.r;
      cols[i * 3 + 1] = tempCol.g;
      cols[i * 3 + 2] = tempCol.b;
      scales[i] = 2.2 + Math.random() * 3.5;
    }

    return { pos, cols, scales };
  }, []);

  const currentPosA = useMemo(() => new Float32Array(galaxyAData.pos), [galaxyAData.pos]);
  const currentPosB = useMemo(() => new Float32Array(galaxyBData.pos), [galaxyBData.pos]);
  const currentStarburstPos = useMemo(() => new Float32Array(starburstData.pos), [starburstData.pos]);

  const scratchPosA = useMemo(() => new THREE.Vector3(), []);
  const scratchPosB = useMemo(() => new THREE.Vector3(), []);
  const scratchVecAB = useMemo(() => new THREE.Vector3(), []);
  const scratchMidPoint = useMemo(() => new THREE.Vector3(), []);

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

  const writeGalaxyCenters = (t: number, outA: THREE.Vector3, outB: THREE.Vector3) => {
    outA.set(
      -48 * (1.0 - t * 0.95) + Math.sin(t * Math.PI * 1.8) * 12,
      Math.sin(t * Math.PI * 2.2) * 8,
      -18 * (1.0 - t) + Math.cos(t * Math.PI * 1.8) * 10
    );
    outB.set(
      48 * (1.0 - t * 0.95) - Math.sin(t * Math.PI * 1.8) * 12,
      -Math.sin(t * Math.PI * 2.2) * 8,
      18 * (1.0 - t) - Math.cos(t * Math.PI * 1.8) * 10
    );
  };

  const uniformsA = useMemo(
    () => ({
      uSize: { value: 2.2 },
      uScale: { value: 1.0 },
      uOpacity: { value: 0.95 },
      uTime: { value: 0.0 },
    }),
    []
  );

  const uniformsB = useMemo(
    () => ({
      uSize: { value: 2.2 },
      uScale: { value: 1.0 },
      uOpacity: { value: 0.95 },
      uTime: { value: 0.0 },
    }),
    []
  );

  const starburstUniforms = useMemo(
    () => ({
      uSize: { value: 4.5 },
      uScale: { value: 1.0 },
      uOpacity: { value: 0.9 },
      uTime: { value: 0.0 },
    }),
    []
  );

  useEffect(() => {
    const ptsA = pointsRefA.current;
    const ptsB = pointsRefB.current;
    const ptsS = starburstPointsRef.current;
    const mA = matRefA.current;
    const mB = matRefB.current;
    const mS = starburstMatRef.current;
    const gA = coreGroupARef.current;
    const gB = coreGroupBRef.current;
    return () => {
      ptsA?.geometry?.dispose();
      ptsB?.geometry?.dispose();
      ptsS?.geometry?.dispose();
      mA?.dispose();
      mB?.dispose();
      mS?.dispose();
      [gA, gB].forEach((grp) =>
        grp?.traverse((obj) => {
          const sp = obj as THREE.Sprite;
          if (sp.isSprite) sp.material?.dispose();
        })
      );
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

    writeGalaxyCenters(p, scratchPosA, scratchPosB);
    const posA = scratchPosA;
    const posB = scratchPosB;

    if (coreGroupARef.current) coreGroupARef.current.position.copy(posA);
    if (coreGroupBRef.current) coreGroupBRef.current.position.copy(posB);

    const distAB = posA.distanceTo(posB);
    const tidalStrength = Math.min(1.0, Math.pow(Math.max(0.1, 45 / (distAB + 5)), 2.0));
    const vecAB = scratchVecAB.subVectors(posB, posA).normalize();

    if (pointsRefA.current) {
      const geom = pointsRefA.current.geometry;
      const posAttr = geom.attributes.position as THREE.BufferAttribute;

      for (let i = 0; i < countPerGalaxy; i++) {
        const r = galaxyAData.orbitalParams[i * 4];
        const theta0 = galaxyAData.orbitalParams[i * 4 + 1];
        const speed = galaxyAData.orbitalParams[i * 4 + 2];
        const isBulge = galaxyAData.orbitalParams[i * 4 + 3];

        const curTheta = theta0 + speed * (p * 45 + simTime * 0.45);
        const lx = r * Math.cos(curTheta);
        const ly = galaxyAData.pos[i * 3 + 1];
        const lz = r * Math.sin(curTheta);

        const tidalFactor = isBulge ? 0 : (r / 42) * tidalStrength;
        const bridgeX = vecAB.x * tidalFactor * 16 * Math.sin(curTheta);
        const bridgeY = vecAB.y * tidalFactor * 10;
        const bridgeZ = vecAB.z * tidalFactor * 16 * Math.sin(curTheta);

        currentPosA[i * 3] = posA.x + lx + bridgeX;
        currentPosA[i * 3 + 1] = posA.y + ly + bridgeY;
        currentPosA[i * 3 + 2] = posA.z + lz + bridgeZ;
      }
      posAttr.copyArray(currentPosA);
      posAttr.needsUpdate = true;
    }

    if (pointsRefB.current) {
      const geom = pointsRefB.current.geometry;
      const posAttr = geom.attributes.position as THREE.BufferAttribute;

      const incAngle = THREE.MathUtils.degToRad(35);
      const cosInc = Math.cos(incAngle);
      const sinInc = Math.sin(incAngle);

      for (let i = 0; i < countPerGalaxy; i++) {
        const r = galaxyBData.orbitalParams[i * 4];
        const theta0 = galaxyBData.orbitalParams[i * 4 + 1];
        const speed = galaxyBData.orbitalParams[i * 4 + 2];
        const isBulge = galaxyBData.orbitalParams[i * 4 + 3];

        const curTheta = theta0 + speed * (p * 42 + simTime * 0.45);
        const bx = r * Math.cos(curTheta);
        const byRaw = galaxyBData.pos[i * 3 + 1];
        const bzRaw = r * Math.sin(curTheta);

        const by = byRaw * cosInc - bzRaw * sinInc;
        const bz = byRaw * sinInc + bzRaw * cosInc;

        const tidalFactor = isBulge ? 0 : (r / 46) * tidalStrength;
        const bridgeX = -vecAB.x * tidalFactor * 18 * Math.sin(curTheta);
        const bridgeY = -vecAB.y * tidalFactor * 12;
        const bridgeZ = -vecAB.z * tidalFactor * 18 * Math.sin(curTheta);

        currentPosB[i * 3] = posB.x + bx + bridgeX;
        currentPosB[i * 3 + 1] = posB.y + by + bridgeY;
        currentPosB[i * 3 + 2] = posB.z + bz + bridgeZ;
      }
      posAttr.copyArray(currentPosB);
      posAttr.needsUpdate = true;
    }

    if (starburstPointsRef.current) {
      const geom = starburstPointsRef.current.geometry;
      const posAttr = geom.attributes.position as THREE.BufferAttribute;
      const midPoint = scratchMidPoint.addVectors(posA, posB).multiplyScalar(0.5);
      const collisionIntensity = Math.max(0, 1.0 - distAB / 50);

      for (let i = 0; i < starburstCount; i++) {
        const angle = i * 0.12 + p * 10;
        const spread = Math.sin(i * 99) * 14 * collisionIntensity;
        const height = Math.cos(i * 77) * 8 * collisionIntensity;

        currentStarburstPos[i * 3] = midPoint.x + Math.cos(angle) * spread;
        currentStarburstPos[i * 3 + 1] = midPoint.y + height;
        currentStarburstPos[i * 3 + 2] = midPoint.z + Math.sin(angle) * spread;
      }
      posAttr.copyArray(currentStarburstPos);
      posAttr.needsUpdate = true;

      if (starburstMatRef.current) {
        starburstMatRef.current.uniforms.uOpacity.value = collisionIntensity * 0.85;
      }
    }

    if (matRefA.current) matRefA.current.uniforms.uTime.value += delta;
    if (matRefB.current) matRefB.current.uniforms.uTime.value += delta;
  });

  return (
    <group>
      {/* 1. Galaxy A (Milky Way) Star Field & Volumetric Sersic Core Bulge */}
      <points ref={pointsRefA}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[currentPosA, 3]} />
          <bufferAttribute attach="attributes-aColor" args={[galaxyAData.cols, 3]} />
          <bufferAttribute attach="attributes-aScale" args={[galaxyAData.scales, 1]} />
        </bufferGeometry>
        <shaderMaterial
          ref={matRefA}
          vertexShader={partVert}
          fragmentShader={partFrag}
          uniforms={uniformsA}
          transparent
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      <group ref={coreGroupARef} position={[-48, 0, -8]}>
        <sprite scale={[9.5, 9.5, 1]}>
          <spriteMaterial
            map={softParticleMap}
            color="#fffbeb"
            transparent
            opacity={0.95}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </sprite>
        <sprite scale={[28, 22, 1]}>
          <spriteMaterial
            map={softParticleMap}
            color="#f59e0b"
            transparent
            opacity={0.62}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </sprite>
        <pointLight color="#fde68a" intensity={15} distance={160} />
      </group>

      {/* 2. Galaxy B (Andromeda M31) Star Field & Volumetric Sersic Core Bulge */}
      <points ref={pointsRefB}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[currentPosB, 3]} />
          <bufferAttribute attach="attributes-aColor" args={[galaxyBData.cols, 3]} />
          <bufferAttribute attach="attributes-aScale" args={[galaxyBData.scales, 1]} />
        </bufferGeometry>
        <shaderMaterial
          ref={matRefB}
          vertexShader={partVert}
          fragmentShader={partFrag}
          uniforms={uniformsB}
          transparent
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      <group ref={coreGroupBRef} position={[48, 0, 8]}>
        <sprite scale={[11.0, 11.0, 1]}>
          <spriteMaterial
            map={softParticleMap}
            color="#f8fafc"
            transparent
            opacity={0.95}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </sprite>
        <sprite scale={[32, 24, 1]}>
          <spriteMaterial
            map={softParticleMap}
            color="#38bdf8"
            transparent
            opacity={0.62}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </sprite>
        <pointLight color="#38bdf8" intensity={16} distance={180} />
      </group>

      {/* 3. Shock-Induced H II Starburst Nurseries */}
      <points ref={starburstPointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[currentStarburstPos, 3]} />
          <bufferAttribute attach="attributes-aColor" args={[starburstData.cols, 3]} />
          <bufferAttribute attach="attributes-aScale" args={[starburstData.scales, 1]} />
        </bufferGeometry>
        <shaderMaterial
          ref={starburstMatRef}
          vertexShader={partVert}
          fragmentShader={partFrag}
          uniforms={starburstUniforms}
          transparent
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      {/* 4. Intergalactic Gas Nebulae */}
      <NebulaCloud color="#7c3aed" size={55} intensity={0.38} />
      <NebulaCloud color="#0ea5e9" size={45} intensity={0.32} />
    </group>
  );
};
