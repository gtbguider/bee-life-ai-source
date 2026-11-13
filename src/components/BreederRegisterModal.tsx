import React, { useState, useEffect } from 'react';
import { BreederQueen } from '../types';

interface BreederRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (queen: BreederQueen) => void;
  existingQueens: BreederQueen[];
  preselectedParentId?: string | null;
  preselectedHiveId?: number;
  editingQueen?: BreederQueen | null;
  maxHiveCount?: number;
}

export const BreederRegisterModal: React.FC<BreederRegisterModalProps> = ({
  isOpen,
  onClose,
  onSave,
  existingQueens,
  preselectedParentId,
  preselectedHiveId,
  editingQueen,
  maxHiveCount = 50
}) => {
  const [hiveId, setHiveId] = useState<number>(preselectedHiveId || 1);
  const [parentQueenId, setParentQueenId] = useState<string>(preselectedParentId || '');
  const [name, setName] = useState<string>('');
  const [generation, setGeneration] = useState<'F0' | 'F1' | 'F2' | 'F3' | 'F4'>('F2');
  const [breed, setBreed] = useState<string>('이탈리안-카니올란 교잡종 (우수)');
  const [installedDate, setInstalledDate] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [status, setStatus] = useState<'활동중' | '육성중' | '우수판정' | '도태/교체'>('활동중');
  
  // Core metrics
  const [honeyHarvestKg, setHoneyHarvestKg] = useState<number>(18.0);
  const [propolisYieldG, setPropolisYieldG] = useState<number>(300);
  const [royalJellyYieldG, setRoyalJellyYieldG] = useState<number>(240);
  const [colonyStrength, setColonyStrength] = useState<number>(8);
  const [eggLayingRate, setEggLayingRate] = useState<number>(94);
  const [docilityScore, setDocilityScore] = useState<'최상' | '우수' | '보통'>('최상');
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (editingQueen) {
      setHiveId(editingQueen.hiveId);
      setParentQueenId(editingQueen.parentQueenId || '');
      setName(editingQueen.name);
      setGeneration(editingQueen.generation);
      setBreed(editingQueen.breed);
      setInstalledDate(editingQueen.installedDate);
      setStatus(editingQueen.status);
      setHoneyHarvestKg(editingQueen.honeyHarvestKg);
      setPropolisYieldG(editingQueen.propolisYieldG);
      setRoyalJellyYieldG(editingQueen.royalJellyYieldG);
      setColonyStrength(editingQueen.colonyStrength);
      setEggLayingRate(editingQueen.eggLayingRate);
      setDocilityScore(editingQueen.docilityScore);
      setNotes(editingQueen.notes || '');
    } else {
      const initialHive = preselectedHiveId || 1;
      setHiveId(initialHive);
      const parentId = preselectedParentId || (existingQueens[0]?.id || '');
      setParentQueenId(parentId);
      
      const parent = existingQueens.find((q) => q.id === parentId);
      let calculatedGen: 'F0' | 'F1' | 'F2' | 'F3' | 'F4' = 'F2';
      if (parent) {
        if (parent.generation === 'F0') calculatedGen = 'F1';
        else if (parent.generation === 'F1') calculatedGen = 'F2';
        else if (parent.generation === 'F2') calculatedGen = 'F3';
        else if (parent.generation === 'F3') calculatedGen = 'F4';
      }
      setGeneration(calculatedGen);

      const year = new Date().getFullYear();
      setName(`여왕벌 Q${year}-${calculatedGen} (#${initialHive}번 벌통)`);
    }
  }, [editingQueen, preselectedHiveId, preselectedParentId, isOpen]);

  // When parent queen changes, auto-update suggested generation
  const handleParentChange = (newParentId: string) => {
    setParentQueenId(newParentId);
    if (!newParentId) {
      setGeneration('F0');
      return;
    }
    const parent = existingQueens.find((q) => q.id === newParentId);
    if (parent) {
      if (parent.generation === 'F0') setGeneration('F1');
      else if (parent.generation === 'F1') setGeneration('F2');
      else if (parent.generation === 'F2') setGeneration('F3');
      else if (parent.generation === 'F3') setGeneration('F4');
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('여왕벌 명칭을 입력해주세요.');
      return;
    }

    const newQueen: BreederQueen = {
      id: editingQueen?.id || `BQ-${Date.now()}`,
      name: name.trim(),
      hiveId: Number(hiveId) || 1,
      parentQueenId: parentQueenId ? parentQueenId : null,
      generation,
      breed: breed.trim(),
      installedDate,
      status,
      honeyHarvestKg: Number(honeyHarvestKg) || 0,
      propolisYieldG: Number(propolisYieldG) || 0,
      royalJellyYieldG: Number(royalJellyYieldG) || 0,
      colonyStrength: Number(colonyStrength) || 7,
      eggLayingRate: Number(eggLayingRate) || 90,
      docilityScore,
      notes: notes.trim(),
      logs: editingQueen?.logs || [
        {
          id: `log-${Date.now()}`,
          date: installedDate,
          honeyYieldKg: Number(honeyHarvestKg) || 0,
          propolisYieldG: Number(propolisYieldG) || 0,
          royalJellyYieldG: Number(royalJellyYieldG) || 0,
          colonyStrength: Number(colonyStrength) || 7,
          eggLayingRate: Number(eggLayingRate) || 90,
          notes: '종봉 최초 등록 및 초기 형질 측정 완료'
        }
      ]
    };

    onSave(newQueen);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl p-5 max-w-lg w-full shadow-2xl border-2 border-[#7e5700] my-8 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-[#d6c4ac]">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-[#ffdeac] text-[#7e5700] flex items-center justify-center shadow-2xs">
              <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                crown
              </span>
            </div>
            <div>
              <h3 className="font-black text-[18px] text-[#0d1e25]">
                {editingQueen ? '종봉 정보 및 형질 수정' : '우수 종봉 신규 등록'}
              </h3>
              <p className="text-[11px] text-[#514532]">
                벌통과 직접 연결되어 가계도 계보 및 검정 수치를 관리합니다
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#514532] hover:bg-[#d9ebf5] transition-all"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 mt-4">
          {/* Linked Hive Number & Mother Queen */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[11px] font-extrabold text-[#514532] block mb-1">
                연결할 벌통 번호 (1 ~ {maxHiveCount}호):
              </label>
              <div className="relative">
                <select
                  value={hiveId}
                  onChange={(e) => {
                    const h = Number(e.target.value);
                    setHiveId(h);
                    if (!editingQueen && !name) {
                      setName(`여왕벌 Q${new Date().getFullYear()}-${generation} (#${h}번 벌통)`);
                    }
                  }}
                  className="w-full py-2 pl-3 pr-8 bg-[#f4faff] border-2 border-[#7e5700]/50 rounded-xl font-bold text-[13px] text-[#0d1e25] focus:outline-none focus:border-[#7e5700]"
                >
                  {Array.from({ length: maxHiveCount }, (_, i) => i + 1).map((num) => (
                    <option key={num} value={num}>
                      #{num}번 벌통
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-extrabold text-[#514532] block mb-1">
                모계 여왕벌 (Mother Lineage):
              </label>
              <select
                value={parentQueenId}
                onChange={(e) => handleParentChange(e.target.value)}
                className="w-full py-2 px-2 bg-[#f4faff] border border-[#d6c4ac] rounded-xl font-medium text-[12px] text-[#0d1e25] focus:outline-none focus:border-[#7e5700]"
              >
                <option value="">-- 원종 (시조, 모계 없음) --</option>
                {existingQueens.map((q) => (
                  <option key={q.id} value={q.id}>
                    [{q.generation}] #{q.hiveId} {q.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Queen Name & Generation */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="col-span-2">
              <label className="text-[11px] font-extrabold text-[#514532] block mb-1">
                여왕벌 명칭 / 식별 태그:
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: 여왕벌 Q2024-A1 (#1번 벌통)"
                className="w-full py-2 px-3 bg-[#f4faff] border border-[#d6c4ac] rounded-xl text-[13px] font-bold text-[#0d1e25] focus:outline-none focus:border-[#7e5700]"
                required
              />
            </div>
            <div>
              <label className="text-[11px] font-extrabold text-[#514532] block mb-1">
                세대 (Gen):
              </label>
              <select
                value={generation}
                onChange={(e) => setGeneration(e.target.value as any)}
                className="w-full py-2 px-2 bg-[#f4faff] border border-[#d6c4ac] rounded-xl font-bold text-[13px] text-[#7e5700] focus:outline-none focus:border-[#7e5700]"
              >
                <option value="F0">F0 (원종)</option>
                <option value="F1">F1 (1세대)</option>
                <option value="F2">F2 (2세대)</option>
                <option value="F3">F3 (3세대)</option>
                <option value="F4">F4 (4세대)</option>
              </select>
            </div>
          </div>

          {/* Breed & Installed Date */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[11px] font-extrabold text-[#514532] block mb-1">
                품종 및 계통:
              </label>
              <input
                type="text"
                value={breed}
                onChange={(e) => setBreed(e.target.value)}
                placeholder="예: 이탈리안-카니올란 교잡종"
                className="w-full py-2 px-3 bg-[#f4faff] border border-[#d6c4ac] rounded-xl text-[12px] font-medium text-[#0d1e25] focus:outline-none focus:border-[#7e5700]"
              />
            </div>
            <div>
              <label className="text-[11px] font-extrabold text-[#514532] block mb-1">
                입식 / 이충일자:
              </label>
              <input
                type="date"
                value={installedDate}
                onChange={(e) => setInstalledDate(e.target.value)}
                className="w-full py-2 px-3 bg-[#f4faff] border border-[#d6c4ac] rounded-xl text-[12px] font-medium text-[#0d1e25] focus:outline-none focus:border-[#7e5700]"
              />
            </div>
          </div>

          {/* 4 Core Traits Box (채밀력, 프로폴리스양, 로열제리양, 세력) */}
          <div className="bg-[#f8fbfe] border-2 border-[#7e5700]/40 rounded-2xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-black text-[#7e5700] flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">bar_chart</span>
                <span>주요 형질 검정치 (가계도에 표시됨)</span>
              </span>
              <span className="text-[10px] text-[#514532]">지속적으로 수치를 추가 누적 기록할 수 있습니다</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="bg-white p-2 rounded-xl border border-[#d4e5ef]">
                <label className="text-[10px] font-bold text-[#514532] block mb-0.5">
                  🍯 채밀력 (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={honeyHarvestKg}
                  onChange={(e) => setHoneyHarvestKg(Number(e.target.value))}
                  className="w-full py-1 px-1.5 font-black text-[15px] text-[#7e5700] border-b border-[#d6c4ac] focus:outline-none"
                />
              </div>

              <div className="bg-white p-2 rounded-xl border border-[#d4e5ef]">
                <label className="text-[10px] font-bold text-[#514532] block mb-0.5">
                  🐝 프로폴리스 (g)
                </label>
                <input
                  type="number"
                  step="5"
                  min="0"
                  max="2000"
                  value={propolisYieldG}
                  onChange={(e) => setPropolisYieldG(Number(e.target.value))}
                  className="w-full py-1 px-1.5 font-black text-[15px] text-[#0277bd] border-b border-[#d6c4ac] focus:outline-none"
                />
              </div>

              <div className="bg-white p-2 rounded-xl border border-[#d4e5ef]">
                <label className="text-[10px] font-bold text-[#514532] block mb-0.5">
                  👑 로열제리 (g)
                </label>
                <input
                  type="number"
                  step="5"
                  min="0"
                  max="2000"
                  value={royalJellyYieldG}
                  onChange={(e) => setRoyalJellyYieldG(Number(e.target.value))}
                  className="w-full py-1 px-1.5 font-black text-[15px] text-[#d81b60] border-b border-[#d6c4ac] focus:outline-none"
                />
              </div>

              <div className="bg-white p-2 rounded-xl border border-[#d4e5ef]">
                <label className="text-[10px] font-bold text-[#514532] block mb-0.5">
                  💪 세력 (소비 매수)
                </label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  max="15"
                  value={colonyStrength}
                  onChange={(e) => setColonyStrength(Number(e.target.value))}
                  className="w-full py-1 px-1.5 font-black text-[15px] text-[#1b6d24] border-b border-[#d6c4ac] focus:outline-none"
                />
              </div>
            </div>

            {/* Additional parameters: 산란력 & 온순성 */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="flex items-center justify-between bg-white px-3 py-1.5 rounded-xl border border-[#d4e5ef]">
                <span className="text-[11px] font-bold text-[#514532]">산란력 (%):</span>
                <input
                  type="number"
                  step="1"
                  min="50"
                  max="100"
                  value={eggLayingRate}
                  onChange={(e) => setEggLayingRate(Number(e.target.value))}
                  className="w-16 text-right font-black text-[14px] text-[#0d1e25] focus:outline-none"
                />
              </div>
              <div className="flex items-center justify-between bg-white px-3 py-1.5 rounded-xl border border-[#d4e5ef]">
                <span className="text-[11px] font-bold text-[#514532]">온순성:</span>
                <select
                  value={docilityScore}
                  onChange={(e) => setDocilityScore(e.target.value as any)}
                  className="font-bold text-[12px] text-[#1b6d24] focus:outline-none bg-transparent"
                >
                  <option value="최상">최상 (침 쏘지 않음)</option>
                  <option value="우수">우수 (온순)</option>
                  <option value="보통">보통</option>
                </select>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-[11px] font-extrabold text-[#514532] block mb-1">
              특이사항 / 혈통 및 검정 메모:
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="예: 이탈리안계와 카니올란계 우수 교배주로 월동능력 및 봄철 산란력 탁월"
              rows={2}
              className="w-full p-2.5 bg-[#f4faff] border border-[#d6c4ac] rounded-xl text-[12px] text-[#0d1e25] focus:outline-none focus:border-[#7e5700]"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              className="flex-1 py-3 bg-[#7e5700] hover:bg-[#604100] text-white font-black text-[13px] rounded-xl shadow-xs cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              <span>{editingQueen ? '종봉 정보 업데이트' : '종봉 등록 및 가계도 반영'}</span>
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
