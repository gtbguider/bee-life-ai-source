import React, { useState, useEffect, useMemo } from 'react';
import {
  HoneyLotDraft,
  HoneyLot,
  ApiaryProductType,
  HarvestOperation
} from '../types';
import { generateLotNumber, formatHiveRange } from '../services/honeyLotService';
import { convertDraftToHoneyLot } from '../services/honeyTraceDraftService';

interface HoneyTraceConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  draft: HoneyLotDraft | null;
  existingLots: HoneyLot[];
  farmName?: string;
  onSaveSuccess: (newLot: HoneyLot) => Promise<void>;
}

export const HoneyTraceConfirmModal: React.FC<HoneyTraceConfirmModalProps> = ({
  isOpen,
  onClose,
  draft,
  existingLots,
  farmName = '농업회사법인 허니비테코 주식회사',
  onSaveSuccess
}) => {
  if (!isOpen || !draft) return null;

  const brand = farmName.includes('허니비테코') ? '허니비테코' : farmName;

  // Form states initialized strictly from draft data (preserving "밀원 미기재" without guessing)
  const [productType, setProductType] = useState<ApiaryProductType>(draft.productType || 'honey');
  const [honeyType, setHoneyType] = useState<string>(draft.honeyType || '밀원 미기재');
  const [productName, setProductName] = useState<string>(() => {
    if (draft.honeyType && draft.honeyType !== '밀원 미기재') {
      return `${brand} 천연 ${draft.honeyType}`;
    }
    return `${brand} 천연벌꿀`;
  });
  const [nectarSource, setNectarSource] = useState<string>(draft.nectarSource || '밀원 미기재');
  const [productionStartDate, setProductionStartDate] = useState<string>(draft.productionStartDate);
  const [productionEndDate, setProductionEndDate] = useState<string>(draft.productionEndDate);
  const [inboundDate, setInboundDate] = useState<string>(draft.productionEndDate || draft.productionStartDate);
  const [totalYieldKg, setTotalYieldKg] = useState<string>(
    draft.totalYieldKg > 0 ? String(draft.totalYieldKg) : ''
  );
  const [hiveRange, setHiveRange] = useState<string>(draft.hiveRange || '전체 벌통');
  const [harvestOperations, setHarvestOperations] = useState<HarvestOperation[]>(
    draft.harvestOperations || []
  );
  const [notes, setNotes] = useState<string>(draft.aiSummary || '');

  // UI state
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync initial state if draft changes
  useEffect(() => {
    if (draft) {
      setProductType(draft.productType || 'honey');
      setHoneyType(draft.honeyType || '밀원 미기재');
      setProductName(
        draft.honeyType && draft.honeyType !== '밀원 미기재'
          ? `${brand} 천연 ${draft.honeyType}`
          : `${brand} 천연벌꿀`
      );
      setNectarSource(draft.nectarSource || '밀원 미기재');
      setProductionStartDate(draft.productionStartDate);
      setProductionEndDate(draft.productionEndDate);
      setInboundDate(draft.productionEndDate || draft.productionStartDate);
      setTotalYieldKg(draft.totalYieldKg > 0 ? String(draft.totalYieldKg) : '');
      setHiveRange(draft.hiveRange || '전체 벌통');
      setHarvestOperations(draft.harvestOperations || []);
      setNotes(draft.aiSummary || '');
      setErrorMessage(null);
    }
  }, [draft, brand]);

  // Real-time generated LOT number using existing project logic
  const previewLotNumber = useMemo(() => {
    const harvestDate = productionEndDate || productionStartDate || new Date().toISOString().split('T')[0];
    return generateLotNumber(honeyType, harvestDate, existingLots);
  }, [honeyType, productionEndDate, productionStartDate, existingLots]);

  // Quick preset chips for honey types
  const HONEY_TYPE_PRESETS = ['아카시아꿀', '밤꿀', '야생화꿀', '잡화꿀', '밀원 미기재'];

  // Handle operation change
  const handleOperationYieldChange = (index: number, newYield: string) => {
    const parsed = parseFloat(newYield);
    const updated = [...harvestOperations];
    updated[index] = {
      ...updated[index],
      yieldKg: isNaN(parsed) ? 0 : parsed
    };
    setHarvestOperations(updated);

    // Auto update total yield
    const sum = updated.reduce((acc, curr) => acc + (curr.yieldKg || 0), 0);
    if (sum > 0) {
      setTotalYieldKg(String(Math.round(sum * 10) / 10));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Basic validation
    if (!honeyType.trim()) {
      setErrorMessage('꿀 종류를 입력해주세요.');
      return;
    }
    if (!productionStartDate) {
      setErrorMessage('생산 시작일을 입력해주세요.');
      return;
    }
    if (!productionEndDate) {
      setErrorMessage('생산 종료일을 입력해주세요.');
      return;
    }

    try {
      setIsSaving(true);

      const parsedTotalYield = parseFloat(totalYieldKg);

      // Convert using pure transformation function
      const newLot = convertDraftToHoneyLot(
        {
          productType,
          honeyType: honeyType.trim(),
          productName: productName.trim() || `${brand} 천연벌꿀`,
          nectarSource: nectarSource.trim() || '밀원 미기재',
          productionStartDate,
          productionEndDate,
          inboundDate,
          totalYieldKg: isNaN(parsedTotalYield) ? 0 : parsedTotalYield,
          hiveIds: draft.hiveIds,
          hiveRange: hiveRange.trim() || '전체 벌통',
          harvestOperations,
          notes: notes.trim()
        },
        draft,
        existingLots,
        farmName
      );

      // Call parent save handler (calls Firestore saveHoneyLotToFirestore)
      await onSaveSuccess(newLot);
    } catch (err: any) {
      console.error('Failed to register honey lot from draft:', err);
      // Keep modal open and preserve form data on failure
      setErrorMessage(err?.message || '저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 pt-safe pb-safe bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div
        className="bg-white rounded-3xl w-full max-w-xl shadow-2xl border border-[#e8dec8] flex flex-col max-h-[calc(100dvh-2.5rem)] my-auto overflow-hidden text-[#0d1e25]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#f0e7d5] flex items-center justify-between bg-gradient-to-r from-[#fff9ee] via-[#fffdf9] to-[#ffffff] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#7e5700] text-white flex items-center justify-center shadow-2xs">
              <span className="material-symbols-outlined text-[20px]">verified</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-[17px] font-black text-[#2b1e00] leading-tight">
                  꿀 이력 등록 전 확인 및 수정
                </h2>
                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-[#ffdeac] text-[#7e5700]">
                  최종 검토
                </span>
              </div>
              <p className="text-[11px] text-[#7e5700] font-medium mt-0.5">
                AI가 일지에서 추출한 항목을 확인하고 필요에 따라 수정 후 최종 등록합니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#887864] hover:bg-[#f3ebe0] transition-colors cursor-pointer disabled:opacity-50"
            aria-label="닫기"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="p-5 overflow-y-auto overscroll-contain space-y-4 text-[13px]">
            {/* Error Message Banner */}
            {errorMessage && (
              <div className="p-3 bg-[#feebeb] border border-[#f5c2c2] text-[#a12b2b] rounded-2xl flex items-start gap-2 animate-shake text-[12px]">
                <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">error</span>
                <div>
                  <div className="font-bold">등록 실패</div>
                  <div>{errorMessage}</div>
                </div>
              </div>
            )}

            {/* LOT Preview Banner */}
            <div className="p-3 bg-[#fdf9f1] border border-[#f2e5ce] rounded-2xl flex items-center justify-between shadow-2xs">
              <div>
                <div className="text-[10.5px] font-bold text-[#7e5700]">발급될 고유 LOT 번호</div>
                <div className="text-[15px] font-black tracking-wider text-[#2b1e00] font-mono">
                  {previewLotNumber}
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#ffdeac] text-[#7e5700]">
                기존 채번 규칙 적용
              </span>
            </div>

            {/* 1. 이력 대상 양봉산물 */}
            <div className="space-y-1.5">
              <label className="block text-[12px] font-bold text-[#554632]">
                이력 대상 양봉산물 <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setProductType('honey')}
                  className={`py-2 px-2.5 rounded-xl font-black text-[12.5px] border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    productType === 'honey'
                      ? 'bg-[#7e5700] text-white border-[#7e5700] shadow-2xs'
                      : 'bg-[#fbf9f4] text-[#554632] border-[#e8dec8] hover:bg-[#f3ebe0]'
                  }`}
                >
                  <span className="text-[15px]">🍯</span>
                  <span>꿀</span>
                </button>
                <button
                  type="button"
                  onClick={() => setProductType('royalJelly')}
                  className={`py-2 px-2.5 rounded-xl font-black text-[12.5px] border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    productType === 'royalJelly'
                      ? 'bg-[#7e5700] text-white border-[#7e5700] shadow-2xs'
                      : 'bg-[#fbf9f4] text-[#554632] border-[#e8dec8] hover:bg-[#f3ebe0]'
                  }`}
                >
                  <span className="text-[15px]">🥛</span>
                  <span>로열젤리</span>
                </button>
                <button
                  type="button"
                  onClick={() => setProductType('propolis')}
                  className={`py-2 px-2.5 rounded-xl font-black text-[12.5px] border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    productType === 'propolis'
                      ? 'bg-[#7e5700] text-white border-[#7e5700] shadow-2xs'
                      : 'bg-[#fbf9f4] text-[#554632] border-[#e8dec8] hover:bg-[#f3ebe0]'
                  }`}
                >
                  <span className="text-[15px]">🌿</span>
                  <span>프로폴리스</span>
                </button>
              </div>
            </div>

            {/* 2. 꿀 종류 & 제품명 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[12px] font-bold text-[#554632]">
                    꿀 종류 <span className="text-red-500">*</span>
                  </label>
                  {honeyType === '밀원 미기재' && (
                    <span className="text-[10px] text-[#887864] bg-[#f5f5f5] px-1.5 py-0.2 rounded font-semibold">
                      무추정 원칙 유지중
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={honeyType}
                  onChange={(e) => setHoneyType(e.target.value)}
                  placeholder="예: 아카시아꿀, 밤꿀, 야생화꿀"
                  className="w-full px-3 py-2 text-[12.5px] font-bold bg-[#fdfbf7] border border-[#d6c4ac] rounded-xl focus:border-[#7e5700] focus:bg-white outline-none transition-all"
                  required
                />
                {/* Presets */}
                <div className="flex items-center gap-1 flex-wrap pt-0.5">
                  {HONEY_TYPE_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setHoneyType(preset)}
                      className={`text-[10px] px-2 py-0.5 rounded-md border font-semibold transition-all cursor-pointer ${
                        honeyType === preset
                          ? 'bg-[#7e5700] text-white border-[#7e5700]'
                          : 'bg-white text-[#6d5b45] border-[#e8dec8] hover:bg-[#f3ebe0]'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[12px] font-bold text-[#554632]">
                  제품명 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="예: 허니비테코 천연 아카시아꿀"
                  className="w-full px-3 py-2 text-[12.5px] font-bold bg-[#fdfbf7] border border-[#d6c4ac] rounded-xl focus:border-[#7e5700] focus:bg-white outline-none transition-all"
                  required
                />
                <p className="text-[10.5px] text-[#887864]">소비자에게 표시될 최종 상표명입니다.</p>
              </div>
            </div>

            {/* 3. 주요 밀원 */}
            <div className="space-y-1.5">
              <label className="block text-[12px] font-bold text-[#554632]">
                주요 밀원 (꽃/수목)
              </label>
              <input
                type="text"
                value={nectarSource}
                onChange={(e) => setNectarSource(e.target.value)}
                placeholder="예: 지리산 청정 아카시아, 밤나무꽃"
                className="w-full px-3 py-2 text-[12.5px] bg-[#fdfbf7] border border-[#d6c4ac] rounded-xl focus:border-[#7e5700] focus:bg-white outline-none transition-all"
              />
              <p className="text-[10.5px] text-[#887864]">
                ※ 일지에 밀원이 미기재된 경우 '밀원 미기재' 상태로 보존되며, 직접 수정 가능합니다.
              </p>
            </div>

            {/* 4. 생산 기간 & 입고일 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="space-y-1">
                <label className="block text-[11.5px] font-bold text-[#554632]">
                  생산 시작일 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={productionStartDate}
                  onChange={(e) => setProductionStartDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-[12px] bg-[#fdfbf7] border border-[#d6c4ac] rounded-xl focus:border-[#7e5700] outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11.5px] font-bold text-[#554632]">
                  생산 종료일 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={productionEndDate}
                  onChange={(e) => {
                    setProductionEndDate(e.target.value);
                    if (!inboundDate) setInboundDate(e.target.value);
                  }}
                  className="w-full px-2.5 py-1.5 text-[12px] bg-[#fdfbf7] border border-[#d6c4ac] rounded-xl focus:border-[#7e5700] outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11.5px] font-bold text-[#554632]">
                  입고일 <span className="text-[10px] text-[#887864]">(미입력시 채밀일)</span>
                </label>
                <input
                  type="date"
                  value={inboundDate}
                  onChange={(e) => setInboundDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-[12px] bg-[#fdfbf7] border border-[#d6c4ac] rounded-xl focus:border-[#7e5700] outline-none"
                />
              </div>
            </div>

            {/* 5. 총 채밀량 & 대상 벌통 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-[12px] font-bold text-[#554632]">
                  총 채밀량 (kg)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={totalYieldKg}
                    onChange={(e) => setTotalYieldKg(e.target.value)}
                    placeholder="수량 미기재시 비워둠"
                    className="w-full px-3 py-2 text-[13px] font-black text-[#b34700] bg-[#fdfbf7] border border-[#d6c4ac] rounded-xl focus:border-[#7e5700] focus:bg-white outline-none pr-9"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-bold text-[#887864]">
                    kg
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[12px] font-bold text-[#554632]">
                  대상 벌통 범위
                </label>
                <input
                  type="text"
                  value={hiveRange}
                  onChange={(e) => setHiveRange(e.target.value)}
                  placeholder="예: 10 · 11 · 12번 또는 전체 벌통"
                  className="w-full px-3 py-2 text-[12.5px] font-bold bg-[#fdfbf7] border border-[#d6c4ac] rounded-xl focus:border-[#7e5700] focus:bg-white outline-none"
                />
              </div>
            </div>

            {/* 6. 채밀 작업 내역 목록 (회차별 확인/수정) */}
            {harvestOperations.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[12px] font-bold text-[#554632] flex items-center gap-1">
                    <span className="material-symbols-outlined text-[15px] text-[#7e5700]">receipt_long</span>
                    <span>회차별 채밀 작업 내역 ({harvestOperations.length}회)</span>
                  </label>
                  <span className="text-[10.5px] text-[#887864]">회차별 수량 수정 가능</span>
                </div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {harvestOperations.map((op, idx) => (
                    <div
                      key={op.operationId || idx}
                      className="p-2.5 bg-[#fdfbf7] border border-[#e8dec8] rounded-xl flex items-center justify-between gap-2 text-[12px]"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-[#2b1e00]">{op.date.replace(/-/g, '.')}</span>
                          <span className="text-[10.5px] px-1.5 py-0.2 bg-[#f3ebe0] rounded font-semibold text-[#554632]">
                            {op.hiveRange}
                          </span>
                        </div>
                        {op.notes && (
                          <p className="text-[11px] text-[#887864] line-clamp-1 max-w-xs">{op.notes}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={op.yieldKg > 0 ? op.yieldKg : ''}
                          onChange={(e) => handleOperationYieldChange(idx, e.target.value)}
                          placeholder="수량"
                          className="w-16 px-1.5 py-1 text-right text-[12px] font-black text-[#b34700] bg-white border border-[#d6c4ac] rounded-lg outline-none"
                        />
                        <span className="text-[11px] text-[#554632]">kg</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 7. 양봉일지 연결 정보 배지 */}
            <div className="p-2.5 bg-[#fbf9f4] border border-[#eee4d4] rounded-xl flex items-center justify-between text-[11.5px]">
              <div className="flex items-center gap-1.5 text-[#7e5700] font-bold">
                <span className="material-symbols-outlined text-[16px]">link</span>
                <span>근거 양봉일지 {draft.relatedJournalIds.length}건이 이력에 자동 연결됩니다.</span>
              </div>
              <span className="text-[10px] text-[#887864]">추적성 보장</span>
            </div>

            {/* 8. 메모 */}
            <div className="space-y-1.5">
              <label className="block text-[12px] font-bold text-[#554632]">메모 / AI 요약문</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="채밀 과정, 당도, 날씨 등 특이사항을 기록합니다."
                className="w-full px-3 py-2 text-[12.5px] bg-[#fdfbf7] border border-[#d6c4ac] rounded-xl focus:border-[#7e5700] focus:bg-white outline-none resize-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-3.5 bg-[#fbf9f4] border-t border-[#f0e7d5] flex items-center justify-between gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-[12.5px] font-bold text-[#554632] bg-white border border-[#d6c8b2] rounded-xl hover:bg-[#f3ebe0] transition-colors cursor-pointer disabled:opacity-50"
            >
              취소
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 text-[13px] font-black text-white bg-[#7e5700] hover:bg-[#684700] rounded-xl shadow-md active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Firestore 저장 중...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[17px]">cloud_upload</span>
                  <span>최종 등록</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
