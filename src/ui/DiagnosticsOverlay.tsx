import React, { useEffect, useState } from 'react';
import { Activity } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { PerformanceManager } from '@/engine/performance/PerformanceManager';
import { SimulationClock } from '@/engine/simulation/SimulationClock';
import { CameraManager } from '@/engine/camera/CameraManager';
import { useTranslation } from '@/i18n';

export const DiagnosticsOverlay: React.FC = () => {
  const { isVietnamese: isVi } = useTranslation();
  const isOpen = useAppStore((state) => state.isDevOverlayOpen);
  const toggleDev = useAppStore((state) => state.toggleDevOverlay);
  const quality = useAppStore((state) => state.graphicsQuality);
  const detectedGPUTier = useAppStore((state) => state.detectedGPUTier);

  const [metrics, setMetrics] = useState({
    fps: 60,
    frameTimeMs: 16.6,
    refreshRate: 60,
    gpuTier: 2,
    activeQuality: 'MEDIUM',
    dpr: 1.0,
    drawCalls: 0,
    triangles: 0,
    simTime: 0,
    camPos: '0, 0, 0'
  });

  // Global Shift + D listener (ignores inputs & OS/browser modifier combos)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName) ||
        e.metaKey ||
        e.ctrlKey ||
        e.altKey ||
        e.repeat
      ) {
        return;
      }
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

    const syncMetrics = () => {
      const pm = PerformanceManager.getInstance();
      const clock = SimulationClock.getInstance();
      const cam = CameraManager.getInstance().camera;

      const posStr = cam
        ? `${cam.position.x.toFixed(0)}, ${cam.position.y.toFixed(0)}, ${cam.position.z.toFixed(0)}`
        : '0, 0, 0';

      const snap = pm.getMetrics();
      setMetrics({
        fps: snap.fps,
        frameTimeMs: Math.round(snap.frameTimeMs * 10) / 10,
        refreshRate: snap.targetRefreshRate,
        gpuTier: snap.gpuTier,
        activeQuality: snap.activeQuality,
        dpr: pm.getDPR(quality, detectedGPUTier),
        drawCalls: snap.drawCalls,
        triangles: snap.triangles,
        simTime: Math.round(clock.simulationTime * 10) / 10,
        camPos: posStr
      });
    };

    syncMetrics();
    const interval = setInterval(syncMetrics, 200);

    return () => clearInterval(interval);
  }, [isOpen, quality, detectedGPUTier]);

  if (!isOpen) return null;

  return (
    <div
      data-testid="diagnostics-overlay"
      className="fixed top-16 left-4 z-50 pointer-events-none font-mono text-[11px]"
    >
      <div className="glass-panel-glow p-3.5 rounded-2xl border border-emerald-500/40 text-emerald-400 space-y-1.5 w-64 shadow-2xl">
        <div className="flex items-center space-x-2 border-b border-emerald-500/20 pb-1.5 font-bold">
          <Activity className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{isVi ? 'CHẨN ĐOÁN GPU (SHIFT+D)' : 'DIAGNOSTICS (SHIFT+D)'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">{isVi ? 'TỐC ĐỘ KHUNG:' : 'FRAME RATE:'}</span>
          <span className="text-white font-bold">{metrics.fps} FPS ({metrics.refreshRate}Hz)</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">{isVi ? 'CHU KỲ VẼ:' : 'FRAME TIME:'}</span>
          <span className="text-white">{metrics.frameTimeMs} ms</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">{isVi ? 'PHÂN HẠNG GPU:' : 'GPU TIER:'}</span>
          <span className="text-white">Tier {metrics.gpuTier} ({metrics.activeQuality})</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">{isVi ? 'TỶ LỆ DPR:' : 'DPR RENDER:'}</span>
          <span className="text-white">{metrics.dpr.toFixed(2)}x</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">{isVi ? 'LỆNH VẼ (DRAW CALLS):' : 'DRAW CALLS:'}</span>
          <span data-testid="diag-draw-calls" className="text-white">{metrics.drawCalls}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">{isVi ? 'TAM GIÁC (TRIANGLES):' : 'TRIANGLES:'}</span>
          <span className="text-white">{metrics.triangles.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">{isVi ? 'ĐỒNG HỒ MÔ PHỎNG:' : 'SIM TIME:'}</span>
          <span className="text-white">{metrics.simTime}s</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">{isVi ? 'TỌA ĐỘ CAMERA:' : 'CAM POS:'}</span>
          <span className="text-white text-[10px]">{metrics.camPos}</span>
        </div>
      </div>
    </div>
  );
};
