import React, { useState } from 'react';
import apiaryMapImg from '../assets/images/gurye_sandong_apiary_map_1788273611003.jpg';

interface ApiaryMapSectionProps {
  address?: string;
  isDetailed?: boolean;
}

export const ApiaryMapSection: React.FC<ApiaryMapSectionProps> = ({
  address = '전남광주통합특별시 구례군 산동면 원달리 205-1 번지',
  isDetailed = false
}) => {
  const [mapType, setMapType] = useState<'aerial' | 'terrain' | 'grid'>('aerial');
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopyAddress = () => {
    navigator.clipboard?.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const kakaoMapUrl = `https://map.kakao.com/link/search/${encodeURIComponent('전남 구례군 산동면 원달리 205-1')}`;
  const naverMapUrl = `https://map.naver.com/v5/search/${encodeURIComponent('전남 구례군 산동면 원달리 205-1')}`;

  return (
    <div className="bg-white border-2 border-[#d6c4ac] rounded-3xl p-4 shadow-sm flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#7e5700] text-[22px]">
            location_on
          </span>
          <div>
            <h3 className="font-bold text-[16px] text-[#0d1e25]">
              지리산 제1봉장 위치 안내
            </h3>
            <p className="text-[11px] text-[#514532]">
              청정 밀원수 숲에 둘러싸인 천연 채밀지
            </p>
          </div>
        </div>
        <span className="text-[11px] font-bold text-[#1b6d24] shrink-0">
          소비자 공개 승인 소재지
        </span>
      </div>

      {/* Address Bar */}
      <div className="bg-[#f4faff] p-3 rounded-2xl border border-[#d4e5ef] flex items-center justify-between gap-2">
        <div className="flex items-start gap-2">
          <span className="material-symbols-outlined text-[#7e5700] text-[18px] mt-0.5 shrink-0">
            pin_drop
          </span>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-[#514532]">봉장 주소 (도로명/지번)</span>
            <span className="text-[13px] font-extrabold text-[#0d1e25] break-all select-all">
              {address}
            </span>
          </div>
        </div>
        <button
          onClick={handleCopyAddress}
          className="shrink-0 px-2.5 py-1.5 bg-white border border-[#d6c4ac] hover:bg-[#d9ebf5] rounded-xl text-[11px] font-bold text-[#0d1e25] flex items-center gap-1 active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-[14px]">
            {copied ? 'check' : 'content_copy'}
          </span>
          <span>{copied ? '복사됨' : '복사'}</span>
        </button>
      </div>

      {/* Map Display & Controls */}
      <div className="relative w-full rounded-2xl overflow-hidden border border-[#d6c4ac]/80 shadow-xs bg-[#eef7fc] aspect-[16/9]">
        {/* Map Image Base */}
        <img
          src={apiaryMapImg}
          alt="구례군 산동면 원달리 봉장 항공 지도"
          className="w-full h-full object-cover"
        />

        {/* Map Type Switcher Overlay */}
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-black/60 backdrop-blur-md p-1 rounded-xl border border-white/20 z-10">
          <button
            onClick={() => setMapType('aerial')}
            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all ${
              mapType === 'aerial'
                ? 'bg-[#ffb300] text-[#281900] shadow-xs'
                : 'text-white/80 hover:text-white'
            }`}
          >
            항공위성
          </button>
          <button
            onClick={() => setMapType('terrain')}
            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all ${
              mapType === 'terrain'
                ? 'bg-[#ffb300] text-[#281900] shadow-xs'
                : 'text-white/80 hover:text-white'
            }`}
          >
            지형도
          </button>
        </div>

        {/* Map Pin Overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative flex flex-col items-center">
            {/* Pulsing ring */}
            <span className="absolute -inset-3 rounded-full bg-[#ffb300]/40 animate-ping" />
            <div className="bg-[#7e5700] text-white p-2 rounded-full shadow-lg border-2 border-white relative z-10 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">
                hive
              </span>
            </div>
            <div className="mt-1 bg-black/75 backdrop-blur-sm text-white px-2.5 py-0.5 rounded-full text-[11px] font-bold border border-white/40 shadow-sm flex items-center gap-1">
              <span>원달리 205-1</span>
              <span className="text-[#ffdeac] text-[10px]">(지리산 봉장)</span>
            </div>
          </div>
        </div>

        {/* Altitude & Ecosystem Badge */}
        <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-md border border-white">
          <span className="material-symbols-outlined text-[#1b6d24] text-[16px]">
            terrain
          </span>
          <div className="text-[10px] text-[#0d1e25] font-semibold">
            <span className="font-bold text-[#1b6d24]">해발 480m</span> · 지리산 청정 밀원림
          </div>
        </div>

        {/* Flora Tag */}
        <div className="absolute bottom-2.5 right-2.5 hidden sm:flex items-center gap-1 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-xl text-white text-[10px] font-medium">
          <span>산수유 · 야생화 · 아카시아</span>
        </div>
      </div>

      {/* Map Navigation Links */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        <a
          href={kakaoMapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2.5 rounded-xl bg-[#fee500] hover:bg-[#fedd00] text-[#191919] font-bold text-[12px] flex items-center justify-center gap-1.5 shadow-2xs active:scale-[0.98] transition-all"
        >
          <span className="material-symbols-outlined text-[16px]">map</span>
          <span>카카오맵에서 보기</span>
        </a>

        <a
          href={naverMapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2.5 rounded-xl bg-[#03c75a] hover:bg-[#02b350] text-white font-bold text-[12px] flex items-center justify-center gap-1.5 shadow-2xs active:scale-[0.98] transition-all"
        >
          <span className="material-symbols-outlined text-[16px]">navigation</span>
          <span>네이버 지도로 길찾기</span>
        </a>
      </div>

      {/* Environmental Features */}
      {isDetailed && (
        <div className="grid grid-cols-3 gap-2 pt-1 border-t border-[#d4e5ef] text-center text-[11px]">
          <div className="bg-[#f4faff] p-2 rounded-xl border border-[#d4e5ef]">
            <span className="text-[#514532] block">반경 3km</span>
            <span className="font-bold text-[#0d1e25]">청정보호구역</span>
          </div>
          <div className="bg-[#f4faff] p-2 rounded-xl border border-[#d4e5ef]">
            <span className="text-[#514532] block">주요 밀원</span>
            <span className="font-bold text-[#7e5700]">산수유·밤·야생화</span>
          </div>
          <div className="bg-[#f4faff] p-2 rounded-xl border border-[#d4e5ef]">
            <span className="text-[#514532] block">농약 오염도</span>
            <span className="font-bold text-[#1b6d24]">0% (청정)</span>
          </div>
        </div>
      )}
    </div>
  );
};
