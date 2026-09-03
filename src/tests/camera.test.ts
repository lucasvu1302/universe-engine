import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { CameraManager } from '../engine/camera/CameraManager';

describe('CameraManager Engine', () => {
  let camManager: CameraManager;
  let camera: THREE.PerspectiveCamera;

  beforeEach(() => {
    camManager = CameraManager.getInstance();
    camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 10000);
    camManager.setCamera(camera);
    camManager.state = 'ORBIT';
    camManager.activeFocusId = null;
    camManager.targetDistance = 180;
  });

  it('initializes camera position looking at target', () => {
    expect(camManager.camera).not.toBeNull();
    expect(camManager.state).toBe('ORBIT');
  });

  it('updates orbit spherical target with polar clamping', () => {
    camManager.rotateOrbit(0.2, 5.0); // Extreme vertical delta
    expect(camManager.targetSpherical.phi).toBeLessThan(Math.PI);
    expect(camManager.targetSpherical.phi).toBeGreaterThan(0);
  });

  it('smoothly scales zoom distance exponentially with adaptive clamping', () => {
    const initialDistance = camManager.targetDistance;
    camManager.zoomOrbit(100); // Zoom out
    expect(camManager.targetDistance).toBeGreaterThan(initialDistance);

    // Extreme zoom in
    camManager.zoomOrbit(-10000);
    expect(camManager.targetDistance).toBeGreaterThanOrEqual(camManager.getAdaptiveMinDistance());

    // Extreme zoom out
    camManager.zoomOrbit(10000);
    expect(camManager.targetDistance).toBeLessThanOrEqual(camManager.getAdaptiveMaxDistance());
  });

  it('integrates 6-DOF velocity during Free Flight mode', () => {
    camManager.state = 'FREE_FLIGHT';
    camManager.velocity.set(0, 0, 0);

    camManager.updateFreeFlight(
      0.05,
      { forward: true, boost: false },
      0,
      0
    );

    expect(camManager.velocity.length()).toBeGreaterThan(0);
  });

  it('calculates live body positions for orbiting planets', () => {
    const pos = camManager.getLiveBodyPosition('earth');
    expect(pos.length()).toBeGreaterThan(0);
  });

  it('calculates hierarchical world positions for moons relative to their parent planet', () => {
    const jupiterPos = camManager.getLiveBodyPosition('jupiter');
    const europaPos = camManager.getLiveBodyPosition('europa');
    expect(jupiterPos.length()).toBeGreaterThan(0);
    expect(europaPos.length()).toBeGreaterThan(0);
    // Europa must be within satellite orbital distance of Jupiter
    const dist = europaPos.distanceTo(jupiterPos);
    expect(dist).toBeGreaterThan(0);
    expect(dist).toBeLessThan(30);
  });

  it('calculates deep space coordinates for the supermassive black hole', () => {
    const bhPos = camManager.getLiveBodyPosition('blackhole');
    expect(bhPos.z).toBe(-1200);
  });
});

