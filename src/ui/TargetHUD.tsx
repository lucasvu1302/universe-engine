import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  Crosshair,
  Orbit,
  Thermometer,
  Weight,
  Ruler,
  Sparkles,
  ChevronDown,
  ChevronUp,
  BookmarkPlus,
  Check,
  Rocket,
  Navigation,
  Film,
  Waves,
  Radio,
  Minimize2,
  Maximize2,
  Flame,
  Layers,
  Satellite,
  Atom,
  Eye,
  Globe2
} from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { CELESTIAL_BODIES, getLocalizedBodyData } from '@/data/celestialData';
import { CameraManager } from '@/engine/camera/CameraManager';
import { CinematicDirector } from '@/engine/camera/CinematicDirector';
import { AudioManager } from '@/engine/audio/AudioManager';
import { SimulationManager } from '@/simulation/core/SimulationManager';
import { ModeOrchestrator } from '@/engine/navigation/ModeOrchestrator';
import { useTranslation } from '@/i18n';

const scratchEarth = new THREE.Vector3();
const scratchTarget = new THREE.Vector3();

function computeLightDelayText(bodyId: string, lang: 'vi' | 'en'): string {
  if (bodyId === 'blackhole') return lang === 'vi' ? '27.000 năm' : '27,000 yr';
  if (bodyId === 'pulsar') return lang === 'vi' ? '2.300 năm' : '2,300 yr';
  if (bodyId === 'earth') return '0.00 s (LEO)';
  if (bodyId === 'iss') return '0.0014 s (420 km)';
  if (bodyId === 'moon') return '1.28 s (0.0026 AU)';
  if (bodyId === 'jwst') return '5.0 s (0.01 AU · L2)';

  const body = CELESTIAL_BODIES[bodyId];
  if (!body) return '—';
  if (body.type === 'constellation') {
    return (
      (lang === 'vi' ? body.distanceLightYearsVi : body.distanceLightYearsEn) ??
      body.distanceLightYears ??
      (lang === 'vi' ? '65 – 1.344 năm a/s' : '65 – 1,344 ly')
    );
  }

  const cam = CameraManager.getInstance();
  cam.getLiveBodyPosition('earth', scratchEarth);
  cam.getLiveBodyPosition(bodyId, scratchTarget);

  let liveAU: number;
  if (body.type === 'spacecraft' && body.orbitalDistanceAU > 10) {
    liveAU = body.orbitalDistanceAU;
  } else if (body.id === 'sun') {
    liveAU = 1.0;
  } else {
    // Project live heliocentric orbital phase angles into true astronomical AU (not compressed visual units!)
    const earthAngle = Math.atan2(scratchEarth.z, scratchEarth.x);
    const hostBody =
      body.type === 'moon' && body.parentPlanetId
        ? CELESTIAL_BODIES[body.parentPlanetId] ?? body
        : body;
    const targetAngle = Math.atan2(scratchTarget.z, scratchTarget.x);
    const targetHelioAU = Math.max(0.05, hostBody.orbitalDistanceAU);
    const dxAU = Math.cos(targetAngle) * targetHelioAU - Math.cos(earthAngle) * 1.0;
    const dzAU = Math.sin(targetAngle) * targetHelioAU - Math.sin(earthAngle) * 1.0;
    liveAU = Math.max(0.01, Math.hypot(dxAU, dzAU));
  }
  const lightSeconds = liveAU * 499.005;

  if (lightSeconds < 90) {
    return `${lightSeconds.toFixed(1)} s (${liveAU.toFixed(2)} AU)`;
  }
  const lightMinutes = lightSeconds / 60;
  if (lightMinutes < 90) {
    return lang === 'vi'
      ? `${lightMinutes.toFixed(1)} phút (${liveAU.toFixed(2)} AU)`
      : `${lightMinutes.toFixed(1)} light-min (${liveAU.toFixed(2)} AU)`;
  }
  const lightHours = lightMinutes / 60;
  return lang === 'vi'
    ? `${lightHours.toFixed(2)} giờ (${liveAU.toFixed(2)} AU)`
    : `${lightHours.toFixed(2)} light-hr (${liveAU.toFixed(2)} AU)`;
}

export const TargetHUD: React.FC = () => {
  const { t, language } = useTranslation();
  const targetId = useAppStore((state) => state.targetId);
  const hoveredId = useAppStore((state) => state.hoveredId);
  const isTabHidden = useAppStore((state) => state.isTabHidden);
  const setTargetId = useAppStore((state) => state.setTargetId);
  const setCameraMode = useAppStore((state) => state.setCameraMode);
  const setInExoSystem = useAppStore((state) => state.setInExoSystem);
  const saveCameraBookmark = useAppStore((state) => state.saveCameraBookmark);

  // Keep primary card anchored to selected targetId so hovering never hijacks open controls
  const activeId = targetId || hoveredId;
  const [isDossierOpen, setIsDossierOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [lightDelayText, setLightDelayText] = useState<string>(() =>
    activeId ? computeLightDelayText(activeId, language) : '—'
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  const savedTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
    const isConst = Boolean(activeId && activeId.startsWith('constellation_'));
    if (isConst && typeof window !== 'undefined' && window.innerWidth >= 640) {
      setIsDossierOpen(true);
    }
  }, [activeId]);

  useEffect(() => {
    return () => {
      if (savedTimerRef.current !== null) window.clearTimeout(savedTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!activeId || isTabHidden) return;
    setLightDelayText(computeLightDelayText(activeId, language));
    const timer = setInterval(() => {
      setLightDelayText(computeLightDelayText(activeId, language));
    }, 250);
    return () => clearInterval(timer);
  }, [activeId, language, isTabHidden]);

  if (!activeId) return null;

  const data = CELESTIAL_BODIES[activeId];
  if (!data) return null;

  const localized = getLocalizedBodyData(activeId);
  const hoveredPreview =
    hoveredId && hoveredId !== activeId && CELESTIAL_BODIES[hoveredId]
      ? getLocalizedBodyData(hoveredId)
      : null;

  const handleFocus = () => {
    AudioManager.getInstance().playUIClick();
    if (data.id === 'blackhole') {
      CameraManager.getInstance().flyToBlackHole();
    } else if (data.id === 'pulsar') {
      CameraManager.getInstance().flyToPulsar();
    } else {
      CameraManager.getInstance().focusPlanet(data.id);
    }
  };

  const handleSaveBookmark = () => {
    AudioManager.getInstance().playUIClick();
    const payload = CameraManager.getInstance().captureBookmarkPayload(localized.name, data.id);
    saveCameraBookmark(payload);
    setJustSaved(true);
    if (savedTimerRef.current !== null) window.clearTimeout(savedTimerRef.current);
    savedTimerRef.current = window.setTimeout(() => {
      setJustSaved(false);
      savedTimerRef.current = null;
    }, 1400);
  };

  const handleSurfaceLanding = (surface: 'mars' | 'moon' | 'europa' | 'titan') => {
    AudioManager.getInstance().playWarpDrive();
    ModeOrchestrator.getInstance().enterSurface(surface);
  };

  const isBlackHole = data.type === 'black_hole';
  const isPulsar = data.type === 'pulsar';
  const isSpacecraft = data.type === 'spacecraft';
  const isConstellation = data.type === 'constellation';
  const canLandSurface =
    data.id === 'mars' || data.id === 'moon' || data.id === 'europa' || data.id === 'titan';
  const earthGravityRatio = (data.gravityMs2 / 9.81).toFixed(2);

  return (
    <div
      data-testid="target-hud-panel"
      className="fixed bottom-2.5 inset-x-2.5 sm:inset-x-auto sm:bottom-4 sm:right-4 z-40 sm:w-[356px] pointer-events-auto"
    >
      <div
        ref={scrollRef}
        data-testid="target-hud-scroll"
        onWheel={(e) => e.stopPropagation()}
        className={`vip-card-sheen p-3.5 sm:p-4 rounded-2xl space-y-2.5 border-t-2 max-h-[45dvh] sm:max-h-[calc(100dvh-5.5rem)] overflow-y-auto overscroll-contain touch-pan-y vip-scrollbar ${
          isBlackHole
            ? 'glass-panel border border-orange-500/40 shadow-orange-500/15 shadow-2xl'
            : isPulsar
            ? 'glass-panel border border-cyan-500/40 shadow-cyan-500/15 shadow-2xl'
            : isConstellation
            ? 'glass-panel-glow border border-amber-400/35 shadow-amber-500/10 shadow-2xl'
            : 'glass-panel-glow'
        }`}
        style={{ borderTopColor: data.color }}
      >
        {hoveredPreview && (
          <div className="flex items-center justify-between px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-[10px] text-slate-300">
            <span className="truncate">
              {language === 'vi' ? 'Đang trỏ:' : 'Pointing:'}{' '}
              <strong className="text-sky-300">{hoveredPreview.displayName}</strong>
            </span>
            <span className="font-mono text-slate-400 ml-2 shrink-0">{hoveredPreview.type}</span>
          </div>
        )}

        {/* Header */}
        <div className={`flex items-start justify-between ${isCollapsed ? '' : 'border-b border-white/10 pb-2'}`}>
          <div className="min-w-0 pr-2">
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                style={{ backgroundColor: data.color, boxShadow: `0 0 10px ${data.color}` }}
              />
              <h2 className="text-sm sm:text-[15px] font-bold text-white tracking-wide leading-snug line-clamp-3">
                {localized.displayName}
              </h2>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full border uppercase tracking-wider font-mono ${
                  isBlackHole
                    ? 'bg-orange-500/20 text-orange-400 border-orange-500/40'
                    : isPulsar
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                    : isConstellation
                    ? 'bg-amber-500/20 text-amber-300 border-amber-400/40'
                    : 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                }`}
              >
                {localized.type}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {isBlackHole
                ? t('targetHud.supermassiveSingularity')
                : isPulsar
                ? t('targetHud.neutronStar')
                : isConstellation
                ? (language === 'vi' ? data.hemisphereVi : data.hemisphereEn) || ''
                : data.type === 'moon' && data.parentPlanetId
                ? `${t('targetHud.naturalSatelliteOf')} ${getLocalizedBodyData(data.parentPlanetId)?.name || 'Planet'}`
                : data.orbitalDistanceAU > 0
                ? `${data.orbitalDistanceAU} AU (${(data.orbitalDistanceAU * 149.6).toFixed(1)}M km)`
                : t('targetHud.solarCenter')}
            </p>
          </div>

          <div className="flex items-center space-x-1 shrink-0">
            <button
              type="button"
              data-testid="save-bookmark-btn"
              aria-label={t('vip.saveView')}
              onClick={handleSaveBookmark}
              className="p-1.5 rounded-lg border bg-white/5 hover:bg-white/15 text-amber-300 border-amber-400/30 transition-all cursor-pointer"
              title={t('vip.saveView')}
            >
              {justSaved ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <BookmarkPlus className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              aria-label={t('targetHud.focusTarget')}
              onClick={handleFocus}
              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                isBlackHole
                  ? 'bg-orange-500/20 hover:bg-orange-500/40 text-orange-300 border-orange-500/40'
                  : isPulsar
                  ? 'bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-300 border-cyan-500/40'
                  : 'bg-sky-500/20 hover:bg-sky-500/40 text-sky-300 border-sky-500/30'
              }`}
              title={t('targetHud.focusTarget')}
            >
              <Crosshair className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              aria-label={
                isCollapsed
                  ? language === 'vi'
                    ? 'Mở rộng thẻ thông tin'
                    : 'Expand info card'
                  : language === 'vi'
                  ? 'Thu gọn thẻ thông tin'
                  : 'Minimize info card'
              }
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white transition-all cursor-pointer"
              title={
                isCollapsed
                  ? language === 'vi'
                    ? 'Mở rộng thẻ thông tin'
                    : 'Expand info card'
                  : language === 'vi'
                  ? 'Thu gọn thẻ thông tin'
                  : 'Minimize info card'
              }
            >
              {isCollapsed ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Live Light-Speed Telemetry Bar (Always accessible even when compact) */}
        <div
          data-testid="light-delay-readout"
          className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-sky-950/40 border border-sky-400/20 text-[11px]"
        >
          <span className="flex items-center space-x-1.5 text-slate-300">
            <Radio className="w-3.5 h-3.5 text-cyan-400" />
            <span>{t('vip.lightDelay')}:</span>
          </span>
          <span className="font-mono font-semibold text-cyan-300">{lightDelayText}</span>
        </div>

        {!isCollapsed && (
          <>
            <p className={`text-xs text-slate-300 leading-relaxed ${isConstellation ? '' : 'line-clamp-3'}`}>
              {localized.description}
            </p>

            {/* Primary Metrics Grid (Tailored for Constellations vs Planetary/Orbital Bodies) */}
            {isConstellation ? (
              <div className="grid grid-cols-2 gap-2 pt-0.5">
                <div className="flex items-start space-x-2 bg-white/5 p-2 rounded-xl border border-white/5 col-span-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-slate-400 uppercase font-mono">{t('targetHud.brightestStar')}</p>
                    <p className="text-xs font-semibold text-white leading-snug">{localized.brightestStar}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 bg-white/5 p-2 rounded-xl border border-white/5">
                  <Ruler className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-mono">{t('targetHud.skyArea')}</p>
                    <p className="text-xs font-semibold text-white">
                      {data.skyAreaDeg2} {language === 'vi' ? 'độ²' : 'deg²'} {data.skyRank ? `(#${data.skyRank}/88)` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 bg-white/5 p-2 rounded-xl border border-white/5">
                  <Orbit className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-mono">{t('targetHud.starDistance')}</p>
                    <p className="text-xs font-semibold text-white">{localized.distanceLightYears}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-2 bg-white/5 p-2 rounded-xl border border-white/5 col-span-2">
                  <Crosshair className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-slate-400 uppercase font-mono">{t('targetHud.deepSkyObjects')}</p>
                    <p className="text-xs font-semibold text-white leading-snug">{localized.deepSkyObjects}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 pt-0.5">
                <div className="flex items-center space-x-2 bg-white/5 p-2 rounded-xl border border-white/5">
                  <Ruler className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-mono">{t('targetHud.diameter')}</p>
                    <p className="text-xs font-semibold text-white">
                      {isSpacecraft && data.diameterKm < 1
                        ? `${Math.round(data.diameterKm * 1000)} m`
                        : `${data.diameterKm.toLocaleString()} km`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 bg-white/5 p-2 rounded-xl border border-white/5">
                  <Weight className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-mono">{t('targetHud.gravity')}</p>
                    <p className="text-xs font-semibold text-white">
                      {isBlackHole
                        ? t('targetHud.singularityInfinity')
                        : isPulsar
                        ? '2.0 × 10¹² m/s²'
                        : isSpacecraft
                        ? '0.00 m/s² (µg)'
                        : `${data.gravityMs2} m/s²`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 bg-white/5 p-2 rounded-xl border border-white/5">
                  <Thermometer className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-mono">{t('targetHud.meanTemp')}</p>
                    <p className="text-xs font-semibold text-white">
                      {isBlackHole ? t('targetHud.coreZeroK') : `${data.meanTemperatureC.toLocaleString()}°C`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 bg-white/5 p-2 rounded-xl border border-white/5">
                  <Orbit className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-mono">
                      {data.type === 'moon' || isSpacecraft
                        ? t('targetHud.orbitPeriod')
                        : isPulsar
                        ? t('targetHud.pulsarPlanets')
                        : t('targetHud.knownMoons')}
                    </p>
                    <p className="text-xs font-semibold text-white">
                      {data.id === 'iss'
                        ? language === 'vi'
                          ? '92,9 phút'
                          : '92.9 min'
                        : data.type === 'moon' || isSpacecraft
                        ? language === 'vi'
                          ? `${data.orbitalPeriodDays} ngày`
                          : `${data.orbitalPeriodDays}d`
                        : isBlackHole
                        ? 'N/A'
                        : isPulsar
                        ? '3 (Draugr, ...)'
                        : data.moonsCount}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Expandable Deep Astrophysics or Constellation Mythology Dossier */}
            <div className="pt-0.5">
              <button
                type="button"
                data-testid="dossier-toggle"
                onClick={() => {
                  AudioManager.getInstance().playUIClick();
                  setIsDossierOpen(!isDossierOpen);
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-medium text-sky-300 transition-colors cursor-pointer"
              >
                <span>
                  {isDossierOpen
                    ? t('vip.hideDossier')
                    : isConstellation
                    ? t('targetHud.constellationDossier')
                    : t('vip.deepDossier')}
                </span>
                {isDossierOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {isDossierOpen && (
                <div className="mt-2 p-2.5 rounded-xl bg-slate-950/65 border border-white/10 space-y-2.5 text-[11px]">
                  {isConstellation ? (
                    <>
                      <div>
                        <span className="text-amber-300 block text-[10px] font-mono uppercase mb-0.5">
                          {t('targetHud.mythologyHeading')}
                        </span>
                        <p className="text-slate-200 leading-relaxed">
                          {language === 'vi' ? data.mythologyVi : data.mythologyEn}
                        </p>
                      </div>
                      <div className="pt-1.5 border-t border-white/10">
                        <span className="text-cyan-300 block text-[10px] font-mono uppercase mb-0.5">
                          {t('targetHud.bestSeasonHeading')}
                        </span>
                        <span className="text-white font-semibold">
                          {language === 'vi' ? data.bestSeasonVi : data.bestSeasonEn}
                        </span>
                      </div>
                      {data.neighborConstellations && data.neighborConstellations.length > 0 && (
                        <div className="pt-1.5 border-t border-white/10">
                          <p className="text-[10px] text-slate-400 font-mono mb-1.5">
                            {t('targetHud.neighborConstellationsHeading')}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {data.neighborConstellations.map((cid) => {
                              const cLoc = getLocalizedBodyData(cid);
                              return (
                                <button
                                  key={cid}
                                  type="button"
                                  data-testid={`constellation-chip-${cid}`}
                                  onClick={() => {
                                    AudioManager.getInstance().playUIClick();
                                    setTargetId(cid);
                                    CameraManager.getInstance().focusConstellation(cid);
                                  }}
                                  className="px-2 py-0.5 rounded-full bg-amber-500/15 hover:bg-amber-500/30 border border-amber-400/35 text-[10px] text-amber-200 font-medium transition-colors cursor-pointer"
                                >
                                  {cLoc.name}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-slate-400 block text-[10px] font-mono">{t('vip.mass')}</span>
                          <span className="text-white font-semibold">{data.massKg}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] font-mono">{t('vip.earthGravityRatio')}</span>
                          <span data-testid="dossier-gravity-ratio" className="text-amber-300 font-mono font-bold">
                            {isBlackHole ? '∞' : `${earthGravityRatio}× g`}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] font-mono">{t('vip.dayLength')}</span>
                          <span className="text-white font-semibold">{data.dayLengthHours} h</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] font-mono">{t('vip.axialTilt')}</span>
                          <span className="text-white font-semibold">{data.axialTiltDeg}°</span>
                        </div>
                      </div>

                      {data.moons && data.moons.length > 0 && (
                        <div className="pt-1.5 border-t border-white/10">
                          <p className="text-[10px] text-slate-400 font-mono mb-1.5">{t('vip.moonsHeading')}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {data.moons.map((moonId) => {
                              const moonLoc = getLocalizedBodyData(moonId);
                              return (
                                <button
                                  key={moonId}
                                  type="button"
                                  data-testid={`moon-chip-${moonId}`}
                                  onClick={() => {
                                    AudioManager.getInstance().playUIClick();
                                    setTargetId(moonId);
                                    setCameraMode('ORBIT');
                                    CameraManager.getInstance().focusPlanet(moonId);
                                  }}
                                  className="px-2 py-0.5 rounded-full bg-sky-500/15 hover:bg-sky-500/30 border border-sky-400/30 text-[10px] text-sky-200 font-medium transition-colors cursor-pointer"
                                >
                                  {moonLoc.name}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Contextual VIP Mission Quick-Actions (Full-width stack so zero characters truncate) */}
            {data.id === 'earth' && (
              <div className="grid grid-cols-1 gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    AudioManager.getInstance().playUIClick();
                    ModeOrchestrator.getInstance().exitAllModes();
                    SimulationManager.getInstance().startScenario('earth_history');
                  }}
                  className="py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20 border border-emerald-400/40 transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-100 shrink-0" />
                  <span>{t('vip.quickEarthHistory')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    AudioManager.getInstance().playUIClick();
                    ModeOrchestrator.getInstance().exitAllModes();
                    SimulationManager.getInstance().startScenario('earth_launch');
                  }}
                  className="py-2 px-3 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-500 hover:from-sky-500 hover:to-indigo-400 text-white text-xs font-bold flex items-center justify-center space-x-2 shadow-lg shadow-sky-500/20 border border-sky-400/40 transition-all cursor-pointer"
                >
                  <Rocket className="w-3.5 h-3.5 text-sky-100 shrink-0" />
                  <span>{t('vip.quickLaunchRocket')}</span>
                </button>
                <button
                  type="button"
                  data-testid="quick-action-solar-storm"
                  onClick={() => {
                    AudioManager.getInstance().playUIClick();
                    ModeOrchestrator.getInstance().toggleSolarStorm(true);
                  }}
                  className="py-2 px-3 rounded-xl bg-gradient-to-r from-teal-600 via-emerald-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white text-xs font-bold flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20 border border-emerald-400/40 transition-all cursor-pointer"
                >
                  <Flame className="w-3.5 h-3.5 text-emerald-100 shrink-0" />
                  <span>{t('cosmic.solarStormTitle')}</span>
                </button>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    data-testid="quick-action-kessler"
                    onClick={() => {
                      AudioManager.getInstance().playUIClick();
                      ModeOrchestrator.getInstance().enterCosmicLab('kessler_leo');
                    }}
                    className="py-1.5 px-2.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/35 border border-sky-400/40 text-sky-200 text-[11px] font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
                  >
                    <Satellite className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{language === 'vi' ? 'Vệ Tinh Kessler' : 'Kessler LEO'}</span>
                  </button>
                  <button
                    type="button"
                    data-testid="quick-action-cutaway-earth"
                    onClick={() => {
                      AudioManager.getInstance().playUIClick();
                      useAppStore.getState().setCutawayBody('earth');
                      ModeOrchestrator.getInstance().enterCosmicLab('planetary_cutaway');
                    }}
                    className="py-1.5 px-2.5 rounded-xl bg-orange-500/20 hover:bg-orange-500/35 border border-orange-400/40 text-orange-200 text-[11px] font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
                  >
                    <Layers className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{language === 'vi' ? 'Giải Phẫu Lõi' : 'Interior Cutaway'}</span>
                  </button>
                </div>
              </div>
            )}

            {canLandSurface && (
              <div className="grid grid-cols-1 gap-1.5">
                <button
                  type="button"
                  data-testid="quick-action-land"
                  onClick={() => handleSurfaceLanding(data.id as 'mars' | 'moon' | 'europa' | 'titan')}
                  className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-600 via-orange-600 to-amber-500 hover:from-amber-500 hover:to-orange-400 text-white text-xs font-bold flex items-center justify-center space-x-2 shadow-lg shadow-orange-500/25 border border-amber-400/40 transition-all cursor-pointer"
                >
                  <Navigation className="w-3.5 h-3.5 text-amber-100" />
                  <span>
                    {data.id === 'mars'
                      ? t('vip.quickLandMars')
                      : data.id === 'moon'
                      ? t('vip.quickLandMoon')
                      : data.id === 'europa'
                      ? t('cosmic.landEuropaTitle')
                      : t('cosmic.landTitanTitle')}
                  </span>
                </button>
                {data.id === 'mars' && (
                  <button
                    type="button"
                    data-testid="quick-action-terraform-mars"
                    onClick={() => {
                      AudioManager.getInstance().playUIClick();
                      ModeOrchestrator.getInstance().enterCosmicLab('mars_terraform');
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20 border border-emerald-400/40 transition-all cursor-pointer"
                  >
                    <Globe2 className="w-3.5 h-3.5 text-emerald-100 shrink-0" />
                    <span>{t('cosmic.marsTerraformTitle')}</span>
                  </button>
                )}
              </div>
            )}

            {data.id === 'saturn' && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    AudioManager.getInstance().playUIClick();
                    ModeOrchestrator.getInstance().exitAllModes();
                    CinematicDirector.getInstance().enterCinemaMode('RING_SKI');
                  }}
                  className="py-2 px-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-slate-950 text-[11px] font-bold flex items-center justify-center space-x-1.5 border border-amber-300/50 transition-all cursor-pointer"
                >
                  <Film className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{t('vip.quickRingSki')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    AudioManager.getInstance().playWarpDrive();
                    ModeOrchestrator.getInstance().exitAllModes();
                    setInExoSystem(true);
                  }}
                  className="py-2 px-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-[11px] font-bold flex items-center justify-center space-x-1.5 border border-cyan-400/40 transition-all cursor-pointer"
                >
                  <Waves className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{t('vip.quickWormhole')}</span>
                </button>
              </div>
            )}

            {data.id === 'jupiter' && (
              <div className="grid grid-cols-1 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    AudioManager.getInstance().playUIClick();
                    ModeOrchestrator.getInstance().exitAllModes();
                    CinematicDirector.getInstance().enterCinemaMode('SLINGSHOT');
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-500 hover:from-indigo-500 hover:to-purple-400 text-white text-xs font-bold flex items-center justify-center space-x-2 shadow-lg shadow-purple-500/20 border border-purple-400/40 transition-all cursor-pointer"
                >
                  <Film className="w-3.5 h-3.5 text-purple-200" />
                  <span>{t('vip.quickSlingshot')}</span>
                </button>
                <button
                  type="button"
                  data-testid="quick-action-cutaway-jupiter"
                  onClick={() => {
                    AudioManager.getInstance().playUIClick();
                    useAppStore.getState().setCutawayBody('jupiter');
                    ModeOrchestrator.getInstance().enterCosmicLab('planetary_cutaway');
                  }}
                  className="w-full py-1.5 px-3 rounded-xl bg-orange-500/20 hover:bg-orange-500/35 border border-orange-400/40 text-orange-200 text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
                >
                  <Layers className="w-3.5 h-3.5 shrink-0" />
                  <span>{language === 'vi' ? 'Giải Phẫu Nội Tại Sao Mộc' : 'Jupiter Interior Cutaway'}</span>
                </button>
              </div>
            )}

            {data.id === 'sun' && (
              <div className="grid grid-cols-2 gap-1.5 pt-1">
                <button
                  type="button"
                  data-testid="quick-action-dyson"
                  onClick={() => {
                    AudioManager.getInstance().playUIClick();
                    useAppStore.getState().setDysonMode('dyson_swarm');
                    ModeOrchestrator.getInstance().enterCosmicLab('dyson_megastructure');
                  }}
                  className="py-2 px-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/35 border border-amber-400/45 text-amber-200 text-[11px] font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
                >
                  <Atom className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{language === 'vi' ? 'Cầu Dyson' : 'Dyson Swarm'}</span>
                </button>
                <button
                  type="button"
                  data-testid="quick-action-cutaway-sun"
                  onClick={() => {
                    AudioManager.getInstance().playUIClick();
                    useAppStore.getState().setCutawayBody('sun');
                    ModeOrchestrator.getInstance().enterCosmicLab('planetary_cutaway');
                  }}
                  className="py-2 px-2.5 rounded-xl bg-orange-500/20 hover:bg-orange-500/35 border border-orange-400/45 text-orange-200 text-[11px] font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
                >
                  <Layers className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{language === 'vi' ? 'Lõi Mặt Trời' : 'Solar Cutaway'}</span>
                </button>
              </div>
            )}

            {data.id === 'blackhole' && (
              <button
                type="button"
                data-testid="quick-action-relativity"
                onClick={() => {
                  AudioManager.getInstance().playUIClick();
                  useAppStore.getState().setRelativityTab('dilation_lensing');
                  ModeOrchestrator.getInstance().enterCosmicLab('relativity_lab');
                }}
                className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center justify-center space-x-2 shadow-lg shadow-violet-500/25 border border-violet-400/40 transition-all cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 text-violet-100 shrink-0" />
                <span>{t('cosmic.relativityTitle')}</span>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};
