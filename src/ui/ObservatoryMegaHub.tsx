import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  Atom,
  Bomb,
  Bot,
  Camera,
  Clock,
  Compass,
  Eye,
  Film,
  Flame,
  Globe2,
  Layers,
  Navigation,
  Orbit,
  Play,
  Radio,
  Satellite,
  Scale,
  Search,
  ShieldAlert,
  Sparkles,
  Sun,
  Telescope,
  Waves,
  X,
} from 'lucide-react';
import { MegaHubCategory, useAppStore } from '@/stores/useAppStore';
import { AudioManager } from '@/engine/audio/AudioManager';
import { CinematicDirector } from '@/engine/camera/CinematicDirector';
import { SimulationManager } from '@/simulation/core/SimulationManager';
import { ModeOrchestrator } from '@/engine/navigation/ModeOrchestrator';
import { useTranslation } from '@/i18n';
import { normalizeViText } from '@/i18n/normalizeViText';

interface ObservatoryMegaHubProps {
  onClose: () => void;
  onLandClick: () => void;
  onCompareClick: () => void;
}

interface HubCardItem {
  id: string;
  category: Exclude<MegaHubCategory, 'all'>;
  testId?: string;
  title: string;
  subtitle: string;
  keywords: string;
  badge?: string;
  accentClass: string;
  iconBgClass: string;
  icon: React.ReactNode;
  onSelect: () => void;
}

export const ObservatoryMegaHub: React.FC<ObservatoryMegaHubProps> = ({
  onClose,
  onLandClick,
  onCompareClick,
}) => {
  const { t, language } = useTranslation();
  const isVi = language === 'vi';

  const [activeTab, setActiveTab] = useState<MegaHubCategory>('all');
  const [query, setQuery] = useState('');

  const recentExperiences = useAppStore((s) => s.recentExperiences);
  const recordRecentExperience = useAppStore((s) => s.recordRecentExperience);
  const inExoSystem = useAppStore((s) => s.inExoSystem);
  const setInExoSystem = useAppStore((s) => s.setInExoSystem);
  const isSandboxOpen = useAppStore((s) => s.isSandboxOpen);
  const setSandboxOpen = useAppStore((s) => s.setSandboxOpen);
  const isTarsOpen = useAppStore((s) => s.isTarsOpen);
  const setTarsOpen = useAppStore((s) => s.setTarsOpen);
  const startTour = useAppStore((s) => s.startTour);
  const setScaleExplorer = useAppStore((s) => s.setScaleExplorer);
  const setPhotoMode = useAppStore((s) => s.setPhotoMode);

  const audio = AudioManager.getInstance();

  const items = useMemo<HubCardItem[]>(() => {
    const launch = (id: string, fn: () => void) => {
      audio.playUIClick();
      recordRecentExperience(id);
      onClose();
      fn();
    };

    const newBadge = isVi ? 'MỚI' : 'NEW';

    return [
      // ===================== 1. PHYSICS & BLACK HOLES =====================
      {
        id: 'nbody_sandbox',
        category: 'physics',
        testId: 'nav-nbody-sandbox',
        title: t('cosmic.nbodyTitle'),
        subtitle: t('cosmic.nbodySub'),
        keywords: '3 vat the tam the trisolaris figure 8 nbody gravity roche',
        badge: newBadge,
        accentClass: 'text-amber-300',
        iconBgClass: 'bg-amber-500/20 text-amber-300',
        icon: <Orbit className="w-4 h-4" />,
        onSelect: () => launch('nbody_sandbox', () => ModeOrchestrator.getInstance().enterCosmicLab('nbody_sandbox')),
      },
      {
        id: 'relativity_lab',
        category: 'physics',
        testId: 'nav-relativity-lab',
        title: t('cosmic.relativityTitle'),
        subtitle: t('cosmic.relativitySub'),
        keywords: 'thuyet tuong doi gian no thoi gian einstein ring roi vao ho den interstellar',
        badge: newBadge,
        accentClass: 'text-violet-300',
        iconBgClass: 'bg-violet-500/20 text-violet-300',
        icon: <Eye className="w-4 h-4" />,
        onSelect: () => launch('relativity_lab', () => ModeOrchestrator.getInstance().enterCosmicLab('relativity_lab')),
      },
      {
        id: 'binary_merger',
        category: 'physics',
        testId: 'nav-binary-merger',
        title: t('cosmic.binaryMergerTitle'),
        subtitle: t('cosmic.binaryMergerSub'),
        keywords: 'hop nhat ho den song hap dan ligo gw150914 chirp',
        accentClass: 'text-cyan-300',
        iconBgClass: 'bg-cyan-500/20 text-cyan-300',
        icon: <Activity className="w-4 h-4" />,
        onSelect: () => launch('binary_merger', () => ModeOrchestrator.getInstance().enterCosmicLab('binary_merger')),
      },
      {
        id: 'wormhole',
        category: 'physics',
        title: isVi ? 'Lỗ Sâu 4D (Hành Tinh Miller)' : "4D Wormhole (Miller's Planet)",
        subtitle: isVi ? 'Vượt lỗ sâu đến đại dương sóng thần 1.2km' : 'Traverse wormhole to 1.2km tidal ocean',
        keywords: 'lo sau wormhole miller gargantua',
        accentClass: 'text-cyan-300',
        iconBgClass: 'bg-cyan-500/20 text-cyan-400',
        icon: <Waves className="w-4 h-4" />,
        onSelect: () => {
          audio.playWarpDrive();
          recordRecentExperience('wormhole');
          onClose();
          if (!inExoSystem) {
            ModeOrchestrator.getInstance().exitAllModes();
            setInExoSystem(true);
          } else {
            setInExoSystem(false);
          }
        },
      },

      // ===================== 2. SURFACES & CUTAWAY =====================
      {
        id: 'planetary_cutaway',
        category: 'surfaces',
        testId: 'nav-planetary-cutaway',
        title: t('cosmic.cutawayTitle'),
        subtitle: t('cosmic.cutawaySub'),
        keywords: 'giai phau noi tai cat lat loi trai dat mat troi sao moc europa sao neutron',
        badge: newBadge,
        accentClass: 'text-orange-300',
        iconBgClass: 'bg-orange-500/20 text-orange-300',
        icon: <Layers className="w-4 h-4" />,
        onSelect: () =>
          launch('planetary_cutaway', () => ModeOrchestrator.getInstance().enterCosmicLab('planetary_cutaway')),
      },
      {
        id: 'land_surface',
        category: 'surfaces',
        title: isVi ? 'Đổ Bộ Bề Mặt (Sao Hỏa / Mặt Trăng)' : 'Surface Landing (Mars / Moon)',
        subtitle: isVi ? 'Hạ cánh xuống hố Jezero & bãi đáp Apollo 11' : 'Touch down on Jezero crater & Apollo 11',
        keywords: 'do bo be mat sao hoa mat trang jezero apollo 11',
        accentClass: 'text-orange-300',
        iconBgClass: 'bg-orange-500/20 text-orange-400',
        icon: <Navigation className="w-4 h-4" />,
        onSelect: () => {
          onClose();
          onLandClick();
        },
      },
      {
        id: 'land_europa',
        category: 'surfaces',
        testId: 'nav-land-europa',
        title: t('cosmic.landEuropaTitle'),
        subtitle: t('cosmic.landEuropaSub'),
        keywords: 'do bo europa bang cryogeyser sao moc',
        accentClass: 'text-cyan-200',
        iconBgClass: 'bg-sky-500/20 text-cyan-200',
        icon: <Navigation className="w-4 h-4" />,
        onSelect: () => {
          audio.playWarpDrive();
          onClose();
          ModeOrchestrator.getInstance().enterSurface('europa');
        },
      },
      {
        id: 'land_titan',
        category: 'surfaces',
        testId: 'nav-land-titan',
        title: t('cosmic.landTitanTitle'),
        subtitle: t('cosmic.landTitanSub'),
        keywords: 'do bo titan metan kraken mare huygens sao tho',
        accentClass: 'text-amber-200',
        iconBgClass: 'bg-amber-500/20 text-amber-300',
        icon: <Navigation className="w-4 h-4" />,
        onSelect: () => {
          audio.playWarpDrive();
          onClose();
          ModeOrchestrator.getInstance().enterSurface('titan');
        },
      },

      // ===================== 3. PLANETS & ENGINEERING =====================
      {
        id: 'mars_terraform',
        category: 'planets',
        testId: 'nav-mars-terraform',
        title: t('cosmic.marsTerraformTitle'),
        subtitle: t('cosmic.marsTerraformSub'),
        keywords: 'dia cau hoa sao hoa mars terraforming 1000 nam dai duong',
        badge: newBadge,
        accentClass: 'text-emerald-300',
        iconBgClass: 'bg-emerald-500/20 text-emerald-300',
        icon: <Globe2 className="w-4 h-4" />,
        onSelect: () =>
          launch('mars_terraform', () => ModeOrchestrator.getInstance().enterCosmicLab('mars_terraform')),
      },
      {
        id: 'planetary_defense',
        category: 'planets',
        testId: 'nav-planetary-defense',
        title: t('cosmic.defenseTitle'),
        subtitle: t('cosmic.defenseSub'),
        keywords: 'phong thu hanh tinh dart apophis ban lech tieu hanh tinh laser',
        badge: newBadge,
        accentClass: 'text-rose-300',
        iconBgClass: 'bg-rose-500/20 text-rose-300',
        icon: <ShieldAlert className="w-4 h-4" />,
        onSelect: () =>
          launch('planetary_defense', () => ModeOrchestrator.getInstance().enterCosmicLab('planetary_defense')),
      },
      {
        id: 'dyson_megastructure',
        category: 'planets',
        testId: 'nav-dyson-megastructure',
        title: t('cosmic.dysonTitle'),
        subtitle: t('cosmic.dysonSub'),
        keywords: 'cau dyson swarm kardashev tru oneill khong gian',
        badge: newBadge,
        accentClass: 'text-yellow-300',
        iconBgClass: 'bg-yellow-500/20 text-yellow-300',
        icon: <Atom className="w-4 h-4" />,
        onSelect: () =>
          launch('dyson_megastructure', () => ModeOrchestrator.getInstance().enterCosmicLab('dyson_megastructure')),
      },
      {
        id: 'kessler_leo',
        category: 'planets',
        testId: 'nav-kessler-leo',
        title: t('cosmic.kesslerTitle'),
        subtitle: t('cosmic.kesslerSub'),
        keywords: 'hoi chung kessler ve tinh leo starlink rac vu tru iss',
        badge: newBadge,
        accentClass: 'text-sky-300',
        iconBgClass: 'bg-sky-500/20 text-sky-300',
        icon: <Satellite className="w-4 h-4" />,
        onSelect: () => launch('kessler_leo', () => ModeOrchestrator.getInstance().enterCosmicLab('kessler_leo')),
      },
      {
        id: 'solar_storm',
        category: 'planets',
        testId: 'nav-solar-storm',
        title: t('cosmic.solarStormTitle'),
        subtitle: t('cosmic.solarStormSub'),
        keywords: 'bao mat troi tu quyen cuc quang aurora cme kp',
        accentClass: 'text-emerald-300',
        iconBgClass: 'bg-emerald-500/20 text-emerald-300',
        icon: <Flame className="w-4 h-4" />,
        onSelect: () => launch('solar_storm', () => ModeOrchestrator.getInstance().toggleSolarStorm(true)),
      },
      {
        id: 'eclipse',
        category: 'planets',
        testId: 'nav-eclipse-lab',
        title: t('cosmic.eclipseTitle'),
        subtitle: t('cosmic.eclipseSub'),
        keywords: 'nhat thuc trang mau nguyet thuc nhan kim cuong nhat hoa umbra',
        accentClass: 'text-amber-300',
        iconBgClass: 'bg-amber-500/20 text-amber-300',
        icon: <Sun className="w-4 h-4" />,
        onSelect: () => launch('eclipse', () => ModeOrchestrator.getInstance().enterCosmicLab('eclipse')),
      },

      // ===================== 4. DEEP SPACE & GALAXIES =====================
      {
        id: 'trappist_exoplanets',
        category: 'deep_space',
        testId: 'nav-trappist-exoplanets',
        title: t('cosmic.trappistTitle'),
        subtitle: t('cosmic.trappistSub'),
        keywords: 'ngoai hanh tinh trappist 1 transit light curve jwst su song',
        badge: newBadge,
        accentClass: 'text-rose-200',
        iconBgClass: 'bg-rose-500/20 text-rose-300',
        icon: <Radio className="w-4 h-4" />,
        onSelect: () =>
          launch('trappist_exoplanets', () => ModeOrchestrator.getInstance().enterCosmicLab('trappist_exoplanets')),
      },
      {
        id: 'stellar_lab',
        category: 'deep_space',
        testId: 'nav-stellar-lab',
        title: t('cosmic.stellarLabTitle'),
        subtitle: t('cosmic.stellarLabSub'),
        keywords: 'tinh van cot tru sang tao m16 con cua m1 vong doi ngoi sao hr',
        accentClass: 'text-fuchsia-300',
        iconBgClass: 'bg-fuchsia-500/20 text-fuchsia-300',
        icon: <Sparkles className="w-4 h-4" />,
        onSelect: () => launch('stellar_lab', () => ModeOrchestrator.getInstance().enterCosmicLab('stellar_lab')),
      },
      {
        id: 'planetarium',
        category: 'deep_space',
        testId: 'nav-planetarium',
        title: t('cosmic.planetariumTitle'),
        subtitle: t('cosmic.planetariumSub'),
        keywords: 'dai thien van bau troi dem 360 kinh thien van mua sao bang perseids',
        accentClass: 'text-sky-300',
        iconBgClass: 'bg-sky-500/20 text-sky-300',
        icon: <Telescope className="w-4 h-4" />,
        onSelect: () => launch('planetarium', () => ModeOrchestrator.getInstance().enterCosmicLab('planetarium')),
      },
      {
        id: 'earth_history',
        category: 'deep_space',
        title: isVi ? 'Lịch Sử Trái Đất (4.54 Ga)' : 'Earth Geological Timeline',
        subtitle: isVi ? 'Hadean, Pangaea, Khủng Long, Băng Hà' : 'Hadean lava, Pangaea, Dinosaurs, Ice Age',
        keywords: 'lich su trai dat dia chat pangaea khung long bang ha',
        badge: '3D',
        accentClass: 'text-emerald-300',
        iconBgClass: 'bg-emerald-500/20 text-emerald-300',
        icon: <Globe2 className="w-4 h-4" />,
        onSelect: () =>
          launch('earth_history', () => {
            ModeOrchestrator.getInstance().exitAllModes();
            SimulationManager.getInstance().startScenario('earth_history');
          }),
      },
      {
        id: 'cosmic_history',
        category: 'deep_space',
        title: isVi ? 'Sự Kiện Vũ Trụ (Big Bang)' : 'Cosmic History & Events',
        subtitle: isVi ? 'Big Bang, Sinh Sao & Siêu Tân Tinh' : 'Big Bang, Star Birth & Supernova',
        keywords: 'su kien vu tru big bang sieu tan tinh',
        accentClass: 'text-purple-300',
        iconBgClass: 'bg-purple-500/20 text-purple-300',
        icon: <Sparkles className="w-4 h-4" />,
        onSelect: () =>
          launch('cosmic_history', () => {
            ModeOrchestrator.getInstance().exitAllModes();
            SimulationManager.getInstance().startScenario('cosmic_history');
          }),
      },

      // ===================== 5. TOOLS & CINEMA =====================
      {
        id: 'cinema_imax',
        category: 'tools',
        title: isVi ? 'Chế Độ Điện Ảnh (IMAX)' : 'Cinema Director Mode (IMAX)',
        subtitle: isVi ? 'Khung hình 2.39:1 & nhạc Kepler' : '2.39:1 anamorphic & Kepler synth',
        keywords: 'dien anh imax kepler',
        accentClass: 'text-rose-300',
        iconBgClass: 'bg-rose-500/20 text-rose-400',
        icon: <Film className="w-4 h-4" />,
        onSelect: () =>
          launch('cinema_imax', () => {
            ModeOrchestrator.getInstance().exitAllModes();
            CinematicDirector.getInstance().enterCinemaMode('AUTO');
          }),
      },
      {
        id: 'guided_tour',
        category: 'tools',
        title: isVi ? 'Tham Quan Tự Động' : 'Guided Planetary Tour',
        subtitle: isVi ? 'Hành trình bay tự động qua các thiên thể' : 'Automated cinematic voyage through space',
        keywords: 'tham quan tu dong tour',
        accentClass: 'text-amber-300',
        iconBgClass: 'bg-amber-500/20 text-amber-400',
        icon: <Play className="w-4 h-4 fill-amber-400" />,
        onSelect: () =>
          launch('guided_tour', () => {
            ModeOrchestrator.getInstance().exitAllModes();
            startTour();
          }),
      },
      {
        id: 'compare',
        category: 'tools',
        title: isVi ? 'So Sánh Kích Thước' : 'Scale Comparison',
        subtitle: isVi ? 'Đối chiếu tỷ lệ thực 1:1 giữa 2 thiên thể' : '1:1 celestial size comparison',
        keywords: 'so sanh kich thuoc ty le',
        badge: '1:1',
        accentClass: 'text-indigo-300',
        iconBgClass: 'bg-indigo-500/20 text-indigo-300',
        icon: <Scale className="w-4 h-4" />,
        onSelect: () => {
          recordRecentExperience('compare');
          onClose();
          onCompareClick();
        },
      },
      {
        id: 'scale_explorer',
        category: 'tools',
        title: isVi ? 'Thước Đo Vũ Trụ' : 'Scale Explorer',
        subtitle: '10⁻¹⁵ m – 10²⁶ m',
        keywords: 'thuoc do quy mo vu tru',
        badge: '10ⁿ',
        accentClass: 'text-sky-300',
        iconBgClass: 'bg-sky-500/20 text-sky-300',
        icon: <Compass className="w-4 h-4" />,
        onSelect: () => launch('scale_explorer', () => setScaleExplorer(true)),
      },
      {
        id: 'photo_mode',
        category: 'tools',
        title: isVi ? 'Chế Độ Chụp Ảnh' : 'Photo Mode',
        subtitle: isVi ? 'Xuất khung hình vũ trụ 4K HD' : 'Capture 4K space photography',
        keywords: 'chup anh photo mode 4k',
        badge: '4K',
        accentClass: 'text-rose-300',
        iconBgClass: 'bg-rose-500/20 text-rose-300',
        icon: <Camera className="w-4 h-4" />,
        onSelect: () => launch('photo_mode', () => setPhotoMode(true)),
      },
      {
        id: 'sandbox',
        category: 'tools',
        title: isVi ? 'Hộp Cát Thảm Họa Vũ Trụ' : 'Cosmic Sandbox Cataclysms',
        subtitle: isVi ? 'Thiên thạch đâm Trái Đất, siêu tân tinh' : 'Trigger asteroid impacts & supernova',
        keywords: 'hop cat tham hoa thien thach sieu tan tinh',
        accentClass: 'text-rose-300',
        iconBgClass: 'bg-rose-500/20 text-rose-400',
        icon: <Bomb className="w-4 h-4" />,
        onSelect: () => launch('sandbox', () => setSandboxOpen(!isSandboxOpen)),
      },
      {
        id: 'tars',
        category: 'tools',
        title: isVi ? 'Trợ Lý AI TARS Copilot' : 'AI TARS Hologram Copilot',
        subtitle: isVi ? 'Hỏi đáp thiên văn & giải thích vật lý' : 'Astrophysics Q&A & mission companion',
        keywords: 'tro ly ai tars copilot giong noi',
        accentClass: 'text-sky-300',
        iconBgClass: 'bg-sky-500/20 text-sky-400',
        icon: <Bot className="w-4 h-4" />,
        onSelect: () => launch('tars', () => setTarsOpen(!isTarsOpen)),
      },
    ];
  }, [
    audio,
    inExoSystem,
    isSandboxOpen,
    isTarsOpen,
    isVi,
    onClose,
    onCompareClick,
    onLandClick,
    recordRecentExperience,
    setInExoSystem,
    setPhotoMode,
    setSandboxOpen,
    setScaleExplorer,
    setTarsOpen,
    startTour,
    t,
  ]);

  const tabs: Array<{ id: MegaHubCategory; label: string; count: number }> = useMemo(() => {
    const counts: Record<MegaHubCategory, number> = {
      all: items.length,
      physics: 0,
      surfaces: 0,
      planets: 0,
      deep_space: 0,
      tools: 0,
    };
    for (const it of items) {
      counts[it.category]++;
    }
    return [
      { id: 'all', label: t('cosmic.tabAll'), count: counts.all },
      { id: 'physics', label: t('cosmic.tabPhysics'), count: counts.physics },
      { id: 'surfaces', label: t('cosmic.tabSurfaces'), count: counts.surfaces },
      { id: 'planets', label: t('cosmic.tabPlanets'), count: counts.planets },
      { id: 'deep_space', label: t('cosmic.tabDeepSpace'), count: counts.deep_space },
      { id: 'tools', label: t('cosmic.tabTools'), count: counts.tools },
    ];
  }, [items, t]);

  const normalizedQuery = normalizeViText(query);

  const visibleItems = useMemo(() => {
    return items.filter((item) => {
      if (activeTab !== 'all' && item.category !== activeTab) return false;
      if (!normalizedQuery) return true;
      const haystack = normalizeViText(`${item.title} ${item.subtitle} ${item.keywords}`);
      return haystack.includes(normalizedQuery);
    });
  }, [items, activeTab, normalizedQuery]);

  const recentItems = useMemo(() => {
    const byId = new Map(items.map((i) => [i.id, i]));
    return recentExperiences
      .map((id) => byId.get(id))
      .filter((x): x is HubCardItem => Boolean(x));
  }, [items, recentExperiences]);

  const dialogRef = useRef<HTMLDivElement>(null);
  const swipeStartYRef = useRef<number | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleTabTrap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusables = dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    dialog.addEventListener('keydown', handleTabTrap);
    return () => dialog.removeEventListener('keydown', handleTabTrap);
  }, []);

  return (
    <>
      {/* Dimmed Backdrop (supports tap-to-close on mobile Bottom Sheet & desktop click-away) */}
      <div
        data-testid="mega-hub-backdrop"
        onClick={onClose}
        aria-hidden="true"
        className="pointer-events-auto fixed inset-0 z-40 bg-black/45 sm:bg-black/25 backdrop-blur-[2px]"
      />

      {/* Responsive Observatory Mega-Hub (Desktop 3-Col Floating Panel / Mobile Swipeable Bottom Sheet) */}
      <div
        ref={dialogRef}
        data-testid="experiences-dropdown-menu"
        role="dialog"
        aria-modal="true"
        aria-label={t('cosmic.megaHubTitle')}
        onWheel={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        className="pointer-events-auto fixed inset-x-0 bottom-0 sm:bottom-auto sm:top-14 sm:left-1/2 sm:-translate-x-1/2 sm:w-[min(960px,calc(100vw-2rem))] max-h-[82dvh] sm:max-h-[calc(100dvh-4.75rem)] flex flex-col rounded-t-3xl sm:rounded-2xl glass-panel-glow border border-sky-400/35 shadow-2xl z-50 overflow-hidden animate-in fade-in duration-150"
      >
        {/* Mobile Bottom Sheet Swipe-to-Dismiss Handle */}
        <div
          className="sm:hidden flex justify-center pt-2.5 pb-1.5 shrink-0 cursor-grab active:cursor-grabbing"
          onTouchStart={(e) => {
            swipeStartYRef.current = e.touches[0]?.clientY ?? null;
          }}
          onTouchEnd={(e) => {
            if (swipeStartYRef.current === null) return;
            const endY = e.changedTouches[0]?.clientY ?? swipeStartYRef.current;
            if (endY - swipeStartYRef.current > 64) {
              onClose();
            }
            swipeStartYRef.current = null;
          }}
        >
          <div className="w-10 h-1 rounded-full bg-white/30" />
        </div>

        {/* Header + Inline Accent-Insensitive Search */}
        <div className="px-3.5 sm:px-4 pt-2 sm:pt-3 pb-2.5 border-b border-white/10 space-y-2.5 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center space-x-2 min-w-0">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <h2 className="text-xs sm:text-sm font-bold tracking-wide text-white truncate">
                {t('cosmic.megaHubTitle')}
              </h2>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/30 shrink-0">
                {items.length}
              </span>
            </div>

            <button
              type="button"
              data-testid="mega-hub-close-btn"
              onClick={onClose}
              aria-label={t('common.close')}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-sky-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              autoFocus
              data-testid="mega-hub-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('cosmic.megaHubSearch')}
              className="w-full pl-8 pr-8 py-1.5 rounded-xl bg-slate-950/70 border border-white/15 focus:border-sky-400/60 focus:outline-none text-xs text-white placeholder-slate-400"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label={t('common.close')}
                className="absolute right-2.5 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* 6 Category Tabs (All + 5 Thematic Groups, Horizontal Scrollable on Mobile) */}
          <div
            role="tablist"
            aria-label={t('cosmic.megaHubTitle')}
            className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5 [mask-image:linear-gradient(to_right,black_92%,transparent_100%)] sm:[mask-image:none]"
          >
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                data-testid={`mega-hub-tab-${tab.id}`}
                onClick={() => {
                  audio.playUIClick();
                  setActiveTab(tab.id);
                }}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors cursor-pointer shrink-0 whitespace-nowrap flex items-center space-x-1.5 ${
                  activeTab === tab.id
                    ? 'bg-sky-500/25 border-sky-400/60 text-sky-200'
                    : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span>{tab.label}</span>
                <span className="text-[9px] font-mono opacity-75">{tab.count}</span>
              </button>
            ))}
          </div>

          {/* Recently Opened Strip */}
          {recentItems.length > 0 && !normalizedQuery && (
            <div
              data-testid="mega-hub-recent"
              className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5"
            >
              <span className="text-[10px] font-mono text-slate-400 flex items-center space-x-1 shrink-0">
                <Clock className="w-3 h-3 text-amber-300" />
                <span>{t('cosmic.megaHubRecent')}:</span>
              </span>
              {recentItems.map((rit) => (
                <button
                  key={`recent-${rit.id}`}
                  type="button"
                  onClick={rit.onSelect}
                  className="px-2 py-0.5 rounded-full bg-amber-500/15 hover:bg-amber-500/30 border border-amber-400/35 text-[10px] text-amber-200 font-medium shrink-0 whitespace-nowrap cursor-pointer"
                >
                  {rit.title}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Scrollable 3-Column Visual Experience Grid with subtle bottom scroll fade & mobile safe-area inset */}
        <div className="relative flex-1 min-h-0 flex flex-col">
          <div className="flex-1 overflow-y-auto overscroll-contain touch-pan-y vip-scrollbar p-3 sm:p-3.5 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:pb-6">
          {visibleItems.length === 0 ? (
            <div className="py-10 text-center text-xs font-mono text-slate-400">
              {t('cosmic.megaHubEmpty')}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {visibleItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  data-testid={item.testId}
                  onClick={item.onSelect}
                  className="w-full text-left p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.11] border border-white/10 hover:border-sky-400/40 flex items-start space-x-2.5 transition-all cursor-pointer group"
                >
                  <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${item.iconBgClass}`}>
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-xs font-bold flex items-start justify-between gap-1.5 leading-snug ${item.accentClass}`}>
                      <span className="line-clamp-2">{item.title}</span>
                      {item.badge && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-500/25 border border-sky-400/35 text-sky-200 font-mono shrink-0 mt-0.5">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 leading-snug mt-0.5 line-clamp-2">
                      {item.subtitle}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
          </div>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-7 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent"
          />
        </div>
      </div>
    </>
  );
};
