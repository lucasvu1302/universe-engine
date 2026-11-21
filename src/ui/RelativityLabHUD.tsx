import React, { useEffect, useState } from 'react';
import { Clock, Eye, Play, Pause, Sparkles, X } from 'lucide-react';
import { useAppStore, type RelativityTab } from '@/stores/useAppStore';
import { evaluateRelativity } from '@/simulation/cosmic/Wave2Physics';
import { ModeOrchestrator } from '@/engine/navigation/ModeOrchestrator';
import { CameraManager } from '@/engine/camera/CameraManager';
import { AudioManager } from '@/engine/audio/AudioManager';
import { useTranslation } from '@/i18n';

function formatClock(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds);
  const mins = Math.floor(s / 60) % 60;
  const secs = Math.floor(s % 60);
  const tenths = Math.floor((s * 10) % 10);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${tenths}`;
}

export const RelativityLabHUD: React.FC = () => {
  const { language } = useTranslation();
  const isVi = language === 'vi';

  const activeLab = useAppStore((s) => s.activeCosmicLab);
  const tab = useAppStore((s) => s.relativityTab);
  const velocityC = useAppStore((s) => s.relativityVelocityC);
  const radiusRs = useAppStore((s) => s.relativityRadiusRs);
  const lensOffset = useAppStore((s) => s.relativityLensOffset);
  const diveProgress = useAppStore((s) => s.relativityDiveProgress);
  const divePlaying = useAppStore((s) => s.relativityDivePlaying);
  const isTabHidden = useAppStore((s) => s.isTabHidden);
  const reducedMotion = useAppStore((s) => s.reducedMotion);

  const setTab = useAppStore((s) => s.setRelativityTab);
  const setVelocityC = useAppStore((s) => s.setRelativityVelocityC);
  const setRadiusRs = useAppStore((s) => s.setRelativityRadiusRs);
  const setLensOffset = useAppStore((s) => s.setRelativityLensOffset);
  const setDiveProgress = useAppStore((s) => s.setRelativityDiveProgress);
  const setDivePlaying = useAppStore((s) => s.setRelativityDivePlaying);

  const [clocks, setClocks] = useState({ earthSec: 0, shipSec: 0 });

  useEffect(() => {
    if (activeLab !== 'relativity_lab' || isTabHidden || reducedMotion) return;
    const id = window.setInterval(() => {
      const s = useAppStore.getState();
      const relNow = evaluateRelativity(s.relativityVelocityC, s.relativityRadiusRs, s.relativityLensOffset);
      setClocks((prev) => ({
        earthSec: prev.earthSec + 0.09,
        shipSec: prev.shipSec + 0.09 * relNow.combinedShipRate,
      }));
      if (s.relativityTab === 'bh_dive' && s.relativityDivePlaying) {
        const next = s.relativityDiveProgress + 0.012;
        s.setRelativityDiveProgress(next >= 1 ? 0 : next);
      }
    }, 90);
    return () => window.clearInterval(id);
  }, [activeLab, isTabHidden, reducedMotion]);

  if (activeLab !== 'relativity_lab') return null;

  const rel = evaluateRelativity(velocityC, radiusRs, lensOffset);
  const earthHoursRatio = (1 / Math.max(1e-6, rel.combinedShipRate)).toFixed(2);
  const audio = AudioManager.getInstance();

  const handleTabSwitch = (next: RelativityTab) => {
    audio.playUIClick();
    setTab(next);
    CameraManager.getInstance().setCosmicLabSubView('relativity_lab', next);
  };

  return (
    <div
      data-testid="relativity-lab-hud"
      className="fixed inset-0 pointer-events-none z-40 flex flex-col justify-between p-3 sm:p-5 select-none"
    >
      {/* Top Bar */}
      <div className="flex items-start justify-between gap-2 w-full">
        <div className="pointer-events-auto glass-panel-glow rounded-2xl border border-violet-400/35 px-3 sm:px-3.5 py-2 sm:py-2.5 max-w-lg min-w-0">
          <div className="text-[10px] font-mono uppercase tracking-wider text-violet-300 flex items-center space-x-1.5">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">
              {isVi ? 'THUYẾT TƯƠNG ĐỐI RỘNG & HẸP · THẤU KÍNH HẤP DẪN' : 'SPECIAL & GENERAL RELATIVITY · EINSTEIN LENSING'}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-0.5">
            <span className="text-xs sm:text-sm font-bold text-white">
              {tab === 'dilation_lensing'
                ? isVi
                  ? 'Giãn Nở Thời Gian & Vòng Einstein'
                  : 'Time Dilation & Einstein Ring'
                : isVi
                ? 'Rơi Tự Do Qua Chân Trời Sự Kiện'
                : 'First-Person Black Hole Plunge'}
            </span>
            <span
              data-testid="relativity-gamma"
              className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-violet-500/20 border border-violet-400/45 text-violet-200 font-bold"
            >
              γ = {rel.lorentzGamma.toFixed(2)}×
            </span>
          </div>
        </div>

        <button
          type="button"
          data-testid="exit-relativity-btn"
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
      <div className="pointer-events-auto w-full max-w-3xl mx-auto glass-panel-glow rounded-2xl border border-violet-400/25 p-3 sm:p-4 space-y-2.5 shadow-2xl max-h-[45dvh] sm:max-h-none overflow-y-auto overscroll-contain touch-pan-y vip-scrollbar">
        {/* Sub-view Tab Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              data-testid="relativity-tab-dilation_lensing"
              onClick={() => handleTabSwitch('dilation_lensing')}
              className={`px-3 py-1.5 rounded-xl border text-[11px] font-semibold flex items-center space-x-1.5 cursor-pointer ${
                tab === 'dilation_lensing'
                  ? 'bg-violet-500/25 border-violet-400/60 text-violet-100'
                  : 'bg-white/5 border-white/10 text-slate-300'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isVi ? 'Đồng Hồ & Vòng Einstein' : 'Clocks & Einstein Ring'}</span>
            </button>
            <button
              type="button"
              data-testid="relativity-tab-bh_dive"
              onClick={() => handleTabSwitch('bh_dive')}
              className={`px-3 py-1.5 rounded-xl border text-[11px] font-semibold flex items-center space-x-1.5 cursor-pointer ${
                tab === 'bh_dive'
                  ? 'bg-amber-500/25 border-amber-400/60 text-amber-100'
                  : 'bg-white/5 border-white/10 text-slate-300'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{isVi ? 'Rơi Vào Hố Đen' : 'Black Hole Dive'}</span>
            </button>
          </div>

          {tab === 'dilation_lensing' ? (
            <button
              type="button"
              onClick={() => {
                audio.playUIClick();
                setLensOffset(0);
              }}
              className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/45 text-[10px] font-mono text-cyan-200 cursor-pointer"
            >
              {isVi ? 'Căn Vòng Einstein Hoàn Hảo (0.00)' : 'Align Perfect Einstein Ring (0.00)'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                audio.playUIClick();
                setDivePlaying(!divePlaying);
              }}
              className="px-2.5 py-1 rounded-lg bg-amber-500/25 hover:bg-amber-500/35 border border-amber-400/50 text-[11px] font-semibold text-amber-100 flex items-center space-x-1 cursor-pointer"
            >
              {divePlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{divePlaying ? (isVi ? 'Tạm Dừng Rơi' : 'Pause Dive') : isVi ? 'Bắt Đầu Rơi' : 'Start Dive'}</span>
            </button>
          )}
        </div>

        {/* Twin Atomic Clocks & Relativity Readout */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 font-mono text-xs">
          <div className="rounded-xl bg-white/5 border border-white/10 px-2.5 py-1.5">
            <div className="text-[9px] text-slate-400">{isVi ? 'ĐỒNG HỒ TRÁI ĐẤT' : 'EARTH CLOCK'}</div>
            <div className="font-bold text-sky-300">{formatClock(clocks.earthSec)}</div>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 px-2.5 py-1.5">
            <div className="text-[9px] text-slate-400">{isVi ? 'ĐỒNG HỒ PHI THUYỀN' : 'SHIP CLOCK'}</div>
            <div className="font-bold text-violet-300">{formatClock(clocks.shipSec)}</div>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 px-2.5 py-1.5">
            <div className="text-[9px] text-slate-400">{isVi ? 'TỶ LỆ GIÃN NỞ' : 'DILATION RATIO'}</div>
            <div className="font-bold text-amber-300">1h = {earthHoursRatio}h</div>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 px-2.5 py-1.5">
            <div className="text-[9px] text-slate-400">{isVi ? 'DỊCH XANH DOPPLER' : 'DOPPLER SHIFT'}</div>
            <div className="font-bold text-cyan-300">{rel.dopplerBlueShift}×</div>
          </div>
        </div>

        {/* Interactive Physics Sliders */}
        {tab === 'dilation_lensing' ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[10px] font-mono">
            <div>
              <div className="flex justify-between text-slate-300 mb-0.5">
                <span>{isVi ? 'VẬN TỐC v/c' : 'VELOCITY v/c'}</span>
                <span className="text-violet-300 font-bold">{(rel.velocityC * 100).toFixed(1)}% c</span>
              </div>
              <input
                type="range"
                data-testid="relativity-velocity-slider"
                min={0}
                max={0.995}
                step={0.005}
                value={velocityC}
                onChange={(e) => setVelocityC(parseFloat(e.target.value))}
                aria-label={isVi ? 'Vận tốc tương đối theo tốc độ ánh sáng' : 'Relativistic velocity fraction of c'}
                className="w-full accent-violet-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-300 mb-0.5">
                <span>{isVi ? 'KHOẢNG CÁCH r/rₛ' : 'RADIUS r/rₛ'}</span>
                <span className="text-amber-300 font-bold">{rel.radiusRs.toFixed(2)} rₛ</span>
              </div>
              <input
                type="range"
                data-testid="relativity-radius-slider"
                min={1.05}
                max={15}
                step={0.05}
                value={radiusRs}
                onChange={(e) => setRadiusRs(parseFloat(e.target.value))}
                aria-label={isVi ? 'Khoảng cách tới chân trời sự kiện' : 'Schwarzschild radius multiple'}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-300 mb-0.5">
                <span>{isVi ? 'LỆCH THIÊN HÀ' : 'LENS OFFSET'}</span>
                <span className="text-cyan-300 font-bold">{rel.lensOffset.toFixed(2)}</span>
              </div>
              <input
                type="range"
                data-testid="relativity-offset-slider"
                min={-1.2}
                max={1.2}
                step={0.02}
                value={lensOffset}
                onChange={(e) => setLensOffset(parseFloat(e.target.value))}
                aria-label={isVi ? 'Độ lệch thiên hà nền qua thấu kính hấp dẫn' : 'Background galaxy lensing offset'}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>
          </div>
        ) : (
          <div className="text-[10px] font-mono">
            <div className="flex justify-between text-slate-300 mb-1">
              <span>{isVi ? 'TIẾN TRÌNH RƠI QUA VÒNG PHOTON → CHÂN TRỜI SỰ KIỆN' : 'PLUNGE PROGRESS (PHOTON SPHERE → EVENT HORIZON)'}</span>
              <span className="text-amber-300 font-bold">{Math.round(diveProgress * 100)}%</span>
            </div>
            <input
              type="range"
              data-testid="relativity-dive-slider"
              min={0}
              max={1}
              step={0.01}
              value={diveProgress}
              onChange={(e) => setDiveProgress(parseFloat(e.target.value))}
              aria-label={isVi ? 'Tiến trình rơi vào hố đen' : 'Black hole plunge progress'}
              className="w-full accent-amber-400 cursor-pointer"
            />
          </div>
        )}
      </div>
    </div>
  );
};
