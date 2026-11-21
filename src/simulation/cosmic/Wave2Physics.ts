import type {
  CutawayBodyId,
  DefenseMethodId,
  NBodyPresetId,
  TrappistPlanetId,
} from '@/stores/useAppStore';

export const MAX_NBODY_BODIES = 8;
export const MAX_SPAWNED_PLANETS = 5;

function clamp(v: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(v)) return fallback;
  return Math.max(min, Math.min(max, v));
}

// ============================================================================
// 1. N-Body Symplectic Velocity Verlet Gravity Solver (R2)
// ============================================================================
export interface NBodyBody {
  id: string;
  mass: number;
  radius: number;
  isStar: boolean;
  color: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  ax: number;
  ay: number;
  az: number;
}

export interface NBodyStepMetrics {
  kineticEnergy: number;
  potentialEnergy: number;
  totalEnergy: number;
  rocheDisrupted: boolean;
  minStarDist: number;
}

/**
 * Lightweight non-React module telemetry ref updated by NBodySandboxScene and polled by HUD (INV1).
 */
export const nbodyLiveTelemetry = {
  bodyCount: 3,
  rocheDisrupted: false,
  totalEnergy: 0,
  minStarDist: 99,
};

export function createNBodyPreset(preset: NBodyPresetId): NBodyBody[] {
  if (preset === 'figure8') {
    // Classic Chenciner-Montgomery 3-body Figure-8 choreography (G = 1, m = 1)
    return [
      {
        id: 'star_a',
        mass: 1.0,
        radius: 0.42,
        isStar: true,
        color: '#fbbf24',
        x: -0.97000436,
        y: 0.0,
        z: 0.24308753,
        vx: 0.466203685,
        vy: 0.0,
        vz: 0.43236573,
        ax: 0,
        ay: 0,
        az: 0,
      },
      {
        id: 'star_b',
        mass: 1.0,
        radius: 0.42,
        isStar: true,
        color: '#38bdf8',
        x: 0.97000436,
        y: 0.0,
        z: -0.24308753,
        vx: 0.466203685,
        vy: 0.0,
        vz: 0.43236573,
        ax: 0,
        ay: 0,
        az: 0,
      },
      {
        id: 'star_c',
        mass: 1.0,
        radius: 0.42,
        isStar: true,
        color: '#f97316',
        x: 0.0,
        y: 0.0,
        z: 0.0,
        vx: -0.93240737,
        vy: 0.0,
        vz: -0.86473146,
        ax: 0,
        ay: 0,
        az: 0,
      },
    ];
  }

  if (preset === 'binary_tatooine') {
    return [
      {
        id: 'star_primary',
        mass: 2.2,
        radius: 0.65,
        isStar: true,
        color: '#fde047',
        x: -0.75,
        y: 0,
        z: 0,
        vx: 0,
        vy: 0,
        vz: -0.68,
        ax: 0,
        ay: 0,
        az: 0,
      },
      {
        id: 'star_secondary',
        mass: 1.4,
        radius: 0.5,
        isStar: true,
        color: '#fb923c',
        x: 1.18,
        y: 0,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 1.07,
        ax: 0,
        ay: 0,
        az: 0,
      },
      {
        id: 'planet_tatooine',
        mass: 0.02,
        radius: 0.24,
        isStar: false,
        color: '#38bdf8',
        x: 0,
        y: 0.12,
        z: 4.35,
        vx: -0.91,
        vy: 0,
        vz: 0,
        ax: 0,
        ay: 0,
        az: 0,
      },
    ];
  }

  if (preset === 'custom_solar') {
    return [
      {
        id: 'sun_core',
        mass: 3.5,
        radius: 0.78,
        isStar: true,
        color: '#fcd34d',
        x: 0,
        y: 0,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        ax: 0,
        ay: 0,
        az: 0,
      },
      {
        id: 'planet_inner',
        mass: 0.015,
        radius: 0.24,
        isStar: false,
        color: '#38bdf8',
        x: 2.9,
        y: 0,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 1.09,
        ax: 0,
        ay: 0,
        az: 0,
      },
      {
        id: 'planet_outer',
        mass: 0.03,
        radius: 0.3,
        isStar: false,
        color: '#fb923c',
        x: -4.4,
        y: 0.15,
        z: 0,
        vx: 0,
        vy: 0,
        vz: -0.88,
        ax: 0,
        ay: 0,
        az: 0,
      },
    ];
  }

  // Default: 'trisolaris' — Chaotic 3-Star system with an Earth-like survivor planet
  return [
    {
      id: 'alpha_a',
      mass: 1.35,
      radius: 0.56,
      isStar: true,
      color: '#fef08a',
      x: -1.85,
      y: 0.18,
      z: -0.45,
      vx: 0.18,
      vy: 0.04,
      vz: 0.58,
      ax: 0,
      ay: 0,
      az: 0,
    },
    {
      id: 'alpha_b',
      mass: 1.15,
      radius: 0.48,
      isStar: true,
      color: '#fb923c',
      x: 1.75,
      y: -0.22,
      z: 0.52,
      vx: -0.22,
      vy: -0.05,
      vz: -0.62,
      ax: 0,
      ay: 0,
      az: 0,
    },
    {
      id: 'proxima',
      mass: 0.82,
      radius: 0.4,
      isStar: true,
      color: '#60a5fa',
      x: 0.12,
      y: 0.55,
      z: 2.35,
      vx: -0.58,
      vy: 0.06,
      vz: -0.14,
      ax: 0,
      ay: 0,
      az: 0,
    },
    {
      id: 'trisolaris_world',
      mass: 0.01,
      radius: 0.22,
      isStar: false,
      color: '#34d399',
      x: -3.6,
      y: 0,
      z: 1.8,
      vx: 0.45,
      vy: 0.02,
      vz: 0.72,
      ax: 0,
      ay: 0,
      az: 0,
    },
  ];
}

function computeAccelerationsInPlace(bodies: NBodyBody[], softSq: number): number {
  const n = bodies.length;
  for (let i = 0; i < n; i++) {
    bodies[i].ax = 0;
    bodies[i].ay = 0;
    bodies[i].az = 0;
  }

  let potential = 0;
  for (let i = 0; i < n; i++) {
    const bi = bodies[i];
    for (let j = i + 1; j < n; j++) {
      const bj = bodies[j];
      const dx = bj.x - bi.x;
      const dy = bj.y - bi.y;
      const dz = bj.z - bi.z;
      const rSq = dx * dx + dy * dy + dz * dz + softSq;
      const invR = 1 / Math.sqrt(rSq);
      const invR3 = invR * invR * invR;

      bi.ax += bj.mass * dx * invR3;
      bi.ay += bj.mass * dy * invR3;
      bi.az += bj.mass * dz * invR3;

      bj.ax -= bi.mass * dx * invR3;
      bj.ay -= bi.mass * dy * invR3;
      bj.az -= bi.mass * dz * invR3;

      potential -= bi.mass * bj.mass * invR;
    }
  }
  return potential;
}

/**
 * In-place zero-allocation symplectic Velocity Verlet integrator (INV1).
 * Pass a reusable `out` scratch object inside useFrame for strict 0-alloc stepping.
 */
export function stepNBodyVerlet(
  bodies: NBodyBody[],
  dtInput: number,
  softening = 0.04,
  out?: NBodyStepMetrics
): NBodyStepMetrics {
  const n = bodies.length;
  const soft = Math.max(0.005, Number.isFinite(softening) ? softening : 0.04);
  const softSq = soft * soft;
  const dt = Number.isFinite(dtInput) && dtInput > 0 ? Math.min(dtInput, 0.04) : 0;

  // Ensure initial accelerations are populated before half-kick
  let potentialEnergy = computeAccelerationsInPlace(bodies, softSq);

  if (dt > 0 && n > 1) {
    const halfDt = 0.5 * dt;
    for (let i = 0; i < n; i++) {
      const b = bodies[i];
      b.vx += b.ax * halfDt;
      b.vy += b.ay * halfDt;
      b.vz += b.az * halfDt;

      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.z += b.vz * dt;
    }

    potentialEnergy = computeAccelerationsInPlace(bodies, softSq);

    for (let i = 0; i < n; i++) {
      const b = bodies[i];
      b.vx += b.ax * halfDt;
      b.vy += b.ay * halfDt;
      b.vz += b.az * halfDt;
    }
  }

  let kineticEnergy = 0;
  let rocheDisrupted = false;
  let minStarDist = Number.POSITIVE_INFINITY;

  for (let i = 0; i < n; i++) {
    const b = bodies[i];
    kineticEnergy += 0.5 * b.mass * (b.vx * b.vx + b.vy * b.vy + b.vz * b.vz);

    if (!b.isStar) {
      for (let s = 0; s < n; s++) {
        const star = bodies[s];
        if (!star.isStar) continue;
        const dist = Math.hypot(b.x - star.x, b.y - star.y, b.z - star.z);
        if (dist < minStarDist) minStarDist = dist;
        // Classical Roche radius visual scale (~1.65x stellar radius)
        const rocheLimit = star.radius * 1.65;
        if (dist < rocheLimit) {
          rocheDisrupted = true;
        }
      }
    }
  }

  const totalEnergy = kineticEnergy + potentialEnergy;
  const safeMinDist = Number.isFinite(minStarDist) ? minStarDist : 0;

  if (out) {
    out.kineticEnergy = kineticEnergy;
    out.potentialEnergy = potentialEnergy;
    out.totalEnergy = totalEnergy;
    out.rocheDisrupted = rocheDisrupted;
    out.minStarDist = safeMinDist;
    return out;
  }

  return {
    kineticEnergy,
    potentialEnergy,
    totalEnergy,
    rocheDisrupted,
    minStarDist: safeMinDist,
  };
}

// ============================================================================
// 2. Mars Terraforming 1,000-Year Climate & Hydrosphere Model (R3)
// ============================================================================
export interface MarsTerraformState {
  years: number;
  pressureMbar: number;
  tempC: number;
  oceanPct: number;
  oxygenPct: number;
  vegetationPct: number;
  habitabilityPct: number;
  iceCapScale: number;
}

export function evaluateMarsTerraform(input: {
  years: number;
  mirrors: boolean;
  ghg: boolean;
  comets: boolean;
}): MarsTerraformState {
  const years = clamp(input.years, 0, 1000, 0);
  const t = years / 1000;

  const mirrorFactor = input.mirrors ? 1.0 : 0.25;
  const ghgFactor = input.ghg ? 1.0 : 0.3;
  const cometFactor = input.comets ? 1.0 : 0.2;

  const thermalBoost = 0.45 * mirrorFactor + 0.55 * ghgFactor;
  const pressureMbar = Math.round(6 + 960 * Math.pow(t, 0.92) * (0.35 * mirrorFactor + 0.45 * ghgFactor + 0.2 * cometFactor));
  const tempC = Number((-63 + 80 * Math.pow(t, 0.58) * thermalBoost).toFixed(1));
  const liquidUnlock = Math.max(0, Math.min(1, (tempC + 22) / 36));
  const oceanPct = Number((46 * Math.pow(t, 0.85) * liquidUnlock * (0.3 + 0.7 * cometFactor)).toFixed(1));
  const oxygenPct = Number((0.13 + 20.6 * Math.pow(Math.max(0, t - 0.15) / 0.85, 1.35) * liquidUnlock * ghgFactor).toFixed(1));
  const vegetationPct = Number((38 * Math.pow(Math.max(0, t - 0.28) / 0.72, 1.2) * liquidUnlock * (0.5 + 0.5 * cometFactor)).toFixed(1));
  const habitabilityPct = Math.round(
    Math.min(
      100,
      Math.max(
        0,
        (pressureMbar / 950) * 32 +
          Math.max(0, (tempC + 40) / 56) * 28 +
          (oceanPct / 45) * 20 +
          (oxygenPct / 20) * 20
      )
    )
  );
  const iceCapScale = Number(Math.max(0.18, 1.0 - t * 0.78 * mirrorFactor).toFixed(3));

  return {
    years,
    pressureMbar,
    tempC,
    oceanPct,
    oxygenPct,
    vegetationPct,
    habitabilityPct,
    iceCapScale,
  };
}

// ============================================================================
// 3. Planetary & Stellar Internal Cutaway Profiles (R4)
// ============================================================================
export interface CutawayLayer {
  id: string;
  nameVi: string;
  nameEn: string;
  outerRadiusNorm: number;
  depthKm: string;
  tempK: string;
  pressureGPa: string;
  compositionVi: string;
  compositionEn: string;
  colorHex: string;
  emissiveHex: string;
}

export interface CutawayBodyProfile {
  id: CutawayBodyId;
  nameVi: string;
  nameEn: string;
  radiusKm: number;
  layers: CutawayLayer[];
}

const CUTAWAY_PROFILES: Record<CutawayBodyId, CutawayBodyProfile> = {
  earth: {
    id: 'earth',
    nameVi: 'Trái Đất',
    nameEn: 'Earth',
    radiusKm: 6371,
    layers: [
      {
        id: 'crust',
        nameVi: 'Vỏ Lục Địa & Đại Dương',
        nameEn: 'Silicate Crust',
        outerRadiusNorm: 1.0,
        depthKm: '0 – 70 km',
        tempK: '288 – 1.100 K',
        pressureGPa: '0.0001 – 2 GPa',
        compositionVi: 'Đá silicat, granit, bazan và nước biển',
        compositionEn: 'Granite, basalt silicates & liquid oceans',
        colorHex: '#1e3a5f',
        emissiveHex: '#0b192c',
      },
      {
        id: 'mantle',
        nameVi: 'Lớp Phủ Magma Silicat',
        nameEn: 'Convecting Silicate Mantle',
        outerRadiusNorm: 0.965,
        depthKm: '70 – 2.890 km',
        tempK: '1.300 – 4.000 K',
        pressureGPa: '2 – 136 GPa',
        compositionVi: 'Peridotit giàu Mg-Fe nóng chảy dẻo đối lưu',
        compositionEn: 'Plastic Mg-Fe silicate mantle driving plate tectonics',
        colorHex: '#c2410c',
        emissiveHex: '#7c2d12',
      },
      {
        id: 'outer_core',
        nameVi: 'Lõi Ngoài Sắt-Niken Lỏng',
        nameEn: 'Liquid Fe-Ni Outer Core',
        outerRadiusNorm: 0.55,
        depthKm: '2.890 – 5.150 km',
        tempK: '4.400 – 5.500 K',
        pressureGPa: '136 – 330 GPa',
        compositionVi: 'Hợp kim Fe-Ni lỏng tạo hiệu ứng dynamo từ trường',
        compositionEn: 'Convecting liquid Fe-Ni generating Earth’s geodynamo',
        colorHex: '#f59e0b',
        emissiveHex: '#d97706',
      },
      {
        id: 'inner_core',
        nameVi: 'Lõi Trong Tinh Thể Sắt Rắn',
        nameEn: 'Solid Crystalline Inner Core',
        outerRadiusNorm: 0.24,
        depthKm: '5.150 – 6.371 km',
        tempK: '5.700 – 6.000 K',
        pressureGPa: '330 – 364 GPa',
        compositionVi: 'Tinh thể sắt lục phương đặc siêu nén nóng bằng bề mặt Mặt Trời',
        compositionEn: 'Super-compressed HCP iron crystal hotter than solar photosphere',
        colorHex: '#fef08a',
        emissiveHex: '#fde047',
      },
    ],
  },
  sun: {
    id: 'sun',
    nameVi: 'Mặt Trời',
    nameEn: 'The Sun',
    radiusKm: 696340,
    layers: [
      {
        id: 'photosphere',
        nameVi: 'Quang Cầu & Vùng Đối Lưu',
        nameEn: 'Photosphere & Convective Zone',
        outerRadiusNorm: 1.0,
        depthKm: '0 – 200.000 km',
        tempK: '5.778 – 2.000.000 K',
        pressureGPa: '0.00001 – 50.000 GPa',
        compositionVi: 'Plasma Hydro-Heli sôi sục thành các tế bào hạt đối lưu',
        compositionEn: 'Boiling H-He plasma rising in turbulent granulation cells',
        colorHex: '#f97316',
        emissiveHex: '#ea580c',
      },
      {
        id: 'tachocline',
        nameVi: 'Lớp Chuyển Tiếp Tachocline',
        nameEn: 'Magnetic Tachocline',
        outerRadiusNorm: 0.72,
        depthKm: '200.000 – 230.000 km',
        tempK: '2.200.000 K',
        pressureGPa: '120.000 GPa',
        compositionVi: 'Vùng xoắn từ trường cực mạnh sinh ra vết đen và bão Mặt Trời',
        compositionEn: 'High-shear magnetic dynamo layer spawning sunspots & flares',
        colorHex: '#f59e0b',
        emissiveHex: '#f59e0b',
      },
      {
        id: 'radiative',
        nameVi: 'Vùng Bức Xạ Photon',
        nameEn: 'Radiative Zone',
        outerRadiusNorm: 0.65,
        depthKm: '230.000 – 520.000 km',
        tempK: '2.5M – 7.0M K',
        pressureGPa: '5.000.000 GPa',
        compositionVi: 'Plasma siêu đặc, photon mất ~170.000 năm để khuếch tán qua',
        compositionEn: 'Ultra-dense plasma requiring ~170,000 years for photons to escape',
        colorHex: '#fde047',
        emissiveHex: '#facc15',
      },
      {
        id: 'fusion_core',
        nameVi: 'Lõi Nhiệt Hạch Proton-Proton',
        nameEn: 'Thermonuclear Fusion Core',
        outerRadiusNorm: 0.27,
        depthKm: '520.000 – 696.340 km',
        tempK: '15.700.000 K',
        pressureGPa: '26.500.000 GPa',
        compositionVi: 'Tổng hợp 600 triệu tấn Hydro thành Heli mỗi giây',
        compositionEn: 'Fusing 600 million tons of Hydrogen into Helium every second',
        colorHex: '#ffffff',
        emissiveHex: '#e0f2fe',
      },
    ],
  },
  jupiter: {
    id: 'jupiter',
    nameVi: 'Sao Mộc',
    nameEn: 'Jupiter',
    radiusKm: 69911,
    layers: [
      {
        id: 'clouds',
        nameVi: 'Khí Quyển Hydro & Mây Amoniac',
        nameEn: 'Molecular H₂ & Ammonia Clouds',
        outerRadiusNorm: 1.0,
        depthKm: '0 – 1.000 km',
        tempK: '165 – 1.200 K',
        pressureGPa: '0.0001 – 1 GPa',
        compositionVi: 'Dải bão khí Hydro, Heli, tinh thể băng NH₃ và Vết Đỏ Lớn',
        compositionEn: 'Banded H₂/He storms, NH₃ ice decks & Great Red Spot',
        colorHex: '#d97706',
        emissiveHex: '#451a03',
      },
      {
        id: 'liquid_h2',
        nameVi: 'Đại Dương Hydro Phân Tử Lỏng',
        nameEn: 'Liquid Molecular Hydrogen',
        outerRadiusNorm: 0.9,
        depthKm: '1.000 – 15.000 km',
        tempK: '1.200 – 10.000 K',
        pressureGPa: '1 – 200 GPa',
        compositionVi: 'Chất lỏng siêu tới hạn Hydro và Heli nóng rực dưới áp suất cao',
        compositionEn: 'Supercritical fluid H₂/He transitioning smoothly under pressure',
        colorHex: '#b45309',
        emissiveHex: '#78350f',
      },
      {
        id: 'metallic_h',
        nameVi: 'Hydro Kim Loại Lỏng Dẫn Điện',
        nameEn: 'Liquid Metallic Hydrogen',
        outerRadiusNorm: 0.72,
        depthKm: '15.000 – 55.000 km',
        tempK: '10.000 – 20.000 K',
        pressureGPa: '200 – 3.000 GPa',
        compositionVi: 'Electron tách tự do tạo từ trường mạnh gấp 20.000 lần Trái Đất',
        compositionEn: 'Degenerate conducting H generating Jupiter’s vast magnetosphere',
        colorHex: '#38bdf8',
        emissiveHex: '#0284c7',
      },
      {
        id: 'dilute_core',
        nameVi: 'Lõi Đá-Băng Khuếch Tán (Juno)',
        nameEn: 'Fuzzy Heavy-Element Core',
        outerRadiusNorm: 0.28,
        depthKm: '55.000 – 69.911 km',
        tempK: '24.000 K',
        pressureGPa: '4.500 GPa',
        compositionVi: 'Đá silicat và băng siêu nén khối lượng ~15 lần Trái Đất',
        compositionEn: 'Diffuse ~15 Earth-mass silicate/ice core discovered by Juno',
        colorHex: '#fef3c7',
        emissiveHex: '#fbbf24',
      },
    ],
  },
  europa: {
    id: 'europa',
    nameVi: 'Vệ Tinh Băng Europa',
    nameEn: 'Europa (Jovian Moon)',
    radiusKm: 1561,
    layers: [
      {
        id: 'ice_shell',
        nameVi: 'Vỏ Băng Nước Nứt Gãy',
        nameEn: 'Fractured Water-Ice Shell',
        outerRadiusNorm: 1.0,
        depthKm: '0 – 25 km',
        tempK: '102 – 260 K',
        pressureGPa: '0 – 0.03 GPa',
        compositionVi: 'Băng H₂O tinh khiết pha muối sunfat đỏ nâu dọc vết nứt linea',
        compositionEn: 'Cryogenic water ice laced with hydrated salts along chaos lineae',
        colorHex: '#bae6fd',
        emissiveHex: '#0c4a6e',
      },
      {
        id: 'subsurface_ocean',
        nameVi: 'Đại Dương Ngầm Nước Mặn Lỏng',
        nameEn: 'Global Subsurface Liquid Ocean',
        outerRadiusNorm: 0.91,
        depthKm: '25 – 125 km',
        tempK: '270 – 278 K',
        pressureGPa: '0.03 – 0.16 GPa',
        compositionVi: 'Đại dương mặn sâu 100 km, trữ lượng nước gấp đôi Trái Đất, có miệng thủy nhiệt',
        compositionEn: '100 km-deep salty ocean (~2× Earth’s water) warmed by tidal flexing',
        colorHex: '#0ea5e9',
        emissiveHex: '#0369a1',
      },
      {
        id: 'rocky_mantle',
        nameVi: 'Lớp Phủ Đá Silicat',
        nameEn: 'Silicate Rocky Mantle',
        outerRadiusNorm: 0.72,
        depthKm: '125 – 1.050 km',
        tempK: '900 – 1.500 K',
        pressureGPa: '0.16 – 3.2 GPa',
        compositionVi: 'Đá silicat bị nung nóng bởi lực thủy triều khổng lồ của Sao Mộc',
        compositionEn: 'Tidally heated rocky seafloor feeding hydrothermal vents',
        colorHex: '#78716c',
        emissiveHex: '#44403c',
      },
      {
        id: 'metallic_core',
        nameVi: 'Lõi Sắt-Sulfua',
        nameEn: 'Metallic Fe-FeS Core',
        outerRadiusNorm: 0.34,
        depthKm: '1.050 – 1.561 km',
        tempK: '1.800 K',
        pressureGPa: '3.2 – 5.4 GPa',
        compositionVi: 'Lõi kim loại sắt và sắt-sulfua đặc chắc ở tâm vệ tinh',
        compositionEn: 'Dense iron-iron sulfide metallic core at center',
        colorHex: '#f59e0b',
        emissiveHex: '#b45309',
      },
    ],
  },
  neutron_star: {
    id: 'neutron_star',
    nameVi: 'Sao Neutron',
    nameEn: 'Neutron Star',
    radiusKm: 12,
    layers: [
      {
        id: 'outer_crust',
        nameVi: 'Vỏ Tinh Thể Sắt Siêu Cứng',
        nameEn: 'Crystalline Iron Outer Crust',
        outerRadiusNorm: 1.0,
        depthKm: '0 – 0.5 km',
        tempK: '600.000 K',
        pressureGPa: '10¹⁸ GPa',
        compositionVi: 'Mạng tinh thể hạt nhân sắt ngập trong biển electron suy biến',
        compositionEn: 'Iron ion lattice immersed in a relativistic electron sea',
        colorHex: '#38bdf8',
        emissiveHex: '#0284c7',
      },
      {
        id: 'nuclear_pasta',
        nameVi: 'Vỏ Trong "Mì Ống Hạt Nhân"',
        nameEn: 'Nuclear Pasta Inner Crust',
        outerRadiusNorm: 0.88,
        depthKm: '0.5 – 1.5 km',
        tempK: '10⁸ K',
        pressureGPa: '10²² GPa',
        compositionVi: 'Vật chất cứng nhất vũ trụ: hạt nhân ép thành tấm và sợi siêu đặc',
        compositionEn: 'Strongest material in the cosmos: gnocchi/spaghetti nuclear phases',
        colorHex: '#818cf8',
        emissiveHex: '#4f46e5',
      },
      {
        id: 'superfluid_outer',
        nameVi: 'Lõi Ngoài Siêu Lỏng Neutron',
        nameEn: 'Superfluid Neutron Outer Core',
        outerRadiusNorm: 0.72,
        depthKm: '1.5 – 8.0 km',
        tempK: '5 × 10⁸ K',
        pressureGPa: '10²⁴ GPa',
        compositionVi: 'Siêu lỏng neutron không ma sát pha proton siêu dẫn',
        compositionEn: 'Frictionless neutron superfluid & superconducting protons',
        colorHex: '#c084fc',
        emissiveHex: '#9333ea',
      },
      {
        id: 'quark_core',
        nameVi: 'Lõi Trong Vật Chất Quark Lạ',
        nameEn: 'Exotic Quark-Gluon Inner Core',
        outerRadiusNorm: 0.32,
        depthKm: '8.0 – 12.0 km',
        tempK: '10⁹ K',
        pressureGPa: '10²⁵ GPa',
        compositionVi: 'Mật độ 10¹⁵ g/cm³ — một thìa cà phê nặng hơn cả đỉnh Everest',
        compositionEn: 'Supra-nuclear quark-gluon plasma (~10¹⁵ g/cm³)',
        colorHex: '#f0f9ff',
        emissiveHex: '#67e8f9',
      },
    ],
  },
};

export function getCutawayBodyProfile(bodyId: string): CutawayBodyProfile {
  if (bodyId in CUTAWAY_PROFILES) {
    return CUTAWAY_PROFILES[bodyId as CutawayBodyId];
  }
  return CUTAWAY_PROFILES.earth;
}

export function clampCutawayAngle(deg: number): number {
  return clamp(deg, 0, 180, 95);
}

// ============================================================================
// 4. Planetary Defense — DART Kinetic, Gravity Tractor & Laser Ablation (R5)
// ============================================================================
export interface PlanetaryDefenseState {
  method: DefenseMethodId;
  leadDays: number;
  deltaVMms: number;
  missDistanceKm: number;
  outcome: 'SAFE' | 'IMPACT';
  deflectionAngleDeg: number;
}

const EARTH_SAFETY_RADIUS_KM = 6371 + 1200; // Earth radius + safe atmospheric buffer

export function evaluatePlanetaryDefense(
  method: DefenseMethodId,
  leadDaysInput: number
): PlanetaryDefenseState {
  const leadDays = clamp(leadDaysInput, 1, 365, 180);
  // Heavy planetary-defense delta-v imparted to Apophis-class asteroid (mm/s)
  const deltaVMms =
    method === 'kinetic_dart'
      ? 280
      : method === 'laser_ablation'
      ? 195
      : 105; // gravity tractor imparts steady gentler tug, requiring longer lead time

  // Orbital along-track displacement amplifies ~3x via Keplerian period shift: ds ≈ 3 * dv * T
  const leadSeconds = leadDays * 86400;
  const missDistanceKm = Math.round(3.0 * (deltaVMms * 1e-6) * leadSeconds * 10) / 10;
  const outcome: 'SAFE' | 'IMPACT' = missDistanceKm > EARTH_SAFETY_RADIUS_KM ? 'SAFE' : 'IMPACT';
  const deflectionAngleDeg = Number(Math.min(18, (missDistanceKm / 18000) * 8.5).toFixed(2));

  return {
    method,
    leadDays,
    deltaVMms,
    missDistanceKm,
    outcome,
    deflectionAngleDeg,
  };
}

// ============================================================================
// 5. TRAPPIST-1 Exoplanet System & Kepler/JWST Transit Photometry (R6)
// ============================================================================
export interface TrappistPlanetSpec {
  id: TrappistPlanetId;
  name: string;
  orbitRadiusVisual: number;
  orbitalPeriodDays: number;
  radiusEarth: number;
  eqTempK: number;
  inHabitableZone: boolean;
  colorHex: string;
  atmosphere: {
    h2o: number;
    co2: number;
    ch4: number;
    o2: number;
  };
  noteVi: string;
  noteEn: string;
}

export const TRAPPIST_PLANETS: readonly TrappistPlanetSpec[] = [
  {
    id: 'b',
    name: 'TRAPPIST-1b',
    orbitRadiusVisual: 4.2,
    orbitalPeriodDays: 1.51,
    radiusEarth: 1.12,
    eqTempK: 400,
    inHabitableZone: false,
    colorHex: '#b45309',
    atmosphere: { h2o: 4, co2: 18, ch4: 2, o2: 1 },
    noteVi: 'Đá núi lửa khô nóng, JWST cho thấy gần như không có khí quyển dày.',
    noteEn: 'Scorched bare rock; JWST thermal emission indicates minimal atmosphere.',
  },
  {
    id: 'c',
    name: 'TRAPPIST-1c',
    orbitRadiusVisual: 5.7,
    orbitalPeriodDays: 2.42,
    radiusEarth: 1.1,
    eqTempK: 342,
    inHabitableZone: false,
    colorHex: '#d97706',
    atmosphere: { h2o: 8, co2: 26, ch4: 5, o2: 6 },
    noteVi: 'Tương tự Sao Kim cỡ Trái Đất với bầu khí quyển mỏng giàu oxy/CO₂.',
    noteEn: 'Venus-sized rocky world with tenuous oxygen/CO₂ envelope.',
  },
  {
    id: 'd',
    name: 'TRAPPIST-1d',
    orbitRadiusVisual: 7.4,
    orbitalPeriodDays: 4.05,
    radiusEarth: 0.79,
    eqTempK: 288,
    inHabitableZone: true,
    colorHex: '#38bdf8',
    atmosphere: { h2o: 56, co2: 38, ch4: 18, o2: 24 },
    noteVi: 'Rìa trong Vùng Ở Được, có thể giữ nước lỏng quanh dải hoàng hôn vĩnh cửu.',
    noteEn: 'Inner habitable edge; terminator band may host liquid surface water.',
  },
  {
    id: 'e',
    name: 'TRAPPIST-1e',
    orbitRadiusVisual: 9.4,
    orbitalPeriodDays: 6.1,
    radiusEarth: 0.92,
    eqTempK: 251,
    inHabitableZone: true,
    colorHex: '#10b981',
    atmosphere: { h2o: 86, co2: 44, ch4: 32, o2: 52 },
    noteVi: 'Ứng viên hàng đầu cho sự sống: lõi sắt đặc, đại dương lỏng và bầu trời có 6 hành tinh láng giềng.',
    noteEn: 'Prime habitable candidate: dense iron core, global oceans & huge neighbor worlds in the sky.',
  },
  {
    id: 'f',
    name: 'TRAPPIST-1f',
    orbitRadiusVisual: 11.7,
    orbitalPeriodDays: 9.21,
    radiusEarth: 1.04,
    eqTempK: 219,
    inHabitableZone: true,
    colorHex: '#0ea5e9',
    atmosphere: { h2o: 72, co2: 58, ch4: 26, o2: 28 },
    noteVi: 'Thế giới đại dương băng giàu nước, có khả năng duy trì biển lỏng nhờ hiệu ứng nhà kính.',
    noteEn: 'Water-rich ocean/ice world sustained by greenhouse warming.',
  },
  {
    id: 'g',
    name: 'TRAPPIST-1g',
    orbitRadiusVisual: 14.1,
    orbitalPeriodDays: 12.35,
    radiusEarth: 1.13,
    eqTempK: 199,
    inHabitableZone: true,
    colorHex: '#6366f1',
    atmosphere: { h2o: 64, co2: 68, ch4: 34, o2: 14 },
    noteVi: 'Hành tinh lớn nhất trong hệ, nằm ở rìa ngoài Vùng Ở Được.',
    noteEn: 'Largest world in the system, orbiting near the outer habitable boundary.',
  },
  {
    id: 'h',
    name: 'TRAPPIST-1h',
    orbitRadiusVisual: 16.9,
    orbitalPeriodDays: 18.77,
    radiusEarth: 0.75,
    eqTempK: 173,
    inHabitableZone: false,
    colorHex: '#94a3b8',
    atmosphere: { h2o: 22, co2: 15, ch4: 48, o2: 4 },
    noteVi: 'Thế giới băng đá xa nhất kiểu Europa với đại dương ngầm dưới vỏ băng.',
    noteEn: 'Cryogenic outer ice world potentially harboring a subsurface ocean.',
  },
] as const;

export interface TrappistTransitState {
  planetId: TrappistPlanetId;
  phase: number;
  fluxNormalized: number;
  dipPpm: number;
  inTransit: boolean;
}

/**
 * Lightweight non-React module telemetry ref updated by TrappistSystemScene
 * so the HUD Kepler transit light-curve stays synced with the real 3D orbit (INV1).
 */
export const trappistLiveTelemetry = {
  phase: 0.5,
};

export function evaluateTrappistTransit(planetId: string, phaseInput: number): TrappistTransitState {
  const spec = TRAPPIST_PLANETS.find((p) => p.id === planetId) ?? TRAPPIST_PLANETS[3];
  const rawPhase = Number.isFinite(phaseInput) ? ((phaseInput % 1) + 1) % 1 : 0.5;

  // Star radius ~0.1192 R_sun (~13.0 R_earth) -> real geometric transit depth (Rp / Rs)^2 ~ 0.45%–0.76%
  const starRadiusEarth = 13.0;
  const maxDepth = Math.pow(spec.radiusEarth / starRadiusEarth, 2); // ~0.0050 for TRAPPIST-1e
  const halfDuration = 0.095;
  const distFromMid = Math.abs(rawPhase - 0.5);

  let dip = 0;
  if (distFromMid < halfDuration) {
    // Limb-darkened U-shaped transit trough
    const u = distFromMid / halfDuration;
    const limbProfile = Math.sqrt(Math.max(0, 1 - u * u));
    dip = maxDepth * (0.28 + 0.72 * limbProfile);
  }

  const fluxNormalized = Number(Math.max(0.95, 1.0 - dip).toFixed(5));
  return {
    planetId: spec.id,
    phase: rawPhase,
    fluxNormalized,
    dipPpm: Math.round(dip * 1e6),
    inTransit: dip > 1e-5,
  };
}

// ============================================================================
// 6. Dyson Swarm & Kardashev Scale Model (R7)
// ============================================================================
export interface DysonSwarmState {
  completion: number;
  activeCollectors: number;
  capturedPowerWatts: number;
  kardashevScale: number;
  visibleTransmission: number;
  irWasteTempK: number;
}

const SOLAR_LUMINOSITY_WATTS = 3.828e26;
const EARTH_BASELINE_WATTS = 2.0e13; // ~K0.73 modern humanity

export function evaluateDysonSwarm(completionInput: number): DysonSwarmState {
  const completion = clamp(completionInput, 0, 1, 0);
  const activeCollectors = Math.round(completion * 720);

  // Smooth log-power interpolation from Type 0.73 (~2e13 W) to Type 2.00 (~3.828e26 W)
  const logBase = Math.log10(EARTH_BASELINE_WATTS);
  const logFull = Math.log10(SOLAR_LUMINOSITY_WATTS);
  const logPower = logBase + (logFull - logBase) * Math.pow(completion, 0.78);
  const capturedPowerWatts = completion <= 0 ? EARTH_BASELINE_WATTS : Math.pow(10, logPower);

  // Carl Sagan Kardashev formula: K = (log10(P) - 6) / 10 (clamped so full solar output -> ~2.00)
  const rawK = (Math.log10(capturedPowerWatts) - 6) / 10;
  const kardashevScale = Number(Math.min(2.0, Math.max(0.73, rawK)).toFixed(2));
  const visibleTransmission = Number(Math.max(0.06, 1.0 - completion * 0.88).toFixed(3));
  const irWasteTempK = Math.round(120 + completion * 210);

  return {
    completion,
    activeCollectors,
    capturedPowerWatts,
    kardashevScale,
    visibleTransmission,
    irWasteTempK,
  };
}

// ============================================================================
// 7. Special & General Relativity Time Dilation + Einstein Ring (R8)
// ============================================================================
export interface RelativityState {
  velocityC: number;
  radiusRs: number;
  lorentzGamma: number;
  gravTimeFactor: number;
  combinedShipRate: number;
  earthYearsPerShipHour: number;
  dopplerBlueShift: number;
  einsteinRadiusNorm: number;
  lensOffset: number;
}

export function evaluateRelativity(
  velocityCInput: number,
  radiusRsInput: number,
  lensOffsetInput = 0.14
): RelativityState {
  const velocityC = clamp(velocityCInput, 0, 0.9999, 0.85);
  const radiusRs = clamp(radiusRsInput, 1.01, 20, 3.5);
  const lensOffset = clamp(lensOffsetInput, -1.5, 1.5, 0.14);

  const lorentzGamma = 1 / Math.sqrt(Math.max(1e-8, 1 - velocityC * velocityC));
  const gravTimeFactor = Math.sqrt(Math.max(1e-4, 1 - 1 / radiusRs));
  // Ship proper time elapsed per 1 second of distant Earth coordinate time
  const combinedShipRate = gravTimeFactor / lorentzGamma;
  const earthHoursPerShipHour = 1 / Math.max(1e-6, combinedShipRate);
  const earthYearsPerShipHour = Number((earthHoursPerShipHour / 8766).toFixed(5));
  const dopplerBlueShift = Number(Math.sqrt((1 + velocityC) / Math.max(1e-5, 1 - velocityC)).toFixed(2));
  const einsteinRadiusNorm = Number(Math.min(0.46, 0.14 + 0.42 / Math.sqrt(radiusRs)).toFixed(3));

  return {
    velocityC,
    radiusRs,
    lorentzGamma: Number(lorentzGamma.toFixed(3)),
    gravTimeFactor: Number(gravTimeFactor.toFixed(4)),
    combinedShipRate: Number(combinedShipRate.toFixed(5)),
    earthYearsPerShipHour,
    dopplerBlueShift,
    einsteinRadiusNorm,
    lensOffset,
  };
}

// ============================================================================
// 8. Kessler Syndrome LEO/MEO/GEO Debris Cascade Model (R8)
// ============================================================================
export interface KesslerState {
  cascadeLevel: number;
  activeSatellites: number;
  debrisCount: number;
  launchLockoutPct: number;
  issRiskLevel: 'LOW' | 'ELEVATED' | 'CRITICAL';
}

export function evaluateKesslerCascade(
  cascadeLevelInput: number,
  triggered: boolean
): KesslerState {
  const cascadeLevel = clamp(cascadeLevelInput, 0, 1, 0.25);
  const effective = triggered ? Math.min(1, 0.22 + cascadeLevel * 0.78) : cascadeLevel * 0.35;

  const activeSatellites = Math.max(1200, Math.round(10800 - effective * 6400));
  const debrisCount = Math.round(36000 + Math.pow(effective, 1.65) * 480000);
  const launchLockoutPct = Math.round(Math.min(100, Math.max(1, effective * effective * 98 + 2)));
  const issRiskLevel: 'LOW' | 'ELEVATED' | 'CRITICAL' =
    launchLockoutPct >= 60 ? 'CRITICAL' : launchLockoutPct >= 22 ? 'ELEVATED' : 'LOW';

  return {
    cascadeLevel,
    activeSatellites,
    debrisCount,
    launchLockoutPct,
    issRiskLevel,
  };
}
