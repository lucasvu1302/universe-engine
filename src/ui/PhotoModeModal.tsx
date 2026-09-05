import React, { useState } from 'react';
import { Camera, X, Download, Sliders } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { CameraManager } from '@/engine/camera/CameraManager';
import { AudioManager } from '@/engine/audio/AudioManager';
import { useTranslation } from '@/i18n';

export const PhotoModeModal: React.FC = () => {
  const { t, language } = useTranslation();
  const isPhotoMode = useAppStore((state) => state.photoMode);
  const setPhotoMode = useAppStore((state) => state.setPhotoMode);

  const [fov, setFov] = useState(50);
  const [exposure, setExposure] = useState(1.0);

  if (!isPhotoMode) return null;

  const handleFovChange = (val: number) => {
    setFov(val);
    const cam = CameraManager.getInstance().camera;
    if (cam) {
      cam.fov = val;
      cam.updateProjectionMatrix();
    }
  };

  const handleCapture = () => {
    AudioManager.getInstance().playUIClick();
    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    try {
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `universe-engine-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.warn('Canvas export failed:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex flex-col justify-between p-6">
      {/* Top Header */}
      <div className="flex justify-between items-center pointer-events-auto">
        <div className="glass-panel px-4 py-1.5 rounded-full flex items-center space-x-2 text-rose-400 border border-rose-500/30">
          <Camera className="w-4 h-4" />
          <span className="text-xs font-mono font-bold tracking-wider uppercase">
            {t('photo.title')}
          </span>
        </div>

        <button
          onClick={() => {
            AudioManager.getInstance().playUIClick();
            setPhotoMode(false);
          }}
          className="p-2 rounded-full glass-panel hover:bg-white/10 text-slate-300 hover:text-white transition-all"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Bottom Floating Photo Controls */}
      <div className="flex justify-center pointer-events-auto">
        <div className="glass-panel-glow p-4 rounded-2xl flex items-center space-x-6 border border-white/15">
          {/* FOV Slider */}
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
                className="w-28 accent-sky-400 cursor-pointer"
              />
            </div>
          </div>

          {/* Exposure Slider */}
          <div className="flex items-center space-x-3 border-l border-white/10 pl-4">
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-mono text-slate-400">
                <span>{language === 'vi' ? 'PHƠI SÁNG' : 'EXPOSURE'}</span>
                <span>{exposure.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={2.5}
                step={0.1}
                value={exposure}
                onChange={(e) => setExposure(Number(e.target.value))}
                className="w-28 accent-amber-400 cursor-pointer"
              />
            </div>
          </div>

          {/* Snapshot Action Button */}
          <button
            onClick={handleCapture}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-white font-bold text-xs shadow-lg shadow-rose-500/25 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>{t('photo.takePhoto')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
