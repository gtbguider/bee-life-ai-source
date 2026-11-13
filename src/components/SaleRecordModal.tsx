import React, { useState, useEffect } from 'react';
import {
  BeekeepingSalesRecord,
  BeekeepingProductType,
  BeekeepingSalesChannel
} from '../types';
import { PRODUCT_OPTIONS } from '../data/beekeepingLedgerData';

interface SaleRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: BeekeepingSalesRecord) => void;
  initialRecord?: BeekeepingSalesRecord | null;
}

const CHANNELS: BeekeepingSalesChannel[] = [
  '소비자 직거래(택배)',
  '스마트스토어/온라인',
  '로컬푸드/농협',
  '지인/선물용',
  '도매/상인',
  '현장 직판'
];

const PAYMENT_METHODS: ('계좌이체' | '카드' | '현금' | '세금계산서')[] = [
  '계좌이체',
  '카드',
  '현금',
  '세금계산서'
];

export const SaleRecordModal: React.FC<SaleRecordModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialRecord
}) => {
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [item, setItem] = useState<BeekeepingProductType>('천연숙성꿀');
  const [customItemName, setCustomItemName] = useState<string>('');
  const [unit, setUnit] = useState<string>('2.4kg 병');
  const [quantity, setQuantity] = useState<number>(10);
  const [unitPrice, setUnitPrice] = useState<number>(60000);
  const [channel, setChannel] = useState<BeekeepingSalesChannel>('소비자 직거래(택배)');
  const [buyerName, setBuyerName] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'계좌이체' | '카드' | '현금' | '세금계산서'>('계좌이체');
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (initialRecord) {
      setDate(initialRecord.date);
      setItem(initialRecord.item);
      setCustomItemName(initialRecord.customItemName || '');
      setUnit(initialRecord.unit);
      setQuantity(initialRecord.quantity);
      setUnitPrice(initialRecord.unitPrice);
      setChannel(initialRecord.channel);
      setBuyerName(initialRecord.buyerName || '');
      setPaymentMethod(initialRecord.paymentMethod);
      setNotes(initialRecord.notes || '');
    } else {
      const today = new Date().toISOString().slice(0, 10);
      setDate(today);
      setItem('천연숙성꿀');
      setCustomItemName('지리산 자연숙성 완숙꿀 (2.4kg)');
      setUnit('2.4kg 병');
      setQuantity(10);
      setUnitPrice(60000);
      setChannel('소비자 직거래(택배)');
      setBuyerName('');
      setPaymentMethod('계좌이체');
      setNotes('');
    }
  }, [initialRecord, isOpen]);

  const handleProductChange = (newItem: BeekeepingProductType) => {
    setItem(newItem);
    const found = PRODUCT_OPTIONS.find((p) => p.label === newItem);
    if (found) {
      setUnit(found.defaultUnit);
      setUnitPrice(found.defaultPrice);
      if (!customItemName || customItemName.includes('꿀') || customItemName.includes('로열') || customItemName.includes('화분')) {
        setCustomItemName(`지리산 햇 ${newItem} (${found.defaultUnit})`);
      }
    }
  };

  const totalAmount = quantity * unitPrice;

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const record: BeekeepingSalesRecord = {
      id: initialRecord ? initialRecord.id : `sale-${Date.now()}`,
      date,
      item,
      customItemName: customItemName.trim() || undefined,
      unit,
      quantity: Number(quantity) || 1,
      unitPrice: Number(unitPrice) || 0,
      totalAmount,
      channel,
      buyerName: buyerName.trim() || undefined,
      paymentMethod,
      notes: notes.trim() || undefined
    };
    onSave(record);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-2xl border-2 border-[#1b6d24] my-auto max-h-[92vh] flex flex-col animate-in fade-in zoom-in duration-150">
        {/* Modal Header */}
        <div className="flex justify-between items-center border-b border-[#d4e5ef] pb-3 mb-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#1b6d24] text-white flex items-center justify-center font-bold shadow-xs">
              <span className="material-symbols-outlined text-[22px]">point_of_sale</span>
            </div>
            <div>
              <h3 className="font-extrabold text-[17px] text-[#0d1e25]">
                {initialRecord ? '수입·판매 내역 수정' : '양봉 수입·판매 내역 등록'}
              </h3>
              <p className="text-[11px] text-[#514532]">
                전라남도농업기술원 양봉경영기록장 표준 수입 양식
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-[#514532] hover:bg-[#d9ebf5] transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </div>

        {/* Form Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pr-1 space-y-4">
          {/* Row 1: Date & Item */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-bold text-[#0d1e25] mb-1">
                판매 일자 *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full h-11 px-3 bg-[#f4faff] border border-[#d6c4ac] rounded-xl text-[13px] font-semibold text-[#0d1e25] focus:outline-none focus:border-[#1b6d24]"
              />
            </div>

            <div>
              <label className="block text-[12px] font-bold text-[#0d1e25] mb-1">
                양봉 산물 품목 *
              </label>
              <select
                value={item}
                onChange={(e) => handleProductChange(e.target.value as BeekeepingProductType)}
                className="w-full h-11 px-3 bg-[#f4faff] border border-[#d6c4ac] rounded-xl text-[13px] font-bold text-[#0d1e25] focus:outline-none focus:border-[#1b6d24]"
              >
                {PRODUCT_OPTIONS.map((p) => (
                  <option key={p.label} value={p.label}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Custom Item Name */}
          <div>
            <label className="block text-[12px] font-bold text-[#0d1e25] mb-1">
              상세 상품명 / 포장 규격명
            </label>
            <input
              type="text"
              placeholder="예: 지리산 자연숙성 완숙꿀 (2.4kg)"
              value={customItemName}
              onChange={(e) => setCustomItemName(e.target.value)}
              className="w-full h-11 px-3 bg-[#f4faff] border border-[#d6c4ac] rounded-xl text-[13px] text-[#0d1e25] focus:outline-none focus:border-[#1b6d24]"
            />
          </div>

          {/* Row 3: Unit, Qty, UnitPrice */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div>
              <label className="block text-[11px] sm:text-[12px] font-bold text-[#0d1e25] mb-1">
                규격/단위 *
              </label>
              <input
                type="text"
                placeholder="2.4kg 병"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full h-11 px-2.5 bg-[#f4faff] border border-[#d6c4ac] rounded-xl text-[12px] sm:text-[13px] text-[#0d1e25] focus:outline-none focus:border-[#1b6d24]"
              />
            </div>

            <div>
              <label className="block text-[11px] sm:text-[12px] font-bold text-[#0d1e25] mb-1">
                판매 수량 *
              </label>
              <input
                type="number"
                min="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 0))}
                className="w-full h-11 px-2.5 bg-[#f4faff] border border-[#d6c4ac] rounded-xl text-[13px] font-bold text-[#0d1e25] focus:outline-none focus:border-[#1b6d24]"
              />
            </div>

            <div>
              <label className="block text-[11px] sm:text-[12px] font-bold text-[#0d1e25] mb-1">
                판매단가(원) *
              </label>
              <input
                type="number"
                min="0"
                step="1000"
                required
                value={unitPrice}
                onChange={(e) => setUnitPrice(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="w-full h-11 px-2.5 bg-[#f4faff] border border-[#d6c4ac] rounded-xl text-[13px] font-bold text-[#0d1e25] focus:outline-none focus:border-[#1b6d24]"
              />
            </div>
          </div>

          {/* Auto calculated total amount box */}
          <div className="bg-[#1b6d24]/10 border border-[#1b6d24]/30 rounded-2xl p-3 flex justify-between items-center">
            <span className="text-[13px] font-bold text-[#1b6d24]">총 판매 수입액</span>
            <span className="text-[20px] font-black text-[#1b6d24]">
              {totalAmount.toLocaleString()} 원
            </span>
          </div>

          {/* Row 4: Channel & Payment Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-bold text-[#0d1e25] mb-1">
                판매처 (유통 경로) *
              </label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value as BeekeepingSalesChannel)}
                className="w-full h-11 px-3 bg-[#f4faff] border border-[#d6c4ac] rounded-xl text-[13px] text-[#0d1e25] focus:outline-none focus:border-[#1b6d24]"
              >
                {CHANNELS.map((ch) => (
                  <option key={ch} value={ch}>
                    {ch}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[12px] font-bold text-[#0d1e25] mb-1">
                결제 방법 *
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full h-11 px-3 bg-[#f4faff] border border-[#d6c4ac] rounded-xl text-[13px] text-[#0d1e25] focus:outline-none focus:border-[#1b6d24]"
              >
                {PAYMENT_METHODS.map((pm) => (
                  <option key={pm} value={pm}>
                    {pm}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 5: Buyer Name */}
          <div>
            <label className="block text-[12px] font-bold text-[#0d1e25] mb-1">
              거래처 / 구매자명
            </label>
            <input
              type="text"
              placeholder="예: 구례농협 로컬푸드직매장, 단골고객 김민수"
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
              className="w-full h-11 px-3 bg-[#f4faff] border border-[#d6c4ac] rounded-xl text-[13px] text-[#0d1e25] focus:outline-none focus:border-[#1b6d24]"
            />
          </div>

          {/* Row 6: Notes */}
          <div>
            <label className="block text-[12px] font-bold text-[#0d1e25] mb-1">
              비고 / 메모 (배송, 포장, 이벤트 등)
            </label>
            <input
              type="text"
              placeholder="예: 우체국 안심택배 발송, 1차 채밀분"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full h-11 px-3 bg-[#f4faff] border border-[#d6c4ac] rounded-xl text-[13px] text-[#0d1e25] focus:outline-none focus:border-[#1b6d24]"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/3 h-12 bg-white border border-[#d6c4ac] text-[#514532] font-bold rounded-2xl text-[14px] hover:bg-[#d9ebf5] transition-colors cursor-pointer"
            >
              취소
            </button>
            <button
              type="submit"
              className="w-2/3 h-12 bg-[#1b6d24] hover:bg-[#13531b] text-white font-extrabold rounded-2xl text-[14px] shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">save</span>
              <span>{initialRecord ? '수정 내용 저장' : '수입 장부 등록'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
