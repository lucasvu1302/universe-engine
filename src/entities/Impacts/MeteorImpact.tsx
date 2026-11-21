import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AssetManager } from '@/engine/assets/AssetManager';

interface MeteorImpactProps {
  active: boolean;
  targetPosition: [number, number, number];
  onComplete?: () => void;
}

export const MeteorImpact: React.FC<MeteorImpactProps> = ({
  active,
  targetPosition,
  onComplete,
}) => {
  const meteorGroupRef = useRef<THREE.Group>(null);
  const meteorCoreRef = useRef<THREE.Mesh>(null);
  const comaSpriteRef = useRef<THREE.Sprite>(null);
  const trailPointsRef = useRef<THREE.Points>(null);

  const impactSiteRef = useRef<THREE.Group>(null);
  const shockShellRef = useRef<THREE.Mesh>(null);
  const ejectaPointsRef = useRef<THREE.Points>(null);
  const magmaGlowRef = useRef<THREE.Sprite>(null);
  const impactLightRef = useRef<THREE.PointLight>(null);

  const phaseRef = useRef<'IDLE' | 'APPROACHING' | 'IMPACTED'>('IDLE');
  const progressRef = useRef(0);
  const completedRef = useRef(false);
  const targetPosRef = useRef<[number, number, number]>(targetPosition);

  const assets = useMemo(() => AssetManager.getInstance(), []);
  const softParticleMap = useMemo(() => assets.getSoftParticleMap(), [assets]);
  const asteroidBumpMap = useMemo(() => assets.getRegolithBumpMap('moon'), [assets]);
  const unitSphere32 = useMemo(() => assets.getUnitSphereGeometry(32), [assets]);

  // Ablative plasma wake particles trailing behind bolide
  const trailOffsets = useMemo(() => {
    const count = 180;
    const pos = new Float32Array(count * 3);
    const dir = new THREE.Vector3(45, 35, 45).normalize();
    for (let i = 0; i < count; i++) {
      const dist = (i / count) * 18.0;
      const spread = (i / count) * 2.2;
      pos[i * 3] = dir.x * dist + Math.sin(i * 12.7) * spread;
      pos[i * 3 + 1] = dir.y * dist + Math.cos(i * 9.3) * spread;
      pos[i * 3 + 2] = dir.z * dist + Math.sin(i * 7.1) * spread;
    }
    return pos;
  }, []);

  // Ballistic ejecta cloud particles at impact site
  const ejectaPositions = useMemo(() => {
    const count = 320;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = (i * 2.39996) % (Math.PI * 2);
      const phi = Math.acos(1.0 - ((i + 0.5) / count) * 2.0);
      const r = 0.65 + (i % 7) * 0.14;
      pos[i * 3] = Math.sin(phi) * Math.cos(theta) * r;
      pos[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * r;
      pos[i * 3 + 2] = Math.cos(phi) * r;
    }
    return pos;
  }, []);

  useEffect(() => {
    targetPosRef.current = targetPosition;
  }, [targetPosition]);

  useEffect(() => {
    if (active) {
      const [tx, ty, tz] = targetPosRef.current;
      phaseRef.current = 'APPROACHING';
      progressRef.current = 0;
      completedRef.current = false;
      if (meteorGroupRef.current) meteorGroupRef.current.visible = true;
      if (impactSiteRef.current) {
        impactSiteRef.current.visible = false;
        impactSiteRef.current.position.set(tx, ty, tz);
      }
      if (shockShellRef.current) shockShellRef.current.scale.setScalar(1.5);
      if (ejectaPointsRef.current) ejectaPointsRef.current.scale.setScalar(1.0);
    } else {
      phaseRef.current = 'IDLE';
      progressRef.current = 0;
      if (meteorGroupRef.current) meteorGroupRef.current.visible = false;
      if (impactSiteRef.current) impactSiteRef.current.visible = false;
      if (impactLightRef.current) impactLightRef.current.intensity = 0;
    }
  }, [active]);

  useEffect(() => {
    const core = meteorCoreRef.current;
    const coma = comaSpriteRef.current;
    const trail = trailPointsRef.current;
    const shock = shockShellRef.current;
    const ejecta = ejectaPointsRef.current;
    const magma = magmaGlowRef.current;
    return () => {
      core?.geometry?.dispose();
      (core?.material as THREE.Material | undefined)?.dispose();
      coma?.material?.dispose();
      trail?.geometry?.dispose();
      (trail?.material as THREE.Material | undefined)?.dispose();
      (shock?.material as THREE.Material | undefined)?.dispose();
      ejecta?.geometry?.dispose();
      (ejecta?.material as THREE.Material | undefined)?.dispose();
      magma?.material?.dispose();
    };
  }, []);

  useFrame((_, delta) => {
    if (!active || phaseRef.current === 'IDLE') {
      if (impactLightRef.current && impactLightRef.current.intensity !== 0) {
        impactLightRef.current.intensity = 0;
      }
      return;
    }

    const [tx, ty, tz] = targetPosRef.current;

    if (phaseRef.current === 'APPROACHING') {
      progressRef.current += delta * 0.95;

      const p = Math.min(1.0, progressRef.current);
      const curX = THREE.MathUtils.lerp(tx + 45, tx, p);
      const curY = THREE.MathUtils.lerp(ty + 35, ty, p);
      const curZ = THREE.MathUtils.lerp(tz + 45, tz, p);

      if (meteorGroupRef.current) {
        meteorGroupRef.current.visible = true;
        meteorGroupRef.current.position.set(curX, curY, curZ);
      }
      if (meteorCoreRef.current) {
        meteorCoreRef.current.rotation.x += delta * 2.8;
        meteorCoreRef.current.rotation.y += delta * 3.4;
      }
      if (impactLightRef.current) {
        impactLightRef.current.position.set(curX, curY, curZ);
        impactLightRef.current.color.set('#ff8800');
        impactLightRef.current.intensity = 7.5;
        impactLightRef.current.distance = 65;
      }

      if (p >= 1.0) {
        phaseRef.current = 'IMPACTED';
        progressRef.current = 0;
        if (meteorGroupRef.current) meteorGroupRef.current.visible = false;
        if (impactSiteRef.current) {
          impactSiteRef.current.visible = true;
          impactSiteRef.current.position.set(tx, ty, tz);
        }
      }
    } else if (phaseRef.current === 'IMPACTED') {
      progressRef.current += delta;
      const t = progressRef.current;

      // 1. 3D Spherical Vapor-Plume Shockwave Envelope (no flat XZ ring slicing planet!)
      if (shockShellRef.current) {
        const scale = 2.0 + t * 18.0;
        shockShellRef.current.scale.setScalar(scale);
        const mat = shockShellRef.current.material as THREE.MeshBasicMaterial;
        mat.opacity = Math.max(0.0, 0.78 - t * 0.32);
      }

      // 2. Expanding Incandescent Ejecta Curtain
      if (ejectaPointsRef.current) {
        const ejScale = 1.5 + Math.pow(t, 0.72) * 16.5;
        ejectaPointsRef.current.scale.setScalar(ejScale);
        const ejMat = ejectaPointsRef.current.material as THREE.PointsMaterial;
        ejMat.opacity = Math.max(0.0, 0.92 - t * 0.22);
      }

      // 3. Cooling Molten Impact Fireball Sprite
      if (magmaGlowRef.current) {
        const glowScale = 12.0 + t * 4.5;
        magmaGlowRef.current.scale.set(glowScale, glowScale, 1);
        magmaGlowRef.current.material.opacity = Math.max(0.0, 0.95 - t * 0.21);
      }

      // 4. Persistent Impact Flash Light decaying to 0 (INV3)
      if (impactLightRef.current) {
        impactLightRef.current.position.set(tx, ty, tz);
        impactLightRef.current.color.set('#fed7aa');
        impactLightRef.current.intensity = Math.max(0.0, 16.0 - t * 3.6);
        impactLightRef.current.distance = 90;
      }

      if (t > 4.5 && !completedRef.current) {
        completedRef.current = true;
        phaseRef.current = 'IDLE';
        if (impactSiteRef.current) impactSiteRef.current.visible = false;
        if (impactLightRef.current) impactLightRef.current.intensity = 0;
        onComplete?.();
      }
    }
  });

  return (
    <group>
      {/* 1. Pitted Incandescent Bolide Core + Volumetric Coma + Soft Spark Wake */}
      <group ref={meteorGroupRef} visible={false}>
        <mesh ref={meteorCoreRef} scale={[1.25, 0.92, 1.1]}>
          <icosahedronGeometry args={[1.45, 2]} />
          <meshStandardMaterial
            color="#451a03"
            emissive="#f97316"
            emissiveIntensity={2.8}
            bumpMap={asteroidBumpMap}
            bumpScale={0.14}
            roughness={0.85}
          />
        </mesh>

        <sprite ref={comaSpriteRef} scale={[7.5, 7.5, 1]}>
          <spriteMaterial
            map={softParticleMap}
            color="#fb923c"
            transparent
            opacity={0.85}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </sprite>

        <points ref={trailPointsRef}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[trailOffsets, 3]} />
          </bufferGeometry>
          <pointsMaterial
            map={softParticleMap}
            size={1.6}
            color="#fdba74"
            transparent
            opacity={0.78}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </points>
      </group>

      {/* 2. 3D Planetary Kinetic Impact Fireball & Ejecta Curtain */}
      <group ref={impactSiteRef} position={targetPosition} visible={false}>
        <sprite ref={magmaGlowRef} scale={[12, 12, 1]}>
          <spriteMaterial
            map={softParticleMap}
            color="#ea580c"
            transparent
            opacity={0.92}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </sprite>

        <mesh ref={shockShellRef} geometry={unitSphere32} scale={2.0}>
          <meshBasicMaterial
            color="#fbbf24"
            transparent
            opacity={0.75}
            side={THREE.BackSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>

        <points ref={ejectaPointsRef}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[ejectaPositions, 3]} />
          </bufferGeometry>
          <pointsMaterial
            map={softParticleMap}
            size={1.45}
            color="#fb923c"
            transparent
            opacity={0.9}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </points>
      </group>

      {/* Single persistent dynamic light modulated via intensity (INV3) */}
      <pointLight ref={impactLightRef} color="#ff8800" intensity={0} distance={90} />
    </group>
  );
};
