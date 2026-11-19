// 분석 리포트 데이터 만들기
// 원칙: 숫자·판정·목표는 모두 이 파일(코드)이 계산합니다.
// 문장은 지금(1단계)은 상황별 기본 문장을 쓰고, 3단계에서 AI 문장으로 바꿉니다.

import type { DietAnalysis, InbodyRecord, NutrientKey, Patient } from './types';
import { getDietByConstitution } from './dietByConstitution';
import { CONSTITUTION_MAP } from './constants';
import { NUTRIENTS, nutrientReference, pickFocusNutrients, referenceLabel, REFERENCE_SOURCE, type ReferenceType } from './nutrition';

// 식단 분석은 인바디 측정일 기준 이 기간 안의 것만 리포트에 넣음
export const DIET_VALID_DAYS = 30;
// 골격근이 직전보다 이만큼 이상 줄면 '감소' 상황
const DECLINE_THRESHOLD = 0.3;

export type Situation = 'improved' | 'no_diet' | 'first' | 'declined';
export type Verdict = 'good' | 'warn' | 'none';

export interface ReportData {
  patient: Patient;
  round: number; // 1부터
  totalRounds: number;
  record: InbodyRecord;
  first: InbodyRecord;
  prev: InbodyRecord | null;
  history: InbodyRecord[]; // 1회차 ~ 이번 회차
  situation: Situation;
  hasDiet: boolean;
  proteinStandard: number;
  dailyProteinTarget: number;
  mealTarget: number;
  changes: { muscle: number; fat: number; protein: number; weight: number }; // 첫 측정 대비
  prevChanges: { muscle: number; fat: number; protein: number } | null; // 직전 측정 대비
  // 감소 상황에서 무엇과 비교하는지 (직전 측정보다 줄었으면 prev, 아니면 첫 측정보다 줄어든 경우)
  declineBase: 'prev' | 'first' | null;
  periodWeeks: number; // 첫 측정 ~ 이번 측정
  // 이 회차의 복용 기록. 측정 당시 기록이 있으면 그 값, 최신 회차면 현재 값, 과거 회차인데 당시 기록이 없으면 null(표시 안 함)
  adherence: { rate: number; days: number | null; source: 'record' | 'current' } | null;
  step: 1 | 2 | 3;
  diet: DietSummary | null;
  goals: { nextDate: string; main: { label: string; value: string; note: string }; protein: number };
  texts: ReportTexts;
}

export interface DietSummary {
  analysis: DietAnalysis;
  days: { date: string; breakfast: number; lunch: number; dinner: number; snack: number; total: number }[];
  avg: { breakfast: number; lunch: number; dinner: number; snack: number; total: number };
  ratio: number; // 하루 목표 대비
  weakestMeal: { label: string; avg: number };
  // 3일 기록의 추정 섭취량 vs 참고 기준 (판정 없이 비율만)
  nutrients: { key: NutrientKey; label: string; unit: string; refType: ReferenceType; role: string; tip: string; avg: number; ref: number; ratio: number }[];
  focusNutrients: NutrientKey[]; // 음식 제안 대상 (기준보다 낮게 추정된 순 + 나트륨이 높게 추정된 경우)
  referenceLabel: string;
  referenceVerified: boolean;
  proteinIdeas: { title: string; grams: number; note: string }[];
}

export interface ReportTexts {
  headline: string;
  easy: string;
  paragraphs: { text: string; tone?: 'good' | 'warn' }[][]; // 문단 → 조각(강조색)
}

const r1 = (n: number) => Math.round(n * 10) / 10;
const sign = (n: number) => (n > 0 ? `+${r1(n)}` : n < 0 ? `−${r1(Math.abs(n))}` : '0');
// kg 값은 항상 소수 한 자리 (11 → 11.0)
const kg = (n: number) => n.toFixed(1);
// 받침에 따라 을/를 고르기 (단백환 지 → 단백환 지를)
function eulReul(word: string) {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  if (code < 0 || code > 11171) return `${word}을(를)`;
  return `${word}${code % 28 === 0 ? '를' : '을'}`;
}

function daysBetween(a: string, b: string) {
  return (new Date(b).getTime() - new Date(a).getTime()) / 86400000;
}

function addDays(iso: string, days: number) {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function shortDate(iso: string) {
  const d = new Date(iso);
  return `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

// 체질별 단백질 보충 음식 (약 g은 일반적인 1회 분량 기준 추정치)
const PROTEIN_FOODS: Record<string, { title: string; grams: number; note: string }[]> = {
  태음인: [
    { title: '두부 반 모', grams: 12, note: '찌개나 부침으로' },
    { title: '흰살생선 한 토막', grams: 15, note: '구이나 찜으로' },
    { title: '무가당 두유 1팩', grams: 7, note: '간식으로 단백환과 함께' },
  ],
  소음인: [
    { title: '닭가슴살 100g', grams: 23, note: '따뜻한 국이나 찜으로' },
    { title: '계란 2개', grams: 12, note: '계란찜·삶은 계란으로' },
    { title: '따뜻한 두유 1팩', grams: 7, note: '데워서 간식으로' },
  ],
  소양인: [
    { title: '오리고기 100g', grams: 18, note: '담백하게 수육·구이로' },
    { title: '새우·오징어 한 접시', grams: 15, note: '맵지 않게 데쳐서' },
    { title: '돼지 살코기 100g', grams: 20, note: '기름기 뺀 수육으로' },
  ],
  태양인: [
    { title: '새우 10마리', grams: 15, note: '데치거나 구워서' },
    { title: '조개류 한 접시', grams: 12, note: '맑은 탕으로' },
    { title: '메밀국수 한 그릇', grams: 8, note: '담백한 국물로' },
  ],
};

function buildDiet(analysis: DietAnalysis, patient: Patient, target: number): DietSummary {
  const days = analysis.daily.map((d) => ({ ...d, total: d.breakfast + d.lunch + d.dinner + d.snack }));
  const n = days.length || 1;
  const avg = {
    breakfast: r1(days.reduce((s, d) => s + d.breakfast, 0) / n),
    lunch: r1(days.reduce((s, d) => s + d.lunch, 0) / n),
    dinner: r1(days.reduce((s, d) => s + d.dinner, 0) / n),
    snack: r1(days.reduce((s, d) => s + d.snack, 0) / n),
    total: r1(days.reduce((s, d) => s + d.total, 0) / n),
  };
  const meals = [
    { label: '아침', avg: avg.breakfast },
    { label: '점심', avg: avg.lunch },
    { label: '저녁', avg: avg.dinner },
  ];
  const weakestMeal = meals.reduce((a, b) => (b.avg < a.avg ? b : a));

  const nutrients = NUTRIENTS.map((info) => {
    const value = analysis.nutrients[info.key];
    const ref = nutrientReference(info.key, patient.gender, patient.age);
    const ratio = value / ref;
    return { ...info, avg: value, ref, ratio };
  });

  // 부족분을 체질 음식으로 채우는 제안 (부족량을 넘을 때까지 최대 2개)
  const gap = Math.max(0, target - avg.total);
  const foods = PROTEIN_FOODS[patient.constitution] ?? [];
  const proteinIdeas: DietSummary['proteinIdeas'] = [];
  let filled = 0;
  for (const f of foods) {
    if (filled >= gap || proteinIdeas.length >= 2) break;
    proteinIdeas.push({
      ...f,
      note: proteinIdeas.length === 0 ? `${weakestMeal.label}에 추가 · ${f.note}` : f.note,
    });
    filled += f.grams;
  }

  return {
    analysis,
    days,
    avg,
    ratio: avg.total / target,
    weakestMeal,
    nutrients,
    focusNutrients: pickFocusNutrients(nutrients).map((n) => n.key),
    referenceLabel: referenceLabel(patient.gender, patient.age),
    referenceVerified: REFERENCE_SOURCE.verified,
    proteinIdeas,
  };
}

export function buildReport(
  patient: Patient,
  allRecords: InbodyRecord[],
  dietAnalyses: DietAnalysis[],
  round?: number,
): ReportData | null {
  const records = [...allRecords].sort((a, b) => a.testedAt.localeCompare(b.testedAt));
  if (!records.length) return null;
  const idx = round && round >= 1 && round <= records.length ? round - 1 : records.length - 1;
  const record = records[idx];
  const first = records[0];
  const prev = idx > 0 ? records[idx - 1] : null;
  const history = records.slice(0, idx + 1);

  const proteinStandard = patient.gender === '남' ? 10 : 7.5;
  const bonus = getDietByConstitution(patient.constitution)?.proteinBonus ?? 0;
  const dailyProteinTarget = Math.round(record.weight * 1.2 + bonus);
  const mealTarget = Math.round(dailyProteinTarget / 3);

  // 인바디 측정일 기준 30일 안에 끝난 식단 분석 중 가장 최근 것
  const analysis = dietAnalyses
    .filter((d) => d.patientId === patient.id)
    .filter((d) => {
      const gapDays = daysBetween(d.to, record.testedAt);
      return gapDays >= 0 && gapDays <= DIET_VALID_DAYS;
    })
    .sort((a, b) => b.to.localeCompare(a.to))[0];
  const diet = analysis ? buildDiet(analysis, patient, dailyProteinTarget) : null;

  const changes = {
    muscle: r1(record.skeletalMuscle - first.skeletalMuscle),
    fat: r1(record.bodyFat - first.bodyFat),
    protein: r1(record.protein - first.protein),
    weight: r1(record.weight - first.weight),
  };
  const prevChanges = prev
    ? {
        muscle: r1(record.skeletalMuscle - prev.skeletalMuscle),
        fat: r1(record.bodyFat - prev.bodyFat),
        protein: r1(record.protein - prev.protein),
      }
    : null;

  let situation: Situation;
  let declineBase: ReportData['declineBase'] = null;
  if (!prev) situation = 'first';
  else if (prevChanges && prevChanges.muscle <= -DECLINE_THRESHOLD) {
    situation = 'declined';
    declineBase = 'prev';
  } else if (changes.muscle <= -DECLINE_THRESHOLD) {
    situation = 'declined';
    declineBase = 'first';
  } else if (!diet) situation = 'no_diet';
  else situation = 'improved';

  const step: 1 | 2 | 3 = record.protein < proteinStandard ? 1 : 2;

  const isLatest = idx === records.length - 1;
  const adherence: ReportData['adherence'] =
    record.adherenceRate !== undefined
      ? { rate: record.adherenceRate, days: record.takingDays ?? null, source: 'record' }
      : isLatest
        ? { rate: patient.adherenceRate, days: patient.takingDays, source: 'current' }
        : null;
  const periodWeeks = Math.round(daysBetween(first.testedAt, record.testedAt) / 7);

  const nextDate = addDays(record.testedAt, 28);
  let main: ReportData['goals']['main'];
  if (record.protein < proteinStandard) {
    main = { label: '몸속 단백질량 목표', value: `${proteinStandard.toFixed(1)}kg`, note: `표준 도달 (지금보다 +${r1(proteinStandard - record.protein)}kg)` };
  } else if (situation === 'declined' && prev) {
    const base = declineBase === 'prev' ? prev : first;
    main = { label: '골격근량 목표', value: `${base.skeletalMuscle}kg`, note: declineBase === 'prev' ? '지난 측정 수준 되찾기' : '첫 측정 수준 되찾기' };
  } else {
    main = { label: '골격근량 목표', value: `${r1(record.skeletalMuscle + 0.5)}kg`, note: '지금보다 +0.5kg' };
  }

  const data: Omit<ReportData, 'texts'> = {
    patient,
    round: idx + 1,
    totalRounds: records.length,
    record,
    first,
    prev,
    history,
    situation,
    hasDiet: !!diet,
    proteinStandard,
    dailyProteinTarget,
    mealTarget,
    changes,
    prevChanges,
    declineBase,
    periodWeeks,
    adherence,
    step,
    diet,
    goals: { nextDate, main, protein: dailyProteinTarget },
  };
  return { ...data, texts: defaultTexts(data) };
}

// ---------- 상황별 기본 문장 (AI 문장이 없거나 검사에 걸렸을 때도 이 문장을 씀) ----------

export function defaultTexts(d: Omit<ReportData, 'texts'>): ReportTexts {
  const p = d.patient;
  const product = CONSTITUTION_MAP[p.constitution].productName;
  const foods = (getDietByConstitution(p.constitution)?.recommended ?? []).slice(0, 2).join('·');
  const belowStd = d.record.protein < d.proteinStandard;

  // 식단 문단 (있으면 분석 결과, 없으면 안내)
  const dietPara: ReportTexts['paragraphs'][number] = d.diet
    ? (() => {
        const focus = d.diet.nutrients.filter((n) => d.diet!.focusNutrients.includes(n.key));
        const low = focus.filter((n) => n.key !== 'sodium').slice(0, 2).map((n) => `${n.label} ${Math.round(n.ratio * 100)}%`);
        const high = focus.filter((n) => n.key === 'sodium').map((n) => `${n.label} ${Math.round(n.ratio * 100)}%`);
        const parts: ReportTexts['paragraphs'][number] = [
          { text: '가져오신 3일 치 식단을 보면 하루 단백질 섭취가 ' },
          { text: `평균 ${d.diet.avg.total}g으로 목표 ${d.dailyProteinTarget}g의 ${Math.round(d.diet.ratio * 100)}%`, tone: d.diet.ratio >= 1 ? 'good' : 'warn' },
          { text: d.diet.ratio >= 1 ? '로 목표를 채우고 있습니다. ' : '에 머물러 있고, 특히 ' },
        ];
        if (d.diet.ratio < 1) {
          parts.push({ text: `${d.diet.weakestMeal.label}(평균 ${d.diet.weakestMeal.avg}g)이 가장 부족`, tone: 'warn' });
          parts.push({ text: '했습니다. ' });
        }
        if (low.length || high.length) {
          parts.push({ text: '같은 3일 기록으로 추정한 섭취량을 참고 기준과 비교하면 ' });
          const bits = [];
          if (low.length) bits.push(`${low.join(', ')}로 기준보다 낮${high.length ? '고' : '게 나왔습니다'}`);
          if (high.length) bits.push(`${high.join(', ')}로 기준보다 높게 나왔습니다`);
          parts.push({ text: bits.join(', '), tone: 'warn' });
          parts.push({ text: '. 사진으로 추정한 값이니 식단 분석 페이지의 음식 제안을 참고해 주세요.' });
        }
        return parts;
      })()
    : [
        { text: '이번 회차에는 ' },
        { text: '최근 한 달 안의 식단 기록이 없어', tone: 'warn' },
        { text: ` 식단과 비타민·무기질 분석은 빠졌습니다. 다음 내원 전 3일 동안 끼니마다 사진을 찍어 오시면 하루 단백질이 목표 ${d.dailyProteinTarget}g에 얼마나 닿는지 함께 확인해 드립니다.` },
      ];

  if (d.situation === 'first') {
    return {
      headline: belowStd
        ? `첫 측정 · 몸속 단백질량 ${kg(d.record.protein)}kg, 표준(${d.proteinStandard}kg)까지 ${r1(d.proteinStandard - d.record.protein)}kg`
        : `첫 측정 · 몸속 단백질량 ${kg(d.record.protein)}kg, 표준(${d.proteinStandard}kg) 이상`,
      easy: belowStd
        ? `몸속 단백질량이 ${kg(d.record.protein)}kg으로 표준(${d.proteinStandard}kg)에 조금 모자라요. 몸무게 ${kg(d.record.weight)}kg 중 지방이 ${kg(d.record.bodyFat)}kg(${d.record.bodyFatPercent}%)이에요. 근육을 늘리려면 먼저 매일 단백질을 채우는 습관부터 시작합니다.`
        : `몸속 단백질량이 ${kg(d.record.protein)}kg으로 표준(${d.proteinStandard}kg) 이상이에요. 몸무게 ${kg(d.record.weight)}kg 중 지방이 ${kg(d.record.bodyFat)}kg(${d.record.bodyFatPercent}%)이에요. 이제 근육을 늘리는 단계로 시작합니다.`,
      paragraphs: [
        [
          { text: `${p.name} 님의 첫 인바디 측정 결과, 몸속 단백질량은 ` },
          { text: belowStd ? `${kg(d.record.protein)}kg으로 표준(${d.proteinStandard}kg)에 조금 못 미치고` : `${kg(d.record.protein)}kg으로 표준(${d.proteinStandard}kg) 이상이고`, tone: belowStd ? 'warn' : 'good' },
          { text: `, 체지방률은 ${d.record.bodyFatPercent}%입니다.` },
        ],
        d.diet
          ? dietPara
          : [
              { text: `오늘부터 ${eulReul(product)} 하루 2회 복용하며 ` },
              { text: `하루 단백질 ${d.dailyProteinTarget}g`, tone: 'good' },
              { text: '을 목표로 시작합니다.' },
            ],
        [{ text: `다음 측정(${shortDate(d.goals.nextDate)}) 전 3일 동안 식단 사진을 찍어 오시면 식단과 비타민·무기질 분석도 함께 받아보실 수 있습니다.` }],
      ],
    };
  }

  if (d.situation === 'declined' && d.prev) {
    const fromPrev = d.declineBase === 'prev' && d.prevChanges;
    const ch = fromPrev ? d.prevChanges! : d.changes;
    const baseRec = fromPrev ? d.prev : d.first;
    const baseName = fromPrev ? '지난 측정' : '첫 측정';
    const muscleDrop = r1(Math.abs(ch.muscle));
    return {
      headline: `${baseName}보다 골격근 ${sign(ch.muscle)}kg · 다시 채워갈 4주`,
      easy: `${baseName}보다 근육이 ${kg(muscleDrop)}kg 줄었어요.${
        fromPrev && d.changes.muscle > 0 ? ` 그래도 처음(${shortDate(d.first.testedAt)})보다는 근육이 ${kg(d.changes.muscle)}kg 많아요.` : ''
      } 다시 꾸준히 채우는 것이 다음 4주의 목표입니다.`,
      paragraphs: [
        [
          { text: `${baseName}과 비교해 ` },
          { text: `골격근이 ${kg(muscleDrop)}kg 줄었${ch.fat > 0 ? `고 체지방은 ${kg(ch.fat)}kg 늘었습니다` : ch.fat < 0 ? `고 체지방은 ${kg(Math.abs(ch.fat))}kg 줄었습니다` : '습니다'}`, tone: 'warn' },
          { text: '. ' },
          ...(fromPrev && d.changes.muscle > 0
            ? [
                { text: '그래도 처음 측정과 비교하면 ' },
                { text: `골격근은 ${kg(d.changes.muscle)}kg 많습니다`, tone: 'good' as const },
                { text: '.' },
              ]
            : d.record.protein >= d.proteinStandard
              ? [
                  { text: '그래도 ' },
                  { text: `몸속 단백질량은 ${kg(d.record.protein)}kg으로 표준 이상을 유지`, tone: 'good' as const },
                  { text: '하고 있습니다.' },
                ]
              : []),
        ],
        dietPara,
        [
          { text: `다음 4주는 ${product} 하루 2회를 다시 꾸준히 이어가며 ` },
          { text: `${baseName} 수준(골격근 ${kg(baseRec.skeletalMuscle)}kg)을 되찾는 것`, tone: 'good' },
          { text: '을 목표로 합니다.' },
        ],
      ],
    };
  }

  // 기본(좋아짐) · 식단 없음
  const muscleUp = d.changes.muscle > 0;
  const fatDown = d.changes.fat < 0;
  const trend = muscleUp && fatDown ? '골격근은 늘고 체지방은 줄어드는 흐름' : muscleUp ? '골격근이 늘어나는 흐름' : '체성분을 유지하는 흐름';
  const headlineParts = [`${d.periodWeeks}주간 골격근 ${sign(d.changes.muscle)}kg`, `체지방 ${sign(d.changes.fat)}kg`];
  const passedStd = d.first.protein < d.proteinStandard && d.record.protein >= d.proteinStandard;

  return {
    headline: headlineParts.join(' · ') + (passedStd ? ', 단백질량 표준 도달' : ''),
    easy:
      (muscleUp ? `근육이 ${kg(d.changes.muscle)}kg 늘었어요.` : `근육량은 비슷하게 유지되고 있어요.`) +
      (fatDown ? ` 그동안 체지방은 ${kg(Math.abs(d.changes.fat))}kg 줄었어요.` : '') +
      (passedStd
        ? ` 처음 ${kg(d.first.protein)}kg으로 표준(${d.proteinStandard}kg)에 못 미치던 몸속 단백질량이 지금은 ${kg(d.record.protein)}kg으로 표준을 넘었습니다.`
        : ` 몸속 단백질량은 ${kg(d.record.protein)}kg이에요 (표준 ${d.proteinStandard}kg).`),
    paragraphs: [
      [
        ...(d.adherence
          ? [
              { text: `${p.name} 님의 인바디${d.diet ? '·식단' : ''}·복용 기록을 분석한 결과, ${eulReul(product)} ` },
              { text: `${d.adherence.rate}%의 순응도`, tone: (d.adherence.rate >= 80 ? 'good' : 'warn') as 'good' | 'warn' },
              { text: `로 복용한 ${d.periodWeeks}주 동안 ` },
            ]
          : [{ text: `${p.name} 님의 인바디${d.diet ? '·식단' : ''} 기록을 분석한 결과, ${d.periodWeeks}주 동안 ` }]),
        { text: trend, tone: 'good' },
        { text: `이 ${d.round}번의 측정에서 이어졌습니다.` },
      ],
      dietPara,
      [
        { text: `지금처럼 ${product} 복용을 이어가면서 ` },
        {
          text: d.diet && d.diet.ratio < 1 ? `${d.diet.weakestMeal.label}에 ${foods} 같은 음식을 한 가지 더하는 것` : `${foods} 위주로 세 끼를 고르게 드시는 것`,
          tone: 'good',
        },
        { text: '을 다음 측정까지의 실천 목표로 권합니다.' },
      ],
    ],
  };
}
