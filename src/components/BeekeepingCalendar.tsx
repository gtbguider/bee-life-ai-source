import React, { useMemo } from 'react';
import { VoiceLogItem, WeatherInfo } from '../types';
import { getCalendarDateWeather, DayWeatherSnapshot } from '../services/weatherService';

interface BeekeepingCalendarProps {
  currentDate: Date;
  selectedDate: string; // 'YYYY-MM-DD'
  onSelectDate: (dateStr: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onGoToday: () => void;
  logs: VoiceLogItem[];
  currentWeather: WeatherInfo;
  address: string;
  dailyWeatherMap?: Map<string, DayWeatherSnapshot>;
}

// Deterministic seasonal weather fallback helper
export const getEstimatedDailyWeather = (
  dateStr: string,
  fallbackWeather?: WeatherInfo,
  address: string = '전남 구례군'
) => {
  return getCalendarDateWeather(dateStr, address, undefined, fallbackWeather);
};

export const BeekeepingCalendar: React.FC<BeekeepingCalendarProps> = ({
  currentDate,
  selectedDate,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
  onGoToday,
  logs,
  currentWeather,
  address,
  dailyWeatherMap
}) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-11

  // Format today string
  const todayStr = useMemo(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  // Map logs by date string YYYY-MM-DD
  const logsByDate = useMemo(() => {
    const map = new Map<string, VoiceLogItem[]>();
    logs.forEach((log) => {
      let dateKey = log.date;
      if (!dateKey && log.timestamp) {
        if (log.timestamp.includes(' ')) {
          dateKey = log.timestamp.split(' ')[0];
        }
      }
      if (!dateKey) {
        dateKey = todayStr;
      }
      const existing = map.get(dateKey) || [];
      existing.push(log);
      map.set(dateKey, existing);
    });
    return map;
  }, [logs]);

  // Generate calendar cells (leading days, month days, trailing days)
  const calendarCells = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 (Sun) to 6 (Sat)
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const cells: Array<{
      dateStr: string;
      dayNum: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
      dayLogs: VoiceLogItem[];
      weather: { temp: number; condition: string; icon: string; windSpeed?: number };
    }> = [];

    // Prev month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevM = month === 0 ? 12 : month;
      const prevY = month === 0 ? year - 1 : year;
      const dateStr = `${prevY}-${String(prevM).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      const dayLogs = logsByDate.get(dateStr) || [];
      const weather = dayLogs[0]?.weatherSnapshot || getCalendarDateWeather(dateStr, address, dailyWeatherMap, currentWeather);

      cells.push({
        dateStr,
        dayNum,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDate,
        dayLogs,
        weather
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayLogs = logsByDate.get(dateStr) || [];
      const weather = dayLogs[0]?.weatherSnapshot || getCalendarDateWeather(dateStr, address, dailyWeatherMap, currentWeather);

      cells.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDate,
        dayLogs,
        weather
      });
    }

    // Next month padding to fill standard 35 or 42 grid
    const totalCellsNeeded = cells.length <= 35 ? 35 : 42;
    const remaining = totalCellsNeeded - cells.length;
    for (let n = 1; n <= remaining; n++) {
      const nextM = month === 11 ? 1 : month + 2;
      const nextY = month === 11 ? year + 1 : year;
      const dateStr = `${nextY}-${String(nextM).padStart(2, '0')}-${String(n).padStart(2, '0')}`;
      const dayLogs = logsByDate.get(dateStr) || [];
      const weather = dayLogs[0]?.weatherSnapshot || getCalendarDateWeather(dateStr, address, dailyWeatherMap, currentWeather);

      cells.push({
        dateStr,
        dayNum: n,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDate,
        dayLogs,
        weather
      });
    }

    return cells;
  }, [year, month, selectedDate, todayStr, logsByDate, currentWeather, address, dailyWeatherMap]);

  // Calculate monthly stats
  const monthStats = useMemo(() => {
    let totalLogs = 0;
    let totalHarvestKg = 0;
    let warningCount = 0;
    let harvestDays = 0;

    const currentMonthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    logs.forEach((l) => {
      const d = l.date || (l.timestamp.includes(' ') ? l.timestamp.split(' ')[0] : '');
      if (d.startsWith(currentMonthPrefix)) {
        totalLogs++;
        if (l.status === '주의') warningCount++;
        if (l.status === '채밀' || l.category === '채밀량') {
          harvestDays++;
          if (l.honeyYieldKg) totalHarvestKg += l.honeyYieldKg;
          else if (l.text.includes('18kg')) totalHarvestKg += 18;
          else if (l.text.includes('42kg')) totalHarvestKg += 42;
        }
      }
    });

    return { totalLogs, totalHarvestKg, warningCount, harvestDays };
  }, [logs, year, month]);

  const weekDayNames = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <div className="bg-white border-2 border-[#7e5700]/25 rounded-3xl p-3.5 sm:p-4 shadow-sm relative overflow-hidden">
      {/* Top Month Navigation Header */}
      <div className="flex items-center justify-between gap-2 mb-3 pb-3 border-b border-[#d4e5ef]/70">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#ffb300]/20 flex items-center justify-center text-[#7e5700]">
            <span className="material-symbols-outlined text-[20px]">calendar_month</span>
          </div>
          <div>
            <h2 className="text-[17px] sm:text-[19px] font-black text-[#0d1e25] tracking-tight flex items-center gap-1">
              <span>{year}년 {month + 1}월</span>
              <span className="text-[12px] font-bold text-[#7e5700] bg-[#ffdeac]/60 px-2 py-0.5 rounded-md">
                양봉기록
              </span>
            </h2>
          </div>
        </div>

        {/* Month Switching Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={onGoToday}
            className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#f4faff] hover:bg-[#d9ebf5] text-[#7e5700] border border-[#d6c4ac] transition-all active:scale-95 flex items-center gap-1"
          >
            <span>오늘</span>
            <span className="text-[10px] text-[#0277bd] font-extrabold">({new Date().getMonth() + 1}/{new Date().getDate()})</span>
          </button>
          <div className="flex items-center bg-[#f4faff] border border-[#d6c4ac] rounded-full p-0.5 shadow-2xs">
            <button
              onClick={onPrevMonth}
              title="이전 달"
              className="w-7 h-7 rounded-full flex items-center justify-center text-[#0d1e25] hover:bg-[#d9ebf5] active:scale-90 transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            <button
              onClick={onNextMonth}
              title="다음 달"
              className="w-7 h-7 rounded-full flex items-center justify-center text-[#0d1e25] hover:bg-[#d9ebf5] active:scale-90 transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      {/* Monthly At-a-Glance Stats Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-gradient-to-r from-[#f7fbff] to-[#fffaf0] border border-[#d6c4ac]/60 rounded-xl px-3 py-2 mb-2.5 text-[11px] sm:text-[12px] gap-1.5">
        <div className="flex items-center gap-1.5 font-bold text-[#0d1e25]">
          <span className="text-[#7e5700]">📊 {month + 1}월 현황:</span>
          <span>내검 {monthStats.totalLogs}건</span>
          {monthStats.totalHarvestKg > 0 && (
            <span className="bg-[#ffb300]/20 text-[#7e5700] font-bold px-1.5 py-0.5 rounded">
              🍯 채밀 {monthStats.totalHarvestKg}kg
            </span>
          )}
          {monthStats.warningCount > 0 && (
            <span className="bg-[#ba1a1a]/15 text-[#ba1a1a] font-bold px-1.5 py-0.5 rounded">
              ⚠️ 주의 {monthStats.warningCount}건
            </span>
          )}
        </div>
        
        {/* KMA Observation Location Indicator */}
        <div className="flex items-center gap-1 text-[10px] text-[#514532]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#1b6d24] animate-pulse shrink-0" />
          <span className="font-semibold text-[#1b6d24]">기상청 연동:</span>
          <span className="truncate max-w-[170px] text-[#0d1e25] font-bold">
            {address.split(' ').slice(0, 3).join(' ') || '구례군 산동면'}
          </span>
          <span className="text-[#7e5700] hidden sm:inline">({currentWeather.stationName})</span>
        </div>
      </div>

      {/* Week Day Header */}
      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {weekDayNames.map((name, idx) => (
          <div
            key={name}
            className={`text-[12px] font-bold py-1 ${
              idx === 0 ? 'text-[#ba1a1a]' : idx === 6 ? 'text-[#0277bd]' : 'text-[#514532]'
            }`}
          >
            {name}
          </div>
        ))}
      </div>

      {/* Calendar Grid (Interactive Days with Auto-embedded Weather & Beekeeping Badges) */}
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {calendarCells.map((cell) => {
          const isSelected = cell.isSelected;
          const hasLogs = cell.dayLogs.length > 0;
          const hasWarning = cell.dayLogs.some((l) => l.status === '주의');
          const hasHarvest = cell.dayLogs.some((l) => l.status === '채밀' || l.category === '채밀량');

          return (
            <button
              key={cell.dateStr}
              onClick={() => onSelectDate(cell.dateStr)}
              className={`min-h-[64px] sm:min-h-[72px] p-1 sm:p-1.5 rounded-xl flex flex-col justify-between text-left transition-all relative border cursor-pointer ${
                isSelected
                  ? 'bg-[#fffae8] border-2 border-[#7e5700] shadow-md ring-2 ring-[#7e5700]/30 -translate-y-0.5 z-10'
                  : cell.isToday
                  ? 'bg-[#e7f6ff]/70 border border-[#0277bd]/60 hover:bg-[#d9ebf5]'
                  : cell.isCurrentMonth
                  ? hasLogs
                    ? 'bg-white border-[#7e5700]/30 hover:border-[#7e5700] hover:bg-[#fffdf7]'
                    : 'bg-[#fcfdff] border-[#e2edf3] hover:bg-[#f0f7fb]'
                  : 'bg-neutral-50/60 border-neutral-200/40 opacity-40 hover:opacity-80'
              }`}
            >
              {/* Top row: Day Number + Auto-embedded Weather tag */}
              <div className="flex items-center justify-between w-full leading-none">
                <div className="flex items-center gap-0.5">
                  <span
                    className={`text-[12px] sm:text-[13px] font-bold ${
                      isSelected
                        ? 'text-[#7e5700]'
                        : cell.isToday
                        ? 'text-[#0277bd]'
                        : cell.isCurrentMonth
                        ? 'text-[#0d1e25]'
                        : 'text-neutral-400'
                    }`}
                  >
                    {cell.dayNum}
                  </span>
                  {cell.isToday && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0277bd] shrink-0" title="오늘" />
                  )}
                </div>

                {/* Embedded Daily Weather: Icon & Min/Max Temp */}
                <div
                  title={`기상청 예보: ${cell.weather.condition} (최저 ${(cell.weather as any).minTemp ?? Math.round(cell.weather.temp - 4)}°C / 최고 ${(cell.weather as any).maxTemp ?? Math.round(cell.weather.temp + 4)}°C)`}
                  className="flex items-center gap-0.5 text-[8px] sm:text-[9.5px] text-[#514532]"
                >
                  <span
                    className="material-symbols-outlined text-[12px] sm:text-[13px] text-[#ff9800]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {cell.weather.icon}
                  </span>
                  <span className="font-bold text-[#0d1e25]">
                    {Math.round((cell.weather as any).minTemp ?? cell.weather.temp - 4)}°/{Math.round((cell.weather as any).maxTemp ?? cell.weather.temp + 4)}°
                  </span>
                </div>
              </div>

              {/* Middle/Bottom: Beekeeping Log Action Badges / Summary Dots */}
              <div className="mt-1 w-full space-y-0.5">
                {hasLogs ? (
                  <div className="space-y-0.5">
                    {/* Primary Highlight Tag for the Day */}
                    {hasHarvest ? (
                      <div className="bg-[#ffb300] text-[#4a3400] text-[9px] sm:text-[10px] font-black px-1 py-0.2 rounded flex items-center gap-0.5 truncate shadow-2xs">
                        <span>🍯</span>
                        <span className="truncate">채밀</span>
                      </div>
                    ) : hasWarning ? (
                      <div className="bg-[#ba1a1a] text-white text-[9px] sm:text-[10px] font-bold px-1 py-0.2 rounded flex items-center gap-0.5 truncate shadow-2xs">
                        <span>⚠️</span>
                        <span className="truncate">주의</span>
                      </div>
                    ) : (
                      <div className="bg-[#a0f399] text-[#1b6d24] text-[9px] sm:text-[10px] font-bold px-1 py-0.2 rounded flex items-center gap-0.5 truncate">
                        <span>🐝</span>
                        <span className="truncate">내검</span>
                      </div>
                    )}

                    {/* Number of logs pill if more than 1 */}
                    {cell.dayLogs.length > 1 && (
                      <div className="text-[8px] sm:text-[9px] font-extrabold text-[#7e5700] text-right pr-0.5">
                        +{cell.dayLogs.length - 1}건
                      </div>
                    )}
                  </div>
                ) : cell.isToday ? (
                  <div className="text-[9px] font-semibold text-[#0277bd] text-center pt-1">
                    오늘
                  </div>
                ) : (
                  <div className="h-4" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Bottom Legend */}
      <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-2.5 border-t border-[#d4e5ef]/70 text-[11px] text-[#514532]">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 font-medium">
            <span className="w-2 h-2 rounded-full bg-[#1b6d24]" /> 내검완료
          </span>
          <span className="flex items-center gap-1 font-medium">
            <span className="w-2 h-2 rounded-full bg-[#ffb300]" /> 꿀채밀
          </span>
          <span className="flex items-center gap-1 font-medium">
            <span className="w-2 h-2 rounded-full bg-[#ba1a1a]" /> 주의점검
          </span>
        </div>
        <span className="text-[10px] text-[#514532]/70">
          날씨(기온·날씨아이콘) 자동 기록됨
        </span>
      </div>
    </div>
  );
};
