import React, { useEffect, useState } from 'react';
import * as THREE from 'three';
import { Compass, Gauge, X } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { CameraManager } from '@/engine/camera/CameraManager';
import { CELESTIAL_BODIES, getLocalizedBodyData } from '@/data/celestialData';
import { useTranslation } from '@/i18n';

const scratchTargetPos = new THREE.Vector3();

function formatLiveRange(targetId: string | null): string {
  if (!targetId) return '';
  const body = CELESTIAL_BODIES[targetId];
  if (!body) return '';
  if (body.type === 'constellation') {
    const loc = getLocalizedBodyData(targetId);
    return loc?.distanceLightYears ?? '';
  }

  const camMgr = CameraManager.getInstance();
  const cam = camMgr.camera;
  if (!cam) {
    return `${(body.orbitalDistanceAU * 149.6).toFixed(1)}M km`;
  }

  const targetPos = camMgr.getLiveBodyPosition(targetId, scratchTargetPos);
  const camDist = cam.position.distanceTo(targetPos);
  if (targetId === 'iss' && camDist < 5) {
    return `${Math.max(0.1, camDist * 0.45).toFixed(2)} km`;
  }
  if (targetId === 'jwst' && camDist < 5) {
    return `${Math.max(0.1, camDist * 0.35).toFixed(2)} km`;
  }
  const surfaceDist = Math.max(0, camDist - (body.visualRadius || 0));
  if (surfaceDist < 5) {
    return `${Math.max(100, Math.round(surfaceDist * 12000)).toLocaleString()} km`;
  }
  const liveAU = camDist / 68.0;
  return `${(liveAU * 149.6).toFixed(1)}M km (${liveAU.toFixed(2)} AU)`;
}

export const FlightHUD: React.FC = () => {
  const { t, language } = useTranslation();
  const cameraMode = useAppStore((state) => state.cameraMode);
  const targetId = useAppStore((state) => state.targetId);
  const isTabHidden = useAppStore((state) => state.isTabHidden);

  const [velocity, setVelocity] = useState(0);
  const [liveDistance, setLiveDistance] = useState(() => formatLiveRange(targetId));

  useEffect(() => {
    if (cameraMode !== 'FREE_FLIGHT') return;

    const syncTelemetry = () => {
      if (isTabHidden) return;
      const v = CameraManager.getInstance().velocity.length();
      const nextVel = Math.round(v * 10) / 10;
      setVelocity((prev) => (prev === nextVel ? prev : nextVel));

      const nextDist = formatLiveRange(useAppStore.getState().targetId);
      setLiveDistance((prev) => (prev === nextDist ? prev : nextDist));
    };

    syncTelemetry();
    const interval = setInterval(syncTelemetry, 100);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const s = useAppStore.getState();
      if (
        s.isCommandPaletteOpen ||
        s.isSettingsOpen ||
        s.gameHubOpen ||
        s.scaleExplorer ||
        s.isSandboxOpen ||
        s.isTarsOpen ||
        s.photoMode
      ) {
        return;
      }
      CameraManager.getInstance().exitFreeFlight();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearInterval(interval);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [cameraMode, isTabHidden]);

  if (cameraMode !== 'FREE_FLIGHT') return null;

  const targetBody = targetId ? getLocalizedBodyData(targetId) : null;
  const exitFlightHint = language === 'vi' ? 'NHẤN ESC ĐỂ THOÁT BAY' : 'PRESS ESC TO EXIT FLIGHT';

  return (
    <div className="fixed inset-0 pointer-events-none z-30 flex flex-col justify-between p-3 sm:p-6">
      {/* Flight Mode Header Warning / Status */}
      <div className="flex justify-center mt-12 sm:mt-14">
        <div className="glass-panel px-3.5 sm:px-4 py-1.5 rounded-full flex items-center space-x-2 text-emerald-400 border border-emerald-500/40 bg-slate-950/80 backdrop-blur-md shadow-2xl pointer-events-auto">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-[11px] sm:text-xs font-mono font-semibold tracking-widest uppercase">
            {t('flight.title')}
          </span>
          <span className="hidden sm:inline text-[10px] text-slate-400 bg-white/10 px-2 py-0.5 rounded">
            {exitFlightHint}
          </span>
          <button
            type="button"
            aria-label={exitFlightHint}
            onClick={() => CameraManager.getInstance().exitFreeFlight()}
            className="hover:text-white text-slate-400 transition-colors cursor-pointer p-0.5 ml-1"
            title={exitFlightHint}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Center Flight Reticle & Crosshair */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center opacity-60">
          <div className="absolute inset-0 border border-sky-400/40 rounded-full animate-spin-slow" />
          <div className="w-2 h-2 rounded-full bg-sky-400" />
          <div className="absolute top-0 w-px h-3 bg-sky-400" />
          <div className="absolute bottom-0 w-px h-3 bg-sky-400" />
          <div className="absolute left-0 w-3 h-px bg-sky-400" />
          <div className="absolute right-0 w-3 h-px bg-sky-400" />
        </div>
      </div>

      {/* Flight Instrument Gauges (Left & Right) */}
      <div className="flex justify-between items-end gap-2 mb-2 sm:mb-4">
        <div className="glass-panel p-2.5 sm:p-3.5 rounded-2xl space-y-1.5 sm:space-y-2 border border-sky-500/20 w-40 sm:w-56">
          <div className="flex items-center space-x-2 text-slate-400">
            <Gauge className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-400" />
            <span className="text-[9px] sm:text-[10px] font-mono uppercase tracking-wider">{t('flight.velocity')}</span>
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-xl sm:text-2xl font-mono font-bold text-white">{velocity}</span>
            <span className="text-xs font-mono text-sky-400">AU/s</span>
          </div>
          <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-sky-400 to-emerald-400 h-full transition-all duration-150"
              style={{ width: `${Math.min(100, (velocity / 120) * 100)}%` }}
            />
          </div>
        </div>

        {targetBody && (
          <div className="glass-panel p-2.5 sm:p-3.5 rounded-2xl space-y-1.5 sm:space-y-2 border border-sky-500/20 w-44 sm:w-60 text-right">
            <div className="flex items-center justify-end space-x-1.5 text-slate-400">
              <span className="text-[9px] sm:text-[10px] font-mono uppercase tracking-wider truncate">{t('commandPalette.catNavigation')}</span>
              <Compass className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 shrink-0" />
            </div>
            <div className="text-xs sm:text-sm font-bold text-white uppercase truncate">{targetBody.displayName}</div>
            <div className="text-[11px] sm:text-xs font-mono text-amber-400">
              {liveDistance || formatLiveRange(targetId)}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Keybinding Helpers */}
      <div className="flex justify-center">
        <div className="glass-panel px-3 sm:px-4 py-2 rounded-xl flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[10px] sm:text-[11px] font-mono text-slate-300">
          <div><kbd className="bg-white/10 px-1.5 py-0.5 rounded text-white font-bold">W/A/S/D</kbd> {language === 'vi' ? 'Tiến/Lùi · Trái/Phải' : 'Throttle / Strafe'}</div>
          <div><kbd className="bg-white/10 px-1.5 py-0.5 rounded text-white font-bold">R/F · E/Q</kbd> {language === 'vi' ? 'Lên/Xuống' : 'Up/Down'}</div>
          <div><kbd className="bg-white/10 px-1.5 py-0.5 rounded text-white font-bold">Shift</kbd> {language === 'vi' ? 'Tăng tốc' : 'Boost'}</div>
          <div><kbd className="bg-white/10 px-1.5 py-0.5 rounded text-white font-bold">Space</kbd> {language === 'vi' ? 'Hãm tốc' : 'Brake'}</div>
        </div>
      </div>
    </div>
  );
};
