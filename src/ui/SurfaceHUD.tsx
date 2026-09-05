import React from 'react';
import { ArrowUpCircle, Compass, Wind, Gauge, Thermometer, ShieldAlert } from 'lucide-react';
import { AudioManager } from '@/engine/audio/AudioManager';

interface SurfaceHUDProps {
  location: 'mars' | 'moon';
  onTakeoff: () => void;
}

export const SurfaceHUD: React.FC<SurfaceHUDProps> = ({ location, onTakeoff }) => {
  const isMars = location === 'mars';
  const audio = AudioManager.getInstance();

  const handleTakeoff = () => {
    audio.playWarpDrive();
    onTakeoff();
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-40 flex flex-col justify-between p-4 md:p-6 select-none font-mono">
      {/* Top Telemetry Header */}
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center space-x-3 pointer-events-auto bg-black/70 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 shadow-xl">
          <div className={`w-3 h-3 rounded-full animate-pulse ${isMars ? 'bg-orange-500' : 'bg-slate-300'}`} />
          <div>
            <div className="text-xs text-slate-400 font-medium">SURFACE EXPLORATION</div>
            <div className="text-sm md:text-base font-bold text-white tracking-wider">
              {isMars ? 'MARS • JEZERO CRATER' : 'MOON • SEA OF TRANQUILITY (APOLLO 11)'}
            </div>
          </div>
        </div>

        {/* Take off Button */}
        <button
          onClick={handleTakeoff}
          className="pointer-events-auto flex items-center space-x-2 px-4 py-2 rounded-2xl bg-sky-500/80 hover:bg-sky-500 text-white font-semibold shadow-lg shadow-sky-500/30 border border-sky-400/40 transition-all cursor-pointer group"
          title="Blast off back to orbit"
        >
          <ArrowUpCircle className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
          <span className="text-xs">Take Off to Orbit</span>
        </button>
      </div>

      {/* Bottom Environmental Diagnostics Grid */}
      <div className="flex flex-wrap items-center justify-between gap-3 w-full">
        <div className="flex items-center space-x-4 pointer-events-auto bg-black/70 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 text-xs">
          <div className="flex items-center space-x-1.5 text-slate-300">
            <Gauge className="w-3.5 h-3.5 text-sky-400" />
            <span>ALT: <strong className="text-white">2.4 m</strong></span>
          </div>
          <div className="flex items-center space-x-1.5 text-slate-300">
            <Wind className="w-3.5 h-3.5 text-amber-400" />
            <span>ATM: <strong className="text-white">{isMars ? '0.006 atm (CO₂)' : '0.000 atm (Vacuum)'}</strong></span>
          </div>
          <div className="flex items-center space-x-1.5 text-slate-300">
            <Thermometer className="w-3.5 h-3.5 text-rose-400" />
            <span>TEMP: <strong className="text-white">{isMars ? '-63 °C' : '-20 °C'}</strong></span>
          </div>
          <div className="flex items-center space-x-1.5 text-slate-300">
            <Compass className="w-3.5 h-3.5 text-emerald-400" />
            <span>GRAV: <strong className="text-white">{isMars ? '0.38 g' : '0.16 g'}</strong></span>
          </div>
        </div>

        <div className="hidden md:flex items-center space-x-2 text-[11px] text-slate-400 bg-black/40 px-3 py-1.5 rounded-xl border border-white/5">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
          <span>LIFE SUPPORT: NOMINAL</span>
        </div>
      </div>
    </div>
  );
};
