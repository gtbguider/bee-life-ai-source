import React, { useState, useEffect } from 'react';
import { HoneyLot, VoiceLogItem, HarvestOperation, HoneyTracePublicData } from '../types';
import { getProductTypeDisplay } from '../services/honeyLotService';
import {
  fetchJournalsFromFirestore,
  updateHoneyLotInFirestore
} from '../services/firestoreService';
import {
  createPublicHoneyTraceData,
  findMatchingHarvestJournalsForLot
} from '../services/honeyTracePublicService';
import {
  publishHoneyTrace,
  unpublishHoneyTrace,
  getPublicHoneyTraceById
} from '../services/publicHoneyTraceService';
import { ConsumerHoneyTraceView } from './ConsumerHoneyTraceView';
import { HoneyTraceQrModal, buildPublicTraceQrUrl } from './HoneyTraceQrModal';
import { HoneyInspectionReportSection } from './HoneyInspectionReportSection';

interface HoneyLotDetailModalProps {
  lot: HoneyLot | null;
  isOpen: boolean;
  onClose: () => void;
  uid?: string;
  onEdit?: (lot: HoneyLot) => void;
  onDelete?: (lot: HoneyLot) => void;
  onLotUpdated?: (updatedLot: HoneyLot) => void;
}

export const HoneyLotDetailModal: React.FC<HoneyLotDetailModalProps> = ({
  lot,
  isOpen,
  onClose,
  uid,
  onEdit,
  onDelete,
  onLotUpdated
}) => {
  const [journals, setJournals] = useState<VoiceLogItem[]>([]);
  const [isLoadingJournals, setIsLoadingJournals] = useState<boolean>(false);
  const [selectedJournal, setSelectedJournal] = useState<VoiceLogItem | null>(null);
  const [consumerPreviewData, setConsumerPreviewData] = useState<HoneyTracePublicData | null>(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);

  // Inspection report states (synced with lot)
  const [currentReportUrl, setCurrentReportUrl] = useState<string | undefined>(undefined);
  const [currentReportName, setCurrentReportName] = useState<string | undefined>(undefined);

  // Public publish states
  const [activePublicTraceId, setActivePublicTraceId] = useState<string>('');
  const [isPublished, setIsPublished] = useState<boolean>(false);
  const [publishedAt, setPublishedAt] = useState<string | undefined>(undefined);
  const [isCheckingPublish, setIsCheckingPublish] = useState<boolean>(false);
  const [isPublishConfirmOpen, setIsPublishConfirmOpen] = useState<boolean>(false);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [publishFeedback, setPublishFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Load related journals and check publish state when modal opens
  useEffect(() => {
    if (!lot || !isOpen) {
      setJournals([]);
      setSelectedJournal(null);
      setConsumerPreviewData(null);
      setIsQrModalOpen(false);
      setCurrentReportUrl(undefined);
      setCurrentReportName(undefined);
      setActivePublicTraceId('');
      setIsPublished(false);
      setPublishedAt(undefined);
      setIsPublishConfirmOpen(false);
      setPublishFeedback(null);
      return;
    }

    let isMounted = true;
    setCurrentReportUrl(lot.inspectionReportUrl);
    setCurrentReportName(lot.inspectionReportName);
    const currentTraceId = lot.publicTraceId || '';
    setActivePublicTraceId(currentTraceId);
    setPublishFeedback(null);

    if (currentTraceId) {
      setIsCheckingPublish(true);
      getPublicHoneyTraceById(currentTraceId)
        .then((res) => {
          if (!isMounted) return;
          if (res.status === 'found' && res.isPublished) {
            setIsPublished(true);
            setPublishedAt(res.publishedAt);
          } else {
            setIsPublished(false);
            setPublishedAt(undefined);
          }
        })
        .catch(() => {
          if (isMounted) setIsPublished(false);
        })
        .finally(() => {
          if (isMounted) setIsCheckingPublish(false);
        });
    } else {
      setIsPublished(false);
      setPublishedAt(undefined);
    }
    const loadRelatedJournals = async () => {
      setIsLoadingJournals(true);
      try {
        let allLogs: VoiceLogItem[] = [];
        if (uid) {
          allLogs = await fetchJournalsFromFirestore(uid);
        }

        // Also check UID-scoped local storage for offline / guest mode (never read another user's localStorage)
        if (allLogs.length === 0) {
          try {
            const journalKey = uid
              ? `honeybee_beekeeping_journal_logs_v2_${uid}`
              : 'honeybee_beekeeping_journal_logs_v2';
            const localRaw = localStorage.getItem(journalKey);
            if (localRaw) {
              const parsed = JSON.parse(localRaw);
              if (Array.isArray(parsed)) allLogs = parsed;
            }
          } catch (e) {
            console.warn('Failed to parse local journals:', e);
          }
        }

        // Collect all related journal IDs (① associatedJournalIds → ② harvestOperations[].journalId → ③ nectarSources.evidenceJournalIds → ④ 안전한 자동 매칭)
        const relatedIds = new Set<string>();
        if (lot.associatedJournalIds) {
          lot.associatedJournalIds.forEach((id) => relatedIds.add(id));
        }
        if (lot.harvestOperations) {
          lot.harvestOperations.forEach((op) => {
            if (op.journalId) relatedIds.add(op.journalId);
          });
        }
        if (lot.nectarSources?.evidenceJournalIds) {
          lot.nectarSources.evidenceJournalIds.forEach((id) => relatedIds.add(id));
        }

        const matched =
          relatedIds.size > 0
            ? allLogs.filter((j) => relatedIds.has(j.id))
            : findMatchingHarvestJournalsForLot(lot, allLogs);
        if (isMounted) {
          setJournals(matched);
        }
      } catch (err) {
        console.warn('Error loading related journals for detail modal:', err);
      } finally {
        if (isMounted) setIsLoadingJournals(false);
      }
    };

    loadRelatedJournals();
    return () => {
      isMounted = false;
    };
  }, [lot, isOpen, uid]);

  if (!isOpen || !lot) return null;

  const productMeta = getProductTypeDisplay(lot.productType);

  // Badge colors
  let badgeBg = '#fbf0e0';
  let badgeText = '#a05c00';
  if (lot.honeyType.includes('밤')) {
    badgeBg = '#ede3da';
    badgeText = '#5a3818';
  } else if (lot.honeyType.includes('야생화') || lot.honeyType.includes('잡화')) {
    badgeBg = '#e8f3ea';
    badgeText = '#2b6e39';
  } else if (lot.honeyType === '밀원 미기재') {
    badgeBg = '#f5f5f5';
    badgeText = '#737373';
  }

  // Display values
  const displayTotalYield =
    lot.totalYieldKg !== undefined
      ? `${lot.totalYieldKg} kg`
      : lot.harvestQuantityKg !== undefined
      ? `${lot.harvestQuantityKg} kg`
      : '수량 미기재';

  const displayHiveRange =
    lot.aggregatedHiveRange ||
    lot.hiveRange ||
    (lot.hiveIds && lot.hiveIds.length > 0 ? `${lot.hiveIds.join(' · ')}번` : '전체 벌통');

  const displayProductionPeriod = lot.productionPeriod
    ? `${lot.productionPeriod.startDate.replace(/-/g, '.')} ~ ${lot.productionPeriod.endDate.replace(/-/g, '.')} (${lot.productionPeriod.durationDays}일간)`
    : lot.harvestDate.replace(/-/g, '.');

  const displayInboundDate = (lot.inboundDate || lot.harvestDate).replace(/-/g, '.');

  // Check which steps exist for traceability chain
  const hasJournalsStep = (lot.associatedJournalIds && lot.associatedJournalIds.length > 0) || journals.length > 0;
  const hasOperationsStep = Boolean(lot.harvestOperations && lot.harvestOperations.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 pt-safe pb-safe bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div
        className="bg-white rounded-3xl w-full max-w-xl shadow-2xl border border-[#e8dec8] flex flex-col max-h-[calc(100dvh-2.5rem)] my-auto overflow-hidden text-[#0d1e25]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#f0e7d5] flex items-center justify-between bg-gradient-to-r from-[#fff9ee] via-[#fffdf9] to-[#ffffff] shrink-0">
          <div>
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-[#fff9ee] border border-[#ffdeac] text-[#7e5700] inline-flex items-center gap-1 shadow-2xs">
                <span>{productMeta.icon}</span>
                <span>{productMeta.label}</span>
              </span>
              <span
                className="text-[11px] font-black px-2.5 py-0.5 rounded-md border"
                style={{ backgroundColor: badgeBg, color: badgeText, borderColor: '#d6c4ac' }}
              >
                {lot.honeyType}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#f3ebe0] text-[#554632]">
                {lot.farmName || '농업회사법인 허니비테코 주식회사'}
              </span>
            </div>
            <h2 className="text-[18px] font-black text-[#2b1e00] leading-tight">
              {lot.productName}
            </h2>
            <div className="font-mono text-[12px] font-black text-[#7e5700] tracking-wide mt-0.5 flex items-center gap-1">
              <span className="text-[10.5px] font-sans font-semibold text-[#887864]">LOT 번호:</span>
              <span>{lot.lotNumber}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#887864] hover:bg-[#f3ebe0] transition-colors cursor-pointer"
            aria-label="닫기"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 overflow-y-auto overscroll-contain space-y-4 text-[13px]">
          {/* 연결된 제품 대표 사진 및 포장/보관 정보 */}
          {(lot.productImageUrl || lot.packageUnit || lot.storageMethod) && (
            <div className="bg-[#fbf9f4] border border-[#ebdcc4] rounded-2xl p-3 flex items-center gap-3.5">
              {lot.productImageUrl ? (
                <img
                  src={lot.productImageUrl}
                  alt={`${lot.productName} 대표 사진`}
                  className="w-16 h-16 rounded-xl object-cover border border-[#ebdcc4] shrink-0 shadow-2xs"
                />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-[#f0e7d5] flex items-center justify-center text-[24px] shrink-0">
                  {productMeta.icon}
                </div>
              )}
              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-sm bg-[#e8f5e9] text-[#2e7d32]">
                    연결 제품 정보
                  </span>
                  {lot.packageUnit && (
                    <span className="text-[11.5px] font-bold text-[#554632]">
                      규격: {lot.packageUnit}
                    </span>
                  )}
                </div>
                {lot.storageMethod && (
                  <p className="text-[11px] text-[#7e5700] font-semibold">
                    보관: {lot.storageMethod}
                  </p>
                )}
                {lot.productImageUrl && (
                  <p className="text-[10.5px] text-[#6e5d47]">
                    ✓ 소비자 공개 화면(QR)에 실제 제품 사진으로 표시됩니다.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* 1. 시각적 추적성 다이어그램 (양봉일지 → 채밀 작업 → 꿀 이력 → LOT 번호) */}
          <div className="bg-[#fcf8f0] border border-[#ebdcc3] rounded-2xl p-3.5 space-y-2 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-black text-[#7e5700] flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px]">route</span>
                <span>꿀 생산 이력 추적 체인 (Chain of Custody)</span>
              </div>
              <span className="text-[9.5px] font-bold px-1.5 py-0.2 bg-[#ffeed1] text-[#7e5700] rounded">
                실제 검증 데이터
              </span>
            </div>

            {/* Traceability Flow Nodes */}
            <div className="flex items-center justify-between text-center gap-1 pt-1 overflow-x-auto">
              {/* Step 1: 양봉일지 */}
              {hasJournalsStep && (
                <>
                  <div className="flex-1 bg-white p-2 rounded-xl border border-[#e8dec8] shadow-2xs min-w-[70px]">
                    <div className="text-[14px]">📋</div>
                    <div className="text-[10.5px] font-bold text-[#2b1e00] mt-0.5">양봉일지</div>
                    <div className="text-[9.5px] text-[#7e5700] font-semibold">
                      {lot.associatedJournalIds?.length || journals.length}건 기록
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-[14px] text-[#bda482] shrink-0">arrow_forward</span>
                </>
              )}

              {/* Step 2: 채밀 작업 */}
              {hasOperationsStep && (
                <>
                  <div className="flex-1 bg-white p-2 rounded-xl border border-[#e8dec8] shadow-2xs min-w-[70px]">
                    <div className="text-[14px]">⚙️</div>
                    <div className="text-[10.5px] font-bold text-[#2b1e00] mt-0.5">채밀 작업</div>
                    <div className="text-[9.5px] text-[#b34700] font-semibold">
                      {lot.harvestOperations?.length}회 내역
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-[14px] text-[#bda482] shrink-0">arrow_forward</span>
                </>
              )}

              {/* Step 3: 꿀 이력 */}
              <div className="flex-1 bg-white p-2 rounded-xl border border-[#e8dec8] shadow-2xs min-w-[70px]">
                <div className="text-[14px]">🍯</div>
                <div className="text-[10.5px] font-bold text-[#2b1e00] mt-0.5">꿀 이력</div>
                <div className="text-[9.5px] text-[#7e5700] font-semibold">{displayTotalYield}</div>
              </div>

              <span className="material-symbols-outlined text-[14px] text-[#bda482] shrink-0">arrow_forward</span>

              {/* Step 4: LOT 번호 */}
              <div className="flex-1 bg-[#fff9ee] p-2 rounded-xl border border-[#f0d8a8] shadow-2xs min-w-[70px]">
                <div className="text-[14px]">🏷️</div>
                <div className="text-[10.5px] font-black text-[#7e5700] mt-0.5">LOT 번호</div>
                <div className="text-[9px] font-mono font-bold text-[#554632] truncate" title={lot.lotNumber}>
                  {lot.lotNumber.split('-').slice(1).join('-')}
                </div>
              </div>
            </div>
          </div>

          {/* 2. 상세 스펙 그리드 */}
          <div className="bg-[#fbf9f4] p-3.5 rounded-2xl border border-[#eee4d4] space-y-2.5">
            <h3 className="text-[12.5px] font-black text-[#2b1e00] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[15px] text-[#7e5700]">info</span>
              <span>기본 생산 이력 정보</span>
            </h3>

            <div className="grid grid-cols-2 gap-2 text-[12px]">
              <div className="bg-white p-2.5 rounded-xl border border-[#e8dec8]">
                <div className="text-[10.5px] font-bold text-[#887864]">생산기간</div>
                <div className="font-extrabold text-[#0d1e25] text-[12.5px] mt-0.5">
                  {displayProductionPeriod}
                </div>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-[#e8dec8]">
                <div className="text-[10.5px] font-bold text-[#887864]">입고일자</div>
                <div className="font-extrabold text-[#0d1e25] text-[12.5px] mt-0.5">
                  {displayInboundDate}
                </div>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-[#e8dec8]">
                <div className="text-[10.5px] font-bold text-[#887864]">총 채밀량</div>
                <div className="font-black text-[#b34700] text-[14px] mt-0.5">
                  {displayTotalYield}
                </div>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-[#e8dec8]">
                <div className="text-[10.5px] font-bold text-[#887864]">대상 벌통</div>
                <div className="font-extrabold text-[#7e5700] text-[12.5px] mt-0.5 truncate" title={displayHiveRange}>
                  {displayHiveRange}
                </div>
              </div>

              <div className="col-span-2 bg-white p-2.5 rounded-xl border border-[#e8dec8] space-y-1">
                <div className="flex items-center justify-between">
                  <div className="text-[10.5px] font-bold text-[#887864]">주요 밀원</div>
                  {lot.nectarSource === '밀원 미기재' && (
                    <span className="text-[9.5px] font-semibold text-[#887864] bg-[#f5f5f5] px-1.5 py-0.2 rounded">
                      무추정 원칙 유지
                    </span>
                  )}
                </div>
                <div className="font-extrabold text-[#0d1e25] text-[13px]">
                  {lot.nectarSource || '밀원 미기재'}
                </div>
                {lot.nectarSources?.evidenceJournalIds && lot.nectarSources.evidenceJournalIds.length > 0 && (
                  <div className="text-[10.5px] text-[#2b6e39] font-medium flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px]">check_circle</span>
                    <span>양봉일지 기록을 근거로 확인된 밀원입니다.</span>
                  </div>
                )}
                {lot.nectarSource === '밀원 미기재' && (
                  <p className="text-[10.5px] text-[#887864]">
                    ※ 일지에 밀원이 기록되지 않아 임의 추정 없이 '밀원 미기재'로 등록되었습니다.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* 2-1. 공인성적서 등록·교체·삭제·보기 */}
          <HoneyInspectionReportSection
            lotId={lot.id}
            uid={uid}
            inspectionReportUrl={currentReportUrl}
            inspectionReportName={currentReportName}
            onUpdateInspectionReport={async (nextUrl, nextName) => {
              const updatedLot: HoneyLot = {
                ...lot,
                publicTraceId: activePublicTraceId || lot.publicTraceId,
                inspectionReportUrl: nextUrl,
                inspectionReportName: nextName,
                updatedAt: new Date().toISOString()
              };

              if (uid) {
                await updateHoneyLotInFirestore(uid, updatedLot);
              }

              setCurrentReportUrl(nextUrl);
              setCurrentReportName(nextName);
              onLotUpdated?.(updatedLot);
            }}
          />

          {/* 3. 회차별 채밀 작업 내역 (harvestOperations) */}
          {lot.harvestOperations && lot.harvestOperations.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-[12.5px] font-black text-[#2b1e00] flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[15px] text-[#7e5700]">fact_check</span>
                  <span>채밀 작업 내역 ({lot.harvestOperations.length}회)</span>
                </span>
                <span className="text-[10.5px] font-normal text-[#887864]">일지 연동 내역</span>
              </h3>

              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {lot.harvestOperations.map((op, idx) => {
                  const linkedJournal = journals.find((j) => j.id === op.journalId);
                  return (
                    <div
                      key={op.operationId || idx}
                      className="p-2.5 bg-white border border-[#e8dec8] rounded-xl flex items-center justify-between text-[12px] hover:border-[#7e5700]/50 transition-colors"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#0d1e25]">{op.date.replace(/-/g, '.')}</span>
                          <span className="text-[10.5px] px-1.5 py-0.2 bg-[#f3ebe0] rounded font-semibold text-[#554632]">
                            {op.hiveRange}
                          </span>
                        </div>
                        {op.notes && (
                          <p className="text-[11px] text-[#887864] line-clamp-1 max-w-xs">{op.notes}</p>
                        )}
                        {op.journalId && (
                          <button
                            type="button"
                            onClick={() => {
                              if (linkedJournal) setSelectedJournal(linkedJournal);
                            }}
                            className="text-[10px] font-bold text-[#7e5700] hover:underline flex items-center gap-0.5 cursor-pointer mt-0.5"
                          >
                            <span className="material-symbols-outlined text-[12px]">link</span>
                            <span>근거 일지 보기 ({op.journalId})</span>
                          </button>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        {op.yieldKg > 0 ? (
                          <span className="font-black text-[#b34700]">
                            {op.yieldKg}
                            <span className="text-[10px] font-normal text-[#554632]"> kg</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-[#887864]">수량 미기재</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. 근거 양봉일지 목록 (associatedJournalIds) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-[12.5px] font-black text-[#2b1e00] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px] text-[#7e5700]">source</span>
                <span>
                  근거 양봉일지 ({lot.associatedJournalIds?.length || journals.length || 0}건)
                </span>
              </h3>
              <span className="text-[10.5px] text-[#7e5700] font-semibold">
                클릭하여 일지 원문 확인
              </span>
            </div>

            {isLoadingJournals ? (
              <div className="py-4 text-center text-[11.5px] text-[#887864] flex items-center justify-center gap-1.5">
                <span className="w-3.5 h-3.5 border-2 border-[#7e5700] border-t-transparent rounded-full animate-spin" />
                <span>관련 일지를 불러오는 중입니다...</span>
              </div>
            ) : journals.length > 0 ? (
              <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                {journals.map((j) => (
                  <div
                    key={j.id}
                    onClick={() => setSelectedJournal(j)}
                    className="p-2.5 bg-[#fdfbf7] border border-[#f0e6d6] hover:border-[#7e5700] rounded-xl text-[11.5px] cursor-pointer transition-colors space-y-1 group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-[#7e5700]">{j.date.replace(/-/g, '.')}</span>
                        <span className="text-[10px] px-1.5 py-0.2 bg-[#f3ebe0] rounded font-semibold text-[#554632]">
                          {j.hiveRange || `${j.hiveId}번`}
                        </span>
                        {j.status && (
                          <span className="text-[10px] px-1.5 py-0.2 bg-[#fff3e0] text-[#7e5700] font-bold rounded">
                            {j.status}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-bold text-[#7e5700] group-hover:underline flex items-center gap-0.5">
                        <span>상세보기</span>
                        <span className="material-symbols-outlined text-[12px]">chevron_right</span>
                      </span>
                    </div>
                    <p className="text-[#554632] line-clamp-2 leading-relaxed">
                      "{j.text || j.originalText || j.aiSummary || '기록 내용 없음'}"
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 bg-[#fbf9f4] border border-[#eee4d4] rounded-xl text-[11.5px] text-[#887864] text-center">
                {lot.associatedJournalIds && lot.associatedJournalIds.length > 0
                  ? `연결된 양봉일지 ID: ${lot.associatedJournalIds.join(', ')}`
                  : '연동된 근거 양봉일지가 없습니다. (수동 등록 이력)'}
              </div>
            )}
          </div>

          {/* 5. AI 생산 이력 요약 (aiProductionStory) */}
          {lot.aiProductionStory?.summary && (
            <div className="p-3.5 bg-gradient-to-r from-[#fff9ee] to-[#fbf9f4] border border-[#f2e5ce] rounded-2xl space-y-1.5 shadow-2xs">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#7e5700]">
                <span className="material-symbols-outlined text-[15px]">psychology</span>
                <span>AI 생산 이력 요약 (참고 설명)</span>
              </div>
              <p className="text-[12px] text-[#2b1e00] font-medium leading-relaxed">
                {lot.aiProductionStory.summary}
              </p>
              <div className="text-[10px] text-[#887864] pt-0.5">
                ※ AI 요약은 참고 설명이며 실제 원본 양봉일지의 기록 사실을 대체하지 않습니다.
              </div>
            </div>
          )}

          {/* 6. 메모 */}
          {lot.notes && (
            <div className="bg-white p-3 rounded-2xl border border-[#e8dec8] space-y-1">
              <div className="text-[10.5px] font-bold text-[#887864]">특이사항 및 메모</div>
              <div className="text-[12px] text-[#2b1e00] whitespace-pre-wrap leading-relaxed">
                {lot.notes}
              </div>
            </div>
          )}

          {/* 7. 소비자 공개 게시 상태 및 주소 안내 */}
          {publishFeedback && (
            <div
              className={`p-3 rounded-xl text-[12px] font-bold border ${
                publishFeedback.type === 'success'
                  ? 'bg-[#eef8f0] border-[#bfe0c5] text-[#1e5229]'
                  : 'bg-[#fdf3f2] border-[#f5c6c4] text-[#a12b2b]'
              }`}
            >
              {publishFeedback.message}
            </div>
          )}

          {isPublished && activePublicTraceId && (
            <div className="bg-[#f1f9f2] p-3.5 rounded-2xl border border-[#bfe0c5] space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#1e5229] text-white text-[10px] font-extrabold">
                    공개 게시 중
                  </span>
                  <span className="text-[11px] font-extrabold text-[#1e5229]">
                    소비자 공개 페이지
                  </span>
                </div>
                {publishedAt && (
                  <span className="text-[10.5px] font-semibold text-[#3b6e46]">
                    게시일: {publishedAt.slice(0, 10).replace(/-/g, '.')}
                  </span>
                )}
              </div>

              <div className="bg-white/90 px-3 py-2 rounded-xl border border-[#cde6d1] flex items-center justify-between gap-2">
                <div className="font-mono text-[11.5px] font-bold text-[#2b1e00] truncate">
                  {buildPublicTraceQrUrl(activePublicTraceId)}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const targetPath = `/trace/${activePublicTraceId}`;
                    window.history.pushState(
                      { publicTraceId: activePublicTraceId },
                      '',
                      targetPath
                    );
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }}
                  className="shrink-0 px-3 py-1.5 rounded-xl bg-[#1e5229] hover:bg-[#163d1e] text-white text-[11.5px] font-bold transition-colors cursor-pointer"
                >
                  공개 페이지 열기
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 bg-[#fbf9f4] border-t border-[#f0e7d5] flex flex-col gap-2.5 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  const publicData = createPublicHoneyTraceData(
                    {
                      ...lot,
                      inspectionReportUrl: currentReportUrl,
                      inspectionReportName: currentReportName
                    },
                    journals
                  );
                  setConsumerPreviewData(publicData);
                }}
                className="text-[11.5px] font-black text-[#1e5229] bg-[#eef8f0] border border-[#bfe0c5] hover:bg-[#dfefe2] px-3 py-1.5 rounded-xl transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
              >
                <span className="material-symbols-outlined text-[15px]">visibility</span>
                <span>소비자 공개 화면 미리보기</span>
              </button>

              {!isPublished ? (
                <button
                  type="button"
                  disabled={isPublishing || isCheckingPublish}
                  onClick={() => {
                    setPublishFeedback(null);
                    setIsPublishConfirmOpen(true);
                  }}
                  className="text-[11.5px] font-black text-white bg-[#1e5229] hover:bg-[#163d1e] disabled:opacity-50 px-3 py-1.5 rounded-xl transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                >
                  <span className="material-symbols-outlined text-[15px]">public</span>
                  <span>소비자에게 공개하기</span>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={isPublishing}
                    onClick={() => {
                      setPublishFeedback(null);
                      setIsPublishConfirmOpen(true);
                    }}
                    className="text-[11.5px] font-black text-[#7e5700] bg-[#fff9ef] border border-[#ffdeac] hover:bg-[#ffeed1] disabled:opacity-50 px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[14px]">sync</span>
                    <span>공개 정보 업데이트</span>
                  </button>
                  <button
                    type="button"
                    disabled={isPublishing}
                    onClick={async () => {
                      if (!activePublicTraceId) return;
                      try {
                        setIsPublishing(true);
                        setPublishFeedback(null);
                        await unpublishHoneyTrace(lot.id, activePublicTraceId);
                        setIsPublished(false);
                        setPublishFeedback({
                          type: 'success',
                          message: '소비자 공개가 해제되었습니다. (원본 꿀 이력은 안전하게 유지됩니다.)'
                        });
                      } catch (err: any) {
                        setPublishFeedback({
                          type: 'error',
                          message: err?.message || '공개 해제 중 오류가 발생했습니다.'
                        });
                      } finally {
                        setIsPublishing(false);
                      }
                    }}
                    className="text-[11.5px] font-bold text-[#a12b2b] bg-[#fff5f5] border border-[#f5c6c4] hover:bg-[#feebeb] disabled:opacity-50 px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer"
                  >
                    공개 해제
                  </button>
                </>
              )}
              <button
                type="button"
                disabled={!activePublicTraceId || !isPublished || isCheckingPublish}
                onClick={() => {
                  if (!activePublicTraceId || !isPublished) return;
                  setIsQrModalOpen(true);
                }}
                title={
                  !isPublished || !activePublicTraceId
                    ? '먼저 소비자 공개를 설정해 주세요.'
                    : '소비자 공개 URL용 QR 코드 생성'
                }
                className="text-[11.5px] font-black text-[#5c3d00] bg-[#fff4db] border border-[#f0d399] hover:bg-[#ffe9ba] disabled:opacity-45 disabled:cursor-not-allowed px-3 py-1.5 rounded-xl transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
              >
                <span className="material-symbols-outlined text-[15px]">qr_code_2</span>
                <span>QR 코드 생성</span>
              </button>
            </div>

            <div className="flex items-center justify-end gap-2 ml-auto">
              {onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(lot)}
                  className="text-[12px] font-bold text-[#a12b2b] hover:bg-[#feebeb] px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer"
                >
                  삭제하기
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 text-[12px] font-bold text-[#554632] bg-white border border-[#d6c8b2] rounded-xl hover:bg-[#f3ebe0] transition-colors cursor-pointer"
              >
                닫기
              </button>

              {onEdit && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEdit({
                      ...lot,
                      publicTraceId: activePublicTraceId || lot.publicTraceId,
                      inspectionReportUrl: currentReportUrl,
                      inspectionReportName: currentReportName
                    });
                  }}
                  className="px-3.5 py-1.5 text-[12px] font-black text-[#7e5700] bg-[#fff9ef] border border-[#ffdeac] hover:bg-[#ffeed1] rounded-xl transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                >
                  <span className="material-symbols-outlined text-[15px]">edit</span>
                  <span>수정하기</span>
                </button>
              )}
            </div>
          </div>

          {!isPublished && !isCheckingPublish && (
            <div className="text-[11px] font-semibold text-[#7a6852] flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px] text-[#8a6d3b]">info</span>
              <span>QR 코드 생성을 사용하려면 먼저 소비자 공개를 설정해 주세요.</span>
            </div>
          )}
        </div>
      </div>

      {/* Publish Confirmation Sub-modal */}
      {isPublishConfirmOpen && (
        <div
          className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/55 backdrop-blur-2xs animate-in fade-in duration-150"
          onClick={() => !isPublishing && setIsPublishConfirmOpen(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-2xl border border-[#d6c4ac] space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b border-[#f0e7d5] pb-2.5">
              <span className="material-symbols-outlined text-[20px] text-[#1e5229]">public</span>
              <h4 className="font-black text-[14.5px] text-[#2b1e00]">
                {isPublished ? '소비자 공개 정보 업데이트' : '소비자에게 공개하기'}
              </h4>
            </div>

            <div className="space-y-2.5 text-[12.5px] text-[#2b1e00] leading-relaxed">
              <p className="font-bold">
                이 꿀의 생산 이력 중 소비자 공개용 정보만 공개 페이지에 게시합니다.
              </p>
              <p className="text-[11.5px] text-[#685438] bg-[#fbf9f4] p-3 rounded-xl border border-[#eee4d4]">
                벌통 번호, 양봉일지 원문, 농가 내부 메모 등은 공개되지 않습니다.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                disabled={isPublishing}
                onClick={() => setIsPublishConfirmOpen(false)}
                className="px-4 py-2 text-[12px] font-bold text-[#554632] bg-[#f4efe5] hover:bg-[#eadecc] rounded-xl cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                disabled={isPublishing}
                onClick={async () => {
                  try {
                    setIsPublishing(true);
                    setPublishFeedback(null);
                    const result = await publishHoneyTrace(lot.id, activePublicTraceId);
                    setActivePublicTraceId(result.publicTraceId);
                    setIsPublished(true);
                    setPublishedAt(result.publishedAt);
                    if (result.publicTraceId && result.publicTraceId !== lot.publicTraceId) {
                      onLotUpdated?.({
                        ...lot,
                        publicTraceId: result.publicTraceId,
                        inspectionReportUrl: currentReportUrl,
                        inspectionReportName: currentReportName
                      });
                    }
                    setIsPublishConfirmOpen(false);
                    setPublishFeedback({
                      type: 'success',
                      message: '소비자 공개 페이지에 안전하게 게시되었습니다.'
                    });
                  } catch (err: any) {
                    setIsPublishConfirmOpen(false);
                    setPublishFeedback({
                      type: 'error',
                      message: err?.message || '공개 게시 중 오류가 발생했습니다.'
                    });
                  } finally {
                    setIsPublishing(false);
                  }
                }}
                className="px-4 py-2 text-[12px] font-black text-white bg-[#1e5229] hover:bg-[#163d1e] disabled:opacity-50 rounded-xl cursor-pointer flex items-center gap-1.5"
              >
                {isPublishing ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>처리 중...</span>
                  </>
                ) : (
                  <span>공개하기</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Consumer Public Trace Preview Modal */}
      {consumerPreviewData && (
        <ConsumerHoneyTraceView
          data={consumerPreviewData}
          onClose={() => setConsumerPreviewData(null)}
        />
      )}

      {/* Consumer Public Trace QR Modal */}
      {isQrModalOpen && activePublicTraceId && (
        <HoneyTraceQrModal
          publicTraceId={activePublicTraceId}
          lotNumber={lot.lotNumber}
          productName={lot.productName}
          onClose={() => setIsQrModalOpen(false)}
        />
      )}

      {/* Linked Journal Quick View Sub-modal */}
      {selectedJournal && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 backdrop-blur-2xs animate-in fade-in duration-150"
          onClick={() => setSelectedJournal(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-sm p-4 shadow-2xl border border-[#d6c4ac] space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#f0e7d5] pb-2">
              <div className="flex items-center gap-1.5">
                <span className="text-[16px]">📋</span>
                <span className="font-bold text-[13.5px] text-[#2b1e00]">양봉일지 원문 상세</span>
              </div>
              <button
                onClick={() => setSelectedJournal(null)}
                className="w-6 h-6 rounded-full flex items-center justify-center text-[#887864] hover:bg-[#f3ebe0]"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="space-y-2 text-[12px]">
              <div className="flex items-center justify-between bg-[#fbf9f4] p-2 rounded-lg">
                <span className="font-bold text-[#7e5700]">{selectedJournal.date} ({selectedJournal.timestamp || '09:00'})</span>
                <span className="font-bold text-[#2b1e00]">{selectedJournal.hiveRange || `${selectedJournal.hiveId}번`}</span>
              </div>

              {selectedJournal.honeyYieldKg && (
                <div className="flex items-center justify-between px-1">
                  <span className="text-[#887864]">채밀량:</span>
                  <span className="font-black text-[#b34700]">{selectedJournal.honeyYieldKg} kg</span>
                </div>
              )}

              <div className="p-2.5 bg-white border border-[#e8dec8] rounded-xl space-y-1">
                <div className="text-[10.5px] font-bold text-[#887864]">기록 내용:</div>
                <div className="text-[#0d1e25] leading-relaxed">
                  {selectedJournal.text || selectedJournal.originalText || selectedJournal.aiSummary}
                </div>
              </div>

              {selectedJournal.tags && selectedJournal.tags.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap pt-1">
                  {selectedJournal.tags.map((t, idx) => (
                    <span key={idx} className="text-[9.5px] font-bold px-1.5 py-0.5 bg-[#f3ebe0] text-[#554632] rounded">
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-1 text-right">
              <button
                type="button"
                onClick={() => setSelectedJournal(null)}
                className="w-full py-1.5 text-[12px] font-bold text-[#554632] bg-[#f4efe5] hover:bg-[#eadecc] rounded-xl"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
