import React, { useEffect, useState } from 'react';
import { Play, Pause, SkipForward, SkipBack, X, Sparkles } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { TOUR_SEQUENCE, CELESTIAL_BODIES } from '@/data/celestialData';
import { CameraManager } from '@/engine/camera/CameraManager';
import { AudioManager } from '@/engine/audio/AudioManager';

export const TourController: React.FC = () => {
  const activeTour = useAppStore((state) => state.activeTour);
  const tourIndex = useAppStore((state) => state.tourIndex);
  const nextTourStep = useAppStore((state) => state.nextTourStep);
  const prevTourStep = useAppStore((state) => state.prevTourStep);
  const stopTour = useAppStore((state) => state.stopTour);
  const setTargetId = useAppStore((state) => state.setTargetId);

  const [isTourPaused, setIsTourPaused] = useState(false);

  // Automatically fly to current planet in tour sequence
  useEffect(() => {
    if (!activeTour) return;

    if (tourIndex >= TOUR_SEQUENCE.length) {
      stopTour();
      return;
    }

    const currentPlanetKey = TOUR_SEQUENCE[tourIndex];
    setTargetId(currentPlanetKey);
    CameraManager.getInstance().focusPlanet(currentPlanetKey);

    // Auto-advance after 8 seconds if not paused
    if (!isTourPaused) {
      const timer = setTimeout(() => {
        nextTourStep();
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [activeTour, tourIndex, isTourPaused, nextTourStep, setTargetId, stopTour]);

  if (!activeTour) return null;

  const currentId = TOUR_SEQUENCE[tourIndex];
  const planetData = currentId ? CELESTIAL_BODIES[currentId] : null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-md pointer-events-auto">
      <div className="glass-panel-glow p-4 rounded-2xl border border-amber-500/30 space-y-3">
        {/* Header & Status */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2 text-amber-300">
            <Sparkles className="w-4 h-4 animate-spin-slow" />
            <span className="font-bold tracking-wider uppercase font-mono">
              CINEMATIC EXPEDITION ({tourIndex + 1}/{TOUR_SEQUENCE.length})
            </span>
          </div>

          <button
            onClick={() => {
              AudioManager.getInstance().playUIClick();
              stopTour();
            }}
            className="p-1 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-all"
            title="Exit Tour"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current Destination Name & Snippet */}
        {planetData && (
          <div className="text-center">
            <h3 className="text-lg font-bold text-white tracking-wide">{planetData.displayName}</h3>
            <p className="text-xs text-slate-300 line-clamp-1 mt-0.5">{planetData.description}</p>
          </div>
        )}

        {/* Progress Bar */}
        <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-gradient-to-r from-amber-400 to-sky-400 h-full transition-all duration-300"
            style={{ width: `${((tourIndex + 1) / TOUR_SEQUENCE.length) * 100}%` }}
          />
        </div>

        {/* Media Controls */}
        <div className="flex items-center justify-center space-x-3 pt-1">
          <button
            onClick={() => {
              AudioManager.getInstance().playUIClick();
              prevTourStep();
            }}
            disabled={tourIndex === 0}
            className="p-2 rounded-full glass-panel hover:bg-white/10 text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-all"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              AudioManager.getInstance().playUIClick();
              setIsTourPaused(!isTourPaused);
            }}
            className="p-3 rounded-full bg-amber-500 hover:bg-amber-400 text-black font-bold shadow-lg shadow-amber-500/30 transition-all"
          >
            {isTourPaused ? <Play className="w-4 h-4 fill-black" /> : <Pause className="w-4 h-4 fill-black" />}
          </button>

          <button
            onClick={() => {
              AudioManager.getInstance().playUIClick();
              nextTourStep();
            }}
            disabled={tourIndex >= TOUR_SEQUENCE.length - 1}
            className="p-2 rounded-full glass-panel hover:bg-white/10 text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-all"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
