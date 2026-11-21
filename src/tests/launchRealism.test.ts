import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';
import { CameraManager } from '@/engine/camera/CameraManager';
import { CameraDirector } from '@/simulation/camera/CameraDirector';
import { LaunchController } from '@/simulation/launch/LaunchController';

const SRC_ROOT = path.resolve(__dirname, '..');

describe('Rocket Launch 3D Realism & Shader Coordinate Spaces (SPEC-LUNGTUNG-2026-11-18-001)', () => {
  it('R1.a uses world-space normals in planetary shaders, soft view-angle smoke falloff, unburied spaceport ground, and open cabin windows', () => {
    const worldNormalShaders = [
      'shaders/atmosphere/atmosphere.vert.glsl',
      'shaders/earth/earthGround.vert.glsl',
      'shaders/earth/earthHistorical.vert.glsl',
      'shaders/saturn/saturnPlanet.vert.glsl',
      'shaders/saturn/saturnRing.vert.glsl',
    ];

    for (const rel of worldNormalShaders) {
      const code = fs.readFileSync(path.join(SRC_ROOT, rel), 'utf8');
      expect(code, `${rel} must transform normals with modelMatrix into world space`).toContain(
        'mat3(modelMatrix)'
      );
      expect(code, `${rel} must not mix view-space normalMatrix with world-space vectors`).not.toContain(
        'normalMatrix * normal'
      );
    }

    const smokeFrag = fs.readFileSync(
      path.join(SRC_ROOT, 'shaders/launch/launchSmoke.frag.glsl'),
      'utf8'
    );
    expect(smokeFrag).toContain('cameraPosition');
    expect(smokeFrag).toMatch(/dot\s*\(\s*norm\s*,\s*viewDir\s*\)|dot\s*\(\s*viewDir\s*,\s*norm\s*\)/);

    const launchScene = fs.readFileSync(
      path.join(SRC_ROOT, 'simulation/launch/LaunchScene.tsx'),
      'utf8'
    );
    expect(launchScene).toContain('<StarField');
    expect(launchScene).toContain('earthGroupRef');

    const cockpitSrc = fs.readFileSync(
      path.join(SRC_ROOT, 'simulation/launch/CockpitInterior.tsx'),
      'utf8'
    );
    // Cabin hull cylinder must leave an open forward & starboard window arc (< 2π)
    expect(cockpitSrc).toMatch(/Math\.PI \* 0\.(48|72|92)|Math\.PI \* 1\.15/);
  });

  it('R1.b (neg) eliminates blinding windshield clearcoat hotspot, keeps daylight sky below bloom threshold, and frames all 3 MFD displays inside COCKPIT frustum', () => {
    const cockpitSrc = fs.readFileSync(
      path.join(SRC_ROOT, 'simulation/launch/CockpitInterior.tsx'),
      'utf8'
    );
    expect(cockpitSrc).not.toContain('clearcoat={0.6}');
    expect(cockpitSrc).not.toContain('clearcoat=');

    const skyFrag = fs.readFileSync(
      path.join(SRC_ROOT, 'shaders/launch/launchSky.frag.glsl'),
      'utf8'
    );
    expect(skyFrag).not.toContain('uSkyColor * 1.35');

    // Verify real 3D PerspectiveCamera frustum framing in COCKPIT mode at T+232s (170.9 km orbit insertion)
    const cam = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 80000);
    CameraManager.getInstance().setCamera(cam);

    const traj = LaunchController.getInstance().evaluateAtTime(232);
    const director = CameraDirector.getInstance();
    director.setMode('COCKPIT');
    director.update(0.016);
    cam.updateMatrixWorld(true);
    cam.updateProjectionMatrix();

    // Pilot-aligned Crew Dragon console group at [0, 8.05, -0.05] rotated by -atan2(0.92, 0.39) around X
    const pilotFrameQuat = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(-Math.atan2(0.92, 0.39), 0, 0)
    );
    const pilotOrigin = new THREE.Vector3(0, 8.05, -0.05);
    const mfdPilotSpaceCenters = [
      new THREE.Vector3(-0.47, -0.21, 0.88),
      new THREE.Vector3(0.0, -0.21, 0.91),
      new THREE.Vector3(0.47, -0.21, 0.88),
    ];

    for (const pCenter of mfdPilotSpaceCenters) {
      const rocketLocal = pCenter.clone().applyQuaternion(pilotFrameQuat).add(pilotOrigin);
      const worldPt = rocketLocal.applyQuaternion(traj.quaternion).add(traj.position);
      const ndc = worldPt.project(cam);
      expect(ndc.x).toBeGreaterThan(-0.92);
      expect(ndc.x).toBeLessThan(0.92);
      expect(ndc.y).toBeGreaterThan(-0.92);
      expect(ndc.y).toBeLessThan(0.1);
    }

    // Verify in orbit (T+232s) pilot gaze points forward (+Z) and slightly down (-Y) toward curved Earth limb while camera up points skyward (+Y)!
    const worldDir = new THREE.Vector3();
    cam.getWorldDirection(worldDir);
    expect(worldDir.z).toBeGreaterThan(0.85);
    expect(worldDir.y).toBeLessThan(-0.15);
    expect(worldDir.y).toBeGreaterThan(-0.45);
    expect(cam.up.y).toBeGreaterThan(0.85);
  });
});
