// 체질별 음식 추천 데이터
// 설정 페이지에서 수정 가능

import type { ConstitutionDiet } from './types';

export const DIET_BY_CONSTITUTION: ConstitutionDiet[] = [
  {
    constitution: '태음인',
    hanja: '地',
    productName: '단백환 지',
    guideline: '소화·대사가 더딘 편입니다. 고단백 저지방 위주로 섭취하고, 자극적이거나 기름진 음식은 절제하세요.',
    recommended: [
      '콩·두부',
      '흰살생선',
      '버섯',
      '무',
      '현미',
      '들깨',
      '율무',
      '우엉',
    ],
    restricted: [
      '튀김',
      '기름진 고기',
      '밀가루 과다',
      '인스턴트',
      '과도한 양념',
    ],
    proteinBonus: 20, // 담백환 복용 시 +20g
  },
  {
    constitution: '소음인',
    hanja: '水',
    productName: '단백환 수',
    guideline: '소화 기능이 약한 편입니다. 따뜻하고 소화하기 쉬운 단백질을 섭취하고, 찬 음식이나 날것은 피하세요.',
    recommended: [
      '닭고기',
      '계란',
      '생강',
      '따뜻한 국물',
      '찹쌀·차조',
      '마늘',
      '대추',
      '잣',
    ],
    restricted: [
      '찬 음식',
      '날것(회)',
      '과일 과다',
      '찬 음료',
      '밀가루',
    ],
    proteinBonus: 18,
  },
  {
    constitution: '소양인',
    hanja: '火',
    productName: '단백환 화',
    guideline: '열이 많은 체질입니다. 담백하고 서늘한 성질의 단백질을 섭취하고, 매운 음식이나 튀김은 피하세요.',
    recommended: [
      '오리고기',
      '돼지 살코기',
      '해산물',
      '보리',
      '신선한 채소',
      '배',
      '수박',
      '오이',
    ],
    restricted: [
      '매운 음식',
      '인삼·홍삼',
      '튀김',
      '술',
      '기름진 육류',
    ],
    proteinBonus: 20,
  },
  {
    constitution: '태양인',
    hanja: '風',
    productName: '단백환 풍',
    guideline: '드문 체질입니다. 담백하고 가벼운 단백질 위주로 섭취하고, 과식이나 기름진 음식은 피하세요.',
    recommended: [
      '메밀',
      '해산물',
      '담백한 채소',
      '포도',
      '새우',
      '조개류',
      '해조류',
    ],
    restricted: [
      '기름진 육류',
      '매운 양념',
      '과식',
      '밀가루',
      '떡',
    ],
    proteinBonus: 18,
  },
];

// 체질별 조회 헬퍼
export function getDietByConstitution(constitution: string): ConstitutionDiet | undefined {
  return DIET_BY_CONSTITUTION.find(d => d.constitution === constitution);
}
