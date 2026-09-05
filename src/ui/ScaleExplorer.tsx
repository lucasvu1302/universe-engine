import React from 'react';
import { ArrowRight, ArrowLeft, X, Maximize2 } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { CameraManager } from '@/engine/camera/CameraManager';
import { AudioManager } from '@/engine/audio/AudioManager';
import { useI18nStore } from '@/i18n';
import * as THREE from 'three';

const SCALE_STEPS = [
  {
    level: 1,
    titleEn: 'Earth & Human Civilization',
    titleVi: 'Trái Đất & Nền Văn Minh Nhân Loại',
    distanceTextEn: '12,742 km Diameter',
    distanceTextVi: 'Đường kính 12.742 km',
    comparisonEn: 'If Earth were the size of a marble (1 cm), the Moon would be a peppercorn 30 cm away.',
    comparisonVi: 'Nếu Trái Đất thu nhỏ bằng một viên bi (1 cm), Mặt Trăng sẽ như hạt tiêu cách đó 30 cm.',
    camPos: new THREE.Vector3(75, 10, 20),
    targetPos: new THREE.Vector3(68, 0, 0)
  },
  {
    level: 2,
    titleEn: 'The Earth-Moon System',
    titleVi: 'Hệ Thống Trái Đất - Mặt Trăng',
    distanceTextEn: '384,400 km Distance',
    distanceTextVi: 'Khoảng cách 384.400 km',
    comparisonEn: 'All other 7 planets in the solar system could fit end-to-end between Earth and the Moon.',
    comparisonVi: 'Toàn bộ 7 hành tinh còn lại trong Hệ Mặt Trời có thể xếp nối đuôi nhau vừa khít vào khoảng cách giữa Trái Đất và Mặt Trăng.',
    camPos: new THREE.Vector3(85, 25, 45),
    targetPos: new THREE.Vector3(68, 0, 0)
  },
  {
    level: 3,
    titleEn: 'Inner Solar System',
    titleVi: 'Vùng Trong Hệ Mặt Trời',
    distanceTextEn: '1.5 AU (~228 Million km)',
    distanceTextVi: '1,5 AU (~228 Triệu km)',
    comparisonEn: 'Light from the Sun takes 8 minutes 20 seconds to reach Earth, but over 12 minutes to reach Mars.',
    comparisonVi: 'Ánh sáng Mặt Trời mất 8 phút 20 giây để tới Trái Đất, nhưng mất hơn 12 phút để chạm tới Sao Hỏa.',
    camPos: new THREE.Vector3(0, 180, 220),
    targetPos: new THREE.Vector3(0, 0, 0)
  },
  {
    level: 4,
    titleEn: 'Outer Solar System & Neptune',
    titleVi: 'Vùng Ngoài Hệ Mặt Trời & Sao Hải Vương',
    distanceTextEn: '30.1 AU (~4.5 Billion km)',
    distanceTextVi: '30,1 AU (~4,5 Tỷ km)',
    comparisonEn: 'Sunlight takes over 4 hours to reach Neptune. The Voyager 1 spacecraft took 12 years to cross this distance.',
    comparisonVi: 'Ánh sáng Mặt Trời mất hơn 4 giờ để chạm tới Sao Hải Vương. Tàu Voyager 1 mất tới 12 năm mới vượt qua khoảng cách này.',
    camPos: new THREE.Vector3(0, 480, 600),
    targetPos: new THREE.Vector3(0, 0, 0)
  },
  {
    level: 5,
    titleEn: 'Interstellar Neighborhood (Proxima Centauri)',
    titleVi: 'Láng Giềng Gian Sao (Proxima Centauri)',
    distanceTextEn: '4.24 Light Years (~40 Trillion km)',
    distanceTextVi: '4,24 Năm Ánh Sáng (~40 Nghìn Tỷ km)',
    comparisonEn: 'If the Sun were a grain of sand, the nearest star would be another grain of sand 4 miles away.',
    comparisonVi: 'Nếu Mặt Trời thu nhỏ lại như một hạt cát, ngôi sao lân cận gần nhất sẽ là một hạt cát khác nằm cách xa hơn 6,4 km.',
    camPos: new THREE.Vector3(0, 1500, 2500),
    targetPos: new THREE.Vector3(0, 0, 0)
  },
  {
    level: 6,
    titleEn: 'The Milky Way Galaxy',
    titleVi: 'Dải Ngân Hà (Milky Way Galaxy)',
    distanceTextEn: '100,000 Light Years Diameter',
    distanceTextVi: 'Đường kính 100.000 Năm Ánh Sáng',
    comparisonEn: 'Home to over 100 billion stars and 100 billion planets. It takes our Sun 230 million years to complete one orbit around the galactic core.',
    comparisonVi: 'Ngôi nhà của hơn 100 tỷ ngôi sao và hàng trăm tỷ hành tinh. Mặt Trời mất 230 triệu năm mới quay hết một vòng quanh tâm thiên hà.',
    camPos: new THREE.Vector3(0, 500, 700),
    targetPos: new THREE.Vector3(0, 0, 0),
    isGalaxy: true
  }
];

export const ScaleExplorer: React.FC = () => {
  const language = useI18nStore((state) => state.language);
  const isScaleOpen = useAppStore((state) => state.scaleExplorer);
  const setIsScaleOpen = useAppStore((state) => state.setScaleExplorer);
  const stepIndex = useAppStore((state) => state.scaleStep);
  const setStepIndex = useAppStore((state) => state.setScaleStep);
  const setCameraMode = useAppStore((state) => state.setCameraMode);

  if (!isScaleOpen) return null;

  const current = SCALE_STEPS[stepIndex];
  const title = language === 'vi' ? current.titleVi : current.titleEn;
  const distanceText = language === 'vi' ? current.distanceTextVi : current.distanceTextEn;
  const comparison = language === 'vi' ? current.comparisonVi : current.comparisonEn;

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
              {language === 'vi'
                ? `THƯỚC ĐO QUY MÔ VŨ TRỤ (BƯỚC ${current.level}/${SCALE_STEPS.length})`
                : `COSMIC SCALE EXPLORATION (STEP ${current.level} OF ${SCALE_STEPS.length})`}
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
          <div className="text-2xl font-bold text-white">{title}</div>
          <div className="text-sm font-mono text-sky-300 font-semibold">{distanceText}</div>
          <p className="text-sm text-slate-300 leading-relaxed bg-white/5 p-4 rounded-2xl border border-white/5">
            {comparison}
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
            <span>{language === 'vi' ? 'Thu Nhỏ Quy Mô' : 'Smaller Scale'}</span>
          </button>

          <button
            onClick={() => handleStep(stepIndex + 1)}
            disabled={stepIndex === SCALE_STEPS.length - 1}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-xs font-semibold text-white shadow-lg shadow-sky-500/30 disabled:opacity-30 disabled:pointer-events-none transition-all"
          >
            <span>{language === 'vi' ? 'Mở Rộng Quy Mô' : 'Expand Scale'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
