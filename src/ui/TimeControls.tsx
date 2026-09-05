import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, FastForward } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { SimulationClock } from '@/engine/simulation/SimulationClock';
import { AudioManager } from '@/engine/audio/AudioManager';
import { useTranslation } from '@/i18n';

export const TimeControls: React.FC = () => {
  const { t } = useTranslation();
  const isPaused = useAppStore((state) => state.isPaused);
  const togglePause = useAppStore((state) => state.togglePause);
  const timeScale = useAppStore((state) => state.timeScale);
  const setTimeScale = useAppStore((state) => state.setTimeScale);

  const [simDays, setSimDays] = useState(0);
  const audio = AudioManager.getInstance();

  useEffect(() => {
    const interval = setInterval(() => {
      const time = SimulationClock.getInstance().simulationTime;
      // 10 simulation units approx 1 Earth year (365 days)
      setSimDays(Math.floor((time / 10) * 365));
    }, 150);
    return () => clearInterval(interval);
  }, []);

  const speeds = [0.1, 1, 10, 100, 1000];

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

  return (
    <div className="fixed bottom-4 left-4 z-40 flex items-center space-x-2 pointer-events-auto">
      <div className="glass-panel px-3 py-2 rounded-2xl flex items-center space-x-2 text-xs">
        {/* Play/Pause Button */}
        <button
          onClick={handleTogglePause}
          className="p-2 rounded-full bg-sky-500 hover:bg-sky-400 text-white transition-all shadow-md shadow-sky-500/30"
          title={isPaused ? 'Resume' : t('time.paused')}
        >
          {isPaused ? <Play className="w-3.5 h-3.5 fill-white" /> : <Pause className="w-3.5 h-3.5 fill-white" />}
        </button>

        {/* Speed Buttons */}
        <div className="flex items-center space-x-1 border-l border-white/10 pl-2">
          {speeds.map((s) => (
            <button
              key={s}
              onClick={() => handleSpeedChange(s)}
              className={`px-2 py-1 rounded-md text-[11px] font-mono transition-all ${
                timeScale === s && !isPaused
                  ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {s}×
            </button>
          ))}
        </div>

        {/* Simulation Days Elapsed */}
        <div className="border-l border-white/10 pl-2.5 pr-1 flex items-center space-x-1.5 text-slate-300">
          <FastForward className="w-3.5 h-3.5 text-sky-400" />
          <span className="font-mono text-[11px]">
            {Math.abs(simDays)} <span className="text-[9px] text-slate-500">{t('time.simDays')}</span>
          </span>
        </div>

        {/* Reset time button */}
        <button
          onClick={() => {
            audio.playUIClick();
            SimulationClock.getInstance().reset();
            setSimDays(0);
          }}
          className="p-1 rounded text-slate-400 hover:text-white transition-all"
          title={t('time.resetTooltip')}
        >
          <RotateCcw className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
