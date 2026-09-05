import { create } from 'zustand';

export type CameraMode = 'ORBIT' | 'FREE_FLIGHT' | 'CINEMATIC' | 'FOCUSING' | 'TRANSITIONING' | 'GALAXY';
export type QualityTier = 'AUTO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'ULTRA';

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
  showOrbits: boolean;
  showLabels: boolean;
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
  setScienceMode: (enabled: boolean) => void;
  setCompareMode: (enabled: boolean) => void;
  setComparePlanets: (a: string, b: string) => void;
  toggleCompareTrueSize: () => void;
  
  setScaleExplorer: (enabled: boolean) => void;
  setScaleStep: (step: number) => void;
  
  setGraphicsQuality: (quality: QualityTier) => void;
  setDetectedGPUTier: (tier: number) => void;
  toggleOrbits: () => void;
  toggleLabels: () => void;
  toggleSound: () => void;
  toggleReducedMotion: () => void;
  
  toggleDevOverlay: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;

  setCinemaMode: (enabled: boolean) => void;
  setCinemaShot: (shot: 'ORBITAL_DRIFT' | 'RING_SKI' | 'SLINGSHOT' | 'AUTO') => void;
  toggleHarmonicesMundi: () => void;
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
  scienceMode: false,
  compareMode: false,
  comparePlanetA: 'earth',
  comparePlanetB: 'jupiter',
  compareTrueSize: false,
  scaleExplorer: false,
  scaleStep: 0,

  graphicsQuality: 'AUTO',
  detectedGPUTier: 2,
  showOrbits: true,
  showLabels: true,
  soundEnabled: false,
  reducedMotion: false,

  isDevOverlayOpen: false,
  isCommandPaletteOpen: false,
  isSettingsOpen: false,

  cinemaMode: false,
  cinemaShot: 'AUTO',
  harmonicesMundi: false,

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
  setScienceMode: (enabled) => set({ scienceMode: enabled }),
  setCompareMode: (enabled) => set({ compareMode: enabled }),
  setComparePlanets: (a, b) => set({ comparePlanetA: a, comparePlanetB: b }),
  toggleCompareTrueSize: () => set((state) => ({ compareTrueSize: !state.compareTrueSize })),

  setScaleExplorer: (enabled) => set({ scaleExplorer: enabled, scaleStep: 0 }),
  setScaleStep: (step) => set({ scaleStep: step }),

  setGraphicsQuality: (quality) => set({ graphicsQuality: quality }),
  setDetectedGPUTier: (tier) => set({ detectedGPUTier: tier }),
  toggleOrbits: () => set((state) => ({ showOrbits: !state.showOrbits })),
  toggleLabels: () => set((state) => ({ showLabels: !state.showLabels })),
  toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),
  toggleReducedMotion: () => set((state) => ({ reducedMotion: !state.reducedMotion })),

  toggleDevOverlay: () => set((state) => ({ isDevOverlayOpen: !state.isDevOverlayOpen })),
  setCommandPaletteOpen: (open) => set({ isCommandPaletteOpen: open }),
  setSettingsOpen: (open) => set({ isSettingsOpen: open }),

  setCinemaMode: (enabled) => set({ cinemaMode: enabled }),
  setCinemaShot: (shot) => set({ cinemaShot: shot }),
  toggleHarmonicesMundi: () => set((state) => ({ harmonicesMundi: !state.harmonicesMundi })),
}));
