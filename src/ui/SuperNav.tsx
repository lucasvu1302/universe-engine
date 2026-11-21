import React, { useState, useEffect, useRef } from 'react';
import {
  Compass,
  Globe2,
  Rocket,
  Disc,
  Sliders,
  Volume2,
  VolumeX,
  Eye,
  EyeOff,
  Search,
  Orbit,
  Navigation,
  ChevronDown,
  Sparkles,
  Bookmark,
  Trash2,
  Star
} from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import {
  CELESTIAL_BODIES,
  PLANET_KEYS,
  CONSTELLATION_KEYS,
  getLocalizedBodyData
} from '@/data/celestialData';
import { AudioManager } from '@/engine/audio/AudioManager';
import { CameraManager } from '@/engine/camera/CameraManager';
import { SimulationManager } from '@/simulation/core/SimulationManager';
import { ModeOrchestrator } from '@/engine/navigation/ModeOrchestrator';
import { ObservatoryMegaHub } from '@/ui/ObservatoryMegaHub';
import { useTranslation } from '@/i18n';

type OpenMenuType = 'planets' | 'constellations' | 'spacecraft' | 'experience' | 'bookmarks' | null;

export const SuperNav: React.FC = () => {
  const [openMenu, setOpenMenu] = useState<OpenMenuType>(null);
  const [menuLeft, setMenuLeft] = useState<number>(16);
  const [isSmUp, setIsSmUp] = useState<boolean>(
    () => typeof window === 'undefined' || window.innerWidth >= 640
  );

  const headerRef = useRef<HTMLElement>(null);
  const navScrollRef = useRef<HTMLElement>(null);
  const activeAnchorRef = useRef<HTMLButtonElement | null>(null);
  const activeMenuWidthRef = useRef<number>(288);
  const dragStateRef = useRef({
    active: false,
    startX: 0,
    startScrollLeft: 0,
    moved: false
  });

  const cameraMode = useAppStore((state) => state.cameraMode);
  const setCameraMode = useAppStore((state) => state.setCameraMode);
  const selectedTarget = useAppStore((state) => state.targetId);
  const setTargetId = useAppStore((state) => state.setTargetId);
  const soundEnabled = useAppStore((state) => state.soundEnabled);
  const toggleSound = useAppStore((state) => state.toggleSound);
  const showOrbits = useAppStore((state) => state.showOrbits);
  const toggleOrbits = useAppStore((state) => state.toggleOrbits);
  const showStarMap = useAppStore((state) => state.showStarMap);
  const toggleStarMap = useAppStore((state) => state.toggleStarMap);
  const savedBookmarks = useAppStore((state) => state.savedBookmarks);
  const saveCameraBookmark = useAppStore((state) => state.saveCameraBookmark);
  const removeCameraBookmark = useAppStore((state) => state.removeCameraBookmark);
  const setCompareMode = useAppStore((state) => state.setCompareMode);
  const compareMode = useAppStore((state) => state.compareMode);
  const setSettingsOpen = useAppStore((state) => state.setSettingsOpen);
  const setCommandPaletteOpen = useAppStore((state) => state.setCommandPaletteOpen);
  const inExoSystem = useAppStore((state) => state.inExoSystem);
  const isSandboxOpen = useAppStore((state) => state.isSandboxOpen);
  const isTarsOpen = useAppStore((state) => state.isTarsOpen);

  const { t, language, toggleLanguage } = useTranslation();

  const audio = AudioManager.getInstance();
  const cam = CameraManager.getInstance();

  const syncAnchorPosition = () => {
    if (typeof window === 'undefined') return;
    const sm = window.innerWidth >= 640;
    setIsSmUp(sm);
    const btnEl = activeAnchorRef.current;
    if (sm && btnEl) {
      const rect = btnEl.getBoundingClientRect();
      const clamped = Math.max(10, Math.min(rect.left, window.innerWidth - activeMenuWidthRef.current - 10));
      setMenuLeft(clamped);
    }
  };

  const toggleMenuAnchored = (
    menu: Exclude<OpenMenuType, null>,
    btnEl: HTMLButtonElement | null,
    menuWidth = 288
  ) => {
    audio.playUIClick();
    if (openMenu === menu) {
      setOpenMenu(null);
      return;
    }
    activeAnchorRef.current = btnEl;
    activeMenuWidthRef.current = menuWidth;
    if (typeof window !== 'undefined') {
      const sm = window.innerWidth >= 640;
      setIsSmUp(sm);
      if (sm && btnEl) {
        const rect = btnEl.getBoundingClientRect();
        const clamped = Math.max(10, Math.min(rect.left, window.innerWidth - menuWidth - 10));
        setMenuLeft(clamped);
      }
    }
    setOpenMenu(menu);
  };

  const handleLandClick = () => {
    audio.playWarpDrive();
    const target: 'mars' | 'moon' | 'europa' | 'titan' =
      selectedTarget === 'moon' || selectedTarget === 'europa' || selectedTarget === 'titan'
        ? selectedTarget
        : 'mars';
    ModeOrchestrator.getInstance().enterSurface(target);
  };

  const openMenuRef = useRef<OpenMenuType>(openMenu);
  openMenuRef.current = openMenu;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && openMenuRef.current !== null) {
        e.stopImmediatePropagation();
        setOpenMenu(null);
      }
    };
    const navEl = navScrollRef.current;
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleEsc, true);
    window.addEventListener('resize', syncAnchorPosition);
    navEl?.addEventListener('scroll', syncAnchorPosition, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleEsc, true);
      window.removeEventListener('resize', syncAnchorPosition);
      navEl?.removeEventListener('scroll', syncAnchorPosition);
    };
  }, []);

  const handleSoundClick = () => {
    audio.playUIClick();
    toggleSound();
    audio.updateSoundState(!soundEnabled);
  };

  const handleExploreClick = () => {
    audio.playUIClick();
    setOpenMenu(null);
    ModeOrchestrator.getInstance().exitAllModes();
    setTargetId('sun');
    setCameraMode('ORBIT');
    cam.flyToSolarSystemOverview();
  };

  const handlePlanetSelect = (id: string) => {
    audio.playUIClick();
    ModeOrchestrator.getInstance().exitAllModes();
    setTargetId(id);
    setCameraMode('ORBIT');
    setOpenMenu(null);
    if (id === 'blackhole') {
      cam.flyToBlackHole();
    } else if (id === 'pulsar') {
      cam.flyToPulsar();
    } else {
      cam.focusPlanet(id);
    }
  };

  const handleConstellationSelect = (id: string) => {
    audio.playUIClick();
    setOpenMenu(null);
    ModeOrchestrator.getInstance().exitAllModes();
    setTargetId(id);
    cam.focusConstellation(id);
  };

  const handleGalaxyClick = () => {
    audio.playUIClick();
    setOpenMenu(null);
    if (cameraMode === 'GALAXY' || cam.isGalaxyTargetActive()) {
      ModeOrchestrator.getInstance().exitAllModes();
      setTargetId('sun');
      cam.flyToSolarSystemOverview();
    } else {
      ModeOrchestrator.getInstance().exitAllModes();
      cam.flyToGalaxyView();
    }
  };

  const handleBlackHoleClick = () => {
    audio.playUIClick();
    setOpenMenu(null);
    ModeOrchestrator.getInstance().exitAllModes();
    setTargetId('blackhole');
    setCameraMode('ORBIT');
    cam.flyToBlackHole();
  };

  const handleFlightClick = () => {
    audio.playUIClick();
    if (cameraMode === 'FREE_FLIGHT') {
      cam.exitFreeFlight();
    } else {
      ModeOrchestrator.getInstance().exitAllModes();
      setCameraMode('FREE_FLIGHT');
    }
  };

  const handleLaunchClick = () => {
    audio.playUIClick();
    setOpenMenu(null);
    ModeOrchestrator.getInstance().exitAllModes();
    SimulationManager.getInstance().startScenario('earth_launch');
  };

  const handleSpacecraftSelect = (id: string) => {
    audio.playUIClick();
    setOpenMenu(null);
    ModeOrchestrator.getInstance().exitAllModes();
    setTargetId(id);
    setCameraMode('ORBIT');
    cam.focusPlanet(id);
  };

  const handleCompareClick = () => {
    audio.playUIClick();
    const next = !compareMode;
    if (next) {
      ModeOrchestrator.getInstance().exitAllModes();
      setCompareMode(true);
      setCameraMode('ORBIT');
      cam.flyToCompareView();
    } else {
      setCompareMode(false);
      cam.flyToSolarSystemOverview();
    }
  };

  const isConstellationSelected = Boolean(
    selectedTarget && selectedTarget.startsWith('constellation_')
  );
  const isPlanetOrMoonSelected = Boolean(
    cameraMode === 'ORBIT' &&
      selectedTarget &&
      selectedTarget !== 'sun' &&
      !isConstellationSelected &&
      selectedTarget !== 'iss' &&
      selectedTarget !== 'jwst' &&
      selectedTarget !== 'voyager1' &&
      selectedTarget !== 'voyager2'
  );

  return (
    <header
      ref={headerRef}
      className="fixed top-2 inset-x-0 z-[45] px-1.5 sm:px-4 pointer-events-none flex items-center justify-between gap-1.5 sm:gap-2 max-w-[92rem] mx-auto"
    >
      {/* Brand & Mode Tag */}
      <div className="flex items-center space-x-1 pointer-events-auto shrink-0">
        <button
          type="button"
          onClick={handleExploreClick}
          className="flex items-center space-x-1 sm:space-x-1.5 px-1.5 sm:px-2.5 py-1 sm:py-1.5 rounded-full glass-panel vip-card-sheen hover:border-sky-500/50 border border-sky-500/30 transition-all cursor-pointer"
          title={language === 'vi' ? 'Về toàn cảnh Hệ Mặt Trời' : 'Reset to Solar System Overview'}
        >
          <div className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
          <span className="text-[11px] font-bold tracking-wider text-white hidden 2xl:inline">
            UNIVERSE <span className="text-sky-400">ENGINE</span>
          </span>
          <span
            data-camera-mode={cameraMode}
            className="text-[9px] text-slate-300 px-1.5 py-0.5 rounded bg-white/10 hud-tag font-mono"
          >
            {language === 'vi'
              ? ({
                  ORBIT: 'QUỸ ĐẠO',
                  FREE_FLIGHT: 'BAY TỰ DO',
                  TRANSITIONING: 'ĐANG BAY',
                  GALAXY: 'THIÊN HÀ',
                  CINEMATIC: 'ĐIỆN ẢNH',
                  FOCUSING: 'TIÊU ĐIỂM'
                }[cameraMode] ?? cameraMode)
              : ({
                  ORBIT: 'ORBIT',
                  FREE_FLIGHT: 'FREE FLIGHT',
                  TRANSITIONING: 'TRANSIT',
                  GALAXY: 'GALAXY',
                  CINEMATIC: 'CINEMA',
                  FOCUSING: 'FOCUS'
                }[cameraMode] ?? cameraMode)}
          </span>
        </button>
      </div>

      {/* Horizontally Swipable & Drag-Scrollable Main Navigation Pill (Never Clips Popovers!) */}
      <nav
        ref={navScrollRef}
        data-testid="supernav-scroll"
        onWheel={(e) => {
          e.stopPropagation();
          if (navScrollRef.current && navScrollRef.current.scrollWidth > navScrollRef.current.clientWidth) {
            navScrollRef.current.scrollLeft += e.deltaY !== 0 ? e.deltaY : e.deltaX;
          }
        }}
        onPointerDown={(e) => {
          if (!navScrollRef.current || e.pointerType === 'touch') return;
          dragStateRef.current = {
            active: true,
            startX: e.clientX,
            startScrollLeft: navScrollRef.current.scrollLeft,
            moved: false
          };
        }}
        onPointerMove={(e) => {
          if (!dragStateRef.current.active || !navScrollRef.current) return;
          const dx = e.clientX - dragStateRef.current.startX;
          if (Math.abs(dx) > 6) {
            dragStateRef.current.moved = true;
            navScrollRef.current.scrollLeft = dragStateRef.current.startScrollLeft - dx;
          }
        }}
        onPointerUp={() => {
          dragStateRef.current.active = false;
        }}
        onPointerLeave={() => {
          dragStateRef.current.active = false;
        }}
        onClickCapture={(e) => {
          if (dragStateRef.current.moved) {
            e.stopPropagation();
            e.preventDefault();
            dragStateRef.current.moved = false;
          }
        }}
        className="pointer-events-auto flex items-center space-x-0.5 sm:space-x-1 px-1.5 sm:px-2 py-1 rounded-full glass-panel vip-card-sheen text-xs text-slate-200 shadow-2xl overflow-x-auto no-scrollbar touch-pan-x overscroll-x-contain min-w-0 max-w-full z-10 select-none"
      >
        {/* 1. Explore Solar System */}
        <button
          type="button"
          onClick={handleExploreClick}
          className={`hidden sm:flex items-center space-x-1 px-2 xl:px-2.5 py-1 rounded-full transition-all cursor-pointer shrink-0 whitespace-nowrap ${
            cameraMode === 'ORBIT' && !compareMode && selectedTarget === 'sun'
              ? 'bg-sky-500 text-white font-semibold shadow-md shadow-sky-500/25'
              : 'hover:text-white hover:bg-white/10'
          }`}
          title={t('nav.explore')}
        >
          <Compass className="w-3.5 h-3.5 text-sky-400" />
          <span className="font-medium hidden xl:inline">{t('nav.explore')}</span>
        </button>

        {/* 2. Celestial Bodies & Moons Trigger */}
        <button
          type="button"
          onClick={(e) => toggleMenuAnchored('planets', e.currentTarget, 268)}
          aria-expanded={openMenu === 'planets'}
          className={`flex items-center space-x-1 px-2 xl:px-2.5 py-1 rounded-full transition-all cursor-pointer shrink-0 whitespace-nowrap ${
            openMenu === 'planets' || isPlanetOrMoonSelected
              ? 'bg-white/20 text-white font-semibold'
              : 'hover:text-white hover:bg-white/10'
          }`}
          title={t('nav.planets')}
        >
          <Globe2 className="w-3.5 h-3.5 text-sky-400" />
          <span className="font-medium hidden md:inline">{t('nav.planets')}</span>
          <ChevronDown className="w-3 h-3 text-sky-300 opacity-70" />
        </button>

        {/* 3. Interactive 3D Constellations & Reviews Trigger */}
        <button
          type="button"
          data-testid="constellations-menu-btn"
          onClick={(e) => toggleMenuAnchored('constellations', e.currentTarget, 296)}
          aria-expanded={openMenu === 'constellations'}
          className={`flex items-center space-x-1 px-2 xl:px-2.5 py-1 rounded-full transition-all cursor-pointer shrink-0 whitespace-nowrap ${
            openMenu === 'constellations' || isConstellationSelected
              ? 'bg-amber-500/25 text-amber-200 font-semibold border border-amber-400/35'
              : 'hover:text-white hover:bg-white/10 text-amber-300'
          }`}
          title={t('nav.constellations')}
        >
          <Star className="w-3.5 h-3.5 text-amber-300" />
          <span className="font-medium hidden md:inline">{t('nav.constellations')}</span>
          <ChevronDown className="w-3 h-3 text-amber-300 opacity-70" />
        </button>

        {/* 4. Supermassive Black Hole Warp Button */}
        <button
          type="button"
          onClick={handleBlackHoleClick}
          className={`hidden sm:flex items-center space-x-1 px-2 xl:px-2.5 py-1 rounded-full transition-all cursor-pointer shrink-0 whitespace-nowrap ${
            selectedTarget === 'blackhole'
              ? 'bg-orange-600 text-white font-semibold shadow-md shadow-orange-600/30'
              : 'hover:text-white hover:bg-white/10 text-orange-300'
          }`}
          title={t('nav.blackHole')}
        >
          <Orbit className="w-3.5 h-3.5 text-orange-400 animate-spin" style={{ animationDuration: '8s' }} />
          <span className="font-medium hidden lg:inline">{t('nav.blackHole')}</span>
        </button>

        {/* 5. Galaxy Overview */}
        <button
          type="button"
          onClick={handleGalaxyClick}
          className={`flex items-center space-x-1 px-2 xl:px-2.5 py-1 rounded-full transition-all cursor-pointer shrink-0 whitespace-nowrap ${
            cameraMode === 'GALAXY'
              ? 'bg-purple-600 text-white font-semibold shadow-md shadow-purple-600/30'
              : 'hover:text-white hover:bg-white/10'
          }`}
          title={t('nav.galaxy')}
        >
          <Disc className="w-3.5 h-3.5 text-purple-300" />
          <span className="font-medium hidden lg:inline">{t('nav.galaxy')}</span>
        </button>

        {/* 6. Cosmic Events Timeline */}
        <button
          type="button"
          onClick={() => {
            audio.playUIClick();
            setOpenMenu(null);
            ModeOrchestrator.getInstance().exitAllModes();
            SimulationManager.getInstance().startScenario('cosmic_history');
          }}
          className="hidden sm:flex items-center space-x-1 px-2 xl:px-2.5 py-1 rounded-full transition-all cursor-pointer shrink-0 whitespace-nowrap hover:text-white hover:bg-white/10 text-purple-300"
          title={language === 'vi' ? 'Sự Kiện Vũ Trụ: Big Bang, Sao, Siêu Tân Tinh' : 'Cosmic History & Events'}
        >
          <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
          <span className="font-medium hidden xl:inline">{language === 'vi' ? 'Sự Kiện' : 'Events'}</span>
        </button>

        {/* 7. Spacecraft & Flight Trigger */}
        <button
          type="button"
          data-testid="spacecraft-menu-btn"
          onClick={(e) => toggleMenuAnchored('spacecraft', e.currentTarget, 292)}
          aria-expanded={openMenu === 'spacecraft'}
          className={`flex items-center space-x-1 px-2 xl:px-2.5 py-1 rounded-full transition-all cursor-pointer shrink-0 whitespace-nowrap ${
            openMenu === 'spacecraft' ||
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
          <span className="font-medium hidden md:inline">{t('nav.flight')}</span>
          <ChevronDown className="w-3 h-3 text-emerald-300 opacity-70" />
        </button>

        {/* 8. Experiences & Advanced Features Trigger */}
        <button
          type="button"
          onClick={(e) => toggleMenuAnchored('experience', e.currentTarget, 292)}
          aria-expanded={openMenu === 'experience'}
          className={`flex items-center space-x-1 px-2 xl:px-2.5 py-1 rounded-full transition-all cursor-pointer shrink-0 whitespace-nowrap ${
            openMenu === 'experience' ||
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
          <span className="font-medium hidden md:inline">{language === 'vi' ? 'Trải Nghiệm' : 'Experiences'}</span>
          <ChevronDown className="w-3 h-3 text-slate-400 opacity-70" />
        </button>
      </nav>

      {/* Right Controls */}
      <div className="pointer-events-auto flex items-center space-x-1 shrink-0">
        <button
          type="button"
          aria-label={language === 'vi' ? 'Switch to English' : 'Chuyển sang Tiếng Việt'}
          onClick={() => {
            audio.playUIClick();
            toggleLanguage();
          }}
          className="flex items-center space-x-0.5 sm:space-x-1 px-1.5 sm:px-2 py-1 rounded-full glass-panel hover:text-white transition-all text-[10px] sm:text-xs font-mono cursor-pointer shrink-0"
          title={language === 'vi' ? 'Switch to English' : 'Chuyển sang Tiếng Việt'}
        >
          <span className={language === 'vi' ? 'text-amber-400 font-bold' : 'text-slate-400'}>VI</span>
          <span className="text-slate-600">/</span>
          <span className={language === 'en' ? 'text-sky-400 font-bold' : 'text-slate-400'}>EN</span>
        </button>

        <button
          type="button"
          data-testid="toggle-starmap-btn"
          aria-label={t('vip.starMapTooltip')}
          onClick={() => {
            audio.playUIClick();
            toggleStarMap();
          }}
          className={`p-1.5 rounded-full glass-panel transition-all cursor-pointer hidden lg:flex ${
            showStarMap ? 'text-cyan-300 border-cyan-400/40' : 'text-slate-400 hover:text-white'
          }`}
          title={t('vip.starMapTooltip')}
        >
          <Sparkles className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          data-testid="bookmarks-menu-btn"
          aria-label={t('vip.savedViews')}
          aria-expanded={openMenu === 'bookmarks'}
          onClick={(e) => toggleMenuAnchored('bookmarks', e.currentTarget, 264)}
          className={`relative p-1.5 rounded-full glass-panel transition-all cursor-pointer flex items-center ${
            openMenu === 'bookmarks' || savedBookmarks.length > 0
              ? 'text-amber-300 border-amber-400/35'
              : 'text-slate-300 hover:text-white'
          }`}
          title={t('vip.savedViews')}
        >
          <Bookmark className="w-3.5 h-3.5" />
          {savedBookmarks.length > 0 && (
            <span className="ml-1 text-[9px] font-mono font-bold text-amber-300 hidden sm:inline">
              {savedBookmarks.length}
            </span>
          )}
        </button>

        <button
          type="button"
          aria-label={t('nav.searchTooltip')}
          onClick={() => {
            audio.playUIClick();
            setOpenMenu(null);
            setCommandPaletteOpen(true);
          }}
          className="p-1.5 rounded-full glass-panel hover:text-white transition-all text-slate-300 cursor-pointer"
          title={t('nav.searchTooltip')}
        >
          <Search className="w-3.5 h-3.5 text-sky-400" />
        </button>

        <button
          type="button"
          aria-label={showOrbits ? t('nav.hideOrbits') : t('nav.showOrbits')}
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
          type="button"
          aria-label={soundEnabled ? t('nav.muteAudio') : t('nav.enableAudio')}
          onClick={handleSoundClick}
          className="p-1.5 rounded-full glass-panel hover:text-white transition-all text-slate-300 cursor-pointer hidden md:flex"
          title={soundEnabled ? t('nav.muteAudio') : t('nav.enableAudio')}
        >
          {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5" />}
        </button>

        <button
          type="button"
          aria-label={t('nav.settings')}
          onClick={() => {
            audio.playUIClick();
            setOpenMenu(null);
            setSettingsOpen(true);
          }}
          className="p-1.5 rounded-full glass-panel hover:text-white transition-all text-slate-300 cursor-pointer"
          title={t('nav.settings')}
        >
          <Sliders className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ===================================================================== */}
      {/* FLOATING UNCLIPPED DROPDOWN POPOVERS (MOUNTED OUTSIDE <nav>!)         */}
      {/* ===================================================================== */}

      {/* 1. Planets & Moons Dropdown */}
      {openMenu === 'planets' && (
        <div
          data-testid="planets-dropdown-menu"
          onWheel={(e) => e.stopPropagation()}
          style={{ left: isSmUp ? `${menuLeft}px` : undefined }}
          className="pointer-events-auto fixed inset-x-2.5 top-13 sm:inset-x-auto sm:w-68 max-h-[calc(100dvh-4.5rem)] overflow-y-auto overscroll-contain touch-pan-y vip-scrollbar rounded-2xl glass-panel-glow py-2 shadow-2xl border border-sky-500/40 z-50 animate-in fade-in duration-150"
        >
          <button
            type="button"
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
                  type="button"
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
                    type="button"
                    onClick={() => {
                      audio.playUIClick();
                      setOpenMenu(null);
                      ModeOrchestrator.getInstance().exitAllModes();
                      SimulationManager.getInstance().startScenario('earth_history');
                    }}
                    className="w-full text-left pl-7 pr-3.5 py-1 hover:bg-emerald-500/10 flex items-center justify-between text-[11px] cursor-pointer text-emerald-300 group"
                  >
                    <span className="flex items-center space-x-1.5">
                      <Sparkles className="w-3 h-3 text-emerald-400 group-hover:scale-110 transition-transform" />
                      <span className="font-semibold">
                        {language === 'vi' ? 'Lịch Sử Địa Chất (4.54 Ga)' : 'Geological Timeline (4.54 Ga)'}
                      </span>
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 rounded font-mono">3D</span>
                  </button>
                )}
                {p.moons &&
                  p.moons.map((mKey) => (
                    <button
                      key={mKey}
                      type="button"
                      onClick={() => handlePlanetSelect(mKey)}
                      className={`w-full text-left pl-7 pr-3.5 py-1 hover:bg-white/10 flex items-center justify-between text-[11px] cursor-pointer ${
                        selectedTarget === mKey ? 'text-sky-300 font-bold bg-white/5' : 'text-slate-400'
                      }`}
                    >
                      <span>↳ {t(`celestial.${mKey}.name`)}</span>
                      <span className="text-[9px] text-slate-500">{t(`celestial.${mKey}.type`)}</span>
                    </button>
                  ))}
              </div>
            );
          })}
          <div className="h-px bg-white/10 my-1.5" />
          <button
            type="button"
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
            type="button"
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

      {/* 2. Constellations Review Dropdown */}
      {openMenu === 'constellations' && (
        <div
          data-testid="constellations-dropdown-menu"
          onWheel={(e) => e.stopPropagation()}
          style={{ left: isSmUp ? `${menuLeft}px` : undefined }}
          className="pointer-events-auto fixed inset-x-2.5 top-13 sm:inset-x-auto sm:w-74 max-h-[calc(100dvh-4.5rem)] overflow-y-auto overscroll-contain touch-pan-y vip-scrollbar rounded-2xl glass-panel-glow py-2 shadow-2xl border border-amber-400/40 z-50 animate-in fade-in duration-150"
        >
          <div className="px-3.5 py-1 flex items-center justify-between border-b border-white/10 mb-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-amber-300 font-bold">
              {language === 'vi' ? '8 Chòm Sao Biểu Tượng (3D)' : '8 Iconic IAU Constellations'}
            </span>
            <button
              type="button"
              onClick={() => {
                audio.playUIClick();
                toggleStarMap();
              }}
              className={`text-[10px] px-2 py-0.5 rounded-full border font-mono cursor-pointer ${
                showStarMap
                  ? 'bg-cyan-500/20 text-cyan-200 border-cyan-400/40'
                  : 'bg-white/5 text-slate-400 border-white/10'
              }`}
            >
              {showStarMap ? (language === 'vi' ? 'Lưới Sao: BẬT' : 'Lines: ON') : language === 'vi' ? 'Lưới Sao: TẮT' : 'Lines: OFF'}
            </button>
          </div>
          {CONSTELLATION_KEYS.map((cKey) => {
            const cData = CELESTIAL_BODIES[cKey];
            const cLoc = getLocalizedBodyData(cKey);
            return (
              <button
                key={cKey}
                type="button"
                data-testid={`nav-constellation-${cKey}`}
                onClick={() => handleConstellationSelect(cKey)}
                className={`w-full text-left px-3.5 py-2 hover:bg-white/10 flex items-center justify-between gap-2 text-xs cursor-pointer ${
                  selectedTarget === cKey ? 'bg-amber-500/15 text-amber-200 font-bold' : 'text-slate-200'
                }`}
              >
                <div className="min-w-0">
                  <div className="font-semibold truncate flex items-center space-x-1.5">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: cData.color, boxShadow: `0 0 8px ${cData.color}` }}
                    />
                    <span className="truncate">{cLoc.name}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 truncate pl-3.5">
                    {cLoc.brightestStar}
                  </div>
                </div>
                <span className="text-[10px] text-amber-300/80 font-mono shrink-0">
                  {cData.skyAreaDeg2} {language === 'vi' ? 'độ²' : 'deg²'}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* 3. Spacecraft & Flight Dropdown (Unclipped Outside <nav>!) */}
      {openMenu === 'spacecraft' && (
        <div
          data-testid="spacecraft-dropdown-menu"
          onWheel={(e) => e.stopPropagation()}
          style={{ left: isSmUp ? `${menuLeft}px` : undefined }}
          className="pointer-events-auto fixed inset-x-2.5 top-13 sm:inset-x-auto sm:w-72 max-h-[calc(100dvh-4.5rem)] overflow-y-auto overscroll-contain touch-pan-y vip-scrollbar rounded-2xl glass-panel-glow py-2 shadow-2xl border border-emerald-500/40 z-50 animate-in fade-in duration-150"
        >
          <button
            type="button"
            onClick={handleLaunchClick}
            className="w-full text-left px-3.5 py-2 hover:bg-white/10 flex items-center space-x-2.5 text-xs cursor-pointer group"
          >
            <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 group-hover:bg-cyan-500/30">
              <Rocket className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <div className="text-cyan-300 font-bold flex items-center space-x-1.5">
                <span>{language === 'vi' ? 'Phóng Tàu Từ Trái Đất' : 'Earth Launch Simulation'}</span>
                <span className="text-[9px] px-1.5 py-0.5 bg-cyan-500/30 text-cyan-200 rounded font-mono font-bold">3D</span>
              </div>
              <div className="text-[10px] text-slate-400">
                {language === 'vi' ? 'Khoang lái 3D & đo đạc viễn trắc' : '3D Cockpit & orbital telemetry'}
              </div>
            </div>
          </button>

          <div className="h-px bg-white/10 my-1.5" />

          <button
            type="button"
            onClick={() => {
              setOpenMenu(null);
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

          <button
            type="button"
            data-testid="nav-hohmann-planner"
            onClick={() => {
              audio.playUIClick();
              setOpenMenu(null);
              ModeOrchestrator.getInstance().toggleMissionPlanner(true);
            }}
            className="w-full text-left px-3.5 py-2 hover:bg-white/10 flex items-center space-x-2.5 text-xs cursor-pointer group"
          >
            <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-300 group-hover:bg-sky-500/30">
              <Compass className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <div className="text-sky-300 font-bold flex items-center space-x-1.5">
                <span>{t('cosmic.hohmannTitle')}</span>
                <span className="text-[9px] px-1.5 py-0.5 bg-sky-500/30 text-sky-200 rounded font-mono font-bold">
                  {language === 'vi' ? 'MỚI' : 'NEW'}
                </span>
              </div>
              <div className="text-[10px] text-slate-400">{t('cosmic.hohmannSub')}</div>
            </div>
          </button>

          <div className="h-px bg-white/10 my-1.5" />

          <div className="px-3.5 py-1 text-[10px] font-mono text-slate-400 uppercase tracking-wider">
            {language === 'vi' ? 'Tàu Vũ Trụ & Vệ Tinh (Bám Quỹ Đạo Sống)' : 'Spacecraft & Probes (Live Orbit Lock)'}
          </div>

          <button
            type="button"
            onClick={() => handleSpacecraftSelect('iss')}
            className={`w-full text-left px-3.5 py-1.5 hover:bg-white/10 flex items-center justify-between text-xs cursor-pointer ${
              selectedTarget === 'iss' ? 'text-sky-300 font-bold bg-white/5' : 'text-slate-200'
            }`}
          >
            <div>
              <span className="font-semibold">{language === 'vi' ? 'Trạm Vũ Trụ ISS' : 'ISS Space Station'}</span>
              <div className="text-[10px] text-slate-400">
                {language === 'vi' ? 'Quỹ đạo Trái Đất (420 km)' : 'Low Earth Orbit (420 km)'}
              </div>
            </div>
            <span className="text-[10px] text-sky-400/80 font-mono">LEO</span>
          </button>

          <button
            type="button"
            onClick={() => handleSpacecraftSelect('jwst')}
            className={`w-full text-left px-3.5 py-1.5 hover:bg-white/10 flex items-center justify-between text-xs cursor-pointer ${
              selectedTarget === 'jwst' ? 'text-amber-300 font-bold bg-white/5' : 'text-slate-200'
            }`}
          >
            <div>
              <span className="font-semibold">
                {language === 'vi' ? 'Kính Viễn Vọng James Webb' : 'James Webb (JWST)'}
              </span>
              <div className="text-[10px] text-slate-400">
                {language === 'vi' ? 'Điểm cân bằng L2 (1.5M km)' : 'Sun-Earth L2 Halo Orbit'}
              </div>
            </div>
            <span className="text-[10px] text-amber-400/80 font-mono">L2</span>
          </button>

          <button
            type="button"
            onClick={() => handleSpacecraftSelect('voyager1')}
            className={`w-full text-left px-3.5 py-1.5 hover:bg-white/10 flex items-center justify-between text-xs cursor-pointer ${
              selectedTarget === 'voyager1' ? 'text-indigo-300 font-bold bg-white/5' : 'text-slate-200'
            }`}
          >
            <div>
              <span className="font-semibold">Voyager 1</span>
              <div className="text-[10px] text-slate-400">
                {language === 'vi' ? 'Biên giới nhật quyển (163 AU)' : 'Heliopause boundary (163 AU)'}
              </div>
            </div>
            <span className="text-[10px] text-indigo-400/80 font-mono">163 AU</span>
          </button>

          <button
            type="button"
            onClick={() => handleSpacecraftSelect('voyager2')}
            className={`w-full text-left px-3.5 py-1.5 hover:bg-white/10 flex items-center justify-between text-xs cursor-pointer ${
              selectedTarget === 'voyager2' ? 'text-indigo-300 font-bold bg-white/5' : 'text-slate-200'
            }`}
          >
            <div>
              <span className="font-semibold">Voyager 2</span>
              <div className="text-[10px] text-slate-400">
                {language === 'vi' ? 'Không gian liên sao (136 AU)' : 'Interstellar space (136 AU)'}
              </div>
            </div>
            <span className="text-[10px] text-indigo-400/80 font-mono">136 AU</span>
          </button>
        </div>
      )}

      {/* 4. Observatory Mega-Hub (5 Category Tabs + All + Accent-Insensitive Search + Mobile Bottom Sheet) */}
      {openMenu === 'experience' && (
        <ObservatoryMegaHub
          onClose={() => setOpenMenu(null)}
          onLandClick={handleLandClick}
          onCompareClick={handleCompareClick}
        />
      )}

      {/* 5. Saved VIP Camera Bookmarks Popover */}
      {openMenu === 'bookmarks' && (
        <div
          onWheel={(e) => e.stopPropagation()}
          style={{ left: isSmUp ? `${menuLeft}px` : undefined }}
          className="pointer-events-auto fixed inset-x-2.5 top-13 sm:inset-x-auto sm:w-64 rounded-2xl glass-panel-glow vip-card-sheen p-2.5 shadow-2xl z-50 space-y-2"
        >
          <div className="flex items-center justify-between px-1 pb-1 border-b border-white/10">
            <span className="text-[10px] font-mono uppercase tracking-wider text-amber-300 font-bold">
              {t('vip.savedViews')}
            </span>
            <button
              type="button"
              onClick={() => {
                audio.playUIClick();
                const label = selectedTarget
                  ? getLocalizedBodyData(selectedTarget)?.name || selectedTarget
                  : language === 'vi'
                  ? 'Toàn cảnh Hệ Mặt Trời'
                  : 'Solar Overview';
                saveCameraBookmark(cam.captureBookmarkPayload(label, selectedTarget));
              }}
              className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 hover:bg-amber-500/35 text-amber-200 border border-amber-400/30 font-semibold cursor-pointer"
            >
              + {t('vip.saveView')}
            </button>
          </div>

          {savedBookmarks.length === 0 ? (
            <p className="text-[11px] text-slate-400 text-center py-3 font-mono">
              {t('vip.noSavedViews')}
            </p>
          ) : (
            <div className="max-h-56 overflow-y-auto overscroll-contain touch-pan-y vip-scrollbar space-y-1">
              {savedBookmarks.map((bm) => (
                <div
                  key={bm.id}
                  className="flex items-center justify-between px-2 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => {
                      audio.playUIClick();
                      setOpenMenu(null);
                      ModeOrchestrator.getInstance().exitAllModes();
                      if (bm.targetId) setTargetId(bm.targetId);
                      cam.restoreBookmark(bm);
                    }}
                    className="flex-1 text-left text-xs text-slate-200 hover:text-white truncate cursor-pointer"
                  >
                    {bm.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeCameraBookmark(bm.id)}
                    className="p-1 text-slate-400 hover:text-rose-400 cursor-pointer"
                    title={t('common.close')}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </header>
  );
};
