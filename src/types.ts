export type AppRoute = 'landing' | 'beekeeper' | 'consumer';

export type BeekeeperTab = 'record' | 'honeyLot' | 'hives' | 'analysis' | 'profile';

export type TabType = 'home' | 'record' | 'honeyLot' | 'hives' | 'analysis' | 'profile' | 'trace';

export type HiveSubTab = 'lineage' | 'history' | 'grid';

export interface WeatherInfo {
  location: string;
  stationName?: string;
  temperature: number; // 오늘 평균/현재 기온 (°C)
  minTemp?: number; // 오늘 일 최저기온 (°C)
  maxTemp?: number; // 오늘 일 최고기온 (°C)
  humidity: number;
  condition: string; // 오늘 평균/대표 날씨 (맑음, 구름많음, 흐림, 비, 눈 등)
  icon: string;
  windSpeed: number; // m/s
  precipitationProb: number; // %
  beeFlightScore: '최적' | '양호' | '주의' | '비행불가';
  beeImpactText: string;
  updatedTime: string;
}

export interface VoiceLogItem {
  id: string;
  hiveRange: string;
  hiveId?: number;
  hiveIds?: number[];
  inspectionDetails?: {
    targetHive?: number;
    queenSeen?: boolean;
    queenStatus?: string;
    feedStatus?: '충분' | '적정' | '부족';
    diseaseStatus?: string;
  };
  text: string;
  status: '완료' | '주의' | '진행중' | '대기' | '채밀';
  timestamp: string; // e.g. '09:30' or '2025-06-02 09:30'
  date: string; // 'YYYY-MM-DD'
  category?: '벌통 상태' | '채밀량' | '날씨' | '기타' | '방제' | '급이/사양' | '여왕벌';
  weatherTag?: string;
  weatherSnapshot?: {
    temp: number;
    minTemp?: number;
    maxTemp?: number;
    condition: string;
    icon: string;
    windSpeed?: number;
    humidity?: number;
  };
  tags?: string[];
  audioDuration?: string;
  honeyYieldKg?: number;
  originalText?: string;
  aiSummary?: string;
}

export interface QueenLineageNode {
  generation: string; // 'F1' | 'F2' | 'F3'
  name: string;
  breed: string;
  date: string;
  status?: string;
  isStar?: boolean;
  notes?: string;
}

export interface QueenMetrics {
  eggLayingRate: number; // 94%
  honeyHarvest: number; // 18 kg
  activityScore: string; // 'A+'
  royalJellyYield: number; // 240 g
}

// =================== 종봉 등록 및 가계도 데이터 모델 ===================
export interface BreederMetricLog {
  id: string;
  date: string; // 'YYYY-MM-DD'
  honeyYieldKg: number; // 채밀력 (kg)
  propolisYieldG: number; // 프로폴리스양 (g)
  royalJellyYieldG: number; // 로열제리양 (g)
  colonyStrength: number; // 봉군 세력 (소비 매수: e.g. 7~10매)
  eggLayingRate: number; // 산란력 (%)
  notes?: string;
}

export interface BreederQueen {
  id: string; // e.g. 'BQ-001', 'Q2024-A1'
  name: string; // e.g. '여왕벌 Q2024-A1'
  hiveId: number; // 연결된 벌통 번호 (e.g. 1, 12, etc.)
  parentQueenId?: string | null; // 모계 여왕벌 ID (null이면 F0 원종/시조)
  generation: 'F0' | 'F1' | 'F2' | 'F3' | 'F4'; // 세대
  breed: string; // e.g. '이탈리안계', '카니올란계', '지리산 토종원종', '황색계'
  installedDate: string; // 입식일 (YYYY-MM-DD)
  status: '활동중' | '육성중' | '우수판정' | '도태/교체';
  
  // 현재 대표/누적 형질 수치
  honeyHarvestKg: number; // 채밀력 (kg)
  propolisYieldG: number; // 프로폴리스양 (g)
  royalJellyYieldG: number; // 로열제리양 (g)
  colonyStrength: number; // 봉군 세력 (소비 매수)
  eggLayingRate: number; // 산란력 (%)
  docilityScore: '최상' | '우수' | '보통'; // 온순성
  
  logs: BreederMetricLog[]; // 지속적인 검정치 누적 기록 목록
  notes?: string;
  isFavorite?: boolean;
}

export interface TimelineEvent {
  id: string;
  title: string;
  date: string;
  description: string;
  consumerDescription?: string; // 소비자가 읽기 쉬운 친절한 풀이
  badge?: string;
  isHighlight?: boolean;
  type?: 'check' | 'evaluation' | 'production' | 'harvest' | 'entry';
  glossaryTags?: string[]; // 연관 양봉용어 태그 (클릭 시 사전 팝업)
}

export interface ProductPortfolioItem {
  id: string;
  name: string;
  icon: string;
  profitRate: number; // +85
  costPercent: number; // 30%
  revenuePercent: number; // 85%
  isAiRecommended?: boolean;
  colorType: 'primary' | 'secondary' | 'neutral' | 'tertiary';
}

export interface LabTestItem {
  no: number;
  name: string;
  standard: string;
  result: string;
  isPassed: boolean;
  category: '벌꿀규격 및 일반성상' | '항생제' | '구충제' | '농약' | '독성물질';
}

export interface LabAnalysisData {
  productName: string;
  lotNumber: string;
  receiptNumber: string; // 24-0446
  receiptDate: string; // 2024-03-05
  completeDate: string; // 2024-03-11
  applicant: string; // 설종수
  applicantPhone: string; // 010-8020-2583
  applicantAddress: string; // [57601] 전라남도 구례군 산동면 하원길 9-1
  apiaryLocation: string; // 전남광주통합특별시 구례군 산동면 원달리 205-1 번지
  beekeeper: string;
  labName: string; // 사단법인 한국양봉협회 양봉산물연구소
  labAddress: string; // 서울시 서초구 서초중앙로 6길 9
  labTel: string; // 02-3486-0882~5
  carbonIsotopeRatio: string; // -26.0‰
  moistureContent: string; // 16.8%
  hmfContent: string; // 7.4 mg/kg
  reducingSugar: string; // 67.7%
  sucrose: string; // 4.5%
  sugarRatio: string; // 1.33
  antibiotics: string; // 불검출
  pesticides: string; // 불검출
  grade: string; // 1+ 등급 천연 숙성꿀 (탄소동위원소비 -26.0‰)
  blockchainTxHash: string;
  testItems: LabTestItem[];
}

export interface HiveItem {
  id: number;
  name: string;
  queenGen: string;
  queenAge: string;
  status: '정상' | '주의' | '채밀가능' | '내검필요';
  eggRate: number;
  honeyYield: number;
  lastCheckDate: string;
  notes: string;
}

// =================== 전라남도 농업기술원 표준 양봉경영기록장 데이터 모델 ===================
export type BeekeepingProductType =
  | '천연숙성꿀'
  | '아카시아꿀'
  | '야생화꿀'
  | '밤꿀'
  | '생로열제리'
  | '프로폴리스(봉교)'
  | '생화분/벌화분'
  | '정제밀랍/밀랍초'
  | '종봉/교미여왕벌'
  | '봉독(정제)'
  | '화분매개봉 임대'
  | '양봉체험/교육'
  | '기타산물';

export type BeekeepingSalesChannel =
  | '소비자 직거래(택배)'
  | '스마트스토어/온라인'
  | '로컬푸드/농협'
  | '지인/선물용'
  | '도매/상인'
  | '현장 직판';

export interface BeekeepingSalesRecord {
  id: string;
  date: string; // 'YYYY-MM-DD'
  item: BeekeepingProductType;
  customItemName?: string;
  unit: string; // '2.4kg 병', '1.2kg 병', '500g', '1kg 박스', '50g 병', '100ml 병', '1마리', '1군'
  quantity: number; // 판매량
  unitPrice: number; // 단가 (원)
  totalAmount: number; // 판매금액 (원)
  channel: BeekeepingSalesChannel;
  buyerName?: string; // 거래처/구매자
  paymentMethod: '계좌이체' | '카드' | '현금' | '세금계산서';
  notes?: string;
}

export type BeekeepingExpenseCategory =
  | '사료/사양비'
  | '방제/약품비'
  | '기구/자재비'
  | '수송/유류비'
  | '인건비/고용노동'
  | '시설/임차료'
  | '제세공과/인증비'
  | '기타경영비';

export interface BeekeepingExpenseRecord {
  id: string;
  date: string; // 'YYYY-MM-DD'
  category: BeekeepingExpenseCategory;
  itemName: string; // 예: '정제백설탕 15kg', '대용화분떡 1kg', '개미산 60%', '유리병(2.4kg)'
  unit: string; // '포', 'kg', '박스', '개', '일/인', '회', '월'
  quantity: number; // 수량
  unitPrice: number; // 단가 (원)
  totalAmount: number; // 지출금액 (원)
  vendor: string; // 구입처 (예: '구례양봉원', '구례농협 하나로마트', '한국양봉농협')
  paymentMethod: '카드' | '계좌이체' | '현금' | '세금계산서';
  notes?: string;
}

export interface BeekeepingLedgerSummary {
  totalGrossIncome: number; // 총 조수입 (매출 합계)
  totalExpenses: number; // 총 경영비 (지출 합계)
  netIncome: number; // 농가 소득 (조수입 - 경영비)
  incomeRate: number; // 소득률 (%)
  hiveCount: number; // 총 관리 봉군수 (예: 50군)
  incomePerHive: number; // 군당 평균 소득 (원)
  grossPerHive: number; // 군당 평균 조수입 (원)
  expensePerHive: number; // 군당 평균 경영비 (원)
}

export type ApiaryProductType = 'honey' | 'royalJelly' | 'propolis' | 'other';

export const APIARY_PRODUCT_TYPE_LABELS = {
  honey: '천연벌꿀',
  royalJelly: '생로열제리',
  propolis: '프로폴리스',
  other: '기타 양봉산물'
} as const;

export const APIARY_PRODUCT_TYPE_ICONS = {
  honey: '🍯',
  royalJelly: '🥛',
  propolis: '🌿',
  other: '📦'
} as const;

/**
 * 양봉인이 등록한 개별 제품 모델 (Product)
 * - Product는 제품명, 종류, 대표 사진, 포장 규격, 설명 등 제품 자체의 메타정보를 관리
 * - 하나의 Product에 여러 개의 LOT(생산 회차)가 연결됨
 */
export interface BeekeeperProduct {
  id: string; // prod_xxx
  beekeeperUid?: string;
  productType: ApiaryProductType;
  productName: string;
  description: string;
  photoUrl?: string; // Firebase Storage 공개 다운로드 URL
  photoStoragePath?: string; // users/{uid}/products/{productId}/...
  packageUnit?: string; // 예: "50g 병", "2.4kg 병", "100ml 병"
  storageMethod?: string; // 예: "냉동보관(-18℃ 이하)", "냉장보관", "상온보관"
  customProperties?: {
    tenHdaPercent?: string; // 10-HDA 검사치 (로열제리 전용, 선택적)
    flavonoidContent?: string; // 플라보노이드 검사치 (프로폴리스 전용, 선택적)
    harvestIntervalHours?: number; // 채취 주기 (예: 72시간)
    extractionMethod?: string; // 추출 방식 (주정/수용성 등)
  };
  inspectionReportUrl?: string;
  inspectionReportName?: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface HarvestOperation {
  operationId: string;
  date: string;
  hiveIds: number[];
  hiveRange: string;
  yieldKg: number;
  journalId?: string;
  weatherCondition?: string;
  notes?: string;
}

export interface HoneyLot {
  id: string;

  // 제품 유형 (꿀, 로열젤리, 프로폴리스, 기타 확장용, 미지정시 기존 호환 'honey')
  productType?: ApiaryProductType;

  // 연결된 제품(Product) 식별자 및 상속 대표 사진
  productId?: string;
  productImageUrl?: string; // 제품 대표 사진 공개 URL
  packageUnit?: string; // 포장 규격
  storageMethod?: string; // 보관 방법

  // 제품 정보
  honeyType: string; // 아카시아꿀, 밤꿀, 야생화꿀 등
  productName: string; // 허니비테코 아카시아꿀 등
  nectarSource?: string; // 주요 밀원

  // 생산 정보
  harvestDate: string; // YYYY-MM-DD
  inboundDate: string; // YYYY-MM-DD (미입력 시 harvestDate와 동일)
  harvestQuantityKg?: number; // 채밀량 kg

  // 생산 벌통
  hiveIds?: number[];
  hiveRange?: string;

  // 농가 정보
  farmName?: string;

  // LOT
  lotNumber: string;

  // 소비자 공개 페이지 URL 조회용 식별자 (lot.id 및 lotNumber와 분리된 랜덤 공개 식별자)
  publicTraceId?: string;

  // 검사 정보
  inspectionReportUrl?: string;
  inspectionReportName?: string;
  inspectionReportSummary?: {
    inspectionAgency?: string;
    inspectionDate?: string;
    result?: string;
    summary?: string;
  };

  // 메모
  notes?: string;

  // ===== 향후 AI 생산이력 확장을 위한 선택적 필드 =====
  productionPeriod?: {
    startDate: string;
    endDate: string;
    durationDays: number;
  };
  harvestOperations?: HarvestOperation[];
  harvestDateRangeDisplay?: string;
  totalYieldKg?: number;
  totalHiveCount?: number;
  aggregatedHiveRange?: string;
  associatedJournalIds?: string[];
  nectarSources?: {
    primary?: string;
    secondary?: string[];
    evidenceJournalIds?: string[];
  };
  aiProductionStory?: {
    summary: string;
    floweringMilestone?: string;
    feedStopMilestone?: string;
    inspectionHighlights?: string[];
  };
  isPublicForConsumer?: boolean;

  createdAt: string;
  updatedAt: string;
}

/**
 * 양봉일지에서 추출한 개별 채밀/꿀 생산 증빙 기록
 */
export interface HoneyHarvestEvidence {
  journalId: string;
  date: string;
  hiveRange?: string;
  hiveIds?: number[];
  yieldKg?: number;
  extractedNectarSource?: string;
  matchedKeywords: string[];
  summarySnippet: string;
}

/**
 * 양봉일지 기반 꿀 이력제 초안 (Draft) 데이터 구조
 * - 자동 저장되지 않으며, 사용자 확인/검토(Preview/Draft)용 모델
 * - 실제 데이터가 없는 항목은 임의 추정하지 않음 (예: 밀원 미기재 시 '밀원 미기재'로 설정)
 */
export interface HoneyLotDraft {
  productType: 'honey';
  honeyType: string; // 예: '아카시아꿀', '밤꿀', '야생화꿀', '밀원 미기재' (임의 추정 금지)
  nectarSource: string; // 예: '아카시아', '밤꽃', '야생화', '밀원 미기재' (임의 추정 금지)
  productionStartDate: string; // 최초 채밀 또는 관련 작업일
  productionEndDate: string; // 최종 채밀일
  harvestOperations: HarvestOperation[];
  totalYieldKg: number;
  hiveIds: number[];
  hiveRange: string;
  relatedJournalIds: string[];
  evidence: HoneyHarvestEvidence[];
  aiSummary: string;
  hasSufficientData: boolean; // 유효한 채밀 기록 발견 여부
  unspecifiedReason?: string; // 미기재/불충분 사유
  createdAt: string;
}

/**
 * 소비자 공개용 양봉일지 근거 항목
 * - 절대 포함 금지: uid, journalId(id), hiveId, hiveIds, hiveRange, originalText, audioUrl, audioPath,
 *   inspectionDetails, queenSeen, queenStatus, feedStatus, diseaseStatus, notes, weatherSnapshot
 */
export interface PublicJournalEvidenceItem {
  date: string; // YYYY-MM-DD
  category: string; // 기록 유형 (예: '벌통 상태', '채밀')
  summary: string; // 소비자용 요약 (기존 저장된 aiSummary 또는 정제된 요약만 사용, 원문 제외)
  yieldKg?: number; // 실제 채밀량이 기록된 경우에만 포함
  isLinkedToLot: boolean; // 해당 기록이 이 HoneyLot과 연결되어 있다는 사실
}

/**
 * 소비자 공개용 채밀 작업 기록 항목
 * - 절대 포함 금지: operationId, journalId, hiveIds, hiveRange, notes
 */
export interface PublicHarvestRecordItem {
  sequence: number; // 1, 2, ... ("채밀 작업 1회" 표시용)
  date: string; // YYYY-MM-DD
  yieldKg?: number; // 실제 채밀량이 있는 경우에만 포함
}

/**
 * 소비자 공개용 검사성적서 정보
 * - 무추정 원칙: 실제 등록된 성적서 유무와 파일명, 그리고 실제 구조화된 요약이 존재할 때만 포함
 * - private Storage 경로(users/{uid}/...)는 절대 소비자에게 노출하지 않음
 */
export interface PublicInspectionReportInfo {
  hasReport: boolean;
  reportName?: string;
  reportUrl?: string;
  inspectionAgency?: string;
  inspectionDate?: string;
  result?: string;
  summary?: string;
}

/**
 * 소비자 공개용 꿀 이력 데이터 모델 (Public Traceability Data Model)
 * - 농가 내부 관리정보, 원본 음성 발화, 개인적인 양봉 메모, 내부 벌통 상세, Firestore document ID, UID 등은 철저히 제외
 * - 무추정 원칙: 실제 확인된 사실 정보만 안전하게 포함
 */
export interface HoneyTracePublicData {
  productType: ApiaryProductType; // 'honey' | 'royalJelly' | 'propolis' | 'other'
  productName: string;
  productImageUrl?: string; // 양봉인이 업로드한 제품 대표 사진 공개 URL
  productId?: string;
  packageUnit?: string; // 포장 규격
  storageMethod?: string; // 보관 방법
  honeyType: string;
  nectarSource: string; // 예: '아카시아', '밤꽃', '야생화', 또는 '밀원 미기재'
  productionStartDate: string;
  productionEndDate: string;
  totalYieldKg?: number;
  harvestSummary: string; // 예: "총 2회 채밀 (총 65kg)"
  lotNumber: string;
  traceabilityMessage: string; // 예: "양봉농가의 실제 양봉 기록을 기반으로 작성된 이력입니다."
  verifiedAt: string; // ISO string

  // 소비자 신뢰 제공을 위한 안전 공개 필드 (내부 비공개 정보 제외)
  farmName?: string;
  hasVerifiedJournalEvidence: boolean;
  harvestOperationCount?: number;

  // 2차 고도화: 근거 양봉일지, 채밀 작업 내역, 검사성적서 요약 (모두 정제된 소비자 공개용 필드)
  evidenceJournalCount?: number;
  evidenceJournals?: PublicJournalEvidenceItem[];
  harvestRecords?: PublicHarvestRecordItem[];
  inspectionReport?: PublicInspectionReportInfo;
}

