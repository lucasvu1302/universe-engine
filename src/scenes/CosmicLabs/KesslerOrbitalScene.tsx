import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '@/stores/useAppStore';
import { AssetManager } from '@/engine/assets/AssetManager';

const EARTH_RADIUS = 4.1;
const SAT_COUNT = 2200;
const STAR_COUNT = 1600;

const _dummy = new THREE.Object3D();
const _tmpColor = new THREE.Color();

const ATMOS_VERT = /* glsl */ `
  varying vec3 vWorldNormal;
  varying vec3 vWorldPos;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const ATMOS_FRAG = /* glsl */ `
  varying vec3 vWorldNormal;
  varying vec3 vWorldPos;
  void main() {
    vec3 N = normalize(vWorldNormal);
    vec3 V = normalize(cameraPosition - vWorldPos);
    vec3 sunDir = normalize(vec3(0.68, 0.44, 0.58));
    float ndotv = clamp(dot(-N, V), 0.0, 1.0);
    // Normalized BackSide limb glow (R_halo = 1.10 R_earth -> geometric horizon ndotv ~ 0.42)
    float limb = smoothstep(0.0, 0.54, ndotv);
    float glow = pow(max(0.0001, limb), 2.1);
    float sunLit = 0.36 + 0.64 * max(dot(N, sunDir), 0.0);
    gl_FragColor = vec4(vec3(0.28, 0.72, 1.0), glow * sunLit * 0.88);
  }
`;

const HAZARD_FRAG = /* glsl */ `
  uniform float uIntensity;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPos;
  void main() {
    vec3 N = normalize(vWorldNormal);
    vec3 V = normalize(cameraPosition - vWorldPos);
    float limb = smoothstep(0.0, 0.62, clamp(dot(-N, V), 0.0, 1.0));
    float glow = pow(max(0.0001, limb), 2.4);
    gl_FragColor = vec4(vec3(0.95, 0.22, 0.14), glow * uIntensity);
  }
`;

export const KesslerOrbitalScene: React.FC = () => {
  const activeLab = useAppStore((s) => s.activeCosmicLab);
  const cascadeLevel = useAppStore((s) => s.kesslerCascadeLevel);
  const triggered = useAppStore((s) => s.kesslerTriggered);
  const playing = useAppStore((s) => s.kesslerPlaying);
  const isTabHidden = useAppStore((s) => s.isTabHidden);
  const reducedMotion = useAppStore((s) => s.reducedMotion);

  const earthRef = useRef<THREE.Mesh>(null);
  const cloudRef = useRef<THREE.Mesh>(null);
  const satMeshRef = useRef<THREE.InstancedMesh>(null);
  const issRef = useRef<THREE.Mesh>(null);
  const hazardShellRef = useRef<THREE.Mesh>(null);
  const simTimeRef = useRef<number>(0);
  // Primitive dirty-check refs (zero per-frame strings or dead allocations, INV1)
  const lastTriggeredRef = useRef<number>(-1);
  const lastDebrisPctRef = useRef<number>(-1);
  const lastUploadedTimeRef = useRef<number>(-1);

  const resources = useMemo(() => {
    const assets = AssetManager.getInstance();
    const earthTex = assets.loadTexture('earth_day');
    const cloudsTex = assets.loadTexture('earth_clouds');
    const softMap = assets.getSoftParticleMap();

    const earthGeo = new THREE.SphereGeometry(EARTH_RADIUS, 64, 48);
    const earthMat = new THREE.MeshStandardMaterial({
      map: earthTex,
      roughness: 0.62,
      metalness: 0.08,
    });

    const cloudsGeo = new THREE.SphereGeometry(EARTH_RADIUS * 1.015, 56, 40);
    const cloudsMat = new THREE.MeshStandardMaterial({
      map: cloudsTex,
      alphaMap: cloudsTex,
      transparent: true,
      opacity: 0.5,
      roughness: 0.9,
      depthWrite: false,
    });

    const atmosGeo = new THREE.SphereGeometry(EARTH_RADIUS * 1.1, 48, 32);
    const atmosMat = new THREE.ShaderMaterial({
      vertexShader: ATMOS_VERT,
      fragmentShader: ATMOS_FRAG,
      side: THREE.BackSide,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    // Soft volumetric red Kessler hazard aura around LEO shell
    const hazardGeo = new THREE.SphereGeometry(EARTH_RADIUS * 1.38, 48, 32);
    const hazardMat = new THREE.ShaderMaterial({
      vertexShader: ATMOS_VERT,
      fragmentShader: HAZARD_FRAG,
      uniforms: { uIntensity: { value: 0.0 } },
      side: THREE.BackSide,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    // ISS orbital ring at 51.6° inclination
    const issOrbitGeo = new THREE.TorusGeometry(EARTH_RADIUS * 1.15, 0.024, 10, 96);
    const issOrbitMat = new THREE.MeshBasicMaterial({
      color: '#38bdf8',
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    const issGeo = new THREE.OctahedronGeometry(0.15, 0);
    const issMat = new THREE.MeshBasicMaterial({ color: '#fde047' });

    // GEO equatorial reference belt
    const geoRingGeo = new THREE.TorusGeometry(8.5, 0.02, 10, 128);
    const geoRingMat = new THREE.MeshBasicMaterial({
      color: '#10b981',
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });

    // 2,200 crisp sleek micro-satellites & metallic debris shards (clean view of Earth beneath)
    const satGeo = new THREE.BoxGeometry(0.056, 0.018, 0.024);
    const satMat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.32,
      metalness: 0.65,
      emissive: '#ffffff',
      emissiveIntensity: 0.42,
    });

    // Orbital element buffer: [radius, inc, ascNode, phase0, omega, band(0=LEO,1=MEO,2=GEO), debrisThreshold]
    const satData = new Float32Array(SAT_COUNT * 7);
    for (let i = 0; i < SAT_COUNT; i++) {
      let band = 0;
      let r = 4.68;
      let inc = 0;
      let asc = 0;
      let phase0 = 0;
      let omega = 0.45;

      if (i < 1560) {
        band = 0;
        const plane = i % 24;
        r = 4.68 + (plane % 6) * 0.14 + (((i * 29) % 100) / 100) * 0.08;
        inc = plane < 16 ? THREE.MathUtils.degToRad(53 + (plane % 4) * 4) : THREE.MathUtils.degToRad(97.5);
        asc = (plane / 24) * Math.PI * 2;
        phase0 = (Math.floor(i / 24) / 65) * Math.PI * 2 + plane * 0.17;
        omega = 0.56 - (r - 4.68) * 0.14;
      } else if (i < 1920) {
        band = 1;
        const plane = i % 6;
        r = 6.65 + (((i * 17) % 100) / 100) * 0.18;
        inc = THREE.MathUtils.degToRad(55);
        asc = (plane / 6) * Math.PI * 2;
        phase0 = (i * 2.399963) % (Math.PI * 2);
        omega = 0.24;
      } else {
        band = 2;
        r = 8.5 + (((i * 13) % 100) / 100 - 0.5) * 0.12;
        inc = (((i * 23) % 100) / 100 - 0.5) * 0.06;
        asc = 0;
        phase0 = ((i - 1920) / (SAT_COUNT - 1920)) * Math.PI * 2;
        omega = 0.11;
      }

      const debrisThreshold = ((i * 733) % 1000) / 1000;
      satData[i * 7] = r;
      satData[i * 7 + 1] = inc;
      satData[i * 7 + 2] = asc;
      satData[i * 7 + 3] = phase0;
      satData[i * 7 + 4] = omega;
      satData[i * 7 + 5] = band;
      satData[i * 7 + 6] = debrisThreshold;
    }

    // Background stars (soft circular sprites)
    const starPos = new Float32Array(STAR_COUNT * 3);
    for (let i = 0; i < STAR_COUNT; i++) {
      const u = ((i * 7919) % 10000) / 10000;
      const v = ((i * 3571) % 10000) / 10000;
      const theta = u * Math.PI * 2;
      const phi = Math.acos(2 * v - 1);
      const r = 68 + ((i * 167) % 40);
      starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = r * Math.cos(phi);
      starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({
      size: 0.5,
      map: softMap,
      color: '#cbd5e1',
      transparent: true,
      opacity: 0.82,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    return {
      earthGeo,
      earthMat,
      cloudsGeo,
      cloudsMat,
      atmosGeo,
      atmosMat,
      hazardGeo,
      hazardMat,
      issOrbitGeo,
      issOrbitMat,
      issGeo,
      issMat,
      geoRingGeo,
      geoRingMat,
      satGeo,
      satMat,
      satData,
      starGeo,
      starMat,
    };
  }, []);

  useEffect(() => {
    return () => {
      resources.earthGeo.dispose();
      resources.earthMat.dispose();
      resources.cloudsGeo.dispose();
      resources.cloudsMat.dispose();
      resources.atmosGeo.dispose();
      resources.atmosMat.dispose();
      resources.hazardGeo.dispose();
      resources.hazardMat.dispose();
      resources.issOrbitGeo.dispose();
      resources.issOrbitMat.dispose();
      resources.issGeo.dispose();
      resources.issMat.dispose();
      resources.geoRingGeo.dispose();
      resources.geoRingMat.dispose();
      resources.satGeo.dispose();
      resources.satMat.dispose();
      resources.starGeo.dispose();
      resources.starMat.dispose();
    };
  }, [resources]);

  useFrame((_, delta) => {
    if (activeLab !== 'kessler_leo' || isTabHidden) return;
    const dt = Math.min(delta, 0.05);

    if (playing && !reducedMotion) {
      simTimeRef.current += dt;
    }
    const simT = simTimeRef.current;

    if (!reducedMotion) {
      if (earthRef.current) earthRef.current.rotation.y += dt * 0.11;
      if (cloudRef.current) cloudRef.current.rotation.y += dt * 0.135;
    }

    const debrisFrac = triggered ? Math.min(0.95, 0.28 + cascadeLevel * 0.67) : cascadeLevel * 0.18;
    const trigInt = triggered ? 1 : 0;
    const debrisPct = Math.round(debrisFrac * 100);

    if (hazardShellRef.current) {
      const intensity = triggered ? 0.16 + cascadeLevel * 0.34 : cascadeLevel * 0.06;
      resources.hazardMat.uniforms.uIntensity.value = intensity;
      hazardShellRef.current.visible = intensity > 0.015;
    }

    if (issRef.current) {
      const issAngle = simT * 0.72;
      const rIss = EARTH_RADIUS * 1.15;
      const incIss = THREE.MathUtils.degToRad(51.6);
      const x0 = Math.cos(issAngle) * rIss;
      const z0 = Math.sin(issAngle) * rIss;
      issRef.current.position.set(x0, z0 * Math.sin(incIss), z0 * Math.cos(incIss));
    }

    const mesh = satMeshRef.current;
    if (mesh) {
      const needsColorUpdate = lastTriggeredRef.current !== trigInt || lastDebrisPctRef.current !== debrisPct;
      const needsMatrixUpdate = needsColorUpdate || lastUploadedTimeRef.current !== simT;

      if (needsMatrixUpdate) {
        lastTriggeredRef.current = trigInt;
        lastDebrisPctRef.current = debrisPct;
        lastUploadedTimeRef.current = simT;

        const data = resources.satData;
        for (let i = 0; i < SAT_COUNT; i++) {
          const idx = i * 7;
          const band = data[idx + 5];
          const threshold = data[idx + 6];
          const isDebris = band === 0 && threshold < debrisFrac;

          const rBase = data[idx];
          const jitterR = isDebris ? Math.sin(simT * 3.1 + i) * 0.2 * (0.4 + cascadeLevel) : 0;
          const r = rBase + jitterR;
          const inc = data[idx + 1] + (isDebris ? Math.cos(i * 1.7) * 0.24 * debrisFrac : 0);
          const asc = data[idx + 2];
          const ph = data[idx + 3] + simT * data[idx + 4] * (isDebris ? 1.28 : 1.0);

          const x0 = Math.cos(ph) * r;
          const z0 = Math.sin(ph) * r;
          const y1 = z0 * Math.sin(inc);
          const z1 = z0 * Math.cos(inc);

          const x = x0 * Math.cos(asc) - z1 * Math.sin(asc);
          const z = x0 * Math.sin(asc) + z1 * Math.cos(asc);

          _dummy.position.set(x, y1, z);
          _dummy.rotation.set(isDebris ? simT * 2.5 + i : 0, ph, 0);
          const sc = isDebris ? 0.92 : band === 2 ? 1.0 : 0.78;
          _dummy.scale.setScalar(sc);
          _dummy.updateMatrix();
          mesh.setMatrixAt(i, _dummy.matrix);

          if (needsColorUpdate) {
            if (isDebris) {
              _tmpColor.set(i % 2 === 0 ? '#f97316' : '#ef4444');
            } else if (band === 0) {
              _tmpColor.set(i % 3 === 0 ? '#38bdf8' : '#e2e8f0');
            } else if (band === 1) {
              _tmpColor.set('#fbbf24');
            } else {
              _tmpColor.set('#34d399');
            }
            mesh.setColorAt(i, _tmpColor);
          }
        }
        mesh.instanceMatrix.needsUpdate = true;
        if (needsColorUpdate && mesh.instanceColor) {
          mesh.instanceColor.needsUpdate = true;
        }
      }
    }
  });

  if (activeLab !== 'kessler_leo') return null;

  return (
    <group name="kessler-orbital-lab-root">
      <ambientLight intensity={0.42} />
      <directionalLight position={[14, 9, 12]} intensity={2.1} color="#fff7eb" />
      <directionalLight position={[-10, -6, -10]} intensity={0.45} color="#60a5fa" />

      <points geometry={resources.starGeo} material={resources.starMat} />

      {/* Earth + drifting clouds + normalized Rayleigh atmosphere + volumetric LEO Kessler aura */}
      <mesh ref={earthRef} geometry={resources.earthGeo} material={resources.earthMat} />
      <mesh ref={cloudRef} geometry={resources.cloudsGeo} material={resources.cloudsMat} />
      <mesh geometry={resources.atmosGeo} material={resources.atmosMat} />
      <mesh ref={hazardShellRef} geometry={resources.hazardGeo} material={resources.hazardMat} />

      {/* ISS 51.6° Orbit & Marker */}
      <mesh
        geometry={resources.issOrbitGeo}
        material={resources.issOrbitMat}
        rotation={[THREE.MathUtils.degToRad(90 - 51.6), 0, 0]}
      />
      <mesh ref={issRef} geometry={resources.issGeo} material={resources.issMat} />

      {/* GEO Geostationary Belt */}
      <mesh
        geometry={resources.geoRingGeo}
        material={resources.geoRingMat}
        rotation={[Math.PI / 2, 0, 0]}
      />

      {/* 2,200 Instanced Sleek Micro-Satellites & Cascading Debris */}
      <instancedMesh ref={satMeshRef} args={[resources.satGeo, resources.satMat, SAT_COUNT]} />
    </group>
  );
};
