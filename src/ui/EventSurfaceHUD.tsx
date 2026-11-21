import React, { useEffect, useRef } from 'react';
import { ArrowLeftCircle, Sparkles, Zap, Gauge, Mountain } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { getLocalizedBodyData } from '@/data/celestialData';
import { useTranslation } from '@/i18n';
import {
  getPlanetaryEventById,
  getPlanetaryEvents,
  getSurfaceStageConfig,
  type EventSurfaceBiome,
} from '@/data/planetaryEventsData';
import { ModeOrchestrator } from '@/engine/navigation/ModeOrchestrator';
import { AudioManager } from '@/engine/audio/AudioManager';
import { SimulationManager } from '@/simulation/core/SimulationManager';

interface EventSurfaceHUDProps {
  scenarioActive?: boolean;
}

const BIOME_LABELS: Record<EventSurfaceBiome, { vi: string; en: string; badgeClass: string }> = {
  volcanic_lava: {
    vi: 'Núi Lửa & Dung Nham',
    en: 'Volcanic & Magma',
    badgeClass: 'border-orange-400/45 bg-orange-500/20 text-orange-200',
  },
  cryo_ice_geyser: {
    vi: 'Băng Giá & Mạch Phun',
    en: 'Cryo Ice & Geysers',
    badgeClass: 'border-cyan-400/45 bg-cyan-500/20 text-cyan-200',
  },
  dust_impact_desert: {
    vi: 'Sa Mạc Bụi & Va Chạm',
    en: 'Dust & Impact Basin',
    badgeClass: 'border-amber-400/45 bg-amber-500/20 text-amber-200',
  },
  gas_giant_clouds: {
    vi: 'Biển Mây Hành Tinh Khí',
    en: 'Cloud-Ocean Atmosphere',
    badgeClass: 'border-indigo-400/45 bg-indigo-500/20 text-indigo-200',
  },
  polar_aurora_sky: {
    vi: 'Bầu Trời Cực Quang',
    en: 'Polar Aurora Sky',
    badgeClass: 'border-emerald-400/45 bg-emerald-500/20 text-emerald-200',
  },
};

const INTENSITY_PRESETS = [
  { key: 'low' as const, value: 0.6, vi: 'Nhẹ', en: 'Low' },
  { key: 'normal' as const, value: 1.0, vi: 'Chuẩn', en: 'Normal' },
  { key: 'extreme' as const, value: 1.6, vi: 'Cực Đại', en: 'Extreme' },
];

export const EventSurfaceHUD: React.FC<EventSurfaceHUDProps> = ({ scenarioActive = false }) => {
  const activeEventSurfaceId = useAppStore((s) => s.activeEventSurfaceId);
  const compareMode = useAppStore((s) => s.compareMode);
  const { language } = useTranslation();
  const intensity = useAppStore((s) => s.planetaryEventIntensity);
  const setIntensity = useAppStore((s) => s.setPlanetaryEventIntensity);
  const triggerBurst = useAppStore((s) => s.triggerPlanetaryEventBurst);

  const pillRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Keep the active event pill scrolled smoothly into center view on Mobile & narrow strips (U2 fix)
  useEffect(() => {
    if (!activeEventSurfaceId) return;
    const activeEl = pillRefs.current[activeEventSurfaceId];
    if (activeEl && typeof activeEl.scrollIntoView === 'function') {
      activeEl.scrollIntoView({ behavior: 'auto', inline: 'center', block: 'nearest' });
    }
  }, [activeEventSurfaceId]);

  const isScenarioRunning =
    scenarioActive || SimulationManager.getInstance().getActiveScenario() !== 'none';

  if (!activeEventSurfaceId || compareMode || isScenarioRunning) {
    return null;
  }

  const ev = getPlanetaryEventById(activeEventSurfaceId);
  if (!ev) return null;

  const isVi = language === 'vi';
  const stageCfg = getSurfaceStageConfig(ev.bodyId);
  const biomeMeta = BIOME_LABELS[ev.surfaceBiome];
  const siblingEvents = getPlanetaryEvents(ev.bodyId);
  const worldName = getLocalizedBodyData(ev.bodyId).name;

  const pillMaxWidth =
    siblingEvents.length <= 2
      ? 'max-w-[260px] sm:max-w-[340px]'
      : siblingEvents.length === 3
      ? 'max-w-[210px] sm:max-w-[260px]'
      : 'max-w-[195px] sm:max-w-[215px]';

  const handleExit = () => {
    AudioManager.getInstance().playWarpDrive();
    ModeOrchestrator.getInstance().exitEventSurface();
  };

  const handleBurst = () => {
    triggerBurst(ev.id);
    AudioManager.getInstance().playPlanetaryEventCue(ev.archetype);
  };

  const handleSwitchEvent = (nextId: string) => {
    AudioManager.getInstance().playUIClick();
    ModeOrchestrator.getInstance().enterEventSurface(nextId);
  };

  return (
    <div
      data-testid="event-surface-hud"
      className="fixed inset-0 pointer-events-none z-30 flex flex-col justify-between p-2.5 sm:p-4 overflow-x-hidden"
    >
      {/* Top Row: Telemetry Pill (Left) + Exit to Orbit Pill (Right) */}
      <div className="flex items-start justify-between gap-2 min-w-0">
        <div className="pointer-events-auto max-w-[min(360px,calc(100vw-11rem))] sm:max-w-[390px] rounded-2xl border border-white/15 bg-[#060d1b]/82 backdrop-blur-xl px-3.5 py-2.5 shadow-2xl">
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-cyan-300">
              <Mountain className="w-3 h-3 shrink-0" />
              {worldName}
            </span>
            <span
              className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold tracking-wide ${biomeMeta.badgeClass}`}
            >
              {isVi ? biomeMeta.vi : biomeMeta.en}
            </span>
          </div>
          <h2 className="text-xs sm:text-sm font-bold text-white leading-snug line-clamp-2">
            {isVi ? ev.titleVi : ev.titleEn}
          </h2>
          <p className="hidden sm:block mt-1 text-[11px] leading-relaxed text-slate-300/90 line-clamp-2">
            {isVi ? ev.summaryVi : ev.summaryEn}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px] font-mono text-slate-300">
            <span className="px-2 py-0.5 rounded-md bg-white/10 text-cyan-200">
              {isVi ? ev.metricValueVi : ev.metricValueEn}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-white/5 text-slate-300">
              g = {stageCfg.gravityLabel}
            </span>
          </div>
        </div>

        <button
          type="button"
          data-testid="event-surface-exit-btn"
          onClick={handleExit}
          className="pointer-events-auto shrink-0 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-[#071022]/85 hover:bg-cyan-500/20 hover:border-cyan-400/50 backdrop-blur-xl px-3 sm:px-4 py-2 text-[11px] sm:text-xs font-semibold text-white shadow-xl transition-all cursor-pointer"
        >
          <ArrowLeftCircle className="w-4 h-4 text-cyan-300 shrink-0" />
          <span className="hidden sm:inline">
            {isVi ? 'Thoát Về Quỹ Đạo (ESC)' : 'Return to Orbit (ESC)'}
          </span>
          <span className="sm:hidden">{isVi ? 'Quỹ Đạo' : 'Orbit'}</span>
        </button>
      </div>

      {/* Bottom Row: Zero-Clip Same-World Event Switcher + Burst CTA + Balanced Intensity Presets */}
      <div className="flex justify-center min-w-0">
        <div className="pointer-events-auto w-full max-w-[min(980px,calc(100vw-1.25rem))] rounded-2xl border border-white/15 bg-[#060d1b]/84 backdrop-blur-xl px-2.5 py-2 sm:px-3.5 sm:py-2.5 shadow-2xl flex flex-col gap-2">
          {/* Same-body Event Switcher Pills (all visible unclipped on Desktop via flex-wrap; auto-centered scroll with soft edge mask on Mobile) */}
          <div className="flex items-center gap-1.5 overflow-x-auto sm:overflow-visible sm:flex-wrap sm:justify-center [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-1 sm:px-0 [mask-image:linear-gradient(to_right,transparent,black_10px,black_calc(100%-14px),transparent)] sm:[mask-image:none]">
            <span className="hidden md:inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 shrink-0 mr-0.5">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              {isVi ? 'Hiện Tượng:' : 'Events:'}
            </span>
            {siblingEvents.map((item) => {
              const selected = item.id === ev.id;
              return (
                <button
                  key={item.id}
                  ref={(el) => {
                    pillRefs.current[item.id] = el;
                  }}
                  type="button"
                  data-testid={`event-surface-switch-${item.id}`}
                  aria-pressed={selected}
                  onClick={() => handleSwitchEvent(item.id)}
                  className={`shrink-0 ${pillMaxWidth} truncate rounded-full px-2.5 py-1 text-[11px] font-medium border transition-all cursor-pointer ${
                    selected
                      ? 'border-cyan-400/65 bg-cyan-500/25 text-white shadow-sm shadow-cyan-500/20'
                      : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                  title={isVi ? item.titleVi : item.titleEn}
                >
                  {isVi ? item.titleVi : item.titleEn}
                </button>
              );
            })}
          </div>

          {/* Burst Trigger & 3 Intensity Presets (full-width balanced grid on Mobile, crisp split row on Desktop) */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <button
              type="button"
              data-testid="event-surface-burst-btn"
              onClick={handleBurst}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl border border-amber-400/55 bg-amber-500/22 hover:bg-amber-500/35 px-3.5 py-1.5 text-xs font-semibold text-amber-100 shadow-lg shadow-amber-500/15 transition-all cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              <span>{isVi ? 'Bùng Phát Cận Cảnh' : 'Trigger Close-Up Burst'}</span>
            </button>

            <div className="grid grid-cols-3 sm:flex sm:items-center gap-1.5 sm:gap-1 w-full sm:w-auto">
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-medium text-slate-400 mr-1">
                <Gauge className="w-3 h-3" />
                {isVi ? 'Cường độ:' : 'Intensity:'}
              </span>
              {INTENSITY_PRESETS.map((preset) => {
                const isActive = Math.abs(intensity - preset.value) < 0.08;
                return (
                  <button
                    key={preset.key}
                    type="button"
                    data-testid={`event-surface-intensity-${preset.key}`}
                    aria-pressed={isActive}
                    onClick={() => {
                      AudioManager.getInstance().playUIClick();
                      setIntensity(preset.value);
                    }}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-medium border text-center transition-all cursor-pointer ${
                      isActive
                        ? 'border-cyan-400/65 bg-cyan-500/25 text-white'
                        : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    {isVi ? preset.vi : preset.en}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
