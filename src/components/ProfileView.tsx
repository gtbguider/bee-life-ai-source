import React, { useState } from 'react';
import { LOGO_URL, sampleLabData, BEEKEEPER_IMG } from '../data/mockData';
import { ApiaryMapSection } from './ApiaryMapSection';
import { UserProfile, initialProfile, syncLocalProfileToCloud } from '../services/userProfile';
import { KOREA_REGION_COORDINATES, LocationGeo } from '../services/weatherService';
import { useAuth } from '../contexts/AuthContext';
import { LoginModal } from './LoginModal';

interface ProfileViewProps {
  userProfile?: UserProfile;
  onUpdateProfile?: (profile: UserProfile) => void;
  onOpenTraceView: () => void;
  onOpenLabModal: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  userProfile = initialProfile,
  onUpdateProfile,
  onOpenTraceView,
  onOpenLabModal
}) => {
  const { user, isLoggedIn, logout, syncStatus } = useAuth();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [isSyncingManual, setIsSyncingManual] = useState<boolean>(false);
  const [voiceDialectSetting, setVoiceDialectSetting] = useState<boolean>(true);
  const [iotAlerts, setIotAlerts] = useState<boolean>(true);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [isEditingAddress, setIsEditingAddress] = useState<boolean>(false);
  const [inputAddress, setInputAddress] = useState<string>(userProfile.apiaryLocation);
  const [addressToast, setAddressToast] = useState<string | null>(null);
  const [isEditingHiveCount, setIsEditingHiveCount] = useState<boolean>(false);
  const [inputHiveCount, setInputHiveCount] = useState<number>(userProfile.hiveCount || 50);

  React.useEffect(() => {
    setInputAddress(userProfile.apiaryLocation);
    setInputHiveCount(userProfile.hiveCount || 50);
    setIsEditingAddress(false);
    setIsEditingHiveCount(false);
  }, [userProfile.apiaryLocation, userProfile.hiveCount, user?.uid]);

  const handleManualSync = async () => {
    if (!user?.uid) {
      setIsLoginModalOpen(true);
      return;
    }
    setIsSyncingManual(true);
    try {
      await syncLocalProfileToCloud(user.uid);
      setAddressToast('Firebase 클라우드와 농가 프로필 동기화가 완료되었습니다.');
    } catch (e) {
      setAddressToast('클라우드 동기화 중 오류가 발생했습니다.');
    } finally {
      setIsSyncingManual(false);
      setTimeout(() => setAddressToast(null), 3000);
    }
  };

  const handleSaveAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputAddress.trim() && onUpdateProfile) {
      onUpdateProfile({
        ...userProfile,
        apiaryLocation: inputAddress.trim()
      });
      setIsEditingAddress(false);
      setAddressToast('봉장 주소가 변경되어 기상청 날씨가 업데이트되었습니다.');
      setTimeout(() => setAddressToast(null), 2500);
    }
  };

  const handleSelectPreset = (geo: LocationGeo) => {
    setInputAddress(geo.name);
    if (onUpdateProfile) {
      onUpdateProfile({
        ...userProfile,
        apiaryLocation: geo.name
      });
      setIsEditingAddress(false);
      setAddressToast('봉장 주소가 변경되어 기상청 날씨가 업데이트되었습니다.');
      setTimeout(() => setAddressToast(null), 2500);
    }
  };

  const handleSaveHiveCount = (countToSave?: number) => {
    const targetCount = countToSave !== undefined ? countToSave : inputHiveCount;
    const safeCount = Math.max(1, Math.min(2000, Number(targetCount) || 50));
    setInputHiveCount(safeCount);
    if (onUpdateProfile) {
      onUpdateProfile({
        ...userProfile,
        hiveCount: safeCount
      });
      setIsEditingHiveCount(false);
      setAddressToast(`관리 벌통이 ${safeCount}군으로 변경되었습니다. (종봉관리·수익분석 연동 완료)`);
      setTimeout(() => setAddressToast(null), 3000);
    }
  };

  return (
    <div className="flex flex-col w-full min-h-screen pb-28 pt-16 bg-[#f4faff]">
      <div className="flex flex-col w-full px-4 py-4 gap-4 max-w-md mx-auto">
        {/* Profile Card */}
        <div className="bg-white border-2 border-[#d6c4ac] rounded-3xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative shrink-0">
              <img
                src={BEEKEEPER_IMG}
                alt="설종수 양봉가"
                className="w-16 h-16 rounded-2xl object-cover border-2 border-[#7e5700] shadow-sm"
              />
              <div className="absolute -bottom-1 -right-1 bg-[#1b6d24] text-white p-1 rounded-full border-2 border-white">
                <span className="material-symbols-outlined text-[12px] block">
                  verified
                </span>
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="text-[16px] font-black text-[#0d1e25] leading-tight">
                  {userProfile.farmName || '농업회사법인 허니비테코 주식회사'}
                </h2>
                <span className="bg-[#ffb300]/20 text-[#7e5700] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#ffb300]/40 shrink-0">
                  스마트 양봉원
                </span>
              </div>
              <p className="text-[12px] text-[#514532] mt-0.5 font-medium truncate">
                지리산 천연숙성꿀 전문 · {userProfile.phone}
              </p>
              <p className="text-[11px] text-[#7e5700] font-bold mt-0.5 truncate">
                📍 {userProfile.apiaryLocation}
              </p>
            </div>
          </div>

          {/* Quick Stat Tiles */}
          <div className="grid grid-cols-3 gap-2 bg-[#f4faff] p-3 rounded-2xl border border-[#d4e5ef] text-center">
            <button
              onClick={() => setIsEditingHiveCount(!isEditingHiveCount)}
              className="p-1 rounded-xl hover:bg-white/80 transition-colors text-center cursor-pointer group"
            >
              <span className="text-[11px] text-[#514532] block flex items-center justify-center gap-0.5">
                <span>관리 벌통</span>
                <span className="material-symbols-outlined text-[12px] text-[#7e5700] group-hover:scale-110">edit</span>
              </span>
              <span className="text-[16px] font-black text-[#7e5700] underline decoration-dotted underline-offset-2">
                {userProfile.hiveCount}군
              </span>
            </button>
            <div className="p-1">
              <span className="text-[11px] text-[#514532] block">탄소동위원소비</span>
              <span className="text-[16px] font-black text-[#1b6d24]">-26.0‰</span>
            </div>
            <div className="p-1">
              <span className="text-[11px] text-[#514532] block">공인 시험 결과</span>
              <span className="text-[16px] font-bold text-[#7e5700]">전항목 적합</span>
            </div>
          </div>
        </div>

        {/* Firebase Cloud Sync & Authentication Section */}
        <div className="bg-white border-2 border-[#1b6d24]/30 rounded-3xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#1b6d24] text-[22px]">
                cloud_sync
              </span>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-extrabold text-[15px] text-[#0d1e25]">
                    Firebase 클라우드 연동
                  </h3>
                  {isLoggedIn ? (
                    <span className="bg-[#e8f5e9] text-[#1b6d24] font-black text-[10px] px-2 py-0.5 rounded-full border border-[#c8e6c9] flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#2e7d32] animate-pulse" />
                      연동 완료
                    </span>
                  ) : (
                    <span className="bg-[#fff3e0] text-[#7e5700] font-black text-[10px] px-2 py-0.5 rounded-full border border-[#ffe082]">
                      로컬 오프라인 모드
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#514532]">
                  {isLoggedIn
                    ? '양봉일지, 종봉 계보, 수익 장부, 농가 프로필이 Firestore에 안전하게 보관됩니다.'
                    : '구글 계정으로 로그인하면 기기 변경 시에도 데이터를 안전하게 복구할 수 있습니다.'}
                </p>
              </div>
            </div>
          </div>

          {isLoggedIn && user ? (
            <div className="bg-[#f4faff] border border-[#d4e5ef] rounded-2xl p-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || '사용자'}
                    className="w-10 h-10 rounded-full border border-[#7e5700]/30 shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[#7e5700] text-white font-bold flex items-center justify-center shrink-0 text-[14px]">
                    {(user.displayName || user.email || 'U')[0]}
                  </div>
                )}
                <div className="min-w-0">
                  <span className="font-bold text-[13px] text-[#0d1e25] block truncate">
                    {user.displayName || '양봉가'}
                  </span>
                  <span className="text-[11px] text-[#514532] block truncate">
                    {user.email}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={handleManualSync}
                  disabled={isSyncingManual}
                  className="px-2.5 py-1.5 bg-[#e8f5e9] hover:bg-[#c8e6c9] text-[#1b6d24] text-[11px] font-bold rounded-xl border border-[#a5d6a7] transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  title="지금 즉시 클라우드에 백업"
                >
                  <span
                    className={`material-symbols-outlined text-[14px] ${isSyncingManual ? 'animate-spin' : ''}`}
                  >
                    sync
                  </span>
                  <span>{isSyncingManual ? '동기화 중' : '즉시 동기화'}</span>
                </button>

                <button
                  onClick={logout}
                  className="px-2.5 py-1.5 bg-white hover:bg-red-50 text-red-600 text-[11px] font-bold rounded-xl border border-red-200 transition-all cursor-pointer"
                  title="계정 로그아웃"
                >
                  로그아웃
                </button>
              </div>
            </div>
          ) : (
            <div className="pt-1">
              <button
                onClick={() => setIsLoginModalOpen(true)}
                className="w-full py-2.5 px-3 bg-white hover:bg-gray-50 border border-[#d6c4ac] text-[#0d1e25] text-[13px] font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Google 계정으로 Firebase 클라우드 연결하기</span>
              </button>
            </div>
          )}
        </div>

        {/* Managed Hives Configuration Card */}
        <div className="bg-white border-2 border-[#7e5700]/40 rounded-3xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#7e5700] text-[22px]">
                hive
              </span>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-extrabold text-[15px] text-[#0d1e25]">
                    관리 벌통 규모 설정
                  </h3>
                  <span className="bg-[#ffdeac] text-[#7e5700] font-black text-[10px] px-1.5 py-0.5 rounded-md">
                    {userProfile.hiveCount}통(군) 운용중
                  </span>
                </div>
                <p className="text-[11px] text-[#514532]">
                  종봉관리 벌통목록 및 AI 수익분석(경영장부)에 자동 반영됩니다.
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsEditingHiveCount(!isEditingHiveCount)}
              className="px-2.5 py-1 bg-[#f4faff] hover:bg-[#d9ebf5] border border-[#d6c4ac] text-[#7e5700] text-[11px] font-bold rounded-lg transition-all cursor-pointer"
            >
              {isEditingHiveCount ? '접기' : '수량 변경'}
            </button>
          </div>

          {/* Quick Preset Buttons */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[11px] font-bold text-[#514532] flex items-center justify-between">
              <span>자주 쓰는 양봉 규모 빠른 선택:</span>
              <span className="text-[10px] text-[#7e5700] font-medium">클릭 시 즉시 저장</span>
            </span>
            <div className="grid grid-cols-5 gap-1.5">
              {[10, 20, 50, 100, 200].map((count) => {
                const isActive = userProfile.hiveCount === count;
                return (
                  <button
                    key={count}
                    onClick={() => handleSaveHiveCount(count)}
                    className={`py-2 rounded-xl text-[12px] font-black transition-all cursor-pointer flex flex-col items-center justify-center ${
                      isActive
                        ? 'bg-[#7e5700] text-white shadow-xs border border-[#7e5700]'
                        : 'bg-[#f4faff] hover:bg-[#ffdeac]/60 text-[#0d1e25] border border-[#d6c4ac]/70'
                    }`}
                  >
                    <span>{count}군</span>
                    <span className={`text-[9px] font-normal ${isActive ? 'text-white/80' : 'text-[#514532]'}`}>
                      ({count}통)
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Hive Count Input & Step Controls */}
          {isEditingHiveCount && (
            <div className="pt-2 border-t border-[#d4e5ef] space-y-2.5 animate-in fade-in duration-150">
              <label className="text-[11px] font-bold text-[#514532] block">
                직접 벌통 수량 입력 (1 ~ 2,000군):
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setInputHiveCount((prev) => Math.max(1, prev - 10))}
                  className="w-10 h-10 bg-[#f4faff] border border-[#d6c4ac] rounded-xl font-bold text-[14px] text-[#0d1e25] hover:bg-[#d9ebf5] active:scale-95 cursor-pointer"
                >
                  -10
                </button>
                <button
                  onClick={() => setInputHiveCount((prev) => Math.max(1, prev - 1))}
                  className="w-10 h-10 bg-[#f4faff] border border-[#d6c4ac] rounded-xl font-bold text-[14px] text-[#0d1e25] hover:bg-[#d9ebf5] active:scale-95 cursor-pointer"
                >
                  -1
                </button>
                <div className="flex-1 relative">
                  <input
                    type="number"
                    min="1"
                    max="2000"
                    value={inputHiveCount}
                    onChange={(e) => setInputHiveCount(Math.max(1, Number(e.target.value) || 1))}
                    className="w-full px-3 py-2 text-center text-[15px] font-black text-[#0d1e25] bg-white border-2 border-[#7e5700]/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7e5700]"
                  />
                  <span className="absolute right-3 top-2.5 text-[12px] font-bold text-[#514532]">
                    군(통)
                  </span>
                </div>
                <button
                  onClick={() => setInputHiveCount((prev) => Math.min(2000, prev + 1))}
                  className="w-10 h-10 bg-[#f4faff] border border-[#d6c4ac] rounded-xl font-bold text-[14px] text-[#0d1e25] hover:bg-[#d9ebf5] active:scale-95 cursor-pointer"
                >
                  +1
                </button>
                <button
                  onClick={() => setInputHiveCount((prev) => Math.min(2000, prev + 10))}
                  className="w-10 h-10 bg-[#f4faff] border border-[#d6c4ac] rounded-xl font-bold text-[14px] text-[#0d1e25] hover:bg-[#d9ebf5] active:scale-95 cursor-pointer"
                >
                  +10
                </button>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => handleSaveHiveCount()}
                  className="flex-1 py-2.5 bg-[#7e5700] hover:bg-[#604100] text-white font-extrabold text-[12px] rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-1"
                >
                  <span className="material-symbols-outlined text-[16px]">check</span>
                  <span>{inputHiveCount}군으로 저장 및 전체 적용</span>
                </button>
                <button
                  onClick={() => {
                    setInputHiveCount(userProfile.hiveCount);
                    setIsEditingHiveCount(false);
                  }}
                  className="px-3.5 py-2.5 bg-white border border-[#d6c4ac] text-[#514532] font-bold text-[12px] rounded-xl cursor-pointer"
                >
                  취소
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Apiary Location & Real-time KMA Weather Sync Card */}
        <div className="bg-white border-2 border-[#7e5700]/30 rounded-3xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#7e5700] text-[22px]">
                pin_drop
              </span>
              <div>
                <h3 className="font-extrabold text-[15px] text-[#0d1e25]">
                  봉장 주소 및 기상청 관측소
                </h3>
                <p className="text-[11px] text-[#514532]">
                  양봉기록 달력 및 실시간 날씨가 이 주소와 자동 연동됩니다.
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsEditingAddress(!isEditingAddress)}
              className="px-2.5 py-1 bg-[#f4faff] hover:bg-[#d9ebf5] border border-[#d6c4ac] text-[#7e5700] text-[11px] font-bold rounded-lg transition-all"
            >
              {isEditingAddress ? '취소' : '주소 변경'}
            </button>
          </div>

          {/* Current Address Display */}
          <div className="bg-[#f4faff] p-3 rounded-2xl border border-[#d4e5ef] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#514532]">현재 설정된 봉장 위치:</span>
              <span className="text-[10px] font-bold text-[#1b6d24] flex items-center gap-1 bg-[#a0f399]/30 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1b6d24] animate-pulse" />
                기상청 실시간 수신
              </span>
            </div>
            <p className="text-[13px] font-bold text-[#0d1e25]">
              {userProfile.apiaryLocation}
            </p>
          </div>

          {/* Address Edit Form & Presets */}
          {isEditingAddress && (
            <div className="pt-2 border-t border-[#d4e5ef] space-y-2.5 animate-in fade-in duration-150">
              <form onSubmit={handleSaveAddress} className="space-y-2">
                <label className="text-[11px] font-bold text-[#514532] block">
                  새로운 봉장 주소 직접 입력:
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={inputAddress}
                    onChange={(e) => setInputAddress(e.target.value)}
                    placeholder="예: 전남 구례군 산동면, 경북 상주시 화북면"
                    className="flex-1 px-3 py-2 text-[12px] bg-white border border-[#d6c4ac] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7e5700]/30 font-medium"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-2 bg-[#7e5700] text-white font-bold text-[12px] rounded-xl shadow-xs hover:bg-[#604100] cursor-pointer"
                  >
                    저장
                  </button>
                </div>
              </form>

              {/* Quick Preset Buttons */}
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-[#514532]">주요 양봉지 빠른 선택:</span>
                <div className="grid grid-cols-2 gap-1.5">
                  {Object.values(KOREA_REGION_COORDINATES).slice(0, 6).map((geo) => (
                    <button
                      key={geo.name}
                      onClick={() => handleSelectPreset(geo)}
                      className="p-1.5 text-left bg-white hover:bg-[#fffae8] border border-[#d6c4ac]/70 rounded-xl text-[11px] transition-colors flex items-center justify-between"
                    >
                      <span className="font-bold text-[#0d1e25] truncate">{geo.name.split(' ')[1] || geo.name}</span>
                      <span className="text-[9px] text-[#7e5700] truncate">{geo.stationName.split(' ')[1] || '관측소'}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Lab Certificate Direct Access Card */}
        <div className="bg-gradient-to-r from-[#7e5700] to-[#593d00] text-white rounded-3xl p-4 shadow-md flex items-center justify-between gap-3">
          <div className="space-y-1">
            <span className="bg-[#ffdeac] text-[#281900] text-[10px] font-black px-2 py-0.5 rounded-full">
              한국양봉협회 공인 인증
            </span>
            <h4 className="font-extrabold text-[15px]">
              24개 성분분석 시험성적서
            </h4>
            <p className="text-[11px] text-white/80">
              접수번호 {sampleLabData.receiptNumber} · 탄소동위원소비 -26.0‰
            </p>
          </div>
          <button
            onClick={onOpenLabModal}
            className="px-3.5 py-2.5 bg-white hover:bg-[#fff9c4] text-[#7e5700] font-bold rounded-2xl text-[12px] shadow-sm shrink-0 active:scale-95 transition-all flex items-center gap-1"
          >
            <span>성적서 보기</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </button>
        </div>

        {/* Apiary Location & Map Section */}
        <ApiaryMapSection address={userProfile.apiaryLocation} isDetailed={false} />

        {/* Honey Traceability & QR Code Tools */}
        <div className="bg-white border border-[#d6c4ac] rounded-3xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#7e5700] text-[22px]">
                qr_code_scanner
              </span>
              <h3 className="font-bold text-[16px] text-[#0d1e25]">
                소비자 꿀이력제 연동
              </h3>
            </div>
            <span className="text-[11px] bg-[#1b6d24]/10 text-[#1b6d24] font-bold px-2 py-0.5 rounded-full">
              블록체인 검증
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onOpenTraceView}
              className="p-3 rounded-2xl bg-[#f4faff] border border-[#d6c4ac]/70 flex flex-col items-center text-center gap-1.5 hover:bg-[#d9ebf5] transition-all"
            >
              <span className="material-symbols-outlined text-[#7e5700] text-[24px]">
                visibility
              </span>
              <span className="text-[12px] font-bold text-[#0d1e25]">
                소비자 화면 미리보기
              </span>
            </button>

            <button
              onClick={() => setShowQrModal(true)}
              className="p-3 rounded-2xl bg-[#ffdeac]/40 border border-[#7e5700]/30 flex flex-col items-center text-center gap-1.5 hover:bg-[#ffdeac]/70 transition-all"
            >
              <span className="material-symbols-outlined text-[#7e5700] text-[24px]">
                print
              </span>
              <span className="text-[12px] font-bold text-[#281900]">
                꿀병 QR 라벨 발급
              </span>
            </button>
          </div>
        </div>

        {/* AI Assistant Settings */}
        <div className="bg-white border border-[#d6c4ac] rounded-3xl p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#7e5700] text-[22px]">
              tune
            </span>
            <h3 className="font-bold text-[16px] text-[#0d1e25]">AI 시스템 설정</h3>
          </div>

          <div className="space-y-3 text-[13px]">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-[#0d1e25] block">
                  양봉 전용 사투리/전문용어 보정
                </span>
                <span className="text-[11px] text-[#514532]">
                  '소초광', '왕대', '개포', '이충' 등 양봉 전문어 자동인식
                </span>
              </div>
              <button
                onClick={() => setVoiceDialectSetting(!voiceDialectSetting)}
                className={`w-12 h-6 rounded-full p-1 transition-colors ${
                  voiceDialectSetting ? 'bg-[#7e5700]' : 'bg-[#d6c4ac]'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    voiceDialectSetting ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between border-t border-[#d4e5ef] pt-2.5">
              <div>
                <span className="font-bold text-[#0d1e25] block">
                  분봉열/말벌 침입 실시간 알림
                </span>
                <span className="text-[11px] text-[#514532]">
                  벌통 내 이상 주파수 감지 시 긴급 푸시 발송
                </span>
              </div>
              <button
                onClick={() => setIotAlerts(!iotAlerts)}
                className={`w-12 h-6 rounded-full p-1 transition-colors ${
                  iotAlerts ? 'bg-[#7e5700]' : 'bg-[#d6c4ac]'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    iotAlerts ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {addressToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-[#0d1e25] text-white px-4 py-2.5 rounded-2xl shadow-xl border border-white/20 text-[12px] font-bold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200 max-w-[90%] text-center">
          <span className="material-symbols-outlined text-[#1b6d24] text-[18px] shrink-0">
            check_circle
          </span>
          <span>{addressToast}</span>
        </div>
      )}

      {/* QR Code Printable Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl border-2 border-[#7e5700] text-center space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-[18px] text-[#0d1e25]">
                꿀병 부착용 QR 라벨
              </h3>
              <button
                onClick={() => setShowQrModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#514532] hover:bg-[#d9ebf5]"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="bg-[#f4faff] p-5 rounded-2xl border border-[#d4e5ef] flex flex-col items-center gap-2">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                  window.location.href + '#trace'
                )}`}
                alt="Honey Trace QR Code"
                className="w-36 h-36 border-2 border-white rounded-xl shadow-xs"
              />
              <span className="font-mono text-[12px] font-bold text-[#7e5700]">
                LOT: {sampleLabData.lotNumber}
              </span>
              <p className="text-[11px] text-[#514532]">
                소비자가 카메라로 스캔하면 공인 시험성적서 및 AI 생산 이력이 표시됩니다.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  alert('라벨 프린터로 전송되었습니다.');
                  setShowQrModal(false);
                }}
                className="flex-1 py-3 bg-[#7e5700] hover:bg-[#604100] text-white font-bold rounded-xl text-[13px] shadow-xs flex items-center justify-center gap-1"
              >
                <span className="material-symbols-outlined text-[16px]">print</span>
                <span>라벨 인쇄</span>
              </button>
              <button
                onClick={() => setShowQrModal(false)}
                className="px-4 py-3 bg-white border border-[#d6c4ac] text-[#0d1e25] font-bold rounded-xl text-[13px]"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Google Login Modal for Beekeepers */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSuccess={() => {
          setAddressToast('구글 로그인이 완료되어 클라우드 연동이 활성화되었습니다.');
          setTimeout(() => setAddressToast(null), 3000);
        }}
      />
    </div>
  );
};


