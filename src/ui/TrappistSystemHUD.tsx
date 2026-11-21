import React, { useEffect, useRef, useState } from 'react';
import { Orbit, Eye, Play, Pause, X } from 'lucide-react';
import { useAppStore, type TrappistViewMode } from '@/stores/useAppStore';
import { TRAPPIST_PLANETS, evaluateTrappistTransit, trappistLiveTelemetry } from '@/simulation/cosmic/Wave2Physics';
import { ModeOrchestrator } from '@/engine/navigation/ModeOrchestrator';
import { CameraManager } from '@/engine/camera/CameraManager';
import { AudioManager } from '@/engine/audio/AudioManager';
import { useTranslation } from '@/i18n';

export const TrappistSystemHUD: React.FC = () => {
  const { language } = useTranslation();
  const isVi = language === 'vi';

  const activeLab = useAppStore((s) => s.activeCosmicLab);
  const selectedPlanet = useAppStore((s) => s.trappistSelectedPlanet);
  const viewMode = useAppStore((s) => s.trappistViewMode);
  const playing = useAppStore((s) => s.trappistPlaying);
  const isTabHidden = useAppStore((s) => s.isTabHidden);
  const reducedMotion = useAppStore((s) => s.reducedMotion);

  const setSelectedPlanet = useAppStore((s) => s.setTrappistSelectedPlanet);
  const setViewMode = useAppStore((s) => s.setTrappistViewMode);
  const setPlaying = useAppStore((s) => s.setTrappistPlaying);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [transitPhase, setTransitPhase] = useState(() => trappistLiveTelemetry.phase);

  useEffect(() => {
    if (activeLab !== 'trappist_exoplanets' || !playing || isTabHidden || reducedMotion) return;
    const id = window.setInterval(() => {
      setTransitPhase(trappistLiveTelemetry.phase);
    }, 90);
    return () => window.clearInterval(id);
  }, [activeLab, playing, isTabHidden, reducedMotion]);

  useEffect(() => {
    if (activeLab !== 'trappist_exoplanets') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(2, typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);
    const cssW = 280;
    const cssH = 58;
    if (canvas.width !== cssW * dpr || canvas.height !== cssH * dpr) {
      canvas.width = cssW * dpr;
      canvas.height = cssH * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const w = cssW;
    const h = cssH;
    ctx.clearRect(0, 0, w, h);

    // Subtle dark panel grid
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.14)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 14);
    ctx.lineTo(w, 14);
    ctx.moveTo(0, h - 14);
    ctx.lineTo(w, h - 14);
    ctx.stroke();

    // Draw Kepler transit brightness curve across phase 0..1
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= 80; i++) {
      const ph = i / 80;
      const sample = evaluateTrappistTransit(selectedPlanet, ph);
      const x = ph * w;
      const dipVisual = (1.0 - sample.fluxNormalized) * 4600;
      const y = 14 + Math.min(h - 24, dipVisual);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Highlight live transit marker dot
    const cur = evaluateTrappistTransit(selectedPlanet, transitPhase);
    const curX = transitPhase * w;
    const curY = 14 + Math.min(h - 24, (1.0 - cur.fluxNormalized) * 4600);
    ctx.fillStyle = cur.inTransit ? '#34d399' : '#fbbf24';
    ctx.beginPath();
    ctx.arc(curX, curY, 4, 0, Math.PI * 2);
    ctx.fill();
  }, [activeLab, selectedPlanet, transitPhase]);

  if (activeLab !== 'trappist_exoplanets') return null;

  const spec = TRAPPIST_PLANETS.find((p) => p.id === selectedPlanet) ?? TRAPPIST_PLANETS[3];
  const transit = evaluateTrappistTransit(selectedPlanet, transitPhase);
  const audio = AudioManager.getInstance();

  const handleViewSwitch = (mode: TrappistViewMode) => {
    audio.playUIClick();
    setViewMode(mode);
    CameraManager.getInstance().setCosmicLabSubView('trappist_exoplanets', mode);
  };

  return (
    <div
      data-testid="trappist-system-hud"
      className="fixed inset-0 pointer-events-none z-40 flex flex-col justify-between p-3 sm:p-5 select-none"
    >
      {/* Top Bar */}
      <div className="flex items-start justify-between gap-2 w-full">
        <div className="pointer-events-auto glass-panel-glow rounded-2xl border border-rose-400/35 px-3 sm:px-3.5 py-2 sm:py-2.5 max-w-lg min-w-0">
          <div className="text-[10px] font-mono uppercase tracking-wider text-rose-300 flex items-center space-x-1.5">
            <Orbit className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">
              {isVi ? 'NGOẠI HÀNH TINH · CÁCH TRÁI ĐẤT 40 NĂM ÁNH SÁNG' : 'EXOPLANET SYSTEM · 40 LIGHT-YEARS AWAY'}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-0.5">
            <span className="text-xs sm:text-sm font-bold text-white">
              {spec.name} · {spec.eqTempK} K
            </span>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                spec.inHabitableZone
                  ? 'bg-emerald-500/20 border-emerald-400/45 text-emerald-200'
                  : 'bg-white/10 border-white/15 text-slate-300'
              }`}
            >
              {spec.inHabitableZone
                ? isVi
                  ? 'Vùng Ở Được'
                  : 'Habitable Zone'
                : isVi
                ? 'Ngoài Vùng Ở Được'
                : 'Outside HZ'}
            </span>
          </div>
        </div>

        <button
          type="button"
          data-testid="exit-trappist-btn"
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

      {/* Bottom Interactive Observatory Dock */}
      <div className="pointer-events-auto w-full max-w-4xl mx-auto glass-panel-glow rounded-2xl border border-rose-400/25 p-3 sm:p-4 space-y-2.5 shadow-2xl max-h-[45dvh] sm:max-h-none overflow-y-auto overscroll-contain touch-pan-y vip-scrollbar">
        {/* Top Control Row: 7 Planet Pills + View Switcher + Play/Pause */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1">
            {TRAPPIST_PLANETS.map((p) => {
              const active = p.id === selectedPlanet;
              return (
                <button
                  key={p.id}
                  type="button"
                  data-testid={`trappist-planet-${p.id}`}
                  onClick={() => {
                    audio.playUIClick();
                    setSelectedPlanet(p.id);
                  }}
                  className={`px-2 py-1 rounded-lg border font-mono text-[11px] font-bold flex items-center space-x-1 cursor-pointer transition-all ${
                    active
                      ? 'bg-rose-500/30 border-rose-400/65 text-white'
                      : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <span>1{p.id}</span>
                  {p.inHabitableZone && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              data-testid="trappist-view-system"
              onClick={() => handleViewSwitch('system')}
              className={`px-2.5 py-1 rounded-xl border text-[11px] font-semibold cursor-pointer ${
                viewMode === 'system'
                  ? 'bg-sky-500/25 border-sky-400/60 text-sky-100'
                  : 'bg-white/5 border-white/10 text-slate-300'
              }`}
            >
              {isVi ? 'Hệ 7 Hành Tinh' : '7-Planet Orbit'}
            </button>
            <button
              type="button"
              data-testid="trappist-view-surface_e"
              onClick={() => handleViewSwitch('surface_e')}
              className={`px-2.5 py-1 rounded-xl border text-[11px] font-semibold flex items-center space-x-1 cursor-pointer ${
                viewMode === 'surface_e'
                  ? 'bg-emerald-500/25 border-emerald-400/60 text-emerald-100'
                  : 'bg-white/5 border-white/10 text-slate-300'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{isVi ? 'Bề Mặt 1e' : 'Surface 1e'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                audio.playUIClick();
                setPlaying(!playing);
              }}
              aria-label={playing ? (isVi ? 'Tạm dừng quỹ đạo' : 'Pause orbits') : isVi ? 'Tiếp tục quỹ đạo' : 'Resume orbits'}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-white cursor-pointer"
            >
              {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Science Telemetry Split: Kepler Transit Photometry + JWST Spectroscopy */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Kepler Transit Light-Curve */}
          <div className="rounded-xl bg-black/35 border border-white/10 p-2.5">
            <div className="flex items-center justify-between text-[10px] font-mono mb-1">
              <span className="text-sky-300 font-bold">
                {isVi ? 'QUANG ĐO KEPLER TRANSIT' : 'KEPLER TRANSIT PHOTOMETRY'}
              </span>
              <span className={transit.inTransit ? 'text-emerald-300 font-bold' : 'text-slate-400'}>
                {transit.inTransit ? `-${transit.dipPpm} ppm` : `${transit.fluxNormalized.toFixed(4)} F₀`}
              </span>
            </div>
            <canvas
              ref={canvasRef}
              data-testid="trappist-transit-canvas"
              width={280}
              height={58}
              className="w-full h-[58px] rounded-lg bg-slate-950/70"
            />
          </div>

          {/* JWST Atmospheric Spectroscopy + World Summary */}
          <div className="rounded-xl bg-black/35 border border-white/10 p-2.5 flex flex-col justify-between space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="text-emerald-300 font-bold">
                {isVi ? 'PHỔ KHÍ QUYỂN JWST' : 'JWST SPECTROSCOPY'}
              </span>
              <span className="text-slate-300">
                P = {spec.orbitalPeriodDays}d · {spec.radiusEarth} R⊕
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1.5 font-mono text-[10px]">
              {[
                { label: 'H₂O', val: spec.atmosphere.h2o, color: 'bg-cyan-400' },
                { label: 'CO₂', val: spec.atmosphere.co2, color: 'bg-amber-400' },
                { label: 'CH₄', val: spec.atmosphere.ch4, color: 'bg-violet-400' },
                { label: 'O₂', val: spec.atmosphere.o2, color: 'bg-emerald-400' },
              ].map((gas) => (
                <div key={gas.label} className="space-y-0.5">
                  <div className="flex justify-between text-slate-300">
                    <span>{gas.label}</span>
                    <span>{gas.val}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div className={`h-full ${gas.color}`} style={{ width: `${gas.val}%` }} />
                  </div>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-slate-300 leading-snug">
              {isVi ? spec.noteVi : spec.noteEn}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
