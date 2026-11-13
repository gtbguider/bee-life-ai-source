import React, { useState } from 'react';
import { HoneyTracePublicData, PublicJournalEvidenceItem } from '../types';
import { getProductTypeDisplay } from '../services/honeyLotService';
import {
  HONEYBEE_OFFICIAL_BRAND_INFO,
  resolveCatalogProductForTrace
} from '../services/consumerBrandCatalog';
import { ApiaryMapSection } from './ApiaryMapSection';

export interface ConsumerHoneyTraceViewProps {
  data: HoneyTracePublicData;
  onClose?: () => void;
  /**
   * 'page' : /trace/:publicTraceId 전용 통합 소비자 페이지 (전체 화면 스크롤)
   * 'modal': 양봉인의 소비자 공개 화면 미리보기 모달
   * 'embedded': /consumer 화면 내부에 인라인으로 삽입될 때
   */
  variant?: 'page' | 'modal' | 'embedded';
  /** 통합 페이지에서 허니비테코 일반 브랜드 소개 화면(/consumer)으로 이동할 때 호출 */
  onNavigateToBrandHome?: () => void;
}

/**
 * 날짜 문자열(YYYY-MM-DD 또는 ISO)을 YYYY.MM.DD 형태로 변환합니다.
 * 값이 비어있으면 빈 문자열을 반환하며 임의로 현재 날짜를 넣지 않습니다.
 */
export function formatPublicDate(dateStr?: string): string {
  if (!dateStr || !dateStr.trim()) return '';
  const trimmed = dateStr.trim();
  const datePart = trimmed.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    return datePart.replace(/-/g, '.');
  }
  return trimmed.replace(/-/g, '.');
}

/**
 * 허니비테코 통합 소비자 브랜드 & QR 꿀 이력 조회 화면
 *
 * [구성 순서]:
 * ① 제품 및 브랜드 소개 (실제 제품 사진 연결 또는 미등록 안내, 제품명, 꿀 종류, 브랜드 소개, 제품 특징, 이력 확인 안내)
 * ② 허니비테코 및 봉장 소개 (농업회사법인 허니비테코 소개, 실제 보유 봉장 사진, 공개 승인된 봉장 위치/지도)
 * ③ 해당 제품의 꿀 이력 (꿀 종류 및 밀원, 생산 기간, 채밀 날짜 및 작업 정보, 총 채밀량, LOT 번호, 이력 확인일)
 * ④ 소비자 신뢰 정보 (4대 확인 카드, 근거 양봉일지, 검사성적서 정보)
 *
 * [보안 및 무추정 원칙]:
 * - 오직 정제된 HoneyTracePublicData만을 LOT 이력 데이터로 렌더링합니다.
 * - 공통 브랜드/제품 자산(HONEYBEE_OFFICIAL_BRAND_INFO, OFFICIAL_PRODUCT_CATALOG)과 LOT별 이력 데이터를 분리합니다.
 * - 내부 벌통 번호(hiveId, hiveIds, hiveRange), 일지 원문(originalText), 음성(audioUrl, audioPath),
 *   내검 상세, 내부 메모(notes), Firestore 문서 ID(id, journalId), UID, Storage 경로 등 농가 내부 정보는 절대 표시하지 않습니다.
 * - AI가 없는 사실을 만들어내지 않으며, 데이터가 없으면 "미등록", "정보 미기재", "근거 기록 없음" 등으로 정직하게 표시합니다.
 */
export const ConsumerHoneyTraceView: React.FC<ConsumerHoneyTraceViewProps> = ({
  data,
  onClose,
  variant = 'modal',
  onNavigateToBrandHome
}) => {
  const [selectedEvidenceJournal, setSelectedEvidenceJournal] =
    useState<PublicJournalEvidenceItem | null>(null);
  const [productImageLoadError, setProductImageLoadError] = useState<boolean>(false);

  const productMeta = getProductTypeDisplay(data.productType);
  const catalogProduct = resolveCatalogProductForTrace(data);
  const brandInfo = HONEYBEE_OFFICIAL_BRAND_INFO;

  // 실제 판매 제품 사진 등록 여부 확인:
  // 1순위: 양봉인이 직접 등록한 대표 사진 (data.productImageUrl)
  // 2순위: 카탈로그의 공식 검증 제품 사진 (catalogProduct.verifiedProductImageUrl)
  const uploadedProductImageUrl =
    data.productImageUrl && data.productImageUrl.trim() ? data.productImageUrl.trim() : null;
  const verifiedPhotoUrl =
    uploadedProductImageUrl ||
    (catalogProduct.verifiedProductImageUrl && !productImageLoadError
      ? catalogProduct.verifiedProductImageUrl
      : null);
  const hasVerifiedProductPhoto = Boolean(verifiedPhotoUrl && !productImageLoadError);
  const isCustomUploadedPhoto = Boolean(uploadedProductImageUrl);

  // 무추정 원칙: 밀원 표시
  const displayNectarSource =
    data.nectarSource && data.nectarSource.trim() ? data.nectarSource.trim() : '밀원 미기재';

  // 생산 기간 표시
  const startFormatted = formatPublicDate(data.productionStartDate);
  const endFormatted = formatPublicDate(data.productionEndDate);
  const displayProductionPeriod =
    startFormatted && endFormatted
      ? startFormatted === endFormatted
        ? startFormatted
        : `${startFormatted} ~ ${endFormatted}`
      : startFormatted || endFormatted || '생산 기간 미기재';

  // 총 생산/채밀량 표시
  const displayTotalYield =
    data.totalYieldKg !== undefined && data.totalYieldKg !== null && !isNaN(data.totalYieldKg)
      ? `${data.totalYieldKg}kg`
      : data.productType === 'royalJelly'
      ? '생산량 정보 미기재'
      : '채밀량 정보 미기재';

  // 채밀/채취 작업 회차 계산 (실제 데이터 기반)
  const harvestOpCount =
    data.harvestOperationCount !== undefined &&
    data.harvestOperationCount !== null &&
    data.harvestOperationCount > 0
      ? data.harvestOperationCount
      : Array.isArray(data.harvestRecords) && data.harvestRecords.length > 0
      ? data.harvestRecords.length
      : 0;

  const displayHarvestOps =
    harvestOpCount > 0
      ? data.productType === 'royalJelly'
        ? `총 ${harvestOpCount}회 채취/생산`
        : `총 ${harvestOpCount}회 채밀`
      : data.productType === 'royalJelly'
      ? '채취 회차 정보 미기재'
      : '채밀 회차 정보 미기재';

  // 양봉일지 근거 건수 및 여부 (실제 데이터 기반)
  const evidenceJournals: PublicJournalEvidenceItem[] = Array.isArray(data.evidenceJournals)
    ? data.evidenceJournals
    : [];
  const hasJournalEvidence = Boolean(
    data.hasVerifiedJournalEvidence || evidenceJournals.length > 0
  );
  const journalCount =
    typeof data.evidenceJournalCount === 'number' && data.evidenceJournalCount > 0
      ? data.evidenceJournalCount
      : evidenceJournals.length > 0
      ? evidenceJournals.length
      : hasJournalEvidence
      ? 1
      : 0;

  // 검사성적서 등록 여부 (실제 데이터 기반)
  const inspectionReport = data.inspectionReport;
  const hasInspectionReport = Boolean(inspectionReport?.hasReport);

  // LOT 번호 존재 여부
  const hasLotNumber = Boolean(data.lotNumber && data.lotNumber.trim());
  const hasHarvestConnection = Boolean(
    harvestOpCount > 0 || startFormatted || endFormatted || data.totalYieldKg !== undefined
  );

  // 이력 확인일 표시 (비어 있을 경우 현재 날짜를 넣지 않음)
  const formattedVerifiedAt = formatPublicDate(data.verifiedAt);
  const displayVerifiedAt = formattedVerifiedAt ? formattedVerifiedAt : '확인일 미기재';

  // 하단 안내 문구 (데이터 상태에 따라 사실대로 표시)
  const footerGuideText =
    hasJournalEvidence || harvestOpCount > 0
      ? '농가가 등록한 생산정보와 연결된 양봉일지·채밀 이력을 바탕으로 제공됩니다.'
      : '농가에서 직접 등록한 기본 생산 정보를 바탕으로 제공됩니다.';

  const handleOpenBrandHome = () => {
    if (onNavigateToBrandHome) {
      onNavigateToBrandHome();
      return;
    }
    if (typeof window !== 'undefined') {
      window.history.pushState({ route: 'consumer' }, '', '/consumer');
      window.dispatchEvent(new PopStateEvent('popstate'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // 본문 콘텐츠 (page / modal / embedded 공통)
  const renderUnifiedConsumerSections = () => (
    <div className="space-y-5 text-[13px] text-[#1f160a]">
      {/* =====================================================================
          ① 제품 및 브랜드 소개 (공통 제품 카탈로그 자산 + 구매 제품 연결)
         ===================================================================== */}
      <section className="bg-white rounded-3xl p-5 border border-[#e5d9c3] shadow-xs space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="text-[11.5px] font-bold text-[#7e5700]">
            <span>{brandInfo.companyName}</span>
            <span aria-hidden="true"> · </span>
            <span>{productMeta.label} 정품 및 생산 이력 안내</span>
          </div>
          {hasLotNumber && (
            <span className="font-mono text-[11px] font-bold text-[#685438] tabular-nums">
              LOT {data.lotNumber}
            </span>
          )}
        </div>

        {/* 제품명 및 꿀 종류 / 품목 안내 */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[22px]" aria-hidden="true">
              {productMeta.icon}
            </span>
            <h1 className="text-[21px] sm:text-[23px] font-black text-[#2b1e00] leading-snug break-keep">
              {data.productName || catalogProduct.officialName}
            </h1>
          </div>
          {data.productType === 'royalJelly' ? (
            <div className="flex items-center gap-2 flex-wrap text-[13px] font-bold text-[#7e5700]">
              <span>품목: 생로열제리</span>
              {data.packageUnit && <span> · 포장: {data.packageUnit}</span>}
              {data.storageMethod && <span> · 보관: {data.storageMethod}</span>}
            </div>
          ) : data.productType === 'propolis' ? (
            <div className="flex items-center gap-2 flex-wrap text-[13px] font-bold text-[#7e5700]">
              <span>품목: 프로폴리스</span>
              {data.packageUnit && <span> · 포장: {data.packageUnit}</span>}
              {data.storageMethod && <span> · 보관: {data.storageMethod}</span>}
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap text-[13px] font-bold text-[#7e5700]">
              <span>꿀 종류: {data.honeyType || '미기재'}</span>
              <span> · 주요 밀원: {displayNectarSource}</span>
              {data.packageUnit && <span> · 포장: {data.packageUnit}</span>}
            </div>
          )}
        </div>

        {/* 실제 판매 제품 사진 영역 (로열제리 등에 꿀병 사진 대체 금지) */}
        <div className="rounded-2xl overflow-hidden border border-[#e8dec8] bg-[#fbf9f4]">
          {hasVerifiedProductPhoto && verifiedPhotoUrl ? (
            <div className="relative">
              <div className="aspect-[4/3] w-full bg-[#fbf9f4] flex items-center justify-center overflow-hidden">
                <img
                  src={verifiedPhotoUrl}
                  alt={`${data.productName} 실제 판매 제품 사진`}
                  referrerPolicy="no-referrer"
                  onError={() => setProductImageLoadError(true)}
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="px-3.5 py-2 bg-[#f5efe2] border-t border-[#e8dec8] flex items-center justify-between text-[11px] text-[#554632]">
                <span className="font-bold">
                  {isCustomUploadedPhoto
                    ? `실제 등록 제품 사진 (${data.productName})`
                    : `실제 판매 제품 사진 (${catalogProduct.officialName})`}
                </span>
                <span className="text-[#7e5700] font-semibold">
                  {isCustomUploadedPhoto
                    ? '양봉인 직접 등록 실물 사진'
                    : catalogProduct.photoScope === 'lot_specific'
                    ? '해당 LOT 전용 제품 사진'
                    : '공통 품목 공식 제품 사진'}
                </span>
              </div>
            </div>
          ) : data.productType === 'royalJelly' ? (
            /* 로열제리 전용 품질 안내 카드 (꿀병 사진 대체 절대 금지) */
            <div className="p-6 bg-gradient-to-br from-[#fffdfa] to-[#faf3e0] text-center space-y-3">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-white border border-[#ebdcc4] flex items-center justify-center text-[32px] shadow-xs">
                🥛
              </div>
              <div className="space-y-1">
                <div className="text-[15px] font-black text-[#2b1e00]">
                  생로열제리 정품 생산 이력 안내
                </div>
                <p className="text-[12px] text-[#6e5d47] max-w-sm mx-auto leading-relaxed">
                  본 제품은 청정 봉장에서 왕대 이충 후 72시간 내 정밀 채취된 순수 국내산 생로열제리입니다.
                </p>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#fce8e6] text-[#c5221f] text-[11px] font-extrabold border border-[#fad2cf]">
                <span className="material-symbols-outlined text-[14px]">ac_unit</span>
                <span>신선도 보장: 영하 18℃ 이하 냉동 보관 필수</span>
              </div>
              <div className="text-[11px] text-[#7e5700] font-medium pt-1">
                ※ 벌꿀과 성분 및 보관법이 완전히 구별되는 별도 양봉산물입니다.
              </div>
            </div>
          ) : data.productType === 'propolis' ? (
            /* 프로폴리스 전용 품질 안내 카드 */
            <div className="p-6 bg-gradient-to-br from-[#f8faf8] to-[#edf7ee] text-center space-y-3">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-white border border-[#bbf7d0] flex items-center justify-center text-[32px] shadow-xs">
                🌿
              </div>
              <div className="space-y-1">
                <div className="text-[15px] font-black text-[#14532d]">
                  프로폴리스 정품 생산 이력 안내
                </div>
                <p className="text-[12px] text-[#365314] max-w-sm mx-auto leading-relaxed">
                  자연 수목의 천연 수지와 꿀벌의 분비물로 완성된 순수 프로폴리스 제품입니다.
                </p>
              </div>
            </div>
          ) : (
            /* 천연벌꿀 전용 공통 라인업 사진 */
            <div className="relative">
              <div className="aspect-[4/3] w-full bg-[#fbf9f4] flex items-center justify-center overflow-hidden">
                <img
                  src={brandInfo.commonProductPhotoUrl}
                  alt={brandInfo.commonProductPhotoCaption}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain object-center"
                />
              </div>
              <div className="px-3.5 py-2.5 bg-[#f5efe2] border-t border-[#e8dec8] flex items-center justify-between gap-2 flex-wrap text-[11px] text-[#554632]">
                <span className="font-bold">
                  {brandInfo.commonProductPhotoCaption}
                </span>
                <span className="text-[#7e5700] font-semibold">
                  {brandInfo.commonProductPhotoScopeLabel} (품목 단독 사진 별도 구분)
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 제품의 특징 및 공식 설명 (기존 등록된 실제 내용 재사용) */}
        <div className="bg-[#fbf9f4] rounded-2xl p-4 border border-[#f0e7d5] space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-[13px] font-black text-[#2b1e00]">
              제품 소개 및 특징
            </h2>
            <span className="text-[11px] font-semibold text-[#7e5700]">
              공통 브랜드·제품 안내
            </span>
          </div>
          <p className="text-[12.5px] text-[#3d2e18] leading-relaxed break-keep">
            {catalogProduct.officialDescription}
          </p>
          <ul className="space-y-1.5 pt-1 border-t border-[#eee4d4] text-[12px] text-[#554632]">
            {catalogProduct.verifiedFeatures.map((feat, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="font-bold text-[#7e5700] shrink-0">·</span>
                <span>{feat}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* 소비자가 꿀 이력을 확인할 수 있다는 안내 */}
        <div className="bg-[#fff9eb] rounded-2xl p-3.5 border border-[#edd59f] flex items-start justify-between gap-3">
          <div className="space-y-0.5">
            <div className="text-[12px] font-black text-[#7e5700]">
              구매하신 꿀병의 QR코드로 실제 생산 이력을 확인하고 계십니다
            </div>
            <p className="text-[11.5px] text-[#685438] leading-relaxed break-keep">
              아래에서 허니비테코 봉장 소개와 함께 이 제품(LOT: <strong className="font-mono">{data.lotNumber || '미기재'}</strong>)의 채밀 일자, 총 채밀량, 근거 양봉일지, 검사성적서 등록 여부를 한 화면에서 확인하실 수 있습니다.
            </p>
          </div>
          <a
            href="#lot-trace-section"
            className="shrink-0 px-3 py-2 rounded-xl bg-[#7e5700] hover:bg-[#684700] text-white text-[11.5px] font-bold transition-colors whitespace-nowrap"
          >
            이력 바로보기
          </a>
        </div>
      </section>

      {/* =====================================================================
          ② 허니비테코 및 봉장 소개 (기존 /consumer 브랜드 스토리 + 봉장 사진 + 공개 승인 위치/지도 통합)
         ===================================================================== */}
      <section className="bg-white rounded-3xl p-5 border border-[#e5d9c3] shadow-xs space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="text-[11px] font-bold text-[#1e5229]">
              생산자 및 봉장 안내 (공통 브랜드 정보)
            </div>
            <h2 className="text-[18px] font-black text-[#2b1e00] mt-0.5">
              "{brandInfo.slogan}"
            </h2>
          </div>
          <img
            src={brandInfo.logoUrl}
            alt={brandInfo.companyName}
            className="h-8 w-auto object-contain"
          />
        </div>

        <p className="text-[12.5px] text-[#3d2e18] leading-relaxed break-keep">
          {brandInfo.brandStory}
        </p>

        {/* 실제 보유한 봉장 현장 사진 (제품 개별 사진과 명확히 구분 표시) */}
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

        {/* 허니비테코 핵심 생산 원칙 2가지 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {brandInfo.corePrinciples.map((principle, idx) => (
            <div
              key={idx}
              className="bg-[#f4fbf5] border border-[#c8e6c9] rounded-2xl p-3.5 space-y-1"
            >
              <div className="text-[12.5px] font-black text-[#1e5229]">
                {idx + 1}. {principle.title}
              </div>
              <p className="text-[11.5px] text-[#3d2e18] leading-relaxed break-keep">
                {principle.description}
              </p>
            </div>
          ))}
        </div>

        {/* 계절별 주요 밀원 안내 */}
        <div className="bg-[#fbf9f4] border border-[#f0e7d5] rounded-2xl p-3.5 space-y-2">
          <div className="text-[12px] font-black text-[#7e5700]">
            봉장 주변 계절별 주요 밀원 환경
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11.5px]">
            {brandInfo.approvedApiaryLocation.seasonalNectarSources.map((s, idx) => (
              <div key={idx} className="bg-white border border-[#e8dec8] rounded-xl p-2.5">
                <span className="font-extrabold text-[#7e5700] block">{s.season}</span>
                <span className="text-[#554632]">{s.sources}</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-[#685438]">
            ※ 구매하신 제품의 실제 채밀 밀원과 생산 일자는 아래 「③ 해당 제품의 꿀 이력」에서 정확하게 확인하실 수 있습니다.
          </p>
        </div>

        {/* 공개가 승인된 봉장 위치 또는 지도 (승인된 정보만 표시) */}
        {brandInfo.approvedApiaryLocation.isPubliclyApproved ? (
          <div className="pt-1 space-y-2">
            <div className="flex items-center justify-between text-[11.5px] px-1">
              <span className="font-black text-[#2b1e00]">
                공개 승인된 직영 봉장 위치 안내
              </span>
              <span className="text-[#1e5229] font-bold">
                소비자 공개 승인 소재지
              </span>
            </div>
            <ApiaryMapSection
              address={brandInfo.approvedApiaryLocation.approvedAddress}
              isDetailed={false}
            />
          </div>
        ) : (
          <div className="bg-[#fbf9f4] border border-[#e8dec8] rounded-2xl p-4 text-[12px] text-[#685438]">
            봉장 상세 위치는 소비자 공개 승인 후 표시됩니다.
          </div>
        )}
      </section>

      {/* =====================================================================
          ③ 해당 제품의 꿀 이력 (publicTraceId로 조회한 실제 LOT 데이터만 표시, 무추정 원칙)
         ===================================================================== */}
      <section
        id="lot-trace-section"
        className="bg-white rounded-3xl p-5 border-2 border-[#d6c4ac] shadow-xs space-y-4 scroll-mt-20"
      >
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-[#f0e7d5] pb-3">
          <div>
            <div className="text-[11px] font-extrabold text-[#7e5700]">
              LOT별 실제 생산 이력 데이터 (QR 조회 결과)
            </div>
            <h2 className="text-[18px] font-black text-[#2b1e00] mt-0.5">
              구매하신 제품의 {data.productType === 'royalJelly' ? '생로열제리 생산 이력' : data.productType === 'propolis' ? '프로폴리스 생산 이력' : '생산 이력'}
            </h2>
          </div>
          <span className="text-[11px] font-bold text-[#1e5229] bg-[#eef8f0] px-2.5 py-1 rounded-lg border border-[#bfe0c5]">
            실제 공개 데이터 연동
          </span>
        </div>

        {/* 핵심 이력 항목 그리드: 품목/밀원 / 생산 기간 / 작업 정보 / 등록된 총 생산량 / LOT 번호 / 이력 확인일 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="bg-[#fbf9f4] p-3.5 rounded-2xl border border-[#f0e7d5]">
            <div className="text-[11px] font-semibold text-[#887864]">
              {data.productType === 'royalJelly' ? '품목 및 보관 정보' : data.productType === 'propolis' ? '품목 및 규격' : '꿀 종류 및 밀원'}
            </div>
            <div className="text-[14px] font-black text-[#2b1e00] mt-0.5">
              {data.productType === 'royalJelly'
                ? `${productMeta.icon} 생로열제리 (보관: ${data.storageMethod || '냉동보관'})`
                : data.productType === 'propolis'
                ? `${productMeta.icon} 프로폴리스 (규격: ${data.packageUnit || '100ml'})`
                : `${productMeta.icon} ${data.honeyType || '미등록'} · ${displayNectarSource}`}
            </div>
          </div>

          <div className="bg-[#fbf9f4] p-3.5 rounded-2xl border border-[#f0e7d5]">
            <div className="text-[11px] font-semibold text-[#887864]">생산 기간</div>
            <div className="text-[14px] font-black text-[#2b1e00] mt-0.5 tabular-nums">
              {displayProductionPeriod}
            </div>
          </div>

          <div className="bg-[#fbf9f4] p-3.5 rounded-2xl border border-[#f0e7d5]">
            <div className="text-[11px] font-semibold text-[#887864]">
              {data.productType === 'royalJelly' || data.productType === 'propolis' ? '등록된 총 생산/채취량' : '등록된 총 채밀량'}
            </div>
            <div
              className={`text-[15px] font-black mt-0.5 tabular-nums ${
                data.totalYieldKg !== undefined ? 'text-[#b34700]' : 'text-[#78654b] text-[13px]'
              }`}
            >
              {displayTotalYield}
            </div>
          </div>

          <div className="bg-[#fbf9f4] p-3.5 rounded-2xl border border-[#f0e7d5]">
            <div className="text-[11px] font-semibold text-[#887864]">
              {data.productType === 'royalJelly' ? '채취 날짜 및 작업 정보' : '채밀 날짜 및 작업 정보'}
            </div>
            <div className="text-[13.5px] font-black text-[#2b1e00] mt-0.5">
              {data.harvestSummary && data.harvestSummary.trim()
                ? data.harvestSummary
                : displayHarvestOps}
            </div>
          </div>
        </div>

        {/* 실제 채취/채밀 작업 회차별 상세 내역 (벌통 번호는 절대 표시하지 않음) */}
        {Array.isArray(data.harvestRecords) && data.harvestRecords.length > 0 ? (
          <div className="bg-[#fbf9f4] p-3.5 rounded-2xl border border-[#f0e7d5] space-y-2">
            <div className="text-[11.5px] font-extrabold text-[#6e5a3e]">
              {data.productType === 'royalJelly'
                ? `채취 작업 회차별 기록 (${data.harvestRecords.length}건)`
                : `채밀 작업 회차별 기록 (${data.harvestRecords.length}건)`}
            </div>
            <div className="space-y-1.5">
              {data.harvestRecords.map((rec, idx) => (
                <div
                  key={`${rec.sequence}-${rec.date}-${idx}`}
                  className="bg-white px-3.5 py-2.5 rounded-xl border border-[#ebdfc8] flex items-center justify-between text-[12px]"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-[#7e5700] tabular-nums">
                      {rec.sequence}회차
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono font-bold text-[#2b1e00] tabular-nums">
                      {formatPublicDate(rec.date) || '날짜 미기재'}
                    </span>
                  </div>
                  <span className="font-black text-[#b34700] tabular-nums">
                    {rec.yieldKg !== undefined
                      ? `${rec.yieldKg}kg`
                      : data.productType === 'royalJelly'
                      ? '생산량 미기재'
                      : '채밀량 정보 미기재'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-[#fbf9f4] px-3.5 py-2.5 rounded-xl border border-[#f0e7d5] text-[12px] text-[#78654b]">
            {data.productType === 'royalJelly'
              ? `세부 회차별 채취 날짜 정보: ${startFormatted || endFormatted || '정보 미기재'}`
              : `세부 회차별 채밀 날짜 정보: ${startFormatted || endFormatted || '정보 미기재'}`}
          </div>
        )}

        {/* LOT 번호 및 이력 확인일 */}
        <div className="bg-[#fff9eb] rounded-2xl p-4 border border-[#edd59f] space-y-2.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="text-[11px] font-extrabold text-[#7e5700]">
                LOT 번호 (생산 이력 고유 식별번호)
              </div>
              <div className="font-mono text-[17px] font-black text-[#2b1e00] tracking-wide break-all tabular-nums mt-0.5">
                {hasLotNumber ? data.lotNumber : '미등록'}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] font-bold text-[#6e5a3e]">이력 확인일</div>
              <div className="font-mono text-[13px] font-extrabold text-[#2b1e00] tabular-nums mt-0.5">
                {displayVerifiedAt}
              </div>
            </div>
          </div>

          <p className="text-[11.5px] text-[#685438] leading-relaxed">
            이 LOT 번호는 해당 꿀병의 생산·채밀 이력을 확인하기 위한 고유 번호입니다. 꿀 이력 정보가 업데이트되어도 동일한 QR코드로 최신 공개 이력을 확인하실 수 있습니다.
          </p>

          {/* LOT 연결 상태 표시 (사실 기반 텍스트 구분) */}
          <div className="pt-2 border-t border-[#ebd9ad] flex flex-wrap items-center gap-2 text-[11.5px] font-bold text-[#554632]">
            <span className={hasJournalEvidence ? 'text-[#1e5229]' : 'text-[#887864]'}>
              {hasJournalEvidence ? `✓ 양봉일지 근거 연결 (${journalCount}건)` : '· 양봉일지 근거 기록 없음'}
            </span>
            <span aria-hidden="true">/</span>
            <span className={hasHarvestConnection ? 'text-[#1e5229]' : 'text-[#887864]'}>
              {hasHarvestConnection ? '✓ 채밀 기록 연결' : '· 채밀 기록 미연결'}
            </span>
            <span aria-hidden="true">/</span>
            <span className={hasInspectionReport ? 'text-[#1e5229]' : 'text-[#887864]'}>
              {hasInspectionReport ? '✓ 검사성적서 등록됨' : '· 검사성적서 미등록'}
            </span>
          </div>
        </div>
      </section>

      {/* =====================================================================
          ④ 소비자 신뢰 정보 (4대 확인 요약, 근거 양봉일지, 검사성적서 상세)
         ===================================================================== */}
      <section className="bg-white rounded-3xl p-5 border border-[#e5d9c3] shadow-xs space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-[16px] font-black text-[#2b1e00]">
            소비자 신뢰 검증 자료 (근거 일지 및 검사성적서)
          </h2>
          <span className="text-[11px] font-bold text-[#7e5700]">
            실제 등록 자료만 표시
          </span>
        </div>

        {/* 4대 확인 요약 그리드 */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* 카드 1: 양봉일지 근거 */}
          <div
            className={`p-3 rounded-xl border ${
              hasJournalEvidence
                ? 'bg-[#f3faf4] border-[#bfe0c5]'
                : 'bg-[#fbf9f4] border-[#eee4d4]'
            }`}
          >
            <div className="text-[11px] font-bold text-[#554632]">양봉일지 근거</div>
            {hasJournalEvidence ? (
              <div className="mt-1 space-y-0.5">
                <div className="text-[13px] font-black text-[#1e5229] tabular-nums">
                  확인됨 · {journalCount}건
                </div>
                <div className="text-[10.5px] font-bold text-[#2b6e39]">
                  양봉일지 근거 확인됨
                </div>
              </div>
            ) : (
              <div className="mt-1 text-[12px] font-bold text-[#887864]">
                근거 기록 없음
              </div>
            )}
          </div>

          {/* 카드 2: 채밀/채취 기록 */}
          <div
            className={`p-3 rounded-xl border ${
              harvestOpCount > 0
                ? 'bg-[#fff9ee] border-[#f0d8a8]'
                : 'bg-[#fbf9f4] border-[#eee4d4]'
            }`}
          >
            <div className="text-[11px] font-bold text-[#554632]">
              {data.productType === 'royalJelly' ? '채취 기록' : '채밀 기록'}
            </div>
            {harvestOpCount > 0 ? (
              <div className="mt-1 space-y-0.5">
                <div className="text-[13px] font-black text-[#7e5700] tabular-nums">
                  확인됨 · {harvestOpCount}회
                </div>
                <div className="text-[10.5px] font-bold text-[#8a6200]">
                  {data.productType === 'royalJelly'
                    ? '채취 작업 기록 연결됨'
                    : '채밀 작업 기록 연결됨'}
                </div>
              </div>
            ) : (
              <div className="mt-1 text-[12px] font-bold text-[#887864]">
                {data.productType === 'royalJelly' ? '채취 회차 정보 미기재' : '채밀 회차 정보 미기재'}
              </div>
            )}
          </div>

          {/* 카드 3: 검사성적서 */}
          <div
            className={`p-3 rounded-xl border ${
              hasInspectionReport
                ? 'bg-[#f3faf4] border-[#bfe0c5]'
                : 'bg-[#fbf9f4] border-[#eee4d4]'
            }`}
          >
            <div className="text-[11px] font-bold text-[#554632]">검사성적서</div>
            {hasInspectionReport ? (
              <div className="mt-1 space-y-0.5">
                <div className="text-[13px] font-black text-[#1e5229]">
                  등록됨
                </div>
                <div className="text-[10.5px] font-bold text-[#2b6e39]">
                  검사성적서 등록됨
                </div>
              </div>
            ) : (
              <div className="mt-1 text-[12px] font-bold text-[#887864]">
                등록된 검사성적서 없음
              </div>
            )}
          </div>

          {/* 카드 4: LOT 이력관리 */}
          <div
            className={`p-3 rounded-xl border ${
              hasLotNumber
                ? 'bg-[#fff9ee] border-[#f0d8a8]'
                : 'bg-[#fbf9f4] border-[#eee4d4]'
            }`}
          >
            <div className="text-[11px] font-bold text-[#554632]">LOT 이력관리</div>
            {hasLotNumber ? (
              <div className="mt-1 space-y-0.5">
                <div className="text-[13px] font-black text-[#7e5700]">
                  확인됨
                </div>
                <div className="text-[10.5px] font-bold text-[#8a6200]">
                  LOT 이력 연결됨
                </div>
              </div>
            ) : (
              <div className="mt-1 text-[12px] font-bold text-[#887864]">
                정보 미기재
              </div>
            )}
          </div>
        </div>

        {/* 근거 양봉일지 목록 */}
        <div className="pt-2 border-t border-[#f0e7d5] space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-[13.5px] font-black text-[#2b1e00]">
              근거 양봉일지
            </h3>
            <span
              className={`text-[11px] font-extrabold ${
                hasJournalEvidence ? 'text-[#1e5229]' : 'text-[#78654b]'
              }`}
            >
              {hasJournalEvidence ? `양봉일지 근거 확인됨 (${journalCount}건)` : '근거 기록 없음'}
            </span>
          </div>

          {evidenceJournals.length > 0 ? (
            <div className="space-y-2">
              {evidenceJournals.map((item, idx) => {
                const formattedDate = formatPublicDate(item.date) || '날짜 미기재';

                return (
                  <div
                    key={`${item.date}-${idx}`}
                    className="bg-[#fbf9f4] p-3.5 rounded-xl border border-[#f0e7d5] space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap text-[12px]">
                        <span className="font-mono font-black text-[#2b1e00] tabular-nums">
                          {formattedDate}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-extrabold text-[#7e5700]">
                          {item.category}
                        </span>
                      </div>
                      {item.yieldKg !== undefined && (
                        <span className="text-[12px] font-black text-[#b34700] shrink-0 tabular-nums">
                          {item.yieldKg}kg
                        </span>
                      )}
                    </div>

                    <p className="text-[12.5px] text-[#3d2e18] font-medium leading-relaxed">
                      "{item.summary}"
                    </p>

                    <div className="pt-1 flex items-center justify-between">
                      <span className="text-[10.5px] font-semibold text-[#2b6e39]">
                        ✓ 이 꿀 이력(LOT)과 연결된 기록
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedEvidenceJournal(item)}
                        className="text-[11px] font-extrabold text-[#7e5700] hover:text-[#5c3d00] bg-[#fff5e0] hover:bg-[#ffebb8] px-2.5 py-1 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-0.5"
                      >
                        <span>근거 양봉일지 보기</span>
                        <span className="material-symbols-outlined text-[13px]">
                          chevron_right
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : hasJournalEvidence ? (
            <div className="bg-[#f3faf4] p-3.5 rounded-xl border border-[#bfe0c5] text-[12px] font-bold text-[#1e5229]">
              이 제품과 연결된 양봉일지 근거 기록({journalCount}건)이 확인되었습니다.
            </div>
          ) : (
            <div className="bg-[#fbf9f4] p-3.5 rounded-xl border border-[#f0e7d5] text-[12px] font-semibold text-[#78654b]">
              근거 기록 없음 · 연결된 양봉일지 기록이 등록되지 않았습니다.
            </div>
          )}
        </div>

        {/* 검사성적서 영역 (실제 등록된 성적서만 표시, private Storage 경로 차단) */}
        <div className="pt-2 border-t border-[#f0e7d5] space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-[13.5px] font-black text-[#2b1e00]">
              검사성적서 관련 정보
            </h3>
            <span
              className={`text-[11px] font-extrabold ${
                hasInspectionReport ? 'text-[#1e5229]' : 'text-[#78654b]'
              }`}
            >
              {hasInspectionReport ? '검사성적서 등록됨' : '등록된 검사성적서 없음'}
            </span>
          </div>

          {hasInspectionReport && inspectionReport ? (
            <div className="bg-[#fbf9f4] p-3.5 rounded-xl border border-[#f0e7d5] space-y-2.5">
              <div className="text-[12px] font-bold text-[#1e5229]">
                이 LOT에 실제 등록된 검사성적서가 확인되었습니다.
              </div>

              {inspectionReport.reportName && (
                <div className="bg-white p-2.5 rounded-lg border border-[#e8dec8]">
                  <div className="text-[10.5px] font-semibold text-[#887864]">등록 파일명</div>
                  <div className="text-[12.5px] font-extrabold text-[#2b1e00] mt-0.5 break-all">
                    {inspectionReport.reportName}
                  </div>
                </div>
              )}

              {/* 구조화된 성적서 데이터가 실제 존재하는 항목만 표시 (추정 금지) */}
              {(inspectionReport.inspectionAgency ||
                inspectionReport.inspectionDate ||
                inspectionReport.result ||
                inspectionReport.summary) && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {inspectionReport.inspectionAgency && (
                    <div className="bg-white p-2.5 rounded-lg border border-[#e8dec8]">
                      <div className="text-[10.5px] font-semibold text-[#887864]">검사기관</div>
                      <div className="text-[12px] font-black text-[#2b1e00] mt-0.5">
                        {inspectionReport.inspectionAgency}
                      </div>
                    </div>
                  )}
                  {inspectionReport.inspectionDate && (
                    <div className="bg-white p-2.5 rounded-lg border border-[#e8dec8]">
                      <div className="text-[10.5px] font-semibold text-[#887864]">검사일</div>
                      <div className="text-[12px] font-black text-[#2b1e00] mt-0.5 tabular-nums">
                        {formatPublicDate(inspectionReport.inspectionDate)}
                      </div>
                    </div>
                  )}
                  {inspectionReport.result && (
                    <div className="col-span-2 bg-white p-2.5 rounded-lg border border-[#e8dec8]">
                      <div className="text-[10.5px] font-semibold text-[#887864]">검사 결과</div>
                      <div className="text-[12px] font-black text-[#1e5229] mt-0.5">
                        {inspectionReport.result}
                      </div>
                    </div>
                  )}
                  {inspectionReport.summary && (
                    <div className="col-span-2 bg-white p-2.5 rounded-lg border border-[#e8dec8]">
                      <div className="text-[10.5px] font-semibold text-[#887864]">
                        주요 검사결과 요약
                      </div>
                      <div className="text-[12px] font-medium text-[#2b1e00] mt-0.5 leading-relaxed">
                        {inspectionReport.summary}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 안전하게 공개 가능한 성적서 URL이 있는 경우에만 [검사성적서 보기] 버튼 표시 */}
              {inspectionReport.reportUrl && (
                <div className="pt-1">
                  <a
                    href={inspectionReport.reportUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-3 rounded-xl bg-[#7e5700] hover:bg-[#684700] text-white text-[12px] font-black transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    <span className="material-symbols-outlined text-[15px]">open_in_new</span>
                    <span>검사성적서 보기</span>
                  </a>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-[#fbf9f4] p-3.5 rounded-xl border border-[#f0e7d5] text-[12px] font-semibold text-[#78654b]">
              미등록 · 해당 LOT에 등록된 검사성적서가 없습니다.
            </div>
          )}
        </div>

        {/* 신뢰성 안내 (traceabilityMessage) */}
        <div
          className={`rounded-2xl p-3.5 border ${
            hasJournalEvidence
              ? 'bg-[#f1f9f2] border-[#bfe0c5] text-[#1e5229]'
              : 'bg-[#f6f5f2] border-[#dcd6ca] text-[#4f4332]'
          }`}
        >
          <div className="text-[11px] font-extrabold">
            {hasJournalEvidence ? '✓ 양봉일지 근거 확인됨' : 'ℹ 농가 등록 정보'}
          </div>
          <p className="text-[12.5px] font-bold leading-relaxed mt-0.5">
            {data.traceabilityMessage}
          </p>
        </div>
      </section>

      {/* =====================================================================
          ⑤ 허니비테코 브랜드 홈 이동 링크 및 고객 문의 안내
         ===================================================================== */}
      <section className="bg-white rounded-3xl p-4 border border-[#e5d9c3] shadow-xs space-y-3 text-center">
        <div className="space-y-1">
          <div className="text-[13px] font-black text-[#2b1e00]">
            허니비테코의 다른 꿀 이력이나 브랜드 소개가 궁금하신가요?
          </div>
          <p className="text-[11.5px] text-[#685438]">
            소비자 브랜드 홈에서 전체 제품 안내와 다른 LOT 이력번호 조회도 이용하실 수 있습니다.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
          <button
            type="button"
            onClick={handleOpenBrandHome}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#7e5700] hover:bg-[#684700] text-white text-[12.5px] font-black transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">storefront</span>
            <span>허니비테코 브랜드 소개 및 소비자 홈 보기</span>
          </button>
        </div>

        <div className="pt-2 border-t border-[#f0e7d5] text-[11px] text-[#685438] space-y-0.5">
          <p className="font-bold text-[#2b1e00]">
            농가 직거래 및 제품 문의: {brandInfo.contactPhone} · {brandInfo.companyName}
          </p>
          <p className="text-[#887864]">{footerGuideText}</p>
        </div>
      </section>
    </div>
  );

  // 근거 양봉일지 상세 모달 (공통)
  const renderEvidenceJournalModal = () =>
    selectedEvidenceJournal && (
      <div
        className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs animate-in fade-in duration-150"
        onClick={() => setSelectedEvidenceJournal(null)}
      >
        <div
          className="bg-white rounded-3xl w-full max-w-sm p-5 shadow-2xl border border-[#e5d9c3] space-y-4 text-[#1f160a]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-[#f0e7d5] pb-3">
            <div>
              <div className="text-[11px] font-bold text-[#7e5700]">근거 양봉일지 상세</div>
              <h3 className="text-[15px] font-black text-[#2b1e00] font-mono tabular-nums">
                {formatPublicDate(selectedEvidenceJournal.date) || '날짜 미기재'}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setSelectedEvidenceJournal(null)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#887864] hover:bg-[#f3ebe0] cursor-pointer"
              aria-label="닫기"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          <div className="space-y-3 text-[12.5px]">
            <div className="bg-[#fbf9f4] p-3 rounded-xl border border-[#f0e7d5]">
              <div className="text-[11px] font-semibold text-[#887864]">기록 유형</div>
              <div className="text-[13.5px] font-black text-[#2b1e00] mt-0.5">
                {selectedEvidenceJournal.category}
              </div>
            </div>

            <div className="bg-[#fbf9f4] p-3 rounded-xl border border-[#f0e7d5]">
              <div className="text-[11px] font-semibold text-[#887864]">기록 요약</div>
              <div className="text-[13px] font-bold text-[#2b1e00] mt-1 leading-relaxed">
                {selectedEvidenceJournal.summary}
              </div>
            </div>

            {selectedEvidenceJournal.yieldKg !== undefined && (
              <div className="bg-[#fff9ee] p-3 rounded-xl border border-[#f0d8a8]">
                <div className="text-[11px] font-semibold text-[#7e5700]">채밀량</div>
                <div className="text-[15px] font-black text-[#b34700] mt-0.5 tabular-nums">
                  {selectedEvidenceJournal.yieldKg}kg
                </div>
              </div>
            )}

            <div className="p-2.5 rounded-xl bg-[#f3faf4] border border-[#bfe0c5] text-[11px] font-bold text-[#1e5229]">
              ✓ 해당 기록은 이 제품(LOT: {data.lotNumber})의 생산 이력과 연결되어 있습니다.
            </div>
          </div>

          <div className="pt-1 flex justify-end">
            <button
              type="button"
              onClick={() => setSelectedEvidenceJournal(null)}
              className="px-4 py-2 rounded-xl bg-[#7e5700] hover:bg-[#684700] text-white text-[12px] font-black cursor-pointer"
            >
              확인
            </button>
          </div>
        </div>
      </div>
    );

  // 1) variant === 'page': QR 스캔 진입 시 전체 페이지 레이아웃 (/trace/:publicTraceId)
  if (variant === 'page') {
    return (
      <div className="min-h-screen bg-[#fcfaf5] text-[#1f160a] flex flex-col font-['Noto_Sans_KR',_'Inter',sans-serif]">
        {/* 상단 소비자 헤더 (Top Bar Contract 준수: 1줄 브랜드명 — 내비게이션 — 브랜드 홈 이동 액션) */}
        <header className="sticky top-0 z-30 bg-[#fcfaf5]/95 backdrop-blur-md border-b border-[#e5d9c3]">
          <div className="max-w-xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={handleOpenBrandHome}
              className="text-[15px] font-black text-[#2b1e00] tracking-tight whitespace-nowrap shrink-0 cursor-pointer text-left"
            >
              농업회사법인 허니비테코
            </button>

            <nav className="hidden sm:flex items-center gap-5 text-[12.5px] font-bold text-[#685438]">
              <a
                href="#lot-trace-section"
                className="hover:text-[#2b1e00] transition-colors whitespace-nowrap shrink-0"
              >
                생산이력 확인
              </a>
              <button
                type="button"
                onClick={handleOpenBrandHome}
                className="hover:text-[#2b1e00] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                브랜드 소개
              </button>
            </nav>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleOpenBrandHome}
                className="px-3 py-1.5 rounded-xl bg-[#7e5700] hover:bg-[#684700] text-white text-[11.5px] font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                브랜드 홈
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-xl w-full mx-auto px-4 py-5 pb-16">
          {renderUnifiedConsumerSections()}
        </main>

        {renderEvidenceJournalModal()}
      </div>
    );
  }

  // 2) variant === 'embedded': /consumer 화면 내 인라인 표시
  if (variant === 'embedded') {
    return (
      <div className="w-full">
        {renderUnifiedConsumerSections()}
        {renderEvidenceJournalModal()}
      </div>
    );
  }

  // 3) variant === 'modal' (기본값): 양봉인의 소비자 공개 화면 미리보기 모달
  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 pt-safe pb-safe bg-black/65 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-[#fcfaf5] rounded-3xl w-full max-w-lg shadow-2xl border border-[#e5d9c3] flex flex-col max-h-[calc(100dvh-2rem)] my-auto overflow-hidden text-[#1f160a]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 모달 상단 닫기 바 */}
        <div className="px-5 py-3.5 bg-gradient-to-b from-[#fff7e5] to-[#fcfaf5] border-b border-[#efe4d0] flex items-center justify-between shrink-0">
          <div className="text-[13px] font-black text-[#2b1e00]">
            소비자 QR 스캔 통합 페이지 미리보기
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1 text-[12px] font-bold text-[#6e5a3e] hover:text-[#2b1e00] py-1 px-2.5 rounded-xl bg-white border border-[#e5d9c3] hover:bg-[#f2e6d0]/60 transition-colors cursor-pointer"
            >
              <span>닫기</span>
            </button>
          )}
        </div>

        {/* 스크롤 본문 */}
        <div className="p-4 sm:p-5 overflow-y-auto overscroll-contain">
          {renderUnifiedConsumerSections()}
        </div>
      </div>

      {renderEvidenceJournalModal()}
    </div>
  );
};
