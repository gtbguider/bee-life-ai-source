import {
  VoiceLogItem,
  QueenMetrics,
  TimelineEvent,
  ProductPortfolioItem,
  LabAnalysisData,
  HiveItem,
  WeatherInfo
} from '../types';

import beekeeperHoneyImg from '../assets/images/honeybee_real_apiary.jpg';
import apiaryMapImg from '../assets/images/gurye_sandong_apiary_map_1788273611003.jpg';

export const LOGO_URL = '/honeybee_teco_logo.svg';

export const BEEKEEPER_IMG = beekeeperHoneyImg;
export const HONEYCOMB_IMG = beekeeperHoneyImg;
export const APIARY_MAP_IMG = apiaryMapImg;

export const initialWeather: WeatherInfo = {
  location: '전남 구례군 산동면 (원달리 봉장)',
  stationName: '기상청 구례 관측소 (지리산)',
  temperature: 24.2,
  humidity: 54,
  condition: '맑음',
  icon: 'wb_sunny',
  windSpeed: 1.8,
  precipitationProb: 0,
  beeFlightScore: '최적',
  beeImpactText: '풍속 1.8m/s (4m/s 이하)로 꿀벌 외역 비행 및 채밀 활동에 최적의 기상 조건입니다.',
  updatedTime: '실시간 기상청 발표'
};

export const getTodayDateString = (offsetDays: number = 0): string => {
  const d = new Date();
  if (offsetDays !== 0) {
    d.setDate(d.getDate() + offsetDays);
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const curDate0 = getTodayDateString(0);
const curDate1 = getTodayDateString(-1);

export const initialVoiceLogs: VoiceLogItem[] = [];

export const singleHiveLogs: VoiceLogItem[] = [];

export const initialQueenMetrics: QueenMetrics = {
  eggLayingRate: 94,
  honeyHarvest: 18,
  activityScore: 'A+',
  royalJellyYield: 240
};

export const queenLineageEvents: TimelineEvent[] = [
  {
    id: 'ql-1',
    title: '우수 종봉 판정 (F2)',
    date: '2025.06.02',
    description: '높은 산란력 및 채밀 성과를 바탕으로 우수 종봉으로 최종 판정되었습니다. 다음 세대 이충 계획 수립.',
    badge: '우수',
    isHighlight: true,
    type: 'evaluation'
  },
  {
    id: 'ql-2',
    title: '특성 평가: 수밀력 우수',
    date: '2025.05.15',
    description: '야생화 및 아카시아 개화기 동안의 꿀 유입량이 타 벌통 대비 15% 이상 높음.',
    type: 'evaluation'
  },
  {
    id: 'ql-3',
    title: '유전적 특성 발현 확인',
    date: '2025.05.05',
    description: '이탈리안계의 높은 산란력과 카니올란계의 온순함이 성공적으로 발현됨을 확인.',
    type: 'check'
  },
  {
    id: 'ql-4',
    title: '로열제리 생산력 테스트',
    date: '2025.03.31',
    description: '시범 생산 결과, 왕대의 크기와 로열제리 분비량이 우수한 수준으로 평가됨.',
    type: 'production'
  },
  {
    id: 'ql-5',
    title: '봄철 산란 집중력 점검',
    date: '2025.03.01',
    description: '유채꽃 개화에 맞춘 폭발적인 산란력 확인. 봉군 세력이 빠르게 확장됨.',
    type: 'check'
  },
  {
    id: 'ql-6',
    title: '월동 생존율 평가',
    date: '2025.02.05',
    description: '낙봉이 적고 봉군 세력이 강하게 유지됨. 월동 능력이 뛰어난 것으로 기록.',
    type: 'check'
  },
  {
    id: 'ql-7',
    title: '신왕 교미 성공 및 첫 산란',
    date: '2024.04.15',
    description: '자연 교미 후 성공적으로 첫 산란 시작. 산란 패턴이 고르고 안정적임.',
    type: 'entry'
  },
  {
    id: 'ql-8',
    title: 'F2 여왕벌 왕대 입식',
    date: '2024.04.10',
    description: 'Q2023-M 모계에서 이충된 우수 왕대를 교미상에 입식 완료.',
    type: 'entry'
  }
];

export const hive12TraceEvents: TimelineEvent[] = [
  {
    id: 'ht-1',
    title: '올해 첫 숙성꿀 채밀(수확) 완료',
    date: '2025.06.02',
    description: '벌들이 밀랍으로 하얗게 덮은(봉개) 완숙 벌집에서 1년에 단 한 번 뜨는 천연숙성꿀 18kg을 수확했습니다.',
    consumerDescription: '🍯 벌들이 날개짓으로 수분을 날려 꿀을 완성하고 밀랍 뚜껑(봉개)을 덮은 진짜 완숙꿀입니다. 인공 열을 가하지 않아 영양소와 생꽃향이 그대로 살아있습니다.',
    badge: '1+등급 수확',
    isHighlight: true,
    type: 'harvest',
    glossaryTags: ['자연숙성꿀', '봉개', '채밀', '탄소동위원소비']
  },
  {
    id: 'ht-2',
    title: '지리산 야생화 꿀 유입 & 자연 숙성',
    date: '2025.05.15',
    description: '지리산 산수유와 때죽나무, 야생화 군락지에서 맑고 진한 꽃꿀 유입이 절정에 달해 벌통 내 자연 숙성에 들어갔습니다.',
    consumerDescription: '🌸 청정 지리산 골짜기 야생 꽃에서 벌들이 꿀을 가득 물어와 벌통 안에서 밤낮으로 효소를 더하며 익혀가는 중입니다.',
    type: 'production',
    glossaryTags: ['자연숙성꿀', '전화당']
  },
  {
    id: 'ht-3',
    title: '아카시아꿀 유입 & 소초광 증소',
    date: '2025.05.05',
    description: '아카시아 만개기에 맞춰 꿀벌들이 새 방을 짓도록 소초광 3매를 증소하고 저밀 공간을 충분히 확보했습니다.',
    consumerDescription: '📦 꿀이 많이 들어와 벌들이 꿀을 넉넉히 담을 수 있도록 새 벌집틀(소초광)을 넣어 넓혀주었습니다.',
    type: 'production',
    glossaryTags: ['소초광', '내검']
  },
  {
    id: 'ht-4',
    title: '로열제리 생산 및 왕대 관리',
    date: '2025.03.31',
    description: '젊은 일벌들의 분비 활력이 높아 우수한 로열제리 채취 및 여왕벌 건강 모니터링을 완료했습니다.',
    consumerDescription: '👑 어린 꿀벌들이 여왕벌을 위해 만드는 귀한 로열제리가 풍부해 벌 가족 전체가 매우 건강한 상태입니다.',
    type: 'production',
    glossaryTags: ['왕대', '이충']
  },
  {
    id: 'ht-5',
    title: '유채꽃 천연 화분 유입 시작',
    date: '2025.03.01',
    description: '이른 봄 유채꽃 노란 화분이 유입되어 아기 벌들의 단백질 공급과 여왕벌 산란이 폭발적으로 증가했습니다.',
    consumerDescription: '🌼 봄꽃 화분(꽃가루)을 벌들이 모아와 아기 벌들에게 먹이며 벌 가족 수가 활기차게 늘어납니다.',
    type: 'check',
    glossaryTags: ['화분떡', '내검']
  },
  {
    id: 'ht-6',
    title: '월동 종료 및 봄벌 깨우기',
    date: '2025.02.05',
    description: '영하의 추위를 안전하게 이겨낸 꿀벌들을 위해 개포를 정리하고 봄철 산란 활성화를 위한 보온 관리를 시작했습니다.',
    consumerDescription: '☀️ 겨울잠을 건강하게 마친 꿀벌들이 따뜻한 봄을 맞아 기운차게 활동할 수 있도록 벌통 이불(개포)을 돌보았습니다.',
    type: 'check',
    glossaryTags: ['월동', '개포']
  },
  {
    id: 'ht-7',
    title: '무항생제 동절기 월동 진입',
    date: '2024.12.10',
    description: '지리산 겨울 추위에 대비해 벌들이 서로 뭉칠 수 있도록 천연 보온재를 보강하고 무농약 월동 태세에 들어갔습니다.',
    consumerDescription: '❄️ 겨울철 꿀벌들이 얼지 않고 따뜻하게 지낼 수 있도록 친환경 보온을 마치고 휴식에 들어갔습니다.',
    type: 'check',
    glossaryTags: ['월동', '개포']
  },
  {
    id: 'ht-8',
    title: '신왕 산란력 우수 확인 (정기 내검)',
    date: '2024.10.18',
    description: '새로 부임한 여왕벌이 벌집 가득 고르게 알을 낳고 있어 내년도 최상급 꿀 수확을 위한 튼튼한 기반을 다졌습니다.',
    consumerDescription: '🔍 양봉가가 벌통 건강검진(내검)을 실시하여 새 여왕벌이 아기 벌들을 아주 건강하게 낳고 있음을 확인했습니다.',
    type: 'check',
    glossaryTags: ['신왕', '내검']
  },
  {
    id: 'ht-9',
    title: '우수 혈통 신왕 Q2025-A1 입식',
    date: '2024.09.22',
    description: '질병 저항력이 강하고 성질이 온순한 지리산 맞춤형 신왕의 안착을 확인했습니다.',
    consumerDescription: '🐝 힘차고 건강한 새 여왕벌을 벌통의 새로운 엄마로 맞이하여 벌 가족 세대교체를 완료했습니다.',
    type: 'entry',
    glossaryTags: ['신왕', '왕대', '이충']
  }
];

export const portfolioItems: ProductPortfolioItem[] = [
  {
    id: 'honey',
    name: '프리미엄 숙성꿀',
    icon: 'hive',
    profitRate: 85,
    costPercent: 30,
    revenuePercent: 85,
    colorType: 'primary'
  },
  {
    id: 'royal_jelly',
    name: '생로열제리',
    icon: 'water_drop',
    profitRate: 95,
    costPercent: 40,
    revenuePercent: 95,
    isAiRecommended: true,
    colorType: 'secondary'
  },
  {
    id: 'beeswax',
    name: '정제 밀납',
    icon: 'hexagon',
    profitRate: 40,
    costPercent: 20,
    revenuePercent: 40,
    colorType: 'neutral'
  },
  {
    id: 'queen_bee',
    name: '우량 여왕벌 육성',
    icon: 'pest_control',
    profitRate: 60,
    costPercent: 50,
    revenuePercent: 60,
    colorType: 'tertiary'
  }
];

export const sampleLabData: LabAnalysisData = {
  productName: '지리산 천연 숙성벌꿀 (공인 1+등급)',
  lotNumber: '24-0446 (한국양봉협회 공인)',
  receiptNumber: '24-0446',
  receiptDate: '2024-03-05',
  completeDate: '2024-03-11',
  applicant: '농업회사법인 허니비테코 주식회사',
  applicantPhone: '010-8020-2583',
  applicantAddress: '[57601] 전라남도 구례군 산동면 하원길 9-1',
  apiaryLocation: '전라남도 구례군 산동면 원달리 205-1 번지',
  beekeeper: '농업회사법인 허니비테코 주식회사',
  labName: '사단법인 한국양봉협회 양봉산물연구소',
  labAddress: '서울시 서초구 서초중앙로 6길 9',
  labTel: '02-3486-0882~5',
  carbonIsotopeRatio: '-26.0‰ (기준 -22.5‰ 이하 최고급 천연 벌꿀)',
  moistureContent: '16.8% (기준 20.0% 이하 완숙)',
  hmfContent: '7.4 mg/kg (신선도 기준 80.0 mg/kg 이하)',
  reducingSugar: '67.7% (전화당 기준 60.0% 이상)',
  sucrose: '4.5% (자당 기준 7.0% 이하)',
  sugarRatio: '1.33 (과당/포도당 비율)',
  antibiotics: '불검출 (5종 항생제 전 항목 불검출)',
  pesticides: '불검출 (농약·구충제·독성물질 전 항목 불검출)',
  grade: '1+ 등급 최상급 천연 완숙벌꿀 (탄소동위원소비 -26‰)',
  blockchainTxHash: '0x8f7ba9c2d4e5f6a1b2c3d4e5f6a7b8c9d0e1f2a3',
  testItems: [
    { no: 1, name: '성상', standard: '적합', result: '적합', isPassed: true, category: '벌꿀규격 및 일반성상' },
    { no: 2, name: '수분', standard: '20.0% 이하', result: '16.8%', isPassed: true, category: '벌꿀규격 및 일반성상' },
    { no: 3, name: '물불용물', standard: '0.5% 이하', result: '적합', isPassed: true, category: '벌꿀규격 및 일반성상' },
    { no: 4, name: '산도', standard: '40.0meq/kg 이하', result: '적합', isPassed: true, category: '벌꿀규격 및 일반성상' },
    { no: 5, name: '전화당', standard: '60.0% 이상', result: '67.7%', isPassed: true, category: '벌꿀규격 및 일반성상' },
    { no: 6, name: '자당', standard: '7.0% 이하', result: '4.5%', isPassed: true, category: '벌꿀규격 및 일반성상' },
    { no: 7, name: '당비율 (과당/포도당)', standard: '과당/포도당', result: '1.33', isPassed: true, category: '벌꿀규격 및 일반성상' },
    { no: 8, name: 'H.M.F (신선도)', standard: '80.0mg/kg 이하', result: '7.4 mg/kg', isPassed: true, category: '벌꿀규격 및 일반성상' },
    { no: 9, name: '타르색소', standard: '불검출', result: '불검출', isPassed: true, category: '벌꿀규격 및 일반성상' },
    { no: 10, name: '사카린나트륨', standard: '불검출', result: '불검출', isPassed: true, category: '벌꿀규격 및 일반성상' },
    { no: 11, name: '이성화당', standard: '음성', result: '음성', isPassed: true, category: '벌꿀규격 및 일반성상' },
    { no: 12, name: '탄소동위원소비 (순도)', standard: '-22.5‰이하 벌꿀\n(-22.5‰초과 사양꿀)', result: '-26.0‰ (순수벌꿀)', isPassed: true, category: '벌꿀규격 및 일반성상' },
    { no: 13, name: '네오마이신 (항생제)', standard: '0.10ppm 이하', result: '불검출', isPassed: true, category: '항생제' },
    { no: 14, name: '스트렙토마이신 (항생제)', standard: '불검출', result: '불검출', isPassed: true, category: '항생제' },
    { no: 15, name: '옥시테트라싸이클린 (항생제)', standard: '0.30ppm 이하', result: '불검출', isPassed: true, category: '항생제' },
    { no: 16, name: '클로람페니콜 (항생제)', standard: '불검출', result: '불검출', isPassed: true, category: '항생제' },
    { no: 17, name: '테트라싸이클린 (항생제)', standard: '0.01ppm 이하', result: '불검출', isPassed: true, category: '항생제' },
    { no: 18, name: '시미아졸 (구충제)', standard: '1.00ppm 이하', result: '불검출', isPassed: true, category: '구충제' },
    { no: 19, name: '브로모프로필레이트 (구충제)', standard: '0.01ppm 이하', result: '불검출', isPassed: true, category: '구충제' },
    { no: 20, name: '아미트라즈 (구충제)', standard: '0.20ppm 이하', result: '불검출', isPassed: true, category: '구충제' },
    { no: 21, name: '코마포스 (구충제)', standard: '0.10ppm 이하', result: '불검출', isPassed: true, category: '구충제' },
    { no: 22, name: '플루메쓰린 (구충제)', standard: '0.01ppm 이하', result: '불검출', isPassed: true, category: '구충제' },
    { no: 23, name: '플루발리네이트 (구충제)', standard: '0.05ppm 이하', result: '불검출', isPassed: true, category: '구충제' },
    { no: 24, name: '그레이아노톡신 III (독성물질)', standard: '불검출', result: '불검출', isPassed: true, category: '독성물질' },
  ]
};

export function generateHives(count: number = 50): HiveItem[] {
  const safeCount = Math.max(1, count);
  return Array.from({ length: safeCount }, (_, i) => {
    const id = i + 1;
    let status: '정상' | '주의' | '채밀가능' | '내검필요' = '정상';
    if (id === 12 || id === 7 || id === 18 || id === 33 || (id > 50 && id % 17 === 0)) {
      status = '채밀가능';
    } else if (id === 21 || id === 42 || (id > 50 && id % 29 === 0)) {
      status = '주의';
    } else if (id % 5 === 0) {
      status = '내검필요';
    }

    return {
      id,
      name: `${id}번 벌통`,
      queenGen: id <= Math.max(1, Math.floor(safeCount * 0.4))
        ? 'F2 세대'
        : id <= Math.max(1, Math.floor(safeCount * 0.8))
        ? 'F1 세대'
        : 'F3 세대',
      queenAge: `${2024 - (id % 2)}년생`,
      status,
      eggRate: status === '주의' ? 68 : Math.floor(88 + (id * 7) % 11),
      honeyYield: status === '채밀가능' ? 18 + (id % 4) : Math.floor(10 + (id * 3) % 9),
      lastCheckDate: `2025.06.0${(id % 3) + 1}`,
      notes:
        status === '주의'
          ? '세력 약함, 여왕벌 산란 상태 점검 요망'
          : status === '채밀가능'
          ? '숙성도 90% 이상, 채밀 적기'
          : '봉군 발달 양호, 화분떡 공급 완료'
    };
  });
}

export const sampleHives: HiveItem[] = generateHives(50);
