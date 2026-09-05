import React, { useState, useEffect, useMemo } from 'react';
import { Search, Compass, Globe2, Rocket, Play, Camera, Volume2, Sliders, X, Orbit, Film, Disc } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { CELESTIAL_BODIES, ALL_CELESTIAL_KEYS } from '@/data/celestialData';
import { CameraManager } from '@/engine/camera/CameraManager';
import { AudioManager } from '@/engine/audio/AudioManager';
import { CinematicDirector } from '@/engine/camera/CinematicDirector';
import { HarmonicesMundiSynth } from '@/engine/audio/HarmonicesMundiSynth';

export const CommandPalette: React.FC = () => {
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
        title: 'Galaxy Overview',
        category: 'Navigation',
        icon: <Compass className="w-4 h-4 text-purple-400" />,
        action: () => {
          setCameraMode('GALAXY');
          CameraManager.getInstance().flyToGalaxyView();
        }
      },
      {
        id: 'blackhole',
        title: 'Warp to Supermassive Black Hole (Gargantua)',
        category: 'Navigation',
        icon: <Orbit className="w-4 h-4 text-orange-400" />,
        action: () => {
          setTargetId('blackhole');
          setCameraMode('ORBIT');
          CameraManager.getInstance().flyToBlackHole();
        }
      },
      {
        id: 'flight',
        title: 'Enable Free Flight (Spacecraft Controls)',
        category: 'Navigation',
        icon: <Rocket className="w-4 h-4 text-emerald-400" />,
        action: () => {
          setCameraMode('FREE_FLIGHT');
        }
      },
      {
        id: 'tour',
        title: 'Start Cinematic Auto Tour',
        category: 'Experience',
        icon: <Play className="w-4 h-4 text-amber-400" />,
        action: () => {
          startTour();
        }
      },
      {
        id: 'photo',
        title: 'Enter Photo Mode',
        category: 'Experience',
        icon: <Camera className="w-4 h-4 text-rose-400" />,
        action: () => {
          setPhotoMode(true);
        }
      },
      {
        id: 'cinema-auto',
        title: 'Enter Cinema Mode (IMAX 2.39:1 Anamorphic)',
        category: 'Cinema',
        icon: <Film className="w-4 h-4 text-rose-400" />,
        action: () => {
          CinematicDirector.getInstance().enterCinemaMode('AUTO');
        }
      },
      {
        id: 'cinema-drift',
        title: 'Cinema: Earth Sunrise Orbital Drift',
        category: 'Cinema',
        icon: <Film className="w-4 h-4 text-amber-400" />,
        action: () => {
          CinematicDirector.getInstance().enterCinemaMode('ORBITAL_DRIFT');
        }
      },
      {
        id: 'cinema-rings',
        title: 'Cinema: Saturn Ice Rings Flyby',
        category: 'Cinema',
        icon: <Film className="w-4 h-4 text-sky-400" />,
        action: () => {
          CinematicDirector.getInstance().enterCinemaMode('RING_SKI');
        }
      },
      {
        id: 'cinema-slingshot',
        title: 'Cinema: Jupiter Gravitational Slingshot',
        category: 'Cinema',
        icon: <Film className="w-4 h-4 text-purple-400" />,
        action: () => {
          CinematicDirector.getInstance().enterCinemaMode('SLINGSHOT');
        }
      },
      {
        id: 'kepler-synth',
        title: 'Toggle Kepler Harmonices Mundi Ambient Synth',
        category: 'Audio',
        icon: <Disc className="w-4 h-4 text-indigo-400" />,
        action: () => {
          HarmonicesMundiSynth.getInstance().toggle();
          useAppStore.getState().toggleHarmonicesMundi();
        }
      },
      {
        id: 'orbits',
        title: 'Toggle Orbital Paths',
        category: 'View',
        icon: <Sliders className="w-4 h-4 text-sky-400" />,
        action: () => {
          toggleOrbits();
        }
      },
      {
        id: 'sound',
        title: soundEnabled ? 'Mute Spatial Audio' : 'Enable Spatial Audio',
        category: 'Audio',
        icon: <Volume2 className="w-4 h-4 text-indigo-400" />,
        action: () => {
          toggleSound();
        }
      },
      {
        id: 'graphics-ultra',
        title: 'Graphics: ULTRA Quality',
        category: 'Graphics',
        icon: <Sliders className="w-4 h-4 text-emerald-400" />,
        action: () => {
          setGraphicsQuality('ULTRA');
        }
      }
    ];

    // All Celestial Bodies (Sun, 8 Planets, 10 Moons, Black Hole)
    const bodyItems = ALL_CELESTIAL_KEYS.map((key) => {
      const b = CELESTIAL_BODIES[key];
      const isMoon = b.type === 'moon';
      const isBlackHole = b.type === 'black_hole';

      return {
        id: `body-${key}`,
        title: `Go to ${b.name}`,
        category: isBlackHole ? 'Singularity' : isMoon ? 'Moon' : 'Planet',
        icon: isBlackHole ? (
          <Orbit className="w-4 h-4 text-orange-400" />
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
          } else {
            CameraManager.getInstance().focusPlanet(key);
          }
        }
      };
    });

    return [...list, ...bodyItems];
  }, [setCameraMode, setTargetId, startTour, setPhotoMode, toggleOrbits, soundEnabled, toggleSound, setGraphicsQuality]);

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
            placeholder="Search celestial bodies, moons, black hole, commands... (Esc to close)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
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
              No matching celestial bodies or commands found.
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
