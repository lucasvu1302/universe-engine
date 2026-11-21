import React from 'react';
import { Satellite, AlertTriangle, Play, Pause, RotateCcw, X } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { evaluateKesslerCascade } from '@/simulation/cosmic/Wave2Physics';
import { ModeOrchestrator } from '@/engine/navigation/ModeOrchestrator';
import { AudioManager } from '@/engine/audio/AudioManager';
import { useTranslation } from '@/i18n';

export const KesslerOrbitalHUD: React.FC = () => {
  const { language } = useTranslation();
  const isVi = language === 'vi';

  const activeLab = useAppStore((s) => s.activeCosmicLab);
  const cascadeLevel = useAppStore((s) => s.kesslerCascadeLevel);
  const triggered = useAppStore((s) => s.kesslerTriggered);
  const playing = useAppStore((s) => s.kesslerPlaying);

  const setCascadeLevel = useAppStore((s) => s.setKesslerCascadeLevel);
  const setTriggered = useAppStore((s) => s.setKesslerTriggered);
  const setPlaying = useAppStore((s) => s.setKesslerPlaying);

  if (activeLab !== 'kessler_leo') return null;

  const state = evaluateKesslerCascade(cascadeLevel, triggered);
  const audio = AudioManager.getInstance();

  const riskLabel =
    state.issRiskLevel === 'CRITICAL'
      ? isVi
        ? 'NGUY HIỂM'
        : 'CRITICAL'
      : state.issRiskLevel === 'ELEVATED'
      ? isVi
        ? 'CẢNH BÁO'
        : 'ELEVATED'
      : isVi
      ? 'THẤP'
      : 'LOW';

  const riskClass =
    state.issRiskLevel === 'CRITICAL'
      ? 'bg-rose-500/25 border-rose-400/60 text-rose-200'
      : state.issRiskLevel === 'ELEVATED'
      ? 'bg-amber-500/25 border-amber-400/55 text-amber-200'
      : 'bg-emerald-500/20 border-emerald-400/45 text-emerald-200';

  return (
    <div
      data-testid="kessler-orbital-hud"
      className="fixed inset-0 pointer-events-none z-40 flex flex-col justify-between p-3 sm:p-5 select-none"
    >
      {/* Top Bar */}
      <div className="flex items-start justify-between gap-2 w-full">
        <div className="pointer-events-auto glass-panel-glow rounded-2xl border border-sky-400/35 px-3 sm:px-3.5 py-2 sm:py-2.5 max-w-lg min-w-0">
          <div className="text-[10px] font-mono uppercase tracking-wider text-sky-300 flex items-center space-x-1.5">
            <Satellite className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">
              {isVi ? 'BẢN ĐỒ QUỸ ĐẠO TRÁI ĐẤT · LEO / MEO / GEO' : 'EARTH ORBITAL TRAFFIC · LEO / MEO / GEO'}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-0.5">
            <span className="text-xs sm:text-sm font-bold text-white">
              {isVi ? 'Hội Chứng Kessler & 2.200 Vệ Tinh' : 'Kessler Syndrome & 2,200 Satellites'}
            </span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-bold ${riskClass}`}>
              ISS: {riskLabel}
            </span>
          </div>
        </div>

        <button
          type="button"
          data-testid="exit-kessler-btn"
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
      <div className="pointer-events-auto w-full max-w-3xl mx-auto glass-panel-glow rounded-2xl border border-sky-400/25 p-3 sm:p-4 space-y-2.5 shadow-2xl max-h-[44dvh] sm:max-h-none overflow-y-auto overscroll-contain touch-pan-y vip-scrollbar">
        {/* Legend + Telemetry */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 font-mono text-xs">
          <div className="rounded-xl bg-white/5 border border-white/10 px-2.5 py-1.5">
            <div className="text-[9px] text-slate-400">{isVi ? 'VỆ TINH HOẠT ĐỘNG' : 'ACTIVE SATELLITES'}</div>
            <div className="font-bold text-sky-300">{state.activeSatellites.toLocaleString(isVi ? 'vi-VN' : 'en-US')}</div>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 px-2.5 py-1.5">
            <div className="text-[9px] text-slate-400">{isVi ? 'MẢNH VỠ (>1 CM)' : 'DEBRIS (>1 CM)'}</div>
            <div className="font-bold text-orange-300">{state.debrisCount.toLocaleString(isVi ? 'vi-VN' : 'en-US')}</div>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 px-2.5 py-1.5">
            <div className="text-[9px] text-slate-400">{isVi ? 'KHÓA CỬA PHÓNG' : 'LAUNCH LOCKOUT'}</div>
            <div className={`font-bold ${state.launchLockoutPct >= 50 ? 'text-rose-300' : 'text-amber-300'}`}>
              {state.launchLockoutPct}%
            </div>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 px-2.5 py-1.5">
            <div className="text-[9px] text-slate-400">{isVi ? 'TẦNG QUỸ ĐẠO' : 'ORBITAL BANDS'}</div>
            <div className="flex items-center gap-2 text-[10px] mt-0.5">
              <span className="text-sky-300">● LEO</span>
              <span className="text-amber-300">● MEO</span>
              <span className="text-emerald-300">● GEO</span>
            </div>
          </div>
        </div>

        {/* Cascade Intensity Slider + Trigger Button */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
          <div className="flex-1 min-w-0">
            <div className="flex justify-between text-[10px] font-mono text-slate-300 mb-1">
              <span>{isVi ? 'CƯỜNG ĐỘ PHẢN ỨNG DÂY CHUYỀN KESSLER' : 'KESSLER CASCADE INTENSITY'}</span>
              <span className="text-orange-300 font-bold">{Math.round(cascadeLevel * 100)}%</span>
            </div>
            <input
              type="range"
              data-testid="kessler-cascade-slider"
              min={0}
              max={1}
              step={0.02}
              value={cascadeLevel}
              onChange={(e) => setCascadeLevel(parseFloat(e.target.value))}
              aria-label={isVi ? 'Cường độ chuỗi va chạm Kessler' : 'Kessler debris cascade level'}
              className="w-full accent-orange-400 cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              data-testid="kessler-trigger-btn"
              onClick={() => {
                audio.playDefenseImpact();
                setTriggered(true);
                if (cascadeLevel < 0.65) {
                  setCascadeLevel(0.75);
                }
              }}
              className="px-3 py-1.5 rounded-xl bg-rose-500/30 hover:bg-rose-500/45 border border-rose-400/60 text-rose-50 text-xs font-bold flex items-center space-x-1.5 cursor-pointer"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{triggered ? (isVi ? 'Đang Lan Truyền' : 'Cascading') : isVi ? 'Kích Hoạt Kessler' : 'Trigger Kessler'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                audio.playUIClick();
                setTriggered(false);
                setCascadeLevel(0.2);
              }}
              aria-label={isVi ? 'Đặt lại quỹ đạo sạch' : 'Reset orbital traffic'}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-slate-200 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                audio.playUIClick();
                setPlaying(!playing);
              }}
              aria-label={playing ? (isVi ? 'Tạm dừng vệ tinh' : 'Pause satellites') : isVi ? 'Tiếp tục vệ tinh' : 'Resume satellites'}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-white cursor-pointer"
            >
              {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
