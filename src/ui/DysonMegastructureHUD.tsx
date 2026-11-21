import React from 'react';
import { Sun, Cylinder, X } from 'lucide-react';
import { useAppStore, type DysonMode } from '@/stores/useAppStore';
import { evaluateDysonSwarm } from '@/simulation/cosmic/Wave2Physics';
import { ModeOrchestrator } from '@/engine/navigation/ModeOrchestrator';
import { CameraManager } from '@/engine/camera/CameraManager';
import { AudioManager } from '@/engine/audio/AudioManager';
import { useTranslation } from '@/i18n';

const SUPERSCRIPTS: Record<string, string> = {
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
  '-': '⁻',
};

function toSuperscript(n: number): string {
  return String(n)
    .split('')
    .map((ch) => SUPERSCRIPTS[ch] ?? ch)
    .join('');
}

function formatWatts(w: number): string {
  const exp = Math.floor(Math.log10(Math.max(1, w)));
  const mant = (w / Math.pow(10, exp)).toFixed(2);
  return `${mant} × 10${toSuperscript(exp)} W`;
}

export const DysonMegastructureHUD: React.FC = () => {
  const { language } = useTranslation();
  const isVi = language === 'vi';

  const activeLab = useAppStore((s) => s.activeCosmicLab);
  const dysonMode = useAppStore((s) => s.dysonMode);
  const dysonCompletion = useAppStore((s) => s.dysonCompletion);

  const setDysonMode = useAppStore((s) => s.setDysonMode);
  const setDysonCompletion = useAppStore((s) => s.setDysonCompletion);

  if (activeLab !== 'dyson_megastructure') return null;

  const swarm = evaluateDysonSwarm(dysonCompletion);
  const audio = AudioManager.getInstance();

  const handleModeSwitch = (mode: DysonMode) => {
    audio.playUIClick();
    setDysonMode(mode);
    CameraManager.getInstance().setCosmicLabSubView('dyson_megastructure', mode);
  };

  return (
    <div
      data-testid="dyson-megastructure-hud"
      className="fixed inset-0 pointer-events-none z-40 flex flex-col justify-between p-3 sm:p-5 select-none"
    >
      {/* Top Bar */}
      <div className="flex items-start justify-between gap-2 w-full">
        <div className="pointer-events-auto glass-panel-glow rounded-2xl border border-amber-400/35 px-3 sm:px-3.5 py-2 sm:py-2.5 max-w-lg min-w-0">
          <div className="text-[10px] font-mono uppercase tracking-wider text-amber-300 flex items-center space-x-1.5">
            <Sun className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">
              {isVi ? 'SIÊU CÔNG TRÌNH VŨ TRỤ · THANG KARDASHEV' : 'COSMIC MEGASTRUCTURES · KARDASHEV SCALE'}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-0.5">
            <span className="text-xs sm:text-sm font-bold text-white">
              {dysonMode === 'dyson_swarm'
                ? isVi
                  ? 'Bầy Gương Năng Lượng Dyson'
                  : 'Dyson Solar Collector Swarm'
                : isVi
                ? 'Trụ Không Gian Xoay O’Neill (Trọng Lực 1g)'
                : 'O’Neill Rotating Habitat Cylinder (1g)'}
            </span>
            <span
              data-testid="dyson-kardashev"
              className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/45 text-amber-200 font-bold"
            >
              {isVi ? `Cấp ${swarm.kardashevScale.toFixed(2)}` : `Type ${swarm.kardashevScale.toFixed(2)}`}
            </span>
          </div>
        </div>

        <button
          type="button"
          data-testid="exit-dyson-btn"
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

      {/* Bottom Interactive Control Dock */}
      <div className="pointer-events-auto w-full max-w-3xl mx-auto glass-panel-glow rounded-2xl border border-amber-400/25 p-3 sm:p-4 space-y-2.5 shadow-2xl max-h-[44dvh] sm:max-h-none overflow-y-auto overscroll-contain touch-pan-y vip-scrollbar">
        {/* Mode Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              data-testid="dyson-mode-dyson_swarm"
              onClick={() => handleModeSwitch('dyson_swarm')}
              className={`px-3 py-1.5 rounded-xl border text-[11px] font-semibold flex items-center space-x-1.5 cursor-pointer ${
                dysonMode === 'dyson_swarm'
                  ? 'bg-amber-500/25 border-amber-400/60 text-amber-100'
                  : 'bg-white/5 border-white/10 text-slate-300'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span>{isVi ? 'Bầy Gương Dyson' : 'Dyson Swarm'}</span>
            </button>
            <button
              type="button"
              data-testid="dyson-mode-oneill_cylinder"
              onClick={() => handleModeSwitch('oneill_cylinder')}
              className={`px-3 py-1.5 rounded-xl border text-[11px] font-semibold flex items-center space-x-1.5 cursor-pointer ${
                dysonMode === 'oneill_cylinder'
                  ? 'bg-emerald-500/25 border-emerald-400/60 text-emerald-100'
                  : 'bg-white/5 border-white/10 text-slate-300'
              }`}
            >
              <Cylinder className="w-3.5 h-3.5" />
              <span>{isVi ? 'Trụ O’Neill 1g' : 'O’Neill Cylinder 1g'}</span>
            </button>
          </div>

          {dysonMode === 'dyson_swarm' && (
            <div className="flex items-center gap-1 font-mono text-[10px]">
              {[
                { v: 0, label: '0% (K0.73)' },
                { v: 0.45, label: '45%' },
                { v: 1, label: '100% (K2.00)' },
              ].map((p) => (
                <button
                  key={p.v}
                  type="button"
                  onClick={() => {
                    audio.playUIClick();
                    setDysonCompletion(p.v);
                  }}
                  className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-slate-200 cursor-pointer"
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {dysonMode === 'dyson_swarm' ? (
          <>
            {/* Dyson Swarm Telemetry Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 font-mono text-xs">
              <div className="rounded-xl bg-white/5 border border-white/10 px-2.5 py-1.5">
                <div className="text-[9px] text-slate-400">{isVi ? 'CÔNG SUẤT THU' : 'POWER HARVEST'}</div>
                <div className="font-bold text-amber-300 truncate">{formatWatts(swarm.capturedPowerWatts)}</div>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 px-2.5 py-1.5">
                <div className="text-[9px] text-slate-400">{isVi ? 'GƯƠNG ĐANG QUAY' : 'SOLAR SWARM'}</div>
                <div className="font-bold text-sky-300">{swarm.activeCollectors} / 720</div>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 px-2.5 py-1.5">
                <div className="text-[9px] text-slate-400">{isVi ? 'ÁNH SÁNG LỌT RA' : 'VISIBLE LEAK'}</div>
                <div className="font-bold text-yellow-200">{Math.round(swarm.visibleTransmission * 100)}%</div>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 px-2.5 py-1.5">
                <div className="text-[9px] text-slate-400">{isVi ? 'NHIỆT HỒNG NGOẠI' : 'IR WASTE HEAT'}</div>
                <div className="font-bold text-rose-300">{swarm.irWasteTempK} K</div>
              </div>
            </div>

            {/* Dyson Completion Slider */}
            <div>
              <div className="flex justify-between text-[10px] font-mono text-slate-300 mb-1">
                <span>{isVi ? 'TIẾN ĐỘ PHỦ BẦY GƯƠNG DYSON' : 'DYSON SWARM COMPLETION'}</span>
                <span className="text-amber-300 font-bold">{Math.round(dysonCompletion * 100)}%</span>
              </div>
              <input
                type="range"
                data-testid="dyson-completion-slider"
                min={0}
                max={1}
                step={0.01}
                value={dysonCompletion}
                onChange={(e) => setDysonCompletion(parseFloat(e.target.value))}
                aria-label={isVi ? 'Mức độ hoàn thiện bầy gương Dyson' : 'Dyson swarm completion'}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>
          </>
        ) : (
          <div className="space-y-2">
            {/* Contextual O'Neill Habitat Cylinder Telemetry */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 font-mono text-xs">
              <div className="rounded-xl bg-white/5 border border-white/10 px-2.5 py-1.5">
                <div className="text-[9px] text-slate-400">{isVi ? 'TRỌNG LỰC LY TÂM' : 'SPIN GRAVITY'}</div>
                <div className="font-bold text-emerald-300">1,00 g</div>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 px-2.5 py-1.5">
                <div className="text-[9px] text-slate-400">{isVi ? 'ĐƯỜNG KÍNH / DÀI' : 'DIAMETER / LEN'}</div>
                <div className="font-bold text-sky-300">8 km × 32 km</div>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 px-2.5 py-1.5">
                <div className="text-[9px] text-slate-400">{isVi ? 'TỐC ĐỘ QUAY' : 'ROTATION RATE'}</div>
                <div className="font-bold text-amber-300">0,47 RPM</div>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 px-2.5 py-1.5">
                <div className="text-[9px] text-slate-400">{isVi ? 'DÂN SỐ THIẾT KẾ' : 'CAPACITY'}</div>
                <div className="font-bold text-cyan-300">~10.000.000</div>
              </div>
            </div>
            <p className="text-[11px] text-slate-300 leading-snug">
              {isVi
                ? 'Thiết kế Island Three của Gerard K. O’Neill: 3 dải thung lũng sinh thái xen kẽ 3 cửa kính đón ánh nắng Mặt Trời tạo trọng lực nhân tạo 1g ở thành ngoài và 0g dọc trục trung tâm.'
                : 'Gerard K. O’Neill’s Island Three habitat: 3 lush valley strips alternating with 3 sunlit window panels generating 1g centrifugal gravity on the inner hull and 0g along the central docking axis.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
