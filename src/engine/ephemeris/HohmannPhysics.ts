export type HohmannDestination = 'moon' | 'mars' | 'jupiter' | 'saturn';
export type HohmannRegime = 'geocentric' | 'heliocentric';

export interface HohmannTransferInput {
  destination: HohmannDestination;
  gravityAssist?: boolean;
  originRadiusAU?: number;
  targetRadiusAU?: number;
}

export interface HohmannTransferResult {
  valid: boolean;
  regime: HohmannRegime;
  destination: HohmannDestination;
  originRadiusAU: number;
  targetRadiusAU: number;
  semiMajorAxisAU: number;
  eccentricity: number;
  deltaV1Kms: number;
  deltaV2Kms: number;
  totalDeltaVKms: number;
  transferDays: number;
  phaseAngleDeg: number;
  gravityAssistSupported: boolean;
  gravityAssistApplied: boolean;
}

const MU_SUN_KM3_S2 = 1.3271244e11;
const MU_EARTH_KM3_S2 = 3.986004418e5;
const AU_KM = 1.495978707e8;
const SECONDS_PER_DAY = 86400;

const LEO_RADIUS_KM = 6778; // 6378 km Earth radius + 400 km LEO parking orbit
const MOON_ORBIT_KM = 384400;

const HELIOCENTRIC_RADII_AU: Record<Exclude<HohmannDestination, 'moon'>, number> = {
  mars: 1.524,
  jupiter: 5.204,
  saturn: 9.582,
};

function invalidTransfer(destination: HohmannDestination): HohmannTransferResult {
  return {
    valid: false,
    regime: destination === 'moon' ? 'geocentric' : 'heliocentric',
    destination,
    originRadiusAU: 0,
    targetRadiusAU: 0,
    semiMajorAxisAU: 0,
    eccentricity: 0,
    deltaV1Kms: 0,
    deltaV2Kms: 0,
    totalDeltaVKms: 0,
    transferDays: 0,
    phaseAngleDeg: 0,
    gravityAssistSupported: destination === 'jupiter' || destination === 'saturn',
    gravityAssistApplied: false,
  };
}

/**
 * Computes two-regime offline Hohmann transfer orbit parameters:
 * - Geocentric Earth-centered (LEO 400 km -> Lunar orbit 384,400 km) using mu_Earth
 * - Heliocentric Sun-centered (Earth 1.0 AU -> Mars / Jupiter / Saturn) using mu_Sun
 * Supports Gravity Assist (-18% total delta-v, -12% transfer time) exclusively for outer planets (Jupiter, Saturn).
 */
export function computeHohmannTransfer(input: HohmannTransferInput): HohmannTransferResult {
  const { destination } = input;
  const gravityAssistSupported = destination === 'jupiter' || destination === 'saturn';
  const gravityAssistApplied = gravityAssistSupported && Boolean(input.gravityAssist);

  // Explicit custom-radius validation (supports testing R5.b edge cases on any destination)
  const hasCustomRadii =
    input.originRadiusAU !== undefined || input.targetRadiusAU !== undefined;

  if (destination === 'moon' && !hasCustomRadii) {
    const r1Km = LEO_RADIUS_KM;
    const r2Km = MOON_ORBIT_KM;
    const aKm = 0.5 * (r1Km + r2Km);
    const ecc = (r2Km - r1Km) / (r1Km + r2Km);

    const v1Circ = Math.sqrt(MU_EARTH_KM3_S2 / r1Km);
    const vTransPeri = Math.sqrt(MU_EARTH_KM3_S2 * (2 / r1Km - 1 / aKm));
    const vTransApo = Math.sqrt(MU_EARTH_KM3_S2 * (2 / r2Km - 1 / aKm));
    const v2Circ = Math.sqrt(MU_EARTH_KM3_S2 / r2Km);

    const deltaV1Kms = Math.abs(vTransPeri - v1Circ);
    const deltaV2Kms = Math.abs(v2Circ - vTransApo);
    const totalDeltaVKms = deltaV1Kms + deltaV2Kms;
    const transferDays = (Math.PI * Math.sqrt(Math.pow(aKm, 3) / MU_EARTH_KM3_S2)) / SECONDS_PER_DAY;
    // Required lunar lead angle at TLI burn
    const phaseAngleDeg = 180 * (1 - Math.pow(aKm / r2Km, 1.5));

    return {
      valid: true,
      regime: 'geocentric',
      destination,
      originRadiusAU: Number((r1Km / AU_KM).toFixed(6)),
      targetRadiusAU: Number((r2Km / AU_KM).toFixed(6)),
      semiMajorAxisAU: Number((aKm / AU_KM).toFixed(6)),
      eccentricity: Number(ecc.toFixed(4)),
      deltaV1Kms: Number(deltaV1Kms.toFixed(3)),
      deltaV2Kms: Number(deltaV2Kms.toFixed(3)),
      totalDeltaVKms: Number(totalDeltaVKms.toFixed(3)),
      transferDays: Number(transferDays.toFixed(2)),
      phaseAngleDeg: Number(phaseAngleDeg.toFixed(1)),
      gravityAssistSupported: false,
      gravityAssistApplied: false,
    };
  }

  const r1AU = input.originRadiusAU ?? 1.0;
  const r2AU =
    input.targetRadiusAU ??
    (destination === 'moon' ? 1.0 : HELIOCENTRIC_RADII_AU[destination]);

  if (
    !Number.isFinite(r1AU) ||
    !Number.isFinite(r2AU) ||
    r1AU <= 0 ||
    r2AU <= 0 ||
    Math.abs(r2AU - r1AU) < 1e-6
  ) {
    return invalidTransfer(destination);
  }

  const r1Km = r1AU * AU_KM;
  const r2Km = r2AU * AU_KM;
  const aKm = 0.5 * (r1Km + r2Km);
  const aAU = 0.5 * (r1AU + r2AU);
  const ecc = Math.abs(r2AU - r1AU) / (r1AU + r2AU);

  const v1Circ = Math.sqrt(MU_SUN_KM3_S2 / r1Km);
  const vTrans1 = Math.sqrt(MU_SUN_KM3_S2 * (2 / r1Km - 1 / aKm));
  const vTrans2 = Math.sqrt(MU_SUN_KM3_S2 * (2 / r2Km - 1 / aKm));
  const v2Circ = Math.sqrt(MU_SUN_KM3_S2 / r2Km);

  const dvScale = gravityAssistApplied ? 0.82 : 1.0;
  const tofScale = gravityAssistApplied ? 0.88 : 1.0;

  const deltaV1Kms = Math.abs(vTrans1 - v1Circ) * dvScale;
  const deltaV2Kms = Math.abs(v2Circ - vTrans2) * dvScale;
  const totalDeltaVKms = (Math.abs(vTrans1 - v1Circ) + Math.abs(v2Circ - vTrans2)) * dvScale;
  const transferDays =
    ((Math.PI * Math.sqrt(Math.pow(aKm, 3) / MU_SUN_KM3_S2)) / SECONDS_PER_DAY) * tofScale;

  // Synodic launch window phase angle (degrees)
  let phaseAngleDeg = 180 * (1 - Math.pow(aAU / r2AU, 1.5));
  phaseAngleDeg = ((((phaseAngleDeg + 180) % 360) + 360) % 360) - 180;

  return {
    valid: true,
    regime: 'heliocentric',
    destination,
    originRadiusAU: Number(r1AU.toFixed(4)),
    targetRadiusAU: Number(r2AU.toFixed(4)),
    semiMajorAxisAU: Number(aAU.toFixed(4)),
    eccentricity: Number(ecc.toFixed(4)),
    deltaV1Kms: Number(deltaV1Kms.toFixed(3)),
    deltaV2Kms: Number(deltaV2Kms.toFixed(3)),
    totalDeltaVKms: Number(totalDeltaVKms.toFixed(3)),
    transferDays: Number(transferDays.toFixed(1)),
    phaseAngleDeg: Number(phaseAngleDeg.toFixed(1)),
    gravityAssistSupported,
    gravityAssistApplied,
  };
}
