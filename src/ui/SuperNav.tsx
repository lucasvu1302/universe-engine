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
  Film,
  Bot,
  Bomb,
  Waves,
  Navigation,
  ChevronDown,
  Sparkles
} from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { CELESTIAL_BODIES, PLANET_KEYS } from '@/data/celestialData';
import { AudioManager } from '@/engine/audio/AudioManager';
import { CameraManager } from '@/engine/camera/CameraManager';
import { CinematicDirector } from '@/engine/camera/CinematicDirector';
import { SimulationManager } from '@/simulation/core/SimulationManager';
import { useTranslation } from '@/i18n';

export const SuperNav: React.FC = () => {
  const [isPlanetsOpen, setIsPlanetsOpen] = useState(false);
  const [isSpacecraftOpen, setIsSpacecraftOpen] = useState(false);
  const [isExperienceOpen, setIsExperienceOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const spacecraftDropdownRef = useRef<HTMLDivElement>(null);
  const experienceDropdownRef = useRef<HTMLDivElement>(null);

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
  const setActiveSurface = useAppStore((state) => state.setActiveSurface);
  const setReEntryActive = useAppStore((state) => state.setReEntryActive);
  const inExoSystem = useAppStore((state) => state.inExoSystem);
  const setInExoSystem = useAppStore((state) => state.setInExoSystem);
  const isSandboxOpen = useAppStore((state) => state.isSandboxOpen);
  const setSandboxOpen = useAppStore((state) => state.setSandboxOpen);
  const isTarsOpen = useAppStore((state) => state.isTarsOpen);
  const setTarsOpen = useAppStore((state) => state.setTarsOpen);

  const { t, language, toggleLanguage } = useTranslation();

  const audio = AudioManager.getInstance();
  const cam = CameraManager.getInstance();

  const handleLandClick = () => {
    audio.playWarpDrive();
    setReEntryActive(true);
    const target = selectedTarget === 'moon' ? 'moon' : 'mars';
    setTimeout(() => {
      setActiveSurface(target);
      setReEntryActive(false);
    }, 1600);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsPlanetsOpen(false);
      }
      if (spacecraftDropdownRef.current && !spacecraftDropdownRef.current.contains(e.target as Node)) {
        setIsSpacecraftOpen(false);
      }
      if (experienceDropdownRef.current && !experienceDropdownRef.current.contains(e.target as Node)) {
        setIsExperienceOpen(false);
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
    } else if (id === 'pulsar') {
      cam.flyToPulsar();
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

  const handleLaunchClick = () => {
    audio.playUIClick();
    setIsSpacecraftOpen(false);
    setCompareMode(false);
    SimulationManager.getInstance().startScenario('earth_launch');
  };

  const handleSpacecraftSelect = (id: string) => {
    audio.playUIClick();
    setIsSpacecraftOpen(false);
    setCompareMode(false);
    setTargetId(id);
    setCameraMode('ORBIT');
    cam.focusPlanet(id);
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
      <nav className="pointer-events-auto flex items-center space-x-1 px-1.5 py-1 rounded-full glass-panel text-xs text-slate-200 shadow-2xl overflow-visible shrink-0 z-10">
        {/* Explore Solar System */}
        <button
          onClick={handleExploreClick}
          className={`flex items-center space-x-1 px-2.5 py-1 rounded-full transition-all cursor-pointer shrink-0 ${
            cameraMode === 'ORBIT' && !compareMode && selectedTarget === 'sun'
              ? 'bg-sky-500 text-white font-semibold shadow-md shadow-sky-500/25'
              : 'hover:text-white hover:bg-white/10'
          }`}
          title={t('nav.explore')}
        >
          <Compass className="w-3.5 h-3.5 text-sky-400" />
          <span className="font-medium hidden sm:inline">{t('nav.explore')}</span>
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
            title={t('nav.planets')}
          >
            <Globe2 className="w-3.5 h-3.5 text-sky-400" />
            <span className="font-medium hidden sm:inline">{t('nav.planets')}</span>
            <ChevronDown className="w-3 h-3 text-sky-300 opacity-70" />
          </button>

          {isPlanetsOpen && (
            <div className="absolute top-full mt-2 left-0 w-60 max-h-96 overflow-y-auto rounded-2xl glass-panel-glow py-2 shadow-2xl border border-sky-500/40 z-50 animate-in fade-in zoom-in-95 duration-150">
              <button
                onClick={() => handlePlanetSelect('sun')}
                className="w-full text-left px-3.5 py-1.5 hover:bg-white/10 flex items-center justify-between text-xs cursor-pointer"
              >
                <span className="text-amber-300 font-semibold">{t('celestial.sun.displayName')}</span>
                <span className="text-[10px] text-slate-400 font-mono">{t('celestial.sun.type')}</span>
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
                      <span className="font-medium">{t(`celestial.${key}.name`)}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{p.orbitalDistanceAU} AU</span>
                    </button>
                    {key === 'earth' && (
                      <button
                        onClick={() => {
                          audio.playUIClick();
                          setIsPlanetsOpen(false);
                          setCompareMode(false);
                          SimulationManager.getInstance().startScenario('earth_history');
                        }}
                        className="w-full text-left pl-7 pr-3.5 py-1 hover:bg-emerald-500/10 flex items-center justify-between text-[11px] cursor-pointer text-emerald-300 group"
                      >
                        <span className="flex items-center space-x-1.5">
                          <Sparkles className="w-3 h-3 text-emerald-400 group-hover:scale-110 transition-transform" />
                          <span className="font-semibold">{language === 'vi' ? 'Lịch Sử Địa Chất (4.54 Ga)' : 'Geological Timeline (4.54 Ga)'}</span>
                        </span>
                        <span className="text-[9px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded font-mono">3D</span>
                      </button>
                    )}
                    {/* Render Moons indented */}
                    {p.moons &&
                      p.moons.map((mKey) => {
                        return (
                          <button
                            key={mKey}
                            onClick={() => handlePlanetSelect(mKey)}
                            className={`w-full text-left pl-7 pr-3.5 py-1 hover:bg-white/10 flex items-center justify-between text-[11px] cursor-pointer ${
                              selectedTarget === mKey ? 'text-sky-300 font-bold bg-white/5' : 'text-slate-400'
                            }`}
                          >
                            <span>↳ {t(`celestial.${mKey}.name`)}</span>
                            <span className="text-[9px] text-slate-500">{t(`celestial.${mKey}.type`)}</span>
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
                  <span className="font-semibold">{t('celestial.blackhole.name')}</span>
                </span>
                <span className="text-[10px] text-orange-400/70 font-mono">{t('celestial.blackhole.type')}</span>
              </button>

              <button
                onClick={() => handlePlanetSelect('pulsar')}
                className={`w-full text-left px-3.5 py-1.5 hover:bg-white/10 flex items-center justify-between text-xs cursor-pointer ${
                  selectedTarget === 'pulsar' ? 'text-cyan-400 font-bold bg-white/5' : 'text-cyan-300'
                }`}
              >
                <span className="flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  <span className="font-semibold">{t('celestial.pulsar.name')}</span>
                </span>
                <span className="text-[10px] text-cyan-400/70 font-mono">{t('celestial.pulsar.type')}</span>
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
          title={t('nav.blackHole')}
        >
          <Orbit className="w-3.5 h-3.5 text-orange-400 animate-spin" style={{ animationDuration: '8s' }} />
          <span className="font-medium hidden md:inline">{t('nav.blackHole')}</span>
        </button>

        {/* Galaxy Overview */}
        <button
          onClick={handleGalaxyClick}
          className={`flex items-center space-x-1 px-2.5 py-1 rounded-full transition-all cursor-pointer shrink-0 ${
            cameraMode === 'GALAXY'
              ? 'bg-purple-600 text-white font-semibold shadow-md shadow-purple-600/30'
              : 'hover:text-white hover:bg-white/10'
          }`}
          title={t('nav.galaxy')}
        >
          <Disc className="w-3.5 h-3.5 text-purple-300" />
          <span className="font-medium hidden md:inline">{t('nav.galaxy')}</span>
        </button>

        {/* Cosmic Events Timeline */}
        <button
          onClick={() => {
            audio.playUIClick();
            setCompareMode(false);
            SimulationManager.getInstance().startScenario('cosmic_history');
          }}
          className="flex items-center space-x-1 px-2.5 py-1 rounded-full transition-all cursor-pointer shrink-0 hover:text-white hover:bg-white/10 text-purple-300"
          title={language === 'vi' ? 'Sự Kiện Vũ Trụ: Big Bang, Sao, Siêu Tân Tinh' : 'Cosmic History & Events'}
        >
          <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
          <span className="font-medium hidden sm:inline">{language === 'vi' ? 'Sự Kiện' : 'Events'}</span>
        </button>

        {/* Spacecraft & Flight Dropdown */}
        <div className="relative shrink-0" ref={spacecraftDropdownRef}>
          <button
            onClick={() => {
              audio.playUIClick();
              setIsSpacecraftOpen(!isSpacecraftOpen);
            }}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-full transition-all cursor-pointer ${
              isSpacecraftOpen ||
              cameraMode === 'FREE_FLIGHT' ||
              selectedTarget === 'iss' ||
              selectedTarget === 'jwst' ||
              selectedTarget === 'voyager1' ||
              selectedTarget === 'voyager2'
                ? 'bg-emerald-600 text-white font-semibold shadow-md shadow-emerald-600/30'
                : 'hover:text-white hover:bg-white/10 text-emerald-300'
            }`}
            title={t('nav.flight')}
          >
            <Rocket className="w-3.5 h-3.5 text-emerald-300" />
            <span className="font-medium hidden sm:inline">{t('nav.flight')}</span>
            <ChevronDown className="w-3 h-3 text-emerald-300 opacity-70" />
          </button>

          {isSpacecraftOpen && (
            <div className="absolute top-full mt-2 left-0 w-72 rounded-2xl glass-panel-glow py-2 shadow-2xl border border-emerald-500/40 z-50 animate-in fade-in zoom-in-95 duration-150">
              {/* 1. Earth Launch Simulation */}
              <button
                onClick={handleLaunchClick}
                className="w-full text-left px-3.5 py-2 hover:bg-white/10 flex items-center space-x-2.5 text-xs cursor-pointer group"
              >
                <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 group-hover:bg-cyan-500/30">
                  <Rocket className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="text-cyan-300 font-bold flex items-center space-x-1.5">
                    <span>{language === 'vi' ? 'Phóng Tàu Từ Trái Đất' : 'Earth Launch Simulation'}</span>
                    <span className="text-[9px] px-1.5 py-0.2 bg-cyan-500/30 text-cyan-200 rounded font-mono font-bold">3D</span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {language === 'vi' ? 'Khoang lái 3D & đo đạc viễn trắc' : '3D Cockpit & orbital telemetry'}
                  </div>
                </div>
              </button>

              <div className="h-px bg-white/10 my-1.5" />

              {/* 2. Free Flight Mode */}
              <button
                onClick={() => {
                  setIsSpacecraftOpen(false);
                  handleFlightClick();
                }}
                className={`w-full text-left px-3.5 py-2 hover:bg-white/10 flex items-center space-x-2.5 text-xs cursor-pointer group ${
                  cameraMode === 'FREE_FLIGHT' ? 'bg-emerald-500/20 text-emerald-300' : ''
                }`}
              >
                <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 group-hover:bg-emerald-500/30">
                  <Navigation className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="text-emerald-300 font-bold">
                    {language === 'vi' ? 'Chế Độ Bay Tự Do (W/A/S/D)' : 'Free Flight Mode (WASD)'}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {language === 'vi' ? 'Lái phi thuyền tự do trong hệ mặt trời' : 'Pilot freely across the solar system'}
                  </div>
                </div>
              </button>

              <div className="h-px bg-white/10 my-1.5" />

              <div className="px-3.5 py-1 text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                {language === 'vi' ? 'Tàu Vũ Trụ & Vệ Tinh' : 'Spacecraft & Probes'}
              </div>

              {/* 3. ISS */}
              <button
                onClick={() => handleSpacecraftSelect('iss')}
                className={`w-full text-left px-3.5 py-1.5 hover:bg-white/10 flex items-center justify-between text-xs cursor-pointer ${
                  selectedTarget === 'iss' ? 'text-sky-300 font-bold bg-white/5' : 'text-slate-200'
                }`}
              >
                <div>
                  <span className="font-semibold">{language === 'vi' ? 'Trạm Vũ Trụ ISS' : 'ISS Space Station'}</span>
                  <div className="text-[10px] text-slate-400">{language === 'vi' ? 'Quỹ đạo Trái Đất (400 km)' : 'Low Earth Orbit (400 km)'}</div>
                </div>
                <span className="text-[10px] text-sky-400/80 font-mono">LEO</span>
              </button>

              {/* 4. JWST */}
              <button
                onClick={() => handleSpacecraftSelect('jwst')}
                className={`w-full text-left px-3.5 py-1.5 hover:bg-white/10 flex items-center justify-between text-xs cursor-pointer ${
                  selectedTarget === 'jwst' ? 'text-amber-300 font-bold bg-white/5' : 'text-slate-200'
                }`}
              >
                <div>
                  <span className="font-semibold">{language === 'vi' ? 'Kính Viễn Vọng James Webb' : 'James Webb (JWST)'}</span>
                  <div className="text-[10px] text-slate-400">{language === 'vi' ? 'Điểm cân bằng L2 (1.5M km)' : 'Sun-Earth L2 Halo Orbit'}</div>
                </div>
                <span className="text-[10px] text-amber-400/80 font-mono">L2</span>
              </button>

              {/* 5. Voyager 1 & 2 */}
              <button
                onClick={() => handleSpacecraftSelect('voyager1')}
                className={`w-full text-left px-3.5 py-1.5 hover:bg-white/10 flex items-center justify-between text-xs cursor-pointer ${
                  selectedTarget === 'voyager1' ? 'text-indigo-300 font-bold bg-white/5' : 'text-slate-200'
                }`}
              >
                <div>
                  <span className="font-semibold">Voyager 1</span>
                  <div className="text-[10px] text-slate-400">{language === 'vi' ? 'Biên giới nhật quyển (163 AU)' : 'Heliopause boundary (163 AU)'}</div>
                </div>
                <span className="text-[10px] text-indigo-400/80 font-mono">163 AU</span>
              </button>

              <button
                onClick={() => handleSpacecraftSelect('voyager2')}
                className={`w-full text-left px-3.5 py-1.5 hover:bg-white/10 flex items-center justify-between text-xs cursor-pointer ${
                  selectedTarget === 'voyager2' ? 'text-indigo-300 font-bold bg-white/5' : 'text-slate-200'
                }`}
              >
                <div>
                  <span className="font-semibold">Voyager 2</span>
                  <div className="text-[10px] text-slate-400">{language === 'vi' ? 'Không gian liên sao (136 AU)' : 'Interstellar space (136 AU)'}</div>
                </div>
                <span className="text-[10px] text-indigo-400/80 font-mono">136 AU</span>
              </button>
            </div>
          )}
        </div>

        {/* Tour (Widescreen shortcut) */}
        <button
          onClick={() => {
            audio.playUIClick();
            setCompareMode(false);
            startTour();
          }}
          className="hidden xl:flex items-center space-x-1 px-2.5 py-1 rounded-full hover:text-white hover:bg-white/10 transition-all text-amber-300 cursor-pointer shrink-0"
          title={t('nav.tour')}
        >
          <Play className="w-3.5 h-3.5 fill-amber-300" />
          <span className="font-medium">{t('nav.tour')}</span>
        </button>

        {/* Cinema Director Mode (Widescreen shortcut) */}
        <button
          onClick={() => {
            audio.playUIClick();
            CinematicDirector.getInstance().enterCinemaMode('AUTO');
          }}
          className="hidden xl:flex items-center space-x-1 px-2.5 py-1 rounded-full hover:text-white hover:bg-white/10 transition-all text-rose-400 cursor-pointer shrink-0"
          title={t('nav.cinema')}
        >
          <Film className="w-3.5 h-3.5 text-rose-400" />
          <span className="font-medium">{t('nav.cinema')}</span>
        </button>

        {/* Experiences & Advanced Features Dropdown */}
        <div className="relative shrink-0" ref={experienceDropdownRef}>
          <button
            onClick={() => {
              audio.playUIClick();
              setIsExperienceOpen(!isExperienceOpen);
            }}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-full transition-all cursor-pointer ${
              isExperienceOpen ||
              inExoSystem ||
              isSandboxOpen ||
              isTarsOpen ||
              compareMode
                ? 'bg-amber-500/25 text-amber-300 font-semibold border border-amber-500/30'
                : 'hover:text-white hover:bg-white/10 text-slate-300'
            }`}
            title={language === 'vi' ? 'Trải Nghiệm & Công Cụ' : 'Experiences & Tools'}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-medium hidden sm:inline">{language === 'vi' ? 'Trải Nghiệm' : 'Experiences'}</span>
            <ChevronDown className="w-3 h-3 text-slate-400 opacity-70" />
          </button>

          {isExperienceOpen && (
            <div className="absolute top-full mt-2 right-0 w-72 max-h-[32rem] overflow-y-auto rounded-2xl glass-panel-glow py-2 shadow-2xl border border-amber-500/30 z-50 animate-in fade-in zoom-in-95 duration-150 no-scrollbar">
              {/* 1. Cinema */}
              <button
                onClick={() => {
                  setIsExperienceOpen(false);
                  audio.playUIClick();
                  CinematicDirector.getInstance().enterCinemaMode('AUTO');
                }}
                className="w-full text-left px-3.5 py-2 hover:bg-white/10 flex items-center space-x-2.5 text-xs cursor-pointer group"
              >
                <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 group-hover:bg-rose-500/30">
                  <Film className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="text-rose-300 font-bold">
                    {language === 'vi' ? 'Chế Độ Điện Ảnh (IMAX)' : 'Cinema Director Mode (IMAX)'}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {language === 'vi' ? 'Khung hình 2.39:1 & nhạc Kepler' : '2.39:1 anamorphic & Kepler synth'}
                  </div>
                </div>
              </button>

              {/* 2. Tour */}
              <button
                onClick={() => {
                  setIsExperienceOpen(false);
                  audio.playUIClick();
                  setCompareMode(false);
                  startTour();
                }}
                className="w-full text-left px-3.5 py-2 hover:bg-white/10 flex items-center space-x-2.5 text-xs cursor-pointer group"
              >
                <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 group-hover:bg-amber-500/30">
                  <Play className="w-4 h-4 fill-amber-400" />
                </div>
                <div className="flex-1">
                  <div className="text-amber-300 font-bold">
                    {language === 'vi' ? 'Tham Quan Tự Động' : 'Guided Planetary Tour'}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {language === 'vi' ? 'Hành trình bay tự động qua các thiên thể' : 'Automated cinematic voyage through space'}
                  </div>
                </div>
              </button>

              <div className="h-px bg-white/10 my-1" />
              {/* 3. Surface Landing */}
              <button
                onClick={() => {
                  setIsExperienceOpen(false);
                  handleLandClick();
                }}
                className="w-full text-left px-3.5 py-2 hover:bg-white/10 flex items-center space-x-2.5 text-xs cursor-pointer group"
              >
                <div className="p-1.5 rounded-lg bg-orange-500/20 text-orange-400 group-hover:bg-orange-500/30">
                  <Navigation className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="text-orange-300 font-bold">
                    {language === 'vi' ? 'Đổ Bộ Bề Mặt (Mars / Moon)' : 'Surface Landing (Mars / Moon)'}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {language === 'vi' ? 'Hạ cánh xuống hố Jezero & bãi đáp Apollo 11' : 'Touch down on Jezero crater & Apollo 11'}
                  </div>
                </div>
              </button>

              {/* 4. Wormhole */}
              <button
                onClick={() => {
                  setIsExperienceOpen(false);
                  audio.playWarpDrive();
                  setInExoSystem(!inExoSystem);
                }}
                className="w-full text-left px-3.5 py-2 hover:bg-white/10 flex items-center space-x-2.5 text-xs cursor-pointer group"
              >
                <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 group-hover:bg-cyan-500/30">
                  <Waves className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="text-cyan-300 font-bold">
                    {language === 'vi' ? "Lỗ Sâu 4D (Hành Tinh Miller)" : "4D Wormhole (Miller's Planet)"}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {language === 'vi' ? 'Vượt lỗ sâu đến đại dương sóng thần 1.2km' : 'Traverse wormhole to 1.2km tidal ocean'}
                  </div>
                </div>
              </button>

              {/* 5. Sandbox */}
              <button
                onClick={() => {
                  setIsExperienceOpen(false);
                  audio.playUIClick();
                  setSandboxOpen(!isSandboxOpen);
                }}
                className="w-full text-left px-3.5 py-2 hover:bg-white/10 flex items-center space-x-2.5 text-xs cursor-pointer group"
              >
                <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 group-hover:bg-rose-500/30">
                  <Bomb className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="text-rose-300 font-bold">
                    {language === 'vi' ? 'Hộp Cát Thảm Họa Vũ Trụ' : 'Cosmic Sandbox Cataclysms'}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {language === 'vi' ? 'Thiên thạch đâm Trái Đất, siêu tân tinh' : 'Trigger asteroid impacts & supernova'}
                  </div>
                </div>
              </button>

              {/* 6. TARS */}
              <button
                onClick={() => {
                  setIsExperienceOpen(false);
                  audio.playUIClick();
                  setTarsOpen(!isTarsOpen);
                }}
                className="w-full text-left px-3.5 py-2 hover:bg-white/10 flex items-center space-x-2.5 text-xs cursor-pointer group"
              >
                <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400 group-hover:bg-sky-500/30">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="text-sky-300 font-bold">
                    {language === 'vi' ? 'Trợ Lý AI TARS Copilot' : 'AI TARS Hologram Copilot'}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {language === 'vi' ? 'Hỏi đáp thiên văn & giải thích vật lý' : 'Astrophysics Q&A & mission companion'}
                  </div>
                </div>
              </button>

              <div className="h-px bg-white/10 my-1" />

              {/* 7. Compare */}
              <button
                onClick={() => {
                  setIsExperienceOpen(false);
                  handleCompareClick();
                }}
                className="w-full text-left px-3.5 py-1.5 hover:bg-white/10 flex items-center justify-between text-xs cursor-pointer"
              >
                <div className="flex items-center space-x-2 text-indigo-300">
                  <Scale className="w-4 h-4" />
                  <span>{language === 'vi' ? 'So Sánh Kích Thước' : 'Scale Comparison'}</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">1:1</span>
              </button>

              {/* 8. Scale Explorer */}
              <button
                onClick={() => {
                  setIsExperienceOpen(false);
                  audio.playUIClick();
                  setScaleExplorer(true);
                }}
                className="w-full text-left px-3.5 py-1.5 hover:bg-white/10 flex items-center justify-between text-xs cursor-pointer"
              >
                <div className="flex items-center space-x-2 text-sky-300">
                  <span className="font-mono text-xs font-bold text-sky-400">10ⁿ</span>
                  <span>{language === 'vi' ? 'Thước Đo Vũ Trụ' : 'Scale Explorer'}</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">10⁻¹⁵ - 10²⁶m</span>
              </button>

              {/* 9. Photo Mode */}
              <button
                onClick={() => {
                  setIsExperienceOpen(false);
                  audio.playUIClick();
                  setPhotoMode(true);
                }}
                className="w-full text-left px-3.5 py-1.5 hover:bg-white/10 flex items-center justify-between text-xs cursor-pointer"
              >
                <div className="flex items-center space-x-2 text-rose-300">
                  <Camera className="w-4 h-4" />
                  <span>{language === 'vi' ? 'Chế Độ Chụp Ảnh' : 'Photo Mode'}</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">4K HD</span>
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Right Controls */}
      <div className="pointer-events-auto flex items-center space-x-1 shrink-0">
        {/* Language Switcher Pill */}
        <button
          onClick={() => {
            audio.playUIClick();
            toggleLanguage();
          }}
          className="flex items-center space-x-1 px-2 py-1 rounded-full glass-panel hover:text-white transition-all text-xs font-mono cursor-pointer shrink-0"
          title={language === 'vi' ? 'Switch to English' : 'Chuyển sang Tiếng Việt'}
        >
          <span className={language === 'vi' ? 'text-amber-400 font-bold' : 'text-slate-400'}>VI</span>
          <span className="text-slate-600">/</span>
          <span className={language === 'en' ? 'text-sky-400 font-bold' : 'text-slate-400'}>EN</span>
        </button>

        <button
          onClick={() => {
            audio.playUIClick();
            setCommandPaletteOpen(true);
          }}
          className="p-1.5 rounded-full glass-panel hover:text-white transition-all text-slate-300 cursor-pointer"
          title={t('nav.searchTooltip')}
        >
          <Search className="w-3.5 h-3.5 text-sky-400" />
        </button>

        <button
          onClick={() => {
            audio.playUIClick();
            toggleOrbits();
          }}
          className="p-1.5 rounded-full glass-panel hover:text-white transition-all text-slate-300 cursor-pointer hidden md:flex"
          title={showOrbits ? t('nav.hideOrbits') : t('nav.showOrbits')}
        >
          {showOrbits ? <Eye className="w-3.5 h-3.5 text-sky-400" /> : <EyeOff className="w-3.5 h-3.5" />}
        </button>

        <button
          onClick={handleSoundClick}
          className="p-1.5 rounded-full glass-panel hover:text-white transition-all text-slate-300 cursor-pointer hidden md:flex"
          title={soundEnabled ? t('nav.muteAudio') : t('nav.enableAudio')}
        >
          {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5" />}
        </button>

        <button
          onClick={() => {
            audio.playUIClick();
            setSettingsOpen(true);
          }}
          className="p-1.5 rounded-full glass-panel hover:text-white transition-all text-slate-300 cursor-pointer"
          title={t('nav.settings')}
        >
          <Sliders className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
