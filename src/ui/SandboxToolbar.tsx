import React from 'react';
import { Flame, Sparkles, Orbit, X, Bomb } from 'lucide-react';
import { AudioManager } from '@/engine/audio/AudioManager';
import { useTranslation } from '@/i18n';

interface SandboxToolbarProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerMeteor: () => void;
  onTriggerTidal: () => void;
  onTriggerSupernova: () => void;
}

export const SandboxToolbar: React.FC<SandboxToolbarProps> = ({
  isOpen,
  onClose,
  onTriggerMeteor,
  onTriggerTidal,
  onTriggerSupernova
}) => {
  const { t } = useTranslation();
  if (!isOpen) return null;

  const audio = AudioManager.getInstance();

  return (
    <div className="fixed top-[6.75rem] sm:top-16 left-1/2 -translate-x-1/2 z-40 max-w-[calc(100vw-1.5rem)] flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 bg-black/85 backdrop-blur-md px-3 sm:px-4 py-2 rounded-2xl sm:rounded-full border border-rose-500/40 shadow-2xl animate-in slide-in-from-top duration-200 select-none">
      <div className="flex items-center space-x-1.5 pr-2 border-r border-white/10 text-xs font-mono text-rose-400 font-bold">
        <Bomb className="w-4 h-4" />
        <span className="hidden sm:inline">{t('nav.sandbox')}</span>
      </div>

      <button
        type="button"
        onClick={() => {
          audio.playUIClick();
          onTriggerMeteor();
        }}
        className="flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-full bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 border border-orange-500/40 text-[11px] sm:text-xs font-medium transition-all cursor-pointer"
      >
        <Flame className="w-3.5 h-3.5 text-orange-400" />
        <span>{t('sandbox.meteorTitle')}</span>
      </button>

      <button
        type="button"
        onClick={() => {
          audio.playUIClick();
          onTriggerTidal();
        }}
        className="flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-full bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-[11px] sm:text-xs font-medium transition-all cursor-pointer"
      >
        <Orbit className="w-3.5 h-3.5 text-purple-400" />
        <span>{t('sandbox.tidalTitle')}</span>
      </button>

      <button
        type="button"
        onClick={() => {
          audio.playUIClick();
          onTriggerSupernova();
        }}
        className="flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-full bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 text-[11px] sm:text-xs font-medium transition-all cursor-pointer"
      >
        <Sparkles className="w-3.5 h-3.5 text-sky-400" />
        <span>{t('sandbox.supernovaTitle')}</span>
      </button>

      <button
        type="button"
        aria-label={t('common.close')}
        onClick={() => {
          audio.playUIClick();
          onClose();
        }}
        className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
        title={t('common.close')}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
