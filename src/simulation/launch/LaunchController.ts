import * as THREE from "three";
import { LaunchStep } from "../core/types";
import { LAUNCH_STEPS, getLaunchStepAtTime } from "../data/launchProfileData";
import { AtmosphereController } from "./AtmosphereController";
import { CameraDirector } from "../camera/CameraDirector";
import { SimulationEventBus } from "../core/SimulationEventBus";

export interface LaunchTrajectoryState {
  timeSeconds: number;
  altitudeKm: number;
  velocityKms: number;
  accelerationG: number;
  machNumber: number;
  pitchDeg: number;
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  currentStep: LaunchStep;
  stage1Separated: boolean;
  fairingJettisoned: boolean;
}

export class LaunchController {
  private static instance: LaunchController;

  private currentStep: LaunchStep = LAUNCH_STEPS[0];
  private trajectoryState: LaunchTrajectoryState;
  private atmosphereController: AtmosphereController;
  private cameraDirector: CameraDirector;
  private eventBus: SimulationEventBus;

  // Working vectors
  private rocketPos = new THREE.Vector3();
  private rocketQuat = new THREE.Quaternion();
  private euler = new THREE.Euler(0, 0, 0, "YXZ");

  private constructor() {
    this.atmosphereController = AtmosphereController.getInstance();
    this.cameraDirector = CameraDirector.getInstance();
    this.eventBus = SimulationEventBus.getInstance();

    this.trajectoryState = {
      timeSeconds: 0,
      altitudeKm: 0,
      velocityKms: 0,
      accelerationG: 1.0,
      machNumber: 0,
      pitchDeg: 90,
      position: this.rocketPos,
      quaternion: this.rocketQuat,
      currentStep: this.currentStep,
      stage1Separated: false,
      fairingJettisoned: false
    };

    // Listen to timeline updates
    this.eventBus.on("timeline:time_update", (time) => {
      this.evaluateAtTime(time);
    });
  }

  public static getInstance(): LaunchController {
    if (!LaunchController.instance) {
      LaunchController.instance = new LaunchController();
    }
    return LaunchController.instance;
  }

  public getTrajectoryState(): LaunchTrajectoryState {
    return this.trajectoryState;
  }

  public evaluateAtTime(timeSeconds: number): LaunchTrajectoryState {
    const step = getLaunchStepAtTime(timeSeconds);
    const stepDuration = Math.max(step.duration, 0.001);
    const stepT = Math.min(Math.max((timeSeconds - step.startTime) / stepDuration, 0), 1);

    // 1. Interpolate scalar telemetry
    const altKm = THREE.MathUtils.lerp(step.altitudeKm[0], step.altitudeKm[1], stepT);
    const velKms = THREE.MathUtils.lerp(step.velocityKms[0], step.velocityKms[1], stepT);
    const gForce = THREE.MathUtils.lerp(step.accelerationG[0], step.accelerationG[1], stepT);

    // Speed of sound roughly 0.34 km/s (1225 km/h) in troposphere
    const mach = velKms / 0.34;

    // 2. Gravity Turn trajectory:
    // Vertical (90 deg) for first 15s, then pitches down to 5 deg at 280s
    let pitchDeg = 90;
    if (timeSeconds > 15) {
      const turnProgress = Math.min((timeSeconds - 15) / 265, 1.0);
      // Smooth S-curve transition from 90 deg down to 2 deg (horizontal orbit)
      const smoothTurn = Math.sin((turnProgress * Math.PI) / 2);
      pitchDeg = 90 - smoothTurn * 88;
    }

    // 3. Staging flags
    const stage1Separated = timeSeconds >= 100;
    const fairingJettisoned = timeSeconds >= 140;

    // 4. Calculate C2-smooth 3D Scene Coordinates (zero piecewise altitude/downrange velocity kinks)
    let visualAlt = 0;
    if (timeSeconds > 10) {
      const tLift = timeSeconds - 10;
      const liftoffEase = (tLift * tLift) / (tLift + 8.0);
      visualAlt = liftoffEase * (8.2 / (1.0 + tLift / 290.0));
    }

    // Smooth C2 downrange curve building seamlessly after pitch-over at T+15s
    let downrange = 0;
    if (timeSeconds > 15) {
      const dt = timeSeconds - 15;
      const turnEase = (dt * dt) / (dt + 12.0);
      downrange = turnEase * (0.68 + 0.015 * dt);
    }

    this.rocketPos.set(0, visualAlt, downrange);

    // Orientation: rocket model is built aligned along +Y axis
    // Pitching down towards +Z means rotating around X axis by (90 - pitchDeg)
    const pitchRad = THREE.MathUtils.degToRad(90 - pitchDeg);
    this.euler.set(pitchRad, 0, 0);
    this.rocketQuat.setFromEuler(this.euler);

    // 5. Update Atmosphere
    this.atmosphereController.update(altKm, velKms);

    // 6. Subtle external acoustic rumble only at Liftoff (T+10..17s) & peak Max-Q (T+67..74s)
    if (timeSeconds >= 10 && timeSeconds <= 17) {
      const liftEnvelope = Math.sin(((timeSeconds - 10) / 7) * Math.PI);
      this.cameraDirector.triggerShake(liftEnvelope * 0.12, 0.12);
    } else if (timeSeconds >= 67 && timeSeconds <= 74) {
      const maxQEnvelope = Math.sin(((timeSeconds - 67) / 7) * Math.PI);
      this.cameraDirector.triggerShake(maxQEnvelope * 0.08, 0.12);
    }
    this.cameraDirector.updateRocketPose(this.rocketPos, this.rocketQuat);

    // 7. Update internal state
    this.trajectoryState.timeSeconds = timeSeconds;
    this.trajectoryState.altitudeKm = altKm;
    this.trajectoryState.velocityKms = velKms;
    this.trajectoryState.accelerationG = gForce;
    this.trajectoryState.machNumber = mach;
    this.trajectoryState.pitchDeg = pitchDeg;
    this.trajectoryState.currentStep = step;
    this.trajectoryState.stage1Separated = stage1Separated;
    this.trajectoryState.fairingJettisoned = fairingJettisoned;

    // 8. Dispatch events
    if (step.id !== this.currentStep.id) {
      this.currentStep = step;
      this.eventBus.emit("launch:step_change", step);
      if (step.narration) {
        this.eventBus.emit("story:show", step.narration);
      }
    }
    this.eventBus.emit("launch:telemetry_update", altKm, velKms, gForce, step.phase);

    return this.trajectoryState;
  }
}
