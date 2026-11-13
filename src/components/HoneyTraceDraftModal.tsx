import React from 'react';
import { HoneyLotDraft } from '../types';

interface HoneyTraceDraftModalProps {
  isOpen: boolean;
  onClose: () => void;
  draft: HoneyLotDraft | null;
  isLoading?: boolean;
  onOpenManualForm?: () => void;
  onProceedToConfirm?: (draft: HoneyLotDraft) => void;
}

export const HoneyTraceDraftModal: React.FC<HoneyTraceDraftModalProps> = ({
  isOpen,
  onClose,
  draft,
  isLoading = false,
  onOpenManualForm,
  onProceedToConfirm
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 pt-safe pb-safe bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div
        className="bg-white rounded-3xl w-full max-w-xl shadow-2xl border border-[#e8dec8] flex flex-col max-h-[calc(100dvh-2.5rem)] my-auto overflow-hidden text-[#0d1e25]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#f0e7d5] flex items-center justify-between bg-gradient-to-r from-[#fff9ee] via-[#fffdf9] to-[#ffffff] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#ffdeac] flex items-center justify-center text-[#7e5700] shadow-2xs">
              <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-[17px] font-black text-[#2b1e00] leading-tight">
                  AI 꿀 이력 초안 미리보기
                </h2>
                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-[#ffdeac] text-[#7e5700]">
                  초안(Draft)
                </span>
              </div>
              <p className="text-[11px] text-[#7e5700] font-medium mt-0.5">
                실제 양봉일지에 기록된 내용만을 바탕으로 분석한 초안입니다. (임의 추정 없음)
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

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto overscroll-contain space-y-4 text-[13px]">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-3 border-[#7e5700] border-t-transparent rounded-full animate-spin" />
              <p className="text-[13px] font-bold text-[#7e5700]">
                양봉일지에서 꿀 생산 기록을 분석하는 중입니다...
              </p>
            </div>
          ) : !draft || !draft.hasSufficientData ? (
            /* 데이터 부족 안내 화면 */
            <div className="bg-[#fbf9f4] border border-[#e8dec8] rounded-2xl p-6 text-center space-y-3.5 my-2">
              <div className="w-12 h-12 mx-auto rounded-full bg-[#feebeb] text-[#a12b2b] flex items-center justify-center">
                <span className="material-symbols-outlined text-[26px]">info</span>
              </div>
              <div>
                <h3 className="text-[15px] font-black text-[#2b1e00]">
                  현재 양봉일지에 충분한 채밀 정보가 없습니다.
                </h3>
                <p className="text-[12px] text-[#7e5700] mt-1 leading-relaxed max-w-md mx-auto">
                  {draft?.unspecifiedReason ||
                    '등록된 양봉일지 중 채밀 상태, 채밀량(kg), 또는 밀원 관련 기록이 발견되지 않았습니다.'}
                </p>
              </div>

              {/* 팁 박스 */}
              <div className="p-3 bg-white border border-[#eee4d4] rounded-xl text-left text-[11.5px] text-[#554632] space-y-1">
                <div className="font-bold text-[#7e5700] flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">lightbulb</span>
                  <span>양봉일지 채밀 기록 팁</span>
                </div>
                <p>
                  음성 내검 시 <strong>"10번부터 14번 벌통 아카시아꿀 42kg 채밀 완료"</strong> 또는{' '}
                  <strong>"오늘 밤꿀 35kg 채밀"</strong>과 같이 발화하시면 자동으로 채밀 기록으로 인식되어 초안이
                  생성됩니다.
                </p>
              </div>

              {onOpenManualForm && (
                <div className="pt-2">
                  <button
                    onClick={() => {
                      onClose();
                      onOpenManualForm();
                    }}
                    className="bg-[#7e5700] hover:bg-[#684700] text-white font-bold text-[12.5px] px-4 py-2.5 rounded-xl cursor-pointer shadow-xs active:scale-95 transition-all inline-flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">edit_note</span>
                    <span>직접 꿀 이력 수동 등록하기</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* 정상적인 초안 미리보기 */
            <div className="space-y-4">
              {/* 상단 핵심 배지 */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-black px-2.5 py-1 rounded-lg bg-[#fff9ee] border border-[#ffdeac] text-[#7e5700] inline-flex items-center gap-1 shadow-2xs">
                  <span>🍯</span>
                  <span>제품 유형: 꿀</span>
                </span>
                <span
                  className={`text-[11px] font-black px-2.5 py-1 rounded-lg border inline-flex items-center gap-1 ${
                    draft.honeyType === '밀원 미기재'
                      ? 'bg-[#f5f5f5] text-[#737373] border-[#e0e0e0]'
                      : 'bg-[#ffeed1] text-[#a05c00] border-[#f0d8a8]'
                  }`}
                >
                  <span className="text-[10px] text-[#887864] font-semibold">꿀 종류:</span>
                  <span>{draft.honeyType}</span>
                </span>
                <span
                  className={`text-[11px] font-black px-2.5 py-1 rounded-lg border inline-flex items-center gap-1 ${
                    draft.nectarSource === '밀원 미기재'
                      ? 'bg-[#f5f5f5] text-[#737373] border-[#e0e0e0]'
                      : 'bg-[#e8f3ea] text-[#2b6e39] border-[#c2e2c7]'
                  }`}
                >
                  <span className="text-[10px] text-[#887864] font-semibold">밀원:</span>
                  <span>{draft.nectarSource}</span>
                </span>
              </div>

              {/* 핵심 요약 그리드 카드 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="bg-[#fbf9f4] p-3 rounded-2xl border border-[#eee4d4]">
                  <div className="text-[10.5px] font-bold text-[#887864] flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px] text-[#7e5700]">calendar_month</span>
                    <span>생산기간</span>
                  </div>
                  <div className="font-extrabold text-[12.5px] text-[#0d1e25] mt-1">
                    {draft.productionStartDate === draft.productionEndDate
                      ? draft.productionStartDate.replace(/-/g, '.')
                      : `${draft.productionStartDate.replace(/-/g, '.')} ~ ${draft.productionEndDate.replace(/-/g, '.')}`}
                  </div>
                </div>

                <div className="bg-[#fbf9f4] p-3 rounded-2xl border border-[#eee4d4]">
                  <div className="text-[10.5px] font-bold text-[#887864] flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px] text-[#b34700]">scale</span>
                    <span>총 채밀량</span>
                  </div>
                  <div className="font-black text-[15px] text-[#b34700] mt-0.5">
                    {draft.totalYieldKg > 0 ? (
                      <>
                        {draft.totalYieldKg} <span className="text-[11px] font-normal text-[#554632]">kg</span>
                      </>
                    ) : (
                      <span className="text-[12px] font-bold text-[#887864]">수량 미기재</span>
                    )}
                  </div>
                </div>

                <div className="bg-[#fbf9f4] p-3 rounded-2xl border border-[#eee4d4]">
                  <div className="text-[10.5px] font-bold text-[#887864] flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px] text-[#7e5700]">grid_view</span>
                    <span>대상 벌통</span>
                  </div>
                  <div className="font-bold text-[12.5px] text-[#0d1e25] mt-1 truncate" title={draft.hiveRange}>
                    {draft.hiveRange}
                  </div>
                </div>
              </div>

              {/* 채밀 작업 상세 내역 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-[12.5px] font-black text-[#2b1e00] flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[15px] text-[#7e5700]">fact_check</span>
                    <span>채밀 작업 내역 ({draft.harvestOperations.length}회)</span>
                  </h4>
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {draft.harvestOperations.map((op, idx) => (
                    <div
                      key={op.operationId || idx}
                      className="p-2.5 bg-white border border-[#e8dec8] rounded-xl flex items-center justify-between text-[12px] hover:border-[#7e5700]/40 transition-colors"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#0d1e25]">{op.date.replace(/-/g, '.')}</span>
                          <span className="text-[11px] px-1.5 py-0.2 bg-[#f3ebe0] rounded-md font-semibold text-[#554632]">
                            {op.hiveRange}
                          </span>
                        </div>
                        {op.notes && (
                          <p className="text-[11px] text-[#887864] line-clamp-1 max-w-sm">{op.notes}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        {op.yieldKg > 0 ? (
                          <span className="font-black text-[#b34700]">
                            {op.yieldKg}
                            <span className="text-[10px] font-normal text-[#554632]"> kg</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-[#887864]">수량 미기재</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 근거 양봉일지 내역 */}
              <div className="space-y-2">
                <h4 className="text-[12.5px] font-black text-[#2b1e00] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[15px] text-[#7e5700]">source</span>
                  <span>근거 양봉일지 ({draft.evidence.length}건)</span>
                </h4>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {draft.evidence.map((ev, idx) => (
                    <div key={ev.journalId || idx} className="p-2 bg-[#fdfbf7] border border-[#f0e6d6] rounded-xl text-[11.5px]">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-[#7e5700]">{ev.date.replace(/-/g, '.')}</span>
                        <div className="flex items-center gap-1 flex-wrap">
                          {ev.matchedKeywords.slice(0, 3).map((kw, kIdx) => (
                            <span
                              key={kIdx}
                              className="text-[9.5px] font-bold px-1.5 py-0.2 bg-[#ffeed1] text-[#7e5700] rounded-md"
                            >
                              #{kw}
                            </span>
                          ))}
                        </div>
                      </div>
                      <p className="text-[#554632] line-clamp-2 leading-relaxed">"{ev.summarySnippet}"</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI 요약 카드 */}
              <div className="p-3.5 bg-gradient-to-r from-[#fff9ee] to-[#fbf9f4] border border-[#f2e5ce] rounded-2xl space-y-1.5">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#7e5700]">
                  <span className="material-symbols-outlined text-[15px]">psychology</span>
                  <span>AI 이력 요약</span>
                </div>
                <p className="text-[12px] text-[#2b1e00] font-medium leading-relaxed">
                  {draft.aiSummary}
                </p>
                <div className="text-[10px] text-[#887864] pt-0.5">
                  ※ 무추정 원칙: 기록되지 않은 밀원 및 정보는 임의로 추정하지 않고 있는 그대로 반영되었습니다.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 bg-[#fbf9f4] border-t border-[#f0e7d5] flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0">
          <div className="text-[11px] text-[#887864] text-center sm:text-left">
            <span>초안 내용을 확인하신 후 <strong>'확인 및 꿀 이력 등록'</strong>을 누르면 수정 후 최종 등록할 수 있습니다.</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-[12.5px] font-bold text-[#554632] bg-white border border-[#d6c8b2] rounded-xl hover:bg-[#f3ebe0] transition-colors cursor-pointer w-full sm:w-auto"
            >
              닫기
            </button>

            {draft && draft.hasSufficientData && onProceedToConfirm ? (
              <button
                type="button"
                onClick={() => onProceedToConfirm(draft)}
                className="px-4 py-2 text-[12.5px] font-black text-white bg-[#7e5700] hover:bg-[#684700] rounded-xl shadow-xs active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5 w-full sm:w-auto"
              >
                <span className="material-symbols-outlined text-[16px]">fact_check</span>
                <span>확인 및 꿀 이력 등록</span>
              </button>
            ) : (
              <button
                type="button"
                disabled
                title="충분한 채밀 기록이 없어 이력을 등록할 수 없습니다."
                className="px-4 py-2 text-[12.5px] font-bold bg-[#e8dec8] text-[#887864] border border-[#d6c8b2] rounded-xl cursor-not-allowed opacity-80 flex items-center justify-center gap-1.5 w-full sm:w-auto"
              >
                <span className="material-symbols-outlined text-[16px]">lock</span>
                <span>채밀 기록 부족 (등록 불가)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
