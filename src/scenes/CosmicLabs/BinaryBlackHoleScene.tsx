import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '@/stores/useAppStore';
import { BinaryMergerState, evaluateBinaryMerger } from '@/simulation/cosmic/CosmicPhysics';
import { AssetManager } from '@/engine/assets/AssetManager';
import spacetimeVert from '@/shaders/cosmic/spacetimeWave.vert.glsl';
import spacetimeFrag from '@/shaders/cosmic/spacetimeWave.frag.glsl';

const PLANE_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Camera-facing relativistic Kerr Shadow + Razor-Thin Golden Einstein Photon Ring + Warped Lensing Halo
// (Zero intersecting double planes, zero silver cupcake bowls, zero pow(negative) / atan(0,0) NaN!)
const KERR_BILLBOARD_FRAG = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform float uSpinDir;
  varying vec2 vUv;

  void main() {
    vec2 p = (vUv - 0.5) * 2.0;
    float r = length(p);
    float angle = r > 1e-5 ? atan(p.y, p.x) : 0.0;

    float shadowR = 0.265;
    float insideShadow = 1.0 - smoothstep(shadowR - 0.012, shadowR + 0.008, r);

    // Razor-sharp incandescent Einstein photon ring hugging the shadow boundary
    float dPhoton = (r - (shadowR + 0.014)) / 0.022;
    float photonRing = exp(-(dPhoton * dPhoton)) * 1.55;

    // Gravitational-lensed upper & lower accretion arch (classic Gargantua / Interstellar silhouette)
    float archMask = 0.55 + 0.45 * abs(sin(angle));
    float dLens = (r - (shadowR + 0.045)) / 0.085;
    float lensGlow = exp(-(dLens * dLens)) * archMask * 0.65;

    // Equatorial Doppler-beamed accretion swirl (tilted elliptical profile)
    vec2 eqP = vec2(p.x, p.y * 3.1);
    float eqR = length(eqP);
    float eqAngle = eqR > 1e-5 ? atan(eqP.y, eqP.x) : 0.0;
    float swirl = 0.58 + 0.42 * sin(eqAngle * 3.0 - eqR * 12.0 + uTime * 3.2 * uSpinDir);
    float eqRing = smoothstep(0.24, 0.34, eqR) * (1.0 - smoothstep(0.46, 0.96, eqR)) * swirl;
    float doppler = 0.68 + 0.46 * cos(eqAngle - 0.4);

    vec3 hotGold = vec3(1.0, 0.94, 0.78);
    vec3 amberPlasma = vec3(1.0, 0.52, 0.14);
    vec3 deepRust = vec3(0.58, 0.14, 0.05);

    vec3 plasmaCol = mix(hotGold, amberPlasma, smoothstep(0.26, 0.52, r));
    plasmaCol = mix(plasmaCol, deepRust, smoothstep(0.52, 0.9, r));

    vec3 emitCol = plasmaCol * (photonRing + lensGlow + eqRing * doppler * 1.05);
    float emitAlpha = clamp(photonRing * 0.95 + lensGlow * 0.65 + eqRing * doppler * 0.85, 0.0, 0.98);

    // Velvet pitch-black Event Horizon masks interior cleanly
    vec3 finalCol = mix(emitCol, vec3(0.0), insideShadow);
    float finalAlpha = max(insideShadow, emitAlpha) * (1.0 - smoothstep(0.84, 0.99, r));

    if (finalAlpha < 0.008) discard;
    gl_FragColor = vec4(finalCol, finalAlpha);
  }
`;

// Swirling golden-amber tidal plasma bridge connecting the two inspiraling black holes
const TIDAL_BRIDGE_FRAG = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform float uOpacity;
  varying vec2 vUv;

  void main() {
    float across = abs(vUv.y - 0.5) * 2.0;
    float along = vUv.x;
    float stream = exp(-(across * across) * 5.2);
    float wave = 0.58 + 0.42 * sin(along * 18.0 - uTime * 5.0 + across * 3.5);
    float ends = smoothstep(0.0, 0.18, along) * (1.0 - smoothstep(0.82, 1.0, along));
    vec3 col = mix(vec3(0.98, 0.46, 0.14), vec3(0.38, 0.86, 1.0), 0.25 + 0.35 * sin(along * 6.283));
    float alpha = stream * wave * ends * uOpacity;
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(col * 1.1, alpha);
  }
`;

export const BinaryBlackHoleScene: React.FC = () => {
  const bh1Ref = useRef<THREE.Mesh>(null);
  const bh2Ref = useRef<THREE.Mesh>(null);
  const bridgeRef = useRef<THREE.Mesh>(null);
  const flashRingRef = useRef<THREE.Mesh>(null);

  const smoothProgressRef = useRef(useAppStore.getState().mergerProgress);
  const lastKeyRef = useRef(-1);
  const cachedStateRef = useRef<BinaryMergerState>(
    evaluateBinaryMerger(useAppStore.getState().mergerProgress)
  );

  const softParticle = useMemo(() => AssetManager.getInstance().getSoftParticleMap(), []);

  const gpu = useMemo(() => {
    const fabricGeo = new THREE.PlaneGeometry(44, 44, 140, 140);
    fabricGeo.rotateX(-Math.PI / 2);
    const fabricMat = new THREE.ShaderMaterial({
      vertexShader: spacetimeVert,
      fragmentShader: spacetimeFrag,
      uniforms: {
        uTime: { value: 0 },
        uBh1Pos: { value: new THREE.Vector2(3, 0) },
        uBh2Pos: { value: new THREE.Vector2(-3, 0) },
        uWaveAmp: { value: 0.35 },
        uOrbitalPhase: { value: 0 },
      },
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const bhPlaneGeo1 = new THREE.PlaneGeometry(8.4, 8.4);
    const bhPlaneGeo2 = new THREE.PlaneGeometry(6.9, 6.9);
    const bhMat1 = new THREE.ShaderMaterial({
      vertexShader: PLANE_VERT,
      fragmentShader: KERR_BILLBOARD_FRAG,
      uniforms: { uTime: { value: 0 }, uSpinDir: { value: 1.0 } },
      transparent: true,
      depthWrite: false,
    });
    const bhMat2 = new THREE.ShaderMaterial({
      vertexShader: PLANE_VERT,
      fragmentShader: KERR_BILLBOARD_FRAG,
      uniforms: { uTime: { value: 0 }, uSpinDir: { value: 1.25 } },
      transparent: true,
      depthWrite: false,
    });

    const bridgeGeo = new THREE.PlaneGeometry(1.0, 1.35);
    bridgeGeo.rotateX(-Math.PI / 2);
    const bridgeMat = new THREE.ShaderMaterial({
      vertexShader: PLANE_VERT,
      fragmentShader: TIDAL_BRIDGE_FRAG,
      uniforms: { uTime: { value: 0 }, uOpacity: { value: 0.55 } },
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const flashGeo = new THREE.RingGeometry(1.5, 2.8, 64);
    const flashMat = new THREE.MeshBasicMaterial({
      color: '#e0f2fe',
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const starCount = 1200;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const a = Math.abs((Math.sin(i * 19.13) * 43758.5453) % 1) * Math.PI * 2;
      const b = Math.acos(2 * Math.abs((Math.sin(i * 63.7 + 2.1) * 24634.63) % 1) - 1);
      const r = 110;
      starPos[i * 3] = r * Math.sin(b) * Math.cos(a);
      starPos[i * 3 + 1] = r * Math.cos(b);
      starPos[i * 3 + 2] = r * Math.sin(b) * Math.sin(a);
    }
    const starsGeo = new THREE.BufferGeometry();
    starsGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starsMat = new THREE.PointsMaterial({
      map: softParticle,
      color: '#bae6fd',
      size: 0.58,
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
    });

    return {
      fabricGeo,
      fabricMat,
      bhPlaneGeo1,
      bhPlaneGeo2,
      bhMat1,
      bhMat2,
      bridgeGeo,
      bridgeMat,
      flashGeo,
      flashMat,
      starsGeo,
      starsMat,
    };
  }, [softParticle]);

  useEffect(() => {
    return () => {
      gpu.fabricGeo.dispose();
      gpu.fabricMat.dispose();
      gpu.bhPlaneGeo1.dispose();
      gpu.bhPlaneGeo2.dispose();
      gpu.bhMat1.dispose();
      gpu.bhMat2.dispose();
      gpu.bridgeGeo.dispose();
      gpu.bridgeMat.dispose();
      gpu.flashGeo.dispose();
      gpu.flashMat.dispose();
      gpu.starsGeo.dispose();
      gpu.starsMat.dispose();
    };
  }, [gpu]);

  useFrame((state, delta) => {
    const dt = Math.min(Math.max(delta, 0.001), 0.05);
    const store = useAppStore.getState();
    const targetP = store.mergerProgress;
    if (targetP < smoothProgressRef.current - 0.3) {
      smoothProgressRef.current = targetP;
    } else {
      smoothProgressRef.current = THREE.MathUtils.lerp(
        smoothProgressRef.current,
        targetP,
        1 - Math.exp(-16 * dt)
      );
    }

    // Dirty-check cached evaluation (INV1 / F5: zero per-frame allocations when static)
    const quantKey = Math.round(smoothProgressRef.current * 2000);
    if (quantKey !== lastKeyRef.current) {
      lastKeyRef.current = quantKey;
      cachedStateRef.current = evaluateBinaryMerger(smoothProgressRef.current);
    }
    const m = cachedStateRef.current;

    const rHalf = m.separationUnits * 0.5;
    const x1 = Math.cos(m.orbitalPhaseRad) * rHalf;
    const z1 = Math.sin(m.orbitalPhaseRad) * rHalf;
    const x2 = -x1;
    const z2 = -z1;

    const elapsed = store.reducedMotion ? 0 : state.clock.elapsedTime;
    gpu.fabricMat.uniforms.uTime.value = elapsed;
    gpu.fabricMat.uniforms.uBh1Pos.value.set(x1, z1);
    gpu.fabricMat.uniforms.uBh2Pos.value.set(x2, z2);
    gpu.fabricMat.uniforms.uWaveAmp.value = m.waveAmplitude;
    gpu.fabricMat.uniforms.uOrbitalPhase.value = m.orbitalPhaseRad;
    gpu.bhMat1.uniforms.uTime.value = elapsed;
    gpu.bhMat2.uniforms.uTime.value = elapsed;
    gpu.bridgeMat.uniforms.uTime.value = elapsed;

    const merged = smoothProgressRef.current >= 0.78;
    const remnantScale = merged
      ? 1.38 + Math.sin((smoothProgressRef.current - 0.78) * 35) * 0.04 * m.strainEnvelope
      : 1.0;

    if (bh1Ref.current) {
      bh1Ref.current.position.set(x1, -1.65, z1);
      bh1Ref.current.scale.setScalar(remnantScale);
      bh1Ref.current.quaternion.copy(state.camera.quaternion);
    }
    if (bh2Ref.current) {
      bh2Ref.current.visible = !merged;
      bh2Ref.current.position.set(x2, -1.65, z2);
      bh2Ref.current.quaternion.copy(state.camera.quaternion);
    }

    if (bridgeRef.current) {
      bridgeRef.current.visible = !merged && m.separationUnits > 0.6;
      bridgeRef.current.position.set(0, -1.68, 0);
      bridgeRef.current.rotation.set(0, -m.orbitalPhaseRad, 0);
      bridgeRef.current.scale.set(Math.max(0.5, m.separationUnits), 1, 1);
      gpu.bridgeMat.uniforms.uOpacity.value = Math.min(0.65, 0.25 + m.waveAmplitude * 0.55);
    }

    if (flashRingRef.current) {
      const ringBurst = merged ? Math.max(0, 1.0 - (smoothProgressRef.current - 0.78) * 4.5) : 0;
      const expand = 1.0 + (smoothProgressRef.current - 0.78) * 28.0;
      flashRingRef.current.visible = ringBurst > 0.01;
      flashRingRef.current.scale.setScalar(Math.max(1, expand));
      gpu.flashMat.opacity = ringBurst * 0.85;
    }
  });

  return (
    <group name="binary-black-hole-merger-lab">
      <points geometry={gpu.starsGeo} material={gpu.starsMat} />

      {/* Smooth Gaussian Spacetime Curvature & Quadrupole Wave Fabric */}
      <mesh position={[0, -1.5, 0]} geometry={gpu.fabricGeo} material={gpu.fabricMat} />

      {/* Glowing Tidal Accretion Bridge Between Inspiraling Black Holes */}
      <mesh ref={bridgeRef} position={[0, -1.68, 0]} geometry={gpu.bridgeGeo} material={gpu.bridgeMat} />

      {/* Camera-Billboarded Relativistic Kerr Black Holes with Razor Einstein Photon Rings */}
      <mesh ref={bh1Ref} position={[3, -1.65, 0]} geometry={gpu.bhPlaneGeo1} material={gpu.bhMat1} renderOrder={2} />
      <mesh ref={bh2Ref} position={[-3, -1.65, 0]} geometry={gpu.bhPlaneGeo2} material={gpu.bhMat2} renderOrder={2} />

      {/* Merger Coalescence Gravitational Wave Burst Ring */}
      <mesh
        ref={flashRingRef}
        position={[0, -1.5, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        geometry={gpu.flashGeo}
        material={gpu.flashMat}
      />
    </group>
  );
};

export default BinaryBlackHoleScene;
