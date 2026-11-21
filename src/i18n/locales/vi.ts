import { TranslationSchema } from '../types';

export const vi: TranslationSchema = {
  common: {
    ok: 'Đồng ý',
    cancel: 'Hủy',
    close: 'Đóng',
    exit: 'Thoát',
    reset: 'Đặt lại',
    search: 'Tìm kiếm',
    loading: 'Đang tải...',
    status: 'Trạng thái',
    orbit: 'QUỸ ĐẠO'
  },
  nav: {
    explore: 'Khám Phá',
    planets: 'Hành Tinh',
    constellations: 'Chòm Sao',
    blackHole: 'Hố Đen',
    galaxy: 'Thiên Hà',
    flight: 'Phi Thuyền',
    tour: 'Tham Quan',
    cinema: 'Điện Ảnh',
    land: 'Đổ Bộ',
    wormhole: 'Lỗ Sâu 4D',
    sandbox: 'Hộp Cát',
    tars: 'TARS AI',
    scale: 'Thước Đo',
    photoMode: 'Chụp Ảnh',
    searchTooltip: 'Tìm kiếm nhanh (Cmd+K)',
    hideOrbits: 'Ẩn đường quỹ đạo',
    showOrbits: 'Hiện đường quỹ đạo',
    muteAudio: 'Tắt âm thanh',
    enableAudio: 'Bật âm thanh không gian',
    settings: 'Cài đặt hệ thống',
    singularities: 'Điểm Dị Thường',
    solarSystem: 'Hệ Mặt Trời'
  },
  celestial: {
    sun: {
      name: 'Mặt Trời',
      displayName: 'Mặt Trời (Sol)',
      type: 'Ngôi Sao',
      description: 'Ngôi sao lùn vàng nằm ở trung tâm Hệ Mặt Trời, chiếm 99,86% tổng khối lượng toàn hệ thống, cung cấp ánh sáng và sự sống cho Trái Đất.'
    },
    mercury: {
      name: 'Sao Thủy',
      displayName: 'Sao Thủy (Mercury)',
      type: 'Đất Đá',
      description: 'Hành tinh nhỏ nhất và gần Mặt Trời nhất, bề mặt phủ đầy miệng hố va chạm và trải qua sự chênh lệch nhiệt độ khắc nghiệt nhất trong Hệ Mặt Trời.'
    },
    venus: {
      name: 'Sao Kim',
      displayName: 'Sao Kim (Venus)',
      type: 'Khí Quyển Độc',
      description: 'Hành tinh nóng nhất Hệ Mặt Trời do hiệu ứng nhà kính mất kiểm soát, với bầu khí quyển CO₂ dày đặc và những đám mây axít sulfuric ăn mòn.'
    },
    earth: {
      name: 'Trái Đất',
      displayName: 'Trái Đất (Terra)',
      type: 'Sự Sống',
      description: 'Hành tinh xanh cái nôi của nhân loại, nơi duy nhất trong vũ trụ được biết đến là có nước lỏng ở bề mặt, oxy tự do và sự sống đa dạng.'
    },
    moon: {
      name: 'Mặt Trăng',
      displayName: 'Mặt Trăng (Luna)',
      type: 'Vệ Tinh Tự Nhiên',
      description: 'Vệ tinh tự nhiên duy nhất của Trái Đất, nơi ghi dấu bước chân lịch sử đầu tiên của loài người trên một thiên thể ngoài không gian (Apollo 11).'
    },
    mars: {
      name: 'Sao Hỏa',
      displayName: 'Sao Hỏa (Mars)',
      type: 'Đất Đá',
      description: 'Hành tinh Đỏ với ngọn núi lửa Olympus Mons cao nhất Hệ Mặt Trời, các hẻm vực khổng lồ và dấu vết của những dòng sông cổ đại từng chảy.'
    },
    phobos: {
      name: 'Phobos',
      displayName: 'Phobos',
      type: 'Vệ Tinh',
      description: 'Mặt trăng lớn hơn nhưng dị hình của Sao Hỏa, đang dần xoắn ốc rơi xuống gần bề mặt và sẽ vỡ vụn thành vành đai bụi sau 50 triệu năm nữa.'
    },
    deimos: {
      name: 'Deimos',
      displayName: 'Deimos',
      type: 'Vệ Tinh',
      description: 'Vệ tinh nhỏ hơn và xa hơn của Sao Hỏa, có bề mặt nhẵn nhụi phủ một lớp bụi regolith dày đặc.'
    },
    jupiter: {
      name: 'Sao Mộc',
      displayName: 'Sao Mộc (Jupiter)',
      type: 'Khí Khổng Lồ',
      description: 'Vua của các hành tinh với khối lượng lớn hơn tất cả các hành tinh khác gộp lại, sở hữu cơn bão Vết Đỏ Lớn đã cuộn xoáy hàng thế kỷ.'
    },
    io: {
      name: 'Io',
      displayName: 'Io',
      type: 'Vệ Tinh Núi Lửa',
      description: 'Thiên thể hoạt động địa chất và núi lửa dữ dội nhất trong Hệ Mặt Trời, bị lực thủy triều khổng lồ của Sao Mộc liên tục co bóp làm nóng chảy lòng đất.'
    },
    europa: {
      name: 'Europa',
      displayName: 'Europa',
      type: 'Đại Dương Băng',
      description: 'Mặt trăng băng giá bao bọc một đại dương nước lỏng ngầm toàn cầu sâu hàng trăm km bên dưới, ứng viên hàng đầu cho khả năng tồn tại sự sống ngoài Trái Đất.'
    },
    ganymede: {
      name: 'Ganymede',
      displayName: 'Ganymede',
      type: 'Vệ Tinh Lớn Nhất',
      description: 'Mặt trăng lớn nhất Hệ Mặt Trời (thậm chí lớn hơn Sao Thủy), là vệ tinh duy nhất sở hữu từ trường nội sinh riêng biệt.'
    },
    callisto: {
      name: 'Callisto',
      displayName: 'Callisto',
      type: 'Bề Mặt Cổ Đại',
      description: 'Mặt trăng có mật độ miệng hố va chạm dày đặc nhất, bề mặt gần như không thay đổi suốt 4 tỷ năm qua.'
    },
    saturn: {
      name: 'Sao Thổ',
      displayName: 'Sao Thổ (Saturn)',
      type: 'Vành Đai Băng',
      description: 'Tuyệt tác của Hệ Mặt Trời với hệ thống vành đai lộng lẫy cấu thành từ hàng tỷ mảnh vụn băng nước nguyên sơ sáng rực.'
    },
    titan: {
      name: 'Titan',
      displayName: 'Titan',
      type: 'Bầu Khí Quyển Dày',
      description: 'Vệ tinh duy nhất sở hữu bầu khí quyển đậm đặc với những con sông, hồ chứa và những cơn mưa hydrocarbon methane/ethane lỏng.'
    },
    enceladus: {
      name: 'Enceladus',
      displayName: 'Enceladus',
      type: 'Mạch Phun Băng',
      description: 'Mặt trăng băng phản xạ ánh sáng mạnh nhất với các mạch nước phun ngầm siêu âm phun tinh thể băng thẳng vào quỹ đạo tạo nên Vành E của Sao Thổ.'
    },
    uranus: {
      name: 'Sao Thiên Vương',
      displayName: 'Sao Thiên Vương (Uranus)',
      type: 'Băng Khổng Lồ',
      description: 'Hành tinh băng nghiêng gần như vuông góc (97,77°), lăn tròn trên quỹ đạo quanh Mặt Trời với sắc xanh lơ huyền ảo.'
    },
    neptune: {
      name: 'Sao Hải Vương',
      displayName: 'Sao Hải Vương (Neptune)',
      type: 'Bão Siêu Thanh',
      description: 'Hành tinh xa nhất Hệ Mặt Trời, nơi sở hữu những cơn gió bão siêu thanh dữ dội nhất đạt vận tốc hơn 2.100 km/h.'
    },
    triton: {
      name: 'Triton',
      displayName: 'Triton',
      type: 'Quỹ Đạo Nghịch Hành',
      description: 'Mặt trăng lớn nhất của Sao Hải Vương bay ngược chiều tự quay của hành tinh mẹ, sở hữu những mạch phun nitơ lỏng đóng băng.'
    },
    blackhole: {
      name: 'Gargantua',
      displayName: 'Gargantua (Hố Đen Siêu Khối Lượng)',
      type: 'Điểm Dị Thường',
      description: 'Hố đen quay Kerr siêu khối lượng với đĩa bồi tụ phát quang tương đối tính cực đại, uốn cong ánh sáng và bẻ cong không - thời gian theo thuyết tương đối rộng.'
    },
    pulsar: {
      name: 'PSR B1257+12',
      displayName: 'PSR B1257+12 (Sao Neutron Pulsar)',
      type: 'Sao Neutron',
      description: 'Ngôi sao neutron quay hàng trăm vòng mỗi giây với từ trường cực mạnh, phát ra hai chùm tia bức xạ vô tuyến quét qua vũ trụ như ngọn hải đăng vĩnh cửu.'
    },
    iss: {
      name: 'Trạm Vũ Trụ ISS',
      displayName: 'Trạm Vũ Trụ Quốc Tế (ISS)',
      type: 'Trạm Không Gian',
      description: 'Phòng thí nghiệm không gian thường trực lớn nhất của nhân loại ở độ cao 420 km, quay quanh Trái Đất 15,5 vòng mỗi ngày với vận tốc 27.600 km/h.'
    },
    jwst: {
      name: 'Kính James Webb',
      displayName: 'Kính Viễn Vọng Không Gian James Webb (JWST)',
      type: 'Đài Quan Sát L2',
      description: 'Đài quan sát hồng ngoại sâu hoạt động tại điểm cân bằng hấp dẫn L2 cách Trái Đất 1,5 triệu km, trang bị cụm 18 gương lục giác mạ vàng siêu chính xác.'
    },
    voyager1: {
      name: 'Tàu Voyager 1',
      displayName: 'Tàu Thăm Dò Liên Sao Voyager 1',
      type: 'Tàu Liên Sao',
      description: 'Vật thể nhân tạo bay xa nhất trong lịch sử loài người (163 AU), đã vượt qua biên giới nhật quyển tiến vào môi trường liên sao cùng Đĩa Vàng thông điệp Trái Đất.'
    },
    voyager2: {
      name: 'Tàu Voyager 2',
      displayName: 'Tàu Thăm Dò Liên Hành Tinh Voyager 2',
      type: 'Tàu Liên Sao',
      description: 'Phi thuyền duy nhất từng ghé thăm cả bốn hành tinh khổng lồ vòng ngoài (Sao Mộc, Sao Thổ, Sao Thiên Vương, Sao Hải Vương) và hiện đang bay trong không gian liên sao.'
    },
    constellation_orion: {
      name: 'Lạp Hộ (Orion)',
      displayName: 'Chòm Sao Lạp Hộ (Orion)',
      type: 'Chòm Sao',
      description: 'Viên ngọc sáng nhất bầu trời đêm mùa Đông với ba ngôi sao Đai Lưng thẳng tắp, siêu sao xanh Rigel, siêu sao đỏ Betelgeuse và vườn ươm sao Tinh vân Orion (M42).'
    },
    constellation_ursa_major: {
      name: 'Đại Hùng (Bắc Đẩu)',
      displayName: 'Chòm Sao Đại Hùng · Bắc Đẩu (Ursa Major)',
      type: 'Chòm Sao',
      description: 'Chòm sao lớn thứ ba trên bầu trời, nổi tiếng với mảng 7 ngôi sao Bắc Đẩu Thất Tinh giúp định vị Sao Bắc Cực (Polaris) và cặp thiên hà tương tác M81 – M82.'
    },
    constellation_cassiopeia: {
      name: 'Thiên Hậu (Cassiopeia)',
      displayName: 'Chòm Sao Thiên Hậu (Cassiopeia)',
      type: 'Chòm Sao',
      description: 'Mảng 5 ngôi sao xếp hình chữ W nổi bật vắt ngang dải Ngân Hà phương Bắc, chứa tàn dư siêu tân tinh phát xạ tia X mạnh bậc nhất Cassiopeia A.'
    },
    constellation_cygnus: {
      name: 'Thiên Nga (Cygnus)',
      displayName: 'Chòm Sao Thiên Nga · Thập Tự Bắc (Cygnus)',
      type: 'Chòm Sao',
      description: 'Hình chim Thiên Nga sải cánh dọc sông Ngân Hà mùa Hè, quy tụ siêu sao trắng Deneb và nguồn hố đen sao đầu tiên được xác nhận trong lịch sử Cygnus X-1.'
    },
    constellation_scorpius: {
      name: 'Thiên Yết (Scorpius)',
      displayName: 'Chòm Sao Thiên Yết · Bọ Cạp (Scorpius)',
      type: 'Chòm Sao',
      description: 'Chòm sao Hoàng Đạo phương Nam uốn cong sát hướng tâm Dải Ngân Hà, rực sáng với siêu sao đỏ khổng lồ Antares ("Đối thủ của Sao Hỏa") và cụm sao cầu M4.'
    },
    constellation_crux: {
      name: 'Nam Thập Tự (Crux)',
      displayName: 'Chòm Sao Nam Thập Tự (Crux)',
      type: 'Chòm Sao',
      description: 'Chòm sao nhỏ nhất trong 88 chòm sao hiện đại nhưng rực rỡ bậc nhất bầu trời Nam bán cầu, đóng vai trò la bàn dẫn hướng tới Thiên cực Nam cạnh cụm sao Hộp Châu Báu.'
    },
    constellation_leo: {
      name: 'Sư Tử (Leo)',
      displayName: 'Chòm Sao Sư Tử (Leo)',
      type: 'Chòm Sao',
      description: 'Chòm sao Hoàng Đạo mùa Xuân nổi bật với mảng tứ giác thân Sư Tử và lưỡi liềm Bờm Sư Tử quanh sao xanh trắng Regulus cùng bộ ba thiên hà xoắn Leo Triplet (M65, M66).'
    },
    constellation_taurus: {
      name: 'Kim Ngưu (Taurus)',
      displayName: 'Chòm Sao Kim Ngưu & Tua Rua (Taurus)',
      type: 'Chòm Sao',
      description: 'Chòm sao Hoàng Đạo cổ xưa mang mắt cam khổng lồ Aldebaran, cụm sao Thất Nữ Tua Rua (Pleiades M45) đẹp lộng lẫy và tàn dư siêu tân tinh Tinh vân Con Cua (M1).'
    }
  },
  targetHud: {
    diameter: 'Đường Kính',
    gravity: 'Trọng Lực',
    meanTemp: 'Nhiệt Độ TB',
    knownMoons: 'Mặt Trăng',
    orbitPeriod: 'Chu Kỳ Quỹ Đạo',
    pulsarPlanets: 'Ngoại Hành Tinh',
    brightestStar: 'Sao Sáng Nhất',
    skyArea: 'Diện Tích Trời',
    starDistance: 'Khoảng Cách Sao',
    deepSkyObjects: 'Vật Thể Sâu (DSO)',
    constellationDossier: 'Review Thần Thoại & Cẩm Nang Quan Sát',
    mythologyHeading: 'Điển Tích Thần Thoại & Nhận Diện',
    bestSeasonHeading: 'Mùa Quan Sát Lý Tưởng',
    neighborConstellationsHeading: 'Chòm Sao Lân Cận (Nhấp Để Xoay Tới)',
    focusTarget: 'Khóa góc nhìn camera vào thiên thể',
    supermassiveSingularity: 'Điểm Dị Thường Siêu Khối Lượng (Không Gian Sâu)',
    neutronStar: 'Sao Neutron Phát Xạ Tương Đối Tính',
    naturalSatelliteOf: 'Vệ tinh tự nhiên của',
    solarCenter: 'Trung tâm Hệ Mặt Trời',
    singularityInfinity: '∞ (Dị Thường)',
    coreZeroK: '0 K (Lõi)'
  },
  flight: {
    title: 'HỆ THỐNG ĐIỀU KHIỂN PHI THUYỀN 6-DOF',
    sub: 'Chế độ Tự Do Bay Khám Phá Không Gian',
    velocity: 'Vận Tốc',
    boost: 'TĂNG TỐC (SHIFT)',
    precision: 'CHUẨN XÁC (CTRL)',
    brake: 'HÃM PHANH (SPACE)',
    controlsHeading: 'HƯỚNG DẪN ĐIỀU KHIỂN',
    wasdMove: 'W/S: Tiến/Lùi | A/D: Trái/Phải',
    rfVertical: 'R/F: Nâng lên/Hạ xuống',
    shiftBoost: 'Shift: Tăng tốc 300%',
    ctrlPrecision: 'Ctrl: Chế độ hạ cánh chuẩn xác',
    spaceBrake: 'Space: Hãm phanh tức thì',
    mouseLook: 'Kéo chuột: Xoay hướng nhìn 360°'
  },
  surface: {
    marsJezeroTitle: 'BỀ MẶT SAO HỎA: MIỆNG NÚI LỬA JEZERO',
    marsJezeroSub: 'Bãi đáp Xe Tự Hành Perseverance & Trực thăng Ingenuity',
    moonApolloTitle: 'MẶT TRĂNG: BÃI ĐÁP APOLLO 11',
    moonApolloSub: 'Biển Tĩnh Lặng (Mare Tranquillitatis) - 20/07/1969',
    altitude: 'Độ Cao',
    descentVelocity: 'Tốc Độ Hạ Cánh',
    surfaceTemp: 'Nhiệt Độ',
    atmosphericPressure: 'Áp Suất',
    ascendOrbit: 'CẤT CÁNH VỀ QUỸ ĐẠO',
    marsStatus: 'Đang quan sát Bão Bụi Đỏ & Hoàng Hôn Xanh Lam',
    moonStatus: 'Đang quan sát Địa Cầu Mọc (Earthrise) & Lá Cờ Mỹ',
    jezeroNotes: 'Vùng châu thổ sông cổ đại từng chứa đầy nước lỏng cách đây 3,5 tỷ năm.',
    apolloNotes: 'Dấu chân phi hành gia Neil Armstrong và Buzz Aldrin được bảo tồn vĩnh cửu trong chân không.'
  },
  millers: {
    title: 'HÀNH TINH ĐẠI DƯƠNG MILLER',
    sub: 'Hệ Ngoại Hành Tinh Bên Kia Cổng Lỗ Giun 4D',
    timeDilation: '1 GIỜ TẠI ĐÂY = 7 NĂM TRÊN TRÁI ĐẤT',
    megawaveWarning: 'CẢNH BÁO: SÓNG THẦN CAO 1.200 MÉT ĐANG TIẾP CẬN',
    exitHyperspace: 'THOÁT VỀ HỆ MẶT TRỜI'
  },
  sandbox: {
    title: 'HỘP CÁT VŨ TRỤ & HỦY DIỆT',
    desc: 'Kích hoạt các biến cố thiên văn cực đoan trên toàn hệ',
    meteorTitle: 'Va Chạm Thiên Thạch',
    meteorDesc: 'Thả tiểu hành tinh bốc cháy lao xuống Trái Đất để lại miệng hố magma sôi trào',
    tidalTitle: 'Lực Thủy Triều Xé Toạc',
    tidalDesc: 'Kéo giãn vật thể thành sợi bún (Spaghettification) rồi nuốt vào hố đen Gargantua',
    supernovaTitle: 'Nổ Siêu Tân Tinh',
    supernovaDesc: 'Ngôi sao sụp đổ giải phóng năng lượng cực đại và nở thành tinh vân rực rỡ',
    activeNotice: 'Đang mô phỏng hiện tượng...'
  },
  tars: {
    title: 'TRỢ LÝ GIỌNG NÓI AI TARS 9000',
    subtitle: 'Nhận Diện & Phản Hồi Giọng Nói 100% Native Browser Offline',
    listening: 'Đang lắng nghe khẩu lệnh của bạn...',
    idle: 'Nhấn mic và nói lệnh...',
    clickToSpeak: 'Nhấn để Bật Mic',
    honestyParam: 'Độ Trung Thực',
    humorParam: 'Độ Hài Hước',
    voiceTipsHeading: 'CÁC KHẨU LỆNH GIỌNG NÓI GỢI Ý',
    tipMars: '"Tới Sao Hỏa" hoặc "Go to Mars"',
    tipCinema: '"Bật rạp phim" hoặc "Cinema Mode"',
    tipBlackHole: '"Hố đen" hoặc "Gargantua"',
    tipMusic: '"Bật nhạc" hoặc "Play Music"'
  },
  cinema: {
    title: 'ĐẠO DIỄN ĐIỆN ẢNH IMAX 2.39:1',
    anamorphicBadge: 'PANAVISION 2.39:1 ANAMORPHIC',
    shotDrift: 'Bình Minh Quỹ Đạo (Orbital Sunrise Drift)',
    shotRingSki: 'Lướt Vành Đai Sao Thổ (Saturn Ring Skiing)',
    shotSlingshot: 'Trọng Lực Sao Mộc (Jupiter Slingshot)',
    shotAuto: 'Chuyển Cảnh Điện Ảnh Tự Động (Auto Director)',
    pressEsc: 'Bấm ESC hoặc C để thoát chế độ rạp phim'
  },
  time: {
    simDays: 'NGÀY MÔ PHỎNG',
    paused: 'TẠM DỪNG',
    speed1x: '1× Tốc độ chuẩn',
    speed10x: '10× (Tua nhanh)',
    speed100x: '100× (Quỹ đạo nhanh)',
    speed1000x: '1000× (Vận động thiên hà)',
    resetTooltip: 'Đặt lại thời gian mô phỏng về 0'
  },
  settings: {
    title: 'CÀI ĐẶT HỆ THỐNG',
    language: 'Ngôn Ngữ Giao Diện / Language',
    langVi: 'Tiếng Việt (Mặc định)',
    langEn: 'English',
    graphicsPreset: 'Cấu Hình Đồ Họa',
    gpuTier: 'Phân hạng GPU',
    orbitsToggle: 'Đường Quỹ Đạo Kepler',
    orbitsDesc: 'Vẽ quỹ đạo elip chính xác theo định luật Kepler cho 8 hành tinh',
    audioToggle: 'Âm Thanh Không Gian',
    audioDesc: 'Âm thanh vũ trụ đa chiều và nhạc nền giao hưởng Kepler',
    reducedMotionToggle: 'Giảm Rung Lắc Camera',
    reducedMotionDesc: 'Hạn chế hiệu ứng rung chấn khí động học khi bay ở tốc độ cao'
  },
  photo: {
    title: 'CHẾ ĐỘ CHỤP ẢNH VŨ TRỤ',
    resolution: 'Độ Phân Giải',
    hideHud: 'Ẩn toàn bộ giao diện điều khiển',
    takePhoto: 'Chụp Ảnh Màn Hình',
    capturing: 'Đang xử lý render...',
    saved: 'Đã lưu ảnh chụp về máy!'
  },
  scale: {
    title: 'THƯỚC ĐO QUY MÔ VŨ TRỤ (10ⁿ)',
    subtitle: 'So sánh kích thước từ con người tới toàn bộ Vũ trụ quan sát được',
    stepHuman: 'Con người (1,7 mét - 10⁰ m)',
    stepEarth: 'Trái Đất (12.742 km - 10⁷ m)',
    stepSolarSystem: 'Hệ Mặt Trời (287 tỷ km - 10¹² m)',
    stepMilkyWay: 'Ngân Hà Milky Way (100.000 năm ánh sáng - 10²¹ m)',
    stepObservableUniverse: 'Vũ Trụ Quan Sát Được (93 tỷ năm ánh sáng - 10²⁶ m)'
  },
  commandPalette: {
    placeholder: 'Tìm kiếm thiên thể, mặt trăng, hố đen, lệnh... (Esc để đóng)',
    noResults: 'Không tìm thấy thiên thể hoặc lệnh phù hợp.',
    catNavigation: 'Điều Hướng',
    catSingularity: 'Điểm Dị Thường',
    catExperience: 'Trải Nghiệm',
    catCinema: 'Điện Ảnh',
    catAudio: 'Âm Thanh',
    catView: 'Góc Nhìn',
    catGraphics: 'Đồ Họa',
    catCataclysms: 'Thảm Họa Hộp Cát',
    cmdSun: 'Bay đến Tâm Mặt Trời (Sol)',
    cmdOverview: 'Toàn cảnh Hệ Mặt Trời',
    cmdGalaxy: 'Toàn cảnh Dải Ngân Hà (Milky Way)',
    cmdBlackHole: 'Warp đến Hố Đen Gargantua',
    cmdPulsar: 'Warp đến Sao Neutron Pulsar (PSR B1257+12)',
    cmdFlight: 'Kích hoạt Phi Thuyền Tự Do (6-DOF)',
    cmdTour: 'Bắt đầu Chuyến Tham Quan Tự Động',
    cmdLandMars: 'Đổ bộ Bề mặt Sao Hỏa (Jezero Crater)',
    cmdLandMoon: 'Đổ bộ Bãi đáp Apollo 11 (Mặt Trăng)',
    cmdWormhole: 'Xuyên qua Cổng Lỗ Giun 4D (Hành tinh Miller)',
    cmdCinemaDrift: 'Rạp phim: Bình Minh Quỹ Đạo Trái Đất',
    cmdCinemaRingSki: 'Rạp phim: Lướt Băng Vành Đai Sao Thổ',
    cmdCinemaSlingshot: 'Rạp phim: Trợ Lực Trọng Lực Sao Mộc',
    cmdKeplerSynth: 'Bật/Tắt Giao Hưởng Quỹ Đạo Kepler',
    cmdOrbits: 'Bật/Tắt Đường Quỹ Đạo',
    cmdSound: 'Bật/Tắt Âm Thanh Không Gian',
    cmdUltraGraphics: 'Đồ họa: Thiết lập ULTRA'
  },
  vip: {
    starMapLabel: 'Bản Đồ Sao',
    starMapTooltip: 'Bật/Tắt Bản Đồ Chòm Sao 3D & Vành Đai Sự Sống Goldilocks',
    radarTitle: 'RADAR QUỸ ĐẠO',
    radarExpand: 'Mở Radar Quỹ Đạo',
    radarCollapse: 'Thu gọn Radar',
    lightDelay: 'Trễ Ánh Sáng',
    earthGravityRatio: 'So Với Trái Đất',
    deepDossier: 'Hồ Sơ Vật Lý Chuyên Sâu',
    hideDossier: 'Thu Gọn Hồ Sơ',
    mass: 'Khối Lượng',
    dayLength: 'Chu Kỳ Tự Quay',
    axialTilt: 'Độ Nghiêng Trục',
    moonsHeading: 'Vệ Tinh Tự Nhiên (Nhấp Để Bay Tới)',
    saveView: 'Lưu Góc Máy',
    savedViews: 'Góc Máy VIP Đã Lưu',
    noSavedViews: 'Chưa lưu góc máy nào',
    quickLandMars: 'Đổ Bộ Sao Hỏa 3D',
    quickLandMoon: 'Đổ Bộ Mặt Trăng 3D',
    quickLaunchRocket: 'Phóng Tàu Vũ Trụ 3D',
    quickEarthHistory: 'Lịch Sử Trái Đất 4.54 Ga',
    quickRingSki: 'Bay Lướt Vành Đai',
    quickWormhole: 'Vượt Lỗ Sâu 4D',
    quickSlingshot: 'Trợ Lực Trọng Trường'
  },
  cosmic: {
    sectionTitle: 'Đài Thiên Văn & Phòng Thí Nghiệm 3D Mới',
    solarStormTitle: 'Bão Mặt Trời, Từ Quyển & Cực Quang 3D',
    solarStormSub: 'Luồng CME, lá chắn từ trường & cực quang 2 cực',
    eclipseTitle: 'Nhật Thực Toàn Phần & Trăng Máu 3D',
    eclipseSub: 'Nhẫn Kim Cương, Nhật Hoa, Bóng Umbra & Trăng Máu',
    binaryMergerTitle: 'Hợp Nhất Hai Hố Đen & Sóng Hấp Dẫn',
    binaryMergerSub: 'Biến dạng không-thời gian & tiếng chirp LIGO',
    landEuropaTitle: 'Đổ Bộ Vệ Tinh Băng Europa 3D',
    landEuropaSub: 'Vỏ băng nứt, mạch phun hơi nước & Sao Mộc',
    landTitanTitle: 'Đổ Bộ Mặt Trăng Titan 3D',
    landTitanSub: 'Sương cam dày đặc, hồ metan & tàu Huygens',
    hohmannTitle: 'Hoạch Định & Phóng Tàu Quỹ Đạo Hohmann',
    hohmannSub: 'Tính Δv địa tâm/nhật tâm & Gravity Assist',
    stellarLabTitle: 'Tinh Vân 3D & Vòng Đời Ngôi Sao',
    stellarLabSub: 'Cột Trụ Sáng Tạo M16, M1 & biểu đồ H-R sống',
    planetariumTitle: 'Đài Thiên Văn 360° & Kính Thiên Văn',
    planetariumSub: 'Bầu trời theo tọa độ, Mưa Sao Băng & Zoom FOV',
    megaHubTitle: 'Trung Tâm Khám Phá Vũ Trụ',
    megaHubSearch: 'Tìm phòng thí nghiệm, hành tinh, công cụ (gõ không dấu)...',
    megaHubRecent: 'Mở gần đây',
    megaHubEmpty: 'Không tìm thấy trải nghiệm phù hợp.',
    tabAll: 'Tất Cả',
    tabPhysics: 'Vật Lý & Hố Đen',
    tabSurfaces: 'Đổ Bộ & Bề Mặt',
    tabPlanets: 'Hành Tinh & Kiến Tạo',
    tabDeepSpace: 'Thiên Hà & Vũ Trụ Sâu',
    tabTools: 'Công Cụ & Điện Ảnh',
    nbodyTitle: 'Bài Toán 3 Vật Thể & N-Body 3D',
    nbodySub: 'Tam Thể hỗn loạn, quỹ đạo số 8, Vùng Ở Được & Giới hạn Roche',
    marsTerraformTitle: 'Địa Cầu Hóa Sao Hỏa 1.000 Năm',
    marsTerraformSub: 'Tan băng cực, đại dương phương Bắc, mây & sinh quyển sống',
    cutawayTitle: 'Giải Phẫu Nội Tại Hành Tinh & Ngôi Sao',
    cutawaySub: 'Cắt lát 3D Trái Đất, Mặt Trời, Sao Mộc, Europa & Sao Neutron',
    defenseTitle: 'Phòng Thủ Hành Tinh · DART & Apophis',
    defenseSub: 'Đâm động năng, Đầu kéo hấp dẫn & Tia laser làm lệch tiểu hành tinh',
    trappistTitle: 'Hệ Ngoại Hành Tinh TRAPPIST-1 & Transit',
    trappistSub: '7 hành tinh cỡ Trái Đất, góc nhìn bề mặt 1e & đường cong sáng',
    dysonTitle: 'Cầu Dyson & Trụ Không Gian O’Neill',
    dysonSub: 'Triển khai bầy gương thu năng lượng Kardashev & trụ quay 1g',
    relativityTitle: 'Thuyết Tương Đối, Vòng Einstein & Rơi Hố Đen',
    relativitySub: 'Đồng hồ giãn nở thời gian, thấu kính hấp dẫn & góc nhìn rơi tự do',
    kesslerTitle: 'Hội Chứng Kessler & Vệ Tinh Quỹ Đạo LEO',
    kesslerSub: 'Hơn 2.000 vệ tinh LEO/MEO/GEO & va chạm rác vũ trụ dây chuyền'
  }
};
