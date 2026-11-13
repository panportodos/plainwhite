// 식단 사진 여러 장 업로드 → AI가 단백질량 추정 → 확인·수정 후 저장

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ImagePlus, Loader2, Sparkles, Trash2, X, AlertCircle, Check } from 'lucide-react';
import {
  analyzeMealPhoto,
  calcProteinAverages,
  getApiKey,
  makeThumbnail,
  type MealAnalysis,
} from '../lib/mealPhotoAnalysis';
import { saveMealRecord } from '../lib/storage';
import type { MealRecord } from '../lib/types';

type MealType = MealRecord['mealType'];
const MEAL_TYPES: MealType[] = ['아침', '점심', '저녁', '간식'];
const MEAL_HOUR: Record<MealType, string> = { 아침: '08', 점심: '12', 저녁: '18', 간식: '15' };

interface PhotoItem {
  id: string;
  file: File;
  previewUrl: string;
  date: string; // YYYY-MM-DD
  mealType: MealType;
  status: 'pending' | 'analyzing' | 'done' | 'error';
  analysis?: MealAnalysis;
  protein: number; // 원장님이 수정할 수 있는 최종 단백질 값
  error?: string;
}

// 브라우저 기준 날짜 (YYYY-MM-DD)
function toLocalDate(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

// 사진 파일의 시각으로 끼니를 짐작 (나중에 직접 바꿀 수 있음)
function guessMealType(d: Date): MealType {
  const h = d.getHours();
  if (h >= 5 && h < 10) return '아침';
  if (h >= 11 && h < 15) return '점심';
  if (h >= 17 && h < 21) return '저녁';
  return '간식';
}

export function MealPhotoUploader({
  patientId,
  onSaved,
  onClose,
}: {
  patientId: string;
  onSaved: () => void;
  onClose: () => void;
}) {
  const [items, setItems] = useState<PhotoItem[]>([]);
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasKey = !!getApiKey();

  // 화면을 떠날 때 미리보기 URL 정리
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  useEffect(() => () => itemsRef.current.forEach((it) => URL.revokeObjectURL(it.previewUrl)), []);

  const updateItem = (id: string, patch: Partial<PhotoItem>) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const added: PhotoItem[] = Array.from(files)
      .filter((f) => f.type.startsWith('image/'))
      .map((file) => {
        const taken = new Date(file.lastModified || Date.now());
        return {
          id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
          file,
          previewUrl: URL.createObjectURL(file),
          date: toLocalDate(taken),
          mealType: guessMealType(taken),
          status: 'pending',
          protein: 0,
        };
      });
    setItems((prev) => [...prev, ...added]);
  };

  const removeItem = (id: string) => {
    setItems((prev) => {
      const target = prev.find((it) => it.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((it) => it.id !== id);
    });
  };

  // 아직 분석하지 않은(또는 실패한) 사진을 3장씩 동시에 분석
  const analyzeAll = async () => {
    const targets = items.filter((it) => it.status === 'pending' || it.status === 'error');
    if (targets.length === 0) return;
    setRunning(true);
    const queue = [...targets];
    const worker = async () => {
      while (queue.length > 0) {
        const it = queue.shift()!;
        updateItem(it.id, { status: 'analyzing', error: undefined });
        try {
          const analysis = await analyzeMealPhoto(it.file);
          updateItem(it.id, { status: 'done', analysis, protein: analysis.nutrition.protein });
        } catch (e) {
          updateItem(it.id, { status: 'error', error: e instanceof Error ? e.message : String(e) });
        }
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    setRunning(false);
  };

  const doneItems = items.filter((it) => it.status === 'done' && it.analysis?.isFood);

  // 업로드한 사진들 기준 평균 (원장님이 수정한 단백질 값 반영)
  const batchAverages = calcProteinAverages(
    doneItems.map((it) => ({
      id: it.id,
      patientId,
      recordedAt: it.date,
      mealType: it.mealType,
      foodName: '',
      nutrition: { protein: it.protein, carbs: 0, fat: 0, calories: 0 },
    })),
  );

  const saveAll = async () => {
    setSaving(true);
    for (const it of doneItems) {
      const a = it.analysis!;
      saveMealRecord({
        id: `M-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        patientId,
        recordedAt: `${it.date}T${MEAL_HOUR[it.mealType]}:00:00`,
        mealType: it.mealType,
        foodName: a.mealName,
        imageUrl: await makeThumbnail(it.file),
        nutrition: { ...a.nutrition, protein: it.protein },
        source: 'ai-photo',
        aiFoods: a.foods,
      });
    }
    setSaving(false);
    items.forEach((it) => URL.revokeObjectURL(it.previewUrl));
    setItems([]);
    onSaved();
  };

  return (
    <div className="bg-white rounded-lg border border-apricot p-6">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-bold text-ink flex items-center gap-2">
          <Sparkles size={18} className="text-apricot" />
          사진으로 식단 기록
        </h2>
        <button onClick={onClose} className="text-muted hover:text-ink" aria-label="닫기">
          <X size={18} />
        </button>
      </div>
      <p className="text-xs text-muted mb-4">
        식사 사진을 여러 장 올리면 AI가 음식과 양을 보고 단백질량을 추정합니다. 결과는 저장 전에 고칠 수 있습니다.
      </p>

      {!hasKey && (
        <div className="flex items-start gap-2 bg-pink/10 border border-pink/30 rounded-lg p-3 mb-4 text-sm text-ink">
          <AlertCircle size={16} className="text-pink mt-0.5 shrink-0" />
          <span>
            AI 분석을 쓰려면 Claude API 키가 필요합니다.{' '}
            <Link to="/settings?tab=ai" className="text-navy font-medium underline">
              설정 &gt; AI 분석
            </Link>
            에서 입력해 주세요.
          </span>
        </div>
      )}

      {/* 사진 선택 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = '';
        }}
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          addFiles(e.dataTransfer.files);
        }}
        className="w-full border-2 border-dashed border-border rounded-lg py-6 text-muted hover:border-apricot hover:text-apricot transition-colors flex flex-col items-center gap-2"
      >
        <ImagePlus size={28} />
        <span className="text-sm">사진 선택 (여러 장 가능) 또는 여기로 끌어다 놓기</span>
      </button>

      {/* 사진 목록 */}
      {items.length > 0 && (
        <div className="mt-4 space-y-3">
          {items.map((it) => (
            <div key={it.id} className="flex gap-3 border border-border rounded-lg p-3">
              <img src={it.previewUrl} alt="" className="w-20 h-20 object-cover rounded-md shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    type="date"
                    value={it.date}
                    onChange={(e) => updateItem(it.id, { date: e.target.value })}
                    className="px-2 py-1 border border-border rounded text-xs"
                  />
                  <select
                    value={it.mealType}
                    onChange={(e) => updateItem(it.id, { mealType: e.target.value as MealType })}
                    className="px-2 py-1 border border-border rounded text-xs"
                  >
                    {MEAL_TYPES.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => removeItem(it.id)}
                    disabled={it.status === 'analyzing'}
                    className="ml-auto text-muted hover:text-pink disabled:opacity-30"
                    aria-label="사진 빼기"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                {it.status === 'pending' && <p className="text-xs text-muted mt-2">분석 대기 중</p>}
                {it.status === 'analyzing' && (
                  <p className="text-xs text-apricot mt-2 flex items-center gap-1">
                    <Loader2 size={13} className="animate-spin" /> AI가 사진을 보는 중…
                  </p>
                )}
                {it.status === 'error' && <p className="text-xs text-pink mt-2">{it.error}</p>}
                {it.status === 'done' && it.analysis && !it.analysis.isFood && (
                  <p className="text-xs text-pink mt-2">음식 사진이 아닌 것 같습니다: {it.analysis.note}</p>
                )}
                {it.status === 'done' && it.analysis?.isFood && (
                  <div className="mt-2">
                    <p className="text-sm font-medium text-ink truncate">{it.analysis.mealName}</p>
                    <p className="text-xs text-muted mt-0.5">
                      {it.analysis.foods.map((f) => `${f.name} ${f.amount} (${f.protein}g)`).join(' · ')}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-muted">단백질</span>
                      <input
                        type="number"
                        min={0}
                        step={0.5}
                        value={it.protein}
                        onChange={(e) => updateItem(it.id, { protein: Number(e.target.value) || 0 })}
                        className="w-20 px-2 py-1 border border-border rounded text-sm font-medium text-apricot"
                      />
                      <span className="text-xs text-muted">g</span>
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full ml-auto ${
                          it.analysis.confidence === '높음'
                            ? 'bg-diet-good/10 text-diet-good'
                            : it.analysis.confidence === '보통'
                              ? 'bg-apricot/10 text-apricot'
                              : 'bg-pink/10 text-pink'
                        }`}
                      >
                        신뢰도 {it.analysis.confidence}
                      </span>
                    </div>
                    {it.analysis.note && <p className="text-[11px] text-muted mt-1">※ {it.analysis.note}</p>}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 업로드한 사진 기준 평균 */}
      {doneItems.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="bg-surface rounded-lg p-4">
            <p className="text-xs text-muted">하루 평균 단백질</p>
            <p className="text-2xl font-bold text-navy mt-1">
              {batchAverages.perDay}
              <span className="text-sm text-muted font-medium ml-1">g/일</span>
            </p>
            <p className="text-[11px] text-muted mt-1">{batchAverages.dayCount}일 기준</p>
          </div>
          <div className="bg-surface rounded-lg p-4">
            <p className="text-xs text-muted">한 끼 평균 단백질</p>
            <p className="text-2xl font-bold text-apricot mt-1">
              {batchAverages.perMeal}
              <span className="text-sm text-muted font-medium ml-1">g/끼</span>
            </p>
            <p className="text-[11px] text-muted mt-1">사진 {batchAverages.mealCount}장 기준</p>
          </div>
        </div>
      )}

      {/* 버튼 */}
      {items.length > 0 && (
        <div className="flex gap-2 mt-4">
          <button
            onClick={analyzeAll}
            disabled={running || !hasKey || !items.some((it) => it.status === 'pending' || it.status === 'error')}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-navy text-white rounded-lg text-sm disabled:opacity-40"
          >
            {running ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {running ? '분석 중…' : 'AI 분석 시작'}
          </button>
          <button
            onClick={saveAll}
            disabled={running || saving || doneItems.length === 0}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-apricot text-white rounded-lg text-sm disabled:opacity-40"
          >
            <Check size={16} />
            {saving ? '저장 중…' : `기록 저장 (${doneItems.length}건)`}
          </button>
        </div>
      )}
    </div>
  );
}
