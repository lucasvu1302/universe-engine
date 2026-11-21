import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { AssetManager } from '@/engine/assets/AssetManager';
import {
  evaluateEventBurstMultiplier,
  getPlanetaryEventById,
  getSurfaceStageConfig,
  type EventSurfaceBiome,
  type PlanetaryEventArchetype,
} from '@/data/planetaryEventsData';
import { useAppStore } from '@/stores/useAppStore';
import eventSurfaceTerrainVert from '@/shaders/phenomena/eventSurfaceTerrain.vert.glsl';
import eventSurfaceTerrainFrag from '@/shaders/phenomena/eventSurfaceTerrain.frag.glsl';
import eventSurfaceSkyFrag from '@/shaders/phenomena/eventSurfaceSky.frag.glsl';
import auroraCurtainVert from '@/shaders/cosmic/auroraCurtain.vert.glsl';
import planetaryAuroraFrag from '@/shaders/phenomena/planetaryAurora.frag.glsl';

const NOOP_RAYCAST: THREE.Object3D['raycast'] = () => {};

const BIOME_TO_INDEX: Record<EventSurfaceBiome, number> = {
  volcanic_lava: 0.0,
  cryo_ice_geyser: 1.0,
  dust_impact_desert: 2.0,
  gas_giant_clouds: 3.0,
  polar_aurora_sky: 4.0,
};

export interface EventSurfaceArchetypeStageSpec {
  layerKind:
    | 'volcanic_eruption'
    | 'cryo_geysers'
    | 'lightning_curtain'
    | 'dust_tornado'
    | 'cyclone_eyewall'
    | 'hexagon_jet'
    | 'aurora_curtains'
    | 'diamond_rain'
    | 'impact_bolide'
    | 'thermal_rifts'
    | 'cirrus_veil'
    | 'plasma_wind'
    | 'ring_rain'
    | 'solar_arches';
  particleCount: number;
  cameraShakeScale: number;
}

/**
 * Exhaustive 14-archetype surface stage descriptor table ensuring every single
 * planetary event archetype renders a bespoke close-up 3D spectacle.
 */
export const EVENT_SURFACE_ARCHETYPE_STAGE: Record<
  PlanetaryEventArchetype,
  EventSurfaceArchetypeStageSpec
> = {
  volcanic_plume: { layerKind: 'volcanic_eruption', particleCount: 160, cameraShakeScale: 0.42 },
  cryo_geyser: { layerKind: 'cryo_geysers', particleCount: 340, cameraShakeScale: 0.24 },
  lightning_storm: { layerKind: 'lightning_curtain', particleCount: 60, cameraShakeScale: 0.34 },
  dust_storm: { layerKind: 'dust_tornado', particleCount: 280, cameraShakeScale: 0.36 },
  cyclone_vortex: { layerKind: 'cyclone_eyewall', particleCount: 240, cameraShakeScale: 0.32 },
  polar_hexagon: { layerKind: 'hexagon_jet', particleCount: 220, cameraShakeScale: 0.22 },
  polar_aurora: { layerKind: 'aurora_curtains', particleCount: 32, cameraShakeScale: 0.10 },
  diamond_shimmer: { layerKind: 'diamond_rain', particleCount: 180, cameraShakeScale: 0.18 },
  impact_flash: { layerKind: 'impact_bolide', particleCount: 320, cameraShakeScale: 0.50 },
  thermal_fissure: { layerKind: 'thermal_rifts', particleCount: 260, cameraShakeScale: 0.28 },
  ice_cloud_veil: { layerKind: 'cirrus_veil', particleCount: 200, cameraShakeScale: 0.14 },
  plasma_tail: { layerKind: 'plasma_wind', particleCount: 300, cameraShakeScale: 0.20 },
  ring_spokes: { layerKind: 'ring_rain', particleCount: 260, cameraShakeScale: 0.16 },
  solar_flare_loop: { layerKind: 'solar_arches', particleCount: 340, cameraShakeScale: 0.40 },
};

const SKY_DOME_VERT = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const HORIZON_RING_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const HORIZON_RING_FRAG = /* glsl */ `
  precision highp float;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  varying vec2 vUv;
  void main() {
    vec2 p = (vUv - 0.5) * 2.0;
    float r = length(p);
    if (r < 0.44 || r > 1.0) discard;
    float t = clamp((r - 0.44) / 0.56, 0.0, 1.0);
    float bands = 0.58 + 0.42 * sin(t * 46.0) * cos(t * 17.0);
    float cassini = 1.0 - 0.88 * smoothstep(0.57, 0.60, t) * (1.0 - smoothstep(0.64, 0.67, t));
    float innerFade = smoothstep(0.44, 0.50, r);
    float outerFade = 1.0 - smoothstep(0.92, 1.0, r);
    float alpha = clamp(bands * cassini * innerFade * outerFade * 0.78, 0.0, 0.85);
    vec3 col = mix(uColorA, uColorB, t);
    gl_FragColor = vec4(col, alpha);
  }
`;

const ATMOSPHERE_HALO_VERT = /* glsl */ `
  varying vec3 vNormalDir;
  varying vec3 vViewDir;
  void main() {
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    vNormalDir = normalize(normalMatrix * normal);
    vViewDir = normalize(-mvPos.xyz);
    gl_Position = projectionMatrix * mvPos;
  }
`;

const ATMOSPHERE_HALO_FRAG = /* glsl */ `
  precision highp float;
  uniform vec3 uGlowColor;
  varying vec3 vNormalDir;
  varying vec3 vViewDir;
  void main() {
    float ndv = clamp(dot(normalize(vNormalDir), normalize(vViewDir)), 0.0, 1.0);
    // Subtle physically tapered planetary atmospheric limb scatter (no neon sticker outline)
    float rim = pow(max(1.0 - ndv, 1e-4), 5.2);
    gl_FragColor = vec4(uGlowColor, clamp(rim * 0.36, 0.0, 0.42));
  }
`;

const SOFT_SUN_GLOW_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SOFT_SUN_GLOW_FRAG = /* glsl */ `
  precision highp float;
  uniform vec3 uCoreColor;
  uniform vec3 uHaloColor;
  uniform float uOpacity;
  varying vec2 vUv;
  void main() {
    vec2 p = (vUv - 0.5) * 2.0;
    float r = length(p);
    if (r > 1.0) discard;
    float core = exp(-r * r * 48.0);
    float inner = exp(-r * r * 10.0) * 0.42;
    float halo = exp(-r * 2.8) * 0.28 * (1.0 - smoothstep(0.65, 1.0, r));
    vec3 col = mix(uHaloColor, uCoreColor, clamp(core * 1.4 + inner * 0.45, 0.0, 1.0));
    float alpha = clamp((core * 0.92 + inner + halo) * uOpacity, 0.0, 0.92);
    if (alpha < 0.005) discard;
    gl_FragColor = vec4(col, alpha);
  }
`;

/**
 * Volumetric Billowing Plume / Cryo-Geyser / Dust-Tornado Shader:
 * Supports both illuminated opaque dust/pyroclastic ash (`uLitMode > 0.5`, NormalBlending)
 * and soft backlit icy cryo-mist plumes (`uLitMode < 0.5`), eliminating hard geometric cones.
 */
const VOLUMETRIC_COLUMN_VERT = /* glsl */ `
  uniform float uTime;
  uniform float uSway;
  varying vec2 vUv;
  varying vec3 vNormalDir;
  varying vec3 vViewDir;
  void main() {
    vUv = uv;
    vec3 pos = position;
    float hFactor = smoothstep(0.0, 1.0, uv.y);
    pos.x += sin(uv.y * 5.2 - uTime * 2.1) * uSway * hFactor;
    pos.z += cos(uv.y * 4.4 - uTime * 1.7) * uSway * 0.65 * hFactor;
    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
    vNormalDir = normalize(normalMatrix * normal);
    vViewDir = normalize(-mvPos.xyz);
    gl_Position = projectionMatrix * mvPos;
  }
`;

const VOLUMETRIC_COLUMN_FRAG = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform float uFlowSpeed;
  uniform float uIntensity;
  uniform float uBurst;
  uniform float uOpacity;
  uniform float uLitMode;
  uniform vec3 uBaseColor;
  uniform vec3 uTipColor;
  uniform vec3 uRimColor;
  varying vec2 vUv;
  varying vec3 vNormalDir;
  varying vec3 vViewDir;

  float hash21(vec2 p) {
    p = fract(p * vec2(127.1, 311.7));
    p += dot(p, p + 23.4);
    return fract(p.x * p.y);
  }
  float noise2D(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
      mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * noise2D(p);
      p = p * 2.06 + vec2(5.1, 9.7);
      a *= 0.5;
    }
    return v;
  }

  void main() {
    float theta = vUv.x * 6.2831853;
    vec2 ring = vec2(cos(theta), sin(theta));
    float yScroll = vUv.y * 4.4 - uTime * uFlowSpeed;
    float n1 = fbm(vec2(ring.x * 2.4 + ring.y * 1.6, yScroll));
    float n2 = fbm(vec2(ring.y * 4.2 - ring.x * 2.1, yScroll * 1.75 - uTime * 0.52));
    float wisps = smoothstep(0.22, 0.84, n1 * 0.62 + n2 * 0.46);

    vec3 N = length(vNormalDir) > 1e-4 ? normalize(vNormalDir) : vec3(0.0, 0.0, 1.0);
    vec3 V = length(vViewDir) > 1e-4 ? normalize(vViewDir) : vec3(0.0, 0.0, 1.0);
    float ndv = abs(dot(N, V));
    float softSilhouette = pow(max(ndv, 1e-4), 1.9);
    float vertEnvelope = smoothstep(0.0, 0.14, vUv.y) * (1.0 - smoothstep(0.42, 0.98, vUv.y));

    vec3 col;
    if (uLitMode > 0.5) {
      // Physically lit dark dusty vortex or pyroclastic volcanic ash billowing with fiery base underglow
      float lightSide = max(dot(N, normalize(vec3(0.45, 0.42, 0.78))), 0.0);
      float rimScatter = pow(max(1.0 - ndv, 1e-4), 2.2) * (0.45 + 0.55 * n1);
      vec3 smokeBody = mix(uTipColor * 0.55, uTipColor * 1.25, lightSide * 0.7 + n2 * 0.35);
      float hotBase = exp(-vUv.y * 4.4) * (0.78 + 0.45 * (clamp(uBurst, 1.0, 2.2) - 1.0));
      col = mix(smokeBody, uBaseColor * 1.25, clamp(hotBase * (0.55 + 0.45 * n2), 0.0, 0.92));
      col += uRimColor * rimScatter * 0.45;
    } else {
      // Soft backlit translucent icy cryo-mist plume (tapers gracefully without blowing out Saturn behind it)
      col = mix(uBaseColor, uTipColor, smoothstep(0.14, 0.75, vUv.y));
      float ventGlow = exp(-vUv.y * 6.5) * (0.45 + 0.35 * (clamp(uBurst, 1.0, 2.2) - 1.0));
      col += uRimColor * ventGlow * n2;
    }

    float alpha = wisps * softSilhouette * vertEnvelope * uOpacity * clamp(uIntensity, 0.65, 1.55) * (0.88 + 0.25 * (clamp(uBurst, 1.0, 2.2) - 1.0));
    alpha = clamp(alpha, 0.0, uLitMode > 0.5 ? 0.88 : 0.52);
    if (alpha < 0.008) discard;
    gl_FragColor = vec4(col, alpha);
  }
`;

/**
 * Volumetric Tapered Electric-Cyan Superbolt Lightning Ribbon Shader (replaces 1px WebGL LineSegments!)
 */
const LIGHTNING_RIBBON_VERT = /* glsl */ `
  attribute float aEdge;
  attribute float aCluster;
  varying float vEdge;
  varying float vCluster;
  void main() {
    vEdge = aEdge;
    vCluster = aCluster;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const LIGHTNING_RIBBON_FRAG = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform float uIntensity;
  uniform float uBurst;
  uniform float uReducedMotion;
  uniform vec3 uCoreColor;
  uniform vec3 uHaloColor;
  varying float vEdge;
  varying float vCluster;

  void main() {
    // Asynchronous 4-cluster storm flash timing so 2-4 vivid superbolts strike dramatically per instant
    float pulse = 0.78;
    if (uReducedMotion < 0.5) {
      float phase = uTime * 3.6 + vCluster * 1.57;
      float wave = max(0.0, sin(phase) * sin(phase * 2.3 + 0.5));
      float strobe = smoothstep(0.18, 0.78, wave);
      float burstBoost = clamp(uBurst, 1.0, 2.2) > 1.05 ? 0.42 : 0.08;
      pulse = clamp(burstBoost + strobe * 1.25, 0.0, 1.35);
    }

    float distCenter = abs(vEdge * 2.0 - 1.0);
    float core = exp(-distCenter * distCenter * 22.0);
    float halo = exp(-distCenter * 2.6) * 0.88;
    // HDR overbright electric cyan sheath + crisp white-cyan core so postprocessing Bloom illuminates the bolt
    vec3 col = mix(uHaloColor * 1.45, uCoreColor * 1.85, clamp(core * 1.4, 0.0, 1.0));
    float alpha = clamp((core * 1.15 + halo * 0.92) * pulse * clamp(uIntensity, 0.6, 1.6), 0.0, 0.98);
    if (alpha < 0.025) discard;
    gl_FragColor = vec4(col, alpha);
  }
`;

/**
 * Shader-Animated Falling Prismatic Diamond-Rain / Ring-Rain / Plasma-Wind Quad Streaks
 * (Continuously animated on GPU every frame with zero frozen 1px scratch lines!)
 */
const ANIMATED_STREAK_VERT = /* glsl */ `
  attribute vec3 aAnchor;
  attribute vec2 aQuad;
  attribute float aSeed;
  uniform float uTime;
  uniform float uMode;
  uniform float uBurst;
  uniform float uReducedMotion;
  varying vec2 vQuad;
  varying float vSparkle;

  void main() {
    vQuad = aQuad;
    float animT = uTime * mix(1.0, 0.22, uReducedMotion) * (0.9 + 0.35 * (clamp(uBurst, 1.0, 2.2) - 1.0));
    vec3 center = aAnchor;
    vec3 dir;
    float halfLen;
    float halfW;

    if (uMode < 0.5) {
      // Falling prismatic diamond crystals / icy ring-rain streaks
      float speed = 18.0 + aSeed * 16.0;
      center.y = mod(aAnchor.y - animT * speed, 64.0) + 1.0;
      center.x = aAnchor.x + sin(animT * 1.2 + aSeed * 19.0) * 1.2;
      dir = normalize(vec3(0.24, -0.97, 0.04));
      halfLen = 1.65 + aSeed * 2.4;
      halfW = 0.095 + aSeed * 0.065;
    } else {
      // High-velocity horizontal golden solar-wind sodium plasma streams
      float speed = 28.0 + aSeed * 22.0;
      center.x = mod(aAnchor.x + animT * speed + 85.0, 170.0) - 85.0;
      dir = normalize(vec3(0.98, 0.14, 0.12));
      halfLen = 5.2 + aSeed * 6.5;
      halfW = 0.14 + aSeed * 0.08;
    }

    vec3 side = normalize(cross(dir, vec3(0.0, 0.0, 1.0)));
    vec3 worldPos = center + dir * (aQuad.y * halfLen) + side * (aQuad.x * halfW);
    vSparkle = 0.55 + 0.45 * sin(animT * (7.0 + aSeed * 9.0) + aSeed * 41.0);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(worldPos, 1.0);
  }
`;

const ANIMATED_STREAK_FRAG = /* glsl */ `
  precision highp float;
  uniform vec3 uPrimaryColor;
  uniform vec3 uSecondaryColor;
  uniform float uIntensity;
  varying vec2 vQuad;
  varying float vSparkle;

  void main() {
    float across = 1.0 - smoothstep(0.0, 1.0, abs(vQuad.x));
    float along = (1.0 - smoothstep(0.1, 1.0, abs(vQuad.y)));
    float dh = vQuad.y - 0.55;
    float diamondHead = exp(-(dh * dh) * 14.0) * across;
    vec3 col = mix(uSecondaryColor, uPrimaryColor, clamp(along * 0.8 + 0.2, 0.0, 1.0));
    col = mix(col, vec3(0.95, 0.99, 1.0), clamp(diamondHead * 1.15 * vSparkle, 0.0, 1.0));
    float alpha = clamp((across * along * 0.68 + diamondHead * 0.72) * vSparkle * clamp(uIntensity, 0.65, 1.5), 0.0, 0.94);
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(col, alpha);
  }
`;

const STORM_CEILING_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const STORM_CEILING_FRAG = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform float uFlash;
  uniform vec3 uCloudDark;
  uniform vec3 uFlashColor;
  varying vec2 vUv;

  float hash21(vec2 p) {
    p = fract(p * vec2(127.1, 311.7));
    p += dot(p, p + 19.7);
    return fract(p.x * p.y);
  }
  float noise2D(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
      mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * noise2D(p);
      p = p * 2.03 + vec2(3.7, -6.1);
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 p = (vUv - 0.5) * 2.0;
    float r = length(p);
    if (r > 1.0) discard;
    float edgeFade = 1.0 - smoothstep(0.28, 0.98, r);
    float c = fbm(vUv * 5.2 + vec2(uTime * 0.08, -uTime * 0.05));
    float c2 = fbm(vUv * 10.5 - vec2(uTime * 0.14, uTime * 0.09));
    float density = smoothstep(0.18, 0.80, c * 0.68 + c2 * 0.36);
    float flashPocket = smoothstep(0.48, 0.86, c2) * uFlash;
    vec3 col = mix(uCloudDark * 0.36, uCloudDark * 0.92, density);
    col += uFlashColor * flashPocket * 1.55;
    float alpha = clamp(density * edgeFade * 0.92, 0.0, 0.94);
    if (alpha < 0.008) discard;
    gl_FragColor = vec4(col, alpha);
  }
`;

/**
 * Procedural Scorched Basalt Volcano Shader with Front-3/4 Sculpted Rock Relief,
 * Organic Domain-Warped Magma Fissures, and Seamless Horizon/Base Blending.
 */
const VOLCANO_PEAK_VERT = /* glsl */ `
  varying vec3 vWorldPos;
  varying vec3 vNormalDir;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    vNormalDir = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const VOLCANO_PEAK_FRAG = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform float uBurst;
  uniform vec3 uRockDark;
  uniform vec3 uRockMid;
  uniform vec3 uLavaColor;
  uniform vec3 uSkyHorizon;
  varying vec3 vWorldPos;
  varying vec3 vNormalDir;
  varying vec2 vUv;

  float hash21(vec2 p) {
    p = fract(p * vec2(127.1, 311.7));
    p += dot(p, p + 31.7);
    return fract(p.x * p.y);
  }
  float noise2D(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
      mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 3; i++) {
      v += a * noise2D(p);
      p = p * 2.05 + vec2(4.1, -3.3);
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec3 N = length(vNormalDir) > 1e-4 ? normalize(vNormalDir) : vec3(0.0, 1.0, 0.0);
    vec3 V = length(cameraPosition - vWorldPos) > 1e-4 ? normalize(cameraPosition - vWorldPos) : vec3(0.0, 0.0, 1.0);
    float ndotlFront = max(dot(N, normalize(vec3(0.35, 0.58, 0.72))), 0.0);
    float ndotlBack = max(dot(N, normalize(vec3(0.08, 0.45, -0.88))), 0.0);
    float rim = pow(max(1.0 - max(dot(N, V), 0.0), 1e-4), 2.8);

    float rockA = fbm(vUv * vec2(26.0, 14.0));
    float rockB = fbm(vUv * vec2(58.0, 32.0));
    vec3 col = mix(uRockDark * 0.52, uRockMid * 0.96, rockA * 0.65 + rockB * 0.35);
    col *= (0.42 + 0.62 * ndotlFront + 0.38 * ndotlBack);
    col += uSkyHorizon * rim * 0.38;

    // Seamless periodic lava-channel sampling eliminates vertical CylinderGeometry UV seam on camera-facing flank
    float theta = vUv.x * 6.2831853;
    vec2 ring = vec2(cos(theta), sin(theta));
    vec2 lavaCoord = vec2(ring.x * 2.4 + ring.y * 1.9 + fbm(ring * 2.2 + vec2(vUv.y * 4.5, 0.0)) * 1.2, vUv.y * 4.8 - uTime * 0.08);
    float ridge1 = abs(fbm(lavaCoord) - 0.5);
    float ridge2 = abs(fbm(lavaCoord * 1.9 + vec2(3.2, -1.8)) - 0.5);
    float fissure = smoothstep(0.042, 0.007, ridge1) + smoothstep(0.032, 0.005, ridge2) * 0.5;
    float slopeFade = smoothstep(0.14, 0.92, vUv.y);
    float rimGlow = smoothstep(0.84, 1.0, vUv.y) * (0.7 + 0.3 * sin(uTime * 2.8 + theta * 3.0));
    float lavaMask = clamp(fissure * slopeFade * 0.92 + rimGlow * 0.85, 0.0, 1.0);
    vec3 hotLava = mix(uLavaColor, vec3(1.0, 0.92, 0.54), lavaMask * 0.62);
    col = mix(col, hotLava * (1.28 + 0.48 * (clamp(uBurst, 1.0, 2.2) - 1.0)), lavaMask);

    // Distance fog matching eventSurfaceTerrain.frag.glsl so peak integrates seamlessly into Venus haze
    float camDist = length(cameraPosition - vWorldPos);
    float fogFactor = 1.0 - exp(-pow(max(camDist * 0.0044, 1e-4), 1.65));
    col = mix(col, uSkyHorizon, clamp(fogFactor * 0.72, 0.0, 0.75));

    gl_FragColor = vec4(col, 1.0);
  }
`;

function seededRand(seed: number): number {
  const s = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

/**
 * Builds an organically eroded craggy volcanic shield/caldera cone with a flared apron skirt.
 */
function buildVolcanoPeakGeometry(): THREE.BufferGeometry {
  const geo = new THREE.CylinderGeometry(4.4, 30.0, 16.5, 64, 22, false);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const r = Math.hypot(x, z);
    if (r > 0.5) {
      const ang = Math.atan2(z, x);
      const heightT = (y + 8.25) / 16.5;
      // Gently flare out the volcanic apron at the base so it blends organically into the terrain
      const apronFlare = 1.0 + Math.pow(1.0 - heightT, 2.2) * 0.32;
      const ridge =
        Math.sin(ang * 7.0 + heightT * 2.4) * 1.55 +
        Math.cos(ang * 13.0 - heightT * 3.1) * 0.85 +
        Math.sin(ang * 19.0 + y * 0.45) * 0.42;
      const flankScale = apronFlare * (1.0 + (ridge / Math.max(r, 4.0)) * (1.0 - heightT * 0.28));
      const rimNotch = heightT > 0.85 ? Math.sin(ang * 5.0) * 0.75 : 0;
      pos.setXYZ(i, x * flankScale, y + rimNotch, z * flankScale);
    }
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds the UV-mapped sculpted Endurance "Ranger" lifting-body shuttlecraft hull
 * matching MillersPlanetScene.tsx (bow at -Z, stern at +Z).
 */
function buildRangerHullGeometry(): THREE.BufferGeometry {
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
}

/**
 * Builds a sweeping curved sky auroral curtain ribbon matching auroraCurtain.vert.glsl + planetaryAurora.frag.glsl.
 */
function buildSkyAuroraRibbonGeometry(
  spanWidth: number,
  height: number,
  baseY: number,
  centerZ: number,
  curveDepth: number,
  phaseOffset: number,
  segments = 96
): THREE.BufferGeometry {
  const positions = new Float32Array((segments + 1) * 2 * 3);
  const normals = new Float32Array((segments + 1) * 2 * 3);
  const uvs = new Float32Array((segments + 1) * 2 * 2);
  const indices: number[] = [];

  for (let i = 0; i <= segments; i++) {
    const u = i / segments;
    const x = (u - 0.5) * spanWidth;
    const arc = Math.cos((u - 0.5) * Math.PI) * curveDepth;
    const waveZ =
      centerZ -
      arc +
      Math.sin(u * Math.PI * 3.2 + phaseOffset) * 18.0 +
      Math.cos(u * Math.PI * 5.8 - phaseOffset) * 7.0;
    const waveY = baseY + Math.sin(u * Math.PI * 2.0 + phaseOffset) * 5.0;

    const bot = i * 2;
    const top = bot + 1;

    positions[bot * 3] = x;
    positions[bot * 3 + 1] = waveY;
    positions[bot * 3 + 2] = waveZ;

    positions[top * 3] = x * 1.05;
    positions[top * 3 + 1] = waveY + height;
    positions[top * 3 + 2] = waveZ - 8.0;

    normals[bot * 3] = 0;
    normals[bot * 3 + 1] = -0.15;
    normals[bot * 3 + 2] = 0.988;

    normals[top * 3] = 0;
    normals[top * 3 + 1] = -0.15;
    normals[top * 3 + 2] = 0.988;

    uvs[bot * 2] = u;
    uvs[bot * 2 + 1] = 0;
    uvs[top * 2] = u;
    uvs[top * 2 + 1] = 1;

    if (i < segments) {
      const nb = (i + 1) * 2;
      const nt = nb + 1;
      indices.push(bot, nb, top, top, nb, nt);
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
 * Builds thick volumetric tapered 3D ribbon quads for branching superbolt lightning
 * grouped into 4 independent flash clusters (replaces 1px WebGL LineSegments!).
 */
function buildVolumetricLightningGeometry(salt: number): THREE.BufferGeometry {
  const boltCount = 8;
  const segmentsPerBolt = 14;
  const positions: number[] = [];
  const edges: number[] = [];
  const clusters: number[] = [];

  const pushRibbonSeg = (
    x0: number,
    y0: number,
    z0: number,
    x1: number,
    y1: number,
    z1: number,
    w0: number,
    w1: number,
    cluster: number
  ) => {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = Math.hypot(dx, dy) || 1;
    const px = -dy / len;
    const py = dx / len;

    const ax = x0 - px * w0;
    const ay = y0 - py * w0;
    const bx = x0 + px * w0;
    const by = y0 + py * w0;
    const cx = x1 - px * w1;
    const cy = y1 - py * w1;
    const dx2 = x1 + px * w1;
    const dy2 = y1 + py * w1;

    positions.push(ax, ay, z0, bx, by, z0, cx, cy, z1);
    edges.push(0, 1, 0);
    clusters.push(cluster, cluster, cluster);

    positions.push(bx, by, z0, dx2, dy2, z1, cx, cy, z1);
    edges.push(1, 1, 0);
    clusters.push(cluster, cluster, cluster);
  };

  for (let b = 0; b < boltCount; b++) {
    const cluster = b % 4;
    let x = (seededRand(salt + b * 17.3) - 0.5) * 76;
    let y = 32 + seededRand(salt + b * 29.1) * 4;
    let z = -22 - seededRand(salt + b * 41.7) * 42;

    for (let s = 0; s < segmentsPerBolt; s++) {
      const nx = x + (seededRand(salt + b * 53 + s * 11) - 0.5) * 5.2;
      const ny = y - (2.0 + seededRand(salt + b * 67 + s * 13) * 1.8);
      const nz = z + (seededRand(salt + b * 79 + s * 17) - 0.5) * 3.4;
      const w0 = THREE.MathUtils.lerp(0.82, 0.28, s / segmentsPerBolt);
      const w1 = THREE.MathUtils.lerp(0.82, 0.24, (s + 1) / segmentsPerBolt);
      pushRibbonSeg(x, y, z, nx, ny, nz, w0, w1, cluster);

      if (s === 4 || s === 8 || s === 10) {
        const fx1 = nx + (seededRand(salt + b * 97 + s * 23) - 0.5) * 9.0;
        const fy1 = ny - 3.6;
        const fz1 = nz + (seededRand(salt + b * 107 + s * 31) - 0.5) * 4.5;
        pushRibbonSeg(nx, ny, nz, fx1, fy1, fz1, w1 * 0.78, 0.22, cluster);

        const fx2 = fx1 + (seededRand(salt + b * 131 + s * 37) - 0.5) * 6.5;
        const fy2 = fy1 - 3.2;
        const fz2 = fz1 + (seededRand(salt + b * 149 + s * 41) - 0.5) * 3.5;
        pushRibbonSeg(fx1, fy1, fz1, fx2, fy2, fz2, 0.22, 0.08, cluster);
      }
      x = nx;
      y = ny;
      z = nz;
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('aEdge', new THREE.Float32BufferAttribute(edges, 1));
  geo.setAttribute('aCluster', new THREE.Float32BufferAttribute(clusters, 1));
  return geo;
}

/**
 * Builds GPU-animated falling/streaming prismatic crystal streak quads (replaces frozen 1px LineSegments!).
 */
function buildAnimatedStreakQuadsGeometry(count: number, salt: number): THREE.BufferGeometry {
  const positions = new Float32Array(count * 6 * 3);
  const anchors = new Float32Array(count * 6 * 3);
  const quads = new Float32Array(count * 6 * 2);
  const seeds = new Float32Array(count * 6);

  const cornerCoords: readonly [number, number][] = [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ];

  for (let i = 0; i < count; i++) {
    const r1 = seededRand(salt + i * 11.3);
    const r2 = seededRand(salt + i * 23.7);
    const r3 = seededRand(salt + i * 37.9);
    const seed = seededRand(salt + i * 59.1);
    const ax = (r1 - 0.5) * 132;
    const ay = r2 * 64;
    const az = -10 - r3 * 80;

    for (let v = 0; v < 6; v++) {
      const idx = i * 6 + v;
      positions[idx * 3] = ax;
      positions[idx * 3 + 1] = ay;
      positions[idx * 3 + 2] = az;
      anchors[idx * 3] = ax;
      anchors[idx * 3 + 1] = ay;
      anchors[idx * 3 + 2] = az;
      quads[idx * 2] = cornerCoords[v][0];
      quads[idx * 2 + 1] = cornerCoords[v][1];
      seeds[idx] = seed;
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aAnchor', new THREE.BufferAttribute(anchors, 3));
  geo.setAttribute('aQuad', new THREE.BufferAttribute(quads, 2));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 30, -45), 140);
  return geo;
}

/**
 * Builds deterministic bolide plasma entry trail for impact_bolide.
 */
function buildBolideTrailGeometry(salt: number): THREE.BufferGeometry {
  const count = 28;
  const verts = new Float32Array(count * 2 * 3);
  for (let i = 0; i < count; i++) {
    const r1 = seededRand(salt + i * 11.3);
    const r2 = seededRand(salt + i * 23.7);
    const r3 = seededRand(salt + i * 37.9);
    const spread = (r1 - 0.5) * 2.4;
    const spreadZ = (r2 - 0.5) * 2.4;
    const frac = 0.2 + r3 * 0.8;
    const startX = -38 + spread;
    const startY = 46 + (r3 - 0.5) * 2.2;
    const startZ = -62 + spreadZ;
    const endX = 2 + spread * 0.4;
    const endY = 1.5;
    const endZ = -42 + spreadZ * 0.4;
    verts[i * 6] = THREE.MathUtils.lerp(endX, startX, frac);
    verts[i * 6 + 1] = THREE.MathUtils.lerp(endY, startY, frac);
    verts[i * 6 + 2] = THREE.MathUtils.lerp(endZ, startZ, frac);
    verts[i * 6 + 3] = endX;
    verts[i * 6 + 4] = endY;
    verts[i * 6 + 5] = endZ;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
  return geo;
}

/**
 * Builds 4 towering braided coronal magnetic plasma arches for solar_flare_loop.
 */
function buildSolarArchGeometries(): THREE.BufferGeometry[] {
  const specs = [
    { x0: -48, x1: 12, z: -48, peak: 56, radius: 1.55 },
    { x0: -26, x1: 42, z: -56, peak: 72, radius: 1.95 },
    { x0: -12, x1: 54, z: -40, peak: 44, radius: 1.25 },
    { x0: -56, x1: -8, z: -64, peak: 64, radius: 1.4 },
  ];
  return specs.map((s) => {
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(s.x0, -2, s.z),
      new THREE.Vector3((s.x0 + s.x1) * 0.5, s.peak, s.z - 8),
      new THREE.Vector3(s.x1, -2, s.z + 4)
    );
    return new THREE.TubeGeometry(curve, 44, s.radius, 10, false);
  });
}

export const PlanetaryEventSurfaceScene: React.FC = () => {
  const activeEventSurfaceId = useAppStore((s) => s.activeEventSurfaceId);
  const { scene } = useThree();

  const ev = useMemo(() => getPlanetaryEventById(activeEventSurfaceId), [activeEventSurfaceId]);
  const stageCfg = useMemo(() => getSurfaceStageConfig(ev?.bodyId), [ev?.bodyId]);
  const archetypeSpec = useMemo(
    () => (ev ? EVENT_SURFACE_ARCHETYPE_STAGE[ev.archetype] : null),
    [ev]
  );

  const rootRef = useRef<THREE.Group>(null);
  const rangerRef = useRef<THREE.Group>(null);
  const particleRef = useRef<THREE.Points>(null);
  const lightningMatRef = useRef<THREE.ShaderMaterial | null>(null);
  const animatedStreakMatRef = useRef<THREE.ShaderMaterial | null>(null);
  const stormCeilingMatRef = useRef<THREE.ShaderMaterial | null>(null);
  const columnMatRef = useRef<THREE.ShaderMaterial | null>(null);
  const volcanoPeakMatRef = useRef<THREE.ShaderMaterial | null>(null);
  const shockRing1Ref = useRef<THREE.Mesh>(null);
  const shockRing2Ref = useRef<THREE.Mesh>(null);
  const bolideHeadRef = useRef<THREE.Mesh>(null);
  const vortexRingsRef = useRef<THREE.Group>(null);
  const terrainMatRef = useRef<THREE.ShaderMaterial | null>(null);
  const skyMatRef = useRef<THREE.ShaderMaterial | null>(null);
  const auroraMatRef = useRef<THREE.ShaderMaterial | null>(null);
  const simTimeRef = useRef(0);

  const assets = useMemo(() => AssetManager.getInstance(), []);
  const hullMap = useMemo(() => assets.getAerospaceHullMap(), [assets]);
  const aeroBumpMap = useMemo(() => assets.getAerospaceBumpMap(), [assets]);
  const softParticleMap = useMemo(() => assets.getSoftParticleMap(), [assets]);
  const unitSphere = useMemo(() => assets.getUnitSphereGeometry(48), [assets]);

  const horizonBodyTexture = useMemo(() => {
    if (!stageCfg.horizonBodyId) return null;
    return assets.loadTexture(stageCfg.horizonBodyId);
  }, [assets, stageCfg.horizonBodyId]);

  useEffect(() => {
    if (!ev) return;
    const prevFog = scene.fog;
    scene.fog = new THREE.FogExp2(stageCfg.fogColor, 0.0022);
    return () => {
      scene.fog = prevFog;
    };
  }, [scene, ev, stageCfg.fogColor]);

  // Deep-atmosphere & polar-night sun discipline (U4): hide blazing sun in deep storm decks, polar auroras & ice giants
  const showHorizonSun = useMemo(() => {
    if (!ev || !archetypeSpec) return false;
    if (stageCfg.horizonBodyId) return false;
    if (ev.surfaceBiome === 'polar_aurora_sky') return false;
    if (ev.bodyId === 'uranus' || ev.bodyId === 'neptune') return false;
    if (
      archetypeSpec.layerKind === 'lightning_curtain' ||
      archetypeSpec.layerKind === 'cyclone_eyewall' ||
      archetypeSpec.layerKind === 'diamond_rain'
    ) {
      return false;
    }
    return true;
  }, [ev, archetypeSpec, stageCfg.horizonBodyId]);

  const gpu = useMemo(() => {
    if (!ev || !archetypeSpec) return null;

    const lightDir = new THREE.Vector3(0.08, 0.24, -0.97).normalize();
    const biomeIdx = BIOME_TO_INDEX[ev.surfaceBiome];
    const primaryCol = new THREE.Color(ev.primaryColor);
    const secondaryCol = new THREE.Color(ev.secondaryColor);
    const kind = archetypeSpec.layerKind;

    const geometriesToDispose: THREE.BufferGeometry[] = [];
    const materialsToDispose: THREE.Material[] = [];

    const skyGeo = new THREE.SphereGeometry(520, 48, 32);
    const skyMat = new THREE.ShaderMaterial({
      vertexShader: SKY_DOME_VERT,
      fragmentShader: eventSurfaceSkyFrag,
      uniforms: {
        uTime: { value: 0 },
        uBiome: { value: biomeIdx },
        uIntensity: { value: 1.0 },
        uBurst: { value: 1.0 },
        uStarfieldOpacity: { value: stageCfg.starfieldOpacity },
        uSkyZenith: { value: new THREE.Color(stageCfg.skyZenith) },
        uSkyHorizon: { value: new THREE.Color(stageCfg.skyHorizon) },
        uSkyGlow: { value: new THREE.Color(stageCfg.skyGlow) },
        uPrimaryColor: { value: primaryCol.clone() },
        uLightDir: { value: lightDir },
      },
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    });
    geometriesToDispose.push(skyGeo);
    materialsToDispose.push(skyMat);

    // High near-camera mesh density (224x224 over 360x360 = ~1.6u/quad) eliminates Enceladus canyon sawtooth aliasing (U6)
    const terrainGeo = new THREE.PlaneGeometry(360, 360, 224, 224);
    terrainGeo.rotateX(-Math.PI / 2);
    const terrainMat = new THREE.ShaderMaterial({
      vertexShader: eventSurfaceTerrainVert,
      fragmentShader: eventSurfaceTerrainFrag,
      uniforms: {
        uTime: { value: 0 },
        uBiome: { value: biomeIdx },
        uIntensity: { value: 1.0 },
        uBurst: { value: 1.0 },
        uReducedMotion: { value: 0.0 },
        uGroundPrimary: { value: new THREE.Color(stageCfg.groundPrimary) },
        uGroundSecondary: { value: new THREE.Color(stageCfg.groundSecondary) },
        uGroundAccent: { value: new THREE.Color(stageCfg.groundAccent) },
        uSkyHorizon: { value: new THREE.Color(stageCfg.skyHorizon) },
        uSkyGlow: { value: new THREE.Color(stageCfg.skyGlow) },
        uPrimaryColor: { value: primaryCol.clone() },
        uSecondaryColor: { value: secondaryCol.clone() },
        uLightDir: { value: lightDir },
      },
      transparent: false,
      side: THREE.DoubleSide,
    });
    geometriesToDispose.push(terrainGeo);
    materialsToDispose.push(terrainMat);

    const rangerHullGeo = buildRangerHullGeometry();
    geometriesToDispose.push(rangerHullGeo);

    const sunGlowMat = new THREE.ShaderMaterial({
      vertexShader: SOFT_SUN_GLOW_VERT,
      fragmentShader: SOFT_SUN_GLOW_FRAG,
      uniforms: {
        uCoreColor: { value: new THREE.Color('#fff7ed') },
        uHaloColor: { value: new THREE.Color(stageCfg.skyGlow) },
        uOpacity: { value: ev.bodyId === 'mars' ? 0.56 : 0.72 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    });
    materialsToDispose.push(sunGlowMat);

    // Volumetric soft-edged column shader (NormalBlending opaque dust/ash for volcano & tornado; soft mist for cryo)
    const isCryo = kind === 'cryo_geysers';
    const isVolcano = kind === 'volcanic_eruption';
    const isTornado = kind === 'dust_tornado';
    const useOpaqueLitVolume = isVolcano || isTornado;

    const columnMat = new THREE.ShaderMaterial({
      vertexShader: VOLUMETRIC_COLUMN_VERT,
      fragmentShader: VOLUMETRIC_COLUMN_FRAG,
      uniforms: {
        uTime: { value: 0 },
        uSway: { value: isTornado ? 3.8 : isVolcano ? 2.2 : 1.0 },
        uFlowSpeed: { value: isCryo ? 1.8 : isTornado ? 2.4 : 1.15 },
        uIntensity: { value: 1.0 },
        uBurst: { value: 1.0 },
        uOpacity: { value: isCryo ? 0.36 : isTornado ? 0.84 : 0.88 },
        uLitMode: { value: useOpaqueLitVolume ? 1.0 : 0.0 },
        uBaseColor: { value: isTornado ? new THREE.Color('#c2592b') : primaryCol.clone() },
        uTipColor: {
          value: isVolcano
            ? new THREE.Color('#2d1b14')
            : isTornado
            ? new THREE.Color('#7c2d12')
            : secondaryCol.clone(),
        },
        uRimColor: {
          value: isVolcano
            ? new THREE.Color('#fb923c')
            : isTornado
            ? new THREE.Color('#fdba74')
            : new THREE.Color('#e0f2fe'),
        },
      },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: useOpaqueLitVolume ? THREE.NormalBlending : THREE.AdditiveBlending,
    });
    materialsToDispose.push(columnMat);

    // Eroded rocky caldera peak geometry + incandescent lava-vein basalt shader
    let volcanoPeakGeo: THREE.BufferGeometry | null = null;
    let volcanoPeakMat: THREE.ShaderMaterial | null = null;
    if (isVolcano) {
      volcanoPeakGeo = buildVolcanoPeakGeometry();
      volcanoPeakMat = new THREE.ShaderMaterial({
        vertexShader: VOLCANO_PEAK_VERT,
        fragmentShader: VOLCANO_PEAK_FRAG,
        uniforms: {
          uTime: { value: 0 },
          uBurst: { value: 1.0 },
          uRockDark: { value: new THREE.Color(stageCfg.groundSecondary) },
          uRockMid: { value: new THREE.Color(stageCfg.groundPrimary) },
          uLavaColor: { value: primaryCol.clone() },
          uSkyHorizon: { value: new THREE.Color(stageCfg.skyHorizon) },
        },
      });
      geometriesToDispose.push(volcanoPeakGeo);
      materialsToDispose.push(volcanoPeakMat);
    }

    // Soft FBM overhead brooding storm cloud deck for lightning_curtain (electric-cyan sheet flashes!)
    let stormCeilingMat: THREE.ShaderMaterial | null = null;
    if (kind === 'lightning_curtain') {
      stormCeilingMat = new THREE.ShaderMaterial({
        vertexShader: STORM_CEILING_VERT,
        fragmentShader: STORM_CEILING_FRAG,
        uniforms: {
          uTime: { value: 0 },
          uFlash: { value: 0.55 },
          uCloudDark: { value: new THREE.Color('#1a1418') },
          uFlashColor: { value: new THREE.Color('#38bdf8') },
        },
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      materialsToDispose.push(stormCeilingMat);
    }

    // Optional horizon planetary rings + subtle warm/matched atmospheric limb halo (U7 fix)
    let ringGeo: THREE.BufferGeometry | null = null;
    let ringMat: THREE.ShaderMaterial | null = null;
    if (stageCfg.horizonHasRings) {
      ringGeo = new THREE.RingGeometry(
        stageCfg.horizonScale * 1.95,
        stageCfg.horizonScale * 4.35,
        96,
        1
      );
      ringMat = new THREE.ShaderMaterial({
        vertexShader: HORIZON_RING_VERT,
        fragmentShader: HORIZON_RING_FRAG,
        uniforms: {
          uColorA: { value: new THREE.Color('#fde68a') },
          uColorB: { value: new THREE.Color('#cbd5e1') },
        },
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        fog: false,
      });
      geometriesToDispose.push(ringGeo);
      materialsToDispose.push(ringMat);
    }

    // Warm golden halo for Saturn/Jupiter, pale blue for Earth/Neptune — never harsh neon cyan on Saturn!
    const horizonHaloHex =
      stageCfg.horizonBodyId === 'saturn'
        ? '#fef3c7'
        : stageCfg.horizonBodyId === 'jupiter'
        ? '#fed7aa'
        : stageCfg.skyGlow;

    const haloMat = new THREE.ShaderMaterial({
      vertexShader: ATMOSPHERE_HALO_VERT,
      fragmentShader: ATMOSPHERE_HALO_FRAG,
      uniforms: {
        uGlowColor: { value: new THREE.Color(horizonHaloHex) },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.FrontSide,
      depthWrite: false,
      fog: false,
    });
    materialsToDispose.push(haloMat);

    // Physically blended particles: NormalBlending dusty puffs for Mars tornado, fine crisp embers for Venus volcano (U5)
    const pCount = archetypeSpec.particleCount;
    const pPositions = new Float32Array(pCount * 3);
    const pBase = new Float32Array(pCount * 3);
    const pSeeds = new Float32Array(pCount);
    const salt = ev.id.length * 19.7 + biomeIdx * 43.1;

    for (let i = 0; i < pCount; i++) {
      const r1 = seededRand(salt + i * 13.7);
      const r2 = seededRand(salt + i * 29.3);
      const r3 = seededRand(salt + i * 47.9);
      pSeeds[i] = r3;

      let x = 0;
      let y = 0;
      let z = -36;
      if (kind === 'volcanic_eruption') {
        const ang = r1 * Math.PI * 2;
        const spread = 1.0 + r2 * 14.0;
        x = 2 + Math.cos(ang) * spread * 0.45;
        y = 12 + r2 * 34;
        z = -50 + Math.sin(ang) * spread * 0.45;
      } else if (kind === 'cryo_geysers') {
        const jetIdx = i % 5;
        const jetX = [-32, -16, 0, 17, 34][jetIdx];
        const jetZ = [-46, -34, -40, -32, -50][jetIdx];
        x = jetX + (r1 - 0.5) * (1.8 + r2 * 9.5);
        y = 1 + r2 * 50;
        z = jetZ + (r3 - 0.5) * (1.8 + r2 * 8.0);
      } else if (kind === 'dust_tornado') {
        const ang = r1 * Math.PI * 2;
        const h = r2 * 46;
        const rad = 2.4 + (h / 46) * 16.5;
        x = 2 + Math.cos(ang) * rad + Math.sin(h * 0.14) * 2.8;
        y = h;
        z = -36 + Math.sin(ang) * rad;
      } else if (kind === 'diamond_rain' || kind === 'ring_rain') {
        x = (r1 - 0.5) * 124;
        y = r2 * 64;
        z = -14 - r3 * 78;
      } else if (kind === 'plasma_wind') {
        x = (r1 - 0.5) * 150;
        y = 2 + r2 * 44;
        z = -10 - r3 * 78;
      } else if (kind === 'aurora_curtains') {
        x = (r1 - 0.5) * 130;
        y = 22 + r2 * 40;
        z = -40 - r3 * 60;
      } else {
        x = (r1 - 0.5) * 100;
        y = 4 + r2 * 36;
        z = -18 - r3 * 68;
      }
      pPositions[i * 3] = x;
      pPositions[i * 3 + 1] = y;
      pPositions[i * 3 + 2] = z;
      pBase[i * 3] = x;
      pBase[i * 3 + 1] = y;
      pBase[i * 3 + 2] = z;
    }

    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
    const particleMat = new THREE.PointsMaterial({
      map: softParticleMap,
      size:
        kind === 'dust_tornado'
          ? 5.8
          : kind === 'volcanic_eruption'
          ? 0.88
          : kind === 'diamond_rain'
          ? 0.72
          : kind === 'aurora_curtains'
          ? 0.55
          : kind === 'lightning_curtain'
          ? 0.65
          : kind === 'cryo_geysers'
          ? 1.35
          : 1.45,
      color: isTornado ? new THREE.Color('#c2592b') : primaryCol,
      transparent: true,
      opacity:
        kind === 'dust_tornado'
          ? 0.16
          : kind === 'aurora_curtains' || kind === 'lightning_curtain'
          ? 0.22
          : 0.68,
      depthWrite: false,
      blending: isTornado ? THREE.NormalBlending : THREE.AdditiveBlending,
    });
    geometriesToDispose.push(particleGeo);
    materialsToDispose.push(particleMat);

    // Archetype-specific bespoke geometries & materials
    let auroraGeos: THREE.BufferGeometry[] = [];
    let auroraMat: THREE.ShaderMaterial | null = null;
    if (kind === 'aurora_curtains') {
      auroraGeos = [
        buildSkyAuroraRibbonGeometry(210, 48, 18, -34, 24, 0.5),
        buildSkyAuroraRibbonGeometry(255, 58, 22, -68, 32, 2.3),
        buildSkyAuroraRibbonGeometry(300, 68, 26, -108, 38, 4.4),
      ];
      auroraMat = new THREE.ShaderMaterial({
        vertexShader: auroraCurtainVert,
        fragmentShader: planetaryAuroraFrag,
        uniforms: {
          uTime: { value: 0 },
          uIntensity: { value: 0.78 },
          uOpacity: { value: 0.56 },
          uPrimaryColor: { value: primaryCol.clone() },
          uSecondaryColor: { value: secondaryCol.clone() },
        },
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        fog: false,
      });
      geometriesToDispose.push(...auroraGeos);
      materialsToDispose.push(auroraMat);
    }

    // Thick Volumetric Electric-Cyan Lightning Ribbons (R2-1) — HDR electric cyan + Bloom illumination
    let lightningGeo: THREE.BufferGeometry | null = null;
    let lightningMat: THREE.ShaderMaterial | null = null;
    if (kind === 'lightning_curtain') {
      lightningGeo = buildVolumetricLightningGeometry(salt);
      const boltHaloHex = ev.bodyId === 'venus' ? '#fbbf24' : '#0ea5e9';
      const boltCoreHex = ev.bodyId === 'venus' ? '#fffbeb' : '#bae6fd';
      lightningMat = new THREE.ShaderMaterial({
        vertexShader: LIGHTNING_RIBBON_VERT,
        fragmentShader: LIGHTNING_RIBBON_FRAG,
        uniforms: {
          uTime: { value: 0 },
          uIntensity: { value: 1.0 },
          uBurst: { value: 1.0 },
          uReducedMotion: { value: 0.0 },
          uCoreColor: { value: new THREE.Color(boltCoreHex) },
          uHaloColor: { value: new THREE.Color(boltHaloHex) },
        },
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      });
      geometriesToDispose.push(lightningGeo);
      materialsToDispose.push(lightningMat);
    }

    // GPU-Animated Prismatic Diamond Rain / Ring Rain / Plasma Wind Quads (U4)
    let animatedStreakGeo: THREE.BufferGeometry | null = null;
    let animatedStreakMat: THREE.ShaderMaterial | null = null;
    if (kind === 'diamond_rain' || kind === 'ring_rain' || kind === 'plasma_wind') {
      animatedStreakGeo = buildAnimatedStreakQuadsGeometry(220, salt + 9.3);
      animatedStreakMat = new THREE.ShaderMaterial({
        vertexShader: ANIMATED_STREAK_VERT,
        fragmentShader: ANIMATED_STREAK_FRAG,
        uniforms: {
          uTime: { value: 0 },
          uMode: { value: kind === 'plasma_wind' ? 1.0 : 0.0 },
          uBurst: { value: 1.0 },
          uReducedMotion: { value: 0.0 },
          uIntensity: { value: 1.0 },
          uPrimaryColor: { value: primaryCol.clone() },
          uSecondaryColor: { value: secondaryCol.clone() },
        },
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      });
      geometriesToDispose.push(animatedStreakGeo);
      materialsToDispose.push(animatedStreakMat);
    }

    // Impact bolide entry streak
    let bolideTrailGeo: THREE.BufferGeometry | null = null;
    let bolideTrailMat: THREE.LineBasicMaterial | null = null;
    if (kind === 'impact_bolide') {
      bolideTrailGeo = buildBolideTrailGeometry(salt + 17.3);
      bolideTrailMat = new THREE.LineBasicMaterial({
        color: '#fef08a',
        transparent: true,
        opacity: 0.92,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      geometriesToDispose.push(bolideTrailGeo);
      materialsToDispose.push(bolideTrailMat);
    }

    let solarArchGeos: THREE.BufferGeometry[] = [];
    if (kind === 'solar_arches') {
      solarArchGeos = buildSolarArchGeometries();
      geometriesToDispose.push(...solarArchGeos);
    }

    return {
      skyGeo,
      skyMat,
      terrainGeo,
      terrainMat,
      rangerHullGeo,
      sunGlowMat,
      columnMat,
      volcanoPeakGeo,
      volcanoPeakMat,
      stormCeilingMat,
      ringGeo,
      ringMat,
      haloMat,
      particleGeo,
      particleMat,
      pBase,
      pSeeds,
      auroraGeos,
      auroraMat,
      lightningGeo,
      lightningMat,
      animatedStreakGeo,
      animatedStreakMat,
      bolideTrailGeo,
      bolideTrailMat,
      solarArchGeos,
      geometriesToDispose,
      materialsToDispose,
    };
  }, [ev, archetypeSpec, stageCfg, softParticleMap]);

  useEffect(() => {
    terrainMatRef.current = gpu?.terrainMat ?? null;
    skyMatRef.current = gpu?.skyMat ?? null;
    auroraMatRef.current = gpu?.auroraMat ?? null;
    lightningMatRef.current = gpu?.lightningMat ?? null;
    animatedStreakMatRef.current = gpu?.animatedStreakMat ?? null;
    stormCeilingMatRef.current = gpu?.stormCeilingMat ?? null;
    columnMatRef.current = gpu?.columnMat ?? null;
    volcanoPeakMatRef.current = gpu?.volcanoPeakMat ?? null;
  }, [gpu]);

  // Deterministic GPU cleanup — disposes ONLY locally created geometries & materials for this `gpu` batch
  // (never traverses live scene graph during event switches, and never disposes AssetManager shared assets; F3 fix)
  useEffect(() => {
    if (!gpu) return;
    const { geometriesToDispose, materialsToDispose } = gpu;
    return () => {
      for (const g of geometriesToDispose) {
        g.dispose();
      }
      for (const m of materialsToDispose) {
        m.dispose();
      }
    };
  }, [gpu]);

  useFrame((_, delta) => {
    if (!ev || !gpu || !archetypeSpec) return;

    const store = useAppStore.getState();
    const safeDt = Number.isFinite(delta) ? Math.min(delta, 0.05) : 0.016;
    const motionScale = store.reducedMotion ? 0.18 : 1.0;
    simTimeRef.current += safeDt * motionScale;
    const t = simTimeRef.current;

    // Match useAppStore.triggerPlanetaryEventBurst() monotonic performance.now() timebase (F1 fix)
    const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const burstMult = evaluateEventBurstMultiplier(store.planetaryEventBurst, ev.id, nowMs);
    const effIntensity = store.planetaryEventIntensity;

    if (terrainMatRef.current) {
      terrainMatRef.current.uniforms.uTime.value = t;
      terrainMatRef.current.uniforms.uIntensity.value = effIntensity;
      terrainMatRef.current.uniforms.uBurst.value = burstMult;
      terrainMatRef.current.uniforms.uReducedMotion.value = store.reducedMotion ? 1.0 : 0.0;
    }

    if (skyMatRef.current) {
      skyMatRef.current.uniforms.uTime.value = t;
      skyMatRef.current.uniforms.uIntensity.value = effIntensity;
      skyMatRef.current.uniforms.uBurst.value = burstMult;
    }

    if (columnMatRef.current) {
      columnMatRef.current.uniforms.uTime.value = t;
      columnMatRef.current.uniforms.uIntensity.value = effIntensity;
      columnMatRef.current.uniforms.uBurst.value = burstMult;
    }

    if (volcanoPeakMatRef.current) {
      volcanoPeakMatRef.current.uniforms.uTime.value = t;
      volcanoPeakMatRef.current.uniforms.uBurst.value = burstMult;
    }

    if (auroraMatRef.current) {
      auroraMatRef.current.uniforms.uTime.value = t * 1.15;
      auroraMatRef.current.uniforms.uIntensity.value = Math.min(1.05, 0.56 + effIntensity * 0.24 * burstMult);
      auroraMatRef.current.uniforms.uOpacity.value = Math.min(0.66, 0.50 * Math.min(effIntensity, 1.3));
    }

    if (lightningMatRef.current) {
      lightningMatRef.current.uniforms.uTime.value = t;
      lightningMatRef.current.uniforms.uIntensity.value = effIntensity;
      lightningMatRef.current.uniforms.uBurst.value = burstMult;
      lightningMatRef.current.uniforms.uReducedMotion.value = store.reducedMotion ? 1.0 : 0.0;
    }

    if (animatedStreakMatRef.current) {
      animatedStreakMatRef.current.uniforms.uTime.value = t;
      animatedStreakMatRef.current.uniforms.uIntensity.value = effIntensity;
      animatedStreakMatRef.current.uniforms.uBurst.value = burstMult;
      animatedStreakMatRef.current.uniforms.uReducedMotion.value = store.reducedMotion ? 1.0 : 0.0;
    }

    if (stormCeilingMatRef.current) {
      stormCeilingMatRef.current.uniforms.uTime.value = t;
      const flashPower = store.reducedMotion
        ? 0.45
        : Math.min(1.0, 0.28 + Math.pow(Math.max(0, Math.sin(t * 7.6)), 2) * 0.72 * burstMult);
      stormCeilingMatRef.current.uniforms.uFlash.value = flashPower;
    }

    // Damped burst tremor on root stage group (strictly 0 when reducedMotion is enabled)
    if (rootRef.current) {
      if (!store.reducedMotion && burstMult > 1.02) {
        const shakeAmp = (burstMult - 1.0) * archetypeSpec.cameraShakeScale;
        rootRef.current.position.set(
          Math.sin(t * 42.0) * shakeAmp,
          -3.5 + Math.cos(t * 53.0) * shakeAmp * 0.7,
          0
        );
      } else {
        rootRef.current.position.set(0, -3.5, 0);
      }
    }

    // Hovering Endurance "Ranger" framed cleanly in heroic 3/4 yaw (0.44 rad) above the bottom HUD dock (U3)
    if (rangerRef.current) {
      const isAurora = ev.surfaceBiome === 'polar_aurora_sky';
      const bobAmp = store.reducedMotion ? 0.05 : 0.28 * (1 + (burstMult - 1) * 0.4);
      const baseY = isAurora ? 5.6 : 3.25;
      const baseZ = isAurora ? 1.4 : 2.0;
      rangerRef.current.position.set(
        -1.35 + Math.sin(t * 0.75) * bobAmp * 0.55,
        baseY + Math.sin(t * 1.55) * bobAmp,
        baseZ
      );
      rangerRef.current.rotation.set(
        Math.sin(t * 1.2) * (store.reducedMotion ? 0.01 : 0.042),
        0.44 + Math.cos(t * 0.65) * (store.reducedMotion ? 0.01 : 0.038),
        Math.cos(t * 1.4) * (store.reducedMotion ? 0.015 : 0.058)
      );
    }

    // Rotate vortex / tornado / hexagon spectacles cleanly
    if (vortexRingsRef.current) {
      vortexRingsRef.current.rotation.y += safeDt * (store.reducedMotion ? 0.12 : 0.85 * burstMult);
    }

    // Expanding impact shockwaves & cycling meteor bolide head
    if (archetypeSpec.layerKind === 'impact_bolide') {
      const cycle = (t * (0.42 * (burstMult > 1.05 ? 1.7 : 1.0))) % 1.0;
      if (bolideHeadRef.current) {
        const approach = Math.min(1.0, cycle * 2.2);
        bolideHeadRef.current.position.set(
          THREE.MathUtils.lerp(-38, 2, approach),
          THREE.MathUtils.lerp(46, 1.8, approach),
          THREE.MathUtils.lerp(-62, -42, approach)
        );
        const s = approach < 0.92 ? 1.8 : 4.2 * (1.0 - (approach - 0.92) / 0.08);
        bolideHeadRef.current.scale.setScalar(Math.max(0.4, s));
      }
      if (shockRing1Ref.current) {
        const rScale = 1.0 + cycle * 26.0;
        shockRing1Ref.current.scale.set(rScale, rScale, 1);
        const mat = shockRing1Ref.current.material as THREE.MeshBasicMaterial;
        mat.opacity = Math.max(0, (1.0 - cycle) * 0.85);
      }
      if (shockRing2Ref.current) {
        const c2 = (cycle + 0.45) % 1.0;
        const rScale2 = 1.0 + c2 * 24.0;
        shockRing2Ref.current.scale.set(rScale2, rScale2, 1);
        const mat2 = shockRing2Ref.current.material as THREE.MeshBasicMaterial;
        mat2.opacity = Math.max(0, (1.0 - c2) * 0.65);
      }
    }

    // Animate foreground/midground particles in-place (zero Vector3 allocations!)
    if (particleRef.current) {
      const posAttr = particleRef.current.geometry.attributes.position as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      const base = gpu.pBase;
      const seeds = gpu.pSeeds;
      const count = seeds.length;
      const kind = archetypeSpec.layerKind;

      for (let i = 0; i < count; i++) {
        const ix = i * 3;
        const seed = seeds[i];
        if (
          kind === 'volcanic_eruption' ||
          kind === 'cryo_geysers' ||
          kind === 'thermal_rifts' ||
          kind === 'solar_arches'
        ) {
          const speed = kind === 'cryo_geysers' ? 16.0 : 12.0;
          const maxH = kind === 'cryo_geysers' ? 54.0 : 42.0;
          const phase = (t * speed * (0.65 + seed * 0.7) * burstMult + base[ix + 1]) % maxH;
          const fan = 1.0 + (phase / maxH) * 1.45;
          arr[ix] = base[ix] + Math.sin(t * 1.4 + seed * 12.0) * 1.5 * fan;
          arr[ix + 1] = (kind === 'volcanic_eruption' ? 12.0 : 1.0) + phase;
          arr[ix + 2] = base[ix + 2] + Math.cos(t * 1.2 + seed * 9.0) * 1.3 * fan;
        } else if (kind === 'diamond_rain' || kind === 'ring_rain') {
          const fall = (((base[ix + 1] - t * 22.0 * (0.7 + seed * 0.6) * burstMult) % 64.0) + 64.0) % 64.0;
          arr[ix] = base[ix] + Math.sin(t * 2.2 + seed * 15.0) * 0.8;
          arr[ix + 1] = fall;
          arr[ix + 2] = base[ix + 2];
        } else if (kind === 'dust_tornado' || kind === 'cyclone_eyewall' || kind === 'hexagon_jet') {
          const ang = t * (1.8 + seed * 1.6) * burstMult + seed * Math.PI * 2;
          const h = (base[ix + 1] + t * 5.0 * burstMult) % 46.0;
          const rad = kind === 'dust_tornado' ? 2.6 + (h / 46.0) * 16.5 : 14.0 + seed * 28.0;
          arr[ix] = 2.0 + Math.cos(ang) * rad;
          arr[ix + 1] = h;
          arr[ix + 2] = (kind === 'dust_tornado' ? -36.0 : -46.0) + Math.sin(ang) * rad;
        } else if (kind === 'plasma_wind' || kind === 'cirrus_veil') {
          const drift =
            ((((base[ix] + t * 24.0 * (0.6 + seed * 0.8) * burstMult + 75.0) % 150.0) + 150.0) % 150.0) -
            75.0;
          arr[ix] = drift;
          arr[ix + 1] = base[ix + 1] + Math.sin(t * 1.6 + seed * 10.0) * 1.1;
          arr[ix + 2] = base[ix + 2];
        } else {
          arr[ix] = base[ix] + Math.sin(t * 1.2 + seed * 14.0) * 1.6;
          arr[ix + 1] = base[ix + 1] + Math.cos(t * 1.5 + seed * 11.0) * 1.2;
          arr[ix + 2] = base[ix + 2];
        }
      }
      posAttr.needsUpdate = true;
      const baseOp =
        kind === 'dust_tornado'
          ? 0.16
          : kind === 'aurora_curtains' || kind === 'lightning_curtain'
          ? 0.22
          : 0.65;
      gpu.particleMat.opacity = Math.min(0.88, baseOp * Math.min(effIntensity, 1.3) * Math.min(burstMult, 1.25));
    }
  });

  if (!ev || !gpu || !archetypeSpec) return null;

  const layerKind = archetypeSpec.layerKind;
  const isDarkWorld =
    ev.surfaceBiome === 'polar_aurora_sky' || ev.surfaceBiome === 'dust_impact_desert';

  return (
    <group ref={rootRef} position={[0, -3.5, 0]}>
      {/* Biome-Cohesive Directional + Hemisphere + Ambient Lighting (ZERO pointLight / spotLight!) */}
      <ambientLight intensity={isDarkWorld ? 0.30 : 0.42} color={stageCfg.skyHorizon} />
      <hemisphereLight args={[stageCfg.skyGlow, stageCfg.groundSecondary, isDarkWorld ? 0.45 : 0.68]} />
      <directionalLight position={[68, 56, -125]} intensity={isDarkWorld ? 1.45 : 2.10} color={stageCfg.skyGlow} />
      <directionalLight
        position={[-32, 22, 48]}
        intensity={isDarkWorld ? 0.22 : 0.36}
        color={stageCfg.skyHorizon}
      />

      {/* 1. 360-Degree Procedural Atmospheric Sky Dome */}
      <mesh geometry={gpu.skyGeo} material={gpu.skyMat} raycast={NOOP_RAYCAST} />

      {/* 2. Colossal Horizon Parent Planet / Planetary Ring Arch / Gated Atmospheric Sun Halo */}
      {stageCfg.horizonBodyId && horizonBodyTexture ? (
        <group position={[18, 46, -225]} rotation={[0.14, 0.35, -0.18]}>
          <mesh geometry={unitSphere} scale={stageCfg.horizonScale * 1.45} raycast={NOOP_RAYCAST}>
            <meshStandardMaterial
              map={horizonBodyTexture}
              roughness={0.86}
              metalness={0.04}
              fog={false}
            />
          </mesh>
          <mesh
            geometry={unitSphere}
            scale={stageCfg.horizonScale * 1.50}
            material={gpu.haloMat}
            raycast={NOOP_RAYCAST}
          />
          {gpu.ringGeo && gpu.ringMat && (
            <mesh
              geometry={gpu.ringGeo}
              material={gpu.ringMat}
              rotation={[Math.PI * 0.40, 0.08, -0.24]}
              raycast={NOOP_RAYCAST}
            />
          )}
        </group>
      ) : (
        <group position={[66, 36, -230]}>
          {showHorizonSun && (
            <mesh material={gpu.sunGlowMat} raycast={NOOP_RAYCAST}>
              <planeGeometry args={[stageCfg.horizonScale * 2.8, stageCfg.horizonScale * 2.8]} />
            </mesh>
          )}
          {gpu.ringGeo && gpu.ringMat && (
            <mesh
              geometry={gpu.ringGeo}
              material={gpu.ringMat}
              position={[0, 4, 40]}
              rotation={[Math.PI * 0.38, 0.14, -0.32]}
              scale={2.4}
              raycast={NOOP_RAYCAST}
            />
          )}
        </group>
      )}

      {/* 3. High-Density Anti-Aliased Displaced 5-Biome 3D Terrain / Cloud-Ocean Plane */}
      <mesh geometry={gpu.terrainGeo} material={gpu.terrainMat} raycast={NOOP_RAYCAST} />

      {/* 4. Bespoke Volumetric Close-Up 3D Event Spectacle Layer (Covers All 14 Archetypes) */}
      <group>
        {/* 4a. Volcanic Eruption: Sculpted Basalt Caldera + Organic Lava Channels + Dense Pyroclastic Ash Plume */}
        {layerKind === 'volcanic_eruption' && gpu.volcanoPeakGeo && gpu.volcanoPeakMat && (
          <group position={[2, 0, -50]}>
            <mesh
              geometry={gpu.volcanoPeakGeo}
              material={gpu.volcanoPeakMat}
              position={[0, 6.2, 0]}
              raycast={NOOP_RAYCAST}
            />
            <mesh position={[0, 14.3, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={NOOP_RAYCAST}>
              <circleGeometry args={[4.2, 32]} />
              <meshBasicMaterial
                map={softParticleMap}
                color={ev.primaryColor}
                transparent
                opacity={0.95}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
              />
            </mesh>
            <mesh position={[0, 31, 0]} material={gpu.columnMat} raycast={NOOP_RAYCAST}>
              <cylinderGeometry args={[21.0, 3.8, 38, 36, 14, true]} />
            </mesh>
          </group>
        )}

        {/* 4b. Cryo Geysers: 5 Soft Misty Volumetric Supersonic Ice Plumes Rising From Terrain Tiger Stripes */}
        {layerKind === 'cryo_geysers' && (
          <group>
            {[-32, -16, 0, 17, 34].map((gx, idx) => {
              const gz = [-46, -34, -40, -32, -50][idx];
              const h = [42, 50, 56, 46, 40][idx];
              return (
                <mesh
                  key={`geyser-col-${gx}`}
                  position={[gx, h * 0.5 - 1.5, gz]}
                  material={gpu.columnMat}
                  raycast={NOOP_RAYCAST}
                >
                  <cylinderGeometry args={[9.5, 1.4, h, 28, 10, true]} />
                </mesh>
              );
            })}
          </group>
        )}

        {/* 4c. Lightning Curtain: Low Brooding Thundercloud Deck + Volumetric Branching Superbolt Ribbons */}
        {layerKind === 'lightning_curtain' && (
          <group>
            {gpu.stormCeilingMat && (
              <mesh
                position={[0, 31, -44]}
                rotation={[Math.PI * 0.44, 0, 0]}
                material={gpu.stormCeilingMat}
                raycast={NOOP_RAYCAST}
              >
                <planeGeometry args={[230, 140]} />
              </mesh>
            )}
            {gpu.lightningGeo && gpu.lightningMat && (
              <mesh
                geometry={gpu.lightningGeo}
                material={gpu.lightningMat}
                raycast={NOOP_RAYCAST}
              />
            )}
          </group>
        )}

        {/* 4d. Dust Tornado: Dual-Shell Opaque Lit Gritty Sand Vortex Funnel (NormalBlending!) */}
        {layerKind === 'dust_tornado' && (
          <group position={[2, 0, -36]}>
            <mesh position={[0, 23, 0]} material={gpu.columnMat} raycast={NOOP_RAYCAST}>
              <cylinderGeometry args={[21.5, 2.5, 48, 36, 16, true]} />
            </mesh>
            <group ref={vortexRingsRef}>
              <mesh position={[0, 21, 0]} material={gpu.columnMat} raycast={NOOP_RAYCAST}>
                <cylinderGeometry args={[12.5, 1.6, 44, 28, 12, true]} />
              </mesh>
            </group>
          </group>
        )}

        {/* 4e. Cyclone Eyewall: Monumental Volumetric Rotating Storm Amphitheater */}
        {layerKind === 'cyclone_eyewall' && (
          <group position={[0, 4, -48]}>
            <group ref={vortexRingsRef}>
              <mesh position={[0, 18, 0]} material={gpu.columnMat} raycast={NOOP_RAYCAST}>
                <cylinderGeometry args={[36, 16, 38, 40, 12, true]} />
              </mesh>
            </group>
          </group>
        )}

        {/* 4f. Saturn Polar Hexagon: Towering 6-Fold Cassini Rossby Wave Cloud Wall */}
        {layerKind === 'hexagon_jet' && (
          <group position={[0, 16, -54]} rotation={[0.38, 0, 0]}>
            <group ref={vortexRingsRef}>
              {[24, 34, 44].map((rad, i) => (
                <mesh
                  key={`hex-wall-${rad}`}
                  position={[0, i * 4.5, 0]}
                  material={gpu.columnMat}
                  raycast={NOOP_RAYCAST}
                >
                  <cylinderGeometry args={[rad, rad * 0.94, 16, 6, 4, true]} />
                </mesh>
              ))}
            </group>
          </group>
        )}

        {/* 4g. Full-Sky 3D Auroral Curtains (Reusing auroraCurtain.vert.glsl + planetaryAurora.frag.glsl) */}
        {layerKind === 'aurora_curtains' && gpu.auroraMat && (
          <group>
            {gpu.auroraGeos.map((geo, i) => (
              <mesh
                key={`sky-aurora-${i}`}
                geometry={geo}
                material={gpu.auroraMat!}
                raycast={NOOP_RAYCAST}
              />
            ))}
          </group>
        )}

        {/* 4h. GPU-Animated Falling Prismatic Diamond Rain / Ring Rain / Plasma Wind Quads (U4) */}
        {(layerKind === 'diamond_rain' ||
          layerKind === 'ring_rain' ||
          layerKind === 'plasma_wind') &&
          gpu.animatedStreakGeo &&
          gpu.animatedStreakMat && (
            <mesh
              geometry={gpu.animatedStreakGeo}
              material={gpu.animatedStreakMat}
              raycast={NOOP_RAYCAST}
            />
          )}

        {/* 4i. Hypervelocity Impact Bolide + Glowing Crater + Expanding Shockwaves */}
        {layerKind === 'impact_bolide' && (
          <group>
            {gpu.bolideTrailGeo && gpu.bolideTrailMat && (
              <lineSegments
                geometry={gpu.bolideTrailGeo}
                material={gpu.bolideTrailMat}
                raycast={NOOP_RAYCAST}
              />
            )}
            <mesh ref={bolideHeadRef} position={[-12, 18, -50]} raycast={NOOP_RAYCAST}>
              <sphereGeometry args={[1.6, 20, 16]} />
              <meshBasicMaterial
                color="#fffbeb"
                transparent
                opacity={0.96}
                blending={THREE.AdditiveBlending}
              />
            </mesh>
            <mesh position={[2, 0.35, -42]} rotation={[-Math.PI / 2, 0, 0]} raycast={NOOP_RAYCAST}>
              <circleGeometry args={[7.5, 32]} />
              <meshBasicMaterial
                color={ev.secondaryColor}
                transparent
                opacity={0.78}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
              />
            </mesh>
            <mesh
              ref={shockRing1Ref}
              position={[2, 0.6, -42]}
              rotation={[-Math.PI / 2, 0, 0]}
              raycast={NOOP_RAYCAST}
            >
              <ringGeometry args={[0.82, 1.0, 48]} />
              <meshBasicMaterial
                color={ev.primaryColor}
                transparent
                opacity={0.78}
                side={THREE.DoubleSide}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
              />
            </mesh>
            <mesh
              ref={shockRing2Ref}
              position={[2, 0.8, -42]}
              rotation={[-Math.PI / 2, 0, 0]}
              raycast={NOOP_RAYCAST}
            >
              <ringGeometry args={[0.86, 1.0, 48]} />
              <meshBasicMaterial
                color={ev.secondaryColor}
                transparent
                opacity={0.58}
                side={THREE.DoubleSide}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
              />
            </mesh>
          </group>
        )}

        {/* 4j. Glowing Tectonic / Lava / Tidal Thermal Rifts */}
        {layerKind === 'thermal_rifts' && (
          <group>
            {[
              { x: -8, z: -26, rotY: 0.28, len: 52 },
              { x: 12, z: -38, rotY: -0.35, len: 64 },
              { x: -18, z: -48, rotY: 0.62, len: 46 },
              { x: 2, z: -34, rotY: -0.08, len: 58 },
            ].map((r, i) => (
              <mesh
                key={`rift-${i}`}
                position={[r.x, 0.45, r.z]}
                rotation={[-Math.PI / 2, 0, r.rotY]}
                raycast={NOOP_RAYCAST}
              >
                <planeGeometry args={[2.6, r.len]} />
                <meshBasicMaterial
                  map={softParticleMap}
                  color={i % 2 === 0 ? ev.primaryColor : ev.secondaryColor}
                  transparent
                  opacity={0.84}
                  depthWrite={false}
                  blending={THREE.AdditiveBlending}
                />
              </mesh>
            ))}
          </group>
        )}

        {/* 4k. High-Altitude Iridescent Cirrus / Methane Veil Ribbons */}
        {layerKind === 'cirrus_veil' && (
          <group>
            {[
              { y: 18, z: -34, w: 120, h: 9, rotZ: 0.08 },
              { y: 26, z: -52, w: 160, h: 12, rotZ: -0.06 },
              { y: 34, z: -72, w: 200, h: 15, rotZ: 0.04 },
              { y: 14, z: -26, w: 96, h: 7, rotZ: -0.05 },
            ].map((band, i) => (
              <mesh
                key={`cirrus-${i}`}
                position={[0, band.y, band.z]}
                rotation={[0.22, 0, band.rotZ]}
                raycast={NOOP_RAYCAST}
              >
                <planeGeometry args={[band.w, band.h]} />
                <meshBasicMaterial
                  map={softParticleMap}
                  color={i % 2 === 0 ? ev.primaryColor : ev.secondaryColor}
                  transparent
                  opacity={0.44}
                  side={THREE.DoubleSide}
                  depthWrite={false}
                  blending={THREE.AdditiveBlending}
                />
              </mesh>
            ))}
          </group>
        )}

        {/* 4l. Colossal Braided Solar Coronal Magnetic Flare Arches */}
        {layerKind === 'solar_arches' && (
          <group>
            {gpu.solarArchGeos.map((geo, i) => (
              <mesh key={`solar-arch-${i}`} geometry={geo} raycast={NOOP_RAYCAST}>
                <meshBasicMaterial
                  color={i % 2 === 0 ? ev.primaryColor : ev.secondaryColor}
                  transparent
                  opacity={0.86}
                  depthWrite={false}
                  blending={THREE.AdditiveBlending}
                />
              </mesh>
            ))}
          </group>
        )}

        {/* Shared Biome-Matched Active Spectacle Particles */}
        <points
          ref={particleRef}
          geometry={gpu.particleGeo}
          material={gpu.particleMat}
          raycast={NOOP_RAYCAST}
        />
      </group>

      {/* 5. Foreground Hovering Endurance "Ranger" Shuttlecraft (Exact MillersPlanetScene Craftsmanship, U3) */}
      <group ref={rangerRef} position={[-1.35, 3.25, 2.0]} rotation={[0, 0.44, 0]} scale={0.92}>
        {/* Primary Ceramic-White Lifting-Body Hull */}
        <mesh geometry={gpu.rangerHullGeo} raycast={NOOP_RAYCAST}>
          <meshStandardMaterial
            map={hullMap}
            bumpMap={aeroBumpMap}
            bumpScale={0.025}
            color="#dbe4ee"
            metalness={0.42}
            roughness={0.30}
          />
        </mesh>

        {/* Carbon-Silicon Thermal Underside Chine */}
        <mesh
          geometry={gpu.rangerHullGeo}
          position={[0, -0.05, -0.04]}
          scale={[1.028, 0.44, 1.018]}
          raycast={NOOP_RAYCAST}
        >
          <meshStandardMaterial
            color="#0b101b"
            bumpMap={aeroBumpMap}
            bumpScale={0.035}
            metalness={0.78}
            roughness={0.36}
          />
        </mesh>

        {/* Dorsal Black Thermal Spine & Twin Vertical Stabilizers */}
        <mesh position={[0, 0.72, 0.55]} rotation={[-0.08, 0, 0]} raycast={NOOP_RAYCAST}>
          <boxGeometry args={[0.58, 0.12, 3.2]} />
          <meshStandardMaterial color="#111827" metalness={0.8} roughness={0.32} />
        </mesh>
        {[-1.48, 1.48].map((vx) => (
          <mesh
            key={`ranger-fin-${vx}`}
            position={[vx, 0.48, 2.05]}
            rotation={[0, 0, vx > 0 ? -0.42 : 0.42]}
            raycast={NOOP_RAYCAST}
          >
            <boxGeometry args={[0.08, 0.65, 1.25]} />
            <meshStandardMaterial map={hullMap} color="#cbd5e1" metalness={0.5} roughness={0.30} />
          </mesh>
        ))}

        {/* Forward Recessed 3-Pane Armored Reflective Cockpit Windows (Matches MillersPlanetScene.tsx!) */}
        <group position={[0, 0.68, -0.95]} rotation={[-1.34, 0, 0]}>
          {[-0.34, 0, 0.34].map((wx, wi) => (
            <mesh
              key={`canopy-pane-${wi}`}
              position={[wx, 0, Math.abs(wx) * -0.08]}
              rotation={[0, wx * -0.25, 0]}
              raycast={NOOP_RAYCAST}
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

        {/* Recessed Aft Linear-Aerospike Shroud + Tapered Plasma Exhaust Cones (+Z) */}
        <mesh position={[0, 0.3, 2.92]} raycast={NOOP_RAYCAST}>
          <boxGeometry args={[2.25, 0.32, 0.18]} />
          <meshStandardMaterial color="#090d16" metalness={0.92} roughness={0.24} />
        </mesh>
        {[-0.64, 0.64].map((tx, ti) => (
          <group key={`aerospike-vent-${ti}`} position={[tx, 0.3, 3.0]}>
            <mesh rotation={[Math.PI / 2, 0, 0]} raycast={NOOP_RAYCAST}>
              <cylinderGeometry args={[0.16, 0.22, 0.16, 16, 1, true]} />
              <meshStandardMaterial
                color="#1e293b"
                metalness={0.9}
                roughness={0.22}
                side={THREE.DoubleSide}
              />
            </mesh>
            <mesh
              position={[0, 0, 0.24]}
              rotation={[Math.PI / 2, 0, 0]}
              scale={[1.8, 1, 0.7]}
              raycast={NOOP_RAYCAST}
            >
              <coneGeometry args={[0.14, 0.52, 16, 1, true]} />
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
    </group>
  );
};

export default PlanetaryEventSurfaceScene;
