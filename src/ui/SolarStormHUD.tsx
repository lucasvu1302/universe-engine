import React from 'react';
import { Flame, Shield, Sparkles, X, Radio, Globe2, Orbit } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { evaluateSolarStorm } from '@/simulation/cosmic/CosmicPhysics';
import { ModeOrchestrator } from '@/engine/navigation/ModeOrchestrator';
import { CameraManager } from '@/engine/camera/CameraManager';
import { AudioManager } from '@/engine/audio/AudioManager';
import { useTranslation } from '@/i18n';

const STORM_PRESETS = [
  { label: 'G1', value: 0.22 },
  { label: 'G2', value: 0.42 },
  { label: 'G3', value: 0.62 },
  { label: 'G4', value: 0.8 },
  { label: 'G5', value: 1.0 },
] as const;

export const SolarStormHUD: React.FC = () => {
  const { language } = useTranslation();
  const isVi = language === 'vi';

  const active = useAppStore((s) => s.solarStormActive);
  const intensity = useAppStore((s) => s.solarStormIntensity);
  const setIntensity = useAppStore((s) => s.setSolarStormIntensity);
  const triggerCme = useAppStore((s) => s.triggerSolarStormCme);

  if (!active) return null;

  const telemetry = evaluateSolarStorm(intensity);
  const cam = CameraManager.getInstance();
  const audio = AudioManager.getInstance();

  const handleFocus = (id: 'earth' | 'iss') => {
    audio.playUIClick();
    useAppStore.getState().setTargetId(id);
    cam.focusPlanet(id);
  };

  return (
    <aside
      data-testid="solar-storm-hud"
      onWheel={(e) => e.stopPropagation()}
      className="fixed inset-x-2.5 bottom-2.5 sm:inset-x-auto sm:right-4 sm:top-16 sm:bottom-20 z-40 sm:w-[330px] max-h-[46dvh] sm:max-h-none pointer-events-auto flex flex-col justify-start overflow-y-auto overscroll-contain touch-pan-y vip-scrollbar"
    >
      <div className="glass-panel-glow rounded-2xl border border-emerald-400/35 p-3.5 sm:p-4 shadow-2xl space-y-3 text-slate-100">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 border-b border-white/10 pb-2.5">
          <div className="min-w-0">
            <div className="flex items-center space-x-1.5 text-[10px] font-mono uppercase tracking-wider text-emerald-300">
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>{isVi ? 'THỜI TIẾT KHÔNG GIAN 3D' : '3D SPACE WEATHER'}</span>
            </div>
            <h2 className="text-sm font-bold text-white leading-snug mt-0.5">
              {isVi ? 'Bão Mặt Trời, Từ Quyển & Cực Quang' : 'Solar Storm, Magnetosphere & Aurora'}
            </h2>
          </div>
          <button
            type="button"
            data-testid="exit-solar-storm-btn"
            onClick={() => {
              audio.playUIClick();
              ModeOrchestrator.getInstance().toggleSolarStorm(false);
            }}
            aria-label={isVi ? 'Tắt Bão Mặt Trời' : 'Close Solar Storm'}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Telemetry Grid */}
        <div className="grid grid-cols-2 gap-2 font-mono text-xs">
          <div className="rounded-xl bg-white/5 border border-white/10 px-2.5 py-2">
            <div className="text-[10px] text-slate-400">{isVi ? 'CẤP BÃO NOAA' : 'NOAA SCALE'}</div>
            <div
              data-testid="solar-storm-level"
              className="text-base font-bold text-amber-300 flex items-center justify-between"
            >
              <span>{telemetry.stormLevel}</span>
              <span data-testid="solar-storm-kp" className="text-xs text-emerald-300">
                Kp {telemetry.kpIndex}
              </span>
            </div>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 px-2.5 py-2">
            <div className="text-[10px] text-slate-400">{isVi ? 'GIÓ MẶT TRỜI' : 'SOLAR WIND'}</div>
            <div data-testid="solar-storm-wind" className="text-base font-bold text-cyan-300">
              {telemetry.solarWindKms} km/s
            </div>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 px-2.5 py-1.5">
            <div className="text-[10px] text-slate-400">{isVi ? 'VÀNH CỰC QUANG' : 'AURORA OVAL'}</div>
            <div className="text-xs font-semibold text-emerald-200">±{telemetry.auroraOvalLatDeg}°</div>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 px-2.5 py-1.5">
            <div className="text-[10px] text-slate-400">{isVi ? 'SÓNG XUNG KÍCH' : 'BOW SHOCK'}</div>
            <div className="text-xs font-semibold text-sky-200">{telemetry.bowShockStandoffRe} R⊕</div>
          </div>
        </div>

        {/* G1–G5 Intensity Selector */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-300 flex items-center space-x-1">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isVi ? 'Cường độ Bão Từ' : 'Geomagnetic Intensity'}</span>
            </span>
            <span className="font-mono text-emerald-300 font-bold">
              {Math.round(telemetry.intensity * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={0.2}
            max={1.0}
            step={0.02}
            value={intensity}
            onChange={(e) => setIntensity(parseFloat(e.target.value))}
            aria-label={isVi ? 'Cường độ bão Mặt Trời' : 'Solar storm intensity'}
            className="w-full accent-emerald-400 cursor-pointer"
          />
          <div className="grid grid-cols-5 gap-1">
            {STORM_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                data-testid={`storm-preset-${preset.label}`}
                onClick={() => {
                  audio.playUIClick();
                  setIntensity(preset.value);
                }}
                className={`py-1 rounded-lg text-[11px] font-mono font-bold border transition-colors cursor-pointer ${
                  telemetry.stormLevel === preset.label
                    ? 'bg-emerald-500/30 border-emerald-400/60 text-emerald-200'
                    : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Trigger CME Burst */}
        <button
          type="button"
          data-testid="trigger-cme-btn"
          onClick={() => {
            triggerCme();
            audio.playSolarStormPulse();
          }}
          className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500/80 to-orange-500/80 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-bold flex items-center justify-center space-x-2 shadow-lg shadow-orange-500/20 cursor-pointer transition-all"
        >
          <Flame className="w-4 h-4" />
          <span>{isVi ? 'Phóng Đợt Bão Plasma CME Mới' : 'Trigger Fresh CME Plasma Burst'}</span>
        </button>

        {/* Quick Camera Angles: Earth & ISS */}
        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/10">
          <button
            type="button"
            data-testid="storm-focus-earth"
            onClick={() => handleFocus('earth')}
            className="py-1.5 px-2.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/35 border border-sky-400/35 text-sky-200 text-xs font-semibold flex items-center justify-center space-x-1.5 cursor-pointer"
          >
            <Globe2 className="w-3.5 h-3.5" />
            <span>{isVi ? 'Ngắm Trái Đất' : 'Focus Earth'}</span>
          </button>
          <button
            type="button"
            data-testid="storm-focus-iss"
            onClick={() => handleFocus('iss')}
            className="py-1.5 px-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-400/35 text-emerald-200 text-xs font-semibold flex items-center justify-center space-x-1.5 cursor-pointer"
          >
            <Orbit className="w-3.5 h-3.5" />
            <span>{isVi ? 'Ngắm Từ ISS' : 'View from ISS'}</span>
          </button>
        </div>

        <p className="text-[11px] text-slate-400 leading-relaxed flex items-start space-x-1.5">
          <Radio className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
          <span>
            {isVi
              ? 'Từ quyển Trái Đất bẻ lệch sóng xung kích plasma Mặt Trời và dẫn hạt tích điện xuống hai cực tạo màn cực quang xanh lục - tím.'
              : 'Earth’s dipole magnetosphere deflects CME plasma at the bow shock and funnels charged particles into polar emerald-violet auroras.'}
          </span>
        </p>
      </div>
    </aside>
  );
};
