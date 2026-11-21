import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '@/stores/useAppStore';
import { StellarEvolutionState, evaluateStellarEvolution } from '@/simulation/cosmic/CosmicPhysics';
import { AssetManager } from '@/engine/assets/AssetManager';
import nebulaPillarFrag from '@/shaders/cosmic/nebulaPillar.frag.glsl';

const NEBULA_VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormalDir;
  varying vec3 vViewDir;
  void main() {
    vUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vNormalDir = normalize(mat3(modelMatrix) * normal);
    vViewDir = normalize(cameraPosition - worldPos.xyz);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const STAR_PLASMA_VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormalDir;
  varying vec3 vViewDir;
  void main() {
    vUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vNormalDir = normalize(mat3(modelMatrix) * normal);
    vViewDir = normalize(cameraPosition - worldPos.xyz);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const STAR_PLASMA_FRAG = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform vec3 uStarColor;
  uniform float uIsBlackHole;
  varying vec2 vUv;
  varying vec3 vNormalDir;
  varying vec3 vViewDir;

  void main() {
    vec3 n = normalize(vNormalDir);
    vec3 v = normalize(vViewDir);
    float ndotv = clamp(abs(dot(n, v)), 0.0, 1.0);

    if (uIsBlackHole > 0.5) {
      float photonRim = pow(clamp(1.0 - ndotv, 0.0, 1.0), 4.0);
      vec3 col = vec3(1.0, 0.52, 0.14) * photonRim * 1.4;
      gl_FragColor = vec4(col, 1.0);
      return;
    }

    float gran =
      0.5 +
      0.28 * sin(vUv.x * 38.0 + uTime * 1.4 + sin(vUv.y * 22.0) * 1.6) +
      0.22 * cos(vUv.y * 34.0 - uTime * 1.1 + vUv.x * 12.0);
    float limbDark = pow(ndotv, 0.45);
    float coronaRim = pow(clamp(1.0 - ndotv, 0.0, 1.0), 2.5);

    vec3 core = uStarColor * (0.72 + 0.52 * gran) * (0.42 + 0.72 * limbDark);
    vec3 col = core + mix(uStarColor, vec3(1.0), 0.35) * coronaRim * 0.65;
    gl_FragColor = vec4(col, 1.0);
  }
`;

const REMNANT_DISC_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const REMNANT_DISC_FRAG = /* glsl */ `
  precision highp float;
  uniform float uTime;
  varying vec2 vUv;
  void main() {
    vec2 p = (vUv - 0.5) * 2.0;
    float r = length(p);
    float angle = r > 1e-5 ? atan(p.y, p.x) : 0.0;
    float mask = smoothstep(0.28, 0.36, r) * (1.0 - smoothstep(0.48, 0.98, r));
    float swirl = 0.55 + 0.45 * sin(angle * 4.0 - r * 14.0 + uTime * 3.4);
    vec3 col = mix(vec3(1.0, 0.92, 0.72), vec3(0.95, 0.38, 0.08), smoothstep(0.32, 0.85, r));
    float alpha = mask * swirl * 0.92;
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(col * 1.15, alpha);
  }
`;

const SHELL_SHOCK_FRAG = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform vec3 uShellColor;
  uniform float uOpacity;
  varying vec2 vUv;
  varying vec3 vNormalDir;
  varying vec3 vViewDir;
  void main() {
    float ndotv = clamp(abs(dot(normalize(vNormalDir), normalize(vViewDir))), 0.0, 1.0);
    float rim = pow(clamp(1.0 - ndotv, 0.0, 1.0), 2.1);
    float fil = 0.65 + 0.35 * sin(vUv.x * 24.0 + uTime * 1.5) * cos(vUv.y * 18.0 - uTime * 1.1);
    float alpha = rim * fil * uOpacity;
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(uShellColor * 1.25, clamp(alpha, 0.0, 0.88));
  }
`;

function createStarBurstTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const h = size / 2;
    const g = ctx.createRadialGradient(h, h, 0, h, h, h);
    g.addColorStop(0.0, 'rgba(255,255,255,0.96)');
    g.addColorStop(0.11, 'rgba(186,230,253,0.72)');
    g.addColorStop(0.36, 'rgba(56,189,248,0.16)');
    g.addColorStop(1.0, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);

    // Crisp JWST 6-point diffraction spikes (clean sparkle without bloom clipping)
    ctx.save();
    ctx.translate(h, h);
    for (let k = 0; k < 3; k++) {
      const sp = ctx.createLinearGradient(-h, 0, h, 0);
      sp.addColorStop(0, 'rgba(255,255,255,0)');
      sp.addColorStop(0.43, 'rgba(186,230,253,0.22)');
      sp.addColorStop(0.5, 'rgba(255,255,255,0.88)');
      sp.addColorStop(0.57, 'rgba(186,230,253,0.22)');
      sp.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = sp;
      ctx.fillRect(-h, -0.9, size, 1.8);
      ctx.rotate(Math.PI / 3);
    }
    ctx.restore();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export const StellarLabScene: React.FC = () => {
  const labTab = useAppStore((s) => s.stellarLabTab);
  const nebulaId = useAppStore((s) => s.stellarNebulaId);
  const massSolar = useAppStore((s) => s.stellarMassSolar);
  const ageProgress = useAppStore((s) => s.stellarAgeProgress);

  const nebulaGroupRef = useRef<THREE.Group>(null);
  const starMeshRef = useRef<THREE.Mesh>(null);
  const shellRef = useRef<THREE.Mesh>(null);
  const jetGroupRef = useRef<THREE.Group>(null);
  const bhDiscRef = useRef<THREE.Mesh>(null);
  const crabPulsarRef = useRef<THREE.Group>(null);

  const lastMassRef = useRef(-1);
  const lastAgeRef = useRef(-1);
  const cachedEvoRef = useRef<StellarEvolutionState>(
    evaluateStellarEvolution(massSolar, ageProgress)
  );

  const softParticle = useMemo(() => AssetManager.getInstance().getSoftParticleMap(), []);

  const gpu = useMemo(() => {
    const starBurstTex = createStarBurstTexture();

    // 1. Rich 3,400-star pinpoint Eagle Nebula cluster (size 0.42 — crisp pinpoints, zero bokeh confetti!)
    const starCount = 3400;
    const starPos = new Float32Array(starCount * 3);
    const starCols = new Float32Array(starCount * 3);
    const palette = [
      new THREE.Color('#f0f9ff'),
      new THREE.Color('#fef3c7'),
      new THREE.Color('#93c5fd'),
      new THREE.Color('#fecdd3'),
      new THREE.Color('#ffffff'),
    ];
    for (let i = 0; i < starCount; i++) {
      const a = Math.abs((Math.sin(i * 12.989) * 43758.545) % 1) * Math.PI * 2;
      const b = Math.acos(2 * Math.abs((Math.sin(i * 78.233 + 1.3) * 24634.63) % 1) - 1);
      const r = 34 + Math.abs((Math.sin(i * 45.164) * 19283.12) % 1) * 90;
      starPos[i * 3] = r * Math.sin(b) * Math.cos(a);
      starPos[i * 3 + 1] = r * Math.cos(b);
      starPos[i * 3 + 2] = r * Math.sin(b) * Math.sin(a);
      const c = palette[i % palette.length];
      starCols[i * 3] = c.r;
      starCols[i * 3 + 1] = c.g;
      starCols[i * 3 + 2] = c.b;
    }
    const starsGeo = new THREE.BufferGeometry();
    starsGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starsGeo.setAttribute('color', new THREE.BufferAttribute(starCols, 3));
    const starsMat = new THREE.PointsMaterial({
      map: softParticle,
      vertexColors: true,
      size: 0.48,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    // 2. Authentic JWST Volumetric FBM Pillars of Creation (M16): single crisp hero plane + soft background ionized gas veil (zero double-outlines!)
    const pillarCanvasGeo = new THREE.PlaneGeometry(31, 24);
    const pillarMatMain = new THREE.ShaderMaterial({
      vertexShader: NEBULA_VERT,
      fragmentShader: nebulaPillarFrag,
      uniforms: { uTime: { value: 0 }, uMode: { value: 0.0 } },
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const pillarMatDepth = new THREE.ShaderMaterial({
      vertexShader: NEBULA_VERT,
      fragmentShader: nebulaPillarFrag,
      uniforms: { uTime: { value: 2.4 }, uMode: { value: 2.0 } },
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const protostarSpriteMat = new THREE.SpriteMaterial({
      map: starBurstTex,
      color: '#e0f2fe',
      transparent: true,
      opacity: 0.88,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    // Crab Nebula M1 sculpted synchrotron filament shell
    const crabGeo = new THREE.IcosahedronGeometry(7.2, 4);
    const cPos = crabGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < cPos.count; i++) {
      const x = cPos.getX(i);
      const y = cPos.getY(i);
      const z = cPos.getZ(i);
      const n = Math.sin(y * 0.9 + 2.7) * Math.cos(x * 1.1 - z * 0.8) * 1.15;
      cPos.setXYZ(i, x + n, y, z + n * 0.85);
    }
    cPos.needsUpdate = true;
    crabGeo.computeVertexNormals();

    const crabMat = new THREE.ShaderMaterial({
      vertexShader: NEBULA_VERT,
      fragmentShader: nebulaPillarFrag,
      uniforms: { uTime: { value: 0 }, uMode: { value: 1.0 } },
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    // 3. Stellar Lifecycle Star + Volumetric Shader Shell + Pulsar Jets + Relativistic Accretion Disc
    const starGeo = new THREE.SphereGeometry(1.0, 48, 36);
    const starMat = new THREE.ShaderMaterial({
      vertexShader: STAR_PLASMA_VERT,
      fragmentShader: STAR_PLASMA_FRAG,
      uniforms: {
        uTime: { value: 0 },
        uStarColor: { value: new THREE.Color('#fef08a') },
        uIsBlackHole: { value: 0 },
      },
    });

    const shellGeo = new THREE.SphereGeometry(1.0, 40, 32);
    const shellMat = new THREE.ShaderMaterial({
      vertexShader: NEBULA_VERT,
      fragmentShader: SHELL_SHOCK_FRAG,
      uniforms: {
        uTime: { value: 0 },
        uShellColor: { value: new THREE.Color('#38bdf8') },
        uOpacity: { value: 0.65 },
      },
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const jetGeo = new THREE.ConeGeometry(0.45, 12.0, 24, 1, true);
    const jetMat = new THREE.MeshBasicMaterial({
      color: '#22d3ee',
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const bhDiscGeo = new THREE.PlaneGeometry(11.5, 11.5);
    const bhDiscMat = new THREE.ShaderMaterial({
      vertexShader: REMNANT_DISC_VERT,
      fragmentShader: REMNANT_DISC_FRAG,
      uniforms: { uTime: { value: 0 } },
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    return {
      starBurstTex,
      starsGeo,
      starsMat,
      pillarCanvasGeo,
      pillarMatMain,
      pillarMatDepth,
      protostarSpriteMat,
      crabGeo,
      crabMat,
      starGeo,
      starMat,
      shellGeo,
      shellMat,
      jetGeo,
      jetMat,
      bhDiscGeo,
      bhDiscMat,
    };
  }, [softParticle]);

  useEffect(() => {
    return () => {
      gpu.starBurstTex.dispose();
      gpu.starsGeo.dispose();
      gpu.starsMat.dispose();
      gpu.pillarCanvasGeo.dispose();
      gpu.pillarMatMain.dispose();
      gpu.pillarMatDepth.dispose();
      gpu.protostarSpriteMat.dispose();
      gpu.crabGeo.dispose();
      gpu.crabMat.dispose();
      gpu.starGeo.dispose();
      gpu.starMat.dispose();
      gpu.shellGeo.dispose();
      gpu.shellMat.dispose();
      gpu.jetGeo.dispose();
      gpu.jetMat.dispose();
      gpu.bhDiscGeo.dispose();
      gpu.bhDiscMat.dispose();
    };
  }, [gpu]);

  const colorScratch = useRef(new THREE.Color());

  useFrame((state, delta) => {
    const dt = Math.min(Math.max(delta, 0.001), 0.05);
    const store = useAppStore.getState();
    const elapsed = store.reducedMotion ? 0 : state.clock.elapsedTime;
    const motionScale = store.reducedMotion ? 0.0 : 1.0;

    gpu.pillarMatMain.uniforms.uTime.value = elapsed;
    gpu.pillarMatDepth.uniforms.uTime.value = elapsed + 2.4;
    gpu.crabMat.uniforms.uTime.value = elapsed;
    gpu.shellMat.uniforms.uTime.value = elapsed;
    gpu.bhDiscMat.uniforms.uTime.value = elapsed;

    if (nebulaGroupRef.current && store.stellarNebulaId === 'crab') {
      nebulaGroupRef.current.rotation.y += dt * 0.05 * motionScale;
    } else if (nebulaGroupRef.current) {
      // Gentle volumetric parallax sway for 3D depth across the layered M16 Pillars
      nebulaGroupRef.current.rotation.y = Math.sin(elapsed * 0.14) * 0.09;
    }

    if (crabPulsarRef.current) {
      crabPulsarRef.current.rotation.z = 0.42;
      crabPulsarRef.current.rotation.y += dt * 4.5 * motionScale;
    }

    // Zero-alloc primitive dirty-check cached stellar evolution (F5/F8)
    if (store.stellarMassSolar !== lastMassRef.current || store.stellarAgeProgress !== lastAgeRef.current) {
      lastMassRef.current = store.stellarMassSolar;
      lastAgeRef.current = store.stellarAgeProgress;
      cachedEvoRef.current = evaluateStellarEvolution(
        store.stellarMassSolar,
        store.stellarAgeProgress
      );
    }
    const evo = cachedEvoRef.current;

    gpu.starMat.uniforms.uTime.value = elapsed;
    colorScratch.current.set(evo.colorHex);
    gpu.starMat.uniforms.uStarColor.value.copy(colorScratch.current);
    gpu.starMat.uniforms.uIsBlackHole.value = evo.stageKey === 'black_hole' ? 1.0 : 0.0;

    if (starMeshRef.current) {
      const pulse =
        !store.reducedMotion && (evo.stageKey === 'red_giant' || evo.stageKey === 'red_supergiant')
          ? 1 + Math.sin(elapsed * 2.2) * 0.04
          : 1;
      starMeshRef.current.scale.setScalar(evo.radiusVisual * pulse);
      starMeshRef.current.rotation.y += dt * 0.25 * motionScale;
    }

    if (shellRef.current) {
      const showShell = evo.stageKey === 'planetary_nebula' || evo.stageKey === 'supernova';
      shellRef.current.visible = showShell;
      if (showShell) {
        const s = evo.stageKey === 'supernova' ? 9.5 + Math.sin(elapsed * 3) * 0.35 : 6.4;
        shellRef.current.scale.setScalar(s);
        gpu.shellMat.uniforms.uShellColor.value.set(
          evo.stageKey === 'supernova' ? '#f97316' : '#38bdf8'
        );
        gpu.shellMat.uniforms.uOpacity.value = evo.stageKey === 'supernova' ? 0.78 : 0.58;
      }
    }

    if (jetGroupRef.current) {
      jetGroupRef.current.visible = evo.stageKey === 'neutron_star';
      jetGroupRef.current.rotation.y += dt * 5.2 * motionScale;
      jetGroupRef.current.rotation.z = 0.35;
    }

    if (bhDiscRef.current) {
      bhDiscRef.current.visible = evo.stageKey === 'black_hole';
    }
  });

  const isNebula = labTab === 'nebula';
  const evoStatic = evaluateStellarEvolution(massSolar, ageProgress);

  return (
    <group name="stellar-nebula-lab">
      <points geometry={gpu.starsGeo} material={gpu.starsMat} />

      {isNebula ? (
        <group ref={nebulaGroupRef}>
          {nebulaId === 'pillars' ? (
            <group position={[0, 1.0, 0]}>
              {/* Deep-Field Background Ionized Gas Veil + Single Crisp Volumetric FBM Pillars Hero Canvas */}
              <mesh
                position={[0, 0.5, -4.5]}
                scale={[1.38, 1.32, 1]}
                geometry={gpu.pillarCanvasGeo}
                material={gpu.pillarMatDepth}
              />
              <mesh position={[0, 0, 0]} geometry={gpu.pillarCanvasGeo} material={gpu.pillarMatMain} />
              {/* Crisp JWST 6-Point Diffraction Newborn Protostars (Zero Blowout) */}
              <sprite position={[-3.2, 6.9, 0.8]} scale={[2.0, 2.0, 1]} material={gpu.protostarSpriteMat} />
              <sprite position={[2.2, 3.2, 0.9]} scale={[1.65, 1.65, 1]} material={gpu.protostarSpriteMat} />
              <sprite position={[7.4, -0.2, 0.8]} scale={[1.4, 1.4, 1]} material={gpu.protostarSpriteMat} />
              <sprite position={[-8.4, 4.6, 0.5]} scale={[1.35, 1.35, 1]} material={gpu.protostarSpriteMat} />
              <sprite position={[6.3, 6.4, 0.4]} scale={[1.55, 1.55, 1]} material={gpu.protostarSpriteMat} />
            </group>
          ) : (
            <group>
              <mesh geometry={gpu.crabGeo} material={gpu.crabMat} />
              <group ref={crabPulsarRef}>
                <sprite scale={[2.6, 2.6, 1]} material={gpu.protostarSpriteMat} />
                <mesh position={[0, 5.8, 0]} geometry={gpu.jetGeo} material={gpu.jetMat} />
                <mesh position={[0, -5.8, 0]} rotation={[Math.PI, 0, 0]} geometry={gpu.jetGeo} material={gpu.jetMat} />
              </group>
            </group>
          )}
        </group>
      ) : (
        <group>
          <mesh ref={starMeshRef} geometry={gpu.starGeo} material={gpu.starMat} />
          <mesh ref={shellRef} geometry={gpu.shellGeo} material={gpu.shellMat} />
          <group ref={jetGroupRef} visible={evoStatic.stageKey === 'neutron_star'}>
            <mesh position={[0, 6.2, 0]} geometry={gpu.jetGeo} material={gpu.jetMat} />
            <mesh position={[0, -6.2, 0]} rotation={[Math.PI, 0, 0]} geometry={gpu.jetGeo} material={gpu.jetMat} />
          </group>
          <mesh
            ref={bhDiscRef}
            visible={evoStatic.stageKey === 'black_hole'}
            rotation={[-Math.PI / 2.35, 0.15, 0]}
            geometry={gpu.bhDiscGeo}
            material={gpu.bhDiscMat}
          />
        </group>
      )}
    </group>
  );
};

export default StellarLabScene;
