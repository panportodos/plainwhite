// 근육량 증가 예측 (베타)
// 쌓인 인바디 기록에서 "비슷한 환자(체질·연령대·BMI 구간)"의 월평균 골격근 증가량을 구해
// 개별 환자의 앞으로 4·8·12주 골격근량을 예측합니다.
// 데이터가 적을 때는 범위를 넓게 잡고 신뢰도를 '낮음'으로 표시합니다.
// 데이터가 수백 명 이상 쌓이면 이 파일의 predictMuscleGain만 회귀 모델로 바꾸면 됩니다.

import type { Constitution, InbodyRecord, Patient } from './types';

export type AgeBand = '20-39세' | '40-59세' | '60세 이상';
export type BmiBand = '정상 (<23)' | '과체중 (23-25)' | '비만 (25+)';

export const AGE_BANDS: AgeBand[] = ['20-39세', '40-59세', '60세 이상'];
export const BMI_BANDS: BmiBand[] = ['정상 (<23)', '과체중 (23-25)', '비만 (25+)'];
export const CONSTITUTIONS: Constitution[] = ['태음인', '소음인', '소양인', '태양인'];

// 예측 모델이 "충분히 믿을 만하다"고 볼 목표 데이터 수 (2회 이상 측정한 환자)
export const MODEL_TARGET_SAMPLES = 300;

const DAYS_PER_MONTH = 30.4;
const WEEKS_PER_MONTH = DAYS_PER_MONTH / 7;

export function getAgeBand(age: number): AgeBand {
  if (age < 40) return '20-39세';
  if (age < 60) return '40-59세';
  return '60세 이상';
}

export function getBmiBand(bmi: number): BmiBand {
  if (bmi < 23) return '정상 (<23)';
  if (bmi < 25) return '과체중 (23-25)';
  return '비만 (25+)';
}

// 학습 샘플 1건 = 인바디를 2회 이상 측정한 환자 1명
export interface GainSample {
  patient: Patient;
  ageBand: AgeBand;
  bmiBand: BmiBand;
  months: number; // 첫 측정 ~ 마지막 측정 기간 (개월)
  muscleRate: number; // 월평균 골격근 변화 (kg/월)
  proteinRate: number; // 월평균 단백질 변화 (kg/월)
  intervals: number; // 측정 간격 수 (측정 횟수 - 1)
}

function sortByDate(records: InbodyRecord[]) {
  return [...records].sort((a, b) => a.testedAt.localeCompare(b.testedAt));
}

export function buildSamples(patients: Patient[], records: InbodyRecord[]): GainSample[] {
  const samples: GainSample[] = [];
  for (const patient of patients) {
    const own = sortByDate(records.filter((r) => r.patientId === patient.id));
    if (own.length < 2) continue;
    const first = own[0];
    const last = own[own.length - 1];
    const days = (new Date(last.testedAt).getTime() - new Date(first.testedAt).getTime()) / 86400000;
    if (days < 14) continue; // 2주 미만 간격은 측정 오차가 더 큼
    const months = days / DAYS_PER_MONTH;
    samples.push({
      patient,
      ageBand: getAgeBand(patient.age),
      bmiBand: getBmiBand(first.bmi),
      months,
      muscleRate: (last.skeletalMuscle - first.skeletalMuscle) / months,
      proteinRate: (last.protein - first.protein) / months,
      intervals: own.length - 1,
    });
  }
  return samples;
}

export type Confidence = '낮음' | '보통' | '높음';

export interface MusclePrediction {
  baseMuscle: number; // 예측 시작점 (최신 골격근량)
  baseDate: string;
  monthlyRate: number; // 예상 월평균 증가량 (kg/월)
  spread: number; // 범위 (± kg/월)
  points: { week: number; date: string; mid: number; low: number; high: number }[];
  cohortSize: number; // 비교에 쓴 다른 환자 수
  sameConstitutionSize: number;
  usedOwnTrend: boolean;
  confidence: Confidence;
  factors: { label: string; value: string }[];
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

// 개별 환자 예측
export function predictMuscleGain(
  patient: Patient,
  patients: Patient[],
  records: InbodyRecord[],
  weeks: number[] = [4, 8, 12],
): MusclePrediction | null {
  const own = sortByDate(records.filter((r) => r.patientId === patient.id));
  const latest = own[own.length - 1];
  if (!latest) return null;

  const samples = buildSamples(patients, records);
  const others = samples.filter((s) => s.patient.id !== patient.id);
  const ownSample = samples.find((s) => s.patient.id === patient.id);

  const myAge = getAgeBand(patient.age);
  const myBmi = getBmiBand(latest.bmi);

  // 비슷할수록 가중치 ↑ (체질 2점, 연령대 1.5점, BMI 구간 1.5점, 기본 1점)
  let wSum = 0;
  let rateSum = 0;
  for (const s of others) {
    const w =
      1 +
      (s.patient.constitution === patient.constitution ? 2 : 0) +
      (s.ageBand === myAge ? 1.5 : 0) +
      (s.bmiBand === myBmi ? 1.5 : 0);
    wSum += w;
    rateSum += w * s.muscleRate;
  }
  const cohortRate = wSum > 0 ? rateSum / wSum : 0;

  let varSum = 0;
  for (const s of others) {
    const w =
      1 +
      (s.patient.constitution === patient.constitution ? 2 : 0) +
      (s.ageBand === myAge ? 1.5 : 0) +
      (s.bmiBand === myBmi ? 1.5 : 0);
    varSum += w * (s.muscleRate - cohortRate) ** 2;
  }
  const cohortSd = wSum > 0 ? Math.sqrt(varSum / wSum) : 0.5;

  // 본인 추세가 있으면 함께 반영 (측정 간격 수만큼 가중, 코호트는 2만큼)
  const COHORT_WEIGHT = 2;
  const monthlyRate = ownSample
    ? (ownSample.muscleRate * ownSample.intervals + cohortRate * COHORT_WEIGHT) /
      (ownSample.intervals + COHORT_WEIGHT)
    : cohortRate;

  // 데이터가 적으면 범위를 넓게: 최소 ±0.3 kg/월, 표본 수가 적을수록 확대
  const sameConstitutionSize = others.filter((s) => s.patient.constitution === patient.constitution).length;
  const smallSamplePenalty = 1 + 2 / Math.sqrt(Math.max(others.length, 1));
  const spread = Math.max(cohortSd, 0.3) * smallSamplePenalty;

  const confidence: Confidence =
    others.length >= 100 && sameConstitutionSize >= 30 ? '높음' : others.length >= 20 ? '보통' : '낮음';

  const baseDate = new Date(latest.testedAt);
  const points = [0, ...weeks].map((week) => {
    const months = week / WEEKS_PER_MONTH;
    const d = new Date(baseDate);
    d.setDate(d.getDate() + week * 7);
    return {
      week,
      date: d.toISOString().slice(0, 10),
      mid: round1(latest.skeletalMuscle + monthlyRate * months),
      low: round1(latest.skeletalMuscle + (monthlyRate - spread) * months),
      high: round1(latest.skeletalMuscle + (monthlyRate + spread) * months),
    };
  });

  return {
    baseMuscle: latest.skeletalMuscle,
    baseDate: latest.testedAt,
    monthlyRate: round2(monthlyRate),
    spread: round2(spread),
    points,
    cohortSize: others.length,
    sameConstitutionSize,
    usedOwnTrend: !!ownSample,
    confidence,
    factors: [
      { label: '체질', value: patient.constitution },
      { label: '연령대', value: myAge },
      { label: 'BMI', value: `${latest.bmi} · ${myBmi.split(' ')[0]}` },
      { label: '복용 순응도', value: `${patient.adherenceRate}%` },
    ],
  };
}

// 코호트 표: 체질 × (연령대 또는 BMI 구간) 칸마다 평균 월 증가량과 인원
export interface CohortCell {
  constitution: Constitution;
  band: string;
  n: number;
  avgRate: number | null; // kg/월, 데이터 없으면 null
}

export function buildCohortTable(samples: GainSample[], by: 'age' | 'bmi'): CohortCell[] {
  const bands: string[] = by === 'age' ? AGE_BANDS : BMI_BANDS;
  const cells: CohortCell[] = [];
  for (const constitution of CONSTITUTIONS) {
    for (const band of bands) {
      const group = samples.filter(
        (s) => s.patient.constitution === constitution && (by === 'age' ? s.ageBand : s.bmiBand) === band,
      );
      cells.push({
        constitution,
        band,
        n: group.length,
        avgRate: group.length ? round2(group.reduce((sum, s) => sum + s.muscleRate, 0) / group.length) : null,
      });
    }
  }
  return cells;
}
