import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { VoiceLogItem, WeatherInfo } from '../types';
import { CompactWeatherBar } from './CompactWeatherBar';
import { BeekeepingCalendar } from './BeekeepingCalendar';
import { DayJournalDetail } from './DayJournalDetail';
import { VoiceRecordSheet } from './VoiceRecordSheet';
import { fetchLiveKMAWeather, DayWeatherSnapshot } from '../services/weatherService';
import { getTodayDateString } from '../data/mockData';
import { useAuth } from '../contexts/AuthContext';
import {
  fetchJournalsFromFirestore,
  saveJournalToFirestore,
  updateJournalInFirestore,
  deleteJournalFromFirestore
} from '../services/firestoreService';
import { JournalEditModal } from './JournalEditModal';
import { JournalExportModal } from './JournalExportModal';
import { loadUserProfile } from '../services/userProfile';

interface RecordViewProps {
  weather: WeatherInfo;
  logs: VoiceLogItem[];
  singleLogs?: VoiceLogItem[];
  targetHives: string;
  apiaryAddress: string;
  onAddressChange: (newAddress: string) => void;
  onWeatherUpdate: (newWeather: WeatherInfo) => void;
  onOpenHiveSelect: () => void;
  onSaveLogs: (newLogs: VoiceLogItem[]) => void;
  autoOpenRecordSheet?: boolean;
  onOpenHoneyLot?: () => void;
}

const STORAGE_KEY = 'honeybee_beekeeping_journal_logs_v2';

function getJournalStorageKey(uid?: string): string {
  return uid ? `${STORAGE_KEY}_${uid}` : STORAGE_KEY;
}

function loadLogsFromStorage(uid?: string, fallbackLogs?: VoiceLogItem[]): VoiceLogItem[] {
  try {
    const saved = localStorage.getItem(getJournalStorageKey(uid));
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        const cleanUserLogs = parsed.filter(
          (l: any) =>
            l &&
            typeof l.id === 'string' &&
            !l.id.startsWith('log-today-') &&
            !l.id.startsWith('log-yesterday-') &&
            !l.id.startsWith('mock-') &&
            !l.id.startsWith('single-') &&
            !/^log-[0-9]{1,4}$/.test(l.id)
        );
        localStorage.setItem(getJournalStorageKey(uid), JSON.stringify(cleanUserLogs));
        return cleanUserLogs;
      }
    }
  } catch (e) {
    console.warn('Failed to load local logs:', e);
  }
  if (uid) {
    return [];
  }
  return Array.isArray(fallbackLogs)
    ? fallbackLogs.filter(
        (l) =>
          l &&
          !l.id.startsWith('log-today-') &&
          !l.id.startsWith('log-yesterday-') &&
          !l.id.startsWith('mock-') &&
          !l.id.startsWith('single-') &&
          !/^log-[0-9]{1,4}$/.test(l.id)
      )
    : [];
}

export const RecordView: React.FC<RecordViewProps> = ({
  weather,
  logs,
  targetHives,
  apiaryAddress,
  onAddressChange,
  onWeatherUpdate,
  onOpenHiveSelect,
  onSaveLogs,
  autoOpenRecordSheet,
  onOpenHoneyLot
}) => {
  const { user } = useAuth();
  const [currentWeather, setCurrentWeather] = useState<WeatherInfo>(weather);
  const [dailyWeatherMap, setDailyWeatherMap] = useState<Map<string, DayWeatherSnapshot>>(new Map());
  const [isLoadingWeather, setIsLoadingWeather] = useState<boolean>(false);

  const [allLogs, setAllLogs] = useState<VoiceLogItem[]>(() =>
    loadLogsFromStorage(user?.uid, logs)
  );

  // Synchronous reference to latest logs array to prevent stale closure overwrites during rapid consecutive additions
  const allLogsRef = useRef<VoiceLogItem[]>(allLogs);
  useEffect(() => {
    allLogsRef.current = allLogs;
  }, [allLogs]);

  // When user is authenticated or account changes, load strictly that user's Firestore journals (no cross-user merge)
  useEffect(() => {
    let isMounted = true;
    const uid = user?.uid;

    if (!uid) {
      const guestLogs = loadLogsFromStorage(undefined, logs);
      allLogsRef.current = guestLogs;
      setAllLogs(guestLogs);
      onSaveLogs(guestLogs);
      return;
    }

    // Initialize with UID-scoped cache while fetching fresh Firestore data
    const cachedUserLogs = loadLogsFromStorage(uid);
    allLogsRef.current = cachedUserLogs;
    setAllLogs(cachedUserLogs);
    onSaveLogs(cachedUserLogs);

    (async () => {
      try {
        const cloudJournals = await fetchJournalsFromFirestore(uid);
        if (isMounted && Array.isArray(cloudJournals)) {
          allLogsRef.current = cloudJournals;
          setAllLogs(cloudJournals);
          onSaveLogs(cloudJournals);
          try {
            localStorage.setItem(getJournalStorageKey(uid), JSON.stringify(cloudJournals));
          } catch (e) {}
        }
      } catch (err) {
        console.warn('Error loading Firestore journals:', err);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [user?.uid]);

  // Fetch real KMA weather based on apiaryAddress
  const loadKMAWeather = useCallback(async (addr: string) => {
    setIsLoadingWeather(true);
    try {
      const { current, dailyMap } = await fetchLiveKMAWeather(addr);
      setCurrentWeather(current);
      setDailyWeatherMap(dailyMap);
      onWeatherUpdate(current);
    } catch (err) {
      console.warn('Failed to fetch KMA live weather:', err);
    } finally {
      setIsLoadingWeather(false);
    }
  }, [onWeatherUpdate]);

  useEffect(() => {
    loadKMAWeather(apiaryAddress);
  }, [apiaryAddress, loadKMAWeather]);

  // Calendar View State: Current visible month & selected date
  const [currentDate, setCurrentDate] = useState<Date>(() => {
    // Default directly to current year & month
    return new Date();
  });

  const [selectedDate, setSelectedDate] = useState<string>(() => {
    // Default cursor directly to today's date (e.g. 2026-09-03)
    return getTodayDateString();
  });

  const [viewMode, setViewMode] = useState<'calendar' | 'timeline'>('calendar');
  const [filterType, setFilterType] = useState<'all' | 'harvest' | 'warning'>('all');
  const [isVoiceSheetOpen, setIsVoiceSheetOpen] = useState<boolean>(Boolean(autoOpenRecordSheet));
  const [showSaveToast, setShowSaveToast] = useState<string | null>(null);

  // Journal edit modal state
  const [editingLog, setEditingLog] = useState<VoiceLogItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const maxHiveCount = useMemo(() => {
    try {
      return loadUserProfile(user?.uid).hiveCount || 50;
    } catch {
      return 50;
    }
  }, [user?.uid]);

  const handleOpenEditModal = (log: VoiceLogItem) => {
    setEditingLog(log);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingLog(null);
  };

  useEffect(() => {
    if (autoOpenRecordSheet) {
      setIsVoiceSheetOpen(true);
    }
  }, [autoOpenRecordSheet]);

  // Sync prop changes
  useEffect(() => {
    setCurrentWeather(weather);
  }, [weather]);

  // Save to UID-scoped localStorage & parent callback whenever logs change
  const saveLogsState = (updated: VoiceLogItem[]) => {
    allLogsRef.current = updated;
    setAllLogs(updated);
    onSaveLogs(updated);
    try {
      localStorage.setItem(getJournalStorageKey(user?.uid), JSON.stringify(updated));
    } catch (e) {
      console.warn('Storage save failed:', e);
    }
  };

  // Month navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleGoToday = () => {
    const today = new Date();
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    setSelectedDate(`${y}-${m}-${d}`);
  };

  // Select Date handler with smooth scroll to inspection detail
  const handleSelectDate = (dateStr: string) => {
    setSelectedDate(dateStr);
    // Smooth scroll to the inspection detail card so user immediately sees voice logs
    setTimeout(() => {
      const el = document.getElementById('selected-day-journal');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 50);
  };

  // Add new log to selected date
  const handleAddNewLog = async (newLogData: Partial<VoiceLogItem>) => {
    console.log('[JOURNAL DEBUG] handleAddNewLog START');
    console.log('[JOURNAL DEBUG] handleAddNewLog user:', user ? (user.email || user.displayName || user.uid) : null);
    console.log('[JOURNAL DEBUG] handleAddNewLog uid:', user ? user.uid : null);

    const completeLog: VoiceLogItem = {
      id: newLogData.id || 'journal-' + Date.now(),
      hiveRange: newLogData.hiveRange || targetHives,
      ...(newLogData.hiveId !== undefined ? { hiveId: newLogData.hiveId } : {}),
      ...(Array.isArray(newLogData.hiveIds) && newLogData.hiveIds.length > 0
        ? { hiveIds: newLogData.hiveIds }
        : {}),
      ...(newLogData.inspectionDetails ? { inspectionDetails: newLogData.inspectionDetails } : {}),
      text: newLogData.text || '',
      status: newLogData.status || '완료',
      timestamp: newLogData.timestamp || new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      date: newLogData.date || selectedDate,
      category: newLogData.category || '벌통 상태',
      ...(newLogData.weatherTag ? { weatherTag: newLogData.weatherTag } : {}),
      weatherSnapshot: newLogData.weatherSnapshot || {
        temp: currentWeather.temperature,
        condition: currentWeather.condition,
        icon: currentWeather.icon,
        windSpeed: currentWeather.windSpeed,
        humidity: currentWeather.humidity
      },
      tags: newLogData.tags || ['내검완료'],
      audioDuration: newLogData.audioDuration || '0:18',
      ...(newLogData.honeyYieldKg !== undefined && !isNaN(newLogData.honeyYieldKg)
        ? { honeyYieldKg: newLogData.honeyYieldKg }
        : {}),
      ...(newLogData.originalText ? { originalText: newLogData.originalText } : {}),
      ...(newLogData.aiSummary ? { aiSummary: newLogData.aiSummary } : {})
    };

    // 1. Immediately update allLogsRef, notify parent, and save to UID-scoped localStorage
    // using the latest accumulation to protect rapid consecutive calls from stale closures
    const nextLogs = [completeLog, ...allLogsRef.current.filter((l) => l.id !== completeLog.id)];
    allLogsRef.current = nextLogs;
    onSaveLogs(nextLogs);
    try {
      localStorage.setItem(getJournalStorageKey(user?.uid), JSON.stringify(nextLogs));
    } catch (e) {
      console.warn('Storage save failed:', e);
    }

    // 2. Functional React state update so React batching queues each log properly
    setAllLogs((prev) => [completeLog, ...prev.filter((l) => l.id !== completeLog.id)]);

    if (user?.uid) {
      try {
        await saveJournalToFirestore(user.uid, completeLog);
        triggerToast('Firebase 클라우드 및 양봉기록에 안전하게 저장되었습니다.');
      } catch (err) {
        console.error('Firestore journal save error:', err);
        triggerToast('양봉기록에 저장됨 (클라우드 동기화 실패: 네트워크 확인)');
      }
    } else {
      triggerToast('양봉기록에 내검 내용이 안전하게 저장되었습니다.');
    }
  };

  // Delete log
  const handleDeleteLog = (logId: string) => {
    const updated = allLogs.filter((l) => l.id !== logId);
    saveLogsState(updated);

    if (user?.uid) {
      deleteJournalFromFirestore(user.uid, logId).catch((err) =>
        console.warn('Firestore journal delete error:', err)
      );
    }
    triggerToast('내검 기록이 삭제되었습니다.');
  };

  // Update existing log without creating new document
  const handleUpdateLog = async (updatedLog: VoiceLogItem): Promise<boolean> => {
    console.log('[JOURNAL DEBUG] handleUpdateLog START, id:', updatedLog.id);
    if (!updatedLog.id) {
      triggerToast('수정 오류: 일지 ID가 존재하지 않습니다.');
      return false;
    }

    if (user?.uid) {
      try {
        await updateJournalInFirestore(user.uid, updatedLog);
        const updated = allLogs.map((l) => (l.id === updatedLog.id ? updatedLog : l));
        saveLogsState(updated);
        triggerToast('양봉일지가 수정되었습니다.');
        return true;
      } catch (err) {
        console.error('Firestore journal update error:', err);
        triggerToast('양봉일지 수정 실패: 네트워크 연결 상태를 확인해주세요.');
        return false;
      }
    } else {
      const updated = allLogs.map((l) => (l.id === updatedLog.id ? updatedLog : l));
      saveLogsState(updated);
      triggerToast('양봉일지가 수정되었습니다.');
      return true;
    }
  };

  const triggerToast = (msg: string) => {
    setShowSaveToast(msg);
    setTimeout(() => setShowSaveToast(null), 2500);
  };

  // Filter logs for selected date
  const selectedDateLogs = useMemo(() => {
    return allLogs.filter((l) => {
      const d = l.date || (l.timestamp.includes(' ') ? l.timestamp.split(' ')[0] : '');
      return d === selectedDate;
    });
  }, [allLogs, selectedDate]);

  // Filtered logs for timeline list view
  const filteredTimelineLogs = useMemo(() => {
    const currentMonthPrefix = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    let list = allLogs.filter((l) => {
      const d = l.date || (l.timestamp.includes(' ') ? l.timestamp.split(' ')[0] : '');
      return d.startsWith(currentMonthPrefix);
    });

    if (filterType === 'harvest') {
      list = list.filter((l) => l.status === '채밀' || l.category === '채밀량');
    } else if (filterType === 'warning') {
      list = list.filter((l) => l.status === '주의');
    }

    return list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [allLogs, currentDate, filterType]);

  return (
    <div className="flex flex-col w-full min-h-screen pb-32 pt-16 bg-[#f4faff]">
      {/* Sticky Target Hive & Fast Actions Bar */}
      <div className="bg-[#e7f6ff]/90 backdrop-blur-md px-4 py-2.5 border-b border-[#d6c4ac]/60 flex items-center justify-between sticky top-16 z-20 shadow-2xs">
        <div className="flex items-center gap-2">
          <span
            className="material-symbols-outlined text-[#7e5700] text-[20px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            hive
          </span>
          <span className="text-[13px] sm:text-[14px] text-[#0d1e25]">
            대상 벌통: <span className="font-extrabold text-[#7e5700]">{targetHives}</span>
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {user ? (
            <span
              className="text-[10.5px] font-bold text-[#1b6d24] bg-[#e8f5e9] px-2 py-0.5 rounded-full flex items-center gap-1 border border-[#c8e6c9]"
              title="Firebase Firestore 실시간 동기화 활성"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#2e7d32] animate-pulse" />
              <span>클라우드 동기화</span>
            </span>
          ) : (
            <span
              className="text-[10.5px] font-bold text-[#7e5700] bg-[#fff3e0] px-2 py-0.5 rounded-full flex items-center gap-1 border border-[#ffe082]"
              title="로컬 저장소 모드 (로그인 시 클라우드 자동 동기화)"
            >
              <span>로컬 모드</span>
            </span>
          )}

          <button
            onClick={onOpenHiveSelect}
            className="text-[#7e5700] font-bold text-[12px] flex items-center gap-0.5 hover:bg-white px-2.5 py-1 rounded-full border border-[#d6c4ac] shadow-2xs active:scale-95 transition-all bg-white/80 cursor-pointer"
          >
            <span>벌통 변경</span>
            <span className="material-symbols-outlined text-[14px]">edit</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col w-full px-3.5 sm:px-4 pt-3 gap-3.5 max-w-md mx-auto">
        {/* Compact Weather Bar (Real-time KMA connection following User Profile address) */}
        <CompactWeatherBar
          weather={currentWeather}
          address={apiaryAddress}
          onAddressChange={onAddressChange}
          isLoadingWeather={isLoadingWeather}
          onRefreshWeather={() => loadKMAWeather(apiaryAddress)}
        />

        {/* Primary Hero Voice Record Action (핵심 액션: 장갑 낀 손으로 원터치 음성 내검) */}
        <div className="bg-gradient-to-r from-[#7e5700] via-[#8c6100] to-[#9c6c00] rounded-3xl p-4 text-white shadow-md relative overflow-hidden border border-[#ffdeac]/30">
          <div className="relative z-10 flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="inline-flex items-center gap-1 text-[10px] font-black bg-white/20 px-2 py-0.5 rounded-full tracking-wide">
                <span className="w-1.5 h-1.5 rounded-full bg-[#a0f399] animate-pulse" />
                음성 명령: "기록 시작" &amp; "기록 저장"
              </span>
              <h2 className="text-[16px] font-black tracking-tight flex items-center gap-1.5">
                <span>현장 음성 양봉일지</span>
                <span className="text-[12px]">🎙️</span>
              </h2>
              <p className="text-[11px] text-white/90 leading-tight">
                "기록 시작"으로 말하고 "기록 저장"으로 자동 정리·저장!
              </p>
            </div>

            <button
              onClick={() => setIsVoiceSheetOpen(true)}
              className="w-14 h-14 rounded-2xl bg-white text-[#7e5700] flex items-center justify-center shadow-lg active:scale-95 transition-all cursor-pointer hover:bg-[#fff9ef] shrink-0 group"
              aria-label="즉시 음성 녹음 시작"
              title="음성 양봉일지 기록 시작"
            >
              <span
                className="material-symbols-outlined text-[32px] group-hover:scale-110 transition-transform"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                mic
              </span>
            </button>
          </div>
        </div>

        {/* View Mode & Filter Tabs Header */}
        <div className="flex items-center justify-between mt-0.5">
          <div className="flex items-center gap-1.5">
            <h1 className="text-[18px] sm:text-[20px] font-black text-[#0d1e25] tracking-tight">
              양봉기록
            </h1>
            <span className="text-[11px] font-bold text-[#7e5700] bg-[#ffdeac] px-2 py-0.5 rounded-full">
              음성 연동
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* 꿀 이력제 바로가기 버튼 */}
            {onOpenHoneyLot && (
              <button
                onClick={onOpenHoneyLot}
                className="text-[#7e5700] hover:text-[#5a3e00] bg-white hover:bg-[#fff9ee] font-bold text-[11px] sm:text-[11.5px] flex items-center gap-1 px-2.5 py-1 rounded-full border border-[#d6c4ac] shadow-2xs active:scale-95 transition-all cursor-pointer"
                title="꿀 이력제로 이동"
              >
                <span className="text-[13px]">🍯</span>
                <span>꿀 이력제</span>
              </button>
            )}

            {/* 양봉일지 PDF 다운로드 버튼 */}
            <button
              onClick={() => setIsExportModalOpen(true)}
              className="text-[#7e5700] hover:text-[#5a3e00] bg-white hover:bg-[#fff9ee] font-bold text-[11px] sm:text-[11.5px] flex items-center gap-1 px-2.5 py-1 rounded-full border border-[#d6c4ac] shadow-2xs active:scale-95 transition-all cursor-pointer"
              title="양봉일지 PDF 다운로드"
            >
              <span className="material-symbols-outlined text-[15px] text-[#7e5700]">picture_as_pdf</span>
              <span>일지 다운로드</span>
            </button>

            {/* View Mode Toggle: Calendar vs Timeline List */}
            <div className="flex bg-[#d9ebf5]/80 p-0.5 rounded-full border border-[#d6c4ac]">
              <button
                onClick={() => setViewMode('calendar')}
                className={`px-2.5 sm:px-3 py-1 rounded-full text-[12px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  viewMode === 'calendar'
                    ? 'bg-[#7e5700] text-white shadow-xs'
                    : 'text-[#514532] hover:text-[#0d1e25]'
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">calendar_month</span>
                <span>달력</span>
              </button>
              <button
                onClick={() => setViewMode('timeline')}
                className={`px-2.5 sm:px-3 py-1 rounded-full text-[12px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  viewMode === 'timeline'
                    ? 'bg-[#7e5700] text-white shadow-xs'
                    : 'text-[#514532] hover:text-[#0d1e25]'
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">list_alt</span>
                <span>목록</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Beekeeping Calendar View */}
        {viewMode === 'calendar' ? (
          <>
            {/* Interactive Calendar Component */}
            <BeekeepingCalendar
              currentDate={currentDate}
              selectedDate={selectedDate}
              onSelectDate={handleSelectDate}
              onPrevMonth={handlePrevMonth}
              onNextMonth={handleNextMonth}
              onGoToday={handleGoToday}
              logs={allLogs}
              currentWeather={currentWeather}
              address={apiaryAddress}
              dailyWeatherMap={dailyWeatherMap}
            />

            {/* Selected Day's Inspection Journal & Voice Logs Detail */}
            <div id="selected-day-journal" className="scroll-mt-28">
              <DayJournalDetail
                selectedDate={selectedDate}
                logs={selectedDateLogs}
                currentWeather={currentWeather}
                address={apiaryAddress}
                dailyWeatherMap={dailyWeatherMap}
                onAddLog={handleAddNewLog}
                onDeleteLog={handleDeleteLog}
                onEditLog={handleOpenEditModal}
                onStartVoiceRecord={() => setIsVoiceSheetOpen(true)}
                targetHives={targetHives}
              />
            </div>
          </>
        ) : (
          /* Timeline / List View */
          <div className="bg-white border-2 border-[#7e5700]/25 rounded-3xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-[#d4e5ef] pb-2.5">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[#7e5700] text-[20px]">
                  format_list_bulleted
                </span>
                <h3 className="font-extrabold text-[16px] text-[#0d1e25]">
                  {currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월 전체 양봉기록
                </h3>
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1 text-[11px] font-bold">
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-2 py-0.5 rounded-md ${
                    filterType === 'all'
                      ? 'bg-[#7e5700] text-white'
                      : 'bg-neutral-100 text-[#514532]'
                  }`}
                >
                  전체
                </button>
                <button
                  onClick={() => setFilterType('harvest')}
                  className={`px-2 py-0.5 rounded-md ${
                    filterType === 'harvest'
                      ? 'bg-[#ffb300] text-[#3d2700]'
                      : 'bg-neutral-100 text-[#514532]'
                  }`}
                >
                  채밀
                </button>
                <button
                  onClick={() => setFilterType('warning')}
                  className={`px-2 py-0.5 rounded-md ${
                    filterType === 'warning'
                      ? 'bg-[#ba1a1a] text-white'
                      : 'bg-neutral-100 text-[#514532]'
                  }`}
                >
                  주의
                </button>
              </div>
            </div>

            <div className="space-y-2.5">
              {filteredTimelineLogs.length === 0 ? (
                <div className="text-center py-8 text-[13px] text-[#514532]">
                  해당 조건의 내검 일지가 없습니다.
                </div>
              ) : (
                filteredTimelineLogs.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (item.date) setSelectedDate(item.date);
                      setViewMode('calendar');
                    }}
                    className="p-3 bg-[#f4faff] hover:bg-[#fffaee] border border-[#d6c4ac]/70 rounded-xl cursor-pointer transition-all"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-[#7e5700] text-[13px]">
                          {item.date || getTodayDateString()}
                        </span>
                        <span className="text-[11px] font-bold text-[#0d1e25] bg-white px-1.5 py-0.2 rounded border border-[#d6c4ac]/60">
                          {item.hiveRange}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditModal(item);
                          }}
                          className="flex items-center gap-0.5 px-2 py-0.5 bg-white hover:bg-[#ffdeac] border border-[#d6c4ac] text-[#7e5700] rounded-md font-bold text-[10px] transition-all active:scale-95 shadow-2xs"
                        >
                          <span className="material-symbols-outlined text-[12px]">edit_note</span>
                          <span>수정</span>
                        </button>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            item.status === '주의'
                              ? 'bg-[#ba1a1a] text-white'
                              : item.status === '채밀'
                              ? 'bg-[#ffb300] text-[#3d2700]'
                              : 'bg-[#a0f399] text-[#1b6d24]'
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>
                    </div>
                    <p className="text-[13px] font-medium text-[#0d1e25] line-clamp-2">
                      {item.text}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Floating Tactical Microphone Action Bar at bottom */}
      <div className="fixed bottom-20 left-0 right-0 z-30 pointer-events-none flex justify-center px-4">
        <div className="max-w-md w-full flex justify-end pointer-events-auto">
          <button
            onClick={() => setIsVoiceSheetOpen(true)}
            aria-label="음성 내검 기록 시작"
            className="flex items-center gap-2 px-4 py-3 bg-[#7e5700] hover:bg-[#604100] text-white rounded-full shadow-[0_6px_20px_rgba(126,87,0,0.4)] border-2 border-[#ffdeac] active:scale-95 transition-all cursor-pointer group"
          >
            <span
              className="material-symbols-outlined text-[24px] group-hover:scale-110 transition-transform"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              mic
            </span>
            <span className="font-extrabold text-[13px] pr-1">
              음성 내검 기록
            </span>
          </button>
        </div>
      </div>

      {/* Voice Record Sheet Modal */}
      <VoiceRecordSheet
        isOpen={isVoiceSheetOpen}
        onClose={() => setIsVoiceSheetOpen(false)}
        selectedDate={selectedDate}
        targetHives={targetHives}
        weather={currentWeather}
        onSaveNewLog={(newLog) => handleAddNewLog(newLog)}
        onOpenHiveSelect={onOpenHiveSelect}
      />

      {/* Journal Edit Modal */}
      <JournalEditModal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        log={editingLog}
        onSave={handleUpdateLog}
        maxHiveCount={maxHiveCount}
      />

      {/* Journal PDF Export Modal */}
      <JournalExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        logs={allLogs}
      />

      {/* Toast Notification */}
      {showSaveToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-[#0d1e25] text-white px-5 py-3 rounded-full shadow-2xl flex items-center gap-2 text-[13px] font-bold animate-bounce border border-white/20">
          <span className="material-symbols-outlined text-[#a0f399] text-[20px]">
            check_circle
          </span>
          <span>{showSaveToast}</span>
        </div>
      )}
    </div>
  );
};
