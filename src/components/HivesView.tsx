import React, { useState, useMemo } from 'react';
import {
  initialQueenMetrics,
  queenLineageEvents,
  hive12TraceEvents,
  generateHives
} from '../data/mockData';
import { HiveSubTab, HiveItem, BreederQueen, BreederMetricLog, VoiceLogItem } from '../types';
import { GlossaryModal } from './GlossaryModal';
import { GLOSSARY_DATA } from '../data/glossaryData';
import { BreederFamilyTree } from './BreederFamilyTree';
import { BreederRegisterModal } from './BreederRegisterModal';
import { BreederMetricRecordModal } from './BreederMetricRecordModal';
import { BreederDetailModal } from './BreederDetailModal';
import {
  loadBreederQueens,
  addBreederQueen,
  updateBreederQueen,
  deleteBreederQueen,
  addMetricLogToQueen,
  loadBreederQueensWithFirestore,
  saveBreederQueenWithFirestore,
  deleteBreederQueenWithFirestore
} from '../services/breederService';
import { useAuth } from '../contexts/AuthContext';
import { isLogForHive, getLatestInspectionForHive } from '../lib/hiveJournalLink';
import { fetchJournalsFromFirestore } from '../services/firestoreService';

interface HivesViewProps {
  hiveCount?: number;
  onUpdateHiveCount?: (newCount: number) => void;
  onOpenTraceDetail?: () => void;
  onSelectHiveForRecord?: (hiveNum: number) => void;
  journals?: VoiceLogItem[];
}

export const HivesView: React.FC<HivesViewProps> = ({
  hiveCount = 50,
  onUpdateHiveCount,
  onOpenTraceDetail,
  onSelectHiveForRecord,
  journals
}) => {
  const [subTab, setSubTab] = useState<HiveSubTab>('lineage');
  const [selectedHiveId, setSelectedHiveId] = useState<number>(12);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showQueenDetailModal, setShowQueenDetailModal] = useState<boolean>(false);
  const [showGlossaryModal, setShowGlossaryModal] = useState<boolean>(false);
  const [activeGlossaryTermId, setActiveGlossaryTermId] = useState<string | null>(null);
  const [isConsumerMode, setIsConsumerMode] = useState<boolean>(true);
  const [isCountModalOpen, setIsCountModalOpen] = useState<boolean>(false);
  const [customCountInput, setCustomCountInput] = useState<number>(hiveCount);

  // Breeder Queen Management States
  const { user } = useAuth();
  const [breederQueens, setBreederQueens] = useState<BreederQueen[]>(() =>
    loadBreederQueens(user?.uid)
  );
  const [selectedQueenId, setSelectedQueenId] = useState<string | null>('BQ-F2-01');
  const [detailModalQueen, setDetailModalQueen] = useState<BreederQueen | null>(null);
  const [metricModalQueen, setMetricModalQueen] = useState<BreederQueen | null>(null);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState<boolean>(false);
  const [registerParentId, setRegisterParentId] = useState<string | null>(null);
  const [registerHiveId, setRegisterHiveId] = useState<number | undefined>(undefined);
  const [editingQueen, setEditingQueen] = useState<BreederQueen | null>(null);
  const [lineageViewMode, setLineageViewMode] = useState<'tree' | 'timeline'>('tree');

  // Beekeeping Journals state for Hive-Journal linking (strictly isolated per UID)
  const [allJournals, setAllJournals] = useState<VoiceLogItem[]>(() => {
    if (Array.isArray(journals) && journals.length > 0) return journals;
    try {
      const key = user?.uid
        ? `honeybee_beekeeping_journal_logs_v2_${user.uid}`
        : 'honeybee_beekeeping_journal_logs_v2';
      const local = localStorage.getItem(key);
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  });

  // Sync when journals prop updates (including empty array when user changes)
  React.useEffect(() => {
    if (Array.isArray(journals)) {
      setAllJournals(journals);
    }
  }, [journals]);

  // Load journals and breeder queens from Firestore if user is logged in, or reset when logged out
  React.useEffect(() => {
    let isMounted = true;
    const uid = user?.uid;

    if (!uid) {
      const guestQueens = loadBreederQueens();
      setBreederQueens(guestQueens);
      setSelectedQueenId(guestQueens[0]?.id || null);
      return;
    }

    // Reset immediately to UID-scoped cache while fetching fresh Firestore data
    const cachedQueens = loadBreederQueens(uid);
    setBreederQueens(cachedQueens);
    setSelectedQueenId(cachedQueens[0]?.id || null);
    setAllJournals([]);

    loadBreederQueensWithFirestore(uid).then((cloudQueens) => {
      if (isMounted && Array.isArray(cloudQueens)) {
        setBreederQueens(cloudQueens);
        setSelectedQueenId((prev) =>
          prev && cloudQueens.some((q) => q.id === prev) ? prev : cloudQueens[0]?.id || null
        );
      }
    });

    fetchJournalsFromFirestore(uid).then((cloudLogs) => {
      if (isMounted && Array.isArray(cloudLogs)) {
        setAllJournals(
          [...cloudLogs].sort(
            (a, b) => (b.date + (b.timestamp || '')).localeCompare(a.date + (a.timestamp || ''))
          )
        );
      }
    });

    return () => {
      isMounted = false;
    };
  }, [user?.uid]);

  // Journals specifically linked to the selected hive
  const selectedHiveJournals = useMemo(() => {
    return allJournals
      .filter((l) => isLogForHive(l, selectedHiveId))
      .sort((a, b) => (b.date + (b.timestamp || '')).localeCompare(a.date + (a.timestamp || '')));
  }, [allJournals, selectedHiveId]);

  // Latest inspection details for selected hive
  const hiveInspectionSummary = useMemo(() => {
    return getLatestInspectionForHive(allJournals, selectedHiveId);
  }, [allJournals, selectedHiveId]);

  const activeHives: HiveItem[] = useMemo(() => generateHives(hiveCount), [hiveCount]);

  const handleSaveQueen = (queen: BreederQueen) => {
    saveBreederQueenWithFirestore(queen, user?.uid).then((updated) => {
      setBreederQueens(updated);
    });
    setSelectedQueenId(queen.id);
  };

  const handleAddMetricLog = (queenId: string, log: Omit<BreederMetricLog, 'id'>) => {
    const { updatedQueens, updatedQueen } = addMetricLogToQueen(queenId, log, user?.uid);
    setBreederQueens(updatedQueens);
    if (user?.uid) {
      saveBreederQueenWithFirestore(updatedQueen, user.uid);
    }
    if (detailModalQueen && detailModalQueen.id === queenId) {
      setDetailModalQueen(updatedQueen);
    }
  };

  const handleDeleteQueen = (queenId: string) => {
    deleteBreederQueenWithFirestore(queenId, user?.uid).then((updated) => {
      setBreederQueens(updated);
      if (selectedQueenId === queenId) {
        setSelectedQueenId(updated[0]?.id || null);
      }
    });
  };

  const handleOpenRegisterForHive = (hId: number) => {
    setEditingQueen(null);
    setRegisterParentId(null);
    setRegisterHiveId(hId);
    setIsRegisterModalOpen(true);
  };

  const handleOpenRegisterDaughter = (parentId?: string, hId?: number) => {
    setEditingQueen(null);
    setRegisterParentId(parentId || null);
    setRegisterHiveId(hId);
    setIsRegisterModalOpen(true);
  };

  // Trait averages for summary
  const avgMetrics = useMemo(() => {
    if (breederQueens.length === 0) return { honey: 0, propolis: 0, royalJelly: 0, egg: 0 };
    const totalH = breederQueens.reduce((acc, q) => acc + (q.honeyHarvestKg || 0), 0);
    const totalP = breederQueens.reduce((acc, q) => acc + (q.propolisYieldG || 0), 0);
    const totalR = breederQueens.reduce((acc, q) => acc + (q.royalJellyYieldG || 0), 0);
    const totalE = breederQueens.reduce((acc, q) => acc + (q.eggLayingRate || 0), 0);
    return {
      honey: (totalH / breederQueens.length).toFixed(1),
      propolis: Math.round(totalP / breederQueens.length),
      royalJelly: Math.round(totalR / breederQueens.length),
      egg: Math.round(totalE / breederQueens.length)
    };
  }, [breederQueens]);

  const openGlossary = (termId?: string) => {
    if (termId) {
      setActiveGlossaryTermId(termId);
    } else {
      setActiveGlossaryTermId(null);
    }
    setShowGlossaryModal(true);
  };

  const handleApplyCount = (newCount: number) => {
    const valid = Math.max(1, Math.min(2000, Number(newCount) || 50));
    if (onUpdateHiveCount) {
      onUpdateHiveCount(valid);
    }
    if (selectedHiveId > valid) {
      setSelectedHiveId(1);
    }
    setIsCountModalOpen(false);
  };

  const currentHive = activeHives.find((h) => h.id === selectedHiveId) || activeHives[0] || generateHives(1)[0];

  const filteredHives = activeHives.filter((h) => {
    if (filterStatus === 'all') return true;
    return h.status === filterStatus;
  });

  const countNormal = activeHives.filter((h) => h.status === '정상').length;
  const countHoney = activeHives.filter((h) => h.status === '채밀가능').length;
  const countWarning = activeHives.filter((h) => h.status === '주의').length;
  const countCheck = activeHives.filter((h) => h.status === '내검필요').length;

  return (
    <div className="flex flex-col w-full min-h-screen pb-28 pt-16 bg-[#f4faff]">
      {/* Sub-tabs switch */}
      <div className="bg-[#e7f6ff] px-4 py-2 border-b border-[#d4e5ef] sticky top-16 z-20 shadow-xs">
        <div className="flex bg-[#d9ebf5] p-1 rounded-xl max-w-md mx-auto border border-[#d6c4ac]/50">
          <button
            onClick={() => setSubTab('lineage')}
            className={`flex-1 py-1.5 rounded-lg text-[13px] font-bold transition-all flex items-center justify-center gap-1 ${
              subTab === 'lineage'
                ? 'bg-white text-[#7e5700] shadow-xs'
                : 'text-[#514532] hover:text-[#0d1e25]'
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">account_tree</span>
            <span>종봉 관리</span>
          </button>
          <button
            onClick={() => setSubTab('history')}
            className={`flex-1 py-1.5 rounded-lg text-[13px] font-bold transition-all flex items-center justify-center gap-1 ${
              subTab === 'history'
                ? 'bg-white text-[#7e5700] shadow-xs'
                : 'text-[#514532] hover:text-[#0d1e25]'
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">history_edu</span>
            <span>벌통이력</span>
          </button>
          <button
            onClick={() => setSubTab('grid')}
            className={`flex-1 py-1.5 rounded-lg text-[13px] font-bold transition-all flex items-center justify-center gap-1 ${
              subTab === 'grid'
                ? 'bg-white text-[#7e5700] shadow-xs'
                : 'text-[#514532] hover:text-[#0d1e25]'
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">grid_view</span>
            <span>벌통목록</span>
          </button>
        </div>
      </div>

      <div className={`flex flex-col w-full px-4 py-4 gap-5 mx-auto transition-all ${subTab === 'lineage' ? 'max-w-4xl' : 'max-w-md'}`}>
        {/* Hive Scale Management Banner across tabs */}
        <div className="bg-white border border-[#d6c4ac] rounded-2xl p-3 shadow-2xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#ffdeac] text-[#7e5700] flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">hive</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[13px] font-black text-[#0d1e25]">
                  총 관리 벌통: {hiveCount}군
                </span>
                <span className="bg-[#1b6d24]/10 text-[#1b6d24] text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                  내 정보 연동
                </span>
              </div>
              <p className="text-[10px] text-[#514532]">
                10, 20, 50, 100, 200군 등 실시간 규모 증감 지원
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setCustomCountInput(hiveCount);
              setIsCountModalOpen(true);
            }}
            className="px-2.5 py-1.5 bg-[#7e5700] hover:bg-[#604100] text-white text-[11px] font-bold rounded-xl flex items-center gap-1 shadow-xs cursor-pointer active:scale-95 transition-all shrink-0"
          >
            <span className="material-symbols-outlined text-[14px]">tune</span>
            <span>통수 변경</span>
          </button>
        </div>

        {/* SUBTAB 1: 종봉 관리 (위에서부터 갈라져 내려오는 종봉 가계도 및 형질 수치 누적 기록) */}
        {subTab === 'lineage' && (
          <div className="space-y-4">
            {/* Header & Quick Action */}
            <div className="bg-white border-2 border-[#7e5700]/50 rounded-3xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-2xl bg-[#ffdeac] text-[#7e5700] flex items-center justify-center shadow-2xs">
                    <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                      crown
                    </span>
                  </div>
                  <h2 className="text-[20px] font-black text-[#0d1e25]">
                    종봉 혈통 계보 & 가계도
                  </h2>
                </div>
                <p className="text-[12px] text-[#514532] mt-1 leading-relaxed">
                  벌통과 1:1 연결되어 채밀력, 프로폴리스양, 로열제리양, 봉군 세력 등의 검정 수치를 지속 기록하고 위에서 갈라져 내려오는 혈통 가계도를 시각화합니다.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleOpenRegisterForHive(selectedHiveId || 1)}
                  className="px-4 py-2.5 bg-[#7e5700] hover:bg-[#604100] text-white text-[12px] font-black rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5 active:scale-95 transition-all"
                >
                  <span className="material-symbols-outlined text-[16px]">add_circle</span>
                  <span>새 종봉 등록</span>
                </button>
              </div>
            </div>

            {/* View Mode Switcher */}
            <div className="flex bg-[#e7f6ff] p-1 rounded-2xl border border-[#d4e5ef] max-w-sm mx-auto">
              <button
                onClick={() => setLineageViewMode('tree')}
                className={`flex-1 py-1.5 rounded-xl text-[12px] font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  lineageViewMode === 'tree'
                    ? 'bg-[#7e5700] text-white shadow-xs'
                    : 'text-[#514532] hover:text-[#0d1e25]'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">account_tree</span>
                <span>가계도 계보 트리</span>
              </button>
              <button
                onClick={() => setLineageViewMode('timeline')}
                className={`flex-1 py-1.5 rounded-xl text-[12px] font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  lineageViewMode === 'timeline'
                    ? 'bg-[#7e5700] text-white shadow-xs'
                    : 'text-[#514532] hover:text-[#0d1e25]'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">history</span>
                <span>세대별 관리 이력</span>
              </button>
            </div>

            {/* 4 Core Trait Averages Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-white border border-[#d6c4ac] rounded-2xl p-3 shadow-2xs flex flex-col items-center text-center justify-center">
                <span className="material-symbols-outlined text-[#7e5700] text-[22px] mb-0.5">crown</span>
                <span className="text-[11px] font-bold text-[#514532]">총 등록 종봉</span>
                <span className="text-[22px] font-black text-[#0d1e25]">
                  {breederQueens.length}
                  <span className="text-[13px] font-medium ml-0.5">두</span>
                </span>
                <span className="text-[10px] text-[#1b6d24] font-semibold mt-0.5">
                  활동중 {breederQueens.filter((q) => q.status === '활동중').length}두
                </span>
              </div>

              <div className="bg-white border border-[#d6c4ac] rounded-2xl p-3 shadow-2xs flex flex-col items-center text-center justify-center">
                <span className="material-symbols-outlined text-[#7e5700] text-[22px] mb-0.5">water_drop</span>
                <span className="text-[11px] font-bold text-[#514532]">평균 채밀력</span>
                <span className="text-[22px] font-black text-[#7e5700]">
                  {avgMetrics.honey}
                  <span className="text-[13px] font-medium ml-0.5">kg</span>
                </span>
                <span className="text-[10px] text-[#514532] font-semibold mt-0.5">만상 기준</span>
              </div>

              <div className="bg-white border border-[#d6c4ac] rounded-2xl p-3 shadow-2xs flex flex-col items-center text-center justify-center">
                <span className="material-symbols-outlined text-[#0277bd] text-[22px] mb-0.5">shield</span>
                <span className="text-[11px] font-bold text-[#514532]">평균 프로폴리스</span>
                <span className="text-[22px] font-black text-[#0277bd]">
                  {avgMetrics.propolis}
                  <span className="text-[13px] font-medium ml-0.5">g</span>
                </span>
                <span className="text-[10px] text-[#514532] font-semibold mt-0.5">채취망 누적</span>
              </div>

              <div className="bg-white border border-[#d6c4ac] rounded-2xl p-3 shadow-2xs flex flex-col items-center text-center justify-center">
                <span className="material-symbols-outlined text-[#d81b60] text-[22px] mb-0.5">science</span>
                <span className="text-[11px] font-bold text-[#514532]">평균 로열제리</span>
                <span className="text-[22px] font-black text-[#d81b60]">
                  {avgMetrics.royalJelly}
                  <span className="text-[13px] font-medium ml-0.5">g</span>
                </span>
                <span className="text-[10px] text-[#514532] font-semibold mt-0.5">이충판 생산</span>
              </div>
            </div>

            {/* Main Content Area based on Lineage Mode */}
            {lineageViewMode === 'tree' ? (
              <div className="space-y-4">
                {/* Visual Branching Family Tree (위에서부터 갈라져 내려오는 종봉 가계도) */}
                <BreederFamilyTree
                  queens={breederQueens}
                  selectedQueenId={selectedQueenId}
                  onSelectQueen={(queen) => {
                    setSelectedQueenId(queen.id);
                    setDetailModalQueen(queen);
                  }}
                  onAddMetricLog={(queen) => {
                    setMetricModalQueen(queen);
                  }}
                  onRegisterDaughter={(parentQueenId, hiveId) => {
                    handleOpenRegisterDaughter(parentQueenId, hiveId);
                  }}
                />

                {/* Selected Queen Live Trait Quick Card */}
                {(() => {
                  const currentSelected = breederQueens.find((q) => q.id === selectedQueenId) || breederQueens[0];
                  if (!currentSelected) return null;
                  return (
                    <div className="bg-white border-2 border-[#7e5700]/70 rounded-3xl p-4 shadow-sm space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 rounded-2xl bg-[#ffdeac] text-[#7e5700] flex items-center justify-center font-black text-[15px]">
                            {currentSelected.hiveId > 0 ? `#${currentSelected.hiveId}` : '원종'}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h3 className="font-black text-[17px] text-[#0d1e25]">
                                {currentSelected.name}
                              </h3>
                              <span className="text-[10px] font-black bg-[#7e5700] text-white px-2 py-0.5 rounded-full">
                                {currentSelected.generation} 세대
                              </span>
                              <span className="text-[10px] font-bold bg-[#a0f399]/40 text-[#1b6d24] px-1.5 py-0.5 rounded">
                                {currentSelected.status}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#514532]">
                              {currentSelected.hiveId > 0 ? `${currentSelected.hiveId}번 벌통 연동` : '원종'} · {currentSelected.breed}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                          <button
                            onClick={() => handleOpenRegisterDaughter(currentSelected.id, currentSelected.hiveId > 0 ? currentSelected.hiveId : undefined)}
                            className="px-2.5 py-1.5 bg-[#ffdeac] hover:bg-[#ffd391] text-[#7e5700] text-[11px] font-black rounded-xl shadow-2xs flex items-center gap-0.5 cursor-pointer active:scale-95 transition-all"
                            title="이 여왕벌의 딸 여왕벌 등록"
                          >
                            <span className="material-symbols-outlined text-[14px]">add</span>
                            <span>딸 등록</span>
                          </button>
                          <button
                            onClick={() => setMetricModalQueen(currentSelected)}
                            className="px-2.5 py-1.5 bg-[#7e5700] hover:bg-[#604100] text-white text-[11px] font-bold rounded-xl shadow-xs flex items-center gap-0.5 cursor-pointer active:scale-95 transition-all"
                          >
                            <span className="material-symbols-outlined text-[14px]">edit_note</span>
                            <span>수치 계속기록</span>
                          </button>
                          <button
                            onClick={() => setDetailModalQueen(currentSelected)}
                            className="px-2.5 py-1.5 bg-white border border-[#d6c4ac] text-[#0d1e25] text-[11px] font-bold rounded-xl hover:bg-[#d9ebf5] cursor-pointer"
                          >
                            상세정보
                          </button>
                        </div>
                      </div>

                      {/* 4 Core Metrics Display for the Selected Queen */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[#f8fbfe] p-3 rounded-2xl border border-[#d4e5ef]">
                        <div className="bg-white p-2 rounded-xl text-center border border-[#d6c4ac]/60">
                          <span className="text-[10px] font-bold text-[#514532] block">🍯 채밀력</span>
                          <span className="text-[18px] font-black text-[#7e5700]">{currentSelected.honeyHarvestKg}</span>
                          <span className="text-[10px] text-[#514532] ml-0.5">kg</span>
                        </div>
                        <div className="bg-white p-2 rounded-xl text-center border border-[#d6c4ac]/60">
                          <span className="text-[10px] font-bold text-[#514532] block">🐝 프로폴리스</span>
                          <span className="text-[18px] font-black text-[#0277bd]">{currentSelected.propolisYieldG}</span>
                          <span className="text-[10px] text-[#514532] ml-0.5">g</span>
                        </div>
                        <div className="bg-white p-2 rounded-xl text-center border border-[#d6c4ac]/60">
                          <span className="text-[10px] font-bold text-[#514532] block">👑 로열제리</span>
                          <span className="text-[18px] font-black text-[#d81b60]">{currentSelected.royalJellyYieldG}</span>
                          <span className="text-[10px] text-[#514532] ml-0.5">g</span>
                        </div>
                        <div className="bg-white p-2 rounded-xl text-center border border-[#d6c4ac]/60">
                          <span className="text-[10px] font-bold text-[#514532] block">💪 봉군 세력</span>
                          <span className="text-[18px] font-black text-[#1b6d24]">{currentSelected.colonyStrength}</span>
                          <span className="text-[10px] text-[#514532] ml-0.5">매</span>
                        </div>
                      </div>

                      {/* Recent continuous logs */}
                      {currentSelected.logs && currentSelected.logs.length > 0 && (
                        <div className="pt-1">
                          <div className="flex items-center justify-between mb-1 text-[11px] font-bold text-[#514532]">
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">history</span>
                              <span>형질 수치 측정 기록 이력 ({currentSelected.logs.length}건)</span>
                            </span>
                            <span className="text-[10px] text-[#7e5700]">최신순</span>
                          </div>
                          <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                            {currentSelected.logs.map((log) => (
                              <div
                                key={log.id}
                                className="text-[11px] bg-[#f4faff] border border-[#d4e5ef] p-1.5 rounded-xl flex items-center justify-between"
                              >
                                <span className="font-bold text-[#0d1e25]">{log.date}</span>
                                <span className="text-[#514532] truncate max-w-[140px]">{log.notes}</span>
                                <span className="font-black text-[#7e5700]">
                                  채밀 {log.honeyYieldKg}kg / 프로폴 {log.propolisYieldG}g
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            ) : (
              /* Timeline Mode */
              <section className="bg-white border border-[#d6c4ac] rounded-3xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span
                      className="material-symbols-outlined text-[#1b6d24] text-[22px]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      history
                    </span>
                    <h2 className="text-[19px] font-bold text-[#0d1e25]">
                      세대별 관리 이력
                    </h2>
                  </div>
                  <div className="flex items-center gap-1 bg-[#1b6d24]/10 px-2.5 py-1 rounded-full border border-[#1b6d24]/20">
                    <span
                      className="material-symbols-outlined text-[#1b6d24] text-[16px]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      verified
                    </span>
                    <span className="text-[11px] font-bold text-[#1b6d24]">
                      종봉 품질 인증
                    </span>
                  </div>
                </div>

                <ul className="space-y-4 relative before:absolute before:inset-y-0 before:left-[11px] before:w-0.5 before:bg-[#d6c4ac] pb-1">
                  {queenLineageEvents.map((evt, idx) => {
                    return (
                      <li key={evt.id} className="relative pl-8">
                        {idx === 0 ? (
                          <div className="absolute left-0 top-1.5 w-6 h-6 bg-[#1b6d24] rounded-full border-[3px] border-white z-10 flex items-center justify-center">
                            <span className="w-2 h-2 bg-white rounded-full" />
                          </div>
                        ) : idx <= 2 ? (
                          <div className="absolute left-0 top-1.5 w-6 h-6 bg-[#ffb300] rounded-full border-[3px] border-white z-10" />
                        ) : (
                          <div className="absolute left-0 top-1.5 w-6 h-6 bg-[#d4e5ef] rounded-full border-[3px] border-white z-10" />
                        )}

                        <div
                          className={`rounded-2xl p-3.5 shadow-xs border ${
                            evt.isHighlight
                              ? 'bg-[#a0f399]/30 border-[#1b6d24]/60'
                              : 'bg-[#f4faff] border-[#d6c4ac]/60'
                          }`}
                        >
                          <div className="flex justify-between items-baseline mb-1.5">
                            <h4 className="font-bold text-[15px] text-[#0d1e25]">
                              {evt.title}
                            </h4>
                            <time className="text-[12px] font-medium text-[#514532]">
                              {evt.date}
                            </time>
                          </div>
                          <p className="text-[13px] text-[#0d1e25] leading-relaxed">
                            {evt.description}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}
          </div>
        )}

        {/* SUBTAB 2: 벌통이력 (꿀이력제) */}
        {subTab === 'history' && (
          <>
            {/* Hive Family Tree Card */}
            <section className="bg-white border border-[#d6c4ac] rounded-3xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-[#7e5700] text-[22px]">
                  hive
                </span>
                <h2 className="text-[20px] font-bold text-[#0d1e25]">벌통 계보</h2>
              </div>

              <div className="relative py-2">
                <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-[#d6c4ac]" />

                {/* Parent Hive */}
                <div className="flex items-start gap-4 mb-3 relative z-10">
                  <div className="w-12 h-12 rounded-2xl border border-[#d6c4ac] bg-[#f4faff] flex items-center justify-center shrink-0 shadow-xs font-bold text-[14px] text-[#0d1e25]">
                    #12
                  </div>
                  <div className="flex-1 pt-0.5">
                    <h3 className="font-bold text-[16px] text-[#0d1e25]">기존 벌통 #12</h3>
                    <p className="text-[13px] text-[#514532]">설립 2023년 3월</p>
                  </div>
                </div>

                {/* Queen In Action */}
                <div className="flex items-start gap-4 mb-3 relative z-10">
                  <div className="w-12 h-12 rounded-2xl border border-[#d6c4ac] bg-[#ffb300] flex items-center justify-center shrink-0 shadow-xs text-[#6b4900]">
                    <span
                      className="material-symbols-outlined text-[24px]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      star
                    </span>
                  </div>
                  <div className="flex-1 pt-0.5">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-[17px] font-bold text-[#0d1e25]">
                          여왕벌 Q2024-A
                        </h3>
                        <p className="text-[13px] text-[#1b6d24] font-bold mt-0.5">
                          활동 중 (산란권 안정)
                        </p>
                      </div>
                      <button
                        onClick={() => setShowQueenDetailModal(true)}
                        className="px-3.5 py-1.5 border border-[#d6c4ac] rounded-full text-[12px] font-bold text-[#0d1e25] hover:bg-[#d9ebf5] active:scale-95 transition-all shadow-2xs"
                      >
                        보기
                      </button>
                    </div>
                  </div>
                </div>

                {/* Swarm Offspring */}
                <div className="flex items-start gap-4 relative z-10">
                  <div className="w-12 h-12 rounded-2xl border border-[#d6c4ac] bg-[#dff1fb] flex items-center justify-center shrink-0 shadow-xs font-bold text-[14px] text-[#0d1e25]">
                    #45
                  </div>
                  <div className="flex-1 pt-0.5">
                    <h3 className="font-bold text-[16px] text-[#0d1e25]">분봉 벌통 #45</h3>
                    <p className="text-[13px] text-[#514532]">분봉 완료 2024년 5월</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white border border-[#d6c4ac] rounded-3xl p-4 shadow-xs flex flex-col items-center text-center justify-center min-h-[100px]">
                <span className="material-symbols-outlined text-[#1b6d24] text-[26px] mb-1">
                  egg
                </span>
                <p className="text-[12px] font-semibold text-[#514532] mb-0.5">산란율</p>
                <p className="text-[26px] font-extrabold text-[#0d1e25]">94%</p>
              </div>
              <div className="bg-white border border-[#d6c4ac] rounded-3xl p-4 shadow-xs flex flex-col items-center text-center justify-center min-h-[100px]">
                <span className="material-symbols-outlined text-[#7e5700] text-[26px] mb-1">
                  water_drop
                </span>
                <p className="text-[12px] font-semibold text-[#514532] mb-0.5">채밀량</p>
                <p className="text-[26px] font-extrabold text-[#0d1e25]">
                  18 <span className="text-[16px] font-normal">kg</span>
                </p>
              </div>
            </div>

            {/* Hive Detailed History */}
            <section className="bg-white border border-[#d6c4ac] rounded-3xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#1b6d24] text-[22px]">
                    history
                  </span>
                  <h2 className="text-[18px] font-bold text-[#0d1e25]">
                    벌통 #{selectedHiveId} 상세 이력
                  </h2>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* Hive Selector in History View */}
                  <div className="flex items-center gap-1 bg-[#f4faff] px-2.5 py-1 rounded-xl border border-[#d6c4ac]">
                    <span className="text-[11px] font-bold text-[#514532]">벌통:</span>
                    <select
                      value={selectedHiveId}
                      onChange={(e) => setSelectedHiveId(Number(e.target.value))}
                      className="bg-transparent text-[12px] font-bold text-[#0d1e25] outline-none cursor-pointer"
                    >
                      {activeHives.map((h) => {
                        const count = allJournals.filter((j) => isLogForHive(j, h.id)).length;
                        return (
                          <option key={h.id} value={h.id}>
                            {h.name} {count > 0 ? `(${count}건)` : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* QR 인증 완료 배지 */}
                  <div className="flex items-center gap-1 bg-[#1b6d24]/10 px-2.5 py-1 rounded-full border border-[#1b6d24]/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#1b6d24]" />
                    <span className="text-[11px] font-bold text-[#1b6d24]">
                      QR 인증 완료
                    </span>
                  </div>

                  {/* QR인증완료 옆 양봉용어사전 버튼 */}
                  <button
                    onClick={() => openGlossary()}
                    className="flex items-center gap-1 bg-[#7e5700] hover:bg-[#604100] text-white px-2.5 py-1 rounded-full font-bold text-[11px] shadow-xs active:scale-95 transition-all cursor-pointer"
                    title="소비자를 위한 쉬운 양봉용어사전 열기"
                  >
                    <span className="material-symbols-outlined text-[14px]">auto_stories</span>
                    <span>양봉용어사전</span>
                  </button>
                </div>
              </div>

              {/* Consumer Friendly Mode Switch Banner */}
              <div className="bg-gradient-to-r from-[#ffdeac]/40 to-[#e7f6ff] border border-[#d6c4ac]/80 rounded-2xl p-3 mb-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[#7e5700] text-[18px]">
                      psychology_alt
                    </span>
                    <span className="text-[12px] font-bold text-[#281900]">
                      소비자 눈높이 해설
                    </span>
                  </div>
                  <button
                    onClick={() => setIsConsumerMode(!isConsumerMode)}
                    className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-white border border-[#d6c4ac] text-[#7e5700] hover:bg-[#fff9c4] transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[15px]">
                      {isConsumerMode ? 'toggle_on' : 'toggle_off'}
                    </span>
                    <span>{isConsumerMode ? '쉬운 해설 켜짐' : '원문 기록 보기'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-[#514532] leading-snug">
                  {isConsumerMode
                    ? '💡 소비자가 쉽게 이해할 수 있도록 꿀벌 생태와 양봉 관리를 쉬운 말로 풀어서 보여드립니다.'
                    : '📋 양봉가가 현장에서 기록한 실제 전문 내검 일지 원문입니다.'}
                </p>
              </div>

              {selectedHiveJournals.length > 0 ? (
                <ul className="space-y-4 relative before:absolute before:inset-y-0 before:left-[11px] before:w-0.5 before:bg-[#d6c4ac] pb-1">
                  {selectedHiveJournals.map((log, idx) => (
                    <li key={log.id} className="relative pl-8">
                      {idx === 0 ? (
                        <div className="absolute left-0 top-1.5 w-6 h-6 bg-[#1b6d24] rounded-full border-[3px] border-white z-10 flex items-center justify-center">
                          <span className="w-2 h-2 bg-white rounded-full" />
                        </div>
                      ) : (
                        <div className="absolute left-0 top-1.5 w-6 h-6 bg-[#ffb300] rounded-full border-[3px] border-white z-10" />
                      )}

                      <div
                        className={`rounded-2xl p-3.5 shadow-xs border ${
                          log.status === '주의'
                            ? 'bg-[#fff0f0] border-[#ba1a1a]/40'
                            : idx === 0
                            ? 'bg-[#a0f399]/25 border-[#1b6d24]/60'
                            : 'bg-[#f4faff] border-[#d6c4ac]/60'
                        }`}
                      >
                        <div className="flex justify-between items-baseline mb-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-[15px] text-[#0d1e25]">
                              {log.category || '벌통 내검'}
                            </h4>
                            <span
                              className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                                log.status === '주의'
                                  ? 'bg-[#ba1a1a] text-white'
                                  : 'bg-[#a0f399] text-[#1b6d24]'
                              }`}
                            >
                              {log.status || '완료'}
                            </span>
                          </div>
                          <time className="text-[12px] font-medium text-[#514532]">
                            {log.date} {log.timestamp}
                          </time>
                        </div>

                        {/* Text / AI Summary */}
                        <p className="text-[13px] text-[#0d1e25] leading-relaxed mb-2 font-medium">
                          {log.aiSummary || log.text}
                        </p>

                        {/* Consumer explanation if consumer mode is on */}
                        {isConsumerMode && (
                          <div className="bg-white/80 p-2.5 rounded-xl border border-[#d6c4ac]/60 mb-2 text-[12px] text-[#514532]">
                            {log.inspectionDetails?.feedStatus === '부족' ? (
                              <p>🍯 벌들에게 먹이(꿀/화분)가 부족하여 양봉인이 보충 급이를 진행 중인 안전 관리 상태입니다.</p>
                            ) : log.inspectionDetails?.queenSeen === true ? (
                              <p>👑 여왕벌이 건강하게 활동하며 산란을 이어가고 있어 벌통의 생태계가 안정적입니다.</p>
                            ) : log.category === '채밀량' ? (
                              <p>🐝 벌들이 지리산 청정 자연에서 숙성시킨 순수 천연 벌꿀 수확 기록입니다.</p>
                            ) : (
                              <p>🔍 정기 내검을 통해 꿀벌들의 건강 상태와 활동성을 세심하게 관찰하고 기록했습니다.</p>
                            )}
                          </div>
                        )}

                        {/* Inspection details badges: feed & queen */}
                        {(log.inspectionDetails?.feedStatus ||
                          log.inspectionDetails?.queenStatus ||
                          log.inspectionDetails?.queenSeen !== undefined ||
                          log.inspectionDetails?.diseaseStatus) && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#d4e5ef]/70">
                            {log.inspectionDetails.feedStatus && (
                              <span
                                className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                                  log.inspectionDetails.feedStatus === '부족'
                                    ? 'bg-[#ba1a1a]/15 text-[#ba1a1a] border border-[#ba1a1a]/30'
                                    : 'bg-[#ffdeac] text-[#7e5700]'
                                }`}
                              >
                                먹이: {log.inspectionDetails.feedStatus}
                              </span>
                            )}
                            {(log.inspectionDetails.queenStatus ||
                              log.inspectionDetails.queenSeen !== undefined) && (
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#e7f6ff] text-[#0277bd] border border-[#0277bd]/20">
                                여왕벌: {log.inspectionDetails.queenStatus || (log.inspectionDetails.queenSeen ? '확인' : '미확인')}
                              </span>
                            )}
                            {log.inspectionDetails.diseaseStatus && (
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#ffebee] text-[#c62828] border border-[#c62828]/20">
                                방제/질병: {log.inspectionDetails.diseaseStatus}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Weather tag or snapshot */}
                        {(log.weatherSnapshot || log.weatherTag) && (
                          <div className="text-[11px] text-[#514532] flex items-center gap-1 mt-2">
                            <span>🌤️</span>
                            <span>
                              {log.weatherSnapshot
                                ? `${log.weatherSnapshot.temp}°C ${log.weatherSnapshot.condition} (습도 ${log.weatherSnapshot.humidity}%)`
                                : log.weatherTag}
                            </span>
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : selectedHiveId === 12 ? (
                <ul className="space-y-4 relative before:absolute before:inset-y-0 before:left-[11px] before:w-0.5 before:bg-[#d6c4ac] pb-1">
                  {hive12TraceEvents.map((evt, idx) => (
                    <li key={evt.id} className="relative pl-8">
                      {idx === 0 ? (
                        <div className="absolute left-0 top-1.5 w-6 h-6 bg-[#1b6d24] rounded-full border-[3px] border-white z-10 flex items-center justify-center">
                          <span className="w-2 h-2 bg-white rounded-full" />
                        </div>
                      ) : idx <= 2 ? (
                        <div className="absolute left-0 top-1.5 w-6 h-6 bg-[#ffb300] rounded-full border-[3px] border-white z-10" />
                      ) : (
                        <div className="absolute left-0 top-1.5 w-6 h-6 bg-[#d4e5ef] rounded-full border-[3px] border-white z-10" />
                      )}

                      <div
                        className={`rounded-2xl p-3.5 shadow-xs border ${
                          evt.isHighlight
                            ? 'bg-[#a0f399]/30 border-[#1b6d24]/60'
                            : 'bg-[#f4faff] border-[#d6c4ac]/60'
                        }`}
                      >
                        <div className="flex justify-between items-baseline mb-1">
                          <h4 className="font-bold text-[15px] text-[#0d1e25]">
                            {evt.title}
                          </h4>
                          <time className="text-[12px] font-medium text-[#514532]">
                            {evt.date}
                          </time>
                        </div>

                        {/* Consumer description vs original */}
                        {isConsumerMode && evt.consumerDescription ? (
                          <div className="bg-white/80 p-2.5 rounded-xl border border-[#d6c4ac]/60 mb-2">
                            <p className="text-[13px] text-[#0d1e25] leading-relaxed font-medium">
                              {evt.consumerDescription}
                            </p>
                          </div>
                        ) : (
                          <p className="text-[13px] text-[#0d1e25] leading-relaxed mb-2">
                            {evt.description}
                          </p>
                        )}

                        {/* Interactive Glossary Tags */}
                        {evt.glossaryTags && evt.glossaryTags.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-[#d4e5ef]/70">
                            <span className="text-[10px] text-[#514532] font-semibold flex items-center gap-0.5">
                              <span className="material-symbols-outlined text-[12px]">menu_book</span>
                              <span>용어풀이:</span>
                            </span>
                            {evt.glossaryTags.map((tag) => (
                              <button
                                key={tag}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const found = GLOSSARY_DATA.find((g) =>
                                    g.term.includes(tag) || g.keywords.some((k) => k.includes(tag))
                                  );
                                  openGlossary(found?.id);
                                }}
                                className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white hover:bg-[#ffdeac] text-[#7e5700] border border-[#7e5700]/30 transition-all flex items-center gap-0.5"
                              >
                                <span>#{tag}</span>
                                <span className="material-symbols-outlined text-[10px]">help</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="bg-[#f8fbfe] border border-dashed border-[#d6c4ac] p-6 rounded-2xl text-center space-y-3">
                  <span className="material-symbols-outlined text-[36px] text-[#7e5700]/70">
                    edit_note
                  </span>
                  <p className="text-[14px] font-bold text-[#0d1e25]">
                    아직 {selectedHiveId}번 벌통의 개별 양봉일지가 없습니다.
                  </p>
                  <p className="text-[12px] text-[#514532] leading-relaxed">
                    음성일지에서 <span className="font-bold text-[#7e5700]">"{selectedHiveId}번 벌통..."</span>이라고 말씀하시면<br />
                    AI가 자동으로 분석하여 이 벌통의 이력으로 연결됩니다.
                  </p>
                  {onSelectHiveForRecord && (
                    <button
                      onClick={() => onSelectHiveForRecord(selectedHiveId)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#7e5700] hover:bg-[#604100] text-white font-bold text-[12px] shadow-xs cursor-pointer transition-all active:scale-95"
                    >
                      <span className="material-symbols-outlined text-[16px]">mic</span>
                      <span>{selectedHiveId}번 벌통 음성일지 기록하기</span>
                    </button>
                  )}
                </div>
              )}
            </section>
          </>
        )}

        {/* SUBTAB 3: 벌통 목록 (1~N호) */}
        {subTab === 'grid' && (
          <div className="flex flex-col gap-3">
            {/* Quick Scale Selector Pills */}
            <div className="bg-white p-2.5 rounded-2xl border border-[#d6c4ac] flex flex-col gap-1.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-[#514532] flex items-center gap-1">
                  <span className="material-symbols-outlined text-[#7e5700] text-[15px]">settings</span>
                  <span>벌통 규모 빠른 변경 (내 정보 연동):</span>
                </span>
                <span className="text-[11px] font-black text-[#7e5700]">
                  현재 {hiveCount}군 운용
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {[10, 20, 50, 100, 200].map((cnt) => {
                  const isCur = hiveCount === cnt;
                  return (
                    <button
                      key={cnt}
                      onClick={() => handleApplyCount(cnt)}
                      className={`py-1.5 rounded-xl text-[11px] font-black transition-all cursor-pointer ${
                        isCur
                          ? 'bg-[#7e5700] text-white shadow-xs'
                          : 'bg-[#f4faff] hover:bg-[#ffdeac]/60 text-[#0d1e25] border border-[#d6c4ac]/60'
                      }`}
                    >
                      {cnt}군
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Status Filter Pills */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {[
                { id: 'all', label: `전체 (${activeHives.length})` },
                { id: '정상', label: `정상 (${countNormal})` },
                { id: '채밀가능', label: `채밀가능 (${countHoney})` },
                { id: '주의', label: `주의 (${countWarning})` },
                { id: '내검필요', label: `내검필요 (${countCheck})` }
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilterStatus(f.id)}
                  className={`px-3 py-1.5 rounded-full text-[12px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                    filterStatus === f.id
                      ? 'bg-[#7e5700] text-white shadow-xs'
                      : 'bg-white text-[#514532] border border-[#d6c4ac]/60 hover:bg-[#d9ebf5]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Selected Hive Summary Card */}
            <div className="bg-white border-2 border-[#7e5700]/70 rounded-2xl p-4 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="text-xs font-bold text-[#7e5700] bg-[#ffdeac] px-2 py-0.5 rounded">
                    {currentHive.queenGen}
                  </span>
                  <h3 className="text-[18px] font-bold text-[#0d1e25] mt-1">
                    {currentHive.name}
                  </h3>
                </div>
                <span
                  className={`text-[12px] font-bold px-2.5 py-1 rounded-md ${
                    currentHive.status === '주의'
                      ? 'bg-[#ba1a1a] text-white'
                      : currentHive.status === '채밀가능'
                      ? 'bg-[#ffb300] text-[#6b4900]'
                      : 'bg-[#a0f399] text-[#217128]'
                  }`}
                >
                  {currentHive.status}
                </span>
              </div>
              <p className="text-[13px] text-[#514532] mb-3">{currentHive.notes}</p>
              
              <div className="grid grid-cols-3 gap-2 bg-[#f4faff] p-2.5 rounded-xl text-center border border-[#d4e5ef]">
                <div>
                  <span className="text-[11px] text-[#514532] block">산란율</span>
                  <span className="font-bold text-[14px] text-[#0d1e25]">
                    {currentHive.eggRate}%
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-[#514532] block">예상 채밀량</span>
                  <span className="font-bold text-[14px] text-[#7e5700]">
                    {currentHive.honeyYield}kg
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-[#514532] block">최근 내검</span>
                  <span className="font-bold text-[13px] text-[#0d1e25]">
                    {hiveInspectionSummary?.lastCheckDate || currentHive.lastCheckDate}
                  </span>
                </div>
              </div>

              {/* 최근 내검 상태 (먹이 / 여왕벌 상태) */}
              <div className="mt-2.5 p-3 rounded-2xl bg-[#fffbf2] border border-[#ffdeac] space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-black text-[#7e5700] flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">assignment_turned_in</span>
                    <span>최근 내검 상태</span>
                  </span>
                  <span className="text-[11px] font-bold text-[#514532]">
                    {hiveInspectionSummary?.lastCheckDate ? `${hiveInspectionSummary.lastCheckDate} 기록` : '기본'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center pt-0.5">
                  <div className="bg-white/95 p-2 rounded-xl border border-[#ffdeac]/80">
                    <span className="text-[10px] text-[#514532] block font-bold">먹이 상태</span>
                    <span
                      className={`text-[13px] font-black ${
                        hiveInspectionSummary?.feedStatus === '부족'
                          ? 'text-[#ba1a1a]'
                          : hiveInspectionSummary?.feedStatus === '충분'
                          ? 'text-[#1b6d24]'
                          : 'text-[#0d1e25]'
                      }`}
                    >
                      {hiveInspectionSummary?.feedStatus ? hiveInspectionSummary.feedStatus : '미기록'}
                    </span>
                  </div>
                  <div className="bg-white/95 p-2 rounded-xl border border-[#ffdeac]/80">
                    <span className="text-[10px] text-[#514532] block font-bold">여왕벌</span>
                    <span className="text-[13px] font-black text-[#0d1e25]">
                      {hiveInspectionSummary?.queenStatus
                        ? hiveInspectionSummary.queenStatus
                        : hiveInspectionSummary?.queenSeen === true
                        ? '확인 (활동중)'
                        : hiveInspectionSummary?.queenSeen === false
                        ? '무왕/미확인'
                        : '미기록'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Connected Breeder Queen Section for this Hive */}
              {(() => {
                const linkedBreederQueen = breederQueens.find((q) => q.hiveId === currentHive.id);
                if (linkedBreederQueen) {
                  return (
                    <div className="mt-3 bg-[#fff9ed] border-2 border-[#7e5700] p-3 rounded-2xl space-y-2.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[#7e5700] text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                            crown
                          </span>
                          <span className="font-black text-[13px] text-[#7e5700]">
                            연계된 우수 종봉: [{linkedBreederQueen.generation}] {linkedBreederQueen.name}
                          </span>
                        </div>
                        <span className="text-[10px] bg-[#7e5700] text-white px-2 py-0.5 rounded-full font-bold">
                          가계도 연동됨
                        </span>
                      </div>

                      {/* 4 Core Traits Continuously Logged */}
                      <div className="grid grid-cols-4 gap-1.5 bg-white p-2 rounded-xl border border-[#ffdeac] text-center">
                        <div>
                          <span className="text-[9px] text-[#514532] block font-bold">🍯 채밀력</span>
                          <span className="text-[14px] font-black text-[#7e5700]">{linkedBreederQueen.honeyHarvestKg}kg</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-[#514532] block font-bold">🐝 프로폴리스</span>
                          <span className="text-[14px] font-black text-[#0277bd]">{linkedBreederQueen.propolisYieldG}g</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-[#514532] block font-bold">👑 로열제리</span>
                          <span className="text-[14px] font-black text-[#d81b60]">{linkedBreederQueen.royalJellyYieldG}g</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-[#514532] block font-bold">💪 세력</span>
                          <span className="text-[14px] font-black text-[#1b6d24]">{linkedBreederQueen.colonyStrength}매</span>
                        </div>
                      </div>

                      {/* Action buttons: 수치 계속 기록 & 가계도에서 보기 & 딸 등록 */}
                      <div className="flex gap-1.5 pt-1">
                        <button
                          onClick={() => setMetricModalQueen(linkedBreederQueen)}
                          className="flex-1 py-2 bg-[#7e5700] hover:bg-[#604100] text-white text-[11px] font-black rounded-xl shadow-2xs flex items-center justify-center gap-1 cursor-pointer active:scale-95 transition-all"
                        >
                          <span className="material-symbols-outlined text-[14px]">edit_note</span>
                          <span>형질 수치 계속기록</span>
                        </button>
                        <button
                          onClick={() => {
                            setSelectedQueenId(linkedBreederQueen.id);
                            setSubTab('lineage');
                            setLineageViewMode('tree');
                          }}
                          className="flex-1 py-2 bg-[#f4faff] hover:bg-[#d9ebf5] border border-[#7e5700]/50 text-[#7e5700] text-[11px] font-bold rounded-xl flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[14px]">account_tree</span>
                          <span>가계도에서 보기</span>
                        </button>
                        <button
                          onClick={() => handleOpenRegisterDaughter(linkedBreederQueen.id)}
                          className="px-2.5 py-2 bg-white hover:bg-[#ffdeac]/40 border border-[#d6c4ac] text-[#0d1e25] text-[11px] font-bold rounded-xl flex items-center justify-center cursor-pointer"
                          title="후대(딸) 여왕벌 등록"
                        >
                          <span className="material-symbols-outlined text-[14px]">add</span>
                          <span>딸 등록</span>
                        </button>
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <div className="mt-3 bg-[#f8fbfe] border border-dashed border-[#d6c4ac] p-3 rounded-2xl flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-[#ffdeac] text-[#7e5700] flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-[18px]">crown</span>
                        </div>
                        <div>
                          <span className="text-[12px] font-black text-[#0d1e25] block">
                            종봉 미등록 벌통
                          </span>
                          <span className="text-[10px] text-[#514532]">
                            이 벌통(#{currentHive.id})을 종봉으로 등록하고 채밀력·프로폴리스·로열제리 등의 수치를 가계도에 누적 기록하세요.
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleOpenRegisterForHive(currentHive.id)}
                        className="px-3 py-2 bg-[#7e5700] hover:bg-[#604100] text-white text-[11px] font-black rounded-xl shrink-0 cursor-pointer active:scale-95 transition-all flex items-center gap-1 shadow-xs"
                      >
                        <span className="material-symbols-outlined text-[14px]">add</span>
                        <span>종봉 등록</span>
                      </button>
                    </div>
                  );
                }
              })()}

              {/* 양봉일지 이력 */}
              <div className="mt-3.5 space-y-2 border-t border-[#d4e5ef]/70 pt-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-[13px] font-black text-[#0d1e25] flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[#7e5700] text-[17px]">history_edu</span>
                    <span>{currentHive.name} 양봉일지 이력</span>
                  </h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#ffdeac] text-[#7e5700]">
                    {selectedHiveJournals.length}건
                  </span>
                </div>

                {selectedHiveJournals.length > 0 ? (
                  <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                    {selectedHiveJournals.map((log) => (
                      <div
                        key={log.id}
                        className="bg-[#f8fbfe] border border-[#d6c4ac]/70 rounded-xl p-2.5 text-[12px] space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-[#0d1e25]">{log.date}</span>
                            <span className="text-[11px] text-[#514532]">{log.timestamp}</span>
                            {log.category && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-[#e7f6ff] text-[#0277bd]">
                                {log.category}
                              </span>
                            )}
                          </div>
                          {log.status && (
                            <span
                              className={`px-2 py-0.2 rounded-full text-[10px] font-extrabold ${
                                log.status === '주의' ? 'bg-[#ba1a1a] text-white' : 'bg-[#a0f399] text-[#1b6d24]'
                              }`}
                            >
                              {log.status}
                            </span>
                          )}
                        </div>

                        <p className="text-[12.5px] text-[#0d1e25] leading-snug">
                          {log.aiSummary || log.text}
                        </p>

                        {(log.inspectionDetails?.feedStatus ||
                          log.inspectionDetails?.queenStatus ||
                          log.inspectionDetails?.queenSeen !== undefined ||
                          log.inspectionDetails?.diseaseStatus) && (
                          <div className="flex flex-wrap gap-1.5 pt-0.5">
                            {log.inspectionDetails.feedStatus && (
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  log.inspectionDetails.feedStatus === '부족'
                                    ? 'bg-[#ba1a1a]/15 text-[#ba1a1a] border border-[#ba1a1a]/25'
                                    : 'bg-[#ffdeac]/60 text-[#7e5700]'
                                }`}
                              >
                                먹이: {log.inspectionDetails.feedStatus}
                              </span>
                            )}
                            {(log.inspectionDetails.queenStatus ||
                              log.inspectionDetails.queenSeen !== undefined) && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#e7f6ff] text-[#0277bd] border border-[#0277bd]/20">
                                여왕벌: {log.inspectionDetails.queenStatus || (log.inspectionDetails.queenSeen ? '확인' : '미확인')}
                              </span>
                            )}
                            {log.inspectionDetails.diseaseStatus && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#ffebee] text-[#c62828] border border-[#c62828]/20">
                                {log.inspectionDetails.diseaseStatus}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-[#f8fbfe] border border-dashed border-[#d6c4ac] p-2.5 rounded-xl text-center text-[11px] text-[#514532]">
                    아직 {currentHive.name}의 양봉일지가 없습니다.
                  </div>
                )}
              </div>

              {onSelectHiveForRecord && (
                <button
                  onClick={() => onSelectHiveForRecord(currentHive.id)}
                  className="w-full mt-3 py-2 bg-[#7e5700] hover:bg-[#604100] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  이 벌통으로 내검 기록 작성
                </button>
              )}
            </div>

            {/* Grid of Hives */}
            <div className="grid grid-cols-5 gap-2 max-h-[460px] overflow-y-auto p-1 border border-[#d6c4ac]/40 rounded-2xl bg-[#f8fbfe]">
              {filteredHives.map((hive) => {
                const isSelected = hive.id === selectedHiveId;
                const isBreeder = breederQueens.some((q) => q.hiveId === hive.id);
                const hasJournal = allJournals.some((j) => isLogForHive(j, hive.id));
                return (
                  <button
                    key={hive.id}
                    onClick={() => setSelectedHiveId(hive.id)}
                    className={`h-14 rounded-xl border flex flex-col items-center justify-center p-1 relative transition-all cursor-pointer ${
                      isSelected
                        ? 'border-2 border-[#7e5700] bg-[#ffdeac]/80 font-bold shadow-xs'
                        : hive.status === '주의'
                        ? 'border-[#ba1a1a]/40 bg-[#ffdad6]/40 text-[#ba1a1a]'
                        : hive.status === '채밀가능'
                        ? 'border-[#ffb300] bg-[#ffb300]/15'
                        : isBreeder
                        ? 'border-[#7e5700]/40 bg-[#fffdf9] hover:bg-[#ffdeac]/30'
                        : 'border-[#d6c4ac]/60 bg-white hover:bg-[#d9ebf5]'
                    }`}
                  >
                    {isBreeder && (
                      <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#7e5700] text-white rounded-full flex items-center justify-center text-[9px] shadow-2xs">
                        👑
                      </span>
                    )}
                    {hasJournal && (
                      <span
                        className="absolute top-1 left-1.5 w-2 h-2 rounded-full bg-[#1b6d24] ring-1 ring-white"
                        title="양봉일지 연동됨"
                      />
                    )}
                    <span className="text-[13px] font-bold text-[#0d1e25]">
                      #{hive.id}
                    </span>
                    <span
                      className={`text-[9px] px-1 rounded-sm ${
                        hive.status === '주의'
                          ? 'text-[#ba1a1a] font-bold'
                          : hive.status === '채밀가능'
                          ? 'text-[#7e5700] font-bold'
                          : 'text-[#514532]'
                      }`}
                    >
                      {hive.status}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Dynamic Hive Count Custom Modal */}
      {isCountModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl border-2 border-[#7e5700] animate-in fade-in zoom-in duration-150 space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#ffdeac] text-[#7e5700] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">hive</span>
                </div>
                <div>
                  <h3 className="font-extrabold text-[17px] text-[#0d1e25]">
                    벌통 수량(규모) 설정
                  </h3>
                  <p className="text-[11px] text-[#514532]">내 정보의 관리벌통과 연동됩니다</p>
                </div>
              </div>
              <button
                onClick={() => setIsCountModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#514532] hover:bg-[#d9ebf5]"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Presets */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-[#514532]">빠른 선택:</span>
              <div className="grid grid-cols-5 gap-1.5">
                {[10, 20, 50, 100, 200].map((cnt) => (
                  <button
                    key={cnt}
                    onClick={() => setCustomCountInput(cnt)}
                    className={`py-2 rounded-xl text-[12px] font-black transition-all cursor-pointer ${
                      customCountInput === cnt
                        ? 'bg-[#7e5700] text-white'
                        : 'bg-[#f4faff] border border-[#d6c4ac] text-[#0d1e25] hover:bg-[#ffdeac]/50'
                    }`}
                  >
                    {cnt}군
                  </button>
                ))}
              </div>
            </div>

            {/* Direct Input */}
            <div className="bg-[#f4faff] p-3.5 rounded-2xl border border-[#d4e5ef] space-y-2">
              <label className="text-[11px] font-bold text-[#514532] block">
                직접 수량 입력 (1 ~ 2,000군):
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCustomCountInput((p) => Math.max(1, p - 10))}
                  className="px-2.5 py-2 bg-white border border-[#d6c4ac] rounded-xl font-bold text-[13px] hover:bg-[#d9ebf5]"
                >
                  -10
                </button>
                <button
                  onClick={() => setCustomCountInput((p) => Math.max(1, p - 1))}
                  className="px-2.5 py-2 bg-white border border-[#d6c4ac] rounded-xl font-bold text-[13px] hover:bg-[#d9ebf5]"
                >
                  -1
                </button>
                <input
                  type="number"
                  min="1"
                  max="2000"
                  value={customCountInput}
                  onChange={(e) => setCustomCountInput(Math.max(1, Number(e.target.value) || 1))}
                  className="flex-1 py-2 px-2 text-center text-[16px] font-black bg-white border-2 border-[#7e5700]/50 rounded-xl focus:outline-none"
                />
                <button
                  onClick={() => setCustomCountInput((p) => Math.min(2000, p + 1))}
                  className="px-2.5 py-2 bg-white border border-[#d6c4ac] rounded-xl font-bold text-[13px] hover:bg-[#d9ebf5]"
                >
                  +1
                </button>
                <button
                  onClick={() => setCustomCountInput((p) => Math.min(2000, p + 10))}
                  className="px-2.5 py-2 bg-white border border-[#d6c4ac] rounded-xl font-bold text-[13px] hover:bg-[#d9ebf5]"
                >
                  +10
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleApplyCount(customCountInput)}
                className="flex-1 py-3 bg-[#7e5700] hover:bg-[#604100] text-white font-extrabold rounded-xl text-[13px] shadow-xs cursor-pointer"
              >
                {customCountInput}군으로 적용하기
              </button>
              <button
                onClick={() => setIsCountModalOpen(false)}
                className="px-4 py-3 bg-white border border-[#d6c4ac] text-[#514532] font-bold rounded-xl text-[13px] cursor-pointer"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Queen Detail Modal */}
      {showQueenDetailModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl border-2 border-[#7e5700] animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#ffb300] flex items-center justify-center text-[#6b4900]">
                  <span
                    className="material-symbols-outlined text-[20px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    star
                  </span>
                </div>
                <h3 className="font-bold text-[18px] text-[#0d1e25]">
                  여왕벌 Q2024-A 상세
                </h3>
              </div>
              <button
                onClick={() => setShowQueenDetailModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#514532] hover:bg-[#d9ebf5]"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="space-y-2.5 text-[13px] text-[#0d1e25]">
              <div className="bg-[#f4faff] p-3 rounded-xl border border-[#d4e5ef] space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-[#514532]">혈통 및 세대:</span>
                  <span className="font-bold">이탈리안 75% + 카니올란 25% (F2)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#514532]">모계(Mother):</span>
                  <span className="font-bold">Q2023-M (지리산 1호계)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#514532]">교미 비행일:</span>
                  <span className="font-bold">2024년 4월 5일</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#514532]">공식 입식일:</span>
                  <span className="font-bold">2024년 4월 10일 (#12 벌통)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#514532]">특성 지수:</span>
                  <span className="font-bold text-[#1b6d24]">온순성 최상 / 수밀력 우수</span>
                </div>
              </div>
              <p className="text-[12px] text-[#514532] leading-relaxed">
                * 본 여왕벌은 인공 수정 및 우수 교미장 격리 수정을 거쳐 유전 형질이
                검증된 프리미엄 종봉입니다.
              </p>
            </div>

            <button
              onClick={() => setShowQueenDetailModal(false)}
              className="w-full mt-4 py-2.5 bg-[#7e5700] text-white font-bold rounded-xl shadow-xs"
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* Beekeeping Glossary Modal for Consumers */}
      <GlossaryModal
        isOpen={showGlossaryModal}
        onClose={() => setShowGlossaryModal(false)}
        initialTermId={activeGlossaryTermId}
      />

      {/* Breeder Queen Registration Modal */}
      <BreederRegisterModal
        isOpen={isRegisterModalOpen}
        onClose={() => {
          setIsRegisterModalOpen(false);
          setEditingQueen(null);
        }}
        onSave={handleSaveQueen}
        existingQueens={breederQueens}
        preselectedParentId={registerParentId}
        preselectedHiveId={registerHiveId}
        editingQueen={editingQueen}
        maxHiveCount={hiveCount}
      />

      {/* Breeder Metric Record Modal (Continuous Tracking) */}
      {metricModalQueen && (
        <BreederMetricRecordModal
          isOpen={Boolean(metricModalQueen)}
          onClose={() => setMetricModalQueen(null)}
          queen={metricModalQueen}
          onAddMetricLog={handleAddMetricLog}
        />
      )}

      {/* Breeder Queen Detail Modal */}
      {detailModalQueen && (
        <BreederDetailModal
          isOpen={Boolean(detailModalQueen)}
          onClose={() => setDetailModalQueen(null)}
          queen={detailModalQueen}
          allQueens={breederQueens}
          onOpenMetricModal={(queen) => setMetricModalQueen(queen)}
          onOpenRegisterDaughterModal={(parentId) => {
            setDetailModalQueen(null);
            handleOpenRegisterDaughter(parentId);
          }}
          onEditQueen={(queen) => {
            setDetailModalQueen(null);
            setEditingQueen(queen);
            setIsRegisterModalOpen(true);
          }}
          onDeleteQueen={handleDeleteQueen}
          onGoToHiveRecord={(hId) => {
            setDetailModalQueen(null);
            if (onSelectHiveForRecord) onSelectHiveForRecord(hId);
          }}
        />
      )}
    </div>
  );
};
