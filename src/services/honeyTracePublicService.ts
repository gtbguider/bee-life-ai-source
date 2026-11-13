import {
  HoneyLot,
  HoneyTracePublicData,
  ApiaryProductType,
  VoiceLogItem,
  PublicJournalEvidenceItem,
  PublicHarvestRecordItem,
  PublicInspectionReportInfo
} from '../types';

/**
 * Firestore publicHoneyTraces/{publicTraceId} 컬렉션에 저장되는 공개 문서 구조
 * - HoneyTracePublicData의 허용 공개 필드 + 4개 공개 관리 필드만 허용
 * - uid, 원본 document ID(lot.id), hiveIds, hiveRange, journalId, notes, originalText 등 내부 정보 절대 금지
 */
export interface PublishedHoneyTraceDocument extends HoneyTracePublicData {
  publicTraceId: string;
  publishedAt: string;
  updatedAt: string;
  isPublished: boolean;
}

/**
 * 양봉일지 요약문에서 벌통 번호(#12, 12번 벌통 등)나 내부 식별자가 노출되지 않도록 정제하고,
 * 원문(originalText)과 동일한 경우에는 사용하지 않고 사실 기반 요약만 반환합니다.
 * (새로운 AI API 호출 없이 기존 저장 데이터만 사용)
 */
export function buildConsumerSafeJournalSummary(journal: Partial<VoiceLogItem>): string {
  const rawAiSummary = typeof journal.aiSummary === 'string' ? journal.aiSummary.trim() : '';
  const rawOriginal = typeof journal.originalText === 'string' ? journal.originalText.trim() : '';
  const rawText = typeof journal.text === 'string' ? journal.text.trim() : '';

  // aiSummary가 존재하고 원문(originalText/text)과 구별되는 요약인 경우 우선 사용하되 벌통 번호 패턴 제거
  if (rawAiSummary && rawAiSummary !== rawOriginal && rawAiSummary !== rawText) {
    const cleaned = rawAiSummary
      .replace(/#\d+\s*(~\s*#?\d+)?(번)?(\s*벌통)?/g, '봉장 벌통')
      .replace(/\d+\s*(~\s*\d+)?번(\s*벌통)?/g, '봉장 벌통')
      .replace(/벌통\s*\d+번?/g, '봉장 벌통')
      .trim();
    if (cleaned) {
      return cleaned;
    }
  }

  // aiSummary가 없거나 원문과 동일한 경우, 원문(text/originalText)을 그대로 노출하지 않고 기록 유형 기반 사실 요약 사용
  const category = (journal.category || '').trim();
  if (
    category === '채밀량' ||
    journal.status === '채밀' ||
    (typeof journal.honeyYieldKg === 'number' && journal.honeyYieldKg > 0)
  ) {
    return '채밀 작업이 기록되어 있습니다.';
  }
  if (category.includes('벌통') || category.includes('내검')) {
    return '벌통 상태를 확인하고 채밀 가능 여부를 점검한 기록입니다.';
  }
  if (category.includes('병해충') || category.includes('방제')) {
    return '봉장 위생 및 벌무리 건강 상태를 점검한 기록입니다.';
  }
  if (category.includes('사양') || category.includes('급이')) {
    return '봉장 사양 및 관리 상태를 점검한 기록입니다.';
  }
  return '양봉 관리 및 봉장 점검 작업이 기록되어 있습니다.';
}

/**
 * 명시적 연결 ID(① associatedJournalIds, ② harvestOperations[].journalId, ③ nectarSources.evidenceJournalIds)가
 * 하나도 없을 때만 사용하는 4순위 안전 자동 매칭 함수입니다.
 *
 * [자동 매칭 조건]:
 * - journal.date === lot.harvestDate
 * - 그리고 다음 중 하나 이상 만족:
 *   1) journal.category === '채밀량'
 *   2) journal.status === '채밀'
 *   3) journal.honeyYieldKg > 0
 *   4) journal.text에 실제 '채밀' 표현이 존재
 *   5) journal.aiSummary에 실제 '채밀' 표현이 존재
 * - originalText는 사용하지 않으며, 단순히 날짜만 같은 일반 내검 일지는 절대 연결하지 않음
 * - HoneyLot의 실제 채밀량과 journal.honeyYieldKg가 정확히 일치하는 기록을 최우선 선택
 */
export function findMatchingHarvestJournalsForLot(
  lot: HoneyLot,
  journals: VoiceLogItem[]
): VoiceLogItem[] {
  const targetDate = typeof lot.harvestDate === 'string' ? lot.harvestDate.trim() : '';
  if (!targetDate || !Array.isArray(journals) || journals.length === 0) {
    return [];
  }

  const candidates = journals.filter((j) => {
    if (!j || typeof j.date !== 'string' || j.date.trim() !== targetDate) {
      return false;
    }

    const isHarvestCategory = j.category === '채밀량';
    const isHarvestStatus = j.status === '채밀';
    const hasYield =
      typeof j.honeyYieldKg === 'number' && !isNaN(j.honeyYieldKg) && j.honeyYieldKg > 0;
    const hasHarvestInText = typeof j.text === 'string' && j.text.includes('채밀');
    const hasHarvestInAiSummary =
      typeof j.aiSummary === 'string' && j.aiSummary.includes('채밀');

    return (
      isHarvestCategory ||
      isHarvestStatus ||
      hasYield ||
      hasHarvestInText ||
      hasHarvestInAiSummary
    );
  });

  if (candidates.length === 0) {
    return [];
  }

  const lotYield =
    typeof lot.harvestQuantityKg === 'number' &&
    !isNaN(lot.harvestQuantityKg) &&
    lot.harvestQuantityKg > 0
      ? lot.harvestQuantityKg
      : typeof lot.totalYieldKg === 'number' && !isNaN(lot.totalYieldKg) && lot.totalYieldKg > 0
      ? lot.totalYieldKg
      : undefined;

  if (lotYield !== undefined) {
    const exactYieldMatches = candidates.filter(
      (j) => typeof j.honeyYieldKg === 'number' && j.honeyYieldKg === lotYield
    );
    if (exactYieldMatches.length > 0) {
      return exactYieldMatches;
    }
  }

  return candidates;
}

/**
 * 성적서 URL에 private Storage 경로(users/{uid}/honeyLots/{lotId}/...)나 내부 식별자가 포함되어 있는지 검사합니다.
 * 내부 Storage 경로가 포함된 URL은 소비자에게 직접 노출하지 않습니다.
 */
export function isConsumerSafeReportUrl(url?: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;

  let decoded = trimmed;
  try {
    decoded = decodeURIComponent(trimmed);
  } catch {
    decoded = trimmed;
  }

  // 내부 Storage 경로 패턴이나 private bucket 경로가 포함된 경우 소비자 노출 차단
  if (
    decoded.includes('users/') ||
    decoded.includes('/honeyLots/') ||
    decoded.includes('inspection-report/') ||
    trimmed.includes('firebasestorage.googleapis.com')
  ) {
    return false;
  }

  return (
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('/api/inspection-reports/files/')
  );
}

/**
 * HoneyLot(농가 내부용 데이터)을 소비자 공개용 HoneyTracePublicData로 안전하게 변환합니다.
 *
 * [원칙 및 보안 지침]:
 * 1. 내부 관리 정보 제외:
 *    - 원본 음성 발화 (Voice transcripts / originalText)
 *    - 농가 개인 메모 (lot.notes)
 *    - 내부 벌통별 번호/상태 (lot.hiveIds, lot.hiveRange)
 *    - Firestore document ID (lot.id, journalId)
 *    - 사용자 계정 UID 및 Storage path
 * 2. 무추정 원칙 (Strict Anti-Guessing):
 *    - nectarSource가 "밀원 미기재"이거나 비어있으면 그대로 "밀원 미기재"로 반환
 *    - 성적서 요약 정보가 없으면 검사기관/검사일/결과를 절대 추정하지 않음
 * 3. 순수 변환 함수:
 *    - Firestore 읽기/쓰기 없음
 *    - 외부 API 또는 AI 모델 호출 없음
 */
export function createPublicHoneyTraceData(
  lot: HoneyLot,
  relatedJournals?: VoiceLogItem[]
): HoneyTracePublicData {
  // 1. 제품 유형 및 명칭 (기본값 안전 보장)
  const productType = lot.productType || 'honey';
  const productName = lot.productName && lot.productName.trim()
    ? lot.productName.trim()
    : '천연벌꿀';
  const honeyType = lot.honeyType && lot.honeyType.trim()
    ? lot.honeyType.trim()
    : '밀원 미기재';

  // 2. 무추정 원칙: nectarSource
  const nectarSource = lot.nectarSource && lot.nectarSource.trim()
    ? lot.nectarSource.trim()
    : '밀원 미기재';

  // 3. 생산 기간
  const productionStartDate = lot.productionPeriod?.startDate || lot.harvestDate || '';
  const productionEndDate = lot.productionPeriod?.endDate || lot.harvestDate || '';

  // 4. 총 채밀량 (순수 숫자)
  const totalYieldKg =
    typeof lot.totalYieldKg === 'number' && !isNaN(lot.totalYieldKg)
      ? lot.totalYieldKg
      : typeof lot.harvestQuantityKg === 'number' && !isNaN(lot.harvestQuantityKg)
      ? lot.harvestQuantityKg
      : undefined;

  // 5. 채밀 요약문 및 소비자용 채밀 작업 목록 생성 (벌통 번호/내부 메모 제외)
  let harvestSummary = '';
  const opCount = lot.harvestOperations?.length || 0;
  if (opCount > 0) {
    harvestSummary = totalYieldKg !== undefined
      ? `총 ${opCount}회 채밀 (총 ${totalYieldKg}kg)`
      : `총 ${opCount}회 채밀`;
  } else if (lot.harvestDate) {
    const formattedDate = lot.harvestDate.replace(/-/g, '.');
    harvestSummary = totalYieldKg !== undefined
      ? `${formattedDate} 채밀 (${totalYieldKg}kg)`
      : `${formattedDate} 채밀`;
  } else {
    harvestSummary = '생산 이력 확인 완료';
  }

  let harvestRecords: PublicHarvestRecordItem[] = [];
  if (opCount > 0) {
    harvestRecords = (lot.harvestOperations || []).map((op, idx) => {
      const item: PublicHarvestRecordItem = {
        sequence: idx + 1,
        date: op.date || ''
      };
      if (typeof op.yieldKg === 'number' && !isNaN(op.yieldKg) && op.yieldKg > 0) {
        item.yieldKg = op.yieldKg;
      }
      return item;
    });
  } else if (
    typeof lot.harvestDate === 'string' &&
    lot.harvestDate.trim() &&
    typeof lot.harvestQuantityKg === 'number' &&
    !isNaN(lot.harvestQuantityKg) &&
    lot.harvestQuantityKg > 0
  ) {
    // [1] harvestOperations가 없어도 실제 harvestDate와 harvestQuantityKg가 모두 존재하면 1회 채밀 기록으로 구조화
    harvestRecords = [
      {
        sequence: 1,
        date: lot.harvestDate.trim(),
        yieldKg: lot.harvestQuantityKg
      }
    ];
  }

  const finalHarvestOperationCount =
    opCount > 0 ? opCount : harvestRecords.length > 0 ? harvestRecords.length : 0;

  // 6. 근거 양봉일지 수집 및 소비자 공개용 정제 (내부 필드 원천 차단)
  // 연결 우선순위: ① associatedJournalIds → ② harvestOperations[].journalId → ③ nectarSources.evidenceJournalIds → ④ 안전한 자동 매칭
  const linkedJournalIds = new Set<string>();
  if (Array.isArray(lot.associatedJournalIds)) {
    lot.associatedJournalIds.forEach((id) => {
      if (id && typeof id === 'string') linkedJournalIds.add(id);
    });
  }
  if (Array.isArray(lot.harvestOperations)) {
    lot.harvestOperations.forEach((op) => {
      if (op.journalId && typeof op.journalId === 'string') {
        linkedJournalIds.add(op.journalId);
      }
    });
  }
  if (Array.isArray(lot.nectarSources?.evidenceJournalIds)) {
    lot.nectarSources!.evidenceJournalIds!.forEach((id) => {
      if (id && typeof id === 'string') linkedJournalIds.add(id);
    });
  }

  const evidenceJournals: PublicJournalEvidenceItem[] = [];
  const representedJournalIds = new Set<string>();

  if (Array.isArray(relatedJournals) && relatedJournals.length > 0) {
    // ①~③ 명시적 연결이 있으면 해당 일지 선택, 없으면 ④ 안전한 자동 매칭 실행
    const matched =
      linkedJournalIds.size > 0
        ? relatedJournals.filter((j) => j && linkedJournalIds.has(j.id))
        : findMatchingHarvestJournalsForLot(lot, relatedJournals);

    matched.forEach((j) => {
      representedJournalIds.add(j.id);
      const item: PublicJournalEvidenceItem = {
        date: j.date || '',
        category:
          j.category && j.category.trim()
            ? j.category.trim()
            : j.status === '채밀' || (typeof j.honeyYieldKg === 'number' && j.honeyYieldKg > 0)
            ? '채밀량'
            : '벌통 상태',
        summary: buildConsumerSafeJournalSummary(j),
        isLinkedToLot: true
      };
      if (typeof j.honeyYieldKg === 'number' && !isNaN(j.honeyYieldKg) && j.honeyYieldKg > 0) {
        item.yieldKg = j.honeyYieldKg;
      }
      evidenceJournals.push(item);
    });
  }

  // 채밀 작업(harvestOperations)에 연결된 일지 중 상세 객체가 전달되지 않은 건도 사실 범위 내에서 반영
  if (Array.isArray(lot.harvestOperations)) {
    lot.harvestOperations.forEach((op) => {
      if (op.journalId && !representedJournalIds.has(op.journalId)) {
        representedJournalIds.add(op.journalId);
        const item: PublicJournalEvidenceItem = {
          date: op.date || '',
          category: '채밀량',
          summary: '채밀 작업이 기록되어 있습니다.',
          isLinkedToLot: true
        };
        if (typeof op.yieldKg === 'number' && !isNaN(op.yieldKg) && op.yieldKg > 0) {
          item.yieldKg = op.yieldKg;
        }
        evidenceJournals.push(item);
      }
    });
  }

  // 날짜순 정렬
  evidenceJournals.sort((a, b) => a.date.localeCompare(b.date));

  const hasVerifiedJournalEvidence =
    linkedJournalIds.size > 0 || evidenceJournals.length > 0;
  const evidenceJournalCount = hasVerifiedJournalEvidence
    ? Math.max(linkedJournalIds.size, evidenceJournals.length)
    : 0;

  // 7. 검사성적서 공개 정보 정제 (무추정 원칙 & private Storage 경로 노출 금지)
  const hasReportFile = Boolean(
    (lot.inspectionReportUrl && lot.inspectionReportUrl.trim()) ||
      (lot.inspectionReportName && lot.inspectionReportName.trim())
  );

  const inspectionReport: PublicInspectionReportInfo = {
    hasReport: hasReportFile
  };

  if (hasReportFile) {
    if (lot.inspectionReportName && lot.inspectionReportName.trim()) {
      inspectionReport.reportName = lot.inspectionReportName.trim();
    }
    if (isConsumerSafeReportUrl(lot.inspectionReportUrl)) {
      inspectionReport.reportUrl = lot.inspectionReportUrl!.trim();
    }
    if (lot.inspectionReportSummary) {
      const s = lot.inspectionReportSummary;
      if (s.inspectionAgency && s.inspectionAgency.trim()) {
        inspectionReport.inspectionAgency = s.inspectionAgency.trim();
      }
      if (s.inspectionDate && s.inspectionDate.trim()) {
        inspectionReport.inspectionDate = s.inspectionDate.trim();
      }
      if (s.result && s.result.trim()) {
        inspectionReport.result = s.result.trim();
      }
      if (s.summary && s.summary.trim()) {
        inspectionReport.summary = s.summary.trim();
      }
    }
  }

  // 8. 근거 기반 신뢰 메시지
  const traceabilityMessage = hasVerifiedJournalEvidence
    ? '양봉농가의 실제 양봉 기록을 기반으로 작성된 이력입니다.'
    : '농가에서 직접 등록한 기본 생산 정보입니다.';

  // 9. 검증 일시 (존재하는 값만 사용하며, 비어 있을 경우 임의로 현재 날짜를 넣지 않음)
  const verifiedAt =
    lot.updatedAt && lot.updatedAt.trim()
      ? lot.updatedAt.trim()
      : lot.createdAt && lot.createdAt.trim()
      ? lot.createdAt.trim()
      : '';

  // 10. 농가 상호명 (공개 가능한 브랜딩)
  const farmName = lot.farmName || '농업회사법인 허니비테코 주식회사';

  // 야생화꿀(WF)인데 초기 생성 시 AC 코드로 부여된 실제 LOT(tr_d896dff40b0d49c590ad919099d83b79) 번호 정정 보장
  const correctedLotNumber =
    lot.publicTraceId === 'tr_d896dff40b0d49c590ad919099d83b79' &&
    lot.lotNumber === '2026-AC-20260528-01'
      ? '2026-WF-20260528-01'
      : lot.lotNumber;

  return {
    productType,
    productName,
    productImageUrl: lot.productImageUrl && lot.productImageUrl.trim() ? lot.productImageUrl.trim() : undefined,
    productId: lot.productId && lot.productId.trim() ? lot.productId.trim() : undefined,
    packageUnit: lot.packageUnit && lot.packageUnit.trim() ? lot.packageUnit.trim() : undefined,
    storageMethod: lot.storageMethod && lot.storageMethod.trim() ? lot.storageMethod.trim() : undefined,
    honeyType,
    nectarSource: productType === 'honey' ? nectarSource : (lot.nectarSource || '-'),
    productionStartDate,
    productionEndDate,
    totalYieldKg: productType === 'honey' ? totalYieldKg : undefined,
    harvestSummary,
    lotNumber: correctedLotNumber,
    traceabilityMessage,
    verifiedAt,
    farmName,
    hasVerifiedJournalEvidence,
    harvestOperationCount: finalHarvestOperationCount > 0 ? finalHarvestOperationCount : undefined,
    evidenceJournalCount,
    evidenceJournals,
    harvestRecords: harvestRecords.length > 0 ? harvestRecords : undefined,
    inspectionReport
  };
}

/**
 * 소비자 공개 페이지 URL 조회용 publicTraceId를 생성합니다.
 * - crypto.randomUUID() 또는 안전한 난수를 사용하여 추측 불가능한 랜덤 문자열 생성
 * - 개인정보, uid, Firestore 문서 ID(lot.id), lotNumber를 절대 포함하지 않음
 */
export function generatePublicTraceId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `tr_${crypto.randomUUID().replace(/-/g, '')}`;
  }
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    const hex = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    return `tr_${hex}`;
  }
  const fallback =
    Math.random().toString(36).slice(2) +
    Math.random().toString(36).slice(2) +
    Date.now().toString(36);
  return `tr_${fallback}`;
}

/**
 * HoneyLot 저장 시 publicTraceId를 보장합니다.
 * - 이미 publicTraceId가 존재하면 절대 새 값으로 교체하지 않고 그대로 유지합니다.
 * - publicTraceId가 없을 경우에만 새로 생성합니다.
 */
export function ensurePublicTraceId(lot: HoneyLot): HoneyLot {
  if (lot.publicTraceId && lot.publicTraceId.trim()) {
    return {
      ...lot,
      publicTraceId: lot.publicTraceId.trim()
    };
  }
  return {
    ...lot,
    publicTraceId: generatePublicTraceId()
  };
}

export type PublicTraceLookupResult =
  | { status: 'found'; data: HoneyTracePublicData }
  | { status: 'not_ready' }
  | { status: 'not_found' }
  | {
      status: 'error';
      errorType?: 'cookie_challenge' | 'server_error' | 'network_error' | 'unknown';
      errorMessage?: string;
    };

const LOCAL_HONEY_LOTS_STORAGE_KEY = 'honeybee_honey_lots_v1';

/**
 * publicTraceId를 기반으로 소비자 공개용 이력 데이터(HoneyTracePublicData)를 조회합니다.
 *
 * [보안 원칙]:
 * - Firestore Security Rules를 우회하거나 타 사용자의 컬렉션을 읽지 않습니다.
 * - 원본 HoneyLot을 반환하지 않으며, 오직 createPublicHoneyTraceData(lot)로 정제된
 *   HoneyTracePublicData만을 반환합니다.
 * - 실제 데이터가 없는 경우 임의의 HoneyTracePublicData를 생성하지 않습니다.
 */
export async function resolvePublicHoneyTraceByTraceId(
  publicTraceId: string,
  options?: { uid?: string; candidateLots?: HoneyLot[]; candidateJournals?: VoiceLogItem[] }
): Promise<PublicTraceLookupResult> {
  const cleanTraceId = (publicTraceId || '').trim();
  if (!cleanTraceId) {
    return { status: 'not_found' };
  }

  let matchedLot: HoneyLot | undefined;

  // 1. 전달된 후보 목록(메모리)에서 확인
  if (options?.candidateLots && Array.isArray(options.candidateLots)) {
    matchedLot = options.candidateLots.find((l) => l.publicTraceId === cleanTraceId);
  }

  // 2. 현재 브라우저 세션의 로컬 스토리지에서 확인
  if (!matchedLot && typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(LOCAL_HONEY_LOTS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          matchedLot = parsed.find((l: HoneyLot) => l && l.publicTraceId === cleanTraceId);
        }
      }
    } catch (e) {
      console.warn('Failed to read local honey lots for public trace lookup:', e);
    }
  }

  if (!matchedLot) {
    return { status: 'not_found' };
  }

  // 공개 비활성화 상태인 경우
  if (matchedLot.isPublicForConsumer === false) {
    return { status: 'not_ready' };
  }

  let relatedJournals: VoiceLogItem[] | undefined = options?.candidateJournals;
  if (!relatedJournals && typeof window !== 'undefined') {
    try {
      const rawLogs = localStorage.getItem('honeybee_beekeeping_journal_logs_v2');
      if (rawLogs) {
        const parsedLogs = JSON.parse(rawLogs);
        if (Array.isArray(parsedLogs)) {
          relatedJournals = parsedLogs;
        }
      }
    } catch {
      // ignore local journal read error
    }
  }

  // 반드시 createPublicHoneyTraceData(lot, relatedJournals)를 거쳐 정제된 공개 데이터만 반환
  return {
    status: 'found',
    data: createPublicHoneyTraceData(matchedLot, relatedJournals)
  };
}

/**
 * HoneyLot 원본으로부터 publicHoneyTraces/{publicTraceId}에 저장할
 * 순수 공개 문서(PublishedHoneyTraceDocument)를 생성합니다.
 * - 반드시 기존 createPublicHoneyTraceData(lot, relatedJournals)만 재사용합니다.
 */
export function buildPublishedHoneyTracePayload(
  lot: HoneyLot,
  publicTraceId?: string,
  existingPublishedAt?: string,
  relatedJournals?: VoiceLogItem[]
): PublishedHoneyTraceDocument {
  const traceId =
    publicTraceId && publicTraceId.trim()
      ? publicTraceId.trim()
      : lot.publicTraceId && lot.publicTraceId.trim()
      ? lot.publicTraceId.trim()
      : generatePublicTraceId();

  // 기존 createPublicHoneyTraceData(lot, relatedJournals) 재사용 (중복 변환 로직 금지)
  const publicData = createPublicHoneyTraceData(lot, relatedJournals);
  const nowIso = new Date().toISOString();
  const publishedAt =
    existingPublishedAt && existingPublishedAt.trim() ? existingPublishedAt.trim() : nowIso;

  const payload: PublishedHoneyTraceDocument = {
    publicTraceId: traceId,
    productType: publicData.productType,
    productName: publicData.productName,
    honeyType: publicData.honeyType,
    nectarSource: publicData.nectarSource,
    productionStartDate: publicData.productionStartDate,
    productionEndDate: publicData.productionEndDate,
    harvestSummary: publicData.harvestSummary,
    lotNumber: publicData.lotNumber,
    traceabilityMessage: publicData.traceabilityMessage,
    verifiedAt: publicData.verifiedAt || nowIso,
    hasVerifiedJournalEvidence: Boolean(publicData.hasVerifiedJournalEvidence),
    publishedAt,
    updatedAt: nowIso,
    isPublished: true
  };

  if (typeof publicData.totalYieldKg === 'number' && !isNaN(publicData.totalYieldKg)) {
    payload.totalYieldKg = publicData.totalYieldKg;
  }

  if (typeof publicData.farmName === 'string' && publicData.farmName.trim()) {
    payload.farmName = publicData.farmName.trim();
  }

  if (
    typeof publicData.harvestOperationCount === 'number' &&
    !isNaN(publicData.harvestOperationCount) &&
    publicData.harvestOperationCount > 0
  ) {
    payload.harvestOperationCount = publicData.harvestOperationCount;
  }

  if (typeof publicData.evidenceJournalCount === 'number' && !isNaN(publicData.evidenceJournalCount)) {
    payload.evidenceJournalCount = publicData.evidenceJournalCount;
  }

  if (Array.isArray(publicData.evidenceJournals) && publicData.evidenceJournals.length > 0) {
    payload.evidenceJournals = publicData.evidenceJournals;
  }

  if (Array.isArray(publicData.harvestRecords) && publicData.harvestRecords.length > 0) {
    payload.harvestRecords = publicData.harvestRecords;
  }

  if (publicData.inspectionReport) {
    payload.inspectionReport = publicData.inspectionReport;
  }

  if (typeof publicData.productImageUrl === 'string' && publicData.productImageUrl.trim()) {
    payload.productImageUrl = publicData.productImageUrl.trim();
  }
  if (typeof publicData.productId === 'string' && publicData.productId.trim()) {
    payload.productId = publicData.productId.trim();
  }
  if (typeof publicData.packageUnit === 'string' && publicData.packageUnit.trim()) {
    payload.packageUnit = publicData.packageUnit.trim();
  }
  if (typeof publicData.storageMethod === 'string' && publicData.storageMethod.trim()) {
    payload.storageMethod = publicData.storageMethod.trim();
  }

  return payload;
}

/**
 * 서버/DB에서 조회된 객체에서 오직 HoneyTracePublicData 허용 필드만 추출합니다.
 * 내부 필드(uid, id, journalId, hiveId, hiveRange, notes, originalText, audioUrl, audioPath, Storage path 등) 유출을 원천 차단합니다.
 */
export function sanitizePublicTraceData(raw: Record<string, any>): HoneyTracePublicData {
  const validProductTypes: ApiaryProductType[] = ['honey', 'royalJelly', 'propolis', 'other'];
  const productType: ApiaryProductType = validProductTypes.includes(raw.productType)
    ? raw.productType
    : 'honey';

  const rawLotNumber = typeof raw.lotNumber === 'string' ? raw.lotNumber : '';
  const correctedLotNumber =
    rawLotNumber === '2026-AC-20260528-01' &&
    (raw.publicTraceId === 'tr_d896dff40b0d49c590ad919099d83b79' ||
      raw.honeyType === '야생화꿀')
      ? '2026-WF-20260528-01'
      : rawLotNumber;

  const result: HoneyTracePublicData = {
    productType,
    productName: typeof raw.productName === 'string' ? raw.productName : '천연벌꿀',
    honeyType: typeof raw.honeyType === 'string' ? raw.honeyType : (productType === 'honey' ? '밀원 미기재' : '-'),
    nectarSource:
      typeof raw.nectarSource === 'string' && raw.nectarSource.trim()
        ? raw.nectarSource.trim()
        : (productType === 'honey' ? '밀원 미기재' : '-'),
    productionStartDate:
      typeof raw.productionStartDate === 'string' ? raw.productionStartDate : '',
    productionEndDate:
      typeof raw.productionEndDate === 'string' ? raw.productionEndDate : '',
    harvestSummary: typeof raw.harvestSummary === 'string' ? raw.harvestSummary : '',
    lotNumber: correctedLotNumber,
    traceabilityMessage:
      typeof raw.traceabilityMessage === 'string'
        ? raw.traceabilityMessage
        : '농가에서 직접 등록한 기본 생산 정보입니다.',
    verifiedAt: typeof raw.verifiedAt === 'string' ? raw.verifiedAt : '',
    hasVerifiedJournalEvidence: Boolean(raw.hasVerifiedJournalEvidence)
  };

  if (typeof raw.productImageUrl === 'string' && raw.productImageUrl.trim()) {
    result.productImageUrl = raw.productImageUrl.trim();
  }
  if (typeof raw.productId === 'string' && raw.productId.trim()) {
    result.productId = raw.productId.trim();
  }
  if (typeof raw.packageUnit === 'string' && raw.packageUnit.trim()) {
    result.packageUnit = raw.packageUnit.trim();
  }
  if (typeof raw.storageMethod === 'string' && raw.storageMethod.trim()) {
    result.storageMethod = raw.storageMethod.trim();
  }

  if (typeof raw.totalYieldKg === 'number' && !isNaN(raw.totalYieldKg)) {
    result.totalYieldKg = raw.totalYieldKg;
  }
  if (typeof raw.farmName === 'string' && raw.farmName.trim()) {
    result.farmName = raw.farmName.trim();
  }
  if (typeof raw.harvestOperationCount === 'number' && !isNaN(raw.harvestOperationCount)) {
    result.harvestOperationCount = raw.harvestOperationCount;
  }
  if (typeof raw.evidenceJournalCount === 'number' && !isNaN(raw.evidenceJournalCount)) {
    result.evidenceJournalCount = raw.evidenceJournalCount;
  }

  if (Array.isArray(raw.evidenceJournals)) {
    result.evidenceJournals = raw.evidenceJournals
      .filter((item: any) => item && typeof item === 'object')
      .map((item: any) => {
        const cleanItem: PublicJournalEvidenceItem = {
          date: typeof item.date === 'string' ? item.date : '',
          category: typeof item.category === 'string' ? item.category : '벌통 상태 확인',
          summary:
            typeof item.summary === 'string'
              ? item.summary
                  .replace(/#\d+\s*(~\s*#?\d+)?(번)?(\s*벌통)?/g, '봉장 벌통')
                  .replace(/\d+\s*(~\s*\d+)?번(\s*벌통)?/g, '봉장 벌통')
              : '양봉 관리 작업이 기록되어 있습니다.',
          isLinkedToLot: true
        };
        if (typeof item.yieldKg === 'number' && !isNaN(item.yieldKg) && item.yieldKg > 0) {
          cleanItem.yieldKg = item.yieldKg;
        }
        return cleanItem;
      });
  }

  if (Array.isArray(raw.harvestRecords)) {
    result.harvestRecords = raw.harvestRecords
      .filter((rec: any) => rec && typeof rec === 'object')
      .map((rec: any, idx: number) => {
        const cleanRec: PublicHarvestRecordItem = {
          sequence: typeof rec.sequence === 'number' && rec.sequence > 0 ? rec.sequence : idx + 1,
          date: typeof rec.date === 'string' ? rec.date : ''
        };
        if (typeof rec.yieldKg === 'number' && !isNaN(rec.yieldKg) && rec.yieldKg > 0) {
          cleanRec.yieldKg = rec.yieldKg;
        }
        return cleanRec;
      });
  }

  if (raw.inspectionReport && typeof raw.inspectionReport === 'object') {
    const rep = raw.inspectionReport;
    const cleanRep: PublicInspectionReportInfo = {
      hasReport: Boolean(rep.hasReport)
    };
    if (cleanRep.hasReport) {
      if (typeof rep.reportName === 'string' && rep.reportName.trim()) {
        cleanRep.reportName = rep.reportName.trim();
      }
      if (isConsumerSafeReportUrl(rep.reportUrl)) {
        cleanRep.reportUrl = rep.reportUrl.trim();
      }
      if (typeof rep.inspectionAgency === 'string' && rep.inspectionAgency.trim()) {
        cleanRep.inspectionAgency = rep.inspectionAgency.trim();
      }
      if (typeof rep.inspectionDate === 'string' && rep.inspectionDate.trim()) {
        cleanRep.inspectionDate = rep.inspectionDate.trim();
      }
      if (typeof rep.result === 'string' && rep.result.trim()) {
        cleanRep.result = rep.result.trim();
      }
      if (typeof rep.summary === 'string' && rep.summary.trim()) {
        cleanRep.summary = rep.summary.trim();
      }
    }
    result.inspectionReport = cleanRep;
  }

  return result;
}
