import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  Compass,
  Globe2,
  Rocket,
  Play,
  Camera,
  Volume2,
  Sliders,
  X,
  Orbit,
  Film,
  Disc,
  Sparkles,
  Scale,
  Navigation,
  Waves,
  Bomb,
  Bot,
  Bookmark,
  Flame,
  Sun,
  Activity,
  Telescope,
  Layers,
  ShieldAlert,
  Radio,
  Atom,
  Eye,
  Satellite
} from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { CELESTIAL_BODIES, ALL_CELESTIAL_KEYS, getLocalizedBodyData } from '@/data/celestialData';
import { CameraManager } from '@/engine/camera/CameraManager';
import { AudioManager } from '@/engine/audio/AudioManager';
import { CinematicDirector } from '@/engine/camera/CinematicDirector';
import { HarmonicesMundiSynth } from '@/engine/audio/HarmonicesMundiSynth';
import { SimulationManager } from '@/simulation/core/SimulationManager';
import { ModeOrchestrator } from '@/engine/navigation/ModeOrchestrator';
import { useTranslation } from '@/i18n';
import { normalizeViText } from '@/i18n/normalizeViText';

export const CommandPalette: React.FC = () => {
  const { t, language } = useTranslation();
  const isOpen = useAppStore((state) => state.isCommandPaletteOpen);
  const setIsOpen = useAppStore((state) => state.setCommandPaletteOpen);
  const targetId = useAppStore((state) => state.targetId);
  const setTargetId = useAppStore((state) => state.setTargetId);
  const setCameraMode = useAppStore((state) => state.setCameraMode);
  const startTour = useAppStore((state) => state.startTour);
  const setPhotoMode = useAppStore((state) => state.setPhotoMode);
  const setCompareMode = useAppStore((state) => state.setCompareMode);
  const setScaleExplorer = useAppStore((state) => state.setScaleExplorer);
  const setInExoSystem = useAppStore((state) => state.setInExoSystem);
  const setSandboxOpen = useAppStore((state) => state.setSandboxOpen);
  const setTarsOpen = useAppStore((state) => state.setTarsOpen);
  const toggleOrbits = useAppStore((state) => state.toggleOrbits);
  const toggleStarMap = useAppStore((state) => state.toggleStarMap);
  const toggleRadar = useAppStore((state) => state.toggleRadar);
  const toggleSound = useAppStore((state) => state.toggleSound);
  const soundEnabled = useAppStore((state) => state.soundEnabled);
  const setGraphicsQuality = useAppStore((state) => state.setGraphicsQuality);
  const savedBookmarks = useAppStore((state) => state.savedBookmarks);
  const saveCameraBookmark = useAppStore((state) => state.saveCameraBookmark);
  const recentExperiences = useAppStore((state) => state.recentExperiences);
  const recordRecentExperience = useAppStore((state) => state.recordRecentExperience);

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen(!isOpen);
      } else if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        e.stopImmediatePropagation();
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, setIsOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query, isOpen]);

  const commands = useMemo(() => {
    const list = [
      {
        id: 'galaxy',
        title: t('commandPalette.cmdGalaxy'),
        category: t('commandPalette.catNavigation'),
        icon: <Compass className="w-4 h-4 text-purple-400" />,
        action: () => {
          ModeOrchestrator.getInstance().exitAllModes();
          CameraManager.getInstance().flyToGalaxyView();
        }
      },
      {
        id: 'earth-launch',
        title: language === 'vi' ? 'Mô Phỏng Phóng Tàu Từ Trái Đất (3D Cockpit)' : 'Earth Launch Simulation (3D Cockpit)',
        category: language === 'vi' ? 'Mô Phỏng' : 'Simulation',
        icon: <Rocket className="w-4 h-4 text-cyan-400" />,
        action: () => {
          ModeOrchestrator.getInstance().exitAllModes();
          SimulationManager.getInstance().startScenario('earth_launch');
        }
      },
      {
        id: 'earth-history',
        title: language === 'vi' ? 'Dòng Thời Gian Lịch Sử Trái Đất (-4.54 Tỷ Năm)' : 'Earth Geological History Timeline (-4.54 Ga)',
        category: language === 'vi' ? 'Mô Phỏng' : 'Simulation',
        icon: <Globe2 className="w-4 h-4 text-emerald-400" />,
        action: () => {
          ModeOrchestrator.getInstance().exitAllModes();
          SimulationManager.getInstance().startScenario('earth_history');
        }
      },
      {
        id: 'cosmic-history',
        title: language === 'vi' ? 'Sự Kiện Vũ Trụ: Big Bang, Sao & Siêu Tân Tinh' : 'Cosmic Events: Big Bang & Supernova',
        category: language === 'vi' ? 'Mô Phỏng' : 'Simulation',
        icon: <Sparkles className="w-4 h-4 text-purple-400" />,
        action: () => {
          ModeOrchestrator.getInstance().exitAllModes();
          SimulationManager.getInstance().startScenario('cosmic_history');
        }
      },
      {
        id: 'land-mars',
        title: t('vip.quickLandMars'),
        category: t('commandPalette.catExperience'),
        icon: <Navigation className="w-4 h-4 text-orange-400" />,
        action: () => {
          ModeOrchestrator.getInstance().enterSurface('mars');
        }
      },
      {
        id: 'land-moon',
        title: t('vip.quickLandMoon'),
        category: t('commandPalette.catExperience'),
        icon: <Navigation className="w-4 h-4 text-slate-300" />,
        action: () => {
          ModeOrchestrator.getInstance().enterSurface('moon');
        }
      },
      {
        id: 'land-europa',
        title: t('cosmic.landEuropaTitle'),
        category: t('commandPalette.catExperience'),
        icon: <Navigation className="w-4 h-4 text-cyan-300" />,
        action: () => {
          ModeOrchestrator.getInstance().enterSurface('europa');
        }
      },
      {
        id: 'land-titan',
        title: t('cosmic.landTitanTitle'),
        category: t('commandPalette.catExperience'),
        icon: <Navigation className="w-4 h-4 text-amber-300" />,
        action: () => {
          ModeOrchestrator.getInstance().enterSurface('titan');
        }
      },
      {
        id: 'solar-storm',
        title: t('cosmic.solarStormTitle'),
        category: t('commandPalette.catExperience'),
        icon: <Flame className="w-4 h-4 text-emerald-400" />,
        action: () => {
          ModeOrchestrator.getInstance().toggleSolarStorm(true);
        }
      },
      {
        id: 'eclipse-lab',
        title: t('cosmic.eclipseTitle'),
        category: t('commandPalette.catExperience'),
        icon: <Sun className="w-4 h-4 text-amber-400" />,
        action: () => {
          ModeOrchestrator.getInstance().enterCosmicLab('eclipse');
        }
      },
      {
        id: 'binary-merger',
        title: t('cosmic.binaryMergerTitle'),
        category: t('commandPalette.catExperience'),
        icon: <Activity className="w-4 h-4 text-cyan-400" />,
        action: () => {
          ModeOrchestrator.getInstance().enterCosmicLab('binary_merger');
        }
      },
      {
        id: 'hohmann-planner',
        title: t('cosmic.hohmannTitle'),
        category: t('commandPalette.catNavigation'),
        icon: <Compass className="w-4 h-4 text-sky-400" />,
        action: () => {
          ModeOrchestrator.getInstance().toggleMissionPlanner(true);
        }
      },
      {
        id: 'stellar-lab',
        title: t('cosmic.stellarLabTitle'),
        category: t('commandPalette.catExperience'),
        icon: <Sparkles className="w-4 h-4 text-fuchsia-400" />,
        action: () => {
          ModeOrchestrator.getInstance().enterCosmicLab('stellar_lab');
        }
      },
      {
        id: 'planetarium',
        title: t('cosmic.planetariumTitle'),
        category: t('commandPalette.catExperience'),
        icon: <Telescope className="w-4 h-4 text-sky-300" />,
        action: () => {
          ModeOrchestrator.getInstance().enterCosmicLab('planetarium');
        }
      },
      {
        id: 'nbody_sandbox',
        title: t('cosmic.nbodyTitle'),
        category: t('cosmic.tabPhysics'),
        icon: <Orbit className="w-4 h-4 text-amber-300" />,
        action: () => {
          recordRecentExperience('nbody_sandbox');
          ModeOrchestrator.getInstance().enterCosmicLab('nbody_sandbox');
        }
      },
      {
        id: 'mars_terraform',
        title: t('cosmic.marsTerraformTitle'),
        category: t('cosmic.tabPlanets'),
        icon: <Globe2 className="w-4 h-4 text-emerald-300" />,
        action: () => {
          recordRecentExperience('mars_terraform');
          ModeOrchestrator.getInstance().enterCosmicLab('mars_terraform');
        }
      },
      {
        id: 'planetary_cutaway',
        title: t('cosmic.cutawayTitle'),
        category: t('cosmic.tabSurfaces'),
        icon: <Layers className="w-4 h-4 text-orange-300" />,
        action: () => {
          recordRecentExperience('planetary_cutaway');
          ModeOrchestrator.getInstance().enterCosmicLab('planetary_cutaway');
        }
      },
      {
        id: 'planetary_defense',
        title: t('cosmic.defenseTitle'),
        category: t('cosmic.tabPlanets'),
        icon: <ShieldAlert className="w-4 h-4 text-rose-300" />,
        action: () => {
          recordRecentExperience('planetary_defense');
          ModeOrchestrator.getInstance().enterCosmicLab('planetary_defense');
        }
      },
      {
        id: 'trappist_exoplanets',
        title: t('cosmic.trappistTitle'),
        category: t('cosmic.tabDeepSpace'),
        icon: <Radio className="w-4 h-4 text-rose-300" />,
        action: () => {
          recordRecentExperience('trappist_exoplanets');
          ModeOrchestrator.getInstance().enterCosmicLab('trappist_exoplanets');
        }
      },
      {
        id: 'dyson_megastructure',
        title: t('cosmic.dysonTitle'),
        category: t('cosmic.tabPlanets'),
        icon: <Atom className="w-4 h-4 text-yellow-300" />,
        action: () => {
          recordRecentExperience('dyson_megastructure');
          ModeOrchestrator.getInstance().enterCosmicLab('dyson_megastructure');
        }
      },
      {
        id: 'relativity_lab',
        title: t('cosmic.relativityTitle'),
        category: t('cosmic.tabPhysics'),
        icon: <Eye className="w-4 h-4 text-violet-300" />,
        action: () => {
          recordRecentExperience('relativity_lab');
          ModeOrchestrator.getInstance().enterCosmicLab('relativity_lab');
        }
      },
      {
        id: 'kessler_leo',
        title: t('cosmic.kesslerTitle'),
        category: t('cosmic.tabPlanets'),
        icon: <Satellite className="w-4 h-4 text-sky-300" />,
        action: () => {
          recordRecentExperience('kessler_leo');
          ModeOrchestrator.getInstance().enterCosmicLab('kessler_leo');
        }
      },
      {
        id: 'wormhole',
        title: t('vip.quickWormhole'),
        category: t('commandPalette.catExperience'),
        icon: <Waves className="w-4 h-4 text-cyan-400" />,
        action: () => {
          ModeOrchestrator.getInstance().exitAllModes();
          setInExoSystem(true);
        }
      },
      {
        id: 'compare',
        title: language === 'vi' ? 'So Sánh Kích Thước Thiên Thể (1:1)' : 'Celestial Scale Comparison (1:1)',
        category: t('commandPalette.catExperience'),
        icon: <Scale className="w-4 h-4 text-indigo-400" />,
        action: () => {
          ModeOrchestrator.getInstance().exitAllModes();
          setCompareMode(true);
          setCameraMode('ORBIT');
          CameraManager.getInstance().flyToCompareView();
        }
      },
      {
        id: 'scale-explorer',
        title: language === 'vi' ? 'Thước Đo Vũ Trụ (10⁻¹⁵m - 10²⁶m)' : 'Cosmic Scale Explorer (10⁻¹⁵m - 10²⁶m)',
        category: t('commandPalette.catExperience'),
        icon: <Compass className="w-4 h-4 text-sky-400" />,
        action: () => {
          setScaleExplorer(true);
        }
      },
      {
        id: 'sandbox',
        title: language === 'vi' ? 'Mở Hộp Cát Thảm Họa Vũ Trụ' : 'Open Cosmic Sandbox Cataclysms',
        category: t('commandPalette.catExperience'),
        icon: <Bomb className="w-4 h-4 text-rose-400" />,
        action: () => {
          setSandboxOpen(true);
        }
      },
      {
        id: 'tars',
        title: language === 'vi' ? 'Mở Trợ Lý AI TARS 9000' : 'Open AI TARS 9000 Copilot',
        category: t('commandPalette.catExperience'),
        icon: <Bot className="w-4 h-4 text-sky-400" />,
        action: () => {
          setTarsOpen(true);
        }
      },
      {
        id: 'save-bookmark',
        title: t('vip.saveView'),
        category: t('commandPalette.catView'),
        icon: <Bookmark className="w-4 h-4 text-amber-400" />,
        action: () => {
          const cam = CameraManager.getInstance();
          const label = targetId
            ? getLocalizedBodyData(targetId)?.name || targetId
            : language === 'vi'
            ? 'Toàn cảnh Hệ Mặt Trời'
            : 'Solar Overview';
          saveCameraBookmark(cam.captureBookmarkPayload(label, targetId));
        }
      },
      {
        id: 'blackhole',
        title: t('commandPalette.cmdBlackHole'),
        category: t('commandPalette.catSingularity'),
        icon: <Orbit className="w-4 h-4 text-orange-400" />,
        action: () => {
          ModeOrchestrator.getInstance().exitAllModes();
          setTargetId('blackhole');
          setCameraMode('ORBIT');
          CameraManager.getInstance().flyToBlackHole();
        }
      },
      {
        id: 'flight',
        title: t('commandPalette.cmdFlight'),
        category: t('commandPalette.catNavigation'),
        icon: <Rocket className="w-4 h-4 text-emerald-400" />,
        action: () => {
          ModeOrchestrator.getInstance().exitAllModes();
          setCameraMode('FREE_FLIGHT');
        }
      },
      {
        id: 'pulsar',
        title: t('commandPalette.cmdPulsar'),
        category: t('commandPalette.catSingularity'),
        icon: <Sparkles className="w-4 h-4 text-cyan-400" />,
        action: () => {
          ModeOrchestrator.getInstance().exitAllModes();
          setTargetId('pulsar');
          setCameraMode('ORBIT');
          CameraManager.getInstance().flyToPulsar();
        }
      },
      {
        id: 'tour',
        title: t('commandPalette.cmdTour'),
        category: t('commandPalette.catExperience'),
        icon: <Play className="w-4 h-4 text-amber-400" />,
        action: () => {
          ModeOrchestrator.getInstance().exitAllModes();
          startTour();
        }
      },
      {
        id: 'photo',
        title: t('nav.photoMode'),
        category: t('commandPalette.catExperience'),
        icon: <Camera className="w-4 h-4 text-rose-400" />,
        action: () => {
          setPhotoMode(true);
        }
      },
      {
        id: 'cinema-drift',
        title: t('commandPalette.cmdCinemaDrift'),
        category: t('commandPalette.catCinema'),
        icon: <Film className="w-4 h-4 text-amber-400" />,
        action: () => {
          ModeOrchestrator.getInstance().exitAllModes();
          CinematicDirector.getInstance().enterCinemaMode('ORBITAL_DRIFT');
        }
      },
      {
        id: 'cinema-rings',
        title: t('commandPalette.cmdCinemaRingSki'),
        category: t('commandPalette.catCinema'),
        icon: <Film className="w-4 h-4 text-sky-400" />,
        action: () => {
          ModeOrchestrator.getInstance().exitAllModes();
          CinematicDirector.getInstance().enterCinemaMode('RING_SKI');
        }
      },
      {
        id: 'cinema-slingshot',
        title: t('commandPalette.cmdCinemaSlingshot'),
        category: t('commandPalette.catCinema'),
        icon: <Film className="w-4 h-4 text-purple-400" />,
        action: () => {
          ModeOrchestrator.getInstance().exitAllModes();
          CinematicDirector.getInstance().enterCinemaMode('SLINGSHOT');
        }
      },
      {
        id: 'kepler-synth',
        title: t('commandPalette.cmdKeplerSynth'),
        category: t('commandPalette.catAudio'),
        icon: <Disc className="w-4 h-4 text-indigo-400" />,
        action: () => {
          HarmonicesMundiSynth.getInstance().toggle();
          useAppStore.getState().toggleHarmonicesMundi();
        }
      },
      {
        id: 'orbits',
        title: t('commandPalette.cmdOrbits'),
        category: t('commandPalette.catView'),
        icon: <Sliders className="w-4 h-4 text-sky-400" />,
        action: () => {
          toggleOrbits();
        }
      },
      {
        id: 'starmap',
        title: t('vip.starMapTooltip'),
        category: t('commandPalette.catView'),
        icon: <Sparkles className="w-4 h-4 text-cyan-400" />,
        action: () => {
          toggleStarMap();
        }
      },
      {
        id: 'radar-toggle',
        title: `${t('vip.radarExpand')} / ${t('vip.radarCollapse')}`,
        category: t('commandPalette.catView'),
        icon: <Compass className="w-4 h-4 text-emerald-400" />,
        action: () => {
          toggleRadar();
        }
      },
      {
        id: 'sound',
        title: soundEnabled ? t('nav.muteAudio') : t('nav.enableAudio'),
        category: t('commandPalette.catAudio'),
        icon: <Volume2 className="w-4 h-4 text-indigo-400" />,
        action: () => {
          toggleSound();
        }
      },
      {
        id: 'graphics-ultra',
        title: t('commandPalette.cmdUltraGraphics'),
        category: t('commandPalette.catGraphics'),
        icon: <Sliders className="w-4 h-4 text-emerald-400" />,
        action: () => {
          setGraphicsQuality('ULTRA');
        }
      }
    ];

    const bookmarkItems = savedBookmarks.map((bm) => ({
      id: `saved-${bm.id}`,
      title: `${bm.name}`,
      category: t('vip.savedViews'),
      icon: <Bookmark className="w-4 h-4 text-amber-300" />,
      action: () => {
        ModeOrchestrator.getInstance().exitAllModes();
        if (bm.targetId) setTargetId(bm.targetId);
        CameraManager.getInstance().restoreBookmark(bm);
      }
    }));

    const bodyItems = ALL_CELESTIAL_KEYS.map((key) => {
      const loc = getLocalizedBodyData(key);
      const bodyType = CELESTIAL_BODIES[key]?.type;
      const isMoon = bodyType === 'moon';
      const isSpacecraft = bodyType === 'spacecraft';
      const isConstellation = bodyType === 'constellation';
      const isBlackHole = key === 'blackhole';
      const isPulsar = key === 'pulsar';

      return {
        id: `body-${key}`,
        title: loc.displayName,
        category:
          isBlackHole || isPulsar
            ? t('commandPalette.catSingularity')
            : isConstellation
            ? t('nav.constellations')
            : isMoon
            ? t('targetHud.knownMoons')
            : isSpacecraft
            ? t('nav.flight')
            : t('commandPalette.catNavigation'),
        icon: isBlackHole ? (
          <Orbit className="w-4 h-4 text-orange-400" />
        ) : isPulsar ? (
          <Sparkles className="w-4 h-4 text-cyan-400" />
        ) : isConstellation ? (
          <Sparkles className="w-4 h-4 text-amber-300" />
        ) : isSpacecraft ? (
          <Rocket className="w-4 h-4 text-emerald-400" />
        ) : isMoon ? (
          <div className="w-2.5 h-2.5 rounded-full bg-slate-300 ml-0.5" />
        ) : (
          <Globe2 className="w-4 h-4 text-sky-400" />
        ),
        action: () => {
          ModeOrchestrator.getInstance().exitAllModes();
          setTargetId(key);
          setCameraMode('ORBIT');
          if (key === 'blackhole') {
            CameraManager.getInstance().flyToBlackHole();
          } else if (key === 'pulsar') {
            CameraManager.getInstance().flyToPulsar();
          } else {
            CameraManager.getInstance().focusPlanet(key);
          }
        }
      };
    });

    const RECENT_TO_CMD_ID: Record<string, string> = {
      eclipse: 'eclipse-lab',
      binary_merger: 'binary-merger',
      stellar_lab: 'stellar-lab',
      planetarium: 'planetarium',
      land_europa: 'land-europa',
      land_titan: 'land-titan',
      land_surface: 'land-mars',
      solar_storm: 'solar-storm',
      earth_history: 'earth-history',
      cosmic_history: 'cosmic-history',
      scale_explorer: 'scale-explorer',
      photo_mode: 'photo',
      guided_tour: 'tour',
      cinema_imax: 'cinema-drift',
    };

    const listById = new Map(list.map((c) => [c.id, c]));
    const recentItems = recentExperiences
      .map((id) => listById.get(id) ?? listById.get(RECENT_TO_CMD_ID[id] ?? ''))
      .filter((c): c is (typeof list)[number] => Boolean(c))
      .map((c) => ({
        ...c,
        id: `recent-${c.id}`,
        category: t('cosmic.megaHubRecent'),
      }));

    return [...recentItems, ...bookmarkItems, ...list, ...bodyItems];
  }, [
    t,
    language,
    targetId,
    savedBookmarks,
    recentExperiences,
    recordRecentExperience,
    saveCameraBookmark,
    setCameraMode,
    setTargetId,
    startTour,
    setPhotoMode,
    setCompareMode,
    setScaleExplorer,
    setInExoSystem,
    setSandboxOpen,
    setTarsOpen,
    toggleOrbits,
    toggleStarMap,
    toggleRadar,
    soundEnabled,
    toggleSound,
    setGraphicsQuality
  ]);

  const filtered = useMemo(() => {
    const q = normalizeViText(query);
    if (!q) return commands;
    return commands.filter(
      (c) =>
        !c.id.startsWith('recent-') &&
        (normalizeViText(c.title).includes(q) ||
          normalizeViText(c.category).includes(q) ||
          normalizeViText(c.id.replace(/[_-]/g, ' ')).includes(q))
    );
  }, [commands, query]);

  const dialogRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const activeIdx = Math.min(selectedIndex, Math.max(0, filtered.length - 1));

  useEffect(() => {
    if (!isOpen || !listRef.current) return;
    const activeEl = listRef.current.querySelector<HTMLElement>('[data-cmd-active="true"]');
    activeEl?.scrollIntoView?.({ block: 'nearest' });
  }, [activeIdx, isOpen, filtered.length]);

  if (!isOpen) return null;

  const activeOptionId = filtered[activeIdx] ? `cmd-option-${filtered[activeIdx].id}` : undefined;

  const handleKeyDownTrap = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab' || !dialogRef.current) return;
    const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
      'input:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={t('commandPalette.placeholder')}
      onKeyDown={handleKeyDownTrap}
      onClick={() => setIsOpen(false)}
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl glass-panel-glow rounded-2xl overflow-hidden shadow-2xl border border-sky-500/30 flex flex-col"
      >
        <div className="flex items-center px-4 py-3 border-b border-white/10">
          <Search className="w-4 h-4 text-sky-400 mr-3" />
          <input
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls="command-palette-listbox"
            aria-activedescendant={activeOptionId}
            placeholder={t('commandPalette.placeholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex((prev) => (filtered.length ? (prev + 1) % filtered.length : 0));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex((prev) =>
                  filtered.length ? (prev - 1 + filtered.length) % filtered.length : 0
                );
              } else if (e.key === 'Home') {
                e.preventDefault();
                setSelectedIndex(0);
              } else if (e.key === 'End') {
                e.preventDefault();
                setSelectedIndex(Math.max(0, filtered.length - 1));
              } else if (e.key === 'Enter' && filtered.length > 0) {
                e.preventDefault();
                AudioManager.getInstance().playUIClick();
                filtered[activeIdx]?.action();
                setIsOpen(false);
              }
            }}
            autoFocus
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-400 focus:outline-none"
          />
          <button
            type="button"
            aria-label={t('common.close')}
            title={t('common.close')}
            onClick={() => setIsOpen(false)}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div
          id="command-palette-listbox"
          ref={listRef}
          role="listbox"
          onWheel={(e) => e.stopPropagation()}
          className="max-h-80 overflow-y-auto overscroll-contain touch-pan-y vip-scrollbar p-2 space-y-1"
        >
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 font-mono">
              {t('commandPalette.noResults')}
            </div>
          ) : (
            filtered.map((item, idx) => (
              <button
                key={item.id}
                id={`cmd-option-${item.id}`}
                role="option"
                aria-selected={idx === activeIdx}
                data-cmd-active={idx === activeIdx ? 'true' : undefined}
                type="button"
                onMouseEnter={() => setSelectedIndex(idx)}
                onClick={() => {
                  AudioManager.getInstance().playUIClick();
                  item.action();
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center justify-between transition-colors group cursor-pointer ${
                  idx === activeIdx ? 'bg-sky-500/20 border border-sky-400/30' : 'hover:bg-white/10 border border-transparent'
                }`}
              >
                <div className="flex items-center space-x-3 min-w-0 pr-2">
                  {item.icon}
                  <span className="text-xs text-slate-200 group-hover:text-white font-medium truncate">
                    {item.title}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 shrink-0">
                  {item.category}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
