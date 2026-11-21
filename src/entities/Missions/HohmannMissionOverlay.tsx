import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CELESTIAL_BODIES } from '@/data/celestialData';
import { useAppStore } from '@/stores/useAppStore';
import { AssetManager } from '@/engine/assets/AssetManager';

export interface HohmannMissionOverlayProps {
  earthPosRef: React.RefObject<THREE.Vector3>;
}

const ARC_SEGMENTS = 144;

function buildTransferArcGeometry(r1: number, r2: number, segments = ARC_SEGMENTS): THREE.BufferGeometry {
  const a = 0.5 * (r1 + r2);
  const e = Math.abs(r2 - r1) / (r1 + r2);
  const positions = new Float32Array((segments + 1) * 3);
  const colors = new Float32Array((segments + 1) * 3);

  const startCol = new THREE.Color('#22d3ee');
  const midCol = new THREE.Color('#fbbf24');
  const endCol = new THREE.Color('#34d399');
  const tmp = new THREE.Color();

  for (let i = 0; i <= segments; i++) {
    const f = i / segments;
    const nu = f * Math.PI;
    const r = (a * (1 - e * e)) / (1 + e * Math.cos(nu));
    positions[i * 3] = r * Math.cos(nu);
    positions[i * 3 + 1] = Math.sin(nu) * (r2 > 20 ? 1.8 : 0.25);
    positions[i * 3 + 2] = r * Math.sin(nu);

    if (f < 0.5) {
      tmp.copy(startCol).lerp(midCol, f * 2);
    } else {
      tmp.copy(midCol).lerp(endCol, (f - 0.5) * 2);
    }
    colors[i * 3] = tmp.r;
    colors[i * 3 + 1] = tmp.g;
    colors[i * 3 + 2] = tmp.b;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geo;
}

export const HohmannMissionOverlay: React.FC<HohmannMissionOverlayProps> = ({ earthPosRef }) => {
  const destination = useAppStore((s) => s.missionDestination);
  const gravityAssist = useAppStore((s) => s.missionGravityAssist);
  const launching = useAppStore((s) => s.missionLaunching);

  const rootRef = useRef<THREE.Group>(null);
  const probeRef = useRef<THREE.Group>(null);
  const depHaloRef = useRef<THREE.Mesh>(null);
  const arrHaloRef = useRef<THREE.Mesh>(null);
  const progressRef = useRef(0);
  const prevLaunchingRef = useRef(false);

  const assets = useMemo(() => AssetManager.getInstance(), []);
  const kaptonGold = useMemo(() => assets.getKaptonFoilMap('gold'), [assets]);
  const solarMap = useMemo(() => assets.getSolarArrayMap(), [assets]);

  const isGeocentric = destination === 'moon';
  const r1 = isGeocentric ? CELESTIAL_BODIES.earth.visualRadius * 1.25 : CELESTIAL_BODIES.earth.visualDistance;
  const r2 = isGeocentric
    ? CELESTIAL_BODIES.moon.visualDistance
    : CELESTIAL_BODIES[destination]?.visualDistance ?? 86;

  const gpu = useMemo(() => {
    const arcGeo = buildTransferArcGeometry(r1, r2);
    const arcMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.94,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const arcLine = new THREE.Line(arcGeo, arcMat);

    const assistGeo = buildTransferArcGeometry(r1, r1 + (r2 - r1) * 0.54, 72);
    const assistMat = new THREE.LineBasicMaterial({
      color: '#f472b6',
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const assistLine = new THREE.Line(assistGeo, assistMat);

    const nodeGeo = new THREE.SphereGeometry(isGeocentric ? 0.22 : 1.15, 16, 12);
    const depNodeMat = new THREE.MeshBasicMaterial({ color: '#22d3ee' });
    const arrNodeMat = new THREE.MeshBasicMaterial({ color: '#34d399' });

    const haloGeo = new THREE.RingGeometry(isGeocentric ? 0.34 : 1.75, isGeocentric ? 0.48 : 2.55, 32);
    const depHaloMat = new THREE.MeshBasicMaterial({
      color: '#22d3ee',
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const arrHaloMat = new THREE.MeshBasicMaterial({
      color: '#34d399',
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    // Detailed Kapton + Solar-Array + Parabolic Dish Interplanetary Probe (U8)
    const busGeo = new THREE.CylinderGeometry(
      isGeocentric ? 0.16 : 0.85,
      isGeocentric ? 0.2 : 1.0,
      isGeocentric ? 0.46 : 2.4,
      8
    );
    const busMat = new THREE.MeshStandardMaterial({
      map: kaptonGold,
      metalness: 0.88,
      roughness: 0.24,
      emissive: '#78350f',
      emissiveIntensity: 0.32,
    });

    const wingGeo = new THREE.BoxGeometry(
      isGeocentric ? 1.15 : 5.8,
      isGeocentric ? 0.035 : 0.16,
      isGeocentric ? 0.28 : 1.35
    );
    const wingMat = new THREE.MeshStandardMaterial({
      map: solarMap,
      color: '#ffffff',
      metalness: 0.55,
      roughness: 0.2,
      emissive: '#0284c7',
      emissiveIntensity: 0.28,
    });

    const dishGeo = new THREE.SphereGeometry(isGeocentric ? 0.18 : 0.92, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.44);
    const dishMat = new THREE.MeshStandardMaterial({
      color: '#f8fafc',
      metalness: 0.42,
      roughness: 0.28,
      side: THREE.DoubleSide,
    });

    const plumeGeo = new THREE.ConeGeometry(isGeocentric ? 0.13 : 0.64, isGeocentric ? 0.62 : 2.9, 12);
    const plumeMat = new THREE.MeshBasicMaterial({
      color: '#38bdf8',
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    return {
      arcGeo,
      arcMat,
      arcLine,
      assistGeo,
      assistMat,
      assistLine,
      nodeGeo,
      depNodeMat,
      arrNodeMat,
      haloGeo,
      depHaloMat,
      arrHaloMat,
      busGeo,
      busMat,
      wingGeo,
      wingMat,
      dishGeo,
      dishMat,
      plumeGeo,
      plumeMat,
    };
  }, [r1, r2, isGeocentric, kaptonGold, solarMap]);

  useEffect(() => {
    return () => {
      gpu.arcGeo.dispose();
      gpu.arcMat.dispose();
      gpu.assistGeo.dispose();
      gpu.assistMat.dispose();
      gpu.nodeGeo.dispose();
      gpu.depNodeMat.dispose();
      gpu.arrNodeMat.dispose();
      gpu.haloGeo.dispose();
      gpu.depHaloMat.dispose();
      gpu.arrHaloMat.dispose();
      gpu.busGeo.dispose();
      gpu.busMat.dispose();
      gpu.wingGeo.dispose();
      gpu.wingMat.dispose();
      gpu.dishGeo.dispose();
      gpu.dishMat.dispose();
      gpu.plumeGeo.dispose();
      gpu.plumeMat.dispose();
    };
  }, [gpu]);

  const tangentScratch = useRef(new THREE.Vector3());

  useFrame((state, delta) => {
    const dt = Math.min(Math.max(delta, 0.001), 0.05);
    const earthPos = earthPosRef.current;

    if (rootRef.current) {
      if (isGeocentric && earthPos) {
        rootRef.current.position.copy(earthPos);
        rootRef.current.rotation.set(0, 0, 0);
      } else if (earthPos) {
        rootRef.current.position.set(0, 0, 0);
        const earthAngle = Math.atan2(earthPos.z, earthPos.x);
        rootRef.current.rotation.set(0, -earthAngle, 0);
      }
      rootRef.current.updateMatrixWorld();
    }

    const pulse = 1.0 + Math.sin(state.clock.elapsedTime * 3.2) * 0.16;
    if (depHaloRef.current) depHaloRef.current.scale.setScalar(pulse);
    if (arrHaloRef.current) arrHaloRef.current.scale.setScalar(pulse);

    if (launching && !prevLaunchingRef.current) {
      progressRef.current = 0;
    }
    prevLaunchingRef.current = launching;

    if (launching) {
      const speed = gravityAssist ? 0.16 : 0.13;
      progressRef.current += dt * speed;
      if (progressRef.current > 1.0) {
        progressRef.current = 1.0;
      }
    } else {
      progressRef.current = 0;
    }

    if (probeRef.current && rootRef.current) {
      const a = 0.5 * (r1 + r2);
      const e = Math.abs(r2 - r1) / (r1 + r2);
      const f = progressRef.current;
      const nu = f * Math.PI;
      const r = (a * (1 - e * e)) / (1 + e * Math.cos(nu));
      const x = r * Math.cos(nu);
      const y = Math.sin(nu) * (r2 > 20 ? 1.8 : 0.25);
      const z = r * Math.sin(nu);
      probeRef.current.position.set(x, y, z);

      // F3 + F7 fix: non-degenerate forward/backward chord tangent at aphelion (nu -> PI) + world-space lookAt
      const yAmp = r2 > 20 ? 1.8 : 0.25;
      if (nu > Math.PI - 0.04) {
        const nuPrev = Math.max(0, nu - 0.04);
        const rPrev = (a * (1 - e * e)) / (1 + e * Math.cos(nuPrev));
        const px = rPrev * Math.cos(nuPrev);
        const py = Math.sin(nuPrev) * yAmp;
        const pz = rPrev * Math.sin(nuPrev);
        tangentScratch.current.set(x + (x - px), y + (y - py), z + (z - pz));
      } else {
        const nu1 = nu + 0.04;
        const rNext = (a * (1 - e * e)) / (1 + e * Math.cos(nu1));
        tangentScratch.current.set(
          rNext * Math.cos(nu1),
          Math.sin(nu1) * yAmp,
          rNext * Math.sin(nu1)
        );
      }
      rootRef.current.localToWorld(tangentScratch.current);
      probeRef.current.lookAt(tangentScratch.current);
    }
  });

  const showAssistArc = gravityAssist && (destination === 'jupiter' || destination === 'saturn');

  return (
    <group ref={rootRef} name="hohmann-mission-overlay">
      <primitive object={gpu.arcLine} />
      {showAssistArc && <primitive object={gpu.assistLine} />}

      {/* Periapsis Departure Burn Node & Pulsing Halo */}
      <mesh position={[r1, 0, 0]} geometry={gpu.nodeGeo} material={gpu.depNodeMat} />
      <mesh
        ref={depHaloRef}
        position={[r1, 0, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        geometry={gpu.haloGeo}
        material={gpu.depHaloMat}
      />

      {/* Apoapsis Arrival Capture Burn Node & Pulsing Halo */}
      <mesh position={[-r2, 0, 0]} geometry={gpu.nodeGeo} material={gpu.arrNodeMat} />
      <mesh
        ref={arrHaloRef}
        position={[-r2, 0, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        geometry={gpu.haloGeo}
        material={gpu.arrHaloMat}
      />

      {/* 3D Autonomous Deep-Space Probe */}
      <group ref={probeRef}>
        <mesh rotation={[Math.PI / 2, 0, 0]} geometry={gpu.busGeo} material={gpu.busMat} />
        <mesh geometry={gpu.wingGeo} material={gpu.wingMat} />
        <mesh
          position={[0, 0, isGeocentric ? 0.34 : 1.7]}
          rotation={[-Math.PI / 2, 0, 0]}
          geometry={gpu.dishGeo}
          material={gpu.dishMat}
        />
        {launching && (
          <mesh
            position={[0, 0, isGeocentric ? -0.46 : -2.35]}
            rotation={[-Math.PI / 2, 0, 0]}
            geometry={gpu.plumeGeo}
            material={gpu.plumeMat}
          />
        )}
      </group>
    </group>
  );
};
