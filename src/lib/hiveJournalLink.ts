import { VoiceLogItem } from '../types';

/**
 * Parses a single hive number from a hiveRange string.
 *
 * Examples of valid single hive inputs:
 * - "32번 벌통" -> 32
 * - "32번" -> 32
 * - "#32" -> 32
 * - "벌통 32" -> 32
 * - "벌통32" -> 32
 * - "32호" -> 32
 * - "32" -> 32
 *
 * Range expressions MUST return null (NOT single hive numbers):
 * - "#1 ~ #50" -> null
 * - "1번부터 20번까지" -> null
 * - "1-20" -> null
 * - "전체" -> null
 */
export function parseHiveNumber(hiveRange?: string | null): number | null {
  if (!hiveRange || typeof hiveRange !== 'string') return null;
  const trimmed = hiveRange.trim();
  if (!trimmed) return null;

  // 1. Guard against range, multiple hives, or generic terms
  if (
    trimmed.includes('~') ||
    trimmed.includes('부터') ||
    trimmed.includes('까지') ||
    trimmed.includes('전체') ||
    trimmed.includes('모든') ||
    /#[0-9]+\s*[-~]\s*#[0-9]+/.test(trimmed) ||
    /[0-9]+\s*[-~]\s*[0-9]+/.test(trimmed) ||
    /[0-9]+\s*번?\s*,\s*[0-9]+/i.test(trimmed)
  ) {
    return null;
  }

  // 2. Exact match #NUMBER (e.g. "#32")
  const matchHash = trimmed.match(/^#\s*([0-9]+)$/);
  if (matchHash) {
    const num = parseInt(matchHash[1], 10);
    return isNaN(num) || num <= 0 ? null : num;
  }

  // 3. Korean formats: "32번 벌통", "32번", "32호", "벌통 32", "벌통32", "32번통"
  const matchKorean = trimmed.match(/(?:벌통\s*([0-9]+)|([0-9]+)\s*(?:번\s*벌통|번통|번|호))/);
  if (matchKorean) {
    const numStr = matchKorean[1] || matchKorean[2];
    const num = parseInt(numStr, 10);
    return isNaN(num) || num <= 0 ? null : num;
  }

  // 4. Exact integer string (e.g. "32")
  const matchExact = trimmed.match(/^([0-9]+)$/);
  if (matchExact) {
    const num = parseInt(matchExact[1], 10);
    return isNaN(num) || num <= 0 ? null : num;
  }

  return null;
}

/**
 * Checks whether a VoiceLogItem belongs to a specific target hive number.
 * 1. Checks log.hiveId (highest precedence for single-hive logs).
 * 2. Checks log.hiveIds array (for unified all-hives or multi-hive logs).
 * 3. Checks log.inspectionDetails.targetHive.
 * 4. Checks explicit range strings in log.hiveRange (e.g. "1~75번 벌통", "#1 ~ #75").
 * 5. Falls back safely to parseHiveNumber(log.hiveRange) for legacy single-hive records.
 */
export function isLogForHive(log: VoiceLogItem, targetHiveId: number): boolean {
  if (!log || typeof targetHiveId !== 'number' || targetHiveId <= 0) return false;

  // 1. Single-hive log: direct numeric hiveId
  if (typeof log.hiveId === 'number' && log.hiveId > 0) {
    return log.hiveId === targetHiveId;
  }

  // 2. Unified all-hives or multi-hive log: hiveIds array
  if (Array.isArray(log.hiveIds) && log.hiveIds.length > 0) {
    return log.hiveIds.some((id) => Number(id) === targetHiveId);
  }

  // 3. Inspection details targetHive
  if (typeof log.inspectionDetails?.targetHive === 'number' && log.inspectionDetails.targetHive > 0) {
    return log.inspectionDetails.targetHive === targetHiveId;
  }

  // 4. Range string fallback (e.g. "1~75번 벌통", "#1 ~ #75", "1번부터 75번까지", "전체 벌통")
  if (typeof log.hiveRange === 'string' && log.hiveRange.trim()) {
    const trimmedRange = log.hiveRange.trim();
    const rangeMatch = trimmedRange.match(
      /#?([0-9]{1,4})\s*번?\s*(?:벌통)?\s*(?:~|-|부터|에서)\s*#?([0-9]{1,4})/
    );
    if (rangeMatch) {
      const s = parseInt(rangeMatch[1], 10);
      const e = parseInt(rangeMatch[2], 10);
      if (!isNaN(s) && !isNaN(e) && s > 0 && e > 0) {
        const start = Math.min(s, e);
        const end = Math.max(s, e);
        return targetHiveId >= start && targetHiveId <= end;
      }
    }
    if (/^(?:전체\s*벌통|모든\s*벌통|전\s*벌통)$/.test(trimmedRange)) {
      return true;
    }
  }

  // 5. Legacy fallback via hiveRange string for single hive
  const parsed = parseHiveNumber(log.hiveRange);
  return parsed === targetHiveId;
}

export interface HiveInspectionSummary {
  lastCheckDate?: string;
  feedStatus?: '충분' | '적정' | '부족';
  queenSeen?: boolean;
  queenStatus?: string;
  diseaseStatus?: string;
  latestLog?: VoiceLogItem;
}

/**
 * Extracts latest inspection summary for a specific hive from the list of beekeeping journals.
 */
export function getLatestInspectionForHive(
  logs: VoiceLogItem[],
  hiveId: number
): HiveInspectionSummary | null {
  if (!Array.isArray(logs) || logs.length === 0) return null;

  // Filter and sort newest first
  const matched = logs
    .filter((l) => isLogForHive(l, hiveId))
    .sort((a, b) => (b.date + (b.timestamp || '')).localeCompare(a.date + (a.timestamp || '')));

  if (matched.length === 0) return null;

  const latestLog = matched[0];
  let feedStatus = latestLog.inspectionDetails?.feedStatus;
  let queenSeen = latestLog.inspectionDetails?.queenSeen;
  let queenStatus = latestLog.inspectionDetails?.queenStatus;
  let diseaseStatus = latestLog.inspectionDetails?.diseaseStatus;

  // If the newest log didn't mention feed or queen, check preceding logs for that hive
  if (!feedStatus) {
    const feedLog = matched.find((l) => l.inspectionDetails?.feedStatus);
    if (feedLog) feedStatus = feedLog.inspectionDetails?.feedStatus;
  }
  if (queenSeen === undefined && !queenStatus) {
    const queenLog = matched.find(
      (l) => l.inspectionDetails?.queenSeen !== undefined || l.inspectionDetails?.queenStatus
    );
    if (queenLog) {
      queenSeen = queenLog.inspectionDetails?.queenSeen;
      queenStatus = queenLog.inspectionDetails?.queenStatus;
    }
  }
  if (!diseaseStatus) {
    const diseaseLog = matched.find((l) => l.inspectionDetails?.diseaseStatus);
    if (diseaseLog) diseaseStatus = diseaseLog.inspectionDetails?.diseaseStatus;
  }

  return {
    lastCheckDate: latestLog.date,
    feedStatus,
    queenSeen,
    queenStatus,
    diseaseStatus,
    latestLog
  };
}
