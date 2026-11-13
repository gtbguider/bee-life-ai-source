import React, { useState, useMemo, useRef, useEffect } from 'react';
import { BreederQueen } from '../types';

interface BreederFamilyTreeProps {
  queens: BreederQueen[];
  selectedQueenId?: string | null;
  onSelectQueen: (queen: BreederQueen) => void;
  onOpenRegisterModal?: (parentQueenId?: string, hiveId?: number) => void;
  onOpenMetricModal?: (queen: BreederQueen) => void;
  onAddMetricLog?: (queen: BreederQueen) => void;
  onRegisterDaughter?: (parentQueenId?: string, hiveId?: number) => void;
}

// Clean short display name helper (strips redundant '(#' and '여왕벌 ' prefix)
const getShortQueenName = (fullName: string): string => {
  if (!fullName) return '';
  return fullName
    .replace(/\s*\(#.*?\)\s*/g, '')
    .replace(/^여왕벌\s*/, '')
    .trim();
};

export const BreederFamilyTree: React.FC<BreederFamilyTreeProps> = ({
  queens,
  selectedQueenId,
  onSelectQueen,
  onOpenRegisterModal,
  onOpenMetricModal,
  onAddMetricLog,
  onRegisterDaughter
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [genFilter, setGenFilter] = useState<string>('all');
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [viewMode, setViewMode] = useState<'tree' | 'generation'>('tree');
  // Default to 'minimal' (번호+이름만) so it fits on a single mobile screen at a glance!
  const [nodeDensity, setNodeDensity] = useState<'minimal' | 'full'>('minimal');

  const containerRef = useRef<HTMLDivElement>(null);
  const treeContentRef = useRef<HTMLDivElement>(null);

  // Unified callback triggers
  const handleMetric = (q: BreederQueen, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (onOpenMetricModal) onOpenMetricModal(q);
    if (onAddMetricLog) onAddMetricLog(q);
  };

  const handleRegister = (parentId?: string, hiveId?: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (onOpenRegisterModal) onOpenRegisterModal(parentId, hiveId);
    if (onRegisterDaughter) onRegisterDaughter(parentId, hiveId);
  };

  // Group queens into lookup map
  const queensMap = useMemo(() => {
    const map = new Map<string, BreederQueen>();
    queens.forEach((q) => map.set(q.id, q));
    return map;
  }, [queens]);

  // Find root queens (F0 or with parentId === null or parent not in map)
  const rootQueens = useMemo(() => {
    return queens.filter((q) => !q.parentQueenId || !queensMap.has(q.parentQueenId));
  }, [queens, queensMap]);

  // Children mapping
  const childrenMap = useMemo(() => {
    const map = new Map<string, BreederQueen[]>();
    queens.forEach((q) => {
      if (q.parentQueenId) {
        const list = map.get(q.parentQueenId) || [];
        list.push(q);
        map.set(q.parentQueenId, list);
      }
    });
    return map;
  }, [queens]);

  // Group by generation for generation step view
  const generationGroups = useMemo(() => {
    const gens = ['F0', 'F1', 'F2', 'F3'];
    return gens
      .map((g) => ({
        gen: g,
        title: g === 'F0' ? 'F0 원종 모계' : `${g} ${g.replace('F', '')}세대`,
        queens: queens.filter((q) => q.generation === g)
      }))
      .filter((group) => group.queens.length > 0);
  }, [queens]);

  // Filtered search list
  const filteredQueens = useMemo(() => {
    return queens.filter((q) => {
      if (genFilter !== 'all' && q.generation !== genFilter) return false;
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        q.name.toLowerCase().includes(term) ||
        String(q.hiveId).includes(term) ||
        q.breed.toLowerCase().includes(term)
      );
    });
  }, [queens, genFilter, searchTerm]);

  // Auto-fit function to adjust zoom so the full pedigree fits in view on mobile
  const handleFitToScreen = () => {
    if (containerRef.current && treeContentRef.current) {
      const containerWidth = containerRef.current.clientWidth - 24; // minus inner padding
      const contentWidth = treeContentRef.current.scrollWidth;
      if (contentWidth > 0 && containerWidth > 0) {
        if (contentWidth <= containerWidth) {
          setZoomLevel(100);
        } else {
          const computedScale = Math.min(100, Math.max(50, Math.floor((containerWidth / contentWidth) * 100)));
          setZoomLevel(computedScale);
        }
      }
    }
  };

  // Initial auto-fit when mounted or queens change
  useEffect(() => {
    const timer = setTimeout(() => {
      handleFitToScreen();
    }, 150);
    return () => clearTimeout(timer);
  }, [queens.length, nodeDensity]);

  // Mobile-First Queen Node Card Renderer
  const renderTreeNode = (node: BreederQueen) => {
    const children = childrenMap.get(node.id) || [];
    const hasChildren = children.length > 0;
    const isSelected = selectedQueenId === node.id;

    const genBadgeColor =
      node.generation === 'F0'
        ? 'bg-[#7e5700] text-white'
        : node.generation === 'F1'
        ? 'bg-[#0277bd] text-white'
        : node.generation === 'F2'
        ? 'bg-[#1b6d24] text-white'
        : 'bg-[#e65100] text-white';

    const shortName = getShortQueenName(node.name);

    return (
      <div key={node.id} className="flex flex-col items-center">
        {/* Minimal Queen Node: Focused purely on Hive Number + Queen Name */}
        {nodeDensity === 'minimal' ? (
          <div
            onClick={() => onSelectQueen(node)}
            className={`w-[84px] sm:w-[94px] h-[50px] sm:h-[52px] bg-white rounded-xl border transition-all px-1.5 py-1 shadow-2xs flex flex-col justify-between cursor-pointer hover:shadow-xs active:scale-95 text-left relative ${
              isSelected
                ? 'border-2 border-[#7e5700] ring-2 ring-[#ffdeac] bg-[#fffaf0]'
                : 'border-[#d6c4ac] hover:border-[#7e5700]'
            }`}
            title={`${node.name} (${node.generation}) - 탭하여 상세 정보 및 수치 확인`}
          >
            {/* Top row: Hive Number Badge & Generation Pill */}
            <div className="flex items-center justify-between gap-0.5">
              <span className="font-black text-[11px] text-[#7e5700] truncate">
                {node.hiveId > 0 ? `#${node.hiveId}통` : '원종'}
              </span>
              <div className="flex items-center gap-0.5">
                <span className={`text-[8px] font-black px-1 py-0.1 rounded-full leading-tight ${genBadgeColor}`}>
                  {node.generation}
                </span>
                {node.status === '우수판정' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1b6d24]" title="우수판정" />
                )}
              </div>
            </div>

            {/* Bottom row: Clean Queen Name */}
            <div className="flex items-center justify-between gap-0.5">
              <span className="font-extrabold text-[10px] sm:text-[11px] text-[#0d1e25] truncate leading-tight">
                {shortName || node.name}
              </span>
              {node.isFavorite && (
                <span
                  className="material-symbols-outlined text-[#ffb300] text-[11px] shrink-0"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  star
                </span>
              )}
            </div>
          </div>
        ) : (
          /* Full Mode with metrics (if user chooses to expand) */
          <div
            onClick={() => onSelectQueen(node)}
            className={`w-[148px] sm:w-[156px] bg-white rounded-xl border transition-all p-2 shadow-xs cursor-pointer hover:shadow-md ${
              isSelected
                ? 'border-[#7e5700] ring-2 ring-[#ffdeac] bg-[#fffaf0]'
                : 'border-[#d6c4ac] hover:border-[#7e5700]'
            }`}
            title={`${node.name} - 탭하여 상세 정보 확인`}
          >
            <div className="flex items-center justify-between gap-1 mb-1">
              <div className="flex items-center gap-1 min-w-0">
                <span className="w-5 h-5 rounded bg-[#ffdeac] text-[#7e5700] flex items-center justify-center font-black text-[10px] shrink-0">
                  {node.hiveId > 0 ? `#${node.hiveId}` : '원종'}
                </span>
                <span className="font-extrabold text-[11px] text-[#0d1e25] truncate">
                  {node.hiveId > 0 ? `${node.hiveId}번 통` : '원종'}
                </span>
              </div>
              <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-full ${genBadgeColor}`}>
                {node.generation}
              </span>
            </div>

            <p className="font-bold text-[11px] text-[#0d1e25] truncate mb-1">
              {shortName || node.name}
            </p>

            <div className="grid grid-cols-2 gap-0.5 bg-[#f4faff] border border-[#d4e5ef] p-1 rounded text-[9px] text-center mb-1">
              <div>🍯 {node.honeyHarvestKg}k</div>
              <div>🐝 {node.propolisYieldG}g</div>
              <div>👑 {node.royalJellyYieldG}g</div>
              <div>💪 {node.colonyStrength}매</div>
            </div>

            <div className="flex items-center justify-between pt-0.5 text-[10px]">
              <button
                type="button"
                onClick={(e) => handleMetric(node, e)}
                className="text-[#7e5700] font-bold hover:underline"
              >
                +기록
              </button>
              <button
                type="button"
                onClick={(e) => handleRegister(node.id, node.hiveId > 0 ? node.hiveId : undefined, e)}
                className="text-[#7e5700] font-bold hover:underline"
              >
                +딸등록
              </button>
            </div>
          </div>
        )}

        {/* Branching Connectors & Children */}
        {hasChildren && (
          <div className="flex flex-col items-center w-full">
            {/* Vertical stem down from parent */}
            <div className="w-0.5 h-2.5 bg-[#7e5700]/70" />

            {/* Horizontal branch spanning children */}
            <div className="relative flex justify-center w-full">
              {children.length > 1 && (
                <div
                  className="absolute top-0 h-0.5 bg-[#7e5700]/70"
                  style={{
                    left: `calc(${100 / (children.length * 2)}%)`,
                    right: `calc(${100 / (children.length * 2)}%)`
                  }}
                />
              )}

              {/* Children Row with tight gap for mobile single-screen fit */}
              <div className="flex items-start justify-center gap-1.5 sm:gap-2 pt-0">
                {children.map((child) => (
                  <div key={child.id} className="flex flex-col items-center">
                    {/* Vertical stem down to each child */}
                    <div className="w-0.5 h-2.5 bg-[#7e5700]/70" />
                    {renderTreeNode(child)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* Top Header Controls Bar */}
      <div className="bg-white border border-[#d6c4ac] rounded-2xl p-3 shadow-xs space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#7e5700] text-[22px]">account_tree</span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-[15px] font-black text-[#0d1e25]">
                  종봉 계보 가계도
                </h3>
                <span className="text-[11px] font-bold bg-[#ffdeac]/70 text-[#7e5700] px-2 py-0.5 rounded-full">
                  총 {queens.length}두
                </span>
              </div>
              <p className="text-[11px] text-[#514532]">
                핸드폰 한 화면에 다 들어오는 직관적인 통번호 & 여왕벌 이름 계보도
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* View Mode Switcher: Tree vs Generation list */}
            <div className="flex bg-[#f4faff] border border-[#d6c4ac] p-0.5 rounded-xl">
              <button
                type="button"
                onClick={() => setViewMode('tree')}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all ${
                  viewMode === 'tree'
                    ? 'bg-[#7e5700] text-white shadow-2xs'
                    : 'text-[#514532] hover:text-[#0d1e25]'
                }`}
              >
                <span className="material-symbols-outlined text-[13px]">account_tree</span>
                <span>가계도 트리</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('generation')}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all ${
                  viewMode === 'generation'
                    ? 'bg-[#7e5700] text-white shadow-2xs'
                    : 'text-[#514532] hover:text-[#0d1e25]'
                }`}
              >
                <span className="material-symbols-outlined text-[13px]">view_timeline</span>
                <span>세대별 직계</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleRegister(undefined, undefined)}
              className="px-2.5 py-1.5 bg-[#7e5700] hover:bg-[#604100] text-white text-[11px] font-black rounded-xl shadow-xs flex items-center gap-1 cursor-pointer active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[14px]">add_circle</span>
              <span>새 종봉 등록</span>
            </button>
          </div>
        </div>

        {/* Toolbar: Display Style Toggle (통번호+이름만 vs 수치포함) + Gen Filter + Zoom */}
        <div className="flex items-center justify-between gap-2 flex-wrap pt-1.5 border-t border-[#d4e5ef]/70">
          {/* Display Density Switcher: 'minimal' vs 'full' */}
          <div className="flex items-center gap-1 bg-[#f4faff] border border-[#d6c4ac] p-0.5 rounded-lg">
            <button
              type="button"
              onClick={() => setNodeDensity('minimal')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-0.5 transition-all ${
                nodeDensity === 'minimal'
                  ? 'bg-[#7e5700] text-white shadow-2xs'
                  : 'text-[#514532] hover:text-[#0d1e25]'
              }`}
              title="핸드폰 화면에 쏙 들어가도록 벌통 번호와 여왕벌 이름만 표시"
            >
              <span className="material-symbols-outlined text-[12px]">smartphone</span>
              <span>통번호+이름만 (추천)</span>
            </button>
            <button
              type="button"
              onClick={() => setNodeDensity('full')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-0.5 transition-all ${
                nodeDensity === 'full'
                  ? 'bg-[#7e5700] text-white shadow-2xs'
                  : 'text-[#514532] hover:text-[#0d1e25]'
              }`}
              title="노드 안에 채밀·프로폴리스 등 4대 수치 함께 표시"
            >
              <span className="material-symbols-outlined text-[12px]">analytics</span>
              <span>수치 포함</span>
            </button>
          </div>

          {/* Zoom & Fit-to-screen controls */}
          <div className="flex items-center gap-1.5">
            {viewMode === 'tree' && (
              <div className="flex items-center bg-[#f4faff] border border-[#d6c4ac] rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={handleFitToScreen}
                  className="px-2 py-0.5 text-[10px] font-extrabold text-[#7e5700] hover:bg-white rounded flex items-center gap-0.5"
                  title="화면 너비에 맞춰 전체 가계도를 한 화면에 다 보이도록 조절"
                >
                  <span className="material-symbols-outlined text-[12px]">fit_screen</span>
                  <span>한눈에 맞춤</span>
                </button>
                <div className="w-[1px] h-3 bg-[#d6c4ac] mx-0.5" />
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.max(50, z - 10))}
                  className="w-5 h-5 flex items-center justify-center text-[12px] font-bold text-[#514532] hover:bg-white rounded"
                  title="축소"
                >
                  -
                </button>
                <span className="text-[10px] font-bold text-[#0d1e25] px-1">{zoomLevel}%</span>
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.min(120, z + 10))}
                  className="w-5 h-5 flex items-center justify-center text-[12px] font-bold text-[#514532] hover:bg-white rounded"
                  title="확대"
                >
                  +
                </button>
              </div>
            )}

            {/* Quick search input */}
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="통번호·이름 검색..."
                className="w-24 sm:w-32 pl-5 pr-2 py-0.5 bg-[#f4faff] border border-[#d6c4ac] rounded-lg text-[10px] font-medium text-[#0d1e25] focus:outline-none focus:border-[#7e5700]"
              />
              <span className="material-symbols-outlined text-[#514532] text-[12px] absolute left-1 top-1">
                search
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Pedigree Display Canvas */}
      {viewMode === 'tree' ? (
        <div
          ref={containerRef}
          className="bg-[#f8fbfe] border border-[#d6c4ac] rounded-2xl p-3 shadow-inner overflow-x-auto min-h-[300px] relative transition-all"
        >
          {/* Quick Guidance Tag */}
          <div className="flex items-center justify-between text-[10px] text-[#514532] mb-1 px-1">
            <span className="flex items-center gap-1 font-medium">
              <span className="material-symbols-outlined text-[13px] text-[#7e5700]">touch_app</span>
              <span>벌통 카드를 터치하면 아래에서 채밀·프로폴리스 상세 수치를 확인합니다</span>
            </span>
            <span className="font-semibold text-[#7e5700]">
              배율 {zoomLevel}%
            </span>
          </div>

          {/* Scaled Tree Wrapper */}
          <div
            ref={treeContentRef}
            className="flex flex-col items-center justify-center min-w-max pt-1 pb-4 transition-transform duration-200"
            style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
          >
            {rootQueens.map((root) => (
              <div key={root.id} className="mb-4 last:mb-0">
                {renderTreeNode(root)}
              </div>
            ))}

            {rootQueens.length === 0 && (
              <div className="text-center py-8 text-[#514532]">
                <span className="material-symbols-outlined text-[32px] text-[#d6c4ac] mb-1">
                  account_tree
                </span>
                <p className="font-bold text-[12px]">등록된 종봉 가계도 데이터가 없습니다.</p>
                <button
                  type="button"
                  onClick={() => handleRegister(undefined, undefined)}
                  className="mt-2 px-3 py-1.5 bg-[#7e5700] text-white text-xs font-bold rounded-xl"
                >
                  첫 종봉 등록하기
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Generation Step Progression View (F0 -> F1 -> F2 -> F3 side-by-side) */
        <div className="bg-[#f8fbfe] border border-[#d6c4ac] rounded-2xl p-3 shadow-inner space-y-2.5">
          {generationGroups.map((group, gIdx) => (
            <div key={group.gen} className="space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.2 rounded text-[10px] font-black bg-[#7e5700] text-white">
                  {group.gen}
                </span>
                <span className="font-bold text-[12px] text-[#0d1e25]">
                  {group.title} ({group.queens.length}두)
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
                {group.queens.map((q) => {
                  const isSelected = selectedQueenId === q.id;
                  const parentQueen = q.parentQueenId ? queensMap.get(q.parentQueenId) : null;
                  const shortName = getShortQueenName(q.name);

                  return (
                    <div
                      key={q.id}
                      onClick={() => onSelectQueen(q)}
                      className={`p-2 rounded-xl border transition-all cursor-pointer bg-white ${
                        isSelected
                          ? 'border-[#7e5700] ring-2 ring-[#ffdeac] bg-[#fffaf0]'
                          : 'border-[#d6c4ac] hover:border-[#7e5700]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-black text-[11px] text-[#7e5700]">
                          {q.hiveId > 0 ? `#${q.hiveId}통` : '원종'}
                        </span>
                        <span className="text-[9px] font-bold text-[#1b6d24]">
                          {q.status}
                        </span>
                      </div>

                      <p className="font-bold text-[11px] text-[#0d1e25] truncate mb-1">
                        {shortName || q.name}
                      </p>

                      {parentQueen && (
                        <p className="text-[9px] text-[#514532] mb-1 truncate">
                          모계: {parentQueen.hiveId > 0 ? `#${parentQueen.hiveId}통` : '원종'} ({parentQueen.generation})
                        </p>
                      )}

                      <div className="flex justify-between text-[9px] bg-[#f4faff] px-1 py-0.5 rounded border border-[#d4e5ef]">
                        <span className="text-[#7e5700] font-bold">🍯{q.honeyHarvestKg}k</span>
                        <span className="text-[#0277bd] font-bold">🐝{q.propolisYieldG}g</span>
                        <span className="text-[#1b6d24] font-bold">💪{q.colonyStrength}매</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {gIdx < generationGroups.length - 1 && (
                <div className="flex justify-center py-0.5 text-[#7e5700]/70">
                  <span className="material-symbols-outlined text-[14px]">arrow_downward</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Search results quick list if user typed in search box */}
      {searchTerm && (
        <div className="bg-white border border-[#d6c4ac] rounded-2xl p-3 shadow-xs">
          <h4 className="text-[12px] font-bold text-[#0d1e25] mb-1.5 flex items-center gap-1">
            <span className="material-symbols-outlined text-[#7e5700] text-[15px]">search</span>
            <span>검색 결과 ({filteredQueens.length}건)</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {filteredQueens.map((q) => (
              <div
                key={q.id}
                onClick={() => onSelectQueen(q)}
                className="p-2 bg-[#f4faff] border border-[#d4e5ef] rounded-xl flex items-center justify-between hover:border-[#7e5700] cursor-pointer transition-all"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-[12px] text-[#0d1e25]">
                      #{q.hiveId} {getShortQueenName(q.name)}
                    </span>
                    <span className="text-[9px] font-extrabold bg-[#ffdeac] text-[#7e5700] px-1 rounded">
                      {q.generation}
                    </span>
                  </div>
                  <span className="text-[10px] text-[#514532]">
                    채밀 {q.honeyHarvestKg}kg · 프로폴 {q.propolisYieldG}g · 로열 {q.royalJellyYieldG}g
                  </span>
                </div>
                <span className="material-symbols-outlined text-[#7e5700] text-[16px]">chevron_right</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
