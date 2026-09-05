import * as THREE from "three";

export type ScenarioType = "none" | "earth_launch" | "earth_history" | "cosmic_history";

export type SimulationCameraMode =
  | "COCKPIT"
  | "WINDOW"
  | "FOLLOW"
  | "ORBIT"
  | "CINEMATIC"
  | "FREE";

export interface TimelineTimeRange {
  min: number;
  max: number;
}

export interface TimelineEvent<T = unknown> {
  id: string;
  time: number; // In scenario-specific units (seconds, Ma, or Ga)
  type: string;
  title: string;
  description?: string;
  data?: T;
}

export interface CameraStateConfig {
  mode: SimulationCameraMode;
  position?: [number, number, number];
  target?: [number, number, number];
  fov?: number;
  shakeIntensity?: number;
}

export interface NarrationData {
  title: string;
  subtitle?: string;
  body: string;
  scientificFact?: string;
  duration?: number;
}

// ----------------------------------------------------
// 1. Earth Launch Types
// ----------------------------------------------------
export type LaunchPhaseType =
  | "PRE_LAUNCH"
  | "COUNTDOWN"
  | "ENGINE_IGNITION"
  | "LIFTOFF"
  | "LOW_ATMOSPHERE"
  | "MAX_Q"
  | "STAGE_SEP"
  | "HIGH_ATMOSPHERE"
  | "KARMAN_LINE"
  | "ORBIT_INSERTION"
  | "EARTH_ORBIT";

export interface LaunchStep {
  id: string;
  phase: LaunchPhaseType;
  startTime: number; // Seconds from T-0 (e.g. -10 to +300)
  duration: number;
  altitudeKm: [number, number]; // [start, end]
  velocityKms: [number, number]; // [start, end]
  accelerationG: [number, number];
  cameraShake: number;
  vibration: number;
  stageSeparated?: boolean;
  fairingJettisoned?: boolean;
  narration?: NarrationData;
}

export interface AtmosphereState {
  altitudeKm: number;
  density: number;
  skyColor: THREE.Color;
  starVisibility: number;
  earthCurvatureVisibility: number;
  reentryGlow: number;
  fogDensity: number;
}

// ----------------------------------------------------
// 2. Earth Geological History Types
// ----------------------------------------------------
export interface HistoricalEvent {
  id: string;
  millionYearsAgo: number; // Negative number, e.g. -66 for 66 Ma
  title: string;
  type: "extinction" | "evolution" | "geological" | "impact";
  description: string;
  visualEffect?: "asteroid_impact" | "volcanism" | "ice_surge" | "oxygenation";
}

export interface EarthPeriod {
  id: string;
  name: string;
  displayName: string;
  startMa: number; // e.g. -4540
  endMa: number; // e.g. -4000
  description: string;
  dominantColor: string;
  secondaryColor: string;
  surfaceTextureType: "magma" | "pangaea" | "jurassic" | "cretaceous" | "ice_age" | "modern";
  meanTempC: number;
  o2Percent: number;
  co2Ppm: number;
  seaLevelM: number;
  keyLifeforms: string[];
  events: HistoricalEvent[];
}

// ----------------------------------------------------
// 3. Cosmic Events Types
// ----------------------------------------------------
export type CosmicEventType =
  | "BIG_BANG"
  | "STAR_BIRTH"
  | "PLANET_FORMATION"
  | "SUPERNOVA"
  | "ASTEROID_IMPACT"
  | "GALAXY_COLLISION";

export interface CosmicEventData {
  id: string;
  type: CosmicEventType;
  timeGyrAgo: number; // Billion years ago (e.g. 13.8 for Big Bang, 4.6 for Solar System)
  title: string;
  subtitle: string;
  description: string;
  scientificFact: string;
  durationSeconds: number;
  primaryColor: string;
  secondaryColor: string;
}
