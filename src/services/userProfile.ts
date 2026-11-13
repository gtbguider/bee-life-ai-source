import { sampleLabData } from '../data/mockData';
import {
  fetchUserProfileFromFirestore,
  saveUserProfileToFirestore,
  saveApiaryToFirestore
} from './firestoreService';

export interface UserProfile {
  name: string;
  farmName: string;
  companyName: string;
  phone: string;
  applicantAddress: string;
  apiaryLocation: string; // The primary apiary location that weather tracks
  apiaryTitle: string;
  hiveCount: number;
}

const PROFILE_STORAGE_KEY = 'honeybee_user_profile_v2';

function getProfileStorageKey(uid?: string): string {
  return uid ? `${PROFILE_STORAGE_KEY}_${uid}` : PROFILE_STORAGE_KEY;
}

export const initialProfile: UserProfile = {
  name: '농업회사법인 허니비테코 주식회사',
  farmName: '농업회사법인 허니비테코 주식회사',
  companyName: '농업회사법인 허니비테코 주식회사',
  phone: sampleLabData.applicantPhone || '010-8020-2583',
  applicantAddress: sampleLabData.applicantAddress || '[57601] 전라남도 구례군 산동면 하원길 9-1',
  apiaryLocation: '전남 구례군 산동면 원달리 205-1 번지',
  apiaryTitle: '허니비테코 지리산 제1봉장 (원달리)',
  hiveCount: 50
};

export function getDefaultNewUserProfile(authData?: {
  email?: string | null;
  displayName?: string | null;
}): UserProfile {
  const userName = authData?.displayName || '양봉인';
  return {
    name: userName,
    farmName: `${userName} 양봉원`,
    companyName: `${userName} 양봉원`,
    phone: '',
    applicantAddress: '',
    apiaryLocation: '전남 구례군 산동면 원달리 205-1 번지',
    apiaryTitle: `${userName} 제1봉장`,
    hiveCount: 50
  };
}

export function loadUserProfile(uid?: string): UserProfile {
  try {
    const saved = localStorage.getItem(getProfileStorageKey(uid));
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.apiaryLocation) {
        // Upgrade previous placeholder farm names to official company name only for guest/default
        const farmName =
          !parsed.farmName || (!uid && parsed.farmName === '지리산 청정 양봉원')
            ? '농업회사법인 허니비테코 주식회사'
            : parsed.farmName;

        return {
          ...initialProfile,
          ...parsed,
          farmName,
          companyName: parsed.companyName || farmName,
          hiveCount: typeof parsed.hiveCount === 'number' && parsed.hiveCount > 0 ? parsed.hiveCount : 50
        };
      }
    }
  } catch (e) {
    console.warn('Failed to load user profile from storage:', e);
  }
  return uid
    ? getDefaultNewUserProfile()
    : initialProfile;
}

export function saveUserProfile(profile: UserProfile, uid?: string): void {
  try {
    localStorage.setItem(getProfileStorageKey(uid), JSON.stringify(profile));
  } catch (e) {
    console.warn('Failed to save user profile:', e);
  }
}

/**
 * Async helper with Firestore integration
 * Loads from Firestore if uid is available; falls back to UID-scoped cache or clean default (never shared localStorage)
 */
export async function loadUserProfileWithFirestore(uid?: string): Promise<UserProfile> {
  if (uid) {
    try {
      const cloudProfile = await fetchUserProfileFromFirestore(uid);
      if (cloudProfile) {
        saveUserProfile(cloudProfile, uid);
        return cloudProfile;
      }
    } catch (err) {
      console.warn('Firestore load profile failed, using UID-scoped local storage:', err);
    }
    return loadUserProfile(uid);
  }
  return loadUserProfile();
}

/**
 * Async helper with Firestore integration
 * Saves to UID-scoped localStorage immediately, and syncs to Firestore if uid is provided
 */
export async function saveUserProfileWithFirestore(profile: UserProfile, uid?: string): Promise<void> {
  saveUserProfile(profile, uid);
  if (uid) {
    try {
      await saveUserProfileToFirestore(uid, profile);
      await saveApiaryToFirestore(uid, {
        id: 'primary_apiary',
        name: profile.apiaryTitle || `${profile.farmName || '내 양봉원'} 제1봉장`,
        address: profile.apiaryLocation,
        hiveCount: profile.hiveCount || 50
      });
    } catch (err) {
      console.warn('Firestore save profile notice:', err);
    }
  }
}

export async function syncLocalProfileToCloud(uid: string): Promise<UserProfile> {
  const local = loadUserProfile(uid);
  await saveUserProfileToFirestore(uid, local);
  return local;
}


