import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { HoneyTracePublicData } from '../types';
import {
  sanitizePublicTraceData,
  PublicTraceLookupResult
} from '../services/honeyTracePublicService';
import { getPublicHoneyTraceById } from '../services/publicHoneyTraceService';
import {
  HONEYBEE_OFFICIAL_BRAND_INFO,
  OFFICIAL_PRODUCT_CATALOG
} from '../services/consumerBrandCatalog';
import { ApiaryMapSection } from './ApiaryMapSection';
import { ConsumerHoneyTraceView } from './ConsumerHoneyTraceView';

interface ConsumerViewProps {
  onBackToHome?: () => void;
  onOpenCertificateModal: () => void;
}

interface PublishedTraceSummaryItem {
  publicTraceId: string;
  publishedAt?: string;
  updatedAt?: string;
  data: HoneyTracePublicData;
}

export const ConsumerView: React.FC<ConsumerViewProps> = ({
  onBackToHome,
}) => {
  const [activeTab, setActiveTab] = useState<'product' | 'story' | 'trace' | 'qr'>('product');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [lookupResult, setLookupResult] = useState<
    (PublicTraceLookupResult & { publicTraceId?: string }) | null
  >(null);

  const [publishedTraces, setPublishedTraces] = useState<PublishedTraceSummaryItem[]>([]);
  const [isLoadingPublishedList, setIsLoadingPublishedList] = useState<boolean>(true);
  const [selectedTraceIdFromList, setSelectedTraceIdFromList] = useState<string>('');

  const brandInfo = HONEYBEE_OFFICIAL_BRAND_INFO;
  const mainHoneyCatalog = OFFICIAL_PRODUCT_CATALOG.filter((item) =>
    ['acacia', 'chestnut', 'wildflower'].includes(item.catalogKey)
  );

  // 공개 게시된 꿀 이력 목록 로드 (비로그인 소비자 읽기 허용된 publicHoneyTraces 컬렉션만 사용)
  const loadPublishedTraces = useCallback(async () => {
    setIsLoadingPublishedList(true);
    try {
      const colRef = collection(db, 'publicHoneyTraces');
      const snapshot = await getDocs(colRef);
      const items: PublishedTraceSummaryItem[] = [];

      snapshot.forEach((docSnap) => {
        const raw = docSnap.data();
        if (raw && raw.isPublished !== false) {
          const sanitized = sanitizePublicTraceData(raw);
          items.push({
            publicTraceId:
              typeof raw.publicTraceId === 'string' && raw.publicTraceId.trim()
                ? raw.publicTraceId.trim()
                : docSnap.id,
            publishedAt: typeof raw.publishedAt === 'string' ? raw.publishedAt : undefined,
            updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : undefined,
            data: sanitized,
          });
        }
      });

      // 최신 채밀일 또는 최신 게시일 순으로 정렬
      items.sort((a, b) => {
        const dateA = a.data.productionEndDate || a.publishedAt || '';
        const dateB = b.data.productionEndDate || b.publishedAt || '';
        return dateB.localeCompare(dateA);
      });

      setPublishedTraces(items);
      if (items.length > 0) {
        setSelectedTraceIdFromList((prev) => prev || items[0].publicTraceId);
      }
    } catch (err) {
      console.warn('Failed to load published honey traces:', err);
    } finally {
      setIsLoadingPublishedList(false);
    }
  }, []);

  useEffect(() => {
    loadPublishedTraces();
  }, [loadPublishedTraces]);

  // publicTraceId, /trace/:id URL, 또는 LOT 번호로 실제 공개 이력 조회
  const handleLookupTrace = async (rawInput?: string) => {
    const targetInput = (rawInput !== undefined ? rawInput : searchQuery).trim();
    if (!targetInput) {
      setLookupResult(null);
      return;
    }

    setIsSearching(true);
    try {
      // 1. /trace/tr_xxx 형태 URL이 입력된 경우 publicTraceId 추출
      let extractedId = targetInput;
      const tracePathMatch = targetInput.match(/\/trace\/([^/?#\s]+)/i);
      if (tracePathMatch && tracePathMatch[1]) {
        extractedId = decodeURIComponent(tracePathMatch[1].trim());
      }

      // 2. 기존 공개 이력 조회 API (getPublicHoneyTraceById) 우선 호출
      const directRes = await getPublicHoneyTraceById(extractedId);
      if (directRes.status === 'found') {
        setLookupResult({
          status: 'found',
          data: directRes.data,
          publicTraceId: extractedId,
        });
        setIsSearching(false);
        return;
      }

      if (directRes.status === 'not_ready') {
        setLookupResult({ status: 'not_ready', publicTraceId: extractedId });
        setIsSearching(false);
        return;
      }

      // 3. 입력값이 LOT 번호인 경우 publicHoneyTraces 컬렉션에서 lotNumber 일치 문서 조회
      const colRef = collection(db, 'publicHoneyTraces');
      const lotQuery = query(colRef, where('lotNumber', '==', extractedId), limit(5));
      const querySnap = await getDocs(lotQuery);

      for (const docSnap of querySnap.docs) {
        const raw = docSnap.data();
        if (raw && raw.isPublished !== false) {
          const resolvedId =
            typeof raw.publicTraceId === 'string' && raw.publicTraceId.trim()
              ? raw.publicTraceId.trim()
              : docSnap.id;

          const apiRes = await getPublicHoneyTraceById(resolvedId);
          if (apiRes.status === 'found') {
            setLookupResult({
              status: 'found',
              data: apiRes.data,
              publicTraceId: resolvedId,
            });
            setIsSearching(false);
            return;
          }

          setLookupResult({
            status: 'found',
            data: sanitizePublicTraceData(raw),
            publicTraceId: resolvedId,
          });
          setIsSearching(false);
          return;
        }
      }

      // 4. 대소문자 구분 없이 이미 로드된 공개 목록에서 LOT 번호 또는 publicTraceId 매칭 확인
      const normalized = extractedId.toLowerCase();
      const matchedFromList = publishedTraces.find(
        (item) =>
          item.publicTraceId.toLowerCase() === normalized ||
          (item.data.lotNumber && item.data.lotNumber.toLowerCase() === normalized)
      );

      if (matchedFromList) {
        setLookupResult({
          status: 'found',
          data: matchedFromList.data,
          publicTraceId: matchedFromList.publicTraceId,
        });
        setIsSearching(false);
        return;
      }

      setLookupResult({ status: 'not_found' });
    } catch (err) {
      console.warn('Error during consumer trace lookup:', err);
      setLookupResult({ status: 'not_found' });
    } finally {
      setIsSearching(false);
    }
  };

  const handleOpenUnifiedQrPage = (traceId: string) => {
    const cleanId = (traceId || '').trim();
    if (!cleanId) return;
    if (typeof window !== 'undefined') {
      window.history.pushState({ publicTraceId: cleanId }, '', `/trace/${encodeURIComponent(cleanId)}`);
      window.dispatchEvent(new PopStateEvent('popstate'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSelectPublishedItem = (item: PublishedTraceSummaryItem) => {
    const identifier = item.data.lotNumber || item.publicTraceId;
    setSearchQuery(identifier);
    setSelectedTraceIdFromList(item.publicTraceId);
    setLookupResult({
      status: 'found',
      data: item.data,
      publicTraceId: item.publicTraceId,
    });
    setActiveTab('qr');
  };

  const activePublishedItem =
    publishedTraces.find((item) => item.publicTraceId === selectedTraceIdFromList) ||
    publishedTraces[0] ||
    null;

  return (
    <div className="min-h-screen bg-[#f4faff] text-[#0d1e25] flex flex-col font-['Noto_Sans_KR',_'Inter',sans-serif]">
      {/* Top Consumer Header */}
      <header className="sticky top-0 z-30 bg-[#f4faff]/95 backdrop-blur-md border-b border-[#d4e5ef]/70">
        <div className="max-w-xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white border border-[#d6c4ac]/60 p-0.5 flex items-center justify-center shadow-xs">
              <img
                src="/honeybee_teco_logo.svg"
                alt="농업회사법인 허니비테코 주식회사 로고"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <span className="text-[9px] font-extrabold text-[#7e5700] uppercase tracking-wider block">
                소비자 브랜드 & 안심 꿀 이력제
              </span>
              <span className="text-[14px] font-black text-[#0d1e25] tracking-tight">
                농업회사법인 허니비테코
              </span>
            </div>
          </div>
        </div>

        {/* Consumer Sub-navigation Tabs */}
        <div className="max-w-xl mx-auto px-3 flex border-t border-[#d4e5ef]/40 bg-white/60 overflow-x-auto no-scrollbar text-[12px] font-extrabold">
          <button
            onClick={() => setActiveTab('product')}
            className={`flex-1 py-2.5 text-center whitespace-nowrap cursor-pointer transition-colors border-b-2 ${
              activeTab === 'product'
                ? 'border-[#7e5700] text-[#7e5700]'
                : 'border-transparent text-[#514532] hover:text-[#0d1e25]'
            }`}
          >
            꿀 & 제품 소개
          </button>
          <button
            onClick={() => setActiveTab('story')}
            className={`flex-1 py-2.5 text-center whitespace-nowrap cursor-pointer transition-colors border-b-2 ${
              activeTab === 'story'
                ? 'border-[#7e5700] text-[#7e5700]'
                : 'border-transparent text-[#514532] hover:text-[#0d1e25]'
            }`}
          >
            봉장 소개 & 위치
          </button>
          <button
            onClick={() => setActiveTab('trace')}
            className={`flex-1 py-2.5 text-center whitespace-nowrap cursor-pointer transition-colors border-b-2 ${
              activeTab === 'trace'
                ? 'border-[#7e5700] text-[#7e5700]'
                : 'border-transparent text-[#514532] hover:text-[#0d1e25]'
            }`}
          >
            공개 꿀 이력
          </button>
          <button
            onClick={() => setActiveTab('qr')}
            className={`flex-1 py-2.5 text-center whitespace-nowrap cursor-pointer transition-colors border-b-2 ${
              activeTab === 'qr'
                ? 'border-[#7e5700] text-[#7e5700]'
                : 'border-transparent text-[#514532] hover:text-[#0d1e25]'
            }`}
          >
            QR · 이력번호 조회
          </button>
        </div>
      </header>

      {/* Main Consumer Body */}
      <main className="flex-1 max-w-xl w-full mx-auto px-4 pt-4 pb-20 space-y-4">
        {/* Section 1: 꿀 & 제품 소개 (공통 브랜드·제품 카탈로그 + 실제 공개 이력 연결) */}
        {activeTab === 'product' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Brand Hero Banner */}
            <div className="bg-white border border-[#d6c4ac] rounded-3xl p-5 shadow-xs space-y-3.5">
              <div className="text-[11px] font-bold text-[#7e5700]">
                <span>천연 완숙꿀</span>
                <span aria-hidden="true"> · </span>
                <span>양봉일지 기반 생산이력 공개</span>
              </div>

              <div>
                <h1 className="text-[21px] font-black text-[#0d1e25] leading-tight">
                  허니비테코 천연 벌꿀
                </h1>
                <p className="text-[13px] text-[#514532] leading-relaxed mt-1 break-keep">
                  농축기로 인위적인 열을 가하지 않고, 꿀벌들이 날갯짓으로 수분을 증발시켜 숙성한 천연 벌꿀의 실제 채밀·생산 이력을 투명하게 공개합니다.
                </p>
              </div>

              {/* 공통 브랜드·제품 대표 이미지 (특정 품목 단독 사진이 아닌 허니비테코 공통 브랜드·제품 이미지) */}
              <div className="relative w-full rounded-2xl overflow-hidden aspect-[4/3] shadow-sm border border-[#e5d9c3] bg-[#fbf9f4]">
                <img
                  src={brandInfo.commonProductPhotoUrl}
                  alt={brandInfo.commonProductPhotoCaption}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain object-center"
                />
                <div className="absolute bottom-2.5 left-2.5 right-2.5 bg-black/65 backdrop-blur-xs text-white px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center justify-between gap-2">
                  <span className="truncate">{brandInfo.commonProductPhotoCaption}</span>
                  <span className="text-[10px] text-[#ffdeac] shrink-0">
                    {brandInfo.commonProductPhotoScopeLabel}
                  </span>
                </div>
              </div>

              {/* Core Trust Highlights */}
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[#d4e5ef]/70 text-center">
                <div className="bg-[#fbf9f4] border border-[#e8dec8] rounded-2xl p-2.5">
                  <span className="text-[10px] text-[#7e5700] font-bold block">생산 기록</span>
                  <span className="text-[13.5px] font-black text-[#0d1e25]">실제 일지 연동</span>
                  <span className="text-[9.5px] text-[#514532] block">채밀·내검 기록 기반</span>
                </div>
                <div className="bg-[#fffbf4] border border-[#ffdeac] rounded-2xl p-2.5">
                  <span className="text-[10px] text-[#7e5700] font-bold block">LOT별 관리</span>
                  <span className="text-[13.5px] font-black text-[#7e5700]">개별 QR 이력</span>
                  <span className="text-[9.5px] text-[#514532] block">채밀일·밀원 투명 공개</span>
                </div>
                <div className="bg-[#f4fbf5] border border-[#c8e6c9] rounded-2xl p-2.5">
                  <span className="text-[10px] text-[#1b6d24] font-bold block">품질 확인</span>
                  <span className="text-[13.5px] font-black text-[#1b6d24]">성적서 연동</span>
                  <span className="text-[9.5px] text-[#514532] block">LOT별 등록 성적서 확인</span>
                </div>
              </div>
            </div>

            {/* 제품 종류별 안내 (아카시아꿀, 밤꿀, 야생화꿀 - 실제 제품 사진 연결 상태 표시) */}
            <div className="bg-white border border-[#d6c4ac] rounded-3xl p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-extrabold text-[15px] text-[#0d1e25]">
                  허니비테코 주요 제품 안내 (공통 카탈로그)
                </h2>
                <span className="text-[11px] font-bold text-[#7e5700]">
                  품목별 개별 관리
                </span>
              </div>

              <div className="space-y-2.5">
                {mainHoneyCatalog.map((prod) => (
                  <div
                    key={prod.catalogKey}
                    className="p-3.5 rounded-2xl bg-[#fbf9f4] border border-[#e8dec8] space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-[11px] font-bold text-[#7e5700]">
                          {prod.honeyTypeLabel}
                        </div>
                        <h3 className="text-[14.5px] font-black text-[#2b1e00]">
                          {prod.officialName}
                        </h3>
                      </div>
                      <span className="text-[10.5px] font-semibold text-[#887864]">
                        {prod.verifiedProductImageUrl
                          ? '실제 제품 사진 등록됨'
                          : '실제 제품 사진 미등록'}
                      </span>
                    </div>

                    {prod.verifiedProductImageUrl ? (
                      <div className="aspect-[4/3] w-full rounded-xl overflow-hidden bg-white border border-[#e8dec8]">
                        <img
                          src={prod.verifiedProductImageUrl}
                          alt={`${prod.officialName} 실제 제품 사진`}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="px-3 py-2 rounded-xl bg-white border border-[#eee4d4] text-[11px] text-[#685438] flex items-center justify-between gap-2 flex-wrap">
                        <span>해당 품목 전용 실제 제품 사진 미등록 (타 제품 사진 대체 안 함)</span>
                        <span className="font-mono text-[10px] text-[#887864]">
                          {prod.recommendedAssetPath}
                        </span>
                      </div>
                    )}

                    <p className="text-[12px] text-[#3d2e18] leading-relaxed break-keep">
                      {prod.officialDescription}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* 실제 공개된 꿀 이력 바로가기 카드 (QR 통합 페이지 또는 상세 보기 연결) */}
            <div className="bg-white border border-[#d6c4ac] rounded-3xl p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-[15px] text-[#0d1e25]">
                  현재 공개된 실제 꿀 생산 이력 (LOT)
                </h3>
                <span className="text-[11px] font-bold text-[#7e5700] tabular-nums">
                  {isLoadingPublishedList ? '불러오는 중...' : `${publishedTraces.length}건 공개중`}
                </span>
              </div>

              {isLoadingPublishedList ? (
                <div className="p-4 rounded-2xl bg-[#fbf9f4] border border-[#e8dec8] text-center text-[12px] text-[#514532]">
                  실제 등록된 공개 꿀 이력을 확인하고 있습니다...
                </div>
              ) : publishedTraces.length > 0 ? (
                <div className="space-y-2">
                  {publishedTraces.map((item) => (
                    <div
                      key={item.publicTraceId}
                      className="p-3.5 bg-[#fbf9f4] border border-[#e8dec8] rounded-2xl flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-[#7e5700] font-bold">
                          <span>{item.data.honeyType || '천연벌꿀'}</span>
                          {item.data.lotNumber && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono text-[#514532] tabular-nums">
                                LOT: {item.data.lotNumber}
                              </span>
                            </>
                          )}
                        </div>
                        <h4 className="text-[14px] font-black text-[#0d1e25] mt-0.5 truncate">
                          {item.data.productName}
                        </h4>
                        <p className="text-[11px] text-[#514532] mt-0.5 tabular-nums">
                          채밀·생산일: {item.data.productionEndDate || item.data.productionStartDate || '미기재'}
                          {item.data.harvestSummary ? ` · ${item.data.harvestSummary}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenUnifiedQrPage(item.publicTraceId)}
                          className="px-3 py-2 rounded-xl bg-[#7e5700] text-white text-[11px] font-extrabold hover:bg-[#684700] transition-colors cursor-pointer whitespace-nowrap"
                        >
                          통합 이력 페이지 열기
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-[#fffbf4] border border-[#ffdeac] text-[12px] text-[#514532]">
                  현재 공개 게시된 꿀 이력이 없거나, QR · 이력번호 조회 탭에서 직접 이력번호를 입력해 조회할 수 있습니다.
                </div>
              )}
            </div>

            {/* Quick CTAs */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setActiveTab('story')}
                className="py-3 px-3 rounded-2xl bg-white border border-[#7e5700] text-[#7e5700] font-extrabold text-[12px] flex items-center justify-center gap-1 hover:bg-[#fff9ef] transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[17px]">location_on</span>
                <span>봉장 소개 및 위치 보기</span>
              </button>

              <button
                onClick={() => setActiveTab('qr')}
                className="py-3 px-3 rounded-2xl bg-[#7e5700] text-white font-extrabold text-[12px] flex items-center justify-center gap-1 hover:bg-[#684700] transition-all cursor-pointer shadow-xs"
              >
                <span className="material-symbols-outlined text-[17px]">qr_code_scanner</span>
                <span>QR · 이력번호 조회</span>
              </button>
            </div>
          </div>
        )}

        {/* Section 2: 봉장 소개 & 위치 (Story + 공개 승인된 봉장 위치/지도) */}
        {activeTab === 'story' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="bg-white border border-[#d6c4ac] rounded-3xl p-5 shadow-xs space-y-3.5">
              <div className="text-[11px] font-extrabold text-[#1b6d24]">
                생산 농가 철학 · {brandInfo.companyName}
              </div>
              <h2 className="text-[19px] font-black text-[#0d1e25]">
                "{brandInfo.slogan}"
              </h2>

              <p className="text-[13px] text-[#514532] leading-relaxed break-keep">
                {brandInfo.brandStory}
              </p>

              {/* 실제 봉장 현장 사진 */}
              <div className="rounded-2xl overflow-hidden border border-[#e8dec8] bg-[#fbf9f4]">
                <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#d9ebf5]">
                  <img
                    src={brandInfo.apiaryFieldPhotoUrl}
                    alt={brandInfo.apiaryFieldPhotoCaption}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover object-center"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent" />
                  <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between gap-2 text-white text-[11px]">
                    <span className="font-bold truncate">{brandInfo.apiaryFieldPhotoCaption}</span>
                    <span className="text-[10px] bg-black/55 px-2 py-0.5 rounded-md font-semibold shrink-0">
                      {brandInfo.apiaryFieldPhotoScopeLabel}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-[#f4fbf5] border border-[#c8e6c9] rounded-2xl p-3.5 space-y-2 text-[12px]">
                {brandInfo.corePrinciples.map((p, idx) => (
                  <div
                    key={idx}
                    className={idx > 0 ? 'pt-2 border-t border-[#c8e6c9]/50' : ''}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-[#1b6d24] font-black">{idx + 1}.</span>
                      <p className="text-[#0d1e25] font-bold">{p.title}</p>
                    </div>
                    <p className="text-[11px] text-[#514532] pl-4 mt-0.5 break-keep">
                      {p.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* 공개 승인된 봉장 위치 및 지도 */}
            {brandInfo.approvedApiaryLocation.isPubliclyApproved && (
              <ApiaryMapSection
                address={brandInfo.approvedApiaryLocation.approvedAddress}
                isDetailed={true}
              />
            )}

            {/* Floral Sources Guide */}
            <div className="bg-white border border-[#d6c4ac] rounded-3xl p-5 shadow-xs space-y-3">
              <div className="text-[11px] font-extrabold text-[#7e5700]">
                계절별 주요 밀원 안내
              </div>
              <h3 className="text-[17px] font-black text-[#0d1e25]">
                자연 개화 시기에 맞춘 천연 밀원 채집
              </h3>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                {brandInfo.approvedApiaryLocation.seasonalNectarSources.map((s, idx) => (
                  <div key={idx} className="bg-[#fff9ef] border border-[#ffdeac] rounded-xl p-2.5">
                    <span className="font-extrabold text-[#7e5700] block text-[13px]">
                      {s.season}
                    </span>
                    <span className="text-[#514532]">{s.sources}</span>
                  </div>
                ))}
              </div>

              <p className="text-[12px] text-[#514532] leading-relaxed">
                제품별 실제 채밀 밀원과 생산 일자는 각 제품의 공개 꿀 이력 상세 화면에서 정확하게 확인하실 수 있습니다.
              </p>
            </div>
          </div>
        )}

        {/* Section 3: 공개 꿀 이력 (실제 공개 이력 연동, 통합 뷰 인라인 표시) */}
        {activeTab === 'trace' && (
          <div className="space-y-4 animate-fadeIn">
            {isLoadingPublishedList ? (
              <div className="bg-white border border-[#d6c4ac] rounded-3xl p-6 shadow-xs text-center space-y-3">
                <div className="w-8 h-8 border-3 border-[#7e5700] border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-[13px] font-bold text-[#0d1e25]">
                  실제 공개된 꿀 생산 이력을 불러오고 있습니다...
                </p>
              </div>
            ) : activePublishedItem ? (
              <div className="space-y-3">
                <div className="bg-white border border-[#d6c4ac] rounded-2xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-[12px] font-extrabold text-[#2b1e00]">
                      공개된 실제 꿀 이력 선택 ({publishedTraces.length}건)
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOpenUnifiedQrPage(activePublishedItem.publicTraceId)}
                      className="text-[11.5px] font-extrabold text-[#7e5700] hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                    >
                      <span>QR 전용 주소(/trace/{activePublishedItem.publicTraceId})로 열기</span>
                      <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                    </button>
                  </div>

                  {publishedTraces.length > 1 && (
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
                      {publishedTraces.map((item) => {
                        const isSelected =
                          item.publicTraceId === activePublishedItem.publicTraceId;
                        return (
                          <button
                            key={item.publicTraceId}
                            type="button"
                            onClick={() => setSelectedTraceIdFromList(item.publicTraceId)}
                            className={`px-3 py-1.5 rounded-xl text-[11.5px] font-bold shrink-0 cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-[#7e5700] text-white'
                                : 'bg-[#fbf9f4] border border-[#e8dec8] text-[#554632] hover:bg-[#f3ebe0]'
                            }`}
                          >
                            {item.data.lotNumber || item.data.productName}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <ConsumerHoneyTraceView
                  data={activePublishedItem.data}
                  variant="embedded"
                  onNavigateToBrandHome={() => setActiveTab('product')}
                />
              </div>
            ) : (
              <div className="bg-white border border-[#d6c4ac] rounded-3xl p-6 shadow-xs text-center space-y-3">
                <p className="text-[15px] font-black text-[#0d1e25]">
                  현재 선택된 공개 생산 이력이 없습니다.
                </p>
                <p className="text-[12px] text-[#514532]">
                  QR · 이력번호 조회 탭에서 제품의 공개 이력 ID 또는 LOT 번호를 입력하여 실제 데이터를 조회해 주세요.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('qr')}
                  className="px-4 py-2.5 rounded-2xl bg-[#7e5700] text-white text-[12px] font-extrabold hover:bg-[#684700] transition-all cursor-pointer"
                >
                  QR · 이력번호 조회하러 가기
                </button>
              </div>
            )}
          </div>
        )}

        {/* Section 4: QR 및 로트번호 조회 (실제 공개 이력 조회 연결) */}
        {activeTab === 'qr' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Search Input Box */}
            <div className="bg-white border border-[#d6c4ac] rounded-3xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[16px] font-black text-[#0d1e25] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[#7e5700] text-[20px]">qr_code_scanner</span>
                  <span>꿀병 라벨 QR 및 이력번호 조회</span>
                </h3>
                <span className="text-[11px] text-[#7e5700] font-bold">실제 공개 이력 조회</span>
              </div>

              <p className="text-[12px] text-[#514532]">
                구매하신 꿀병 라벨에 인쇄된 QR을 스캔하거나 공개 이력 ID(예: tr_...) 또는 LOT 번호를 입력하면 허니비테코 브랜드·제품 소개와 실제 생산 이력을 한 화면에서 확인할 수 있습니다.
              </p>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleLookupTrace();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="공개 이력 ID(tr_...) 또는 LOT 번호 입력"
                  className="flex-1 px-3.5 py-2.5 bg-[#f4faff] border border-[#d4e5ef] rounded-2xl text-[13px] font-bold text-[#0d1e25] focus:outline-none focus:ring-2 focus:ring-[#7e5700]"
                />
                <button
                  type="submit"
                  disabled={isSearching || !searchQuery.trim()}
                  className="px-4 py-2.5 bg-[#7e5700] disabled:bg-[#7e5700]/50 text-white rounded-2xl text-[13px] font-extrabold hover:bg-[#684700] transition-all cursor-pointer shrink-0"
                >
                  {isSearching ? '조회 중...' : '조회'}
                </button>
              </form>

              {/* 현재 공개 게시된 실제 이력 빠른 선택 버튼 */}
              {publishedTraces.length > 0 && (
                <div className="pt-2 border-t border-[#d4e5ef]/60 space-y-1.5">
                  <span className="text-[11px] font-bold text-[#514532] block">
                    현재 공개된 실제 꿀 이력 바로 선택:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {publishedTraces.map((item) => (
                      <button
                        key={item.publicTraceId}
                        type="button"
                        onClick={() => handleSelectPublishedItem(item)}
                        className="px-3 py-1.5 rounded-xl bg-[#fbf9f4] border border-[#e8dec8] text-[#7e5700] text-[11px] font-extrabold hover:bg-[#fff3d6] transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <span>🍯 {item.data.productName}</span>
                        {item.data.lotNumber && (
                          <span className="text-[10px] font-mono text-[#514532] tabular-nums">
                            ({item.data.lotNumber})
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 조회 중 상태 */}
            {isSearching && (
              <div className="bg-white border border-[#d6c4ac] rounded-3xl p-6 shadow-xs text-center space-y-3">
                <div className="w-8 h-8 border-3 border-[#7e5700] border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-[13px] font-bold text-[#0d1e25]">
                  공개된 꿀 이력 정보를 확인하고 있습니다...
                </p>
              </div>
            )}

            {/* 조회 전 안내 상태 */}
            {!isSearching && !lookupResult && (
              <div className="bg-white border border-[#d6c4ac] rounded-3xl p-6 shadow-xs text-center space-y-2">
                <span className="material-symbols-outlined text-[28px] text-[#7e5700]">
                  manage_search
                </span>
                <h4 className="text-[14px] font-black text-[#0d1e25]">
                  조회할 꿀 이력 번호를 입력하거나 위 목록에서 선택해 주세요
                </h4>
                <p className="text-[12px] text-[#514532]">
                  2024년 예시 데이터나 테스트용 LOT가 아닌, 실제 농가에서 게시한 공개 꿀 이력 데이터만 조회됩니다.
                </p>
              </div>
            )}

            {/* 일시적 연결/네트워크 오류 (error) */}
            {!isSearching && lookupResult && lookupResult.status === 'error' && (
              <div className="bg-white border border-[#f0d8a8] rounded-3xl p-6 shadow-xs text-center space-y-2">
                <span className="material-symbols-outlined text-[28px] text-[#b45309]">
                  sync_problem
                </span>
                <h4 className="text-[15px] font-black text-[#0d1e25]">
                  일시적인 접속 연결 오류가 발생했습니다.
                </h4>
                <p className="text-[12px] text-[#514532]">
                  {lookupResult.errorMessage ||
                    '네트워크 연결 상태를 확인하고 잠시 후 다시 검색해주세요.'}
                </p>
              </div>
            )}

            {/* 조회 결과 없음 (not_found / not_ready) */}
            {!isSearching &&
              lookupResult &&
              (lookupResult.status === 'not_found' || lookupResult.status === 'not_ready') && (
                <div className="bg-white border border-[#f5c6c4] rounded-3xl p-6 shadow-xs text-center space-y-2">
                  <span className="material-symbols-outlined text-[28px] text-[#a12b2b]">
                    search_off
                  </span>
                  <h4 className="text-[15px] font-black text-[#0d1e25]">
                    {lookupResult.status === 'not_ready'
                      ? '아직 소비자 공개용 이력이 준비되지 않았습니다.'
                      : '일치하는 공개 꿀 이력을 찾을 수 없습니다.'}
                  </h4>
                  <p className="text-[12px] text-[#514532]">
                    입력하신 공개 이력 ID 또는 LOT 번호를 다시 확인하시거나, 현재 공개 해제된 이력일 수 있습니다.
                  </p>
                </div>
              )}

            {/* 실제 조회 결과 표시: 통합된 ConsumerHoneyTraceView (embedded) */}
            {!isSearching && lookupResult?.status === 'found' && (
              <div className="space-y-3 animate-scaleUp">
                {lookupResult.publicTraceId && (
                  <div className="bg-white border border-[#e5d9c3] rounded-2xl px-4 py-2.5 flex items-center justify-between text-[11.5px]">
                    <span className="font-bold text-[#514532]">
                      QR 공개 주소: <b className="font-mono text-[#7e5700]">/trace/{lookupResult.publicTraceId}</b>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOpenUnifiedQrPage(lookupResult.publicTraceId!)}
                      className="font-extrabold text-[#7e5700] hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <span>전용 QR 페이지로 열기</span>
                      <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                    </button>
                  </div>
                )}

                <ConsumerHoneyTraceView
                  data={lookupResult.data}
                  variant="embedded"
                  onNavigateToBrandHome={() => setActiveTab('product')}
                />
              </div>
            )}
          </div>
        )}

        {/* Consumer Trust & Contact Box */}
        <div className="bg-white border border-[#d6c4ac] rounded-3xl p-4 shadow-xs text-center space-y-1 text-[11px] text-[#514532]">
          <p className="font-extrabold text-[#0d1e25]">
            농가 직거래 및 제품 구매 문의
          </p>
          <p>
            전화: <b>{brandInfo.contactPhone}</b> · {brandInfo.companyName}
          </p>
          <p className="text-[10px] text-[#514532]/70 pt-1">
            {brandInfo.companyName}는 실제 기록된 양봉 데이터를 바탕으로 투명한 생산 이력을 제공합니다.
          </p>
        </div>
      </main>
    </div>
  );
};
