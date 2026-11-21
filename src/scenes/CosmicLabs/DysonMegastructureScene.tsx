import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '@/stores/useAppStore';
import { evaluateDysonSwarm } from '@/simulation/cosmic/Wave2Physics';
import { AssetManager } from '@/engine/assets/AssetManager';

const COLLECTOR_COUNT = 720;
const STAR_COUNT = 1800;

const _dummy = new THREE.Object3D();
const _origin = new THREE.Vector3(0, 0, 0);

const DYSON_SUN_VERT = /* glsl */ `
  varying vec3 vLocalPos;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPos;
  void main() {
    vLocalPos = position;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const DYSON_SUN_FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uTransmission;
  varying vec3 vLocalPos;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPos;

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
    float n1 = noise3(p * 6.5 + vec3(uTime * 0.16, -uTime * 0.1, uTime * 0.14));
    float n2 = noise3(p * 14.0 - vec3(uTime * 0.24, uTime * 0.15, 0.0));
    float n3 = noise3(p * 26.0 + vec3(0.0, uTime * 0.32, -uTime * 0.18));
    float gran = n1 * 0.5 + n2 * 0.32 + n3 * 0.18;
    vec3 cool = vec3(0.92, 0.28, 0.02);
    vec3 mid = vec3(1.0, 0.62, 0.12);
    vec3 hot = vec3(1.0, 0.97, 0.76);
    vec3 col = mix(cool, mid, smoothstep(0.24, 0.58, gran));
    col = mix(col, hot, smoothstep(0.56, 0.85, gran));

    // Shift slightly warmer/dimmer visually as Dyson swarm harvests optical photons
    vec3 dimTint = vec3(1.0, 0.48, 0.14);
    col = mix(dimTint * 0.82, col * 1.32, clamp(uTransmission, 0.25, 1.0));
    gl_FragColor = vec4(col, 1.0);
  }
`;

const IR_SHELL_VERT = /* glsl */ `
  varying vec3 vWorldNormal;
  varying vec3 vWorldPos;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const IR_SHELL_FRAG = /* glsl */ `
  uniform float uCompletion;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPos;
  void main() {
    vec3 N = normalize(vWorldNormal);
    vec3 V = normalize(cameraPosition - vWorldPos);
    float limb = pow(max(0.0001, dot(-N, V)), 3.8);
    vec3 irColor = mix(vec3(1.0, 0.68, 0.22), vec3(0.95, 0.28, 0.08), uCompletion);
    gl_FragColor = vec4(irColor, limb * (0.18 + 0.34 * uCompletion));
  }
`;

const ONEILL_INTERIOR_VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vLocalPos;
  void main() {
    vUv = uv;
    vLocalPos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const ONEILL_INTERIOR_FRAG = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vLocalPos;

  float hash2(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise2(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash2(i), hash2(i + vec2(1.0, 0.0)), f.x),
      mix(hash2(i + vec2(0.0, 1.0)), hash2(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  void main() {
    // 6 alternating circumferential panels: 3 lush green habitats + 3 sunlit glass window strips
    float sector = fract(vUv.x * 3.0);
    float isWindow = smoothstep(0.47, 0.5, sector) * (1.0 - smoothstep(0.96, 0.99, sector));

    // Sunlit window panel with structural aluminum mullion ribs
    float frame = step(0.92, fract(vUv.y * 16.0)) + step(0.94, fract(vUv.x * 18.0));
    vec3 skyGlass = mix(vec3(0.42, 0.78, 1.0), vec3(0.95, 0.98, 1.0), 0.3 + 0.4 * sin(vUv.y * 3.14159));
    vec3 windowCol = mix(skyGlass, vec3(0.18, 0.24, 0.34), clamp(frame, 0.0, 1.0) * 0.75);

    // Living green valley strip: winding blue river + forest hills + agricultural fields + city lights
    float riverCenter = 0.23 + 0.055 * sin(vUv.y * 12.566);
    float riverMask = 1.0 - smoothstep(0.018, 0.042, abs(sector - riverCenter));
    float veg = noise2(vec2(vUv.x * 24.0, vUv.y * 18.0));
    vec3 pasture = mix(vec3(0.16, 0.42, 0.16), vec3(0.32, 0.58, 0.24), veg);
    vec3 mountains = vec3(0.36, 0.38, 0.35);
    float edgeRidge = smoothstep(0.15, 0.02, min(sector, abs(sector - 0.47)));
    vec3 land = mix(pasture, mountains, edgeRidge * 0.65);

    // Tiny golden habitat city clusters along the riverbanks
    float cityNoise = noise2(vec2(vUv.x * 65.0, vUv.y * 55.0));
    float cityGlow = smoothstep(0.78, 0.92, cityNoise) * (1.0 - riverMask) * (1.0 - edgeRidge);
    land = mix(land, vec3(0.95, 0.88, 0.66), cityGlow * 0.65);

    vec3 riverCol = vec3(0.09, 0.46, 0.76) + vec3(0.15, 0.28, 0.35) * sin(vUv.y * 40.0 + uTime);
    vec3 habitatCol = mix(land, riverCol, riverMask);

    // Atmospheric perspective haze deep down the cylinder barrel
    float endHaze = smoothstep(0.0, 0.2, vUv.y) * smoothstep(1.0, 0.8, vUv.y);
    vec3 col = mix(habitatCol, windowCol, isWindow);
    col = mix(vec3(0.55, 0.78, 0.96), col, 0.45 + 0.55 * endHaze);

    gl_FragColor = vec4(col, 1.0);
  }
`;

const DYSON_HEX_VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;
  varying vec3 vLocalPos;
  void main() {
    vUv = uv;
    vLocalPos = position;
    vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const DYSON_HEX_FRAG = /* glsl */ `
  precision highp float;
  uniform sampler2D uSolarMap;
  varying vec2 vUv;
  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;
  varying vec3 vLocalPos;
  void main() {
    vec3 N = normalize(vWorldNormal);
    vec3 V = normalize(cameraPosition - vWorldPos);
    vec3 toSun = normalize(-vWorldPos);
    float sunFace = smoothstep(-0.08, 0.25, dot(N, toSun));

    // Photovoltaic cell grid texture detail + crisp champagne-gold hexagonal perimeter frame
    vec3 cellTex = texture2D(uSolarMap, vUv * 2.0).rgb;
    float radialEdge = smoothstep(0.22, 0.275, length(vLocalPos.xy));

    // Sun-facing collector side: gleaming gold-amber photovoltaic sheen catching starlight
    vec3 H = normalize(toSun + V);
    float spec = pow(max(0.0001, dot(N, H)), 24.0);
    vec3 frontCol = mix(vec3(0.76, 0.48, 0.14), vec3(1.0, 0.86, 0.44), cellTex.r * 0.65 + 0.35) + vec3(1.0, 0.94, 0.72) * spec * 0.65;

    // Outward space-facing thermal radiator side: dark spacecraft titanium/indigo with subtle gold trim
    float rim = pow(max(0.0001, 1.0 - max(dot(N, V), 0.0)), 2.5);
    vec3 backCol = vec3(0.09, 0.14, 0.24) + vec3(0.28, 0.22, 0.16) * cellTex.b * 0.45 + vec3(0.45, 0.62, 0.82) * rim * 0.32;

    vec3 col = mix(backCol, frontCol, sunFace);
    col = mix(col, vec3(0.96, 0.78, 0.36), radialEdge * 0.72);
    gl_FragColor = vec4(col, 1.0);
  }
`;

export const DysonMegastructureScene: React.FC = () => {
  const activeLab = useAppStore((s) => s.activeCosmicLab);
  const dysonMode = useAppStore((s) => s.dysonMode);
  const dysonCompletion = useAppStore((s) => s.dysonCompletion);
  const isTabHidden = useAppStore((s) => s.isTabHidden);
  const reducedMotion = useAppStore((s) => s.reducedMotion);

  const swarmMeshRef = useRef<THREE.InstancedMesh>(null);
  const oneillGroupRef = useRef<THREE.Group>(null);
  const cloudCylRef = useRef<THREE.Mesh>(null);
  const lastCompletionRef = useRef<number>(-1);
  const cachedActiveCountRef = useRef<number>(0);
  const lastUploadedCountRef = useRef<number>(-1);
  const lastUploadedReducedRef = useRef<boolean>(false);

  const resources = useMemo(() => {
    const assets = AssetManager.getInstance();
    const solarTex = assets.getSolarArrayMap();
    const kaptonTex = assets.getKaptonFoilMap();
    const softMap = assets.getSoftParticleMap();

    const sunGeo = new THREE.SphereGeometry(3.2, 64, 48);
    const sunMat = new THREE.ShaderMaterial({
      vertexShader: DYSON_SUN_VERT,
      fragmentShader: DYSON_SUN_FRAG,
      uniforms: {
        uTime: { value: 0 },
        uTransmission: { value: 1.0 },
      },
    });

    const irShellGeo = new THREE.SphereGeometry(9.6, 48, 32);
    const irShellMat = new THREE.ShaderMaterial({
      vertexShader: IR_SHELL_VERT,
      fragmentShader: IR_SHELL_FRAG,
      side: THREE.BackSide,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      uniforms: {
        uCompletion: { value: 0.45 },
      },
    });

    // Sleek two-sided Hexagonal Dyson Collector Mirror (gleaming gold sun-side, dark titanium radiator back)
    const hexGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.04, 6);
    hexGeo.rotateX(Math.PI / 2); // Align face normal with +Z so lookAt(origin) faces the Sun!
    const hexMat = new THREE.ShaderMaterial({
      vertexShader: DYSON_HEX_VERT,
      fragmentShader: DYSON_HEX_FRAG,
      uniforms: {
        uSolarMap: { value: solarTex },
      },
    });

    // Deterministic orbital elements for 720 collectors across 6 nested Dyson shells
    const orbits = new Float32Array(COLLECTOR_COUNT * 5); // radius, inc, ascNode, phase0, omega
    for (let i = 0; i < COLLECTOR_COUNT; i++) {
      const shell = i % 6;
      const radius = 5.3 + shell * 0.68 + (((i * 37) % 100) / 100 - 0.5) * 0.16;
      const inc = ((shell - 2.5) * 0.48) + ((((i * 19) % 100) / 100) - 0.5) * 0.22;
      const ascNode = (shell * Math.PI) / 3 + (((i * 11) % 60) / 60) * 0.35;
      const phase0 = ((i * 2.399963) % (Math.PI * 2)); // golden angle spacing
      const omega = (0.34 - shell * 0.032) * (shell % 2 === 0 ? 1 : -1);
      orbits[i * 5] = radius;
      orbits[i * 5 + 1] = inc;
      orbits[i * 5 + 2] = ascNode;
      orbits[i * 5 + 3] = phase0;
      orbits[i * 5 + 4] = omega;
    }

    // Subtle Dyson orbital rail rings
    const railGeo = new THREE.TorusGeometry(6.9, 0.03, 12, 96);
    const railMat = new THREE.MeshBasicMaterial({
      color: '#38bdf8',
      transparent: true,
      opacity: 0.25,
      depthWrite: false,
    });

    // O'Neill Rotating Cylinder Interior Habitat
    const cylGeo = new THREE.CylinderGeometry(6.2, 6.2, 34, 72, 1, true);
    const cylMat = new THREE.ShaderMaterial({
      vertexShader: ONEILL_INTERIOR_VERT,
      fragmentShader: ONEILL_INTERIOR_FRAG,
      side: THREE.BackSide,
      uniforms: { uTime: { value: 0 } },
    });

    const cloudCylGeo = new THREE.CylinderGeometry(4.95, 4.95, 31, 48, 1, true);
    const cloudCylMat = new THREE.MeshBasicMaterial({
      color: '#e0f2fe',
      transparent: true,
      opacity: 0.14,
      side: THREE.BackSide,
      depthWrite: false,
    });

    const capGeo = new THREE.CircleGeometry(6.25, 48);
    const capMat = new THREE.MeshStandardMaterial({
      map: kaptonTex,
      color: '#94a3b8',
      roughness: 0.45,
      metalness: 0.72,
      side: THREE.DoubleSide,
    });

    const axisGeo = new THREE.CylinderGeometry(0.28, 0.28, 32, 24);
    const axisMat = new THREE.MeshStandardMaterial({
      color: '#e2e8f0',
      emissive: '#38bdf8',
      emissiveIntensity: 0.45,
      roughness: 0.3,
      metalness: 0.8,
    });

    // Background stars
    const starPos = new Float32Array(STAR_COUNT * 3);
    for (let i = 0; i < STAR_COUNT; i++) {
      const u = ((i * 7919) % 10000) / 10000;
      const v = ((i * 3571) % 10000) / 10000;
      const theta = u * Math.PI * 2;
      const phi = Math.acos(2 * v - 1);
      const r = 74 + ((i * 181) % 45);
      starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = r * Math.cos(phi);
      starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const bgStarGeo = new THREE.BufferGeometry();
    bgStarGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const bgStarMat = new THREE.PointsMaterial({
      size: 0.52,
      map: softMap,
      color: '#e2e8f0',
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    return {
      sunGeo,
      sunMat,
      irShellGeo,
      irShellMat,
      hexGeo,
      hexMat,
      orbits,
      railGeo,
      railMat,
      cylGeo,
      cylMat,
      cloudCylGeo,
      cloudCylMat,
      capGeo,
      capMat,
      axisGeo,
      axisMat,
      bgStarGeo,
      bgStarMat,
    };
  }, []);

  useEffect(() => {
    return () => {
      resources.sunGeo.dispose();
      resources.sunMat.dispose();
      resources.irShellGeo.dispose();
      resources.irShellMat.dispose();
      resources.hexGeo.dispose();
      resources.hexMat.dispose();
      resources.railGeo.dispose();
      resources.railMat.dispose();
      resources.cylGeo.dispose();
      resources.cylMat.dispose();
      resources.cloudCylGeo.dispose();
      resources.cloudCylMat.dispose();
      resources.capGeo.dispose();
      resources.capMat.dispose();
      resources.axisGeo.dispose();
      resources.axisMat.dispose();
      resources.bgStarGeo.dispose();
      resources.bgStarMat.dispose();
    };
  }, [resources]);

  useFrame((state, delta) => {
    if (activeLab !== 'dyson_megastructure' || isTabHidden) return;
    const dt = Math.min(delta, 0.05);
    const animT = reducedMotion ? 0 : state.clock.elapsedTime;

    if (Math.abs(lastCompletionRef.current - dysonCompletion) > 0.0001) {
      lastCompletionRef.current = dysonCompletion;
      const evalSwarm = evaluateDysonSwarm(dysonCompletion);
      cachedActiveCountRef.current = evalSwarm.activeCollectors;
      resources.sunMat.uniforms.uTransmission.value = evalSwarm.visibleTransmission;
      resources.irShellMat.uniforms.uCompletion.value = evalSwarm.completion;
    }

    resources.sunMat.uniforms.uTime.value = animT;
    resources.cylMat.uniforms.uTime.value = animT;

    if (dysonMode === 'dyson_swarm' && swarmMeshRef.current) {
      const activeCount = cachedActiveCountRef.current;
      const needsStaticUpload =
        lastUploadedCountRef.current !== activeCount || lastUploadedReducedRef.current !== reducedMotion;
      if (!reducedMotion || needsStaticUpload) {
        lastUploadedCountRef.current = activeCount;
        lastUploadedReducedRef.current = reducedMotion;
        const mesh = swarmMeshRef.current;
        const orb = resources.orbits;

        for (let i = 0; i < COLLECTOR_COUNT; i++) {
          if (i >= activeCount) {
            _dummy.position.set(0, 0, 0);
            _dummy.scale.set(0, 0, 0);
            _dummy.updateMatrix();
            mesh.setMatrixAt(i, _dummy.matrix);
            continue;
          }
          const r = orb[i * 5];
          const inc = orb[i * 5 + 1];
          const asc = orb[i * 5 + 2];
          const ph = orb[i * 5 + 3] + animT * orb[i * 5 + 4];

          const x0 = Math.cos(ph) * r;
          const z0 = Math.sin(ph) * r;
          const y1 = z0 * Math.sin(inc);
          const z1 = z0 * Math.cos(inc);

          const x = x0 * Math.cos(asc) - z1 * Math.sin(asc);
          const z = x0 * Math.sin(asc) + z1 * Math.cos(asc);

          _dummy.position.set(x, y1, z);
          _dummy.lookAt(_origin);
          _dummy.scale.set(1, 1, 1);
          _dummy.updateMatrix();
          mesh.setMatrixAt(i, _dummy.matrix);
        }
        mesh.instanceMatrix.needsUpdate = true;
      }
    }

    if (dysonMode === 'oneill_cylinder' && oneillGroupRef.current && !reducedMotion) {
      // Gentle 1g habitat cylinder spin around Z axis
      oneillGroupRef.current.rotation.z += dt * 0.22;
      if (cloudCylRef.current) {
        cloudCylRef.current.rotation.y += dt * 0.08;
      }
    }
  });

  if (activeLab !== 'dyson_megastructure') return null;

  return (
    <group name="dyson-megastructure-lab-root">
      <ambientLight intensity={0.48} />
      <pointLight position={[0, 0, 0]} intensity={6.5} distance={60} decay={1.2} color="#fde68a" />
      <directionalLight position={[10, 12, 16]} intensity={1.5} color="#fff7ed" />

      <points geometry={resources.bgStarGeo} material={resources.bgStarMat} />

      {dysonMode === 'dyson_swarm' ? (
        <group name="dyson-swarm-view">
          <mesh geometry={resources.sunGeo} material={resources.sunMat} />
          <mesh geometry={resources.irShellGeo} material={resources.irShellMat} />
          <instancedMesh
            ref={swarmMeshRef}
            args={[resources.hexGeo, resources.hexMat, COLLECTOR_COUNT]}
          />
          <mesh geometry={resources.railGeo} material={resources.railMat} rotation={[Math.PI / 2.3, 0.2, 0]} />
          <mesh geometry={resources.railGeo} material={resources.railMat} rotation={[-Math.PI / 2.6, -0.35, 0.4]} scale={[1.15, 1.15, 1.15]} />
        </group>
      ) : (
        <group ref={oneillGroupRef} name="oneill-cylinder-view" position={[0, 0, -2]}>
          {/* Hollow rotating living interior cylinder */}
          <mesh geometry={resources.cylGeo} material={resources.cylMat} rotation={[Math.PI / 2, 0, 0]} />
          {/* Inner drifting weather cloud ring */}
          <mesh ref={cloudCylRef} geometry={resources.cloudCylGeo} material={resources.cloudCylMat} rotation={[Math.PI / 2, 0, 0]} />
          {/* Far metallic docking end-cap */}
          <mesh geometry={resources.capGeo} material={resources.capMat} position={[0, 0, -17]} />
          {/* Central 0g luminous docking spine */}
          <mesh geometry={resources.axisGeo} material={resources.axisMat} rotation={[Math.PI / 2, 0, 0]} />
        </group>
      )}
    </group>
  );
};
