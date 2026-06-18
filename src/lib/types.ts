// 담백보감 타입 정의

// 사상체질 타입
export type Constitution = '태음인' | '소음인' | '소양인' | '태양인';

// 환자 상태
export type PatientStatus = '복용중' | '신규' | '중단';

// 체질별 한자 매핑
export type ConstitutionHanja = '地' | '水' | '火' | '風';

// 인바디(BIA) 데이터
export interface InbodyRecord {
  id: string;
  patientId: string;
  testedAt: string; // ISO date string
  weight: number; // kg
  skeletalMuscle: number; // 골격근량 kg
  protein: number; // 단백질 kg
  bodyFat: number; // 체지방량 kg
  bodyFatPercent: number; // 체지방률 %
  bmi: number;
  bmr: number; // 기초대사량 kcal
  bodyWater: number; // 체수분 L
  visceralFat: number; // 내장지방 레벨
  score: number; // 인바디 점수
}

// 식단 기록
export interface MealRecord {
  id: string;
  patientId: string;
  recordedAt: string; // ISO date string
  mealType: '아침' | '점심' | '저녁' | '간식';
  foodName: string;
  imageUrl?: string;
  nutrition: {
    protein: number; // g
    carbs: number; // g
    fat: number; // g
    calories: number; // kcal
  };
}

// 식이 패턴 비중
export interface DietPattern {
  animalProtein: number; // % (동물성 단백질)
  plantProtein: number; // % (식물성 단백질)
  carbs: number; // % (탄수화물)
  fat: number; // % (지방)
}

// 환자 정보
export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: '남' | '여';
  chartNumber: string; // 차트번호

  // 신체 정보
  height: number; // cm
  weight: number; // kg
  bmi: number;

  // 한방 정보
  constitution: Constitution; // 사상체질
  productName: string; // 복용 제품명 (예: 단백환 지)
  adherenceRate: number; // 복용 순응도 %
  takingDays: number; // 복용 일수

  // 상태
  status: PatientStatus;

  // 식이 패턴
  dietPattern: DietPattern;

  // BIA 체성분 데이터 (최신값)
  latestBia: {
    skeletalMuscle: number; // 골격근량
    bodyFat: number; // 체지방량
    bodyFatPercent: number; // 체지방률
    bmr: number; // 기초대사량
    bodyWater: number; // 체수분
    visceralFat: number; // 내장지방
  };

  // 단백질 변화 (최근 검사 대비)
  proteinChange: number; // kg (양수: 증가, 음수: 감소, 0: 정체)

  // 최근 검사일
  lastTestDate: string; // ISO date string

  // 등록일
  registeredAt: string; // ISO date string
}

// 일정 항목
export interface ScheduleItem {
  id: string;
  patientId: string;
  patientName: string;
  type: '인바디 재측정' | '복용 상담' | '식이 상담' | '기타';
  scheduledAt: string; // ISO date string with time
}

// 체질별 음식 추천 데이터
export interface ConstitutionDiet {
  constitution: Constitution;
  hanja: ConstitutionHanja;
  productName: string;
  guideline: string; // 식이 가이드 문구
  recommended: string[]; // 권장 음식 목록
  restricted: string[]; // 절제 음식 목록
  proteinBonus: number; // 담백환 복용 시 단백질 목표 가산값 (g)
}
