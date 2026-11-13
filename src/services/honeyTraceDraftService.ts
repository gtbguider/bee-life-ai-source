import {
  VoiceLogItem,
  HoneyLotDraft,
  HoneyHarvestEvidence,
  HarvestOperation,
  HoneyLot,
  ApiaryProductType
} from '../types';
import { formatHiveRange, generateLotNumber } from './honeyLotService';
import { generatePublicTraceId } from './honeyTracePublicService';

/**
 * 꿀 생산 관련 핵심 탐색 키워드
 * (채밀, 꿀, 아카시아, 밤꿀, 야생화, 밀원, 채밀량 등)
 */
export const HONEY_KEYWORDS = [
  '채밀',
  '꿀',
  '아카시아',
  '밤꿀',
  '밤꽃',
  '야생화',
  '잡화',
  '밀원',
  '채밀량',
  '유밀',
  '숙성꿀',
  '자연숙성',
  '꿀뜨기',
  '화밀',
  '채밀기',
  '말통',
  '드럼'
] as const;

/**
 * 특정 양봉일지가 꿀 생산/채밀과 관련된 기록인지 판별하고 매칭된 키워드를 반환합니다.
 */
export function analyzeJournalForHoneyProduction(journal: VoiceLogItem): {
  isHoneyRelated: boolean;
  matchedKeywords: string[];
} {
  const matchedKeywords: string[] = [];

  const textToSearch = [
    journal.text || '',
    journal.originalText || '',
    journal.aiSummary || '',
    journal.category || '',
    journal.status || '',
    ...(journal.tags || [])
  ]
    .join(' ')
    .toLowerCase();

  // 1. 상태 및 카테고리 확인
  if (journal.status === '채밀') matchedKeywords.push('채밀상태');
  if (journal.category === '채밀량') matchedKeywords.push('채밀량카테고리');
  if (typeof journal.honeyYieldKg === 'number' && journal.honeyYieldKg > 0) {
    matchedKeywords.push(`채밀량(${journal.honeyYieldKg}kg)`);
  }

  // 2. 키워드 검색
  HONEY_KEYWORDS.forEach((kw) => {
    if (textToSearch.includes(kw.toLowerCase())) {
      matchedKeywords.push(kw);
    }
  });

  const uniqueMatches = Array.from(new Set(matchedKeywords));
  return {
    isHoneyRelated: uniqueMatches.length > 0,
    matchedKeywords: uniqueMatches
  };
}

/**
 * 양봉일지 전체 목록 중 꿀 생산 관련 기록만 필터링합니다.
 */
export function filterHoneyProductionJournals(journals: VoiceLogItem[]): VoiceLogItem[] {
  if (!journals || journals.length === 0) return [];
  return journals.filter((j) => analyzeJournalForHoneyProduction(j).isHoneyRelated);
}

/**
 * 양봉일지 텍스트에서 언급된 밀원 및 벌꿀 종류를 추출합니다.
 * [중요 원칙]: 실제 기록에 없는 밀원은 절대로 임의로 추정하지 않고 '밀원 미기재'로 반환합니다.
 */
export function extractNectarAndHoneyType(journals: VoiceLogItem[]): {
  nectarSource: string;
  honeyType: string;
  isNectarSpecified: boolean;
} {
  const combinedText = journals
    .map((j) => `${j.text || ''} ${j.originalText || ''} ${j.aiSummary || ''} ${(j.tags || []).join(' ')}`)
    .join(' ');

  // 특정 밀원 검색 (엄격한 규칙 기반)
  if (combinedText.includes('아카시아')) {
    return { nectarSource: '아카시아', honeyType: '아카시아꿀', isNectarSpecified: true };
  }
  if (combinedText.includes('밤꿀') || combinedText.includes('밤꽃') || combinedText.includes('밤나무')) {
    return { nectarSource: '밤꽃', honeyType: '밤꿀', isNectarSpecified: true };
  }
  if (combinedText.includes('야생화') || combinedText.includes('잡화')) {
    return { nectarSource: '야생화', honeyType: '야생화꿀', isNectarSpecified: true };
  }
  if (combinedText.includes('피나무')) {
    return { nectarSource: '피나무', honeyType: '피나무꿀', isNectarSpecified: true };
  }
  if (combinedText.includes('때죽')) {
    return { nectarSource: '때죽나무', honeyType: '때죽꿀', isNectarSpecified: true };
  }
  if (combinedText.includes('유채')) {
    return { nectarSource: '유채꽃', honeyType: '유채꿀', isNectarSpecified: true };
  }
  if (combinedText.includes('싸리')) {
    return { nectarSource: '싸리꽃', honeyType: '싸리꿀', isNectarSpecified: true };
  }

  // 밀원 언급이 없는 경우 절대 추정하지 않음
  return {
    nectarSource: '밀원 미기재',
    honeyType: '밀원 미기재',
    isNectarSpecified: false
  };
}

/**
 * 일지에서 벌통 번호 목록을 안전하게 파싱합니다.
 */
export function parseHiveIdsFromJournal(journal: VoiceLogItem): number[] {
  const ids = new Set<number>();

  if (typeof journal.hiveId === 'number' && journal.hiveId > 0) {
    ids.add(journal.hiveId);
  }

  const rawTexts = [journal.hiveRange || '', journal.text || '', journal.originalText || ''];
  rawTexts.forEach((txt) => {
    // 1번, 2번 등
    const numMatches = txt.matchAll(/(\d{1,3})\s*번/g);
    for (const match of numMatches) {
      const val = parseInt(match[1], 10);
      if (!isNaN(val) && val > 0 && val <= 500) {
        ids.add(val);
      }
    }
    // 범위: 1번~5번 등
    const rangeMatch = txt.match(/(\d{1,3})\s*번?\s*[~-]\s*(\d{1,3})\s*번?/);
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1], 10);
      const end = parseInt(rangeMatch[2], 10);
      if (!isNaN(start) && !isNaN(end) && start <= end && end - start <= 100) {
        for (let i = start; i <= end; i++) {
          ids.add(i);
        }
      }
    }
  });

  return Array.from(ids).sort((a, b) => a - b);
}

/**
 * 일지에서 채밀량(kg)을 안전하게 추출합니다.
 */
export function parseYieldKgFromJournal(journal: VoiceLogItem): number {
  if (typeof journal.honeyYieldKg === 'number' && !isNaN(journal.honeyYieldKg) && journal.honeyYieldKg > 0) {
    return journal.honeyYieldKg;
  }

  const text = `${journal.text || ''} ${journal.originalText || ''}`;
  const kgMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:kg|킬로|키로)/i);
  if (kgMatch) {
    const val = parseFloat(kgMatch[1]);
    if (!isNaN(val) && val > 0 && val < 10000) {
      return val;
    }
  }

  // 말통 (1말 = 약 24kg)
  const malMatch = text.match(/(\d+(?:\.\d+)?)\s*말/);
  if (malMatch) {
    const val = parseFloat(malMatch[1]);
    if (!isNaN(val) && val > 0) {
      return Math.round(val * 24);
    }
  }

  // 드럼 (1드럼 = 약 288kg)
  const drumMatch = text.match(/(\d+(?:\.\d+)?)\s*드럼/);
  if (drumMatch) {
    const val = parseFloat(drumMatch[1]);
    if (!isNaN(val) && val > 0) {
      return Math.round(val * 288);
    }
  }

  return 0;
}

/**
 * 양봉일지(VoiceLogItem) 목록을 분석하여 "꿀 생산 이력 초안(HoneyLotDraft)"을 빌드합니다.
 *
 * [핵심 규칙]:
 * 1. Firestore에 절대 자동 저장하지 않음.
 * 2. 기존 HoneyLot 데이터나 컬렉션을 변경하지 않음.
 * 3. 실제 데이터가 없는 항목은 임의 추정 금지 (밀원 미기재 등 원문 그대로 보존).
 * 4. 사용자가 UI(Preview/Draft)에서 검토할 수 있도록 순수 객체로 반환.
 */
export function buildHoneyLotDraftFromJournals(
  journals: VoiceLogItem[],
  options?: {
    farmName?: string;
  }
): HoneyLotDraft {
  const honeyJournals = filterHoneyProductionJournals(journals);

  // 일지가 없거나 채밀 관련 기록이 없는 경우의 안전한 초안 반환
  if (honeyJournals.length === 0) {
    const today = new Date().toISOString().split('T')[0];
    return {
      productType: 'honey',
      honeyType: '밀원 미기재',
      nectarSource: '밀원 미기재',
      productionStartDate: today,
      productionEndDate: today,
      harvestOperations: [],
      totalYieldKg: 0,
      hiveIds: [],
      hiveRange: '벌통 미기재',
      relatedJournalIds: [],
      evidence: [],
      aiSummary: '등록된 양봉일지 중 채밀 및 꿀 생산 관련 기록이 확인되지 않았습니다.',
      hasSufficientData: false,
      unspecifiedReason: '양봉일지에 채밀/꿀 생산 기록이 없습니다.',
      createdAt: new Date().toISOString()
    };
  }

  // 날짜 오름차순 정렬 (시작일 ~ 종료일 산출용)
  const sortedJournals = [...honeyJournals].sort((a, b) => {
    const dateComp = (a.date || '').localeCompare(b.date || '');
    if (dateComp !== 0) return dateComp;
    return (a.timestamp || '').localeCompare(b.timestamp || '');
  });

  const productionStartDate = sortedJournals[0].date || new Date().toISOString().split('T')[0];
  const productionEndDate = sortedJournals[sortedJournals.length - 1].date || productionStartDate;

  // 밀원 및 꿀 종류 추출 (추정 금지)
  const { nectarSource, honeyType, isNectarSpecified } = extractNectarAndHoneyType(sortedJournals);

  // 벌통 번호 및 채밀 작업 내역 통합
  const allHiveIdsSet = new Set<number>();
  let totalYield = 0;
  const harvestOperations: HarvestOperation[] = [];
  const evidenceList: HoneyHarvestEvidence[] = [];
  const relatedJournalIds: string[] = [];

  sortedJournals.forEach((j) => {
    relatedJournalIds.push(j.id);
    const { matchedKeywords } = analyzeJournalForHoneyProduction(j);

    const hiveIds = parseHiveIdsFromJournal(j);
    hiveIds.forEach((id) => allHiveIdsSet.add(id));

    const yieldKg = parseYieldKgFromJournal(j);
    totalYield += yieldKg;

    // 증빙 정보 생성
    evidenceList.push({
      journalId: j.id,
      date: j.date,
      hiveRange: j.hiveRange || (hiveIds.length > 0 ? formatHiveRange(hiveIds) : undefined),
      hiveIds: hiveIds.length > 0 ? hiveIds : undefined,
      yieldKg: yieldKg > 0 ? yieldKg : undefined,
      matchedKeywords,
      summarySnippet: (j.aiSummary || j.text || '').slice(0, 100)
    });

    // 채밀 작업 항목 생성
    harvestOperations.push({
      operationId: `op-${j.id}`,
      date: j.date,
      hiveIds,
      hiveRange: j.hiveRange || (hiveIds.length > 0 ? formatHiveRange(hiveIds) : '전체 벌통'),
      yieldKg,
      journalId: j.id,
      weatherCondition: j.weatherTag || j.weatherSnapshot?.condition,
      notes: j.text
    });
  });

  const allHiveIds = Array.from(allHiveIdsSet).sort((a, b) => a - b);
  const hiveRange = allHiveIds.length > 0 ? formatHiveRange(allHiveIds) : '전체 벌통';

  // AI 객관적 요약문 작성 (추정 없이 기록된 사실만 요약)
  const dateRangeText =
    productionStartDate === productionEndDate
      ? `${productionStartDate}`
      : `${productionStartDate} ~ ${productionEndDate}`;

  const yieldText = totalYield > 0 ? `총 ${totalYield}kg` : '수량 미기재';
  const nectarText = isNectarSpecified ? `밀원: ${nectarSource}` : '밀원: 미기재(일지 확인 필요)';

  const aiSummary = `${dateRangeText} 기간 동안 ${hiveRange}에서 총 ${harvestOperations.length}회의 양봉일지 채밀 관련 기록이 확인되었습니다. (${yieldText}, ${nectarText})`;

  return {
    productType: 'honey',
    honeyType,
    nectarSource,
    productionStartDate,
    productionEndDate,
    harvestOperations,
    totalYieldKg: Math.round(totalYield * 10) / 10,
    hiveIds: allHiveIds,
    hiveRange,
    relatedJournalIds,
    evidence: evidenceList,
    aiSummary,
    hasSufficientData: true,
    createdAt: new Date().toISOString()
  };
}

/**
 * 특정 사용자의 Firestore `users/{uid}/journals` 데이터를 읽어와서
 * 꿀 생산 이력 초안을 생성하여 반환합니다.
 *
 * [중요]: Firestore에 어떠한 쓰기도 하지 않는 읽기 전용 함수입니다.
 */
export async function fetchHoneyLotDraftFromUserJournals(
  uid: string,
  options?: { farmName?: string }
): Promise<HoneyLotDraft> {
  try {
    const { fetchJournalsFromFirestore } = await import('./firestoreService');
    const journals = await fetchJournalsFromFirestore(uid);
    return buildHoneyLotDraftFromJournals(journals, options);
  } catch (err) {
    console.warn('Error building honey lot draft from user journals:', err);
    return buildHoneyLotDraftFromJournals([], options);
  }
}

/**
 * 확인/수정된 초안 데이터를 기존 HoneyLot 데이터 모델로 변환합니다.
 * - 무추정 원칙: 사용자가 입력한 필드 그대로 보존 (밀원 미기재 등)
 * - 기존 generateLotNumber() 함수를 사용하여 중복 없는 고유 LOT 번호 채번
 * - 관련 양봉일지(associatedJournalIds, evidenceJournalIds) 및 회차별 채밀작업 연결
 */
export function convertDraftToHoneyLot(
  formData: {
    productType: ApiaryProductType;
    honeyType: string;
    productName: string;
    nectarSource: string;
    productionStartDate: string;
    productionEndDate: string;
    totalYieldKg: number;
    hiveIds: number[];
    hiveRange: string;
    harvestOperations: HarvestOperation[];
    notes: string;
    inboundDate?: string;
  },
  draft: HoneyLotDraft,
  existingLots: HoneyLot[] = [],
  farmName = '농업회사법인 허니비테코 주식회사'
): HoneyLot {
  const harvestDate =
    formData.productionEndDate || formData.productionStartDate || new Date().toISOString().split('T')[0];
  const inboundDate =
    formData.inboundDate && formData.inboundDate.trim()
      ? formData.inboundDate.trim()
      : harvestDate;

  // 기존 프로젝트의 lotNumber 생성 로직 재사용
  const lotNumber = generateLotNumber(formData.honeyType, harvestDate, existingLots);

  const startD = new Date(formData.productionStartDate);
  const endD = new Date(formData.productionEndDate);
  const durationDays =
    isNaN(startD.getTime()) || isNaN(endD.getTime())
      ? 1
      : Math.max(1, Math.round((endD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24)) + 1);

  const brand = farmName.includes('허니비테코') ? '허니비테코' : farmName;
  const fallbackProductName =
    formData.honeyType && formData.honeyType !== '밀원 미기재'
      ? `${brand} 천연 ${formData.honeyType}`
      : `${brand} 천연벌꿀`;

  const newLot: HoneyLot = {
    id: `lot-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    productType: formData.productType,
    honeyType: formData.honeyType.trim(),
    productName: formData.productName.trim() || fallbackProductName,
    nectarSource: formData.nectarSource.trim() || '밀원 미기재',
    harvestDate,
    inboundDate,
    harvestQuantityKg: formData.totalYieldKg > 0 ? formData.totalYieldKg : undefined,
    hiveIds: formData.hiveIds,
    hiveRange: formData.hiveRange,
    farmName,
    lotNumber,
    publicTraceId: generatePublicTraceId(),
    notes: formData.notes.trim() || undefined,

    // 정밀 이력 추적 필드 연결
    productionPeriod: {
      startDate: formData.productionStartDate,
      endDate: formData.productionEndDate,
      durationDays
    },
    harvestOperations: formData.harvestOperations.map((op) => ({
      ...op,
      operationId: op.operationId || `op-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    })),
    harvestDateRangeDisplay:
      formData.productionStartDate === formData.productionEndDate
        ? formData.productionStartDate
        : `${formData.productionStartDate} ~ ${formData.productionEndDate}`,
    totalYieldKg: formData.totalYieldKg > 0 ? formData.totalYieldKg : undefined,
    totalHiveCount: formData.hiveIds.length > 0 ? formData.hiveIds.length : undefined,
    aggregatedHiveRange: formData.hiveRange,
    associatedJournalIds: draft.relatedJournalIds || [],
    nectarSources: {
      primary: formData.nectarSource.trim() || '밀원 미기재',
      evidenceJournalIds: draft.relatedJournalIds || []
    },
    aiProductionStory: {
      summary: draft.aiSummary || ''
    },
    isPublicForConsumer: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  return newLot;
}
