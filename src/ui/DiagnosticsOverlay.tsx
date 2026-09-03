import React, { useEffect, useState } from 'react';
import { Activity } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { PerformanceManager } from '@/engine/performance/PerformanceManager';
import { SimulationClock } from '@/engine/simulation/SimulationClock';
import { CameraManager } from '@/engine/camera/CameraManager';

export const DiagnosticsOverlay: React.FC = () => {
  const isOpen = useAppStore((state) => state.isDevOverlayOpen);
  const toggleDev = useAppStore((state) => state.toggleDevOverlay);
  const quality = useAppStore((state) => state.graphicsQuality);

  const [metrics, setMetrics] = useState({
    fps: 60,
    frameTimeMs: 16.6,
    refreshRate: 60,
    gpuTier: 2,
    dpr: 1.0,
    simTime: 0,
    camPos: '0, 0, 0'
  });

  // Global Shift + D listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        toggleDev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleDev]);

  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      const pm = PerformanceManager.getInstance();
      const clock = SimulationClock.getInstance();
      const cam = CameraManager.getInstance().camera;

      const posStr = cam
        ? `${cam.position.x.toFixed(0)}, ${cam.position.y.toFixed(0)}, ${cam.position.z.toFixed(0)}`
        : '0, 0, 0';

      setMetrics({
        fps: pm.currentFPS,
        frameTimeMs: Math.round(pm.currentFrameTimeMs * 10) / 10,
        refreshRate: pm.targetRefreshRate,
        gpuTier: useAppStore.getState().detectedGPUTier,
        dpr: pm.getDPR(quality),
        simTime: Math.round(clock.simulationTime * 10) / 10,
        camPos: posStr
      });
    }, 200);

    return () => clearInterval(interval);
  }, [isOpen, quality]);

  if (!isOpen) return null;

  return (
    <div className="fixed top-16 left-4 z-50 pointer-events-none font-mono text-[11px]">
      <div className="glass-panel-glow p-3.5 rounded-2xl border border-emerald-500/40 text-emerald-400 space-y-1.5 w-64 shadow-2xl">
        <div className="flex items-center space-x-2 border-b border-emerald-500/20 pb-1.5 font-bold">
          <Activity className="w-3.5 h-3.5" />
          <span>DIAGNOSTICS (SHIFT+D)</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">FRAME RATE:</span>
          <span className="text-white font-bold">{metrics.fps} FPS ({metrics.refreshRate}Hz)</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">FRAME TIME:</span>
          <span className="text-white">{metrics.frameTimeMs} ms</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">GPU TIER:</span>
          <span className="text-white">Tier {metrics.gpuTier}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">DPR RENDER:</span>
          <span className="text-white">{metrics.dpr.toFixed(1)}x</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">SIM TIME:</span>
          <span className="text-white">{metrics.simTime}s</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">CAM POS:</span>
          <span className="text-white text-[10px]">{metrics.camPos}</span>
        </div>
      </div>
    </div>
  );
};
