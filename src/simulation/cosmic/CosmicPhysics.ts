export type StormLevel = 'G1' | 'G2' | 'G3' | 'G4' | 'G5';
export type EclipseMode = 'solar_ground' | 'solar_orbit' | 'lunar_blood';
export type MergerStage = 'inspiral' | 'merger' | 'ringdown';
export type StellarRemnant = 'WHITE_DWARF' | 'NEUTRON_STAR' | 'BLACK_HOLE';
export type StellarStageKey =
  | 'protostar'
  | 'main_sequence'
  | 'red_giant'
  | 'red_supergiant'
  | 'planetary_nebula'
  | 'supernova'
  | 'white_dwarf'
  | 'neutron_star'
  | 'black_hole';

export interface SolarStormState {
  intensity: number;
  stormLevel: StormLevel;
  kpIndex: number;
  solarWindKms: number;
  auroraOvalLatDeg: number;
  bowShockStandoffRe: number;
}

export interface EclipseState {
  phase: number;
  isTotality: boolean;
  isBloodMoon: boolean;
  obscurationPct: number;
  coronaIntensity: number;
  diamondRingIntensity: number;
  umbraStrength: number;
  penumbraStrength: number;
  rayleighRedness: number;
  moonOffsetX: number;
}

export interface BinaryMergerState {
  progress: number;
  stage: MergerStage;
  separationUnits: number;
  orbitalPhaseRad: number;
  frequencyHz: number;
  strainEnvelope: number;
  strainValue: number;
  waveAmplitude: number;
  finalMassSolar: number;
  radiatedEnergySolar: number;
}

export interface StellarEvolutionState {
  massSolar: number;
  progress: number;
  stageKey: StellarStageKey;
  remnantType: StellarRemnant;
  temperatureK: number;
  luminositySolar: number;
  radiusVisual: number;
  colorHex: string;
  ageMyr: number;
  hrX: number;
  hrY: number;
}

function clampFinite(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, value));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Evaluates NOAA Space Weather Geomagnetic Storm scale (G1–G5) from normalized intensity [0.2, 1.0].
 */
export function evaluateSolarStorm(intensityRaw: number): SolarStormState {
  const intensity = clampFinite(intensityRaw, 0.2, 1.0, 0.6);
  const norm = (intensity - 0.2) / 0.8; // 0..1

  let stormLevel: StormLevel = 'G1';
  let kpIndex = 5;
  if (norm >= 0.85) {
    stormLevel = 'G5';
    kpIndex = 9;
  } else if (norm >= 0.65) {
    stormLevel = 'G4';
    kpIndex = 8;
  } else if (norm >= 0.45) {
    stormLevel = 'G3';
    kpIndex = 7;
  } else if (norm >= 0.22) {
    stormLevel = 'G2';
    kpIndex = 6;
  }

  const solarWindKms = Math.round(lerp(460, 1850, norm * norm * 0.45 + norm * 0.55));
  const auroraOvalLatDeg = Number(lerp(66.5, 47.0, norm).toFixed(1));
  const bowShockStandoffRe = Number(lerp(10.6, 6.1, norm).toFixed(1));

  return {
    intensity,
    stormLevel,
    kpIndex,
    solarWindKms,
    auroraOvalLatDeg,
    bowShockStandoffRe,
  };
}

/**
 * Evaluates Solar Eclipse (Ground Corona / Orbital Umbra) & Lunar Blood Moon physics over phase [0, 1].
 */
export function evaluateEclipse(mode: EclipseMode, phaseRaw: number): EclipseState {
  const phase = clampFinite(phaseRaw, 0.0, 1.0, 0.5);
  const distFromCenter = Math.abs(phase - 0.5);

  const obscurationPct = Number((Math.max(0, 1.0 - distFromCenter / 0.42) * 100).toFixed(1));
  const isTotality = mode === 'solar_ground' && distFromCenter <= 0.045;
  const isBloodMoon = mode === 'lunar_blood' && distFromCenter <= 0.14;

  // Multi-streamer corona emerges smoothly around totality (phase 0.5)
  const coronaIntensity =
    mode === 'solar_ground'
      ? Math.exp(-Math.pow(distFromCenter / 0.095, 2))
      : mode === 'solar_orbit'
      ? Math.exp(-Math.pow(distFromCenter / 0.18, 2)) * 0.45
      : 0.0;

  // Diamond Ring peaks crisply at 2nd contact (0.45) and 3rd contact (0.55)
  const ring2 = Math.exp(-Math.pow((phase - 0.45) / 0.022, 2));
  const ring3 = Math.exp(-Math.pow((phase - 0.55) / 0.022, 2));
  const diamondRingIntensity = mode === 'solar_ground' ? Math.min(1.0, ring2 + ring3) : 0.0;

  // Orbital umbra & penumbra intensity cast onto Earth's sunlit disc
  const umbraStrength =
    mode === 'solar_orbit'
      ? Math.exp(-Math.pow(distFromCenter / 0.22, 2))
      : Math.exp(-Math.pow(distFromCenter / 0.12, 2)) * 0.6;
  const penumbraStrength = Math.exp(-Math.pow(distFromCenter / 0.36, 2));

  // Rayleigh scattering copper-crimson tint during lunar totality
  const rayleighRedness =
    mode === 'lunar_blood' ? Math.exp(-Math.pow(distFromCenter / 0.2, 2)) : 0.0;

  // Moon horizontal sweep coordinate across the solar/shadow center
  const moonOffsetX = (phase - 0.5) * 5.6;

  return {
    phase,
    isTotality,
    isBloodMoon,
    obscurationPct,
    coronaIntensity,
    diamondRingIntensity,
    umbraStrength,
    penumbraStrength,
    rayleighRedness,
    moonOffsetX,
  };
}

/**
 * Evaluates GW150914-inspired Binary Black Hole inspiral -> merger -> ringdown kinematics & LIGO strain h(t).
 */
export function evaluateBinaryMerger(progressRaw: number): BinaryMergerState {
  const progress = clampFinite(progressRaw, 0.0, 1.0, 0.0);
  const mergerPoint = 0.78;

  let stage: MergerStage = 'inspiral';
  if (progress >= 0.84) {
    stage = 'ringdown';
  } else if (progress >= 0.72) {
    stage = 'merger';
  }

  let separationUnits = 0;
  let frequencyHz = 35;
  let strainEnvelope = 0.12;
  let orbitalPhaseRad = 0;

  if (progress < mergerPoint) {
    const u = progress / mergerPoint; // 0..1 approaching merger
    const remain = Math.max(0, 1.0 - u);
    separationUnits = 6.2 * Math.pow(remain, 0.45);
    // Chirp frequency sweeps from ~35 Hz to 250 Hz near contact
    frequencyHz = 35 + 215 * Math.pow(u, 3.2);
    strainEnvelope = 0.12 + 0.88 * Math.pow(u, 2.4);
    orbitalPhaseRad = 26.0 * (1.0 - Math.pow(remain, 0.62));
  } else {
    const ringT = (progress - mergerPoint) / (1.0 - mergerPoint); // 0..1
    separationUnits = 0;
    frequencyHz = 250 * Math.exp(-ringT * 0.45);
    strainEnvelope = Math.exp(-ringT * 5.2);
    orbitalPhaseRad = 26.0 + ringT * 14.0;
  }

  const strainValue = strainEnvelope * Math.cos(orbitalPhaseRad * 2.0);
  const waveAmplitude = Math.min(1.0, strainEnvelope * 1.15);

  return {
    progress,
    stage,
    separationUnits,
    orbitalPhaseRad,
    frequencyHz: Number(frequencyHz.toFixed(1)),
    strainEnvelope: Number(strainEnvelope.toFixed(4)),
    strainValue: Number(strainValue.toFixed(4)),
    waveAmplitude: Number(waveAmplitude.toFixed(4)),
    finalMassSolar: 62.0,
    radiatedEnergySolar: 3.0,
  };
}

/**
 * Evaluates stellar evolution over mass [0.5, 40] M_sun and normalized lifetime progress [0, 1]
 * with realistic Hertzsprung-Russell diagram tracks and astrophysical remnants.
 */
export function evaluateStellarEvolution(
  massRaw: number,
  progressRaw: number
): StellarEvolutionState {
  const massSolar = clampFinite(massRaw, 0.5, 40.0, 1.0);
  const progress = clampFinite(progressRaw, 0.0, 1.0, 0.0);

  const remnantType: StellarRemnant =
    massSolar <= 8.0 ? 'WHITE_DWARF' : massSolar <= 20.0 ? 'NEUTRON_STAR' : 'BLACK_HOLE';

  // Approximate main-sequence lifetime in Myr: 10,000 * M^(-2.5)
  const totalLifeMyr = 10000 * Math.pow(massSolar, -2.5);
  const ageMyr = Number((totalLifeMyr * progress).toFixed(2));

  // Main-sequence baseline properties
  const msTemp = 5778 * Math.pow(massSolar, 0.56);
  const msLum = Math.pow(massSolar, 3.5);
  const msRadius = Math.pow(massSolar, 0.72);

  let stageKey: StellarStageKey = 'main_sequence';
  let temperatureK = msTemp;
  let luminositySolar = msLum;
  let radiusVisual = Math.min(4.2, 1.0 + msRadius * 0.35);
  let colorHex =
    massSolar < 0.85
      ? '#fb923c'
      : massSolar < 1.6
      ? '#fef08a'
      : massSolar < 7.0
      ? '#e0f2fe'
      : '#60a5fa';

  if (progress < 0.12) {
    const t = progress / 0.12;
    stageKey = 'protostar';
    temperatureK = lerp(2600, msTemp, t);
    luminositySolar = lerp(Math.max(2.0, msLum * 0.4), msLum, t);
    radiusVisual = lerp(2.8, Math.min(3.8, 1.0 + msRadius * 0.32), t);
    colorHex = '#fb7185';
  } else if (progress < 0.62) {
    stageKey = 'main_sequence';
    const t = (progress - 0.12) / 0.5;
    temperatureK = msTemp * lerp(1.0, 0.94, t);
    luminositySolar = msLum * lerp(1.0, 1.35, t);
    radiusVisual = Math.min(4.2, (1.1 + msRadius * 0.35) * lerp(1.0, 1.18, t));
  } else if (progress < 0.84) {
    const t = (progress - 0.62) / 0.22;
    stageKey = massSolar > 8.0 ? 'red_supergiant' : 'red_giant';
    temperatureK = lerp(msTemp * 0.94, massSolar > 8.0 ? 3500 : 3800, t);
    const giantBoost = massSolar > 8.0 ? 8.0 : 120.0;
    luminositySolar = msLum * lerp(1.35, giantBoost, t);
    radiusVisual = lerp(Math.min(4.2, 1.2 + msRadius * 0.35), massSolar > 8.0 ? 6.4 : 5.2, t);
    colorHex = '#ef4444';
  } else if (progress < 0.94) {
    const t = (progress - 0.84) / 0.1;
    if (massSolar <= 8.0) {
      stageKey = 'planetary_nebula';
      temperatureK = lerp(3800, 48000, t);
      luminositySolar = msLum * lerp(120.0, 22.0, t);
      radiusVisual = lerp(5.2, 2.2, t);
      colorHex = '#38bdf8';
    } else {
      stageKey = 'supernova';
      temperatureK = lerp(3500, 95000, t);
      luminositySolar = Math.max(1e6, msLum * 400);
      radiusVisual = lerp(6.4, 7.6, t);
      colorHex = '#e0f2fe';
    }
  } else {
    const t = (progress - 0.94) / 0.06;
    if (remnantType === 'WHITE_DWARF') {
      stageKey = 'white_dwarf';
      temperatureK = lerp(42000, 18500, t);
      luminositySolar = lerp(0.8, 0.02, t);
      radiusVisual = 0.62;
      colorHex = '#e0f2fe';
    } else if (remnantType === 'NEUTRON_STAR') {
      stageKey = 'neutron_star';
      temperatureK = lerp(120000, 65000, t);
      luminositySolar = lerp(8.0, 0.45, t);
      radiusVisual = 0.48;
      colorHex = '#22d3ee';
    } else {
      stageKey = 'black_hole';
      // Accretion corona effective temperature & relativistic luminosity for H-R readout
      temperatureK = 85000;
      luminositySolar = 12.5;
      radiusVisual = 0.95;
      colorHex = '#f97316';
    }
  }

  // Normalized H-R coordinates: X in [0.05, 0.95] (hot left -> cool right), Y in [0.05, 0.95] (bright top -> faint bottom)
  const logT = Math.log10(Math.max(2000, temperatureK));
  const logL = Math.log10(Math.max(1e-3, luminositySolar));
  const hrX = clampFinite(1.0 - (logT - 3.35) / (5.05 - 3.35), 0.06, 0.94, 0.5);
  const hrY = clampFinite(1.0 - (logL - -3.0) / (6.8 - -3.0), 0.06, 0.94, 0.5);

  return {
    massSolar,
    progress,
    stageKey,
    remnantType,
    temperatureK: Math.round(temperatureK),
    luminositySolar: Number(luminositySolar.toPrecision(4)),
    radiusVisual: Number(radiusVisual.toFixed(2)),
    colorHex,
    ageMyr,
    hrX: Number(hrX.toFixed(3)),
    hrY: Number(hrY.toFixed(3)),
  };
}
