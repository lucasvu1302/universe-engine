import * as THREE from "three";
import { SimulationCameraMode } from "../core/types";
import { SimulationEventBus } from "../core/SimulationEventBus";
import { CameraManager } from "@/engine/camera/CameraManager";
import { useAppStore } from "@/stores/useAppStore";

export class CameraDirector {
  private static instance: CameraDirector;
  private mode: SimulationCameraMode = "COCKPIT";
  private cameraManager: CameraManager;
  private eventBus: SimulationEventBus;

  // Subtle external acoustic rumble (never detaches COCKPIT/WINDOW from cabin!)
  private shakeIntensity: number = 0;
  private shakeDecayRate: number = 3.0;
  private shakeOffset = new THREE.Vector3();
  private shakeTime: number = 0;

  // Target anchors relative to rocket center
  private rocketPosition = new THREE.Vector3();
  private rocketQuaternion = new THREE.Quaternion();
  private smoothedFollowQuat = new THREE.Quaternion();
  private cinematicAngle = 0;

  // 1. Cockpit: Reclined Crew Dragon pilot eye-point aligned along forward nose canopy (+0.92Y, +0.39Z)
  private cockpitOffset = new THREE.Vector3(0, 8.05, -0.05);
  // 2. Window: Starboard circular observation porthole framing full circular rim, curved Earth horizon & stars
  private windowOffset = new THREE.Vector3(0.42, 8.04, -0.22);
  // 3. Follow: Hero 3/4 aerospace chase camera framing rocket, tower, pad apron & deluge steam
  private followOffset = new THREE.Vector3(24.0, 5.5, -42.0);

  private modeJustChanged = true;
  private tempPos = new THREE.Vector3();
  private tempTarget = new THREE.Vector3();
  private tempUp = new THREE.Vector3(0, 1, 0);
  private readonly cinematicTargetOffset = new THREE.Vector3(0, 2.5, 0);

  private constructor() {
    this.cameraManager = CameraManager.getInstance();
    this.eventBus = SimulationEventBus.getInstance();

    this.eventBus.on("camera:shake", (intensity, durationSeconds) => {
      this.triggerShake(intensity, durationSeconds);
    });
  }

  public static getInstance(): CameraDirector {
    if (!CameraDirector.instance) {
      CameraDirector.instance = new CameraDirector();
    }
    return CameraDirector.instance;
  }

  public getMode(): SimulationCameraMode {
    return this.mode;
  }

  public setMode(mode: SimulationCameraMode): void {
    if (this.mode === mode) return;
    this.mode = mode;
    this.modeJustChanged = true;
    this.eventBus.emit("camera:mode_change", mode);
  }

  /**
   * Resets transient attitude smoothing and shake state cleanly on scenario entry so re-entering
   * Earth Launch never inherits stale quaternion attitude from a prior flight.
   */
  public resetForLaunch(): void {
    this.modeJustChanged = true;
    this.shakeIntensity = 0;
    this.shakeOffset.set(0, 0, 0);
    this.cinematicAngle = 0;
  }

  public updateRocketPose(position: THREE.Vector3, quaternion: THREE.Quaternion): void {
    this.rocketPosition.copy(position);
    this.rocketQuaternion.copy(quaternion);
    if (this.modeJustChanged) {
      this.smoothedFollowQuat.copy(quaternion);
    }
  }

  public triggerShake(intensity: number, durationSeconds: number = 1.0): void {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    this.shakeDecayRate = 3.0 / Math.max(0.08, durationSeconds);
  }

  public update(deltaSeconds: number): void {
    const cam = this.cameraManager.camera;
    if (!cam) return;

    const dt = Number.isFinite(deltaSeconds) && deltaSeconds > 0 ? Math.min(deltaSeconds, 0.05) : 0.016;
    this.shakeTime += dt;

    const reducedMotion = useAppStore.getState().reducedMotion;
    const motionScale = reducedMotion ? 0.0 : 1.0;

    if (this.shakeIntensity > 0.001 && this.mode === "FOLLOW") {
      const effectiveIntensity = this.shakeIntensity * 0.12 * motionScale;
      const t = this.shakeTime;
      this.shakeOffset.set(
        Math.sin(t * 17.3) * effectiveIntensity,
        Math.cos(t * 19.7) * effectiveIntensity,
        Math.sin(t * 14.9) * effectiveIntensity
      );
      this.shakeIntensity *= Math.exp(-this.shakeDecayRate * dt);
    } else {
      this.shakeOffset.set(0, 0, 0);
      this.shakeIntensity *= Math.exp(-this.shakeDecayRate * dt);
      if (this.shakeIntensity < 0.001) this.shakeIntensity = 0;
    }

    switch (this.mode) {
      case "COCKPIT": {
        // Locked 1:1 to Crew Dragon cabin frame so cockpit windows & MFDs never vibrate relative to camera
        this.tempPos
          .copy(this.cockpitOffset)
          .applyQuaternion(this.rocketQuaternion)
          .add(this.rocketPosition);
        cam.position.copy(this.tempPos);
        this.modeJustChanged = false;

        this.tempTarget
          .set(0, 8.05 + 2.76, -0.05 + 1.17)
          .applyQuaternion(this.rocketQuaternion)
          .add(this.rocketPosition);

        this.tempUp.set(0, 0.39, -0.92).normalize().applyQuaternion(this.rocketQuaternion);
        cam.up.copy(this.tempUp);
        cam.lookAt(this.tempTarget);
        break;
      }

      case "WINDOW": {
        this.tempPos
          .copy(this.windowOffset)
          .applyQuaternion(this.rocketQuaternion)
          .add(this.rocketPosition);
        cam.position.copy(this.tempPos);
        this.modeJustChanged = false;

        this.tempTarget
          .set(0.42 + 5.20, 8.04 + 0.15, -0.22 + 1.30)
          .applyQuaternion(this.rocketQuaternion)
          .add(this.rocketPosition);

        this.tempUp.set(0, 0.12, -0.99).normalize().applyQuaternion(this.rocketQuaternion);
        cam.up.copy(this.tempUp);
        cam.lookAt(this.tempTarget);
        break;
      }

      case "FOLLOW": {
        // Frame-rate-independent attitude slerp + rigid rocket-CoM lock (zero world-position lag rubber-banding!)
        if (this.modeJustChanged) {
          this.smoothedFollowQuat.copy(this.rocketQuaternion);
          this.modeJustChanged = false;
        } else {
          const rotDamp = 1 - Math.exp(-10.0 * dt);
          this.smoothedFollowQuat.slerp(this.rocketQuaternion, rotDamp);
        }

        this.tempPos
          .copy(this.followOffset)
          .applyQuaternion(this.smoothedFollowQuat)
          .add(this.rocketPosition)
          .add(this.shakeOffset);
        cam.position.copy(this.tempPos);

        this.tempTarget
          .set(0, -1.2, 0)
          .applyQuaternion(this.smoothedFollowQuat)
          .add(this.rocketPosition)
          .add(this.shakeOffset);

        this.tempUp.set(0, 1, 0).applyQuaternion(this.smoothedFollowQuat);
        cam.up.copy(this.tempUp);
        cam.lookAt(this.tempTarget);
        break;
      }

      case "CINEMATIC": {
        this.cinematicAngle += dt * 0.35;
        const orbitRadius = 48;
        this.tempPos.set(
          this.rocketPosition.x + Math.cos(this.cinematicAngle) * orbitRadius,
          this.rocketPosition.y + 5 + Math.sin(this.cinematicAngle * 0.6) * 8,
          this.rocketPosition.z + Math.sin(this.cinematicAngle) * orbitRadius
        );
        cam.position.copy(this.tempPos);
        this.modeJustChanged = false;

        this.tempTarget.copy(this.rocketPosition).add(this.cinematicTargetOffset);
        this.tempUp.set(0, 1, 0);
        cam.up.copy(this.tempUp);
        cam.lookAt(this.tempTarget);
        break;
      }

      case "ORBIT":
      case "FREE":
      default:
        break;
    }
  }
}
