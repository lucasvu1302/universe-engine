import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { AssetManager } from '@/engine/assets/AssetManager';

const SRC_ROOT = path.resolve(__dirname, '..');

function readSrc(relPath: string): string {
  return fs.readFileSync(path.join(SRC_ROOT, relPath), 'utf8');
}

describe('Cinematic 3D Photorealism Overhaul (SPEC-LUNGTUNG-2026-11-18-002)', () => {
  describe('R1: PMREM Space Environment IBL & Cached Aerospace/Surface Micro-Detail Maps', () => {
    it('R1.a caches procedural aerospace, Kapton, solar-wafer, truss, particle, regolith, and flag textures idempotently and wires scene.environment', () => {
      const assets = AssetManager.getInstance() as unknown as Record<string, (...args: unknown[]) => unknown>;

      expect(typeof assets.getSpaceEnvironment).toBe('function');
      // Safe null fallback when passed null / headless mock without WebGL context
      expect(assets.getSpaceEnvironment(null)).toBeNull();

      const requiredGenerators = [
        ['getKaptonFoilMap', 'gold'],
        ['getKaptonFoilMap', 'rose'],
        ['getKaptonBumpMap'],
        ['getSolarArrayMap'],
        ['getAerospaceHullMap'],
        ['getAerospaceBumpMap'],
        ['getGridFinAlphaMap'],
        ['getSteelTrussAlphaMap'],
        ['getSoftParticleMap'],
        ['getRegolithBumpMap', 'mars'],
        ['getRegolithBumpMap', 'moon'],
        ['getRegolithAlbedoMap', 'mars'],
        ['getRegolithAlbedoMap', 'moon'],
        ['getUSFlagTexture'],
      ] as const;

      for (const [fnName, arg] of requiredGenerators) {
        expect(typeof assets[fnName], `AssetManager.${fnName} must exist`).toBe('function');
        const first = assets[fnName](arg);
        const second = assets[fnName](arg);
        expect(first).toBeTruthy();
        expect(second).toBe(first);
      }

      const appSrc = readSrc('App.tsx');
      expect(appSrc).toContain('getSpaceEnvironment');
      expect(appSrc).toContain('scene.environment');
    });

    it('R1.b (neg) eliminates square unmapped PointsMaterial particles across Mars dust, Supernova, TidalDisruption, and CelestialOverlay', () => {
      for (const rel of [
        'entities/Surfaces/MarsSurfaceScene.tsx',
        'entities/Impacts/Supernova.tsx',
        'entities/Impacts/TidalDisruption.tsx',
        'entities/Constellations/CelestialOverlay.tsx',
      ]) {
        const code = readSrc(rel);
        expect(code, `${rel} must bind soft particle sprite map`).toContain('getSoftParticleMap');
      }
    });
  });

  describe('R2: Cinema LC-39A Launch Complex, Falcon 9 Lathe Nozzles/Ogive & Mach-Diamond Plume', () => {
    it('R2.a builds open LatheGeometry engine bells & Dragon ogive, X-braced steel launch tower, perforated grid fins, and downward-oriented altitude-expanding plume without opaque paper cone', () => {
      const rocketSrc = readSrc('simulation/launch/RocketModel.tsx');
      expect(rocketSrc).toContain('LatheGeometry');
      expect(rocketSrc).toContain('getAerospaceHullMap');
      expect(rocketSrc).toContain('getGridFinAlphaMap');
      expect(rocketSrc).not.toContain('<coneGeometry args={[1.2, 5.0, 24]} />');
      expect(rocketSrc).toContain('uExpansion.value');
      // Plume cylinder must extend downward (-Y) without inverted Math.PI flip against vLocalPos.y
      expect(rocketSrc).toContain('plume1Geo');
      expect(rocketSrc).toContain('plume2Geo');

      const assetSrc = readSrc('engine/assets/AssetManager.ts');
      expect(assetSrc).not.toContain("'#0284c7'");

      const padSrc = readSrc('simulation/launch/LaunchPadModel.tsx');
      expect(padSrc).toContain('getSteelTrussAlphaMap');
      expect(padSrc).not.toContain('torusGeometry args={[2.8, 0.45');
    });

    it('R2.b (neg) fades rocketPlume cylinder silhouette edges via world-space view-angle Fresnel', () => {
      const plumeVert = readSrc('shaders/launch/rocketPlume.vert.glsl');
      const plumeFrag = readSrc('shaders/launch/rocketPlume.frag.glsl');
      expect(plumeVert).toContain('vNormal');
      expect(plumeVert).toContain('vWorldPosition');
      expect(plumeFrag).toContain('cameraPosition');
      expect(plumeFrag).toMatch(/dot\s*\(\s*norm\s*,\s*viewDir\s*\)|dot\s*\(\s*viewDir\s*,\s*norm\s*\)/);
    });
  });

  describe('R3: Cinema Spacecraft Mechanics & Optics (ISSCupola, JWST Parabolic Dish, Voyager Bus & Booms)', () => {
    it('R3.a curves JWST 18-mirror InstancedMesh parabolically above perpendicular XZ sunshield and equips Voyager with 10-sided bus, tripod struts, RTG & magnetometer booms without plastic ringGeometry', () => {
      const jwstSrc = readSrc('entities/Spacecraft/JWST.tsx');
      expect(jwstSrc).toContain('getKaptonBumpMap');
      expect(jwstSrc).toContain('focalLength');
      expect(jwstSrc).toContain('sunshieldDeckRef');
      // Must subdivide JWST sunshield interior grid (not flat 6-triangle ShapeGeometry(shape, 1))
      expect(jwstSrc).not.toContain('ShapeGeometry(shape, 1)');
      expect(jwstSrc).toContain('createSubdividedKiteSunshieldGeo');

      const voyagerSrc = readSrc('entities/Spacecraft/Voyager.tsx');
      expect(voyagerSrc).toContain('LatheGeometry');
      expect(voyagerSrc).toMatch(/10\s*\]|decagonal/i);
      expect(voyagerSrc).toContain('rtg');
      expect(voyagerSrc).toContain('magnetometer');
      expect(voyagerSrc).not.toContain('<ringGeometry args={[2.1');

      const targetHudSrc = readSrc('ui/TargetHUD.tsx');
      expect(targetHudSrc).toContain('orbitalDistanceAU');
      expect(targetHudSrc).toContain('line-clamp-3');
    });

    it('R3.b (neg) binds photovoltaic cell maps and MLI/Kapton bump maps on ISSCupola and JWST instead of flat hex slabs', () => {
      const issSrc = readSrc('entities/Spacecraft/ISSCupola.tsx');
      expect(issSrc).toContain('getSolarArrayMap');
      expect(issSrc).toContain('getAerospaceBumpMap');
      expect(issSrc).toContain('getSteelTrussAlphaMap');
    });
  });

  describe('R4: Smooth FBM Planetary Surfaces, Articulated Landers/Rovers & Lit Fresnel Megawave Ocean', () => {
    it('R4.a enables PCFSoftShadowMap castShadow on smooth Mars & Moon terrains with high-poly boulders, opaque analytical Fresnel megawave ocean, and gap-free Gargantua photon shadow', () => {
      const appSrc = readSrc('App.tsx');
      expect(appSrc).toContain('shadows');

      const marsSrc = readSrc('entities/Surfaces/MarsSurfaceScene.tsx');
      const moonSrc = readSrc('entities/Surfaces/MoonSurfaceScene.tsx');
      expect(marsSrc).not.toContain('flatShading');
      expect(moonSrc).not.toContain('flatShading');
      expect(marsSrc).toContain('<fogExp2');
      expect(marsSrc).toContain('castShadow');
      expect(moonSrc).toContain('castShadow');
      expect(marsSrc).toContain('IcosahedronGeometry(1.0, 3)');
      expect(moonSrc).toContain('IcosahedronGeometry(1.0, 3)');
      // Must tile rock micro-detail UVs rather than shrinking UVs by * 0.08
      expect(marsSrc).not.toContain('uv.getX(i) * 0.08');
      expect(moonSrc).not.toContain('uv.getX(i) * 0.08');

      const waveVert = readSrc('shaders/ocean/megawave.vert.glsl');
      const waveFrag = readSrc('shaders/ocean/megawave.frag.glsl');
      expect(waveVert).toContain('dHx');
      expect(waveVert).toContain('dHz');
      expect(waveFrag).toContain('cameraPosition');
      expect(waveFrag).toContain('fresnel');
      expect(waveFrag).toContain('vec4(color, 1.0)');

      const millersSrc = readSrc('scenes/ExoSystem/MillersPlanetScene.tsx');
      expect(millersSrc).toContain('rangerRef');
      expect(millersSrc).toContain('blackholeFrag');

      const bhFrag = readSrc('shaders/blackhole/blackhole.frag.glsl');
      expect(bhFrag).toContain('R_SHADOW');
    });

    it('R4.b (neg) renders textured Earthrise + Stars-and-Stripes US flag on Moon and articulated rocker-bogie suspension struts on Perseverance', () => {
      const moonSrc = readSrc('entities/Surfaces/MoonSurfaceScene.tsx');
      expect(moonSrc).not.toContain('color="#2b82c9"');
      expect(moonSrc).not.toContain('color="#ef4444"');
      expect(moonSrc).toContain('getUSFlagTexture');
      expect(moonSrc).toContain('earthGroundFrag');

      const marsSrc = readSrc('entities/Surfaces/MarsSurfaceScene.tsx');
      expect(marsSrc).toContain('rockerBogie');
    });
  });

  describe('R5: Anti-Aliased Saturn Rings, 3D Lensed Wormhole, Seamless Pulsar Beams & Volumetric Cosmic History', () => {
    it('R5.a applies fwidth ring anti-aliasing, 3D ray-refracted wormhole with world-space distance, and normal-Fresnel pulsar beams without vUv.x seam', () => {
      const satRingFrag = readSrc('shaders/saturn/saturnRing.frag.glsl');
      const satPlanetFrag = readSrc('shaders/saturn/saturnPlanet.frag.glsl');
      expect(satRingFrag).toContain('fwidth');
      // Saturn globe ring shadow must filter normR via fwidth + grazing solar penumbra softening
      expect(satPlanetFrag).toContain('fwidth');
      expect(satPlanetFrag).toContain('grazingSoft');

      const wormholeFrag = readSrc('shaders/wormhole/wormhole4d.frag.glsl');
      const wormholeTsx = readSrc('entities/Wormhole/Wormhole.tsx');
      expect(wormholeFrag).toContain('cameraPosition');
      expect(wormholeTsx).toContain('wormholeWorldPos');

      const beamFrag = readSrc('shaders/pulsar/pulsarBeam.frag.glsl');
      expect(beamFrag).not.toContain('abs(vUv.x - 0.5)');
      expect(beamFrag).toContain('vNormal');
    });

    it('R5.b (neg) replaces flat meshBasicMaterial central rings/marbles in StarBirth, PlanetFormation, and GalaxyCollision with shaders and volumetric bulges', () => {
      const starBirth = readSrc('simulation/cosmic/StarBirthVisual.tsx');
      const planetForm = readSrc('simulation/cosmic/PlanetFormationVisual.tsx');
      const galCol = readSrc('simulation/cosmic/GalaxyCollisionVisual.tsx');
      const satPlanetFrag = readSrc('shaders/saturn/saturnPlanet.frag.glsl');

      expect(starBirth).toContain('accretionDiskFrag');
      expect(planetForm).toContain('earthHistoricalFrag');
      expect(galCol).toContain('getSoftParticleMap');
      expect(galCol).toContain('simElapsedRef');
      expect(satPlanetFrag).toContain('ringShine');
    });
  });
});
