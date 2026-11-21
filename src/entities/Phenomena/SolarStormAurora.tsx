import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CELESTIAL_BODIES } from '@/data/celestialData';
import { useAppStore } from '@/stores/useAppStore';
import { AssetManager } from '@/engine/assets/AssetManager';
import auroraVert from '@/shaders/cosmic/auroraCurtain.vert.glsl';
import auroraFrag from '@/shaders/cosmic/auroraCurtain.frag.glsl';

export interface SolarStormAuroraProps {
  earthPosRef: React.RefObject<THREE.Vector3>;
}

const BOW_SHOCK_VERT = /* glsl */ `
  varying vec3 vNormalDir;
  varying vec3 vViewDir;
  varying vec3 vLocalPos;
  void main() {
    vLocalPos = position;
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    vNormalDir = normalize(normalMatrix * normal);
    vViewDir = normalize(-mvPos.xyz);
    gl_Position = projectionMatrix * mvPos;
  }
`;

// Open sunward-only paraboloid bow-shock front (zero murky full-sphere bubble wall!)
const BOW_SHOCK_FRAG = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform float uIntensity;
  varying vec3 vNormalDir;
  varying vec3 vViewDir;
  varying vec3 vLocalPos;

  void main() {
    vec3 n = normalize(vNormalDir);
    vec3 v = normalize(vViewDir);
    float ndotv = clamp(abs(dot(n, v)), 0.0, 1.0);
    float fresnel = pow(clamp(1.0 - ndotv, 0.0, 1.0), 3.0);

    // Strictly confined to sunward (+Z) compression arc facing the Sun
    float sunCos = normalize(vLocalPos).z;
    float sunwardArc = smoothstep(0.14, 0.88, sunCos);
    float shockCrest = exp(-pow(clamp(abs(sunCos - 0.72) / 0.36, 0.0, 3.0), 2.0));
    float pulse = 0.84 + 0.16 * sin(uTime * 3.4 - vLocalPos.z * 2.4);

    vec3 shieldCyan = vec3(0.14, 0.78, 1.0);
    vec3 impactAmber = vec3(1.0, 0.56, 0.18);
    vec3 col = mix(shieldCyan, impactAmber, clamp(shockCrest * uIntensity * 0.6, 0.0, 0.72));
    float alpha = fresnel * sunwardArc * pulse * (0.24 + 0.38 * uIntensity);
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(col * 1.15, clamp(alpha, 0.0, 0.72));
  }
`;

function buildMagnetosphereGeometry(earthRadius: number): THREE.BufferGeometry {
  const fieldLines = 22;
  const segmentsPerLine = 44;
  const positions: number[] = [];
  const colors: number[] = [];

  const innerCol = new THREE.Color('#38bdf8');
  const outerCol = new THREE.Color('#6366f1');
  const tailCol = new THREE.Color('#a855f7');
  const tmpCol = new THREE.Color();

  for (let l = 0; l < fieldLines; l++) {
    const phi = (l / fieldLines) * Math.PI * 2;
    const isOuter = l % 2 === 1;
    const shellL = isOuter ? earthRadius * 3.35 : earthRadius * 2.3;

    for (let s = 0; s < segmentsPerLine; s++) {
      const t0 = -Math.PI * 0.41 + (s / segmentsPerLine) * (Math.PI * 0.82);
      const t1 = -Math.PI * 0.41 + ((s + 1) / segmentsPerLine) * (Math.PI * 0.82);

      const samplePoint = (lat: number): [number, number, number] => {
        const cosLat = Math.cos(lat);
        const r = shellL * cosLat * cosLat;
        let x = r * cosLat * Math.sin(phi);
        const y = r * Math.sin(lat);
        let z = r * cosLat * Math.cos(phi);

        if (z > 0) {
          z *= 0.72;
        } else {
          z *= 1.6;
          x *= 1.06;
        }
        return [x, y, z];
      };

      const [x0, y0, z0] = samplePoint(t0);
      const [x1, y1, z1] = samplePoint(t1);
      positions.push(x0, y0, z0, x1, y1, z1);

      const tailMix = z0 < 0 ? Math.min(1, -z0 / (earthRadius * 4.5)) : 0;
      tmpCol.copy(isOuter ? outerCol : innerCol).lerp(tailCol, tailMix);
      colors.push(tmpCol.r, tmpCol.g, tmpCol.b, tmpCol.r, tmpCol.g, tmpCol.b);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  return geo;
}

/**
 * Builds concentric sinuous polar aurora ribbons hugging Earth's upper thermosphere
 * (~100-450 km scaled gracefully at 0.25x radius — zero stiff neon mohawk hats!).
 */
function buildAuroraRibbonGeometry(
  earthRadius: number,
  sign: 1 | -1,
  ringScale: number
): THREE.BufferGeometry {
  const radialSegs = 96;
  const heightSegs = 12;
  const baseRadius = earthRadius * 0.48 * ringScale;
  const topRadius = earthRadius * 0.57 * ringScale;
  const baseY = sign * earthRadius * 0.87;
  const height = sign * earthRadius * 0.26;

  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let iy = 0; iy <= heightSegs; iy++) {
    const v = iy / heightSegs;
    const rad = baseRadius + (topRadius - baseRadius) * v;
    const y = baseY + height * v;
    for (let ix = 0; ix <= radialSegs; ix++) {
      const u = ix / radialSegs;
      const theta = u * Math.PI * 2;
      const organicWave = 1.0 + 0.08 * Math.sin(theta * 4.0 + ringScale * 3.0) + 0.04 * Math.cos(theta * 9.0);
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);
      positions.push(rad * organicWave * cosT, y, rad * organicWave * sinT);
      normals.push(cosT, 0, sinT);
      uvs.push(u, v);
    }
  }

  const rowStride = radialSegs + 1;
  for (let iy = 0; iy < heightSegs; iy++) {
    for (let ix = 0; ix < radialSegs; ix++) {
      const a = iy * rowStride + ix;
      const b = a + 1;
      const c = a + rowStride;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  return geo;
}

const CME_STREAK_COUNT = 340;
const CME_SPARK_COUNT = 420;

export const SolarStormAurora: React.FC<SolarStormAuroraProps> = ({ earthPosRef }) => {
  const earthGroupRef = useRef<THREE.Group>(null);
  const cmeStreaksRef = useRef<THREE.LineSegments>(null);
  const cmeSparksRef = useRef<THREE.Points>(null);

  const earthRadius = CELESTIAL_BODIES.earth.visualRadius;
  const softParticleMap = useMemo(() => AssetManager.getInstance().getSoftParticleMap(), []);

  // Deterministic pre-seeded supersonic solar-wind filament streaks + fine micro-sparks
  const cmeSeeds = useMemo(() => {
    const streakP = new Float32Array(CME_STREAK_COUNT);
    const streakX = new Float32Array(CME_STREAK_COUNT);
    const streakY = new Float32Array(CME_STREAK_COUNT);
    const streakSpd = new Float32Array(CME_STREAK_COUNT);

    for (let i = 0; i < CME_STREAK_COUNT; i++) {
      const h1 = Math.abs((Math.sin(i * 12.9898) * 43758.5453) % 1);
      const h2 = Math.abs((Math.sin(i * 78.233 + 1.3) * 24634.6345) % 1);
      const h3 = Math.abs((Math.sin(i * 41.123 + 4.7) * 19283.1234) % 1);
      const angle = h2 * Math.PI * 2;
      const radial = Math.pow(h3, 0.72) * 8.2;
      streakP[i] = h1;
      streakX[i] = Math.cos(angle) * radial;
      streakY[i] = Math.sin(angle) * radial;
      streakSpd[i] = 0.24 + h1 * 0.28;
    }

    const sparkP = new Float32Array(CME_SPARK_COUNT);
    const sparkX = new Float32Array(CME_SPARK_COUNT);
    const sparkY = new Float32Array(CME_SPARK_COUNT);
    const sparkSpd = new Float32Array(CME_SPARK_COUNT);
    for (let i = 0; i < CME_SPARK_COUNT; i++) {
      const h1 = Math.abs((Math.sin(i * 19.31 + 2.1) * 43758.5453) % 1);
      const h2 = Math.abs((Math.sin(i * 63.17 + 0.9) * 24634.6345) % 1);
      const h3 = Math.abs((Math.sin(i * 91.73 + 3.4) * 19283.1234) % 1);
      const angle = h2 * Math.PI * 2;
      const radial = Math.pow(h3, 0.7) * 9.0;
      sparkP[i] = h1;
      sparkX[i] = Math.cos(angle) * radial;
      sparkY[i] = Math.sin(angle) * radial;
      sparkSpd[i] = 0.22 + h1 * 0.26;
    }

    return { streakP, streakX, streakY, streakSpd, sparkP, sparkX, sparkY, sparkSpd };
  }, []);

  const gpuResources = useMemo(() => {
    const northOuterGeo = buildAuroraRibbonGeometry(earthRadius, 1, 1.0);
    const northInnerGeo = buildAuroraRibbonGeometry(earthRadius, 1, 0.78);
    const southOuterGeo = buildAuroraRibbonGeometry(earthRadius, -1, 1.0);
    const southInnerGeo = buildAuroraRibbonGeometry(earthRadius, -1, 0.78);

    const auroraMat = new THREE.ShaderMaterial({
      vertexShader: auroraVert,
      fragmentShader: auroraFrag,
      uniforms: {
        uTime: { value: 0 },
        uIntensity: { value: 0.72 },
      },
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const magnetoGeo = buildMagnetosphereGeometry(earthRadius);
    const magnetoMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.42,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    // Open sunward-only paraboloid bow-shock shell (oriented along +Z toward Sun)
    const bowShockGeo = new THREE.SphereGeometry(
      earthRadius * 2.45,
      36,
      20,
      0,
      Math.PI * 2,
      0,
      Math.PI * 0.52
    );
    bowShockGeo.rotateX(Math.PI / 2);
    const bowShockMat = new THREE.ShaderMaterial({
      vertexShader: BOW_SHOCK_VERT,
      fragmentShader: BOW_SHOCK_FRAG,
      uniforms: {
        uTime: { value: 0 },
        uIntensity: { value: 0.72 },
      },
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    // Supersonic Solar-Wind Plasma Filament Streaks (LineSegments — zero giant bokeh circles!)
    const streakGeo = new THREE.BufferGeometry();
    streakGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(CME_STREAK_COUNT * 6), 3));
    const streakColors = new Float32Array(CME_STREAK_COUNT * 6);
    const goldHead = new THREE.Color('#fde047');
    const orangeTail = new THREE.Color('#f97316');
    const cyanIon = new THREE.Color('#38bdf8');
    const tmp = new THREE.Color();
    for (let i = 0; i < CME_STREAK_COUNT; i++) {
      const f = i / CME_STREAK_COUNT;
      tmp.copy(goldHead).lerp(cyanIon, f > 0.7 ? 0.65 : 0.15);
      streakColors[i * 6] = tmp.r;
      streakColors[i * 6 + 1] = tmp.g;
      streakColors[i * 6 + 2] = tmp.b;
      tmp.copy(orangeTail).multiplyScalar(0.35);
      streakColors[i * 6 + 3] = tmp.r;
      streakColors[i * 6 + 4] = tmp.g;
      streakColors[i * 6 + 5] = tmp.b;
    }
    streakGeo.setAttribute('color', new THREE.BufferAttribute(streakColors, 3));
    const streakMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.76,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    // Crisp micro-ion CME sparks (size 0.30 — delicate starlike sparks, NEVER giant yellow bokeh balls!)
    const sparkGeo = new THREE.BufferGeometry();
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(CME_SPARK_COUNT * 3), 3));
    const sparkColors = new Float32Array(CME_SPARK_COUNT * 3);
    for (let i = 0; i < CME_SPARK_COUNT; i++) {
      const f = i / CME_SPARK_COUNT;
      tmp.copy(goldHead).lerp(orangeTail, f * 0.6).lerp(cyanIon, f > 0.76 ? 0.6 : 0);
      sparkColors[i * 3] = tmp.r;
      sparkColors[i * 3 + 1] = tmp.g;
      sparkColors[i * 3 + 2] = tmp.b;
    }
    sparkGeo.setAttribute('color', new THREE.BufferAttribute(sparkColors, 3));
    const sparkMat = new THREE.PointsMaterial({
      map: softParticleMap,
      vertexColors: true,
      size: 0.32,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    return {
      northOuterGeo,
      northInnerGeo,
      southOuterGeo,
      southInnerGeo,
      auroraMat,
      magnetoGeo,
      magnetoMat,
      bowShockGeo,
      bowShockMat,
      streakGeo,
      streakMat,
      sparkGeo,
      sparkMat,
    };
  }, [earthRadius, softParticleMap]);

  useEffect(() => {
    return () => {
      gpuResources.northOuterGeo.dispose();
      gpuResources.northInnerGeo.dispose();
      gpuResources.southOuterGeo.dispose();
      gpuResources.southInnerGeo.dispose();
      gpuResources.auroraMat.dispose();
      gpuResources.magnetoGeo.dispose();
      gpuResources.magnetoMat.dispose();
      gpuResources.bowShockGeo.dispose();
      gpuResources.bowShockMat.dispose();
      gpuResources.streakGeo.dispose();
      gpuResources.streakMat.dispose();
      gpuResources.sparkGeo.dispose();
      gpuResources.sparkMat.dispose();
    };
  }, [gpuResources]);

  const dirScratch = useRef(new THREE.Vector3());
  const rightScratch = useRef(new THREE.Vector3());
  const upVec = useRef(new THREE.Vector3(0, 1, 0));
  const lastCmeNonceRef = useRef(-1);
  const cmePulseBoostRef = useRef(0);

  useFrame((state, delta) => {
    const store = useAppStore.getState();
    const dt = store.reducedMotion ? 0 : Math.min(Math.max(delta, 0.001), 0.05);
    const elapsed = store.reducedMotion ? 0 : state.clock.elapsedTime;

    if (store.solarStormCmeNonce !== lastCmeNonceRef.current) {
      lastCmeNonceRef.current = store.solarStormCmeNonce;
      cmePulseBoostRef.current = 1.0;
    }
    cmePulseBoostRef.current = Math.max(0, cmePulseBoostRef.current - dt * 0.45);
    const effectiveIntensity = Math.min(1.0, store.solarStormIntensity + cmePulseBoostRef.current * 0.35);

    gpuResources.auroraMat.uniforms.uTime.value = elapsed;
    gpuResources.auroraMat.uniforms.uIntensity.value = effectiveIntensity;
    gpuResources.bowShockMat.uniforms.uTime.value = elapsed;
    gpuResources.bowShockMat.uniforms.uIntensity.value = effectiveIntensity;
    gpuResources.magnetoMat.opacity = 0.24 + effectiveIntensity * 0.26;

    const earthPos = earthPosRef.current;
    if (earthGroupRef.current && earthPos) {
      earthGroupRef.current.position.copy(earthPos);
      earthGroupRef.current.lookAt(0, 0, 0);
    }

    if (earthPos) {
      const dist = earthPos.length();
      if (dist > 1) {
        dirScratch.current.copy(earthPos).divideScalar(dist);
        rightScratch.current.crossVectors(dirScratch.current, upVec.current).normalize();
        const speedMult = 0.72 + effectiveIntensity * 1.4;
        const sunSurfaceOffset = 10.5;
        const span = Math.max(10, dist - sunSurfaceOffset + 8.0);
        const minShieldR = earthRadius * 2.65;

        // 1. Update velocity-aligned CME plasma filament streaks (zero allocation!)
        if (cmeStreaksRef.current) {
          const sAttr = gpuResources.streakGeo.attributes.position as THREE.BufferAttribute;
          const sArr = sAttr.array as Float32Array;
          const streakLen = 1.8 + effectiveIntensity * 2.4;

          for (let i = 0; i < CME_STREAK_COUNT; i++) {
            let p = cmeSeeds.streakP[i] + cmeSeeds.streakSpd[i] * dt * speedMult;
            if (p > 1.0) p -= 1.0;
            cmeSeeds.streakP[i] = p;

            const alongHead = sunSurfaceOffset + p * span;
            const alongTail = Math.max(sunSurfaceOffset, alongHead - streakLen);
            const coneH = 0.22 + p * 0.88;
            let sx = cmeSeeds.streakX[i] * coneH;
            let sy = cmeSeeds.streakY[i] * coneH;

            if (alongHead - dist > -earthRadius * 3.1) {
              const rSq = sx * sx + sy * sy;
              if (rSq < minShieldR * minShieldR) {
                const push = minShieldR / (Math.sqrt(rSq) || 0.01);
                sx *= push;
                sy *= push;
              }
            }

            const base = i * 6;
            sArr[base] = dirScratch.current.x * alongHead + rightScratch.current.x * sx;
            sArr[base + 1] = dirScratch.current.y * alongHead + sy;
            sArr[base + 2] = dirScratch.current.z * alongHead + rightScratch.current.z * sx;
            sArr[base + 3] = dirScratch.current.x * alongTail + rightScratch.current.x * (sx * 0.94);
            sArr[base + 4] = dirScratch.current.y * alongTail + sy * 0.94;
            sArr[base + 5] = dirScratch.current.z * alongTail + rightScratch.current.z * (sx * 0.94);
          }
          sAttr.needsUpdate = true;
        }

        // 2. Update fine micro-spark ions
        if (cmeSparksRef.current) {
          const pAttr = gpuResources.sparkGeo.attributes.position as THREE.BufferAttribute;
          const pArr = pAttr.array as Float32Array;
          for (let i = 0; i < CME_SPARK_COUNT; i++) {
            let p = cmeSeeds.sparkP[i] + cmeSeeds.sparkSpd[i] * dt * speedMult;
            if (p > 1.0) p -= 1.0;
            cmeSeeds.sparkP[i] = p;

            const along = sunSurfaceOffset + p * span;
            const cone = 0.25 + p * 0.92;
            let sx = cmeSeeds.sparkX[i] * cone;
            let sy = cmeSeeds.sparkY[i] * cone;
            if (along - dist > -earthRadius * 3.1) {
              const rSq = sx * sx + sy * sy;
              if (rSq < minShieldR * minShieldR) {
                const push = minShieldR / (Math.sqrt(rSq) || 0.01);
                sx *= push;
                sy *= push;
              }
            }
            pArr[i * 3] = dirScratch.current.x * along + rightScratch.current.x * sx;
            pArr[i * 3 + 1] = dirScratch.current.y * along + sy;
            pArr[i * 3 + 2] = dirScratch.current.z * along + rightScratch.current.z * sx;
          }
          pAttr.needsUpdate = true;
        }
      }
    }
  });

  return (
    <group name="solar-storm-aurora-system">
      <lineSegments
        ref={cmeStreaksRef}
        geometry={gpuResources.streakGeo}
        material={gpuResources.streakMat}
        frustumCulled={false}
      />
      <points
        ref={cmeSparksRef}
        geometry={gpuResources.sparkGeo}
        material={gpuResources.sparkMat}
        frustumCulled={false}
      />

      {/* Earth-Locked Magnetosphere, Sunward Paraboloid Bow Shock & Twin Concentric Polar Auroras */}
      <group ref={earthGroupRef}>
        <lineSegments geometry={gpuResources.magnetoGeo} material={gpuResources.magnetoMat} />
        <mesh geometry={gpuResources.bowShockGeo} material={gpuResources.bowShockMat} />
        <mesh geometry={gpuResources.northOuterGeo} material={gpuResources.auroraMat} />
        <mesh geometry={gpuResources.northInnerGeo} material={gpuResources.auroraMat} />
        <mesh geometry={gpuResources.southOuterGeo} material={gpuResources.auroraMat} />
        <mesh geometry={gpuResources.southInnerGeo} material={gpuResources.auroraMat} />
      </group>
    </group>
  );
};
