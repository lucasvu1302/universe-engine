import * as THREE from 'three';
import { ActiveCosmicLab, ActiveSurface, CameraMode, useAppStore } from '@/stores/useAppStore';
import { CELESTIAL_BODIES } from '@/data/celestialData';
import { SimulationClock } from '@/engine/simulation/SimulationClock';
import { AudioManager } from '@/engine/audio/AudioManager';
import { SpacecraftEphemeris } from '@/engine/ephemeris/SpacecraftEphemeris';
import {
  computeHotspotWorldNormal,
  getPlanetaryEventById,
  getPlanetaryEvents,
  type PlanetaryEventArchetype,
  type PlanetaryEventFrameMode,
} from '@/data/planetaryEventsData';

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
  public activeScenario: 'earth_launch' | 'earth_history' | 'cosmic_history' | 'none' = 'none';

  // Orbit controls state
  public target = new THREE.Vector3(0, 0, 0);
  public currentDistance = 180;
  public targetDistance = 180;
  public spherical = new THREE.Spherical(180, Math.PI / 3.2, Math.PI / 4);
  public targetSpherical = new THREE.Spherical(180, Math.PI / 3.2, Math.PI / 4);

  // Free Flight physics & damped zero-roll look state
  public velocity = new THREE.Vector3();
  public maxSpeed = 120.0;
  public acceleration = 85.0;
  public drag = 0.92;
  public euler = new THREE.Euler(0, 0, 0, 'YXZ');
  private flightModeInitialized = false;
  private flightYaw = 0;
  private flightPitch = 0;
  private flightTargetYaw = 0;
  private flightTargetPitch = 0;

  // Unified in-frame Bezier transition & live moving-body tracking state (zero dual-rAF desync!)
  public galaxyBlend = 0;
  private galaxyDesired = false;
  private transitionStartGalaxyBlend = 0;
  private transitionTargetMode: CameraMode = 'ORBIT';
  private transitionActive = false;
  private transitionElapsed = 0;
  private transitionDuration = 2.0;
  private transitionOnComplete: (() => void) | null = null;
  private tweenFocusId: string | null = null;
  private prevHostAzimuth: number | null = null;
  private prevSimTimeForOrbit: number | null = null;
  private prevFocusIdForAzimuth: string | null = null;
  private readonly tweenRelativeOffset = new THREE.Vector3();
  private readonly tweenStartPos = new THREE.Vector3();
  private readonly tweenStartTarget = new THREE.Vector3();
  private readonly tweenDestTarget = new THREE.Vector3();
  private tweenCurve: THREE.QuadraticBezierCurve3 | null = null;

  // Scratch vectors for zero allocation
  private readonly tempVec = new THREE.Vector3();
  private readonly relCurScratch = new THREE.Vector3();
  private readonly relTgtScratch = new THREE.Vector3();
  private readonly issOrbitAxis = new THREE.Vector3(
    0,
    -Math.cos(THREE.MathUtils.degToRad(51.6)),
    -Math.sin(THREE.MathUtils.degToRad(51.6))
  ).normalize();
  private readonly moveDir = new THREE.Vector3();
  private readonly parentScratch = new THREE.Vector3();
  private readonly orbitFocusPos = new THREE.Vector3();
  private readonly issZenithScratch = new THREE.Vector3();
  private readonly issTangentScratch = new THREE.Vector3();
  private readonly panRight = new THREE.Vector3();
  private readonly panUp = new THREE.Vector3();
  private readonly hotspotNormalScratch = new THREE.Vector3();
  private readonly hotspotTangentScratch = new THREE.Vector3();
  private readonly hotspotUpScratch = new THREE.Vector3(0, 1, 0);
  private readonly hotspotAltUpScratch = new THREE.Vector3(1, 0, 0);
  private readonly hotspotSpinAxisScratch = new THREE.Vector3(0, 1, 0);
  private activeHotspotTrack: {
    bodyId: string;
    frameMode: PlanetaryEventFrameMode;
    superRotation: number;
  } | null = null;
  private tweenHotspot: {
    bodyId: string;
    latDeg: number;
    lonDeg: number;
    superRotation: number;
    frameMode: PlanetaryEventFrameMode;
    archetype?: PlanetaryEventArchetype;
    distance: number;
    minClearance: number;
  } | null = null;

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
    const out = target;
    const data = CELESTIAL_BODIES[id];
    if (!data) {
      return out.set(0, 0, 0);
    }

    if (id === 'sun') {
      return out.set(0, 0, 0);
    }

    if (id === 'blackhole') {
      return out.set(0, 180, -1200);
    }

    if (id === 'pulsar') {
      return out.set(-650, 220, -750);
    }

    if (id === 'iss') {
      const earthPos = this.getLiveBodyPosition('earth', this.parentScratch);
      const simTime = SimulationClock.getInstance().simulationTime;
      return SpacecraftEphemeris.getInstance().getISSPosition(simTime, earthPos, out);
    }

    if (id === 'jwst') {
      const earthPos = this.getLiveBodyPosition('earth', this.parentScratch);
      const simTime = SimulationClock.getInstance().simulationTime;
      return SpacecraftEphemeris.getInstance().getJWSTPosition(simTime, earthPos, out);
    }

    if (id === 'voyager1') {
      return SpacecraftEphemeris.getInstance().getVoyager1Position(out);
    }

    if (id === 'voyager2') {
      return SpacecraftEphemeris.getInstance().getVoyager2Position(out);
    }

    if (data.type === 'constellation') {
      const raRad = THREE.MathUtils.degToRad((data.raHours ?? 0) * 15.0);
      const decRad = THREE.MathUtils.degToRad(data.decDeg ?? 0);
      const cosDec = Math.cos(decRad);
      return out.set(
        6420 * cosDec * Math.cos(raRad),
        6420 * Math.sin(decRad),
        6420 * cosDec * Math.sin(raRad)
      );
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
        out
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
      out
    );
  }

  /**
   * Adaptive distance boundaries based on current focused object.
   */
  public getAdaptiveMinDistance(): number {
    const store = useAppStore.getState();
    if (store.activeCosmicLab === 'planetarium') return 0.5;
    if (store.activeCosmicLab !== 'none') return 5.0;
    if (store.activeEventSurfaceId !== null) return 4.0;
    if (store.activeSurface !== 'none') return 2.0;
    if (store.inExoSystem) return 5.0;
    if (this.state === 'GALAXY') return 80;
    if (this.activeFocusId === 'blackhole') return 35;
    if (this.activeFocusId === 'pulsar') return 15;
    if (this.activeFocusId === 'iss') return 0.35;
    if (this.activeFocusId === 'jwst') return 0.35;
    if (this.activeFocusId === 'voyager1' || this.activeFocusId === 'voyager2') return 2.0;
    if (!this.activeFocusId && store.targetId?.startsWith('constellation_')) return 0.8;
    if (!this.activeFocusId || this.activeFocusId === 'sun') return 25;
    const body = CELESTIAL_BODIES[this.activeFocusId];
    if (!body) return 10;
    return Math.max(body.visualRadius * 1.6, 2.0);
  }

  public getAdaptiveMaxDistance(): number {
    const store = useAppStore.getState();
    if (store.activeCosmicLab === 'planetarium') return 3.0;
    if (store.activeCosmicLab !== 'none') return 95.0;
    if (store.activeEventSurfaceId !== null) return 46.0;
    if (store.activeSurface !== 'none') return 48.0;
    if (store.inExoSystem) return 140.0;
    if (this.state === 'GALAXY') return 1200;
    if (this.activeFocusId === 'blackhole') return 600;
    if (this.activeFocusId === 'pulsar') return 350;
    if (this.activeFocusId === 'iss' || this.activeFocusId === 'jwst') return 30.0;
    if (!this.activeFocusId && store.targetId?.startsWith('constellation_')) return 18.0;
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

    // User manually dragged the orbit camera: release automatic hotspot spin-lock immediately
    this.activeHotspotTrack = null;

    this.targetSpherical.theta -= deltaTheta;
    this.targetSpherical.phi -= deltaPhi;

    this.targetSpherical.phi = Math.max(0.01, Math.min(Math.PI - 0.01, this.targetSpherical.phi));
  }

  /**
   * Free Camera Pan (Translate Target in Camera View Plane)
   */
  public panOrbit(deltaX: number, deltaY: number): void {
    if (!this.camera || (this.state !== 'ORBIT' && this.state !== 'GALAXY')) return;

    // Detach from rigid body tracking when manually panning
    this.activeFocusId = null;

    // Calculate pan factor proportional to current distance
    const panFactor = this.currentDistance * 0.0018;

    // Camera local axes (reusing static scratch vectors)
    this.camera.matrix.extractBasis(this.panRight, this.panUp, this.tempVec);

    this.panRight.multiplyScalar(-deltaX * panFactor);
    this.panUp.multiplyScalar(deltaY * panFactor);

    this.target.add(this.panRight).add(this.panUp);
  }

  public isGalaxyTargetActive(): boolean {
    return this.galaxyDesired;
  }

  public exitGalaxyMode(immediate = false): void {
    this.galaxyDesired = false;
    if (immediate) {
      this.galaxyBlend = 0;
      this.transitionStartGalaxyBlend = 0;
    }
  }

  private stepGalaxyBlend(dt: number): void {
    const target = this.galaxyDesired ? 1.0 : 0.0;
    const diff = target - this.galaxyBlend;
    if (Math.abs(diff) <= 0.002) {
      this.galaxyBlend = target;
    } else if (dt > 0) {
      const damp = 1 - Math.exp(-8.0 * dt);
      this.galaxyBlend += diff * damp;
    }
  }

  /**
   * Switches camera to ground surface view for Mars, Moon, Europa, or Titan exploration.
   */
  public setSurfaceMode(surface: ActiveSurface): void {
    if (surface === 'none') return;

    this.cancelActiveTransition();
    this.exitGalaxyMode(true);
    this.setFov(50);

    this.activeFocusId = null;
    this.state = 'ORBIT';
    useAppStore.getState().setCameraMode('ORBIT');

    this.target.set(0, 0.4, 0);
    const startPos =
      surface === 'mars'
        ? new THREE.Vector3(0, 3.2, 16)
        : surface === 'europa'
        ? new THREE.Vector3(0, 3.0, 15.5)
        : surface === 'titan'
        ? new THREE.Vector3(0, 2.8, 15.0)
        : new THREE.Vector3(0, 2.5, 14);

    if (this.camera) {
      this.camera.up.set(0, 1, 0);
      this.camera.position.copy(startPos);
      this.camera.lookAt(this.target);
    }

    this.spherical.setFromVector3(startPos.clone().sub(this.target));
    this.targetSpherical.copy(this.spherical);
    this.currentDistance = this.spherical.radius;
    this.targetDistance = this.spherical.radius;
  }

  /**
   * Updates the active perspective camera vertical FOV cleanly (used by Planetarium Telescope mode & reset).
   */
  public setFov(fov: number): void {
    if (!this.camera) return;
    const clamped = Number.isFinite(fov) ? Math.max(10, Math.min(85, fov)) : 50;
    if (Math.abs(this.camera.fov - clamped) > 0.01) {
      this.camera.fov = clamped;
      this.camera.updateProjectionMatrix();
    }
  }

  /**
   * Positions the observatory camera for each standalone 3D Cosmic Lab.
   */
  public setCosmicLabMode(lab: ActiveCosmicLab): void {
    if (lab === 'none') {
      this.setFov(50);
      return;
    }

    this.cancelActiveTransition();
    this.exitGalaxyMode(true);
    this.activeFocusId = null;
    this.state = 'ORBIT';
    useAppStore.getState().setCameraMode('ORBIT');
    this.setFov(50);

    let startPos = new THREE.Vector3(0, 2.5, 22);
    let destTarget = new THREE.Vector3(0, 0, 0);

    if (lab === 'eclipse') {
      startPos = new THREE.Vector3(0, 0.8, 22);
      destTarget = new THREE.Vector3(0, 0, 0);
    } else if (lab === 'binary_merger') {
      startPos = new THREE.Vector3(0, 14, 24);
      destTarget = new THREE.Vector3(0, 0, 0);
    } else if (lab === 'stellar_lab') {
      startPos = new THREE.Vector3(0, 3.2, 23);
      destTarget = new THREE.Vector3(0, 0, 0);
    } else if (lab === 'planetarium') {
      // Observer standing inside the 360° sky dome at +8° pitch framing northern ridge, N compass, Polaris, Milky Way & Perseids
      destTarget = new THREE.Vector3(0, 2.55, -2.4);
      startPos = new THREE.Vector3(0, 2.1, 0.0);
    } else if (lab === 'nbody_sandbox') {
      startPos = new THREE.Vector3(0, 12.5, 16.5);
      destTarget = new THREE.Vector3(0, 0, 0);
    } else if (lab === 'mars_terraform') {
      startPos = new THREE.Vector3(0, 2.4, 15.8);
      destTarget = new THREE.Vector3(0, 0.2, 0);
    } else if (lab === 'planetary_cutaway') {
      startPos = new THREE.Vector3(9.4, 5.8, 15.2);
      destTarget = new THREE.Vector3(0, -0.55, 0);
    } else if (lab === 'planetary_defense') {
      startPos = new THREE.Vector3(2.2, 10.5, 22.0);
      destTarget = new THREE.Vector3(0, 0, 0);
    } else if (lab === 'trappist_exoplanets') {
      startPos = new THREE.Vector3(0, 13.0, 27.0);
      destTarget = new THREE.Vector3(0, -0.7, 0);
    } else if (lab === 'dyson_megastructure') {
      startPos = new THREE.Vector3(0, 8.2, 26.8);
      destTarget = new THREE.Vector3(0, -1.25, 0);
    } else if (lab === 'relativity_lab') {
      startPos = new THREE.Vector3(0, 0.2, 18.5);
      destTarget = new THREE.Vector3(0, 0, 0);
    } else if (lab === 'kessler_leo') {
      startPos = new THREE.Vector3(0, 6.8, 20.6);
      destTarget = new THREE.Vector3(0, -0.85, 0);
    }

    this.applyImmediateOrbitPose(startPos, destTarget);
  }

  /**
   * Transitions camera pose cleanly for multi-view Wave 2 Cosmic Labs (surface_e, oneill_cylinder, bh_dive)
   * while synchronizing spherical orbit state so updateOrbit never fights the sub-view.
   */
  public setCosmicLabSubView(lab: ActiveCosmicLab, subView: string): void {
    let startPos = new THREE.Vector3(0, 3, 20);
    let destTarget = new THREE.Vector3(0, 0, 0);

    if (lab === 'trappist_exoplanets') {
      if (subView === 'surface_e') {
        startPos = new THREE.Vector3(0, 2.6, 13.8);
        destTarget = new THREE.Vector3(0, 2.2, -12.0);
      } else {
        startPos = new THREE.Vector3(0, 13.0, 27.0);
        destTarget = new THREE.Vector3(0, -0.7, 0);
      }
    } else if (lab === 'dyson_megastructure') {
      if (subView === 'oneill_cylinder') {
        startPos = new THREE.Vector3(0, 0.3, 14.5);
        destTarget = new THREE.Vector3(0, 0.2, -8.0);
      } else {
        startPos = new THREE.Vector3(0, 8.2, 26.8);
        destTarget = new THREE.Vector3(0, -1.25, 0);
      }
    } else if (lab === 'relativity_lab') {
      if (subView === 'bh_dive') {
        startPos = new THREE.Vector3(0, 0.0, 14.0);
        destTarget = new THREE.Vector3(0, 0, 0);
      } else {
        startPos = new THREE.Vector3(0, 0.2, 18.5);
        destTarget = new THREE.Vector3(0, 0, 0);
      }
    } else {
      return;
    }

    this.cancelActiveTransition();
    this.activeFocusId = null;
    this.state = 'ORBIT';
    this.applyImmediateOrbitPose(startPos, destTarget);
  }

  private applyImmediateOrbitPose(startPos: THREE.Vector3, destTarget: THREE.Vector3): void {
    this.target.copy(destTarget);
    if (this.camera) {
      this.camera.up.set(0, 1, 0);
      this.camera.position.copy(startPos);
      this.camera.lookAt(this.target);
    }

    this.spherical.setFromVector3(startPos.clone().sub(this.target));
    this.targetSpherical.copy(this.spherical);
    this.currentDistance = this.spherical.radius;
    this.targetDistance = this.spherical.radius;
  }

  /**
   * Frames the Miller's-Planet-style immersive planetary event surface stage
   * with the hovering Ranger craft in foreground and active spectacle ahead.
   */
  public setEventSurfaceMode(eventId: string): void {
    const ev = getPlanetaryEventById(eventId);
    if (!ev) return;

    this.cancelActiveTransition();
    this.exitGalaxyMode(true);

    this.activeFocusId = null;
    this.state = 'ORBIT';
    useAppStore.getState().setCameraMode('ORBIT');

    // Pull destTarget slightly closer along identical sightline so initial radius stays inside [4.0, 46.0] (F5 fix)
    const isAuroraSky = ev.surfaceBiome === 'polar_aurora_sky';
    const startPos = isAuroraSky
      ? new THREE.Vector3(0, 6.0, 25.5)
      : new THREE.Vector3(0, 8.2, 26.5);
    const destTarget = isAuroraSky
      ? new THREE.Vector3(0, 10.96, -14.1)
      : new THREE.Vector3(0, 4.9, -14.0);

    this.applyImmediateOrbitPose(startPos, destTarget);
  }

  /**
   * Switches camera to Miller's ocean world view through wormhole.
   */
  public setExoSystemMode(active: boolean): void {
    if (!active) return;

    this.cancelActiveTransition();
    this.exitGalaxyMode(true);

    this.activeFocusId = null;
    this.state = 'ORBIT';
    useAppStore.getState().setCameraMode('ORBIT');

    this.target.set(0, 4, 0);
    const startPos = new THREE.Vector3(0, 9, 32);

    if (this.camera) {
      this.camera.up.set(0, 1, 0);
      this.camera.position.copy(startPos);
      this.camera.lookAt(this.target);
    }

    this.spherical.setFromVector3(startPos.clone().sub(this.target));
    this.targetSpherical.copy(this.spherical);
    this.currentDistance = this.spherical.radius;
    this.targetDistance = this.spherical.radius;
  }

  /**
   * Switches camera to dedicated simulation scenario mode (Launch, Earth History, Cosmic History).
   */
  public setScenarioMode(scenario: 'earth_launch' | 'earth_history' | 'cosmic_history' | 'none'): void {
    this.activeScenario = scenario;
    this.cancelActiveTransition();

    // Always restore canonical world-up horizon after any spacecraft/gravity-turn camera roll
    if (this.camera) {
      this.camera.up.set(0, 1, 0);
    }

    this.activeFocusId = null;
    if (scenario === 'none') {
      if (this.camera) {
        this.camera.lookAt(this.target);
      }
      return;
    }

    this.exitGalaxyMode(true);
    this.state = 'ORBIT';
    useAppStore.getState().setCameraMode('ORBIT');
    this.target.set(0, 0, 0);

    let startPos = new THREE.Vector3(0, 20, 110);
    if (scenario === 'earth_history') {
      startPos = new THREE.Vector3(0, 14, 65);
    } else if (scenario === 'cosmic_history') {
      startPos = new THREE.Vector3(0, 22, 125);
    }

    if (this.camera) {
      this.camera.position.copy(startPos);
      this.camera.lookAt(this.target);
    }

    this.spherical.setFromVector3(startPos);
    this.targetSpherical.copy(this.spherical);
    this.currentDistance = this.spherical.radius;
    this.targetDistance = this.spherical.radius;
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

    const dt = Number.isFinite(delta) && delta > 0 ? Math.min(delta, 0.05) : 0;
    this.stepGalaxyBlend(dt);
    const lookSpeed = 0.0022;

    if (!this.flightModeInitialized) {
      this.euler.setFromQuaternion(this.camera.quaternion, 'YXZ');
      this.flightYaw = this.euler.y;
      this.flightPitch = THREE.MathUtils.clamp(this.euler.x, -Math.PI / 2 + 0.05, Math.PI / 2 - 0.05);
      this.flightTargetYaw = this.flightYaw;
      this.flightTargetPitch = this.flightPitch;
      this.euler.z = 0;
      this.flightModeInitialized = true;
    }

    this.flightTargetYaw -= mouseDeltaX * lookSpeed;
    this.flightTargetPitch = THREE.MathUtils.clamp(
      this.flightTargetPitch - mouseDeltaY * lookSpeed,
      -Math.PI / 2 + 0.05,
      Math.PI / 2 - 0.05
    );

    const lookDamp = 1 - Math.exp(-18.0 * dt);
    this.flightYaw = THREE.MathUtils.lerp(this.flightYaw, this.flightTargetYaw, lookDamp);
    this.flightPitch = THREE.MathUtils.lerp(this.flightPitch, this.flightTargetPitch, lookDamp);
    this.euler.set(this.flightPitch, this.flightYaw, 0, 'YXZ');
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

    if (this.moveDir.lengthSq() > 0 && dt > 0) {
      this.moveDir.normalize();
      this.moveDir.applyQuaternion(this.camera.quaternion);
      this.velocity.addScaledVector(this.moveDir, this.acceleration * dt);

      if (this.velocity.length() > currentMaxSpeed) {
        this.velocity.setLength(currentMaxSpeed);
      }
    }

    if (dt > 0) {
      if (keys.brake) {
        this.velocity.multiplyScalar(Math.pow(0.2, dt));
      } else {
        this.velocity.multiplyScalar(Math.pow(this.drag, dt * 30));
      }
      this.camera.position.addScaledVector(this.velocity, dt);
    }

    const normalizedSpeed = this.velocity.length() / (this.maxSpeed * 3.0);
    AudioManager.getInstance().setWarpIntensity(normalizedSpeed);
  }

  /**
   * Cancels any active camera transition cleanly (e.g. when entering FREE_FLIGHT mid-tween).
   */
  public cancelActiveTransition(): void {
    this.transitionActive = false;
    this.transitionOnComplete = null;
    this.tweenFocusId = null;
    this.tweenHotspot = null;
    this.activeHotspotTrack = null;
    this.prevHostAzimuth = null;
    this.prevSimTimeForOrbit = null;
    this.flightModeInitialized = false;
    AudioManager.getInstance().setWarpIntensity(0.0);
  }

  /**
   * Smoothly exits 6-DOF Free Flight at the camera's current world pose without snapping back to an old body.
   */
  public exitFreeFlight(): void {
    this.cancelActiveTransition();
    this.exitGalaxyMode(false);
    this.activeFocusId = null;
    this.velocity.set(0, 0, 0);
    AudioManager.getInstance().setWarpIntensity(0.0);

    if (this.camera) {
      this.camera.up.set(0, 1, 0);
      this.camera.getWorldDirection(this.tempVec);
      if (this.tempVec.lengthSq() < 1e-4) {
        this.tempVec.set(0, 0, -1);
      } else {
        this.tempVec.normalize();
      }
      const pivotDist = 60.0;
      this.target.copy(this.camera.position).addScaledVector(this.tempVec, pivotDist);
      this.spherical.setFromVector3(this.tempVec.clone().multiplyScalar(-pivotDist));
      this.targetSpherical.copy(this.spherical);
      this.currentDistance = pivotDist;
      this.targetDistance = pivotDist;
      this.camera.lookAt(this.target);
    }

    this.state = 'ORBIT';
    useAppStore.getState().setCameraMode('ORBIT');
  }

  /**
   * Computes a zenith-above-horizon 3/4 orbital offset for ISS in its exact 51.6° orbital-plane basis
   * (issZenith, issPrograde, issOrbitAxis) so the camera stays outside LEO, frames Earth's sunlit limb,
   * and maintains >= 28° clearance from the celestial poles across the entire 360° orbit (zero gimbal twist).
   */
  private computeISSZenithOffset(issPos: THREE.Vector3, distance: number, out: THREE.Vector3): THREE.Vector3 {
    const earthPos = this.getLiveBodyPosition('earth', this.parentScratch);
    this.issZenithScratch.copy(issPos).sub(earthPos);
    if (this.issZenithScratch.lengthSq() < 1e-4) {
      this.issZenithScratch.set(1, 0, 0);
    } else {
      this.issZenithScratch.normalize();
    }
    this.issTangentScratch.crossVectors(this.issOrbitAxis, this.issZenithScratch).normalize();

    return out
      .set(0, 0, 0)
      .addScaledVector(this.issZenithScratch, 0.58)
      .addScaledVector(this.issTangentScratch, 0.79)
      .addScaledVector(this.issOrbitAxis, -0.18)
      .normalize()
      .multiplyScalar(distance);
  }

  /**
   * Computes a cold-side 3/4 optical-face hero offset for JWST aligned to the live Sun-Earth axis:
   * prominently displays all 18 gold beryllium mirror segments + 5-layer kite deck while maintaining
   * >= 63° angular separation from Earth's 20° disc so Earth & Sun never clip the viewport edge.
   */
  private computeJWSTHeroOffset(distance: number, out: THREE.Vector3): THREE.Vector3 {
    const earthPos = this.getLiveBodyPosition('earth', this.parentScratch);
    const horizLen = Math.hypot(earthPos.x, earthPos.z) || 1;
    const toSunX = -earthPos.x / horizLen;
    const toSunZ = -earthPos.z / horizLen;
    const rightX = -toSunZ;
    const rightZ = toSunX;
    return out
      .set(-toSunX * 0.34 - rightX * 0.88, 0.30, -toSunZ * 0.34 - rightZ * 0.88)
      .normalize()
      .multiplyScalar(distance);
  }

  private computeHotspotCameraOffset(
    bodyId: string,
    latDeg: number,
    lonDeg: number,
    superRotation: number,
    frameMode: PlanetaryEventFrameMode,
    distance: number,
    bodyWorldPos: THREE.Vector3,
    out: THREE.Vector3,
    archetype?: PlanetaryEventArchetype
  ): THREE.Vector3 {
    const simTime = SimulationClock.getInstance().simulationTime;
    computeHotspotWorldNormal(
      bodyId,
      latDeg,
      lonDeg,
      simTime,
      { frameMode, superRotation, bodyWorldPos },
      this.hotspotNormalScratch
    );

    const refUp =
      Math.abs(this.hotspotNormalScratch.y) > 0.92 ? this.hotspotAltUpScratch : this.hotspotUpScratch;
    this.hotspotTangentScratch.crossVectors(refUp, this.hotspotNormalScratch);
    if (this.hotspotTangentScratch.lengthSq() > 1e-6) {
      this.hotspotTangentScratch.normalize();
    } else {
      this.hotspotTangentScratch.set(1, 0, 0);
    }

    // Distinguish dramatic limb-silhouette archetypes (giant solar flare arches & sodium tail)
    // from front-3/4 volcanic/cryo plumes so vents like Venus Maat Mons & Io Pele sit clearly on the front-left face.
    const isGrazingLimb = archetype === 'solar_flare_loop' || archetype === 'plasma_tail';
    const isFrontThreeQuarterPlume = archetype === 'volcanic_plume' || archetype === 'cryo_geyser';

    if (isGrazingLimb) {
      const upWeight = latDeg < 0 ? -0.22 : 0.14;
      out
        .copy(this.hotspotNormalScratch)
        .multiplyScalar(0.56)
        .addScaledVector(this.hotspotTangentScratch, 0.80)
        .addScaledVector(refUp, upWeight)
        .normalize()
        .multiplyScalar(distance);
    } else if (isFrontThreeQuarterPlume) {
      const upWeight = latDeg < 0 ? -0.18 : 0.14;
      out
        .copy(this.hotspotNormalScratch)
        .multiplyScalar(0.72)
        .addScaledVector(this.hotspotTangentScratch, 0.66)
        .addScaledVector(refUp, upWeight)
        .normalize()
        .multiplyScalar(distance);
    } else {
      out
        .copy(this.hotspotNormalScratch)
        .multiplyScalar(0.94)
        .addScaledVector(this.hotspotTangentScratch, 0.28)
        .addScaledVector(refUp, 0.14)
        .normalize()
        .multiplyScalar(distance);
    }

    // Zero-alloc anti-solar limb clearance preserved across live tween tracking (F4 fix)
    if (bodyId !== 'sun' && bodyWorldPos.lengthSq() > 100 && out.lengthSq() > 1e-4) {
      const antiSunCos = out.dot(bodyWorldPos) / (out.length() * bodyWorldPos.length());
      if (antiSunCos > 0.94) {
        out.applyAxisAngle(this.hotspotUpScratch, 0.24);
      }
    }

    return out;
  }

  /**
   * Returns true when the camera is already closely orbiting the specified body and facing the given hotspot
   * within ~44° (used so "Trigger Surge" avoids jolting the camera when already framed, while auto-flying when off-angle).
   */
  public isViewingHotspot(
    bodyId: string,
    latDeg: number,
    lonDeg: number,
    options?: {
      superRotation?: number;
      frameMode?: PlanetaryEventFrameMode;
      archetype?: PlanetaryEventArchetype;
    }
  ): boolean {
    if (!this.camera || this.state !== 'ORBIT' || this.activeFocusId !== bodyId) return false;
    const data = CELESTIAL_BODIES[bodyId];
    if (!data) return false;

    const liveTarget = this.getLiveBodyPosition(bodyId, this.orbitFocusPos);
    this.tempVec.copy(this.camera.position).sub(liveTarget);
    const dist = this.tempVec.length();
    if (dist < 1e-4 || dist > Math.max(data.visualRadius * 4.6, 8.0)) return false;
    this.tempVec.divideScalar(dist);

    const simTime = SimulationClock.getInstance().simulationTime;
    computeHotspotWorldNormal(
      bodyId,
      latDeg,
      lonDeg,
      simTime,
      {
        frameMode: options?.frameMode ?? 'spin',
        superRotation: options?.superRotation ?? 1.0,
        bodyWorldPos: liveTarget,
      },
      this.hotspotNormalScratch
    );

    const arch = options?.archetype;
    const minDot =
      arch === 'solar_flare_loop' || arch === 'plasma_tail'
        ? 0.42
        : arch === 'volcanic_plume' || arch === 'cryo_geyser'
        ? 0.55
        : 0.72;

    return this.tempVec.dot(this.hotspotNormalScratch) >= minDot;
  }

  /**
   * Updates the active Bezier transition against live orbital/ephemeris motion so moving targets (ISS, JWST, moons)
   * never drift out of frame while SimulationClock is running.
   */
  public syncLiveFocusDuringTween(progress: number): void {
    if (!this.camera || !this.tweenCurve) return;

    if (this.tweenHotspot) {
      const hs = this.tweenHotspot;
      const liveTarget = this.getLiveBodyPosition(hs.bodyId, this.orbitFocusPos);
      this.tweenDestTarget.copy(liveTarget);
      this.computeHotspotCameraOffset(
        hs.bodyId,
        hs.latDeg,
        hs.lonDeg,
        hs.superRotation,
        hs.frameMode,
        hs.distance,
        liveTarget,
        this.tweenRelativeOffset,
        hs.archetype
      );
      this.tweenCurve.v2.copy(liveTarget).add(this.tweenRelativeOffset);
    } else if (this.tweenFocusId && this.tweenFocusId !== 'sun') {
      const liveTarget = this.getLiveBodyPosition(this.tweenFocusId, this.orbitFocusPos);
      this.tweenDestTarget.copy(liveTarget);
      if (this.tweenFocusId === 'iss') {
        const currentDist = this.tweenRelativeOffset.length() || 0.92;
        this.computeISSZenithOffset(liveTarget, currentDist, this.tweenRelativeOffset);
      } else if (this.tweenFocusId === 'jwst') {
        const currentDist = this.tweenRelativeOffset.length() || 0.43;
        this.computeJWSTHeroOffset(currentDist, this.tweenRelativeOffset);
      }
      this.tweenCurve.v2.copy(liveTarget).add(this.tweenRelativeOffset);
    }

    this.tweenCurve.getPoint(progress, this.tempVec);

    // Zero-alloc spherical clearance floor so hotspot hops never clip inside the Sun or a planet
    if (this.tweenHotspot) {
      const lx = this.tweenDestTarget.x;
      const ly = this.tweenDestTarget.y;
      const lz = this.tweenDestTarget.z;
      const dx = this.tempVec.x - lx;
      const dy = this.tempVec.y - ly;
      const dz = this.tempVec.z - lz;
      const distSq = dx * dx + dy * dy + dz * dz;
      const minClear = this.tweenHotspot.minClearance;
      if (distSq < minClear * minClear) {
        if (distSq > 1e-8) {
          const scale = minClear / Math.sqrt(distSq);
          this.tempVec.set(lx + dx * scale, ly + dy * scale, lz + dz * scale);
        } else {
          this.tempVec.set(lx, ly + minClear, lz);
        }
      }
    }

    this.camera.position.copy(this.tempVec);

    this.target.lerpVectors(this.tweenStartTarget, this.tweenDestTarget, progress);
    this.camera.lookAt(this.target);
  }

  /**
   * Advances active Bezier transition inside R3F's unified useFrame loop (zero dual-rAF desync!).
   */
  public updateTransition(delta: number = 0.016): void {
    if (!this.transitionActive || !this.camera) return;

    const dt = Number.isFinite(delta) && delta > 0 ? Math.min(delta, 0.05) : 0.016;
    this.transitionElapsed += dt;
    const rawT = Math.min(1.0, this.transitionElapsed / this.transitionDuration);
    // Quintic C2 smootherstep (zero velocity & zero acceleration at both start and arrival!)
    const eased = rawT >= 1.0 ? 1.0 : rawT * rawT * rawT * (rawT * (rawT * 6.0 - 15.0) + 10.0);

    this.syncLiveFocusDuringTween(eased);
    const targetGalaxyBlend = this.galaxyDesired ? 1.0 : 0.0;
    this.galaxyBlend = THREE.MathUtils.lerp(this.transitionStartGalaxyBlend, targetGalaxyBlend, eased);
    AudioManager.getInstance().setWarpIntensity((1 - eased) * 0.7);

    if (rawT >= 1.0) {
      this.transitionActive = false;
      this.galaxyBlend = targetGalaxyBlend;
      this.target.copy(this.tweenDestTarget);
      this.spherical.setFromVector3(this.tempVec.copy(this.camera.position).sub(this.target));
      this.targetSpherical.copy(this.spherical);
      this.currentDistance = this.spherical.radius;
      this.targetDistance = this.spherical.radius;
      this.prevSimTimeForOrbit = SimulationClock.getInstance().simulationTime;
      this.prevFocusIdForAzimuth = this.activeFocusId;
      if (this.activeFocusId === 'jwst') {
        const earthPos = this.getLiveBodyPosition('earth', this.parentScratch);
        this.prevHostAzimuth = Math.atan2(earthPos.x, earthPos.z);
      } else {
        this.prevHostAzimuth = null;
      }

      const arrivalMode = this.transitionTargetMode;
      this.state = arrivalMode;
      useAppStore.getState().setCameraMode(arrivalMode);
      AudioManager.getInstance().setWarpIntensity(0.0);
      this.activeHotspotTrack = this.tweenHotspot
        ? {
            bodyId: this.tweenHotspot.bodyId,
            frameMode: this.tweenHotspot.frameMode,
            superRotation: this.tweenHotspot.superRotation,
          }
        : null;
      this.tweenFocusId = null;
      this.tweenHotspot = null;

      const cb = this.transitionOnComplete;
      this.transitionOnComplete = null;
      cb?.();
    }
  }

  /**
   * Cinematic transition to focus on any body or sky vantage point.
   */
  public flyTo(
    destPosition: THREE.Vector3,
    destTarget: THREE.Vector3,
    duration = 2.4,
    onComplete?: () => void,
    liveFocusId: string | null = null,
    relativeOffset?: THREE.Vector3,
    finalMode: CameraMode = 'ORBIT'
  ): void {
    if (!this.camera) return;

    this.cancelActiveTransition();

    this.transitionTargetMode = finalMode;
    this.galaxyDesired = finalMode === 'GALAXY';
    this.transitionStartGalaxyBlend = this.galaxyBlend;

    this.state = 'TRANSITIONING';
    useAppStore.getState().setCameraMode('TRANSITIONING');
    this.camera.up.set(0, 1, 0);

    this.tweenFocusId = liveFocusId;
    if (relativeOffset) {
      this.tweenRelativeOffset.copy(relativeOffset);
    } else {
      this.tweenRelativeOffset.copy(destPosition).sub(destTarget);
    }
    this.tweenStartPos.copy(this.camera.position);
    this.tweenStartTarget.copy(this.target);
    this.tweenDestTarget.copy(destTarget);

    const midPoint = new THREE.Vector3().addVectors(this.tweenStartPos, destPosition).multiplyScalar(0.5);
    const chordLen = this.tweenStartPos.distanceTo(destPosition);
    const chordX = destPosition.x - this.tweenStartPos.x;
    const chordZ = destPosition.z - this.tweenStartPos.z;
    const horizChord = Math.hypot(chordX, chordZ);
    const sideScale = Math.min(20, chordLen * 0.12);
    const perpX = horizChord > 1e-4 ? -chordZ / horizChord : 0;
    const perpZ = horizChord > 1e-4 ? chordX / horizChord : 0;
    const arcLift = Math.min(25, Math.max(2.0, chordLen * 0.18));
    midPoint.set(
      midPoint.x + perpX * sideScale,
      midPoint.y + arcLift,
      midPoint.z + perpZ * sideScale
    );

    this.tweenCurve = new THREE.QuadraticBezierCurve3(
      this.tweenStartPos.clone(),
      midPoint,
      destPosition.clone()
    );

    this.transitionDuration = Math.max(0.05, duration);
    this.transitionElapsed = 0;
    this.transitionOnComplete = onComplete ?? null;
    this.transitionActive = true;
    AudioManager.getInstance().setWarpIntensity(0.7);
  }

  /**
   * Rotates and positions the observatory camera above/below the ecliptic to frame an IAU constellation
   * dead-center against unobstructed starry sky.
   */
  public focusConstellation(id: string, onComplete?: () => void): void {
    const data = CELESTIAL_BODIES[id];
    if (!data || data.type !== 'constellation') return;

    const store = useAppStore.getState();
    if (!store.showStarMap) {
      store.toggleStarMap();
    }
    store.setCompareMode(false);
    store.setActiveSurface('none');
    store.setActiveEventSurfaceId(null);
    store.setInExoSystem(false);

    this.activeFocusId = null;
    const raRad = THREE.MathUtils.degToRad((data.raHours ?? 0) * 15.0);
    const decRad = THREE.MathUtils.degToRad(data.decDeg ?? 0);
    const cosDec = Math.cos(decRad);
    const dir = new THREE.Vector3(
      cosDec * Math.cos(raRad),
      Math.sin(decRad),
      cosDec * Math.sin(raRad)
    ).normalize();

    const vantageY = dir.y >= 0 ? 74.0 : -74.0;
    const lookPivotDist = 2.5;
    const destTarget = new THREE.Vector3(0, vantageY, 0);
    const destPos = destTarget.clone().addScaledVector(dir, -lookPivotDist);

    this.flyTo(destPos, destTarget, 1.8, () => {
      this.targetDistance = lookPivotDist;
      this.targetSpherical.radius = lookPivotDist;
      this.spherical.radius = lookPivotDist;
      this.state = 'ORBIT';
      useAppStore.getState().setCameraMode('ORBIT');
      onComplete?.();
    });
  }

  /**
   * Fly to specific celestial body (planet, moon, spacecraft, constellation, or black hole)
   * using sun-relative 3/4 cinema framing and continuous live-ephemeris tracking.
   */
  public focusPlanet(id: string, onComplete?: () => void): void {
    if (CELESTIAL_BODIES[id]?.type === 'constellation') {
      this.focusConstellation(id, onComplete);
      return;
    }

    if (id === 'iss' || id === 'jwst' || id === 'voyager1' || id === 'voyager2') {
      this.activeFocusId = id;
      const targetPos = this.getLiveBodyPosition(id).clone();
      const horizLen = Math.hypot(targetPos.x, targetPos.z) || 1;
      const toSunX = -targetPos.x / horizLen;
      const toSunZ = -targetPos.z / horizLen;
      const rightX = -toSunZ;
      const rightZ = toSunX;

      let safeDistance = 8.6;
      const relOffset = new THREE.Vector3();
      if (id === 'iss') {
        safeDistance = 0.92;
        this.computeISSZenithOffset(targetPos, safeDistance, relOffset);
      } else if (id === 'jwst') {
        safeDistance = 0.43;
        this.computeJWSTHeroOffset(safeDistance, relOffset);
      } else {
        // Voyager 1 & 2: sunward (+toSun) 3/4 angle framing 100% of dish, 10-sided bus, RTG & Astromast booms
        safeDistance = 8.4;
        relOffset
          .set(toSunX * 0.68 + rightX * 0.64, 0.18, toSunZ * 0.68 + rightZ * 0.64)
          .normalize()
          .multiplyScalar(safeDistance);
      }

      const destPos = targetPos.clone().add(relOffset);
      this.flyTo(
        destPos,
        targetPos,
        1.9,
        () => {
          this.targetDistance = safeDistance;
          this.targetSpherical.radius = safeDistance;
          this.spherical.radius = safeDistance;
          this.state = 'ORBIT';
          useAppStore.getState().setCameraMode('ORBIT');
          onComplete?.();
        },
        id,
        relOffset
      );
      return;
    }

    const data = CELESTIAL_BODIES[id];
    if (!data) return;

    this.activeFocusId = id;
    const targetPos = this.getLiveBodyPosition(id).clone();
    const safeDistance = Math.max(data.visualRadius * 3.35, data.type === 'moon' ? 4.2 : 11.5);

    // Cinema 3/4 sunlit crescent/gibbous phase angle (eliminates 80% dark nightside & inner-system moon photobombs!)
    const horizLen = Math.hypot(targetPos.x, targetPos.z);
    let destPos: THREE.Vector3;
    if (horizLen > 1.0) {
      const toSunX = -targetPos.x / horizLen;
      const toSunZ = -targetPos.z / horizLen;
      const rightX = -toSunZ;
      const rightZ = toSunX;
      const dir = new THREE.Vector3(
        toSunX * 0.54 - rightX * 0.76,
        0.38,
        toSunZ * 0.54 - rightZ * 0.76
      ).normalize();
      destPos = targetPos.clone().addScaledVector(dir, safeDistance);
    } else {
      destPos = new THREE.Vector3(
        targetPos.x + safeDistance * 0.7,
        targetPos.y + safeDistance * 0.4,
        targetPos.z + safeDistance * 0.7
      );
    }

    const relOffset = destPos.clone().sub(targetPos);
    this.flyTo(
      destPos,
      targetPos,
      2.2,
      () => {
        this.targetDistance = safeDistance;
        this.targetSpherical.radius = safeDistance;
        this.spherical.radius = safeDistance;
        onComplete?.();
      },
      id,
      relOffset
    );
  }

  /**
   * Glides the observatory camera directly onto a live surface/atmospheric hotspot
   * at (latDeg, lonDeg) on any body with planetary events, syncing live spin & axial tilt during flight.
   */
  public focusPlanetHotspot(
    bodyId: string,
    latDeg: number,
    lonDeg: number,
    options?: {
      superRotation?: number;
      frameMode?: PlanetaryEventFrameMode;
      archetype?: PlanetaryEventArchetype;
      distanceMultiplier?: number;
      onComplete?: () => void;
    }
  ): void {
    if (!this.camera) return;
    if (!Number.isFinite(latDeg) || !Number.isFinite(lonDeg)) return;
    if (getPlanetaryEvents(bodyId).length === 0) return;

    const data = CELESTIAL_BODIES[bodyId];
    if (!data) return;

    this.activeFocusId = bodyId;
    // Compute post-transition orbital floor directly so calling from GALAXY (minDist=80) never lands outside LOD cullDist
    const minDist = bodyId === 'sun' ? 25 : Math.max(data.visualRadius * 1.6, 2.0);
    const archetype = options?.archetype;
    const isLimbMoon =
      data.type === 'moon' && (archetype === 'volcanic_plume' || archetype === 'cryo_geyser');
    const mult =
      options?.distanceMultiplier !== undefined &&
      Number.isFinite(options.distanceMultiplier) &&
      options.distanceMultiplier > 0
        ? options.distanceMultiplier
        : isLimbMoon
        ? 3.6
        : 3.1;
    const safeDistance = Math.max(data.visualRadius * mult, minDist);
    const superRotation =
      options?.superRotation !== undefined && Number.isFinite(options.superRotation)
        ? options.superRotation
        : 1.0;
    const frameMode: PlanetaryEventFrameMode = options?.frameMode ?? 'spin';

    const targetPos = this.getLiveBodyPosition(bodyId, this.orbitFocusPos).clone();
    const relOffset = this.computeHotspotCameraOffset(
      bodyId,
      latDeg,
      lonDeg,
      superRotation,
      frameMode,
      safeDistance,
      targetPos,
      new THREE.Vector3(),
      archetype
    );
    const destPos = targetPos.clone().add(relOffset);

    this.flyTo(
      destPos,
      targetPos,
      1.9,
      () => {
        this.targetDistance = safeDistance;
        this.targetSpherical.radius = safeDistance;
        this.spherical.radius = safeDistance;
        options?.onComplete?.();
      },
      bodyId,
      relOffset
    );

    if (this.transitionActive) {
      // Push Bezier midpoint radially outside the body so antipodal/polar hops swing cleanly around the sphere
      if (this.tweenCurve) {
        const minCtrlDist = Math.max(safeDistance * 2.1, data.visualRadius * 4.2);
        this.tempVec.copy(this.tweenCurve.v1).sub(targetPos);
        if (this.tempVec.lengthSq() < 1e-4) {
          this.tempVec.crossVectors(this.hotspotUpScratch, relOffset);
          if (this.tempVec.lengthSq() < 1e-4) {
            this.tempVec.crossVectors(this.hotspotAltUpScratch, relOffset);
          }
        }
        if (this.tempVec.length() < minCtrlDist) {
          this.tempVec.normalize().multiplyScalar(minCtrlDist);
          this.tweenCurve.v1.copy(targetPos).add(this.tempVec);
        }
      }

      this.tweenHotspot = {
        bodyId,
        latDeg,
        lonDeg,
        superRotation,
        frameMode,
        archetype,
        distance: safeDistance,
        minClearance: Math.max(data.visualRadius * 1.5, 2.0),
      };
    }
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
   * Fly to Relativistic Pulsar (Neutron Star) in deep space.
   */
  public flyToPulsar(onComplete?: () => void): void {
    this.activeFocusId = 'pulsar';
    const targetPos = new THREE.Vector3(-650, 220, -750);
    const destPos = new THREE.Vector3(-650, 235, -670);

    this.flyTo(destPos, targetPos, 2.5, () => {
      this.targetDistance = 80;
      this.targetSpherical.radius = 80;
      this.spherical.radius = 80;
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
   * Fly to Galaxy overview vantage point with continuous zero-flash crossfade.
   */
  public flyToGalaxyView(onComplete?: () => void): void {
    this.activeFocusId = null;
    const galaxyPos = new THREE.Vector3(0, 260, 390);
    const galaxyTarget = new THREE.Vector3(0, 0, 0);

    if (!this.camera) {
      this.galaxyDesired = true;
      this.galaxyBlend = 1;
      this.state = 'GALAXY';
      useAppStore.getState().setCameraMode('GALAXY');
      onComplete?.();
      return;
    }

    this.flyTo(
      galaxyPos,
      galaxyTarget,
      2.0,
      () => {
        this.targetDistance = 468;
        this.targetSpherical.radius = 468;
        this.spherical.radius = 468;
        onComplete?.();
      },
      null,
      undefined,
      'GALAXY'
    );
  }

  /**
   * Fly to side-by-side Planet Comparison perspective.
   */
  public flyToCompareView(onComplete?: () => void): void {
    this.exitGalaxyMode(true);
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
   * Captures current camera viewpoint with live body-relative offset so orbiting targets stay locked.
   */
  public captureBookmarkPayload(
    name: string,
    fallbackTargetId: string | null = null
  ): {
    name: string;
    targetId: string | null;
    position: [number, number, number];
    target: [number, number, number];
    offset?: [number, number, number];
  } {
    const resolvedTargetId = this.activeFocusId ?? fallbackTargetId;
    const posVec = this.camera ? this.camera.position : new THREE.Vector3(110, 35, 95);
    const pos: [number, number, number] = [
      +posVec.x.toFixed(2),
      +posVec.y.toFixed(2),
      +posVec.z.toFixed(2),
    ];
    const tgt: [number, number, number] = [
      +this.target.x.toFixed(2),
      +this.target.y.toFixed(2),
      +this.target.z.toFixed(2),
    ];

    let offset: [number, number, number] | undefined;
    const isConstellationTarget = Boolean(
      resolvedTargetId && CELESTIAL_BODIES[resolvedTargetId]?.type === 'constellation'
    );
    if (resolvedTargetId && resolvedTargetId !== 'sun' && !isConstellationTarget) {
      const liveBody = this.getLiveBodyPosition(resolvedTargetId, this.orbitFocusPos);
      offset = [
        +(posVec.x - liveBody.x).toFixed(2),
        +(posVec.y - liveBody.y).toFixed(2),
        +(posVec.z - liveBody.z).toFixed(2),
      ];
    }

    return {
      name,
      targetId: resolvedTargetId,
      position: pos,
      target: tgt,
      offset,
    };
  }

  /**
   * Restores a saved VIP camera bookmark without activeFocusId snap-back or orbital drift.
   */
  public restoreBookmark(bm: {
    targetId: string | null;
    position: [number, number, number];
    target: [number, number, number];
    offset?: [number, number, number];
  }): void {
    const store = useAppStore.getState();
    store.setTargetId(bm.targetId);
    const bodyData = bm.targetId ? CELESTIAL_BODIES[bm.targetId] : undefined;

    if (bodyData?.type === 'constellation') {
      if (!store.showStarMap) {
        store.toggleStarMap();
      }
      this.activeFocusId = null;
      const destPos = new THREE.Vector3(bm.position[0], bm.position[1], bm.position[2]);
      const destTgt = new THREE.Vector3(bm.target[0], bm.target[1], bm.target[2]);
      this.flyTo(destPos, destTgt, 1.8, () => {
        this.activeFocusId = null;
      });
      return;
    }

    this.activeFocusId = bm.targetId;

    if (bm.targetId && bm.targetId !== 'sun' && bodyData) {
      const liveTarget = this.getLiveBodyPosition(bm.targetId).clone();
      const relX = bm.offset ? bm.offset[0] : bm.position[0] - bm.target[0];
      const relY = bm.offset ? bm.offset[1] : bm.position[1] - bm.target[1];
      const relZ = bm.offset ? bm.offset[2] : bm.position[2] - bm.target[2];
      const relVec = new THREE.Vector3(relX, relY, relZ);
      const destPos = liveTarget.clone().add(relVec);
      this.flyTo(
        destPos,
        liveTarget,
        1.8,
        () => {
          this.activeFocusId = bm.targetId;
        },
        bm.targetId,
        relVec
      );
      return;
    }

    const destPos = new THREE.Vector3(bm.position[0], bm.position[1], bm.position[2]);
    const destTgt = new THREE.Vector3(bm.target[0], bm.target[1], bm.target[2]);
    this.flyTo(destPos, destTgt, 1.8, () => {
      this.activeFocusId = bm.targetId;
    });
  }

  private pendingScreenshotCallback: ((dataUrl: string) => void) | null = null;

  public requestScreenshot(cb: (dataUrl: string) => void): void {
    this.pendingScreenshotCallback = cb;
  }

  public consumeScreenshotCallback(): ((dataUrl: string) => void) | null {
    const cb = this.pendingScreenshotCallback;
    this.pendingScreenshotCallback = null;
    return cb;
  }

  /**
   * Frame update with continuous exponential damping and live orbit tracking.
   */
  public updateOrbit(delta: number = 0.016): void {
    if (!this.camera || (this.state !== 'ORBIT' && this.state !== 'GALAXY')) return;
    // Launch simulation camera is managed exclusively by CameraDirector
    if (this.activeScenario === 'earth_launch') return;

    this.flightModeInitialized = false;
    const storeState = useAppStore.getState();
    const isSurface = storeState.activeSurface !== 'none';
    const isEventSurface = storeState.activeEventSurfaceId !== null;
    const isExo = storeState.inExoSystem;
    const isCosmicLab = storeState.activeCosmicLab !== 'none';
    const isScenario = this.activeScenario !== 'none';
    const simTime = SimulationClock.getInstance().simulationTime;

    if (!isSurface && !isEventSurface && !isExo && !isCosmicLab && !isScenario && this.activeFocusId && this.state === 'ORBIT') {
      if (this.activeFocusId !== 'sun') {
        const livePos = this.getLiveBodyPosition(this.activeFocusId, this.orbitFocusPos);
        this.target.copy(livePos);
      }

      if (this.activeFocusId === 'iss') {
        // Exact 3D isometric co-rotation around ISS's 51.6°-inclined orbital plane axis (constant Earth clearance!)
        if (this.prevFocusIdForAzimuth === 'iss' && this.prevSimTimeForOrbit !== null) {
          const dAngle = (simTime - this.prevSimTimeForOrbit) * 0.22;
          if (Math.abs(dAngle) > 1e-8) {
            this.relCurScratch.setFromSpherical(this.spherical).applyAxisAngle(this.issOrbitAxis, dAngle);
            this.relTgtScratch.setFromSpherical(this.targetSpherical).applyAxisAngle(this.issOrbitAxis, dAngle);
            this.spherical.setFromVector3(this.relCurScratch);
            this.targetSpherical.setFromVector3(this.relTgtScratch);
          }
        }
        this.prevSimTimeForOrbit = simTime;
        this.prevHostAzimuth = null;
        this.prevFocusIdForAzimuth = 'iss';
      } else if (this.activeFocusId === 'jwst') {
        const earthPos = this.getLiveBodyPosition('earth', this.parentScratch);
        const hostAzimuth = Math.atan2(earthPos.x, earthPos.z);
        if (this.prevFocusIdForAzimuth === 'jwst' && this.prevHostAzimuth !== null) {
          let dTheta = hostAzimuth - this.prevHostAzimuth;
          while (dTheta > Math.PI) dTheta -= Math.PI * 2;
          while (dTheta < -Math.PI) dTheta += Math.PI * 2;
          this.spherical.theta += dTheta;
          this.targetSpherical.theta += dTheta;
        }
        this.prevHostAzimuth = hostAzimuth;
        this.prevSimTimeForOrbit = simTime;
        this.prevFocusIdForAzimuth = 'jwst';
      } else {
        // Zero-alloc spin co-rotation when inspecting a planetary/solar surface hotspot so the event never spins away
        if (
          this.activeHotspotTrack &&
          this.activeHotspotTrack.bodyId === this.activeFocusId &&
          this.activeHotspotTrack.frameMode === 'spin' &&
          this.prevFocusIdForAzimuth === this.activeFocusId &&
          this.prevSimTimeForOrbit !== null
        ) {
          const bodyData = CELESTIAL_BODIES[this.activeFocusId];
          const dSim = simTime - this.prevSimTimeForOrbit;
          if (bodyData && Math.abs(dSim) > 1e-8) {
            const dAngle = dSim * bodyData.rotationSpeed * this.activeHotspotTrack.superRotation * 0.5;
            if (Math.abs(dAngle) > 1e-8) {
              const tiltRad = THREE.MathUtils.degToRad(bodyData.axialTiltDeg || 0);
              this.hotspotSpinAxisScratch.set(0, Math.cos(tiltRad), Math.sin(tiltRad)).normalize();
              this.relCurScratch
                .setFromSpherical(this.spherical)
                .applyAxisAngle(this.hotspotSpinAxisScratch, dAngle);
              this.relTgtScratch
                .setFromSpherical(this.targetSpherical)
                .applyAxisAngle(this.hotspotSpinAxisScratch, dAngle);
              this.spherical.setFromVector3(this.relCurScratch);
              this.targetSpherical.setFromVector3(this.relTgtScratch);
            }
          }
        }
        this.prevHostAzimuth = null;
        this.prevSimTimeForOrbit = simTime;
        this.prevFocusIdForAzimuth = this.activeFocusId;
      }
    } else {
      this.prevHostAzimuth = null;
      this.prevSimTimeForOrbit = null;
      this.prevFocusIdForAzimuth = null;
    }

    // Shortest-arc azimuth wrap across ±π branch cut so damping never whips 360° around the pole
    while (this.targetSpherical.theta - this.spherical.theta > Math.PI) {
      this.targetSpherical.theta -= Math.PI * 2;
    }
    while (this.targetSpherical.theta - this.spherical.theta < -Math.PI) {
      this.targetSpherical.theta += Math.PI * 2;
    }

    const clampedDelta = Math.min(Math.max(delta, 0.001), 0.05);
    this.stepGalaxyBlend(clampedDelta);

    const damp = 1 - Math.exp(-12 * clampedDelta);
    this.spherical.theta = THREE.MathUtils.lerp(this.spherical.theta, this.targetSpherical.theta, damp);
    this.spherical.phi = THREE.MathUtils.lerp(this.spherical.phi, this.targetSpherical.phi, damp);
    this.spherical.radius = THREE.MathUtils.lerp(this.spherical.radius, this.targetSpherical.radius, damp);

    this.camera.position.setFromSpherical(this.spherical).add(this.target);

    // Prevent LEO camera from ever clipping inside Earth's crust/atmosphere as ISS orbits
    if (!isSurface && !isExo && !isCosmicLab && !isScenario && this.activeFocusId === 'iss') {
      const earthPos = this.getLiveBodyPosition('earth', this.parentScratch);
      const minEarthClearance = CELESTIAL_BODIES.earth.visualRadius + 0.55;
      this.issZenithScratch.copy(this.camera.position).sub(earthPos);
      const distSq = this.issZenithScratch.lengthSq();
      if (distSq > 1e-6 && distSq < minEarthClearance * minEarthClearance) {
        this.issZenithScratch.normalize().multiplyScalar(minEarthClearance);
        this.camera.position.copy(earthPos).add(this.issZenithScratch);
      }
    }

    this.camera.lookAt(this.target);
  }
}
