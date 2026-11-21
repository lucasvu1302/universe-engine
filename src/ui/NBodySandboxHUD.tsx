import React, { useEffect, useState } from 'react';
import { Orbit, Play, Pause, PlusCircle, RotateCcw, X, AlertTriangle } from 'lucide-react';
import { NBodyPresetId, useAppStore } from '@/stores/useAppStore';
import { MAX_NBODY_BODIES, nbodyLiveTelemetry } from '@/simulation/cosmic/Wave2Physics';
import { ModeOrchestrator } from '@/engine/navigation/ModeOrchestrator';
import { AudioManager } from '@/engine/audio/AudioManager';
import { useTranslation } from '@/i18n';

const PRESETS: Array<{ id: NBodyPresetId; vi: string; en: string }> = [
  { id: 'trisolaris', vi: 'Tam Thể Hỗn Loạn', en: 'Chaotic Trisolaris' },
  { id: 'figure8', vi: 'Quỹ Đạo Số 8', en: 'Figure-8 Stable' },
  { id: 'binary_tatooine', vi: 'Sao Đôi Tatooine', en: 'Binary Tatooine' },
  { id: 'custom_solar', vi: 'Hệ Mặt Trời Tự Tạo', en: 'Custom Solar' },
];

export const NBodySandboxHUD: React.FC = () => {
  const { language } = useTranslation();
  const isVi = language === 'vi';

  const activeLab = useAppStore((s) => s.activeCosmicLab);
  const preset = useAppStore((s) => s.nbodyPreset);
  const playing = useAppStore((s) => s.nbodyPlaying);
  const showHabitable = useAppStore((s) => s.nbodyShowHabitable);
  const showRoche = useAppStore((s) => s.nbodyShowRoche);
  const launchSpeed = useAppStore((s) => s.nbodyLaunchSpeed);
  const spawnNonce = useAppStore((s) => s.nbodySpawnNonce);
  const resetNonce = useAppStore((s) => s.nbodyResetNonce);
  const isTabHidden = useAppStore((s) => s.isTabHidden);
  const reducedMotion = useAppStore((s) => s.reducedMotion);

  const setPreset = useAppStore((s) => s.setNBodyPreset);
  const setPlaying = useAppStore((s) => s.setNBodyPlaying);
  const setShowHabitable = useAppStore((s) => s.setNBodyShowHabitable);
  const setShowRoche = useAppStore((s) => s.setNBodyShowRoche);
  const setLaunchSpeed = useAppStore((s) => s.setNBodyLaunchSpeed);
  const triggerSpawn = useAppStore((s) => s.triggerNBodySpawn);
  const resetNBody = useAppStore((s) => s.resetNBody);

  const [telemetry, setTelemetry] = useState(() => ({ ...nbodyLiveTelemetry }));

  // One-shot sync when preset/reset/spawn changes even while paused
  useEffect(() => {
    if (activeLab !== 'nbody_sandbox') return;
    const raf = window.requestAnimationFrame(() => {
      setTelemetry({ ...nbodyLiveTelemetry });
    });
    return () => window.cancelAnimationFrame(raf);
  }, [activeLab, preset, spawnNonce, resetNonce]);

  // Poll non-React module telemetry at 160ms ONLY while actively simulating (zero idle re-renders)
  useEffect(() => {
    if (activeLab !== 'nbody_sandbox' || isTabHidden || !playing || reducedMotion) return;
    const id = window.setInterval(() => {
      setTelemetry({ ...nbodyLiveTelemetry });
    }, 160);
    return () => window.clearInterval(id);
  }, [activeLab, isTabHidden, playing, reducedMotion]);

  if (activeLab !== 'nbody_sandbox') return null;

  const audio = AudioManager.getInstance();
  const atCap = telemetry.bodyCount >= MAX_NBODY_BODIES;

  return (
    <div
      data-testid="nbody-sandbox-hud"
      className="fixed inset-0 pointer-events-none z-40 flex flex-col justify-between p-3 sm:p-5 select-none"
    >
      {/* Top Header */}
      <div className="flex items-start justify-between gap-2 w-full">
        <div className="pointer-events-auto glass-panel-glow rounded-2xl border border-amber-400/35 px-3 sm:px-3.5 py-2 sm:py-2.5 max-w-lg min-w-0">
          <div className="text-[10px] font-mono uppercase tracking-wider text-amber-300 flex items-center space-x-1.5">
            <Orbit className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">
              {isVi ? 'BỘ TÍCH PHÂN HẤP DẪN VELOCITY VERLET 3D' : '3D SYMPLECTIC N-BODY GRAVITY SANDBOX'}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-0.5">
            <span className="text-xs sm:text-sm font-bold text-white">
              {isVi ? 'Bài Toán 3 Vật Thể & Kiến Tạo Hệ Hành Tinh' : 'Three-Body Problem & Solar Builder'}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-500/20 border border-sky-400/35 text-sky-200">
              {telemetry.bodyCount}/{MAX_NBODY_BODIES} {isVi ? 'thiên thể' : 'bodies'}
            </span>
            {telemetry.rocheDisrupted && (
              <span
                data-testid="nbody-roche-alert"
                className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/25 border border-rose-400/50 text-rose-200 font-bold flex items-center space-x-1"
              >
                <AlertTriangle className="w-3 h-3" />
                <span>{isVi ? 'VƯỢT GIỚI HẠN ROCHE!' : 'ROCHE DISRUPTION!'}</span>
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          data-testid="exit-nbody-btn"
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

      {/* Bottom Interactive Console */}
      <div className="pointer-events-auto w-full max-w-3xl mx-auto glass-panel-glow rounded-2xl border border-white/15 p-3 sm:p-4 space-y-2.5 shadow-2xl max-h-[42dvh] sm:max-h-none overflow-y-auto overscroll-contain touch-pan-y vip-scrollbar">
        {/* Preset Selector */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              data-testid={`nbody-preset-${p.id}`}
              onClick={() => {
                audio.playUIClick();
                setPreset(p.id);
              }}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer truncate ${
                preset === p.id
                  ? 'bg-amber-500/25 border-amber-400/60 text-amber-200'
                  : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
              }`}
            >
              {isVi ? p.vi : p.en}
            </button>
          ))}
        </div>

        {/* Playback, Spawn Planet & Overlays */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/10">
          <button
            type="button"
            onClick={() => {
              audio.playUIClick();
              setPlaying(!playing);
            }}
            aria-label={playing ? (isVi ? 'Tạm dừng' : 'Pause') : isVi ? 'Phát' : 'Play'}
            className="p-2 rounded-xl bg-amber-500/25 hover:bg-amber-500/40 border border-amber-400/40 text-amber-200 cursor-pointer"
          >
            {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => {
              audio.playUIClick();
              resetNBody();
            }}
            className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white flex items-center space-x-1 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{isVi ? 'Đặt Lại' : 'Reset'}</span>
          </button>

          <div className="flex items-center space-x-2 flex-1 min-w-[140px]">
            <span className="text-[10px] font-mono text-slate-400 shrink-0">
              {isVi ? 'Vận tốc phóng:' : 'Launch v:'}
            </span>
            <input
              type="range"
              min={0.6}
              max={1.5}
              step={0.05}
              value={launchSpeed}
              onChange={(e) => setLaunchSpeed(parseFloat(e.target.value))}
              aria-label={isVi ? 'Hệ số vận tốc phóng hành tinh' : 'Planet launch speed factor'}
              className="flex-1 accent-amber-400 cursor-pointer"
            />
            <span className="text-[11px] font-mono text-amber-300 font-bold w-9 text-right">
              {launchSpeed.toFixed(2)}×
            </span>
          </div>

          <button
            type="button"
            data-testid="nbody-spawn-btn"
            disabled={atCap}
            onClick={() => {
              audio.playUIClick();
              triggerSpawn();
            }}
            title={atCap ? (isVi ? 'Đã đạt giới hạn tối đa 8 thiên thể' : 'Max 8 bodies reached') : undefined}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center space-x-1.5 transition-all ${
              atCap
                ? 'bg-white/5 border-white/10 text-slate-500 cursor-not-allowed'
                : 'bg-sky-500/25 hover:bg-sky-500/40 border-sky-400/50 text-sky-200 cursor-pointer'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>{isVi ? 'Phóng Hành Tinh' : 'Launch Planet'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowHabitable(!showHabitable)}
            className={`px-2 py-1 rounded-lg border text-[10px] font-mono font-bold cursor-pointer ${
              showHabitable
                ? 'bg-emerald-500/25 border-emerald-400/50 text-emerald-200'
                : 'bg-white/5 border-white/10 text-slate-400'
            }`}
          >
            {isVi ? 'Vùng Ở Được' : 'Habitable'}
          </button>

          <button
            type="button"
            onClick={() => setShowRoche(!showRoche)}
            className={`px-2 py-1 rounded-lg border text-[10px] font-mono font-bold cursor-pointer ${
              showRoche
                ? 'bg-rose-500/25 border-rose-400/50 text-rose-200'
                : 'bg-white/5 border-white/10 text-slate-400'
            }`}
          >
            Roche
          </button>
        </div>
      </div>
    </div>
  );
};
