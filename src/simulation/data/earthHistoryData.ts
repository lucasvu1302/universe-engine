import { EarthPeriod } from "../core/types";

export const EARTH_PERIODS: EarthPeriod[] = [
  {
    id: "hadean",
    name: "Hadean Eon",
    displayName: "Liên Đại Hỏa Thành (Hadean)",
    startMa: -4540,
    endMa: -4000,
    description:
      "Trái Đất sơ khai vừa hình thành từ đĩa tiền hành tinh. Bề mặt là biển dung nham sôi sục liên tục bị oanh tạc bởi thiên thạch và tiểu hành tinh trong Sự kiện Oanh tạc Muộn. Bầu khí quyển độc hại chứa đầy CO₂, methane và amoniac, không hề có oxy.",
    dominantColor: "#b91c1c", // Glowing lava red
    secondaryColor: "#1e1b4b", // Dark scorched basalt
    surfaceTextureType: "magma",
    meanTempC: 230,
    o2Percent: 0.0,
    co2Ppm: 120000,
    seaLevelM: -800,
    keyLifeforms: ["Chưa có sự sống", "Hợp chất tiền sinh học (Prebiotic molecules)"],
    events: [
      {
        id: "ev-theia-collision",
        millionYearsAgo: -4500,
        title: "Va Chạm Với Hành Tinh Theia",
        type: "impact",
        description:
          "Thiên thể Theia cỡ Sao Hỏa đâm trực diện vào Trái Đất sơ khai, thổi tung hàng tỷ tấn vật chất vào quỹ đạo, kết tụ lại tạo thành Mặt Trăng.",
        visualEffect: "asteroid_impact"
      }
    ]
  },
  {
    id: "archean-proterozoic",
    name: "Archean & Proterozoic",
    displayName: "Liên Đại Thái Cổ & Nguyên Sinh",
    startMa: -4000,
    endMa: -541,
    description:
      "Vỏ Trái Đất nguội dần, hơi nước ngưng tụ thành các đại dương nguyên thủy đầu tiên. Vi khuẩn lam (Cyanobacteria) quang hợp tạo ra oxy, dẫn đến 'Sự Kiện Oxy Hóa Vĩ Đại' làm biến đổi hoàn toàn sinh quyển và khí quyển Địa Cầu.",
    dominantColor: "#0f766e", // Iron-rich greenish turquoise ocean
    secondaryColor: "#78350f", // Early red bed minerals
    surfaceTextureType: "magma", // Transition to cratons
    meanTempC: 18,
    o2Percent: 2.5,
    co2Ppm: 8000,
    seaLevelM: -150,
    keyLifeforms: ["Vi khuẩn lam (Cyanobacteria)", "Hóa thạch Stromatolites", "Sinh vật đơn bào Eukaryote"],
    events: [
      {
        id: "ev-great-oxidation",
        millionYearsAgo: -2400,
        title: "Sự Kiện Oxy Hóa Vĩ Đại (Great Oxidation Event)",
        type: "evolution",
        description:
          "Oxy tự do lần đầu tiên tích tụ trong khí quyển và đại dương, kết tủa hàng tỷ tấn oxit sắt và đặt nền móng cho toàn bộ sự sống hô hấp hiếu khí.",
        visualEffect: "oxygenation"
      }
    ]
  },
  {
    id: "pangaea",
    name: "Pangaea Supercontinent",
    displayName: "Siêu Lục Địa Pangaea (Kỷ Permi)",
    startMa: -300,
    endMa: -200,
    description:
      "Tất cả các mảng kiến tạo hợp nhất thành một siêu lục địa khổng lồ duy nhất - Pangaea, bao quanh bởi đại dương mênh mông Panthalassa. Khí hậu nội địa cực kỳ khô cằn với các sa mạc cát đỏ rộng lớn xen kẽ rừng dương xỉ khổng lồ.",
    dominantColor: "#c2410c", // Red desert & arid craton
    secondaryColor: "#0369a1", // Giant Panthalassa Ocean
    surfaceTextureType: "pangaea",
    meanTempC: 22,
    o2Percent: 30.0,
    co2Ppm: 1800,
    seaLevelM: -50,
    keyLifeforms: ["Bò sát dạng thú (Synapsids / Dimetrodon)", "Bọ ba thùy", "Côn trùng khổng lồ Meganeura"],
    events: [
      {
        id: "ev-permian-extinction",
        millionYearsAgo: -252,
        title: "Đại Tuyệt Chủng Permi-Trias ('The Great Dying')",
        type: "extinction",
        description:
          "Núi lửa đá bẫy Siberia phun trào hàng triệu km³ dung nham và khí độc, quét sạch hơn 96% loài sinh vật biển và 70% loài trên cạn.",
        visualEffect: "volcanism"
      }
    ]
  },
  {
    id: "jurassic-cretaceous",
    name: "Jurassic & Cretaceous",
    displayName: "Kỷ Khủng Long (Jurassic & Cretaceous)",
    startMa: -200,
    endMa: -66,
    description:
      "Siêu lục địa vỡ vụn thành Laurasia và Gondwana, tạo ra các eo biển ấm và khí hậu nhiệt đới ẩm ướt trên toàn cầu. Các loài khủng long khổng lồ thống trị đất liền, dực long thống trị bầu trời và thằn lằn cổ dài Plesiosaur thống trị đại dương.",
    dominantColor: "#15803d", // Lush tropical emerald jungle
    secondaryColor: "#0284c7", // Shallow warm epicontinental seaways
    surfaceTextureType: "jurassic",
    meanTempC: 24,
    o2Percent: 28.0,
    co2Ppm: 1600,
    seaLevelM: 180,
    keyLifeforms: ["Tyrannosaurus Rex", "Brachiosaurus", "Pterosaur", "Cúc đá (Ammonites)"],
    events: [
      {
        id: "ev-chicxulub-impact",
        millionYearsAgo: -66,
        title: "Va Chạm Tiểu Hành Tinh Chicxulub",
        type: "impact",
        description:
          "Tiểu hành tinh đường kính 10km đâm vào bán đảo Yucatan (Mexico) với sức công phá 100 triệu megaton, gây mùa đông hạt nhân và kết thúc 160 triệu năm thống trị của loài khủng long.",
        visualEffect: "asteroid_impact"
      }
    ]
  },
  {
    id: "ice-age",
    name: "Quaternary Ice Age",
    displayName: "Kỷ Băng Hà Đệ Tứ (Pleistocene)",
    startMa: -2.58,
    endMa: -0.012,
    description:
      "Các chu kỳ băng hà khắc nghiệt phủ kín 30% bề mặt đất liền bằng những phiến băng dày tới 3km. Mực nước biển hạ thấp tới 120 mét, lộ ra các cây cầu đất tự nhiên như Beringia nối liền châu Á và châu Mỹ.",
    dominantColor: "#e0f2fe", // Glacial ice sheets
    secondaryColor: "#475569", // Cold tundra steppe
    surfaceTextureType: "ice_age",
    meanTempC: 8.5,
    o2Percent: 20.9,
    co2Ppm: 280,
    seaLevelM: -120,
    keyLifeforms: ["Voi Ma mút lông xoắn (Mammoth)", "Hổ răng kiếm (Smilodon)", "Người tinh khôn (Homo Sapiens)"],
    events: [
      {
        id: "ev-younger-dryas",
        millionYearsAgo: -0.012,
        title: "Băng Tan & Kỷ Younger Dryas",
        type: "geological",
        description:
          "Khí hậu ấm lên nhanh chóng kết thúc kỷ băng hà, mở ra kỷ Toàn Tân (Holocene) ổn định cho phép loài người phát triển nền nông nghiệp đầu tiên.",
        visualEffect: "ice_surge"
      }
    ]
  },
  {
    id: "modern",
    name: "Modern Anthropocene",
    displayName: "Kỷ Nhân Sinh Hiện Đại (Anthropocene)",
    startMa: -0.012,
    endMa: 0,
    description:
      "Trái Đất 'Viên Ngọc Xanh' ngày nay với sự phân bố 7 châu lục và 5 đại dương quen thuộc. Nền văn minh nhân loại với các đô thị rực rỡ ánh đèn về đêm, công nghệ vũ trụ và trách nhiệm bảo vệ sinh quyển mỏng manh duy nhất được biết đến trong vũ trụ.",
    dominantColor: "#0284c7", // Deep blue oceans
    secondaryColor: "#22c55e", // Lush forests & grasslands
    surfaceTextureType: "modern",
    meanTempC: 15.0,
    o2Percent: 20.95,
    co2Ppm: 422,
    seaLevelM: 0,
    keyLifeforms: ["8.2 Tỷ Con Người", "Đa dạng sinh học hiện đại", "Mạng lưới vệ tinh quỹ đạo"],
    events: [
      {
        id: "ev-space-age",
        millionYearsAgo: 0,
        title: "Kỷ Nguyên Không Gian & Nhận Thức Hành Tinh",
        type: "evolution",
        description:
          "Lần đầu tiên sau 4.54 tỷ năm, một giống loài sinh ra từ bụi sao trên Trái Đất chế tạo phi thuyền, bay vào không gian và nhìn lại hành tinh quê hương với nhận thức vũ trụ toàn diện."
      }
    ]
  }
];

export function getPeriodAtMa(millionYearsAgo: number): {
  current: EarthPeriod;
  next: EarthPeriod | null;
  blendFactor: number;
} {
  const ma = Math.min(Math.max(millionYearsAgo, -4540), 0);

  for (let i = 0; i < EARTH_PERIODS.length; i++) {
    const p = EARTH_PERIODS[i];
    if (ma >= p.startMa && ma <= p.endMa) {
      const span = p.endMa - p.startMa;
      const blend = span !== 0 ? (ma - p.startMa) / span : 0;
      const next = i < EARTH_PERIODS.length - 1 ? EARTH_PERIODS[i + 1] : null;
      return { current: p, next, blendFactor: blend };
    }
  }

  return {
    current: EARTH_PERIODS[EARTH_PERIODS.length - 1],
    next: null,
    blendFactor: 1.0
  };
}
