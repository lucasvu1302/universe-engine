import { create } from 'zustand';

export type CameraMode = 'ORBIT' | 'FREE_FLIGHT' | 'CINEMATIC' | 'FOCUSING' | 'TRANSITIONING' | 'GALAXY';
export type QualityTier = 'AUTO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'ULTRA';
export type ActiveSurface = 'none' | 'mars' | 'moon' | 'europa' | 'titan';
export type ActiveCosmicLab =
  | 'none'
  | 'eclipse'
  | 'binary_merger'
  | 'stellar_lab'
  | 'planetarium'
  | 'nbody_sandbox'
  | 'mars_terraform'
  | 'planetary_cutaway'
  | 'planetary_defense'
  | 'trappist_exoplanets'
  | 'dyson_megastructure'
  | 'relativity_lab'
  | 'kessler_leo';
export type MissionDestination = 'moon' | 'mars' | 'jupiter' | 'saturn';
export type EclipseViewMode = 'solar_ground' | 'solar_orbit' | 'lunar_blood';
export type StellarLabTab = 'nebula' | 'lifecycle';
export type StellarNebulaId = 'pillars' | 'crab';
export type MeteorShowerId = 'none' | 'perseids' | 'geminids';
export type TelescopeTargetId = 'none' | 'saturn' | 'jupiter' | 'orion_m42';
export type NBodyPresetId = 'trisolaris' | 'figure8' | 'binary_tatooine' | 'custom_solar';
export type CutawayBodyId = 'earth' | 'sun' | 'jupiter' | 'europa' | 'neutron_star';
export type DefenseMethodId = 'kinetic_dart' | 'gravity_tractor' | 'laser_ablation';
export type TrappistPlanetId = 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h';
export type TrappistViewMode = 'system' | 'surface_e';
export type DysonMode = 'dyson_swarm' | 'oneill_cylinder';
export type RelativityTab = 'dilation_lensing' | 'bh_dive';
export type MegaHubCategory = 'all' | 'physics' | 'surfaces' | 'planets' | 'deep_space' | 'tools';
export type ActiveSpaceGame =
  | 'none'
  | 'astro_survivor'
  | 'jetpack_odyssey'
  | 'mech_arena'
  | 'exo_miner'
  | 'zero_g_rescue';
export type GameRank = 'S' | 'A' | 'B' | 'C';
export type OdysseyWorldId = 'enceladus' | 'mars' | 'venus';
export type MechPaintId = 'cobalt' | 'crimson' | 'gold' | 'obsidian';
export type MechUpgradeKey = 'armor' | 'weapon' | 'booster';
export type MinerUpgradeKey = 'o2' | 'laser' | 'jetpack' | 'turrets';

export interface SpaceGamesProgress {
  survivorBestScore: number;
  survivorBestWave: number;
  odysseyBestTime: Record<OdysseyWorldId, number | null>;
  odysseyBestRank: Record<OdysseyWorldId, GameRank | null>;
  mechCredits: number;
  mechBestWave: number;
  mechUpgrades: Record<MechUpgradeKey, number>;
  mechPaint: MechPaintId;
  minerCredits: number;
  minerBestScore: number;
  minerUpgrades: Record<MinerUpgradeKey, number>;
  rescueBestScore: number;
  rescueBestRank: GameRank | null;
}

export interface GameResultPayload {
  score?: number;
  wave?: number;
  world?: OdysseyWorldId;
  timeSec?: number;
  rank?: GameRank;
  creditsEarned?: number;
}

export const SPACE_GAMES_STORAGE_KEY = 'universe_space_games_v1';

const RANK_ORDER: Record<GameRank, number> = { C: 1, B: 2, A: 3, S: 4 };
const VALID_PAINTS = new Set<MechPaintId>(['cobalt', 'crimson', 'gold', 'obsidian']);
const VALID_RANKS = new Set<GameRank>(['S', 'A', 'B', 'C']);

export function createDefaultSpaceGamesProgress(): SpaceGamesProgress {
  return {
    survivorBestScore: 0,
    survivorBestWave: 0,
    odysseyBestTime: { enceladus: null, mars: null, venus: null },
    odysseyBestRank: { enceladus: null, mars: null, venus: null },
    mechCredits: 0,
    mechBestWave: 0,
    mechUpgrades: { armor: 1, weapon: 1, booster: 1 },
    mechPaint: 'cobalt',
    minerCredits: 0,
    minerBestScore: 0,
    minerUpgrades: { o2: 1, laser: 1, jetpack: 1, turrets: 0 },
    rescueBestScore: 0,
    rescueBestRank: null,
  };
}

export function getMechUpgradeCost(currentLevel: number): number {
  const costs = [0, 100, 180, 280, 420];
  return costs[currentLevel] ?? 9999;
}

export function getMinerUpgradeCost(key: MinerUpgradeKey, currentLevel: number): number {
  if (key === 'turrets') {
    const turretCosts = [120, 220, 340];
    return turretCosts[currentLevel] ?? 9999;
  }
  const suitCosts = [0, 80, 150, 240, 360];
  return suitCosts[currentLevel] ?? 9999;
}

function safeNonNegInt(val: unknown, fallback = 0, max = 9999999): number {
  if (typeof val !== 'number' || !Number.isFinite(val)) return fallback;
  return Math.max(0, Math.min(max, Math.floor(val)));
}

function safeClampInt(val: unknown, min: number, max: number, fallback: number): number {
  if (typeof val !== 'number' || !Number.isFinite(val)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(val)));
}

function safeNullableTime(val: unknown): number | null {
  if (typeof val !== 'number' || !Number.isFinite(val) || val <= 0) return null;
  return Math.round(val * 100) / 100;
}

function safeNullableRank(val: unknown): GameRank | null {
  return typeof val === 'string' && VALID_RANKS.has(val as GameRank) ? (val as GameRank) : null;
}

function readSpaceGamesStorage(): SpaceGamesProgress {
  const fallback = createDefaultSpaceGamesProgress();
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return fallback;
  }
  try {
    const raw = localStorage.getItem(SPACE_GAMES_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return fallback;
    const rec = parsed as Record<string, unknown>;
    const odTime = (rec.odysseyBestTime ?? {}) as Record<string, unknown>;
    const odRank = (rec.odysseyBestRank ?? {}) as Record<string, unknown>;
    const mechUp = (rec.mechUpgrades ?? {}) as Record<string, unknown>;
    const minerUp = (rec.minerUpgrades ?? {}) as Record<string, unknown>;

    return {
      survivorBestScore: safeNonNegInt(rec.survivorBestScore, 0),
      survivorBestWave: safeNonNegInt(rec.survivorBestWave, 0, 999),
      odysseyBestTime: {
        enceladus: safeNullableTime(odTime.enceladus),
        mars: safeNullableTime(odTime.mars),
        venus: safeNullableTime(odTime.venus),
      },
      odysseyBestRank: {
        enceladus: safeNullableRank(odRank.enceladus),
        mars: safeNullableRank(odRank.mars),
        venus: safeNullableRank(odRank.venus),
      },
      mechCredits: safeNonNegInt(rec.mechCredits, 0),
      mechBestWave: safeNonNegInt(rec.mechBestWave, 0, 999),
      mechUpgrades: {
        armor: safeClampInt(mechUp.armor, 1, 5, 1),
        weapon: safeClampInt(mechUp.weapon, 1, 5, 1),
        booster: safeClampInt(mechUp.booster, 1, 5, 1),
      },
      mechPaint:
        typeof rec.mechPaint === 'string' && VALID_PAINTS.has(rec.mechPaint as MechPaintId)
          ? (rec.mechPaint as MechPaintId)
          : 'cobalt',
      minerCredits: safeNonNegInt(rec.minerCredits, 0),
      minerBestScore: safeNonNegInt(rec.minerBestScore, 0),
      minerUpgrades: {
        o2: safeClampInt(minerUp.o2, 1, 5, 1),
        laser: safeClampInt(minerUp.laser, 1, 5, 1),
        jetpack: safeClampInt(minerUp.jetpack, 1, 5, 1),
        turrets: safeClampInt(minerUp.turrets, 0, 3, 0),
      },
      rescueBestScore: safeNonNegInt(rec.rescueBestScore, 0),
      rescueBestRank: safeNullableRank(rec.rescueBestRank),
    };
  } catch {
    return fallback;
  }
}

function writeSpaceGamesStorage(progress: SpaceGamesProgress): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(SPACE_GAMES_STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Ignore storage quota errors
  }
}

export interface PlanetaryEventBurst {
  eventId: string;
  nonce: number;
  triggeredAt: number;
}

export interface SavedCameraBookmark {
  id: string;
  name: string;
  targetId: string | null;
  position: [number, number, number];
  target: [number, number, number];
  offset?: [number, number, number];
  createdAt: number;
}

const BOOKMARKS_STORAGE_KEY = 'universe_vip_bookmarks';
const MAX_SAVED_BOOKMARKS = 8;
export const RECENT_EXPERIENCES_STORAGE_KEY = 'universe_recent_experiences';
const MAX_RECENT_EXPERIENCES = 4;

function readRecentStorage(): string[] {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return [];
  }
  try {
    const raw = localStorage.getItem(RECENT_EXPERIENCES_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      .slice(0, MAX_RECENT_EXPERIENCES);
  } catch {
    return [];
  }
}

function writeRecentStorage(items: string[]): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(RECENT_EXPERIENCES_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Ignore storage quota errors
  }
}

function isTuple3(val: unknown): val is [number, number, number] {
  return (
    Array.isArray(val) &&
    val.length === 3 &&
    val.every((n) => typeof n === 'number' && Number.isFinite(n))
  );
}

function syncReducedMotionDOM(enabled: boolean): void {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.reducedMotion = String(enabled);
  }
}

function getInitialReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  try {
    const prefers = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    syncReducedMotionDOM(prefers);
    return prefers;
  } catch {
    return false;
  }
}

function readBookmarksStorage(): SavedCameraBookmark[] {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return [];
  }
  try {
    const raw = localStorage.getItem(BOOKMARKS_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is SavedCameraBookmark => {
        if (!item || typeof item !== 'object') return false;
        const rec = item as Record<string, unknown>;
        return (
          typeof rec.id === 'string' &&
          typeof rec.name === 'string' &&
          (rec.targetId === null || typeof rec.targetId === 'string') &&
          isTuple3(rec.position) &&
          isTuple3(rec.target) &&
          (rec.offset === undefined || isTuple3(rec.offset))
        );
      })
      .slice(0, MAX_SAVED_BOOKMARKS);
  } catch {
    return [];
  }
}

function writeBookmarksStorage(bookmarks: SavedCameraBookmark[]): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(bookmarks));
  } catch {
    // Ignore storage quota errors
  }
}

export interface AppState {
  // Navigation & Camera
  cameraMode: CameraMode;
  targetId: string | null;
  hoveredId: string | null;

  // Simulation Clock
  timeScale: number;
  isPaused: boolean;

  // Modes & Experiences
  activeTour: boolean;
  tourIndex: number;
  photoMode: boolean;
  photoExposure: number;
  scienceMode: boolean;
  compareMode: boolean;
  comparePlanetA: string;
  comparePlanetB: string;
  compareTrueSize: boolean;
  scaleExplorer: boolean;
  scaleStep: number;

  // Visuals & Settings
  graphicsQuality: QualityTier;
  detectedGPUTier: number;
  isTabHidden: boolean;
  showOrbits: boolean;
  showLabels: boolean;
  showStarMap: boolean;
  showRadar: boolean;
  savedBookmarks: SavedCameraBookmark[];
  soundEnabled: boolean;
  reducedMotion: boolean;

  // Modals & Panels
  isDevOverlayOpen: boolean;
  isCommandPaletteOpen: boolean;
  isSettingsOpen: boolean;

  // Cinema & Orbital Harmony (Phase 1)
  cinemaMode: boolean;
  cinemaShot: 'ORBITAL_DRIFT' | 'RING_SKI' | 'SLINGSHOT' | 'AUTO';
  harmonicesMundi: boolean;

  // Surface & Re-entry (Phase 2 & Cosmic Expansion: Mars, Moon, Europa, Titan)
  activeSurface: ActiveSurface;
  reEntryActive: boolean;

  // Immersive Planetary Event Surface Stage (SPEC-010)
  activeEventSurfaceId: string | null;

  // Exosystem & Wormhole (Phase 3)
  inExoSystem: boolean;

  // Cosmic Observatory Expansion (Phase 5: 7 Offline Interactive Features)
  activeCosmicLab: ActiveCosmicLab;
  solarStormActive: boolean;
  solarStormIntensity: number;
  solarStormCmeNonce: number;
  missionPlannerOpen: boolean;
  missionDestination: MissionDestination;
  missionGravityAssist: boolean;
  missionLaunching: boolean;
  eclipseMode: EclipseViewMode;
  eclipsePhase: number;
  eclipsePlaying: boolean;
  mergerPlaying: boolean;
  mergerProgress: number;
  mergerNonce: number;
  stellarLabTab: StellarLabTab;
  stellarNebulaId: StellarNebulaId;
  stellarMassSolar: number;
  stellarAgeProgress: number;
  planetariumCityId: string;
  planetariumLatDeg: number;
  planetariumLonDeg: number;
  planetariumUtcHours: number;
  planetariumMeteorShower: MeteorShowerId;
  planetariumTelescopeTarget: TelescopeTargetId;

  // Wave 2 Observatory Mega-Hub & 8 Interactive Labs
  recentExperiences: string[];
  nbodyPreset: NBodyPresetId;
  nbodyPlaying: boolean;
  nbodyShowHabitable: boolean;
  nbodyShowRoche: boolean;
  nbodyLaunchSpeed: number;
  nbodySpawnNonce: number;
  nbodyResetNonce: number;
  terraformYears: number;
  terraformMirrors: boolean;
  terraformGhg: boolean;
  terraformComets: boolean;
  cutawayBody: CutawayBodyId;
  cutawayAngleDeg: number;
  cutawaySelectedLayer: number;
  defenseMethod: DefenseMethodId;
  defenseLeadDays: number;
  defenseLaunched: boolean;
  defenseResetNonce: number;
  trappistSelectedPlanet: TrappistPlanetId;
  trappistViewMode: TrappistViewMode;
  trappistPlaying: boolean;
  dysonMode: DysonMode;
  dysonCompletion: number;
  relativityTab: RelativityTab;
  relativityVelocityC: number;
  relativityRadiusRs: number;
  relativityLensOffset: number;
  relativityDiveProgress: number;
  relativityDivePlaying: boolean;
  kesslerCascadeLevel: number;
  kesslerTriggered: boolean;
  kesslerPlaying: boolean;

  // Sandbox & Cataclysms (Phase 4)
  isSandboxOpen: boolean;
  activeMeteor: boolean;
  activeTidal: boolean;
  activeSupernova: boolean;

  // AI TARS Copilot (Phase 4)
  isTarsOpen: boolean;

  // Live Planetary Surface & Atmospheric Events (SPEC-009)
  planetaryEventsEnabled: boolean;
  planetaryEventIntensity: number;
  selectedPlanetaryEventId: string | null;
  planetaryEventBurst: PlanetaryEventBurst | null;

  // Space Game Hub (5 3D Character Space Games — SPEC-UNIV-2026-11-24-001)
  activeSpaceGame: ActiveSpaceGame;
  gameHubOpen: boolean;
  gameProgress: SpaceGamesProgress;

  // Actions
  setCameraMode: (mode: CameraMode) => void;
  setTargetId: (id: string | null) => void;
  setHoveredId: (id: string | null) => void;
  setTimeScale: (scale: number) => void;
  togglePause: () => void;

  startTour: () => void;
  stopTour: () => void;
  nextTourStep: () => void;
  prevTourStep: () => void;

  setPhotoMode: (enabled: boolean) => void;
  setPhotoExposure: (exposure: number) => void;
  setScienceMode: (enabled: boolean) => void;
  setCompareMode: (enabled: boolean) => void;
  setComparePlanets: (a: string, b: string) => void;
  toggleCompareTrueSize: () => void;

  setScaleExplorer: (enabled: boolean) => void;
  setScaleStep: (step: number) => void;

  setGraphicsQuality: (quality: QualityTier) => void;
  setDetectedGPUTier: (tier: number) => void;
  setTabHidden: (hidden: boolean) => void;
  toggleOrbits: () => void;
  toggleLabels: () => void;
  toggleStarMap: () => void;
  toggleRadar: () => void;
  loadCameraBookmarks: () => SavedCameraBookmark[];
  saveCameraBookmark: (input: {
    name: string;
    targetId: string | null;
    position: [number, number, number];
    target: [number, number, number];
    offset?: [number, number, number];
  }) => void;
  removeCameraBookmark: (id: string) => void;
  toggleSound: () => void;
  toggleReducedMotion: () => void;

  toggleDevOverlay: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;

  setCinemaMode: (enabled: boolean) => void;
  setCinemaShot: (shot: 'ORBITAL_DRIFT' | 'RING_SKI' | 'SLINGSHOT' | 'AUTO') => void;
  toggleHarmonicesMundi: () => void;

  setActiveSurface: (surf: ActiveSurface) => void;
  setReEntryActive: (active: boolean) => void;
  setActiveEventSurfaceId: (id: string | null) => void;
  setInExoSystem: (inExo: boolean) => void;
  setSandboxOpen: (open: boolean) => void;
  setActiveMeteor: (active: boolean) => void;
  setActiveTidal: (active: boolean) => void;
  setActiveSupernova: (active: boolean) => void;
  setTarsOpen: (open: boolean) => void;

  // Cosmic Observatory Expansion Actions
  setActiveCosmicLab: (lab: ActiveCosmicLab) => void;
  setSolarStormActive: (active: boolean) => void;
  setSolarStormIntensity: (intensity: number) => void;
  triggerSolarStormCme: () => void;
  setMissionPlannerOpen: (open: boolean) => void;
  setMissionDestination: (dest: MissionDestination) => void;
  setMissionGravityAssist: (enabled: boolean) => void;
  setMissionLaunching: (launching: boolean) => void;
  setEclipseMode: (mode: EclipseViewMode) => void;
  setEclipsePhase: (phase: number) => void;
  setEclipsePlaying: (playing: boolean) => void;
  setMergerPlaying: (playing: boolean) => void;
  setMergerProgress: (progress: number) => void;
  replayMerger: () => void;
  setStellarLabTab: (tab: StellarLabTab) => void;
  setStellarNebulaId: (id: StellarNebulaId) => void;
  setStellarMassSolar: (mass: number) => void;
  setStellarAgeProgress: (progress: number) => void;
  setPlanetariumLocation: (cityId: string, latDeg: number, lonDeg: number) => void;
  setPlanetariumUtcHours: (hours: number) => void;
  setPlanetariumMeteorShower: (shower: MeteorShowerId) => void;
  setPlanetariumTelescopeTarget: (target: TelescopeTargetId) => void;

  // Wave 2 Observatory Mega-Hub & 8 Interactive Labs Actions
  loadRecentExperiences: () => string[];
  recordRecentExperience: (id: string) => void;
  setNBodyPreset: (preset: NBodyPresetId) => void;
  setNBodyPlaying: (playing: boolean) => void;
  setNBodyShowHabitable: (show: boolean) => void;
  setNBodyShowRoche: (show: boolean) => void;
  setNBodyLaunchSpeed: (speed: number) => void;
  triggerNBodySpawn: () => void;
  resetNBody: () => void;
  setTerraformYears: (years: number) => void;
  setTerraformMirrors: (enabled: boolean) => void;
  setTerraformGhg: (enabled: boolean) => void;
  setTerraformComets: (enabled: boolean) => void;
  setCutawayBody: (body: CutawayBodyId) => void;
  setCutawayAngleDeg: (deg: number) => void;
  setCutawaySelectedLayer: (idx: number) => void;
  setDefenseMethod: (method: DefenseMethodId) => void;
  setDefenseLeadDays: (days: number) => void;
  setDefenseLaunched: (launched: boolean) => void;
  resetDefense: () => void;
  setTrappistSelectedPlanet: (planet: TrappistPlanetId) => void;
  setTrappistViewMode: (mode: TrappistViewMode) => void;
  setTrappistPlaying: (playing: boolean) => void;
  setDysonMode: (mode: DysonMode) => void;
  setDysonCompletion: (completion: number) => void;
  setRelativityTab: (tab: RelativityTab) => void;
  setRelativityVelocityC: (v: number) => void;
  setRelativityRadiusRs: (r: number) => void;
  setRelativityLensOffset: (offset: number) => void;
  setRelativityDiveProgress: (progress: number) => void;
  setRelativityDivePlaying: (playing: boolean) => void;
  setKesslerCascadeLevel: (level: number) => void;
  setKesslerTriggered: (triggered: boolean) => void;
  setKesslerPlaying: (playing: boolean) => void;

  // Live Planetary Surface & Atmospheric Events Actions
  setPlanetaryEventsEnabled: (enabled: boolean) => void;
  setPlanetaryEventIntensity: (intensity: number) => void;
  setSelectedPlanetaryEventId: (eventId: string | null) => void;
  triggerPlanetaryEventBurst: (eventId: string) => void;

  // Space Game Hub Actions
  setActiveSpaceGame: (game: ActiveSpaceGame) => void;
  setGameHubOpen: (open: boolean) => void;
  loadSpaceGamesProgress: () => SpaceGamesProgress;
  recordGameResult: (game: Exclude<ActiveSpaceGame, 'none'>, payload: GameResultPayload) => void;
  purchaseMechUpgrade: (key: MechUpgradeKey) => boolean;
  purchaseMinerUpgrade: (key: MinerUpgradeKey) => boolean;
  setMechPaint: (paint: MechPaintId) => void;
  resetGameProgress: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  cameraMode: 'ORBIT',
  targetId: 'earth',
  hoveredId: null,

  timeScale: 1.0,
  isPaused: false,

  activeTour: false,
  tourIndex: 0,
  photoMode: false,
  photoExposure: 1.18,
  scienceMode: false,
  compareMode: false,
  comparePlanetA: 'earth',
  comparePlanetB: 'jupiter',
  compareTrueSize: false,
  scaleExplorer: false,
  scaleStep: 0,

  graphicsQuality: 'AUTO',
  detectedGPUTier: 2,
  isTabHidden: false,
  showOrbits: true,
  showLabels: true,
  showStarMap: true,
  showRadar: true,
  savedBookmarks: readBookmarksStorage(),
  soundEnabled: false,
  reducedMotion: getInitialReducedMotion(),

  isDevOverlayOpen: false,
  isCommandPaletteOpen: false,
  isSettingsOpen: false,

  cinemaMode: false,
  cinemaShot: 'AUTO',
  harmonicesMundi: false,

  activeSurface: 'none',
  reEntryActive: false,
  activeEventSurfaceId: null,
  inExoSystem: false,
  activeCosmicLab: 'none',
  solarStormActive: false,
  solarStormIntensity: 0.72,
  solarStormCmeNonce: 0,
  missionPlannerOpen: false,
  missionDestination: 'mars',
  missionGravityAssist: false,
  missionLaunching: false,
  eclipseMode: 'solar_ground',
  eclipsePhase: 0.5,
  eclipsePlaying: false,
  mergerPlaying: true,
  mergerProgress: 0.35,
  mergerNonce: 0,
  stellarLabTab: 'nebula',
  stellarNebulaId: 'pillars',
  stellarMassSolar: 1.0,
  stellarAgeProgress: 0.45,
  planetariumCityId: 'hanoi',
  planetariumLatDeg: 21.0285,
  planetariumLonDeg: 105.8542,
  planetariumUtcHours: 14.0,
  planetariumMeteorShower: 'perseids',
  planetariumTelescopeTarget: 'none',
  recentExperiences: readRecentStorage(),
  nbodyPreset: 'trisolaris',
  nbodyPlaying: true,
  nbodyShowHabitable: true,
  nbodyShowRoche: true,
  nbodyLaunchSpeed: 1.0,
  nbodySpawnNonce: 0,
  nbodyResetNonce: 0,
  terraformYears: 380,
  terraformMirrors: true,
  terraformGhg: true,
  terraformComets: true,
  cutawayBody: 'earth',
  cutawayAngleDeg: 95,
  cutawaySelectedLayer: 0,
  defenseMethod: 'kinetic_dart',
  defenseLeadDays: 180,
  defenseLaunched: false,
  defenseResetNonce: 0,
  trappistSelectedPlanet: 'e',
  trappistViewMode: 'system',
  trappistPlaying: true,
  dysonMode: 'dyson_swarm',
  dysonCompletion: 0.48,
  relativityTab: 'dilation_lensing',
  relativityVelocityC: 0.85,
  relativityRadiusRs: 3.5,
  relativityLensOffset: 0.14,
  relativityDiveProgress: 0.25,
  relativityDivePlaying: false,
  kesslerCascadeLevel: 0.28,
  kesslerTriggered: false,
  kesslerPlaying: true,
  isSandboxOpen: false,
  activeMeteor: false,
  activeTidal: false,
  activeSupernova: false,
  isTarsOpen: false,
  planetaryEventsEnabled: true,
  planetaryEventIntensity: 1.0,
  selectedPlanetaryEventId: null,
  planetaryEventBurst: null,
  activeSpaceGame: 'none',
  gameHubOpen: false,
  gameProgress: readSpaceGamesStorage(),

  setCameraMode: (mode) => set({ cameraMode: mode }),
  setTargetId: (id) => set({ targetId: id }),
  setHoveredId: (id) => set({ hoveredId: id }),
  setTimeScale: (scale) => set({ timeScale: scale }),
  togglePause: () => set((state) => ({ isPaused: !state.isPaused })),

  startTour: () => set({ activeTour: true, tourIndex: 0, cameraMode: 'CINEMATIC' }),
  stopTour: () => set({ activeTour: false, cameraMode: 'ORBIT' }),
  nextTourStep: () => set((state) => ({ tourIndex: state.tourIndex + 1 })),
  prevTourStep: () => set((state) => ({ tourIndex: Math.max(0, state.tourIndex - 1) })),

  setPhotoMode: (enabled) => set({ photoMode: enabled }),
  setPhotoExposure: (exposure) => set({ photoExposure: exposure }),
  setScienceMode: (enabled) => set({ scienceMode: enabled }),
  setCompareMode: (enabled) => set({ compareMode: enabled }),
  setComparePlanets: (a, b) => set({ comparePlanetA: a, comparePlanetB: b }),
  toggleCompareTrueSize: () => set((state) => ({ compareTrueSize: !state.compareTrueSize })),

  setScaleExplorer: (enabled) => set({ scaleExplorer: enabled, scaleStep: 0 }),
  setScaleStep: (step) => set({ scaleStep: step }),

  setGraphicsQuality: (quality) => set({ graphicsQuality: quality }),
  setDetectedGPUTier: (tier) => set({ detectedGPUTier: tier }),
  setTabHidden: (hidden) => set({ isTabHidden: hidden }),
  toggleOrbits: () => set((state) => ({ showOrbits: !state.showOrbits })),
  toggleLabels: () => set((state) => ({ showLabels: !state.showLabels })),
  toggleStarMap: () => set((state) => ({ showStarMap: !state.showStarMap })),
  toggleRadar: () => set((state) => ({ showRadar: !state.showRadar })),
  loadCameraBookmarks: () => {
    const loaded = readBookmarksStorage();
    set({ savedBookmarks: loaded });
    return loaded;
  },
  saveCameraBookmark: (input) =>
    set((state) => {
      const entry: SavedCameraBookmark = {
        id: `bm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: input.name.trim() || 'VIP View',
        targetId: input.targetId,
        position: input.position,
        target: input.target,
        offset: input.offset,
        createdAt: Date.now(),
      };
      const next = [entry, ...state.savedBookmarks].slice(0, MAX_SAVED_BOOKMARKS);
      writeBookmarksStorage(next);
      return { savedBookmarks: next };
    }),
  removeCameraBookmark: (id) =>
    set((state) => {
      const next = state.savedBookmarks.filter((b) => b.id !== id);
      writeBookmarksStorage(next);
      return { savedBookmarks: next };
    }),
  toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),
  toggleReducedMotion: () =>
    set((state) => {
      const next = !state.reducedMotion;
      syncReducedMotionDOM(next);
      return { reducedMotion: next };
    }),

  toggleDevOverlay: () => set((state) => ({ isDevOverlayOpen: !state.isDevOverlayOpen })),
  setCommandPaletteOpen: (open) => set({ isCommandPaletteOpen: open }),
  setSettingsOpen: (open) => set({ isSettingsOpen: open }),

  setCinemaMode: (enabled) => set({ cinemaMode: enabled }),
  setCinemaShot: (shot) => set({ cinemaShot: shot }),
  toggleHarmonicesMundi: () => set((state) => ({ harmonicesMundi: !state.harmonicesMundi })),

  setActiveSurface: (surf) => set({ activeSurface: surf }),
  setReEntryActive: (active) => set({ reEntryActive: active }),
  setActiveEventSurfaceId: (id) => set({ activeEventSurfaceId: id }),
  setInExoSystem: (inExo) => set({ inExoSystem: inExo }),
  setSandboxOpen: (open) => set({ isSandboxOpen: open }),
  setActiveMeteor: (active) => set({ activeMeteor: active }),
  setActiveTidal: (active) => set({ activeTidal: active }),
  setActiveSupernova: (active) => set({ activeSupernova: active }),
  setTarsOpen: (open) => set({ isTarsOpen: open }),

  setActiveCosmicLab: (lab) => set({ activeCosmicLab: lab }),
  setSolarStormActive: (active) => set({ solarStormActive: active }),
  setSolarStormIntensity: (intensity) =>
    set({ solarStormIntensity: Number.isFinite(intensity) ? Math.max(0.2, Math.min(1.0, intensity)) : 0.6 }),
  triggerSolarStormCme: () => set((state) => ({ solarStormCmeNonce: state.solarStormCmeNonce + 1 })),
  setMissionPlannerOpen: (open) => set({ missionPlannerOpen: open }),
  setMissionDestination: (dest) =>
    set((state) => ({
      missionDestination: dest,
      missionGravityAssist: dest === 'jupiter' || dest === 'saturn' ? state.missionGravityAssist : false,
      missionLaunching: false,
    })),
  setMissionGravityAssist: (enabled) => set({ missionGravityAssist: enabled }),
  setMissionLaunching: (launching) => set({ missionLaunching: launching }),
  setEclipseMode: (mode) => set({ eclipseMode: mode }),
  setEclipsePhase: (phase) =>
    set({ eclipsePhase: Number.isFinite(phase) ? Math.max(0, Math.min(1, phase)) : 0.5 }),
  setEclipsePlaying: (playing) => set({ eclipsePlaying: playing }),
  setMergerPlaying: (playing) => set({ mergerPlaying: playing }),
  setMergerProgress: (progress) =>
    set({ mergerProgress: Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0 }),
  replayMerger: () =>
    set((state) => ({ mergerProgress: 0, mergerPlaying: true, mergerNonce: state.mergerNonce + 1 })),
  setStellarLabTab: (tab) => set({ stellarLabTab: tab }),
  setStellarNebulaId: (id) => set({ stellarNebulaId: id }),
  setStellarMassSolar: (mass) =>
    set({ stellarMassSolar: Number.isFinite(mass) ? Math.max(0.5, Math.min(40, mass)) : 1.0 }),
  setStellarAgeProgress: (progress) =>
    set({ stellarAgeProgress: Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0.45 }),
  setPlanetariumLocation: (cityId, latDeg, lonDeg) =>
    set({
      planetariumCityId: cityId,
      planetariumLatDeg: Number.isFinite(latDeg) ? Math.max(-90, Math.min(90, latDeg)) : 21.0285,
      planetariumLonDeg: Number.isFinite(lonDeg) ? lonDeg : 105.8542,
    }),
  setPlanetariumUtcHours: (hours) =>
    set({ planetariumUtcHours: Number.isFinite(hours) ? ((hours % 24) + 24) % 24 : 14 }),
  setPlanetariumMeteorShower: (shower) => set({ planetariumMeteorShower: shower }),
  setPlanetariumTelescopeTarget: (target) => set({ planetariumTelescopeTarget: target }),

  // Wave 2 Observatory Mega-Hub & 8 Interactive Labs Actions
  loadRecentExperiences: () => {
    const loaded = readRecentStorage();
    set({ recentExperiences: loaded });
    return loaded;
  },
  recordRecentExperience: (id) =>
    set((state) => {
      const clean = id.trim();
      if (!clean) return state;
      const next = [clean, ...state.recentExperiences.filter((x) => x !== clean)].slice(
        0,
        MAX_RECENT_EXPERIENCES
      );
      writeRecentStorage(next);
      return { recentExperiences: next };
    }),
  setNBodyPreset: (preset) =>
    set((state) => ({ nbodyPreset: preset, nbodyResetNonce: state.nbodyResetNonce + 1 })),
  setNBodyPlaying: (playing) => set({ nbodyPlaying: playing }),
  setNBodyShowHabitable: (show) => set({ nbodyShowHabitable: show }),
  setNBodyShowRoche: (show) => set({ nbodyShowRoche: show }),
  setNBodyLaunchSpeed: (speed) =>
    set({ nbodyLaunchSpeed: Number.isFinite(speed) ? Math.max(0.6, Math.min(1.5, speed)) : 1.0 }),
  triggerNBodySpawn: () => set((state) => ({ nbodySpawnNonce: state.nbodySpawnNonce + 1 })),
  resetNBody: () => set((state) => ({ nbodyResetNonce: state.nbodyResetNonce + 1 })),
  setTerraformYears: (years) =>
    set({ terraformYears: Number.isFinite(years) ? Math.max(0, Math.min(1000, years)) : 0 }),
  setTerraformMirrors: (enabled) => set({ terraformMirrors: enabled }),
  setTerraformGhg: (enabled) => set({ terraformGhg: enabled }),
  setTerraformComets: (enabled) => set({ terraformComets: enabled }),
  setCutawayBody: (body) => set({ cutawayBody: body, cutawaySelectedLayer: 0 }),
  setCutawayAngleDeg: (deg) =>
    set({ cutawayAngleDeg: Number.isFinite(deg) ? Math.max(0, Math.min(180, deg)) : 95 }),
  setCutawaySelectedLayer: (idx) =>
    set({ cutawaySelectedLayer: Number.isFinite(idx) ? Math.max(0, Math.floor(idx)) : 0 }),
  setDefenseMethod: (method) => set({ defenseMethod: method, defenseLaunched: false }),
  setDefenseLeadDays: (days) =>
    set({ defenseLeadDays: Number.isFinite(days) ? Math.max(10, Math.min(365, days)) : 180 }),
  setDefenseLaunched: (launched) => set({ defenseLaunched: launched }),
  resetDefense: () =>
    set((state) => ({ defenseLaunched: false, defenseResetNonce: state.defenseResetNonce + 1 })),
  setTrappistSelectedPlanet: (planet) => set({ trappistSelectedPlanet: planet }),
  setTrappistViewMode: (mode) => set({ trappistViewMode: mode }),
  setTrappistPlaying: (playing) => set({ trappistPlaying: playing }),
  setDysonMode: (mode) => set({ dysonMode: mode }),
  setDysonCompletion: (completion) =>
    set({ dysonCompletion: Number.isFinite(completion) ? Math.max(0, Math.min(1, completion)) : 0.48 }),
  setRelativityTab: (tab) => set({ relativityTab: tab }),
  setRelativityVelocityC: (v) =>
    set({ relativityVelocityC: Number.isFinite(v) ? Math.max(0, Math.min(0.9999, v)) : 0.85 }),
  setRelativityRadiusRs: (r) =>
    set({ relativityRadiusRs: Number.isFinite(r) ? Math.max(1.01, Math.min(20, r)) : 3.5 }),
  setRelativityLensOffset: (offset) =>
    set({ relativityLensOffset: Number.isFinite(offset) ? Math.max(-1.5, Math.min(1.5, offset)) : 0.14 }),
  setRelativityDiveProgress: (progress) =>
    set({ relativityDiveProgress: Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0.25 }),
  setRelativityDivePlaying: (playing) => set({ relativityDivePlaying: playing }),
  setKesslerCascadeLevel: (level) =>
    set({ kesslerCascadeLevel: Number.isFinite(level) ? Math.max(0, Math.min(1, level)) : 0.28 }),
  setKesslerTriggered: (triggered) => set({ kesslerTriggered: triggered }),
  setKesslerPlaying: (playing) => set({ kesslerPlaying: playing }),
  setPlanetaryEventsEnabled: (enabled) => set({ planetaryEventsEnabled: enabled }),
  setPlanetaryEventIntensity: (intensity) =>
    set({
      planetaryEventIntensity: Number.isFinite(intensity)
        ? Math.max(0.6, Math.min(1.6, intensity))
        : 1.0,
    }),
  setSelectedPlanetaryEventId: (eventId) => set({ selectedPlanetaryEventId: eventId }),
  triggerPlanetaryEventBurst: (eventId) =>
    set((state) => ({
      planetaryEventBurst: {
        eventId,
        nonce: (state.planetaryEventBurst?.nonce ?? 0) + 1,
        triggeredAt: typeof performance !== 'undefined' ? performance.now() : Date.now(),
      },
    })),

  setActiveSpaceGame: (game) => set({ activeSpaceGame: game }),
  setGameHubOpen: (open) => set({ gameHubOpen: open }),
  loadSpaceGamesProgress: () => {
    const loaded = readSpaceGamesStorage();
    set({ gameProgress: loaded });
    return loaded;
  },
  recordGameResult: (game, payload) =>
    set((state) => {
      const prev = state.gameProgress;
      const next: SpaceGamesProgress = {
        ...prev,
        odysseyBestTime: { ...prev.odysseyBestTime },
        odysseyBestRank: { ...prev.odysseyBestRank },
        mechUpgrades: { ...prev.mechUpgrades },
        minerUpgrades: { ...prev.minerUpgrades },
      };

      if (game === 'astro_survivor') {
        if (typeof payload.score === 'number' && Number.isFinite(payload.score)) {
          next.survivorBestScore = Math.max(prev.survivorBestScore, Math.floor(payload.score));
        }
        if (typeof payload.wave === 'number' && Number.isFinite(payload.wave)) {
          next.survivorBestWave = Math.max(prev.survivorBestWave, Math.floor(payload.wave));
        }
      } else if (game === 'jetpack_odyssey' && payload.world) {
        const w = payload.world;
        if (typeof payload.timeSec === 'number' && Number.isFinite(payload.timeSec) && payload.timeSec > 0) {
          const rounded = Math.round(payload.timeSec * 100) / 100;
          const oldTime = prev.odysseyBestTime[w];
          if (oldTime === null || rounded < oldTime) {
            next.odysseyBestTime[w] = rounded;
          }
        }
        if (payload.rank) {
          const oldRank = prev.odysseyBestRank[w];
          if (!oldRank || RANK_ORDER[payload.rank] > RANK_ORDER[oldRank]) {
            next.odysseyBestRank[w] = payload.rank;
          }
        }
      } else if (game === 'mech_arena') {
        if (typeof payload.creditsEarned === 'number' && Number.isFinite(payload.creditsEarned) && payload.creditsEarned > 0) {
          next.mechCredits = prev.mechCredits + Math.floor(payload.creditsEarned);
        }
        if (typeof payload.wave === 'number' && Number.isFinite(payload.wave)) {
          next.mechBestWave = Math.max(prev.mechBestWave, Math.floor(payload.wave));
        }
      } else if (game === 'exo_miner') {
        if (typeof payload.creditsEarned === 'number' && Number.isFinite(payload.creditsEarned) && payload.creditsEarned > 0) {
          next.minerCredits = prev.minerCredits + Math.floor(payload.creditsEarned);
        }
        if (typeof payload.score === 'number' && Number.isFinite(payload.score)) {
          next.minerBestScore = Math.max(prev.minerBestScore, Math.floor(payload.score));
        }
      } else if (game === 'zero_g_rescue') {
        if (typeof payload.score === 'number' && Number.isFinite(payload.score)) {
          next.rescueBestScore = Math.max(prev.rescueBestScore, Math.floor(payload.score));
        }
        if (payload.rank) {
          const oldRank = prev.rescueBestRank;
          if (!oldRank || RANK_ORDER[payload.rank] > RANK_ORDER[oldRank]) {
            next.rescueBestRank = payload.rank;
          }
        }
      }

      writeSpaceGamesStorage(next);
      return { gameProgress: next };
    }),
  purchaseMechUpgrade: (key) => {
    let success = false;
    set((state) => {
      const curLv = state.gameProgress.mechUpgrades[key];
      if (curLv >= 5) return state;
      const cost = getMechUpgradeCost(curLv);
      if (state.gameProgress.mechCredits < cost) return state;
      success = true;
      const next: SpaceGamesProgress = {
        ...state.gameProgress,
        mechCredits: state.gameProgress.mechCredits - cost,
        mechUpgrades: {
          ...state.gameProgress.mechUpgrades,
          [key]: curLv + 1,
        },
      };
      writeSpaceGamesStorage(next);
      return { gameProgress: next };
    });
    return success;
  },
  purchaseMinerUpgrade: (key) => {
    let success = false;
    set((state) => {
      const curLv = state.gameProgress.minerUpgrades[key];
      const maxLv = key === 'turrets' ? 3 : 5;
      if (curLv >= maxLv) return state;
      const cost = getMinerUpgradeCost(key, curLv);
      if (state.gameProgress.minerCredits < cost) return state;
      success = true;
      const next: SpaceGamesProgress = {
        ...state.gameProgress,
        minerCredits: state.gameProgress.minerCredits - cost,
        minerUpgrades: {
          ...state.gameProgress.minerUpgrades,
          [key]: curLv + 1,
        },
      };
      writeSpaceGamesStorage(next);
      return { gameProgress: next };
    });
    return success;
  },
  setMechPaint: (paint) =>
    set((state) => {
      if (!VALID_PAINTS.has(paint)) return state;
      const next: SpaceGamesProgress = {
        ...state.gameProgress,
        mechPaint: paint,
      };
      writeSpaceGamesStorage(next);
      return { gameProgress: next };
    }),
  resetGameProgress: () => {
    const fresh = createDefaultSpaceGamesProgress();
    writeSpaceGamesStorage(fresh);
    set({ gameProgress: fresh });
  },
}));
