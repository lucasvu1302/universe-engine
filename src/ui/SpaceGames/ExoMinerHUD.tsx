import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Battery, Coins, Pickaxe, RotateCcw, Shield, Wind, Wrench } from 'lucide-react';
import {
  getMinerUpgradeCost,
  useAppStore,
  type MinerUpgradeKey,
} from '@/stores/useAppStore';
import { ModeOrchestrator } from '@/engine/navigation/ModeOrchestrator';
import { AudioManager } from '@/engine/audio/AudioManager';
import { useTranslation } from '@/i18n';
import { MobileGameControls } from '@/ui/SpaceGames/MobileGameControls';
import {
  exoMinerChannel,
  type ExoMinerHudSnapshot,
} from '@/scenes/SpaceGames/engines/exoMinerEngine';

export const ExoMinerHUD: React.FC = () => {
  const { language } = useTranslation();
  const isVi = language === 'vi';
  const progress = useAppStore((s) => s.gameProgress);
  const purchaseMinerUpgrade = useAppStore((s) => s.purchaseMinerUpgrade);

  const [snap, setSnap] = useState<ExoMinerHudSnapshot>(() => exoMinerChannel.getSnapshot());
  const [baseShopOpen, setBaseShopOpen] = useState(false);
  const snapPhaseRef = useRef(snap.phase);
  snapPhaseRef.current = snap.phase;

  useEffect(() => {
    const unsub = exoMinerChannel.subscribeSnapshot(setSnap);
    setSnap(exoMinerChannel.getSnapshot());
    return unsub;
  }, []);

  // Pause simulation while Base Crafting Shop is open (G3/U1)
  useEffect(() => {
    exoMinerChannel.dispatchCommand({ type: 'set_paused', paused: baseShopOpen });
  }, [baseShopOpen]);

  // Auto-close Base Shop if evacuation triggers
  useEffect(() => {
    if (snap.phase === 'evacuated' && baseShopOpen) {
      setBaseShopOpen(false);
    }
  }, [snap.phase, baseShopOpen]);

  // Capture-phase Escape closes Base Shop instead of exiting the whole Space Game (G3/U1)
  useEffect(() => {
    if (!baseShopOpen) return;
    const onEscape = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const st = useAppStore.getState();
      if (st.isCommandPaletteOpen || st.isSettingsOpen || st.gameHubOpen) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      setBaseShopOpen(false);
    };
    window.addEventListener('keydown', onEscape, true);
    return () => window.removeEventListener('keydown', onEscape, true);
  }, [baseShopOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      const st = useAppStore.getState();
      if (st.isCommandPaletteOpen || st.isSettingsOpen || st.gameHubOpen) return;
      if (snapPhaseRef.current !== 'playing') return;
      if (e.key === 'b' || e.key === 'B') {
        setBaseShopOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleBuy = (key: MinerUpgradeKey) => {
    if (purchaseMinerUpgrade(key)) {
      AudioManager.getInstance().playLevelUp();
      exoMinerChannel.dispatchCommand({
        type: 'sync_upgrades',
        upgrades: useAppStore.getState().gameProgress.minerUpgrades,
      });
    }
  };

  return (
    <div data-testid="exo-miner-hud" className="fixed inset-0 z-30 pointer-events-none select-none">
      {/* Top Bar */}
      <div className="fixed top-2 inset-x-2 sm:top-4 sm:inset-x-4 flex flex-wrap items-start justify-between gap-1.5 sm:gap-2">
        {/* Left: Exit + O2 + Battery + Cargo */}
        <div className="pointer-events-auto glass-panel-glow rounded-2xl px-2.5 sm:px-3 py-1.5 sm:py-2 flex flex-col gap-1 sm:gap-1.5 sm:min-w-[215px] border border-emerald-400/35">
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
            <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-300 font-bold">
              EXO-MINER 3D
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="flex justify-between text-[9px] font-mono text-sky-300">
                <span className="flex items-center gap-0.5"><Wind className="w-3 h-3" /> O2</span>
                <span>{snap.o2}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className={`h-full ${snap.o2 < 25 ? 'bg-rose-500' : 'bg-sky-400'}`}
                  style={{ width: `${snap.o2}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[9px] font-mono text-amber-300">
                <span className="flex items-center gap-0.5">
                  <Battery className="w-3 h-3" /> {isVi ? 'PIN' : 'BAT'}
                </span>
                <span>{snap.battery}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full bg-amber-400" style={{ width: `${snap.battery}%` }} />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono">
            <span className="text-emerald-300 flex items-center gap-1">
              <Pickaxe className="w-3 h-3" />
              {isVi ? 'Khoang:' : 'Cargo:'} <strong>{snap.cargoCount}/{snap.cargoCapacity}</strong> ({snap.cargoValue} CR)
            </span>
            {snap.inBaseZone && (
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                BASE
              </span>
            )}
          </div>
        </div>

        {/* Right: Credits + Weather Status + Base Upgrade Shop */}
        <div className="pointer-events-auto glass-panel rounded-2xl px-3 py-2 flex items-center gap-2.5 border border-white/15">
          <div className="text-xs font-mono">
            <span className="text-[9px] text-amber-300 flex items-center gap-0.5">
              <Coins className="w-3 h-3" /> CREDITS
            </span>
            <span className="text-sm font-bold text-amber-300">{progress.minerCredits}</span>
          </div>
          <div className="text-[10px] font-mono px-2 py-1 rounded-lg bg-white/5 text-slate-200">
            {snap.isDustStorm
              ? isVi ? '⚠ BÃO BỤI' : '⚠ DUST STORM'
              : snap.isNight
              ? isVi ? '🌙 ĐÊM' : '🌙 NIGHT'
              : isVi ? '☀ ỔN ĐỊNH' : '☀ CLEAR'}
          </div>
          <button
            type="button"
            data-testid="miner-base-shop-btn"
            onClick={(e) => {
              e.currentTarget.blur();
              setBaseShopOpen((v) => !v);
            }}
            className="px-2.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-400/40 text-emerald-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>{isVi ? 'Căn Cứ' : 'Base'}</span>
          </button>
        </div>
      </div>

      {/* Base Upgrade Shop Modal (z-[60] + backdrop close + scrollable on landscape phones, U1/U11) */}
      {baseShopOpen && (
        <div
          data-testid="miner-shop-modal"
          onClick={() => setBaseShopOpen(false)}
          className="fixed inset-0 z-[60] bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4 pointer-events-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="glass-panel-glow rounded-3xl p-5 max-w-md w-full max-h-[88dvh] overflow-y-auto overscroll-contain touch-pan-y vip-scrollbar border border-emerald-400/40 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                {isVi ? 'Chế Tạo & Nâng Cấp Căn Cứ' : 'Habitat Crafting & Upgrades'}
              </h3>
              <span className="text-xs font-mono text-amber-300 font-bold">{progress.minerCredits} CR</span>
            </div>

            <div className="space-y-2">
              {(['o2', 'laser', 'jetpack', 'turrets'] as MinerUpgradeKey[]).map((key) => {
                const lv = progress.minerUpgrades[key];
                const maxLv = key === 'turrets' ? 3 : 5;
                const cost = getMinerUpgradeCost(key, lv);
                const maxed = lv >= maxLv;
                const label =
                  key === 'o2'
                    ? isVi ? 'Bình Oxy & Khoang Quặng' : 'O2 Tank & Cargo'
                    : key === 'laser'
                    ? isVi ? 'Công Suất Tia Laser Đào' : 'Mining Laser Power'
                    : key === 'jetpack'
                    ? isVi ? 'Jetpack Tăng Tốc' : 'Jetpack Thruster'
                    : isVi ? 'Tháp Pháo Tự Động Căn Cứ' : 'Auto-Defense Turrets';
                return (
                  <div key={key} className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/10">
                    <div>
                      <div className="text-xs font-bold text-white">{label}</div>
                      <div className="text-[10px] font-mono text-emerald-300">
                        {key === 'turrets' ? `${lv} / 3` : `LV.${lv} / 5`}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={maxed || progress.minerCredits < cost}
                      onClick={() => handleBuy(key)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 text-xs font-bold font-mono cursor-pointer"
                    >
                      {maxed ? 'MAX' : `${cost} CR`}
                    </button>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setBaseShopOpen(false)}
              className="w-full py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold cursor-pointer"
            >
              {isVi ? 'Đóng Trạm Chế Tạo' : 'Close Crafting'}
            </button>
          </div>
        </div>
      )}

      {/* Desktop Controls Hint */}
      <div className="hidden lg:flex fixed bottom-4 left-1/2 -translate-x-1/2 glass-panel px-4 py-1.5 rounded-full text-[11px] font-mono text-slate-300 gap-4 border border-white/10">
        <span><kbd className="text-white font-bold">WASD</kbd> {isVi ? 'Di chuyển' : 'Move'}</span>
        <span>
          <kbd className="text-emerald-300 font-bold">{isVi ? 'Giữ E / Space' : 'Hold E / Space'}</kbd>{' '}
          {isVi ? 'Đào tinh thể' : 'Mine'}
        </span>
        <span><kbd className="text-amber-300 font-bold">Shift</kbd> Jetpack</span>
        <span><kbd className="text-cyan-300 font-bold">B</kbd> {isVi ? 'Xưởng Căn Cứ' : 'Base Shop'}</span>
      </div>

      {/* Emergency Evacuation Modal (O2 === 0) */}
      {snap.phase === 'evacuated' && (
        <div
          data-testid="miner-evac-modal"
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 pointer-events-auto"
        >
          <div className="glass-panel-glow rounded-3xl p-6 max-w-sm w-full text-center border border-amber-400/45 space-y-4">
            <Wind className="w-11 h-11 text-rose-400 mx-auto" />
            <h2 className="text-xl font-bold text-white">
              {isVi ? 'SƠ TÁN KHẨN CẤP (HẾT OXY)' : 'EMERGENCY EVACUATION (0% O2)'}
            </h2>
            <p className="text-xs text-slate-300">
              {isVi
                ? 'Quặng chưa kịp nộp đã thất lạc, nhưng toàn bộ Credits trong tài khoản và nâng cấp Căn Cứ vẫn được bảo toàn.'
                : 'Unbanked cargo was lost, while all banked Credits, Turrets, and Suit upgrades remain intact.'}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                data-testid="miner-retry-btn"
                onClick={() => {
                  setBaseShopOpen(false);
                  exoMinerChannel.dispatchCommand({ type: 'restart' });
                }}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                {isVi ? 'Xuất Phát Lại' : 'Deploy Again'}
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
        disabled={baseShopOpen || snap.phase !== 'playing'}
        onMove={(x, y) => {
          exoMinerChannel.touchMove.x = x;
          exoMinerChannel.touchMove.y = y;
        }}
        actions={[
          {
            id: 'mine',
            label: isVi ? 'ĐÀO' : 'MINE',
            color: 'emerald',
            highlight: snap.isMining,
            onPressChange: (p) => {
              exoMinerChannel.touchActions.mine = p;
            },
          },
          {
            id: 'boost',
            label: 'JET',
            color: 'amber',
            onPressChange: (p) => {
              exoMinerChannel.touchActions.boost = p;
            },
          },
          {
            id: 'base',
            label: isVi ? 'XƯỞNG' : 'SHOP',
            color: 'cyan',
            onPressChange: (p) => {
              if (p) setBaseShopOpen((v) => !v);
            },
          },
        ]}
      />
    </div>
  );
};
