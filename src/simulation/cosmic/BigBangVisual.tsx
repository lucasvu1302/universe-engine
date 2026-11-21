import React, { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import partVert from "@/shaders/cosmic/cosmicParticle.vert.glsl";
import partFrag from "@/shaders/cosmic/cosmicParticle.frag.glsl";
import { AssetManager } from "@/engine/assets/AssetManager";
import { SimulationManager } from "../core/SimulationManager";
import { CosmicEventManager } from "./CosmicEventManager";
import { ShockwaveRing } from "../effects/ShockwaveRing";
import { NebulaCloud } from "../effects/NebulaCloud";

interface BigBangVisualProps {
  progress?: number; // 0 to 1
}

const CMB_VERT = /* glsl */ `
  varying vec3 vSphereDir;
  void main() {
    vSphereDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const CMB_FRAG = /* glsl */ `
  precision highp float;
  uniform float uOpacity;
  uniform float uTime;
  varying vec3 vSphereDir;

  float hashCmb(vec3 p) {
    p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  float noiseCmb(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hashCmb(i + vec3(0, 0, 0)), hashCmb(i + vec3(1, 0, 0)), f.x),
          mix(hashCmb(i + vec3(0, 1, 0)), hashCmb(i + vec3(1, 1, 0)), f.x), f.y),
      mix(mix(hashCmb(i + vec3(0, 0, 1)), hashCmb(i + vec3(1, 0, 1)), f.x),
          mix(hashCmb(i + vec3(0, 1, 1)), hashCmb(i + vec3(1, 1, 1)), f.x), f.y),
      f.z
    );
  }

  float fbmCmb(vec3 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * noiseCmb(p);
      p = p * 2.05 + vec3(4.2, -3.1, 1.9);
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec3 d = normalize(vSphereDir);
    // Authentic Planck-satellite Baryon Acoustic Oscillation (BAO) temperature anisotropy mottling
    float macro = fbmCmb(d * 4.5 + uTime * 0.02);
    float acoustic = fbmCmb(d * 14.0 - vec3(macro * 1.2));
    float temp = clamp(macro * 0.55 + acoustic * 0.45, 0.0, 1.0);

    vec3 coldSpot = vec3(0.08, 0.24, 0.68);
    vec3 neutralCyan = vec3(0.18, 0.64, 0.78);
    vec3 warmAmber = vec3(0.96, 0.68, 0.18);
    vec3 hotCrimson = vec3(0.92, 0.24, 0.12);

    vec3 cmbCol = mix(coldSpot, neutralCyan, smoothstep(0.22, 0.48, temp));
    cmbCol = mix(cmbCol, warmAmber, smoothstep(0.48, 0.72, temp));
    cmbCol = mix(cmbCol, hotCrimson, smoothstep(0.72, 0.92, temp));

    gl_FragColor = vec4(cmbCol, uOpacity);
  }
`;

export const BigBangVisual: React.FC<BigBangVisualProps> = ({ progress = 0 }) => {
  const singularitySpriteRef = useRef<THREE.Sprite>(null);
  const singularityLightRef = useRef<THREE.PointLight>(null);
  const plasmaPointsRef = useRef<THREE.Points>(null);
  const plasmaMatRef = useRef<THREE.ShaderMaterial>(null);
  const cmbShellRef = useRef<THREE.Mesh>(null);
  const cmbMatRef = useRef<THREE.ShaderMaterial>(null);

  const particleCount = 4200;
  const assets = useMemo(() => AssetManager.getInstance(), []);
  const unitSphere48 = useMemo(() => assets.getUnitSphereGeometry(48), [assets]);
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

  const { velocities, basePositions, initialColors, coolingColors, scales } = useMemo(() => {
    const vels = new Float32Array(particleCount * 3);
    const pos = new Float32Array(particleCount * 3);
    const initCols = new Float32Array(particleCount * 3);
    const coolCols = new Float32Array(particleCount * 3);
    const scls = new Float32Array(particleCount);

    const whiteHot = new THREE.Color("#ffffff");
    const planckBlue = new THREE.Color("#93c5fd");
    const plasmaGold = new THREE.Color("#f59e0b");
    const redshiftCrimson = new THREE.Color("#ef4444");
    const tempCol = new THREE.Color();

    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const speed = 0.2 + Math.pow(Math.random(), 0.6) * 1.05;

      vels[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
      vels[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * speed;
      vels[i * 3 + 2] = Math.cos(phi) * speed;

      tempCol.copy(whiteHot).lerp(planckBlue, Math.random() * 0.4);
      initCols[i * 3] = tempCol.r;
      initCols[i * 3 + 1] = tempCol.g;
      initCols[i * 3 + 2] = tempCol.b;

      tempCol.copy(plasmaGold).lerp(redshiftCrimson, Math.random() * 0.7);
      coolCols[i * 3] = tempCol.r;
      coolCols[i * 3 + 1] = tempCol.g;
      coolCols[i * 3 + 2] = tempCol.b;

      scls[i] = 0.8 + Math.random() * 2.0;
    }

    return {
      velocities: vels,
      basePositions: pos,
      initialColors: initCols,
      coolingColors: coolCols,
      scales: scls,
    };
  }, [particleCount]);

  const currentPositions = useMemo(() => new Float32Array(basePositions), [basePositions]);
  const currentColors = useMemo(() => new Float32Array(initialColors), [initialColors]);

  const uniforms = useMemo(
    () => ({
      uSize: { value: 3.2 },
      uScale: { value: 1.0 },
      uOpacity: { value: 1.0 },
      uTime: { value: 0.0 },
    }),
    []
  );

  const cmbUniforms = useMemo(
    () => ({
      uOpacity: { value: 0.0 },
      uTime: { value: 0.0 },
    }),
    []
  );

  useEffect(() => {
    const pts = plasmaPointsRef.current;
    const mat = plasmaMatRef.current;
    const sSprite = singularitySpriteRef.current;
    const cMat = cmbMatRef.current;
    return () => {
      pts?.geometry?.dispose();
      mat?.dispose();
      sSprite?.material?.dispose();
      cMat?.dispose();
    };
  }, []);

  useFrame((_, delta) => {
    const p = resolveProgress();

    // 1. Soft Volumetric Quantum Singularity Flash (zero hard white marble!)
    const showSingularity = p < 0.38;
    if (singularitySpriteRef.current) {
      singularitySpriteRef.current.visible = showSingularity;
      if (showSingularity) {
        const pulse = 1.0 + Math.sin(performance.now() * 0.02) * 0.18;
        const flareScale = Math.max(2.0, (1.0 - p * 2.4) * 34.0 * pulse);
        singularitySpriteRef.current.scale.set(flareScale, flareScale, 1);
        singularitySpriteRef.current.material.opacity = Math.pow(1.0 - p / 0.38, 0.8);
      }
    }
    if (singularityLightRef.current) {
      singularityLightRef.current.intensity = showSingularity
        ? Math.max(0, (1.0 - p / 0.38) * 45)
        : 0;
    }

    // 2. Cosmic Inflation Quark-Gluon Plasma Expansion
    if (plasmaPointsRef.current) {
      const geom = plasmaPointsRef.current.geometry;
      const posAttr = geom.attributes.position as THREE.BufferAttribute;
      const colAttr = geom.attributes.aColor as THREE.BufferAttribute;

      const expansion = p < 0.15 ? Math.pow(p / 0.15, 2.5) * 25 : 25 + (p - 0.15) * 115;
      const coolRatio = Math.min(1.0, p * 1.4);

      for (let i = 0; i < particleCount; i++) {
        currentPositions[i * 3] = velocities[i * 3] * expansion;
        currentPositions[i * 3 + 1] = velocities[i * 3 + 1] * expansion;
        currentPositions[i * 3 + 2] = velocities[i * 3 + 2] * expansion;

        currentColors[i * 3] =
          initialColors[i * 3] * (1.0 - coolRatio) + coolingColors[i * 3] * coolRatio;
        currentColors[i * 3 + 1] =
          initialColors[i * 3 + 1] * (1.0 - coolRatio) + coolingColors[i * 3 + 1] * coolRatio;
        currentColors[i * 3 + 2] =
          initialColors[i * 3 + 2] * (1.0 - coolRatio) + coolingColors[i * 3 + 2] * coolRatio;
      }

      posAttr.copyArray(currentPositions);
      posAttr.needsUpdate = true;
      colAttr.copyArray(currentColors);
      colAttr.needsUpdate = true;
    }

    if (plasmaMatRef.current) {
      plasmaMatRef.current.uniforms.uOpacity.value = Math.pow(1.0 - p * 0.7, 1.2);
      plasmaMatRef.current.uniforms.uTime.value += delta;
    }

    // 3. Planck-Anisotropy Cosmic Microwave Background Surface of Last Scattering
    const showCmb = p > 0.24;
    if (cmbShellRef.current) {
      cmbShellRef.current.visible = showCmb;
      if (showCmb) {
        cmbShellRef.current.scale.setScalar(Math.max(22, p * 138));
        cmbShellRef.current.rotation.y += delta * 0.025;
      }
    }
    if (cmbMatRef.current) {
      cmbMatRef.current.uniforms.uOpacity.value = showCmb
        ? Math.min(0.32, (p - 0.24) * 0.45)
        : 0;
      cmbMatRef.current.uniforms.uTime.value += delta;
    }
  });

  return (
    <group>
      {/* 1. Volumetric Primordial Quantum Singularity Flare */}
      <sprite ref={singularitySpriteRef} scale={[32, 32, 1]}>
        <spriteMaterial
          map={softParticleMap}
          color="#fffbeb"
          transparent
          opacity={1}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </sprite>
      <pointLight ref={singularityLightRef} color="#fffae0" intensity={45} distance={400} />

      {/* 2. Expanding Primordial Quark-Gluon Plasma */}
      <points ref={plasmaPointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[currentPositions, 3]} />
          <bufferAttribute attach="attributes-aColor" args={[currentColors, 3]} />
          <bufferAttribute attach="attributes-aScale" args={[scales, 1]} />
        </bufferGeometry>
        <shaderMaterial
          ref={plasmaMatRef}
          vertexShader={partVert}
          fragmentShader={partFrag}
          uniforms={uniforms}
          transparent
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      {/* 3. Relativistic Cosmic Inflation Shockwaves */}
      <ShockwaveRing
        progressGetter={resolveProgress}
        maxRadius={145}
        color="#fbbf24"
        thickness={6.0}
        rotation={[Math.PI / 2, 0, 0]}
      />
      <ShockwaveRing
        progressGetter={() => Math.max(0, resolveProgress() - 0.12)}
        maxRadius={115}
        color="#ffffff"
        thickness={4.0}
        rotation={[Math.PI / 2.3, 0, Math.PI / 6]}
      />

      {/* 4. Planck-Mottled Cosmic Microwave Background (CMB) Horizon Sphere */}
      <mesh ref={cmbShellRef} geometry={unitSphere48} visible={false}>
        <shaderMaterial
          ref={cmbMatRef}
          vertexShader={CMB_VERT}
          fragmentShader={CMB_FRAG}
          uniforms={cmbUniforms}
          transparent
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* 5. Ethereal Primordial Hydrogen/Helium Nebulae */}
      <NebulaCloud
        color="#f59e0b"
        size={70}
        intensityGetter={() => Math.max(0.15, (1.0 - resolveProgress()) * 0.75)}
      />
      <NebulaCloud
        color="#ef4444"
        size={55}
        intensityGetter={() => Math.max(0.1, (1.0 - resolveProgress()) * 0.55)}
      />
    </group>
  );
};
