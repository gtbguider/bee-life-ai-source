import {
  BeekeepingSalesRecord,
  BeekeepingExpenseRecord,
  BeekeepingLedgerSummary,
  BeekeepingProductType,
  BeekeepingExpenseCategory
} from '../types';
import {
  INITIAL_SALES_RECORDS,
  INITIAL_EXPENSE_RECORDS
} from '../data/beekeepingLedgerData';
import {
  fetchSalesFromFirestore,
  saveSaleToFirestore,
  deleteSaleFromFirestore,
  fetchExpensesFromFirestore,
  saveExpenseToFirestore,
  deleteExpenseFromFirestore
} from './firestoreService';

const SALES_STORAGE_KEY = 'honeybee_teco_sales_records_v1';
const EXPENSES_STORAGE_KEY = 'honeybee_teco_expense_records_v1';

function getSalesStorageKey(uid?: string): string {
  return uid ? `${SALES_STORAGE_KEY}_${uid}` : SALES_STORAGE_KEY;
}

function getExpensesStorageKey(uid?: string): string {
  return uid ? `${EXPENSES_STORAGE_KEY}_${uid}` : EXPENSES_STORAGE_KEY;
}

export function loadSalesRecords(uid?: string): BeekeepingSalesRecord[] {
  try {
    const raw = localStorage.getItem(getSalesStorageKey(uid));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to load sales records from localStorage:', e);
  }
  return uid ? [] : [...INITIAL_SALES_RECORDS];
}

export function saveSalesRecords(records: BeekeepingSalesRecord[], uid?: string): void {
  try {
    localStorage.setItem(getSalesStorageKey(uid), JSON.stringify(records));
  } catch (e) {
    console.warn('Failed to save sales records to localStorage:', e);
  }
}

export async function loadSalesRecordsWithFirestore(uid?: string): Promise<BeekeepingSalesRecord[]> {
  if (uid) {
    try {
      const cloudSales = await fetchSalesFromFirestore(uid);
      const list = cloudSales ?? [];
      saveSalesRecords(list, uid);
      return list;
    } catch (e) {
      console.warn('Firestore sales load error, using UID-scoped local fallback:', e);
      return loadSalesRecords(uid);
    }
  }
  return loadSalesRecords();
}

export async function saveSaleRecordWithFirestore(record: BeekeepingSalesRecord, uid?: string): Promise<void> {
  const current = loadSalesRecords(uid);
  const index = current.findIndex(s => s.id === record.id);
  let updated: BeekeepingSalesRecord[];
  if (index >= 0) {
    updated = [...current];
    updated[index] = record;
  } else {
    updated = [record, ...current];
  }
  saveSalesRecords(updated, uid);

  if (uid) {
    try {
      await saveSaleToFirestore(uid, record);
    } catch (e) {
      console.warn('Firestore sale save notice:', e);
    }
  }
}

export async function deleteSaleRecordWithFirestore(id: string, uid?: string): Promise<BeekeepingSalesRecord[]> {
  const current = loadSalesRecords(uid);
  const updated = current.filter(s => s.id !== id);
  saveSalesRecords(updated, uid);

  if (uid) {
    try {
      await deleteSaleFromFirestore(uid, id);
    } catch (e) {
      console.warn('Firestore sale delete notice:', e);
    }
  }
  return updated;
}

export function loadExpenseRecords(uid?: string): BeekeepingExpenseRecord[] {
  try {
    const raw = localStorage.getItem(getExpensesStorageKey(uid));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to load expense records from localStorage:', e);
  }
  return uid ? [] : [...INITIAL_EXPENSE_RECORDS];
}

export function saveExpenseRecords(records: BeekeepingExpenseRecord[], uid?: string): void {
  try {
    localStorage.setItem(getExpensesStorageKey(uid), JSON.stringify(records));
  } catch (e) {
    console.warn('Failed to save expense records to localStorage:', e);
  }
}

export async function loadExpenseRecordsWithFirestore(uid?: string): Promise<BeekeepingExpenseRecord[]> {
  if (uid) {
    try {
      const cloudExpenses = await fetchExpensesFromFirestore(uid);
      const list = cloudExpenses ?? [];
      saveExpenseRecords(list, uid);
      return list;
    } catch (e) {
      console.warn('Firestore expense load error, using UID-scoped local fallback:', e);
      return loadExpenseRecords(uid);
    }
  }
  return loadExpenseRecords();
}

export async function saveExpenseRecordWithFirestore(record: BeekeepingExpenseRecord, uid?: string): Promise<void> {
  const current = loadExpenseRecords(uid);
  const index = current.findIndex(e => e.id === record.id);
  let updated: BeekeepingExpenseRecord[];
  if (index >= 0) {
    updated = [...current];
    updated[index] = record;
  } else {
    updated = [record, ...current];
  }
  saveExpenseRecords(updated, uid);

  if (uid) {
    try {
      await saveExpenseToFirestore(uid, record);
    } catch (e) {
      console.warn('Firestore expense save notice:', e);
    }
  }
}

export async function deleteExpenseRecordWithFirestore(id: string, uid?: string): Promise<BeekeepingExpenseRecord[]> {
  const current = loadExpenseRecords(uid);
  const updated = current.filter(e => e.id !== id);
  saveExpenseRecords(updated, uid);

  if (uid) {
    try {
      await deleteExpenseFromFirestore(uid, id);
    } catch (e) {
      console.warn('Firestore expense delete notice:', e);
    }
  }
  return updated;
}


export function calculateLedgerSummary(
  sales: BeekeepingSalesRecord[],
  expenses: BeekeepingExpenseRecord[],
  hiveCount: number = 50
): BeekeepingLedgerSummary {
  const totalGrossIncome = sales.reduce((acc, cur) => acc + (cur.totalAmount || 0), 0);
  const totalExpenses = expenses.reduce((acc, cur) => acc + (cur.totalAmount || 0), 0);
  const netIncome = totalGrossIncome - totalExpenses;
  const incomeRate = totalGrossIncome > 0 ? Math.round((netIncome / totalGrossIncome) * 1000) / 10 : 0;

  const validHiveCount = Math.max(1, hiveCount);
  const incomePerHive = Math.round(netIncome / validHiveCount);
  const grossPerHive = Math.round(totalGrossIncome / validHiveCount);
  const expensePerHive = Math.round(totalExpenses / validHiveCount);

  return {
    totalGrossIncome,
    totalExpenses,
    netIncome,
    incomeRate,
    hiveCount: validHiveCount,
    incomePerHive,
    grossPerHive,
    expensePerHive
  };
}

export interface MonthlyBreakdown {
  month: string; // '2025-05'
  monthLabel: string; // '5월'
  grossIncome: number;
  expenses: number;
  netIncome: number;
  salesCount: number;
  expenseCount: number;
}

export function getMonthlySummary(
  sales: BeekeepingSalesRecord[],
  expenses: BeekeepingExpenseRecord[]
): MonthlyBreakdown[] {
  const monthsMap = new Map<string, { grossIncome: number; expenses: number; salesCount: number; expenseCount: number }>();

  sales.forEach((s) => {
    const ym = s.date.slice(0, 7); // 'YYYY-MM'
    const cur = monthsMap.get(ym) || { grossIncome: 0, expenses: 0, salesCount: 0, expenseCount: 0 };
    cur.grossIncome += s.totalAmount || 0;
    cur.salesCount += 1;
    monthsMap.set(ym, cur);
  });

  expenses.forEach((e) => {
    const ym = e.date.slice(0, 7);
    const cur = monthsMap.get(ym) || { grossIncome: 0, expenses: 0, salesCount: 0, expenseCount: 0 };
    cur.expenses += e.totalAmount || 0;
    cur.expenseCount += 1;
    monthsMap.set(ym, cur);
  });

  const sortedKeys = Array.from(monthsMap.keys()).sort();
  return sortedKeys.map((ym) => {
    const data = monthsMap.get(ym)!;
    const [, month] = ym.split('-');
    return {
      month: ym,
      monthLabel: `${parseInt(month, 10)}월`,
      grossIncome: data.grossIncome,
      expenses: data.expenses,
      netIncome: data.grossIncome - data.expenses,
      salesCount: data.salesCount,
      expenseCount: data.expenseCount
    };
  });
}

export interface ProductBreakdownItem {
  item: BeekeepingProductType;
  totalAmount: number;
  totalQuantity: number;
  unit: string;
  percent: number;
  count: number;
}

export function getProductBreakdown(sales: BeekeepingSalesRecord[]): ProductBreakdownItem[] {
  const totalGross = sales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
  const map = new Map<BeekeepingProductType, { totalAmount: number; totalQuantity: number; unit: string; count: number }>();

  sales.forEach((s) => {
    const cur = map.get(s.item) || { totalAmount: 0, totalQuantity: 0, unit: s.unit, count: 0 };
    cur.totalAmount += s.totalAmount || 0;
    cur.totalQuantity += s.quantity || 0;
    cur.count += 1;
    map.set(s.item, cur);
  });

  return Array.from(map.entries())
    .map(([item, data]) => ({
      item,
      totalAmount: data.totalAmount,
      totalQuantity: data.totalQuantity,
      unit: data.unit,
      percent: totalGross > 0 ? Math.round((data.totalAmount / totalGross) * 1000) / 10 : 0,
      count: data.count
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount);
}

export interface ExpenseBreakdownItem {
  category: BeekeepingExpenseCategory;
  totalAmount: number;
  percent: number;
  count: number;
}

export function getExpenseBreakdown(expenses: BeekeepingExpenseRecord[]): ExpenseBreakdownItem[] {
  const totalExp = expenses.reduce((sum, e) => sum + (e.totalAmount || 0), 0);
  const map = new Map<BeekeepingExpenseCategory, { totalAmount: number; count: number }>();

  expenses.forEach((e) => {
    const cur = map.get(e.category) || { totalAmount: 0, count: 0 };
    cur.totalAmount += e.totalAmount || 0;
    cur.count += 1;
    map.set(e.category, cur);
  });

  return Array.from(map.entries())
    .map(([category, data]) => ({
      category,
      totalAmount: data.totalAmount,
      percent: totalExp > 0 ? Math.round((data.totalAmount / totalExp) * 1000) / 10 : 0,
      count: data.count
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount);
}

/**
 * Generate UTF-8 BOM CSV for Jeollanam-do Agricultural Research and Extension Services (전남농업기술원)
 * Beekeeping Management Record Book (양봉경영기록장 표준 서식)
 */
export function exportToJeonnamCsv(
  sales: BeekeepingSalesRecord[],
  expenses: BeekeepingExpenseRecord[],
  summary: BeekeepingLedgerSummary,
  farmInfo: {
    beekeeper: string;
    location: string;
    apiaryName: string;
    hiveCount: number;
  }
): void {
  const bom = '\uFEFF';
  const lines: string[] = [];

  lines.push('========================================================================================');
  lines.push('전라남도농업기술원 표준 양봉경영기록장 (전남 농가경영기록 지원양식)');
  lines.push('========================================================================================');
  lines.push(`경영체명,${farmInfo.apiaryName},대표자,${farmInfo.beekeeper},보유봉군수,${farmInfo.hiveCount} 군`);
  lines.push(`봉장소재지,"${farmInfo.location}",출력일자,${new Date().toLocaleDateString('ko-KR')}`);
  lines.push('');
  lines.push('[ 1. 양봉 경영 성과 총괄 요약 ]');
  lines.push(`총 조수입(원),${summary.totalGrossIncome.toLocaleString()},총 경영비(원),${summary.totalExpenses.toLocaleString()},농가소득(순수익),${summary.netIncome.toLocaleString()}`);
  lines.push(`소득률(%),${summary.incomeRate}%,군당 평균조수입,${summary.grossPerHive.toLocaleString()} 원,군당 평균소득,${summary.incomePerHive.toLocaleString()} 원`);
  lines.push('');

  lines.push('[ 2. 수입 및 판매 기록부 (전남도 기술원 표준 서식) ]');
  lines.push('일자,품목,세부품명,규격,판매량(수량),단가(원),판매금액(원),판매처(유통경로),구매자/거래처,결제방법,비고');
  sales.forEach((s) => {
    lines.push(
      `"${s.date}","${s.item}","${s.customItemName || ''}","${s.unit}",${s.quantity},${s.unitPrice},${s.totalAmount},"${s.channel}","${s.buyerName || ''}","${s.paymentMethod}","${s.notes || ''}"`
    );
  });
  lines.push(`수입소계,,,,,,${summary.totalGrossIncome},,,,`);
  lines.push('');

  lines.push('[ 3. 경영비 및 지출 기록부 (전남도 기술원 비목분류) ]');
  lines.push('일자,비목구분,품명 및 세부내용,규격,수량,단가(원),지출금액(원),구입처(상호),결제방법,비고');
  expenses.forEach((e) => {
    lines.push(
      `"${e.date}","${e.category}","${e.itemName}","${e.unit}",${e.quantity},${e.unitPrice},${e.totalAmount},"${e.vendor}","${e.paymentMethod}","${e.notes || ''}"`
    );
  });
  lines.push(`지출소계,,,,,,${summary.totalExpenses},,,`);
  lines.push('');
  lines.push('========================================================================================');
  lines.push('본 기록은 전라남도농업기술원 양봉 TOP 경영모델 및 농촌진흥청 농업경영표준진단 규격에 호환됩니다.');

  const csvContent = bom + lines.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `전라남도농업기술원_양봉경영기록장_${farmInfo.beekeeper}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
