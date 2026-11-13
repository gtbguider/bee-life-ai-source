import React, { useState, useEffect } from 'react';
import { VoiceLogItem } from '../types';

interface JournalEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  log: VoiceLogItem | null;
  onSave: (updatedLog: VoiceLogItem) => Promise<boolean>;
  maxHiveCount?: number;
}

export const JournalEditModal: React.FC<JournalEditModalProps> = ({
  isOpen,
  onClose,
  log,
  onSave,
  maxHiveCount = 50
}) => {
  const [date, setDate] = useState<string>('');
  const [hiveRange, setHiveRange] = useState<string>('');
  const [selectedHiveId, setSelectedHiveId] = useState<number | undefined>(undefined);
  const [hiveSelectMode, setHiveSelectMode] = useState<'individual' | 'range'>('individual');
  const [category, setCategory] = useState<string>('벌통 상태');
  const [status, setStatus] = useState<'완료' | '주의' | '진행중' | '대기' | '채밀'>('완료');
  const [text, setText] = useState<string>('');
  const [honeyYieldKg, setHoneyYieldKg] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize form state whenever log changes
  useEffect(() => {
    if (log) {
      setDate(log.date || '');
      setHiveRange(log.hiveRange || '#1 ~ #50');
      setSelectedHiveId(typeof log.hiveId === 'number' ? log.hiveId : undefined);
      setCategory(log.category || '벌통 상태');
      setStatus(log.status || '완료');
      setText(log.text || '');
      setHoneyYieldKg(
        log.honeyYieldKg !== undefined && !isNaN(log.honeyYieldKg)
          ? String(log.honeyYieldKg)
          : ''
      );
      setErrorMessage(null);

      // Determine initial hive selection mode
      if (typeof log.hiveId === 'number') {
        setHiveSelectMode('individual');
      } else if (log.hiveRange && log.hiveRange.includes('~')) {
        setHiveSelectMode('range');
      } else {
        setHiveSelectMode('individual');
      }
    }
  }, [log]);

  if (!isOpen || !log) return null;

  const categories = ['벌통 상태', '급이/사양', '방제', '채밀량', '여왕벌', '기타'];
  const statusOptions: Array<'완료' | '주의' | '채밀' | '진행중' | '대기'> = [
    '완료',
    '주의',
    '채밀',
    '진행중',
    '대기'
  ];

  const q1 = Math.max(1, Math.floor(maxHiveCount * 0.4));
  const q2 = Math.max(q1 + 1, Math.floor(maxHiveCount * 0.7));

  const presetRanges = [
    { label: `전체 벌통 (#1 ~ #${maxHiveCount})`, range: `#1 ~ #${maxHiveCount}` },
    ...(maxHiveCount >= 10 ? [{ label: `제1구역 (#1 ~ #${q1})`, range: `#1 ~ #${q1}` }] : []),
    ...(maxHiveCount >= 20 ? [{ label: `제2구역 (#${q1 + 1} ~ #${q2})`, range: `#${q1 + 1} ~ #${q2}` }] : []),
    ...(maxHiveCount >= 30 ? [{ label: `제3구역 (#${q2 + 1} ~ #${maxHiveCount})`, range: `#${q2 + 1} ~ #${maxHiveCount}` }] : [])
  ];

  // Handle individual hive number selection
  const handleSelectIndividualHive = (num: number) => {
    setSelectedHiveId(num);
    setHiveRange(`${num}번 벌통`);
  };

  // Handle preset range selection
  const handleSelectRange = (rangeStr: string) => {
    setSelectedHiveId(undefined);
    setHiveRange(rangeStr);
  };

  // Submit updated log
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) {
      setErrorMessage('양봉일지 내용을 입력해주세요.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      // Build safe updated log object preserving existing data
      const updatedLog: VoiceLogItem = {
        ...log, // Keep all existing untouched properties (inspectionDetails, weatherSnapshot, tags, timestamp, audioDuration, etc.)
        id: log.id, // Guarantee exact same document ID
        date,
        hiveRange,
        category: category as any,
        status,
        text: text.trim(),
        // Keep originalText intact if it already exists; never copy text into originalText, never invent if missing
        ...(log.originalText !== undefined ? { originalText: log.originalText } : {}),
        // Keep aiSummary intact if it exists
        ...(log.aiSummary !== undefined ? { aiSummary: log.aiSummary } : {})
      };

      // Set or clear hiveId / hiveIds synchronously with hiveRange
      if (selectedHiveId !== undefined && !hiveRange.includes('~')) {
        updatedLog.hiveId = selectedHiveId;
        delete updatedLog.hiveIds;
      } else if (hiveRange.includes('~')) {
        delete updatedLog.hiveId;
        const rangeMatch = hiveRange.match(/#?([0-9]{1,4})\s*~\s*#?([0-9]{1,4})/);
        if (rangeMatch) {
          const s = parseInt(rangeMatch[1], 10);
          const e = parseInt(rangeMatch[2], 10);
          if (!isNaN(s) && !isNaN(e) && s > 0 && e >= s && e - s <= 500) {
            updatedLog.hiveIds = Array.from({ length: e - s + 1 }, (_, i) => s + i);
          }
        }
      } else if (log.hiveId !== undefined) {
        updatedLog.hiveId = log.hiveId;
      }

      // Handle honeyYieldKg
      if (honeyYieldKg.trim() !== '' && !isNaN(parseFloat(honeyYieldKg))) {
        updatedLog.honeyYieldKg = parseFloat(honeyYieldKg);
      } else {
        delete updatedLog.honeyYieldKg;
      }

      const success = await onSave(updatedLog);
      if (success) {
        onClose();
      } else {
        setErrorMessage('저장에 실패했습니다. 네트워크 연결을 확인하고 다시 시도해주세요.');
      }
    } catch (err: any) {
      setErrorMessage('저장 중 오류가 발생했습니다: ' + (err?.message || '알 수 없는 오류'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-lg rounded-3xl p-5 border-2 border-[#7e5700] shadow-2xl space-y-4 my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#d4e5ef] pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#ffb300]/20 flex items-center justify-center text-[#7e5700]">
              <span className="material-symbols-outlined text-[20px]">edit_note</span>
            </div>
            <div>
              <h3 className="text-[17px] font-bold text-[#0d1e25]">양봉일지 기록 수정</h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[11px] font-mono text-[#514532]">문서 ID: {log.id}</span>
                {log.inspectionDetails && (
                  <span className="text-[10px] font-bold bg-[#a0f399]/40 text-[#1b6d24] px-1.5 py-0.2 rounded">
                    세부내검 데이터 연동됨
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#514532] hover:bg-[#d9ebf5] transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto pr-1 flex-1">
          {errorMessage && (
            <div className="p-3 bg-[#fff0f0] border border-[#ba1a1a]/30 rounded-xl text-[#ba1a1a] text-[12px] font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">error</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. Original voice dictation reference (READ-ONLY) */}
          {log.originalText && (
            <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-2xl space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-neutral-600 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">record_voice_over</span>
                  최초 원본 기록 (음성/원문)
                </span>
                <span className="text-[10px] font-semibold text-neutral-400 bg-neutral-200/80 px-1.5 py-0.5 rounded">
                  수정 불가 (이력 보존용)
                </span>
              </div>
              <p className="text-[13px] font-medium text-neutral-700 bg-white p-2.5 rounded-xl border border-neutral-200/80 whitespace-pre-wrap leading-relaxed">
                {log.originalText}
              </p>
              <span className="text-[10px] text-neutral-400 block pt-0.5">
                ※ 최초 등록된 음성 원본은 신뢰성 보존을 위해 변경되지 않으며, 아래 입력창의 최종 양봉일지만 수정됩니다.
              </span>
            </div>
          )}

          {/* 2. Date & Hive Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Date */}
            <div>
              <label className="block text-[12px] font-bold text-[#514532] mb-1">
                기록 일자
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-3 py-2 bg-[#f4faff] border border-[#d6c4ac] rounded-xl text-[13px] font-bold text-[#0d1e25] focus:outline-none focus:border-[#7e5700]"
              />
            </div>

            {/* Current Hive Selection Display */}
            <div>
              <label className="block text-[12px] font-bold text-[#514532] mb-1">
                대상 벌통 번호 / 구역
              </label>
              <div className="flex items-center gap-1.5">
                <span className="w-full px-3 py-2 bg-[#ffdeac]/50 border border-[#7e5700]/50 rounded-xl text-[13px] font-bold text-[#281900] truncate">
                  {hiveRange || '선택 없음'}
                  {selectedHiveId !== undefined && (
                    <span className="ml-1 text-[11px] text-[#7e5700] font-mono">
                      (ID: #{selectedHiveId})
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* 3. Hive Selector Tabs */}
          <div className="p-3 bg-[#f4faff] border border-[#d6c4ac]/70 rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold text-[#0d1e25] flex items-center gap-1">
                <span className="material-symbols-outlined text-[#7e5700] text-[16px]">hive</span>
                벌통 연결 변경
              </span>
              <div className="flex bg-white rounded-lg p-0.5 border border-[#d6c4ac]/60 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setHiveSelectMode('individual')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    hiveSelectMode === 'individual'
                      ? 'bg-[#7e5700] text-white'
                      : 'text-[#514532] hover:text-[#0d1e25]'
                  }`}
                >
                  개별 벌통
                </button>
                <button
                  type="button"
                  onClick={() => setHiveSelectMode('range')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    hiveSelectMode === 'range'
                      ? 'bg-[#7e5700] text-white'
                      : 'text-[#514532] hover:text-[#0d1e25]'
                  }`}
                >
                  구역 / 전체
                </button>
              </div>
            </div>

            {hiveSelectMode === 'individual' ? (
              <div>
                <label className="block text-[11px] font-semibold text-[#514532] mb-1">
                  등록된 벌통 목록에서 선택 (hiveId 자동 동기화)
                </label>
                <select
                  value={selectedHiveId !== undefined ? selectedHiveId : ''}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val)) {
                      handleSelectIndividualHive(val);
                    }
                  }}
                  className="w-full px-3 py-2 bg-white border border-[#d6c4ac] rounded-xl text-[13px] font-bold text-[#0d1e25] focus:outline-none focus:border-[#7e5700]"
                >
                  <option value="" disabled>
                    벌통을 선택하세요
                  </option>
                  {Array.from({ length: maxHiveCount }, (_, i) => i + 1).map((num) => (
                    <option key={num} value={num}>
                      #{num}번 벌통
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-[11px] font-semibold text-[#514532] mb-1">
                  빠른 구역 선택
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {presetRanges.map((preset) => {
                    const isSelected = hiveRange === preset.range;
                    return (
                      <button
                        key={preset.range}
                        type="button"
                        onClick={() => handleSelectRange(preset.range)}
                        className={`p-2 rounded-xl text-[12px] font-bold text-center transition-all ${
                          isSelected
                            ? 'bg-[#ffdeac] border-2 border-[#7e5700] text-[#281900]'
                            : 'bg-white border border-[#d6c4ac] text-[#514532] hover:bg-[#d9ebf5]'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 4. Category and Status */}
          <div className="space-y-2">
            <label className="block text-[12px] font-bold text-[#514532]">작업 분류</label>
            <div className="flex flex-wrap gap-1.5">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-[12px] font-bold transition-all ${
                    category === cat
                      ? 'bg-[#7e5700] text-white shadow-xs'
                      : 'bg-[#f4faff] border border-[#d6c4ac] text-[#514532] hover:bg-[#d9ebf5]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* 5. Status Selector */}
          <div className="space-y-2">
            <label className="block text-[12px] font-bold text-[#514532]">내검/작업 상태</label>
            <div className="grid grid-cols-5 gap-1.5">
              {statusOptions.map((st) => {
                const isSelected = status === st;
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatus(st)}
                    className={`py-2 rounded-xl text-[12px] font-bold text-center border transition-all ${
                      isSelected
                        ? st === '주의'
                          ? 'bg-[#ba1a1a] text-white border-[#ba1a1a]'
                          : st === '채밀'
                          ? 'bg-[#ffb300] text-[#3d2700] border-[#ffb300]'
                          : st === '완료'
                          ? 'bg-[#1b6d24] text-white border-[#1b6d24]'
                          : 'bg-[#7e5700] text-white border-[#7e5700]'
                        : 'bg-white text-[#514532] border-[#d6c4ac] hover:bg-[#f4faff]'
                    }`}
                  >
                    {st}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 6. Honey Yield (if harvesting or exists) */}
          {(category === '채밀량' || status === '채밀' || log.honeyYieldKg !== undefined) && (
            <div className="p-3 bg-[#fffdf2] border border-[#ffb300]/60 rounded-2xl space-y-1">
              <label className="block text-[12px] font-bold text-[#7e5700] flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">egg</span>
                채밀 수확량 (kg)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={honeyYieldKg}
                  onChange={(e) => setHoneyYieldKg(e.target.value)}
                  placeholder="예: 24.5"
                  className="w-full px-3 py-2 bg-white border border-[#ffb300] rounded-xl text-[13px] font-bold text-[#0d1e25] focus:outline-none"
                />
                <span className="text-[13px] font-bold text-[#7e5700]">kg</span>
              </div>
            </div>
          )}

          {/* 7. Journal Content (text) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-[12px] font-bold text-[#514532]">
                양봉일지 내용 (최종본)
              </label>
              <span className="text-[10px] text-[#514532]">사용자 수정 기록</span>
            </div>
            <textarea
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="내검 상세 내역을 입력하세요..."
              className="w-full px-3.5 py-2.5 bg-[#f4faff] border border-[#d6c4ac] rounded-2xl text-[13px] font-medium text-[#0d1e25] focus:outline-none focus:border-[#7e5700] leading-relaxed resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="flex-1 py-3 bg-neutral-100 hover:bg-neutral-200 text-[#514532] rounded-xl font-bold text-[13px] transition-colors cursor-pointer"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-2 py-3 bg-[#7e5700] hover:bg-[#604100] text-white rounded-xl font-bold text-[13px] flex items-center justify-center gap-2 shadow-md active:scale-98 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>수정 사항 저장 중...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">check</span>
                  <span>양봉일지 수정 저장</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
