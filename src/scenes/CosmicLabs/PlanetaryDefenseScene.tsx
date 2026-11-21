import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '@/stores/useAppStore';
import { evaluatePlanetaryDefense } from '@/simulation/cosmic/Wave2Physics';
import { AssetManager } from '@/engine/assets/AssetManager';
import { AudioManager } from '@/engine/audio/AudioManager';

const EARTH_POS = new THREE.Vector3(6.2, 0, 0);
const EARTH_RADIUS = 2.65;
const ASTEROID_START = new THREE.Vector3(-12.5, 0.4, 1.8);
const INTERCEPT_POINT = new THREE.Vector3(-4.2, 0.2, 0.65);
const TRAJECTORY_SAMPLES = 40;
const PLUME_COUNT = 180;
const STAR_COUNT = 1600;
const _laserUp = new THREE.Vector3(0, 1, 0);
const _laserDir = new THREE.Vector3();

const HALO_VERT = /* glsl */ `
  varying vec3 vWorldNormal;
  varying vec3 vWorldPos;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const HALO_FRAG = /* glsl */ `
  varying vec3 vWorldNormal;
  varying vec3 vWorldPos;
  void main() {
    vec3 N = normalize(vWorldNormal);
    vec3 V = normalize(cameraPosition - vWorldPos);
    vec3 sunDir = normalize(vec3(-0.52, 0.56, 0.64));
    float ndotv = clamp(dot(-N, V), 0.0, 1.0);
    // Normalized BackSide limb glow (R_halo = 1.11 R_earth -> geometric horizon ndotv ~ 0.43)
    float limb = smoothstep(0.0, 0.54, ndotv);
    float glow = pow(max(0.0001, limb), 2.1);
    float sunLit = 0.36 + 0.64 * max(dot(N, sunDir), 0.0);
    gl_FragColor = vec4(vec3(0.28, 0.72, 1.0), glow * sunLit * 0.88);
  }
`;

function buildDeflectedTube(visualMissY: number, visualMissZ: number): THREE.TubeGeometry {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i < TRAJECTORY_SAMPLES; i++) {
    const f = i / (TRAJECTORY_SAMPLES - 1);
    const x = THREE.MathUtils.lerp(INTERCEPT_POINT.x, EARTH_POS.x + 5.4, f);
    const curve = f * f;
    const y = THREE.MathUtils.lerp(INTERCEPT_POINT.y, EARTH_POS.y, Math.min(1, f * 1.25)) + curve * visualMissY;
    const z = THREE.MathUtils.lerp(INTERCEPT_POINT.z, EARTH_POS.z, Math.min(1, f * 1.25)) + curve * visualMissZ;
    pts.push(new THREE.Vector3(x, y, z));
  }
  const curvePath = new THREE.CatmullRomCurve3(pts);
  return new THREE.TubeGeometry(curvePath, 48, 0.045, 8, false);
}

export const PlanetaryDefenseScene: React.FC = () => {
  const activeLab = useAppStore((s) => s.activeCosmicLab);
  const defenseMethod = useAppStore((s) => s.defenseMethod);
  const defenseLeadDays = useAppStore((s) => s.defenseLeadDays);
  const defenseLaunched = useAppStore((s) => s.defenseLaunched);
  const defenseResetNonce = useAppStore((s) => s.defenseResetNonce);
  const isTabHidden = useAppStore((s) => s.isTabHidden);
  const reducedMotion = useAppStore((s) => s.reducedMotion);

  const earthMeshRef = useRef<THREE.Mesh>(null);
  const cloudMeshRef = useRef<THREE.Mesh>(null);
  const asteroidRef = useRef<THREE.Mesh>(null);
  const deflectTubeMeshRef = useRef<THREE.Mesh>(null);
  const dartShipRef = useRef<THREE.Group>(null);
  const tractorGroupRef = useRef<THREE.Group>(null);
  const laserGroupRef = useRef<THREE.Group>(null);
  const laserBeamRef = useRef<THREE.Mesh>(null);
  const plumeRef = useRef<THREE.Points>(null);

  const missionProgressRef = useRef<number>(0);
  const impactAudioFiredRef = useRef<boolean>(false);
  const lastResetNonceRef = useRef<number>(defenseResetNonce);
  const lastMethodRef = useRef<string>('');
  const lastLeadRef = useRef<number>(-1);
  // Cached physics values updated only on input change (strict INV1 zero per-frame alloc)
  const cachedSafeRef = useRef<boolean>(true);
  const cachedMissYRef = useRef<number>(4.8);
  const cachedMissZRef = useRef<number>(-3.4);

  const resources = useMemo(() => {
    const assets = AssetManager.getInstance();
    const earthTex = assets.loadTexture('earth_day');
    const cloudsTex = assets.loadTexture('earth_clouds');
    const moonTex = assets.loadTexture('moon');
    const kaptonTex = assets.getKaptonFoilMap();
    const solarTex = assets.getSolarArrayMap();
    const softMap = assets.getSoftParticleMap();

    const earthGeo = new THREE.SphereGeometry(EARTH_RADIUS, 64, 48);
    const earthMat = new THREE.MeshStandardMaterial({
      map: earthTex,
      roughness: 0.62,
      metalness: 0.08,
    });

    const cloudsGeo = new THREE.SphereGeometry(EARTH_RADIUS * 1.016, 56, 40);
    const cloudsMat = new THREE.MeshStandardMaterial({
      map: cloudsTex,
      alphaMap: cloudsTex,
      transparent: true,
      opacity: 0.52,
      roughness: 0.9,
      depthWrite: false,
    });

    const haloGeo = new THREE.SphereGeometry(EARTH_RADIUS * 1.11, 48, 32);
    const haloMat = new THREE.ShaderMaterial({
      vertexShader: HALO_VERT,
      fragmentShader: HALO_FRAG,
      side: THREE.BackSide,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    // Earth atmospheric safety buffer ring
    const shieldRingGeo = new THREE.RingGeometry(EARTH_RADIUS * 1.24, EARTH_RADIUS * 1.29, 72);
    const shieldRingMat = new THREE.MeshBasicMaterial({
      color: '#38bdf8',
      transparent: true,
      opacity: 0.34,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const moonGeo = new THREE.SphereGeometry(0.68, 36, 28);
    const moonMat = new THREE.MeshStandardMaterial({
      map: moonTex,
      roughness: 0.9,
      metalness: 0.02,
    });

    // Welded deterministic Apophis asteroid mesh (zero UV seam cracks)
    const asteroidGeo = new THREE.IcosahedronGeometry(0.68, 3);
    const pos = asteroidGeo.attributes.position as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).normalize();
      const ridge = Math.sin(v.x * 5.2 + v.y * 3.1) * 0.14 + Math.cos(v.z * 6.4 - v.x * 2.5) * 0.1;
      const crater = Math.max(0, 0.25 - v.distanceTo(new THREE.Vector3(0.6, 0.4, 0.65))) * 0.55;
      const rad = 0.68 * (1.0 + ridge - crater);
      pos.setXYZ(i, v.x * rad * 1.22, v.y * rad * 0.86, v.z * rad * 0.95);
    }
    asteroidGeo.computeVertexNormals();
    const asteroidMat = new THREE.MeshStandardMaterial({
      map: moonTex,
      color: '#9ca3af',
      roughness: 0.92,
      metalness: 0.12,
    });

    // Crisp slim glowing TubeGeometry for original crimson collision path
    const impactPts: THREE.Vector3[] = [];
    for (let i = 0; i < TRAJECTORY_SAMPLES; i++) {
      const f = i / (TRAJECTORY_SAMPLES - 1);
      impactPts.push(
        new THREE.Vector3(
          THREE.MathUtils.lerp(ASTEROID_START.x, EARTH_POS.x, f),
          THREE.MathUtils.lerp(ASTEROID_START.y, EARTH_POS.y, f) + Math.sin(f * Math.PI) * 0.45,
          THREE.MathUtils.lerp(ASTEROID_START.z, EARTH_POS.z, f) - Math.sin(f * Math.PI) * 0.5
        )
      );
    }
    const impactTubeGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(impactPts), 48, 0.04, 8, false);
    const impactTubeMat = new THREE.MeshBasicMaterial({
      color: '#ef4444',
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
    });

    // Deflected post-intercept glowing TubeGeometry (rebuilt only on slider/method change)
    const initialDeflectGeo = buildDeflectedTube(4.8, -3.4);
    const deflectTubeMat = new THREE.MeshBasicMaterial({
      color: '#34d399',
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
    });

    // DART spacecraft bus + solar arrays
    const busGeo = new THREE.BoxGeometry(0.42, 0.42, 0.48);
    const busMat = new THREE.MeshStandardMaterial({
      map: kaptonTex,
      color: '#fcd34d',
      emissive: '#b45309',
      emissiveIntensity: 0.45,
      roughness: 0.25,
      metalness: 0.85,
    });
    const panelGeo = new THREE.BoxGeometry(1.8, 0.04, 0.38);
    const panelMat = new THREE.MeshStandardMaterial({
      map: solarTex,
      color: '#38bdf8',
      emissive: '#0284c7',
      emissiveIntensity: 0.35,
      roughness: 0.22,
      metalness: 0.68,
    });

    // Gravity Tractor tether rings
    const tractorRingGeo = new THREE.TorusGeometry(0.85, 0.03, 12, 48);
    const tractorRingMat = new THREE.MeshBasicMaterial({
      color: '#38bdf8',
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    // Laser Ablation focused sapphire beam
    const laserBeamGeo = new THREE.CylinderGeometry(0.04, 0.14, 1.0, 16, 1, true);
    const laserBeamMat = new THREE.MeshBasicMaterial({
      color: '#38bdf8',
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    // Directional golden-amber kinetic ejecta cone (no clipped whiteout blob)
    const plumePositions = new Float32Array(PLUME_COUNT * 3);
    const plumeVelocities = new Float32Array(PLUME_COUNT * 3);
    const plumeColors = new Float32Array(PLUME_COUNT * 3);
    const tmpCol = new THREE.Color();
    for (let i = 0; i < PLUME_COUNT; i++) {
      const a = (((i * 2654435761) % 1000) / 1000) * Math.PI * 2;
      const radial = 0.2 + (((i * 97) % 100) / 100) * 1.15;
      const speed = 0.7 + (((i * 41) % 100) / 100) * 1.45;
      plumeVelocities[i * 3] = -speed * 1.15 - 0.35;
      plumeVelocities[i * 3 + 1] = Math.sin(a) * radial * 0.95;
      plumeVelocities[i * 3 + 2] = Math.cos(a) * radial * 0.95;
      tmpCol.setHSL(0.075 + (i % 7) * 0.012, 0.88, 0.5 + (i % 4) * 0.06);
      plumeColors[i * 3] = tmpCol.r;
      plumeColors[i * 3 + 1] = tmpCol.g;
      plumeColors[i * 3 + 2] = tmpCol.b;
    }
    const plumeGeo = new THREE.BufferGeometry();
    plumeGeo.setAttribute('position', new THREE.BufferAttribute(plumePositions, 3));
    plumeGeo.setAttribute('color', new THREE.BufferAttribute(plumeColors, 3));
    const plumeMat = new THREE.PointsMaterial({
      size: 0.36,
      map: softMap,
      vertexColors: true,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    // Background deep-space stars (soft circular sprites)
    const starPos = new Float32Array(STAR_COUNT * 3);
    for (let i = 0; i < STAR_COUNT; i++) {
      const u = ((i * 7919) % 10000) / 10000;
      const v2 = ((i * 3571) % 10000) / 10000;
      const theta = u * Math.PI * 2;
      const phi = Math.acos(2 * v2 - 1);
      const r = 68 + ((i * 173) % 45);
      starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = r * Math.cos(phi);
      starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({
      size: 0.52,
      map: softMap,
      color: '#cbd5e1',
      transparent: true,
      opacity: 0.84,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    return {
      earthGeo,
      earthMat,
      cloudsGeo,
      cloudsMat,
      haloGeo,
      haloMat,
      shieldRingGeo,
      shieldRingMat,
      moonGeo,
      moonMat,
      asteroidGeo,
      asteroidMat,
      impactTubeGeo,
      impactTubeMat,
      initialDeflectGeo,
      deflectTubeMat,
      busGeo,
      busMat,
      panelGeo,
      panelMat,
      tractorRingGeo,
      tractorRingMat,
      laserBeamGeo,
      laserBeamMat,
      plumeGeo,
      plumeMat,
      plumeVelocities,
      starGeo,
      starMat,
    };
  }, []);

  const activeDeflectGeoRef = useRef<THREE.TubeGeometry>(resources.initialDeflectGeo);

  useEffect(() => {
    return () => {
      resources.earthGeo.dispose();
      resources.earthMat.dispose();
      resources.cloudsGeo.dispose();
      resources.cloudsMat.dispose();
      resources.haloGeo.dispose();
      resources.haloMat.dispose();
      resources.shieldRingGeo.dispose();
      resources.shieldRingMat.dispose();
      resources.moonGeo.dispose();
      resources.moonMat.dispose();
      resources.asteroidGeo.dispose();
      resources.asteroidMat.dispose();
      resources.impactTubeGeo.dispose();
      resources.impactTubeMat.dispose();
      activeDeflectGeoRef.current.dispose();
      resources.deflectTubeMat.dispose();
      resources.busGeo.dispose();
      resources.busMat.dispose();
      resources.panelGeo.dispose();
      resources.panelMat.dispose();
      resources.tractorRingGeo.dispose();
      resources.tractorRingMat.dispose();
      resources.laserBeamGeo.dispose();
      resources.laserBeamMat.dispose();
      resources.plumeGeo.dispose();
      resources.plumeMat.dispose();
      resources.starGeo.dispose();
      resources.starMat.dispose();
    };
  }, [resources]);

  useFrame((state, delta) => {
    if (activeLab !== 'planetary_defense' || isTabHidden) return;
    const dt = Math.min(delta, 0.05);
    const t = reducedMotion ? 0 : state.clock.elapsedTime;

    if (lastResetNonceRef.current !== defenseResetNonce) {
      lastResetNonceRef.current = defenseResetNonce;
      missionProgressRef.current = 0;
      impactAudioFiredRef.current = false;
    }
    if (!defenseLaunched) {
      missionProgressRef.current = 0;
      impactAudioFiredRef.current = false;
    }

    // Recompute deflection physics & rebuild tube ONLY when method or leadDays changes (INV1 zero per-frame alloc)
    if (lastMethodRef.current !== defenseMethod || Math.abs(lastLeadRef.current - defenseLeadDays) > 0.01) {
      lastMethodRef.current = defenseMethod;
      lastLeadRef.current = defenseLeadDays;

      const evalState = evaluatePlanetaryDefense(defenseMethod, defenseLeadDays);
      const isSafe = evalState.outcome === 'SAFE';
      const visualMissY = isSafe
        ? Math.max(3.9, Math.min(7.2, 2.8 + evalState.deflectionAngleDeg * 0.42))
        : Math.min(1.65, evalState.deflectionAngleDeg * 0.45);
      const visualMissZ = isSafe ? -3.4 : -0.6;

      cachedSafeRef.current = isSafe;
      cachedMissYRef.current = visualMissY;
      cachedMissZRef.current = visualMissZ;

      const nextGeo = buildDeflectedTube(visualMissY, visualMissZ);
      if (deflectTubeMeshRef.current) {
        deflectTubeMeshRef.current.geometry = nextGeo;
      }
      activeDeflectGeoRef.current.dispose();
      activeDeflectGeoRef.current = nextGeo;
      resources.deflectTubeMat.color.set(isSafe ? '#34d399' : '#f87171');
    }

    const isSafe = cachedSafeRef.current;
    const visualMissY = cachedMissYRef.current;
    const visualMissZ = cachedMissZRef.current;

    if (!reducedMotion) {
      if (earthMeshRef.current) earthMeshRef.current.rotation.y += dt * 0.14;
      if (cloudMeshRef.current) cloudMeshRef.current.rotation.y += dt * 0.17;
    }

    // Advance mission progress smoothly when launched
    if (defenseLaunched) {
      if (!impactAudioFiredRef.current) {
        impactAudioFiredRef.current = true;
        AudioManager.getInstance().playDefenseImpact();
      }
      missionProgressRef.current = Math.min(1, missionProgressRef.current + dt * (reducedMotion ? 0.55 : 0.34));
    }

    const prog = defenseLaunched ? missionProgressRef.current : reducedMotion ? 0.22 : 0.22 + Math.sin(t * 0.7) * 0.04;

    let ax = INTERCEPT_POINT.x;
    let ay = INTERCEPT_POINT.y;
    let az = INTERCEPT_POINT.z;
    if (prog < 0.38) {
      const f = prog / 0.38;
      ax = THREE.MathUtils.lerp(ASTEROID_START.x, INTERCEPT_POINT.x, f);
      ay = THREE.MathUtils.lerp(ASTEROID_START.y, INTERCEPT_POINT.y, f);
      az = THREE.MathUtils.lerp(ASTEROID_START.z, INTERCEPT_POINT.z, f);
    } else {
      const f = (prog - 0.38) / 0.62;
      const curve = f * f;
      ax = THREE.MathUtils.lerp(INTERCEPT_POINT.x, EARTH_POS.x + (isSafe ? 4.4 : -EARTH_RADIUS * 0.7), f);
      ay = THREE.MathUtils.lerp(INTERCEPT_POINT.y, EARTH_POS.y, Math.min(1, f * 1.25)) + curve * visualMissY;
      az = THREE.MathUtils.lerp(INTERCEPT_POINT.z, EARTH_POS.z, Math.min(1, f * 1.25)) + curve * visualMissZ;
    }

    if (asteroidRef.current) {
      asteroidRef.current.position.set(ax, ay, az);
      if (!reducedMotion) {
        asteroidRef.current.rotation.x += dt * 0.75;
        asteroidRef.current.rotation.y += dt * 0.55;
      }
    }

    if (dartShipRef.current) {
      const showDart = defenseMethod === 'kinetic_dart';
      dartShipRef.current.visible = showDart && (!defenseLaunched || prog < 0.42);
      if (showDart) {
        const dartF = defenseLaunched ? Math.min(1, prog / 0.38) : 0.3;
        dartShipRef.current.position.set(
          THREE.MathUtils.lerp(-2.4, INTERCEPT_POINT.x, dartF),
          THREE.MathUtils.lerp(3.8, INTERCEPT_POINT.y, dartF),
          THREE.MathUtils.lerp(4.6, INTERCEPT_POINT.z, dartF)
        );
        dartShipRef.current.lookAt(INTERCEPT_POINT);
      }
    }

    if (tractorGroupRef.current) {
      const showTractor = defenseMethod === 'gravity_tractor';
      tractorGroupRef.current.visible = showTractor;
      if (showTractor) {
        tractorGroupRef.current.position.set(ax + 0.5, ay + 2.0, az - 0.6);
        tractorGroupRef.current.rotation.y = reducedMotion ? 0 : t * 1.1;
      }
    }

    if (laserGroupRef.current) {
      const showLaser = defenseMethod === 'laser_ablation';
      laserGroupRef.current.visible = showLaser;
      if (showLaser) {
        const satX = ax - 2.6;
        const satY = ay + 2.8;
        const satZ = az + 1.8;
        laserGroupRef.current.position.set(satX, satY, satZ);
        if (laserBeamRef.current) {
          const dx = ax - satX;
          const dy = ay - satY;
          const dz = az - satZ;
          const dist = Math.max(0.001, Math.hypot(dx, dy, dz));
          laserBeamRef.current.scale.set(1, dist, 1);
          laserBeamRef.current.position.set(dx * 0.5, dy * 0.5, dz * 0.5);
          _laserDir.set(dx / dist, dy / dist, dz / dist);
          laserBeamRef.current.quaternion.setFromUnitVectors(_laserUp, _laserDir);
          resources.laserBeamMat.opacity = defenseLaunched
            ? reducedMotion
              ? 0.78
              : 0.72 + Math.sin(t * 16) * 0.16
            : 0.32;
        }
      }
    }

    // Animate impact ejecta / ablation cone smoothly fading to 0 once spent (zero whiteout)
    if (plumeRef.current) {
      const showPlume =
        (defenseMethod === 'kinetic_dart' && defenseLaunched && prog >= 0.38) ||
        (defenseMethod === 'laser_ablation' && defenseLaunched);
      if (showPlume) {
        const burstAge =
          defenseMethod === 'kinetic_dart'
            ? Math.min(1, (prog - 0.38) * 1.85)
            : reducedMotion
            ? 0.45
            : (t % 1.2) / 1.2;
        const fade = defenseMethod === 'kinetic_dart' ? Math.max(0, 1 - burstAge) : 0.65 * (1 - burstAge * 0.5);
        resources.plumeMat.opacity = fade * 0.72;
        const attr = resources.plumeGeo.attributes.position as THREE.BufferAttribute;
        const arr = attr.array as Float32Array;
        const vel = resources.plumeVelocities;
        const ox = defenseMethod === 'kinetic_dart' ? INTERCEPT_POINT.x : ax;
        const oy = defenseMethod === 'kinetic_dart' ? INTERCEPT_POINT.y : ay;
        const oz = defenseMethod === 'kinetic_dart' ? INTERCEPT_POINT.z : az;
        const spreadScale = defenseMethod === 'kinetic_dart' ? 0.45 + burstAge * 3.4 : burstAge * 2.0;
        for (let i = 0; i < PLUME_COUNT; i++) {
          arr[i * 3] = ox + vel[i * 3] * spreadScale;
          arr[i * 3 + 1] = oy + vel[i * 3 + 1] * spreadScale;
          arr[i * 3 + 2] = oz + vel[i * 3 + 2] * spreadScale;
        }
        attr.needsUpdate = true;
      } else {
        resources.plumeMat.opacity = 0;
      }
    }
  });

  if (activeLab !== 'planetary_defense') return null;

  return (
    <group name="planetary-defense-lab-root">
      <ambientLight intensity={0.4} />
      <directionalLight position={[-10, 11, 12]} intensity={2.1} color="#fff7eb" />
      <directionalLight position={[12, -5, -8]} intensity={0.45} color="#60a5fa" />

      <points geometry={resources.starGeo} material={resources.starMat} />

      {/* Target Earth + drifting clouds + normalized Rayleigh halo + safety buffer ring */}
      <group position={[EARTH_POS.x, EARTH_POS.y, EARTH_POS.z]}>
        <mesh ref={earthMeshRef} geometry={resources.earthGeo} material={resources.earthMat} />
        <mesh ref={cloudMeshRef} geometry={resources.cloudsGeo} material={resources.cloudsMat} />
        <mesh geometry={resources.haloGeo} material={resources.haloMat} />
        <mesh
          geometry={resources.shieldRingGeo}
          material={resources.shieldRingMat}
          rotation={[-Math.PI / 2, 0, 0]}
        />
      </group>

      {/* Moon in background */}
      <mesh position={[10.4, 1.1, -4.4]} geometry={resources.moonGeo} material={resources.moonMat} />

      {/* Incoming 99942 Apophis */}
      <mesh ref={asteroidRef} geometry={resources.asteroidGeo} material={resources.asteroidMat} />

      {/* Crisp slim glowing 3D Tube trajectories */}
      <mesh geometry={resources.impactTubeGeo} material={resources.impactTubeMat} />
      <mesh ref={deflectTubeMeshRef} geometry={resources.initialDeflectGeo} material={resources.deflectTubeMat} />

      {/* 1. DART Kinetic Impactor */}
      <group ref={dartShipRef}>
        <mesh geometry={resources.busGeo} material={resources.busMat} />
        <mesh geometry={resources.panelGeo} material={resources.panelMat} position={[0, 0, 0]} />
      </group>

      {/* 2. Gravity Tractor Tug */}
      <group ref={tractorGroupRef} visible={false}>
        <mesh geometry={resources.busGeo} material={resources.busMat} scale={[1.3, 1.3, 1.3]} />
        <mesh geometry={resources.panelGeo} material={resources.panelMat} scale={[1.4, 1, 1.3]} />
        <mesh geometry={resources.tractorRingGeo} material={resources.tractorRingMat} position={[0, -0.8, 0]} rotation={[Math.PI / 2, 0, 0]} />
        <mesh geometry={resources.tractorRingGeo} material={resources.tractorRingMat} position={[0, -1.35, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[0.7, 0.7, 0.7]} />
      </group>

      {/* 3. Laser Ablation Satellite & Beam */}
      <group ref={laserGroupRef} visible={false}>
        <mesh geometry={resources.busGeo} material={resources.busMat} scale={[1.1, 1.1, 1.1]} />
        <mesh geometry={resources.panelGeo} material={resources.panelMat} />
        <mesh ref={laserBeamRef} geometry={resources.laserBeamGeo} material={resources.laserBeamMat} />
      </group>

      {/* Kinetic ejecta / ablation jet */}
      <points ref={plumeRef} geometry={resources.plumeGeo} material={resources.plumeMat} />
    </group>
  );
};
