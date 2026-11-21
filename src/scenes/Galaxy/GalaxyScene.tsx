import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '@/stores/useAppStore';
import { PerformanceManager } from '@/engine/performance/PerformanceManager';
import { CameraManager } from '@/engine/camera/CameraManager';
import galaxyVert from '@/shaders/galaxy/galaxy.vert.glsl';
import galaxyFrag from '@/shaders/galaxy/galaxy.frag.glsl';
import galaxyNebulaVert from '@/shaders/galaxy/galaxyNebula.vert.glsl';
import galaxyNebulaFrag from '@/shaders/galaxy/galaxyNebula.frag.glsl';

interface GalaxySceneProps {
  onEnterSolarSystem?: () => void;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export const GalaxyScene: React.FC<GalaxySceneProps> = ({ onEnterSolarSystem }) => {
  const rootGroupRef = useRef<THREE.Group>(null);
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const nebulaMatRef = useRef<THREE.ShaderMaterial>(null);
  const coreRef = useRef<THREE.Group>(null);
  const coreInnerMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const coreOuterMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const beaconRingsRef = useRef<THREE.Group>(null);
  const solSphereMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const ring1MatRef = useRef<THREE.MeshBasicMaterial>(null);
  const ring2MatRef = useRef<THREE.MeshBasicMaterial>(null);
  const beamMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const warmupFramesRef = useRef(0);

  const quality = useAppStore((state) => state.graphicsQuality);
  const detectedGPUTier = useAppStore((state) => state.detectedGPUTier);

  const particleCount = useMemo(
    () => PerformanceManager.getInstance().getQualityProfile(quality, detectedGPUTier).galaxyParticleCount,
    [quality, detectedGPUTier]
  );
  const maxRadius = 360;

  useEffect(() => {
    const root = rootGroupRef.current;
    const pts = pointsRef.current;
    const mat = materialRef.current;
    const nebMat = nebulaMatRef.current;
    return () => {
      mat?.dispose();
      nebMat?.dispose();
      root?.traverse((obj) => {
        if (obj === pts) return;
        const mesh = obj as THREE.Mesh;
        if (mesh.isMesh) {
          mesh.geometry?.dispose();
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose());
          } else {
            mesh.material?.dispose();
          }
        }
      });
    };
  }, []);

  // Generate 4-arm barred spiral Milky Way with distinct astrophysical stellar populations
  const geometry = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const col = new Float32Array(particleCount * 3);
    const scl = new Float32Array(particleCount);
    const twk = new Float32Array(particleCount * 2);

    const barAngle = 0.44; // ~25° bar angle relative to core-sun axis
    const cosBar = Math.cos(barAngle);
    const sinBar = Math.sin(barAngle);

    for (let i = 0; i < particleCount; i++) {
      const rand = Math.random();
      let x = 0;
      let y = 0;
      let z = 0;
      let rCol = 1.0;
      let gCol = 1.0;
      let bCol = 1.0;
      let scale = 1.0;

      if (rand < 0.28) {
        // 1. Central Bulge & Bar (Old Population II golden/amber stars)
        if (Math.random() < 0.55) {
          // Triaxial Galactic Bar
          const u = (Math.random() - 0.5) * 2;
          const v = (Math.random() - 0.5) * 2 * (1.0 - u * u * 0.5);
          const w = (Math.random() - 0.5) * 2 * (1.0 - u * u * 0.6);
          const bx = u * 48;
          const bz = v * 18;
          const by = w * 12;
          x = bx * cosBar - bz * sinBar;
          z = bx * sinBar + bz * cosBar;
          y = by;
        } else {
          // Dense Spherical Core Bulge
          const cr = Math.pow(Math.random(), 2.8) * 32;
          const cTheta = Math.random() * Math.PI * 2;
          const cPhi = Math.acos(2 * Math.random() - 1);
          x = cr * Math.sin(cPhi) * Math.cos(cTheta);
          z = cr * Math.sin(cPhi) * Math.sin(cTheta);
          y = cr * Math.cos(cPhi) * 0.55;
        }

        const coreMix = Math.random();
        rCol = 1.0;
        gCol = 0.78 + coreMix * 0.2;
        bCol = 0.45 + coreMix * 0.45;
        scale = Math.random() * 2.2 + 0.8;
      } else if (rand < 0.82) {
        // 2. 4 Major Logarithmic Spiral Arms + Orion Spur
        const armIndex = Math.floor(Math.random() * 4);
        const armTheta0 = (armIndex * Math.PI) / 2;

        const r = 32 + Math.pow(Math.random(), 1.25) * (maxRadius - 32);
        const b = 0.21; // Pitch angle parameter
        const armTheta = armTheta0 + (1.0 / b) * Math.log(r / 32);

        // Gaussian arm width dispersion
        const spread = (4.0 + 0.09 * r) * Math.pow(Math.random(), 1.6) * (Math.random() < 0.5 ? 1 : -1);
        const perpAngle = armTheta + Math.PI / 2;

        x = r * Math.cos(armTheta) + Math.cos(perpAngle) * spread;
        z = r * Math.sin(armTheta) + Math.sin(perpAngle) * spread;
        y = (Math.random() - 0.5) * 2 * (2.8 + 0.02 * r);

        const distRatio = (r - 32) / (maxRadius - 32);
        const isNebulaKnot = Math.random() < 0.08;

        if (isNebulaKnot) {
          // H II Star-Forming Emission Nebulae (Pink/Magenta & Neon Cyan)
          if (Math.random() < 0.65) {
            rCol = 1.0;
            gCol = 0.35 + Math.random() * 0.2;
            bCol = 0.75 + Math.random() * 0.25;
          } else {
            rCol = 0.35;
            gCol = 0.85 + Math.random() * 0.15;
            bCol = 1.0;
          }
          scale = Math.random() * 3.2 + 1.8;
        } else if (distRatio < 0.3) {
          // Warm golden to white transition
          rCol = 1.0;
          gCol = 0.9 - distRatio * 0.3;
          bCol = 0.7 + distRatio * 0.8;
          scale = Math.random() * 1.8 + 0.7;
        } else {
          // Young O/B Blue Supergiants and bright white stars
          const blueMix = Math.random();
          rCol = 0.55 + blueMix * 0.4;
          gCol = 0.75 + blueMix * 0.25;
          bCol = 1.0;
          scale = Math.random() * 2.0 + 0.8;
        }
      } else if (rand < 0.97) {
        // 3. Diffuse Disc Stars (Exponential disc background)
        const r = Math.pow(Math.random(), 0.9) * maxRadius;
        const theta = Math.random() * Math.PI * 2;
        x = r * Math.cos(theta);
        z = r * Math.sin(theta);
        y = (Math.random() - 0.5) * 2 * (3.5 + 0.025 * r);

        const discMix = Math.random();
        rCol = 0.85 + discMix * 0.15;
        gCol = 0.85 + discMix * 0.15;
        bCol = 0.9 + discMix * 0.1;
        scale = Math.random() * 1.4 + 0.5;
      } else {
        // 4. Globular Clusters Halo (Spherical halo surrounding the galaxy)
        const hr = 50 + Math.pow(Math.random(), 1.5) * 280;
        const hTheta = Math.random() * Math.PI * 2;
        const hPhi = Math.acos(2 * Math.random() - 1);
        x = hr * Math.sin(hPhi) * Math.cos(hTheta);
        z = hr * Math.sin(hPhi) * Math.sin(hTheta);
        y = hr * Math.cos(hPhi) * 0.85;

        rCol = 1.0;
        gCol = 0.88;
        bCol = 0.65;
        scale = Math.random() * 1.6 + 0.8;
      }

      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;

      col[i * 3] = rCol;
      col[i * 3 + 1] = gCol;
      col[i * 3 + 2] = bCol;

      scl[i] = scale;
      twk[i * 2] = Math.random() * 3.5 + 1.2; // Twinkle speed
      twk[i * 2 + 1] = Math.random() * Math.PI * 2; // Twinkle phase
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aScale', new THREE.BufferAttribute(scl, 1));
    g.setAttribute('aTwinkle', new THREE.BufferAttribute(twk, 2));
    // O(1) exact bounding sphere avoids synchronous 120k-vertex scan on first visible frame
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), maxRadius + 60);
    return g;
  }, [particleCount, maxRadius]);

  useEffect(() => {
    warmupFramesRef.current = 0;
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  const starUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSize: { value: 2.4 },
      uOpacity: { value: 0 }
    }),
    []
  );

  const nebulaUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uOpacity: { value: 0 }
    }),
    []
  );

  useFrame((_, delta) => {
    const root = rootGroupRef.current;
    if (!root) return;

    const blend = CameraManager.getInstance().galaxyBlend;

    // Silent 2-frame shader & VBO warm-up on mount (uOpacity = 0, additive blend adds zero pixels)
    // so clicking Galaxy later has zero GLSL compile or 120k VBO upload hitch, then costs 0 draw calls while hidden.
    if (blend <= 0.001) {
      if (warmupFramesRef.current < 2) {
        warmupFramesRef.current += 1;
        root.visible = true;
        root.scale.setScalar(0.001);
        if (materialRef.current) materialRef.current.uniforms.uOpacity.value = 0;
        if (nebulaMatRef.current) nebulaMatRef.current.uniforms.uOpacity.value = 0;
        if (coreInnerMatRef.current) coreInnerMatRef.current.opacity = 0;
        if (coreOuterMatRef.current) coreOuterMatRef.current.opacity = 0;
        if (solSphereMatRef.current) solSphereMatRef.current.opacity = 0;
        if (ring1MatRef.current) ring1MatRef.current.opacity = 0;
        if (ring2MatRef.current) ring2MatRef.current.opacity = 0;
        if (beamMatRef.current) beamMatRef.current.opacity = 0;
      } else {
        root.visible = false;
      }
      return;
    }

    warmupFramesRef.current = 2;
    root.visible = true;

    const galaxyAlpha = smoothstep(0.05, 0.85, blend);
    const galaxyScale = 0.78 + 0.22 * smoothstep(0.05, 1.0, blend);
    const beaconAlpha = smoothstep(0.55, 1.0, blend);

    root.scale.setScalar(galaxyScale);

    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value += delta;
      materialRef.current.uniforms.uOpacity.value = galaxyAlpha;
    }
    if (nebulaMatRef.current) {
      nebulaMatRef.current.uniforms.uTime.value += delta;
      nebulaMatRef.current.uniforms.uOpacity.value = galaxyAlpha;
    }
    if (coreInnerMatRef.current) {
      coreInnerMatRef.current.opacity = 0.88 * galaxyAlpha;
    }
    if (coreOuterMatRef.current) {
      coreOuterMatRef.current.opacity = 0.42 * galaxyAlpha;
    }
    if (solSphereMatRef.current) {
      solSphereMatRef.current.opacity = beaconAlpha;
    }
    if (ring1MatRef.current) {
      ring1MatRef.current.opacity = 0.7 * beaconAlpha;
    }
    if (ring2MatRef.current) {
      ring2MatRef.current.opacity = 0.45 * beaconAlpha;
    }
    if (beamMatRef.current) {
      beamMatRef.current.opacity = 0.5 * beaconAlpha;
    }
    if (beaconRingsRef.current) {
      beaconRingsRef.current.rotation.z += delta * 0.45;
    }
    if (coreRef.current) {
      coreRef.current.rotation.y += delta * 0.02;
    }
  });

  // Solar system position within Milky Way (Orion Spur, ~26,000 light years from core)
  const solPos: [number, number, number] = [115, 2, 70];

  return (
    <group ref={rootGroupRef} visible={false}>
      {/* 1. Volumetric Diffuse Interstellar Gas & Dark Dust Lanes Plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[780, 780]} />
        <shaderMaterial
          ref={nebulaMatRef}
          vertexShader={galaxyNebulaVert}
          fragmentShader={galaxyNebulaFrag}
          uniforms={nebulaUniforms}
          transparent
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* 2. Multi-Population Stars Points Cloud */}
      <points ref={pointsRef} geometry={geometry}>
        <shaderMaterial
          ref={materialRef}
          vertexShader={galaxyVert}
          fragmentShader={galaxyFrag}
          uniforms={starUniforms}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          transparent
        />
      </points>

      {/* 3. Luminous Central Galactic Bulge & Sagittarius A* Core Glow */}
      <group ref={coreRef} position={[0, 0, 0]}>
        {/* Blinding White Core */}
        <mesh>
          <sphereGeometry args={[14.0, 32, 32]} />
          <meshBasicMaterial
            ref={coreInnerMatRef}
            color="#ffffff"
            transparent
            depthWrite={false}
            opacity={0}
          />
        </mesh>
        {/* Warm Golden Corona */}
        <mesh>
          <sphereGeometry args={[28.0, 32, 32]} />
          <meshBasicMaterial
            ref={coreOuterMatRef}
            color="#ffe082"
            transparent
            depthWrite={false}
            opacity={0}
            side={THREE.BackSide}
          />
        </mesh>
      </group>

      {/* 4. "YOU ARE HERE / SOL SYSTEM" Holographic Navigation Beacon */}
      <group position={solPos}>
        {/* Clickable Sun Sphere */}
        <mesh
          onClick={(e) => {
            if (CameraManager.getInstance().galaxyBlend < 0.8) return;
            e.stopPropagation();
            onEnterSolarSystem?.();
          }}
          onPointerOver={() => {
            if (CameraManager.getInstance().galaxyBlend < 0.8) return;
            document.body.style.cursor = 'pointer';
          }}
          onPointerOut={() => {
            document.body.style.cursor = 'auto';
          }}
        >
          <sphereGeometry args={[3.2, 24, 24]} />
          <meshBasicMaterial
            ref={solSphereMatRef}
            color="#38bdf8"
            transparent
            depthWrite={false}
            opacity={0}
          />
        </mesh>

        {/* Pulsing Holographic Concentric Rings */}
        <group ref={beaconRingsRef} rotation={[Math.PI / 2, 0, 0]}>
          <mesh>
            <ringGeometry args={[5.5, 6.5, 32]} />
            <meshBasicMaterial
              ref={ring1MatRef}
              color="#38bdf8"
              transparent
              depthWrite={false}
              opacity={0}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh>
            <ringGeometry args={[8.0, 8.8, 32]} />
            <meshBasicMaterial
              ref={ring2MatRef}
              color="#0284c7"
              transparent
              depthWrite={false}
              opacity={0}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>

        {/* Vertical Holographic Light Beacon */}
        <mesh position={[0, 18, 0]}>
          <cylinderGeometry args={[0.3, 0.3, 36, 16]} />
          <meshBasicMaterial
            ref={beamMatRef}
            color="#38bdf8"
            transparent
            depthWrite={false}
            opacity={0}
          />
        </mesh>
      </group>
    </group>
  );
};

