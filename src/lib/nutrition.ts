// 비타민·무기질 8종: 3일 기록의 추정 섭취량을 참고 기준과 나란히 보여주기 위한 표
//
// 판정 원칙: 3일 사진 추정치로는 결핍·과잉을 판정할 수 없으므로 '부족/적정/과다' 같은 판정은 하지 않고,
// "기록 기간의 추정 섭취량 vs 참고 기준(몇 %)"만 보여줍니다.
//
// ⚠️ 기준값 확인 상태: 아래 값은 2020 한국인 영양소 섭취기준(KDRI)을 바탕으로 넣은 것이며,
// 2025 한국인 영양소 섭취기준 정오표 반영본(한국영양학회)과 아직 대조하지 못했습니다.
// 대조를 마치면 REFERENCE_SOURCE를 바꾸고 verified를 true로 바꿉니다.

import type { NutrientKey } from './types';

export const REFERENCE_SOURCE = {
  edition: '2020 한국인 영양소 섭취기준',
  verified: false, // 2025 정오표 반영본과 대조 완료 시 true
};

// 기준 종류 (KDRI 용어)
export type ReferenceType = '권장섭취량' | '충분섭취량' | '만성질환위험감소섭취량';

export const NUTRIENTS: {
  key: NutrientKey;
  label: string;
  unit: string;
  refType: ReferenceType;
  role: string;
  tip: string;
}[] = [
  { key: 'vitaminD', label: '비타민 D', unit: 'μg', refType: '충분섭취량', role: '근육 기능·칼슘 흡수', tip: '하루 15~20분 햇볕 산책, 말린 표고버섯, 등푸른생선' },
  { key: 'calcium', label: '칼슘', unit: 'mg', refType: '권장섭취량', role: '뼈 건강·근육 수축', tip: '두부·들깨·멸치를 하루 한 번' },
  { key: 'fiber', label: '식이섬유', unit: 'g', refType: '충분섭취량', role: '장 건강·혈당 조절', tip: '잡곡밥, 나물 반찬 한 가지 더' },
  { key: 'magnesium', label: '마그네슘', unit: 'mg', refType: '권장섭취량', role: '근육 이완·에너지 대사', tip: '견과류 한 줌, 시금치·현미' },
  { key: 'vitaminC', label: '비타민 C', unit: 'mg', refType: '권장섭취량', role: '피로 회복·면역', tip: '제철 과일이나 채소 한 접시' },
  { key: 'iron', label: '철', unit: 'mg', refType: '권장섭취량', role: '산소 운반', tip: '살코기·조개류·짙은 녹색 채소' },
  { key: 'vitaminB12', label: '비타민 B12', unit: 'μg', refType: '권장섭취량', role: '신경·혈액 건강', tip: '생선·계란·조개류' },
  { key: 'sodium', label: '나트륨', unit: 'mg', refType: '만성질환위험감소섭취량', role: '부종·혈압 관리', tip: '찌개는 국물을 절반만, 젓갈·장아찌 줄이기' },
];

// KDRI 성인 연령 구간
export const AGE_BANDS = ['19-29', '30-49', '50-64', '65-74', '75+'] as const;
export type AgeBand = (typeof AGE_BANDS)[number];

export function ageBand(age: number): AgeBand {
  if (age < 30) return '19-29';
  if (age < 50) return '30-49';
  if (age < 65) return '50-64';
  if (age < 75) return '65-74';
  return '75+';
}

// 값 순서: [19-29, 30-49, 50-64, 65-74, 75+] — 2025 정오표 반영본과 대조 전 (위 주석 참고)
type Row = [number, number, number, number, number];
const REF: Record<'남' | '여', Record<NutrientKey, Row>> = {
  남: {
    vitaminD: [10, 10, 10, 15, 15],
    calcium: [800, 800, 750, 700, 700],
    fiber: [30, 30, 30, 25, 25],
    magnesium: [360, 370, 370, 370, 370],
    vitaminC: [100, 100, 100, 100, 100],
    iron: [10, 10, 10, 9, 9],
    vitaminB12: [2.4, 2.4, 2.4, 2.4, 2.4],
    sodium: [2300, 2300, 2300, 2100, 1700],
  },
  여: {
    vitaminD: [10, 10, 10, 15, 15],
    calcium: [700, 700, 800, 800, 800],
    fiber: [20, 20, 20, 20, 20],
    magnesium: [280, 280, 280, 280, 280],
    vitaminC: [100, 100, 100, 100, 100],
    iron: [14, 14, 8, 8, 7],
    vitaminB12: [2.4, 2.4, 2.4, 2.4, 2.4],
    sodium: [2300, 2300, 2300, 2100, 1700],
  },
};

export function nutrientReference(key: NutrientKey, gender: '남' | '여', age: number): number {
  return REF[gender][key][AGE_BANDS.indexOf(ageBand(age))];
}

export function referenceLabel(gender: '남' | '여', age: number) {
  const band = ageBand(age);
  const ageText = band === '75+' ? '75세 이상' : `${band}세`;
  return `${REFERENCE_SOURCE.edition} (${ageText} ${gender === '남' ? '남성' : '여성'})`;
}

// 음식 제안 대상 고르기: 나트륨은 기준보다 높게 추정된 경우, 나머지는 기준보다 낮게 추정된 순서대로
export function pickFocusNutrients<T extends { key: NutrientKey; ratio: number }>(list: T[], max = 3): T[] {
  const below = list.filter((n) => n.key !== 'sodium' && n.ratio < 1).sort((a, b) => a.ratio - b.ratio);
  const sodium = list.filter((n) => n.key === 'sodium' && n.ratio > 1);
  return [...below.slice(0, max - sodium.length), ...sodium];
}
