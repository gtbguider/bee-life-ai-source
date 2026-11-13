import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';

export interface HoneyTraceQrModalProps {
  publicTraceId: string;
  lotNumber?: string;
  productName?: string;
  onClose: () => void;
}

/**
 * 허니비테코 소비자 공개 QR 기준 정식 도메인 (Canonical Public Origin)
 * - 환경변수 VITE_PUBLIC_APP_URL이 설정되어 있으면 최우선 사용하며,
 *   미리보기(ais-dev-*)에서 열더라도 인쇄용 QR은 정식 공개 주소(ais-pre-*)로 고정하여
 *   동일 LOT의 QR 이미지가 실행 환경에 따라 달라지지 않도록 보장합니다.
 */
export const DEFAULT_CANONICAL_PUBLIC_ORIGIN =
  'https://remix-honeybee-teco-u5jit4sjca-el.a.run.app';
export const DEFAULT_CANONICAL_ORIGIN = DEFAULT_CANONICAL_PUBLIC_ORIGIN;

export function getCanonicalPublicOrigin(customOrigin?: string): string {
  if (customOrigin && customOrigin.trim()) {
    return customOrigin.trim().replace(/\/+$/, '');
  }
  const envOrigin =
    typeof import.meta !== 'undefined' &&
    import.meta.env &&
    typeof import.meta.env.VITE_PUBLIC_APP_URL === 'string'
      ? import.meta.env.VITE_PUBLIC_APP_URL.trim()
      : '';
  // 예전 AI Studio 임시/프리뷰 주소가 환경변수에 남아있더라도 새 공식 공개 주소 적용 방어
  if (
    envOrigin &&
    !envOrigin.includes('ais-pre-') &&
    !envOrigin.includes('ais-dev-')
  ) {
    return envOrigin.replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    const currentOrigin = window.location.origin.replace(/\/+$/, '');
    // 개발용 프리뷰 도메인(ais-dev-*), 이전 프리뷰 도메인(ais-pre-*)이나 로컬호스트에서 QR을 생성/다운로드하더라도
    // 실제 인쇄용 QR은 정식 공개 주소(DEFAULT_CANONICAL_PUBLIC_ORIGIN)로 일관되게 고정
    if (
      currentOrigin.includes('ais-dev-') ||
      currentOrigin.includes('ais-pre-') ||
      currentOrigin.includes('localhost') ||
      currentOrigin.includes('127.0.0.1')
    ) {
      return DEFAULT_CANONICAL_PUBLIC_ORIGIN;
    }
    return currentOrigin;
  }
  return DEFAULT_CANONICAL_PUBLIC_ORIGIN;
}

/**
 * 소비자 공개 페이지 URL을 생성합니다.
 * - QR 코드에는 HoneyLot 데이터나 개인정보를 절대 포함하지 않으며,
 *   오직 `${origin}/trace/${publicTraceId}` 형태의 고정 URL만 저장합니다.
 * - 동일 publicTraceId에 대해 재조회·재다운로드·재게시 시에도 항상 동일한 URL을 반환합니다.
 */
export function buildPublicTraceQrUrl(publicTraceId: string, customOrigin?: string): string {
  const cleanId = (publicTraceId || '').trim();
  if (!cleanId) return '';

  const origin = getCanonicalPublicOrigin(customOrigin);
  return origin ? `${origin}/trace/${cleanId}` : `/trace/${cleanId}`;
}

/**
 * QR PNG 다운로드 파일명을 생성합니다.
 * - 예: 허니비테코_꿀이력_QR_2026-AC-20260528-01.png
 * - 개인정보를 포함하지 않고 LOT 번호만 사용합니다.
 */
export function buildQrPngFileName(lotNumber?: string): string {
  const safeLot = (lotNumber || 'LOT')
    .trim()
    .replace(/[^a-zA-Z0-9가-힣_-]/g, '_');
  return `허니비테코_꿀이력_QR_${safeLot || 'LOT'}.png`;
}

/**
 * 공개 URL 문자열로부터 QR 코드 PNG Data URL을 생성합니다.
 * - 오직 공개 URL 문자열만 인코딩합니다.
 */
export async function generateQrCodeDataUrl(qrUrl: string): Promise<string> {
  if (!qrUrl || !qrUrl.trim()) {
    throw new Error('유효한 공개 URL이 필요합니다.');
  }
  return QRCode.toDataURL(qrUrl.trim(), {
    type: 'image/png',
    width: 360,
    margin: 2,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#1f160a',
      light: '#ffffff'
    }
  });
}

export const HoneyTraceQrModal: React.FC<HoneyTraceQrModalProps> = ({
  publicTraceId,
  lotNumber,
  productName,
  onClose
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const cleanTraceId = (publicTraceId || '').trim();
  const publicUrl = buildPublicTraceQrUrl(cleanTraceId);
  const relativePath = cleanTraceId ? `/trace/${cleanTraceId}` : '';

  useEffect(() => {
    if (!cleanTraceId || !publicUrl) {
      setErrorMsg('공개 식별자(publicTraceId)가 없어 QR 코드를 생성할 수 없습니다.');
      setIsGenerating(false);
      return;
    }

    let isMounted = true;
    setIsGenerating(true);
    setErrorMsg(null);

    generateQrCodeDataUrl(publicUrl)
      .then((dataUrl) => {
        if (isMounted) {
          setQrDataUrl(dataUrl);
          setIsGenerating(false);
        }
      })
      .catch((err) => {
        console.error('QR generation failed:', err);
        if (isMounted) {
          setErrorMsg('QR 코드 생성 중 오류가 발생했습니다.');
          setIsGenerating(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [cleanTraceId, publicUrl]);

  const handleDownloadPng = () => {
    if (!qrDataUrl) return;
    const fileName = buildQrPngFileName(lotNumber);
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      className="fixed inset-0 z-80 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-[#fcfaf5] rounded-3xl w-full max-w-sm shadow-2xl border border-[#e5d9c3] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 상단 헤더 */}
        <div className="bg-gradient-to-b from-[#fff8e8] to-[#fcfaf5] px-5 pt-5 pb-4 border-b border-[#eee3cf] text-center relative">
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="absolute right-4 top-4 w-8 h-8 rounded-full bg-white/90 border border-[#e2d4bc] flex items-center justify-center text-[#5e4b32] hover:bg-[#f5ede0] transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#fff2d6] border border-[#f0d59c] text-[12px] font-extrabold text-[#7e5700]">
            <span>🍯</span>
            <span>소비자 꿀 이력</span>
          </div>

          <h3 className="mt-2.5 text-[17px] font-black text-[#1f160a] leading-snug break-keep">
            {productName && productName.trim() ? productName.trim() : '천연벌꿀'}
          </h3>

          {lotNumber && (
            <div className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-white border border-[#e6dac6]">
              <span className="text-[10px] font-extrabold text-[#85735c]">LOT</span>
              <span className="font-mono text-[11.5px] font-black text-[#2b1e00]">
                {lotNumber}
              </span>
            </div>
          )}
        </div>

        {/* 중앙 QR 영역 */}
        <div className="px-6 py-5 flex flex-col items-center space-y-4">
          <div className="bg-white p-4 rounded-2xl border-2 border-[#e6dac6] shadow-xs flex items-center justify-center w-60 h-60">
            {isGenerating ? (
              <div className="flex flex-col items-center gap-2 text-[#685438]">
                <div className="w-8 h-8 border-3 border-[#7e5700] border-t-transparent rounded-full animate-spin" />
                <span className="text-[12px] font-bold">QR 코드 생성 중...</span>
              </div>
            ) : errorMsg ? (
              <div className="text-center px-3 space-y-1.5">
                <span className="material-symbols-outlined text-[28px] text-[#a12b2b]">
                  error
                </span>
                <p className="text-[12px] font-bold text-[#a12b2b] leading-relaxed">
                  {errorMsg}
                </p>
              </div>
            ) : (
              <img
                src={qrDataUrl}
                alt="소비자 꿀 이력 공개 페이지 QR 코드"
                className="w-52 h-52 object-contain select-none"
              />
            )}
          </div>

          {/* 하단 안내 문구 및 공개 URL 표시 */}
          <div className="text-center space-y-2.5 w-full">
            <p className="text-[12.5px] font-bold text-[#2b1e00] leading-relaxed break-keep">
              스마트폰 카메라로 스캔하면
              <br />
              이 꿀의 생산·채밀 이력을 확인할 수 있습니다.
            </p>

            <div className="bg-white px-3 py-2 rounded-xl border border-[#e6dac6] space-y-0.5">
              <div className="text-[10px] font-bold text-[#85735c]">공개 페이지 주소</div>
              <div className="font-mono text-[11.5px] font-bold text-[#1e5229] break-all">
                {relativePath}
              </div>
              {publicUrl && publicUrl !== relativePath && (
                <div className="font-mono text-[10px] text-[#7a6852] break-all">
                  {publicUrl}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 하단 버튼 영역 */}
        <div className="px-5 py-3.5 bg-[#f7f2e7] border-t border-[#e8dec8] flex items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-white border border-[#d6c8b2] text-[12.5px] font-bold text-[#554632] hover:bg-[#f3ebe0] transition-colors cursor-pointer"
          >
            닫기
          </button>

          <button
            type="button"
            disabled={!qrDataUrl || isGenerating}
            onClick={handleDownloadPng}
            className="flex-1 py-2.5 px-4 rounded-xl bg-[#1e5229] hover:bg-[#163d1e] disabled:opacity-50 text-white text-[12.5px] font-black transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
          >
            <span className="material-symbols-outlined text-[17px]">download</span>
            <span>QR 이미지 저장</span>
          </button>
        </div>
      </div>
    </div>
  );
};
