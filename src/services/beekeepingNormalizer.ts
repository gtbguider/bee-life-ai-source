/**
 * Beekeeping Domain Term Normalizer
 * Normalizes speech-to-text (STT) misrecognitions into standard beekeeping terminology
 * while strictly preserving the original raw transcript for auditing/user confirmation.
 */

export interface BeekeepingNormalizationResult {
  originalText: string;
  normalizedText: string;
  appliedRules: string[];
}

export function normalizeBeekeepingText(
  rawText: string
): BeekeepingNormalizationResult {
  if (!rawText || typeof rawText !== 'string') {
    return {
      originalText: '',
      normalizedText: '',
      appliedRules: []
    };
  }

  const originalText = rawText;
  let text = rawText;
  const appliedRules: string[] = [];

  // -------------------------------------------------------------
  // 1. "물통" -> "벌통" (양봉 문맥 전용 안전 정규화)
  // 단순 일괄 치환(replaceAll) 금지: "급수기에 물통을 채웠다" 등 실제 물통 용례는 절대 보존
  // -------------------------------------------------------------

  // Rule 1A: 숫자/번호 결합 (예: 41번 물통, 41번물통, 1 물통, #41 물통)
  const numWaterRegex = /(#?[0-9]{1,4})\s*(번)?\s*물통/g;
  if (numWaterRegex.test(text)) {
    text = text.replace(numWaterRegex, (_match, p1, p2) => {
      appliedRules.push('숫자+물통→벌통');
      return `${p1}${p2 ? '번' : '번'} 벌통`;
    });
  }

  // Rule 1A-2: 한글 숫자(한자어/고유어 수사) + 번/호 + 물통 (예: 삼번 물통, 일번 물통, 이십삼번 물통, 세번 물통)
  const koreanNumWordWaterRegex =
    /(?:^|(?<=\s))([일이삼사오육칠팔구십백]{1,5}|하나|한|둘|두|셋|세|넷|네|다섯|여섯|일곱|여덟|아홉|열)\s*(번|호)\s*물통/g;
  if (koreanNumWordWaterRegex.test(text)) {
    text = text.replace(koreanNumWordWaterRegex, (_match, p1, p2) => {
      appliedRules.push('한글숫자+물통→벌통');
      return `${p1}${p2} 벌통`;
    });
  }

  // Rule 1B: 물통 + 번호 (예: 물통 41번, 물통 3)
  const waterNumRegex = /(?:^|\s)물통\s*(#?[0-9]{1,4})\s*(번)?/g;
  if (waterNumRegex.test(text)) {
    text = text.replace(waterNumRegex, (_match, p1, p2) => {
      appliedRules.push('물통+숫자→벌통');
      return ` 벌통 ${p1}${p2 ? '번' : '번'}`;
    });
  }

  // Rule 1C: 범위 조사 결합 (예: 물통부터, 물통까지, 물통에서)
  const rangeWaterRegex = /물통\s*(부터|까지|에서)/g;
  if (rangeWaterRegex.test(text)) {
    text = text.replace(rangeWaterRegex, (_match, p1) => {
      appliedRules.push('범위조사물통→벌통');
      return `벌통 ${p1}`;
    });
  }

  // Rule 1D: 양봉 핵심 전문용어 결합 문맥 (예: 물통 세력, 물통 내검, 물통 산란, 물통 여왕벌, 물통 채밀 등)
  const contextWaterRegex = /물통(?=\s*(?:세력|내검|내금|내껌|산란|잘난|여왕|채밀|방제|사양|먹이|화분떡|소비|봉판|착봉|군세|점검|확인))/g;
  if (contextWaterRegex.test(text)) {
    text = text.replace(contextWaterRegex, () => {
      appliedRules.push('양봉문맥물통→벌통');
      return '벌통';
    });
  }

  // -------------------------------------------------------------
  // 2. "내검" (STT 오인식: 내금, 내껌, 양봉문맥 예금 -> 내검)
  // -------------------------------------------------------------
  const inspectionRegex = /(?:내금|내껌)/g;
  if (inspectionRegex.test(text)) {
    text = text.replace(inspectionRegex, () => {
      appliedRules.push('내금/내껌→내검');
      return '내검';
    });
  }

  // Rule 2B: "예금" -> "내검" (양봉 문맥 전용: "은행에 예금했다" 등 일반 금융 문맥은 엄격히 보존)
  // 조건 1: 숫자/벌통 뒤의 예금 (예: 2번 예금, 2번 벌통 예금, #2 예금)
  const numInspectionRegex = /(#?[0-9]{1,4}\s*번?(?:\s*벌통)?|벌통)\s*예금/g;
  if (numInspectionRegex.test(text)) {
    text = text.replace(numInspectionRegex, (_m, p1) => {
      appliedRules.push('양봉문맥예금→내검');
      return `${p1} 내검`;
    });
  }

  // 조건 2: 범위 뒤의 예금 (예: 까지 예금, 에서 예금)
  const rangeInspectionRegex = /(까지|에서)\s*예금/g;
  if (rangeInspectionRegex.test(text)) {
    text = text.replace(rangeInspectionRegex, (_m, p1) => {
      appliedRules.push('양봉문맥예금→내검');
      return `${p1} 내검`;
    });
  }

  // 조건 3: 양봉 문맥이 존재하는 문장에서 "예금 실시/예금 완료/예금 상태/예금 점검/예금 확인"
  const hasBeeContext = /(?:벌통|여왕|산란|봉판|착봉|군세|사양|화분떡|채밀|응애|방제|세력|#?[0-9]{1,4}\s*번)/.test(text);
  if (hasBeeContext) {
    const actionInspectionRegex = /예금\s*(실시|완료|상태|점검|일지|결과)/g;
    if (actionInspectionRegex.test(text)) {
      text = text.replace(actionInspectionRegex, (_m, p1) => {
        appliedRules.push('양봉문맥예금→내검');
        return `내검 ${p1}`;
      });
    }
  }

  // -------------------------------------------------------------
  // 3. "산란" (STT 오인식: 잘난 -> 산란)
  // 잘난 상태 -> 산란 상태, 잘난 확인 -> 산란 확인, 잘난 양호 -> 산란 양호, 잘난 불량 -> 산란 불량
  // -------------------------------------------------------------
  const eggLayingRegex = /잘난(\s*(?:상태|확인|양호|우수|부진|불량|권|판|정도|유무|있음|없음|좋음|나쁨))?/g;
  if (eggLayingRegex.test(text)) {
    text = text.replace(eggLayingRegex, (_match, p1) => {
      appliedRules.push('잘난→산란');
      return `산란${p1 || ''}`;
    });
  }

  // -------------------------------------------------------------
  // 4. "채밀" (구어체 표현: 꿀 뽑음, 꿀 땄음, 꿀 땀, 꿀 짰음 -> 채밀)
  // -------------------------------------------------------------
  const harvestRegex = /꿀\s*(?:뽑음|땄음|땀|짰음)/g;
  if (harvestRegex.test(text)) {
    text = text.replace(harvestRegex, () => {
      appliedRules.push('꿀수확표현→채밀');
      return '채밀';
    });
  }

  // -------------------------------------------------------------
  // 5. 벌 세력(소비 매수) 표현 표준화: "N장벌" 통일 및 "내장벌" STT 오인식 보정
  // 표준 표현: "4장벌" (저장 표준 표현 일원화)
  // -------------------------------------------------------------

  // Rule 5A: "내장벌" STT 오인식 보정 ("네장벌 / 4장벌"의 대표적 음성인식 오류)
  // [안전 가드]: 단순 무조건 치환 금지!
  // "내장벌레", "내장벌림" 등 일반 명사/생물/의학 어휘는 절대 훼손하지 않음
  //
  // 조건 1: 뒤에 축소/줄임/줄여/세력/유지 등의 양봉 작업·상태어가 연결된 경우
  // 예: "36번 벌통 내장벌로 축소" -> "36번 벌통 4장벌로 축소"
  //     "36번 벌통 내장벌 축소" -> "36번 벌통 4장벌 축소"
  //     "내장벌로 축소" -> "4장벌로 축소"
  const naejangBeekeepingActionRegex =
    /(?:^|(?<=[\s,.]))(?:내\s*장\s*벌)\s*(로|으로|을|를|은|는|이|가)?\s*(축소|줄임|줄여|줄이기|압축|조절|맞춤|세력|편성|유지|관리|점검|확인)/g;
  if (naejangBeekeepingActionRegex.test(text)) {
    text = text.replace(naejangBeekeepingActionRegex, (_match, p1, p2) => {
      appliedRules.push('내장벌→4장벌');
      return `4장벌${p1 ? p1 : ''} ${p2}`;
    });
  }

  // 조건 2: 벌통 번호나 양봉 핵심 키워드 직후에 오는 "내장벌"
  // 예: "36번 벌통 내장벌", "36번 내장벌", "벌통 내장벌"
  const hivePrecededNaejangRegex =
    /(#?[0-9]{1,4}\s*번?(?:\s*벌통)?|벌통|소비|봉판|착봉|군세)\s*(?:은|는|이|가|에)?\s*(?:내\s*장\s*벌)(?=[\s,.]|$)/g;
  if (hivePrecededNaejangRegex.test(text)) {
    text = text.replace(hivePrecededNaejangRegex, (_match, p1) => {
      appliedRules.push('내장벌→4장벌');
      return `${p1} 4장벌`;
    });
  }

  // Rule 5B: 한글 수사(네/세/두/한...) + 장/매 + 벌 -> 표준 "N장벌" 변환
  // 예: "네장벌" -> "4장벌", "네 장 벌" -> "4장벌", "네매벌" -> "4장벌", "세장벌" -> "3장벌"
  const KOREAN_NUM_MAP: Record<string, number> = {
    한: 1, 하나: 1, 일: 1,
    두: 2, 둘: 2, 이: 2,
    세: 3, 셋: 3, 석: 3, 삼: 3,
    네: 4, 넷: 4, 넉: 4, 사: 4,
    다섯: 5, 오: 5,
    여섯: 6, 육: 6,
    일곱: 7, 칠: 7,
    여덟: 8, 팔: 8,
    아홉: 9, 구: 9,
    열: 10, 십: 10
  };

  const koreanNumBeesRegex =
    /(?:^|(?<=[\s,.]))(한|하나|일|두|둘|이|세|셋|석|삼|네|넷|넉|사|다섯|오|여섯|육|일곱|칠|여덟|팔|아홉|구|열|십)\s*(?:장|매)\s*벌(?=[가-힣0-9\s,.]|$)/g;
  if (koreanNumBeesRegex.test(text)) {
    text = text.replace(koreanNumBeesRegex, (_match, numWord) => {
      const num = KOREAN_NUM_MAP[numWord] || 4;
      appliedRules.push('한글수사벌→N장벌');
      return `${num}장벌`;
    });
  }

  // Rule 5C: 아라비아 숫자 + 매 + 벌 -> 표준 "N장벌" 변환
  // 예: "4매벌" -> "4장벌", "4 매 벌" -> "4장벌", "4매 벌" -> "4장벌"
  const arabicMaeBeesRegex = /(?:^|(?<=[\s,.]))([0-9]{1,2})\s*매\s*벌(?=[가-힣0-9\s,.]|$)/g;
  if (arabicMaeBeesRegex.test(text)) {
    text = text.replace(arabicMaeBeesRegex, (_match, p1) => {
      appliedRules.push('매벌→장벌');
      return `${p1}장벌`;
    });
  }

  // Rule 5D: 아라비아 숫자 + 공백 + 장 + 벌 -> 공백 정리 표준화
  // 예: "4 장 벌", "4장 벌" -> "4장벌"
  const arabicJangBeesSpaceRegex = /(?:^|(?<=[\s,.]))([0-9]{1,2})(?:\s+장\s*벌|\s*장\s+벌)(?=[가-힣0-9\s,.]|$)/g;
  if (arabicJangBeesSpaceRegex.test(text)) {
    text = text.replace(arabicJangBeesSpaceRegex, (_match, p1) => {
      appliedRules.push('장벌공백정리');
      return `${p1}장벌`;
    });
  }

  // -------------------------------------------------------------
  // 6. 공백 정규화 (연속 공백 정리)
  // -------------------------------------------------------------
  const normalizedText = text.replace(/\s+/g, ' ').trim();

  return {
    originalText,
    normalizedText,
    appliedRules: Array.from(new Set(appliedRules))
  };
}
