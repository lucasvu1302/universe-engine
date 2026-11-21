import React, { useEffect } from 'react';
import { Compass, Sparkles, Telescope, X, MapPin, Clock } from 'lucide-react';
import { MeteorShowerId, TelescopeTargetId, useAppStore } from '@/stores/useAppStore';
import {
  PLANETARIUM_CITIES,
  computeHorizontalCoords,
} from '@/engine/ephemeris/PlanetariumPhysics';
import { BRIGHT_NAV_STARS } from '@/data/starCatalog';
import { ModeOrchestrator } from '@/engine/navigation/ModeOrchestrator';
import { CameraManager } from '@/engine/camera/CameraManager';
import { AudioManager } from '@/engine/audio/AudioManager';
import { useTranslation } from '@/i18n';

const POLARIS = BRIGHT_NAV_STARS.find((s) => s.id === 'polaris') ?? {
  raHours: 2.53,
  decDeg: 89.26,
};

const TELESCOPE_TARGETS: Array<{ id: TelescopeTargetId; vi: string; en: string }> = [
  { id: 'none', vi: 'Vòm Trời 360°', en: '360° Sky Dome' },
  { id: 'saturn', vi: 'Sao Thổ (Vành Đai)', en: 'Saturn (Rings)' },
  { id: 'jupiter', vi: 'Sao Mộc (4 Vệ Tinh)', en: 'Jupiter (Moons)' },
  { id: 'orion_m42', vi: 'Tinh Vân Orion M42', en: 'Orion Nebula M42' },
];

const METEOR_SHOWERS: Array<{ id: MeteorShowerId; vi: string; en: string }> = [
  { id: 'none', vi: 'Tắt', en: 'Off' },
  { id: 'perseids', vi: 'Perseids (Tháng 8)', en: 'Perseids (Aug)' },
  { id: 'geminids', vi: 'Geminids (Tháng 12)', en: 'Geminids (Dec)' },
];

export const PlanetariumHUD: React.FC = () => {
  const { language } = useTranslation();
  const isVi = language === 'vi';

  const activeLab = useAppStore((s) => s.activeCosmicLab);
  const cityId = useAppStore((s) => s.planetariumCityId);
  const latDeg = useAppStore((s) => s.planetariumLatDeg);
  const lonDeg = useAppStore((s) => s.planetariumLonDeg);
  const utcHours = useAppStore((s) => s.planetariumUtcHours);
  const meteorShower = useAppStore((s) => s.planetariumMeteorShower);
  const telescopeTarget = useAppStore((s) => s.planetariumTelescopeTarget);

  const setLocation = useAppStore((s) => s.setPlanetariumLocation);
  const setUtcHours = useAppStore((s) => s.setPlanetariumUtcHours);
  const setMeteorShower = useAppStore((s) => s.setPlanetariumMeteorShower);
  const setTelescopeTarget = useAppStore((s) => s.setPlanetariumTelescopeTarget);

  // Sync camera FOV dynamically for Telescope zoom (50° <-> 14°)
  useEffect(() => {
    if (activeLab !== 'planetarium') return;
    CameraManager.getInstance().setFov(telescopeTarget === 'none' ? 50 : 14);
    return () => {
      CameraManager.getInstance().setFov(50);
    };
  }, [activeLab, telescopeTarget]);

  if (activeLab !== 'planetarium') return null;

  const h = Math.floor(utcHours);
  const m = Math.round((utcHours - h) * 60);
  const obsDate = new Date(Date.UTC(2026, 10, 21, h, m, 0));
  const polarisCoords = computeHorizontalCoords(
    POLARIS.raHours,
    POLARIS.decDeg,
    latDeg,
    lonDeg,
    obsDate
  );

  // Format Local Sidereal Time cleanly in astronomical hours & minutes (HHh MMm)
  const lstTotalMins = Math.round((polarisCoords.lstDeg / 15) * 60) % (24 * 60);
  const lstHours = Math.floor(lstTotalMins / 60);
  const lstMins = lstTotalMins % 60;
  const lstFormatted = `${String(lstHours).padStart(2, '0')}h ${String(lstMins).padStart(2, '0')}m`;

  const audio = AudioManager.getInstance();

  const handleSelectTelescope = (target: TelescopeTargetId) => {
    audio.playUIClick();
    setTelescopeTarget(target);
    CameraManager.getInstance().setFov(target === 'none' ? 50 : 14);
  };

  return (
    <div
      data-testid="planetarium-hud"
      className="fixed inset-0 pointer-events-none z-40 flex flex-col justify-between p-3 sm:p-5 select-none"
    >
      {/* Circular Optical Telescope Eyepiece Reticle */}
      {telescopeTarget !== 'none' && (
        <div
          data-testid="telescope-reticle"
          className="fixed inset-0 pointer-events-none flex items-center justify-center z-30"
        >
          <div className="w-[min(72vw,72vh)] h-[min(72vw,72vh)] rounded-full border-2 border-cyan-400/55 shadow-[0_0_0_9999px_rgba(2,6,23,0.72)] relative flex items-center justify-center">
            <div className="w-full h-px bg-cyan-400/20" />
            <div className="h-full w-px bg-cyan-400/20 absolute" />
            <div className="absolute bottom-3 px-2.5 py-0.5 rounded-full bg-black/75 border border-cyan-400/40 text-[10px] font-mono text-cyan-200 text-center">
              {isVi
                ? 'KÍNH THIÊN VĂN · FOV 14° · NHẤN ESC ĐỂ ĐÓNG'
                : 'OPTICAL ZOOM · FOV 14° · PRESS ESC TO EXIT'}
            </div>
          </div>
        </div>
      )}

      {/* Top Header Bar */}
      <div className="flex items-start justify-between gap-2 w-full relative z-40">
        <div className="pointer-events-auto glass-panel-glow rounded-2xl border border-sky-400/35 px-3 sm:px-3.5 py-2 sm:py-2.5 max-w-lg min-w-0">
          <div className="text-[10px] font-mono uppercase tracking-wider text-sky-300 flex items-center space-x-1.5">
            <Compass className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">
              {isVi ? 'ĐÀI THIÊN VĂN BẦU TRỜI ĐÊM 360° & KÍNH THIÊN VĂN' : '360° NIGHT SKY PLANETARIUM & TELESCOPE'}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs font-mono mt-1">
            <span className="text-white font-bold">
              {latDeg.toFixed(1)}°, {lonDeg.toFixed(1)}°
            </span>
            <span className="text-cyan-300">
              {isVi ? 'Độ cao Polaris:' : 'Polaris Alt:'}{' '}
              <strong data-testid="planetarium-polaris-alt">
                {polarisCoords.altitudeDeg > 0 ? `+${polarisCoords.altitudeDeg}°` : `${polarisCoords.altitudeDeg}°`}
              </strong>
            </span>
            <span className="text-amber-300">LST: {lstFormatted}</span>
          </div>
        </div>

        <button
          type="button"
          data-testid="exit-planetarium-btn"
          onClick={() => {
            audio.playUIClick();
            ModeOrchestrator.getInstance().exitCosmicLab();
          }}
          className="pointer-events-auto flex items-center space-x-1.5 px-3 sm:px-3.5 py-2 rounded-xl glass-panel-glow border border-white/15 hover:bg-white/15 text-xs font-semibold text-white cursor-pointer shrink-0"
        >
          <X className="w-4 h-4" />
          <span>{isVi ? 'Thoát' : 'Exit'}</span>
        </button>
      </div>

      {/* Bottom Interactive Observatory Console (height-capped & horizontally scrollable pills on mobile) */}
      <div className="pointer-events-auto relative z-40 w-full max-w-4xl mx-auto glass-panel-glow rounded-2xl border border-white/15 p-2.5 sm:p-4 space-y-2 sm:space-y-2.5 shadow-2xl max-h-[36dvh] sm:max-h-none overflow-y-auto overscroll-contain touch-pan-y vip-scrollbar">
        {/* Row 1: Earth City Selector + UTC Time Scrubber */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center justify-between gap-2">
          <div className="flex items-center gap-1 flex-nowrap overflow-x-auto no-scrollbar sm:flex-wrap pb-0.5 sm:pb-0">
            <MapPin className="w-3.5 h-3.5 text-sky-400 mr-1 shrink-0" />
            {PLANETARIUM_CITIES.map((city) => (
              <button
                key={city.id}
                type="button"
                data-testid={`planetarium-city-${city.id}`}
                onClick={() => {
                  audio.playUIClick();
                  setLocation(city.id, city.latDeg, city.lonDeg);
                }}
                className={`px-2 py-1 rounded-lg border text-[11px] font-semibold cursor-pointer shrink-0 whitespace-nowrap ${
                  cityId === city.id
                    ? 'bg-sky-500/25 border-sky-400/60 text-sky-200'
                    : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                }`}
              >
                {isVi ? city.nameVi : city.nameEn}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-2 min-w-[180px]">
            <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <input
              type="range"
              min={0}
              max={23.75}
              step={0.25}
              value={utcHours}
              onChange={(e) => setUtcHours(parseFloat(e.target.value))}
              aria-label={isVi ? 'Giờ quan sát UTC' : 'Observation UTC hour'}
              className="flex-1 sm:w-36 accent-amber-400 cursor-pointer"
            />
            <span className="font-mono text-[11px] text-amber-300 w-16 text-right shrink-0">
              {String(h).padStart(2, '0')}:{String(m).padStart(2, '0')} UTC
            </span>
          </div>
        </div>

        {/* Row 2: Meteor Showers + Optical Telescope Eyepiece Targets */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center justify-between gap-2 pt-2 border-t border-white/10">
          <div className="flex items-center gap-1 flex-nowrap overflow-x-auto no-scrollbar sm:flex-wrap pb-0.5 sm:pb-0">
            <span className="text-[10px] font-mono text-slate-400 flex items-center space-x-1 mr-1 shrink-0">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              <span>{isVi ? 'MƯA SAO BĂNG:' : 'METEORS:'}</span>
            </span>
            {METEOR_SHOWERS.map((ms) => (
              <button
                key={ms.id}
                type="button"
                data-testid={`planetarium-meteor-${ms.id}`}
                onClick={() => {
                  audio.playUIClick();
                  setMeteorShower(ms.id);
                }}
                className={`px-2 py-1 rounded-lg border text-[11px] font-semibold cursor-pointer shrink-0 whitespace-nowrap ${
                  meteorShower === ms.id
                    ? 'bg-emerald-500/25 border-emerald-400/60 text-emerald-200'
                    : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                }`}
              >
                {isVi ? ms.vi : ms.en}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 flex-nowrap overflow-x-auto no-scrollbar sm:flex-wrap pb-0.5 sm:pb-0">
            <span className="text-[10px] font-mono text-slate-400 flex items-center space-x-1 mr-1 shrink-0">
              <Telescope className="w-3 h-3 text-cyan-400" />
              <span>{isVi ? 'KÍNH THIÊN VĂN:' : 'TELESCOPE:'}</span>
            </span>
            {TELESCOPE_TARGETS.map((tt) => (
              <button
                key={tt.id}
                type="button"
                data-testid={`planetarium-telescope-${tt.id}`}
                onClick={() => handleSelectTelescope(tt.id)}
                className={`px-2 py-1 rounded-lg border text-[11px] font-semibold cursor-pointer shrink-0 whitespace-nowrap ${
                  telescopeTarget === tt.id
                    ? 'bg-cyan-500/25 border-cyan-400/60 text-cyan-200'
                    : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                }`}
              >
                {isVi ? tt.vi : tt.en}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
