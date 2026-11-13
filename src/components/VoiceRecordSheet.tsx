import React, { useState, useEffect, useRef, useCallback } from 'react';
import { VoiceLogItem, WeatherInfo } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { loadUserProfile } from '../services/userProfile';
import { normalizeBeekeepingText } from '../services/beekeepingNormalizer';

interface VoiceRecordSheetProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string; // 'YYYY-MM-DD'
  targetHives: string;
  weather: WeatherInfo;
  onSaveNewLog: (newLog: VoiceLogItem) => void;
  onOpenHiveSelect: () => void;
}

type VoiceState = 'idle' | 'standby' | 'recording' | 'processing' | 'saved';

// Audio feedback helper (Web Audio API)
function playTone(freq: number, duration: number) {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    // Ignore audio context errors in quiet environments
  }
}

/**
 * Intelligently merges previously recognized text with incoming recognized text.
 * Prevents duplicates caused by:
 * 1) Android STT cumulative results (where results[i] repeats results[i-1] prefix)
 * 2) Multi-session STT restarts (where new session echoes prior utterance)
 * 3) Partial word-level overlaps across recognition sessions
 * 4) Standard discrete segments
 */
export function smartMergeTranscripts(existing: string, incoming: string): string {
  const ex = (existing || '').trim();
  const inc = (incoming || '').trim();

  if (!ex) return inc;
  if (!inc) return ex;

  // Case 1: Identical or incoming is already fully contained in existing
  if (ex === inc || ex.endsWith(inc) || ex.includes(inc)) {
    return ex;
  }

  // Case 2: Incoming is an extension of existing (starts with existing)
  // e.g. ex = "3번 물통", inc = "3번 물통 산란 양호" -> "3번 물통 산란 양호"
  if (inc.startsWith(ex)) {
    return inc;
  }

  // Case 3: Existing is an extension of incoming (incoming is older snapshot)
  // e.g. ex = "3번 물통 산란 양호", inc = "3번 물통" -> "3번 물통 산란 양호"
  if (ex.startsWith(inc)) {
    return ex;
  }

  // Case 4: Word-level overlap (suffix of ex matches prefix of inc)
  // e.g. ex = "오늘 3번 물통", inc = "3번 물통 산란 양호" -> "오늘 3번 물통 산란 양호"
  const exWords = ex.split(/\s+/);
  const incWords = inc.split(/\s+/);
  const maxOverlap = Math.min(exWords.length, incWords.length);

  for (let len = maxOverlap; len > 0; len--) {
    const exTail = exWords.slice(exWords.length - len).join(' ');
    const incHead = incWords.slice(0, len).join(' ');
    if (exTail === incHead) {
      const remainingInc = incWords.slice(len).join(' ');
      return remainingInc ? `${ex} ${remainingInc}` : ex;
    }
  }

  // Case 5: Character-level overlap fallback (at least 3 characters)
  const maxCharOverlap = Math.min(ex.length, inc.length, 30);
  for (let len = maxCharOverlap; len >= 3; len--) {
    if (ex.endsWith(inc.slice(0, len))) {
      return ex + inc.slice(len);
    }
  }

  // Case 6: Distinct new phrase
  return `${ex} ${inc}`;
}

const MAX_JOURNAL_TEXT_LENGTH = 1000;

export const VoiceRecordSheet: React.FC<VoiceRecordSheetProps> = ({
  isOpen,
  onClose,
  selectedDate,
  targetHives,
  weather,
  onSaveNewLog,
  onOpenHiveSelect
}) => {
  const { user } = useAuth();
  const [voiceState, setVoiceState] = useState<VoiceState>('standby');
  const [transcript, setTranscript] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('벌통 상태');
  const [customHive, setCustomHive] = useState<string>(targetHives);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [micError, setMicError] = useState<{
    title: string;
    description: string;
    type: 'permission' | 'unsupported';
  } | null>(null);
  const [aiRequestError, setAiRequestError] = useState<{
    message: string;
    code?: string;
    allowRawSave: boolean;
  } | null>(null);
  const [aiPreviewData, setAiPreviewData] = useState<{
    sourceText: string;
    hiveRange?: string;
    hiveId?: number | null;
    hiveIds?: number[];
    inspectionDetails?: any;
    status?: '완료' | '주의' | '채밀' | '진행중' | '대기';
    category?: string;
    aiSummary?: string;
    honeyYieldKg?: number | null;
    tags?: string[];
  } | null>(null);
  const [isAnalyzingPreview, setIsAnalyzingPreview] = useState<boolean>(false);

  // Voice command draft backup & navigation confirmation states
  const [backupTranscript, setBackupTranscript] = useState<string>('');
  const [voiceCommandNotice, setVoiceCommandNotice] = useState<{
    type: 'cancel' | 'restored';
    message: string;
  } | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState<boolean>(false);

  // Keep references to avoid stale closures in recognition callbacks
  const recognitionRef = useRef<any>(null);
  const isRecognizingRef = useRef<boolean>(false);
  const isStartingRef = useRef<boolean>(false);
  const isExplicitStopRef = useRef<boolean>(false);
  const isProcessingRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(true);
  const restartTimerRef = useRef<any>(null);
  const consecutiveErrorsRef = useRef<number>(0);
  const consecutiveNoSpeechRef = useRef<number>(0);
  const consecutiveRestartsRef = useRef<number>(0);
  const lastRestartTimeRef = useRef<number>(0);
  const lastErrorRef = useRef<string | null>(null);

  const voiceStateRef = useRef<VoiceState>('standby');
  const transcriptRef = useRef<string>('');
  const persistedFinalTranscriptRef = useRef<string>('');
  const currentSessionFinalRef = useRef<string>('');
  const currentSessionInterimRef = useRef<string>('');
  const isOpenRef = useRef<boolean>(isOpen);
  const hasTriggeredSaveRef = useRef<boolean>(false);
  const executeSaveRef = useRef<(text: string, options?: { skipAi?: boolean }) => Promise<void>>(
    async () => {}
  );
  const backupTranscriptRef = useRef<string>('');
  const onCloseRef = useRef<() => void>(onClose);

  voiceStateRef.current = voiceState;
  transcriptRef.current = transcript;
  isOpenRef.current = isOpen;
  backupTranscriptRef.current = backupTranscript;
  onCloseRef.current = onClose;

  useEffect(() => {
    setCustomHive(targetHives);
  }, [targetHives]);

  // Safe stop helper (prevents duplicate stop/abort and cancels auto-restart)
  const safeStop = useCallback((forceAbort = false) => {
    console.log(forceAbort ? '[VOICE] abort requested' : '[VOICE] stop requested', {
      isRecognizing: isRecognizingRef.current,
      isStarting: isStartingRef.current,
      isExplicitStop: isExplicitStopRef.current
    });

    isExplicitStopRef.current = true;
    consecutiveRestartsRef.current = 0;

    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
      console.log('[VOICE] restart cancelled');
    }

    if (!recognitionRef.current) {
      isStartingRef.current = false;
      isRecognizingRef.current = false;
      return;
    }

    try {
      if (forceAbort) {
        recognitionRef.current.abort();
      } else {
        recognitionRef.current.stop();
      }
    } catch (e) {
      console.warn('[VOICE] safeStop error (handled):', e);
    }
  }, []);

  // Safe start helper (guards against calling start() when already started or closing)
  const safeStart = useCallback(() => {
    console.log('[VOICE] start requested', {
      isMounted: isMountedRef.current,
      isOpen: isOpenRef.current,
      isProcessing: isProcessingRef.current,
      isRecognizing: isRecognizingRef.current,
      isStarting: isStartingRef.current,
      hasRecognition: !!recognitionRef.current
    });

    if (!isMountedRef.current) return;
    if (!isOpenRef.current) return;
    if (isProcessingRef.current) return;
    if (isRecognizingRef.current || isStartingRef.current) {
      console.log('[VOICE] start ignored (already active or starting)');
      return;
    }
    if (!recognitionRef.current) return;

    isExplicitStopRef.current = false;
    isStartingRef.current = true;
    currentSessionFinalRef.current = '';
    currentSessionInterimRef.current = '';

    try {
      recognitionRef.current.start();
      console.log('[VOICE] start success');
    } catch (error: any) {
      isStartingRef.current = false;
      console.warn('[VOICE] safeStart failed:', error?.name || error);
      if (error?.name === 'InvalidStateError') {
        isRecognizingRef.current = true;
      }
    }
  }, []);

  // AI preview analysis function (with Firebase ID token auth, 1000-char limit, status/429 handling, and transcript preservation)
  const handleTriggerAnalysis = useCallback(
    async (textInput?: string) => {
      const rawInputText = (typeof textInput === 'string' ? textInput : transcriptRef.current).trim();
      if (!rawInputText || isAnalyzingPreview || isProcessingRef.current) return;

      const normalization = normalizeBeekeepingText(rawInputText);
      const cleanText = normalization.normalizedText || rawInputText;

      // Preserve normalized user input in state & ref
      persistedFinalTranscriptRef.current = cleanText;
      setTranscript(cleanText);
      setAiRequestError(null);

      if (cleanText.length > MAX_JOURNAL_TEXT_LENGTH) {
        safeStop(true);
        if (voiceStateRef.current === 'recording') {
          setVoiceState('idle');
        }
        setAiRequestError({
          code: 'TEXT_TOO_LONG',
          message: `입력 텍스트가 너무 깁니다. 최대 ${MAX_JOURNAL_TEXT_LENGTH.toLocaleString()}자 이하로 줄여주세요. (현재 ${cleanText.length.toLocaleString()}자)`,
          allowRawSave: false
        });
        return;
      }

      if (!user) {
        safeStop(true);
        if (voiceStateRef.current === 'recording') {
          setVoiceState('idle');
        }
        setAiRequestError({
          code: 'UNAUTHENTICATED',
          message:
            'AI 양봉일지 자동 분석은 로그인한 계정에서만 이용할 수 있습니다. 로그인 후 다시 시도하거나, 원문 그대로 저장할 수 있습니다.',
          allowRawSave: true
        });
        return;
      }

      safeStop(true);
      if (voiceStateRef.current === 'recording') {
        setVoiceState('idle');
      }
      setIsAnalyzingPreview(true);

      let idToken = '';
      try {
        idToken = await user.getIdToken();
      } catch (tokenErr) {
        console.warn('Failed to acquire Firebase ID token:', tokenErr);
        setIsAnalyzingPreview(false);
        setAiRequestError({
          code: '401',
          message:
            '로그인 인증 토큰을 가져오지 못했습니다. 다시 로그인하거나 잠시 후 재시도해주세요. (작성한 원문은 그대로 유지됩니다)',
          allowRawSave: true
        });
        return;
      }

      let userHiveCount = 75;
      try {
        const profile = loadUserProfile(user?.uid);
        if (profile?.hiveCount && profile.hiveCount > 0) {
          userHiveCount = profile.hiveCount;
        } else {
          const matchTargetMax = String(customHive || '').match(/~\s*#?([0-9]+)/);
          if (matchTargetMax) {
            const parsedMax = parseInt(matchTargetMax[1], 10);
            if (!isNaN(parsedMax) && parsedMax > 0) userHiveCount = parsedMax;
          }
        }
      } catch (e) {}

      try {
        const aiRes = await fetch('/api/ai/parse-journal', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`
          },
          body: JSON.stringify({
            text: cleanText,
            defaultHive: customHive,
            hiveCount: userHiveCount,
            weatherSnapshot: {
              temp: weather.temperature || weather.temp || 24,
              condition: weather.condition || '맑음'
            }
          })
        });

        let aiJson: any = null;
        try {
          aiJson = await aiRes.json();
        } catch {
          aiJson = null;
        }

        if (!aiRes.ok || !aiJson?.success) {
          const retryAfterHeader = aiRes.headers.get('Retry-After');
          const retryAfterSec =
            typeof aiJson?.retryAfterSeconds === 'number'
              ? aiJson.retryAfterSeconds
              : retryAfterHeader
              ? parseInt(retryAfterHeader, 10)
              : NaN;
          const retryNotice =
            !isNaN(retryAfterSec) && retryAfterSec > 0
              ? ` (약 ${
                  retryAfterSec >= 60
                    ? `${Math.ceil(retryAfterSec / 60)}분`
                    : `${retryAfterSec}초`
                } 후 다시 시도 가능)`
              : '';

          let errMsg = '';
          if (aiRes.status === 401) {
            errMsg =
              aiJson?.error ||
              '로그인 인증이 만료되었거나 유효하지 않습니다. 다시 로그인한 후 시도해주세요.';
          } else if (aiRes.status === 400) {
            errMsg =
              aiJson?.error ||
              `입력 형식이 올바르지 않거나 최대 길이(${MAX_JOURNAL_TEXT_LENGTH.toLocaleString()}자)를 초과했습니다.`;
          } else if (aiRes.status === 413) {
            errMsg =
              aiJson?.error ||
              '요청 데이터 크기가 너무 큽니다. 텍스트 길이를 줄여 다시 시도해주세요.';
          } else if (aiRes.status === 429) {
            const baseMsg =
              aiJson?.error || 'AI 분석 호출 횟수 제한에 도달했습니다. 잠시 후 다시 시도해주세요.';
            errMsg = baseMsg.includes('후 다시') ? baseMsg : `${baseMsg}${retryNotice}`;
          } else {
            errMsg =
              aiJson?.error ||
              'AI 분석 요청 처리 중 오류가 발생했습니다. 작성하신 원문은 유지되었으니 다시 시도해주세요.';
          }

          setIsAnalyzingPreview(false);
          setAiRequestError({
            code: aiJson?.code || String(aiRes.status),
            message: errMsg,
            allowRawSave:
              cleanText.length <= MAX_JOURNAL_TEXT_LENGTH &&
              aiRes.status !== 400 &&
              aiRes.status !== 413
          });
          return;
        }

        if (aiJson.data) {
          const d = aiJson.data;
          setAiPreviewData({
            sourceText: cleanText,
            hiveRange: d.hiveRange,
            hiveId: d.hiveId,
            hiveIds: d.hiveIds,
            inspectionDetails: d.inspectionDetails,
            status: d.status,
            category: d.category,
            aiSummary: d.aiSummary || cleanText,
            honeyYieldKg: d.honeyYieldKg,
            tags: d.tags
          });
          if (
            d.category &&
            ['벌통 상태', '채밀량', '방제', '급이/사양'].includes(d.category)
          ) {
            setSelectedCategory(d.category);
          }
        }
        setIsAnalyzingPreview(false);
      } catch (netErr) {
        console.warn('AI preview analysis network error:', netErr);
        setIsAnalyzingPreview(false);
        setAiRequestError({
          code: 'NETWORK_ERROR',
          message:
            '네트워크 오류로 AI 분석에 실패했습니다. 작성하신 원문은 그대로 유지되어 있으니 다시 시도하거나 원문 그대로 저장할 수 있습니다.',
          allowRawSave: true
        });
      }
    },
    [customHive, weather, user, isAnalyzingPreview, safeStop]
  );

  // Main save function
  const executeSave = useCallback(async (textToSave: string, options?: { skipAi?: boolean }) => {
    const rawInputText = textToSave.trim();
    if (!rawInputText || hasTriggeredSaveRef.current) return;

    const normalization = normalizeBeekeepingText(rawInputText);
    const cleanText = normalization.normalizedText || rawInputText;

    // Preserve normalized text in state & ref so user never loses their input
    persistedFinalTranscriptRef.current = cleanText;
    setTranscript(cleanText);
    setAiRequestError(null);

    if (cleanText.length > MAX_JOURNAL_TEXT_LENGTH) {
      safeStop(true);
      setVoiceState('idle');
      hasTriggeredSaveRef.current = false;
      isProcessingRef.current = false;
      setAiRequestError({
        code: 'TEXT_TOO_LONG',
        message: `입력 텍스트가 너무 깁니다. 최대 ${MAX_JOURNAL_TEXT_LENGTH.toLocaleString()}자 이하로 줄여주세요. (현재 ${cleanText.length.toLocaleString()}자)`,
        allowRawSave: false
      });
      return;
    }

    // Guest user attempting AI analysis: show login guidance while keeping original text and allowing local raw save
    if (!user && !options?.skipAi) {
      safeStop(true);
      setVoiceState('idle');
      hasTriggeredSaveRef.current = false;
      isProcessingRef.current = false;
      setAiRequestError({
        code: 'UNAUTHENTICATED',
        message:
          'AI 양봉일지 자동 분석은 로그인한 계정에서만 이용할 수 있습니다. 로그인 후 다시 시도하거나, 원문 그대로 로컬 일지에 저장할 수 있습니다.',
        allowRawSave: true
      });
      return;
    }

    hasTriggeredSaveRef.current = true;
    isProcessingRef.current = true;

    console.log('[JOURNAL DEBUG] user:', user ? (user.email || user.displayName || user.uid) : null);
    console.log('[JOURNAL DEBUG] uid:', user ? user.uid : null);

    setVoiceState('processing');

    // Stop and abort recognition immediately to free audio device during AI parsing & saving
    safeStop(true);

    let parsedHive = customHive || '#1 ~ #50';
    let parsedHiveId: number | undefined = undefined;
    let parsedHiveIds: number[] | undefined = undefined;
    let parsedInspectionDetails: any = undefined;
    let parsedStatus: '완료' | '주의' | '채밀' | '진행중' | '대기' = '완료';
    let parsedCategory = selectedCategory as any;
    let aiSummary = cleanText;
    let honeyYieldKg: number | undefined = undefined;
    let tags = ['음성내검'];

    // Get user's actual hive count (default 75 if not set, or parsed from customHive)
    let maxAllowedHive = 75;
    try {
      const profile = loadUserProfile(user?.uid);
      if (profile?.hiveCount && profile.hiveCount > 0) {
        maxAllowedHive = profile.hiveCount;
      } else {
        const matchTargetMax = String(customHive || '').match(/~\s*#?([0-9]+)/);
        if (matchTargetMax) {
          const parsedMax = parseInt(matchTargetMax[1], 10);
          if (!isNaN(parsedMax) && parsedMax > 0) maxAllowedHive = parsedMax;
        }
      }
    } catch (e) {}

    // If user already ran AI preview analysis on the exact current text and is not skipping AI, reuse it; otherwise call /api/ai/parse-journal
    if (user && !options?.skipAi) {
      if (aiPreviewData && aiPreviewData.sourceText === cleanText) {
        parsedHive = aiPreviewData.hiveRange || parsedHive;
        if (typeof aiPreviewData.hiveId === 'number' && aiPreviewData.hiveId > 0) {
          parsedHiveId = aiPreviewData.hiveId;
        }
        if (Array.isArray(aiPreviewData.hiveIds) && aiPreviewData.hiveIds.length > 0) {
          parsedHiveIds = aiPreviewData.hiveIds;
        }
        if (aiPreviewData.inspectionDetails && typeof aiPreviewData.inspectionDetails === 'object') {
          parsedInspectionDetails = aiPreviewData.inspectionDetails;
        }
        parsedStatus = aiPreviewData.status || parsedStatus;
        parsedCategory = (aiPreviewData.category as any) || parsedCategory;
        aiSummary = aiPreviewData.aiSummary || cleanText;
        if (typeof aiPreviewData.honeyYieldKg === 'number') {
          honeyYieldKg = aiPreviewData.honeyYieldKg;
        }
        if (Array.isArray(aiPreviewData.tags) && aiPreviewData.tags.length > 0) {
          tags = aiPreviewData.tags;
        }
      } else {
        let idToken = '';
        try {
          idToken = await user.getIdToken();
        } catch (tokenErr) {
          console.warn('Failed to acquire Firebase ID token during save:', tokenErr);
          hasTriggeredSaveRef.current = false;
          isProcessingRef.current = false;
          setVoiceState('idle');
          setAiRequestError({
            code: '401',
            message:
              '로그인 인증 토큰을 가져오지 못했습니다. 다시 시도하거나 원문 그대로 저장해주세요.',
            allowRawSave: true
          });
          return;
        }

        try {
          const aiRes = await fetch('/api/ai/parse-journal', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${idToken}`
            },
            body: JSON.stringify({
              text: cleanText,
              defaultHive: customHive,
              hiveCount: maxAllowedHive,
              weatherSnapshot: {
                temp: weather.temperature || weather.temp || 24,
                condition: weather.condition || '맑음'
              }
            })
          });

          let aiJson: any = null;
          try {
            aiJson = await aiRes.json();
          } catch {
            aiJson = null;
          }

          if (!aiRes.ok || !aiJson?.success) {
            const retryAfterHeader = aiRes.headers.get('Retry-After');
            const retryAfterSec =
              typeof aiJson?.retryAfterSeconds === 'number'
                ? aiJson.retryAfterSeconds
                : retryAfterHeader
                ? parseInt(retryAfterHeader, 10)
                : NaN;
            const retryNotice =
              !isNaN(retryAfterSec) && retryAfterSec > 0
                ? ` (약 ${
                    retryAfterSec >= 60
                      ? `${Math.ceil(retryAfterSec / 60)}분`
                      : `${retryAfterSec}초`
                  } 후 다시 시도 가능)`
                : '';

            let errMsg = '';
            if (aiRes.status === 401) {
              errMsg =
                aiJson?.error ||
                '로그인 인증이 만료되었거나 유효하지 않습니다. 다시 시도해주세요.';
            } else if (aiRes.status === 400) {
              errMsg =
                aiJson?.error ||
                `입력 형식이 올바르지 않거나 최대 길이(${MAX_JOURNAL_TEXT_LENGTH.toLocaleString()}자)를 초과했습니다.`;
            } else if (aiRes.status === 413) {
              errMsg =
                aiJson?.error ||
                '요청 데이터 크기가 너무 큽니다. 텍스트 길이를 줄여주세요.';
            } else if (aiRes.status === 429) {
              const baseMsg =
                aiJson?.error ||
                'AI 분석 호출 횟수 제한에 도달했습니다. 잠시 후 다시 시도해주세요.';
              errMsg = baseMsg.includes('후 다시') ? baseMsg : `${baseMsg}${retryNotice}`;
            } else {
              errMsg =
                aiJson?.error ||
                'AI 분석 요청 처리 중 오류가 발생했습니다. 원문은 유지되었으니 다시 시도해주세요.';
            }

            hasTriggeredSaveRef.current = false;
            isProcessingRef.current = false;
            setVoiceState('idle');
            setAiRequestError({
              code: aiJson?.code || String(aiRes.status),
              message: errMsg,
              allowRawSave:
                cleanText.length <= MAX_JOURNAL_TEXT_LENGTH &&
                aiRes.status !== 400 &&
                aiRes.status !== 413
            });
            return;
          }

          if (aiJson.data) {
            const d = aiJson.data;
            parsedHive = d.hiveRange || parsedHive;
            if (typeof d.hiveId === 'number' && d.hiveId > 0) {
              parsedHiveId = d.hiveId;
            }
            if (Array.isArray(d.hiveIds) && d.hiveIds.length > 0) {
              parsedHiveIds = d.hiveIds;
            }
            if (d.inspectionDetails && typeof d.inspectionDetails === 'object') {
              parsedInspectionDetails = d.inspectionDetails;
            }
            parsedStatus = d.status || parsedStatus;
            parsedCategory = d.category || parsedCategory;
            aiSummary = d.aiSummary || cleanText;
            honeyYieldKg = d.honeyYieldKg;
            if (Array.isArray(d.tags) && d.tags.length > 0) {
              tags = d.tags;
            }
          }
        } catch (aiErr) {
          console.warn('AI parsing request error:', aiErr);
          hasTriggeredSaveRef.current = false;
          isProcessingRef.current = false;
          setVoiceState('idle');
          setAiRequestError({
            code: 'NETWORK_ERROR',
            message:
              '네트워크 오류로 AI 분석에 실패했습니다. 작성하신 원문은 그대로 유지되어 있으니 다시 시도하거나 원문 그대로 저장할 수 있습니다.',
            allowRawSave: true
          });
          return;
        }
      }
    }

    const weatherTag = `[${weather.temp || weather.temperature}°C ${weather.condition} 풍속${weather.windSpeed || 1.8}m/s]`;
    const fullText = aiSummary.includes('°C') ? aiSummary : `${aiSummary} ${weatherTag}`;

    // Detect "전체 벌통" / "모든 벌통" / "전 벌통" expression (also supports skipAi/guest raw save)
    const isAllHivesSpeech =
      /(?:전체|모든)\s*(?:벌통|물통)|(?:^|[^가-힣0-9])전\s*(?:벌통|물통)/.test(cleanText) ||
      parsedHive === '전체 벌통' ||
      /^1\s*~\s*[0-9]+번\s*벌통$/.test(parsedHive);

    // If "전체 벌통" operation: save as a SINGLE unified journal entry with hiveRange "1~N번 벌통" and hiveIds: [1, ..., N]
    if (isAllHivesSpeech) {
      const allHiveIds =
        parsedHiveIds && parsedHiveIds.length > 1
          ? Array.from(new Set(parsedHiveIds.map(Number)))
              .filter((id) => !isNaN(id) && id >= 1 && id <= maxAllowedHive)
              .sort((a, b) => a - b)
          : Array.from({ length: maxAllowedHive }, (_, i) => i + 1);

      const startId = allHiveIds[0] || 1;
      const endId = allHiveIds[allHiveIds.length - 1] || maxAllowedHive;
      const allHivesRangeLabel = `${startId}~${endId}번 벌통`;

      const unifiedInspectionDetails = parsedInspectionDetails
        ? (() => {
            const copy = { ...parsedInspectionDetails };
            delete copy.targetHive;
            return Object.keys(copy).length > 0 ? copy : undefined;
          })()
        : undefined;

      const singleAllHivesLog: VoiceLogItem = {
        id: 'voice-' + Date.now(),
        hiveRange: allHivesRangeLabel,
        hiveIds: allHiveIds,
        ...(unifiedInspectionDetails ? { inspectionDetails: unifiedInspectionDetails } : {}),
        text: fullText,
        status: parsedStatus,
        timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
        date: selectedDate,
        category: parsedCategory,
        weatherTag,
        weatherSnapshot: {
          temp: weather.temperature || weather.temp || 24.2,
          condition: weather.condition || '맑음',
          icon: weather.icon || 'wb_sunny',
          windSpeed: weather.windSpeed || 1.8,
          humidity: weather.humidity || 54
        },
        tags,
        audioDuration: '0:21',
        ...(honeyYieldKg !== undefined && !isNaN(honeyYieldKg) ? { honeyYieldKg } : {}),
        originalText: cleanText,
        aiSummary
      };

      onSaveNewLog(singleAllHivesLog);
      setVoiceState('saved');

      setTimeout(() => {
        safeStop(true);
        hasTriggeredSaveRef.current = false;
        isProcessingRef.current = false;
        onClose();
      }, 1200);
      return;
    }

    // Individual / Explicit multi-hive speech (e.g., "1번, 3번, 5번 벌통"): create distinct log for each specified hive
    if (parsedHiveIds && parsedHiveIds.length > 0) {
      const uniqueHiveIds = Array.from(new Set(parsedHiveIds.map(Number)))
        .filter((id) => !isNaN(id) && id >= 1 && id <= maxAllowedHive)
        .sort((a, b) => a - b);

      if (uniqueHiveIds.length > 0) {
        const baseTime = Date.now();
        uniqueHiveIds.forEach((hId, index) => {
          const newLog: VoiceLogItem = {
            id: `voice-${baseTime}-${hId}`,
            hiveRange: `${hId}번 벌통`,
            hiveId: hId,
            ...(parsedInspectionDetails ? {
              inspectionDetails: {
                ...parsedInspectionDetails,
                targetHive: hId
              }
            } : {}),
            text: fullText,
            status: parsedStatus,
            timestamp: new Date(baseTime + index * 10).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
            date: selectedDate,
            category: parsedCategory,
            weatherTag,
            weatherSnapshot: {
              temp: weather.temperature || weather.temp || 24.2,
              condition: weather.condition || '맑음',
              icon: weather.icon || 'wb_sunny',
              windSpeed: weather.windSpeed || 1.8,
              humidity: weather.humidity || 54
            },
            tags,
            audioDuration: '0:21',
            ...(honeyYieldKg !== undefined && !isNaN(honeyYieldKg) ? { honeyYieldKg } : {}),
            originalText: cleanText,
            aiSummary
          };
          onSaveNewLog(newLog);
        });

        setVoiceState('saved');

        // Close after user sees success confirmation
        setTimeout(() => {
          safeStop(true);
          hasTriggeredSaveRef.current = false;
          isProcessingRef.current = false;
          onClose();
        }, 1200);
        return;
      }
    }

    // Single Hive / Non-range speech fallback
    const newLog: VoiceLogItem = {
      id: 'voice-' + Date.now(),
      hiveRange: parsedHive,
      ...(parsedHiveId !== undefined ? { hiveId: parsedHiveId } : {}),
      ...(parsedInspectionDetails ? { inspectionDetails: parsedInspectionDetails } : {}),
      text: fullText,
      status: parsedStatus,
      timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      date: selectedDate,
      category: parsedCategory,
      weatherTag,
      weatherSnapshot: {
        temp: weather.temperature || weather.temp || 24.2,
        condition: weather.condition || '맑음',
        icon: weather.icon || 'wb_sunny',
        windSpeed: weather.windSpeed || 1.8,
        humidity: weather.humidity || 54
      },
      tags,
      audioDuration: '0:21',
      ...(honeyYieldKg !== undefined && !isNaN(honeyYieldKg) ? { honeyYieldKg } : {}),
      originalText: cleanText,
      aiSummary
    };

    onSaveNewLog(newLog);
    setVoiceState('saved');

    // Close after user sees success confirmation
    setTimeout(() => {
      safeStop(true);
      hasTriggeredSaveRef.current = false;
      isProcessingRef.current = false;
      onClose();
    }, 1200);
  }, [customHive, selectedCategory, weather, selectedDate, onSaveNewLog, onClose, user, safeStop, aiPreviewData]);

  executeSaveRef.current = executeSave;

  // Handle "취소" command or button: stop recognition, do not save, preserve recognized text in backup for recovery
  const handleCancelRecording = useCallback(
    (preservedText?: string) => {
      safeStop(false);
      setVoiceState('idle');
      setShowExitConfirm(false);

      const candidate = (
        typeof preservedText === 'string' ? preservedText : transcriptRef.current
      ).trim();

      if (candidate && !candidate.includes('감지 중')) {
        setBackupTranscript(candidate);
        backupTranscriptRef.current = candidate;
      }

      persistedFinalTranscriptRef.current = '';
      currentSessionFinalRef.current = '';
      currentSessionInterimRef.current = '';
      setTranscript('');
      setAiPreviewData(null);
      setAiRequestError(null);
      setVoiceCommandNotice({
        type: 'cancel',
        message:
          candidate && !candidate.includes('감지 중')
            ? '음성 인식을 취소했습니다. 방금 인식된 원문은 임시 보관되어 복구할 수 있습니다.'
            : '음성 인식을 중단했습니다.'
      });
    },
    [safeStop]
  );

  // Restore backed-up transcript into the active input box
  const handleRestoreBackup = useCallback(() => {
    const backedUp = backupTranscriptRef.current.trim();
    if (!backedUp) return;

    const currentClean = transcriptRef.current.trim();
    const restoredText =
      currentClean && !currentClean.includes('감지 중') && currentClean !== backedUp
        ? `${backedUp} ${currentClean}`
        : backedUp;

    persistedFinalTranscriptRef.current = restoredText;
    currentSessionFinalRef.current = '';
    currentSessionInterimRef.current = '';
    setTranscript(restoredText);
    setBackupTranscript('');
    backupTranscriptRef.current = '';
    setShowExitConfirm(false);
    setVoiceCommandNotice({
      type: 'restored',
      message: '임시 보관된 원문을 입력창으로 복구했습니다.'
    });
  }, []);

  // Handle "이전 화면" / "뒤로 가기" command or close button with unsaved transcript check
  const handleRequestClose = useCallback(
    (cleanedCandidateText?: string) => {
      if (isProcessingRef.current || voiceStateRef.current === 'processing') return;

      const activeText = (
        typeof cleanedCandidateText === 'string' ? cleanedCandidateText : transcriptRef.current
      ).trim();
      const hasActiveUnsaved = Boolean(activeText && !activeText.includes('감지 중'));
      const hasBackupUnsaved = Boolean(backupTranscriptRef.current.trim());

      // Update active transcript if command suffix was stripped
      if (typeof cleanedCandidateText === 'string') {
        persistedFinalTranscriptRef.current = activeText;
        currentSessionFinalRef.current = '';
        currentSessionInterimRef.current = '';
        setTranscript(activeText);
      }

      if (hasActiveUnsaved || hasBackupUnsaved) {
        safeStop(false);
        if (voiceStateRef.current === 'recording') {
          setVoiceState('idle');
        }
        setShowExitConfirm(true);
        return;
      }

      safeStop(true);
      onCloseRef.current();
    },
    [safeStop]
  );

  const handleCancelRecordingRef = useRef(handleCancelRecording);
  const handleRequestCloseRef = useRef(handleRequestClose);
  handleCancelRecordingRef.current = handleCancelRecording;
  handleRequestCloseRef.current = handleRequestClose;

  // Reset all transient states for a fresh recording session
  const resetAll = useCallback(() => {
    setTranscript('');
    persistedFinalTranscriptRef.current = '';
    currentSessionFinalRef.current = '';
    currentSessionInterimRef.current = '';
    setVoiceState('standby');
    setAiRequestError(null);
    setAiPreviewData(null);
    setIsAnalyzingPreview(false);
    setBackupTranscript('');
    backupTranscriptRef.current = '';
    setVoiceCommandNotice(null);
    setShowExitConfirm(false);
    hasTriggeredSaveRef.current = false;
    isProcessingRef.current = false;
    isExplicitStopRef.current = false;
    consecutiveErrorsRef.current = 0;
    consecutiveNoSpeechRef.current = 0;
    consecutiveRestartsRef.current = 0;
    lastErrorRef.current = null;
    setIsSimulating(false);
  }, []);

  // Speech Recognition Initializer: Only created ONCE when component mounts
  useEffect(() => {
    isMountedRef.current = true;
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('SpeechRecognition API not available in this browser');
      setMicError({
        title: '이 브라우저에서는 음성 인식을 사용할 수 없습니다.',
        description: '직접 입력 기능을 이용해주세요.',
        type: 'unsupported'
      });
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'ko-KR';

    rec.onstart = () => {
      isRecognizingRef.current = true;
      isStartingRef.current = false;
      consecutiveErrorsRef.current = 0;
      lastErrorRef.current = null;
      currentSessionFinalRef.current = '';
      currentSessionInterimRef.current = '';
      setMicError(null);
      console.log('[VOICE] onstart');
    };

    rec.onresult = (event: any) => {
      // Reset silence counters upon receiving valid speech input
      consecutiveNoSpeechRef.current = 0;
      consecutiveRestartsRef.current = 0;

      let sessionFinal = '';
      let sessionInterim = '';

      for (let i = 0; i < event.results.length; ++i) {
        const result = event.results[i];
        const rawPiece = result[0]?.transcript?.trim() || '';
        if (!rawPiece) continue;
        const piece = normalizeBeekeepingText(rawPiece).normalizedText || rawPiece;

        if (result.isFinal) {
          sessionFinal = smartMergeTranscripts(sessionFinal, piece);
        } else {
          sessionInterim = smartMergeTranscripts(sessionInterim, piece);
        }
      }

      currentSessionFinalRef.current = sessionFinal;
      currentSessionInterimRef.current = sessionInterim;

      // Active full text = persisted from prior sessions + current session final + current session interim
      const sessionCombined = smartMergeTranscripts(sessionFinal, sessionInterim);
      const mergedRawText = smartMergeTranscripts(persistedFinalTranscriptRef.current, sessionCombined);
      const rawText = normalizeBeekeepingText(mergedRawText).normalizedText || mergedRawText;

      if (!rawText) return;
      console.log('[VOICE] onresult active:', {
        persisted: persistedFinalTranscriptRef.current,
        sessionFinal,
        sessionInterim,
        rawText
      });

      const currentState = voiceStateRef.current;

      // Ignore speech events during AI processing or post-save confirmation
      if (currentState === 'processing' || currentState === 'saved' || isProcessingRef.current) {
        return;
      }

      // Latest discrete utterance segment from the recognizer
      const lastResult = event.results[event.results.length - 1];
      const latestPiece = (lastResult?.[0]?.transcript || '').trim();
      const isLatestFinal = Boolean(lastResult?.isFinal);

      // Voice command patterns (anchored to utterance boundary to prevent mid-sentence false triggers)
      // - "이전 화면" / "뒤로 가기": distinct command or trailing command phrase
      // - "취소": strictly standalone utterance on final recognition (or explicit "기록 취소" / "입력 취소") so normal sentences like "방제 취소" are never misclassified
      const BACK_CMD_STANDALONE_REGEX = /^(?:이전\s*화면(?:으로)?|뒤로\s*가기|뒤로\s*가줘)[.!?]?\s*$/i;
      const BACK_CMD_TRAILING_REGEX = /(?:^|\s|,|\.)(?:이전\s*화면(?:으로)?|뒤로\s*가기|뒤로\s*가줘)[.!?]?\s*$/i;

      const CANCEL_STANDALONE_REGEX = /^(?:취소|기록\s*취소|입력\s*취소|녹음\s*취소)[.!?]?\s*$/i;
      const CANCEL_EXPLICIT_TRAILING_REGEX = /(?:^|\s|,|\.)(?:기록\s*취소|입력\s*취소|녹음\s*취소)[.!?]?\s*$/i;
      const CANCEL_SHORT_TAIL_REGEX = /(?:^|\s|,|\.)취소[.!?]?\s*$/i;

      // 0-A. Check for "이전 화면" / "뒤로 가기" command (supported in standby, idle, and recording)
      if (BACK_CMD_STANDALONE_REGEX.test(latestPiece) || (isLatestFinal && BACK_CMD_TRAILING_REGEX.test(rawText))) {
        playTone(440, 0.18);
        const cleanedText = rawText
          .replace(BACK_CMD_TRAILING_REGEX, '')
          .replace(/^\s*기록\s*시작[.!?,\s]*/i, '')
          .trim();
        handleRequestCloseRef.current(cleanedText);
        return;
      }

      // 0-B. Check for "취소" command (strictly guarded against mid-sentence false positives)
      const isStandaloneCancel = isLatestFinal && CANCEL_STANDALONE_REGEX.test(latestPiece);
      const isExplicitRecordingCancel = isLatestFinal && CANCEL_EXPLICIT_TRAILING_REGEX.test(rawText);

      if (isStandaloneCancel || isExplicitRecordingCancel) {
        playTone(392, 0.2);
        const cleanedText = rawText
          .replace(CANCEL_EXPLICIT_TRAILING_REGEX, '')
          .replace(CANCEL_SHORT_TAIL_REGEX, '')
          .replace(/^\s*기록\s*시작[.!?,\s]*/i, '')
          .trim();
        handleCancelRecordingRef.current(cleanedText);
        return;
      }

      // 1. Check for "기록 시작" start command
      const START_CMD_REGEX = /(?:^|\s)기록\s*시작(?:해줘|하자|해)?/i;
      if (currentState === 'standby' || currentState === 'idle') {
        if (START_CMD_REGEX.test(rawText)) {
          playTone(880, 0.2); // Start chime
          setVoiceState('recording');
          setVoiceCommandNotice(null);
          const remaining = rawText.replace(/.*?기록\s*시작[.!?,\s]*/i, '').trim();
          persistedFinalTranscriptRef.current = remaining;
          currentSessionFinalRef.current = '';
          currentSessionInterimRef.current = '';
          setTranscript(remaining);
          return;
        } else if (
          rawText.trim().length > 3 &&
          !CANCEL_SHORT_TAIL_REGEX.test(rawText.trim()) &&
          !BACK_CMD_TRAILING_REGEX.test(rawText.trim())
        ) {
          // If user started dictating inspection notes directly without the keyword
          setVoiceState('recording');
          setVoiceCommandNotice(null);
          persistedFinalTranscriptRef.current = rawText.trim();
          currentSessionFinalRef.current = '';
          currentSessionInterimRef.current = '';
          setTranscript(rawText.trim());
          return;
        }
      }

      // 2. In 'recording' state, check for "기록 저장" command
      if (currentState === 'recording') {
        // Prevent accidental triggers:
        // Strictly match "기록 저장" or "기록저장" at the end of speech or as a distinct command
        const SAVE_CMD_REGEX = /(?:^|\s|,|\.)기록\s*저장(?:해줘|하세요|해|요)?[.!?]?\s*$/i;

        if (SAVE_CMD_REGEX.test(rawText)) {
          // Detected clean save command!
          const cleanedText = rawText
            .replace(SAVE_CMD_REGEX, '')
            .replace(/^\s*기록\s*시작[.!?,\s]*/i, '')
            .trim();

          if (cleanedText.length > 0) {
            playTone(587, 0.15);
            setTimeout(() => playTone(880, 0.25), 150); // Two-tone chime
            persistedFinalTranscriptRef.current = cleanedText;
            currentSessionFinalRef.current = '';
            currentSessionInterimRef.current = '';
            setTranscript(cleanedText);
            executeSaveRef.current(cleanedText);
            return;
          }
        }

        // If not save command, keep updating current transcript
        const cleanedActiveText = rawText.replace(/^\s*기록\s*시작[.!?,\s]*/i, '').trim();
        setTranscript(cleanedActiveText);
      }
    };

    rec.onerror = (e: any) => {
      isStartingRef.current = false;
      lastErrorRef.current = e.error;
      console.warn('[VOICE] onerror:', e.error);

      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        isExplicitStopRef.current = true;
        isRecognizingRef.current = false;
        setMicError({
          title: '마이크 권한이 차단되었습니다.',
          description: '브라우저의 사이트 설정에서 마이크 권한을 허용한 후 다시 시도해주세요.',
          type: 'permission'
        });
        return;
      }

      if (e.error === 'aborted') {
        // Routine abort on stop/close, do not increment error count
        return;
      }

      if (e.error === 'no-speech') {
        // Track consecutive silence periods to avoid infinite restart chimes
        consecutiveNoSpeechRef.current += 1;
        return;
      }

      consecutiveErrorsRef.current += 1;

      if (e.error === 'audio-capture' || e.error === 'network') {
        if (consecutiveErrorsRef.current >= 3) {
          isExplicitStopRef.current = true;
          console.warn('[VOICE] Pausing restarts due to repeated audio/network errors');
        }
      }
    };

    rec.onend = () => {
      isRecognizingRef.current = false;
      isStartingRef.current = false;

      // Commit finalized text from the finished session into persisted storage
      if (currentSessionFinalRef.current) {
        const mergedFinal = smartMergeTranscripts(
          persistedFinalTranscriptRef.current,
          currentSessionFinalRef.current
        );
        persistedFinalTranscriptRef.current =
          normalizeBeekeepingText(mergedFinal).normalizedText || mergedFinal;
        currentSessionFinalRef.current = '';
        currentSessionInterimRef.current = '';
      }

      console.log('[VOICE] onend', {
        persisted: persistedFinalTranscriptRef.current,
        isExplicitStop: isExplicitStopRef.current,
        isProcessing: isProcessingRef.current,
        isOpen: isOpenRef.current,
        voiceState: voiceStateRef.current,
        consecutiveNoSpeech: consecutiveNoSpeechRef.current,
        lastError: lastErrorRef.current
      });

      // Strict restart conditions
      // In standby, stop auto-restarting after 2 silences so it doesn't chime forever
      // In recording, allow up to 3 silences
      const maxNoSpeech = voiceStateRef.current === 'standby' ? 2 : 3;

      const shouldRestart =
        isMountedRef.current &&
        isOpenRef.current &&
        !isExplicitStopRef.current &&
        !isProcessingRef.current &&
        !hasTriggeredSaveRef.current &&
        lastErrorRef.current !== 'aborted' &&
        consecutiveErrorsRef.current < 3 &&
        consecutiveNoSpeechRef.current < maxNoSpeech &&
        (voiceStateRef.current === 'standby' || voiceStateRef.current === 'recording');

      if (shouldRestart) {
        if (restartTimerRef.current) {
          clearTimeout(restartTimerRef.current);
        }

        // Apply a safe cooldown to prevent rapid restart loops and repeated OS chimes
        const now = Date.now();
        const timeSinceLastRestart = now - lastRestartTimeRef.current;
        const delay = timeSinceLastRestart < 1200 ? 900 : 600;

        console.log(`[VOICE] restart scheduled (${delay}ms delay)`);
        restartTimerRef.current = setTimeout(() => {
          restartTimerRef.current = null;
          if (
            isMountedRef.current &&
            isOpenRef.current &&
            !isExplicitStopRef.current &&
            !isProcessingRef.current &&
            !hasTriggeredSaveRef.current
          ) {
            lastRestartTimeRef.current = Date.now();
            consecutiveRestartsRef.current += 1;
            safeStart();
          }
        }, delay);
      }
    };

    recognitionRef.current = rec;

    return () => {
      isMountedRef.current = false;
      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current);
        restartTimerRef.current = null;
      }
      try {
        rec.onstart = null;
        rec.onresult = null;
        rec.onerror = null;
        rec.onend = null;
        rec.abort();
      } catch (e) {}
      recognitionRef.current = null;
    };
  }, [safeStart]);

  // Lifecycle when sheet opens/closes
  useEffect(() => {
    if (isOpen) {
      resetAll();

      const hasSpeechRec =
        typeof window !== 'undefined' &&
        !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
      if (hasSpeechRec) {
        setMicError(null);
      }

      // Start recognition safely
      safeStart();
    } else {
      setVoiceState('idle');
      setAiRequestError(null);
      setIsAnalyzingPreview(false);
      safeStop(true);
    }
  }, [isOpen, resetAll, safeStart, safeStop]);

  // Retry mic recognition after permission grant or error
  const handleRetryMic = useCallback(() => {
    isExplicitStopRef.current = false;
    consecutiveErrorsRef.current = 0;
    consecutiveNoSpeechRef.current = 0;
    consecutiveRestartsRef.current = 0;
    lastErrorRef.current = null;
    safeStart();
  }, [safeStart]);

  if (!isOpen) return null;

  // Manual fallback toggle for center mic button
  const handleToggleRecording = () => {
    if (voiceState === 'recording') {
      setVoiceState('idle');
      safeStop(false);
    } else {
      setVoiceState('recording');
      consecutiveNoSpeechRef.current = 0;
      consecutiveRestartsRef.current = 0;
      consecutiveErrorsRef.current = 0;
      isExplicitStopRef.current = false;
      playTone(880, 0.15);
      safeStart();
    }
  };

  // Manual fallback for bottom save button
  const handleManualSave = () => {
    if (!transcript.trim() || voiceState === 'processing' || voiceState === 'saved') return;
    executeSave(transcript);
  };

  // Smart quick chip tag click
  const handleQuickChip = (phrase: string) => {
    const nextText = transcript.trim()
      ? `${transcript} / ${phrase} 완료`
      : `${customHive} ${phrase} 완료`;
    persistedFinalTranscriptRef.current = nextText;
    currentSessionFinalRef.current = '';
    currentSessionInterimRef.current = '';
    setTranscript(nextText);
  };

  // Automated voice simulation for testing ("기록 시작" -> speech -> "기록 저장")
  const runVoiceSimulation = () => {
    if (isSimulating || voiceState === 'processing') return;
    setIsSimulating(true);
    setVoiceState('standby');
    persistedFinalTranscriptRef.current = '';
    currentSessionFinalRef.current = '';
    currentSessionInterimRef.current = '';
    setTranscript('"기록 시작" 음성 감지 중...');

    setTimeout(() => {
      // 1. Simulates saying "기록 시작"
      playTone(880, 0.2);
      setVoiceState('recording');
      setTranscript('');

      const fullPhrase = `${customHive} 신왕 산란권 안정적으로 확장 중, 왕대 없음 및 완숙 봉개율 85% 양호`;
      let i = 0;
      const interval = setInterval(() => {
        i += 3;
        if (i <= fullPhrase.length) {
          setTranscript(fullPhrase.slice(0, i));
        } else {
          clearInterval(interval);
          setTranscript(fullPhrase);
          persistedFinalTranscriptRef.current = fullPhrase;

          // 2. Simulates saying "기록 저장"
          setTimeout(() => {
            playTone(587, 0.15);
            setTimeout(() => playTone(880, 0.25), 150);
            setIsSimulating(false);
            executeSave(fullPhrase);
          }, 800);
        }
      }, 70);
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 border-2 border-[#7e5700] shadow-2xl animate-in slide-in-from-bottom duration-200 space-y-3.5">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-[#d4e5ef] pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#ffb300]/20 flex items-center justify-center text-[#7e5700]">
              <span className="material-symbols-outlined text-[20px]">mic</span>
            </div>
            <div>
              <h3 className="text-[17px] font-bold text-[#0d1e25]">
                현장 음성 양봉일지
              </h3>
              <span className="text-[11px] font-semibold text-[#7e5700]">
                기록 일자: {selectedDate}
              </span>
            </div>
          </div>

          <button
            onClick={() => handleRequestClose()}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#514532] hover:bg-[#d9ebf5] cursor-pointer"
            title="이전 화면으로 닫기"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Unsaved Transcript Warning & Exit Confirmation Banner */}
        {showExitConfirm && (
          <div className="bg-[#fff7ed] border-2 border-[#ea580c] rounded-2xl p-3.5 shadow-sm animate-in fade-in duration-200 space-y-2">
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined text-[#ea580c] text-[20px] shrink-0 mt-0.5">
                warning
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-extrabold text-[#9a3412]">
                  저장하지 않은 음성 기록 원문이 있습니다
                </div>
                <div className="text-[11.5px] text-[#7c2d12] mt-0.5 leading-snug">
                  지금 이전 화면으로 이동하면 작성 중인 원문이 저장되지 않습니다. 어떻게 하시겠습니까?
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  if (!transcript.trim() && backupTranscript.trim()) {
                    handleRestoreBackup();
                  } else {
                    setShowExitConfirm(false);
                  }
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#7e5700] hover:bg-[#604100] text-white rounded-lg text-[11.5px] font-bold cursor-pointer transition-all"
              >
                <span className="material-symbols-outlined text-[15px]">edit_note</span>
                <span>
                  {!transcript.trim() && backupTranscript.trim()
                    ? '임시 보관 원문 복구하기'
                    : '계속 작성하기'}
                </span>
              </button>

              {(transcript.trim() || backupTranscript.trim()) && (
                <button
                  type="button"
                  onClick={() => {
                    const textToSave = transcript.trim() || backupTranscript.trim();
                    setShowExitConfirm(false);
                    executeSave(textToSave);
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#1b6d24] hover:bg-[#14531b] text-white rounded-lg text-[11.5px] font-bold cursor-pointer transition-all"
                >
                  <span className="material-symbols-outlined text-[15px]">save</span>
                  <span>저장 후 닫기</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setShowExitConfirm(false);
                  safeStop(true);
                  onClose();
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-[#fee2e2] text-[#ba1a1a] border border-[#ba1a1a]/40 rounded-lg text-[11.5px] font-bold cursor-pointer transition-all"
              >
                <span className="material-symbols-outlined text-[15px]">arrow_back</span>
                <span>저장하지 않고 이전 화면</span>
              </button>
            </div>
          </div>
        )}

        {/* Microphone Permission / Browser Warning Banner */}
        {micError && (
          <div className="bg-[#fff7ed] border border-[#f97316] rounded-2xl p-3 shadow-xs animate-in fade-in duration-200">
            <div className="flex items-start gap-2.5">
              <span className="material-symbols-outlined text-[#ea580c] text-[20px] shrink-0 mt-0.5">
                {micError.type === 'permission' ? 'mic_off' : 'info'}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-bold text-[#9a3412] leading-snug">
                  {micError.title}
                </div>
                <div className="text-[11.5px] text-[#7c2d12] mt-0.5 leading-relaxed">
                  {micError.description}
                </div>
                <div className="text-[11px] text-[#9a3412]/80 mt-1 font-medium">
                  💡 직접 입력(키보드) 및 하단 스마트 태그를 이용해 정상적으로 기록 및 저장이 가능합니다.
                </div>

                {micError.type === 'permission' && (
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleRetryMic}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#ea580c] hover:bg-[#c2410c] active:scale-95 text-white rounded-lg text-[11.5px] font-bold shadow-xs transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[15px]">refresh</span>
                      <span>마이크 다시 시도</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Voice Status Banner */}
        <div
          className={`rounded-2xl p-3 border transition-all flex items-center justify-between ${
            voiceState === 'recording'
              ? 'bg-[#fff0f0] border-[#ba1a1a]/40 text-[#ba1a1a]'
              : voiceState === 'processing'
              ? 'bg-[#fff8e7] border-[#7e5700]/40 text-[#7e5700]'
              : voiceState === 'saved'
              ? 'bg-[#f0fff4] border-[#1b6d24]/40 text-[#1b6d24]'
              : 'bg-[#f4faff] border-[#d6c4ac] text-[#0d1e25]'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {voiceState === 'recording' ? (
              <span className="relative flex h-3.5 w-3.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ba1a1a] opacity-75" />
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-[#ba1a1a]" />
              </span>
            ) : voiceState === 'processing' ? (
              <span className="w-4 h-4 border-2 border-[#7e5700] border-t-transparent rounded-full animate-spin shrink-0" />
            ) : voiceState === 'saved' ? (
              <span className="material-symbols-outlined text-[20px] text-[#1b6d24] shrink-0">
                check_circle
              </span>
            ) : (
              <span className="material-symbols-outlined text-[20px] text-[#7e5700] animate-pulse shrink-0">
                mic
              </span>
            )}

            <div>
              <span className="text-[13px] font-extrabold block leading-tight">
                {voiceState === 'recording'
                  ? '🔴 녹음 중'
                  : voiceState === 'processing'
                  ? '기록을 정리하고 있습니다...'
                  : voiceState === 'saved'
                  ? '양봉일지에 저장했습니다.'
                  : '🎙️ 음성 명령 대기 중'}
              </span>
              <span className="text-[11px] opacity-80 block">
                {voiceState === 'recording'
                  ? '말씀을 계속하세요 (완료 시 "기록 저장")'
                  : voiceState === 'processing'
                  ? 'AI가 내검 일지를 분석하여 Firestore에 저장합니다'
                  : voiceState === 'saved'
                  ? '내검 데이터가 안전하게 저장되었습니다'
                  : '"기록 시작"이라고 말씀하시거나 마이크를 누르세요'}
              </span>
            </div>
          </div>

          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/80 border border-current/20 shrink-0">
            {voiceState === 'recording'
              ? '"기록 저장" 대기'
              : voiceState === 'processing'
              ? 'AI 처리'
              : voiceState === 'saved'
              ? '완료'
              : '"기록 시작" 대기'}
          </span>
        </div>

        {/* Target Hive & Weather Bar */}
        <div className="flex items-center justify-between bg-[#f4faff] border border-[#d6c4ac] rounded-xl px-3 py-2 text-[12px]">
          <div className="flex items-center gap-1.5 font-bold text-[#0d1e25]">
            <span className="material-symbols-outlined text-[#7e5700] text-[18px]">hive</span>
            <span>벌통: {customHive}</span>
            <button
              onClick={onOpenHiveSelect}
              className="text-[#7e5700] underline ml-1 hover:text-[#0d1e25] cursor-pointer"
            >
              변경
            </button>
          </div>

          <div className="flex items-center gap-1 font-bold text-[#514532]">
            <span
              className="material-symbols-outlined text-[#ff9800] text-[16px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {weather.icon || 'wb_sunny'}
            </span>
            <span>
              {weather.temperature}°C {weather.condition}
            </span>
          </div>
        </div>

        {/* Live Transcript Box */}
        <div className="bg-[#fffdf8] border-2 border-[#847560]/40 rounded-2xl p-3.5 min-h-[110px] flex flex-col justify-between shadow-inner">
          <div className="flex items-center justify-between text-[11px] font-bold text-[#514532] mb-1">
            <span className="flex items-center gap-1">
              <span
                className={`w-2 h-2 rounded-full ${
                  voiceState === 'recording'
                    ? 'bg-[#ba1a1a] animate-ping'
                    : 'bg-[#1b6d24]'
                }`}
              />
              <span>인식된 내검 내용</span>
            </span>
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-bold ${
                  transcript.trim().length > MAX_JOURNAL_TEXT_LENGTH
                    ? 'text-[#ba1a1a]'
                    : 'text-[#514532]/70'
                }`}
              >
                {transcript.trim().length.toLocaleString()} / {MAX_JOURNAL_TEXT_LENGTH.toLocaleString()}자
              </span>
              <button
                type="button"
                onClick={() => handleTriggerAnalysis(transcript)}
                disabled={
                  !transcript.trim() ||
                  transcript.includes('감지 중') ||
                  isAnalyzingPreview ||
                  voiceState === 'processing' ||
                  voiceState === 'saved'
                }
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#ffdeac]/70 hover:bg-[#ffdeac] disabled:opacity-50 text-[#7e5700] text-[10px] font-extrabold border border-[#7e5700]/30 transition-all cursor-pointer disabled:cursor-not-allowed"
              >
                {isAnalyzingPreview ? (
                  <>
                    <span className="w-2.5 h-2.5 border-2 border-[#7e5700] border-t-transparent rounded-full animate-spin" />
                    <span>분석 중...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[13px]">auto_awesome</span>
                    <span>{aiPreviewData ? 'AI 다시 분석' : 'AI 미리보기 분석'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <textarea
            value={transcript}
            onChange={(e) => {
              setTranscript(e.target.value);
              persistedFinalTranscriptRef.current = e.target.value;
              currentSessionFinalRef.current = '';
              currentSessionInterimRef.current = '';
              if (aiRequestError?.code === 'TEXT_TOO_LONG' && e.target.value.trim().length <= MAX_JOURNAL_TEXT_LENGTH) {
                setAiRequestError(null);
              }
            }}
            placeholder='벌통 앞에서 자유롭게 말씀하세요. (예: "오늘 75번 봉군 여왕 산란 양호, 꿀 3키로...")'
            rows={3}
            className="w-full bg-transparent text-[14.5px] font-semibold text-[#0d1e25] leading-relaxed resize-none focus:outline-none"
          />

          {voiceState === 'recording' && (
            <div className="text-[11px] text-[#7e5700] font-bold flex items-center justify-between gap-1 mt-1 flex-wrap">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px] animate-spin">graphic_eq</span>
                <span>말씀 후 "기록 저장" (또는 "취소" · "이전 화면")</span>
              </span>
            </div>
          )}

          {/* Voice Command Notice & Temporary Draft Recovery Bar */}
          {(voiceCommandNotice || backupTranscript.trim()) && (
            <div className="mt-2 pt-2 border-t border-[#d6c4ac]/70 flex items-center justify-between gap-2 flex-wrap">
              <div className="text-[11px] font-semibold text-[#514532] flex items-center gap-1 min-w-0 flex-1">
                <span className="material-symbols-outlined text-[14px] text-[#7e5700] shrink-0">
                  history
                </span>
                <span className="truncate">
                  {voiceCommandNotice?.message ||
                    `임시 보관된 원문: "${backupTranscript.slice(0, 32)}${
                      backupTranscript.length > 32 ? '...' : ''
                    }"`}
                </span>
              </div>

              {backupTranscript.trim() && (
                <button
                  type="button"
                  onClick={handleRestoreBackup}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#ffdeac] hover:bg-[#ffc978] text-[#281900] text-[11px] font-extrabold border border-[#7e5700]/40 shrink-0 cursor-pointer transition-all active:scale-95"
                >
                  <span className="material-symbols-outlined text-[14px]">undo</span>
                  <span>이전 원문 복구</span>
                </button>
              )}
            </div>
          )}

          {/* Touch Controls for Cancel / Previous Screen */}
          <div className="mt-2 pt-2 border-t border-[#d6c4ac]/50 flex items-center justify-between gap-1.5">
            <button
              type="button"
              onClick={() => handleCancelRecording()}
              disabled={
                (voiceState !== 'recording' && !transcript.trim()) ||
                voiceState === 'processing' ||
                voiceState === 'saved'
              }
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#fff0f0] hover:bg-[#ffe0e0] disabled:opacity-45 text-[#ba1a1a] border border-[#ba1a1a]/30 text-[11px] font-bold cursor-pointer transition-all active:scale-95"
              title='음성 명령: "취소"'
            >
              <span className="material-symbols-outlined text-[14px]">cancel</span>
              <span>취소</span>
            </button>

            <button
              type="button"
              onClick={() => handleRequestClose()}
              disabled={voiceState === 'processing'}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-[#f4faff] disabled:opacity-50 text-[#514532] border border-[#d6c4ac] text-[11px] font-bold cursor-pointer transition-all active:scale-95"
              title='음성 명령: "이전 화면" 또는 "뒤로 가기"'
            >
              <span className="material-symbols-outlined text-[14px]">arrow_back</span>
              <span>이전 화면</span>
            </button>
          </div>

          {aiPreviewData && (
            <div className="mt-2 pt-2 border-t border-[#d6c4ac]/60 text-[11.5px] text-[#0d1e25] space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-[#7e5700] flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                  <span>AI 분석 미리보기</span>
                </span>
                <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-[#ffdeac]/60 text-[#281900]">
                  {aiPreviewData.hiveRange || customHive} · {aiPreviewData.category || selectedCategory}
                </span>
              </div>
              <p className="text-[12px] font-semibold text-[#0d1e25] leading-snug">
                {aiPreviewData.aiSummary}
              </p>
            </div>
          )}
        </div>

        {/* AI Request Error & Recovery Banner */}
        {aiRequestError && (
          <div className="bg-[#fff7ed] border border-[#f97316] rounded-2xl p-3 shadow-xs animate-in fade-in duration-200">
            <div className="flex items-start gap-2.5">
              <span className="material-symbols-outlined text-[#ea580c] text-[20px] shrink-0 mt-0.5">
                warning
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[12.5px] font-bold text-[#9a3412] leading-snug">
                  {aiRequestError.message}
                </div>
                <div className="text-[11px] text-[#7c2d12] mt-0.5">
                  작성하신 내검 원문은 삭제되지 않고 위 입력창에 그대로 보존되어 있습니다.
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleTriggerAnalysis(transcript)}
                    disabled={
                      !transcript.trim() ||
                      isAnalyzingPreview ||
                      voiceState === 'processing' ||
                      voiceState === 'saved'
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#7e5700] hover:bg-[#604100] disabled:opacity-50 active:scale-95 text-white rounded-lg text-[11.5px] font-bold shadow-xs transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[15px]">refresh</span>
                    <span>AI 분석 다시 시도</span>
                  </button>

                  {aiRequestError.allowRawSave && (
                    <button
                      type="button"
                      onClick={() => executeSave(transcript, { skipAi: true })}
                      disabled={
                        !transcript.trim() ||
                        voiceState === 'processing' ||
                        voiceState === 'saved'
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#ffdeac]/50 disabled:opacity-50 active:scale-95 text-[#0d1e25] border border-[#7e5700] rounded-lg text-[11.5px] font-bold shadow-xs transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[15px]">save</span>
                      <span>원문 그대로 저장</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Input Chips & Voice Simulator Button */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#514532]">
              스마트 태그 & 음성 테스트:
            </span>
            <button
              onClick={runVoiceSimulation}
              disabled={isSimulating || voiceState === 'processing'}
              className="text-[10px] font-extrabold text-[#7e5700] bg-[#ffdeac]/60 hover:bg-[#ffdeac] border border-[#ffdeac] px-2 py-0.5 rounded-full active:scale-95 transition-all cursor-pointer flex items-center gap-1"
            >
              <span>🎙️</span>
              <span>음성 자동 시뮬레이션 테스트</span>
            </button>
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {['내검 완료', '화분떡 공급', '자극 사양', '응애 방제', '신왕 산란 확인', '완숙꿀 채밀'].map(
              (chip) => (
                <button
                  key={chip}
                  onClick={() => handleQuickChip(chip)}
                  className="whitespace-nowrap px-2.5 py-1 bg-[#f4faff] hover:bg-[#ffdeac] border border-[#d6c4ac] rounded-lg text-[11px] font-bold text-[#0d1e25] transition-all active:scale-95 cursor-pointer"
                >
                  + {chip}
                </button>
              )
            )}
          </div>
        </div>

        {/* Category Selector */}
        <div className="flex items-center justify-center gap-1.5">
          {['벌통 상태', '채밀량', '방제', '급이/사양'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-[#ffdeac] text-[#281900] border-[#7e5700]'
                  : 'bg-white text-[#514532] border-[#d6c4ac]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Big Center Microphone Button (Manual fallback) */}
        <div className="flex flex-col items-center justify-center pt-1">
          <div className="relative flex items-center justify-center">
            {voiceState === 'recording' && (
              <>
                <div className="absolute w-[86px] h-[86px] rounded-full bg-[#ba1a1a]/30 animate-ping pointer-events-none" />
                <div className="absolute w-[110px] h-[110px] rounded-full bg-[#ffb300]/20 animate-pulse pointer-events-none" />
              </>
            )}

            <button
              onClick={handleToggleRecording}
              className={`w-[68px] h-[68px] rounded-full text-white flex items-center justify-center relative z-10 transition-all cursor-pointer ${
                voiceState === 'recording'
                  ? 'bg-[#ba1a1a] shadow-[0_0_20px_rgba(186,26,26,0.6)] scale-105'
                  : 'bg-[#7e5700] hover:bg-[#604100] shadow-[3px_3px_0_0_#847560] active:translate-y-[2px]'
              }`}
              aria-label={voiceState === 'recording' ? '녹음 일시정지' : '녹음 수동 시작'}
            >
              <span
                className="material-symbols-outlined text-[30px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {voiceState === 'recording' ? 'stop' : 'mic'}
              </span>
            </button>
          </div>
          <span className="text-[11px] text-[#514532] mt-1.5 font-medium">
            {voiceState === 'recording'
              ? '🔴 녹음 중 (말로 "기록 저장" 또는 버튼 클릭)'
              : '마이크를 누르거나 "기록 시작"이라고 말씀하세요'}
          </span>
        </div>

        {/* Save Button (Manual fallback) */}
        <button
          onClick={handleManualSave}
          disabled={
            !transcript.trim() ||
            transcript.includes('감지 중') ||
            voiceState === 'processing' ||
            voiceState === 'saved'
          }
          className={`w-full py-3 rounded-xl font-bold text-[14px] flex items-center justify-center gap-2 transition-all ${
            transcript.trim() &&
            !transcript.includes('감지 중') &&
            voiceState !== 'processing' &&
            voiceState !== 'saved'
              ? 'bg-[#7e5700] hover:bg-[#604100] text-white shadow-md active:scale-98 cursor-pointer'
              : voiceState === 'processing'
              ? 'bg-[#ffdeac] text-[#7e5700] cursor-wait'
              : voiceState === 'saved'
              ? 'bg-[#c8e6c9] text-[#1b6d24]'
              : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
          }`}
        >
          {voiceState === 'processing' ? (
            <>
              <span className="w-4 h-4 border-2 border-[#7e5700] border-t-transparent rounded-full animate-spin" />
              <span>✨ 기록을 정리하고 있습니다...</span>
            </>
          ) : voiceState === 'saved' ? (
            <>
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              <span>양봉일지에 저장했습니다.</span>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[18px]">save</span>
              <span>양봉일지에 저장 ({user ? 'Firestore 연동' : '로컬 모드'})</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
