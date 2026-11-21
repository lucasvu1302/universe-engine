import React from 'react';
import { Rocket, Compass, Sparkles, X, RotateCcw, Gauge } from 'lucide-react';
import { MissionDestination, useAppStore } from '@/stores/useAppStore';
import { computeHohmannTransfer } from '@/engine/ephemeris/HohmannPhysics';
import { ModeOrchestrator } from '@/engine/navigation/ModeOrchestrator';
import { CameraManager } from '@/engine/camera/CameraManager';
import { AudioManager } from '@/engine/audio/AudioManager';
import { useTranslation } from '@/i18n';

const DESTINATIONS: Array<{ id: MissionDestination; vi: string; en: string; tag: string }> = [
  { id: 'moon', vi: 'Mặt Trăng', en: 'Moon', tag: 'TLI' },
  { id: 'mars', vi: 'Sao Hỏa', en: 'Mars', tag: '1.52 AU' },
  { id: 'jupiter', vi: 'Sao Mộc', en: 'Jupiter', tag: '5.20 AU' },
  { id: 'saturn', vi: 'Sao Thổ', en: 'Saturn', tag: '9.58 AU' },
];

export const MissionPlannerHUD: React.FC = () => {
  const { language } = useTranslation();
  const isVi = language === 'vi';

  const open = useAppStore((s) => s.missionPlannerOpen);
  const destination = useAppStore((s) => s.missionDestination);
  const gravityAssist = useAppStore((s) => s.missionGravityAssist);
  const launching = useAppStore((s) => s.missionLaunching);
  const setDestination = useAppStore((s) => s.setMissionDestination);
  const setGravityAssist = useAppStore((s) => s.setMissionGravityAssist);
  const setLaunching = useAppStore((s) => s.setMissionLaunching);

  if (!open) return null;

  const transfer = computeHohmannTransfer({ destination, gravityAssist });
  const audio = AudioManager.getInstance();
  const cam = CameraManager.getInstance();

  const handleSelectDest = (dest: MissionDestination) => {
    audio.playUIClick();
    setDestination(dest);
    if (dest === 'moon') {
      useAppStore.getState().setTargetId('earth');
      cam.focusPlanet('earth');
    } else {
      useAppStore.getState().setTargetId('sun');
      cam.flyToSolarSystemOverview();
    }
  };

  return (
    <aside
      data-testid="mission-planner-hud"
      onWheel={(e) => e.stopPropagation()}
      className="fixed inset-x-2.5 bottom-2.5 sm:inset-x-auto sm:right-4 sm:top-16 sm:bottom-20 z-40 sm:w-[338px] max-h-[46dvh] sm:max-h-none pointer-events-auto flex flex-col justify-start overflow-y-auto overscroll-contain touch-pan-y vip-scrollbar"
    >
      <div className="glass-panel-glow rounded-2xl border border-cyan-400/35 p-3.5 sm:p-4 shadow-2xl space-y-3 text-slate-100">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 border-b border-white/10 pb-2.5">
          <div className="min-w-0">
            <div className="flex items-center space-x-1.5 text-[10px] font-mono uppercase tracking-wider text-cyan-300">
              <Compass className="w-3.5 h-3.5 shrink-0" />
              <span>
                {transfer.regime === 'geocentric'
                  ? isVi
                    ? 'ĐỊA TÂM · CHUYỂN TIẾP MẶT TRĂNG'
                    : 'GEOCENTRIC TLI ORBIT'
                  : isVi
                  ? 'NHẬT TÂM · LIÊN HÀNH TINH'
                  : 'HELIOCENTRIC TRANSFER'}
              </span>
            </div>
            <h2 className="text-sm font-bold text-white leading-snug mt-0.5">
              {isVi ? 'Hoạch Định Quỹ Đạo Hohmann' : 'Hohmann Transfer Mission Planner'}
            </h2>
          </div>
          <button
            type="button"
            data-testid="exit-mission-planner-btn"
            onClick={() => {
              audio.playUIClick();
              ModeOrchestrator.getInstance().toggleMissionPlanner(false);
            }}
            aria-label={isVi ? 'Đóng Hoạch Định Quỹ Đạo' : 'Close Mission Planner'}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Destination Selector */}
        <div className="grid grid-cols-2 gap-1.5">
          {DESTINATIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              data-testid={`mission-dest-${item.id}`}
              onClick={() => handleSelectDest(item.id)}
              className={`px-2.5 py-2 rounded-xl border text-left transition-all cursor-pointer ${
                destination === item.id
                  ? 'bg-cyan-500/25 border-cyan-400/60 text-white'
                  : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
              }`}
            >
              <div className="text-xs font-bold">{isVi ? item.vi : item.en}</div>
              <div className="text-[10px] font-mono text-cyan-300/80">{item.tag}</div>
            </button>
          ))}
        </div>

        {/* Orbital Mechanics Telemetry */}
        <div className="grid grid-cols-2 gap-2 font-mono text-xs">
          <div className="rounded-xl bg-white/5 border border-white/10 px-2.5 py-2">
            <div className="text-[10px] text-slate-400">{isVi ? 'TỔNG Δv' : 'TOTAL Δv'}</div>
            <div data-testid="mission-total-dv" className="text-base font-bold text-amber-300">
              {transfer.totalDeltaVKms.toFixed(2)} km/s
            </div>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 px-2.5 py-2">
            <div className="text-[10px] text-slate-400">{isVi ? 'THỜI GIAN BAY' : 'TRANSFER TOF'}</div>
            <div data-testid="mission-tof" className="text-base font-bold text-emerald-300">
              {transfer.transferDays} {isVi ? 'ngày' : 'days'}
            </div>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 px-2.5 py-1.5">
            <div className="text-[10px] text-slate-400">Δv₁ / Δv₂</div>
            <div className="text-[11px] font-semibold text-cyan-200">
              {transfer.deltaV1Kms.toFixed(2)} / {transfer.deltaV2Kms.toFixed(2)} km/s
            </div>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 px-2.5 py-1.5">
            <div className="text-[10px] text-slate-400">{isVi ? 'GÓC PHA PHÓNG' : 'PHASE ANGLE'}</div>
            <div className="text-[11px] font-semibold text-sky-200">{transfer.phaseAngleDeg}°</div>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 px-2.5 py-1.5">
            <div className="text-[10px] text-slate-400">{isVi ? 'BÁN TRỤC LỚN' : 'SEMI-MAJOR a'}</div>
            <div className="text-[11px] font-semibold text-slate-200">
              {transfer.regime === 'geocentric' ? '195,589 km' : `${transfer.semiMajorAxisAU.toFixed(3)} AU`}
            </div>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 px-2.5 py-1.5">
            <div className="text-[10px] text-slate-400">{isVi ? 'ĐỘ LỆCH TÂM e' : 'ECCENTRICITY'}</div>
            <div className="text-[11px] font-semibold text-slate-200">{transfer.eccentricity.toFixed(3)}</div>
          </div>
        </div>

        {/* Gravity Assist Slingshot Toggle (Outer Planets Only) */}
        <button
          type="button"
          data-testid="mission-gravity-assist"
          disabled={!transfer.gravityAssistSupported}
          onClick={() => {
            audio.playUIClick();
            setGravityAssist(!gravityAssist);
          }}
          className={`w-full px-3 py-2 rounded-xl border text-xs flex items-center justify-between transition-all ${
            !transfer.gravityAssistSupported
              ? 'bg-white/5 border-white/10 text-slate-500 cursor-not-allowed'
              : gravityAssist
              ? 'bg-fuchsia-500/25 border-fuchsia-400/60 text-fuchsia-200 cursor-pointer'
              : 'bg-white/5 border-white/15 text-slate-200 hover:bg-white/10 cursor-pointer'
          }`}
        >
          <span className="flex items-center space-x-2 font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-fuchsia-400" />
            <span>{isVi ? 'Hỗ Trợ Hấp Dẫn Hành Tinh' : 'Gravity Assist Slingshot'}</span>
          </span>
          <span className="font-mono text-[10px]">
            {!transfer.gravityAssistSupported
              ? isVi
                ? 'Hành tinh ngoài'
                : 'Outer only'
              : gravityAssist
              ? '-18% Δv'
              : isVi
              ? 'TẮT'
              : 'OFF'}
          </span>
        </button>

        {/* Launch / Reset Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            data-testid="mission-launch-btn"
            onClick={() => {
              audio.playWarpDrive();
              setLaunching(!launching);
            }}
            className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-cyan-500/85 to-emerald-500/85 hover:from-cyan-500 hover:to-emerald-500 text-white text-xs font-bold flex items-center justify-center space-x-1.5 shadow-lg shadow-cyan-500/20 cursor-pointer transition-all"
          >
            {launching ? <RotateCcw className="w-4 h-4" /> : <Rocket className="w-4 h-4" />}
            <span>
              {launching
                ? isVi
                  ? 'Đặt Lại Tàu'
                  : 'Reset Probe'
                : isVi
                ? 'Phóng Tàu Chuyển Tiếp'
                : 'Launch Transfer Probe'}
            </span>
          </button>
        </div>

        <p className="text-[11px] text-slate-400 leading-relaxed flex items-start space-x-1.5">
          <Gauge className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
          <span>
            {isVi
              ? 'Tính trực tiếp phương trình Vis-Viva với hai miền vật lý: địa tâm (Trái Đất → Mặt Trăng) và nhật tâm (liên hành tinh).'
              : 'Computed offline via Vis-Viva orbital mechanics across geocentric Earth→Moon and heliocentric interplanetary regimes.'}
          </span>
        </p>
      </div>
    </aside>
  );
};
