import React, { useState } from 'react';
import { WeatherInfo } from '../types';
import { KOREA_REGION_COORDINATES, LocationGeo } from '../services/weatherService';

interface CompactWeatherBarProps {
  weather: WeatherInfo;
  address: string;
  onWeatherUpdate?: (newWeather: WeatherInfo) => void;
  onAddressChange?: (newAddress: string) => void;
  isLoadingWeather?: boolean;
  onRefreshWeather?: () => void;
}

export const CompactWeatherBar: React.FC<CompactWeatherBarProps> = ({
  weather,
  address,
  onAddressChange,
  isLoadingWeather = false,
  onRefreshWeather
}) => {
  const [showLocationModal, setShowLocationModal] = useState<boolean>(false);
  const [customAddressInput, setCustomAddressInput] = useState<string>('');

  const handleSelectPreset = (geo: LocationGeo) => {
    onAddressChange?.(geo.name);
    setShowLocationModal(false);
  };

  const handleSaveCustomAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (customAddressInput.trim()) {
      onAddressChange?.(customAddressInput.trim());
      setCustomAddressInput('');
      setShowLocationModal(false);
    }
  };

  const shortAddressDisplay = address.split(' ').slice(0, 3).join(' ') || weather.location.split(' ')[1] || '구례군';

  return (
    <div className="w-full">
      {/* Sleek Compact Weather Strip */}
      <div className="bg-white/95 backdrop-blur-md border border-[#d6c4ac]/80 rounded-2xl px-3.5 py-2.5 shadow-2xs flex items-center justify-between gap-2">
        {/* Location & Condition */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => setShowLocationModal(true)}
            className="flex items-center gap-1 text-left hover:opacity-80 transition-opacity min-w-0 group"
            title="봉장 위치 변경 및 기상청 관측소 확인"
          >
            <span className="material-symbols-outlined text-[#7e5700] text-[18px] shrink-0">
              location_on
            </span>
            <div className="flex flex-col min-w-0">
              <span className="text-[12px] sm:text-[13px] font-extrabold text-[#0d1e25] truncate">
                {shortAddressDisplay}
              </span>
              <span className="text-[9px] text-[#7e5700] font-bold truncate hidden sm:inline">
                {weather.stationName || '기상청 관측소'}
              </span>
            </div>
            <span className="material-symbols-outlined text-[#514532] text-[15px] group-hover:text-[#7e5700] shrink-0">
              tune
            </span>
          </button>

          <span className="text-[#d6c4ac]">|</span>

        {/* Weather Icon, Average Condition & Daily Min/Max Temp */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className="material-symbols-outlined text-[#ff9800] text-[20px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            {weather.icon || 'wb_sunny'}
          </span>
          <div className="flex flex-col leading-tight">
            <div className="flex items-center gap-1">
              <span className="text-[13px] sm:text-[14px] font-extrabold text-[#0d1e25]">
                {weather.condition}
              </span>
              <span className="text-[12px] font-bold text-[#7e5700]">
                {weather.temperature}°C
              </span>
            </div>
            <span className="text-[10px] text-[#514532] font-semibold">
              최저 {weather.minTemp ?? Math.round(weather.temperature - 5)}° / 최고 {weather.maxTemp ?? Math.round(weather.temperature + 4)}°
            </span>
          </div>
        </div>
        </div>

        {/* Right: Bee Suitability & Wind & Refresh */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden sm:flex items-center gap-1 text-[11px] text-[#514532]">
            <span className="material-symbols-outlined text-[14px] text-[#7e5700]">
              air
            </span>
            <span>풍속 {weather.windSpeed}m/s</span>
          </div>

          <span
            className={`text-[11px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
              weather.beeFlightScore === '최적'
                ? 'bg-[#1b6d24]/10 text-[#1b6d24] border-[#1b6d24]/30'
                : weather.beeFlightScore === '양호'
                ? 'bg-[#7e5700]/10 text-[#7e5700] border-[#7e5700]/30'
                : 'bg-[#ba1a1a]/10 text-[#ba1a1a] border-[#ba1a1a]/30'
            }`}
          >
            <span>🐝 외역비행 {weather.beeFlightScore}</span>
          </span>

          <button
            onClick={onRefreshWeather}
            disabled={isLoadingWeather}
            title="기상청 실시간 날씨 동기화"
            className="w-7 h-7 rounded-full hover:bg-[#d9ebf5] flex items-center justify-center text-[#514532] transition-all cursor-pointer"
          >
            <span className={`material-symbols-outlined text-[16px] ${isLoadingWeather ? 'animate-spin text-[#7e5700]' : ''}`}>
              sync
            </span>
          </button>
        </div>
      </div>

      {/* Location Preset & Address Edit Modal */}
      {showLocationModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl border-2 border-[#7e5700] animate-in fade-in zoom-in duration-150 space-y-3.5">
            <div className="flex justify-between items-center border-b border-[#d4e5ef] pb-2.5">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[#7e5700] text-[20px]">
                  cloud_sync
                </span>
                <h4 className="font-extrabold text-[16px] text-[#0d1e25]">
                  봉장 주소 및 기상청 연동
                </h4>
              </div>
              <button
                onClick={() => setShowLocationModal(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-[#514532] hover:bg-[#d9ebf5]"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="bg-[#f4faff] p-3 rounded-2xl border border-[#d4e5ef] text-[12px] space-y-1">
              <div className="flex items-center justify-between font-bold text-[#0d1e25]">
                <span>현재 연동 주소:</span>
                <span className="text-[#7e5700] text-right truncate max-w-[180px]">{address}</span>
              </div>
              <div className="flex items-center justify-between text-[#514532] text-[11px]">
                <span>기상청 관측소:</span>
                <span className="font-semibold text-[#1b6d24]">{weather.stationName}</span>
              </div>
            </div>

            {/* Custom Address Input Form */}
            <form onSubmit={handleSaveCustomAddress} className="space-y-2">
              <span className="text-[11px] font-bold text-[#514532] block">
                봉장 주소 직접 입력 (내 정보 주소 변경):
              </span>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={customAddressInput}
                  onChange={(e) => setCustomAddressInput(e.target.value)}
                  placeholder="예: 전남 구례군 산동면, 경남 산청군..."
                  className="flex-1 bg-[#fffdf8] border border-[#d6c4ac] rounded-xl px-3 py-2 text-[12px] text-[#0d1e25] focus:outline-none focus:border-[#7e5700]"
                />
                <button
                  type="submit"
                  disabled={!customAddressInput.trim()}
                  className="px-3 py-2 bg-[#7e5700] hover:bg-[#604100] text-white rounded-xl text-[12px] font-bold transition-all disabled:opacity-50"
                >
                  적용
                </button>
              </div>
            </form>

            {/* Popular Beekeeping Region Presets */}
            <div>
              <span className="text-[11px] font-bold text-[#514532] block mb-1.5">
                주요 양봉 밀원지 빠른 선택:
              </span>
              <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                {Object.values(KOREA_REGION_COORDINATES).slice(0, 10).map((geo) => (
                  <button
                    key={geo.name}
                    onClick={() => handleSelectPreset(geo)}
                    className={`p-2 rounded-xl text-[11px] font-bold text-left transition-all border ${
                      address.includes(geo.name.split(' ')[1] || '구례')
                        ? 'bg-[#ffdeac] text-[#281900] border-[#7e5700]'
                        : 'bg-[#f4faff] hover:bg-[#d9ebf5] text-[#0d1e25] border-[#d6c4ac]/60'
                    }`}
                  >
                    <div className="truncate">{geo.name}</div>
                    <div className="text-[9px] text-[#514532] font-normal truncate">{geo.stationName}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

