// 대시보드 페이지

import { useMemo } from 'react';
import { Topbar } from '../components/Topbar';
import { StatCard } from '../components/StatCard';
import { getAllPatients, getInbodyRecords, getTodaySchedule } from '../lib/storage';
import { calculateDashboardStats, calculateProteinTrend } from '../lib/stats';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { UserPlus, Clock } from 'lucide-react';

export function Dashboard() {
  // 데이터 로드
  const patients = useMemo(() => getAllPatients(), []);
  const inbodyRecords = useMemo(() => getInbodyRecords(), []);
  const todaySchedule = useMemo(() => getTodaySchedule(), []);

  // 통계 계산
  const stats = useMemo(
    () => calculateDashboardStats(patients, inbodyRecords),
    [patients, inbodyRecords]
  );

  const trendData = useMemo(
    () => calculateProteinTrend(patients, inbodyRecords),
    [patients, inbodyRecords]
  );

  // 오늘 날짜
  const today = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  return (
    <div>
      <Topbar
        title="대시보드"
        subtitle={today}
        actions={
          <button className="flex items-center gap-2 px-4 py-2 bg-navy text-white rounded-lg hover:bg-opacity-90 transition-colors">
            <UserPlus size={18} />
            <span className="text-sm font-medium">신규 환자</span>
          </button>
        }
      />

      <div className="p-8 max-w-[1440px]">
        {/* 요약 카드 4개 */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          <StatCard
            label="관리 환자 수"
            value={stats.totalPatients}
            unit="명"
          />
          <StatCard
            label="복용 중 환자 수"
            value={stats.activeTaking}
            unit="명"
            highlightColor="#E8A878"
          />
          <StatCard
            label="이번 주 인바디 검사"
            value={stats.weeklyTests}
            unit="건"
          />
          <StatCard
            label="단백질 개선율"
            value={stats.proteinImprovement}
            unit="%"
            highlightColor="#1B2A4A"
            trend={stats.proteinImprovement > 50 ? 'up' : 'neutral'}
          />
        </div>

        {/* 차트 + 일정 */}
        <div className="grid grid-cols-3 gap-6">
          {/* 전체 환자 평균 단백질량 추이 (2칸) */}
          <div className="col-span-2 bg-white border border-border rounded-card p-6">
            <h2 className="text-lg font-medium text-ink mb-4">
              전체 환자 평균 단백질량 추이
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ECE9E2" />
                <XAxis
                  dataKey="month"
                  stroke="#A89B76"
                  style={{ fontSize: '12px' }}
                />
                <YAxis
                  stroke="#A89B76"
                  style={{ fontSize: '12px' }}
                  label={{ value: '단백질 (kg)', angle: -90, position: 'insideLeft', style: { fontSize: '12px', fill: '#A89B76' } }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #ECE9E2',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '12px' }}
                />
                <Line
                  type="monotone"
                  dataKey="takingGroup"
                  name="복용군"
                  stroke="#E8A878"
                  strokeWidth={2}
                  dot={{ fill: '#E8A878', r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="nonTakingGroup"
                  name="비복용군"
                  stroke="#A89B76"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: '#A89B76', r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* 오늘 일정 (1칸) */}
          <div className="bg-white border border-border rounded-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Clock size={18} className="text-navy" />
              <h2 className="text-lg font-medium text-ink">오늘 일정</h2>
            </div>
            <div className="space-y-3">
              {todaySchedule.length === 0 ? (
                <p className="text-sm text-muted">오늘 예정된 일정이 없습니다.</p>
              ) : (
                todaySchedule.map((item) => {
                  const time = new Date(item.scheduledAt).toLocaleTimeString('ko-KR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <div
                      key={item.id}
                      className="flex items-start gap-3 p-3 bg-surface rounded-inner"
                    >
                      <div className="flex-1">
                        <div className="text-sm font-medium text-ink">
                          {item.patientName}
                        </div>
                        <div className="text-xs text-muted mt-0.5">
                          {item.type}
                        </div>
                      </div>
                      <div className="text-xs font-medium text-navy">
                        {time}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
