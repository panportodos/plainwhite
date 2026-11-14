// 근육량 예측 모델
//
// 쌓인 기록에서 "인바디 검사 두 번 사이의 기간"을 하나의 관찰값으로 만들고,
// 그 기간 동안의 하루 단백질 섭취량(식사 + 담백환)이 골격근량 변화와 어떤 관계인지
// 회귀분석(릿지 회귀)으로 학습합니다.
//
// 주의: 관찰 데이터에서 찾은 관계이므로 "인과"가 아니라 "경향"입니다.

import type { Constitution, ExerciseLevel, InbodyRecord, MealRecord, Patient } from './types';

// ---------- 설정 ----------

const SUPPLEMENT_KEY = 'dambaek_supplement_protein_g';

// 담백환 하루 복용량에 들어 있는 단백질 (g). 설정하지 않았으면 null
export function getSupplementProtein(): number | null {
  try {
    const v = localStorage.getItem(SUPPLEMENT_KEY);
    return v === null || v === '' ? null : Number(v);
  } catch {
    return null;
  }
}

export function setSupplementProtein(g: number | null): void {
  if (g === null || Number.isNaN(g)) localStorage.removeItem(SUPPLEMENT_KEY);
  else localStorage.setItem(SUPPLEMENT_KEY, String(g));
}

export const EXERCISE_LABELS: Record<ExerciseLevel, string> = {
  0: '거의 안 함',
  1: '주 1~2회',
  2: '주 3~4회',
  3: '주 5회 이상',
};

// 예측을 보여주기 위한 최소 데이터
export const MIN_INTERVALS = 10;
export const MIN_PATIENTS = 5;
const MIN_INTERVAL_DAYS = 14; // 검사 간격이 이보다 짧으면 변화가 측정 오차에 묻힘
const MIN_MEAL_DAYS = 3; // 그 기간에 식단 기록이 최소 며칠은 있어야 함

// ---------- 관찰값(검사 구간) 만들기 ----------

export interface Interval {
  patientId: string;
  patientName: string;
  from: string; // 시작 검사일
  to: string; // 다음 검사일
  days: number;
  mealDays: number; // 식단 기록이 있는 날 수
  mealProteinPerDay: number; // 식사 단백질 g/일
  supplementPerDay: number; // 담백환 단백질 g/일 (순응도 반영)
  proteinPerDay: number; // 합계 g/일
  proteinPerKg: number; // 합계 g/kg/일
  startWeight: number;
  startMuscle: number;
  muscleChange4w: number; // 4주당 골격근량 변화 kg (예측 대상)
  // 보정 항목
  age: number;
  male: number; // 남=1, 여=0
  constitution: Constitution;
  muscleRatio: number; // 시작 골격근량 / 체중 × 100
  exercise: number | null; // 0~3, 모르면 null
}

export interface ExcludedCount {
  shortGap: number; // 검사 간격이 너무 짧음
  noMeals: number; // 그 사이 식단 기록 부족
}

export function buildIntervals(
  patients: Patient[],
  inbody: InbodyRecord[],
  meals: MealRecord[],
  supplementG: number | null,
): { intervals: Interval[]; excluded: ExcludedCount } {
  const intervals: Interval[] = [];
  const excluded: ExcludedCount = { shortGap: 0, noMeals: 0 };

  for (const p of patients) {
    const tests = inbody
      .filter((r) => r.patientId === p.id)
      .sort((a, b) => a.testedAt.localeCompare(b.testedAt));
    const pMeals = meals.filter((m) => m.patientId === p.id);

    for (let i = 0; i + 1 < tests.length; i++) {
      const a = tests[i];
      const b = tests[i + 1];
      const from = a.testedAt.slice(0, 10);
      const to = b.testedAt.slice(0, 10);
      const days = Math.round((Date.parse(to) - Date.parse(from)) / 86400000);
      if (days < MIN_INTERVAL_DAYS) {
        excluded.shortGap++;
        continue;
      }

      const inRange = pMeals.filter((m) => {
        const d = m.recordedAt.slice(0, 10);
        return d >= from && d < to;
      });
      const mealDays = new Set(inRange.map((m) => m.recordedAt.slice(0, 10))).size;
      if (mealDays < MIN_MEAL_DAYS) {
        excluded.noMeals++;
        continue;
      }

      const mealProteinPerDay = inRange.reduce((s, m) => s + m.nutrition.protein, 0) / mealDays;
      const supplementPerDay = (supplementG ?? 0) * (p.adherenceRate / 100);
      const proteinPerDay = mealProteinPerDay + supplementPerDay;

      intervals.push({
        patientId: p.id,
        patientName: p.name,
        from,
        to,
        days,
        mealDays,
        mealProteinPerDay,
        supplementPerDay,
        proteinPerDay,
        proteinPerKg: proteinPerDay / a.weight,
        startWeight: a.weight,
        startMuscle: a.skeletalMuscle,
        muscleChange4w: ((b.skeletalMuscle - a.skeletalMuscle) / days) * 28,
        age: p.age,
        male: p.gender === '남' ? 1 : 0,
        constitution: p.constitution,
        muscleRatio: (a.skeletalMuscle / a.weight) * 100,
        exercise: p.exercise ?? null,
      });
    }
  }
  return { intervals, excluded };
}

// ---------- 예측 항목(특성) ----------

// 예측에 쓰는 한 사람의 조건
export interface Profile {
  proteinPerKg: number;
  age: number;
  male: number;
  constitution: Constitution;
  muscleRatio: number;
  exercise: number | null;
}

interface Feature {
  key: string;
  label: string;
  value: (p: Profile, exerciseFill: number) => number;
}

const ALL_FEATURES: Feature[] = [
  { key: 'protein', label: '단백질 섭취량', value: (p) => p.proteinPerKg },
  { key: 'muscleRatio', label: '시작 근육량·체중', value: (p) => p.muscleRatio },
  { key: 'age', label: '나이', value: (p) => p.age },
  { key: 'male', label: '성별', value: (p) => p.male },
  { key: 'exercise', label: '운동량', value: (p, fill) => p.exercise ?? fill },
  { key: 'soeum', label: '체질(소음인)', value: (p) => (p.constitution === '소음인' ? 1 : 0) },
  { key: 'soyang', label: '체질(소양인)', value: (p) => (p.constitution === '소양인' ? 1 : 0) },
  { key: 'taeyang', label: '체질(태양인)', value: (p) => (p.constitution === '태양인' ? 1 : 0) },
];

export interface SkippedFactor {
  label: string;
  reason: string;
}

// 데이터 양에 맞춰 쓸 수 있는 항목만 고름 (데이터가 적은데 항목이 많으면 엉뚱한 결과가 나옴)
function chooseFeatures(rows: Interval[]): { features: Feature[]; skipped: SkippedFactor[] } {
  const n = rows.length;
  const skipped: SkippedFactor[] = [];
  const byKey = Object.fromEntries(ALL_FEATURES.map((f) => [f.key, f]));
  const varies = (vals: number[]) => Math.max(...vals) - Math.min(...vals) > 1e-9;
  const chosen: Feature[] = [byKey.protein];

  const tryAdd = (keys: string[], label: string, ok: () => string | null) => {
    const why = ok();
    if (why) {
      skipped.push({ label, reason: why });
      return;
    }
    // 항목 1개당 관찰값(구간) 5개 이상일 때만 추가
    if (n < 5 * (chosen.length + keys.length)) {
      skipped.push({ label, reason: `데이터가 더 쌓이면 반영 (구간 ${5 * (chosen.length + keys.length)}개 필요)` });
      return;
    }
    keys.forEach((k) => chosen.push(byKey[k]));
  };

  tryAdd(['muscleRatio'], '시작 근육량·체중', () =>
    varies(rows.map((r) => r.muscleRatio)) ? null : '환자 간 차이가 없음',
  );
  tryAdd(['age'], '나이', () => (varies(rows.map((r) => r.age)) ? null : '환자 간 차이가 없음'));
  tryAdd(['male'], '성별', () => {
    const males = rows.filter((r) => r.male === 1).length;
    return males >= 3 && n - males >= 3 ? null : '남녀 각각 구간 3개 이상 필요';
  });
  tryAdd(['exercise'], '운동량', () => {
    const known = rows.filter((r) => r.exercise !== null);
    if (known.length < n / 2) return '환자 상세 화면에서 운동량을 입력한 환자가 절반 미만';
    return varies(known.map((r) => r.exercise!)) ? null : '환자 간 차이가 없음';
  });
  // 체질: 기준(태음인) 외에 구간 3개 이상인 체질만
  const constKeys = (
    [
      ['soeum', '소음인'],
      ['soyang', '소양인'],
      ['taeyang', '태양인'],
    ] as const
  ).filter(([, c]) => rows.filter((r) => r.constitution === c).length >= 3);
  const taeeum = rows.filter((r) => r.constitution === '태음인').length;
  tryAdd(
    constKeys.map(([k]) => k),
    '사상체질',
    () => (taeeum >= 3 && constKeys.length > 0 ? null : '체질별로 구간 3개 이상 필요'),
  );
  return { features: chosen, skipped };
}

// ---------- 릿지 회귀 ----------

interface FittedModel {
  features: Feature[];
  mean: number[];
  sd: number[];
  coef: number[]; // 표준화된 항목의 계수 (0번은 절편)
  exerciseFill: number;
}

const LAMBDA = 1; // 과적합을 막기 위한 규제 강도

function solve(A: number[][], b: number[]): number[] {
  // 가우스 소거법
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let pivot = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[pivot][c])) pivot = r;
    [M[c], M[pivot]] = [M[pivot], M[c]];
    for (let r = 0; r < n; r++) {
      if (r === c || M[c][c] === 0) continue;
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((row, i) => (row[i] === 0 ? 0 : row[n] / row[i]));
}

function fit(rows: Interval[], features: Feature[]): FittedModel {
  const known = rows.filter((r) => r.exercise !== null).map((r) => r.exercise!);
  const exerciseFill = known.length ? known.reduce((a, b) => a + b, 0) / known.length : 1;
  const raw = rows.map((r) => features.map((f) => f.value(r, exerciseFill)));
  const k = features.length;
  const mean = Array.from({ length: k }, (_, j) => raw.reduce((s, x) => s + x[j], 0) / rows.length);
  const sd = Array.from({ length: k }, (_, j) => {
    const v = raw.reduce((s, x) => s + (x[j] - mean[j]) ** 2, 0) / rows.length;
    return Math.sqrt(v) || 1;
  });
  const X = raw.map((x) => [1, ...x.map((v, j) => (v - mean[j]) / sd[j])]);
  const y = rows.map((r) => r.muscleChange4w);
  const p = k + 1;
  const A = Array.from({ length: p }, (_, i) =>
    Array.from({ length: p }, (_, j) => X.reduce((s, x) => s + x[i] * x[j], 0) + (i === j && i > 0 ? LAMBDA : 0)),
  );
  const b = Array.from({ length: p }, (_, i) => X.reduce((s, x, n) => s + x[i] * y[n], 0));
  return { features, mean, sd, coef: solve(A, b), exerciseFill };
}

function predictWith(m: FittedModel, p: Profile): number {
  return m.features.reduce(
    (s, f, j) => s + m.coef[j + 1] * ((f.value(p, m.exerciseFill) - m.mean[j]) / m.sd[j]),
    m.coef[0],
  );
}

// 단백질 g/kg/일 1 증가당 4주 근육 변화 (kg)
function proteinSlope(m: FittedModel): number {
  return m.coef[1] / m.sd[0];
}

// 재현 가능한 난수 (부트스트랩용)
export function seededRandom(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// ---------- 결과 ----------

export interface ModelResult {
  n: number;
  patientCount: number;
  ready: boolean;
  usedFactors: string[];
  skippedFactors: SkippedFactor[];
  // 아래는 ready일 때만 의미 있음
  slopePerGkg: number; // 단백질 1 g/kg/일 증가당 4주 근육 변화 kg
  slopeLow: number; // 95% 범위 (환자 단위 부트스트랩)
  slopeHigh: number;
  looMae: number; // 처음 보는 환자 기록에 대한 평균 오차 (kg/4주)
  looR2: number;
  residualSd: number;
  proteinRange: [number, number]; // 관찰된 단백질 범위 g/kg/일
  predict: (p: Profile) => number; // 4주 근육 변화 kg
}

export function trainModel(intervals: Interval[]): ModelResult {
  const n = intervals.length;
  const patientIds = [...new Set(intervals.map((r) => r.patientId))];
  const base = {
    n,
    patientCount: patientIds.length,
    usedFactors: ['단백질 섭취량'],
    skippedFactors: [] as SkippedFactor[],
    slopePerGkg: 0,
    slopeLow: 0,
    slopeHigh: 0,
    looMae: 0,
    looR2: 0,
    residualSd: 0,
    proteinRange: [0, 0] as [number, number],
    predict: () => 0,
  };
  if (n < MIN_INTERVALS || patientIds.length < MIN_PATIENTS) return { ...base, ready: false };

  const { features, skipped } = chooseFeatures(intervals);
  const model = fit(intervals, features);

  // 환자 한 명씩 빼고 학습 → 그 환자를 맞혀보기 (처음 보는 환자에 대한 정확도)
  const errors: number[] = [];
  for (const pid of patientIds) {
    const train = intervals.filter((r) => r.patientId !== pid);
    const m = fit(train, features);
    for (const r of intervals.filter((x) => x.patientId === pid)) errors.push(r.muscleChange4w - predictWith(m, r));
  }
  const ys = intervals.map((r) => r.muscleChange4w);
  const yMean = ys.reduce((a, b) => a + b, 0) / n;
  const sst = ys.reduce((s, y) => s + (y - yMean) ** 2, 0) || 1;
  const sse = errors.reduce((s, e) => s + e * e, 0);

  // 단백질 효과의 불확실성: 환자 단위로 다시 뽑아 200번 재학습
  const rand = seededRandom(42);
  const slopes: number[] = [];
  for (let t = 0; t < 200; t++) {
    const sample: Interval[] = [];
    for (let i = 0; i < patientIds.length; i++) {
      const pid = patientIds[Math.floor(rand() * patientIds.length)];
      sample.push(...intervals.filter((r) => r.patientId === pid));
    }
    if (new Set(sample.map((r) => r.patientId)).size < 3) continue;
    slopes.push(proteinSlope(fit(sample, features)));
  }
  slopes.sort((a, b) => a - b);
  const q = (p: number) => slopes[Math.min(slopes.length - 1, Math.floor(p * slopes.length))];

  const gkg = intervals.map((r) => r.proteinPerKg);
  return {
    ...base,
    ready: true,
    usedFactors: features
      .map((f) => (f.key.startsWith('so') || f.key === 'taeyang' ? '사상체질' : f.label))
      .filter((v, i, a) => a.indexOf(v) === i),
    skippedFactors: skipped,
    slopePerGkg: proteinSlope(model),
    slopeLow: q(0.025),
    slopeHigh: q(0.975),
    looMae: errors.reduce((s, e) => s + Math.abs(e), 0) / errors.length,
    looR2: 1 - sse / sst,
    residualSd: Math.sqrt(sse / errors.length),
    proteinRange: [Math.min(...gkg), Math.max(...gkg)],
    predict: (p) => predictWith(model, p),
  };
}

// ---------- 가상 데이터 (미리보기 전용) ----------

const NAMES = '김이박최정강조윤장임한오서신권황안송류홍';
const CONSTS: Constitution[] = ['태음인', '소음인', '소양인', '태양인'];

export function makeDemoData(): { patients: Patient[]; inbody: InbodyRecord[]; meals: MealRecord[]; supplementG: number } {
  const rand = seededRandom(7);
  const normal = () => Math.sqrt(-2 * Math.log(rand() + 1e-12)) * Math.cos(2 * Math.PI * rand());
  const patients: Patient[] = [];
  const inbody: InbodyRecord[] = [];
  const meals: MealRecord[] = [];
  const supplementG = 15;

  for (let i = 0; i < 60; i++) {
    const male = rand() < 0.45;
    const age = Math.round(30 + rand() * 45);
    const weight = male ? 65 + rand() * 25 : 48 + rand() * 22;
    const ratio = (male ? 40 : 34) + normal() * 3 - (age - 50) * 0.08;
    let muscle = (weight * ratio) / 100;
    const exercise = Math.floor(rand() * 4) as ExerciseLevel;
    const constitution = CONSTS[Math.floor(rand() * (rand() < 0.1 ? 4 : 3))];
    const adherence = Math.round(50 + rand() * 50);
    const mealPerKg = 0.6 + rand() * 0.9; // 식사 단백질 g/kg/일
    const id = `D${String(i + 1).padStart(3, '0')}`;
    patients.push({
      id,
      name: `${NAMES[i % NAMES.length]}가상${i + 1}`,
      age,
      gender: male ? '남' : '여',
      chartNumber: id,
      height: 160,
      weight,
      bmi: 23,
      constitution,
      productName: '',
      adherenceRate: adherence,
      takingDays: 90,
      status: '복용중',
      dietPattern: { animalProtein: 25, plantProtein: 15, carbs: 45, fat: 15 },
      latestBia: { skeletalMuscle: muscle, bodyFat: 0, bodyFatPercent: 0, bmr: 0, bodyWater: 0, visceralFat: 0 },
      proteinChange: 0,
      lastTestDate: '2026-06-01',
      registeredAt: '2026-01-01',
      exercise,
    });

    let date = Date.parse('2026-01-05') + Math.floor(rand() * 20) * 86400000;
    const tests = 3 + Math.floor(rand() * 2);
    for (let t = 0; t < tests; t++) {
      const day = new Date(date).toISOString().slice(0, 10);
      inbody.push({
        id: `${id}-I${t}`,
        patientId: id,
        testedAt: day,
        weight,
        skeletalMuscle: Math.round(muscle * 10) / 10,
        protein: 0,
        bodyFat: 0,
        bodyFatPercent: 0,
        bmi: 0,
        bmr: 0,
        bodyWater: 0,
        visceralFat: 0,
        score: 0,
      });
      if (t === tests - 1) break;
      const gap = 28 + Math.floor(rand() * 28);
      // 이 기간의 식단 기록 (일부 날짜만 기록)
      const perKg = mealPerKg + normal() * 0.1;
      for (let d = 0; d < gap; d++) {
        if (rand() > 0.35) continue;
        const md = new Date(date + d * 86400000).toISOString().slice(0, 10);
        meals.push({
          id: `${id}-M${t}-${d}`,
          patientId: id,
          recordedAt: `${md}T12:00:00`,
          mealType: '점심',
          foodName: '가상 식단',
          nutrition: { protein: Math.round(perKg * weight * (0.9 + rand() * 0.2)), carbs: 0, fat: 0, calories: 0 },
        });
      }
      // 가상의 "정답" 관계: 단백질·운동이 많을수록, 나이가 적을수록 근육 증가
      const totalPerKg = perKg + (supplementG * adherence) / 100 / weight;
      const change4w =
        -0.35 + 0.45 * Math.min(totalPerKg, 1.8) + 0.12 * exercise - 0.006 * (age - 50) + (male ? 0.08 : 0) + normal() * 0.18;
      muscle += (change4w * gap) / 28;
      date += gap * 86400000;
    }
  }
  return { patients, inbody, meals, supplementG };
}
