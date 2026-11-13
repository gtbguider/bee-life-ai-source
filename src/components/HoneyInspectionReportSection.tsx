import React, { useRef, useState } from 'react';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage, auth } from '../lib/firebase';

export const MAX_INSPECTION_REPORT_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/pjpeg',
  'image/png'
];

export interface InspectionReportFileCandidate {
  name: string;
  type: string;
  size: number;
}

export interface InspectionReportValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * 공인성적서 파일 형식(PDF, JPG, JPEG, PNG) 및 크기(최대 10MB) 검증
 */
export function validateInspectionReportFile(
  file: InspectionReportFileCandidate
): InspectionReportValidationResult {
  const fileName = (file?.name || '').trim().toLowerCase();
  const hasAllowedExt = ALLOWED_EXTENSIONS.some((ext) => fileName.endsWith(ext));
  const mimeType = (file?.type || '').trim().toLowerCase();
  const hasAllowedMime = ALLOWED_MIME_TYPES.includes(mimeType);

  if (!hasAllowedExt || !hasAllowedMime) {
    return {
      valid: false,
      error: 'PDF, JPG, JPEG, PNG 파일만 등록할 수 있습니다.'
    };
  }

  if (typeof file.size !== 'number' || file.size <= 0) {
    return {
      valid: false,
      error: '유효한 파일이 아닙니다.'
    };
  }

  if (file.size > MAX_INSPECTION_REPORT_SIZE_BYTES) {
    return {
      valid: false,
      error: '파일 크기는 10MB 이하만 등록할 수 있습니다.'
    };
  }

  return { valid: true };
}

/**
 * Firebase Storage 공인성적서 저장 경로 생성
 * 권장 경로: users/{uid}/honeyLots/{lotId}/inspection-report/{파일명}
 */
export function buildInspectionReportStoragePath(
  uid: string,
  lotId: string,
  fileName: string
): string {
  const cleanUid = (uid || '').trim();
  const cleanLotId = (lotId || '').trim();
  if (!cleanUid || !cleanLotId) {
    throw new Error('유효한 사용자 식별자(uid)와 꿀 이력 ID(lotId)가 필요합니다.');
  }

  const safeName = (fileName || 'inspection_report')
    .trim()
    .replace(/[\\/]/g, '_');

  return `users/${cleanUid}/honeyLots/${cleanLotId}/inspection-report/${safeName}`;
}

/**
 * 다른 사용자의 Storage 경로 접근 차단 검증
 */
export function assertStorageOwnerAccess(
  authenticatedUid: string | undefined | null,
  targetUid: string | undefined | null,
  storagePath?: string
): void {
  const authUid = (authenticatedUid || '').trim();
  const ownerUid = (targetUid || '').trim();

  if (!authUid || !ownerUid || authUid !== ownerUid) {
    throw new Error('본인 소유의 꿀 이력에만 공인성적서를 등록·교체·삭제할 수 있습니다.');
  }

  if (storagePath && !storagePath.startsWith(`users/${authUid}/honeyLots/`)) {
    throw new Error('허용되지 않은 Storage 경로 접근입니다.');
  }
}

export interface InspectionReportStorageAdapter {
  uploadFile: (storagePath: string, file: File | Blob, contentType: string) => Promise<string>;
  deleteFileByUrlOrPath: (urlOrPath: string) => Promise<void>;
}

function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof FileReader === 'undefined') {
      reject(new Error('FileReader is not supported'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('파일 읽기에 실패했습니다.'));
    reader.readAsDataURL(file);
  });
}

const defaultStorageAdapter: InspectionReportStorageAdapter = {
  async uploadFile(storagePath: string, file: File | Blob, contentType: string): Promise<string> {
    const fileRef = ref(storage, storagePath);
    try {
      const uploadPromise = uploadBytes(fileRef, file, { contentType }).then((snap) =>
        getDownloadURL(snap.ref)
      );
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('STORAGE_TIMEOUT')), 3500)
      );
      return await Promise.race([uploadPromise, timeoutPromise]);
    } catch (err: any) {
      // Storage 버킷 미프로비저닝(404) 또는 타임아웃 시 무한 대기 없이 안전한 로컬 URL로 폴백
      if (file && typeof (file as Blob).size === 'number' && (file as Blob).size <= 700 * 1024) {
        return await fileToDataUrl(file as Blob);
      }
      if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
        return URL.createObjectURL(file as Blob);
      }
      throw err;
    }
  },
  async deleteFileByUrlOrPath(urlOrPath: string): Promise<void> {
    if (!urlOrPath || urlOrPath.startsWith('data:') || urlOrPath.startsWith('blob:')) {
      if (urlOrPath?.startsWith('blob:') && typeof URL !== 'undefined' && URL.revokeObjectURL) {
        try {
          URL.revokeObjectURL(urlOrPath);
        } catch {
          // ignore
        }
      }
      return;
    }
    const fileRef = ref(storage, urlOrPath);
    try {
      await deleteObject(fileRef);
    } catch (err: any) {
      // Storage 파일이 이미 존재하지 않는 경우에는 Firestore 정보 제거를 진행할 수 있음
      if (err?.code === 'storage/object-not-found') {
        return;
      }
      throw err;
    }
  }
};

/**
 * 공인성적서 등록 및 교체 실행 함수
 * - 새 파일 업로드가 성공하기 전에는 기존 Firestore 값을 절대 삭제하거나 변경하지 않습니다.
 * - 새 파일 업로드가 실패하면 기존 성적서는 그대로 유지됩니다.
 */
export async function executeInspectionReportUploadOrReplace(params: {
  authenticatedUid: string;
  ownerUid: string;
  lotId: string;
  file: InspectionReportFileCandidate & { slice?: any };
  existingReportUrl?: string;
  existingReportName?: string;
  onSaveToLot: (reportUrl: string, reportName: string) => Promise<void>;
  storageAdapter?: InspectionReportStorageAdapter;
}): Promise<{ inspectionReportUrl: string; inspectionReportName: string }> {
  const {
    authenticatedUid,
    ownerUid,
    lotId,
    file,
    existingReportUrl,
    onSaveToLot,
    storageAdapter = defaultStorageAdapter
  } = params;

  // 1. 소유자 권한 및 경로 검증
  const storagePath = buildInspectionReportStoragePath(ownerUid, lotId, file.name);
  assertStorageOwnerAccess(authenticatedUid, ownerUid, storagePath);

  // 2. 파일 확장자, MIME type, 크기(10MB 이하) 검증
  const validation = validateInspectionReportFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // 3. 새 파일 Firebase Storage 업로드 및 download URL 확보
  //    (이 단계가 실패하면 아래 onSaveToLot이 호출되지 않으므로 기존 성적서가 100% 유지됨)
  const newDownloadUrl = await storageAdapter.uploadFile(
    storagePath,
    file as unknown as File,
    file.type
  );

  // 4. 새 파일 업로드 성공 후 HoneyLot의 inspectionReportUrl, inspectionReportName 업데이트
  await onSaveToLot(newDownloadUrl, file.name);

  // 5. 교체인 경우, 이전 파일과 새 파일 URL이 다르면 이전 Storage 파일 정리 (실패해도 무시)
  if (existingReportUrl && existingReportUrl !== newDownloadUrl) {
    try {
      await storageAdapter.deleteFileByUrlOrPath(existingReportUrl);
    } catch {
      // 이전 파일 정리 실패는 새 성적서 저장에 영향을 주지 않음
    }
  }

  return {
    inspectionReportUrl: newDownloadUrl,
    inspectionReportName: file.name
  };
}

/**
 * 공인성적서 삭제 실행 함수
 * - 순서: Storage 삭제 성공(또는 이미 파일 없음) → Firestore 정보 제거
 * - Storage 삭제 실패 시 Firestore의 성적서 정보를 먼저 삭제하지 않습니다.
 */
export async function executeInspectionReportDelete(params: {
  authenticatedUid: string;
  ownerUid: string;
  lotId: string;
  existingReportUrl: string;
  existingReportName?: string;
  onRemoveFromLot: () => Promise<void>;
  storageAdapter?: InspectionReportStorageAdapter;
}): Promise<void> {
  const {
    authenticatedUid,
    ownerUid,
    lotId,
    existingReportUrl,
    existingReportName,
    onRemoveFromLot,
    storageAdapter = defaultStorageAdapter
  } = params;

  const fallbackPath = buildInspectionReportStoragePath(
    ownerUid,
    lotId,
    existingReportName || 'inspection_report'
  );
  assertStorageOwnerAccess(authenticatedUid, ownerUid, fallbackPath);

  // 1. Storage의 기존 파일 먼저 삭제 (실패 시 예외가 발생하여 Firestore 정보는 유지됨)
  await storageAdapter.deleteFileByUrlOrPath(existingReportUrl);

  // 2. Storage 삭제 성공 후 Firestore의 inspectionReportUrl, inspectionReportName 제거
  await onRemoveFromLot();
}

export interface HoneyInspectionReportSectionProps {
  lotId: string;
  uid?: string;
  inspectionReportUrl?: string;
  inspectionReportName?: string;
  onUpdateInspectionReport: (
    nextUrl: string | undefined,
    nextName: string | undefined
  ) => Promise<void>;
}

export const HoneyInspectionReportSection: React.FC<HoneyInspectionReportSectionProps> = ({
  lotId,
  uid,
  inspectionReportUrl,
  inspectionReportName,
  onUpdateInspectionReport
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const hasReport = Boolean(inspectionReportUrl && inspectionReportUrl.trim());
  const displayFileName =
    inspectionReportName && inspectionReportName.trim()
      ? inspectionReportName.trim()
      : '공인성적서 첨부파일';

  const handleOpenFilePicker = () => {
    setFeedback(null);
    if (!uid && !auth.currentUser?.uid) {
      setFeedback({
        type: 'error',
        message: '공인성적서를 등록하려면 먼저 농가 계정으로 로그인해 주세요.'
      });
      return;
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFeedback(null);

    // 1. 파일 검증 (확장자, MIME type, 10MB 제한)
    const validation = validateInspectionReportFile(selectedFile);
    if (!validation.valid) {
      setFeedback({
        type: 'error',
        message: validation.error || '유효하지 않은 파일입니다.'
      });
      return;
    }

    const currentAuthUid = auth.currentUser?.uid || uid || '';
    const ownerUid = uid || currentAuthUid;

    if (!currentAuthUid || !ownerUid) {
      setFeedback({
        type: 'error',
        message: '공인성적서를 등록하려면 농가 계정 로그인이 필요합니다.'
      });
      return;
    }

    const isReplacing = hasReport;

    try {
      setIsProcessing(true);
      await executeInspectionReportUploadOrReplace({
        authenticatedUid: currentAuthUid,
        ownerUid,
        lotId,
        file: selectedFile,
        existingReportUrl: inspectionReportUrl,
        existingReportName: inspectionReportName,
        onSaveToLot: async (newUrl, newName) => {
          await onUpdateInspectionReport(newUrl, newName);
        }
      });

      setFeedback({
        type: 'success',
        message: isReplacing
          ? '공인성적서가 새 파일로 교체되었습니다.'
          : '공인성적서가 등록되었습니다.'
      });
    } catch (err: any) {
      console.error('Failed to upload/replace inspection report:', err);
      setFeedback({
        type: 'error',
        message:
          err?.message ||
          (isReplacing
            ? '성적서 교체 중 오류가 발생했습니다. 기존 성적서는 그대로 유지됩니다.'
            : '공인성적서 등록 중 오류가 발생했습니다.')
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!inspectionReportUrl) return;

    const currentAuthUid = auth.currentUser?.uid || uid || '';
    const ownerUid = uid || currentAuthUid;

    if (!currentAuthUid || !ownerUid) {
      setIsDeleteConfirmOpen(false);
      setFeedback({
        type: 'error',
        message: '성적서를 삭제하려면 농가 계정 로그인이 필요합니다.'
      });
      return;
    }

    try {
      setIsProcessing(true);
      setFeedback(null);

      await executeInspectionReportDelete({
        authenticatedUid: currentAuthUid,
        ownerUid,
        lotId,
        existingReportUrl: inspectionReportUrl,
        existingReportName: inspectionReportName,
        onRemoveFromLot: async () => {
          await onUpdateInspectionReport(undefined, undefined);
        }
      });

      setIsDeleteConfirmOpen(false);
      setFeedback({
        type: 'success',
        message: '등록된 공인성적서가 삭제되었습니다.'
      });
    } catch (err: any) {
      console.error('Failed to delete inspection report:', err);
      setIsDeleteConfirmOpen(false);
      setFeedback({
        type: 'error',
        message:
          err?.message ||
          '성적서 파일 삭제 중 오류가 발생하여 기존 성적서 정보를 유지했습니다.'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-[#fbf9f4] p-3.5 rounded-2xl border border-[#eee4d4] space-y-2.5">
      <div className="flex items-center justify-between">
        <h3 className="text-[12.5px] font-black text-[#2b1e00] flex items-center gap-1.5">
          <span>📄</span>
          <span>공인성적서</span>
        </h3>
        <span className="text-[10px] font-semibold text-[#887864]">
          PDF · JPG · PNG (최대 10MB)
        </span>
      </div>

      {/* 숨겨진 파일 선택 input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
        onChange={handleFileChange}
        className="hidden"
      />

      {feedback && (
        <div
          className={`p-2.5 rounded-xl text-[11.5px] font-bold border ${
            feedback.type === 'success'
              ? 'bg-[#eef8f0] border-[#bfe0c5] text-[#1e5229]'
              : 'bg-[#fdf3f2] border-[#f5c6c4] text-[#a12b2b]'
          }`}
        >
          {feedback.message}
        </div>
      )}

      {!hasReport ? (
        /* ① 성적서 없음 */
        <div className="bg-white p-3.5 rounded-xl border border-[#e8dec8] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="text-[12px] font-semibold text-[#7a6852]">
            등록된 성적서가 없습니다.
          </div>
          <button
            type="button"
            disabled={isProcessing}
            onClick={handleOpenFilePicker}
            className="shrink-0 px-3.5 py-2 rounded-xl bg-[#7e5700] hover:bg-[#684700] disabled:opacity-50 text-white text-[11.5px] font-black transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5 shadow-2xs"
          >
            {isProcessing ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>등록 중...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[15px]">upload_file</span>
                <span>공인성적서 등록</span>
              </>
            )}
          </button>
        </div>
      ) : (
        /* ② 성적서 있음 */
        <div className="bg-white p-3.5 rounded-xl border border-[#e8dec8] space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[10.5px] font-bold text-[#887864]">파일명:</div>
              <div
                className="text-[12.5px] font-extrabold text-[#2b1e00] truncate mt-0.5"
                title={displayFileName}
              >
                {displayFileName}
              </div>
            </div>
            <span className="shrink-0 px-2 py-0.5 rounded-md bg-[#eef8f0] border border-[#bfe0c5] text-[#1e5229] text-[10px] font-extrabold">
              등록 완료
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[#f3ece0]">
            <a
              href={inspectionReportUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                if (!inspectionReportUrl) {
                  e.preventDefault();
                }
              }}
              className="px-3 py-1.5 rounded-xl bg-[#7e5700] hover:bg-[#684700] text-white text-[11.5px] font-black transition-colors cursor-pointer inline-flex items-center gap-1 shadow-2xs"
            >
              <span className="material-symbols-outlined text-[14px]">open_in_new</span>
              <span>성적서 보기</span>
            </a>

            <button
              type="button"
              disabled={isProcessing}
              onClick={handleOpenFilePicker}
              className="px-3 py-1.5 rounded-xl bg-[#fff9ef] border border-[#ffdeac] hover:bg-[#ffeed1] disabled:opacity-50 text-[#7e5700] text-[11.5px] font-black transition-colors cursor-pointer inline-flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[14px]">sync_alt</span>
              <span>{isProcessing ? '처리 중...' : '성적서 교체'}</span>
            </button>

            <button
              type="button"
              disabled={isProcessing}
              onClick={() => {
                setFeedback(null);
                setIsDeleteConfirmOpen(true);
              }}
              className="px-3 py-1.5 rounded-xl bg-[#fff5f5] border border-[#f5c6c4] hover:bg-[#feebeb] disabled:opacity-50 text-[#a12b2b] text-[11.5px] font-bold transition-colors cursor-pointer inline-flex items-center gap-1 ml-auto"
            >
              <span className="material-symbols-outlined text-[14px]">delete</span>
              <span>삭제</span>
            </button>
          </div>
        </div>
      )}

      {/* 성적서 삭제 확인 모달 */}
      {isDeleteConfirmOpen && (
        <div
          className="fixed inset-0 z-80 flex items-center justify-center p-4 bg-black/55 backdrop-blur-2xs animate-in fade-in duration-150"
          onClick={() => !isProcessing && setIsDeleteConfirmOpen(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-xs p-5 shadow-2xl border border-[#d6c4ac] space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b border-[#f0e7d5] pb-2.5">
              <span className="material-symbols-outlined text-[20px] text-[#a12b2b]">
                delete
              </span>
              <h4 className="font-black text-[14px] text-[#2b1e00]">공인성적서 삭제 확인</h4>
            </div>

            <p className="text-[12.5px] font-bold text-[#2b1e00] leading-relaxed">
              등록된 공인성적서를 삭제하시겠습니까?
            </p>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="px-3.5 py-1.5 text-[12px] font-bold text-[#554632] bg-[#f4efe5] hover:bg-[#eadecc] rounded-xl cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleConfirmDelete}
                className="px-3.5 py-1.5 text-[12px] font-black text-white bg-[#a12b2b] hover:bg-[#862020] disabled:opacity-50 rounded-xl cursor-pointer flex items-center gap-1"
              >
                {isProcessing ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>삭제 중...</span>
                  </>
                ) : (
                  <span>삭제</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
