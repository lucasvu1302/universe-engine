import React, { useEffect, useState } from 'react';
import { Heart, Shield, Sparkles, Trophy, RotateCcw, ArrowLeft, Flame } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { ModeOrchestrator } from '@/engine/navigation/ModeOrchestrator';
import { AudioManager } from '@/engine/audio/AudioManager';
import { useTranslation } from '@/i18n';
import { MobileGameControls } from '@/ui/SpaceGames/MobileGameControls';
import {
  astroSurvivorChannel,
  SURVIVOR_SKILLS,
  type AstroSurvivorHudSnapshot,
  type SurvivorArenaId,
} from '@/scenes/SpaceGames/engines/astroSurvivorEngine';

const ARENAS: Array<{ id: SurvivorArenaId; vi: string; en: string }> = [
  { id: 'mars', vi: 'Sao Hỏa', en: 'Mars' },
  { id: 'enceladus', vi: 'Enceladus', en: 'Enceladus' },
  { id: 'io', vi: 'Io', en: 'Io' },
];

export const AstroSurvivorHUD: React.FC = () => {
  const { language } = useTranslation();
  const isVi = language === 'vi';
  const bestScore = useAppStore((s) => s.gameProgress.survivorBestScore);
  const [snap, setSnap] = useState<AstroSurvivorHudSnapshot>(() => astroSurvivorChannel.getSnapshot());

  useEffect(() => {
    const unsub = astroSurvivorChannel.subscribeSnapshot(setSnap);
    setSnap(astroSurvivorChannel.getSnapshot());
    return unsub;
  }, []);

  const skillMetaMap = Object.fromEntries(SURVIVOR_SKILLS.map((s) => [s.id, s]));

  return (
    <div data-testid="astro-survivor-hud" className="fixed inset-0 z-30 pointer-events-none select-none">
      {/* Top Bar + In-Flow Boss Health Bar (zero overlap on 390px mobile, U3/M9) */}
      <div className="fixed top-2 inset-x-2 sm:top-4 sm:inset-x-4 flex flex-col gap-1.5">
        <div className="flex items-start justify-between gap-1.5 sm:gap-2">
          {/* Left: Exit + Health / XP */}
          <div className="pointer-events-auto glass-panel-glow rounded-2xl px-2.5 sm:px-3 py-1.5 sm:py-2 flex flex-col gap-1 sm:gap-1.5 w-[49%] sm:w-auto sm:min-w-[215px] max-w-[270px] border border-sky-400/35">
            <div className="flex items-center justify-between gap-1.5">
              <button
                type="button"
                data-testid="game-exit-btn"
                onClick={() => {
                  AudioManager.getInstance().playUIClick();
                  ModeOrchestrator.getInstance().exitSpaceGame();
                }}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-semibold text-slate-200 cursor-pointer shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{isVi ? 'Thoát' : 'Exit'}</span>
              </button>
              <span className="text-[9px] sm:text-[10px] font-mono uppercase tracking-wider text-sky-300 font-bold truncate">
                ASTRO SURVIVOR
              </span>
            </div>

            {/* HP Bar */}
            <div className="space-y-0.5">
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="flex items-center gap-1 text-rose-300">
                  <Heart className="w-3 h-3 fill-rose-400 text-rose-400" /> HP
                </span>
                <span className="text-white font-bold">
                  {snap.hp}/{snap.maxHp}
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-rose-500 to-amber-400 transition-all duration-100"
                  style={{ width: `${Math.max(0, Math.min(100, (snap.hp / snap.maxHp) * 100))}%` }}
                />
              </div>
            </div>

            {/* XP & Dash Bar */}
            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <div className="flex justify-between text-[9px] font-mono text-cyan-300">
                  <span>LV.{snap.level}</span>
                  <span>{Math.round((snap.xp / Math.max(1, snap.xpToNext)) * 100)}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-cyan-400 transition-all duration-100"
                    style={{ width: `${Math.min(100, (snap.xp / Math.max(1, snap.xpToNext)) * 100)}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[9px] font-mono text-amber-300">
                  <span>DASH</span>
                  <span>{Math.round(snap.dashReadyRatio * 100)}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-amber-400 transition-all duration-100"
                    style={{ width: `${Math.round(snap.dashReadyRatio * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right: Wave / Score / Arena Selector */}
          <div className="pointer-events-auto glass-panel rounded-2xl px-2.5 sm:px-3 py-1.5 sm:py-2 flex flex-col gap-1 sm:gap-1.5 w-[49%] sm:w-auto border border-white/15">
            <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-3 text-xs font-mono">
              <div>
                <span className="text-[9px] text-slate-400 block">{isVi ? 'ĐỢT' : 'WAVE'}</span>
                <span className="text-sm font-bold text-amber-300">#{snap.wave}</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 block">{isVi ? 'ĐIỂM' : 'SCORE'}</span>
                <span className="text-sm font-bold text-white">{snap.score}</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 block">{isVi ? 'KỶ LỤC' : 'BEST'}</span>
                <span className="text-sm font-bold text-cyan-300">{Math.max(bestScore, snap.score)}</span>
              </div>
            </div>
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              {ARENAS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  data-testid={`survivor-arena-${a.id}`}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    astroSurvivorChannel.dispatchCommand({ type: 'switch_arena', arena: a.id });
                  }}
                  className={`px-1.5 sm:px-2 py-0.5 rounded-lg text-[10px] font-semibold cursor-pointer whitespace-nowrap shrink-0 transition-all ${
                    snap.arena === a.id
                      ? 'bg-sky-500 text-white'
                      : 'bg-white/5 text-slate-300 hover:bg-white/15'
                  }`}
                >
                  {isVi ? a.vi : a.en}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* In-Flow Boss Health Bar */}
        {snap.bossHpRatio !== null && (
          <div className="self-center w-[min(360px,88vw)] glass-panel-glow border border-rose-500/50 rounded-xl px-3 py-1.5">
            <div className="flex items-center justify-between text-[10px] font-mono text-rose-300 font-bold mb-1">
              <span className="flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-rose-400" />
                {isVi ? 'BOSS HÀNH TINH XUẤT HIỆN' : 'PLANETARY BOSS ACTIVE'}
              </span>
              <span>{Math.round(snap.bossHpRatio * 100)}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-900 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-rose-600 via-orange-500 to-amber-400"
                style={{ width: `${Math.round(snap.bossHpRatio * 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Desktop Controls Hint */}
      <div className="hidden lg:flex fixed bottom-4 left-1/2 -translate-x-1/2 glass-panel px-4 py-1.5 rounded-full text-[11px] font-mono text-slate-300 gap-4 border border-white/10">
        <span><kbd className="text-white font-bold">WASD</kbd> {isVi ? 'Di chuyển' : 'Move'}</span>
        <span><kbd className="text-amber-300 font-bold">Space/Shift</kbd> Jetpack Dash</span>
        <span><kbd className="text-cyan-300 font-bold">Click / J</kbd> {isVi ? 'Bắn nhanh' : 'Rapid Burst'}</span>
        <span><kbd className="text-slate-200 font-bold">ESC</kbd> {isVi ? 'Thoát' : 'Exit'}</span>
      </div>

      {/* Level-Up 3-Card Upgrade Selector */}
      {snap.phase === 'level_up' && (
        <div
          data-testid="survivor-levelup-modal"
          className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4 pointer-events-auto"
        >
          <div className="glass-panel-glow rounded-3xl p-5 max-w-2xl w-full max-h-[88dvh] overflow-y-auto overscroll-contain touch-pan-y vip-scrollbar border border-cyan-400/40 space-y-4">
            <div className="text-center">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-mono font-bold mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                {isVi ? `LÊN CẤP ${snap.level} — CHỌN 1 KỸ NĂNG` : `LEVEL ${snap.level} — PICK AN UPGRADE`}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {snap.upgradeChoices.map((skillId) => {
                const meta = skillMetaMap[skillId];
                const curLv = snap.skills[skillId] ?? 0;
                const isMaxed = curLv >= 5;
                return (
                  <button
                    key={skillId}
                    type="button"
                    data-testid={`survivor-upgrade-${skillId}`}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      astroSurvivorChannel.dispatchCommand({ type: 'select_upgrade', skill: skillId });
                    }}
                    className="text-left p-4 rounded-2xl bg-slate-900/90 hover:bg-sky-500/20 border border-white/15 hover:border-cyan-400/60 transition-all cursor-pointer flex flex-col justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <Shield className="w-4 h-4" style={{ color: meta.accent }} />
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-cyan-200">
                          {isMaxed ? 'MAX · +15 HP' : `LV.${curLv} → ${curLv + 1}`}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-white">{isVi ? meta.nameVi : meta.nameEn}</h3>
                      <p className="text-xs text-slate-300 mt-1">{isVi ? meta.descVi : meta.descEn}</p>
                    </div>
                    <span className="text-[11px] font-semibold text-cyan-300">
                      {isVi ? 'Chọn nâng cấp →' : 'Select upgrade →'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Game Over Modal */}
      {snap.phase === 'game_over' && (
        <div
          data-testid="survivor-gameover-modal"
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 pointer-events-auto"
        >
          <div className="glass-panel-glow rounded-3xl p-6 max-w-sm w-full text-center border border-rose-500/40 space-y-4">
            <Trophy className="w-10 h-10 text-amber-400 mx-auto" />
            <h2 className="text-xl font-bold text-white">
              {isVi ? 'CHIẾN DỊCH KẾT THÚC' : 'MISSION ENDED'}
            </h2>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2.5 rounded-xl bg-white/5">
                <div className="text-slate-400">{isVi ? 'Điểm số' : 'Score'}</div>
                <div className="text-lg font-bold text-white">{snap.score}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5">
                <div className="text-slate-400">{isVi ? 'Kỷ lục' : 'Best'}</div>
                <div className="text-lg font-bold text-cyan-300">{Math.max(bestScore, snap.score)}</div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                data-testid="survivor-retry-btn"
                onClick={() => astroSurvivorChannel.dispatchCommand({ type: 'restart' })}
                className="flex-1 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                {isVi ? 'Chơi Lại' : 'Play Again'}
              </button>
              <button
                type="button"
                onClick={() => ModeOrchestrator.getInstance().exitSpaceGame()}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 font-semibold text-sm cursor-pointer"
              >
                {isVi ? 'Thoát' : 'Exit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Virtual Gamepad */}
      <MobileGameControls
        disabled={snap.phase !== 'playing'}
        onMove={(x, y) => {
          astroSurvivorChannel.touchMove.x = x;
          astroSurvivorChannel.touchMove.y = y;
        }}
        actions={[
          {
            id: 'dash',
            label: 'DASH',
            sublabel: `${Math.round(snap.dashReadyRatio * 100)}%`,
            color: 'amber',
            highlight: snap.dashReadyRatio >= 1,
            onPressChange: (p) => {
              astroSurvivorChannel.touchActions.dash = p;
            },
          },
          {
            id: 'burst',
            label: isVi ? 'BẮN' : 'FIRE',
            color: 'cyan',
            onPressChange: (p) => {
              astroSurvivorChannel.touchActions.burst = p;
            },
          },
        ]}
      />
    </div>
  );
};
