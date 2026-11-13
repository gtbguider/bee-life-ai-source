import React, { useState, useMemo } from 'react';
import { VoiceLogItem, WeatherInfo } from '../types';
import { getCalendarDateWeather, DayWeatherSnapshot } from '../services/weatherService';

interface DayJournalDetailProps {
  selectedDate: string; // 'YYYY-MM-DD'
  logs: VoiceLogItem[];
  currentWeather: WeatherInfo;
  address?: string;
  dailyWeatherMap?: Map<string, DayWeatherSnapshot>;
  onAddLog: (newLog: Partial<VoiceLogItem>) => void;
  onDeleteLog: (logId: string) => void;
  onEditLog?: (log: VoiceLogItem) => void;
  onStartVoiceRecord: () => void;
  targetHives: string;
}

export const DayJournalDetail: React.FC<DayJournalDetailProps> = ({
  selectedDate,
  logs,
  currentWeather,
  address = '전남 구례군 산동면',
  dailyWeatherMap,
  onAddLog,
  onDeleteLog,
  onEditLog,
  onStartVoiceRecord,
  targetHives
}) => {
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [showDirectAdd, setShowDirectAdd] = useState<boolean>(false);
  const [directText, setDirectText] = useState<string>('');
  const [directStatus, setDirectStatus] = useState<'완료' | '주의' | '채밀'>('완료');
  const [directCategory, setDirectCategory] = useState<string>('벌통 상태');
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState<boolean>(false);

  // Format Korean date string (e.g., 2025년 6월 2일 월요일)
  const formatKoreanDate = (dateStr: string) => {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    const dateObj = new Date(y, m - 1, d);
    const days = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
    return `${y}년 ${m}월 ${d}일 ${days[dateObj.getDay()]}`;
  };

  // Weather snapshot for this selected date using real KMA weather mapping
  const dayWeather = logs[0]?.weatherSnapshot || getCalendarDateWeather(selectedDate, address, dailyWeatherMap, currentWeather);

  const isToday = useMemo(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return selectedDate === `${y}-${m}-${d}`;
  }, [selectedDate]);

  const toggleAudioPlay = (id: string) => {
    if (playingAudioId === id) {
      setPlayingAudioId(null);
    } else {
      setPlayingAudioId(id);
      // Auto-stop after 3 seconds for simulation
      setTimeout(() => {
        setPlayingAudioId((prev) => (prev === id ? null : prev));
      }, 4000);
    }
  };

  const handleQuickAdd = (tag: string) => {
    const weatherTag = `[${dayWeather.temp}°C ${dayWeather.condition} 풍속${dayWeather.windSpeed || 1.8}m/s]`;
    const isHarvest = tag.includes('채밀');
    const isWarning = tag.includes('주의') || tag.includes('도봉');

    onAddLog({
      id: 'log-' + Date.now(),
      hiveRange: targetHives || '#1 ~ #50',
      text: `${targetHives} ${tag} 완료 (정상 확인) ${weatherTag}`,
      status: isHarvest ? '채밀' : isWarning ? '주의' : '완료',
      timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      date: selectedDate,
      category: isHarvest ? '채밀량' : tag.includes('방제') ? '방제' : tag.includes('사양') ? '급이/사양' : '벌통 상태',
      weatherTag,
      weatherSnapshot: dayWeather,
      tags: [tag.replace(' ', '')],
      audioDuration: '0:19'
    });
  };

  const handleSaveDirect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!directText.trim()) return;

    const weatherTag = `[${dayWeather.temp}°C ${dayWeather.condition} 풍속${dayWeather.windSpeed || 1.8}m/s]`;
    onAddLog({
      id: 'log-' + Date.now(),
      hiveRange: targetHives || '#1 ~ #50',
      text: `${directText.trim()} ${weatherTag}`,
      status: directStatus,
      timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      date: selectedDate,
      category: directCategory as any,
      weatherTag,
      weatherSnapshot: dayWeather,
      tags: [directStatus === '채밀' ? '채밀' : '내검기록'],
      audioDuration: '0:15'
    });

    setDirectText('');
    setShowDirectAdd(false);
  };

  const handleGenerateAiSummary = () => {
    setIsSummarizing(true);
    setTimeout(() => {
      if (logs.length === 0) {
        setAiSummary('해당 일자에는 기록된 내검 데이터가 없어 분석할 일지가 없습니다.');
      } else {
        const warnings = logs.filter((l) => l.status === '주의');
        const harvest = logs.filter((l) => l.status === '채밀' || l.honeyYieldKg);
        let summaryText = `🐝 ${formatKoreanDate(selectedDate)} 양봉 분석 요약:\n`;
        summaryText += `• 총 ${logs.length}건의 봉군 내검 및 작업이 안전하게 기록되었습니다.\n`;
        if (harvest.length > 0) {
          summaryText += `• 🍯 채밀 작업 완료: 완숙 꿀 수확 및 봉개 상태 확인됨.\n`;
        }
        if (warnings.length > 0) {
          summaryText += `• ⚠️ 주의 벌통(${warnings.map((w) => w.hiveRange).join(', ')}): 세력 약화 및 산란 상태 재확인 필요.\n`;
        } else {
          summaryText += `• ✅ 전 벌통 여왕벌 산란권 확장 및 착봉 세력 매우 우수함.\n`;
        }
        summaryText += `• ☀️ 기상 조건(${dayWeather.condition} ${dayWeather.temp}°C, 풍속 ${dayWeather.windSpeed || 1.8}m/s)과 봉군 활동 조화 최적.`;
        setAiSummary(summaryText);
      }
      setIsSummarizing(false);
    }, 600);
  };

  return (
    <div className="bg-white border-2 border-[#7e5700]/25 rounded-3xl p-4 sm:p-5 shadow-sm space-y-4">
      {/* Date Title & Weather Badge Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#d4e5ef]/70 pb-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="material-symbols-outlined text-[#7e5700] text-[22px]">
              mic
            </span>
            <h3 className="text-[17px] sm:text-[18px] font-black text-[#0d1e25] tracking-tight">
              {formatKoreanDate(selectedDate)}
            </h3>
            {isToday && (
              <span className="bg-[#ba1a1a] text-white text-[11px] font-extrabold px-2 py-0.5 rounded-full shadow-2xs">
                오늘
              </span>
            )}
          </div>
          <span className="text-[12px] text-[#514532] font-semibold mt-0.5 block">
            선택된 날짜 음성내검기록 & 양봉기록 ({logs.length}건)
          </span>
        </div>

        {/* Embedded Weather Status for Selected Day (KMA Daily Min/Max and Average Condition) */}
        <div className="flex items-center gap-2 bg-[#f4faff] border border-[#d6c4ac]/80 rounded-2xl px-3 py-2 self-start sm:self-auto shadow-2xs">
          <span
            className="material-symbols-outlined text-[#ff9800] text-[20px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            {dayWeather.icon}
          </span>
          <div className="flex flex-col text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-[13px] font-black text-[#0d1e25]">
                {dayWeather.condition}
              </span>
              <span className="text-[12px] font-bold text-[#7e5700]">
                평균 {dayWeather.temp}°C
              </span>
            </div>
            <span className="text-[10px] font-semibold text-[#514532]">
              최저 {dayWeather.minTemp ?? Math.round(dayWeather.temp - 4)}°C / 최고 {dayWeather.maxTemp ?? Math.round(dayWeather.temp + 4)}°C · 풍속 {dayWeather.windSpeed || 1.8}m/s
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons Row (음성 녹음 / 직접 작성 / AI 요약) */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={onStartVoiceRecord}
          className="flex-1 sm:flex-none px-3.5 py-2.5 bg-[#7e5700] hover:bg-[#634500] text-white rounded-xl font-bold text-[13px] flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">mic</span>
          <span>음성 내검 녹음</span>
        </button>

        <button
          onClick={() => setShowDirectAdd(!showDirectAdd)}
          className="flex-1 sm:flex-none px-3.5 py-2.5 bg-[#f4faff] hover:bg-[#d9ebf5] text-[#0d1e25] border border-[#d6c4ac] rounded-xl font-bold text-[13px] flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">edit_note</span>
          <span>기록 직접 추가</span>
        </button>

        <button
          onClick={handleGenerateAiSummary}
          disabled={isSummarizing}
          className="px-3 py-2 bg-[#fffaee] hover:bg-[#ffdeac]/50 text-[#7e5700] border border-[#ffb300]/50 rounded-xl font-bold text-[12px] flex items-center gap-1 transition-all"
        >
          <span className="material-symbols-outlined text-[16px]">
            {isSummarizing ? 'hourglass_top' : 'auto_awesome'}
          </span>
          <span>{isSummarizing ? '요약 중...' : 'AI 기록 요약'}</span>
        </button>
      </div>

      {/* AI Summary Banner if generated */}
      {aiSummary && (
        <div className="bg-[#fff9e6] border-2 border-[#ffb300]/60 rounded-2xl p-3.5 text-[13px] text-[#0d1e25] leading-relaxed relative animate-in fade-in duration-200">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-extrabold text-[#7e5700] flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
              AI 스마트 양봉기록 브리핑
            </span>
            <button
              onClick={() => setAiSummary(null)}
              className="text-[#514532] hover:text-[#0d1e25] text-[16px]"
            >
              ✕
            </button>
          </div>
          <pre className="whitespace-pre-wrap font-sans text-[12px] text-[#281900] leading-normal">
            {aiSummary}
          </pre>
        </div>
      )}

      {/* Direct Add Form (Collapsible) */}
      {showDirectAdd && (
        <form
          onSubmit={handleSaveDirect}
          className="bg-[#f7fbff] border-2 border-[#7e5700]/30 rounded-2xl p-3.5 space-y-3 animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-bold text-[#0d1e25]">
              {selectedDate} 양봉기록 수기 작성
            </span>
            <span className="text-[11px] font-bold text-[#7e5700]">
              대상: {targetHives}
            </span>
          </div>

          <textarea
            value={directText}
            onChange={(e) => setDirectText(e.target.value)}
            placeholder="예: 12번 벌통 신왕 산란권 확인, 소초광 2매 증소 완료"
            rows={2}
            className="w-full p-2.5 bg-white border border-[#d6c4ac] rounded-xl text-[13px] text-[#0d1e25] focus:outline-none focus:border-[#7e5700]"
          />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              {(['완료', '주의', '채밀'] as const).map((st) => (
                <button
                  type="button"
                  key={st}
                  onClick={() => setDirectStatus(st)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                    directStatus === st
                      ? st === '주의'
                        ? 'bg-[#ba1a1a] text-white border-[#ba1a1a]'
                        : st === '채밀'
                        ? 'bg-[#ffb300] text-[#3d2700] border-[#ffb300]'
                        : 'bg-[#1b6d24] text-white border-[#1b6d24]'
                      : 'bg-white text-[#514532] border-[#d6c4ac]'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowDirectAdd(false)}
                className="px-3 py-1.5 text-[12px] font-bold text-[#514532] hover:bg-[#d9ebf5] rounded-lg"
              >
                취소
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-[#7e5700] text-white font-bold text-[12px] rounded-lg shadow-xs hover:bg-[#604100]"
              >
                저장하기
              </button>
            </div>
          </div>
        </form>
      )}

      {/* List of inspection records for this day */}
      <div className="space-y-2.5">
        {logs.length === 0 ? (
          <div className="text-center py-8 px-4 bg-[#f9fcfe] border-2 border-dashed border-[#d6c4ac]/70 rounded-2xl">
            <span className="material-symbols-outlined text-[36px] text-[#514532]/40 block mb-1">
              mic_none
            </span>
            <p className="text-[14px] font-bold text-[#0d1e25]">
              이 날짜에는 등록된 음성내검기록이 없습니다.
            </p>
            <p className="text-[12px] text-[#514532] mt-1 max-w-xs mx-auto">
              음성 내검 버튼을 누르거나 아래 빠른 템플릿을 눌러 손쉽게 양봉기록을 등록하세요.
            </p>

            {/* Quick 1-tap template chips */}
            <div className="flex flex-wrap justify-center gap-1.5 mt-4">
              {['화분떡 공급', '자극 사양', '신왕 산란 확인', '친환경 응애방제', '봉개 완숙꿀 채밀'].map(
                (template) => (
                  <button
                    key={template}
                    onClick={() => handleQuickAdd(template)}
                    className="px-2.5 py-1 bg-white hover:bg-[#ffdeac] border border-[#d6c4ac] text-[11px] font-bold text-[#7e5700] rounded-lg shadow-2xs transition-all active:scale-95"
                  >
                    + {template}
                  </button>
                )
              )}
            </div>
          </div>
        ) : (
          logs.map((item) => {
            const isWarning = item.status === '주의';
            const isHarvest = item.status === '채밀' || item.category === '채밀량';
            const isPlaying = playingAudioId === item.id;

            return (
              <div
                key={item.id}
                className={`p-3.5 sm:p-4 rounded-2xl border transition-all relative ${
                  isWarning
                    ? 'bg-[#fff5f5] border-[#ba1a1a]/40 shadow-xs'
                    : isHarvest
                    ? 'bg-[#fffdf2] border-[#ffb300]/60 shadow-xs'
                    : 'bg-[#f4faff] border-[#d6c4ac]/70 hover:border-[#7e5700]/50'
                }`}
              >
                {/* Header: Hive Range + Status Badge + Time */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[14px] font-black ${
                        isWarning
                          ? 'text-[#ba1a1a]'
                          : isHarvest
                          ? 'text-[#7e5700]'
                          : 'text-[#0d1e25]'
                      }`}
                    >
                      {item.hiveRange}
                    </span>
                    <span
                      className={`text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-md ${
                        isWarning
                          ? 'bg-[#ba1a1a] text-white'
                          : isHarvest
                          ? 'bg-[#ffb300] text-[#3d2700]'
                          : 'bg-[#a0f399] text-[#1b6d24]'
                      }`}
                    >
                      {item.status}
                    </span>
                    {item.category && (
                      <span className="text-[10px] font-medium text-[#514532] bg-white px-1.5 py-0.5 rounded border border-[#d6c4ac]/60">
                        {item.category}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] text-[#514532]">
                    <span className="material-symbols-outlined text-[14px]">schedule</span>
                    <span>{item.timestamp}</span>
                    {onEditLog && (
                      <button
                        onClick={() => onEditLog(item)}
                        title="양봉일지 수정"
                        className="flex items-center gap-0.5 px-2 py-0.5 bg-white hover:bg-[#ffdeac] border border-[#d6c4ac] text-[#7e5700] rounded-md font-bold text-[11px] transition-all ml-1 active:scale-95 cursor-pointer shadow-2xs"
                      >
                        <span className="material-symbols-outlined text-[13px]">edit_note</span>
                        <span>수정</span>
                      </button>
                    )}
                    <button
                      onClick={() => onDeleteLog(item.id)}
                      title="기록 삭제"
                      className="w-6 h-6 rounded-full hover:bg-neutral-200/60 flex items-center justify-center text-neutral-400 hover:text-[#ba1a1a] transition-colors ml-0.5 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[15px]">delete</span>
                    </button>
                  </div>
                </div>

                {/* Voice Transcript Text */}
                <p className="text-[14px] sm:text-[15px] font-semibold text-[#0d1e25] leading-relaxed">
                  {item.text}
                </p>

                {/* Audio Voice Player Waveform Simulation */}
                <div className="mt-3 pt-2.5 border-t border-[#d4e5ef]/60 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleAudioPlay(item.id)}
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                        isPlaying
                          ? 'bg-[#ba1a1a] text-white shadow-xs'
                          : 'bg-[#7e5700] hover:bg-[#604100] text-white'
                      }`}
                      title={isPlaying ? '음성 일시정지' : '음성 다시듣기'}
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {isPlaying ? 'pause' : 'play_arrow'}
                      </span>
                    </button>

                    {/* Animated Audio Waveform */}
                    <div className="flex items-center gap-0.5 h-4">
                      {[4, 10, 16, 8, 14, 18, 6, 12, 16, 9, 14, 7].map((h, i) => (
                        <span
                          key={i}
                          className={`w-1 rounded-full transition-all duration-200 ${
                            isPlaying ? 'bg-[#7e5700] animate-pulse' : 'bg-[#d6c4ac]'
                          }`}
                          style={{
                            height: isPlaying ? `${Math.max(4, (h * (i % 3 + 1)) % 18)}px` : `${h}px`
                          }}
                        />
                      ))}
                    </div>
                    <span className="text-[11px] font-mono text-[#514532]">
                      {item.audioDuration || '0:18'}
                    </span>
                  </div>

                  {/* Weather snapshot tag embedded into record */}
                  {item.weatherTag && (
                    <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-[#d6c4ac]/60 text-[#7e5700] font-bold truncate max-w-[170px]">
                      {item.weatherTag}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
