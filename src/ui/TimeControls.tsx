import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, FastForward } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { SimulationClock } from '@/engine/simulation/SimulationClock';
import { AudioManager } from '@/engine/audio/AudioManager';
import { useTranslation } from '@/i18n';

export const TimeControls: React.FC = () => {
  const { t, language } = useTranslation();
  const isPaused = useAppStore((state) => state.isPaused);
  const togglePause = useAppStore((state) => state.togglePause);
  const timeScale = useAppStore((state) => state.timeScale);
  const setTimeScale = useAppStore((state) => state.setTimeScale);
  const isTabHidden = useAppStore((state) => state.isTabHidden);

  const [simDays, setSimDays] = useState(0);
  const audio = AudioManager.getInstance();

  useEffect(() => {
    if (isTabHidden || isPaused) return;
    const interval = setInterval(() => {
      const time = SimulationClock.getInstance().simulationTime;
      setSimDays(Math.floor((time / 10) * 365));
    }, 150);
    return () => clearInterval(interval);
  }, [isTabHidden, isPaused]);

  const speeds = [0.1, 1, 10, 100, 1000];
  const mobileSpeeds = new Set([1, 10, 100]);

  const handleTogglePause = () => {
    audio.playUIClick();
    togglePause();
    SimulationClock.getInstance().setPaused(!isPaused);
  };

  const handleSpeedChange = (speed: number) => {
    audio.playUIClick();
    setTimeScale(speed);
    SimulationClock.getInstance().setTimeScale(speed);
  };

  const pauseLabel = isPaused
    ? language === 'vi'
      ? 'Tiếp tục thời gian'
      : 'Resume simulation'
    : t('time.paused');

  return (
    <div
      data-testid="time-controls-panel"
      className="fixed top-14 left-2.5 sm:top-auto sm:bottom-4 sm:left-4 z-40 flex items-center space-x-2 pointer-events-auto"
    >
      <div className="glass-panel vip-card-sheen px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-2xl flex items-center space-x-1.5 sm:space-x-2 text-xs">
        <button
          type="button"
          onClick={handleTogglePause}
          aria-label={pauseLabel}
          className="p-1.5 sm:p-2 rounded-full bg-sky-500 hover:bg-sky-400 text-white transition-all shadow-md shadow-sky-500/30 cursor-pointer"
          title={pauseLabel}
        >
          {isPaused ? (
            <Play className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-white" />
          ) : (
            <Pause className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-white" />
          )}
        </button>

        <div className="flex items-center space-x-0.5 sm:space-x-1 border-l border-white/10 pl-1.5 sm:pl-2">
          {speeds.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => handleSpeedChange(s)}
              className={`${mobileSpeeds.has(s) ? 'inline-flex' : 'hidden sm:inline-flex'} px-1.5 sm:px-2 py-1 rounded-md text-[10px] sm:text-[11px] font-mono transition-all cursor-pointer ${
                timeScale === s && !isPaused
                  ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {s}×
            </button>
          ))}
        </div>

        <div className="hidden sm:flex border-l border-white/10 pl-2.5 pr-1 items-center space-x-1.5 text-slate-300">
          <FastForward className="w-3.5 h-3.5 text-sky-400" />
          <span className="font-mono text-[11px]">
            {Math.abs(simDays)} <span className="text-[9px] text-slate-500">{t('time.simDays')}</span>
          </span>
        </div>

        <button
          type="button"
          onClick={() => {
            audio.playUIClick();
            SimulationClock.getInstance().reset();
            setSimDays(0);
          }}
          aria-label={t('time.resetTooltip')}
          className="p-1 rounded text-slate-400 hover:text-white transition-all cursor-pointer"
          title={t('time.resetTooltip')}
        >
          <RotateCcw className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
