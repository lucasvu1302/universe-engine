import React, { useEffect, useState } from "react";
import {
  Sparkles,
  Play,
  Pause,
  RotateCcw,
  X,
  Zap,
  Info
} from "lucide-react";
import { SimulationEventBus } from "../core/SimulationEventBus";
import { SimulationManager } from "../core/SimulationManager";
import { CosmicEventManager, CosmicPlaybackState } from "./CosmicEventManager";
import { COSMIC_EVENTS } from "../data/cosmicEventsData";
import { useTranslation } from "@/i18n";

export const CosmicTimelineHUD: React.FC = () => {
  const { isVietnamese: isVi } = useTranslation();

  const eventBus = SimulationEventBus.getInstance();
  const simulationManager = SimulationManager.getInstance();
  const timeline = simulationManager.getTimelineEngine();
  const manager = CosmicEventManager.getInstance();

  const [playback, setPlayback] = useState<CosmicPlaybackState>(manager.getPlaybackState());
  const [isPlaying, setIsPlaying] = useState(timeline.getIsPlaying());
  const [currentTime, setCurrentTime] = useState(timeline.getCurrentTime());
  const [speed, setSpeed] = useState(timeline.getSpeed());

  useEffect(() => {
    const unsubTime = eventBus.on("timeline:time_update", (time) => {
      setCurrentTime(time);
      setPlayback({ ...manager.evaluateAtTime(time) });
    });

    const unsubPlay = eventBus.on("timeline:play_state_change", (playing) => {
      setIsPlaying(playing);
    });

    const unsubSpeed = eventBus.on("timeline:speed_change", (spd) => {
      setSpeed(spd);
    });

    return () => {
      unsubTime();
      unsubPlay();
      unsubSpeed();
    };
  }, [eventBus, manager]);

  const handleSelectEvent = (index: number) => {
    // Jump timeline to event start time (index * 15 seconds)
    const targetTime = index * 15;
    timeline.seek(targetTime);
    manager.selectEventByIndex(index);
    timeline.play();
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = parseFloat(e.target.value);
    setCurrentTime(t);
    timeline.seek(t);
  };

  const handleSpeedToggle = () => {
    const nextSpeed = speed === 1.0 ? 2.0 : speed === 2.0 ? 0.5 : 1.0;
    timeline.setSpeed(nextSpeed);
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-30 flex flex-col justify-between p-4 md:p-6 select-none font-mono">
      {/* ---------------------------------------------------- */}
      {/* 1. TOP HEADER & TITLE                                */}
      {/* ---------------------------------------------------- */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="glass-panel px-4 py-2 rounded-xl flex items-center space-x-3 pointer-events-auto border border-purple-500/30 bg-slate-950/80 backdrop-blur-md">
          <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400">
            <Zap className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-purple-400 font-semibold tracking-wider uppercase">
                {isVi ? "Sự Kiện Vũ Trụ & Khởi Sinh" : "Cosmic History & Events"}
              </span>
            </div>
            <div className="text-base md:text-lg font-bold text-white tracking-wide">
              {playback.currentEvent.title}
            </div>
          </div>
        </div>

        {/* Right: Exit Button */}
        <div className="pointer-events-auto">
          <button
            onClick={() => simulationManager.exitScenario()}
            className="glass-panel px-3.5 py-2 rounded-xl flex items-center space-x-2 text-rose-300 hover:text-rose-200 hover:bg-rose-500/20 border border-rose-500/30 transition-all cursor-pointer bg-slate-950/80 backdrop-blur-md"
            title={isVi ? "Thoát sự kiện vũ trụ" : "Exit Cosmic Events"}
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
      <div className="flex flex-col space-y-3 pointer-events-auto max-w-3xl mx-auto w-full">
        {/* Storytelling Card */}
        <div className="glass-panel p-4 rounded-2xl border border-purple-500/20 bg-slate-950/85 backdrop-blur-lg shadow-2xl animate-fade-in">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
              <h4 className="text-sm md:text-base font-bold text-white tracking-wide">
                {playback.currentEvent.title}
              </h4>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono font-bold">
              {playback.currentEvent.timeGyrAgo > 0
                ? `${playback.currentEvent.timeGyrAgo} Ga`
                : isVi
                ? "+4.5 Ga Nữa"
                : "+4.5 Ga Future"}
            </span>
          </div>

          <p className="text-xs text-purple-300/80 font-medium mt-0.5">
            {playback.currentEvent.subtitle}
          </p>

          <p className="text-xs md:text-sm text-slate-300 mt-2 leading-relaxed font-sans">
            {playback.currentEvent.description}
          </p>

          {playback.currentEvent.scientificFact && (
            <div className="mt-2.5 p-2 rounded-xl bg-purple-950/40 border border-purple-500/30 text-[11px] font-sans text-purple-200 flex items-start space-x-2">
              <Info className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold text-purple-300 uppercase text-[10px] mr-1.5">
                  {isVi ? "Sự thật khoa học:" : "Science Fact:"}
                </span>
                <span>{playback.currentEvent.scientificFact}</span>
              </div>
            </div>
          )}
        </div>

        {/* Timeline Control Bar & Event Jump Pills */}
        <div className="glass-panel px-4 py-3 rounded-2xl border border-white/10 bg-slate-950/85 backdrop-blur-lg flex flex-col space-y-2 shadow-2xl">
          {/* Quick Jump Event Pills */}
          <div className="flex items-center justify-between gap-1 overflow-x-auto no-scrollbar py-0.5">
            {COSMIC_EVENTS.map((event, idx) => (
              <button
                key={event.id}
                onClick={() => handleSelectEvent(idx)}
                className={`px-2.5 py-1 rounded-lg text-[11px] transition-all cursor-pointer whitespace-nowrap ${
                  playback.currentEvent.id === event.id
                    ? "bg-purple-500/30 text-purple-300 font-bold border border-purple-500/40"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {event.title.split(" (")[0]}
              </button>
            ))}
          </div>

          {/* Controls & Scrubber */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => timeline.togglePlay()}
              className="p-2 rounded-xl bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold cursor-pointer transition-all hover:scale-105 shadow-md shadow-purple-500/20 shrink-0"
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>

            <button
              onClick={() => {
                timeline.seek(0);
                timeline.play();
              }}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer transition-all shrink-0"
              title={isVi ? "Xem Lại Từ Big Bang" : "Restart to Big Bang"}
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Speed toggle */}
            <button
              onClick={handleSpeedToggle}
              className="px-2 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-[11px] font-bold text-purple-300 border border-purple-500/20 cursor-pointer transition-all shrink-0"
              title={isVi ? "Tốc độ phát" : "Playback Speed"}
            >
              {speed}x
            </button>

            {/* Scrubber slider across 75s */}
            <div className="relative flex-1 flex items-center">
              <input
                type="range"
                min={0}
                max={75}
                step={0.1}
                value={currentTime}
                onChange={handleSeek}
                className="w-full accent-purple-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer appearance-none"
              />
            </div>

            {/* Current Time Display */}
            <div className="text-[10px] text-slate-400 font-mono shrink-0 pl-1">
              {Math.min(75, Math.max(0, currentTime)).toFixed(1)}s / 75s
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
