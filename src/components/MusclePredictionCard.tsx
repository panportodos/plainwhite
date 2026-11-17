// 환자 상세 - 근육량 증가 예측 카드 (베타)

import { useMemo } from 'react';
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Sparkles, Info } from 'lucide-react';
import type { InbodyRecord, Patient } from '../lib/types';
import { predictMuscleGain } from '../lib/prediction';

interface Props {
  patient: Patient;
  patientRecords: InbodyRecord[];
  allPatients: Patient[];
  allRecords: InbodyRecord[];
}

const CONFIDENCE_STYLE = {
  낮음: 'bg-surface text-muted',
  보통: 'bg-apricot/20 text-apricot-ink',
  높음: 'bg-diet-good/15 text-diet-good',
} as const;

function shortDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}.${d.getDate()}`;
}

export function MusclePredictionCard({ patient, patientRecords, allPatients, allRecords }: Props) {
  const prediction = useMemo(
    () => predictMuscleGain(patient, allPatients, allRecords),
    [patient, allPatients, allRecords],
  );

  if (!prediction) {
    return (
      <div className="bg-white border border-border rounded-card p-6 mb-6">
        <h2 className="text-lg font-medium text-ink mb-2">근육량 증가 예측</h2>
        <p className="text-sm text-muted">인바디를 1회 이상 측정하면 예측을 볼 수 있습니다.</p>
      </div>
    );
  }

  const sorted = [...patientRecords].sort((a, b) => a.testedAt.localeCompare(b.testedAt));
  type Row = { label: string; actual?: number; mid?: number; range?: number[] };
  const chartData: Row[] = [
    ...sorted.map((r, i) => ({
      label: shortDate(r.testedAt),
      actual: r.skeletalMuscle,
      // 마지막 실측점에서 예측선이 이어지도록
      ...(i === sorted.length - 1 ? { mid: r.skeletalMuscle, range: [r.skeletalMuscle, r.skeletalMuscle] } : {}),
    })),
    ...prediction.points.slice(1).map((p) => ({
      label: `+${p.week}주`,
      mid: p.mid,
      range: [p.low, p.high],
    })),
  ];

  const week12 = prediction.points[prediction.points.length - 1];
  const gain = Math.round((week12.mid - prediction.baseMuscle) * 10) / 10;
  const allValues = chartData.flatMap((d) => [d.actual, ...(d.range ?? [])]).filter((v): v is number => v != null);
  const yMin = Math.floor(Math.min(...allValues) - 1);
  const yMax = Math.ceil(Math.max(...allValues) + 1);

  return (
    <div className="bg-white border border-border rounded-card p-6 mb-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-apricot" />
            <h2 className="text-lg font-medium text-ink">근육량 증가 예측</h2>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-navy text-white">베타</span>
          </div>
          <p className="text-xs text-muted mt-1">
            체질·연령대·BMI가 비슷한 환자의 실제 인바디 변화를 바탕으로 앞으로 12주를 예측합니다
          </p>
        </div>
        <span className={`text-xs px-3 py-1 rounded-full ${CONFIDENCE_STYLE[prediction.confidence]}`}>
          예측 신뢰도 {prediction.confidence}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* 요약 숫자 */}
        <div className="col-span-1 space-y-4">
          <div className="bg-surface rounded-inner p-4">
            <div className="text-xs text-muted mb-1">12주 후 골격근량 (예상)</div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-medium text-navy">{week12.mid}</span>
              <span className="text-sm text-muted">kg</span>
              <span className={`text-sm font-medium ${gain >= 0 ? 'text-diet-good' : 'text-pink'}`}>
                {gain >= 0 ? '+' : ''}
                {gain.toFixed(1)}kg
              </span>
            </div>
            <div className="text-xs text-muted mt-1">
              예상 범위 {week12.low} ~ {week12.high} kg
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {prediction.factors.map((f) => (
              <div key={f.label} className="border border-border rounded-inner px-3 py-2">
                <div className="text-[11px] text-muted">{f.label}</div>
                <div className="text-sm text-ink">{f.value}</div>
              </div>
            ))}
          </div>

          <div className="text-xs text-muted leading-relaxed flex gap-2">
            <Info size={14} className="shrink-0 mt-0.5" />
            <span>
              비교 환자 {prediction.cohortSize}명 (같은 체질 {prediction.sameConstitutionSize}명)
              {prediction.usedOwnTrend ? ' + 본인 측정 추세' : ''} 기준입니다. 데이터가 쌓일수록 범위가 좁아지고
              신뢰도가 올라갑니다. 진료 참고용이며 진단이 아닙니다.
            </span>
          </div>
        </div>

        {/* 실측 + 예측 그래프 */}
        <div className="col-span-2">
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ECE9E2" />
              <XAxis dataKey="label" stroke="#A89B76" style={{ fontSize: '11px' }} />
              <YAxis domain={[yMin, yMax]} stroke="#A89B76" style={{ fontSize: '11px' }} unit="kg" width={52} />
              <Tooltip
                contentStyle={{ background: '#fff', border: '1px solid #ECE9E2', borderRadius: 8, fontSize: 12 }}
                formatter={(value, name) => {
                  if (Array.isArray(value)) return [`${value[0]} ~ ${value[1]} kg`, '예상 범위'];
                  return [`${value} kg`, name === 'actual' ? '실측 골격근량' : '예상 골격근량'];
                }}
              />
              <ReferenceLine x={shortDate(prediction.baseDate)} stroke="#A89B76" strokeDasharray="2 4" label={{ value: '오늘 기준', fontSize: 11, fill: '#A89B76', position: 'insideTopRight' }} />
              <Area dataKey="range" stroke="none" fill="#E8A878" fillOpacity={0.25} isAnimationActive={false} />
              <Line dataKey="actual" stroke="#1B2A4A" strokeWidth={2.5} dot={{ r: 4 }} connectNulls={false} />
              <Line dataKey="mid" stroke="#E8A878" strokeWidth={2.5} strokeDasharray="6 4" dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-5 text-xs text-muted justify-center mt-1">
            <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-navy inline-block" />실측</span>
            <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 border-t-2 border-dashed border-apricot inline-block" />예측</span>
            <span className="flex items-center gap-1.5"><span className="w-4 h-3 bg-apricot/25 inline-block rounded-sm" />예상 범위</span>
          </div>
        </div>
      </div>
    </div>
  );
}
