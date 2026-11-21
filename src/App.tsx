import React, { Component, ErrorInfo, ReactNode, Suspense, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';

import { SimulationManager } from '@/simulation/core/SimulationManager';
import { SimulationEventBus } from '@/simulation/core/SimulationEventBus';
import { ScenarioType } from '@/simulation/core/types';
import { LaunchScene } from '@/simulation/launch/LaunchScene';
import { CockpitHUD } from '@/simulation/launch/CockpitHUD';
import { EarthHistoryScene } from '@/simulation/earth/EarthHistoryScene';
import { EarthTimelineHUD } from '@/simulation/earth/EarthTimelineHUD';
import { CosmicEventScene } from '@/simulation/cosmic/CosmicEventScene';
import { CosmicTimelineHUD } from '@/simulation/cosmic/CosmicTimelineHUD';

import { useAppStore } from '@/stores/useAppStore';
import { AssetManager } from '@/engine/assets/AssetManager';
import { CameraController } from '@/engine/camera/CameraController';
import { CameraManager } from '@/engine/camera/CameraManager';
import { SimulationClock } from '@/engine/simulation/SimulationClock';
import { PerformanceManager } from '@/engine/performance/PerformanceManager';
import { AudioManager } from '@/engine/audio/AudioManager';

import { SolarSystemScene } from '@/scenes/SolarSystem/SolarSystemScene';
import { GalaxyScene } from '@/scenes/Galaxy/GalaxyScene';
import { CompareScene } from '@/scenes/Compare/CompareScene';
import { MarsSurfaceScene } from '@/entities/Surfaces/MarsSurfaceScene';
import { MoonSurfaceScene } from '@/entities/Surfaces/MoonSurfaceScene';
import { MillersPlanetScene, MillersHUD } from '@/scenes/ExoSystem/MillersPlanetScene';
import { ReEntryPlasma } from '@/entities/Atmosphere/ReEntryPlasma';

import { SuperNav } from '@/ui/SuperNav';
import { TimeControls } from '@/ui/TimeControls';
import { SolarRadarHUD } from '@/ui/SolarRadarHUD';
import { TargetHUD } from '@/ui/TargetHUD';
import { FlightHUD } from '@/ui/FlightHUD';
import { TourController } from '@/ui/TourController';
import { CompareHUD } from '@/ui/CompareHUD';
import { CommandPalette } from '@/ui/CommandPalette';
import { DiagnosticsOverlay } from '@/ui/DiagnosticsOverlay';
import { CinematicOverlay } from '@/ui/CinematicOverlay';
import { SurfaceHUD } from '@/ui/SurfaceHUD';
import { SolarStormHUD } from '@/ui/SolarStormHUD';
import { MissionPlannerHUD } from '@/ui/MissionPlannerHUD';
import { EclipseHUD } from '@/ui/EclipseHUD';
import { BinaryMergerHUD } from '@/ui/BinaryMergerHUD';
import { StellarLabHUD } from '@/ui/StellarLabHUD';
import { PlanetariumHUD } from '@/ui/PlanetariumHUD';
import { NBodySandboxHUD } from '@/ui/NBodySandboxHUD';
import { MarsTerraformHUD } from '@/ui/MarsTerraformHUD';
import { PlanetaryCutawayHUD } from '@/ui/PlanetaryCutawayHUD';
import { PlanetaryDefenseHUD } from '@/ui/PlanetaryDefenseHUD';
import { TrappistSystemHUD } from '@/ui/TrappistSystemHUD';
import { DysonMegastructureHUD } from '@/ui/DysonMegastructureHUD';
import { RelativityLabHUD } from '@/ui/RelativityLabHUD';
import { KesslerOrbitalHUD } from '@/ui/KesslerOrbitalHUD';
import { SandboxToolbar } from '@/ui/SandboxToolbar';
import { TarsHologram } from '@/ui/TarsHologram';
import { CinematicDirector } from '@/engine/camera/CinematicDirector';
import { HarmonicesMundiSynth } from '@/engine/audio/HarmonicesMundiSynth';
import { AstroCopilot } from '@/engine/ai/AstroCopilot';
import { ModeOrchestrator } from '@/engine/navigation/ModeOrchestrator';
import { useI18nStore } from '@/i18n';

// UI modal code-splitting
const ScaleExplorer = React.lazy(() => import('@/ui/ScaleExplorer').then((m) => ({ default: m.ScaleExplorer })));
const PhotoModeModal = React.lazy(() => import('@/ui/PhotoModeModal').then((m) => ({ default: m.PhotoModeModal })));
const SettingsModal = React.lazy(() => import('@/ui/SettingsModal').then((m) => ({ default: m.SettingsModal })));

// Standalone 3D Cosmic Labs & Outer-Moon Surfaces code-splitting (mounted inside local inner <Suspense>)
const EuropaSurfaceScene = React.lazy(() => import('@/entities/Surfaces/EuropaSurfaceScene'));
const TitanSurfaceScene = React.lazy(() => import('@/entities/Surfaces/TitanSurfaceScene'));
const EclipseScene = React.lazy(() => import('@/scenes/CosmicLabs/EclipseScene'));
const BinaryBlackHoleScene = React.lazy(() => import('@/scenes/CosmicLabs/BinaryBlackHoleScene'));
const StellarLabScene = React.lazy(() => import('@/scenes/CosmicLabs/StellarLabScene'));
const PlanetariumScene = React.lazy(() => import('@/scenes/CosmicLabs/PlanetariumScene'));

// Wave 2 Standalone 3D Cosmic Labs code-splitting (8 separate lazy JS chunks)
const NBodySandboxScene = React.lazy(() =>
  import('@/scenes/CosmicLabs/NBodySandboxScene').then((m) => ({ default: m.NBodySandboxScene }))
);
const MarsTerraformScene = React.lazy(() =>
  import('@/scenes/CosmicLabs/MarsTerraformScene').then((m) => ({ default: m.MarsTerraformScene }))
);
const PlanetaryCutawayScene = React.lazy(() =>
  import('@/scenes/CosmicLabs/PlanetaryCutawayScene').then((m) => ({ default: m.PlanetaryCutawayScene }))
);
const PlanetaryDefenseScene = React.lazy(() =>
  import('@/scenes/CosmicLabs/PlanetaryDefenseScene').then((m) => ({ default: m.PlanetaryDefenseScene }))
);
const TrappistSystemScene = React.lazy(() =>
  import('@/scenes/CosmicLabs/TrappistSystemScene').then((m) => ({ default: m.TrappistSystemScene }))
);
const DysonMegastructureScene = React.lazy(() =>
  import('@/scenes/CosmicLabs/DysonMegastructureScene').then((m) => ({ default: m.DysonMegastructureScene }))
);
const RelativityLabScene = React.lazy(() =>
  import('@/scenes/CosmicLabs/RelativityLabScene').then((m) => ({ default: m.RelativityLabScene }))
);
const KesslerOrbitalScene = React.lazy(() =>
  import('@/scenes/CosmicLabs/KesslerOrbitalScene').then((m) => ({ default: m.KesslerOrbitalScene }))
);

// Error Boundary for React UI stability
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Universe Engine React Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const isVi = useI18nStore.getState().language === 'vi';
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 text-white p-6">
          <div className="max-w-md p-6 rounded-2xl glass-panel-glow border border-red-500/40 text-center">
            <h2 className="text-xl font-bold text-red-400 mb-2">
              {isVi ? 'Động Cơ Đồ Họa Tạm Dừng' : 'Graphics Engine Halted'}
            </h2>
            <p className="text-sm text-slate-300 mb-4">
              {this.state.error?.message ||
                (isVi ? 'Lỗi không mong muốn trong ống dẫn WebGL.' : 'Unexpected WebGL pipeline error.')}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 rounded-lg text-sm font-semibold transition-all cursor-pointer"
            >
              {isVi ? 'Khởi Tạo Lại Động Cơ' : 'Re-initialize Engine'}
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Master Render Loop Dispatcher
const EngineLoop: React.FC = () => {
  const timeScale = useAppStore((state) => state.timeScale);
  const targetId = useAppStore((state) => state.targetId);

  useFrame((state, delta) => {
    if (!state.scene.environment) {
      const envTex = AssetManager.getInstance().getSpaceEnvironment(state.gl);
      if (envTex) {
        state.scene.environment = envTex;
        state.scene.environmentIntensity = 0.92;
        if (typeof document !== 'undefined') {
          document.querySelector('main')?.setAttribute('data-cinema-ibl', 'ready');
        }
      }
    }
    const store = useAppStore.getState();
    state.gl.toneMappingExposure = store.photoMode ? store.photoExposure : 1.18;
    const pm = PerformanceManager.getInstance();
    pm.recordRendererInfo(state.gl);
    const smoothDt = SimulationClock.getInstance().advanceByDelta(delta);
    pm.recordFrame(performance.now());
    CinematicDirector.getInstance().update(smoothDt || delta);
    HarmonicesMundiSynth.getInstance().update(timeScale, targetId === 'blackhole');

    const screenshotCb = CameraManager.getInstance().consumeScreenshotCallback();
    if (screenshotCb) {
      state.gl.render(state.scene, state.camera);
      screenshotCb(state.gl.domElement.toDataURL('image/png'));
    }
  }, -2);

  return null;
};

// Scene Hierarchy with Zero-Unmount Smooth Transitions
const UniverseScene: React.FC = () => {
  const cameraMode = useAppStore((state) => state.cameraMode);
  const compareMode = useAppStore((state) => state.compareMode);
  const setCameraMode = useAppStore((state) => state.setCameraMode);
  const setTargetId = useAppStore((state) => state.setTargetId);
  const activeSurface = useAppStore((state) => state.activeSurface);
  const activeCosmicLab = useAppStore((state) => state.activeCosmicLab);
  const inExoSystem = useAppStore((state) => state.inExoSystem);
  const setInExoSystem = useAppStore((state) => state.setInExoSystem);
  const reEntryActive = useAppStore((state) => state.reEntryActive);

  const isGalaxy = cameraMode === 'GALAXY';

  const handleSelectPlanet = (id: string) => {
    setTargetId(id);
  };

  const handleFocusPlanet = (id: string) => {
    setTargetId(id);
    if (id === 'blackhole') {
      CameraManager.getInstance().flyToBlackHole();
    } else if (id === 'pulsar') {
      CameraManager.getInstance().flyToPulsar();
    } else {
      CameraManager.getInstance().focusPlanet(id);
    }
  };

  const handleEnterSolarSystem = () => {
    setCameraMode('ORBIT');
    setTargetId('sun');
    CameraManager.getInstance().flyToSolarSystemOverview();
  };

  const handleEnterWormhole = () => {
    AudioManager.getInstance().playWarpDrive();
    ModeOrchestrator.getInstance().exitAllModes();
    setInExoSystem(true);
  };

  const [activeScenario, setActiveScenario] = useState<ScenarioType>(
    SimulationManager.getInstance().getActiveScenario()
  );

  useEffect(() => {
    return SimulationEventBus.getInstance().on('simulation:scenario_change', (sc) => {
      setActiveScenario(sc);
    });
  }, []);

  if (compareMode) {
    return <CompareScene />;
  }

  return (
    <>
      {/* 1. Supersonic Re-Entry Plasma Sheath */}
      <ReEntryPlasma active={reEntryActive} />

      {/* 2. Planetary Surface Scenes (Mars, Moon, Europa & Titan - lazy mounted inside local Suspense) */}
      {activeSurface === 'mars' && <MarsSurfaceScene visible />}
      {activeSurface === 'moon' && <MoonSurfaceScene visible />}

      <Suspense fallback={null}>
        {activeSurface === 'europa' && <EuropaSurfaceScene visible />}
        {activeSurface === 'titan' && <TitanSurfaceScene visible />}

        {/* 2b. Standalone 3D Cosmic Observatory Labs (isolated inside inner Suspense so EngineLoop/EffectComposer stay mounted) */}
        {activeCosmicLab === 'eclipse' && <EclipseScene />}
        {activeCosmicLab === 'binary_merger' && <BinaryBlackHoleScene />}
        {activeCosmicLab === 'stellar_lab' && <StellarLabScene />}
        {activeCosmicLab === 'planetarium' && <PlanetariumScene />}
        {activeCosmicLab === 'nbody_sandbox' && <NBodySandboxScene />}
        {activeCosmicLab === 'mars_terraform' && <MarsTerraformScene />}
        {activeCosmicLab === 'planetary_cutaway' && <PlanetaryCutawayScene />}
        {activeCosmicLab === 'planetary_defense' && <PlanetaryDefenseScene />}
        {activeCosmicLab === 'trappist_exoplanets' && <TrappistSystemScene />}
        {activeCosmicLab === 'dyson_megastructure' && <DysonMegastructureScene />}
        {activeCosmicLab === 'relativity_lab' && <RelativityLabScene />}
        {activeCosmicLab === 'kessler_leo' && <KesslerOrbitalScene />}
      </Suspense>

      {/* 3. Miller's Ocean World Exosystem through Wormhole */}
      <MillersPlanetScene visible={inExoSystem} onExit={() => setInExoSystem(false)} />

      {/* 4. Simulation Scenarios */}
      {activeScenario === 'earth_launch' && <LaunchScene />}
      {activeScenario === 'earth_history' && <EarthHistoryScene />}
      {activeScenario === 'cosmic_history' && <CosmicEventScene />}

      {/* 5. Primary Solar System Scene */}
      {activeScenario === 'none' && !isGalaxy && activeSurface === 'none' && activeCosmicLab === 'none' && !inExoSystem && (
        <SolarSystemScene
          onSelectPlanet={handleSelectPlanet}
          onFocusPlanet={handleFocusPlanet}
          onEnterWormhole={handleEnterWormhole}
        />
      )}

      {/* 6. Volumetric Milky Way Galaxy Overview */}
      {activeScenario === 'none' && isGalaxy && activeSurface === 'none' && activeCosmicLab === 'none' && !inExoSystem && (
        <GalaxyScene onEnterSolarSystem={handleEnterSolarSystem} />
      )}
    </>
  );
};

export default function App() {
  const cameraMode = useAppStore((state) => state.cameraMode);
  const compareMode = useAppStore((state) => state.compareMode);
  const activeTour = useAppStore((state) => state.activeTour);
  const photoMode = useAppStore((state) => state.photoMode);
  const cinemaMode = useAppStore((state) => state.cinemaMode);
  const quality = useAppStore((state) => state.graphicsQuality);
  const detectedGPUTier = useAppStore((state) => state.detectedGPUTier);
  const isTabHidden = useAppStore((state) => state.isTabHidden);

  const activeSurface = useAppStore((state) => state.activeSurface);
  const activeCosmicLab = useAppStore((state) => state.activeCosmicLab);
  const solarStormActive = useAppStore((state) => state.solarStormActive);
  const missionPlannerOpen = useAppStore((state) => state.missionPlannerOpen);
  const inExoSystem = useAppStore((state) => state.inExoSystem);
  const setInExoSystem = useAppStore((state) => state.setInExoSystem);

  const isSandboxOpen = useAppStore((state) => state.isSandboxOpen);
  const setSandboxOpen = useAppStore((state) => state.setSandboxOpen);
  const setActiveMeteor = useAppStore((state) => state.setActiveMeteor);
  const setActiveTidal = useAppStore((state) => state.setActiveTidal);
  const setActiveSupernova = useAppStore((state) => state.setActiveSupernova);

  const isTarsOpen = useAppStore((state) => state.isTarsOpen);
  const setTarsOpen = useAppStore((state) => state.setTarsOpen);

  const [activeScenario, setActiveScenario] = useState<ScenarioType>(
    SimulationManager.getInstance().getActiveScenario()
  );

  useEffect(() => {
    return SimulationEventBus.getInstance().on('simulation:scenario_change', (sc) => {
      setActiveScenario(sc);
    });
  }, []);

  const pm = PerformanceManager.getInstance();
  const profile = pm.getQualityProfile(quality, detectedGPUTier);
  const dpr = profile.dpr;

  // Synchronize Camera for Planetary Surface Landings (Mars, Moon, Europa, Titan)
  useEffect(() => {
    if (activeSurface !== 'none') {
      CameraManager.getInstance().setSurfaceMode(activeSurface);
    }
  }, [activeSurface]);

  // Synchronize Camera for Miller's Ocean World Exosystem
  useEffect(() => {
    if (inExoSystem) {
      CameraManager.getInstance().setExoSystemMode(true);
    }
  }, [inExoSystem]);

  // Hook up Voice AI TARS Commands (clears conflicting Cosmic Lab / Surface modes first)
  useEffect(() => {
    const copilot = AstroCopilot.getInstance();
    copilot.setCommandListener((cmd) => {
      const store = useAppStore.getState();
      const cam = CameraManager.getInstance();
      const orchestrator = ModeOrchestrator.getInstance();

      if (cmd.type === 'NAVIGATE' && cmd.payload) {
        orchestrator.exitAllModes();
        store.setTargetId(cmd.payload);
        if (cmd.payload === 'blackhole') {
          cam.flyToBlackHole();
        } else {
          cam.focusPlanet(cmd.payload);
        }
      } else if (cmd.type === 'CINEMA') {
        orchestrator.exitAllModes();
        CinematicDirector.getInstance().enterCinemaMode('AUTO');
      } else if (cmd.type === 'MUSIC') {
        HarmonicesMundiSynth.getInstance().toggle();
        store.toggleHarmonicesMundi();
      } else if (cmd.type === 'GALAXY') {
        orchestrator.exitAllModes();
        store.setCameraMode('GALAXY');
      } else if (cmd.type === 'PULSAR') {
        orchestrator.exitAllModes();
        store.setTargetId('pulsar');
        cam.flyToPulsar();
      }
    });
  }, []);

  useEffect(() => {
    return () => {
      ModeOrchestrator.getInstance().cancelPendingTakeoff();
    };
  }, []);

  // Keyboard Shortcuts ('C' for Cinema, 'T' for TARS, 'B' for Sandbox, 'M' StarMap, 'R' Radar, 'Escape' to exit)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const targetEl = e.target as HTMLInputElement | null;
      const isTextInput = Boolean(
        targetEl &&
          (['TEXTAREA', 'SELECT'].includes(targetEl.tagName) ||
            (targetEl.tagName === 'INPUT' && targetEl.type !== 'range'))
      );

      if (e.key === 'Escape') {
        const s = useAppStore.getState();
        if (s.isCommandPaletteOpen) {
          s.setCommandPaletteOpen(false);
          return;
        }
        if (isTextInput) return;
        if (s.isSettingsOpen) {
          s.setSettingsOpen(false);
          return;
        }
        if (s.scaleExplorer) {
          s.setScaleExplorer(false);
          return;
        }
        if (s.photoMode) {
          s.setPhotoMode(false);
          return;
        }
        if (s.compareMode) {
          s.setCompareMode(false);
          return;
        }
        if (s.isSandboxOpen) {
          setSandboxOpen(false);
          return;
        }
        if (s.isTarsOpen) {
          setTarsOpen(false);
          return;
        }
        if (s.activeTour) {
          s.stopTour();
          return;
        }
        if (s.planetariumTelescopeTarget !== 'none') {
          s.setPlanetariumTelescopeTarget('none');
          CameraManager.getInstance().setFov(50);
          return;
        }
        if (s.activeCosmicLab === 'trappist_exoplanets' && s.trappistViewMode === 'surface_e') {
          s.setTrappistViewMode('system');
          CameraManager.getInstance().setCosmicLabSubView('trappist_exoplanets', 'system');
          return;
        }
        if (s.activeCosmicLab === 'relativity_lab' && s.relativityTab === 'bh_dive') {
          s.setRelativityDivePlaying(false);
          s.setRelativityTab('dilation_lensing');
          CameraManager.getInstance().setCosmicLabSubView('relativity_lab', 'dilation_lensing');
          return;
        }
        if (s.activeCosmicLab !== 'none') {
          ModeOrchestrator.getInstance().exitCosmicLab();
          return;
        }
        if (s.solarStormActive) {
          ModeOrchestrator.getInstance().toggleSolarStorm(false);
          return;
        }
        if (s.missionPlannerOpen) {
          ModeOrchestrator.getInstance().toggleMissionPlanner(false);
          return;
        }
        if (s.cinemaMode) {
          CinematicDirector.getInstance().exitCinemaMode();
        }
        if (s.activeSurface !== 'none') {
          ModeOrchestrator.getInstance().startSurfaceTakeoff();
        }
        if (s.inExoSystem) {
          setInExoSystem(false);
        }
        return;
      }

      if (isTextInput) return;

      // Preserve browser/OS shortcuts such as Cmd+R, Ctrl+R, Cmd+M, Alt+*
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;

      if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        const director = CinematicDirector.getInstance();
        if (useAppStore.getState().cinemaMode) {
          director.exitCinemaMode();
        } else {
          ModeOrchestrator.getInstance().exitAllModes();
          director.enterCinemaMode('AUTO');
        }
      } else if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        setTarsOpen(!useAppStore.getState().isTarsOpen);
      } else if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        setSandboxOpen(!useAppStore.getState().isSandboxOpen);
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        useAppStore.getState().toggleStarMap();
      } else if (e.key === 'r' || e.key === 'R') {
        if (useAppStore.getState().cameraMode !== 'FREE_FLIGHT') {
          e.preventDefault();
          useAppStore.getState().toggleRadar();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setTarsOpen, setSandboxOpen, setInExoSystem]);

  const handleTakeoff = () => {
    ModeOrchestrator.getInstance().startSurfaceTakeoff();
  };

  const isStandaloneView = activeSurface !== 'none' || activeCosmicLab !== 'none' || inExoSystem;

  return (
    <ErrorBoundary>
      <main className="relative w-screen h-screen overflow-hidden bg-[#020204]">
        {/* Three.js 3D WebGL Canvas with ACES Filmic Tone Mapping & Soft Shadows */}
        <Canvas
          shadows
          frameloop={isTabHidden ? 'never' : 'always'}
          gl={{
            antialias: false,
            stencil: false,
            powerPreference: 'high-performance',
            alpha: false,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.18
          }}
          dpr={dpr}
          camera={{
            position: [110, 35, 95],
            fov: 50,
            near: 0.1,
            far: 80000
          }}
          className="w-full h-full cursor-grab active:cursor-grabbing"
        >
          <Suspense fallback={null}>
            <EngineLoop />
            <UniverseScene />
            <CameraController />

            {/* Film & Video Post-Processing Pipeline (Bypassed on LOW profile in favor of zero-FBO CSS vignette) */}
            {profile.enablePostProcessing && (
              <EffectComposer multisampling={0}>
                {profile.enableBloom && (
                  <Bloom
                    luminanceThreshold={0.78}
                    luminanceSmoothing={0.3}
                    intensity={1.15}
                    mipmapBlur
                  />
                )}
                <Vignette eskil={false} offset={0.15} darkness={0.72} />
              </EffectComposer>
            )}
          </Suspense>
        </Canvas>

        {!profile.enablePostProcessing && (
          <div
            className="fixed inset-0 pointer-events-none z-10"
            style={{
              background: 'radial-gradient(circle at center, transparent 52%, rgba(0, 0, 0, 0.72) 100%)'
            }}
          />
        )}

        {/* Simulation Scenario HUDs */}
        {activeScenario === 'earth_launch' && <CockpitHUD />}
        {activeScenario === 'earth_history' && <EarthTimelineHUD />}
        {activeScenario === 'cosmic_history' && <CosmicTimelineHUD />}

        {/* User Interface HUD Layer */}
        {activeScenario === 'none' && !photoMode && !cinemaMode && !isStandaloneView && <SuperNav />}
        {activeScenario === 'none' && !photoMode && !cinemaMode && !isStandaloneView && !activeTour && !compareMode && !solarStormActive && !missionPlannerOpen && cameraMode !== 'GALAXY' && cameraMode !== 'FREE_FLIGHT' && <SolarRadarHUD />}
        {activeScenario === 'none' && !photoMode && !cinemaMode && !isStandaloneView && !activeTour && cameraMode !== 'FREE_FLIGHT' && <TimeControls />}
        {activeScenario === 'none' && !photoMode && !cinemaMode && !isStandaloneView && cameraMode !== 'FREE_FLIGHT' && !compareMode && !activeTour && !solarStormActive && !missionPlannerOpen && <TargetHUD />}
        {activeScenario === 'none' && !photoMode && !cinemaMode && !isStandaloneView && <FlightHUD />}
        {activeScenario === 'none' && !cinemaMode && !isStandaloneView && <TourController />}
        {activeScenario === 'none' && !cinemaMode && !isStandaloneView && <CompareHUD />}

        {/* Live Solar System Overlays HUDs (Mutually Exclusive Right Dock — gated identically to TargetHUD) */}
        {activeScenario === 'none' && !photoMode && !cinemaMode && !isStandaloneView && cameraMode !== 'GALAXY' && cameraMode !== 'FREE_FLIGHT' && !compareMode && !activeTour && <SolarStormHUD />}
        {activeScenario === 'none' && !photoMode && !cinemaMode && !isStandaloneView && cameraMode !== 'GALAXY' && cameraMode !== 'FREE_FLIGHT' && !compareMode && !activeTour && <MissionPlannerHUD />}

        {/* Standalone 3D Cosmic Observatory Labs HUDs */}
        {activeCosmicLab === 'eclipse' && <EclipseHUD />}
        {activeCosmicLab === 'binary_merger' && <BinaryMergerHUD />}
        {activeCosmicLab === 'stellar_lab' && <StellarLabHUD />}
        {activeCosmicLab === 'planetarium' && <PlanetariumHUD />}
        {activeCosmicLab === 'nbody_sandbox' && <NBodySandboxHUD />}
        {activeCosmicLab === 'mars_terraform' && <MarsTerraformHUD />}
        {activeCosmicLab === 'planetary_cutaway' && <PlanetaryCutawayHUD />}
        {activeCosmicLab === 'planetary_defense' && <PlanetaryDefenseHUD />}
        {activeCosmicLab === 'trappist_exoplanets' && <TrappistSystemHUD />}
        {activeCosmicLab === 'dyson_megastructure' && <DysonMegastructureHUD />}
        {activeCosmicLab === 'relativity_lab' && <RelativityLabHUD />}
        {activeCosmicLab === 'kessler_leo' && <KesslerOrbitalHUD />}

        {/* Surface Landing Telemetry HUD (Mars, Moon, Europa & Titan) */}
        {activeSurface !== 'none' && (
          <SurfaceHUD location={activeSurface} onTakeoff={handleTakeoff} />
        )}

        {/* Miller's Ocean World Exoplanet HUD */}
        {inExoSystem && (
          <MillersHUD onExit={() => setInExoSystem(false)} />
        )}

        {/* IMAX 2.39:1 Cinema Mode Letterbox Overlay */}
        <CinematicOverlay />

        {/* Sandbox Cataclysms Toolbar */}
        <SandboxToolbar
          isOpen={isSandboxOpen}
          onClose={() => setSandboxOpen(false)}
          onTriggerMeteor={() => setActiveMeteor(true)}
          onTriggerTidal={() => setActiveTidal(true)}
          onTriggerSupernova={() => setActiveSupernova(true)}
        />

        {/* AI TARS Hologram Assistant */}
        <TarsHologram isOpen={isTarsOpen} onClose={() => setTarsOpen(false)} />

        <CommandPalette />
        <Suspense fallback={null}>
          <ScaleExplorer />
          <PhotoModeModal />
          <SettingsModal />
        </Suspense>
        <DiagnosticsOverlay />
      </main>
    </ErrorBoundary>
  );
}
