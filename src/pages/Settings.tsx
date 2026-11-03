// 설정 페이지 - 시스템 설정 및 체질별 음식 관리

import { useState } from 'react';
import { Topbar } from '../components/Topbar';
import { DIET_BY_CONSTITUTION } from '../lib/dietByConstitution';
import { Building2, Users as UsersIcon, Database, AlertCircle } from 'lucide-react';
import type { ConstitutionDiet } from '../lib/types';
import { CONSTITUTION_MAP } from '../lib/constants';

export function Settings() {
  const [selectedTab, setSelectedTab] = useState<'clinic' | 'diet' | 'data'>('clinic');

  return (
    <div>
      <Topbar
        title="설정"
        subtitle="시스템 설정 및 데이터를 관리합니다"
      />

      <div className="p-8 max-w-[1200px]">
        {/* 탭 메뉴 */}
        <div className="flex gap-2 mb-6 border-b border-border">
          <button
            onClick={() => setSelectedTab('clinic')}
            className={`px-4 py-3 text-sm font-medium transition-colors ${
              selectedTab === 'clinic'
                ? 'text-navy border-b-2 border-navy'
                : 'text-muted hover:text-ink'
            }`}
          >
            <div className="flex items-center gap-2">
              <Building2 size={16} />
              <span>한의원 정보</span>
            </div>
          </button>
          <button
            onClick={() => setSelectedTab('diet')}
            className={`px-4 py-3 text-sm font-medium transition-colors ${
              selectedTab === 'diet'
                ? 'text-navy border-b-2 border-navy'
                : 'text-muted hover:text-ink'
            }`}
          >
            <div className="flex items-center gap-2">
              <UsersIcon size={16} />
              <span>체질별 음식</span>
            </div>
          </button>
          <button
            onClick={() => setSelectedTab('data')}
            className={`px-4 py-3 text-sm font-medium transition-colors ${
              selectedTab === 'data'
                ? 'text-navy border-b-2 border-navy'
                : 'text-muted hover:text-ink'
            }`}
          >
            <div className="flex items-center gap-2">
              <Database size={16} />
              <span>데이터 관리</span>
            </div>
          </button>
        </div>

        {/* 한의원 정보 탭 */}
        {selectedTab === 'clinic' && (
          <div className="bg-white border border-border rounded-card p-8">
            <div className="flex items-center gap-2 mb-6">
              <Building2 size={20} className="text-navy" />
              <h2 className="text-lg font-bold text-ink">한의원 정보</h2>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-ink mb-2">한의원명</label>
                <input
                  type="text"
                  defaultValue="담백보감 한의원"
                  className="w-full px-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-apricot"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-2">대표 한의사</label>
                <input
                  type="text"
                  defaultValue="홍길동 원장"
                  className="w-full px-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-apricot"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ink mb-2">전화번호</label>
                  <input
                    type="tel"
                    defaultValue="02-1234-5678"
                    className="w-full px-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-apricot"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink mb-2">팩스</label>
                  <input
                    type="tel"
                    defaultValue="02-1234-5679"
                    className="w-full px-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-apricot"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-2">주소</label>
                <input
                  type="text"
                  defaultValue="서울특별시 강남구 테헤란로 123"
                  className="w-full px-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-apricot"
                />
              </div>

              <div className="pt-4">
                <button className="px-6 py-2 bg-navy text-white rounded-lg hover:bg-opacity-90 text-sm font-medium">
                  저장
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 체질별 음식 탭 */}
        {selectedTab === 'diet' && (
          <div className="space-y-6">
            {DIET_BY_CONSTITUTION.map((diet) => (
              <DietSettingCard key={diet.constitution} diet={diet} />
            ))}
          </div>
        )}

        {/* 데이터 관리 탭 */}
        {selectedTab === 'data' && (
          <div className="bg-white border border-border rounded-card p-8">
            <div className="flex items-center gap-2 mb-6">
              <Database size={20} className="text-navy" />
              <h2 className="text-lg font-bold text-ink">데이터 관리</h2>
            </div>

            <div className="space-y-6">
              {/* 데이터 초기화 경고 */}
              <div className="bg-pink bg-opacity-10 border border-pink border-opacity-30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle size={20} className="text-pink flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-bold text-pink mb-1">주의사항</h3>
                    <p className="text-sm text-ink">
                      데이터 초기화는 되돌릴 수 없습니다.
                      Phase 2에서 API 연동 시 백업 기능이 추가될 예정입니다.
                    </p>
                  </div>
                </div>
              </div>

              {/* 데이터 통계 */}
              <div>
                <h3 className="text-sm font-medium text-ink mb-3">현재 저장된 데이터</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-surface rounded-lg p-4">
                    <div className="text-xs text-muted mb-1">환자 데이터</div>
                    <div className="text-2xl font-bold text-navy">8명</div>
                  </div>
                  <div className="bg-surface rounded-lg p-4">
                    <div className="text-xs text-muted mb-1">인바디 기록</div>
                    <div className="text-2xl font-bold text-apricot">24회</div>
                  </div>
                  <div className="bg-surface rounded-lg p-4">
                    <div className="text-xs text-muted mb-1">식단 기록</div>
                    <div className="text-2xl font-bold text-pink">10건</div>
                  </div>
                </div>
              </div>

              {/* 데이터 내보내기/가져오기 */}
              <div>
                <h3 className="text-sm font-medium text-ink mb-3">데이터 백업 (Phase 2 예정)</h3>
                <div className="flex gap-3">
                  <button
                    disabled
                    className="px-4 py-2 border border-border rounded-lg text-sm text-muted bg-surface cursor-not-allowed"
                  >
                    데이터 내보내기 (CSV)
                  </button>
                  <button
                    disabled
                    className="px-4 py-2 border border-border rounded-lg text-sm text-muted bg-surface cursor-not-allowed"
                  >
                    데이터 가져오기
                  </button>
                </div>
              </div>

              {/* 데이터 초기화 */}
              <div className="pt-4 border-t border-border">
                <h3 className="text-sm font-medium text-ink mb-3">초기화</h3>
                <button
                  onClick={() => {
                    if (confirm('정말로 모든 데이터를 초기화하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) {
                      localStorage.clear();
                      window.location.reload();
                    }
                  }}
                  className="px-4 py-2 bg-pink text-white rounded-lg hover:bg-opacity-90 text-sm font-medium"
                >
                  모든 데이터 초기화
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// 체질별 음식 설정 카드
function DietSettingCard({ diet }: { diet: ConstitutionDiet }) {
  const color = CONSTITUTION_MAP[diet.constitution].color;
  return (
    <div className="bg-white border border-border rounded-card p-6">
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-medium"
          style={{ backgroundColor: `${color}15`, color }}
        >
          {diet.hanja}
        </div>
        <div>
          <h3 className="text-base font-bold text-ink">{diet.constitution}</h3>
          <p className="text-xs text-muted">{diet.productName}</p>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-ink mb-2">식이 가이드</label>
        <textarea
          defaultValue={diet.guideline}
          rows={2}
          className="w-full px-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-apricot resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-ink mb-2">권장 음식</label>
          <textarea
            defaultValue={diet.recommended.join(', ')}
            rows={3}
            className="w-full px-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-apricot resize-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink mb-2">절제 음식</label>
          <textarea
            defaultValue={diet.restricted.join(', ')}
            rows={3}
            className="w-full px-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-apricot resize-none"
          />
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-ink mb-2">
          담백환 복용 시 단백질 목표 가산값 (g)
        </label>
        <input
          type="number"
          defaultValue={diet.proteinBonus}
          className="w-32 px-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-apricot"
        />
      </div>

      <div className="flex justify-end">
        <button className="px-4 py-2 bg-navy text-white rounded-lg hover:bg-opacity-90 text-sm font-medium">
          저장
        </button>
      </div>
    </div>
  );
}
