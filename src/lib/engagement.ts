// 환자 참여(게임화) · 커뮤니티 · 위치 기반 추천 · 광고 관련 계산과 샘플 데이터

import type { Constitution, InbodyRecord, MealRecord, Patient } from './types';

// ---------- 포인트 · 배지 ----------

export interface Badge {
  id: string;
  label: string;
  emoji: string;
  description: string;
}

export const BADGES: Badge[] = [
  { id: 'adherence', label: '개근왕', emoji: '🏅', description: '복용 순응도 90% 이상' },
  { id: 'muscle', label: '근력 상승', emoji: '💪', description: '최근 단백질 0.5kg 이상 증가' },
  { id: 'meal', label: '식단 기록왕', emoji: '🍱', description: '식단 기록 3건 이상' },
  { id: 'inbody', label: '꾸준 측정', emoji: '📈', description: '인바디 3회 이상 측정' },
];

export interface RankingRow {
  patient: Patient;
  points: number;
  breakdown: { adherence: number; muscle: number; meal: number; inbody: number };
  badges: Badge[];
}

// 포인트 규칙 (환자 앱에도 똑같이 안내): 순응도 1%당 1점, 단백질 0.1kg 증가당 5점, 식단 기록 1건당 5점, 인바디 측정 1회당 10점
export const POINT_RULES = [
  { label: '복용 순응도', rule: '1%당 1점' },
  { label: '단백질 증가', rule: '0.1kg당 5점' },
  { label: '식단 사진 기록', rule: '1건당 5점' },
  { label: '인바디 측정', rule: '1회당 10점' },
];

export function buildRanking(patients: Patient[], inbody: InbodyRecord[], meals: MealRecord[]): RankingRow[] {
  return patients
    .filter((p) => p.status !== '중단')
    .map((patient) => {
      const mealCount = meals.filter((m) => m.patientId === patient.id).length;
      const inbodyCount = inbody.filter((r) => r.patientId === patient.id).length;
      const breakdown = {
        adherence: Math.round(patient.adherenceRate),
        muscle: Math.max(0, Math.round(patient.proteinChange * 50)),
        meal: mealCount * 5,
        inbody: inbodyCount * 10,
      };
      const badges = BADGES.filter((b) => {
        if (b.id === 'adherence') return patient.adherenceRate >= 90;
        if (b.id === 'muscle') return patient.proteinChange >= 0.5;
        if (b.id === 'meal') return mealCount >= 3;
        if (b.id === 'inbody') return inbodyCount >= 3;
        return false;
      });
      return {
        patient,
        points: breakdown.adherence + breakdown.muscle + breakdown.meal + breakdown.inbody,
        breakdown,
        badges,
      };
    })
    .sort((a, b) => b.points - a.points);
}

// 랭킹·커뮤니티에 공개할 때는 이름 가운데를 가립니다 (김민서 → 김*서)
export function maskName(name: string) {
  if (name.length <= 1) return name;
  if (name.length === 2) return `${name[0]}*`;
  return `${name[0]}${'*'.repeat(name.length - 2)}${name[name.length - 1]}`;
}

// 체질 팀 대항전: 팀 평균 포인트
export function buildTeamScores(rows: RankingRow[]) {
  const teams: Constitution[] = ['태음인', '소음인', '소양인', '태양인'];
  return teams
    .map((c) => {
      const members = rows.filter((r) => r.patient.constitution === c);
      return {
        constitution: c,
        members: members.length,
        avgPoints: members.length ? Math.round(members.reduce((s, r) => s + r.points, 0) / members.length) : 0,
      };
    })
    .sort((a, b) => b.avgPoints - a.avgPoints);
}

// ---------- 챌린지 ----------

export interface Challenge {
  id: string;
  title: string;
  description: string;
  period: string;
  participants: number;
  progress: number; // 0~100 (참가자 평균 달성률)
  reward: string;
}

export const SAMPLE_CHALLENGES: Challenge[] = [
  {
    id: 'C1',
    title: '4주 단백질 목표 달성',
    description: '하루 단백질 목표량을 주 5일 이상 채우기',
    period: '11.3 ~ 11.30',
    participants: 6,
    progress: 64,
    reward: '인바디 1회 무료',
  },
  {
    id: 'C2',
    title: '아침 식단 사진 21일',
    description: '아침 식사를 사진으로 21일 기록',
    period: '11.10 ~ 11.30',
    participants: 4,
    progress: 38,
    reward: '단백환 1주분',
  },
  {
    id: 'C3',
    title: '골격근 +0.5kg',
    description: '다음 인바디 측정에서 골격근 0.5kg 이상 늘리기',
    period: '12월 재측정까지',
    participants: 5,
    progress: 22,
    reward: '체질 맞춤 식단 상담',
  },
];

// ---------- 커뮤니티 ----------

export interface CommunityPost {
  id: string;
  patientId: string;
  constitution: Constitution;
  createdAt: string;
  content: string;
  likes: number;
  comments: number;
  needsDoctorReply: boolean; // 복용·증상 질문 → 원장 답변 필요
}

export const SAMPLE_POSTS: CommunityPost[] = [
  {
    id: 'POST1',
    patientId: 'P003',
    constitution: '소음인',
    createdAt: '2026-11-16T08:20:00',
    content: '따뜻한 두부 계란국으로 아침 단백질 30g 채웠어요. 소화도 편하네요!',
    likes: 12,
    comments: 3,
    needsDoctorReply: false,
  },
  {
    id: 'POST2',
    patientId: 'P002',
    constitution: '소양인',
    createdAt: '2026-11-15T21:05:00',
    content: '단백환 먹고 나서 속이 좀 더부룩한데 식후에 먹어도 되나요?',
    likes: 2,
    comments: 0,
    needsDoctorReply: true,
  },
  {
    id: 'POST3',
    patientId: 'P001',
    constitution: '태음인',
    createdAt: '2026-11-15T12:40:00',
    content: '3회차 인바디에서 골격근 +1.4kg! 체질 팀 1등 가봅시다 💪',
    likes: 18,
    comments: 5,
    needsDoctorReply: false,
  },
  {
    id: 'POST4',
    patientId: 'P007',
    constitution: '소양인',
    createdAt: '2026-11-14T19:10:00',
    content: '운동하는 날은 단백환을 운동 전에 먹는 게 좋을까요, 후에 먹는 게 좋을까요?',
    likes: 4,
    comments: 1,
    needsDoctorReply: true,
  },
];

// ---------- 위치 기반 한의원 추천 ----------

export interface PartnerClinic {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  hours: string;
  hasInbody: boolean;
  sponsored: boolean; // 광고(상단 노출) 여부
  rating: number;
}

// 예시 제휴 한의원 (가상의 이름, 좌표는 서울 시내)
export const SAMPLE_CLINICS: PartnerClinic[] = [
  { id: 'K1', name: '서울 한의원 (우리 한의원)', address: '서울 중구 세종대로', lat: 37.5663, lng: 126.9779, hours: '09:00-19:00', hasInbody: true, sponsored: false, rating: 4.8 },
  { id: 'K2', name: '담백 한의원 광화문점', address: '서울 종로구 새문안로', lat: 37.5709, lng: 126.9726, hours: '09:30-18:30', hasInbody: true, sponsored: true, rating: 4.6 },
  { id: 'K3', name: '체질담 한의원', address: '서울 중구 을지로', lat: 37.5660, lng: 126.9910, hours: '10:00-20:00', hasInbody: true, sponsored: false, rating: 4.5 },
  { id: 'K4', name: '바른몸 한의원 용산점', address: '서울 용산구 한강대로', lat: 37.5298, lng: 126.9648, hours: '09:00-18:00', hasInbody: false, sponsored: false, rating: 4.3 },
  { id: 'K5', name: '마포 사상체질 한의원', address: '서울 마포구 마포대로', lat: 37.5446, lng: 126.9516, hours: '09:00-21:00', hasInbody: true, sponsored: false, rating: 4.7 },
];

// 두 좌표 사이 거리 (km, 하버사인 공식)
export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// 광고는 "광고" 표시를 붙여 맨 위 1곳만, 나머지는 거리순
export function rankClinics(lat: number, lng: number, showSponsored: boolean) {
  const withDistance = SAMPLE_CLINICS.map((c) => ({ ...c, distance: distanceKm(lat, lng, c.lat, c.lng) }));
  const byDistance = [...withDistance].sort((a, b) => a.distance - b.distance);
  if (!showSponsored) return byDistance.map((c) => ({ ...c, sponsored: false }));
  const ad = byDistance.find((c) => c.sponsored);
  return ad ? [ad, ...byDistance.filter((c) => c.id !== ad.id)] : byDistance;
}

// 기본 위치: 서울시청 (위치 권한이 없을 때)
export const DEFAULT_LOCATION = { lat: 37.5663, lng: 126.9779, label: '서울시청 (기본 위치)' };

// ---------- 광고 · 공개 설정 ----------

export interface EngagementSettings {
  rankingPublic: boolean; // 환자 앱에 랭킹 공개
  maskNames: boolean; // 이름 가리기
  communityEnabled: boolean;
  locationRecommend: boolean; // GPS 기반 한의원 추천
  adHomeBanner: boolean; // 환자 앱 홈 배너 광고
  adSponsoredClinic: boolean; // 추천 목록 상단 광고
  adAfterMeal: boolean; // 식단 기록 후 체질 맞춤 상품 추천
}

export const DEFAULT_ENGAGEMENT_SETTINGS: EngagementSettings = {
  rankingPublic: true,
  maskNames: true,
  communityEnabled: true,
  locationRecommend: true,
  adHomeBanner: true,
  adSponsoredClinic: true,
  adAfterMeal: false,
};
