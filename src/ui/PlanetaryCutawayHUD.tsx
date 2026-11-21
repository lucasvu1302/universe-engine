import React from 'react';
import { Layers, X } from 'lucide-react';
import { useAppStore, type CutawayBodyId } from '@/stores/useAppStore';
import { getCutawayBodyProfile } from '@/simulation/cosmic/Wave2Physics';
import { ModeOrchestrator } from '@/engine/navigation/ModeOrchestrator';
import { AudioManager } from '@/engine/audio/AudioManager';
import { useTranslation } from '@/i18n';

const BODY_TABS: { id: CutawayBodyId; vi: string; en: string }[] = [
  { id: 'earth', vi: 'Trái Đất', en: 'Earth' },
  { id: 'sun', vi: 'Mặt Trời', en: 'Sun' },
  { id: 'jupiter', vi: 'Sao Mộc', en: 'Jupiter' },
  { id: 'europa', vi: 'Europa', en: 'Europa' },
  { id: 'neutron_star', vi: 'Sao Neutron', en: 'Neutron Star' },
];

export const PlanetaryCutawayHUD: React.FC = () => {
  const { language } = useTranslation();
  const isVi = language === 'vi';

  const activeLab = useAppStore((s) => s.activeCosmicLab);
  const cutawayBody = useAppStore((s) => s.cutawayBody);
  const cutawayAngleDeg = useAppStore((s) => s.cutawayAngleDeg);
  const cutawaySelectedLayer = useAppStore((s) => s.cutawaySelectedLayer);

  const setCutawayBody = useAppStore((s) => s.setCutawayBody);
  const setCutawayAngleDeg = useAppStore((s) => s.setCutawayAngleDeg);
  const setCutawaySelectedLayer = useAppStore((s) => s.setCutawaySelectedLayer);

  if (activeLab !== 'planetary_cutaway') return null;

  const profile = getCutawayBodyProfile(cutawayBody);
  const activeLayer = profile.layers[cutawaySelectedLayer] ?? profile.layers[0];
  const audio = AudioManager.getInstance();

  return (
    <div
      data-testid="planetary-cutaway-hud"
      className="fixed inset-0 pointer-events-none z-40 flex flex-col justify-between p-3 sm:p-5 select-none"
    >
      {/* Top Bar */}
      <div className="flex items-start justify-between gap-2 w-full">
        <div className="pointer-events-auto glass-panel-glow rounded-2xl border border-amber-400/35 px-3 sm:px-3.5 py-2 sm:py-2.5 max-w-lg min-w-0">
          <div className="text-[10px] font-mono uppercase tracking-wider text-amber-300 flex items-center space-x-1.5">
            <Layers className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">
              {isVi ? 'GIẢI PHẪU ĐỊA CHẤT & VẬT LÝ THIÊN THỂ 3D' : '3D PLANETARY & STELLAR INTERIOR CUTAWAY'}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-0.5">
            <span className="text-xs sm:text-sm font-bold text-white">
              {isVi ? profile.nameVi : profile.nameEn}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-200">
              R = {profile.radiusKm.toLocaleString(isVi ? 'vi-VN' : 'en-US')} km
            </span>
          </div>
        </div>

        <button
          type="button"
          data-testid="exit-cutaway-btn"
          onClick={() => {
            audio.playUIClick();
            ModeOrchestrator.getInstance().exitCosmicLab();
          }}
          className="pointer-events-auto flex items-center space-x-1.5 px-3 sm:px-3.5 py-2 rounded-xl glass-panel-glow border border-white/15 hover:bg-white/15 text-xs font-semibold text-white cursor-pointer shrink-0"
        >
          <X className="w-4 h-4" />
          <span>{isVi ? 'Thoát' : 'Exit'}</span>
        </button>
      </div>

      {/* Bottom Interactive Inspector Dock */}
      <div className="pointer-events-auto w-full max-w-4xl mx-auto glass-panel-glow rounded-2xl border border-amber-400/25 p-3 sm:p-4 space-y-2.5 shadow-2xl max-h-[45dvh] sm:max-h-none overflow-y-auto overscroll-contain touch-pan-y vip-scrollbar">
        {/* 5 Body Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          {BODY_TABS.map((b) => {
            const active = cutawayBody === b.id;
            return (
              <button
                key={b.id}
                type="button"
                data-testid={`cutaway-body-${b.id}`}
                onClick={() => {
                  audio.playUIClick();
                  setCutawayBody(b.id);
                }}
                className={`px-2.5 py-1 rounded-xl border text-[11px] font-semibold transition-all cursor-pointer ${
                  active
                    ? 'bg-amber-500/25 border-amber-400/60 text-amber-100'
                    : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                }`}
              >
                {isVi ? b.vi : b.en}
              </button>
            );
          })}
        </div>

        {/* Wedge Angle Slider */}
        <div>
          <div className="flex justify-between text-[10px] font-mono text-slate-300 mb-1">
            <span>{isVi ? 'GÓC LÁT CẮT 3D (0° – 180°)' : '3D WEDGE CUT ANGLE (0° – 180°)'}</span>
            <span className="text-amber-300 font-bold">{Math.round(cutawayAngleDeg)}°</span>
          </div>
          <input
            type="range"
            data-testid="cutaway-angle-slider"
            min={0}
            max={180}
            step={1}
            value={cutawayAngleDeg}
            onChange={(e) => setCutawayAngleDeg(parseFloat(e.target.value))}
            aria-label={isVi ? 'Góc cắt mặt cắt hành tinh' : 'Planetary cutaway wedge angle'}
            className="w-full accent-amber-400 cursor-pointer"
          />
        </div>

        {/* 4 Concentric Strata Selector */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {profile.layers.map((layer, idx) => {
            const selected = idx === cutawaySelectedLayer;
            return (
              <button
                key={layer.id}
                type="button"
                data-testid={`cutaway-layer-${idx}`}
                onClick={() => {
                  audio.playUIClick();
                  setCutawaySelectedLayer(idx);
                }}
                className={`text-left rounded-xl border px-2.5 py-1.5 transition-all cursor-pointer ${
                  selected
                    ? 'bg-white/15 border-amber-300/70 text-white'
                    : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                }`}
              >
                <div className="flex items-start space-x-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 mt-0.5 border border-white/30"
                    style={{ backgroundColor: layer.colorHex }}
                  />
                  <span className="text-[10px] sm:text-[11px] font-bold leading-tight line-clamp-2">
                    {isVi ? layer.nameVi : layer.nameEn}
                  </span>
                </div>
                <div className="text-[9px] font-mono text-slate-400 mt-0.5 truncate">
                  {layer.depthKm}
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Layer Detailed Telemetry */}
        <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
          <div className="min-w-0">
            <div className="font-bold text-amber-200">
              {isVi ? activeLayer.nameVi : activeLayer.nameEn}
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5">
              {isVi ? activeLayer.compositionVi : activeLayer.compositionEn}
            </p>
          </div>
          <div className="flex items-center gap-3 font-mono text-[10px] shrink-0">
            <div>
              <div className="text-slate-400">{isVi ? 'NHIỆT ĐỘ' : 'TEMP'}</div>
              <div className="text-orange-300 font-bold">{activeLayer.tempK}</div>
            </div>
            <div>
              <div className="text-slate-400">{isVi ? 'ÁP SUẤT' : 'PRESSURE'}</div>
              <div className="text-sky-300 font-bold">{activeLayer.pressureGPa}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
