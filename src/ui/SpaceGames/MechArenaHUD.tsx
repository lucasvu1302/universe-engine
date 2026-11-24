import React, { useEffect, useState } from 'react';
import { ArrowLeft, Coins, Crosshair, Flame, RotateCcw, Shield, Trophy, Wrench, Zap } from 'lucide-react';
import {
  getMechUpgradeCost,
  useAppStore,
  type MechPaintId,
  type MechUpgradeKey,
} from '@/stores/useAppStore';
import { ModeOrchestrator } from '@/engine/navigation/ModeOrchestrator';
import { AudioManager } from '@/engine/audio/AudioManager';
import { useTranslation } from '@/i18n';
import { MobileGameControls } from '@/ui/SpaceGames/MobileGameControls';
import {
  mechArenaChannel,
  type MechArenaHudSnapshot,
} from '@/scenes/SpaceGames/engines/mechArenaEngine';

const PAINTS: Array<{ id: MechPaintId; hex: string; vi: string; en: string }> = [
  { id: 'cobalt', hex: '#2563eb', vi: 'Cobalt', en: 'Cobalt' },
  { id: 'crimson', hex: '#dc2626', vi: 'Ares Đỏ', en: 'Crimson' },
  { id: 'gold', hex: '#d97706', vi: 'Hoàng Kim', en: 'Solar Gold' },
  { id: 'obsidian', hex: '#475569', vi: 'Hắc Diện', en: 'Obsidian' },
];

export const MechArenaHUD: React.FC = () => {
  const { language } = useTranslation();
  const isVi = language === 'vi';
  const progress = useAppStore((s) => s.gameProgress);
  const purchaseMechUpgrade = useAppStore((s) => s.purchaseMechUpgrade);
  const setMechPaint = useAppStore((s) => s.setMechPaint);

  const [snap, setSnap] = useState<MechArenaHudSnapshot>(() => mechArenaChannel.getSnapshot());
  const [hangarOpen, setHangarOpen] = useState(false);

  useEffect(() => {
    const unsub = mechArenaChannel.subscribeSnapshot(setSnap);
    setSnap(mechArenaChannel.getSnapshot());
    return unsub;
  }, []);

  // Pause live combat while Hangar Upgrade Drawer is open (G3/U1)
  useEffect(() => {
    mechArenaChannel.dispatchCommand({ type: 'set_paused', paused: hangarOpen });
  }, [hangarOpen]);

  // Capture-phase Escape closes Hangar Drawer first instead of exiting the whole Space Game (G3/U1)
  useEffect(() => {
    if (!hangarOpen) return;
    const onEscape = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const st = useAppStore.getState();
      if (st.isCommandPaletteOpen || st.isSettingsOpen || st.gameHubOpen) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      setHangarOpen(false);
    };
    window.addEventListener('keydown', onEscape, true);
    return () => window.removeEventListener('keydown', onEscape, true);
  }, [hangarOpen]);

  const handleBuy = (key: MechUpgradeKey) => {
    if (purchaseMechUpgrade(key)) {
      AudioManager.getInstance().playLevelUp();
      mechArenaChannel.dispatchCommand({ type: 'refresh_upgrades' });
    }
  };

  return (
    <div data-testid="mech-arena-hud" className="fixed inset-0 z-30 pointer-events-none select-none">
      {/* Top Bar + In-Flow Boss Titan HP Bar (zero overlap on 390px mobile, U3/M9) */}
      <div className="fixed top-2 inset-x-2 sm:top-4 sm:inset-x-4 flex flex-col gap-1.5">
        <div className="flex flex-wrap items-start justify-between gap-1.5 sm:gap-2">
          {/* Left: Exit + Armor + Overdrive */}
          <div className="pointer-events-auto glass-panel-glow rounded-2xl px-2.5 sm:px-3 py-1.5 sm:py-2 flex flex-col gap-1 sm:gap-1.5 sm:min-w-[215px] border border-blue-400/35">
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
              <span className="text-[10px] font-mono uppercase tracking-wider text-sky-300 font-bold">
                MECH ARENA 3D
              </span>
            </div>

            <div className="space-y-0.5">
              <div className="flex justify-between text-[10px] font-mono">
                <span className="text-sky-300 flex items-center gap-1">
                  <Shield className="w-3 h-3" /> {isVi ? 'GIÁP MECH' : 'ARMOR'}
                </span>
                <span className="text-white font-bold">
                  {snap.armor}/{snap.maxArmor}
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-sky-500 to-cyan-300 transition-all duration-100"
                  style={{ width: `${Math.max(0, Math.min(100, (snap.armor / snap.maxArmor) * 100))}%` }}
                />
              </div>
            </div>

            <div className="space-y-0.5">
              <div className="flex justify-between text-[10px] font-mono">
                <span className="text-amber-300 flex items-center gap-1">
                  <Zap className="w-3 h-3" /> OVERDRIVE
                </span>
                <span className={snap.overdriveActive ? 'text-emerald-300 font-bold' : 'text-amber-200'}>
                  {snap.overdriveActive ? 'ACTIVE 2×' : `${snap.overdriveCharge}%`}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-rose-400"
                  style={{ width: `${snap.overdriveActive ? 100 : snap.overdriveCharge}%` }}
                />
              </div>
            </div>
          </div>

          {/* Right: Wave + Live Credits + Hangar Upgrade Button */}
          <div className="pointer-events-auto glass-panel rounded-2xl px-2.5 sm:px-3 py-1.5 sm:py-2 flex items-center gap-2.5 sm:gap-3 border border-white/15">
            <div className="text-xs font-mono">
              <span className="text-[9px] text-slate-400 block">{isVi ? 'ĐỢT' : 'WAVE'}</span>
              <span className="text-sm font-bold text-white">{snap.wave}/3</span>
            </div>
            <div className="text-xs font-mono">
              <span className="text-[9px] text-amber-300 flex items-center gap-0.5">
                <Coins className="w-3 h-3" /> CR
              </span>
              <span data-testid="mech-credits-readout" className="text-sm font-bold text-amber-300">
                {progress.mechCredits}
              </span>
            </div>
            <button
              type="button"
              data-testid="mech-hangar-btn"
              onClick={(e) => {
                e.currentTarget.blur();
                setHangarOpen((v) => !v);
              }}
              className="px-2.5 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/35 border border-sky-400/40 text-sky-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>{isVi ? 'Xưởng Giáp' : 'Hangar'}</span>
            </button>
          </div>
        </div>

        {/* In-Flow Boss Titan HP Bar */}
        {snap.bossHpRatio !== null && (
          <div className="self-center w-[min(360px,88vw)] glass-panel-glow border border-rose-500/50 rounded-xl px-3 py-1.5">
            <div className="flex justify-between text-[10px] font-mono text-rose-300 font-bold mb-1">
              <span className="flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-rose-400" /> BOSS TITAN MECH
              </span>
              <span>{Math.round(snap.bossHpRatio * 100)}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-900 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-rose-600 to-amber-400"
                style={{ width: `${Math.round(snap.bossHpRatio * 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Persistent Hangar Upgrade Drawer (z-[60] stays above z-50 Victory/Defeat modal + backdrop close + scroll, U1/U11) */}
      {hangarOpen && (
        <div
          data-testid="mech-hangar-modal"
          onClick={() => setHangarOpen(false)}
          className="fixed inset-0 z-[60] bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4 pointer-events-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="glass-panel-glow rounded-3xl p-5 max-w-md w-full max-h-[88dvh] overflow-y-auto overscroll-contain touch-pan-y vip-scrollbar border border-sky-400/40 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Wrench className="w-4 h-4 text-sky-400" />
                {isVi ? 'Xưởng Nâng Cấp Chiến Giáp' : 'Orbital Mech Hangar'}
              </h3>
              <span className="text-xs font-mono text-amber-300 font-bold">
                {progress.mechCredits} CR
              </span>
            </div>

            <div className="space-y-2">
              {(['armor', 'weapon', 'booster'] as MechUpgradeKey[]).map((key) => {
                const lv = progress.mechUpgrades[key];
                const cost = getMechUpgradeCost(lv);
                const maxed = lv >= 5;
                const label =
                  key === 'armor'
                    ? isVi ? 'Giáp Hợp Kim' : 'Alloy Armor'
                    : key === 'weapon'
                    ? isVi ? 'Pháo Plasma & Railgun' : 'Plasma & Railgun'
                    : isVi ? 'Động Cơ Boost' : 'Jet Boosters';
                return (
                  <div key={key} className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/10">
                    <div>
                      <div className="text-xs font-bold text-white">{label}</div>
                      <div className="text-[10px] font-mono text-sky-300">LV.{lv} / 5</div>
                    </div>
                    <button
                      type="button"
                      disabled={maxed || progress.mechCredits < cost}
                      onClick={() => handleBuy(key)}
                      className="px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-white text-xs font-bold font-mono cursor-pointer"
                    >
                      {maxed ? 'MAX' : `${cost} CR`}
                    </button>
                  </div>
                );
              })}
            </div>

            <div>
              <div className="text-[11px] font-mono text-slate-400 mb-1.5">
                {isVi ? 'Màu Sơn Chiến Giáp' : 'Mech Livery Paint'}
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {PAINTS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setMechPaint(p.id)}
                    className={`p-1.5 rounded-xl border text-[10px] font-semibold flex flex-col items-center gap-1 cursor-pointer ${
                      progress.mechPaint === p.id
                        ? 'border-cyan-400 bg-cyan-500/20 text-white'
                        : 'border-white/10 bg-white/5 text-slate-300'
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full border border-white/40" style={{ backgroundColor: p.hex }} />
                    <span>{isVi ? p.vi : p.en}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setHangarOpen(false)}
              className="w-full py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold cursor-pointer"
            >
              {isVi ? 'Đóng Xưởng' : 'Close Hangar'}
            </button>
          </div>
        </div>
      )}

      {/* Desktop Controls Hint */}
      <div className="hidden lg:flex fixed bottom-4 left-1/2 -translate-x-1/2 glass-panel px-4 py-1.5 rounded-full text-[11px] font-mono text-slate-300 gap-4 border border-white/10">
        <span><kbd className="text-white font-bold">WASD</kbd> {isVi ? 'Di chuyển' : 'Move'}</span>
        <span><kbd className="text-cyan-300 font-bold">Click/J</kbd> Plasma</span>
        <span><kbd className="text-violet-300 font-bold">RClick/K</kbd> Railgun</span>
        <span><kbd className="text-amber-300 font-bold">Space</kbd> Boost</span>
        <span><kbd className="text-rose-300 font-bold">Q/E</kbd> Overdrive</span>
      </div>

      {/* Victory / Defeat Modal */}
      {(snap.phase === 'victory' || snap.phase === 'game_over') && (
        <div
          data-testid="mech-end-modal"
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 pointer-events-auto"
        >
          <div className="glass-panel-glow rounded-3xl p-6 max-w-sm w-full text-center border border-sky-400/45 space-y-4">
            {snap.phase === 'victory' ? (
              <Trophy className="w-11 h-11 text-amber-400 mx-auto" />
            ) : (
              <Crosshair className="w-11 h-11 text-rose-400 mx-auto" />
            )}
            <h2 className="text-xl font-bold text-white">
              {snap.phase === 'victory'
                ? isVi ? 'HẠ GỤC BOSS TITAN!' : 'BOSS TITAN DEFEATED!'
                : isVi ? 'CHIẾN GIÁP HƯ HẠI' : 'MECH DESTROYED'}
            </h2>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2.5 rounded-xl bg-white/5">
                <div className="text-slate-400">{isVi ? 'Thưởng Credits' : 'Credits Earned'}</div>
                <div className="text-lg font-bold text-amber-300">+{snap.creditsEarned}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5">
                <div className="text-slate-400">{isVi ? 'Mech hạ' : 'Kills'}</div>
                <div className="text-lg font-bold text-cyan-300">{snap.kills}</div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                data-testid="mech-retry-btn"
                onClick={() => {
                  setHangarOpen(false);
                  mechArenaChannel.dispatchCommand({ type: 'restart' });
                }}
                className="flex-1 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                {isVi ? 'Chơi Lại' : 'Play Again'}
              </button>
              <button
                type="button"
                onClick={() => setHangarOpen(true)}
                className="px-3 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/35 text-amber-300 font-bold text-sm cursor-pointer"
              >
                {isVi ? 'Nâng Cấp' : 'Upgrade'}
              </button>
              <button
                type="button"
                data-testid="mech-end-exit-btn"
                onClick={() => ModeOrchestrator.getInstance().exitSpaceGame()}
                className="px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 font-semibold text-sm cursor-pointer"
              >
                {isVi ? 'Thoát' : 'Exit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Virtual Gamepad */}
      <MobileGameControls
        disabled={hangarOpen || snap.phase !== 'playing'}
        onMove={(x, y) => {
          mechArenaChannel.touchMove.x = x;
          mechArenaChannel.touchMove.y = y;
        }}
        actions={[
          {
            id: 'fire',
            label: 'PLASMA',
            color: 'cyan',
            onPressChange: (p) => {
              mechArenaChannel.touchActions.fire = p;
            },
          },
          {
            id: 'rail',
            label: 'RAILGUN',
            sublabel: `${Math.round(snap.railgunReadyRatio * 100)}%`,
            color: 'violet',
            highlight: snap.railgunReadyRatio >= 1,
            onPressChange: (p) => {
              mechArenaChannel.touchActions.rail = p;
            },
          },
          {
            id: 'boost',
            label: 'BOOST',
            color: 'amber',
            onPressChange: (p) => {
              mechArenaChannel.touchActions.boost = p;
            },
          },
          {
            id: 'overdrive',
            label: 'OVERDR',
            sublabel: `${snap.overdriveCharge}%`,
            color: 'rose',
            highlight: snap.overdriveCharge >= 100,
            onPressChange: (p) => {
              mechArenaChannel.touchActions.overdrive = p;
            },
          },
        ]}
      />
    </div>
  );
};
