// 환자 관리 페이지

import { useState, useMemo } from 'react';
import { Topbar } from '../components/Topbar';
import { PatientTable } from '../components/PatientTable';
import { getAllPatients } from '../lib/storage';
import { Search, UserPlus } from 'lucide-react';
import type { PatientStatus } from '../lib/types';

export function Patients() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PatientStatus | '전체'>('전체');

  // 환자 데이터 로드
  const allPatients = useMemo(() => getAllPatients(), []);

  // 검색 및 필터링
  const filteredPatients = useMemo(() => {
    return allPatients.filter((patient) => {
      // 검색어 필터
      const matchesSearch = patient.name.includes(searchQuery) ||
                           patient.chartNumber.includes(searchQuery);

      // 상태 필터
      const matchesStatus = statusFilter === '전체' || patient.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [allPatients, searchQuery, statusFilter]);

  return (
    <div>
      <Topbar
        title="환자 관리"
        subtitle="전체 환자를 조회하고 관리합니다"
        actions={
          <button className="flex items-center gap-2 px-4 py-2 bg-navy text-white rounded-lg hover:bg-opacity-90 transition-colors">
            <UserPlus size={18} />
            <span className="text-sm font-medium">신규 환자</span>
          </button>
        }
      />

      <div className="p-8 max-w-[1440px]">
        {/* 검색 및 필터 */}
        <div className="mb-6 flex items-center gap-4">
          {/* 검색창 */}
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="환자명 또는 차트번호 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-apricot focus:border-transparent"
            />
          </div>

          {/* 상태 필터 */}
          <div className="flex items-center gap-2">
            {(['전체', '복용중', '신규', '중단'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-navy text-white'
                    : 'bg-surface text-muted hover:bg-border'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* 환자 수 표시 */}
        <div className="mb-4 text-sm text-muted">
          전체 {allPatients.length}명 중 {filteredPatients.length}명 표시
        </div>

        {/* 환자 테이블 */}
        <PatientTable patients={filteredPatients} />
      </div>
    </div>
  );
}
