import React, { useEffect, useMemo, useRef } from 'react';
import { Play, Pause, RotateCcw, Volume2, X, Activity } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { evaluateBinaryMerger } from '@/simulation/cosmic/CosmicPhysics';
import { ModeOrchestrator } from '@/engine/navigation/ModeOrchestrator';
import { AudioManager } from '@/engine/audio/AudioManager';
import { useTranslation } from '@/i18n';

const WAVEFORM_SAMPLES = 180;

export const BinaryMergerHUD: React.FC = () => {
  const { language } = useTranslation();
  const isVi = language === 'vi';

  const activeLab = useAppStore((s) => s.activeCosmicLab);
  const progress = useAppStore((s) => s.mergerProgress);
  const playing = useAppStore((s) => s.mergerPlaying);
  const isTabHidden = useAppStore((s) => s.isTabHidden);
  const reducedMotion = useAppStore((s) => s.reducedMotion);
  const setProgress = useAppStore((s) => s.setMergerProgress);
  const setPlaying = useAppStore((s) => s.setMergerPlaying);
  const replayMerger = useAppStore((s) => s.replayMerger);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chirpFiredRef = useRef(false);

  // Precompute deterministic 181-point GW150914 waveform once instead of per-tick in useEffect
  const waveformPoints = useMemo(() => {
    const pts = new Float32Array(WAVEFORM_SAMPLES + 1);
    for (let i = 0; i <= WAVEFORM_SAMPLES; i++) {
      pts[i] = evaluateBinaryMerger(i / WAVEFORM_SAMPLES).strainValue;
    }
    return pts;
  }, []);

  // Advance merger clock cleanly in DOM timer (zero React setState inside 3D useFrame!)
  useEffect(() => {
    if (activeLab !== 'binary_merger' || !playing || isTabHidden || reducedMotion) return;
    const id = window.setInterval(() => {
      const cur = useAppStore.getState().mergerProgress;
      const next = cur + 0.011;
      if (cur < 0.62 && next >= 0.62 && !chirpFiredRef.current) {
        chirpFiredRef.current = true;
        AudioManager.getInstance().playLigoChirp();
      }
      if (next >= 1.0) {
        chirpFiredRef.current = false;
        useAppStore.getState().setMergerProgress(0.0);
      } else {
        useAppStore.getState().setMergerProgress(next);
      }
    }, 80);
    return () => window.clearInterval(id);
  }, [activeLab, playing, isTabHidden, reducedMotion]);

  // Draw live LIGO strain h(t) oscilloscope waveform using memoized samples
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || activeLab !== 'binary_merger') return;
    const ctx = canvas.getContext?.('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Subtle oscilloscope grid
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.14)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    // GW150914 Chirp curve across [0, 1]
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    for (let i = 0; i <= WAVEFORM_SAMPLES; i++) {
      const t = i / WAVEFORM_SAMPLES;
      const x = t * w;
      const y = h / 2 - waveformPoints[i] * (h * 0.42);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Live playhead cursor
    const px = progress * w;
    ctx.strokeStyle = '#fb923c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px, 2);
    ctx.lineTo(px, h - 2);
    ctx.stroke();
  }, [progress, activeLab, waveformPoints]);

  if (activeLab !== 'binary_merger') return null;

  const state = evaluateBinaryMerger(progress);
  const audio = AudioManager.getInstance();

  const stageLabel =
    state.stage === 'inspiral'
      ? isVi
        ? 'PHA XOẮN ỐC'
        : 'INSPIRAL PHASE'
      : state.stage === 'merger'
      ? isVi
        ? 'ĐỈNH HỢP NHẤT'
        : 'MERGER PEAK CHIRP'
      : isVi
      ? 'TẮT DẦN'
      : 'QUASINORMAL RINGDOWN';

  return (
    <div
      data-testid="binary-merger-hud"
      className="fixed inset-0 pointer-events-none z-40 flex flex-col justify-between p-3 sm:p-5 select-none"
    >
      {/* Top Bar */}
      <div className="flex items-start justify-between gap-2 w-full">
        <div className="pointer-events-auto glass-panel-glow rounded-2xl border border-cyan-400/35 px-3 sm:px-3.5 py-2 sm:py-2.5 max-w-md min-w-0">
          <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-300 flex items-center space-x-1.5">
            <Activity className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">
              {isVi ? 'GW150914 · SÓNG HẤP DẪN LIGO' : 'GW150914 · LIGO GRAVITATIONAL WAVES'}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-0.5">
            <span className="text-xs sm:text-sm font-bold text-white">
              {isVi ? 'Hợp Nhất Hai Hố Đen 36 + 29 M☉' : 'Binary Black Hole Merger 36 + 29 M☉'}
            </span>
            <span
              data-testid="merger-stage-badge"
              className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-orange-500/25 border border-orange-400/45 text-orange-200 font-bold shrink-0"
            >
              {stageLabel}
            </span>
          </div>
        </div>

        <button
          type="button"
          data-testid="exit-binary-merger-btn"
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

      {/* Bottom LIGO Oscilloscope & Controls */}
      <div className="pointer-events-auto w-full max-w-2xl mx-auto glass-panel-glow rounded-2xl border border-cyan-500/30 p-3 sm:p-4 space-y-2.5 shadow-2xl">
        {/* Telemetry Row */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 font-mono text-[11px] sm:text-xs">
          <div className="rounded-xl bg-white/5 border border-white/10 px-2 sm:px-2.5 py-1.5 min-w-0">
            <div className="text-[9px] sm:text-[10px] text-slate-400 truncate">
              {isVi ? 'TẦN SỐ SÓNG' : 'GW FREQUENCY'}
            </div>
            <div data-testid="merger-frequency" className="font-bold text-cyan-300 truncate">
              {state.frequencyHz} Hz
            </div>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 px-2 sm:px-2.5 py-1.5 min-w-0">
            <div className="text-[9px] sm:text-[10px] text-slate-400 truncate">
              {isVi ? 'BIÊN ĐỘ h(t)' : 'STRAIN h(t)'}
            </div>
            <div className="font-bold text-amber-300 truncate">{(state.strainEnvelope * 1.2).toFixed(2)}×10⁻²¹</div>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 px-2 sm:px-2.5 py-1.5 min-w-0">
            <div className="text-[9px] sm:text-[10px] text-slate-400 truncate">
              {isVi ? 'BỨC XẠ SÓNG' : 'RADIATED'}
            </div>
            <div className="font-bold text-emerald-300 truncate">{state.radiatedEnergySolar} M☉c²</div>
          </div>
        </div>

        {/* Live LIGO Oscilloscope Canvas */}
        <div className="rounded-xl bg-black/60 border border-cyan-500/25 p-1.5">
          <canvas
            ref={canvasRef}
            data-testid="ligo-waveform-canvas"
            width={560}
            height={68}
            className="w-full h-[54px] sm:h-[58px] block"
          />
        </div>

        {/* Playback & Chirp Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              audio.playUIClick();
              setPlaying(!playing);
            }}
            className="p-2 rounded-xl bg-cyan-500/25 hover:bg-cyan-500/40 border border-cyan-400/40 text-cyan-200 cursor-pointer"
            aria-label={playing ? (isVi ? 'Tạm dừng' : 'Pause') : isVi ? 'Phát' : 'Play'}
          >
            {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>

          <input
            type="range"
            min={0}
            max={1}
            step={0.005}
            value={progress}
            onChange={(e) => {
              setPlaying(false);
              setProgress(parseFloat(e.target.value));
            }}
            aria-label={isVi ? 'Tiến trình hợp nhất hố đen' : 'Binary merger progress'}
            className="flex-1 min-w-[120px] accent-cyan-400 cursor-pointer"
          />

          <button
            type="button"
            data-testid="replay-merger-btn"
            onClick={() => {
              chirpFiredRef.current = false;
              replayMerger();
            }}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white flex items-center space-x-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{isVi ? 'Phát Lại' : 'Replay'}</span>
          </button>

          <button
            type="button"
            data-testid="play-ligo-chirp-btn"
            onClick={() => {
              audio.playLigoChirp();
            }}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-orange-500/25 hover:bg-orange-500/40 border border-orange-400/45 text-xs font-semibold text-orange-200 flex items-center space-x-1.5 cursor-pointer"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>{isVi ? 'Âm Sóng LIGO' : 'LIGO Chirp'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
