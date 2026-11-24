import React, { useEffect, useRef, useState } from 'react';
import { Camera, X, Download, Sliders } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { CameraManager } from '@/engine/camera/CameraManager';
import { AudioManager } from '@/engine/audio/AudioManager';
import { useTranslation } from '@/i18n';

export const PhotoModeModal: React.FC = () => {
  const { t, language } = useTranslation();
  const isPhotoMode = useAppStore((state) => state.photoMode);
  const setPhotoMode = useAppStore((state) => state.setPhotoMode);
  const exposure = useAppStore((state) => state.photoExposure);
  const setExposure = useAppStore((state) => state.setPhotoExposure);

  const [fov, setFov] = useState(50);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isPhotoMode) {
      setFov(50);
      setExposure(1.18);
      if (useAppStore.getState().activeSpaceGame === 'none') {
        const cam = CameraManager.getInstance().camera;
        if (cam && cam.fov !== 50) {
          cam.fov = 50;
          cam.updateProjectionMatrix();
        }
      }
    }
  }, [isPhotoMode, setExposure]);

  if (!isPhotoMode) return null;

  const handleFovChange = (val: number) => {
    setFov(val);
    const cam = CameraManager.getInstance().camera;
    if (cam) {
      cam.fov = val;
      cam.updateProjectionMatrix();
    }
  };

  const handleClose = () => {
    AudioManager.getInstance().playUIClick();
    setExposure(1.18);
    handleFovChange(50);
    setPhotoMode(false);
  };

  const handleCapture = () => {
    AudioManager.getInstance().playUIClick();
    CameraManager.getInstance().requestScreenshot((dataUrl) => {
      try {
        const link = document.createElement('a');
        link.download = `universe-engine-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
      } catch (err) {
        console.warn('Canvas export failed:', err);
      }
    });
  };

  const handleKeyDownTrap = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab' || !dialogRef.current) return;
    const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
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
      aria-labelledby="photo-mode-dialog-title"
      onKeyDown={handleKeyDownTrap}
      className="fixed inset-0 z-50 pointer-events-none flex flex-col justify-between p-4 sm:p-6"
    >
      {/* Top Header */}
      <div className="flex justify-between items-center pointer-events-auto">
        <div className="glass-panel px-4 py-1.5 rounded-full flex items-center space-x-2 text-rose-400 border border-rose-500/30">
          <Camera className="w-4 h-4" />
          <span id="photo-mode-dialog-title" className="text-xs font-mono font-bold tracking-wider uppercase">
            {t('photo.title')}
          </span>
        </div>

        <button
          type="button"
          aria-label={t('common.close')}
          onClick={handleClose}
          className="p-2 rounded-full glass-panel hover:bg-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
          title={t('common.close')}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Bottom Floating Photo Controls */}
      <div className="flex justify-center pointer-events-auto">
        <div className="glass-panel-glow p-3.5 sm:p-4 rounded-2xl flex flex-wrap items-center justify-center gap-4 sm:gap-6 border border-white/15">
          <div className="flex items-center space-x-3">
            <Sliders className="w-4 h-4 text-sky-400" />
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-mono text-slate-400">
                <span>FOV</span>
                <span>{fov}°</span>
              </div>
              <input
                type="range"
                min={20}
                max={90}
                value={fov}
                onChange={(e) => handleFovChange(Number(e.target.value))}
                className="w-24 sm:w-28 accent-sky-400 cursor-pointer"
              />
            </div>
          </div>

          <div className="flex items-center space-x-3 sm:border-l border-white/10 sm:pl-4">
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-mono text-slate-400">
                <span>{language === 'vi' ? 'PHƠI SÁNG' : 'EXPOSURE'}</span>
                <span>{exposure.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={2.4}
                step={0.05}
                value={exposure}
                onChange={(e) => setExposure(Number(e.target.value))}
                className="w-24 sm:w-28 accent-amber-400 cursor-pointer"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleCapture}
            className="flex items-center space-x-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-white font-bold text-xs shadow-lg shadow-rose-500/25 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{t('photo.takePhoto')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
