import React, { useEffect, useState } from "react";
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

  useEffect(() => {
    const unsubTime = eventBus.on("timeline:time_update", (time) => {
      setClimate({ ...controller.evaluateAtMa(time) });
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

    return () => {
      unsubTime();
      unsubPlay();
      unsubSpeed();
      unsubEvent();
    };
  }, [eventBus, controller]);

  // Format million years ago
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

  return (
    <div className="fixed inset-0 pointer-events-none z-30 flex flex-col justify-between p-4 md:p-6 select-none font-mono">
      {/* ---------------------------------------------------- */}
      {/* 1. TOP HEADER & CLIMATE METRICS                      */}
      {/* ---------------------------------------------------- */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Left: Title & Era Badge */}
        <div className="glass-panel px-4 py-2 rounded-xl flex items-center space-x-3 pointer-events-auto border border-emerald-500/30 bg-slate-950/80 backdrop-blur-md">
          <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
            <Globe2 className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-emerald-400 font-semibold tracking-wider uppercase">
                {isVi ? "Lịch Sử Địa Chất Trái Đất" : "Earth Geological Timeline"}
              </span>
            </div>
            <div className="text-base md:text-lg font-bold text-white tracking-wide">
              {isVi ? climate.currentPeriod.displayName : climate.currentPeriod.name}
            </div>
            <div className="text-xs font-mono text-cyan-300 font-semibold">
              {formatTimeLabel(climate.millionYearsAgo)}
            </div>
          </div>
        </div>

        {/* Center: Climate & Atmosphere Sensors */}
        <div className="glass-panel px-5 py-2.5 rounded-xl pointer-events-auto flex items-center space-x-5 border border-white/10 bg-slate-950/80 backdrop-blur-md">
          {/* Temperature */}
          <div className="flex items-center space-x-2">
            <Thermometer className="w-4 h-4 text-rose-400 shrink-0" />
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">
                {isVi ? "Nhiệt độ" : "Temp"}
              </div>
              <div className="text-xs md:text-sm font-bold text-rose-300">
                {climate.meanTempC.toFixed(0)}°C
              </div>
            </div>
          </div>

          <div className="w-[1px] h-6 bg-white/10" />

          {/* O2 Concentration */}
          <div className="flex items-center space-x-2">
            <Wind className="w-4 h-4 text-cyan-400 shrink-0" />
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">
                O₂
              </div>
              <div className="text-xs md:text-sm font-bold text-cyan-300">
                {climate.o2Percent.toFixed(1)}%
              </div>
            </div>
          </div>

          <div className="w-[1px] h-6 bg-white/10" />

          {/* CO2 Concentration */}
          <div className="flex items-center space-x-2">
            <Flame className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">
                CO₂
              </div>
              <div className="text-xs md:text-sm font-bold text-amber-300">
                {climate.co2Ppm.toLocaleString()} ppm
              </div>
            </div>
          </div>

          <div className="w-[1px] h-6 bg-white/10" />

          {/* Sea Level */}
          <div className="flex items-center space-x-2">
            <Waves className="w-4 h-4 text-blue-400 shrink-0" />
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">
                {isVi ? "Mực Biển" : "Sea Level"}
              </div>
              <div className="text-xs md:text-sm font-bold text-blue-300">
                {climate.seaLevelM > 0 ? `+${climate.seaLevelM.toFixed(0)}` : climate.seaLevelM.toFixed(0)} m
              </div>
            </div>
          </div>
        </div>

        {/* Right: Exit Button */}
        <div className="pointer-events-auto">
          <button
            onClick={() => simulationManager.exitScenario()}
            className="glass-panel px-3.5 py-2 rounded-xl flex items-center space-x-2 text-rose-300 hover:text-rose-200 hover:bg-rose-500/20 border border-rose-500/30 transition-all cursor-pointer bg-slate-950/80 backdrop-blur-md"
            title={isVi ? "Thoát dòng thời gian" : "Exit Timeline"}
          >
            <X className="w-4 h-4" />
            <span className="text-xs font-semibold">
              {isVi ? "Thoát" : "Exit"}
            </span>
          </button>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 2. BOTTOM: STORYTELLING CARD & CONTROLS             */}
      {/* ---------------------------------------------------- */}
      <div className="flex flex-col space-y-3 pointer-events-auto max-w-4xl mx-auto w-full">
        {/* Story Card with Lifeforms & Extinction alert */}
        <div className="glass-panel p-4 rounded-2xl border border-emerald-500/20 bg-slate-950/85 backdrop-blur-lg shadow-2xl animate-fade-in">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
              <h4 className="text-sm md:text-base font-bold text-white tracking-wide">
                {isVi ? climate.currentPeriod.displayName : climate.currentPeriod.name}
              </h4>
            </div>
            {/* Dominant Lifeforms Pills */}
            <div className="hidden sm:flex flex-wrap gap-1.5 justify-end">
              {climate.currentPeriod.keyLifeforms.map((life, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-sans"
                >
                  {life}
                </span>
              ))}
            </div>
          </div>

          <p className="text-xs md:text-sm text-slate-300 mt-2 leading-relaxed font-sans">
            {climate.currentPeriod.description}
          </p>

          {/* Geological / Extinction Event Callout */}
          {activeEvent && (
            <div className="mt-2.5 p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-xs font-sans text-amber-200 flex items-start space-x-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-bold text-amber-300 flex items-center space-x-2">
                  <span>{activeEvent.title}</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/20 rounded text-amber-300 uppercase font-mono">
                    {activeEvent.millionYearsAgo} Ma
                  </span>
                </div>
                <div className="text-[11px] text-amber-100/90 mt-0.5">
                  {activeEvent.description}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Timeline Control Bar & Epoch Markers */}
        <div className="glass-panel px-4 py-3 rounded-2xl border border-white/10 bg-slate-950/85 backdrop-blur-lg flex flex-col space-y-2 shadow-2xl">
          {/* Epoch Quick Jump Pills */}
          <div className="flex items-center justify-between gap-1 overflow-x-auto no-scrollbar py-0.5">
            {EARTH_PERIODS.map((period) => (
              <button
                key={period.id}
                onClick={() => handleJumpToPeriod(period.startMa)}
                className={`px-2.5 py-1 rounded-lg text-[11px] transition-all cursor-pointer whitespace-nowrap ${
                  climate.currentPeriod.id === period.id
                    ? "bg-emerald-500/30 text-emerald-300 font-bold border border-emerald-500/40"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {isVi ? period.displayName.split(" (")[0] : period.name}
              </button>
            ))}
          </div>

          {/* Scrubber and Play/Pause */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => timeline.togglePlay()}
              className="p-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold cursor-pointer transition-all hover:scale-105 shadow-md shadow-emerald-500/20 shrink-0"
              title={isPlaying ? "Pause" : "Play"}
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

            {/* Speed Selector */}
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

            {/* Scrubber slider */}
            <div className="relative flex-1 flex items-center">
              <input
                type="range"
                min={-4540}
                max={0}
                step={1}
                value={climate.millionYearsAgo}
                onChange={handleSeek}
                className="w-full accent-emerald-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer appearance-none"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
