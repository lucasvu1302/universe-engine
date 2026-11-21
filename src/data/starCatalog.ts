import * as THREE from 'three';

export interface NamedStarSpec {
  ra: number;
  dec: number;
  color: string;
}

export interface StarCalloutSpec {
  ra: number;
  dec: number;
  dRa: number;
  dDec: number;
  labelVi: string;
  labelEn: string;
  accent: string;
}

export interface ConstellationSpec {
  id: string;
  labelVi: string;
  labelEn: string;
  raHours: number;
  decDeg: number;
  pairs: ReadonlyArray<readonly [[number, number], [number, number]]>;
  featuredStars: ReadonlyArray<NamedStarSpec>;
  callouts: ReadonlyArray<StarCalloutSpec>;
}

export interface BrightNavStar {
  id: string;
  nameVi: string;
  nameEn: string;
  raHours: number;
  decDeg: number;
  mag: number;
  color: string;
}

export const CONSTELLATION_SPECS: ReadonlyArray<ConstellationSpec> = [
  {
    id: 'constellation_orion',
    labelVi: '✦ LẠP HỘ · ORION',
    labelEn: '✦ ORION · THE HUNTER',
    raHours: 5.58,
    decDeg: -1.2,
    pairs: [
      [[5.92, 7.41], [5.59, 9.93]],
      [[5.59, 9.93], [5.42, 6.35]],
      [[5.92, 7.41], [5.68, -1.94]],
      [[5.42, 6.35], [5.53, -0.3]],
      [[5.53, -0.3], [5.6, -1.2]],
      [[5.6, -1.2], [5.68, -1.94]],
      [[5.68, -1.94], [5.8, -9.67]],
      [[5.53, -0.3], [5.24, -8.2]],
      [[5.8, -9.67], [5.24, -8.2]],
      [[5.6, -1.2], [5.59, -5.39]],
    ],
    featuredStars: [
      { ra: 5.92, dec: 7.41, color: '#ff5722' }, // Betelgeuse (M-type crimson-orange supergiant)
      { ra: 5.24, dec: -8.2, color: '#38bdf8' }, // Rigel (B8 electric blue-white supergiant)
      { ra: 5.42, dec: 6.35, color: '#7dd3fc' }, // Bellatrix
      { ra: 5.59, dec: 9.93, color: '#e0f2fe' }, // Meissa
      { ra: 5.68, dec: -1.94, color: '#60a5fa' }, // Alnitak
      { ra: 5.6, dec: -1.2, color: '#93c5fd' }, // Alnilam
      { ra: 5.53, dec: -0.3, color: '#60a5fa' }, // Mintaka
      { ra: 5.8, dec: -9.67, color: '#93c5fd' }, // Saiph
      { ra: 5.59, dec: -5.39, color: '#e879f9' }, // M42 Trapezium
    ],
    callouts: [
      { ra: 5.92, dec: 7.41, dRa: 0.36, dDec: 1.5, labelVi: 'Betelgeuse (α Ori)', labelEn: 'Betelgeuse (α Ori)', accent: '#fb923c' },
      { ra: 5.24, dec: -8.2, dRa: -0.36, dDec: -1.6, labelVi: 'Rigel (β Ori)', labelEn: 'Rigel (β Ori)', accent: '#38bdf8' },
      { ra: 5.59, dec: -5.39, dRa: -0.38, dDec: 0.0, labelVi: 'Tinh vân M42', labelEn: 'M42 Nebula', accent: '#e879f9' },
    ],
  },
  {
    id: 'constellation_ursa_major',
    labelVi: '✦ ĐẠI HÙNG · BẮC ĐẨU',
    labelEn: '✦ URSA MAJOR · BIG DIPPER',
    raHours: 12.1,
    decDeg: 56.5,
    pairs: [
      [[11.06, 61.75], [11.03, 56.38]],
      [[11.03, 56.38], [11.9, 53.69]],
      [[11.9, 53.69], [12.26, 57.03]],
      [[12.26, 57.03], [11.06, 61.75]],
      [[12.26, 57.03], [12.9, 55.96]],
      [[12.9, 55.96], [13.4, 54.93]],
      [[13.4, 54.93], [13.79, 49.31]],
    ],
    featuredStars: [
      { ra: 11.06, dec: 61.75, color: '#fb923c' }, // Dubhe (K-giant orange-gold)
      { ra: 11.03, dec: 56.38, color: '#bae6fd' }, // Merak
      { ra: 11.9, dec: 53.69, color: '#e0f2fe' }, // Phecda
      { ra: 12.26, dec: 57.03, color: '#f1f5f9' }, // Megrez
      { ra: 12.9, dec: 55.96, color: '#7dd3fc' }, // Alioth
      { ra: 13.4, dec: 54.93, color: '#bae6fd' }, // Mizar & Alcor
      { ra: 13.79, dec: 49.31, color: '#38bdf8' }, // Alkaid (hot B3 blue)
    ],
    callouts: [
      { ra: 11.06, dec: 61.75, dRa: -0.45, dDec: 1.8, labelVi: 'Dubhe (α UMa)', labelEn: 'Dubhe (α UMa)', accent: '#fbbf24' },
      { ra: 12.9, dec: 55.96, dRa: 0.0, dDec: 2.2, labelVi: 'Alioth (ε UMa)', labelEn: 'Alioth (ε UMa)', accent: '#7dd3fc' },
      { ra: 13.79, dec: 49.31, dRa: 0.45, dDec: -1.6, labelVi: 'Alkaid (η UMa)', labelEn: 'Alkaid (η UMa)', accent: '#38bdf8' },
    ],
  },
  {
    id: 'constellation_cassiopeia',
    labelVi: '✦ THIÊN HẬU · CASSIOPEIA',
    labelEn: '✦ CASSIOPEIA · QUEEN',
    raHours: 1.05,
    decDeg: 60.2,
    pairs: [
      [[0.15, 59.15], [0.68, 56.54]],
      [[0.68, 56.54], [0.95, 60.72]],
      [[0.95, 60.72], [1.43, 60.24]],
      [[1.43, 60.24], [1.91, 63.67]],
    ],
    featuredStars: [
      { ra: 0.15, dec: 59.15, color: '#fde68a' }, // Caph
      { ra: 0.68, dec: 56.54, color: '#fb923c' }, // Schedar (K0 orange giant)
      { ra: 0.95, dec: 60.72, color: '#38bdf8' }, // Gamma Cas (Be blue star)
      { ra: 1.43, dec: 60.24, color: '#e0f2fe' }, // Ruchbah
      { ra: 1.91, dec: 63.67, color: '#7dd3fc' }, // Segin
    ],
    callouts: [
      { ra: 0.68, dec: 56.54, dRa: -0.35, dDec: -2.0, labelVi: 'Schedar (α Cas)', labelEn: 'Schedar (α Cas)', accent: '#fb923c' },
      { ra: 0.95, dec: 60.72, dRa: 0.0, dDec: 2.2, labelVi: 'Gamma Cas (γ)', labelEn: 'Gamma Cas (γ)', accent: '#38bdf8' },
    ],
  },
  {
    id: 'constellation_cygnus',
    labelVi: '✦ THIÊN NGA · CYGNUS',
    labelEn: '✦ CYGNUS · NORTHERN CROSS',
    raHours: 20.37,
    decDeg: 40.3,
    pairs: [
      [[20.69, 45.28], [20.37, 40.26]],
      [[20.37, 40.26], [19.51, 27.96]],
      [[19.75, 45.13], [20.37, 40.26]],
      [[20.37, 40.26], [20.77, 33.97]],
    ],
    featuredStars: [
      { ra: 20.69, dec: 45.28, color: '#60a5fa' }, // Deneb (A2 blue-white supergiant)
      { ra: 20.37, dec: 40.26, color: '#fde047' }, // Sadr
      { ra: 19.51, dec: 27.96, color: '#f59e0b' }, // Albireo (gold-sapphire binary)
      { ra: 19.75, dec: 45.13, color: '#e0f2fe' }, // Fawaris
      { ra: 20.77, dec: 33.97, color: '#fb923c' }, // Aljanah
    ],
    callouts: [
      { ra: 20.69, dec: 45.28, dRa: 0.35, dDec: 2.0, labelVi: 'Deneb (α Cyg)', labelEn: 'Deneb (α Cyg)', accent: '#60a5fa' },
      { ra: 19.51, dec: 27.96, dRa: -0.35, dDec: -1.8, labelVi: 'Albireo (β Cyg)', labelEn: 'Albireo (β Cyg)', accent: '#fbbf24' },
    ],
  },
  {
    id: 'constellation_scorpius',
    labelVi: '✦ THIÊN YẾT · SCORPIUS',
    labelEn: '✦ SCORPIUS · SCORPION',
    raHours: 16.65,
    decDeg: -28.5,
    pairs: [
      [[16.09, -19.8], [16.49, -26.43]],
      [[16.0, -22.62], [16.49, -26.43]],
      [[15.98, -26.11], [16.49, -26.43]],
      [[16.49, -26.43], [16.84, -34.29]],
      [[16.84, -34.29], [17.2, -43.24]],
      [[17.2, -43.24], [17.62, -43.0]],
      [[17.62, -43.0], [17.56, -37.1]],
    ],
    featuredStars: [
      { ra: 16.49, dec: -26.43, color: '#ff4520' }, // Antares (fiery M1 red supergiant)
      { ra: 16.09, dec: -19.8, color: '#60a5fa' }, // Acrab
      { ra: 16.0, dec: -22.62, color: '#38bdf8' }, // Dschubba
      { ra: 15.98, dec: -26.11, color: '#93c5fd' }, // Fang
      { ra: 16.84, dec: -34.29, color: '#fb923c' }, // Larawag
      { ra: 17.2, dec: -43.24, color: '#fde047' }, // Sargas
      { ra: 17.62, dec: -43.0, color: '#93c5fd' }, // Girtab
      { ra: 17.56, dec: -37.1, color: '#38bdf8' }, // Shaula (blue stinger)
    ],
    callouts: [
      { ra: 16.49, dec: -26.43, dRa: 0.36, dDec: 1.8, labelVi: 'Antares (α Sco)', labelEn: 'Antares (α Sco)', accent: '#fb7185' },
      { ra: 17.56, dec: -37.1, dRa: 0.36, dDec: 1.5, labelVi: 'Shaula (λ Sco)', labelEn: 'Shaula (λ Sco)', accent: '#38bdf8' },
    ],
  },
  {
    id: 'constellation_crux',
    labelVi: '✦ NAM THẬP TỰ · CRUX',
    labelEn: '✦ CRUX · SOUTHERN CROSS',
    raHours: 12.48,
    decDeg: -59.8,
    pairs: [
      [[12.44, -63.1], [12.52, -57.11]],
      [[12.25, -58.75], [12.8, -59.69]],
    ],
    featuredStars: [
      { ra: 12.44, dec: -63.1, color: '#38bdf8' }, // Acrux
      { ra: 12.8, dec: -59.69, color: '#60a5fa' }, // Mimosa
      { ra: 12.52, dec: -57.11, color: '#ff6b2b' }, // Gacrux (M3 red giant)
      { ra: 12.25, dec: -58.75, color: '#e0f2fe' }, // Imai
    ],
    callouts: [
      { ra: 12.44, dec: -63.1, dRa: -0.45, dDec: -1.4, labelVi: 'Acrux (α Cru)', labelEn: 'Acrux (α Cru)', accent: '#38bdf8' },
      { ra: 12.52, dec: -57.11, dRa: 0.45, dDec: 1.6, labelVi: 'Gacrux (γ Cru)', labelEn: 'Gacrux (γ Cru)', accent: '#fb923c' },
    ],
  },
  {
    id: 'constellation_leo',
    labelVi: '✦ SƯ TỬ · LEO',
    labelEn: '✦ LEO · THE LION',
    raHours: 10.9,
    decDeg: 16.5,
    pairs: [
      [[10.14, 11.97], [10.12, 16.76]],
      [[10.12, 16.76], [10.33, 19.84]],
      [[10.33, 19.84], [10.28, 23.42]],
      [[10.28, 23.42], [9.88, 26.01]],
      [[9.88, 26.01], [9.76, 23.77]],
      [[10.33, 19.84], [11.24, 20.52]],
      [[11.24, 20.52], [11.82, 14.57]],
      [[11.82, 14.57], [11.24, 15.43]],
      [[11.24, 15.43], [10.14, 11.97]],
    ],
    featuredStars: [
      { ra: 10.14, dec: 11.97, color: '#38bdf8' }, // Regulus (blue-white Heart of the Lion)
      { ra: 10.12, dec: 16.76, color: '#bae6fd' }, // Eta Leonis
      { ra: 10.33, dec: 19.84, color: '#fbbf24' }, // Algieba (golden binary giant)
      { ra: 10.28, dec: 23.42, color: '#f8fafc' }, // Adhafera
      { ra: 9.88, dec: 26.01, color: '#fb923c' }, // Rasalas
      { ra: 9.76, dec: 23.77, color: '#fde047' }, // Algenubi (Sickle tip)
      { ra: 11.24, dec: 20.52, color: '#e0f2fe' }, // Zosma
      { ra: 11.24, dec: 15.43, color: '#f1f5f9' }, // Chertan
      { ra: 11.82, dec: 14.57, color: '#7dd3fc' }, // Denebola
    ],
    callouts: [
      { ra: 10.14, dec: 11.97, dRa: -0.34, dDec: -1.6, labelVi: 'Regulus (α Leo)', labelEn: 'Regulus (α Leo)', accent: '#38bdf8' },
      { ra: 10.33, dec: 19.84, dRa: -0.36, dDec: 0.8, labelVi: 'Algieba (γ Leo)', labelEn: 'Algieba (γ Leo)', accent: '#fbbf24' },
      { ra: 11.82, dec: 14.57, dRa: 0.34, dDec: -1.4, labelVi: 'Denebola (β Leo)', labelEn: 'Denebola (β Leo)', accent: '#7dd3fc' },
    ],
  },
  {
    id: 'constellation_taurus',
    labelVi: '✦ KIM NGƯU · TAURUS',
    labelEn: '✦ TAURUS · PLEIADES',
    raHours: 4.55,
    decDeg: 18.8,
    pairs: [
      [[4.6, 16.51], [4.48, 15.87]],
      [[4.48, 15.87], [4.33, 15.63]],
      [[4.33, 15.63], [4.48, 19.18]],
      [[4.6, 16.51], [5.63, 21.14]],
      [[4.48, 19.18], [5.44, 28.61]],
      [[4.33, 15.63], [3.79, 24.11]],
    ],
    featuredStars: [
      { ra: 4.6, dec: 16.51, color: '#ff6b20' }, // Aldebaran (fiery K5 orange eye)
      { ra: 4.48, dec: 15.87, color: '#fde047' }, // Theta Tauri (Hyades)
      { ra: 4.33, dec: 15.63, color: '#fdba74' }, // Hyadum I
      { ra: 4.48, dec: 19.18, color: '#fef08a' }, // Ain
      { ra: 5.44, dec: 28.61, color: '#38bdf8' }, // Elnath (blue horn tip)
      { ra: 5.63, dec: 21.14, color: '#7dd3fc' }, // Tianguan (near M1 Crab Nebula)
      { ra: 3.79, dec: 24.11, color: '#3b82f6' }, // Pleiades M45 Seven Sisters
    ],
    callouts: [
      { ra: 4.6, dec: 16.51, dRa: 0.32, dDec: -1.6, labelVi: 'Aldebaran (α Tau)', labelEn: 'Aldebaran (α Tau)', accent: '#fb923c' },
      { ra: 3.79, dec: 24.11, dRa: -0.34, dDec: 1.6, labelVi: 'Tua Rua M45', labelEn: 'Pleiades (M45)', accent: '#60a5fa' },
    ],
  },
];

export const BRIGHT_NAV_STARS: ReadonlyArray<BrightNavStar> = [
  { id: 'polaris', nameVi: 'Sao Bắc Cực (Polaris)', nameEn: 'Polaris (North Star)', raHours: 2.53, decDeg: 89.26, mag: 1.98, color: '#fef3c7' },
  { id: 'sirius', nameVi: 'Thiên Lang (Sirius)', nameEn: 'Sirius (α CMa)', raHours: 6.752, decDeg: -16.716, mag: -1.46, color: '#e0f2fe' },
  { id: 'canopus', nameVi: 'Lão Nhân (Canopus)', nameEn: 'Canopus (α Car)', raHours: 6.399, decDeg: -52.696, mag: -0.74, color: '#fef9c3' },
  { id: 'arcturus', nameVi: 'Đại Giác (Arcturus)', nameEn: 'Arcturus (α Boo)', raHours: 14.261, decDeg: 19.182, mag: -0.05, color: '#fdba74' },
  { id: 'vega', nameVi: 'Chức Nữ (Vega)', nameEn: 'Vega (α Lyr)', raHours: 18.616, decDeg: 38.784, mag: 0.03, color: '#bae6fd' },
  { id: 'capella', nameVi: 'Ngũ Xa (Capella)', nameEn: 'Capella (α Aur)', raHours: 5.278, decDeg: 45.998, mag: 0.08, color: '#fde68a' },
  { id: 'rigel', nameVi: 'Sâm Túc Thất (Rigel)', nameEn: 'Rigel (β Ori)', raHours: 5.242, decDeg: -8.202, mag: 0.13, color: '#38bdf8' },
  { id: 'procyon', nameVi: 'Nam Hà Tam (Procyon)', nameEn: 'Procyon (α CMi)', raHours: 7.655, decDeg: 5.225, mag: 0.34, color: '#fef3c7' },
  { id: 'betelgeuse', nameVi: 'Sâm Túc Tứ (Betelgeuse)', nameEn: 'Betelgeuse (α Ori)', raHours: 5.919, decDeg: 7.407, mag: 0.42, color: '#fb923c' },
  { id: 'achernar', nameVi: 'Thủy Ủy Nhất (Achernar)', nameEn: 'Achernar (α Eri)', raHours: 1.629, decDeg: -57.237, mag: 0.46, color: '#7dd3fc' },
  { id: 'altair', nameVi: 'Ngưu Lang (Altair)', nameEn: 'Altair (α Aql)', raHours: 19.846, decDeg: 8.868, mag: 0.76, color: '#e0f2fe' },
  { id: 'acrux', nameVi: 'Nam Thập Tự α (Acrux)', nameEn: 'Acrux (α Cru)', raHours: 12.443, decDeg: -63.099, mag: 0.77, color: '#38bdf8' },
  { id: 'aldebaran', nameVi: 'Tất Túc Ngũ (Aldebaran)', nameEn: 'Aldebaran (α Tau)', raHours: 4.599, decDeg: 16.509, mag: 0.86, color: '#fb923c' },
  { id: 'antares', nameVi: 'Tâm Túc Nhị (Antares)', nameEn: 'Antares (α Sco)', raHours: 16.49, decDeg: -26.432, mag: 0.96, color: '#fb7185' },
  { id: 'spica', nameVi: 'Giác Túc Nhất (Spica)', nameEn: 'Spica (α Vir)', raHours: 13.42, decDeg: -11.161, mag: 0.97, color: '#60a5fa' },
  { id: 'pollux', nameVi: 'Bắc Hà Tam (Pollux)', nameEn: 'Pollux (β Gem)', raHours: 7.755, decDeg: 28.026, mag: 1.14, color: '#fdba74' },
  { id: 'fomalhaut', nameVi: 'Bắc Lạc Sư Môn (Fomalhaut)', nameEn: 'Fomalhaut (α PsA)', raHours: 22.961, decDeg: -29.622, mag: 1.16, color: '#e0f2fe' },
  { id: 'deneb', nameVi: 'Thiên Tân Tứ (Deneb)', nameEn: 'Deneb (α Cyg)', raHours: 20.691, decDeg: 45.28, mag: 1.25, color: '#60a5fa' },
  { id: 'regulus', nameVi: 'Hiên Viên Thập Tứ (Regulus)', nameEn: 'Regulus (α Leo)', raHours: 10.139, decDeg: 11.967, mag: 1.35, color: '#38bdf8' },
  { id: 'dubhe', nameVi: 'Thiên Xu (Dubhe)', nameEn: 'Dubhe (α UMa)', raHours: 11.062, decDeg: 61.751, mag: 1.79, color: '#fbbf24' },
];

export function raDecToCartesian(
  raHours: number,
  decDeg: number,
  radius: number
): [number, number, number] {
  const raRad = THREE.MathUtils.degToRad(raHours * 15.0);
  const decRad = THREE.MathUtils.degToRad(decDeg);
  const cosDec = Math.cos(decRad);
  return [
    radius * cosDec * Math.cos(raRad),
    radius * Math.sin(decRad),
    radius * cosDec * Math.sin(raRad),
  ];
}
