import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Radar, Minimize2 } from 'lucide-react';
import { CELESTIAL_BODIES, PLANET_KEYS, getLocalizedBodyData } from '@/data/celestialData';
import { SimulationClock } from '@/engine/simulation/SimulationClock';
import { CameraManager } from '@/engine/camera/CameraManager';
import { AudioManager } from '@/engine/audio/AudioManager';
import { useAppStore } from '@/stores/useAppStore';
import { useTranslation } from '@/i18n';

const RADAR_SIZE = 168;
const RADAR_INTERVAL_MS = 68; // ~14.7 Hz (<= 15 Hz, zero React re-render churn)
const scratchOrbitVec = new THREE.Vector3();
const scratchCamDir = new THREE.Vector3();

export function computePlanetRadarPoint(
  planetId: string,
  simTime: number,
  size: number = RADAR_SIZE
): { x: number; y: number; orbitRadiusPx: number } {
  const half = size * 0.5;
  if (planetId === 'sun') {
    return { x: half, y: half, orbitRadiusPx: 0 };
  }
  const body = CELESTIAL_BODIES[planetId];
  if (!body || body.visualDistance <= 0) {
    return { x: half, y: half, orbitRadiusPx: 0 };
  }

  SimulationClock.calculateOrbitPosition(
    {
      distance: body.visualDistance,
      speed: body.orbitalSpeed,
      eccentricity: body.type === 'rocky' ? 0.04 : 0.01,
      inclinationDeg: body.orbitalInclinationDeg ?? 0.0,
    },
    simTime,
    scratchOrbitVec
  );

  const angle = Math.atan2(scratchOrbitVec.z, scratchOrbitVec.x);
  const maxVisualDist = CELESTIAL_BODIES.neptune?.visualDistance || 340;
  const norm = Math.pow(
    THREE.MathUtils.clamp((body.visualDistance - 18) / (maxVisualDist - 18), 0.04, 1.0),
    0.58
  );
  const orbitRadiusPx = 17 + norm * (half - 27);

  return {
    x: half + Math.cos(angle) * orbitRadiusPx,
    y: half + Math.sin(angle) * orbitRadiusPx,
    orbitRadiusPx,
  };
}

function hitTestRadar(clickX: number, clickY: number, simTime: number): string | null {
  let closestId: string | null = null;
  let closestDistSq = 12 * 12;

  const sunDx = clickX - RADAR_SIZE * 0.5;
  const sunDy = clickY - RADAR_SIZE * 0.5;
  if (sunDx * sunDx + sunDy * sunDy <= 8 * 8) {
    closestId = 'sun';
    closestDistSq = sunDx * sunDx + sunDy * sunDy;
  }

  for (const key of PLANET_KEYS) {
    const pt = computePlanetRadarPoint(key, simTime, RADAR_SIZE);
    const dx = clickX - pt.x;
    const dy = clickY - pt.y;
    const dSq = dx * dx + dy * dy;
    if (dSq < closestDistSq) {
      closestDistSq = dSq;
      closestId = key;
    }
  }
  return closestId;
}

export const SolarRadarHUD: React.FC = () => {
  const { t } = useTranslation();
  const showRadar = useAppStore((state) => state.showRadar);
  const toggleRadar = useAppStore((state) => state.toggleRadar);
  const targetId = useAppStore((state) => state.targetId);
  const setTargetId = useAppStore((state) => state.setTargetId);
  const setCameraMode = useAppStore((state) => state.setCameraMode);
  const setCompareMode = useAppStore((state) => state.setCompareMode);
  const reducedMotion = useAppStore((state) => state.reducedMotion);
  const isTabHidden = useAppStore((state) => state.isTabHidden);

  const [hoveredRadarBody, setHoveredRadarBody] = useState<string | null>(null);
  const [isMobileViewport, setIsMobileViewport] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 640
  );
  const [mobileRadarOpen, setMobileRadarOpen] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sweepAngleRef = useRef(0);
  const targetIdRef = useRef(targetId);
  const reducedMotionRef = useRef(reducedMotion);

  const effectiveOpen = isMobileViewport ? mobileRadarOpen : showRadar;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onResize = () => {
      setIsMobileViewport(window.innerWidth < 640);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    targetIdRef.current = targetId;
  }, [targetId]);

  useEffect(() => {
    reducedMotionRef.current = reducedMotion;
  }, [reducedMotion]);

  useEffect(() => {
    if (!effectiveOpen || isTabHidden) return;

    const drawFrame = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const size = RADAR_SIZE;
      const half = size * 0.5;
      const simTime = SimulationClock.getInstance().simulationTime;

      ctx.clearRect(0, 0, size, size);

      // 1. Subtle radial radar backdrop
      const bgGrad = ctx.createRadialGradient(half, half, 4, half, half, half - 2);
      bgGrad.addColorStop(0, 'rgba(14, 165, 233, 0.14)');
      bgGrad.addColorStop(0.65, 'rgba(8, 15, 32, 0.45)');
      bgGrad.addColorStop(1, 'rgba(2, 6, 18, 0.82)');
      ctx.fillStyle = bgGrad;
      ctx.beginPath();
      ctx.arc(half, half, half - 3, 0, Math.PI * 2);
      ctx.fill();

      // 2. Goldilocks Habitable Zone band around Earth-Mars
      const earthPt = computePlanetRadarPoint('earth', simTime, size);
      const marsPt = computePlanetRadarPoint('mars', simTime, size);
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.18)';
      ctx.lineWidth = Math.max(4, marsPt.orbitRadiusPx - earthPt.orbitRadiusPx + 4);
      ctx.beginPath();
      ctx.arc(
        half,
        half,
        (earthPt.orbitRadiusPx + marsPt.orbitRadiusPx) * 0.5,
        0,
        Math.PI * 2
      );
      ctx.stroke();

      // 3. Camera FOV orientation sector
      const camMgr = CameraManager.getInstance();
      if (camMgr.camera) {
        camMgr.camera.getWorldDirection(scratchCamDir);
        const camYaw = Math.atan2(scratchCamDir.z, scratchCamDir.x);
        const halfFov = THREE.MathUtils.degToRad((camMgr.camera.fov || 50) * 0.5);
        ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
        ctx.beginPath();
        ctx.moveTo(half, half);
        ctx.arc(half, half, half - 8, camYaw - halfFov, camYaw + halfFov);
        ctx.closePath();
        ctx.fill();
      }

      // 4. Crosshair axes
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(8, half);
      ctx.lineTo(size - 8, half);
      ctx.moveTo(half, 8);
      ctx.lineTo(half, size - 8);
      ctx.stroke();

      // 5. Rotating sweep line (respects reducedMotion)
      if (!reducedMotionRef.current) {
        sweepAngleRef.current = (sweepAngleRef.current + 0.045) % (Math.PI * 2);
        const sx = half + Math.cos(sweepAngleRef.current) * (half - 6);
        const sy = half + Math.sin(sweepAngleRef.current) * (half - 6);
        const sweepGrad = ctx.createLinearGradient(half, half, sx, sy);
        sweepGrad.addColorStop(0, 'rgba(56, 189, 248, 0.0)');
        sweepGrad.addColorStop(1, 'rgba(56, 189, 248, 0.42)');
        ctx.strokeStyle = sweepGrad;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(half, half);
        ctx.lineTo(sx, sy);
        ctx.stroke();
      }

      // 6. Sun core at center
      ctx.fillStyle = '#fbbf24';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(half, half, 3.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // 7. 8 Planetary orbits & live beacons
      const activeId = targetIdRef.current;
      for (const key of PLANET_KEYS) {
        const body = CELESTIAL_BODIES[key];
        const pt = computePlanetRadarPoint(key, simTime, size);
        const isTarget = activeId === key;

        ctx.strokeStyle = isTarget ? 'rgba(56, 189, 248, 0.42)' : 'rgba(148, 163, 184, 0.14)';
        ctx.lineWidth = isTarget ? 1.1 : 0.75;
        ctx.beginPath();
        ctx.arc(half, half, pt.orbitRadiusPx, 0, Math.PI * 2);
        ctx.stroke();

        const dotRadius =
          body.type === 'gas_giant' ? 3.3 : body.type === 'ice_giant' ? 2.8 : 2.3;
        ctx.fillStyle = body.color;
        if (isTarget) {
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 8;
        }
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, dotRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        if (isTarget) {
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1.3;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, dotRadius + 4.2, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    };

    drawFrame();
    const timer = setInterval(drawFrame, RADAR_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [effectiveOpen, isTabHidden]);

  const getLocalCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = RADAR_SIZE / (rect.width || RADAR_SIZE);
    const scaleY = RADAR_SIZE / (rect.height || RADAR_SIZE);
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getLocalCanvasCoords(e);
    if (!coords) return;
    const simTime = SimulationClock.getInstance().simulationTime;
    const closestId = hitTestRadar(coords.x, coords.y, simTime);

    if (closestId) {
      AudioManager.getInstance().playUIClick();
      setCompareMode(false);
      setTargetId(closestId);
      setCameraMode('ORBIT');
      CameraManager.getInstance().focusPlanet(closestId);
    }
  };

  const handleCanvasMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getLocalCanvasCoords(e);
    if (!coords) return;
    const simTime = SimulationClock.getInstance().simulationTime;
    const hit = hitTestRadar(coords.x, coords.y, simTime);
    setHoveredRadarBody((prev) => (prev === hit ? prev : hit));
  };

  const handleToggleRadar = () => {
    AudioManager.getInstance().playUIClick();
    if (isMobileViewport) {
      setMobileRadarOpen((prev) => !prev);
    } else {
      toggleRadar();
    }
  };

  if (!effectiveOpen) {
    return (
      <div className="fixed top-14 right-2.5 sm:top-auto sm:right-auto sm:bottom-16 sm:left-4 z-40 pointer-events-auto">
        <button
          type="button"
          data-testid="solar-radar-expand"
          aria-label={t('vip.radarExpand')}
          onClick={handleToggleRadar}
          className="glass-panel vip-card-sheen px-2.5 sm:px-3 py-1.5 rounded-full flex items-center space-x-1.5 text-[11px] text-sky-300 hover:text-white hover:border-sky-400/50 transition-all cursor-pointer"
          title={t('vip.radarExpand')}
        >
          <Radar className="w-3.5 h-3.5 text-sky-400" />
          <span className="hud-tag text-[10px] font-semibold hidden sm:inline">{t('vip.radarTitle')}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed top-14 right-2.5 sm:top-auto sm:right-auto sm:bottom-16 sm:left-4 z-40 pointer-events-auto">
      <div className="glass-panel-glow vip-card-sheen p-2 sm:p-2.5 rounded-2xl w-[172px] sm:w-[188px]">
        <div className="flex items-center justify-between px-1 pb-1.5">
          <div className="flex items-center space-x-1.5 min-w-0">
            <Radar className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span className="hud-tag text-[9px] font-bold text-sky-200 truncate">
              {hoveredRadarBody
                ? getLocalizedBodyData(hoveredRadarBody)?.name || t('vip.radarTitle')
                : t('vip.radarTitle')}
            </span>
          </div>
          <button
            type="button"
            data-testid="solar-radar-collapse"
            aria-label={t('vip.radarCollapse')}
            onClick={handleToggleRadar}
            className="p-0.5 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title={t('vip.radarCollapse')}
          >
            <Minimize2 className="w-3 h-3" />
          </button>
        </div>

        <div className="relative flex items-center justify-center rounded-full border border-sky-400/25 bg-slate-950/60 p-0.5">
          <canvas
            ref={canvasRef}
            data-testid="solar-radar-canvas"
            width={RADAR_SIZE}
            height={RADAR_SIZE}
            onClick={handleCanvasClick}
            onMouseMove={handleCanvasMove}
            onMouseLeave={() => setHoveredRadarBody(null)}
            className={`rounded-full block ${hoveredRadarBody ? 'cursor-pointer' : 'cursor-crosshair'}`}
          />
        </div>
      </div>
    </div>
  );
};
