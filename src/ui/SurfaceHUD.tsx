import React from 'react';
import { ArrowUpCircle, Compass, Wind, Gauge, Thermometer, ShieldAlert } from 'lucide-react';
import { AudioManager } from '@/engine/audio/AudioManager';
import { useTranslation } from '@/i18n';
import { ActiveSurface } from '@/stores/useAppStore';

interface SurfaceHUDProps {
  location: Exclude<ActiveSurface, 'none'>;
  onTakeoff: () => void;
}

export const SurfaceHUD: React.FC<SurfaceHUDProps> = ({ location, onTakeoff }) => {
  const { t, language } = useTranslation();
  const isVi = language === 'vi';
  const audio = AudioManager.getInstance();

  const meta = {
    mars: {
      dot: 'bg-orange-500',
      title: t('surface.marsJezeroTitle'),
      sub: t('surface.marsJezeroSub'),
      altitude: '2.4 m',
      pressure: '0.006 atm (CO₂)',
      temp: '-63 °C',
      gravity: '0.38 g',
    },
    moon: {
      dot: 'bg-slate-300',
      title: t('surface.moonApolloTitle'),
      sub: t('surface.moonApolloSub'),
      altitude: '2.4 m',
      pressure: isVi ? '0.000 atm (Chân không)' : '0.000 atm (Vacuum)',
      temp: '-20 °C',
      gravity: '0.16 g',
    },
    europa: {
      dot: 'bg-cyan-400',
      title: isVi ? 'EUROPA: ĐỒNG BẰNG BĂNG CONAMARA CHAOS' : 'EUROPA: CONAMARA CHAOS ICE PLAINS',
      sub: isVi ? 'Vỏ Băng Đại Dương Ngầm & Mạch Phun Băng' : 'Subsurface Ocean Ice Shell & Cryogeysers',
      altitude: '2.2 m',
      pressure: '10⁻¹² atm (O₂)',
      temp: '-171 °C',
      gravity: '0.134 g',
    },
    titan: {
      dot: 'bg-amber-500',
      title: isVi ? 'TITAN: BỜ HỒ METAN KRAKEN MARE' : 'TITAN: KRAKEN MARE SHORELINE',
      sub: isVi ? 'Khí Quyển Nitơ-Metan Dày Đặc & Tàu Huygens' : 'Dense N₂-CH₄ Haze & Huygens Landing Site',
      altitude: '1.8 m',
      pressure: '1.45 atm N₂-CH₄',
      temp: '-179 °C',
      gravity: '0.138 g',
    },
  }[location];

  const handleTakeoff = () => {
    audio.playWarpDrive();
    onTakeoff();
  };

  return (
    <div
      data-testid={`surface-hud-${location}`}
      className="fixed inset-0 pointer-events-none z-40 flex flex-col justify-between p-4 md:p-6 select-none font-mono"
    >
      {/* Top Telemetry Header */}
      <div className="flex items-center justify-between w-full gap-2">
        <div className="flex items-center space-x-2.5 sm:space-x-3 pointer-events-auto bg-black/70 backdrop-blur-md px-3 sm:px-4 py-1.5 sm:py-2 rounded-2xl border border-white/10 shadow-xl min-w-0">
          <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full animate-pulse shrink-0 ${meta.dot}`} />
          <div className="min-w-0">
            <div className="text-[11px] sm:text-xs text-slate-400 font-medium truncate">{meta.title}</div>
            <div className="text-xs sm:text-sm md:text-base font-bold text-white tracking-wider truncate">
              {meta.sub}
            </div>
          </div>
        </div>

        {/* Take off Button */}
        <button
          type="button"
          data-testid="surface-takeoff-btn"
          onClick={handleTakeoff}
          className="pointer-events-auto flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-2 rounded-2xl bg-sky-500/80 hover:bg-sky-500 text-white font-semibold shadow-lg shadow-sky-500/30 border border-sky-400/40 transition-all cursor-pointer group shrink-0"
          title={t('surface.ascendOrbit')}
        >
          <ArrowUpCircle className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
          <span className="text-xs hidden sm:inline">{t('surface.ascendOrbit')}</span>
          <span className="text-xs sm:hidden">{isVi ? 'Cất Cánh' : 'Ascend'}</span>
        </button>
      </div>

      {/* Bottom Environmental Diagnostics Grid */}
      <div className="flex flex-wrap items-center justify-between gap-3 w-full">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pointer-events-auto bg-black/70 backdrop-blur-md px-3.5 sm:px-4 py-2.5 rounded-2xl border border-white/10 text-xs">
          <div className="flex items-center space-x-1.5 text-slate-300">
            <Gauge className="w-3.5 h-3.5 text-sky-400" />
            <span>
              {t('surface.altitude')}: <strong className="text-white">{meta.altitude}</strong>
            </span>
          </div>
          <div className="flex items-center space-x-1.5 text-slate-300">
            <Wind className="w-3.5 h-3.5 text-amber-400" />
            <span>
              {t('surface.atmosphericPressure')}: <strong className="text-white">{meta.pressure}</strong>
            </span>
          </div>
          <div className="flex items-center space-x-1.5 text-slate-300">
            <Thermometer className="w-3.5 h-3.5 text-rose-400" />
            <span>
              {t('surface.surfaceTemp')}: <strong className="text-white">{meta.temp}</strong>
            </span>
          </div>
          <div className="flex items-center space-x-1.5 text-slate-300">
            <Compass className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              {t('targetHud.gravity')}: <strong className="text-white">{meta.gravity}</strong>
            </span>
          </div>
        </div>

        <div className="hidden md:flex items-center space-x-2 text-[11px] text-slate-400 bg-black/40 px-3 py-1.5 rounded-xl border border-white/5">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
          <span>
            {t('common.status')}: {isVi ? 'ỔN ĐỊNH' : 'NOMINAL'}
          </span>
        </div>
      </div>
    </div>
  );
};
