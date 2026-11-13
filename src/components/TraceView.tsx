import React, { useState, useEffect } from 'react';
import { LOGO_URL, BEEKEEPER_IMG } from '../data/mockData';
import { ApiaryMapSection } from './ApiaryMapSection';
import { GlossaryModal } from './GlossaryModal';
import { HoneyLot } from '../types';
import { useAuth } from '../contexts/AuthContext';
import {
  loadHoneyLotsFromFirestore,
  updateHoneyLotInFirestore
} from '../services/firestoreService';
import { getProductTypeDisplay } from '../services/honeyLotService';
import { loadUserProfile } from '../services/userProfile';
import { HoneyInspectionReportSection } from './HoneyInspectionReportSection';

interface TraceViewProps {
  onOpenAnalysisCertificate?: () => void;
  onBackToApp: () => void;
}

const STORAGE_KEY = 'honeybee_honey_lots_v1';

function getLotsStorageKey(uid?: string): string {
  return uid ? `${STORAGE_KEY}_${uid}` : STORAGE_KEY;
}

export const TraceView: React.FC<TraceViewProps> = ({
  onBackToApp
}) => {
  const { user } = useAuth();
  const userProfile = loadUserProfile(user?.uid);

  const [showGlossaryModal, setShowGlossaryModal] = useState<boolean>(false);
  const [selectedGlossaryTermId, setSelectedGlossaryTermId] = useState<string | null>(null);
  const [lots, setLots] = useState<HoneyLot[]>([]);
  const [selectedLotId, setSelectedLotId] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isReportPreviewOpen, setIsReportPreviewOpen] = useState<boolean>(false);

  const openGlossary = (termId?: string) => {
    setSelectedGlossaryTermId(termId || null);
    setShowGlossaryModal(true);
  };

  useEffect(() => {
    let isMounted = true;

    const loadLots = async () => {
      setIsLoading(true);
      try {
        let fetchedLots: HoneyLot[] = [];
        if (user?.uid) {
          fetchedLots = await loadHoneyLotsFromFirestore(user.uid);
        } else {
          try {
            const saved = localStorage.getItem(getLotsStorageKey(undefined));
            if (saved) {
              const parsed = JSON.parse(saved);
              if (Array.isArray(parsed) && parsed.length > 0) {
                fetchedLots = parsed;
              }
            }
          } catch (e) {
            console.warn('Failed to parse local honey lots in TraceView:', e);
          }
        }

        if (isMounted) {
          setLots(fetchedLots);
          if (fetchedLots.length > 0) {
            // Prefer the target lot 2026-AC-20260528-01 if present, else first lot
            const targetLot =
              fetchedLots.find((l) => l.lotNumber === '2026-AC-20260528-01') ||
              fetchedLots[0];
            setSelectedLotId(targetLot.id);
          } else {
            setSelectedLotId('');
          }
        }
      } catch (err) {
        console.warn('Error loading HoneyLots in TraceView:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadLots();
    return () => {
      isMounted = false;
    };
  }, [user?.uid]);

  const currentLot = lots.find((l) => l.id === selectedLotId) || lots[0] || null;
  const productMeta = getProductTypeDisplay(currentLot?.productType);

  const hasInspectionReport = Boolean(
    currentLot?.inspectionReportUrl && currentLot.inspectionReportUrl.trim()
  );
  const reportFileName =
    currentLot?.inspectionReportName && currentLot.inspectionReportName.trim()
      ? currentLot.inspectionReportName.trim()
      : '등록된 검사성적서';

  const isPdfReport = Boolean(
    reportFileName.toLowerCase().endsWith('.pdf') ||
      (currentLot?.inspectionReportUrl &&
        (currentLot.inspectionReportUrl.toLowerCase().includes('.pdf') ||
          currentLot.inspectionReportUrl.startsWith('data:application/pdf')))
  );

  const displayHarvestDate = currentLot?.harvestDate
    ? currentLot.harvestDate.replace(/-/g, '.')
    : '미기재';

  const displayInboundDate = currentLot?.inboundDate
    ? currentLot.inboundDate.replace(/-/g, '.')
    : currentLot?.harvestDate
    ? currentLot.harvestDate.replace(/-/g, '.')
    : '미기재';

  const displayYield =
    currentLot?.totalYieldKg !== undefined
      ? `${currentLot.totalYieldKg} kg`
      : currentLot?.harvestQuantityKg !== undefined
      ? `${currentLot.harvestQuantityKg} kg`
      : '수량 미기재';

  const displayHiveRange =
    currentLot?.aggregatedHiveRange ||
    currentLot?.hiveRange ||
    (currentLot?.hiveIds && currentLot.hiveIds.length > 0
      ? `${currentLot.hiveIds.join(' · ')}번`
      : '미기재');

  const displayNectarSource =
    currentLot?.nectarSource && currentLot.nectarSource.trim()
      ? currentLot.nectarSource.trim()
      : '밀원 미기재';

  const handleUpdateInspectionReport = async (
    nextUrl: string | undefined,
    nextName: string | undefined
  ) => {
    if (!currentLot) return;
    const updatedLot: HoneyLot = {
      ...currentLot,
      inspectionReportUrl: nextUrl,
      inspectionReportName: nextName,
      updatedAt: new Date().toISOString()
    };

    if (user?.uid) {
      await updateHoneyLotInFirestore(user.uid, updatedLot);
    }

    setLots((prev) => {
      const next = prev.map((l) => (l.id === updatedLot.id ? updatedLot : l));
      try {
        localStorage.setItem(getLotsStorageKey(user?.uid), JSON.stringify(next));
      } catch {
        // ignore storage error
      }
      return next;
    });
  };

  return (
    <div className="flex flex-col w-full min-h-screen pb-24 pt-16 bg-[#f4faff]">
      <div className="flex flex-col w-full px-4 py-4 gap-4 max-w-md mx-auto">
        {/* Top Product Header */}
        <div className="flex flex-col items-center text-center gap-1.5 pt-2">
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <div className="bg-[#e7f6ff] text-[#7e5700] font-bold text-[12px] px-3.5 py-1 rounded-full border border-[#d6c4ac]/50 shadow-2xs flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px]">verified</span>
              <span>실제 꿀 생산 이력 확인</span>
            </div>

            {/* Glossary Button */}
            <button
              onClick={() => openGlossary()}
              className="bg-[#7e5700] hover:bg-[#604100] text-white font-bold text-[12px] px-3 py-1 rounded-full shadow-2xs flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[15px]">auto_stories</span>
              <span>쉬운 양봉용어사전</span>
            </button>
          </div>

          <h1 className="text-[22px] font-extrabold text-[#0d1e25] mt-1">
            {currentLot ? currentLot.productName : '농업회사법인 허니비테코 천연꿀'}
          </h1>
          <p className="text-[13px] text-[#514532] leading-relaxed max-w-[320px]">
            {currentLot?.farmName || userProfile.farmName || '농업회사법인 허니비테코 주식회사'}에 등록된 실제 생산 이력 및 공인성적서 정보입니다.
          </p>
        </div>

        {/* LOT Selector if multiple lots exist */}
        {lots.length > 1 && (
          <div className="bg-white border border-[#d6c4ac] rounded-2xl p-3 shadow-2xs space-y-1.5">
            <label className="text-[11px] font-bold text-[#7e5700] flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px]">inventory_2</span>
              <span>조회할 꿀 이력(LOT) 선택</span>
            </label>
            <select
              value={currentLot?.id || ''}
              onChange={(e) => setSelectedLotId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#d6c4ac] bg-[#fbf9f4] text-[12.5px] font-bold text-[#0d1e25] focus:outline-none focus:ring-2 focus:ring-[#7e5700]"
            >
              {lots.map((l) => (
                <option key={l.id} value={l.id}>
                  [{l.lotNumber}] {l.productName} ({l.harvestDate})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Beekeeper Honey Holding Main Visual Card */}
        <div className="relative w-full rounded-3xl overflow-hidden shadow-md border-2 border-white aspect-[4/3] bg-[#d9ebf5]">
          <img
            src={BEEKEEPER_IMG}
            alt="지리산 양봉장 농업회사법인 허니비테코 주식회사 숙성 벌집꿀"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full border border-white shadow-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-[#1b6d24] animate-pulse" />
            <span className="text-[11px] font-extrabold text-[#0d1e25]">
              {userProfile.apiaryTitle || '지리산 제1봉장 채밀 현장'}
            </span>
          </div>
          <div className="absolute bottom-3 right-3 bg-white/95 p-1.5 rounded-xl shadow-xs border border-white/80">
            <img src={LOGO_URL} alt="농업회사법인 허니비테코 주식회사 로고" className="h-6 w-auto object-contain" />
          </div>
        </div>

        {/* Status Banner based on actual registered data */}
        <div
          className={`${
            hasInspectionReport
              ? 'bg-[#a0f399]/70 border-[#1b6d24]/30'
              : 'bg-[#fff9ee] border-[#f0d8a8]'
          } border-2 rounded-3xl p-5 shadow-sm flex flex-col items-center text-center relative overflow-hidden`}
        >
          <div
            className={`w-12 h-12 ${
              hasInspectionReport ? 'bg-[#1b6d24]' : 'bg-[#7e5700]'
            } rounded-2xl flex items-center justify-center text-white mb-3 shadow-xs`}
          >
            <span
              className="material-symbols-outlined text-[26px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {hasInspectionReport ? 'verified' : 'fact_check'}
            </span>
          </div>
          <h2 className="text-[17px] font-bold text-[#0d1e25] mb-1.5">
            {hasInspectionReport ? '공인 검사성적서 등록됨' : '실제 꿀 생산 이력 연동됨'}
          </h2>
          <p className="text-[13px] text-[#2b1e00] leading-relaxed">
            {currentLot ? (
              hasInspectionReport ? (
                <>
                  LOT 번호 <strong className="font-mono font-black">{currentLot.lotNumber}</strong>에
                  실제 공인 검사성적서(<strong>{reportFileName}</strong>)가 등록되어 있습니다.
                </>
              ) : (
                <>
                  LOT 번호 <strong className="font-mono font-black">{currentLot.lotNumber}</strong>의
                  실제 채밀·생산 이력이 연동되어 있습니다. (등록된 검사성적서 없음)
                </>
              )
            ) : (
              '등록된 꿀 이력이 없습니다. [꿀 이력제] 탭에서 채밀 이력을 먼저 등록해주세요.'
            )}
          </p>
        </div>

        {/* Consumer Beekeeping Terms Guide Banner */}
        <div className="bg-white border border-[#d6c4ac] rounded-3xl p-4 shadow-sm space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#7e5700] text-[20px]">
                lightbulb
              </span>
              <h3 className="font-bold text-[15px] text-[#0d1e25]">
                소비자 필수 꿀 상식 (터치 시 풀이)
              </h3>
            </div>
            <button
              onClick={() => openGlossary()}
              className="text-[11px] text-[#7e5700] font-bold flex items-center gap-0.5 hover:underline"
            >
              <span>전체 사전</span>
              <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => openGlossary('natural-aged-honey')}
              className="p-2 rounded-xl bg-[#f4faff] border border-[#d4e5ef] hover:bg-[#ffdeac]/40 transition-all text-left flex flex-col gap-1"
            >
              <div className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[#7e5700] text-[15px]">water_drop</span>
                <span className="font-bold text-[12px] text-[#0d1e25]">자연숙성꿀</span>
              </div>
              <span className="text-[10px] text-[#514532] line-clamp-1">인공농축 없는 순수 꿀</span>
            </button>

            <button
              onClick={() => openGlossary('bong-gae')}
              className="p-2 rounded-xl bg-[#f4faff] border border-[#d4e5ef] hover:bg-[#ffdeac]/40 transition-all text-left flex flex-col gap-1"
            >
              <div className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[#1b6d24] text-[15px]">verified</span>
                <span className="font-bold text-[12px] text-[#0d1e25]">봉개(완숙)</span>
              </div>
              <span className="text-[10px] text-[#514532] line-clamp-1">천연 밀랍 밀봉 꿀</span>
            </button>

            <button
              onClick={() => openGlossary('carbon-isotope')}
              className="p-2 rounded-xl bg-[#f4faff] border border-[#d4e5ef] hover:bg-[#ffdeac]/40 transition-all text-left flex flex-col gap-1"
            >
              <div className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[#0277bd] text-[15px]">science</span>
                <span className="font-bold text-[12px] text-[#0d1e25]">동위원소비</span>
              </div>
              <span className="text-[10px] text-[#514532] line-clamp-1">진짜 꽃꿀 판별 기준</span>
            </button>
          </div>
        </div>

        {/* 생산 상세 정보 Section (실제 HoneyLot 데이터 기반) */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[#7e5700] text-[18px]">
                eco
              </span>
              <h3 className="font-bold text-[15px] text-[#0d1e25]">생산 상세 정보</h3>
            </div>
            <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-[#eef8f0] text-[#1e5229]">
              실제 등록 데이터
            </span>
          </div>

          {isLoading ? (
            <div className="bg-white border border-[#d6c4ac]/70 rounded-2xl p-6 text-center text-[12.5px] text-[#514532]">
              실제 꿀 이력 데이터를 불러오는 중입니다...
            </div>
          ) : !currentLot ? (
            <div className="bg-white border border-[#d6c4ac]/70 rounded-2xl p-5 text-center space-y-1.5">
              <div className="text-[13.5px] font-bold text-[#0d1e25]">
                등록된 꿀 생산 이력이 없습니다.
              </div>
              <p className="text-[11.5px] text-[#514532]">
                하단 [꿀 이력제] 탭에서 실제 채밀 이력을 등록하면 이곳에 표시됩니다.
              </p>
            </div>
          ) : (
            <>
              {/* LOT 번호 & 제품/밀원 요약 */}
              <div className="bg-white border border-[#d6c4ac]/80 rounded-2xl p-3.5 shadow-xs space-y-2">
                <div className="flex items-center justify-between gap-2 border-b border-[#f0e7d5] pb-2">
                  <div>
                    <span className="text-[10.5px] font-bold text-[#887864] block">LOT 번호</span>
                    <span className="font-mono text-[15px] font-black text-[#7e5700]">
                      {currentLot.lotNumber}
                    </span>
                  </div>
                  <span className="text-[11px] font-black px-2.5 py-1 rounded-lg bg-[#fff9ee] border border-[#ffdeac] text-[#7e5700]">
                    {productMeta.icon} {currentLot.honeyType}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[12px] pt-0.5">
                  <div>
                    <span className="text-[10.5px] text-[#887864] block">제품명</span>
                    <span className="font-extrabold text-[#0d1e25]">{currentLot.productName}</span>
                  </div>
                  <div>
                    <span className="text-[10.5px] text-[#887864] block">밀원</span>
                    <span className="font-extrabold text-[#0d1e25]">{displayNectarSource}</span>
                  </div>
                </div>
              </div>

              {/* 채밀일 / 입고일 / 채밀량 / 대상 벌통 */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-white border border-[#d6c4ac]/70 rounded-2xl p-3.5 shadow-xs flex flex-col justify-between min-h-[86px]">
                  <span className="material-symbols-outlined text-[#514532] text-[19px]">
                    calendar_month
                  </span>
                  <div>
                    <span className="text-[11px] text-[#514532] block mb-0.5">채밀일 / 생산일</span>
                    <span className="text-[15px] font-extrabold text-[#0d1e25]">
                      {displayHarvestDate}
                    </span>
                  </div>
                </div>

                <div className="bg-white border border-[#d6c4ac]/70 rounded-2xl p-3.5 shadow-xs flex flex-col justify-between min-h-[86px]">
                  <span className="material-symbols-outlined text-[#514532] text-[19px]">
                    inventory
                  </span>
                  <div>
                    <span className="text-[11px] text-[#514532] block mb-0.5">입고일</span>
                    <span className="text-[15px] font-extrabold text-[#0d1e25]">
                      {displayInboundDate}
                    </span>
                  </div>
                </div>

                <div className="bg-white border border-[#d6c4ac]/70 rounded-2xl p-3.5 shadow-xs flex flex-col justify-between min-h-[86px]">
                  <span className="material-symbols-outlined text-[#b34700] text-[19px]">
                    scale
                  </span>
                  <div>
                    <span className="text-[11px] text-[#514532] block mb-0.5">채밀량</span>
                    <span className="text-[16px] font-black text-[#b34700]">
                      {displayYield}
                    </span>
                  </div>
                </div>

                <div className="bg-white border border-[#d6c4ac]/70 rounded-2xl p-3.5 shadow-xs flex flex-col justify-between min-h-[86px]">
                  <span className="material-symbols-outlined text-[#7e5700] text-[19px]">
                    hive
                  </span>
                  <div>
                    <span className="text-[11px] text-[#514532] block mb-0.5">대상 벌통</span>
                    <span className="text-[14px] font-extrabold text-[#7e5700]">
                      {displayHiveRange}
                    </span>
                  </div>
                </div>
              </div>

              {/* 공인 검사성적서 상태 및 파일 정보 카드 */}
              <div className="bg-white border border-[#d6c4ac] rounded-2xl p-3.5 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-black text-[#2b1e00] flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[#7e5700] text-[17px]">
                      science
                    </span>
                    <span>공인 검사성적서 등록 상태</span>
                  </span>
                  <span
                    className={`text-[10.5px] font-black px-2 py-0.5 rounded-md ${
                      hasInspectionReport
                        ? 'bg-[#eef8f0] text-[#1e5229] border border-[#bfe0c5]'
                        : 'bg-[#f4f1ea] text-[#78654b]'
                    }`}
                  >
                    {hasInspectionReport ? '등록됨' : '등록된 검사성적서 없음'}
                  </span>
                </div>

                {hasInspectionReport ? (
                  <div className="bg-[#fbf9f4] p-2.5 rounded-xl border border-[#eee4d4] text-[12px] space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-[#887864]">첨부 파일명</span>
                      <span className="text-[10px] font-bold text-[#1e5229]">실제 업로드 파일</span>
                    </div>
                    <div className="font-extrabold text-[#0d1e25] break-all">
                      {reportFileName}
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#fbf9f4] p-2.5 rounded-xl border border-[#eee4d4] text-[11.5px] text-[#78654b]">
                    현재 이 LOT 이력에 등록된 검사성적서 파일이 없습니다. 아래에서 성적서를 등록할 수 있습니다.
                  </div>
                )}
              </div>

              {/* 기존 성적서 업로드/교체/삭제 컴포넌트 재사용 */}
              <HoneyInspectionReportSection
                lotId={currentLot.id}
                uid={user?.uid}
                inspectionReportUrl={currentLot.inspectionReportUrl}
                inspectionReportName={currentLot.inspectionReportName}
                onUpdateInspectionReport={handleUpdateInspectionReport}
              />
            </>
          )}
        </div>

        {/* Interactive Apiary Location & Map Section */}
        <ApiaryMapSection
          address={userProfile.apiaryLocation}
          isDetailed={true}
        />

        {/* 양봉가 프로필 Section */}
        <div className="flex flex-col gap-2 pt-1">
          <div className="flex items-center gap-1.5 px-1">
            <span className="material-symbols-outlined text-[#7e5700] text-[18px]">
              person
            </span>
            <h3 className="font-bold text-[15px] text-[#0d1e25]">생산 농가 정보</h3>
          </div>

          <div className="bg-gradient-to-b from-white to-[#ffdeac]/20 border border-[#d6c4ac]/80 rounded-3xl p-4 shadow-sm flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <img
                src={BEEKEEPER_IMG}
                alt="양봉가 프로필"
                className="w-12 h-12 rounded-2xl object-cover border-2 border-[#7e5700] shadow-2xs"
              />
              <div>
                <h4 className="text-[15px] font-bold text-[#0d1e25]">
                  {currentLot?.farmName || userProfile.farmName || '농업회사법인 허니비테코 주식회사'}
                </h4>
                <p className="text-[12px] text-[#514532]">
                  지리산 천연숙성꿀 전문 ({userProfile.phone})
                </p>
              </div>
            </div>

            <div className="relative pl-3 border-l-2 border-[#ffb300]">
              <p className="text-[13px] text-[#0d1e25] italic leading-relaxed">
                "1년에 한번뜨는 천연숙성꿀을 고집합니다. 실제 양봉일지와 채밀 기록, 등록된 공인 성적서를 투명하게 공개합니다."
              </p>
            </div>

            <div className="flex items-center justify-between bg-[#dff1fb] p-2.5 rounded-xl border border-[#d4e5ef]">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-[#7e5700] text-white flex items-center justify-center font-extrabold text-[12px]">
                  H
                </div>
                <span className="text-[12px] font-bold text-[#0d1e25]">
                  농업회사법인 허니비테코 직영 봉장
                </span>
              </div>
              <span className="text-[11px] font-semibold text-[#514532] truncate max-w-[130px]">
                {userProfile.apiaryLocation}
              </span>
            </div>
          </div>
        </div>

        {/* View Registered Lab Certificate Button */}
        {hasInspectionReport && currentLot?.inspectionReportUrl ? (
          <div className="space-y-2 mt-2">
            <button
              type="button"
              onClick={() => setIsReportPreviewOpen(true)}
              className="w-full h-14 bg-[#7e5700] hover:bg-[#604100] text-white font-bold text-[15px] rounded-2xl shadow-md flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">description</span>
              <span>등록된 공인 검사성적서 보기</span>
              <span className="material-symbols-outlined text-[18px]">visibility</span>
            </button>

            <a
              href={currentLot.inspectionReportUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 bg-white hover:bg-[#fff9ee] text-[#7e5700] border border-[#d6c4ac] font-bold text-[12.5px] rounded-xl flex items-center justify-center gap-1.5 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">open_in_new</span>
              <span>새 탭에서 성적서 원본 파일 열기 ({reportFileName})</span>
            </a>
          </div>
        ) : (
          <div className="w-full p-4 bg-[#fbf9f4] border border-[#e8dec8] rounded-2xl text-center space-y-1 mt-2">
            <div className="text-[13px] font-bold text-[#554632] flex items-center justify-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-[#887864]">info</span>
              <span>등록된 검사성적서 없음</span>
            </div>
            <p className="text-[11.5px] text-[#887864]">
              위 [공인성적서] 영역에서 실제 발급받은 성적서(PDF·JPG·PNG)를 등록하면 바로 열람할 수 있습니다.
            </p>
          </div>
        )}
      </div>

      {/* 실제 등록된 공인 검사성적서 미리보기 모달 */}
      {isReportPreviewOpen && hasInspectionReport && currentLot?.inspectionReportUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          onClick={() => setIsReportPreviewOpen(false)}
        >
          <div
            className="bg-white rounded-3xl p-4 sm:p-5 max-w-2xl w-full shadow-2xl border-2 border-[#7e5700] my-auto max-h-[90vh] flex flex-col gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#e8dec8] pb-3 shrink-0">
              <div className="min-w-0">
                <div className="text-[11px] font-bold text-[#7e5700]">
                  LOT: {currentLot.lotNumber} · 등록된 공인 검사성적서
                </div>
                <h3 className="font-extrabold text-[15px] text-[#0d1e25] truncate">
                  {reportFileName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsReportPreviewOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#514532] hover:bg-[#f3ebe0] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[22px]">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-[#fbf9f4] border border-[#e8dec8] rounded-2xl p-2 flex items-center justify-center min-h-[320px]">
              {isPdfReport ? (
                <iframe
                  src={currentLot.inspectionReportUrl}
                  title={reportFileName}
                  className="w-full h-[65vh] rounded-xl border-0"
                />
              ) : (
                <img
                  src={currentLot.inspectionReportUrl}
                  alt={reportFileName}
                  className="max-w-full max-h-[65vh] object-contain rounded-xl"
                />
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-1 shrink-0">
              <a
                href={currentLot.inspectionReportUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 bg-[#7e5700] hover:bg-[#604100] text-white font-bold rounded-xl text-[12.5px] inline-flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                <span>새 창에서 원본 열기</span>
              </a>
              <button
                type="button"
                onClick={() => setIsReportPreviewOpen(false)}
                className="px-4 py-2.5 bg-white border border-[#d6c4ac] text-[#0d1e25] font-bold rounded-xl text-[12.5px] cursor-pointer"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Beekeeping Glossary Modal */}
      <GlossaryModal
        isOpen={showGlossaryModal}
        onClose={() => setShowGlossaryModal(false)}
        initialTermId={selectedGlossaryTermId}
      />
    </div>
  );
};

