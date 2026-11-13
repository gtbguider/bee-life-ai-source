import {
  HoneyLot,
  ApiaryProductType,
  APIARY_PRODUCT_TYPE_LABELS,
  APIARY_PRODUCT_TYPE_ICONS
} from '../types';

/**
 * Returns label and icon for productType, safely defaulting to 'honey' if undefined
 */
export function getProductTypeDisplay(productType?: ApiaryProductType): {
  type: ApiaryProductType;
  label: string;
  icon: string;
  full: string;
} {
  const type: ApiaryProductType = productType || 'honey';
  const label = APIARY_PRODUCT_TYPE_LABELS[type] || '꿀';
  const icon = APIARY_PRODUCT_TYPE_ICONS[type] || '🍯';
  return {
    type,
    label,
    icon,
    full: `${icon} ${label}`
  };
}

/**
 * Maps Korean honey type name to 2-3 letter LOT abbreviation
 * 아카시아 = AC, 밤꿀 = CH, 야생화 = WF, 기타 = ETC
 */
export function getHoneyTypeCode(honeyType: string): string {
  const normalized = (honeyType || '').trim().toLowerCase();
  if (normalized.includes('아카시아')) return 'AC';
  if (normalized.includes('밤')) return 'CH';
  if (normalized.includes('야생화') || normalized.includes('잡화')) return 'WF';
  return 'ETC';
}

/**
 * Maps productType + honeyType to standard LOT abbreviation
 * 로열제리 = RJ, 프로폴리스 = PR, 꿀 = AC/CH/WF/ETC
 */
export function getProductTypeCode(productType?: ApiaryProductType, honeyType?: string): string {
  if (productType === 'royalJelly') return 'RJ';
  if (productType === 'propolis') return 'PR';
  if (productType === 'other') return 'ETC';
  return getHoneyTypeCode(honeyType || '');
}

/**
 * Generates unique LOT number: YYYY-TYPECODE-YYYYMMDD-01
 * If multiple lots exist for the same date and type, increments sequence number (-01, -02, -03...)
 */
export function generateLotNumber(
  honeyType: string,
  harvestDate: string,
  existingLots: HoneyLot[] = [],
  productType?: ApiaryProductType
): string {
  // Safe fallback if date is missing
  const dateStr = harvestDate && /^\d{4}-\d{2}-\d{2}$/.test(harvestDate)
    ? harvestDate
    : new Date().toISOString().split('T')[0];

  const year = dateStr.slice(0, 4);
  const typeCode = getProductTypeCode(productType, honeyType);
  const dateCompact = dateStr.replace(/-/g, '');
  const prefix = `${year}-${typeCode}-${dateCompact}-`;

  // Find all existing lots that match this prefix
  const matchingLotNumbers = existingLots
    .map((l) => l.lotNumber)
    .filter((num) => num && num.startsWith(prefix));

  if (matchingLotNumbers.length === 0) {
    return `${prefix}01`;
  }

  // Find max sequence number
  let maxSeq = 0;
  matchingLotNumbers.forEach((num) => {
    const seqPart = num.slice(prefix.length);
    const seqVal = parseInt(seqPart, 10);
    if (!isNaN(seqVal) && seqVal > maxSeq) {
      maxSeq = seqVal;
    }
  });

  const nextSeq = String(maxSeq + 1).padStart(2, '0');
  return `${prefix}${nextSeq}`;
}

/**
 * Formats multiple hive IDs into display string
 * e.g. [12, 13, 14] -> "12 · 13 · 14번"
 */
export function formatHiveRange(hiveIds: number[]): string {
  if (!hiveIds || hiveIds.length === 0) return '전체 벌통';
  const sorted = [...hiveIds].sort((a, b) => a - b);
  return `${sorted.join(' · ')}번`;
}

/**
 * Returns default product name and metadata for selected product type / honey type
 */
export function getDefaultProductMeta(
  honeyType: string,
  farmName = '농업회사법인 허니비테코 주식회사',
  productType: ApiaryProductType = 'honey'
): {
  productName: string;
  nectarSource: string;
  packageUnit?: string;
  storageMethod?: string;
} {
  const brand = farmName.includes('허니비테코') ? '허니비테코' : farmName;

  if (productType === 'royalJelly') {
    return {
      productName: `${brand} 생로열제리 (국내산 100%)`,
      nectarSource: '지리산 청정 밀원 생로열제리',
      packageUnit: '50g 병',
      storageMethod: '냉동보관(-18℃ 이하)'
    };
  }

  if (productType === 'propolis') {
    return {
      productName: `${brand} 프리미엄 수용성 프로폴리스`,
      nectarSource: '지리산 천연 수목 수지',
      packageUnit: '100ml 스포이트병',
      storageMethod: '실온보관(직사광선 차단)'
    };
  }

  switch (honeyType) {
    case '아카시아꿀':
      return {
        productName: `${brand} 천연 아카시아꿀`,
        nectarSource: '지리산 청정 아카시아',
        packageUnit: '2.4kg 유리병',
        storageMethod: '실온보관(18~25℃)'
      };
    case '밤꿀':
      return {
        productName: `${brand} 천연 토종 밤꿀`,
        nectarSource: '지리산 야생 밤나무꽃',
        packageUnit: '2.4kg 유리병',
        storageMethod: '실온보관(18~25℃)'
      };
    case '야생화꿀':
      return {
        productName: `${brand} 천연 야생화(잡화)꿀`,
        nectarSource: '지리산 사계절 야생화',
        packageUnit: '2.4kg 유리병',
        storageMethod: '실온보관(18~25℃)'
      };
    default:
      return {
        productName: `${brand} 천연 벌꿀`,
        nectarSource: '국내산 천연 밀원',
        packageUnit: '2.4kg 유리병',
        storageMethod: '실온보관(18~25℃)'
      };
  }
}
