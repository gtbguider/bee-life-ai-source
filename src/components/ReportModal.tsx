import React from 'react';
import { LOGO_URL } from '../data/mockData';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-5 max-w-md w-full shadow-2xl border-2 border-[#7e5700] max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-start border-b border-[#d4e5ef] pb-3 mb-3">
          <div className="flex items-center gap-2">
            <img src={LOGO_URL} alt="Honeybee Teco" className="h-6 w-auto" />
            <div>
              <h3 className="font-extrabold text-[17px] text-[#0d1e25]">
                AI 양봉 수익 최적화 종합 리포트
              </h3>
              <p className="text-[11px] text-[#514532]">
                2025년 상반기 결산 및 하반기 권장 전략
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#514532] hover:bg-[#d9ebf5]"
          >
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </div>

        {/* Executive Summary */}
        <div className="space-y-3 text-[13px] text-[#0d1e25] mb-4">
          <div className="bg-[#d9ebf5] p-3.5 rounded-2xl border border-[#d6c4ac]/60">
            <h4 className="font-bold text-[#7e5700] text-[14px] mb-1.5 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px]">auto_graph</span>
              <span>AI 수익 최적화 핵심 요약</span>
            </h4>
            <p className="leading-relaxed text-[#0d1e25]">
              지리산 1호 봉장의 50개 벌통 빅데이터 분석 결과, <strong>생로열제리</strong>{' '}
              생산 비중을 기존 15%에서 <strong>35%로 확대</strong>할 경우 봉군 스트레스
              없이 총 연매출 <strong>+24.8% (약 920만원 추가 순익)</strong> 상승이
              예측됩니다.
            </p>
          </div>

          {/* Revenue Breakdown */}
          <div className="border border-[#d6c4ac] rounded-2xl p-3.5 space-y-2">
            <h5 className="font-bold text-[#0d1e25] text-[13px]">
              산물별 예상 기여 수익 (50군 기준)
            </h5>
            <div className="space-y-1.5 text-[12px]">
              <div className="flex justify-between py-1 border-b border-[#d4e5ef]">
                <span className="text-[#514532]">1. 프리미엄 천연숙성꿀</span>
                <span className="font-bold text-[#7e5700]">3,240 만원 (68%)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#d4e5ef]">
                <span className="text-[#514532]">2. 생로열제리 (권장 확대)</span>
                <span className="font-bold text-[#1b6d24]">1,180 만원 (24%)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#d4e5ef]">
                <span className="text-[#514532]">3. F2 우량 교미 여왕벌 분양</span>
                <span className="font-bold text-[#8f4e00]">280 만원 (5%)</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#514532]">4. 친환경 정제 밀납</span>
                <span className="font-bold text-[#514532]">120 만원 (3%)</span>
              </div>
            </div>
          </div>

          {/* Actionable Strategy */}
          <div className="bg-[#f4faff] border border-[#d4e5ef] rounded-2xl p-3.5 space-y-1.5 text-[12px]">
            <h5 className="font-bold text-[#0d1e25]">하반기 권장 작업 로드맵</h5>
            <ul className="list-disc list-inside space-y-1 text-[#514532]">
              <li><strong>6월 중순~7월</strong>: 12~25번 벌통 중심 로열제리 집중 채취</li>
              <li><strong>8월</strong>: 가을철 신왕 이충 및 F3 세대 교미상 20군 추가 조성</li>
              <li><strong>9월~10월</strong>: 월동 먹이(숙성꿀 저밀) 집중 급이 및 응애 방제</li>
            </ul>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => {
              alert('상세 PDF 리포트가 생성 및 다운로드되었습니다.');
              onClose();
            }}
            className="flex-1 py-3 bg-[#7e5700] hover:bg-[#604100] text-white font-bold rounded-xl text-[13px] shadow-xs flex items-center justify-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            <span>PDF 리포트 저장</span>
          </button>
          <button
            onClick={onClose}
            className="px-5 py-3 bg-white border border-[#d6c4ac] text-[#0d1e25] font-bold rounded-xl text-[13px] hover:bg-[#d9ebf5]"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
