// 데이터 분석 페이지 - 전체 환자 통계 및 인사이트

import { useMemo } from 'react';
import { Topbar } from '../components/Topbar';
import { getAllPatients, getAllInbodyRecords } from '../lib/storage';
import { CONSTITUTION_MAP } from '../lib/constants';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Users, Activity, Award } from 'lucide-react';
import type { Constitution } from '../lib/types';

export function Analytics() {
  const allPatients = useMemo(() => getAllPatients(), []);
  const allInbodyRecords = useMemo(() => getAllInbodyRecords(), []);

  // 통계 계산
  const stats = useMemo(() => {
    const totalPatients = allPatients.length;
    const activePatients = allPatients.filter((p) => p.status === '복용중').length;
    const avgAdherence = allPatients.reduce((sum, p) => sum + p.adherenceRate, 0) / totalPatients;
    const proteinImproving = allPatients.filter((p) => p.proteinChange > 0).length;

    return {
      totalPatients,
      activePatients,
      avgAdherence: avgAdherence.toFixed(1),
      proteinImproving,
      improvingRate: ((proteinImproving / totalPatients) * 100).toFixed(1),
    };
  }, [allPatients]);

  // 체질별 환자 분포
  const constitutionData = useMemo(() => {
    const counts: Record<Constitution, number> = {
      태음인: 0,
      소음인: 0,
      소양인: 0,
      태양인: 0,
    };

    allPatients.forEach((p) => {
      counts[p.constitution]++;
    });

    return Object.entries(counts).map(([constitution, count]) => ({
      name: constitution,
      value: count,
      color: CONSTITUTION_MAP[constitution as Constitution].color,
    }));
  }, [allPatients]);

  // 복용 순응도 구간별 분포
  const adherenceDistribution = useMemo(() => {
    const ranges = [
      { name: '0-20%', min: 0, max: 20, count: 0 },
      { name: '21-40%', min: 21, max: 40, count: 0 },
      { name: '41-60%', min: 41, max: 60, count: 0 },
      { name: '61-80%', min: 61, max: 80, count: 0 },
      { name: '81-100%', min: 81, max: 100, count: 0 },
    ];

    allPatients.forEach((p) => {
      const range = ranges.find((r) => p.adherenceRate >= r.min && p.adherenceRate <= r.max);
      if (range) range.count++;
    });

    return ranges;
  }, [allPatients]);

  // 평균 단백질 증감 by 체질
  const proteinChangeByConstitution = useMemo(() => {
    const data: Record<Constitution, { sum: number; count: number }> = {
      태음인: { sum: 0, count: 0 },
      소음인: { sum: 0, count: 0 },
      소양인: { sum: 0, count: 0 },
      태양인: { sum: 0, count: 0 },
    };

    allPatients.forEach((p) => {
      data[p.constitution].sum += p.proteinChange;
      data[p.constitution].count++;
    });

    return Object.entries(data).map(([constitution, { sum, count }]) => ({
      name: constitution,
      avgChange: count > 0 ? (sum / count).toFixed(2) : '0.00',
      color: CONSTITUTION_MAP[constitution as Constitution].color,
    }));
  }, [allPatients]);

  return (
    <div>
      <Topbar
        title="데이터 분석"
        subtitle="전체 환자의 통계 및 인사이트를 확인합니다"
      />

      <div className="p-8 max-w-[1440px]">
        {/* 상단 통계 카드 */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          <div className="bg-white border border-border rounded-card p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-navy bg-opacity-10 flex items-center justify-center">
                <Users size={20} className="text-navy" />
              </div>
              <div>
                <div className="text-xs text-muted">전체 환자</div>
                <div className="text-2xl font-bold text-ink">{stats.totalPatients}명</div>
              </div>
            </div>
            <div className="text-xs text-muted">
              복용중: <span className="text-navy font-medium">{stats.activePatients}명</span>
            </div>
          </div>

          <div className="bg-white border border-border rounded-card p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-apricot bg-opacity-10 flex items-center justify-center">
                <Activity size={20} className="text-apricot" />
              </div>
              <div>
                <div className="text-xs text-muted">평균 순응도</div>
                <div className="text-2xl font-bold text-apricot">{stats.avgAdherence}%</div>
              </div>
            </div>
            <div className="text-xs text-muted">복용 습관 지표</div>
          </div>

          <div className="bg-white border border-border rounded-card p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-pink bg-opacity-10 flex items-center justify-center">
                <TrendingUp size={20} className="text-pink" />
              </div>
              <div>
                <div className="text-xs text-muted">단백질 증가</div>
                <div className="text-2xl font-bold text-pink">{stats.proteinImproving}명</div>
              </div>
            </div>
            <div className="text-xs text-muted">
              개선율: <span className="text-pink font-medium">{stats.improvingRate}%</span>
            </div>
          </div>

          <div className="bg-white border border-border rounded-card p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-diet-good bg-opacity-10 flex items-center justify-center">
                <Award size={20} className="text-diet-good" />
              </div>
              <div>
                <div className="text-xs text-muted">총 검사 횟수</div>
                <div className="text-2xl font-bold text-diet-good">{allInbodyRecords.length}회</div>
              </div>
            </div>
            <div className="text-xs text-muted">인바디 누적 데이터</div>
          </div>
        </div>

        {/* 차트 영역 */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* 체질별 환자 분포 (파이 차트) */}
          <div className="bg-white border border-border rounded-card p-6">
            <h2 className="text-lg font-medium text-ink mb-4">체질별 환자 분포</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={constitutionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name} (${entry.value}명)`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {constitutionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* 복용 순응도 분포 (막대 차트) */}
          <div className="bg-white border border-border rounded-card p-6">
            <h2 className="text-lg font-medium text-ink mb-4">복용 순응도 분포</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={adherenceDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ECE9E2" />
                <XAxis
                  dataKey="name"
                  stroke="#A89B76"
                  style={{ fontSize: '12px' }}
                />
                <YAxis
                  stroke="#A89B76"
                  style={{ fontSize: '12px' }}
                  label={{
                    value: '환자 수',
                    angle: -90,
                    position: 'insideLeft',
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
                />
                <Bar dataKey="count" fill="#E8A878" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 체질별 평균 단백질 증감 */}
        <div className="bg-white border border-border rounded-card p-6">
          <h2 className="text-lg font-medium text-ink mb-4">체질별 평균 단백질 증감</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={proteinChangeByConstitution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ECE9E2" />
              <XAxis
                dataKey="name"
                stroke="#A89B76"
                style={{ fontSize: '12px' }}
              />
              <YAxis
                stroke="#A89B76"
                style={{ fontSize: '12px' }}
                label={{
                  value: '평균 증감 (kg)',
                  angle: -90,
                  position: 'insideLeft',
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
              />
              <Bar dataKey="avgChange" radius={[4, 4, 0, 0]}>
                {proteinChangeByConstitution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 인사이트 섹션 */}
        <div className="mt-6 bg-apricot bg-opacity-10 border border-apricot border-opacity-30 rounded-lg p-6">
          <h3 className="text-base font-bold text-apricot-ink mb-3">주요 인사이트</h3>
          <ul className="space-y-2 text-sm text-ink">
            <li className="flex items-start gap-2">
              <span className="text-apricot">•</span>
              <span>
                전체 환자 중 <strong>{stats.improvingRate}%</strong>가 단백질량 증가 추세를 보이고 있습니다.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-apricot">•</span>
              <span>
                평균 복용 순응도는 <strong>{stats.avgAdherence}%</strong>로, 대부분의 환자가 규칙적으로 복용하고 있습니다.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-apricot">•</span>
              <span>
                가장 많은 환자군은 <strong>{constitutionData[0]?.name}</strong> 체질입니다.
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
