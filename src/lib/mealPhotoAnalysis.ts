// 식단 사진 AI 분석 - Claude API로 사진 속 음식의 단백질량을 추정
//
// 이 사이트는 서버가 없는 정적 웹사이트이므로, 원장님이 설정 화면에 입력한
// Claude API 키를 이 브라우저(localStorage)에만 저장하고, 브라우저에서 바로 호출합니다.
// 키는 GitHub 코드나 다른 곳에 저장되지 않습니다.

import type { MealRecord } from './types';

const API_KEY_STORAGE = 'dambaek_claude_api_key';
const MODEL = 'claude-opus-5-5';

// ---------- API 키 관리 ----------

export function getApiKey(): string {
  try {
    return localStorage.getItem(API_KEY_STORAGE) ?? '';
  } catch {
    return '';
  }
}

export function setApiKey(key: string): void {
  const trimmed = key.trim();
  if (trimmed) localStorage.setItem(API_KEY_STORAGE, trimmed);
  else localStorage.removeItem(API_KEY_STORAGE);
}

// ---------- 분석 결과 형태 ----------

export interface AnalyzedFood {
  name: string; // 음식 이름
  amount: string; // 추정 양 (예: "1공기(210g)")
  protein: number; // g
}

export interface MealAnalysis {
  isFood: boolean; // 음식 사진이 맞는지
  mealName: string; // 한 줄 식단 이름 (예: "현미밥, 된장국, 고등어구이")
  foods: AnalyzedFood[];
  nutrition: MealRecord['nutrition'];
  confidence: '높음' | '보통' | '낮음';
  note: string; // 추정 근거나 주의점
}

// Claude가 반드시 이 형식(JSON)으로만 답하도록 하는 스키마
const ANALYSIS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['isFood', 'mealName', 'foods', 'nutrition', 'confidence', 'note'],
  properties: {
    isFood: { type: 'boolean' },
    mealName: { type: 'string' },
    foods: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'amount', 'protein'],
        properties: {
          name: { type: 'string' },
          amount: { type: 'string' },
          protein: { type: 'number' },
        },
      },
    },
    nutrition: {
      type: 'object',
      additionalProperties: false,
      required: ['protein', 'carbs', 'fat', 'calories'],
      properties: {
        protein: { type: 'number' },
        carbs: { type: 'number' },
        fat: { type: 'number' },
        calories: { type: 'number' },
      },
    },
    confidence: { type: 'string', enum: ['높음', '보통', '낮음'] },
    note: { type: 'string' },
  },
} as const;

const SYSTEM_PROMPT = `당신은 한의원에서 환자의 단백질 섭취를 관리하는 임상영양 보조자입니다.
환자가 찍은 식사 사진 한 장을 보고, 사진에 보이는 음식과 양을 추정해 영양소를 계산합니다.

- 한국 가정식·외식 기준 1인분 분량과 식품의약품안전처 식품영양성분 DB 수준의 값을 기준으로 추정하세요.
- 그릇·수저 크기, 남긴 양 등을 고려해 실제로 먹은 양을 추정하세요. 여러 사람 몫이 보이면 1인분만 계산하고 note에 적으세요.
- 단백질 보충제, 환(丸), 쉐이크, 두유 등 단백질 제품이 보이면 포장의 영양성분표를 읽을 수 있으면 그 값을 쓰세요.
- foods의 protein 합계가 nutrition.protein과 같도록 하세요. 숫자는 소수점 첫째 자리까지만 쓰세요.
- 음식이 아니거나 판단이 불가능하면 isFood를 false로, 영양소는 모두 0으로 하고 note에 이유를 쓰세요.
- 모든 텍스트는 한국어로 짧게 쓰세요.`;

// ---------- 이미지 처리 ----------

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('이미지를 열 수 없습니다. JPG 또는 PNG 사진인지 확인해 주세요.'));
    };
    img.src = url;
  });
}

// 긴 변을 maxSide 이하로 줄인 JPEG(base64, "data:" 접두어 제외)를 돌려줌
async function resizeToJpeg(file: File, maxSide: number, quality: number): Promise<string> {
  const img = await loadImage(file);
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('이미지 처리에 실패했습니다.');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', quality).split(',')[1];
}

// 기록 목록에 보여줄 작은 미리보기 (localStorage 용량을 아끼기 위해 작게)
export async function makeThumbnail(file: File): Promise<string> {
  return 'data:image/jpeg;base64,' + (await resizeToJpeg(file, 240, 0.7));
}

// ---------- Claude 호출 ----------

export async function analyzeMealPhoto(file: File): Promise<MealAnalysis> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Claude API 키가 없습니다. 설정 > AI 분석 탭에서 먼저 입력해 주세요.');
  }

  // 사진은 1568px 이하로 줄여서 보냄 (비용·속도 절약, 정확도 영향 거의 없음)
  const imageData = await resizeToJpeg(file, 1568, 0.85);

  // SDK는 사진 분석을 할 때만 불러옴 (첫 화면 로딩 속도 유지)
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({
    apiKey,
    // 서버 없이 브라우저에서 직접 호출하기 위해 필요한 설정.
    // 키는 원장님 브라우저에만 저장되어 있으므로, 공용 PC에서는 사용 후 키를 지워 주세요.
    dangerouslyAllowBrowser: true,
  });

  let response;
  try {
    response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default', // 안전 정책으로 거절되면 다른 모델이 이어서 처리
      output_config: {
        effort: 'medium',
        format: { type: 'json_schema', schema: ANALYSIS_SCHEMA },
      },
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageData } },
            { type: 'text', text: '이 식사 사진의 음식, 양, 영양소를 추정해 주세요.' },
          ],
        },
      ],
    });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      throw new Error('API 키가 올바르지 않습니다. 설정 > AI 분석 탭에서 키를 확인해 주세요.', { cause: error });
    } else if (error instanceof Anthropic.PermissionDeniedError) {
      throw new Error('이 API 키로는 분석 권한이 없습니다. Claude Console에서 키 권한을 확인해 주세요.', { cause: error });
    } else if (error instanceof Anthropic.RateLimitError) {
      throw new Error('요청이 많아 잠시 제한되었습니다. 1분 뒤 다시 시도해 주세요.', { cause: error });
    } else if (error instanceof Anthropic.APIConnectionError) {
      throw new Error('인터넷 연결을 확인해 주세요.', { cause: error });
    } else if (error instanceof Anthropic.APIError) {
      throw new Error(`AI 분석 오류 (${error.status ?? '알 수 없음'}): ${error.message}`, { cause: error });
    }
    throw error;
  }

  if (response.stop_reason === 'refusal') {
    throw new Error('AI가 이 사진의 분석을 거절했습니다. 다른 사진으로 시도해 주세요.');
  }
  if (response.stop_reason === 'max_tokens') {
    throw new Error('AI 응답이 중간에 끊겼습니다. 다시 시도해 주세요.');
  }

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('AI 응답을 읽을 수 없습니다. 다시 시도해 주세요.');
  }

  const parsed = JSON.parse(textBlock.text) as MealAnalysis;
  const round1 = (n: number) => Math.round(n * 10) / 10;
  parsed.nutrition = {
    protein: round1(parsed.nutrition.protein),
    carbs: round1(parsed.nutrition.carbs),
    fat: round1(parsed.nutrition.fat),
    calories: Math.round(parsed.nutrition.calories),
  };
  return parsed;
}

// ---------- 평균 계산 ----------

export interface ProteinAverages {
  mealCount: number; // 기록된 끼니 수
  dayCount: number; // 기록이 있는 날 수
  perDay: number; // 하루 평균 단백질 (g)
  perMeal: number; // 한 끼 평균 단백질 (g)
  firstDate: string | null;
  lastDate: string | null;
}

export function calcProteinAverages(records: MealRecord[]): ProteinAverages {
  if (records.length === 0) {
    return { mealCount: 0, dayCount: 0, perDay: 0, perMeal: 0, firstDate: null, lastDate: null };
  }
  const days = [...new Set(records.map((r) => r.recordedAt.slice(0, 10)))].sort();
  const total = records.reduce((sum, r) => sum + r.nutrition.protein, 0);
  const round1 = (n: number) => Math.round(n * 10) / 10;
  return {
    mealCount: records.length,
    dayCount: days.length,
    perDay: round1(total / days.length),
    perMeal: round1(total / records.length),
    firstDate: days[0],
    lastDate: days[days.length - 1],
  };
}
