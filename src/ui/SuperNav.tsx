import React, { useState, useEffect, useRef } from 'react';
import {
  Compass,
  Globe2,
  Rocket,
  Disc,
  Camera,
  Play,
  Sliders,
  Scale,
  Volume2,
  VolumeX,
  Eye,
  EyeOff,
  Search,
  Orbit,
  Film
} from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { CELESTIAL_BODIES, PLANET_KEYS } from '@/data/celestialData';
import { AudioManager } from '@/engine/audio/AudioManager';
import { CameraManager } from '@/engine/camera/CameraManager';
import { CinematicDirector } from '@/engine/camera/CinematicDirector';

export const SuperNav: React.FC = () => {
  const [isPlanetsOpen, setIsPlanetsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const cameraMode = useAppStore((state) => state.cameraMode);
  const setCameraMode = useAppStore((state) => state.setCameraMode);
  const selectedTarget = useAppStore((state) => state.targetId);
  const setTargetId = useAppStore((state) => state.setTargetId);
  const soundEnabled = useAppStore((state) => state.soundEnabled);
  const toggleSound = useAppStore((state) => state.toggleSound);
  const showOrbits = useAppStore((state) => state.showOrbits);
  const toggleOrbits = useAppStore((state) => state.toggleOrbits);
  const startTour = useAppStore((state) => state.startTour);
  const setPhotoMode = useAppStore((state) => state.setPhotoMode);
  const setCompareMode = useAppStore((state) => state.setCompareMode);
  const compareMode = useAppStore((state) => state.compareMode);
  const setScaleExplorer = useAppStore((state) => state.setScaleExplorer);
  const setSettingsOpen = useAppStore((state) => state.setSettingsOpen);
  const setCommandPaletteOpen = useAppStore((state) => state.setCommandPaletteOpen);

  const audio = AudioManager.getInstance();
  const cam = CameraManager.getInstance();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsPlanetsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSoundClick = () => {
    audio.playUIClick();
    toggleSound();
    audio.updateSoundState(!soundEnabled);
  };

  const handleExploreClick = () => {
    audio.playUIClick();
    setCompareMode(false);
    setTargetId('sun');
    setCameraMode('ORBIT');
    cam.flyToSolarSystemOverview();
  };

  const handlePlanetSelect = (id: string) => {
    audio.playUIClick();
    setCompareMode(false);
    setTargetId(id);
    setCameraMode('ORBIT');
    setIsPlanetsOpen(false);
    if (id === 'blackhole') {
      cam.flyToBlackHole();
    } else {
      cam.focusPlanet(id);
    }
  };

  const handleGalaxyClick = () => {
    audio.playUIClick();
    setCompareMode(false);
    if (cameraMode === 'GALAXY') {
      setCameraMode('ORBIT');
      cam.flyToSolarSystemOverview();
    } else {
      setCameraMode('GALAXY');
      cam.flyToGalaxyView();
    }
  };

  const handleBlackHoleClick = () => {
    audio.playUIClick();
    setCompareMode(false);
    setTargetId('blackhole');
    setCameraMode('ORBIT');
    cam.flyToBlackHole();
  };

  const handleFlightClick = () => {
    audio.playUIClick();
    setCompareMode(false);
    if (cameraMode === 'FREE_FLIGHT') {
      setCameraMode('ORBIT');
      cam.flyToSolarSystemOverview();
    } else {
      setCameraMode('FREE_FLIGHT');
    }
  };

  const handleCompareClick = () => {
    audio.playUIClick();
    const next = !compareMode;
    setCompareMode(next);
    if (next) {
      setCameraMode('ORBIT');
      cam.flyToCompareView();
    } else {
      cam.flyToSolarSystemOverview();
    }
  };

  return (
    <header className="fixed top-2 inset-x-0 z-40 px-2 sm:px-4 pointer-events-none flex items-center justify-between gap-1.5 sm:gap-3 max-w-7xl mx-auto">
      {/* Brand & Mode Tag */}
      <div className="flex items-center space-x-2 pointer-events-auto shrink-0">
        <button
          onClick={handleExploreClick}
          className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-full glass-panel hover:border-sky-500/50 border border-sky-500/30 transition-all cursor-pointer"
          title="Reset to Solar System Overview"
        >
          <div className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
          <span className="text-[11px] font-bold tracking-wider text-white hidden xl:inline">
            UNIVERSE <span className="text-sky-400">ENGINE</span>
          </span>
          <span className="text-[9px] text-slate-300 px-1.5 py-0.5 rounded bg-white/10 hud-tag font-mono">
            {cameraMode}
          </span>
        </button>
      </div>

      {/* Main Navigation Bar */}
      <nav className="pointer-events-auto flex-1 min-w-0 flex items-center space-x-1 px-1.5 py-1 rounded-full glass-panel text-xs text-slate-200 shadow-2xl overflow-x-auto no-scrollbar">
        {/* Explore Solar System */}
        <button
          onClick={handleExploreClick}
          className={`flex items-center space-x-1 px-2.5 py-1 rounded-full transition-all cursor-pointer shrink-0 ${
            cameraMode === 'ORBIT' && !compareMode && selectedTarget === 'sun'
              ? 'bg-sky-500 text-white font-semibold shadow-md shadow-sky-500/25'
              : 'hover:text-white hover:bg-white/10'
          }`}
          title="Explore Solar System"
        >
          <Compass className="w-3.5 h-3.5 text-sky-400" />
          <span className="font-medium">Explore</span>
        </button>

        {/* Celestial Bodies & Moons Dropdown */}
        <div className="relative shrink-0" ref={dropdownRef}>
          <button
            onClick={() => {
              audio.playUIClick();
              setIsPlanetsOpen(!isPlanetsOpen);
            }}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-full transition-all cursor-pointer ${
              isPlanetsOpen || (cameraMode === 'ORBIT' && selectedTarget && selectedTarget !== 'sun')
                ? 'bg-white/20 text-white font-semibold'
                : 'hover:text-white hover:bg-white/10'
            }`}
            title="Select Planet or Moon"
          >
            <Globe2 className="w-3.5 h-3.5 text-sky-400" />
            <span className="font-medium">Planets</span>
          </button>

          {isPlanetsOpen && (
            <div className="absolute top-full mt-2 left-0 w-60 max-h-96 overflow-y-auto rounded-2xl glass-panel-glow py-2 shadow-2xl border border-sky-500/40 z-50 animate-in fade-in zoom-in-95 duration-150">
              <button
                onClick={() => handlePlanetSelect('sun')}
                className="w-full text-left px-3.5 py-1.5 hover:bg-white/10 flex items-center justify-between text-xs cursor-pointer"
              >
                <span className="text-amber-300 font-semibold">The Sun (Sol)</span>
                <span className="text-[10px] text-slate-400 font-mono">Star</span>
              </button>
              <div className="h-px bg-white/10 my-1.5" />
              {PLANET_KEYS.map((key) => {
                const p = CELESTIAL_BODIES[key];
                return (
                  <div key={key}>
                    <button
                      onClick={() => handlePlanetSelect(key)}
                      className={`w-full text-left px-3.5 py-1.5 hover:bg-white/10 flex items-center justify-between text-xs cursor-pointer ${
                        selectedTarget === key ? 'text-sky-300 font-bold bg-white/5' : 'text-slate-200'
                      }`}
                    >
                      <span className="font-medium">{p.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{p.orbitalDistanceAU} AU</span>
                    </button>
                    {/* Render Moons indented */}
                    {p.moons &&
                      p.moons.map((mKey) => {
                        const moon = CELESTIAL_BODIES[mKey];
                        if (!moon) return null;
                        return (
                          <button
                            key={mKey}
                            onClick={() => handlePlanetSelect(mKey)}
                            className={`w-full text-left pl-7 pr-3.5 py-1 hover:bg-white/10 flex items-center justify-between text-[11px] cursor-pointer ${
                              selectedTarget === mKey ? 'text-sky-300 font-bold bg-white/5' : 'text-slate-400'
                            }`}
                          >
                            <span>↳ {moon.name}</span>
                            <span className="text-[9px] text-slate-500">Moon</span>
                          </button>
                        );
                      })}
                  </div>
                );
              })}
              <div className="h-px bg-white/10 my-1.5" />
              {/* Black Hole Quick Entry */}
              <button
                onClick={() => handlePlanetSelect('blackhole')}
                className={`w-full text-left px-3.5 py-1.5 hover:bg-white/10 flex items-center justify-between text-xs cursor-pointer ${
                  selectedTarget === 'blackhole' ? 'text-orange-400 font-bold bg-white/5' : 'text-orange-300'
                }`}
              >
                <span className="flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping" />
                  <span className="font-semibold">Gargantua (Black Hole)</span>
                </span>
                <span className="text-[10px] text-orange-400/70 font-mono">Singularity</span>
              </button>
            </div>
          )}
        </div>

        {/* Supermassive Black Hole Warp Button */}
        <button
          onClick={handleBlackHoleClick}
          className={`flex items-center space-x-1 px-2.5 py-1 rounded-full transition-all cursor-pointer shrink-0 ${
            selectedTarget === 'blackhole'
              ? 'bg-orange-600 text-white font-semibold shadow-md shadow-orange-600/30'
              : 'hover:text-white hover:bg-white/10 text-orange-300'
          }`}
          title="Warp to Supermassive Black Hole (Gargantua)"
        >
          <Orbit className="w-3.5 h-3.5 text-orange-400 animate-spin" style={{ animationDuration: '8s' }} />
          <span className="font-medium">Black Hole</span>
        </button>

        {/* Galaxy Overview */}
        <button
          onClick={handleGalaxyClick}
          className={`flex items-center space-x-1 px-2.5 py-1 rounded-full transition-all cursor-pointer shrink-0 ${
            cameraMode === 'GALAXY'
              ? 'bg-purple-600 text-white font-semibold shadow-md shadow-purple-600/30'
              : 'hover:text-white hover:bg-white/10'
          }`}
          title="Galaxy Overview"
        >
          <Disc className="w-3.5 h-3.5 text-purple-300" />
          <span className="font-medium">Galaxy</span>
        </button>

        {/* Free Flight Mode */}
        <button
          onClick={handleFlightClick}
          className={`flex items-center space-x-1 px-2.5 py-1 rounded-full transition-all cursor-pointer shrink-0 ${
            cameraMode === 'FREE_FLIGHT'
              ? 'bg-emerald-600 text-white font-semibold shadow-md shadow-emerald-600/30'
              : 'hover:text-white hover:bg-white/10'
          }`}
          title="Spacecraft Flight"
        >
          <Rocket className="w-3.5 h-3.5 text-emerald-300" />
          <span className="font-medium">Flight</span>
        </button>

        {/* Tour */}
        <button
          onClick={() => {
            audio.playUIClick();
            setCompareMode(false);
            startTour();
          }}
          className="flex items-center space-x-1 px-2.5 py-1 rounded-full hover:text-white hover:bg-white/10 transition-all text-amber-300 cursor-pointer shrink-0"
          title="Start Tour"
        >
          <Play className="w-3.5 h-3.5 fill-amber-300" />
          <span className="font-medium">Tour</span>
        </button>

        {/* Cinema Director Mode */}
        <button
          onClick={() => {
            audio.playUIClick();
            CinematicDirector.getInstance().enterCinemaMode('AUTO');
          }}
          className="flex items-center space-x-1 px-2.5 py-1 rounded-full hover:text-white hover:bg-white/10 transition-all text-rose-400 cursor-pointer shrink-0"
          title="Cinematic Director Mode (Press 'C')"
        >
          <Film className="w-3.5 h-3.5 text-rose-400" />
          <span className="font-medium">Cinema</span>
        </button>

        {/* Compare */}
        <button
          onClick={handleCompareClick}
          className={`flex items-center space-x-1 px-2.5 py-1 rounded-full transition-all cursor-pointer shrink-0 ${
            compareMode
              ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/30'
              : 'hover:text-white hover:bg-white/10'
          }`}
          title="Compare Planets"
        >
          <Scale className="w-3.5 h-3.5 text-indigo-300" />
          <span className="font-medium">Compare</span>
        </button>

        {/* Scale Explorer ("How Big is Space?") */}
        <button
          onClick={() => {
            audio.playUIClick();
            setScaleExplorer(true);
          }}
          className="flex items-center space-x-1 px-2.5 py-1 rounded-full hover:text-white hover:bg-white/10 transition-all text-sky-400 cursor-pointer shrink-0"
          title="Scale Explorer"
        >
          <span className="font-mono text-xs font-bold">10ⁿ</span>
          <span className="font-medium">Scale</span>
        </button>

        {/* Photo Mode */}
        <button
          onClick={() => {
            audio.playUIClick();
            setPhotoMode(true);
          }}
          className="p-1 rounded-full hover:text-white hover:bg-white/10 transition-all cursor-pointer shrink-0 text-slate-300"
          title="Photo Mode"
        >
          <Camera className="w-3.5 h-3.5 text-rose-400" />
        </button>
      </nav>

      {/* Right Controls */}
      <div className="pointer-events-auto flex items-center space-x-1 shrink-0">
        <button
          onClick={() => {
            audio.playUIClick();
            setCommandPaletteOpen(true);
          }}
          className="p-1.5 rounded-full glass-panel hover:text-white transition-all text-slate-300 cursor-pointer"
          title="Command Palette (Cmd+K)"
        >
          <Search className="w-3.5 h-3.5 text-sky-400" />
        </button>

        <button
          onClick={() => {
            audio.playUIClick();
            toggleOrbits();
          }}
          className="p-1.5 rounded-full glass-panel hover:text-white transition-all text-slate-300 cursor-pointer hidden md:flex"
          title={showOrbits ? 'Hide Orbit Paths' : 'Show Orbit Paths'}
        >
          {showOrbits ? <Eye className="w-3.5 h-3.5 text-sky-400" /> : <EyeOff className="w-3.5 h-3.5" />}
        </button>

        <button
          onClick={handleSoundClick}
          className="p-1.5 rounded-full glass-panel hover:text-white transition-all text-slate-300 cursor-pointer hidden md:flex"
          title={soundEnabled ? 'Mute Spatial Audio' : 'Enable Spatial Audio'}
        >
          {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5" />}
        </button>

        <button
          onClick={() => {
            audio.playUIClick();
            setSettingsOpen(true);
          }}
          className="p-1.5 rounded-full glass-panel hover:text-white transition-all text-slate-300 cursor-pointer"
          title="Engine Settings"
        >
          <Sliders className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
