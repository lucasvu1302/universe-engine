import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, act } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';

let vector3ConstructCount = 0;

vi.mock('three', async (importOriginal) => {
  const actual = await importOriginal<typeof import('three')>();
  class TrackedVector3 extends actual.Vector3 {
    constructor(x?: number, y?: number, z?: number) {
      super(x, y, z);
      vector3ConstructCount++;
    }
  }
  return {
    ...actual,
    Vector3: TrackedVector3,
  };
});

import * as THREE from 'three';
import { acceleratedRaycast } from 'three-mesh-bvh';
import { useAppStore } from '@/stores/useAppStore';
import { PerformanceManager } from '@/engine/performance/PerformanceManager';
import { AssetManager } from '@/engine/assets/AssetManager';
import { OrbitLine } from '@/entities/Orbits/OrbitLine';
import { SimulationEventBus } from '@/simulation/core/SimulationEventBus';
import { CockpitHUD } from '@/simulation/launch/CockpitHUD';
import { CosmicTimelineHUD } from '@/simulation/cosmic/CosmicTimelineHUD';
import { EarthTimelineHUD } from '@/simulation/earth/EarthTimelineHUD';
import { SpacecraftEphemeris } from '@/engine/ephemeris/SpacecraftEphemeris';
import { CameraManager } from '@/engine/camera/CameraManager';
import { CameraDirector } from '@/simulation/camera/CameraDirector';
import { CinematicDirector } from '@/engine/camera/CinematicDirector';
import { updateJWSTFrame } from '@/entities/Spacecraft/JWST';

import starVert from '@/shaders/stars/starfield.vert.glsl';
import sunFrag from '@/shaders/sun/sun.frag.glsl';
import blackholeFrag from '@/shaders/blackhole/blackhole.frag.glsl';
import earthHistFrag from '@/shaders/earth/earthHistorical.frag.glsl';
import smokeVert from '@/shaders/launch/launchSmoke.vert.glsl';
import smokeFrag from '@/shaders/launch/launchSmoke.frag.glsl';

const SRC_ROOT = path.resolve(__dirname, '..');

function readSrc(relPath: string): string {
  return fs.readFileSync(path.join(SRC_ROOT, relPath), 'utf8');
}

describe('Graphics Performance Architecture (SPEC-UNIVERSE-2026-11-17-001)', () => {
  beforeEach(() => {
    useAppStore.setState({
      graphicsQuality: 'AUTO',
      detectedGPUTier: 2,
      isPaused: false,
      showOrbits: true,
      cameraMode: 'ORBIT',
      targetId: 'earth',
    });
  });

  describe('R1: QualityProfile registry, Float64Array ring buffer, gl.info metrics & tab visibility', () => {
    it('R1.a resolves AUTO across GPU tiers 1..4 into deterministic QualityProfile tiers and renderer metrics', () => {
      const pm = PerformanceManager.getInstance() as unknown as Record<string, unknown>;
      expect(typeof pm.getQualityProfile).toBe('function');

      const getProfile = pm.getQualityProfile as (
        q: string,
        tier?: number
      ) => {
        resolvedTier: string;
        dpr: number;
        enablePostProcessing: boolean;
        enableBloom: boolean;
        starCount: number;
        galaxyParticleCount: number;
        asteroidCount: number;
        sphereSegments: number;
        raymarchSteps: number;
      };

      const p1 = getProfile.call(pm, 'AUTO', 1);
      expect(p1.resolvedTier).toBe('LOW');
      expect(p1.dpr).toBe(1.0);
      expect(p1.enablePostProcessing).toBe(false);
      expect(p1.enableBloom).toBe(false);
      expect(p1.raymarchSteps).toBe(24);
      expect(p1.starCount).toBe(7000);
      expect(p1.galaxyParticleCount).toBe(35000);
      expect(p1.asteroidCount).toBe(600);
      expect(p1.sphereSegments).toBe(24);

      const p2 = getProfile.call(pm, 'AUTO', 2);
      expect(p2.resolvedTier).toBe('MEDIUM');
      expect(p2.dpr).toBeLessThanOrEqual(1.25);
      expect(p2.enablePostProcessing).toBe(true);
      expect(p2.enableBloom).toBe(true);
      expect(p2.raymarchSteps).toBe(36);

      const p3 = getProfile.call(pm, 'AUTO', 3);
      expect(p3.resolvedTier).toBe('HIGH');
      expect(p3.dpr).toBeLessThanOrEqual(1.5);
      expect(p3.raymarchSteps).toBe(48);

      const p4 = getProfile.call(pm, 'AUTO', 4);
      expect(p4.resolvedTier).toBe('ULTRA');
      expect(p4.dpr).toBeLessThanOrEqual(2.0);
      expect(p4.raymarchSteps).toBe(56);

      // Fixed-size Float64Array(60) ring buffer & manual gl.info capture
      expect(pm.frameBuffer instanceof Float64Array).toBe(true);
      expect((pm.frameBuffer as Float64Array).length).toBe(60);

      let resetCalled = 0;
      const mockRenderer = {
        info: {
          autoReset: true,
          render: { calls: 42, triangles: 12800 },
          reset: () => {
            resetCalled++;
          },
        },
      };
      expect(typeof pm.recordRendererInfo).toBe('function');
      (pm.recordRendererInfo as (gl: unknown) => void).call(pm, mockRenderer);
      expect(mockRenderer.info.autoReset).toBe(false);
      expect(resetCalled).toBe(1);

      const getMetrics = pm.getMetrics as () => { drawCalls: number; triangles: number };
      expect(typeof getMetrics).toBe('function');
      const metrics = getMetrics.call(pm);
      expect(metrics.drawCalls).toBe(42);
      expect(metrics.triangles).toBe(12800);
    });

    it('R1.b (neg) preserves existing isPaused state across tab hide and show transitions', () => {
      PerformanceManager.getInstance();

      // Case 1: already paused -> stays paused when hidden and shown
      useAppStore.setState({ isPaused: true });
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      document.dispatchEvent(new Event('visibilitychange'));
      expect(useAppStore.getState().isPaused).toBe(true);
      expect((useAppStore.getState() as unknown as Record<string, unknown>).isTabHidden).toBe(true);

      Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
      document.dispatchEvent(new Event('visibilitychange'));
      expect(useAppStore.getState().isPaused).toBe(true);
      expect((useAppStore.getState() as unknown as Record<string, unknown>).isTabHidden).toBe(false);

      // Case 2: unpaused -> stays unpaused while isTabHidden toggles frameloop
      useAppStore.setState({ isPaused: false });
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      document.dispatchEvent(new Event('visibilitychange'));
      expect(useAppStore.getState().isPaused).toBe(false);
      expect((useAppStore.getState() as unknown as Record<string, unknown>).isTabHidden).toBe(true);

      Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
      document.dispatchEvent(new Event('visibilitychange'));
      expect(useAppStore.getState().isPaused).toBe(false);
    });
  });

  describe('R2: AssetManager texture aliasing, colorSpace, unit sphere cache, BVH & OrbitLine lifecycle', () => {
    it('R2.a shares earth/earth_day texture, sets NoColorSpace on data masks, caches unit spheres & enables BVH', () => {
      const assets = AssetManager.getInstance() as unknown as Record<string, unknown>;
      expect(typeof assets.enableBVH).toBe('function');
      (assets.enableBVH as () => void).call(assets);
      (assets.enableBVH as () => void).call(assets); // idempotent
      expect(THREE.Mesh.prototype.raycast).toBe(acceleratedRaycast);

      const realAssets = AssetManager.getInstance();
      const earthA = realAssets.loadTexture('earth');
      const earthB = realAssets.loadTexture('earth_day');
      expect(earthA).toBe(earthB);
      expect(earthA.colorSpace).toBe(THREE.SRGBColorSpace);

      const spec = realAssets.getEarthSpecularMap();
      const clouds = realAssets.getEarthCloudsMap();
      expect(spec.colorSpace).toBe(THREE.NoColorSpace);
      expect(clouds.colorSpace).toBe(THREE.NoColorSpace);

      expect(typeof assets.getUnitSphereGeometry).toBe('function');
      const getSphere = assets.getUnitSphereGeometry as (segs: number) => THREE.SphereGeometry;
      const sphere32A = getSphere.call(assets, 32);
      const sphere32B = getSphere.call(assets, 32);
      const sphere48 = getSphere.call(assets, 48);
      expect(sphere32A).toBe(sphere32B);
      expect(sphere32A).not.toBe(sphere48);
    });

    it('R2.b (neg) updates OrbitLine selection without reallocating BufferGeometry and disposes on unmount', () => {
      const setFromPointsSpy = vi.spyOn(THREE.BufferGeometry.prototype, 'setFromPoints');
      const disposeGeoSpy = vi.spyOn(THREE.BufferGeometry.prototype, 'dispose');

      const { rerender, unmount } = render(
        React.createElement(OrbitLine, { distance: 60, color: '#38bdf8', isSelected: false })
      );
      expect(setFromPointsSpy).toHaveBeenCalledTimes(1);

      rerender(React.createElement(OrbitLine, { distance: 60, color: '#38bdf8', isSelected: true }));
      // Must NOT re-create BufferGeometry when only isSelected toggles
      expect(setFromPointsSpy).toHaveBeenCalledTimes(1);

      unmount();
      expect(disposeGeoSpy).toHaveBeenCalled();

      setFromPointsSpy.mockRestore();
      disposeGeoSpy.mockRestore();
    });
  });

  describe('R3: Zero per-frame scene setState churn, 15Hz HUD throttle & persistent cosmic geometries', () => {
    it('R3.a throttles continuous HUD telemetry updates to <= 15Hz over 60 frame ticks while keeping scene loops state-free', () => {
      const cosmicSceneSrc = readSrc('simulation/cosmic/CosmicEventScene.tsx');
      expect(cosmicSceneSrc).not.toMatch(/setPlayback\s*\(\s*\{/);

      // All 5 cosmic visuals must sync progress inside useFrame
      for (const visualFile of [
        'simulation/cosmic/BigBangVisual.tsx',
        'simulation/cosmic/StarBirthVisual.tsx',
        'simulation/cosmic/SupernovaVisual.tsx',
        'simulation/cosmic/PlanetFormationVisual.tsx',
        'simulation/cosmic/GalaxyCollisionVisual.tsx',
      ]) {
        const src = readSrc(visualFile);
        expect(src).toContain('useFrame');
        expect(src).toContain('CosmicEventManager');
      }

      // Mount all 3 simulation HUDs and drive 60 timeline ticks across 1000ms (every 16.67ms)
      let nowMs = 1000;
      const nowSpy = vi.spyOn(performance, 'now').mockImplementation(() => nowMs);

      let cockpitCommits = 0;
      let cosmicCommits = 0;
      let earthCommits = 0;

      const bus = SimulationEventBus.getInstance();
      const { unmount } = render(
        React.createElement(
          React.Fragment,
          null,
          React.createElement(
            React.Profiler,
            {
              id: 'cockpit',
              onRender: () => {
                cockpitCommits++;
              },
            },
            React.createElement(CockpitHUD)
          ),
          React.createElement(
            React.Profiler,
            {
              id: 'cosmic',
              onRender: () => {
                cosmicCommits++;
              },
            },
            React.createElement(CosmicTimelineHUD)
          ),
          React.createElement(
            React.Profiler,
            {
              id: 'earth',
              onRender: () => {
                earthCommits++;
              },
            },
            React.createElement(EarthTimelineHUD)
          )
        )
      );

      cockpitCommits = 0;
      cosmicCommits = 0;
      earthCommits = 0;

      for (let frame = 1; frame <= 60; frame++) {
        nowMs += 16.666;
        act(() => {
          bus.emit('timeline:time_update', -4500 + frame * 0.1, frame / 60);
        });
      }

      expect(cockpitCommits).toBeLessThanOrEqual(15);
      expect(cosmicCommits).toBeLessThanOrEqual(15);
      expect(earthCommits).toBeLessThanOrEqual(15);

      unmount();
      nowSpy.mockRestore();
    });

    it('R3.b (neg) eliminates dynamic geometry args and inline uniform allocations in cosmic effects', () => {
      const bigBangSrc = readSrc('simulation/cosmic/BigBangVisual.tsx');
      const shockwaveSrc = readSrc('simulation/effects/ShockwaveRing.tsx');
      const nebulaSrc = readSrc('simulation/effects/NebulaCloud.tsx');
      const starBirthSrc = readSrc('simulation/cosmic/StarBirthVisual.tsx');
      const supernovaSrc = readSrc('simulation/cosmic/SupernovaVisual.tsx');

      // BigBangVisual & ShockwaveRing must not pass dynamic progress-dependent radius/size into geometry args
      expect(bigBangSrc).not.toMatch(/<sphereGeometry\s+args=\{\[\s*Math\.max/);
      expect(shockwaveSrc).not.toMatch(/<planeGeometry\s+args=\{\[\s*planeSize/);

      // NebulaCloud, StarBirthVisual, SupernovaVisual must not recreate uniform maps on render
      expect(nebulaSrc).not.toMatch(/\},\s*\[intensity\]\s*\)/);
      expect(starBirthSrc).not.toMatch(/uniforms=\{\{/);
      expect(supernovaSrc).not.toMatch(/uniforms=\{\{/);
      // BigBangVisual must keep pointLight mounted rather than conditional {p < 0.35 && ... <pointLight
      expect(bigBangSrc).not.toMatch(/p\s*<\s*0\.35\s*&&[\s\S]{0,160}<pointLight/);
    });
  });

  describe('R4: LaunchScene zero-churn loop, InstancedMesh smoke, zero-transmission cockpit glass & fixed lights', () => {
    it('R4.a batches smoke into 1 FrontSide InstancedMesh, sets 0 transmission on cockpit glass, removes SpotLights & stabilizes PointLights', () => {
      const launchSceneSrc = readSrc('simulation/launch/LaunchScene.tsx');
      const smokeSrc = readSrc('simulation/launch/LaunchSmokeVolumetrics.tsx');
      const cockpitSrc = readSrc('simulation/launch/CockpitInterior.tsx');
      const terrainSrc = readSrc('simulation/launch/SpaceportTerrain.tsx');
      const rocketSrc = readSrc('simulation/launch/RocketModel.tsx');

      // R3/R4: LaunchScene must not setTrajectory({ ...currentTraj }) every useFrame
      expect(launchSceneSrc).not.toMatch(/setTrajectory\s*\(\s*\{/);

      // 1 InstancedMesh with FrontSide, no .map() generating 56 meshes
      expect(smokeSrc).toContain('<instancedMesh');
      expect(smokeSrc).toContain('THREE.FrontSide');
      expect(smokeSrc).not.toMatch(/puffsData\.map\s*\(/);

      // Both cockpit glass panes must have transmission={0} (or no transmission > 0) and stay mounted via visible
      expect(cockpitSrc).not.toMatch(/transmission=\{\s*0\.[1-9]/);
      expect(cockpitSrc).not.toMatch(/if\s*\(\s*!isInside\s*\)\s*return\s+null/);

      // 0 SpotLights in SpaceportTerrain / LaunchScene, no mast PointLights
      expect(terrainSrc).not.toContain('<spotLight');
      expect(terrainSrc).not.toContain('<pointLight');

      // RocketModel must not conditionally mount/unmount <pointLight> inside stage1/stage2 firing blocks
      expect(rocketSrc).not.toMatch(/isStage1Firing\s*&&[\s\S]*?<pointLight/);
      expect(rocketSrc).not.toMatch(/isStage2Firing\s*&&[\s\S]*?<pointLight/);

      // INV3: Sandbox cataclysms must keep persistent lights mounted rather than unmounting on !active
      for (const impactFile of [
        'entities/Impacts/MeteorImpact.tsx',
        'entities/Impacts/Supernova.tsx',
        'entities/Impacts/TidalDisruption.tsx',
      ]) {
        const impactSrc = readSrc(impactFile);
        expect(impactSrc).not.toMatch(/if\s*\(\s*!active[\s\S]{0,40}return\s+null/);
      }
    });

    it('R4.b (neg) hides both SpaceportTerrain and LaunchPadModel in useFrame when altitudeKm >= 12 without parent re-render', () => {
      const terrainSrc = readSrc('simulation/launch/SpaceportTerrain.tsx');
      const padSrc = readSrc('simulation/launch/LaunchPadModel.tsx');

      expect(terrainSrc).toContain('useFrame');
      expect(terrainSrc).toContain('LaunchController');
      expect(padSrc).toContain('LaunchController');
      expect(padSrc).toMatch(/altitudeKm\s*<\s*12/);
    });
  });

  describe('R5: Shader ALU optimizations, StarField attribute parity & BlackHole single-sided raymarching', () => {
    it('R5.a aligns StarField attributes/uniforms, removes snoise from Sun voronoi, scales BlackHole dt & caps Earth epochs', () => {
      const starFieldSrc = readSrc('entities/StarField/StarField.tsx');

      // 1. StarField VBO attributes and uniforms match starfield.vert.glsl 1-to-1
      for (const attr of ['aSize', 'aColor', 'aTwinkleSpeed', 'aTwinklePhase']) {
        expect(starVert).toContain(`attribute `);
        expect(starVert).toContain(attr);
        expect(starFieldSrc).toContain(`attributes-${attr}`);
      }
      for (const uni of ['uTime', 'uWarpSpeed', 'uVelocityDirection']) {
        expect(starVert).toContain(uni);
        expect(starFieldSrc).toContain(uni);
      }

      // 2. Sun voronoi() has 0 snoise calls and uses hash33
      const voronoiMatch = sunFrag.match(/float\s+voronoi\s*\([^)]*\)\s*\{([\s\S]*?)\n\}/);
      expect(voronoiMatch).not.toBeNull();
      expect(voronoiMatch![1]).not.toContain('snoise(');
      expect(sunFrag).toContain('hash33');

      // 3. BlackHole shader scales unit-sphere vLocalPos into 65.0 volume space, uses 65.5 threshold, uMaxSteps, and inverse step scaling
      const bhSrc = readSrc('entities/BlackHole/BlackHole.tsx');
      expect(bhSrc).toMatch(/uVolumeRadius:\s*\{\s*value:\s*65(?:\.0)?\s*\}/);
      expect(blackholeFrag).toContain('uVolumeRadius');
      expect(blackholeFrag).toMatch(/vLocalPos\s*\*\s*volumeRadius/);
      expect(blackholeFrag).toContain('uMaxSteps');
      expect(blackholeFrag).toContain('65.5');
      expect(blackholeFrag).toMatch(/55\.0\s*\/\s*float\s*\(\s*uMaxSteps\s*\)/);

      // Verify mathematical reachability of R_HORIZON (5.88) from r = 65.0 in 24 steps
      let r = 65.0;
      const uMaxSteps = 24;
      const stepScale = 55.0 / uMaxSteps;
      for (let i = 0; i < uMaxSteps; i++) {
        if (r < 5.88) break;
        const dt = Math.min(Math.max(r * 0.055, 0.18), 1.6) * stepScale;
        r -= dt;
      }
      expect(r).toBeLessThan(5.88);

      // 4. Historical Earth evaluates epoch noises lazily inside stage branches (not all 6 upfront)
      const mainBody = earthHistFrag.slice(earthHistFrag.indexOf('void main()'));
      const beforeFirstStageIf = mainBody.slice(0, mainBody.indexOf('if (stage < 1.0)'));
      expect(beforeFirstStageIf).not.toContain('fbm(');

      // 5. Launch smoke shaders support instanceMatrix and early density discard
      expect(smokeVert).toContain('USE_INSTANCING');
      expect(smokeVert).toContain('instanceMatrix');
      expect(smokeFrag).toMatch(/uSmokeDensity\s*<=\s*0\.005/);
    });

    it('R5.b (neg) configures BlackHole volume material as FrontSide outside 65.5 and BackSide inside (never DoubleSide)', () => {
      const bhSrc = readSrc('entities/BlackHole/BlackHole.tsx');
      // Volume shaderMaterial must not use THREE.DoubleSide
      const shaderMatBlock = bhSrc.slice(
        bhSrc.indexOf('<shaderMaterial'),
        bhSrc.indexOf('/>', bhSrc.indexOf('<shaderMaterial'))
      );
      expect(shaderMatBlock).not.toContain('THREE.DoubleSide');
      expect(bhSrc).toContain('THREE.FrontSide');
      expect(bhSrc).toContain('THREE.BackSide');
      expect(bhSrc).toContain('65.5');
    });
  });

  describe('R6: Zero per-frame Vector3 allocations, JWST mirror InstancedMesh, raycast proxy & 25-unit LOD', () => {
    it('R6.a executes 100 frames of ephemeris, orbit, cinematic & slingshot camera updates with 0 Vector3 allocations or clones', () => {
      const earthCenter = new THREE.Vector3(100, 0, 0);
      const jwstOut = new THREE.Vector3();

      const camManager = CameraManager.getInstance();
      const testCam = new THREE.PerspectiveCamera(50, 1.77, 0.1, 80000);
      testCam.position.set(110, 20, 90);
      camManager.setCamera(testCam);
      camManager.activeScenario = 'none';
      camManager.focusPlanet('earth');
      // Complete initial focus setup
      camManager.updateOrbit(0.016);

      const camDirector = CameraDirector.getInstance();
      const rocketPos = new THREE.Vector3(0, 50, 10);
      const rocketQuat = new THREE.Quaternion();
      camDirector.updateRocketPose(rocketPos, rocketQuat);
      camDirector.setMode('CINEMATIC');
      camDirector.update(0.016);

      const cineDirector = CinematicDirector.getInstance();
      cineDirector.enterCinemaMode('SLINGSHOT');
      cineDirector.update(0.016);

      // Ensure CameraManager is actively in ORBIT tracking 'earth' with active touch inertia during the 100-frame hot loop
      camManager.state = 'ORBIT';
      camManager.activeFocusId = 'earth';
      camManager.activeScenario = 'none';
      camManager.setOrbitInertia(2.4, -0.7);

      const jwstGroup = new THREE.Group();
      const jwstDetailGroup = new THREE.Group();
      const jwstProxyGroup = new THREE.Group();
      const farCamPos = new THREE.Vector3(230, 0, 0);

      const ephemeris = SpacecraftEphemeris.getInstance();
      const cloneSpy = vi.spyOn(THREE.Vector3.prototype, 'clone');
      vector3ConstructCount = 0;

      for (let i = 0; i < 100; i++) {
        ephemeris.getJWSTPosition(i * 0.016, earthCenter, jwstOut);
        camManager.updateOrbit(0.016);
        camDirector.update(0.016);
        cineDirector.update(0.016);
        updateJWSTFrame(
          jwstGroup,
          jwstDetailGroup,
          jwstProxyGroup,
          farCamPos,
          i * 0.016,
          earthCenter,
          jwstOut
        );
      }

      expect(cloneSpy).toHaveBeenCalledTimes(0);
      expect(vector3ConstructCount).toBe(0);
      // At ~120 units away (> 25 threshold), detail group is culled and lightweight proxy is visible
      expect(jwstDetailGroup.visible).toBe(false);
      expect(jwstProxyGroup.visible).toBe(true);

      cloneSpy.mockRestore();
      cineDirector.exitCinemaMode();
    });

    it('R6.b (neg) batches 18 JWST mirror segments into 1 InstancedMesh, disables child raycast & culls detail past 25 units', () => {
      const jwstSrc = readSrc('entities/Spacecraft/JWST.tsx');
      const issSrc = readSrc('entities/Spacecraft/ISSCupola.tsx');

      // JWST uses 1 InstancedMesh for the 18 mirror segments and zero-alloc lookAt(0, 0, 0)
      expect(jwstSrc).toContain('<instancedMesh');
      expect(jwstSrc).not.toMatch(/lookAt\s*\(\s*new\s+THREE\.Vector3/);

      // Neither ISSCupola nor JWST uses broken <mesh visible={false}> hit proxy
      expect(jwstSrc).not.toContain('<mesh visible={false}>');
      expect(issSrc).not.toContain('<mesh visible={false}>');

      // Both implement 25-unit distance LOD culling and disable child detail raycasting
      expect(jwstSrc).toMatch(/25/);
      expect(issSrc).toMatch(/25/);
      expect(jwstSrc).toContain('raycast');
      expect(issSrc).toContain('raycast');
    });
  });

  describe('R6.a (SPEC-UNIV-2026-11-24-001): Space Games GPU discipline (0 point/spot lights, NOOP_RAYCAST, disposal & <=15Hz HUD throttle)', () => {
    it('keeps all 5 Space Game 3D scenes free of dynamic point/spot lights, disposes local GPU assets, uses NOOP_RAYCAST & HUD throttling', () => {
      const gameScenes = [
        'scenes/SpaceGames/AstroSurvivorScene.tsx',
        'scenes/SpaceGames/JetpackOdysseyScene.tsx',
        'scenes/SpaceGames/MechArenaScene.tsx',
        'scenes/SpaceGames/ExoMinerScene.tsx',
        'scenes/SpaceGames/ZeroGRescueScene.tsx',
      ];

      for (const file of gameScenes) {
        const src = readSrc(file);
        expect(src, `${file} must not create dynamic pointLight`).not.toContain('<pointLight');
        expect(src, `${file} must not create dynamic spotLight`).not.toContain('<spotLight');
        expect(src, `${file} must disable decorative raycast via NOOP_RAYCAST`).toContain('NOOP_RAYCAST');
        expect(src, `${file} must dispose local character/prop trees`).toContain('disposeObjectTree');
        expect(src, `${file} must dispose local geometries/materials`).toContain('.dispose()');
        expect(src, `${file} must throttle HUD pushes via createHudThrottle`).toContain('createHudThrottle');
        // M1 regression guard: every InstancedMesh in SpaceGames must set frustumCulled={false}
        const instancedBlocks = src.match(/<instancedMesh[\s\S]*?\/>/g) ?? [];
        for (const block of instancedBlocks) {
          expect(block, `${file} InstancedMesh must disable frustum culling`).toContain('frustumCulled={false}');
        }
      }
    });
  });
});
