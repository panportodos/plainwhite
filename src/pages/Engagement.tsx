// 환자 참여 페이지 - 랭킹·챌린지 / 커뮤니티 / 위치 기반 추천·광고

import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Trophy, MessageCircle, MapPin, Heart, Navigation, Star, Megaphone, ShieldAlert, Flame, Smartphone } from 'lucide-react';
import { Topbar } from '../components/Topbar';
import { ConstitutionBadge } from '../components/ConstitutionBadge';
import { CONSTITUTION_MAP } from '../lib/constants';
import {
  getAllPatients,
  getAllInbodyRecords,
  getMealRecords,
  getEngagementSettings,
  saveEngagementSettings,
} from '../lib/storage';
import {
  BADGES,
  POINT_RULES,
  SAMPLE_CHALLENGES,
  SAMPLE_POSTS,
  DEFAULT_LOCATION,
  buildRanking,
  buildTeamScores,
  maskName,
  rankClinics,
  type EngagementSettings,
} from '../lib/engagement';

type Tab = 'ranking' | 'community' | 'location';

const TABS: { key: Tab; label: string; icon: typeof Trophy }[] = [
  { key: 'ranking', label: '랭킹 · 챌린지', icon: Trophy },
  { key: 'community', label: '커뮤니티', icon: MessageCircle },
  { key: 'location', label: '위치 추천 · 광고', icon: MapPin },
];

function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex items-start justify-between gap-4 py-3 border-b border-border last:border-0 cursor-pointer">
      <div>
        <div className="text-sm text-ink">{label}</div>
        {hint && <div className="text-xs text-muted mt-0.5">{hint}</div>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-6 rounded-full shrink-0 transition-colors ${checked ? 'bg-navy' : 'bg-border'}`}
      >
        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${checked ? 'left-[18px]' : 'left-0.5'}`} />
      </button>
    </label>
  );
}

export function Engagement() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (searchParams.get('tab') as Tab) || 'ranking';

  const patients = useMemo(() => getAllPatients(), []);
  const inbody = useMemo(() => getAllInbodyRecords(), []);
  const meals = useMemo(() => getMealRecords(), []);
  const ranking = useMemo(() => buildRanking(patients, inbody, meals), [patients, inbody, meals]);
  const teams = useMemo(() => buildTeamScores(ranking), [ranking]);

  const [settings, setSettings] = useState<EngagementSettings>(() => getEngagementSettings());
  const update = (patch: Partial<EngagementSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveEngagementSettings(next);
  };

  const displayName = (name: string) => (settings.maskNames ? maskName(name) : name);

  return (
    <div>
      <Topbar
        title="환자 참여"
        subtitle="랭킹·챌린지로 복용을 습관으로 만들고, 커뮤니티와 위치 기반 추천으로 환자를 연결합니다"
      />

      <div className="p-8 max-w-[1440px]">
        {/* 탭 */}
        <div className="flex gap-2 mb-6">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setSearchParams({ tab: key })}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
                tab === key ? 'bg-navy text-white' : 'border border-border text-muted hover:bg-surface'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        {/* ---------- 랭킹 · 챌린지 ---------- */}
        {tab === 'ranking' && (
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 space-y-6">
              {/* 이번 달 랭킹 */}
              <div className="bg-white border border-border rounded-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-medium text-ink">이번 달 건강 포인트 랭킹</h2>
                    <p className="text-xs text-muted mt-1">
                      {settings.rankingPublic ? '환자 앱에 공개 중' : '원장님만 볼 수 있음 (환자 앱 비공개)'} ·{' '}
                      {settings.maskNames ? '이름 가림' : '실명 표시'}
                    </p>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <button
                      onClick={() => update({ maskNames: !settings.maskNames })}
                      className="px-3 py-1.5 border border-border rounded-lg hover:bg-surface"
                    >
                      {settings.maskNames ? '실명 보기' : '이름 가리기'}
                    </button>
                  </div>
                </div>

                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-muted border-b border-border">
                      <th className="text-left font-normal py-2 w-12">순위</th>
                      <th className="text-left font-normal py-2">환자</th>
                      <th className="text-left font-normal py-2">배지</th>
                      <th className="text-right font-normal py-2">포인트</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranking.map((row, i) => (
                      <tr
                        key={row.patient.id}
                        onClick={() => navigate(`/patients/${row.patient.id}`)}
                        className="border-b border-border last:border-0 hover:bg-surface cursor-pointer"
                      >
                        <td className="py-3">
                          <span
                            className={`inline-flex w-7 h-7 rounded-full items-center justify-center text-xs font-medium ${
                              i === 0 ? 'bg-apricot text-apricot-ink' : i < 3 ? 'bg-surface text-apricot-ink' : 'text-muted'
                            }`}
                          >
                            {i + 1}
                          </span>
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-3">
                            <ConstitutionBadge constitution={row.patient.constitution} />
                            <div>
                              <div className="text-ink font-medium">{displayName(row.patient.name)}</div>
                              <div className="text-xs text-muted">
                                순응도 {row.patient.adherenceRate}% · 단백질 {row.patient.proteinChange > 0 ? '+' : ''}
                                {row.patient.proteinChange}kg
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3">
                          <div className="flex gap-1 flex-wrap">
                            {row.badges.length === 0 && <span className="text-xs text-muted">-</span>}
                            {row.badges.map((b) => (
                              <span key={b.id} title={b.description} className="text-xs px-2 py-0.5 rounded-full bg-surface text-apricot-ink">
                                {b.emoji} {b.label}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 text-right">
                          <span className="text-lg font-medium text-navy">{row.points}</span>
                          <span className="text-xs text-muted ml-1">P</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 진행 중 챌린지 */}
              <div className="bg-white border border-border rounded-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-medium text-ink">진행 중인 챌린지</h2>
                  <button className="px-4 py-2 bg-navy text-white rounded-lg text-sm">+ 챌린지 만들기</button>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {SAMPLE_CHALLENGES.map((c) => (
                    <div key={c.id} className="border border-border rounded-inner p-4 flex flex-col">
                      <div className="flex items-center gap-2 mb-1">
                        <Flame size={16} className="text-apricot" />
                        <span className="font-medium text-ink text-sm">{c.title}</span>
                      </div>
                      <p className="text-xs text-muted mb-3 flex-1">{c.description}</p>
                      <div className="h-1.5 bg-surface rounded-full overflow-hidden mb-1">
                        <div className="h-full bg-apricot" style={{ width: `${c.progress}%` }} />
                      </div>
                      <div className="flex justify-between text-[11px] text-muted mb-3">
                        <span>평균 달성 {c.progress}%</span>
                        <span>{c.participants}명 참여</span>
                      </div>
                      <div className="text-[11px] text-muted border-t border-border pt-2">
                        {c.period} · 보상 <span className="text-apricot-ink">{c.reward}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {/* 체질 팀 대항전 */}
              <div className="bg-white border border-border rounded-card p-6">
                <h2 className="text-lg font-medium text-ink mb-1">체질 팀 대항전</h2>
                <p className="text-xs text-muted mb-4">같은 체질끼리 한 팀, 팀 평균 포인트로 겨룹니다</p>
                <div className="space-y-3">
                  {teams.map((t, i) => {
                    const max = teams[0].avgPoints || 1;
                    const info = CONSTITUTION_MAP[t.constitution];
                    return (
                      <div key={t.constitution}>
                        <div className="flex justify-between text-sm mb-1">
                          <span>
                            <span className="text-muted mr-2">{i + 1}</span>
                            <span style={{ color: info.color }} className="font-medium">{info.hanja}</span> {t.constitution} 팀
                            <span className="text-xs text-muted ml-1">({t.members}명)</span>
                          </span>
                          <span className="font-medium text-ink">{t.avgPoints}P</span>
                        </div>
                        <div className="h-2 bg-surface rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${(t.avgPoints / max) * 100}%`, backgroundColor: info.color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 포인트 규칙 */}
              <div className="bg-white border border-border rounded-card p-6">
                <h2 className="text-lg font-medium text-ink mb-3">포인트 · 배지 규칙</h2>
                <ul className="text-sm space-y-1.5 mb-4">
                  {POINT_RULES.map((r) => (
                    <li key={r.label} className="flex justify-between">
                      <span className="text-muted">{r.label}</span>
                      <span className="text-ink">{r.rule}</span>
                    </li>
                  ))}
                </ul>
                <div className="grid grid-cols-2 gap-2">
                  {BADGES.map((b) => (
                    <div key={b.id} className="bg-surface rounded-inner p-2.5">
                      <div className="text-sm">{b.emoji} {b.label}</div>
                      <div className="text-[11px] text-muted">{b.description}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 공개 설정 */}
              <div className="bg-white border border-border rounded-card p-6">
                <h2 className="text-lg font-medium text-ink mb-1">공개 설정</h2>
                <Toggle
                  checked={settings.rankingPublic}
                  onChange={(v) => update({ rankingPublic: v })}
                  label="환자 앱에 랭킹 공개"
                  hint="참여 동의한 환자만 표시됩니다"
                />
                <Toggle checked={settings.maskNames} onChange={(v) => update({ maskNames: v })} label="이름 가운데 가리기" hint="예: 김민서 → 김*서" />
              </div>
            </div>
          </div>
        )}

        {/* ---------- 커뮤니티 ---------- */}
        {tab === 'community' && (
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 bg-white border border-border rounded-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-ink">커뮤니티 피드</h2>
                <span className="text-xs text-muted">{settings.communityEnabled ? '환자 앱에서 운영 중' : '운영 꺼짐'}</span>
              </div>
              <div className="space-y-3">
                {SAMPLE_POSTS.map((post) => {
                  const author = patients.find((p) => p.id === post.patientId);
                  return (
                    <div
                      key={post.id}
                      className={`border rounded-inner p-4 ${post.needsDoctorReply ? 'border-apricot bg-apricot/5' : 'border-border'}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <ConstitutionBadge constitution={post.constitution} />
                          <div>
                            <div className="text-sm font-medium text-ink">{author ? displayName(author.name) : '익명'}</div>
                            <div className="text-[11px] text-muted">
                              {post.constitution} ·{' '}
                              {new Date(post.createdAt).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>
                        {post.needsDoctorReply && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-apricot text-apricot-ink">원장 답변 필요</span>
                        )}
                      </div>
                      <p className="text-sm text-ink mb-3">{post.content}</p>
                      <div className="flex items-center gap-4 text-xs text-muted">
                        <span className="flex items-center gap-1"><Heart size={13} /> {post.likes}</span>
                        <span className="flex items-center gap-1"><MessageCircle size={13} /> {post.comments}</span>
                        {post.needsDoctorReply && (
                          <button className="ml-auto px-3 py-1 bg-navy text-white rounded-lg">답변하기</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white border border-border rounded-card p-6">
                <h2 className="text-lg font-medium text-ink mb-3">운영 현황</h2>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-surface rounded-inner p-3">
                    <div className="text-xs text-muted">이번 주 글</div>
                    <div className="text-2xl font-medium text-ink">{SAMPLE_POSTS.length}</div>
                  </div>
                  <div className="bg-apricot/15 rounded-inner p-3">
                    <div className="text-xs text-apricot-ink">답변 대기</div>
                    <div className="text-2xl font-medium text-apricot-ink">{SAMPLE_POSTS.filter((p) => p.needsDoctorReply).length}</div>
                  </div>
                </div>
                <div className="mt-4">
                  <Toggle checked={settings.communityEnabled} onChange={(v) => update({ communityEnabled: v })} label="커뮤니티 운영" />
                </div>
              </div>
              <div className="bg-surface rounded-card p-5 text-xs text-muted leading-relaxed">
                <div className="flex items-center gap-2 text-ink text-sm font-medium mb-2">
                  <ShieldAlert size={16} /> 운영 원칙
                </div>
                복용·증상 질문은 자동으로 "원장 답변 필요"로 표시되어, 환자끼리 의학적 조언을 주고받지 않도록 합니다. 작성자 이름은
                가려서 보여주고, 인바디 수치 등 건강정보는 본인이 공유한 것만 노출됩니다.
              </div>
            </div>
          </div>
        )}

        {/* ---------- 위치 추천 · 광고 ---------- */}
        {tab === 'location' && <LocationAndAds settings={settings} update={update} topPatientName={ranking[0] ? displayName(ranking[0].patient.name) : ''} />}
      </div>
    </div>
  );
}

function LocationAndAds({
  settings,
  update,
  topPatientName,
}: {
  settings: EngagementSettings;
  update: (patch: Partial<EngagementSettings>) => void;
  topPatientName: string;
}) {
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState('');
  const clinics = useMemo(
    () => rankClinics(location.lat, location.lng, settings.adSponsoredClinic),
    [location, settings.adSponsoredClinic],
  );

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setLocError('이 브라우저는 위치 기능을 지원하지 않습니다.');
      return;
    }
    setLocating(true);
    setLocError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, label: '현재 내 위치' });
        setLocating(false);
      },
      () => {
        setLocError('위치 권한이 없어 기본 위치(서울시청)로 보여줍니다.');
        setLocating(false);
      },
      { timeout: 8000 },
    );
  };

  return (
    <div className="grid grid-cols-3 gap-6">
      {/* 설정 */}
      <div className="col-span-2 space-y-6">
        <div className="bg-white border border-border rounded-card p-6">
          <div className="flex items-center gap-2 mb-1">
            <Navigation size={18} className="text-navy" />
            <h2 className="text-lg font-medium text-ink">GPS 기반 한의원 추천</h2>
          </div>
          <p className="text-xs text-muted mb-3">
            환자 앱에서 가까운 담백보감 제휴 한의원(인바디 측정 가능 여부, 진료 시간)을 거리순으로 보여줍니다. 이사·출장 중인
            환자도 관리를 이어갈 수 있습니다.
          </p>
          <Toggle checked={settings.locationRecommend} onChange={(v) => update({ locationRecommend: v })} label="환자 앱에 '내 주변 한의원' 표시" />
          <div className="flex items-center gap-3 mt-3">
            <button onClick={useMyLocation} className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-surface flex items-center gap-2">
              <MapPin size={15} /> {locating ? '위치 확인 중…' : '내 위치로 미리보기'}
            </button>
            <span className="text-xs text-muted">기준: {location.label}</span>
          </div>
          {locError && <p className="text-xs text-pink mt-2">{locError}</p>}
        </div>

        <div className="bg-white border border-border rounded-card p-6">
          <div className="flex items-center gap-2 mb-1">
            <Megaphone size={18} className="text-apricot" />
            <h2 className="text-lg font-medium text-ink">광고 슬롯</h2>
          </div>
          <p className="text-xs text-muted mb-3">광고에는 모두 "광고" 표시를 붙이고, 추천 목록 상단 광고는 1곳만 노출해 환자 경험을 지킵니다.</p>
          <Toggle
            checked={settings.adSponsoredClinic}
            onChange={(v) => update({ adSponsoredClinic: v })}
            label="추천 목록 상단 제휴 한의원 광고"
            hint="제휴 한의원이 월 이용료를 내고 1곳만 상단에 노출"
          />
          <Toggle
            checked={settings.adHomeBanner}
            onChange={(v) => update({ adHomeBanner: v })}
            label="환자 앱 홈 배너"
            hint="건강식품·운동 시설 등 제휴사 배너"
          />
          <Toggle
            checked={settings.adAfterMeal}
            onChange={(v) => update({ adAfterMeal: v })}
            label="식단 기록 후 체질 맞춤 상품 추천"
            hint="단백질이 부족한 날, 체질에 맞는 단백 식품 추천"
          />
          <div className="mt-4 bg-surface rounded-inner p-4 text-xs text-muted leading-relaxed flex gap-2">
            <ShieldAlert size={16} className="shrink-0 text-apricot-ink" />
            <span>
              의료기관 광고는 의료법상 사전 심의 대상일 수 있고, 체질·인바디 같은 건강정보를 광고 타겟팅에 쓰려면 환자의 별도 동의가
              필요합니다. 출시 전에 법률 검토를 받으세요.
            </span>
          </div>
        </div>
      </div>

      {/* 환자 앱 미리보기 */}
      <div>
        <div className="flex items-center gap-2 text-sm text-muted mb-2">
          <Smartphone size={15} /> 환자 앱 미리보기
        </div>
        <div className="mx-auto w-[300px] border-[10px] border-navy rounded-[36px] bg-white overflow-hidden shadow-lg">
          <div className="bg-navy text-white px-4 pt-3 pb-4">
            <div className="text-[11px] opacity-70">담백보감</div>
            <div className="text-sm font-medium">오늘도 단백질 채우기 💪</div>
            {settings.rankingPublic && (
              <div className="mt-3 bg-white/10 rounded-lg p-2.5 flex items-center justify-between">
                <div>
                  <div className="text-[10px] opacity-70">이번 달 1위</div>
                  <div className="text-xs">{topPatientName}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] opacity-70">내 순위</div>
                  <div className="text-xs">3위 · 7일 연속 🔥</div>
                </div>
              </div>
            )}
          </div>

          <div className="p-3 space-y-3 h-[420px] overflow-y-auto">
            {settings.adHomeBanner && (
              <div className="relative bg-surface rounded-lg p-3 text-xs">
                <span className="absolute top-1.5 right-2 text-[9px] text-muted border border-border rounded px-1">광고</span>
                <div className="text-ink font-medium">제휴 피트니스 첫 달 무료</div>
                <div className="text-muted text-[11px]">담백보감 회원 전용 혜택</div>
              </div>
            )}

            {settings.locationRecommend ? (
              <div>
                <div className="text-xs font-medium text-ink mb-2 flex items-center gap-1">
                  <MapPin size={12} /> 내 주변 담백보감 한의원
                </div>
                <div className="space-y-2">
                  {clinics.slice(0, 4).map((c) => (
                    <div key={c.id} className={`rounded-lg p-2.5 border ${c.sponsored ? 'border-apricot bg-apricot/5' : 'border-border'}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-ink">{c.name}</span>
                        {c.sponsored ? (
                          <span className="text-[9px] text-apricot-ink border border-apricot rounded px-1">광고</span>
                        ) : (
                          <span className="text-[11px] text-navy">{c.distance < 1 ? `${Math.round(c.distance * 1000)}m` : `${c.distance.toFixed(1)}km`}</span>
                        )}
                      </div>
                      <div className="text-[10px] text-muted mt-0.5 flex items-center gap-2">
                        <span className="flex items-center gap-0.5"><Star size={9} className="fill-apricot text-apricot" />{c.rating}</span>
                        <span>{c.hours}</span>
                        {c.hasInbody && <span className="text-diet-good">인바디 측정</span>}
                        {c.sponsored && <span>{c.distance.toFixed(1)}km</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-xs text-muted text-center py-6">내 주변 한의원 추천이 꺼져 있습니다</div>
            )}

            {settings.adAfterMeal && (
              <div className="relative border border-border rounded-lg p-3 text-xs">
                <span className="absolute top-1.5 right-2 text-[9px] text-muted border border-border rounded px-1">광고</span>
                <div className="text-muted text-[11px]">오늘 단백질 32g 부족해요</div>
                <div className="text-ink font-medium">태음인 추천: 무가당 두유 · 두부 스테이크</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
