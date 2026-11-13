import React from 'react';
import { useAuth } from '../contexts/AuthContext';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  allowGuestContinue?: boolean;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  allowGuestContinue = true
}) => {
  const { loginWithGoogle, loading, error, isLoggedIn, user } = useAuth();

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    const loggedUser = await loginWithGoogle();
    if (loggedUser) {
      if (onSuccess) onSuccess();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-sm rounded-3xl p-6 border-2 border-[#7e5700]/30 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#ffdeac] text-[#7e5700] flex items-center justify-center text-[28px] shadow-xs">
            🐝
          </div>
          <div>
            <h3 className="text-[19px] font-black text-[#0d1e25] tracking-tight">
              양봉인 계정 로그인
            </h3>
            <p className="text-[12px] text-[#514532] mt-0.5">
              Firebase 클라우드 연동으로 소중한 양봉 데이터를 안전하게 보관하세요
            </p>
          </div>
        </div>

        {/* Benefits Box */}
        <div className="bg-[#f4faff] border border-[#d6c4ac]/60 rounded-2xl p-3.5 text-[12px] text-[#514532] space-y-2">
          <div className="flex items-start gap-2">
            <span className="text-[#1b6d24] font-bold text-[14px]">✓</span>
            <span><b>클라우드 자동 동기화</b>: 기기를 바꾸어도 내검일지·여왕벌 계보 유지</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-[#1b6d24] font-bold text-[14px]">✓</span>
            <span><b>철저한 보안 격리</b>: Firestore 보안 규칙으로 내 데이터만 안전하게 보호</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-[#1b6d24] font-bold text-[14px]">✓</span>
            <span><b>AI 음성 분석 연동</b>: Gemini AI 구조화 및 실시간 클라우드 저장</span>
          </div>
        </div>

        {/* Error message if any */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-2.5 text-[11.5px] text-red-700 font-medium">
            {error}
          </div>
        )}

        {/* Google Login Button */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-white border border-[#d4e5ef] hover:bg-gray-50 active:scale-98 text-[#0d1e25] font-bold text-[14px] shadow-sm transition-all cursor-pointer disabled:opacity-50"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-[#7e5700] border-t-transparent rounded-full animate-spin" />
              <span>로그인 진행 중...</span>
            </div>
          ) : (
            <>
              {/* Google G Logo */}
              <svg className="w-5 h-5" viewBox="0 0 24 24">
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
              <span>Google 계정으로 로그인</span>
            </>
          )}
        </button>

        {/* Guest fallback or close */}
        {allowGuestContinue && (
          <button
            onClick={onClose}
            className="w-full py-2 text-center text-[12px] font-bold text-[#514532] hover:text-[#0d1e25] transition-colors cursor-pointer"
          >
            로그인 없이 둘러보기 (로컬 모드)
          </button>
        )}
      </div>
    </div>
  );
};
