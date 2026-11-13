import React, { useState } from 'react';

interface HiveSelectModalProps {
  isOpen: boolean;
  currentRange: string;
  maxHiveCount?: number;
  onClose: () => void;
  onSelectRange: (range: string) => void;
}

export const HiveSelectModal: React.FC<HiveSelectModalProps> = ({
  isOpen,
  currentRange,
  maxHiveCount = 50,
  onClose,
  onSelectRange
}) => {
  const [customStart, setCustomStart] = useState<number>(1);
  const [customEnd, setCustomEnd] = useState<number>(maxHiveCount);

  if (!isOpen) return null;

  const q1 = Math.max(1, Math.floor(maxHiveCount * 0.4));
  const q2 = Math.max(q1 + 1, Math.floor(maxHiveCount * 0.7));

  const presetRanges = [
    { label: `전체 벌통 (#1 ~ #${maxHiveCount})`, value: `#1 ~ #${maxHiveCount}` },
    ...(maxHiveCount >= 10 ? [{ label: `제1구역 (#1 ~ #${q1})`, value: `#1 ~ #${q1}` }] : []),
    ...(maxHiveCount >= 20 ? [{ label: `제2구역 (#${q1 + 1} ~ #${q2})`, value: `#${q1 + 1} ~ #${q2}` }] : []),
    ...(maxHiveCount >= 30 ? [{ label: `제3구역 (#${q2 + 1} ~ #${maxHiveCount})`, value: `#${q2 + 1} ~ #${maxHiveCount}` }] : []),
    { label: '#1번 벌통 (개별 지정)', value: '#1' },
    ...(maxHiveCount >= 12 ? [{ label: '#12번 벌통 (여왕벌 Q2024)', value: '#12' }] : [])
  ];

  const handleApplyCustom = () => {
    const min = Math.max(1, Math.min(customStart, maxHiveCount));
    const max = Math.max(1, Math.min(customEnd, maxHiveCount));
    if (min === max) {
      onSelectRange(`#${min}`);
    } else {
      const realMin = Math.min(min, max);
      const realMax = Math.max(min, max);
      onSelectRange(`#${realMin} ~ #${realMax}`);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl border-2 border-[#7e5700] animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#7e5700] text-[22px]">
              hive
            </span>
            <h3 className="font-bold text-[18px] text-[#0d1e25]">대상 벌통 선택</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#514532] hover:bg-[#d9ebf5]"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Presets */}
        <div className="space-y-2 mb-4">
          <span className="text-[12px] font-bold text-[#514532]">빠른 구역 선택</span>
          <div className="grid grid-cols-1 gap-1.5">
            {presetRanges.map((preset) => {
              const isSelected = currentRange === preset.value;
              return (
                <button
                  key={preset.value}
                  onClick={() => {
                    onSelectRange(preset.value);
                    onClose();
                  }}
                  className={`p-2.5 rounded-xl text-[13px] text-left font-bold flex justify-between items-center transition-all ${
                    isSelected
                      ? 'bg-[#ffdeac] border-2 border-[#7e5700] text-[#281900]'
                      : 'bg-[#f4faff] border border-[#d6c4ac]/60 text-[#0d1e25] hover:bg-[#d9ebf5]'
                  }`}
                >
                  <span>{preset.label}</span>
                  {isSelected && (
                    <span className="material-symbols-outlined text-[#7e5700] text-[18px]">
                      check
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Range */}
        <div className="bg-[#d9ebf5] p-3 rounded-2xl border border-[#d6c4ac]/60 mb-4 space-y-2">
          <span className="text-[12px] font-bold text-[#514532] block">
            직접 번호 지정
          </span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              max={maxHiveCount}
              value={customStart}
              onChange={(e) => setCustomStart(Number(e.target.value))}
              className="w-20 p-2 bg-white rounded-lg border border-[#d6c4ac] text-center font-bold text-[#0d1e25]"
            />
            <span className="text-[#514532] font-bold">~</span>
            <input
              type="number"
              min="1"
              max={maxHiveCount}
              value={customEnd}
              onChange={(e) => setCustomEnd(Number(e.target.value))}
              className="w-20 p-2 bg-white rounded-lg border border-[#d6c4ac] text-center font-bold text-[#0d1e25]"
            />
            <span className="text-[13px] font-bold text-[#0d1e25]">번 (최대 #{maxHiveCount}번)</span>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleApplyCustom}
            className="flex-1 py-3 bg-[#7e5700] hover:bg-[#604100] text-white font-bold rounded-xl text-[13px] shadow-xs"
          >
            적용하기
          </button>
          <button
            onClick={onClose}
            className="px-4 py-3 bg-white border border-[#d6c4ac] text-[#0d1e25] font-bold rounded-xl text-[13px]"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
};
