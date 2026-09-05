import React, { Component, ErrorInfo, ReactNode, Suspense, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';

import { useAppStore } from '@/stores/useAppStore';
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
import { TargetHUD } from '@/ui/TargetHUD';
import { FlightHUD } from '@/ui/FlightHUD';
import { TourController } from '@/ui/TourController';
import { CompareHUD } from '@/ui/CompareHUD';
import { CommandPalette } from '@/ui/CommandPalette';
import { DiagnosticsOverlay } from '@/ui/DiagnosticsOverlay';
import { CinematicOverlay } from '@/ui/CinematicOverlay';
import { SurfaceHUD } from '@/ui/SurfaceHUD';
import { SandboxToolbar } from '@/ui/SandboxToolbar';
import { TarsHologram } from '@/ui/TarsHologram';
import { CinematicDirector } from '@/engine/camera/CinematicDirector';
import { HarmonicesMundiSynth } from '@/engine/audio/HarmonicesMundiSynth';
import { AstroCopilot } from '@/engine/ai/AstroCopilot';

// UI modal code-splitting
const ScaleExplorer = React.lazy(() => import('@/ui/ScaleExplorer').then((m) => ({ default: m.ScaleExplorer })));
const PhotoModeModal = React.lazy(() => import('@/ui/PhotoModeModal').then((m) => ({ default: m.PhotoModeModal })));
const SettingsModal = React.lazy(() => import('@/ui/SettingsModal').then((m) => ({ default: m.SettingsModal })));

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
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 text-white p-6">
          <div className="max-w-md p-6 rounded-2xl glass-panel-glow border border-red-500/40 text-center">
            <h2 className="text-xl font-bold text-red-400 mb-2">Graphics Engine Halted</h2>
            <p className="text-sm text-slate-300 mb-4">{this.state.error?.message || 'Unexpected WebGL pipeline error.'}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 rounded-lg text-sm font-semibold transition-all cursor-pointer"
            >
              Re-initialize Engine
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

  useFrame((_, delta) => {
    SimulationClock.getInstance().update(performance.now());
    PerformanceManager.getInstance().recordFrame(performance.now());
    CinematicDirector.getInstance().update(delta);
    HarmonicesMundiSynth.getInstance().update(timeScale, targetId === 'blackhole');
  });

  return null;
};

// Scene Hierarchy with Zero-Unmount Smooth Transitions
const UniverseScene: React.FC = () => {
  const cameraMode = useAppStore((state) => state.cameraMode);
  const compareMode = useAppStore((state) => state.compareMode);
  const setCameraMode = useAppStore((state) => state.setCameraMode);
  const setTargetId = useAppStore((state) => state.setTargetId);
  const activeSurface = useAppStore((state) => state.activeSurface);
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
    setInExoSystem(true);
  };

  if (compareMode) {
    return <CompareScene />;
  }

  return (
    <>
      {/* 1. Supersonic Re-Entry Plasma Sheath */}
      <ReEntryPlasma active={reEntryActive} />

      {/* 2. Planetary Surface Scenes (Mars Jezero & Apollo 11 Moon) */}
      <MarsSurfaceScene visible={activeSurface === 'mars'} />
      <MoonSurfaceScene visible={activeSurface === 'moon'} />

      {/* 3. Miller's Ocean World Exosystem through Wormhole */}
      <MillersPlanetScene visible={inExoSystem} onExit={() => setInExoSystem(false)} />

      {/* 4. Primary Solar System Scene */}
      <group visible={!isGalaxy && activeSurface === 'none' && !inExoSystem}>
        <SolarSystemScene
          onSelectPlanet={handleSelectPlanet}
          onFocusPlanet={handleFocusPlanet}
          onEnterWormhole={handleEnterWormhole}
        />
      </group>

      {/* 5. Volumetric Milky Way Galaxy Overview */}
      <group visible={isGalaxy && activeSurface === 'none' && !inExoSystem}>
        <GalaxyScene onEnterSolarSystem={handleEnterSolarSystem} />
      </group>
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

  const activeSurface = useAppStore((state) => state.activeSurface);
  const setActiveSurface = useAppStore((state) => state.setActiveSurface);
  const setReEntryActive = useAppStore((state) => state.setReEntryActive);
  const inExoSystem = useAppStore((state) => state.inExoSystem);
  const setInExoSystem = useAppStore((state) => state.setInExoSystem);

  const isSandboxOpen = useAppStore((state) => state.isSandboxOpen);
  const setSandboxOpen = useAppStore((state) => state.setSandboxOpen);
  const setActiveMeteor = useAppStore((state) => state.setActiveMeteor);
  const setActiveTidal = useAppStore((state) => state.setActiveTidal);
  const setActiveSupernova = useAppStore((state) => state.setActiveSupernova);

  const isTarsOpen = useAppStore((state) => state.isTarsOpen);
  const setTarsOpen = useAppStore((state) => state.setTarsOpen);

  const pm = PerformanceManager.getInstance();
  const dpr = pm.getDPR(quality);
  const enableBloom = quality !== 'LOW';

  // Hook up Voice AI TARS Commands
  useEffect(() => {
    const copilot = AstroCopilot.getInstance();
    copilot.setCommandListener((cmd) => {
      const store = useAppStore.getState();
      const cam = CameraManager.getInstance();

      if (cmd.type === 'NAVIGATE' && cmd.payload) {
        store.setActiveSurface('none');
        store.setInExoSystem(false);
        store.setTargetId(cmd.payload);
        if (cmd.payload === 'blackhole') {
          cam.flyToBlackHole();
        } else {
          cam.focusPlanet(cmd.payload);
        }
      } else if (cmd.type === 'CINEMA') {
        CinematicDirector.getInstance().enterCinemaMode('AUTO');
      } else if (cmd.type === 'MUSIC') {
        HarmonicesMundiSynth.getInstance().toggle();
        store.toggleHarmonicesMundi();
      } else if (cmd.type === 'GALAXY') {
        store.setCameraMode('GALAXY');
      } else if (cmd.type === 'PULSAR') {
        store.setTargetId('pulsar');
        cam.flyTo(new THREE.Vector3(-340, 190, -320), new THREE.Vector3(-340, 160, -380), 2.2);
      }
    });
  }, []);

  // Keyboard Shortcuts ('C' for Cinema, 'T' for TARS, 'B' for Sandbox, 'Escape' to exit)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        const director = CinematicDirector.getInstance();
        if (useAppStore.getState().cinemaMode) {
          director.exitCinemaMode();
        } else {
          director.enterCinemaMode('AUTO');
        }
      } else if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        setTarsOpen(!useAppStore.getState().isTarsOpen);
      } else if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        setSandboxOpen(!useAppStore.getState().isSandboxOpen);
      } else if (e.key === 'Escape') {
        if (useAppStore.getState().cinemaMode) {
          CinematicDirector.getInstance().exitCinemaMode();
        }
        if (useAppStore.getState().activeSurface !== 'none') {
          handleTakeoff();
        }
        if (useAppStore.getState().inExoSystem) {
          setInExoSystem(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setTarsOpen, setSandboxOpen, setInExoSystem]);

  const handleTakeoff = () => {
    setReEntryActive(true);
    setTimeout(() => {
      setActiveSurface('none');
      setReEntryActive(false);
      CameraManager.getInstance().flyToSolarSystemOverview();
    }, 1800);
  };

  return (
    <ErrorBoundary>
      <main className="relative w-screen h-screen overflow-hidden bg-[#020204]">
        {/* Three.js 3D WebGL Canvas with ACES Filmic Tone Mapping */}
        <Canvas
          gl={{
            antialias: false,
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
            <CameraController />
            <UniverseScene />

            {/* Film & Video Post-Processing Pipeline */}
            <EffectComposer multisampling={0}>
              {enableBloom && (
                <Bloom
                  luminanceThreshold={0.78}
                  luminanceSmoothing={0.3}
                  intensity={1.15}
                  mipmapBlur
                />
              )}
              <Vignette eskil={false} offset={0.15} darkness={0.72} />
            </EffectComposer>
          </Suspense>
        </Canvas>

        {/* User Interface HUD Layer */}
        {!photoMode && !cinemaMode && activeSurface === 'none' && !inExoSystem && <SuperNav />}
        {!photoMode && !cinemaMode && activeSurface === 'none' && !inExoSystem && !activeTour && <TimeControls />}
        {!photoMode && !cinemaMode && activeSurface === 'none' && !inExoSystem && cameraMode !== 'FREE_FLIGHT' && !compareMode && <TargetHUD />}
        {!cinemaMode && activeSurface === 'none' && !inExoSystem && <FlightHUD />}
        {!cinemaMode && activeSurface === 'none' && !inExoSystem && <TourController />}
        {!cinemaMode && activeSurface === 'none' && !inExoSystem && <CompareHUD />}

        {/* Surface Landing Telemetry HUD */}
        {activeSurface !== 'none' && (
          <SurfaceHUD location={activeSurface as 'mars' | 'moon'} onTakeoff={handleTakeoff} />
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
