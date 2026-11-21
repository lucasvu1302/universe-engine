import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  evaluateEventBurstMultiplier,
  getPlanetaryEvents,
  getPlanetaryLodThresholds,
  latLonToLocalNormal,
  type PlanetarySurfaceEvent,
} from '@/data/planetaryEventsData';
import { CELESTIAL_BODIES } from '@/data/celestialData';
import { SimulationClock } from '@/engine/simulation/SimulationClock';
import { PerformanceManager } from '@/engine/performance/PerformanceManager';
import { useAppStore } from '@/stores/useAppStore';

import vortexVert from '@/shaders/phenomena/planetaryVortex.vert.glsl';
import vortexFrag from '@/shaders/phenomena/planetaryVortex.frag.glsl';
import plumeVert from '@/shaders/phenomena/planetaryPlume.vert.glsl';
import plumeFrag from '@/shaders/phenomena/planetaryPlume.frag.glsl';
import auroraVert from '@/shaders/cosmic/auroraCurtain.vert.glsl';
import planetaryAuroraFrag from '@/shaders/phenomena/planetaryAurora.frag.glsl';

interface PlanetaryEventsLayerProps {
  bodyId: string;
  visualRadius: number;
  ringInnerRadius?: number;
  ringOuterRadius?: number;
}

const NOOP_RAYCAST: THREE.Object3D['raycast'] = () => {};
const UP_Y = new THREE.Vector3(0, 1, 0);
const AURORA_DESIGN_RADIUS = 3.0;

const RING_SPOKE_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const RING_SPOKE_FRAG = /* glsl */ `
precision highp float;
uniform vec3 uColor;
uniform float uOpacity;
uniform float uTime;
varying vec2 vUv;
void main() {
  if (uOpacity <= 0.002) discard;
  float dx = (vUv.x - 0.5) * 3.6;
  float across = exp(-(dx * dx));
  float radial = smoothstep(0.0, 0.24, vUv.y) * (1.0 - smoothstep(0.56, 1.0, vUv.y));
  float shimmer = 0.84 + 0.16 * sin(vUv.y * 12.0 - uTime * 0.7);
  float alpha = across * radial * shimmer * uOpacity;
  if (alpha < 0.004) discard;
  gl_FragColor = vec4(uColor, clamp(alpha, 0.0, 0.46));
}
`;

const SOLAR_LOOP_VERT = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormalDir;
varying vec3 vViewDir;
void main() {
  vUv = uv;
  vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
  vNormalDir = normalize(normalMatrix * normal);
  vViewDir = normalize(-mvPos.xyz);
  gl_Position = projectionMatrix * mvPos;
}
`;

const SOLAR_LOOP_FRAG = /* glsl */ `
precision highp float;
uniform float uTime;
uniform float uIntensity;
uniform float uOpacity;
uniform vec3 uPrimaryColor;
uniform vec3 uSecondaryColor;
varying vec2 vUv;
varying vec3 vNormalDir;
varying vec3 vViewDir;
void main() {
  if (uOpacity <= 0.002) discard;
  float footFade = smoothstep(0.0, 0.09, vUv.x) * (1.0 - smoothstep(0.91, 1.0, vUv.x));
  float coreDot = clamp(abs(dot(normalize(vNormalDir), normalize(vViewDir))), 0.0, 1.0);
  float core2 = coreDot * coreDot;
  float core3 = core2 * coreDot;
  float coreGlow = smoothstep(0.14, 0.90, coreDot);
  float flowA = 0.55 + 0.45 * sin(vUv.x * 18.0 - uTime * 3.4 + vUv.y * 6.2831853);
  float flowB = 0.55 + 0.45 * sin(vUv.x * 31.0 + uTime * 2.2);
  float plasma = 0.56 + 0.44 * (flowA * 0.65 + flowB * 0.35);

  vec3 fieryRim = vec3(1.0, 0.24, 0.03);
  vec3 warmAmber = mix(uSecondaryColor, vec3(1.0, 0.54, 0.12), 0.55);
  vec3 hotCore = mix(uPrimaryColor, vec3(1.0, 0.86, 0.50), 0.72);
  vec3 col = mix(fieryRim, warmAmber, clamp(coreGlow * 0.90 + plasma * 0.18, 0.0, 1.0));
  col = mix(col, hotCore, core3 * (0.62 + 0.28 * plasma));

  float alpha = footFade * (0.24 + 0.76 * coreGlow) * plasma * min(uIntensity, 1.50) * 0.48 * uOpacity;
  if (alpha < 0.006) discard;
  gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.78));
}
`;

function smoothstep(edge0: number, edge1: number, x: number): number {
  const denom = edge1 - edge0;
  if (Math.abs(denom) < 1e-6) return x >= edge1 ? 1 : 0;
  const t = Math.max(0, Math.min(1, (x - edge0) / denom));
  return t * t * (3 - 2 * t);
}

function hashSeed(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

/**
 * Builds a curved spherical dome patch hugging a sphere of `radius` around local +Y
 * so surface vortices, hexagons, dust veils, and fissures never clip or float flat.
 */
function buildSphericalCapGeometry(
  radius: number,
  angularRadiusRad: number,
  radialSegments = 10,
  angularSegments = 36
): THREE.BufferGeometry {
  const safeAngle = Math.max(0.08, Math.min(Math.PI * 0.44, angularRadiusRad));
  const vertexCount = (radialSegments + 1) * (angularSegments + 1);
  const positions = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);
  const indices: number[] = [];

  let ptr = 0;
  let uvPtr = 0;
  for (let rIdx = 0; rIdx <= radialSegments; rIdx++) {
    const frac = rIdx / radialSegments;
    const theta = frac * safeAngle;
    const sinT = Math.sin(theta);
    const cosT = Math.cos(theta);

    for (let aIdx = 0; aIdx <= angularSegments; aIdx++) {
      const phi = (aIdx / angularSegments) * Math.PI * 2;
      const cosP = Math.cos(phi);
      const sinP = Math.sin(phi);

      positions[ptr++] = radius * sinT * cosP;
      positions[ptr++] = radius * cosT;
      positions[ptr++] = radius * sinT * sinP;

      uvs[uvPtr++] = 0.5 + 0.5 * frac * cosP;
      uvs[uvPtr++] = 0.5 + 0.5 * frac * sinP;
    }
  }

  const stride = angularSegments + 1;
  for (let rIdx = 0; rIdx < radialSegments; rIdx++) {
    for (let aIdx = 0; aIdx < angularSegments; aIdx++) {
      const a = rIdx * stride + aIdx;
      const b = a + 1;
      const c = (rIdx + 1) * stride + aIdx;
      const d = c + 1;
      // Counter-clockwise winding viewed from outside sphere so computeVertexNormals() points strictly outward (+Y)
      indices.push(a, b, c, b, d, c);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds deterministic GPU-seeded particle geometry for ballistic plumes, cryo geysers,
 * anti-solar sodium tails, diamond rain shimmers, and solar coronal flare loops.
 */
function buildPlumeParticlesGeometry(
  count: number,
  salt: number,
  boundRadius: number
): THREE.BufferGeometry {
  const safeCount = Math.max(24, count);
  const positions = new Float32Array(safeCount * 3);
  const seeds = new Float32Array(safeCount * 4);

  for (let i = 0; i < safeCount; i++) {
    const base = salt * 1009 + i * 7.13;
    seeds[i * 4] = hashSeed(base + 1.1);
    seeds[i * 4 + 1] = hashSeed(base + 2.3);
    seeds[i * 4 + 2] = hashSeed(base + 3.7);
    seeds[i * 4 + 3] = 0.55 + hashSeed(base + 5.1) * 0.95;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, boundRadius * 0.4, 0), boundRadius * 1.4);
  return geo;
}

/**
 * Builds an undulating 3D auroral curtain cylinder ribbon matching auroraCurtain.vert.glsl.
 */
function buildAuroraOvalGeometry(
  ovalRadius: number,
  height: number,
  baseY: number,
  flareOut: number,
  segments = 72
): THREE.BufferGeometry {
  const positions = new Float32Array((segments + 1) * 2 * 3);
  const normals = new Float32Array((segments + 1) * 2 * 3);
  const uvs = new Float32Array((segments + 1) * 2 * 2);
  const indices: number[] = [];

  for (let i = 0; i <= segments; i++) {
    const u = i / segments;
    const angle = u * Math.PI * 2;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    const rBot = ovalRadius;
    const rTop = ovalRadius + flareOut;
    const botIdx = i * 2;
    const topIdx = botIdx + 1;

    positions[botIdx * 3] = cosA * rBot;
    positions[botIdx * 3 + 1] = baseY;
    positions[botIdx * 3 + 2] = sinA * rBot;

    positions[topIdx * 3] = cosA * rTop;
    positions[topIdx * 3 + 1] = baseY + height;
    positions[topIdx * 3 + 2] = sinA * rTop;

    normals[botIdx * 3] = cosA;
    normals[botIdx * 3 + 1] = 0.15;
    normals[botIdx * 3 + 2] = sinA;

    normals[topIdx * 3] = cosA;
    normals[topIdx * 3 + 1] = 0.15;
    normals[topIdx * 3 + 2] = sinA;

    uvs[botIdx * 2] = u;
    uvs[botIdx * 2 + 1] = 0;
    uvs[topIdx * 2] = u;
    uvs[topIdx * 2 + 1] = 1;

    if (i < segments) {
      const nextBot = (i + 1) * 2;
      const nextTop = nextBot + 1;
      indices.push(botIdx, nextBot, topIdx, topIdx, nextBot, nextTop);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  return geo;
}

/**
 * Builds deterministic multi-branch jagged 3D lightning forks hugging the upper cloud deck.
 */
function buildLightningBoltsGeometry(
  radius: number,
  angularSpread: number,
  salt: number
): THREE.BufferGeometry {
  const bolts = 11;
  const segmentsPerBolt = 5;
  const positions: number[] = [];

  for (let b = 0; b < bolts; b++) {
    let theta = (hashSeed(salt + b * 17.3) - 0.5) * angularSpread * 0.9;
    let phi = hashSeed(salt + b * 31.7) * Math.PI * 2;
    let r = radius * 1.004;

    for (let s = 0; s < segmentsPerBolt; s++) {
      const nextTheta = theta + (hashSeed(salt + b * 53 + s * 11) - 0.5) * angularSpread * 0.36;
      const nextPhi = phi + (hashSeed(salt + b * 71 + s * 13) - 0.5) * 0.55;
      const nextR = radius * (1.004 + (s + 1) * 0.0028);

      const x0 = r * Math.sin(Math.abs(theta)) * Math.cos(phi);
      const y0 = r * Math.cos(Math.abs(theta));
      const z0 = r * Math.sin(Math.abs(theta)) * Math.sin(phi);

      const x1 = nextR * Math.sin(Math.abs(nextTheta)) * Math.cos(nextPhi);
      const y1 = nextR * Math.cos(Math.abs(nextTheta));
      const z1 = nextR * Math.sin(Math.abs(nextTheta)) * Math.sin(nextPhi);

      positions.push(x0, y0, z0, x1, y1, z1);

      // Fork branch on mid-segments
      if (s === 2 || s === 3) {
        const fTheta = nextTheta + (hashSeed(salt + b * 97 + s * 29) - 0.5) * angularSpread * 0.28;
        const fPhi = nextPhi + 0.32;
        const fx = nextR * Math.sin(Math.abs(fTheta)) * Math.cos(fPhi);
        const fy = nextR * Math.cos(Math.abs(fTheta));
        const fz = nextR * Math.sin(Math.abs(fTheta)) * Math.sin(fPhi);
        positions.push(x1, y1, z1, fx, fy, fz);
      }

      theta = nextTheta;
      phi = nextPhi;
      r = nextR;
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  return geo;
}

/**
 * Builds radial electrostatic dust spoke wedges floating above Saturn's B-ring plus ionized ring-rain arcs.
 */
function buildRingSpokesGeometry(
  planetRadius: number,
  innerR: number,
  outerR: number
): { spokesGeo: THREE.BufferGeometry; rainGeo: THREE.BufferGeometry } {
  const spokeCount = 10;
  const spokePositions: number[] = [];
  const spokeUvs: number[] = [];
  const spokeIndices: number[] = [];
  const r0 = innerR * 1.04;
  const r1 = innerR + (outerR - innerR) * 0.74;
  const yLift = planetRadius * 0.024;

  for (let i = 0; i < spokeCount; i++) {
    const baseAngle = (i / spokeCount) * Math.PI * 2 + hashSeed(i * 19.1) * 0.28;
    const halfWidth = 0.055 + hashSeed(i * 23.7) * 0.05;
    const vStart = i * 4;
    const a0 = baseAngle - halfWidth * 0.7;
    const a1 = baseAngle + halfWidth * 0.7;
    const b0 = baseAngle - halfWidth * 1.45;
    const b1 = baseAngle + halfWidth * 1.45;

    spokePositions.push(
      Math.cos(a0) * r0, yLift, Math.sin(a0) * r0,
      Math.cos(a1) * r0, yLift, Math.sin(a1) * r0,
      Math.cos(b0) * r1, yLift, Math.sin(b0) * r1,
      Math.cos(b1) * r1, yLift, Math.sin(b1) * r1
    );
    spokeUvs.push(0, 0, 1, 0, 0, 1, 1, 1);
    spokeIndices.push(vStart, vStart + 2, vStart + 1, vStart + 1, vStart + 2, vStart + 3);
  }

  const spokesGeo = new THREE.BufferGeometry();
  spokesGeo.setAttribute('position', new THREE.Float32BufferAttribute(spokePositions, 3));
  spokesGeo.setAttribute('uv', new THREE.Float32BufferAttribute(spokeUvs, 2));
  spokesGeo.setIndex(spokeIndices);

  // Ionized water-ice ring-rain field-line arcs plunging from inner ring into Saturn's mid-latitudes
  const rainPositions: number[] = [];
  const arcCount = 12;
  const steps = 10;
  for (let a = 0; a < arcCount; a++) {
    const phi = (a / arcCount) * Math.PI * 2;
    const cosP = Math.cos(phi);
    const sinP = Math.sin(phi);
    const hemi = a % 2 === 0 ? 1 : -1;
    const startR = innerR * 1.05;
    const endLat = THREE.MathUtils.degToRad(36) * hemi;
    const endR = planetRadius * 1.02;

    for (let s = 0; s < steps; s++) {
      const t0 = s / steps;
      const t1 = (s + 1) / steps;

      const rad0 = THREE.MathUtils.lerp(startR, endR * Math.cos(endLat), t0);
      const y0 = Math.sin(t0 * Math.PI * 0.5) * endR * Math.sin(endLat) + Math.sin(t0 * Math.PI) * planetRadius * 0.35 * hemi;

      const rad1 = THREE.MathUtils.lerp(startR, endR * Math.cos(endLat), t1);
      const y1 = Math.sin(t1 * Math.PI * 0.5) * endR * Math.sin(endLat) + Math.sin(t1 * Math.PI) * planetRadius * 0.35 * hemi;

      rainPositions.push(cosP * rad0, y0, sinP * rad0, cosP * rad1, y1, sinP * rad1);
    }
  }

  const rainGeo = new THREE.BufferGeometry();
  rainGeo.setAttribute('position', new THREE.Float32BufferAttribute(rainPositions, 3));
  return { spokesGeo, rainGeo };
}

/**
 * Builds volumetric tapered 3D tubular coronal plasma flux-rope loops arching above the solar photosphere
 * (replaces 1px WebGL lineSegments with genuine volumetric plasma arches in one single BufferGeometry draw call).
 */
function buildSolarArcadeTubeGeometry(spread: number, height: number): THREE.BufferGeometry {
  const loopCount = 4;
  const tubularSegs = 28;
  const radialSegs = 8;
  const baseTubeR = Math.max(spread * 0.036, 0.18);

  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const ringStride = radialSegs + 1;
  let baseVertexOffset = 0;

  for (let l = 0; l < loopCount; l++) {
    const fracL = loopCount > 1 ? l / (loopCount - 1) - 0.5 : 0;
    const zOffset = fracL * spread * 0.62;
    const tiltZ = fracL * 0.34;
    const loopH = height * (0.76 + 0.32 * Math.sin(((l + 0.5) / loopCount) * Math.PI));
    const loopW = spread * (0.84 + 0.16 * (l % 2));
    const loopR = baseTubeR * (0.82 + 0.26 * (1 - Math.abs(fracL) * 1.4));

    for (let i = 0; i <= tubularSegs; i++) {
      const u = i / tubularSegs;
      const a = u * Math.PI;
      const sinA = Math.sin(a);
      const cosA = Math.cos(a);

      // Centerline position along arch (with subtle helical Z shear)
      const cx = -cosA * loopW;
      const cy = sinA * loopH;
      const cz = zOffset + sinA * spread * tiltZ;

      // Analytic tangent along the arch
      const tx = sinA * loopW;
      const ty = cosA * loopH;
      const tz = cosA * spread * tiltZ;
      const tLen = Math.hypot(tx, ty, tz) || 1;
      const tnx = tx / tLen;
      const tny = ty / tLen;
      const tnz = tz / tLen;

      // Construct orthonormal frame (N, B) around tangent using reference Z axis
      let bx = -tny;
      let by = tnx;
      let bz = 0;
      const bLen = Math.hypot(bx, by, bz);
      if (bLen > 1e-5) {
        bx /= bLen;
        by /= bLen;
      } else {
        bx = 1;
        by = 0;
        bz = 0;
      }
      // Second normal perpendicular to T and B: N = B x T
      const nx = by * tnz - bz * tny;
      const ny = bz * tnx - bx * tnz;
      const nz = bx * tny - by * tnx;

      // Taper radius smoothly: thicker luminous apex, pinched magnetic footpoints
      const radius = loopR * (0.48 + 0.72 * sinA);

      for (let j = 0; j <= radialSegs; j++) {
        const v = j / radialSegs;
        const phi = v * Math.PI * 2;
        const cosP = Math.cos(phi);
        const sinP = Math.sin(phi);

        const rnx = bx * cosP + nx * sinP;
        const rny = by * cosP + ny * sinP;
        const rnz = bz * cosP + nz * sinP;

        positions.push(cx + rnx * radius, cy + rny * radius, cz + rnz * radius);
        normals.push(rnx, rny, rnz);
        uvs.push(u, v);
      }
    }

    for (let i = 0; i < tubularSegs; i++) {
      for (let j = 0; j < radialSegs; j++) {
        const aIdx = baseVertexOffset + i * ringStride + j;
        const bIdx = aIdx + ringStride;
        const cIdx = bIdx + 1;
        const dIdx = aIdx + 1;
        indices.push(aIdx, bIdx, dIdx, bIdx, cIdx, dIdx);
      }
    }

    baseVertexOffset += (tubularSegs + 1) * ringStride;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  return geo;
}

interface EventNodeRefs {
  event: PlanetarySurfaceEvent;
  spinWrapper: THREE.Group | null;
  vortexUniforms?: {
    uTime: { value: number };
    uIntensity: { value: number };
    uOpacity: { value: number };
    uPattern: { value: number };
    uHasEye: { value: number };
    uPrimaryColor: { value: THREE.Color };
    uSecondaryColor: { value: THREE.Color };
  };
  plumeUniforms?: {
    uTime: { value: number };
    uHeight: { value: number };
    uSpread: { value: number };
    uGravity: { value: number };
    uIntensity: { value: number };
    uOpacity: { value: number };
    uMode: { value: number };
    uPointScale: { value: number };
    uVisualRadius: { value: number };
    uPrimaryColor: { value: THREE.Color };
    uSecondaryColor: { value: THREE.Color };
  };
  auroraUniforms?: {
    uTime: { value: number };
    uIntensity: { value: number };
    uOpacity: { value: number };
    uPrimaryColor: { value: THREE.Color };
    uSecondaryColor: { value: THREE.Color };
  };
  lightningMat?: THREE.LineBasicMaterial;
  spokeUniforms?: {
    uColor: { value: THREE.Color };
    uOpacity: { value: number };
    uTime: { value: number };
  };
  rainMat?: THREE.LineBasicMaterial;
  arcadeUniforms?: {
    uTime: { value: number };
    uIntensity: { value: number };
    uOpacity: { value: number };
    uPrimaryColor: { value: THREE.Color };
    uSecondaryColor: { value: THREE.Color };
  };
  auroraGroup?: THREE.Group | null;
  spokesGroup?: THREE.Group | null;
}

function patternCodeFor(archetype: PlanetarySurfaceEvent['archetype']): number {
  switch (archetype) {
    case 'cyclone_vortex':
      return 0.0;
    case 'polar_hexagon':
      return 1.0;
    case 'dust_storm':
    case 'ice_cloud_veil':
      return 2.0;
    case 'thermal_fissure':
    case 'volcanic_plume':
    case 'cryo_geyser':
      return 3.0;
    case 'impact_flash':
    case 'lightning_storm':
    default:
      return 4.0;
  }
}

export const PlanetaryEventsLayer: React.FC<PlanetaryEventsLayerProps> = ({
  bodyId,
  visualRadius,
  ringInnerRadius,
  ringOuterRadius,
}) => {
  const rootRef = useRef<THREE.Group>(null);
  const antiSolarRef = useRef<THREE.Group>(null);

  const quality = useAppStore((state) => state.graphicsQuality);
  const detectedGPUTier = useAppStore((state) => state.detectedGPUTier);

  const particleScale = useMemo(
    () => PerformanceManager.getInstance().getQualityProfile(quality, detectedGPUTier).planetaryEventParticleScale,
    [quality, detectedGPUTier]
  );

  const events = useMemo(() => getPlanetaryEvents(bodyId), [bodyId]);
  const bodyData = CELESTIAL_BODIES[bodyId];

  // Scratch vectors reused across frames (zero per-frame allocations)
  const scratchWorldPos = useMemo(() => new THREE.Vector3(), []);
  const scratchAntiDir = useMemo(() => new THREE.Vector3(), []);
  const scratchInvTiltQuat = useMemo(() => new THREE.Quaternion(), []);
  const scratchXAxis = useMemo(() => new THREE.Vector3(1, 0, 0), []);
  const scratchTargetQuat = useMemo(() => new THREE.Quaternion(), []);
  const accumTimeRef = useRef(0);

  // Build deterministic, self-contained GPU geometries & shader materials for this body's events
  const built = useMemo(() => {
    const geometriesToDispose: THREE.BufferGeometry[] = [];
    const materialsToDispose: THREE.Material[] = [];

    const nodes = events.map((ev, idx) => {
      const salt = idx * 37.3 + ev.latDeg * 1.7 + ev.lonDeg * 0.9;
      const normal = latLonToLocalNormal(ev.latDeg, ev.lonDeg, new THREE.Vector3());
      const orientQuat = new THREE.Quaternion().setFromUnitVectors(UP_Y, normal);
      const anchorPos = normal.clone().multiplyScalar(visualRadius * ev.radiusFactor);
      const primaryColor = new THREE.Color(ev.primaryColor);
      const secondaryColor = new THREE.Color(ev.secondaryColor);

      const needsCap =
        ev.archetype === 'cyclone_vortex' ||
        ev.archetype === 'polar_hexagon' ||
        ev.archetype === 'dust_storm' ||
        ev.archetype === 'ice_cloud_veil' ||
        ev.archetype === 'thermal_fissure' ||
        ev.archetype === 'impact_flash' ||
        ev.archetype === 'lightning_storm' ||
        ev.archetype === 'volcanic_plume' ||
        ev.archetype === 'cryo_geyser';

      let capGeo: THREE.BufferGeometry | null = null;
      let vortexMat: THREE.ShaderMaterial | null = null;
      let vortexUniforms: EventNodeRefs['vortexUniforms'];

      if (needsCap) {
        const capAngularRadius =
          ev.archetype === 'volcanic_plume' || ev.archetype === 'cryo_geyser'
            ? Math.min(0.095, ev.scaleFactor * 0.14)
            : Math.min(0.75, Math.max(0.18, ev.scaleFactor * 0.62));
        const capR = visualRadius * (ev.archetype === 'polar_hexagon' ? 1.015 : ev.radiusFactor);
        capGeo = buildSphericalCapGeometry(capR, capAngularRadius, 10, 36);
        geometriesToDispose.push(capGeo);

        const isSolidAnticyclone =
          ev.id === 'jupiter_great_red_spot' || ev.id === 'neptune_supersonic_storm';

        vortexUniforms = {
          uTime: { value: idx * 3.7 },
          uIntensity: { value: 1.0 },
          uOpacity: { value: 1.0 },
          uPattern: { value: patternCodeFor(ev.archetype) },
          uHasEye: { value: isSolidAnticyclone ? 0.0 : 1.0 },
          uPrimaryColor: { value: primaryColor.clone() },
          uSecondaryColor: { value: secondaryColor.clone() },
        };

        const isNormalBlend =
          ev.archetype === 'cyclone_vortex' ||
          ev.archetype === 'dust_storm' ||
          ev.archetype === 'polar_hexagon';

        vortexMat = new THREE.ShaderMaterial({
          vertexShader: vortexVert,
          fragmentShader: vortexFrag,
          uniforms: vortexUniforms,
          transparent: true,
          depthWrite: false,
          side: THREE.DoubleSide,
          blending: isNormalBlend ? THREE.NormalBlending : THREE.AdditiveBlending,
        });
        materialsToDispose.push(vortexMat);
      }

      const needsPlume =
        ev.archetype === 'volcanic_plume' ||
        ev.archetype === 'cryo_geyser' ||
        ev.archetype === 'plasma_tail' ||
        ev.archetype === 'diamond_shimmer' ||
        ev.archetype === 'solar_flare_loop';

      let plumeGeo: THREE.BufferGeometry | null = null;
      let plumeMat: THREE.ShaderMaterial | null = null;
      let plumeUniforms: EventNodeRefs['plumeUniforms'];

      if (needsPlume) {
        const baseCount =
          ev.archetype === 'plasma_tail'
            ? 280
            : ev.archetype === 'solar_flare_loop'
            ? 300
            : ev.archetype === 'diamond_shimmer'
            ? 160
            : ev.bodyId === 'earth'
            ? 96
            : 360;
        const scaledCount = Math.max(24, Math.round(baseCount * particleScale));
        const height =
          ev.archetype === 'plasma_tail'
            ? visualRadius * ev.scaleFactor * 1.45
            : ev.archetype === 'solar_flare_loop'
            ? visualRadius * ev.scaleFactor * 0.9
            : ev.archetype === 'diamond_shimmer'
            ? visualRadius * 0.12
            : ev.bodyId === 'earth'
            ? visualRadius * ev.scaleFactor * 0.30
            : visualRadius * ev.scaleFactor * 0.68;
        const spread =
          ev.archetype === 'plasma_tail'
            ? visualRadius * 0.78
            : ev.archetype === 'solar_flare_loop'
            ? visualRadius * ev.scaleFactor * 0.85
            : ev.archetype === 'diamond_shimmer'
            ? visualRadius * ev.scaleFactor * 0.52
            : ev.bodyId === 'earth'
            ? visualRadius * ev.scaleFactor * 0.24
            : visualRadius * ev.scaleFactor * 0.52;
        const mode =
          ev.archetype === 'plasma_tail'
            ? 1.0
            : ev.archetype === 'diamond_shimmer'
            ? 2.0
            : ev.archetype === 'solar_flare_loop'
            ? 3.0
            : 0.0;
        const gravity = ev.archetype === 'cryo_geyser' ? 0.42 : 1.08;

        plumeGeo = buildPlumeParticlesGeometry(scaledCount, salt, Math.max(height, spread));
        geometriesToDispose.push(plumeGeo);

        plumeUniforms = {
          uTime: { value: idx * 2.1 },
          uHeight: { value: height },
          uSpread: { value: spread },
          uGravity: { value: gravity },
          uIntensity: { value: 1.0 },
          uOpacity: { value: 1.0 },
          uMode: { value: mode },
          uPointScale: {
            value:
              ev.archetype === 'diamond_shimmer'
                ? 2.0
                : ev.archetype === 'solar_flare_loop'
                ? 2.5
                : 2.2,
          },
          uVisualRadius: { value: visualRadius },
          uPrimaryColor: { value: primaryColor.clone() },
          uSecondaryColor: { value: secondaryColor.clone() },
        };

        plumeMat = new THREE.ShaderMaterial({
          vertexShader: plumeVert,
          fragmentShader: plumeFrag,
          uniforms: plumeUniforms,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
        materialsToDispose.push(plumeMat);
      }

      let auroraNorthGeo: THREE.BufferGeometry | null = null;
      let auroraSouthGeo: THREE.BufferGeometry | null = null;
      let auroraMat: THREE.ShaderMaterial | null = null;
      let auroraUniforms: EventNodeRefs['auroraUniforms'];
      let auroraQuat: THREE.Quaternion | null = null;

      let isPolarDualAurora = false;
      if (ev.archetype === 'polar_aurora') {
        isPolarDualAurora = Math.abs(ev.latDeg) >= 65 || ev.bodyId === 'ganymede';
        // Build in normalized AURORA_DESIGN_RADIUS (3.0) so auroraCurtain.vert.glsl ripple scales cleanly across all 16 bodies
        const ovalR = AURORA_DESIGN_RADIUS * (isPolarDualAurora ? 0.41 : 0.26);
        const ribbonH = AURORA_DESIGN_RADIUS * (isPolarDualAurora ? 0.14 : 0.068);
        const baseY = AURORA_DESIGN_RADIUS * (isPolarDualAurora ? 0.916 : 0.968);
        const flareOut = AURORA_DESIGN_RADIUS * (isPolarDualAurora ? 0.042 : 0.012);

        auroraNorthGeo = buildAuroraOvalGeometry(ovalR, ribbonH, baseY, flareOut, 64);
        geometriesToDispose.push(auroraNorthGeo);

        if (isPolarDualAurora) {
          auroraSouthGeo = buildAuroraOvalGeometry(ovalR, -ribbonH, -baseY, flareOut, 64);
          geometriesToDispose.push(auroraSouthGeo);
        } else {
          auroraQuat = orientQuat.clone();
        }

        auroraUniforms = {
          uTime: { value: idx * 1.9 },
          uIntensity: { value: 0.5 },
          uOpacity: { value: 1.0 },
          uPrimaryColor: { value: primaryColor.clone() },
          uSecondaryColor: { value: secondaryColor.clone() },
        };

        auroraMat = new THREE.ShaderMaterial({
          vertexShader: auroraVert,
          fragmentShader: planetaryAuroraFrag,
          uniforms: auroraUniforms,
          transparent: true,
          depthWrite: false,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
        });
        materialsToDispose.push(auroraMat);
      }

      let lightningGeo: THREE.BufferGeometry | null = null;
      let lightningMat: THREE.LineBasicMaterial | null = null;
      if (ev.archetype === 'lightning_storm') {
        lightningGeo = buildLightningBoltsGeometry(
          visualRadius * ev.radiusFactor,
          Math.min(0.42, ev.scaleFactor * 0.48),
          salt
        );
        geometriesToDispose.push(lightningGeo);

        lightningMat = new THREE.LineBasicMaterial({
          color: primaryColor,
          transparent: true,
          opacity: 0.75,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
        materialsToDispose.push(lightningMat);
      }

      let spokesGeo: THREE.BufferGeometry | null = null;
      let rainGeo: THREE.BufferGeometry | null = null;
      let spokeMat: THREE.ShaderMaterial | null = null;
      let spokeUniforms: EventNodeRefs['spokeUniforms'];
      let rainMat: THREE.LineBasicMaterial | null = null;
      if (ev.archetype === 'ring_spokes' && ringInnerRadius && ringOuterRadius) {
        const builtRing = buildRingSpokesGeometry(visualRadius, ringInnerRadius, ringOuterRadius);
        spokesGeo = builtRing.spokesGeo;
        rainGeo = builtRing.rainGeo;
        geometriesToDispose.push(spokesGeo, rainGeo);

        spokeUniforms = {
          uColor: { value: primaryColor.clone() },
          uOpacity: { value: 0.2 },
          uTime: { value: idx * 1.3 },
        };
        spokeMat = new THREE.ShaderMaterial({
          vertexShader: RING_SPOKE_VERT,
          fragmentShader: RING_SPOKE_FRAG,
          uniforms: spokeUniforms,
          transparent: true,
          depthWrite: false,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
        });
        rainMat = new THREE.LineBasicMaterial({
          color: secondaryColor,
          transparent: true,
          opacity: 0.22,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
        materialsToDispose.push(spokeMat, rainMat);
      }

      let arcadeGeo: THREE.BufferGeometry | null = null;
      let arcadeMat: THREE.ShaderMaterial | null = null;
      let arcadeUniforms: EventNodeRefs['arcadeUniforms'];
      if (ev.archetype === 'solar_flare_loop') {
        arcadeGeo = buildSolarArcadeTubeGeometry(
          visualRadius * ev.scaleFactor * 0.84,
          visualRadius * ev.scaleFactor * 0.94
        );
        geometriesToDispose.push(arcadeGeo);

        arcadeUniforms = {
          uTime: { value: idx * 1.7 },
          uIntensity: { value: 1.0 },
          uOpacity: { value: 1.0 },
          uPrimaryColor: { value: primaryColor.clone() },
          uSecondaryColor: { value: secondaryColor.clone() },
        };
        arcadeMat = new THREE.ShaderMaterial({
          vertexShader: SOLAR_LOOP_VERT,
          fragmentShader: SOLAR_LOOP_FRAG,
          uniforms: arcadeUniforms,
          transparent: true,
          depthWrite: false,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
        });
        materialsToDispose.push(arcadeMat);
      }

      return {
        ev,
        normal,
        orientQuat,
        anchorPos,
        capGeo,
        vortexMat,
        vortexUniforms,
        plumeGeo,
        plumeMat,
        plumeUniforms,
        auroraNorthGeo,
        auroraSouthGeo,
        auroraMat,
        auroraUniforms,
        auroraQuat,
        isPolarDualAurora,
        lightningGeo,
        lightningMat,
        spokesGeo,
        rainGeo,
        spokeMat,
        spokeUniforms,
        rainMat,
        arcadeGeo,
        arcadeMat,
        arcadeUniforms,
      };
    });

    return { nodes, geometriesToDispose, materialsToDispose };
  }, [events, visualRadius, particleScale, ringInnerRadius, ringOuterRadius]);

  // Deterministic GPU cleanup on unmount or quality-tier rebuild
  useEffect(() => {
    const { geometriesToDispose, materialsToDispose } = built;
    return () => {
      for (const g of geometriesToDispose) {
        g.dispose();
      }
      for (const m of materialsToDispose) {
        m.dispose();
      }
    };
  }, [built]);

  const nodeRefs = useRef<EventNodeRefs[]>([]);

  useFrame((state, delta) => {
    const root = rootRef.current;
    if (!root || events.length === 0) return;

    const store = useAppStore.getState();
    if (!store.planetaryEventsEnabled) {
      root.visible = false;
      return;
    }

    root.getWorldPosition(scratchWorldPos);
    const camDist = state.camera.position.distanceTo(scratchWorldPos);
    const { fadeStart, cullDist } = getPlanetaryLodThresholds(
      bodyId,
      visualRadius,
      store.targetId === bodyId
    );

    if (camDist > cullDist) {
      root.visible = false;
      return;
    }

    root.visible = true;
    const lodAlpha = camDist <= fadeStart ? 1.0 : 1.0 - smoothstep(fadeStart, cullDist, camDist);

    const safeDt = Number.isFinite(delta) && delta > 0 ? Math.min(delta, 0.05) : 0.016;
    const timeMult = store.reducedMotion ? 0.15 : 1.0;
    accumTimeRef.current += safeDt * timeMult;
    const t = accumTimeRef.current;
    const simTime = SimulationClock.getInstance().simulationTime;
    const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const baseRotSpeed = bodyData?.rotationSpeed ?? 0.2;

    // Orient anti-solar events (e.g. Mercury sodium tail) strictly away from the Sun at (0,0,0)
    if (antiSolarRef.current && scratchWorldPos.lengthSq() > 1e-4) {
      scratchAntiDir.copy(scratchWorldPos).normalize();
      const tiltRad = THREE.MathUtils.degToRad(bodyData?.axialTiltDeg ?? 0);
      if (Math.abs(tiltRad) > 1e-6) {
        scratchInvTiltQuat.setFromAxisAngle(scratchXAxis, -tiltRad);
        scratchAntiDir.applyQuaternion(scratchInvTiltQuat);
      }
      scratchTargetQuat.setFromUnitVectors(UP_Y, scratchAntiDir);
      antiSolarRef.current.quaternion.copy(scratchTargetQuat);
    }

    const refs = nodeRefs.current;
    for (let i = 0; i < built.nodes.length; i++) {
      const node = built.nodes[i];
      const refEntry = refs[i];
      const ev = node.ev;
      const burstMult = evaluateEventBurstMultiplier(store.planetaryEventBurst, ev.id, nowMs);
      const selectedBoost = store.selectedPlanetaryEventId === ev.id ? 1.42 : 1.0;
      const effIntensity = store.planetaryEventIntensity * burstMult * selectedBoost;

      // Sync spinning & super-rotating events to exact SimulationClock angle matching Planet.tsx / Sun.tsx
      if (ev.frameMode === 'spin' && refEntry?.spinWrapper) {
        refEntry.spinWrapper.rotation.y = SimulationClock.calculateRotationAngle(
          baseRotSpeed * ev.superRotation,
          simTime
        );
      }

      if (node.vortexUniforms) {
        node.vortexUniforms.uTime.value = t + i * 3.7;
        const capScale =
          ev.archetype === 'volcanic_plume' || ev.archetype === 'cryo_geyser' ? 0.65 : 1.0;
        node.vortexUniforms.uIntensity.value = effIntensity * capScale;
        node.vortexUniforms.uOpacity.value = lodAlpha;
      }

      if (node.plumeUniforms) {
        node.plumeUniforms.uTime.value = t + i * 2.1;
        node.plumeUniforms.uIntensity.value = effIntensity;
        node.plumeUniforms.uOpacity.value =
          ev.bodyId === 'earth' && ev.archetype === 'volcanic_plume' ? lodAlpha * 0.72 : lodAlpha;
      }

      if (node.auroraUniforms) {
        // On Earth, yield ambient polar aurora when dedicated SolarStormAurora CME mode is active
        const yieldEarthAurora = bodyId === 'earth' && store.solarStormActive;
        if (refEntry?.auroraGroup) {
          refEntry.auroraGroup.visible = !yieldEarthAurora;
        }
        node.auroraUniforms.uTime.value = t + i * 1.9;
        // Clamp vertex ripple amplitude strictly so polar crowns glow smoothly without spiky limb bristles (U8)
        const maxRippleIntensity = node.isPolarDualAurora ? 0.30 : 0.22;
        node.auroraUniforms.uIntensity.value = Math.min(
          maxRippleIntensity,
          (node.isPolarDualAurora ? 0.14 : 0.10) + effIntensity * (node.isPolarDualAurora ? 0.08 : 0.05)
        );
        node.auroraUniforms.uOpacity.value = yieldEarthAurora ? 0 : lodAlpha * 0.86;
      }

      if (node.lightningMat) {
        if (store.reducedMotion) {
          node.lightningMat.opacity = 0.52 * lodAlpha * Math.min(effIntensity, 1.5);
        } else {
          const pulse = Math.pow(Math.max(0, Math.sin(t * 7.8 + i * 4.3) * Math.sin(t * 17.3 + i)), 2);
          const burstFloor = burstMult > 1.05 ? 0.68 : 0.22;
          node.lightningMat.opacity = Math.min(0.98, (burstFloor + pulse * 0.88) * lodAlpha * Math.min(effIntensity, 1.85));
        }
      }

      if (node.spokeUniforms && node.rainMat) {
        if (refEntry?.spokesGroup && !store.reducedMotion) {
          refEntry.spokesGroup.rotation.y += safeDt * 0.22;
        }
        node.spokeUniforms.uTime.value = t + i * 1.3;
        node.spokeUniforms.uOpacity.value = Math.min(0.58, 0.36 * lodAlpha * Math.min(effIntensity, 1.6));
        node.rainMat.opacity = Math.min(0.48, 0.28 * lodAlpha * Math.min(effIntensity, 1.6));
      }

      if (node.arcadeUniforms) {
        node.arcadeUniforms.uTime.value = t + i * 1.7;
        node.arcadeUniforms.uIntensity.value = effIntensity;
        node.arcadeUniforms.uOpacity.value = lodAlpha;
      }
    }
  });

  if (events.length === 0) return null;

  return (
    <group ref={rootRef}>
      {built.nodes.map((node, idx) => {
        const ev = node.ev;
        const bindSpin = (el: THREE.Group | null) => {
          if (!nodeRefs.current[idx]) {
            nodeRefs.current[idx] = { event: ev, spinWrapper: el };
          } else {
            nodeRefs.current[idx].spinWrapper = el;
          }
        };
        const bindAurora = (el: THREE.Group | null) => {
          if (!nodeRefs.current[idx]) {
            nodeRefs.current[idx] = { event: ev, spinWrapper: null, auroraGroup: el };
          } else {
            nodeRefs.current[idx].auroraGroup = el;
          }
        };
        const bindSpokes = (el: THREE.Group | null) => {
          if (!nodeRefs.current[idx]) {
            nodeRefs.current[idx] = { event: ev, spinWrapper: null, spokesGroup: el };
          } else {
            nodeRefs.current[idx].spokesGroup = el;
          }
        };

        if (ev.frameMode === 'antisolar') {
          return (
            <group key={ev.id} ref={antiSolarRef}>
              {node.plumeGeo && node.plumeMat && (
                <points
                  position={[0, visualRadius * ev.radiusFactor, 0]}
                  geometry={node.plumeGeo}
                  material={node.plumeMat}
                  raycast={NOOP_RAYCAST}
                />
              )}
            </group>
          );
        }

        const innerVisuals = (
          <>
            {/* Curved spherical surface cap for cyclones, hexagon, dust veils, fissures, impacts & vent glows */}
            {node.capGeo && node.vortexMat && (
              <mesh
                quaternion={node.orientQuat}
                geometry={node.capGeo}
                material={node.vortexMat}
                raycast={NOOP_RAYCAST}
              />
            )}

            {/* Ballistic GPU particle plumes / cryo geysers / diamond rain / solar flare particles */}
            {node.plumeGeo && node.plumeMat && (
              <points
                position={node.anchorPos}
                quaternion={node.orientQuat}
                geometry={node.plumeGeo}
                material={node.plumeMat}
                raycast={NOOP_RAYCAST}
              />
            )}

            {/* Jagged 3D lightning forks */}
            {node.lightningGeo && node.lightningMat && (
              <lineSegments
                quaternion={node.orientQuat}
                geometry={node.lightningGeo}
                material={node.lightningMat}
                raycast={NOOP_RAYCAST}
              />
            )}

            {/* Volumetric 3D tubular solar magnetic plasma arcade loops */}
            {node.arcadeGeo && node.arcadeMat && (
              <mesh
                position={node.anchorPos}
                quaternion={node.orientQuat}
                geometry={node.arcadeGeo}
                material={node.arcadeMat}
                raycast={NOOP_RAYCAST}
              />
            )}

            {/* 3D waving polar / crustal auroral ovals (normalized design radius scaled to visualRadius) */}
            {node.auroraNorthGeo && node.auroraMat && (
              <group
                ref={bindAurora}
                scale={visualRadius / AURORA_DESIGN_RADIUS}
                quaternion={node.auroraQuat ?? undefined}
              >
                <mesh
                  geometry={node.auroraNorthGeo}
                  material={node.auroraMat}
                  raycast={NOOP_RAYCAST}
                />
                {node.auroraSouthGeo && (
                  <mesh
                    geometry={node.auroraSouthGeo}
                    material={node.auroraMat}
                    raycast={NOOP_RAYCAST}
                  />
                )}
              </group>
            )}

            {/* Saturn electrostatic ring spokes & ionized ring rain */}
            {node.spokesGeo && node.spokeMat && node.rainGeo && node.rainMat && (
              <group ref={bindSpokes}>
                <mesh
                  geometry={node.spokesGeo}
                  material={node.spokeMat}
                  raycast={NOOP_RAYCAST}
                />
                <lineSegments
                  geometry={node.rainGeo}
                  material={node.rainMat}
                  raycast={NOOP_RAYCAST}
                />
              </group>
            )}
          </>
        );

        if (ev.frameMode === 'spin') {
          return (
            <group key={ev.id} ref={bindSpin}>
              {innerVisuals}
            </group>
          );
        }

        return <group key={ev.id}>{innerVisuals}</group>;
      })}
    </group>
  );
};
