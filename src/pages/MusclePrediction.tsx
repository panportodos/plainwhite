// 근육량 예측 페이지 - 쌓인 환자 기록으로 "단백질을 얼마나 먹으면 근육이 얼마나 늘어나는지" 예측

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ComposedChart,
  Scatter,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceDot,
  ReferenceLine,
} from 'recharts';
import { AlertCircle, Database, FlaskConical, Info } from 'lucide-react';
import { Topbar } from '../components/Topbar';
import { getAllPatients, getAllInbodyRecords, getMealRecords, getInbodyRecords } from '../lib/storage';
import {
  buildIntervals,
  trainModel,
  makeDemoData,
  getSupplementProtein,
  setSupplementProtein,
  EXERCISE_LABELS,
  MIN_INTERVALS,
  MIN_PATIENTS,
  type Profile,
} from '../lib/musclePrediction';
import type { ExerciseLevel } from '../lib/types';

const fmt = (n: number, d = 2) => (n > 0 ? '+' : '') + n.toFixed(d);

export function MusclePrediction() {
  const [mode, setMode] = useState<'real' | 'demo'>('real');
  const [supplementInput, setSupplementInput] = useState(getSupplementProtein()?.toString() ?? '');
  const [supplementG, setSupplementG] = useState(getSupplementProtein());

  // 데이터 준비 (실제 기록 또는 가상 데이터)
  const data = useMemo(() => {
    if (mode === 'demo') return makeDemoData();
    return {
      patients: getAllPatients(),
      inbody: getAllInbodyRecords(),
      meals: getMealRecords(),
      supplementG,
    };
  }, [mode, supplementG]);

  const { intervals, excluded } = useMemo(
    () => buildIntervals(data.patients, data.inbody, data.meals, data.supplementG),
    [data],
  );
  const model = useMemo(() => trainModel(intervals), [intervals]);

  return (
    <div>
      <Topbar title="근육량 예측" subtitle="쌓인 환자 기록으로 단백질 섭취량에 따른 골격근량 변화를 예측합니다" />

      <div className="p-8 max-w-[1200px] space-y-6">
        {/* 데이터 선택 */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMode('real')}
            className={`px-4 py-2 rounded-full text-sm ${mode === 'real' ? 'bg-navy text-white' : 'bg-white border border-border text-ink'}`}
          >
            <span className="flex items-center gap-1.5">
              <Database size={14} /> 실제 기록
            </span>
          </button>
          <button
            onClick={() => setMode('demo')}
            className={`px-4 py-2 rounded-full text-sm ${mode === 'demo' ? 'bg-navy text-white' : 'bg-white border border-border text-ink'}`}
          >
            <span className="flex items-center gap-1.5">
              <FlaskConical size={14} /> 가상 데이터로 미리보기
            </span>
          </button>
        </div>

        {mode === 'demo' && (
          <div className="flex items-start gap-2 bg-pink/10 border border-pink/30 rounded-lg p-4 text-sm text-ink">
            <AlertCircle size={18} className="text-pink shrink-0 mt-0.5" />
            <span>
              <b>가상 데이터입니다.</b> 실제 환자와 무관하며, 기능이 어떻게 보이는지 확인하는 용도입니다. 가상 환자 60명,
              담백환 1일 단백질 15g으로 만들었습니다. 이 숫자로 진료 판단을 하지 마세요.
            </span>
          </div>
        )}

        {/* 담백환 단백질 설정 (실제 기록일 때) */}
        {mode === 'real' && (
          <div className="bg-white border border-border rounded-card p-6">
            <h2 className="text-base font-bold text-ink mb-1">담백환 하루 복용량의 단백질</h2>
            <p className="text-xs text-muted mb-3">
              먹은 단백질 = 식단 기록의 단백질 + (담백환 단백질 × 복용 순응도). 비워 두면 식사만 계산합니다.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                step={0.5}
                value={supplementInput}
                onChange={(e) => setSupplementInput(e.target.value)}
                placeholder="예: 15"
                className="w-32 px-3 py-2 border border-border rounded-lg text-sm"
              />
              <span className="text-sm text-muted">g / 일</span>
              <button
                onClick={() => {
                  const v = supplementInput.trim() === '' ? null : Number(supplementInput);
                  setSupplementProtein(v);
                  setSupplementG(v);
                }}
                className="px-4 py-2 bg-navy text-white rounded-lg text-sm"
              >
                저장
              </button>
              {supplementG === null && <span className="text-xs text-pink ml-2">아직 입력되지 않음 (식사만 계산 중)</span>}
            </div>
          </div>
        )}

        {/* 데이터 현황 */}
        <DataStatus
          n={model.n}
          patientCount={model.patientCount}
          excluded={excluded}
          ready={model.ready}
        />

        {model.ready && (
          <>
            <ModelSummary model={model} intervals={intervals} />
            <Simulator model={model} mode={mode} demoPatients={mode === 'demo' ? data.patients : null} />
          </>
        )}

        <div className="text-xs text-muted leading-relaxed bg-surface rounded-lg p-4 flex gap-2">
          <Info size={14} className="shrink-0 mt-0.5" />
          <span>
            이 예측은 한의원에 쌓인 관찰 기록에서 찾은 <b>경향</b>이며, 단백질이 근육을 늘린다는 인과관계를 증명하지
            않습니다. 단백질을 많이 먹는 환자가 운동도 더 하는 등 기록되지 않은 차이가 결과에 섞여 있을 수 있습니다. 인바디
            골격근량 자체에도 측정마다 ±0.5kg 안팎의 오차가 있습니다. 진료 참고용으로만 사용하세요.
          </span>
        </div>
      </div>
    </div>
  );
}

// ---------- 데이터 현황 ----------

function ProgressBar({ value, goal, label }: { value: number; goal: number; label: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted">{label}</span>
        <span className="text-ink font-medium">
          {value} / {goal}
        </span>
      </div>
      <div className="h-2 bg-surface rounded-full overflow-hidden">
        <div className="h-full bg-apricot rounded-full" style={{ width: `${Math.min(100, (value / goal) * 100)}%` }} />
      </div>
    </div>
  );
}

function DataStatus({
  n,
  patientCount,
  excluded,
  ready,
}: {
  n: number;
  patientCount: number;
  excluded: { shortGap: number; noMeals: number };
  ready: boolean;
}) {
  return (
    <div className="bg-white border border-border rounded-card p-6">
      <h2 className="text-lg font-bold text-ink mb-1">데이터 현황</h2>
      <p className="text-xs text-muted mb-4">
        인바디 검사 두 번 사이의 기간(2주 이상)마다, 그동안 먹은 단백질과 골격근량 변화를 하나의 자료로 씁니다.
      </p>
      <div className="grid grid-cols-2 gap-6">
        <ProgressBar value={n} goal={MIN_INTERVALS} label="분석 가능한 검사 구간" />
        <ProgressBar value={patientCount} goal={MIN_PATIENTS} label="환자 수" />
      </div>
      {(excluded.noMeals > 0 || excluded.shortGap > 0) && (
        <p className="text-xs text-muted mt-3">
          제외된 구간: 그 사이 식단 기록 3일 미만 {excluded.noMeals}개
          {excluded.shortGap > 0 && ` · 검사 간격 2주 미만 ${excluded.shortGap}개`}
        </p>
      )}
      {!ready && (
        <div className="mt-4 bg-surface rounded-lg p-4 text-sm text-ink">
          <p className="font-medium mb-2">아직 예측하기에는 데이터가 부족합니다. 이렇게 쌓아 주세요.</p>
          <ol className="list-decimal pl-5 space-y-1 text-muted">
            <li>환자마다 인바디를 2주 이상 간격으로 2회 이상 측정해 기록합니다.</li>
            <li>
              그 사이 식단 사진을 최소 3일 이상 올립니다 (<b>환자 관리 → 식이 관리 → 사진으로 추가</b>).
            </li>
            <li>환자 상세 화면에서 운동량을 입력하면 운동 효과도 함께 보정됩니다.</li>
          </ol>
          <p className="text-xs text-muted mt-3">
            위의 <b>가상 데이터로 미리보기</b>를 누르면 데이터가 쌓였을 때 화면이 어떻게 보이는지 확인할 수 있습니다.
          </p>
        </div>
      )}
    </div>
  );
}

// ---------- 모델 요약 ----------

function ModelSummary({
  model,
  intervals,
}: {
  model: ReturnType<typeof trainModel>;
  intervals: ReturnType<typeof buildIntervals>['intervals'];
}) {
  const avgWeight = intervals.reduce((s, r) => s + r.startWeight, 0) / intervals.length;
  const per10g = (model.slopePerGkg * 10) / avgWeight; // 하루 10g 더 먹을 때 4주 근육 변화
  const per10gLow = (model.slopeLow * 10) / avgWeight;
  const per10gHigh = (model.slopeHigh * 10) / avgWeight;
  const clear = model.slopeLow > 0 || model.slopeHigh < 0;

  // 산점도: 각 구간의 실제값 + 평균적인 환자의 예측선
  const avgProfile: Profile = {
    proteinPerKg: 0,
    age: intervals.reduce((s, r) => s + r.age, 0) / intervals.length,
    male: intervals.reduce((s, r) => s + r.male, 0) / intervals.length,
    constitution: '태음인',
    muscleRatio: intervals.reduce((s, r) => s + r.muscleRatio, 0) / intervals.length,
    exercise: null,
  };
  const [lo, hi] = model.proteinRange;
  const points = intervals.map((r) => ({ x: +r.proteinPerKg.toFixed(2), y: +r.muscleChange4w.toFixed(2), name: r.patientName }));
  const line = [lo, hi].map((x) => ({ x: +x.toFixed(2), fit: +model.predict({ ...avgProfile, proteinPerKg: x }).toFixed(2) }));

  return (
    <div className="bg-white border border-border rounded-card p-6">
      <h2 className="text-lg font-bold text-ink mb-4">분석 결과</h2>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-surface rounded-lg p-4 col-span-2">
          <p className="text-xs text-muted">하루 단백질을 10g 더 먹으면 (4주 기준, 체중 {avgWeight.toFixed(0)}kg 환자)</p>
          <p className="text-3xl font-bold text-navy mt-1">
            {fmt(per10g)} <span className="text-base text-muted font-medium">kg 골격근</span>
          </p>
          <p className="text-xs text-muted mt-1">
            95% 범위 {fmt(per10gLow)} ~ {fmt(per10gHigh)} kg
            {clear ? '' : ' · 범위에 0이 포함되어 아직 효과가 분명하지 않습니다'}
          </p>
        </div>
        <div className="bg-surface rounded-lg p-4">
          <p className="text-xs text-muted">예측 정확도</p>
          <p className="text-3xl font-bold text-apricot mt-1">
            ±{model.looMae.toFixed(2)} <span className="text-base text-muted font-medium">kg</span>
          </p>
          <p className="text-xs text-muted mt-1">처음 보는 환자에 대한 4주 근육 변화 평균 오차</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-2 text-xs">
        <span className="text-muted">반영한 항목:</span>
        {model.usedFactors.map((f) => (
          <span key={f} className="px-2 py-0.5 rounded-full bg-navy/10 text-navy">
            {f}
          </span>
        ))}
      </div>
      {model.skippedFactors.length > 0 && (
        <div className="text-xs text-muted mb-4 space-y-0.5">
          {model.skippedFactors.map((s) => (
            <p key={s.label}>
              · {s.label}: {s.reason}
            </p>
          ))}
        </div>
      )}

      <p className="text-sm font-medium text-ink mt-4 mb-2">단백질 섭취량과 4주 골격근 변화 (점 1개 = 검사 구간 1개)</p>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ECE9E2" />
            <XAxis
              type="number"
              dataKey="x"
              domain={['dataMin - 0.1', 'dataMax + 0.1']}
              tickFormatter={(v) => v.toFixed(1)}
              tick={{ fontSize: 12, fill: '#A89B76' }}
              label={{ value: '하루 단백질 (g/kg 체중)', position: 'insideBottom', offset: -10, fontSize: 12, fill: '#A89B76' }}
            />
            <YAxis
              type="number"
              tick={{ fontSize: 12, fill: '#A89B76' }}
              label={{ value: '근육 변화 kg/4주', angle: -90, position: 'insideLeft', fontSize: 12, fill: '#A89B76' }}
            />
            <ReferenceLine y={0} stroke="#A89B76" />
            <Tooltip
              formatter={(v, k) => [`${v}`, k === 'fit' ? '예측선' : k === 'y' ? '근육 변화' : String(k)]}
              labelFormatter={(v) => `단백질 ${v} g/kg`}
            />
            <Scatter data={points} dataKey="y" fill="#E8A878" fillOpacity={0.7} />
            <Line data={line} dataKey="fit" stroke="#1B2A4A" strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[11px] text-muted">선: 평균적인 환자 조건에서의 예측. 다른 항목(나이·운동 등)의 영향은 점에 섞여 있습니다.</p>
    </div>
  );
}

// ---------- 시뮬레이터 ----------

function Simulator({
  model,
  mode,
  demoPatients,
}: {
  model: ReturnType<typeof trainModel>;
  mode: 'real' | 'demo';
  demoPatients: ReturnType<typeof getAllPatients> | null;
}) {
  const patients = demoPatients ?? getAllPatients();
  const [patientId, setPatientId] = useState(patients[0]?.id ?? '');
  const patient = patients.find((p) => p.id === patientId) ?? patients[0];

  // 환자의 최신 체중·근육량 (실제 기록 모드에서는 인바디 최신값)
  const latest = useMemo(() => {
    if (!patient) return null;
    const recs = mode === 'real' ? getInbodyRecords(patient.id) : [];
    const last = recs.sort((a, b) => a.testedAt.localeCompare(b.testedAt)).at(-1);
    return {
      weight: last?.weight ?? patient.weight,
      muscle: last?.skeletalMuscle ?? patient.latestBia.skeletalMuscle,
    };
  }, [patient, mode]);

  const [proteinG, setProteinG] = useState(80);
  const [weeks, setWeeks] = useState(12);
  const [exercise, setExercise] = useState<ExerciseLevel | null>(null);

  if (!patient || !latest) return null;
  const ex = exercise ?? patient.exercise ?? null;

  const profileAt = (g: number): Profile => ({
    proteinPerKg: g / latest.weight,
    age: patient.age,
    male: patient.gender === '남' ? 1 : 0,
    constitution: patient.constitution,
    muscleRatio: (latest.muscle / latest.weight) * 100,
    exercise: ex,
  });

  const per4w = model.predict(profileAt(proteinG));
  const total = (per4w * weeks) / 4;
  // 예측 범위: 4주 오차를 기간에 맞춰 늘림 (대략적인 값)
  const margin = 1.96 * model.residualSd * Math.sqrt(weeks / 4);
  const gkg = proteinG / latest.weight;
  const [lo, hi] = model.proteinRange;
  const outside = gkg < lo || gkg > hi;

  const curve = [];
  for (let g = 30; g <= 200; g += 5) {
    curve.push({ g, change: +((model.predict(profileAt(g)) * weeks) / 4).toFixed(2) });
  }

  return (
    <div className="bg-white border border-border rounded-card p-6">
      <h2 className="text-lg font-bold text-ink mb-4">환자별 예측</h2>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div>
          <label className="block text-xs text-muted mb-1">환자</label>
          <select
            value={patient.id}
            onChange={(e) => {
              setPatientId(e.target.value);
              setExercise(null);
            }}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm"
          >
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.age}세 {p.gender})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-muted mb-1">운동량</label>
          <select
            value={ex ?? ''}
            onChange={(e) => setExercise(e.target.value === '' ? null : (Number(e.target.value) as ExerciseLevel))}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm"
          >
            <option value="">모름 (평균으로 계산)</option>
            {([0, 1, 2, 3] as ExerciseLevel[]).map((l) => (
              <option key={l} value={l}>
                {EXERCISE_LABELS[l]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-muted mb-1">기간</label>
          <select
            value={weeks}
            onChange={(e) => setWeeks(Number(e.target.value))}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm"
          >
            {[4, 8, 12, 24].map((w) => (
              <option key={w} value={w}>
                {w}주
              </option>
            ))}
          </select>
        </div>
        <div className="text-xs text-muted self-end pb-2">
          현재 체중 {latest.weight.toFixed(1)}kg · 골격근 {latest.muscle.toFixed(1)}kg
          <br />
          {patient.constitution}
        </div>
      </div>

      <label className="block text-sm text-ink mb-2">
        하루 단백질 섭취량 (식사 + 담백환): <b className="text-apricot">{proteinG}g</b>{' '}
        <span className="text-muted">({gkg.toFixed(2)} g/kg)</span>
      </label>
      <input
        type="range"
        min={30}
        max={200}
        step={5}
        value={proteinG}
        onChange={(e) => setProteinG(Number(e.target.value))}
        className="w-full accent-[#E8A878]"
      />

      <div className="grid grid-cols-2 gap-4 mt-4">
        <div className="bg-surface rounded-lg p-5">
          <p className="text-xs text-muted">{weeks}주 뒤 예상 골격근 변화</p>
          <p className="text-4xl font-bold text-navy mt-1">
            {fmt(total)} <span className="text-base text-muted font-medium">kg</span>
          </p>
          <p className="text-xs text-muted mt-1">
            예상 범위 {fmt(total - margin)} ~ {fmt(total + margin)} kg
          </p>
        </div>
        <div className="bg-surface rounded-lg p-5">
          <p className="text-xs text-muted">{weeks}주 뒤 예상 골격근량</p>
          <p className="text-4xl font-bold text-apricot mt-1">
            {(latest.muscle + total).toFixed(1)} <span className="text-base text-muted font-medium">kg</span>
          </p>
          <p className="text-xs text-muted mt-1">현재 {latest.muscle.toFixed(1)}kg 기준</p>
        </div>
      </div>

      {outside && (
        <div className="flex items-start gap-2 mt-3 text-xs text-pink">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <span>
            이 섭취량({gkg.toFixed(2)} g/kg)은 지금까지 기록된 범위({lo.toFixed(2)}~{hi.toFixed(2)} g/kg) 밖이라 예측을 믿기
            어렵습니다. 실제로는 일정량 이상부터 효과가 줄어드는 경우가 많습니다.
          </span>
        </div>
      )}

      <p className="text-sm font-medium text-ink mt-6 mb-2">섭취량별 {weeks}주 예상 변화</p>
      <div className="h-60">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={curve} margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ECE9E2" />
            <ReferenceArea
              x1={Math.max(30, lo * latest.weight)}
              x2={Math.min(200, hi * latest.weight)}
              fill="#E8A878"
              fillOpacity={0.08}
            />
            <XAxis
              type="number"
              dataKey="g"
              domain={[30, 200]}
              tick={{ fontSize: 12, fill: '#A89B76' }}
              label={{ value: '하루 단백질 (g)', position: 'insideBottom', offset: -10, fontSize: 12, fill: '#A89B76' }}
            />
            <YAxis tick={{ fontSize: 12, fill: '#A89B76' }} />
            <ReferenceLine y={0} stroke="#A89B76" />
            <Tooltip formatter={(v) => [`${fmt(Number(v))} kg`, '예상 변화']} labelFormatter={(v) => `하루 ${v}g`} />
            <Line dataKey="change" stroke="#1B2A4A" strokeWidth={2} dot={false} />
            <ReferenceDot x={proteinG} y={+total.toFixed(2)} r={6} fill="#E8A878" stroke="#fff" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[11px] text-muted">옅은 색 구간: 지금까지 기록된 섭취량 범위 (이 안에서의 예측이 더 믿을 만합니다)</p>

      {mode === 'real' && patient.exercise === undefined && (
        <p className="text-xs text-muted mt-3">
          이 환자의 운동량이 기록되어 있지 않습니다.{' '}
          <Link to={`/patients/${patient.id}`} className="text-navy underline">
            환자 상세
          </Link>
          에서 입력해 두면 다음 분석부터 반영됩니다.
        </p>
      )}
    </div>
  );
}
