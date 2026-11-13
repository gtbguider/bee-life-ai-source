import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  deleteDoc,
  deleteField,
  query,
  orderBy,
  writeBatch
} from 'firebase/firestore';
import { db, firebaseConfig, databaseId } from '../lib/firebase';
import {
  VoiceLogItem,
  HiveItem,
  BreederQueen,
  BeekeepingSalesRecord,
  BeekeepingExpenseRecord,
  HoneyLot,
  BeekeeperProduct
} from '../types';
import { UserProfile, initialProfile } from './userProfile';
import { generatePublicTraceId } from './honeyTracePublicService';

// ============================================================================
// Data Sanitization Helper (Prevents Firestore 'undefined' field errors)
// ============================================================================

/**
 * Recursively strips keys with undefined values from objects and arrays.
 * Firestore throws 'invalid-argument: Unsupported field value: undefined' if any
 * key has an undefined value. This ensures all objects sent to Firestore are safe.
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return null as any;
  }
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item)) as any;
  }
  if (typeof data === 'object' && !(data instanceof Date)) {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(data as Record<string, any>)) {
      if (value !== undefined) {
        cleaned[key] = sanitizeForFirestore(value);
      }
    }
    return cleaned as any;
  }
  return data;
}

// ============================================================================
// Error Handling Helper (Firestore Security Rules & Permission Errors)
// ============================================================================

export function handleFirestoreError(
  operation: 'create' | 'update' | 'delete' | 'list' | 'get' | 'write',
  path: string,
  error: unknown
): void {
  const errObj = {
    operation,
    path,
    message: error instanceof Error ? error.message : String(error)
  };
  console.warn(`[Firestore Safe Fallback] Error during ${operation} on ${path}:`, errObj);
}

// ============================================================================
// 1. User Profile: /users/{uid}
// ============================================================================

export async function fetchUserProfileFromFirestore(uid: string): Promise<UserProfile | null> {
  try {
    const userDocRef = doc(db, 'users', uid);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      const data = snap.data();
      return {
        name: data.name || initialProfile.name,
        farmName: data.farmName || data.companyName || initialProfile.farmName,
        companyName: data.companyName || initialProfile.companyName,
        phone: data.phone || initialProfile.phone,
        applicantAddress: data.applicantAddress || initialProfile.applicantAddress,
        apiaryLocation: data.apiaryLocation || initialProfile.apiaryLocation,
        apiaryTitle: data.apiaryTitle || initialProfile.apiaryTitle,
        hiveCount: typeof data.hiveCount === 'number' && data.hiveCount > 0 ? data.hiveCount : 50
      };
    }
    return null;
  } catch (err) {
    console.warn('Error reading user profile from Firestore:', err);
    return null;
  }
}

export async function saveUserProfileToFirestore(
  uid: string,
  profile: UserProfile,
  authData?: { email?: string | null; photoURL?: string | null; displayName?: string | null }
): Promise<void> {
  try {
    const userDocRef = doc(db, 'users', uid);
    const profilePayload = sanitizeForFirestore({
      uid,
      name: profile.name || authData?.displayName || '허니비테코 양봉인',
      farmName: profile.farmName || '',
      companyName: profile.companyName || '',
      phone: profile.phone || '',
      applicantAddress: profile.applicantAddress || '',
      apiaryLocation: profile.apiaryLocation || '',
      apiaryTitle: profile.apiaryTitle || '',
      hiveCount: profile.hiveCount || 50,
      email: authData?.email || null,
      photoURL: authData?.photoURL || null,
      role: 'beekeeper',
      updatedAt: new Date().toISOString()
    });
    await setDoc(userDocRef, profilePayload, { merge: true });
  } catch (err) {
    console.warn('Error saving user profile to Firestore:', err);
    throw err;
  }
}

// ============================================================================
// 2. Apiary & Hives: /users/{uid}/apiaries/{apiaryId} & /hives/{hiveId}
// ============================================================================

export interface ApiaryDocument {
  id: string;
  name: string;
  address: string;
  hiveCount: number;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export async function saveApiaryToFirestore(
  uid: string,
  apiary: ApiaryDocument
): Promise<void> {
  try {
    const apiaryRef = doc(db, 'users', uid, 'apiaries', apiary.id);
    const payload = sanitizeForFirestore({
      ...apiary,
      updatedAt: new Date().toISOString()
    });
    await setDoc(apiaryRef, payload, { merge: true });
  } catch (err) {
    console.warn('Error saving apiary to Firestore:', err);
    throw err;
  }
}

export async function saveHivesToFirestore(
  uid: string,
  apiaryId: string,
  hives: HiveItem[]
): Promise<void> {
  try {
    const batch = writeBatch(db);
    for (const hive of hives) {
      const hiveDocRef = doc(db, 'users', uid, 'apiaries', apiaryId, 'hives', String(hive.id));
      const payload = sanitizeForFirestore({
        hiveNumber: hive.id,
        name: hive.name,
        queenGen: hive.queenGen,
        queenAge: hive.queenAge,
        status: hive.status,
        eggRate: hive.eggRate,
        honeyYield: hive.honeyYield,
        lastCheckDate: hive.lastCheckDate,
        notes: hive.notes,
        updatedAt: new Date().toISOString()
      });
      batch.set(hiveDocRef, payload, { merge: true });
    }
    await batch.commit();
  } catch (err) {
    console.warn('Error saving hives to Firestore:', err);
    throw err;
  }
}

export async function fetchHivesFromFirestore(
  uid: string,
  apiaryId: string
): Promise<HiveItem[] | null> {
  try {
    const hivesRef = collection(db, 'users', uid, 'apiaries', apiaryId, 'hives');
    const snap = await getDocs(hivesRef);
    if (!snap.empty) {
      const items: HiveItem[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: data.hiveNumber || Number(d.id),
          name: data.name || `${data.hiveNumber || d.id}번 벌통`,
          queenGen: data.queenGen || 'F1 세대',
          queenAge: data.queenAge || '2024년생',
          status: data.status || '정상',
          eggRate: data.eggRate ?? 90,
          honeyYield: data.honeyYield ?? 15,
          lastCheckDate: data.lastCheckDate || '',
          notes: data.notes || ''
        };
      });
      return items.sort((a, b) => a.id - b.id);
    }
    return null;
  } catch (err) {
    console.warn('Error fetching hives from Firestore:', err);
    return null;
  }
}

// ============================================================================
// 3. AI Beekeeping Journals: /users/{uid}/journals/{journalId}
// Preserves originalText, aiSummary, date, category, tags, and weather
// ============================================================================

export interface FirestoreJournalDoc extends VoiceLogItem {
  userId?: string;
  originalText?: string;
  aiSummary?: string;
  audioUrl?: string;
  audioPath?: string;
  createdAt?: string;
  updatedAt?: string;
}

export async function saveJournalToFirestore(
  uid: string,
  log: VoiceLogItem,
  extra?: { originalText?: string; aiSummary?: string; audioUrl?: string; audioPath?: string }
): Promise<void> {
  console.log('[FIRESTORE DEBUG] saveJournalToFirestore START');
  console.log('[FIRESTORE DEBUG] uid:', uid);
  console.log('[FIREBASE DEBUG] projectId:', firebaseConfig.projectId || db.app.options.projectId);
  console.log('[FIREBASE DEBUG] databaseId:', databaseId);

  try {
    const docId = log.id || `journal-${Date.now()}`;
    const journalRef = doc(db, 'users', uid, 'journals', docId);

    const rawData: Record<string, any> = {
      ...log,
      id: docId,
      userId: uid,
      originalText: extra?.originalText || log.originalText || log.text || '',
      aiSummary: extra?.aiSummary || log.aiSummary || log.text || '',
      updatedAt: new Date().toISOString(),
      createdAt: log.date ? `${log.date} ${log.timestamp || '00:00'}` : new Date().toISOString()
    };

    if (extra?.audioUrl) rawData.audioUrl = extra.audioUrl;
    if (extra?.audioPath) rawData.audioPath = extra.audioPath;

    // Purge any undefined fields recursively to satisfy Firestore setDoc constraints
    const cleanDoc = sanitizeForFirestore(rawData);

    // 1. Ensure root user document exists in 'users' collection
    const userDocRef = doc(db, 'users', uid);
    console.log('[FIRESTORE DEBUG] user document path: users/' + uid);
    console.log('[FIRESTORE DEBUG] user setDoc START');
    try {
      await setDoc(userDocRef, { uid, updatedAt: new Date().toISOString() }, { merge: true });
      console.log('[FIRESTORE DEBUG] user setDoc SUCCESS');
    } catch (userErr: any) {
      console.error('[FIRESTORE DEBUG] user setDoc ERROR:', userErr?.code || 'unknown', userErr?.message || userErr);
      throw userErr;
    }

    // 2. Save journal document in subcollection
    console.log('[FIRESTORE DEBUG] journal path: users/' + uid + '/journals/' + docId);
    console.log('[FIRESTORE DEBUG] journal setDoc START');
    try {
      await setDoc(journalRef, cleanDoc, { merge: true });
      console.log('[FIRESTORE DEBUG] journal setDoc SUCCESS');
    } catch (journalErr: any) {
      console.error('[FIRESTORE DEBUG] journal setDoc ERROR:', journalErr?.code || 'unknown', journalErr?.message || journalErr);
      throw journalErr;
    }

    console.log('[FIRESTORE DEBUG] saveJournalToFirestore RESOLVE (SUCCESS)');
  } catch (err: any) {
    console.error('[FIRESTORE DEBUG] saveJournalToFirestore REJECT:', err?.code || 'unknown', err?.message || err);
    throw err;
  }
}

export async function updateJournalInFirestore(
  uid: string,
  log: VoiceLogItem
): Promise<void> {
  console.log('[FIRESTORE DEBUG] updateJournalInFirestore START, docId:', log.id);
  if (!log.id) {
    throw new Error('Journal document ID is required for update.');
  }

  try {
    const journalRef = doc(db, 'users', uid, 'journals', log.id);

    const rawData: Record<string, any> = {
      ...log,
      id: log.id,
      userId: uid,
      updatedAt: new Date().toISOString()
    };

    // Strictly preserve originalText if it exists; NEVER copy text into originalText, never invent it if missing
    if (log.originalText !== undefined) {
      rawData.originalText = log.originalText;
    }
    if (log.aiSummary !== undefined) {
      rawData.aiSummary = log.aiSummary;
    }

    const cleanDoc = sanitizeForFirestore(rawData);

    await setDoc(journalRef, cleanDoc, { merge: true });
    console.log('[FIRESTORE DEBUG] updateJournalInFirestore SUCCESS, docId:', log.id);
  } catch (err: any) {
    console.error('[FIRESTORE DEBUG] updateJournalInFirestore ERROR:', err?.code || 'unknown', err?.message || err);
    throw err;
  }
}

export async function fetchJournalsFromFirestore(uid: string): Promise<VoiceLogItem[]> {
  try {
    const journalsRef = collection(db, 'users', uid, 'journals');
    const snap = await getDocs(journalsRef);
    if (!snap.empty) {
      const logs: VoiceLogItem[] = snap.docs.map((d) => {
        const data = d.data() as FirestoreJournalDoc;
        return {
          id: d.id,
          hiveRange: data.hiveRange || '#1 ~ #50',
          ...(typeof data.hiveId === 'number' ? { hiveId: data.hiveId } : {}),
          ...(Array.isArray(data.hiveIds) && data.hiveIds.length > 0
            ? { hiveIds: data.hiveIds.map(Number).filter((n) => !isNaN(n) && n > 0) }
            : {}),
          ...(data.inspectionDetails && typeof data.inspectionDetails === 'object'
            ? { inspectionDetails: data.inspectionDetails }
            : {}),
          text: data.text || data.originalText || '',
          status: data.status || '완료',
          timestamp: data.timestamp || '09:00',
          date: data.date || data.createdAt?.slice(0, 10) || new Date().toISOString().slice(0, 10),
          category: data.category || '벌통 상태',
          weatherTag: data.weatherTag,
          weatherSnapshot: data.weatherSnapshot,
          tags: data.tags || ['음성내검'],
          audioDuration: data.audioDuration,
          honeyYieldKg: data.honeyYieldKg,
          originalText: data.originalText,
          aiSummary: data.aiSummary
        };
      });
      // Sort newest date & timestamp first
      return logs.sort((a, b) => (b.date + b.timestamp).localeCompare(a.date + a.timestamp));
    }
    return [];
  } catch (err) {
    console.warn('Error fetching journals from Firestore:', err);
    return [];
  }
}

export async function deleteJournalFromFirestore(uid: string, journalId: string): Promise<void> {
  try {
    const journalRef = doc(db, 'users', uid, 'journals', journalId);
    await deleteDoc(journalRef);
  } catch (err) {
    console.warn('Error deleting journal from Firestore:', err);
    throw err;
  }
}

// ============================================================================
// 4. Breeder Queens & Lineage: /users/{uid}/queens/{queenId}
// ============================================================================

export async function saveBreederQueenToFirestore(uid: string, queen: BreederQueen): Promise<void> {
  try {
    const queenRef = doc(db, 'users', uid, 'queens', queen.id);
    const payload = sanitizeForFirestore({
      ...queen,
      updatedAt: new Date().toISOString()
    });
    await setDoc(queenRef, payload, { merge: true });
  } catch (err) {
    console.warn('Error saving queen to Firestore:', err);
    throw err;
  }
}

export const saveQueenToFirestore = saveBreederQueenToFirestore;

export async function deleteQueenFromFirestore(uid: string, queenId: string): Promise<void> {
  try {
    const queenRef = doc(db, 'users', uid, 'queens', queenId);
    await deleteDoc(queenRef);
  } catch (err) {
    console.warn('Error deleting queen from Firestore:', err);
    throw err;
  }
}

export async function saveAllQueensToFirestore(uid: string, queens: BreederQueen[]): Promise<void> {
  try {
    const batch = writeBatch(db);
    for (const queen of queens) {
      const queenRef = doc(db, 'users', uid, 'queens', queen.id);
      const payload = sanitizeForFirestore({
        ...queen,
        updatedAt: new Date().toISOString()
      });
      batch.set(queenRef, payload, { merge: true });
    }
    await batch.commit();
  } catch (err) {
    console.warn('Error saving all queens to Firestore:', err);
    throw err;
  }
}

export async function fetchQueensFromFirestore(uid: string): Promise<BreederQueen[] | null> {
  try {
    const queensRef = collection(db, 'users', uid, 'queens');
    const snap = await getDocs(queensRef);
    if (!snap.empty) {
      const items: BreederQueen[] = snap.docs.map((d) => d.data() as BreederQueen);
      return items;
    }
    return null;
  } catch (err) {
    console.warn('Error fetching queens from Firestore:', err);
    return null;
  }
}

// ============================================================================
// 5. Sales Records: /users/{uid}/sales/{saleId}
// ============================================================================

export async function saveSaleToFirestore(
  uid: string,
  record: BeekeepingSalesRecord
): Promise<void> {
  try {
    const saleRef = doc(db, 'users', uid, 'sales', record.id);
    const payload = sanitizeForFirestore({
      ...record,
      updatedAt: new Date().toISOString()
    });
    await setDoc(saleRef, payload, { merge: true });
  } catch (err) {
    console.warn('Error saving sale record to Firestore:', err);
    throw err;
  }
}

export async function saveSalesToFirestore(
  uid: string,
  records: BeekeepingSalesRecord[]
): Promise<void> {
  try {
    const batch = writeBatch(db);
    for (const record of records) {
      const saleRef = doc(db, 'users', uid, 'sales', record.id);
      const payload = sanitizeForFirestore({
        ...record,
        updatedAt: new Date().toISOString()
      });
      batch.set(saleRef, payload, { merge: true });
    }
    await batch.commit();
  } catch (err) {
    console.warn('Error saving sales to Firestore:', err);
    throw err;
  }
}

export async function fetchSalesFromFirestore(uid: string): Promise<BeekeepingSalesRecord[] | null> {
  try {
    const salesRef = collection(db, 'users', uid, 'sales');
    const snap = await getDocs(salesRef);
    if (!snap.empty) {
      const items: BeekeepingSalesRecord[] = snap.docs.map(
        (d) => d.data() as BeekeepingSalesRecord
      );
      return items.sort((a, b) => b.date.localeCompare(a.date));
    }
    return null;
  } catch (err) {
    handleFirestoreError('list', `users/${uid}/sales`, err);
    return null;
  }
}

export async function deleteSaleFromFirestore(uid: string, saleId: string): Promise<void> {
  try {
    const saleRef = doc(db, 'users', uid, 'sales', saleId);
    await deleteDoc(saleRef);
  } catch (err) {
    handleFirestoreError('delete', `users/${uid}/sales/${saleId}`, err);
    throw err;
  }
}

// ============================================================================
// 6. Expense Records: /users/{uid}/expenses/{expenseId}
// ============================================================================

export async function saveExpenseToFirestore(
  uid: string,
  record: BeekeepingExpenseRecord
): Promise<void> {
  try {
    const expenseRef = doc(db, 'users', uid, 'expenses', record.id);
    const payload = sanitizeForFirestore({
      ...record,
      updatedAt: new Date().toISOString()
    });
    await setDoc(expenseRef, payload, { merge: true });
  } catch (err) {
    handleFirestoreError('write', `users/${uid}/expenses/${record.id}`, err);
    throw err;
  }
}

export async function saveExpensesToFirestore(
  uid: string,
  records: BeekeepingExpenseRecord[]
): Promise<void> {
  try {
    const batch = writeBatch(db);
    for (const record of records) {
      const expenseRef = doc(db, 'users', uid, 'expenses', record.id);
      const payload = sanitizeForFirestore({
        ...record,
        updatedAt: new Date().toISOString()
      });
      batch.set(expenseRef, payload, { merge: true });
    }
    await batch.commit();
  } catch (err) {
    handleFirestoreError('write', `users/${uid}/expenses`, err);
    throw err;
  }
}

export async function fetchExpensesFromFirestore(
  uid: string
): Promise<BeekeepingExpenseRecord[] | null> {
  try {
    const expensesRef = collection(db, 'users', uid, 'expenses');
    const snap = await getDocs(expensesRef);
    if (!snap.empty) {
      const items: BeekeepingExpenseRecord[] = snap.docs.map(
        (d) => d.data() as BeekeepingExpenseRecord
      );
      return items.sort((a, b) => b.date.localeCompare(a.date));
    }
    return null;
  } catch (err) {
    handleFirestoreError('list', `users/${uid}/expenses`, err);
    return null;
  }
}

export async function deleteExpenseFromFirestore(uid: string, expenseId: string): Promise<void> {
  try {
    const expenseRef = doc(db, 'users', uid, 'expenses', expenseId);
    await deleteDoc(expenseRef);
  } catch (err) {
    handleFirestoreError('delete', `users/${uid}/expenses/${expenseId}`, err);
    throw err;
  }
}

// ============================================================================
// 7. Migration Helper: Safely transfer local data to Firestore if user logs in
// ============================================================================

export async function migrateLocalDataToFirestoreIfEmpty(
  uid: string,
  localData: {
    profile?: UserProfile;
    journals?: VoiceLogItem[];
    sales?: BeekeepingSalesRecord[];
    expenses?: BeekeepingExpenseRecord[];
    queens?: BreederQueen[];
  }
): Promise<{ migrated: boolean; count: number }> {
  try {
    // 1. Profile
    const existingProfile = await fetchUserProfileFromFirestore(uid);
    if (!existingProfile && localData.profile) {
      await saveUserProfileToFirestore(uid, localData.profile);
    }

    // 2. Apiary Doc
    if (localData.profile) {
      await saveApiaryToFirestore(uid, {
        id: 'primary_apiary',
        name: localData.profile.apiaryTitle || '허니비테코 지리산 제1봉장',
        address: localData.profile.apiaryLocation,
        hiveCount: localData.profile.hiveCount || 50
      });
    }

    let count = 0;

    // 3. Journals
    const existingJournals = await fetchJournalsFromFirestore(uid);
    if (existingJournals.length === 0 && localData.journals && localData.journals.length > 0) {
      for (const j of localData.journals) {
        await saveJournalToFirestore(uid, j);
        count++;
      }
    }

    // 4. Sales
    const existingSales = await fetchSalesFromFirestore(uid);
    if ((!existingSales || existingSales.length === 0) && localData.sales && localData.sales.length > 0) {
      await saveSalesToFirestore(uid, localData.sales);
      count += localData.sales.length;
    }

    // 5. Expenses
    const existingExpenses = await fetchExpensesFromFirestore(uid);
    if ((!existingExpenses || existingExpenses.length === 0) && localData.expenses && localData.expenses.length > 0) {
      await saveExpensesToFirestore(uid, localData.expenses);
      count += localData.expenses.length;
    }

    // 6. Queens
    const existingQueens = await fetchQueensFromFirestore(uid);
    if ((!existingQueens || existingQueens.length === 0) && localData.queens && localData.queens.length > 0) {
      await saveAllQueensToFirestore(uid, localData.queens);
      count += localData.queens.length;
    }

    return { migrated: count > 0, count };
  } catch (err) {
    console.warn('Migration to Firestore encountered an issue:', err);
    return { migrated: false, count: 0 };
  }
}

// ============================================================================
// 7. Honey Production LOTs: /users/{uid}/honeyLots/{lotId}
// ============================================================================

export async function saveHoneyLotToFirestore(uid: string, lot: HoneyLot): Promise<void> {
  if (!uid) throw new Error('User ID is required to save Honey Lot');
  const docId = lot.id || `lot-${Date.now()}`;
  const lotRef = doc(db, 'users', uid, 'honeyLots', docId);

  // Inbound date fallback rule: if empty or undefined, inboundDate = harvestDate
  const inboundDate =
    lot.inboundDate && lot.inboundDate.trim() ? lot.inboundDate.trim() : lot.harvestDate;

  const publicTraceId =
    lot.publicTraceId && lot.publicTraceId.trim()
      ? lot.publicTraceId.trim()
      : generatePublicTraceId();

  const payload = sanitizeForFirestore({
    ...lot,
    id: docId,
    publicTraceId,
    inboundDate,
    updatedAt: new Date().toISOString(),
    createdAt: lot.createdAt || new Date().toISOString()
  });

  await setDoc(lotRef, payload, { merge: true });
}

export async function updateHoneyLotInFirestore(uid: string, lot: HoneyLot): Promise<void> {
  if (!uid || !lot.id) throw new Error('User ID and Lot ID are required for update');
  const lotRef = doc(db, 'users', uid, 'honeyLots', lot.id);

  const inboundDate =
    lot.inboundDate && lot.inboundDate.trim() ? lot.inboundDate.trim() : lot.harvestDate;

  const publicTraceId =
    lot.publicTraceId && lot.publicTraceId.trim()
      ? lot.publicTraceId.trim()
      : generatePublicTraceId();

  const payload: Record<string, any> = sanitizeForFirestore({
    ...lot,
    publicTraceId,
    inboundDate,
    updatedAt: new Date().toISOString()
  });

  if (lot.inspectionReportUrl === undefined) {
    payload.inspectionReportUrl = deleteField();
  }
  if (lot.inspectionReportName === undefined) {
    payload.inspectionReportName = deleteField();
  }

  await setDoc(lotRef, payload, { merge: true });
}

export async function deleteHoneyLotFromFirestore(uid: string, lotId: string): Promise<void> {
  if (!uid || !lotId) throw new Error('User ID and Lot ID are required for deletion');
  const lotRef = doc(db, 'users', uid, 'honeyLots', lotId);
  await deleteDoc(lotRef);
}

export async function loadHoneyLotsFromFirestore(uid: string): Promise<HoneyLot[]> {
  if (!uid) return [];
  try {
    const lotsRef = collection(db, 'users', uid, 'honeyLots');
    const q = query(lotsRef, orderBy('harvestDate', 'desc'));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      return snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          honeyType: data.honeyType || '아카시아꿀',
          productName: data.productName || '허니비테코 아카시아꿀',
          nectarSource: data.nectarSource,
          harvestDate: data.harvestDate || '',
          inboundDate: data.inboundDate || data.harvestDate || '',
          harvestQuantityKg: data.harvestQuantityKg,
          hiveIds: data.hiveIds || [],
          hiveRange: data.hiveRange,
          farmName: data.farmName,
          lotNumber: data.lotNumber || '',
          publicTraceId: data.publicTraceId,
          inspectionReportUrl: data.inspectionReportUrl,
          inspectionReportName: data.inspectionReportName,
          inspectionReportSummary: data.inspectionReportSummary,
          notes: data.notes,
          // Optional productType (honey, royalJelly, propolis, other) - preserves backwards compatibility
          productType: data.productType,
          productId: data.productId,
          productImageUrl: data.productImageUrl,
          packageUnit: data.packageUnit,
          storageMethod: data.storageMethod,
          // Optional traceability extensions (preserves backwards compatibility)
          productionPeriod: data.productionPeriod,
          harvestOperations: data.harvestOperations,
          harvestDateRangeDisplay: data.harvestDateRangeDisplay,
          totalYieldKg: data.totalYieldKg,
          totalHiveCount: data.totalHiveCount,
          aggregatedHiveRange: data.aggregatedHiveRange,
          associatedJournalIds: data.associatedJournalIds,
          nectarSources: data.nectarSources,
          aiProductionStory: data.aiProductionStory,
          isPublicForConsumer: data.isPublicForConsumer,
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString()
        } as HoneyLot;
      });
    }
    return [];
  } catch (err) {
    console.warn('Error loading Honey Lots from Firestore:', err);
    return [];
  }
}

// ============================================================================
// 8. Beekeeper Products: /users/{uid}/products/{productId}
// ============================================================================

export async function saveProductToFirestore(
  uid: string,
  product: BeekeeperProduct
): Promise<void> {
  if (!uid) throw new Error('User ID is required to save Product');
  const docId = product.id || `prod-${Date.now()}`;
  const prodRef = doc(db, 'users', uid, 'products', docId);

  const payload = sanitizeForFirestore({
    ...product,
    id: docId,
    beekeeperUid: uid,
    updatedAt: new Date().toISOString(),
    createdAt: product.createdAt || new Date().toISOString()
  });

  await setDoc(prodRef, payload, { merge: true });
}

export async function loadProductsFromFirestore(uid: string): Promise<BeekeeperProduct[]> {
  if (!uid) return [];
  try {
    const productsRef = collection(db, 'users', uid, 'products');
    const q = query(productsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      return snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          beekeeperUid: data.beekeeperUid || uid,
          productType: data.productType || 'honey',
          productName: data.productName || '',
          description: data.description || '',
          photoUrl: data.photoUrl,
          photoStoragePath: data.photoStoragePath,
          packageUnit: data.packageUnit,
          storageMethod: data.storageMethod,
          customProperties: data.customProperties,
          inspectionReportUrl: data.inspectionReportUrl,
          inspectionReportName: data.inspectionReportName,
          isPublic: data.isPublic !== false,
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString()
        } as BeekeeperProduct;
      });
    }
    return [];
  } catch (err) {
    console.warn('Error loading Products from Firestore:', err);
    return [];
  }
}

export async function deleteProductFromFirestore(uid: string, productId: string): Promise<void> {
  if (!uid || !productId) throw new Error('User ID and Product ID are required for deletion');
  const prodRef = doc(db, 'users', uid, 'products', productId);
  await deleteDoc(prodRef);
}


