import * as THREE from 'three';
import gsap from 'gsap';
import { CameraMode, useAppStore } from '@/stores/useAppStore';
import { CELESTIAL_BODIES } from '@/data/celestialData';
import { SimulationClock } from '@/engine/simulation/SimulationClock';
import { AudioManager } from '@/engine/audio/AudioManager';

export interface CameraBookmark {
  id: string;
  name: string;
  position: THREE.Vector3;
  target: THREE.Vector3;
}

export class CameraManager {
  private static instance: CameraManager;

  public camera: THREE.PerspectiveCamera | null = null;
  public state: CameraMode = 'ORBIT';
  public activeFocusId: string | null = null;

  // Orbit controls state
  public target = new THREE.Vector3(0, 0, 0);
  public currentDistance = 180;
  public targetDistance = 180;
  public spherical = new THREE.Spherical(180, Math.PI / 3.2, Math.PI / 4);
  public targetSpherical = new THREE.Spherical(180, Math.PI / 3.2, Math.PI / 4);

  // Free Flight physics state
  public velocity = new THREE.Vector3();
  public maxSpeed = 120.0;
  public acceleration = 85.0;
  public drag = 0.92;
  public euler = new THREE.Euler(0, 0, 0, 'YXZ');

  // Active GSAP timeline for cancel-safe transitions
  private currentTween: gsap.core.Timeline | null = null;

  // Scratch vectors for zero allocation
  private readonly tempVec = new THREE.Vector3();
  private readonly moveDir = new THREE.Vector3();
  private readonly parentScratch = new THREE.Vector3();

  private constructor() {}

  public static getInstance(): CameraManager {
    if (!CameraManager.instance) {
      CameraManager.instance = new CameraManager();
    }
    return CameraManager.instance;
  }

  public setCamera(camera: THREE.PerspectiveCamera): void {
    this.camera = camera;
    this.camera.position.setFromSpherical(this.spherical).add(this.target);
    this.camera.lookAt(this.target);
  }

  /**
   * Calculates the exact real-time world position of any celestial body (planet, moon, or black hole).
   */
  public getLiveBodyPosition(id: string, target = new THREE.Vector3()): THREE.Vector3 {
    const data = CELESTIAL_BODIES[id];
    if (!data) {
      return target.set(0, 0, 0);
    }

    if (id === 'sun') {
      return target.set(0, 0, 0);
    }

    if (id === 'blackhole') {
      return target.set(0, 180, -1200);
    }

    // Hierarchical Moon Position relative to parent planet
    if (data.type === 'moon' && data.parentPlanetId) {
      const parentPos = this.getLiveBodyPosition(data.parentPlanetId, this.parentScratch);
      const simTime = SimulationClock.getInstance().simulationTime;
      const moonOffset = SimulationClock.calculateOrbitPosition(
        {
          distance: data.visualDistance,
          speed: data.orbitalSpeed,
          eccentricity: 0.02,
          inclinationDeg: data.orbitalInclinationDeg ?? 1.5
        },
        simTime,
        target
      );
      return moonOffset.add(parentPos);
    }

    // Primary Planetary Orbit around Sun
    const simTime = SimulationClock.getInstance().simulationTime;
    return SimulationClock.calculateOrbitPosition(
      {
        distance: data.visualDistance,
        speed: data.orbitalSpeed,
        eccentricity: data.type === 'rocky' ? 0.04 : 0.01,
        inclinationDeg: data.orbitalInclinationDeg ?? 0.0
      },
      simTime,
      target
    );
  }

  /**
   * Adaptive distance boundaries based on current focused object.
   */
  public getAdaptiveMinDistance(): number {
    if (this.state === 'GALAXY') return 80;
    if (this.activeFocusId === 'blackhole') return 35;
    if (!this.activeFocusId || this.activeFocusId === 'sun') return 25;
    const body = CELESTIAL_BODIES[this.activeFocusId];
    if (!body) return 10;
    return Math.max(body.visualRadius * 1.6, 2.0);
  }

  public getAdaptiveMaxDistance(): number {
    if (this.state === 'GALAXY') return 1200;
    if (this.activeFocusId === 'blackhole') return 600;
    if (!this.activeFocusId || this.activeFocusId === 'sun') return 3000;
    const body = CELESTIAL_BODIES[this.activeFocusId];
    if (!body) return 1500;
    return Math.max(body.visualRadius * 40, 450);
  }

  /**
   * Safe Orbit Rotation with Inertia & Damping.
   */
  public rotateOrbit(deltaTheta: number, deltaPhi: number): void {
    if (this.state !== 'ORBIT' && this.state !== 'GALAXY') return;

    this.targetSpherical.theta -= deltaTheta;
    this.targetSpherical.phi -= deltaPhi;

    this.targetSpherical.phi = Math.max(0.01, Math.min(Math.PI - 0.01, this.targetSpherical.phi));
  }

  /**
   * Smooth Exponential Zoom / Dolly.
   */
  public zoomOrbit(deltaRaw: number): void {
    if (this.state !== 'ORBIT' && this.state !== 'GALAXY') return;

    const minDistance = this.getAdaptiveMinDistance();
    const maxDistance = this.getAdaptiveMaxDistance();

    const zoomFactor = Math.exp(deltaRaw * 0.0016);
    this.targetDistance *= zoomFactor;
    this.targetDistance = Math.max(minDistance, Math.min(maxDistance, this.targetDistance));
    this.targetSpherical.radius = this.targetDistance;
  }

  /**
   * Free Flight 6-DOF Movement.
   */
  public updateFreeFlight(
    delta: number,
    keys: {
      forward?: boolean;
      backward?: boolean;
      left?: boolean;
      right?: boolean;
      up?: boolean;
      down?: boolean;
      boost?: boolean;
      precision?: boolean;
      brake?: boolean;
    },
    mouseDeltaX: number,
    mouseDeltaY: number
  ): void {
    if (!this.camera || this.state !== 'FREE_FLIGHT') return;

    const lookSpeed = 0.0022;
    this.euler.setFromQuaternion(this.camera.quaternion);
    this.euler.y -= mouseDeltaX * lookSpeed;
    this.euler.x -= mouseDeltaY * lookSpeed;
    this.euler.x = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, this.euler.x));
    this.camera.quaternion.setFromEuler(this.euler);

    this.moveDir.set(0, 0, 0);
    if (keys.forward) this.moveDir.z -= 1;
    if (keys.backward) this.moveDir.z += 1;
    if (keys.left) this.moveDir.x -= 1;
    if (keys.right) this.moveDir.x += 1;
    if (keys.up) this.moveDir.y += 1;
    if (keys.down) this.moveDir.y -= 1;

    let currentMaxSpeed = this.maxSpeed;
    if (keys.boost) currentMaxSpeed *= 3.0;
    if (keys.precision) currentMaxSpeed *= 0.25;

    if (this.moveDir.lengthSq() > 0) {
      this.moveDir.normalize();
      this.moveDir.applyQuaternion(this.camera.quaternion);
      this.velocity.addScaledVector(this.moveDir, this.acceleration * delta);

      if (this.velocity.length() > currentMaxSpeed) {
        this.velocity.setLength(currentMaxSpeed);
      }
    }

    if (keys.brake) {
      this.velocity.multiplyScalar(Math.pow(0.2, delta));
    } else {
      this.velocity.multiplyScalar(Math.pow(this.drag, delta * 30));
    }

    this.camera.position.addScaledVector(this.velocity, delta);

    const normalizedSpeed = this.velocity.length() / (this.maxSpeed * 3.0);
    AudioManager.getInstance().setWarpIntensity(normalizedSpeed);
  }

  /**
   * Cinematic transition to focus on any body.
   */
  public flyTo(
    destPosition: THREE.Vector3,
    destTarget: THREE.Vector3,
    duration = 2.4,
    onComplete?: () => void
  ): void {
    if (!this.camera) return;

    if (this.currentTween) {
      this.currentTween.kill();
      this.currentTween = null;
    }

    this.state = 'TRANSITIONING';
    useAppStore.getState().setCameraMode('TRANSITIONING');

    const startPos = this.camera.position.clone();
    const startTarget = this.target.clone();

    const midPoint = new THREE.Vector3().addVectors(startPos, destPosition).multiplyScalar(0.5);
    const detour = new THREE.Vector3(midPoint.z * 0.2, Math.abs(midPoint.x) * 0.25 + 25, -midPoint.x * 0.2);
    midPoint.add(detour);

    const curve = new THREE.QuadraticBezierCurve3(startPos, midPoint, destPosition);

    const animProgress = { t: 0 };
    AudioManager.getInstance().setWarpIntensity(0.7);

    this.currentTween = gsap.timeline({
      onUpdate: () => {
        if (!this.camera) return;
        const progress = animProgress.t;

        curve.getPoint(progress, this.tempVec);
        this.camera.position.copy(this.tempVec);

        this.target.lerpVectors(startTarget, destTarget, progress);
        this.camera.lookAt(this.target);

        AudioManager.getInstance().setWarpIntensity((1 - progress) * 0.7);
      },
      onComplete: () => {
        if (!this.camera) return;
        this.target.copy(destTarget);
        this.spherical.setFromVector3(this.camera.position.clone().sub(this.target));
        this.targetSpherical.copy(this.spherical);
        this.currentDistance = this.spherical.radius;
        this.targetDistance = this.spherical.radius;

        this.state = 'ORBIT';
        useAppStore.getState().setCameraMode('ORBIT');
        AudioManager.getInstance().setWarpIntensity(0.0);
        this.currentTween = null;

        onComplete?.();
      }
    });

    this.currentTween.to(animProgress, {
      t: 1.0,
      duration,
      ease: 'power2.inOut'
    });
  }

  /**
   * Fly to specific celestial body (planet, moon, or black hole).
   */
  public focusPlanet(id: string, onComplete?: () => void): void {
    const data = CELESTIAL_BODIES[id];
    if (!data) return;

    this.activeFocusId = id;
    const targetPos = this.getLiveBodyPosition(id).clone();
    const safeDistance = Math.max(data.visualRadius * 3.4, data.type === 'moon' ? 4.5 : 12.0);

    const destPos = new THREE.Vector3(
      targetPos.x + safeDistance * 0.7,
      targetPos.y + safeDistance * 0.4,
      targetPos.z + safeDistance * 0.7
    );

    this.flyTo(destPos, targetPos, 2.2, () => {
      this.targetDistance = safeDistance;
      this.targetSpherical.radius = safeDistance;
      this.spherical.radius = safeDistance;
      onComplete?.();
    });
  }

  /**
   * Fly to Supermassive Black Hole ("Gargantua") in deep space.
   */
  public flyToBlackHole(onComplete?: () => void): void {
    this.activeFocusId = 'blackhole';
    const targetPos = new THREE.Vector3(0, 180, -1200);
    const destPos = new THREE.Vector3(0, 210, -1080);

    this.flyTo(destPos, targetPos, 2.8, () => {
      this.targetDistance = 120;
      this.targetSpherical.radius = 120;
      this.spherical.radius = 120;
      this.state = 'ORBIT';
      useAppStore.getState().setCameraMode('ORBIT');
      onComplete?.();
    });
  }

  /**
   * Fly to Solar System full panoramic overview.
   */
  public flyToSolarSystemOverview(onComplete?: () => void): void {
    this.activeFocusId = 'sun';
    const overviewPos = new THREE.Vector3(0, 160, 210);
    const overviewTarget = new THREE.Vector3(0, 0, 0);

    this.flyTo(overviewPos, overviewTarget, 2.0, () => {
      this.targetDistance = 264;
      this.targetSpherical.radius = 264;
      this.spherical.radius = 264;
      this.state = 'ORBIT';
      useAppStore.getState().setCameraMode('ORBIT');
      onComplete?.();
    });
  }

  /**
   * Fly to Galaxy overview vantage point.
   */
  public flyToGalaxyView(onComplete?: () => void): void {
    this.activeFocusId = null;
    const galaxyPos = new THREE.Vector3(0, 260, 390);
    const galaxyTarget = new THREE.Vector3(0, 0, 0);

    this.flyTo(galaxyPos, galaxyTarget, 2.0, () => {
      this.targetDistance = 468;
      this.targetSpherical.radius = 468;
      this.spherical.radius = 468;
      this.state = 'GALAXY';
      useAppStore.getState().setCameraMode('GALAXY');
      onComplete?.();
    });
  }

  /**
   * Fly to side-by-side Planet Comparison perspective.
   */
  public flyToCompareView(onComplete?: () => void): void {
    this.activeFocusId = null;
    const comparePos = new THREE.Vector3(0, 8, 55);
    const compareTarget = new THREE.Vector3(0, 0, 0);

    this.flyTo(comparePos, compareTarget, 1.8, () => {
      this.targetDistance = 55;
      this.targetSpherical.radius = 55;
      this.spherical.radius = 55;
      this.state = 'ORBIT';
      onComplete?.();
    });
  }

  /**
   * Frame update with continuous exponential damping and live orbit tracking.
   */
  public updateOrbit(delta: number = 0.016): void {
    if (!this.camera || (this.state !== 'ORBIT' && this.state !== 'GALAXY')) return;

    if (this.activeFocusId && this.activeFocusId !== 'sun' && this.state === 'ORBIT') {
      const livePos = this.getLiveBodyPosition(this.activeFocusId);
      this.target.copy(livePos);
    }

    const damp = 1 - Math.exp(-12 * Math.min(delta, 0.05));
    this.spherical.theta = THREE.MathUtils.lerp(this.spherical.theta, this.targetSpherical.theta, damp);
    this.spherical.phi = THREE.MathUtils.lerp(this.spherical.phi, this.targetSpherical.phi, damp);
    this.spherical.radius = THREE.MathUtils.lerp(this.spherical.radius, this.targetSpherical.radius, damp);

    this.camera.position.setFromSpherical(this.spherical).add(this.target);
    this.camera.lookAt(this.target);
  }
}
