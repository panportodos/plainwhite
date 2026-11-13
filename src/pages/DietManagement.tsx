// 식이 관리 페이지 - 환자별 체질 맞춤 식단 가이드 및 기록

import { useParams, useNavigate } from 'react-router-dom';
import { useState, useMemo } from 'react';
import { ArrowLeft, Camera, Plus, Sparkles, Trash2 } from 'lucide-react';
import { getPatientById, getMealRecords, deleteMealRecord } from '../lib/storage';
import { calcProteinAverages } from '../lib/mealPhotoAnalysis';
import { MealPhotoUploader } from '../components/MealPhotoUploader';
import { getDietByConstitution } from '../lib/dietByConstitution';
import { ConstitutionBadge } from '../components/ConstitutionBadge';
import type { MealRecord } from '../lib/types';

export function DietManagement() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showUploader, setShowUploader] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // 저장·삭제 후 목록 새로고침용

  // 환자 데이터
  const patient = useMemo(() => (id ? getPatientById(id) : null), [id]);

  // 체질별 식이 가이드
  const dietGuide = useMemo(() => {
    if (!patient) return null;
    return getDietByConstitution(patient.constitution);
  }, [patient]);

  // 이 환자의 전체 식단 기록 (저장된 기록 포함)
  const allMealRecords = useMemo(() => {
    if (!id) return [];
    return getMealRecords(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, refreshKey]);

  // 해당 날짜의 식단 기록
  const mealRecords = useMemo(
    () =>
      allMealRecords
        .filter((record) => record.recordedAt.startsWith(selectedDate))
        .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt)),
    [allMealRecords, selectedDate]
  );

  // 평균 단백질 섭취량 (전체 기록 기준)
  const proteinAverages = useMemo(() => calcProteinAverages(allMealRecords), [allMealRecords]);

  const handleDelete = (recordId: string) => {
    if (!window.confirm('이 식단 기록을 삭제할까요?')) return;
    deleteMealRecord(recordId);
    setRefreshKey((k) => k + 1);
  };

  // 영양소 합계 계산
  const dailyTotals = useMemo(() => {
    return mealRecords.reduce(
      (acc, record) => ({
        protein: acc.protein + record.nutrition.protein,
        carbs: acc.carbs + record.nutrition.carbs,
        fat: acc.fat + record.nutrition.fat,
        calories: acc.calories + record.nutrition.calories,
      }),
      { protein: 0, carbs: 0, fat: 0, calories: 0 }
    );
  }, [mealRecords]);

  // 단백질 목표량 계산 (체중 x 1.2 + 담백환 보너스)
  const proteinTarget = useMemo(() => {
    if (!patient || !dietGuide) return 0;
    return Math.round(patient.weight * 1.2 + dietGuide.proteinBonus);
  }, [patient, dietGuide]);

  if (!patient || !dietGuide) {
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

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <ConstitutionBadge constitution={patient.constitution} showLabel />
            <div>
              <h1 className="text-2xl font-bold text-ink">{patient.name} 님의 식이 관리</h1>
              <p className="text-sm text-muted mt-1">체질 맞춤 식단 가이드 및 기록</p>
            </div>
          </div>

          {/* 날짜 선택 */}
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-apricot"
          />
        </div>
      </div>

      <div className="p-8 max-w-[1200px] mx-auto">
        <div className="grid grid-cols-2 gap-6">
          {/* 왼쪽: 체질별 식이 가이드 */}
          <div className="space-y-6">
            {/* 식이 원칙 */}
            <div className="bg-white rounded-lg border border-border p-6">
              <h2 className="text-lg font-bold text-ink mb-4">
                {patient.constitution} 식이 원칙
              </h2>
              <p className="text-sm text-ink leading-relaxed bg-surface p-4 rounded-lg">
                {dietGuide.guideline}
              </p>
            </div>

            {/* 권장 음식 */}
            <div className="bg-white rounded-lg border border-border p-6">
              <h3 className="text-base font-bold text-ink mb-3 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-diet-good"></div>
                권장 음식
              </h3>
              <div className="flex flex-wrap gap-2">
                {dietGuide.recommended.map((food) => (
                  <span
                    key={food}
                    className="px-3 py-1.5 bg-diet-good bg-opacity-10 text-diet-good text-sm rounded-full"
                  >
                    {food}
                  </span>
                ))}
              </div>
            </div>

            {/* 절제 음식 */}
            <div className="bg-white rounded-lg border border-border p-6">
              <h3 className="text-base font-bold text-ink mb-3 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-diet-caution"></div>
                절제 음식
              </h3>
              <div className="flex flex-wrap gap-2">
                {dietGuide.restricted.map((food) => (
                  <span
                    key={food}
                    className="px-3 py-1.5 bg-diet-caution bg-opacity-10 text-diet-caution text-sm rounded-full"
                  >
                    {food}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* 오른쪽: 오늘의 식단 기록 */}
          <div className="space-y-6">
            {/* 사진 업로드 (AI 분석) */}
            {showUploader && id && (
              <MealPhotoUploader
                patientId={id}
                onClose={() => setShowUploader(false)}
                onSaved={() => {
                  setShowUploader(false);
                  setRefreshKey((k) => k + 1);
                }}
              />
            )}

            {/* 평균 단백질 섭취량 */}
            <div className="bg-white rounded-lg border border-border p-6">
              <div className="flex items-baseline justify-between mb-4">
                <h2 className="text-lg font-bold text-ink">평균 단백질 섭취량</h2>
                {proteinAverages.firstDate && (
                  <span className="text-xs text-muted">
                    {proteinAverages.firstDate} ~ {proteinAverages.lastDate}
                  </span>
                )}
              </div>
              {proteinAverages.mealCount === 0 ? (
                <p className="text-sm text-muted">아직 기록이 없습니다. 식단 사진을 올려 보세요.</p>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-surface rounded-lg p-4">
                      <p className="text-xs text-muted">하루 평균</p>
                      <p className="text-2xl font-bold text-navy mt-1">
                        {proteinAverages.perDay}
                        <span className="text-sm text-muted font-medium ml-1">g/일</span>
                      </p>
                      <p className="text-[11px] text-muted mt-1">
                        목표 {proteinTarget}g 대비 {Math.round((proteinAverages.perDay / proteinTarget) * 100)}%
                      </p>
                    </div>
                    <div className="bg-surface rounded-lg p-4">
                      <p className="text-xs text-muted">한 끼 평균</p>
                      <p className="text-2xl font-bold text-apricot mt-1">
                        {proteinAverages.perMeal}
                        <span className="text-sm text-muted font-medium ml-1">g/끼</span>
                      </p>
                      <p className="text-[11px] text-muted mt-1">
                        {proteinAverages.dayCount}일 · {proteinAverages.mealCount}끼 기록
                      </p>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted mt-3">
                    하루 평균은 기록이 있는 날만으로 계산합니다. 사진을 찍지 않은 끼니가 있으면 실제보다 낮게 나올 수 있습니다.
                  </p>
                </>
              )}
            </div>

            {/* 영양소 요약 */}
            <div className="bg-white rounded-lg border border-border p-6">
              <h2 className="text-lg font-bold text-ink mb-4">오늘의 영양소</h2>

              <div className="space-y-4">
                {/* 단백질 */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-ink">단백질</span>
                    <span className="text-sm text-muted">
                      {dailyTotals.protein}g / {proteinTarget}g
                    </span>
                  </div>
                  <div className="h-2 bg-surface rounded-full overflow-hidden">
                    <div
                      className="h-full bg-apricot rounded-full transition-all"
                      style={{
                        width: `${Math.min((dailyTotals.protein / proteinTarget) * 100, 100)}%`,
                      }}
                    ></div>
                  </div>
                </div>

                {/* 탄수화물 */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-ink">탄수화물</span>
                    <span className="text-sm text-muted">{dailyTotals.carbs}g</span>
                  </div>
                  <div className="h-2 bg-surface rounded-full overflow-hidden">
                    <div
                      className="h-full bg-sky-500 rounded-full"
                      style={{ width: `${Math.min((dailyTotals.carbs / 200) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* 지방 */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-ink">지방</span>
                    <span className="text-sm text-muted">{dailyTotals.fat}g</span>
                  </div>
                  <div className="h-2 bg-surface rounded-full overflow-hidden">
                    <div
                      className="h-full bg-pink rounded-full"
                      style={{ width: `${Math.min((dailyTotals.fat / 60) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* 칼로리 */}
                <div className="pt-2 border-t border-border">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-ink">총 칼로리</span>
                    <span className="text-lg font-bold text-apricot">{dailyTotals.calories} kcal</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 식단 기록 목록 */}
            <div className="bg-white rounded-lg border border-border p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-ink">식단 기록</h2>
                <button
                  onClick={() => setShowUploader(true)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-navy text-white rounded-lg hover:bg-opacity-90 text-sm"
                >
                  <Plus size={16} />
                  <span>사진으로 추가</span>
                </button>
              </div>

              {mealRecords.length === 0 ? (
                <div className="text-center py-12 text-muted">
                  <Camera size={48} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">아직 기록된 식단이 없습니다.</p>
                  <p className="text-xs mt-1">식단을 촬영하여 기록해 보세요.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {mealRecords.map((record) => (
                    <MealRecordCard key={record.id} record={record} onDelete={() => handleDelete(record.id)} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 식단 기록 카드 컴포넌트
function MealRecordCard({ record, onDelete }: { record: MealRecord; onDelete: () => void }) {
  const time = new Date(record.recordedAt).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="border border-border rounded-lg p-4 hover:bg-surface transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted">{record.mealType}</span>
            <span className="text-xs text-muted">{time}</span>
            {record.source === 'ai-photo' && (
              <span className="flex items-center gap-1 text-[11px] text-apricot">
                <Sparkles size={11} /> AI 추정
              </span>
            )}
          </div>
          <h4 className="text-sm font-medium text-ink mt-1">{record.foodName}</h4>
          {record.aiFoods && record.aiFoods.length > 0 && (
            <p className="text-[11px] text-muted mt-1">
              {record.aiFoods.map((f) => `${f.name} ${f.protein}g`).join(' · ')}
            </p>
          )}
        </div>
        <div className="flex items-start gap-2 shrink-0">
          {record.imageUrl?.startsWith('data:') ? (
            <img src={record.imageUrl} alt="" className="w-16 h-16 object-cover rounded-lg" />
          ) : record.imageUrl ? (
            <div className="w-16 h-16 bg-surface rounded-lg flex items-center justify-center">
              <Camera size={20} className="text-muted" />
            </div>
          ) : null}
          <button onClick={onDelete} className="text-muted hover:text-pink" aria-label="기록 삭제">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-border">
        <div className="text-center">
          <p className="text-xs text-muted">단백질</p>
          <p className="text-sm font-medium text-apricot">{record.nutrition.protein}g</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted">탄수화물</p>
          <p className="text-sm font-medium text-ink">{record.nutrition.carbs}g</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted">지방</p>
          <p className="text-sm font-medium text-ink">{record.nutrition.fat}g</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted">칼로리</p>
          <p className="text-sm font-medium text-ink">{record.nutrition.calories}</p>
        </div>
      </div>
    </div>
  );
}
