import React from 'react';
import { ShieldAlert, Rocket, Magnet, Zap, RotateCcw, X } from 'lucide-react';
import { useAppStore, type DefenseMethodId } from '@/stores/useAppStore';
import { evaluatePlanetaryDefense } from '@/simulation/cosmic/Wave2Physics';
import { ModeOrchestrator } from '@/engine/navigation/ModeOrchestrator';
import { AudioManager } from '@/engine/audio/AudioManager';
import { useTranslation } from '@/i18n';

const METHODS: { id: DefenseMethodId; vi: string; en: string; icon: React.ReactNode }[] = [
  { id: 'kinetic_dart', vi: 'Đâm Động Năng DART', en: 'DART Kinetic Impactor', icon: <Rocket className="w-3.5 h-3.5" /> },
  { id: 'gravity_tractor', vi: 'Tàu Kéo Hấp Dẫn', en: 'Gravity Tractor', icon: <Magnet className="w-3.5 h-3.5" /> },
  { id: 'laser_ablation', vi: 'Bốc Hơi Bằng Laser', en: 'Laser Ablation', icon: <Zap className="w-3.5 h-3.5" /> },
];

export const PlanetaryDefenseHUD: React.FC = () => {
  const { language } = useTranslation();
  const isVi = language === 'vi';

  const activeLab = useAppStore((s) => s.activeCosmicLab);
  const method = useAppStore((s) => s.defenseMethod);
  const leadDays = useAppStore((s) => s.defenseLeadDays);
  const launched = useAppStore((s) => s.defenseLaunched);

  const setMethod = useAppStore((s) => s.setDefenseMethod);
  const setLeadDays = useAppStore((s) => s.setDefenseLeadDays);
  const setLaunched = useAppStore((s) => s.setDefenseLaunched);
  const resetDefense = useAppStore((s) => s.resetDefense);

  if (activeLab !== 'planetary_defense') return null;

  const evalState = evaluatePlanetaryDefense(method, leadDays);
  const isSafe = evalState.outcome === 'SAFE';
  const audio = AudioManager.getInstance();

  return (
    <div
      data-testid="planetary-defense-hud"
      className="fixed inset-0 pointer-events-none z-40 flex flex-col justify-between p-3 sm:p-5 select-none"
    >
      {/* Top Bar */}
      <div className="flex items-start justify-between gap-2 w-full">
        <div className="pointer-events-auto glass-panel-glow rounded-2xl border border-rose-400/35 px-3 sm:px-3.5 py-2 sm:py-2.5 max-w-lg min-w-0">
          <div className="text-[10px] font-mono uppercase tracking-wider text-rose-300 flex items-center space-x-1.5">
            <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">
              {isVi ? 'PHÒNG THỦ HÀNH TINH · TIỂU HÀNH TINH 99942 APOPHIS' : 'PLANETARY DEFENSE · 99942 APOPHIS INTERCEPT'}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-0.5">
            <span className="text-xs sm:text-sm font-bold text-white">
              {isVi ? 'Chiến Dịch Làm Chệch Hướng Thiên Thạch' : 'Asteroid Deflection War Room'}
            </span>
            <span
              data-testid="defense-outcome"
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-bold ${
                isSafe
                  ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200'
                  : 'bg-rose-500/25 border-rose-400/60 text-rose-200'
              }`}
            >
              {isSafe
                ? isVi
                  ? 'AN TOÀN · ĐÃ CHỆCH HƯỚNG'
                  : 'SAFE · DEFLECTED'
                : isVi
                ? 'NGUY CƠ VA CHẠM'
                : 'IMPACT WARNING'}
            </span>
          </div>
        </div>

        <button
          type="button"
          data-testid="exit-defense-btn"
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
      <div className="pointer-events-auto w-full max-w-3xl mx-auto glass-panel-glow rounded-2xl border border-rose-400/25 p-3 sm:p-4 space-y-2.5 shadow-2xl max-h-[45dvh] sm:max-h-none overflow-y-auto overscroll-contain touch-pan-y vip-scrollbar">
        {/* Telemetry Cards */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 font-mono text-[10px] sm:text-xs">
          <div className="rounded-xl bg-white/5 border border-white/10 px-2 sm:px-2.5 py-1.5 min-w-0">
            <div className="text-[8px] sm:text-[10px] text-slate-400 truncate">{isVi ? 'KHOẢNG CÁCH TRÁNH' : 'MISS DISTANCE'}</div>
            <div className={`font-bold truncate ${isSafe ? 'text-emerald-300' : 'text-rose-300'}`}>
              {evalState.missDistanceKm.toLocaleString(isVi ? 'vi-VN' : 'en-US')} km
            </div>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 px-2 sm:px-2.5 py-1.5 min-w-0">
            <div className="text-[8px] sm:text-[10px] text-slate-400 truncate">{isVi ? 'XUNG ĐỘNG Δv' : 'IMPULSE Δv'}</div>
            <div className="font-bold text-amber-300 truncate">{evalState.deltaVMms} mm/s</div>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 px-2 sm:px-2.5 py-1.5 min-w-0">
            <div className="text-[8px] sm:text-[10px] text-slate-400 truncate">{isVi ? 'ĐÁNH CHẶN SỚM' : 'LEAD TIME'}</div>
            <div className="font-bold text-sky-300 truncate">
              {Math.round(evalState.leadDays)} {isVi ? 'ngày' : 'days'}
            </div>
          </div>
        </div>

        {/* Strategy Selector */}
        <div className="flex flex-wrap items-center gap-1.5">
          {METHODS.map((m) => {
            const active = method === m.id;
            return (
              <button
                key={m.id}
                type="button"
                data-testid={`defense-method-${m.id}`}
                onClick={() => {
                  audio.playUIClick();
                  setMethod(m.id);
                }}
                className={`px-2.5 py-1 rounded-xl border text-[11px] font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
                  active
                    ? 'bg-rose-500/25 border-rose-400/60 text-rose-100'
                    : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                }`}
              >
                {m.icon}
                <span>{isVi ? m.vi : m.en}</span>
              </button>
            );
          })}
        </div>

        {/* Lead Time Slider + Launch / Reset */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
          <div className="flex-1 min-w-0">
            <div className="flex justify-between text-[10px] font-mono text-slate-300 mb-1">
              <span>{isVi ? 'ĐÁNH CHẶN TRƯỚC KHI VA CHẠM (10 – 365 NGÀY)' : 'INTERCEPT LEAD TIME (10 – 365 DAYS)'}</span>
              <span className="text-sky-300 font-bold">
                T-{Math.round(leadDays)} {isVi ? 'ngày' : 'd'}
              </span>
            </div>
            <input
              type="range"
              data-testid="defense-lead-slider"
              min={10}
              max={365}
              step={5}
              value={leadDays}
              onChange={(e) => setLeadDays(parseFloat(e.target.value))}
              aria-label={isVi ? 'Số ngày đánh chặn trước khi thiên thạch tới' : 'Lead days before asteroid impact'}
              className="w-full accent-rose-400 cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              data-testid="defense-launch-btn"
              onClick={() => {
                audio.playUIClick();
                setLaunched(true);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-rose-500/30 hover:bg-rose-500/45 border border-rose-400/60 text-rose-50 text-xs font-bold flex items-center space-x-1.5 cursor-pointer"
            >
              <Rocket className="w-3.5 h-3.5" />
              <span>{launched ? (isVi ? 'Đang Đánh Chặn' : 'Intercepting') : isVi ? 'Phóng Đánh Chặn' : 'Launch Intercept'}</span>
            </button>
            <button
              type="button"
              data-testid="defense-reset-btn"
              onClick={() => {
                audio.playUIClick();
                resetDefense();
              }}
              aria-label={isVi ? 'Đặt lại mô phỏng' : 'Reset intercept'}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-slate-200 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
