import React, { Component, ErrorInfo, ReactNode, Suspense, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';

import { useAppStore } from '@/stores/useAppStore';
import { CameraController } from '@/engine/camera/CameraController';
import { CameraManager } from '@/engine/camera/CameraManager';
import { SimulationClock } from '@/engine/simulation/SimulationClock';
import { PerformanceManager } from '@/engine/performance/PerformanceManager';

import { SolarSystemScene } from '@/scenes/SolarSystem/SolarSystemScene';
import { GalaxyScene } from '@/scenes/Galaxy/GalaxyScene';
import { CompareScene } from '@/scenes/Compare/CompareScene';

import { SuperNav } from '@/ui/SuperNav';
import { TimeControls } from '@/ui/TimeControls';
import { TargetHUD } from '@/ui/TargetHUD';
import { FlightHUD } from '@/ui/FlightHUD';
import { TourController } from '@/ui/TourController';
import { CompareHUD } from '@/ui/CompareHUD';
import { CommandPalette } from '@/ui/CommandPalette';
import { DiagnosticsOverlay } from '@/ui/DiagnosticsOverlay';

// UI modal code-splitting
const ScaleExplorer = React.lazy(() => import('@/ui/ScaleExplorer').then((m) => ({ default: m.ScaleExplorer })));
const PhotoModeModal = React.lazy(() => import('@/ui/PhotoModeModal').then((m) => ({ default: m.PhotoModeModal })));
const SettingsModal = React.lazy(() => import('@/ui/SettingsModal').then((m) => ({ default: m.SettingsModal })));

// Error Boundary for React UI stability (#117)
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
    console.error('Universe Engine React Boundary Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 bg-black flex items-center justify-center p-6 text-white text-center">
          <div className="glass-panel p-8 rounded-3xl border border-rose-500/40 max-w-md space-y-4">
            <h2 className="text-xl font-bold text-rose-400">Rendering Context Interrupted</h2>
            <p className="text-xs text-slate-300">
              An unexpected engine error occurred. The system has prevented a fatal crash.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 rounded-full bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold tracking-wider uppercase transition-all cursor-pointer"
            >
              Reboot Engine
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
  useFrame(() => {
    SimulationClock.getInstance().update(performance.now());
    PerformanceManager.getInstance().recordFrame(performance.now());
  });

  return null;
};

// Scene Hierarchy with Zero-Unmount Smooth Transitions
const UniverseScene: React.FC = () => {
  const cameraMode = useAppStore((state) => state.cameraMode);
  const compareMode = useAppStore((state) => state.compareMode);
  const setCameraMode = useAppStore((state) => state.setCameraMode);
  const setTargetId = useAppStore((state) => state.setTargetId);

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

  if (compareMode) {
    return <CompareScene />;
  }

  return (
    <>
      {/* Primary Solar System Scene (pre-mounted, toggled via visibility to prevent GC lag) */}
      <group visible={!isGalaxy}>
        <SolarSystemScene
          onSelectPlanet={handleSelectPlanet}
          onFocusPlanet={handleFocusPlanet}
        />
      </group>

      {/* Volumetric Milky Way Galaxy (pre-mounted for instantaneous 120 FPS zoom-out) */}
      <group visible={isGalaxy}>
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
  const quality = useAppStore((state) => state.graphicsQuality);

  const pm = PerformanceManager.getInstance();
  const dpr = pm.getDPR(quality);
  const enableBloom = quality !== 'LOW';

  useEffect(() => {
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      console.warn('WebGL Context Lost. Attempting graceful recovery...');
    };

    const handleContextRestored = () => {
      console.info('WebGL Context Restored successfully.');
    };

    window.addEventListener('webglcontextlost', handleContextLost, false);
    window.addEventListener('webglcontextrestored', handleContextRestored, false);

    return () => {
      window.removeEventListener('webglcontextlost', handleContextLost);
      window.removeEventListener('webglcontextrestored', handleContextRestored);
    };
  }, []);

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
        {!photoMode && <SuperNav />}
        {!photoMode && !activeTour && <TimeControls />}
        {!photoMode && cameraMode !== 'FREE_FLIGHT' && !compareMode && <TargetHUD />}
        <FlightHUD />
        <TourController />
        <CompareHUD />
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
