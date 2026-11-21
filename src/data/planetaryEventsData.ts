import * as THREE from 'three';
import { CELESTIAL_BODIES } from '@/data/celestialData';
import { SimulationClock } from '@/engine/simulation/SimulationClock';

export type PlanetaryEventArchetype =
  | 'cyclone_vortex'
  | 'polar_hexagon'
  | 'dust_storm'
  | 'ice_cloud_veil'
  | 'volcanic_plume'
  | 'cryo_geyser'
  | 'lightning_storm'
  | 'impact_flash'
  | 'thermal_fissure'
  | 'polar_aurora'
  | 'plasma_tail'
  | 'ring_spokes'
  | 'diamond_shimmer'
  | 'solar_flare_loop';

export type PlanetaryEventCategory =
  | 'storm'
  | 'volcanic'
  | 'cryo'
  | 'electrical'
  | 'aurora'
  | 'impact'
  | 'solar'
  | 'ring_exosphere';

export type PlanetaryEventFrameMode = 'spin' | 'tilt_locked' | 'antisolar';

export type PlanetaryEventViewMode = 'orbital' | 'surface';

export type EventSurfaceBiome =
  | 'volcanic_lava'
  | 'cryo_ice_geyser'
  | 'dust_impact_desert'
  | 'gas_giant_clouds'
  | 'polar_aurora_sky';

export interface SurfaceStageConfig {
  bodyId: string;
  skyZenith: string;
  skyHorizon: string;
  skyGlow: string;
  groundPrimary: string;
  groundSecondary: string;
  groundAccent: string;
  fogColor: string;
  gravityLabel: string;
  horizonBodyId: string | null;
  horizonHasRings: boolean;
  horizonScale: number;
  starfieldOpacity: number;
}

interface RawPlanetarySurfaceEvent {
  id: string;
  bodyId: string;
  archetype: PlanetaryEventArchetype;
  category: PlanetaryEventCategory;
  frameMode: PlanetaryEventFrameMode;
  latDeg: number;
  lonDeg: number;
  /** Radius multiplier above visualRadius where the phenomenon anchors */
  radiusFactor: number;
  /** Angular/radial scale relative to planet visualRadius */
  scaleFactor: number;
  /** Multiplier on body rotationSpeed for super-rotating atmospheric bands */
  superRotation: number;
  primaryColor: string;
  secondaryColor: string;
  titleVi: string;
  titleEn: string;
  summaryVi: string;
  summaryEn: string;
  metricLabelVi: string;
  metricLabelEn: string;
  metricValueVi: string;
  metricValueEn: string;
}

export interface PlanetarySurfaceEvent extends RawPlanetarySurfaceEvent {
  recommendedView: PlanetaryEventViewMode;
  surfaceBiome: EventSurfaceBiome;
}

export interface PlanetaryEventBurstState {
  eventId: string;
  nonce: number;
  triggeredAt: number;
}

export interface HotspotNormalOptions {
  superRotation?: number;
  frameMode?: PlanetaryEventFrameMode;
  bodyWorldPos?: THREE.Vector3;
}

export interface PlanetaryLodThresholds {
  fadeStart: number;
  cullDist: number;
}

/**
 * 16 Solar System Worlds · 44 Astrophysically Authentic Live Surface & Atmospheric Events.
 * Covers all 8 planets, the Sun, and 7 geologically/magnetically active moons.
 */
const RAW_PLANETARY_EVENTS: readonly RawPlanetarySurfaceEvent[] = [
  // ===================== 1. MERCURY (3) =====================
  {
    id: 'mercury_sodium_tail',
    bodyId: 'mercury',
    archetype: 'plasma_tail',
    category: 'ring_exosphere',
    frameMode: 'antisolar',
    latDeg: 0,
    lonDeg: 180,
    radiusFactor: 1.04,
    scaleFactor: 2.8,
    superRotation: 1.0,
    primaryColor: '#fbbf24',
    secondaryColor: '#f59e0b',
    titleVi: 'Đuôi Natri Khí Quyển Chống Mặt Trời',
    titleEn: 'Anti-Solar Sodium Exosphere Tail',
    summaryVi:
      'Áp suất bức xạ và gió Mặt Trời thổi bạt nguyên tử natri khỏi vỏ Sao Thủy thành dải đuôi vàng cam dài hàng triệu km tựa sao chổi.',
    summaryEn:
      'Solar radiation pressure sweeps sputtered sodium atoms off Mercury into a glowing amber comet-like tail extending millions of kilometers.',
    metricLabelVi: 'Chiều dài đuôi',
    metricLabelEn: 'Tail Length',
    metricValueVi: '~2.4 triệu km',
    metricValueEn: '~2.4M km',
  },
  {
    id: 'mercury_caloris_impacts',
    bodyId: 'mercury',
    archetype: 'impact_flash',
    category: 'impact',
    frameMode: 'spin',
    latDeg: 30.5,
    lonDeg: -170.2,
    radiusFactor: 1.008,
    scaleFactor: 0.42,
    superRotation: 1.0,
    primaryColor: '#fffbeb',
    secondaryColor: '#fb923c',
    titleVi: 'Chớp Va Chạm Thiên Thạch Lòng Chảo Caloris',
    titleEn: 'Caloris Basin Micrometeoroid Flashes',
    summaryVi:
      'Do không có khí quyển bảo vệ, thiên thạch vi mô lao thẳng vào bề mặt đá ở tốc độ >40 km/s tạo tia chớp hóa hơi rực trắng và vành bụi giãn nở.',
    summaryEn:
      'With no protective atmosphere, hypervelocity micrometeoroids slam into regolith at >40 km/s, igniting incandescent vapor flashes and ejecta rings.',
    metricLabelVi: 'Vận tốc va chạm',
    metricLabelEn: 'Impact Speed',
    metricValueVi: '42 – 65 km/s',
    metricValueEn: '42 – 65 km/s',
  },
  {
    id: 'mercury_terminator_venting',
    bodyId: 'mercury',
    archetype: 'thermal_fissure',
    category: 'volcanic',
    frameMode: 'spin',
    latDeg: -12,
    lonDeg: 90,
    radiusFactor: 1.007,
    scaleFactor: 0.48,
    superRotation: 1.0,
    primaryColor: '#f97316',
    secondaryColor: '#fde047',
    titleVi: 'Nứt Vỡ Nhiệt & Thoát Khí Vách Đá Lobate',
    titleEn: 'Lobate Scarp Thermal Fracture Venting',
    summaryVi:
      'Chênh lệch nhiệt độ cực đoan giữa mặt ngày (+430°C) và mặt đêm (-180°C) gây ứng suất co rút dọc các vách đứt gãy Discovery Rupes.',
    summaryEn:
      'Extreme +430°C to -180°C diurnal thermal swings flex Mercury’s lobate thrust scarps, driving micro-fracturing and volatile outgassing.',
    metricLabelVi: 'Biên độ nhiệt',
    metricLabelEn: 'Thermal Swing',
    metricValueVi: '610°C / chu kỳ',
    metricValueEn: '610°C / cycle',
  },

  // ===================== 2. VENUS (3) =====================
  {
    id: 'venus_super_vortex',
    bodyId: 'venus',
    archetype: 'cyclone_vortex',
    category: 'storm',
    frameMode: 'spin',
    latDeg: -84,
    lonDeg: 0,
    radiusFactor: 1.016,
    scaleFactor: 0.64,
    superRotation: 1.65,
    primaryColor: '#fde68a',
    secondaryColor: '#d97706',
    titleVi: 'Siêu Xoáy Đôi Cực Nam Khí Quyển',
    titleEn: 'South Polar Double-Eye Sulfuric Vortex',
    summaryVi:
      'Cơn xoáy hình chữ S hai tâm khổng lồ quay nhanh gấp 60 lần thân hành tinh trong tầng mây axit sunfuric dày đặc (quan sát bởi Venus Express).',
    summaryEn:
      'An S-shaped double-eye vortex driven by 4-day atmospheric super-rotation through thick golden sulfuric acid clouds (observed by Venus Express).',
    metricLabelVi: 'Gió tầng mây',
    metricLabelEn: 'Cloud-Top Wind',
    metricValueVi: '360 km/h',
    metricValueEn: '360 km/h',
  },
  {
    id: 'venus_acid_lightning',
    bodyId: 'venus',
    archetype: 'lightning_storm',
    category: 'electrical',
    frameMode: 'spin',
    latDeg: 14,
    lonDeg: 42,
    radiusFactor: 1.018,
    scaleFactor: 0.52,
    superRotation: 1.45,
    primaryColor: '#fef08a',
    secondaryColor: '#c084fc',
    titleVi: 'Sét Axit Sunfuric Trong Đám Mây Đậm Đặc',
    titleEn: 'Sulfuric Acid Cloud Super-Lightning',
    summaryVi:
      'Các tia phóng điện tần số cao bùng sáng xuyên qua tầng mây H₂SO₄ dày 20 km ở độ cao 50 km phía trên áp suất nghiền nát 92 bar.',
    summaryEn:
      'High-energy electrical discharges crackle across dense H₂SO₄ decks 50 km above the crushing 92-bar supercritical CO₂ surface.',
    metricLabelVi: 'Áp suất đáy',
    metricLabelEn: 'Surface Pressure',
    metricValueVi: '92 bar · 465°C',
    metricValueEn: '92 bar · 465°C',
  },
  {
    id: 'venus_maat_mons_volcano',
    bodyId: 'venus',
    archetype: 'volcanic_plume',
    category: 'volcanic',
    frameMode: 'spin',
    latDeg: 0.5,
    lonDeg: -165.4,
    radiusFactor: 1.01,
    scaleFactor: 0.58,
    superRotation: 1.0,
    primaryColor: '#ff5722',
    secondaryColor: '#fbbf24',
    titleVi: 'Núi Lửa Maat Mons Phun Dung Nham & SO₂',
    titleEn: 'Maat Mons Active Caldera & SO₂ Plume',
    summaryVi:
      'Ngọn núi lửa cao 8 km vừa được xác nhận còn hoạt động từ dữ liệu radar Magellan, phun trào dung nham bazan và khí lưu huỳnh nuôi tầng mây axit.',
    summaryEn:
      'An 8-km shield volcano confirmed active in Magellan radar reanalysis, venting glowing basaltic lava and sulfur dioxide into the thick atmosphere.',
    metricLabelVi: 'Đỉnh núi lửa',
    metricLabelEn: 'Summit Height',
    metricValueVi: '8.0 km · SO₂',
    metricValueEn: '8.0 km · SO₂',
  },

  // ===================== 3. EARTH (4) =====================
  {
    id: 'earth_pacific_typhoon',
    bodyId: 'earth',
    archetype: 'cyclone_vortex',
    category: 'storm',
    frameMode: 'spin',
    latDeg: 18,
    lonDeg: 134,
    radiusFactor: 1.017,
    scaleFactor: 0.52,
    superRotation: 1.15,
    primaryColor: '#f8fafc',
    secondaryColor: '#7dd3fc',
    titleVi: 'Siêu Bão Nhiệt Đới Cấp 5 Thái Bình Dương',
    titleEn: 'Category-5 Pacific Super-Typhoon',
    summaryVi:
      'Hệ thống mây đối lưu xoắn ốc sắc nét có mắt bão rõ rệt trên Tây Thái Bình Dương, hút năng lượng nhiệt từ đại dương ấm tạo gió giật 295 km/h.',
    summaryEn:
      'A razor-sharp spiral tropical cyclone with a distinct eyewall over the western Pacific, powered by warm ocean heat with 295 km/h gusts.',
    metricLabelVi: 'Sức gió mắt bão',
    metricLabelEn: 'Eyewall Winds',
    metricValueVi: '295 km/h (Cấp 5)',
    metricValueEn: '295 km/h (Cat 5)',
  },
  {
    id: 'earth_ring_of_fire_volcano',
    bodyId: 'earth',
    archetype: 'volcanic_plume',
    category: 'volcanic',
    frameMode: 'spin',
    latDeg: 19.4,
    lonDeg: -155.3,
    radiusFactor: 1.008,
    scaleFactor: 0.24,
    superRotation: 1.0,
    primaryColor: '#d97745',
    secondaryColor: '#94a3b8',
    titleVi: 'Phun Trào Núi Lửa Vành Đai Lửa Thái Bình Dương',
    titleEn: 'Pacific Ring of Fire Stratospheric Eruption',
    summaryVi:
      'Cột tro bụi và tàn lửa nóng đỏ bốc cao vào tầng bình lưu từ miệng núi lửa hoạt động mạnh (Kīlauea / Vành đai lửa), tỏa ánh dung nham xuyên màn đêm.',
    summaryEn:
      'Incandescent magma embers and ash columns surge skyward along the Pacific Ring of Fire, illuminating nearby cloud decks from below.',
    metricLabelVi: 'Cột tro phun',
    metricLabelEn: 'Plume Altitude',
    metricValueVi: '18 km · 1.150°C',
    metricValueEn: '18 km · 1,150°C',
  },
  {
    id: 'earth_tropical_lightning',
    bodyId: 'earth',
    archetype: 'lightning_storm',
    category: 'electrical',
    frameMode: 'spin',
    latDeg: -2,
    lonDeg: 24,
    radiusFactor: 1.018,
    scaleFactor: 0.44,
    superRotation: 1.1,
    primaryColor: '#e0f2fe',
    secondaryColor: '#38bdf8',
    titleVi: 'Mạng Lưới Siêu Sét Giông Nhiệt Đới Xích Đạo',
    titleEn: 'Equatorial Supercell Lightning Network',
    summaryVi:
      'Hàng chục tia sét phân nhánh đánh liên tục mỗi giây trong các siêu ổ giông vùng Lưu vực Congo và đới hội tụ nhiệt đới.',
    summaryEn:
      'Dozens of branching cloud-to-ground and anvil lightning flashes per second pulsing across equatorial Congo Basin supercell storms.',
    metricLabelVi: 'Tần suất phóng điện',
    metricLabelEn: 'Flash Rate',
    metricValueVi: '~45 tia / giây',
    metricValueEn: '~45 flashes / s',
  },
  {
    id: 'earth_polar_aurora',
    bodyId: 'earth',
    archetype: 'polar_aurora',
    category: 'aurora',
    frameMode: 'tilt_locked',
    latDeg: 70,
    lonDeg: 15,
    radiusFactor: 1.022,
    scaleFactor: 0.54,
    superRotation: 1.0,
    primaryColor: '#34d399',
    secondaryColor: '#a855f7',
    titleVi: 'Vành Đai Cực Quang Địa Từ (Bắc & Nam Cực)',
    titleEn: 'Geomagnetic Polar Auroral Ovals',
    summaryVi:
      'Dải rèm ánh sáng xanh ngọc lục bảo (Oxy 557.7 nm) và tím hồng (Nitơ) uốn lượn ở độ cao 110–300 km quanh hai cực từ Trái Đất.',
    summaryEn:
      'Rippling emerald oxygen (557.7 nm) and violet nitrogen curtains shimmering 110–300 km above both geomagnetic poles.',
    metricLabelVi: 'Độ cao tầng điện ly',
    metricLabelEn: 'Ionosphere Alt',
    metricValueVi: '110 – 300 km',
    metricValueEn: '110 – 300 km',
  },

  // ===================== 4. MARS (4) =====================
  {
    id: 'mars_global_dust_storm',
    bodyId: 'mars',
    archetype: 'dust_storm',
    category: 'storm',
    frameMode: 'spin',
    latDeg: -32,
    lonDeg: 70,
    radiusFactor: 1.015,
    scaleFactor: 0.72,
    superRotation: 1.25,
    primaryColor: '#e07a3f',
    secondaryColor: '#f5b076',
    titleVi: 'Siêu Bão Bụi Lưu Vực Hellas Phủ Bán Cầu',
    titleEn: 'Hellas Basin Planet-Encircling Dust Storm',
    summaryVi:
      'Những luồng bụi oxit sắt mịn bốc cao 40 km quét qua lưu vực Hellas, nhuộm bầu trời Sao Hỏa thành sắc cam đồng rực rỡ suốt nhiều tuần.',
    summaryEn:
      'Fine ferric-oxide dust billows 40 km high from Hellas Planitia, sweeping across southern highlands in planet-encircling ochre clouds.',
    metricLabelVi: 'Độ cao lớp bụi',
    metricLabelEn: 'Dust Ceiling',
    metricValueVi: '40 km · 110 km/h',
    metricValueEn: '40 km · 110 km/h',
  },
  {
    id: 'mars_jezero_dust_devils',
    bodyId: 'mars',
    archetype: 'dust_storm',
    category: 'storm',
    frameMode: 'spin',
    latDeg: 18.4,
    lonDeg: 77.5,
    radiusFactor: 1.013,
    scaleFactor: 0.22,
    superRotation: 1.04,
    primaryColor: '#d9824b',
    secondaryColor: '#8f4824',
    titleVi: 'Lốc Xoáy Bụi Cao 8 km Vùng Jezero & Amazonis',
    titleEn: 'Towering 8-km Martian Dust Devils',
    summaryVi:
      'Cột xoáy đối lưu khổng lồ do mặt đất ấm lên giữa trưa, thường xuyên quét sạch bụi trên tấm pin của các xe tự hành NASA.',
    summaryEn:
      'Convective dust vortices rising 8 km into Mars’s thin CO₂ atmosphere, carving dark wind tracks and cleaning rover solar panels.',
    metricLabelVi: 'Chiều cao lốc',
    metricLabelEn: 'Vortex Height',
    metricValueVi: '8 km · 120 km/h',
    metricValueEn: '8 km · 120 km/h',
  },
  {
    id: 'mars_valles_ice_clouds',
    bodyId: 'mars',
    archetype: 'ice_cloud_veil',
    category: 'cryo',
    frameMode: 'spin',
    latDeg: -13.9,
    lonDeg: -59.2,
    radiusFactor: 1.018,
    scaleFactor: 0.56,
    superRotation: 1.2,
    primaryColor: '#e0f2fe',
    secondaryColor: '#93c5fd',
    titleVi: 'Mây Băng Đêm Sáng Hẻm Núi Valles Marineris',
    titleEn: 'Valles Marineris Noctilucent CO₂ Cirrus',
    summaryVi:
      'Dải mây tinh thể băng khô CO₂ mỏng ánh lam lơ lửng ở độ cao 60 km phía trên hệ thống hẻm núi sâu nhất Hệ Mặt Trời.',
    summaryEn:
      'Iridescent high-altitude dry-ice cirrus wisps drifting 60 km above the 4,000-km-long Valles Marineris rift canyon.',
    metricLabelVi: 'Độ cao mây băng',
    metricLabelEn: 'Cloud Altitude',
    metricValueVi: '60 km · -125°C',
    metricValueEn: '60 km · -125°C',
  },
  {
    id: 'mars_proton_aurora',
    bodyId: 'mars',
    archetype: 'polar_aurora',
    category: 'aurora',
    frameMode: 'tilt_locked',
    latDeg: -52,
    lonDeg: 175,
    radiusFactor: 1.021,
    scaleFactor: 0.48,
    superRotation: 1.0,
    primaryColor: '#c084fc',
    secondaryColor: '#38bdf8',
    titleVi: 'Cực Quang Proton & Vỏ Từ Trường Nam Bán Cầu',
    titleEn: 'MAVEN Discrete & Proton Crustal Aurora',
    summaryVi:
      'Quầng sáng tử ngoại–tím mềm xuất hiện khi proton gió Mặt Trời tương tác với các vùng đá vỏ nhiễm từ cổ đại của Sao Hỏa.',
    summaryEn:
      'Soft ultraviolet-violet auroral arcs ignited where solar-wind protons strike magnetized crustal anomalies in Mars’s southern highlands.',
    metricLabelVi: 'Nguồn phát xạ',
    metricLabelEn: 'Emission Source',
    metricValueVi: 'Proton · MAVEN UV',
    metricValueEn: 'Proton · MAVEN UV',
  },

  // ===================== 5. JUPITER (4) =====================
  {
    id: 'jupiter_great_red_spot',
    bodyId: 'jupiter',
    archetype: 'cyclone_vortex',
    category: 'storm',
    frameMode: 'spin',
    latDeg: -22.5,
    lonDeg: -92,
    radiusFactor: 1.012,
    scaleFactor: 0.34,
    superRotation: 1.0,
    primaryColor: '#c85a32',
    secondaryColor: '#8f341b',
    titleVi: 'Vết Đỏ Lớn (Siêu Bão 350 Năm Lớn Hơn Trái Đất)',
    titleEn: 'Great Red Spot 350-Year Anticyclone',
    summaryVi:
      'Cơn bão phản xoáy đỏ rực đường kính ~16.350 km quay ngược chiều kim đồng hồ với sức gió rìa 640 km/h và các xoáy nhiễu loạn bao quanh.',
    summaryEn:
      'A 16,350-km crimson anticyclone larger than Earth, churning counter-clockwise with 640 km/h rim winds and sheared turbulent eddies.',
    metricLabelVi: 'Sức gió rìa bão',
    metricLabelEn: 'Rim Wind Speed',
    metricValueVi: '640 km/h · 1.3× TĐ',
    metricValueEn: '640 km/h · 1.3× Earth',
  },
  {
    id: 'jupiter_ammonia_superbolts',
    bodyId: 'jupiter',
    archetype: 'lightning_storm',
    category: 'electrical',
    frameMode: 'spin',
    latDeg: 12,
    lonDeg: 35,
    radiusFactor: 1.015,
    scaleFactor: 0.42,
    superRotation: 1.08,
    primaryColor: '#67e8f9',
    secondaryColor: '#e0f2fe',
    titleVi: 'Siêu Sét Amoniac Mạnh Gấp 1.000 Lần Trái Đất',
    titleEn: 'Juno Shallow Ammonia-Water Superbolts',
    summaryVi:
      'Tàu Juno phát hiện các tia siêu sét xanh lơ đánh giữa mưa đá amoniac–nước ở độ sâu 50 km với năng lượng phóng điện khủng khiếp.',
    summaryEn:
      'Electric-cyan superbolts discovered by NASA’s Juno spacecraft crackling inside ammonia-water hailstorms at 1,000× Earth lightning power.',
    metricLabelVi: 'Năng lượng tia sét',
    metricLabelEn: 'Bolt Energy',
    metricValueVi: '10¹² J (×1.000 TĐ)',
    metricValueEn: '10¹² J (1,000× Earth)',
  },
  {
    id: 'jupiter_polar_aurora',
    bodyId: 'jupiter',
    archetype: 'polar_aurora',
    category: 'aurora',
    frameMode: 'tilt_locked',
    latDeg: 78,
    lonDeg: 0,
    radiusFactor: 1.022,
    scaleFactor: 0.56,
    superRotation: 1.0,
    primaryColor: '#60a5fa',
    secondaryColor: '#a855f7',
    titleVi: 'Cực Quang Tia X Mạnh Nhất Hệ Mặt Trời',
    titleEn: 'Jovian Megawatt X-Ray Polar Aurora',
    summaryVi:
      'Vành đai cực quang xanh–tím không bao giờ tắt, được tiếp năng lượng từ từ trường mạnh gấp 20.000 lần Trái Đất và vành plasma núi lửa Io.',
    summaryEn:
      'Permanent electric-blue & violet polar ovals powered by Jupiter’s colossal magnetosphere and volcanic plasma shed from Io.',
    metricLabelVi: 'Công suất phát xạ',
    metricLabelEn: 'Auroral Power',
    metricValueVi: '~100 Terawatt',
    metricValueEn: '~100 Terawatts',
  },
  {
    id: 'jupiter_shoemaker_impact',
    bodyId: 'jupiter',
    archetype: 'impact_flash',
    category: 'impact',
    frameMode: 'spin',
    latDeg: -38,
    lonDeg: 118,
    radiusFactor: 1.014,
    scaleFactor: 0.36,
    superRotation: 1.0,
    primaryColor: '#ffffff',
    secondaryColor: '#f59e0b',
    titleVi: 'Quả Cầu Lửa Va Chạm Sao Chổi Khí Quyển',
    titleEn: 'Jovian Bolide Fireball Impact Plume',
    summaryVi:
      'Lực hấp dẫn khổng lồ của Sao Mộc thường xuyên hút các sao chổi và tiểu hành tinh lao vào tầng mây trên tạo vụ nổ nhiệt hạch chói lòa và vòng sóng chấn động.',
    summaryEn:
      'Jupiter’s massive gravity acts as a cosmic shield, pulling in bolides that detonate in blinding white-gold flashes and dark shockwave rings.',
    metricLabelVi: 'Năng lượng nổ',
    metricLabelEn: 'Blast Yield',
    metricValueVi: 'Hàng chục Megaton',
    metricValueEn: 'Multi-Megaton',
  },

  // ===================== 6. SATURN (4) =====================
  {
    id: 'saturn_north_hexagon',
    bodyId: 'saturn',
    archetype: 'polar_hexagon',
    category: 'storm',
    frameMode: 'tilt_locked',
    latDeg: 78,
    lonDeg: 0,
    radiusFactor: 1.015,
    scaleFactor: 0.52,
    superRotation: 1.0,
    primaryColor: '#c9b48a',
    secondaryColor: '#486b6e',
    titleVi: 'Dòng Tia Lục Giác Khổng Lồ Cực Bắc',
    titleEn: 'North Polar Hexagonal Jet Stream',
    summaryVi:
      'Sóng đứng khí động lực học 6 cạnh hoàn hảo rộng 29.000 km bao quanh một siêu bão mắt sâu ngay đúng cực Bắc Sao Thổ (ảnh Cassini).',
    summaryEn:
      'An iconic 29,000-km six-sided Rossby standing-wave jet stream encircling a deep churning polar hurricane at Saturn’s north pole.',
    metricLabelVi: 'Đường kính lục giác',
    metricLabelEn: 'Hexagon Width',
    metricValueVi: '29.000 km · 320 km/h',
    metricValueEn: '29,000 km · 320 km/h',
  },
  {
    id: 'saturn_dragon_storm',
    bodyId: 'saturn',
    archetype: 'lightning_storm',
    category: 'electrical',
    frameMode: 'spin',
    latDeg: -35,
    lonDeg: 140,
    radiusFactor: 1.015,
    scaleFactor: 0.44,
    superRotation: 1.06,
    primaryColor: '#fef9c3',
    secondaryColor: '#38bdf8',
    titleVi: 'Siêu Bão Rồng Phát Sóng Vô Tuyến',
    titleEn: 'Saturnian Dragon Radio-Burst Megastorm',
    summaryVi:
      'Cơn giông đối lưu trắng xóa bùng phát theo chu kỳ ở bán cầu Nam, phóng ra chùm tia sét mạnh gấp 10.000 lần sét Trái Đất kèm xung radio.',
    summaryEn:
      'A convective white ammonia thunderhead in Saturn’s Storm Alley unleashing 10,000× lightning bursts and powerful electrostatic radio pulses.',
    metricLabelVi: 'Xung sét vô tuyến',
    metricLabelEn: 'Lightning Power',
    metricValueVi: '×10.000 sét TĐ',
    metricValueEn: '10,000× Earth bolts',
  },
  {
    id: 'saturn_ring_spokes',
    bodyId: 'saturn',
    archetype: 'ring_spokes',
    category: 'ring_exosphere',
    frameMode: 'tilt_locked',
    latDeg: 0,
    lonDeg: 65,
    radiusFactor: 1.0,
    scaleFactor: 1.0,
    superRotation: 1.0,
    primaryColor: '#e2e8f0',
    secondaryColor: '#38bdf8',
    titleVi: 'Nan Hoa Tĩnh Điện & Mưa Băng Vành Đai',
    titleEn: 'Electrostatic Ring Spokes & Ring Rain',
    summaryVi:
      'Các dải bụi băng tích điện lơ lửng tạo thành vệt "nan hoa" quét ngang vành đai B, kèm dòng mưa tinh thể nước rơi theo đường sức từ xuống khí quyển.',
    summaryEn:
      'Ghostly radially aligned electrostatic dust spokes sweeping across Saturn’s B-ring alongside ionized water-ice "ring rain" streaming into the upper atmosphere.',
    metricLabelVi: 'Lưu lượng mưa băng',
    metricLabelEn: 'Ring Rain Flux',
    metricValueVi: '~10 tấn / giây',
    metricValueEn: '~10 tons / sec',
  },
  {
    id: 'saturn_polar_aurora',
    bodyId: 'saturn',
    archetype: 'polar_aurora',
    category: 'aurora',
    frameMode: 'tilt_locked',
    latDeg: -76,
    lonDeg: 0,
    radiusFactor: 1.022,
    scaleFactor: 0.54,
    superRotation: 1.0,
    primaryColor: '#f472b6',
    secondaryColor: '#a855f7',
    titleVi: 'Cực Quang Tử Ngoại Hai Cực Hồng Tím',
    titleEn: 'Saturnian Dual-Pole UV-Magenta Auroral Rings',
    summaryVi:
      'Hai vòng rèm cực quang sắc hồng–tím rực sáng quanh cực Bắc và cực Nam Sao Thổ khi gió Mặt Trời nén chặt đuôi từ quyển khí khổng lồ.',
    summaryEn:
      'Luminous rose-magenta and violet hydrogen auroral ovals flaring above both Saturnian poles under solar wind compression.',
    metricLabelVi: 'Phổ phát xạ',
    metricLabelEn: 'Spectrum',
    metricValueVi: 'Hydro UV · H₃⁺',
    metricValueEn: 'Hydrogen UV · H₃⁺',
  },

  // ===================== 7. URANUS (3) =====================
  {
    id: 'uranus_polar_hood',
    bodyId: 'uranus',
    archetype: 'cyclone_vortex',
    category: 'storm',
    frameMode: 'tilt_locked',
    latDeg: 74,
    lonDeg: 0,
    radiusFactor: 1.015,
    scaleFactor: 0.56,
    superRotation: 1.0,
    primaryColor: '#e0f2fe',
    secondaryColor: '#67e8f9',
    titleVi: 'Mũ Mây Xoáy Mùa Hè Cực Bắc (Ảnh JWST)',
    titleEn: 'North Polar Seasonal Storm Hood (JWST)',
    summaryVi:
      'Vì trục nghiêng tới 97.77°, cực Bắc Sao Thiên Vương hứng nắng liên tục 42 năm tạo nên mũ mây bão mêtan sáng trắng rực rỡ được JWST ghi lại.',
    summaryEn:
      'Tilted 97.77° on its side, Uranus’s north pole endures 42 years of continuous sunlight, forming a glowing convective methane polar hood imaged by JWST.',
    metricLabelVi: 'Độ nghiêng mùa',
    metricLabelEn: 'Axial Season',
    metricValueVi: '97.77° · 42 năm nắng',
    metricValueEn: '97.77° · 42-yr sun',
  },
  {
    id: 'uranus_methane_storms',
    bodyId: 'uranus',
    archetype: 'ice_cloud_veil',
    category: 'storm',
    frameMode: 'spin',
    latDeg: 28,
    lonDeg: 82,
    radiusFactor: 1.017,
    scaleFactor: 0.54,
    superRotation: 1.25,
    primaryColor: '#f0f9ff',
    secondaryColor: '#38bdf8',
    titleVi: 'Bão Mêtan Trắng Tốc Độ 900 km/h',
    titleEn: '900 km/h Bright Methane Cloud Outbursts',
    summaryVi:
      'Các dải mây băng mêtan trắng sáng bùng phát từ tầng đối lưu sâu, bị xé dài bởi luồng gió ngược chiều mạnh tới 900 km/h.',
    summaryEn:
      'Brilliant white convective methane cloud plumes punching through the cyan haze and shearing across latitudes at 900 km/h.',
    metricLabelVi: 'Gió tầng mây',
    metricLabelEn: 'Jet Velocity',
    metricValueVi: '900 km/h · -216°C',
    metricValueEn: '900 km/h · -216°C',
  },
  {
    id: 'uranus_tilted_aurora',
    bodyId: 'uranus',
    archetype: 'polar_aurora',
    category: 'aurora',
    frameMode: 'tilt_locked',
    latDeg: -35,
    lonDeg: -110,
    radiusFactor: 1.022,
    scaleFactor: 0.5,
    superRotation: 1.0,
    primaryColor: '#22d3ee',
    secondaryColor: '#818cf8',
    titleVi: 'Cực Quang Từ Trường Lệch Tâm Nghiêng 59°',
    titleEn: '59° Off-Axis Magnetospheric Aurora',
    summaryVi:
      'Từ trường kỳ dị lệch 59° so với trục quay khiến cực quang Sao Thiên Vương xuất hiện ngay tại vùng vĩ độ trung bình thay vì gần hai cực.',
    summaryEn:
      'Uranus’s bizarre 59°-tilted, off-center magnetic dipole paints shimmering turquoise-indigo auroral arcs across mid-latitudes instead of the poles.',
    metricLabelVi: 'Độ lệch trục từ',
    metricLabelEn: 'Dipole Tilt',
    metricValueVi: '59° lệch tâm',
    metricValueEn: '59° off-center',
  },

  // ===================== 8. NEPTUNE (3) =====================
  {
    id: 'neptune_supersonic_storm',
    bodyId: 'neptune',
    archetype: 'cyclone_vortex',
    category: 'storm',
    frameMode: 'spin',
    latDeg: -20,
    lonDeg: -30,
    radiusFactor: 1.015,
    scaleFactor: 0.5,
    superRotation: 1.35,
    primaryColor: '#1e3a8a',
    secondaryColor: '#bae6fd',
    titleVi: 'Vết Tối Lớn & Gió Siêu Thanh 2.100 km/h',
    titleEn: 'Great Dark Spot & 2,100 km/h Supersonic Jet',
    summaryVi:
      'Cơn bão xoáy xanh thẫm kèm viền mây băng mêtan trắng sắc nét với tốc độ gió siêu thanh mạnh nhất toàn Hệ Mặt Trời (2.100 km/h).',
    summaryEn:
      'A deep-cobalt anticyclonic storm rimmed with bright white methane companion clouds, whipped by the Solar System’s fastest winds at 2,100 km/h.',
    metricLabelVi: 'Tốc độ gió cực đại',
    metricLabelEn: 'Peak Wind',
    metricValueVi: '2.100 km/h (Mach 1.7)',
    metricValueEn: '2,100 km/h (Mach 1.7)',
  },
  {
    id: 'neptune_diamond_rain',
    bodyId: 'neptune',
    archetype: 'diamond_shimmer',
    category: 'cryo',
    frameMode: 'spin',
    latDeg: 15,
    lonDeg: 120,
    radiusFactor: 1.019,
    scaleFactor: 0.52,
    superRotation: 1.15,
    primaryColor: '#e0f2fe',
    secondaryColor: '#60a5fa',
    titleVi: 'Mưa Kim Cương Siêu Áp Tầng Manti Sâu',
    titleEn: 'Deep Mantle Superionic Diamond Rain',
    summaryVi:
      'Áp suất hàng triệu bar xé phân tử mêtan CH₄ thành tinh thể kim cương lấp lánh rơi sâu xuống lõi băng siêu ion, mô phỏng qua ánh lấp lánh tầng mây.',
    summaryEn:
      'Multi-megabar pressures crush methane into sparkling diamond hailstones sinking toward Neptune’s core, visualized as crystalline sapphire shimmer bands.',
    metricLabelVi: 'Áp suất kết tinh',
    metricLabelEn: 'Formation Pressure',
    metricValueVi: '~1.5 triệu bar',
    metricValueEn: '~1.5M bar',
  },
  {
    id: 'neptune_methane_cirrus',
    bodyId: 'neptune',
    archetype: 'ice_cloud_veil',
    category: 'storm',
    frameMode: 'spin',
    latDeg: -44,
    lonDeg: 65,
    radiusFactor: 1.018,
    scaleFactor: 0.56,
    superRotation: 1.4,
    primaryColor: '#ffffff',
    secondaryColor: '#38bdf8',
    titleVi: 'Dải Mây Tuyết Mêtan Tầng Bình Lưu',
    titleEn: 'Stratospheric Methane-Ice Cirrus Streaks',
    summaryVi:
      'Các dải tuyết mêtan trắng muốt bay cao 50 km trên nền khí quyển xanh lam thẫm, phản xạ ánh Mặt Trời yếu ớt ở khoảng cách 30 AU.',
    summaryEn:
      'Razor-sharp sunlit methane-ice streaks racing 50 km above Neptune’s deep azure deck at 30 AU from the Sun.',
    metricLabelVi: 'Nhiệt độ đỉnh mây',
    metricLabelEn: 'Cloud-Top Temp',
    metricValueVi: '-218°C · 30 AU',
    metricValueEn: '-218°C · 30 AU',
  },

  // ===================== 9. SUN (3) =====================
  {
    id: 'sun_xclass_flare',
    bodyId: 'sun',
    archetype: 'solar_flare_loop',
    category: 'solar',
    frameMode: 'spin',
    latDeg: 16,
    lonDeg: 25,
    radiusFactor: 1.01,
    scaleFactor: 0.42,
    superRotation: 1.0,
    primaryColor: '#fff7ed',
    secondaryColor: '#fb923c',
    titleVi: 'Lóa Mặt Trời Cấp X9 & Vòng Cung Từ Trường',
    titleEn: 'X9-Class Solar Flare & Magnetic Arcade Loops',
    summaryVi:
      'Tái kết nối từ trường dữ dội phóng thích vòng cung plasma nóng 20 triệu Kelvin vươn cao gấp 5 lần đường kính Trái Đất khỏi quang cầu.',
    summaryEn:
      'Explosive magnetic reconnection launches 20-million-Kelvin plasma loops towering five Earth diameters above the solar photosphere.',
    metricLabelVi: 'Nhiệt độ vòng plasma',
    metricLabelEn: 'Loop Plasma Temp',
    metricValueVi: '20 triệu K · X9.0',
    metricValueEn: '20M K · X9.0',
  },
  {
    id: 'sun_cme_eruption',
    bodyId: 'sun',
    archetype: 'volcanic_plume',
    category: 'solar',
    frameMode: 'spin',
    latDeg: -12,
    lonDeg: -65,
    radiusFactor: 1.01,
    scaleFactor: 0.56,
    superRotation: 1.0,
    primaryColor: '#fde047',
    secondaryColor: '#ef4444',
    titleVi: 'Phun Trào Nhật Hoa Khối Lượng Lớn (CME)',
    titleEn: 'Coronal Mass Ejection (CME) Plasma Plume',
    summaryVi:
      'Hàng tỷ tấn plasma tích điện bị đẩy văng vào liên hành tinh với vận tốc tới 2.500 km/s, nguồn gốc các cơn bão địa từ mạnh trên hành tinh.',
    summaryEn:
      'Billions of tons of magnetized coronal plasma blasting outward at 2,500 km/s, driving geomagnetic storms across the Solar System.',
    metricLabelVi: 'Vận tốc phun trào',
    metricLabelEn: 'Ejection Speed',
    metricValueVi: '2.500 km/s',
    metricValueEn: '2,500 km/s',
  },
  {
    id: 'sun_sunspot_ar',
    bodyId: 'sun',
    archetype: 'thermal_fissure',
    category: 'solar',
    frameMode: 'spin',
    latDeg: -18,
    lonDeg: 110,
    radiusFactor: 1.008,
    scaleFactor: 0.44,
    superRotation: 1.0,
    primaryColor: '#fbbf24',
    secondaryColor: '#dc2626',
    titleVi: 'Vùng Hoạt Động Vết Đen Khổng Lồ AR3664',
    titleEn: 'Giant Sunspot Active Region AR3664',
    summaryVi:
      'Cụm vết đen từ trường cực mạnh rộng gấp 15 lần Trái Đất viền sáng rực bởi các mạng faculae đối lưu sôi sục.',
    summaryEn:
      'A magnetically complex sunspot archipelago 15 Earths wide, rimmed by crackling bright faculae and intense magnetic flux.',
    metricLabelVi: 'Từ trường vết đen',
    metricLabelEn: 'Magnetic Flux',
    metricValueVi: '3.500 Gauss',
    metricValueEn: '3,500 Gauss',
  },

  // ===================== 10. ACTIVE MOONS (7 MOONS · 13 EVENTS) =====================
  // Moon (2)
  {
    id: 'moon_impact_flashes',
    bodyId: 'moon',
    archetype: 'impact_flash',
    category: 'impact',
    frameMode: 'spin',
    latDeg: 24,
    lonDeg: -32,
    radiusFactor: 1.012,
    scaleFactor: 0.48,
    superRotation: 1.0,
    primaryColor: '#ffffff',
    secondaryColor: '#fcd34d',
    titleVi: 'Chớp Va Chạm Thiên Thạch Trên Biển Mặt Trăng',
    titleEn: 'Lunar Maria Hypervelocity Impact Flashes',
    summaryVi:
      'Tia chớp sáng chói diễn ra trong tích tắc khi mảnh thiên thạch cỡ nắm tay đâm thẳng xuống bề mặt không khí quyển của Mặt Trăng.',
    summaryEn:
      'Brief brilliant optical flashes recorded by NASA monitors as meteoroids strike the airless lunar maria at cosmic velocities.',
    metricLabelVi: 'Thời lượng chớp',
    metricLabelEn: 'Flash Duration',
    metricValueVi: '0.1 – 0.4 giây',
    metricValueEn: '0.1 – 0.4 sec',
  },
  {
    id: 'moon_electrostatic_dust',
    bodyId: 'moon',
    archetype: 'dust_storm',
    category: 'ring_exosphere',
    frameMode: 'spin',
    latDeg: 0,
    lonDeg: 88,
    radiusFactor: 1.018,
    scaleFactor: 0.56,
    superRotation: 1.0,
    primaryColor: '#cbd5e1',
    secondaryColor: '#94a3b8',
    titleVi: 'Sương Bụi Tĩnh Điện Đường Chân Trời Apollo',
    titleEn: 'Apollo Horizon Electrostatic Dust Levitation',
    summaryVi:
      'Tia UV Mặt Trời nạp điện tích cho hạt bụi regolith khiến chúng lơ lửng thành lớp sương mờ phát sáng dọc ranh giới sáng–tối.',
    summaryEn:
      'Solar UV photoionization charges microscopic regolith grains, levitating a faint glowing horizon dust veil documented by Apollo crews.',
    metricLabelVi: 'Độ cao hạt bụi',
    metricLabelEn: 'Levitation Alt',
    metricValueVi: '10 m – 100 km',
    metricValueEn: '10 m – 100 km',
  },

  // Io (2)
  {
    id: 'io_pele_volcano',
    bodyId: 'io',
    archetype: 'volcanic_plume',
    category: 'volcanic',
    frameMode: 'spin',
    latDeg: -18.7,
    lonDeg: -104.7,
    radiusFactor: 1.01,
    scaleFactor: 0.95,
    superRotation: 1.0,
    primaryColor: '#ff6d00',
    secondaryColor: '#fde047',
    titleVi: 'Núi Lửa Pele Phun Cột Lưu Huỳnh Cao 300 km',
    titleEn: 'Pele 300-km Sulfur Umbrella Eruption',
    summaryVi:
      'Lực thủy triều Sao Mộc nhào nặn Io thành thiên thể núi lửa dữ dội nhất Hệ Mặt Trời: cột phun Pele vọt cao 300 km rồi tỏa tán dù rực lửa.',
    summaryEn:
      'Jovian tidal flexing drives the most volcanically active world known: Pele fires a ballistic sulfur-silicate umbrella plume 300 km into vacuum.',
    metricLabelVi: 'Độ cao cột phun',
    metricLabelEn: 'Plume Height',
    metricValueVi: '300 km · 1.600 K',
    metricValueEn: '300 km · 1,600 K',
  },
  {
    id: 'io_loki_patera',
    bodyId: 'io',
    archetype: 'thermal_fissure',
    category: 'volcanic',
    frameMode: 'spin',
    latDeg: 13,
    lonDeg: 51,
    radiusFactor: 1.01,
    scaleFactor: 0.56,
    superRotation: 1.0,
    primaryColor: '#ef4444',
    secondaryColor: '#facc15',
    titleVi: 'Hồ Dung Nham Khổng Lồ Loki Patera (200 km)',
    titleEn: 'Loki Patera 200-km Molten Magma Lake',
    summaryVi:
      'Hồ dung nham lớn nhất Hệ Mặt Trời rộng 200 km liên tục lật vỡ lớp vỏ đá nguội, phát nhiệt bức xạ hồng ngoại rực cháy.',
    summaryEn:
      'The Solar System’s largest lava lake (200 km wide), overturning its cooling crust in glowing incandescent magma waves.',
    metricLabelVi: 'Đường kính hồ',
    metricLabelEn: 'Caldera Width',
    metricValueVi: '202 km · 1.450 K',
    metricValueEn: '202 km · 1,450 K',
  },

  // Europa (2)
  {
    id: 'europa_water_plumes',
    bodyId: 'europa',
    archetype: 'cryo_geyser',
    category: 'cryo',
    frameMode: 'spin',
    latDeg: -62,
    lonDeg: 145,
    radiusFactor: 1.01,
    scaleFactor: 0.88,
    superRotation: 1.0,
    primaryColor: '#e0f2fe',
    secondaryColor: '#38bdf8',
    titleVi: 'Mạch Phun Nước Đại Dương Ngầm Cao 200 km',
    titleEn: 'Hubble 200-km Subsurface Ocean Water Plumes',
    summaryVi:
      'Hơi nước muối từ đại dương ngầm dưới lớp băng phun vọt cao 200 km qua các vết nứt áp suất thủy triều (quan sát bởi kính Hubble).',
    summaryEn:
      'Salty water vapor jets erupting 200 km above Europa’s ice shell from its global subsurface ocean through tidally stressed fractures.',
    metricLabelVi: 'Độ cao mạch phun',
    metricLabelEn: 'Plume Height',
    metricValueVi: '200 km · H₂O',
    metricValueEn: '200 km · H₂O',
  },
  {
    id: 'europa_tidal_cracks',
    bodyId: 'europa',
    archetype: 'thermal_fissure',
    category: 'cryo',
    frameMode: 'spin',
    latDeg: 15,
    lonDeg: -40,
    radiusFactor: 1.01,
    scaleFactor: 0.56,
    superRotation: 1.0,
    primaryColor: '#38bdf8',
    secondaryColor: '#e0f2fe',
    titleVi: 'Nứt Gãy Kiến Tạo Băng Thủy Triều (Lineae)',
    titleEn: 'Jovian Tidal-Flexing Ice Fissures (Lineae)',
    summaryVi:
      'Chu kỳ kéo nén thủy triều 3.55 ngày làm nứt toác lớp vỏ băng dày 20 km, để lộ tinh thể nước ấm và muối khoáng phát ánh lam nhạt.',
    summaryEn:
      'Every 3.55-day orbit, Jupiter’s tidal tug flexes Europa’s 20-km ice crust, opening fresh cyan frost vents along crisscrossing lineae.',
    metricLabelVi: 'Chu kỳ thủy triều',
    metricLabelEn: 'Tidal Cycle',
    metricValueVi: '3.55 ngày · 30 m',
    metricValueEn: '3.55 days · 30 m',
  },

  // Ganymede (2)
  {
    id: 'ganymede_intrinsic_aurora',
    bodyId: 'ganymede',
    archetype: 'polar_aurora',
    category: 'aurora',
    frameMode: 'tilt_locked',
    latDeg: 45,
    lonDeg: 10,
    radiusFactor: 1.025,
    scaleFactor: 0.62,
    superRotation: 1.0,
    primaryColor: '#38bdf8',
    secondaryColor: '#c084fc',
    titleVi: 'Cực Quang Từ Trường Nội Tại Độc Nhất',
    titleEn: 'Intrinsic Magnetospheric Auroral Belts',
    summaryVi:
      'Vệ tinh duy nhất trong Hệ Mặt Trời sở hữu từ trường riêng, tạo đôi vành đai cực quang oxy phát sáng xanh–tím lung linh ở vĩ độ 45°.',
    summaryEn:
      'The only moon known to generate its own magnetic field, framing twin glowing blue-violet oxygen auroral belts around 45° latitude.',
    metricLabelVi: 'Từ trường riêng',
    metricLabelEn: 'Intrinsic Field',
    metricValueVi: '719 nT (Độc nhất)',
    metricValueEn: '719 nT (Unique)',
  },
  {
    id: 'ganymede_sputter_exosphere',
    bodyId: 'ganymede',
    archetype: 'ice_cloud_veil',
    category: 'ring_exosphere',
    frameMode: 'spin',
    latDeg: -20,
    lonDeg: -120,
    radiusFactor: 1.02,
    scaleFactor: 0.54,
    superRotation: 1.0,
    primaryColor: '#bae6fd',
    secondaryColor: '#818cf8',
    titleVi: 'Quầng Bắn Phá Ion Bức Xạ Từ Sao Mộc',
    titleEn: 'Jovian Plasma Ice-Sputtering Exosphere',
    summaryVi:
      'Các ion năng lượng cao từ từ quyển Sao Mộc bắn phá lớp băng mặt làm giải phóng màng khí quyển mỏng chứa phân tử O₂ và O₃.',
    summaryEn:
      'Energetic Jovian magnetospheric ions bombard Ganymede’s icy crust, sputtering a tenuous glowing oxygen and ozone exosphere.',
    metricLabelVi: 'Thành phần khí',
    metricLabelEn: 'Exosphere Gas',
    metricValueVi: 'O₂ · O₃ băng ion',
    metricValueEn: 'O₂ · O₃ sputtered',
  },

  // Titan (2)
  {
    id: 'titan_methane_monsoon',
    bodyId: 'titan',
    archetype: 'dust_storm',
    category: 'storm',
    frameMode: 'spin',
    latDeg: 68,
    lonDeg: -50,
    radiusFactor: 1.02,
    scaleFactor: 0.64,
    superRotation: 1.3,
    primaryColor: '#f59e0b',
    secondaryColor: '#fef08a',
    titleVi: 'Mưa Rào Mêtan Lỏng Trên Biển Kraken Mare',
    titleEn: 'Kraken Mare Liquid Methane Monsoon Clouds',
    summaryVi:
      'Những đám mây đối lưu mêtan dày đặc kéo tới phía trên đại dương hydrocarbon lỏng ở cực Bắc, trút hạt mưa mêtan to và rơi chậm trong trọng lực yếu.',
    summaryEn:
      'Dense amber convective methane storm decks gathering over Titan’s northern hydrocarbon seas, dropping slow-falling liquid methane rain.',
    metricLabelVi: 'Nhiệt độ mưa',
    metricLabelEn: 'Methane Rain Temp',
    metricValueVi: '-179°C · 1.45 bar',
    metricValueEn: '-179°C · 1.45 bar',
  },
  {
    id: 'titan_cryovolcano',
    bodyId: 'titan',
    archetype: 'cryo_geyser',
    category: 'cryo',
    frameMode: 'spin',
    latDeg: -14.7,
    lonDeg: -40.4,
    radiusFactor: 1.014,
    scaleFactor: 0.64,
    superRotation: 1.0,
    primaryColor: '#fde68a',
    secondaryColor: '#7dd3fc',
    titleVi: 'Núi Lửa Băng Doom Mons Phun Amoniac–Nước',
    titleEn: 'Doom Mons Ammonia-Water Cryovolcano',
    summaryVi:
      'Cấu trúc núi lửa băng cao 1.45 km cạnh hố sụt Sotra Patera, phun sương băng nước trộn amoniac và mêtan bổ sung cho bầu khí quyển vàng cam.',
    summaryEn:
      'A 1.45-km cryovolcanic peak flanking Sotra Patera, venting frosty water-ammonia-methane plumes into Titan’s thick nitrogen haze.',
    metricLabelVi: 'Chiều cao đỉnh',
    metricLabelEn: 'Peak Height',
    metricValueVi: '1.45 km · NH₃–H₂O',
    metricValueEn: '1.45 km · NH₃–H₂O',
  },

  // Enceladus (2)
  {
    id: 'enceladus_tiger_stripes',
    bodyId: 'enceladus',
    archetype: 'cryo_geyser',
    category: 'cryo',
    frameMode: 'spin',
    latDeg: -82,
    lonDeg: 0,
    radiusFactor: 1.01,
    scaleFactor: 1.15,
    superRotation: 1.0,
    primaryColor: '#ffffff',
    secondaryColor: '#38bdf8',
    titleVi: '100+ Mạch Phun Băng "Vằn Hổ" Cực Nam',
    titleEn: 'South Polar Tiger-Stripe Cryo-Geysers',
    summaryVi:
      'Hơn 100 tia nước băng siêu thanh vọt thẳng từ 4 khe nứt ấm "Tiger Stripes" ở cực Nam (vận tốc 1.400 km/h), cung cấp trực tiếp vật chất cho vành đai E Sao Thổ.',
    summaryEn:
      'Over 100 supersonic ice-crystal geysers erupting at 1,400 km/h from four warm south-polar Tiger Stripe fractures, feeding Saturn’s E-ring.',
    metricLabelVi: 'Vận tốc tia băng',
    metricLabelEn: 'Jet Velocity',
    metricValueVi: '1.400 km/h · 300 kg/s',
    metricValueEn: '1,400 km/h · 300 kg/s',
  },
  {
    id: 'enceladus_e_ring_spray',
    bodyId: 'enceladus',
    archetype: 'ice_cloud_veil',
    category: 'ring_exosphere',
    frameMode: 'spin',
    latDeg: -70,
    lonDeg: 120,
    radiusFactor: 1.022,
    scaleFactor: 0.72,
    superRotation: 1.0,
    primaryColor: '#e0f2fe',
    secondaryColor: '#bae6fd',
    titleVi: 'Quầng Sương Băng Thoát Trọng Lực Nuôi Vành E',
    titleEn: 'Escaping Ice-Crystal E-Ring Spray Halo',
    summaryVi:
      'Do trọng lực cực yếu, tinh thể băng siêu mịn thoát hẳn vào quỹ đạo Sao Thổ tạo thành vầng sương băng lấp lánh bao quanh cực Nam.',
    summaryEn:
      'Because Enceladus has minimal gravity, fine frost grains escape into Saturnian orbit, enveloping the south pole in a shimmering icy mist.',
    metricLabelVi: 'Miệng phun hoạt động',
    metricLabelEn: 'Active Vents',
    metricValueVi: '101 mạch phun',
    metricValueEn: '101 active vents',
  },

  // Triton (1)
  {
    id: 'triton_nitrogen_geysers',
    bodyId: 'triton',
    archetype: 'cryo_geyser',
    category: 'cryo',
    frameMode: 'spin',
    latDeg: -50,
    lonDeg: 20,
    radiusFactor: 1.012,
    scaleFactor: 0.85,
    superRotation: 1.0,
    primaryColor: '#cbd5e1',
    secondaryColor: '#93c5fd',
    titleVi: 'Mạch Phun Nitơ Lỏng Cao 8 km (Ảnh Voyager 2)',
    titleEn: '8-km Sub-Solar Nitrogen Cryo-Geysers',
    summaryVi:
      'Ánh nắng yếu ớt xuyên qua băng nitơ trong suốt gây hiệu ứng nhà kính rắn, bắn cột khí nitơ lẫn bụi tối cao 8 km rồi bẻ cong theo gió tầng cao.',
    summaryEn:
      'Solid-state greenhouse heating beneath translucent nitrogen ice launches dark 8-km geyser columns that bend horizontally in Triton’s upper winds.',
    metricLabelVi: 'Chiều cao cột nitơ',
    metricLabelEn: 'Geyser Height',
    metricValueVi: '8 km · -235°C',
    metricValueEn: '8 km · -235°C',
  },
];

const ORBITAL_ARCHETYPES: ReadonlySet<PlanetaryEventArchetype> = new Set([
  'cyclone_vortex',
  'polar_hexagon',
  'ice_cloud_veil',
  'plasma_tail',
  'ring_spokes',
  'solar_flare_loop',
]);

const ORBITAL_EVENT_OVERRIDES: ReadonlySet<string> = new Set([
  'mars_global_dust_storm',
  'sun_cme_eruption',
  'sun_sunspot_ar',
  'jupiter_polar_aurora',
  'saturn_polar_aurora',
  'uranus_tilted_aurora',
]);

function classifyRecommendedView(ev: RawPlanetarySurfaceEvent): PlanetaryEventViewMode {
  if (ORBITAL_ARCHETYPES.has(ev.archetype) || ORBITAL_EVENT_OVERRIDES.has(ev.id)) {
    return 'orbital';
  }
  return 'surface';
}

function classifySurfaceBiome(ev: RawPlanetarySurfaceEvent): EventSurfaceBiome {
  if (ev.archetype === 'polar_aurora') {
    return 'polar_aurora_sky';
  }
  if (
    ev.bodyId === 'jupiter' ||
    ev.bodyId === 'saturn' ||
    ev.bodyId === 'uranus' ||
    ev.bodyId === 'neptune' ||
    ev.archetype === 'cyclone_vortex' ||
    ev.archetype === 'lightning_storm'
  ) {
    return 'gas_giant_clouds';
  }
  if (
    ev.archetype === 'volcanic_plume' ||
    ev.archetype === 'solar_flare_loop' ||
    (ev.archetype === 'thermal_fissure' && ev.bodyId !== 'europa')
  ) {
    return 'volcanic_lava';
  }
  if (
    ev.archetype === 'cryo_geyser' ||
    ev.bodyId === 'europa' ||
    ev.bodyId === 'ganymede' ||
    ev.bodyId === 'enceladus' ||
    ev.bodyId === 'triton'
  ) {
    return 'cryo_ice_geyser';
  }
  return 'dust_impact_desert';
}

export const PLANETARY_EVENTS: readonly PlanetarySurfaceEvent[] = RAW_PLANETARY_EVENTS.map((ev) => ({
  ...ev,
  recommendedView: classifyRecommendedView(ev),
  surfaceBiome: classifySurfaceBiome(ev),
}));

const DEFAULT_SURFACE_STAGE_CONFIG: SurfaceStageConfig = {
  bodyId: 'default',
  skyZenith: '#050814',
  skyHorizon: '#1e293b',
  skyGlow: '#38bdf8',
  groundPrimary: '#334155',
  groundSecondary: '#1e293b',
  groundAccent: '#94a3b8',
  fogColor: '#0f172a',
  gravityLabel: '3.72 m/s²',
  horizonBodyId: null,
  horizonHasRings: false,
  horizonScale: 24,
  starfieldOpacity: 0.72,
};

const SURFACE_STAGE_CONFIGS: Record<string, SurfaceStageConfig> = {
  sun: {
    bodyId: 'sun',
    skyZenith: '#2a0800',
    skyHorizon: '#ea580c',
    skyGlow: '#fde047',
    groundPrimary: '#9a3412',
    groundSecondary: '#ea580c',
    groundAccent: '#fef08a',
    fogColor: '#7c2d12',
    gravityLabel: '274.0 m/s²',
    horizonBodyId: null,
    horizonHasRings: false,
    horizonScale: 28,
    starfieldOpacity: 0.14,
  },
  mercury: {
    bodyId: 'mercury',
    skyZenith: '#02040a',
    skyHorizon: '#1f1d24',
    skyGlow: '#f59e0b',
    groundPrimary: '#52525b',
    groundSecondary: '#27272a',
    groundAccent: '#d97706',
    fogColor: '#18181b',
    gravityLabel: '3.70 m/s²',
    horizonBodyId: null,
    horizonHasRings: false,
    horizonScale: 24,
    starfieldOpacity: 0.96,
  },
  venus: {
    bodyId: 'venus',
    skyZenith: '#451a03',
    skyHorizon: '#d97706',
    skyGlow: '#fde68a',
    groundPrimary: '#442614',
    groundSecondary: '#231008',
    groundAccent: '#f97316',
    fogColor: '#78350f',
    gravityLabel: '8.87 m/s²',
    horizonBodyId: null,
    horizonHasRings: false,
    horizonScale: 24,
    starfieldOpacity: 0.08,
  },
  earth: {
    bodyId: 'earth',
    skyZenith: '#061529',
    skyHorizon: '#1d4ed8',
    skyGlow: '#60a5fa',
    groundPrimary: '#1e3a5f',
    groundSecondary: '#0f172a',
    groundAccent: '#38bdf8',
    fogColor: '#0c213d',
    gravityLabel: '9.81 m/s²',
    horizonBodyId: null,
    horizonHasRings: false,
    horizonScale: 22,
    starfieldOpacity: 0.45,
  },
  mars: {
    bodyId: 'mars',
    skyZenith: '#2c1108',
    skyHorizon: '#c2410c',
    skyGlow: '#fdba74',
    groundPrimary: '#9a3412',
    groundSecondary: '#431407',
    groundAccent: '#ea580c',
    fogColor: '#6c240c',
    gravityLabel: '3.72 m/s²',
    horizonBodyId: null,
    horizonHasRings: false,
    horizonScale: 22,
    starfieldOpacity: 0.34,
  },
  jupiter: {
    bodyId: 'jupiter',
    skyZenith: '#1e100a',
    skyHorizon: '#b45309',
    skyGlow: '#fbbf24',
    groundPrimary: '#9a3412',
    groundSecondary: '#451a03',
    groundAccent: '#fed7aa',
    fogColor: '#5c240c',
    gravityLabel: '24.79 m/s²',
    horizonBodyId: null,
    horizonHasRings: false,
    horizonScale: 26,
    starfieldOpacity: 0.16,
  },
  saturn: {
    bodyId: 'saturn',
    skyZenith: '#1a150b',
    skyHorizon: '#ca8a04',
    skyGlow: '#fef08a',
    groundPrimary: '#a16207',
    groundSecondary: '#422006',
    groundAccent: '#fde68a',
    fogColor: '#5c410d',
    gravityLabel: '10.44 m/s²',
    horizonBodyId: null,
    horizonHasRings: true,
    horizonScale: 34,
    starfieldOpacity: 0.22,
  },
  uranus: {
    bodyId: 'uranus',
    skyZenith: '#042f2e',
    skyHorizon: '#06b6d4',
    skyGlow: '#a5f3fc',
    groundPrimary: '#0e7490',
    groundSecondary: '#164e63',
    groundAccent: '#67e8f9',
    fogColor: '#0c4a6e',
    gravityLabel: '8.69 m/s²',
    horizonBodyId: null,
    horizonHasRings: false,
    horizonScale: 24,
    starfieldOpacity: 0.30,
  },
  neptune: {
    bodyId: 'neptune',
    skyZenith: '#070b2b',
    skyHorizon: '#1d4ed8',
    skyGlow: '#93c5fd',
    groundPrimary: '#1e3a8a',
    groundSecondary: '#0f172a',
    groundAccent: '#60a5fa',
    fogColor: '#112257',
    gravityLabel: '11.15 m/s²',
    horizonBodyId: null,
    horizonHasRings: false,
    horizonScale: 24,
    starfieldOpacity: 0.36,
  },
  moon: {
    bodyId: 'moon',
    skyZenith: '#02040a',
    skyHorizon: '#0f172a',
    skyGlow: '#93c5fd',
    groundPrimary: '#71717a',
    groundSecondary: '#3f3f46',
    groundAccent: '#d4d4d8',
    fogColor: '#090d18',
    gravityLabel: '1.62 m/s²',
    horizonBodyId: 'earth',
    horizonHasRings: false,
    horizonScale: 24,
    starfieldOpacity: 0.98,
  },
  io: {
    bodyId: 'io',
    skyZenith: '#050408',
    skyHorizon: '#422006',
    skyGlow: '#f97316',
    groundPrimary: '#a16207',
    groundSecondary: '#291507',
    groundAccent: '#fb923c',
    fogColor: '#1c1008',
    gravityLabel: '1.80 m/s²',
    horizonBodyId: 'jupiter',
    horizonHasRings: false,
    horizonScale: 38,
    starfieldOpacity: 0.92,
  },
  europa: {
    bodyId: 'europa',
    skyZenith: '#030816',
    skyHorizon: '#1e3a5f',
    skyGlow: '#7dd3fc',
    groundPrimary: '#cbd5e1',
    groundSecondary: '#64748b',
    groundAccent: '#38bdf8',
    fogColor: '#0c1c36',
    gravityLabel: '1.31 m/s²',
    horizonBodyId: 'jupiter',
    horizonHasRings: false,
    horizonScale: 36,
    starfieldOpacity: 0.94,
  },
  ganymede: {
    bodyId: 'ganymede',
    skyZenith: '#040814',
    skyHorizon: '#1e293b',
    skyGlow: '#38bdf8',
    groundPrimary: '#94a3b8',
    groundSecondary: '#475569',
    groundAccent: '#7dd3fc',
    fogColor: '#0e172a',
    gravityLabel: '1.43 m/s²',
    horizonBodyId: 'jupiter',
    horizonHasRings: false,
    horizonScale: 30,
    starfieldOpacity: 0.92,
  },
  titan: {
    bodyId: 'titan',
    skyZenith: '#3b1c06',
    skyHorizon: '#d97706',
    skyGlow: '#fcd34d',
    groundPrimary: '#78350f',
    groundSecondary: '#2c1306',
    groundAccent: '#f59e0b',
    fogColor: '#5c2c0a',
    gravityLabel: '1.35 m/s²',
    horizonBodyId: 'saturn',
    horizonHasRings: true,
    horizonScale: 34,
    starfieldOpacity: 0.14,
  },
  enceladus: {
    bodyId: 'enceladus',
    skyZenith: '#030816',
    skyHorizon: '#164e63',
    skyGlow: '#bae6fd',
    groundPrimary: '#e2e8f0',
    groundSecondary: '#94a3b8',
    groundAccent: '#38bdf8',
    fogColor: '#0a1f36',
    gravityLabel: '0.11 m/s²',
    horizonBodyId: 'saturn',
    horizonHasRings: true,
    horizonScale: 40,
    starfieldOpacity: 0.96,
  },
  triton: {
    bodyId: 'triton',
    skyZenith: '#050819',
    skyHorizon: '#1e3a8a',
    skyGlow: '#93c5fd',
    groundPrimary: '#cbd5e1',
    groundSecondary: '#64748b',
    groundAccent: '#bfdbfe',
    fogColor: '#0e1a3d',
    gravityLabel: '0.78 m/s²',
    horizonBodyId: 'neptune',
    horizonHasRings: false,
    horizonScale: 34,
    starfieldOpacity: 0.94,
  },
};

export function getSurfaceStageConfig(bodyId: string | null | undefined): SurfaceStageConfig {
  if (!bodyId) return DEFAULT_SURFACE_STAGE_CONFIG;
  return SURFACE_STAGE_CONFIGS[bodyId] ?? DEFAULT_SURFACE_STAGE_CONFIG;
}

const EVENTS_BY_BODY = new Map<string, PlanetarySurfaceEvent[]>();
const EVENT_BY_ID = new Map<string, PlanetarySurfaceEvent>();

for (const ev of PLANETARY_EVENTS) {
  EVENT_BY_ID.set(ev.id, ev);
  const existing = EVENTS_BY_BODY.get(ev.bodyId);
  if (existing) {
    existing.push(ev);
  } else {
    EVENTS_BY_BODY.set(ev.bodyId, [ev]);
  }
}

export const PLANETARY_EVENT_BODIES: readonly string[] = Array.from(EVENTS_BY_BODY.keys());

export function getPlanetaryEvents(bodyId: string | null | undefined): readonly PlanetarySurfaceEvent[] {
  if (!bodyId) return [];
  return EVENTS_BY_BODY.get(bodyId) ?? [];
}

export function getPlanetaryEventById(eventId: string | null | undefined): PlanetarySurfaceEvent | undefined {
  if (!eventId) return undefined;
  return EVENT_BY_ID.get(eventId);
}

/**
 * Converts geocentric latitude/longitude (degrees) into a unit normal on Three.js SphereGeometry
 * equirectangular UV layout: (lat=0°, lon=0°) -> (+1, 0, 0), +lon eastward -> (cos*cos, sin, -cos*sin).
 */
export function latLonToLocalNormal(
  latDeg: number,
  lonDeg: number,
  out = new THREE.Vector3()
): THREE.Vector3 {
  if (!Number.isFinite(latDeg) || !Number.isFinite(lonDeg)) {
    return out.set(1, 0, 0);
  }
  const clampedLat = Math.max(-90, Math.min(90, latDeg));
  const latRad = THREE.MathUtils.degToRad(clampedLat);
  const lonRad = THREE.MathUtils.degToRad(lonDeg);
  const cosLat = Math.cos(latRad);
  return out
    .set(cosLat * Math.cos(lonRad), Math.sin(latRad), -cosLat * Math.sin(lonRad))
    .normalize();
}

let _axisX: THREE.Vector3 | null = null;
let _axisY: THREE.Vector3 | null = null;

/**
 * Computes the exact live world-space unit normal of a planetary surface/atmospheric event
 * matching Planet.tsx / Sun.tsx axial tilt and SimulationClock rotation order:
 * - 'spin': R_x(axialTiltDeg) * R_y(SimulationClock.calculateRotationAngle(rotationSpeed * superRotation, simTime))
 * - 'tilt_locked': R_x(axialTiltDeg) only (polar auroras, Saturn's north hexagon, ring spokes)
 * - 'antisolar': unit vector pointing away from the Sun at (0, 0, 0) (Mercury sodium tail)
 */
export function computeHotspotWorldNormal(
  bodyId: string,
  latDeg: number,
  lonDeg: number,
  simTime: number,
  options?: HotspotNormalOptions,
  out = new THREE.Vector3()
): THREE.Vector3 {
  const frameMode = options?.frameMode ?? 'spin';

  if (frameMode === 'antisolar') {
    const pos = options?.bodyWorldPos;
    if (pos && pos.lengthSq() > 1e-6) {
      return out.copy(pos).normalize();
    }
    return out.set(1, 0, 0);
  }

  latLonToLocalNormal(latDeg, lonDeg, out);

  const body = CELESTIAL_BODIES[bodyId];
  if (!body) {
    return out;
  }

  if (frameMode === 'spin') {
    if (!_axisY) _axisY = new THREE.Vector3(0, 1, 0);
    const superRot =
      options?.superRotation !== undefined && Number.isFinite(options.superRotation)
        ? options.superRotation
        : 1.0;
    const safeSimTime = Number.isFinite(simTime) ? simTime : 0;
    const rotAngle = SimulationClock.calculateRotationAngle(body.rotationSpeed * superRot, safeSimTime);
    out.applyAxisAngle(_axisY, rotAngle);
  }

  const tiltRad = THREE.MathUtils.degToRad(body.axialTiltDeg || 0);
  if (Math.abs(tiltRad) > 1e-6) {
    if (!_axisX) _axisX = new THREE.Vector3(1, 0, 0);
    out.applyAxisAngle(_axisX, tiltRad);
  }

  return out.normalize();
}

const BURST_HOLD_MS = 800;
const BURST_TOTAL_MS = 6000;
const BURST_PEAK_MULTIPLIER = 2.2;

/**
 * Evaluates the live burst intensity multiplier (1.0 baseline, 2.2 peak for 0..800ms,
 * smooth cubic ease-out back to 1.0 over 800..6000ms).
 */
export function evaluateEventBurstMultiplier(
  burstState: PlanetaryEventBurstState | null | undefined,
  eventId: string,
  nowMs: number
): number {
  if (!burstState || burstState.eventId !== eventId) return 1.0;
  if (!Number.isFinite(nowMs) || !Number.isFinite(burstState.triggeredAt)) return 1.0;

  const elapsed = nowMs - burstState.triggeredAt;
  if (elapsed < 0 || elapsed >= BURST_TOTAL_MS) return 1.0;
  if (elapsed <= BURST_HOLD_MS) return BURST_PEAK_MULTIPLIER;

  const decayT = (elapsed - BURST_HOLD_MS) / (BURST_TOTAL_MS - BURST_HOLD_MS);
  const smooth = 1 - decayT * decayT * (3 - 2 * decayT);
  return 1.0 + (BURST_PEAK_MULTIPLIER - 1.0) * smooth;
}

/**
 * Per-body Distance LOD thresholds:
 * - Sun (R=18): fadeStart=6R (108u), cullDist=10R (180u) so Solar System overview (264u) culls cleanly.
 * - Planets & Moons: fadeStart=14R, cullDist=20R, expanded 1.25× when actively selected.
 */
export function getPlanetaryLodThresholds(
  bodyId: string,
  visualRadius: number,
  isSelected: boolean
): PlanetaryLodThresholds {
  const safeR = Number.isFinite(visualRadius) && visualRadius > 0 ? visualRadius : 1.0;
  const selectBoost = isSelected ? 1.25 : 1.0;
  if (bodyId === 'sun') {
    return {
      fadeStart: safeR * 6.0 * selectBoost,
      cullDist: safeR * 10.0 * selectBoost,
    };
  }
  return {
    fadeStart: safeR * 14.0 * selectBoost,
    cullDist: safeR * 20.0 * selectBoost,
  };
}
