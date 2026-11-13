import { ApiaryProductType, HoneyTracePublicData } from '../types';

const BEEKEEPER_FIELD_PHOTO_URL = new URL(
  '../assets/images/honeybee_real_apiary.jpg',
  import.meta.url
).href;
const APIARY_MAP_PHOTO_URL = new URL(
  '../assets/images/gurye_sandong_apiary_map_1788273611003.jpg',
  import.meta.url
).href;
const BRAND_LOGO_URL = '/honeybee_teco_logo.svg';
export const COMMON_BRAND_PRODUCTS_IMAGE_URL = '/assets/products/honeybee_honey_products.png';

/**
 * 허니비테코 소비자 공개용 공통 브랜드 · 실제 판매 제품 카탈로그 · 봉장 정보 관리 모듈
 *
 * [핵심 원칙]:
 * 1. 공통 브랜드/제품 자산과 LOT별 실제 꿀 생산 이력(HoneyTracePublicData / publicTraceId)을 엄격히 분리합니다.
 *    - 공통 브랜드 정보나 제품 사진 경로를 수정해도 기존 LOT 생산 이력과 publicTraceId는 절대 변경되지 않습니다.
 *    - LOT별 생산 이력이 수정되어도 기존 QR 주소(/trace/:publicTraceId)는 그대로 유지됩니다.
 * 2. 실제 제품 사진 관리 원칙:
 *    - AI로 제품 사진(병 모양, 라벨, 포장 디자인)을 임의 생성하거나 타 업체 이미지로 대체하지 않습니다.
 *    - 아카시아꿀, 밤꿀, 야생화꿀 등 서로 다른 제품에 동일한 사진을 무조건 반복 연결하지 않습니다.
 *    - 실제 판매 제품 사진이 확인/등록된 경우에만 해당 제품 이미지를 표시하고,
 *      아직 프로젝트에 실제 제품 사진 파일이 등록되지 않은 경우 정직하게 '실제 제품 사진 미등록' 상태로 안내합니다.
 *    - 사진이 '특정 제품(품목) 전용 실제 사진'인지 '허니비테코 공통 브랜드/봉장 현장 사진'인지 명확히 구분하여 표시합니다.
 */

export type ProductPhotoAssetScope = 'product_specific' | 'lot_specific' | 'unregistered';

export interface OfficialProductCatalogItem {
  /** 내부 식별 키 (acacia, chestnut, wildflower, royalJelly, propolis, general) */
  catalogKey: 'acacia' | 'chestnut' | 'wildflower' | 'royalJelly' | 'propolis' | 'general';
  /** 품목 분류 */
  productType: ApiaryProductType;
  /** 공식 제품명 */
  officialName: string;
  /** 대표 꿀 종류 명칭 */
  honeyTypeLabel: string;
  /** 매칭 키워드 (honeyType 또는 productName 매칭용) */
  matchKeywords: string[];
  /**
   * 실제 판매 제품 사진 경로 (public/assets/products/... 에 실제 제품 사진 추가 시 연결)
   * - 현재 프로젝트에 실제 병/패키지 제품 사진 파일이 아직 추가되지 않았으므로 null로 유지합니다.
   * - 다른 제품의 사진이나 봉장 현장 사진을 제품 병 사진으로 둔갑시켜 반복 연결하지 않습니다.
   */
  verifiedProductImageUrl: string | null;
  /** 실제 제품 사진 파일을 추가할 때 권장하는 프로젝트 내 경로 안내 */
  recommendedAssetPath: string;
  /** 사진 자산 구분 */
  photoScope: ProductPhotoAssetScope;
  /** 기존 프로젝트에 등록된 실제 설명 기반 공식 소개 */
  officialDescription: string;
  /** 기존 프로젝트에 등록된 사실 기반 특징 */
  verifiedFeatures: string[];
}

export interface OfficialBrandAndApiaryInfo {
  companyName: string;
  brandShortName: string;
  logoUrl: string;
  slogan: string;
  brandStory: string;
  corePrinciples: {
    title: string;
    description: string;
  }[];
  /** 허니비테코 공통 브랜드·제품 이미지 (특정 품목 단독 사진이 아닌 공통 대표 제품 라인업 사진) */
  commonProductPhotoUrl: string;
  commonProductPhotoCaption: string;
  commonProductPhotoScopeLabel: string;
  /** 허니비테코 공통 봉장 현장 사진 (제품 개별 사진과 명확히 구분하여 봉장 소개 영역에서만 사용) */
  apiaryFieldPhotoUrl: string;
  apiaryFieldPhotoCaption: string;
  apiaryFieldPhotoScopeLabel: string;
  /** 공개 승인된 봉장 위치 정보 */
  approvedApiaryLocation: {
    isPubliclyApproved: boolean;
    apiaryTitle: string;
    approvedRegionSummary: string;
    approvedAddress: string;
    environmentSummary: string;
    seasonalNectarSources: {
      season: string;
      sources: string;
    }[];
    mapPreviewImageUrl: string;
  };
  contactPhone: string;
}

/**
 * 허니비테코 공통 브랜드 및 공개 승인 봉장 정보
 * (기존 ConsumerView, LandingView, ApiaryMapSection에 등록된 실제 내용 재사용)
 */
export const HONEYBEE_OFFICIAL_BRAND_INFO: OfficialBrandAndApiaryInfo = {
  companyName: '농업회사법인 허니비테코 주식회사',
  brandShortName: '허니비테코',
  logoUrl: BRAND_LOGO_URL,
  slogan: '꿀벌과 자연이 완성할 때까지 기다립니다',
  brandStory:
    '농업회사법인 허니비테코 주식회사는 청정 지리산 자락에서 꿀벌을 돌보고 있습니다. 인위적인 열을 가해 농축하지 않고 꿀벌들이 날갯짓으로 수분을 증발시켜 자연 숙성한 벌꿀을 수확하며, 실제 봉장 관리 기록(양봉일지)과 채밀 기록을 바탕으로 LOT별 생산 이력을 투명하게 공개합니다.',
  corePrinciples: [
    {
      title: '양봉일지 기반 실제 채밀 기록 연동',
      description:
        '봉장에서 기록한 실제 내검 및 채밀 양봉일지를 바탕으로 LOT별 생산 이력을 생성하고 검증합니다.'
    },
    {
      title: '천연 숙성 및 봉군 건강 관리',
      description:
        '음성 양봉일지로 벌통의 상태를 체계적으로 기록하여 건강한 봉군에서 채밀한 꿀만 선별합니다.'
    }
  ],
  commonProductPhotoUrl: COMMON_BRAND_PRODUCTS_IMAGE_URL,
  commonProductPhotoCaption: '농업회사법인 허니비테코 천연 벌꿀 공통 브랜드·제품 이미지',
  commonProductPhotoScopeLabel: '공통 브랜드 · 제품 이미지',
  apiaryFieldPhotoUrl: BEEKEEPER_FIELD_PHOTO_URL,
  apiaryFieldPhotoCaption: '농업회사법인 허니비테코 봉장 채밀·내검 현장 (공통 브랜드 현장 사진)',
  apiaryFieldPhotoScopeLabel: '공통 브랜드 · 봉장 현장 사진',
  approvedApiaryLocation: {
    isPubliclyApproved: true,
    apiaryTitle: '허니비테코 지리산 제1봉장 (원달리)',
    approvedRegionSummary: '전남 구례군 산동면 지리산 자락 천연 밀원림',
    approvedAddress: '전남 구례군 산동면 원달리 205-1 번지',
    environmentSummary: '해발 480m · 지리산 청정 밀원수 숲에 둘러싸인 채밀지',
    seasonalNectarSources: [
      {
        season: '봄 밀원',
        sources: '산수유, 벚나무꽃, 아카시아, 봄 야생화'
      },
      {
        season: '초여름 밀원',
        sources: '야생화, 때죽나무꽃, 밤꽃'
      }
    ],
    mapPreviewImageUrl: APIARY_MAP_PHOTO_URL
  },
  contactPhone: '010-8020-2583'
};

/**
 * 제품 종류별 공식 카탈로그 및 실제 제품 사진 연결 테이블
 *
 * [실제 제품 사진 파일 추가 안내]:
 * 프로젝트의 `public/assets/products/` 폴더에 아래 파일명으로 실제 판매 제품 사진을 추가한 뒤
 * 해당 항목의 `verifiedProductImageUrl`을 `'/assets/products/파일명'`으로 설정하면
 * 아카시아꿀, 밤꿀, 야생화꿀 등 각 제품에 맞는 실제 제품 사진이 자동 연결됩니다.
 * - 아카시아꿀: `/public/assets/products/honeybee_acacia_honey.jpg`
 * - 밤꿀: `/public/assets/products/honeybee_chestnut_honey.jpg`
 * - 야생화꿀(잡화꿀): `/public/assets/products/honeybee_wildflower_honey.jpg`
 * - 생로열제리: `/public/assets/products/honeybee_royal_jelly.jpg`
 * - 프로폴리스: `/public/assets/products/honeybee_propolis.jpg`
 */
export const OFFICIAL_PRODUCT_CATALOG: OfficialProductCatalogItem[] = [
  {
    catalogKey: 'acacia',
    productType: 'honey',
    officialName: '허니비테코 천연 아카시아꿀',
    honeyTypeLabel: '아카시아꿀',
    matchKeywords: ['아카시아', '아카시아꿀'],
    verifiedProductImageUrl: null,
    recommendedAssetPath: '/public/assets/products/honeybee_acacia_honey.jpg',
    photoScope: 'unregistered',
    officialDescription:
      '지리산 청정 아카시아 개화기에 맞춰 꿀벌들이 채집하고 자연 숙성한 아카시아 벌꿀입니다. 실제 기록된 양봉일지와 LOT별 생산 이력을 통해 채밀 일자와 밀원 정보를 투명하게 확인하실 수 있습니다.',
    verifiedFeatures: [
      '양봉일지 기반 실제 채밀·생산 이력 연동',
      'LOT별 개별 이력번호 및 채밀 기간 공개',
      '등록된 공인 검사성적서 연동 확인 가능'
    ]
  },
  {
    catalogKey: 'chestnut',
    productType: 'honey',
    officialName: '허니비테코 천연 토종 밤꿀',
    honeyTypeLabel: '밤꿀',
    matchKeywords: ['밤꿀', '밤나무', '토종 밤꿀'],
    verifiedProductImageUrl: null,
    recommendedAssetPath: '/public/assets/products/honeybee_chestnut_honey.jpg',
    photoScope: 'unregistered',
    officialDescription:
      '지리산 야생 밤나무꽃에서 채집하여 벌통 내에서 자연 숙성한 밤꿀입니다. 인위적인 공정을 거치지 않으며, LOT별 실제 채밀 기록과 양봉일지 근거를 함께 확인하실 수 있습니다.',
    verifiedFeatures: [
      '양봉일지 기반 실제 채밀·생산 이력 연동',
      'LOT별 개별 이력번호 및 채밀 기간 공개',
      '등록된 공인 검사성적서 연동 확인 가능'
    ]
  },
  {
    catalogKey: 'wildflower',
    productType: 'honey',
    officialName: '허니비테코 천연 야생화(잡화)꿀',
    honeyTypeLabel: '야생화꿀',
    matchKeywords: ['야생화', '잡화', '야생화꿀', '잡화꿀', '야생화(잡화)꿀'],
    verifiedProductImageUrl: null,
    recommendedAssetPath: '/public/assets/products/honeybee_wildflower_honey.jpg',
    photoScope: 'unregistered',
    officialDescription:
      '계절마다 피어나는 지리산 야생 꽃에서 꿀벌들이 물어와 자연 숙성한 야생화 벌꿀입니다. 해당 LOT에 연결된 실제 채밀 일자와 양봉일지 기록을 투명하게 제공합니다.',
    verifiedFeatures: [
      '양봉일지 기반 실제 채밀·생산 이력 연동',
      'LOT별 개별 이력번호 및 채밀 기간 공개',
      '등록된 공인 검사성적서 연동 확인 가능'
    ]
  },
  {
    catalogKey: 'royalJelly',
    productType: 'royalJelly',
    officialName: '허니비테코 생로열제리',
    honeyTypeLabel: '로열제리',
    matchKeywords: ['로열제리', '로얄제리'],
    verifiedProductImageUrl: null,
    recommendedAssetPath: '/public/assets/products/honeybee_royal_jelly.jpg',
    photoScope: 'unregistered',
    officialDescription:
      '건강하게 관리된 봉군에서 채취하여 생산 이력을 기록한 허니비테코 로열제리 제품입니다.',
    verifiedFeatures: [
      '양봉일지 기반 봉군 관리 및 채취 기록 연동',
      'LOT별 개별 이력번호 확인 가능'
    ]
  },
  {
    catalogKey: 'propolis',
    productType: 'propolis',
    officialName: '허니비테코 프로폴리스',
    honeyTypeLabel: '프로폴리스',
    matchKeywords: ['프로폴리스'],
    verifiedProductImageUrl: null,
    recommendedAssetPath: '/public/assets/products/honeybee_propolis.jpg',
    photoScope: 'unregistered',
    officialDescription:
      '청정 봉장에서 채취·관리된 허니비테코 프로폴리스 제품으로, LOT별 등록된 생산 이력을 투명하게 안내합니다.',
    verifiedFeatures: [
      '양봉일지 기반 봉군 관리 기록 연동',
      'LOT별 개별 이력번호 확인 가능'
    ]
  },
  {
    catalogKey: 'general',
    productType: 'honey',
    officialName: '허니비테코 천연 벌꿀',
    honeyTypeLabel: '천연벌꿀',
    matchKeywords: [],
    verifiedProductImageUrl: null,
    recommendedAssetPath: '/public/assets/products/honeybee_natural_honey.jpg',
    photoScope: 'unregistered',
    officialDescription:
      '농축기로 인위적인 열을 가하지 않고, 꿀벌들이 날갯짓으로 수분을 증발시켜 숙성한 천연 벌꿀의 실제 채밀·생산 이력을 투명하게 공개합니다.',
    verifiedFeatures: [
      '양봉일지 기반 실제 채밀·생산 이력 연동',
      'LOT별 개별 이력번호 및 채밀 기간 공개',
      '등록된 공인 검사성적서 연동 확인 가능'
    ]
  }
];

/**
 * 공개 꿀 이력 데이터(HoneyTracePublicData)의 productType / honeyType / productName을 바탕으로
 * 해당 제품과 일치하는 공식 카탈로그 항목을 반환합니다.
 * - 확인되지 않은 다른 제품의 사진을 절대 대신 연결하지 않습니다.
 */
export function resolveCatalogProductForTrace(
  traceData?: Pick<HoneyTracePublicData, 'productType' | 'honeyType' | 'productName'> | null
): OfficialProductCatalogItem {
  if (!traceData) {
    return OFFICIAL_PRODUCT_CATALOG.find((item) => item.catalogKey === 'general')!;
  }

  if (traceData.productType === 'royalJelly') {
    return OFFICIAL_PRODUCT_CATALOG.find((item) => item.catalogKey === 'royalJelly')!;
  }
  if (traceData.productType === 'propolis') {
    return OFFICIAL_PRODUCT_CATALOG.find((item) => item.catalogKey === 'propolis')!;
  }

  const combinedText = `${traceData.honeyType || ''} ${traceData.productName || ''}`.trim();

  if (combinedText.includes('아카시아')) {
    return OFFICIAL_PRODUCT_CATALOG.find((item) => item.catalogKey === 'acacia')!;
  }
  if (combinedText.includes('밤')) {
    return OFFICIAL_PRODUCT_CATALOG.find((item) => item.catalogKey === 'chestnut')!;
  }
  if (combinedText.includes('야생화') || combinedText.includes('잡화')) {
    return OFFICIAL_PRODUCT_CATALOG.find((item) => item.catalogKey === 'wildflower')!;
  }

  return OFFICIAL_PRODUCT_CATALOG.find((item) => item.catalogKey === 'general')!;
}
