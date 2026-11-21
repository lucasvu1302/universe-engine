import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '@/stores/useAppStore';
import { TRAPPIST_PLANETS, trappistLiveTelemetry } from '@/simulation/cosmic/Wave2Physics';
import { AssetManager } from '@/engine/assets/AssetManager';

const STAR_COUNT = 1800;

const RED_DWARF_VERT = /* glsl */ `
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

const RED_DWARF_FRAG = /* glsl */ `
  uniform float uTime;
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
    float n1 = noise3(p * 6.5 + vec3(uTime * 0.16, -uTime * 0.1, uTime * 0.12));
    float n2 = noise3(p * 13.0 - vec3(uTime * 0.25, uTime * 0.14, 0.0));
    float gran = n1 * 0.65 + n2 * 0.35;

    vec3 spot = vec3(0.42, 0.05, 0.02);
    vec3 dwarf = vec3(0.95, 0.24, 0.06);
    vec3 flare = vec3(1.0, 0.68, 0.28);

    vec3 col = mix(spot, dwarf, smoothstep(0.24, 0.6, gran));
    col = mix(col, flare, smoothstep(0.62, 0.88, gran));

    vec3 N = normalize(vWorldNormal);
    vec3 V = normalize(cameraPosition - vWorldPos);
    float rim = pow(max(0.0001, 1.0 - max(dot(N, V), 0.0)), 2.2);
    col += vec3(1.0, 0.35, 0.12) * rim * 0.8;

    gl_FragColor = vec4(col * 1.15, 1.0);
  }
`;

const CORONA_VERT = /* glsl */ `
  varying vec3 vWorldNormal;
  varying vec3 vWorldPos;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const CORONA_FRAG = /* glsl */ `
  varying vec3 vWorldNormal;
  varying vec3 vWorldPos;
  void main() {
    vec3 N = normalize(vWorldNormal);
    vec3 V = normalize(cameraPosition - vWorldPos);
    float limb = smoothstep(0.0, 0.65, clamp(dot(-N, V), 0.0, 1.0));
    float glow = pow(max(0.0001, limb), 2.3);
    gl_FragColor = vec4(vec3(1.0, 0.32, 0.09), glow * 0.72);
  }
`;

const HZ_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const HZ_FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  void main() {
    vec2 p = (vUv - 0.5) * 2.0;
    float r = length(p);
    // Feathered emerald Habitable Zone (inner ~0.41 -> outer ~0.95, soft falloff both edges)
    float band = smoothstep(0.38, 0.54, r) * (1.0 - smoothstep(0.82, 0.98, r));
    float alpha = band * 0.17;
    if (alpha < 0.003) discard;
    gl_FragColor = vec4(vec3(0.08, 0.76, 0.52), alpha);
  }
`;

const EXO_PLANET_VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vLocalPos;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPos;
  void main() {
    vUv = uv;
    vLocalPos = position;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const EXO_PLANET_FRAG = /* glsl */ `
  precision highp float;
  uniform sampler2D uMap;
  uniform vec3 uTint;
  uniform float uHasAtmos;
  varying vec2 vUv;
  varying vec3 vLocalPos;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPos;

  void main() {
    vec3 N = normalize(vWorldNormal);
    vec3 V = normalize(cameraPosition - vWorldPos);
    // Red-dwarf TRAPPIST-1 sits at origin in system view -> accurate star-facing terminator
    vec3 L = normalize(-vWorldPos + vec3(0.0001, 0.12, 0.0001));
    float ndl = max(dot(N, L), 0.0);
    float ndv = max(dot(N, V), 0.0);
    float rim = pow(max(0.0001, 1.0 - ndv), 2.8);

    vec3 tex = texture2D(uMap, vUv).rgb;
    vec3 albedo = mix(uTint * 0.55, uTint * 1.15, tex.r);
    // Warm crimson-amber starlight on dayside, deep violet-indigo shadow on tidally locked nightside
    vec3 dayCol = albedo * mix(vec3(0.75, 0.42, 0.34), vec3(1.18, 0.86, 0.72), ndl);
    vec3 nightCol = albedo * vec3(0.08, 0.1, 0.18);
    vec3 lit = mix(nightCol, dayCol, smoothstep(0.0, 0.35, ndl));

    // Specular ice/ocean glint & atmospheric rim on Habitable Zone worlds (d, e, f, g)
    if (uHasAtmos > 0.5) {
      vec3 H = normalize(L + V);
      float spec = pow(max(0.0001, dot(N, H)), 32.0) * ndl;
      lit += vec3(0.75, 0.92, 1.0) * spec * 0.48;
      lit += mix(uTint, vec3(0.38, 0.85, 1.0), 0.55) * rim * (0.35 + 0.65 * ndl) * 0.85;
    } else {
      lit += vec3(0.95, 0.45, 0.25) * rim * ndl * 0.32;
    }

    gl_FragColor = vec4(lit, 1.0);
  }
`;

const SKY_DOME_VERT = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SKY_DOME_FRAG = /* glsl */ `
  varying vec3 vDir;
  void main() {
    float h = clamp(vDir.y, -0.2, 1.0);
    vec3 horizon = vec3(0.58, 0.16, 0.08);
    vec3 midSky = vec3(0.22, 0.08, 0.18);
    vec3 zenith = vec3(0.03, 0.02, 0.08);
    vec3 col = mix(horizon, midSky, smoothstep(-0.04, 0.28, h));
    col = mix(col, zenith, smoothstep(0.24, 0.78, h));
    float sunAlign = max(dot(normalize(vDir), normalize(vec3(0.0, 0.16, -0.98))), 0.0);
    col += vec3(0.95, 0.34, 0.12) * pow(max(0.0001, sunAlign), 7.0) * 0.75;
    gl_FragColor = vec4(col, 1.0);
  }
`;

const ALIEN_OCEAN_VERT = /* glsl */ `
  varying vec3 vWorldPos;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const ALIEN_OCEAN_FRAG = /* glsl */ `
  uniform float uTime;
  varying vec3 vWorldPos;
  varying vec2 vUv;

  void main() {
    vec2 p = vWorldPos.xz * 0.45;
    float w1 = sin(p.x * 2.2 + uTime * 1.4) * cos(p.y * 1.8 - uTime * 1.1);
    float w2 = sin(p.x * 5.4 - uTime * 2.0 + p.y * 3.1) * 0.4;
    vec3 N = normalize(vec3((w1 + w2) * 0.08, 1.0, (w1 - w2) * 0.08));
    vec3 V = normalize(cameraPosition - vWorldPos);
    vec3 L = normalize(vec3(0.0, 0.28, -1.0));
    vec3 H = normalize(L + V);

    float spec = pow(max(0.0001, dot(N, H)), 42.0);
    float fresnel = pow(max(0.0001, 1.0 - max(dot(N, V), 0.0)), 3.2);
    vec3 deepWater = vec3(0.03, 0.11, 0.16);
    vec3 skyReflect = vec3(0.55, 0.2, 0.14);
    vec3 col = mix(deepWater, skyReflect, fresnel * 0.78) + vec3(1.0, 0.56, 0.25) * spec * 1.35;

    float distFade = smoothstep(42.0, 12.0, length(vWorldPos.xz));
    gl_FragColor = vec4(mix(vec3(0.32, 0.1, 0.09), col, distFade), 1.0);
  }
`;

export const TrappistSystemScene: React.FC = () => {
  const activeLab = useAppStore((s) => s.activeCosmicLab);
  const selectedPlanet = useAppStore((s) => s.trappistSelectedPlanet);
  const viewMode = useAppStore((s) => s.trappistViewMode);
  const playing = useAppStore((s) => s.trappistPlaying);
  const isTabHidden = useAppStore((s) => s.isTabHidden);
  const reducedMotion = useAppStore((s) => s.reducedMotion);

  const planetRefs = useRef<(THREE.Mesh | null)[]>([]);
  const highlightRingRef = useRef<THREE.Mesh>(null);
  const simTimeRef = useRef<number>(4.2);

  const resources = useMemo(() => {
    const assets = AssetManager.getInstance();
    const rockyTex = assets.getRegolithAlbedoMap('mars');
    const iceTex = assets.getRegolithAlbedoMap('europa');
    const softMap = assets.getSoftParticleMap();

    const starGeo = new THREE.SphereGeometry(2.15, 64, 48);
    const starMat = new THREE.ShaderMaterial({
      vertexShader: RED_DWARF_VERT,
      fragmentShader: RED_DWARF_FRAG,
      uniforms: { uTime: { value: 0 } },
    });

    const coronaGeo = new THREE.SphereGeometry(2.98, 48, 32);
    const coronaMat = new THREE.ShaderMaterial({
      vertexShader: CORONA_VERT,
      fragmentShader: CORONA_FRAG,
      side: THREE.BackSide,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const hzGeo = new THREE.PlaneGeometry(31.5, 31.5, 1, 1);
    const hzMat = new THREE.ShaderMaterial({
      vertexShader: HZ_VERT,
      fragmentShader: HZ_FRAG,
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const planetGeo = new THREE.SphereGeometry(1.0, 36, 28);
    const planetMats = TRAPPIST_PLANETS.map(
      (p) =>
        new THREE.ShaderMaterial({
          vertexShader: EXO_PLANET_VERT,
          fragmentShader: EXO_PLANET_FRAG,
          uniforms: {
            uMap: { value: p.inHabitableZone ? iceTex : rockyTex },
            uTint: { value: new THREE.Color(p.colorHex) },
            uHasAtmos: { value: p.inHabitableZone ? 1.0 : 0.0 },
          },
        })
    );

    const orbitGeos = TRAPPIST_PLANETS.map((p) => {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 96; i++) {
        const a = (i / 96) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * p.orbitRadiusVisual, 0, Math.sin(a) * p.orbitRadiusVisual));
      }
      return new THREE.BufferGeometry().setFromPoints(pts);
    });
    const orbitMatNormal = new THREE.LineBasicMaterial({ color: '#475569', transparent: true, opacity: 0.42 });
    const orbitMatHz = new THREE.LineBasicMaterial({ color: '#34d399', transparent: true, opacity: 0.5 });
    const orbitLines = TRAPPIST_PLANETS.map(
      (p, i) => new THREE.LineLoop(orbitGeos[i], p.inHabitableZone ? orbitMatHz : orbitMatNormal)
    );

    const highlightGeo = new THREE.RingGeometry(0.95, 1.12, 48);
    const highlightMat = new THREE.MeshBasicMaterial({
      color: '#38bdf8',
      transparent: true,
      opacity: 0.88,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const skyDomeGeo = new THREE.SphereGeometry(64, 48, 32);
    const skyDomeMat = new THREE.ShaderMaterial({
      vertexShader: SKY_DOME_VERT,
      fragmentShader: SKY_DOME_FRAG,
      side: THREE.BackSide,
      depthWrite: false,
    });

    const oceanGeo = new THREE.PlaneGeometry(90, 90, 1, 1);
    const oceanMat = new THREE.ShaderMaterial({
      vertexShader: ALIEN_OCEAN_VERT,
      fragmentShader: ALIEN_OCEAN_FRAG,
      uniforms: { uTime: { value: 0 } },
    });

    const shoreGeo = new THREE.PlaneGeometry(44, 18, 48, 24);
    const sPos = shoreGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < sPos.count; i++) {
      const x = sPos.getX(i);
      const y = sPos.getY(i);
      const ridge =
        Math.sin(x * 0.28) * 0.65 +
        Math.cos(y * 0.35 + x * 0.14) * 0.45 +
        (Math.abs(x) > 8 ? (Math.abs(x) - 8) * 0.22 : 0);
      const slope = (y + 9) * -0.09;
      sPos.setZ(i, Math.max(-0.4, ridge + slope + 0.35));
    }
    shoreGeo.computeVertexNormals();
    const shoreMat = new THREE.MeshStandardMaterial({
      map: rockyTex,
      color: '#433834',
      roughness: 0.94,
      metalness: 0.06,
    });

    const bgPos = new Float32Array(STAR_COUNT * 3);
    for (let i = 0; i < STAR_COUNT; i++) {
      const u = ((i * 7919) % 10000) / 10000;
      const v = ((i * 3571) % 10000) / 10000;
      const theta = u * Math.PI * 2;
      const phi = Math.acos(2 * v - 1);
      const r = 72 + ((i * 197) % 45);
      bgPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      bgPos[i * 3 + 1] = r * Math.cos(phi);
      bgPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const bgStarGeo = new THREE.BufferGeometry();
    bgStarGeo.setAttribute('position', new THREE.BufferAttribute(bgPos, 3));
    const bgStarMat = new THREE.PointsMaterial({
      size: 0.52,
      map: softMap,
      color: '#e2e8f0',
      transparent: true,
      opacity: 0.84,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    return {
      starGeo,
      starMat,
      coronaGeo,
      coronaMat,
      hzGeo,
      hzMat,
      planetGeo,
      planetMats,
      orbitGeos,
      orbitMatNormal,
      orbitMatHz,
      orbitLines,
      highlightGeo,
      highlightMat,
      skyDomeGeo,
      skyDomeMat,
      oceanGeo,
      oceanMat,
      shoreGeo,
      shoreMat,
      bgStarGeo,
      bgStarMat,
    };
  }, []);

  useEffect(() => {
    return () => {
      resources.starGeo.dispose();
      resources.starMat.dispose();
      resources.coronaGeo.dispose();
      resources.coronaMat.dispose();
      resources.hzGeo.dispose();
      resources.hzMat.dispose();
      resources.planetGeo.dispose();
      resources.planetMats.forEach((m) => m.dispose());
      resources.orbitGeos.forEach((g) => g.dispose());
      resources.orbitMatNormal.dispose();
      resources.orbitMatHz.dispose();
      resources.highlightGeo.dispose();
      resources.highlightMat.dispose();
      resources.skyDomeGeo.dispose();
      resources.skyDomeMat.dispose();
      resources.oceanGeo.dispose();
      resources.oceanMat.dispose();
      resources.shoreGeo.dispose();
      resources.shoreMat.dispose();
      resources.bgStarGeo.dispose();
      resources.bgStarMat.dispose();
    };
  }, [resources]);

  useFrame((state, delta) => {
    if (activeLab !== 'trappist_exoplanets' || isTabHidden) return;
    const dt = Math.min(delta, 0.05);
    const t = reducedMotion ? 0 : state.clock.elapsedTime;

    resources.starMat.uniforms.uTime.value = t;
    resources.oceanMat.uniforms.uTime.value = t;

    if (playing && !reducedMotion) {
      simTimeRef.current += dt * 1.15;
    }

    const simT = simTimeRef.current;
    for (let i = 0; i < TRAPPIST_PLANETS.length; i++) {
      const p = TRAPPIST_PLANETS[i];
      const omega = (Math.PI * 2) / (p.orbitalPeriodDays * 1.6);
      const angle = simT * omega + i * 1.18;

      // Sync Kepler transit light-curve phase to real 3D orbital conjunction along +Z (camera line of sight -> phase 0.5)
      if (p.id === selectedPlanet) {
        const normAngle = (((angle - Math.PI / 2) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        trappistLiveTelemetry.phase = (normAngle / (Math.PI * 2) + 0.5) % 1;
      }

      if (viewMode === 'system') {
        const mesh = planetRefs.current[i];
        if (!mesh) continue;
        const x = Math.cos(angle) * p.orbitRadiusVisual;
        const z = Math.sin(angle) * p.orbitRadiusVisual;
        mesh.position.set(x, 0, z);
        const visR = 0.42 + p.radiusEarth * 0.28;
        mesh.scale.setScalar(visR);
        mesh.rotation.y = -angle;

        if (p.id === selectedPlanet && highlightRingRef.current) {
          highlightRingRef.current.position.set(x, 0.04, z);
          const pulse = reducedMotion ? 1.0 : 1.0 + Math.sin(t * 4.2) * 0.07;
          highlightRingRef.current.scale.setScalar(visR * 1.52 * pulse);
        }
      }
    }
  });

  if (activeLab !== 'trappist_exoplanets') return null;

  return (
    <group name="trappist-system-lab-root">
      <ambientLight intensity={0.35} />
      <pointLight position={[0, 1.5, 0]} intensity={5.2} distance={55} decay={1.2} color="#ff8e66" />
      <directionalLight position={[0, 8, -18]} intensity={1.45} color="#ff9d76" />

      {viewMode === 'system' ? (
        <group name="trappist-orbital-view">
          <points geometry={resources.bgStarGeo} material={resources.bgStarMat} />

          {/* Ultra-cool M8V Red Dwarf TRAPPIST-1 */}
          <mesh geometry={resources.starGeo} material={resources.starMat} />
          <mesh geometry={resources.coronaGeo} material={resources.coronaMat} />

          {/* Feathered Habitable Zone Ring */}
          <mesh geometry={resources.hzGeo} material={resources.hzMat} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]} />

          {/* 7 Resonant Orbit Rings & Planets */}
          {TRAPPIST_PLANETS.map((p, idx) => (
            <React.Fragment key={p.id}>
              <primitive object={resources.orbitLines[idx]} />
              <mesh
                ref={(el) => {
                  planetRefs.current[idx] = el;
                }}
                geometry={resources.planetGeo}
                material={resources.planetMats[idx]}
              />
            </React.Fragment>
          ))}

          {/* Active Planet Selection Halo */}
          <mesh
            ref={highlightRingRef}
            geometry={resources.highlightGeo}
            material={resources.highlightMat}
            rotation={[-Math.PI / 2, 0, 0]}
          />
        </group>
      ) : (
        <group name="trappist-1e-surface-view">
          <mesh geometry={resources.skyDomeGeo} material={resources.skyDomeMat} />

          <group position={[0, 6.2, -26]}>
            <mesh geometry={resources.starGeo} material={resources.starMat} scale={[2.3, 2.3, 2.3]} />
            <mesh geometry={resources.coronaGeo} material={resources.coronaMat} scale={[2.45, 2.45, 2.45]} />
          </group>

          <mesh position={[-8.8, 9.6, -21]} scale={[2.1, 2.1, 2.1]} geometry={resources.planetGeo} material={resources.planetMats[2]} />
          <mesh position={[9.4, 10.2, -22]} scale={[2.6, 2.6, 2.6]} geometry={resources.planetGeo} material={resources.planetMats[4]} />
          <mesh position={[3.4, 13.6, -26]} scale={[1.5, 1.5, 1.5]} geometry={resources.planetGeo} material={resources.planetMats[5]} />

          <mesh geometry={resources.oceanGeo} material={resources.oceanMat} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -14]} />
          <mesh geometry={resources.shoreGeo} material={resources.shoreMat} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.35, 11.5]} />
        </group>
      )}
    </group>
  );
};
