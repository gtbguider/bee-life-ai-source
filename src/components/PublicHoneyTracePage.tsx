import React, { useState, useEffect } from 'react';
import { PublicTraceLookupResult } from '../services/honeyTracePublicService';
import { getPublicHoneyTraceById } from '../services/publicHoneyTraceService';
import { ConsumerHoneyTraceView } from './ConsumerHoneyTraceView';

export interface PublicHoneyTracePageProps {
  publicTraceId: string;
  onBack?: () => void;
  /** 허니비테코 일반 브랜드 소개 화면(/consumer)으로 이동 */
  onNavigateToConsumerHome?: () => void;
  /** 테스트 검증용 초기 조회 상태 (미지정 시 비동기 조회 수행) */
  initialResult?: PublicTraceLookupResult;
}

/**
 * 소비자 공개 꿀 이력 페이지 (/trace/:publicTraceId)
 *
 * [구조 및 보안 원칙]:
 * PublicHoneyTracePage
 *   ↓
 * GET /api/public-honey-traces/:publicTraceId (getPublicHoneyTraceById)
 *   ↓
 * HoneyTracePublicData
 *   ↓
 * ConsumerHoneyTraceView (variant="page") 재사용
 *
 * - 기존 /trace/:publicTraceId 경로와 publicTraceId를 그대로 유지합니다.
 * - ConsumerHoneyTraceView에는 오직 정제된 HoneyTracePublicData만 전달합니다.
 * - 실제 게시된 데이터가 없는 경우 임의의 HoneyTracePublicData를 생성하지 않습니다.
 * - 공개 해제된 꿀 이력은 조회를 차단합니다.
 */
export const PublicHoneyTracePage: React.FC<PublicHoneyTracePageProps> = ({
  publicTraceId,
  onBack,
  onNavigateToConsumerHome,
  initialResult
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(!initialResult);
  const [lookupResult, setLookupResult] = useState<PublicTraceLookupResult | null>(
    initialResult || null
  );

  const handleGoBrandHome = () => {
    if (onNavigateToConsumerHome) {
      onNavigateToConsumerHome();
      return;
    }
    if (typeof window !== 'undefined') {
      window.history.pushState({ route: 'consumer' }, '', '/consumer');
      window.dispatchEvent(new PopStateEvent('popstate'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (initialResult) {
      setLookupResult(initialResult);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    getPublicHoneyTraceById(publicTraceId)
      .then((res) => {
        if (isMounted) {
          setLookupResult(res);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setLookupResult({
            status: 'error',
            errorType: 'network_error',
            errorMessage: '일시적인 네트워크 또는 접속 환경 문제로 이력을 불러오지 못했습니다.'
          });
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [publicTraceId, initialResult]);

  const handleRetry = () => {
    setIsLoading(true);
    getPublicHoneyTraceById(publicTraceId)
      .then((res) => {
        setLookupResult(res);
        setIsLoading(false);
      })
      .catch(() => {
        setLookupResult({
          status: 'error',
          errorType: 'network_error',
          errorMessage: '일시적인 네트워크 또는 접속 환경 문제로 이력을 불러오지 못했습니다.'
        });
        setIsLoading(false);
      });
  };

  // ① loading 상태
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#fcfaf5] flex items-center justify-center p-4 text-[#1f160a]">
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full border border-[#e5d9c3] shadow-lg text-center space-y-4">
          <div className="w-10 h-10 border-3 border-[#7e5700] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-[14px] font-bold text-[#2b1e00]">
            허니비테코 제품 및 꿀 생산 이력을 확인하고 있습니다.
          </p>
        </div>
      </div>
    );
  }

  // ② 정상 조회 완료: 통합된 ConsumerHoneyTraceView (variant="page") 렌더링
  if (lookupResult?.status === 'found') {
    return (
      <ConsumerHoneyTraceView
        data={lookupResult.data}
        variant="page"
        onClose={onBack}
        onNavigateToBrandHome={handleGoBrandHome}
      />
    );
  }

  // ④ 공개 정보가 준비되지 않았거나 공개 해제된 경우 (접근 차단 유지)
  if (lookupResult?.status === 'not_ready') {
    return (
      <div className="min-h-screen bg-[#fcfaf5] flex items-center justify-center p-4 text-[#1f160a]">
        <div className="bg-white rounded-3xl p-7 max-w-md w-full border border-[#e5d9c3] shadow-lg text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#fff8e6] border border-[#f0d8a8] flex items-center justify-center text-[24px] mx-auto">
            🍯
          </div>
          <h1 className="text-[17px] font-black text-[#2b1e00]">
            아직 소비자 공개용 이력이 준비되지 않았습니다.
          </h1>
          <p className="text-[12.5px] text-[#685438] leading-relaxed">
            해당 제품의 생산 이력은 현재 비공개(공개 해제) 상태이거나 공개 준비 중입니다.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
            <button
              type="button"
              onClick={handleGoBrandHome}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#7e5700] text-white text-[13px] font-bold hover:bg-[#684700] transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">storefront</span>
              <span>허니비테코 브랜드 소개 보기</span>
            </button>
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-white border border-[#e5d9c3] text-[#554632] text-[13px] font-bold hover:bg-[#f4efe5] transition-colors cursor-pointer"
              >
                <span>홈으로</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ⑤ 일시적인 접속 연결 오류, 네트워크 장애, 또는 쿠키 확인 대기 상태
  if (lookupResult?.status === 'error') {
    return (
      <div className="min-h-screen bg-[#fcfaf5] flex items-center justify-center p-4 text-[#1f160a]">
        <div className="bg-white rounded-3xl p-7 max-w-md w-full border border-[#f0d8a8] shadow-lg text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#fff8e6] border border-[#f0d8a8] text-[#b45309] flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-[26px]">wifi_off</span>
          </div>
          <h1 className="text-[17px] font-black text-[#2b1e00]">
            일시적인 접속 연결 오류가 발생했습니다.
          </h1>
          <p className="text-[12.5px] text-[#685438] leading-relaxed">
            {lookupResult.errorMessage ||
              '네트워크 상태 또는 일시적인 접속 환경 문제로 이력을 불러오지 못했습니다.'}
            <br />
            QR 코드가 잘못된 것이 아니니 잠시 후 [다시 시도]를 눌러주세요.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
            <button
              type="button"
              onClick={handleRetry}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#7e5700] text-white text-[13px] font-bold hover:bg-[#684700] transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">refresh</span>
              <span>다시 시도</span>
            </button>
            <button
              type="button"
              onClick={handleGoBrandHome}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-white border border-[#e5d9c3] text-[#554632] text-[13px] font-bold hover:bg-[#f4efe5] transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">storefront</span>
              <span>허니비테코 브랜드 소개 보기</span>
            </button>
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-white border border-[#e5d9c3] text-[#554632] text-[13px] font-bold hover:bg-[#f4efe5] transition-colors cursor-pointer"
              >
                <span>홈으로</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ③ 존재하지 않는 publicTraceId 또는 공개 해제된 이력 (404 / 이력 없음)
  return (
    <div className="min-h-screen bg-[#fcfaf5] flex items-center justify-center p-4 text-[#1f160a]">
      <div className="bg-white rounded-3xl p-7 max-w-md w-full border border-[#e5d9c3] shadow-lg text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-[#fdf3f2] border border-[#f5c6c4] text-[#a12b2b] flex items-center justify-center mx-auto">
          <span className="material-symbols-outlined text-[26px]">search_off</span>
        </div>
        <h1 className="text-[17px] font-black text-[#2b1e00]">
          이 꿀 이력을 찾을 수 없습니다.
        </h1>
        <p className="text-[12.5px] text-[#685438] leading-relaxed">
          공개 주소가 잘못되었거나
          <br />
          현재 비공개(공개 해제)된 이력일 수 있습니다.
        </p>
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
          <button
            type="button"
            onClick={handleGoBrandHome}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#7e5700] text-white text-[13px] font-bold hover:bg-[#684700] transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">storefront</span>
            <span>허니비테코 브랜드 소개 보기</span>
          </button>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-white border border-[#e5d9c3] text-[#554632] text-[13px] font-bold hover:bg-[#f4efe5] transition-colors cursor-pointer"
            >
              <span>홈으로</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
