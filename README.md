# 담백보감 (Dambaek-bogam)

한의원 단백질 보충 환자 관리 웹 서비스

## 프로젝트 개요

담백보감은 한의원에서 체질별 한방 단백질 보충제(담백환)를 복용하는 환자들을 체계적으로 관리하기 위한 웹 애플리케이션입니다. 사상체질(태음인, 소음인, 소양인, 태양인)에 따른 맞춤형 단백질 관리와 인바디 체성분 데이터 추적을 지원합니다.

## 기술 스택

- **Frontend Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS v4
- **Routing**: React Router v6
- **Charts**: Recharts
- **Icons**: Lucide React
- **State Management**: React Hooks (useMemo, useState)
- **Data Storage**: localStorage (Phase 1) → API (Phase 2 예정)

## 디자인 시스템

### 색상 팔레트
- **Navy** (#1B2A4A): 주요 액션, 강조
- **Apricot** (#E8A878): 단백질 관련 데이터, 브랜드 컬러
- **Pink** (#D4537E): 체지방, 경고
- **Muted** (#A89B76): 보조 텍스트
- **Surface** (#F7F5F0): 배경
- **Border** (#ECE9E2): 구분선

### 체질별 색상
- **태음인 (地)**: #7A6A3C (갈색)
- **소음인 (水)**: #3C6E9E (청색)
- **소양인 (火)**: #D85A30 (주황)
- **태양인 (風)**: #6F8F5C (녹색)

## 주요 기능

### 1. 대시보드 (`/`)
- **통계 카드 4개**
  - 전체 환자 수
  - 이번 달 신규 환자
  - 평균 단백질 증가량
  - 평균 복용 순응도
- **단백질 추이 그래프**
  - 복용군 vs 비복용군 비교
  - 최근 6개월 데이터
- **오늘의 일정**
  - 인바디 재측정, 복용 상담, 식이 상담 등

### 2. 환자 관리 (`/patients`)
- **검색 및 필터**
  - 환자명 또는 차트번호 검색
  - 상태별 필터 (전체/복용중/신규/중단)
- **환자 테이블**
  - 이름, 나이, 체질, 제품명
  - 복용 일수, 순응도
  - 단백질 변화 (증가/정체/감소 표시)
  - 최근 검사일
  - 클릭 시 상세 페이지로 이동

### 3. 환자 상세/정밀 분석 (`/patients/:id`)
- **환자 기본 정보**
  - 이름, 나이, 성별, 체질, 복용 순응도
  - 신장, 체중, BMI
- **식이 패턴 매트릭스**
  - 동물성/식물성 단백질, 탄수화물, 지방 비율
  - 진행률 바 차트
- **BIA 체성분 데이터**
  - 골격근량, 체지방량, 체지방률
  - 기초대사량, 체수분, 내장지방
  - 선택한 검사 회차의 데이터 표시
- **체성분 추이 그래프**
  - 단백질량, 골격근량, 체지방량, 체중 추세
  - X축: 검사 회차 + 날짜 (예: "1회\n(5.20)")
  - 그래프 포인트 클릭 시 해당 검사 데이터로 전환
  - 이중 Y축 (kg / %)
- **환자 전환 드롭다운**
  - 상단에서 다른 환자로 즉시 전환 가능
  - 최근 검사일 표시
- **진입 버튼**
  - 식이 관리 페이지로 이동
  - 인바디 스캔 페이지로 이동

### 4. 식이 관리 (`/patients/:id/diet`)
- **체질별 식이 가이드**
  - 식이 원칙 설명
  - 권장 음식 목록 (배지 형태)
  - 절제 음식 목록 (배지 형태)
- **오늘의 영양소 요약**
  - 단백질 목표량 계산 (체중 × 1.2 + 담백환 보너스)
  - 단백질, 탄수화물, 지방 진행률
  - 총 칼로리
- **식단 기록**
  - 날짜 선택
  - 식사 시간별 기록 (아침/점심/저녁/간식)
  - 음식명, 영양소 상세 정보
  - 식단 추가 버튼 (Phase 2에서 구현)

### 5. 인바디 스캔 (`/patients/:id/inbody`)
- **검사 결과 입력 폼**
  - 체중, BMI, 골격근량, 단백질
  - 체지방량, 체지방률
  - 기초대사량, 체수분, 내장지방, 인바디 점수
- **이전 검사 결과 참고**
  - 직전 검사 데이터 표시
- **Phase 1 안내**
  - 수동 입력 방식
  - Phase 2에서 자동 불러오기 예정

### 6. 데이터 분석 (`/analytics`)
- **통계 카드**
  - 전체 환자 수 / 복용중 환자
  - 평균 복용 순응도
  - 단백질 증가 환자 수 / 개선율
  - 총 인바디 검사 횟수
- **체질별 환자 분포 (파이 차트)**
  - 4가지 체질별 환자 수
  - 체질별 색상 코딩
- **복용 순응도 분포 (막대 차트)**
  - 5개 구간 (0-20%, 21-40%, ..., 81-100%)
- **체질별 평균 단백질 증감 (막대 차트)**
  - 체질별 색상으로 구분
- **주요 인사이트**
  - 자동 생성된 분석 요약

### 7. 설정 (`/settings`)
#### 한의원 정보 탭
- 한의원명, 대표 한의사
- 전화번호, 팩스
- 주소

#### 체질별 음식 탭
- 4가지 체질별 설정 카드
- 식이 가이드 문구 편집
- 권장/절제 음식 목록 편집
- 담백환 복용 시 단백질 목표 가산값 설정

#### 데이터 관리 탭
- 현재 저장된 데이터 통계
- 데이터 백업 (Phase 2 예정)
- 모든 데이터 초기화 기능

## 데이터 구조

### Patient (환자)
```typescript
{
  id: string;              // 예: "P001"
  name: string;            // 환자명
  age: number;             // 나이
  gender: '남' | '여';
  chartNumber: string;     // 차트번호
  height: number;          // 신장 (cm)
  weight: number;          // 체중 (kg)
  bmi: number;
  constitution: Constitution;  // 태음인/소음인/소양인/태양인
  productName: string;         // 단백환 지/수/화/풍
  adherenceRate: number;       // 복용 순응도 (%)
  takingDays: number;          // 복용 일수
  status: '복용중' | '신규' | '중단';
  dietPattern: DietPattern;    // 식이 패턴
  latestBia: { ... };          // 최신 체성분 데이터
  proteinChange: number;       // 단백질 증감 (kg)
  lastTestDate: string;        // ISO date
  registeredAt: string;        // ISO date
}
```

### InbodyRecord (인바디 기록)
```typescript
{
  id: string;
  patientId: string;
  testedAt: string;          // ISO date
  weight: number;            // 체중 (kg)
  skeletalMuscle: number;    // 골격근량 (kg)
  protein: number;           // 단백질 (kg)
  bodyFat: number;           // 체지방량 (kg)
  bodyFatPercent: number;    // 체지방률 (%)
  bmi: number;
  bmr: number;               // 기초대사량 (kcal)
  bodyWater: number;         // 체수분 (L)
  visceralFat: number;       // 내장지방 레벨
  score: number;             // 인바디 점수
}
```

### MealRecord (식단 기록)
```typescript
{
  id: string;
  patientId: string;
  recordedAt: string;        // ISO datetime
  mealType: '아침' | '점심' | '저녁' | '간식';
  foodName: string;
  imageUrl?: string;         // Phase 2에서 구현
  nutrition: {
    protein: number;         // 단백질 (g)
    carbs: number;           // 탄수화물 (g)
    fat: number;             // 지방 (g)
    calories: number;        // 칼로리 (kcal)
  };
}
```

## Mock 데이터

### 환자 8명
- **P001** 김민서 (45세, 남, 태음인) - 복용중
- **P002** 이승호 (38세, 남, 소양인) - 복용중
- **P003** 박지은 (52세, 여, 소음인) - 복용중
- **P004** 최정우 (29세, 남, 태양인) - 복용중
- **P005** 정수진 (41세, 여, 태음인) - 복용중
- **P006** 김태현 (55세, 남, 소음인) - 신규
- **P007** 한민지 (34세, 여, 소양인) - 복용중
- **P008** 오재석 (48세, 남, 태음인) - 중단

### 인바디 기록 24회
- 각 환자당 2-4회차 검사 기록
- 체성분 변화 추이 확인 가능

### 식단 기록 10건
- 2024-06-17 (오늘) 기준
- P001, P002, P003, P004 환자의 식단

## 프로젝트 구조

```
plainwhite/
├── src/
│   ├── components/
│   │   ├── AppLayout.tsx          # 메인 레이아웃
│   │   ├── Sidebar.tsx            # 좌측 사이드바
│   │   ├── Topbar.tsx             # 상단 바
│   │   ├── ConstitutionBadge.tsx  # 체질 배지
│   │   ├── PatientTable.tsx       # 환자 테이블
│   │   └── StatCard.tsx           # 통계 카드
│   ├── pages/
│   │   ├── Dashboard.tsx          # 대시보드
│   │   ├── Patients.tsx           # 환자 목록
│   │   ├── PatientDetail.tsx      # 환자 상세
│   │   ├── DietManagement.tsx     # 식이 관리
│   │   ├── InbodyScan.tsx         # 인바디 스캔
│   │   ├── Analytics.tsx          # 데이터 분석
│   │   └── Settings.tsx           # 설정
│   ├── lib/
│   │   ├── types.ts               # 타입 정의
│   │   ├── constants.ts           # 상수
│   │   ├── dietByConstitution.ts  # 체질별 음식
│   │   ├── mockData.ts            # Mock 데이터
│   │   ├── storage.ts             # localStorage 래퍼
│   │   └── stats.ts               # 통계 계산
│   ├── App.tsx                    # 라우팅
│   ├── index.css                  # Tailwind 설정
│   └── main.tsx
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## 설치 및 실행

### 설치
```bash
npm install
```

### 개발 서버 실행
```bash
npm run dev
```

브라우저에서 `http://localhost:5173` 접속

### 빌드
```bash
npm run build
```

### 빌드 결과 미리보기
```bash
npm run preview
```

## 주요 기능 흐름

### 환자 조회 및 상세 분석
1. **환자 관리** 페이지에서 환자 검색
2. 환자 행 클릭 → **환자 상세** 페이지 이동
3. 체성분 추이 그래프에서 특정 검사일 클릭
4. 해당 검사의 상세 데이터 확인
5. "식이 관리" 버튼 클릭 → 식이 가이드 및 오늘의 식단 확인
6. "인바디 스캔" 버튼 클릭 → 새 검사 결과 입력

### 통계 및 분석
1. **데이터 분석** 페이지에서 전체 통계 확인
2. 체질별 환자 분포, 순응도 분포 차트 확인
3. 체질별 평균 단백질 증감 분석
4. 주요 인사이트 확인

### 설정 관리
1. **설정** 페이지에서 한의원 정보 수정
2. 체질별 음식 탭에서 권장/절제 음식 커스터마이징
3. 데이터 관리 탭에서 통계 확인 또는 데이터 초기화

## Phase 2 예정 기능

- **API 연동**: localStorage → 실제 백엔드 API
- **인증/권한**: 사용자 로그인, 역할 관리
- **자동 인바디 연동**: 인바디 기기에서 데이터 자동 불러오기
- **식단 사진 분석**: AI를 활용한 음식 인식 및 영양소 자동 계산
- **데이터 백업/복원**: CSV 내보내기/가져오기
- **알림 기능**: 재검사 일정, 복용 리마인더
- **보고서 생성**: PDF 리포트 자동 생성
- **모바일 앱**: React Native 또는 PWA

## 라이선스

Copyright © 2024 담백보감 한의원. All rights reserved.

## 문의

프로젝트 관련 문의사항이 있으시면 담백보감 한의원으로 연락 주시기 바랍니다.
