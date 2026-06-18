// localStorage 래퍼
// 나중에 실제 API로 교체할 때 이 파일만 수정하면 됨

import type { Patient, InbodyRecord, MealRecord, ScheduleItem } from './types';
import { MOCK_PATIENTS, MOCK_INBODY_RECORDS, MOCK_MEAL_RECORDS, MOCK_SCHEDULE } from './mockData';

const STORAGE_KEYS = {
  PATIENTS: 'dambaek_patients',
  INBODY: 'dambaek_inbody',
  MEALS: 'dambaek_meals',
  SCHEDULE: 'dambaek_schedule',
} as const;

// 초기 데이터 로드
function initStorage() {
  if (!localStorage.getItem(STORAGE_KEYS.PATIENTS)) {
    localStorage.setItem(STORAGE_KEYS.PATIENTS, JSON.stringify(MOCK_PATIENTS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.INBODY)) {
    localStorage.setItem(STORAGE_KEYS.INBODY, JSON.stringify(MOCK_INBODY_RECORDS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.MEALS)) {
    localStorage.setItem(STORAGE_KEYS.MEALS, JSON.stringify(MOCK_MEAL_RECORDS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.SCHEDULE)) {
    localStorage.setItem(STORAGE_KEYS.SCHEDULE, JSON.stringify(MOCK_SCHEDULE));
  }
}

// 환자 관련
export function getAllPatients(): Patient[] {
  initStorage();
  const data = localStorage.getItem(STORAGE_KEYS.PATIENTS);
  return data ? JSON.parse(data) : [];
}

export function getPatientById(id: string): Patient | undefined {
  const patients = getAllPatients();
  return patients.find(p => p.id === id);
}

export function savePatient(patient: Patient): void {
  const patients = getAllPatients();
  const index = patients.findIndex(p => p.id === patient.id);
  if (index >= 0) {
    patients[index] = patient;
  } else {
    patients.push(patient);
  }
  localStorage.setItem(STORAGE_KEYS.PATIENTS, JSON.stringify(patients));
}

// 인바디 기록 관련
export function getInbodyRecords(patientId?: string): InbodyRecord[] {
  initStorage();
  const data = localStorage.getItem(STORAGE_KEYS.INBODY);
  const records: InbodyRecord[] = data ? JSON.parse(data) : [];
  return patientId ? records.filter(r => r.patientId === patientId) : records;
}

export function getAllInbodyRecords(): InbodyRecord[] {
  return getInbodyRecords();
}

export function saveInbodyRecord(record: InbodyRecord): void {
  const records = getInbodyRecords();
  records.push(record);
  localStorage.setItem(STORAGE_KEYS.INBODY, JSON.stringify(records));
}

// 식단 기록 관련
export function getMealRecords(patientId?: string): MealRecord[] {
  initStorage();
  const data = localStorage.getItem(STORAGE_KEYS.MEALS);
  const meals: MealRecord[] = data ? JSON.parse(data) : [];
  return patientId ? meals.filter(m => m.patientId === patientId) : meals;
}

export function saveMealRecord(meal: MealRecord): void {
  const meals = getMealRecords();
  meals.push(meal);
  localStorage.setItem(STORAGE_KEYS.MEALS, JSON.stringify(meals));
}

// 일정 관련
export function getSchedule(): ScheduleItem[] {
  initStorage();
  const data = localStorage.getItem(STORAGE_KEYS.SCHEDULE);
  return data ? JSON.parse(data) : [];
}

export function getTodaySchedule(): ScheduleItem[] {
  const schedule = getSchedule();
  const today = new Date().toISOString().split('T')[0];
  return schedule.filter(s => s.scheduledAt.startsWith(today));
}
