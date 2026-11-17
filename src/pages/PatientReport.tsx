// 분석 리포트 화면 (/patients/:id/report?round=N)
// 인바디 회차마다 자동으로 만들어지는 환자용 리포트. A4 2장으로 출력됩니다.

import { useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Printer, BarChart3, TrendingUp, Zap, Clock, Circle, Utensils, FlaskConical, Check, Target } from 'lucide-react';
import { getPatientById, getInbodyRecords, getDietAnalyses } from '../lib/storage';
import { getDietByConstitution } from '../lib/dietByConstitution';
import { CONSTITUTION_MAP } from '../lib/constants';
import { buildReport, shortDate, type ReportData, type Verdict } from '../lib/report';

// ---------- 작은 부품 ----------

function SectionTitle({ icon: Icon, children }: { icon: typeof BarChart3; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 text-base font-bold text-ink mb-3.5">
      <span className="w-[26px] h-[26px] rounded-[7px] bg-[#EEF1F7] grid place-items-center shrink-0">
        <Icon size={15} className="text-navy" />
      </span>
      {children}
    </div>
  );
}

const VERDICT_STYLE: Record<Verdict, string> = {
  good: 'bg-good-wash text-diet-good',
  warn: 'bg-warn-wash text-warn',
  none: 'bg-surface text-muted',
};

function DataCard({ title, sub, verdict, verdictText, children, tags }: {
  title: string; sub?: string; verdict: Verdict; verdictText: string; children?: React.ReactNode; tags: string[];
}) {
  return (
    <div className="border border-border rounded-[10px] p-3.5 grid gap-2.5 content-start">
      <h3 className="text-[13.5px] font-bold text-ink">
        {title} {sub && <span className="text-[11.5px] font-normal text-muted">{sub}</span>}
      </h3>
      <div className={`text-[11.5px] font-bold text-center py-1 px-1.5 rounded-[5px] ${VERDICT_STYLE[verdict]}`}>{verdictText}</div>
      {children}
      <div className="flex gap-2 flex-wrap text-[11px] text-muted">{tags.map((t) => <span key={t}>#{t}</span>)}</div>
    </div>
  );
}

function Metric({ label, value, pct, color = 'bg-navy' }: { label: string; value: string; pct?: number; color?: string }) {
  return (
    <div className="grid gap-1">
      <div className="flex justify-between gap-2 text-[11.5px]">
        <span>{label}</span>
        <span className="font-semibold tabular-nums">{value}</span>
      </div>
      {pct !== undefined && (
        <div className="h-[5px] bg-surface rounded relative">
          <i className={`absolute inset-y-0 left-0 rounded ${color}`} style={{ width: `${Math.max(0, Math.min(pct, 100))}%` }} />
        </div>
      )}
    </div>
  );
}

// 미니 추이 그래프: 값 범위를 높이 32px(위아래 여백 8px)에 맞춤
function Spark({ values, color, standard }: { values: number[]; color: string; standard?: number }) {
  const all = standard !== undefined ? [...values, standard] : values;
  const min = Math.min(...all);
  const max = Math.max(...all);
  const span = max - min || 1;
  const x = (i: number) => (values.length === 1 ? 80 : 8 + (i * 144) / (values.length - 1));
  const y = (v: number) => 40 - ((v - min) / span) * 32;
  return (
    <svg viewBox="0 0 160 48" preserveAspectRatio="none" className="w-full h-[52px] block" aria-hidden="true">
      {standard !== undefined && (
        <line x1="0" x2="160" y1={y(standard)} y2={y(standard)} stroke="#6E7380" strokeWidth="1" strokeDasharray="4 4" />
      )}
      <polyline points={values.map((v, i) => `${x(i)},${y(v)}`).join(' ')} fill="none" stroke={color} strokeWidth="2.5" />
      {values.map((v, i) => (
        <circle key={i} cx={x(i)} cy={y(v)} r={i === values.length - 1 ? 4.5 : 3.5} fill={color} />
      ))}
    </svg>
  );
}

function Delta({ value, goodWhenUp = true, suffix = '' }: { value: number; goodWhenUp?: boolean; suffix?: string }) {
  if (value === 0) return <span className="font-mono text-[12.5px] font-semibold text-muted">0{suffix}</span>;
  const good = goodWhenUp ? value > 0 : value < 0;
  return (
    <span className={`font-mono text-[12.5px] font-semibold ${good ? 'text-diet-good' : 'text-warn'}`}>
      {value > 0 ? '+' : '−'}{Math.abs(value)}{suffix}
    </span>
  );
}

function SheetHeader({ tag }: { tag: string }) {
  return (
    <div className="bg-navy text-white px-8 pt-[18px] pb-5 flex justify-between items-end gap-4 flex-wrap">
      <div>
        <div className="font-mono text-[10.5px] tracking-[.14em] opacity-65">DAMBAEK BOGAM · PROTEIN CARE REPORT</div>
        <h2 className="text-[22px] font-bold mt-1">
          단백질 관리 분석 리포트<span className="text-apricot font-semibold ml-1.5">[{tag}]</span>
        </h2>
      </div>
      <div className="font-semibold text-[15px] border-l-[3px] border-apricot pl-2.5">서울 한의원</div>
    </div>
  );
}

function SheetFooter({ label }: { label: string }) {
  return (
    <div className="border-t border-border px-8 py-3 flex justify-between gap-3 text-[11px] text-muted flex-wrap">
      <span className="font-mono tracking-[.12em]">DAMBAEK BOGAM · PROTEIN CARE</span>
      <span className="border border-border px-2.5 py-0.5 rounded text-ink">{label}</span>
    </div>
  );
}

// ---------- 화면 ----------

export function PatientReport() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const roundParam = Number(searchParams.get('round')) || undefined;

  const patient = useMemo(() => getPatientById(id!), [id]);
  const records = useMemo(() => getInbodyRecords(id), [id]);
  const analyses = useMemo(() => getDietAnalyses(id), [id]);
  const report = useMemo(
    () => (patient ? buildReport(patient, records, analyses, roundParam) : null),
    [patient, records, analyses, roundParam],
  );

  if (!patient) {
    return <div className="p-8 text-muted">환자를 찾을 수 없습니다.</div>;
  }
  if (!report) {
    return (
      <div className="p-8 grid gap-4 justify-items-start">
        <p className="text-muted">인바디 기록이 없어 리포트를 만들 수 없습니다. 인바디를 측정하면 리포트가 자동으로 만들어집니다.</p>
        <button onClick={() => navigate(`/patients/${id}`)} className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-surface">환자 상세로 돌아가기</button>
      </div>
    );
  }

  const sorted = [...records].sort((a, b) => a.testedAt.localeCompare(b.testedAt));

  return (
    <div className="report-page bg-[#E6E9EE] min-h-screen pb-16">
      {/* 툴바 (인쇄 시 숨김) */}
      <div className="no-print bg-white border-b border-border px-8 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="grid gap-1.5">
          <button onClick={() => navigate(`/patients/${id}`)} className="flex items-center gap-1.5 text-xs text-muted hover:text-ink w-fit">
            <ArrowLeft size={14} /> 환자 정밀 분석 · {patient.name}
          </button>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-medium text-ink">분석 리포트</h1>
            <select
              value={report.round}
              onChange={(e) => setSearchParams({ round: e.target.value })}
              className="text-sm px-3 py-1.5 border border-border rounded-lg bg-white"
              aria-label="인바디 회차"
            >
              {sorted.map((r, i) => (
                <option key={r.id} value={i + 1}>
                  {i + 1}회차 · {r.testedAt.replaceAll('-', '.')}
                  {i === sorted.length - 1 ? ' (최신)' : ''}
                  {i === 0 ? ' (첫 측정)' : ''}
                </option>
              ))}
            </select>
            <span className="text-[11.5px] px-2.5 py-1 rounded-full bg-[#EEF1F7] text-navy">
              기본 문장 · {report.record.testedAt.replaceAll('-', '.')} 인바디 기준
            </span>
          </div>
        </div>
        <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-navy text-white rounded-lg text-sm">
          <Printer size={15} /> 출력
        </button>
      </div>

      <div className="report-sheets max-w-[820px] mx-auto mt-7 px-4 grid gap-7">
        <AnalysisSheet r={report} page={`분석 리포트 [1 / ${report.diet ? 3 : 2}]`} />
        {report.diet && <DietSheet r={report} page="식단 분석 [2 / 3]" />}
        <GuideSheet r={report} page={`가이드 [${report.diet ? 3 : 2} / ${report.diet ? 3 : 2}]`} />
      </div>
    </div>
  );
}

// ---------- 1페이지: 분석 ----------

function AnalysisSheet({ r, page }: { r: ReportData; page: string }) {
  const p = r.patient;
  const info = CONSTITUTION_MAP[p.constitution];
  const isFirst = r.situation === 'first';
  const declined = r.situation === 'declined';

  const inbodyVerdict: [Verdict, string] = isFirst
    ? ['none', '첫 측정 · 기준점 기록']
    : declined
      ? ['warn', `${r.declineBase === 'prev' ? '지난' : '첫'} 측정보다 골격근 감소`]
      : r.changes.muscle > 0 && r.changes.fat < 0
        ? ['good', '근육 증가 · 지방 감소 동시 진행']
        : r.changes.muscle > 0
          ? ['good', '근육 증가']
          : ['none', '체성분 유지'];

  const adherenceVerdict: [Verdict, string] = isFirst
    ? ['none', '오늘부터 복용 시작']
    : p.adherenceRate >= 80
      ? ['good', `복용 순응도 ${p.adherenceRate}% · 좋음`]
      : ['warn', `복용 순응도 ${p.adherenceRate}% · 복용이 줄었어요`];

  const compareBase = declined && r.declineBase === 'prev' && r.prev ? r.prev : r.first;
  const values = (key: 'skeletalMuscle' | 'bodyFat' | 'protein') => r.history.map((h) => h[key]);
  const deltaBase = declined && r.declineBase === 'prev' && r.prevChanges ? r.prevChanges : r.changes;

  return (
    <article className="report-sheet bg-white rounded shadow-[0_1px_2px_rgba(27,42,74,.08),0_8px_28px_rgba(27,42,74,.10)] overflow-hidden flex flex-col" aria-label="리포트 1페이지 분석">
      <SheetHeader tag="분석" />
      <div className="px-8 pt-6 pb-7 grid gap-[26px]">
        {/* 환자 정보 */}
        <section className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-3.5 pb-5 border-b border-border max-sm:grid-cols-1">
          <div className="grid gap-2.5 min-w-0">
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="text-[11.5px] text-muted min-w-[44px]">수신자</span>
              <span className="text-2xl font-bold">{p.name} <small className="text-base font-medium">님</small></span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-surface">{p.gender === '남' ? '남성' : '여성'} / {p.age}세</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-surface">
                <b style={{ color: info.color }}>{info.hanja}</b> {p.constitution} · {info.productName}
              </span>
            </div>
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="text-[11.5px] text-muted min-w-[44px]">관리 결과</span>
              <span className="bg-apricot-wash text-apricot-ink font-bold text-[13px] px-3 py-1 rounded-md">{r.texts.headline}</span>
            </div>
          </div>
          <div className="text-right max-sm:text-left">
            <span className="text-[11.5px] text-muted block">{r.round}회차 인바디 리포트</span>
            <span className="font-mono text-lg font-semibold block">{r.record.testedAt.replaceAll('-', '.')}</span>
            <span className="text-[11.5px] text-muted block">
              {isFirst ? '첫 측정' : compareBase === r.first ? `첫 측정 ${shortDate(r.first.testedAt)} 대비` : `지난 측정 ${shortDate(compareBase.testedAt)} 대비`}
              {!isFirst && ` · 복용 ${p.takingDays}일`}
            </span>
          </div>
        </section>

        {/* 데이터 3종 */}
        <section>
          <SectionTitle icon={BarChart3}>원내 데이터 연계 분석</SectionTitle>
          <div className="grid grid-cols-3 gap-3 max-md:grid-cols-1">
            <DataCard title="인바디 체성분 (BIA)" verdict={inbodyVerdict[0]} verdictText={inbodyVerdict[1]}
              tags={isFirst ? ['첫측정'] : declined ? ['회복구간'] : ['근육량변화', '체지방변화']}>
              {isFirst ? (
                <>
                  <Metric label="몸속 단백질량 / 표준" value={`${r.record.protein} / ${r.proteinStandard}kg`} pct={(r.record.protein / r.proteinStandard) * 100} color="bg-apricot" />
                  <Metric label="인바디 점수" value={`${r.record.score}점`} pct={r.record.score} />
                </>
              ) : (
                <>
                  <Metric label="골격근량" value={`${compareBase.skeletalMuscle} → ${r.record.skeletalMuscle}kg`} pct={(r.record.skeletalMuscle / 50) * 100} color={declined ? 'bg-apricot' : 'bg-diet-good'} />
                  <Metric label="인바디 점수" value={`${compareBase.score} → ${r.record.score}점`} pct={r.record.score} />
                </>
              )}
            </DataCard>

            {r.diet ? (
              <DataCard title="식단 단백질 섭취" sub="3일 분석" verdict={r.diet.ratio >= 1 ? 'good' : 'warn'}
                verdictText={r.diet.ratio >= 1 ? `하루 목표의 ${Math.round(r.diet.ratio * 100)}% · 달성` : `하루 목표의 ${Math.round(r.diet.ratio * 100)}% · 약 ${Math.round(r.dailyProteinTarget - r.diet.avg.total)}g 부족`}
                tags={[`${shortDate(r.diet.analysis.from)}–${shortDate(r.diet.analysis.to)}`, `사진${r.diet.analysis.photoCount}장`]}>
                <Metric label="3일 평균 / 목표" value={`${r.diet.avg.total} / ${r.dailyProteinTarget}g`} pct={r.diet.ratio * 100} color="bg-apricot" />
                <Metric label={`${r.diet.weakestMeal.label} 평균 / 한 끼 목표`} value={`${r.diet.weakestMeal.avg} / ${r.mealTarget}g`} pct={(r.diet.weakestMeal.avg / r.mealTarget) * 100} color="bg-apricot" />
              </DataCard>
            ) : (
              <DataCard title="식단 단백질 섭취" verdict="none" verdictText="식단 분석 없음" tags={['3일식단사진', '다음내원']}>
                <p className="text-xs text-muted leading-relaxed">
                  인바디 측정일 기준 한 달 안에 찍은 3일 식단 사진이 없어요. 다음 내원 때 3일 치 사진을 가져오시면 단백질과 비타민·무기질까지 분석해 드립니다.
                </p>
              </DataCard>
            )}

            <DataCard title="단백환 복용" verdict={adherenceVerdict[0]} verdictText={adherenceVerdict[1]} tags={[info.productName.replace(' ', '')]}>
              {isFirst ? (
                <>
                  <Metric label="처방 제품" value={info.productName} />
                  <Metric label="복용법" value="10g × 하루 2회" />
                </>
              ) : (
                <>
                  <Metric label="복용 순응도" value={`${p.adherenceRate}%`} pct={p.adherenceRate} color={p.adherenceRate >= 80 ? 'bg-navy' : 'bg-apricot'} />
                  <Metric label="복용 일수" value={`${p.takingDays}일`} />
                </>
              )}
            </DataCard>
          </div>
        </section>

        {/* 변화 */}
        <section>
          <SectionTitle icon={TrendingUp}>
            {isFirst ? '첫 측정 결과' : declined && r.declineBase === 'prev' ? '지난 측정 이후 변화' : `${r.periodWeeks}주 동안의 변화`}
          </SectionTitle>
          <div className="grid grid-cols-3 gap-3 max-md:grid-cols-1">
            {([
              { k: '골격근량 (근육)', key: 'skeletalMuscle', now: r.record.skeletalMuscle, delta: deltaBase.muscle, up: true, color: '#1D8C68' },
              { k: '체지방량', key: 'bodyFat', now: r.record.bodyFat, delta: deltaBase.fat, up: false, color: '#1D8C68' },
              { k: `몸속 단백질량 · 표준 ${r.proteinStandard}kg`, key: 'protein', now: r.record.protein, delta: deltaBase.protein, up: true, color: '#E8A878' },
            ] as const).map((t) => (
              <div key={t.key} className="bg-surface rounded-[10px] p-3.5 grid gap-1.5">
                <span className="text-xs text-muted">{t.k}</span>
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  <span className="font-mono text-[22px] font-semibold">{t.now.toFixed(1)}</span>
                  <span className="text-xs text-muted">kg</span>
                  {!isFirst && <Delta value={t.delta} goodWhenUp={t.up} />}
                </div>
                {isFirst ? (
                  <div className="h-[52px] border border-dashed border-[#CBD2DE] rounded-md grid place-items-center text-[11px] text-muted text-center px-1.5">
                    다음 측정부터 변화 그래프가 그려져요
                  </div>
                ) : (
                  <>
                    <Spark
                      values={values(t.key)}
                      color={declined && ((t.up && t.delta < 0) || (!t.up && t.delta > 0)) ? '#C2541E' : t.color}
                      standard={t.key === 'protein' ? r.proteinStandard : undefined}
                    />
                    <div className="flex justify-between font-mono text-[10px] text-muted">
                      {r.history.map((h) => <span key={h.id}>{shortDate(h.testedAt)}</span>)}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
          <div className="mt-3 border border-dashed border-[#CBD2DE] rounded-[10px] px-3.5 py-3 text-[13px] grid grid-cols-[auto_1fr] gap-2.5">
            <b className="text-navy whitespace-nowrap">쉽게 말하면</b>
            <p>{r.texts.easy}</p>
          </div>
        </section>

        {/* 종합 소견 */}
        <section>
          <SectionTitle icon={Zap}>종합 소견</SectionTitle>
          <div className="bg-report-dark text-[#E9EBEF] rounded-xl px-6 py-[22px] grid gap-3.5 text-sm leading-[1.9]">
            {r.texts.paragraphs.map((para, i) => (
              <p key={i}>
                {para.map((part, j) => (
                  <span key={j} className={part.tone === 'good' ? 'text-[#6FD3A8] font-bold' : part.tone === 'warn' ? 'text-[#F2A266] font-bold' : ''}>
                    {part.text}
                  </span>
                ))}
              </p>
            ))}
            <div className="text-[11.5px] text-[#A3A8B3] border-t border-[#3A3E46] pt-2.5">
              인바디·{r.diet ? '식단·' : ''}복용 기록을 바탕으로 자동 작성했습니다
            </div>
          </div>
        </section>
      </div>
      <SheetFooter label={page} />
    </article>
  );
}

// ---------- 2페이지: 가이드 ----------

function GuideSheet({ r, page }: { r: ReportData; page: string }) {
  const p = r.patient;
  const info = CONSTITUTION_MAP[p.constitution];
  const diet = getDietByConstitution(p.constitution);
  const steps = [
    { n: 1, title: '채우기', desc: '단백질 표준 도달' },
    { n: 2, title: '근육 만들기', desc: '섭취 + 근력 운동' },
    { n: 3, title: '유지하기', desc: '체성분 안정화' },
  ];

  return (
    <article className="report-sheet bg-white rounded shadow-[0_1px_2px_rgba(27,42,74,.08),0_8px_28px_rgba(27,42,74,.10)] overflow-hidden flex flex-col" aria-label="리포트 2페이지 가이드">
      <SheetHeader tag="가이드" />
      <div className="px-8 pt-6 pb-7 grid gap-[26px]">
        {/* 체질 처방 + 단계 */}
        <section>
          <SectionTitle icon={Clock}>체질 맞춤 단백 관리 처방</SectionTitle>
          <div className="border border-border rounded-xl px-[18px] py-4 grid gap-3.5">
            <div><span className="text-[11.5px] font-bold px-2.5 py-0.5 rounded-[5px] bg-[#EEF1F7] text-navy">{p.constitution} · {info.hanja}</span></div>
            <p className="text-[13px]"><b>[체질 소견]</b> {diet?.guideline}</p>
            <div className="grid grid-cols-3 gap-2.5 max-sm:grid-cols-1">
              {steps.map((s) => {
                const now = s.n === r.step;
                const done = s.n < r.step;
                return (
                  <div key={s.n} className={`rounded-lg px-3 py-2.5 text-center grid gap-0.5 ${now ? 'border-2 border-navy bg-[#F3F5FA]' : 'border border-border'}`}>
                    <span className={`text-[11px] ${now ? 'text-navy font-bold' : 'text-muted'}`}>{s.n}단계{now ? ' · 지금' : done ? ' · 완료' : ''}</span>
                    <b className="text-[13.5px]">{s.title}</b>
                    <span className="text-[11px] text-muted">{s.desc}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 복용 가이드 */}
        <section>
          <SectionTitle icon={Circle}>{info.productName} 복용 가이드</SectionTitle>
          <div className="grid grid-cols-4 gap-2.5 max-sm:grid-cols-2">
            {[
              ['1회 섭취량', '10g · 5스푼'],
              ['하루 횟수', '2회'],
              ['권장 시점', '아침 공복 · 운동 전후'],
              r.situation === 'first' ? ['복용 시작', '오늘부터'] : ['복용 순응도', `${p.adherenceRate}%`],
            ].map(([k, v]) => (
              <div key={k} className="bg-surface rounded-lg px-3 py-2.5 grid gap-0.5">
                <span className="text-[11px] text-muted">{k}</span>
                <b className="text-sm">{v}</b>
              </div>
            ))}
          </div>
        </section>

        {!r.diet && <DietHowTo />}

        {!r.diet && <ConstitutionFoods r={r} />}

        {/* 목표 */}
        <section>
          <SectionTitle icon={Target}>다음 측정까지의 목표</SectionTitle>
          <div className="grid grid-cols-3 gap-2.5 max-sm:grid-cols-1">
            {[
              { k: '다음 인바디 측정', v: shortDate(r.goals.nextDate), d: '4주 뒤 내원' },
              { k: r.goals.main.label, v: r.goals.main.value, d: r.goals.main.note },
              r.situation === 'declined'
                ? { k: '단백환 복용', v: '80%', d: '순응도 다시 올리기 (하루 2회)' }
                : { k: '하루 단백질', v: `${r.goals.protein}g`, d: '주 5일 이상 채우기' },
            ].map((g) => (
              <div key={g.k} className="rounded-[10px] px-3.5 py-3 bg-apricot-wash grid gap-0.5">
                <span className="text-[11.5px] text-apricot-ink">{g.k}</span>
                <b className="font-mono text-lg text-apricot-ink">{g.v}</b>
                <span className="text-[11px] text-apricot-ink opacity-85">{g.d}</span>
              </div>
            ))}
          </div>
        </section>

        {/* 생활 가이드 */}
        <section className="bg-[#FBFBFC] border border-border rounded-xl px-[18px] py-4 grid gap-2.5">
          <h3 className="text-sm font-bold">생활 가이드</h3>
          <ul className="pl-[18px] grid gap-2 text-[13px] list-disc">
            <li><b className="text-navy">근력 운동 주 3회:</b> 스쿼트·계단 오르기처럼 하체 큰 근육을 쓰는 운동을 20분. 운동 전후에 단백환을 드시면 좋습니다.</li>
            <li><b className="text-navy">세 끼에 고르게:</b> 한 끼에 몰아 먹기보다 끼니마다 단백질 {r.mealTarget}g 안팎을 목표로 나눠 드세요.</li>
            <li><b className="text-navy">다음 내원 때 3일 식단 사진:</b> 내원 전 3일 동안 끼니마다 사진을 찍어 오시면 식단 분석이 리포트에 함께 실립니다.</li>
          </ul>
        </section>

        <p className="text-[11px] text-muted">
          본 리포트는 인바디 측정값{r.diet ? '과 식단 사진 AI 추정값' : ''}을 바탕으로 자동 작성한 참고 자료이며, 의학적 진단을 대신하지 않습니다.
          {r.diet && ' 식단 수치는 사진으로 추정한 값이라 실제와 차이가 있을 수 있습니다.'}
        </p>
      </div>
      <SheetFooter label={page} />
    </article>
  );
}

// 체질 권장·절제 음식
function ConstitutionFoods({ r }: { r: ReportData }) {
  const p = r.patient;
  const diet = getDietByConstitution(p.constitution);
  return (
    <>
        <section>
          <SectionTitle icon={Check}>{p.constitution} 맞춤 식단</SectionTitle>
          <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
            <div className="grid gap-2 content-start">
              <h3 className="text-[13px] font-bold flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-diet-good" />권장 음식</h3>
              <div className="flex gap-1.5 flex-wrap">{diet?.recommended.map((f) => <span key={f} className="text-xs px-2.5 py-0.5 rounded-full bg-good-wash text-diet-good">{f}</span>)}</div>
            </div>
            <div className="grid gap-2 content-start">
              <h3 className="text-[13px] font-bold flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-warn" />절제 음식</h3>
              <div className="flex gap-1.5 flex-wrap">{diet?.restricted.map((f) => <span key={f} className="text-xs px-2.5 py-0.5 rounded-full bg-warn-wash text-warn">{f}</span>)}</div>
            </div>
          </div>
        </section>

    </>
  );
}

// 식단 분석 시트 (3일 식단 사진을 가져온 경우에만)
function DietSheet({ r, page }: { r: ReportData; page: string }) {
  return (
    <article className="report-sheet bg-white rounded shadow-[0_1px_2px_rgba(27,42,74,.08),0_8px_28px_rgba(27,42,74,.10)] overflow-hidden flex flex-col" aria-label="리포트 식단 분석">
      <SheetHeader tag="식단 분석" />
      <div className="px-8 pt-6 pb-7 grid gap-[26px]">
        <DietSections r={r} />
        <ConstitutionFoods r={r} />
        <p className="text-[11px] text-muted">식단 수치는 사진으로 추정한 값이라 실제와 차이가 있을 수 있습니다.</p>
      </div>
      <SheetFooter label={page} />
    </article>
  );
}

// 3일 식단 + 비타민·무기질
function DietSections({ r }: { r: ReportData }) {
  const d = r.diet!;
  const scale = Math.max(120, Math.ceil(Math.max(r.dailyProteinTarget, ...d.days.map((x) => x.total)) / 20) * 20);
  const pct = (g: number) => `${(g / scale) * 100}%`;
  const rows = [
    ...d.days.map((x) => ({ label: `${shortDate(x.date)} (${'일월화수목금토'[new Date(x.date).getDay()]})`, ...x, isAvg: false })),
    { label: '3일 평균', ...d.avg, date: 'avg', isAvg: true },
  ];

  return (
    <>
      <section>
        <SectionTitle icon={Utensils}>3일 식단 분석: 하루 단백질, 이렇게 채워요</SectionTitle>
        <div className="grid gap-2">
          <div className="flex gap-2 flex-wrap">
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-surface">분석 기간 {d.analysis.from.replaceAll('-', '.')} – {shortDate(d.analysis.to)}</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-surface">사진 {d.analysis.photoCount}장</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-surface">AI 추정값</span>
          </div>
          {rows.map((row) => {
            const gap = Math.max(0, r.dailyProteinTarget - row.total);
            return (
              <div key={row.date} className="grid grid-cols-[84px_minmax(0,1fr)_52px] gap-2.5 items-center">
                <span className={`font-mono text-[11.5px] whitespace-nowrap ${row.isAvg ? 'text-ink font-semibold' : 'text-muted'}`}>{row.label}</span>
                <div
                  className={`flex h-[26px] rounded-md overflow-hidden relative bg-surface ${row.isAvg ? 'outline-2 outline-ink outline-offset-1' : ''}`}
                  role="img"
                  aria-label={`${row.label} 아침 ${row.breakfast}g 점심 ${row.lunch}g 저녁 ${row.dinner}g 간식 ${row.snack}g, 합계 ${row.total}g`}
                >
                  {[
                    ['bg-[#3D5A8F]', row.breakfast],
                    ['bg-[#2B3D63]', row.lunch],
                    ['bg-navy', row.dinner],
                    ['bg-[#6B7FA8]', row.snack],
                  ].filter(([, g]) => (g as number) > 0).map(([c, g], i) => (
                    <span key={i} className={`${c} text-white text-[11.5px] font-bold flex items-center justify-center overflow-hidden whitespace-nowrap min-w-0`} style={{ width: pct(g as number) }}>{g}</span>
                  ))}
                  {gap > 0 && (
                    <span className="diet-gap text-warn text-[11.5px] font-bold flex items-center justify-center overflow-hidden whitespace-nowrap min-w-0" style={{ width: pct(gap) }}>−{Math.round(gap * 10) / 10}</span>
                  )}
                  <i className="absolute -top-1 -bottom-1 w-0.5 bg-ink" style={{ left: pct(r.dailyProteinTarget) }} />
                </div>
                <span className="font-mono text-xs font-semibold text-right">{row.total}g</span>
              </div>
            );
          })}
          <div className="flex gap-3.5 flex-wrap text-[11.5px] text-muted pl-[94px] max-sm:pl-0">
            <span><i className="inline-block w-2.5 h-2.5 rounded-sm mr-1 bg-[#3D5A8F]" />아침</span>
            <span><i className="inline-block w-2.5 h-2.5 rounded-sm mr-1 bg-[#2B3D63]" />점심</span>
            <span><i className="inline-block w-2.5 h-2.5 rounded-sm mr-1 bg-navy" />저녁</span>
            <span><i className="inline-block w-2.5 h-2.5 rounded-sm mr-1 bg-[#F7D9C6]" />목표까지 부족</span>
            <span><i className="inline-block w-0.5 h-2.5 mr-1 bg-ink" />목표 {r.dailyProteinTarget}g</span>
          </div>
          <p className="text-[11px] text-muted">막대 길이는 0–{scale}g 기준. 목표량 = 체중 {r.record.weight}kg × 1.2 + 단백환 복용 가산</p>
          {d.proteinIdeas.length > 0 && (
            <div className="grid grid-cols-2 gap-2.5 max-sm:grid-cols-1">
              {d.proteinIdeas.map((idea) => (
                <div key={idea.title} className="border border-border rounded-lg px-3 py-2.5 text-[12.5px] grid gap-0.5">
                  <b>{idea.title}</b>
                  <span className="font-mono text-xs font-semibold text-diet-good">약 +{idea.grams}g</span>
                  <span>{idea.note}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section>
        <SectionTitle icon={FlaskConical}>같은 3일 식단으로 본 비타민·무기질</SectionTitle>
        <div className="grid gap-1.5" role="table" aria-label="3일 평균 비타민 무기질 섭취 추정치와 권장량 대비 비율">
          <div className="grid grid-cols-[92px_minmax(0,1fr)_118px_46px] gap-2.5 items-center text-[11px] text-muted max-sm:grid-cols-[76px_minmax(0,1fr)_46px]" role="row">
            <span>영양소</span>
            <span className="flex justify-between font-mono text-[10px]"><b>0%</b><b>권장량 100%</b><b>200%</b></span>
            <span className="text-right max-sm:hidden">3일 평균 / 권장량</span>
            <span />
          </div>
          {d.nutrients.map((n) => (
            <div key={n.key} className="grid grid-cols-[92px_minmax(0,1fr)_118px_46px] gap-2.5 items-center text-[12.5px] max-sm:grid-cols-[76px_minmax(0,1fr)_46px]" role="row">
              <span className="font-medium whitespace-nowrap">{n.label}</span>
              <div className="h-2 bg-surface rounded relative">
                <i className={`absolute inset-y-0 left-0 rounded ${n.level === '부족' ? 'bg-warn' : n.level === '과다' ? 'bg-[#7A3E8F]' : 'bg-diet-good'}`} style={{ width: `${Math.min(n.ratio / 2, 1) * 100}%` }} />
                <span className="absolute left-1/2 -top-1 -bottom-1 w-0.5 bg-ink" />
              </div>
              <span className="font-mono text-[11.5px] text-muted text-right whitespace-nowrap max-sm:hidden">{n.avg.toLocaleString()} / {n.ref.toLocaleString()}{n.unit}</span>
              <span className={`text-[11px] font-bold text-center py-0.5 rounded ${n.level === '부족' ? 'bg-warn-wash text-warn' : n.level === '과다' ? 'bg-[#F3E8F7] text-[#7A3E8F]' : 'bg-good-wash text-diet-good'}`}>{n.level}</span>
            </div>
          ))}
        </div>
        {(() => {
          const fixes = d.nutrients.filter((n) => n.level !== '적정').sort((a, b) => Math.abs(1 - b.ratio) - Math.abs(1 - a.ratio)).slice(0, 3);
          if (!fixes.length) return null;
          return (
            <div className="grid grid-cols-3 gap-2.5 mt-3.5 max-sm:grid-cols-1">
              {fixes.map((n) => (
                <div key={n.key} className="border border-border rounded-lg px-3 py-2.5 text-[12.5px] grid gap-0.5">
                  <b>{n.level === '과다' ? `${n.label} 줄이기` : n.label}</b>
                  <span className="text-[11px] text-muted">{n.role}</span>
                  <span>{n.tip}</span>
                </div>
              ))}
            </div>
          );
        })()}
        <p className="text-[11px] text-muted mt-2">
          사진으로 추정한 값이라 단백질보다 오차가 큽니다. 부족·적정·과다 단계로 참고해 주세요. 권장량: {d.referenceLabel}
        </p>
      </section>
    </>
  );
}

// 식단 분석이 없을 때 안내
function DietHowTo() {
  return (
    <section>
      <SectionTitle icon={Utensils}>다음 내원 때 3일 식단 사진을 가져오세요</SectionTitle>
      <div className="grid grid-cols-3 gap-2.5 max-sm:grid-cols-1">
        {[
          ['언제', '내원 전 한 달 안의 아무 3일', '평소처럼 드신 날이면 됩니다'],
          ['어떻게', '끼니마다 한 장씩', '간식·음료도 찍어 주세요. 위에서 내려다보면 양이 잘 보여요'],
          ['가져오기', '내원 때 접수처에 보여주기', '원내에서 사진을 올려 분석합니다'],
        ].map(([s, b, t]) => (
          <div key={s} className="border border-border rounded-lg p-3 grid gap-1 text-[12.5px]">
            <span className="font-mono text-[11px] text-muted">{s}</span>
            <b className="text-[13px]">{b}</b>
            <span>{t}</span>
          </div>
        ))}
      </div>
      <p className="text-[12.5px] text-muted mt-2">가져오시면 다음 리포트에 하루 단백질 섭취량, 끼니별 부족한 부분, 비타민·무기질 8가지 분석이 함께 실립니다.</p>
    </section>
  );
}
