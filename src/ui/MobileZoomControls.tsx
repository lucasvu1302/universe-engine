import React, { useCallback, useEffect, useRef } from 'react';
import { Plus, Minus, Crosshair } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { CameraManager } from '@/engine/camera/CameraManager';
import { AudioManager } from '@/engine/audio/AudioManager';
import { useTranslation } from '@/i18n';

const ZOOM_STEP = 180;
const HOLD_DELAY_MS = 240;
const HOLD_REPEAT_MS = 85;

export interface MobileZoomControlsProps {
  scenarioActive?: boolean;
}

/**
 * One-handed quick zoom & re-center glass pill for mobile touchscreens (< 640px).
 * Supports single tap as well as press-and-hold smooth continuous zooming without
 * double-firing clicks or leaking intervals across mode switches / backgrounding.
 */
export const MobileZoomControls: React.FC<MobileZoomControlsProps> = ({ scenarioActive = false }) => {
  const { language } = useTranslation();
  const isVi = language === 'vi';

  const cameraMode = useAppStore((s) => s.cameraMode);
  const targetId = useAppStore((s) => s.targetId);
  const cinemaMode = useAppStore((s) => s.cinemaMode);
  const photoMode = useAppStore((s) => s.photoMode);
  const activeTour = useAppStore((s) => s.activeTour);
  const activeSpaceGame = useAppStore((s) => s.activeSpaceGame);
  const gameHubOpen = useAppStore((s) => s.gameHubOpen);
  const solarStormActive = useAppStore((s) => s.solarStormActive);
  const missionPlannerOpen = useAppStore((s) => s.missionPlannerOpen);
  const activeCosmicLab = useAppStore((s) => s.activeCosmicLab);
  const activeSurface = useAppStore((s) => s.activeSurface);
  const activeEventSurfaceId = useAppStore((s) => s.activeEventSurfaceId);

  // Shift higher when Radar is unmounted and a taller (45-46dvh) bottom sheet may be open (U12)
  const useUpperAnchor =
    solarStormActive ||
    missionPlannerOpen ||
    activeCosmicLab !== 'none' ||
    activeSurface !== 'none' ||
    activeEventSurfaceId !== null;

  const isHidden =
    scenarioActive ||
    cinemaMode ||
    photoMode ||
    activeTour ||
    cameraMode === 'FREE_FLIGHT' ||
    (activeSpaceGame && activeSpaceGame !== 'none') ||
    gameHubOpen;

  const holdDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const didHoldRef = useRef(false);

  const stopHold = useCallback(() => {
    if (holdDelayRef.current !== null) {
      clearTimeout(holdDelayRef.current);
      holdDelayRef.current = null;
    }
    if (holdIntervalRef.current !== null) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isHidden) {
      stopHold();
      didHoldRef.current = false;
    }
  }, [isHidden, stopHold]);

  useEffect(() => {
    const onStop = () => stopHold();
    const onVis = () => {
      if (document.hidden) stopHold();
    };
    window.addEventListener('pointerup', onStop);
    window.addEventListener('pointercancel', onStop);
    window.addEventListener('blur', onStop);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      stopHold();
      window.removeEventListener('pointerup', onStop);
      window.removeEventListener('pointercancel', onStop);
      window.removeEventListener('blur', onStop);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [stopHold]);

  if (isHidden) {
    return null;
  }

  const startZoomHold = (deltaRaw: number) => {
    stopHold();
    didHoldRef.current = false;
    holdDelayRef.current = setTimeout(() => {
      didHoldRef.current = true;
      CameraManager.getInstance().zoomOrbit(deltaRaw * 0.55);
      holdIntervalRef.current = setInterval(() => {
        CameraManager.getInstance().zoomOrbit(deltaRaw * 0.55);
      }, HOLD_REPEAT_MS);
    }, HOLD_DELAY_MS);
  };

  const handleZoomStep = (deltaRaw: number) => {
    if (didHoldRef.current) {
      didHoldRef.current = false;
      return;
    }
    AudioManager.getInstance().playUIClick();
    CameraManager.getInstance().zoomOrbit(deltaRaw);
  };

  const handleResetView = () => {
    AudioManager.getInstance().playUIClick();
    const cam = CameraManager.getInstance();
    const st = useAppStore.getState();
    cam.clearOrbitInertia();

    if (st.activeCosmicLab !== 'none') {
      if (st.activeCosmicLab === 'trappist_exoplanets' && st.trappistViewMode !== 'system') {
        cam.setCosmicLabSubView('trappist_exoplanets', st.trappistViewMode);
      } else if (st.activeCosmicLab === 'dyson_megastructure' && st.dysonMode !== 'dyson_swarm') {
        cam.setCosmicLabSubView('dyson_megastructure', st.dysonMode);
      } else if (st.activeCosmicLab === 'relativity_lab' && st.relativityTab !== 'dilation_lensing') {
        cam.setCosmicLabSubView('relativity_lab', st.relativityTab);
      } else {
        cam.setCosmicLabMode(st.activeCosmicLab);
      }
      return;
    }
    if (st.activeEventSurfaceId !== null) {
      cam.setEventSurfaceMode(st.activeEventSurfaceId);
      return;
    }
    if (st.activeSurface !== 'none') {
      cam.setSurfaceMode(st.activeSurface);
      return;
    }
    if (st.inExoSystem) {
      cam.setExoSystemMode(true);
      return;
    }
    if (st.compareMode) {
      cam.flyToCompareView();
      return;
    }
    if (st.cameraMode === 'GALAXY') {
      cam.flyToGalaxyView();
      return;
    }

    if (targetId === 'blackhole') {
      cam.flyToBlackHole();
    } else if (targetId === 'pulsar') {
      cam.flyToPulsar();
    } else if (targetId && targetId !== 'sun') {
      cam.focusPlanet(targetId);
    } else {
      cam.flyToSolarSystemOverview();
    }
  };

  return (
    <div
      data-testid="mobile-zoom-controls"
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      className={`sm:hidden fixed right-2.5 ${
        useUpperAnchor ? 'top-[40%]' : 'top-[50%]'
      } -translate-y-1/2 z-40 flex flex-col items-center gap-1.5 pointer-events-auto select-none`}
    >
      <div className="glass-panel-glow rounded-2xl p-1 flex flex-col items-center gap-1 border border-sky-400/30 shadow-xl">
        <button
          type="button"
          data-testid="mobile-zoom-in-btn"
          aria-label={isVi ? 'Phóng to góc nhìn' : 'Zoom in'}
          title={isVi ? 'Phóng to' : 'Zoom in'}
          onClick={() => handleZoomStep(-ZOOM_STEP)}
          onPointerDown={() => startZoomHold(-ZOOM_STEP)}
          onPointerUp={stopHold}
          onPointerLeave={stopHold}
          onPointerCancel={stopHold}
          className="w-9 h-9 rounded-xl bg-sky-500/15 hover:bg-sky-500/30 active:scale-95 text-sky-200 flex items-center justify-center transition-all cursor-pointer touch-manipulation"
        >
          <Plus className="w-4 h-4" />
        </button>

        <div className="w-5 h-px bg-white/10" />

        <button
          type="button"
          data-testid="mobile-zoom-out-btn"
          aria-label={isVi ? 'Thu nhỏ góc nhìn' : 'Zoom out'}
          title={isVi ? 'Thu nhỏ' : 'Zoom out'}
          onClick={() => handleZoomStep(ZOOM_STEP)}
          onPointerDown={() => startZoomHold(ZOOM_STEP)}
          onPointerUp={stopHold}
          onPointerLeave={stopHold}
          onPointerCancel={stopHold}
          className="w-9 h-9 rounded-xl bg-sky-500/15 hover:bg-sky-500/30 active:scale-95 text-sky-200 flex items-center justify-center transition-all cursor-pointer touch-manipulation"
        >
          <Minus className="w-4 h-4" />
        </button>

        <div className="w-5 h-px bg-white/10" />

        <button
          type="button"
          data-testid="mobile-zoom-reset-btn"
          aria-label={isVi ? 'Lấy nét lại góc nhìn' : 'Reset camera focus'}
          title={isVi ? 'Lấy nét lại' : 'Re-center'}
          onClick={handleResetView}
          className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/15 active:scale-95 text-amber-300 flex items-center justify-center transition-all cursor-pointer touch-manipulation"
        >
          <Crosshair className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
