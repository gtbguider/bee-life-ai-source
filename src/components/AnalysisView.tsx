import React, { useState, useEffect } from 'react';
import {
  BeekeepingSalesRecord,
  BeekeepingExpenseRecord,
  BeekeepingLedgerSummary,
  BeekeepingProductType,
  BeekeepingExpenseCategory
} from '../types';
import {
  loadSalesRecords,
  saveSalesRecords,
  loadExpenseRecords,
  saveExpenseRecords,
  loadSalesRecordsWithFirestore,
  saveSaleRecordWithFirestore,
  deleteSaleRecordWithFirestore,
  loadExpenseRecordsWithFirestore,
  saveExpenseRecordWithFirestore,
  deleteExpenseRecordWithFirestore,
  calculateLedgerSummary,
  getProductBreakdown,
  getExpenseBreakdown,
  getMonthlySummary,
  exportToJeonnamCsv
} from '../services/beekeepingLedgerService';
import { useAuth } from '../contexts/AuthContext';
import { SaleRecordModal } from './SaleRecordModal';
import { ExpenseRecordModal } from './ExpenseRecordModal';
import { JeonnamOfficialFormModal } from './JeonnamOfficialFormModal';
import { UserProfile } from '../services/userProfile';

interface AnalysisViewProps {
  onOpenReportModal: () => void;
  hiveCount?: number;
  userProfile?: UserProfile;
}

export const AnalysisView: React.FC<AnalysisViewProps> = ({
  onOpenReportModal,
  hiveCount = 50,
  userProfile
}) => {
  const [subTab, setSubTab] = useState<'diagnosis' | 'sales' | 'expenses' | 'official'>('diagnosis');
  const [selectedProduct, setSelectedProduct] = useState<string | null>('royal_jelly');
  const [simulationRatio, setSimulationRatio] = useState<number>(35); // % Royal jelly allocation

  // Real Ledger State (persisted via localStorage)
  const [sales, setSales] = useState<BeekeepingSalesRecord[]>([]);
  const [expenses, setExpenses] = useState<BeekeepingExpenseRecord[]>([]);
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>('all');
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  // Modals
  const [isSaleModalOpen, setIsSaleModalOpen] = useState<boolean>(false);
  const [editingSale, setEditingSale] = useState<BeekeepingSalesRecord | null>(null);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState<boolean>(false);
  const [editingExpense, setEditingExpense] = useState<BeekeepingExpenseRecord | null>(null);
  const [isOfficialFormModalOpen, setIsOfficialFormModalOpen] = useState<boolean>(false);

  const { user } = useAuth();
  const effectiveHiveCount = hiveCount || userProfile?.hiveCount || 50;

  // Farm Metadata (Linked directly with User Profile and dynamic Hive Count)
  const farmInfo = {
    beekeeper: userProfile?.name || '설종수',
    location: userProfile?.apiaryLocation || userProfile?.applicantAddress || '전남 구례군 산동면 하원길 9-1 (원달리 봉장)',
    apiaryName: userProfile?.apiaryTitle || '지리산 제1봉장 (원달리)',
    hiveCount: effectiveHiveCount
  };

  useEffect(() => {
    let isMounted = true;
    const uid = user?.uid;

    if (uid) {
      // Immediately switch to UID-scoped cache so previous account's memory state never lingers
      setSales(loadSalesRecords(uid));
      setExpenses(loadExpenseRecords(uid));
      loadSalesRecordsWithFirestore(uid).then((s) => {
        if (isMounted) setSales(s);
      });
      loadExpenseRecordsWithFirestore(uid).then((e) => {
        if (isMounted) setExpenses(e);
      });
    } else {
      setSales(loadSalesRecords());
      setExpenses(loadExpenseRecords());
    }

    return () => {
      isMounted = false;
    };
  }, [user?.uid]);

  const handleSaveSale = (record: BeekeepingSalesRecord) => {
    let updated: BeekeepingSalesRecord[];
    const exists = sales.some((s) => s.id === record.id);
    if (exists) {
      updated = sales.map((s) => (s.id === record.id ? record : s));
    } else {
      updated = [record, ...sales];
    }
    setSales(updated);
    saveSaleRecordWithFirestore(record, user?.uid);
    setEditingSale(null);
  };

  const handleDeleteSale = (id: string) => {
    if (window.confirm('해당 판매 기록을 삭제하시겠습니까?')) {
      const updated = sales.filter((s) => s.id !== id);
      setSales(updated);
      deleteSaleRecordWithFirestore(id, user?.uid);
    }
  };

  const handleSaveExpense = (record: BeekeepingExpenseRecord) => {
    let updated: BeekeepingExpenseRecord[];
    const exists = expenses.some((e) => e.id === record.id);
    if (exists) {
      updated = expenses.map((e) => (e.id === record.id ? record : e));
    } else {
      updated = [record, ...expenses];
    }
    setExpenses(updated);
    saveExpenseRecordWithFirestore(record, user?.uid);
    setEditingExpense(null);
  };

  const handleDeleteExpense = (id: string) => {
    if (window.confirm('해당 비용 지출 기록을 삭제하시겠습니까?')) {
      const updated = expenses.filter((e) => e.id !== id);
      setExpenses(updated);
      deleteExpenseRecordWithFirestore(id, user?.uid);
    }
  };

  // Real Calculations
  const summary: BeekeepingLedgerSummary = calculateLedgerSummary(sales, expenses, farmInfo.hiveCount);
  const productBreakdown = getProductBreakdown(sales);
  const expenseBreakdown = getExpenseBreakdown(expenses);
  const monthlySummary = getMonthlySummary(sales, expenses);

  // Filtered Sales
  const filteredSales = sales.filter((s) => {
    if (selectedMonthFilter !== 'all' && !s.date.startsWith(selectedMonthFilter)) return false;
    if (searchKeyword.trim()) {
      const kw = searchKeyword.toLowerCase();
      const matchItem = s.item.toLowerCase().includes(kw);
      const matchCustom = s.customItemName?.toLowerCase().includes(kw);
      const matchBuyer = s.buyerName?.toLowerCase().includes(kw);
      const matchChannel = s.channel.toLowerCase().includes(kw);
      return matchItem || matchCustom || matchBuyer || matchChannel;
    }
    return true;
  });

  // Filtered Expenses
  const filteredExpenses = expenses.filter((e) => {
    if (selectedMonthFilter !== 'all' && !e.date.startsWith(selectedMonthFilter)) return false;
    if (searchKeyword.trim()) {
      const kw = searchKeyword.toLowerCase();
      const matchCat = e.category.toLowerCase().includes(kw);
      const matchItem = e.itemName.toLowerCase().includes(kw);
      const matchVendor = e.vendor.toLowerCase().includes(kw);
      return matchCat || matchItem || matchVendor;
    }
    return true;
  });

  // Unique Months for filtering
  const allMonths = Array.from(
    new Set([...sales.map((s) => s.date.slice(0, 7)), ...expenses.map((e) => e.date.slice(0, 7))])
  ).sort().reverse();

  // Dynamic simulation calculated from actual gross income
  const baseGross = Math.max(2000, Math.round(summary.totalGrossIncome / 10000)); // in 만원
  const simulatedHoney = Math.round(baseGross * 0.7 * (1 - (simulationRatio - 20) * 0.008));
  const simulatedRoyal = Math.round(baseGross * 0.2 + simulationRatio * 45);
  const totalProjected = simulatedHoney + simulatedRoyal + Math.round(baseGross * 0.1);

  return (
    <div className="flex flex-col w-full min-h-screen pb-28 pt-16 bg-[#f4faff]">
      <div className="flex flex-col w-full px-3.5 sm:px-4 py-4 gap-4 max-w-lg mx-auto">
        {/* Header Section with Official Standard Badge */}
        <div className="flex flex-col gap-1.5 mt-1">
          <div className="flex items-center justify-between">
            <h1 className="text-[22px] sm:text-[24px] font-extrabold text-[#0d1e25] tracking-tight">
              AI 수익성 분석 및 경영장부
            </h1>
            <button
              onClick={() => setIsOfficialFormModalOpen(true)}
              className="px-2.5 py-1 bg-[#7e5700]/10 hover:bg-[#7e5700]/20 text-[#7e5700] border border-[#7e5700]/30 rounded-xl text-[11px] font-extrabold flex items-center gap-1 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[15px]">description</span>
              <span>전남도 양식</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-[12px] text-[#514532]">
            <span className="inline-flex items-center gap-0.5 bg-[#1b6d24]/10 text-[#1b6d24] font-bold px-2 py-0.5 rounded-md border border-[#1b6d24]/20">
              <span className="material-symbols-outlined text-[13px]">verified</span>
              <span>전라남도농업기술원 표준 양식 연동</span>
            </span>
            <span className="font-bold text-[#7e5700]">· {effectiveHiveCount}군 관리중</span>
          </div>
        </div>

        {/* Real-time Financial KPI Cards (Updated live from sales and expense entries) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {/* KPI 1: 총 조수입 */}
          <div className="bg-white border border-[#d6c4ac]/60 rounded-2xl p-3 shadow-2xs flex flex-col justify-between">
            <span className="text-[11px] font-bold text-[#514532]">총 조수입 (매출)</span>
            <div className="mt-1">
              <span className="text-[16px] sm:text-[17px] font-black text-[#1b6d24]">
                {Math.round(summary.totalGrossIncome / 10000).toLocaleString()}
              </span>
              <span className="text-[11px] font-bold text-[#514532] ml-0.5">만원</span>
            </div>
            <span className="text-[10px] text-[#514532]/80 mt-0.5">{sales.length}건 판매</span>
          </div>

          {/* KPI 2: 총 경영비 */}
          <div className="bg-white border border-[#d6c4ac]/60 rounded-2xl p-3 shadow-2xs flex flex-col justify-between">
            <span className="text-[11px] font-bold text-[#514532]">총 경영비 (지출)</span>
            <div className="mt-1">
              <span className="text-[16px] sm:text-[17px] font-black text-[#ba1a1a]">
                {Math.round(summary.totalExpenses / 10000).toLocaleString()}
              </span>
              <span className="text-[11px] font-bold text-[#514532] ml-0.5">만원</span>
            </div>
            <span className="text-[10px] text-[#514532]/80 mt-0.5">{expenses.length}건 지출</span>
          </div>

          {/* KPI 3: 순 농가소득 */}
          <div className="bg-[#fffdf7] border-2 border-[#7e5700]/60 rounded-2xl p-3 shadow-2xs flex flex-col justify-between">
            <span className="text-[11px] font-extrabold text-[#7e5700]">순 농가 소득</span>
            <div className="mt-1">
              <span className="text-[16px] sm:text-[17px] font-black text-[#7e5700]">
                {Math.round(summary.netIncome / 10000).toLocaleString()}
              </span>
              <span className="text-[11px] font-bold text-[#7e5700] ml-0.5">만원</span>
            </div>
            <span className="text-[10px] font-bold text-[#1b6d24] mt-0.5">
              소득률 {summary.incomeRate}%
            </span>
          </div>

          {/* KPI 4: 군당 평균 소득 */}
          <div className="bg-[#d9ebf5] border border-[#d4e5ef] rounded-2xl p-3 shadow-2xs flex flex-col justify-between">
            <span className="text-[11px] font-bold text-[#0d1e25]">군당 평균소득</span>
            <div className="mt-1">
              <span className="text-[16px] sm:text-[17px] font-black text-[#0d1e25]">
                {Math.round(summary.incomePerHive / 10000).toLocaleString()}
              </span>
              <span className="text-[11px] font-bold text-[#514532] ml-0.5">만원</span>
            </div>
            <span className="text-[10px] font-bold text-[#7e5700] mt-0.5">{effectiveHiveCount}군 기준</span>
          </div>
        </div>

        {/* 4-Tab Main Navigation Bar */}
        <div className="flex bg-[#e8f1f8] p-1 rounded-2xl border border-[#d6c4ac]/60 gap-1 text-[12px] font-bold">
          <button
            onClick={() => setSubTab('diagnosis')}
            className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-1 transition-all cursor-pointer ${
              subTab === 'diagnosis'
                ? 'bg-[#7e5700] text-white shadow-xs'
                : 'text-[#514532] hover:bg-white/60'
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">insights</span>
            <span>AI 진단</span>
          </button>

          <button
            onClick={() => setSubTab('sales')}
            className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-1 transition-all cursor-pointer ${
              subTab === 'sales'
                ? 'bg-[#1b6d24] text-white shadow-xs'
                : 'text-[#514532] hover:bg-white/60'
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">point_of_sale</span>
            <span>수입({sales.length})</span>
          </button>

          <button
            onClick={() => setSubTab('expenses')}
            className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-1 transition-all cursor-pointer ${
              subTab === 'expenses'
                ? 'bg-[#ba1a1a] text-white shadow-xs'
                : 'text-[#514532] hover:bg-white/60'
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">shopping_cart</span>
            <span>지출({expenses.length})</span>
          </button>

          <button
            onClick={() => setSubTab('official')}
            className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-1 transition-all cursor-pointer ${
              subTab === 'official'
                ? 'bg-[#0d1e25] text-white shadow-xs'
                : 'text-[#514532] hover:bg-white/60'
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">table_view</span>
            <span>경영기록장</span>
          </button>
        </div>

        {/* ============================================================== */}
        {/* SUBTAB 1: AI DIAGNOSIS & SIMULATION */}
        {/* ============================================================== */}
        {subTab === 'diagnosis' && (
          <div className="flex flex-col gap-4">
            {/* AI Insights Card */}
            <div className="relative bg-[#d9ebf5] border border-[#d6c4ac]/60 rounded-2xl p-4 shadow-2xs overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-[#ffb300]/15 rounded-bl-3xl flex items-start justify-end p-2.5">
                <span
                  className="material-symbols-outlined text-[#7e5700] text-[22px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  smart_toy
                </span>
              </div>

              <div className="flex items-center gap-2 mb-2">
                <span
                  className="material-symbols-outlined text-[#1b6d24] text-[20px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  insights
                </span>
                <h2 className="font-bold text-[14px] text-[#0d1e25]">AI 경영 진단 및 분석</h2>
              </div>

              <p className="text-[13.5px] text-[#0d1e25] leading-relaxed">
                현재 전남 구례 봉장의 소득률은{' '}
                <strong className="text-[#1b6d24] bg-[#1b6d24]/10 px-1.5 py-0.5 rounded-md">
                  {summary.incomeRate}% (총소득 {Math.round(summary.netIncome / 10000).toLocaleString()}만원)
                </strong>
                입니다.
                <br />
                직거래 소비자 기반이 탄탄하며,{' '}
                <strong className="text-[#7e5700] bg-[#ffb300]/25 px-1.5 py-0.5 rounded-md">
                  생로열제리 및 봉교(프로폴리스)
                </strong>
                의 마진율이 85% 이상으로 최상위권입니다. 7~8월 로열제리 채취틀 확충을 권장합니다.
              </p>
            </div>

            {/* Product Portfolio (Actual Sales Breakdown) */}
            <div className="bg-white border border-[#d6c4ac]/60 rounded-2xl p-4 shadow-2xs flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="text-[16px] font-bold text-[#0d1e25] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[#7e5700] text-[20px]">
                    bar_chart
                  </span>
                  <span>산물별 실제 매출 기여도</span>
                </h2>
                <span className="text-[11px] text-[#514532]">매출액 순 정렬</span>
              </div>

              <div className="space-y-2.5">
                {productBreakdown.slice(0, 5).map((item, idx) => (
                  <div
                    key={item.item}
                    className="p-3 bg-[#fcfdf9] border border-[#d6c4ac]/60 rounded-xl flex flex-col gap-1.5"
                  >
                    <div className="flex justify-between items-center text-[13px]">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#7e5700]/10 text-[#7e5700] font-bold text-[11px] flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="font-bold text-[#0d1e25]">{item.item}</span>
                        <span className="text-[11px] text-[#514532]">
                          ({item.totalQuantity} {item.unit})
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-extrabold text-[#1b6d24]">
                          {item.totalAmount.toLocaleString()} 원
                        </span>
                        <span className="text-[11px] text-[#7e5700] font-bold ml-1.5">
                          {item.percent}%
                        </span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="h-2 w-full bg-[#d4e5ef] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          idx === 0 ? 'bg-[#7e5700]' : idx === 1 ? 'bg-[#1b6d24]' : 'bg-[#e59819]'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(5, item.percent))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Operating Expense Breakdown */}
            <div className="bg-white border border-[#d6c4ac]/60 rounded-2xl p-4 shadow-2xs flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="text-[16px] font-bold text-[#0d1e25] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[#ba1a1a] text-[20px]">
                    pie_chart
                  </span>
                  <span>비목별 경영비용 구성</span>
                </h2>
                <span className="text-[11px] text-[#ba1a1a] font-bold">
                  총 {summary.totalExpenses.toLocaleString()} 원
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {expenseBreakdown.map((exp) => (
                  <div
                    key={exp.category}
                    className="p-2.5 bg-[#fdf8f8] border border-[#d6c4ac]/50 rounded-xl flex flex-col justify-between"
                  >
                    <span className="text-[12px] font-bold text-[#0d1e25]">{exp.category}</span>
                    <div className="mt-1 flex justify-between items-baseline">
                      <span className="text-[13px] font-black text-[#ba1a1a]">
                        {Math.round(exp.totalAmount / 10000).toLocaleString()}만원
                      </span>
                      <span className="text-[11px] font-bold text-[#514532]">{exp.percent}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Dynamic AI Allocation Optimizer Simulator */}
            <div className="bg-[#dff1fb] border border-[#d6c4ac]/60 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-bold text-[#0d1e25] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[#7e5700] text-[18px]">
                    tune
                  </span>
                  <span>AI 생산 배분 시뮬레이터</span>
                </span>
                <span className="text-[12px] font-extrabold text-[#1b6d24] bg-white px-2 py-0.5 rounded-full border border-[#1b6d24]/20">
                  예상 연수익: 약 {totalProjected.toLocaleString()} 만원
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[12px] text-[#514532]">
                  <span>로열제리 채취 군수 비중:</span>
                  <span className="font-bold text-[#7e5700]">{simulationRatio}% (약 18군)</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="60"
                  value={simulationRatio}
                  onChange={(e) => setSimulationRatio(Number(e.target.value))}
                  className="w-full accent-[#7e5700] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-[#514532]/70">
                  <span>꿀 집중 (10%)</span>
                  <span>권장 최적점 (35%)</span>
                  <span>로열제리 집중 (60%)</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => setIsOfficialFormModalOpen(true)}
                className="h-13 bg-[#1b6d24] hover:bg-[#13531b] text-white font-bold text-[14px] rounded-2xl shadow-sm flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[19px]">policy</span>
                <span>전남도 표준 서식</span>
              </button>

              <button
                onClick={onOpenReportModal}
                className="h-13 bg-[#7e5700] hover:bg-[#604100] text-white font-bold text-[14px] rounded-2xl shadow-sm flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[19px]">download</span>
                <span>AI 종합 리포트</span>
              </button>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* SUBTAB 2: SALES RECORDS (수입·판매 장부) */}
        {/* ============================================================== */}
        {subTab === 'sales' && (
          <div className="flex flex-col gap-3">
            {/* Action Bar: Register Sale & Export */}
            <div className="flex justify-between items-center gap-2">
              <button
                onClick={() => {
                  setEditingSale(null);
                  setIsSaleModalOpen(true);
                }}
                className="flex-1 h-12 bg-[#1b6d24] hover:bg-[#13531b] text-white font-extrabold rounded-2xl text-[13px] shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">add_circle</span>
                <span>+ 새 판매내역 등록</span>
              </button>

              <button
                onClick={() => exportToJeonnamCsv(sales, expenses, summary, farmInfo)}
                className="h-12 px-3.5 bg-white border border-[#d6c4ac] text-[#0d1e25] font-bold rounded-2xl text-[12px] flex items-center gap-1 shadow-2xs hover:bg-[#d9ebf5] cursor-pointer"
                title="전라남도농업기술원 표준 엑셀(CSV) 다운로드"
              >
                <span className="material-symbols-outlined text-[17px] text-[#1b6d24]">
                  file_download
                </span>
                <span>엑셀 저장</span>
              </button>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex gap-2">
              <select
                value={selectedMonthFilter}
                onChange={(e) => setSelectedMonthFilter(e.target.value)}
                className="h-10 px-2.5 bg-white border border-[#d6c4ac] rounded-xl text-[12px] font-bold text-[#0d1e25] focus:outline-none"
              >
                <option value="all">전체 월</option>
                {allMonths.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>

              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="품목, 구매자, 거래처 검색..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="w-full h-10 pl-8 pr-3 bg-white border border-[#d6c4ac] rounded-xl text-[12px] text-[#0d1e25] focus:outline-none"
                />
                <span className="material-symbols-outlined absolute left-2.5 top-2.5 text-[16px] text-[#514532]">
                  search
                </span>
              </div>
            </div>

            {/* Sales List */}
            <div className="space-y-2.5">
              {filteredSales.length === 0 ? (
                <div className="bg-white border border-[#d6c4ac]/60 rounded-2xl p-8 text-center text-[#514532]">
                  <span className="material-symbols-outlined text-[32px] text-[#514532]/60 mb-1">
                    receipt_long
                  </span>
                  <p className="text-[13px] font-bold">등록된 판매 내역이 없습니다.</p>
                  <p className="text-[11px] mt-1 text-[#514532]/80">
                    상단의 '+ 새 판매내역 등록' 버튼을 눌러 첫 판매를 기록해보세요.
                  </p>
                </div>
              ) : (
                filteredSales.map((s) => (
                  <div
                    key={s.id}
                    className="bg-white border border-[#d6c4ac]/70 rounded-2xl p-3.5 shadow-2xs flex flex-col gap-2 hover:border-[#1b6d24] transition-all"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-bold text-[#514532] bg-[#f0f5fa] px-2 py-0.5 rounded-md">
                            {s.date}
                          </span>
                          <span className="text-[11px] font-extrabold text-[#1b6d24] bg-[#1b6d24]/10 px-2 py-0.5 rounded-md">
                            {s.item}
                          </span>
                        </div>
                        <h3 className="font-bold text-[14px] text-[#0d1e25] mt-1">
                          {s.customItemName || s.item}
                        </h3>
                      </div>

                      <div className="text-right">
                        <div className="text-[16px] font-black text-[#1b6d24]">
                          {s.totalAmount.toLocaleString()} 원
                        </div>
                        <span className="text-[10px] text-[#514532]">
                          ({s.unitPrice.toLocaleString()}원 × {s.quantity} {s.unit})
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between pt-1.5 border-t border-[#f0f5fa] text-[11px] text-[#514532]">
                      <div className="flex items-center gap-2">
                        <span>경로: {s.channel}</span>
                        {s.buyerName && <span>· 고객: {s.buyerName}</span>}
                        <span>· {s.paymentMethod}</span>
                      </div>

                      <div className="flex items-center gap-1 mt-1 sm:mt-0">
                        <button
                          onClick={() => {
                            setEditingSale(s);
                            setIsSaleModalOpen(true);
                          }}
                          className="px-2 py-1 text-[11px] font-bold text-[#7e5700] hover:bg-[#ffb300]/15 rounded-md cursor-pointer"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => handleDeleteSale(s.id)}
                          className="px-2 py-1 text-[11px] font-bold text-[#ba1a1a] hover:bg-[#ba1a1a]/10 rounded-md cursor-pointer"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* SUBTAB 3: EXPENSE RECORDS (비용·경영비 장부) */}
        {/* ============================================================== */}
        {subTab === 'expenses' && (
          <div className="flex flex-col gap-3">
            {/* Action Bar: Register Expense & Export */}
            <div className="flex justify-between items-center gap-2">
              <button
                onClick={() => {
                  setEditingExpense(null);
                  setIsExpenseModalOpen(true);
                }}
                className="flex-1 h-12 bg-[#ba1a1a] hover:bg-[#93000a] text-white font-extrabold rounded-2xl text-[13px] shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">add_circle</span>
                <span>+ 새 비용내역 등록</span>
              </button>

              <button
                onClick={() => exportToJeonnamCsv(sales, expenses, summary, farmInfo)}
                className="h-12 px-3.5 bg-white border border-[#d6c4ac] text-[#0d1e25] font-bold rounded-2xl text-[12px] flex items-center gap-1 shadow-2xs hover:bg-[#d9ebf5] cursor-pointer"
                title="전라남도농업기술원 표준 엑셀(CSV) 다운로드"
              >
                <span className="material-symbols-outlined text-[17px] text-[#ba1a1a]">
                  file_download
                </span>
                <span>엑셀 저장</span>
              </button>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex gap-2">
              <select
                value={selectedMonthFilter}
                onChange={(e) => setSelectedMonthFilter(e.target.value)}
                className="h-10 px-2.5 bg-white border border-[#d6c4ac] rounded-xl text-[12px] font-bold text-[#0d1e25] focus:outline-none"
              >
                <option value="all">전체 월</option>
                {allMonths.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>

              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="비목, 품명, 구입처 검색..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="w-full h-10 pl-8 pr-3 bg-white border border-[#d6c4ac] rounded-xl text-[12px] text-[#0d1e25] focus:outline-none"
                />
                <span className="material-symbols-outlined absolute left-2.5 top-2.5 text-[16px] text-[#514532]">
                  search
                </span>
              </div>
            </div>

            {/* Expense List */}
            <div className="space-y-2.5">
              {filteredExpenses.length === 0 ? (
                <div className="bg-white border border-[#d6c4ac]/60 rounded-2xl p-8 text-center text-[#514532]">
                  <span className="material-symbols-outlined text-[32px] text-[#514532]/60 mb-1">
                    shopping_cart
                  </span>
                  <p className="text-[13px] font-bold">등록된 비용 지출 내역이 없습니다.</p>
                  <p className="text-[11px] mt-1 text-[#514532]/80">
                    상단의 '+ 새 비용내역 등록' 버튼을 눌러 경영비를 입력하세요.
                  </p>
                </div>
              ) : (
                filteredExpenses.map((e) => (
                  <div
                    key={e.id}
                    className="bg-white border border-[#d6c4ac]/70 rounded-2xl p-3.5 shadow-2xs flex flex-col gap-2 hover:border-[#ba1a1a] transition-all"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-bold text-[#514532] bg-[#f0f5fa] px-2 py-0.5 rounded-md">
                            {e.date}
                          </span>
                          <span className="text-[11px] font-extrabold text-[#ba1a1a] bg-[#ba1a1a]/10 px-2 py-0.5 rounded-md">
                            {e.category}
                          </span>
                        </div>
                        <h3 className="font-bold text-[14px] text-[#0d1e25] mt-1">{e.itemName}</h3>
                      </div>

                      <div className="text-right">
                        <div className="text-[16px] font-black text-[#ba1a1a]">
                          {e.totalAmount.toLocaleString()} 원
                        </div>
                        <span className="text-[10px] text-[#514532]">
                          ({e.unitPrice.toLocaleString()}원 × {e.quantity} {e.unit})
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between pt-1.5 border-t border-[#f0f5fa] text-[11px] text-[#514532]">
                      <div className="flex items-center gap-2">
                        <span>구입처: {e.vendor}</span>
                        <span>· {e.paymentMethod}</span>
                        {e.notes && <span>· {e.notes}</span>}
                      </div>

                      <div className="flex items-center gap-1 mt-1 sm:mt-0">
                        <button
                          onClick={() => {
                            setEditingExpense(e);
                            setIsExpenseModalOpen(true);
                          }}
                          className="px-2 py-1 text-[11px] font-bold text-[#7e5700] hover:bg-[#ffb300]/15 rounded-md cursor-pointer"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => handleDeleteExpense(e.id)}
                          className="px-2 py-1 text-[11px] font-bold text-[#ba1a1a] hover:bg-[#ba1a1a]/10 rounded-md cursor-pointer"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* SUBTAB 4: OFFICIAL FORM VIEW & MONTHLY SETTLEMENT */}
        {/* ============================================================== */}
        {subTab === 'official' && (
          <div className="flex flex-col gap-3">
            <div className="bg-[#fcfdf9] border-2 border-[#b09e86] rounded-2xl p-4 shadow-sm text-[#111]">
              <div className="flex justify-between items-center border-b border-[#ccc] pb-2 mb-3">
                <div>
                  <span className="text-[10px] text-[#555] font-bold block">
                    서식 제2025-전남양봉-04호
                  </span>
                  <h3 className="text-[16px] font-black text-[#0d1e25]">
                    전라남도농업기술원 양봉경영기록장
                  </h3>
                </div>
                <button
                  onClick={() => setIsOfficialFormModalOpen(true)}
                  className="px-3 py-1.5 bg-[#7e5700] text-white rounded-xl text-[11px] font-bold flex items-center gap-1 shadow-2xs cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[15px]">fullscreen</span>
                  <span>전체 서식 보기</span>
                </button>
              </div>

              {/* Monthly Settlement Mini Table */}
              <h4 className="text-[13px] font-bold text-[#0d1e25] mb-2 flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-[#7e5700]">
                  calendar_month
                </span>
                <span>2025년도 월별 수입·지출 결산표</span>
              </h4>

              <div className="overflow-x-auto">
                <table className="w-full text-[11px] border-collapse border border-[#ccc] text-center">
                  <thead className="bg-[#f0ece1] font-bold text-[#111]">
                    <tr>
                      <th className="border border-[#ccc] py-1.5">월별</th>
                      <th className="border border-[#ccc] py-1.5">수입(원)</th>
                      <th className="border border-[#ccc] py-1.5">지출(원)</th>
                      <th className="border border-[#ccc] py-1.5">순소득(원)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlySummary.map((m) => (
                      <tr key={m.month} className="hover:bg-[#f9f7f2]">
                        <td className="border border-[#ccc] py-1.5 font-bold">{m.monthLabel}</td>
                        <td className="border border-[#ccc] py-1.5 text-[#1b6d24] font-semibold text-right pr-2">
                          {m.grossIncome.toLocaleString()}
                        </td>
                        <td className="border border-[#ccc] py-1.5 text-[#ba1a1a] font-semibold text-right pr-2">
                          {m.expenses.toLocaleString()}
                        </td>
                        <td className="border border-[#ccc] py-1.5 text-[#7e5700] font-bold text-right pr-2">
                          {m.netIncome.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-[#f0ece1] font-bold">
                      <td className="border border-[#ccc] py-1.5">연간 합계</td>
                      <td className="border border-[#ccc] py-1.5 text-[#1b6d24] text-right pr-2">
                        {summary.totalGrossIncome.toLocaleString()}
                      </td>
                      <td className="border border-[#ccc] py-1.5 text-[#ba1a1a] text-right pr-2">
                        {summary.totalExpenses.toLocaleString()}
                      </td>
                      <td className="border border-[#ccc] py-1.5 text-[#7e5700] font-black text-right pr-2">
                        {summary.netIncome.toLocaleString()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Export & Submit Info */}
              <div className="mt-4 pt-3 border-t border-[#ccc] flex justify-between items-center">
                <span className="text-[11px] text-[#666]">
                  전남 양봉 TOP 경영모델 표준 데이터 규격 준수
                </span>
                <button
                  onClick={() => exportToJeonnamCsv(sales, expenses, summary, farmInfo)}
                  className="px-3 py-1.5 bg-[#1b6d24] text-white rounded-xl text-[11px] font-bold flex items-center gap-1 shadow-2xs cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[15px]">file_download</span>
                  <span>표준 CSV 다운로드</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sale Modal */}
      <SaleRecordModal
        isOpen={isSaleModalOpen}
        onClose={() => {
          setIsSaleModalOpen(false);
          setEditingSale(null);
        }}
        onSave={handleSaveSale}
        initialRecord={editingSale}
      />

      {/* Expense Modal */}
      <ExpenseRecordModal
        isOpen={isExpenseModalOpen}
        onClose={() => {
          setIsExpenseModalOpen(false);
          setEditingExpense(null);
        }}
        onSave={handleSaveExpense}
        initialRecord={editingExpense}
      />

      {/* Jeonnam Official Form Modal */}
      <JeonnamOfficialFormModal
        isOpen={isOfficialFormModalOpen}
        onClose={() => setIsOfficialFormModalOpen(false)}
        sales={sales}
        expenses={expenses}
        summary={summary}
        farmInfo={farmInfo}
      />
    </div>
  );
};
