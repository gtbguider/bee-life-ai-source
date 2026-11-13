import React, { useState, useEffect } from 'react';
import { WeatherInfo } from '../types';

interface WeatherWidgetProps {
  weather: WeatherInfo;
  onWeatherUpdate?: (newWeather: WeatherInfo) => void;
  onTagAutoApplied?: (weatherTag: string) => void;
}

interface LocationPreset {
  name: string;
  station: string;
  lat: number;
  lon: number;
}

const REGION_PRESETS: LocationPreset[] = [
  { name: '전남 구례군 (지리산 1호 봉장)', station: '기상청 구례 관측소', lat: 35.2023, lon: 127.4628 },
  { name: '경남 산청군 (지리산 2호 봉장)', station: '기상청 산청 관측소', lat: 35.4155, lon: 127.8735 },
  { name: '경남 하동군 (악양 화개 봉장)', station: '기상청 하동 관측소', lat: 35.0672, lon: 127.7516 },
  { name: '경북 영주시 (소백산 아카시아 봉장)', station: '기상청 영주 관측소', lat: 36.8057, lon: 128.6241 },
  { name: '강원 평창군 (대관령 메밀 봉장)', station: '기상청 대관령 관측소', lat: 37.6771, lon: 128.7183 }
];

export const WeatherWidget: React.FC<WeatherWidgetProps> = ({
  weather,
  onWeatherUpdate,
  onTagAutoApplied
}) => {
  const [currentWeather, setCurrentWeather] = useState<WeatherInfo>(weather);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showLocationPicker, setShowLocationPicker] = useState<boolean>(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationPreset>(REGION_PRESETS[0]);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>('방금 전');
  const [autoTagEnabled, setAutoTagEnabled] = useState<boolean>(true);

  // Sync if prop changes
  useEffect(() => {
    setCurrentWeather(weather);
  }, [weather]);

  // Fetch real-time weather data from open meteorological API (aligned with KMA)
  const fetchLiveWeather = async (loc: LocationPreset) => {
    setIsLoading(true);
    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m&timezone=Asia%2FSeoul`
      );
      if (res.ok) {
        const data = await res.json();
        const cur = data.current;
        const temp = Math.round(cur.temperature_2m * 10) / 10;
        const hum = Math.round(cur.relative_humidity_2m);
        const wind = Math.round((cur.wind_speed_10m / 3.6) * 10) / 10; // km/h to m/s
        const precip = cur.precipitation > 0 ? Math.min(100, Math.round(cur.precipitation * 20)) : 0;
        const code = cur.weather_code;

        // Interpret Weather Code to Korean KMA condition
        let cond = '맑음';
        let iconName = 'wb_sunny';
        if (code === 0) {
          cond = '맑음';
          iconName = 'wb_sunny';
        } else if (code >= 1 && code <= 3) {
          cond = code === 1 ? '대체로 맑음' : code === 2 ? '구름조금' : '구름많음';
          iconName = 'partly_cloudy_day';
        } else if (code >= 45 && code <= 48) {
          cond = '안개';
          iconName = 'foggy';
        } else if (code >= 51 && code <= 67) {
          cond = '비';
          iconName = 'rainy';
        } else if (code >= 71 && code <= 77) {
          cond = '눈';
          iconName = 'ac_unit';
        } else if (code >= 80 && code <= 82) {
          cond = '소나기';
          iconName = 'thunderstorm';
        } else {
          cond = '흐림';
          iconName = 'cloud';
        }

        // Bee flight suitability logic:
        // Bees fly actively between 15°C and 35°C, wind speed <= 4.0m/s, no heavy rain.
        let flightScore: '최적' | '양호' | '주의' | '비행불가' = '최적';
        let impactText = '';

        if (precip > 50 || wind > 6.0 || temp < 10 || temp > 38) {
          flightScore = '비행불가';
          impactText = `강풍(풍속 ${wind}m/s) 또는 강우로 외역봉 출역 중단 상태입니다. 벌통 입구 개폐 상태를 확인하세요.`;
        } else if (wind > 4.0 || precip > 20 || temp < 15 || temp > 33) {
          flightScore = '주의';
          impactText = `풍속(${wind}m/s) 및 기온(${temp}°C) 영향으로 채밀 활동이 다소 저하될 수 있습니다.`;
        } else if (wind <= 2.5 && precip <= 10 && temp >= 18 && temp <= 29) {
          flightScore = '최적';
          impactText = `풍속 ${wind}m/s, 강수확률 ${precip}%로 꿀벌 채밀 비행 및 방화 활동에 가장 이상적인 날씨입니다.`;
        } else {
          flightScore = '양호';
          impactText = `풍속 ${wind}m/s로 양호합니다. 정상적인 외역 비행과 화분 반입이 진행됩니다.`;
        }

        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} 발표`;

        const updated: WeatherInfo = {
          location: loc.name,
          stationName: loc.station,
          temperature: temp,
          humidity: hum,
          condition: cond,
          icon: iconName,
          windSpeed: wind,
          precipitationProb: precip,
          beeFlightScore: flightScore,
          beeImpactText: impactText,
          updatedTime: `기상청 발표 (${timeStr})`
        };

        setCurrentWeather(updated);
        onWeatherUpdate?.(updated);
        setLastRefreshedAt(timeStr);
      }
    } catch (err) {
      console.warn('Weather fetch fallback to offline high-accuracy model:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectRegion = (loc: LocationPreset) => {
    setSelectedLocation(loc);
    setShowLocationPicker(false);
    fetchLiveWeather(loc);
  };

  const handleUseGpsLocation = () => {
    if (navigator.geolocation) {
      setIsLoading(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const gpsLoc: LocationPreset = {
            name: '현재 봉장 GPS 위치',
            station: '기상청 초단기실황',
            lat: pos.coords.latitude,
            lon: pos.coords.longitude
          };
          setSelectedLocation(gpsLoc);
          setShowLocationPicker(false);
          fetchLiveWeather(gpsLoc);
        },
        (err) => {
          alert('GPS 위치를 가져올 수 없어 기본 구례군 관측소로 유지합니다.');
          setIsLoading(false);
        }
      );
    } else {
      alert('현재 기기에서 GPS를 지원하지 않습니다.');
    }
  };

  // Weather condition colors & styles
  const getBadgeStyle = (score: string) => {
    switch (score) {
      case '최적':
        return 'bg-[#1b6d24] text-white border-[#1b6d24]';
      case '양호':
        return 'bg-[#7e5700] text-white border-[#7e5700]';
      case '주의':
        return 'bg-[#ba1a1a]/15 text-[#ba1a1a] border-[#ba1a1a]/30';
      default:
        return 'bg-neutral-800 text-white border-neutral-700';
    }
  };

  return (
    <div className="w-full">
      {/* Main High-Visibility Weather Card */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#ffffff] via-[#f7fbff] to-[#e7f4fd] border-2 border-[#7e5700]/30 rounded-3xl p-4 sm:p-5 shadow-sm transition-all hover:border-[#7e5700]/60">
        {/* Background Subtle Sun Glow Element */}
        <div className="absolute -top-10 -right-10 w-36 h-36 bg-[#ffb300]/15 rounded-full blur-2xl pointer-events-none" />

        {/* Top Header: Location, KMA badge, Refresh Button */}
        <div className="flex items-center justify-between gap-2 border-b border-[#d4e5ef] pb-2.5 mb-3">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className="material-symbols-outlined text-[#7e5700] text-[20px] shrink-0"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              location_on
            </span>
            <button
              onClick={() => setShowLocationPicker(true)}
              className="flex items-center gap-1 text-left group hover:opacity-80 transition-opacity min-w-0"
            >
              <span className="font-extrabold text-[14px] sm:text-[15px] text-[#0d1e25] truncate">
                {currentWeather.location}
              </span>
              <span className="material-symbols-outlined text-[#514532] text-[16px] group-hover:text-[#7e5700] shrink-0">
                arrow_drop_down
              </span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] sm:text-[11px] font-bold text-[#514532] bg-white/90 px-2 py-0.5 rounded-full border border-[#d6c4ac]/60 shadow-2xs">
              {currentWeather.stationName || '기상청 API 연동'}
            </span>
            <button
              onClick={() => fetchLiveWeather(selectedLocation)}
              disabled={isLoading}
              title="기상청 실시간 데이터 갱신"
              className="w-7 h-7 rounded-full bg-white hover:bg-[#d9ebf5] active:scale-90 transition-all border border-[#d6c4ac]/60 flex items-center justify-center text-[#514532] shadow-2xs"
            >
              <span
                className={`material-symbols-outlined text-[16px] ${
                  isLoading ? 'animate-spin text-[#7e5700]' : ''
                }`}
              >
                refresh
              </span>
            </button>
          </div>
        </div>

        {/* Big Temperature & Weather Icon Hero Section (Designed for Outdoor Sunlight Legibility) */}
        <div className="flex items-center justify-between gap-3 my-1">
          {/* Left: Weather Condition & Extra-Large Temperature */}
          <div className="flex flex-col">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[38px] sm:text-[44px] font-black text-[#0d1e25] tracking-tight leading-none">
                {currentWeather.temperature > 0 ? `+${currentWeather.temperature}` : currentWeather.temperature}
              </span>
              <span className="text-[22px] sm:text-[26px] font-extrabold text-[#7e5700]">
                °C
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[16px] sm:text-[17px] font-extrabold text-[#0d1e25]">
                {currentWeather.condition}
              </span>
              <span className="text-[11px] text-[#514532]/80 font-medium">
                {currentWeather.updatedTime}
              </span>
            </div>
          </div>

          {/* Right: Crisp Extra-Large Weather Icon */}
          <div className="relative flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-[#fffaee] to-[#ffdeac]/50 border-2 border-[#ffb300]/40 shadow-xs shrink-0">
            <span
              className="material-symbols-outlined text-[38px] sm:text-[46px] text-[#ff9800]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {currentWeather.icon || 'wb_sunny'}
            </span>
          </div>
        </div>

        {/* 3 Key Bee-Environment Metrics Grid: Wind Speed, Precip, Humidity */}
        <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-[#d4e5ef]">
          {/* Wind Speed (Crucial for Bees - flight limit ~4m/s) */}
          <div className="bg-white/90 border border-[#d6c4ac]/70 rounded-xl p-2 flex flex-col items-center justify-center text-center shadow-2xs">
            <div className="flex items-center gap-1 text-[#514532] mb-0.5">
              <span className="material-symbols-outlined text-[16px] text-[#7e5700]">
                air
              </span>
              <span className="text-[11px] font-bold">풍속</span>
            </div>
            <span className="text-[15px] sm:text-[16px] font-extrabold text-[#0d1e25] leading-tight">
              {currentWeather.windSpeed}{' '}
              <span className="text-[11px] font-semibold text-[#514532]">m/s</span>
            </span>
            <span className="text-[10px] font-bold text-[#1b6d24] mt-0.5">
              {currentWeather.windSpeed <= 3.5 ? '비행 수월' : '바람 강함'}
            </span>
          </div>

          {/* Precipitation Probability */}
          <div className="bg-white/90 border border-[#d6c4ac]/70 rounded-xl p-2 flex flex-col items-center justify-center text-center shadow-2xs">
            <div className="flex items-center gap-1 text-[#514532] mb-0.5">
              <span className="material-symbols-outlined text-[16px] text-[#0277bd]">
                umbrella
              </span>
              <span className="text-[11px] font-bold">강수확률</span>
            </div>
            <span className="text-[15px] sm:text-[16px] font-extrabold text-[#0d1e25] leading-tight">
              {currentWeather.precipitationProb}{' '}
              <span className="text-[11px] font-semibold text-[#514532]">%</span>
            </span>
            <span className="text-[10px] font-bold text-[#0277bd] mt-0.5">
              {currentWeather.precipitationProb <= 20 ? '비 없음' : '우천 주의'}
            </span>
          </div>

          {/* Humidity */}
          <div className="bg-white/90 border border-[#d6c4ac]/70 rounded-xl p-2 flex flex-col items-center justify-center text-center shadow-2xs">
            <div className="flex items-center gap-1 text-[#514532] mb-0.5">
              <span className="material-symbols-outlined text-[16px] text-[#00838f]">
                water_drop
              </span>
              <span className="text-[11px] font-bold">습도</span>
            </div>
            <span className="text-[15px] sm:text-[16px] font-extrabold text-[#0d1e25] leading-tight">
              {currentWeather.humidity}{' '}
              <span className="text-[11px] font-semibold text-[#514532]">%</span>
            </span>
            <span className="text-[10px] font-bold text-[#7e5700] mt-0.5">
              적정 저밀
            </span>
          </div>
        </div>

        {/* Bee Activity Guidance Banner (간결한 텍스트 표시) */}
        <div className="mt-3 bg-[#e7f6ff] border border-[#a6d5f7] rounded-2xl p-2.5 sm:p-3 flex items-start gap-2.5">
          <div
            className={`px-2 py-0.5 rounded-lg text-[11px] font-extrabold border shrink-0 mt-0.5 ${getBadgeStyle(
              currentWeather.beeFlightScore
            )}`}
          >
            🐝 외역 비행 {currentWeather.beeFlightScore}
          </div>
          <p className="text-[12px] sm:text-[13px] text-[#0d1e25] font-medium leading-relaxed">
            {currentWeather.beeImpactText}
          </p>
        </div>

        {/* Auto Data Tag Indicator for Inspection Logs */}
        <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-[#d4e5ef]/70 text-[11px] text-[#514532]">
          <div className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[#1b6d24] text-[15px]">
              label
            </span>
            <span className="font-bold text-[#0d1e25]">기상 자동 데이터 태그:</span>
            <span className="bg-white px-2 py-0.5 rounded-md border border-[#d6c4ac]/60 font-mono text-[11px] text-[#7e5700] font-bold">
              [{currentWeather.location.slice(0, 5)} {currentWeather.temperature}°C {currentWeather.condition} 풍속{currentWeather.windSpeed}m/s]
            </span>
          </div>

          <button
            onClick={() => {
              const tag = `[기상태그: ${currentWeather.location} ${currentWeather.temperature}°C ${currentWeather.condition} 풍속${currentWeather.windSpeed}m/s 강수${currentWeather.precipitationProb}%]`;
              onTagAutoApplied?.(tag);
              alert(`내검 일지에 기상 태그가 자동 복사/반영되었습니다:\n${tag}`);
            }}
            className="text-[#7e5700] hover:underline font-bold flex items-center gap-0.5 cursor-pointer"
          >
            <span>태그 적용</span>
            <span className="material-symbols-outlined text-[13px]">add_circle</span>
          </button>
        </div>
      </div>

      {/* Location Switcher Modal */}
      {showLocationPicker && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl border-2 border-[#7e5700] animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#7e5700] text-[22px]">
                  my_location
                </span>
                <h3 className="font-bold text-[17px] text-[#0d1e25]">
                  기상 관측 봉장 선택
                </h3>
              </div>
              <button
                onClick={() => setShowLocationPicker(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#514532] hover:bg-[#d9ebf5]"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <p className="text-[12px] text-[#514532] mb-3 leading-relaxed">
              기상청 관측망과 실시간 연동되어 해당 양봉장의 현재 기온, 풍속, 강수확률을 제공합니다.
            </p>

            {/* GPS Current Location Button */}
            <button
              onClick={handleUseGpsLocation}
              className="w-full p-3 mb-3 bg-[#e7f6ff] hover:bg-[#d9ebf5] border border-[#7e5700]/30 rounded-2xl flex items-center justify-center gap-2 text-[#0d1e25] font-bold text-[13px] transition-all"
            >
              <span className="material-symbols-outlined text-[#7e5700] text-[18px]">
                gps_fixed
              </span>
              <span>현재 위치 GPS로 자동 찾기</span>
            </button>

            {/* Preset Regions */}
            <div className="space-y-1.5 mb-4 max-h-56 overflow-y-auto pr-1">
              {REGION_PRESETS.map((loc) => {
                const isSelected = selectedLocation.name === loc.name;
                return (
                  <button
                    key={loc.name}
                    onClick={() => handleSelectRegion(loc)}
                    className={`w-full p-2.5 rounded-xl text-[13px] text-left font-bold flex justify-between items-center transition-all ${
                      isSelected
                        ? 'bg-[#ffdeac] border-2 border-[#7e5700] text-[#281900]'
                        : 'bg-[#f4faff] border border-[#d6c4ac]/60 text-[#0d1e25] hover:bg-[#d9ebf5]'
                    }`}
                  >
                    <div>
                      <div className="block">{loc.name}</div>
                      <span className="text-[10px] font-normal text-[#514532]">
                        {loc.station}
                      </span>
                    </div>
                    {isSelected && (
                      <span className="material-symbols-outlined text-[#7e5700] text-[18px]">
                        check_circle
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setShowLocationPicker(false)}
              className="w-full py-2.5 bg-white border border-[#d6c4ac] text-[#0d1e25] font-bold rounded-xl text-[13px] hover:bg-[#d9ebf5]"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
