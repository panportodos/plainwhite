// 통계 계산 함수

import type { Patient, InbodyRecord } from './types';

// 대시보드 통계
export interface DashboardStats {
  totalPatients: number; // 전체 환자 수
  activeTaking: number; // 복용 중 환자 수
  weeklyTests: number; // 이번 주 인바디 검사 건수
  proteinImprovement: number; // 단백질 개선율 %
}

export function calculateDashboardStats(
  patients: Patient[],
  inbodyRecords: InbodyRecord[]
): DashboardStats {
  const totalPatients = patients.length;
  const activeTaking = patients.filter(p => p.status === '복용중').length;

  // 이번 주 검사 건수 (최근 7일)
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weeklyTests = inbodyRecords.filter(r => {
    const testDate = new Date(r.testedAt);
    return testDate >= weekAgo;
  }).length;

  // 단백질 개선율: 증가한 환자 비율
  const improvedCount = patients.filter(p => p.proteinChange > 0).length;
  const proteinImprovement = totalPatients > 0
    ? Math.round((improvedCount / totalPatients) * 100)
    : 0;

  return {
    totalPatients,
    activeTaking,
    weeklyTests,
    proteinImprovement,
  };
}

// 평균 단백질량 추이 데이터 (월별)
export interface ProteinTrendData {
  month: string;
  takingGroup: number; // 복용군 평균
  nonTakingGroup: number; // 비복용군 평균
}

export function calculateProteinTrend(
  patients: Patient[],
  inbodyRecords: InbodyRecord[]
): ProteinTrendData[] {
  // 간단한 예시: 최근 6개월 데이터
  // 실제로는 월별로 집계해야 하지만, 여기서는 mock
  const months = ['1월', '2월', '3월', '4월', '5월', '6월'];

  // 복용군과 비복용군의 평균 단백질량 계산
  const takingPatients = patients.filter(p => p.status === '복용중');
  const nonTakingPatients = patients.filter(p => p.status !== '복용중');

  const takingAvg = takingPatients.length > 0
    ? takingPatients.reduce((sum, p) => {
        const records = inbodyRecords.filter(r => r.patientId === p.id);
        const latestProtein = records.length > 0
          ? records[records.length - 1].protein
          : 0;
        return sum + latestProtein;
      }, 0) / takingPatients.length
    : 0;

  const nonTakingAvg = nonTakingPatients.length > 0
    ? nonTakingPatients.reduce((sum, p) => {
        const records = inbodyRecords.filter(r => r.patientId === p.id);
        const latestProtein = records.length > 0
          ? records[records.length - 1].protein
          : 0;
        return sum + latestProtein;
      }, 0) / nonTakingPatients.length
    : 0;

  // Mock 추이 (실제로는 월별 데이터 필요)
  return months.map((month, idx) => ({
    month,
    takingGroup: Math.round((takingAvg - 2 + idx * 0.4) * 10) / 10,
    nonTakingGroup: Math.round((nonTakingAvg - 2 + idx * 0.2) * 10) / 10,
  }));
}

// 단백질 표준값 도달 여부 계산
export function isProteinStandard(patient: Patient, protein: number): boolean {
  // 간단한 기준: 남성 10kg 이상, 여성 7.5kg 이상
  const standard = patient.gender === '남' ? 10 : 7.5;
  return protein >= standard;
}
