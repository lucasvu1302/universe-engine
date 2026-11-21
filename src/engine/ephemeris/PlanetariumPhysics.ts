export interface PlanetariumCity {
  id: string;
  nameVi: string;
  nameEn: string;
  latDeg: number;
  lonDeg: number;
}

export interface HorizontalCoordsResult {
  altitudeDeg: number;
  azimuthDeg: number;
  clampedLatDeg: number;
  wrappedLonDeg: number;
  lstDeg: number;
  usedJ2000Fallback: boolean;
}

export const PLANETARIUM_CITIES: ReadonlyArray<PlanetariumCity> = [
  { id: 'hanoi', nameVi: 'Hà Nội', nameEn: 'Hanoi', latDeg: 21.0285, lonDeg: 105.8542 },
  { id: 'hcmc', nameVi: 'TP. Hồ Chí Minh', nameEn: 'Ho Chi Minh City', latDeg: 10.8231, lonDeg: 106.6297 },
  { id: 'tokyo', nameVi: 'Tokyo', nameEn: 'Tokyo', latDeg: 35.6762, lonDeg: 139.6503 },
  { id: 'reykjavik', nameVi: 'Reykjavik (Bắc Cực Quang)', nameEn: 'Reykjavik', latDeg: 64.1466, lonDeg: -21.9426 },
  { id: 'antarctica', nameVi: 'Nam Cực (McMurdo)', nameEn: 'Antarctica (McMurdo)', latDeg: -77.8419, lonDeg: 166.6863 },
];

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const J2000_MS = Date.UTC(2000, 0, 1, 12, 0, 0);

function wrapLongitude(lonRaw: number): number {
  if (!Number.isFinite(lonRaw)) return 0;
  let wrapped = ((((lonRaw + 180) % 360) + 360) % 360) - 180;
  if (wrapped === -180 && lonRaw > 0) wrapped = 180;
  return wrapped;
}

function normalizeDeg360(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/**
 * Computes offline horizontal sky coordinates (Altitude, Azimuth) from equatorial (RA, Dec)
 * for any Earth latitude, longitude, and UTC Date.
 * Safely clamps latitude to [-90, 90], wraps longitude into [-180, 180], and falls back to J2000 on Invalid Date.
 */
export function computeHorizontalCoords(
  raHoursRaw: number,
  decDegRaw: number,
  latDegRaw: number,
  lonDegRaw: number,
  utcDate: Date
): HorizontalCoordsResult {
  const clampedLatDeg = Number.isFinite(latDegRaw)
    ? Math.max(-90, Math.min(90, latDegRaw))
    : 0;
  const wrappedLonDeg = wrapLongitude(lonDegRaw);
  const raHours = Number.isFinite(raHoursRaw) ? raHoursRaw : 0;
  const decDeg = Number.isFinite(decDegRaw) ? Math.max(-90, Math.min(90, decDegRaw)) : 0;

  const ms = utcDate instanceof Date ? utcDate.getTime() : Number.NaN;
  const usedJ2000Fallback = !Number.isFinite(ms);
  const effectiveMs = usedJ2000Fallback ? J2000_MS : ms;

  // Days since J2000.0 (2000-01-01 12:00:00 UTC)
  const daysSinceJ2000 = (effectiveMs - J2000_MS) / 86400000;
  const gmstDeg = normalizeDeg360(280.46061837 + 360.98564736629 * daysSinceJ2000);
  const lstDeg = normalizeDeg360(gmstDeg + wrappedLonDeg);

  const haRad = (lstDeg - raHours * 15.0) * DEG_TO_RAD;
  const decRad = decDeg * DEG_TO_RAD;
  const latRad = clampedLatDeg * DEG_TO_RAD;

  const sinAlt = Math.max(
    -1,
    Math.min(1, Math.sin(decRad) * Math.sin(latRad) + Math.cos(decRad) * Math.cos(latRad) * Math.cos(haRad))
  );
  const altRad = Math.asin(sinAlt);

  const azY = -Math.sin(haRad) * Math.cos(decRad);
  const azX = Math.sin(decRad) * Math.cos(latRad) - Math.cos(decRad) * Math.sin(latRad) * Math.cos(haRad);
  const azimuthDeg = normalizeDeg360(Math.atan2(azY, azX) * RAD_TO_DEG);

  return {
    altitudeDeg: Number((altRad * RAD_TO_DEG).toFixed(2)),
    azimuthDeg: Number(azimuthDeg.toFixed(2)),
    clampedLatDeg,
    wrappedLonDeg,
    lstDeg: Number(lstDeg.toFixed(2)),
    usedJ2000Fallback,
  };
}

/**
 * Converts (Altitude, Azimuth) in degrees into 3D sky-dome Cartesian coordinates
 * where North = -Z, East = +X, South = +Z, West = -X, Zenith = +Y.
 */
export function altAzToDomeVector(
  altitudeDeg: number,
  azimuthDeg: number,
  radius: number
): [number, number, number] {
  const altRad = altitudeDeg * DEG_TO_RAD;
  const azRad = azimuthDeg * DEG_TO_RAD;
  const cosAlt = Math.cos(altRad);
  return [
    radius * cosAlt * Math.sin(azRad),
    radius * Math.sin(altRad),
    -radius * cosAlt * Math.cos(azRad),
  ];
}
