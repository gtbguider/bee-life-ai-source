import React, { useState, useEffect } from 'react';
import { HoneyLot } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { loadHoneyLotsFromFirestore } from '../services/firestoreService';

interface AnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  lot?: HoneyLot | null;
}

const STORAGE_KEY = 'honeybee_honey_lots_v1';

function getLotsStorageKey(uid?: string): string {
  return uid ? `${STORAGE_KEY}_${uid}` : STORAGE_KEY;
}

export const AnalysisModal: React.FC<AnalysisModalProps> = ({ isOpen, onClose, lot }) => {
  const { user } = useAuth();
  const [lots, setLots] = useState<HoneyLot[]>([]);
  const [selectedLotId, setSelectedLotId] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;
    if (lot) {
      setLots([lot]);
      setSelectedLotId(lot.id);
      return;
    }

    let isMounted = true;
    const fetchLots = async () => {
      setIsLoading(true);
      try {
        let loaded: HoneyLot[] = [];
        if (user?.uid) {
          loaded = await loadHoneyLotsFromFirestore(user.uid);
        } else {
          try {
            const raw = localStorage.getItem(getLotsStorageKey(undefined));
            if (raw) {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed)) loaded = parsed;
            }
          } catch {
            // ignore
          }
        }
        if (isMounted) {
          setLots(loaded);
          const withReport =
            loaded.find((l) => l.lotNumber === '2026-AC-20260528-01' && l.inspectionReportUrl) ||
            loaded.find((l) => Boolean(l.inspectionReportUrl)) ||
            loaded.find((l) => l.lotNumber === '2026-AC-20260528-01') ||
            loaded[0];
          if (withReport) {
            setSelectedLotId(withReport.id);
          } else {
            setSelectedLotId('');
          }
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchLots();
    return () => {
      isMounted = false;
    };
  }, [isOpen, lot, user?.uid]);

  if (!isOpen) return null;

  const activeLot = lot || lots.find((l) => l.id === selectedLotId) || lots[0] || null;
  const hasReport = Boolean(
    activeLot?.inspectionReportUrl && activeLot.inspectionReportUrl.trim()
  );
  const reportName =
    activeLot?.inspectionReportName && activeLot.inspectionReportName.trim()
      ? activeLot.inspectionReportName.trim()
      : '등록된 검사성적서';
  const isPdf = Boolean(
    reportName.toLowerCase().endsWith('.pdf') ||
      (activeLot?.inspectionReportUrl &&
        (activeLot.inspectionReportUrl.toLowerCase().includes('.pdf') ||
          activeLot.inspectionReportUrl.startsWith('data:application/pdf')))
  );

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl p-4 sm:p-6 max-w-2xl w-full shadow-2xl border-2 border-[#7e5700] my-auto max-h-[92vh] flex flex-col animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <div className="flex justify-between items-center border-b border-[#d6c4ac] pb-3 mb-3 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#7e5700] text-[#ffdeac] flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
              <span className="material-symbols-outlined text-[20px]">verified</span>
            </div>
            <div className="min-w-0">
              <h3 className="font-extrabold text-[17px] text-[#0d1e25] truncate">
                공인 검사성적서 확인
              </h3>
              <p className="text-[11px] text-[#514532] truncate">
                {activeLot
                  ? `LOT: ${activeLot.lotNumber} · ${activeLot.productName}`
                  : '등록된 꿀 이력 성적서 조회'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-[#514532] hover:bg-[#d9ebf5] transition-colors cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-[24px]">close</span>
          </button>
        </div>

        {/* LOT selector if multiple lots exist */}
        {!lot && lots.length > 1 && (
          <div className="mb-3 shrink-0">
            <select
              value={activeLot?.id || ''}
              onChange={(e) => setSelectedLotId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#d6c4ac] bg-[#fbf9f4] text-[12px] font-bold text-[#0d1e25]"
            >
              {lots.map((item) => (
                <option key={item.id} value={item.id}>
                  [{item.lotNumber}] {item.productName} —{' '}
                  {item.inspectionReportUrl ? '성적서 등록됨' : '성적서 미등록'}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3">
          {isLoading ? (
            <div className="py-12 text-center text-[13px] text-[#514532]">
              등록된 검사성적서 정보를 불러오는 중입니다...
            </div>
          ) : hasReport && activeLot?.inspectionReportUrl ? (
            <div className="space-y-3">
              <div className="bg-[#fbf9f4] border border-[#e8dec8] rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-2 text-[12px]">
                <div>
                  <span className="text-[10.5px] font-bold text-[#887864] block">등록 파일명</span>
                  <span className="font-extrabold text-[#0d1e25] break-all">{reportName}</span>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-[#eef8f0] border border-[#bfe0c5] text-[#1e5229] text-[11px] font-black">
                  실제 등록된 성적서
                </span>
              </div>

              <div className="bg-[#fcfaf5] border border-[#d6c4ac] rounded-2xl p-2 flex items-center justify-center min-h-[340px]">
                {isPdf ? (
                  <iframe
                    src={activeLot.inspectionReportUrl}
                    title={reportName}
                    className="w-full h-[60vh] rounded-xl border-0"
                  />
                ) : (
                  <img
                    src={activeLot.inspectionReportUrl}
                    alt={reportName}
                    className="max-w-full max-h-[60vh] object-contain rounded-xl"
                  />
                )}
              </div>
            </div>
          ) : (
            <div className="bg-[#fbf9f4] border border-[#e8dec8] rounded-2xl p-8 text-center space-y-2">
              <span className="material-symbols-outlined text-[36px] text-[#887864]">
                description
              </span>
              <div className="text-[15px] font-extrabold text-[#2b1e00]">
                등록된 검사성적서 없음
              </div>
              <p className="text-[12px] text-[#6d5b45] leading-relaxed max-w-sm mx-auto">
                해당 꿀 이력({activeLot ? activeLot.lotNumber : '미선택'})에 등록된 공인 검사성적서 파일이 없습니다.
                [꿀 이력제] 또는 [생산 이력 추적] 화면에서 실제 성적서(PDF·JPG·PNG)를 등록해주세요.
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex gap-2 pt-3 border-t border-[#d6c4ac] mt-3 shrink-0">
          {hasReport && activeLot?.inspectionReportUrl && (
            <a
              href={activeLot.inspectionReportUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-3 bg-[#7e5700] hover:bg-[#604100] text-white font-bold rounded-2xl text-[13px] shadow-sm flex items-center justify-center gap-1.5 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">open_in_new</span>
              <span>원본 성적서 새 창에서 열기</span>
            </a>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 bg-white border border-[#d6c4ac] hover:bg-[#d9ebf5] text-[#0d1e25] font-bold rounded-2xl text-[13px] active:scale-95 transition-all cursor-pointer ml-auto"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};

