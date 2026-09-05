import React from 'react';
import { X, Sliders, Monitor, Volume2, Orbit, ShieldCheck, Globe2 } from 'lucide-react';
import { useAppStore, QualityTier } from '@/stores/useAppStore';
import { AudioManager } from '@/engine/audio/AudioManager';
import { PerformanceManager } from '@/engine/performance/PerformanceManager';
import { useTranslation } from '@/i18n';

export const SettingsModal: React.FC = () => {
  const { t, language, setLanguage } = useTranslation();
  const isSettingsOpen = useAppStore((state) => state.isSettingsOpen);
  const setSettingsOpen = useAppStore((state) => state.setSettingsOpen);

  const quality = useAppStore((state) => state.graphicsQuality);
  const setQuality = useAppStore((state) => state.setGraphicsQuality);
  const detectedTier = useAppStore((state) => state.detectedGPUTier);

  const showOrbits = useAppStore((state) => state.showOrbits);
  const toggleOrbits = useAppStore((state) => state.toggleOrbits);

  const soundEnabled = useAppStore((state) => state.soundEnabled);
  const toggleSound = useAppStore((state) => state.toggleSound);

  const reducedMotion = useAppStore((state) => state.reducedMotion);
  const toggleReducedMotion = useAppStore((state) => state.toggleReducedMotion);

  if (!isSettingsOpen) return null;

  const qualityTiers: QualityTier[] = ['AUTO', 'LOW', 'MEDIUM', 'HIGH', 'ULTRA'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md pointer-events-auto">
      <div className="glass-panel-glow w-full max-w-lg p-6 rounded-3xl border border-sky-500/40 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center space-x-2.5 text-sky-400">
            <Sliders className="w-5 h-5" />
            <h2 className="text-base font-bold text-white tracking-wide">{t('settings.title')}</h2>
          </div>

          <button
            onClick={() => {
              AudioManager.getInstance().playUIClick();
              setSettingsOpen(false);
            }}
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Language Selection */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2 text-sm text-slate-200">
            <Globe2 className="w-4 h-4 text-sky-400" />
            <span>{t('settings.language')}</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                AudioManager.getInstance().playUIClick();
                setLanguage('vi');
              }}
              className={`py-2 px-3 text-center rounded-xl text-xs font-medium transition-all cursor-pointer ${
                language === 'vi'
                  ? 'bg-sky-500 text-white font-bold shadow-lg shadow-sky-500/30 border border-sky-400'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              🇻🇳 {t('settings.langVi')}
            </button>

            <button
              onClick={() => {
                AudioManager.getInstance().playUIClick();
                setLanguage('en');
              }}
              className={`py-2 px-3 text-center rounded-xl text-xs font-medium transition-all cursor-pointer ${
                language === 'en'
                  ? 'bg-sky-500 text-white font-bold shadow-lg shadow-sky-500/30 border border-sky-400'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              🇬🇧 {t('settings.langEn')}
            </button>
          </div>
        </div>

        {/* Graphics Preset */}
        <div className="space-y-3 border-t border-white/10 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm text-slate-200">
              <Monitor className="w-4 h-4 text-sky-400" />
              <span>{t('settings.graphicsPreset')}</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              {t('settings.gpuTier')}: {detectedTier} (DPR: {PerformanceManager.getInstance().getDPR(quality).toFixed(1)})
            </span>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {qualityTiers.map((tier) => (
              <button
                key={tier}
                onClick={() => {
                  AudioManager.getInstance().playUIClick();
                  setQuality(tier);
                }}
                className={`py-2 px-1 text-center rounded-xl text-xs font-mono transition-all cursor-pointer ${
                  quality === tier
                    ? 'bg-sky-500 text-white font-bold shadow-lg shadow-sky-500/30 border border-sky-400'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                {tier}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-slate-400">
            {quality === 'AUTO'
              ? 'Tự động điều chỉnh mật độ hạt và DPR theo thời gian thực để duy trì 60 FPS.'
              : `Thiết lập thủ công chất lượng ${quality}.`}
          </p>
        </div>

        {/* Toggles */}
        <div className="space-y-3 border-t border-white/10 pt-4">
          {/* Orbits Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2 text-sm text-slate-200">
                <Orbit className="w-4 h-4 text-sky-400" />
                <span>{t('settings.orbitsToggle')}</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">{t('settings.orbitsDesc')}</p>
            </div>
            <button
              onClick={() => {
                AudioManager.getInstance().playUIClick();
                toggleOrbits();
              }}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                showOrbits ? 'bg-sky-500' : 'bg-white/20'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  showOrbits ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Spatial Sound Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2 text-sm text-slate-200">
                <Volume2 className="w-4 h-4 text-emerald-400" />
                <span>{t('settings.audioToggle')}</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">{t('settings.audioDesc')}</p>
            </div>
            <button
              onClick={() => {
                AudioManager.getInstance().playUIClick();
                toggleSound();
                AudioManager.getInstance().updateSoundState(!soundEnabled);
              }}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                soundEnabled ? 'bg-emerald-500' : 'bg-white/20'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  soundEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Reduced Motion Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2 text-sm text-slate-200">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>{t('settings.reducedMotionToggle')}</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">{t('settings.reducedMotionDesc')}</p>
            </div>
            <button
              onClick={() => {
                AudioManager.getInstance().playUIClick();
                toggleReducedMotion();
              }}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                reducedMotion ? 'bg-amber-500' : 'bg-white/20'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  reducedMotion ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
