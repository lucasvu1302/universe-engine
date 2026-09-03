import React from 'react';
import { ArrowRight, ArrowLeft, X, Maximize2 } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { CameraManager } from '@/engine/camera/CameraManager';
import { AudioManager } from '@/engine/audio/AudioManager';
import * as THREE from 'three';

const SCALE_STEPS = [
  {
    level: 1,
    title: 'Earth & Human Civilization',
    distanceText: '12,742 km Diameter',
    comparison: 'If Earth were the size of a marble (1 cm), the Moon would be a peppercorn 30 cm away.',
    camPos: new THREE.Vector3(75, 10, 20),
    targetPos: new THREE.Vector3(68, 0, 0)
  },
  {
    level: 2,
    title: 'The Earth-Moon System',
    distanceText: '384,400 km Distance',
    comparison: 'All other 7 planets in the solar system could fit end-to-end between Earth and the Moon.',
    camPos: new THREE.Vector3(85, 25, 45),
    targetPos: new THREE.Vector3(68, 0, 0)
  },
  {
    level: 3,
    title: 'Inner Solar System',
    distanceText: '1.5 AU (~228 Million km)',
    comparison: 'Light from the Sun takes 8 minutes 20 seconds to reach Earth, but over 12 minutes to reach Mars.',
    camPos: new THREE.Vector3(0, 180, 220),
    targetPos: new THREE.Vector3(0, 0, 0)
  },
  {
    level: 4,
    title: 'Outer Solar System & Neptune',
    distanceText: '30.1 AU (~4.5 Billion km)',
    comparison: 'Sunlight takes over 4 hours to reach Neptune. The Voyager 1 spacecraft took 12 years to cross this distance.',
    camPos: new THREE.Vector3(0, 480, 600),
    targetPos: new THREE.Vector3(0, 0, 0)
  },
  {
    level: 5,
    title: 'Interstellar Neighborhood (Proxima Centauri)',
    distanceText: '4.24 Light Years (~40 Trillion km)',
    comparison: 'If the Sun were a grain of sand, the nearest star would be another grain of sand 4 miles away.',
    camPos: new THREE.Vector3(0, 1500, 2500),
    targetPos: new THREE.Vector3(0, 0, 0)
  },
  {
    level: 6,
    title: 'The Milky Way Galaxy',
    distanceText: '100,000 Light Years Diameter',
    comparison: 'Home to over 100 billion stars and 100 billion planets. It takes our Sun 230 million years to complete one orbit around the galactic core.',
    camPos: new THREE.Vector3(0, 500, 700),
    targetPos: new THREE.Vector3(0, 0, 0),
    isGalaxy: true
  }
];

export const ScaleExplorer: React.FC = () => {
  const isScaleOpen = useAppStore((state) => state.scaleExplorer);
  const setIsScaleOpen = useAppStore((state) => state.setScaleExplorer);
  const stepIndex = useAppStore((state) => state.scaleStep);
  const setStepIndex = useAppStore((state) => state.setScaleStep);
  const setCameraMode = useAppStore((state) => state.setCameraMode);

  if (!isScaleOpen) return null;

  const current = SCALE_STEPS[stepIndex];

  const handleStep = (newIndex: number) => {
    AudioManager.getInstance().playUIClick();
    setStepIndex(newIndex);
    const targetStep = SCALE_STEPS[newIndex];

    if (targetStep.isGalaxy) {
      setCameraMode('GALAXY');
    } else {
      setCameraMode('ORBIT');
      CameraManager.getInstance().flyTo(targetStep.camPos, targetStep.targetPos, 2.8);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md pointer-events-auto">
      <div className="glass-panel-glow w-full max-w-xl p-6 rounded-3xl border border-sky-500/40 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center space-x-2 text-sky-400">
            <Maximize2 className="w-5 h-5" />
            <span className="text-xs font-mono font-bold tracking-widest uppercase">
              COSMIC SCALE EXPLORATION (STEP {current.level} OF {SCALE_STEPS.length})
            </span>
          </div>

          <button
            onClick={() => {
              AudioManager.getInstance().playUIClick();
              setIsScaleOpen(false);
            }}
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-3">
          <div className="text-2xl font-bold text-white">{current.title}</div>
          <div className="text-sm font-mono text-sky-300 font-semibold">{current.distanceText}</div>
          <p className="text-sm text-slate-300 leading-relaxed bg-white/5 p-4 rounded-2xl border border-white/5">
            {current.comparison}
          </p>
        </div>

        {/* Level Indicator Dots */}
        <div className="flex justify-center space-x-2 pt-2">
          {SCALE_STEPS.map((s, idx) => (
            <button
              key={s.level}
              onClick={() => handleStep(idx)}
              className={`h-2 rounded-full transition-all ${
                idx === stepIndex
                  ? 'w-8 bg-sky-400 shadow-md shadow-sky-400/50'
                  : 'w-2 bg-white/20 hover:bg-white/40'
              }`}
            />
          ))}
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={() => handleStep(stepIndex - 1)}
            disabled={stepIndex === 0}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl glass-panel hover:bg-white/10 text-xs text-slate-200 disabled:opacity-30 disabled:pointer-events-none transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Smaller Scale</span>
          </button>

          <button
            onClick={() => handleStep(stepIndex + 1)}
            disabled={stepIndex === SCALE_STEPS.length - 1}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-xs font-semibold text-white shadow-lg shadow-sky-500/30 disabled:opacity-30 disabled:pointer-events-none transition-all"
          >
            <span>Expand Scale</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
