// 환자 테이블 컴포넌트

import { useNavigate } from 'react-router-dom';
import type { Patient } from '../lib/types';
import { STATUS_STYLES } from '../lib/constants';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

interface PatientTableProps {
  patients: Patient[];
}

export function PatientTable({ patients }: PatientTableProps) {
  const navigate = useNavigate();

  return (
    <div className="bg-white border border-border rounded-card overflow-hidden">
      <table className="w-full">
        <thead className="bg-surface border-b border-border">
          <tr>
            <th className="text-left px-6 py-3 text-sm font-medium text-ink">환자</th>
            <th className="text-left px-6 py-3 text-sm font-medium text-ink">복용일수</th>
            <th className="text-left px-6 py-3 text-sm font-medium text-ink">단백질 (kg)</th>
            <th className="text-left px-6 py-3 text-sm font-medium text-ink">인바디 점수</th>
            <th className="text-left px-6 py-3 text-sm font-medium text-ink">최근 검사일</th>
            <th className="text-left px-6 py-3 text-sm font-medium text-ink">상태</th>
          </tr>
        </thead>
        <tbody>
          {patients.map((patient) => {
            // 단백질 변화 아이콘
            const proteinTrend = patient.proteinChange > 0 ? 'up' :
                                 patient.proteinChange < 0 ? 'down' : 'neutral';

            // 최신 인바디 기록에서 단백질량 가져오기 (임시로 계산)
            const proteinValue = (10 + Math.random() * 2).toFixed(1);

            // 인바디 점수 (임시)
            const inbodyScore = Math.floor(70 + Math.random() * 10);

            // 날짜 포맷
            const lastTestDate = new Date(patient.lastTestDate).toLocaleDateString('ko-KR');

            const statusStyle = STATUS_STYLES[patient.status];

            return (
              <tr
                key={patient.id}
                onClick={() => navigate(`/patients/${patient.id}`)}
                className="border-b border-border hover:bg-surface cursor-pointer transition-colors"
              >
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-ink">{patient.name}</div>
                  <div className="text-xs text-muted mt-0.5">{patient.age}세 · {patient.gender}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-ink">{patient.takingDays}일</div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-ink">{proteinValue}</span>
                    {proteinTrend === 'up' && (
                      <ArrowUp size={14} className="text-green-600" />
                    )}
                    {proteinTrend === 'down' && (
                      <ArrowDown size={14} className="text-red-600" />
                    )}
                    {proteinTrend === 'neutral' && (
                      <Minus size={14} className="text-muted" />
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-ink">{inbodyScore}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-muted">{lastTestDate}</div>
                </td>
                <td className="px-6 py-4">
                  <span
                    className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium"
                    style={{
                      backgroundColor: statusStyle.bg,
                      color: statusStyle.text,
                    }}
                  >
                    {statusStyle.label}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
