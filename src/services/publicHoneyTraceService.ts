import { HoneyLot, HoneyTracePublicData } from '../types';
import {
  buildPublishedHoneyTracePayload,
  sanitizePublicTraceData,
  PublishedHoneyTraceDocument,
  PublicTraceLookupResult
} from './honeyTracePublicService';
import { auth, firebaseConfig, databaseId } from '../lib/firebase';

export type { PublishedHoneyTraceDocument };
export { buildPublishedHoneyTracePayload, sanitizePublicTraceData };

export interface PublishHoneyTraceResponse {
  success: boolean;
  publicTraceId: string;
  publishedAt: string;
  updatedAt: string;
  isPublished: boolean;
  data: HoneyTracePublicData;
}

export interface UnpublishHoneyTraceResponse {
  success: boolean;
  publicTraceId: string;
  isPublished: boolean;
}

/**
 * 농가의 HoneyLot을 소비자 공개 영역(publicHoneyTraces/{publicTraceId})에 게시합니다.
 * - 현재 로그인한 농가의 Firebase ID Token을 Authorization 헤더로 전송
 * - 클라이언트는 lotId(필요 최소 식별자)만 전달하고, 서버가 Firestore 원본 HoneyLot을 검증 후 공개 데이터 생성
 */
export async function publishHoneyTrace(
  lotId: string,
  publicTraceId?: string
): Promise<PublishHoneyTraceResponse> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('소비자 공개 게시를 위해서는 농가 계정 로그인이 필요합니다.');
  }

  const idToken = await currentUser.getIdToken();
  const response = await fetch('/api/public-honey-traces/publish', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`
    },
    body: JSON.stringify({
      lotId,
      publicTraceId
    })
  });

  const json = await response.json();
  if (!response.ok || !json.success) {
    throw new Error(json.message || '소비자 공개 게시 중 오류가 발생했습니다.');
  }

  return {
    success: true,
    publicTraceId: json.publicTraceId,
    publishedAt: json.publishedAt,
    updatedAt: json.updatedAt,
    isPublished: Boolean(json.isPublished),
    data: sanitizePublicTraceData(json.data)
  };
}

/**
 * 게시된 소비자 공개 꿀 이력을 공개 해제합니다.
 * - 원본 HoneyLot은 삭제하거나 변경하지 않으며, publicHoneyTraces/{publicTraceId}만 비공개/삭제 처리합니다.
 */
export async function unpublishHoneyTrace(
  lotId: string,
  publicTraceId: string
): Promise<UnpublishHoneyTraceResponse> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('공개 해제를 위해서는 농가 계정 로그인이 필요합니다.');
  }

  const idToken = await currentUser.getIdToken();
  const response = await fetch('/api/public-honey-traces/unpublish', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`
    },
    body: JSON.stringify({
      lotId,
      publicTraceId
    })
  });

  const json = await response.json();
  if (!response.ok || !json.success) {
    throw new Error(json.message || '공개 해제 중 오류가 발생했습니다.');
  }

  return {
    success: true,
    publicTraceId: json.publicTraceId,
    isPublished: false
  };
}


/**
 * Converts Firestore REST value object into plain JS value
 */
function fromFirestoreValue(val: any): any {
  if (!val || typeof val !== 'object') return undefined;
  if ('stringValue' in val) return String(val.stringValue);
  if ('booleanValue' in val) return Boolean(val.booleanValue);
  if ('integerValue' in val) return Number(val.integerValue);
  if ('doubleValue' in val) return Number(val.doubleValue);
  if ('nullValue' in val) return null;
  if ('timestampValue' in val) return String(val.timestampValue);
  if ('arrayValue' in val) {
    const values = val.arrayValue?.values;
    return Array.isArray(values) ? values.map(fromFirestoreValue) : [];
  }
  if ('mapValue' in val) {
    const fields = val.mapValue?.fields;
    return fields ? fromFirestoreFields(fields) : {};
  }
  return undefined;
}

function fromFirestoreFields(fields: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  if (!fields || typeof fields !== 'object') return result;
  for (const [k, v] of Object.entries(fields)) {
    const parsed = fromFirestoreValue(v);
    if (parsed !== undefined) {
      result[k] = parsed;
    }
  }
  return result;
}

/**
 * AI Studio Cloud Run 프록시의 __cookie_check.html 리다이렉트나 서버 오류 발생 시,
 * 공개 읽기(allow read: if true;)가 보장된 Firestore REST 엔드포인트를 통해
 * 비로그인 소비자에게 정제된 공개 꿀 이력 데이터를 안정적으로 직접 조회합니다.
 */
async function fetchDirectFromFirestoreRest(
  cleanId: string
): Promise<
  PublicTraceLookupResult & {
    publishedAt?: string;
    updatedAt?: string;
    isPublished?: boolean;
  }
> {
  const projectId = firebaseConfig.projectId;
  const dbId = databaseId || '(default)';
  const apiKey = firebaseConfig.apiKey;

  if (!projectId || !apiKey) {
    return {
      status: 'error',
      errorType: 'server_error',
      errorMessage: '공개 데이터베이스 설정 정보를 확인할 수 없습니다.'
    };
  }

  const directUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
    projectId
  )}/databases/${encodeURIComponent(dbId)}/documents/publicHoneyTraces/${encodeURIComponent(
    cleanId
  )}?key=${encodeURIComponent(apiKey)}`;

  try {
    const restResp = await fetch(directUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      }
    });

    if (restResp.status === 404) {
      return { status: 'not_found', isPublished: false };
    }

    if (!restResp.ok) {
      return {
        status: 'error',
        errorType: 'server_error',
        errorMessage: `공개 서버 응답 오류가 발생했습니다. (HTTP ${restResp.status})`
      };
    }

    const docJson = await restResp.json();
    if (!docJson?.fields) {
      return { status: 'not_found', isPublished: false };
    }

    const parsedDoc = fromFirestoreFields(docJson.fields);
    if (parsedDoc.isPublished === false) {
      return { status: 'not_ready', isPublished: false };
    }

    const sanitizedData = sanitizePublicTraceData(parsedDoc);
    return {
      status: 'found',
      data: sanitizedData,
      publishedAt: typeof parsedDoc.publishedAt === 'string' ? parsedDoc.publishedAt : undefined,
      updatedAt: typeof parsedDoc.updatedAt === 'string' ? parsedDoc.updatedAt : undefined,
      isPublished: true
    };
  } catch (err: any) {
    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
    return {
      status: 'error',
      errorType: isOffline ? 'network_error' : 'server_error',
      errorMessage: isOffline
        ? '네트워크 연결이 오프라인 상태입니다.'
        : '공개 이력 조회 중 네트워크 연결 오류가 발생했습니다.'
    };
  }
}

/**
 * 비로그인 소비자가 다른 기기/브라우저에서 publicTraceId로 공개된 꿀 이력을 조회합니다.
 * - 1차: GET /api/public-honey-traces/:publicTraceId 호출
 * - 2차: 쿠키 확인 HTML 리다이렉트(__cookie_check.html), 5xx 서버 에러, 네트워크 에러 시 Firestore REST로 무중단 폴백
 * - HTML 응답이나 일시적 오류를 not_found로 오인하지 않고, 실제 문서 미존재(404) 시에만 not_found 반환
 */
export async function getPublicHoneyTraceById(
  publicTraceId: string
): Promise<
  PublicTraceLookupResult & {
    publishedAt?: string;
    updatedAt?: string;
    isPublished?: boolean;
  }
> {
  const cleanId = (publicTraceId || '').trim();
  if (!cleanId) {
    return { status: 'not_found' };
  }

  try {
    const response = await fetch(
      `/api/public-honey-traces/${encodeURIComponent(cleanId)}`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json'
        },
        credentials: 'same-origin'
      }
    );

    const contentType = response.headers.get('content-type') || '';
    const isHtmlResponse = contentType.includes('text/html');

    // 1) AI Studio 게이트웨이의 __cookie_check.html 리다이렉트 응답 감지
    if (isHtmlResponse) {
      console.warn(
        `[publicHoneyTraceService] API route returned HTML challenge instead of JSON for trace ${cleanId}. Falling back to Firestore REST.`
      );
      return await fetchDirectFromFirestoreRest(cleanId);
    }

    // 2) 404 응답인 경우 (JSON 응답 확인 후 반환, 또는 서버 오작동 대비 fallback 확인)
    if (response.status === 404) {
      try {
        const json = await response.json();
        if (json && json.status === 'not_found' && json.message) {
          return { status: 'not_found', isPublished: false };
        }
      } catch {
        return await fetchDirectFromFirestoreRest(cleanId);
      }
      return { status: 'not_found', isPublished: false };
    }

    // 3) 5xx 등의 서버 에러
    if (!response.ok) {
      console.warn(
        `[publicHoneyTraceService] API route error (HTTP ${response.status}). Falling back to Firestore REST.`
      );
      return await fetchDirectFromFirestoreRest(cleanId);
    }

    // 4) 정상 200 JSON 응답 처리
    try {
      const json = await response.json();

      if (json.status === 'not_ready') {
        return { status: 'not_ready', isPublished: false };
      }

      if (json.status === 'found' && json.isPublished && json.data) {
        return {
          status: 'found',
          data: sanitizePublicTraceData(json.data),
          publishedAt: json.publishedAt,
          updatedAt: json.updatedAt,
          isPublished: true
        };
      }

      if (json.status === 'not_found') {
        return { status: 'not_found', isPublished: false };
      }
    } catch (parseErr) {
      console.warn(
        `[publicHoneyTraceService] Failed to parse JSON response. Falling back to Firestore REST.`,
        parseErr
      );
      return await fetchDirectFromFirestoreRest(cleanId);
    }

    // 예기치 못한 상태 포맷일 때 fallback
    return await fetchDirectFromFirestoreRest(cleanId);
  } catch (err: any) {
    console.warn(
      `[publicHoneyTraceService] Network or fetch error in API route. Falling back to Firestore REST:`,
      err
    );
    return await fetchDirectFromFirestoreRest(cleanId);
  }
}

