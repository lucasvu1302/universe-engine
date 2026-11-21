import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AssetManager } from '@/engine/assets/AssetManager';
import { AudioManager } from '@/engine/audio/AudioManager';
import { CameraManager } from '@/engine/camera/CameraManager';
import { useAppStore } from '@/stores/useAppStore';
import { useI18nStore } from '@/i18n';
import { CONSTELLATION_SPECS, NamedStarSpec, raDecToCartesian } from '@/data/starCatalog';

const NOOP_RAYCAST: THREE.Object3D['raycast'] = () => {};

const CONSTELLATION_PAIRS: ReadonlyArray<readonly [[number, number], [number, number]]> =
  CONSTELLATION_SPECS.flatMap((c) => c.pairs);

function pairsToBuffer(
  pairs: ReadonlyArray<readonly [[number, number], [number, number]]>,
  radius: number
): Float32Array {
  const buffer = new Float32Array(pairs.length * 6);
  for (let i = 0; i < pairs.length; i++) {
    const [start, end] = pairs[i];
    const [x1, y1, z1] = raDecToCartesian(start[0], start[1], radius);
    const [x2, y2, z2] = raDecToCartesian(end[0], end[1], radius);
    const base = i * 6;
    buffer[base] = x1;
    buffer[base + 1] = y1;
    buffer[base + 2] = z1;
    buffer[base + 3] = x2;
    buffer[base + 4] = y2;
    buffer[base + 5] = z2;
  }
  return buffer;
}

export function buildConstellationPositions(radius = 6500): Float32Array {
  return pairsToBuffer(CONSTELLATION_PAIRS, radius);
}

/**
 * Builds anti-aliased spherical tangent ribbon quads for the focused constellation so lines
 * glow smoothly without WebGL's 1px gl.LINES hardware aliasing clamp.
 */
function buildConstellationRibbonGeometry(
  pairs: ReadonlyArray<readonly [[number, number], [number, number]]>,
  radius: number,
  halfWidth = 17.5
): THREE.BufferGeometry {
  const positions = new Float32Array(pairs.length * 4 * 3);
  const uvs = new Float32Array(pairs.length * 4 * 2);
  const indices: number[] = [];

  const p1 = new THREE.Vector3();
  const p2 = new THREE.Vector3();
  const mid = new THREE.Vector3();
  const seg = new THREE.Vector3();
  const side = new THREE.Vector3();

  for (let i = 0; i < pairs.length; i++) {
    const [a, b] = pairs[i];
    const [x1, y1, z1] = raDecToCartesian(a[0], a[1], radius);
    const [x2, y2, z2] = raDecToCartesian(b[0], b[1], radius);
    p1.set(x1, y1, z1);
    p2.set(x2, y2, z2);
    mid.addVectors(p1, p2).multiplyScalar(0.5).normalize();
    seg.subVectors(p2, p1).normalize();
    side.crossVectors(seg, mid).normalize().multiplyScalar(halfWidth);

    const vBase = i * 4;
    const posBase = vBase * 3;
    // v0: p1 - side
    positions[posBase] = p1.x - side.x;
    positions[posBase + 1] = p1.y - side.y;
    positions[posBase + 2] = p1.z - side.z;
    // v1: p1 + side
    positions[posBase + 3] = p1.x + side.x;
    positions[posBase + 4] = p1.y + side.y;
    positions[posBase + 5] = p1.z + side.z;
    // v2: p2 - side
    positions[posBase + 6] = p2.x - side.x;
    positions[posBase + 7] = p2.y - side.y;
    positions[posBase + 8] = p2.z - side.z;
    // v3: p2 + side
    positions[posBase + 9] = p2.x + side.x;
    positions[posBase + 10] = p2.y + side.y;
    positions[posBase + 11] = p2.z + side.z;

    const uvBase = vBase * 2;
    uvs[uvBase] = 0; uvs[uvBase + 1] = 0;
    uvs[uvBase + 2] = 0; uvs[uvBase + 3] = 1;
    uvs[uvBase + 4] = 1; uvs[uvBase + 5] = 0;
    uvs[uvBase + 6] = 1; uvs[uvBase + 7] = 1;

    indices.push(vBase, vBase + 2, vBase + 1, vBase + 1, vBase + 2, vBase + 3);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  return geo;
}

function buildColoredStarsGeometry(
  stars: ReadonlyArray<NamedStarSpec>,
  radius: number
): THREE.BufferGeometry {
  const positions = new Float32Array(stars.length * 3);
  const colors = new Float32Array(stars.length * 3);
  const tmpColor = new THREE.Color();

  for (let i = 0; i < stars.length; i++) {
    const [x, y, z] = raDecToCartesian(stars[i].ra, stars[i].dec, radius);
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    tmpColor.set(stars[i].color);
    colors[i * 3] = tmpColor.r;
    colors[i * 3 + 1] = tmpColor.g;
    colors[i * 3 + 2] = tmpColor.b;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geo;
}

function createDiffractionStarTexture(): THREE.Texture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const half = size / 2;
    ctx.clearRect(0, 0, size, size);

    // Compact stellar pinpoint + sub-saturation spectral corona (prevents Bloom whiteout on Betelgeuse/Rigel!)
    const halo = ctx.createRadialGradient(half, half, 0, half, half, half);
    halo.addColorStop(0.0, 'rgba(255, 255, 255, 0.98)');
    halo.addColorStop(0.07, 'rgba(255, 255, 255, 0.78)');
    halo.addColorStop(0.24, 'rgba(255, 255, 255, 0.42)');
    halo.addColorStop(0.56, 'rgba(255, 255, 255, 0.14)');
    halo.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, size, size);

    // Delicate 4-point telescopic Airy diffraction spikes
    ctx.save();
    ctx.translate(half, half);
    for (let rot = 0; rot < 2; rot++) {
      const spike = ctx.createLinearGradient(-half, 0, half, 0);
      spike.addColorStop(0.0, 'rgba(255, 255, 255, 0.0)');
      spike.addColorStop(0.36, 'rgba(255, 255, 255, 0.18)');
      spike.addColorStop(0.5, 'rgba(255, 255, 255, 0.82)');
      spike.addColorStop(0.64, 'rgba(255, 255, 255, 0.18)');
      spike.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');
      ctx.fillStyle = spike;
      ctx.fillRect(-half, -1.2, size, 2.4);
      ctx.rotate(Math.PI / 2);
    }
    ctx.restore();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createConstellationBadgeTexture(text: string): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(6, 12, 26, 0.86)';
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.56)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(16, 14, canvas.width - 32, canvas.height - 28, 34);
    ctx.fill();
    ctx.stroke();

    ctx.font = '700 26px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillStyle = '#fef3c7';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 1);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createStarCalloutTexture(text: string, accent: string): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 352;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(4, 9, 20, 0.78)';
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.roundRect(10, 10, canvas.width - 20, canvas.height - 20, 22);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(30, canvas.height / 2, 4.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = '600 20px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillStyle = '#f8fafc';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 44, canvas.height / 2 + 1);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const RIBBON_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const RIBBON_FRAG = /* glsl */ `
  varying vec2 vUv;
  void main() {
    float crossDist = abs(vUv.y - 0.5) * 2.0;
    float core = exp(-crossDist * crossDist * 7.5);
    float endFade = smoothstep(0.0, 0.06, vUv.x) * (1.0 - smoothstep(0.94, 1.0, vUv.x));
    vec3 col = mix(vec3(0.96, 0.62, 0.08), vec3(1.0, 0.94, 0.68), core);
    float alpha = core * endFade * 0.68;
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(col, alpha);
  }
`;

const HABITABLE_VERT = /* glsl */ `
  varying vec2 vLocalXY;
  void main() {
    vLocalXY = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const HABITABLE_FRAG = /* glsl */ `
  uniform float uZoneOpacity;
  varying vec2 vLocalXY;
  void main() {
    float r = length(vLocalXY);
    float theta = atan(-vLocalXY.y, vLocalXY.x);
    float ellipseFactor = (1.0 - 0.0016) / (1.0 + 0.04 * cos(theta));
    float innerFade = smoothstep(60.5 * ellipseFactor, 66.5 * ellipseFactor, r);
    float outerFade = 1.0 - smoothstep(87.0 * ellipseFactor, 96.5 * ellipseFactor, r);
    float band = innerFade * outerFade;
    float earthOrbitR = 68.0 * ellipseFactor;
    float earthRing = exp(-pow((r - earthOrbitR) * 0.45, 2.0)) * 0.36;
    vec3 col = mix(vec3(0.06, 0.72, 0.51), vec3(0.14, 0.83, 0.93), clamp((r - 61.0) / 35.0, 0.0, 1.0));
    float alpha = (band * 0.13 + earthRing * 0.12) * uZoneOpacity;
    if (alpha < 0.004) discard;
    gl_FragColor = vec4(col, alpha);
  }
`;

export const CelestialOverlay: React.FC = () => {
  const showStarMap = useAppStore((state) => state.showStarMap);
  const targetId = useAppStore((state) => state.targetId);
  const hoveredId = useAppStore((state) => state.hoveredId);
  const setTargetId = useAppStore((state) => state.setTargetId);
  const setHoveredId = useAppStore((state) => state.setHoveredId);
  const language = useI18nStore((state) => state.language);

  const skyGroupRef = useRef<THREE.Group>(null);
  const lineMatRef = useRef<THREE.LineBasicMaterial>(null);
  const starMatRef = useRef<THREE.PointsMaterial>(null);
  const ringMeshRef = useRef<THREE.Mesh>(null);
  const ringMatRef = useRef<THREE.ShaderMaterial>(null);
  const hitMeshRefs = useRef<Array<THREE.Mesh | null>>([]);
  const badgeSpriteRefs = useRef<Array<THREE.Sprite | null>>([]);
  const nebulaSpriteRefs = useRef<Array<THREE.Sprite | null>>([]);

  const softParticleMap = useMemo(() => AssetManager.getInstance().getSoftParticleMap(), []);
  const diffractionStarMap = useMemo(() => createDiffractionStarTexture(), []);
  const habitableUniforms = useMemo(() => ({ uZoneOpacity: { value: 1.0 } }), []);

  const lineGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(buildConstellationPositions(6500), 3));
    return geo;
  }, []);

  const starGeometry = useMemo(() => {
    const allStars = CONSTELLATION_SPECS.flatMap((c) => c.featuredStars);
    return buildColoredStarsGeometry(allStars, 6490);
  }, []);

  const hitSphereGeo = useMemo(() => new THREE.SphereGeometry(650, 12, 10), []);
  const hitSphereMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false,
        colorWrite: false,
      }),
    []
  );

  const highlightGeos = useMemo(() => {
    const map = new Map<string, { ribbonGeo: THREE.BufferGeometry; starGeo: THREE.BufferGeometry }>();
    for (const spec of CONSTELLATION_SPECS) {
      const ribbonGeo = buildConstellationRibbonGeometry(spec.pairs, 6480, 17.5);
      const starGeo = buildColoredStarsGeometry(spec.featuredStars, 6465);
      map.set(spec.id, { ribbonGeo, starGeo });
    }
    return map;
  }, []);

  const highlightRibbonMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: RIBBON_VERT,
        fragmentShader: RIBBON_FRAG,
        transparent: true,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    []
  );

  const highlightStarMat = useMemo(
    () =>
      new THREE.PointsMaterial({
        map: diffractionStarMap,
        vertexColors: true,
        size: 380,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.94,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [diffractionStarMap]
  );

  const deepSkyNebulae = useMemo(
    () => [
      { pos: raDecToCartesian(5.59, -5.39, 6475), color: '#d946ef', scale: 520 }, // M42 Orion Nebula
      { pos: raDecToCartesian(3.79, 24.11, 6475), color: '#38bdf8', scale: 460 }, // M45 Pleiades Reflection Mist
    ],
    []
  );

  const badgeEntries = useMemo(() => {
    return CONSTELLATION_SPECS.map((spec) => {
      const label = language === 'vi' ? spec.labelVi : spec.labelEn;
      const tex = createConstellationBadgeTexture(label);
      const pos = raDecToCartesian(spec.raHours, spec.decDeg, 6420);
      const minDec = Math.min(...spec.featuredStars.map((s) => s.dec));
      const labelPos = raDecToCartesian(spec.raHours, Math.max(-84, minDec - 4.4), 6380);
      const callouts = spec.callouts.map((co) => ({
        key: `${co.ra}:${co.dec}`,
        pos: raDecToCartesian(co.ra + co.dRa, co.dec + co.dDec, 6395),
        tex: createStarCalloutTexture(language === 'vi' ? co.labelVi : co.labelEn, co.accent),
      }));
      return { spec, tex, pos, labelPos, callouts };
    });
  }, [language]);

  useEffect(() => {
    return () => {
      badgeEntries.forEach((b) => {
        b.tex.dispose();
        b.callouts.forEach((c) => c.tex.dispose());
      });
    };
  }, [badgeEntries]);

  useEffect(() => {
    const ring = ringMeshRef.current;
    const lMat = lineMatRef.current;
    const sMat = starMatRef.current;
    const sprites = badgeSpriteRefs.current;
    const nebSprites = nebulaSpriteRefs.current;
    return () => {
      diffractionStarMap.dispose();
      lineGeometry.dispose();
      starGeometry.dispose();
      hitSphereGeo.dispose();
      hitSphereMat.dispose();
      highlightRibbonMat.dispose();
      highlightStarMat.dispose();
      highlightGeos.forEach((entry) => {
        entry.ribbonGeo.dispose();
        entry.starGeo.dispose();
      });
      sprites.forEach((sp) => sp?.material?.dispose());
      nebSprites.forEach((sp) => sp?.material?.dispose());
      lMat?.dispose();
      sMat?.dispose();
      ring?.geometry?.dispose();
      (ring?.material as THREE.Material | undefined)?.dispose();
      if (typeof document !== 'undefined') {
        document.body.style.cursor = '';
      }
    };
  }, [
    diffractionStarMap,
    lineGeometry,
    starGeometry,
    hitSphereGeo,
    hitSphereMat,
    highlightRibbonMat,
    highlightStarMat,
    highlightGeos,
  ]);

  const activeConstellationId =
    (targetId && targetId.startsWith('constellation_') ? targetId : null) ||
    (hoveredId && hoveredId.startsWith('constellation_') ? hoveredId : null);
  const activeHighlight = activeConstellationId
    ? highlightGeos.get(activeConstellationId) ?? null
    : null;
  const activeBadgeEntry = activeConstellationId
    ? badgeEntries.find((b) => b.spec.id === activeConstellationId) ?? null
    : null;

  useFrame((state) => {
    if (!showStarMap) return;
    if (skyGroupRef.current) {
      skyGroupRef.current.position.copy(state.camera.position);
    }

    const isViewingConstellation = Boolean(targetId && targetId.startsWith('constellation_'));
    const targetDist = state.camera.position.distanceTo(CameraManager.getInstance().target);
    const skyLineFade = isViewingConstellation
      ? 1.0
      : THREE.MathUtils.smoothstep(targetDist, 34.0, 88.0);
    const wideSkyBadgeFade = isViewingConstellation
      ? 1.0
      : THREE.MathUtils.smoothstep(targetDist, 280.0, 460.0);

    const isMissionOpen = useAppStore.getState().missionPlannerOpen;
    const plannerDim = isMissionOpen ? 0.12 : 1.0;

    if (lineMatRef.current) {
      lineMatRef.current.opacity = (isViewingConstellation ? 0.14 : 0.26) * skyLineFade * plannerDim;
    }
    if (starMatRef.current) {
      // Dim background vertex stars when a specific constellation is focused or Hohmann Planner is open
      starMatRef.current.opacity =
        (isViewingConstellation ? 0.16 : 0.72) * (0.25 + 0.75 * skyLineFade) * (isMissionOpen ? 0.28 : 1.0);
    }

    const canRaycastSky = skyLineFade > 0.15;
    if (!canRaycastSky && hoveredId && hoveredId.startsWith('constellation_')) {
      setHoveredId(null);
      if (typeof document !== 'undefined') {
        document.body.style.cursor = '';
      }
    }

    for (let i = 0; i < hitMeshRefs.current.length; i++) {
      const hm = hitMeshRefs.current[i];
      if (hm) {
        hm.visible = canRaycastSky;
      }
    }

    for (let i = 0; i < nebulaSpriteRefs.current.length; i++) {
      const ns = nebulaSpriteRefs.current[i];
      if (!ns) continue;
      ns.material.opacity = (isViewingConstellation ? 0.36 : 0.16) * skyLineFade;
      ns.visible = skyLineFade > 0.05;
    }

    for (let i = 0; i < badgeSpriteRefs.current.length; i++) {
      const sp = badgeSpriteRefs.current[i];
      if (!sp) continue;
      const cid = CONSTELLATION_SPECS[i].id;
      const isHighlighted = cid === targetId || cid === hoveredId;
      const op = isHighlighted
        ? 0.98 * skyLineFade
        : isViewingConstellation
        ? 0.36 * skyLineFade
        : 0.38 * wideSkyBadgeFade;
      sp.material.opacity = op;
      sp.material.color.setHex(isHighlighted ? 0xffffff : 0xcbd5e1);
      sp.visible = op > 0.03;
    }

    if (ringMeshRef.current && ringMatRef.current) {
      const elevFade = THREE.MathUtils.smoothstep(Math.abs(state.camera.position.y), 6.0, 22.0);
      const focusFade = isViewingConstellation
        ? 0.0
        : THREE.MathUtils.smoothstep(targetDist, 24.0, 62.0);
      const opacity = elevFade * focusFade;
      ringMatRef.current.uniforms.uZoneOpacity.value = opacity;
      ringMeshRef.current.visible = opacity > 0.01;
    }
  });

  return (
    <group visible={showStarMap}>
      <group ref={skyGroupRef}>
        {/* 1. 360° Celestial Sphere Constellation Sky-Lines (1 single batched LineSegments draw call) */}
        <lineSegments geometry={lineGeometry} raycast={NOOP_RAYCAST}>
          <lineBasicMaterial
            ref={lineMatRef}
            color="#38bdf8"
            transparent
            opacity={0.28}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </lineSegments>

        {/* Subtle Deep-Sky Emission & Reflection Nebulae (M42 Orion Nebula & M45 Pleiades Mist) */}
        {deepSkyNebulae.map((neb, nIdx) => (
          <sprite
            key={`dso-neb-${nIdx}`}
            ref={(el) => {
              nebulaSpriteRefs.current[nIdx] = el;
            }}
            position={neb.pos}
            scale={[neb.scale, neb.scale * 0.76, 1]}
            raycast={NOOP_RAYCAST}
          >
            <spriteMaterial
              map={softParticleMap}
              color={neb.color}
              transparent
              opacity={0.22}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </sprite>
        ))}

        {/* Anti-Aliased Golden Astrolabe Ribbon, Vivid Spectral Stars & Named Star Callouts for Active Constellation */}
        {activeHighlight && (
          <>
            <mesh
              geometry={activeHighlight.ribbonGeo}
              material={highlightRibbonMat}
              raycast={NOOP_RAYCAST}
            />
            <points
              geometry={activeHighlight.starGeo}
              material={highlightStarMat}
              raycast={NOOP_RAYCAST}
            />
            {activeBadgeEntry?.callouts.map((co) => (
              <sprite
                key={co.key}
                position={co.pos}
                scale={[740, 134, 1]}
                raycast={NOOP_RAYCAST}
              >
                <spriteMaterial
                  map={co.tex}
                  transparent
                  opacity={0.92}
                  depthWrite={false}
                />
              </sprite>
            ))}
          </>
        )}

        {/* Spectral-Colored Constellation Anchor Stars (1 batched Points draw call, zero square pixels) */}
        <points geometry={starGeometry} raycast={NOOP_RAYCAST}>
          <pointsMaterial
            ref={starMatRef}
            map={diffractionStarMap}
            vertexColors
            size={210}
            sizeAttenuation
            transparent
            opacity={0.78}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </points>

        {/* Interactive 3D Constellation Star-Chart Badges & Clickable Celestial Hit-Zones */}
        {badgeEntries.map(({ spec, tex, pos, labelPos }, idx) => (
          <group key={spec.id}>
            <mesh
              ref={(el) => {
                hitMeshRefs.current[idx] = el;
              }}
              geometry={hitSphereGeo}
              material={hitSphereMat}
              position={pos}
              onClick={(e) => {
                if (!showStarMap) return;
                e.stopPropagation();
                AudioManager.getInstance().playUIClick();
                setTargetId(spec.id);
                CameraManager.getInstance().focusConstellation(spec.id);
              }}
              onPointerOver={(e) => {
                if (!showStarMap) return;
                e.stopPropagation();
                setHoveredId(spec.id);
                if (typeof document !== 'undefined') {
                  document.body.style.cursor = 'pointer';
                }
              }}
              onPointerOut={() => {
                setHoveredId(null);
                if (typeof document !== 'undefined') {
                  document.body.style.cursor = '';
                }
              }}
            />
            <sprite
              ref={(el) => {
                badgeSpriteRefs.current[idx] = el;
              }}
              position={labelPos}
              scale={[1140, 214, 1]}
              raycast={NOOP_RAYCAST}
            >
              <spriteMaterial
                map={tex}
                transparent
                opacity={0.68}
                depthWrite={false}
              />
            </sprite>
          </group>
        ))}
      </group>

      {/* 2. Goldilocks Habitable Zone Annulus (fades automatically during close planet/spacecraft/constellation views) */}
      <mesh
        ref={ringMeshRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.18, 0]}
        raycast={NOOP_RAYCAST}
      >
        <ringGeometry args={[58, 99, 96, 1]} />
        <shaderMaterial
          ref={ringMatRef}
          vertexShader={HABITABLE_VERT}
          fragmentShader={HABITABLE_FRAG}
          uniforms={habitableUniforms}
          transparent
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
};
