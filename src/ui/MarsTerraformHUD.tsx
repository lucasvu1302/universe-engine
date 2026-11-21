import React, { useEffect, useState } from 'react';
import { Globe2, Sun, Factory, Sparkles, Play, Pause, X } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { evaluateMarsTerraform } from '@/simulation/cosmic/Wave2Physics';
import { ModeOrchestrator } from '@/engine/navigation/ModeOrchestrator';
import { AudioManager } from '@/engine/audio/AudioManager';
import { useTranslation } from '@/i18n';

export const MarsTerraformHUD: React.FC = () => {
  const { language } = useTranslation();
  const isVi = language === 'vi';

  const activeLab = useAppStore((s) => s.activeCosmicLab);
  const years = useAppStore((s) => s.terraformYears);
  const mirrors = useAppStore((s) => s.terraformMirrors);
  const ghg = useAppStore((s) => s.terraformGhg);
  const comets = useAppStore((s) => s.terraformComets);
  const isTabHidden = useAppStore((s) => s.isTabHidden);
  const reducedMotion = useAppStore((s) => s.reducedMotion);

  const setYears = useAppStore((s) => s.setTerraformYears);
  const setMirrors = useAppStore((s) => s.setTerraformMirrors);
  const setGhg = useAppStore((s) => s.setTerraformGhg);
  const setComets = useAppStore((s) => s.setTerraformComets);

  const [autoPlay, setAutoPlay] = useState(false);

  useEffect(() => {
    if (activeLab !== 'mars_terraform' || !autoPlay || isTabHidden || reducedMotion) return;
    const id = window.setInterval(() => {
      const cur = useAppStore.getState().terraformYears;
      const next = cur >= 1000 ? 0 : Math.min(1000, cur + 10);
      useAppStore.getState().setTerraformYears(next);
    }, 110);
    return () => window.clearInterval(id);
  }, [activeLab, autoPlay, isTabHidden, reducedMotion]);

  if (activeLab !== 'mars_terraform') return null;

  const tf = evaluateMarsTerraform({ years, mirrors, ghg, comets });
  const audio = AudioManager.getInstance();

  return (
    <div
      data-testid="mars-terraform-hud"
      className="fixed inset-0 pointer-events-none z-40 flex flex-col justify-between p-3 sm:p-5 select-none"
    >
      {/* Top Bar */}
      <div className="flex items-start justify-between gap-2 w-full">
        <div className="pointer-events-auto glass-panel-glow rounded-2xl border border-emerald-400/35 px-3 sm:px-3.5 py-2 sm:py-2.5 max-w-lg min-w-0">
          <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-300 flex items-center space-x-1.5">
            <Globe2 className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">
              {isVi ? 'MÔ PHỎNG KỸ THUẬT HÀNH TINH · 1.000 NĂM' : 'PLANETARY ENGINEERING · 1,000-YEAR SIM'}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-0.5">
            <span className="text-xs sm:text-sm font-bold text-white">
              {isVi ? 'Địa Cầu Hóa Sao Hỏa 3D' : 'Mars Terraforming Simulator'}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 font-bold">
              {isVi ? `Khả năng sống: ${tf.habitabilityPct}%` : `Habitability: ${tf.habitabilityPct}%`}
            </span>
          </div>
        </div>

        <button
          type="button"
          data-testid="exit-terraform-btn"
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

      {/* Bottom Interactive Dock */}
      <div className="pointer-events-auto w-full max-w-3xl mx-auto glass-panel-glow rounded-2xl border border-emerald-400/25 p-3 sm:p-4 space-y-2.5 shadow-2xl max-h-[44dvh] sm:max-h-none overflow-y-auto overscroll-contain touch-pan-y vip-scrollbar">
        {/* Telemetry Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 font-mono text-xs">
          <div className="rounded-xl bg-white/5 border border-white/10 px-2.5 py-1.5">
            <div className="text-[9px] sm:text-[10px] text-slate-400">{isVi ? 'ÁP SUẤT KHÍ QUYỂN' : 'PRESSURE'}</div>
            <div data-testid="terraform-pressure" className="font-bold text-sky-300">
              {tf.pressureMbar} mbar
            </div>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 px-2.5 py-1.5">
            <div className="text-[9px] sm:text-[10px] text-slate-400">{isVi ? 'NHIỆT ĐỘ TB' : 'MEAN TEMP'}</div>
            <div className="font-bold text-amber-300">
              {tf.tempC > 0 ? `+${tf.tempC}` : tf.tempC} °C
            </div>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 px-2.5 py-1.5">
            <div className="text-[9px] sm:text-[10px] text-slate-400">{isVi ? 'ĐẠI DƯƠNG LỎNG' : 'LIQUID OCEAN'}</div>
            <div className="font-bold text-cyan-300">{tf.oceanPct}%</div>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 px-2.5 py-1.5">
            <div className="text-[9px] sm:text-[10px] text-slate-400">{isVi ? 'OXY KHÍ QUYỂN' : 'OXYGEN O₂'}</div>
            <div className="font-bold text-emerald-300">{tf.oxygenPct}%</div>
          </div>
        </div>

        {/* 0..1000 Year Timeline Scrubber */}
        <div>
          <div className="flex justify-between text-[10px] font-mono text-slate-300 mb-1">
            <span>{isVi ? 'DÒNG THỜI GIAN ĐỊA CẦU HÓA' : 'TERRAFORMING TIMELINE'}</span>
            <span className="text-emerald-300 font-bold">
              {isVi ? `Năm +${Math.round(tf.years)}` : `Year +${Math.round(tf.years)}`}
            </span>
          </div>
          <input
            type="range"
            data-testid="terraform-years-slider"
            min={0}
            max={1000}
            step={10}
            value={years}
            onChange={(e) => setYears(parseFloat(e.target.value))}
            aria-label={isVi ? 'Số năm địa cầu hóa Sao Hỏa' : 'Mars terraforming years'}
            className="w-full accent-emerald-400 cursor-pointer"
          />
        </div>

        {/* 3 Engineering Levers + Milestones */}
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                audio.playUIClick();
                setMirrors(!mirrors);
              }}
              className={`px-2.5 py-1 rounded-xl border text-[11px] font-semibold flex items-center space-x-1.5 cursor-pointer ${
                mirrors
                  ? 'bg-amber-500/25 border-amber-400/55 text-amber-200'
                  : 'bg-white/5 border-white/10 text-slate-400'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span>{isVi ? 'Gương Quỹ Đạo' : 'Orbital Mirrors'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                audio.playUIClick();
                setGhg(!ghg);
              }}
              className={`px-2.5 py-1 rounded-xl border text-[11px] font-semibold flex items-center space-x-1.5 cursor-pointer ${
                ghg
                  ? 'bg-emerald-500/25 border-emerald-400/55 text-emerald-200'
                  : 'bg-white/5 border-white/10 text-slate-400'
              }`}
            >
              <Factory className="w-3.5 h-3.5" />
              <span>{isVi ? 'Nhà Máy Khí Nhà Kính' : 'GHG Factories'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                audio.playUIClick();
                setComets(!comets);
              }}
              className={`px-2.5 py-1 rounded-xl border text-[11px] font-semibold flex items-center space-x-1.5 cursor-pointer ${
                comets
                  ? 'bg-cyan-500/25 border-cyan-400/55 text-cyan-200'
                  : 'bg-white/5 border-white/10 text-slate-400'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isVi ? 'Sao Chổi Băng' : 'Ice Comets'}</span>
            </button>
          </div>

          <div className="flex items-center gap-1 font-mono text-[10px]">
            <button
              type="button"
              onClick={() => {
                audio.playUIClick();
                setAutoPlay((p) => !p);
              }}
              aria-label={autoPlay ? (isVi ? 'Tạm dừng dòng thời gian' : 'Pause timeline') : isVi ? 'Chạy tự động 1.000 năm' : 'Auto-play timeline'}
              className={`px-2 py-1 rounded-lg border flex items-center space-x-1 cursor-pointer ${
                autoPlay
                  ? 'bg-emerald-500/25 border-emerald-400/60 text-emerald-200'
                  : 'bg-white/5 hover:bg-white/15 border-white/10 text-slate-200'
              }`}
            >
              {autoPlay ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              <span>{autoPlay ? (isVi ? 'Dừng' : 'Pause') : isVi ? 'Chạy' : 'Play'}</span>
            </button>
            {[
              { y: 0, label: isVi ? '0 năm' : '0 yr' },
              { y: 450, label: isVi ? '450 năm' : '450 yr' },
              { y: 1000, label: isVi ? '1.000 năm' : '1,000 yr' },
            ].map((m) => {
              const active = Math.round(years) === m.y;
              return (
                <button
                  key={m.y}
                  type="button"
                  onClick={() => {
                    audio.playUIClick();
                    setAutoPlay(false);
                    setYears(m.y);
                  }}
                  className={`px-2 py-1 rounded-lg border cursor-pointer ${
                    active
                      ? 'bg-emerald-500/25 border-emerald-400/60 text-emerald-100 font-bold'
                      : 'bg-white/5 hover:bg-white/15 border-white/10 text-slate-200'
                  }`}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
