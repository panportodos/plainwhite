// 데이터 분석 - 예측 모델용 코호트 분석 (체질 × 연령대 / BMI 구간)

import { useMemo, useState } from 'react';
import { Database, CheckCircle2, Circle } from 'lucide-react';
import type { InbodyRecord, Patient } from '../lib/types';
import { CONSTITUTION_MAP } from '../lib/constants';
import {
  AGE_BANDS,
  BMI_BANDS,
  CONSTITUTIONS,
  MODEL_TARGET_SAMPLES,
  buildCohortTable,
  buildSamples,
} from '../lib/prediction';

interface Props {
  patients: Patient[];
  records: InbodyRecord[];
}

// 월 증가량(kg/월)을 칸 배경색으로: 증가는 살구색, 감소는 분홍
function cellColor(rate: number | null) {
  if (rate == null) return 'transparent';
  const strength = Math.min(Math.abs(rate) / 1.0, 1); // 1kg/월 이상이면 가장 진하게
  const alpha = Math.round((0.12 + strength * 0.5) * 255)
    .toString(16)
    .padStart(2, '0');
  return rate >= 0 ? `#E8A878${alpha}` : `#D4537E${alpha}`;
}

export function CohortAnalysis({ patients, records }: Props) {
  const [by, setBy] = useState<'age' | 'bmi'>('age');
  const samples = useMemo(() => buildSamples(patients, records), [patients, records]);
  const cells = useMemo(() => buildCohortTable(samples, by), [samples, by]);
  const bands: string[] = by === 'age' ? AGE_BANDS : BMI_BANDS;

  const progress = Math.min(samples.length / MODEL_TARGET_SAMPLES, 1);
  const recordsPerPatient = patients.length ? records.length / patients.length : 0;
  const withAdherence = patients.filter((p) => p.adherenceRate > 0).length;

  const checklist = [
    { label: '인바디 2회 이상 측정한 환자', done: samples.length >= 30, detail: `${samples.length}명 / 최소 30명` },
    { label: '환자당 평균 측정 횟수 3회 이상', done: recordsPerPatient >= 3, detail: `${recordsPerPatient.toFixed(1)}회` },
    { label: '복용 순응도 기록', done: withAdherence / Math.max(patients.length, 1) >= 0.9, detail: `${withAdherence}/${patients.length}명` },
    { label: '식단(단백질 섭취량) 기록 연동', done: false, detail: '식이 관리 기록을 변수로 추가 예정' },
  ];

  return (
    <div className="mt-6 bg-white border border-border rounded-card p-6">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="text-lg font-medium text-ink">근육량 예측 모델 · 코호트 분석</h2>
          <p className="text-xs text-muted mt-1">
            인바디를 2회 이상 측정한 환자의 월평균 골격근 변화(kg/월)를 체질과 연령대·BMI로 나눠 봅니다.
            이 표가 채워질수록 환자 상세의 예측이 정확해집니다.
          </p>
        </div>
        <div className="flex border border-border rounded-lg overflow-hidden text-sm shrink-0">
          {(['age', 'bmi'] as const).map((key) => (
            <button
              key={key}
              onClick={() => setBy(key)}
              className={`px-4 py-1.5 ${by === key ? 'bg-navy text-white' : 'text-muted hover:bg-surface'}`}
            >
              {key === 'age' ? '연령대별' : 'BMI별'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* 히트맵 표 */}
        <div className="col-span-2">
          <table className="w-full text-sm border-separate border-spacing-1">
            <thead>
              <tr>
                <th className="text-left text-xs text-muted font-normal px-2">체질</th>
                {bands.map((b) => (
                  <th key={b} className="text-xs text-muted font-normal px-2">{b}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CONSTITUTIONS.map((c) => (
                <tr key={c}>
                  <td className="px-2 py-1">
                    <span className="font-medium" style={{ color: CONSTITUTION_MAP[c].color }}>
                      {CONSTITUTION_MAP[c].hanja}
                    </span>{' '}
                    <span className="text-ink">{c}</span>
                  </td>
                  {bands.map((b) => {
                    const cell = cells.find((x) => x.constitution === c && x.band === b)!;
                    return (
                      <td
                        key={b}
                        className="rounded-inner text-center py-3 border border-border"
                        style={{ backgroundColor: cellColor(cell.avgRate) }}
                      >
                        {cell.avgRate == null ? (
                          <span className="text-xs text-muted">데이터 없음</span>
                        ) : (
                          <>
                            <div className="font-medium text-ink">
                              {cell.avgRate >= 0 ? '+' : ''}
                              {cell.avgRate} <span className="text-xs text-muted">kg/월</span>
                            </div>
                            <div className="text-[11px] text-muted">{cell.n}명</div>
                          </>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-muted mt-2">칸이 진할수록 월 증가량이 큽니다. 1~2명인 칸은 우연일 수 있으니 참고만 하세요.</p>
        </div>

        {/* 데이터 축적 현황 */}
        <div className="bg-surface rounded-inner p-5">
          <div className="flex items-center gap-2 mb-3">
            <Database size={16} className="text-navy" />
            <span className="text-sm font-medium text-ink">빅데이터 축적 현황</span>
          </div>
          <div className="flex items-baseline gap-1 mb-2">
            <span className="text-3xl font-medium text-navy">{samples.length}</span>
            <span className="text-sm text-muted">/ {MODEL_TARGET_SAMPLES}명</span>
          </div>
          <div className="h-2 bg-white rounded-full overflow-hidden mb-1">
            <div className="h-full bg-apricot rounded-full" style={{ width: `${Math.max(progress * 100, 2)}%` }} />
          </div>
          <p className="text-[11px] text-muted mb-4">
            목표 {MODEL_TARGET_SAMPLES}명이 모이면 체질×연령×BMI 칸마다 의미 있는 표본이 생깁니다.
          </p>
          <ul className="space-y-2.5">
            {checklist.map((item) => (
              <li key={item.label} className="flex gap-2 text-xs">
                {item.done ? (
                  <CheckCircle2 size={15} className="text-diet-good shrink-0" />
                ) : (
                  <Circle size={15} className="text-muted shrink-0" />
                )}
                <div>
                  <div className="text-ink">{item.label}</div>
                  <div className="text-muted">{item.detail}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
