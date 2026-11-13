export interface GlossaryTerm {
  id: string;
  term: string;
  hanja?: string;
  category: 'honey_quality' | 'bee_ecology' | 'hive_tools' | 'beekeeping_work';
  categoryLabel: string;
  simpleSummary: string; // 소비자 눈높이 1줄 핵심 요약
  detailDescription: string; // 상세 설명 (친절한 대화체)
  consumerTip: string; // 소비자가 꿀 고를 때 꼭 알아야 할 팁
  icon: string;
  badge?: string;
  keywords: string[];
}

export const GLOSSARY_CATEGORIES = [
  { id: 'all', label: '전체 용어', icon: 'auto_stories' },
  { id: 'honey_quality', label: '🍯 꿀·품질 성분', icon: 'science' },
  { id: 'beekeeping_work', label: '🛠️ 양봉 작업·기록', icon: 'handyman' },
  { id: 'bee_ecology', label: '🐝 꿀벌·여왕벌', icon: 'pest_control' },
  { id: 'hive_tools', label: '📦 벌통·도구', icon: 'inventory_2' }
] as const;

export const GLOSSARY_DATA: GlossaryTerm[] = [
  {
    id: 'natural-aged-honey',
    term: '자연숙성꿀 (완숙꿀)',
    category: 'honey_quality',
    categoryLabel: '꿀·품질 성분',
    simpleSummary: '벌들이 날갯짓으로 수분을 자연 증발시켜 100% 농축한 최고급 꿀',
    detailDescription: '인위적으로 열을 가해 수분을 날리는 농축꿀과 달리, 꿀벌들이 스스로 밤낮으로 날개부채질을 해 수분을 18% 이하로 낮추고 효소를 가득 채운 프리미엄 천연 벌꿀입니다. 영양소와 향이 완벽히 보존됩니다.',
    consumerTip: '설탕물이나 인공 열풍 농축을 거치지 않아 은은하고 깊은 자연의 꽃향기와 짙은 풍미가 살아있습니다.',
    icon: 'water_drop',
    badge: '최고급 품질',
    keywords: ['자연숙성', '숙성꿀', '완숙', '완숙꿀', '농축']
  },
  {
    id: 'bong-gae',
    term: '봉개 (봉개꿀)',
    hanja: '封蓋',
    category: 'honey_quality',
    categoryLabel: '꿀·품질 성분',
    simpleSummary: '꿀이 완숙되었을 때 꿀벌이 천연 밀랍으로 벌집 입구를 하얗게 덮은 상태',
    detailDescription: '벌들이 "이 꿀은 완벽히 숙성되어 상하지 않는다"고 인정할 때 천연 밀랍 뚜껑(봉개)을 덮어 밀봉합니다. 봉개된 벌집에서만 뜬 꿀을 최고급 "봉개 완숙꿀"이라 부릅니다.',
    consumerTip: '봉개율이 높을수록 인공 농축기 없이 꿀벌의 천연 효소(디아스타제)와 미네랄이 풍부합니다.',
    icon: 'verified',
    badge: '천연 보증',
    keywords: ['봉개', '봉개꿀', '밀랍뚜껑', '봉개율', '밀봉']
  },
  {
    id: 'carbon-isotope',
    term: '탄소동위원소비',
    category: 'honey_quality',
    categoryLabel: '꿀·품질 성분',
    simpleSummary: '100% 꽃에서 얻은 천연 꿀인지(진짜 꿀), 설탕을 먹여 만든 사양꿀인지 판별하는 과학적 기준',
    detailDescription: '식물마다 고유한 탄소 비율을 측정하는 검사입니다. 대한민국 공인 기준 -22.5‰ 이하이면 천연벌꿀이며, 숫자가 마이너스로 클수록(-26.0‰ 등) 순수한 자연 꽃꿀임을 증명합니다.',
    consumerTip: '본 제품은 -26.0‰로 기준치를 훨씬 뛰어넘는 최상급 1+등급 순수 꽃꿀입니다.',
    icon: 'science',
    badge: '순도 검증',
    keywords: ['탄소동위원소', '탄소동위원소비', '동위원소', '천연꿀판별', '순도']
  },
  {
    id: 'hmf',
    term: 'H.M.F (신선도 지표)',
    category: 'honey_quality',
    categoryLabel: '꿀·품질 성분',
    simpleSummary: '꿀의 신선도와 인공 열처리 여부를 확인하는 핵심 지표',
    detailDescription: '하이드록시메틸푸르푸랄(HMF)은 꿀에 높은 열을 가하거나 오래 방치할 때 생기는 물질입니다. 기준치 80mg/kg 이하 중 수치가 낮을수록(예: 7.4mg/kg) 갓 채밀하여 열을 가하지 않은 싱싱한 꿀입니다.',
    consumerTip: '본 제품의 HMF 수치는 7.4mg/kg으로 비가열 자연 생꿀의 신선함을 유지하고 있습니다.',
    icon: 'thermostat',
    badge: '신선도',
    keywords: ['HMF', '신선도', '비가열', '열처리', '열손상']
  },
  {
    id: 'reducing-sugar',
    term: '전화당 (천연 과당·포도당)',
    category: 'honey_quality',
    categoryLabel: '꿀·품질 성분',
    simpleSummary: '꿀벌이 꽃꿀을 소화시켜 만든 몸에 바로 흡수되는 천연 단맛 성분',
    detailDescription: '설탕(자당)과 달리, 꿀벌의 효소에 의해 포도당과 과당으로 완전히 분해(전화)된 순수 천연당입니다. 소화 부담 없이 뇌와 근육에 즉각적인 활력을 줍니다.',
    consumerTip: '공인 기준 60% 이상이어야 하며, 본 제품은 67.7%로 영양 가치가 풍부합니다.',
    icon: 'energy_savings_leaf',
    keywords: ['전화당', '포도당', '과당', '천연당', '당분']
  },
  {
    id: 'so-cho-gwang',
    term: '소초광 (벌집틀)',
    hanja: '巢礎匡',
    category: 'hive_tools',
    categoryLabel: '벌통·도구',
    simpleSummary: '꿀벌이 안전하고 반듯하게 집을 지을 수 있도록 벌통에 넣어주는 나무 액자 틀',
    detailDescription: '벌들이 알을 낳고 꿀을 저장할 방을 질서정연하게 짓도록 얇은 기초 밀랍판을 끼워둔 나무틀입니다. 벌통 속을 아파트처럼 층층이 구성해줍니다.',
    consumerTip: '이력에서 "소초광 증소"는 "벌 가족이 늘어나 새 방(벌집틀)을 추가해 주었다"는 뜻입니다.',
    icon: 'crop_portrait',
    keywords: ['소초광', '소초', '벌집틀', '소비', '소초판']
  },
  {
    id: 'nae-geom',
    term: '내검 (벌통 건강검진)',
    hanja: '內檢',
    category: 'beekeeping_work',
    categoryLabel: '양봉 작업·기록',
    simpleSummary: '양봉가가 벌통 뚜껑을 열고 여왕벌의 건강과 꿀벌 가족의 상태를 살피는 정기 점검',
    detailDescription: '의사가 환자를 진찰하듯, 양봉가가 벌통을 열어 여왕벌이 알을 잘 낳는지, 꿀이 잘 차고 있는지, 질병이나 해충이 없는지 확인하는 가장 중요한 일상 관리입니다.',
    consumerTip: '스마트 양봉 앱의 내검 일지는 꿀벌들이 얼마나 정성스럽게 무농약 무항생제로 케어받았는지 보여주는 진료 기록부입니다.',
    icon: 'clinical_notes',
    badge: '필수 관리',
    keywords: ['내검', '점검', '벌통확인', '진찰', '건강검진']
  },
  {
    id: 'chae-mil',
    term: '채밀 (꿀 수확)',
    hanja: '採蜜',
    category: 'beekeeping_work',
    categoryLabel: '양봉 작업·기록',
    simpleSummary: '완숙된 벌집에서 원심분리기를 이용해 순수한 천연 꿀을 받아내는 수확 작업',
    detailDescription: '벌들이 정성껏 채워 봉개한 벌집에서 뚜껑을 얇게 걷어내고 회전시켜 맑은 꿀을 추출하는 작업입니다. 1년에 단 한 번, 지리산 꽃이 만개한 후 숙성이 끝난 시점에만 진행합니다.',
    consumerTip: '이력의 "채밀 완료" 날짜는 바로 여러분이 드시는 꿀이 태어난 생일입니다.',
    icon: 'water_drop',
    badge: '수확의 날',
    keywords: ['채밀', '꿀채취', '채밀기', '수확', '채밀일']
  },
  {
    id: 'bun-bong',
    term: '분봉 / 분봉열 (벌가족 분가)',
    hanja: '分蜂',
    category: 'bee_ecology',
    categoryLabel: '꿀벌·여왕벌',
    simpleSummary: '벌 식구가 너무 많아져 새 여왕벌을 만들고 무리의 절반이 새집을 찾아 독립하는 자연 현상',
    detailDescription: '꿀벌 무리가 번성하면 기존 여왕벌이 절반의 일벌을 데리고 밖으로 나가 새 보금자리를 차립니다. 양봉가는 이를 미리 예측(분봉열 감지)하여 안전하게 새 벌통으로 독립을 도와줍니다.',
    consumerTip: '분봉이 활발하다는 것은 그 봉장의 환경이 꿀벌이 살기에 더없이 건강하고 풍요롭다는 증거입니다.',
    icon: 'call_split',
    keywords: ['분봉', '분봉열', '분가', '독립', '새벌통']
  },
  {
    id: 'wang-dae',
    term: '왕대 (여왕벌 방)',
    hanja: '王臺',
    category: 'bee_ecology',
    categoryLabel: '꿀벌·여왕벌',
    simpleSummary: '새로운 공주 여왕벌이 자라나는 도토리 모양의 특별한 큰 벌방',
    detailDescription: '일반 일벌 방과 달리 아래로 길쭉하게 지어지며, 이곳에서 자라는 애벌레는 평생 로열제리만 듬뿍 먹고 자라 강력한 여왕벌로 탄생합니다.',
    consumerTip: '우수한 혈통의 왕대를 관리하여 건강하고 공격성 없는 착한 꿀벌 무리를 키워냅니다.',
    icon: 'crown',
    keywords: ['왕대', '여왕방', '여왕벌방', '공주벌', '로열방']
  },
  {
    id: 'i-chung',
    term: '이충 (우수 여왕벌 육성)',
    hanja: '移蟲',
    category: 'beekeeping_work',
    categoryLabel: '양봉 작업·기록',
    simpleSummary: '가장 건강하고 꿀을 잘 모으는 모계 벌에서 어린 애벌레를 정성껏 옮겨 여왕벌로 키우는 기술',
    detailDescription: '질병에 강하고 지리산 환경에 적응력이 뛰어난 우수 종봉을 보존하기 위해, 갓 부화한 미세한 애벌레를 인공 왕대 틀로 조심스럽게 옮겨 담는 숙련된 양봉 기술입니다.',
    consumerTip: '혈통 관리가 잘 된 여왕벌이 이끄는 벌통일수록 항생제 없이도 질병을 스스로 이겨냅니다.',
    icon: 'transfer_within_a_station',
    keywords: ['이충', '애벌레옮기기', '종봉개량', '여왕육성']
  },
  {
    id: 'sin-wang-ip-sik',
    term: '신왕 입식 (새 여왕벌 맞이)',
    hanja: '新王 入殖',
    category: 'beekeeping_work',
    categoryLabel: '양봉 작업·기록',
    simpleSummary: '새로 태어난 젊고 건강한 여왕벌을 벌통의 새 지도자로 정식 배치하는 일',
    detailDescription: '젊은 신왕은 하루에 1,500~2,000개의 알을 낳을 정도로 활력이 넘치며, 페로몬 분비가 왕성하여 벌통 전체에 질서와 활기를 불어넣습니다.',
    consumerTip: '이력의 "신왕 입식"은 꿀벌 군단이 젊고 힘찬 세대로 성공적으로 교체되었음을 뜻합니다.',
    icon: 'person_add',
    keywords: ['신왕', '입식', '새여왕', '신여왕', '안착']
  },
  {
    id: 'wol-dong',
    term: '월동 & 봄벌 깨우기',
    hanja: '越冬',
    category: 'beekeeping_work',
    categoryLabel: '양봉 작업·기록',
    simpleSummary: '겨울철 혹한을 꿀벌들이 서로 뭉쳐 견뎌내고, 2월 초 봄을 맞아 활동을 재개하는 과정',
    detailDescription: '꿀벌은 겨울잠을 자지 않고 서로 둥글게 뭉쳐(봉구) 날개 근육을 떨어 벌통 안을 20~30도로 따뜻하게 유지합니다. 양봉가는 보온재와 먹이(충분한 꿀)를 준비해 겨울을 지켜줍니다.',
    consumerTip: '월동을 건강하게 마친 강한 벌들만이 5월의 청정 지리산 꽃에서 최상급 꿀을 따옵니다.',
    icon: 'ac_unit',
    keywords: ['월동', '봄벌', '겨울나기', '봉구', '보온']
  },
  {
    id: 'gae-po',
    term: '개포 (보온 덮개)',
    hanja: '蓋布',
    category: 'hive_tools',
    categoryLabel: '벌통·도구',
    simpleSummary: '벌통 내부 온도와 습도를 쾌적하게 유지해주는 천연 천/보온 덮개',
    detailDescription: '벌집틀 윗부분을 덮어 외풍을 막고, 벌들이 쾌적한 온도에서 알을 품고 꿀을 숙성시킬 수 있도록 돕는 천연 재질의 이불입니다.',
    consumerTip: '개포 관리를 통해 벌통 내부 온습도가 최적화되면 꿀벌의 스트레스가 줄어듭니다.',
    icon: 'layers',
    keywords: ['개포', '보온포', '벌통덮개', '천연포']
  },
  {
    id: 'hwa-bun-tteok',
    term: '화분떡 (단백질 영양식)',
    category: 'beekeeping_work',
    categoryLabel: '양봉 작업·기록',
    simpleSummary: '꽃이 피기 전 이른 봄에 꿀벌 아기들이 튼튼하게 자라도록 먹이는 천연 꽃가루 경단',
    detailDescription: '천연 꽃가루(화분)를 반죽하여 벌통 위에 얹어주는 고단백 영양식입니다. 어린 일벌들이 이를 먹고 로열제리를 분비해 여왕벌과 애벌레를 건강하게 키워냅니다.',
    consumerTip: '인공 사료 대신 천연 화분을 먹여 키운 벌들은 면역력이 높아 무항생제 양봉이 가능합니다.',
    icon: 'cookie',
    keywords: ['화분떡', '꽃가루', '화분', '영양식', '단백질']
  },
  {
    id: 'so-bi',
    term: '소비 (벌집)',
    hanja: '巢脾',
    category: 'hive_tools',
    categoryLabel: '벌통·도구',
    simpleSummary: '꿀벌들이 알을 낳고 꿀과 꽃가루를 저장하는 육각형 방들이 모인 벌집',
    detailDescription: '양봉 현장에서 흔히 "소비"라고 부르며, 우리말 표준어로는 "벌집"입니다. 벌들이 밀랍으로 지은 육각형 방들의 판으로, 꿀벌 가족의 보금자리이자 식량 창고 역할을 합니다.',
    consumerTip: '양봉일지에서 "4장벌", "소비 4매"는 벌집 4장을 꿀벌들이 가득 덮고 있는 건강한 군세를 뜻합니다.',
    icon: 'grid_view',
    badge: '표준어: 벌집',
    keywords: ['소비', '벌집', '벌집판', '소비판', '육각형벌집']
  },
  {
    id: 'bong-pan',
    term: '봉판 (번데기방 벌집)',
    hanja: '蜂板',
    category: 'bee_ecology',
    categoryLabel: '꿀벌·여왕벌',
    simpleSummary: '꿀벌 유충이 번데기로 변하여 밀랍으로 덮여 있는 건강한 차세대 벌집',
    detailDescription: '표준어로는 "번데기방 벌집"입니다. 알에서 깬 애벌레가 다 자라 일벌로 태어나기 직전 단계로, 벌방 뚜껑이 덮여 있습니다. 봉판이 고르고 넓을수록 벌통의 미래 세력이 왕성합니다.',
    consumerTip: '봉판이 가득 찬 벌통은 곧 수많은 어린 일벌들이 태어나 꿀을 힘차게 모으게 됩니다.',
    icon: 'child_care',
    badge: '차세대 꿀벌',
    keywords: ['봉판', '번데기방', '번데기벌집', '유충판', '산란육아']
  },
  {
    id: 'chak-bong',
    term: '착봉 (벌붙음)',
    hanja: '着蜂',
    category: 'bee_ecology',
    categoryLabel: '꿀벌·여왕벌',
    simpleSummary: '벌집에 꿀벌들이 빽빽하게 빈틈없이 달라붙어 활동하는 밀도와 상태',
    detailDescription: '우리말 표준어로 "벌붙음"입니다. 벌집틀에 벌들이 얼마나 두텁게 붙어있는지를 나타내며, 착봉이 좋아야 벌들이 알과 유충의 온도를 알맞게 지켜내고 꿀을 잘 숙성시킵니다.',
    consumerTip: '착봉이 우수한 강한 벌통일수록 병해충에 강하고 깨끗한 천연 벌꿀을 생산합니다.',
    icon: 'groups',
    badge: '표준어: 벌붙음',
    keywords: ['착봉', '벌붙음', '밀착도', '벌밀도', '착봉상태']
  },
  {
    id: 'gun-se',
    term: '군세 (벌 무리 세력)',
    hanja: '群勢',
    category: 'bee_ecology',
    categoryLabel: '꿀벌·여왕벌',
    simpleSummary: '벌통 하나에 살고 있는 꿀벌 가족 전체의 규모와 건강한 활력',
    detailDescription: '표준어로 "벌 무리 세력" 또는 줄여서 "벌 세력"이라 합니다. 벌통 내 일벌의 숫자와 일하는 활력을 뜻하며, 통상 장벌(벌집 수) 단위로 측정합니다.',
    consumerTip: '지리산의 험준한 자연에서 최상급 완숙꿀을 가져오려면 군세가 강한 강군(强群) 관리가 필수입니다.',
    icon: 'fitness_center',
    keywords: ['군세', '벌무리', '벌세력', '강군', '약군']
  },
  {
    id: 'sa-yang',
    term: '사양 (먹이주기)',
    hanja: '飼養',
    category: 'beekeeping_work',
    categoryLabel: '양봉 작업·기록',
    simpleSummary: '꽃이 없는 시기나 월동 준비 때 벌들의 생존을 위해 먹이(당액)를 공급하는 작업',
    detailDescription: '표준어로는 "먹이주기"입니다. 꽃꿀이 분비되지 않는 이른 봄이나 장마철, 혹한의 겨울을 앞두고 꿀벌이 굶주리지 않도록 사양기에 먹이를 채워주는 관리 작업입니다.',
    consumerTip: '허니비테코는 채밀기(꽃 피는 시기)에는 사양을 전면 중단하여 100% 순수 천연 꽃꿀만 생산합니다.',
    icon: 'soup_kitchen',
    badge: '표준어: 먹이주기',
    keywords: ['사양', '먹이주기', '당액', '설탕물', '급이', '사양기']
  },
  {
    id: 'jeung-so',
    term: '증소 (벌집 늘리기)',
    hanja: '增巢',
    category: 'beekeeping_work',
    categoryLabel: '양봉 작업·기록',
    simpleSummary: '벌 식구가 늘어나 벌통이 좁아졌을 때 새 벌집틀을 추가로 넣어주는 작업',
    detailDescription: '우리말 표준어로 "벌집 늘리기" 또는 "벌집 더넣기"입니다. 산란과 채밀이 왕성하여 기존 벌집이 가득 찼을 때 새 소초광(벌집틀)을 보충해 줍니다.',
    consumerTip: '증소 기록은 꿀벌 군단이 건강하게 번성하고 있음을 보여주는 활력의 지표입니다.',
    icon: 'add_box',
    badge: '표준어: 벌집 늘리기',
    keywords: ['증소', '벌집늘리기', '벌집더넣기', '소비추가', '틀추가']
  },
  {
    id: 'chuk-so',
    term: '축소 (벌집 줄이기)',
    hanja: '縮巢',
    category: 'beekeeping_work',
    categoryLabel: '양봉 작업·기록',
    simpleSummary: '추운 날씨나 월동을 앞두고 벌들이 체온을 유지할 수 있도록 빈 벌집을 빼주는 작업',
    detailDescription: '우리말 표준어로 "벌집 줄이기"입니다. 가을 월동 전이나 이른 봄, 벌의 밀도를 높이고 보온을 극대화하기 위해 여분의 벌집을 빼내어 4장벌, 3장벌 등으로 집중시킵니다.',
    consumerTip: '가을철 "4장벌로 축소" 작업은 꿀벌들이 겨울 추위를 이겨내고 봄에 건강하게 깨어나도록 돕는 핵심 관리입니다.',
    icon: 'compress',
    badge: '표준어: 벌집 줄이기',
    keywords: ['축소', '벌집줄이기', '소비축소', '벌집빼기', '압축', '4장벌축소']
  },
  {
    id: 'hap-bong',
    term: '합봉 (벌 무리 합치기)',
    hanja: '合蜂',
    category: 'beekeeping_work',
    categoryLabel: '양봉 작업·기록',
    simpleSummary: '세력이 약한 벌통이나 여왕벌을 잃은 무리를 건강한 벌통과 하나로 합치는 작업',
    detailDescription: '표준어로 "벌 무리 합치기"입니다. 서로 다른 벌통의 벌들은 냄새(페로몬)가 다르면 싸우므로, 신문지나 훈연 등을 이용해 향을 서서히 동화시키며 안전하게 한 가족으로 만듭니다.',
    consumerTip: '약한 벌통을 방치하지 않고 합봉으로 강하게 유지해야 무농약 친환경 양봉이 가능합니다.',
    icon: 'merge',
    badge: '표준어: 벌 무리 합치기',
    keywords: ['합봉', '벌무리합치기', '벌합치기', '가족합치기']
  },
  {
    id: 'do-bong',
    term: '도봉 (도둑벌 현상)',
    hanja: '盜蜂',
    category: 'bee_ecology',
    categoryLabel: '꿀벌·여왕벌',
    simpleSummary: '꽃에 꿀이 부족할 때 다른 벌통의 꿀을 훔치러 들어가는 꿀벌들의 쟁탈 현상',
    detailDescription: '우리말 표준어로 "도둑벌"입니다. 밀원이 마르는 시기에 강한 벌통의 벌들이 세력이 약한 벌통을 침입해 꿀을 약탈하는 현상으로, 양봉가는 소문을 좁혀 도봉을 막아줍니다.',
    consumerTip: '양봉일지의 "도봉 방지"는 벌통 입구를 좁히고 봉장을 평화롭게 안정시키는 세심한 배려입니다.',
    icon: 'security',
    badge: '표준어: 도둑벌',
    keywords: ['도봉', '도둑벌', '꿀도둑', '도봉방지', '소문축소']
  },
  {
    id: 'so-chung',
    term: '소충 (벌집나방 애벌레)',
    hanja: '巢蟲',
    category: 'bee_ecology',
    categoryLabel: '꿀벌·여왕벌',
    simpleSummary: '벌집에 알을 낳아 밀랍을 갉아먹고 거미줄 같은 터널을 만드는 양봉 해충',
    detailDescription: '벌집나방의 유충으로, 벌집의 밀랍을 갉아먹어 벌집을 망가뜨립니다. 강하고 건강한 벌통은 일벌들이 스스로 소충을 쫓아내므로, 벌의 밀도를 높게 유지하는 것이 최고의 예방책입니다.',
    consumerTip: '화학 살충제 대신 벌 무리를 튼튼히 키워 자연적으로 소충을 이겨내는 친환경 방식을 고수합니다.',
    icon: 'bug_report',
    keywords: ['소충', '벌집나방', '나방유충', '밀랍해충']
  },
  {
    id: 'ung-ae',
    term: '꿀벌응애 (진드기)',
    category: 'bee_ecology',
    categoryLabel: '꿀벌·여왕벌',
    simpleSummary: '꿀벌의 몸이나 번데기에 기생하여 체액을 빨아먹는 대표적인 미세 기생충',
    detailDescription: '꿀벌의 날개를 기형으로 만들고 바이러스를 옮기는 가장 주의해야 할 기생 진드기입니다. 천연 유기산(개미산, 옥살산 등)을 활용해 벌꿀에 잔류하지 않도록 안전하게 방제합니다.',
    consumerTip: '허니비테코는 유해 농약 성분 없이 천연 친환경 자재로만 응애를 방제하여 안전한 꿀을 약속합니다.',
    icon: 'coronavirus',
    badge: '친환경 방제',
    keywords: ['응애', '꿀벌응애', '진드기', '응애방제', '개미산', '옥살산']
  },
  {
    id: 'gyeok-wang-pan',
    term: '격왕판 (여왕벌 칸막이)',
    hanja: '隔王板',
    category: 'hive_tools',
    categoryLabel: '벌통·도구',
    simpleSummary: '여왕벌만 통과하지 못하게 막아 2층에는 오직 깨끗한 꿀만 채우도록 나누는 격리판',
    detailDescription: '우리말 표준어로 "여왕벌 칸막이"입니다. 몸집이 작은 일벌은 자유롭게 드나들지만 몸집이 큰 여왕벌은 지나가지 못하는 틈새를 가진 판입니다. 1층은 알과 애벌레를 키우고, 2층은 순수한 꿀만 채우게 합니다.',
    consumerTip: '격왕판을 사용하면 꿀 속에 알이나 애벌레가 섞이지 않고 맑고 깨끗한 순수 꽃꿀만 채밀할 수 있습니다.',
    icon: 'border_horizontal',
    badge: '표준어: 여왕벌 칸막이',
    keywords: ['격왕판', '여왕벌칸막이', '격리판', '수직격왕판']
  },
  {
    id: 'hun-yeon-gi',
    term: '훈연기 (연기뿜개)',
    hanja: '薰煙器',
    category: 'hive_tools',
    categoryLabel: '벌통·도구',
    simpleSummary: '쑥이나 나무껍질을 태워 은은한 연기를 뿜어 꿀벌을 차분하게 진정시키는 도구',
    detailDescription: '표준어로 "연기뿜개"입니다. 벌통을 열 때 쑥 연기를 살짝 뿜어주면 꿀벌들이 산불 위험을 느껴 꿀을 잔뜩 먹고 얌전해져, 쏘이지 않고 안전하게 내검을 진행할 수 있습니다.',
    consumerTip: '화학 약품 대신 청정 지리산 자연산 쑥을 태운 천연 연기만을 사용하여 꿀벌을 보호합니다.',
    icon: 'air',
    badge: '표준어: 연기뿜개',
    keywords: ['훈연기', '연기뿜개', '쑥훈연', '벌진정']
  },
  {
    id: 'bong-gyo',
    term: '봉교 (프로폴리스 / 벌풀)',
    hanja: '蜂膠',
    category: 'honey_quality',
    categoryLabel: '꿀·품질 성분',
    simpleSummary: '벌들이 나무 수액과 꽃가루를 섞어 벌통 안을 무균 상태로 소독하는 천연 항균 물질',
    detailDescription: '표준어로 "벌풀"이라 하며 흔히 "프로폴리스"로 널리 알려져 있습니다. 꿀벌이 바이러스와 세균으로부터 벌통을 완벽히 지키기 위해 바르는 천연 항생물질입니다.',
    consumerTip: '벌통 내부는 프로폴리스 덕분에 수술실보다 더 깨끗한 무균 상태를 유지합니다.',
    icon: 'shield',
    badge: '천연 항균',
    keywords: ['봉교', '벌풀', '프로폴리스', '항균물질', '수액']
  },
  {
    id: 'gye-sang',
    term: '계상 (덧통 / 2층 벌통)',
    hanja: '繼箱',
    category: 'hive_tools',
    categoryLabel: '벌통·도구',
    simpleSummary: '봄철 꿀이 쏟아져 들어올 때 벌통 위에 2층, 3층으로 올려 쌓는 확장 벌통',
    detailDescription: '표준어로 "덧통"입니다. 1층(단상) 벌통의 식구가 늘어나고 꿀이 가득 찼을 때 그 위에 얹어 공간을 넓혀줍니다. 대량의 순수 완숙꿀을 생산하기 위한 필수 방식입니다.',
    consumerTip: '계상에서 채밀한 꿀은 1층의 육아방과 분리되어 있어 훨씬 맑고 품질이 뛰어납니다.',
    icon: 'apartment',
    badge: '표준어: 덧통',
    keywords: ['계상', '덧통', '2층벌통', '단상', '계상올리기']
  },
  {
    id: 'so-mun',
    term: '소문 (벌나들문 / 출입구)',
    hanja: '巢門',
    category: 'hive_tools',
    categoryLabel: '벌통·도구',
    simpleSummary: '꿀벌들이 밖으로 날아가 꿀과 꽃가루를 모아오기 위해 드나드는 벌통 앞 대문',
    detailDescription: '우리말 표준어로 "벌나들문"입니다. 계절과 날씨, 도봉 위험도에 따라 양봉가가 소문의 너비를 조절하여 벌통 내부 온도와 안전을 지켜줍니다.',
    consumerTip: '소문 앞의 분주한 꿀벌들의 날갯짓은 오늘 모아온 향긋한 꽃꿀의 신호입니다.',
    icon: 'door_front',
    badge: '표준어: 벌나들문',
    keywords: ['소문', '벌나들문', '벌통문', '출입구', '소문조절']
  }
];

// Helper to find term in glossary by keyword
export function findGlossaryTerm(text: string): GlossaryTerm | undefined {
  if (!text) return undefined;
  return GLOSSARY_DATA.find(item => 
    text.includes(item.term.split(' ')[0]) || 
    item.keywords.some(k => text.includes(k))
  );
}
