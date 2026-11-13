import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from 'firebase/auth';
import {
  auth,
  signInWithGoogle as firebaseSignInWithGoogle,
  signOutUser as firebaseSignOutUser,
  subscribeToAuthChanges
} from '../lib/firebase';
import {
  fetchUserProfileFromFirestore,
  saveUserProfileToFirestore,
  migrateLocalDataToFirestoreIfEmpty
} from '../services/firestoreService';
import {
  loadUserProfile,
  saveUserProfile,
  getDefaultNewUserProfile,
  UserProfile
} from '../services/userProfile';
import { loadSalesRecords } from '../services/beekeepingLedgerService';
import { loadExpenseRecords } from '../services/beekeepingLedgerService';
import { loadBreederQueens } from '../services/breederService';
import { VoiceLogItem } from '../types';

const OPERATOR_EMAIL = 'gtbguider@gmail.com';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  loginWithGoogle: () => Promise<User | null>;
  logout: () => Promise<void>;
  isLoggedIn: boolean;
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error';
  syncMessage: string | null;
  syncLocalDataToCloud: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges(async (currentUser) => {
      console.log('[AUTH DEBUG] user:', currentUser ? (currentUser.email || currentUser.displayName || 'authenticated') : null);
      console.log('[AUTH DEBUG] uid:', currentUser ? currentUser.uid : null);
      setUser(currentUser);
      setLoading(false);

      if (currentUser) {
        // User logged in: check and sync profile
        try {
          setSyncStatus('syncing');
          setSyncMessage('클라우드 데이터 동기화 중...');

          const remoteProfile = await fetchUserProfileFromFirestore(currentUser.uid);
          if (remoteProfile) {
            // Update UID-scoped local profile with cloud version
            saveUserProfile(remoteProfile, currentUser.uid);
          } else {
            // Do NOT copy shared/previous user's localStorage into a new user's Firestore.
            // Only the verified operator account may recover legacy local profile if their Firestore doc is empty.
            const isOperator = currentUser.email === OPERATOR_EMAIL;
            const initialForUser = isOperator
              ? loadUserProfile()
              : getDefaultNewUserProfile({
                  email: currentUser.email,
                  displayName: currentUser.displayName
                });
            saveUserProfile(initialForUser, currentUser.uid);
            await saveUserProfileToFirestore(currentUser.uid, initialForUser, {
              email: currentUser.email,
              displayName: currentUser.displayName,
              photoURL: currentUser.photoURL
            });
          }

          setSyncStatus('synced');
          setSyncMessage('Firebase 클라우드 연동 완료');
          setTimeout(() => setSyncMessage(null), 3000);
        } catch (err: any) {
          console.warn('Auth sync notice:', err);
          setSyncStatus('idle');
        }
      } else {
        setSyncStatus('idle');
        setSyncMessage(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async (): Promise<User | null> => {
    setError(null);
    try {
      setLoading(true);
      const loggedUser = await firebaseSignInWithGoogle();
      setUser(loggedUser);
      return loggedUser;
    } catch (err: any) {
      console.error('Google Sign-In failed:', err);
      // Friendly message for popup close or network issue
      const msg =
        err.code === 'auth/popup-closed-by-user'
          ? '로그인 창이 닫혔습니다. 다시 시도해주세요.'
          : err.code === 'auth/cancelled-popup-request'
          ? '로그인 요청이 취소되었습니다.'
          : 'Google 로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await firebaseSignOutUser();
      setUser(null);
      setSyncStatus('idle');
      setSyncMessage(null);
    } catch (err: any) {
      console.error('Logout failed:', err);
      setError('로그아웃 중 오류가 발생했습니다.');
    }
  };

  // Safely upload local data to Firestore if not already uploaded (scoped by UID; legacy fallback only for operator)
  const syncLocalDataToCloud = async (): Promise<void> => {
    if (!user) return;
    try {
      setSyncStatus('syncing');
      setSyncMessage('로컬 데이터를 클라우드로 전송 중...');

      const isOperator = user.email === OPERATOR_EMAIL;
      const uid = user.uid;

      // Collect UID-scoped local records (with legacy fallback strictly restricted to operator)
      let localJournals: VoiceLogItem[] = [];
      try {
        const rawScoped = localStorage.getItem(`honeybee_beekeeping_journal_logs_v2_${uid}`);
        if (rawScoped) {
          localJournals = JSON.parse(rawScoped);
        } else if (isOperator) {
          const rawLegacy = localStorage.getItem('honeybee_beekeeping_journal_logs_v2');
          if (rawLegacy) localJournals = JSON.parse(rawLegacy);
        }
      } catch (e) {}

      const localProfile = isOperator && !localStorage.getItem(`honeybee_user_profile_v2_${uid}`)
        ? loadUserProfile()
        : loadUserProfile(uid);
      const localSales = isOperator && !localStorage.getItem(`honeybee_teco_sales_records_v1_${uid}`)
        ? loadSalesRecords()
        : loadSalesRecords(uid);
      const localExpenses = isOperator && !localStorage.getItem(`honeybee_teco_expense_records_v1_${uid}`)
        ? loadExpenseRecords()
        : loadExpenseRecords(uid);
      const localQueens = isOperator && !localStorage.getItem(`beekeeping_breeder_queens_v1_${uid}`)
        ? loadBreederQueens()
        : loadBreederQueens(uid);

      const result = await migrateLocalDataToFirestoreIfEmpty(uid, {
        profile: localProfile,
        journals: localJournals,
        sales: localSales,
        expenses: localExpenses,
        queens: localQueens
      });

      setSyncStatus('synced');
      setSyncMessage(
        result.migrated
          ? `${result.count}건의 로컬 데이터를 Firestore에 안전하게 저장했습니다.`
          : '클라우드와 최신 데이터가 동기화되어 있습니다.'
      );
      setTimeout(() => setSyncMessage(null), 4000);
    } catch (err: any) {
      console.error('Cloud migration error:', err);
      setSyncStatus('error');
      setSyncMessage('동기화 중 오류가 발생했습니다.');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        loginWithGoogle,
        logout,
        isLoggedIn: Boolean(user),
        syncStatus,
        syncMessage,
        syncLocalDataToCloud
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
