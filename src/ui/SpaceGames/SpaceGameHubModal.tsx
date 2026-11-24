import React, { useEffect, useRef } from 'react';
import {
  Anchor,
  Coins,
  Cpu,
  Flame,
  Gamepad2,
  Pickaxe,
  Play,
  Rocket,
  Sparkles,
  Trophy,
  X,
} from 'lucide-react';
import { useAppStore, type ActiveSpaceGame } from '@/stores/useAppStore';
import { ModeOrchestrator } from '@/engine/navigation/ModeOrchestrator';
import { AudioManager } from '@/engine/audio/AudioManager';
import { useTranslation } from '@/i18n';

interface GameCardSpec {
  id: Exclude<ActiveSpaceGame, 'none'>;
  titleKey: string;
  subKey: string;
  genreVi: string;
  genreEn: string;
  accentBorder: string;
  badgeBg: string;
  iconBg: string;
  icon: React.ReactNode;
}

const GAME_CARDS: GameCardSpec[] = [
  {
    id: 'astro_survivor',
    titleKey: 'games.survivorTitle',
    subKey: 'games.survivorSub',
    genreVi: 'Hành Động · Roguelike',
    genreEn: 'Action · Roguelike',
    accentBorder: 'border-sky-400/35 hover:border-sky-400/75',
    badgeBg: 'bg-sky-500/20 text-sky-300',
    iconBg: 'bg-sky-500/20 text-sky-300',
    icon: <Flame className="w-5 h-5" />,
  },
  {
    id: 'jetpack_odyssey',
    titleKey: 'games.odysseyTitle',
    subKey: 'games.odysseySub',
    genreVi: 'Parkour · Trọng Lực Thực',
    genreEn: 'Parkour · Real Gravity',
    accentBorder: 'border-amber-400/35 hover:border-amber-400/75',
    badgeBg: 'bg-amber-500/20 text-amber-300',
    iconBg: 'bg-amber-500/20 text-amber-300',
    icon: <Rocket className="w-5 h-5" />,
  },
  {
    id: 'mech_arena',
    titleKey: 'games.mechTitle',
    subKey: 'games.mechSub',
    genreVi: 'Chiến Giáp 8m · Boss Titan',
    genreEn: '8m Mech · Boss Titan',
    accentBorder: 'border-blue-400/35 hover:border-blue-400/75',
    badgeBg: 'bg-blue-500/20 text-blue-300',
    iconBg: 'bg-blue-500/20 text-blue-300',
    icon: <Cpu className="w-5 h-5" />,
  },
  {
    id: 'exo_miner',
    titleKey: 'games.minerTitle',
    subKey: 'games.minerSub',
    genreVi: 'Khai Khoáng · Căn Cứ Sinh Tồn',
    genreEn: 'Mining · Base Survival',
    accentBorder: 'border-emerald-400/35 hover:border-emerald-400/75',
    badgeBg: 'bg-emerald-500/20 text-emerald-300',
    iconBg: 'bg-emerald-500/20 text-emerald-300',
    icon: <Pickaxe className="w-5 h-5" />,
  },
  {
    id: 'zero_g_rescue',
    titleKey: 'games.rescueTitle',
    subKey: 'games.rescueSub',
    genreVi: 'Không Trọng Lực · Giải Cứu',
    genreEn: 'Zero-G · Station Rescue',
    accentBorder: 'border-violet-400/35 hover:border-violet-400/75',
    badgeBg: 'bg-violet-500/20 text-violet-300',
    iconBg: 'bg-violet-500/20 text-violet-300',
    icon: <Anchor className="w-5 h-5" />,
  },
];

export const SpaceGameHubModal: React.FC = () => {
  const { t, language } = useTranslation();
  const isVi = language === 'vi';

  const isOpen = useAppStore((s) => s.gameHubOpen);
  const setGameHubOpen = useAppStore((s) => s.setGameHubOpen);
  const progress = useAppStore((s) => s.gameProgress);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    closeBtnRef.current?.focus();
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleTabTrap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusables = dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    dialog.addEventListener('keydown', handleTabTrap);
    return () => dialog.removeEventListener('keydown', handleTabTrap);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLaunch = (id: Exclude<ActiveSpaceGame, 'none'>) => {
    AudioManager.getInstance().playUIClick();
    ModeOrchestrator.getInstance().enterSpaceGame(id);
  };

  const renderStatPill = (id: Exclude<ActiveSpaceGame, 'none'>) => {
    if (id === 'astro_survivor') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-mono text-sky-300">
          <Trophy className="w-3 h-3" />
          {isVi ? 'Kỷ lục:' : 'Best:'} {progress.survivorBestScore} · W{progress.survivorBestWave}
        </span>
      );
    }
    if (id === 'jetpack_odyssey') {
      const worldOrder = ['enceladus', 'mars', 'venus'] as const;
      let bestTime: number | null = null;
      let bestRank: string | null = null;
      for (const w of worldOrder) {
        const wt = progress.odysseyBestTime[w];
        if (wt !== null && (bestTime === null || wt < bestTime)) {
          bestTime = wt;
          bestRank = progress.odysseyBestRank[w];
        }
      }
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-mono text-amber-300">
          <Sparkles className="w-3 h-3" />
          {bestTime !== null
            ? `${bestTime.toFixed(1)}s (${bestRank ?? '-'})`
            : isVi ? '3 Thế Giới · 0.11g–0.90g' : '3 Worlds · 0.11g–0.90g'}
        </span>
      );
    }
    if (id === 'mech_arena') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-mono text-amber-300">
          <Coins className="w-3 h-3" />
          {progress.mechCredits} CR · LV.{progress.mechUpgrades.armor}/{progress.mechUpgrades.weapon}/{progress.mechUpgrades.booster}
        </span>
      );
    }
    if (id === 'exo_miner') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-300">
          <Coins className="w-3 h-3" />
          {progress.minerCredits} CR · {progress.minerUpgrades.turrets}/3 {isVi ? 'Tháp Pháo' : 'Turrets'}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-mono text-violet-300">
        <Trophy className="w-3 h-3" />
        {progress.rescueBestRank
          ? `${isVi ? 'Hạng' : 'Rank'} ${progress.rescueBestRank} · ${progress.rescueBestScore}`
          : isVi ? '4 Lõi Phản Ứng · 120s' : '4 Reactor Cores · 120s'}
      </span>
    );
  };

  return (
    <div
      data-testid="space-game-hub-backdrop"
      onClick={() => setGameHubOpen(false)}
      className="fixed inset-0 z-[55] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2.5 sm:p-5 pointer-events-auto"
    >
      <div
        ref={dialogRef}
        data-testid="space-game-hub-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="space-game-hub-title"
        onClick={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
        className="glass-panel-glow vip-card-sheen w-full max-w-4xl max-h-[88dvh] overflow-y-auto overscroll-contain touch-pan-y vip-scrollbar rounded-3xl border border-cyan-400/40 p-4 sm:p-6 space-y-4 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-cyan-500/25 to-violet-500/25 border border-cyan-400/40 text-cyan-300 shrink-0">
              <Gamepad2 className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h2 id="space-game-hub-title" className="text-sm sm:text-xl font-bold text-white tracking-wide leading-snug">
                {t('games.hubTitle')}
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-300">
                {t('games.hubSubtitle')}
              </p>
            </div>
          </div>

          <button
            ref={closeBtnRef}
            type="button"
            data-testid="space-game-hub-close"
            aria-label={isVi ? 'Đóng Trung Tâm Trò Chơi' : 'Close Space Game Hub'}
            onClick={() => {
              AudioManager.getInstance().playUIClick();
              setGameHubOpen(false);
            }}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 5 Character-Driven 3D Game Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {GAME_CARDS.map((card) => (
            <div
              key={card.id}
              className={`rounded-2xl bg-slate-900/75 border p-4 flex flex-col justify-between gap-3 transition-all ${card.accentBorder}`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className={`p-2 rounded-xl ${card.iconBg}`}>{card.icon}</div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold ${card.badgeBg}`}>
                    {isVi ? card.genreVi : card.genreEn}
                  </span>
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white">{t(card.titleKey)}</h3>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">{t(card.subKey)}</p>
                </div>
              </div>

              <div className="space-y-2.5 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between">
                  {renderStatPill(card.id)}
                </div>
                <button
                  type="button"
                  data-testid={`launch-game-${card.id}`}
                  onClick={() => handleLaunch(card.id)}
                  className="w-full py-2 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-slate-950" />
                  <span>{t('games.playNow')}</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Info Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10 text-[11px] text-slate-400 font-mono">
          <span>{isVi ? '100% Ngoại tuyến · Lưu kỷ lục tự động' : '100% Offline · Auto Local Save'}</span>
          <span>{isVi ? 'Desktop: WASD + Chuột · Mobile: Tay Cầm Ảo 2 Ngón' : 'Desktop: WASD + Mouse · Mobile: Dual-Thumb Pad'}</span>
        </div>
      </div>
    </div>
  );
};
