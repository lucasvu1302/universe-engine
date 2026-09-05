import React, { useEffect, useState } from 'react';
import { Compass, Gauge } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { CameraManager } from '@/engine/camera/CameraManager';
import { getLocalizedBodyData } from '@/data/celestialData';
import { useTranslation } from '@/i18n';

export const FlightHUD: React.FC = () => {
  const { t } = useTranslation();
  const cameraMode = useAppStore((state) => state.cameraMode);
  const targetId = useAppStore((state) => state.targetId);
  const setCameraMode = useAppStore((state) => state.setCameraMode);

  const [velocity, setVelocity] = useState(0);

  useEffect(() => {
    if (cameraMode !== 'FREE_FLIGHT') return;

    const interval = setInterval(() => {
      const v = CameraManager.getInstance().velocity.length();
      setVelocity(Math.round(v * 10) / 10);
    }, 100);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setCameraMode('ORBIT');
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearInterval(interval);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [cameraMode, setCameraMode]);

  if (cameraMode !== 'FREE_FLIGHT') return null;

  const targetBody = targetId ? getLocalizedBodyData(targetId) : null;

  return (
    <div className="fixed inset-0 pointer-events-none z-30 flex flex-col justify-between p-6">
      {/* Flight Mode Header Warning / Status */}
      <div className="flex justify-center">
        <div className="glass-panel px-4 py-1.5 rounded-full flex items-center space-x-2 text-emerald-400 border border-emerald-500/30">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-xs font-mono font-semibold tracking-widest uppercase">
            {t('flight.title')}
          </span>
          <span className="text-[10px] text-slate-400 bg-white/10 px-2 py-0.5 rounded">
            {t('cinema.pressEsc')}
          </span>
        </div>
      </div>

      {/* Center Flight Reticle & Crosshair */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative w-28 h-28 flex items-center justify-center opacity-60">
          {/* Outer circle */}
          <div className="absolute inset-0 border border-sky-400/40 rounded-full animate-spin-slow" />
          {/* Segment ticks */}
          <div className="w-2 h-2 rounded-full bg-sky-400" />
          <div className="absolute top-0 w-px h-3 bg-sky-400" />
          <div className="absolute bottom-0 w-px h-3 bg-sky-400" />
          <div className="absolute left-0 w-3 h-px bg-sky-400" />
          <div className="absolute right-0 w-3 h-px bg-sky-400" />
        </div>
      </div>

      {/* Flight Instrument Gauges (Left & Right) */}
      <div className="flex justify-between items-end mb-16">
        {/* Left: Speedometer & Thrust */}
        <div className="glass-panel p-3.5 rounded-2xl space-y-2 border border-sky-500/20 w-56">
          <div className="flex items-center space-x-2 text-slate-400">
            <Gauge className="w-4 h-4 text-sky-400" />
            <span className="text-[10px] font-mono uppercase tracking-wider">{t('flight.velocity')}</span>
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-2xl font-mono font-bold text-white">{velocity}</span>
            <span className="text-xs font-mono text-sky-400">AU/s</span>
          </div>
          {/* Velocity bar */}
          <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-sky-400 to-emerald-400 h-full transition-all duration-150"
              style={{ width: `${Math.min(100, (velocity / 120) * 100)}%` }}
            />
          </div>
        </div>

        {/* Right: Target Range */}
        {targetBody && (
          <div className="glass-panel p-3.5 rounded-2xl space-y-2 border border-sky-500/20 w-56 text-right">
            <div className="flex items-center justify-end space-x-2 text-slate-400">
              <span className="text-[10px] font-mono uppercase tracking-wider">{t('commandPalette.catNavigation')}</span>
              <Compass className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-sm font-bold text-white uppercase">{targetBody.displayName}</div>
            <div className="text-xs font-mono text-amber-400">
              {(targetBody.orbitalDistanceAU * 149.6).toFixed(1)}M KM
            </div>
          </div>
        )}
      </div>

      {/* Bottom Keybinding Helpers */}
      <div className="flex justify-center">
        <div className="glass-panel px-4 py-2 rounded-xl flex items-center space-x-4 text-[11px] font-mono text-slate-300">
          <div><kbd className="bg-white/10 px-1.5 py-0.5 rounded text-white font-bold">W/S/A/D</kbd> {t('flight.wasdMove')}</div>
          <div><kbd className="bg-white/10 px-1.5 py-0.5 rounded text-white font-bold">R/F</kbd> {t('flight.rfVertical')}</div>
          <div><kbd className="bg-white/10 px-1.5 py-0.5 rounded text-white font-bold">Shift</kbd> {t('flight.shiftBoost')}</div>
          <div><kbd className="bg-white/10 px-1.5 py-0.5 rounded text-white font-bold">Space</kbd> {t('flight.spaceBrake')}</div>
        </div>
      </div>
    </div>
  );
};
