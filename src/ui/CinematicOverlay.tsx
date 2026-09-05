import React from 'react';
import { Film, Sparkles, Volume2, VolumeX, X, Disc } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { CinematicDirector, CinemaShotType } from '@/engine/camera/CinematicDirector';
import { HarmonicesMundiSynth } from '@/engine/audio/HarmonicesMundiSynth';
import { AudioManager } from '@/engine/audio/AudioManager';
import { useTranslation } from '@/i18n';

export const CinematicOverlay: React.FC = () => {
  const { t } = useTranslation();
  const cinemaMode = useAppStore((state) => state.cinemaMode);
  const cinemaShot = useAppStore((state) => state.cinemaShot);
  const setCinemaShot = useAppStore((state) => state.setCinemaShot);
  const harmonicesMundi = useAppStore((state) => state.harmonicesMundi);
  const toggleHarmonicesMundi = useAppStore((state) => state.toggleHarmonicesMundi);

  if (!cinemaMode) return null;

  const director = CinematicDirector.getInstance();
  const synth = HarmonicesMundiSynth.getInstance();
  const audio = AudioManager.getInstance();

  const handleShotChange = (shot: CinemaShotType) => {
    audio.playUIClick();
    setCinemaShot(shot);
    director.applyShot(shot);
  };

  const handleToggleHarmonices = () => {
    audio.playUIClick();
    toggleHarmonicesMundi();
    if (!harmonicesMundi) {
      synth.start();
    } else {
      synth.stop();
    }
  };

  const handleExit = () => {
    audio.playUIClick();
    director.exitCinemaMode();
  };

  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex flex-col justify-between select-none">
      {/* 1. Top Letterbox Bar (Anamorphic 2.39:1) */}
      <div className="w-full h-14 md:h-20 bg-black/95 backdrop-blur-sm pointer-events-auto flex items-center justify-between px-4 md:px-8 border-b border-white/5 transition-all duration-700 animate-in slide-in-from-top">
        {/* Film metadata telemetry */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 px-2.5 py-1 rounded-full bg-sky-500/10 border border-sky-500/30">
            <Film className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-[10px] md:text-xs font-mono font-bold tracking-widest text-sky-300 uppercase">
              {t('cinema.anamorphicBadge')}
            </span>
          </div>
          <div className="hidden sm:flex items-center space-x-2 text-[10px] font-mono text-slate-400">
            <span>F/2.8</span>
            <span>•</span>
            <span>50MM ANAMORPHIC</span>
            <span>•</span>
            <span className="text-emerald-400">24.000 FPS</span>
          </div>
        </div>

        {/* Shot Director Selectors */}
        <div className="flex items-center space-x-1.5 bg-white/5 p-1 rounded-full border border-white/10">
          <button
            onClick={() => handleShotChange('AUTO')}
            className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
              cinemaShot === 'AUTO'
                ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30 font-semibold'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            Auto Cut
          </button>
          <button
            onClick={() => handleShotChange('ORBITAL_DRIFT')}
            className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
              cinemaShot === 'ORBITAL_DRIFT'
                ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30 font-semibold'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            Sunrise
          </button>
          <button
            onClick={() => handleShotChange('RING_SKI')}
            className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
              cinemaShot === 'RING_SKI'
                ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30 font-semibold'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            Rings
          </button>
          <button
            onClick={() => handleShotChange('SLINGSHOT')}
            className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
              cinemaShot === 'SLINGSHOT'
                ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30 font-semibold'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            Slingshot
          </button>
        </div>

        {/* Right audio and exit buttons */}
        <div className="flex items-center space-x-2">
          {/* Harmonices Mundi Audio Button */}
          <button
            onClick={handleToggleHarmonices}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-full border transition-all cursor-pointer ${
              harmonicesMundi
                ? 'bg-purple-600/30 border-purple-500/60 text-purple-300'
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
            }`}
            title="Kepler Harmonices Mundi Ambient Synth"
          >
            <Disc className={`w-3.5 h-3.5 ${harmonicesMundi ? 'animate-spin' : ''}`} style={{ animationDuration: '6s' }} />
            <span className="text-[11px] font-mono hidden md:inline">Kepler Synth</span>
            {harmonicesMundi ? <Volume2 className="w-3.5 h-3.5 text-purple-400" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          {/* Exit Cinema Mode */}
          <button
            onClick={handleExit}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all cursor-pointer"
            title={t('common.exit')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Middle Optical Anamorphic Blue Flare Overlay */}
      <div className="relative w-full flex-1 pointer-events-none overflow-hidden">
        {/* Anamorphic Horizontal Blue Streak Lens Flare */}
        <div
          className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[2px] opacity-40 bg-gradient-to-r from-transparent via-cyan-400 to-transparent blur-[1px] pointer-events-none"
        />
        <div
          className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-8 opacity-20 bg-gradient-to-r from-transparent via-sky-500 to-transparent blur-xl pointer-events-none"
        />
      </div>

      {/* 3. Bottom Letterbox Bar (Anamorphic 2.39:1) */}
      <div className="w-full h-14 md:h-20 bg-black/95 backdrop-blur-sm pointer-events-auto flex items-center justify-between px-4 md:px-8 border-t border-white/5 transition-all duration-700 animate-in slide-in-from-bottom">
        <div className="flex items-center space-x-2 text-[11px] font-mono text-slate-400">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>{t('cinema.title')}:</span>
          <span className="text-white font-semibold tracking-wider">
            {cinemaShot === 'ORBITAL_DRIFT' && t('cinema.shotDrift')}
            {cinemaShot === 'RING_SKI' && t('cinema.shotRingSki')}
            {cinemaShot === 'SLINGSHOT' && t('cinema.shotSlingshot')}
            {cinemaShot === 'AUTO' && t('cinema.shotAuto')}
          </span>
        </div>

        <div className="text-[10px] font-mono text-slate-500">
          {t('cinema.pressEsc')}
        </div>
      </div>
    </div>
  );
};
