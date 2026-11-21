import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '@/stores/useAppStore';
import { BRIGHT_NAV_STARS, CONSTELLATION_SPECS } from '@/data/starCatalog';
import {
  altAzToDomeVector,
  computeHorizontalCoords,
} from '@/engine/ephemeris/PlanetariumPhysics';
import { AssetManager } from '@/engine/assets/AssetManager';
import { useI18nStore } from '@/i18n';

const DOME_RADIUS = 85;
const METEOR_COUNT = 24;
const BG_STAR_COUNT = 2600;
const CONSTELLATION_PAIR_COUNT = CONSTELLATION_SPECS.reduce((acc, c) => acc + c.pairs.length, 0);
const DEG_TO_RAD = Math.PI / 180;

// Continuous FBM Milky Way + Great Rift Dust Lane + Astronomical Twilight Sky Dome (ZERO giant snowballs! — U7)
const NIGHT_SKY_VERT = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const NIGHT_SKY_FRAG = /* glsl */ `
  precision highp float;
  uniform float uLatTiltRad;
  varying vec3 vDir;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * noise(p);
      p *= 2.08;
      a *= 0.49;
    }
    return v;
  }

  void main() {
    vec3 d = normalize(vDir);
    float elev = clamp(d.y, 0.0, 1.0);

    // Astronomical dark-sky twilight horizon indigo -> deep cosmic zenith
    vec3 horizonGlow = vec3(0.055, 0.125, 0.24);
    vec3 midSky = vec3(0.015, 0.032, 0.075);
    vec3 zenith = vec3(0.005, 0.008, 0.02);
    vec3 col = mix(horizonGlow, midSky, smoothstep(0.0, 0.24, elev));
    col = mix(col, zenith, smoothstep(0.22, 0.72, elev));

    // Rotate sky direction into inclined galactic plane arcing gracefully across the Northern night sky
    float c = cos(uLatTiltRad);
    float s = sin(uLatTiltRad);
    vec3 tilted = vec3(d.x, d.y * c - d.z * s, d.y * s + d.z * c);
    vec3 galDir = vec3(
      tilted.x * 0.78 + tilted.y * 0.62,
      -tilted.x * 0.62 + tilted.y * 0.78 - 0.14,
      tilted.z
    );

    float galLat = abs(galDir.y);
    float galLon = length(galDir.xz) > 1e-5 ? atan(galDir.z, galDir.x) : 0.0;
    vec2 gUv = vec2(galLon * 2.4, galDir.y * 6.2);

    float mwBand = exp(-(galLat * galLat) / 0.056);
    float cloud = fbm(gUv * 2.0 + vec2(1.4, 0.7));
    float dustRift = smoothstep(0.38, 0.72, fbm(gUv * 4.5 + vec2(3.1, -0.5))) * exp(-(galLat * galLat) / 0.009);
    float microStarMist = smoothstep(0.50, 0.86, fbm(gUv * 12.0));

    vec3 mwOuter = vec3(0.18, 0.34, 0.64);
    vec3 mwCore = vec3(0.84, 0.72, 0.56);
    vec3 mwCol = mix(mwOuter, mwCore, clamp(cloud * 0.70 + microStarMist * 0.40, 0.0, 1.0));

    float horizonMask = smoothstep(0.03, 0.20, elev);
    float mwIntensity = mwBand * (0.38 + 0.62 * cloud) * (1.0 - dustRift * 0.72) * horizonMask;
    col += mwCol * mwIntensity * 0.72;

    gl_FragColor = vec4(col, 1.0);
  }
`;

const ORION_M42_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const ORION_M42_FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  void main() {
    vec2 p = (vUv - 0.5) * 2.0;
    float r = length(p);
    float n = noise(vUv * 7.0) * 0.6 + noise(vUv * 15.0 + 2.1) * 0.4;
    float core = exp(-(r * r) * 5.2);
    float wings = exp(-(r * r) * 1.9) * smoothstep(0.25, 0.8, n);
    vec3 trapCore = vec3(0.65, 0.92, 1.0);
    vec3 hAlphaPink = vec3(0.95, 0.28, 0.62);
    vec3 dustViolet = vec3(0.32, 0.16, 0.55);
    vec3 col = mix(dustViolet, hAlphaPink, wings) + trapCore * core * 1.1;
    float alpha = clamp((wings * 0.72 + core * 0.92) * (1.0 - smoothstep(0.65, 0.98, r)), 0.0, 0.95);
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(col, alpha);
  }
`;

const TELESCOPE_RING_VERT = /* glsl */ `
  varying vec2 vLocalXY;
  void main() {
    vLocalXY = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const TELESCOPE_RING_FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vLocalXY;
  void main() {
    float r = length(vLocalXY);
    float t = clamp((r - 2.9) / 2.2, 0.0, 1.0);
    float cassini = 1.0 - smoothstep(0.56, 0.60, t) * (1.0 - smoothstep(0.66, 0.70, t));
    float bands = 0.65 + 0.35 * sin(t * 42.0);
    float edge = smoothstep(0.0, 0.06, t) * (1.0 - smoothstep(0.94, 1.0, t));
    vec3 col = mix(vec3(0.84, 0.66, 0.42), vec3(0.98, 0.90, 0.72), bands);
    float alpha = edge * cassini * bands * 0.85;
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(col, alpha);
  }
`;

/**
 * Refined minimalist astronomical compass tick & lightweight label (replaces clunky road-sign pill — U7!)
 */
function createCompassReticleTexture(label: string, accent: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 160;
  canvas.height = 72;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 160, 72);
    // Subtle translucent hairline vertical tick pointing down to horizon crest
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(80, 46);
    ctx.lineTo(80, 66);
    ctx.stroke();

    ctx.font = '600 21px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillStyle = accent;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 80, 26);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Zero-allocation Alt/Az -> tapered 3D meteor quad ribbon writer (INV1 / F5 + U7!)
 */
function writeMeteorQuadToBuffer(
  altHeadDeg: number,
  azHeadDeg: number,
  altTailDeg: number,
  azTailDeg: number,
  radius: number,
  halfWidth: number,
  posArr: Float32Array,
  vertOffset: number
): void {
  const altH = altHeadDeg * DEG_TO_RAD;
  const azH = azHeadDeg * DEG_TO_RAD;
  const cosAltH = Math.cos(altH);
  const hx = radius * cosAltH * Math.sin(azH);
  const hy = radius * Math.sin(altH);
  const hz = -radius * cosAltH * Math.cos(azH);

  const altT = altTailDeg * DEG_TO_RAD;
  const azT = azTailDeg * DEG_TO_RAD;
  const cosAltT = Math.cos(altT);
  const tx = radius * cosAltT * Math.sin(azT);
  const ty = radius * Math.sin(altT);
  const tz = -radius * cosAltT * Math.cos(azT);

  // Tangent along meteor motion & perpendicular side vector on tangent sphere (zero allocations!)
  const dx = hx - tx;
  const dy = hy - ty;
  const dz = hz - tz;
  // Cross(dir, radial_head)
  let px = dy * hz - dz * hy;
  let py = dz * hx - dx * hz;
  let pz = dx * hy - dy * hx;
  const pLen = Math.hypot(px, py, pz) || 1.0;
  px = (px / pLen) * halfWidth;
  py = (py / pLen) * halfWidth;
  pz = (pz / pLen) * halfWidth;

  // Tapered triangle ribbon: 2 triangles (6 vertices = 18 floats) — head widest, tail narrows to pinpoint
  const b = vertOffset * 3;
  // Tri 1: head-left, head-right, tail-center
  posArr[b] = hx - px;
  posArr[b + 1] = hy - py;
  posArr[b + 2] = hz - pz;
  posArr[b + 3] = hx + px;
  posArr[b + 4] = hy + py;
  posArr[b + 5] = hz + pz;
  posArr[b + 6] = tx;
  posArr[b + 7] = ty;
  posArr[b + 8] = tz;

  // Tri 2: bright head core diamond cap
  const tipX = hx + dx * 0.08;
  const tipY = hy + dy * 0.08;
  const tipZ = hz + dz * 0.08;
  posArr[b + 9] = hx - px;
  posArr[b + 10] = hy - py;
  posArr[b + 11] = hz - pz;
  posArr[b + 12] = tipX;
  posArr[b + 13] = tipY;
  posArr[b + 14] = tipZ;
  posArr[b + 15] = hx + px;
  posArr[b + 16] = hy + py;
  posArr[b + 17] = hz + pz;
}

export const PlanetariumScene: React.FC = () => {
  const latDeg = useAppStore((s) => s.planetariumLatDeg);
  const lonDeg = useAppStore((s) => s.planetariumLonDeg);
  const utcHours = useAppStore((s) => s.planetariumUtcHours);
  const meteorShower = useAppStore((s) => s.planetariumMeteorShower);
  const telescopeTarget = useAppStore((s) => s.planetariumTelescopeTarget);
  const language = useI18nStore((s) => s.language);

  const meteorGeoRef = useRef<THREE.BufferGeometry | null>(null);
  const telescopeGroupRef = useRef<THREE.Group>(null);
  const assets = useMemo(() => AssetManager.getInstance(), []);
  const softParticle = useMemo(() => assets.getSoftParticleMap(), [assets]);
  const saturnMap = useMemo(() => assets.loadTexture('saturn'), [assets]);
  const jupiterMap = useMemo(() => assets.loadTexture('jupiter'), [assets]);

  const obsDate = useMemo(() => {
    const h = Math.floor(utcHours);
    const m = Math.round((utcHours - h) * 60);
    return new Date(Date.UTC(2026, 10, 21, h, m, 0));
  }, [utcHours]);

  // Compute live Alt/Az starfield & 8 IAU constellation sky lines from shared starCatalog.ts
  const skyBuffers = useMemo(() => {
    const totalStars = BRIGHT_NAV_STARS.length + BG_STAR_COUNT;
    const starPositions = new Float32Array(totalStars * 3);
    const starColors = new Float32Array(totalStars * 3);
    const tmpCol = new THREE.Color();

    for (let i = 0; i < BRIGHT_NAV_STARS.length; i++) {
      const s = BRIGHT_NAV_STARS[i];
      const hz = computeHorizontalCoords(s.raHours, s.decDeg, latDeg, lonDeg, obsDate);
      const [x, y, z] = altAzToDomeVector(hz.altitudeDeg, hz.azimuthDeg, DOME_RADIUS - 3);
      starPositions[i * 3] = x;
      starPositions[i * 3 + 1] = y;
      starPositions[i * 3 + 2] = z;
      tmpCol.set(s.color);
      starColors[i * 3] = tmpCol.r;
      starColors[i * 3 + 1] = tmpCol.g;
      starColors[i * 3 + 2] = tmpCol.b;
    }

    for (let i = 0; i < BG_STAR_COUNT; i++) {
      const idx = BRIGHT_NAV_STARS.length + i;
      const ra = Math.abs((Math.sin(i * 19.31) * 43758.5453) % 1) * 24;
      const u = Math.abs((Math.sin(i * 73.17 + 1.4) * 24634.63) % 1);
      const dec = (Math.asin(2 * u - 1) * 180) / Math.PI;
      const hz = computeHorizontalCoords(ra, dec, latDeg, lonDeg, obsDate);
      const [x, y, z] = altAzToDomeVector(hz.altitudeDeg, hz.azimuthDeg, DOME_RADIUS - 1);
      starPositions[idx * 3] = x;
      starPositions[idx * 3 + 1] = y;
      starPositions[idx * 3 + 2] = z;
      const brightness = 0.45 + Math.abs((Math.sin(i * 51.7) * 12345.6) % 1) * 0.55;
      const tint = i % 4 === 0 ? '#bae6fd' : i % 4 === 1 ? '#fef3c7' : '#f1f5f9';
      tmpCol.set(tint).multiplyScalar(brightness);
      starColors[idx * 3] = tmpCol.r;
      starColors[idx * 3 + 1] = tmpCol.g;
      starColors[idx * 3 + 2] = tmpCol.b;
    }

    const pairList = CONSTELLATION_SPECS.flatMap((c) => c.pairs);
    const linePositions = new Float32Array(pairList.length * 6);
    for (let i = 0; i < pairList.length; i++) {
      const [a, b] = pairList[i];
      const ha = computeHorizontalCoords(a[0], a[1], latDeg, lonDeg, obsDate);
      const hb = computeHorizontalCoords(b[0], b[1], latDeg, lonDeg, obsDate);
      const [x1, y1, z1] = altAzToDomeVector(ha.altitudeDeg, ha.azimuthDeg, DOME_RADIUS - 2);
      const [x2, y2, z2] = altAzToDomeVector(hb.altitudeDeg, hb.azimuthDeg, DOME_RADIUS - 2);
      const base = i * 6;
      linePositions[base] = x1;
      linePositions[base + 1] = y1;
      linePositions[base + 2] = z1;
      linePositions[base + 3] = x2;
      linePositions[base + 4] = y2;
      linePositions[base + 5] = z2;
    }

    return { starPositions, starColors, linePositions };
  }, [latDeg, lonDeg, obsDate]);

  const gpu = useMemo(() => {
    const skyDomeGeo = new THREE.SphereGeometry(DOME_RADIUS + 4, 48, 32);
    const skyDomeMat = new THREE.ShaderMaterial({
      vertexShader: NIGHT_SKY_VERT,
      fragmentShader: NIGHT_SKY_FRAG,
      uniforms: { uLatTiltRad: { value: 0.4 } },
      side: THREE.BackSide,
      depthWrite: false,
    });

    const totalStarFloats = (BRIGHT_NAV_STARS.length + BG_STAR_COUNT) * 3;
    const starsGeo = new THREE.BufferGeometry();
    starsGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(totalStarFloats), 3));
    starsGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(totalStarFloats), 3));
    const starsMat = new THREE.PointsMaterial({
      map: softParticle,
      vertexColors: true,
      size: 0.92,
      transparent: true,
      opacity: 0.94,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const linesGeo = new THREE.BufferGeometry();
    linesGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(CONSTELLATION_PAIR_COUNT * 6), 3)
    );
    const linesMat = new THREE.LineBasicMaterial({
      color: '#38bdf8',
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    // Clean dual-layer alpine ridge silhouette (ZERO colliding gray horizon dashes!)
    const groundGeo = new THREE.CircleGeometry(DOME_RADIUS + 4, 72);
    groundGeo.rotateX(-Math.PI / 2);
    const groundMat = new THREE.MeshBasicMaterial({ color: '#020612' });

    const ridgeFarGeo = new THREE.CylinderGeometry(DOME_RADIUS - 3, DOME_RADIUS - 2, 14, 128, 1, true);
    const rFar = ridgeFarGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < rFar.count; i++) {
      if (rFar.getY(i) > 0) {
        const ang = Math.atan2(rFar.getZ(i), rFar.getX(i));
        const peak = 4.6 + Math.sin(ang * 4.0 + 0.5) * 2.4 + Math.cos(ang * 9.0) * 1.3 + Math.sin(ang * 19.0) * 0.6;
        rFar.setY(i, peak);
      } else {
        rFar.setY(i, -4.5);
      }
    }
    ridgeFarGeo.computeVertexNormals();
    const ridgeFarMat = new THREE.MeshBasicMaterial({ color: '#091428', side: THREE.BackSide });

    const ridgeNearGeo = new THREE.CylinderGeometry(DOME_RADIUS - 6, DOME_RADIUS - 5, 11, 128, 1, true);
    const rNear = ridgeNearGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < rNear.count; i++) {
      if (rNear.getY(i) > 0) {
        const ang = Math.atan2(rNear.getZ(i), rNear.getX(i));
        const peak = 2.8 + Math.sin(ang * 6.0 + 1.8) * 1.6 + Math.cos(ang * 13.0) * 0.9;
        rNear.setY(i, peak);
      } else {
        rNear.setY(i, -4.5);
      }
    }
    ridgeNearGeo.computeVertexNormals();
    const ridgeNearMat = new THREE.MeshBasicMaterial({ color: '#030712', side: THREE.BackSide });

    // Glowing Tapered 3D Meteor Shower Quad Ribbons (6 vertices per meteor -> clearly visible shooting stars!)
    const meteorGeo = new THREE.BufferGeometry();
    const meteorVerts = METEOR_COUNT * 6;
    meteorGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(meteorVerts * 3), 3));
    const meteorCols = new Float32Array(meteorVerts * 3);
    for (let i = 0; i < METEOR_COUNT; i++) {
      const b = i * 18;
      // Head-left, head-right (incandescent white-cyan), tail (deep emerald fading dark)
      meteorCols[b] = 0.85; meteorCols[b + 1] = 0.98; meteorCols[b + 2] = 1.0;
      meteorCols[b + 3] = 0.85; meteorCols[b + 4] = 0.98; meteorCols[b + 5] = 1.0;
      meteorCols[b + 6] = 0.04; meteorCols[b + 7] = 0.25; meteorCols[b + 8] = 0.32;
      // Head core diamond tip
      meteorCols[b + 9] = 1.0; meteorCols[b + 10] = 1.0; meteorCols[b + 11] = 1.0;
      meteorCols[b + 12] = 1.0; meteorCols[b + 13] = 1.0; meteorCols[b + 14] = 1.0;
      meteorCols[b + 15] = 1.0; meteorCols[b + 16] = 1.0; meteorCols[b + 17] = 1.0;
    }
    meteorGeo.setAttribute('color', new THREE.BufferAttribute(meteorCols, 3));
    meteorGeoRef.current = meteorGeo;
    const meteorMat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    // Authentic NASA-Textured Telescope Eyepiece Targets (Saturn, Jupiter, Volumetric Orion M42)
    const planetGeo = new THREE.SphereGeometry(2.2, 48, 36);
    const saturnMat = new THREE.MeshStandardMaterial({ map: saturnMap, roughness: 0.62, metalness: 0.04 });
    const jupiterMat = new THREE.MeshStandardMaterial({ map: jupiterMap, roughness: 0.64, metalness: 0.04 });
    const saturnRingGeo = new THREE.RingGeometry(2.9, 5.1, 72);
    const saturnRingMat = new THREE.ShaderMaterial({
      vertexShader: TELESCOPE_RING_VERT,
      fragmentShader: TELESCOPE_RING_FRAG,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const orionGeo = new THREE.PlaneGeometry(8.5, 8.5);
    const orionMat = new THREE.ShaderMaterial({
      vertexShader: ORION_M42_VERT,
      fragmentShader: ORION_M42_FRAG,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const moonDotGeo = new THREE.SphereGeometry(0.18, 12, 10);
    const moonDotMat = new THREE.MeshBasicMaterial({ color: '#f8fafc' });

    return {
      skyDomeGeo,
      skyDomeMat,
      starsGeo,
      starsMat,
      linesGeo,
      linesMat,
      groundGeo,
      groundMat,
      ridgeFarGeo,
      ridgeFarMat,
      ridgeNearGeo,
      ridgeNearMat,
      meteorGeo,
      meteorMat,
      planetGeo,
      saturnMat,
      jupiterMat,
      saturnRingGeo,
      saturnRingMat,
      orionGeo,
      orionMat,
      moonDotGeo,
      moonDotMat,
    };
  }, [softParticle, saturnMap, jupiterMap]);

  useEffect(() => {
    const starPosAttr = gpu.starsGeo.attributes.position as THREE.BufferAttribute;
    (starPosAttr.array as Float32Array).set(skyBuffers.starPositions);
    starPosAttr.needsUpdate = true;

    const starColAttr = gpu.starsGeo.attributes.color as THREE.BufferAttribute;
    (starColAttr.array as Float32Array).set(skyBuffers.starColors);
    starColAttr.needsUpdate = true;

    const linePosAttr = gpu.linesGeo.attributes.position as THREE.BufferAttribute;
    (linePosAttr.array as Float32Array).set(skyBuffers.linePositions);
    linePosAttr.needsUpdate = true;

    gpu.skyDomeMat.uniforms.uLatTiltRad.value = THREE.MathUtils.degToRad(34 - latDeg * 0.45);
  }, [gpu, skyBuffers, latDeg]);

  const compassEntries = useMemo(() => {
    const isVi = language === 'vi';
    const specs: Array<{ key: string; pos: [number, number, number]; label: string; accent: string }> = [
      { key: 'N', pos: [0, 5.2, -(DOME_RADIUS - 14)], label: isVi ? 'BẮC · N' : 'NORTH · N', accent: '#7dd3fc' },
      { key: 'E', pos: [DOME_RADIUS - 14, 5.2, 0], label: isVi ? 'ĐÔNG · E' : 'EAST · E', accent: '#fcd34d' },
      { key: 'S', pos: [0, 5.2, DOME_RADIUS - 14], label: isVi ? 'NAM · S' : 'SOUTH · S', accent: '#fda4af' },
      { key: 'W', pos: [-(DOME_RADIUS - 14), 5.2, 0], label: isVi ? 'TÂY · W' : 'WEST · W', accent: '#6ee7b7' },
    ];
    return specs.map((s) => {
      const tex = createCompassReticleTexture(s.label, s.accent);
      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.82, depthWrite: false });
      return { key: s.key, pos: s.pos, tex, mat };
    });
  }, [language]);

  useEffect(() => {
    return () => {
      compassEntries.forEach((c) => {
        c.mat.dispose();
        c.tex.dispose();
      });
    };
  }, [compassEntries]);

  useEffect(() => {
    return () => {
      gpu.skyDomeGeo.dispose();
      gpu.skyDomeMat.dispose();
      gpu.starsGeo.dispose();
      gpu.starsMat.dispose();
      gpu.linesGeo.dispose();
      gpu.linesMat.dispose();
      gpu.groundGeo.dispose();
      gpu.groundMat.dispose();
      gpu.ridgeFarGeo.dispose();
      gpu.ridgeFarMat.dispose();
      gpu.ridgeNearGeo.dispose();
      gpu.ridgeNearMat.dispose();
      gpu.meteorGeo.dispose();
      gpu.meteorMat.dispose();
      gpu.planetGeo.dispose();
      gpu.saturnMat.dispose();
      gpu.jupiterMat.dispose();
      gpu.saturnRingGeo.dispose();
      gpu.saturnRingMat.dispose();
      gpu.orionGeo.dispose();
      gpu.orionMat.dispose();
      gpu.moonDotGeo.dispose();
      gpu.moonDotMat.dispose();
    };
  }, [gpu]);

  const meteorSeeds = useMemo(() => {
    const phase = new Float32Array(METEOR_COUNT);
    const azOff = new Float32Array(METEOR_COUNT);
    const altOff = new Float32Array(METEOR_COUNT);
    const speed = new Float32Array(METEOR_COUNT);
    for (let i = 0; i < METEOR_COUNT; i++) {
      phase[i] = (i / METEOR_COUNT + 0.04) % 1.0;
      azOff[i] = (Math.abs((Math.sin(i * 39.2) * 19283.1) % 1) - 0.5) * 52;
      altOff[i] = 18 + Math.abs((Math.sin(i * 71.9) * 28471.4) % 1) * 22;
      speed[i] = 0.28 + Math.abs((Math.sin(i * 17.1) * 12345.6) % 1) * 0.34;
    }
    return { phase, azOff, altOff, speed };
  }, []);

  const forwardScratch = useRef(new THREE.Vector3());

  useFrame((state, delta) => {
    const store = useAppStore.getState();
    const dt = store.reducedMotion ? 0 : Math.min(Math.max(delta, 0.001), 0.05);

    // Zero-allocation tapered 3D quad meteor ribbons (F5 + U7!)
    if (store.planetariumMeteorShower !== 'none' && meteorGeoRef.current) {
      const radiantAz = store.planetariumMeteorShower === 'perseids' ? 4 : 115;
      const posAttr = meteorGeoRef.current.attributes.position as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      for (let i = 0; i < METEOR_COUNT; i++) {
        let p = meteorSeeds.phase[i] + dt * meteorSeeds.speed[i];
        if (p > 1.0) p -= 1.0;
        meteorSeeds.phase[i] = p;

        // Only 6-8 bright meteors streak actively at any instant for authentic night-sky cadence
        const active = p < 0.32;
        if (!active) {
          const b = i * 18;
          for (let k = 0; k < 18; k++) arr[b + k] = 0;
          continue;
        }
        const streakT = p / 0.32;
        const azHead = radiantAz + meteorSeeds.azOff[i] + streakT * 14;
        const altHead = Math.max(9, meteorSeeds.altOff[i] - streakT * 10);
        const azTail = azHead - 6.8;
        const altTail = altHead + 4.9;

        writeMeteorQuadToBuffer(
          altHead,
          azHead,
          altTail,
          azTail,
          DOME_RADIUS - 7,
          0.26,
          arr,
          i * 6
        );
      }
      posAttr.needsUpdate = true;
    }

    if (telescopeGroupRef.current && store.planetariumTelescopeTarget !== 'none') {
      state.camera.getWorldDirection(forwardScratch.current);
      telescopeGroupRef.current.position
        .copy(state.camera.position)
        .addScaledVector(forwardScratch.current, 26.0);
      if (store.planetariumTelescopeTarget === 'orion_m42') {
        telescopeGroupRef.current.quaternion.copy(state.camera.quaternion);
      } else {
        telescopeGroupRef.current.rotation.x = 0;
        telescopeGroupRef.current.rotation.z = 0;
        telescopeGroupRef.current.rotation.y += dt * 0.25;
      }
    }
  });

  return (
    <group name="planetarium-360-sky-dome">
      <ambientLight intensity={0.45} color="#cbd5e1" />
      <directionalLight position={[18, 22, 15]} intensity={1.85} color="#fff7ed" />

      {/* Continuous FBM Milky Way + Astronomical Midnight Twilight Sky Dome */}
      <mesh geometry={gpu.skyDomeGeo} material={gpu.skyDomeMat} />

      {/* 360° Real Alt/Az Pinpoint Starfield & 8 IAU Constellations */}
      <points geometry={gpu.starsGeo} material={gpu.starsMat} />
      <lineSegments geometry={gpu.linesGeo} material={gpu.linesMat} />

      {/* Glowing Tapered 3D Meteor Shower Quad Ribbons */}
      {meteorShower !== 'none' && (
        <mesh geometry={gpu.meteorGeo} material={gpu.meteorMat} frustumCulled={false} />
      )}

      {/* Dual-Layer Alpine Mountain Silhouettes & Refined Astronomical Compass Reticles */}
      <mesh position={[0, -0.5, 0]} geometry={gpu.groundGeo} material={gpu.groundMat} />
      <mesh position={[0, 0, 0]} geometry={gpu.ridgeFarGeo} material={gpu.ridgeFarMat} />
      <mesh position={[0, 0, 0]} geometry={gpu.ridgeNearGeo} material={gpu.ridgeNearMat} />
      {compassEntries.map((c) => (
        <sprite key={c.key} position={c.pos} scale={[5.6, 2.5, 1]} material={c.mat} />
      ))}

      {/* High-Magnification NASA-Textured Optical Telescope Eyepiece Targets (FOV 14°) */}
      {telescopeTarget !== 'none' && (
        <group ref={telescopeGroupRef}>
          {telescopeTarget === 'saturn' && (
            <group rotation={[0.25, 0.2, 0.38]}>
              <mesh geometry={gpu.planetGeo} material={gpu.saturnMat} />
              <mesh rotation={[Math.PI / 2.2, 0, 0]} geometry={gpu.saturnRingGeo} material={gpu.saturnRingMat} />
              <mesh position={[6.2, 0.4, 0.5]} geometry={gpu.moonDotGeo} material={gpu.moonDotMat} />
            </group>
          )}
          {telescopeTarget === 'jupiter' && (
            <group>
              <mesh geometry={gpu.planetGeo} material={gpu.jupiterMat} />
              {[-5.2, -3.4, 3.6, 5.8].map((mx, i) => (
                <mesh
                  key={`gal-moon-${i}`}
                  position={[mx, (i - 1.5) * 0.14, 0]}
                  geometry={gpu.moonDotGeo}
                  material={gpu.moonDotMat}
                />
              ))}
            </group>
          )}
          {telescopeTarget === 'orion_m42' && (
            <group>
              <mesh geometry={gpu.orionGeo} material={gpu.orionMat} />
              <mesh position={[0.4, 0.2, 0.2]} geometry={gpu.moonDotGeo} material={gpu.moonDotMat} />
              <mesh position={[-0.3, -0.25, 0.2]} geometry={gpu.moonDotGeo} material={gpu.moonDotMat} />
              <mesh position={[0.1, -0.35, 0.2]} geometry={gpu.moonDotGeo} material={gpu.moonDotMat} />
            </group>
          )}
        </group>
      )}
    </group>
  );
};

export default PlanetariumScene;
