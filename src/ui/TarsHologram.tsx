import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Bot, Sliders, X, Sparkles } from 'lucide-react';
import { AstroCopilot } from '@/engine/ai/AstroCopilot';
import { AudioManager } from '@/engine/audio/AudioManager';
import { useAppStore } from '@/stores/useAppStore';
import { useTranslation } from '@/i18n';

interface TarsHologramProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TarsHologram: React.FC<TarsHologramProps> = ({ isOpen, onClose }) => {
  const { t, language } = useTranslation();
  const isDevOverlayOpen = useAppStore((state) => state.isDevOverlayOpen);
  const [isListening, setIsListening] = useState(false);
  const [lastSpeech, setLastSpeech] = useState(
    language === 'vi' ? 'Trực ban TARS sẵn sàng. Chỉ huy có mệnh lệnh gì?' : 'Standing by for flight orders, Commander.'
  );
  const [honesty, setHonesty] = useState(95);
  const [humor, setHumor] = useState(75);

  const copilot = AstroCopilot.getInstance();
  const audio = AudioManager.getInstance();

  useEffect(() => {
    copilot.honesty = honesty;
    copilot.humor = humor;
  }, [honesty, humor, copilot]);

  useEffect(() => {
    setLastSpeech(
      language === 'vi' ? 'Trực ban TARS sẵn sàng. Chỉ huy có mệnh lệnh gì?' : 'Standing by for flight orders, Commander.'
    );
  }, [language]);

  if (!isOpen) return null;

  const handleMicToggle = () => {
    audio.playUIClick();
    const active = copilot.toggleListening();
    setIsListening(active);
    if (active) {
      setLastSpeech(
        language === 'vi'
          ? 'Đang lắng nghe khẩu lệnh... (VD: "Tới Sao Hỏa", "Bật rạp phim", "Hố đen")'
          : "Listening for voice commands... (e.g. 'Go to Mars', 'Cinema Mode', 'Play Music')"
      );
    }
  };

  return (
    <div
      onWheel={(e) => e.stopPropagation()}
      className={`fixed ${
        isDevOverlayOpen ? 'top-[16.75rem]' : 'top-[6.75rem] sm:top-16'
      } left-3 sm:left-4 z-[44] w-[min(20.5rem,calc(100vw-1.5rem))] max-h-[calc(100dvh-7.5rem)] overflow-y-auto overscroll-contain touch-pan-y vip-scrollbar glass-panel-glow rounded-3xl p-4 text-white shadow-2xl border border-sky-500/40 animate-in fade-in zoom-in-95 duration-200 select-none font-mono`}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center">
            <Bot className="w-4 h-4 text-sky-400" />
          </div>
          <div>
            <div className="text-xs font-bold tracking-widest text-sky-300">TARS 9000</div>
            <div className="text-[9px] text-slate-400">{t('tars.subtitle')}</div>
          </div>
        </div>

        <button
          type="button"
          aria-label={t('common.close')}
          onClick={onClose}
          className="p-1 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
          title={t('common.close')}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Holographic Waveform Animation */}
      <div className="my-3 py-3 px-3 rounded-2xl bg-black/50 border border-white/5 flex flex-col items-center justify-center">
        <div className="flex items-center space-x-1 h-6">
          {[0.6, 1.2, 0.4, 1.8, 0.9, 1.5, 0.7, 1.3, 0.5, 1.6, 0.8].map((val, idx) => (
            <div
              key={`bar-${idx}`}
              className={`w-1 rounded-full transition-all duration-150 ${
                isListening ? 'bg-emerald-400 animate-pulse' : 'bg-sky-400/60'
              }`}
              style={{
                height: isListening ? `${val * 12 + 4}px` : '4px'
              }}
            />
          ))}
        </div>
        <div className="text-[10px] text-slate-300 text-center mt-2 font-sans italic leading-relaxed">
          "{lastSpeech}"
        </div>
      </div>

      {/* Mic Button & Controls */}
      <div className="flex items-center justify-between gap-2 mt-2">
        <button
          onClick={handleMicToggle}
          className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-2xl font-semibold text-xs shadow-lg transition-all cursor-pointer ${
            isListening
              ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/30 animate-pulse'
              : 'bg-sky-500 hover:bg-sky-600 text-white shadow-sky-500/30'
          }`}
        >
          {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          <span>{isListening ? t('tars.listening') : t('tars.clickToSpeak')}</span>
        </button>
      </div>

      {/* TARS Personality Sliders (Honesty / Humor) */}
      <div className="mt-3 pt-2.5 border-t border-white/10 space-y-2 text-[10px] text-slate-300">
        <div className="flex items-center justify-between">
          <span className="flex items-center space-x-1">
            <Sliders className="w-3 h-3 text-sky-400" />
            <span>{t('tars.honestyParam')}:</span>
          </span>
          <span className="font-bold text-sky-300">{honesty}%</span>
        </div>
        <input
          type="range"
          min="50"
          max="100"
          value={honesty}
          onChange={(e) => setHonesty(Number(e.target.value))}
          className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-sky-400"
        />

        <div className="flex items-center justify-between pt-1">
          <span className="flex items-center space-x-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>{t('tars.humorParam')}:</span>
          </span>
          <span className="font-bold text-amber-300">{humor}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={humor}
          onChange={(e) => setHumor(Number(e.target.value))}
          className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-amber-400"
        />
      </div>
    </div>
  );
};
