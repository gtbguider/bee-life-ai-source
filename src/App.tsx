import React, { useState, useEffect } from 'react';
import { AppRoute, TabType, VoiceLogItem, WeatherInfo } from './types';
import {
  initialWeather,
  initialVoiceLogs,
  singleHiveLogs
} from './data/mockData';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { LandingView } from './components/LandingView';
import { ConsumerView } from './components/ConsumerView';
import { PublicHoneyTracePage } from './components/PublicHoneyTracePage';
import { RecordView } from './components/RecordView';
import { HoneyLotView } from './components/HoneyLotView';
import { HivesView } from './components/HivesView';
import { AnalysisView } from './components/AnalysisView';
import { TraceView } from './components/TraceView';
import { ProfileView } from './components/ProfileView';
import { AnalysisModal } from './components/AnalysisModal';
import { ReportModal } from './components/ReportModal';
import { HiveSelectModal } from './components/HiveSelectModal';
import { LoginModal } from './components/LoginModal';
import {
  loadUserProfile,
  saveUserProfile,
  loadUserProfileWithFirestore,
  saveUserProfileWithFirestore,
  UserProfile
} from './services/userProfile';
import { useAuth } from './contexts/AuthContext';

export default function App() {
  const { user, loading } = useAuth();
  const [isBeekeeperLoginModalOpen, setIsBeekeeperLoginModalOpen] = useState<boolean>(false);
  // Public Trace URL parameter (/trace/:publicTraceId)
  const [publicTraceId, setPublicTraceId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      if (pathname.startsWith('/trace/')) {
        return decodeURIComponent(pathname.slice('/trace/'.length).split('/')[0] || '');
      }
    }
    return null;
  });

  // Top-level Application Route: '/' -> landing, '/beekeeper' -> beekeeper, '/consumer' -> consumer
  const [currentRoute, setCurrentRoute] = useState<AppRoute>(() => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      if (pathname.startsWith('/beekeeper')) return 'beekeeper';
      if (pathname.startsWith('/consumer')) return 'consumer';
    }
    return 'landing';
  });

  // Beekeeper Sub-Tab state (defaulting to 'record' for immediate voice inspection entry)
  const [currentTab, setCurrentTab] = useState<TabType>('record');
  const [previousTab, setPreviousTab] = useState<TabType>('record');
  const [autoOpenVoiceRecord, setAutoOpenVoiceRecord] = useState<boolean>(false);

  const [userProfile, setUserProfile] = useState<UserProfile>(() => loadUserProfile());
  const [targetHives, setTargetHives] = useState<string>(() => `#1 ~ #${loadUserProfile().hiveCount || 50}`);
  const [appWeather, setAppWeather] = useState<WeatherInfo>(initialWeather);
  const [voiceLogs, setVoiceLogs] = useState<VoiceLogItem[]>(initialVoiceLogs);
  const [singleLogs, setSingleLogs] = useState<VoiceLogItem[]>(singleHiveLogs);

  // Modals
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState<boolean>(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [isHiveSelectModalOpen, setIsHiveSelectModalOpen] = useState<boolean>(false);

  // Synchronize browser history and popstate (supports browser back/forward and direct refresh)
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path.startsWith('/trace/')) {
        const extractedId = decodeURIComponent(path.slice('/trace/'.length).split('/')[0] || '');
        setPublicTraceId(extractedId);
        return;
      }
      setPublicTraceId(null);
      if (path.startsWith('/beekeeper')) {
        setCurrentRoute('beekeeper');
      } else if (path.startsWith('/consumer')) {
        setCurrentRoute('consumer');
      } else {
        setCurrentRoute('landing');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Update browser document title based on current top-level route
  useEffect(() => {
    if (publicTraceId !== null) {
      document.title = '소비자 꿀 생산 이력 확인 | 농업회사법인 허니비테코 주식회사';
    } else if (currentRoute === 'landing') {
      document.title = '농업회사법인 허니비테코 주식회사 - 스마트 양봉';
    } else if (currentRoute === 'beekeeper') {
      document.title = '양봉인 서비스 | 농업회사법인 허니비테코 주식회사';
    } else if (currentRoute === 'consumer') {
      document.title = '소비자 안심 꿀 이력제 | 농업회사법인 허니비테코 주식회사';
    }
  }, [currentRoute, publicTraceId]);

  // Robust Route Navigation
  const navigateTo = (route: AppRoute, tab?: TabType, options?: { autoMic?: boolean }) => {
    setPublicTraceId(null);
    setCurrentRoute(route);
    if (tab) {
      setCurrentTab(tab);
    } else if (route === 'beekeeper' && (currentTab === 'home' || !currentTab)) {
      setCurrentTab('record');
    }

    if (options?.autoMic) {
      setAutoOpenVoiceRecord(true);
    }

    const path = route === 'landing' ? '/' : `/${route}`;
    if (window.location.pathname !== path) {
      window.history.pushState({ route }, '', path);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Load cloud profile if authenticated, or reset to guest/UID-isolated state when account changes
  useEffect(() => {
    if (user?.uid) {
      setUserProfile(loadUserProfile(user.uid));
      setVoiceLogs([]);
      setSingleLogs([]);
      loadUserProfileWithFirestore(user.uid).then((p) => {
        if (p) {
          setUserProfile(p);
          setTargetHives(`#1 ~ #${p.hiveCount || 50}`);
        }
      });
    } else {
      const guestProf = loadUserProfile();
      setUserProfile(guestProf);
      setTargetHives(`#1 ~ #${guestProf.hiveCount || 50}`);
      setVoiceLogs(initialVoiceLogs);
      setSingleLogs(singleHiveLogs);
    }
  }, [user?.uid]);

  const handleAddressChange = (newAddress: string) => {
    setUserProfile((prev) => {
      const updated: UserProfile = { ...prev, apiaryLocation: newAddress };
      saveUserProfileWithFirestore(updated, user?.uid);
      return updated;
    });
  };

  const handleProfileUpdate = (newProfile: UserProfile) => {
    setUserProfile(newProfile);
    saveUserProfileWithFirestore(newProfile, user?.uid);
    if (targetHives.startsWith('#1 ~ #')) {
      setTargetHives(`#1 ~ #${newProfile.hiveCount}`);
    }
  };

  const handleHiveCountChange = (newCount: number) => {
    setUserProfile((prev) => {
      const updated: UserProfile = { ...prev, hiveCount: newCount };
      saveUserProfileWithFirestore(updated, user?.uid);
      return updated;
    });
    if (targetHives.startsWith('#1 ~ #')) {
      setTargetHives(`#1 ~ #${newCount}`);
    }
  };

  const getTitle = () => {
    switch (currentTab) {
      case 'record':
        return '양봉기록';
      case 'honeyLot':
        return '꿀 이력제';
      case 'hives':
        return '종봉 관리';
      case 'analysis':
        return '수익 분석';
      case 'profile':
        return '내 정보';
      case 'trace':
        return '생산 이력 추적';
      default:
        return '허니비테코';
    }
  };

  const handleTabChange = (tab: TabType) => {
    if (tab === 'home') {
      // If user taps 'home' tab in Beekeeper bottom bar, return to Landing Page
      navigateTo('landing');
      return;
    }
    setPreviousTab(currentTab);
    setCurrentTab(tab);
    setAutoOpenVoiceRecord(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenTrace = () => {
    setPreviousTab(currentTab);
    setCurrentTab('trace');
    setAutoOpenVoiceRecord(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackFromSubView = () => {
    if (currentTab === 'record') {
      navigateTo('landing');
    } else {
      setCurrentTab(previousTab === 'home' || currentTab === previousTab ? 'record' : previousTab);
      setAutoOpenVoiceRecord(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSelectHiveForRecord = (hiveNum: number) => {
    setTargetHives(`#${hiveNum}`);
    setCurrentTab('record');
    setAutoOpenVoiceRecord(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveLogs = (updated: VoiceLogItem[]) => {
    setVoiceLogs(updated);
    if (!updated[0]?.hiveRange.includes('~')) {
      setSingleLogs(updated);
    }
  };

  // 0. ROUTE: Consumer Public Honey Trace Page ('/trace/:publicTraceId')
  if (publicTraceId !== null) {
    return (
      <PublicHoneyTracePage
        publicTraceId={publicTraceId}
        onBack={() => navigateTo('consumer')}
        onNavigateToConsumerHome={() => navigateTo('consumer')}
      />
    );
  }

  // 1. ROUTE: Top-Level Service Entry Landing Page ('/')
  if (currentRoute === 'landing') {
    return (
      <>
        <LandingView
          weather={appWeather}
          userProfile={userProfile}
          onEnterBeekeeper={() => navigateTo('beekeeper', 'record')}
          onEnterConsumer={() => navigateTo('consumer')}
        />

        {/* Certificate Modal accessible from Landing if needed */}
        <AnalysisModal
          isOpen={isAnalysisModalOpen}
          onClose={() => setIsAnalysisModalOpen(false)}
        />
      </>
    );
  }

  // 2. ROUTE: Independent Consumer Space ('/consumer')
  if (currentRoute === 'consumer') {
    return (
      <>
        <ConsumerView
          onBackToHome={() => navigateTo('landing')}
          onOpenCertificateModal={() => setIsAnalysisModalOpen(true)}
        />

        {/* Certificate Modal for Consumer */}
        <AnalysisModal
          isOpen={isAnalysisModalOpen}
          onClose={() => setIsAnalysisModalOpen(false)}
        />
      </>
    );
  }

  // 3. ROUTE: Independent Beekeeper Space ('/beekeeper')
  // [보안 가드]: 비로그인 사용자가 /beekeeper로 접근한 경우 로그인 안내 또는 홈 이동
  if (!user) {
    if (loading) {
      return (
        <div className="min-h-screen bg-[#f4faff] flex flex-col items-center justify-center space-y-3">
          <div className="w-9 h-9 border-3 border-[#7e5700] border-t-transparent rounded-full animate-spin" />
          <p className="text-[13px] text-[#514532] font-semibold">사용자 인증 확인 중...</p>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#f4faff] text-[#0d1e25] flex flex-col font-['Noto_Sans_KR',_'Inter',sans-serif]">
        <Header
          currentTab="profile"
          title="양봉인 로그인 안내"
          onNavigateHome={() => navigateTo('landing')}
          onOpenProfile={() => {}}
          showBack={true}
          onBack={() => navigateTo('landing')}
        />

        <main className="flex-1 max-w-md w-full mx-auto px-4 pt-24 pb-12 flex flex-col items-center justify-center text-center space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-[#ffdeac] text-[#7e5700] flex items-center justify-center text-[32px] shadow-sm">
            🐝
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-extrabold px-3 py-1 rounded-full bg-[#ffdeac]/70 text-[#7e5700] border border-[#ffdeac]">
              양봉인 전용 서비스
            </span>
            <h2 className="text-[21px] font-black text-[#0d1e25] tracking-tight">
              양봉인 계정 로그인이 필요합니다
            </h2>
            <p className="text-[13px] text-[#514532] leading-relaxed max-w-xs mx-auto">
              봉군 내검 기록, 음성 양봉일지 및 꿀 이력제 관리 기능은 농가 인증 로그인을 통해 안전하게 보호됩니다.
            </p>
          </div>

          <div className="w-full space-y-3 pt-2">
            <button
              onClick={() => setIsBeekeeperLoginModalOpen(true)}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#7e5700] hover:bg-[#634500] text-white font-extrabold text-[15px] shadow-md flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer"
            >
              <span>양봉인 계정 로그인</span>
              <span className="material-symbols-outlined text-[18px]">login</span>
            </button>

            <button
              onClick={() => navigateTo('landing')}
              className="w-full py-3 px-4 rounded-2xl bg-white border border-[#d4e5ef] hover:bg-[#f0f7fb] text-[#0d1e25] font-bold text-[14px] flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <span>홈으로 돌아가기</span>
            </button>

            <button
              onClick={() => navigateTo('consumer')}
              className="w-full py-2.5 px-4 text-[12.5px] font-bold text-[#7c3aed] hover:underline transition-all cursor-pointer"
            >
              🍯 소비자 화면으로 이동하기
            </button>
          </div>
        </main>

        <LoginModal
          isOpen={isBeekeeperLoginModalOpen}
          onClose={() => setIsBeekeeperLoginModalOpen(false)}
          allowGuestContinue={false}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4faff] text-[#0d1e25] flex flex-col font-['Noto_Sans_KR',_'Inter',sans-serif]">
      {/* Top Header with Back to Landing Home and Role indicator */}
      <Header
        currentTab={currentTab}
        title={getTitle()}
        onNavigateHome={() => navigateTo('landing')}
        onOpenProfile={() => handleTabChange('profile')}
        showBack={currentTab !== 'record'}
        onBack={handleBackFromSubView}
        onOpenTraceView={handleOpenTrace}
      />

      {/* Main Tab Content */}
      <main className="flex-1 w-full">
        {currentTab === 'record' && (
          <RecordView
            weather={appWeather}
            logs={voiceLogs}
            singleLogs={singleLogs}
            targetHives={targetHives}
            apiaryAddress={userProfile.apiaryLocation}
            onAddressChange={handleAddressChange}
            onWeatherUpdate={(newW) => setAppWeather(newW)}
            onOpenHiveSelect={() => setIsHiveSelectModalOpen(true)}
            onSaveLogs={handleSaveLogs}
            autoOpenRecordSheet={autoOpenVoiceRecord}
            onOpenHoneyLot={() => handleTabChange('honeyLot')}
          />
        )}

        {currentTab === 'honeyLot' && (
          <HoneyLotView
            hiveCount={userProfile.hiveCount || 50}
            farmName={userProfile.farmName || userProfile.companyName}
          />
        )}

        {currentTab === 'hives' && (
          <HivesView
            hiveCount={userProfile.hiveCount || 50}
            onUpdateHiveCount={handleHiveCountChange}
            onOpenTraceDetail={handleOpenTrace}
            onSelectHiveForRecord={handleSelectHiveForRecord}
            journals={voiceLogs}
          />
        )}

        {currentTab === 'analysis' && (
          <AnalysisView
            onOpenReportModal={() => setIsReportModalOpen(true)}
            hiveCount={userProfile.hiveCount || 50}
            userProfile={userProfile}
          />
        )}

        {currentTab === 'profile' && (
          <ProfileView
            userProfile={userProfile}
            onUpdateProfile={handleProfileUpdate}
            onOpenTraceView={handleOpenTrace}
            onOpenLabModal={() => setIsAnalysisModalOpen(true)}
          />
        )}

        {currentTab === 'trace' && (
          <TraceView
            onOpenAnalysisCertificate={() => setIsAnalysisModalOpen(true)}
            onBackToApp={handleBackFromSubView}
          />
        )}
      </main>

      {/* Beekeeper Bottom Navigation */}
      <BottomNav
        currentTab={currentTab}
        onTabChange={handleTabChange}
      />

      {/* Modals */}
      <AnalysisModal
        isOpen={isAnalysisModalOpen}
        onClose={() => setIsAnalysisModalOpen(false)}
      />

      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
      />

      <HiveSelectModal
        isOpen={isHiveSelectModalOpen}
        currentRange={targetHives}
        maxHiveCount={userProfile.hiveCount || 50}
        onClose={() => setIsHiveSelectModalOpen(false)}
        onSelectRange={(range) => setTargetHives(range)}
      />
    </div>
  );
}
