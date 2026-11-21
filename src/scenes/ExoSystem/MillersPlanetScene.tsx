import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ArrowLeftCircle, Clock, Waves, AlertTriangle } from 'lucide-react';
import { AssetManager } from '@/engine/assets/AssetManager';
import { AudioManager } from '@/engine/audio/AudioManager';
import { useTranslation } from '@/i18n';
import megawaveVert from '@/shaders/ocean/megawave.vert.glsl';
import megawaveFrag from '@/shaders/ocean/megawave.frag.glsl';
import blackholeVert from '@/shaders/blackhole/blackhole.vert.glsl';
import blackholeFrag from '@/shaders/blackhole/blackhole.frag.glsl';

interface MillersPlanetSceneProps {
  visible: boolean;
  onExit?: () => void;
}

const NOOP_RAYCAST: THREE.Object3D['raycast'] = () => {};

function sampleMillerWave(x: number, z: number, t: number): { height: number; dHx: number; dHz: number } {
  const phase1 = z * 0.042 + x * 0.012 + t * 1.15;
  const wave1 = Math.sin(phase1) * 1.65;
  const dW1x = Math.cos(phase1) * 1.65 * 0.012;
  const dW1z = Math.cos(phase1) * 1.65 * 0.042;

  const phase2 = x * 0.055 - z * 0.034 + t * 1.45;
  const wave2 = Math.cos(phase2) * 0.95;
  const dW2x = -Math.sin(phase2) * 0.95 * 0.055;
  const dW2z = Math.sin(phase2) * 0.95 * 0.034;

  const phase3 = z * 0.11 + x * 0.08 - t * 2.2;
  const wave3 = Math.sin(phase3) * 0.35;
  const dW3x = Math.cos(phase3) * 0.35 * 0.08;
  const dW3z = Math.cos(phase3) * 0.35 * 0.11;

  const kMx = 0.0035;
  const kMz = 0.022;
  const thetaM = z * kMz + x * kMx + t * 0.38 + 1.85;
  const baseCos = THREE.MathUtils.clamp(0.5 + 0.5 * Math.cos(thetaM), 0.0, 1.0);
  const megawaveCrest = Math.pow(baseCos, 5.0) * 24.0;

  const dBaseDTheta = -0.5 * Math.sin(thetaM);
  const dMegaDTheta = 24.0 * 5.0 * Math.pow(baseCos, 4.0) * dBaseDTheta;
  const dMx = dMegaDTheta * kMx;
  const dMz = dMegaDTheta * kMz;

  return {
    height: wave1 + wave2 + wave3 + megawaveCrest,
    dHx: dW1x + dW2x + dW3x + dMx,
    dHz: dW1z + dW2z + dW3z + dMz,
  };
}

const MILLERS_SKY_VERT = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const MILLERS_SKY_FRAG = /* glsl */ `
  precision highp float;
  uniform vec3 uGargantuaDir;
  varying vec3 vDir;

  void main() {
    vec3 dir = normalize(vDir);
    float elev = clamp(dir.y, -0.1, 1.0);

    vec3 zenithCol = vec3(0.035, 0.065, 0.115);
    vec3 midCol = vec3(0.11, 0.17, 0.24);
    vec3 horizonMist = vec3(0.24, 0.28, 0.34);

    vec3 sky = mix(horizonMist, midCol, smoothstep(-0.02, 0.18, elev));
    sky = mix(sky, zenithCol, smoothstep(0.18, 0.72, elev));

    float gCos = max(dot(dir, normalize(uGargantuaDir)), 0.0);
    float amberScatter = pow(gCos, 5.5) * 0.42 + pow(gCos, 22.0) * 0.35;
    sky += vec3(0.88, 0.54, 0.24) * amberScatter * (1.0 - smoothstep(0.0, 0.55, elev) * 0.45);

    gl_FragColor = vec4(sky, 1.0);
  }
`;

export const MillersPlanetScene: React.FC<MillersPlanetSceneProps> = ({ visible, onExit: _onExit }) => {
  const rootRef = useRef<THREE.Group>(null);
  const oceanMatRef = useRef<THREE.ShaderMaterial>(null);
  const gargantuaGroupRef = useRef<THREE.Group>(null);
  const gargantuaMatRef = useRef<THREE.ShaderMaterial>(null);
  const rangerRef = useRef<THREE.Group>(null);
  const sprayPointsRef = useRef<THREE.Points>(null);
  const scratchCamPos = useRef(new THREE.Vector3());

  const audio = AudioManager.getInstance();
  const assets = useMemo(() => AssetManager.getInstance(), []);
  const hullMap = useMemo(() => assets.getAerospaceHullMap(), [assets]);
  const aeroBumpMap = useMemo(() => assets.getAerospaceBumpMap(), [assets]);
  const softParticleMap = useMemo(() => assets.getSoftParticleMap(), [assets]);
  const unitSphere = useMemo(() => assets.getUnitSphereGeometry(48), [assets]);

  const lightDir = useMemo(() => new THREE.Vector3(0.04, 0.22, -0.97).normalize(), []);

  // High-resolution XZ ocean plane
  const oceanGeo = useMemo(() => {
    if (!visible) return null;
    const geo = new THREE.PlaneGeometry(680, 680, 192, 192);
    geo.rotateX(-Math.PI / 2);
    return geo;
  }, [visible]);

  // UV-mapped sculpted horizontal wedge lifting-body hull for Endurance "Ranger" (bow at -Z, aft at +Z)
  const rangerHullGeo = useMemo(() => {
    if (!visible) return null;
    const stations = [
      { z: -3.6, hw: 0.26, topY: 0.16, botY: 0.04 },
      { z: -2.0, hw: 0.92, topY: 0.54, botY: -0.07 },
      { z: -0.3, hw: 1.65, topY: 0.84, botY: -0.12 },
      { z: 1.5, hw: 2.28, topY: 0.74, botY: -0.12 },
      { z: 2.9, hw: 2.42, topY: 0.54, botY: -0.08 },
    ];
    const verts: number[] = [];
    const uvs: number[] = [];
    const pushVertex = (p: number[]) => {
      verts.push(p[0], p[1], p[2]);
      uvs.push(p[0] * 0.22 + 0.5, (p[2] + 3.6) / 6.5);
    };
    const pushQuad = (a: number[], b: number[], c: number[], d: number[]) => {
      pushVertex(a);
      pushVertex(b);
      pushVertex(c);
      pushVertex(a);
      pushVertex(c);
      pushVertex(d);
    };
    for (let i = 0; i < stations.length - 1; i++) {
      const s0 = stations[i];
      const s1 = stations[i + 1];
      const c0 = [0, s0.topY, s0.z];
      const c1 = [0, s1.topY, s1.z];
      const l0 = [-s0.hw, 0.12, s0.z];
      const l1 = [-s1.hw, 0.12, s1.z];
      const r0 = [s0.hw, 0.12, s0.z];
      const r1 = [s1.hw, 0.12, s1.z];
      const bl0 = [-s0.hw * 0.85, s0.botY, s0.z];
      const bl1 = [-s1.hw * 0.85, s1.botY, s1.z];
      const br0 = [s0.hw * 0.85, s0.botY, s0.z];
      const br1 = [s1.hw * 0.85, s1.botY, s1.z];

      pushQuad(c0, l0, l1, c1);
      pushQuad(c0, c1, r1, r0);
      pushQuad(l0, bl0, bl1, l1);
      pushQuad(r0, r1, br1, br0);
      pushQuad(bl0, br0, br1, bl1);
    }
    const st = stations[stations.length - 1];
    [
      [0, st.topY, st.z],
      [-st.hw, 0.12, st.z],
      [st.hw, 0.12, st.z],
      [-st.hw, 0.12, st.z],
      [-st.hw * 0.85, st.botY, st.z],
      [st.hw * 0.85, st.botY, st.z],
      [-st.hw, 0.12, st.z],
      [st.hw * 0.85, st.botY, st.z],
      [st.hw, 0.12, st.z],
    ].forEach(pushVertex);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.computeVertexNormals();
    return geo;
  }, [visible]);

  // Wind-sheared megawave crest spindrift sea-spray particles tracking exact crest ridge (z ≈ -84.1 - 0.159x)
  const sprayPositions = useMemo(() => {
    if (!visible) return null;
    const count = 520;
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const s1 = Math.sin(i * 127.1) * 43758.5453;
      const s2 = Math.sin(i * 311.7) * 43758.5453;
      const s3 = Math.sin(i * 74.7) * 43758.5453;
      const r1 = s1 - Math.floor(s1);
      const r2 = s2 - Math.floor(s2);
      const r3 = s3 - Math.floor(s3);
      const x = (r1 - 0.5) * 260;
      arr[i * 3] = x;
      arr[i * 3 + 1] = 18.8 + r2 * 4.2;
      arr[i * 3 + 2] = -78.0 - x * 0.159 + (r3 - 0.5) * 22.0;
    }
    return arr;
  }, [visible]);

  const oceanUniforms = useMemo(
    () => ({
      uTime: { value: 0.0 },
      uDepthColor: { value: new THREE.Color('#041b2d') },
      uSurfaceColor: { value: new THREE.Color('#134e5e') },
      uLightDir: { value: lightDir },
    }),
    [lightDir]
  );

  const skyUniforms = useMemo(
    () => ({
      uGargantuaDir: { value: lightDir },
    }),
    [lightDir]
  );

  const gargantuaUniforms = useMemo(
    () => ({
      uTime: { value: 0.0 },
      uLocalCamPos: { value: new THREE.Vector3(0, 12, 180) },
      uMaxSteps: { value: 48 },
      uVolumeRadius: { value: 65.0 },
    }),
    []
  );

  useEffect(() => {
    if (!visible) return;
    const root = rootRef.current;
    const spray = sprayPointsRef.current;
    return () => {
      oceanGeo?.dispose();
      rangerHullGeo?.dispose();
      spray?.geometry?.dispose();
      (spray?.material as THREE.Material | undefined)?.dispose();
      root?.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.isMesh) {
          if (
            mesh.geometry !== oceanGeo &&
            mesh.geometry !== rangerHullGeo &&
            mesh.geometry !== unitSphere
          ) {
            mesh.geometry?.dispose();
          }
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose());
          } else {
            mesh.material?.dispose();
          }
        }
      });
    };
  }, [visible, oceanGeo, rangerHullGeo, unitSphere]);

  // Ticking sound effect for 1.25s relativistic time dilation
  useEffect(() => {
    if (!visible) return;
    const interval = setInterval(() => {
      audio.playUIClick();
    }, 1250);
    return () => clearInterval(interval);
  }, [visible, audio]);

  useFrame((state, delta) => {
    if (!visible) return;

    let simT = 0.0;
    if (oceanMatRef.current) {
      oceanMatRef.current.uniforms.uTime.value += delta;
      simT = oceanMatRef.current.uniforms.uTime.value;
    }

    if (gargantuaGroupRef.current && gargantuaMatRef.current) {
      gargantuaMatRef.current.uniforms.uTime.value = simT * 0.65;
      scratchCamPos.current.copy(state.camera.position);
      gargantuaGroupRef.current.worldToLocal(scratchCamPos.current);
      gargantuaMatRef.current.uniforms.uLocalCamPos.value.copy(scratchCamPos.current);
    }

    if (sprayPointsRef.current) {
      sprayPointsRef.current.position.z = -((simT * 0.38) % (Math.PI * 2)) / 0.022;
    }

    // Framed cleanly inside the lower-center third (rz = 2.2 -> 100% unclipped bow-to-stern!)
    if (rangerRef.current) {
      const rx = -1.1;
      const rz = 2.2;
      const wave = sampleMillerWave(rx, rz, simT);
      rangerRef.current.position.set(rx, wave.height + 0.36, rz);
      rangerRef.current.rotation.set(
        THREE.MathUtils.clamp(Math.atan(wave.dHz) * 0.78, -0.55, 0.55),
        0.48,
        THREE.MathUtils.clamp(-Math.atan(wave.dHx) * 0.82, -0.45, 0.45)
      );
    }
  });

  if (!visible || !oceanGeo || !rangerHullGeo || !sprayPositions) return null;

  return (
    <group ref={rootRef} position={[0, -5, 0]}>
      <fogExp2 attach="fog" args={['#2c3846', 0.0024]} />

      {/* 1. Misty Exoplanet Atmospheric Sky Dome */}
      <mesh raycast={NOOP_RAYCAST}>
        <sphereGeometry args={[520, 48, 32]} />
        <shaderMaterial
          vertexShader={MILLERS_SKY_VERT}
          fragmentShader={MILLERS_SKY_FRAG}
          uniforms={skyUniforms}
          side={THREE.BackSide}
          depthWrite={false}
          fog={false}
        />
      </mesh>

      {/* 2. Relativistic Gravitational-Lensed Supermassive Black Hole GARGANTUA (Gap-Free DNGR Shadow + Einstein Arches) */}
      <group
        ref={gargantuaGroupRef}
        position={[10, 42, -245]}
        rotation={[0.22, 0.08, -0.26]}
        scale={1.48}
      >
        <mesh geometry={unitSphere} scale={65.0} raycast={NOOP_RAYCAST}>
          <shaderMaterial
            ref={gargantuaMatRef}
            vertexShader={blackholeVert}
            fragmentShader={blackholeFrag}
            uniforms={gargantuaUniforms}
            transparent
            side={THREE.FrontSide}
            depthWrite={false}
            fog={false}
          />
        </mesh>
      </group>

      {/* 3. Opaque Hardware-Depth-Sorted Lit Fresnel Ocean with Solitary Tidal Mountain Wall */}
      <mesh geometry={oceanGeo} position={[0, 0, 0]}>
        <shaderMaterial
          ref={oceanMatRef}
          vertexShader={megawaveVert}
          fragmentShader={megawaveFrag}
          uniforms={oceanUniforms}
          transparent={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Soft Continuous Spindrift Sea-Mist Veil Along the 1,200m Megawave Face */}
      <points ref={sprayPointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[sprayPositions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          map={softParticleMap}
          size={26.0}
          color="#e2e8f0"
          transparent
          opacity={0.095}
          depthWrite={false}
        />
      </points>

      {/* 4. Full Unclipped UV-Mapped Endurance "Ranger" Wedge Shuttlecraft + Gaussian Foamy Wake */}
      <group ref={rangerRef} position={[-1.1, 1.5, 2.2]} rotation={[0, 0.48, 0]} scale={0.84}>
        {/* Soft Feathered Gaussian Hydroplane Waterline Wake (map uses RGBA alpha, zero hard oval edge!) */}
        <mesh position={[0, -0.06, 0.45]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.2, 1.75, 1]}>
          <planeGeometry args={[5.4, 5.4]} />
          <meshBasicMaterial
            map={softParticleMap}
            color="#e2e8f0"
            transparent
            opacity={0.38}
            depthWrite={false}
          />
        </mesh>

        {/* Primary Ceramic-White Lifting-Body Hull with Panel Seams & Bump Relief */}
        <mesh geometry={rangerHullGeo}>
          <meshStandardMaterial
            map={hullMap}
            bumpMap={aeroBumpMap}
            bumpScale={0.025}
            color="#f8fafc"
            metalness={0.38}
            roughness={0.3}
          />
        </mesh>

        {/* Matte Black Carbon-Silicon Thermal Chine & Nose Leading Edge */}
        <mesh geometry={rangerHullGeo} position={[0, -0.05, -0.04]} scale={[1.028, 0.44, 1.018]}>
          <meshStandardMaterial
            color="#0b101b"
            bumpMap={aeroBumpMap}
            bumpScale={0.035}
            metalness={0.78}
            roughness={0.36}
          />
        </mesh>

        {/* Dorsal Black Thermal Spine & Twin Angled Vertical Stabilizers */}
        <mesh position={[0, 0.72, 0.55]} rotation={[-0.08, 0, 0]}>
          <boxGeometry args={[0.58, 0.12, 3.2]} />
          <meshStandardMaterial color="#111827" metalness={0.8} roughness={0.32} />
        </mesh>
        {[-1.48, 1.48].map((vx) => (
          <mesh
            key={`ranger-fin-${vx}`}
            position={[vx, 0.48, 2.05]}
            rotation={[0, 0, vx > 0 ? -0.42 : 0.42]}
          >
            <boxGeometry args={[0.08, 0.65, 1.25]} />
            <meshStandardMaterial
              map={hullMap}
              color="#e2e8f0"
              metalness={0.5}
              roughness={0.28}
            />
          </mesh>
        ))}

        {/* Forward Recessed Multi-Pane Armored Cockpit Windows */}
        <group position={[0, 0.68, -0.95]} rotation={[-1.34, 0, 0]}>
          {[-0.34, 0, 0.34].map((wx, wi) => (
            <mesh
              key={`canopy-pane-${wi}`}
              position={[wx, 0, Math.abs(wx) * -0.08]}
              rotation={[0, wx * -0.25, 0]}
            >
              <planeGeometry args={[0.3, 0.74]} />
              <meshPhysicalMaterial
                color="#040812"
                metalness={0.94}
                roughness={0.04}
                clearcoat={1.0}
                reflectivity={0.96}
              />
            </mesh>
          ))}
        </group>

        {/* Recessed Aft Linear-Aerospike Shrouds + Soft Tapered Plasma Exhaust Cones (+Z) */}
        <mesh position={[0, 0.3, 2.92]}>
          <boxGeometry args={[2.25, 0.32, 0.18]} />
          <meshStandardMaterial color="#090d16" metalness={0.92} roughness={0.24} />
        </mesh>
        {[-0.64, 0.64].map((tx, ti) => (
          <group key={`aerospike-vent-${ti}`} position={[tx, 0.3, 3.0]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.16, 0.22, 0.16, 16, 1, true]} />
              <meshStandardMaterial
                color="#1e293b"
                metalness={0.9}
                roughness={0.22}
                side={THREE.DoubleSide}
              />
            </mesh>
            <mesh position={[0, 0, 0.22]} rotation={[Math.PI / 2, 0, 0]} scale={[1.8, 1, 0.7]}>
              <coneGeometry args={[0.14, 0.48, 16, 1, true]} />
              <meshBasicMaterial
                color="#7dd3fc"
                transparent
                opacity={0.58}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
              />
            </mesh>
          </group>
        ))}
      </group>

      {/* Cinema Gargantua Accretion Key Light + Cool Ocean Rim Fill */}
      <directionalLight position={[12, 95, -240]} intensity={2.75} color="#ffc278" />
      <directionalLight position={[-60, 45, 80]} intensity={0.55} color="#7dd3fc" />
      <ambientLight intensity={0.38} color="#16324a" />
    </group>
  );
};

export const MillersHUD: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 pointer-events-none z-40 flex flex-col justify-between p-4 md:p-6 select-none font-mono">
      {/* Top Header */}
      <div className="flex items-center justify-between w-full">
        <div className="pointer-events-auto flex items-center space-x-3 bg-black/80 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-sky-500/30 shadow-2xl">
          <Waves className="w-4 h-4 text-sky-400 animate-bounce" />
          <div>
            <div className="text-[10px] text-sky-400 font-bold uppercase tracking-wider">
              {t('millers.sub')}
            </div>
            <div className="text-sm font-bold text-white tracking-widest">
              {t('millers.title')}
            </div>
          </div>
        </div>

        {/* Exit Button */}
        <button
          onClick={onExit}
          className="pointer-events-auto flex items-center space-x-2 px-4 py-2 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-medium border border-white/20 transition-all cursor-pointer backdrop-blur-md"
        >
          <ArrowLeftCircle className="w-4 h-4 text-sky-400" />
          <span className="text-xs">{t('millers.exitHyperspace')}</span>
        </button>
      </div>

      {/* Bottom Time Dilation Alert */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
        <div className="pointer-events-auto flex items-center space-x-3 bg-red-950/80 backdrop-blur-md px-4 py-3 rounded-2xl border border-red-500/40 shadow-2xl animate-pulse">
          <Clock className="w-5 h-5 text-red-400 shrink-0" />
          <div>
            <div className="text-xs font-bold text-red-300">
              {t('millers.timeDilation')}
            </div>
          </div>
        </div>

        <div className="pointer-events-auto flex items-center space-x-2 bg-amber-950/70 backdrop-blur-md px-3 py-2 rounded-xl border border-amber-500/30 text-[11px] text-amber-300">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{t('millers.megawaveWarning')}</span>
        </div>
      </div>
    </div>
  );
};
