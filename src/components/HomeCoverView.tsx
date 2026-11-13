import React from 'react';
import { TabType, WeatherInfo } from '../types';
import { UserProfile } from '../services/userProfile';
import { LOGO_URL } from '../data/mockData';

interface HomeCoverViewProps {
  onNavigate: (tab: TabType) => void;
  onStartQuickVoiceRecord: () => void;
  weather: WeatherInfo;
  userProfile: UserProfile;
}

// Convert any technical icon names or English strings to clean Korean & emojis
const formatWeatherDisplay = (condition: string, icon?: string) => {
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

export const HomeCoverView: React.FC<HomeCoverViewProps> = ({
  onNavigate,
  onStartQuickVoiceRecord,
  weather,
  userProfile
}) => {
  const todayStr = new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short'
  }).format(new Date());

  const weatherDisplay = formatWeatherDisplay(weather.condition, weather.icon);

  // 4 Primary Launcher Cards with requested icons and direct navigation arrows
  const primaryFeatures = [
    {
      id: 'record' as TabType,
      title: '양봉기록',
      subtitle: '음성 내검 & 스마트 달력 일지',
      iconName: 'mic',
      iconEmoji: '🎤',
      badge: '음성 내검',
      accentColor: 'text-[#7e5700]',
      bgColor: 'bg-[#fff9ef]',
      borderColor: 'border-[#ffdeac]',
      hoverBorder: 'hover:border-[#7e5700]',
      ringColor: 'hover:ring-2 hover:ring-[#ffdeac]',
      arrowBg: 'bg-[#ffdeac] text-[#7e5700]',
      tags: ['말하는 대로 자동정리', '벌통별 내검 이력']
    },
    {
      id: 'hives' as TabType,
      title: '종봉관리',
      subtitle: '여왕벌 계보 & 한눈에 가계도',
      iconName: 'hive',
      iconEmoji: '🐝',
      badge: '여왕벌 혈통',
      accentColor: 'text-[#1b6d24]',
      bgColor: 'bg-[#f4fbf5]',
      borderColor: 'border-[#c8e6c9]',
      hoverBorder: 'hover:border-[#1b6d24]',
      ringColor: 'hover:ring-2 hover:ring-[#c8e6c9]',
      arrowBg: 'bg-[#c8e6c9] text-[#1b6d24]',
      tags: ['F0~F3 모계 혈통', '채밀·프로폴리스 4대 수치']
    },
    {
      id: 'analysis' as TabType,
      title: '수익성 분석',
      subtitle: '채밀량 집계 & 양봉 경영 분석',
      iconName: 'payments',
      iconEmoji: '💰',
      badge: '경영 분석',
      accentColor: 'text-[#0277bd]',
      bgColor: 'bg-[#f4faff]',
      borderColor: 'border-[#b3e5fc]',
      hoverBorder: 'hover:border-[#0277bd]',
      ringColor: 'hover:ring-2 hover:ring-[#b3e5fc]',
      arrowBg: 'bg-[#b3e5fc] text-[#0277bd]',
      tags: ['벌통당 생산성', '수밀량 및 원가/마진']
    },
    {
      id: 'trace' as TabType,
      title: '꿀이력제',
      subtitle: '소비자 안심 품질인증 & QR 추적',
      iconName: 'verified',
      iconEmoji: '🛡️',
      badge: '품질 인증',
      accentColor: 'text-[#6b21a8]',
      bgColor: 'bg-[#faf5ff]',
      borderColor: 'border-[#e9d5ff]',
      hoverBorder: 'hover:border-[#6b21a8]',
      ringColor: 'hover:ring-2 hover:ring-[#e9d5ff]',
      arrowBg: 'bg-[#f3e8ff] text-[#6b21a8]',
      tags: ['탄소동위원소비 성적서', '소비자 안심 QR']
    }
  ];

  return (
    <div className="max-w-md mx-auto px-4 pt-20 pb-28 space-y-4">
      {/* 1. Apiary Header & Greeting Card */}
      <div className="bg-white border border-[#d6c4ac] rounded-3xl p-4 shadow-xs relative overflow-hidden">
        {/* Subtle background honeycomb glow */}
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-[#ffdeac]/30 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between mb-3 relative z-10">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-white border border-[#d6c4ac]/60 p-1 flex items-center justify-center shadow-xs shrink-0">
              <img
                src="/honeybee_teco_logo.svg"
                alt="농업회사법인 허니비테코 주식회사 로고"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-extrabold text-[#7e5700] uppercase tracking-wider block">
                스마트 양봉 케어 솔루션
              </span>
              <h1 className="text-[14.5px] font-black text-[#0d1e25] leading-snug truncate">
                {userProfile.farmName || '농업회사법인 허니비테코 주식회사'}
              </h1>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-black bg-[#ffdeac] text-[#7e5700]">
              벌통 {userProfile.hiveCount || 50}통 관리
            </span>
          </div>
        </div>

        {/* Today's Weather & Bee Flight Status Strip */}
        <div className="bg-[#f4faff] border border-[#d4e5ef] rounded-2xl p-2.5 flex items-center justify-between gap-2 relative z-10">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[22px] leading-none shrink-0" role="img" aria-label={weatherDisplay.text}>
              {weatherDisplay.emoji}
            </span>
            <div className="truncate">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-[13px] text-[#0d1e25]">
                  {weather.temperature}°C {weatherDisplay.text}
                </span>
                <span className="text-[10px] font-bold text-[#1b6d24] bg-[#a0f399]/40 px-1.5 py-0.2 rounded-full">
                  꿀벌 비행 {weather.beeFlightScore || '최적'}
                </span>
              </div>
              <p className="text-[10px] text-[#514532] truncate">
                {userProfile.apiaryLocation || weather.location || '전남 구례군 산동면'} · {todayStr}
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigate('record')}
            className="shrink-0 px-2 py-1 text-[11px] font-bold text-[#7e5700] hover:bg-white rounded-lg transition-colors flex items-center gap-0.5 cursor-pointer"
          >
            <span>상세</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          </button>
        </div>
      </div>

      {/* 2. One-Touch Quick Voice Record Banner (현장 작업자 전용) */}
      <div className="bg-gradient-to-r from-[#7e5700] to-[#9c6c00] rounded-3xl p-4 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <span className="inline-flex items-center gap-1 text-[10px] font-black bg-white/20 px-2 py-0.5 rounded-full tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-[#a0f399] animate-pulse" />
              장갑 낀 손으로 원터치
            </span>
            <h2 className="text-[16px] font-black tracking-tight">
              현장 음성 내검 기록
            </h2>
            <p className="text-[11px] text-white/90 leading-tight">
              "1번통 여왕 산란 양호, 꿀 3키로" 말하면 끝!
            </p>
          </div>

          <button
            onClick={onStartQuickVoiceRecord}
            className="w-13 h-13 rounded-2xl bg-white text-[#7e5700] flex items-center justify-center shadow-lg active:scale-95 transition-all cursor-pointer hover:bg-[#fff9ef] shrink-0"
            aria-label="즉시 음성 녹음 시작"
          >
            <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              mic
            </span>
          </button>
        </div>
      </div>

      {/* 3. The 4 Big Core Launcher Cards with Requested Icons & Navigation Arrows */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-[13px] font-black text-[#0d1e25] flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[#7e5700] text-[17px]">grid_view</span>
            <span>핵심 메뉴 바로가기</span>
          </h3>
          <span className="text-[11px] text-[#514532]">터치하여 바로 이동</span>
        </div>

        <div className="grid grid-cols-1 gap-2.5">
          {primaryFeatures.map((item) => (
            <div
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`${item.bgColor} border ${item.borderColor} ${item.hoverBorder} ${item.ringColor} rounded-2xl p-3.5 shadow-2xs transition-all duration-150 cursor-pointer active:scale-[0.98] flex items-center justify-between gap-3 group`}
            >
              {/* Left: Icon & Title info */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-white border border-[#d6c4ac]/40 shadow-xs flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <span
                    className={`material-symbols-outlined text-[28px] ${item.accentColor}`}
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {item.iconName}
                  </span>
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <h4 className="text-[16px] font-black text-[#0d1e25] tracking-tight">
                      {item.title}
                    </h4>
                    <span className="text-[12px]">{item.iconEmoji}</span>
                    <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-md ${item.arrowBg}`}>
                      {item.badge}
                    </span>
                  </div>
                  <p className="text-[11px] font-semibold text-[#514532] truncate">
                    {item.subtitle}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    {item.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="text-[9px] font-bold text-[#514532]/80 bg-white/70 px-1.5 py-0.2 rounded border border-[#d6c4ac]/30"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: Big Prominent Arrow Button */}
              <div className="shrink-0">
                <div
                  className={`w-9 h-9 rounded-full ${item.arrowBg} flex items-center justify-center shadow-xs group-hover:translate-x-1 transition-transform`}
                >
                  <span className="material-symbols-outlined text-[20px] font-bold">
                    arrow_forward
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Quick Help Footer Note */}
      <div className="text-center pt-2">
        <p className="text-[11px] text-[#514532]/70">
          언제든 상단의 <b>[홈]</b> 아이콘을 누르면 이 첫 표지 화면으로 돌아옵니다.
        </p>
      </div>
    </div>
  );
};
