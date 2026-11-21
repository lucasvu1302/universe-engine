import React, { useEffect, useRef, useState } from "react";
import {
  Globe2,
  Play,
  Pause,
  RotateCcw,
  X,
  Thermometer,
  Wind,
  Flame,
  Waves,
  Sparkles,
  AlertTriangle
} from "lucide-react";
import { SimulationEventBus } from "../core/SimulationEventBus";
import { SimulationManager } from "../core/SimulationManager";
import { EarthTimelineController, EarthClimateState } from "./EarthTimelineController";
import { EARTH_PERIODS } from "../data/earthHistoryData";
import { HistoricalEvent } from "../core/types";
import { useTranslation } from "@/i18n";

export const EarthTimelineHUD: React.FC = () => {
  const { isVietnamese: isVi } = useTranslation();

  const eventBus = SimulationEventBus.getInstance();
  const simulationManager = SimulationManager.getInstance();
  const timeline = simulationManager.getTimelineEngine();
  const controller = EarthTimelineController.getInstance();

  const [climate, setClimate] = useState<EarthClimateState>(controller.getState());
  const [isPlaying, setIsPlaying] = useState(timeline.getIsPlaying());
  const [speed, setSpeed] = useState(timeline.getSpeed());
  const [activeEvent, setActiveEvent] = useState<HistoricalEvent | null>(null);

  const lastHudUpdateMsRef = useRef<number>(0);
  const lastPeriodIdRef = useRef<string>(climate.currentPeriod.id);
  const lastRenderedTimeRef = useRef<number>(climate.millionYearsAgo);

  useEffect(() => {
    const unsubTime = eventBus.on("timeline:time_update", (time) => {
      const currentState = controller.getState();
      const nextClimate =
        Math.abs(currentState.millionYearsAgo - time) < 1e-6
          ? currentState
          : controller.evaluateAtMa(time);
      const now = performance.now();
      const periodChanged = nextClimate.currentPeriod.id !== lastPeriodIdRef.current;
      const hitNewBoundary =
        (lastRenderedTimeRef.current > -4540 && time <= -4540) ||
        (lastRenderedTimeRef.current < 0 && time >= 0);

      if (periodChanged || hitNewBoundary || now - lastHudUpdateMsRef.current >= 67) {
        lastHudUpdateMsRef.current = now;
        lastPeriodIdRef.current = nextClimate.currentPeriod.id;
        lastRenderedTimeRef.current = time;
        setClimate({ ...nextClimate });
      }
    });

    const unsubPlay = eventBus.on("timeline:play_state_change", (playing) => {
      setIsPlaying(playing);
    });

    const unsubSpeed = eventBus.on("timeline:speed_change", (spd) => {
      setSpeed(spd);
    });

    const unsubEvent = eventBus.on("earth:event_trigger", (ev) => {
      setActiveEvent(ev);
    });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") simulationManager.exitScenario();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      unsubTime();
      unsubPlay();
      unsubSpeed();
      unsubEvent();
      window.removeEventListener("keydown", onKey);
    };
  }, [eventBus, controller, simulationManager]);

  const formatTimeLabel = (ma: number) => {
    const absMa = Math.abs(ma);
    if (absMa >= 1000) {
      return `${(absMa / 1000).toFixed(2)} ${isVi ? "Tỷ năm trước" : "Billion Years Ago (Ga)"}`;
    }
    if (absMa >= 1) {
      return `${absMa.toFixed(1)} ${isVi ? "Triệu năm trước" : "Million Years Ago (Ma)"}`;
    }
    if (absMa > 0) {
      return `${Math.round(absMa * 1000)} ${isVi ? "Nghìn năm trước" : "Thousand Years Ago"}`;
    }
    return isVi ? "Thời Điểm Hiện Tại" : "Present Day";
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const ma = parseFloat(e.target.value);
    timeline.seek(ma);
  };

  const handleJumpToPeriod = (startMa: number) => {
    timeline.seek(startMa);
  };

  const handleSpeedChange = (newSpeed: number) => {
    timeline.setSpeed(newSpeed);
  };

  const curPeriod = climate.currentPeriod;
  const periodDesc = isVi ? curPeriod.description : curPeriod.descriptionEn || curPeriod.description;
  const lifeforms = isVi
    ? curPeriod.keyLifeforms
    : curPeriod.keyLifeformsEn || curPeriod.keyLifeforms;

  return (
    <div className="fixed inset-0 pointer-events-none z-30 flex flex-col justify-between p-2.5 sm:p-4 md:p-6 select-none font-mono">
      {/* 1. TOP HEADER & CLIMATE METRICS (Responsive wrap on 390px) */}
      <div className="flex flex-wrap md:flex-nowrap items-center justify-between gap-2 sm:gap-3">
        <div className="glass-panel px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl flex items-center space-x-2.5 pointer-events-auto border border-emerald-500/30 bg-slate-950/80 backdrop-blur-md">
          <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
            <Globe2 className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[11px] sm:text-xs text-emerald-400 font-semibold tracking-wider uppercase">
                {isVi ? "Lịch Sử Địa Chất Trái Đất" : "Earth Geological Timeline"}
              </span>
            </div>
            <div className="text-sm sm:text-base md:text-lg font-bold text-white tracking-wide">
              {isVi ? curPeriod.displayName : curPeriod.name}
            </div>
            <div className="text-[11px] sm:text-xs font-mono text-cyan-300 font-semibold">
              {formatTimeLabel(climate.millionYearsAgo)}
            </div>
          </div>
        </div>

        <div className="pointer-events-auto md:order-3">
          <button
            onClick={() => simulationManager.exitScenario()}
            className="glass-panel px-3 py-2 rounded-xl flex items-center space-x-1.5 text-rose-300 hover:text-rose-200 hover:bg-rose-500/20 border border-rose-500/30 transition-all cursor-pointer bg-slate-950/80 backdrop-blur-md"
            title={isVi ? "Thoát dòng thời gian" : "Exit Timeline"}
          >
            <X className="w-4 h-4" />
            <span className="text-xs font-semibold">
              {isVi ? "Thoát" : "Exit"}
            </span>
          </button>
        </div>

        <div className="w-full md:w-auto md:order-2 glass-panel px-3 sm:px-5 py-2 rounded-xl pointer-events-auto flex flex-wrap items-center justify-center gap-x-4 sm:gap-x-5 gap-y-1.5 border border-white/10 bg-slate-950/80 backdrop-blur-md">
          <div className="flex items-center space-x-1.5">
            <Thermometer className="w-4 h-4 text-rose-400 shrink-0" />
            <div>
              <div className="text-[9px] sm:text-[10px] text-slate-400 uppercase tracking-wider">
                {isVi ? "Nhiệt độ" : "Temp"}
              </div>
              <div className="text-xs sm:text-sm font-bold text-rose-300">
                {climate.meanTempC.toFixed(0)}°C
              </div>
            </div>
          </div>

          <div className="hidden sm:block w-[1px] h-6 bg-white/10" />

          <div className="flex items-center space-x-1.5">
            <Wind className="w-4 h-4 text-cyan-400 shrink-0" />
            <div>
              <div className="text-[9px] sm:text-[10px] text-slate-400 uppercase tracking-wider">
                O₂
              </div>
              <div className="text-xs sm:text-sm font-bold text-cyan-300">
                {climate.o2Percent.toFixed(1)}%
              </div>
            </div>
          </div>

          <div className="hidden sm:block w-[1px] h-6 bg-white/10" />

          <div className="flex items-center space-x-1.5">
            <Flame className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <div className="text-[9px] sm:text-[10px] text-slate-400 uppercase tracking-wider">
                CO₂
              </div>
              <div className="text-xs sm:text-sm font-bold text-amber-300">
                {climate.co2Ppm.toLocaleString()} ppm
              </div>
            </div>
          </div>

          <div className="hidden sm:block w-[1px] h-6 bg-white/10" />

          <div className="flex items-center space-x-1.5">
            <Waves className="w-4 h-4 text-blue-400 shrink-0" />
            <div>
              <div className="text-[9px] sm:text-[10px] text-slate-400 uppercase tracking-wider">
                {isVi ? "Mực Biển" : "Sea Level"}
              </div>
              <div className="text-xs sm:text-sm font-bold text-blue-300">
                {climate.seaLevelM > 0 ? `+${climate.seaLevelM.toFixed(0)}` : climate.seaLevelM.toFixed(0)} m
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. BOTTOM: STORYTELLING CARD & CONTROLS */}
      <div className="flex flex-col space-y-2.5 pointer-events-auto max-w-4xl mx-auto w-full">
        <div className="glass-panel p-3 sm:p-4 rounded-2xl border border-emerald-500/20 bg-slate-950/85 backdrop-blur-lg shadow-2xl transition-all duration-300">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
              <h4 className="text-xs sm:text-sm md:text-base font-bold text-white tracking-wide">
                {isVi ? curPeriod.displayName : curPeriod.name}
              </h4>
            </div>
            <div className="hidden sm:flex flex-wrap gap-1.5 justify-end">
              {lifeforms.map((life, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-sans"
                >
                  {life}
                </span>
              ))}
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-300 mt-1.5 leading-relaxed font-sans">
            {periodDesc}
          </p>

          {activeEvent && (
            <div className="mt-2.5 p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-xs font-sans text-amber-200 flex items-start space-x-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-bold text-amber-300 flex items-center flex-wrap gap-2">
                  <span>{isVi ? activeEvent.title : activeEvent.titleEn || activeEvent.title}</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/20 rounded text-amber-300 uppercase font-mono">
                    {activeEvent.millionYearsAgo} Ma
                  </span>
                </div>
                <div className="text-[11px] text-amber-100/90 mt-0.5">
                  {isVi
                    ? activeEvent.description
                    : activeEvent.descriptionEn || activeEvent.description}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="glass-panel px-3 sm:px-4 py-2.5 sm:py-3 rounded-2xl border border-white/10 bg-slate-950/85 backdrop-blur-lg flex flex-col space-y-2 shadow-2xl">
          <div className="flex items-center justify-between gap-1 overflow-x-auto no-scrollbar py-0.5">
            {EARTH_PERIODS.map((period) => (
              <button
                key={period.id}
                onClick={() =>
                  handleJumpToPeriod(
                    period.id === "modern"
                      ? 0
                      : period.id === "ice-age"
                      ? -2.58
                      : period.startMa
                  )
                }
                className={`px-2.5 py-1 rounded-lg text-[11px] transition-all duration-200 cursor-pointer whitespace-nowrap ${
                  curPeriod.id === period.id
                    ? "bg-emerald-500/30 text-emerald-300 font-bold border border-emerald-500/40 shadow-sm shadow-emerald-500/20"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {isVi ? period.displayName.split(" (")[0] : period.name}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3">
            <div className="flex items-center space-x-2 shrink-0">
              <button
                onClick={() => timeline.togglePlay()}
                className="p-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold cursor-pointer transition-all hover:scale-105 shadow-md shadow-emerald-500/20 shrink-0"
                title={isPlaying ? (isVi ? "Tạm dừng" : "Pause") : isVi ? "Phát" : "Play"}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>

              <button
                onClick={() => timeline.seek(-4540)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer transition-all shrink-0"
                title={isVi ? "Về Thời Kỳ Khởi Nguyên" : "Restart to Hadean"}
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <div className="flex items-center bg-slate-900 rounded-lg p-0.5 border border-white/5 shrink-0">
                {[20, 50, 150, 400].map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSpeedChange(s)}
                    className={`px-2 py-1 rounded text-xs transition-all cursor-pointer ${
                      speed === s
                        ? "bg-emerald-500/30 text-emerald-300 font-bold"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>

            <div className="relative flex-1 min-w-[140px] flex items-center">
              <input
                type="range"
                min={-4540}
                max={0}
                step="any"
                value={climate.millionYearsAgo}
                onChange={handleSeek}
                aria-label={isVi ? "Thanh thời gian địa chất" : "Geological timeline scrubber"}
                className="w-full accent-emerald-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer appearance-none transition-colors"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
