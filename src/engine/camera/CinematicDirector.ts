import * as THREE from 'three';
import { CameraManager } from './CameraManager';
import { useAppStore } from '@/stores/useAppStore';
import { CELESTIAL_BODIES } from '@/data/celestialData';

export type CinemaShotType = 'ORBITAL_DRIFT' | 'RING_SKI' | 'SLINGSHOT' | 'AUTO';

export class CinematicDirector {
  private static instance: CinematicDirector;
  private camManager: CameraManager;

  // Shot choreography timers
  private shotTimer = 0;
  private currentShotIndex = 0;
  private readonly SHOT_DURATION = 14.0; // Seconds per auto cut

  // Slingshot hyperbolic curve state
  private slingshotProgress = 0;

  // Camera shake state
  public shakeOffset = new THREE.Vector3();
  private shakeTime = 0;
  private shakeIntensity = 0;

  // Scratch vectors
  private tempPos = new THREE.Vector3();
  private tempTarget = new THREE.Vector3();

  private constructor() {
    this.camManager = CameraManager.getInstance();
  }

  public static getInstance(): CinematicDirector {
    if (!CinematicDirector.instance) {
      CinematicDirector.instance = new CinematicDirector();
    }
    return CinematicDirector.instance;
  }

  /**
   * Start or restart cinema mode
   */
  public enterCinemaMode(shotType: CinemaShotType = 'AUTO'): void {
    const store = useAppStore.getState();
    store.setCinemaMode(true);
    store.setCinemaShot(shotType);
    this.shotTimer = 0;
    this.applyShot(shotType);
  }

  public exitCinemaMode(): void {
    const store = useAppStore.getState();
    store.setCinemaMode(false);
    this.shakeIntensity = 0;
    this.shakeOffset.set(0, 0, 0);
    this.camManager.flyToSolarSystemOverview();
  }

  public applyShot(shot: CinemaShotType): void {
    const cam = this.camManager;

    if (shot === 'ORBITAL_DRIFT') {
      // 1. Orbital Sunrise Drift alongside Earth's terminator line
      const earthPos = cam.getLiveBodyPosition('earth');
      const earthRadius = CELESTIAL_BODIES.earth.visualRadius;
      
      const startPos = new THREE.Vector3(
        earthPos.x + earthRadius * 1.55,
        earthPos.y + earthRadius * 0.45,
        earthPos.z + earthRadius * 1.65
      );
      
      cam.flyTo(startPos, earthPos, 2.5);
    } else if (shot === 'RING_SKI') {
      // 2. High-speed flyby above Saturn's rings
      const saturnPos = cam.getLiveBodyPosition('saturn');
      const saturnRadius = CELESTIAL_BODIES.saturn.visualRadius;

      const ringFlybyPos = new THREE.Vector3(
        saturnPos.x + saturnRadius * 2.1,
        saturnPos.y + 1.2, // skim just 1.2 units above ring plane
        saturnPos.z + saturnRadius * 1.8
      );
      
      cam.flyTo(ringFlybyPos, saturnPos, 2.5);
    } else if (shot === 'SLINGSHOT') {
      // 3. Hyperbolic Slingshot past Jupiter into Deep Space Gargantua
      const jupiterPos = cam.getLiveBodyPosition('jupiter');
      this.slingshotProgress = 0;

      const slingStart = new THREE.Vector3(
        jupiterPos.x + 35,
        jupiterPos.y + 8,
        jupiterPos.z + 40
      );

      cam.flyTo(slingStart, jupiterPos, 2.2);
    } else if (shot === 'AUTO') {
      // Cycle through sequential artistic cuts
      const autoShots: CinemaShotType[] = ['ORBITAL_DRIFT', 'RING_SKI', 'SLINGSHOT'];
      const nextShot = autoShots[this.currentShotIndex % autoShots.length];
      this.applyShot(nextShot);
    }
  }

  /**
   * Continuous per-frame director choreography
   */
  public update(delta: number): void {
    const store = useAppStore.getState();
    if (!store.cinemaMode) return;

    this.shotTimer += delta;
    this.shakeTime += delta;

    // Handle Auto-Cut Director timer
    if (store.cinemaShot === 'AUTO' && this.shotTimer >= this.SHOT_DURATION) {
      this.shotTimer = 0;
      this.currentShotIndex++;
      this.applyShot('AUTO');
      return;
    }

    // Dynamic Camera Motion per shot
    const camera = this.camManager.camera;
    if (!camera) return;

    if (store.cinemaShot === 'ORBITAL_DRIFT' || (store.cinemaShot === 'AUTO' && this.currentShotIndex % 3 === 0)) {
      // Tangential drift orbiting slowly around Earth
      const earthPos = this.camManager.getLiveBodyPosition('earth', this.tempTarget);
      const angle = this.shotTimer * 0.08;
      const radius = CELESTIAL_BODIES.earth.visualRadius * 1.85;

      this.tempPos.set(
        earthPos.x + Math.cos(angle) * radius,
        earthPos.y + Math.sin(angle * 0.5) * 1.5 + 1.0,
        earthPos.z + Math.sin(angle) * radius
      );

      camera.position.lerp(this.tempPos, 0.04);
      camera.lookAt(earthPos);
    } else if (store.cinemaShot === 'RING_SKI' || (store.cinemaShot === 'AUTO' && this.currentShotIndex % 3 === 1)) {
      // Skimming along Saturn's ring radius
      const saturnPos = this.camManager.getLiveBodyPosition('saturn', this.tempTarget);
      const t = this.shotTimer * 0.12;
      const ringDist = 10.5 + Math.sin(t) * 2.5;

      this.tempPos.set(
        saturnPos.x + Math.cos(t) * ringDist,
        saturnPos.y + 1.4 + Math.sin(t * 2) * 0.3,
        saturnPos.z + Math.sin(t) * ringDist
      );

      camera.position.lerp(this.tempPos, 0.05);
      camera.lookAt(saturnPos);
    } else if (store.cinemaShot === 'SLINGSHOT' || (store.cinemaShot === 'AUTO' && this.currentShotIndex % 3 === 2)) {
      // Accelerating hyperbolic slingshot
      this.slingshotProgress += delta * 0.18;
      const jupiterPos = this.camManager.getLiveBodyPosition('jupiter', this.tempTarget);

      const p = this.slingshotProgress;
      const x = jupiterPos.x + (1 - p) * 35 - p * 60;
      const y = jupiterPos.y + Math.sin(p * Math.PI) * 12;
      const z = jupiterPos.z + Math.cos(p * Math.PI * 0.5) * 40 - p * 120;

      this.tempPos.set(x, y, z);
      camera.position.lerp(this.tempPos, 0.08);

      // Target shifts from Jupiter to deep space Gargantua
      const deepSpaceTarget = new THREE.Vector3(0, 180, -1200);
      const blendedTarget = this.tempTarget.lerp(deepSpaceTarget, Math.min(1.0, p * 1.5));
      camera.lookAt(blendedTarget);
    }

    // Dynamic Camera Shake calculation (aerodynamic / gravitational turbulence)
    const targetId = store.targetId;
    this.shakeIntensity = targetId === 'blackhole' ? 0.045 : 0.012;

    const shakeX = Math.sin(this.shakeTime * 18.0) * this.shakeIntensity;
    const shakeY = Math.cos(this.shakeTime * 22.0) * this.shakeIntensity;
    const shakeZ = Math.sin(this.shakeTime * 15.0) * this.shakeIntensity;

    this.shakeOffset.set(shakeX, shakeY, shakeZ);
    camera.position.add(this.shakeOffset);
  }
}
