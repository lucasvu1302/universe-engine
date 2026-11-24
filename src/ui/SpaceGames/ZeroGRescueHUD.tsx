import React, { useEffect, useState } from 'react';
import { Anchor, ArrowLeft, CheckCircle2, RotateCcw, Shield, Timer, Trophy, Wrench } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { ModeOrchestrator } from '@/engine/navigation/ModeOrchestrator';
import { AudioManager } from '@/engine/audio/AudioManager';
import { useTranslation } from '@/i18n';
import { MobileGameControls } from '@/ui/SpaceGames/MobileGameControls';
import {
  zeroGRescueChannel,
  type ZeroGRescueHudSnapshot,
} from '@/scenes/SpaceGames/engines/zeroGRescueEngine';

export const ZeroGRescueHUD: React.FC = () => {
  const { language } = useTranslation();
  const isVi = language === 'vi';
  const bestScore = useAppStore((s) => s.gameProgress.rescueBestScore);
  const [snap, setSnap] = useState<ZeroGRescueHudSnapshot>(() => zeroGRescueChannel.getSnapshot());

  useEffect(() => {
    const unsub = zeroGRescueChannel.subscribeSnapshot(setSnap);
    setSnap(zeroGRescueChannel.getSnapshot());
    return unsub;
  }, []);

  return (
    <div data-testid="zero-g-rescue-hud" className="fixed inset-0 z-30 pointer-events-none select-none">
      {/* Top Bar */}
      <div className="fixed top-2 inset-x-2 sm:top-4 sm:inset-x-4 flex flex-wrap items-start justify-between gap-1.5 sm:gap-2">
        {/* Left: Exit + Suit Armor + Stability Timer */}
        <div className="pointer-events-auto glass-panel-glow rounded-2xl px-2.5 sm:px-3 py-1.5 sm:py-2 flex flex-col gap-1 sm:gap-1.5 sm:min-w-[215px] border border-violet-400/35">
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
            <span className="text-[10px] font-mono uppercase tracking-wider text-violet-300 font-bold">
              ZERO-G RESCUE
            </span>
          </div>

          <div className="flex items-center justify-between text-xs font-mono">
            <span className="flex items-center gap-1 text-amber-300 font-bold">
              <Timer className="w-3.5 h-3.5" /> {snap.stabilitySec.toFixed(1)}s
            </span>
            <span className="flex items-center gap-1 text-cyan-300">
              <Shield className="w-3.5 h-3.5" /> {snap.suitArmor}%
            </span>
          </div>

          <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
            <div
              className={`h-full ${snap.suitArmor < 30 ? 'bg-rose-500' : 'bg-violet-400'}`}
              style={{ width: `${snap.suitArmor}%` }}
            />
          </div>
        </div>

        {/* Right: 4 Reactor Cores Status */}
        <div className="pointer-events-auto glass-panel rounded-2xl px-3 py-2 border border-white/15">
          <div className="text-[9px] font-mono uppercase tracking-wider text-slate-400 mb-1 flex items-center justify-between gap-3">
            <span>{isVi ? '4 LÕI PHẢN ỨNG TRẠM' : '4 STATION REACTOR CORES'}</span>
            {snap.repairingLabel && (
              <span className="text-emerald-300 font-bold flex items-center gap-1">
                <Wrench className="w-3 h-3" /> {snap.repairingLabel}
              </span>
            )}
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {snap.cores.map((c) => (
              <div
                key={c.label}
                className={`px-2 py-1 rounded-lg border text-center font-mono ${
                  c.repaired
                    ? 'border-emerald-400/50 bg-emerald-500/20 text-emerald-200'
                    : 'border-amber-400/35 bg-amber-500/10 text-amber-200'
                }`}
              >
                <div className="text-[9px] font-bold">{c.label}</div>
                <div className="text-[10px]">
                  {c.repaired ? <CheckCircle2 className="w-3 h-3 mx-auto text-emerald-300" /> : `${c.pct}%`}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Desktop Controls Hint */}
      <div className="hidden lg:flex fixed bottom-4 left-1/2 -translate-x-1/2 glass-panel px-4 py-1.5 rounded-full text-[11px] font-mono text-slate-300 gap-4 border border-white/10">
        <span><kbd className="text-white font-bold">WASD</kbd> {isVi ? 'Đẩy ngang' : 'Thrust'}</span>
        <span><kbd className="text-sky-300 font-bold">R/F · Space/Shift</kbd> {isVi ? 'Lên/Xuống' : 'Up/Down'}</span>
        <span><kbd className="text-cyan-300 font-bold">G</kbd> {isVi ? 'Móc Kéo' : 'Grapple'}</span>
        <span><kbd className="text-rose-300 font-bold">Click/J</kbd> {isVi ? 'Súng Xung' : 'Pulse Rifle'}</span>
        <span>
          <kbd className="text-emerald-300 font-bold">{isVi ? 'Giữ E' : 'Hold E'}</kbd>{' '}
          {isVi ? 'Sửa Lõi' : 'Repair'}
        </span>
      </div>

      {/* Victory / Failed Modal */}
      {(snap.phase === 'victory' || snap.phase === 'failed') && (
        <div
          data-testid="rescue-end-modal"
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 pointer-events-auto"
        >
          <div className="glass-panel-glow rounded-3xl p-6 max-w-sm w-full text-center border border-violet-400/45 space-y-4">
            {snap.phase === 'victory' ? (
              <Trophy className="w-11 h-11 text-amber-400 mx-auto" />
            ) : (
              <Anchor className="w-11 h-11 text-rose-400 mx-auto" />
            )}
            <h2 className="text-xl font-bold text-white">
              {snap.phase === 'victory'
                ? isVi ? 'GIẢI CỨU TRẠM THÀNH CÔNG!' : 'ORBITAL STATION SAVED!'
                : snap.failReason === 'armor'
                ? isVi ? 'GIÁP BỘ ĐỒ HƯ HẠI' : 'SUIT ARMOR BREACHED'
                : isVi ? 'TRẠM MẤT ỔN ĐỊNH QUỸ ĐẠO' : 'ORBITAL DECAY FAILURE'}
            </h2>
            {snap.rank && (
              <div className="text-4xl font-black font-mono text-emerald-300">
                {isVi ? `HẠNG ${snap.rank}` : `RANK ${snap.rank}`}
              </div>
            )}
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
                data-testid="rescue-retry-btn"
                onClick={() => zeroGRescueChannel.dispatchCommand({ type: 'restart' })}
                className="flex-1 py-2.5 rounded-xl bg-violet-500 hover:bg-violet-400 text-white font-bold text-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                {isVi ? 'Thử Lại' : 'Retry'}
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
          zeroGRescueChannel.touchMove.x = x;
          zeroGRescueChannel.touchMove.y = y;
        }}
        actions={[
          {
            id: 'up',
            label: isVi ? 'LÊN' : 'UP',
            color: 'cyan',
            onPressChange: (p) => {
              zeroGRescueChannel.touchActions.up = p;
            },
          },
          {
            id: 'down',
            label: isVi ? 'XUỐNG' : 'DOWN',
            color: 'cyan',
            onPressChange: (p) => {
              zeroGRescueChannel.touchActions.down = p;
            },
          },
          {
            id: 'fire',
            label: isVi ? 'BẮN' : 'FIRE',
            color: 'rose',
            onPressChange: (p) => {
              zeroGRescueChannel.touchActions.fire = p;
            },
          },
          {
            id: 'grapple',
            label: isVi ? 'MÓC' : 'GRPL',
            color: 'violet',
            highlight: snap.grappleActive,
            onPressChange: (p) => {
              zeroGRescueChannel.touchActions.grapple = p;
            },
          },
          {
            id: 'repair',
            label: isVi ? 'SỬA' : 'FIX',
            color: 'emerald',
            highlight: Boolean(snap.repairingLabel),
            onPressChange: (p) => {
              zeroGRescueChannel.touchActions.repair = p;
            },
          },
        ]}
      />
    </div>
  );
};
