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
    descriptionEn:
      "Newly accreted from the protoplanetary disk, infant Earth is a global ocean of churning magma battered by relentless asteroid impacts during the Late Heavy Bombardment under a crushing CO₂, methane, and steam atmosphere.",
    dominantColor: "#b91c1c",
    secondaryColor: "#1e1b4b",
    surfaceTextureType: "magma",
    meanTempC: 230,
    o2Percent: 0.0,
    co2Ppm: 120000,
    seaLevelM: -800,
    keyLifeforms: ["Chưa có sự sống", "Hợp chất tiền sinh học (Prebiotic molecules)"],
    keyLifeformsEn: ["Abiotic magma ocean", "Prebiotic organic chemistry"],
    events: [
      {
        id: "ev-theia-collision",
        millionYearsAgo: -4500,
        title: "Va Chạm Với Hành Tinh Theia",
        titleEn: "Giant Impact with Protoplanet Theia",
        type: "impact",
        description:
          "Thiên thể Theia cỡ Sao Hỏa đâm trực diện vào Trái Đất sơ khai, thổi tung hàng tỷ tấn vật chất vào quỹ đạo, kết tụ lại tạo thành Mặt Trăng.",
        descriptionEn:
          "A Mars-sized protoplanet named Theia strikes infant Earth, vaporizing mantle rock into an orbital debris ring that coalesces to form the Moon.",
        visualEffect: "asteroid_impact"
      }
    ]
  },
  {
    id: "archean-proterozoic",
    name: "Archean & Paleozoic Era",
    displayName: "Liên Đại Thái Cổ & Cổ Sinh",
    startMa: -4000,
    endMa: -300,
    description:
      "Vỏ Trái Đất nguội dần, hơi nước ngưng tụ tạo thành các đại dương nguyên thủy đầu tiên. Vi khuẩn lam quang hợp giải phóng oxy dẫn đến 'Sự Kiện Oxy Hóa Vĩ Đại'. Tiếp nối là Sự Bùng Nổ Kỷ Cambri khai sinh thế giới động vật đa bào phức tạp dưới biển khơi.",
    descriptionEn:
      "Earth's basaltic crust cools and steam condenses into primordial oceans. Photosynthetic cyanobacteria trigger the Great Oxidation Event, followed by the Cambrian Explosion of complex multicellular marine life.",
    dominantColor: "#0f766e",
    secondaryColor: "#78350f",
    surfaceTextureType: "magma",
    meanTempC: 18,
    o2Percent: 12.0,
    co2Ppm: 4500,
    seaLevelM: -100,
    keyLifeforms: ["Vi khuẩn lam (Cyanobacteria)", "Hóa thạch Stromatolites", "Bọ ba thùy (Trilobites)", "Cá bọc giáp nguyên thủy"],
    keyLifeformsEn: ["Cyanobacteria", "Stromatolite reefs", "Trilobites", "Armored placoderm fish"],
    events: [
      {
        id: "ev-great-oxidation",
        millionYearsAgo: -2400,
        title: "Sự Kiện Oxy Hóa Vĩ Đại (Great Oxidation Event)",
        titleEn: "The Great Oxidation Event",
        type: "evolution",
        description:
          "Oxy tự do lần đầu tiên tích tụ trong khí quyển và đại dương, kết tủa hàng tỷ tấn oxit sắt và đặt nền móng cho toàn bộ sự sống hô hấp hiếu khí.",
        descriptionEn:
          "Free oxygen accumulates in the oceans and atmosphere for the first time, precipitating banded iron formations and enabling aerobic life.",
        visualEffect: "oxygenation"
      },
      {
        id: "ev-cambrian-explosion",
        millionYearsAgo: -541,
        title: "Bùng Nổ Kỷ Cambri (Cambrian Explosion)",
        titleEn: "The Cambrian Explosion",
        type: "evolution",
        description:
          "Hầu hết các ngành động vật chính lần đầu tiên xuất hiện trong hồ sơ hóa thạch chỉ trong khoảng vài chục triệu năm.",
        descriptionEn:
          "Nearly all major animal phyla rapidly diversify in the fossil record within a span of tens of millions of years.",
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
    descriptionEn:
      "Continental plates assemble into a single vast supercontinent—Pangaea—ringed by the global Panthalassic Ocean, featuring arid red-sand continental interiors and oxygen-rich coal swamps.",
    dominantColor: "#c2410c",
    secondaryColor: "#0369a1",
    surfaceTextureType: "pangaea",
    meanTempC: 22,
    o2Percent: 30.0,
    co2Ppm: 1800,
    seaLevelM: -50,
    keyLifeforms: ["Bò sát dạng thú (Synapsids / Dimetrodon)", "Bọ ba thùy", "Côn trùng khổng lồ Meganeura"],
    keyLifeformsEn: ["Synapsids (Dimetrodon)", "Late Trilobites", "Giant Meganeura dragonflies"],
    events: [
      {
        id: "ev-permian-extinction",
        millionYearsAgo: -252,
        title: "Đại Tuyệt Chủng Permi-Trias ('The Great Dying')",
        titleEn: "Permian-Triassic Mass Extinction ('The Great Dying')",
        type: "extinction",
        description:
          "Núi lửa đá bẫy Siberia phun trào hàng triệu km³ dung nham và khí độc, quét sạch hơn 96% loài sinh vật biển và 70% loài trên cạn.",
        descriptionEn:
          "Massive Siberian Traps flood-basalt eruptions trigger runaway greenhouse warming, wiping out 96% of marine species and 70% of terrestrial vertebrates.",
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
    descriptionEn:
      "Pangaea rifts into Laurasia and Gondwana, opening warm shallow seaways across a lush greenhouse planet ruled by dinosaurs on land, pterosaurs aloft, and plesiosaurs in the seas.",
    dominantColor: "#15803d",
    secondaryColor: "#0284c7",
    surfaceTextureType: "jurassic",
    meanTempC: 24,
    o2Percent: 28.0,
    co2Ppm: 1600,
    seaLevelM: 180,
    keyLifeforms: ["Tyrannosaurus Rex", "Brachiosaurus", "Pterosaur", "Cúc đá (Ammonites)"],
    keyLifeformsEn: ["Tyrannosaurus rex", "Brachiosaurus", "Pterosaurs", "Ammonites"],
    events: [
      {
        id: "ev-chicxulub-impact",
        millionYearsAgo: -66,
        title: "Va Chạm Tiểu Hành Tinh Chicxulub",
        titleEn: "Chicxulub Asteroid Impact (K-Pg Boundary)",
        type: "impact",
        description:
          "Tiểu hành tinh đường kính 10km đâm vào bán đảo Yucatan (Mexico) với sức công phá 100 triệu megaton, gây mùa đông hạt nhân và kết thúc 160 triệu năm thống trị của loài khủng long.",
        descriptionEn:
          "A 10 km asteroid slams into the Yucatán Peninsula with the energy of 100 trillion tons of TNT, plunging Earth into impact winter and ending non-avian dinosaurs.",
        visualEffect: "asteroid_impact"
      }
    ]
  },
  {
    id: "ice-age",
    name: "Cenozoic Era & Quaternary Ice Age",
    displayName: "Kỷ Tân Sinh & Băng Hà (Cenozoic & Ice Age)",
    startMa: -66,
    endMa: -0.012,
    description:
      "Sau sự tuyệt chủng của khủng long, các loài thú có vú và chim tiến hóa bùng nổ, các lục địa trôi dạt về vị trí hiện đại. Trái Đất bước vào các chu kỳ Băng Hà Đệ Tứ khắc nghiệt với những phiến băng dày tới 3km phủ kín các cực và bán cầu bắc.",
    descriptionEn:
      "Mammals and birds radiate as continents drift toward modern positions. Earth enters Quaternary glacial cycles with 3 km-thick ice sheets blanketing North America and Eurasia.",
    dominantColor: "#e0f2fe",
    secondaryColor: "#475569",
    surfaceTextureType: "ice_age",
    meanTempC: 10.0,
    o2Percent: 21.0,
    co2Ppm: 320,
    seaLevelM: -100,
    keyLifeforms: ["Thú có vú sơ khai", "Voi Ma mút lông xoắn (Mammoth)", "Hổ răng kiếm (Smilodon)", "Người tinh khôn (Homo Sapiens)"],
    keyLifeformsEn: ["Early mammals", "Woolly Mammoth", "Smilodon saber-tooth", "Homo sapiens"],
    events: [
      {
        id: "ev-younger-dryas",
        millionYearsAgo: -0.012,
        title: "Băng Tan & Kỷ Younger Dryas",
        titleEn: "Deglaciation & Holocene Dawn",
        type: "geological",
        description:
          "Khí hậu ấm lên nhanh chóng kết thúc kỷ băng hà, mở ra kỷ Toàn Tân (Holocene) ổn định cho phép loài người phát triển nền nông nghiệp đầu tiên.",
        descriptionEn:
          "Rapid post-glacial warming ushers in the stable Holocene interglacial epoch, enabling human agriculture and permanent settlements.",
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
    descriptionEn:
      "Present-day 'Blue Marble' Earth with seven continents, five oceans, glowing nocturnal city networks, orbital spacecraft, and humanity's stewardship of the only known living biosphere.",
    dominantColor: "#0284c7",
    secondaryColor: "#22c55e",
    surfaceTextureType: "modern",
    meanTempC: 15.0,
    o2Percent: 20.95,
    co2Ppm: 422,
    seaLevelM: 0,
    keyLifeforms: ["8.2 Tỷ Con Người", "Đa dạng sinh học hiện đại", "Mạng lưới vệ tinh quỹ đạo"],
    keyLifeformsEn: ["8.2 Billion Humans", "Modern global biodiversity", "Orbital satellite constellation"],
    events: [
      {
        id: "ev-space-age",
        millionYearsAgo: 0,
        title: "Kỷ Nguyên Không Gian & Nhận Thức Hành Tinh",
        titleEn: "The Space Age & Planetary Awareness",
        type: "evolution",
        description:
          "Lần đầu tiên sau 4.54 tỷ năm, một giống loài sinh ra từ bụi sao trên Trái Đất chế tạo phi thuyền, bay vào không gian và nhìn lại hành tinh quê hương với nhận thức vũ trụ toàn diện.",
        descriptionEn:
          "For the first time in 4.54 billion years, a species born of stardust launches spacecraft beyond Earth and gazes back upon its home world.",
      }
    ]
  }
];

export function getEpochStageAtMa(millionYearsAgo: number): number {
  const ma = Math.min(Math.max(millionYearsAgo, -4540), 0);

  if (ma <= -4540) return 0.0;
  if (ma >= 0) return 5.0;

  if (ma < -4000) {
    return 0.0 + ((ma - (-4540)) / (-4000 - (-4540))) * 1.0;
  }
  if (ma < -300) {
    return 1.0 + ((ma - (-4000)) / (-300 - (-4000))) * 1.0;
  }
  if (ma < -200) {
    return 2.0 + ((ma - (-300)) / (-200 - (-300))) * 1.0;
  }
  if (ma < -66) {
    return 3.0 + ((ma - (-200)) / (-66 - (-200))) * 0.5;
  }
  if (ma < -2.58) {
    return 3.5 + ((ma - (-66)) / (-2.58 - (-66))) * 0.5;
  }
  return 4.0 + ((ma - (-2.58)) / (0 - (-2.58))) * 1.0;
}

export function getPeriodAtMa(millionYearsAgo: number): {
  current: EarthPeriod;
  next: EarthPeriod | null;
  blendFactor: number;
} {
  const ma = Math.min(Math.max(millionYearsAgo, -4540), 0);

  for (let i = 0; i < EARTH_PERIODS.length; i++) {
    const p = EARTH_PERIODS[i];
    const isLast = i === EARTH_PERIODS.length - 1;
    if (ma >= p.startMa && (isLast ? ma <= p.endMa : ma < p.endMa)) {
      const span = p.endMa - p.startMa;
      const blend = span !== 0 ? (ma - p.startMa) / span : 0;
      const next = !isLast ? EARTH_PERIODS[i + 1] : null;
      return { current: p, next, blendFactor: Math.min(Math.max(blend, 0), 1) };
    }
  }

  const last = EARTH_PERIODS[EARTH_PERIODS.length - 1];
  return {
    current: last,
    next: null,
    blendFactor: 1.0
  };
}
