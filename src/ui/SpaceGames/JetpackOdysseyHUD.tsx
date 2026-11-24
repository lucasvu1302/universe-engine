import React, { useEffect, useState } from 'react';
import { ArrowLeft, Flame, RotateCcw, Sparkles, Timer, Trophy } from 'lucide-react';
import { useAppStore, type OdysseyWorldId } from '@/stores/useAppStore';
import { ModeOrchestrator } from '@/engine/navigation/ModeOrchestrator';
import { AudioManager } from '@/engine/audio/AudioManager';
import { useTranslation } from '@/i18n';
import { MobileGameControls } from '@/ui/SpaceGames/MobileGameControls';
import {
  jetpackOdysseyChannel,
  ODYSSEY_WORLDS,
  type JetpackOdysseyHudSnapshot,
} from '@/scenes/SpaceGames/engines/jetpackOdysseyEngine';

const WORLD_IDS: OdysseyWorldId[] = ['enceladus', 'mars', 'venus'];

export const JetpackOdysseyHUD: React.FC = () => {
  const { language } = useTranslation();
  const isVi = language === 'vi';
  const [snap, setSnap] = useState<JetpackOdysseyHudSnapshot>(() => jetpackOdysseyChannel.getSnapshot());
  const bestTime = useAppStore((s) => s.gameProgress.odysseyBestTime[snap.world]);
  const bestRank = useAppStore((s) => s.gameProgress.odysseyBestRank[snap.world]);

  useEffect(() => {
    const unsub = jetpackOdysseyChannel.subscribeSnapshot(setSnap);
    setSnap(jetpackOdysseyChannel.getSnapshot());
    return unsub;
  }, []);

  return (
    <div data-testid="jetpack-odyssey-hud" className="fixed inset-0 z-30 pointer-events-none select-none">
      {/* Top Bar */}
      <div className="fixed top-2 inset-x-2 sm:top-4 sm:inset-x-4 flex flex-wrap items-start justify-between gap-1.5 sm:gap-2">
        {/* Left: Exit + Fuel + Cores */}
        <div className="pointer-events-auto glass-panel-glow rounded-2xl px-2.5 sm:px-3 py-1.5 sm:py-2 flex flex-col gap-1 sm:gap-1.5 sm:min-w-[215px] border border-amber-400/35">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              data-testid="game-exit-btn"
              onClick={() => {
                AudioManager.getInstance().playUIClick();
                ModeOrchestrator.getInstance().exitSpaceGame();
              }}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-semibold text-slate-200 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{isVi ? 'Thoát' : 'Exit'}</span>
            </button>
            <span className="text-[10px] font-mono uppercase tracking-wider text-amber-300 font-bold">
              JETPACK ODYSSEY
            </span>
          </div>

          <div className="space-y-0.5">
            <div className="flex justify-between text-[10px] font-mono">
              <span className="text-cyan-300 flex items-center gap-1">
                <Flame className="w-3 h-3 text-cyan-400" /> JETPACK FUEL
              </span>
              <span className="text-white font-bold">{snap.fuel}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 to-amber-400 transition-all duration-75"
                style={{ width: `${snap.fuel}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 text-[11px] font-mono">
            <span className="flex items-center gap-1 text-amber-300">
              <Sparkles className="w-3.5 h-3.5" />
              {isVi ? 'Lõi Lượng Tử:' : 'Cores:'} <strong>{snap.coresCollected}/{snap.totalCores}</strong>
            </span>
            <span className={snap.portalUnlocked ? 'text-emerald-300 font-bold' : 'text-slate-400'}>
              {snap.portalUnlocked ? (isVi ? 'CỔNG MỞ!' : 'PORTAL OPEN!') : isVi ? 'Cổng khóa' : 'Locked'}
            </span>
          </div>
        </div>

        {/* Right: Speedrun Timer + Gravity World Selector */}
        <div className="pointer-events-auto glass-panel rounded-2xl px-3 py-2 flex flex-col gap-1.5 border border-white/15">
          <div className="flex items-center gap-3 font-mono">
            <div className="flex items-center gap-1.5">
              <Timer className="w-4 h-4 text-sky-400" />
              <span className="text-base font-bold text-white">{snap.elapsedSec.toFixed(1)}s</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
              {snap.gravityG.toFixed(2)}g
            </span>
            {bestTime !== null && (
              <span className="text-[10px] text-emerald-300">
                {isVi ? 'Kỷ lục:' : 'Best:'} {bestTime.toFixed(1)}s ({bestRank})
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {WORLD_IDS.map((wid) => (
              <button
                key={wid}
                type="button"
                data-testid={`odyssey-world-${wid}`}
                onClick={(e) => {
                  e.currentTarget.blur();
                  jetpackOdysseyChannel.dispatchCommand({ type: 'switch_world', world: wid });
                }}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold cursor-pointer whitespace-nowrap shrink-0 ${
                  snap.world === wid ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-white/5 text-slate-300 hover:bg-white/15'
                }`}
              >
                {isVi ? ODYSSEY_WORLDS[wid].nameVi : ODYSSEY_WORLDS[wid].nameEn}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Desktop Controls Hint */}
      <div className="hidden lg:flex fixed bottom-4 left-1/2 -translate-x-1/2 glass-panel px-4 py-1.5 rounded-full text-[11px] font-mono text-slate-300 gap-4 border border-white/10">
        <span><kbd className="text-white font-bold">WASD</kbd> {isVi ? 'Di chuyển' : 'Move'}</span>
        <span><kbd className="text-amber-300 font-bold">Space</kbd> {isVi ? 'Nhảy / Giữ bay Jetpack' : 'Jump / Hold Jetpack'}</span>
        <span><kbd className="text-slate-200 font-bold">ESC</kbd> {isVi ? 'Thoát' : 'Exit'}</span>
      </div>

      {/* Victory Rank Modal */}
      {snap.phase === 'victory' && (
        <div
          data-testid="odyssey-victory-modal"
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 pointer-events-auto"
        >
          <div className="glass-panel-glow rounded-3xl p-6 max-w-sm w-full text-center border border-emerald-400/45 space-y-4">
            <Trophy className="w-11 h-11 text-amber-400 mx-auto" />
            <h2 className="text-xl font-bold text-white">
              {isVi ? 'VƯỢT CỔNG LƯỢNG TỬ!' : 'QUANTUM PORTAL CLEARED!'}
            </h2>
            <div className="text-4xl font-black font-mono text-emerald-300">
              {isVi ? `HẠNG ${snap.rank}` : `RANK ${snap.rank}`}
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2.5 rounded-xl bg-white/5">
                <div className="text-slate-400">{isVi ? 'Thời gian' : 'Time'}</div>
                <div className="text-lg font-bold text-white">{snap.elapsedSec.toFixed(2)}s</div>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5">
                <div className="text-slate-400">{isVi ? 'Rơi vực' : 'Falls'}</div>
                <div className="text-lg font-bold text-amber-300">{snap.falls}</div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                data-testid="odyssey-retry-btn"
                onClick={() => jetpackOdysseyChannel.dispatchCommand({ type: 'restart' })}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                {isVi ? 'Chạy Lại' : 'Run Again'}
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
          jetpackOdysseyChannel.touchMove.x = x;
          jetpackOdysseyChannel.touchMove.y = y;
        }}
        actions={[
          {
            id: 'jump',
            label: isVi ? 'NHẢY' : 'JUMP',
            color: 'amber',
            onPressChange: (p) => {
              jetpackOdysseyChannel.touchActions.jump = p;
            },
          },
          {
            id: 'jetpack',
            label: 'JETPACK',
            sublabel: `${snap.fuel}%`,
            color: 'cyan',
            highlight: snap.fuel > 20,
            onPressChange: (p) => {
              jetpackOdysseyChannel.touchActions.jetpack = p;
            },
          },
        ]}
      />
    </div>
  );
};
