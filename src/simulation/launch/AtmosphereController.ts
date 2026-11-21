import * as THREE from "three";
import { AtmosphereState } from "../core/types";

export class AtmosphereController {
  private static instance: AtmosphereController;

  // Sky keyframe colors (physically darkening rapidly above 35 km stratosphere into true starry vacuum by 75 km)
  private colorSeaLevel = new THREE.Color(0.35, 0.65, 0.98); // Vibrant cyan-blue
  private colorTroposphere = new THREE.Color(0.16, 0.38, 0.80); // Rich azure
  private colorStratosphere = new THREE.Color(0.035, 0.085, 0.28); // Deep stratospheric navy
  private colorMesosphere = new THREE.Color(0.005, 0.012, 0.055); // Near-vacuum velvet indigo
  private colorSpace = new THREE.Color(0.001, 0.001, 0.003); // Near pure black

  private currentState: AtmosphereState = {
    altitudeKm: 0,
    density: 1.0,
    skyColor: new THREE.Color(0.35, 0.65, 0.98),
    starVisibility: 0,
    earthCurvatureVisibility: 0,
    reentryGlow: 0,
    fogDensity: 0.0004
  };

  private constructor() {}

  public static getInstance(): AtmosphereController {
    if (!AtmosphereController.instance) {
      AtmosphereController.instance = new AtmosphereController();
    }
    return AtmosphereController.instance;
  }

  public getState(): AtmosphereState {
    return this.currentState;
  }

  /**
   * Update atmospheric state given altitude in kilometers.
   */
  public update(altitudeKm: number, velocityKms: number = 0): AtmosphereState {
    const alt = Math.max(0, altitudeKm);
    this.currentState.altitudeKm = alt;

    // 1. Exponential barometric density: rho = e^(-alt / 8.5)
    this.currentState.density = Math.exp(-alt / 8.5);

    // 2. Sky Color Gradient based on altitude
    if (alt < 10) {
      // 0 - 10 km: Troposphere
      const t = alt / 10;
      this.currentState.skyColor.copy(this.colorSeaLevel).lerp(this.colorTroposphere, t);
      this.currentState.starVisibility = 0;
      this.currentState.fogDensity = THREE.MathUtils.lerp(0.0004, 0.00015, t);
      this.currentState.earthCurvatureVisibility = t * 0.2;
    } else if (alt < 40) {
      // 10 - 40 km: Stratosphere (overhead sky deepens rapidly to dark navy)
      const t = (alt - 10) / 30;
      this.currentState.skyColor.copy(this.colorTroposphere).lerp(this.colorStratosphere, t);
      this.currentState.starVisibility = t * 0.45;
      this.currentState.fogDensity = THREE.MathUtils.lerp(0.00015, 0.00002, t);
      this.currentState.earthCurvatureVisibility = 0.2 + t * 0.45;
    } else if (alt < 80) {
      // 40 - 80 km: Mesosphere (99.99% of atmosphere below -> crisp starry vacuum sky above glowing Earth limb)
      const t = (alt - 40) / 40;
      this.currentState.skyColor.copy(this.colorStratosphere).lerp(this.colorMesosphere, t);
      this.currentState.starVisibility = 0.45 + t * 0.45;
      this.currentState.fogDensity = THREE.MathUtils.lerp(0.00002, 0.0, t);
      this.currentState.earthCurvatureVisibility = 0.65 + t * 0.3;
    } else if (alt < 120) {
      // 80 - 120 km: Thermosphere / Karman Line transition to Space
      const t = (alt - 80) / 40;
      this.currentState.skyColor.copy(this.colorMesosphere).lerp(this.colorSpace, t);
      this.currentState.starVisibility = 0.9 + t * 0.1;
      this.currentState.fogDensity = 0.0;
      this.currentState.earthCurvatureVisibility = 0.9 + t * 0.1;
    } else {
      // > 120 km: Vacuum of Space
      this.currentState.skyColor.copy(this.colorSpace);
      this.currentState.starVisibility = 1.0;
      this.currentState.fogDensity = 0.0;
      this.currentState.earthCurvatureVisibility = 1.0;
    }

    // 3. Dynamic aerodynamic shock heating glow
    // Significant when velocity is high and air density is still noticeable (e.g. 15km - 60km, v > 1.5 km/s)
    if (alt > 10 && alt < 70 && velocityKms > 1.0) {
      const dynamicPressure = this.currentState.density * Math.pow(velocityKms, 2);
      this.currentState.reentryGlow = Math.min(dynamicPressure * 0.25, 1.0);
    } else {
      this.currentState.reentryGlow = 0;
    }

    return this.currentState;
  }
}
