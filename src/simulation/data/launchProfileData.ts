import { LaunchStep } from "../core/types";

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
      subtitle: "Cape Canaveral / Bãi phóng Baikonur",
      body: "Hệ thống điều khiển khởi động hệ thống đánh lửa. Bơm tuabin nhiên liệu lỏng đạt tốc độ 30.000 vòng/phút. Phi hành đoàn chuẩn bị sẵn sàng.",
      scientificFact: "Trước khi phóng, các động cơ tên lửa phải được làm lạnh sơ bộ bằng nitơ lỏng và heli để chống sốc nhiệt khi dòng oxy lỏng -183°C tràn vào buồng đốt."
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
      subtitle: "Động cơ chính kích hoạt 100% lực đẩy",
      body: "Tháp phóng được giải phóng! Hơn 34 triệu Newton lực đẩy đẩy tên lửa nặng 2.800 tấn rời mặt đất trong tiếng gầm đinh tai nhức óc.",
      scientificFact: "Sóng âm khi tên lửa rời bệ phóng có thể phá hủy chính thân tên lửa nếu không có hệ thống xả hàng ngàn tấn nước dưới chân tháp để hấp thụ xung kích âm học."
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
      title: "Tầng Đối Lưu & Xuyên Mây",
      subtitle: "Độ cao 2.5km - 12km (Troposphere)",
      body: "Tên lửa nghiêng dần sang hướng đông (Gravity Turn) để tận dụng vận tốc tự quay của Trái Đất. Phi thuyền xuyên qua các tầng mây dày đặc.",
      scientificFact: "Độ nghiêng tự nhiên do trọng lực giúp tên lửa tiết kiệm đến 15% nhiên liệu so với việc phóng thẳng đứng lên rồi mới bẻ ngang vào quỹ đạo."
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
      subtitle: "Độ cao 12km - 38km | Vận tốc siêu thanh Mach 3+",
      body: "Phi thuyền chịu tải trọng cơ học và lực cản không khí lớn nhất trong toàn bộ chuyến bay. Nón ngưng tụ hơi nước Prandtl-Glauert xuất hiện quanh thân tàu.",
      scientificFact: "Max-Q là thời điểm tỷ số giữa vận tốc bình phương và mật độ không khí đạt cực đại: q = 0.5 * ρ * v². Động cơ thường phải giảm nhẹ lực đẩy để bảo toàn cấu trúc."
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
      title: "Cắt Động Cơ Tầng 1 & Tách Tầng (MECO)",
      subtitle: "Main Engine Cut-Off & Stage Separation",
      body: "Tầng 1 hoàn thành nhiệm vụ và tách rời. Tầng 2 kích hoạt động cơ chân không, đẩy phi thuyền tiếp tục tăng tốc vào khoảng không.",
      scientificFact: "Động cơ tầng 2 có loa phun dài gấp 3 lần động cơ tầng 1 để tối ưu hoá hiệu suất giãn nở khí đốt trong môi trường chân không gần như tuyệt đối."
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
      title: "Bỏ Nón Bảo Vệ & Bầu Trời Đen Sẫm",
      subtitle: "Tầng Trung Lưu & Thượng Tầng Khí Quyển",
      body: "Nón mũi bảo vệ tải trọng tách đôi rơi xuống biển. Bầu trời chuyển từ xanh lam sang xanh tím thẫm rồi đen kịt. Các ngôi sao rực sáng vĩnh cửu bắt đầu hiện rõ.",
      scientificFact: "Ở độ cao 80km, tán xạ Rayleigh của ánh sáng mặt trời giảm xuống gần bằng 0 vì mật độ phân tử khí quyển chỉ còn 1/100.000 so với mặt biển."
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
      title: "Đường Kármán (100km) - Ranh Giới Vũ Trụ",
      subtitle: "Chào mừng đến với Không Gian Vô Tận",
      body: "Chính thức vượt qua đường ranh giới Kármán quốc tế. Bên dưới là đường cong hùng vĩ của Trái Đất xanh ngọc cùng dải viền khí quyển mỏng manh như tơ lụa.",
      scientificFact: "Đường Kármán được đặt theo nhà vật lý Theodore von Kármán: tại đây không khí quá loãng khiến lực nâng khí động học không còn tác dụng; để bay được phải đạt vận tốc quỹ đạo vũ trụ."
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
      title: "Điểm Đến Quỹ Đạo & Cắt Động Cơ Tầng 2 (SECO)",
      subtitle: "Vận tốc vũ trụ cấp 1: 28.000 km/h (7.8 km/s)",
      body: "Động cơ tầng 2 ngắt lửa hoàn toàn. Trạng thái không trọng lực (Zero-G) ập đến tức thì. Các đồ vật và giọt nước bắt đầu trôi lơ lửng trong khoang lái.",
      scientificFact: "Vận tốc vũ trụ cấp 1 (7.8 km/s) là tốc độ chính xác cần thiết để độ rơi tự do do trọng lực Trái Đất uốn cong vừa khớp với độ cong của địa cầu, giữ phi thuyền ở quỹ đạo vĩnh cửu."
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
      subtitle: "Độ cao 400km - Tầm bay của Trạm Vũ Trụ Quốc Tế (ISS)",
      body: "Phi thuyền lướt êm ái trên quỹ đạo Trái Đất. Mỗi 90 phút phi hành đoàn sẽ ngắm nhìn một bình minh và một hoàng hôn ngoạn mục.",
      scientificFact: "Hiệu ứng Tổng quan (The Overview Effect): Hầu hết các phi hành gia khi nhìn Trái Đất từ vũ trụ đều trải qua sự thay đổi nhận thức sâu sắc về sự mong manh và tính thống nhất của sự sống trên hành tinh."
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
