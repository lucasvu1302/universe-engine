import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '@/stores/useAppStore';
import { evaluateRelativity } from '@/simulation/cosmic/Wave2Physics';
import { AssetManager } from '@/engine/assets/AssetManager';
import einsteinLensFrag from '@/shaders/cosmic/einsteinLens.frag.glsl';

const STAR_COUNT = 1600;

const LENS_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const RelativityLabScene: React.FC = () => {
  const activeLab = useAppStore((s) => s.activeCosmicLab);
  const relativityTab = useAppStore((s) => s.relativityTab);
  const velocityC = useAppStore((s) => s.relativityVelocityC);
  const radiusRs = useAppStore((s) => s.relativityRadiusRs);
  const lensOffset = useAppStore((s) => s.relativityLensOffset);
  const diveProgress = useAppStore((s) => s.relativityDiveProgress);
  const isTabHidden = useAppStore((s) => s.isTabHidden);
  const reducedMotion = useAppStore((s) => s.reducedMotion);

  const lensMeshRef = useRef<THREE.Mesh>(null);
  const starsRef = useRef<THREE.Points>(null);
  const lastVelRef = useRef<number>(-1);
  const lastRadiusRef = useRef<number>(-1);
  const lastOffsetRef = useRef<number>(-999);
  const cachedVelRef = useRef<number>(0.85);

  const resources = useMemo(() => {
    const softMap = AssetManager.getInstance().getSoftParticleMap();

    const lensGeo = new THREE.PlaneGeometry(25.5, 14.8, 1, 1);
    const lensMat = new THREE.ShaderMaterial({
      vertexShader: LENS_VERT,
      fragmentShader: einsteinLensFrag,
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uMode: { value: 0 },
        uEinsteinRadius: { value: 0.34 },
        uLensOffset: { value: 0.14 },
        uVelocityC: { value: 0.85 },
        uDiveProgress: { value: 0 },
      },
    });

    // Subtle deep-space dust veil framing the lensing portal (for clean 4+ resource disposal & atmospheric depth)
    const dustGeo = new THREE.RingGeometry(5.6, 11.2, 64);
    const dustMat = new THREE.MeshBasicMaterial({
      color: '#1e1b4b',
      transparent: true,
      opacity: 0.08,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const backGlowGeo = new THREE.CircleGeometry(4.2, 48);
    const backGlowMat = new THREE.MeshBasicMaterial({
      color: '#312e81',
      transparent: true,
      opacity: 0.06,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    // 3D relativistic aberration starfield strictly behind the lensing plane (zero stray stars inside Kerr shadow)
    const starPos = new Float32Array(STAR_COUNT * 3);
    const starCol = new Float32Array(STAR_COUNT * 3);
    const c = new THREE.Color();
    for (let i = 0; i < STAR_COUNT; i++) {
      const u = ((i * 7919) % 10000) / 10000;
      const v = ((i * 3571) % 10000) / 10000;
      const theta = u * Math.PI * 2;
      const phi = Math.acos(2 * v - 1);
      const r = 34 + ((i * 191) % 38);
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.cos(phi);
      const z = -Math.abs(r * Math.sin(phi) * Math.sin(theta)) - 6.0;
      starPos[i * 3] = x;
      starPos[i * 3 + 1] = y;
      starPos[i * 3 + 2] = z;
      c.setHSL(i % 3 === 0 ? 0.58 : 0.62, 0.42, 0.78);
      starCol[i * 3] = c.r;
      starCol[i * 3 + 1] = c.g;
      starCol[i * 3 + 2] = c.b;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starCol, 3));
    const starMat = new THREE.PointsMaterial({
      size: 0.52,
      map: softMap,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    return {
      lensGeo,
      lensMat,
      dustGeo,
      dustMat,
      backGlowGeo,
      backGlowMat,
      starGeo,
      starMat,
    };
  }, []);

  useEffect(() => {
    return () => {
      resources.lensGeo.dispose();
      resources.lensMat.dispose();
      resources.dustGeo.dispose();
      resources.dustMat.dispose();
      resources.backGlowGeo.dispose();
      resources.backGlowMat.dispose();
      resources.starGeo.dispose();
      resources.starMat.dispose();
    };
  }, [resources]);

  useFrame((state, delta) => {
    if (activeLab !== 'relativity_lab' || isTabHidden) return;
    const dt = Math.min(delta, 0.05);
    const t = reducedMotion ? 0 : state.clock.elapsedTime;

    // Primitive dirty-check cache for evaluateRelativity (zero per-frame heap alloc, INV1)
    if (
      Math.abs(lastVelRef.current - velocityC) > 0.0001 ||
      Math.abs(lastRadiusRef.current - radiusRs) > 0.0001 ||
      Math.abs(lastOffsetRef.current - lensOffset) > 0.0001
    ) {
      lastVelRef.current = velocityC;
      lastRadiusRef.current = radiusRs;
      lastOffsetRef.current = lensOffset;
      const rel = evaluateRelativity(velocityC, radiusRs, lensOffset);
      cachedVelRef.current = rel.velocityC;
      resources.lensMat.uniforms.uEinsteinRadius.value = rel.einsteinRadiusNorm;
      resources.lensMat.uniforms.uLensOffset.value = rel.lensOffset;
      resources.lensMat.uniforms.uVelocityC.value = rel.velocityC;
    }

    resources.lensMat.uniforms.uTime.value = t;
    resources.lensMat.uniforms.uMode.value = relativityTab === 'bh_dive' ? 1.0 : 0.0;
    resources.lensMat.uniforms.uDiveProgress.value = diveProgress;

    // Billboard the lensing plane toward camera so orbiting never exposes a flat 2D card edge-on
    if (lensMeshRef.current) {
      lensMeshRef.current.quaternion.copy(state.camera.quaternion);
    }

    if (!reducedMotion && starsRef.current) {
      starsRef.current.rotation.z += dt * (0.01 + cachedVelRef.current * 0.04);
    }
  });

  if (activeLab !== 'relativity_lab') return null;

  return (
    <group name="relativity-lab-root">
      <points ref={starsRef} geometry={resources.starGeo} material={resources.starMat} />

      {/* Center Billboarded GLSL Einstein Gravitational Lensing & Black Hole Plunge Viewport */}
      <mesh ref={lensMeshRef} geometry={resources.lensGeo} material={resources.lensMat} position={[0, 0.25, 0]} />
      <mesh geometry={resources.dustGeo} material={resources.dustMat} position={[0, 0.25, -2.0]} />
      <mesh geometry={resources.backGlowGeo} material={resources.backGlowMat} position={[0, 0.25, -2.5]} />
    </group>
  );
};
