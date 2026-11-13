import React from 'react';
import { TabType } from '../types';

interface BottomNavProps {
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onTabChange }) => {
  const tabs = [
    { id: 'record' as TabType, label: '양봉기록', icon: 'mic' },
    { id: 'honeyLot' as TabType, label: '꿀 이력제', icon: 'inventory_2' },
    { id: 'hives' as TabType, label: '종봉관리', icon: 'hive' },
    { id: 'analysis' as TabType, label: '수익분석', icon: 'payments' },
    { id: 'profile' as TabType, label: '내정보', icon: 'person' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#f4faff]/95 backdrop-blur-xl border-t border-[#d4e5ef] pb-safe shadow-[0_-2px_12px_rgba(13,30,37,0.06)]">
      <div className="max-w-md mx-auto flex h-[68px] items-stretch justify-around px-1">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all relative py-1 cursor-pointer ${
                isActive
                  ? 'text-[#7e5700] font-black'
                  : 'text-[#514532]/75 hover:text-[#0d1e25] font-semibold'
              }`}
            >
              {isActive && (
                <div className="absolute top-0 left-2 right-2 h-1 bg-[#7e5700] rounded-b-full shadow-sm" />
              )}
              <span
                className={`material-symbols-outlined text-[23px] transition-transform ${
                  isActive ? 'scale-110' : ''
                }`}
                style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
              >
                {tab.icon}
              </span>
              <span className="text-[11px] leading-none tracking-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
