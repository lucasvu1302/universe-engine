import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '@/stores/useAppStore';
import { AssetManager } from '@/engine/assets/AssetManager';
import { evaluateMarsTerraform } from '@/simulation/cosmic/Wave2Physics';
import marsTerraformFrag from '@/shaders/cosmic/marsTerraform.frag.glsl';

const GLOBE_VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vWorldView;
  varying vec3 vLocalPos;
  void main() {
    vUv = uv;
    vLocalPos = position;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vWorldView = normalize(cameraPosition - wp.xyz);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const HALO_FRAG = /* glsl */ `
  precision highp float;
  uniform float uAtmosBlue;
  varying vec3 vWorldNormal;
  varying vec3 vWorldView;
  void main() {
    vec3 N = normalize(vWorldNormal);
    vec3 V = normalize(vWorldView);
    vec3 sunDir = normalize(vec3(0.76, 0.32, 0.56));
    float ndotv = clamp(dot(-N, V), 0.0, 1.0);
    // Normalized BackSide limb glow (R_halo = 1.12 R_mars -> geometric horizon ndotv ~ 0.45)
    float limb = smoothstep(0.0, 0.52, ndotv);
    float glow = pow(max(0.0001, limb), 2.1);
    float sunLit = 0.38 + 0.62 * max(dot(N, sunDir), 0.0);
    vec3 col = mix(vec3(0.86, 0.48, 0.26), vec3(0.26, 0.72, 1.0), uAtmosBlue);
    float alpha = glow * sunLit * (0.45 + 0.55 * uAtmosBlue);
    if (alpha < 0.004) discard;
    gl_FragColor = vec4(col, alpha);
  }
`;

const BEAM_VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vWorldView;
  void main() {
    vUv = uv;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vWorldView = normalize(cameraPosition - wp.xyz);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const BEAM_FRAG = /* glsl */ `
  precision highp float;
  uniform vec3 uColor;
  uniform float uIntensity;
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vWorldView;
  void main() {
    float edgeSoft = pow(max(0.0001, abs(dot(normalize(vWorldNormal), normalize(vWorldView)))), 1.9);
    // Smooth fade to zero before reaching planetary limb (vUv.y = 0) and softly off mirror base (vUv.y = 1)
    float axialFade = smoothstep(0.0, 0.48, vUv.y) * smoothstep(1.0, 0.82, vUv.y);
    float alpha = edgeSoft * axialFade * uIntensity;
    if (alpha < 0.004) discard;
    gl_FragColor = vec4(uColor, alpha);
  }
`;

export const MarsTerraformScene: React.FC = () => {
  const showMirrors = useAppStore((s) => s.terraformMirrors);
  const showComets = useAppStore((s) => s.terraformComets);

  const marsRef = useRef<THREE.Mesh>(null);
  const mirrorsGroupRef = useRef<THREE.Group>(null);
  const cometsGroupRef = useRef<THREE.Group>(null);

  const assets = useMemo(() => AssetManager.getInstance(), []);
  const marsMap = useMemo(() => assets.loadTexture('mars'), [assets]);
  const kaptonMap = useMemo(() => assets.getKaptonFoilMap(), [assets]);
  const softParticle = useMemo(() => assets.getSoftParticleMap(), [assets]);

  const gpu = useMemo(() => {
    const starCount = 1600;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const a = Math.abs((Math.sin(i * 12.989) * 43758.545) % 1) * Math.PI * 2;
      const b = Math.acos(2 * Math.abs((Math.sin(i * 78.233 + 1.1) * 24634.63) % 1) - 1);
      const r = 60 + Math.abs((Math.sin(i * 19.3) * 18231.2) % 1) * 70;
      starPos[i * 3] = r * Math.sin(b) * Math.cos(a);
      starPos[i * 3 + 1] = r * Math.cos(b);
      starPos[i * 3 + 2] = r * Math.sin(b) * Math.sin(a);
    }
    const starsGeo = new THREE.BufferGeometry();
    starsGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starsMat = new THREE.PointsMaterial({
      map: softParticle,
      color: '#e2e8f0',
      size: 0.55,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });

    const marsGeo = new THREE.SphereGeometry(4.4, 96, 64);
    const marsMat = new THREE.ShaderMaterial({
      vertexShader: GLOBE_VERT,
      fragmentShader: marsTerraformFrag,
      uniforms: {
        uMarsMap: { value: marsMap },
        uTime: { value: 0 },
        uOceanLevel: { value: 0.3 },
        uVegLevel: { value: 0.15 },
        uCloudLevel: { value: 0.25 },
        uIceCapScale: { value: 0.7 },
        uAtmosBlue: { value: 0.35 },
        uColonyLights: { value: 0.2 },
      },
    });

    const haloGeo = new THREE.SphereGeometry(4.92, 64, 48);
    const haloMat = new THREE.ShaderMaterial({
      vertexShader: GLOBE_VERT,
      fragmentShader: HALO_FRAG,
      uniforms: { uAtmosBlue: { value: 0.35 } },
      transparent: true,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    // 3 Golden Orbital Solar Mirrors reflecting sunlight inward onto Mars polar caps
    const mirrorDiscGeo = new THREE.CylinderGeometry(0.86, 0.86, 0.04, 6);
    const mirrorMat = new THREE.MeshStandardMaterial({
      map: kaptonMap,
      color: '#fcd34d',
      metalness: 0.85,
      roughness: 0.18,
      emissive: '#d97706',
      emissiveIntensity: 0.48,
    });
    const mirrorFrameGeo = new THREE.TorusGeometry(0.89, 0.035, 8, 6);
    const frameMat = new THREE.MeshStandardMaterial({
      color: '#e2e8f0',
      metalness: 0.78,
      roughness: 0.28,
    });
    const beamGeo = new THREE.CylinderGeometry(0.18, 0.72, 2.25, 24, 1, true);
    const beamMat = new THREE.ShaderMaterial({
      vertexShader: BEAM_VERT,
      fragmentShader: BEAM_FRAG,
      uniforms: {
        uColor: { value: new THREE.Color('#fde68a') },
        uIntensity: { value: 0.42 },
      },
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    // Icy ammonia-water comet nucleus + glowing additive coma + feathered cyan ion tail
    const cometCoreGeo = new THREE.SphereGeometry(0.12, 16, 12);
    const cometCoreMat = new THREE.MeshBasicMaterial({ color: '#e0f2fe' });
    const cometComaMat = new THREE.SpriteMaterial({
      map: softParticle,
      color: '#7dd3fc',
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const cometTailGeo = new THREE.CylinderGeometry(0.04, 0.36, 2.7, 20, 1, true);
    const cometTailMat = new THREE.ShaderMaterial({
      vertexShader: BEAM_VERT,
      fragmentShader: BEAM_FRAG,
      uniforms: {
        uColor: { value: new THREE.Color('#38bdf8') },
        uIntensity: { value: 0.65 },
      },
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    return {
      starsGeo,
      starsMat,
      marsGeo,
      marsMat,
      haloGeo,
      haloMat,
      mirrorDiscGeo,
      mirrorMat,
      mirrorFrameGeo,
      frameMat,
      beamGeo,
      beamMat,
      cometCoreGeo,
      cometCoreMat,
      cometComaMat,
      cometTailGeo,
      cometTailMat,
    };
  }, [marsMap, kaptonMap, softParticle]);

  useEffect(() => {
    return () => {
      gpu.starsGeo.dispose();
      gpu.starsMat.dispose();
      gpu.marsGeo.dispose();
      gpu.marsMat.dispose();
      gpu.haloGeo.dispose();
      gpu.haloMat.dispose();
      gpu.mirrorDiscGeo.dispose();
      gpu.mirrorMat.dispose();
      gpu.mirrorFrameGeo.dispose();
      gpu.frameMat.dispose();
      gpu.beamGeo.dispose();
      gpu.beamMat.dispose();
      gpu.cometCoreGeo.dispose();
      gpu.cometCoreMat.dispose();
      gpu.cometComaMat.dispose();
      gpu.cometTailGeo.dispose();
      gpu.cometTailMat.dispose();
    };
  }, [gpu]);

  const lastYearsRef = useRef(-1);
  const lastFlagsRef = useRef(-1);

  useFrame((state, delta) => {
    const store = useAppStore.getState();
    const dt = store.reducedMotion ? 0 : Math.min(Math.max(delta, 0.001), 0.05);
    const elapsed = store.reducedMotion ? 0 : state.clock.elapsedTime;

    const flagsMask =
      (store.terraformMirrors ? 1 : 0) |
      (store.terraformGhg ? 2 : 0) |
      (store.terraformComets ? 4 : 0);

    if (store.terraformYears !== lastYearsRef.current || flagsMask !== lastFlagsRef.current) {
      lastYearsRef.current = store.terraformYears;
      lastFlagsRef.current = flagsMask;
      const tf = evaluateMarsTerraform({
        years: store.terraformYears,
        mirrors: store.terraformMirrors,
        ghg: store.terraformGhg,
        comets: store.terraformComets,
      });

      gpu.marsMat.uniforms.uOceanLevel.value = tf.oceanPct / 46;
      gpu.marsMat.uniforms.uVegLevel.value = tf.vegetationPct / 38;
      gpu.marsMat.uniforms.uCloudLevel.value = Math.min(1, tf.pressureMbar / 820);
      gpu.marsMat.uniforms.uIceCapScale.value = tf.iceCapScale;
      const atmosBlue = Math.min(1, tf.pressureMbar / 750);
      gpu.marsMat.uniforms.uAtmosBlue.value = atmosBlue;
      gpu.haloMat.uniforms.uAtmosBlue.value = atmosBlue;
      gpu.marsMat.uniforms.uColonyLights.value = Math.max(0, (tf.habitabilityPct - 45) / 55);
    }

    gpu.marsMat.uniforms.uTime.value = elapsed;
    if (marsRef.current) {
      marsRef.current.rotation.y += dt * 0.12;
    }
    if (mirrorsGroupRef.current) {
      mirrorsGroupRef.current.rotation.y += dt * 0.24;
    }
    if (cometsGroupRef.current) {
      cometsGroupRef.current.rotation.y -= dt * 0.42;
      cometsGroupRef.current.rotation.z = 0.28;
    }
  });

  return (
    <group name="mars-terraform-lab">
      <ambientLight intensity={0.35} color="#cbd5e1" />
      <directionalLight position={[18, 9, 14]} intensity={2.4} color="#fff7ed" />

      <points geometry={gpu.starsGeo} material={gpu.starsMat} />

      <mesh ref={marsRef} position={[0, 0.55, 0]} geometry={gpu.marsGeo} material={gpu.marsMat} />
      <mesh position={[0, 0.55, 0]} geometry={gpu.haloGeo} material={gpu.haloMat} />

      {showMirrors && (
        <group ref={mirrorsGroupRef} position={[0, 0.55, 0]}>
          {[0, 1, 2].map((i) => {
            const ang = (i * Math.PI * 2) / 3 + 0.35;
            const x = Math.cos(ang) * 6.9;
            const z = Math.sin(ang) * 6.9;
            return (
              <group key={i} position={[x, -1.35, z]} rotation={[0.2, -ang + Math.PI / 2, 0]}>
                <mesh geometry={gpu.mirrorDiscGeo} material={gpu.mirrorMat} rotation={[Math.PI / 2, Math.PI / 6, 0]} />
                <mesh geometry={gpu.mirrorFrameGeo} material={gpu.frameMat} />
                {/* Reflected solar light shaft pointing inward and fading cleanly before Mars's limb */}
                <mesh position={[0, 0, -1.18]} rotation={[-Math.PI / 2, 0, 0]} geometry={gpu.beamGeo} material={gpu.beamMat} />
              </group>
            );
          })}
        </group>
      )}

      {showComets && (
        <group ref={cometsGroupRef} position={[0, 0.55, 0]}>
          {[0, 1].map((i) => {
            const ang = i * Math.PI + 0.6;
            return (
              <group key={i} position={[Math.cos(ang) * 7.8, 2.2 - i * 1.4, Math.sin(ang) * 7.8]} rotation={[0, -ang, Math.PI / 2]}>
                <mesh geometry={gpu.cometCoreGeo} material={gpu.cometCoreMat} />
                <sprite material={gpu.cometComaMat} scale={[0.78, 0.78, 1]} />
                <mesh position={[0, -1.32, 0]} geometry={gpu.cometTailGeo} material={gpu.cometTailMat} />
              </group>
            );
          })}
        </group>
      )}
    </group>
  );
};

export default MarsTerraformScene;
