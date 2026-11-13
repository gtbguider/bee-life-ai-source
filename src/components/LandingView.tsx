import React from 'react';
import { WeatherInfo } from '../types';
import { UserProfile } from '../services/userProfile';
import { BEEKEEPER_IMG } from '../data/mockData';

interface LandingViewProps {
  weather: WeatherInfo;
  userProfile: UserProfile;
  onEnterBeekeeper: () => void;
  onEnterConsumer: () => void;
}

// Format weather condition code to clear Korean text and emoji
const formatWeatherBadge = (condition: string, icon?: string) => {
  const condStr = (condition || '').trim();
  const iconStr = (icon || '').toLowerCase();
  const combined = (condStr + ' ' + iconStr).toLowerCase();

  let krText = '맑음';
  let emoji = '☀️';

  if (combined.includes('partly') || combined.includes('cloud') || condStr.includes('구름')) {
    krText = '구름조금';
    emoji = '⛅';
  } else if (combined.includes('overcast') || condStr.includes('흐림')) {
    krText = '흐림';
    emoji = '☁️';
  } else if (combined.includes('rain') || condStr.includes('비')) {
    krText = '비';
    emoji = '🌧️';
  } else if (combined.includes('snow') || condStr.includes('눈')) {
    krText = '눈';
    emoji = '❄️';
  } else if (condStr.length > 0 && !condStr.includes('_') && !condStr.includes('day')) {
    krText = condStr;
  }

  return { text: krText, emoji };
};

export const LandingView: React.FC<LandingViewProps> = ({
  weather,
  userProfile,
  onEnterBeekeeper,
  onEnterConsumer,
}) => {
  const weatherBadge = formatWeatherBadge(weather.condition, weather.icon);

  return (
    <div className="min-h-screen bg-[#f4faff] text-[#0d1e25] flex flex-col font-['Noto_Sans_KR',_'Inter',sans-serif]">
      {/* Top Brand Header */}
      <header className="sticky top-0 z-30 bg-[#f4faff]/95 backdrop-blur-md border-b border-[#d4e5ef]/70">
        <div className="max-w-xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white border border-[#d6c4ac]/60 p-1 flex items-center justify-center shadow-xs">
              <img
                src="/honeybee_teco_logo.svg"
                alt="농업회사법인 허니비테코 주식회사 로고"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <span className="text-[10px] font-black text-[#7e5700] uppercase tracking-wider block">
                스마트 양봉 케어
              </span>
              <span className="text-[14.5px] font-black text-[#0d1e25] tracking-tight">
                농업회사법인 허니비테코
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#ffdeac]/60 text-[#7e5700] border border-[#ffdeac]">
              지리산 자연숙성꿀
            </span>
          </div>
        </div>
      </header>

      {/* Main Landing Body */}
      <main className="flex-1 max-w-xl w-full mx-auto px-4 pt-4 pb-10 space-y-4">
        {/* Service Title & Entry Header */}
        <div className="text-center pt-2 pb-1 space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ffb300]/15 text-[#7e5700] border border-[#ffb300]/30 text-[11px] font-extrabold">
            <span>🐝</span>
            <span>Remix Honeybee Teco – 스마트 양봉 관리</span>
          </div>

          <div className="pt-1">
            <span className="text-[11px] font-black text-[#7e5700] uppercase tracking-wider block">
              SERVICE ENTRY
            </span>
            <h1 className="text-[19px] sm:text-[21px] font-black text-[#0d1e25] tracking-tight mt-0.5">
              서비스를 이용하실 역할을 선택해주세요
            </h1>
          </div>

          {/* Quick weather strip */}
          <div className="inline-flex items-center gap-2 text-[11px] text-[#514532] font-semibold bg-white border border-[#d4e5ef] px-2.5 py-1 rounded-full shadow-2xs mt-1">
            <span role="img" aria-label={weatherBadge.text}>{weatherBadge.emoji}</span>
            <span>지리산 봉장 {weather.temperature}°C ({weatherBadge.text})</span>
            <span className="text-[#1b6d24] bg-[#a0f399]/40 px-1.5 py-0.2 rounded-full font-bold text-[10px]">
              비행 {weather.beeFlightScore || '최적'}
            </span>
          </div>
        </div>

        {/* The Two Main Role Selection Cards */}
        <div className="grid grid-cols-1 gap-3.5 pt-1">
          {/* Option 1: Beekeeper Service Card (Ivory / Soft Beige / Honey Gold) */}
          <div
            id="entry-beekeeper-card"
            className="bg-gradient-to-br from-[#fffdfa] via-[#fffbf2] to-[#fff6e6] border-2 border-[#f0d49f] hover:border-[#7e5700] rounded-3xl p-5 shadow-sm transition-all duration-200 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-11 h-11 rounded-2xl bg-[#ffdeac] text-[#7e5700] flex items-center justify-center text-[22px] shadow-xs shrink-0">
                    🐝
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#7e5700] text-white">
                      양봉농가 전용
                    </span>
                    <h2 className="text-[18px] font-black text-[#0d1e25] tracking-tight mt-0.5">
                      양봉인으로 시작하기
                    </h2>
                  </div>
                </div>
              </div>

              <p className="text-[12.5px] text-[#514532] font-medium leading-snug mt-1 mb-2.5">
                봉군 내검 기록, AI 음성 양봉일지, 여왕벌 종봉 계보 관리
              </p>

              {/* Core Feature Points */}
              <div className="flex items-center gap-2 mb-3 text-[12px] font-bold text-[#514532]">
                <span className="flex items-center gap-1 bg-white/90 border border-[#ffdeac] rounded-lg px-2.5 py-1">
                  🎙️ 음성 양봉일지
                </span>
                <span className="flex items-center gap-1 bg-white/90 border border-[#ffdeac] rounded-lg px-2.5 py-1">
                  📦 봉군 관리
                </span>
                <span className="flex items-center gap-1 bg-white/90 border border-[#ffdeac] rounded-lg px-2.5 py-1">
                  👑 여왕벌 계보
                </span>
              </div>
            </div>

            {/* Beekeeper Action CTA Button */}
            <button
              onClick={onEnterBeekeeper}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#7e5700] hover:bg-[#634500] text-white font-extrabold text-[15px] shadow-md flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer mt-1"
            >
              <span>양봉인으로 시작하기</span>
              <span className="material-symbols-outlined text-[18px]">
                arrow_forward
              </span>
            </button>
          </div>

          {/* Option 2: Consumer Service Card (Very Soft Lavender / Purple) */}
          <div
            id="entry-consumer-card"
            className="bg-gradient-to-br from-[#fdfcff] via-[#faf7ff] to-[#f4effe] border-2 border-[#e9d5ff] hover:border-[#7c3aed] rounded-3xl p-5 shadow-sm transition-all duration-200 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-11 h-11 rounded-2xl bg-[#ede4ff] text-[#7c3aed] flex items-center justify-center text-[22px] shadow-xs shrink-0">
                    🍯
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#7c3aed] text-white">
                      소비자 안심 품질
                    </span>
                    <h2 className="text-[18px] font-black text-[#0d1e25] tracking-tight mt-0.5">
                      소비자로 시작하기
                    </h2>
                  </div>
                </div>
              </div>

              <p className="text-[12.5px] text-[#514532] font-medium leading-snug mt-1 mb-2.5">
                지리산 1+ 등급 천연완숙꿀 품질 시험성적서 및 생산이력 확인
              </p>

              {/* Core Feature Points */}
              <div className="flex items-center gap-2 mb-3 text-[12px] font-bold text-[#514532]">
                <span className="flex items-center gap-1 bg-white/90 border border-[#e9d5ff] rounded-lg px-2.5 py-1">
                  🍯 천연완숙꿀 정보
                </span>
                <span className="flex items-center gap-1 bg-white/90 border border-[#e9d5ff] rounded-lg px-2.5 py-1">
                  📜 시험성적서
                </span>
                <span className="flex items-center gap-1 bg-white/90 border border-[#e9d5ff] rounded-lg px-2.5 py-1">
                  🔍 생산이력 확인
                </span>
              </div>
            </div>

            {/* Consumer Action CTA Button */}
            <button
              onClick={onEnterConsumer}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-extrabold text-[15px] shadow-md flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer mt-1"
            >
              <span>소비자로 시작하기</span>
              <span className="material-symbols-outlined text-[18px]">
                arrow_forward
              </span>
            </button>
          </div>
        </div>

        {/* Compact Apiary Photo & Quality Indicators */}
        <div className="bg-white border border-[#d6c4ac] rounded-3xl p-3.5 shadow-xs space-y-2.5">
          <div className="relative w-full rounded-2xl overflow-hidden aspect-[21/9] bg-[#d9ebf5]">
            <img
              src={BEEKEEPER_IMG}
              alt="지리산 제1봉장 농업회사법인 허니비테코 주식회사 숙성 벌집꿀 채밀 현장"
              className="w-full h-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute bottom-2 left-3 right-3 text-white flex items-center justify-between text-[11px]">
              <span className="font-bold">지리산 산동면 제1봉장 1년에 1회 자연채밀</span>
              <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-semibold">1+ 등급</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1.5 text-center text-[11px]">
            <div className="bg-[#f4faff] border border-[#d4e5ef] rounded-xl py-1.5 px-1">
              <span className="block font-black text-[13px] text-[#7e5700]">-26.0‰</span>
              <span className="text-[10px] text-[#514532]">탄소동위원소비</span>
            </div>
            <div className="bg-[#f4faff] border border-[#d4e5ef] rounded-xl py-1.5 px-1">
              <span className="block font-black text-[13px] text-[#1b6d24]">16.8%</span>
              <span className="text-[10px] text-[#514532]">자연수분율</span>
            </div>
            <div className="bg-[#f4faff] border border-[#d4e5ef] rounded-xl py-1.5 px-1">
              <span className="block font-black text-[13px] text-[#6b21a8]">불검출</span>
              <span className="text-[10px] text-[#514532]">항생제·농약</span>
            </div>
          </div>
        </div>

        {/* Clean Footer */}
        <footer className="text-center pt-1 text-[11px] text-[#514532]/75 space-y-0.5">
          <p className="font-bold text-[#0d1e25]">
            농업회사법인 허니비테코 주식회사
          </p>
          <p className="text-[10px]">
            전남 구례군 산동면 원달리 205-1 · 010-8020-2583
          </p>
        </footer>
      </main>
    </div>
  );
};
