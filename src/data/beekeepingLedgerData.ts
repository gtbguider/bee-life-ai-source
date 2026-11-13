import {
  BeekeepingSalesRecord,
  BeekeepingExpenseRecord,
  BeekeepingLedgerSummary
} from '../types';

export const INITIAL_SALES_RECORDS: BeekeepingSalesRecord[] = [
  {
    id: 'sale-001',
    date: '2025-05-18',
    item: '아카시아꿀',
    customItemName: '지리산 햇 아카시아 숙성꿀 (2.4kg)',
    unit: '2.4kg 병',
    quantity: 60,
    unitPrice: 60000,
    totalAmount: 3600000,
    channel: '소비자 직거래(택배)',
    buyerName: '정기 단골고객 45명',
    paymentMethod: '계좌이체',
    notes: '1차 채밀분 완판, 선물용 부직포 가방 동봉'
  },
  {
    id: 'sale-002',
    date: '2025-05-25',
    item: '아카시아꿀',
    customItemName: '순수 아카시아 완숙꿀 (2.4kg)',
    unit: '2.4kg 병',
    quantity: 95,
    unitPrice: 58000,
    totalAmount: 5510000,
    channel: '스마트스토어/온라인',
    buyerName: '네이버 쇼핑몰 고객',
    paymentMethod: '카드',
    notes: '탄소동위원소비 -26.0‰ 공인성적서 홍보 효과'
  },
  {
    id: 'sale-003',
    date: '2025-06-05',
    item: '생로열제리',
    customItemName: '당일 채취 생로열제리 (50g)',
    unit: '50g 병',
    quantity: 42,
    unitPrice: 40000,
    totalAmount: 1680000,
    channel: '소비자 직거래(택배)',
    buyerName: '건강원 및 VIP 고객',
    paymentMethod: '계좌이체',
    notes: '냉동 아이스박스 특급 배송'
  },
  {
    id: 'sale-004',
    date: '2025-06-12',
    item: '야생화꿀',
    customItemName: '지리산 오미자/때죽 복합 야생화꿀',
    unit: '2.4kg 병',
    quantity: 70,
    unitPrice: 55000,
    totalAmount: 3850000,
    channel: '로컬푸드/농협',
    buyerName: '구례농협 로컬푸드직매장',
    paymentMethod: '세금계산서',
    notes: '전남도 우수 농특산물 코너 입점'
  },
  {
    id: 'sale-005',
    date: '2025-06-20',
    item: '생화분/벌화분',
    customItemName: '지리산 자연산 도토리·다래 생화분',
    unit: '1kg 박스',
    quantity: 35,
    unitPrice: 45000,
    totalAmount: 1575000,
    channel: '소비자 직거래(택배)',
    buyerName: '직거래 주문 고객',
    paymentMethod: '계좌이체',
    notes: '급속 동결건조 포장'
  },
  {
    id: 'sale-006',
    date: '2025-06-28',
    item: '프로폴리스(봉교)',
    customItemName: '수용성 고농축 프로폴리스 엑기스',
    unit: '100ml 병',
    quantity: 50,
    unitPrice: 50000,
    totalAmount: 2500000,
    channel: '소비자 직거래(택배)',
    buyerName: '구례 건강동호회 회원',
    paymentMethod: '계좌이체',
    notes: '플라보노이드 17mg/g 규격 합격품'
  },
  {
    id: 'sale-007',
    date: '2025-07-10',
    item: '생로열제리',
    customItemName: '동결 신선 생로열제리 (50g 2병 세트)',
    unit: '50g 병',
    quantity: 55,
    unitPrice: 40000,
    totalAmount: 2200000,
    channel: '지인/선물용',
    buyerName: '산동면 지역주민 및 지인',
    paymentMethod: '현금',
    notes: '현장 방문 수령'
  },
  {
    id: 'sale-008',
    date: '2025-07-22',
    item: '밤꿀',
    customItemName: '지리산 약용 진한 밤꿀 (2.4kg)',
    unit: '2.4kg 병',
    quantity: 48,
    unitPrice: 70000,
    totalAmount: 3360000,
    channel: '스마트스토어/온라인',
    buyerName: '온라인 오픈마켓',
    paymentMethod: '카드',
    notes: '기관지/위장 건강용 밤꿀 프리미엄'
  },
  {
    id: 'sale-009',
    date: '2025-08-05',
    item: '종봉/교미여왕벌',
    customItemName: 'F2 세대 우량 교미여왕벌 (산란검증 완료)',
    unit: '1마리',
    quantity: 32,
    unitPrice: 40000,
    totalAmount: 1280000,
    channel: '도매/상인',
    buyerName: '곡성·남원 양봉농가 4곳',
    paymentMethod: '계좌이체',
    notes: '왕완 보호케이지 및 일벌 5마리 동봉 분양'
  },
  {
    id: 'sale-010',
    date: '2025-08-18',
    item: '정제밀랍/밀랍초',
    customItemName: '100% 천연 정제 비즈왁스',
    unit: '1kg',
    quantity: 22,
    unitPrice: 30000,
    totalAmount: 660000,
    channel: '소비자 직거래(택배)',
    buyerName: '천연비누/밀랍초 공방 3곳',
    paymentMethod: '계좌이체',
    notes: '불순물 3회 침전 정제'
  },
  {
    id: 'sale-011',
    date: '2025-08-25',
    item: '프로폴리스(봉교)',
    customItemName: '프로폴리스 스프레이 (50ml)',
    unit: '50g 병',
    quantity: 60,
    unitPrice: 25000,
    totalAmount: 1500000,
    channel: '로컬푸드/농협',
    buyerName: '구례농협 하나로마트',
    paymentMethod: '세금계산서',
    notes: '휴대용 구강스프레이 신상품'
  },
  {
    id: 'sale-012',
    date: '2025-09-02',
    item: '천연숙성꿀',
    customItemName: '추석 명절 프리미엄 꿀 2종세트 (1.2kg x 2)',
    unit: '1.2kg 병',
    quantity: 36,
    unitPrice: 75000,
    totalAmount: 2700000,
    channel: '소비자 직거래(택배)',
    buyerName: '추석선물 사전예약 기업고객',
    paymentMethod: '세금계산서',
    notes: '고급 한옥 패키지 포장'
  }
];

export const INITIAL_EXPENSE_RECORDS: BeekeepingExpenseRecord[] = [
  {
    id: 'exp-001',
    date: '2025-03-05',
    category: '사료/사양비',
    itemName: '대용화분떡 (1kg 골드)',
    unit: '개',
    quantity: 120,
    unitPrice: 3500,
    totalAmount: 420000,
    vendor: '구례양봉원',
    paymentMethod: '카드',
    notes: '이른 봄 산란 촉진용 급이'
  },
  {
    id: 'exp-002',
    date: '2025-03-12',
    category: '방제/약품비',
    itemName: '개미산 60% 및 기화기 세트',
    unit: '세트',
    quantity: 1,
    unitPrice: 180000,
    totalAmount: 180000,
    vendor: '구례 동물약품',
    paymentMethod: '카드',
    notes: '봄철 꿀벌응애 친환경 1차 방제'
  },
  {
    id: 'exp-003',
    date: '2025-04-10',
    category: '기구/자재비',
    itemName: '플라스틱 소초광 100매 및 스텐 격왕판',
    unit: '박스',
    quantity: 1,
    unitPrice: 320000,
    totalAmount: 320000,
    vendor: '한국양봉농협 경제사업소',
    paymentMethod: '계좌이체',
    notes: '아카시아 유밀기 전 계상 증소용'
  },
  {
    id: 'exp-004',
    date: '2025-04-28',
    category: '사료/사양비',
    itemName: '정제 백설탕 (15kg 포)',
    unit: '포',
    quantity: 40,
    unitPrice: 26000,
    totalAmount: 1040000,
    vendor: '구례농협 하나로마트',
    paymentMethod: '세금계산서',
    notes: '유밀기 직전 봉군 세력 증강 사양'
  },
  {
    id: 'exp-005',
    date: '2025-05-15',
    category: '기구/자재비',
    itemName: '채밀용 유리병 (2.4kg 골드캡) 200개 + 완충박스',
    unit: '개',
    quantity: 200,
    unitPrice: 1800,
    totalAmount: 360000,
    vendor: '금성유리포장',
    paymentMethod: '카드',
    notes: '아카시아꿀 포장용기'
  },
  {
    id: 'exp-006',
    date: '2025-05-19',
    category: '인건비/고용노동',
    itemName: '아카시아 1차 채밀 작업 보조 인부 (2인)',
    unit: '일/인',
    quantity: 2,
    unitPrice: 160000,
    totalAmount: 320000,
    vendor: '산동면 농촌일손돕기',
    paymentMethod: '계좌이체',
    notes: '탈봉기 운용 및 채밀통 운반 지원'
  },
  {
    id: 'exp-007',
    date: '2025-05-26',
    category: '인건비/고용노동',
    itemName: '아카시아 2차 채밀 작업 보조 인부 (2인)',
    unit: '일/인',
    quantity: 2,
    unitPrice: 160000,
    totalAmount: 320000,
    vendor: '산동면 농촌일손돕기',
    paymentMethod: '계좌이체',
    notes: '채밀 및 정제망 여과 작업'
  },
  {
    id: 'exp-008',
    date: '2025-06-08',
    category: '수송/유류비',
    itemName: '야생화 밀원 이동 화물트럭 유류비 및 톨게이트',
    unit: '회',
    quantity: 1,
    unitPrice: 250000,
    totalAmount: 250000,
    vendor: '구례지리산주유소',
    paymentMethod: '카드',
    notes: '지리산 고지대 이동양봉 운송비'
  },
  {
    id: 'exp-009',
    date: '2025-06-15',
    category: '기구/자재비',
    itemName: '로열제리 채취 틀 & 50g 갈색병 150개',
    unit: '박스',
    quantity: 1,
    unitPrice: 220000,
    totalAmount: 220000,
    vendor: '동양양봉기구',
    paymentMethod: '카드',
    notes: '이충침, 왕완틀, 보냉스티로폼'
  },
  {
    id: 'exp-010',
    date: '2025-07-02',
    category: '제세공과/인증비',
    itemName: '한국양봉협회 공인 시험검사 수수료',
    unit: '회',
    quantity: 1,
    unitPrice: 150000,
    totalAmount: 150000,
    vendor: '한국양봉협회 양봉산물연구소',
    paymentMethod: '계좌이체',
    notes: '탄소동위원소비, 농약/항생제 정밀검사'
  },
  {
    id: 'exp-011',
    date: '2025-07-15',
    category: '시설/임차료',
    itemName: '봉장 부지 임대료 및 저온저장고 전력요금',
    unit: '월',
    quantity: 1,
    unitPrice: 380000,
    totalAmount: 380000,
    vendor: '한국전력공사 및 토지임대주',
    paymentMethod: '계좌이체',
    notes: '생로열제리 급속동결 보관고 전기료 포함'
  },
  {
    id: 'exp-012',
    date: '2025-08-10',
    category: '방제/약품비',
    itemName: '가을철 응애 방제약 (옥살산 훈증제)',
    unit: '개',
    quantity: 1,
    unitPrice: 160000,
    totalAmount: 160000,
    vendor: '전남농업기술센터 추천보급약품',
    paymentMethod: '카드',
    notes: '월동 봉군 양성 전 응애 집중 구제'
  },
  {
    id: 'exp-013',
    date: '2025-08-20',
    category: '사료/사양비',
    itemName: '월동 저밀용 정제 백설탕 15kg 30포',
    unit: '포',
    quantity: 30,
    unitPrice: 26000,
    totalAmount: 780000,
    vendor: '구례농협 경제종합센터',
    paymentMethod: '세금계산서',
    notes: '가을철 충분한 월동 먹이 조성'
  },
  {
    id: 'exp-014',
    date: '2025-08-30',
    category: '제세공과/인증비',
    itemName: '우체국 택배비 (8월 소비자 직거래 발송분 52건)',
    unit: '회',
    quantity: 1,
    unitPrice: 240000,
    totalAmount: 240000,
    vendor: '구례산동우체국',
    paymentMethod: '카드',
    notes: '안심택배 유리병 파손보험 포함'
  }
];

export const PRODUCT_OPTIONS: { label: string; defaultUnit: string; defaultPrice: number }[] = [
  { label: '천연숙성꿀', defaultUnit: '2.4kg 병', defaultPrice: 60000 },
  { label: '아카시아꿀', defaultUnit: '2.4kg 병', defaultPrice: 60000 },
  { label: '야생화꿀', defaultUnit: '2.4kg 병', defaultPrice: 55000 },
  { label: '밤꿀', defaultUnit: '2.4kg 병', defaultPrice: 70000 },
  { label: '생로열제리', defaultUnit: '50g 병', defaultPrice: 40000 },
  { label: '프로폴리스(봉교)', defaultUnit: '100ml 병', defaultPrice: 50000 },
  { label: '생화분/벌화분', defaultUnit: '1kg 박스', defaultPrice: 45000 },
  { label: '정제밀랍/밀랍초', defaultUnit: '1kg', defaultPrice: 30000 },
  { label: '종봉/교미여왕벌', defaultUnit: '1마리', defaultPrice: 40000 },
  { label: '봉독(정제)', defaultUnit: '1g', defaultPrice: 100000 },
  { label: '화분매개봉 임대', defaultUnit: '1군/통', defaultPrice: 80000 },
  { label: '양봉체험/교육', defaultUnit: '1인', defaultPrice: 25000 },
  { label: '기타산물', defaultUnit: '개', defaultPrice: 30000 }
];

export const EXPENSE_CATEGORY_OPTIONS: { label: string; sampleItems: string[]; defaultVendor: string }[] = [
  {
    label: '사료/사양비',
    sampleItems: ['정제 백설탕 (15kg)', '대용화분떡 (1kg)', '비폴렌 사료', '영양제/사양첨가제'],
    defaultVendor: '구례농협 하나로마트'
  },
  {
    label: '방제/약품비',
    sampleItems: ['개미산 60%', '옥살산 훈증제', '응애 구제 스트립', '노제마 예방제', '소독약품'],
    defaultVendor: '구례 동물약품'
  },
  {
    label: '기구/자재비',
    sampleItems: ['소초광 (100매)', '채밀용 유리병 (2.4kg)', '로열제리 채취틀', '포장박스/라벨스티커', '격왕판'],
    defaultVendor: '한국양봉농협 경제사업소'
  },
  {
    label: '수송/유류비',
    sampleItems: ['이동양봉 화물차 유류비', '밀원 이동 용달운송비', '훈연기 연료/펠렛', '고속도로 통행료'],
    defaultVendor: '구례지리산주유소'
  },
  {
    label: '인건비/고용노동',
    sampleItems: ['채밀 작업 보조인부 일당', '로열제리 이충 보조', '벌통 이동 야간 상하차'],
    defaultVendor: '산동면 농촌일손'
  },
  {
    label: '시설/임차료',
    sampleItems: ['봉장 부지 연간 임차료', '저온저장고 전기요금', '농업용수 수도요금'],
    defaultVendor: '산동면 원달리 농가'
  },
  {
    label: '제세공과/인증비',
    sampleItems: ['한국양봉협회 공인 성분검사비', '우체국 직거래 택배비', 'GAP/친환경 인증수수료', '온라인 쇼핑몰 수수료'],
    defaultVendor: '한국양봉협회 양봉산물연구소'
  },
  {
    label: '기타경영비',
    sampleItems: ['봉장 소모품', '작업복/방충모', '인쇄물/홍보물 제작'],
    defaultVendor: '지역 문구사'
  }
];
