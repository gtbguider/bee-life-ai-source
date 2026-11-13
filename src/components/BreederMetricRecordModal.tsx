import React, { useState } from 'react';
import { BreederQueen, BreederMetricLog } from '../types';

interface BreederMetricRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  queen: BreederQueen;
  onAddMetricLog: (queenId: string, log: Omit<BreederMetricLog, 'id'>) => void;
}

export const BreederMetricRecordModal: React.FC<BreederMetricRecordModalProps> = ({
  isOpen,
  onClose,
  queen,
  onAddMetricLog
}) => {
  const [date, setDate] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [honeyYieldKg, setHoneyYieldKg] = useState<number>(queen.honeyHarvestKg || 18.0);
  const [propolisYieldG, setPropolisYieldG] = useState<number>(queen.propolisYieldG || 300);
  const [royalJellyYieldG, setRoyalJellyYieldG] = useState<number>(queen.royalJellyYieldG || 240);
  const [colonyStrength, setColonyStrength] = useState<number>(queen.colonyStrength || 8);
  const [eggLayingRate, setEggLayingRate] = useState<number>(queen.eggLayingRate || 94);
  const [notes, setNotes] = useState<string>('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddMetricLog(queen.id, {
      date,
      honeyYieldKg: Number(honeyYieldKg) || 0,
      propolisYieldG: Number(propolisYieldG) || 0,
      royalJellyYieldG: Number(royalJellyYieldG) || 0,
      colonyStrength: Number(colonyStrength) || 7,
      eggLayingRate: Number(eggLayingRate) || 90,
      notes: notes.trim() || '정기 형질 검정치 기록'
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl p-5 max-w-md w-full shadow-2xl border-2 border-[#7e5700] my-8 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-[#d6c4ac]">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-[#ffdeac] text-[#7e5700] flex items-center justify-center shadow-2xs">
              <span className="material-symbols-outlined text-[20px]">edit_note</span>
            </div>
            <div>
              <h3 className="font-black text-[17px] text-[#0d1e25]">
                #{queen.hiveId}번 벌통 종봉 형질 수치 기록
              </h3>
              <p className="text-[11px] text-[#514532]">
                {queen.name} ({queen.generation} 세대)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#514532] hover:bg-[#d9ebf5]"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 mt-3">
          <div className="bg-[#fffaf0] border border-[#ffdeac] p-2.5 rounded-xl flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-[#7e5700] flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px]">trending_up</span>
              <span>지속적 형질 검정 누적</span>
            </span>
            <span className="text-[11px] text-[#514532]">
              기존 검정 기록: <b className="text-[#0d1e25]">{queen.logs?.length || 0}회</b>
            </span>
          </div>

          <div>
            <label className="text-[11px] font-extrabold text-[#514532] block mb-1">
              검정 / 측정 일자:
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full py-2 px-3 bg-[#f4faff] border border-[#d6c4ac] rounded-xl text-[13px] font-bold text-[#0d1e25] focus:outline-none focus:border-[#7e5700]"
              required
            />
          </div>

          {/* 4 Core Metrics Continuous Recording */}
          <div className="bg-[#f8fbfe] border border-[#d4e5ef] p-3 rounded-2xl space-y-2.5">
            <span className="text-[11px] font-black text-[#0d1e25] block">
              이번 측정 형질 수치:
            </span>

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white p-2.5 rounded-xl border border-[#d6c4ac]/60">
                <label className="text-[10px] font-extrabold text-[#514532] block mb-0.5">
                  🍯 채밀력 (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={honeyYieldKg}
                  onChange={(e) => setHoneyYieldKg(Number(e.target.value))}
                  className="w-full py-1 text-center font-black text-[16px] text-[#7e5700] border-b border-[#7e5700]/30 focus:outline-none"
                  required
                />
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-[#d6c4ac]/60">
                <label className="text-[10px] font-extrabold text-[#514532] block mb-0.5">
                  🐝 프로폴리스 (g)
                </label>
                <input
                  type="number"
                  step="5"
                  min="0"
                  max="2000"
                  value={propolisYieldG}
                  onChange={(e) => setPropolisYieldG(Number(e.target.value))}
                  className="w-full py-1 text-center font-black text-[16px] text-[#0277bd] border-b border-[#0277bd]/30 focus:outline-none"
                  required
                />
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-[#d6c4ac]/60">
                <label className="text-[10px] font-extrabold text-[#514532] block mb-0.5">
                  👑 로열제리 (g)
                </label>
                <input
                  type="number"
                  step="5"
                  min="0"
                  max="2000"
                  value={royalJellyYieldG}
                  onChange={(e) => setRoyalJellyYieldG(Number(e.target.value))}
                  className="w-full py-1 text-center font-black text-[16px] text-[#d81b60] border-b border-[#d81b60]/30 focus:outline-none"
                  required
                />
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-[#d6c4ac]/60">
                <label className="text-[10px] font-extrabold text-[#514532] block mb-0.5">
                  💪 봉군 세력 (소비 매수)
                </label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  max="15"
                  value={colonyStrength}
                  onChange={(e) => setColonyStrength(Number(e.target.value))}
                  className="w-full py-1 text-center font-black text-[16px] text-[#1b6d24] border-b border-[#1b6d24]/30 focus:outline-none"
                  required
                />
              </div>
            </div>

            {/* Egg Laying Rate */}
            <div className="bg-white p-2 rounded-xl border border-[#d6c4ac]/60 flex items-center justify-between">
              <label className="text-[11px] font-bold text-[#514532]">
                산란력 (%):
              </label>
              <input
                type="number"
                step="1"
                min="50"
                max="100"
                value={eggLayingRate}
                onChange={(e) => setEggLayingRate(Number(e.target.value))}
                className="w-20 text-right font-black text-[15px] text-[#0d1e25] focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-[11px] font-extrabold text-[#514532] block mb-1">
              측정 검정 메모 / 작업 내용:
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="예: 2차 아카시아 만상 채밀 검정 완료, 산란 패턴 균일"
              className="w-full py-2 px-3 bg-[#f4faff] border border-[#d6c4ac] rounded-xl text-[12px] text-[#0d1e25] focus:outline-none focus:border-[#7e5700]"
            />
          </div>

          {/* Past History Preview */}
          {queen.logs && queen.logs.length > 0 && (
            <div className="pt-1">
              <span className="text-[10px] font-bold text-[#514532] block mb-1">
                이전 기록 이력 (최근):
              </span>
              <div className="max-h-24 overflow-y-auto space-y-1 p-1 bg-[#f4faff] rounded-xl border border-[#d4e5ef]">
                {queen.logs.slice(0, 3).map((l) => (
                  <div key={l.id} className="text-[10px] text-[#514532] flex justify-between bg-white p-1 rounded">
                    <span>{l.date}: {l.notes}</span>
                    <span className="font-bold text-[#7e5700]">채밀 {l.honeyYieldKg}kg / 로열 {l.royalJellyYieldG}g</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Submit */}
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              className="flex-1 py-3 bg-[#7e5700] hover:bg-[#604100] text-white font-black text-[13px] rounded-xl shadow-xs cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px]">save</span>
              <span>수치 기록 저장 및 누적</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-3 bg-white border border-[#d6c4ac] text-[#514532] font-bold text-[13px] rounded-xl cursor-pointer hover:bg-[#d9ebf5]"
            >
              취소
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
