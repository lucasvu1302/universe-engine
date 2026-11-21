import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '@/stores/useAppStore';
import { AssetManager } from '@/engine/assets/AssetManager';
import {
  createNBodyPreset,
  MAX_NBODY_BODIES,
  NBodyBody,
  NBodyStepMetrics,
  nbodyLiveTelemetry,
  stepNBodyVerlet,
} from '@/simulation/cosmic/Wave2Physics';

const TRAIL_LEN = 180;

const STAR_VERT = /* glsl */ `
  varying vec3 vLocalPos;
  varying vec3 vWorldNormal;
  varying vec3 vWorldView;
  void main() {
    vLocalPos = position;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vWorldView = normalize(cameraPosition - wp.xyz);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const STAR_FRAG = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform vec3 uColor;
  varying vec3 vLocalPos;
  varying vec3 vWorldNormal;
  varying vec3 vWorldView;

  float hash3(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  float noise3(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash3(i + vec3(0,0,0)), hash3(i + vec3(1,0,0)), f.x),
          mix(hash3(i + vec3(0,1,0)), hash3(i + vec3(1,1,0)), f.x), f.y),
      mix(mix(hash3(i + vec3(0,0,1)), hash3(i + vec3(1,0,1)), f.x),
          mix(hash3(i + vec3(0,1,1)), hash3(i + vec3(1,1,1)), f.x), f.y),
      f.z
    );
  }

  void main() {
    vec3 p = normalize(vLocalPos);
    float n1 = noise3(p * 5.8 + vec3(uTime * 0.18, -uTime * 0.12, uTime * 0.14));
    float n2 = noise3(p * 12.5 - vec3(uTime * 0.25, uTime * 0.14, 0.0));
    float gran = n1 * 0.62 + n2 * 0.38;
    float ndotv = clamp(abs(dot(normalize(vWorldNormal), normalize(vWorldView))), 0.0, 1.0);
    float limb = pow(max(0.0001, ndotv), 0.45);
    float rim = pow(max(0.0001, 1.0 - ndotv), 2.4);
    vec3 coreTint = mix(uColor * 0.85, vec3(1.0, 0.98, 0.92), smoothstep(0.55, 0.92, gran));
    vec3 col = coreTint * (0.55 + 0.72 * limb) + mix(uColor, vec3(1.0), 0.5) * rim * 0.85;
    gl_FragColor = vec4(col, 1.0);
  }
`;

const RING_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const GRID_FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  void main() {
    vec2 p = (vUv - 0.5) * 2.0;
    float r = length(p);
    float radialFade = 1.0 - smoothstep(0.45, 0.98, r);
    // Clean polar rings + subtle Cartesian coordinates (zero diagonal triangle wireframe artifacts)
    vec2 g = abs(fract(p * 9.0 - 0.5) - 0.5);
    float cart = 1.0 - smoothstep(0.012, 0.032, min(g.x, g.y));
    float ring = 1.0 - smoothstep(0.012, 0.032, abs(fract(r * 6.0) - 0.5));
    float line = max(cart * 0.55, ring * 0.75);
    float alpha = line * radialFade * 0.26;
    if (alpha < 0.004) discard;
    gl_FragColor = vec4(vec3(0.22, 0.52, 0.82), alpha);
  }
`;

const ZONE_RING_FRAG = /* glsl */ `
  precision highp float;
  uniform vec3 uColor;
  uniform float uOpacity;
  varying vec2 vUv;
  void main() {
    vec2 p = (vUv - 0.5) * 2.0;
    float r = length(p);
    float band = smoothstep(0.56, 0.72, r) * (1.0 - smoothstep(0.84, 0.98, r));
    float edgeLine = exp(-abs(r - 0.78) * 42.0) * 0.55;
    float a = (band * uOpacity) + edgeLine * uOpacity * 1.1;
    if (a < 0.004) discard;
    gl_FragColor = vec4(uColor, a);
  }
`;

export const NBodySandboxScene: React.FC = () => {
  const preset = useAppStore((s) => s.nbodyPreset);
  const resetNonce = useAppStore((s) => s.nbodyResetNonce);
  const spawnNonce = useAppStore((s) => s.nbodySpawnNonce);
  const showHabitable = useAppStore((s) => s.nbodyShowHabitable);
  const showRoche = useAppStore((s) => s.nbodyShowRoche);

  const bodiesRef = useRef<NBodyBody[]>(createNBodyPreset(preset));
  const meshRefs = useRef<Array<THREE.Mesh | null>>([]);
  const haloRefs = useRef<Array<THREE.Sprite | null>>([]);
  const hzMeshRef = useRef<THREE.Mesh>(null);
  const rocheMeshRef = useRef<THREE.Mesh>(null);
  const metricsScratchRef = useRef<NBodyStepMetrics>({
    kineticEnergy: 0,
    potentialEnergy: 0,
    totalEnergy: 0,
    rocheDisrupted: false,
    minStarDist: 99,
  });
  const prevSpawnNonceRef = useRef(spawnNonce);

  const softParticle = useMemo(() => AssetManager.getInstance().getSoftParticleMap(), []);

  const gpu = useMemo(() => {
    // 1. Pinpoint deep-space starfield
    const starCount = 1800;
    const starPos = new Float32Array(starCount * 3);
    const starCol = new Float32Array(starCount * 3);
    const pal = [new THREE.Color('#f8fafc'), new THREE.Color('#bfdbfe'), new THREE.Color('#fde68a')];
    for (let i = 0; i < starCount; i++) {
      const a = Math.abs((Math.sin(i * 12.989) * 43758.545) % 1) * Math.PI * 2;
      const b = Math.acos(2 * Math.abs((Math.sin(i * 78.233 + 0.9) * 24634.63) % 1) - 1);
      const r = 45 + Math.abs((Math.sin(i * 33.7) * 18273.4) % 1) * 85;
      starPos[i * 3] = r * Math.sin(b) * Math.cos(a);
      starPos[i * 3 + 1] = r * Math.cos(b);
      starPos[i * 3 + 2] = r * Math.sin(b) * Math.sin(a);
      const c = pal[i % pal.length];
      starCol[i * 3] = c.r;
      starCol[i * 3 + 1] = c.g;
      starCol[i * 3 + 2] = c.b;
    }
    const starsGeo = new THREE.BufferGeometry();
    starsGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starsGeo.setAttribute('color', new THREE.BufferAttribute(starCol, 3));
    const starsMat = new THREE.PointsMaterial({
      map: softParticle,
      vertexColors: true,
      size: 0.52,
      transparent: true,
      opacity: 0.88,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    // 2. Smooth radial-faded anti-aliased polar/Cartesian spacetime plane (zero wireframe slashes)
    const gridGeo = new THREE.PlaneGeometry(36, 36, 1, 1);
    const gridMat = new THREE.ShaderMaterial({
      vertexShader: RING_VERT,
      fragmentShader: GRID_FRAG,
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    // 3. Habitable Zone & Roche Limit soft glowing rings
    const hzGeo = new THREE.PlaneGeometry(11.6, 11.6);
    const hzMat = new THREE.ShaderMaterial({
      vertexShader: RING_VERT,
      fragmentShader: ZONE_RING_FRAG,
      uniforms: { uColor: { value: new THREE.Color('#10b981') }, uOpacity: { value: 0.24 } },
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const rocheGeo = new THREE.PlaneGeometry(3.4, 3.4);
    const rocheMat = new THREE.ShaderMaterial({
      vertexShader: RING_VERT,
      fragmentShader: ZONE_RING_FRAG,
      uniforms: { uColor: { value: new THREE.Color('#f43f5e') }, uOpacity: { value: 0.34 } },
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    // 4. Pre-allocated body geometries, materials, halos & orbital trail ribbons (MAX_NBODY_BODIES = 8)
    const bodyGeo = new THREE.SphereGeometry(1.0, 36, 28);
    const starMats: THREE.ShaderMaterial[] = [];
    const planetMats: THREE.MeshStandardMaterial[] = [];
    const haloMats: THREE.SpriteMaterial[] = [];
    const trailGeos: THREE.BufferGeometry[] = [];
    const trailMats: THREE.LineBasicMaterial[] = [];
    const trailLines: THREE.Line[] = [];
    const trailBuffers: Float32Array[] = [];

    for (let i = 0; i < MAX_NBODY_BODIES; i++) {
      starMats.push(
        new THREE.ShaderMaterial({
          vertexShader: STAR_VERT,
          fragmentShader: STAR_FRAG,
          uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color('#fbbf24') } },
        })
      );
      planetMats.push(
        new THREE.MeshStandardMaterial({
          color: '#38bdf8',
          roughness: 0.55,
          metalness: 0.12,
          emissive: '#082f49',
          emissiveIntensity: 0.32,
        })
      );
      haloMats.push(
        new THREE.SpriteMaterial({
          map: softParticle,
          color: '#fde047',
          transparent: true,
          opacity: 0.65,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );

      const tBuf = new Float32Array(TRAIL_LEN * 3);
      const tCol = new Float32Array(TRAIL_LEN * 3);
      const trailDenom = TRAIL_LEN - 1;
      for (let k = 0; k < TRAIL_LEN; k++) {
        const tNorm = k / trailDenom;
        const ramp = tNorm * tNorm * Math.sqrt(tNorm);
        tCol[k * 3] = ramp;
        tCol[k * 3 + 1] = ramp;
        tCol[k * 3 + 2] = ramp;
      }
      const tGeo = new THREE.BufferGeometry();
      tGeo.setAttribute('position', new THREE.BufferAttribute(tBuf, 3));
      tGeo.setAttribute('color', new THREE.BufferAttribute(tCol, 3));
      const tMat = new THREE.LineBasicMaterial({
        color: '#38bdf8',
        vertexColors: true,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      trailBuffers.push(tBuf);
      trailGeos.push(tGeo);
      trailMats.push(tMat);
      const line = new THREE.Line(tGeo, tMat);
      line.frustumCulled = false;
      trailLines.push(line);
    }

    return {
      starsGeo,
      starsMat,
      gridGeo,
      gridMat,
      hzGeo,
      hzMat,
      rocheGeo,
      rocheMat,
      bodyGeo,
      starMats,
      planetMats,
      haloMats,
      trailGeos,
      trailMats,
      trailLines,
      trailBuffers,
    };
  }, [softParticle]);

  // Reset preset & pre-warm 42 orbital trail steps so ribbons sweep dramatically on frame 1
  useEffect(() => {
    const fresh = createNBodyPreset(preset);
    bodiesRef.current = fresh;

    // Seed trail history with initial positions
    for (let i = 0; i < MAX_NBODY_BODIES; i++) {
      const b = fresh[i];
      const buf = gpu.trailBuffers[i];
      for (let k = 0; k < TRAIL_LEN; k++) {
        buf[k * 3] = b ? b.x * 2.2 : 0;
        buf[k * 3 + 1] = b ? b.y * 2.2 : 0;
        buf[k * 3 + 2] = b ? b.z * 2.2 : 0;
      }
      if (b) {
        gpu.starMats[i].uniforms.uColor.value.set(b.color);
        gpu.planetMats[i].color.set(b.color);
        gpu.planetMats[i].emissive.set(b.color);
        gpu.planetMats[i].emissiveIntensity = 0.22;
        gpu.haloMats[i].color.set(b.color);
        gpu.trailMats[i].color.set(b.color);
      }
    }

    // Pre-step 155 steps so trails form sweeping visible chaotic 3-body arcs immediately on frame 1
    let lastMetrics = stepNBodyVerlet(fresh, 0.0001);
    for (let step = 0; step < 155; step++) {
      lastMetrics = stepNBodyVerlet(fresh, 0.015);
      for (let i = 0; i < fresh.length; i++) {
        const b = fresh[i];
        const buf = gpu.trailBuffers[i];
        buf.copyWithin(0, 3);
        const end = (TRAIL_LEN - 1) * 3;
        buf[end] = b.x * 2.2;
        buf[end + 1] = b.y * 2.2;
        buf[end + 2] = b.z * 2.2;
      }
    }
    for (let i = 0; i < MAX_NBODY_BODIES; i++) {
      (gpu.trailGeos[i].attributes.position as THREE.BufferAttribute).needsUpdate = true;
    }

    nbodyLiveTelemetry.bodyCount = fresh.length;
    nbodyLiveTelemetry.rocheDisrupted = lastMetrics.rocheDisrupted;
    nbodyLiveTelemetry.totalEnergy = lastMetrics.totalEnergy;
    nbodyLiveTelemetry.minStarDist = lastMetrics.minStarDist;
  }, [preset, resetNonce, gpu]);

  // Spawn an additional orbiting planet up to MAX_NBODY_BODIES = 8
  useEffect(() => {
    if (spawnNonce === prevSpawnNonceRef.current) return;
    prevSpawnNonceRef.current = spawnNonce;

    const bodies = bodiesRef.current;
    if (bodies.length >= MAX_NBODY_BODIES) return;

    const speedMult = useAppStore.getState().nbodyLaunchSpeed;
    const idx = bodies.length;
    const palette = ['#38bdf8', '#34d399', '#f472b6', '#a78bfa', '#fb923c'];
    const angle = idx * 1.45;
    const r = 2.6 + (idx % 3) * 0.95;
    const starMass = bodies.reduce((acc, b) => acc + (b.isStar ? b.mass : 0), 0) || 1.5;
    const vCirc = Math.sqrt(starMass / r) * speedMult;

    const nb: NBodyBody = {
      id: `spawn_${idx}`,
      mass: 0.018,
      radius: 0.22 + (idx % 2) * 0.05,
      isStar: false,
      color: palette[idx % palette.length],
      x: Math.cos(angle) * r,
      y: ((idx % 3) - 1) * 0.22,
      z: Math.sin(angle) * r,
      vx: -Math.sin(angle) * vCirc,
      vy: 0.04,
      vz: Math.cos(angle) * vCirc,
      ax: 0,
      ay: 0,
      az: 0,
    };
    bodies.push(nb);

    gpu.planetMats[idx].color.set(nb.color);
    gpu.planetMats[idx].emissive.set(nb.color);
    gpu.planetMats[idx].emissiveIntensity = 0.22;
    gpu.trailMats[idx].color.set(nb.color);
    const buf = gpu.trailBuffers[idx];
    for (let k = 0; k < TRAIL_LEN; k++) {
      buf[k * 3] = nb.x * 2.2;
      buf[k * 3 + 1] = nb.y * 2.2;
      buf[k * 3 + 2] = nb.z * 2.2;
    }
    (gpu.trailGeos[idx].attributes.position as THREE.BufferAttribute).needsUpdate = true;
    nbodyLiveTelemetry.bodyCount = bodies.length;
  }, [spawnNonce, gpu]);

  useEffect(() => {
    return () => {
      gpu.starsGeo.dispose();
      gpu.starsMat.dispose();
      gpu.gridGeo.dispose();
      gpu.gridMat.dispose();
      gpu.hzGeo.dispose();
      gpu.hzMat.dispose();
      gpu.rocheGeo.dispose();
      gpu.rocheMat.dispose();
      gpu.bodyGeo.dispose();
      for (let i = 0; i < MAX_NBODY_BODIES; i++) {
        gpu.starMats[i].dispose();
        gpu.planetMats[i].dispose();
        gpu.haloMats[i].dispose();
        gpu.trailGeos[i].dispose();
        gpu.trailMats[i].dispose();
      }
    };
  }, [gpu]);

  useFrame((state, delta) => {
    const store = useAppStore.getState();
    const bodies = bodiesRef.current;
    const elapsed = store.reducedMotion ? 0 : state.clock.elapsedTime;
    const dt = Math.min(Math.max(delta, 0.001), 0.032);

    if (store.nbodyPlaying && !store.reducedMotion) {
      // 2 substeps per frame with zero-allocation scratch metrics target (INV1)
      const subDt = dt * 0.42;
      const scratch = metricsScratchRef.current;
      stepNBodyVerlet(bodies, subDt, 0.04, scratch);
      stepNBodyVerlet(bodies, subDt, 0.04, scratch);
      nbodyLiveTelemetry.bodyCount = bodies.length;
      nbodyLiveTelemetry.rocheDisrupted = scratch.rocheDisrupted;
      nbodyLiveTelemetry.totalEnergy = scratch.totalEnergy;
      nbodyLiveTelemetry.minStarDist = scratch.minStarDist;

      for (let i = 0; i < bodies.length; i++) {
        const b = bodies[i];
        const buf = gpu.trailBuffers[i];
        buf.copyWithin(0, 3);
        const end = (TRAIL_LEN - 1) * 3;
        buf[end] = b.x * 2.2;
        buf[end + 1] = b.y * 2.2;
        buf[end + 2] = b.z * 2.2;
        (gpu.trailGeos[i].attributes.position as THREE.BufferAttribute).needsUpdate = true;
      }
    }

    let starMassSum = 0;
    let baryX = 0;
    let baryY = 0;
    let baryZ = 0;
    let primaryStarIdx = -1;
    let maxStarMass = -1;

    for (let i = 0; i < MAX_NBODY_BODIES; i++) {
      const b = bodies[i];
      const mesh = meshRefs.current[i];
      const halo = haloRefs.current[i];
      const line = gpu.trailLines[i];
      if (!b) {
        if (mesh) mesh.visible = false;
        if (halo) halo.visible = false;
        line.visible = false;
        continue;
      }
      const wx = b.x * 2.2;
      const wy = b.y * 2.2;
      const wz = b.z * 2.2;
      if (b.isStar) {
        starMassSum += b.mass;
        baryX += wx * b.mass;
        baryY += wy * b.mass;
        baryZ += wz * b.mass;
        if (b.mass > maxStarMass) {
          maxStarMass = b.mass;
          primaryStarIdx = i;
        }
      }
      line.visible = true;
      if (mesh) {
        mesh.visible = true;
        mesh.position.set(wx, wy, wz);
        mesh.scale.setScalar(b.radius * 1.45);
        mesh.material = b.isStar ? gpu.starMats[i] : gpu.planetMats[i];
        if (b.isStar) {
          gpu.starMats[i].uniforms.uTime.value = elapsed;
        }
      }
      if (halo) {
        halo.visible = b.isStar;
        halo.position.set(wx, wy, wz);
        const hs = b.radius * 6.2;
        halo.scale.set(hs, hs, 1);
      }
    }

    // Track Habitable Zone to live stellar barycenter and Roche Limit ring to heaviest star
    if (hzMeshRef.current && starMassSum > 0) {
      hzMeshRef.current.position.set(baryX / starMassSum, baryY / starMassSum - 0.05, baryZ / starMassSum);
    }
    if (rocheMeshRef.current && primaryStarIdx >= 0) {
      const ps = bodies[primaryStarIdx];
      rocheMeshRef.current.position.set(ps.x * 2.2, ps.y * 2.2 - 0.02, ps.z * 2.2);
      const rocheDiam = Math.max(2.6, ps.radius * 2.2 * 1.65 * 2.1);
      rocheMeshRef.current.scale.setScalar(rocheDiam / 3.4);
    }
  });

  return (
    <group name="nbody-gravity-sandbox">
      <ambientLight intensity={0.35} color="#cbd5e1" />
      <pointLight position={[0, 4, 0]} intensity={2.6} color="#fff7ed" distance={60} decay={1.2} />

      <points geometry={gpu.starsGeo} material={gpu.starsMat} />
      <mesh
        position={[0, -2.4, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        geometry={gpu.gridGeo}
        material={gpu.gridMat}
      />

      {showHabitable && (
        <mesh
          ref={hzMeshRef}
          position={[0, -0.05, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          geometry={gpu.hzGeo}
          material={gpu.hzMat}
        />
      )}

      {showRoche && (
        <mesh
          ref={rocheMeshRef}
          position={[0, -0.02, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          geometry={gpu.rocheGeo}
          material={gpu.rocheMat}
        />
      )}

      {Array.from({ length: MAX_NBODY_BODIES }).map((_, idx) => (
        <React.Fragment key={idx}>
          <mesh
            ref={(el) => {
              meshRefs.current[idx] = el;
            }}
            geometry={gpu.bodyGeo}
            material={gpu.starMats[idx]}
          />
          <sprite
            ref={(el) => {
              haloRefs.current[idx] = el;
            }}
            material={gpu.haloMats[idx]}
          />
          <primitive object={gpu.trailLines[idx]} />
        </React.Fragment>
      ))}
    </group>
  );
};

export default NBodySandboxScene;
