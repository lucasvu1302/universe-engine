import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '@/stores/useAppStore';
import { EclipseState, evaluateEclipse } from '@/simulation/cosmic/CosmicPhysics';
import { AssetManager } from '@/engine/assets/AssetManager';
import eclipseCoronaFrag from '@/shaders/cosmic/eclipseCorona.frag.glsl';

const PLANE_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const BLOOD_MOON_VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormalWorld;
  varying vec3 vLocalPos;
  void main() {
    vUv = uv;
    vLocalPos = position;
    vNormalWorld = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const BLOOD_MOON_FRAG = /* glsl */ `
  precision highp float;
  uniform sampler2D uAlbedo;
  uniform float uRayleighRedness;
  uniform float uShadowOffsetX;
  varying vec2 vUv;
  varying vec3 vNormalWorld;
  varying vec3 vLocalPos;

  void main() {
    vec3 tex = texture2D(uAlbedo, vUv * 2.5).rgb;
    vec3 lightDir = normalize(vec3(0.32, 0.18, 0.93));
    float ndotl = clamp(dot(normalize(vNormalWorld), lightDir), 0.0, 1.0);

    vec2 discPos = vLocalPos.xy / 4.6;
    float shadowDist = length(discPos - vec2(uShadowOffsetX, 0.0));
    float inUmbra = 1.0 - smoothstep(0.62, 1.25, shadowDist);
    float penumbra = 1.0 - smoothstep(1.0, 1.75, shadowDist);

    vec3 silverLit = tex * (0.14 + 1.05 * ndotl);
    vec3 bloodTint = mix(vec3(0.45, 0.07, 0.03), vec3(0.92, 0.28, 0.09), clamp(0.28 + 0.72 * ndotl, 0.0, 1.0));
    vec3 bloodLit = tex * bloodTint * (0.55 + 0.85 * uRayleighRedness);

    vec3 col = mix(silverLit, silverLit * 0.45, penumbra * 0.55);
    col = mix(col, bloodLit, clamp(inUmbra * (0.4 + 0.6 * uRayleighRedness), 0.0, 1.0));
    gl_FragColor = vec4(col, 1.0);
  }
`;

const ORBIT_EARTH_VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormalWorld;
  varying vec3 vLocalPos;
  varying vec3 vWorldViewDir;
  void main() {
    vUv = uv;
    vLocalPos = position;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vNormalWorld = normalize(mat3(modelMatrix) * normal);
    vWorldViewDir = normalize(cameraPosition - worldPos.xyz);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const ORBIT_EARTH_FRAG = /* glsl */ `
  precision highp float;
  uniform float uUmbraX;
  uniform float uUmbraStrength;
  varying vec2 vUv;
  varying vec3 vNormalWorld;
  varying vec3 vLocalPos;
  varying vec3 vWorldViewDir;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  void main() {
    vec3 n = normalize(vNormalWorld);
    vec3 sunDir = normalize(vec3(0.18, 0.14, 0.97));
    float ndotl = clamp(dot(n, sunDir), 0.0, 1.0);

    float cont = noise(vUv * vec2(10.0, 6.0) + 1.4) * 0.65 + noise(vUv * vec2(22.0, 13.0)) * 0.35;
    float clouds = smoothstep(0.55, 0.82, noise(vUv * vec2(14.0, 9.0) + vec2(2.3, 0.7)));
    vec3 ocean = vec3(0.05, 0.24, 0.56);
    vec3 land = mix(vec3(0.14, 0.42, 0.22), vec3(0.62, 0.54, 0.36), smoothstep(0.56, 0.78, cont));
    vec3 baseCol = mix(ocean, land, smoothstep(0.52, 0.58, cont));
    baseCol = mix(baseCol, vec3(0.94, 0.96, 1.0), clouds * 0.52);

    vec2 proj = vLocalPos.xy / 5.2;
    float d = length(proj - vec2(uUmbraX, 0.06));
    float umbraMask = (1.0 - smoothstep(0.12, 0.26, d)) * uUmbraStrength;
    float penumbraMask = (1.0 - smoothstep(0.24, 0.54, d)) * uUmbraStrength * 0.55;
    float shadow = 1.0 - clamp(umbraMask * 0.92 + penumbraMask * 0.42, 0.0, 0.94);

    float viewDot = clamp(abs(dot(n, normalize(vWorldViewDir))), 0.0, 1.0);
    float rim = pow(clamp(1.0 - viewDot, 0.0, 1.0), 2.8) * 0.55;

    vec3 finalCol = baseCol * (0.08 + 1.05 * ndotl) * shadow + vec3(0.24, 0.62, 1.0) * rim * (0.25 + 0.75 * ndotl);
    gl_FragColor = vec4(finalCol, 1.0);
  }
`;

export const EclipseScene: React.FC = () => {
  const eclipseMode = useAppStore((s) => s.eclipseMode);
  const smoothPhaseRef = useRef(useAppStore.getState().eclipsePhase);
  const lastEvalModeRef = useRef(useAppStore.getState().eclipseMode);
  const lastEvalPhaseBucketRef = useRef(-1);
  const cachedEvalRef = useRef<EclipseState>(
    evaluateEclipse(useAppStore.getState().eclipseMode, useAppStore.getState().eclipsePhase)
  );

  const moonOcculterRef = useRef<THREE.Mesh>(null);
  const orbitMoonRef = useRef<THREE.Mesh>(null);
  const shadowConeRef = useRef<THREE.Mesh>(null);

  const assets = useMemo(() => AssetManager.getInstance(), []);
  const moonAlbedo = useMemo(() => assets.getRegolithAlbedoMap('moon'), [assets]);
  const moonBump = useMemo(() => assets.getRegolithBumpMap('moon'), [assets]);
  const softParticle = useMemo(() => assets.getSoftParticleMap(), [assets]);

  const gpu = useMemo(() => {
    const starCount = 1400;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const u = (Math.sin(i * 12.9898) * 43758.5453) % 1;
      const v = (Math.sin(i * 78.233 + 1.7) * 24634.6345) % 1;
      const theta = Math.abs(u) * Math.PI * 2;
      const phi = Math.acos(2 * Math.abs(v) - 1);
      const r = 135;
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.cos(phi);
      starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const starsGeo = new THREE.BufferGeometry();
    starsGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starsMat = new THREE.PointsMaterial({
      map: softParticle,
      color: '#e0f2fe',
      size: 0.65,
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
    });

    // Corona plane co-located right behind the lunar disc plane (z = +1.44 vs moon z = +1.50)
    // so perspective projection aligns lunar limb (3.06 / 12.0 = 0.255) with chromosphere & prominences!
    const coronaGeo = new THREE.PlaneGeometry(24, 24);
    const coronaMat = new THREE.ShaderMaterial({
      vertexShader: PLANE_VERT,
      fragmentShader: eclipseCoronaFrag,
      uniforms: {
        uTime: { value: 0 },
        uCoronaIntensity: { value: 1.0 },
        uDiamondRing: { value: 0.0 },
        uDiamondSide: { value: 1.0 },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const sunDiscGeo = new THREE.SphereGeometry(2.98, 48, 36);
    const sunDiscMat = new THREE.MeshBasicMaterial({ color: '#fff7ed' });

    // Subtle Earthshine illumination revealing faint lunar maria across the dark silhouette during totality
    const moonOcculterGeo = new THREE.SphereGeometry(3.06, 48, 36);
    const moonOcculterMat = new THREE.MeshStandardMaterial({
      map: moonAlbedo,
      bumpMap: moonBump,
      bumpScale: 0.1,
      color: '#0f172a',
      roughness: 0.96,
      metalness: 0.02,
      emissive: '#334e6f',
      emissiveMap: moonAlbedo,
      emissiveIntensity: 0.24,
    });

    const orbitEarthGeo = new THREE.SphereGeometry(5.2, 64, 48);
    const orbitEarthMat = new THREE.ShaderMaterial({
      vertexShader: ORBIT_EARTH_VERT,
      fragmentShader: ORBIT_EARTH_FRAG,
      uniforms: {
        uUmbraX: { value: 0 },
        uUmbraStrength: { value: 1 },
      },
    });
    const orbitMoonGeo = new THREE.SphereGeometry(1.35, 36, 28);
    const orbitMoonMat = new THREE.MeshStandardMaterial({
      map: moonAlbedo,
      bumpMap: moonBump,
      bumpScale: 0.06,
      color: '#cbd5e1',
      roughness: 0.92,
    });
    const shadowConeGeo = new THREE.ConeGeometry(1.42, 9.0, 32, 1, true);
    const shadowConeMat = new THREE.MeshBasicMaterial({
      color: '#020617',
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const bloodMoonGeo = new THREE.SphereGeometry(4.6, 64, 48);
    const bloodMoonMat = new THREE.ShaderMaterial({
      vertexShader: BLOOD_MOON_VERT,
      fragmentShader: BLOOD_MOON_FRAG,
      uniforms: {
        uAlbedo: { value: moonAlbedo },
        uRayleighRedness: { value: 1.0 },
        uShadowOffsetX: { value: 0.0 },
      },
    });
    const earthRingGeo = new THREE.RingGeometry(6.6, 7.15, 64);
    const earthRingMat = new THREE.MeshBasicMaterial({
      color: '#f97316',
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    return {
      starsGeo,
      starsMat,
      coronaGeo,
      coronaMat,
      sunDiscGeo,
      sunDiscMat,
      moonOcculterGeo,
      moonOcculterMat,
      orbitEarthGeo,
      orbitEarthMat,
      orbitMoonGeo,
      orbitMoonMat,
      shadowConeGeo,
      shadowConeMat,
      bloodMoonGeo,
      bloodMoonMat,
      earthRingGeo,
      earthRingMat,
    };
  }, [moonAlbedo, moonBump, softParticle]);

  useEffect(() => {
    return () => {
      gpu.starsGeo.dispose();
      gpu.starsMat.dispose();
      gpu.coronaGeo.dispose();
      gpu.coronaMat.dispose();
      gpu.sunDiscGeo.dispose();
      gpu.sunDiscMat.dispose();
      gpu.moonOcculterGeo.dispose();
      gpu.moonOcculterMat.dispose();
      gpu.orbitEarthGeo.dispose();
      gpu.orbitEarthMat.dispose();
      gpu.orbitMoonGeo.dispose();
      gpu.orbitMoonMat.dispose();
      gpu.shadowConeGeo.dispose();
      gpu.shadowConeMat.dispose();
      gpu.bloodMoonGeo.dispose();
      gpu.bloodMoonMat.dispose();
      gpu.earthRingGeo.dispose();
      gpu.earthRingMat.dispose();
    };
  }, [gpu]);

  useFrame((state, delta) => {
    const dt = Math.min(Math.max(delta, 0.001), 0.05);
    const store = useAppStore.getState();

    // Snap cleanly on playback loop wrap (1 -> 0) instead of sweeping backward across totality (F6)
    if (store.eclipsePhase < smoothPhaseRef.current - 0.35) {
      smoothPhaseRef.current = store.eclipsePhase;
    } else {
      const damp = 1 - Math.exp(-14 * dt);
      smoothPhaseRef.current = THREE.MathUtils.lerp(smoothPhaseRef.current, store.eclipsePhase, damp);
    }

    // Zero-alloc primitive dirty-check to avoid per-frame string/object allocation when phase is steady (F5/F8)
    const phaseBucket = Math.round(smoothPhaseRef.current * 2000);
    if (store.eclipseMode !== lastEvalModeRef.current || phaseBucket !== lastEvalPhaseBucketRef.current) {
      lastEvalModeRef.current = store.eclipseMode;
      lastEvalPhaseBucketRef.current = phaseBucket;
      cachedEvalRef.current = evaluateEclipse(store.eclipseMode, smoothPhaseRef.current);
    }
    const evalState = cachedEvalRef.current;

    gpu.coronaMat.uniforms.uTime.value = store.reducedMotion ? 0 : state.clock.elapsedTime;
    gpu.coronaMat.uniforms.uCoronaIntensity.value = Math.max(0.18, evalState.coronaIntensity);
    gpu.coronaMat.uniforms.uDiamondRing.value = evalState.diamondRingIntensity;
    gpu.coronaMat.uniforms.uDiamondSide.value = smoothPhaseRef.current <= 0.5 ? 1.0 : -1.0;

    if (moonOcculterRef.current) {
      moonOcculterRef.current.position.set(evalState.moonOffsetX * 2.1, 0, 1.5);
    }

    gpu.orbitEarthMat.uniforms.uUmbraX.value = (smoothPhaseRef.current - 0.5) * 1.15;
    gpu.orbitEarthMat.uniforms.uUmbraStrength.value = evalState.umbraStrength;

    if (orbitMoonRef.current) {
      orbitMoonRef.current.position.set((smoothPhaseRef.current - 0.5) * 6.5, 0.5, 9.2);
    }
    if (shadowConeRef.current) {
      shadowConeRef.current.position.set((smoothPhaseRef.current - 0.5) * 6.1, 0.4, 4.7);
    }

    gpu.bloodMoonMat.uniforms.uRayleighRedness.value = evalState.rayleighRedness;
    gpu.bloodMoonMat.uniforms.uShadowOffsetX.value = (smoothPhaseRef.current - 0.5) * 2.6;
  });

  return (
    <group name="eclipse-cosmic-lab">
      <ambientLight intensity={0.28} color="#94a3b8" />
      <directionalLight position={[12, 8, 22]} intensity={1.85} color="#fff7ed" />
      <points geometry={gpu.starsGeo} material={gpu.starsMat} />

      {eclipseMode === 'solar_ground' && (
        <group>
          <mesh position={[0, 0, 1.44]} geometry={gpu.coronaGeo} material={gpu.coronaMat} />
          <mesh position={[0, 0, -1.65]} geometry={gpu.sunDiscGeo} material={gpu.sunDiscMat} />
          <mesh
            ref={moonOcculterRef}
            position={[0, 0, 1.5]}
            rotation={[0, 1.2, 0]}
            geometry={gpu.moonOcculterGeo}
            material={gpu.moonOcculterMat}
          />
        </group>
      )}

      {eclipseMode === 'solar_orbit' && (
        <group>
          <mesh position={[0, 0, -2.0]} geometry={gpu.orbitEarthGeo} material={gpu.orbitEarthMat} />
          <mesh ref={orbitMoonRef} position={[0, 0.5, 9.2]} geometry={gpu.orbitMoonGeo} material={gpu.orbitMoonMat} />
          <mesh
            ref={shadowConeRef}
            position={[0, 0.4, 4.7]}
            rotation={[Math.PI / 2, 0, 0]}
            geometry={gpu.shadowConeGeo}
            material={gpu.shadowConeMat}
          />
        </group>
      )}

      {eclipseMode === 'lunar_blood' && (
        <group>
          <mesh position={[0, 0, 0]} geometry={gpu.bloodMoonGeo} material={gpu.bloodMoonMat} />
          <mesh position={[0, 0, -14]} geometry={gpu.earthRingGeo} material={gpu.earthRingMat} />
        </group>
      )}
    </group>
  );
};

export default EclipseScene;
