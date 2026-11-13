import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { VoiceLogItem } from '../types';
import { UserProfile } from './userProfile';

export interface JournalFilterOptions {
  periodMode: 'all' | 'thisMonth' | 'custom';
  startDate?: string; // 'YYYY-MM-DD'
  endDate?: string;   // 'YYYY-MM-DD'
  selectedHive: 'all' | string;
  category: '전체' | '벌통 상태' | '채밀량' | '날씨' | '방제' | '급이/사양' | '여왕벌' | '기타';
}

export interface FormattedJournalRow {
  id: string;
  date: string;
  time: string;
  hiveDisplay: string;
  category: string;
  status: string;
  content: string; // aiSummary || text
  inspectionSummary?: string; // queen, feed, disease summary
  honeyYieldDisplay: string; // e.g. "15.5 kg" or "-"
  weatherDisplay: string; // e.g. "맑음 / 24°C" or "-"
}

export interface JournalExportData {
  farmerInfo: {
    farmName: string;
    representative: string;
    apiaryLocation: string;
    phone: string;
  };
  queryPeriodDisplay: string;
  stats: {
    totalCount: number;
    hiveCount: number;
    totalYieldKg: number;
  };
  rows: FormattedJournalRow[];
  filename: string;
}

/**
 * 1. Pure filtering function: Filters logs based on period, hive, and category
 */
export function filterJournalLogs(
  logs: VoiceLogItem[],
  options: JournalFilterOptions
): VoiceLogItem[] {
  if (!Array.isArray(logs) || logs.length === 0) return [];

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
  const thisMonthPrefix = `${currentYear}-${currentMonth}`;

  return logs.filter((log) => {
    if (!log || !log.date) return false;

    // 1. Period filter
    if (options.periodMode === 'thisMonth') {
      if (!log.date.startsWith(thisMonthPrefix)) return false;
    } else if (options.periodMode === 'custom') {
      if (options.startDate && log.date < options.startDate) return false;
      if (options.endDate && log.date > options.endDate) return false;
    }

    // 2. Hive filter
    if (options.selectedHive !== 'all') {
      const target = options.selectedHive.trim();
      const hiveRange = (log.hiveRange || '').trim();
      const hiveIdStr = log.hiveId !== undefined ? `${log.hiveId}번 벌통` : '';

      const match =
        hiveRange === target ||
        hiveIdStr === target ||
        hiveRange.includes(target) ||
        (target.replace(/[^0-9]/g, '') !== '' &&
          log.hiveId !== undefined &&
          String(log.hiveId) === target.replace(/[^0-9]/g, ''));

      if (!match) return false;
    }

    // 3. Category filter
    if (options.category !== '전체') {
      const cat = log.category || '벌통 상태';
      if (cat !== options.category) return false;
    }

    return true;
  });
}

/**
 * 2. Data preparation function: Formats filtered logs into structured report data
 */
export function prepareJournalExportData(
  filteredLogs: VoiceLogItem[],
  userProfile: UserProfile,
  options: JournalFilterOptions
): JournalExportData {
  // Sort oldest to newest for chronological export, or newest first
  // Standard journal exports are chronological by date & timestamp
  const sortedLogs = [...filteredLogs].sort((a, b) => {
    const timeA = (a.date || '') + ' ' + (a.timestamp || '00:00');
    const timeB = (b.date || '') + ' ' + (b.timestamp || '00:00');
    return timeA.localeCompare(timeB);
  });

  // Calculate unique hives and total yield
  const hiveSet = new Set<string>();
  let totalYield = 0;

  const rows: FormattedJournalRow[] = sortedLogs.map((log) => {
    const hiveLabel = log.hiveRange || (log.hiveId ? `${log.hiveId}번 벌통` : '벌통 미지정');
    hiveSet.add(hiveLabel);

    if (typeof log.honeyYieldKg === 'number' && !isNaN(log.honeyYieldKg) && log.honeyYieldKg > 0) {
      totalYield += log.honeyYieldKg;
    }

    // Priority for main journal content: aiSummary -> text (strictly preserves originalText without modification)
    let content = (log.aiSummary || log.text || '').trim();
    // Remove weather tag from content if it was already embedded
    content = content.replace(/\[[0-9]+(?:\.[0-9]+)?°C[^\]]+\]/g, '').trim();

    // Inspection details formatting (queen, feed, disease)
    const inspectionParts: string[] = [];
    if (log.inspectionDetails) {
      const d = log.inspectionDetails;
      if (d.queenSeen === true) {
        inspectionParts.push(d.queenStatus ? `여왕벌 확인(${d.queenStatus})` : '여왕벌 확인');
      } else if (d.queenSeen === false) {
        inspectionParts.push('무왕(여왕벌 미확인)');
      } else if (d.queenStatus) {
        inspectionParts.push(`여왕: ${d.queenStatus}`);
      }

      if (d.feedStatus) {
        inspectionParts.push(`먹이: ${d.feedStatus}`);
      }

      if (d.diseaseStatus) {
        inspectionParts.push(`방제/질병: ${d.diseaseStatus}`);
      }
    }

    const inspectionSummary = inspectionParts.length > 0 ? inspectionParts.join(' · ') : undefined;

    // Weather display
    let weatherDisplay = '-';
    if (log.weatherSnapshot) {
      const ws = log.weatherSnapshot;
      const parts = [];
      if (ws.condition) parts.push(ws.condition);
      if (typeof ws.temp === 'number') parts.push(`${ws.temp}°C`);
      if (typeof ws.windSpeed === 'number') parts.push(`풍속 ${ws.windSpeed}m/s`);
      weatherDisplay = parts.join(' / ') || '-';
    } else if (log.weatherTag) {
      weatherDisplay = log.weatherTag.replace(/[\[\]]/g, '').trim();
    }

    // Honey yield display
    const honeyYieldDisplay =
      typeof log.honeyYieldKg === 'number' && !isNaN(log.honeyYieldKg) && log.honeyYieldKg > 0
        ? `${log.honeyYieldKg} kg`
        : '-';

    return {
      id: log.id,
      date: log.date || '-',
      time: log.timestamp || '-',
      hiveDisplay: hiveLabel,
      category: log.category || '벌통 상태',
      status: log.status || '완료',
      content: content || '내용 없음',
      inspectionSummary,
      honeyYieldDisplay,
      weatherDisplay
    };
  });

  // Calculate query period display string and filename dates
  let startDateStr = '';
  let endDateStr = '';

  if (options.periodMode === 'custom' && options.startDate && options.endDate) {
    startDateStr = options.startDate;
    endDateStr = options.endDate;
  } else if (sortedLogs.length > 0) {
    startDateStr = sortedLogs[0].date;
    endDateStr = sortedLogs[sortedLogs.length - 1].date;
  } else {
    const today = new Date().toISOString().split('T')[0];
    startDateStr = today;
    endDateStr = today;
  }

  const queryPeriodDisplay = `${startDateStr.replace(/-/g, '.')} ~ ${endDateStr.replace(/-/g, '.')}`;
  const fileStart = startDateStr.replace(/-/g, '');
  const fileEnd = endDateStr.replace(/-/g, '');
  const filename = `허니비테코_양봉일지_${fileStart}_${fileEnd}.pdf`;

  return {
    farmerInfo: {
      farmName: userProfile.farmName || userProfile.companyName || '농업회사법인 허니비테코 주식회사',
      representative: userProfile.name || '-',
      apiaryLocation: userProfile.apiaryLocation || userProfile.applicantAddress || '-',
      phone: userProfile.phone || '-'
    },
    queryPeriodDisplay,
    stats: {
      totalCount: rows.length,
      hiveCount: hiveSet.size,
      totalYieldKg: Math.round(totalYield * 10) / 10
    },
    rows,
    filename
  };
}

/**
 * 3. PDF Generation: Captures each .pdf-page inside targetElement and writes to A4 jsPDF document
 */
export async function exportJournalToPdf(
  targetElement: HTMLElement | null,
  filename: string
): Promise<boolean> {
  if (!targetElement) {
    console.error('[PDF EXPORT] Target element is null');
    return false;
  }

  try {
    const pageElements = targetElement.querySelectorAll<HTMLElement>('.pdf-page');
    if (!pageElements || pageElements.length === 0) {
      console.warn('[PDF EXPORT] No .pdf-page elements found');
      return false;
    }

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = 210;
    const pdfHeight = 297;

    for (let i = 0; i < pageElements.length; i++) {
      const pageEl = pageElements[i];

      const canvas = await html2canvas(pageEl, {
        scale: 2, // 2x for sharp retina typography rendering
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);

      if (i > 0) {
        pdf.addPage('a4', 'p');
      }

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
    }

    pdf.save(filename);
    return true;
  } catch (err) {
    console.error('[PDF EXPORT] Failed to export PDF:', err);
    return false;
  }
}
