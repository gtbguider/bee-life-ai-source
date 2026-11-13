import React, { useState, useEffect, useMemo } from 'react';
import { HoneyLot, ApiaryProductType, BeekeeperProduct, APIARY_PRODUCT_TYPE_ICONS } from '../types';
import {
  generateLotNumber,
  formatHiveRange,
  getDefaultProductMeta,
  getHoneyTypeCode,
  getProductTypeCode
} from '../services/honeyLotService';
import { generatePublicTraceId } from '../services/honeyTracePublicService';

interface HoneyLotFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (lot: HoneyLot) => Promise<void>;
  existingLot?: HoneyLot | null;
  existingLots: HoneyLot[];
  maxHiveCount?: number;
  farmName?: string;
  products?: BeekeeperProduct[];
  onOpenProductForm?: () => void;
}

const HONEY_TYPES = ['아카시아꿀', '밤꿀', '야생화꿀', '기타'];

export const HoneyLotForm: React.FC<HoneyLotFormProps> = ({
  isOpen,
  onClose,
  onSave,
  existingLot,
  existingLots,
  maxHiveCount = 50,
  farmName = '농업회사법인 허니비테코 주식회사',
  products = [],
  onOpenProductForm
}) => {
  const isEdit = Boolean(existingLot);

  // Form states
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [productType, setProductType] = useState<ApiaryProductType>('honey');
  const [productImageUrl, setProductImageUrl] = useState<string>('');
  const [packageUnit, setPackageUnit] = useState<string>('');
  const [storageMethod, setStorageMethod] = useState<string>('');
  const [honeyType, setHoneyType] = useState<string>('아카시아꿀');
  const [productName, setProductName] = useState<string>('');
  const [nectarSource, setNectarSource] = useState<string>('');
  const [harvestDate, setHarvestDate] = useState<string>('');
  const [inboundDate, setInboundDate] = useState<string>('');
  const [harvestQuantityKg, setHarvestQuantityKg] = useState<string>('');
  const [selectedHiveIds, setSelectedHiveIds] = useState<number[]>([]);
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Hive numbers to choose from
  const hiveNumbers = useMemo(() => {
    return Array.from({ length: Math.min(Math.max(maxHiveCount, 10), 100) }, (_, i) => i + 1);
  }, [maxHiveCount]);

  // Initialize or reset form
  useEffect(() => {
    if (!isOpen) return;

    if (existingLot) {
      setSelectedProductId(existingLot.productId || '');
      setProductType(existingLot.productType || 'honey');
      setProductImageUrl(existingLot.productImageUrl || '');
      setPackageUnit(existingLot.packageUnit || '');
      setStorageMethod(existingLot.storageMethod || '');
      setHoneyType(existingLot.honeyType || '아카시아꿀');
      setProductName(existingLot.productName || '');
      setNectarSource(existingLot.nectarSource || '');
      setHarvestDate(existingLot.harvestDate || '');
      // If inboundDate equals harvestDate, keep it or show as set
      setInboundDate(existingLot.inboundDate || '');
      setHarvestQuantityKg(
        existingLot.harvestQuantityKg !== undefined && existingLot.harvestQuantityKg !== null
          ? String(existingLot.harvestQuantityKg)
          : ''
      );
      setSelectedHiveIds(existingLot.hiveIds || []);
      setNotes(existingLot.notes || '');
    } else {
      // Default to today
      const today = new Date().toISOString().split('T')[0];
      setSelectedProductId('');
      setProductType('honey');
      setProductImageUrl('');
      setPackageUnit('');
      setStorageMethod('');
      setHoneyType('아카시아꿀');
      const meta = getDefaultProductMeta('아카시아꿀', farmName, 'honey');
      setProductName(meta.productName);
      setNectarSource(meta.nectarSource);
      setHarvestDate(today);
      setInboundDate(''); // Empty by default to test rule: inboundDate = harvestDate
      setHarvestQuantityKg('');
      setSelectedHiveIds([]);
      setNotes('');
    }
    setErrorMsg(null);
  }, [isOpen, existingLot, farmName]);

  // Handle choosing a registered BeekeeperProduct
  const handleProductSelect = (prodId: string) => {
    setSelectedProductId(prodId);
    if (!prodId) {
      // Custom / manual
      return;
    }

    const found = products.find((p) => p.id === prodId);
    if (found) {
      setProductType(found.productType);
      setProductName(found.productName);
      setProductImageUrl(found.photoUrl || '');
      setPackageUnit(found.packageUnit || '');
      setStorageMethod(found.storageMethod || '');

      if (found.productType === 'royalJelly') {
        setHoneyType('생로열제리');
        setNectarSource('지리산 청정 밀원 생로열제리');
      } else if (found.productType === 'propolis') {
        setHoneyType('프로폴리스');
        setNectarSource('지리산 천연 수목 수지');
      } else {
        // Guess honeyType from productName if possible
        if (found.productName.includes('아카시아')) setHoneyType('아카시아꿀');
        else if (found.productName.includes('밤')) setHoneyType('밤꿀');
        else if (found.productName.includes('야생화') || found.productName.includes('잡화')) setHoneyType('야생화꿀');
        else setHoneyType('천연벌꿀');
      }
    }
  };

  // Update default product name & nectar when honey type changes (if creating new)
  const handleHoneyTypeChange = (newType: string) => {
    setHoneyType(newType);
    if (!isEdit && !selectedProductId) {
      const meta = getDefaultProductMeta(newType, farmName, productType);
      setProductName(meta.productName);
      setNectarSource(meta.nectarSource);
    }
  };

  // Toggle hive selection
  const toggleHive = (hiveId: number) => {
    setSelectedHiveIds((prev) => {
      if (prev.includes(hiveId)) {
        return prev.filter((id) => id !== hiveId);
      } else {
        return [...prev, hiveId].sort((a, b) => a - b);
      }
    });
  };

  // Select all or clear hives
  const handleSelectAllHives = () => {
    if (selectedHiveIds.length === hiveNumbers.length) {
      setSelectedHiveIds([]);
    } else {
      setSelectedHiveIds([...hiveNumbers]);
    }
  };

  // Quick range helper (e.g. 1~10, 11~20, etc.)
  const handleSelectHiveRange = (start: number, end: number) => {
    const range = hiveNumbers.filter((n) => n >= start && n <= end);
    setSelectedHiveIds((prev) => {
      const set = new Set([...prev, ...range]);
      return Array.from(set).sort((a, b) => a - b);
    });
  };

  // Auto-calculated preview of LOT number
  const previewLotNumber = useMemo(() => {
    if (isEdit && existingLot) {
      const expectedCode = getProductTypeCode(productType, honeyType);
      const expectedDateCompact = (harvestDate || '').replace(/-/g, '');
      const expectedYear = (harvestDate || '').slice(0, 4);
      const parts = (existingLot.lotNumber || '').split('-');
      // 기존 LOT 번호의 종류 코드나 날짜가 현재 선택한 종류/채취일과 일치하면 기존 순번 유지
      if (
        parts.length === 4 &&
        parts[0] === expectedYear &&
        parts[1] === expectedCode &&
        parts[2] === expectedDateCompact
      ) {
        return existingLot.lotNumber;
      }
      // 종류만 변경이고 채취일이 동일한 경우, 다른 LOT과 충돌하지 않으면 기존 순번 유지
      const otherLots = existingLots.filter((l) => l.id !== existingLot.id);
      if (parts.length === 4 && parts[0] === expectedYear && parts[2] === expectedDateCompact) {
        const candidateWithSameSeq = `${expectedYear}-${expectedCode}-${expectedDateCompact}-${parts[3]}`;
        const hasConflict = otherLots.some((l) => l.lotNumber === candidateWithSameSeq);
        if (!hasConflict) {
          return candidateWithSameSeq;
        }
      }
      return generateLotNumber(honeyType, harvestDate, otherLots, productType);
    }
    return generateLotNumber(honeyType, harvestDate, existingLots, productType);
  }, [isEdit, existingLot, honeyType, harvestDate, existingLots, productType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!harvestDate) {
      setErrorMsg(productType === 'royalJelly' ? '채취/이충 일자는 필수 항목입니다.' : '채취/채밀일은 필수 항목입니다.');
      return;
    }

    if (!productName.trim()) {
      setErrorMsg('제품명을 입력해주세요.');
      return;
    }

    try {
      setIsSubmitting(true);

      // CRITICAL RULE: If inboundDate is not provided, inboundDate = harvestDate
      const finalInboundDate = inboundDate && inboundDate.trim() ? inboundDate.trim() : harvestDate;

      // LOT number (aligns with selected honeyType and harvestDate while preserving sequence when applicable)
      const lotNumber = previewLotNumber;

      const parsedQty = harvestQuantityKg ? parseFloat(harvestQuantityKg) : undefined;
      const sortedHives = [...selectedHiveIds].sort((a, b) => a - b);
      const hiveRange = formatHiveRange(sortedHives);

      const lotPayload: HoneyLot = {
        ...(existingLot || {}),
        id: existingLot?.id || `lot-${Date.now()}`,
        productType,
        productId: selectedProductId || existingLot?.productId || undefined,
        productImageUrl: productImageUrl || existingLot?.productImageUrl || undefined,
        packageUnit: packageUnit || existingLot?.packageUnit || undefined,
        storageMethod: storageMethod || existingLot?.storageMethod || undefined,
        honeyType,
        productName: productName.trim(),
        nectarSource: nectarSource.trim() || undefined,
        harvestDate,
        inboundDate: finalInboundDate, // Guaranteed fallback
        harvestQuantityKg: !isNaN(parsedQty as number) ? parsedQty : undefined,
        hiveIds: sortedHives.length > 0 ? sortedHives : undefined,
        hiveRange,
        farmName,
        lotNumber,
        publicTraceId:
          existingLot?.publicTraceId && existingLot.publicTraceId.trim()
            ? existingLot.publicTraceId.trim()
            : generatePublicTraceId(),
        inspectionReportUrl: existingLot?.inspectionReportUrl,
        inspectionReportName: existingLot?.inspectionReportName,
        notes: notes.trim() || undefined,
        createdAt: existingLot?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await onSave(lotPayload);
      onClose();
    } catch (err: any) {
      console.error('Failed to save Honey Lot:', err);
      setErrorMsg(err?.message || '저장 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 pt-safe pb-safe bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div
        className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-[#e8dec8] flex flex-col max-h-[calc(100dvh-2.5rem)] my-auto overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#f0e7d5] flex items-center justify-between bg-gradient-to-r from-[#fff9ee] to-[#ffffff] shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[24px]">{APIARY_PRODUCT_TYPE_ICONS[productType] || '🍯'}</span>
            <div>
              <h2 className="text-[17px] font-black text-[#2b1e00] leading-tight">
                {isEdit
                  ? `${productType === 'royalJelly' ? '생로열제리' : productType === 'propolis' ? '프로폴리스' : '꿀'} 이력 수정`
                  : `${productType === 'royalJelly' ? '생로열제리' : productType === 'propolis' ? '프로폴리스' : '꿀'} 이력(LOT) 등록`}
              </h2>
              <p className="text-[11px] text-[#7e5700] font-medium">
                생산 정보와 벌통을 연결하여 고유 이력(LOT)과 소비자 QR을 생성합니다.
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto overscroll-contain space-y-4 text-[#2b1e00] text-[13px]">
          {errorMsg && (
            <div className="p-3 bg-[#feebeb] border border-[#f8c4c4] text-[#a12b2b] text-[12px] font-bold rounded-xl flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">error</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* LOT Preview Badge */}
          <div className="p-3 bg-[#fdf9f1] border border-[#f2e5ce] rounded-2xl flex items-center justify-between">
            <div>
              <div className="text-[10.5px] font-bold text-[#7e5700]">생성될 고유 LOT 번호</div>
              <div className="text-[15px] font-black tracking-wider text-[#2b1e00]">
                {previewLotNumber}
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#ffdeac] text-[#7e5700]">
              자동 생성
            </span>
          </div>

          {/* 연결할 등록 제품 선택 (Product Selector) */}
          {products.length > 0 && (
            <div className="space-y-1.5 p-3.5 rounded-2xl bg-[#faf3e0]/60 border border-[#ebdcc4]">
              <div className="flex items-center justify-between">
                <label className="text-[12px] font-black text-[#554632]">
                  연결할 등록 제품 선택
                </label>
                {onOpenProductForm && (
                  <button
                    type="button"
                    onClick={onOpenProductForm}
                    className="text-[11px] font-extrabold text-[#7e5700] hover:underline flex items-center gap-0.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[14px]">add_circle</span>
                    <span>새 제품 등록</span>
                  </button>
                )}
              </div>
              <select
                value={selectedProductId}
                onChange={(e) => handleProductSelect(e.target.value)}
                className="w-full px-3 py-2 text-[12.5px] font-semibold bg-white border border-[#d6c8b2] rounded-xl focus:outline-hidden focus:border-[#7e5700] cursor-pointer"
              >
                <option value="">직접 정보 입력 (기존 방식)</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {APIARY_PRODUCT_TYPE_ICONS[p.productType]} {p.productName} ({p.packageUnit || '규격 미기재'})
                  </option>
                ))}
              </select>
              {selectedProductId && (
                <div className="flex items-center gap-3 pt-2 text-[11.5px] text-[#6e5d47]">
                  {productImageUrl ? (
                    <img
                      src={productImageUrl}
                      alt="제품 사진"
                      className="w-12 h-12 rounded-lg object-cover border border-[#ebdcc4] shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-[#f0e7d5] flex items-center justify-center text-[18px] shrink-0">
                      {APIARY_PRODUCT_TYPE_ICONS[productType]}
                    </div>
                  )}
                  <div className="leading-tight">
                    <div className="font-bold text-[#2b1e00]">{productName}</div>
                    <div className="text-[11px] text-[#7e5700]">
                      {packageUnit && <span>포장: {packageUnit} · </span>}
                      {storageMethod && <span>보관: {storageMethod}</span>}
                    </div>
                    <div className="text-[10px] text-green-700 font-semibold mt-0.5">
                      ✓ 제품 대표 사진 및 포장 정보가 이 LOT 공개 이력에 자동 상속됩니다.
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 이력 대상 양봉산물 (Product Type Selection) */}
          <div className="space-y-1.5">
            <label className="block text-[12px] font-bold text-[#554632]">
              이력 대상 양봉산물 <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setProductType('honey');
                  if (!selectedProductId) handleHoneyTypeChange('아카시아꿀');
                }}
                className={`py-2 px-2.5 rounded-xl font-black text-[12.5px] border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  productType === 'honey'
                    ? 'bg-[#7e5700] text-white border-[#7e5700] shadow-2xs'
                    : 'bg-[#fbf9f4] text-[#554632] border-[#e8dec8] hover:bg-[#f3ebe0]'
                }`}
              >
                <span className="text-[15px]">🍯</span>
                <span>천연꿀</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setProductType('royalJelly');
                  setHoneyType('생로열제리');
                  if (!selectedProductId) {
                    const def = getDefaultProductMeta('', farmName, 'royalJelly');
                    setProductName(def.productName);
                    setNectarSource(def.nectarSource);
                    setPackageUnit(def.packageUnit || '');
                    setStorageMethod(def.storageMethod || '');
                  }
                }}
                className={`py-2 px-2.5 rounded-xl font-black text-[12.5px] border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  productType === 'royalJelly'
                    ? 'bg-[#7e5700] text-white border-[#7e5700] shadow-2xs'
                    : 'bg-[#fbf9f4] text-[#554632] border-[#e8dec8] hover:bg-[#f3ebe0]'
                }`}
              >
                <span className="text-[15px]">🥛</span>
                <span>생로열제리</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setProductType('propolis');
                  setHoneyType('프로폴리스');
                  if (!selectedProductId) {
                    const def = getDefaultProductMeta('', farmName, 'propolis');
                    setProductName(def.productName);
                    setNectarSource(def.nectarSource);
                    setPackageUnit(def.packageUnit || '');
                    setStorageMethod(def.storageMethod || '');
                  }
                }}
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

          {/* 1. 종류 & 제품명 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[12px] font-bold text-[#554632] block mb-1">
                {productType === 'royalJelly' ? '품목 구분' : productType === 'propolis' ? '품목 구분' : '꿀 종류'}{' '}
                <span className="text-red-500">*</span>
              </label>
              {productType === 'honey' ? (
                <select
                  value={honeyType}
                  onChange={(e) => handleHoneyTypeChange(e.target.value)}
                  className="w-full px-3 py-2 text-[12.5px] font-semibold bg-white border border-[#d6c8b2] rounded-xl focus:outline-hidden focus:border-[#7e5700] cursor-pointer"
                >
                  {HONEY_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={honeyType}
                  onChange={(e) => setHoneyType(e.target.value)}
                  className="w-full px-3 py-2 text-[12.5px] font-semibold bg-white border border-[#d6c8b2] rounded-xl focus:outline-hidden focus:border-[#7e5700]"
                />
              )}
            </div>

            <div>
              <label className="text-[12px] font-bold text-[#554632] block mb-1">
                제품명 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="예: 허니비테코 아카시아꿀"
                className="w-full px-3 py-2 text-[12.5px] bg-white border border-[#d6c8b2] rounded-xl focus:outline-hidden focus:border-[#7e5700]"
                required
              />
            </div>
          </div>

          {/* 2. 채취/채밀일 & 입고일 */}
          <div className="space-y-1.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[12px] font-bold text-[#554632] block mb-1">
                  {productType === 'royalJelly' ? '채취/이충 일자' : productType === 'propolis' ? '채취 일자' : '채밀일'}{' '}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={harvestDate}
                  onChange={(e) => setHarvestDate(e.target.value)}
                  className="w-full px-3 py-2 text-[12.5px] font-medium bg-white border border-[#d6c8b2] rounded-xl focus:outline-hidden focus:border-[#7e5700]"
                  required
                />
              </div>

              <div>
                <label className="text-[12px] font-bold text-[#554632] block mb-1">
                  입고일 <span className="text-[11px] font-normal text-[#887864]">(선택)</span>
                </label>
                <input
                  type="date"
                  value={inboundDate}
                  onChange={(e) => setInboundDate(e.target.value)}
                  className="w-full px-3 py-2 text-[12.5px] font-medium bg-white border border-[#d6c8b2] rounded-xl focus:outline-hidden focus:border-[#7e5700]"
                />
              </div>
            </div>

            {/* 안내 문구 */}
            <div className="text-[11px] text-[#7e5700] bg-[#fff8eb] px-3 py-1.5 rounded-xl border border-[#f5e6cc] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[15px] shrink-0">info</span>
              <span>
                {productType === 'royalJelly'
                  ? '입고일을 입력하지 않으면 채취일과 동일하게 자동 처리됩니다.'
                  : '입고일을 입력하지 않으면 채밀일과 동일하게 자동 처리됩니다.'}
              </span>
            </div>
          </div>

          {/* 3. 생산 벌통 다중 선택 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[12px] font-bold text-[#554632] flex items-center gap-1">
                <span>
                  {productType === 'royalJelly'
                    ? '생산 벌통'
                    : productType === 'propolis'
                    ? '채취 벌통'
                    : '채밀 벌통'}
                </span>
                <span className="text-[11px] font-normal text-[#7e5700]">
                  ({selectedHiveIds.length}개 선택됨: {formatHiveRange(selectedHiveIds)})
                </span>
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleSelectHiveRange(1, 10)}
                  className="text-[10px] px-1.5 py-0.5 bg-[#f4efe5] hover:bg-[#eadecc] rounded-md font-semibold text-[#6d5b45]"
                >
                  1~10번
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectHiveRange(11, 20)}
                  className="text-[10px] px-1.5 py-0.5 bg-[#f4efe5] hover:bg-[#eadecc] rounded-md font-semibold text-[#6d5b45]"
                >
                  11~20번
                </button>
                <button
                  type="button"
                  onClick={handleSelectAllHives}
                  className="text-[10px] px-1.5 py-0.5 bg-[#7e5700] text-white rounded-md font-semibold"
                >
                  {selectedHiveIds.length === hiveNumbers.length ? '해제' : '전체'}
                </button>
              </div>
            </div>

            {/* Hive chips scrollable container */}
            <div className="max-h-36 overflow-y-auto p-2 bg-[#fbf9f4] border border-[#e8dec8] rounded-2xl flex flex-wrap gap-1.5">
              {hiveNumbers.map((hiveNum) => {
                const isSelected = selectedHiveIds.includes(hiveNum);
                return (
                  <button
                    key={hiveNum}
                    type="button"
                    onClick={() => toggleHive(hiveNum)}
                    className={`h-8 px-2.5 rounded-lg text-[11.5px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      isSelected
                        ? 'bg-[#7e5700] text-white shadow-2xs scale-102'
                        : 'bg-white text-[#6d5b45] border border-[#dfd5c4] hover:bg-[#f6f0e4]'
                    }`}
                  >
                    <span>{hiveNum}번</span>
                    {isSelected && (
                      <span className="material-symbols-outlined text-[13px]">check</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. 생산량 & 주요 밀원 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[12px] font-bold text-[#554632] block mb-1">
                {productType === 'royalJelly' ? '생산/채취량 (kg)' : productType === 'propolis' ? '생산/채취량 (kg)' : '채밀량 (kg)'}
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={harvestQuantityKg}
                  onChange={(e) => setHarvestQuantityKg(e.target.value)}
                  placeholder="예: 38"
                  className="w-full px-3 py-2 pr-9 text-[12.5px] font-semibold bg-white border border-[#d6c8b2] rounded-xl focus:outline-hidden focus:border-[#7e5700]"
                />
                <span className="absolute right-3 top-2.5 text-[11.5px] font-bold text-[#887864]">
                  kg
                </span>
              </div>
            </div>

            <div>
              <label className="text-[12px] font-bold text-[#554632] block mb-1">
                {productType === 'royalJelly' ? '채취 환경/특징' : productType === 'propolis' ? '추출/수목 환경' : '주요 밀원'}
              </label>
              <input
                type="text"
                value={nectarSource}
                onChange={(e) => setNectarSource(e.target.value)}
                placeholder={productType === 'royalJelly' ? '예: 지리산 청정 밀원 생로열제리' : '예: 지리산 아카시아'}
                className="w-full px-3 py-2 text-[12.5px] bg-white border border-[#d6c8b2] rounded-xl focus:outline-hidden focus:border-[#7e5700]"
              />
            </div>
          </div>

          {/* 5. 메모 */}
          <div>
            <label className="text-[12px] font-bold text-[#554632] block mb-1">
              메모 <span className="text-[11px] font-normal text-[#887864]">(작업 특이사항, 보관 장소 등)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="예: 1차 아카시아 채밀 완료. 숙성실 드럼 1호에 보관."
              rows={2}
              className="w-full px-3 py-2 text-[12.5px] bg-white border border-[#d6c8b2] rounded-xl focus:outline-hidden focus:border-[#7e5700]"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#f0e7d5]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-[12px] font-bold text-[#6d5b45] hover:bg-[#ede3d4] rounded-xl transition-colors cursor-pointer"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-[12.5px] font-black bg-[#7e5700] hover:bg-[#684700] text-white rounded-xl shadow-md active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>저장 중...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">save</span>
                  <span>{isEdit ? '꿀 이력 수정' : '꿀 이력 저장'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
