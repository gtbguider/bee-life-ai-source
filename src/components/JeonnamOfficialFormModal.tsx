import React, { useState } from 'react';
import {
  BeekeepingSalesRecord,
  BeekeepingExpenseRecord,
  BeekeepingLedgerSummary
} from '../types';
import { exportToJeonnamCsv } from '../services/beekeepingLedgerService';

interface JeonnamOfficialFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  sales: BeekeepingSalesRecord[];
  expenses: BeekeepingExpenseRecord[];
  summary: BeekeepingLedgerSummary;
  farmInfo: {
    beekeeper: string;
    location: string;
    apiaryName: string;
    hiveCount: number;
  };
}

export const JeonnamOfficialFormModal: React.FC<JeonnamOfficialFormModalProps> = ({
  isOpen,
  onClose,
  sales,
  expenses,
  summary,
  farmInfo
}) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'sales' | 'expenses'>('summary');

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleExportCsv = () => {
    exportToJeonnamCsv(sales, expenses, summary, farmInfo);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white">
      <div className="bg-[#fcfdf9] rounded-3xl p-4 sm:p-7 max-w-4xl w-full shadow-2xl border-2 border-[#7e5700] my-auto max-h-[94vh] flex flex-col animate-in fade-in zoom-in duration-150 print:max-h-none print:shadow-none print:border-none print:m-0 print:p-2">
        {/* Modal Top Controls (Hidden on print) */}
        <div className="flex justify-between items-center border-b border-[#d6c4ac] pb-3 mb-3 shrink-0 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#7e5700] text-white flex items-center justify-center font-black shadow-xs">
              <span className="material-symbols-outlined text-[22px]">policy</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-[16px] sm:text-[18px] text-[#0d1e25]">
                  전라남도농업기술원 표준 양봉경영기록장
                </h3>
                <span className="bg-[#1b6d24]/10 text-[#1b6d24] text-[10px] font-extrabold px-2 py-0.5 rounded-md border border-[#1b6d24]/20">
                  표준 서식 연동형
                </span>
              </div>
              <p className="text-[11px] text-[#514532]">
                서식 제2025-전남양봉-04호 (전남도 양봉 TOP 경영모델 표준 규격)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="px-3 py-2 bg-[#1b6d24] hover:bg-[#13531b] text-white font-bold rounded-xl text-[12px] flex items-center gap-1 shadow-xs cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">file_download</span>
              <span className="hidden xs:inline">엑셀(CSV) 저장</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-2 bg-[#7e5700] hover:bg-[#604100] text-white font-bold rounded-xl text-[12px] flex items-center gap-1 shadow-xs cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">print</span>
              <span className="hidden xs:inline">서식 인쇄</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#514532] hover:bg-[#d9ebf5] transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[22px]">close</span>
            </button>
          </div>
        </div>

        {/* View Switcher Tabs (Hidden on print) */}
        <div className="flex gap-1.5 mb-3 bg-[#f0f5fa] p-1.5 rounded-2xl border border-[#d6c4ac]/60 shrink-0 print:hidden">
          <button
            onClick={() => setActiveTab('summary')}
            className={`flex-1 py-1.5 rounded-xl text-[12px] font-extrabold transition-all cursor-pointer ${
              activeTab === 'summary'
                ? 'bg-[#7e5700] text-white shadow-xs'
                : 'text-[#514532] hover:bg-white'
            }`}
          >
            1. 경영성과 총괄 집계표
          </button>
          <button
            onClick={() => setActiveTab('sales')}
            className={`flex-1 py-1.5 rounded-xl text-[12px] font-extrabold transition-all cursor-pointer ${
              activeTab === 'sales'
                ? 'bg-[#1b6d24] text-white shadow-xs'
                : 'text-[#514532] hover:bg-white'
            }`}
          >
            2. 수입 및 판매 원장 ({sales.length}건)
          </button>
          <button
            onClick={() => setActiveTab('expenses')}
            className={`flex-1 py-1.5 rounded-xl text-[12px] font-extrabold transition-all cursor-pointer ${
              activeTab === 'expenses'
                ? 'bg-[#ba1a1a] text-white shadow-xs'
                : 'text-[#514532] hover:bg-white'
            }`}
          >
            3. 경영비 및 지출 원장 ({expenses.length}건)
          </button>
        </div>

        {/* Printable Document Body */}
        <div className="flex-1 overflow-y-auto pr-1 text-[#111] font-sans">
          <div className="bg-white border-2 border-[#111] p-4 sm:p-6 shadow-sm rounded-lg relative">
            {/* Watermark in background */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-[0.03] select-none text-center">
              <span className="text-[120px] font-black text-[#1b6d24] block">전남양봉</span>
              <span className="text-[60px] font-black text-[#7e5700]">경영기록</span>
            </div>

            {/* Document Official Header */}
            <div className="border-b-2 border-[#111] pb-3 mb-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] text-[#555] font-bold tracking-widest block">
                    [별지 제2호 서식] (2025. 1. 개정)
                  </span>
                  <h1 className="text-[20px] sm:text-[23px] font-black text-[#111] tracking-tight mt-0.5">
                    전라남도농업기술원 양봉 경영기록장
                  </h1>
                </div>
                <div className="border border-[#111] text-center px-3 py-1.5 text-[11px] font-bold">
                  <div>전라남도농업기술원</div>
                  <div className="text-[9px] text-[#666]">기술보급과 검인</div>
                </div>
              </div>

              {/* Farm Information Meta Table */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-2 gap-y-1 mt-3 pt-2 border-t border-[#ccc] text-[12px]">
                <div>
                  <span className="text-[#666] font-medium">경영체명: </span>
                  <span className="font-bold">{farmInfo.apiaryName}</span>
                </div>
                <div>
                  <span className="text-[#666] font-medium">대표자: </span>
                  <span className="font-bold">{farmInfo.beekeeper}</span>
                </div>
                <div>
                  <span className="text-[#666] font-medium">사육군수: </span>
                  <span className="font-bold text-[#7e5700]">{farmInfo.hiveCount} 군</span>
                </div>
                <div>
                  <span className="text-[#666] font-medium">기록연도: </span>
                  <span className="font-bold">2025년도</span>
                </div>
                <div className="col-span-2 sm:col-span-4 mt-0.5">
                  <span className="text-[#666] font-medium">봉장 소재지: </span>
                  <span className="font-bold">{farmInfo.location}</span>
                </div>
              </div>
            </div>

            {/* TAB 1: SUMMARY & PERFORMANCE */}
            {(activeTab === 'summary' || window.matchMedia?.('print').matches) && (
              <div className="space-y-4 mb-6">
                <div>
                  <h4 className="text-[14px] font-black text-[#111] border-l-4 border-[#7e5700] pl-2 mb-2">
                    1. 2025년도 양봉 경영성과 총괄표
                  </h4>
                  <table className="w-full text-[12px] border-collapse border border-[#111] text-center">
                    <thead className="bg-[#f0ece1] font-bold text-[#111]">
                      <tr>
                        <th className="border border-[#111] py-1.5">구분</th>
                        <th className="border border-[#111] py-1.5">총 조수입 (A)</th>
                        <th className="border border-[#111] py-1.5">총 경영비 (B)</th>
                        <th className="border border-[#111] py-1.5">농가소득 (A-B)</th>
                        <th className="border border-[#111] py-1.5">소득률 (%)</th>
                        <th className="border border-[#111] py-1.5">군당 소득 (50군)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="font-bold bg-[#fffdf7]">
                        <td className="border border-[#111] py-2 bg-[#f9f7f2]">연간 합계</td>
                        <td className="border border-[#111] py-2 text-[#1b6d24]">
                          {summary.totalGrossIncome.toLocaleString()} 원
                        </td>
                        <td className="border border-[#111] py-2 text-[#ba1a1a]">
                          {summary.totalExpenses.toLocaleString()} 원
                        </td>
                        <td className="border border-[#111] py-2 text-[#7e5700] font-black">
                          {summary.netIncome.toLocaleString()} 원
                        </td>
                        <td className="border border-[#111] py-2 font-black">
                          {summary.incomeRate}%
                        </td>
                        <td className="border border-[#111] py-2">
                          {summary.incomePerHive.toLocaleString()} 원
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Jeonnam TOP Model Benchmark Comparison */}
                <div className="bg-[#f4faff] border border-[#b2d8d8] p-3 rounded-md text-[12px]">
                  <div className="font-bold text-[#0d1e25] mb-1 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[#1b6d24] text-[16px]">
                      verified
                    </span>
                    <span>전라남도농업기술원 양봉 TOP 경영모델 벤치마크 진단</span>
                  </div>
                  <p className="text-[#333] leading-relaxed">
                    본 봉장의 소득률은 <strong>{summary.incomeRate}%</strong>로, 전남 평균 양봉농가
                    소득률(64.2%) 대비{' '}
                    <strong className="text-[#1b6d24]">
                      +{Math.round((summary.incomeRate - 64.2) * 10) / 10}%p 우수
                    </strong>
                    한 고수익 경영 구조를 유지하고 있습니다. 생로열제리 및 프로폴리스 직거래 비중이 높아
                    경영비 대비 부가가치가 탁월합니다.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 2: SALES RECORDS (수입원장) */}
            {(activeTab === 'sales' || window.matchMedia?.('print').matches) && (
              <div className="space-y-2 mb-6">
                <div className="flex justify-between items-center mb-1">
                  <h4 className="text-[14px] font-black text-[#111] border-l-4 border-[#1b6d24] pl-2">
                    2. 양봉 산물 수입 및 판매 기록부
                  </h4>
                  <span className="text-[11px] font-bold text-[#1b6d24]">
                    수입 합계: {summary.totalGrossIncome.toLocaleString()} 원
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-[11px] border-collapse border border-[#111] text-left">
                    <thead className="bg-[#eaf5eb] font-bold text-[#111] text-center">
                      <tr>
                        <th className="border border-[#111] py-1.5 px-1 w-16">일자</th>
                        <th className="border border-[#111] py-1.5 px-1">품목</th>
                        <th className="border border-[#111] py-1.5 px-1">상세 품명</th>
                        <th className="border border-[#111] py-1.5 px-1 w-16">규격</th>
                        <th className="border border-[#111] py-1.5 px-1 w-12 text-right">수량</th>
                        <th className="border border-[#111] py-1.5 px-1 w-18 text-right">단가(원)</th>
                        <th className="border border-[#111] py-1.5 px-1 w-22 text-right">금액(원)</th>
                        <th className="border border-[#111] py-1.5 px-1">판매경로</th>
                        <th className="border border-[#111] py-1.5 px-1">거래처/고객</th>
                        <th className="border border-[#111] py-1.5 px-1 w-14 text-center">결제</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sales.map((s, idx) => (
                        <tr key={s.id || idx} className={idx % 2 === 1 ? 'bg-[#fcfdfa]' : 'bg-white'}>
                          <td className="border border-[#111] py-1 px-1 text-center">{s.date.slice(5)}</td>
                          <td className="border border-[#111] py-1 px-1 font-bold">{s.item}</td>
                          <td className="border border-[#111] py-1 px-1 text-[#333]">
                            {s.customItemName || s.item}
                          </td>
                          <td className="border border-[#111] py-1 px-1 text-center">{s.unit}</td>
                          <td className="border border-[#111] py-1 px-1 text-right font-semibold">
                            {s.quantity}
                          </td>
                          <td className="border border-[#111] py-1 px-1 text-right">
                            {s.unitPrice.toLocaleString()}
                          </td>
                          <td className="border border-[#111] py-1 px-1 text-right font-bold text-[#1b6d24]">
                            {s.totalAmount.toLocaleString()}
                          </td>
                          <td className="border border-[#111] py-1 px-1 text-[10px]">{s.channel}</td>
                          <td className="border border-[#111] py-1 px-1 text-[10px]">{s.buyerName || '-'}</td>
                          <td className="border border-[#111] py-1 px-1 text-center text-[10px]">
                            {s.paymentMethod}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-[#f0ece1] font-bold">
                        <td colSpan={6} className="border border-[#111] py-1.5 px-2 text-center">
                          수입 소계 ({sales.length}건)
                        </td>
                        <td className="border border-[#111] py-1.5 px-1 text-right text-[#1b6d24] font-black">
                          {summary.totalGrossIncome.toLocaleString()}
                        </td>
                        <td colSpan={3} className="border border-[#111]" />
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 3: EXPENSE RECORDS (지출원장) */}
            {(activeTab === 'expenses' || window.matchMedia?.('print').matches) && (
              <div className="space-y-2 mb-4">
                <div className="flex justify-between items-center mb-1">
                  <h4 className="text-[14px] font-black text-[#111] border-l-4 border-[#ba1a1a] pl-2">
                    3. 양봉 경영비 및 지출 기록부
                  </h4>
                  <span className="text-[11px] font-bold text-[#ba1a1a]">
                    경영비 합계: {summary.totalExpenses.toLocaleString()} 원
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-[11px] border-collapse border border-[#111] text-left">
                    <thead className="bg-[#fbeeed] font-bold text-[#111] text-center">
                      <tr>
                        <th className="border border-[#111] py-1.5 px-1 w-16">일자</th>
                        <th className="border border-[#111] py-1.5 px-1 w-24">비목구분</th>
                        <th className="border border-[#111] py-1.5 px-1">품명 및 세부내용</th>
                        <th className="border border-[#111] py-1.5 px-1 w-14 text-center">규격</th>
                        <th className="border border-[#111] py-1.5 px-1 w-12 text-right">수량</th>
                        <th className="border border-[#111] py-1.5 px-1 w-18 text-right">단가(원)</th>
                        <th className="border border-[#111] py-1.5 px-1 w-22 text-right">금액(원)</th>
                        <th className="border border-[#111] py-1.5 px-1">구입처(상호)</th>
                        <th className="border border-[#111] py-1.5 px-1 w-14 text-center">결제</th>
                        <th className="border border-[#111] py-1.5 px-1">비고</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenses.map((e, idx) => (
                        <tr key={e.id || idx} className={idx % 2 === 1 ? 'bg-[#fdf8f8]' : 'bg-white'}>
                          <td className="border border-[#111] py-1 px-1 text-center">{e.date.slice(5)}</td>
                          <td className="border border-[#111] py-1 px-1 font-bold text-[#0d1e25]">
                            {e.category}
                          </td>
                          <td className="border border-[#111] py-1 px-1 text-[#333]">{e.itemName}</td>
                          <td className="border border-[#111] py-1 px-1 text-center">{e.unit}</td>
                          <td className="border border-[#111] py-1 px-1 text-right font-semibold">
                            {e.quantity}
                          </td>
                          <td className="border border-[#111] py-1 px-1 text-right">
                            {e.unitPrice.toLocaleString()}
                          </td>
                          <td className="border border-[#111] py-1 px-1 text-right font-bold text-[#ba1a1a]">
                            {e.totalAmount.toLocaleString()}
                          </td>
                          <td className="border border-[#111] py-1 px-1 text-[10px]">{e.vendor}</td>
                          <td className="border border-[#111] py-1 px-1 text-center text-[10px]">
                            {e.paymentMethod}
                          </td>
                          <td className="border border-[#111] py-1 px-1 text-[10px] text-[#666]">
                            {e.notes || '-'}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-[#f0ece1] font-bold">
                        <td colSpan={6} className="border border-[#111] py-1.5 px-2 text-center">
                          지출 소계 ({expenses.length}건)
                        </td>
                        <td className="border border-[#111] py-1.5 px-1 text-right text-[#ba1a1a] font-black">
                          {summary.totalExpenses.toLocaleString()}
                        </td>
                        <td colSpan={3} className="border border-[#111]" />
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Verification Footer (Formal Korean Document layout) */}
            <div className="mt-6 pt-3 border-t-2 border-[#111] flex flex-col sm:flex-row justify-between items-center text-[11px] text-[#555] gap-2">
              <div>
                <p>위 경영기록은 농업경영체 실거래 사실에 근거하여 성실히 작성되었음을 확인합니다.</p>
                <p className="text-[10px] text-[#888]">작성자: {farmInfo.beekeeper} (인) · 관할: 구례군농업기술센터</p>
              </div>
              <div className="text-right font-bold text-[#111]">
                전라남도농업기술원장 귀하
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
