import React, { useState, useMemo, useRef } from 'react';
import { VoiceLogItem } from '../types';
import { loadUserProfile } from '../services/userProfile';
import {
  JournalFilterOptions,
  filterJournalLogs,
  prepareJournalExportData,
  exportJournalToPdf
} from '../services/pdfExportService';
import { PrintableJournalDocument } from './PrintableJournalDocument';

interface JournalExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: VoiceLogItem[];
}

const CATEGORIES: Array<JournalFilterOptions['category']> = [
  '전체',
  '벌통 상태',
  '채밀량',
  '날씨',
  '방제',
  '급이/사양',
  '여왕벌',
  '기타'
];

export const JournalExportModal: React.FC<JournalExportModalProps> = ({
  isOpen,
  onClose,
  logs
}) => {
  const [periodMode, setPeriodMode] = useState<'all' | 'thisMonth' | 'custom'>('thisMonth');

  // Default dates for custom mode
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
  const todayStr = now.toISOString().split('T')[0];
  const firstDayOfMonth = `${currentYear}-${currentMonth}-01`;

  const [startDate, setStartDate] = useState<string>(firstDayOfMonth);
  const [endDate, setEndDate] = useState<string>(todayStr);
  const [selectedHive, setSelectedHive] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<JournalFilterOptions['category']>('전체');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [exportSuccess, setExportSuccess] = useState<boolean>(false);

  const printDocRef = useRef<HTMLDivElement>(null);

  // Extract unique hive options from actual logs
  const availableHives = useMemo(() => {
    const hiveMap = new Map<number | string, string>();

    logs.forEach((log) => {
      if (typeof log.hiveId === 'number' && log.hiveId > 0) {
        hiveMap.set(log.hiveId, `${log.hiveId}번 벌통`);
      } else if (log.hiveRange && log.hiveRange.trim()) {
        const trimmed = log.hiveRange.trim();
        hiveMap.set(trimmed, trimmed);
      }
    });

    // Sort numerically if possible, otherwise alphabetically
    return Array.from(hiveMap.entries()).sort((a, b) => {
      const numA = typeof a[0] === 'number' ? a[0] : parseInt(String(a[0]).replace(/[^0-9]/g, ''), 10);
      const numB = typeof b[0] === 'number' ? b[0] : parseInt(String(b[0]).replace(/[^0-9]/g, ''), 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return String(a[1]).localeCompare(String(b[1]));
    });
  }, [logs]);

  // Current filter options
  const filterOptions: JournalFilterOptions = useMemo(
    () => ({
      periodMode,
      startDate: periodMode === 'custom' ? startDate : undefined,
      endDate: periodMode === 'custom' ? endDate : undefined,
      selectedHive,
      category: selectedCategory
    }),
    [periodMode, startDate, endDate, selectedHive, selectedCategory]
  );

  // Filtered logs
  const filteredLogs = useMemo(
    () => filterJournalLogs(logs, filterOptions),
    [logs, filterOptions]
  );

  // User profile for farm information
  const userProfile = useMemo(() => loadUserProfile(), []);

  // Structured export report data
  const exportData = useMemo(
    () => prepareJournalExportData(filteredLogs, userProfile, filterOptions),
    [filteredLogs, userProfile, filterOptions]
  );

  // Execute PDF export
  const handleDownloadPdf = async () => {
    if (filteredLogs.length === 0 || isGenerating) return;

    try {
      setIsGenerating(true);
      setExportSuccess(false);

      // Brief delay to ensure offscreen rendering is complete
      await new Promise((resolve) => setTimeout(resolve, 150));

      const success = await exportJournalToPdf(printDocRef.current, exportData.filename);
      if (success) {
        setExportSuccess(true);
        setTimeout(() => {
          setExportSuccess(false);
          onClose();
        }, 1500);
      }
    } catch (err) {
      console.error('Error generating PDF:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-[#e8dec8] flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-[#f0e7d5] flex items-center justify-between bg-gradient-to-r from-[#fff9ee] to-[#ffffff] shrink-0">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#7e5700] text-[24px]">
              picture_as_pdf
            </span>
            <div>
              <h2 className="text-[17px] font-black text-[#2b1e00] leading-tight">
                양봉일지 PDF 다운로드
              </h2>
              <p className="text-[11px] text-[#7e5700] font-medium">
                원하는 기간과 벌통을 선택해 A4 규격 양봉일지로 출력합니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#887864] hover:bg-[#f3ebe0] transition-colors cursor-pointer"
            aria-label="닫기"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Modal Body: Filter Options */}
        <div className="p-5 overflow-y-auto space-y-4 text-[#2b1e00] text-[13px]">
          {/* 1. 기간 선택 */}
          <div className="space-y-2">
            <label className="text-[12px] font-bold text-[#554632] flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px] text-[#7e5700]">
                calendar_month
              </span>
              <span>1. 조회 기간 선택</span>
            </label>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#fbf8f2] rounded-xl border border-[#e8dfcf]">
              <button
                type="button"
                onClick={() => setPeriodMode('all')}
                className={`py-1.5 text-[12px] font-bold rounded-lg transition-all ${
                  periodMode === 'all'
                    ? 'bg-[#7e5700] text-white shadow-2xs'
                    : 'text-[#6d5b45] hover:bg-[#f1e8d9]'
                }`}
              >
                전체 기간
              </button>
              <button
                type="button"
                onClick={() => setPeriodMode('thisMonth')}
                className={`py-1.5 text-[12px] font-bold rounded-lg transition-all ${
                  periodMode === 'thisMonth'
                    ? 'bg-[#7e5700] text-white shadow-2xs'
                    : 'text-[#6d5b45] hover:bg-[#f1e8d9]'
                }`}
              >
                이번 달 ({currentMonth}월)
              </button>
              <button
                type="button"
                onClick={() => setPeriodMode('custom')}
                className={`py-1.5 text-[12px] font-bold rounded-lg transition-all ${
                  periodMode === 'custom'
                    ? 'bg-[#7e5700] text-white shadow-2xs'
                    : 'text-[#6d5b45] hover:bg-[#f1e8d9]'
                }`}
              >
                직접 선택
              </button>
            </div>

            {/* Custom Date Inputs */}
            {periodMode === 'custom' && (
              <div className="grid grid-cols-2 gap-2 pt-1 animate-in fade-in duration-150">
                <div>
                  <label className="text-[11px] font-semibold text-[#7e5700] block mb-1">
                    시작일
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-[12px] bg-white border border-[#d6c8b2] rounded-lg focus:outline-hidden focus:border-[#7e5700]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-[#7e5700] block mb-1">
                    종료일
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-[12px] bg-white border border-[#d6c8b2] rounded-lg focus:outline-hidden focus:border-[#7e5700]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 2. 벌통 선택 */}
          <div className="space-y-2">
            <label className="text-[12px] font-bold text-[#554632] flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px] text-[#7e5700]">
                grid_view
              </span>
              <span>2. 벌통 선택</span>
            </label>
            <select
              value={selectedHive}
              onChange={(e) => setSelectedHive(e.target.value)}
              className="w-full px-3 py-2 text-[12.5px] font-semibold bg-white border border-[#d6c8b2] rounded-xl focus:outline-hidden focus:border-[#7e5700] cursor-pointer"
            >
              <option value="all">전체 벌통 (모든 벌통 기록 포함)</option>
              {availableHives.map(([key, label]) => (
                <option key={String(key)} value={label}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* 3. 기록 유형 선택 */}
          <div className="space-y-2">
            <label className="text-[12px] font-bold text-[#554632] flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px] text-[#7e5700]">
                label
              </span>
              <span>3. 기록 유형 선택</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 text-[11.5px] font-bold rounded-full transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#7e5700] text-white shadow-2xs'
                        : 'bg-[#f4efe5] text-[#6d5b45] hover:bg-[#eadecc]'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. 실시간 미리보기 및 집계 박스 */}
          <div className="pt-2">
            <div className="bg-[#fcf8f0] border border-[#f0dfc2] rounded-2xl p-3.5 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-[#7e5700]">
                <span>필터 적용 결과 요약</span>
                <span>{exportData.queryPeriodDisplay}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center pt-1">
                <div className="bg-white/80 rounded-xl p-2 border border-[#f2e7d3]">
                  <div className="text-[10px] text-[#887864]">선택된 기록</div>
                  <div className="text-[15px] font-black text-[#2b1e00]">
                    {exportData.stats.totalCount}
                    <span className="text-[11px] font-normal text-[#887864]"> 건</span>
                  </div>
                </div>
                <div className="bg-white/80 rounded-xl p-2 border border-[#f2e7d3]">
                  <div className="text-[10px] text-[#887864]">기록된 벌통</div>
                  <div className="text-[15px] font-black text-[#2b1e00]">
                    {exportData.stats.hiveCount}
                    <span className="text-[11px] font-normal text-[#887864]"> 개</span>
                  </div>
                </div>
                <div className="bg-white/80 rounded-xl p-2 border border-[#f2e7d3]">
                  <div className="text-[10px] text-[#887864]">총 채밀량</div>
                  <div className="text-[15px] font-black text-[#b34700]">
                    {exportData.stats.totalYieldKg > 0 ? `${exportData.stats.totalYieldKg} kg` : '-'}
                  </div>
                </div>
              </div>

              {/* Empty Data Warning */}
              {exportData.stats.totalCount === 0 && (
                <div className="mt-2 p-2.5 rounded-xl bg-[#feebeb] border border-[#f8c4c4] text-[#a12b2b] text-[11.5px] font-bold flex items-center gap-1.5 animate-in fade-in">
                  <span className="material-symbols-outlined text-[16px]">info</span>
                  <span>선택한 조건에 해당하는 양봉일지가 없습니다.</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-5 py-3.5 border-t border-[#f0e7d5] bg-[#faf7f0] flex items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-[#887864] truncate max-w-[200px]" title={exportData.filename}>
            {exportData.filename}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isGenerating}
              className="px-4 py-2 text-[12px] font-bold text-[#6d5b45] hover:bg-[#ede3d4] rounded-xl transition-colors cursor-pointer"
            >
              닫기
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={exportData.stats.totalCount === 0 || isGenerating}
              className={`px-4 py-2 text-[12.5px] font-black rounded-xl flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer ${
                exportData.stats.totalCount === 0 || isGenerating
                  ? 'bg-[#d6cbbe] text-[#8d8274] cursor-not-allowed shadow-none'
                  : exportSuccess
                  ? 'bg-[#2e7d32] text-white'
                  : 'bg-[#7e5700] hover:bg-[#684700] text-white'
              }`}
            >
              {isGenerating ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>PDF 파일 생성 중...</span>
                </>
              ) : exportSuccess ? (
                <>
                  <span className="material-symbols-outlined text-[16px]">check</span>
                  <span>다운로드 완료!</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">download</span>
                  <span>양봉일지 PDF 다운로드</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Offscreen Printable Document Container for html2canvas */}
        <div
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            zIndex: -9999,
            pointerEvents: 'none',
            visibility: 'visible',
            opacity: 1
          }}
        >
          <div ref={printDocRef}>
            <PrintableJournalDocument exportData={exportData} />
          </div>
        </div>
      </div>
    </div>
  );
};
