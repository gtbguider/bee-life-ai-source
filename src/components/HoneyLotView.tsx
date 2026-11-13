import React, { useState, useEffect, useMemo } from 'react';
import {
  HoneyLot,
  HoneyLotDraft,
  BeekeeperProduct,
  ApiaryProductType,
  APIARY_PRODUCT_TYPE_LABELS,
  APIARY_PRODUCT_TYPE_ICONS
} from '../types';
import { useAuth } from '../contexts/AuthContext';
import { getProductTypeDisplay } from '../services/honeyLotService';
import {
  fetchHoneyLotDraftFromUserJournals,
  buildHoneyLotDraftFromJournals
} from '../services/honeyTraceDraftService';
import { HoneyTraceDraftModal } from './HoneyTraceDraftModal';
import { HoneyTraceConfirmModal } from './HoneyTraceConfirmModal';
import { HoneyLotDetailModal } from './HoneyLotDetailModal';
import { ensurePublicTraceId } from '../services/honeyTracePublicService';
import { publishHoneyTrace } from '../services/publicHoneyTraceService';
import {
  loadHoneyLotsFromFirestore,
  saveHoneyLotToFirestore,
  updateHoneyLotInFirestore,
  deleteHoneyLotFromFirestore,
  loadProductsFromFirestore,
  saveProductToFirestore,
  deleteProductFromFirestore
} from '../services/firestoreService';
import { HoneyLotForm } from './HoneyLotForm';
import { ProductFormModal } from './ProductFormModal';

interface HoneyLotViewProps {
  hiveCount?: number;
  farmName?: string;
}

const STORAGE_KEY = 'honeybee_honey_lots_v1';
const PRODUCTS_STORAGE_KEY = 'honeybee_beekeeper_products_v1';

function getLotsStorageKey(uid?: string): string {
  return uid ? `${STORAGE_KEY}_${uid}` : STORAGE_KEY;
}

function getProductsStorageKey(uid?: string): string {
  return uid ? `${PRODUCTS_STORAGE_KEY}_${uid}` : PRODUCTS_STORAGE_KEY;
}

const SAMPLE_STARTER_PRODUCTS: BeekeeperProduct[] = [
  {
    id: 'sample-prod-1',
    productType: 'honey',
    productName: '허니비테코 천연 아카시아꿀',
    description: '지리산 청정 아카시아 밀원에서 채밀한 100% 완숙 천연 벌꿀입니다.',
    packageUnit: '2.4kg 유리병',
    storageMethod: '실온보관(18~25℃)',
    isPublic: true,
    createdAt: '2026-05-20T00:00:00Z',
    updatedAt: '2026-05-20T00:00:00Z'
  },
  {
    id: 'sample-prod-2',
    productType: 'royalJelly',
    productName: '허니비테코 지리산 생로열제리',
    description: '왕대 이충 72시간 내 정밀 채취하여 급속 냉동한 100% 순수 생로열제리입니다.',
    packageUnit: '50g 병',
    storageMethod: '냉동보관(-18℃ 이하)',
    customProperties: {
      tenHdaPercent: '1.6% (공인 기준치 이상)',
      harvestIntervalHours: 72
    },
    isPublic: true,
    createdAt: '2026-05-20T00:00:00Z',
    updatedAt: '2026-05-20T00:00:00Z'
  },
  {
    id: 'sample-prod-3',
    productType: 'propolis',
    productName: '허니비테코 프리미엄 수용성 프로폴리스',
    description: '지리산 수목 수지에서 채집된 고순도 플라보노이드 항산화 프로폴리스입니다.',
    packageUnit: '100ml 스포이트병',
    storageMethod: '실온보관(직사광선 차단)',
    customProperties: {
      flavonoidContent: '1.8%',
      extractionMethod: '주정 추출 후 수용화'
    },
    isPublic: true,
    createdAt: '2026-05-20T00:00:00Z',
    updatedAt: '2026-05-20T00:00:00Z'
  }
];

function loadProductsFromStorage(uid?: string): BeekeeperProduct[] {
  try {
    const saved = localStorage.getItem(getProductsStorageKey(uid));
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn('Failed to load local products:', e);
  }
  return uid ? [] : SAMPLE_STARTER_PRODUCTS;
}

const SAMPLE_STARTER_LOTS: HoneyLot[] = [
  {
    id: 'sample-lot-1',
    publicTraceId: 'tr_sample_lot_1',
    honeyType: '아카시아꿀',
    productName: '허니비테코 천연 아카시아꿀',
    nectarSource: '지리산 청정 아카시아',
    harvestDate: '2026-05-28',
    inboundDate: '2026-05-28',
    harvestQuantityKg: 38,
    hiveIds: [12, 13, 14],
    hiveRange: '12 · 13 · 14번',
    farmName: '농업회사법인 허니비테코 주식회사',
    lotNumber: '2026-AC-20260528-01',
    notes: '지리산 1차 아카시아 만개기 채밀. 당도 우수.',
    createdAt: '2026-05-28T10:00:00Z',
    updatedAt: '2026-05-28T10:00:00Z'
  },
  {
    id: 'sample-lot-2',
    publicTraceId: 'tr_sample_lot_2',
    honeyType: '밤꿀',
    productName: '허니비테코 천연 토종 밤꿀',
    nectarSource: '지리산 야생 밤나무꽃',
    harvestDate: '2026-06-20',
    inboundDate: '2026-06-22',
    harvestQuantityKg: 42,
    hiveIds: [21, 22, 23],
    hiveRange: '21 · 22 · 23번',
    farmName: '농업회사법인 허니비테코 주식회사',
    lotNumber: '2026-CH-20260620-01',
    notes: '2일간 자연 숙성 후 입고 완료.',
    createdAt: '2026-06-20T14:30:00Z',
    updatedAt: '2026-06-22T09:00:00Z'
  }
];

function loadLotsFromStorage(uid?: string): HoneyLot[] {
  try {
    const saved = localStorage.getItem(getLotsStorageKey(uid));
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        if (uid) return parsed;
        if (parsed.length > 0) return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to load local honey lots:', e);
  }
  return uid ? [] : SAMPLE_STARTER_LOTS;
}

export const HoneyLotView: React.FC<HoneyLotViewProps> = ({
  hiveCount = 50,
  farmName = '농업회사법인 허니비테코 주식회사'
}) => {
  const { user } = useAuth();

  // Local storage initialization scoped by UID (sample starter lots only in guest mode)
  const [lots, setLots] = useState<HoneyLot[]>(() => loadLotsFromStorage(user?.uid));
  const [products, setProducts] = useState<BeekeeperProduct[]>(() => loadProductsFromStorage(user?.uid));

  const [activeSubTab, setActiveSubTab] = useState<'lots' | 'products'>('lots');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState<boolean>(false);
  const [editingLot, setEditingLot] = useState<HoneyLot | null>(null);
  const [editingProduct, setEditingProduct] = useState<BeekeeperProduct | null>(null);
  const [detailLot, setDetailLot] = useState<HoneyLot | null>(null);
  const [deleteConfirmLot, setDeleteConfirmLot] = useState<HoneyLot | null>(null);
  const [deleteConfirmProduct, setDeleteConfirmProduct] = useState<BeekeeperProduct | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // AI Honey Lot Draft state
  const [isDraftModalOpen, setIsDraftModalOpen] = useState<boolean>(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);
  const [honeyLotDraft, setHoneyLotDraft] = useState<HoneyLotDraft | null>(null);
  const [isGeneratingDraft, setIsGeneratingDraft] = useState<boolean>(false);

  const handleOpenAiDraft = async () => {
    setIsGeneratingDraft(true);
    setIsDraftModalOpen(true);
    try {
      let draft: HoneyLotDraft | null = null;
      if (user?.uid) {
        draft = await fetchHoneyLotDraftFromUserJournals(user.uid, { farmName });
      }

      // Fallback for offline/guest or UID-scoped local logs (never read another user's localStorage)
      if (!draft || !draft.hasSufficientData) {
        try {
          const journalKey = user?.uid
            ? `honeybee_beekeeping_journal_logs_v2_${user.uid}`
            : 'honeybee_beekeeping_journal_logs_v2';
          const localRaw = localStorage.getItem(journalKey);
          if (localRaw) {
            const localParsed = JSON.parse(localRaw);
            if (Array.isArray(localParsed) && localParsed.length > 0) {
              const localDraft = buildHoneyLotDraftFromJournals(localParsed, { farmName });
              if (localDraft.hasSufficientData || !draft) {
                draft = localDraft;
              }
            }
          }
        } catch (e) {
          console.warn('Failed to parse local journals for draft fallback:', e);
        }
      }

      if (!draft) {
        draft = buildHoneyLotDraftFromJournals([], { farmName });
      }

      setHoneyLotDraft(draft);
    } catch (err) {
      console.error('Failed to generate honey lot draft:', err);
      setHoneyLotDraft(buildHoneyLotDraftFromJournals([], { farmName }));
    } finally {
      setIsGeneratingDraft(false);
    }
  };

  // Sync to UID-scoped local storage
  useEffect(() => {
    try {
      localStorage.setItem(getLotsStorageKey(user?.uid), JSON.stringify(lots));
    } catch (e) {
      console.warn('Failed to persist honey lots to storage:', e);
    }
  }, [lots, user?.uid]);

  useEffect(() => {
    try {
      localStorage.setItem(getProductsStorageKey(user?.uid), JSON.stringify(products));
    } catch (e) {
      console.warn('Failed to persist products to storage:', e);
    }
  }, [products, user?.uid]);

  // Load from Firestore if authenticated, or reset when account changes
  useEffect(() => {
    let isMounted = true;
    const uid = user?.uid;
    setDetailLot(null);
    setEditingLot(null);
    setEditingProduct(null);
    setDeleteConfirmLot(null);
    setDeleteConfirmProduct(null);

    if (!uid) {
      setLots(loadLotsFromStorage(undefined));
      setProducts(loadProductsFromStorage(undefined));
      setIsLoading(false);
      return;
    }

    // Initialize with UID-scoped cache while fetching fresh Firestore data
    setLots(loadLotsFromStorage(uid));
    setProducts(loadProductsFromStorage(uid));

    (async () => {
      try {
        setIsLoading(true);
        let cloudLots = await loadHoneyLotsFromFirestore(uid);

        // 대상 야생화꿀 LOT(tr_d896dff40b0d49c590ad919099d83b79)의 잘못된 AC 코드를 WF(2026-WF-20260528-01)로 1회 정밀 보정
        const targetWildflowerLot = cloudLots.find(
          (l) =>
            l.publicTraceId === 'tr_d896dff40b0d49c590ad919099d83b79' &&
            l.lotNumber === '2026-AC-20260528-01'
        );
        if (targetWildflowerLot) {
          const correctedLot: HoneyLot = {
            ...targetWildflowerLot,
            lotNumber: '2026-WF-20260528-01',
            publicTraceId: 'tr_d896dff40b0d49c590ad919099d83b79'
          };
          try {
            await updateHoneyLotInFirestore(uid, correctedLot);
            await publishHoneyTrace(correctedLot.id, 'tr_d896dff40b0d49c590ad919099d83b79');
            cloudLots = cloudLots.map((l) => (l.id === correctedLot.id ? correctedLot : l));
          } catch (fixErr) {
            console.warn('Targeted LOT number correction warning:', fixErr);
          }
        }

        if (isMounted) {
          setLots(cloudLots);
          try {
            localStorage.setItem(getLotsStorageKey(uid), JSON.stringify(cloudLots));
          } catch (e) {}
        }

        // Load Beekeeper Products
        try {
          const cloudProducts = await loadProductsFromFirestore(uid);
          if (isMounted && cloudProducts.length > 0) {
            setProducts(cloudProducts);
            try {
              localStorage.setItem(getProductsStorageKey(uid), JSON.stringify(cloudProducts));
            } catch (e) {}
          }
        } catch (prodErr) {
          console.warn('Failed to fetch products from Firestore:', prodErr);
        }
      } catch (err) {
        console.warn('Failed to fetch honey lots from Firestore:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [user?.uid]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 2500);
  };

  // Save Product (Create or Update)
  const handleSaveProduct = async (product: BeekeeperProduct) => {
    if (user?.uid) {
      try {
        await saveProductToFirestore(user.uid, product);
      } catch (err) {
        console.warn('Error saving product to Firestore:', err);
      }
    }
    setProducts((prev) => {
      const idx = prev.findIndex((p) => p.id === product.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = product;
        return next;
      }
      return [product, ...prev];
    });
    showToast('제품 정보 및 대표 사진이 저장되었습니다.');
  };

  // Delete Product
  const handleDeleteProductConfirm = async () => {
    if (!deleteConfirmProduct) return;
    if (user?.uid) {
      try {
        await deleteProductFromFirestore(user.uid, deleteConfirmProduct.id);
      } catch (err) {
        console.warn('Error deleting product from Firestore:', err);
      }
    }
    setProducts((prev) => prev.filter((p) => p.id !== deleteConfirmProduct.id));
    setDeleteConfirmProduct(null);
    showToast('제품이 삭제되었습니다.');
  };

  // Start creating a new LOT from a registered Product
  const handleStartLotFromProduct = (product: BeekeeperProduct) => {
    const today = new Date().toISOString().split('T')[0];
    const initialLot: HoneyLot = {
      id: `lot-${Date.now()}`,
      productType: product.productType,
      productId: product.id,
      productName: product.productName,
      productImageUrl: product.photoUrl,
      packageUnit: product.packageUnit,
      storageMethod: product.storageMethod,
      honeyType:
        product.productType === 'royalJelly'
          ? '생로열제리'
          : product.productType === 'propolis'
          ? '프로폴리스'
          : product.productName.includes('밤')
          ? '밤꿀'
          : product.productName.includes('야생화')
          ? '야생화꿀'
          : '아카시아꿀',
      nectarSource:
        product.productType === 'royalJelly'
          ? '지리산 청정 밀원 생로열제리'
          : product.productType === 'propolis'
          ? '지리산 천연 수목 수지'
          : '국내산 천연 밀원',
      harvestDate: today,
      inboundDate: today,
      farmName,
      lotNumber: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setActiveSubTab('lots');
    setEditingLot(initialLot);
    setIsFormOpen(true);
  };

  // Create or Update LOT
  const handleSaveLot = async (lot: HoneyLot) => {
    const existingItem = lots.find((l) => l.id === lot.id);
    const isUpdate = Boolean(existingItem);
    const lotWithTraceId = ensurePublicTraceId({
      ...lot,
      publicTraceId: existingItem?.publicTraceId || lot.publicTraceId
    });

    // Update in Firestore if authenticated
    if (user?.uid) {
      if (isUpdate) {
        await updateHoneyLotInFirestore(user.uid, lotWithTraceId);
        // 이미 공개 게시된 LOT을 운영자가 명시적으로 수정한 경우 공개 문서의 lotNumber 등도 동기화 (publicTraceId는 동일 유지)
        if (lotWithTraceId.publicTraceId) {
          try {
            const existingPublic = await fetch(
              `/api/public-honey-traces/${encodeURIComponent(lotWithTraceId.publicTraceId)}`
            ).then((r) => (r.ok ? r.json() : null));
            if (existingPublic && existingPublic.status === 'found' && existingPublic.isPublished) {
              await publishHoneyTrace(lotWithTraceId.id, lotWithTraceId.publicTraceId);
            }
          } catch {
            // ignore sync check failure
          }
        }
      } else {
        await saveHoneyLotToFirestore(user.uid, lotWithTraceId);
      }
    }

    setLots((prev) => {
      if (isUpdate) {
        return prev.map((l) => (l.id === lotWithTraceId.id ? lotWithTraceId : l));
      } else {
        return [lotWithTraceId, ...prev];
      }
    });

    showToast(isUpdate ? '꿀 이력이 수정되었습니다.' : '꿀 이력이 성공적으로 등록되었습니다.');
  };

  // Delete LOT
  const handleDeleteConfirm = async () => {
    if (!deleteConfirmLot) return;

    if (user?.uid) {
      try {
        await deleteHoneyLotFromFirestore(user.uid, deleteConfirmLot.id);
      } catch (err) {
        console.warn('Error deleting LOT from Firestore:', err);
      }
    }

    setLots((prev) => prev.filter((l) => l.id !== deleteConfirmLot.id));
    if (detailLot?.id === deleteConfirmLot.id) {
      setDetailLot(null);
    }
    setDeleteConfirmLot(null);
    showToast('꿀 이력이 삭제되었습니다.');
  };

  // Handle final registration from AI draft confirmation
  const handleConfirmSaveFromDraft = async (newLot: HoneyLot) => {
    const lotWithTraceId = ensurePublicTraceId(newLot);

    // 1. Save to Firestore if authenticated
    if (user?.uid) {
      await saveHoneyLotToFirestore(user.uid, lotWithTraceId);
    }

    // 2. Update local state
    setLots((prev) => [lotWithTraceId, ...prev]);

    // 3. Close modals
    setIsConfirmModalOpen(false);
    setIsDraftModalOpen(false);

    // 4. Success toast
    showToast('양봉일지를 바탕으로 꿀 이력이 등록되었습니다.');
  };

  // Summary statistics
  const stats = useMemo(() => {
    let totalQty = 0;
    const typeCountMap: Record<string, number> = {};

    lots.forEach((l) => {
      if (typeof l.harvestQuantityKg === 'number' && !isNaN(l.harvestQuantityKg)) {
        totalQty += l.harvestQuantityKg;
      }
      typeCountMap[l.honeyType] = (typeCountMap[l.honeyType] || 0) + 1;
    });

    return {
      totalLots: lots.length,
      totalQuantityKg: Math.round(totalQty * 10) / 10,
      typeCountMap
    };
  }, [lots]);

  return (
    <div className="flex flex-col w-full min-h-screen pb-28 pt-20 bg-[#f4faff]">
      <div className="flex flex-col w-full px-3.5 sm:px-4 max-w-md mx-auto">
        {/* View Header */}
        <div className="flex items-center justify-between mb-3 mt-1">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[20px]">🍯</span>
              <h1 className="text-[19px] sm:text-[21px] font-black text-[#0d1e25] tracking-tight">
                생산 이력 및 제품 관리
              </h1>
            </div>
            <p className="text-[11.5px] text-[#554632] mt-0.5">
              제품별 대표 사진 등록과 LOT별 생산 이력 관리를 한 곳에서 운영합니다.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {activeSubTab === 'lots' ? (
              <>
                <button
                  onClick={handleOpenAiDraft}
                  disabled={isGeneratingDraft}
                  className="bg-[#fff9ee] hover:bg-[#ffeed1] text-[#7e5700] border border-[#f0d8a8] font-extrabold text-[12px] sm:text-[12.5px] px-3 py-2 rounded-2xl flex items-center gap-1 shadow-2xs active:scale-95 transition-all cursor-pointer shrink-0 disabled:opacity-50"
                >
                  {isGeneratingDraft ? (
                    <span className="w-3.5 h-3.5 border-2 border-[#7e5700] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span className="material-symbols-outlined text-[16px] text-[#7e5700]">auto_awesome</span>
                  )}
                  <span>일지에서 LOT 생성</span>
                </button>

                <button
                  onClick={() => {
                    setEditingLot(null);
                    setIsFormOpen(true);
                  }}
                  className="bg-[#7e5700] hover:bg-[#684700] text-white font-extrabold text-[12px] sm:text-[12.5px] px-3.5 py-2 rounded-2xl flex items-center gap-1 shadow-md active:scale-95 transition-all cursor-pointer shrink-0"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  <span>LOT 등록</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  setEditingProduct(null);
                  setIsProductModalOpen(true);
                }}
                className="bg-[#7e5700] hover:bg-[#684700] text-white font-extrabold text-[12px] sm:text-[12.5px] px-3.5 py-2 rounded-2xl flex items-center gap-1 shadow-md active:scale-95 transition-all cursor-pointer shrink-0"
              >
                <span className="material-symbols-outlined text-[16px]">add_photo_alternate</span>
                <span>새 제품 등록</span>
              </button>
            )}
          </div>
        </div>

        {/* 2대 서브 탭: 1) 생산 LOT 이력 관리, 2) 내 제품 관리 (품목 & 사진) */}
        <div className="flex items-center gap-1.5 p-1 bg-[#e8f1f5] rounded-2xl mb-4">
          <button
            type="button"
            onClick={() => setActiveSubTab('lots')}
            className={`flex-1 py-2 px-3 rounded-xl font-black text-[12.5px] transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeSubTab === 'lots'
                ? 'bg-white text-[#7e5700] shadow-xs'
                : 'text-[#685438] hover:text-[#2b1e00]'
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">inventory_2</span>
            <span>생산 LOT 이력 ({lots.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('products')}
            className={`flex-1 py-2 px-3 rounded-xl font-black text-[12.5px] transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeSubTab === 'products'
                ? 'bg-white text-[#7e5700] shadow-xs'
                : 'text-[#685438] hover:text-[#2b1e00]'
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">category</span>
            <span>내 제품 관리 ({products.length})</span>
          </button>
        </div>

      {/* 1) 생산 LOT 이력 탭 컨텐츠 */}
      {activeSubTab === 'lots' ? (
        <>
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-2 gap-2.5 mb-4">
            <div className="bg-white rounded-2xl p-3 border border-[#d6c4ac]/60 shadow-2xs">
              <div className="flex items-center gap-1 text-[11px] font-bold text-[#7e5700]">
                <span className="material-symbols-outlined text-[15px]">inventory_2</span>
                <span>총 등록 이력</span>
              </div>
              <div className="text-[20px] font-black text-[#0d1e25] mt-0.5">
                {stats.totalLots} <span className="text-[12px] font-normal text-[#554632]">건</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-3 border border-[#d6c4ac]/60 shadow-2xs">
              <div className="flex items-center gap-1 text-[11px] font-bold text-[#b34700]">
                <span className="material-symbols-outlined text-[15px]">scale</span>
                <span>총 누적 채밀량</span>
              </div>
              <div className="text-[20px] font-black text-[#b34700] mt-0.5">
                {stats.totalQuantityKg} <span className="text-[12px] font-normal text-[#554632]">kg</span>
              </div>
            </div>
          </div>

          {/* LOT List Section Header */}
          <div className="flex items-center justify-between mb-2 px-1">
            <h2 className="text-[14px] font-black text-[#0d1e25] flex items-center gap-1.5">
              <span>등록된 꿀 이력 목록</span>
              <span className="text-[11px] px-2 py-0.2 rounded-full bg-[#e8ded0] text-[#554632] font-bold">
                {lots.length}
              </span>
            </h2>
            {isLoading && (
              <span className="text-[11px] text-[#7e5700] flex items-center gap-1">
                <span className="w-2.5 h-2.5 border-2 border-[#7e5700] border-t-transparent rounded-full animate-spin" />
                <span>동기화 중...</span>
              </span>
            )}
          </div>

          {/* LOT Card List */}
          {lots.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 border border-dashed border-[#d6c4ac] text-center my-4 space-y-3">
              <div className="text-[36px]">🍯</div>
              <div className="font-bold text-[14px] text-[#2b1e00]">등록된 꿀 이력이 없습니다.</div>
              <p className="text-[12px] text-[#7e5700] leading-relaxed max-w-xs mx-auto">
                상단의 <strong>'+ 꿀 이력 등록'</strong> 버튼을 눌러 첫 번째 채밀 이력을 등록해보세요.
              </p>
              <button
                onClick={() => {
                  setEditingLot(null);
                  setIsFormOpen(true);
                }}
                className="inline-flex items-center gap-1 text-[12px] font-black text-[#7e5700] bg-[#fff3e0] px-4 py-2 rounded-xl border border-[#ffe082] hover:bg-[#ffe7ba] transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[15px]">add</span>
                <span>첫 꿀 이력 등록하기</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {lots.map((lot) => {
                // Badge color based on honey type
                let badgeBg = '#fbf0e0';
                let badgeText = '#a05c00';
                if (lot.honeyType.includes('밤')) {
                  badgeBg = '#ede3da';
                  badgeText = '#5a3818';
                } else if (lot.honeyType.includes('야생화') || lot.honeyType.includes('잡화')) {
                  badgeBg = '#e8f3ea';
                  badgeText = '#2b6e39';
                }

                return (
                  <div
                    key={lot.id}
                    onClick={() => setDetailLot(lot)}
                    className="bg-white rounded-2xl p-4 border border-[#d6c4ac]/70 shadow-2xs hover:border-[#7e5700]/60 hover:shadow-xs transition-all space-y-3 cursor-pointer group"
                  >
                    {/* Top: Type badge & LOT number */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-[#fff9ee] border border-[#ffdeac] text-[#7e5700] inline-flex items-center gap-0.5 shadow-2xs">
                            <span>{getProductTypeDisplay(lot.productType).icon}</span>
                            <span>{getProductTypeDisplay(lot.productType).label}</span>
                          </span>
                          <span
                            className="text-[10.5px] font-black px-2 py-0.5 rounded-md"
                            style={{ backgroundColor: badgeBg, color: badgeText }}
                          >
                            {lot.honeyType}
                          </span>
                          <h3 className="font-bold text-[13.5px] text-[#0d1e25] group-hover:text-[#7e5700] transition-colors">
                            {lot.productName}
                          </h3>
                        </div>
                        {/* LOT Number display */}
                        <div className="font-mono text-[13px] font-black text-[#7e5700] tracking-wide flex items-center gap-1">
                          <span className="text-[11px] font-sans font-semibold text-[#887864]">LOT:</span>
                          <span>{lot.lotNumber}</span>
                        </div>
                      </div>

                      {lot.harvestQuantityKg !== undefined && (
                        <div className="text-right shrink-0">
                          <div className="text-[10px] text-[#887864] font-semibold">
                            {lot.productType === 'royalJelly' ? '생산량' : '채밀량'}
                          </div>
                          <div className="text-[16px] font-black text-[#b34700]">
                            {lot.harvestQuantityKg}
                            <span className="text-[11px] font-normal text-[#554632]"> kg</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Grid Info */}
                    <div className="grid grid-cols-2 gap-y-1.5 gap-x-3 text-[12px] bg-[#fbf9f4] p-2.5 rounded-xl border border-[#eee4d4]">
                      <div>
                        <span className="text-[#887864] text-[11px]">
                          {lot.productType === 'royalJelly' ? '채취일: ' : '채밀일: '}
                        </span>
                        <strong className="text-[#0d1e25]">{lot.harvestDate.replace(/-/g, '.')}</strong>
                      </div>
                      <div>
                        <span className="text-[#887864] text-[11px]">입고일: </span>
                        <strong className="text-[#0d1e25]">
                          {lot.inboundDate ? lot.inboundDate.replace(/-/g, '.') : lot.harvestDate.replace(/-/g, '.')}
                        </strong>
                      </div>
                      <div className="col-span-2">
                        <span className="text-[#887864] text-[11px]">
                          {lot.productType === 'royalJelly' ? '관리 봉군: ' : '채밀 벌통: '}
                        </span>
                        <strong className="text-[#7e5700]">{lot.hiveRange || '전체 벌통'}</strong>
                      </div>
                      {lot.nectarSource && (
                        <div className="col-span-2 text-[11.5px] text-[#554632]">
                          <span className="text-[#887864] text-[11px]">
                            {lot.productType === 'royalJelly' ? '채취 밀원: ' : lot.productType === 'propolis' ? '수목 환경: ' : '주요 밀원: '}
                          </span>
                          <span>{lot.nectarSource}</span>
                        </div>
                      )}
                    </div>

                    {/* Notes preview if any */}
                    {lot.notes && (
                      <p className="text-[11.5px] text-[#6d5b45] line-clamp-1 italic px-1">
                        "{lot.notes}"
                      </p>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-[#f0e7d5]">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDetailLot(lot);
                        }}
                        className="text-[11.5px] font-bold text-[#554632] hover:text-[#2b1e00] px-2.5 py-1 rounded-lg hover:bg-[#f0e9df] transition-colors cursor-pointer flex items-center gap-0.5"
                      >
                        <span className="material-symbols-outlined text-[14px]">visibility</span>
                        <span>상세보기</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingLot(lot);
                          setIsFormOpen(true);
                        }}
                        className="text-[11.5px] font-bold text-[#7e5700] hover:text-[#5a3e00] px-2.5 py-1 rounded-lg hover:bg-[#fff9ef] transition-colors cursor-pointer flex items-center gap-0.5"
                      >
                        <span className="material-symbols-outlined text-[14px]">edit</span>
                        <span>수정</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirmLot(lot);
                        }}
                        className="text-[11.5px] font-bold text-[#a12b2b] hover:text-[#801b1b] px-2.5 py-1 rounded-lg hover:bg-[#feebeb] transition-colors cursor-pointer flex items-center gap-0.5"
                      >
                        <span className="material-symbols-outlined text-[14px]">delete</span>
                        <span>삭제</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        /* 2) 내 제품 관리 탭 컨텐츠 */
        <>
          {/* Summary KPI Cards for Products */}
          <div className="grid grid-cols-2 gap-2.5 mb-4">
            <div className="bg-white rounded-2xl p-3 border border-[#d6c4ac]/60 shadow-2xs">
              <div className="flex items-center gap-1 text-[11px] font-bold text-[#7e5700]">
                <span className="material-symbols-outlined text-[15px]">category</span>
                <span>총 등록 제품</span>
              </div>
              <div className="text-[20px] font-black text-[#0d1e25] mt-0.5">
                {products.length} <span className="text-[12px] font-normal text-[#554632]">종</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-3 border border-[#d6c4ac]/60 shadow-2xs">
              <div className="flex items-center gap-1 text-[11px] font-bold text-[#2e7d32]">
                <span className="material-symbols-outlined text-[15px]">photo_camera</span>
                <span>대표 사진 등록</span>
              </div>
              <div className="text-[20px] font-black text-[#2e7d32] mt-0.5">
                {products.filter((p) => Boolean(p.photoUrl)).length}{' '}
                <span className="text-[12px] font-normal text-[#554632]">개 완료</span>
              </div>
            </div>
          </div>

          {/* Product List Section Header */}
          <div className="flex items-center justify-between mb-2 px-1">
            <h2 className="text-[14px] font-black text-[#0d1e25] flex items-center gap-1.5">
              <span>내 양봉산물 제품 목록</span>
              <span className="text-[11px] px-2 py-0.2 rounded-full bg-[#e8ded0] text-[#554632] font-bold">
                {products.length}
              </span>
            </h2>
            <button
              onClick={() => {
                setEditingProduct(null);
                setIsProductModalOpen(true);
              }}
              className="text-[11.5px] font-extrabold text-[#7e5700] hover:text-[#5a3e00] flex items-center gap-0.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[15px]">add_circle</span>
              <span>새 제품 추가</span>
            </button>
          </div>

          {/* Product Card List */}
          {products.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 border border-dashed border-[#d6c4ac] text-center my-4 space-y-3">
              <div className="text-[36px]">🏷️</div>
              <div className="font-bold text-[14px] text-[#2b1e00]">등록된 제품이 없습니다.</div>
              <p className="text-[12px] text-[#7e5700] leading-relaxed max-w-xs mx-auto">
                천연벌꿀, 생로열제리, 프로폴리스 등 판매 중인 제품의 품목과 대표 사진을 등록해보세요.
              </p>
              <button
                onClick={() => {
                  setEditingProduct(null);
                  setIsProductModalOpen(true);
                }}
                className="inline-flex items-center gap-1 text-[12px] font-black text-[#7e5700] bg-[#fff3e0] px-4 py-2 rounded-xl border border-[#ffe082] hover:bg-[#ffe7ba] transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[15px]">add_photo_alternate</span>
                <span>첫 제품 등록하기</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {products.map((product) => {
                const typeDisplay = getProductTypeDisplay(product.productType);
                const connectedLots = lots.filter((l) => l.productId === product.id);

                return (
                  <div
                    key={product.id}
                    className="bg-white rounded-2xl p-4 border border-[#d6c4ac]/70 shadow-2xs hover:border-[#7e5700]/60 hover:shadow-xs transition-all space-y-3"
                  >
                    <div className="flex items-start gap-3">
                      {/* Product Representative Photo or Fallback Icon */}
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-[#faf4ea] border border-[#ebdcc4] shrink-0 flex items-center justify-center">
                        {product.photoUrl ? (
                          <img
                            src={product.photoUrl}
                            alt={product.productName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-center p-1">
                            <span className="text-[24px]">{typeDisplay.icon}</span>
                            <span className="text-[9.5px] font-bold text-[#a08a70] mt-0.5">사진미등록</span>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-[#fff9ee] border border-[#ffdeac] text-[#7e5700] inline-flex items-center gap-0.5 shadow-2xs">
                            <span>{typeDisplay.icon}</span>
                            <span>{typeDisplay.label}</span>
                          </span>
                          <h3 className="font-bold text-[14px] text-[#0d1e25] truncate">
                            {product.productName}
                          </h3>
                        </div>

                        <div className="text-[11.5px] text-[#6d5b45] space-y-0.5">
                          <div>
                            <span className="text-[#887864]">규격: </span>
                            <strong>{product.packageUnit || '미기재'}</strong>
                            <span className="mx-1 text-[#d8cca8]">·</span>
                            <span className="text-[#887864]">보관: </span>
                            <strong>{product.storageMethod || '미기재'}</strong>
                          </div>
                          {product.productType === 'royalJelly' && product.customProperties?.tenHdaPercent && (
                            <div className="text-[11px] text-[#b34700] font-semibold">
                              10-HDA: {product.customProperties.tenHdaPercent}
                            </div>
                          )}
                          {product.productType === 'propolis' && product.customProperties?.flavonoidContent && (
                            <div className="text-[11px] text-[#166534] font-semibold">
                              플라보노이드: {product.customProperties.flavonoidContent}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {product.description && (
                      <p className="text-[11.5px] text-[#554632] line-clamp-2 bg-[#fbf9f4] p-2 rounded-xl border border-[#eee4d4]/70 leading-relaxed">
                        {product.description}
                      </p>
                    )}

                    {/* Linked LOT count & Action buttons */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#f0e7d5] flex-wrap">
                      <span className="text-[11px] font-bold text-[#7e5700] flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">link</span>
                        <span>연결 LOT: {connectedLots.length}건</span>
                      </span>

                      <div className="flex items-center gap-1.5 ml-auto">
                        <button
                          type="button"
                          onClick={() => handleStartLotFromProduct(product)}
                          className="text-[11.5px] font-black text-[#7e5700] hover:text-[#5a3e00] bg-[#fff6e6] hover:bg-[#ffeed2] px-2.5 py-1 rounded-lg border border-[#f0d8a8] transition-colors cursor-pointer flex items-center gap-0.5"
                          title="이 제품의 정보를 바탕으로 새 LOT 생성"
                        >
                          <span className="material-symbols-outlined text-[14px]">add</span>
                          <span>LOT 등록</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setEditingProduct(product);
                            setIsProductModalOpen(true);
                          }}
                          className="text-[11.5px] font-bold text-[#554632] hover:text-[#2b1e00] px-2 py-1 rounded-lg hover:bg-[#f0e9df] transition-colors cursor-pointer flex items-center gap-0.5"
                        >
                          <span className="material-symbols-outlined text-[14px]">edit</span>
                          <span>수정</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeleteConfirmProduct(product)}
                          className="text-[11.5px] font-bold text-[#a12b2b] hover:text-[#801b1b] px-2 py-1 rounded-lg hover:bg-[#feebeb] transition-colors cursor-pointer flex items-center gap-0.5"
                        >
                          <span className="material-symbols-outlined text-[14px]">delete</span>
                          <span>삭제</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
      </div>

      {/* Comprehensive HoneyLot Detail Modal */}
      <HoneyLotDetailModal
        lot={detailLot}
        isOpen={Boolean(detailLot)}
        onClose={() => setDetailLot(null)}
        uid={user?.uid}
        onEdit={(lot) => {
          setDetailLot(null);
          setEditingLot(lot);
          setIsFormOpen(true);
        }}
        onDelete={(lot) => {
          setDeleteConfirmLot(lot);
        }}
        onLotUpdated={(updatedLot) => {
          setDetailLot(updatedLot);
          setLots((prev) => prev.map((l) => (l.id === updatedLot.id ? updatedLot : l)));
        }}
      />

      {/* Delete Confirmation Dialog */}
      {deleteConfirmLot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pt-safe pb-safe bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
          <div
            className="bg-white rounded-3xl w-full max-w-sm shadow-2xl border border-[#e8dec8] p-5 space-y-3 my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-10 rounded-2xl bg-[#feebeb] text-[#a12b2b] flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-[24px]">delete</span>
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-[15px] font-black text-[#2b1e00]">꿀 이력 삭제 확인</h3>
              <p className="text-[12px] text-[#6d5b45]">
                이 꿀 이력(<strong>{deleteConfirmLot.lotNumber}</strong>)을 삭제하시겠습니까?
                <br />
                삭제된 데이터는 복구할 수 없습니다.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmLot(null)}
                className="py-2 text-[12px] font-bold text-[#554632] bg-[#f4efe5] hover:bg-[#eadecc] rounded-xl transition-colors cursor-pointer"
              >
                취소
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="py-2 text-[12px] font-black text-white bg-[#a12b2b] hover:bg-[#862020] rounded-xl shadow-sm transition-colors cursor-pointer"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Form Modal */}
      <HoneyLotForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingLot(null);
        }}
        onSave={handleSaveLot}
        existingLot={editingLot}
        existingLots={lots}
        maxHiveCount={hiveCount}
        farmName={farmName}
        products={products}
        onOpenProductForm={() => {
          setIsFormOpen(false);
          setEditingProduct(null);
          setIsProductModalOpen(true);
        }}
      />

      {/* Beekeeper Product Create/Edit Modal */}
      <ProductFormModal
        isOpen={isProductModalOpen}
        onClose={() => {
          setIsProductModalOpen(false);
          setEditingProduct(null);
        }}
        onSave={handleSaveProduct}
        existingProduct={editingProduct}
        uid={user?.uid}
        farmName={farmName}
      />

      {/* Product Delete Confirmation Dialog */}
      {deleteConfirmProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pt-safe pb-safe bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
          <div
            className="bg-white rounded-3xl w-full max-w-sm shadow-2xl border border-[#e8dec8] p-5 space-y-3 my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-10 rounded-2xl bg-[#feebeb] text-[#a12b2b] flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-[24px]">delete</span>
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-[15px] font-black text-[#2b1e00]">제품 삭제 확인</h3>
              <p className="text-[12px] text-[#6d5b45]">
                이 제품(<strong>{deleteConfirmProduct.productName}</strong>)을 삭제하시겠습니까?
                <br />
                기존에 발행된 LOT 이력은 유지되며, 제품 카탈로그 목록에서만 삭제됩니다.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmProduct(null)}
                className="py-2 text-[12px] font-bold text-[#554632] bg-[#f4efe5] hover:bg-[#eadecc] rounded-xl transition-colors cursor-pointer"
              >
                취소
              </button>
              <button
                onClick={handleDeleteProductConfirm}
                className="py-2 text-[12px] font-black text-white bg-[#a12b2b] hover:bg-[#862020] rounded-xl shadow-sm transition-colors cursor-pointer"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Honey Lot Draft Preview Modal */}
      <HoneyTraceDraftModal
        isOpen={isDraftModalOpen}
        onClose={() => setIsDraftModalOpen(false)}
        draft={honeyLotDraft}
        isLoading={isGeneratingDraft}
        onOpenManualForm={() => {
          setEditingLot(null);
          setIsFormOpen(true);
        }}
        onProceedToConfirm={() => {
          setIsDraftModalOpen(false);
          setIsConfirmModalOpen(true);
        }}
      />

      {/* AI Honey Lot Draft Confirmation & Edit Modal (Final Registration) */}
      <HoneyTraceConfirmModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        draft={honeyLotDraft}
        existingLots={lots}
        farmName={farmName}
        onSaveSuccess={handleConfirmSaveFromDraft}
      />

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-[#0d1e25] text-white px-5 py-3 rounded-full shadow-2xl flex items-center gap-2 text-[13px] font-bold animate-bounce border border-white/20">
          <span className="material-symbols-outlined text-[#a0f399] text-[20px]">
            check_circle
          </span>
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
};
