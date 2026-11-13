import React, { useState, useMemo } from 'react';
import { GLOSSARY_DATA, GLOSSARY_CATEGORIES, GlossaryTerm } from '../data/glossaryData';

interface GlossaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTermId?: string | null;
}

export const GlossaryModal: React.FC<GlossaryModalProps> = ({
  isOpen,
  onClose,
  initialTermId = null
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTerm, setSelectedTerm] = useState<GlossaryTerm | null>(() => {
    if (initialTermId) {
      return GLOSSARY_DATA.find(t => t.id === initialTermId) || null;
    }
    return null;
  });

  // Filtered terms
  const filteredTerms = useMemo(() => {
    return GLOSSARY_DATA.filter(item => {
      const matchesCat = selectedCategory === 'all' || item.category === selectedCategory;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        item.term.toLowerCase().includes(q) ||
        item.simpleSummary.toLowerCase().includes(q) ||
        item.detailDescription.toLowerCase().includes(q) ||
        item.keywords.some(k => k.toLowerCase().includes(q));

      return matchesCat && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl p-4 sm:p-6 max-w-xl w-full shadow-2xl border-2 border-[#7e5700] my-auto max-h-[92vh] flex flex-col animate-in fade-in zoom-in duration-200">
        {/* Modal Top Header */}
        <div className="flex justify-between items-center border-b border-[#d6c4ac] pb-3 mb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#ffb300] to-[#7e5700] text-white flex items-center justify-center font-bold shadow-xs">
              <span className="material-symbols-outlined text-[22px]">auto_stories</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-extrabold text-[17px] text-[#0d1e25]">
                  소비자를 위한 쉬운 양봉용어사전
                </h3>
                <span className="bg-[#a0f399]/60 text-[#1b6d24] text-[10px] font-black px-2 py-0.5 rounded-full border border-[#1b6d24]/20">
                  꿀이력 해설
                </span>
              </div>
              <p className="text-[11px] text-[#514532]">
                QR 이력에 나오는 어려운 양봉 전문용어를 알기 쉽게 풀이해 드립니다.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-[#514532] hover:bg-[#d9ebf5] transition-colors shrink-0"
          >
            <span className="material-symbols-outlined text-[24px]">close</span>
          </button>
        </div>

        {/* Search Box */}
        <div className="relative mb-3 shrink-0">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#514532] text-[20px]">
            search
          </span>
          <input
            type="text"
            placeholder="궁금한 용어를 검색해보세요 (예: 봉개, 완숙, 소초광, 탄소동위원소...)"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-[#f4faff] border border-[#d4e5ef] focus:border-[#7e5700] rounded-2xl pl-10 pr-9 py-2.5 text-[13px] text-[#0d1e25] placeholder:text-[#514532]/60 focus:outline-none transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#514532] hover:text-[#0d1e25]"
            >
              <span className="material-symbols-outlined text-[18px]">cancel</span>
            </button>
          )}
        </div>

        {/* Category Horizontal Scroll Chips */}
        <div className="flex gap-1.5 overflow-x-auto pb-2 mb-2 scrollbar-none shrink-0">
          {GLOSSARY_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => {
                setSelectedCategory(cat.id);
                setSelectedTerm(null);
              }}
              className={`px-3 py-1.5 rounded-xl text-[12px] font-bold whitespace-nowrap transition-all flex items-center gap-1 shrink-0 ${
                selectedCategory === cat.id
                  ? 'bg-[#7e5700] text-white shadow-xs'
                  : 'bg-[#f4faff] text-[#514532] border border-[#d4e5ef] hover:bg-[#d9ebf5]'
              }`}
            >
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Selected Term Detail Card (If Clicked) */}
        {selectedTerm && (
          <div className="mb-3 bg-gradient-to-br from-[#ffdeac]/30 via-white to-[#f4faff] border-2 border-[#7e5700] rounded-2xl p-4 shadow-md relative shrink-0 animate-in fade-in slide-in-from-top-2 duration-150">
            <button
              onClick={() => setSelectedTerm(null)}
              className="absolute top-3 right-3 text-[#514532] hover:text-[#0d1e25]"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>

            <div className="flex items-center gap-2 mb-1.5">
              <span className="material-symbols-outlined text-[#7e5700] text-[22px]">
                {selectedTerm.icon}
              </span>
              <h4 className="text-[17px] font-black text-[#0d1e25]">
                {selectedTerm.term}
              </h4>
              {selectedTerm.hanja && (
                <span className="text-[12px] text-[#514532] font-semibold">
                  ({selectedTerm.hanja})
                </span>
              )}
              {selectedTerm.badge && (
                <span className="bg-[#1b6d24] text-white text-[10px] font-bold px-2 py-0.5 rounded-full ml-auto mr-6">
                  {selectedTerm.badge}
                </span>
              )}
            </div>

            {/* Simple 1-line Consumer Summary */}
            <div className="bg-[#7e5700]/10 text-[#593d00] p-2.5 rounded-xl font-bold text-[13px] mb-2.5 flex items-start gap-1.5">
              <span className="material-symbols-outlined text-[#7e5700] text-[18px] shrink-0 mt-0.5">
                tips_and_updates
              </span>
              <span>{selectedTerm.simpleSummary}</span>
            </div>

            {/* Detailed Explanation */}
            <p className="text-[12.5px] text-[#0d1e25] leading-relaxed mb-2.5">
              {selectedTerm.detailDescription}
            </p>

            {/* Consumer Shopping Tip */}
            <div className="bg-white border border-[#d6c4ac] p-2.5 rounded-xl text-[11.5px] flex items-start gap-2">
              <span className="material-symbols-outlined text-[#1b6d24] text-[18px] shrink-0">
                eco
              </span>
              <div className="text-[#0d1e25]">
                <strong className="text-[#1b6d24] block mb-0.5">소비자 상식 팁</strong>
                <span>{selectedTerm.consumerTip}</span>
              </div>
            </div>
          </div>
        )}

        {/* Scrollable Terms List */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-2.5">
          {filteredTerms.length === 0 ? (
            <div className="text-center py-10 text-[#514532]">
              <span className="material-symbols-outlined text-[40px] text-[#d6c4ac] block mb-2">
                search_off
              </span>
              <p className="font-bold text-[14px]">검색 결과가 없습니다</p>
              <p className="text-[12px] mt-1">다른 양봉 용어나 키워드로 검색해보세요.</p>
            </div>
          ) : (
            filteredTerms.map(item => {
              const isSelected = selectedTerm?.id === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedTerm(isSelected ? null : item)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#fffde7] border-[#7e5700] shadow-sm'
                      : 'bg-white border-[#d6c4ac]/80 hover:bg-[#f4faff] hover:border-[#7e5700]/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#7e5700] text-[18px]">
                        {item.icon}
                      </span>
                      <h5 className="font-bold text-[15px] text-[#0d1e25]">
                        {item.term}
                      </h5>
                      {item.badge && (
                        <span className="bg-[#a0f399]/50 text-[#1b6d24] text-[10px] font-bold px-1.5 py-0.5 rounded">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-[#514532] font-semibold">
                      {item.categoryLabel}
                    </span>
                  </div>

                  <p className="text-[12px] text-[#514532] line-clamp-2 leading-relaxed">
                    {item.simpleSummary}
                  </p>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#d4e5ef]/60 text-[11px]">
                    <span className="text-[#7e5700] font-bold flex items-center gap-0.5">
                      <span>자세히 보기</span>
                      <span className="material-symbols-outlined text-[14px]">
                        {isSelected ? 'expand_less' : 'arrow_forward'}
                      </span>
                    </span>
                    <span className="text-[#514532]/70 text-[10px]">
                      연관: {item.keywords.slice(0, 3).join(', ')}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Bottom Footer */}
        <div className="pt-3 border-t border-[#d6c4ac] mt-2 shrink-0 flex items-center justify-between text-[11px] text-[#514532]">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[#1b6d24] text-[16px]">
              verified
            </span>
            <span>지리산 설종수 봉장 천연 숙성벌꿀 이력 보증</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#7e5700] text-white font-bold rounded-xl text-[12px] hover:bg-[#604100] active:scale-95 transition-all"
          >
            확인 및 닫기
          </button>
        </div>
      </div>
    </div>
  );
};
