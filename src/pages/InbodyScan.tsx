// 인바디 스캔 페이지 - 신규 체성분 검사 기록

import { useParams, useNavigate } from 'react-router-dom';
import { useState, useMemo } from 'react';
import { ArrowLeft, Activity, Save } from 'lucide-react';
import { getPatientById } from '../lib/storage';
import { ConstitutionBadge } from '../components/ConstitutionBadge';

export function InbodyScan() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // 환자 데이터
  const patient = useMemo(() => (id ? getPatientById(id) : null), [id]);

  // 폼 상태
  const [formData, setFormData] = useState({
    weight: '',
    skeletalMuscle: '',
    protein: '',
    bodyFat: '',
    bodyFatPercent: '',
    bmi: '',
    bmr: '',
    bodyWater: '',
    visceralFat: '',
    score: '',
  });

  // 입력 핸들러
  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // 저장 핸들러 (현재는 mock, 실제로는 API 호출)
  const handleSave = () => {
    // TODO: Phase 2에서 API 연동
    alert('인바디 검사 결과가 저장되었습니다.\n(Phase 2에서 실제 저장 기능 구현 예정)');
    navigate(`/patients/${id}`);
  };

  if (!patient) {
    return <div className="p-8 text-muted">환자를 찾을 수 없습니다.</div>;
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* 상단 헤더 */}
      <div className="bg-white border-b border-border px-8 py-6">
        <button
          onClick={() => navigate(`/patients/${id}`)}
          className="flex items-center gap-2 text-muted hover:text-ink mb-4"
        >
          <ArrowLeft size={18} />
          <span className="text-sm">환자 상세로 돌아가기</span>
        </button>

        <div className="flex items-center gap-4">
          <ConstitutionBadge constitution={patient.constitution} showLabel />
          <div>
            <h1 className="text-2xl font-bold text-ink">{patient.name} 님의 인바디 스캔</h1>
            <p className="text-sm text-muted mt-1">새로운 체성분 검사 결과를 입력합니다</p>
          </div>
        </div>
      </div>

      <div className="p-8 max-w-[900px] mx-auto">
        <div className="bg-white rounded-lg border border-border p-8">
          <div className="flex items-center gap-2 mb-6">
            <Activity size={20} className="text-navy" />
            <h2 className="text-lg font-bold text-ink">검사 결과 입력</h2>
          </div>

          {/* 안내 문구 */}
          <div className="bg-apricot bg-opacity-10 border border-apricot border-opacity-30 rounded-lg p-4 mb-6">
            <p className="text-sm text-apricot-ink">
              <strong>Phase 1 안내:</strong> 현재는 수동 입력 방식입니다.
              Phase 2에서는 인바디 기기에서 자동으로 데이터를 불러오는 기능이 추가될 예정입니다.
            </p>
          </div>

          {/* 입력 폼 */}
          <div className="grid grid-cols-2 gap-6">
            {/* 체중 */}
            <div>
              <label className="block text-sm font-medium text-ink mb-2">
                체중 (kg) <span className="text-pink">*</span>
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.weight}
                onChange={(e) => handleChange('weight', e.target.value)}
                placeholder="예: 68.5"
                className="w-full px-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-apricot"
              />
            </div>

            {/* BMI */}
            <div>
              <label className="block text-sm font-medium text-ink mb-2">
                BMI <span className="text-pink">*</span>
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.bmi}
                onChange={(e) => handleChange('bmi', e.target.value)}
                placeholder="예: 23.0"
                className="w-full px-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-apricot"
              />
            </div>

            {/* 골격근량 */}
            <div>
              <label className="block text-sm font-medium text-ink mb-2">
                골격근량 (kg) <span className="text-pink">*</span>
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.skeletalMuscle}
                onChange={(e) => handleChange('skeletalMuscle', e.target.value)}
                placeholder="예: 30.5"
                className="w-full px-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-apricot"
              />
            </div>

            {/* 단백질 */}
            <div>
              <label className="block text-sm font-medium text-ink mb-2">
                단백질 (kg) <span className="text-pink">*</span>
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.protein}
                onChange={(e) => handleChange('protein', e.target.value)}
                placeholder="예: 9.7"
                className="w-full px-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-apricot bg-apricot bg-opacity-5"
              />
            </div>

            {/* 체지방량 */}
            <div>
              <label className="block text-sm font-medium text-ink mb-2">
                체지방량 (kg) <span className="text-pink">*</span>
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.bodyFat}
                onChange={(e) => handleChange('bodyFat', e.target.value)}
                placeholder="예: 15.2"
                className="w-full px-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-apricot"
              />
            </div>

            {/* 체지방률 */}
            <div>
              <label className="block text-sm font-medium text-ink mb-2">
                체지방률 (%) <span className="text-pink">*</span>
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.bodyFatPercent}
                onChange={(e) => handleChange('bodyFatPercent', e.target.value)}
                placeholder="예: 22.4"
                className="w-full px-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-apricot"
              />
            </div>

            {/* 기초대사량 */}
            <div>
              <label className="block text-sm font-medium text-ink mb-2">
                기초대사량 (kcal) <span className="text-pink">*</span>
              </label>
              <input
                type="number"
                value={formData.bmr}
                onChange={(e) => handleChange('bmr', e.target.value)}
                placeholder="예: 1520"
                className="w-full px-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-apricot"
              />
            </div>

            {/* 체수분 */}
            <div>
              <label className="block text-sm font-medium text-ink mb-2">
                체수분 (L) <span className="text-pink">*</span>
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.bodyWater}
                onChange={(e) => handleChange('bodyWater', e.target.value)}
                placeholder="예: 40.1"
                className="w-full px-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-apricot"
              />
            </div>

            {/* 내장지방 레벨 */}
            <div>
              <label className="block text-sm font-medium text-ink mb-2">
                내장지방 레벨 <span className="text-pink">*</span>
              </label>
              <input
                type="number"
                value={formData.visceralFat}
                onChange={(e) => handleChange('visceralFat', e.target.value)}
                placeholder="예: 8"
                className="w-full px-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-apricot"
              />
            </div>

            {/* 인바디 점수 */}
            <div>
              <label className="block text-sm font-medium text-ink mb-2">
                인바디 점수 <span className="text-pink">*</span>
              </label>
              <input
                type="number"
                value={formData.score}
                onChange={(e) => handleChange('score', e.target.value)}
                placeholder="예: 76"
                className="w-full px-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-apricot"
              />
            </div>
          </div>

          {/* 참고: 이전 검사 결과 */}
          <div className="mt-8 pt-6 border-t border-border">
            <h3 className="text-sm font-medium text-muted mb-4">참고: 이전 검사 결과 ({patient.lastTestDate})</h3>
            <div className="grid grid-cols-4 gap-4 text-xs">
              <div className="bg-surface rounded-lg p-3">
                <div className="text-muted mb-1">골격근량</div>
                <div className="text-ink font-medium">{patient.latestBia.skeletalMuscle} kg</div>
              </div>
              <div className="bg-surface rounded-lg p-3">
                <div className="text-muted mb-1">체지방량</div>
                <div className="text-ink font-medium">{patient.latestBia.bodyFat} kg</div>
              </div>
              <div className="bg-surface rounded-lg p-3">
                <div className="text-muted mb-1">체지방률</div>
                <div className="text-ink font-medium">{patient.latestBia.bodyFatPercent}%</div>
              </div>
              <div className="bg-surface rounded-lg p-3">
                <div className="text-muted mb-1">기초대사량</div>
                <div className="text-ink font-medium">{patient.latestBia.bmr} kcal</div>
              </div>
            </div>
          </div>

          {/* 저장 버튼 */}
          <div className="flex gap-4 mt-8">
            <button
              onClick={() => navigate(`/patients/${id}`)}
              className="flex-1 px-6 py-3 border border-border rounded-lg text-sm font-medium text-ink hover:bg-surface transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-navy text-white rounded-lg hover:bg-opacity-90 transition-colors"
            >
              <Save size={18} />
              <span className="font-medium">검사 결과 저장</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
