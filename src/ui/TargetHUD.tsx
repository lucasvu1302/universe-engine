import React from 'react';
import { Crosshair, Orbit, Thermometer, Weight, Ruler } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { CELESTIAL_BODIES, getLocalizedBodyData } from '@/data/celestialData';
import { CameraManager } from '@/engine/camera/CameraManager';
import { AudioManager } from '@/engine/audio/AudioManager';
import { useTranslation } from '@/i18n';

export const TargetHUD: React.FC = () => {
  const { t } = useTranslation();
  const targetId = useAppStore((state) => state.targetId);
  const hoveredId = useAppStore((state) => state.hoveredId);
  const activeId = hoveredId || targetId;

  if (!activeId) return null;

  const data = CELESTIAL_BODIES[activeId];
  if (!data) return null;

  const localized = getLocalizedBodyData(activeId);

  const handleFocus = () => {
    AudioManager.getInstance().playUIClick();
    if (data.id === 'blackhole') {
      CameraManager.getInstance().flyToBlackHole();
    } else if (data.id === 'pulsar') {
      CameraManager.getInstance().flyToPulsar();
    } else {
      CameraManager.getInstance().focusPlanet(data.id);
    }
  };

  const isBlackHole = data.type === 'black_hole';
  const isPulsar = data.type === 'pulsar';

  return (
    <div className="fixed bottom-4 right-4 z-40 w-80 pointer-events-auto">
      <div className={`p-4 rounded-2xl space-y-3 ${
        isBlackHole
          ? 'glass-panel border border-orange-500/40 shadow-orange-500/10 shadow-2xl'
          : isPulsar
          ? 'glass-panel border border-cyan-500/40 shadow-cyan-500/10 shadow-2xl'
          : 'glass-panel-glow'
      }`}>
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-2.5">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-white tracking-wide">{localized.displayName}</h2>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border uppercase tracking-wider font-mono ${
                isBlackHole
                  ? 'bg-orange-500/20 text-orange-400 border-orange-500/40'
                  : isPulsar
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                  : 'bg-sky-500/20 text-sky-400 border-sky-500/30'
              }`}>
                {localized.type}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {data.type === 'black_hole'
                ? t('targetHud.supermassiveSingularity')
                : data.type === 'pulsar'
                ? t('targetHud.neutronStar')
                : data.type === 'moon' && data.parentPlanetId
                ? `${t('targetHud.naturalSatelliteOf')} ${getLocalizedBodyData(data.parentPlanetId)?.name || 'Planet'}`
                : data.orbitalDistanceAU > 0
                ? `${data.orbitalDistanceAU} AU (${(data.orbitalDistanceAU * 149.6).toFixed(1)}M km)`
                : t('targetHud.solarCenter')}
            </p>
          </div>

          <button
            onClick={handleFocus}
            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
              isBlackHole
                ? 'bg-orange-500/20 hover:bg-orange-500/40 text-orange-300 border-orange-500/40'
                : isPulsar
                ? 'bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-300 border-cyan-500/40'
                : 'bg-sky-500/20 hover:bg-sky-500/40 text-sky-300 border-sky-500/30'
            }`}
            title={t('targetHud.focusTarget')}
          >
            <Crosshair className="w-4 h-4" />
          </button>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
          {localized.description}
        </p>

        {/* Physical Metrics Grid */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="flex items-center space-x-2 bg-white/5 p-2 rounded-xl">
            <Ruler className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-mono">{t('targetHud.diameter')}</p>
              <p className="text-xs font-semibold text-white">
                {data.diameterKm.toLocaleString()} km
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 bg-white/5 p-2 rounded-xl">
            <Weight className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-mono">{t('targetHud.gravity')}</p>
              <p className="text-xs font-semibold text-white">
                {isBlackHole ? t('targetHud.singularityInfinity') : isPulsar ? '2.0 × 10¹² m/s²' : `${data.gravityMs2} m/s²`}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 bg-white/5 p-2 rounded-xl">
            <Thermometer className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-mono">{t('targetHud.meanTemp')}</p>
              <p className="text-xs font-semibold text-white">
                {isBlackHole ? t('targetHud.coreZeroK') : `${data.meanTemperatureC.toLocaleString()}°C`}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 bg-white/5 p-2 rounded-xl">
            <Orbit className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-mono">
                {data.type === 'moon' ? t('targetHud.orbitPeriod') : isPulsar ? t('targetHud.pulsarPlanets') : t('targetHud.knownMoons')}
              </p>
              <p className="text-xs font-semibold text-white">
                {data.type === 'moon' ? `${data.orbitalPeriodDays} days` : isBlackHole ? 'N/A' : isPulsar ? '3 (Draugr, ...)' : data.moonsCount}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
