import React from 'react';
import { Sparkles, Flame, X } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { evaluateStellarEvolution } from '@/simulation/cosmic/CosmicPhysics';
import { ModeOrchestrator } from '@/engine/navigation/ModeOrchestrator';
import { AudioManager } from '@/engine/audio/AudioManager';
import { useTranslation } from '@/i18n';

const STAGE_LABELS: Record<string, { vi: string; en: string }> = {
  protostar: { vi: 'Tiền Ngôi Sao (Đám Mây Phân Tử)', en: 'Protostar (Molecular Cloud)' },
  main_sequence: { vi: 'Dãy Chính (Tổng Hợp Hydro)', en: 'Main Sequence (H Fusion)' },
  red_giant: { vi: 'Sao Khổng Lồ Đỏ', en: 'Red Giant' },
  red_supergiant: { vi: 'Sao Siêu Khổng Lồ Đỏ', en: 'Red Supergiant' },
  planetary_nebula: { vi: 'Tinh Vân Hành Tinh', en: 'Planetary Nebula' },
  supernova: { vi: 'Vụ Nổ Siêu Tân Tinh', en: 'Core-Collapse Supernova' },
  white_dwarf: { vi: 'Sao Lùn Trắng', en: 'White Dwarf Remnant' },
  neutron_star: { vi: 'Sao Neutron · Pulsar', en: 'Neutron Star · Pulsar' },
  black_hole: { vi: 'Hố Đen Khối Lượng Sao', en: 'Stellar Black Hole' },
};

const REMNANT_LABELS = {
  WHITE_DWARF: { vi: 'SAO LÙN TRẮNG', en: 'WHITE DWARF' },
  NEUTRON_STAR: { vi: 'SAO NEUTRON', en: 'NEUTRON STAR' },
  BLACK_HOLE: { vi: 'HỐ ĐEN', en: 'BLACK HOLE' },
} as const;

export const StellarLabHUD: React.FC = () => {
  const { language } = useTranslation();
  const isVi = language === 'vi';

  const activeLab = useAppStore((s) => s.activeCosmicLab);
  const tab = useAppStore((s) => s.stellarLabTab);
  const nebulaId = useAppStore((s) => s.stellarNebulaId);
  const massSolar = useAppStore((s) => s.stellarMassSolar);
  const ageProgress = useAppStore((s) => s.stellarAgeProgress);

  const setTab = useAppStore((s) => s.setStellarLabTab);
  const setNebulaId = useAppStore((s) => s.setStellarNebulaId);
  const setMassSolar = useAppStore((s) => s.setStellarMassSolar);
  const setAgeProgress = useAppStore((s) => s.setStellarAgeProgress);

  if (activeLab !== 'stellar_lab') return null;

  const evo = evaluateStellarEvolution(massSolar, ageProgress);
  const audio = AudioManager.getInstance();
  const stageText = STAGE_LABELS[evo.stageKey] ?? STAGE_LABELS.main_sequence;
  const remnantText = REMNANT_LABELS[evo.remnantType];

  return (
    <div
      data-testid="stellar-lab-hud"
      className="fixed inset-0 pointer-events-none z-40 flex flex-col justify-between p-3 sm:p-5 select-none"
    >
      {/* Top Bar */}
      <div className="flex items-start justify-between gap-2 w-full">
        <div className="pointer-events-auto glass-panel-glow rounded-2xl border border-fuchsia-400/35 px-3.5 py-2.5 max-w-md">
          <div className="text-[10px] font-mono uppercase tracking-wider text-fuchsia-300 flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isVi ? 'TINH VÂN 3D & VÒNG ĐỜI NGÔI SAO' : '3D NEBULAE & STELLAR LIFECYCLE LAB'}</span>
          </div>
          <div className="text-xs sm:text-sm font-bold text-white mt-0.5">
            {tab === 'nebula'
              ? nebulaId === 'pillars'
                ? isVi
                  ? 'Cột Trụ Sáng Tạo (Tinh Vân Đại Bàng M16)'
                  : 'Pillars of Creation (Eagle Nebula M16)'
                : isVi
                ? 'Tinh Vân Con Cua (M1 · Tàn Tích Siêu Tân Tinh)'
                : 'Crab Nebula (M1 Supernova Remnant)'
              : isVi
              ? stageText.vi
              : stageText.en}
          </div>
        </div>

        <button
          type="button"
          data-testid="exit-stellar-lab-btn"
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
      <div className="pointer-events-auto w-full max-w-3xl mx-auto glass-panel-glow rounded-2xl border border-white/15 p-3 sm:p-4 space-y-3 shadow-2xl max-h-[46dvh] sm:max-h-none overflow-y-auto overscroll-contain touch-pan-y vip-scrollbar">
        {/* Primary Tab Switcher */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            data-testid="stellar-tab-nebula"
            onClick={() => {
              audio.playUIClick();
              setTab('nebula');
            }}
            className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center space-x-1.5 cursor-pointer ${
              tab === 'nebula'
                ? 'bg-fuchsia-500/25 border-fuchsia-400/60 text-fuchsia-200'
                : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isVi ? 'Tinh Vân 3D Thể Tích' : '3D Volumetric Nebulae'}</span>
          </button>
          <button
            type="button"
            data-testid="stellar-tab-lifecycle"
            onClick={() => {
              audio.playUIClick();
              setTab('lifecycle');
            }}
            className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center space-x-1.5 cursor-pointer ${
              tab === 'lifecycle'
                ? 'bg-amber-500/25 border-amber-400/60 text-amber-200'
                : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>{isVi ? 'Tiến Hóa Sao & Biểu Đồ H-R' : 'Stellar Evolution & H-R Diagram'}</span>
          </button>
        </div>

        {tab === 'nebula' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              data-testid="stellar-nebula-pillars"
              onClick={() => {
                audio.playUIClick();
                setNebulaId('pillars');
              }}
              className={`p-2.5 rounded-xl border text-left cursor-pointer ${
                nebulaId === 'pillars'
                  ? 'bg-cyan-500/20 border-cyan-400/60 text-white'
                  : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
              }`}
            >
              <div className="text-xs font-bold">
                {isVi ? 'Cột Trụ Sáng Tạo (M16)' : 'Pillars of Creation (M16)'}
              </div>
              <div className="text-[10px] text-slate-400">
                {isVi ? 'Vườn ươm sao 6.500 năm ánh sáng · S-II & O-III' : '6,500 ly star nursery · S-II & O-III'}
              </div>
            </button>
            <button
              type="button"
              data-testid="stellar-nebula-crab"
              onClick={() => {
                audio.playUIClick();
                setNebulaId('crab');
              }}
              className={`p-2.5 rounded-xl border text-left cursor-pointer ${
                nebulaId === 'crab'
                  ? 'bg-rose-500/20 border-rose-400/60 text-white'
                  : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
              }`}
            >
              <div className="text-xs font-bold">
                {isVi ? 'Tinh Vân Con Cua (M1)' : 'Crab Nebula (M1)'}
              </div>
              <div className="text-[10px] text-slate-400">
                {isVi ? 'Siêu tân tinh năm 1054 · Pulsar quay 30 vòng/giây' : 'SN 1054 remnant · 30 Hz spinning pulsar'}
              </div>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-[1fr_210px] gap-3 items-center">
            <div className="space-y-2.5">
              {/* Mass Slider */}
              <div>
                <div className="flex justify-between text-[11px] font-mono mb-1">
                  <span className="text-slate-300">{isVi ? 'KHỐI LƯỢNG SAO' : 'STELLAR MASS'}</span>
                  <span className="text-amber-300 font-bold">{evo.massSolar.toFixed(1)} M☉</span>
                </div>
                <input
                  type="range"
                  data-testid="stellar-mass-slider"
                  min={0.5}
                  max={40}
                  step={0.5}
                  value={massSolar}
                  onChange={(e) => setMassSolar(parseFloat(e.target.value))}
                  aria-label={isVi ? 'Khối lượng sao' : 'Stellar mass'}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>

              {/* Age Evolution Progress Slider */}
              <div>
                <div className="flex justify-between text-[11px] font-mono mb-1">
                  <span className="text-slate-300">{isVi ? 'TIẾN ĐỘ VÒNG ĐỜI' : 'LIFETIME PROGRESS'}</span>
                  <span className="text-cyan-300 font-bold">
                    {Math.round(evo.progress * 100)}% ({evo.ageMyr} Myr)
                  </span>
                </div>
                <input
                  type="range"
                  data-testid="stellar-age-slider"
                  min={0}
                  max={1}
                  step={0.01}
                  value={ageProgress}
                  onChange={(e) => setAgeProgress(parseFloat(e.target.value))}
                  aria-label={isVi ? 'Tiến độ vòng đời sao' : 'Stellar lifecycle progress'}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              {/* Telemetry Chips */}
              <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
                <span className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-200">
                  T = <strong className="text-sky-300">{evo.temperatureK.toLocaleString()} K</strong>
                </span>
                <span className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-200">
                  L = <strong className="text-amber-300">{evo.luminositySolar} L☉</strong>
                </span>
                <span
                  data-testid="stellar-remnant-badge"
                  className="px-2 py-1 rounded-lg bg-fuchsia-500/20 border border-fuchsia-400/45 text-fuchsia-200 font-bold"
                >
                  {isVi ? remnantText.vi : remnantText.en}
                </span>
              </div>
            </div>

            {/* Live SVG Hertzsprung-Russell (H-R) Diagram */}
            <div className="rounded-xl bg-black/65 border border-white/15 p-2">
              <div className="text-[9px] font-mono text-slate-400 flex justify-between mb-1">
                <span>{isVi ? 'BIỂU ĐỒ H-R' : 'H-R DIAGRAM'}</span>
                <span>O B A F G K M</span>
              </div>
              <svg
                data-testid="hr-diagram-svg"
                viewBox="0 0 200 112"
                className="w-full h-[96px] block"
              >
                <defs>
                  <linearGradient id="hrMainSeq" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#60a5fa" />
                    <stop offset="50%" stopColor="#fef08a" />
                    <stop offset="100%" stopColor="#f97316" />
                  </linearGradient>
                </defs>
                {/* Main Sequence Diagonal */}
                <path
                  d="M 18 14 Q 95 54 182 96"
                  stroke="url(#hrMainSeq)"
                  strokeWidth="6"
                  strokeOpacity="0.32"
                  fill="none"
                  strokeLinecap="round"
                />
                {/* Red Supergiant / Giant Branch */}
                <ellipse cx="152" cy="24" rx="34" ry="12" fill="#ef4444" fillOpacity="0.18" />
                {/* White Dwarf Corner */}
                <ellipse cx="48" cy="92" rx="26" ry="8" fill="#bae6fd" fillOpacity="0.2" />
                {/* Live Star Marker */}
                <circle
                  cx={evo.hrX * 200}
                  cy={evo.hrY * 112}
                  r="7"
                  fill={evo.colorHex}
                  fillOpacity="0.3"
                />
                <circle
                  cx={evo.hrX * 200}
                  cy={evo.hrY * 112}
                  r="3.5"
                  fill={evo.colorHex}
                  stroke="#ffffff"
                  strokeWidth="1.2"
                />
              </svg>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
