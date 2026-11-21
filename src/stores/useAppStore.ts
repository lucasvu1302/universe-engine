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
}));
