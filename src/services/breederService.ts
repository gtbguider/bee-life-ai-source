import { BreederQueen, BreederMetricLog } from '../types';
import {
  fetchQueensFromFirestore,
  saveQueenToFirestore,
  deleteQueenFromFirestore
} from './firestoreService';

const STORAGE_KEY = 'beekeeping_breeder_queens_v1';

function getQueensStorageKey(uid?: string): string {
  return uid ? `${STORAGE_KEY}_${uid}` : STORAGE_KEY;
}

export const initialBreederQueens: BreederQueen[] = [
  // F0: 원종 모계 (지리산 원종 시조)
  {
    id: 'BQ-F0-01',
    name: '지리산 원종모계 Q2022-ROOT',
    hiveId: 0, // 0: 원종 보존격리 구역
    parentQueenId: null,
    generation: 'F0',
    breed: '지리산 황색계 원종 (토종순계)',
    installedDate: '2022-04-10',
    status: '우수판정',
    honeyHarvestKg: 22.5,
    propolisYieldG: 360,
    royalJellyYieldG: 280,
    colonyStrength: 10,
    eggLayingRate: 98,
    docilityScore: '최상',
    isFavorite: true,
    notes: '지리산 격리교미장 순계 보존원종. 높은 질병 저항력과 다산성 형질을 보유함.',
    logs: [
      {
        id: 'log-f0-1',
        date: '2022-05-20',
        honeyYieldKg: 21.0,
        propolisYieldG: 340,
        royalJellyYieldG: 260,
        colonyStrength: 9,
        eggLayingRate: 96,
        notes: '1차 봄철 아카시아 채밀 및 산란력 검정 완료'
      },
      {
        id: 'log-f0-2',
        date: '2022-08-15',
        honeyYieldKg: 24.0,
        propolisYieldG: 380,
        royalJellyYieldG: 300,
        colonyStrength: 10,
        eggLayingRate: 99,
        notes: '여름철 로열제리 대량 분비 및 완숙꿀 다수 수확'
      }
    ]
  },

  // F1: #1번 벌통 (원종 F0의 1차 딸여왕벌)
  {
    id: 'BQ-F1-01',
    name: '여왕벌 Q2023-M1 (#1번 벌통)',
    hiveId: 1, // 연결된 벌통: 1번
    parentQueenId: 'BQ-F0-01',
    generation: 'F1',
    breed: '이탈리안 1세대 (우수산란계)',
    installedDate: '2023-04-15',
    status: '우수판정',
    honeyHarvestKg: 20.8,
    propolisYieldG: 320,
    royalJellyYieldG: 260,
    colonyStrength: 9,
    eggLayingRate: 95,
    docilityScore: '최상',
    isFavorite: true,
    notes: '#1번 벌통 주력 종봉. 산란 안정성과 봄철 증봉 속도가 매우 탁월함.',
    logs: [
      {
        id: 'log-f1-1',
        date: '2023-05-18',
        honeyYieldKg: 19.5,
        propolisYieldG: 310,
        royalJellyYieldG: 250,
        colonyStrength: 9,
        eggLayingRate: 94,
        notes: '아카시아 채밀 검정 및 소비 9매 만상 유지'
      },
      {
        id: 'log-f1-2',
        date: '2023-09-10',
        honeyYieldKg: 22.0,
        propolisYieldG: 330,
        royalJellyYieldG: 270,
        colonyStrength: 9,
        eggLayingRate: 96,
        notes: '가을철 프로폴리스 채취망 포집 및 월동 봉군 육성 우수'
      }
    ]
  },

  // F1: #5번 벌통 (원종 F0의 2차 딸여왕벌)
  {
    id: 'BQ-F1-02',
    name: '여왕벌 Q2023-M2 (#5번 벌통)',
    hiveId: 5, // 연결된 벌통: 5번
    parentQueenId: 'BQ-F0-01',
    generation: 'F1',
    breed: '카니올란 1세대 (온순·수밀계)',
    installedDate: '2023-04-20',
    status: '활동중',
    honeyHarvestKg: 24.2,
    propolisYieldG: 410,
    royalJellyYieldG: 210,
    colonyStrength: 10,
    eggLayingRate: 93,
    docilityScore: '최상',
    notes: '#5번 벌통 위치. 방어성이 온순하고 프로폴리스 포집량과 야생화 채밀력이 탁월함.',
    logs: [
      {
        id: 'log-f1-21',
        date: '2023-06-05',
        honeyYieldKg: 24.2,
        propolisYieldG: 410,
        royalJellyYieldG: 210,
        colonyStrength: 10,
        eggLayingRate: 93,
        notes: '1차 야생화 채밀 24.2kg 달성'
      }
    ]
  },

  // F2: #12번 벌통 (F1 #1번 벌통의 딸여왕벌)
  {
    id: 'BQ-F2-01',
    name: '여왕벌 Q2024-A1 (#12번 벌통)',
    hiveId: 12, // 연결된 벌통: 12번
    parentQueenId: 'BQ-F1-01',
    generation: 'F2',
    breed: '이탈리안-카니올란 교잡종 (우수)',
    installedDate: '2024-04-10',
    status: '활동중',
    honeyHarvestKg: 18.5,
    propolisYieldG: 295,
    royalJellyYieldG: 245,
    colonyStrength: 9,
    eggLayingRate: 94,
    docilityScore: '우수',
    isFavorite: true,
    notes: 'Q2023-M1의 우수 이충 자묘. 숙성도 90% 이상 유지 및 로열제리 이충 모계로 최적.',
    logs: [
      {
        id: 'log-f2-1',
        date: '2024-05-25',
        honeyYieldKg: 17.5,
        propolisYieldG: 280,
        royalJellyYieldG: 235,
        colonyStrength: 8,
        eggLayingRate: 93,
        notes: '아카시아 1차 검정: 숙성도 우수'
      },
      {
        id: 'log-f2-2',
        date: '2024-07-02',
        honeyYieldKg: 19.5,
        propolisYieldG: 310,
        royalJellyYieldG: 255,
        colonyStrength: 9,
        eggLayingRate: 95,
        notes: '생로열제리 240g 채취 및 2차 밤꿀 채밀 완료'
      }
    ]
  },

  // F2: #18번 벌통 (F1 #1번 벌통의 또 다른 딸여왕벌)
  {
    id: 'BQ-F2-02',
    name: '여왕벌 Q2024-A2 (#18번 벌통)',
    hiveId: 18, // 연결된 벌통: 18번
    parentQueenId: 'BQ-F1-01',
    generation: 'F2',
    breed: '고수밀 다산형 F2',
    installedDate: '2024-04-18',
    status: '활동중',
    honeyHarvestKg: 21.0,
    propolisYieldG: 330,
    royalJellyYieldG: 250,
    colonyStrength: 8,
    eggLayingRate: 92,
    docilityScore: '우수',
    notes: '세력 확장력이 우수하여 채밀용 주력 통으로 운영 중.',
    logs: [
      {
        id: 'log-f2-21',
        date: '2024-05-30',
        honeyYieldKg: 21.0,
        propolisYieldG: 330,
        royalJellyYieldG: 250,
        colonyStrength: 8,
        eggLayingRate: 92,
        notes: '채밀 21kg 완숙꿀 기록'
      }
    ]
  },

  // F2: #7번 벌통 (F1 #5번 벌통의 딸여왕벌)
  {
    id: 'BQ-F2-03',
    name: '여왕벌 Q2024-K1 (#7번 벌통)',
    hiveId: 7, // 연결된 벌통: 7번
    parentQueenId: 'BQ-F1-02',
    generation: 'F2',
    breed: '프로폴리스 특화계 F2',
    installedDate: '2024-04-25',
    status: '우수판정',
    honeyHarvestKg: 16.5,
    propolisYieldG: 480,
    royalJellyYieldG: 195,
    colonyStrength: 8,
    eggLayingRate: 91,
    docilityScore: '최상',
    notes: '국내 최고 수준의 고농도 프로폴리스 포집형 계통.',
    logs: [
      {
        id: 'log-f2-31',
        date: '2024-09-15',
        honeyYieldKg: 16.5,
        propolisYieldG: 480,
        royalJellyYieldG: 195,
        colonyStrength: 8,
        eggLayingRate: 91,
        notes: '가을철 프로폴리스 480g 수확 기록'
      }
    ]
  },

  // F3: #33번 벌통 (F2 #12번 벌통의 딸여왕벌)
  {
    id: 'BQ-F3-01',
    name: '여왕벌 Q2025-F3 (#33번 벌통)',
    hiveId: 33, // 연결된 벌통: 33번
    parentQueenId: 'BQ-F2-01',
    generation: 'F3',
    breed: '로열제리·산란 특화 육성종',
    installedDate: '2025-04-12',
    status: '육성중',
    honeyHarvestKg: 17.2,
    propolisYieldG: 305,
    royalJellyYieldG: 290,
    colonyStrength: 9,
    eggLayingRate: 96,
    docilityScore: '최상',
    isFavorite: true,
    notes: '#12번 우수 종봉에서 이충 생산된 F3 차세대 기대주.',
    logs: [
      {
        id: 'log-f3-1',
        date: '2025-05-15',
        honeyYieldKg: 17.2,
        propolisYieldG: 305,
        royalJellyYieldG: 290,
        colonyStrength: 9,
        eggLayingRate: 96,
        notes: '왕대 형성률 92% 및 로열제리 산출량 최우수 평가'
      }
    ]
  },

  // F3: #2번 벌통 (F2 #12번 벌통의 딸여왕벌 2)
  {
    id: 'BQ-F3-02',
    name: '여왕벌 Q2025-F3B (#2번 벌통)',
    hiveId: 2, // 연결된 벌통: 2번
    parentQueenId: 'BQ-F2-01',
    generation: 'F3',
    breed: '신왕 육성 교미군',
    installedDate: '2025-04-20',
    status: '육성중',
    honeyHarvestKg: 15.5,
    propolisYieldG: 275,
    royalJellyYieldG: 230,
    colonyStrength: 7,
    eggLayingRate: 90,
    docilityScore: '우수',
    notes: '2번 벌통 신왕 안착 및 1차 산란 확인.',
    logs: [
      {
        id: 'log-f3-21',
        date: '2025-05-10',
        honeyYieldKg: 15.5,
        propolisYieldG: 275,
        royalJellyYieldG: 230,
        colonyStrength: 7,
        eggLayingRate: 90,
        notes: '신왕 교미 성공 및 초생란 정상 확인'
      }
    ]
  }
];

export function loadBreederQueens(uid?: string): BreederQueen[] {
  try {
    const raw = localStorage.getItem(getQueensStorageKey(uid));
    if (!raw) {
      if (uid) return [];
      saveBreederQueens(initialBreederQueens);
      return initialBreederQueens;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      if (uid) return parsed;
      if (parsed.length > 0) return parsed;
    }
    if (uid) return [];
    saveBreederQueens(initialBreederQueens);
    return initialBreederQueens;
  } catch (e) {
    console.error('Failed to load breeder queens', e);
    return uid ? [] : initialBreederQueens;
  }
}

export function saveBreederQueens(queens: BreederQueen[], uid?: string): void {
  try {
    localStorage.setItem(getQueensStorageKey(uid), JSON.stringify(queens));
  } catch (e) {
    console.error('Failed to save breeder queens', e);
  }
}

export function getBreederQueenByHiveId(hiveId: number, uid?: string): BreederQueen | undefined {
  const queens = loadBreederQueens(uid);
  return queens.find((q) => q.hiveId === hiveId);
}

export function addBreederQueen(newQueen: BreederQueen, uid?: string): BreederQueen[] {
  const queens = loadBreederQueens(uid);
  // If a queen already exists for this hive, replace or update it
  const existingIdx = queens.findIndex((q) => q.hiveId === newQueen.hiveId);
  let updated: BreederQueen[];
  if (existingIdx >= 0) {
    updated = [...queens];
    updated[existingIdx] = newQueen;
  } else {
    updated = [newQueen, ...queens];
  }
  saveBreederQueens(updated, uid);
  return updated;
}

export function updateBreederQueen(queen: BreederQueen, uid?: string): BreederQueen[] {
  const queens = loadBreederQueens(uid);
  const updated = queens.map((q) => (q.id === queen.id ? queen : q));
  saveBreederQueens(updated, uid);
  return updated;
}

export function deleteBreederQueen(queenId: string, uid?: string): BreederQueen[] {
  const queens = loadBreederQueens(uid);
  const updated = queens.filter((q) => q.id !== queenId);
  saveBreederQueens(updated, uid);
  return updated;
}

/**
 * Continuous recording: Add a new metric measurement log to a queen
 * and update the queen's cumulative metrics.
 */
export function addMetricLogToQueen(
  queenId: string,
  log: Omit<BreederMetricLog, 'id'>,
  uid?: string
): { updatedQueens: BreederQueen[]; updatedQueen: BreederQueen } {
  const queens = loadBreederQueens(uid);
  const queen = queens.find((q) => q.id === queenId);
  if (!queen) {
    throw new Error('Queen not found');
  }

  const newLogItem: BreederMetricLog = {
    ...log,
    id: `log-${Date.now()}`
  };

  const newLogs = [newLogItem, ...queen.logs];

  // Update latest / cumulative metrics
  const updatedQueen: BreederQueen = {
    ...queen,
    honeyHarvestKg: log.honeyYieldKg || queen.honeyHarvestKg,
    propolisYieldG: log.propolisYieldG || queen.propolisYieldG,
    royalJellyYieldG: log.royalJellyYieldG || queen.royalJellyYieldG,
    colonyStrength: log.colonyStrength || queen.colonyStrength,
    eggLayingRate: log.eggLayingRate || queen.eggLayingRate,
    logs: newLogs
  };

  const updatedQueens = queens.map((q) => (q.id === queenId ? updatedQueen : q));
  saveBreederQueens(updatedQueens, uid);

  return { updatedQueens, updatedQueen };
}

export function resetBreederQueens(uid?: string): BreederQueen[] {
  saveBreederQueens(initialBreederQueens, uid);
  return initialBreederQueens;
}

export async function loadBreederQueensWithFirestore(uid?: string): Promise<BreederQueen[]> {
  if (uid) {
    try {
      const cloudQueens = await fetchQueensFromFirestore(uid);
      const list = cloudQueens ?? [];
      saveBreederQueens(list, uid);
      return list;
    } catch (e) {
      console.warn('Firestore queens load error, using UID-scoped local fallback:', e);
      return loadBreederQueens(uid);
    }
  }
  return loadBreederQueens();
}

export async function saveBreederQueenWithFirestore(queen: BreederQueen, uid?: string): Promise<BreederQueen[]> {
  const updated = addBreederQueen(queen, uid);
  if (uid) {
    try {
      await saveQueenToFirestore(uid, queen);
    } catch (e) {
      console.warn('Firestore queen save notice:', e);
    }
  }
  return updated;
}

export async function deleteBreederQueenWithFirestore(queenId: string, uid?: string): Promise<BreederQueen[]> {
  const updated = deleteBreederQueen(queenId, uid);
  if (uid) {
    try {
      await deleteQueenFromFirestore(uid, queenId);
    } catch (e) {
      console.warn('Firestore queen delete notice:', e);
    }
  }
  return updated;
}

