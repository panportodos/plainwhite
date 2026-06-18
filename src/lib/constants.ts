// 담백보감 전역 상수

import type { Constitution, ConstitutionHanja } from './types';

// 체질 ↔ 한자 ↔ 제품명 ↔ 테마색 매핑
export const CONSTITUTION_MAP = {
  태음인: {
    hanja: '地' as ConstitutionHanja,
    productName: '단백환 지',
    color: '#7A6A3C', // 대지색/녹갈
    description: '소화·대사 더딤, 고단백 저지방 권장',
  },
  소음인: {
    hanja: '水' as ConstitutionHanja,
    productName: '단백환 수',
    color: '#3C6E9E', // 물색/청
    description: '소화 약함, 따뜻하고 소화 쉬운 단백',
  },
  소양인: {
    hanja: '火' as ConstitutionHanja,
    productName: '단백환 화',
    color: '#D85A30', // 불색/주황
    description: '열 많음, 담백·서늘한 성질 권장',
  },
  태양인: {
    hanja: '風' as ConstitutionHanja,
    productName: '단백환 풍',
    color: '#6F8F5C', // 바람색/연녹
    description: '드묾, 담백·가벼운 단백 위주',
  },
} as const;

// 한자 → 체질 역매핑
export const HANJA_TO_CONSTITUTION: Record<ConstitutionHanja, Constitution> = {
  地: '태음인',
  水: '소음인',
  火: '소양인',
  風: '태양인',
};

// 식이 매트릭스 색상
export const DIET_COLORS = {
  animalProtein: '#D85A30', // 동물성 단백질 (주황)
  plantProtein: '#1D9E75', // 식물성 단백질 (녹청)
  carbs: '#D4537E', // 탄수화물 (핑크)
  fat: '#639922', // 지방 (녹색)
} as const;

// 상태별 색상/스타일
export const STATUS_STYLES = {
  복용중: {
    bg: '#F7F5F0',
    text: '#5A3A22',
    label: '복용중',
  },
  신규: {
    bg: '#E5E7EB',
    text: '#6B7280',
    label: '신규',
  },
  중단: {
    bg: '#F3F4F6',
    text: '#9CA3AF',
    label: '중단',
  },
} as const;

// 단백질 표준값 (연령·성별 기준, kg)
// 간단한 예시값. 실제로는 더 세분화된 테이블 필요
export const PROTEIN_STANDARD = {
  남: {
    '20-39': 11.0,
    '40-59': 10.5,
    '60+': 10.0,
  },
  여: {
    '20-39': 8.5,
    '40-59': 8.0,
    '60+': 7.5,
  },
} as const;

// 인바디 기기 모델
export const INBODY_MODEL = 'InBody270';
