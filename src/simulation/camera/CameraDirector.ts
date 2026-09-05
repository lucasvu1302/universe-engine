import * as THREE from "three";
import { SimulationCameraMode } from "../core/types";
import { SimulationEventBus } from "../core/SimulationEventBus";
import { CameraManager } from "@/engine/camera/CameraManager";

export class CameraDirector {
  private static instance: CameraDirector;
  private mode: SimulationCameraMode = "COCKPIT";
  private cameraManager: CameraManager;
  private eventBus: SimulationEventBus;

  // Shake & Vibration
  private shakeIntensity: number = 0;
  private shakeDecay: number = 0.95;
  private shakeOffset = new THREE.Vector3();

  // Target anchors
  private rocketPosition = new THREE.Vector3();
  private rocketQuaternion = new THREE.Quaternion();
  private cockpitOffset = new THREE.Vector3(0, 4.2, 0.8); // Inside astronaut helmet view
  private windowOffset = new THREE.Vector3(1.2, 4.0, -0.5); // Passenger window looking out
  private followOffset = new THREE.Vector3(0, -12, 38); // Chasing rocket from behind & below

  private tempPos = new THREE.Vector3();
  private tempTarget = new THREE.Vector3();

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
    this.eventBus.emit("camera:mode_change", mode);
  }

  public updateRocketPose(position: THREE.Vector3, quaternion: THREE.Quaternion): void {
    this.rocketPosition.copy(position);
    this.rocketQuaternion.copy(quaternion);
  }

  public triggerShake(intensity: number, durationSeconds: number = 1.0): void {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    this.shakeDecay = Math.pow(0.05, 1.0 / (durationSeconds * 60));
  }

  public update(_deltaSeconds: number): void {
    const cam = this.cameraManager.camera;
    if (!cam) return;

    // 1. Calculate random high-frequency micro-vibration
    if (this.shakeIntensity > 0.001) {
      this.shakeOffset.set(
        (Math.random() - 0.5) * 2 * this.shakeIntensity,
        (Math.random() - 0.5) * 2 * this.shakeIntensity,
        (Math.random() - 0.5) * 2 * this.shakeIntensity
      );
      this.shakeIntensity *= this.shakeDecay;
    } else {
      this.shakeOffset.set(0, 0, 0);
      this.shakeIntensity = 0;
    }

    // 2. Position camera according to simulation mode
    switch (this.mode) {
      case "COCKPIT": {
        // Cockpit view: rigidly attached to rocket cabin + shake
        this.tempPos.copy(this.cockpitOffset).applyQuaternion(this.rocketQuaternion).add(this.rocketPosition);
        this.tempPos.add(this.shakeOffset);
        cam.position.copy(this.tempPos);

        // Look straight forward and slightly up out the windshield
        this.tempTarget.set(0, 8.0, -1.0).applyQuaternion(this.rocketQuaternion).add(this.rocketPosition);
        cam.lookAt(this.tempTarget);
        break;
      }

      case "WINDOW": {
        // Passenger window view looking down at Earth & atmosphere
        this.tempPos.copy(this.windowOffset).applyQuaternion(this.rocketQuaternion).add(this.rocketPosition);
        this.tempPos.add(this.shakeOffset);
        cam.position.copy(this.tempPos);

        // Look sideways / downwards out the passenger window
        this.tempTarget.set(8.0, 1.0, 0).applyQuaternion(this.rocketQuaternion).add(this.rocketPosition);
        cam.lookAt(this.tempTarget);
        break;
      }

      case "FOLLOW": {
        // External follow camera tracking rocket through the atmosphere
        this.tempPos.copy(this.followOffset).applyQuaternion(this.rocketQuaternion).add(this.rocketPosition);
        this.tempPos.add(this.shakeOffset);
        cam.position.lerp(this.tempPos, 0.12);

        this.tempTarget.copy(this.rocketPosition);
        cam.lookAt(this.tempTarget);
        break;
      }

      case "CINEMATIC": {
        // Smooth drifting orbit camera
        const time = performance.now() * 0.0003;
        this.tempPos.set(
          this.rocketPosition.x + Math.cos(time) * 45,
          this.rocketPosition.y + 12 + Math.sin(time * 0.7) * 8,
          this.rocketPosition.z + Math.sin(time) * 45
        );
        cam.position.lerp(this.tempPos, 0.05);
        cam.lookAt(this.rocketPosition);
        break;
      }

      case "ORBIT":
      case "FREE":
      default:
        // Handled by CameraManager orbit controls
        break;
    }
  }
}
