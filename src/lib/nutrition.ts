// 비타민·무기질 8종의 권장량과 부족/적정/과다 판정
// 권장량: 2020 한국인 영양소 섭취기준(KDRI) — 개발 단계에서 원문 표로 한 번 더 확인 필요
// 비타민 D·식이섬유는 충분섭취량, 나트륨은 만성질환 위험 감소 섭취량, 나머지는 권장섭취량

import type { NutrientKey } from './types';

export type NutrientLevel = '부족' | '적정' | '과다';

export const NUTRIENTS: { key: NutrientKey; label: string; unit: string; role: string; tip: string }[] = [
  { key: 'vitaminD', label: '비타민 D', unit: 'μg', role: '근육 기능·칼슘 흡수', tip: '하루 15~20분 햇볕 산책, 말린 표고버섯, 등푸른생선' },
  { key: 'calcium', label: '칼슘', unit: 'mg', role: '뼈 건강·근육 수축', tip: '두부·들깨·멸치를 하루 한 번' },
  { key: 'fiber', label: '식이섬유', unit: 'g', role: '장 건강·혈당 조절', tip: '잡곡밥, 나물 반찬 한 가지 더' },
  { key: 'magnesium', label: '마그네슘', unit: 'mg', role: '근육 이완·에너지 대사', tip: '견과류 한 줌, 시금치·현미' },
  { key: 'vitaminC', label: '비타민 C', unit: 'mg', role: '피로 회복·면역', tip: '제철 과일이나 채소 한 접시' },
  { key: 'iron', label: '철', unit: 'mg', role: '산소 운반·빈혈 예방', tip: '살코기·조개류·짙은 녹색 채소' },
  { key: 'vitaminB12', label: '비타민 B12', unit: 'μg', role: '신경·혈액 건강', tip: '생선·계란·조개류' },
  { key: 'sodium', label: '나트륨', unit: 'mg', role: '부종·혈압 관리', tip: '찌개는 국물을 절반만, 젓갈·장아찌 줄이기' },
];

type AgeBand = '19-29' | '30-49' | '50-64' | '65+';

function ageBand(age: number): AgeBand {
  if (age < 30) return '19-29';
  if (age < 50) return '30-49';
  if (age < 65) return '50-64';
  return '65+';
}

// [19-29, 30-49, 50-64, 65+]
const REF: Record<'남' | '여', Record<NutrientKey, [number, number, number, number]>> = {
  남: {
    vitaminD: [10, 10, 10, 15],
    calcium: [800, 800, 750, 700],
    fiber: [30, 30, 30, 25],
    magnesium: [360, 370, 370, 370],
    vitaminC: [100, 100, 100, 100],
    iron: [10, 10, 10, 9],
    vitaminB12: [2.4, 2.4, 2.4, 2.4],
    sodium: [2300, 2300, 2300, 2100],
  },
  여: {
    vitaminD: [10, 10, 10, 15],
    calcium: [700, 700, 800, 800],
    fiber: [20, 20, 20, 20],
    magnesium: [280, 280, 280, 280],
    vitaminC: [100, 100, 100, 100],
    iron: [14, 14, 8, 7],
    vitaminB12: [2.4, 2.4, 2.4, 2.4],
    sodium: [2300, 2300, 2300, 2100],
  },
};

export function nutrientReference(key: NutrientKey, gender: '남' | '여', age: number): number {
  const idx = ['19-29', '30-49', '50-64', '65+'].indexOf(ageBand(age));
  return REF[gender][key][idx];
}

// 나트륨은 기준보다 많으면 과다, 나머지는 기준의 90% 미만이면 부족
export function nutrientLevel(key: NutrientKey, ratio: number): NutrientLevel {
  if (key === 'sodium') return ratio > 1 ? '과다' : '적정';
  return ratio < 0.9 ? '부족' : '적정';
}

export function referenceLabel(gender: '남' | '여', age: number) {
  const band = ageBand(age);
  const ageText = band === '65+' ? '65세 이상' : `${band}세`;
  return `2020 한국인 영양소 섭취기준 (${ageText} ${gender === '남' ? '남성' : '여성'})`;
}
