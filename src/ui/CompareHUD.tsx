import React from 'react';
import { X, Scale, Ruler, Weight, Thermometer, Clock } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { CELESTIAL_BODIES, PLANET_KEYS } from '@/data/celestialData';
import { AudioManager } from '@/engine/audio/AudioManager';

export const CompareHUD: React.FC = () => {
  const compareMode = useAppStore((state) => state.compareMode);
  const setCompareMode = useAppStore((state) => state.setCompareMode);
  const planetAId = useAppStore((state) => state.comparePlanetA);
  const planetBId = useAppStore((state) => state.comparePlanetB);
  const setComparePlanets = useAppStore((state) => state.setComparePlanets);
  const trueSize = useAppStore((state) => state.compareTrueSize);
  const toggleTrueSize = useAppStore((state) => state.toggleCompareTrueSize);

  if (!compareMode) return null;

  const dataA = CELESTIAL_BODIES[planetAId] || CELESTIAL_BODIES.earth;
  const dataB = CELESTIAL_BODIES[planetBId] || CELESTIAL_BODIES.jupiter;

  const allChoices = ['sun', ...PLANET_KEYS, 'moon'];

  return (
    <div className="fixed inset-x-0 bottom-6 z-40 flex justify-center px-4 pointer-events-none">
      <div className="glass-panel-glow w-full max-w-2xl p-5 rounded-3xl border border-indigo-500/40 pointer-events-auto space-y-4 shadow-2xl">
        {/* Header & Controls */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center space-x-2 text-indigo-400">
            <Scale className="w-5 h-5" />
            <span className="text-xs font-mono font-bold tracking-wider uppercase">
              CELESTIAL COMPARISON ENGINE
            </span>
          </div>

          <div className="flex items-center space-x-3">
            {/* True Size Toggle */}
            <button
              onClick={() => {
                AudioManager.getInstance().playUIClick();
                toggleTrueSize();
              }}
              className={`px-3 py-1 rounded-full text-xs font-mono transition-all ${
                trueSize
                  ? 'bg-indigo-500 text-white font-bold shadow-md shadow-indigo-500/30'
                  : 'bg-white/10 text-slate-300 hover:bg-white/20'
              }`}
            >
              {trueSize ? 'TRUE SCALE: ACTIVE' : 'VISUAL SCALE'}
            </button>

            <button
              onClick={() => {
                AudioManager.getInstance().playUIClick();
                setCompareMode(false);
              }}
              className="p-1 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Planet Selectors */}
        <div className="grid grid-cols-2 gap-6">
          {/* Planet A Selector */}
          <div>
            <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
              Body A
            </label>
            <select
              value={planetAId}
              onChange={(e) => {
                AudioManager.getInstance().playUIClick();
                setComparePlanets(e.target.value, planetBId);
              }}
              className="w-full bg-slate-900/90 text-white text-xs rounded-xl p-2.5 border border-white/20 outline-none"
            >
              {allChoices.map((key) => (
                <option key={key} value={key}>
                  {CELESTIAL_BODIES[key]?.displayName}
                </option>
              ))}
            </select>
          </div>

          {/* Planet B Selector */}
          <div>
            <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
              Body B
            </label>
            <select
              value={planetBId}
              onChange={(e) => {
                AudioManager.getInstance().playUIClick();
                setComparePlanets(planetAId, e.target.value);
              }}
              className="w-full bg-slate-900/90 text-white text-xs rounded-xl p-2.5 border border-white/20 outline-none"
            >
              {allChoices.map((key) => (
                <option key={key} value={key}>
                  {CELESTIAL_BODIES[key]?.displayName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Comparison Metrics Grid */}
        <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
          {/* Metrics for A */}
          <div className="bg-white/5 p-3 rounded-2xl space-y-2 border border-white/5 font-mono">
            <div className="text-sm font-bold text-sky-400 font-sans">{dataA.name}</div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="flex items-center text-slate-400"><Ruler className="w-3 h-3 mr-1 text-sky-400" /> Diameter:</span>
              <span className="text-white">{dataA.diameterKm.toLocaleString()} km</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="flex items-center text-slate-400"><Weight className="w-3 h-3 mr-1 text-amber-400" /> Gravity:</span>
              <span className="text-white">{dataA.gravityMs2} m/s²</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="flex items-center text-slate-400"><Clock className="w-3 h-3 mr-1 text-emerald-400" /> Day:</span>
              <span className="text-white">{dataA.dayLengthHours}h</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="flex items-center text-slate-400"><Thermometer className="w-3 h-3 mr-1 text-rose-400" /> Temp:</span>
              <span className="text-white">{dataA.meanTemperatureC}°C</span>
            </div>
          </div>

          {/* Metrics for B */}
          <div className="bg-white/5 p-3 rounded-2xl space-y-2 border border-white/5 font-mono">
            <div className="text-sm font-bold text-amber-400 font-sans">{dataB.name}</div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="flex items-center text-slate-400"><Ruler className="w-3 h-3 mr-1 text-sky-400" /> Diameter:</span>
              <span className="text-white">{dataB.diameterKm.toLocaleString()} km</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="flex items-center text-slate-400"><Weight className="w-3 h-3 mr-1 text-amber-400" /> Gravity:</span>
              <span className="text-white">{dataB.gravityMs2} m/s²</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="flex items-center text-slate-400"><Clock className="w-3 h-3 mr-1 text-emerald-400" /> Day:</span>
              <span className="text-white">{dataB.dayLengthHours}h</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="flex items-center text-slate-400"><Thermometer className="w-3 h-3 mr-1 text-rose-400" /> Temp:</span>
              <span className="text-white">{dataB.meanTemperatureC}°C</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
