import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore, type CutawayBodyId } from '@/stores/useAppStore';
import { clampCutawayAngle, getCutawayBodyProfile } from '@/simulation/cosmic/Wave2Physics';
import { AssetManager } from '@/engine/assets/AssetManager';

const CUTAWAY_RADIUS = 4.6;
const STAR_COUNT = 1600;

const OUTER_SHELL_VERT = /* glsl */ `
  varying vec3 vLocalPos;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPos;
  varying vec2 vUv;

  void main() {
    vLocalPos = position;
    vUv = uv;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const OUTER_SHELL_FRAG = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uUseMap;
  uniform float uBodyMode;
  uniform float uCutAngleRad;
  uniform float uTime;
  uniform vec3 uBaseColor;
  uniform vec3 uRimColor;

  varying vec3 vLocalPos;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPos;
  varying vec2 vUv;

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

  float fbm3(vec3 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * noise3(p);
      p = p * 2.05 + vec3(1.3, -0.7, 0.9);
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec3 p = normalize(vLocalPos);
    float horiz = length(p.xz);
    float phi = horiz > 1e-4 ? atan(p.z, p.x) : 0.0;
    if (phi < 0.0) phi += 6.2831853;

    if (uCutAngleRad > 0.015 && phi < uCutAngleRad) {
      discard;
    }

    vec3 N = normalize(vWorldNormal);
    vec3 V = normalize(cameraPosition - vWorldPos);
    vec3 L = normalize(vec3(0.68, 0.45, 0.58));
    float ndl = max(dot(N, L), 0.0);
    float ndv = max(dot(N, V), 0.0);
    float rim = pow(max(0.0001, 1.0 - ndv), 2.8);

    vec3 albedo = uBaseColor;
    vec3 emissive = vec3(0.0);

    if (uUseMap > 0.5) {
      albedo = texture2D(uMap, vUv).rgb;
      if (uBodyMode > 2.5 && uBodyMode < 3.5) {
        // Europa icy tint with rusty fracture lineae
        float cracks = smoothstep(0.58, 0.66, abs(fbm3(p * 6.5) - 0.5) * 2.4);
        albedo = mix(vec3(0.74, 0.85, 0.93) * (0.72 + 0.35 * albedo), vec3(0.56, 0.31, 0.22), (1.0 - cracks) * 0.45);
      }
    } else if (uBodyMode > 0.5 && uBodyMode < 1.5) {
      // Sun boiling photosphere granulation
      float gran = fbm3(p * 7.5 + vec3(uTime * 0.14, -uTime * 0.09, uTime * 0.11));
      float flare = fbm3(p * 14.0 - vec3(uTime * 0.22, uTime * 0.12, 0.0));
      vec3 darkSpot = vec3(0.72, 0.18, 0.02);
      vec3 midPlasma = vec3(1.0, 0.52, 0.08);
      vec3 hotCell = vec3(1.0, 0.94, 0.65);
      vec3 solar = mix(darkSpot, midPlasma, smoothstep(0.24, 0.62, gran));
      solar = mix(solar, hotCell, smoothstep(0.58, 0.86, gran * 0.7 + flare * 0.35));
      emissive = solar * 1.12;
      albedo = vec3(0.0);
    } else {
      // Neutron star crystalline iron crust with glowing magnetic polar hotspots
      float mag = fbm3(p * 9.0 + vec3(0.0, uTime * 0.35, 0.0));
      float pole = pow(max(0.0001, abs(p.y)), 3.2);
      vec3 crust = mix(vec3(0.08, 0.22, 0.42), vec3(0.32, 0.78, 0.98), mag);
      emissive = crust * 0.85 + vec3(0.75, 0.96, 1.0) * pole * 1.4;
      albedo = crust;
    }

    // Subtle thin cut-edge bevel glow right along the sliced wedge boundary
    float edgeDist = min(abs(phi), abs(phi - uCutAngleRad));
    float cutHighlight = uCutAngleRad > 0.015 ? (1.0 - smoothstep(0.0, 0.035, edgeDist)) * 0.28 : 0.0;

    vec3 lit = albedo * (0.24 + 0.86 * ndl) + emissive + uRimColor * rim * 0.62 + vec3(0.9, 0.95, 1.0) * cutHighlight;
    gl_FragColor = vec4(lit, 1.0);
  }
`;

const CROSS_SECTION_VERT = /* glsl */ `
  varying vec2 vLocalXY;
  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;

  void main() {
    vLocalXY = position.xy;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const CROSS_SECTION_FRAG = /* glsl */ `
  uniform float uRadius;
  uniform float uTime;
  uniform float uSelectedLayer;
  uniform float uBodyMode;
  uniform vec4 uLayerRadii;
  uniform vec3 uColor0;
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform vec3 uColor3;
  uniform vec3 uEmissive0;
  uniform vec3 uEmissive1;
  uniform vec3 uEmissive2;
  uniform vec3 uEmissive3;

  varying vec2 vLocalXY;
  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;

  float hash2(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise2(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash2(i);
    float b = hash2(i + vec2(1.0, 0.0));
    float c = hash2(i + vec2(0.0, 1.0));
    float d = hash2(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  void main() {
    float rNorm = length(vLocalXY) / max(0.0001, uRadius);
    if (rNorm > 1.001) discard;

    float ang = rNorm > 1e-4 ? atan(vLocalXY.y, vLocalXY.x) : 0.0;
    float swirl = noise2(vec2(ang * 4.5 + uTime * 0.25, rNorm * 14.0 - uTime * 0.18));
    float fine = noise2(vec2(ang * 12.0 - uTime * 0.14, rNorm * 26.0));
    float texDetail = 0.78 + 0.28 * swirl + 0.14 * fine;

    // Layers are ordered outer (0) -> inner (3)
    int layerIdx = 0;
    vec3 col = uColor0;
    vec3 em = uEmissive0;
    float borderDist = abs(rNorm - uLayerRadii.y);

    if (rNorm <= uLayerRadii.w) {
      layerIdx = 3;
      col = uColor3;
      em = uEmissive3;
      borderDist = abs(rNorm - uLayerRadii.w);
    } else if (rNorm <= uLayerRadii.z) {
      layerIdx = 2;
      col = uColor2;
      em = uEmissive2;
      borderDist = min(abs(rNorm - uLayerRadii.z), abs(rNorm - uLayerRadii.w));
    } else if (rNorm <= uLayerRadii.y) {
      layerIdx = 1;
      col = uColor1;
      em = uEmissive1;
      borderDist = min(abs(rNorm - uLayerRadii.y), abs(rNorm - uLayerRadii.z));
    } else {
      layerIdx = 0;
      col = uColor0;
      em = uEmissive0;
      borderDist = min(abs(rNorm - 1.0), abs(rNorm - uLayerRadii.y));
    }

    // Crisp dark/luminous geological boundary lines between concentric strata
    float seam = 1.0 - smoothstep(0.004, 0.015, borderDist);
    vec3 baseLit = (col * 0.82 + em * 0.55) * texDetail;

    // Convective glow boost toward the hot core
    float coreHeat = pow(max(0.0001, 1.0 - rNorm), 1.8) * 0.35;
    baseLit += em * coreHeat;

    // Highlight user-selected geological layer cleanly
    float isSelected = 1.0 - step(0.5, abs(float(layerIdx) - uSelectedLayer));
    float pulse = 0.65 + 0.35 * sin(uTime * 3.8);
    baseLit = mix(baseLit, baseLit * 1.38 + vec3(0.24, 0.3, 0.38) * pulse, isSelected * 0.65);

    // Subtle specular ring highlight at layer seams
    vec3 seamColor = isSelected > 0.5 ? vec3(0.95, 0.99, 1.0) : vec3(0.08, 0.05, 0.04);
    baseLit = mix(baseLit, seamColor, seam * (isSelected > 0.5 ? 0.65 : 0.42));

    // Strong 3D dihedral grazing light + concave spine ambient occlusion for real 3D wedge depth
    vec3 faceN = normalize(vWorldNormal) * (gl_FrontFacing ? 1.0 : -1.0);
    float dihedral = 0.56 + 0.62 * max(dot(faceN, normalize(vec3(-0.38, 0.42, 0.82))), 0.0);
    float creaseAo = mix(0.56, 1.0, smoothstep(0.0, 0.16, abs(vLocalXY.x) / max(0.0001, uRadius)));

    // Sun & neutron star have stronger self-luminance, still retaining subtle 3D spine AO
    float lumBoost = (uBodyMode > 0.5 && uBodyMode < 1.5) || uBodyMode > 3.5 ? (1.12 * mix(0.76, 1.0, creaseAo)) : (dihedral * creaseAo);

    gl_FragColor = vec4(baseLit * lumBoost, 1.0);
  }
`;

function bodyModeNumber(id: CutawayBodyId): number {
  switch (id) {
    case 'earth':
      return 0;
    case 'sun':
      return 1;
    case 'jupiter':
      return 2;
    case 'europa':
      return 3;
    case 'neutron_star':
      return 4;
  }
}

export const PlanetaryCutawayScene: React.FC = () => {
  const activeLab = useAppStore((s) => s.activeCosmicLab);
  const cutawayBody = useAppStore((s) => s.cutawayBody);
  const cutawayAngleDeg = useAppStore((s) => s.cutawayAngleDeg);
  const cutawaySelectedLayer = useAppStore((s) => s.cutawaySelectedLayer);
  const isTabHidden = useAppStore((s) => s.isTabHidden);
  const reducedMotion = useAppStore((s) => s.reducedMotion);

  const rootGroupRef = useRef<THREE.Group>(null);
  const planeARef = useRef<THREE.Mesh>(null);
  const planeBRef = useRef<THREE.Mesh>(null);
  const coreMeshRef = useRef<THREE.Mesh>(null);
  const pulsarJetsRef = useRef<THREE.Group>(null);
  const lastBodyRef = useRef<CutawayBodyId | ''>('');
  const lastLayerRef = useRef<number>(-1);
  const lastAngleRef = useRef<number>(-1);

  const resources = useMemo(() => {
    const assets = AssetManager.getInstance();
    const earthTex = assets.loadTexture('earth_day');
    const jupiterTex = assets.loadTexture('jupiter');
    const europaTex = assets.getRegolithAlbedoMap('europa');
    const softMap = assets.getSoftParticleMap();

    const outerGeo = new THREE.SphereGeometry(CUTAWAY_RADIUS, 72, 48);
    const outerMat = new THREE.ShaderMaterial({
      vertexShader: OUTER_SHELL_VERT,
      fragmentShader: OUTER_SHELL_FRAG,
      side: THREE.FrontSide,
      uniforms: {
        uMap: { value: earthTex },
        uUseMap: { value: 1.0 },
        uBodyMode: { value: 0.0 },
        uCutAngleRad: { value: THREE.MathUtils.degToRad(95) },
        uTime: { value: 0 },
        uBaseColor: { value: new THREE.Color('#2563eb') },
        uRimColor: { value: new THREE.Color('#38bdf8') },
      },
    });

    const sectionGeo = new THREE.CircleGeometry(CUTAWAY_RADIUS * 0.997, 64, -Math.PI / 2, Math.PI);
    const sectionMat = new THREE.ShaderMaterial({
      vertexShader: CROSS_SECTION_VERT,
      fragmentShader: CROSS_SECTION_FRAG,
      side: THREE.DoubleSide,
      uniforms: {
        uRadius: { value: CUTAWAY_RADIUS * 0.997 },
        uTime: { value: 0 },
        uSelectedLayer: { value: 0 },
        uBodyMode: { value: 0 },
        uLayerRadii: { value: new THREE.Vector4(1.0, 0.94, 0.55, 0.24) },
        uColor0: { value: new THREE.Color('#2563eb') },
        uColor1: { value: new THREE.Color('#c2410c') },
        uColor2: { value: new THREE.Color('#f59e0b') },
        uColor3: { value: new THREE.Color('#fef08a') },
        uEmissive0: { value: new THREE.Color('#0c1f3d') },
        uEmissive1: { value: new THREE.Color('#7c2d12') },
        uEmissive2: { value: new THREE.Color('#d97706') },
        uEmissive3: { value: new THREE.Color('#fde047') },
      },
    });

    // Protruding 3D glowing inner core sphere inside the cut wedge
    const coreGeo = new THREE.SphereGeometry(1.0, 48, 32);
    const coreMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#fef08a'),
      emissive: new THREE.Color('#fde047'),
      emissiveIntensity: 1.45,
      roughness: 0.22,
      metalness: 0.15,
    });

    // Equatorial degree-gauge ring
    const caliperGeo = new THREE.RingGeometry(CUTAWAY_RADIUS * 1.12, CUTAWAY_RADIUS * 1.145, 96);
    const caliperMat = new THREE.MeshBasicMaterial({
      color: '#38bdf8',
      transparent: true,
      opacity: 0.24,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    // Neutron star polar relativistic pulsar jets (hidden for other bodies)
    const jetGeo = new THREE.ConeGeometry(0.45, 7.2, 24, 1, true);
    const jetMat = new THREE.MeshBasicMaterial({
      color: '#67e8f9',
      transparent: true,
      opacity: 0.42,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    // Background deep-space starfield
    const starPos = new Float32Array(STAR_COUNT * 3);
    const starCol = new Float32Array(STAR_COUNT * 3);
    const c = new THREE.Color();
    for (let i = 0; i < STAR_COUNT; i++) {
      const u = ((i * 7919) % 10000) / 10000;
      const v = ((i * 3571) % 10000) / 10000;
      const theta = u * Math.PI * 2;
      const phi = Math.acos(2 * v - 1);
      const r = 60 + ((i * 199) % 40);
      starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = r * Math.cos(phi);
      starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      c.setHSL(0.56 + (i % 7) * 0.04, 0.35, 0.72 + (i % 4) * 0.06);
      starCol[i * 3] = c.r;
      starCol[i * 3 + 1] = c.g;
      starCol[i * 3 + 2] = c.b;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starCol, 3));
    const starMat = new THREE.PointsMaterial({
      size: 0.52,
      map: softMap,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    return {
      earthTex,
      jupiterTex,
      europaTex,
      outerGeo,
      outerMat,
      sectionGeo,
      sectionMat,
      coreGeo,
      coreMat,
      caliperGeo,
      caliperMat,
      jetGeo,
      jetMat,
      starGeo,
      starMat,
    };
  }, []);

  useEffect(() => {
    return () => {
      resources.outerGeo.dispose();
      resources.outerMat.dispose();
      resources.sectionGeo.dispose();
      resources.sectionMat.dispose();
      resources.coreGeo.dispose();
      resources.coreMat.dispose();
      resources.caliperGeo.dispose();
      resources.caliperMat.dispose();
      resources.jetGeo.dispose();
      resources.jetMat.dispose();
      resources.starGeo.dispose();
      resources.starMat.dispose();
    };
  }, [resources]);

  useFrame((state, delta) => {
    if (activeLab !== 'planetary_cutaway' || isTabHidden) return;
    const dt = Math.min(delta, 0.05);
    const t = reducedMotion ? 0 : state.clock.elapsedTime;

    resources.outerMat.uniforms.uTime.value = t;
    resources.sectionMat.uniforms.uTime.value = t;

    const clampedDeg = clampCutawayAngle(cutawayAngleDeg);
    const cutRad = THREE.MathUtils.degToRad(clampedDeg);

    if (lastBodyRef.current !== cutawayBody) {
      lastBodyRef.current = cutawayBody;
      const profile = getCutawayBodyProfile(cutawayBody);
      const layers = profile.layers;
      const modeVal = bodyModeNumber(cutawayBody);

      resources.outerMat.uniforms.uBodyMode.value = modeVal;
      resources.sectionMat.uniforms.uBodyMode.value = modeVal;

      if (cutawayBody === 'earth') {
        resources.outerMat.uniforms.uMap.value = resources.earthTex;
        resources.outerMat.uniforms.uUseMap.value = 1.0;
        resources.outerMat.uniforms.uRimColor.value.set('#38bdf8');
      } else if (cutawayBody === 'jupiter') {
        resources.outerMat.uniforms.uMap.value = resources.jupiterTex;
        resources.outerMat.uniforms.uUseMap.value = 1.0;
        resources.outerMat.uniforms.uRimColor.value.set('#f59e0b');
      } else if (cutawayBody === 'europa') {
        resources.outerMat.uniforms.uMap.value = resources.europaTex;
        resources.outerMat.uniforms.uUseMap.value = 1.0;
        resources.outerMat.uniforms.uRimColor.value.set('#7dd3fc');
      } else if (cutawayBody === 'sun') {
        resources.outerMat.uniforms.uUseMap.value = 0.0;
        resources.outerMat.uniforms.uRimColor.value.set('#fb923c');
      } else {
        resources.outerMat.uniforms.uUseMap.value = 0.0;
        resources.outerMat.uniforms.uRimColor.value.set('#67e8f9');
      }

      const r0 = layers[0]?.outerRadiusNorm ?? 1.0;
      const r1 = layers[1]?.outerRadiusNorm ?? 0.85;
      const r2 = layers[2]?.outerRadiusNorm ?? 0.55;
      const r3 = layers[3]?.outerRadiusNorm ?? 0.25;
      resources.sectionMat.uniforms.uLayerRadii.value.set(r0, r1, r2, r3);

      resources.sectionMat.uniforms.uColor0.value.set(layers[0]?.colorHex ?? '#2563eb');
      resources.sectionMat.uniforms.uColor1.value.set(layers[1]?.colorHex ?? '#c2410c');
      resources.sectionMat.uniforms.uColor2.value.set(layers[2]?.colorHex ?? '#f59e0b');
      resources.sectionMat.uniforms.uColor3.value.set(layers[3]?.colorHex ?? '#fef08a');

      resources.sectionMat.uniforms.uEmissive0.value.set(layers[0]?.emissiveHex ?? '#0c1f3d');
      resources.sectionMat.uniforms.uEmissive1.value.set(layers[1]?.emissiveHex ?? '#7c2d12');
      resources.sectionMat.uniforms.uEmissive2.value.set(layers[2]?.emissiveHex ?? '#d97706');
      resources.sectionMat.uniforms.uEmissive3.value.set(layers[3]?.emissiveHex ?? '#fde047');

      const innerLayer = layers[layers.length - 1];
      resources.coreMat.color.set(innerLayer.colorHex);
      resources.coreMat.emissive.set(innerLayer.emissiveHex);

      if (coreMeshRef.current) {
        const coreScale = CUTAWAY_RADIUS * innerLayer.outerRadiusNorm * 1.03;
        coreMeshRef.current.scale.setScalar(coreScale);
      }
      if (pulsarJetsRef.current) {
        pulsarJetsRef.current.visible = cutawayBody === 'neutron_star';
      }
    }

    if (lastLayerRef.current !== cutawaySelectedLayer) {
      lastLayerRef.current = cutawaySelectedLayer;
      resources.sectionMat.uniforms.uSelectedLayer.value = cutawaySelectedLayer;
    }

    if (Math.abs(lastAngleRef.current - clampedDeg) > 0.01) {
      lastAngleRef.current = clampedDeg;
      resources.outerMat.uniforms.uCutAngleRad.value = cutRad;
      const showSlice = clampedDeg > 1.0;
      if (planeARef.current) {
        planeARef.current.visible = showSlice;
        planeARef.current.rotation.y = 0;
      }
      if (planeBRef.current) {
        planeBRef.current.visible = showSlice;
        planeBRef.current.rotation.y = -cutRad;
      }
      if (coreMeshRef.current) {
        coreMeshRef.current.visible = clampedDeg >= 16;
      }
    }

    if (rootGroupRef.current && !reducedMotion) {
      // Gentle breathing tilt while keeping the cutaway wedge facing the viewer cleanly
      rootGroupRef.current.rotation.y = Math.sin(t * 0.24) * 0.12;
    }

    if (pulsarJetsRef.current && cutawayBody === 'neutron_star' && !reducedMotion) {
      pulsarJetsRef.current.rotation.y += dt * 4.5;
    }
  });

  if (activeLab !== 'planetary_cutaway') return null;

  return (
    <group name="planetary-cutaway-lab-root">
      <ambientLight intensity={0.45} />
      <directionalLight position={[12, 9, 12]} intensity={1.9} color="#fff6e6" />
      <directionalLight position={[-10, -5, -8]} intensity={0.55} color="#7dd3fc" />

      <points geometry={resources.starGeo} material={resources.starMat} />

      <group ref={rootGroupRef} position={[0, 1.05, 0]}>
        {/* Outer spherical shell with smooth GLSL wedge discard */}
        <mesh geometry={resources.outerGeo} material={resources.outerMat} />

        {/* Two radial semicircular cross-section strata faces */}
        <mesh ref={planeARef} geometry={resources.sectionGeo} material={resources.sectionMat} />
        <mesh ref={planeBRef} geometry={resources.sectionGeo} material={resources.sectionMat} />

        {/* Protruding 3D glowing inner core */}
        <mesh ref={coreMeshRef} geometry={resources.coreGeo} material={resources.coreMat} />

        {/* Equatorial caliper gauge ring */}
        <mesh
          geometry={resources.caliperGeo}
          material={resources.caliperMat}
          rotation={[-Math.PI / 2, 0, 0]}
        />

        {/* Neutron star polar magnetic jets */}
        <group ref={pulsarJetsRef} visible={cutawayBody === 'neutron_star'} rotation={[0.25, 0, 0.2]}>
          <mesh geometry={resources.jetGeo} material={resources.jetMat} position={[0, CUTAWAY_RADIUS + 3.2, 0]} rotation={[Math.PI, 0, 0]} />
          <mesh geometry={resources.jetGeo} material={resources.jetMat} position={[0, -(CUTAWAY_RADIUS + 3.2), 0]} />
        </group>
      </group>
    </group>
  );
};
