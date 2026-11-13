import React from 'react';
import { BreederQueen } from '../types';

interface BreederDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  queen: BreederQueen;
  allQueens: BreederQueen[];
  onOpenMetricModal: (queen: BreederQueen) => void;
  onOpenRegisterDaughterModal: (parentQueenId: string) => void;
  onEditQueen: (queen: BreederQueen) => void;
  onDeleteQueen: (queenId: string) => void;
  onGoToHiveRecord?: (hiveId: number) => void;
}

export const BreederDetailModal: React.FC<BreederDetailModalProps> = ({
  isOpen,
  onClose,
  queen,
  allQueens,
  onOpenMetricModal,
  onOpenRegisterDaughterModal,
  onEditQueen,
  onDeleteQueen,
  onGoToHiveRecord
}) => {
  if (!isOpen) return null;

  const parentQueen = allQueens.find((q) => q.id === queen.parentQueenId);
  const daughterQueens = allQueens.filter((q) => q.parentQueenId === queen.id);

  const genBadgeColor =
    queen.generation === 'F0'
      ? 'bg-[#7e5700] text-white'
      : queen.generation === 'F1'
      ? 'bg-[#0277bd] text-white'
      : queen.generation === 'F2'
      ? 'bg-[#1b6d24] text-white'
      : 'bg-[#e65100] text-white';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl p-5 max-w-lg w-full shadow-2xl border-2 border-[#7e5700] my-8 animate-in fade-in zoom-in duration-200 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-[#d6c4ac]">
          <div className="flex items-center gap-2.5">
            <div className="w-11 h-11 rounded-2xl bg-[#ffdeac] text-[#7e5700] flex items-center justify-center shadow-2xs font-black text-[16px]">
              {queen.hiveId > 0 ? `#${queen.hiveId}` : '원종'}
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="font-black text-[18px] text-[#0d1e25]">{queen.name}</h3>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${genBadgeColor}`}>
                  {queen.generation} 세대
                </span>
                <span className="text-[10px] font-bold bg-[#a0f399]/40 text-[#1b6d24] px-1.5 py-0.5 rounded">
                  {queen.status}
                </span>
              </div>
              <p className="text-[12px] text-[#514532]">
                {queen.hiveId > 0 ? `${queen.hiveId}번 벌통 거주` : '지리산 보존원종'} · {queen.breed}
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

        {/* Pedigree Lineage Breadcrumb (모계 계보) */}
        <div className="bg-[#f4faff] border border-[#d4e5ef] p-3 rounded-2xl space-y-1.5">
          <span className="text-[11px] font-extrabold text-[#514532] flex items-center gap-1">
            <span className="material-symbols-outlined text-[#7e5700] text-[15px]">account_tree</span>
            <span>종봉 혈통 계보 (Lineage):</span>
          </span>
          <div className="flex items-center gap-1.5 text-[12px] flex-wrap font-bold">
            {parentQueen ? (
              <>
                <span className="text-[#514532] bg-white px-2 py-0.5 rounded border border-[#d6c4ac]">
                  모계: [{parentQueen.generation}] #{parentQueen.hiveId} {parentQueen.name}
                </span>
                <span className="material-symbols-outlined text-[#7e5700] text-[16px]">arrow_downward</span>
              </>
            ) : (
              <span className="text-[#7e5700] bg-white px-2 py-0.5 rounded border border-[#ffdeac]">
                👑 최초 도입 원종 (시조)
              </span>
            )}
            <span className="text-[#0d1e25] bg-[#ffdeac] px-2 py-0.5 rounded font-black border border-[#7e5700]/40">
              현재: [{queen.generation}] #{queen.hiveId} {queen.name}
            </span>
          </div>

          {/* Daughter Queens */}
          {daughterQueens.length > 0 && (
            <div className="pt-1.5 border-t border-[#d4e5ef] mt-1.5 flex items-center gap-1 flex-wrap text-[11px]">
              <span className="font-bold text-[#1b6d24]">후대(딸) 여왕벌 ({daughterQueens.length}두):</span>
              {daughterQueens.map((dq) => (
                <span key={dq.id} className="bg-white text-[#0d1e25] px-1.5 py-0.5 rounded border border-[#d6c4ac] font-medium">
                  [{dq.generation}] #{dq.hiveId} {dq.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 4 Core Traits Box */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <h4 className="text-[12px] font-extrabold text-[#0d1e25] flex items-center gap-1">
              <span className="material-symbols-outlined text-[#7e5700] text-[16px]">analytics</span>
              <span>핵심 유전 형질 검정 수치</span>
            </h4>
            <button
              onClick={() => onOpenMetricModal(queen)}
              className="px-2.5 py-1 bg-[#ffdeac] hover:bg-[#ffc977] text-[#7e5700] text-[11px] font-black rounded-lg transition-all flex items-center gap-1 active:scale-95 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[14px]">add</span>
              <span>수치 추가 기록</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="bg-white border-2 border-[#d6c4ac] p-2.5 rounded-2xl text-center shadow-xs">
              <span className="text-[11px] font-bold text-[#514532] block">🍯 채밀력</span>
              <span className="text-[20px] font-black text-[#7e5700]">{queen.honeyHarvestKg}</span>
              <span className="text-[11px] text-[#514532] ml-0.5">kg</span>
            </div>

            <div className="bg-white border-2 border-[#d6c4ac] p-2.5 rounded-2xl text-center shadow-xs">
              <span className="text-[11px] font-bold text-[#514532] block">🐝 프로폴리스</span>
              <span className="text-[20px] font-black text-[#0277bd]">{queen.propolisYieldG}</span>
              <span className="text-[11px] text-[#514532] ml-0.5">g</span>
            </div>

            <div className="bg-white border-2 border-[#d6c4ac] p-2.5 rounded-2xl text-center shadow-xs">
              <span className="text-[11px] font-bold text-[#514532] block">👑 로열제리</span>
              <span className="text-[20px] font-black text-[#d81b60]">{queen.royalJellyYieldG}</span>
              <span className="text-[11px] text-[#514532] ml-0.5">g</span>
            </div>

            <div className="bg-white border-2 border-[#d6c4ac] p-2.5 rounded-2xl text-center shadow-xs">
              <span className="text-[11px] font-bold text-[#514532] block">💪 봉군 세력</span>
              <span className="text-[20px] font-black text-[#1b6d24]">{queen.colonyStrength}</span>
              <span className="text-[11px] text-[#514532] ml-0.5">매 만상</span>
            </div>
          </div>

          {/* Sub-traits: 산란력, 온순성, 입식일 */}
          <div className="grid grid-cols-3 gap-2 bg-[#f8fbfe] p-2.5 rounded-xl border border-[#d4e5ef] text-[11px] text-center">
            <div>
              <span className="text-[#514532] block">산란력</span>
              <span className="font-extrabold text-[#0d1e25] text-[13px]">{queen.eggLayingRate}%</span>
            </div>
            <div>
              <span className="text-[#514532] block">온순성</span>
              <span className="font-extrabold text-[#1b6d24] text-[13px]">{queen.docilityScore}</span>
            </div>
            <div>
              <span className="text-[#514532] block">공식 입식일</span>
              <span className="font-extrabold text-[#0d1e25] text-[12px]">{queen.installedDate}</span>
            </div>
          </div>
        </div>

        {/* Cumulative Metric Evaluation Logs History */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <h4 className="text-[12px] font-extrabold text-[#0d1e25] flex items-center gap-1">
              <span className="material-symbols-outlined text-[#1b6d24] text-[16px]">history</span>
              <span>지속적 형질 검정 기록 로그 ({queen.logs?.length || 0}건)</span>
            </h4>
          </div>

          <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
            {queen.logs && queen.logs.length > 0 ? (
              queen.logs.map((log) => (
                <div
                  key={log.id}
                  className="bg-[#f4faff] border border-[#d4e5ef] p-2.5 rounded-xl text-[11px] space-y-1"
                >
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-[#0d1e25] flex items-center gap-1">
                      <span className="material-symbols-outlined text-[#7e5700] text-[13px]">calendar_today</span>
                      <span>{log.date}</span>
                    </span>
                    <div className="flex items-center gap-1.5 text-[10px]">
                      <span className="text-[#7e5700]">채밀 {log.honeyYieldKg}kg</span>
                      <span>·</span>
                      <span className="text-[#0277bd]">프로폴 {log.propolisYieldG}g</span>
                      <span>·</span>
                      <span className="text-[#d81b60]">로열 {log.royalJellyYieldG}g</span>
                      <span>·</span>
                      <span className="text-[#1b6d24]">세력 {log.colonyStrength}매</span>
                    </div>
                  </div>
                  {log.notes && (
                    <p className="text-[11px] text-[#514532] bg-white p-1 rounded border border-[#d4e5ef]">
                      {log.notes}
                    </p>
                  )}
                </div>
              ))
            ) : (
              <p className="text-center py-3 text-[11px] text-[#514532]">등록된 검정 기록이 없습니다.</p>
            )}
          </div>
        </div>

        {queen.notes && (
          <div className="bg-[#fffaf0] border border-[#ffdeac] p-2.5 rounded-xl text-[11px] text-[#514532]">
            <b className="text-[#7e5700]">특이사항:</b> {queen.notes}
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex gap-2 pt-2 border-t border-[#d6c4ac]">
          <button
            onClick={() => onOpenRegisterDaughterModal(queen.id)}
            className="flex-1 py-2.5 bg-[#7e5700] hover:bg-[#604100] text-white font-bold text-[12px] rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-1 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[15px]">add_circle</span>
            <span>이 여왕벌의 후대(딸) 등록</span>
          </button>
          
          {queen.hiveId > 0 && onGoToHiveRecord && (
            <button
              onClick={() => onGoToHiveRecord(queen.hiveId)}
              className="py-2.5 px-3 bg-[#f4faff] hover:bg-[#d9ebf5] border border-[#d6c4ac] text-[#0d1e25] font-bold text-[12px] rounded-xl cursor-pointer"
            >
              벌통 내검
            </button>
          )}

          <button
            onClick={() => onEditQueen(queen)}
            className="py-2.5 px-3 bg-white border border-[#d6c4ac] hover:bg-[#d9ebf5] text-[#514532] font-bold text-[12px] rounded-xl cursor-pointer"
          >
            수정
          </button>

          <button
            onClick={() => {
              if (confirm(`'${queen.name}' 종봉을 삭제하시겠습니까?`)) {
                onDeleteQueen(queen.id);
                onClose();
              }
            }}
            className="py-2.5 px-2.5 bg-white border border-[#ba1a1a]/40 hover:bg-[#ffdad6] text-[#ba1a1a] font-bold text-[12px] rounded-xl cursor-pointer"
            title="삭제"
          >
            <span className="material-symbols-outlined text-[16px]">delete</span>
          </button>
        </div>
      </div>
    </div>
  );
};
