import React, { useEffect } from 'react';
import { EclipseViewMode, useAppStore } from '@/stores/useAppStore';
import { evaluateEclipse } from '@/simulation/cosmic/CosmicPhysics';
import { ModeOrchestrator } from '@/engine/navigation/ModeOrchestrator';
import { AudioManager } from '@/engine/audio/AudioManager';
import { useTranslation } from '@/i18n';
import { Play, Pause, X, Sun, Moon, Orbit } from 'lucide-react';

const ECLIPSE_MODES: Array<{ id: EclipseViewMode; vi: string; en: string }> = [
  { id: 'solar_ground', vi: 'Nhật Thực Toàn Phần', en: 'Total Solar Eclipse' },
  { id: 'solar_orbit', vi: 'Bóng Umbra Quỹ Đạo', en: 'Orbital Umbra Shadow' },
  { id: 'lunar_blood', vi: 'Nguyệt Thực Trăng Máu', en: 'Total Blood Moon' },
];

export const EclipseHUD: React.FC = () => {
  const { language } = useTranslation();
  const isVi = language === 'vi';

  const activeLab = useAppStore((s) => s.activeCosmicLab);
  const mode = useAppStore((s) => s.eclipseMode);
  const phase = useAppStore((s) => s.eclipsePhase);
  const playing = useAppStore((s) => s.eclipsePlaying);
  const isTabHidden = useAppStore((s) => s.isTabHidden);
  const reducedMotion = useAppStore((s) => s.reducedMotion);
  const setMode = useAppStore((s) => s.setEclipseMode);
  const setPhase = useAppStore((s) => s.setEclipsePhase);
  const setPlaying = useAppStore((s) => s.setEclipsePlaying);

  useEffect(() => {
    if (activeLab !== 'eclipse' || !playing || isTabHidden || reducedMotion) return;
    const id = window.setInterval(() => {
      const cur = useAppStore.getState().eclipsePhase;
      const next = cur + 0.01;
      useAppStore.getState().setEclipsePhase(next > 1 ? 0 : next);
    }, 80);
    return () => window.clearInterval(id);
  }, [activeLab, playing, isTabHidden, reducedMotion]);

  if (activeLab !== 'eclipse') return null;

  const state = evaluateEclipse(mode, phase);
  const audio = AudioManager.getInstance();

  const statusLabel =
    mode === 'lunar_blood'
      ? state.isBloodMoon
        ? isVi
          ? 'TRĂNG MÁU TOÀN PHẦN (RAYLEIGH)'
          : 'TOTAL BLOOD MOON (RAYLEIGH)'
        : isVi
        ? 'NGUYỆT THỰC MỘT PHẦN'
        : 'PARTIAL LUNAR ECLIPSE'
      : mode === 'solar_orbit'
      ? state.umbraStrength > 0.65
        ? isVi
          ? 'BÓNG TỐI UMBRA QUÉT QUA TRÁI ĐẤT'
          : 'UMBRA CORE SWEEPING EARTH'
        : isVi
        ? 'VÙNG NỬA TỐI PENUMBRA'
        : 'PENUMBRA SHADOW TRANSIT'
      : state.diamondRingIntensity > 0.55
      ? isVi
        ? 'HIỆU ỨNG NHẪN KIM CƯƠNG!'
        : 'DIAMOND RING EFFECT!'
      : state.isTotality
      ? isVi
        ? 'NHẬT THỰC TOÀN PHẦN · NHẬT HOA'
        : 'SOLAR TOTALITY · CORONA'
      : isVi
      ? 'NHẬT THỰC MỘT PHẦN'
      : 'PARTIAL SOLAR ECLIPSE';

  return (
    <div
      data-testid="eclipse-hud"
      className="fixed inset-0 pointer-events-none z-40 flex flex-col justify-between p-3 sm:p-5 select-none"
    >
      {/* Top Header Bar */}
      <div className="flex items-start justify-between gap-2 w-full">
        <div className="pointer-events-auto glass-panel-glow rounded-2xl border border-amber-400/35 px-3.5 py-2.5 max-w-md">
          <div className="text-[10px] font-mono uppercase tracking-wider text-amber-300 flex items-center space-x-1.5">
            <Sun className="w-3.5 h-3.5" />
            <span>{isVi ? 'PHÒNG THÍ NGHIỆM NHẬT THỰC & TRĂNG MÁU 3D' : '3D ECLIPSE & BLOOD MOON LAB'}</span>
          </div>
          <div data-testid="eclipse-status" className="text-xs sm:text-sm font-bold text-white mt-0.5">
            {statusLabel}
          </div>
        </div>

        <button
          type="button"
          data-testid="exit-eclipse-btn"
          onClick={() => {
            audio.playUIClick();
            ModeOrchestrator.getInstance().exitCosmicLab();
          }}
          className="pointer-events-auto flex items-center space-x-1.5 px-3.5 py-2 rounded-xl glass-panel-glow border border-white/15 hover:bg-white/15 text-xs font-semibold text-white cursor-pointer"
        >
          <X className="w-4 h-4" />
          <span>{isVi ? 'Thoát' : 'Exit'}</span>
        </button>
      </div>

      {/* Bottom Interactive Dock */}
      <div className="pointer-events-auto w-full max-w-2xl mx-auto glass-panel-glow rounded-2xl border border-white/15 p-3 sm:p-4 space-y-3 shadow-2xl">
        {/* 3 Mode Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
          {ECLIPSE_MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              data-testid={`eclipse-mode-${m.id}`}
              onClick={() => {
                audio.playUIClick();
                setMode(m.id);
              }}
              className={`px-2.5 py-2 rounded-xl border text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                mode === m.id
                  ? 'bg-amber-500/25 border-amber-400/60 text-amber-200'
                  : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
              }`}
            >
              {m.id === 'solar_ground' ? (
                <Sun className="w-3.5 h-3.5 shrink-0" />
              ) : m.id === 'solar_orbit' ? (
                <Orbit className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <Moon className="w-3.5 h-3.5 shrink-0" />
              )}
              <span className="truncate">{isVi ? m.vi : m.en}</span>
            </button>
          ))}
        </div>

        {/* Phase Scrubber + Play/Pause + Key Contact Shortcuts */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            data-testid="eclipse-play-btn"
            onClick={() => {
              audio.playUIClick();
              setPlaying(!playing);
            }}
            className="p-2 rounded-xl bg-amber-500/25 hover:bg-amber-500/40 border border-amber-400/40 text-amber-200 cursor-pointer"
            aria-label={playing ? (isVi ? 'Tạm dừng' : 'Pause') : isVi ? 'Phát' : 'Play'}
          >
            {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>

          <div className="flex-1 min-w-[160px]">
            <div className="flex justify-between gap-2 text-[10px] font-mono text-slate-300 mb-1">
              <span>{isVi ? 'TIẾN TRÌNH & ĐỘ CHE PHỦ' : 'PHASE & OBSCURATION'}</span>
              <span className="text-amber-300 font-bold">
                {isVi ? 'Pha' : 'Phase'} {Math.round(state.phase * 100)}% · {isVi ? 'Che phủ' : 'Cover'}{' '}
                {state.obscurationPct}%
              </span>
            </div>
            <input
              type="range"
              data-testid="eclipse-phase-slider"
              min={0}
              max={1}
              step={0.005}
              value={phase}
              onChange={(e) => {
                setPlaying(false);
                setPhase(parseFloat(e.target.value));
              }}
              aria-label={isVi ? 'Thanh kéo pha nhật thực' : 'Eclipse phase slider'}
              className="w-full accent-amber-400 cursor-pointer"
            />
          </div>

          <div className="flex items-center space-x-1.5 font-mono text-[10px]">
            <button
              type="button"
              onClick={() => {
                setPlaying(false);
                setPhase(0.45);
              }}
              className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-amber-200 cursor-pointer"
            >
              {isVi ? 'Nhẫn Kim Cương' : 'Diamond Ring'}
            </button>
            <button
              type="button"
              onClick={() => {
                setPlaying(false);
                setPhase(0.5);
              }}
              className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-sky-200 cursor-pointer"
            >
              {isVi ? 'Cực Đại 50%' : 'Totality 50%'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
