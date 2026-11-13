import React, { useState, useEffect, useRef } from 'react';
import { BeekeeperProduct, ApiaryProductType, APIARY_PRODUCT_TYPE_LABELS, APIARY_PRODUCT_TYPE_ICONS } from '../types';
import { uploadProductPhoto } from '../services/storageService';
import { getDefaultProductMeta } from '../services/honeyLotService';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: BeekeeperProduct) => Promise<void>;
  existingProduct?: BeekeeperProduct | null;
  uid?: string;
  farmName?: string;
}

const PRODUCT_TYPE_OPTIONS: { type: ApiaryProductType; label: string; icon: string; desc: string }[] = [
  { type: 'honey', label: '천연벌꿀', icon: '🍯', desc: '아카시아, 밤, 야생화 등 완숙 천연꿀' },
  { type: 'royalJelly', label: '생로열제리', icon: '🥛', desc: '왕대 이충 72시간 생로열제리 (냉동 보관)' },
  { type: 'propolis', label: '프로폴리스', icon: '🌿', desc: '자연 수목 수지 추출 항산화 양봉산물' },
  { type: 'other', label: '기타 양봉산물', icon: '📦', desc: '화분, 밀랍 등 기타 양봉 제품' }
];

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  existingProduct,
  uid,
  farmName = '농업회사법인 허니비테코 주식회사'
}) => {
  const isEdit = Boolean(existingProduct);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [productType, setProductType] = useState<ApiaryProductType>('honey');
  const [productName, setProductName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [packageUnit, setPackageUnit] = useState<string>('2.4kg 유리병');
  const [storageMethod, setStorageMethod] = useState<string>('실온보관(18~25℃)');
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [photoStoragePath, setPhotoStoragePath] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');

  // Specialized attributes
  const [tenHdaPercent, setTenHdaPercent] = useState<string>('');
  const [harvestIntervalHours, setHarvestIntervalHours] = useState<string>('72');
  const [flavonoidContent, setFlavonoidContent] = useState<string>('');
  const [extractionMethod, setExtractionMethod] = useState<string>('주정 추출');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (existingProduct) {
      setProductType(existingProduct.productType);
      setProductName(existingProduct.productName || '');
      setDescription(existingProduct.description || '');
      setPackageUnit(existingProduct.packageUnit || '2.4kg 유리병');
      setStorageMethod(existingProduct.storageMethod || '실온보관(18~25℃)');
      setPhotoUrl(existingProduct.photoUrl || '');
      setPhotoStoragePath(existingProduct.photoStoragePath || '');
      setPhotoPreview(existingProduct.photoUrl || '');
      setSelectedFile(null);

      setTenHdaPercent(existingProduct.customProperties?.tenHdaPercent || '');
      setHarvestIntervalHours(
        existingProduct.customProperties?.harvestIntervalHours
          ? String(existingProduct.customProperties.harvestIntervalHours)
          : '72'
      );
      setFlavonoidContent(existingProduct.customProperties?.flavonoidContent || '');
      setExtractionMethod(existingProduct.customProperties?.extractionMethod || '주정 추출');
    } else {
      // Default to Honey
      const def = getDefaultProductMeta('아카시아꿀', farmName, 'honey');
      setProductType('honey');
      setProductName(def.productName);
      setDescription('지리산 청정 자연에서 채밀하여 인위적 농축 없이 완성한 프리미엄 천연 벌꿀입니다.');
      setPackageUnit(def.packageUnit || '2.4kg 유리병');
      setStorageMethod(def.storageMethod || '실온보관(18~25℃)');
      setPhotoUrl('');
      setPhotoStoragePath('');
      setPhotoPreview('');
      setSelectedFile(null);

      setTenHdaPercent('');
      setHarvestIntervalHours('72');
      setFlavonoidContent('');
      setExtractionMethod('주정 추출');
    }
    setErrorMsg(null);
  }, [isOpen, existingProduct, farmName]);

  const handleProductTypeChange = (newType: ApiaryProductType) => {
    setProductType(newType);
    const def = getDefaultProductMeta('아카시아꿀', farmName, newType);

    if (!isEdit || !productName) {
      setProductName(def.productName);
    }
    if (def.packageUnit) {
      setPackageUnit(def.packageUnit);
    }
    if (def.storageMethod) {
      setStorageMethod(def.storageMethod);
    }

    if (!isEdit) {
      if (newType === 'royalJelly') {
        setDescription('청정 봉장의 왕대 이충 후 72시간 정밀 채취하여 신선함을 영하 18도 이하에서 급속 동결 보존한 프리미엄 생로열제리입니다.');
      } else if (newType === 'propolis') {
        setDescription('꿀벌이 수목의 수지를 채집하여 만든 천연 항산화 물질로, 유효 플라보노이드를 고농도로 담아낸 프로폴리스입니다.');
      } else if (newType === 'honey') {
        setDescription('인위적인 가열 농축을 배제하고 꿀벌의 날갯짓으로 자연 숙성된 순수 천연벌꿀입니다.');
      } else {
        setDescription('정성껏 생산한 농가 정품 양봉산물입니다.');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('이미지 파일(JPG, PNG, WebP)만 등록 가능합니다.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('사진 파일 크기는 10MB 이하만 가능합니다.');
      return;
    }

    setErrorMsg(null);
    setSelectedFile(file);

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPhotoPreview(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setSelectedFile(null);
    setPhotoPreview('');
    setPhotoUrl('');
    setPhotoStoragePath('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName.trim()) {
      setErrorMsg('제품명을 입력해 주세요.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const productId = existingProduct?.id || `prod_${Date.now()}`;
      let finalPhotoUrl = photoUrl;
      let finalPhotoStoragePath = photoStoragePath;

      // Upload photo to Firebase Storage if a new file was chosen and user is authenticated
      if (selectedFile) {
        if (uid) {
          try {
            const uploadRes = await uploadProductPhoto(uid, productId, selectedFile);
            finalPhotoUrl = uploadRes.downloadUrl;
            finalPhotoStoragePath = uploadRes.storagePath;
          } catch (storageErr) {
            console.warn('Firebase Storage upload failed, falling back to local data URL:', storageErr);
            finalPhotoUrl = photoPreview;
          }
        } else {
          // Guest mode fallback
          finalPhotoUrl = photoPreview;
        }
      }

      const productPayload: BeekeeperProduct = {
        id: productId,
        beekeeperUid: uid,
        productType,
        productName: productName.trim(),
        description: description.trim(),
        packageUnit: packageUnit.trim(),
        storageMethod: storageMethod.trim(),
        photoUrl: finalPhotoUrl || undefined,
        photoStoragePath: finalPhotoStoragePath || undefined,
        customProperties: {
          ...(productType === 'royalJelly' && {
            tenHdaPercent: tenHdaPercent.trim() || undefined,
            harvestIntervalHours: harvestIntervalHours ? parseInt(harvestIntervalHours, 10) : 72
          }),
          ...(productType === 'propolis' && {
            flavonoidContent: flavonoidContent.trim() || undefined,
            extractionMethod: extractionMethod.trim() || undefined
          })
        },
        isPublic: true,
        createdAt: existingProduct?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await onSave(productPayload);
      onClose();
    } catch (err: any) {
      console.error('Error saving BeekeeperProduct:', err);
      setErrorMsg(err?.message || '제품 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto"
    >
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-[#e5d9c3] overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 bg-gradient-to-r from-[#fefbf6] to-[#faf3e0] border-b border-[#ebdcc4]">
          <div className="flex items-center gap-2.5">
            <span className="text-[24px]" aria-hidden="true">
              {APIARY_PRODUCT_TYPE_ICONS[productType]}
            </span>
            <div>
              <h2 className="text-[17px] font-black text-[#2b1e00]">
                {isEdit ? '제품 정보 수정' : '새 양봉 제품 등록'}
              </h2>
              <p className="text-[11.5px] text-[#7e5700] font-semibold">
                대표 사진 및 규격 등록 후 여러 LOT 이력에 연결하여 사용합니다
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#685438] hover:bg-black/5 transition-colors cursor-pointer"
            aria-label="닫기"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-[13px] text-[#1f160a] max-h-[80vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-[12px] flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] shrink-0">error</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. 품목 선택 */}
          <div className="space-y-2">
            <label className="block text-[12px] font-extrabold text-[#554632]">
              1. 양봉산물 품목 선택 <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PRODUCT_TYPE_OPTIONS.map((opt) => {
                const isSelected = productType === opt.type;
                return (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => handleProductTypeChange(opt.type)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                      isSelected
                        ? 'border-[#7e5700] bg-[#faf3e0] shadow-xs ring-1 ring-[#7e5700]'
                        : 'border-[#e8dec8] bg-white hover:bg-[#fbf9f4]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-black text-[13px] text-[#2b1e00]">
                      <span>{opt.icon}</span>
                      <span>{opt.label}</span>
                    </div>
                    <span className="text-[11px] text-[#6e5d47] leading-tight line-clamp-1">
                      {opt.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. 제품 대표 사진 등록 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[12px] font-extrabold text-[#554632]">
                2. 제품 대표 사진 (소비자 공개용)
              </label>
              {photoPreview && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="text-[11px] text-red-600 hover:underline font-semibold cursor-pointer"
                >
                  사진 삭제
                </button>
              )}
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/jpeg,image/png,image/webp,image/jpg"
              className="hidden"
            />

            {photoPreview ? (
              <div className="relative rounded-2xl border border-[#ebdcc4] bg-[#fbf9f4] p-3 flex items-center gap-4">
                <div className="w-24 h-24 rounded-xl overflow-hidden bg-white border border-[#ebdcc4] shrink-0">
                  <img
                    src={photoPreview}
                    alt="제품 대표 사진 미리보기"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 space-y-1.5">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#e8f5e9] text-[#2e7d32] text-[10.5px] font-bold">
                    <span className="material-symbols-outlined text-[13px]">check_circle</span>
                    대표 사진 등록됨
                  </span>
                  <p className="text-[11px] text-[#6e5d47] leading-snug">
                    소비자가 QR을 스캔했을 때 이 제품 사진이 선명하게 노출됩니다.
                  </p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-[11.5px] font-bold text-[#7e5700] hover:underline cursor-pointer"
                  >
                    사진 변경하기
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#d8cca8] rounded-2xl p-5 text-center bg-[#fbf9f4] hover:bg-[#f6efe1] transition-colors cursor-pointer space-y-2"
              >
                <div className="w-10 h-10 mx-auto rounded-full bg-[#faf3e0] text-[#7e5700] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[22px]">add_a_photo</span>
                </div>
                <div>
                  <p className="font-extrabold text-[#2b1e00] text-[12.5px]">
                    실제 제품 사진 등록하기
                  </p>
                  <p className="text-[11px] text-[#6e5d47]">
                    JPG, PNG, WebP (최대 10MB) · 등록 시 꿀병 대체 사진 대신 이 사진이 표시됩니다.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 3. 제품명 */}
          <div className="space-y-1.5">
            <label className="block text-[12px] font-extrabold text-[#554632]">
              3. 제품명 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="예: 허니비테코 생로열제리 (국내산 100%)"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#d8cca8] bg-white focus:outline-hidden focus:border-[#7e5700] font-semibold text-[#1f160a]"
              required
            />
          </div>

          {/* 4. 포장 규격 및 보관 방법 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-[12px] font-extrabold text-[#554632]">
                4. 포장 규격
              </label>
              <input
                type="text"
                value={packageUnit}
                onChange={(e) => setPackageUnit(e.target.value)}
                placeholder="예: 50g 병, 2.4kg 유리병, 100ml"
                className="w-full px-3.5 py-2 rounded-xl border border-[#d8cca8] bg-white focus:outline-hidden focus:border-[#7e5700] text-[12.5px]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[12px] font-extrabold text-[#554632]">
                5. 보관 방법
              </label>
              <input
                type="text"
                value={storageMethod}
                onChange={(e) => setStorageMethod(e.target.value)}
                placeholder={productType === 'royalJelly' ? '냉동보관(-18℃ 이하)' : '실온보관(18~25℃)'}
                className="w-full px-3.5 py-2 rounded-xl border border-[#d8cca8] bg-white focus:outline-hidden focus:border-[#7e5700] text-[12.5px]"
              />
            </div>
          </div>

          {/* 5. 품목별 특화 품질 정보 (로열제리 / 프로폴리스) */}
          {productType === 'royalJelly' && (
            <div className="p-4 rounded-2xl bg-[#faf3e0]/80 border border-[#ebdcc4] space-y-3">
              <div className="flex items-center gap-1.5 text-[12px] font-extrabold text-[#7e5700]">
                <span>🥛</span>
                <span>생로열제리 특화 품질 지표</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-[#554632]">
                    10-HDA 검사치 (공인성적서 기재 시 입력)
                  </label>
                  <input
                    type="text"
                    value={tenHdaPercent}
                    onChange={(e) => setTenHdaPercent(e.target.value)}
                    placeholder="예: 1.6% (미입력 시 비표시)"
                    className="w-full px-3 py-1.5 rounded-lg border border-[#d8cca8] bg-white text-[12px]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-[#554632]">
                    채취 주기 (시간)
                  </label>
                  <input
                    type="number"
                    value={harvestIntervalHours}
                    onChange={(e) => setHarvestIntervalHours(e.target.value)}
                    placeholder="72"
                    className="w-full px-3 py-1.5 rounded-lg border border-[#d8cca8] bg-white text-[12px]"
                  />
                </div>
              </div>
            </div>
          )}

          {productType === 'propolis' && (
            <div className="p-4 rounded-2xl bg-[#f0fdf4] border border-[#bbf7d0] space-y-3">
              <div className="flex items-center gap-1.5 text-[12px] font-extrabold text-[#15803d]">
                <span>🌿</span>
                <span>프로폴리스 특화 품질 지표</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-[#166534]">
                    총 플라보노이드 함량 (공인성적서 기재 시 입력)
                  </label>
                  <input
                    type="text"
                    value={flavonoidContent}
                    onChange={(e) => setFlavonoidContent(e.target.value)}
                    placeholder="예: 1.8% (미입력 시 비표시)"
                    className="w-full px-3 py-1.5 rounded-lg border border-[#86efac] bg-white text-[12px]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-[#166534]">
                    추출 방식
                  </label>
                  <input
                    type="text"
                    value={extractionMethod}
                    onChange={(e) => setExtractionMethod(e.target.value)}
                    placeholder="예: 주정 추출, 수용성 추출"
                    className="w-full px-3 py-1.5 rounded-lg border border-[#86efac] bg-white text-[12px]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 6. 제품 상세 소개 */}
          <div className="space-y-1.5">
            <label className="block text-[12px] font-extrabold text-[#554632]">
              6. 제품 상세 소개 (소비자 페이지 노출)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="소비자에게 신뢰를 줄 수 있는 제품의 생산 특징, 숙성 방식, 채취 원칙을 적어주세요."
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#d8cca8] bg-white focus:outline-hidden focus:border-[#7e5700] text-[12.5px] leading-relaxed resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-[#eee4d4]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-[#d4e5ef] bg-white hover:bg-gray-50 font-bold text-[13px] text-[#554632] cursor-pointer"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-[#7e5700] hover:bg-[#684700] text-white font-black text-[13px] shadow-sm flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>저장 중...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[17px]">check</span>
                  <span>{isEdit ? '제품 정보 수정 완료' : '제품 등록 완료'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
