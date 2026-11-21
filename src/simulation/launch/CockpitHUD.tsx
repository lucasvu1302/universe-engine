import React, { useEffect, useRef, useState } from "react";
import {
  Rocket,
  Play,
  Pause,
  Camera,
  X,
  RotateCcw,
  Sparkles,
  ChevronRight
} from "lucide-react";
import { SimulationEventBus } from "../core/SimulationEventBus";
import { CameraDirector } from "../camera/CameraDirector";
import { SimulationManager } from "../core/SimulationManager";
import { LaunchTrajectoryState, LaunchController } from "./LaunchController";
import { SimulationCameraMode } from "../core/types";
import { LAUNCH_PHASE_LABELS, LAUNCH_STEPS } from "../data/launchProfileData";
import { useTranslation } from "@/i18n";

export const CockpitHUD: React.FC = () => {
  const { isVietnamese: isVi } = useTranslation();

  const eventBus = SimulationEventBus.getInstance();
  const cameraDirector = CameraDirector.getInstance();
  const simulationManager = SimulationManager.getInstance();
  const timeline = simulationManager.getTimelineEngine();
  const launchController = LaunchController.getInstance();

  const [trajectory, setTrajectory] = useState<LaunchTrajectoryState>(
    launchController.getTrajectoryState()
  );
  const [isPlaying, setIsPlaying] = useState(timeline.getIsPlaying());
  const [speed, setSpeed] = useState(timeline.getSpeed());
  const [activeCamera, setActiveCamera] = useState<SimulationCameraMode>(
    cameraDirector.getMode()
  );
  const [dismissedStepId, setDismissedStepId] = useState<string | null>(null);

  const lastHudUpdateMsRef = useRef<number>(0);
  const lastStepIdRef = useRef<string>(trajectory.currentStep.id);
  const lastRenderedTimeRef = useRef<number>(trajectory.timeSeconds);

  useEffect(() => {
    const unsubTime = eventBus.on("timeline:time_update", () => {
      const nextTraj = launchController.getTrajectoryState();
      const now = performance.now();
      const stepChanged = nextTraj.currentStep.id !== lastStepIdRef.current;
      const hitNewBoundary =
        (lastRenderedTimeRef.current > 0 && nextTraj.timeSeconds <= 0) ||
        (lastRenderedTimeRef.current < 360 && nextTraj.timeSeconds >= 360);

      if (stepChanged || hitNewBoundary || now - lastHudUpdateMsRef.current >= 67) {
        lastHudUpdateMsRef.current = now;
        lastStepIdRef.current = nextTraj.currentStep.id;
        lastRenderedTimeRef.current = nextTraj.timeSeconds;
        setTrajectory({ ...nextTraj });
      }
    });

    const unsubPlay = eventBus.on("timeline:play_state_change", (playing) => {
      setIsPlaying(playing);
    });

    const unsubSpeed = eventBus.on("timeline:speed_change", (spd) => {
      setSpeed(spd);
    });

    const unsubCam = eventBus.on("camera:mode_change", (mode) => {
      setActiveCamera(mode);
    });

    const unsubExitKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        simulationManager.exitScenario();
      }
    };
    window.addEventListener("keydown", unsubExitKey);

    return () => {
      unsubTime();
      unsubPlay();
      unsubSpeed();
      unsubCam();
      window.removeEventListener("keydown", unsubExitKey);
    };
  }, [eventBus, launchController, simulationManager]);

  const formatMET = (timeSec: number) => {
    const m = Math.floor(timeSec / 60);
    const s = Math.floor(timeSec % 60);
    return `T+${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const handleCameraSelect = (mode: SimulationCameraMode) => {
    cameraDirector.setMode(mode);
  };

  const handleSpeedChange = (newSpeed: number) => {
    timeline.setSpeed(newSpeed);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = parseFloat(e.target.value);
    timeline.seek(target);
  };

  const gColor =
    trajectory.accelerationG > 3.0
      ? "text-rose-400"
      : trajectory.accelerationG > 2.0
      ? "text-amber-400"
      : "text-emerald-400";

  const activeStep = trajectory.currentStep;
  const phaseBadge = isVi
    ? LAUNCH_PHASE_LABELS[activeStep.phase]?.vi || activeStep.phase
    : LAUNCH_PHASE_LABELS[activeStep.phase]?.en || activeStep.phase;
  const activeNarration =
    dismissedStepId === activeStep.id
      ? null
      : isVi
      ? activeStep.narration || null
      : activeStep.narrationEn || activeStep.narration || null;

  const cameraButtons = (
    [
      { mode: "COCKPIT", labelVi: "Khoang Lái", labelEn: "Cockpit" },
      { mode: "WINDOW", labelVi: "Cửa Sổ Nhìn Đất", labelEn: "Window" },
      { mode: "FOLLOW", labelVi: "Theo Dõi Tàu", labelEn: "Follow" },
      { mode: "CINEMATIC", labelVi: "Điện Ảnh", labelEn: "Cinematic" }
    ] as const
  );

  return (
    <div className="fixed inset-0 pointer-events-none z-30 flex flex-col justify-between p-2.5 sm:p-4 md:p-6 select-none font-mono">
      {/* 1. TOP ROW: HEADER · FLIGHT GAUGES · EXIT (shrink-0 -> never collides with Row 2!) */}
      <div className="shrink-0 flex flex-wrap md:flex-nowrap items-center justify-between gap-2 sm:gap-3">
        {/* Left: Mission Logo & Status */}
        <div
          data-testid="launch-header-badge"
          className="glass-panel px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl flex items-center space-x-2.5 pointer-events-auto border border-cyan-500/30 bg-slate-950/80 backdrop-blur-md"
        >
          <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400">
            <Rocket className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center flex-wrap gap-1.5">
              <span className="text-[11px] sm:text-xs text-cyan-400 font-semibold tracking-wider uppercase">
                {isVi ? "Mô Phỏng Phóng Tàu" : "Launch Simulation"}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] bg-cyan-500/20 text-cyan-300 font-bold">
                {phaseBadge}
              </span>
            </div>
            <div className="text-base sm:text-lg font-bold text-white tracking-widest">
              {formatMET(trajectory.timeSeconds)}
            </div>
          </div>
        </div>

        {/* Right on mobile / far-right on desktop: Exit Button */}
        <div className="pointer-events-auto md:order-3">
          <button
            data-testid="launch-exit-btn"
            onClick={() => simulationManager.exitScenario()}
            className="glass-panel px-3 py-2 rounded-xl flex items-center space-x-1.5 text-rose-300 hover:text-rose-200 hover:bg-rose-500/20 border border-rose-500/30 transition-all cursor-pointer bg-slate-950/80 backdrop-blur-md"
            title={isVi ? "Thoát mô phỏng" : "Exit Simulation"}
          >
            <X className="w-4 h-4" />
            <span className="text-xs font-semibold">
              {isVi ? "Thoát" : "Exit"}
            </span>
          </button>
        </div>

        {/* Center: Flight Gauges */}
        <div className="w-full md:w-auto md:order-2 glass-panel px-3 sm:px-5 py-2 rounded-xl pointer-events-auto flex flex-wrap items-center justify-center gap-x-3.5 sm:gap-x-5 gap-y-1.5 border border-white/10 bg-slate-950/80 backdrop-blur-md">
          <div className="text-center">
            <div className="text-[9px] sm:text-[10px] text-slate-400 uppercase tracking-wider">
              {isVi ? "Độ cao" : "Altitude"}
            </div>
            <div className="text-xs sm:text-sm md:text-base font-bold text-cyan-300">
              {trajectory.altitudeKm.toFixed(1)}{" "}
              <span className="text-[10px] font-normal text-slate-400">km</span>
            </div>
          </div>

          <div className="hidden sm:block w-[1px] h-6 bg-white/10" />

          <div className="text-center">
            <div className="text-[9px] sm:text-[10px] text-slate-400 uppercase tracking-wider">
              {isVi ? "Vận tốc" : "Speed"}
            </div>
            <div className="text-xs sm:text-sm md:text-base font-bold text-emerald-400">
              {(trajectory.velocityKms * 3600).toLocaleString(undefined, {
                maximumFractionDigits: 0
              })}{" "}
              <span className="text-[10px] font-normal text-slate-400">km/h</span>
            </div>
          </div>

          <div className="hidden sm:block w-[1px] h-6 bg-white/10" />

          <div className="text-center">
            <div className="text-[9px] sm:text-[10px] text-slate-400 uppercase tracking-wider">
              Mach
            </div>
            <div className="text-xs sm:text-sm md:text-base font-bold text-indigo-300">
              M {trajectory.machNumber.toFixed(1)}
            </div>
          </div>

          <div className="hidden sm:block w-[1px] h-6 bg-white/10" />

          <div className="text-center">
            <div className="text-[9px] sm:text-[10px] text-slate-400 uppercase tracking-wider">
              G-Force
            </div>
            <div className={`text-xs sm:text-sm md:text-base font-bold ${gColor}`}>
              {trajectory.accelerationG.toFixed(1)} G
            </div>
          </div>

          <div className="hidden sm:block w-[1px] h-6 bg-white/10" />

          <div className="text-center">
            <div className="text-[9px] sm:text-[10px] text-slate-400 uppercase tracking-wider">
              {isVi ? "Góc Nghiêng" : "Pitch"}
            </div>
            <div className="text-xs sm:text-sm md:text-base font-bold text-amber-300">
              {trajectory.pitchDeg.toFixed(0)}°
            </div>
          </div>
        </div>
      </div>

      {/* 2. MIDDLE ROW: IN-FLOW NARRATION CARD (LEFT) & CAMERA SELECTOR (RIGHT) — Guaranteed >= 12px below top bar! */}
      <div className="flex-1 min-h-0 flex items-stretch justify-between gap-2.5 sm:gap-3 mt-2.5 sm:mt-3 mb-2.5">
        <div className="flex flex-col justify-end md:justify-start min-w-0 max-w-[235px] sm:max-w-[295px]">
          {activeNarration && (
            <div
              data-testid="launch-narration-card"
              className="pointer-events-auto glass-panel p-2.5 sm:p-3 rounded-xl border border-cyan-500/20 bg-slate-950/85 backdrop-blur-lg shadow-2xl animate-fade-in"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
                  <h4 className="text-xs sm:text-sm font-bold text-white tracking-wide">
                    {activeNarration.title}
                  </h4>
                </div>
                <button
                  type="button"
                  aria-label={isVi ? "Ẩn thẻ thuyết minh" : "Dismiss narration"}
                  onClick={() => setDismissedStepId(activeStep.id)}
                  className="text-slate-400 hover:text-white p-1 cursor-pointer shrink-0"
                  title={isVi ? "Ẩn thẻ thuyết minh" : "Dismiss narration"}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {activeNarration.subtitle && (
                <p className="text-[11px] sm:text-xs text-cyan-400 font-medium mt-0.5 ml-6">
                  {activeNarration.subtitle}
                </p>
              )}

              <p className="text-[11px] sm:text-xs text-slate-300 mt-1.5 ml-6 leading-relaxed font-sans">
                {activeNarration.body}
              </p>

              {activeNarration.scientificFact && (
                <div
                  className={`mt-2 ml-6 p-2 rounded-lg bg-cyan-950/40 border border-cyan-500/20 text-[11px] text-cyan-200 font-sans items-start space-x-2 ${
                    activeCamera === "COCKPIT" ? "hidden 2xl:flex" : "hidden md:flex"
                  }`}
                >
                  <span className="font-bold text-cyan-400 uppercase text-[10px] shrink-0">
                    {isVi ? "Khoa học:" : "Fact:"}
                  </span>
                  <span>{activeNarration.scientificFact}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col justify-center md:justify-start shrink-0 ml-auto">
          <div
            data-testid="launch-camera-dock"
            className="pointer-events-auto glass-panel p-1.5 sm:p-2 rounded-xl border border-white/10 bg-slate-950/80 backdrop-blur-md flex flex-col space-y-1 min-w-[132px] sm:min-w-[148px]"
          >
            <div className="flex items-center space-x-1.5 px-2 py-0.5 text-[10px] text-slate-400 uppercase font-semibold">
              <Camera className="w-3.5 h-3.5 text-cyan-400" />
              <span>{isVi ? "Góc Nhìn" : "Camera View"}</span>
            </div>

            {cameraButtons.map(({ mode, labelVi, labelEn }) => (
              <button
                key={mode}
                onClick={() => handleCameraSelect(mode)}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                  activeCamera === mode
                    ? "bg-cyan-500/30 text-cyan-300 font-bold border border-cyan-400/40"
                    : "text-slate-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span>{isVi ? labelVi : labelEn}</span>
                {activeCamera === mode && <ChevronRight className="w-3.5 h-3.5 text-cyan-400" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. BOTTOM: TIMELINE CONTROLS */}
      <div className="shrink-0 flex flex-col space-y-2.5 pointer-events-auto">

        <div className="glass-panel px-3 sm:px-4 py-2.5 sm:py-3 rounded-2xl border border-white/10 bg-slate-950/85 backdrop-blur-lg flex flex-col md:flex-row items-center justify-between gap-2.5 sm:gap-3 shadow-2xl">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              aria-label={isPlaying ? (isVi ? "Tạm dừng" : "Pause") : isVi ? "Phát" : "Play"}
              onClick={() => timeline.togglePlay()}
              className="p-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold cursor-pointer transition-all hover:scale-105 shadow-md shadow-cyan-500/20"
              title={isPlaying ? (isVi ? "Tạm dừng" : "Pause") : isVi ? "Phát" : "Play"}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>

            <button
              type="button"
              aria-label={isVi ? "Phóng Lại Từ Đầu" : "Restart Launch"}
              onClick={() => timeline.seek(0)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer transition-all"
              title={isVi ? "Phóng Lại Từ Đầu" : "Restart Launch"}
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <div className="flex items-center bg-slate-900 rounded-lg p-0.5 border border-white/5 ml-1">
              {[0.5, 1.0, 2.0, 5.0].map((s) => (
                <button
                  key={s}
                  onClick={() => handleSpeedChange(s)}
                  className={`px-2 py-1 rounded text-xs transition-all cursor-pointer ${
                    speed === s
                      ? "bg-cyan-500/30 text-cyan-300 font-bold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 w-full flex items-center space-x-3">
            <span className="text-[11px] text-slate-400 font-mono">0s</span>
            <div className="relative flex-1 flex items-center">
              <input
                type="range"
                min={0}
                max={360}
                step={0.5}
                value={trajectory.timeSeconds}
                onChange={handleSeek}
                aria-label={isVi ? "Thanh thời gian phóng tàu" : "Launch timeline scrubber"}
                className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer appearance-none"
              />
              {LAUNCH_STEPS.map((step) => (
                <div
                  key={step.id}
                  style={{ left: `${(step.startTime / 360) * 100}%` }}
                  className="absolute top-1/2 -translate-y-1/2 w-1 h-2 bg-cyan-400/40 pointer-events-none rounded-full"
                  title={isVi ? LAUNCH_PHASE_LABELS[step.phase]?.vi : LAUNCH_PHASE_LABELS[step.phase]?.en}
                />
              ))}
            </div>
            <span className="text-[11px] text-slate-400 font-mono">360s</span>
          </div>
        </div>
      </div>
    </div>
  );
};
