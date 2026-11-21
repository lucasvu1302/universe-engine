import React, { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { LaunchController } from "./LaunchController";
import { SimulationManager } from "../core/SimulationManager";
import smokeVert from "@/shaders/launch/launchSmoke.vert.glsl";
import smokeFrag from "@/shaders/launch/launchSmoke.frag.glsl";

interface LaunchSmokeVolumetricsProps {
  timeSeconds?: number;
  rocketPosition?: THREE.Vector3;
}

interface SmokePuffData {
  basePos: [number, number, number];
  velocity: [number, number, number];
  buoyancyLift: number;
  baseScale: number;
  maxScale: number;
  rotationSpeed: number;
  initialRotY: number;
  seed: [number, number, number];
  followWakeFactor: number;
}

function pseudoRand(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
}

export const LaunchSmokeVolumetrics: React.FC<LaunchSmokeVolumetricsProps> = () => {
  const instancedMeshRef = useRef<THREE.InstancedMesh>(null);
  const shaderMatRef = useRef<THREE.ShaderMaterial>(null);

  const sunDir = useMemo(() => new THREE.Vector3(0.52, 0.62, 0.58).normalize(), []);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const puffSphereGeo = useMemo(() => new THREE.PlaneGeometry(2.0, 2.0, 1, 1), []);

  // 112 turbulent multi-scale billboard steam & smoke clouds batched into 1 GPU InstancedMesh (224 triangles total!)
  const puffsData: SmokePuffData[] = useMemo(() => {
    const list: SmokePuffData[] = [];
    let idx = 1;
    const r = () => pseudoRand(idx++);

    // 1. Dense Pad & Flame-Trench Core Boil right around rocket base (28 puffs)
    for (let i = 0; i < 28; i++) {
      const angle = (i / 28) * Math.PI * 2 + (r() - 0.5) * 0.22;
      const rad = 1.5 + r() * 6.5;
      list.push({
        basePos: [Math.cos(angle) * rad, -12.2 + r() * 2.8, Math.sin(angle) * (rad * 0.8)],
        velocity: [Math.cos(angle) * (3.5 + r() * 4.5), 2.5 + r() * 3.5, Math.sin(angle) * (3.5 + r() * 4.5)],
        buoyancyLift: 3.5 + r() * 4.5,
        baseScale: 3.8 + r() * 2.4,
        maxScale: 9.5 + r() * 5.0,
        rotationSpeed: (r() - 0.5) * 0.45,
        initialRotY: r() * Math.PI * 2,
        seed: [r(), 0.7 + r() * 0.3, 0.6 + r() * 0.35],
        followWakeFactor: 0.0
      });
    }

    // 2. East & West supersonic flame-deflector water-deluge steam flumes (56 puffs: 28 per side)
    for (const dirSign of [1, -1]) {
      for (let i = 0; i < 28; i++) {
        const u = i / 27;
        const spreadZ = (r() - 0.5) * (4.0 + u * 16.0);
        list.push({
          basePos: [
            dirSign * (3.0 + u * 18.0),
            -12.0 + u * 2.8 + r() * 1.8,
            spreadZ * 0.45
          ],
          velocity: [
            dirSign * (13.0 + u * 17.0 + r() * 6.0),
            2.4 + u * 6.5 + r() * 3.2,
            spreadZ * 1.15
          ],
          buoyancyLift: 5.0 + u * 9.5 + r() * 3.5,
          baseScale: 3.6 + u * 2.8 + r() * 1.6,
          maxScale: 10.5 + u * 11.5 + r() * 4.5,
          rotationSpeed: (r() - 0.5) * 0.35,
          initialRotY: r() * Math.PI * 2,
          seed: [r(), 0.55 + r() * 0.45, (1.0 - u) * 0.35],
          followWakeFactor: 0.0
        });
      }
    }

    // 3. Ascending rocket exhaust wake column trailing beneath Merlin cluster (28 puffs)
    for (let i = 0; i < 28; i++) {
      const u = i / 27;
      const angle = i * 2.39996 + r() * 0.3;
      const rad = (1.0 + (1.0 - u) * 4.8) * (0.65 + r() * 0.5);
      list.push({
        basePos: [Math.cos(angle) * rad, -12.0 + u * 3.0, Math.sin(angle) * rad],
        velocity: [Math.cos(angle) * (2.5 + (1.0 - u) * 4.5), 2.0 + r() * 2.8, Math.sin(angle) * (2.5 + (1.0 - u) * 4.5)],
        buoyancyLift: 2.5 + r() * 3.0,
        baseScale: 3.2 + (1.0 - u) * 2.0,
        maxScale: 7.5 + (1.0 - u) * 6.5,
        rotationSpeed: (r() - 0.5) * 0.5,
        initialRotY: r() * Math.PI * 2,
        seed: [r(), 0.6 + r() * 0.4, 0.3 + u * 0.5],
        followWakeFactor: 0.1 + u * 0.78
      });
    }

    return list;
  }, []);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0.0 },
      uFireGlow: { value: 0.0 },
      uEnginePos: { value: new THREE.Vector3(0, -11.5, 0) },
      uSmokeDensity: { value: 0.0 },
      uSunDir: { value: sunDir }
    }),
    [sunDir]
  );

  useLayoutEffect(() => {
    const mesh = instancedMeshRef.current;
    if (!mesh) return;
    const c = new THREE.Color();
    for (let i = 0; i < puffsData.length; i++) {
      const [sr, sg, sb] = puffsData[i].seed;
      c.setRGB(sr, sg, sb);
      mesh.setColorAt(i, c);
    }
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }
  }, [puffsData]);

  useEffect(() => {
    const mat = shaderMatRef.current;
    return () => {
      puffSphereGeo.dispose();
      mat?.dispose();
    };
  }, [puffSphereGeo]);

  useFrame((_, delta) => {
    const mesh = instancedMeshRef.current;
    const mat = shaderMatRef.current;
    if (!mesh || !mat) return;

    const traj = LaunchController.getInstance().getTrajectoryState();
    const timeSeconds = traj.timeSeconds;

    let density = 0.0;
    let fireGlow = 0.0;

    if (timeSeconds >= 6.5 && timeSeconds < 10.0) {
      const t = (timeSeconds - 6.5) / 3.5;
      density = THREE.MathUtils.smoothstep(t, 0.0, 1.0) * 0.92;
      fireGlow = Math.pow(t, 1.4) * 1.15;
    } else if (timeSeconds >= 10.0 && timeSeconds < 25.0) {
      density = 0.95;
      fireGlow = 1.05 + Math.sin(timeSeconds * 19.0) * 0.18;
    } else if (timeSeconds >= 25.0 && timeSeconds < 46.0) {
      const t = (46.0 - timeSeconds) / 21.0;
      density = t * t * 0.9;
      fireGlow = Math.max(0.0, (31.0 - timeSeconds) / 6.0);
    }

    const active = density > 0.005;
    mesh.visible = active;
    mat.uniforms.uSmokeDensity.value = density;
    mat.uniforms.uFireGlow.value = fireGlow;

    if (!active) return;

    const dt = Math.min(Math.max(delta, 0), 0.05);
    if (SimulationManager.getInstance().getTimelineEngine().getIsPlaying()) {
      mat.uniforms.uTime.value += dt;
    }
    const nozzleY = traj.position.y - 11.6;
    mat.uniforms.uEnginePos.value.set(
      traj.position.x,
      Math.min(nozzleY, 28.0),
      traj.position.z
    );

    const elapsedSinceIgnition = Math.max(0.0, timeSeconds - 6.5);
    const expansionFactor = Math.min(1.0, elapsedSinceIgnition / 11.0);
    const progress = Math.min(1.0, elapsedSinceIgnition / 19.0);
    const rotTime = mat.uniforms.uTime.value;
    const wakeClimbY = Math.min(Math.max(0.0, traj.position.y), 48.0);

    for (let i = 0; i < puffsData.length; i++) {
      const puff = puffsData[i];
      const wakeY = wakeClimbY * puff.followWakeFactor;
      const px = puff.basePos[0] + puff.velocity[0] * (progress * 1.45);
      const py =
        puff.basePos[1] +
        wakeY +
        puff.velocity[1] * Math.pow(progress, 0.85) +
        puff.buoyancyLift * progress * progress;
      const pz = puff.basePos[2] + puff.velocity[2] * (progress * 1.45);

      dummy.position.set(px, py, pz);

      const curScale = THREE.MathUtils.lerp(
        puff.baseScale,
        puff.maxScale,
        Math.pow(expansionFactor, 0.68)
      );
      // Flatten puffs slightly near the pad apron and stretch vertically in buoyant plumes
      dummy.scale.set(curScale * 1.12, curScale * 0.86, curScale * 1.08);
      dummy.rotation.set(
        rotTime * puff.rotationSpeed * 0.4,
        puff.initialRotY + rotTime * puff.rotationSpeed,
        rotTime * puff.rotationSpeed * 0.55
      );
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={instancedMeshRef}
      args={[puffSphereGeo, undefined, puffsData.length]}
      visible={false}
      frustumCulled={false}
      raycast={() => null}
    >
      <shaderMaterial
        ref={shaderMatRef}
        vertexShader={smokeVert}
        fragmentShader={smokeFrag}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.NormalBlending}
        side={THREE.FrontSide}
      />
    </instancedMesh>
  );
};
