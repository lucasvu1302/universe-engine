import React, { useState, useEffect, useMemo } from 'react';
import { Search, Compass, Globe2, Rocket, Play, Camera, Volume2, Sliders, X, Orbit, Film, Disc, Sparkles } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { CELESTIAL_BODIES, ALL_CELESTIAL_KEYS, getLocalizedBodyData } from '@/data/celestialData';
import { CameraManager } from '@/engine/camera/CameraManager';
import { AudioManager } from '@/engine/audio/AudioManager';
import { CinematicDirector } from '@/engine/camera/CinematicDirector';
import { HarmonicesMundiSynth } from '@/engine/audio/HarmonicesMundiSynth';
import { SimulationManager } from '@/simulation/core/SimulationManager';
import { useTranslation } from '@/i18n';

export const CommandPalette: React.FC = () => {
  const { t, language } = useTranslation();
  const isOpen = useAppStore((state) => state.isCommandPaletteOpen);
  const setIsOpen = useAppStore((state) => state.setCommandPaletteOpen);
  const setTargetId = useAppStore((state) => state.setTargetId);
  const setCameraMode = useAppStore((state) => state.setCameraMode);
  const startTour = useAppStore((state) => state.startTour);
  const setPhotoMode = useAppStore((state) => state.setPhotoMode);
  const toggleOrbits = useAppStore((state) => state.toggleOrbits);
  const toggleSound = useAppStore((state) => state.toggleSound);
  const soundEnabled = useAppStore((state) => state.soundEnabled);
  const setGraphicsQuality = useAppStore((state) => state.setGraphicsQuality);

  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen(!isOpen);
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, setIsOpen]);

  const commands = useMemo(() => {
    const list = [
      {
        id: 'galaxy',
        title: t('commandPalette.cmdGalaxy'),
        category: t('commandPalette.catNavigation'),
        icon: <Compass className="w-4 h-4 text-purple-400" />,
        action: () => {
          setCameraMode('GALAXY');
          CameraManager.getInstance().flyToGalaxyView();
        }
      },
      {
        id: 'earth-launch',
        title: language === 'vi' ? 'Mô Phỏng Phóng Tàu Từ Trái Đất (3D Cockpit)' : 'Earth Launch Simulation (3D Cockpit)',
        category: language === 'vi' ? 'Mô Phỏng' : 'Simulation',
        icon: <Rocket className="w-4 h-4 text-cyan-400" />,
        action: () => {
          SimulationManager.getInstance().startScenario('earth_launch');
          setIsOpen(false);
        }
      },
      {
        id: 'earth-history',
        title: language === 'vi' ? 'Dòng Thời Gian Lịch Sử Trái Đất (-4.54 Tỷ Năm)' : 'Earth Geological History Timeline (-4.54 Ga)',
        category: language === 'vi' ? 'Mô Phỏng' : 'Simulation',
        icon: <Globe2 className="w-4 h-4 text-emerald-400" />,
        action: () => {
          SimulationManager.getInstance().startScenario('earth_history');
          setIsOpen(false);
        }
      },
      {
        id: 'cosmic-history',
        title: language === 'vi' ? 'Sự Kiện Vũ Trụ: Big Bang, Sao & Siêu Tân Tinh' : 'Cosmic Events: Big Bang & Supernova',
        category: language === 'vi' ? 'Mô Phỏng' : 'Simulation',
        icon: <Sparkles className="w-4 h-4 text-purple-400" />,
        action: () => {
          SimulationManager.getInstance().startScenario('cosmic_history');
          setIsOpen(false);
        }
      },
      {
        id: 'blackhole',
        title: t('commandPalette.cmdBlackHole'),
        category: t('commandPalette.catSingularity'),
        icon: <Orbit className="w-4 h-4 text-orange-400" />,
        action: () => {
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
          setCameraMode('FREE_FLIGHT');
        }
      },
      {
        id: 'pulsar',
        title: t('commandPalette.cmdPulsar'),
        category: t('commandPalette.catSingularity'),
        icon: <Sparkles className="w-4 h-4 text-cyan-400" />,
        action: () => {
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
          CinematicDirector.getInstance().enterCinemaMode('ORBITAL_DRIFT');
        }
      },
      {
        id: 'cinema-rings',
        title: t('commandPalette.cmdCinemaRingSki'),
        category: t('commandPalette.catCinema'),
        icon: <Film className="w-4 h-4 text-sky-400" />,
        action: () => {
          CinematicDirector.getInstance().enterCinemaMode('RING_SKI');
        }
      },
      {
        id: 'cinema-slingshot',
        title: t('commandPalette.cmdCinemaSlingshot'),
        category: t('commandPalette.catCinema'),
        icon: <Film className="w-4 h-4 text-purple-400" />,
        action: () => {
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

    // All Celestial Bodies (Sun, 8 Planets, 10 Moons, Black Hole, Pulsar)
    const bodyItems = ALL_CELESTIAL_KEYS.map((key) => {
      const loc = getLocalizedBodyData(key);
      const isMoon = CELESTIAL_BODIES[key]?.type === 'moon';
      const isBlackHole = key === 'blackhole';
      const isPulsar = key === 'pulsar';

      return {
        id: `body-${key}`,
        title: loc.displayName,
        category: isBlackHole || isPulsar
          ? t('commandPalette.catSingularity')
          : isMoon
          ? t('targetHud.knownMoons')
          : t('commandPalette.catNavigation'),
        icon: isBlackHole ? (
          <Orbit className="w-4 h-4 text-orange-400" />
        ) : isPulsar ? (
          <Sparkles className="w-4 h-4 text-cyan-400" />
        ) : isMoon ? (
          <div className="w-2.5 h-2.5 rounded-full bg-slate-300 ml-0.5" />
        ) : (
          <Globe2 className="w-4 h-4 text-sky-400" />
        ),
        action: () => {
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

    return [...list, ...bodyItems];
  }, [t, language, setCameraMode, setTargetId, startTour, setPhotoMode, toggleOrbits, soundEnabled, toggleSound, setGraphicsQuality]);

  const filtered = useMemo(() => {
    if (!query.trim()) return commands;
    const lower = query.toLowerCase();
    return commands.filter(
      (c) => c.title.toLowerCase().includes(lower) || c.category.toLowerCase().includes(lower)
    );
  }, [commands, query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-xl glass-panel-glow rounded-2xl overflow-hidden shadow-2xl border border-sky-500/30 flex flex-col">
        {/* Search Header */}
        <div className="flex items-center px-4 py-3 border-b border-white/10">
          <Search className="w-4 h-4 text-sky-400 mr-3" />
          <input
            type="text"
            placeholder={t('commandPalette.placeholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && filtered.length > 0) {
                AudioManager.getInstance().playUIClick();
                filtered[0].action();
                setIsOpen(false);
              }
            }}
            autoFocus
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-400 focus:outline-none"
          />
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 font-mono">
              {t('commandPalette.noResults')}
            </div>
          ) : (
            filtered.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  AudioManager.getInstance().playUIClick();
                  item.action();
                  setIsOpen(false);
                }}
                className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-white/10 flex items-center justify-between transition-colors group cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  {item.icon}
                  <span className="text-xs text-slate-200 group-hover:text-white font-medium">
                    {item.title}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10">
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
