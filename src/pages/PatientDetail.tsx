// 환자 상세 / 정밀 분석 페이지

import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Topbar } from '../components/Topbar';
import { ConstitutionBadge } from '../components/ConstitutionBadge';
import { getPatientById, getInbodyRecords, getAllPatients } from '../lib/storage';
import { DIET_COLORS } from '../lib/constants';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ChevronDown, Activity, Utensils, Check } from 'lucide-react';

export function PatientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // 선택된 인바디 기록 (기본값: 최신)
  const [selectedRecordIndex, setSelectedRecordIndex] = useState<number | null>(null);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);

  // 환자 데이터 로드
  const patient = useMemo(() => getPatientById(id!), [id]);
  const inbodyRecords = useMemo(() => getInbodyRecords(id), [id]);
  const allPatients = useMemo(() => getAllPatients(), []);

  // 현재 선택된 인바디 기록 (없으면 최신)
  const currentRecord = useMemo(() => {
    if (!inbodyRecords.length) return null;
    if (selectedRecordIndex !== null && inbodyRecords[selectedRecordIndex]) {
      return inbodyRecords[selectedRecordIndex];
    }
    return inbodyRecords[inbodyRecords.length - 1]; // 최신 기록
  }, [inbodyRecords, selectedRecordIndex]);

  if (!patient) {
    return (
      <div className="p-8">
        <p className="text-muted">환자를 찾을 수 없습니다.</p>
      </div>
    );
  }

  // 체성분 추이 데이터 (여러 수치)
  const biaTrendData = inbodyRecords.map((record, idx) => {
    const testDate = new Date(record.testedAt);
    const shortDate = `${testDate.getMonth() + 1}.${testDate.getDate()}`;

    return {
      index: idx,
      session: `${idx + 1}회`,
      fullDate: testDate.toLocaleDateString('ko-KR', {
        year: '2-digit',
        month: 'numeric',
        day: 'numeric'
      }),
      shortDate,
      label: `${idx + 1}회\n(${shortDate})`,
      protein: record.protein,
      skeletalMuscle: record.skeletalMuscle,
      bodyFat: record.bodyFat,
      bodyFatPercent: record.bodyFatPercent,
      weight: record.weight,
      proteinStandard: patient.gender === '남' ? 10 : 7.5, // 표준값
    };
  });

  // 그래프 데이터 포인트 클릭 핸들러
  const handleChartClick = (data: any) => {
    if (data && data.activePayload && data.activePayload[0]) {
      const clickedIndex = data.activePayload[0].payload.index;
      setSelectedRecordIndex(clickedIndex);
    }
  };

  return (
    <div>
      <Topbar
        title="환자 정밀 분석"
        subtitle="개별 환자의 체성분 데이터와 식이 패턴을 분석합니다"
        actions={
          // 환자 선택 드롭다운
          <div className="relative">
            <button
              onClick={() => setShowPatientDropdown(!showPatientDropdown)}
              className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-surface transition-colors"
            >
              <span className="text-sm font-medium text-ink">
                {patient.name} ({patient.age}세)
              </span>
              <ChevronDown size={16} className="text-muted" />
            </button>

            {showPatientDropdown && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                {allPatients.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      navigate(`/patients/${p.id}`);
                      setShowPatientDropdown(false);
                      setSelectedRecordIndex(null);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-surface transition-colors flex items-center justify-between"
                  >
                    <div>
                      <div className="text-sm font-medium text-ink">
                        {p.name} ({p.age}세)
                      </div>
                      <div className="text-xs text-muted">
                        최근 검사: {new Date(p.lastTestDate).toLocaleDateString('ko-KR', {
                          year: '2-digit',
                          month: 'numeric',
                          day: 'numeric',
                        })}
                      </div>
                    </div>
                    {p.id === id && (
                      <Check size={16} className="text-apricot" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        }
      />

      <div className="p-8 max-w-[1440px]">
        {/* 현재 선택된 검사 정보 */}
        {currentRecord && inbodyRecords.length > 1 && (
          <div className="mb-4 flex items-center gap-2 text-sm">
            <span className="text-muted">선택된 검사:</span>
            <span className="font-medium text-ink">
              {biaTrendData[selectedRecordIndex ?? biaTrendData.length - 1]?.fullDate}
              {selectedRecordIndex === null && ' (최신)'}
            </span>
            {selectedRecordIndex !== null && (
              <button
                onClick={() => setSelectedRecordIndex(null)}
                className="ml-2 text-xs text-apricot hover:text-apricot-ink"
              >
                최신으로 돌아가기
              </button>
            )}
          </div>
        )}

        {/* 카드 1: 환자 기본 정보 */}
        <div className="bg-white border border-border rounded-card p-6 mb-6">
          {/* 윗줄 4칸 */}
          <div className="grid grid-cols-4 gap-6 mb-6 pb-6 border-b border-border">
            {/* 환자명 */}
            <div>
              <div className="text-xs text-muted mb-2">환자명</div>
              <div className="text-lg font-medium text-ink">{patient.name}</div>
            </div>

            {/* 나이·성별 */}
            <div>
              <div className="text-xs text-muted mb-2">나이·성별</div>
              <div className="text-lg font-medium text-ink">
                {patient.age}세 · {patient.gender}
              </div>
            </div>

            {/* 체질 */}
            <div>
              <div className="text-xs text-muted mb-2">체질</div>
              <ConstitutionBadge constitution={patient.constitution} showLabel />
            </div>

            {/* 복용 순응도 */}
            <div>
              <div className="text-xs text-muted mb-2">복용 순응도</div>
              <div className="text-2xl font-medium text-navy">
                {patient.adherenceRate}%
              </div>
            </div>
          </div>

          {/* 아랫줄 3칸 */}
          <div className="grid grid-cols-3 gap-6">
            <div>
              <div className="text-xs text-muted mb-2">신장</div>
              <div className="text-base text-ink">{patient.height} cm</div>
            </div>
            <div>
              <div className="text-xs text-muted mb-2">체중</div>
              <div className="text-base text-ink">
                {currentRecord ? currentRecord.weight.toFixed(1) : patient.weight} kg
              </div>
            </div>
            <div>
              <div className="text-xs text-muted mb-2">BMI</div>
              <div className="text-base text-ink">
                {currentRecord ? currentRecord.bmi.toFixed(1) : patient.bmi.toFixed(1)}
              </div>
            </div>
          </div>
        </div>

        {/* 카드 2 + 3: 식이 패턴 매트릭스 + BIA 체성분 데이터 */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* 식이 패턴 매트릭스 */}
          <div className="bg-white border border-border rounded-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Utensils size={18} className="text-pink" />
              <h2 className="text-lg font-medium text-ink">식이 패턴 매트릭스</h2>
            </div>
            <div className="space-y-4">
              {/* 동물성 단백질 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: DIET_COLORS.animalProtein }}
                    />
                    <span className="text-sm text-ink">동물성 단백질</span>
                  </div>
                  <span className="text-sm font-medium text-ink">
                    {patient.dietPattern.animalProtein}%
                  </span>
                </div>
                <div className="w-full h-2 bg-surface rounded-full overflow-hidden">
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${patient.dietPattern.animalProtein}%`,
                      backgroundColor: DIET_COLORS.animalProtein,
                    }}
                  />
                </div>
              </div>

              {/* 식물성 단백질 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: DIET_COLORS.plantProtein }}
                    />
                    <span className="text-sm text-ink">식물성 단백질</span>
                  </div>
                  <span className="text-sm font-medium text-ink">
                    {patient.dietPattern.plantProtein}%
                  </span>
                </div>
                <div className="w-full h-2 bg-surface rounded-full overflow-hidden">
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${patient.dietPattern.plantProtein}%`,
                      backgroundColor: DIET_COLORS.plantProtein,
                    }}
                  />
                </div>
              </div>

              {/* 탄수화물 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: DIET_COLORS.carbs }}
                    />
                    <span className="text-sm text-ink">탄수화물</span>
                  </div>
                  <span className="text-sm font-medium text-ink">
                    {patient.dietPattern.carbs}%
                  </span>
                </div>
                <div className="w-full h-2 bg-surface rounded-full overflow-hidden">
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${patient.dietPattern.carbs}%`,
                      backgroundColor: DIET_COLORS.carbs,
                    }}
                  />
                </div>
              </div>

              {/* 지방 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: DIET_COLORS.fat }}
                    />
                    <span className="text-sm text-ink">지방</span>
                  </div>
                  <span className="text-sm font-medium text-ink">
                    {patient.dietPattern.fat}%
                  </span>
                </div>
                <div className="w-full h-2 bg-surface rounded-full overflow-hidden">
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${patient.dietPattern.fat}%`,
                      backgroundColor: DIET_COLORS.fat,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* BIA 체성분 데이터 (현재 선택된 기록) */}
          <div className="bg-white border border-border rounded-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Activity size={18} className="text-navy" />
              <h2 className="text-lg font-medium text-ink">BIA 체성분 데이터</h2>
            </div>
            {currentRecord ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-surface rounded-inner p-3">
                  <div className="text-xs text-muted mb-1">골격근량</div>
                  <div className="text-base font-medium text-ink">
                    {currentRecord.skeletalMuscle} kg
                  </div>
                </div>
                <div className="bg-surface rounded-inner p-3">
                  <div className="text-xs text-muted mb-1">체지방량</div>
                  <div className="text-base font-medium text-pink">
                    {currentRecord.bodyFat} kg
                  </div>
                </div>
                <div className="bg-surface rounded-inner p-3">
                  <div className="text-xs text-muted mb-1">체지방률</div>
                  <div className="text-base font-medium text-ink">
                    {currentRecord.bodyFatPercent.toFixed(1)} %
                  </div>
                </div>
                <div className="bg-surface rounded-inner p-3">
                  <div className="text-xs text-muted mb-1">기초대사량</div>
                  <div className="text-base font-medium text-ink">
                    {currentRecord.bmr} kcal
                  </div>
                </div>
                <div className="bg-surface rounded-inner p-3">
                  <div className="text-xs text-muted mb-1">체수분</div>
                  <div className="text-base font-medium text-ink">
                    {currentRecord.bodyWater} L
                  </div>
                </div>
                <div className="bg-surface rounded-inner p-3">
                  <div className="text-xs text-muted mb-1">내장지방</div>
                  <div className="text-base font-medium text-ink">
                    {currentRecord.visceralFat}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted">인바디 기록이 없습니다.</p>
            )}
          </div>
        </div>

        {/* 체성분 추이 그래프 */}
        {biaTrendData.length > 0 && (
          <div className="bg-white border border-border rounded-card p-6 mb-6">
            <h2 className="text-lg font-medium text-ink mb-2">체성분 추이</h2>
            <p className="text-xs text-muted mb-4">
              그래프의 점을 클릭하면 해당 검사의 상세 데이터를 확인할 수 있습니다
            </p>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={biaTrendData} onClick={handleChartClick}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ECE9E2" />
                <XAxis
                  dataKey="shortDate"
                  stroke="#A89B76"
                  style={{ fontSize: '11px' }}
                  tick={(props) => {
                    const { x, y, payload, index } = props;
                    const data = biaTrendData[index];
                    return (
                      <g transform={`translate(${x},${y})`}>
                        <text
                          x={0}
                          y={0}
                          dy={12}
                          textAnchor="middle"
                          fill="#A89B76"
                          fontSize="11px"
                        >
                          {`${data?.session}`}
                        </text>
                        <text
                          x={0}
                          y={0}
                          dy={24}
                          textAnchor="middle"
                          fill="#A89B76"
                          fontSize="10px"
                        >
                          {`(${data?.shortDate})`}
                        </text>
                      </g>
                    );
                  }}
                  height={50}
                />
                <YAxis
                  yAxisId="left"
                  stroke="#A89B76"
                  style={{ fontSize: '12px' }}
                  label={{
                    value: '체중·골격근·단백질 (kg)',
                    angle: -90,
                    position: 'insideLeft',
                    style: { fontSize: '11px', fill: '#A89B76' },
                  }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#A89B76"
                  style={{ fontSize: '12px' }}
                  label={{
                    value: '체지방량·체지방률',
                    angle: 90,
                    position: 'insideRight',
                    style: { fontSize: '11px', fill: '#A89B76' },
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #ECE9E2',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  labelFormatter={(value, payload) => {
                    if (payload && payload[0]) {
                      return `${payload[0].payload.session} (${payload[0].payload.fullDate})`;
                    }
                    return value;
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />

                {/* 단백질량 (골드색, 강조) */}
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="protein"
                  name="단백질량"
                  stroke="#E8A878"
                  strokeWidth={3}
                  dot={{ fill: '#E8A878', r: 5, cursor: 'pointer' }}
                  activeDot={{ r: 7, cursor: 'pointer' }}
                />

                {/* 골격근량 (남색) */}
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="skeletalMuscle"
                  name="골격근량"
                  stroke="#1B2A4A"
                  strokeWidth={2}
                  dot={{ fill: '#1B2A4A', r: 4, cursor: 'pointer' }}
                  activeDot={{ r: 6, cursor: 'pointer' }}
                />

                {/* 체지방량 (핑크) */}
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="bodyFat"
                  name="체지방량"
                  stroke="#D4537E"
                  strokeWidth={2}
                  dot={{ fill: '#D4537E', r: 4, cursor: 'pointer' }}
                  activeDot={{ r: 6, cursor: 'pointer' }}
                />

                {/* 체중 (회색 점선) */}
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="weight"
                  name="체중"
                  stroke="#A89B76"
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  dot={{ fill: '#A89B76', r: 3, cursor: 'pointer' }}
                  activeDot={{ r: 5, cursor: 'pointer' }}
                />

                {/* 단백질 표준값 (기준선) */}
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="proteinStandard"
                  name="단백질 표준"
                  stroke="#639922"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* 진입 버튼 */}
        <div className="flex gap-4">
          <button
            onClick={() => navigate(`/patients/${id}/diet`)}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-apricot text-apricot-ink rounded-lg hover:bg-opacity-90 transition-colors"
          >
            <Utensils size={18} />
            <span className="font-medium">식이 관리</span>
          </button>
          <button
            onClick={() => navigate(`/patients/${id}/inbody`)}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-navy text-white rounded-lg hover:bg-opacity-90 transition-colors"
          >
            <Activity size={18} />
            <span className="font-medium">인바디 스캔</span>
          </button>
        </div>
      </div>
    </div>
  );
}
