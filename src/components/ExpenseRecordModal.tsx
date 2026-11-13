import React, { useState, useEffect } from 'react';
import {
  BeekeepingExpenseRecord,
  BeekeepingExpenseCategory
} from '../types';
import { EXPENSE_CATEGORY_OPTIONS } from '../data/beekeepingLedgerData';

interface ExpenseRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: BeekeepingExpenseRecord) => void;
  initialRecord?: BeekeepingExpenseRecord | null;
}

const CATEGORIES: BeekeepingExpenseCategory[] = [
  '사료/사양비',
  '방제/약품비',
  '기구/자재비',
  '수송/유류비',
  '인건비/고용노동',
  '시설/임차료',
  '제세공과/인증비',
  '기타경영비'
];

const PAYMENT_METHODS: ('카드' | '계좌이체' | '현금' | '세금계산서')[] = [
  '카드',
  '계좌이체',
  '현금',
  '세금계산서'
];

export const ExpenseRecordModal: React.FC<ExpenseRecordModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialRecord
}) => {
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState<BeekeepingExpenseCategory>('사료/사양비');
  const [itemName, setItemName] = useState<string>('정제 백설탕 (15kg 포)');
  const [unit, setUnit] = useState<string>('포');
  const [quantity, setQuantity] = useState<number>(20);
  const [unitPrice, setUnitPrice] = useState<number>(26000);
  const [vendor, setVendor] = useState<string>('구례농협 하나로마트');
  const [paymentMethod, setPaymentMethod] = useState<'카드' | '계좌이체' | '현금' | '세금계산서'>('카드');
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (initialRecord) {
      setDate(initialRecord.date);
      setCategory(initialRecord.category);
      setItemName(initialRecord.itemName);
      setUnit(initialRecord.unit);
      setQuantity(initialRecord.quantity);
      setUnitPrice(initialRecord.unitPrice);
      setVendor(initialRecord.vendor);
      setPaymentMethod(initialRecord.paymentMethod);
      setNotes(initialRecord.notes || '');
    } else {
      const today = new Date().toISOString().slice(0, 10);
      setDate(today);
      setCategory('사료/사양비');
      setItemName('정제 백설탕 (15kg 포)');
      setUnit('포');
      setQuantity(20);
      setUnitPrice(26000);
      setVendor('구례농협 하나로마트');
      setPaymentMethod('카드');
      setNotes('');
    }
  }, [initialRecord, isOpen]);

  const handleCategoryChange = (newCat: BeekeepingExpenseCategory) => {
    setCategory(newCat);
    const found = EXPENSE_CATEGORY_OPTIONS.find((c) => c.label === newCat);
    if (found) {
      if (found.sampleItems.length > 0) {
        setItemName(found.sampleItems[0]);
      }
      setVendor(found.defaultVendor);
      if (newCat === '사료/사양비') {
        setUnit('포');
        setUnitPrice(26000);
      } else if (newCat === '기구/자재비') {
        setUnit('개');
        setUnitPrice(1800);
      } else if (newCat === '인건비/고용노동') {
        setUnit('일/인');
        setUnitPrice(160000);
      } else if (newCat === '방제/약품비') {
        setUnit('세트');
        setUnitPrice(180000);
      } else {
        setUnit('회');
        setUnitPrice(150000);
      }
    }
  };

  const totalAmount = quantity * unitPrice;

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const record: BeekeepingExpenseRecord = {
      id: initialRecord ? initialRecord.id : `exp-${Date.now()}`,
      date,
      category,
      itemName: itemName.trim() || '양봉 자재 구입',
      unit,
      quantity: Number(quantity) || 1,
      unitPrice: Number(unitPrice) || 0,
      totalAmount,
      vendor: vendor.trim() || '일반 거래처',
      paymentMethod,
      notes: notes.trim() || undefined
    };
    onSave(record);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-2xl border-2 border-[#ba1a1a] my-auto max-h-[92vh] flex flex-col animate-in fade-in zoom-in duration-150">
        {/* Modal Header */}
        <div className="flex justify-between items-center border-b border-[#d4e5ef] pb-3 mb-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#ba1a1a] text-white flex items-center justify-center font-bold shadow-xs">
              <span className="material-symbols-outlined text-[22px]">shopping_cart_checkout</span>
            </div>
            <div>
              <h3 className="font-extrabold text-[17px] text-[#0d1e25]">
                {initialRecord ? '경영비·지출 내역 수정' : '양봉 경영비·지출 내역 등록'}
              </h3>
              <p className="text-[11px] text-[#514532]">
                전라남도농업기술원 양봉경영기록장 표준 비목 분류
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pr-1 space-y-4">
          {/* Row 1: Date & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-bold text-[#0d1e25] mb-1">
                지출 일자 *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full h-11 px-3 bg-[#f4faff] border border-[#d6c4ac] rounded-xl text-[13px] font-semibold text-[#0d1e25] focus:outline-none focus:border-[#ba1a1a]"
              />
            </div>

            <div>
              <label className="block text-[12px] font-bold text-[#0d1e25] mb-1">
                비목 (비용 분류) *
              </label>
              <select
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value as BeekeepingExpenseCategory)}
                className="w-full h-11 px-3 bg-[#f4faff] border border-[#d6c4ac] rounded-xl text-[13px] font-bold text-[#0d1e25] focus:outline-none focus:border-[#ba1a1a]"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Item Name & Quick suggestions */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-[12px] font-bold text-[#0d1e25]">
                품명 및 세부 내용 *
              </label>
              <span className="text-[10px] text-[#514532]">예시 클릭 시 자동입력</span>
            </div>
            <input
              type="text"
              required
              placeholder="예: 정제 백설탕 (15kg 포), 개미산 60%"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              className="w-full h-11 px-3 bg-[#f4faff] border border-[#d6c4ac] rounded-xl text-[13px] text-[#0d1e25] focus:outline-none focus:border-[#ba1a1a]"
            />
            {/* Quick Chips */}
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {EXPENSE_CATEGORY_OPTIONS.find((c) => c.label === category)?.sampleItems.map((item) => (
                <button
                  type="button"
                  key={item}
                  onClick={() => setItemName(item)}
                  className="text-[10px] bg-[#d9ebf5] hover:bg-[#d4e5ef] text-[#0d1e25] px-2 py-0.5 rounded-md transition-colors"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {/* Row 3: Unit, Qty, UnitPrice */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div>
              <label className="block text-[11px] sm:text-[12px] font-bold text-[#0d1e25] mb-1">
                규격/단위 *
              </label>
              <input
                type="text"
                placeholder="포, kg, 개"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full h-11 px-2.5 bg-[#f4faff] border border-[#d6c4ac] rounded-xl text-[12px] sm:text-[13px] text-[#0d1e25] focus:outline-none focus:border-[#ba1a1a]"
              />
            </div>

            <div>
              <label className="block text-[11px] sm:text-[12px] font-bold text-[#0d1e25] mb-1">
                구입 수량 *
              </label>
              <input
                type="number"
                min="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 0))}
                className="w-full h-11 px-2.5 bg-[#f4faff] border border-[#d6c4ac] rounded-xl text-[13px] font-bold text-[#0d1e25] focus:outline-none focus:border-[#ba1a1a]"
              />
            </div>

            <div>
              <label className="block text-[11px] sm:text-[12px] font-bold text-[#0d1e25] mb-1">
                구입 단가(원) *
              </label>
              <input
                type="number"
                min="0"
                step="500"
                required
                value={unitPrice}
                onChange={(e) => setUnitPrice(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="w-full h-11 px-2.5 bg-[#f4faff] border border-[#d6c4ac] rounded-xl text-[13px] font-bold text-[#0d1e25] focus:outline-none focus:border-[#ba1a1a]"
              />
            </div>
          </div>

          {/* Auto calculated total amount box */}
          <div className="bg-[#ba1a1a]/10 border border-[#ba1a1a]/30 rounded-2xl p-3 flex justify-between items-center">
            <span className="text-[13px] font-bold text-[#ba1a1a]">총 지출 경영비용</span>
            <span className="text-[20px] font-black text-[#ba1a1a]">
              {totalAmount.toLocaleString()} 원
            </span>
          </div>

          {/* Row 4: Vendor & Payment Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-bold text-[#0d1e25] mb-1">
                구입처 (상호) *
              </label>
              <input
                type="text"
                placeholder="예: 구례농협 하나로마트, 구례양봉원"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                className="w-full h-11 px-3 bg-[#f4faff] border border-[#d6c4ac] rounded-xl text-[13px] text-[#0d1e25] focus:outline-none focus:border-[#ba1a1a]"
              />
            </div>

            <div>
              <label className="block text-[12px] font-bold text-[#0d1e25] mb-1">
                결제 방법 *
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full h-11 px-3 bg-[#f4faff] border border-[#d6c4ac] rounded-xl text-[13px] text-[#0d1e25] focus:outline-none focus:border-[#ba1a1a]"
              >
                {PAYMENT_METHODS.map((pm) => (
                  <option key={pm} value={pm}>
                    {pm}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 5: Notes */}
          <div>
            <label className="block text-[12px] font-bold text-[#0d1e25] mb-1">
              비고 / 메모 (영수증 번호, 사용 목적 등)
            </label>
            <input
              type="text"
              placeholder="예: 봄철 산란촉진용, 부가세 영수증 보관"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full h-11 px-3 bg-[#f4faff] border border-[#d6c4ac] rounded-xl text-[13px] text-[#0d1e25] focus:outline-none focus:border-[#ba1a1a]"
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
              className="w-2/3 h-12 bg-[#ba1a1a] hover:bg-[#93000a] text-white font-extrabold rounded-2xl text-[14px] shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">save</span>
              <span>{initialRecord ? '수정 내용 저장' : '비용 장부 등록'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
