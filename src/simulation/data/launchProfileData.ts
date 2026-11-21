import { LaunchPhaseType, LaunchStep } from "../core/types";

export const LAUNCH_PHASE_LABELS: Record<LaunchPhaseType, { vi: string; en: string }> = {
  PRE_LAUNCH: { vi: "CHUẨN BỊ", en: "PRE-LAUNCH" },
  COUNTDOWN: { vi: "ĐẾM NGƯỢC", en: "COUNTDOWN" },
  ENGINE_IGNITION: { vi: "ĐÁNH LỬA", en: "IGNITION" },
  LIFTOFF: { vi: "RỜI BỆ PHÓNG", en: "LIFTOFF" },
  LOW_ATMOSPHERE: { vi: "TẦNG ĐỐI LƯU", en: "TROPOSPHERE" },
  MAX_Q: { vi: "ÁP LỰC MAX-Q", en: "MAX-Q" },
  STAGE_SEP: { vi: "TÁCH TẦNG", en: "STAGE SEP" },
  HIGH_ATMOSPHERE: { vi: "THƯỢNG KHÍ QUYỂN", en: "MESOSPHERE" },
  KARMAN_LINE: { vi: "ĐƯỜNG KÁRMÁN", en: "KÁRMÁN LINE" },
  ORBIT_INSERTION: { vi: "CHÈN QUỸ ĐẠO", en: "ORBIT INSERTION" },
  EARTH_ORBIT: { vi: "QUỸ ĐẠO LEO", en: "LEO ORBIT" }
};

export const LAUNCH_STEPS: LaunchStep[] = [
  {
    id: "step-countdown",
    phase: "COUNTDOWN",
    startTime: 0,
    duration: 10,
    altitudeKm: [0, 0],
    velocityKms: [0, 0],
    accelerationG: [1.0, 1.0],
    cameraShake: 0.05,
    vibration: 0.1,
    narration: {
      title: "Đếm Ngược Phóng (T-10s)",
      subtitle: "Tổ hợp Phóng 39A — Cape Canaveral",
      body: "Hệ thống điều khiển tự động kích hoạt trình tự đánh lửa. Bơm tuabin nhiên liệu lỏng đạt 30.000 vòng/phút, xả màn sương nước khử chấn âm dưới rãnh thoát lửa.",
      scientificFact: "Trước khi phóng, động cơ được làm lạnh sơ bộ bằng nitơ và oxy lỏng ở -183°C để chống sốc nhiệt khi dòng nhiên liệu siêu lạnh tràn vào buồng đốt."
    },
    narrationEn: {
      title: "Launch Countdown (T-10s)",
      subtitle: "Launch Complex 39A — Cape Canaveral",
      body: "Autonomous flight computers initiate ignition sequence. Liquid-propellant turbopumps spin up to 30,000 RPM as the sound-suppression water deluge floods the flame trench.",
      scientificFact: "Rocket engines are thermally conditioned ('chilldown') with cryogenic liquid oxygen at -183°C prior to ignition to prevent thermal shock inside the turbopumps."
    }
  },
  {
    id: "step-liftoff",
    phase: "LIFTOFF",
    startTime: 10,
    duration: 20,
    altitudeKm: [0, 2.5],
    velocityKms: [0, 0.35],
    accelerationG: [1.2, 1.8],
    cameraShake: 0.6,
    vibration: 0.8,
    narration: {
      title: "Rời Bệ Phóng (Liftoff!)",
      subtitle: "Cụm 9 động cơ Merlin 1D đạt 100% lực đẩy",
      body: "Ngàm giữ bệ phóng mở khóa! Hơn 7,6 triệu Newton lực đẩy nâng tên lửa rời tháp phóng giữa cột hơi nước khổng lồ cuồn cuộn hai bên rãnh dẫn lửa.",
      scientificFact: "Sóng xung kích âm học trên 180 dB khi rời bệ đủ sức làm hỏng cấu trúc tên lửa nếu không có hàng trăm nghìn lít nước hấp thụ năng lượng âm thanh."
    },
    narrationEn: {
      title: "Liftoff! Tower Cleared",
      subtitle: "9 Merlin 1D Engines at 100% Rated Thrust",
      body: "Hold-down clamps release! Over 7.6 meganewtons of thrust lift the vehicle clear of the launch tower amid roaring twin flumes of vaporized deluge steam.",
      scientificFact: "Acoustic shockwaves exceeding 180 dB at liftoff could damage the vehicle's structure without hundreds of thousands of liters of water absorbing the sound energy."
    }
  },
  {
    id: "step-low-atmosphere",
    phase: "LOW_ATMOSPHERE",
    startTime: 30,
    duration: 35,
    altitudeKm: [2.5, 12],
    velocityKms: [0.35, 1.1],
    accelerationG: [1.8, 2.4],
    cameraShake: 0.5,
    vibration: 0.6,
    narration: {
      title: "Tầng Đối Lưu & Nghiêng Quỹ Đạo",
      subtitle: "Độ cao 2,5 km - 12 km (Troposphere)",
      body: "Tên lửa bắt đầu nghiêng dần về phía đông (Gravity Turn) trên Đại Tây Dương để tận dụng vận tốc tự quay của Trái Đất và bẻ quỹ đạo song song mặt đất.",
      scientificFact: "Đường bay nghiêng theo trọng lực giúp tiết kiệm tới 15% nhiên liệu so với việc bay thẳng đứng lên không gian rồi mới đổi hướng ngang."
    },
    narrationEn: {
      title: "Troposphere & Gravity Turn",
      subtitle: "Altitude 2.5 km - 12 km (Pitch Program)",
      body: "The vehicle pitches eastward over the Atlantic Ocean in a gravity turn, harnessing Earth's rotational velocity while shaping an efficient horizontal ascent arc.",
      scientificFact: "A gravity-assisted pitch trajectory saves up to 15% propellant compared to climbing vertically and performing a sharp horizontal burn in vacuum."
    }
  },
  {
    id: "step-max-q",
    phase: "MAX_Q",
    startTime: 65,
    duration: 35,
    altitudeKm: [12, 38],
    velocityKms: [1.1, 2.1],
    accelerationG: [2.4, 3.2],
    cameraShake: 0.85,
    vibration: 0.95,
    narration: {
      title: "Max-Q: Áp Lực Động Cực Đại",
      subtitle: "Độ cao 12 km - 38 km | Vượt ngưỡng siêu thanh Mach 3+",
      body: "Khung thân tên lửa chịu ứng suất khí động học lớn nhất chuyến bay. Động cơ tiết lưu ngắn hạn trước khi tăng tốc tối đa lên tầng bình lưu.",
      scientificFact: "Áp suất động lực học q = ½ρv² đạt đỉnh khi tích giữa mật độ không khí giảm dần và bình phương vận tốc tăng nhanh chạm ngưỡng cực đại."
    },
    narrationEn: {
      title: "Max-Q: Peak Dynamic Pressure",
      subtitle: "Altitude 12 km - 38 km | Supersonic Mach 3+",
      body: "The airframe experiences peak aerodynamic stress. Engines briefly throttle back through the transonic-supersonic regime before throttling back up to full power.",
      scientificFact: "Dynamic pressure q = ½ρv² peaks where rapidly rising velocity squared meets exponentially thinning atmospheric density."
    }
  },
  {
    id: "step-stage-sep",
    phase: "STAGE_SEP",
    startTime: 100,
    duration: 40,
    altitudeKm: [38, 75],
    velocityKms: [2.1, 3.4],
    accelerationG: [3.5, 0.2],
    cameraShake: 0.3,
    vibration: 0.2,
    stageSeparated: true,
    narration: {
      title: "Ngắt Động Cơ Tầng 1 & Tách Tầng (MECO)",
      subtitle: "Main Engine Cut-Off & Stage Separation",
      body: "Chín động cơ tầng 1 tắt lửa và tách rời để quay về hạ cánh. Động cơ Merlin chân không (MVac) ở tầng 2 bùng cháy rực sáng giữa không trung loãng.",
      scientificFact: "Loa phun hợp kim niobi của động cơ tầng 2 mở rộng gấp 3 lần tầng 1 để tối ưu tỷ số giãn nở khí xả trong môi trường chân không."
    },
    narrationEn: {
      title: "MECO & Stage Separation",
      subtitle: "Main Engine Cut-Off & MVac Ignition",
      body: "All nine first-stage engines shut down and the booster separates cleanly. Seconds later, the second-stage Merlin Vacuum engine ignites its glowing niobium nozzle.",
      scientificFact: "The Vacuum Merlin's radiatively cooled niobium nozzle bell is over three times wider to maximize exhaust expansion efficiency in near-vacuum."
    }
  },
  {
    id: "step-high-atmosphere",
    phase: "HIGH_ATMOSPHERE",
    startTime: 140,
    duration: 40,
    altitudeKm: [75, 100],
    velocityKms: [3.4, 4.8],
    accelerationG: [2.0, 2.8],
    cameraShake: 0.2,
    vibration: 0.15,
    fairingJettisoned: true,
    narration: {
      title: "Thượng Tầng Khí Quyển & Bầu Trời Đầy Sao",
      subtitle: "Độ cao 75 km - 100 km (Mesopause)",
      body: "Bầu trời chuyển hẳn từ chàm sẫm sang màn đêm vũ trụ sâu thẳm. Muôn vàn vì sao hiện rõ phía trên trong khi đường cong xanh thẳm của Trái Đất mở rộng bên dưới.",
      scientificFact: "Ở độ cao trên 80 km, mật độ phân tử khí chỉ còn khoảng 1/100.000 mặt biển khiến tán xạ Rayleigh biến mất trên bầu trời phía đỉnh đầu."
    },
    narrationEn: {
      title: "Upper Mesosphere & Starfield",
      subtitle: "Altitude 75 km - 100 km (Transition to Space)",
      body: "Rayleigh sky glow fades from deep indigo to the velvet black of space, unveiling thousands of stars above as Earth's azure curvature stretches below.",
      scientificFact: "Above 80 km, air density drops below 1/100,000th of sea level, eliminating overhead Rayleigh scattering even in direct sunlight."
    }
  },
  {
    id: "step-karman-line",
    phase: "KARMAN_LINE",
    startTime: 180,
    duration: 45,
    altitudeKm: [100, 160],
    velocityKms: [4.8, 6.2],
    accelerationG: [2.8, 3.8],
    cameraShake: 0.1,
    vibration: 0.08,
    narration: {
      title: "Vượt Đường Kármán (100 km) — Chạm Ngưỡng Vũ Trụ",
      subtitle: "Ranh giới Không gian Quốc tế",
      body: "Tàu chính thức vượt qua cột mốc 100 km vào không gian vũ trụ. Qua khung kính vòm Crew Dragon, dải khí quyển mỏng xanh ngọc ôm lấy đại dương phía dưới.",
      scientificFact: "Đường Kármán đánh dấu độ cao nơi không khí quá loãng cho cánh khí động học; một phương tiện phải bay nhanh hơn vận tốc quỹ đạo mới duy trì được độ cao."
    },
    narrationEn: {
      title: "Crossing the Kármán Line (100 km)",
      subtitle: "Official Boundary of Outer Space",
      body: "The spacecraft crosses 100 km into outer space. Through the panoramic canopy, Earth's paper-thin sapphire atmospheric limb hugs the rolling oceans below.",
      scientificFact: "Named after physicist Theodore von Kármán, 100 km marks the altitude where aerodynamic lift requires speeds exceeding orbital velocity."
    }
  },
  {
    id: "step-orbit-insertion",
    phase: "ORBIT_INSERTION",
    startTime: 225,
    duration: 55,
    altitudeKm: [160, 240],
    velocityKms: [6.2, 7.8],
    accelerationG: [3.8, 0.0],
    cameraShake: 0.05,
    vibration: 0.05,
    narration: {
      title: "Chèn Quỹ Đạo & Ngắt Động Cơ Tầng 2 (SECO)",
      subtitle: "Đạt vận tốc vũ trụ cấp 1: 28.000 km/h (7,8 km/s)",
      body: "Động cơ tầng 2 hoàn tất pha đốt cuối và ngắt lửa. Phi hành đoàn bước vào trạng thái vi trọng lực hoàn toàn khi con tàu rơi tự do vĩnh cửu quanh địa cầu.",
      scientificFact: "Ở 7,8 km/s, quỹ đạo rơi tự do của tàu uốn cong khớp hoàn toàn với độ cong bề mặt Trái Đất, tạo nên chuyển động quỹ đạo ổn định."
    },
    narrationEn: {
      title: "Orbit Insertion & SECO",
      subtitle: "First Cosmic Velocity: 28,000 km/h (7.8 km/s)",
      body: "Second Engine Cut-Off confirmed! Microgravity sets in instantaneously as the spacecraft achieves a stable orbital free-fall around Earth.",
      scientificFact: "At 7.8 km/s, the spacecraft's downward free-fall arc matches Earth's spherical curvature, keeping it in perpetual orbit without thrust."
    }
  },
  {
    id: "step-earth-orbit",
    phase: "EARTH_ORBIT",
    startTime: 280,
    duration: 80,
    altitudeKm: [240, 400],
    velocityKms: [7.8, 7.8],
    accelerationG: [0.0, 0.0],
    cameraShake: 0.0,
    vibration: 0.0,
    narration: {
      title: "Quỹ Đạo Trái Đất Tầm Thấp (LEO)",
      subtitle: "Độ cao 240 - 400 km — Hành lang Trạm ISS",
      body: "Tàu lướt êm trong chân không tuyệt đối phía trên các dải mây đại dương. Cứ mỗi 90 phút, phi hành đoàn lại chứng kiến một bình minh và hoàng hôn ngoài vũ trụ.",
      scientificFact: "Hiệu ứng Tổng quan (Overview Effect) mô tả cảm xúc choáng ngợp của các phi hành gia khi tận mắt nhìn thấy Trái Đất mong manh không biên giới giữa khoảng không đen thẳm."
    },
    narrationEn: {
      title: "Low Earth Orbit (LEO)",
      subtitle: "Altitude 240 - 400 km — ISS Orbital Corridor",
      body: "Cruising silently above sunlit cloud decks and nocturnal city lights. Every 90 minutes, the crew witnesses an orbital sunrise and sunset across the limb.",
      scientificFact: "The Overview Effect describes the profound cognitive shift astronauts experience upon seeing Earth suspended as a fragile, borderless oasis in space."
    }
  }
];

export function getLaunchStepAtTime(seconds: number): LaunchStep {
  const step = LAUNCH_STEPS.find(
    (s) => seconds >= s.startTime && seconds < s.startTime + s.duration
  );
  if (step) return step;
  if (seconds >= LAUNCH_STEPS[LAUNCH_STEPS.length - 1].startTime) {
    return LAUNCH_STEPS[LAUNCH_STEPS.length - 1];
  }
  return LAUNCH_STEPS[0];
}
