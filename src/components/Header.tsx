import React from 'react';
import { LOGO_URL } from '../data/mockData';
import { TabType } from '../types';

interface HeaderProps {
  currentTab: TabType;
  title: string;
  onNavigateHome: () => void;
  onOpenProfile: () => void;
  onBack?: () => void;
  showBack?: boolean;
  onOpenTraceView?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  title,
  onNavigateHome,
  onOpenProfile,
  onBack,
  showBack,
  onOpenTraceView
}) => {
  // Show back button on all sub-tabs to easily return to home cover screen
  const shouldShowBack = showBack ?? (currentTab !== 'record');

  return (
    <header className="fixed top-0 w-full z-40 bg-[#f4faff]/95 backdrop-blur-xl pt-safe border-b border-[#d4e5ef]/60 shadow-[0_1px_8px_rgba(0,0,0,0.03)]">
      <div className="max-w-md mx-auto h-16 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {shouldShowBack && (
            <button
              onClick={onBack || onNavigateHome}
              className="w-9 h-9 -ml-1.5 rounded-full flex items-center justify-center text-[#0d1e25] hover:bg-[#d9ebf5] active:scale-95 transition-all cursor-pointer"
              aria-label="이전 화면으로 돌아가기"
              title="이전 화면"
            >
              <span className="material-symbols-outlined text-[24px]">arrow_back</span>
            </button>
          )}

          <div
            onClick={onNavigateHome}
            className="flex items-center gap-2 cursor-pointer select-none group"
            title="서비스 선택 홈으로 이동"
          >
            <img
              alt="농업회사법인 허니비테코 주식회사 로고"
              className="h-8 w-8 object-contain p-0.5 bg-white rounded-lg border border-[#d6c4ac]/50 shadow-2xs transition-transform group-hover:scale-105"
              src={LOGO_URL}
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-[16px] sm:text-[17px] text-[#0d1e25] tracking-tight truncate max-w-[150px] sm:max-w-[190px]">
                  {title}
                </span>
                <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-[#ffdeac] text-[#7e5700] shrink-0">
                  양봉인
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {currentTab !== 'trace' && onOpenTraceView && (
            <button
              onClick={onOpenTraceView}
              className="hidden sm:flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-full bg-[#ffb300]/15 text-[#7e5700] hover:bg-[#ffb300]/25 transition-colors border border-[#ffb300]/30 cursor-pointer"
              title="소비자 꿀이력제 보기"
            >
              <span className="material-symbols-outlined text-[16px]">qr_code_scanner</span>
              <span>꿀이력제</span>
            </button>
          )}

          <button
            onClick={onNavigateHome}
            className="flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-full text-[#514532] hover:bg-[#d9ebf5] transition-colors cursor-pointer border border-[#d4e5ef]/70 bg-white/70"
            aria-label="서비스 선택 홈 화면으로 이동"
            title="서비스 선택 홈"
          >
            <span className="material-symbols-outlined text-[17px]">home</span>
            <span className="hidden xs:inline">홈</span>
          </button>

          <button
            onClick={onOpenProfile}
            className={`w-8 h-8 rounded-full flex items-center justify-center shadow-2xs hover:opacity-90 active:scale-95 transition-all cursor-pointer ${
              currentTab === 'profile'
                ? 'bg-[#ffdeac] text-[#7e5700] ring-2 ring-[#7e5700]'
                : 'bg-[#7e5700] text-white'
            }`}
            aria-label="내 정보"
            title="농가 정보 설정"
          >
            <span className="material-symbols-outlined text-[18px]">person</span>
          </button>
        </div>
      </div>
    </header>
  );
};
